// @ts-check
/**
 * Unit tests for check L — plugin-root resolvability
 * (scripts/validate/checks/plugin-root-resolvable.mjs) — a brand-new check
 * module with NO prior unit test (R-X strict: the Implementer who wrote the
 * module in the same phase is forbidden from authoring its test; that is
 * this session's job, test-after, per docs/context/methodology.md).
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md (PRD AC-17)
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-1-resource-packaging.plan.md
 *   Task 11: "CREATE scripts/validate/checks/plugin-root-resolvable.mjs and
 *   register it" — explicitly excludes authoring this file's own test (R-X
 *   strict; see the plan's `## NOT Building` and `## Notes`).
 *
 * Existing-coverage scan performed before authoring: grepped every
 * scripts/validate/checks/*.test.mjs file for "plugin-root-resolvable" and
 * "runPluginRootResolvableCheck" — zero hits anywhere. This module is
 * virgin territory; every test below is NEW_TEST_REQUIRED.
 *
 * Mirrors path-existence.test.mjs's own established idiom for a check whose
 * production function takes no fixture-injectable arguments (unlike
 * path-existence's checkPathExistence/runPathExistenceCheck split,
 * runPluginRootResolvableCheck() is a single real-wrapper with no pure-function
 * half): write a real, disposable fixture file under plugins/relay/ (the
 * check's own scan root), run the real check, assert on the findings it
 * produces, then delete the fixture in a `finally` block. Every fixture-writing
 * test is wrapped in `withScanRootLock` because node:test runs test FILES
 * concurrently by default, and other files' real-wrapper tests (this file's
 * own AC-A2 sibling in figma-quota-resilience-phase1.test.mjs; dispatch-graph/
 * registration-parity/path-existence's real-wrapper tests in
 * figma-track-phase2/3.test.mjs) scan the SAME plugins/relay/ tree with no
 * fixture isolation of their own — a fixture transiently present during one
 * of those scans would be a genuine filesystem race, not an application
 * defect (scan-root-lock.mjs's own header comment documents this exact class
 * of race).
 *
 * Traceability: this file is NEW_TEST_REQUIRED work for the plan's AC-A3
 * ("the newly-registered plugin-root-resolvable check" — the check's own
 * correctness is a precondition for AC-A3's "12 checks, all passing" claim)
 * and, more directly, documents the two contested-at-code-review rules (R1,
 * R2) and the one documented current-behavior limitation the dispatching
 * session specifically asked to be pinned by a test. The real-tree,
 * zero-fixture "does the CURRENT repo tree pass" property is a distinct
 * test, authored as this same phase's figma-quota-resilience-phase1.test.mjs
 * AC-A2 — not duplicated here (mirrors the corpus-wide convention: a check's
 * own *.test.mjs owns fixture-based unit tests of the check's logic; the
 * FEATURE-phase *.test.mjs owns the "already green against the real
 * post-change tree" regression net — see e.g. figma-track-phase2.test.mjs's
 * path-existence real-wrapper test vs. path-existence.test.mjs's own fixture
 * tests).
 *
 * Run: node --test scripts/validate/checks/plugin-root-resolvable.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { runPluginRootResolvableCheck } from './plugin-root-resolvable.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const FIXTURE_REL_PATH = 'plugins/relay/agents/__tmp_plugin_root_resolvable_fixture.md';

/**
 * @param {string} content
 * @param {string} needle
 * @returns {number} 1-indexed line number of the first line containing needle
 */
function lineOf(content, needle) {
  const idx = content.split('\n').findIndex((l) => l.includes(needle));
  assert.notEqual(idx, -1, `fixture setup error: expected to find a line containing ${JSON.stringify(needle)}`);
  return idx + 1;
}

// ---------------------------------------------------------------------------
// R1 — a bare, un-prefixed mention of one of the 8 resource basenames
// anywhere under plugins/relay/ is flagged; the correctly-prefixed form is
// never flagged; an example-marker-preceded mention is excluded (mirrors
// path-existence.mjs's identical exclusion); a path-suffixed bare mention
// (e.g. `docs/context/prd-template.md`, not just the bare basename) is also
// flagged, since it still fails the "exact packaged-prefix form" test.
// ---------------------------------------------------------------------------

