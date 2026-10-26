// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-6 Every non-executed case carries a catalogued code
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-7 The classification is validated and reported
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the relay-qa-report.md delta of the existing four-file test)
/**
 * Phase 1 (reason-code catalogue and pre-run classification) of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-1-reason-code-catalogue-and-pre-run-classification.plan.md
 *
 * Four layers, all against the REAL runner, contract check and command doc (never edited):
 *   1. Pure functions of qa-run.mjs: the closed catalogue, the class set, the plan-entry validator, the
 *      declined-case builder, the class and objective-step readers, the classification summary, the stamp.
 *   2. The extended qa-run-contract check: tolerant results rules and the opt-in catalogue rules.
 *   3. The command doc the planner reads: one entry per case, the frozen 14-case table, the catalogue table
 *      agreeing with the script, every plan-entry illustration validating against the script.
 *   4. The real runner as a child process (async spawn, because a loopback server lives in this process):
 *      a fixture with one case per class, executed and declined cases together, an aborted run, and the
 *      proof that a declining entry starts no session.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

import {
  REASON_CATALOGUE,
  RUNNER_OWNED_REASON_CODES,
  CASE_CLASSES,
  CLASS_UNCLASSIFIED,
  OUTCOMES,
  validatePlanClassification,
  declinedCase,
  classOf,
  objectiveStepsOf,
  summarizeClassification,
  applyClassification,
  RUNTIME_REASON_CATALOGUE,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults, checkQaRunContract } from './qa-run-contract.mjs';

const REAL_SCRIPT = resolve('plugins/relay/scripts/qa-run.mjs');
const SCRIPT_TEXT = readFileSync(REAL_SCRIPT, 'utf8').replace(/\r\n/g, '\n');
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const COMMAND = readFileSync(COMMAND_FILE, 'utf8').replace(/\r\n/g, '\n');

const FEATURE = 'feat';
const RUN_ID = '20261010T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const REPORT_REL = `PRPs/reports/${FEATURE}/qa-report.md`;
const MANUAL_STEPS = ['1. Open the page.', '2. Check the result.'];
const MANUAL_STEPS_VERBATIM = MANUAL_STEPS.join('\n');
const VERBATIM_CLAUSE = 'manual steps are reproduced verbatim';

// The seven codes AC-6 names, then the four codes AC-1 of qa-runner-ai-executable-steps adds (OUTSIDE_LOCAL_ENVIRONMENT,
// HUMAN_SIGNOFF, JUDGEMENT_UNCERTAIN, ROLE_NOT_DEDICATED); the vocabulary-gap code the plan adds is listed beside them,
// and DECLINES_TO gives the outcome each code declines to.
const AC6_CODES = [
  'UNGROUNDABLE_AFTER_INTERACTION',
  'EXTERNAL_CHANNEL',
  'VISUAL_JUDGEMENT',
  'PRODUCT_DEFECT',
  'STATE_UNCONFIRMED',
  'STEP_UNGROUNDED',
  'PARTIAL_REMAINDER',
  'OUTSIDE_LOCAL_ENVIRONMENT',
  'HUMAN_SIGNOFF',
  'JUDGEMENT_UNCERTAIN',
  'ROLE_NOT_DEDICATED',
];
/** @type {Record<string, string>} */
const DECLINES_TO = {
  UNGROUNDABLE_AFTER_INTERACTION: 'needs-human',
  EXTERNAL_CHANNEL: 'needs-human',
  OUTSIDE_LOCAL_ENVIRONMENT: 'needs-human',
  HUMAN_SIGNOFF: 'needs-human',
  VISUAL_JUDGEMENT: 'needs-human',
  JUDGEMENT_UNCERTAIN: 'needs-human',
  VOCABULARY_GAP: 'needs-human',
  STEP_UNGROUNDED: 'needs-human',
  PRODUCT_DEFECT: 'blocked',
  STATE_UNCONFIRMED: 'blocked',
  ROLE_NOT_DEDICATED: 'blocked',
  PARTIAL_REMAINDER: 'needs-human',
};
// A plan entry may not declare a code the runner derives or records itself.
const RUNNER_OWNED_CODES = ['PARTIAL_REMAINDER', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED'];
const DECLARABLE_CODES = Object.keys(DECLINES_TO).filter((c) => !RUNNER_OWNED_CODES.includes(c));
const CLASSIFICATION_KEYS = [
  'automatable_driver_executed',
  'automatable_rate',
  'automatable_total',
  'driver_executed',
  'objective_steps_executed',
  'objective_steps_total',
  'objective_steps_undeclared',
  'per_class',
];

const GET_STEP = { action: 'request', method: 'GET', path: '/x', expect_status: 200 };
/** @param {Record<string, any>} [extra] */
const declining = (extra = {}) => ({ index: 1, title: 't', class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL', ...extra });
/** @param {Record<string, any>} [extra] */
const executable = (extra = {}) => ({ index: 1, title: 't', class: 'automatable', driver: 'http', role: null, state: 'none', steps: [GET_STEP], ...extra });

// ---------------------------------------------------------------------------
// AC-6: the closed catalogue
// ---------------------------------------------------------------------------

test('AC-6 the catalogue holds the seven codes the PRD names plus the vocabulary-gap code, and not the omitted-case marker, with the four codes of qa-runner-ai-executable-steps AC-1 added', () => {
  for (const code of AC6_CODES) assert.ok(Object.hasOwn(REASON_CATALOGUE, code), `${code} is missing from the catalogue`);
  assert.deepEqual(Object.keys(REASON_CATALOGUE).sort(), [...AC6_CODES, 'VOCABULARY_GAP'].sort());
  assert.equal(Object.hasOwn(REASON_CATALOGUE, 'NO_PLAN_ENTRY'), false, 'NO_PLAN_ENTRY marks a case the plan omitted; a plan cannot declare it');
});

test('AC-6 a declining entry yields needs-human or blocked with its catalogued code, no evidence and the verbatim-steps sentence', () => {
  for (const code of DECLARABLE_CODES) {
    const r = declinedCase(declining({ reason_code: code }));
    assert.ok(r, code);
    assert.equal(r.outcome, DECLINES_TO[code], code);
    assert.ok(OUTCOMES.includes(r.outcome), `${code} declined outside the four-outcome vocabulary`);
    assert.equal(r.reason_code, code);
    assert.deepEqual(r.evidence, [], code);
    assert.equal(typeof r.reason, 'string');
    assert.ok(String(r.reason).includes(VERBATIM_CLAUSE), `${code}: ${r.reason}`);
  }
});

test('AC-6 the reason a declined case carries is a fixed sentence: no title, no planner-supplied text', () => {
  const first = declinedCase(declining({ index: 1, title: 'First title', class: 'human-by-nature' }));
  const second = declinedCase(
    declining({ index: 9, title: 'A different title', class: 'blocked-by-product', reason: 'planner free text PLANNER-TEXT-7731', note: 'PLANNER-TEXT-7731' }),
  );
  assert.ok(first && second);
  assert.equal(second.reason, first.reason);
  assert.equal(String(second.reason).includes('PLANNER-TEXT-7731'), false);
  assert.equal(String(first.reason).includes('First title'), false);
});

test('AC-6 an entry that declines nothing, or declines wrongly, yields no declined case', () => {
  assert.equal(declinedCase(executable()), null, 'an executable entry is not a decline');
  assert.equal(declinedCase({ index: 1, title: 't', class: 'automatable' }), null, 'a class alone declines nothing');
  assert.equal(declinedCase(declining({ reason_code: 'NOT_A_REAL_CODE' })), null);
  assert.equal(declinedCase(declining({ steps: [GET_STEP] })), null, 'a declining entry that also carries steps is invalid, so it declines nothing');
  assert.equal(declinedCase(declining({ reason_code: 'PARTIAL_REMAINDER' })), null, 'a plan may not declare the runner-owned code');
  for (const v of [null, undefined, 'EXTERNAL_CHANNEL', 7, []]) assert.equal(declinedCase(v), null, String(v));
});

test('AC-6 a reason_code outside the closed catalogue makes the entry PLAN_ENTRY_INVALID naming it', () => {
  const outside = [
    'NOT_A_REAL_CODE',
    'NO_PLAN_ENTRY', // the planner-defect marker is not declarable
    'no_plan_entry', // case-sensitive
    'SESSION_UNAVAILABLE', // runtime halt codes stay outside the plan-facing catalogue
    'QUERY_FAILED',
    'NO_ACTIVE_DRIVER',
    'constructor', // inherited property names are not catalogue members
    'toString',
    '__proto__',
    'hasOwnProperty',
  ];
  for (const code of outside) {
    const r = validatePlanClassification(declining({ reason_code: code }));
    assert.ok(r, code);
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', code);
    assert.ok(r.reason.includes(code), `${code} not named: ${r.reason}`);
  }
  for (const bad of [7, null, {}, ['EXTERNAL_CHANNEL'], true]) {
    const r = validatePlanClassification(declining({ reason_code: bad }));
    assert.ok(r, JSON.stringify(bad));
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', JSON.stringify(bad));
  }
});

test('AC-6 every declarable catalogued code is accepted on a declining entry', () => {
  for (const code of DECLARABLE_CODES) assert.equal(validatePlanClassification(declining({ reason_code: code })), null, code);
});

test('AC-6 PARTIAL_REMAINDER is derived by the runner from human_remainder: declaring it is refused, a human_remainder entry is accepted', () => {
  assert.ok(RUNNER_OWNED_REASON_CODES.includes('PARTIAL_REMAINDER'));
  const refused = validatePlanClassification(declining({ reason_code: 'PARTIAL_REMAINDER' }));
  assert.ok(refused);
  assert.equal(refused.code, 'PLAN_ENTRY_INVALID');
  assert.ok(refused.reason.includes('PARTIAL_REMAINDER'));
  assert.match(refused.reason, /human_remainder/);
  const partial = executable({ steps: [GET_STEP, GET_STEP], objective_steps: 4, human_remainder: { reason: 'the rest is a visual judgment' } });
  assert.equal(validatePlanClassification(partial), null);
  assert.equal(declinedCase(partial), null, 'a partial entry executes; it does not decline');
});

test('AC-6 a declining entry carries no steps and no human_remainder', () => {
  for (const extra of [{ steps: [GET_STEP] }, { human_remainder: { reason: 'r' } }, { steps: [GET_STEP], human_remainder: { reason: 'r' } }]) {
    const r = validatePlanClassification(declining(extra));
    assert.ok(r, JSON.stringify(Object.keys(extra)));
    assert.equal(r.code, 'PLAN_ENTRY_INVALID');
    assert.match(r.reason, /steps|human_remainder/);
  }
  assert.equal(validatePlanClassification(declining({ steps: [] })), null, 'an empty steps array declines cleanly');
  assert.equal(validatePlanClassification(declining()), null);
});

// ---------------------------------------------------------------------------
// AC-7: the class set, the objective-step rules and the plan-entry validator
// ---------------------------------------------------------------------------

test('AC-7 the case classes are exactly the four, in the frozen table order, and unclassified is reported but never declarable', () => {
  assert.deepEqual([...CASE_CLASSES], ['automatable', 'needs-a-new-driver', 'human-by-nature', 'blocked-by-product']);
  assert.equal(CLASS_UNCLASSIFIED, 'unclassified');
  assert.equal(CASE_CLASSES.includes(CLASS_UNCLASSIFIED), false);
  const r = validatePlanClassification(declining({ class: 'unclassified' }));
  assert.ok(r);
  assert.equal(r.code, 'PLAN_ENTRY_INVALID');
});

test('AC-7 each of the four classes is accepted on a declining entry and on an executable entry', () => {
  for (const cls of CASE_CLASSES) {
    assert.equal(validatePlanClassification(declining({ class: cls })), null, `declining ${cls}`);
    assert.equal(validatePlanClassification(executable({ class: cls })), null, `executable ${cls}`);
  }
});

test('AC-7 a class outside the four makes the entry PLAN_ENTRY_INVALID naming the value', () => {
  for (const value of ['sort-of-automatable', 'Automatable', 'human_by_nature', 'unclassified']) {
    const r = validatePlanClassification(declining({ class: value }));
    assert.ok(r, value);
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', value);
    assert.ok(r.reason.includes(value), `${value} not named: ${r.reason}`);
  }
  for (const bad of ['', 7, null, true, [], {}, ['automatable']]) {
    const r = validatePlanClassification(declining({ class: bad }));
    assert.ok(r, JSON.stringify(bad));
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', JSON.stringify(bad));
  }
});

test('AC-7 an entry that carries no class, no reason_code and no objective_steps validates exactly as before', () => {
  assert.equal(validatePlanClassification({ index: 1, title: 't', driver: 'http', role: null, state: 'none', steps: [{ action: 'request' }] }), null);
  assert.equal(validatePlanClassification({ index: 2, title: 'u', driver: 'email', steps: [] }), null);
  assert.equal(validatePlanClassification({}), null);
});

test('AC-7 objective_steps is an integer from 0 to 500 and never below the number of executable steps', () => {
  for (const ok of [0, 1, 3, 500]) {
    assert.equal(validatePlanClassification(declining({ class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: ok })), null, String(ok));
  }
  for (const bad of [-1, 501, 1.5, '3', Number.NaN]) {
    const r = validatePlanClassification(declining({ objective_steps: bad }));
    assert.ok(r, String(bad));
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', String(bad));
    assert.match(r.reason, /objective_steps/);
  }
  const three = [GET_STEP, GET_STEP, GET_STEP];
  const below = validatePlanClassification(executable({ steps: three, objective_steps: 2 }));
  assert.ok(below);
  assert.equal(below.code, 'PLAN_ENTRY_INVALID');
  assert.match(below.reason, /executable step/);
  assert.equal(validatePlanClassification(executable({ steps: three, objective_steps: 3 })), null, 'the floor itself is accepted');
  assert.equal(validatePlanClassification(executable({ steps: three, objective_steps: 7 })), null, 'steps no driver step can express yet may raise the count');
});

test('AC-7 a planner value echoed in a refusal is bounded, so a long value never reaches the reason in full', () => {
  const long = 'x'.repeat(500);
  for (const field of ['class', 'reason_code']) {
    const r = validatePlanClassification(declining({ [field]: long }));
    assert.ok(r, field);
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', field);
    assert.ok(r.reason.includes('x'.repeat(16)), `${field}: the value is still named`);
    assert.equal(r.reason.includes('x'.repeat(100)), false, `${field}: the value is echoed unbounded`);
    assert.ok(r.reason.length < 400, `${field}: reason is ${r.reason.length} characters`);
  }
});

test('AC-7 the declared class is reported, and an absent, invalid or half-valid entry is reported unclassified', () => {
  for (const cls of CASE_CLASSES) assert.equal(classOf(executable({ class: cls })), cls);
  assert.equal(classOf(declining({ class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP' })), 'needs-a-new-driver');
  assert.equal(classOf({ index: 1, title: 't', driver: 'http', steps: [GET_STEP] }), 'unclassified');
  assert.equal(classOf(declining({ class: 'bogus' })), 'unclassified');
  assert.equal(classOf(declining({ reason_code: 'NOT_A_REAL_CODE' })), 'unclassified', 'a valid class on an invalid entry is not half-trusted');
  assert.equal(classOf(declining({ steps: [GET_STEP] })), 'unclassified');
  for (const v of [null, undefined, 'automatable', 3, []]) assert.equal(classOf(v), 'unclassified', String(v));
});

test('AC-7 the objective-step count is the declared integer, else the executable-step count, else null', () => {
  assert.equal(objectiveStepsOf(executable({ steps: [GET_STEP, GET_STEP, GET_STEP] })), 3);
  assert.equal(objectiveStepsOf(executable({ steps: [GET_STEP], objective_steps: 5 })), 5);
  assert.equal(objectiveStepsOf(declining({ class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 0 })), 0);
  assert.equal(objectiveStepsOf(declining({ class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 3 })), 3);
  assert.equal(objectiveStepsOf(declining({ class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP' })), null, 'a declining entry that declared none has none');
  assert.equal(objectiveStepsOf(executable({ steps: [GET_STEP, GET_STEP], objective_steps: 1 })), null, 'an invalid entry reports no count');
  for (const v of [null, undefined, 'x', 3, []]) assert.equal(objectiveStepsOf(v), null, String(v));
});

// ---------------------------------------------------------------------------
// AC-7: the classification summary
// ---------------------------------------------------------------------------

/** @param {...string} results */
const stepResults = (...results) => results.map((result) => ({ result }));

test('AC-7 the classification block counts classes, driver-executed cases, the automatable rate and the objective steps', () => {
  const entries = [
    { class: 'automatable', outcome: 'pass', reason_code: null, objective_steps: 2, steps: stepResults('passed', 'passed') },
    { class: 'automatable', outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER', objective_steps: 4, steps: stepResults('passed', 'passed', 'human') },
    { class: 'automatable', outcome: 'pass', reason_code: 'AUTOMATED_EVIDENCE', objective_steps: 1, steps: [] },
    { class: 'needs-a-new-driver', outcome: 'fail', reason_code: null, objective_steps: 3, steps: stepResults('passed', 'failed', 'not-run') },
    { class: 'needs-a-new-driver', outcome: 'needs-human', reason_code: 'VOCABULARY_GAP', objective_steps: null, steps: [] },
    { class: 'human-by-nature', outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 5, steps: [] },
    { class: 'blocked-by-product', outcome: 'blocked', reason_code: 'PRODUCT_DEFECT', objective_steps: null, steps: [] },
    { outcome: 'needs-human', reason_code: 'NO_PLAN_ENTRY', steps: [] },
  ];
  const s = summarizeClassification(entries);
  assert.deepEqual(s.per_class, { automatable: 3, 'needs-a-new-driver': 2, 'human-by-nature': 1, 'blocked-by-product': 1, unclassified: 1 });
  assert.equal(Object.values(s.per_class).reduce((a, b) => a + b, 0), entries.length, 'per_class partitions the cases');
  assert.equal(s.driver_executed, 2, 'a partially executed case and a record-resolved case are not driver-executed');
  assert.equal(s.automatable_total, 3);
  assert.equal(s.automatable_driver_executed, 1);
  assert.equal(s.automatable_rate, 0.3333);
  assert.equal(s.objective_steps_executed, 6, 'passed and failed per-step results of the first two classes; human and not-run are not executed');
  assert.equal(s.objective_steps_total, 10, 'the declared counts of the first two classes only');
  assert.equal(s.objective_steps_undeclared, 1);
});

test('AC-7 the block carries exactly the eight reported keys and the five per-class keys', () => {
  const s = summarizeClassification([]);
  assert.deepEqual(Object.keys(s).sort(), [...CLASSIFICATION_KEYS].sort());
  assert.deepEqual(Object.keys(s.per_class).sort(), [...CASE_CLASSES, 'unclassified'].sort());
});

test('AC-7 an empty automatable class reports a null rate, never 0 and never 1', () => {
  const none = summarizeClassification([]);
  assert.equal(none.automatable_rate, null);
  assert.equal(none.automatable_total, 0);
  assert.equal(none.driver_executed, 0);
  const noAutomatable = summarizeClassification([{ class: 'human-by-nature', outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', steps: [] }]);
  assert.equal(noAutomatable.automatable_rate, null);
});

test('AC-7 all three automatable cases driver-executed is a rate of 1, and one declined automatable case lowers it', () => {
  const pass = { class: 'automatable', outcome: 'pass', reason_code: null, objective_steps: 1, steps: stepResults('passed') };
  assert.equal(summarizeClassification([pass, pass, pass]).automatable_rate, 1);
  const declined = { class: 'automatable', outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 1, steps: [] };
  const s = summarizeClassification([pass, pass, declined]);
  assert.equal(s.automatable_driver_executed, 2);
  assert.equal(s.automatable_rate, 0.6667);
});

test('AC-7 a partially executed case is never counted in the driver-executed rate', () => {
  const s = summarizeClassification([
    { class: 'automatable', outcome: 'pass', reason_code: null, objective_steps: 1, steps: stepResults('passed') },
    { class: 'automatable', outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER', objective_steps: 2, steps: stepResults('passed', 'human') },
  ]);
  assert.equal(s.driver_executed, 1);
  assert.equal(s.automatable_driver_executed, 1);
  assert.equal(s.automatable_rate, 0.5);
  assert.equal(s.objective_steps_executed, 2, 'the steps of a partially executed case do count in objective-step coverage');
});

test('AC-7 a driver-executed pass in another class is counted overall but not in the automatable rate', () => {
  const s = summarizeClassification([
    { class: 'automatable', outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 1, steps: [] },
    { class: 'needs-a-new-driver', outcome: 'pass', reason_code: null, objective_steps: 1, steps: stepResults('passed') },
  ]);
  assert.equal(s.driver_executed, 1);
  assert.equal(s.automatable_driver_executed, 0);
  assert.equal(s.automatable_rate, 0);
});

test('AC-7 a case whose class is missing or unknown counts as unclassified and the input is left unmodified', () => {
  const entries = [
    { class: 'bogus', outcome: 'pass', reason_code: null, objective_steps: 1, steps: stepResults('passed') },
    { outcome: 'needs-human', reason_code: 'NO_PLAN_ENTRY', steps: [] },
  ];
  const before = JSON.parse(JSON.stringify(entries));
  const s = summarizeClassification(entries);
  assert.deepEqual(entries, before);
  assert.equal(s.per_class.unclassified, 2);
  assert.equal(s.automatable_total, 0);
  assert.equal(s.driver_executed, 1);
  assert.equal(s.objective_steps_total, 0, 'an unclassified case contributes no objective steps');
});

test('AC-7 the class and the objective-step count are stamped from the plan entry of the same title, else unclassified with null', () => {
  const plan = new Map([
    [1, executable({ index: 1, title: 'one', class: 'automatable', steps: [GET_STEP, GET_STEP] })],
    [2, declining({ index: 2, title: 'two', class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 6 })],
    [3, executable({ index: 3, title: 'a different title', class: 'automatable' })],
    [4, declining({ index: 4, title: 'four', class: 'bogus' })],
    [5, declining({ index: 5, title: 'five', class: 'human-by-nature', reason_code: 'NOT_A_REAL_CODE' })],
  ]);
  const entries = [1, 2, 3, 4, 5, 6].map((index) => ({ index, title: ['one', 'two', 'three', 'four', 'five', 'six'][index - 1] }));
  const returned = applyClassification(entries, plan);
  assert.equal(returned, entries, 'the same array is returned');
  /** @type {Record<number, any>} */
  const by = Object.fromEntries(entries.map((e) => [e.index, e]));
  assert.deepEqual([by[1].class, by[1].objective_steps], ['automatable', 2]);
  assert.deepEqual([by[2].class, by[2].objective_steps], ['needs-a-new-driver', 6]);
  assert.deepEqual([by[3].class, by[3].objective_steps], ['unclassified', null], 'a title that differs is another case, so its class is not echoed');
  assert.deepEqual([by[4].class, by[4].objective_steps], ['unclassified', null], 'an invalid class is reported, not trusted');
  assert.deepEqual([by[5].class, by[5].objective_steps], ['unclassified', null], 'an invalid entry is never half-trusted');
  assert.deepEqual([by[6].class, by[6].objective_steps], ['unclassified', null], 'a case with no plan entry');
});

// ---------------------------------------------------------------------------
// The extended qa-run-contract check
// ---------------------------------------------------------------------------

const T = '2026-10-10T10:00:00.000Z';
/** @param {Record<string, any>} [extra] */
const mkCase = (extra = {}) => ({ index: 1, title: 't', outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', started_at: T, finished_at: T, evidence: [], steps: [], ...extra });
/** @param {any[]} cases @param {Record<string, any>} [extra] */
const mkResults = (cases, extra = {}) => ({
  started_at: T,
  finished_at: T,
  human_gate: { status: 'open' },
  counts: { pass: 0, fail: 0, blocked: 0, 'needs-human': cases.length },
  cases,
  ...extra,
});
const CLASSIFIED_CASES = [mkCase({ class: 'human-by-nature', objective_steps: null }), mkCase({ index: 2, class: 'needs-a-new-driver', objective_steps: 3 })];
const CLASSIFICATION = {
  per_class: { automatable: 0, 'needs-a-new-driver': 1, 'human-by-nature': 1, 'blocked-by-product': 0, unclassified: 0 },
  driver_executed: 0,
  automatable_total: 0,
  automatable_driver_executed: 0,
  automatable_rate: null,
  objective_steps_executed: 0,
  objective_steps_total: 3,
  objective_steps_undeclared: 0,
};

test('AC-7 the contract accepts a results object whose classification block matches what its cases recompute to', () => {
  assert.deepEqual(validateResults(mkResults(CLASSIFIED_CASES, { classification: CLASSIFICATION })), []);
});

test('AC-7 the contract rejects a classification block that disagrees with its cases, naming the key', () => {
  const scalar = validateResults(mkResults(CLASSIFIED_CASES, { classification: { ...CLASSIFICATION, automatable_total: 9 } }));
  assert.ok(scalar.some((m) => m.includes('automatable_total')), JSON.stringify(scalar));
  const rate = validateResults(mkResults(CLASSIFIED_CASES, { classification: { ...CLASSIFICATION, automatable_rate: 1 } }));
  assert.ok(rate.some((m) => m.includes('automatable_rate')), JSON.stringify(rate));
  const perClass = validateResults(mkResults(CLASSIFIED_CASES, { classification: { ...CLASSIFICATION, per_class: { ...CLASSIFICATION.per_class, 'human-by-nature': 5 } } }));
  assert.ok(perClass.some((m) => m.includes('human-by-nature')), JSON.stringify(perClass));
  for (const bad of ['nope', null, [], 7]) {
    const m = validateResults(mkResults(CLASSIFIED_CASES, { classification: bad }));
    assert.ok(m.some((x) => x.includes('classification')), JSON.stringify(bad));
  }
});

test('AC-7 the contract accepts the four classes and unclassified on a case and rejects any other value', () => {
  for (const cls of [...CASE_CLASSES, 'unclassified']) assert.deepEqual(validateResults(mkResults([mkCase({ class: cls })])), [], cls);
  for (const bad of ['bogus', '', 7, null]) {
    const m = validateResults(mkResults([mkCase({ class: bad })]));
    assert.ok(m.some((x) => x.includes('class')), JSON.stringify(bad));
  }
});

test('AC-7 the contract accepts a null or non-negative integer objective_steps and rejects anything else', () => {
  for (const ok of [null, 0, 12]) assert.deepEqual(validateResults(mkResults([mkCase({ objective_steps: ok })])), [], String(ok));
  for (const bad of [-1, 1.5, '2', {}]) {
    const m = validateResults(mkResults([mkCase({ objective_steps: bad })]));
    assert.ok(m.some((x) => x.includes('objective_steps')), JSON.stringify(bad));
  }
});

/** @param {string} commandText @param {Record<string, any>} [extra] */
const docFindings = (commandText, extra = {}) =>
  checkQaRunContract({ scriptText: null, commandText, results: [], ...extra }).findings.filter((f) => f.file.endsWith('relay-qa-run.md'));
const BASE_DOC = 'HUMAN GATE STILL OPEN FAILED_NON_LOCAL_TARGET qa-run.mjs';
const MARKER = '<!-- qa-plan-entry-example -->';
/** @param {string} json */
const planExample = (json) => `\n${MARKER}\n\`\`\`json\n${json}\n\`\`\`\n`;

test('AC-6 with the catalogue required, a doc that names no catalogued code and no class is flagged once per token', () => {
  const f = docFindings(BASE_DOC, { requireCatalogue: true });
  for (const code of Object.keys(REASON_CATALOGUE)) {
    assert.equal(f.filter((x) => x.message.includes(code)).length, 1, `${code} must be flagged exactly once`);
  }
  for (const cls of CASE_CLASSES) {
    assert.equal(f.filter((x) => x.message.includes(cls)).length, 1, `${cls} must be flagged exactly once`);
  }
});

test('AC-6 a marked plan-entry example that the runner would refuse is flagged naming the refused value; a missing or unparseable one is flagged too', () => {
  const refused = docFindings(`${BASE_DOC}${planExample('{ "index": 1, "title": "t", "reason_code": "NOT_A_REAL_CODE" }')}`, { requireCatalogue: true });
  assert.ok(refused.some((x) => x.message.includes('NOT_A_REAL_CODE')), JSON.stringify(refused));
  const unparseable = docFindings(`${BASE_DOC}${planExample('{ not json')}`, { requireCatalogue: true });
  assert.ok(unparseable.some((x) => /not valid JSON/.test(x.message)), JSON.stringify(unparseable));
  const missing = docFindings(BASE_DOC, { requireCatalogue: true });
  assert.ok(missing.some((x) => /plan-entry example/.test(x.message)), JSON.stringify(missing));
  const valid = docFindings(`${BASE_DOC}${planExample('{ "index": 1, "title": "t", "class": "human-by-nature", "reason_code": "EXTERNAL_CHANNEL" }')}`, { requireCatalogue: true });
  assert.equal(valid.some((x) => /plan-entry example/.test(x.message)), false, JSON.stringify(valid));
});

test('AC-6 the catalogue rules fire only for a caller that opts in', () => {
  assert.deepEqual(docFindings(BASE_DOC), []);
  assert.deepEqual(docFindings(`${BASE_DOC}${planExample('{ "index": 1, "title": "t", "reason_code": "NOT_A_REAL_CODE" }')}`), []);
});

test('AC-6 the runner source that defines the catalogue or the classes a second time is flagged', () => {
  const twiceCatalogue = checkQaRunContract({ scriptText: `${SCRIPT_TEXT}\nexport const REASON_CATALOGUE = {};\n`, commandText: null, results: [], requireCatalogue: true });
  assert.equal(twiceCatalogue.findings.filter((f) => f.message.includes('export const REASON_CATALOGUE')).length, 1);
  const twiceClasses = checkQaRunContract({ scriptText: `${SCRIPT_TEXT}\nexport const CASE_CLASSES = [];\n`, commandText: null, results: [], requireCatalogue: true });
  assert.equal(twiceClasses.findings.filter((f) => f.message.includes('export const CASE_CLASSES')).length, 1);
  const once = checkQaRunContract({ scriptText: SCRIPT_TEXT, commandText: null, results: [], requireCatalogue: true });
  assert.equal(once.findings.some((f) => f.message.includes('exactly once')), false, JSON.stringify(once.findings));
});

test('AC-6 the real runner and the real command doc satisfy the catalogue contract, with LF and with CRLF line endings', () => {
  const lf = checkQaRunContract({ scriptText: SCRIPT_TEXT, commandText: COMMAND, results: [], requireStepExamples: true, requireCatalogue: true });
  assert.deepEqual(lf.findings, []);
  const crlf = checkQaRunContract({ scriptText: SCRIPT_TEXT, commandText: COMMAND.replace(/\n/g, '\r\n'), results: [], requireStepExamples: true, requireCatalogue: true });
  assert.deepEqual(crlf.findings, []);
});

// ---------------------------------------------------------------------------
// The command doc the planner reads
// ---------------------------------------------------------------------------

/** @param {string} text */
const collapse = (text) => text.replace(/\s+/g, ' ');

test('AC-6 the command doc instructs one plan entry per case and no longer tells the planner to omit the cases it cannot map', () => {
  const flat = collapse(COMMAND);
  assert.match(flat, /exactly one (plan )?entry (per case|for every returned case)/);
  assert.match(flat, /never omit a case/);
  assert.equal(/Write ONLY the cases/.test(COMMAND), false);
  assert.equal(/^- Omit any case/m.test(COMMAND), false);
  assert.equal(/omit the case/i.test(COMMAND), false);
  assert.ok(flat.includes('NO_PLAN_ENTRY') && flat.includes('planner defect'), 'an omitted case is documented as a planner defect');
});

test('AC-7 the command doc records the frozen classification of the 14 reachable cases, each case in its frozen class', () => {
  /** @type {Record<string, { count: number, cases: string[] }>} */
  const frozen = {
    automatable: { count: 3, cases: ['`praesto-sum` 23', 'T-1', 'A-1'] },
    'needs-a-new-driver': { count: 7, cases: ['A-2', 'S-2', 'S-1', 'S-4', 'T-2', '`praesto-sum` 20', 'S-6'] },
    'human-by-nature': { count: 3, cases: ['T-3', 'S-3', 'S-5'] },
    'blocked-by-product': { count: 1, cases: ['X-1'] },
  };
  /** @type {Record<string, string>} */
  const rows = {};
  for (const cls of CASE_CLASSES) {
    const m = new RegExp(`^\\| \`${cls}\` \\((\\d+)\\) \\|([^|]*)\\|`, 'm').exec(COMMAND);
    assert.ok(m, `no frozen-table row for ${cls}`);
    assert.equal(Number(m[1]), frozen[cls].count, `${cls} count`);
    rows[cls] = m[2];
  }
  let total = 0;
  for (const cls of CASE_CLASSES) {
    assert.equal(frozen[cls].cases.length, frozen[cls].count);
    total += frozen[cls].count;
    for (const id of frozen[cls].cases) {
      assert.ok(rows[cls].includes(id), `${id} is not in the ${cls} row`);
      for (const other of CASE_CLASSES.filter((c) => c !== cls)) assert.equal(rows[other].includes(id), false, `${id} appears in the ${other} row too`);
    }
  }
  assert.equal(total, 14);
  assert.match(collapse(COMMAND), /cases 21 and 22 of `praesto-sum` stay outside the 14/);
});

test('AC-6 the catalogue table in the command doc agrees with the script: same codes, same outcome for each', () => {
  /** @type {Record<string, string>} */
  const documented = {};
  // The catalogue table is the one whose third cell is a backticked reason class; the run-time table that follows it
  // has a different header and a plain-text Kind cell, so its rows are not catalogue rows.
  for (const m of COMMAND.matchAll(/^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| `(impossible|gap)` \|/gm)) documented[m[1]] = m[2];
  assert.deepEqual(Object.keys(documented).sort(), Object.keys(REASON_CATALOGUE).sort());
  for (const [code, outcome] of Object.entries(DECLINES_TO)) assert.equal(documented[code], outcome, `${code} is documented with another outcome than the script gives it`);
  assert.equal(Object.hasOwn(documented, 'NO_PLAN_ENTRY'), false);
  for (const code of ['STEP_NOT_PERFORMABLE', 'PLAN_ENTRY_INVALID', 'OVERLAY_HANDLER_INVALID']) {
    assert.equal(Object.hasOwn(documented, code), false, `${code} is a run-time code and must stay out of the catalogue table`);
  }
});

test('AC-6 the run-time codes table in the command doc lists exactly the runner run-time codes plus OVERLAY_HANDLER_INVALID, each with the runner outcome', () => {
  const start = COMMAND.indexOf('| Code | Outcome | Kind | Meaning |');
  assert.ok(start >= 0, 'the run-time codes table header is missing');
  assert.equal(COMMAND.indexOf('| Code | Outcome | Kind | Meaning |', start + 1), -1, 'the run-time table header appears more than once');
  const lines = COMMAND.slice(start).split('\n');
  /** @type {Record<string, string>} */
  const documented = {};
  for (const line of lines.slice(2)) {
    if (!line.startsWith('|')) break;
    const m = /^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| ([^`|][^|]*) \|/.exec(line);
    assert.ok(m, `a run-time table row is malformed (the Kind cell must be plain text): ${line.slice(0, 80)}`);
    documented[/** @type {RegExpExecArray} */ (m)[1]] = /** @type {RegExpExecArray} */ (m)[2];
  }
  const expected = Object.fromEntries([
    ...Object.entries(RUNTIME_REASON_CATALOGUE).map(([code, spec]) => [code, spec.disposition]),
    ['OVERLAY_HANDLER_INVALID', 'blocked'],
  ]);
  assert.deepEqual(documented, expected);
  for (const code of Object.keys(documented)) assert.equal(Object.hasOwn(REASON_CATALOGUE, code), false, `${code} must stay outside the closed catalogue`);
});

test('AC-7 every plan-entry illustration in the command doc validates, and the declining ones decline as their catalogued outcome', () => {
  /** @type {any[]} */ const entries = [];
  for (const m of COMMAND.matchAll(/```json\n([\s\S]*?)\n```/g)) {
    /** @type {any} */ let parsed;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.cases)) entries.push(...parsed.cases);
    else if (parsed !== null && typeof parsed === 'object' && ('class' in parsed || 'reason_code' in parsed)) entries.push(parsed);
  }
  assert.ok(entries.length >= 4, `expected the plan skeleton, a declining example and two marked examples, found ${entries.length}`);
  for (const e of entries) {
    assert.equal(validatePlanClassification(e), null, JSON.stringify(e));
    assert.ok(CASE_CLASSES.includes(e.class), `an illustration without a valid class: ${JSON.stringify(e)}`);
    if (e.reason_code !== undefined) {
      const d = declinedCase(e);
      assert.ok(d, JSON.stringify(e));
      assert.equal(d.outcome, DECLINES_TO[e.reason_code]);
    }
  }
  assert.ok(entries.some((e) => e.reason_code !== undefined), 'a declining illustration');
  assert.ok(entries.some((e) => e.human_remainder !== undefined && e.objective_steps !== undefined && declinedCase(e) === null), 'an executable partial illustration carrying class, objective_steps and human_remainder');
});

test('AC-7 the command doc names every key of the classification block and the unclassified marker', () => {
  for (const key of Object.keys(summarizeClassification([]))) assert.ok(COMMAND.includes(`\`${key}\``), `the doc never names \`${key}\``);
  assert.ok(COMMAND.includes('`unclassified`'));
  assert.ok(COMMAND.includes('`objective_steps`'));
});

// ---------------------------------------------------------------------------
// AC-14: the surface the existing four-file frozen test does not cover
// ---------------------------------------------------------------------------

test('AC-14 the QA report command relay-qa-report.md is byte-identical to HEAD', () => {
  const file = 'plugins/relay/commands/relay-qa-report.md';
  assert.ok(existsSync(resolve(file)), `${file} is missing`);
  const r = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', file], { cwd: resolve('.'), encoding: 'utf8' });
  assert.equal(r.status, 0, `${file} differs from HEAD (git exit ${r.status}): ${r.stdout}${r.stderr}`);
});

// ---------------------------------------------------------------------------
// The real runner as a child process
// ---------------------------------------------------------------------------

/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
/** @type {string[]} */
const temps = [];

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    if (path === '/ok') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else if (path === '/boom') {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('boom');
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('nf');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [REAL_SCRIPT, ...args], { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stdout, stderr });
    });
  });
}

/** @param {string[]} titles @returns {string} */
function reportText(titles) {
  const blocks = titles.map((title, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${title}`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      ...MANUAL_STEPS,
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/**
 * @param {{ titles: string[], plan: any[], baseUrl?: string | null, roles?: Record<string, any>, files?: Record<string, string>, requiredState?: string }} o
 */
function makeFixture(o) {
  const root = mkdtempSync(join(tmpdir(), 'relay-qaclass-'));
  temps.push(root);
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(runDirAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  let report = reportText(o.titles);
  if (o.requiredState !== undefined) report = report.split('**Required state:** None').join(`**Required state:** ${o.requiredState}`);
  writeFileSync(join(root, ...REPORT_REL.split('/')), report);
  const cfg = { ...(o.baseUrl === null ? {} : { baseUrl: o.baseUrl ?? baseUrl }), roles: o.roles ?? {} };
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify(cfg));
  writeFileSync(join(runDirAbs, 'plan.json'), JSON.stringify({ schema_version: 1, cases: o.plan }));
  for (const [rel, text] of Object.entries(o.files ?? {})) {
    mkdirSync(join(root, ...rel.split('/').slice(0, -1)), { recursive: true });
    writeFileSync(join(root, ...rel.split('/')), text);
  }
  return { root, runDirAbs };
}

/**
 * @param {{ root: string, runDirAbs: string }} fx
 * @param {string[]} [extraArgs]
 */
async function runRun(fx, extraArgs = []) {
  const proc = await runScript(['run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL, ...extraArgs], fx.root);
  const resultsPath = join(fx.runDirAbs, 'results.json');
  /** @type {any} */ const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')) : null;
  return { ...proc, results };
}

/** @param {string} dir @returns {string[]} every file under dir, relative, forward slashes, sorted */
function listFiles(dir) {
  /** @type {string[]} */ const out = [];
  /** @param {string} d */
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

/** @param {any} results @returns {Record<number, any>} */
const byIndex = (results) => Object.fromEntries(results.cases.map((/** @type {any} */ c) => [c.index, c]));

/** @param {string} path @param {Record<string, any>} [extra] */
const get = (path, extra = {}) => ({ action: 'request', method: 'GET', path, ...extra });
const OK_STEP = get('/ok', { expect_status: 200, expect_json: { path: 'ok', equals: true } });

test('AC-6 AC-7 one case per class: declined cases carry their code and verbatim steps, invalid entries are refused naming the value, an omitted case is a planner defect', async () => {
  const titles = [
    'Inbox check',
    'Broken page',
    'Needs a new step',
    'Static example',
    'Invalid code',
    'Invalid class',
    'Omitted case',
    'Planner owned partial',
    'Title drift',
    'Declined with steps',
  ];
  const fx = makeFixture({
    titles,
    baseUrl: null, // no target is declared: a declining entry must never need one
    plan: [
      { index: 1, title: titles[0], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL', reason: 'PLANNER-NOTE-9f3a', note: 'PLANNER-NOTE-9f3a' },
      { index: 2, title: titles[1], class: 'blocked-by-product', reason_code: 'PRODUCT_DEFECT' },
      { index: 3, title: titles[2], class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 3 },
      { index: 4, title: titles[3], class: 'automatable', driver: 'http', role: null, state: 'none', steps: [{ action: 'request', method: 'GET', path: '/x' }] },
      { index: 5, title: titles[4], class: 'human-by-nature', reason_code: 'NOT_A_REAL_CODE' },
      { index: 6, title: titles[5], class: 'sort-of-automatable', reason_code: 'EXTERNAL_CHANNEL' },
      { index: 8, title: titles[7], class: 'needs-a-new-driver', reason_code: 'PARTIAL_REMAINDER' },
      { index: 9, title: 'A title the report does not carry', class: 'automatable', driver: 'http', role: null, state: 'none', steps: [GET_STEP] },
      { index: 10, title: titles[9], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL', steps: [GET_STEP] },
    ],
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  const res = r.results;
  assert.ok(res, 'results.json was written');
  assert.equal(res.cases.length, titles.length, 'N cases in, N entries out');
  const by = byIndex(res);

  /** @type {Record<number, Record<string, any>>} */
  const want = {
    1: { outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', class: 'human-by-nature', objective_steps: null },
    2: { outcome: 'blocked', reason_code: 'PRODUCT_DEFECT', class: 'blocked-by-product', objective_steps: null },
    3: { outcome: 'needs-human', reason_code: 'VOCABULARY_GAP', class: 'needs-a-new-driver', objective_steps: 3 },
    4: { outcome: 'needs-human', reason_code: 'NO_EXPECTATION', class: 'automatable', objective_steps: 1 },
    5: { outcome: 'needs-human', reason_code: 'PLAN_ENTRY_INVALID', class: 'unclassified', objective_steps: null },
    6: { outcome: 'needs-human', reason_code: 'PLAN_ENTRY_INVALID', class: 'unclassified', objective_steps: null },
    7: { outcome: 'needs-human', reason_code: 'NO_PLAN_ENTRY', class: 'unclassified', objective_steps: null },
    8: { outcome: 'needs-human', reason_code: 'PLAN_ENTRY_INVALID', class: 'unclassified', objective_steps: null },
    9: { outcome: 'needs-human', reason_code: 'PLAN_ENTRY_INVALID', class: 'unclassified', objective_steps: null },
    10: { outcome: 'needs-human', reason_code: 'PLAN_ENTRY_INVALID', class: 'unclassified', objective_steps: null },
  };
  for (const [index, fields] of Object.entries(want)) {
    for (const [key, value] of Object.entries(fields)) assert.equal(by[Number(index)][key], value, `case ${index} ${key}`);
  }

  // AC-6: the refusal names the value it refused; the omitted case keeps the planner-defect marker.
  assert.ok(String(by[5].reason).includes('NOT_A_REAL_CODE'), by[5].reason);
  assert.ok(String(by[6].reason).includes('sort-of-automatable'), by[6].reason);
  assert.ok(String(by[8].reason).includes('PARTIAL_REMAINDER'), by[8].reason);
  assert.match(String(by[10].reason), /steps|human_remainder/);

  // AC-6: every case that was not executed reproduces the manual steps verbatim.
  for (const i of [1, 2, 3, 5, 6, 7, 8, 9, 10]) assert.equal(by[i].manual_steps_verbatim, MANUAL_STEPS_VERBATIM, `case ${i}`);
  for (const i of [1, 2, 3]) {
    assert.ok(String(by[i].reason).includes(VERBATIM_CLAUSE), `case ${i}: ${by[i].reason}`);
    assert.deepEqual(by[i].evidence, [], `case ${i}`);
    assert.deepEqual(by[i].steps, [], `case ${i}`);
  }

  // AC-7: the four-key partition is unchanged and the classification block is the correct per-class summary.
  assert.deepEqual(res.counts, { pass: 0, fail: 0, blocked: 1, 'needs-human': 9 });
  assert.deepEqual(res.classification, {
    per_class: { automatable: 1, 'needs-a-new-driver': 1, 'human-by-nature': 1, 'blocked-by-product': 1, unclassified: 6 },
    driver_executed: 0,
    automatable_total: 1,
    automatable_driver_executed: 0,
    automatable_rate: 0,
    objective_steps_executed: 0,
    objective_steps_total: 4,
    objective_steps_undeclared: 0,
  });
  assert.equal(res.partially_executed, 0, 'a planner declaring PARTIAL_REMAINDER ran nothing and must not inflate the counter');
  assert.deepEqual(validateResults(res), [], 'the run satisfies the results contract');

  // The summary lines on stdout keep their pinned form and name each cause.
  assert.ok(r.stdout.includes('QA run finished: pass=0 fail=0 blocked=1 needs-human=9\n'), r.stdout);
  assert.ok(r.stdout.includes('case 1: needs-human (EXTERNAL_CHANNEL)'));
  assert.ok(r.stdout.includes('case 2: blocked (PRODUCT_DEFECT)'));
  assert.ok(r.stdout.includes('case 7: needs-human (NO_PLAN_ENTRY)'));

  // No planner-supplied free text, and no side effect other than results.json (the report is untouched).
  assert.deepEqual(listFiles(fx.runDirAbs), ['plan.json', 'results.json']);
  assert.equal(readFileSync(join(fx.runDirAbs, 'results.json'), 'utf8').includes('PLANNER-NOTE-9f3a'), false);
  assert.equal(res.report_sha256_after, res.report_sha256_before);
});

test('AC-6 AC-7 executed and declined cases together: the rate, the driver-executed count and the objective steps come from the per-step results', async () => {
  const titles = ['Health returns ok', 'Partial health', 'Failing health', 'Inbox', 'Known defect', 'Another gap', 'Omitted'];
  const fx = makeFixture({
    titles,
    plan: [
      { index: 1, title: titles[0], class: 'automatable', driver: 'http', role: null, state: 'none', steps: [OK_STEP] },
      {
        index: 2,
        title: titles[1],
        class: 'automatable',
        driver: 'http',
        role: null,
        state: 'none',
        objective_steps: 4,
        steps: [get('/ok', { expect_status: 200 }), get('/ok', { expect_json: { path: 'ok', equals: true } })],
        human_remainder: { reason: 'the last two steps are a visual judgment' },
      },
      { index: 3, title: titles[2], class: 'needs-a-new-driver', driver: 'http', role: null, state: 'none', objective_steps: 2, steps: [get('/boom', { expect_status: 200 })] },
      { index: 4, title: titles[3], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL' },
      { index: 5, title: titles[4], class: 'blocked-by-product', reason_code: 'PRODUCT_DEFECT' },
      { index: 6, title: titles[5], class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 3 },
    ],
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  const res = r.results;
  assert.ok(res);
  const by = byIndex(res);

  assert.deepEqual([by[1].outcome, by[1].reason_code, by[1].class, by[1].objective_steps], ['pass', null, 'automatable', 1]);
  assert.deepEqual([by[2].outcome, by[2].reason_code, by[2].class, by[2].objective_steps], ['needs-human', 'PARTIAL_REMAINDER', 'automatable', 4]);
  assert.deepEqual([by[3].outcome, by[3].reason_code, by[3].class, by[3].objective_steps], ['fail', null, 'needs-a-new-driver', 2]);
  assert.deepEqual([by[4].outcome, by[4].reason_code, by[4].class], ['needs-human', 'EXTERNAL_CHANNEL', 'human-by-nature']);
  assert.deepEqual([by[5].outcome, by[5].reason_code, by[5].class], ['blocked', 'PRODUCT_DEFECT', 'blocked-by-product']);
  assert.deepEqual([by[6].outcome, by[6].reason_code, by[6].class, by[6].objective_steps], ['needs-human', 'VOCABULARY_GAP', 'needs-a-new-driver', 3]);
  assert.deepEqual([by[7].outcome, by[7].reason_code, by[7].class], ['needs-human', 'NO_PLAN_ENTRY', 'unclassified']);

  assert.deepEqual(res.counts, { pass: 1, fail: 1, blocked: 1, 'needs-human': 4 });
  assert.equal(res.partially_executed, 1);
  assert.deepEqual(res.classification, {
    per_class: { automatable: 2, 'needs-a-new-driver': 2, 'human-by-nature': 1, 'blocked-by-product': 1, unclassified: 1 },
    driver_executed: 2,
    automatable_total: 2,
    automatable_driver_executed: 1,
    automatable_rate: 0.5,
    objective_steps_executed: 4,
    objective_steps_total: 10,
    objective_steps_undeclared: 0,
  });

  // Every results entry carries a class from the closed set and a null or non-negative objective-step count.
  for (const c of res.cases) {
    assert.ok([...CASE_CLASSES, 'unclassified'].includes(c.class), `case ${c.index}: ${c.class}`);
    assert.ok(c.objective_steps === null || (Number.isInteger(c.objective_steps) && c.objective_steps >= 0), `case ${c.index}`);
  }
  assert.deepEqual(validateResults(res), []);

  // A declined case wrote no evidence file.
  const evidenceFiles = listFiles(fx.runDirAbs).filter((f) => f.startsWith('evidence/'));
  for (const i of [4, 5, 6, 7]) assert.equal(evidenceFiles.some((f) => f.includes(`case-${i}.`)), false, `case ${i} wrote evidence`);

  assert.ok(r.stdout.includes('QA run finished: pass=1 fail=1 blocked=1 needs-human=4\n'), r.stdout);
  assert.ok(r.stdout.includes('Partially executed (not in the driver-executed rate): partially-executed=1'));
  assert.ok(r.stdout.includes('case 2: needs-human (PARTIAL_REMAINDER)'));
  assert.ok(r.stdout.includes('case 6: needs-human (VOCABULARY_GAP)'));
});

test('AC-7 an aborted run still reports a class for every case, the padded ones included, and the unexecuted automatable case stays in the denominator', async () => {
  const titles = ['First health', 'Second health', 'Inbox'];
  const fx = makeFixture({
    titles,
    plan: [
      { index: 1, title: titles[0], class: 'automatable', driver: 'http', role: null, state: 'none', steps: [OK_STEP] },
      { index: 2, title: titles[1], class: 'automatable', driver: 'http', role: null, state: 'none', steps: [OK_STEP] },
      { index: 3, title: titles[2], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL' },
    ],
  });
  const r = await runRun(fx, ['--max-cases', '1']);
  assert.equal(r.code, 1, 'an aborted run exits non-zero');
  const res = r.results;
  assert.ok(res, 'results are still written for an aborted run');
  const by = byIndex(res);
  assert.equal(by[1].outcome, 'pass');
  for (const i of [2, 3]) {
    assert.equal(by[i].outcome, 'blocked', `case ${i}`);
    assert.equal(by[i].reason_code, 'RUN_ABORTED', `case ${i}`);
  }
  assert.deepEqual([by[1].class, by[2].class, by[3].class], ['automatable', 'automatable', 'human-by-nature']);
  assert.equal(res.classification.automatable_total, 2);
  assert.equal(res.classification.automatable_driver_executed, 1);
  assert.equal(res.classification.automatable_rate, 0.5);
  assert.equal(res.classification.per_class.unclassified, 0);
  assert.deepEqual(validateResults(res), []);
});

test('AC-6 a declining entry starts no session: the login script of its role never runs, while the same role on an executable entry does run it', async () => {
  const title = 'Admin only inbox check';
  const loginScript = [
    "import { writeFileSync, mkdirSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "const root = process.argv[process.argv.indexOf('--root') + 1];",
    "writeFileSync(join(root, 'login-ran.marker'), 'ran');",
    "mkdirSync(join(root, 'PRPs', 'auth', '.sessions'), { recursive: true });",
    "writeFileSync(join(root, 'PRPs', 'auth', '.sessions', 'admin.json'), JSON.stringify({ cookies: [], origins: [] }));",
    '',
  ].join('\n');
  const common = { titles: [title], roles: { admin: {} }, files: { 'PRPs/auth/login-admin.mjs': loginScript }, requiredState: 'A logged-in admin' };

  const declinedFx = makeFixture({
    ...common,
    plan: [{ index: 1, title, class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL', driver: 'http', role: 'admin', state: 'role-only' }],
  });
  const declined = await runRun(declinedFx);
  assert.equal(declined.code, 0, declined.stderr);
  assert.equal(declined.results.cases[0].outcome, 'needs-human');
  assert.equal(declined.results.cases[0].reason_code, 'EXTERNAL_CHANNEL');
  assert.equal(existsSync(join(declinedFx.root, 'login-ran.marker')), false, 'the login script ran for a declined case');
  assert.equal(existsSync(join(declinedFx.root, 'PRPs', 'auth', '.sessions', 'admin.json')), false, 'a session was minted for a declined case');

  const executedFx = makeFixture({
    ...common,
    plan: [{ index: 1, title, class: 'automatable', driver: 'http', role: 'admin', state: 'role-only', steps: [OK_STEP] }],
  });
  const executed = await runRun(executedFx);
  assert.equal(executed.code, 0, executed.stderr);
  assert.equal(executed.results.cases[0].outcome, 'pass', 'control: the same role on an executable entry runs the case');
  assert.equal(existsSync(join(executedFx.root, 'login-ran.marker')), true, 'control: the marker proves the login script is observable');
});
