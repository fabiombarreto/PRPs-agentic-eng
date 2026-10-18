// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-17 The suite stays green (qa-run-contract is extended behind an opt-in flag, not duplicated: the network rules fire only for a caller that opts in, and the 28-check count is unchanged)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-18 The command doc and the usage text match the script (the doc carries a marked literal flat example of expect_requests that validates against the script, the window in seconds the exported constant carries, and the re-mint with its cap)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (the observation helpers read the method and the URL of a request and nothing else, and a kit login script is run from one site)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the `requireNetwork` rules of qa-run-contract,
 * of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A9 the contract check is extended behind an opt-in flag, the structural halves of AC-A3, AC-A4
 *              and AC-A6)
 *
 * Over the REAL runner and command doc (read from disk, never edited). Each rule is proven by mutating ONE anchored
 * token (or one section) of an in-memory copy, so none can pass because a fixture never contained the token; one
 * finding per mutation, every message prefixed `network:` and carrying no phrase other tests count; the opt-in
 * flag keeps a caller that does not pass it exactly as before; a null input is a missing-file finding.
 *
 * The behavior pins inside requireNetwork call the runner's own validators and helpers, so they cannot be mutated
 * through text; the same behaviors are asserted directly in qa-run-network-grammar.test.mjs and
 * qa-run-remint-decision.test.mjs. The baseline "the real tree satisfies the contract" with every flag is asserted
 * by qa-run-contract.test.mjs; the single guard site, the single write site and the exact OUTCOMES literal by
 * qa-run-contract.test.mjs; the registered check count by validate-registry.test.mjs.
 *
 * QA_V2P6_RUNNER_SRC points the runner text at another file (a mutation control); unset, the real runner is read.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkQaRunContract } from './qa-run-contract.mjs';
import { EXPECT_REQUESTS_SETTLE_MS, LOGIN_REMINT_MAX_RETRIES, REASON_CATALOGUE } from '../../../plugins/relay/scripts/qa-run.mjs';

const RUNNER_FILE = process.env.QA_V2P6_RUNNER_SRC ? process.env.QA_V2P6_RUNNER_SRC : 'plugins/relay/scripts/qa-run.mjs';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const CONTRACT_FILE = 'scripts/validate/checks/qa-run-contract.mjs';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
const SCRIPT = read(RUNNER_FILE);
const COMMAND = read(COMMAND_FILE);

const NETWORK = 'network: ';
const BEGIN = '// REQUEST-OBSERVATION-BEGIN';
const END = '// REQUEST-OBSERVATION-END';
const WINDOW_PHRASE = `${EXPECT_REQUESTS_SETTLE_MS / 1000} seconds after the step starts`;
const CAP_PHRASE = LOGIN_REMINT_MAX_RETRIES === 1 ? 'at most once per role per run' : `at most ${LOGIN_REMINT_MAX_RETRIES} times per role per run`;

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
/** @param {string} src @param {string} token a token that must be present @returns {string} the text with every occurrence replaced */
function without(src, token) {
  assert.ok(src.includes(token), `mutation token not present: ${token}`);
  return src.split(token).join('REMOVED_TOKEN');
}
/**
 * Rewrites one section of the runner, located by two markers each asserted to occur exactly once.
 * @param {string} src @param {string} from @param {string} to @param {(section: string) => string} fn
 */
function inSection(src, from, to, fn) {
  const a = src.indexOf(once(src, from));
  const b = src.indexOf(once(src, to));
  assert.ok(a !== -1 && a < b, `the section markers are not in the expected order: ${from} ... ${to}`);
  return src.slice(0, a) + fn(src.slice(a, b)) + src.slice(b);
}
/** @param {Record<string, any>} [over] */
const network = (over = {}) => checkQaRunContract({ scriptText: SCRIPT, commandText: COMMAND, results: [], requireNetwork: true, ...over });
/** @param {{ findings: { message: string }[] }} r @param {string} part */
const named = (r, part) => r.findings.filter((f) => f.message.includes(part));

const DRIVER_FROM = 'DRIVERS.browser = async (';
const DRIVER_TO = 'export function mintExpiryDue(';
const LOGIN_FROM = 'function obtainSession(';
const LOGIN_TO = 'async function prepareState(';

// ---------------------------------------------------------------------------
// 1. The real tree, and the opt-in
// ---------------------------------------------------------------------------

