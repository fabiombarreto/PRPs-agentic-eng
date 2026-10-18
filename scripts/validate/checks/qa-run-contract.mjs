#!/usr/bin/env node
// @ts-check
/**
 * qa-run-contract — pins the QA runner's contract.
 *
 * Fails when the runner script loses its closed outcome vocabulary, gains a fifth
 * outcome literal, loses its guard marker, its single write helper or its
 * human-gate statement; when the runner command loses its human-gate statement or
 * names a banned token; or when a tracked `results.json` carries a value outside
 * the contract (an unknown outcome, counts that do not partition the cases, a
 * degenerate stamp, a closed human gate, a pass or fail with no evidence).
 *
 * The reason-code catalogue and the pre-run classification are pinned too: a case
 * that carries a `class` must carry one of the four classes or `unclassified`, a
 * case that carries `objective_steps` must carry null or a non-negative integer,
 * and a `classification` block must equal what the cases recompute to (all tolerant
 * of older `results.json` files that lack the keys). With `requireCatalogue` the
 * runner script must define the catalogue and the classes once each, the catalogue
 * must hold the seven codes the plan contract names and never the omitted-case
 * marker, the command must document every code and class, and every marked
 * plan-entry example in the command must validate against the runner's own
 * validator.
 *
 * The `ground` mode is pinned with `requireGround`: the runner header and the
 * exported usage text must list the mode and its six flags, the script must name
 * the GROUND_UNSTABLE halt, the ground mode must not contain a swallowed
 * readiness wait (the stable-snapshot wait replaces it), and the command must
 * document the halt, the MSYS_NO_PATHCONV=1 note and the polling interval and
 * bound in seconds that the exported constants carry.
 *
 * Run-evidence privacy is pinned with `requirePrivacy`: the runner script must
 * name the FAILED_IGNORE_UNPROVEN halt, the IGNORE_PROOF line and the
 * check-ignore proof, define the ignore rules once, prove them in `init`
 * (which always writes the file), and in `ground` before the browser and in
 * `run` before the redaction table, so a proof can never move behind a write; and
 * the command must document the halt, the proof line, the ignore file and the
 * session-value floor in the characters and bits per character the runner
 * exports.
 *
 * The request without the role's session and the three browser assertions are
 * pinned with `requireVocabulary`: the runner script must define the request
 * options helper once, the http driver must route a session-less step through the
 * anonymous fetch, and the locator step must name each new action so none can
 * fall through into the text comparison; the runner's own validators must accept
 * a `session: "none"` http request and refuse any other value, refuse the key on
 * a browser step and a bare selector on a new assertion, and refuse an absence
 * with no earlier positive step; and the command must list every mode of the
 * script, document every new step and the re-read window in seconds that the
 * exported constant carries, and carry a marked literal example of the
 * session-less request and of each new assertion. Every message of these rules
 * starts with the word `vocabulary:`.
 *
 * Grounding after an interaction is pinned with `requirePrefix`: the runner script
 * must define the prefix cap once, name the GROUND_PREFIX_INVALID and
 * GROUND_PREFIX_FAILED halts, list `--prefix` in the exported ground usage line,
 * replay the prefix in the ground mode after the ignore proof and before the
 * stable-snapshot wait and name the snapshot file through its helper, and read the
 * interaction history and the post-interaction kind in the plan-time check and the
 * snapshot loader; the runner's own parser must accept a one-click prefix and refuse
 * a selector step, a binding, an assertion, a prefix over the cap and a bare goto;
 * the file name must keep the two snapshot kinds apart; the plan-time check must
 * ground a step after the interaction only from the post-interaction snapshot and
 * every earlier step from the plain one; and the command must document the flag,
 * both halts, the block that teaches the mode and the cap the exported constant
 * carries. Every message of these rules starts with the word `prefix:`.
 *
 * The request count and the bounded re-mint are pinned with `requireNetwork`: the
 * runner script must define the settle window and the re-mint cap once each, keep its
 * request observation helpers between two markers (each present once, in order) that
 * read the method and the URL of a request and nothing else (no header, body, cookie,
 * response or storage-state reader), wire the browser driver to the observation, the
 * settle wait, the window decision and the service-worker block, and run a kit login
 * script from exactly one site, in a bounded loop; the runner's own validators and
 * helpers must accept the closed `expect_requests` step, refuse the shapes that could
 * pass for the wrong reason, drop a query string and a fragment, match a path in its
 * encoded form and decide the re-mint only after the one halt that follows a fresh
 * mint; and the command must document the step, the window in seconds that the
 * exported constant carries, the re-mint with its cap, and carry a marked literal
 * example of the step. Every message of these rules starts with the word `network:`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  validateStep,
  validateSteps,
  EXPECT_STATES,
  ASSERT_SETTLE_MS,
  REASON_CATALOGUE,
  CASE_CLASSES,
  CLASS_UNCLASSIFIED,
  validatePlanClassification,
  summarizeClassification,
  USAGE,
  GROUND_STABLE_BOUND_MS,
  GROUND_POLL_INTERVAL_MS,
  GROUND_PREFIX_MAX_STEPS,
  SESSION_VALUE_MIN_LENGTH,
  SESSION_VALUE_MIN_ENTROPY,
  parseGroundPrefix,
  groundSnapshotFileName,
  groundingStepKey,
  groundingPrefixKey,
  precheckGroundedSteps,
  EXPECT_REQUESTS_SETTLE_MS,
  LOGIN_REMINT_MAX_RETRIES,
  classifyObservedRequest,
  evaluateRequestWindow,
  shouldRemintLogin,
} from '../../../plugins/relay/scripts/qa-run.mjs';

const CHECK_NAME = 'qa-run-contract';

const SCRIPT_FILE = 'plugins/relay/scripts/qa-run.mjs';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const SEED_SCRIPT_FILE = 'plugins/relay/scripts/qa-seed.mjs';
const QUERY_MODULE_FILE = 'plugins/relay/scripts/qa-query.mjs';
const SEED_COMMAND_FILE = 'plugins/relay/commands/relay-qa-seed.md';

const OUTCOMES_LITERAL = "export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];";
const OUTCOME_VALUES = ['pass', 'fail', 'blocked', 'needs-human'];
const BANNED_IN_COMMAND = ['design-spec', 'relay-auth-setup', '.claude/PRPs', 'subagent_type']; // .claude/PRPs MUST NOT appear in the command
const STEP_RESULTS = ['passed', 'failed', 'not-run', 'human'];
const STEP_EXAMPLE_DRIVERS = ['http', 'browser'];
const STEP_EXAMPLE_PATTERN = /<!-- qa-step-example driver=(\w+) -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g;
const PLAN_ENTRY_EXAMPLE_PATTERN = /<!-- qa-plan-entry-example -->[ \t]*\r?\n```json\r?\n([\s\S]*?)\r?\n```/g;
const REQUIRED_CATALOGUE_CODES = [
  'UNGROUNDABLE_AFTER_INTERACTION',
  'EXTERNAL_CHANNEL',
  'VISUAL_JUDGEMENT',
  'PRODUCT_DEFECT',
  'STATE_UNCONFIRMED',
  'STEP_UNGROUNDED',
  'PARTIAL_REMAINDER',
];
const REQUIRED_CASE_CLASSES = ['automatable', 'needs-a-new-driver', 'human-by-nature', 'blocked-by-product'];
const ISO_MS =/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const VOCABULARY_PREFIX = 'vocabulary: ';
const PREFIX_PREFIX = 'prefix: ';
const NETWORK_PREFIX = 'network: ';
const NETWORK_ACTION = 'expect_requests';
/** What a request object offers beyond its method and its URL: none of it may be read by the observation helpers. */
const NETWORK_FORBIDDEN_READS = ['.headers(', '.allHeaders(', '.headerValue(', '.headersArray(', '.postData(', '.postDataBuffer(', '.postDataJSON(', '.response(', '.cookies(', '.storageState(', '.body(', '.text(', '.json('];
const NEW_BROWSER_ACTIONS = ['expect_value', 'expect_not_visible', 'expect_state'];
const RUNNER_MODES = ['parse', 'init', 'run', 'ground'];

