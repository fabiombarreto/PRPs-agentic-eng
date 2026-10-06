// @ts-check
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-1 One literal step object in the command doc
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-2 Variables resolve or the case never starts
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-4 A partial plan never passes
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-5 A failed objective step is a real failure
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-6 Per-step results
/**
 * Phase 1 (plan contract and partial plans) of qa-runner-case-vocabulary.
 *
 * Pure-function tests only: no browser, no request context, no child process.
 * They exercise the runner's exported plan validators and result reducers and the
 * extended qa-run-contract check.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { validateStep, validateSteps, applyPartialRemainder, summarizeEntries, OUTCOMES } from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults, checkQaRunContract, runQaRunContractCheck } from './qa-run-contract.mjs';

const COMMAND = readFileSync('plugins/relay/commands/relay-qa-run.md', 'utf8').replace(/\r\n/g, '\n');

const GET = { action: 'request', method: 'GET', path: '/api/x', expect_status: 200 };

// ---------------------------------------------------------------------------
// AC-1: the flat shape is the only accepted shape
// ---------------------------------------------------------------------------

test('AC-1 a flat http step validates and a flat browser step validates', () => {
  assert.equal(validateStep('http', { action: 'request', method: 'GET', path: '/api/x' }), null);
  assert.equal(validateStep('browser', { action: 'expect_text', selector: 'h1', contains: 'Dashboard' }), null);
});

test('AC-1 the nested http form is rejected PLAN_ENTRY_INVALID with a reason that names the flat shape', () => {
  const r = validateStep('http', { request: { method: 'GET', path: '/api/x' } });
  assert.ok(r);
  assert.equal(r.code, 'PLAN_ENTRY_INVALID');
  assert.match(r.reason, /flat shape/);
  assert.match(r.reason, /"action"/);
});

test('AC-1 every nested browser action form is rejected naming the flat shape', () => {
  for (const name of ['goto', 'click', 'fill', 'expect_visible', 'expect_text', 'expect_url']) {
    const r = validateStep('browser', { [name]: { selector: 'a', path: '/p' } });
    assert.ok(r, name);
    assert.equal(r.code, 'PLAN_ENTRY_INVALID');
    assert.match(r.reason, /flat shape/, name);
  }
});

test('AC-1 a nested form under the wrong driver is not mistaken for a known nested form', () => {
  const r = validateStep('http', { click: { selector: 'a' } });
  assert.ok(r);
  assert.doesNotMatch(r.reason, /flat shape/);
  assert.match(r.reason, /not an object with a string action/);
});

test('AC-1 other shapes without a string action keep the original reason', () => {
  for (const bad of [{ request: 'GET /x' }, { request: {}, extra: 1 }, {}, null, 'request', [1], { action: 3 }]) {
    const r = validateStep('http', bad);
    assert.ok(r, JSON.stringify(bad));
    assert.equal(r.reason, 'not an object with a string action', JSON.stringify(bad));
  }
});

test('AC-1 per-step reasons carry no "step N:" prefix, while validateSteps prefixes the step number', () => {
  const bad = { action: 'request', method: 'FETCH', path: '/x' };
  const single = validateStep('http', bad);
  assert.ok(single);
  assert.equal(single.reason, 'method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
  const many = validateSteps('http', [GET, bad], []);
  assert.ok(many);
  assert.equal(many.code, 'PLAN_ENTRY_INVALID');
  assert.equal(many.reason, 'step 2: ' + single.reason);
});

test('AC-1 validateSteps reports the nested form with the step number', () => {
  const r = validateSteps('http', [GET, { request: { method: 'GET', path: '/x' } }], []);
  assert.ok(r);
  assert.match(r.reason, /^step 2: nested step form is not accepted/);
});

test('AC-1 the literal examples in the real command doc are marked for both drivers and validate against the script', () => {
  const found = [...COMMAND.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([\s\S]*?)\n```/g)];
  const drivers = found.map((m) => m[1]).sort();
  assert.deepEqual([...new Set(drivers)], ['browser', 'http']);
  for (const m of found) assert.equal(validateStep(m[1], JSON.parse(m[2])), null, m[1]);
});

// ---------------------------------------------------------------------------
// AC-2: unbound variables are refused by name
// ---------------------------------------------------------------------------

test('AC-2 an unbound variable in an http path is refused PLAN_ENTRY_INVALID, naming the variable and the step', () => {
  const step = { action: 'request', method: 'GET', path: '/api/items/{{item_id}}', expect_status: 200 };
  const r = validateSteps('http', [step], []);
  assert.ok(r);
  assert.equal(r.code, 'PLAN_ENTRY_INVALID');
  assert.match(r.reason, /item_id/);
  assert.match(r.reason, /^step 1:/);
});

test('AC-2 a reference is refused wherever it sits: body (nested), expectation text, expect_json value, fill value, selector', () => {
  const cases = [
    ['http', { action: 'request', method: 'POST', path: '/a', body: { deep: { list: ['{{in_body}}'] } }, expect_status: 201 }, 'in_body'],
    ['http', { action: 'request', method: 'GET', path: '/a', expect_body_contains: 'id={{in_expect}}' }, 'in_expect'],
    ['http', { action: 'request', method: 'GET', path: '/a', expect_json: { path: 'a', equals: '{{in_json}}' } }, 'in_json'],
    ['browser', { action: 'fill', selector: '#q', value: '{{in_fill}}' }, 'in_fill'],
    ['browser', { action: 'expect_visible', selector: '[data-id="{{in_selector}}"]' }, 'in_selector'],
  ];
  for (const [driver, step, name] of /** @type {[string, any, string][]} */ (cases)) {
    const r = validateSteps(driver, [step, { action: 'expect_url', path: '/ok' }].slice(0, driver === 'http' ? 1 : 2), []);
    assert.ok(r, name);
    assert.equal(r.code, 'PLAN_ENTRY_INVALID', name);
    assert.ok(r.reason.includes(name), `${name}: ${r.reason}`);
  }
});