test('AC-17 with the network rules required, the real runner and the real command doc produce no finding, and the registered check passes the flag', () => {
  const r = network();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
  // The entry point the registered check runs carries the flag, so the rules are enforced on the real tree.
  const entry = read(CONTRACT_FILE);
  const from = entry.indexOf('export function runQaRunContractCheck(');
  assert.notEqual(from, -1);
  assert.ok(entry.slice(from).includes('requireNetwork: true'), 'runQaRunContractCheck does not pass requireNetwork: true');
});

test('AC-17 the two numbers the doc follows are defined once in the runner: a second definition and a lost definition are each flagged once, naming it', () => {
  for (const definition of ['export const EXPECT_REQUESTS_SETTLE_MS', 'export const LOGIN_REMINT_MAX_RETRIES']) {
    const twice = network({ scriptText: `${SCRIPT}\n${definition} = 9;\n` });
    assert.equal(twice.ok, false, definition);
    assert.equal(twice.findings.length, 1, `${definition}: ${JSON.stringify(twice.findings)}`);
    assert.equal(named(twice, `${definition} exactly once, found 2`).length, 1, JSON.stringify(twice.findings));

    // The rule counts the text of the definition, so a lost definition is one whose name no longer contains it.
    const lost = network({ scriptText: SCRIPT.replace(once(SCRIPT, definition), () => 'export const LOST_CONSTANT') });
    assert.equal(lost.ok, false, definition);
    assert.equal(lost.findings.length, 1, `${definition}: ${JSON.stringify(lost.findings)}`);
    assert.equal(named(lost, `${definition} exactly once, found 0`).length, 1, JSON.stringify(lost.findings));
  }
});

// ---------------------------------------------------------------------------
// 2. The marked cluster that observes a request
// ---------------------------------------------------------------------------

test('AC-15 the observation helpers sit between two markers, each present once and in order: a lost, a duplicated and a swapped marker is each flagged once', () => {
  for (const marker of [BEGIN, END]) {
    const lost = network({ scriptText: SCRIPT.replace(once(SCRIPT, marker), () => '') });
    assert.equal(lost.findings.length, 1, `${marker}: ${JSON.stringify(lost.findings)}`);
    assert.equal(named(lost, `${marker} exactly once, found 0`).length, 1, JSON.stringify(lost.findings));

    const twice = network({ scriptText: `${SCRIPT}\n${marker}\n` });
    assert.equal(twice.findings.length, 1, `${marker}: ${JSON.stringify(twice.findings)}`);
    assert.equal(named(twice, `${marker} exactly once, found 2`).length, 1, JSON.stringify(twice.findings));
  }
  const swapped = SCRIPT.replace(once(SCRIPT, BEGIN), () => 'REQUEST_MARKER_TMP')
    .replace(once(SCRIPT, END), () => BEGIN)
    .replace('REQUEST_MARKER_TMP', () => END);
  const r = network({ scriptText: swapped });
  assert.equal(r.findings.length, 1, JSON.stringify(r.findings));
  assert.equal(named(r, 'must come before').length, 1, JSON.stringify(r.findings));
});

