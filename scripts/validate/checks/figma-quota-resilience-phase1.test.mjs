// @ts-check
/**
 * Content/real-wrapper tests for Phase 1 ("Resource packaging") of the
 * figma-quota-resilience PRD — the 8 plugin-owned resource templates' move
 * from docs/context/ to plugins/relay/resources/, the extended (12-check)
 * npm run validate suite, and the FAILED_TEMPLATE_UNREADABLE halt path on
 * design-map-writer.md / design-spec-writer.md.
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md (PRD AC-17)
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-1-resource-packaging.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 1 plan — the Implementer authored ZERO
 * test-file changes by design (R-X strict; see the plan's `## NOT Building`);
 * every test in this corpus touching this phase's move is this session's
 * work, recorded in this feature's test-suite.diff Lifecycle ledger.
 *
 * Existing-coverage scan performed before authoring (this session, prior to
 * writing this file): read every scripts/validate/checks/*.test.mjs file
 * that references any of the 8 moved resource basenames or the new
 * plugin-root-resolvable check. Findings:
 *   - No existing test anywhere in the corpus asserts, comprehensively
 *     across all 8 resources, both (a) presence at the new
 *     plugins/relay/resources/ location AND (b) absence of a stub at the
 *     old docs/context/ location. Individual per-file EXISTING_TEST_UPDATED
 *     fixes this session (figma-visual-first-track-phase1.test.mjs's own
 *     mock-sentinels.md existence test, strengthened this session) cover
 *     ONE resource each, incidentally, as a side effect of an unrelated
 *     feature's own test; none was written FOR this AC. NEW_TEST_REQUIRED.
 *   - No existing test calls runPluginRootResolvableCheck() against the
 *     real, unmodified repo tree (zero-fixture, "is the check already green
 *     post-move" real-wrapper style) — plugin-root-resolvable.test.mjs
 *     (this session's other new file) owns only the check's OWN
 *     fixture-based unit tests (R1/R2/limitation), mirroring the corpus-wide
 *     split between a check's own *.test.mjs and its consuming feature-phase
 *     *.test.mjs (e.g. path-existence.test.mjs vs.
 *     figma-track-phase2.test.mjs). NEW_TEST_REQUIRED.
 *   - No existing test pins the validate suite's check COUNT at exactly 12
 *     (the one generic full-suite-green test elsewhere,
 *     figma-visual-first-track-phase1.test.mjs's AC-A1, asserts a wildcard
 *     `\d+ checks run` and does not name plugin-root-resolvable). PRD AC-A3
 *     explicitly requires "12 checks... including the newly-registered
 *     plugin-root-resolvable check" — NEW_TEST_REQUIRED.
 *   - No existing test reads design-map-writer.md or design-spec-writer.md
 *     for FAILED_TEMPLATE_UNREADABLE at all (grepped the full corpus for the
 *     string — zero hits outside the two agent files themselves).
 *     NEW_TEST_REQUIRED.
 *
 * Run: node --test scripts/validate/checks/figma-quota-resilience-phase1.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { execPath } from 'node:process';

import { runPluginRootResolvableCheck } from './plugin-root-resolvable.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const RESOURCE_BASENAMES = [
  'prd-template.md',
  'plan-template.md',
  'design-spec-template.md',
  'component-map-template.md',
  'redaction-policy.md',
  'settings-allowlist.md',
  'test-output-schema.md',
  'mock-sentinels.md',
];
const NEW_RESOURCES_DIR = 'plugins/relay/resources';
const OLD_RESOURCES_DIR = 'docs/context';
const DESIGN_MAP_WRITER_PATH = 'plugins/relay/agents/design-map-writer.md';
const DESIGN_SPEC_WRITER_PATH = 'plugins/relay/agents/design-spec-writer.md';
const VALIDATE_INDEX_PATH = 'scripts/validate/index.mjs';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the established helper of the same name/shape used throughout
 * this corpus (e.g. figma-track-phase1.test.mjs).
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space. Mirrors the established helper of the same name/shape
 * used throughout this corpus.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-A1 — Given the 8 plugin-owned resources, when Task 2 completes, then
// they exist at plugins/relay/resources/ and no file remains at their old
// docs/context/ location (zero stubs).
// ---------------------------------------------------------------------------

test('AC-A1: all 8 plugin-owned resource templates exist at plugins/relay/resources/, and none remain (as a stub or otherwise) at their old docs/context/ location', () => {
  for (const basename of RESOURCE_BASENAMES) {
    assert.ok(
      existsSync(resolve(`${NEW_RESOURCES_DIR}/${basename}`)),
      `expected ${NEW_RESOURCES_DIR}/${basename} to exist`
    );
    assert.ok(
      !existsSync(resolve(`${OLD_RESOURCES_DIR}/${basename}`)),
      `expected no stub left behind at ${OLD_RESOURCES_DIR}/${basename} — the move must leave zero stubs (PRD AC-17 / plan AC-A1)`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-A2 — Given plugins/relay/'s full tree, when searched for any of the 8
// resource basenames, then every occurrence carries the
// ${CLAUDE_PLUGIN_ROOT}/resources/ prefix — zero bare or wrongly-prefixed
// forms remain. Real-wrapper regression net: confirms the already-tested
// (plugin-root-resolvable.test.mjs) check module reports zero findings
// against the CURRENT, already-migrated real tree — the missing-property
// delta over that file's own fixture-only coverage, mirroring
// figma-track-phase2/3.test.mjs's identical real-wrapper precedent for
// path-existence/dispatch-graph/registration-parity.
// ---------------------------------------------------------------------------

test('AC-A2: runPluginRootResolvableCheck() returns ok:true with zero findings against the real repo tree after this phase\'s resource move and ~134 reference rewrites', async () => {
  const result = await withScanRootLock(() => runPluginRootResolvableCheck());

  assert.equal(result.name, 'plugin-root-resolvable');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-A3 — Given the extended npm run validate suite, when it runs against
// the post-migration tree, then it reports 12 checks, all passing,
// including the newly-registered plugin-root-resolvable check.
// ---------------------------------------------------------------------------

test('AC-A3: `node scripts/validate/index.mjs` (the real npm run validate entry point) reports zero failures with self-consistent pass/total counts, including [PASS] plugin-root-resolvable', async () => {
  assert.ok(existsSync(resolve(VALIDATE_INDEX_PATH)), 'expected scripts/validate/index.mjs to exist');

  // Locked: this subprocess's own native-validate check shells out to
  // `claude plugin validate ./plugins/relay --strict`, which scans the same
  // plugins/relay/ tree plugin-root-resolvable.test.mjs's fixture tests
  // transiently write into. Without this lock, a fixture present at the
  // instant this subprocess runs would fail native-validate's strict
  // frontmatter check (missing `description`) — a genuine filesystem race
  // (scan-root-lock.mjs's own header comment documents this exact class),
  // not an application defect. Discovered empirically this session: an
  // unlocked first version of this test intermittently failed for exactly
  // this reason; locking it fixed the race.
  const { stdout, status } = await withScanRootLock(() => {
    // Labelled below: this is the slowest critical section in the suite
    // (~6.6s — it spawns the whole validate entry point, whose own
    // native-validate check shells out to `claude plugin validate`), so a
    // timeout elsewhere most often names this one as the holder.
    let out = '';
    let st = 0;
    try {
      out = execFileSync(execPath, [VALIDATE_INDEX_PATH], { encoding: 'utf-8' });
    } catch (err) {
      // execFileSync throws on non-zero exit; capture what we can so a real
      // failure here produces a useful message instead of an opaque throw.
      const e = /** @type {{status?: number, stdout?: string}} */ (err);
      st = e.status ?? 1;
      out = e.stdout || '';
    }
    return { stdout: out, status: st };
  }, 'validate entry-point spawn');

  assert.equal(status, 0, `expected npm run validate to exit 0, got ${status}. Output:\n${stdout}`);
  assert.ok(!/\[FAIL\]/.test(stdout), `expected zero [FAIL] lines in npm run validate output:\n${stdout}`);
  // History: the literal count was bumped 12 -> 13 (usage-metrics Phase 4,
  // metrics-isolation) -> 14 (decisions-mirror), each time tracking one
  // deliberately registered check, until a 15th check (anti-patterns-mirror,
  // 2026-08-27 follow-up) broke this test the same way again — see
  // PRPs/reports/test-formatting-prevention-preflight/test-suite.diff,
  // "Follow-up: check-count assertion" section, for the lifecycle record.
  // Re-pinning to the new literal (15) would only guarantee the identical
  // breakage recurs on the next legitimately added check. This assertion is
  // deliberately count-AGNOSTIC instead: it pins the two properties the test
  // actually exists for — "every registered check passes" (0 failed) and
  // "the reported total is internally self-consistent" (the passed count,
  // captured once via `(\d+)`, is required to equal the checks-run count via
  // the `\1` backreference, so a passed/total mismatch still fails) — without
  // hardcoding an inventory number that legitimately grows. It cannot pass on
  // a suite with any failure (0 failed is asserted literally) or on a suite
  // whose passed/total counts disagree; the two subsequent assertions below
  // additionally re-confirm zero [FAIL] lines and the specific
  // plugin-root-resolvable [PASS] line this AC is actually about.
  assert.match(stdout, /\n(\d+) passed, 0 failed \(\1 checks run\)\n/);
  assert.match(stdout, /\[PASS\] plugin-root-resolvable/, 'expected the newly-registered plugin-root-resolvable check to run and pass');
});

