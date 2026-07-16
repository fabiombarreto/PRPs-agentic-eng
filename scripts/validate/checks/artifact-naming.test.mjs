// @ts-check
/**
 * Unit tests for check G — artifact-naming — the pure `checkArtifactNaming`
 * function exported by scripts/validate/checks/artifact-naming.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function via
 * in-memory filename-array fixtures — no real filesystem I/O.
 *
 * AC-10 (prp-core scope) does not apply to this check: `PLANS_DIR` is fixed
 * to `PRPs/plans` and never traverses `plugins/` at all, so cross-plugin
 * scope leakage is structurally impossible — unlike checks C/D/E/F/A, which
 * this check module deliberately does not attempt to cover.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-8  artifact naming (check G)
 *
 * Run: node --test scripts/validate/checks/artifact-naming.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkArtifactNaming } from './artifact-naming.mjs';

const PLANS_DIR = 'PRPs/plans';

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-8 — artifact naming
// ---------------------------------------------------------------------------

test('checkArtifactNaming: ok:true with no findings for correctly-named review-log artifacts', () => {
  const result = checkArtifactNaming({
    planFiles: [
      'PRPs/plans/foo-phase-1-bar.review.jsonl',
      'PRPs/plans/foo-phase-1-bar.code-review.jsonl',
      'PRPs/plans/foo-phase-1-bar.test-write-review.jsonl',
    ],
  });

  assert.equal(result.name, 'artifact-naming');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkArtifactNaming: catches the PRD AC-8 worked example — a doubled ".plan.review.jsonl" (hole #4 shape)', () => {
  const result = checkArtifactNaming({
    planFiles: ['PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.review.jsonl'],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, 'PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.review.jsonl');
  assert.match(result.findings[0].message, /doubled/);
});

test('checkArtifactNaming: also catches the doubled ".plan" form for the code-review and test-write-review suffixes', () => {
  const result = checkArtifactNaming({
    planFiles: ['PRPs/plans/foo.plan.code-review.jsonl', 'PRPs/plans/foo.plan.test-write-review.jsonl'],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
});

test('checkArtifactNaming: does not false-positive on a filename that merely contains "plan" but has no doubled ".plan." segment', () => {
  const result = checkArtifactNaming({
    planFiles: ['PRPs/plans/my-plan-name-phase-1.review.jsonl'],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// Robustness — missing/malformed inputs are a loud-failure finding, never a
// throw and never a silent pass.
// ---------------------------------------------------------------------------

test('checkArtifactNaming: reports a loud failing finding (not a throw) when planFiles is missing (null/undefined)', () => {
  for (const planFiles of [null, undefined]) {
    const result = checkArtifactNaming({ planFiles });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, PLANS_DIR);
  }
});

test('checkArtifactNaming: ok:true with no findings when planFiles is an empty array (distinct from missing/null)', () => {
  const result = checkArtifactNaming({ planFiles: [] });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
