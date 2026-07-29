// @ts-check
/**
 * Unit tests for check D — path-existence — the pure `checkPathExistence`
 * function exported by scripts/validate/checks/path-existence.mjs, plus two
 * real-wrapper regression tests: one for the PRD AC-5 worked example (hole
 * #3 shape) exercised through `runPathExistenceCheck()`'s actual
 * regex-extraction + real `existsSync` classification, and one for the
 * AC-10 scope invariant.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. `checkPathExistence` takes references
 * that already carry a precomputed `exists` boolean (the wrapper does the
 * real existsSync I/O) — most of these tests exercise the pure
 * filtering/formatting logic entirely via in-memory fixtures, no real
 * filesystem I/O. The two `runPathExistenceCheck()` tests below are the
 * deliberate exception — see each test's inline comment for why.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-5  referenced-path existence (check D)
 *   PRPs/prds/validation-suite.prd.md AC-10 scope excludes prp-core
 *
 * Run: node --test scripts/validate/checks/path-existence.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkPathExistence, runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-5 — referenced-path existence
// ---------------------------------------------------------------------------

test('checkPathExistence: ok:true with no findings when every reference exists', () => {
  const result = checkPathExistence({
    references: [
      { raw: 'scripts/validate/index.mjs', resolvedPath: 'scripts/validate/index.mjs', file: 'docs/example.md', line: 5, exists: true },
    ],
  });

  assert.equal(result.name, 'path-existence');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkPathExistence: fails naming the dangling reference (raw token + resolved path + file:line)', () => {
  const result = checkPathExistence({
    references: [
      { raw: 'scripts/does-not-exist.mjs', resolvedPath: 'scripts/does-not-exist.mjs', file: 'docs/example.md', line: 10, exists: false },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /scripts\/does-not-exist\.mjs/);
  assert.equal(result.findings[0].file, 'docs/example.md');
  assert.equal(result.findings[0].line, 10);
});

// This test deliberately exercises the real WRAPPER (`runPathExistenceCheck`)
// rather than the pure function — the pure-function fixture above already
// covers "a precomputed exists:false reference produces a dangling
// finding," so a second pure-function test asserting the identical property
// on different literal strings would be a relabeled duplicate (R-DUPLICATE),
// not additional coverage. This test instead adds genuinely distinct
// coverage: the wrapper's own regex-extraction of a backtick-quoted
// reference out of realistic markdown prose, PLUS a real `existsSync`
// classification against the actual filesystem — neither of which the pure
// function touches. The fixture file is test-owned: written immediately
// before the assertion and deleted in a `finally` block immediately after,
// so it never persists in the working tree (and never leaks into the
// AC-10 test below, which runs after this one completes).
// This test writes its fixture directly into docs/ — one of
// runPathExistenceCheck()'s real SCAN_ROOTS — so while the fixture exists it
// is visible to any other test file's concurrent real-wrapper scan of the
// same tree (node:test runs test files concurrently by default; see
// scan-root-lock.mjs). withScanRootLock serializes the write→scan→cleanup
// critical section against those other tests instead of leaving the race in
// place.
// 2026-07-29: the "real, already-existing sibling" literal below was
// retargeted from a bare `scripts/normalize-test-output.mjs` reference —
// stale after "move relay's three helper scripts into the plugin" relocated
// that file to `plugins/relay/scripts/normalize-test-output.mjs` — to
// `${CLAUDE_PLUGIN_ROOT}/scripts/normalize-test-output.mjs`, which now
// resolves through this check's newly-extended `scripts/` prefix
// (CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES) to that same real file.
// 2026-07-29 (test-reviewer CHANGES_REQUESTED, addressed same session): that
// first retarget was CIRCULAR, not merely retargeted — the assertion
// "no finding mentions normalize-test-output.mjs" passes vacuously whether
// the `scripts/` prefix class exists or not, because "token never extracted"
// and "token extracted and resolved to a real file" both produce zero
// findings. Verified empirically (temporarily removing `'scripts/'` from
// CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES): the assertion alone still passed.
// Fixed by adding a negative control below in the SAME
// `${CLAUDE_PLUGIN_ROOT}/scripts/...` class that names a file that does NOT
// exist and therefore MUST dangle — a regression that silently drops
// `scripts/` from the prefix array stops that reference from being
// extracted at all, so the negative-control assertion fails exactly when it
// should. Re-verified empirically after adding it: fails when `'scripts/'`
// is removed, passes when restored. Together the two assertions prove the
// test's original intent for real: a real sibling in this class is never
// false-positived, AND a nonexistent one in the same class is never
// false-negatived (i.e. the class is genuinely being checked).
test('runPathExistenceCheck: catches the PRD AC-5 worked example — a dangling .py reference is flagged while the real .mjs sibling is not (hole #3 shape; wrapper-level regex extraction + real existsSync classification)', async () => {
  const fixtureRelPath = 'docs/.tmp-path-existence-ac5-fixture.md';
  const fixtureAbsPath = resolve(fixtureRelPath);
  const fixtureContent = [
    '# AC-5 fixture (test-owned — written immediately before this test runs,',
    '# deleted immediately after; never committed to the tree)',
    '',
    'The runner script `scripts/normalize-test-output.py` normalizes raw test',
    'output before classification. This is the PRD AC-5 worked example: the',
    'real file on disk is `.mjs`, not `.py`, so this reference must dangle.',
    '',
    'For contrast, the runner script `${CLAUDE_PLUGIN_ROOT}/scripts/normalize-test-output.mjs`',
    'normalizes raw test output before classification — this is the real,',
    'already-existing sibling file and must never be flagged as dangling.',
    '',
    'A negative control in that SAME plugin-root scripts/ class,',
    '`${CLAUDE_PLUGIN_ROOT}/scripts/does-not-exist-negative-control.mjs`,',
    'names a file that does not exist and must still dangle — proving the',
    'class is actively extracted and existsSync-checked, not silently',
    'skipped (the one property a regression dropping scripts/ from',
    'CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES would break without this line).',
    '',
  ].join('\n');
  const danglingLineNumber = fixtureContent.split('\n').findIndex((l) => l.includes('normalize-test-output.py')) + 1;
  const negativeControlLineNumber =
    fixtureContent.split('\n').findIndex((l) => l.includes('does-not-exist-negative-control.mjs')) + 1;

  await withScanRootLock(async () => {
    writeFileSync(fixtureAbsPath, fixtureContent, 'utf-8');
    try {
      const result = runPathExistenceCheck();

      const danglingFinding = result.findings.find(
        (f) => f.file === fixtureRelPath && f.message.includes('normalize-test-output.py')
      );
      assert.ok(
        danglingFinding,
        `expected a dangling-reference finding naming ${fixtureRelPath}, got findings: ${JSON.stringify(result.findings)}`
      );
      assert.equal(danglingFinding.line, danglingLineNumber);

      const mjsFalsePositive = result.findings.find((f) => f.message.includes('normalize-test-output.mjs'));
      assert.equal(
        mjsFalsePositive,
        undefined,
        `the real, already-existing .mjs sibling must never be flagged as dangling, got: ${JSON.stringify(mjsFalsePositive)}`
      );

      // Negative control — see the 2026-07-29 comment above the test. Proves
      // the `scripts/` class is actively extracted+resolved, not merely
      // absent-of-finding: a regression that silently drops `scripts/` from
      // CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES makes this reference stop being
      // extracted at all, so this assertion fails exactly when it should
      // (verified empirically — see the comment above the test).
      const negativeControlFinding = result.findings.find(
        (f) => f.file === fixtureRelPath && f.message.includes('does-not-exist-negative-control.mjs')
      );
      assert.ok(
        negativeControlFinding,
        `expected a dangling-reference finding for the plugin-root scripts/ negative control (proves the class is genuinely checked, not just quietly absent-of-finding); got findings: ${JSON.stringify(result.findings)}`
      );
      assert.equal(negativeControlFinding.line, negativeControlLineNumber);
    } finally {
      rmSync(fixtureAbsPath, { force: true });
    }
  });
});

test('checkPathExistence: aggregates every dangling reference with no short-circuit (a passing reference never masks a failing one)', () => {
  const result = checkPathExistence({
    references: [
      { raw: 'scripts/dangling-one.mjs', resolvedPath: 'scripts/dangling-one.mjs', file: 'docs/a.md', line: 1, exists: false },
      { raw: 'scripts/fine.mjs', resolvedPath: 'scripts/fine.mjs', file: 'docs/b.md', line: 2, exists: true },
      { raw: 'scripts/dangling-two.mjs', resolvedPath: 'scripts/dangling-two.mjs', file: 'docs/c.md', line: 3, exists: false },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  const raws = result.findings.map((f) => f.message);
  assert.ok(raws.some((m) => m.includes('dangling-one')));
  assert.ok(raws.some((m) => m.includes('dangling-two')));
});

// ---------------------------------------------------------------------------
// Robustness — missing/malformed inputs are a loud-failure finding, never a
// throw and never a silent pass.
// ---------------------------------------------------------------------------

test('checkPathExistence: reports a loud failing finding (not a throw) when references is missing (null/undefined)', () => {
  for (const references of [null, undefined]) {
    const result = checkPathExistence({ references });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, null);
    assert.match(result.findings[0].message, /missing input/);
  }
});

test('checkPathExistence: ok:true with no findings when references is an empty array (distinct from missing/null)', () => {
  const result = checkPathExistence({ references: [] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkPathExistence: never throws on a malformed reference entry missing the "exists" field — treats it as failing (fail-safe, not fail-silent)', () => {
  assert.doesNotThrow(() => {
    const result = checkPathExistence({
      references: [{ raw: 'scripts/malformed.mjs', resolvedPath: 'scripts/malformed.mjs', file: 'docs/x.md', line: 1 }],
    });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
  });
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-10 — scope excludes prp-core. This is
// a property of the WRAPPER's hardcoded SCAN_ROOTS (plugins/relay, docs —
// never plugins/prp-core), so it is asserted here against the real wrapper
// and the real repo tree rather than a fixture.
// ---------------------------------------------------------------------------

test('runPathExistenceCheck: never emits a finding whose file resolves under plugins/prp-core', () => {
  const result = runPathExistenceCheck();
  for (const finding of result.findings) {
    assert.ok(
      !finding.file || !finding.file.startsWith('plugins/prp-core'),
      `finding must never reference plugins/prp-core, got: ${JSON.stringify(finding)}`
    );
  }
});
