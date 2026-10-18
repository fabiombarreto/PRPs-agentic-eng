// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-3 Low-entropy values are not secrets (the policy and the command doc state the registration rule, its floor and its failure mode, with the numbers the runner exports)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-5 Run evidence is ignored and the ignore is proven (the policy, the command doc and the runner pin the ignore rules, the proof, the halt and the proof line)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-17 The suite stays green (qa-run-contract and auth-secrecy are extended behind opt-in flags, not duplicated)
/**
 * Phase 3 (redaction precision and run-evidence privacy), the pins, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-3-redaction-precision-and-run-evidence-privacy.plan.md
 *
 * Three layers, all over the REAL runner, policy and command doc (read from disk, never edited):
 *   1. The `requireRunEvidence` rules of auth-secrecy: each rule is proven by mutating ONE anchored token of an
 *      in-memory copy, so none can pass because a fixture never contained the token. The opt-in flag keeps a
 *      caller that does not pass it exactly as before.
 *   2. The `requirePrivacy` rules of qa-run-contract: the tokens, the proof in init, the two ordering rules (the
 *      proof precedes the browser in ground and the redaction table in run), the doc tokens and the numbers that
 *      follow the exported floor constants.
 *   3. The prose the operator and the planner read: the registration rule and the ignore proof in the command
 *      doc, and the run-evidence section of the redaction policy.
 *
 * The behavior of the proof itself is tested in qa-run-evidence-privacy.test.mjs and the registration policy in
 * qa-run-redaction-floor.test.mjs. The frozen surfaces (AC-14) and the single write site (AC-14) keep the tests
 * that already pin them (qa-run-ui-grounding.test.mjs, qa-run-classification.test.mjs, qa-run-contract.test.mjs).
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkAuthSecrecy, runAuthSecrecyCheck } from './auth-secrecy.mjs';
import { checkQaRunContract, runQaRunContractCheck } from './qa-run-contract.mjs';
import { SESSION_VALUE_MIN_LENGTH, SESSION_VALUE_MIN_ENTROPY } from '../../../plugins/relay/scripts/qa-run.mjs';

const RUNNER_FILE = 'plugins/relay/scripts/qa-run.mjs';
const POLICY_FILE = 'plugins/relay/resources/redaction-policy.md';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
const IGNORE = read('plugins/relay/resources/auth-kit.gitignore');
const KIT = read('plugins/relay/scripts/auth-kit-secrecy.mjs');
const POLICY = read(POLICY_FILE);
const SCRIPT = read(RUNNER_FILE);
const COMMAND = read(COMMAND_FILE);
const FLAT = COMMAND.replace(/\s+/g, ' ');

const LENGTH_PHRASE = `${SESSION_VALUE_MIN_LENGTH} characters`;
const ENTROPY_PHRASE = `${SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character`;
const RUN_EVIDENCE_HEADING = '## QA runner evidence: session values, snapshots, screenshots and personal data';
const SOURCE_FIRST_HEADING = '### Session values are registered source-first';
const SNAPSHOT_HEADING = '### Snapshots, screenshots and personal data';
const RULES_STATEMENT = "export const RUN_IGNORE_RULES = Object.freeze(['grounding/', 'evidence/']);";

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

// ---------------------------------------------------------------------------
// 1. auth-secrecy: the run-evidence rules
// ---------------------------------------------------------------------------

/** @param {Record<string, any>} [over] */
const secrecy = (over = {}) =>
  checkAuthSecrecy({ ignoreText: IGNORE, scriptText: KIT, policyText: POLICY, runnerScriptText: SCRIPT, requireRunEvidence: true, ...over });

/** @param {string} inner the quoted entries of the rules statement */
const withRules = (inner) => SCRIPT.replace(once(SCRIPT, RULES_STATEMENT), () => `export const RUN_IGNORE_RULES = Object.freeze([${inner}]);`);

test('AC-5 with the run-evidence rules required, the real runner, policy and kit files produce no finding, and the real-tree entry point agrees', () => {
  const r = secrecy();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
  assert.equal(runAuthSecrecyCheck().ok, true, JSON.stringify(runAuthSecrecyCheck().findings));
});

