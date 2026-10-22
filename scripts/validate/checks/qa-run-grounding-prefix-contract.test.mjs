// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-17 The suite stays green (qa-run-contract is extended behind an opt-in flag, not duplicated: the prefix rules fire only for a caller that opts in, and the 28-check count is unchanged)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-18 The command doc and the usage text match the script (the doc teaches the prefix mode, its restrictions, its halts, its file, its risk, and carries the three carry-over fixes)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-10 Absence and state assertions cannot pass vacuously (carry-over DQ18 and DQ19: what resets the absence anchor, what a mixed checkbox does)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (the redaction policy states how a post-interaction snapshot is withheld and that a typed value is only a digest)
/**
 * Phase 5 (grounding after an interaction), the pins, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md
 *              (AC-A6 the doc, the usage text and the script match, AC-A7 the carry-over fixes, AC-A8 the opt-in
 *              contract rules, AC-A9 the policy bullet)
 *
 * Layers, all over the REAL runner, command doc and policy (read from disk, never edited):
 *   1. The `requirePrefix` rules of qa-run-contract: each rule is proven by mutating ONE anchored token (or one
 *      section) of an in-memory copy, so none can pass because a fixture never contained the token; one finding
 *      per mutation, every message prefixed `prefix:` and carrying no phrase other tests count; the opt-in flag
 *      keeps a caller that does not pass it exactly as before; a null input is a missing-file finding.
 *   2. The prose the planner and the operator read: the block that teaches the mode (its example is accepted by the
 *      runner's own parser, and the PowerShell 5.1 note is true of the same example), its restrictions with the caps
 *      the exported constants carry, its halts, its file and consumption rule, its plain statement of the risk, the
 *      honesty bullet, and the three carry-over fixes with the runner behavior each one describes.
 *   3. The Post-interaction snapshots bullet of the redaction policy: what it says, and that it does NOT claim the
 *      snapshot file is free of a typed value, which the entries can echo.
 *
 * The behavior pins inside requirePrefix call the runner's own parser and key helpers, so they cannot be mutated
 * through text; the same behaviors are asserted directly in qa-run-grounding-prefix-grammar.test.mjs and
 * qa-run-grounding-prefix-consumption.test.mjs. The baseline "the real tree satisfies the contract" is asserted by
 * qa-run-contract.test.mjs; the single guard site, the single write site and the exact OUTCOMES literal by
 * qa-run-contract.test.mjs; the absence of a static sibling import by qa-run-stable-grounding.test.mjs; the frozen
 * surfaces by qa-run-ui-grounding.test.mjs and qa-run-classification.test.mjs; the registered check count by
 * validate-registry.test.mjs.
 *
 * QA_V2P5_RUNNER_SRC points the runner text at another file (a mutation control); unset, the real runner is read.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkQaRunContract } from './qa-run-contract.mjs';
import { GROUND_PREFIX_MAX_STEPS, GROUND_PREFIX_VALUE_MAX, ASSERT_SETTLE_MS, parseGroundPrefix, validateSteps } from '../../../plugins/relay/scripts/qa-run.mjs';

const RUNNER_FILE = process.env.QA_V2P5_RUNNER_SRC ? process.env.QA_V2P5_RUNNER_SRC : 'plugins/relay/scripts/qa-run.mjs';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const POLICY_FILE = 'plugins/relay/resources/redaction-policy.md';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
const SCRIPT = read(RUNNER_FILE);
const COMMAND = read(COMMAND_FILE);
const POLICY = read(POLICY_FILE);

const PREFIX = 'prefix: ';
const CAP_PHRASE = `at most ${GROUND_PREFIX_MAX_STEPS} steps`;

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
const prefix = (over = {}) => checkQaRunContract({ scriptText: SCRIPT, commandText: COMMAND, results: [], requirePrefix: true, ...over });
/** @param {{ findings: { message: string }[] }} r @param {string} part */
const named = (r, part) => r.findings.filter((f) => f.message.includes(part));

