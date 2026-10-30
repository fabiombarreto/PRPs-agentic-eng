// @ts-check
/**
 * Regression tests for the defects that unattended benchmark runs of
 * `/relay-execute` on relay 0.47.0 exposed, fixed in 0.49.0. The governing
 * entry is `docs/decisions.md` [2026-10-27] "Benchmark-run defects fixed at the
 * surface that produced them".
 *
 * Two kinds of assertion live here. The R-X diff-base properties are
 * BEHAVIORAL: each builds a throwaway git repository and runs the real git
 * commands and the real `executable-content-hash.mjs`, because the defects were
 * in how those were invoked, and a prose assertion could not show that the old
 * invocation clears a modified test while the new one does not. Everything
 * else under test is prompt text, where content invariance is the only
 * available form. Those assertions pin the presence of each fix and the
 * absence of the defective wording, so a later edit that reintroduces either
 * one fails here.
 *
 * Existing-coverage scan: `plan-reviewer-validate-pattern-ungrounded-check.test.mjs`
 * pins conditions (a) and (b) of that row, and `diff-base-form` pins the
 * single-argument `git diff <base>` form; neither reads the dispatch payloads,
 * the equivalence-script invocation, the test-first snapshot, the artifact-
 * plane rules, the stage ledger or the scratch-file rules. The two new scripts
 * have their own unit suites beside them in `plugins/relay/scripts/`.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const flat = (s) => s.replace(/\s+/g, ' ');

const PLUGIN = 'plugins/relay';
const EXECUTE = `${PLUGIN}/commands/relay-execute.md`;
const IMPLEMENT = `${PLUGIN}/commands/relay-implement.md`;
const PLAN_CMD = `${PLUGIN}/commands/relay-plan.md`;
const TEST_WRITER = `${PLUGIN}/agents/test-writer.md`;
const CODE_REVIEWER = `${PLUGIN}/agents/code-reviewer.md`;
const IMPLEMENTER = `${PLUGIN}/agents/implementer.md`;
const TEST_RUNNER = `${PLUGIN}/agents/test-runner.md`;
const PLAN_REVIEWER = `${PLUGIN}/agents/plan-reviewer.md`;
const PLAN_WRITER = `${PLUGIN}/agents/plan-writer.md`;
const PRD_WRITER = `${PLUGIN}/agents/prd-writer.md`;
const TOPOLOGY = `${PLUGIN}/resources/repository-topology.md`;
const ALLOWLIST = `${PLUGIN}/resources/settings-allowlist.md`;
const HASH_SCRIPT = resolve(process.cwd(), `${PLUGIN}/scripts/executable-content-hash.mjs`);

/** @param {string} cwd @param {string[]} args */
const git = (cwd, args) =>
  execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'core.autocrlf=false', ...args], {
    cwd,
    encoding: 'utf8',
  }).trim();

/** A repository with one committed source file and one committed test file. */
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'relay-ff-2026-10-'));
  git(dir, ['init', '-q']);
  mkdirSync(join(dir, 'tests'));
  writeFileSync(join(dir, 'app.py'), 'def f():\n    return 1\n');
  writeFileSync(join(dir, 'tests', 'test_app.py'), 'from app import f\n\n\ndef test_f():\n    assert f() == 1\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'base']);
  return dir;
}

/** @param {string} repo @param {string} base @param {string} head @param {string} path */
function cleared(repo, base, head, path) {
  const out = execFileSync(process.execPath, [HASH_SCRIPT, '--repo', repo, '--base', base, '--head', head, '--', path], { encoding: 'utf8' });
  const report = JSON.parse(out);
  const row = (report.files ?? []).find((/** @type {any} */ r) => r.path === path);
  assert.ok(row, `no report row for ${path}: ${out}`);
  return row.cleared;
}

// ---------------------------------------------------------------------------
// R-X equivalence: `--head HEAD` clears a modified, uncommitted test
// ---------------------------------------------------------------------------