test('AC-5 a policy that lost the run-evidence section, a subsection heading or one of the ignore, proof or halt tokens is flagged once per token, naming it', () => {
  for (const token of [
    RUN_EVIDENCE_HEADING,
    SOURCE_FIRST_HEADING,
    SNAPSHOT_HEADING,
    'grounding/',
    'evidence/',
    '.gitignore',
    'git check-ignore',
    'FAILED_IGNORE_UNPROVEN',
    'not-applicable',
    'PRPs/redaction-extensions.txt',
  ]) {
    const r = secrecy({ policyText: without(POLICY, token) });
    assert.equal(r.ok, false, token);
    const hit = named(r, `redaction policy does not contain: ${token}`);
    assert.equal(hit.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(hit[0].file, POLICY_FILE);
  }
});

test('AC-3 a policy whose floor numbers disagree with the runner constants is flagged: the doc cannot drift from the code', () => {
  const length = secrecy({ policyText: POLICY.split(LENGTH_PHRASE).join(`${SESSION_VALUE_MIN_LENGTH + 87} characters`) });
  assert.equal(length.ok, false);
  assert.equal(named(length, LENGTH_PHRASE).length, 1, JSON.stringify(length.findings));
  const entropy = secrecy({ policyText: POLICY.split(ENTROPY_PHRASE).join(`${SESSION_VALUE_MIN_ENTROPY + 6} bits per character`) });
  assert.equal(entropy.ok, false);
  assert.equal(named(entropy, ENTROPY_PHRASE).length, 1, JSON.stringify(entropy.findings));
});

test('AC-5 a runner that lost the halt, the proof call or the ignore rules definition is flagged once, naming it, and attributed to the runner file', () => {
  for (const token of ['FAILED_IGNORE_UNPROVEN', 'check-ignore']) {
    const r = secrecy({ runnerScriptText: without(SCRIPT, token) });
    const hit = named(r, `runner script does not contain: ${token}`);
    assert.equal(hit.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(hit[0].file, RUNNER_FILE);
  }
  const gone = secrecy({ runnerScriptText: SCRIPT.split(once(SCRIPT, 'export const RUN_IGNORE_RULES')).join('export const RULES_GONE') });
  assert.equal(gone.ok, false);
  assert.equal(named(gone, 'RUN_IGNORE_RULES').length, 1, JSON.stringify(gone.findings));
});

test('AC-5 runner ignore rules: a missing required rule, a re-include, a blanket rule and a rule that hides results.json, plan.json or the ignore file are each flagged naming the rule', () => {
  const missing = secrecy({ runnerScriptText: withRules("'grounding/'") });
  assert.equal(named(missing, 'missing required rule: evidence/').length, 1, JSON.stringify(missing.findings));
  const reinclude = secrecy({ runnerScriptText: withRules("'grounding/', 'evidence/', '!evidence/keep.png'") });
  assert.equal(named(reinclude, '!evidence/keep.png').length, 1, JSON.stringify(reinclude.findings));
  assert.ok(named(reinclude, 're-include').length >= 1);
  for (const blanket of ['*', '/*']) {
    const r = secrecy({ runnerScriptText: withRules(`'grounding/', 'evidence/', '${blanket}'`) });
    assert.ok(named(r, 'blanket rule').length >= 1, `${blanket}: ${JSON.stringify(r.findings)}`);
  }
  for (const tracked of ['results.json', 'plan.json', '.gitignore']) {
    const r = secrecy({ runnerScriptText: withRules(`'grounding/', 'evidence/', '${tracked}'`) });
    assert.equal(r.ok, false, tracked);
    assert.equal(named(r, `hide the tracked side: ${tracked}`).length, 1, `${tracked}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-3 a runner that lost either floor constant is flagged naming it; a null runner text is a missing file and a null policy text keeps its single finding', () => {
  for (const name of ['SESSION_VALUE_MIN_LENGTH', 'SESSION_VALUE_MIN_ENTROPY']) {
    const r = secrecy({ runnerScriptText: SCRIPT.split(once(SCRIPT, `export const ${name}`)).join(`export const ${name}_GONE`) });
    assert.equal(r.ok, false, name);
    assert.equal(named(r, `runner script does not define: export const ${name}`).length, 1, `${name}: ${JSON.stringify(r.findings)}`);
  }
  const noRunner = secrecy({ runnerScriptText: null });
  assert.equal(noRunner.ok, false);
  assert.equal(named(noRunner, `missing or unreadable file: ${RUNNER_FILE}`).length, 1);
  const noPolicy = secrecy({ policyText: null });
  assert.equal(noPolicy.ok, false);
  assert.equal(noPolicy.findings.filter((f) => f.file === POLICY_FILE).length, 1, JSON.stringify(noPolicy.findings));
});

test('AC-17 the run-evidence rules fire only for a caller that opts in: the same mutated runner and policy are silent with the flag absent or false', () => {
  const mutated = {
    ignoreText: IGNORE,
    scriptText: KIT,
    policyText: without(POLICY, 'git check-ignore'),
    runnerScriptText: without(SCRIPT, 'FAILED_IGNORE_UNPROVEN'),
  };
  assert.deepEqual(checkAuthSecrecy(mutated).findings, []);
  assert.deepEqual(checkAuthSecrecy({ ...mutated, requireRunEvidence: false }).findings, []);
  assert.equal(checkAuthSecrecy({ ...mutated, requireRunEvidence: true }).ok, false, 'the same input must fail once the rules are required');
});

// ---------------------------------------------------------------------------
// 2. qa-run-contract: the privacy rules
// ---------------------------------------------------------------------------

/** @param {Record<string, any>} [over] */
const privacy = (over = {}) => checkQaRunContract({ scriptText: SCRIPT, commandText: COMMAND, results: [], requirePrivacy: true, ...over });

/** The text of one section of the runner between two function markers. */
const slice = (/** @type {string} */ from, /** @type {string} */ to) => {
  const start = once(SCRIPT, from);
  const end = once(SCRIPT, to);
  const a = SCRIPT.indexOf(start);
  const b = SCRIPT.indexOf(end);
  assert.ok(a !== -1 && b > a, `${from} must precede ${to}`);
  return { a, b, text: SCRIPT.slice(a, b) };
};

test('AC-5 with the privacy rules required, the real runner and the real command doc produce no finding, and the real-tree entry point agrees', () => {
  const r = privacy();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
  assert.equal(runQaRunContractCheck().ok, true, JSON.stringify(runQaRunContractCheck().findings));
});

test('AC-5 a runner that lost the halt, the proof line or the check-ignore proof is flagged once per token, naming it', () => {
  for (const token of ['FAILED_IGNORE_UNPROVEN', 'IGNORE_PROOF', 'check-ignore']) {
    const r = privacy({ scriptText: without(SCRIPT, token) });
    assert.equal(r.ok, false, token);
    const hit = named(r, `the runner script must contain ${token}`);
    assert.equal(hit.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(hit[0].file, RUNNER_FILE);
  }
});

test('AC-5 the ignore rules are defined once: a second definition is flagged with the count', () => {
  const r = privacy({ scriptText: `${SCRIPT}\nexport const RUN_IGNORE_RULES_COPY = [];\n` });
  assert.equal(named(r, 'RUN_IGNORE_RULES exactly once, found 2').length, 1, JSON.stringify(r.findings));
});

test('AC-5 init must prove the ignore and always write the file: a run directory creator that stops writing, or stops proving, is flagged', () => {
  assert.ok(SCRIPT.includes('alwaysWrite: true'), 'the real init must pass alwaysWrite: true');
  const stopsWriting = privacy({ scriptText: SCRIPT.split('alwaysWrite: true').join('alwaysWrite: false') });
  assert.equal(named(stopsWriting, 'init must always write the run directory ignore file').length, 1, JSON.stringify(stopsWriting.findings));
  const init = slice('async function runInit(', 'async function runRun(');
  assert.ok(init.text.includes('requireRunIgnore('), 'the real init must prove the ignore');
  const stopsProving = privacy({ scriptText: SCRIPT.slice(0, init.a) + init.text.split('requireRunIgnore(').join('noopProof(') + SCRIPT.slice(init.b) });
  assert.equal(named(stopsProving, 'init must prove the run directory ignore').length, 1, JSON.stringify(stopsProving.findings));
});

test('AC-5 the proof precedes the browser in ground and the redaction table in run: moved behind either, or removed, the rule fires naming the call', () => {
  const ground = slice('async function runGround(', 'async function runGroundGuarded(');
  const lateGround = ground.text
    .split('requireRunIgnore(')
    .join('noopProof(')
    .replace(once(ground.text, 'loadPlaywright(root, PLUGIN_ROOT);'), () => 'loadPlaywright(root, PLUGIN_ROOT); requireRunIgnore(runDirAbs);');
  const afterBrowser = privacy({ scriptText: SCRIPT.slice(0, ground.a) + lateGround + SCRIPT.slice(ground.b) });
  assert.equal(named(afterBrowser, 'ground mode must call requireRunIgnore( before loadPlaywright(').length, 1, JSON.stringify(afterBrowser.findings));
  const noGround = privacy({ scriptText: SCRIPT.slice(0, ground.a) + ground.text.split('requireRunIgnore(').join('noopProof(') + SCRIPT.slice(ground.b) });
  assert.equal(named(noGround, 'ground mode must prove the run directory ignore').length, 1, JSON.stringify(noGround.findings));

  const run = slice('async function runRun(', 'function runParse(');
  const tableLine = 'const table = buildRedactionTable({ root, env: process.env, secretValues: [] });';
  const lateRun = run.text
    .split('requireRunIgnore(')
    .join('noopProof(')
    .replace(once(run.text, tableLine), () => `${tableLine} requireRunIgnore(runDirAbs);`);
  const afterTable = privacy({ scriptText: SCRIPT.slice(0, run.a) + lateRun + SCRIPT.slice(run.b) });
  assert.equal(named(afterTable, 'run mode must call requireRunIgnore( before buildRedactionTable(').length, 1, JSON.stringify(afterTable.findings));
  const noRun = privacy({ scriptText: SCRIPT.slice(0, run.a) + run.text.split('requireRunIgnore(').join('noopProof(') + SCRIPT.slice(run.b) });
  assert.equal(named(noRun, 'run mode must prove the run directory ignore').length, 1, JSON.stringify(noRun.findings));
});

test('AC-5 a section the rule cannot locate is itself a finding, never a silent pass', () => {
  const noInit = privacy({ scriptText: SCRIPT.split(once(SCRIPT, 'async function runInit(')).join('async function runInitGone(') });
  assert.equal(named(noInit, 'must define init between async function runInit(').length, 1, JSON.stringify(noInit.findings));
  const noGround = privacy({ scriptText: SCRIPT.split(once(SCRIPT, 'async function runGroundGuarded(')).join('async function runGroundGone(') });
  assert.equal(named(noGround, 'must define the ground mode so the ignore proof can be located').length, 1, JSON.stringify(noGround.findings));
  const noRun = privacy({ scriptText: SCRIPT.split(once(SCRIPT, 'function runParse(')).join('function runParseGone(') });
  assert.equal(named(noRun, 'must define the run mode so the ignore proof can be located').length, 1, JSON.stringify(noRun.findings));
});

test('AC-5 AC-3 a command doc that lost the halt, the proof line, the ignore file, the proof or either floor number is flagged once per token, naming it', () => {
  for (const token of ['FAILED_IGNORE_UNPROVEN', 'IGNORE_PROOF', '.gitignore', 'git check-ignore', LENGTH_PHRASE, ENTROPY_PHRASE]) {
    const r = privacy({ commandText: without(COMMAND, token) });
    assert.equal(r.ok, false, token);
    const hit = named(r, `it must contain ${token}`);
    assert.equal(hit.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(hit[0].file, COMMAND_FILE);
  }
  // A doc whose numbers disagree with the exported constants is the drift the pin exists for.
  const drift = privacy({ commandText: COMMAND.split(LENGTH_PHRASE).join(`${SESSION_VALUE_MIN_LENGTH + 87} characters`) });
  assert.equal(named(drift, LENGTH_PHRASE).length, 1, JSON.stringify(drift.findings));
});

test('AC-17 the privacy rules fire only for a caller that opts in: the same mutated runner and doc are silent without the flag', () => {
  const mutated = { scriptText: without(SCRIPT, 'FAILED_IGNORE_UNPROVEN'), commandText: without(COMMAND, 'IGNORE_PROOF'), results: [] };
  const quiet = checkQaRunContract(mutated);
  assert.equal(quiet.findings.some((f) => /IGNORE|privacy|check-ignore|alwaysWrite/i.test(f.message)), false, JSON.stringify(quiet.findings));
  assert.equal(checkQaRunContract({ ...mutated, requirePrivacy: true }).ok, false, 'the same input must fail once the rules are required');
});

// ---------------------------------------------------------------------------
// 3. The prose: the command doc and the redaction policy
// ---------------------------------------------------------------------------

test('AC-5 the command doc says what init, ground and run do about the ignore: the file, the proof, both IGNORE_PROOF values, the halt and the remedy', () => {
  for (const phrase of [
    '`.gitignore`',
    '`grounding/` and `evidence/`',
    'git check-ignore -q',
    '`IGNORE_PROOF: proven`',
    '`IGNORE_PROOF: not-applicable`',
    '`FAILED_IGNORE_UNPROVEN`',
    'writes no snapshot and no screenshot',
    'run `init` again',
    'while `results.json` and `plan.json` stay tracked',
    'restore a missing `.gitignore` first',
  ]) {
    assert.ok(FLAT.includes(phrase), `the command doc lacks: ${phrase}`);
  }
});

test('AC-5 the command doc keeps the personal-data paragraph, says the snapshot directory is ignored, states a halted run wrote neither results nor evidence, and lists the rule among the constraints', () => {
  assert.ok(FLAT.includes('PRPs/redaction-extensions.txt'), 'the personal-data paragraph lost its extension file');
  assert.ok(FLAT.includes('stays out of git even when it is not withheld'), 'the personal-data paragraph does not say the snapshot is ignored');
  assert.ok(FLAT.includes('wrote neither results nor evidence'), 'the final output surface does not state what a halted run left');
  assert.ok(COMMAND.split('\n').some((l) => l.startsWith('- **Run evidence never reaches git.**')), 'the constraint bullet is missing');
});

test('AC-3 the command doc states the registration rule source-first with the exported numbers and its failure mode, and no longer claims every session value is registered', () => {
  for (const phrase of [
    'registered for redaction source-first',
    '`sessionCookie`',
    '`api_origins`',
    `at least ${LENGTH_PHRASE} long`,
    ENTROPY_PHRASE,
    'is not a part of the target origin',
    'not masked by value',
  ]) {
    assert.ok(FLAT.includes(phrase), `the command doc lacks: ${phrase}`);
  }
  assert.equal(FLAT.includes('are all registered for redaction'), false, 'the retired sentence is back');
  // The minted-session paragraph the sentence sat in keeps its other statements.
  for (const kept of ['240 seconds', '--force', 'IndexedDB']) assert.ok(FLAT.includes(kept), `the paragraph lost ${kept}`);
});

test('AC-3 AC-5 the policy section sits between the URL-handling and closing sections and states the three registration classes, the failure mode with its remedy, the proof and the not-applicable case', () => {
  const lines = POLICY.split('\n');
  const heading = lines.indexOf(RUN_EVIDENCE_HEADING);
  const before = lines.indexOf('## URL handling (special case)');
  const closing = lines.indexOf('## What this policy is NOT');
  assert.ok(before !== -1 && heading > before && closing > heading, `section order: ${before} ${heading} ${closing}`);
  assert.equal(lines.filter((l) => l === RUN_EVIDENCE_HEADING).length, 1);
  const section = lines.slice(heading, closing).join('\n');
  const flat = section.replace(/\s+/g, ' ');
  for (const phrase of [
    SOURCE_FIRST_HEADING,
    SNAPSHOT_HEADING,
    '**Always registered**',
    '**Registered above a floor**',
    '**Never registered**',
    '`sessionCookie`',
    '`api_origins`',
    '**Failure mode.**',
    'is not masked by value',
    '`regex:` line',
    'PRPs/redaction-extensions.txt',
    '`git check-ignore -q`',
    '`results.json` and `plan.json` stay tracked',
    '`FAILED_IGNORE_UNPROVEN`',
    '`not-applicable`',
    `at least ${LENGTH_PHRASE} long`,
    ENTROPY_PHRASE,
  ]) {
    assert.ok(flat.includes(phrase), `the policy section lacks: ${phrase}`);
  }
  // The credential-store subsection other checks pin is outside the new section and untouched.
  assert.ok(POLICY.includes('### Credential stores, session files and storage-state paths'));
  assert.equal(section.includes('### Credential stores'), false);
});