const GROUND_FROM = 'async function runGround(';
const GROUND_TO = 'async function runGroundGuarded(';
const PRECHECK_FROM = 'export function precheckGroundedSteps(';
const PRECHECK_TO = 'export function summarizeEntries(';
const LOADER_FROM = 'function loadGroundingSnapshots(';
const LOADER_TO = 'async function executeCase(';

// ---------------------------------------------------------------------------
// 1. qa-run-contract: the prefix rules
// ---------------------------------------------------------------------------

test('AC-17 with the prefix rules required, the real runner and the real command doc produce no finding', () => {
  const r = prefix();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
});

test('AC-17 the cap is defined once in the runner and both ground halts are named: a second definition, a lost definition and a lost halt are each flagged once, naming it', () => {
  const twice = prefix({ scriptText: `${SCRIPT}\nexport const GROUND_PREFIX_MAX_STEPS = 9;\n` });
  assert.equal(twice.ok, false);
  assert.equal(named(twice, 'GROUND_PREFIX_MAX_STEPS exactly once, found 2').length, 1, JSON.stringify(twice.findings));

  const lost = prefix({ scriptText: SCRIPT.replace(once(SCRIPT, 'export const GROUND_PREFIX_MAX_STEPS'), () => 'export const GROUND_PREFIX_MAX_X') });
  assert.equal(named(lost, 'GROUND_PREFIX_MAX_STEPS exactly once, found 0').length, 1, JSON.stringify(lost.findings));

  for (const halt of ['GROUND_PREFIX_INVALID', 'GROUND_PREFIX_FAILED']) {
    const r = prefix({ scriptText: without(SCRIPT, halt) });
    assert.equal(r.ok, false, halt);
    assert.equal(r.findings.length, 1, `${halt}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `the named halt ${halt}`).length, 1, `${halt}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-17 the replay is wired in the ground mode, after the ignore proof and before the stable wait, and the file is named through its helper: each wiring that moved or vanished is flagged once, naming the call', () => {
  // The replay call is gone from the ground mode.
  const gone = inSection(SCRIPT, GROUND_FROM, GROUND_TO, (s) => without(s, 'replayGroundingPrefix(').split('REMOVED_TOKEN').join('renamedReplay('));
  const goneResult = prefix({ scriptText: gone });
  assert.equal(goneResult.findings.length, 1, JSON.stringify(goneResult.findings));
  assert.equal(named(goneResult, 'the ground mode must contain replayGroundingPrefix(').length, 1);

  // The replay now comes after the stable wait: the only occurrence of the token that is left is behind it.
  const late = inSection(SCRIPT, GROUND_FROM, GROUND_TO, (s) => `${s.split('replayGroundingPrefix(').join('renamedReplay(')}\n// replayGroundingPrefix(\n`);
  const lateResult = prefix({ scriptText: late });
  assert.equal(lateResult.findings.length, 1, JSON.stringify(lateResult.findings));
  assert.equal(named(lateResult, 'must call replayGroundingPrefix( before waitForStableSnapshot(').length, 1);

  // The replay now comes before the ignore proof.
  const early = inSection(SCRIPT, GROUND_FROM, GROUND_TO, (s) => s.replace(once(s, 'requireRunIgnore(runDirAbs);'), () => 'replayGroundingPrefix(null, [], null);\n  requireRunIgnore(runDirAbs);'));
  const earlyResult = prefix({ scriptText: early });
  assert.equal(earlyResult.findings.length, 1, JSON.stringify(earlyResult.findings));
  assert.equal(named(earlyResult, 'must call requireRunIgnore( before replayGroundingPrefix(').length, 1);

  // The file is no longer named through its helper.
  const unnamed = inSection(SCRIPT, GROUND_FROM, GROUND_TO, (s) => s.split('groundSnapshotFileName(').join('renamedName('));
  const unnamedResult = prefix({ scriptText: unnamed });
  assert.equal(unnamedResult.findings.length, 1, JSON.stringify(unnamedResult.findings));
  assert.equal(named(unnamedResult, 'the ground mode must contain groundSnapshotFileName(').length, 1);
});

test('AC-17 the plan-time check reads the interaction history and the post-interaction kind, and the snapshot loader accepts that kind: each lost reading is flagged once, naming it', () => {
  for (const token of ['interactionHistory(', 'isPostInteractionSnapshot(']) {
    const mutated = inSection(SCRIPT, PRECHECK_FROM, PRECHECK_TO, (s) => without(s, token).split('REMOVED_TOKEN').join('renamed('));
    const r = prefix({ scriptText: mutated });
    assert.equal(r.findings.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `the plan-time check must contain ${token}`).length, 1, token);
  }
  const loader = inSection(SCRIPT, LOADER_FROM, LOADER_TO, (s) => without(s, 'isPostInteractionSnapshot(').split('REMOVED_TOKEN').join('renamedGate('));
  const loaderResult = prefix({ scriptText: loader });
  assert.equal(loaderResult.findings.length, 1, JSON.stringify(loaderResult.findings));
  assert.equal(named(loaderResult, 'the snapshot loader must contain isPostInteractionSnapshot(').length, 1);
});

test('AC-17 a section the wiring rules cannot locate is itself a finding, never a silent pass', () => {
  /** @type {[string, string, string][]} the end marker renamed, the finding it must raise */
  const cases = [
    [GROUND_TO, 'async function renamedGuarded(', 'so the replay can be located'],
    [PRECHECK_TO, 'export function renamedSummary(', 'so its lookup can be located'],
    [LOADER_TO, 'async function renamedCase(', 'so its schema gate can be located'],
  ];
  for (const [marker, replacement, part] of cases) {
    const r = prefix({ scriptText: SCRIPT.replace(once(SCRIPT, marker), () => replacement) });
    assert.equal(r.ok, false, marker);
    assert.equal(r.findings.length, 1, `${marker}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, part).length, 1, `${marker}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-18 a command doc that lost the flag, either halt, the block that teaches the mode or the cap is flagged once per token, naming it, and a cap that disagrees with the exported constant is the drift the pin exists for', () => {
  for (const token of ['--prefix', 'GROUND_PREFIX_FAILED', 'GROUND_PREFIX_INVALID', 'Grounding after an interaction.', CAP_PHRASE]) {
    const r = prefix({ commandText: without(COMMAND, token) });
    assert.equal(r.ok, false, token);
    assert.equal(r.findings.length, 1, `${token}: ${JSON.stringify(r.findings)}`);
    assert.equal(named(r, `it must contain ${token}`).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }
  const drift = prefix({ commandText: COMMAND.split(CAP_PHRASE).join(`at most ${GROUND_PREFIX_MAX_STEPS + 4} steps`) });
  assert.equal(drift.ok, false);
  assert.equal(named(drift, CAP_PHRASE).length, 1, JSON.stringify(drift.findings));
});

test('AC-17 every finding the prefix rules add starts with the word prefix: and carries none of the phrases other tests count; a caller that does not opt in sees none of them; a null input is a missing-file finding, never a throw', () => {
  // Everything broken at once.
  let brokenScript = without(SCRIPT, 'GROUND_PREFIX_INVALID');
  brokenScript = brokenScript.split('GROUND_PREFIX_FAILED').join('GROUND_X');
  brokenScript = brokenScript.replace(once(brokenScript, 'export const GROUND_PREFIX_MAX_STEPS'), () => 'export const GROUND_PREFIX_MAX_X');
  brokenScript = inSection(brokenScript, GROUND_FROM, GROUND_TO, (s) => s.split('groundSnapshotFileName(').join('renamedName('));
  brokenScript = inSection(brokenScript, PRECHECK_FROM, PRECHECK_TO, (s) => s.split('interactionHistory(').join('renamedHistory('));
  let brokenCommand = COMMAND;
  for (const token of ['--prefix', 'Grounding after an interaction.', CAP_PHRASE]) brokenCommand = without(brokenCommand, token);

  const r = prefix({ scriptText: brokenScript, commandText: brokenCommand });
  assert.equal(r.ok, false);
  assert.ok(r.findings.length >= 7, `expected one finding per broken rule, got ${r.findings.length}: ${JSON.stringify(r.findings)}`);
  for (const f of r.findings) {
    assert.ok(f.message.startsWith(PREFIX), `a finding does not start with ${PREFIX}: ${f.message}`);
    assert.equal(f.message.includes('step example'), false, f.message);
    assert.equal(f.message.includes('is outside the closed vocabulary'), false, f.message);
  }

  // The same broken inputs are silent without the flag: the base rules never knew the prefix.
  const quiet = checkQaRunContract({ scriptText: brokenScript, commandText: brokenCommand, results: [] });
  assert.deepEqual(quiet.findings, []);

  // A null input is the missing-file finding it always was, and the new rules add nothing to it and throw nothing.
  /** @type {any} */ let nulls;
  assert.doesNotThrow(() => {
    nulls = checkQaRunContract({ scriptText: null, commandText: null, results: [], requirePrefix: true });
  });
  assert.equal(nulls.ok, false);
  assert.deepEqual(
    nulls.findings.map((/** @type {any} */ f) => f.message),
    [`missing or unreadable file: plugins/relay/scripts/qa-run.mjs`, `missing or unreadable file: ${COMMAND_FILE}`],
  );
});

// ---------------------------------------------------------------------------
// 2. The prose: the command doc
// ---------------------------------------------------------------------------

/** The doc's paragraphs, each flattened to one line. */
const PARAGRAPHS = COMMAND.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim());
const LINES = COMMAND.split('\n');

/**
 * @param {string} start the opening words of a paragraph, which must identify exactly one paragraph
 * @returns {string}
 */
function paragraphStarting(start) {
  const found = PARAGRAPHS.filter((p) => p.startsWith(start));
  assert.equal(found.length, 1, `exactly one paragraph must start with ${start}, found ${found.length}`);
  return found[0];
}
/** @param {string} paragraph @param {string[]} phrases @param {string} label */
function assertPhrases(paragraph, phrases, label) {
  for (const phrase of phrases) assert.ok(paragraph.includes(phrase), `${label} lacks: ${phrase}`);
}

test('AC-18 the doc teaches the mode in one block after the Personal data paragraph and before the next step example, with the ground flag named where the flags are listed', () => {
  // The paragraph openings other tests slice on stay unique, and the new block is a paragraph of its own.
  for (const start of ['Grounding browser steps.', 'Grounding rules.', 'Personal data.', 'The closed vocabulary.', 'Grounding after an interaction.']) {
    paragraphStarting(start);
  }
  const at = PARAGRAPHS.findIndex((p) => p.startsWith('Grounding after an interaction.'));
  assert.ok(PARAGRAPHS.findIndex((p) => p.startsWith('Personal data.')) < at, 'the block must follow the Personal data paragraph');
  assert.ok(at < PARAGRAPHS.findIndex((p) => p.startsWith('One literal `query` step')), 'the block must come before the query example');

  const flags = paragraphStarting('Append ` --role "<role>"`');
  assertPhrases(flags, ["and ` --prefix '<json>'` to ground an element that exists only after an interaction (see Grounding after an interaction below)", 'MSYS rewrites a leading-slash argument'], 'the paragraph that lists the flags');
});

test('AC-11 the doc example is a valid prefix for the runner own parser, and the PowerShell 5.1 note is true of that same example: with its double quotes removed it is refused', () => {
  const example = LINES.filter((l) => l.includes("--prefix '["));
  assert.equal(example.length, 1, `exactly one example line carries a --prefix argument, found ${example.length}`);
  const line = example[0];
  assert.ok(line.startsWith('MSYS_NO_PATHCONV=1 node '), line);
  assert.ok(line.includes('ground --root "<target_root>"') && line.includes('--route "/tarefas"') && line.includes('--role "<role>"'), line);
  const json = /--prefix '(.*)'$/.exec(line)?.[1];
  assert.ok(json !== undefined, `the argument is not single-quoted at the end of the line: ${line}`);
  const parsed = parseGroundPrefix(/** @type {string} */ (json));
  assert.equal(parsed.ok, true, `the runner refuses the example of its own doc: ${JSON.stringify(parsed)}`);
  assert.deepEqual(/** @type {any} */ (parsed).steps, [{ action: 'click', role: 'button', name: 'Não concluídas' }]);

  // What Windows PowerShell 5.1 hands the script for that single-quoted argument.
  const mangled = parseGroundPrefix(/** @type {string} */ (json).replace(/"/g, ''));
  assert.equal(mangled.ok, false, 'a prefix without its double quotes was accepted');
  const note = paragraphStarting('The prefix accepts only');
  assertPhrases(note, ['Quote the JSON in single quotes: Windows PowerShell 5.1 removes the double quotes inside a single-quoted argument and the script then refuses it', 'run the line from Git Bash, a POSIX shell or PowerShell 7'], 'the restrictions paragraph');
});

test('AC-11 the doc states the restrictions with the caps the exported constants carry, and the halts: exit codes, the named codes, nothing written', () => {
  const restrictions = paragraphStarting('The prefix accepts only');
  assertPhrases(
    restrictions,
    [
      `The prefix accepts only \`goto\`, \`click\` and \`fill\` steps, ${CAP_PHRASE}, and at least one \`click\` or \`fill\`.`,
      `a \`fill\` carries a string \`value\` of at most ${GROUND_PREFIX_VALUE_MAX} characters`,
      'never by `selector`',
      'A `{{name}}` binding is refused, because `ground` runs before any seed.',
      'every step must match exactly one element at the moment it is replayed, and a `goto` must stay on the guard-approved origin',
      'only once two successive snapshots are equal, exactly as for a plain route',
    ],
    'the restrictions paragraph',
  );
  const halts = paragraphStarting('A prefix step that matches zero or more than one element');
  assertPhrases(
    halts,
    [
      'or that cannot be performed, halts `GROUND_PREFIX_FAILED`: the exit is non-zero and no snapshot and no `GROUNDED:` line are written',
      'A locator that names a value the redaction rules withhold halts the same way before the browser starts',
      'a `goto` that leaves the guard-approved origin halts `FAILED_NON_LOCAL_TARGET` before any request',
      'A malformed prefix exits 2 with `GROUND_PREFIX_INVALID` and the usage text and writes nothing.',
    ],
    'the halts paragraph',
  );
});

test('AC-11 the doc states the file the prefix writes and the rule that consumes it: a different file that never overwrites the plain one, a digest in place of a typed value, and exactly the case own steps', () => {
  const file = paragraphStarting('The snapshot of a prefix');
  assertPhrases(
    file,
    [
      'is a different file from the plain snapshot of the route and never overwrites it',
      '`grounding/<role>--<route>--after-<digest>.snapshot.json`',
      'where the route is the path the page is on after the replay',
      'a SHA-256 digest in place of every typed value, never the value',
      'only when the steps of the case before that step are exactly the prefix',
      "the case's own `goto` of the `--route` path followed by the steps of `--prefix`, in the same order and with the same values",
      '(after an `expect_url`, the route that step names)',
      'Only the `goto`, `click` and `fill` steps of the case count, and an assertion between them is ignored.',
      'Every other step is grounded against the plain snapshot exactly as before.',
      'Write a `fill` value of a prefix only when the steps of the report state it.',
    ],
    'the file paragraph',
  );
});

test('AC-11 the doc states the risk of the replay plainly: a real interaction, made at plan time and never undone, no seed, and what to do when the element is still not listed', () => {
  const risk = paragraphStarting('A replayed `click` or `fill` is a real interaction');
  assertPhrases(
    risk,
    [
      'A replayed `click` or `fill` is a real interaction with the local application, made at plan time and never undone.',
      'A click that submits a form, deletes a row or toggles a setting changes the state of the local environment the guard approved',
      'the runner cannot tell a harmless click from a destructive one',
      'never prefix a step whose manual wording submits, saves, deletes or sends',
      '`ground` runs no seed, so the page shows the state the local application holds now, not the state the declaration of the case would seed',
      'decline the case with `UNGROUNDABLE_AFTER_INTERACTION`',
      'A response that arrives later than the one-second pair may be missed',
    ],
    'the risk paragraph',
  );

  const rules = paragraphStarting('Grounding rules.');
  assertPhrases(rules, ['Elements that only appear after an interaction are not in the plain snapshot: ground them with a prefix (see Grounding after an interaction below), and decline a case that still needs one with `UNGROUNDABLE_AFTER_INTERACTION`.'], 'the grounding rules paragraph');
  assert.equal(rules.includes('cannot be grounded, so a case that needs one is declined'), false, 'the sentence the prefix made false is still there');
});

test('AC-11 the honesty rules tell the planner to plan a prefix only from the steps of the case itself, with a value the report states, and never one that submits', () => {
  const at = LINES.findIndex((l) => l.startsWith('Honesty rules:'));
  assert.ok(at !== -1, 'the honesty rules section is missing');
  /** @type {string[]} */ const bullets = [];
  for (const l of LINES.slice(at + 1)) {
    if (l.startsWith('#')) break;
    if (l.startsWith('- ')) bullets.push(l.slice(2).trim());
    else if (l.startsWith('  ') && bullets.length > 0) bullets[bullets.length - 1] += ` ${l.trim()}`;
  }
  const found = bullets.filter((b) => b.startsWith('Plan a `ground` prefix only from'));
  assert.equal(found.length, 1, `exactly one honesty bullet must start with Plan a \`ground\` prefix, found ${found.length}`);
  assertPhrases(
    found[0],
    ['the `goto`, `click` and `fill` steps of the case itself', 'write a prefix `fill` value only when the steps of the report state it', 'never prefix a step whose manual wording submits, saves, deletes or sends'],
    'the honesty bullet',
  );
});

test('AC-10 carry-over DQ18: the doc says a navigating click does not reset the absence anchor, and the runner agrees: only a goto resets it, and an expect_url that moves the route needs a positive step on the page it lands on', () => {
  const paragraph = paragraphStarting('`expect_not_visible` takes `role` and `name`');
  assertPhrases(
    paragraph,
    [
      'an `expect_visible`, `expect_text`, `expect_value` or `expect_state` step since the last `goto`',
      'A `click` that navigates to another page does not reset that anchor',
      'follow a navigating `click` with an `expect_url` of the new path and a positive step on the page it lands on before any `expect_not_visible`',
      // PRD AC-22: the sentence that stated the snapshot-only rule is reworded to the two grounding sources.
      'The element is grounded like any other locator step: by the plain snapshot, by the one a `--prefix` ground wrote after the interactions of the case, or by the report\'s own words (see Grounding rules below).',
    ],
    'the expect_not_visible paragraph',
  );
  assert.equal(paragraph.includes('is still `UNGROUNDABLE_AFTER_INTERACTION`'), false, 'the sentence the prefix made false is still there');
  assert.equal(paragraph.includes('The element must be one the snapshot of that page state already lists'), false, 'the snapshot-only sentence is still there');

  const goto = { action: 'goto', path: '/tarefas' };
  const heading = { action: 'expect_visible', role: 'heading', name: 'Tarefas' };
  const navigate = { action: 'click', role: 'link', name: 'Detalhes' };
  const landed = { action: 'expect_url', path: '/tarefas/5' };
  const absent = { action: 'expect_not_visible', text: 'Rascunho' };
  assert.equal(validateSteps('browser', [goto, heading, navigate, absent], []), null, 'a click reset the anchor, which the doc says it does not');
  const stale = validateSteps('browser', [goto, heading, navigate, landed, absent], []);
  assert.equal(stale?.code, 'PLAN_ENTRY_INVALID', 'the absence on the new page was accepted with no positive step on it');
  assert.match(String(stale?.reason), /^step 5:/);
  assert.equal(validateSteps('browser', [goto, heading, navigate, landed, { action: 'expect_visible', role: 'heading', name: 'Detalhe' }, absent], []), null);
  assert.equal(validateSteps('browser', [goto, heading, goto, absent], [])?.code, 'PLAN_ENTRY_INVALID', 'a goto of the same path did not reset the anchor');
});

test('AC-10 carry-over DQ19: the doc says a checked step on an aria-checked mixed element is blocked and that a native indeterminate checkbox is not detected, and the older sentence is gone', () => {
  const paragraph = paragraphStarting('`expect_state` takes `role` and `name`');
  assertPhrases(
    paragraph,
    [
      '(a button with no `aria-expanded`, a `details` disclosure, a non-checkbox) blocks the case `STEP_NOT_PERFORMABLE` and never passes as collapsed or unchecked',
      'and so does a `checked` step on an element whose `aria-checked` is `mixed`',
      'The runner reads only that attribute',
      'a native checkbox whose DOM `indeterminate` property is set exposes no `aria-checked`, is not detected, and is read as Playwright reports its checked state',
    ],
    'the expect_state paragraph',
  );
  assert.equal(paragraph.includes('a checkbox whose state is mixed'), false, 'the older, broader sentence is still there');
});

test('AC-18 carry-over DQ20: the expect_value paragraph states its re-read window, which follows the exported settle constant, on one physical line', () => {
  const window = `for up to ${ASSERT_SETTLE_MS / 1000} seconds`;
  const paragraph = paragraphStarting('`expect_value` takes `role` and `name`');
  assert.ok(paragraph.includes(`The value is re-read ${window} before the comparison fails.`), `the paragraph does not state the window: ${paragraph}`);
  // The contract matches the window with a raw includes on the whole doc, where the other paragraphs already carry it;
  // here it must sit on a physical line of this paragraph.
  const start = LINES.findIndex((l) => l.startsWith('`expect_value` takes `role` and `name`'));
  const end = LINES.findIndex((l, i) => i > start && l.trim() === '');
  assert.ok(start !== -1 && end > start);
  assert.ok(LINES.slice(start, end).some((l) => l.includes(window)), `no physical line of the expect_value paragraph carries ${window}`);
  // The pinned phrases of the paragraph stay.
  assertPhrases(paragraph, ['never the value, and the final screenshot masks the field', 'blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted'], 'the expect_value paragraph');
});

// ---------------------------------------------------------------------------
// 3. The redaction policy
// ---------------------------------------------------------------------------

test('AC-11 the Post-interaction snapshots bullet of the redaction policy states the withholding, the refusal before the browser, the digest, where the value can and cannot be, and does not claim the file is free of it', () => {
  const lines = POLICY.split('\n');
  const heading = lines.indexOf('### Snapshots, screenshots and personal data');
  const closing = lines.indexOf('## What this policy is NOT');
  assert.ok(heading !== -1 && closing > heading, `section order: ${heading} ${closing}`);
  const section = lines.slice(heading, closing);
  const starts = section.map((l, i) => (l.startsWith('- **Post-interaction snapshots.**') ? i : -1)).filter((i) => i !== -1);
  assert.equal(starts.length, 1, 'the Post-interaction snapshots bullet must occur once, inside the snapshots subsection');
  const inputValues = section.findIndex((l) => l.startsWith('- **Input values.**'));
  assert.ok(inputValues !== -1 && inputValues < starts[0], 'the bullet must follow the Input values bullet');
  let end = starts[0] + 1;
  while (end < section.length && section[end].startsWith('  ')) end++;
  const bullet = section.slice(starts[0], end).join(' ').replace(/\s+/g, ' ');
  assertPhrases(
    bullet,
    [
      'withheld by the same rules, entry by entry',
      'A prefix locator that names a withheld value is refused before the browser starts',
      'holds no typed value, only a SHA-256 digest, never in clear',
      'prints the value on no terminal line and writes it to no other file',
      'so they can echo a typed value the page renders back',
      'an entry is withheld only for a registered secret, an e-mail address or a `regex:` match, and a typed value is not registered',
      "the run directory's ignored `grounding/`, whose ignore rule is proven before it is written",
    ],
    'the Post-interaction snapshots bullet',
  );
  // The stronger sentence an earlier draft carried is untrue: the entries can echo the value.
  assert.equal(bullet.includes('holds no typed value.'), false, 'the bullet claims the snapshot file holds no typed value');
  assert.equal(/so the snapshot file holds no typed value/.test(bullet), false, bullet);
});
