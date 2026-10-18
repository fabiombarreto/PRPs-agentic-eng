// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-18 The command doc and the usage text match the script (every new step has a literal flat example preceded by the qa-step-example marker and validating against the script; the doc's mode list names every mode)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-17 The suite stays green (qa-run-contract is extended behind an opt-in flag, not duplicated: the new rules fire only for a caller that opts in)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-9 An input value is asserted and never written (the redaction policy states the evidence shape and the screenshot mask)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (the contract keeps the http driver building its context through the helper and sending a session-less step through the anonymous fetch; the guard-first behavior itself is asserted in qa-run-session-less-request.test.mjs)
/**
 * Phase 4 (request without a session, input value, absence and state), the pins, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md
 *              (AC-A4 the policy sentence, AC-A8 the doc and the opt-in contract rules, AC-A9 the plan-facing catalogue)
 *
 * Layers, all over the REAL runner, command doc and policy (read from disk, never edited):
 *   1. The `requireVocabulary` rules of qa-run-contract: each rule is proven by mutating ONE anchored token of
 *      an in-memory copy, so none can pass because a fixture never contained the token; one finding per token,
 *      every message prefixed `vocabulary:`; a null input is a missing-file finding, never a throw; the opt-in
 *      flag keeps a caller that does not pass it exactly as before.
 *   2. The prose the planner and the operator read: the marked examples validate against the script (the
 *      absence example only as a sequence with an anchor), the rules of the four steps, the honesty bullets,
 *      and the Input values bullet of the redaction policy.
 *   3. The plan-facing reason-code catalogue stays closed: the halts the four steps use are not declarable.
 *
 * The behavior pins of the contract rules call the runner's own validators, so they cannot be mutated through
 * text; the same behaviors are asserted directly in qa-run-session-less-request.test.mjs,
 * qa-run-input-value.test.mjs and qa-run-absence-state.test.mjs. The contract rule for the http driver pins the
 * helper and the anonymous fetch only, not the guard calls (prepareApiStep, resolveStepUrl) that run before them;
 * the observable of that order (a refused step sends nothing) is asserted by the end-to-end session-less test,
 * but no test pins the order inside the driver itself. The baseline "the real tree
 * satisfies the contract" (with the on-disk dogfood results) is asserted by qa-run-contract.test.mjs; the five
 * frozen surfaces by qa-run-ui-grounding.test.mjs (four files) and qa-run-classification.test.mjs
 * (relay-qa-report.md); the single guard site, single write site and the absence of a static sibling import by
 * qa-run-contract.test.mjs and qa-run-stable-grounding.test.mjs; the registered check count by
 * validate-registry.test.mjs.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkQaRunContract } from './qa-run-contract.mjs';
import {
  validateStep,
  validateSteps,
  validatePlanClassification,
  REASON_CATALOGUE,
  EXPECT_STATES,
  ASSERT_SETTLE_MS,
} from '../../../plugins/relay/scripts/qa-run.mjs';

const RUNNER_FILE = 'plugins/relay/scripts/qa-run.mjs';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const POLICY_FILE = 'plugins/relay/resources/redaction-policy.md';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
const SCRIPT = read(RUNNER_FILE);
const COMMAND = read(COMMAND_FILE);
const POLICY = read(POLICY_FILE);

const PREFIX = 'vocabulary: ';
const NEW_ACTIONS = ['expect_value', 'expect_not_visible', 'expect_state'];
const WINDOW_PHRASE = `for up to ${ASSERT_SETTLE_MS / 1000} seconds`;

const MODE_LIST = 'the runner script (`parse`, `init`, `run`, `ground`)';
const HTTP_EXAMPLE = '{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "session": "none", "expect_status": 401 }';
const VALUE_EXAMPLE = '{ "action": "expect_value", "role": "textbox", "name": "Telefone", "not_empty": true }';
const ABSENCE_EXAMPLE = '{ "action": "expect_not_visible", "role": "listitem", "name": "Buy milk" }';
const STATE_EXAMPLE = '{ "action": "expect_state", "role": "button", "name": "Não concluídas", "state": "expanded", "equals": false }';

/**
 * @param {string} src
 * @param {string} anchor
 * @returns {string} the anchor, after asserting it occurs exactly once (a mutation can never silently miss)
 */
