// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-13 A judge step hands a capture to a model verdict recorded through the judge mode; the case has no outcome until every verdict is recorded; evidence is required; uncertain is needs-human JUDGEMENT_UNCERTAIN
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-14 The criterion of a judge step must appear verbatim in the case's manual steps, else PLAN_ENTRY_INVALID
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-5 (judge-with-scope clause) A judge step with a locator scope also writes an element screenshot of that scope
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-22 The command doc, the knowledge base and the site state the judge step and mode (a marked example, the usage line, the judging protocol)
/**
 * Phase 5 (model judgment) of qa-runner-ai-executable-steps.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-5-model-judgment.plan.md
 *
 * Layers, all over the REAL runner module, the real `judge` binary, the contract check, the command doc, the
 * knowledge base and the site pages (read from disk, never edited):
 *   1. The judge step grammar and the criterion rule: validateStep, validateSteps, validateJudgeCriteria and the
 *      provenance of a judge scope in groundLocators.
 *   2. The pending state: isPendingResult, summarizeEntries (the four-key partition is untouched) and summarizeJudgment.
 *   3. The judge mode, pure: parseJudgeArgs, settleJudgedCase (fail beats uncertain beats pass; a judged pass of a
 *      partial plan is PARTIAL_REMAINDER) and applyJudgeVerdict (refusals, one verdict per step, recomputation).
 *   4. The judge mode through the real binary on a fixture run directory: refusals leave results.json byte-identical,
 *      a recorded verdict is never replaced, the verdict text lives only under evidence/.
 *   5. The contract check accepts a results document that is mid-judgment and still flags a bad one.
 *   6. End to end through the real runner in Chromium, then the real judge binary: the judge captures (including the
 *      element capture of a `within` scope), the pending state until the last verdict, the final outcomes.
 *   7. The documents: the marked judge example, the usage line, the judging protocol, the API reference row.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const SLOW = { timeout: 280000 };

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} t */
const flat = (t) => t.replace(/\s+/g, ' ').trim();

const CANARY = 'canary-qj47-verdict';
const GOTO = { action: 'goto', path: '/' };
const J = { action: 'judge', kind: 'visual', criterion: 'the preview looks right' };
const PENDING = R.PENDING_JUDGMENT;

// ---------------------------------------------------------------------------
// 1. The judge step grammar, the criterion rule and the scope provenance (AC-13, AC-14, AC-5)
// ---------------------------------------------------------------------------

test('AC-13 the judge vocabulary is exported as closed sets and a pending judgment is never an outcome', () => {
  assert.deepEqual([...R.JUDGE_KINDS], ['visual', 'language', 'checklist']);
  assert.deepEqual([...R.JUDGE_VERDICTS], ['pass', 'fail', 'uncertain']);
  assert.equal(R.PENDING_JUDGMENT, 'pending-judgment');
  assert.equal(R.JUDGE_CRITERION_MAX, 500);
  assert.equal(R.JUDGE_EVIDENCE_MIN, 10);
  assert.equal(R.JUDGE_EVIDENCE_MAX, 2000);
  assert.ok(!R.OUTCOMES.includes(R.PENDING_JUDGMENT), 'the outcome vocabulary must stay the four values');
  assert.deepEqual([...R.OUTCOMES], ['pass', 'fail', 'blocked', 'needs-human']);
  assert.equal(R.validateStep('browser', { action: 'judge', kind: 'visual', criterion: 'x' }), null, 'judge is a known browser action');
});

test('AC-13 a browser judge step takes exactly kind, criterion and an optional within scope', () => {
  const ok = (/** @type {any} */ s) => assert.equal(R.validateStep('browser', s), null, JSON.stringify(s));
  ok(J);
  ok({ ...J, kind: 'language' });
  ok({ ...J, kind: 'checklist', within: { role: 'region', name: 'Resumo' } });
  ok({ ...J, within: { role: 'region', name_prefix: 'Resu' } });
});

test('AC-13 a judge step with a bad kind, criterion, extra key or scope is PLAN_ENTRY_INVALID, and is refused for http', () => {
  const bad = [
    { ...J, kind: 'audio' }, { ...J, kind: undefined }, { ...J, kind: 5 },
    { ...J, criterion: '' }, { ...J, criterion: '   ' }, { ...J, criterion: 7 }, { ...J, criterion: undefined },
    { ...J, criterion: 'x'.repeat(R.JUDGE_CRITERION_MAX + 1) },
    { ...J, extra: 1 }, { ...J, selector: '#a' }, { ...J, effect: 'write' }, { ...J, session: 'none' },
    { ...J, within: { role: 'nope', name: 'x' } }, { ...J, within: { role: 'region' } },
    { ...J, within: { role: 'region', name: 'a', name_prefix: 'b' } }, { ...J, within: 'x' },
  ];
  for (const s of bad) assert.equal(R.validateStep('browser', s)?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(s));
  assert.equal(R.validateStep('browser', { ...J, criterion: 'x'.repeat(R.JUDGE_CRITERION_MAX) }), null, 'the criterion limit is inclusive');
  assert.equal(R.validateStep('http', J)?.code, 'PLAN_ENTRY_INVALID', 'a judge step is for the browser driver only');
});

test('AC-13 a judge step is the expectation of its case but never an absence anchor, and a binding in it is refused', () => {
  assert.equal(R.validateSteps('browser', [GOTO, J], []), null);
  assert.equal(R.validateSteps('browser', [GOTO], [])?.code, 'NO_EXPECTATION');
  assert.equal(R.validateSteps('browser', [GOTO, J, { action: 'expect_not_visible', role: 'button', name: 'Ok' }], [])?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(R.validateSteps('browser', [GOTO, { ...J, criterion: 'uses {{missing}}' }], [])?.code, 'PLAN_ENTRY_INVALID');
});

const MANUAL = '1. Open the page.\n2. Check that   the preview\n   looks right in the Resumo panel.';
/** @param {string} c */
const withCriterion = (c) => [GOTO, { ...J, criterion: c }];

test('AC-14 a criterion that appears in the manual steps once whitespace is collapsed is accepted', () => {
  assert.equal(R.validateJudgeCriteria(withCriterion('the preview looks right'), MANUAL), null);
  assert.equal(R.validateJudgeCriteria(withCriterion('  the   preview looks\nright '), MANUAL), null);
  assert.equal(R.validateJudgeCriteria([GOTO], MANUAL), null, 'a plan with no judge step has nothing to check');
});

test('AC-14 a criterion the report does not state is PLAN_ENTRY_INVALID, case-sensitive, and the reason names a position but not the criterion', () => {
  for (const c of ['The preview looks right', 'the preview looks wrong', 'the preview looks right and bright', '', '  ']) {
    const r = R.validateJudgeCriteria(withCriterion(c), MANUAL);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(c));
    assert.match(String(r?.reason), /^step 2: /);
    assert.ok(!String(r?.reason).includes('preview'), `the reason echoed the criterion: ${r?.reason}`);
  }
  const hidden = R.validateJudgeCriteria(withCriterion(CANARY), MANUAL);
  assert.ok(!String(hidden?.reason).includes(CANARY));
  // The first offending judge step is the one named.
  const second = R.validateJudgeCriteria([GOTO, J, { ...J, criterion: 'nobody wrote this' }], MANUAL);
  assert.match(String(second?.reason), /^step 3: /);
});

