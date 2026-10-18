// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-7 The classification is validated and reported (an invalid class, reason_code or objective_steps is PLAN_ENTRY_INVALID, never a thrown error; N cases in, N entries out)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-6 Every non-executed case carries a catalogued code (a code outside the catalogue makes the entry PLAN_ENTRY_INVALID)
/**
 * Phase 2 carry-over (KD-1) of qa-runner-grounding-vocabulary-v2: the plan-entry validator is total.
 *
 * Phase 1 shipped the classification validator and left one robustness edge out of its suite, because the
 * bounded echo of a planner-supplied value threw a TypeError for a JSON value such as `{"toString":1}`
 * (an object whose own `toString` is not callable). Phase 2 fixed it in the runner, so the edge is now an
 * observable contract: such a value is refused as PLAN_ENTRY_INVALID by every reader of the validator, and
 * a full run over a plan that carries it still writes `results.json` with one entry per case.
 *
 * Two layers, both against the REAL runner (never edited):
 *   1. The pure readers: validatePlanClassification, classOf, objectiveStepsOf, declinedCase and
 *      applyClassification, over values built with JSON.parse (the only way a plan.json can carry them).
 *   2. The real runner as a child process: a four-case plan whose first three entries each carry such a
 *      value in a different field, beside a control entry that must be unaffected.
 *
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-2-stable-grounding-and-text-candidates.plan.md
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import {
  validatePlanClassification,
  declinedCase,
  classOf,
  objectiveStepsOf,
  applyClassification,
  CLASS_UNCLASSIFIED,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const REAL_SCRIPT = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'feat';
const RUN_ID = '20261010T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;

/**
 * Values a plan.json can carry whose coercion to a string throws: the object has an own `toString` that is
 * not callable and no callable `valueOf` that returns a primitive. Built with JSON.parse on purpose.
 * @type {[string, any][]}
 */
const HOSTILE = [
  ['an object whose toString is a number', JSON.parse('{"toString":1}')],
  ['an object whose toString and valueOf are numbers', JSON.parse('{"toString":1,"valueOf":1}')],
  ['an object whose toString is null', JSON.parse('{"toString":null}')],
  ['an object whose toString is a string', JSON.parse('{"toString":"x"}')],
  ['an object whose toString is an object', JSON.parse('{"toString":{"toString":1}}')],
  ['an array holding such an object', JSON.parse('[{"toString":1}]')],
];

const GET_STEP = { action: 'request', method: 'GET', path: '/x', expect_status: 200 };

/**
 * The three plan-entry fields the validator echoes, each as a plan entry that is valid in every other respect.
 * @type {Record<string, (value: any) => Record<string, any>>}
 */
const ENTRY_WITH = {
  class: (value) => ({ index: 1, title: 't', class: value, reason_code: 'EXTERNAL_CHANNEL' }),
  reason_code: (value) => ({ index: 1, title: 't', class: 'human-by-nature', reason_code: value }),
  objective_steps: (value) => ({ index: 1, title: 't', class: 'automatable', driver: 'http', role: null, state: 'none', steps: [GET_STEP], objective_steps: value }),
};

// ---------------------------------------------------------------------------
// The pure readers never throw on a hostile value and refuse it as PLAN_ENTRY_INVALID
// ---------------------------------------------------------------------------

test('AC-7 validatePlanClassification refuses a hostile class, reason_code or objective_steps as PLAN_ENTRY_INVALID instead of throwing, naming the field', () => {
  for (const [field, build] of Object.entries(ENTRY_WITH)) {
    for (const [label, value] of HOSTILE) {
      const entry = build(value);
      /** @type {any} */ let refusal;
      assert.doesNotThrow(() => {
        refusal = validatePlanClassification(entry);
      }, `${field} with ${label} threw`);
      assert.ok(refusal, `${field} with ${label} was accepted`);
      assert.equal(refusal.code, 'PLAN_ENTRY_INVALID', `${field} with ${label}`);
      assert.equal(typeof refusal.reason, 'string');
      assert.ok(refusal.reason.includes(field), `${field} with ${label}: the refusal does not name the field: ${refusal.reason}`);
      assert.ok(refusal.reason.length < 400, `${field} with ${label}: the refusal is ${refusal.reason.length} characters`);
    }
  }
});

test('AC-7 the readers built on the validator treat a hostile value as an invalid entry: unclassified, no objective-step count, no declined case', () => {
  for (const [field, build] of Object.entries(ENTRY_WITH)) {
    for (const [label, value] of HOSTILE) {
      const entry = build(value);
      const where = `${field} with ${label}`;
      assert.doesNotThrow(() => classOf(entry), where);
      assert.doesNotThrow(() => objectiveStepsOf(entry), where);
      assert.doesNotThrow(() => declinedCase(entry), where);
      assert.equal(classOf(entry), CLASS_UNCLASSIFIED, where);
      assert.equal(objectiveStepsOf(entry), null, where);
      assert.equal(declinedCase(entry), null, where);
    }
  }
});