function once(src, anchor) {
  const n = src.split(anchor).length - 1;
  assert.equal(n, 1, `mutation anchor must occur exactly once, found ${n}: ${anchor.slice(0, 70)}`);
  return anchor;
}

/**
 * @param {string} src
 * @param {string} token a token that must be present
 * @returns {string} the text with every occurrence of the token replaced
 */
function without(src, token) {
  assert.ok(src.includes(token), `mutation token not present: ${token}`);
  return src.split(token).join('REMOVED_TOKEN');
}

/** @param {{ findings: { message: string, file: string }[] }} r @param {string} part */
const named = (r, part) => r.findings.filter((f) => f.message.includes(part));

/** @param {Record<string, any>} [over] */
const vocabulary = (over = {}) => checkQaRunContract({ scriptText: SCRIPT, commandText: COMMAND, results: [], requireVocabulary: true, ...over });

/** The three runner sections the wiring rules read, located by markers each asserted to occur once. */
function sections() {
  const httpAt = SCRIPT.indexOf(once(SCRIPT, 'DRIVERS.http = async ('));
  const locatorAt = SCRIPT.indexOf(once(SCRIPT, 'async function runLocatorStep('));
  const browserAt = SCRIPT.indexOf(once(SCRIPT, 'DRIVERS.browser = async ('));
  assert.ok(httpAt !== -1 && httpAt < locatorAt && locatorAt < browserAt, 'the three sections are not in the expected order');
  return { httpAt, locatorAt, browserAt, http: SCRIPT.slice(httpAt, locatorAt), locator: SCRIPT.slice(locatorAt, browserAt) };
}

// ---------------------------------------------------------------------------
// 1. qa-run-contract: the vocabulary rules
// ---------------------------------------------------------------------------

test('AC-18 with the vocabulary rules required, the real runner and the real command doc produce no finding', () => {
  const r = vocabulary();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
});

test('AC-18 a runner that lost the request options helper, or defines it twice, is flagged once with the count, attributed to the runner file', () => {
  const gone = vocabulary({ scriptText: without(SCRIPT, once(SCRIPT, 'export function httpContextOptions(')) });
  const goneHit = named(gone, 'exactly once, found 0');
  assert.equal(goneHit.length, 1, JSON.stringify(gone.findings));
  assert.ok(goneHit[0].message.includes('httpContextOptions'));
  assert.equal(goneHit[0].file, RUNNER_FILE);
  const twice = vocabulary({ scriptText: `${SCRIPT}\nexport function httpContextOptions() {}\n` });
  assert.equal(named(twice, 'httpContextOptions( exactly once, found 2').length, 1, JSON.stringify(twice.findings));
});