test('AC-14 a missing or non-string manual text refuses every judge step, and hostile input never throws', () => {
  for (const manual of [null, undefined, 7, {}, []]) {
    assert.equal(R.validateJudgeCriteria(withCriterion('the preview looks right'), manual)?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(manual));
  }
  for (const hostile of [null, undefined, 'x', 7, {}, [null], [7], [{ action: 'judge' }], [{ action: 'judge', criterion: 7 }]]) {
    assert.doesNotThrow(() => R.validateJudgeCriteria(hostile, MANUAL), JSON.stringify(hostile));
  }
  assert.equal(R.validateJudgeCriteria([{ action: 'judge' }], MANUAL)?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-5 a judge scope is grounded like every scoped locator: a word of the report, or a snapshot entry that matches exactly one element', () => {
  const withScope = [GOTO, { ...J, within: { role: 'region', name: 'Resumo' } }];
  assert.deepEqual(R.groundLocators(withScope, [], 'Open. Check the Resumo panel.', null).gaps, [], 'a scope word of the report is grounded');
  // vocabulary v4: a scope nobody grounds makes the judge step a step gap (an assertion: it is skipped, never an entry refusal).
  assert.deepEqual(R.groundLocators(withScope, [], 'Open. Check the panel.', null), { gaps: [{ at: 1, kind: 'assertion' }], truncateAt: null, runtime: [] }, 'a scope word nobody states is a gap');
  assert.deepEqual(R.groundLocators(withScope, [], 'Open. Check the Resumo panel.', null).runtime, [], 'a judge scope declares no run-time resolution');
  const snap = { schema_version: 1, role: 'anonymous', route: '/', entries: [{ kind: 'role', role: 'region', name: 'Resumo', matches: 1 }], withheld: 0 };
  assert.deepEqual(R.groundLocators(withScope, [snap], 'Open. Check the panel.', null).gaps, [], 'a snapshot entry that matches once grounds it');
  const twice = { ...snap, entries: [{ kind: 'role', role: 'region', name: 'Resumo', matches: 2 }] };
  assert.deepEqual(R.groundLocators(withScope, [twice], 'Open. Check the panel.', null).gaps, [{ at: 1, kind: 'assertion' }], 'two matches do not ground it');
  assert.deepEqual(R.groundLocators([GOTO, J], [], 'Open.', null).gaps, [], 'a judge step with no scope needs no grounding');
  assert.equal(R.groundLocators.length, 4, 'the grounding arity is unchanged');
});

// ---------------------------------------------------------------------------
// 2. The pending state (AC-13)
// ---------------------------------------------------------------------------

test('AC-13 isPendingResult is true only for a pending-judgment result that lists its steps', () => {
  assert.equal(R.isPendingResult({ outcome: PENDING, pending_judgment: [2] }), true);
  for (const bad of [{ outcome: PENDING }, { outcome: PENDING, pending_judgment: [] }, { outcome: PENDING, pending_judgment: '2' }, { outcome: 'pass', pending_judgment: [2] }, { outcome: 'passed' }, null, undefined, 7, 'x', []]) {
    assert.equal(R.isPendingResult(bad), false, JSON.stringify(bad));
  }
});

test('AC-13 summarizeEntries skips an entry with no outcome and keeps the four-key partition and the three-key shape', () => {
  const s = R.summarizeEntries([{ outcome: 'pass' }, { outcome: null }, { outcome: 'fail' }, { outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER' }, { outcome: undefined }, { outcome: PENDING }]);
  assert.deepEqual(s.counts, { pass: 1, fail: 1, blocked: 0, 'needs-human': 1 });
  assert.deepEqual(Object.keys(s.counts), ['pass', 'fail', 'blocked', 'needs-human']);
  assert.deepEqual(Object.keys(s), ['counts', 'record_resolved', 'partially_executed']);
  assert.equal(s.partially_executed, 1);
  assert.deepEqual(R.summarizeEntries([]), { counts: { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 }, record_resolved: 0, partially_executed: 0 });
});

test('AC-13 summarizeJudgment is null for a run with no judge step and counts pending and judged steps otherwise', () => {
  assert.equal(R.summarizeJudgment([]), null);
  assert.equal(R.summarizeJudgment([{ steps: [{ action: 'goto', result: 'passed' }] }, null, 7]), null);
  assert.equal(R.summarizeJudgment('x'), null);
  const entries = [
    { outcome: null, steps: [{ action: 'judge', result: PENDING }, { action: 'judge', result: PENDING }, { action: 'goto', result: 'passed' }] },
    { outcome: 'pass', steps: [{ action: 'judge', result: 'passed', judged_by: 'model' }, { action: 'judge', result: 'failed', judged_by: 'model' }, { action: 'judge', result: 'uncertain', judged_by: 'model' }, { action: 'judge', result: 'passed' }] },
    { outcome: 'fail', steps: [{ action: 'judge', result: 'not-judged' }] },
  ];
  assert.deepEqual(R.summarizeJudgment(entries), { pending_steps: 2, judged_steps: 3 });
});

// ---------------------------------------------------------------------------
// 3. The judge mode, pure (AC-13)
// ---------------------------------------------------------------------------

const EV = `The panel shows the heading and the summary text as described. ${CANARY}`;
/** @param {string[]} extra @returns {string[]} */
const argvOf = (...extra) => ['--run-dir', 'PRPs/reports/f/qa-run/r1', '--case', '2', '--step', '3', '--verdict', 'pass', '--evidence', EV, ...extra];

test('AC-13 parseJudgeArgs accepts a full call and trims the evidence', () => {
  const r = R.parseJudgeArgs(argvOf('--root', '/some/where'));
  assert.equal(r.ok, true);
  const a = /** @type {any} */ (r);
  assert.equal(a.caseIndex, 2);
  assert.equal(a.stepIndex, 3);
  assert.equal(a.verdict, 'pass');
  assert.equal(a.runDir, 'PRPs/reports/f/qa-run/r1');
  assert.equal(a.evidence, EV);
  assert.equal(/** @type {any} */ (R.parseJudgeArgs(['--run-dir', 'd', '--case', '1', '--step', '1', '--verdict', 'fail', '--evidence', '   padded evidence text   '])).evidence, 'padded evidence text');
  for (const v of R.JUDGE_VERDICTS) {
    assert.equal(R.parseJudgeArgs(['--run-dir', 'd', '--case', '1', '--step', '1', '--verdict', v, '--evidence', EV]).ok, true, v);
  }
});

test('AC-13 parseJudgeArgs refuses a missing or malformed flag and a refusal never echoes a value', () => {
  const without = (/** @type {string} */ flag) => {
    const a = argvOf();
    const i = a.indexOf(flag);
    a.splice(i, 2);
    return a;
  };
  for (const flag of ['--run-dir', '--case', '--step', '--verdict']) {
    assert.equal(R.parseJudgeArgs(without(flag)).ok, false, `missing ${flag}`);
  }
  const noEvidence = R.parseJudgeArgs(without('--evidence'));
  assert.equal(noEvidence.ok, false);
  assert.match(String(/** @type {any} */ (noEvidence).why), /^JUDGE_EVIDENCE_REQUIRED/);

  const swap = (/** @type {string} */ flag, /** @type {string} */ value) => {
    const a = argvOf();
    a[a.indexOf(flag) + 1] = value;
    return a;
  };
  const bad = [
    swap('--case', '0'), swap('--case', '-1'), swap('--case', '1.5'), swap('--case', 'one'), swap('--case', '01'),
    swap('--step', '0'), swap('--step', 'x'), swap('--step', '2e1'),
    swap('--verdict', 'maybe'), swap('--verdict', 'PASS'), swap('--verdict', CANARY),
    swap('--evidence', ''), swap('--evidence', '   '), swap('--evidence', 'short'), swap('--evidence', ' ' + 'x'.repeat(9) + ' '),
    swap('--evidence', 'x'.repeat(R.JUDGE_EVIDENCE_MAX + 1)), swap('--evidence', '--looks like a flag'),
    argvOf('--extra', 'x'), argvOf('--case', '3'), argvOf('--root'), ['--verdict'], ['unknown'],
  ];
  for (const argv of bad) {
    const r = R.parseJudgeArgs(argv);
    assert.equal(r.ok, false, JSON.stringify(argv));
    assert.ok(!String(/** @type {any} */ (r).why).includes(CANARY), 'a refusal echoed a value');
  }
});

test('AC-13 parseJudgeArgs holds the evidence limits inclusively at 10 and 2000 characters and never throws on hostile input', () => {
  const ev = (/** @type {number} */ n) => R.parseJudgeArgs(['--run-dir', 'd', '--case', '1', '--step', '1', '--verdict', 'pass', '--evidence', 'x'.repeat(n)]).ok;
  assert.equal(ev(R.JUDGE_EVIDENCE_MIN - 1), false);
  assert.equal(ev(R.JUDGE_EVIDENCE_MIN), true);
  assert.equal(ev(R.JUDGE_EVIDENCE_MAX), true);
  assert.equal(ev(R.JUDGE_EVIDENCE_MAX + 1), false);
  for (const hostile of [null, undefined, 'x', 7, {}, [null], [7], [undefined, undefined]]) {
    assert.doesNotThrow(() => R.parseJudgeArgs(hostile), JSON.stringify(hostile));
    assert.equal(R.parseJudgeArgs(hostile).ok, false);
  }
});

/** @param {number} index @param {string} result @param {Record<string, any>} [extra] */
const jstep = (index, result, extra = {}) => ({ index, action: 'judge', result, evidence: `e/c.judge-${index}.png`, kind: 'visual', scope_evidence: null, ...extra });
/** @param {any[]} judged @returns {any} */
const entryOf = (judged) => ({
  index: 1, title: 'c', risk: 'low', outcome: null, reason_code: null, reason: null, driver: 'browser', role: null,
  evidence: ['e/c.png'], steps: [{ index: 1, action: 'goto', result: 'passed', evidence: null }, { index: 2, action: 'expect_visible', result: 'passed', evidence: null }, ...judged],
  manual_steps_verbatim: '1. Open.\n2. Check.',
});

test('AC-13 settleJudgedCase: any failed judge step gives fail, even beside an uncertain and a passed one', () => {
  const r = R.settleJudgedCase(entryOf([jstep(3, 'passed'), jstep(4, 'uncertain'), jstep(5, 'failed')]), undefined);
  assert.equal(r.outcome, 'fail');
  assert.equal(r.reason_code, null);
  assert.match(String(r.reason), /^step 5: /);
  assert.ok(!String(r.reason).includes(CANARY));
});

test('AC-13 settleJudgedCase: no failed step and an uncertain one gives needs-human JUDGEMENT_UNCERTAIN, never a pass', () => {
  const r = R.settleJudgedCase(entryOf([jstep(3, 'passed'), jstep(4, 'uncertain')]), undefined);
  assert.equal(r.outcome, 'needs-human');
  assert.equal(r.reason_code, 'JUDGEMENT_UNCERTAIN');
  assert.match(String(r.reason), /^step 4: /);
  assert.ok(String(r.reason).includes(R.REASON_CATALOGUE.JUDGEMENT_UNCERTAIN.reason));
  assert.equal(R.REASON_CATALOGUE.JUDGEMENT_UNCERTAIN.class, 'gap', 'an uncertain judgment counts against the executed share');
  assert.ok(R.RUNNER_OWNED_REASON_CODES.includes('JUDGEMENT_UNCERTAIN'));
});

test('AC-13 settleJudgedCase: every judge step passed gives pass, and a plan entry with a human remainder gives PARTIAL_REMAINDER', () => {
  const pass = R.settleJudgedCase(entryOf([jstep(3, 'passed'), jstep(4, 'passed')]), undefined);
  assert.deepEqual([pass.outcome, pass.reason_code, pass.reason], ['pass', null, null]);
  const partial = R.settleJudgedCase(entryOf([jstep(3, 'passed')]), { index: 1, human_remainder: { reason: 'the rest is human' } });
  assert.equal(partial.outcome, 'needs-human');
  assert.equal(partial.reason_code, 'PARTIAL_REMAINDER');
  assert.equal(/** @type {any[]} */ (partial.steps).at(-1).action, 'human_remainder');
  // A failed or uncertain judgment is not turned into a partial remainder.
  assert.equal(R.settleJudgedCase(entryOf([jstep(3, 'failed')]), { index: 1, human_remainder: { reason: 'x' } }).outcome, 'fail');
  assert.equal(R.settleJudgedCase(entryOf([jstep(3, 'uncertain')]), { index: 1, human_remainder: { reason: 'x' } }).reason_code, 'JUDGEMENT_UNCERTAIN');
});

test('AC-13 settleJudgedCase never throws on hostile input', () => {
  for (const hostile of [null, undefined, 7, 'x', {}, { steps: 'x' }, { steps: [null, 7, {}] }]) {
    assert.doesNotThrow(() => R.settleJudgedCase(hostile, hostile), JSON.stringify(hostile));
  }
});

const RUN_REL = 'PRPs/reports/judge-demo/qa-run/20261021T000000000Z';
const STAMP = '2026-10-21T10:00:00.123Z';

/** The mid-judgment results document the unit tests and the binary tests share (five cases, four of them waiting). */
function fixtureResults() {
  const J2 = (/** @type {number} */ index) => ({ index, action: 'judge', result: PENDING, evidence: `${RUN_REL}/evidence/c.judge-${index}.png`, kind: 'visual', scope_evidence: null });
  const base = (/** @type {number} */ index, /** @type {any} */ extra) => ({
    index, title: `Case ${index}`, risk: 'low', outcome: null, reason_code: null, reason: null, driver: 'browser', role: null,
    started_at: STAMP, finished_at: STAMP, duration_ms: 1, evidence: [`${RUN_REL}/evidence/c.png`], class: 'automatable', objective_steps: 4,
    manual_steps_verbatim: '1. Open.\n2. Check.', ...extra,
  });
  const steps = (/** @type {any[]} */ ...js) => [{ index: 1, action: 'goto', result: 'passed', evidence: null }, { index: 2, action: 'expect_visible', result: 'passed', evidence: null }, ...js];
  return {
    schema_version: 1, feature: 'judge-demo', run_id: '20261021T000000000Z', started_at: STAMP, finished_at: STAMP,
    counts: { pass: 0, fail: 0, blocked: 0, 'needs-human': 1 }, record_resolved: 0, partially_executed: 0, needs_human_impossible: 0, needs_human_gap: 0,
    human_gate: { status: 'open', review_file: 'PRPs/reports/judge-demo/qa-report.md' },
    judgment: { pending_steps: 6, judged_steps: 0 },
    cases: [
      base(1, { steps: steps(J2(3), J2(4)), pending_judgment: [3, 4] }),
      base(2, { steps: steps(J2(3), J2(4)), pending_judgment: [3, 4] }),
      base(3, { steps: steps(J2(3)), pending_judgment: [3] }),
      base(4, { steps: steps(J2(3)), pending_judgment: [3] }),
      base(5, { outcome: 'needs-human', reason_code: 'STEP_UNGROUNDED', reason: 'r', steps: steps() }),
    ],
  };
}
const PLAN_ENTRY_4 = { index: 4, title: 'Case 4', driver: 'browser', human_remainder: { reason: 'the rest is human' } };
/** @param {number} c @param {number} s @param {string} v */
const req = (c, s, v) => ({ caseIndex: c, stepIndex: s, verdict: v, evidencePath: `${RUN_REL}/evidence/case-${c}.judge-${s}.verdict.json` });

test('AC-13 applyJudgeVerdict marks only the named step, keeps the case open while another step waits, and does not mutate its input', () => {
  const doc = fixtureResults();
  const before = JSON.stringify(doc);
  const r = /** @type {any} */ (R.applyJudgeVerdict(doc, undefined, req(1, 3, 'pass')));
  assert.equal(JSON.stringify(doc), before, 'the input document was mutated');
  assert.equal(r.ok, true);
  assert.equal(r.settled, false);
  const c1 = r.results.cases[0];
  assert.equal(c1.outcome, null);
  assert.deepEqual(c1.pending_judgment, [4]);
  assert.equal(c1.steps[2].result, 'passed');
  assert.equal(c1.steps[2].judged_by, 'model');
  assert.equal(c1.steps[2].judgment_evidence, `${RUN_REL}/evidence/case-1.judge-3.verdict.json`);
  assert.equal(c1.steps[3].result, PENDING, 'the other step is untouched');
  assert.equal(c1.steps[3].judged_by, undefined);
  assert.deepEqual(r.results.cases[1], doc.cases[1], 'another case is untouched');
  assert.deepEqual(r.results.counts, { pass: 0, fail: 0, blocked: 0, 'needs-human': 1 }, 'a pending case is in no count');
  assert.deepEqual(r.results.judgment, { pending_steps: 5, judged_steps: 1 });
  assert.equal(r.pendingSteps, 5);
});

test('AC-13 applyJudgeVerdict settles a case on its last verdict: pass with null manual steps, fail by precedence, uncertain, partial remainder', () => {
  /** @param {any} doc @param {any[]} calls @param {any} [plan] @returns {any} */
  const run = (doc, calls, plan) => {
    let cur = doc;
    for (const [c, s, v] of calls) {
      const r = /** @type {any} */ (R.applyJudgeVerdict(cur, c === 4 ? plan : undefined, req(c, s, v)));
      assert.equal(r.ok, true, `${c}/${s}/${v}`);
      cur = r.results;
    }
    return cur;
  };
  const doc = run(fixtureResults(), [[1, 3, 'pass'], [1, 4, 'pass'], [2, 3, 'uncertain'], [2, 4, 'fail'], [3, 3, 'uncertain'], [4, 3, 'pass']], PLAN_ENTRY_4);
  const [c1, c2, c3, c4] = doc.cases;
  assert.deepEqual([c1.outcome, c1.reason_code, c1.manual_steps_verbatim], ['pass', null, null]);
  assert.equal('pending_judgment' in c1, false, 'a settled case drops its pending list');
  assert.equal(c2.outcome, 'fail', 'fail wins over uncertain');
  assert.match(c2.reason, /^step 4: /);
  assert.deepEqual([c3.outcome, c3.reason_code], ['needs-human', 'JUDGEMENT_UNCERTAIN']);
  assert.notEqual(c3.manual_steps_verbatim, null, 'a needs-human case keeps its manual steps');
  assert.deepEqual([c4.outcome, c4.reason_code], ['needs-human', 'PARTIAL_REMAINDER'], 'a judged pass of a partial plan is not a pass');
  assert.deepEqual(doc.counts, { pass: 1, fail: 1, blocked: 0, 'needs-human': 3 });
  assert.equal(doc.partially_executed, 1);
  assert.deepEqual(doc.judgment, { pending_steps: 0, judged_steps: 6 });
  const needs = R.summarizeNeedsHuman(doc.cases);
  assert.equal(doc.needs_human_impossible, needs.needs_human_impossible);
  assert.equal(doc.needs_human_gap, needs.needs_human_gap);
  assert.deepEqual(doc.classification, JSON.parse(JSON.stringify(R.summarizeClassification(doc.cases))), 'the classification block was not recomputed');
  assert.equal(doc.cases[4].outcome, 'needs-human', 'a case that was already final is untouched');
});

test('AC-13 applyJudgeVerdict refuses a step that is not pending, an unknown case or step, and a final case, and a recorded verdict is never replaced', () => {
  const doc = fixtureResults();
  const before = JSON.stringify(doc);
  for (const [c, s] of [[1, 1], [1, 2], [1, 9], [9, 3], [5, 3], [0, 0], [1.5, 3]]) {
    const r = /** @type {any} */ (R.applyJudgeVerdict(doc, undefined, req(c, s, 'pass')));
    assert.equal(r.ok, false, `${c}/${s}`);
    assert.equal(r.code, 'JUDGE_STEP_NOT_PENDING', `${c}/${s}`);
    assert.ok(!r.reason.includes(CANARY));
  }
  assert.equal(JSON.stringify(doc), before, 'a refusal mutated the document');
  const first = /** @type {any} */ (R.applyJudgeVerdict(doc, undefined, req(1, 3, 'pass')));
  const second = /** @type {any} */ (R.applyJudgeVerdict(first.results, undefined, req(1, 3, 'fail')));
  assert.equal(second.ok, false, 'a recorded verdict was replaced');
  assert.equal(second.code, 'JUDGE_STEP_NOT_PENDING');
  assert.equal(first.results.cases[0].steps[2].result, 'passed');
  // A verdict on a settled case is refused too.
  let cur = first.results;
  cur = /** @type {any} */ (R.applyJudgeVerdict(cur, undefined, req(1, 4, 'pass'))).results;
  assert.equal(/** @type {any} */ (R.applyJudgeVerdict(cur, undefined, req(1, 4, 'fail'))).ok, false);
});

test('AC-13 applyJudgeVerdict refuses a verdict outside the three and a document it cannot read, and never throws', () => {
  const doc = fixtureResults();
  assert.equal(/** @type {any} */ (R.applyJudgeVerdict(doc, undefined, req(1, 3, 'maybe'))).code, 'JUDGE_RESULTS_UNREADABLE');
  for (const hostile of [null, undefined, 7, 'x', {}, { cases: 'x' }, { cases: [null, 7] }]) {
    const r = /** @type {any} */ (R.applyJudgeVerdict(hostile, undefined, req(1, 3, 'pass')));
    assert.equal(r.ok, false, JSON.stringify(hostile));
  }
  assert.equal(/** @type {any} */ (R.applyJudgeVerdict(doc, undefined, null)).ok, false);
});

test('AC-13 a judge-free results document keeps its shape: no judgment block and the same counts', () => {
  const free = fixtureResults();
  free.cases = [{ ...free.cases[4] }];
  delete (/** @type {any} */ (free)).judgment;
  free.counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 1 };
  assert.equal(R.summarizeJudgment(free.cases), null);
  const s = R.summarizeEntries(free.cases);
  assert.deepEqual(s.counts, free.counts);
  assert.deepEqual(Object.keys(s), ['counts', 'record_resolved', 'partially_executed']);
  assert.equal('judgment' in free, false);
});

// ---------------------------------------------------------------------------
// 4. The judge mode through the real binary on a fixture run directory (AC-13)
// ---------------------------------------------------------------------------

test('AC-13 the judge binary refuses without evidence and a non-pending step, records, never replaces, and keeps the verdict text out of results.json and the terminal', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-phase5-judge-'));
  try {
    const runDir = join(root, ...RUN_REL.split('/'));
    mkdirSync(join(runDir, 'evidence'), { recursive: true });
    const resultsPath = join(runDir, 'results.json');
    writeFileSync(resultsPath, `${JSON.stringify(fixtureResults(), null, 2)}\n`);
    writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: [PLAN_ENTRY_4] }));
    const judge = (/** @type {string[]} */ ...args) => spawnSync(NODE, [REAL_RUNNER, 'judge', '--root', root, '--run-dir', RUN_REL, ...args], { cwd: root, encoding: 'utf8', timeout: 60000, windowsHide: true });
    const results = () => JSON.parse(readFileSync(resultsPath, 'utf8'));
    const evidenceFiles = () => readdirSync(join(runDir, 'evidence'));
    const before = readFileSync(resultsPath, 'utf8');

    // Bad arguments: exit 2 with the usage, nothing written.
    for (const bad of [
      ['--case', '1', '--step', '3', '--verdict', 'pass'],
      ['--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', ''],
      ['--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', 'short'],
      ['--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', 'x'.repeat(R.JUDGE_EVIDENCE_MAX + 1)],
      ['--case', '1', '--step', '3', '--verdict', 'maybe', '--evidence', EV],
      ['--case', '0', '--step', '3', '--verdict', 'pass', '--evidence', EV],
      ['--case', '1', '--step', 'x', '--verdict', 'pass', '--evidence', EV],
      ['--case', '1', '--verdict', 'pass', '--evidence', EV],
      ['--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', EV, '--extra', 'x'],
    ]) {
      const r = judge(...bad);
      assert.equal(r.status, 2, `${JSON.stringify(bad)} -> ${r.stdout}${r.stderr}`);
      assert.ok(r.stderr.includes('Usage:'), r.stderr);
      assert.ok(!r.stderr.includes(CANARY) && !r.stdout.includes(CANARY));
    }
    const missing = judge('--case', '1', '--step', '3', '--verdict', 'pass');
    assert.ok(missing.stderr.includes('JUDGE_EVIDENCE_REQUIRED'), missing.stderr);
    assert.equal(readFileSync(resultsPath, 'utf8'), before, 'a refused verdict changed results.json');
    assert.deepEqual(evidenceFiles(), [], 'a refused verdict wrote evidence');

    // A step that is not a pending judge step, or an unknown case or step: exit 1, nothing written.
    for (const target of [['--case', '1', '--step', '1'], ['--case', '1', '--step', '9'], ['--case', '9', '--step', '3'], ['--case', '5', '--step', '3']]) {
      const r = judge(...target, '--verdict', 'pass', '--evidence', EV);
      assert.equal(r.status, 1, `${JSON.stringify(target)} ${r.stdout}${r.stderr}`);
      assert.ok(r.stderr.includes('JUDGE_STEP_NOT_PENDING'), r.stderr);
    }
    assert.equal(readFileSync(resultsPath, 'utf8'), before, 'a refused step changed results.json');
    assert.deepEqual(evidenceFiles(), [], 'a refused step wrote evidence');

    // The first verdict: recorded, the case still waits.
    const first = judge('--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', EV);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.ok(first.stdout.includes('JUDGED: case 1 step 3 verdict=pass'), first.stdout);
    assert.ok(first.stdout.includes('CASE_PENDING'), first.stdout);
    assert.ok(first.stdout.includes('RESULTS: pending 5 step(s)'), first.stdout);
    assert.ok(first.stdout.includes('HUMAN GATE STILL OPEN'), first.stdout);
    assert.ok(!first.stdout.includes(CANARY) && !first.stderr.includes(CANARY), 'the verdict text was printed');
    const r1 = results();
    assert.equal(r1.cases[0].outcome, null);
    assert.deepEqual(r1.cases[0].pending_judgment, [4]);
    assert.deepEqual(r1.judgment, { pending_steps: 5, judged_steps: 1 });
    assert.equal(r1.cases[0].steps[2].judged_by, 'model');

    // A recorded verdict is never replaced, and the refusal leaves the file byte-identical.
    const afterFirst = readFileSync(resultsPath, 'utf8');
    const again = judge('--case', '1', '--step', '3', '--verdict', 'fail', '--evidence', EV);
    assert.equal(again.status, 1, 'a recorded verdict was replaced');
    assert.ok(again.stderr.includes('JUDGE_STEP_NOT_PENDING'), again.stderr);
    assert.equal(readFileSync(resultsPath, 'utf8'), afterFirst);

    // The rest of the sequence.
    const run = (/** @type {string} */ c, /** @type {string} */ s, /** @type {string} */ v) => judge('--case', c, '--step', s, '--verdict', v, '--evidence', EV);
    const second = run('1', '4', 'pass');
    assert.equal(second.status, 0, second.stdout + second.stderr);
    assert.ok(second.stdout.includes('CASE_SETTLED: case 1 outcome=pass'), second.stdout);
    assert.equal(run('2', '3', 'uncertain').status, 0);
    assert.equal(results().cases[1].outcome, null, 'an uncertain verdict must wait for the other step');
    assert.equal(run('2', '4', 'fail').status, 0);
    assert.equal(run('3', '3', 'uncertain').status, 0);
    const last = run('4', '3', 'pass');
    assert.equal(last.status, 0, last.stdout + last.stderr);
    assert.ok(last.stdout.includes('RESULTS: final'), last.stdout);

    const raw = readFileSync(resultsPath, 'utf8');
    const done = JSON.parse(raw);
    assert.deepEqual(done.cases.map((/** @type {any} */ c) => c.outcome), ['pass', 'fail', 'needs-human', 'needs-human', 'needs-human']);
    assert.deepEqual(done.cases.map((/** @type {any} */ c) => c.reason_code), [null, null, 'JUDGEMENT_UNCERTAIN', 'PARTIAL_REMAINDER', 'STEP_UNGROUNDED']);
    assert.deepEqual(done.counts, { pass: 1, fail: 1, blocked: 0, 'needs-human': 3 });
    assert.deepEqual(done.judgment, { pending_steps: 0, judged_steps: 6 });
    assert.deepEqual(validateResults(done), [], 'the finished results are not valid under the contract');

    // The verdict text exists only in the evidence file.
    assert.ok(!raw.includes(CANARY), 'results.json carries the verdict text');
    const verdictFile = JSON.parse(readFileSync(join(runDir, 'evidence', 'case-1.judge-3.verdict.json'), 'utf8'));
    assert.equal(verdictFile.verdict, 'pass');
    assert.equal(verdictFile.case, 1);
    assert.equal(verdictFile.step, 3);
    assert.ok(String(verdictFile.evidence).includes(CANARY), 'the verdict text is missing from its evidence file');
    assert.ok(!existsSync(join(runDir, 'evidence', 'case-5.judge-3.verdict.json')));
    assert.equal(evidenceFiles().length, 6, 'one verdict file per recorded verdict and nothing else');
    assert.deepEqual(readdirSync(runDir).filter((n) => n !== '.gitignore').sort(), ['evidence', 'plan.json', 'results.json']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('AC-13 the judge binary exits 1 with a named halt on a missing results.json and 2 on a run directory outside PRPs/reports', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-phase5-judge-none-'));
  try {
    const runDir = join(root, ...RUN_REL.split('/'));
    mkdirSync(runDir, { recursive: true });
    const judge = (/** @type {string} */ dir) => spawnSync(NODE, [REAL_RUNNER, 'judge', '--root', root, '--run-dir', dir, '--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', EV], { cwd: root, encoding: 'utf8', timeout: 60000, windowsHide: true });
    const none = judge(RUN_REL);
    assert.equal(none.status, 1, none.stdout + none.stderr);
    assert.ok(none.stderr.includes('JUDGE_RESULTS_UNREADABLE'), none.stderr);
    assert.ok(!existsSync(join(runDir, 'results.json')));
    mkdirSync(join(root, 'elsewhere'), { recursive: true });
    const outside = judge('elsewhere');
    assert.equal(outside.status, 2, outside.stdout + outside.stderr);
    assert.ok(!outside.stderr.includes(CANARY) && !outside.stdout.includes(CANARY));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 5. The contract check (AC-13)
// ---------------------------------------------------------------------------

test('AC-13 the contract accepts a results document that is mid-judgment and still flags a null outcome without a pending list', () => {
  const kase = (/** @type {number} */ index, /** @type {any} */ extra) => ({
    index, title: 'c', risk: 'low', outcome: 'pass', reason_code: null, reason: null, driver: 'browser', role: null, started_at: STAMP, finished_at: STAMP, duration_ms: 1,
    evidence: ['e.png'], steps: [{ index: 1, action: 'goto', result: 'passed', evidence: null }], manual_steps_verbatim: null, ...extra,
  });
  const doc = (/** @type {any[]} */ cases, /** @type {any} */ counts) => ({ schema_version: 1, started_at: STAMP, finished_at: STAMP, counts, human_gate: { status: 'open' }, cases });
  const pending = kase(2, { outcome: null, pending_judgment: [2], steps: [{ index: 1, action: 'goto', result: 'passed', evidence: null }, { index: 2, action: 'judge', result: PENDING, evidence: 'e.png' }] });
  const counts = { pass: 1, fail: 0, blocked: 0, 'needs-human': 0 };
  assert.deepEqual(validateResults(doc([kase(1), pending], counts)), [], 'a results document that is mid-judgment must be valid');
  assert.ok(validateResults(doc([kase(1), { ...pending, pending_judgment: undefined }], counts)).some((m) => m.includes('outcome')), 'a null outcome without a pending list must be flagged');
  assert.ok(validateResults(doc([kase(1), { ...pending, pending_judgment: [] }], counts)).length > 0, 'an empty pending list must be flagged');
  const settled = doc([kase(1, { steps: [{ index: 1, action: 'judge', result: 'uncertain', evidence: 'e.png', judged_by: 'model' }, { index: 2, action: 'judge', result: 'not-judged', evidence: null }] })], counts);
  assert.deepEqual(validateResults(settled), [], 'the uncertain and not-judged step results are legal');
  const unknown = doc([kase(1, { steps: [{ index: 1, action: 'goto', result: 'maybe', evidence: null }] })], counts);
  assert.ok(validateResults(unknown).some((m) => m.includes('outside passed, failed, not-run, human')), 'an unknown step result is still flagged');
  assert.ok(validateResults(doc([kase(1), pending], { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 })).some((m) => m.includes('does not equal the sum of counts')), 'the partition rule still catches a missing count');
  assert.ok(validateResults(doc([kase(1, { outcome: 'maybe' })], counts)).length > 0, 'an outcome outside the four values is still flagged');
});

// ---------------------------------------------------------------------------
// 6. End to end through the real runner in Chromium, then the real judge binary (AC-13, AC-14, AC-5)
// ---------------------------------------------------------------------------

/** @param {string[]} args @param {string} cwd @returns {Promise<{ status: number | null, stdout: string, stderr: string }>} */
function runAsync(args, cwd) {
  return new Promise((resolveP) => {
    const child = spawn(NODE, [REAL_RUNNER, ...args], { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (status) => resolveP({ status, stdout, stderr }));
  });
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('AC-13 AC-14 AC-5 a run with judge steps stays pending until every verdict is recorded and then reaches its final outcomes (real Chromium, real judge binary)', SLOW, async () => {
  const FEATURE = 'judge-e2e';
  const RUN = `PRPs/reports/${FEATURE}/qa-run/20261021T000000000Z`;
  const page = '<!doctype html><html><body><h1>Preview ready</h1><section aria-label="Resumo"><p>Texto em portugues do painel</p></section></body></html>';
  const server = createServer((_req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(page); });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(undefined)));
  const port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
  const root = mkdtempSync(join(tmpdir(), 'relay-phase5-e2e-'));
  try {
    mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
    mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
    const runAbs = join(root, ...RUN.split('/'));
    mkdirSync(runAbs, { recursive: true });
    writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: `http://127.0.0.1:${port}`, roles: {} }));
    const SEE = { action: 'expect_visible', text: 'Preview ready' };
    const defs = [
      { title: 'Two judged steps', manual: ['1. Open the page and see Preview ready.', '2. Check that the preview looks right.', '3. Check that the Resumo panel reads in Portuguese.'], steps: [GOTO, SEE, { action: 'judge', kind: 'visual', criterion: 'the preview looks right' }, { action: 'judge', kind: 'language', criterion: 'the Resumo panel reads in Portuguese', within: { role: 'region', name: 'Resumo' } }] },
      { title: 'Criterion not in the report', manual: ['1. Open the page and see Preview ready.'], steps: [GOTO, SEE, { action: 'judge', kind: 'visual', criterion: 'the colors are pleasant' }] },
      { title: 'One uncertain step', manual: ['1. Open the page and see Preview ready.', '2. Check that the layout is balanced.'], steps: [GOTO, SEE, { action: 'judge', kind: 'checklist', criterion: 'the layout is balanced' }] },
      { title: 'One failed step', manual: ['1. Open the page and see Preview ready.', '2. Check that a chart is shown.'], steps: [GOTO, SEE, { action: 'judge', kind: 'visual', criterion: 'a chart is shown' }] },
      { title: 'Failed before the judgment', manual: ['1. Open the page and see the Absent heading.', '2. Check that the footer is blue.'], steps: [GOTO, { action: 'expect_visible', text: 'Absent heading' }, { action: 'judge', kind: 'visual', criterion: 'the footer is blue' }] },
    ];
    const block = (/** @type {number} */ n, /** @type {any} */ d) => [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
    writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
    writeFileSync(join(runAbs, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: 'none', steps: d.steps })) }));

    const run = await runAsync(['run', '--root', root, '--feature', FEATURE, '--run-dir', RUN], root);
    const resultsPath = join(runAbs, 'results.json');
    assert.ok(existsSync(resultsPath), `no results.json (the run must reach Chromium, never skip): ${run.stdout}${run.stderr}`);
    const raw0 = readFileSync(resultsPath, 'utf8');
    const doc = JSON.parse(raw0);
    const c = doc.cases;
    assert.equal(c.length, defs.length);

    // Case 1: reached the judged path for real; both steps pending; no outcome yet.
    assert.equal(c[0].outcome, null, `case 1 must have no outcome yet: ${JSON.stringify(c[0])}`);
    assert.deepEqual(c[0].pending_judgment, [3, 4]);
    assert.deepEqual(c[0].steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', PENDING, PENDING]);
    assert.notEqual(c[0].manual_steps_verbatim, null, 'a pending case keeps its manual steps');
    // AC-14: a criterion the report does not state never reaches the browser.
    assert.deepEqual([c[1].outcome, c[1].reason_code], ['needs-human', 'PLAN_ENTRY_INVALID'], JSON.stringify(c[1]));
    for (const i of [2, 3]) assert.deepEqual([c[i].outcome, c[i].pending_judgment], [null, [3]], JSON.stringify(c[i]));
    // A case that ends through another step is final at once, and its judge step is moot: never pending, never judged.
    // Vocabulary v4 (AC-5): the report names "Absent heading" and the page lacks it, so the case is a fail with cause absent, not a planning gap.
    // Vocabulary v4 (AC-6): a judge step after a failed assertion still runs (assertions continue), so it captures its evidence and is recorded not-judged.
    assert.deepEqual([c[4].outcome, c[4].reason_code, c[4].cause], ['fail', null, 'absent'], JSON.stringify(c[4]));
    assert.equal(c[4].steps[1].result, 'failed');
    assert.equal(c[4].steps[1].cause, 'absent');
    const moot = c[4].steps.find((/** @type {any} */ s) => s.action === 'judge');
    assert.equal(moot.result, 'not-judged');
    assert.equal(moot.kind, 'visual');
    assert.equal(moot.evidence, `${RUN}/evidence/case-5.judge-3.png`, 'the capture a person would look at is kept');
    assert.equal('pending_judgment' in c[4], false);
    assert.deepEqual(doc.counts, { pass: 0, fail: 1, blocked: 0, 'needs-human': 1 }, 'the pending cases are in no count');
    assert.deepEqual(doc.judgment, { pending_steps: 4, judged_steps: 0 });
    assert.deepEqual(validateResults(doc), [], 'the contract rejects the pending results');

    // The captures: a full-page PNG per judge step, plus the element PNG of the within scope (AC-5).
    const evidence = (/** @type {string} */ name) => join(runAbs, 'evidence', name);
    const header = (/** @type {string} */ name) => { assert.ok(existsSync(evidence(name)), `missing evidence file ${name}`); return readFileSync(evidence(name)); };
    for (const name of ['case-1.judge-3.png', 'case-1.judge-4.png', 'case-1.judge-4.scope.png', 'case-3.judge-3.png', 'case-4.judge-3.png', 'case-5.judge-3.png']) {
      assert.ok(header(name).subarray(0, 8).equals(PNG_MAGIC), `${name} is not a PNG`);
    }
    assert.ok(!existsSync(evidence('case-1.judge-3.scope.png')), 'a step with no scope must write no element capture');
    assert.equal(c[0].steps[3].scope_evidence, `${RUN}/evidence/case-1.judge-4.scope.png`);
    assert.equal(c[0].steps[2].scope_evidence, null);
    assert.equal(c[0].steps[3].evidence, `${RUN}/evidence/case-1.judge-4.png`);
    const full = header('case-1.judge-4.png');
    const scope = header('case-1.judge-4.scope.png');
    const area = (/** @type {Buffer} */ b) => b.readUInt32BE(16) * b.readUInt32BE(20);
    assert.ok(area(scope) > 0 && area(scope) < area(full), 'the scope capture must be an element screenshot, smaller than the page');
    assert.ok(run.stdout.includes('Pending judgment: 4 step(s)'), run.stdout);
    assert.ok(run.stdout.includes('QA run finished: pass=0 fail=1 blocked=0 needs-human=1'), run.stdout);

    // The judge mode: a refusal changes nothing, the first verdict leaves the case open.
    const judge = (/** @type {string[]} */ ...args) => runAsync(['judge', '--root', root, '--run-dir', RUN, ...args], root);
    const refused = await judge('--case', '1', '--step', '3', '--verdict', 'pass');
    assert.equal(refused.status, 2);
    assert.equal(readFileSync(resultsPath, 'utf8'), raw0, 'a refused verdict changed results.json');
    assert.equal((await judge('--case', '1', '--step', '3', '--verdict', 'pass', '--evidence', EV)).status, 0);
    assert.equal(JSON.parse(readFileSync(resultsPath, 'utf8')).cases[0].outcome, null, 'the case must wait for its second verdict');
    const second = await judge('--case', '1', '--step', '4', '--verdict', 'pass', '--evidence', EV);
    assert.equal(second.status, 0, second.stdout + second.stderr);
    assert.ok(second.stdout.includes('CASE_SETTLED: case 1 outcome=pass'), second.stdout);
    assert.equal((await judge('--case', '3', '--step', '3', '--verdict', 'uncertain', '--evidence', EV)).status, 0);
    const last = await judge('--case', '4', '--step', '3', '--verdict', 'fail', '--evidence', EV);
    assert.equal(last.status, 0, last.stdout + last.stderr);
    assert.ok(last.stdout.includes('RESULTS: final'), last.stdout);

    // Final outcomes.
    const raw = readFileSync(resultsPath, 'utf8');
    const done = JSON.parse(raw);
    assert.deepEqual(done.cases.map((/** @type {any} */ x) => x.outcome), ['pass', 'needs-human', 'needs-human', 'fail', 'fail']);
    assert.deepEqual(done.cases.map((/** @type {any} */ x) => x.reason_code), [null, 'PLAN_ENTRY_INVALID', 'JUDGEMENT_UNCERTAIN', null, null]);
    assert.deepEqual(done.counts, { pass: 1, fail: 2, blocked: 0, 'needs-human': 2 });
    assert.deepEqual(done.judgment, { pending_steps: 0, judged_steps: 4 });
    assert.ok(done.cases[0].steps.filter((/** @type {any} */ s) => s.action === 'judge').every((/** @type {any} */ s) => s.result === 'passed' && s.judged_by === 'model'));
    assert.ok(!raw.includes(CANARY) && !run.stdout.includes(CANARY) && !second.stdout.includes(CANARY) && !last.stdout.includes(CANARY), 'the verdict text leaked outside evidence/');
    assert.ok(readFileSync(evidence('case-1.judge-3.verdict.json'), 'utf8').includes(CANARY), 'the verdict text must be kept in its evidence file');
    assert.deepEqual(validateResults(done), [], 'the contract rejects the finished results');
  } finally {
    server.close();
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 7. The documents (AC-22)
// ---------------------------------------------------------------------------

const COMMAND_DOC = read('plugins/relay/commands/relay-qa-run.md');

/** @returns {{ driver: string, step: any }[]} every marked step example of the command doc, parsed */
function markedExamples() {
  return [...COMMAND_DOC.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([\s\S]*?)\n```/g)].map((m) => ({ driver: m[1], step: JSON.parse(m[2]) }));
}

test('AC-22 the command doc carries exactly one marked judge example, for the browser driver, and it validates against the script', () => {
  const judges = markedExamples().filter((e) => e.step.action === 'judge');
  assert.equal(judges.length, 1);
  assert.equal(judges[0].driver, 'browser');
  assert.equal(R.validateStep('browser', judges[0].step), null);
  assert.deepEqual(Object.keys(judges[0].step).sort(), ['action', 'criterion', 'kind'], 'the example carries no scope and no other key');
  assert.equal(R.validateSteps('browser', [GOTO, judges[0].step], []), null, 'the example counts as the expectation of its case');
  assert.equal(R.validateJudgeCriteria([judges[0].step], judges[0].step.criterion), null);
  assert.equal(R.validateStep('http', judges[0].step)?.code, 'PLAN_ENTRY_INVALID', 'the doc says the step is for browser entries only');
  for (const e of markedExamples()) assert.equal(R.validateStep(e.driver, e.step), null, JSON.stringify(e.step));
});

test('AC-22 the judge block states the kinds, the verbatim criterion rule, the scope, the pending state and the browser-only rule', () => {
  const start = COMMAND_DOC.indexOf('A literal `browser` step that hands a capture to a judge:');
  assert.ok(start >= 0, 'the judge block is missing');
  assert.equal(COMMAND_DOC.indexOf('A literal `browser` step that hands a capture to a judge:', start + 1), -1);
  const end = COMMAND_DOC.indexOf('The paragraphs that follow (the declaration schema', start);
  assert.ok(end > start, 'the judge block must come before the paragraphs that continue the planning instructions');
  const block = flat(COMMAND_DOC.slice(start, end));
  for (const token of ['`visual`', '`language`', '`checklist`', '`criterion`', 'verbatim', '`PLAN_ENTRY_INVALID`', '`within`', 'element screenshot', '`STEP_UNGROUNDED`', '`pending-judgment`', 'no outcome', 'expectation', '`browser` entries only']) {
    assert.ok(block.includes(token), `the judge block does not state ${token}`);
  }
});

test('AC-22 the judging protocol subsection sits in Phase B and states the call, the evidence rule, the uncertain rule and the settlement', () => {
  const head = COMMAND_DOC.indexOf('### Judge the pending captures');
  assert.ok(head >= 0, 'the Judge the pending captures subsection is missing');
  assert.equal(COMMAND_DOC.indexOf('### Judge the pending captures', head + 1), -1);
  assert.ok(head > COMMAND_DOC.indexOf('## Phase B'), 'the subsection belongs to Phase B');
  assert.ok(head < COMMAND_DOC.indexOf('## Final output surface'), 'the subsection must come before the final output surface');
  assert.ok(head > COMMAND_DOC.indexOf('A minted role whose login script halts'), 'the re-mint paragraph stays before the subsection');
  const section = COMMAND_DOC.slice(head, COMMAND_DOC.indexOf('\n---\n', head));
  const text = flat(section);
  for (const token of ['pending_judgment', '"outcome": null', 'Read tool', '--evidence', '10 to 2000', '`uncertain`', 'never a guess', '`JUDGEMENT_UNCERTAIN`', '`PARTIAL_REMAINDER`', '`judged_by`', '`model`', 'RESULTS: final', 'not approval', 'do not call a model from the script']) {
    assert.ok(text.includes(token), `the judging protocol does not state ${token}`);
  }
  assert.ok(/any `fail` gives `fail`, else any `uncertain` gives `needs-human`/.test(text), 'the precedence is not stated');
});

test('AC-22 the judge command line of the protocol is a call the script accepts', () => {
  const head = COMMAND_DOC.indexOf('### Judge the pending captures');
  const fence = /```bash\n([\s\S]*?)\n```/.exec(COMMAND_DOC.slice(head));
  assert.ok(fence, 'the subsection has no bash block');
  const line = flat(fence[1]).replace('${CLAUDE_PLUGIN_ROOT}', 'PLUGIN');
  assert.ok(/qa-run\.mjs" judge /.test(line), line);
  const tokens = [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => (m[1] !== undefined ? m[1] : m[2]));
  const args = tokens.slice(tokens.indexOf('judge') + 1).map((t) => t
    .replace('<RUN_DIR>', RUN_REL).replace('<n>', '1').replace('<k>', '2').replace('<what the capture shows>', 'a placeholder long enough to be evidence'));
  const parsed = R.parseJudgeArgs(args);
  assert.equal(parsed.ok, true, JSON.stringify(parsed));
  assert.equal(/** @type {any} */ (parsed).verdict, 'pass');
});

test('AC-22 the usage text lists the judge mode with its flags and keeps the ground line first', () => {
  const lines = R.USAGE.split('\n');
  const judgeLine = lines.find((l) => l.includes('qa-run.mjs judge'));
  assert.ok(judgeLine, 'the usage text has no judge line');
  for (const flag of ['--run-dir', '--case', '--step', '--verdict', '--evidence', '[--root']) assert.ok(judgeLine.includes(flag), `the judge usage line lacks ${flag}`);
  assert.ok(/pass\|fail\|uncertain/.test(judgeLine), 'the verdicts are not listed');
  assert.ok(/--prefix/.test(/** @type {string} */ (lines.find((l) => l.includes('qa-run.mjs ground')))));
  // The runner prints it for a bad call.
  const r = spawnSync(NODE, [REAL_RUNNER, 'judge'], { encoding: 'utf8', timeout: 60000, windowsHide: true });
  assert.equal(r.status, 2);
  assert.ok(r.stderr.includes('qa-run.mjs judge') && r.stderr.includes('--evidence'), r.stderr);
  // The site's usage block carries the same call.
  const scripts = read('documentation/reference/scripts.html');
  const siteLine = scripts.split('\n').find((l) => l.includes('qa-run.mjs judge'));
  assert.ok(siteLine && siteLine.includes('--evidence') && siteLine.includes('--verdict'), 'scripts.html lacks the judge usage line');
});

test('AC-22 the API reference row names every judge export and each one is a real export', () => {
  const names = ['PENDING_JUDGMENT', 'JUDGE_KINDS', 'JUDGE_VERDICTS', 'JUDGE_CRITERION_MAX', 'JUDGE_EVIDENCE_MIN', 'JUDGE_EVIDENCE_MAX', 'validateJudgeCriteria', 'isPendingResult', 'parseJudgeArgs', 'summarizeJudgment', 'settleJudgedCase', 'applyJudgeVerdict'];
  const rows = read('docs/api-reference.md').split('\n').filter((l) => l.startsWith('| `qa-run.mjs` '));
  assert.equal(rows.length, 1);
  for (const n of names) {
    assert.ok(Object.hasOwn(R, n), `${n} is not an export`);
    assert.ok(rows[0].includes(`\`${n}\``), `${n} is missing from the qa-run.mjs row`);
  }
  for (const word of ['`judge`', '`pending-judgment`', '`uncertain`', '`not-judged`', '`judgment`']) assert.ok(rows[0].includes(word), `the row does not state ${word}`);
});

test('AC-22 the site and the changelog describe the judge step and mode', () => {
  const scripts = flat(read('documentation/reference/scripts.html').replace(/<[^>]*>/g, ''));
  for (const token of ['validateJudgeCriteria', 'parseJudgeArgs', 'applyJudgeVerdict', 'settleJudgedCase', 'summarizeJudgment', 'captureElementPng']) assert.ok(scripts.includes(token), `scripts.html does not name ${token}`);
  const commands = flat(read('documentation/reference/commands.html').replace(/<[^>]*>/g, ''));
  assert.ok(/judge/.test(commands) && commands.includes('without an outcome') && commands.includes('qa-run.mjs judge'), 'commands.html does not describe the judge step');
  const changelog = flat(read('documentation/changelog.html').replace(/<[^>]*>/g, ''));
  assert.ok(changelog.includes('judge') && changelog.includes('JUDGEMENT_UNCERTAIN'), 'the changelog has no judge entry');
});