// ---------------------------------------------------------------------------
// AC-A4 — Given design-map-writer.md and design-spec-writer.md, when their
// mandatory template Read fails, then each names an explicit
// FAILED_TEMPLATE_UNREADABLE halt rather than silently improvising the
// artifact's shape from memory.
// ---------------------------------------------------------------------------

test('AC-A4: design-map-writer.md\'s Hard Constraint 1 names FAILED_TEMPLATE_UNREADABLE for a failed template Read (missing, unreadable, or empty), distinct from a successfully-read-but-incomplete template', () => {
  const content = readRepoFile(DESIGN_MAP_WRITER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "If the `Read` itself fails — the file is missing, unreadable, or returns empty content — halt immediately with `FAILED_TEMPLATE_UNREADABLE`, naming the attempted path, rather than improvising the artifact's shape from memory."
    ),
    'expected the FAILED_TEMPLATE_UNREADABLE halt sentence naming missing/unreadable/empty as the trigger'
  );
  assert.ok(
    collapsed.includes(
      "This is distinct from a successfully-read-but-incomplete template (a missing section within an otherwise-readable file), which is still a bug per the rule above, not this halt."
    ),
    'expected the explicit distinction from a successfully-read-but-incomplete template'
  );
});

test('AC-A4: design-spec-writer.md\'s Hard constraint 1 names FAILED_TEMPLATE_UNREADABLE for a failed template Read (missing, unreadable, or empty), distinct from the existing "missing section = bug" rule', () => {
  const content = readRepoFile(DESIGN_SPEC_WRITER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "If the `Read` of the template itself fails — missing, unreadable, or empty — halt immediately with `FAILED_TEMPLATE_UNREADABLE`, naming the attempted path, instead of improvising the spec's shape from memory."
    ),
    'expected the FAILED_TEMPLATE_UNREADABLE halt sentence naming missing/unreadable/empty as the trigger'
  );
  assert.ok(
    collapsed.includes(
      'This is distinct from a successfully-read-but-incomplete template, which remains "missing section = bug" above, not this halt.'
    ),
    'expected the explicit distinction from the existing "missing section = bug" rule'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 — Given the packaging outcome itself (all 8 files present under the
// installed plugin cache's resources/ directory), then it is verified by a
// documented, explicitly human-operated post-merge step — never asserted by
// an automated Validation Command. NOT tested here, by design: no in-repo
// command can observe the installed plugin cache (the plan's own Notes
// section states this explicitly — "Phase 1's only real verification is
// outside the repo"). Recorded in this feature's test-suite.diff as
// NOT_AUTOMATABLE rather than silently omitted.
// ---------------------------------------------------------------------------