test('AC-15 a http driver that no longer builds its context through the helper, or no longer sends a session-less step through the anonymous fetch, is flagged once per token, naming it', () => {
  const s = sections();
  for (const token of ['httpContextOptions(', 'fetchAnonymously(']) {
    assert.ok(s.http.includes(token), `the real http driver does not contain ${token}`);
    const mutated = SCRIPT.slice(0, s.httpAt) + s.http.split(token).join('renamedElsewhere(') + SCRIPT.slice(s.locatorAt);
    const r = vocabulary({ scriptText: mutated });
    assert.equal(r.ok, false, token);
    const hit = named(r, `the http driver must contain ${token}`);
    assert.equal(hit.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.ok(hit[0].message.startsWith(PREFIX), hit[0].message);
    assert.equal(hit[0].file, RUNNER_FILE);
  }
});

test('AC-10 a locator step that stopped naming one of the three new actions is flagged once per action, so no new action can fall through into the text comparison', () => {
  const s = sections();
  for (const action of NEW_ACTIONS) {
    const literal = `'${action}'`;
    assert.ok(s.locator.includes(literal), `the real locator step does not name ${literal}`);
    const mutated = SCRIPT.slice(0, s.locatorAt) + s.locator.split(literal).join("'x_action'") + SCRIPT.slice(s.browserAt);
    const r = vocabulary({ scriptText: mutated });
    assert.equal(r.ok, false, action);
    const hit = named(r, `the locator step must name ${literal}`);
    assert.equal(hit.length, 1, `${action}: ${JSON.stringify(r.findings)}`);
    assert.ok(hit[0].message.startsWith(PREFIX), hit[0].message);
  }
});

test('AC-18 a section the wiring rules cannot locate is itself a finding, never a silent pass', () => {
  const noHttp = vocabulary({ scriptText: SCRIPT.split(once(SCRIPT, 'DRIVERS.http = async (')).join('DRIVERS.httpGone = async (') });
  assert.equal(named(noHttp, 'must define the http driver before the locator step').length, 1, JSON.stringify(noHttp.findings));
  const noBrowser = vocabulary({ scriptText: SCRIPT.split(once(SCRIPT, 'DRIVERS.browser = async (')).join('DRIVERS.browserGone = async (') });
  assert.equal(named(noBrowser, 'must define the locator step before the browser driver').length, 1, JSON.stringify(noBrowser.findings));
});

test('AC-18 a command doc that lost one of the new steps, not_empty, the session key or a state word is flagged once per token, naming it', () => {
  for (const token of [...NEW_ACTIONS, 'not_empty', '"session": "none"', ...EXPECT_STATES]) {
    const r = vocabulary({ commandText: without(COMMAND, token) });
    assert.equal(r.ok, false, token);
    const hit = named(r, `it must contain ${token}`);
    assert.equal(hit.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.ok(hit[0].message.startsWith(PREFIX), hit[0].message);
    assert.equal(hit[0].file, COMMAND_FILE);
  }
});

test('AC-18 the re-read window the doc states follows the exported constant: a doc that disagrees is flagged naming the number', () => {
  const r = vocabulary({ commandText: COMMAND.split(WINDOW_PHRASE).join(`for up to ${ASSERT_SETTLE_MS / 1000 + 4} seconds`) });
  assert.equal(r.ok, false);
  assert.equal(named(r, `it must contain ${WINDOW_PHRASE}`).length, 1, JSON.stringify(r.findings));
});

test('AC-18 a doc whose runner-script mode list lost a mode, or lost the list, is flagged once per mode, naming it', () => {
  once(COMMAND, MODE_LIST);
  const modes = ['parse', 'init', 'run', 'ground'];
  for (const mode of modes) {
    const list = `the runner script (${modes.filter((m) => m !== mode).map((m) => `\`${m}\``).join(', ')})`;
    const mutated = COMMAND.replace(MODE_LIST, () => list);
    assert.notEqual(mutated, COMMAND, mode);
    const r = vocabulary({ commandText: mutated });
    assert.equal(r.ok, false, mode);
    const hit = named(r, `must name the ${mode} mode`);
    assert.equal(hit.length, 1, `${mode}: ${JSON.stringify(r.findings)}`);
    assert.ok(hit[0].message.startsWith(PREFIX), hit[0].message);
  }
  const noList = vocabulary({ commandText: COMMAND.split('the runner script (').join('the runner script, which has the modes ') });
  assert.equal(named(noList, 'must list the modes of the runner script in a parenthesis').length, 1, JSON.stringify(noList.findings));
});

test('AC-18 a doc whose marked example stopped being a session-less request, or stopped being one of the three new assertions, is flagged once, naming it', () => {
  once(COMMAND, HTTP_EXAMPLE);
  const noSession = vocabulary({ commandText: COMMAND.replace(HTTP_EXAMPLE, () => HTTP_EXAMPLE.replace('"session": "none", ', '')) });
  assert.equal(named(noSession, 'marked http example of a request step with session').length, 1, JSON.stringify(noSession.findings));
  for (const [action, example] of /** @type {[string, string][]} */ ([
    ['expect_value', VALUE_EXAMPLE],
    ['expect_not_visible', ABSENCE_EXAMPLE],
    ['expect_state', STATE_EXAMPLE],
  ])) {
    once(COMMAND, example);
    // The example becomes another valid step, so only the "carry an example of this action" rule can fire.
    const r = vocabulary({ commandText: COMMAND.replace(example, () => example.replace(`"action": "${action}"`, '"action": "expect_visible"')) });
    assert.equal(r.ok, false, action);
    assert.equal(named(r, `marked browser example of ${action}`).length, 1, `${action}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, 'does not validate').length, 0, `${action}: the replaced example must stay a valid step: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-18 a marked example that no longer validates against the script is flagged: the doc cannot drift from the validators', () => {
  once(COMMAND, STATE_EXAMPLE);
  const badState = vocabulary({ commandText: COMMAND.replace(STATE_EXAMPLE, () => STATE_EXAMPLE.replace('"state": "expanded"', '"state": "pressed"')) });
  assert.equal(badState.ok, false);
  assert.ok(named(badState, 'example in the runner command does not validate').length >= 1, JSON.stringify(badState.findings));
  once(COMMAND, VALUE_EXAMPLE);
  const badValue = vocabulary({ commandText: COMMAND.replace(VALUE_EXAMPLE, () => VALUE_EXAMPLE.replace('"not_empty": true', '"not_empty": false')) });
  assert.equal(badValue.ok, false);
  assert.ok(named(badValue, 'example in the runner command does not validate').length >= 1, JSON.stringify(badValue.findings));
  const badSession = vocabulary({ commandText: COMMAND.replace(HTTP_EXAMPLE, () => HTTP_EXAMPLE.replace('"session": "none"', '"session": "cookie"')) });
  assert.equal(badSession.ok, false);
  assert.ok(named(badSession, 'example in the runner command does not validate').length >= 1, JSON.stringify(badSession.findings));
});

test('AC-17 every finding the vocabulary rules add starts with the word vocabulary: and carries none of the phrases other tests count', () => {
  /** @type {Record<string, any>[]} */
  const mutations = [
    { scriptText: without(SCRIPT, once(SCRIPT, 'export function httpContextOptions(')) },
    { commandText: without(COMMAND, 'expect_state') },
    { commandText: without(COMMAND, '"session": "none"') },
    { commandText: COMMAND.split(WINDOW_PHRASE).join('for up to 99 seconds') },
    { commandText: COMMAND.split('the runner script (').join('the runner script, which has the modes ') },
  ];
  const s = sections();
  mutations.push({ scriptText: SCRIPT.slice(0, s.httpAt) + s.http.split('fetchAnonymously(').join('renamedElsewhere(') + SCRIPT.slice(s.locatorAt) });
  mutations.push({ scriptText: SCRIPT.slice(0, s.locatorAt) + s.locator.split("'expect_value'").join("'x_action'") + SCRIPT.slice(s.browserAt) });
  const codes = Object.keys(REASON_CATALOGUE);
  for (const [i, m] of mutations.entries()) {
    // What the new rules add is the difference with the same input run without the opt-in flag.
    const base = new Set(vocabulary({ ...m, requireVocabulary: false }).findings.map((f) => f.message));
    const added = vocabulary(m).findings.filter((f) => !base.has(f.message));
    assert.ok(added.length >= 1, `mutation ${i} added no finding`);
    for (const f of added) {
      assert.ok(f.message.startsWith(PREFIX), `mutation ${i}: an added finding lacks the prefix: ${f.message}`);
      assert.ok(!f.message.includes('step example'), f.message);
      assert.ok(!f.message.includes('is outside the closed vocabulary'), f.message);
      for (const code of codes) assert.ok(!f.message.includes(code), `${f.message} names the catalogue code ${code}`);
    }
  }
});

test('AC-18 a null runner or command text is a missing-file finding, never a throw', () => {
  /** @type {any} */ let r;
  assert.doesNotThrow(() => {
    r = checkQaRunContract({ scriptText: null, commandText: null, results: [], requireVocabulary: true });
  });
  assert.equal(r.ok, false);
  assert.equal(named(r, `missing or unreadable file: ${RUNNER_FILE}`).length, 1, JSON.stringify(r.findings));
  assert.equal(named(r, `missing or unreadable file: ${COMMAND_FILE}`).length, 1, JSON.stringify(r.findings));
});

test('AC-17 the vocabulary rules fire only for a caller that opts in: a runner without the helper and a doc with the wrong window are clean without the flag', () => {
  // Both mutations touch only what the opt-in rules read, so the base rules stay green on the same input.
  const mutated = { scriptText: without(SCRIPT, once(SCRIPT, 'export function httpContextOptions(')), commandText: COMMAND.split(WINDOW_PHRASE).join('for up to 99 seconds'), results: [] };
  const quiet = checkQaRunContract(mutated);
  assert.deepEqual(quiet.findings, []);
  assert.equal(quiet.ok, true);
  const loud = checkQaRunContract({ ...mutated, requireVocabulary: true });
  assert.equal(loud.ok, false, 'the same input must fail once the rules are required');
  assert.equal(named(loud, 'httpContextOptions').length, 1, JSON.stringify(loud.findings));
  assert.equal(named(loud, `it must contain ${WINDOW_PHRASE}`).length, 1, JSON.stringify(loud.findings));
});

// ---------------------------------------------------------------------------
// 2. The prose: the command doc and the redaction policy
// ---------------------------------------------------------------------------

const EXAMPLE_BLOCK = /<!-- qa-step-example driver=(\w+) -->[ \t]*\n```json\n([\s\S]*?)\n```/g;
/** @type {{ driver: string, step: any }[]} */
const EXAMPLES = [...COMMAND.matchAll(EXAMPLE_BLOCK)].map((m) => {
  try {
    return { driver: m[1], step: JSON.parse(m[2]) };
  } catch {
    // An unparseable example is reported by the contract check itself; here it simply matches nothing.
    return { driver: m[1], step: { unparseable: true } };
  }
});
/** The doc's paragraphs, each flattened to one line. */
const PARAGRAPHS = COMMAND.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim());

/**
 * @param {string} start the opening words of a paragraph, which must identify exactly one paragraph
 * @returns {string}
 */
function paragraphStarting(start) {
  const found = PARAGRAPHS.filter((p) => p.startsWith(start));
  assert.equal(found.length, 1, `exactly one paragraph must start with ${start}, found ${found.length}`);
  return found[0];
}

test('AC-18 each new step has a marked flat literal example in the doc, and each validates against the script one step at a time', () => {
  const pick = (/** @type {string} */ driver, /** @type {(s: any) => boolean} */ pred) => EXAMPLES.find((e) => e.driver === driver && pred(e.step));
  const session = pick('http', (s) => s.action === 'request' && s.session === 'none');
  const value = pick('browser', (s) => s.action === 'expect_value');
  const absence = pick('browser', (s) => s.action === 'expect_not_visible');
  const state = pick('browser', (s) => s.action === 'expect_state');
  for (const [label, e] of /** @type {[string, any][]} */ ([['session', session], ['expect_value', value], ['expect_not_visible', absence], ['expect_state', state]])) {
    assert.ok(e, `no marked example of ${label}`);
    assert.equal(validateStep(e.driver, e.step), null, `${label}: ${JSON.stringify(e.step)}`);
    assert.ok(!('selector' in e.step), `${label}: a new step takes grounded locators only`);
  }
  assert.equal(typeof session?.step.expect_status, 'number', 'a session-less example carries the expectation that earns its pass');
  assert.ok(EXPECT_STATES.includes(state?.step.state), `the expect_state example names a state outside the closed set: ${state?.step.state}`);
  assert.equal(typeof state?.step.equals, 'boolean', 'the expect_state example writes a boolean equals');
});

test('AC-10 the absence example in the doc is valid as a step and refused as an entry on its own, so the doc never teaches an absence with no anchor', () => {
  const absence = EXAMPLES.find((e) => e.step.action === 'expect_not_visible');
  assert.ok(absence, 'no marked expect_not_visible example');
  const anchor = { action: 'expect_visible', role: 'heading', name: 'Perfil' };
  assert.equal(validateSteps('browser', [{ action: 'goto', path: '/p' }, anchor, absence?.step], []), null);
  assert.equal(validateSteps('browser', [{ action: 'goto', path: '/p' }, absence?.step], [])?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-8 AC-10 AC-9 each step has its rule in its own paragraph of the doc: who may carry session, what anchors an absence, and what a missing value or state blocks', () => {
  /** @type {[string, string[]][]} */
  const rules = [
    ['The optional `session` key', ['only an `http` `request` step may carry it', 'no cookie, no storage state and no derived header', 'still blocks the case `FAILED_NON_LOCAL_TARGET` before any request']],
    ['`expect_value` takes `role` and `name`', ['never the value, and the final screenshot masks the field', 'blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted']],
    ['`expect_not_visible` takes `role` and `name`', ['positive step on the same route in the same case', 'before anything is seeded, authenticated or requested']],
    ['`expect_state` takes `role` and `name`', ['never passes as collapsed or unchecked']],
  ];
  for (const [start, phrases] of rules) {
    const paragraph = paragraphStarting(start);
    for (const phrase of phrases) assert.ok(paragraph.includes(phrase), `the paragraph of ${start} lacks: ${phrase}`);
  }
});

test('AC-8 AC-10 the honesty rules tell the planner when to plan the session-less request and where an expectation comes from', () => {
  const lines = COMMAND.split('\n');
  const at = lines.findIndex((l) => l.startsWith('Honesty rules:'));
  assert.ok(at !== -1, 'the honesty rules section is missing');
  /** @type {string[]} */ const bullets = [];
  for (const l of lines.slice(at + 1)) {
    if (l.startsWith('#')) break;
    if (l.startsWith('- ')) bullets.push(l.slice(2).trim());
    else if (l.startsWith('  ') && bullets.length > 0) bullets[bullets.length - 1] += ` ${l.trim()}`;
  }
  const bulletOf = (/** @type {string} */ start) => {
    const found = bullets.filter((b) => b.startsWith(start));
    assert.equal(found.length, 1, `exactly one honesty bullet must start with ${start}, found ${found.length}`);
    return found[0];
  };
  const session = bulletOf('Plan `"session": "none"`');
  assert.ok(session.includes('only when the report\'s own step asks for a request made without the session'), session);
  assert.ok(session.includes('never to avoid a login'), session);
  const assertions = bulletOf('Plan `expect_not_visible`');
  assert.ok(assertions.includes('only after a positive step of the same route'), assertions);
  assert.ok(assertions.includes('taken from the report\'s own steps, never from the snapshot'), assertions);
});

test('AC-9 the Input values bullet of the redaction policy says the value is never written, what the evidence names, that the field is masked and where the value reaches nothing', () => {
  const lines = POLICY.split('\n');
  const heading = lines.indexOf('### Snapshots, screenshots and personal data');
  const closing = lines.indexOf('## What this policy is NOT');
  assert.ok(heading !== -1 && closing > heading, `section order: ${heading} ${closing}`);
  const section = lines.slice(heading, closing);
  const starts = section.map((l, i) => (l.startsWith('- **Input values.**') ? i : -1)).filter((i) => i !== -1);
  assert.equal(starts.length, 1, 'the Input values bullet must occur once, inside the snapshots subsection');
  let end = starts[0] + 1;
  while (end < section.length && section[end].startsWith('  ')) end++;
  const bullet = section.slice(starts[0], end).join(' ').replace(/\s+/g, ' ');
  for (const phrase of ['never written', 'which comparison ran', 'whether it passed', 'masks the located field', 'no evidence file', 'no result', 'no reason', 'no terminal line']) {
    assert.ok(bullet.includes(phrase), `the Input values bullet lacks: ${phrase} | ${bullet}`);
  }
});

// ---------------------------------------------------------------------------
// 3. The plan-facing catalogue stays closed
// ---------------------------------------------------------------------------

// The exact eight-code catalogue and the refusal of the older runtime-halt codes are asserted by
// qa-run-classification.test.mjs (the AC-6 catalogue test and the "outside the closed catalogue" test); this adds
// the halts the four new steps end a case with, which that test does not list.
test('AC-6 the halts the four steps end a case with are runner outcomes, not causes a plan declares: none is in the catalogue and each is refused as a reason_code', () => {
  for (const code of ['STEP_NOT_PERFORMABLE', 'EVIDENCE_WRITE_FAILED', 'API_HEADER_NO_SESSION', 'FAILED_NON_LOCAL_TARGET', 'PLAN_ENTRY_INVALID']) {
    assert.equal(Object.hasOwn(REASON_CATALOGUE, code), false, `${code} must not be a plan-facing code`);
    const r = validatePlanClassification({ index: 1, title: 't', class: 'needs-a-new-driver', reason_code: code });
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', code);
    assert.ok(String(r?.reason).includes(code), `${code} not named: ${r?.reason}`);
  }
});