test('AC-2 whitespace inside the braces is still a reference', () => {
  const r = validateSteps('http', [{ ...GET, path: '/a/{{  spaced_name  }}' }], []);
  assert.ok(r);
  assert.match(r.reason, /spaced_name/);
});

test('AC-2 the first unbound name in plan order is the one named, in a later step too', () => {
  const r = validateSteps('http', [GET, { ...GET, path: '/b/{{second}}/{{third}}' }], []);
  assert.ok(r);
  assert.match(r.reason, /^step 2: variable second /);
});

test('AC-2 a name present in the bound set is accepted; a different name stays refused', () => {
  const step = { action: 'request', method: 'GET', path: '/api/items/{{item_id}}', expect_status: 200 };
  assert.equal(validateSteps('http', [step], ['item_id']), null);
  const r = validateSteps('http', [step], ['other']);
  assert.ok(r);
  assert.match(r.reason, /item_id/);
});

test('AC-2 text that is not a well-formed reference is not treated as one', () => {
  for (const path of ['/a/{{1bad}}', '/a/{{}}', '/a/{x}', '/a/{{ not valid }}']) {
    assert.equal(validateSteps('http', [{ ...GET, path }], []), null, path);
  }
});

test('AC-2 with no bound set argument every reference is refused (the default binds nothing)', () => {
  const r = validateSteps('http', [{ ...GET, path: '/a/{{v}}' }]);
  assert.ok(r);
  assert.match(r.reason, /v/);
});

test('AC-2 the NO_EXPECTATION rule is unchanged: a plan with no expectation is still refused with that code', () => {
  const r = validateSteps('http', [{ action: 'request', method: 'GET', path: '/a' }], []);
  assert.ok(r);
  assert.equal(r.code, 'NO_EXPECTATION');
  assert.equal(validateSteps('http', [GET], []), null);
});

// ---------------------------------------------------------------------------
// AC-4 / AC-5: applyPartialRemainder
// ---------------------------------------------------------------------------

const REMAINDER = { human_remainder: { reason: 'steps 7-8 are a subjective judgment' } };
const PASSED_STEPS = [
  { index: 1, action: 'request', result: 'passed', evidence: 'e/1.json' },
  { index: 2, action: 'request', result: 'passed', evidence: 'e/2.json' },
];

test('AC-4 an all-pass partial plan becomes needs-human PARTIAL_REMAINDER, keeps its evidence and appends a human step', () => {
  const input = { outcome: 'pass', reason_code: null, reason: null, evidence: ['e/1.json', 'e/2.json'], steps: PASSED_STEPS };
  const out = applyPartialRemainder(input, REMAINDER);
  assert.equal(out.outcome, 'needs-human');
  assert.equal(out.reason_code, 'PARTIAL_REMAINDER');
  assert.equal(typeof out.reason, 'string');
  assert.ok(out.reason && out.reason.length > 0);
  assert.deepEqual(out.evidence, ['e/1.json', 'e/2.json']);
  assert.deepEqual(out.steps, [...PASSED_STEPS, { index: 3, action: 'human_remainder', result: 'human', evidence: null }]);
});

test('AC-4 applyPartialRemainder does not mutate its input', () => {
  const input = { outcome: 'pass', reason_code: null, reason: null, evidence: ['e/1.json'], steps: [...PASSED_STEPS] };
  const snapshot = JSON.parse(JSON.stringify(input));
  applyPartialRemainder(input, REMAINDER);
  assert.deepEqual(input, snapshot);
});