/**
 * @typedef {{ message: string, file: string, line: number }} Finding
 */

/**
 * @param {string} text
 * @param {string} needle
 * @returns {number}
 */
function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

/**
 * @param {any} v
 * @returns {boolean}
 */
function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * The text from the first `from` marker up to the first `to` marker after it.
 * @param {string} text
 * @param {string} from
 * @param {string} to
 * @returns {string | null} null when either marker cannot be located in that order
 */
function sectionBetween(text, from, to) {
  const start = text.indexOf(from);
  if (start === -1) return null;
  const end = text.indexOf(to, start + from.length);
  return end === -1 ? null : text.slice(start, end);
}

/**
 * @param {any} obj a parsed results.json
 * @returns {string[]} finding messages
 */
export function validateResults(obj) {
  /** @type {string[]} */
  const msgs = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return ['results is not an object'];
  const cases = Array.isArray(obj.cases) ? obj.cases : null;
  if (cases === null) msgs.push('results.cases is missing or not an array');
  /** @param {any} v @param {string} label */
  const stamp = (v, label) => {
    if (typeof v !== 'string' || !ISO_MS.test(v)) msgs.push(`${label} is missing or not a UTC instant with milliseconds`);
    else if (v.endsWith('T00:00:00Z') || v.endsWith('T00:00:00.000Z')) msgs.push(`${label} is a degenerate midnight stamp`);
  };
  stamp(obj.started_at, 'started_at');
  stamp(obj.finished_at, 'finished_at');
  if (!obj.human_gate || obj.human_gate.status !== 'open') msgs.push('human_gate.status must be "open"');
  if (cases !== null) {
    const counts = obj.counts && typeof obj.counts === 'object' ? obj.counts : {};
    const sum = OUTCOME_VALUES.reduce((n, k) => n + (Number.isInteger(counts[k]) ? counts[k] : 0), 0);
    if (sum !== cases.length) msgs.push(`cases.length (${cases.length}) does not equal the sum of counts (${sum})`);
    const resolvedCases = cases.filter((c) => c !== null && typeof c === 'object' && c.reason_code === 'AUTOMATED_EVIDENCE');
    if (obj.record_resolved !== undefined) {
      if (!Number.isInteger(obj.record_resolved) || obj.record_resolved < 0 || obj.record_resolved !== resolvedCases.length) {
        msgs.push(`record_resolved (${JSON.stringify(obj.record_resolved)}) does not equal the number of AUTOMATED_EVIDENCE cases (${resolvedCases.length})`);
      }
      for (const [i, c] of cases.entries()) {
        if (c !== null && typeof c === 'object' && c.reason_code === 'AUTOMATED_EVIDENCE' && c.outcome !== 'pass' && c.outcome !== 'fail') {
          msgs.push(`cases[${i}] carries AUTOMATED_EVIDENCE with outcome ${JSON.stringify(c.outcome)}`);
        }
      }
    }
    const partialCases = cases.filter((c) => c !== null && typeof c === 'object' && c.reason_code === 'PARTIAL_REMAINDER');
    if (obj.partially_executed !== undefined) {
      if (!Number.isInteger(obj.partially_executed) || obj.partially_executed < 0 || obj.partially_executed !== partialCases.length) {
        msgs.push(`partially_executed (${JSON.stringify(obj.partially_executed)}) does not equal the number of PARTIAL_REMAINDER cases (${partialCases.length})`);
      }
    }
    for (const [i, c] of cases.entries()) {
      const label = `cases[${i}]`;
      if (c === null || typeof c !== 'object') {
        msgs.push(`${label} is not an object`);
        continue;
      }
      if (c.reason_code === 'PARTIAL_REMAINDER' && c.outcome !== 'needs-human') {
        msgs.push(`${label} carries PARTIAL_REMAINDER with outcome ${JSON.stringify(c.outcome)}`);
      }
      if (c.steps !== undefined) {
        if (!Array.isArray(c.steps)) {
          msgs.push(`${label}.steps is not an array`);
        } else {
          for (const [j, s] of c.steps.entries()) {
            if (s === null || typeof s !== 'object' || !STEP_RESULTS.includes(s.result)) {
              msgs.push(`${label}.steps[${j}].result ${JSON.stringify(s && typeof s === 'object' ? s.result : s)} is outside passed, failed, not-run, human`);
            }
          }
        }
      }
      if (!OUTCOME_VALUES.includes(c.outcome)) msgs.push(`${label}.outcome ${JSON.stringify(c.outcome)} is outside the closed vocabulary`);
      // The class and the objective-step count are optional: results written before they existed lack both.
      if (c.class !== undefined && !CASE_CLASSES.includes(c.class) && c.class !== CLASS_UNCLASSIFIED) {
        msgs.push(`${label}.class ${JSON.stringify(c.class)} is not one of the four classes or ${CLASS_UNCLASSIFIED}`);
      }
      if (c.objective_steps !== undefined && c.objective_steps !== null && (!Number.isInteger(c.objective_steps) || c.objective_steps < 0)) {
        msgs.push(`${label}.objective_steps ${JSON.stringify(c.objective_steps)} is not null or a non-negative integer`);
      }
      stamp(c.started_at, `${label}.started_at`);
      stamp(c.finished_at, `${label}.finished_at`);
      if ((c.outcome === 'pass' || c.outcome === 'fail') && (!Array.isArray(c.evidence) || c.evidence.length === 0)) {
        msgs.push(`${label} is ${c.outcome} with an empty evidence array`);
      }
    }
    if (obj.classification !== undefined) {
      const stored = obj.classification;
      if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) {
        msgs.push('classification is not an object');
      } else {
        /** @type {Record<string, any>} */
        const expected = summarizeClassification(cases.filter((c) => c !== null && typeof c === 'object'));
        for (const [key, want] of Object.entries(expected)) {
          if (key !== 'per_class') {
            if (stored[key] !== want) {
              msgs.push(`classification.${key} (${JSON.stringify(stored[key])}) does not equal the value the cases recompute to (${JSON.stringify(want)})`);
            }
            continue;
          }
          const storedPerClass = stored.per_class;
          if (storedPerClass === null || typeof storedPerClass !== 'object' || Array.isArray(storedPerClass)) {
            msgs.push('classification.per_class is not an object');
            continue;
          }
          for (const [name, n] of Object.entries(want)) {
            if (storedPerClass[name] !== n) {
              msgs.push(`classification.per_class.${name} (${JSON.stringify(storedPerClass[name])}) does not equal the number of ${name} cases (${n})`);
            }
          }
        }
      }
    }
  }
  return msgs;
}

