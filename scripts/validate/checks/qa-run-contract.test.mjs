// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-4 Closed outcome vocabulary (a fifth value is a schema violation the suite fails on)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-2 / AC-8 / AC-13 / AC-15 results.json contract (counts partition cases, open gate, real stamps, evidence on pass/fail)
/**
 * Unit tests for scripts/validate/checks/qa-run-contract.mjs.
 *
 * The check is a pure function over `{ scriptText, commandText, results }`, so
 * every test hands it the REAL runner script and command text (read from disk,
 * never edited) as the passing baseline, then mutates ONE anchored token in the
 * in-memory copy and asserts the exact finding that fires. The anchor helper
 * asserts each anchor occurs exactly once, so a mutation can never silently
 * miss. The headline test is the real mutation proof: the real runner source
 * with a fifth outcome value emitted must fail the check.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { checkQaRunContract, runQaRunContractCheck, validateResults } from './qa-run-contract.mjs';

const SCRIPT_FILE = 'plugins/relay/scripts/qa-run.mjs';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const SCRIPT = readFileSync(SCRIPT_FILE, 'utf8').replace(/\r\n/g, '\n');
const COMMAND = readFileSync(COMMAND_FILE, 'utf8').replace(/\r\n/g, '\n');

/**
 * @param {string} src @param {string} from @param {string} to
 * @returns {string}
 */
function mutate(src, from, to) {
  const n = src.split(from).length - 1;
  assert.equal(n, 1, `mutation anchor must occur exactly once, found ${n}: ${from.slice(0, 70)}`);
  return src.replace(from, () => to);
}

/** @param {string} t @param {string} part */
const has = (t, part) => t.includes(part);
/** @param {{ findings: { message: string }[] }} r @param {string} part */
const messages = (r, part) => r.findings.filter((f) => f.message.includes(part));

/** @returns {any} a results.json that satisfies the contract */
function goodResults() {
  const stamp = '2026-10-02T10:11:12.345Z';
  const entry = (/** @type {string} */ outcome, evidence = /** @type {string[]} */ ([])) => ({
    index: 1,
    title: 't',
    outcome,
    started_at: stamp,
    finished_at: stamp,
    evidence,
  });
  return {
    started_at: stamp,
    finished_at: stamp,
    human_gate: { status: 'open', review_file: 'PRPs/reports/f/qa-report.md' },
    counts: { pass: 1, fail: 0, blocked: 1, 'needs-human': 1 },
    cases: [entry('pass', ['e1.json']), entry('blocked'), entry('needs-human')],
  };
}

const check = (/** @type {{ scriptText?: string | null, commandText?: string | null, results?: any[] }} */ o = {}) =>
  checkQaRunContract({ scriptText: SCRIPT, commandText: COMMAND, results: [], ...o });

test('baseline: the real runner script and command satisfy the contract with zero findings, and the real-tree entry point agrees', () => {
  const r = check();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
  assert.equal(r.name, 'qa-run-contract');
  assert.equal(runQaRunContractCheck().ok, true);
});

test('AC-4 real mutation proof: the real runner source emitting a FIFTH outcome value fails the check at the offending line', () => {
  const anchor = "return { outcome: 'pass', reason_code: null, reason: null, evidence };\n  } finally {\n    if (reqCtx)";
  const mutated = mutate(SCRIPT, anchor, "return { outcome: 'passed', reason_code: null, reason: null, evidence };\n  } finally {\n    if (reqCtx)");
  const r = check({ scriptText: mutated });
  assert.equal(r.ok, false);
  const hit = messages(r, 'outside the closed vocabulary');
  assert.equal(hit.length, 1);
  assert.match(hit[0].message, /"passed"/);
  assert.equal(hit[0].file, SCRIPT_FILE);
  assert.equal(mutated.split('\n')[hit[0].line - 1].includes("outcome: 'passed'"), true, 'the finding line points at the mutated literal');
});

test('AC-4: widening the exported OUTCOMES vocabulary to five values fails the exact-literal rule', () => {
  const mutated = mutate(SCRIPT, "export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];", "export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human', 'skipped'];");
  const r = check({ scriptText: mutated });
  assert.equal(r.ok, false);
  assert.equal(messages(r, 'must contain exactly').length, 1);
});

test('single-write-helper rule: a second writeFileSync( or renameSync( call in the runner fails; so does losing the only one', () => {
  const dup = check({ scriptText: `${SCRIPT}\nwriteFileSync('x', 'y');\n` });
  assert.equal(messages(dup, 'writeFileSync( must appear exactly once, found 2').length, 1);
  const dupRename = check({ scriptText: `${SCRIPT}\nrenameSync('a', 'b');\n` });
  assert.equal(messages(dupRename, 'renameSync( must appear exactly once, found 2').length, 1);
  const none = check({ scriptText: mutate(SCRIPT, 'writeFileSync(tmp, data);', 'void 0;') });
  assert.equal(messages(none, 'writeFileSync( must appear exactly once, found 0').length, 1);
});

test('a write call naming qa-report.md fails (the runner never writes the report)', () => {
  const r = check({ scriptText: `${SCRIPT}\nrmSync('qa-report.md');\n` });
  assert.equal(messages(r, 'must never write the report').length, 1);
});