test('AC-4 a pass without recorded steps still gets a human step at index 1', () => {
  const out = applyPartialRemainder({ outcome: 'pass', reason_code: null, reason: null, evidence: [] }, REMAINDER);
  assert.deepEqual(out.steps, [{ index: 1, action: 'human_remainder', result: 'human', evidence: null }]);
});

test('AC-5 a failed objective step stays fail: not rewritten, no PARTIAL_REMAINDER, no human step', () => {
  const steps = [{ index: 1, action: 'request', result: 'failed', evidence: 'e/1.json' }];
  const input = { outcome: 'fail', reason_code: null, reason: 'step 1: expected status 200, got 500', evidence: ['e/1.json'], steps };
  const out = applyPartialRemainder(input, REMAINDER);
  assert.equal(out.outcome, 'fail');
  assert.notEqual(out.reason_code, 'PARTIAL_REMAINDER');
  assert.equal(out.reason, input.reason);
  assert.deepEqual(out.evidence, ['e/1.json']);
  assert.equal(out.steps?.some((s) => s.result === 'human'), false);
});

test('AC-5 blocked and needs-human results are returned unchanged for a partial plan', () => {
  for (const outcome of ['blocked', 'needs-human']) {
    const input = { outcome, reason_code: 'SOMETHING', reason: 'r', evidence: [], steps: [] };
    assert.deepEqual(applyPartialRemainder(input, REMAINDER), input, outcome);
  }
});

test('AC-4 a plan entry without human_remainder is returned unchanged, pass stays pass', () => {
  const input = { outcome: 'pass', reason_code: null, reason: null, evidence: ['e/1.json'], steps: PASSED_STEPS };
  assert.deepEqual(applyPartialRemainder(input, {}), input);
  assert.equal(applyPartialRemainder(input, {}).outcome, 'pass');
});

// ---------------------------------------------------------------------------
// AC-6: summarizeEntries and the four-outcome partition
// ---------------------------------------------------------------------------