test('R1: flags a bare, un-prefixed backtick mention of an owned resource basename anywhere under plugins/relay/, but never the correctly `${CLAUDE_PLUGIN_ROOT}/resources/`-prefixed form of the SAME basename in the SAME fixture', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    'A stale, bare citation: see `mock-sentinels.md` for the sentinel convention.',
    '',
    'The correct, packaged form of the SAME resource, which must NEVER be flagged:',
    'see `${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md` for the sentinel convention.',
    '',
  ].join('\n');
  const bareLineNumber = lineOf(fixtureContent, 'see `mock-sentinels.md`');
  const correctLineNumber = lineOf(fixtureContent, '${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md');
  assert.notEqual(bareLineNumber, correctLineNumber, 'fixture setup error: the two lines must be distinct');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const bareFinding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === bareLineNumber);
      assert.ok(
        bareFinding,
        `expected a finding for the bare \`mock-sentinels.md\` mention at line ${bareLineNumber}, got: ${JSON.stringify(result.findings)}`
      );
      assert.match(bareFinding.message, /mock-sentinels\.md/);

      const correctFinding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === correctLineNumber);
      assert.equal(
        correctFinding,
        undefined,
        `the correctly-prefixed \${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md form must never be flagged, got: ${JSON.stringify(correctFinding)}`
      );
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

test('R1: flags a path-suffixed bare mention of an owned resource basename (e.g. a stale `docs/context/<name>.md` citation, not just the bare filename) — any form other than the exact packaged prefix is a finding', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    'A stale path-prefixed citation: `docs/context/prd-template.md` describes the shape.',
    '',
  ].join('\n');
  const staleLineNumber = lineOf(fixtureContent, 'docs/context/prd-template.md');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const staleFinding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === staleLineNumber);
      assert.ok(
        staleFinding,
        `expected a finding for the stale docs/context/-prefixed prd-template.md mention, got: ${JSON.stringify(result.findings)}`
      );
      assert.match(staleFinding.message, /prd-template\.md/);
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

test('R1: does not flag an owned-resource-basename mention immediately preceded by an "e.g."/"for example" marker on the same line (mirrors path-existence.mjs\'s identical illustrative-example exclusion)', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    'One of the eight resource basenames, e.g. `mock-sentinels.md`, is packaged.',
    '',
  ].join('\n');
  const exampleLineNumber = lineOf(fixtureContent, 'e.g. `mock-sentinels.md`');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const exampleFinding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === exampleLineNumber);
      assert.equal(
        exampleFinding,
        undefined,
        `an "e.g." illustrative mention must not be flagged, got: ${JSON.stringify(exampleFinding)}`
      );
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// R2 — a `--prefix plugins/relay/…` invocation is flagged, deliberately
// installer-agnostic (npm install, npm ci, npx all carry the same defect)
// and deliberately raw-line-scanning (never backtick-anchored) so it catches
// an invocation inside a fenced shell code block, which is never itself
// wrapped in single backticks. The literal `<target_root>/plugins/relay/`
// leak shape is the second R2 sub-shape and is exercised too.
// ---------------------------------------------------------------------------

test('R2: flags an `npm install --prefix plugins/relay/…` invocation INSIDE a fenced ```bash code block — raw-line scanning, not backtick-anchored, so a fenced block (never itself single-backtick-wrapped) is still caught', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    '```bash',
    'npm install --prefix plugins/relay/scripts/visual/',
    '```',
    '',
  ].join('\n');
  const invocationLineNumber = lineOf(fixtureContent, '--prefix plugins/relay/');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const finding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === invocationLineNumber);
      assert.ok(
        finding,
        `expected a finding for the fenced-block --prefix plugins/relay/ invocation, got: ${JSON.stringify(result.findings)}`
      );
      assert.match(finding.message, /--prefix/);
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

test('R2: is installer-agnostic — an `npx --prefix plugins/relay/…` invocation is flagged identically to `npm install`, since npm ci/npx/other installers accept the identical --prefix flag and carry the identical defect', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    '```bash',
    "npx --prefix plugins/relay/scripts/visual/ playwright install chromium",
    '```',
    '',
  ].join('\n');
  const invocationLineNumber = lineOf(fixtureContent, '--prefix plugins/relay/');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const finding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === invocationLineNumber);
      assert.ok(
        finding,
        `expected npx --prefix plugins/relay/ to be flagged identically to npm install --prefix, got: ${JSON.stringify(result.findings)}`
      );
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