/**
 * @param {{ scriptText?: string | null, commandText?: string | null, seedScriptText?: string | null, seedCommandText?: string | null, queryModuleText?: string | null, results?: { file: string, value: any }[], requireStepExamples?: boolean, requireCatalogue?: boolean, requireGround?: boolean, requirePrivacy?: boolean, requireVocabulary?: boolean, requirePrefix?: boolean, requireNetwork?: boolean }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkQaRunContract({ scriptText, commandText, seedScriptText, seedCommandText, queryModuleText, results, requireStepExamples = false, requireCatalogue = false, requireGround = false, requirePrivacy = false, requireVocabulary = false, requirePrefix = false, requireNetwork = false }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @param {string} message @param {string} file @param {number} [line] */
  const add = (message, file, line = 1) => findings.push({ message, file, line });

  if (scriptText == null) {
    add(`missing or unreadable file: ${SCRIPT_FILE}`, SCRIPT_FILE);
  } else {
    if (!scriptText.includes(OUTCOMES_LITERAL)) add(`the runner script must contain exactly: ${OUTCOMES_LITERAL}`, SCRIPT_FILE);
    const lines = scriptText.split(/\r?\n/);
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/outcome\s*[:=]\s*['"]([^'"]+)['"]/g)) {
        if (!OUTCOME_VALUES.includes(m[1])) add(`outcome literal ${JSON.stringify(m[1])} is outside the closed vocabulary`, SCRIPT_FILE, i + 1);
      }
      if (/(writeFileSync|appendFileSync|writeFile|rmSync|unlinkSync)\(/.test(l) && l.includes('qa-report.md')) {
        add('a write call names qa-report.md: the runner must never write the report', SCRIPT_FILE, i + 1);
      }
    });
    for (const marker of ['// GUARD-SITE', '// WRITE-SITE']) {
      const n = occurrences(scriptText, marker);
      if (n !== 1) add(`the runner script must contain ${marker} exactly once, found ${n}`, SCRIPT_FILE);
    }
    for (const call of ['writeFileSync(', 'renameSync(']) {
      const n = occurrences(scriptText, call);
      if (n !== 1) add(`the single-write-helper rule: ${call} must appear exactly once, found ${n}`, SCRIPT_FILE);
    }
    for (const required of ['toISOString', 'FAILED_NON_LOCAL_TARGET', 'auth-local-guard.mjs', 'HUMAN GATE STILL OPEN']) {
      if (!scriptText.includes(required)) add(`the runner script must contain ${required}`, SCRIPT_FILE);
    }
    if (requireCatalogue) {
      // The catalogue and the class set are defined once, in the runner, and nowhere else.
      for (const definition of ['export const REASON_CATALOGUE', 'export const CASE_CLASSES']) {
        const n = occurrences(scriptText, definition);
        if (n !== 1) add(`the runner script must define the catalogue with ${definition} exactly once, found ${n}`, SCRIPT_FILE);
      }
    }
    if (requireGround) {
      // The ground mode is listed in the header usage block and in the exported usage text.
      const importAt = scriptText.indexOf('\nimport ');
      const header = importAt === -1 ? '' : scriptText.slice(0, importAt);
      if (!header.includes('qa-run.mjs ground --root')) add('the runner script header must list the ground mode usage line (qa-run.mjs ground --root)', SCRIPT_FILE);
      const groundUsage = USAGE.split('\n').find((l) => l.includes('qa-run.mjs ground')) ?? '';
      if (groundUsage === '') {
        add('the runner usage text must list the ground mode (qa-run.mjs ground)', SCRIPT_FILE);
      } else {
        for (const flag of ['--root', '--feature', '--run-dir', '--route', '--role', '--env-handle']) {
          if (!groundUsage.includes(flag)) add(`the runner usage text must list the ground flag ${flag}`, SCRIPT_FILE);
        }
      }
      if (!scriptText.includes('GROUND_UNSTABLE')) add('the runner script must contain the named halt GROUND_UNSTABLE', SCRIPT_FILE);
      // The stable-snapshot wait replaces a swallowed readiness wait; the anonymous check elsewhere keeps its own.
      const groundStart = scriptText.indexOf('async function runGround(');
      const groundEnd = scriptText.indexOf('async function runGroundGuarded(');
      if (groundStart === -1 || groundEnd === -1 || groundEnd < groundStart) {
        add('the runner script must define the ground mode between async function runGround( and async function runGroundGuarded(', SCRIPT_FILE);
      } else if (scriptText.slice(groundStart, groundEnd).includes('waitForLoadState(')) {
        add('the ground mode must not call waitForLoadState(: a swallowed readiness wait is replaced by the stable-snapshot wait', SCRIPT_FILE);
      }
    }
    if (requirePrivacy) {
      // The halt, the proof line and the proof call are named, and the ignore rules are defined once.
      for (const token of ['FAILED_IGNORE_UNPROVEN', 'IGNORE_PROOF', 'check-ignore']) {
        if (!scriptText.includes(token)) add(`the runner script must contain ${token}`, SCRIPT_FILE);
      }
      const rulesDefinitions = occurrences(scriptText, 'export const RUN_IGNORE_RULES');
      if (rulesDefinitions !== 1) add(`the runner script must define the ignore rules with export const RUN_IGNORE_RULES exactly once, found ${rulesDefinitions}`, SCRIPT_FILE);
      // init always writes the file; ground proves before the browser; run proves before the redaction table.
      const initSection = sectionBetween(scriptText, 'async function runInit(', 'async function runRun(');
      if (initSection === null) {
        add('the runner script must define init between async function runInit( and async function runRun(', SCRIPT_FILE);
      } else {
        if (!initSection.includes('requireRunIgnore(')) add('init must prove the run directory ignore: its section must contain requireRunIgnore(', SCRIPT_FILE);
        if (!initSection.includes('alwaysWrite: true')) add('init must always write the run directory ignore file: its proof must pass alwaysWrite: true', SCRIPT_FILE);
      }
      /** @type {[string, string | null, string, string][]} */
      const orderings = [
        ['ground', sectionBetween(scriptText, 'async function runGround(', 'async function runGroundGuarded('), 'loadPlaywright(', 'the proof must precede the browser, the session and the snapshot'],
        ['run', sectionBetween(scriptText, 'async function runRun(', 'function runParse('), 'buildRedactionTable(', 'the proof must precede every case'],
      ];
      for (const [mode, section, later, why] of orderings) {
        if (section === null) {
          add(`the runner script must define the ${mode} mode so the ignore proof can be located in it`, SCRIPT_FILE);
          continue;
        }
        const proofAt = section.indexOf('requireRunIgnore(');
        const laterAt = section.indexOf(later);
        if (proofAt === -1) add(`the ${mode} mode must prove the run directory ignore: its section must contain requireRunIgnore(`, SCRIPT_FILE);
        else if (laterAt !== -1 && proofAt > laterAt) add(`the ${mode} mode must call requireRunIgnore( before ${later}: ${why}`, SCRIPT_FILE);
      }
    }
    if (requireVocabulary) {
      // The request options helper is defined once, and the http driver routes a session-less step through the anonymous fetch.
      const helperDefinitions = occurrences(scriptText, 'export function httpContextOptions(');
      if (helperDefinitions !== 1) {
        add(`${VOCABULARY_PREFIX}the runner script must define the request options helper with export function httpContextOptions( exactly once, found ${helperDefinitions}`, SCRIPT_FILE);
      }
      const httpSection = sectionBetween(scriptText, 'DRIVERS.http = async (', 'async function runLocatorStep(');
      if (httpSection === null) {
        add(`${VOCABULARY_PREFIX}the runner script must define the http driver before the locator step (DRIVERS.http = async ( then async function runLocatorStep( ), so the session-less request can be located`, SCRIPT_FILE);
      } else {
        for (const token of ['httpContextOptions(', 'fetchAnonymously(']) {
          if (!httpSection.includes(token)) add(`${VOCABULARY_PREFIX}the http driver must contain ${token}: a session-less step is sent through its own anonymous context`, SCRIPT_FILE);
        }
      }
      // Each new assertion has its own branch in the locator step, so none can fall through into the text comparison.
      const locatorSection = sectionBetween(scriptText, 'async function runLocatorStep(', 'DRIVERS.browser = async (');
      if (locatorSection === null) {
        add(`${VOCABULARY_PREFIX}the runner script must define the locator step before the browser driver (async function runLocatorStep( then DRIVERS.browser = async ( ), so the new assertions can be located`, SCRIPT_FILE);
      } else {
        for (const action of NEW_BROWSER_ACTIONS) {
          if (!locatorSection.includes(`'${action}'`)) add(`${VOCABULARY_PREFIX}the locator step must name '${action}': no new action may fall through into the text comparison`, SCRIPT_FILE);
        }
      }
    }
    if (requirePrefix) {
      // The cap is defined once, in the runner, and both ground halts are named.
      const capDefinitions = occurrences(scriptText, 'export const GROUND_PREFIX_MAX_STEPS');
      if (capDefinitions !== 1) {
        add(`${PREFIX_PREFIX}the runner script must define the prefix cap with export const GROUND_PREFIX_MAX_STEPS exactly once, found ${capDefinitions}`, SCRIPT_FILE);
      }
      for (const halt of ['GROUND_PREFIX_INVALID', 'GROUND_PREFIX_FAILED']) {
        if (!scriptText.includes(halt)) add(`${PREFIX_PREFIX}the runner script must contain the named halt ${halt}`, SCRIPT_FILE);
      }
      // The exported ground usage line lists the flag.
      const prefixUsage = USAGE.split('\n').find((l) => l.includes('qa-run.mjs ground')) ?? '';
      if (!prefixUsage.includes('--prefix')) add(`${PREFIX_PREFIX}the runner usage text must list the ground flag --prefix`, SCRIPT_FILE);
      // The replay runs after the ignore proof and before the stable-snapshot wait, and the file is named through its helper.
      const prefixGround = sectionBetween(scriptText, 'async function runGround(', 'async function runGroundGuarded(');
      if (prefixGround === null) {
        add(`${PREFIX_PREFIX}the runner script must define the ground mode between async function runGround( and async function runGroundGuarded(, so the replay can be located`, SCRIPT_FILE);
      } else {
        for (const token of ['replayGroundingPrefix(', 'groundSnapshotFileName(']) {
          if (!prefixGround.includes(token)) add(`${PREFIX_PREFIX}the ground mode must contain ${token}`, SCRIPT_FILE);
        }
        const proofAt = prefixGround.indexOf('requireRunIgnore(');
        const replayAt = prefixGround.indexOf('replayGroundingPrefix(');
        const waitAt = prefixGround.indexOf('waitForStableSnapshot(');
        if (replayAt !== -1 && proofAt !== -1 && replayAt < proofAt) {
          add(`${PREFIX_PREFIX}the ground mode must call requireRunIgnore( before replayGroundingPrefix(: the proof precedes every interaction`, SCRIPT_FILE);
        }
        if (replayAt !== -1 && waitAt !== -1 && replayAt > waitAt) {
          add(`${PREFIX_PREFIX}the ground mode must call replayGroundingPrefix( before waitForStableSnapshot(: the snapshot is taken after the interactions`, SCRIPT_FILE);
        }
      }
      // The plan-time check reads the interaction history and the post-interaction kind; the loader accepts that kind.
      const prefixCheck = sectionBetween(scriptText, 'export function precheckGroundedSteps(', 'export function summarizeEntries(');
      if (prefixCheck === null) {
        add(`${PREFIX_PREFIX}the runner script must define the plan-time check between export function precheckGroundedSteps( and export function summarizeEntries(, so its lookup can be located`, SCRIPT_FILE);
      } else {
        for (const token of ['interactionHistory(', 'isPostInteractionSnapshot(']) {
          if (!prefixCheck.includes(token)) add(`${PREFIX_PREFIX}the plan-time check must contain ${token}`, SCRIPT_FILE);
        }
      }
      const prefixLoader = sectionBetween(scriptText, 'function loadGroundingSnapshots(', 'async function executeCase(');
      if (prefixLoader === null) {
        add(`${PREFIX_PREFIX}the runner script must define the snapshot loader between function loadGroundingSnapshots( and async function executeCase(, so its schema gate can be located`, SCRIPT_FILE);
      } else if (!prefixLoader.includes('isPostInteractionSnapshot(')) {
        add(`${PREFIX_PREFIX}the snapshot loader must contain isPostInteractionSnapshot(: the post-interaction kind must be accepted`, SCRIPT_FILE);
      }
    }
    if (requireNetwork) {
      // The two numbers the doc follows are defined once, in the runner.
      for (const definition of ['export const EXPECT_REQUESTS_SETTLE_MS', 'export const LOGIN_REMINT_MAX_RETRIES']) {
        const n = occurrences(scriptText, definition);
        if (n !== 1) add(`${NETWORK_PREFIX}the runner script must define ${definition} exactly once, found ${n}`, SCRIPT_FILE);
      }
      // The observation helpers sit between two markers, each present once and in order, and read a request's method and URL only.
      const beginMarker = '// REQUEST-OBSERVATION-BEGIN';
      const endMarker = '// REQUEST-OBSERVATION-END';
      const beginCount = occurrences(scriptText, beginMarker);
      const endCount = occurrences(scriptText, endMarker);
      if (beginCount !== 1) add(`${NETWORK_PREFIX}the runner script must contain ${beginMarker} exactly once, found ${beginCount}`, SCRIPT_FILE);
      if (endCount !== 1) add(`${NETWORK_PREFIX}the runner script must contain ${endMarker} exactly once, found ${endCount}`, SCRIPT_FILE);
      if (beginCount === 1 && endCount === 1) {
        const cluster = sectionBetween(scriptText, beginMarker, endMarker);
        if (cluster === null) {
          add(`${NETWORK_PREFIX}${beginMarker} must come before ${endMarker}, so the request observation helpers can be located`, SCRIPT_FILE);
        } else {
          for (const read of ['.method()', '.url()']) {
            if (!cluster.includes(read)) add(`${NETWORK_PREFIX}the request observation helpers must read ${read} of a request`, SCRIPT_FILE);
          }
          for (const read of NETWORK_FORBIDDEN_READS) {
            if (cluster.includes(read)) add(`${NETWORK_PREFIX}the request observation helpers must not contain ${read}: nothing but the method and the URL of a request is read`, SCRIPT_FILE);
          }
        }
      }
      // The browser driver wires the observation, the settle wait, the window decision and the service-worker block.
      const networkDriver = sectionBetween(scriptText, 'DRIVERS.browser = async (', 'export function mintExpiryDue(');
      if (networkDriver === null) {
        add(`${NETWORK_PREFIX}the runner script must define the browser driver before export function mintExpiryDue( (DRIVERS.browser = async ( then export function mintExpiryDue( ), so the request observation wiring can be located`, SCRIPT_FILE);
      } else {
        for (const token of [`'${NETWORK_ACTION}'`, 'observeRequests(', 'settleRequestWindow(', 'evaluateRequestWindow(', "serviceWorkers: 'block'"]) {
          if (!networkDriver.includes(token)) add(`${NETWORK_PREFIX}the browser driver must contain ${token}`, SCRIPT_FILE);
        }
      }
      // A kit login script is run from one site, and the re-mint is a bounded loop decided by the pure helper.
      const networkLogin = sectionBetween(scriptText, 'function obtainSession(', 'async function prepareState(');
      if (networkLogin === null) {
        add(`${NETWORK_PREFIX}the runner script must define the session section between function obtainSession( and async function prepareState(, so the re-mint can be located`, SCRIPT_FILE);
      } else {
        for (const token of ['shouldRemintLogin(', 'runLoginScript(', 'isMintedRole(']) {
          if (!networkLogin.includes(token)) add(`${NETWORK_PREFIX}the session section must contain ${token}`, SCRIPT_FILE);
        }
        if (networkLogin.includes('while (')) add(`${NETWORK_PREFIX}the session section must not contain while (: the re-mint is one bounded for loop`, SCRIPT_FILE);
      }
      const spawnSites = occurrences(scriptText, 'spawnSync(process.execPath');
      if (spawnSites !== 1) add(`${NETWORK_PREFIX}a kit login script must be run from one site: spawnSync(process.execPath must appear exactly once, found ${spawnSites}`, SCRIPT_FILE);
    }
  }

  if (requireNetwork) {
    // Behavior pins: the imported validators and helpers are the definition the runner executes.
    const goto = { action: 'goto', path: '/p' };
    const positive = { action: 'expect_visible', role: 'heading', name: 'Title' };
    const step = { action: NETWORK_ACTION, method: 'POST', url_contains: '/avatar', count: 1 };
    if (validateStep('browser', step) !== null) {
      add(`${NETWORK_PREFIX}validateStep( must accept an ${NETWORK_ACTION} step of a method, a path and a count`, SCRIPT_FILE);
    }
    /** @type {[string, string, any][]} */
    const refusals = [
      ['a method outside GET, HEAD, POST, PUT, PATCH and DELETE', 'browser', { ...step, method: 'TRACE' }],
      ['a negative count', 'browser', { ...step, count: -1 }],
      ['a fractional count', 'browser', { ...step, count: 1.5 }],
      ['a url_contains with a query string', 'browser', { ...step, url_contains: '/a?x=1' }],
      ['a url_contains with no leading slash', 'browser', { ...step, url_contains: 'avatar' }],
      ['a url_contains that starts with two slashes', 'browser', { ...step, url_contains: '//x.example/a' }],
      ['a selector key', 'browser', { ...step, selector: '#a' }],
      ['a session key', 'browser', { ...step, session: 'none' }],
      ['the http driver', 'http', step],
    ];
    for (const [label, driver, candidate] of refusals) {
      if (validateStep(driver, candidate) === null) add(`${NETWORK_PREFIX}validateStep( must refuse ${NETWORK_ACTION} with ${label}`, SCRIPT_FILE);
    }
    if (validateSteps('browser', [step], []) === null) {
      add(`${NETWORK_PREFIX}validateSteps( must refuse an ${NETWORK_ACTION} step with no earlier goto, click or fill step`, SCRIPT_FILE);
    }
    if (validateSteps('browser', [goto, step], []) !== null) {
      add(`${NETWORK_PREFIX}validateSteps( must accept an ${NETWORK_ACTION} step after a goto step`, SCRIPT_FILE);
    }
    if (validateSteps('browser', [goto, { ...step, count: 0 }], []) === null) {
      add(`${NETWORK_PREFIX}validateSteps( must refuse an ${NETWORK_ACTION} step of count 0 with no earlier positive step on the same route`, SCRIPT_FILE);
    }
    if (validateSteps('browser', [goto, positive, { ...step, count: 0 }], []) !== null) {
      add(`${NETWORK_PREFIX}validateSteps( must accept an ${NETWORK_ACTION} step of count 0 after a positive step on the same route`, SCRIPT_FILE);
    }
    // A classified request keeps the method, the host and the path, and never the query string or the fragment.
    const target = { origin: 'http://127.0.0.1:3000', allowedHosts: new Set(['127.0.0.1']), guard: { isAllowedHost: (/** @type {string} */ h, /** @type {Set<string>} */ s) => s.has(h) } };
    const local = classifyObservedRequest('http://127.0.0.1:3000/avatar?token=QUERYVALUE-4417#FRAGMENTVALUE-4418', 'post', target);
    const shown = JSON.stringify(local);
    if (local === null || Object.keys(local).join(',') !== 'method,host,path,local' || local.path !== '/avatar' || local.method !== 'POST' || local.local !== true) {
      add(`${NETWORK_PREFIX}classifyObservedRequest( must return exactly method, host, path and local, with the path alone, for a local request`, SCRIPT_FILE);
    }
    if (shown.includes('QUERYVALUE-4417') || shown.includes('FRAGMENTVALUE-4418')) {
      add(`${NETWORK_PREFIX}classifyObservedRequest( must drop the query string and the fragment of a URL`, SCRIPT_FILE);
    }
    const away = classifyObservedRequest('https://cdn.example.com/avatar', 'POST', target);
    if (away === null || away.local !== false) {
      add(`${NETWORK_PREFIX}classifyObservedRequest( must mark a request to a host the guard does not approve as not local`, SCRIPT_FILE);
    }
    // The window decision passes an exact count, fails a duplicate, blocks on a matching non-local request and matches the encoded path.
    const hit = { method: 'POST', host: '127.0.0.1:3000', path: '/avatar', local: true };
    if (evaluateRequestWindow([hit], step).status !== 'passed') {
      add(`${NETWORK_PREFIX}evaluateRequestWindow( must pass an exact count`, SCRIPT_FILE);
    }
    if (evaluateRequestWindow([hit, hit], step).status !== 'failed') {
      add(`${NETWORK_PREFIX}evaluateRequestWindow( must fail a duplicate`, SCRIPT_FILE);
    }
    const stray = { method: 'POST', host: 'cdn.example.com', path: '/avatar', local: false };
    if (evaluateRequestWindow([hit, stray], step).status !== 'non-local') {
      add(`${NETWORK_PREFIX}evaluateRequestWindow( must block on a matching request to a host the guard does not approve`, SCRIPT_FILE);
    }
    const unrelated = { method: 'POST', host: 'cdn.example.com', path: '/other', local: false };
    if (evaluateRequestWindow([hit, unrelated], step).status !== 'passed') {
      add(`${NETWORK_PREFIX}evaluateRequestWindow( must ignore a non-matching request to a host the guard does not approve`, SCRIPT_FILE);
    }
    const encoded = [{ method: 'POST', host: '127.0.0.1:3000', path: '/avat%C3%A1r', local: true }];
    const accented = { ...step, url_contains: '/avatár', count: 0 };
    if (evaluateRequestWindow(encoded, accented).status !== 'failed') {
      add(`${NETWORK_PREFIX}evaluateRequestWindow( must match a recorded path in its encoded form, so a count of 0 fails on a request that was issued`, SCRIPT_FILE);
    }
    // The re-mint is decided only for a minted role, after the one halt that follows a fresh mint, and within the cap.
    const halt = 'FAILED_PROBE_MARKER_ABSENT';
    if (shouldRemintLogin(true, 1, halt, 0) !== true) {
      add(`${NETWORK_PREFIX}shouldRemintLogin( must re-mint a minted role that halted ${halt} before the cap`, SCRIPT_FILE);
    }
    if (shouldRemintLogin(false, 1, halt, 0) !== false || shouldRemintLogin(true, 0, halt, 0) !== false || shouldRemintLogin(true, 1, 'FAILED_MINT_COMMAND', 0) !== false) {
      add(`${NETWORK_PREFIX}shouldRemintLogin( must not re-mint a role that is not minted, a success or another halt`, SCRIPT_FILE);
    }
    if (shouldRemintLogin(true, 1, halt, LOGIN_REMINT_MAX_RETRIES) !== false) {
      add(`${NETWORK_PREFIX}shouldRemintLogin( must not re-mint once ${LOGIN_REMINT_MAX_RETRIES} retries were made`, SCRIPT_FILE);
    }
  }

  if (requirePrefix) {
    // Behavior pins: the imported helpers are the definition the runner executes.
    const click = { action: 'click', role: 'button', name: 'Group' };
    if (!parseGroundPrefix(JSON.stringify([click])).ok) {
      add(`${PREFIX_PREFIX}parseGroundPrefix( must accept a prefix of one click step`, SCRIPT_FILE);
    }
    /** @type {[string, any][]} */
    const refusals = [
      ['a selector step', [{ action: 'click', selector: '#a' }]],
      ['a step with a {{x}} binding', [{ action: 'click', role: 'button', name: '{{x}}' }]],
      ['an expect_visible step', [click, { action: 'expect_visible', role: 'heading', name: 'Title' }]],
      [`a prefix of ${GROUND_PREFIX_MAX_STEPS + 1} steps`, Array.from({ length: GROUND_PREFIX_MAX_STEPS + 1 }, () => click)],
      ['a goto alone', [{ action: 'goto', path: '/p' }]],
    ];
    for (const [label, steps] of refusals) {
      if (parseGroundPrefix(JSON.stringify(steps)).ok) add(`${PREFIX_PREFIX}parseGroundPrefix( must refuse ${label}`, SCRIPT_FILE);
    }
    const goto = { action: 'goto', path: '/p' };
    const key = groundingPrefixKey([goto, click].map((s) => groundingStepKey(s)));
    const plainName = groundSnapshotFileName('r', 's', null);
    if (plainName !== 'r--s.snapshot.json') {
      add(`${PREFIX_PREFIX}groundSnapshotFileName( must keep the plain name <role>--<route>.snapshot.json, found ${plainName}`, SCRIPT_FILE);
    }
    if (key === null || groundSnapshotFileName('r', 's', key) === plainName) {
      add(`${PREFIX_PREFIX}groundSnapshotFileName( must give a post-interaction snapshot a name that differs from the plain one`, SCRIPT_FILE);
    }
    // A plain snapshot and a post-interaction snapshot built through the runner's own key helpers.
    const plain = {
      schema_version: 1,
      role: 'anonymous',
      route: '/p',
      withheld: 0,
      entries: [
        { kind: 'role', role: 'button', name: 'Group', matches: 1 },
        { kind: 'role', role: 'heading', name: 'Title', matches: 1 },
      ],
    };
    const post = {
      schema_version: 2,
      role: 'anonymous',
      route: '/p',
      withheld: 0,
      entries: [{ kind: 'text', text: 'Row', matches: 1 }],
      prefix: [goto, click].map((s) => groundingStepKey(s)),
    };
    const heading = { action: 'expect_visible', role: 'heading', name: 'Title' };
    const row = { action: 'expect_visible', text: 'Row' };
    if (precheckGroundedSteps([goto, click, row], [plain], '', null) === null) {
      add(`${PREFIX_PREFIX}precheckGroundedSteps( must refuse an element that only a post-interaction snapshot lists when that snapshot is absent`, SCRIPT_FILE);
    }
    if (precheckGroundedSteps([goto, click, row], [plain, post], '', null) !== null) {
      add(`${PREFIX_PREFIX}precheckGroundedSteps( must ground a step after the interaction against the post-interaction snapshot`, SCRIPT_FILE);
    }
    if (precheckGroundedSteps([goto, heading, click], [post, plain], '', null) !== null) {
      add(`${PREFIX_PREFIX}precheckGroundedSteps( must still ground the interaction itself and a step before it against the plain snapshot`, SCRIPT_FILE);
    }
    if (precheckGroundedSteps([goto, row, click], [plain, post], '', null) === null) {
      add(`${PREFIX_PREFIX}precheckGroundedSteps( must never ground an element only the post-interaction snapshot lists for a step before the interaction`, SCRIPT_FILE);
    }
  }

  if (requireCatalogue) {
    // The imported module is the definition the runner executes; pin its content, not its spelling.
    for (const code of REQUIRED_CATALOGUE_CODES) {
      if (!Object.hasOwn(REASON_CATALOGUE, code)) add(`the reason-code catalogue must contain ${code}`, SCRIPT_FILE);
    }
    if (Object.hasOwn(REASON_CATALOGUE, 'NO_PLAN_ENTRY')) {
      add('the reason-code catalogue must not contain NO_PLAN_ENTRY: it marks a case the plan omitted entirely', SCRIPT_FILE);
    }
    for (const [code, spec] of Object.entries(REASON_CATALOGUE)) {
      if (spec.disposition !== 'needs-human' && spec.disposition !== 'blocked') {
        add(`the reason-code catalogue entry ${code} has a disposition outside needs-human, blocked`, SCRIPT_FILE);
      }
    }
    if (CASE_CLASSES.join(',') !== REQUIRED_CASE_CLASSES.join(',')) {
      add(`the case classes must be exactly ${REQUIRED_CASE_CLASSES.join(', ')} in that order, found ${CASE_CLASSES.join(', ')}`, SCRIPT_FILE);
    }
  }

  if (requireVocabulary) {
    // Behavior pins: the imported validators are the definition the runner executes.
    const sessionless = { action: 'request', method: 'GET', path: '/x', session: 'none', expect_status: 401 };
    if (validateStep('http', sessionless) !== null) {
      add(`${VOCABULARY_PREFIX}an http request step with session "none" must validate against the runner`, SCRIPT_FILE);
    }
    if (validateStep('http', { ...sessionless, session: 'cookie' }) === null) {
      add(`${VOCABULARY_PREFIX}an http request step with a session value other than "none" must be refused`, SCRIPT_FILE);
    }
    if (validateStep('browser', { action: 'goto', path: '/x', session: 'none' }) === null) {
      add(`${VOCABULARY_PREFIX}a browser step carrying a session key must be refused`, SCRIPT_FILE);
    }
    if (validateStep('browser', { action: 'expect_value', selector: '#a', not_empty: true }) === null) {
      add(`${VOCABULARY_PREFIX}the new browser assertions take grounded locators only: an expect_value step with a bare selector must be refused`, SCRIPT_FILE);
    }
    const goto = { action: 'goto', path: '/p' };
    const positive = { action: 'expect_visible', role: 'heading', name: 'Title' };
    const absence = { action: 'expect_not_visible', role: 'listitem', name: 'Item' };
    if (validateSteps('browser', [goto, absence], []) === null) {
      add(`${VOCABULARY_PREFIX}an expect_not_visible step with no earlier positive step on the same route must be refused`, SCRIPT_FILE);
    }
    if (validateSteps('browser', [goto, positive, absence], []) !== null) {
      add(`${VOCABULARY_PREFIX}an expect_not_visible step after a positive step on the same route must validate`, SCRIPT_FILE);
    }
  }

  if (commandText == null) {
    add(`missing or unreadable file: ${COMMAND_FILE}`, COMMAND_FILE);
  } else {
    for (const required of ['HUMAN GATE STILL OPEN', 'FAILED_NON_LOCAL_TARGET', 'qa-run.mjs']) {
      if (!commandText.includes(required)) add(`the runner command must contain ${required}`, COMMAND_FILE);
    }
    for (const banned of BANNED_IN_COMMAND) {
      if (commandText.includes(banned)) add(`the runner command must not contain ${banned}; .claude/PRPs MUST NOT appear anywhere in it`, COMMAND_FILE);
    }
    // Each literal step example in the doc must validate against the runner's own per-step validator.
    /** @type {Set<string>} */ const seen = new Set();
    /** @type {{ driver: string, step: any }[]} */ const examples = [];
    for (const m of commandText.matchAll(STEP_EXAMPLE_PATTERN)) {
      const driver = m[1];
      seen.add(driver);
      /** @type {any} */ let step;
      try {
        step = JSON.parse(m[2]);
      } catch {
        add(`the ${driver} step example in the runner command is not valid JSON`, COMMAND_FILE);
        continue;
      }
      examples.push({ driver, step });
      const bad = validateStep(driver, step);
      if (bad) add(`the ${driver} step example in the runner command does not validate: ${bad.reason}`, COMMAND_FILE);
    }
    if (requireStepExamples) {
      for (const driver of STEP_EXAMPLE_DRIVERS) {
        if (!seen.has(driver)) add(`the runner command must carry a literal ${driver} step example marked <!-- qa-step-example driver=${driver} -->`, COMMAND_FILE);
      }
    }
    if (requireCatalogue) {
      // Every catalogued code and every class is named in the doc the planner reads.
      for (const code of Object.keys(REASON_CATALOGUE)) {
        if (!commandText.includes(code)) add(`the runner command must document the reason code ${code}`, COMMAND_FILE);
      }
      for (const cls of CASE_CLASSES) {
        if (!commandText.includes(cls)) add(`the runner command must document the case class ${cls}`, COMMAND_FILE);
      }
      // Each marked plan-entry example must validate against the runner's own classification validator.
      let planEntryExamples = 0;
      for (const m of commandText.matchAll(PLAN_ENTRY_EXAMPLE_PATTERN)) {
        planEntryExamples++;
        /** @type {any} */ let entry;
        try {
          entry = JSON.parse(m[1]);
        } catch {
          add('the plan-entry example in the runner command is not valid JSON', COMMAND_FILE);
          continue;
        }
        const bad = validatePlanClassification(entry);
        if (bad) add(`the plan-entry example in the runner command does not validate: ${bad.reason}`, COMMAND_FILE);
      }
      if (planEntryExamples === 0) {
        add('the runner command must carry a literal plan-entry example marked <!-- qa-plan-entry-example -->', COMMAND_FILE);
      }
    }
    if (requireGround) {
      // The halt, the Git Bash note and the wait's numbers follow the exported constants.
      const interval = `${GROUND_POLL_INTERVAL_MS / 1000} second apart`;
      const bound = `${GROUND_STABLE_BOUND_MS / 1000} seconds`;
      for (const token of ['GROUND_UNSTABLE', 'MSYS_NO_PATHCONV=1', interval, bound]) {
        if (!commandText.includes(token)) add(`the runner command must document the ground wait: it must contain ${token}`, COMMAND_FILE);
      }
    }
    if (requirePrivacy) {
      // The halt, the proof line, the ignore file and the floor's numbers follow the exported constants.
      const length = `${SESSION_VALUE_MIN_LENGTH} characters`;
      const entropy = `${SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character`;
      for (const token of ['FAILED_IGNORE_UNPROVEN', 'IGNORE_PROOF', '.gitignore', 'git check-ignore', length, entropy]) {
        if (!commandText.includes(token)) add(`the runner command must document run-evidence privacy: it must contain ${token}`, COMMAND_FILE);
      }
    }
    if (requireVocabulary) {
      // The see-list names every mode of the script, in the parenthesis after "the runner script".
      const modeList = /the runner script \(([^)]*)\)/.exec(commandText);
      if (modeList === null) {
        add(`${VOCABULARY_PREFIX}the runner command must list the modes of the runner script in a parenthesis after "the runner script"`, COMMAND_FILE);
      } else {
        for (const mode of RUNNER_MODES) {
          if (!modeList[1].includes(`\`${mode}\``)) add(`${VOCABULARY_PREFIX}the runner command must name the ${mode} mode in the list of the runner script modes`, COMMAND_FILE);
        }
      }
      // Every new step, state and the re-read window in seconds are documented; the window follows the exported constant.
      const rereadWindow = `for up to ${ASSERT_SETTLE_MS / 1000} seconds`;
      for (const token of [...NEW_BROWSER_ACTIONS, 'not_empty', '"session": "none"', ...EXPECT_STATES, rereadWindow]) {
        if (!commandText.includes(token)) add(`${VOCABULARY_PREFIX}the runner command must document the new steps: it must contain ${token}`, COMMAND_FILE);
      }
      // The session-less request and each new assertion have a marked literal example that the script validates.
      if (!examples.some((e) => e.driver === 'http' && isPlainObject(e.step) && e.step.action === 'request' && e.step.session === 'none')) {
        add(`${VOCABULARY_PREFIX}the runner command must carry a marked http example of a request step with session "none"`, COMMAND_FILE);
      }
      for (const action of NEW_BROWSER_ACTIONS) {
        if (!examples.some((e) => e.driver === 'browser' && isPlainObject(e.step) && e.step.action === action)) {
          add(`${VOCABULARY_PREFIX}the runner command must carry a marked browser example of ${action}`, COMMAND_FILE);
        }
      }
    }
    if (requirePrefix) {
      // The flag, both halts, the block that teaches the mode and the cap follow the exported constant.
      const cap = `at most ${GROUND_PREFIX_MAX_STEPS} steps`;
      for (const token of ['--prefix', 'GROUND_PREFIX_FAILED', 'GROUND_PREFIX_INVALID', 'Grounding after an interaction.', cap]) {
        if (!commandText.includes(token)) add(`${PREFIX_PREFIX}the runner command must document the ground prefix: it must contain ${token}`, COMMAND_FILE);
      }
    }
    if (requireNetwork) {
      // The step, its window in seconds and the re-mint with its cap follow the exported constants.
      const settleWindow = `${EXPECT_REQUESTS_SETTLE_MS / 1000} seconds after the step starts`;
      const remintCap = LOGIN_REMINT_MAX_RETRIES === 1 ? 'at most once per role per run' : `at most ${LOGIN_REMINT_MAX_RETRIES} times per role per run`;
      for (const token of [NETWORK_ACTION, 'url_contains', settleWindow, 'FAILED_PROBE_MARKER_ABSENT', '--force', remintCap]) {
        if (!commandText.includes(token)) add(`${NETWORK_PREFIX}the runner command must document the request count and the re-mint: it must contain ${token}`, COMMAND_FILE);
      }
      // A marked literal example of the step exists; the generic example rule checks that it validates.
      if (!examples.some((e) => e.driver === 'browser' && isPlainObject(e.step) && e.step.action === NETWORK_ACTION)) {
        add(`${NETWORK_PREFIX}the runner command must carry a marked browser example of ${NETWORK_ACTION}`, COMMAND_FILE);
      }
    }
  }

  if (seedScriptText === null) {
    add(`missing or unreadable file: ${SEED_SCRIPT_FILE}`, SEED_SCRIPT_FILE);
  } else if (typeof seedScriptText === 'string') {
    const marker = '// WRITE-SITE';
    const nMarker = occurrences(seedScriptText, marker);
    if (nMarker !== 1) add(`the seed script must contain ${marker} exactly once, found ${nMarker}`, SEED_SCRIPT_FILE);
    for (const call of ['writeFileSync(', 'renameSync(']) {
      const n = occurrences(seedScriptText, call);
      if (n !== 1) add(`the seed script single-write-helper rule: ${call} must appear exactly once, found ${n}`, SEED_SCRIPT_FILE);
    }
    if (seedScriptText.includes('child_process')) add('the seed script must not use child_process: the generator executes nothing', SEED_SCRIPT_FILE);
    seedScriptText.split(/\r?\n/).forEach((l, i) => {
      if (/(writeFileSync|appendFileSync|writeFile|rmSync|unlinkSync)\(/.test(l) && l.includes('qa-report.md')) {
        add('a write call in the seed script names qa-report.md: the generator must never write the report', SEED_SCRIPT_FILE, i + 1);
      }
    });
    if (seedScriptText.includes("'confirmed'") || seedScriptText.includes('"confirmed"')) {
      add('the seed script must not contain the quoted word confirmed: no relay component writes it', SEED_SCRIPT_FILE);
    }
    if (!seedScriptText.includes("'proposed'") && !seedScriptText.includes('"proposed"')) {
      add('the seed script must write proposed entries', SEED_SCRIPT_FILE);
    }
  }

  if (queryModuleText === null) {
    add(`missing or unreadable file: ${QUERY_MODULE_FILE}`, QUERY_MODULE_FILE);
  } else if (typeof queryModuleText === 'string') {
    for (const banned of ['child_process', 'writeFileSync(', 'renameSync(', 'appendFileSync(', 'fetch(']) {
      if (queryModuleText.includes(banned)) add(`the query module must stay pure: it must not contain ${banned}`, QUERY_MODULE_FILE);
    }
    for (const token of ['QUERY_NOT_READ_ONLY', 'FAILED_NON_LOCAL_TARGET', '--remote', '-readonly']) {
      if (!queryModuleText.includes(token)) add(`the query module must contain ${token}`, QUERY_MODULE_FILE);
    }
  }

  if (seedCommandText === null) {
    add(`missing or unreadable file: ${SEED_COMMAND_FILE}`, SEED_COMMAND_FILE);
  } else if (typeof seedCommandText === 'string') {
    if (!seedCommandText.includes('qa-seed.mjs')) add('the seed command must contain qa-seed.mjs', SEED_COMMAND_FILE);
    if (!seedCommandText.includes('proposed')) add('the seed command must contain proposed', SEED_COMMAND_FILE);
    for (const banned of ['subagent_type', '.claude/PRPs', '"status": "confirmed"']) { // .claude/PRPs MUST NOT appear in the command
      if (seedCommandText.includes(banned)) add(`the seed command must not contain ${banned}; .claude/PRPs MUST NOT appear anywhere in it`, SEED_COMMAND_FILE);
    }
  }

  for (const r of results ?? []) {
    for (const m of validateResults(r.value)) add(m, r.file);
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * @param {string} rel
 * @returns {string | null}
 */
function readOrNull(rel) {
  try {
    return readFileSync(resolve(rel), 'utf8');
  } catch {
    return null;
  }
}

/** @returns {{ file: string, value: any }[]} */
function walkResults() {
  /** @type {{ file: string, value: any }[]} */
  const out = [];
  const reports = resolve('PRPs', 'reports');
  /** @type {import('node:fs').Dirent[]} */ let features = [];
  try {
    features = readdirSync(reports, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const f of features) {
    if (!f.isDirectory()) continue;
    const runsDir = join(reports, f.name, 'qa-run');
    /** @type {import('node:fs').Dirent[]} */ let runs = [];
    try {
      runs = readdirSync(runsDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const r of runs) {
      if (!r.isDirectory()) continue;
      const rel = `PRPs/reports/${f.name}/qa-run/${r.name}/results.json`;
      const text = readOrNull(rel);
      if (text === null) continue;
      try {
        out.push({ file: rel, value: JSON.parse(text) });
      } catch {
        out.push({ file: rel, value: null });
      }
    }
  }
  return out;
}

/** @returns {{ name: string, ok: boolean, findings: Finding[] }} */
export function runQaRunContractCheck() {
  return checkQaRunContract({
    scriptText: readOrNull(SCRIPT_FILE),
    commandText: readOrNull(COMMAND_FILE),
    seedScriptText: readOrNull(SEED_SCRIPT_FILE),
    seedCommandText: readOrNull(SEED_COMMAND_FILE),
    queryModuleText: readOrNull(QUERY_MODULE_FILE),
    results: walkResults(),
    requireStepExamples: true,
    requireCatalogue: true,
    requireGround: true,
    requirePrivacy: true,
    requireVocabulary: true,
    requirePrefix: true,
    requireNetwork: true,
  });
}