test('R-X equivalence: on uncommitted work, --head HEAD clears an edited test (the 0.47.0 defect) and --head WORKTREE does not', () => {
  const dir = makeRepo();
  try {
    const base = git(dir, ['rev-parse', 'HEAD']);
    writeFileSync(join(dir, 'tests', 'test_app.py'), 'from app import f\n\n\ndef test_f():\n    assert f() == 2\n');
    assert.equal(cleared(dir, base, 'HEAD', 'tests/test_app.py'), true, 'the defect this release fixes is no longer reproducible; revisit the test');
    assert.equal(cleared(dir, base, 'WORKTREE', 'tests/test_app.py'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('code-reviewer runs the equivalence script against the working tree of code_root, never against HEAD', () => {
  const s = read(CODE_REVIEWER);
  assert.ok(s.includes('executable-content-hash.mjs --repo <code_root> --base <diff_target> --head WORKTREE --'));
  assert.ok(!/executable-content-hash\.mjs[^\n]*--head HEAD/.test(s), 'a --head HEAD invocation is back');
});

// ---------------------------------------------------------------------------
// Test-first: the approved suite is part of the diff base
// ---------------------------------------------------------------------------

test('test-first snapshot: an approved, uncommitted suite captured with git write-tree stays out of the diff, and an edit to it shows up', () => {
  const dir = makeRepo();
  try {
    const mergeBase = git(dir, ['rev-parse', 'HEAD']);
    writeFileSync(join(dir, 'tests', 'test_new.py'), 'def test_new():\n    assert True\n');
    git(dir, ['add', '-A']);
    const suiteTree = git(dir, ['write-tree']);

    writeFileSync(join(dir, 'app.py'), 'def f():\n    return 2\n');
    git(dir, ['add', '-A']);
    assert.deepEqual(git(dir, ['diff', '--name-only', mergeBase]).split('\n').sort(), ['app.py', 'tests/test_new.py'], 'the merge-base fallback puts the approved suite in the diff');
    assert.deepEqual(git(dir, ['diff', '--name-only', suiteTree]).split('\n'), ['app.py']);

    writeFileSync(join(dir, 'tests', 'test_new.py'), 'def test_new():\n    assert False\n');
    git(dir, ['add', '-A']);
    assert.ok(git(dir, ['diff', '--name-only', suiteTree]).split('\n').includes('tests/test_new.py'), 'an edit to an approved test must stay visible to R-X');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('relay-execute snapshots the approved suite and gives that tree precedence as the phase diff base', () => {
  const s = read(EXECUTE);
  assert.ok(s.includes('#### Step A.3.5.3 — Suite snapshot (test-first diff base)'));
  assert.ok(s.includes('`suite_diff_bases = {}`'));
  const a41 = s.slice(s.indexOf('#### Step A.4.1'), s.indexOf('#### Step A.4.2'));
  const first = a41.indexOf('`suite_diff_bases[current_phase_N]`');
  const second = a41.indexOf('`phase_diff_bases` holds an entry');
  assert.ok(first !== -1 && second !== -1 && first < second, 'suite_diff_bases must be consulted before phase_diff_bases');
  assert.ok(!s.includes('R-X strict guarantees no test-file edits in the implementer\'s diff.'), 'the false guarantee is back');
});

test('test-writer no longer aborts a test-first plan for listing production files', () => {
  const s = flat(read(TEST_WRITER));
  assert.ok(!s.includes("if the plan's `## Files to Change` rows include non-test files, abort"));
  assert.ok(s.includes('their presence is never an abort condition'));
  assert.ok(s.includes('You simply author, update, and delete zero production files yourself, in either mode.'));
});

// ---------------------------------------------------------------------------
// The code reviewer receives a base, not a patch path
// ---------------------------------------------------------------------------

test('relay-implement passes the code reviewer a git base and code_root, never the patch file path', () => {
  const s = read(IMPLEMENT);
  const dispatches = s.split('Task(subagent_type="code-reviewer"').slice(1).map((d) => d.slice(0, d.indexOf('})')));
  assert.equal(dispatches.length, 2);
  for (const d of dispatches) {
    assert.ok(d.includes('diff_target: <base_commit>,'), d);
    assert.ok(d.includes('code_root: <code_root>,'), d);
    assert.ok(!d.includes('diff.patch'), d);
  }
});

// ---------------------------------------------------------------------------
// One artifact plane
// ---------------------------------------------------------------------------

test('no plugin file writes or reads PRPs artifacts under the worktree', () => {
  /** @param {string} dir @returns {string[]} */
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []));
  const offenders = walk(resolve(process.cwd(), PLUGIN)).filter((f) => readFileSync(f, 'utf8').includes('<worktree>/PRPs/'));
  assert.deepEqual(offenders, []);
});

test('the topology contract defines code_root and the artifact-plane rules, and relay-execute points at them', () => {
  const topo = read(TOPOLOGY);
  assert.ok(topo.includes('### The code root of a phase, and where artifacts go'));
  assert.ok(flat(topo).includes('Every `PRPs/…` path resolves against `project_root`'));
  assert.ok(flat(topo).includes('The orchestrator never changes its working directory into a worktree.'));
  const exe = flat(read(EXECUTE));
  assert.ok(exe.includes('never `cd` into the worktree'));
  assert.ok(exe.includes('is never a reason to skip it'));
  assert.ok(!exe.includes('operate with the worktree context established in A.3.3'));
});

test('a worktree skipped by judgment is a deviation, not FALLBACK_CWD', () => {
  const s = flat(read(EXECUTE));
  assert.ok(s.includes('`FALLBACK_CWD` is recorded ONLY when `/relay-worktree` itself returned non-zero.'));
});

// ---------------------------------------------------------------------------
// Stage ledger
// ---------------------------------------------------------------------------

test('the stage ledger lists ten stages, and every stage name is logged by some orchestrator_run_log entry', () => {
  const s = read(EXECUTE);
  const table = s.slice(s.indexOf('### The stage ledger'), s.indexOf('See:\n'));
  const stages = [...table.matchAll(/^\| \d+ \| `([a-z_0-9]+)` \|/gm)].map((m) => m[1]);
  assert.deepEqual(stages, ['plan', 'worktree', 'tdd', 'implement', 'docs_sync', 'd8', 'test_after', 'test', 'test_review', 'snapshot']);
  for (const stage of stages) assert.ok(s.includes(`"stage": "${stage}"`), `no log entry for stage ${stage}`);
});

test('the success path runs the ledger script and prints deviations; hard rules 13 to 15 are present', () => {
  const s = flat(read(EXECUTE));
  assert.ok(s.includes('node ${CLAUDE_PLUGIN_ROOT}/scripts/orchestrator-ledger.mjs --run PRPs/reports/<feature>/orchestrator-run.json'));
  assert.ok(s.includes('> Protocol deviations:'));
  assert.ok(s.includes("13. **Adopt each stage's command protocol; never dispatch its agents in its place.**"));
  assert.ok(s.includes('14. **Never edit an APPROVED plan, and never flip a plan\'s status by hand.**'));
  assert.ok(s.includes('15. **Never write pipeline scratch files outside `code_root` and `target_root/PRPs/`'));
});

// ---------------------------------------------------------------------------
// Plan-validation defects
// ---------------------------------------------------------------------------

test('plan-reviewer condition (c) grounds literals produced by unchanged code, keeping the (a)/(b) rule intact', () => {
  const s = flat(read(PLAN_REVIEWER));
  assert.ok(s.includes('**(c) Literal produced by code the plan does not change.**'));
  assert.ok(s.includes('fails this check if EITHER (a) or (b) applies'));
  assert.ok(s.includes('Condition (c) fails the row on its own in exactly the same way'));
});

test('the plan-validation repair runs end to end: implementer field, command outcome, orchestrator step, writer exception, relay-plan revision', () => {
  assert.ok(read(IMPLEMENTER).includes('### Step 3.5 — Plan validation defects'));
  assert.ok(read(IMPLEMENTER).includes('plan_validation_defect:'));
  const imp = flat(read(IMPLEMENT));
  assert.ok(imp.includes('return `PLAN_VALIDATION_DEFECT` without dispatching the code reviewer'));
  const exe = read(EXECUTE);
  assert.ok(exe.includes('#### Step A.4.2 — Plan-validation repair'));
  assert.ok(exe.includes('`max_plan_validation_repairs = 1`'));
  assert.ok(exe.includes('FAILED_PLAN_VALIDATION_DEFECT'));
  assert.ok(read(PLAN_WRITER).includes('**The one revision of an APPROVED plan.**'));
  assert.ok(flat(read(PLAN_CMD)).includes('**Skipped on a revision.**'));
});

// ---------------------------------------------------------------------------
// Scratch files and redaction
// ---------------------------------------------------------------------------

test('the test runner pipes output through the shipped redaction filter and never stages raw output', () => {
  const s = flat(read(TEST_RUNNER));
  assert.ok(s.includes('node ${CLAUDE_PLUGIN_ROOT}/scripts/redact-output.mjs'));
  assert.ok(s.includes('never by staging the raw output anywhere first'));
  assert.ok(s.includes('--in <attempt-dir>/junit.xml --out <attempt-dir>/junit.xml'));
});

test('the implementer writes no scratch files', () => {
  assert.ok(flat(read(IMPLEMENTER)).includes('10. **No scratch files, anywhere.**'));
});

test('the allowlist emits no rm -rf allow rule, which the invariant deny would shadow, and allows the two new scripts', () => {
  const s = read(ALLOWLIST);
  assert.ok(!s.includes('- `Bash(rm -rf .worktrees/*)`'), 'the dead allow rule is back');
  assert.ok(s.includes('- `Bash(rm -rf *)`'), 'the invariant deny must stay');
  assert.ok(s.includes('`Bash(node */plugins/relay/scripts/redact-output.mjs *)`'));
  assert.ok(s.includes('`Bash(node */plugins/relay/scripts/orchestrator-ledger.mjs *)`'));
});

// ---------------------------------------------------------------------------
// Refused research dispatch
// ---------------------------------------------------------------------------

test('plan-writer and prd-writer handle a refused research dispatch as an explicit degradation', () => {
  for (const f of [PLAN_WRITER, PRD_WRITER]) {
    const s = flat(read(f));
    assert.ok(s.includes('If the dispatch itself is refused or errors'), f);
    assert.ok(s.includes('not started: <the dispatch error, one line>'), f);
  }
});

// ---------------------------------------------------------------------------
// Test-after composition (found by the 0.49.0 validation run itself)
// ---------------------------------------------------------------------------

test('test-after can adopt /relay-write-test after D8: P2 accepts an IMPLEMENTED plan only with tdd: false, and the orchestrator follows the moved plan', () => {
  const wt = flat(read(`${PLUGIN}/commands/relay-write-test.md`));
  assert.ok(wt.includes('### P2 — Plan ends with `*Status: APPROVED*` (or `*Status: IMPLEMENTED*` in test-after)'));
  assert.ok(wt.includes('With `tdd: false` (test-after) proceed'));
  assert.ok(wt.includes('With `tdd: true` (test-first) HALT'));
  assert.ok(flat(read(EXECUTE)).includes('set `current_plan_path = PRPs/plans/completed/<basename>.plan.md`'));
});