test('R2: flags a literal `<target_root>/plugins/relay/…` path leak — a target project never contains a plugins/relay/ segment, so this shape is always the H0-class defect', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    'Bad: the script resolves at <target_root>/plugins/relay/scripts/visual/capture.mjs',
    '',
  ].join('\n');
  const leakLineNumber = lineOf(fixtureContent, '<target_root>/plugins/relay/');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const finding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === leakLineNumber);
      assert.ok(
        finding,
        `expected a finding for the <target_root>/plugins/relay/ literal leak, got: ${JSON.stringify(result.findings)}`
      );
      assert.match(finding.message, /target_root/);
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Documented current-behavior limitation (not a defect — pinned deliberately
// so a future widening of scope is a conscious choice, not a silent drift).
// A bare, un-prefixed SCRIPT-path mention (as opposed to one of the 8
// resource basenames) with NEITHER a ${CLAUDE_PLUGIN_ROOT} prefix NOR a
// --prefix flag is caught by NEITHER R1 (scoped to the 8 resource
// basenames only) NOR R2 (scoped to the two concrete H0-class shapes only).
// No live instance of this gap exists in the tree today (confirmed absent
// by path-existence.mjs's own class-1 bare-`scripts/`-reference coverage,
// which is a DIFFERENT check with a DIFFERENT scope — path-existence checks
// EXISTENCE, not packaged-prefix FORM); this test exists purely to pin the
// current, intentionally-scoped behavior.
// ---------------------------------------------------------------------------

test('Known limitation (pinned, not a defect): a bare, un-prefixed SCRIPT-path mention with neither a ${CLAUDE_PLUGIN_ROOT} prefix nor a --prefix flag is caught by NEITHER R1 nor R2 — a companion R1-triggering line in the SAME fixture proves the scan is genuinely active, not silently skipping the whole file', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = [
    '---',
    'name: tmp-fixture',
    '---',
    '',
    'Uncaught by design: run plugins/relay/scripts/visual/provision.mjs directly.',
    '',
    'Companion control proving the file IS actively scanned: see `plan-template.md` for the shape.',
    '',
  ].join('\n');
  const uncaughtLineNumber = lineOf(fixtureContent, 'run plugins/relay/scripts/visual/provision.mjs');
  const controlLineNumber = lineOf(fixtureContent, '`plan-template.md`');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();

      const uncaughtFinding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === uncaughtLineNumber);
      assert.equal(
        uncaughtFinding,
        undefined,
        `documented limitation: a bare script-path mention with neither prefix form must currently produce NO finding, got: ${JSON.stringify(uncaughtFinding)}`
      );

      const controlFinding = result.findings.find((f) => f.file === FIXTURE_REL_PATH && f.line === controlLineNumber);
      assert.ok(
        controlFinding,
        `expected the companion bare-resource-basename control line to BE flagged (proves the scan is active over this fixture, not vacuously skipping it), got: ${JSON.stringify(result.findings)}`
      );
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Contract shape — mirrors path-existence.mjs's exact { name, ok, findings }
// return contract (Task 11's own MIRROR directive).
// ---------------------------------------------------------------------------

test('runPluginRootResolvableCheck() returns the { name: "plugin-root-resolvable", ok, findings } contract shape, with ok deriving from findings.length === 0', async () => {
  const fixtureAbsPath = resolve(FIXTURE_REL_PATH);
  const fixtureContent = ['---', 'name: tmp-fixture', '---', '', 'Bare citation: `redaction-policy.md`.', ''].join('\n');

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPluginRootResolvableCheck();
      assert.equal(result.name, 'plugin-root-resolvable');
      assert.equal(result.ok, false);
      assert.ok(Array.isArray(result.findings));
      assert.ok(result.findings.length > 0);
      for (const finding of result.findings) {
        assert.ok('message' in finding);
        assert.ok('file' in finding);
        assert.ok('line' in finding);
      }
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});
