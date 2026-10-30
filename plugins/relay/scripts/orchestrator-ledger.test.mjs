// @ts-check
/**
 * Unit coverage for scripts/orchestrator-ledger.mjs — the deterministic check
 * `/relay-execute` runs before its success summary.
 *
 * The check exists because a run that shortens the protocol is the same run
 * that would have to notice it did: in observed unattended runs the only
 * record of a skipped docs sync or a skipped worktree was the model's own
 * prose. So the suite pins each required stage against a complete log, one
 * removal at a time, and pins the methodology-dependent expectations both
 * ways (test-first, test-after, no framework, docs_sync off).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { checkLedger, parseMethodologyFlags } from './orchestrator-ledger.mjs';

const SCRIPT = fileURLToPath(new URL('./orchestrator-ledger.mjs', import.meta.url));

const TEST_AFTER = { tdd: false, test_frameworks: ['pytest'], docs_sync: true };
const TEST_FIRST = { tdd: true, test_frameworks: ['pytest'], docs_sync: true };
const NO_FRAMEWORK = { tdd: false, test_frameworks: [], docs_sync: true };

/** A complete test-after phase, every stage logged as the protocol specifies. */
function testAfterLog(phase = 1) {
  return [
    { phase, stage: 'plan', outcome: 'CHANGES_REQUESTED', attempt: 1 },
    { phase, stage: 'plan', outcome: 'APPROVED', plan_path: 'PRPs/plans/f-phase-1-x.plan.md' },
    { phase, stage: 'worktree', outcome: 'CREATED', worktree_path: '.worktrees/f/' },
    { phase, stage: 'tdd', outcome: 'deferred_to_test_after' },
    { phase, stage: 'implement', outcome: 'APPROVED' },
    { phase, stage: 'docs_sync', outcome: 'APPROVED' },
    { phase, stage: 'd8', outcome: 'APPLIED' },
    { phase, stage: 'test_after', outcome: 'APPROVED', suite_path: 'PRPs/reports/f/test-suite.diff' },
    { phase, stage: 'test', outcome: 'GREEN' },
    { phase, stage: 'test_review', outcome: 'APPROVED' },
    { phase, stage: 'snapshot', outcome: 'RECORDED', tree: 'abc123' },
    { phase, status: 'complete', plan_path: 'PRPs/plans/completed/f-phase-1-x.plan.md' },
  ];
}

test('a complete test-after phase has no deviations', () => {
  const r = checkLedger({ phases: testAfterLog() }, TEST_AFTER);
  assert.deepEqual(r.deviations, []);
  assert.equal(r.ok, true);
  assert.deepEqual(r.phases_checked, [1]);
});

for (const stage of ['plan', 'worktree', 'tdd', 'implement', 'docs_sync', 'd8', 'test_after', 'test', 'test_review', 'snapshot']) {
  test(`dropping the "${stage}" entry is reported as a deviation for that stage`, () => {
    const log = testAfterLog().filter((e) => e.stage !== stage);
    const r = checkLedger({ phases: log }, TEST_AFTER);
    assert.equal(r.ok, false);
    assert.ok(r.deviations.some((d) => d.phase === 1 && d.stage === stage), JSON.stringify(r.deviations));
  });
}

test('a skipped docs sync is a deviation when docs_sync is on and accepted when it is off', () => {
  const log = testAfterLog().map((e) => (e.stage === 'docs_sync' ? { ...e, outcome: 'SKIPPED (docs_sync: false)' } : e));
  assert.ok(checkLedger({ phases: log }, TEST_AFTER).deviations.some((d) => d.stage === 'docs_sync'));
  assert.deepEqual(checkLedger({ phases: log }, { ...TEST_AFTER, docs_sync: false }).deviations, []);
});

test('FALLBACK_CWD without a /relay-worktree failure reason is a deviation; with one it is not', () => {
  const withoutReason = testAfterLog().map((e) => (e.stage === 'worktree' ? { phase: 1, stage: 'worktree', outcome: 'FALLBACK_CWD', fallback_reason: null } : e));
  assert.ok(checkLedger({ phases: withoutReason }, TEST_AFTER).deviations.some((d) => d.stage === 'worktree'));
  const withReason = testAfterLog().map((e) => (e.stage === 'worktree' ? { phase: 1, stage: 'worktree', outcome: 'FALLBACK_CWD', fallback_reason: 'exit 128: not a git repository' } : e));
  assert.deepEqual(checkLedger({ phases: withReason }, TEST_AFTER).deviations, []);
});