test('AC-15 the observation helpers must still read the method and the URL of a request: each lost reading is flagged once, naming it', () => {
  for (const token of ['.method()', '.url()']) {
    const mutated = inSection(SCRIPT, BEGIN, END, (s) => without(s, token).split('REMOVED_TOKEN').join('.renamed()'));
    const r = network({ scriptText: mutated });
    assert.equal(r.findings.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `must read ${token} of a request`).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-15 and AC-12 nothing but the method and the URL of a request is read: each of the thirteen readers of another channel is flagged once, naming it, in code and in a comment, and only inside the markers', () => {
  const readers = ['.headers(', '.allHeaders(', '.headerValue(', '.headersArray(', '.postData(', '.postDataBuffer(', '.postDataJSON(', '.response(', '.cookies(', '.storageState(', '.body(', '.text(', '.json('];
  assert.equal(readers.length, 13);
  for (const read of readers) {
    for (const [label, text] of /** @type {[string, string][]} */ ([
      ['code', `const leaked = request${read});\n`],
      ['a comment', `// the listener never calls request${read})\n`],
    ])) {
      const mutated = SCRIPT.replace(once(SCRIPT, END), () => `${text}${END}`);
      const r = network({ scriptText: mutated });
      assert.equal(r.findings.length, 1, `${read} in ${label}: ${JSON.stringify(r.findings)}`);
      assert.equal(named(r, `must not contain ${read}`).length, 1, `${read} in ${label}: ${JSON.stringify(r.findings)}`);
    }
  }
  // The same readers elsewhere in the runner are not this rule's business: the real http driver reads a response.
  const outside = network({ scriptText: SCRIPT.replace(once(SCRIPT, END), () => `${END}\nconst elsewhere = request.headers();\n`) });
  assert.deepEqual(outside.findings, []);
});

// ---------------------------------------------------------------------------
// 3. The browser driver and the login section
// ---------------------------------------------------------------------------

test('AC-12 and AC-15 the browser driver is wired to the observation, the settle wait, the window decision and the service-worker block: each wiring that vanished is flagged once, naming it', () => {
  for (const token of ["'expect_requests'", 'observeRequests(', 'settleRequestWindow(', 'evaluateRequestWindow(', "serviceWorkers: 'block'"]) {
    const mutated = inSection(SCRIPT, DRIVER_FROM, DRIVER_TO, (s) => without(s, token).split('REMOVED_TOKEN').join('renamedElsewhere('));
    const r = network({ scriptText: mutated });
    assert.equal(r.findings.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `the browser driver must contain ${token}`).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-13 and AC-15 the login section decides the re-mint through the pure helper, runs the script through its one helper and reads the role mechanism; an open-ended loop is flagged; a second spawn site is flagged', () => {
  for (const token of ['shouldRemintLogin(', 'runLoginScript(', 'isMintedRole(']) {
    const mutated = inSection(SCRIPT, LOGIN_FROM, LOGIN_TO, (s) => without(s, token).split('REMOVED_TOKEN').join('renamedElsewhere('));
    const r = network({ scriptText: mutated });
    assert.equal(r.findings.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `the session section must contain ${token}`).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }

  const loop = inSection(SCRIPT, LOGIN_FROM, LOGIN_TO, (s) => `${s}\n// while (true) {}\n`);
  const loopResult = network({ scriptText: loop });
  assert.equal(loopResult.findings.length, 1, JSON.stringify(loopResult.findings));
  assert.equal(named(loopResult, 'must not contain while (').length, 1, JSON.stringify(loopResult.findings));

  const second = network({ scriptText: `${SCRIPT}\nconst again = spawnSync(process.execPath, [], {});\n` });
  assert.equal(second.findings.length, 1, JSON.stringify(second.findings));
  assert.equal(named(second, 'spawnSync(process.execPath must appear exactly once, found 2').length, 1, JSON.stringify(second.findings));

  const none = network({ scriptText: SCRIPT.replace(once(SCRIPT, 'spawnSync(process.execPath'), () => 'spawnSyncRenamed(process.execPath') });
  assert.equal(none.findings.length, 1, JSON.stringify(none.findings));
  assert.equal(named(none, 'spawnSync(process.execPath must appear exactly once, found 0').length, 1, JSON.stringify(none.findings));
});

test('AC-17 a section the wiring rules cannot locate is itself a finding, never a silent pass', () => {
  /** @type {[string, string, string][]} the end marker renamed, the finding it must raise */
  const cases = [
    [DRIVER_TO, 'export function renamedExpiry(', 'so the request observation wiring can be located'],
    [LOGIN_TO, 'async function renamedState(', 'so the re-mint can be located'],
  ];
  for (const [marker, replacement, part] of cases) {
    const r = network({ scriptText: SCRIPT.replace(once(SCRIPT, marker), () => replacement) });
    assert.equal(r.ok, false, marker);
    assert.equal(r.findings.length, 1, `${marker}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, part).length, 1, `${marker}: ${JSON.stringify(r.findings)}`);
  }
});

// ---------------------------------------------------------------------------
// 4. The command doc
// ---------------------------------------------------------------------------

test('AC-18 a command doc that lost the step name, its path key, the window in seconds, the halt, the flag or the cap is flagged once per token, naming it; a window or a cap that disagrees with the exported constant is the drift the pin exists for', () => {
  for (const token of ['FAILED_PROBE_MARKER_ABSENT', '--force', WINDOW_PHRASE, CAP_PHRASE]) {
    const r = network({ commandText: without(COMMAND, token) });
    assert.equal(r.ok, false, token);
    assert.equal(r.findings.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `it must contain ${token}`).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }
  // The step name and its path key also sit in the marked example, which the generic example rule judges on its own.
  for (const token of ['expect_requests', 'url_contains']) {
    const r = network({ commandText: without(COMMAND, token) });
    assert.equal(r.ok, false, token);
    assert.equal(named(r, `it must contain ${token}`).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }

  const seconds = EXPECT_REQUESTS_SETTLE_MS / 1000;
  const windowDrift = network({ commandText: COMMAND.split(WINDOW_PHRASE).join(`${seconds + 5} seconds after the step starts`) });
  assert.equal(windowDrift.ok, false);
  assert.equal(named(windowDrift, WINDOW_PHRASE).length, 1, JSON.stringify(windowDrift.findings));
  const capDrift = network({ commandText: COMMAND.split(CAP_PHRASE).join('at most twice per role per run') });
  assert.equal(capDrift.ok, false);
  assert.equal(named(capDrift, CAP_PHRASE).length, 1, JSON.stringify(capDrift.findings));
});

test('AC-18 the doc must carry a marked browser example whose action is expect_requests, and an example the script would refuse is flagged by the generic example rule', () => {
  const example = '{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar", "count": 1 }';
  once(COMMAND, example);
  // The only such example became another step: the network rule asks for its own.
  const other = network({ commandText: COMMAND.replace(example, () => '{ "action": "expect_visible", "selector": "h1" }') });
  assert.equal(other.ok, false);
  assert.equal(named(other, 'must carry a marked browser example of expect_requests').length, 1, JSON.stringify(other.findings));
  assert.ok(named(other, 'must carry a marked browser example of expect_requests')[0].message.startsWith(NETWORK));

  // The same example with a count the script refuses is the generic rule's finding, not a network one.
  const drifted = network({ commandText: COMMAND.replace(example, () => example.replace('"count": 1', '"count": -1')) });
  assert.equal(drifted.ok, false);
  assert.equal(named(drifted, 'step example in the runner command does not validate').length, 1, JSON.stringify(drifted.findings));
  assert.equal(drifted.findings.filter((f) => f.message.startsWith(NETWORK)).length, 0, JSON.stringify(drifted.findings));
});

// ---------------------------------------------------------------------------
// 5. The shape of the findings, the opt-in and the null input
// ---------------------------------------------------------------------------

test('AC-17 every finding the network rules add starts with the word network: and carries none of the phrases other tests count; a caller that does not opt in sees none of them; a null input is a missing-file finding, never a throw', () => {
  // Everything broken at once, with no breakage the generic example rule would also report.
  let brokenScript = SCRIPT.replace(once(SCRIPT, 'export const LOGIN_REMINT_MAX_RETRIES'), () => 'export const LOST_CONSTANT');
  brokenScript = inSection(brokenScript, DRIVER_FROM, DRIVER_TO, (s) => without(s, 'observeRequests(').split('REMOVED_TOKEN').join('renamedObserve('));
  brokenScript = inSection(brokenScript, LOGIN_FROM, LOGIN_TO, (s) => without(s, 'shouldRemintLogin(').split('REMOVED_TOKEN').join('renamedDecide('));
  brokenScript = brokenScript.replace(once(brokenScript, END), () => `const leaked = request.headers();\n${END}`);
  brokenScript = `${brokenScript}\nconst again = spawnSync(process.execPath, [], {});\n`;
  let brokenCommand = COMMAND;
  for (const token of [WINDOW_PHRASE, 'FAILED_PROBE_MARKER_ABSENT', '--force', CAP_PHRASE]) brokenCommand = without(brokenCommand, token);

  const r = network({ scriptText: brokenScript, commandText: brokenCommand });
  assert.equal(r.ok, false);
  assert.ok(r.findings.length >= 9, `expected one finding per broken rule, got ${r.findings.length}: ${JSON.stringify(r.findings)}`);
  const catalogued = Object.keys(REASON_CATALOGUE);
  for (const f of r.findings) {
    assert.ok(f.message.startsWith(NETWORK), `a finding does not start with ${NETWORK}: ${f.message}`);
    assert.equal(f.message.includes('step example'), false, f.message);
    assert.equal(f.message.includes('is outside the closed vocabulary'), false, f.message);
    for (const code of catalogued) assert.equal(f.message.includes(code), false, `a finding names the catalogued code ${code}: ${f.message}`);
  }

  // The same broken inputs are silent without the flag: the base rules never knew the network step.
  const quiet = checkQaRunContract({ scriptText: brokenScript, commandText: brokenCommand, results: [] });
  assert.deepEqual(quiet.findings, []);

  // A null input is the missing-file finding it always was, and the new rules add nothing to it and throw nothing.
  /** @type {any} */ let nulls;
  assert.doesNotThrow(() => {
    nulls = checkQaRunContract({ scriptText: null, commandText: null, results: [], requireNetwork: true });
  });
  assert.equal(nulls.ok, false);
  assert.deepEqual(
    nulls.findings.map((/** @type {any} */ f) => f.message),
    ['missing or unreadable file: plugins/relay/scripts/qa-run.mjs', `missing or unreadable file: ${COMMAND_FILE}`],
  );
});
