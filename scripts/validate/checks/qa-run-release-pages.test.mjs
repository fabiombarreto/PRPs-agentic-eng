// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-1 Stable snapshot or a named failure (the site pages and the API reference state the settled wait, its interval and bound, and the named halt)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-3 Low-entropy values are not secrets (the pages state the floor by source, with the numbers the runner exports, and drop the clause that every IndexedDB string is a secret)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-5 Run evidence is ignored and the ignore is proven (the pages state the rules, the proof line and the halt, and the policy page mirrors the packaged policy)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-6 Every non-executed case carries a catalogued code (the pages name every key of the closed catalogue and the four classes)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (the pages say a typed value is only a digest in the recorded prefix while the snapshot entries can echo it)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-12 A network-request assertion (the pages say a listed path is redacted by the table only: an identifier or an e-mail address in it can be listed)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-13 One bounded re-mint (the pages state the single retry, its cap and that a second halt keeps its own code)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-19 --refresh states its role set (the pages state it as the plugin command document does)
/**
 * Phase 7 (release cut), the pages that describe the runner, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-7-release-cut.plan.md
 *              (AC-A3 grounding and prefix, AC-A4 redaction and run evidence, AC-A5 classification, AC-A6 the new
 *              steps and the leak caveats, AC-A7 the re-mint and the --refresh role set)
 *
 * Over the REAL pages (documentation/reference/commands.html, scripts.html, redaction-policy.html, the 0.46.0
 * changelog section and docs/api-reference.md), read from disk and never edited, with the runner's own exports as
 * the only source of every number, set and name a page states: no number is written a second time here, so a
 * recalibration of the runner turns the page red until it is edited (the dogfood is expected to recalibrate).
 * Text only: no browser, no child process, no fixture. Pages are read as TEXT (tags dropped, entities decoded,
 * whitespace collapsed), so a re-wrapped or re-marked paragraph is not a failure and a phrase that crosses a hard
 * wrap is found.
 *
 * What these sentences claim is proven by behavior elsewhere: the floor in qa-run-redaction-floor.test.mjs, the
 * prefix in qa-run-grounding-prefix-*.test.mjs, the e-mail withholding of a snapshot entry in
 * qa-run-ui-grounding.test.mjs, the e-mail listed in a request path in qa-run-network-evidence.test.mjs, the
 * re-mint decision in qa-run-remint-decision.test.mjs and the refresh role set in qa-run-refresh-roleset.test.mjs.
 *
 * Not pinned on purpose (open operator questions DQ21 to DQ39 of PRPs/reports/qa-runner-grounding-vocabulary-v2/
 * docs-update.md, and sentences the next phase or the operator is expected to change): the clause of the API
 * reference that says the exports are "pinned by the contract check"; a clause for a navigating click in the
 * absence step; what plan.json holds; the status row of the roadmap page; the 200-character cut of a listed
 * path, which is a literal inside the runner's own evidence writer and not an export.
 *
 * QA_V2P7_ROOT overlays the real tree for a mutation control: a file that exists under that root replaces the real
 * one, every other file is the real tree's; the runner is always the real one. Unset, the real tree is read.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import * as RUNNER from '../../../plugins/relay/scripts/qa-run.mjs';

const {
  REASON_CATALOGUE,
  RUNNER_OWNED_REASON_CODES,
  CASE_CLASSES,
  CLASS_UNCLASSIFIED,
  EXPECT_STATES,
  GROUND_PREFIX_ACTIONS,
  USAGE,
  RUN_IGNORE_RULES,
  GROUND_POLL_INTERVAL_MS,
  GROUND_STABLE_BOUND_MS,
  GROUND_PREFIX_MAX_STEPS,
  GROUND_PREFIX_VALUE_MAX,
  SESSION_VALUE_MIN_LENGTH,
  SESSION_VALUE_MIN_ENTROPY,
  ASSERT_SETTLE_MS,
  ASSERT_POLL_INTERVAL_MS,
  EXPECT_REQUESTS_SETTLE_MS,
  EXPECT_REQUESTS_COUNT_MAX,
  EXPECT_REQUESTS_EVIDENCE_MAX,
  LOGIN_REMINT_MAX_RETRIES,
  validateStep,
  validatePlanClassification,
} = RUNNER;

/** @param {string} rel @returns {string} the file (the overlay under QA_V2P7_ROOT when it has one) with LF line endings */
function read(rel) {
  const overlay = process.env.QA_V2P7_ROOT ? resolve(process.env.QA_V2P7_ROOT, rel) : null;
  const file = overlay !== null && existsSync(overlay) ? overlay : resolve(rel);
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

const ENTITIES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d', mdash: '\u2014', ndash: '\u2013', rarr: '\u2192', ge: '\u2265', le: '\u2264', nbsp: ' ' });
/** @param {string} s @returns {string} the entities decoded, nothing else changed */
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&([a-z]+);/gi, (e, name) => ENTITIES[name] ?? e);
/** @param {string} html @returns {string} the visible text, entities decoded and whitespace collapsed */
function htmlText(html) {
  return decode(
    html
      .replace(/<\/?(?:dt|dd|dl|p|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|div|pre|br|section)\b[^>]*>/gi, ' ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}
/** @param {string} md @returns {string} markdown with the code backticks dropped and whitespace collapsed */
const mdText = (md) => md.replace(/`/g, '').replace(/\s+/g, ' ').trim();
/** @param {string} text @returns {string[]} the sentences of a collapsed text */
const sentencesOf = (text) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
/** @param {string[]} sentences @param {...RegExp} patterns @returns {string[]} the sentences matching every pattern */
const having = (sentences, ...patterns) => sentences.filter((s) => patterns.every((p) => p.test(s)));

/** @param {number} ms @returns {string} whole seconds as the pages write them */
const secs = (ms) => `${ms / 1000} second${ms === 1000 ? '' : 's'}`;
/** @param {readonly string[]} items @param {string} [word] @returns {string} "a, b and c" (or "a, b or c") */
const list = (items, word = 'and') => `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
const CARDINAL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const ORDINAL = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
/** @param {(n: number) => boolean} accepts @param {number} from @param {number} to @returns {number} the largest accepted n, or -1 */
function largest(accepts, from, to) {
  let best = -1;
  for (let n = from; n <= to; n++) if (accepts(n)) best = n;
  return best;
}

/** @param {string} text @param {string} from the start marker @param {string} next the tag that ends the region @returns {string} */
function region(text, from, next) {
  const a = text.indexOf(from);
  assert.ok(a !== -1, `start marker not found: ${from}`);
  const b = text.indexOf(next, a + from.length);
  return text.slice(a, b === -1 ? text.length : b);
}
/** @param {string} markup @param {string} label @returns {string} the visible text of the one <dd> that follows <dt>label</dt> */
function row(markup, label) {
  const found = [...markup.matchAll(new RegExp(`<dt>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</dt>\\s*<dd>([\\s\\S]*?)</dd>`, 'g'))];
  assert.equal(found.length, 1, `exactly one <dt>${label}</dt> row is required in the entry, found ${found.length}`);
  return htmlText(found[0][1]);
}
/** @param {string} prefix @returns {string} the one markdown table row of the API reference that starts with it */
function apiRow(prefix) {
  const found = API.split('\n').filter((l) => l.startsWith(prefix));
  assert.equal(found.length, 1, `exactly one row of docs/api-reference.md must start with ${prefix}, found ${found.length}`);
  return found[0];
}
/** @param {string} text @param {string[]} phrases @param {string} label */
function assertPhrases(text, phrases, label) {
  for (const phrase of phrases) assert.ok(text.includes(phrase), `${label} lacks: ${phrase}`);
}

const COMMANDS = read('documentation/reference/commands.html');
const SCRIPTS = read('documentation/reference/scripts.html');
const POLICY_PAGE = read('documentation/reference/redaction-policy.html');
const POLICY_MD = read('plugins/relay/resources/redaction-policy.md');
const AUTH_SCRIPTS_DOC = read('plugins/relay/commands/relay-auth-scripts.md');
const CHANGELOG = read('documentation/changelog.html');
const API = read('docs/api-reference.md');

const QA_ENTRY = region(COMMANDS, '<h3 id="relay-qa-run"', '<h3 ');
const AUTH_ENTRY = region(COMMANDS, '<h3 id="relay-auth-scripts"', '<h3 ');
const RUN_ENTRY = region(SCRIPTS, '<h2 id="qa-run"', '<h2 ');
const POLICY_SECTION = region(POLICY_PAGE, '<h2 id="qa-runner-evidence"', '<h2 ');
const RELEASE_046 = region(CHANGELOG, '<h2 id="v0-46-0"', '<h2 ');
const API_QA_RUN = apiRow('| `/relay-qa-run ');
const API_AUTH_SCRIPTS = apiRow('| `/relay-auth-scripts ');
const API_RUNNER = apiRow('| `qa-run.mjs` ');

/** The numbers the runner exports that the pages state, and the limits its validators enforce (probed, not copied). */
const URL_CONTAINS_MAX = largest((n) => validateStep('browser', { action: 'expect_requests', method: 'GET', url_contains: `/${'a'.repeat(n - 1)}`, count: 1 }) === null, 1, 1000);
const OBJECTIVE_STEPS_MAX = largest((n) => validatePlanClassification({ class: 'automatable', objective_steps: n }) === null, 0, 1000);
const ENTROPY = SESSION_VALUE_MIN_ENTROPY.toFixed(1);
const PREFIX_ACTIONS = list(GROUND_PREFIX_ACTIONS);
const WAIT = `${secs(GROUND_POLL_INTERVAL_MS)} apart, are equal within ${secs(GROUND_STABLE_BOUND_MS)}`;
const IGNORES = list(RUN_IGNORE_RULES);
const REMINT_CAP = LOGIN_REMINT_MAX_RETRIES === 1 ? 'at most once per role per run' : `at most ${LOGIN_REMINT_MAX_RETRIES} times per role per run`;
const KEYS = Object.keys(REASON_CATALOGUE);
const DECLARABLE = KEYS.filter((k) => !RUNNER_OWNED_REASON_CODES.includes(k));
const SCREAMING = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;

test('AC-A5 AC-A6 the url_contains bound and the objective-step bound the pages state are probed from the validators of the runner and are real limits, not the end of the search', () => {
  assert.ok(URL_CONTAINS_MAX > 1 && URL_CONTAINS_MAX < 1000, `url_contains bound probe: ${URL_CONTAINS_MAX}`);
  assert.ok(OBJECTIVE_STEPS_MAX > 0 && OBJECTIVE_STEPS_MAX < 1000, `objective_steps bound probe: ${OBJECTIVE_STEPS_MAX}`);
  assert.ok(KEYS.length > RUNNER_OWNED_REASON_CODES.length && DECLARABLE.length > 0);
});

// ---------------------------------------------------------------------------
// AC-A3: the settled wait, the text candidates, the grounding prefix, the usage text
// ---------------------------------------------------------------------------

test('AC-A3 the pages state the settled wait with the interval and bound the runner exports, the named halts, the text candidates and the prefix cap', () => {
  const grounding = row(QA_ENTRY, 'Grounding');
  assertPhrases(
    grounding,
    [
      WAIT,
      'GROUND_UNSTABLE',
      'paragraph, list-item and cell lines',
      `at most ${GROUND_PREFIX_MAX_STEPS} flat ${PREFIX_ACTIONS} steps`,
      'GROUND_PREFIX_INVALID',
      'GROUND_PREFIX_FAILED',
      '--after-<digest>',
      'MSYS_NO_PATHCONV=1',
      'is a real interaction with the local application',
    ],
    'commands.html Grounding row',
  );

  const scripts = htmlText(RUN_ENTRY);
  assertPhrases(
    scripts,
    [
      WAIT,
      'GROUND_UNSTABLE',
      'paragraph, list-item and cell lines',
      `at most ${GROUND_PREFIX_MAX_STEPS} ${PREFIX_ACTIONS} steps`,
      `GROUND_POLL_INTERVAL_MS (${GROUND_POLL_INTERVAL_MS})`,
      `GROUND_STABLE_BOUND_MS (${GROUND_STABLE_BOUND_MS})`,
      `at most GROUND_PREFIX_MAX_STEPS (${GROUND_PREFIX_MAX_STEPS}) flat ${PREFIX_ACTIONS} steps`,
      `a fill value of at most GROUND_PREFIX_VALUE_MAX (${GROUND_PREFIX_VALUE_MAX}) characters`,
      'GROUND_PREFIX_INVALID',
      'GROUND_PREFIX_FAILED',
    ],
    'scripts.html qa-run.mjs entry',
  );

  const api = mdText(API_RUNNER);
  assertPhrases(api, [WAIT, 'GROUND_POLL_INTERVAL_MS, GROUND_STABLE_BOUND_MS', `at most ${GROUND_PREFIX_MAX_STEPS} flat ${PREFIX_ACTIONS} steps`, 'GROUND_UNSTABLE', 'GROUND_PREFIX_FAILED', 'GROUND_PREFIX_INVALID', '--prefix'], 'docs/api-reference.md qa-run.mjs row');
  const apiCommand = mdText(API_QA_RUN);
  assertPhrases(apiCommand, ['GROUND_UNSTABLE', `at most ${GROUND_PREFIX_MAX_STEPS} flat ${PREFIX_ACTIONS} steps`, 'GROUND_PREFIX_INVALID exits 2', 'GROUND_PREFIX_FAILED exits 1', 'UNGROUNDABLE_AFTER_INTERACTION'], 'docs/api-reference.md /relay-qa-run row');
});

test('AC-A3 the usage block of scripts.html lists, for each of the four modes, exactly the flags of the runner usage text', () => {
  const blocks = [...RUN_ENTRY.matchAll(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map((m) => decode(m[1])).filter((b) => b.includes('qa-run.mjs parse'));
  assert.equal(blocks.length, 1, `exactly one usage block must name qa-run.mjs parse, found ${blocks.length}`);
  /** @param {string} text @returns {Map<string, string[]>} the sorted flags of each mode line */
  const flagsByMode = (text) => {
    const out = new Map();
    for (const line of text.split('\n')) {
      const m = /qa-run\.mjs (parse|init|run|ground)\b(.*)$/.exec(line);
      if (m) out.set(m[1], [...(m[2].match(/--[a-z][a-z-]*/g) ?? [])].sort());
    }
    return out;
  };
  const page = flagsByMode(blocks[0]);
  const runner = flagsByMode(USAGE);
  assert.deepEqual([...runner.keys()].sort(), ['ground', 'init', 'parse', 'run'], 'the runner usage text lists the four modes');
  assert.deepEqual([...page.keys()].sort(), [...runner.keys()].sort(), 'the page lists a different set of modes');
  for (const [mode, flags] of runner) assert.deepEqual(page.get(mode), flags, `the flags of ${mode} differ between the page and the runner usage text`);
  assert.ok(/** @type {string[]} */ (runner.get('ground')).includes('--prefix'), 'the runner usage text no longer lists --prefix');
});

// ---------------------------------------------------------------------------
// AC-A4: the floor by source, the run-evidence ignore, the policy mirror, the stale clause
// ---------------------------------------------------------------------------

test('AC-A4 the pages state the session-value floor by source with the exported numbers, the ignore rules, the proof line and the halt, and say the floor is a judgment', () => {
  const redaction = row(QA_ENTRY, 'Redaction and run evidence');
  assertPhrases(
    redaction,
    [
      'registered for redaction source-first',
      'the token artifact, the declared sessionCookie and the cookie of every api_origins entry are always registered',
      `at least ${SESSION_VALUE_MIN_LENGTH} characters long`,
      `entropy of at least ${ENTROPY} bits per character`,
      'is not a part of the target origin',
      'The floor is a judgment, not a measurement',
      `ignores ${IGNORES}`,
      'git check-ignore',
      'IGNORE_PROOF: proven',
      'IGNORE_PROOF: not-applicable',
      'FAILED_IGNORE_UNPROVEN',
    ],
    'commands.html Redaction and run evidence row',
  );

  const scripts = row(RUN_ENTRY, 'Redaction floor and run evidence');
  assertPhrases(
    scripts,
    [
      'the token artifact, the declared session cookie and every api_origins cookie always',
      `SESSION_VALUE_MIN_LENGTH (${SESSION_VALUE_MIN_LENGTH}) characters and SESSION_VALUE_MIN_ENTROPY (${ENTROPY}) bits per character`,
      'never a part of the target origin',
      `(RUN_IGNORE_RULES: ${IGNORES})`,
      'git check-ignore -q',
      'IGNORE_PROOF: proven',
      'IGNORE_PROOF: not-applicable',
      'FAILED_IGNORE_UNPROVEN',
    ],
    'scripts.html Redaction floor and run evidence row',
  );

  const policy = htmlText(POLICY_SECTION);
  assertPhrases(
    policy,
    [
      `at least ${SESSION_VALUE_MIN_LENGTH} characters long and has a Shannon entropy of at least ${ENTROPY} bits per character`,
      'The floor is a judgment, not a measurement',
      IGNORES,
      'git check-ignore -q',
      'FAILED_IGNORE_UNPROVEN',
      'not-applicable',
      'PRPs/redaction-extensions.txt',
    ],
    'redaction-policy.html QA runner evidence section',
  );

  assertPhrases(mdText(API_RUNNER), [`SESSION_VALUE_MIN_LENGTH ${SESSION_VALUE_MIN_LENGTH}, SESSION_VALUE_MIN_ENTROPY ${ENTROPY}`, `.gitignore for ${IGNORES}`, 'IGNORE_PROOF: proven or not-applicable', 'FAILED_IGNORE_UNPROVEN'], 'docs/api-reference.md qa-run.mjs row');
  assertPhrases(mdText(API_QA_RUN), [`only at ${SESSION_VALUE_MIN_LENGTH} characters and ${ENTROPY} bits per character`, 'never a part of the target origin', `.gitignore for ${IGNORES}`, 'FAILED_IGNORE_UNPROVEN'], 'docs/api-reference.md /relay-qa-run row');
});

test('AC-A4 no live page still says every IndexedDB string is registered as a secret, and every "see ... below" pointer of the replaced clause names a row of its own entry', () => {
  const stale = /registers IndexedDB record keys and values as secrets/;
  assert.equal(stale.test(htmlText(COMMANDS)), false, 'commands.html still carries the stale registration clause');
  assert.equal(stale.test(htmlText(SCRIPTS)), false, 'scripts.html still carries the stale registration clause');
  assert.equal(stale.test(mdText(API)), false, 'docs/api-reference.md still carries the stale registration clause');
  // The dated 0.45.0 entry legitimately keeps its wording; everything above it is live.
  const live = CHANGELOG.slice(0, CHANGELOG.indexOf('<h2 id="v0-45-0"'));
  assert.ok(live.length > 1000 && live.includes('<h2 id="v0-46-0"'), 'the live part of the changelog was not located');
  assert.equal(stale.test(htmlText(live)), false, 'the live part of the changelog still carries the stale registration clause');

  for (const [label, entry] of [
    ['commands.html', QA_ENTRY],
    ['scripts.html', RUN_ENTRY],
  ]) {
    const pointers = [...htmlText(entry).matchAll(/\(see ([^)]+?) below\)/g)].map((m) => m[1]);
    assert.ok(pointers.length >= 1, `${label}: the replaced clause no longer points at the row that states the floor`);
    for (const target of pointers) assert.equal(entry.split(`<dt>${target}</dt>`).length - 1, 1, `${label}: "see ${target} below" names no row of the entry`);
  }
});

test('AC-A4 the redaction policy page mirrors the heading, the two subsections and the six bullet labels of the packaged policy, in order, and sits above the closing section', () => {
  const start = POLICY_MD.indexOf('\n## QA runner evidence');
  assert.ok(start !== -1, 'the packaged policy has no QA runner evidence section');
  const end = POLICY_MD.indexOf('\n## ', start + 4);
  const source = POLICY_MD.slice(start, end === -1 ? POLICY_MD.length : end);

  const heading = /^## (.+)$/m.exec(source);
  assert.ok(heading, 'the packaged section has no heading line');
  const pageHeading = /<h2 id="qa-runner-evidence">([\s\S]*?)<\/h2>/.exec(POLICY_SECTION);
  assert.equal(pageHeading && htmlText(pageHeading[1]), mdText(/** @type {RegExpExecArray} */ (heading)[1]));

  const sourceSubsections = [...source.matchAll(/^### (.+)$/gm)].map((m) => mdText(m[1]));
  const pageSubsections = [...POLICY_SECTION.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => htmlText(m[1]));
  assert.ok(sourceSubsections.length >= 2, 'the packaged section lost its subsections');
  assert.deepEqual(pageSubsections, sourceSubsections);

  const sourceLabels = [...source.matchAll(/^- \*\*([^*]+\.)\*\*/gm)].map((m) => mdText(m[1]));
  const pageLabels = [...POLICY_SECTION.matchAll(/<li><strong>([^<]+\.)<\/strong>/g)].map((m) => htmlText(m[1]));
  assert.ok(sourceLabels.length >= 1, 'the packaged section lost its bullet labels');
  assert.deepEqual(pageLabels, sourceLabels);

  assert.ok(POLICY_PAGE.indexOf('<h2 id="qa-runner-evidence">') < POLICY_PAGE.indexOf('<h2 id="what-this-is-not">'), 'the section must sit above the closing section');
  assert.ok(htmlText(POLICY_PAGE.slice(0, POLICY_PAGE.indexOf('<h2'))).includes('A further section covers the evidence the QA runner writes'), 'the page subtitle does not name the new section');
});

// ---------------------------------------------------------------------------
// AC-A5: the classes and the closed catalogue
// ---------------------------------------------------------------------------

test('AC-A5 the pages name the four classes and every code of the closed catalogue, the runner-owned one as derived, and what a value outside the sets becomes', () => {
  const classification = row(QA_ENTRY, 'Classification');
  for (const cls of CASE_CLASSES) assert.ok(classification.includes(cls), `commands.html Classification row does not name the class ${cls}`);

  const sentences = sentencesOf(classification);
  const declared = having(sentences, /closed catalogue/);
  assert.equal(declared.length, 1, `exactly one sentence must state the closed catalogue, found ${declared.length}`);
  assert.deepEqual([...new Set(declared[0].match(SCREAMING) ?? [])].sort(), [...DECLARABLE].sort(), 'the codes the page lists as declarable are not the declarable keys of REASON_CATALOGUE');

  const derived = having(sentences, /derived by the runner/);
  assert.equal(derived.length, 1, `exactly one sentence must state the runner-owned code, found ${derived.length}`);
  assert.deepEqual([...new Set(derived[0].match(SCREAMING) ?? [])].sort(), [...RUNNER_OWNED_REASON_CODES].sort());
  assert.ok(derived[0].includes(`The ${ORDINAL[KEYS.length]} member`), `the page does not call the runner-owned code the ${ORDINAL[KEYS.length]} member of a catalogue of ${KEYS.length}`);

  assertPhrases(
    classification,
    [
      'PLAN_ENTRY_INVALID',
      `NO_PLAN_ENTRY, a planner defect reported as ${CLASS_UNCLASSIFIED}`,
      'a classification block',
      'the four-key counts partition is unchanged',
      'a partially executed case is never counted in the rate',
    ],
    'commands.html Classification row',
  );

  const scripts = row(RUN_ENTRY, 'Classification');
  assertPhrases(scripts, ['CASE_CLASSES', 'REASON_CATALOGUE', 'RUNNER_OWNED_REASON_CODES', 'PLAN_ENTRY_INVALID', 'a classification block', 'the four-key counts partition and the outcome vocabulary are unchanged', ...CASE_CLASSES], 'scripts.html Classification row');

  const api = API_QA_RUN;
  for (const key of KEYS) assert.ok(api.includes(`\`${key}\``), `docs/api-reference.md /relay-qa-run row does not name the catalogue code ${key}`);
  for (const cls of CASE_CLASSES) assert.ok(api.includes(`\`${cls}\``), `docs/api-reference.md /relay-qa-run row does not name the class ${cls}`);
  assertPhrases(mdText(api), ['PLAN_ENTRY_INVALID', 'NO_PLAN_ENTRY', `reported ${CLASS_UNCLASSIFIED}`, `objective_steps (0 to ${OBJECTIVE_STEPS_MAX})`, 'a classification block beside the unchanged four-key counts'], 'docs/api-reference.md /relay-qa-run row');
});

// ---------------------------------------------------------------------------
// AC-A6: the new steps, the request count and the honest caveats
// ---------------------------------------------------------------------------

test('AC-A6 the pages describe the session-less request, the three assertions and the request count with the exported bounds, the closed state set and the window', () => {
  const steps = row(QA_ENTRY, 'Step vocabulary');
  assertPhrases(
    steps,
    [
      '"session": "none"',
      'no cookie, no storage state and no derived header',
      'equals, contains or not_empty',
      'records which comparison ran and whether it passed, never the value',
      'valid only after a positive step on the same route since the last goto',
      `asserts ${list(EXPECT_STATES, 'or')}`,
      `re-read for up to ${secs(ASSERT_SETTLE_MS)}`,
      `a url_contains path of at most ${URL_CONTAINS_MAX} characters and a count from 0 to ${EXPECT_REQUESTS_COUNT_MAX}`,
      `until ${secs(EXPECT_REQUESTS_SETTLE_MS)} after the step starts`,
      'with service workers blocked',
      'FAILED_NON_LOCAL_TARGET',
      'evidence/case-<index>.requests-<step>.json',
      `at most ${EXPECT_REQUESTS_EVIDENCE_MAX} are listed`,
      `(${secs(ASSERT_SETTLE_MS)}, ${secs(EXPECT_REQUESTS_SETTLE_MS)}, ${EXPECT_REQUESTS_COUNT_MAX}, ${EXPECT_REQUESTS_EVIDENCE_MAX} and ${URL_CONTAINS_MAX}) are chosen, not measured`,
    ],
    'commands.html Step vocabulary row',
  );

  const scripts = row(RUN_ENTRY, 'Assertions and request count');
  assertPhrases(
    scripts,
    [
      '"session": "none"',
      'expect_value',
      'expect_not_visible',
      'expect_state (EXPECT_STATES)',
      'expect_requests',
      `ASSERT_SETTLE_MS (${ASSERT_SETTLE_MS})`,
      `ASSERT_POLL_INTERVAL_MS (${ASSERT_POLL_INTERVAL_MS})`,
      `EXPECT_REQUESTS_SETTLE_MS (${EXPECT_REQUESTS_SETTLE_MS})`,
      `EXPECT_REQUESTS_COUNT_MAX (${EXPECT_REQUESTS_COUNT_MAX})`,
      `EXPECT_REQUESTS_EVIDENCE_MAX (${EXPECT_REQUESTS_EVIDENCE_MAX})`,
      'evidence/case-<index>.requests-<step>.json',
    ],
    'scripts.html Assertions and request count row',
  );

  const api = mdText(API_QA_RUN);
  assertPhrases(
    api,
    [
      '"session": "none"',
      'expect_value (equals, contains or not_empty; the value is never written)',
      'expect_not_visible (valid only after a positive step on the same route since the last goto)',
      `expect_state (${list(EXPECT_STATES, 'or')})`,
      `a count from 0 to ${EXPECT_REQUESTS_COUNT_MAX}`,
      `until ${secs(EXPECT_REQUESTS_SETTLE_MS)} after the step starts`,
      `at most ${EXPECT_REQUESTS_EVIDENCE_MAX} listed`,
    ],
    'docs/api-reference.md /relay-qa-run row',
  );
});

test('AC-A6 every page that states a runner number says it is chosen, not measured, and the floor is called a judgment', () => {
  const commands = [row(QA_ENTRY, 'Grounding'), row(QA_ENTRY, 'Step vocabulary'), row(QA_ENTRY, 'Re-mint')];
  for (const text of commands) assert.ok(text.includes('chosen, not measured'), `a commands.html row that states numbers does not label them: ${text.slice(0, 60)}`);
  assert.ok(row(RUN_ENTRY, 'Chosen numbers').includes('are chosen, not measured'), 'the scripts.html Chosen numbers row does not say chosen, not measured');
  assert.ok(mdText(API_RUNNER).includes('Every number is chosen, not measured'), 'the API reference qa-run.mjs row does not label its numbers');
  assert.ok(mdText(API_QA_RUN).includes('The numbers are chosen, not measured'), 'the API reference /relay-qa-run row does not label its numbers');
  assert.ok(htmlText(POLICY_SECTION).includes('a judgment, not a measurement'), 'the policy page does not call the floor a judgment');
});

/** @type {[string, string][]} every live place that describes the snapshot written after a prefix replay or the request listing */
const CAVEAT_PAGES = [
  ['commands.html /relay-qa-run entry', htmlText(QA_ENTRY)],
  ['scripts.html qa-run.mjs entry', htmlText(RUN_ENTRY)],
  ['redaction-policy.html QA runner evidence section', htmlText(POLICY_SECTION)],
  ['docs/api-reference.md qa-run.mjs row', mdText(API_RUNNER)],
];

test('AC-A6 every page says a typed value is only a digest in the recorded prefix and that the entries of the snapshot are page text that can echo it', () => {
  for (const [label, text] of CAVEAT_PAGES) {
    const s = sentencesOf(text);
    assert.ok(having(s, /SHA-256 digest/).length >= 1, `${label} does not say a typed value is recorded as a SHA-256 digest`);
    const echo = having(s, /\bentries\b/, /\bcan echo (?:a |the )?(?:typed )?(?:value|it)\b/);
    assert.ok(echo.length >= 1, `${label} does not say the entries of a post-interaction snapshot can echo a typed value`);
  }
  const history = sentencesOf(htmlText(RELEASE_046));
  assert.ok(having(history, /SHA-256 digest/, /\bentries\b/, /\bcan echo it\b/).length >= 1, 'the 0.46.0 changelog entry does not carry the same caveat');
});

test('AC-A6 every page says a listed request path is redacted by the table only, can carry an identifier or an e-mail address, and that the e-mail rule is for snapshot entries; the file sits in the ignored evidence directory', () => {
  for (const [label, text] of CAVEAT_PAGES) {
    const s = sentencesOf(text);
    assert.ok(having(s, /\bpath\b/, /identifier/).length >= 1, `${label} does not say a path can carry an identifier no table recognizes`);
    assert.ok(having(s, /\bpath\b/, /e-mail/, /(?:not withheld|snapshot entries only|only for snapshot entries)/).length >= 1, `${label} does not say an e-mail address in a listed path is not withheld`);
    assert.ok(having(s, /ignored/, /evidence\//).length >= 1, `${label} does not say the request file sits in the ignored evidence/ directory`);
  }
});

// ---------------------------------------------------------------------------
// AC-A7: the bounded re-mint and the --refresh role set
// ---------------------------------------------------------------------------

test('AC-A7 the pages state the re-mint: the one halt, --force, the exported cap, a second halt keeping its own code, and the template unchanged', () => {
  /** @type {[string, string][]} */
  const pages = [
    ['commands.html Re-mint row', row(QA_ENTRY, 'Re-mint')],
    ['scripts.html Re-mint row', row(RUN_ENTRY, 'Re-mint')],
    ['docs/api-reference.md /relay-qa-run row', mdText(API_QA_RUN)],
  ];
  for (const [label, text] of pages) {
    const s = sentencesOf(text);
    assert.ok(having(s, /FAILED_PROBE_MARKER_ABSENT/, /--force/, /once more/).length >= 1, `${label} does not say the one halt is run once more with --force`);
    assert.ok(having(s, /second halt/, /(?:code of that halt|its own code|that halt's code)/).length >= 1, `${label} does not say a second halt keeps its own code`);
  }
  const commands = pages[0][1];
  assertPhrases(commands, [REMINT_CAP, 'never runs the mint command itself', 'is never retried', 'the login template and its stamp are unchanged'], 'commands.html Re-mint row');
  const scripts = pages[1][1];
  assertPhrases(scripts, [`LOGIN_REMINT_MAX_RETRIES (${LOGIN_REMINT_MAX_RETRIES})`, 'shouldRemintLogin', 'never the mint command', 'KIT_TEMPLATE_ID are unchanged'], 'scripts.html Re-mint row');
  assertPhrases(pages[2][1], [REMINT_CAP], 'docs/api-reference.md /relay-qa-run row');
});

test('AC-A7 the pages state which roles --refresh covers, and each statement is one the plugin command document already makes', () => {
  const claims = [/narrowed by --role/, /only the scripts of those roles that already exist/, /is not reported as refreshed/, /its script is left as it is/];
  const source = mdText(AUTH_SCRIPTS_DOC);
  /** @type {[string, string][]} */
  const pages = [
    ['commands.html /relay-auth-scripts entry', htmlText(AUTH_ENTRY)],
    ['docs/api-reference.md /relay-auth-scripts row', mdText(API_AUTH_SCRIPTS)],
  ];
  for (const claim of claims) {
    assert.ok(claim.test(source), `the plugin command document no longer states: ${claim}`);
    for (const [label, text] of pages) assert.ok(claim.test(text), `${label} does not state: ${claim}`);
  }
  // The kit narrower than the matrix, the clause AC-19 names, is in the document and in the command page.
  const narrower = /a kit narrower than the matrix is refreshed for its own roles only/;
  assert.ok(narrower.test(source) && narrower.test(pages[0][1]), 'the clause for a kit narrower than the matrix is missing from the document or from the commands.html entry');
});

// ---------------------------------------------------------------------------
// The API reference names only exports that exist
// ---------------------------------------------------------------------------

test('AC-A3 AC-A5 every name the API reference lists as an export of qa-run.mjs is an export of the runner, and the numbers the pages state are among them', () => {
  const exported = new Set(Object.keys(RUNNER));
  const from = API_RUNNER.indexOf('`REASON_CATALOGUE`');
  const to = API_RUNNER.indexOf('`USAGE`', from);
  assert.ok(from !== -1 && to > from, 'the list of exports that starts at `REASON_CATALOGUE` and ends at `USAGE` was not found in the qa-run.mjs row');
  const span = API_RUNNER.slice(from, to + '`USAGE`'.length);
  const named = [...span.matchAll(/`([A-Za-z_][A-Za-z0-9_]*)`/g)].map((m) => m[1]).filter((t) => /^(?:[A-Z][A-Z0-9_]+|[a-z]+(?:[A-Z][A-Za-z0-9]*)+)$/.test(t));
  assert.ok(named.length > 0);
  const missing = named.filter((n) => !exported.has(n));
  assert.deepEqual(missing, [], `the API reference lists names the runner does not export (a rename the page missed): ${missing.join(', ')}`);

  // The list is not vacuous: it names every exported number that the pages state, and every closed set.
  for (const n of ['GROUND_POLL_INTERVAL_MS', 'GROUND_STABLE_BOUND_MS', 'GROUND_PREFIX_MAX_STEPS', 'GROUND_PREFIX_VALUE_MAX', 'SESSION_VALUE_MIN_LENGTH', 'SESSION_VALUE_MIN_ENTROPY', 'ASSERT_SETTLE_MS', 'ASSERT_POLL_INTERVAL_MS', 'EXPECT_REQUESTS_SETTLE_MS', 'EXPECT_REQUESTS_COUNT_MAX', 'EXPECT_REQUESTS_EVIDENCE_MAX', 'LOGIN_REMINT_MAX_RETRIES', 'REASON_CATALOGUE', 'CASE_CLASSES', 'RUN_IGNORE_RULES', 'EXPECT_STATES']) {
    assert.ok(named.includes(n), `the API reference list does not name ${n}`);
    assert.ok(exported.has(n), `the runner does not export ${n}`);
  }
});