test('GUARD-SITE / WRITE-SITE markers: a missing or duplicated marker fails each independently', () => {
  for (const marker of ['// GUARD-SITE', '// WRITE-SITE']) {
    const missing = check({ scriptText: mutate(SCRIPT, `${marker}\n`, '') });
    assert.equal(messages(missing, `${marker} exactly once, found 0`).length, 1, marker);
    const dup = check({ scriptText: `${SCRIPT}\n${marker}\n` });
    assert.equal(messages(dup, `${marker} exactly once, found 2`).length, 1, marker);
  }
});

test('each required runner-script token (toISOString, FAILED_NON_LOCAL_TARGET, auth-local-guard.mjs, HUMAN GATE STILL OPEN) is individually required', () => {
  const stripped = (/** @type {string} */ token) => SCRIPT.split(token).join('REMOVED');
  for (const token of ['toISOString', 'FAILED_NON_LOCAL_TARGET', 'auth-local-guard.mjs', 'HUMAN GATE STILL OPEN']) {
    const r = check({ scriptText: stripped(token) });
    assert.equal(messages(r, `the runner script must contain ${token}`).length, 1, token);
  }
});

test('the runner command: dropping a required token or adding a banned one fails; null inputs report a missing file', () => {
  for (const token of ['HUMAN GATE STILL OPEN', 'FAILED_NON_LOCAL_TARGET', 'qa-run.mjs']) {
    const r = check({ commandText: COMMAND.split(token).join('REMOVED') });
    assert.equal(messages(r, `the runner command must contain ${token}`).length, 1, token);
  }
  for (const banned of ['design-spec', 'relay-auth-setup', '.claude/PRPs', 'subagent_type']) {
    assert.equal(has(COMMAND, banned), false, `baseline must not contain ${banned}`);
    const r = check({ commandText: `${COMMAND}\n${banned}\n` });
    assert.equal(messages(r, `must not contain ${banned}`).length, 1, banned);
  }
  assert.equal(messages(check({ scriptText: null }), `missing or unreadable file: ${SCRIPT_FILE}`).length, 1);
  assert.equal(messages(check({ commandText: null }), `missing or unreadable file: ${COMMAND_FILE}`).length, 1);
});

test('results.json contract: the baseline fixture is clean', () => {
  assert.deepEqual(validateResults(goodResults()), []);
  assert.deepEqual(check({ results: [{ file: 'r.json', value: goodResults() }] }).findings, []);
});

test('AC-4: a tracked results.json with a fifth outcome value fails and is attributed to its file', () => {
  const r = goodResults();
  r.cases[1].outcome = 'skipped';
  const res = check({ results: [{ file: 'PRPs/reports/f/qa-run/x/results.json', value: r }] });
  assert.equal(res.ok, false);
  const hit = messages(res, 'is outside the closed vocabulary');
  assert.equal(hit.length, 1);
  assert.equal(hit[0].file, 'PRPs/reports/f/qa-run/x/results.json');
  assert.match(hit[0].message, /cases\[1\]\.outcome "skipped"/);
});

test('AC-2: counts that do not partition the cases fail (cases.length vs the sum of counts)', () => {
  const r = goodResults();
  r.counts.pass = 2;
  assert.ok(validateResults(r).some((m) => m.includes('does not equal the sum of counts')));
  const r2 = goodResults();
  r2.cases.pop();
  assert.ok(validateResults(r2).some((m) => m.includes('does not equal the sum of counts')));
});

test('AC-13: a degenerate midnight stamp, a stamp without milliseconds and a missing stamp each fail, at run and case level', () => {
  for (const [field, value] of /** @type {[string, any][]} */ ([
    ['started_at', '2026-10-02T00:00:00.000Z'],
    ['finished_at', '2026-10-02T10:11:12Z'],
    ['started_at', undefined],
  ])) {
    const r = goodResults();
    r[field] = value;
    assert.equal(validateResults(r).filter((m) => m.startsWith(field)).length, 1, `${field}=${value}`);
  }
  const c = goodResults();
  c.cases[0].finished_at = '2026-10-02T00:00:00.000Z';
  assert.ok(validateResults(c).some((m) => m.includes('cases[0].finished_at is a degenerate midnight stamp')));
});

test('AC-8: a human gate that is not "open" (closed, or absent) fails', () => {
  const closed = goodResults();
  closed.human_gate.status = 'closed';
  assert.ok(validateResults(closed).includes('human_gate.status must be "open"'));
  const absent = goodResults();
  delete absent.human_gate;
  assert.ok(validateResults(absent).includes('human_gate.status must be "open"'));
});

test('AC-15: a pass or fail with an empty or missing evidence array fails; blocked and needs-human may have none', () => {
  const pass = goodResults();
  pass.cases[0].evidence = [];
  assert.ok(validateResults(pass).some((m) => m.includes('cases[0] is pass with an empty evidence array')));
  const fail = goodResults();
  fail.cases[1].outcome = 'fail';
  fail.counts = { pass: 1, fail: 1, blocked: 0, 'needs-human': 1 };
  assert.ok(validateResults(fail).some((m) => m.includes('cases[1] is fail with an empty evidence array')));
  assert.deepEqual(validateResults(goodResults()), [], 'blocked/needs-human with no evidence are fine');
});

test('shape guards: a non-object results value and a missing cases array fail without throwing', () => {
  assert.deepEqual(validateResults(null), ['results is not an object']);
  assert.deepEqual(validateResults([]), ['results is not an object']);
  const r = goodResults();
  delete r.cases;
  assert.ok(validateResults(r).includes('results.cases is missing or not an array'));
});