test('AC-6 summarizeEntries counts the partition, record_resolved and partially_executed apart', () => {
  const s = summarizeEntries([
    { outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER' },
    { outcome: 'pass', reason_code: 'AUTOMATED_EVIDENCE' },
    { outcome: 'pass', reason_code: null },
    { outcome: 'blocked', reason_code: 'NO_PLAN_ENTRY' },
  ]);
  assert.deepEqual(s.counts, { pass: 2, fail: 0, blocked: 1, 'needs-human': 1 });
  assert.equal(s.record_resolved, 1);
  assert.equal(s.partially_executed, 1);
});

test('AC-6 summarizeEntries of nothing is all zeros with the four keys', () => {
  assert.deepEqual(summarizeEntries([]), { counts: { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 }, record_resolved: 0, partially_executed: 0 });
});

test('AC-6 summarizeEntries counts several partial and several record-resolved cases, and the partition sums to the entry count', () => {
  const entries = [
    { outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER' },
    { outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER' },
    { outcome: 'fail', reason_code: 'AUTOMATED_EVIDENCE' },
    { outcome: 'pass', reason_code: 'AUTOMATED_EVIDENCE' },
    { outcome: 'fail', reason_code: null },
  ];
  const s = summarizeEntries(entries);
  assert.equal(s.partially_executed, 2);
  assert.equal(s.record_resolved, 2);
  assert.equal(Object.values(s.counts).reduce((a, b) => a + b, 0), entries.length);
  assert.deepEqual(s.counts, { pass: 1, fail: 2, blocked: 0, 'needs-human': 2 });
});

test('AC-15 the outcome vocabulary is still exactly the four values', () => {
  assert.deepEqual([...OUTCOMES], ['pass', 'fail', 'blocked', 'needs-human']);
});

// ---------------------------------------------------------------------------
// AC-6: the extended results contract
// ---------------------------------------------------------------------------

const T = '2026-10-05T10:00:00.000Z';
/** @param {any} extra @param {any} [caseExtra] @param {any} [caseBase] */
function results(extra, caseExtra = {}, caseBase = {}) {
  return {
    started_at: T,
    finished_at: T,
    human_gate: { status: 'open' },
    counts: { pass: 0, fail: 0, blocked: 0, 'needs-human': 1 },
    cases: [{ outcome: 'needs-human', reason_code: 'PARTIAL_REMAINDER', started_at: T, finished_at: T, evidence: ['e/1.json'], ...caseBase, ...caseExtra }],
    ...extra,
  };
}
const oneStep = [{ index: 1, action: 'request', result: 'passed', evidence: 'e/1.json' }];

test('AC-6 a consistent partial result with per-step results validates with no messages', () => {
  assert.deepEqual(validateResults(results({ partially_executed: 1 }, { steps: oneStep })), []);
});

test('AC-6 a results object without the new keys still validates (older results.json stay valid)', () => {
  assert.deepEqual(validateResults(results({}, {}, { reason_code: null })), []);
});

test('AC-6 partially_executed that disagrees with the PARTIAL_REMAINDER case count is flagged', () => {
  const m = validateResults(results({ partially_executed: 0 }));
  assert.ok(m.some((x) => x.includes('partially_executed')), JSON.stringify(m));
});

test('AC-6 partially_executed that is not a non-negative integer is flagged', () => {
  for (const bad of [-1, 1.5, '1', null]) {
    const m = validateResults(results({ partially_executed: bad }));
    assert.ok(m.some((x) => x.includes('partially_executed')), String(bad));
  }
});

test('AC-6 a PARTIAL_REMAINDER case whose outcome is not needs-human is flagged', () => {
  const m = validateResults(
    results({ partially_executed: 1, counts: { pass: 1, fail: 0, blocked: 0, 'needs-human': 0 } }, { outcome: 'pass' }),
  );
  assert.ok(m.some((x) => x.includes('PARTIAL_REMAINDER')), JSON.stringify(m));
});

test('AC-6 a step result outside passed, failed, not-run, human is flagged; each legal value is accepted', () => {
  const bad = validateResults(results({ partially_executed: 1 }, { steps: [{ index: 1, action: 'request', result: 'maybe', evidence: null }] }));
  assert.ok(bad.some((x) => x.includes('maybe')), JSON.stringify(bad));
  for (const result of ['passed', 'failed', 'not-run', 'human']) {
    assert.deepEqual(validateResults(results({ partially_executed: 1 }, { steps: [{ index: 1, action: 'request', result, evidence: null }] })), [], result);
  }
});

test('AC-6 a steps value that is not an array is flagged; an empty steps array is accepted', () => {
  const bad = validateResults(results({ partially_executed: 1 }, { steps: 'nope' }));
  assert.ok(bad.some((x) => x.includes('steps')), JSON.stringify(bad));
  assert.deepEqual(validateResults(results({ partially_executed: 1 }, { steps: [] })), []);
});

test('AC-6 a step that is not an object is flagged', () => {
  const m = validateResults(results({ partially_executed: 1 }, { steps: [null] }));
  assert.ok(m.length > 0);
});

// ---------------------------------------------------------------------------
// AC-1: doc-example validation in checkQaRunContract
// ---------------------------------------------------------------------------

const BASE = 'HUMAN GATE STILL OPEN FAILED_NON_LOCAL_TARGET qa-run.mjs';
/** @param {string} driver @param {string} json */
const example = (driver, json) => `\n<!-- qa-step-example driver=${driver} -->\n` + '```json\n' + json + '\n```\n';
const GOOD_HTTP = example('http', '{ "action": "request", "method": "GET", "path": "/api/x", "expect_status": 200 }');
const GOOD_BROWSER = example('browser', '{ "action": "expect_text", "selector": "h1", "contains": "Dashboard" }');
/** @param {string} commandText @param {boolean} [requireStepExamples] */
const exampleFindings = (commandText, requireStepExamples) =>
  checkQaRunContract({ scriptText: null, commandText, results: [], requireStepExamples }).findings.filter((f) => /step example/.test(f.message));

test('AC-1 a nested example in the doc is flagged, naming the driver and the command file', () => {
  const f = exampleFindings(BASE + example('http', '{ "request": { "method": "GET", "path": "/x" } }') + GOOD_BROWSER, true);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /http/);
  assert.match(f[0].message, /flat shape/);
  assert.ok(f[0].file.endsWith('relay-qa-run.md'));
});

test('AC-1 an example that is not valid JSON is flagged', () => {
  const f = exampleFindings(BASE + example('browser', '{ not json') + GOOD_HTTP, true);
  assert.equal(f.length, 1);
  assert.match(f[0].message, /browser/);
  assert.match(f[0].message, /not valid JSON/);
});

test('AC-1 valid examples for both drivers produce no example findings, with the requirement on', () => {
  assert.deepEqual(exampleFindings(BASE + GOOD_HTTP + GOOD_BROWSER, true), []);
});

test('AC-1 with the requirement on, a missing example for either driver is flagged by driver', () => {
  const noBrowser = exampleFindings(BASE + GOOD_HTTP, true);
  assert.equal(noBrowser.length, 1);
  assert.match(noBrowser[0].message, /browser/);
  const none = exampleFindings(BASE, true);
  assert.equal(none.length, 2);
});

test('AC-1 the requirement defaults to off: a doc with no examples is not flagged, but a bad example still is', () => {
  assert.deepEqual(exampleFindings(BASE), []);
  assert.equal(exampleFindings(BASE + example('http', '{ "request": { "method": "GET", "path": "/x" } }')).length, 1);
});

test('AC-1 the real command doc and runner satisfy the contract with examples required', () => {
  const r = runQaRunContractCheck();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
});