test('test-first requires the tdd stage APPROVED and test_after not_applicable', () => {
  const log = testAfterLog().map((e) => {
    if (e.stage === 'tdd') return { phase: 1, stage: 'tdd', outcome: 'APPROVED', suite_diff_base: 'def456' };
    if (e.stage === 'test_after') return { phase: 1, stage: 'test_after', outcome: 'not_applicable' };
    return e;
  });
  assert.deepEqual(checkLedger({ phases: log }, TEST_FIRST).deviations, []);
  const r = checkLedger({ phases: testAfterLog() }, TEST_FIRST);
  assert.deepEqual(r.deviations.map((d) => d.stage).sort(), ['tdd', 'test_after']);
});

test('without a declared framework the test stages must be the logged skips', () => {
  const log = testAfterLog()
    .filter((e) => e.stage !== 'test_review')
    .map((e) => {
      if (e.stage === 'tdd') return { phase: 1, stage: 'tdd', outcome: 'skipped_no_framework' };
      if (e.stage === 'test_after') return { phase: 1, stage: 'test_after', outcome: 'not_applicable' };
      if (e.stage === 'test') return { phase: 1, stage: 'test', outcome: 'skipped_no_test_framework' };
      return e;
    });
  assert.deepEqual(checkLedger({ phases: log }, NO_FRAMEWORK).deviations, []);
});

test('only completed phases are checked, and each completed phase independently', () => {
  const log = [...testAfterLog(1), ...testAfterLog(2).filter((e) => e.stage !== 'd8'), { phase: 3, stage: 'plan', outcome: 'APPROVED' }];
  const r = checkLedger({ phases: log }, TEST_AFTER);
  assert.deepEqual(r.phases_checked, [1, 2]);
  assert.deepEqual(r.deviations.map((d) => [d.phase, d.stage]), [[2, 'd8']]);
});

test('parseMethodologyFlags reads inline and block lists and applies the protocol defaults', () => {
  assert.deepEqual(parseMethodologyFlags('---\ntdd: true\ntest_frameworks: [pytest, "playwright"]\n---\n'), {
    tdd: true,
    test_frameworks: ['pytest', 'playwright'],
    docs_sync: true,
  });
  assert.deepEqual(parseMethodologyFlags('---\ntdd: false\ntest_frameworks:\n  - node:test\ndocs_sync: false\n---\nbody'), {
    tdd: false,
    test_frameworks: ['node:test'],
    docs_sync: false,
  });
  assert.deepEqual(parseMethodologyFlags('no frontmatter'), { tdd: false, test_frameworks: [], docs_sync: true });
});

test('parseMethodologyFlags reads the commented frontmatter context-builder generates', () => {
  const text = [
    '---',
    'tdd: true                 # true | false — the only key consulted by the TDD track',
    'tdd_evidence: null        # null | "<path-or-short-reason>" | "user-declared"',
    'test_frameworks: [pytest] # array of frameworks detected in the scan (informative only)',
    'docs_sync: false          # true | false — per-project master switch',
    '---',
  ].join('\n');
  assert.deepEqual(parseMethodologyFlags(text), { tdd: true, test_frameworks: ['pytest'], docs_sync: false });
});

test('CLI: --write stores the deviations in the run file and the report keeps exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'relay-ledger-'));
  try {
    const run = join(dir, 'orchestrator-run.json');
    const methodology = join(dir, 'methodology.md');
    writeFileSync(run, JSON.stringify({ feature: 'f', phases: testAfterLog().filter((e) => e.stage !== 'docs_sync') }));
    writeFileSync(methodology, '---\ntdd: false\ntest_frameworks: [pytest]\n---\n');
    const res = spawnSync(process.execPath, [SCRIPT, '--run', run, '--methodology', methodology, '--write'], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(JSON.parse(res.stdout).ok, false);
    const written = JSON.parse(readFileSync(run, 'utf8'));
    assert.equal(written.feature, 'f');
    assert.deepEqual(written.deviations.map((/** @type {any} */ d) => d.stage), ['docs_sync']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: missing arguments or an unreadable run file exit 2 with no report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'relay-ledger-'));
  try {
    const methodology = join(dir, 'methodology.md');
    writeFileSync(methodology, '---\ntdd: false\n---\n');
    for (const args of [[], ['--run', join(dir, 'absent.json'), '--methodology', methodology]]) {
      const res = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
      assert.equal(res.status, 2);
      assert.equal(res.stdout, '');
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