test('AC-7 applyClassification stamps every case unclassified with a null count when its plan entry carries a hostile value, and never throws', () => {
  for (const [field, build] of Object.entries(ENTRY_WITH)) {
    for (const [label, value] of HOSTILE) {
      const where = `${field} with ${label}`;
      const entries = [
        { index: 1, title: 't' },
        { index: 2, title: 'control' },
      ];
      const plan = new Map([
        [1, build(value)],
        [2, { index: 2, title: 'control', class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL' }],
      ]);
      /** @type {any[]} */ let stamped = [];
      assert.doesNotThrow(() => {
        stamped = applyClassification(entries, plan);
      }, where);
      assert.equal(stamped, entries, `${where}: the same array is returned`);
      assert.deepEqual([stamped[0].class, stamped[0].objective_steps], [CLASS_UNCLASSIFIED, null], where);
      assert.equal(stamped[1].class, 'human-by-nature', `${where}: the control entry in the same plan is unaffected`);
    }
  }
});

// ---------------------------------------------------------------------------
// The real runner: results.json is still written, N cases in and N entries out
// ---------------------------------------------------------------------------

/** @type {string[]} */
const temps = [];
after(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

const MANUAL_STEPS = ['1. Open the page.', '2. Check the result.'];
const MANUAL_STEPS_VERBATIM = MANUAL_STEPS.join('\n');

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

test('AC-7 a plan whose entries carry {"toString":1} in class, reason_code and objective_steps still writes results.json: each such case is needs-human PLAN_ENTRY_INVALID, unclassified, and N cases in yield N entries out', () => {
  const titles = ['Hostile class', 'Hostile code', 'Hostile steps', 'Control'];
  const root = mkdtempSync(join(tmpdir(), 'relay-qatotal-'));
  temps.push(root);
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(runDirAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), reportText(titles));
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ roles: {} }));
  // The plan is written as raw JSON text so the hostile value is exactly what a planner's file holds.
  const planJson = [
    '{ "schema_version": 1, "cases": [',
    `  { "index": 1, "title": ${JSON.stringify(titles[0])}, "class": {"toString":1}, "reason_code": "EXTERNAL_CHANNEL" },`,
    `  { "index": 2, "title": ${JSON.stringify(titles[1])}, "class": "human-by-nature", "reason_code": {"toString":1} },`,
    `  { "index": 3, "title": ${JSON.stringify(titles[2])}, "class": "automatable", "driver": "http", "role": null, "state": "none", "steps": [{ "action": "request", "method": "GET", "path": "/x", "expect_status": 200 }], "objective_steps": {"toString":1} },`,
    `  { "index": 4, "title": ${JSON.stringify(titles[3])}, "class": "human-by-nature", "reason_code": "EXTERNAL_CHANNEL" }`,
    '] }',
  ].join('\n');
  writeFileSync(join(runDirAbs, 'plan.json'), planJson);

  const r = spawnSync(process.execPath, [REAL_SCRIPT, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
  });
  assert.equal(r.status, 0, `the run must complete, not stop on an unexpected error: ${r.stderr}`);
  assert.equal(r.stderr.includes('FAILED_RUNNER_ERROR'), false, r.stderr);

  const resultsPath = join(runDirAbs, 'results.json');
  assert.ok(existsSync(resultsPath), 'results.json was not written');
  const res = JSON.parse(readFileSync(resultsPath, 'utf8'));
  assert.equal(res.cases.length, titles.length, 'N cases in, N entries out');
  assert.deepEqual(res.cases.map((/** @type {any} */ c) => c.index), [1, 2, 3, 4]);

  const wantField = ['class', 'reason_code', 'objective_steps'];
  for (const i of [0, 1, 2]) {
    const c = res.cases[i];
    const where = `case ${i + 1}: ${JSON.stringify([c.outcome, c.reason_code, c.class, c.objective_steps])}`;
    assert.equal(c.outcome, 'needs-human', where);
    assert.equal(c.reason_code, 'PLAN_ENTRY_INVALID', where);
    assert.equal(c.class, 'unclassified', where);
    assert.equal(c.objective_steps, null, where);
    assert.ok(String(c.reason).includes(wantField[i]), `case ${i + 1}: the reason does not name ${wantField[i]}: ${c.reason}`);
    assert.equal(c.manual_steps_verbatim, MANUAL_STEPS_VERBATIM, `case ${i + 1}: a refused case still reproduces the manual steps`);
  }

  const control = res.cases[3];
  assert.equal(control.outcome, 'needs-human');
  assert.equal(control.reason_code, 'EXTERNAL_CHANNEL', 'the control entry beside the hostile ones is declined as declared');
  assert.equal(control.class, 'human-by-nature');

  assert.deepEqual(res.counts, { pass: 0, fail: 0, blocked: 0, 'needs-human': 4 });
  assert.deepEqual(res.classification.per_class, { automatable: 0, 'needs-a-new-driver': 0, 'human-by-nature': 1, 'blocked-by-product': 0, unclassified: 3 });
  assert.equal(res.classification.automatable_rate, null);
  assert.deepEqual(validateResults(res), [], 'the results satisfy the results contract');

  assert.ok(r.stdout.includes('QA run finished: pass=0 fail=0 blocked=0 needs-human=4\n'), r.stdout);
  for (const i of [1, 2, 3]) assert.ok(r.stdout.includes(`case ${i}: needs-human (PLAN_ENTRY_INVALID)`), `case ${i} missing from the summary: ${r.stdout}`);
  assert.ok(r.stdout.includes('case 4: needs-human (EXTERNAL_CHANNEL)'));
});
