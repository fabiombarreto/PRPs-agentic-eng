#!/usr/bin/env node
// @ts-check
/**
 * qa-run — the runner of the test-auth kit's consumer side.
 *
 * Reads an existing `qa-report.md`, gives every case exactly one outcome
 * (pass, fail, blocked or needs-human), captures redacted evidence and writes
 * `results.json` under a fresh `PRPs/reports/<feature>/qa-run/<run-id>/`
 * directory. It never edits the report, never flips a Manual status and ends
 * every run by stating that the human validation gate is still open.
 *
 * Usage:
 *   node <plugin-root>/scripts/qa-run.mjs parse --report <path>
 *   node <plugin-root>/scripts/qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
 *   node <plugin-root>/scripts/qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
 *   node <plugin-root>/scripts/qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>] [--prefix <json>]
 *   node <plugin-root>/scripts/qa-run.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, or no mode
 * exit 2 without writing (see USAGE / parseArgs). The `ground` mode is
 * dispatched before parseArgs and its own arguments are validated by
 * parseGroundArgs.
 *
 * Modes:
 *   parse  prints the report's cases as JSON; read-only.
 *   init   resolves the local target, runs the local-only guard, then creates
 *          the run directory and prints RUN_ID, RUN_DIR and BASE_URL_ORIGIN. It
 *          also writes the run directory's own `.gitignore` for `grounding/` and
 *          `evidence/`, proves it with `git check-ignore` and prints
 *          IGNORE_PROOF; an unproven ignore is the halt FAILED_IGNORE_UNPROVEN.
 *   run    executes `<run-dir>/plan.json` against the report's cases and writes
 *          `<run-dir>/results.json` with exactly one entry per case. It proves
 *          the same ignore rules before the first case.
 *   ground takes one redacted accessibility snapshot of one route, with one
 *          role's saved session, behind the same local-only guard, only once
 *          two successive snapshots are equal within a bounded wait. It writes
 *          the role-and-name and text candidates with their real match counts
 *          under `<run-dir>/grounding/`, and ends GROUND_UNSTABLE (exit 1,
 *          nothing written) when no equal pair appears in time. It proves the
 *          same ignore rules before it writes. With `--prefix` it first replays
 *          a short list of `goto`, `click` and `fill` steps after the route
 *          loads, and a step that cannot be performed on exactly one element is
 *          the halt GROUND_PREFIX_FAILED (exit 1, nothing written).
 *
 * Exit codes: 0 completed, 1 a named halt (a FAILED_* code or one of the ground
 * halts such as GROUND_UNSTABLE) or an aborted run, 2 bad arguments.
 *
 * Drivers: `http` and `browser` are active. Any case that needs another driver,
 * or that the plan does not cover, is recorded `needs-human` with its manual
 * steps verbatim. Before routing, a case whose coverage is `automated` is
 * resolved from the Test Runner's schema-v1 record: the JUnit artifact the
 * record points at decides pass or fail per cited test file, with reason_code
 * AUTOMATED_EVIDENCE. Anything the record cannot prove routes as before, and
 * results.json reports those cases separately through `record_resolved`.
 *
 * Redaction follows ${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md and is
 * applied in memory before any evidence byte is written. Session values are
 * registered source-first: the token artifact, the declared session cookie and
 * the `api_origins` cookies always; every other cookie, localStorage and
 * IndexedDB string only above the floor and never a part of the target origin.
 *
 * No npm dependencies of its own; `playwright` is resolved lazily at run time.
 * Node >=18, ESM.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync, readdirSync } from 'node:fs';
import { resolve, join, relative, dirname, isAbsolute, basename } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
/**
 * The query contract is loaded lazily: a runner copy that never meets a `query` step never needs the
 * sibling module. A failed load is reported to the caller, never thrown.
 */
/** @type {Promise<any> | null} */
let queryModulePromise = null;
/** @returns {Promise<any>} */
async function loadQueryModule() {
  queryModulePromise ??= import('./qa-query.mjs').catch(() => null);
  return queryModulePromise;
}

export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];

const FEATURE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const ROLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
/** Login-script halts surfaced as their own blocked reasons (a configuration or account problem). */
const PROBE_BLOCK_CODES = [
  'FAILED_PROBE_NOT_PROTECTED',
  'FAILED_PROBE_WRONG_ACCOUNT',
  'FAILED_PROBE_PAGE_UNLOADABLE',
  'FAILED_PROBE_MARKER_ABSENT',
  'FAILED_KIT_SCRIPT_STALE',
];
/**
 * A minted role whose recorded expiry is at most this far ahead of the run start is re-minted by the
 * kit login script (through its existing --force flag) before any case uses it: a five-minute access
 * token leaves at least four minutes of runway after a fresh mint, and a token minted earlier with
 * under four minutes left is replaced. Larger than the template's own 60 s floor on purpose.
 */
const RUN_REMINT_MARGIN_MS = 240000;
/**
 * The most times the runner runs a minted role's kit login script again, with `--force`, after it halted
 * `FAILED_PROBE_MARKER_ABSENT`. One, because a second halt after two fresh mints is a configuration
 * problem the operator must see, and every extra run mints again and rotates the account's session.
 * Chosen, not measured; the Phase 8 dogfood recalibrates it.
 */
export const LOGIN_REMINT_MAX_RETRIES = 1;
/** The login-script halts of the `minted` mechanism, surfaced as named blocked reasons for a minted role. */
const MINT_BLOCK_CODES = ['FAILED_MINT_UNCONFIRMED', 'FAILED_MINT_COMMAND_MISSING', 'FAILED_NON_LOCAL_TARGET', 'FAILED_MINT_COMMAND', 'FAILED_MINT_OUTPUT'];
/** The identity stamp line the login template carries and a generated script copies verbatim. */
const KIT_STAMP_PATTERN = /^const KIT_TEMPLATE_ID = '([^']+)';$/m;
/** A sentence only a template-generated login script contains (hand-written or stub scripts are not judged). */
const KIT_SCRIPT_MARKER = 'Login script for one role of the test-auth kit';
/** How long the anonymous check waits for the authenticated-only marker to (not) appear. */
const ANONYMOUS_CHECK_MS = 20000;
/**
 * The time between two successive reads of the ground mode's stable-snapshot wait, so an equal pair
 * certifies at least one full second without a change. No primary source documents a
 * two-equal-snapshots strategy: Playwright's own polling schedule tops out at 1000 ms and its `stable`
 * check is two consecutive animation frames, so a pair one second apart is the stricter reading.
 * Chosen, not measured on a real single-page application; the Phase 8 dogfood recalibrates it.
 */
export const GROUND_POLL_INTERVAL_MS = 1000;
/**
 * The most the wait lasts for an equal pair, counted from the first read. It reuses the 20-second
 * precedent of ANONYMOUS_CHECK_MS for a page-state wait; chosen, not measured (see the interval above).
 */
export const GROUND_STABLE_BOUND_MS = 20000;
/**
 * The most steps a `ground` prefix may replay. It bounds both the side effect a replay can have on the
 * local target and the length of the command line. Chosen, not measured: case 20 of the frozen
 * classification needs a single click, and the other cases of that table need at most a fill and a
 * click.
 */
export const GROUND_PREFIX_MAX_STEPS = 5;
/** The longest value a prefix `fill` may type, in characters. Chosen, not measured. */
export const GROUND_PREFIX_VALUE_MAX = 200;
/** The only actions a `ground` prefix may replay; every other action of the step vocabulary is refused. */
export const GROUND_PREFIX_ACTIONS = Object.freeze(['goto', 'click', 'fill']);
const HUMAN_GATE_SENTENCE =
  'HUMAN GATE STILL OPEN: a runner pass is evidence, not approval. No Manual status was changed and no phase status advanced.';

/** The one `ground` usage line, shared by USAGE and GROUND_USAGE so the two cannot drift. */
const GROUND_USAGE_LINE = '  qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>] [--prefix <json>]';

export const USAGE = `Usage:
  qa-run.mjs parse --report <path>
  qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
  qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
${GROUND_USAGE_LINE}
  qa-run.mjs --help
`;

/** Thrown for a named halt; the entry point prints the message and exits 1. */
class Halt extends Error {
  /** @param {string} code @param {string} detail */
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

/** @param {string} p @returns {string} */
const fwd = (p) => p.split('\\').join('/');

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

/**
 * @typedef {{ help: boolean, mode: string | null, report: string | null, root: string, feature: string | null, runDir: string | null, envHandle: string | null, maxCases: number | null }} Args
 */

/**
 * @param {string[]} argv
 * @returns {Args | null} null on bad arguments
 */
function parseArgs(argv) {
  let help = false;
  /** @type {string | null} */ let mode = null;
  /** @type {string | null} */ let report = null;
  let root = process.cwd();
  /** @type {string | null} */ let feature = null;
  /** @type {string | null} */ let runDir = null;
  /** @type {string | null} */ let envHandle = null;
  /** @type {number | null} */ let maxCases = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') {
      help = true;
    } else if (['--report', '--root', '--feature', '--run-dir', '--env-handle', '--max-cases'].includes(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      i++;
      if (a === '--report') report = v;
      else if (a === '--root') root = resolve(v);
      else if (a === '--feature') feature = v;
      else if (a === '--run-dir') runDir = v;
      else if (a === '--env-handle') envHandle = v;
      else {
        if (!/^[1-9]\d*$/.test(v)) return null;
        maxCases = Number(v);
      }
    } else if (!a.startsWith('--') && mode === null && ['parse', 'init', 'run'].includes(a)) {
      mode = a;
    } else {
      return null;
    }
  }
  if (help) return { help, mode, report, root, feature, runDir, envHandle, maxCases };
  if (mode === null) return null;
  if (mode === 'parse' && report === null) return null;
  if ((mode === 'init' || mode === 'run') && (feature === null || !FEATURE_PATTERN.test(feature))) return null;
  if (mode === 'run' && runDir === null) return null;
  return { help, mode, report, root, feature, runDir, envHandle, maxCases };
}

// ---------------------------------------------------------------------------
// Report parser
// ---------------------------------------------------------------------------

// The seven field labels, as a bare line, a numbered line, or a markdown list
// item. The list-item prefix matters: /relay-qa-report writes the seven fields
// as a `- **Label:** value` bullet list, which is the most readable shape and
// the one a human hand-writing a report reaches for first. Without `[-*+]` here
// every field silently parsed as null and the whole block fell out of the case
// list, so a real report produced by the generator yielded zero cases.
const FIELD_RE =
  /^\s*(?:[-*+]\s+|\d+\.\s*)?\*\*(Title|Risk level|Risk|Required state|Coverage|Automated test path|Manual status|Manual step-by-step):\*\*\s*(.*)$/;
/** @type {Record<string, string>} */
const FIELD_KEYS = {
  Title: 'title',
  'Risk level': 'risk',
  // `Risk` is accepted as a synonym: the generator command names the field
  // "risk level" in prose, and both it and humans shorten it in the heading of
  // a bullet. Silently dropping the risk of a case is worse than one synonym.
  Risk: 'risk',
  'Required state': 'required_state',
  Coverage: 'coverage',
  'Automated test path': 'automated_test_path',
  'Manual status': 'manual_status',
  'Manual step-by-step': 'steps',
};

/**
 * A top-level labeled bullet (`- **Label:** ...` at column 0). When its label is
 * not one of the seven it is an extra field: it ends whatever field precedes it
 * (in particular the step list) and is never folded into one of the seven.
 */
const EXTRA_LABEL_RE = /^[-*+]\s+\*\*[^*\n]+:\*\*/;

/**
 * The labels a case block must carry besides its heading (the title is the
 * heading text), keyed by the case property each one fills. Used to name what a
 * CASE_INCOMPLETE entry is missing.
 * @type {[string, string][]}
 */
const REQUIRED_LABELS = [
  ['risk', 'Risk level'],
  ['required_state', 'Required state'],
  ['coverage', 'Coverage'],
  ['automated_test_path', 'Automated test path'],
  ['manual_status', 'Manual status'],
  ['steps', 'Manual step-by-step'],
];

/**
 * @typedef {{ index: number, heading: string, title: string, risk: string | null, required_state: string | null, coverage: string | null, automated_test_path: string | null, manual_status: string | null, manual_steps_verbatim: string | null }} ReportCase
 * @typedef {{ index: number, title: string, missing: string[] }} IncompleteCase
 * @typedef {{ code: string, message: string, missing_from_table: string[], missing_from_cases: string[] }} ReportWarning
 */

/**
 * @param {string[]} lines
 * @returns {string[]}
 */
function trimBlankEnds(lines) {
  let s = 0;
  let e = lines.length;
  while (s < e && lines[s].trim() === '') s++;
  while (e > s && lines[e - 1].trim() === '') e--;
  return lines.slice(s, e);
}

/**
 * @param {string} heading
 * @param {string[]} body
 * @param {number} index
 * @returns {{ kase: ReportCase, hasTitleLabel: boolean, fieldCount: number, missing: string[] }}
 */
function parseBlock(heading, body, index) {
  /** @type {Record<string, { inline: string, rest: string[] }>} */
  const raw = {};
  /** @type {string | null} */ let cur = null;
  for (const line of body) {
    const m = FIELD_RE.exec(line);
    // Inside the step list only a column-0 label ends the list: an indented
    // line that merely looks like a label is part of a step.
    if (m && !(cur === 'steps' && /^\s/.test(line))) {
      cur = FIELD_KEYS[m[1]];
      raw[cur] = { inline: m[2], rest: [] };
    } else if (EXTRA_LABEL_RE.test(line)) {
      cur = null;
    } else if (cur !== null) {
      raw[cur].rest.push(line);
    }
  }
  /** @param {string} k @returns {string | null} */
  const val = (k) => {
    if (!(k in raw)) return null;
    return [raw[k].inline, ...raw[k].rest.map((l) => l.trim())]
      .filter((s) => s.trim() !== '')
      .join(' ')
      .trim();
  };
  /** @type {string | null} */ let steps = null;
  if ('steps' in raw) {
    const inline = raw.steps.inline.trim() === '' ? [] : [raw.steps.inline.replace(/\s+$/, '')];
    steps = [...inline, ...trimBlankEnds(raw.steps.rest)].join('\n');
  }
  const title = val('title');
  return {
    hasTitleLabel: 'title' in raw,
    // How many of the seven labels this block carried. A case block is
    // field-shaped; a prose subsection under the same heading level is not, so
    // this is what lets a block whose title lives in its heading still be
    // recognized as a case without swallowing surrounding narrative.
    fieldCount: Object.keys(raw).length,
    missing: REQUIRED_LABELS.filter(([k]) => !(k in raw)).map(([, label]) => label),
    kase: {
      index,
      heading,
      title: title !== null && title !== '' ? title : heading,
      risk: val('risk'),
      required_state: val('required_state'),
      coverage: val('coverage'),
      automated_test_path: val('automated_test_path'),
      manual_status: val('manual_status'),
      manual_steps_verbatim: steps,
    },
  };
}

/**
 * Splits `lines` into `###`/`####` heading blocks, ignoring fenced code.
 *
 * A block ends at the next `###`/`####` heading, at any SHALLOWER heading
 * (`#`/`##`), or at a qualifying thematic break. A bare `---`, `***` or `___`
 * line qualifies ONLY when the next non-blank line is a heading of depth <= 3
 * or the end of the file — the shape /relay-qa-report emits between groups.
 * Anywhere else it is content: a rule inside a step list belongs to the step
 * list and the steps after it must not be dropped. A table separator row is not
 * a break: it starts with `|`.
 * @param {string[]} lines
 * @returns {{ heading: string, body: string[] }[]}
 */
function splitHeadingBlocks(lines) {
  /** @type {{ heading: string, body: string[] }[]} */
  const blocks = [];
  let fenced = false;
  let open = false;
  /** @param {number} from @returns {boolean} */
  const breakQualifies = (from) => {
    for (let j = from + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') continue;
      return /^#{1,3}\s/.test(lines[j]);
    }
    return true;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) fenced = !fenced;
    const h = fenced ? null : /^#{3,4}\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ heading: h[1].trim(), body: [] });
      open = true;
    } else if (!fenced && /^#{1,2}\s/.test(line)) {
      open = false;
    } else if (!fenced && /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) && breakQualifies(i)) {
      open = false;
    } else if (open && blocks.length > 0) {
      blocks[blocks.length - 1].body.push(line);
    }
  }
  return blocks;
}

/**
 * Reads the first column of the table under an exact `## Summary table`
 * heading. Returns null when no such heading exists.
 * @param {string[]} lines
 * @returns {string[] | null}
 */
function summaryTableIds(lines) {
  const at = lines.findIndex((l) => /^## Summary table\s*$/.test(l));
  if (at === -1) return null;
  /** @type {string[]} */ const ids = [];
  let started = false;
  let rows = 0;
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim().startsWith('|')) {
      if (started || /^#{1,6}\s/.test(l)) break;
      continue;
    }
    started = true;
    rows++;
    if (rows <= 2) continue; // header row and separator row
    ids.push((splitTableRow(l)[0] ?? '').replace(/`/g, '').trim());
  }
  return ids;
}

/**
 * The case id is the heading text before ` — `.
 * @param {string} heading
 * @returns {string}
 */
function caseId(heading) {
  const i = heading.indexOf(' — ');
  return (i === -1 ? heading : heading.slice(0, i)).trim();
}

/**
 * @param {string} row
 * @returns {string[]}
 */
function splitTableRow(row) {
  const t = row.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
}

/**
 * @param {string[]} lines
 * @returns {ReportCase[]}
 */
function parseTableCases(lines) {
  /** @type {ReportCase[]} */
  const cases = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const head = lines[i];
    if (!head.trim().startsWith('|') || !/Title/.test(head) || !/Manual step/i.test(head)) continue;
    if (!/^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) continue;
    const cols = splitTableRow(head).map((c) => c.toLowerCase());
    /** @param {string} needle @returns {number} */
    const at = (needle) => cols.findIndex((c) => c.includes(needle));
    const idx = {
      title: at('title'),
      risk: at('risk'),
      state: at('required state'),
      coverage: at('coverage'),
      path: at('automated test path'),
      status: at('manual status'),
      steps: at('manual step'),
    };
    for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) {
      const cells = splitTableRow(lines[j]);
      /** @param {number} k @returns {string | null} */
      const cell = (k) => (k >= 0 && k < cells.length ? cells[k] : null);
      const index = cases.length + 1;
      const title = cell(idx.title);
      cases.push({
        index,
        heading: `Case ${index}`,
        title: title !== null && title !== '' ? title : `Case ${index}`,
        risk: cell(idx.risk),
        required_state: cell(idx.state),
        coverage: cell(idx.coverage),
        automated_test_path: cell(idx.path),
        manual_status: cell(idx.status),
        manual_steps_verbatim: cell(idx.steps),
      });
    }
    break;
  }
  return cases;
}

/**
 * @param {string} text
 * @returns {{ cases: ReportCase[], incomplete: IncompleteCase[], warnings: ReportWarning[] }}
 */
export function parseReport(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  /** @type {ReportCase[]} */
  let cases = [];
  /** @type {IncompleteCase[]} */
  let incomplete = [];
  /** @type {ReportWarning[]} */
  const warnings = [];
  /** @type {string[]} */
  let ids = [];
  /** @type {{ heading: string, body: string[] }[]} */
  let scope;
  const start = lines.findIndex((l) => /^##\s+Test Cases\s*$/.test(l));
  if (start !== -1) {
    let end = lines.length;
    let fenced = false;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\s*```/.test(lines[i])) fenced = !fenced;
      if (!fenced && /^##\s/.test(lines[i])) {
        end = i;
        break;
      }
    }
    scope = splitHeadingBlocks(lines.slice(start + 1, end));
  } else {
    scope = splitHeadingBlocks(lines);
  }
  // A heading block with none of the seven labels is prose; a block with at
  // least one is a case. A case missing some labels is STILL a case (counted,
  // reported in `incomplete`), never dropped: dropping it would shrink N with no
  // trace, and demanding two labels admitted prose while excluding real cases.
  const parsed = scope.map((b) => parseBlock(b.heading, b.body, 0)).filter((p) => p.fieldCount >= 1);
  cases = parsed.map((p, i) => ({ ...p.kase, index: i + 1 }));
  incomplete = parsed
    .map((p, i) => ({ index: i + 1, title: p.kase.title, missing: p.missing }))
    .filter((x) => x.missing.length > 0);
  ids = parsed.map((p) => caseId(p.kase.heading));
  if (cases.length === 0) {
    cases = parseTableCases(lines);
    incomplete = [];
  } else {
    const tableIds = summaryTableIds(lines);
    if (tableIds !== null) {
      const inCases = new Set(ids);
      const inTable = new Set(tableIds);
      const missingFromTable = ids.filter((id, i) => !inTable.has(id) && ids.indexOf(id) === i);
      const missingFromCases = tableIds.filter((id, i) => !inCases.has(id) && tableIds.indexOf(id) === i);
      if (missingFromTable.length > 0 || missingFromCases.length > 0) {
        warnings.push({
          code: 'SUMMARY_TABLE_MISMATCH',
          message: `the Summary table and the case sections disagree: not in the table [${missingFromTable.join(', ')}]; not a case section [${missingFromCases.join(', ')}]`,
          missing_from_table: missingFromTable,
          missing_from_cases: missingFromCases,
        });
      }
    }
  }
  return { cases, incomplete, warnings };
}

// ---------------------------------------------------------------------------
// In-code redaction (policy: ${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md)
// ---------------------------------------------------------------------------

const REDACTED = '[REDACTED]';
const REDACTED_URL = '[REDACTED_URL]';
const WILDCARD_NAME = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|PRIVATE|SIGNING|AUTH)/i;
const EXACT_NAMES = [
  'DATABASE_URL',
  'DB_URL',
  'REDIS_URL',
  'MONGODB_URI',
  'KAFKA_BROKERS',
  'AMQP_URL',
  'GOOGLE_APPLICATION_CREDENTIALS',
];
const URL_VALUED_NAMES = ['DATABASE_URL', 'DB_URL', 'REDIS_URL', 'MONGODB_URI', 'KAFKA_BROKERS', 'AMQP_URL'];
const VALUE_REGEX_SOURCES = [
  'AKIA[0-9A-Z]{16}',
  'sk_live_[A-Za-z0-9]{24,}',
  'sk_test_[A-Za-z0-9]{24,}',
  'ghp_[A-Za-z0-9]{36}',
  'github_pat_[A-Za-z0-9_]{82}',
  'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+',
  '-----BEGIN [A-Z ]+PRIVATE KEY-----',
  'sk-[A-Za-z0-9]{48}',
  'sk-ant-[A-Za-z0-9_-]{95,}',
  'AIza[0-9A-Za-z_-]{35}',
  'ya29\\.[A-Za-z0-9_-]{10,}',
  'GOCSPX-[A-Za-z0-9_-]{28,}',
];
const SECRET_PROPERTY_NAMES = ['password', 'passwd', 'token', 'access_token', 'refresh_token', 'secret', 'api_key', 'authorization'];
const COOKIE_PROPERTY_NAMES = ['cookie', 'set-cookie'];

/**
 * @typedef {{ entries: [string, string][], regexes: RegExp[] }} RedactionTable
 */

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRegex(s) {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the in-memory redaction table. Values are held only here; no function
 * in this layer logs them or returns them.
 * @param {{ root?: string, env?: Record<string, string | undefined>, secretValues?: string[] }} [input]
 * @returns {RedactionTable}
 */
export function buildRedactionTable(input = {}) {
  const root = input.root ?? process.cwd();
  const env = input.env ?? process.env;
  /** @type {Map<string, string>} */
  const values = new Map();
  /** @param {string | undefined} v @param {string} marker */
  const add = (v, marker) => {
    if (typeof v !== 'string' || v.length < 4) return;
    if (!values.has(v) || marker === REDACTED_URL) values.set(v, marker);
  };
  /** @type {string[]} */ const extraNames = [];
  /** @type {RegExp[]} */ const regexes = VALUE_REGEX_SOURCES.map((s) => new RegExp(s, 'g'));

  // Layer 2: per-project extensions
  try {
    const ext = readFileSync(join(root, 'PRPs', 'redaction-extensions.txt'), 'utf8');
    for (const raw of ext.split(/\r?\n/)) {
      const line = raw.trim();
      if (line === '' || line.startsWith('#')) continue;
      if (line.startsWith('regex:')) {
        try {
          regexes.push(new RegExp(line.slice('regex:'.length), 'g'));
        } catch {
          // an invalid pattern is skipped, never fatal
        }
      } else {
        extraNames.push(line);
      }
    }
  } catch {
    // no extensions file
  }
  const extraRes = extraNames.map((n) => new RegExp(`^${n.split('*').map(escapeRegex).join('.*')}$`, 'i'));

  for (const [name, value] of Object.entries(env)) {
    const exact = EXACT_NAMES.includes(name.toUpperCase());
    if (exact || WILDCARD_NAME.test(name) || extraRes.some((r) => r.test(name))) {
      add(value, URL_VALUED_NAMES.includes(name.toUpperCase()) ? REDACTED_URL : REDACTED);
    }
  }
  for (const v of input.secretValues ?? []) add(v, REDACTED);
  const table = { entries: [...values.entries()], regexes };
  table.entries.sort((a, b) => b[0].length - a[0].length);
  return table;
}

/**
 * Adds run-time secret values (session cookies, storage values, tokens) to an
 * existing table. Values shorter than 4 characters are ignored.
 * @param {RedactionTable} table
 * @param {string[]} secretValues
 */
export function addSecretValues(table, secretValues) {
  const known = new Set(table.entries.map((e) => e[0]));
  for (const v of secretValues) {
    if (typeof v === 'string' && v.length >= 4 && !known.has(v)) {
      table.entries.push([v, REDACTED]);
      known.add(v);
    }
  }
  table.entries.sort((a, b) => b[0].length - a[0].length);
}

/**
 * The floor for a session value no declaration names (an undeclared cookie, a localStorage entry, an
 * IndexedDB key or value). No scanner documents a minimum length: detect-secrets documents entropy limits
 * of 4.5 for base64 and 3.0 for hex, gitleaks an example of 3.5 with a secret length of 10 to 150 in its
 * generic rule. The six non-secrets of the recorded super-ensino scan are all under 12 characters and at
 * most 2.73 bits per character. The numbers are a judgment, not a measurement: a short secret held by an
 * undeclared cookie is NOT registered by value (the structural masks, the Layer 1 regexes, the proven
 * ignore rule and the dogfood scan back-stop it).
 */
export const SESSION_VALUE_MIN_LENGTH = 12;
/** The Shannon entropy, in bits per character, an undeclared session value needs to be registered. */
export const SESSION_VALUE_MIN_ENTROPY = 3.0;

/**
 * The Shannon entropy of the character histogram of a string, in bits per character.
 * @param {any} text
 * @returns {number} 0 for an empty string and for anything that is not a string
 */
export function shannonEntropy(text) {
  if (typeof text !== 'string' || text === '') return 0;
  /** @type {Map<string, number>} */ const counts = new Map();
  let total = 0;
  for (const ch of text) {
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
    total++;
  }
  let bits = 0;
  for (const n of counts.values()) {
    const p = n / total;
    bits -= p * Math.log2(p);
  }
  return bits;
}

/**
 * Whether an UNDECLARED session value may be registered for redaction. Pure. Short literals (`true`,
 * `false`, `null`, small integers) are never registered: the length gate refuses them before the entropy
 * is computed. A value that is a part of an origin text is never registered either: for each non-empty
 * origin text, the text containing the value refuses it, and a text that holds a scheme separator also
 * refuses a value that begins with it (a URL on the target). A host-only text refuses only a value
 * contained in it, so a secret that merely begins with the host name stays registrable.
 * @param {any} value
 * @param {string[]} [originTexts]
 * @returns {boolean}
 */
export function isRegistrableSessionValue(value, originTexts = []) {
  if (typeof value !== 'string' || value.length < SESSION_VALUE_MIN_LENGTH) return false;
  for (const o of originTexts) {
    if (typeof o !== 'string' || o === '') continue;
    if (o.includes(value)) return false;
    if (o.includes('://') && value.startsWith(o)) return false;
  }
  return shannonEntropy(value) >= SESSION_VALUE_MIN_ENTROPY;
}

/**
 * The cookie names the login configuration declares as session carriers: the role's `sessionCookie` and
 * the `cookie` of every `api_origins` entry (a top-level map, so it applies to every role). Pure.
 * @param {any} loginConfig the parsed PRPs/auth/login.config.json
 * @param {string} role
 * @returns {string[]}
 */
export function declaredCookieNamesOf(loginConfig, role) {
  /** @type {string[]} */ const names = [];
  if (!isObj(loginConfig)) return names;
  const roles = isObj(loginConfig.roles) ? loginConfig.roles : null;
  if (roles !== null && isStr(role) && Object.hasOwn(roles, role) && isObj(roles[role])) {
    const sessionCookie = roles[role].sessionCookie;
    if (isStr(sessionCookie) && sessionCookie !== '') names.push(sessionCookie);
  }
  if (isObj(loginConfig.api_origins)) {
    for (const entry of Object.values(loginConfig.api_origins)) {
      if (isObj(entry) && isStr(entry.cookie) && entry.cookie !== '') names.push(entry.cookie);
    }
  }
  return names;
}

/**
 * Splits the session values of a saved storage state by their source. `declared` holds the token and the
 * value of every cookie a declaration names (always registered); `undeclared` holds every other cookie
 * value, every localStorage value and every IndexedDB string (record keys and values alike) that clears
 * the floor and is not a part of an origin text. Pure; never throws on a malformed state.
 * @param {any} state a parsed storage state
 * @param {string | null} token the token artifact's token
 * @param {string[]} declaredCookieNames
 * @param {string[]} [originTexts]
 * @returns {{ declared: string[], undeclared: string[] }}
 */
export function splitSessionValues(state, token, declaredCookieNames, originTexts = []) {
  /** @type {string[]} */ const declared = [];
  /** @type {string[]} */ const undeclared = [];
  if (isStr(token) && token !== '') declared.push(token);
  const names = Array.isArray(declaredCookieNames) ? declaredCookieNames : [];
  /** @param {any} v */
  const offer = (v) => {
    if (isRegistrableSessionValue(v, originTexts)) undeclared.push(v);
  };
  const cookies = isObj(state) && Array.isArray(state.cookies) ? state.cookies : [];
  for (const c of cookies) {
    if (!isObj(c) || !isStr(c.value)) continue;
    if (isStr(c.name) && names.includes(c.name)) declared.push(c.value);
    else offer(c.value);
  }
  const origins = isObj(state) && Array.isArray(state.origins) ? state.origins : [];
  for (const o of origins) {
    for (const e of Array.isArray(o && o.localStorage) ? o.localStorage : []) if (isObj(e) && isStr(e.value)) offer(e.value);
  }
  for (const v of collectIndexedDbSecrets(state)) offer(v);
  return { declared, undeclared };
}

/**
 * @param {string} text
 * @param {RedactionTable} table
 * @returns {string}
 */
export function redactText(text, table) {
  if (typeof text !== 'string') return text;
  let out = text;
  for (const [value, marker] of table.entries) {
    if (out.includes(value)) out = out.split(value).join(marker);
  }
  for (const re of table.regexes) {
    re.lastIndex = 0;
    out = out.replace(re, REDACTED);
  }
  return out;
}

/**
 * @param {string} text
 * @param {RedactionTable} table
 * @returns {boolean}
 */
export function containsSecret(text, table) {
  return redactText(String(text), table) !== String(text);
}

/**
 * Structural redaction of a JSON-like value, applied before serialization.
 * @param {any} value
 * @param {RedactionTable} table
 * @param {string} [key]
 * @returns {any}
 */
export function redactJson(value, table, key = '') {
  if (typeof value === 'string') return redactText(value, table);
  if (Array.isArray(value)) {
    return value.map((item) => {
      if ((key === 'cookies' || key === 'localStorage') && item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const copy = redactJson(item, table);
        if ('value' in item) copy.value = REDACTED;
        return copy;
      }
      return redactJson(item, table, key);
    });
  }
  if (value !== null && typeof value === 'object') {
    /** @type {Record<string, any>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const lower = k.toLowerCase();
      if (SECRET_PROPERTY_NAMES.includes(lower) || COOKIE_PROPERTY_NAMES.includes(lower)) out[k] = REDACTED;
      else if (k === 'localStorage' && v !== null && typeof v === 'object' && !Array.isArray(v)) {
        out[k] = Object.fromEntries(Object.keys(v).map((n) => [n, REDACTED]));
      } else out[k] = redactJson(v, table, k);
    }
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Clock, write helper, small readers
// ---------------------------------------------------------------------------

/** @returns {string} a real UTC instant from this script's own clock */
function now() {
  let s = new Date().toISOString();
  if (s.endsWith('T00:00:00Z') || s.endsWith('T00:00:00.000Z')) s = new Date().toISOString();
  return s;
}

/**
 * @typedef {{ runDirAbs: string, table: RedactionTable }} WriteCtx
 */

// WRITE-SITE
/**
 * The only place the runner writes a file: tmp-then-rename, refusing any
 * destination outside the run directory. Text is redacted here; structured
 * values are redacted structurally before serialization; binary is written
 * as given (callers withhold any image whose page text holds a secret).
 * @param {WriteCtx} ctx
 * @param {string} destAbs
 * @param {{ kind: 'json', value: any } | { kind: 'text', value: string } | { kind: 'binary', value: Buffer }} payload
 */
function writeRunFile(ctx, destAbs, payload) {
  const rel = relative(ctx.runDirAbs, resolve(destAbs));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('write refused: destination is outside the run directory');
  }
  /** @type {string | Buffer} */ let data;
  if (payload.kind === 'json') data = `${JSON.stringify(redactJson(payload.value, ctx.table), null, 2)}\n`;
  else if (payload.kind === 'text') data = redactText(payload.value, ctx.table);
  else data = payload.value;
  const dest = resolve(destAbs);
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, dest);
}

// ---------------------------------------------------------------------------
// Run-evidence privacy: the run directory's own ignore file and its proof
// ---------------------------------------------------------------------------

/**
 * The ignore rules of a run directory, relative to it. `grounding/` holds accessibility snapshots and
 * `evidence/` holds screenshots, redacted text and the response and row bodies: all of them can hold
 * personal data. `results.json` and `plan.json` are deliberately not listed, so they stay tracked. The
 * set covers the whole evidence directory, not only the screenshots and the redacted-text files, because
 * the row and body files come from the operator's own local data.
 */
export const RUN_IGNORE_RULES = Object.freeze(['grounding/', 'evidence/']);

/**
 * One probe path per kind of file the runner writes under the ignored directories. The paths need not
 * exist: `git check-ignore` evaluates the pathname.
 */
export const RUN_IGNORE_PROBES = Object.freeze(['grounding/probe.snapshot.json', 'evidence/probe.png', 'evidence/probe.txt', 'evidence/probe.json']);

/** The content of the run directory's `.gitignore`: derived from the rules, so it cannot drift from them. */
const RUN_IGNORE_FILE_TEXT = `# Written by qa-run.mjs for this run directory.\n# Run evidence can hold personal data and is never committed.\n${RUN_IGNORE_RULES.join('\n')}\n`;

/** The git variables that could redirect a proof away from the run directory's own work tree. */
const GIT_REDIRECT_VARS = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR'];

/**
 * @typedef {{ status: 'proven' | 'unproven' | 'not-applicable', unproven: string[] }} IgnoreProof
 * @typedef {(cmd: string, args: string[], opts: any) => any} ProcessRunner
 */

/**
 * One git call rooted at the run directory, never at the process working directory.
 * @param {ProcessRunner} run
 * @param {string} runDirAbs
 * @param {string[]} gitArgs
 * @returns {any}
 */
function gitCall(run, runDirAbs, gitArgs) {
  const env = { ...process.env };
  for (const name of GIT_REDIRECT_VARS) delete env[name];
  return run('git', ['-C', runDirAbs, ...gitArgs], { encoding: 'utf8', env, timeout: 15000, windowsHide: true });
}

/**
 * @param {ProcessRunner} run
 * @param {string} runDirAbs
 * @returns {boolean} true only when git answers that the run directory is inside a work tree
 */
function insideWorkTree(run, runDirAbs) {
  const r = gitCall(run, runDirAbs, ['rev-parse', '--is-inside-work-tree']);
  return !r.error && r.status === 0 && String(r.stdout).trim() === 'true';
}

/**
 * One `check-ignore -q` call per probe (the quiet form takes a single pathname). Anything but exit 0 is
 * unproven: 1 is not ignored and 128 is a git error, and neither counts as ignored.
 * @param {ProcessRunner} run
 * @param {string} runDirAbs
 * @returns {IgnoreProof}
 */
function probeIgnored(run, runDirAbs) {
  /** @type {string[]} */ const unproven = [];
  for (const probe of RUN_IGNORE_PROBES) {
    const r = gitCall(run, runDirAbs, ['check-ignore', '-q', '--', probe]);
    if (r.error || r.status !== 0) unproven.push(probe);
  }
  return { status: unproven.length === 0 ? 'proven' : 'unproven', unproven };
}

/**
 * Proves, with `git check-ignore -q`, that a path of each evidence kind is ignored for a run directory.
 * Outside a git work tree, or with git absent, nothing there can be committed and the proof is
 * `not-applicable`.
 * @param {string} runDirAbs
 * @param {ProcessRunner} [run] the process-spawning function; injectable so a test drives it without git
 * @returns {IgnoreProof}
 */
export function proveRunIgnored(runDirAbs, run = spawnSync) {
  if (!insideWorkTree(run, runDirAbs)) return { status: 'not-applicable', unproven: [] };
  return probeIgnored(run, runDirAbs);
}

/**
 * Writes the run directory's `.gitignore` (through the single write helper, only when the file is absent
 * and the directory is inside a work tree or the caller always writes) and proves it. An existing file
 * is never overwritten: an operator's edit is respected and the proof judges it. Git detection is keyed
 * on the run directory, never on the process working directory.
 * @param {string} runDirAbs
 * @param {{ run?: ProcessRunner, alwaysWrite?: boolean }} [opts]
 * @returns {IgnoreProof}
 */
export function ensureRunIgnore(runDirAbs, opts = {}) {
  const run = opts.run ?? spawnSync;
  const inside = insideWorkTree(run, runDirAbs);
  const file = join(runDirAbs, '.gitignore');
  if ((opts.alwaysWrite === true || inside) && !existsSync(file)) {
    writeRunFile({ runDirAbs, table: { entries: [], regexes: [] } }, file, { kind: 'text', value: RUN_IGNORE_FILE_TEXT });
  }
  if (!inside) return { status: 'not-applicable', unproven: [] };
  return probeIgnored(run, runDirAbs);
}

/**
 * The halt form of the proof: an unproven ignore stops the mode before it writes anything. The detail
 * carries a count and fixed probe paths only.
 * @param {string} runDirAbs
 * @param {{ run?: ProcessRunner, alwaysWrite?: boolean }} [opts]
 * @returns {string} `proven` or `not-applicable`
 */
function requireRunIgnore(runDirAbs, opts = {}) {
  /** @type {IgnoreProof} */ let proof;
  try {
    proof = ensureRunIgnore(runDirAbs, opts);
  } catch {
    proof = { status: 'unproven', unproven: ['.gitignore'] };
  }
  if (proof.status === 'unproven') {
    throw new Halt(
      'FAILED_IGNORE_UNPROVEN',
      `${proof.unproven.length} run-evidence path(s) are not proven ignored by git: ${proof.unproven.join(', ')}; no snapshot, screenshot or result was written`,
    );
  }
  return proof.status;
}

/**
 * @param {string} p
 * @returns {any | null}
 */
function readJsonOrNull(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * @param {string} p
 * @returns {string}
 */
function sha256File(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex');
}

// ---------------------------------------------------------------------------
// Target resolution and the local-only guard
// ---------------------------------------------------------------------------

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} root
 * @param {string | null} envHandle
 * @returns {string | null} the declared base URL, or null when undeclared
 */
function resolveTarget(root, envHandle) {
  if (envHandle !== null) {
    const h = readJsonOrNull(resolve(envHandle));
    if (h === null || typeof h !== 'object' || Array.isArray(h) || typeof h.baseUrl !== 'string' || h.baseUrl === '') {
      throw new Halt('FAILED_ENV_HANDLE_INVALID', 'the --env-handle file must be a JSON object with a string baseUrl key');
    }
    return h.baseUrl;
  }
  const cfg = readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json'));
  return cfg && typeof cfg.baseUrl === 'string' && cfg.baseUrl !== '' ? cfg.baseUrl : null;
}

/**
 * @typedef {{ checkTarget: (u: string, o?: any) => Promise<any>, isAllowedHost: (h: string, s: any) => boolean }} GuardModule
 * @typedef {{ guard: GuardModule, origin: string, allowedHosts: Set<string> } | null} Target
 */

// GUARD-SITE
/**
 * Runs the local-only guard before any request, login or write. A missing or
 * unimportable guard module fails closed.
 * @param {string | null} baseUrl
 * @param {string} root
 * @returns {Promise<Target>}
 */
async function guardTarget(baseUrl, root) {
  if (baseUrl === null) return null;
  /** @type {GuardModule} */ let guard;
  try {
    guard = await import(pathToFileURL(join(PLUGIN_ROOT, 'scripts', 'auth-local-guard.mjs')).href);
    if (typeof guard.checkTarget !== 'function' || typeof guard.isAllowedHost !== 'function') throw new Error('guard exports missing');
  } catch {
    throw new Halt('FAILED_GUARD_UNAVAILABLE', 'the local-only guard script could not be loaded; refusing to continue (fail closed)');
  }
  const r = await guard.checkTarget(baseUrl, { root });
  if (!r.ok) throw new Halt('FAILED_NON_LOCAL_TARGET', `${r.reason} (host: ${r.host})`);
  return { guard, origin: r.origin, allowedHosts: r.allowedHosts };
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

/**
 * @typedef {{ index: number, action: string, result: string, evidence: string | null }} StepRecord
 * @typedef {{ outcome: string, reason_code: string | null, reason: string | null, evidence: string[], steps?: StepRecord[] }} CaseResult
 * @typedef {{ root: string, runDirAbs: string, runDirRel: string, table: RedactionTable, target: NonNullable<Target>, playwright: any, loginConfig: any, sessions: Map<string, any>, seeds: Map<string, any>, seedConfig: any, anonChecks: Map<string, any> }} RunCtx
 * @typedef {{ path: string | null, token: string | null, header?: string | null, valuePrefix?: string | null }} SessionInfo
 */

/** @type {Record<string, (ctx: RunCtx, kase: ReportCase, plan: any, session: SessionInfo | null) => Promise<CaseResult>>} */
const DRIVERS = Object.create(null);

/** @param {string} code @param {string} reason @param {string[]} [evidence] @returns {CaseResult} */
const blocked = (code, reason, evidence = []) => ({ outcome: 'blocked', reason_code: code, reason, evidence });
/** @param {string} code @param {string} reason @returns {CaseResult} */
const needsHuman = (code, reason) => ({ outcome: 'needs-human', reason_code: code, reason, evidence: [] });

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
const isStr = (/** @type {any} */ v) => typeof v === 'string';
const isObj = (/** @type {any} */ v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const HTTP_ACTIONS = ['request', 'query'];
const API_ORIGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const BROWSER_ACTIONS = ['goto', 'click', 'fill', 'expect_visible', 'expect_text', 'expect_url', 'query', 'expect_value', 'expect_not_visible', 'expect_state', 'expect_requests'];
const API_HEADER_FORBIDDEN = ['host', 'content-length', 'cookie', 'transfer-encoding'];
const LOCATOR_ACTIONS = ['click', 'fill', 'expect_visible', 'expect_text', 'expect_value', 'expect_not_visible', 'expect_state'];
const LOCATOR_ROLES = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'heading', 'tab', 'menuitem', 'option', 'switch', 'searchbox', 'spinbutton', 'slider', 'dialog', 'alert', 'status', 'row', 'cell', 'columnheader', 'listitem', 'img', 'navigation', 'region', 'table', 'menu', 'tabpanel'];

/**
 * The browser steps that assert something is present: each fails the case when its element is missing, so
 * a pass proves the page rendered on that route and can anchor an absence step. `expect_url` is absent on
 * purpose (it asserts a path, not that anything rendered), `goto` too (`page.goto` resolves for an error
 * page), and so are `click` and `fill` (actions, not assertions).
 */
export const POSITIVE_ASSERTION_ACTIONS = Object.freeze(['expect_visible', 'expect_text', 'expect_value', 'expect_state']);

/** The element states `expect_state` can assert. The runner reads each through Playwright's locator API, never the snapshot token. */
export const EXPECT_STATES = Object.freeze(['expanded', 'disabled', 'checked']);

/**
 * The strict locator form of a browser step: role plus name, or visible text. Pure, no I/O.
 * Returns null when the step carries none of the keys role, name, text.
 * @param {any} step
 * @returns {null | { ok: false, why: string } | { ok: true, form: 'role', role: string, name: string } | { ok: true, form: 'text', text: string }}
 */
export function locatorOf(step) {
  if (!isObj(step)) return null;
  const hasRole = step.role !== undefined;
  const hasName = step.name !== undefined;
  const hasText = step.text !== undefined;
  if (!hasRole && !hasName && !hasText) return null;
  if (step.selector !== undefined || (hasText && (hasRole || hasName))) {
    return { ok: false, why: 'a step names one locator form: selector, role and name, or text' };
  }
  if (hasText) {
    if (!isStr(step.text) || step.text.trim() === '') return { ok: false, why: 'text must be a non-empty string' };
    return { ok: true, form: 'text', text: step.text };
  }
  if (hasRole !== hasName) return { ok: false, why: 'role and name go together' };
  if (!isStr(step.role) || !LOCATOR_ROLES.includes(step.role)) return { ok: false, why: 'role must be one of the supported roles' };
  if (!isStr(step.name) || step.name.trim() === '') return { ok: false, why: 'name must be a non-empty string' };
  return { ok: true, form: 'role', role: step.role, name: step.name };
}

/**
 * Classifies a declared additional API origin. Pure, no I/O. Ordered refusals; a reason names the
 * origin name only, never a URL or a value.
 * @param {any} apiOrigins the api_origins map of login.config.json
 * @param {any} name
 * @returns {{ ok: false, code: string, reason: string } | { ok: true, name: string, url: string, header: string | null, cookie: string | null, valuePrefix: string }}
 */
export function classifyApiOrigin(apiOrigins, name) {
  const entry = isObj(apiOrigins) && isStr(name) && Object.hasOwn(apiOrigins, name) ? apiOrigins[name] : undefined;
  if (!isObj(entry)) {
    return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `the origin ${String(name)} is not declared in api_origins; nothing was requested` };
  }
  /** @param {string} why */
  const bad = (why) => ({ ok: false, code: 'API_ORIGIN_INVALID', reason: `api_origins[${name}] is malformed: ${why}` });
  if (!isStr(entry.url) || entry.url === '' || /\s/.test(entry.url)) return bad('url must be a non-empty string without whitespace');
  const hasHeader = entry.header !== undefined;
  const hasCookie = entry.cookie !== undefined;
  if (hasHeader !== hasCookie) return bad('header and cookie must be declared together');
  if (hasHeader) {
    if (!isStr(entry.header) || !/^[A-Za-z0-9-]{1,64}$/.test(entry.header) || API_HEADER_FORBIDDEN.includes(entry.header.toLowerCase())) return bad('header is not an allowed header name');
    if (!isStr(entry.cookie) || !/^[A-Za-z0-9._-]{1,128}$/.test(entry.cookie)) return bad('cookie is not a valid cookie name');
  }
  if (entry.value_prefix !== undefined && !(isStr(entry.value_prefix) && entry.value_prefix.length <= 32 && !/[\r\n]/.test(entry.value_prefix))) {
    return bad('value_prefix must be a string of at most 32 characters without line breaks');
  }
  return {
    ok: true,
    name: /** @type {string} */ (name),
    url: entry.url,
    header: hasHeader ? entry.header : null,
    cookie: hasCookie ? entry.cookie : null,
    valuePrefix: entry.value_prefix === undefined ? '' : entry.value_prefix,
  };
}

/**
 * Builds the derived header from the named cookie of a saved storage state. Pure.
 * @param {{ header: string | null, cookie: string | null, valuePrefix: string }} spec
 * @param {any} state parsed storage-state
 * @param {string} host the guarded origin's hostname
 * @returns {{ ok: true, name: string, value: string, raw: string } | { ok: false, code: string, reason: string }}
 */
export function deriveApiHeader(spec, state, host) {
  const cookies = isObj(state) && Array.isArray(state.cookies) ? state.cookies : [];
  const usable = cookies.filter((/** @type {any} */ c) => isObj(c) && c.name === spec.cookie && isStr(c.value) && c.value !== '');
  const want = String(host).toLowerCase();
  const pick = usable.find((/** @type {any} */ c) => isStr(c.domain) && c.domain.toLowerCase().replace(/^\./, '') === want) ?? usable[0];
  if (pick === undefined) {
    return { ok: false, code: 'API_HEADER_SOURCE_MISSING', reason: `the role session has no usable cookie named ${spec.cookie}` };
  }
  return { ok: true, name: /** @type {string} */ (spec.header), value: `${spec.valuePrefix}${pick.value}`, raw: pick.value };
}

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/**
 * The per-step rules of the closed vocabulary. Returns the rejection text, or the number of expectations the step carries.
 * @param {string} driver
 * @param {any} s
 * @returns {{ why: string } | { expectations: number }}
 */
function stepRules(driver, s) {
  const bad = (/** @type {string} */ why) => ({ why });
  let expectations = 0;
  if (!isObj(s) || !isStr(s.action)) {
    const keys = isObj(s) ? Object.keys(s) : [];
    const known = driver === 'http' ? HTTP_ACTIONS : BROWSER_ACTIONS;
    if (keys.length === 1 && known.includes(keys[0]) && isObj(s[keys[0]])) {
      return bad('nested step form is not accepted; use the flat shape {"action": "<name>", ...}');
    }
    return bad('not an object with a string action');
  }
  if (s.action === 'query') {
    if (s.session !== undefined) return bad('query takes no session key');
    if (!isStr(s.source) || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(s.source)) return bad('query needs a source name of letters, digits, _ or -');
    if (!isStr(s.sql) || s.sql === '') return bad('query needs a string sql');
    if (s.expect_rows !== undefined) {
      if (!Number.isInteger(s.expect_rows) || s.expect_rows < 0) return bad('expect_rows must be a non-negative integer');
      expectations++;
    }
    if (s.expect_json !== undefined) {
      if (!isObj(s.expect_json) || !isStr(s.expect_json.path) || !('equals' in s.expect_json)) return bad('expect_json needs path and equals');
      expectations++;
    }
    if (expectations === 0) return bad('query needs expect_rows or expect_json');
    return { expectations };
  }
  if (driver === 'http') {
    if (s.action !== 'request') return bad(`unknown http action ${JSON.stringify(s.action)}`);
    if (!HTTP_METHODS.includes(s.method)) return bad('method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
    if (!isStr(s.path)) return bad('path must be a string');
    if (s.origin !== undefined && !(isStr(s.origin) && API_ORIGIN_NAME.test(s.origin))) return bad('origin must be a declared api_origins name of letters, digits, _ or -');
    if (s.session !== undefined && s.session !== 'none') return bad('session must be the string "none" when present');
    if (s.expect_status !== undefined) {
      if (!Number.isInteger(s.expect_status)) return bad('expect_status must be an integer');
      expectations++;
    }
    if (s.expect_body_contains !== undefined) {
      if (!isStr(s.expect_body_contains)) return bad('expect_body_contains must be a string');
      expectations++;
    }
    if (s.expect_json !== undefined) {
      if (!isObj(s.expect_json) || !isStr(s.expect_json.path) || !('equals' in s.expect_json)) return bad('expect_json needs path and equals');
      expectations++;
    }
  } else {
    if (s.session !== undefined) return bad(`${s.action} takes no session key; a request without the role's session is an http request step`);
    const loc = LOCATOR_ACTIONS.includes(s.action) ? locatorOf(s) : null;
    if (loc !== null) {
      if (!loc.ok) return bad(`${s.action}: ${loc.why}`);
      if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');
      if (s.action === 'expect_text' && !isStr(s.contains)) return bad('expect_text needs a string contains');
      if (s.action === 'expect_value') {
        if (loc.form !== 'role') return bad('expect_value needs a role and a name');
        const comparisons = [s.equals, s.contains, s.not_empty].filter((v) => v !== undefined).length;
        if (comparisons !== 1) return bad('expect_value needs exactly one of equals, contains or not_empty');
        if (s.equals !== undefined && !isStr(s.equals)) return bad('expect_value equals must be a string');
        if (s.contains !== undefined && !(isStr(s.contains) && s.contains !== '')) return bad('expect_value contains must be a non-empty string');
        if (s.not_empty !== undefined && s.not_empty !== true) return bad('expect_value not_empty must be true');
      }
      if (s.action === 'expect_state') {
        if (loc.form !== 'role') return bad('expect_state needs a role and a name');
        if (!EXPECT_STATES.includes(s.state)) return bad('expect_state state must be one of expanded, disabled, checked');
        if (typeof s.equals !== 'boolean') return bad('expect_state needs a boolean equals');
      }
      return { expectations: POSITIVE_ASSERTION_ACTIONS.includes(s.action) || s.action === 'expect_not_visible' ? 1 : 0 };
    }
    switch (s.action) {
      case 'goto':
        if (!isStr(s.path)) return bad('goto needs a string path');
        break;
      case 'click':
        if (!isStr(s.selector)) return bad('click needs a string selector');
        break;
      case 'fill':
        if (!isStr(s.selector) || !isStr(s.value)) return bad('fill needs a string selector and value');
        break;
      case 'expect_visible':
        if (!isStr(s.selector)) return bad('expect_visible needs a string selector');
        expectations++;
        break;
      case 'expect_text':
        if (!isStr(s.selector) || !isStr(s.contains)) return bad('expect_text needs a string selector and contains');
        expectations++;
        break;
      case 'expect_url':
        if (!isStr(s.path)) return bad('expect_url needs a string path');
        expectations++;
        break;
      case 'expect_value':
      case 'expect_state':
        return bad(`${s.action} needs a role and a name`);
      case 'expect_not_visible':
        return bad('expect_not_visible needs a role and a name, or a text');
      case 'expect_requests': {
        if (Object.keys(s).some((k) => !['action', 'method', 'url_contains', 'count'].includes(k))) {
          return bad('expect_requests takes only method, url_contains and count');
        }
        if (!HTTP_METHODS.includes(s.method)) return bad('expect_requests method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
        if (!isStr(s.url_contains) || s.url_contains.length > 200 || !/^\/(?!\/)[^\s?#]*$/.test(s.url_contains)) {
          return bad('expect_requests url_contains must be a path that starts with a single / and carries no query string, fragment or whitespace, of at most 200 characters');
        }
        if (!Number.isInteger(s.count) || s.count < 0 || s.count > EXPECT_REQUESTS_COUNT_MAX) {
          return bad(`expect_requests count must be an integer from 0 to ${EXPECT_REQUESTS_COUNT_MAX}`);
        }
        expectations++;
        break;
      }
      default:
        return bad(`unknown browser action ${JSON.stringify(s.action)}`);
    }
  }
  return { expectations };
}

/**
 * Every {{name}} reference in the string leaves of a step (any depth), the action key excluded.
 * @param {any} step
 * @returns {string[]}
 */
function stepVariables(step) {
  /** @type {string[]} */ const names = [];
  /** @param {any} v */
  const walk = (v) => {
    if (isStr(v)) {
      for (const m of v.matchAll(VARIABLE_PATTERN)) names.push(m[1]);
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x);
    } else if (isObj(v)) {
      for (const x of Object.values(v)) walk(x);
    }
  };
  if (isObj(step)) for (const [k, v] of Object.entries(step)) if (k !== 'action') walk(v);
  return names;
}

/**
 * Validates one plan step against the closed vocabulary (reason text carries no step prefix).
 * @param {string} driver
 * @param {any} step
 * @returns {{ code: string, reason: string } | null}
 */
export function validateStep(driver, step) {
  const r = stepRules(driver, step);
  return 'why' in r ? { code: 'PLAN_ENTRY_INVALID', reason: r.why } : null;
}

/**
 * Validates a plan entry's steps against the closed vocabulary.
 * @param {string} driver
 * @param {any[]} steps
 * @param {string[]} [boundNames] variable names a declared capture binds for this case
 * @returns {{ code: string, reason: string } | null}
 */
export function validateSteps(driver, steps, boundNames = []) {
  let expectations = 0;
  // The absence anchor: the route of the latest positive assertion since the last goto. An absence
  // step on a page that never rendered would pass vacuously (a locator that matches nothing is hidden).
  /** @type {string | null} */ let route = null;
  /** @type {string | null | undefined} */ let anchored;
  // Whether a goto, click or fill step of the case came earlier: a request count needs an action to observe.
  let interacted = false;
  for (const [i, s] of steps.entries()) {
    const r = stepRules(driver, s);
    if ('why' in r) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${r.why}` };
    expectations += r.expectations;
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name)) {
        return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: variable ${name} is not bound by a capture declared for this case` };
      }
    }
    if (driver === 'browser' && isObj(s)) {
      if (s.action === 'goto' || s.action === 'expect_url') route = routeKey(s.path);
      if (s.action === 'goto') anchored = undefined;
      if (POSITIVE_ASSERTION_ACTIONS.includes(s.action)) anchored = route;
      if (s.action === 'expect_not_visible' && (anchored === undefined || anchored !== route)) {
        return {
          code: 'PLAN_ENTRY_INVALID',
          reason: `step ${i + 1}: expect_not_visible needs an earlier expect_visible, expect_text, expect_value or expect_state step on the same route since the last goto`,
        };
      }
      if (s.action === 'expect_requests') {
        if (!interacted) {
          return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: expect_requests needs an earlier goto, click or fill step in the same case` };
        }
        if (s.count === 0 && (anchored === undefined || anchored !== route)) {
          return {
            code: 'PLAN_ENTRY_INVALID',
            reason: `step ${i + 1}: expect_requests with count 0 needs an earlier expect_visible, expect_text, expect_value or expect_state step on the same route since the last goto`,
          };
        }
      }
      if (s.action === 'goto' || s.action === 'click' || s.action === 'fill') interacted = true;
    }
  }
  if (expectations === 0) return { code: 'NO_EXPECTATION', reason: 'the plan entry carries no expectation step, so no pass could be earned' };
  return null;
}

/**
 * One per-step record per plan step: ran-and-passed, the step that ended the case, or not-run.
 * Carries only the action name, the index and an evidence path, never a value.
 * @param {any[]} planSteps
 * @param {number} ran how many steps started (the first `ran` steps ran)
 * @param {number} failedAt zero-based index of the step that ended the case, or -1
 * @param {(i: number) => string | null} evidenceFor
 * @returns {StepRecord[]}
 */
function recordSteps(planSteps, ran, failedAt, evidenceFor) {
  return planSteps.map((s, i) => ({
    index: i + 1,
    action: isObj(s) && isStr(s.action) ? s.action : 'unknown',
    result: i >= ran ? 'not-run' : i === failedAt ? 'failed' : 'passed',
    evidence: i < ran ? evidenceFor(i) : null,
  }));
}

/**
 * A partial plan whose objective steps all passed is not a pass: the remainder is human work.
 * A failed (or blocked) objective step is returned unchanged.
 * @param {CaseResult} result
 * @param {any} entry the plan entry
 * @returns {CaseResult}
 */
export function applyPartialRemainder(result, entry) {
  if (!isObj(entry) || !isObj(entry.human_remainder) || result.outcome !== 'pass') return result;
  const prior = Array.isArray(result.steps) ? result.steps : [];
  const last = prior.length > 0 ? prior[prior.length - 1].index : 0;
  return {
    ...result,
    outcome: 'needs-human',
    reason_code: 'PARTIAL_REMAINDER',
    reason: 'the objective steps passed; the remaining steps are human work and are reproduced verbatim',
    evidence: result.evidence,
    steps: [...prior, { index: last + 1, action: 'human_remainder', result: 'human', evidence: null }],
  };
}

/**
 * The URL pathname of a route, resolved against a placeholder origin. Pure.
 * @param {any} path
 * @returns {string | null}
 */
export function routeKey(path) {
  if (!isStr(path)) return null;
  try {
    return new URL(path, 'http://route.invalid').pathname;
  } catch {
    return null;
  }
}

/** A snapshot line whose text sits inline after the colon: a paragraph, a list item or a cell. */
const INLINE_TEXT_LINE = /^\s*-\s+(?:paragraph|listitem|cell):\s*(.+?)\s*$/;
/** The inline form has its own cap, so a long table can never displace a button or a heading that follows it. */
const INLINE_TEXT_CAP = 300;

/**
 * The content of an inline snapshot value, or null when it cannot be reproduced exactly. Playwright
 * double-quotes a value that needs quoting and escapes only a backslash, a double quote and control
 * characters; any other escape or an unterminated quote yields null (no candidate beats a wrong one).
 * A plain value is returned as emitted. Pure.
 * @param {string} raw
 * @returns {string | null}
 */
function inlineScalar(raw) {
  if (!raw.startsWith('"')) return raw;
  const quoted = /^"((?:[^"\\]|\\["\\])*)"$/.exec(raw);
  if (quoted === null) return null;
  return quoted[1].replace(/\\(["\\])/g, '$1');
}

/**
 * Role-and-name and text candidates from the text `locator.ariaSnapshot()` returns. Pure.
 * @param {any} yaml
 * @returns {({ kind: 'role', role: string, name: string } | { kind: 'text', text: string })[]}
 */
export function parseAriaSnapshot(yaml) {
  if (!isStr(yaml)) return [];
  /** @type {({ kind: 'role', role: string, name: string } | { kind: 'text', text: string })[]} */ const out = [];
  const seen = new Set();
  let plain = 0;
  let inline = 0;
  for (const line of yaml.split(/\r?\n/)) {
    if (plain >= 300 && inline >= INLINE_TEXT_CAP) break;
    /** @type {any} */ let cand = null;
    let isInline = false;
    const m = /^\s*-\s+([a-z]+)\s+"((?:[^"\\]|\\.)*)"/.exec(line);
    if (m !== null) {
      const name = m[2].replace(/\\(["\\])/g, '$1');
      if (LOCATOR_ROLES.includes(m[1]) && name.trim() !== '') cand = { kind: 'role', role: m[1], name };
    } else {
      const t = /^\s*-\s+text:\s*(.+?)\s*$/.exec(line);
      if (t !== null && t[1].trim() !== '' && t[1].length <= 200) cand = { kind: 'text', text: t[1] };
      const p = INLINE_TEXT_LINE.exec(line);
      if (p !== null) {
        const text = inlineScalar(p[1]);
        if (text !== null && text.trim() !== '' && text.length <= 200) {
          cand = { kind: 'text', text };
          isInline = true;
        }
      }
    }
    if (cand === null) continue;
    const key = JSON.stringify(cand);
    if (seen.has(key)) continue;
    if (isInline ? inline >= INLINE_TEXT_CAP : plain >= 300) continue;
    seen.add(key);
    out.push(cand);
    if (isInline) inline++;
    else plain++;
  }
  return out;
}

const SNAPSHOT_EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Splits snapshot entries into those safe to write and a count of those withheld (a secret known to
 * the table, an e-mail address or a declared pattern). A withheld entry is never written redacted.
 * @param {any[]} entries
 * @param {RedactionTable} table
 * @returns {{ kept: any[], withheld: number }}
 */
export function partitionSnapshotEntries(entries, table) {
  /** @type {any[]} */ const kept = [];
  let withheld = 0;
  for (const e of entries) {
    const value = isStr(e.name) ? e.name : isStr(e.text) ? e.text : '';
    if (containsSecret(value, table) || SNAPSHOT_EMAIL_PATTERN.test(value)) withheld++;
    else kept.push(e);
  }
  return { kept, withheld };
}

/**
 * Reads the page's accessibility snapshot until two successive reads are equal, within a bound. The
 * reader, the clock and the sleep are injectable, so a test drives the loop with a fake clock and no
 * browser. A rejected or non-string read is unreadable: it resets the pair and never counts as equal.
 * @param {() => Promise<string | null>} read
 * @param {{ boundMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number }} [opts]
 * @returns {Promise<{ status: 'stable', yaml: string, reads: number } | { status: 'unstable', reads: number } | { status: 'unavailable' }>}
 */
export async function waitForStableSnapshot(read, opts = {}) {
  const boundMs = opts.boundMs ?? GROUND_STABLE_BOUND_MS;
  const intervalMs = opts.intervalMs ?? GROUND_POLL_INTERVAL_MS;
  const sleep = opts.sleep ?? ((/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms)));
  const now = opts.now ?? (() => performance.now());
  /** @returns {Promise<string | null>} */
  const take = async () => {
    try {
      const v = await read();
      return isStr(v) ? v : null;
    } catch {
      return null;
    }
  };
  /** @type {string | null} */ let previous = await take();
  if (previous === null) return { status: 'unavailable' };
  const deadline = now() + boundMs;
  let reads = 1;
  while (now() + intervalMs <= deadline) {
    await sleep(intervalMs);
    const current = await take();
    reads++;
    if (current !== null && current === previous) return { status: 'stable', yaml: current, reads };
    previous = current;
  }
  return { status: 'unstable', reads };
}

/**
 * The window a value or a state is re-read before the step is decided. It mirrors the 5-second default
 * timeout of Playwright's web-first assertions; chosen, not measured, and the dogfood recalibrates it.
 */
export const ASSERT_SETTLE_MS = 5000;

/** The pause between two re-reads of a value or a state: the first step of Playwright's own retry schedule. Chosen. */
export const ASSERT_POLL_INTERVAL_MS = 100;

/**
 * Re-reads a value or a state until a read is accepted, within a bound. The reader, the acceptance
 * test, the clock and the sleep are injectable, so a test drives the loop with a fake clock and no
 * browser. A read that throws is unreadable for that round and never counts as accepted. The result
 * carries only a status and a read count: the value that was read is never returned, so a caller
 * cannot leak it by accident.
 * @param {() => Promise<any>} read
 * @param {(value: any) => boolean} accept
 * @param {{ boundMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number }} [opts]
 * @returns {Promise<{ status: 'accepted' | 'rejected' | 'unreadable', reads: number }>}
 */
export async function settleAssertion(read, accept, opts = {}) {
  const boundMs = opts.boundMs ?? ASSERT_SETTLE_MS;
  const intervalMs = opts.intervalMs ?? ASSERT_POLL_INTERVAL_MS;
  const sleep = opts.sleep ?? ((/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms)));
  const now = opts.now ?? (() => performance.now());
  let reads = 0;
  let readable = 0;
  /** @returns {Promise<boolean>} */
  const take = async () => {
    reads++;
    try {
      const value = await read();
      readable++;
      return accept(value) === true;
    } catch {
      return false;
    }
  };
  if (await take()) return { status: 'accepted', reads };
  const deadline = now() + boundMs;
  while (now() + intervalMs <= deadline) {
    await sleep(intervalMs);
    if (await take()) return { status: 'accepted', reads };
  }
  return { status: readable > 0 ? 'rejected' : 'unreadable', reads };
}

/**
 * The comparison an `expect_value` step declares, as a closed word. Pure.
 * @param {any} step
 * @returns {'not_empty' | 'equals' | 'contains' | null}
 */
export function comparisonKindOf(step) {
  if (!isObj(step)) return null;
  if (step.not_empty === true) return 'not_empty';
  if (isStr(step.equals)) return 'equals';
  if (isStr(step.contains) && step.contains !== '') return 'contains';
  return null;
}

/**
 * Compares an input value with the comparison an `expect_value` step declares. Pure. Returns null when
 * the value is not a string or the step names no comparison. `equals` is exact (no trimming, no case
 * folding); `not_empty` ignores surrounding whitespace. The result carries the closed comparison word
 * and the verdict, never the value.
 * @param {any} step
 * @param {any} value
 * @returns {{ kind: 'not_empty' | 'equals' | 'contains', passed: boolean } | null}
 */
export function compareInputValue(step, value) {
  if (!isStr(value)) return null;
  const kind = comparisonKindOf(step);
  if (kind === null) return null;
  if (kind === 'not_empty') return { kind, passed: value.trim() !== '' };
  if (kind === 'equals') return { kind, passed: value === step.equals };
  return { kind, passed: value.includes(step.contains) };
}

/**
 * The boolean an `aria-expanded` attribute states: true for 'true', false for 'false', null for anything
 * else (an absent attribute, an empty one, 'mixed'), because an element that exposes no expanded state
 * must never be read as collapsed. Pure.
 * @param {any} attribute
 * @returns {boolean | null}
 */
export function ariaExpandedOf(attribute) {
  if (attribute === 'true') return true;
  if (attribute === 'false') return false;
  return null;
}

// REQUEST-OBSERVATION-BEGIN
/**
 * How long an `expect_requests` step keeps watching after it starts, so a request that a handler issues
 * after its click returned is inside the window and a duplicate submit is counted. Chosen, not measured;
 * the Phase 8 dogfood recalibrates it.
 */
export const EXPECT_REQUESTS_SETTLE_MS = 2000;

/** The largest `count` an `expect_requests` step may declare. Chosen, not measured; the Phase 8 dogfood recalibrates it. */
export const EXPECT_REQUESTS_COUNT_MAX = 100;

/**
 * The most matching requests the evidence file of an `expect_requests` step lists; the observed count is
 * always exact. Chosen, not measured; the Phase 8 dogfood recalibrates it.
 */
export const EXPECT_REQUESTS_EVIDENCE_MAX = 50;

/**
 * Classifies one observed request. Pure. Keeps the method, the host (with an explicit port) and the whole
 * path, and whether the local-only guard approves the host: the query string and the fragment of the URL
 * are never read, so a value that travels in either cannot reach the result. Returns null for a URL that
 * is not a network request (`data:`, `about:`, `blob:`). Text that does not parse is returned as a request
 * of no host and no path that the guard does not approve. The path is never cut here: matching and
 * counting run on this value, and the size cap of the evidence listing is applied after the redaction.
 * @param {any} rawUrl
 * @param {any} rawMethod
 * @param {any} target
 * @returns {{ method: string, host: string, path: string, local: boolean } | null}
 */
export function classifyObservedRequest(rawUrl, rawMethod, target) {
  const method = String(rawMethod).toUpperCase();
  /** @type {URL} */ let u;
  try {
    u = new URL(String(rawUrl));
  } catch {
    return { method, host: '', path: '', local: false };
  }
  if (['data:', 'about:', 'blob:'].includes(u.protocol)) return null;
  let local = false;
  if (u.protocol === 'http:' || u.protocol === 'https:') {
    try {
      local = target.guard.isAllowedHost(u.hostname, target.allowedHosts) === true;
    } catch {
      local = false;
    }
  }
  return { method, host: u.host, path: u.pathname, local };
}

/**
 * Decides one `expect_requests` step against the requests of its window. Pure. The path needle is the
 * pathname of the step's `url_contains` parsed as a URL path, so a character the URL parser encodes in a
 * recorded path is encoded the same way in the needle. A matching request (same method, path contains the
 * needle) to a host the guard does not approve returns `non-local`; a request that does not match is
 * never inspected beyond its method and path. Otherwise the step passes exactly when the number of
 * matching requests equals `count`; `matching` carries method, host and path only, the path as recorded.
 * @param {any} window
 * @param {any} step
 * @returns {{ status: 'non-local' } | { status: 'passed' | 'failed', observed: number, matching: { method: string, host: string, path: string }[] }}
 */
export function evaluateRequestWindow(window, step) {
  const entries = Array.isArray(window) ? window : [];
  /** @type {string | null} */ let needle = null;
  if (isObj(step) && isStr(step.url_contains)) {
    try {
      needle = new URL(step.url_contains, 'http://needle.invalid').pathname;
    } catch {
      needle = step.url_contains;
    }
  }
  const method = isObj(step) ? step.method : undefined;
  const matching = needle === null ? [] : entries.filter((e) => isObj(e) && e.method === method && isStr(e.path) && e.path.includes(needle));
  if (matching.some((e) => e.local !== true)) return { status: 'non-local' };
  const observed = matching.length;
  return {
    status: isObj(step) && observed === step.count ? 'passed' : 'failed',
    observed,
    matching: matching.map((e) => ({ method: e.method, host: e.host, path: e.path })),
  };
}

/**
 * Waits out the settle window of an `expect_requests` step and only then slices the log from the start of
 * the window, so a request that arrives during the wait is inside it. The sleep and the wait are
 * injectable, so a test drives the wait with no browser and no clock.
 * @param {any[]} log
 * @param {number} windowStart
 * @param {{ sleep?: (ms: number) => Promise<void>, settleMs?: number }} [opts]
 * @returns {Promise<any[]>}
 */
export async function settleRequestWindow(log, windowStart, opts = {}) {
  const sleep = opts.sleep ?? ((/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms)));
  await sleep(opts.settleMs ?? EXPECT_REQUESTS_SETTLE_MS);
  return log.slice(Math.max(0, Number.isInteger(windowStart) ? windowStart : 0));
}

/**
 * Starts logging every request the page issues. The listener reads the URL and the method of a request
 * and nothing else, and keeps only what `classifyObservedRequest` returns, so the log holds no query
 * string, fragment, header, cookie, token or body. A request the host-abort route then stops is still
 * logged, with the guard's verdict on its host.
 * @param {any} page
 * @param {any} target
 * @returns {{ method: string, host: string, path: string, local: boolean }[]}
 */
export function observeRequests(page, target) {
  /** @type {{ method: string, host: string, path: string, local: boolean }[]} */ const log = [];
  page.on('request', (/** @type {any} */ request) => {
    const seen = classifyObservedRequest(request.url(), request.method(), target);
    if (seen !== null) log.push(seen);
  });
  return log;
}

// REQUEST-OBSERVATION-END

/**
 * Plan-time grounding pre-check. Returns null when every locator step is acceptable, else the first
 * refusal. A reason names a step position, never a locator value.
 * @param {any[]} steps
 * @param {any[]} snapshots
 * @param {any} manualText
 * @param {string | null} role
 * @returns {{ code: string, reason: string } | null}
 */
export function precheckGroundedSteps(steps, snapshots, manualText, role) {
  const wantRole = role === null ? 'anonymous' : role;
  const collapse = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  /** @type {string | null} */ let route = null;
  for (const [i, step] of steps.entries()) {
    const n = i + 1;
    if (!isObj(step)) continue;
    if (step.action === 'goto' || step.action === 'expect_url') route = routeKey(step.path);
    if (!LOCATOR_ACTIONS.includes(step.action)) continue;
    const loc = locatorOf(step);
    if (loc === null || !loc.ok) continue;
    // The snapshot is the one taken after exactly the case's own goto, click and fill steps before this
    // step when such a post-interaction snapshot exists; otherwise the first plain snapshot of the role
    // and route (a plain lookup never returns a post-interaction file, whatever the file order).
    const candidates = route === null ? [] : snapshots.filter((s) => isObj(s) && s.role === wantRole && s.route === route);
    const hist = interactionHistory(steps, i);
    const histKey = hist.some((h) => h.step.action !== 'goto') ? groundingPrefixKey(hist.map((h) => h.norm)) : null;
    const after = histKey === null ? undefined : candidates.find((s) => isPostInteractionSnapshot(s) && groundingPrefixKey(s.prefix) === histKey);
    const snap = after ?? candidates.find((s) => !isPostInteractionSnapshot(s));
    if (snap === undefined) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step` };
    }
    const entry = (Array.isArray(snap.entries) ? snap.entries : []).find((/** @type {any} */ e) =>
      isObj(e) && (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
    if (entry === undefined) {
      const hint = after === undefined && candidates.some((s) => isPostInteractionSnapshot(s))
        ? '; a post-interaction snapshot exists for this role and route, but the steps of this case before this one are not exactly its prefix'
        : '';
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator is not a snapshot entry${hint}` };
    }
    if (entry.matches !== 1) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator matched ${entry.matches} elements in the snapshot; a locator must match exactly one` };
    }
    if (after !== undefined) {
      // A value a consumed prefix typed must come from the report's own steps; the reason names a position only.
      for (const h of hist) {
        if (h.step.action !== 'fill') continue;
        const ok = isStr(manualText) && isStr(h.step.value) && collapse(manualText).includes(collapse(h.step.value));
        if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${h.at}: a fill value that a grounded prefix replays must come from the report's own steps` };
      }
    }
    if (step.action === 'expect_text') {
      const ok = isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains));
      if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_text contains must come from the report's own steps, not from the snapshot` };
    }
    if (step.action === 'expect_value') {
      // A literal expectation comes from the report's own steps; a {{name}} binding is validated against the declared captures.
      for (const key of ['equals', 'contains']) {
        const literal = step[key];
        if (!isStr(literal) || [...literal.matchAll(VARIABLE_PATTERN)].length > 0) continue;
        const ok = isStr(manualText) && collapse(manualText).includes(collapse(literal));
        if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_value ${key} must come from the report's own steps or be bound by a declared capture` };
      }
    }
  }
  return null;
}

/**
 * The four-key partition plus the two beside-the-rate counters.
 * @param {{ outcome: string, reason_code?: string | null }[]} entries
 * @returns {{ counts: Record<string, number>, record_resolved: number, partially_executed: number }}
 */
export function summarizeEntries(entries) {
  /** @type {Record<string, number>} */ const counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 };
  for (const e of entries) counts[e.outcome]++;
  return {
    counts,
    record_resolved: entries.filter((e) => e.reason_code === 'AUTOMATED_EVIDENCE').length,
    partially_executed: entries.filter((e) => e.reason_code === 'PARTIAL_REMAINDER').length,
  };
}

/**
 * The plan-facing closed catalogue of reason codes: the causes a plan entry may name when it declines a case
 * instead of executing it. `disposition` is the outcome a declined case is reported with; `reason` is a fixed
 * sentence that carries no planner-supplied text. A runtime halt code (session, probe, query or origin) stays a
 * specific runner code outside this list, and the planner-defect marker for a case the plan omitted entirely is
 * deliberately not a member.
 * @type {Readonly<Record<string, Readonly<{ disposition: 'needs-human' | 'blocked', reason: string }>>>}
 */
export const REASON_CATALOGUE = Object.freeze({
  UNGROUNDABLE_AFTER_INTERACTION: Object.freeze({
    disposition: 'needs-human',
    reason: 'the case needs an element that exists only after an interaction and cannot be grounded before it; the manual steps are reproduced verbatim',
  }),
  EXTERNAL_CHANNEL: Object.freeze({
    disposition: 'needs-human',
    reason: 'the case needs an external channel that no local driver reaches; the manual steps are reproduced verbatim',
  }),
  VISUAL_JUDGEMENT: Object.freeze({
    disposition: 'needs-human',
    reason: 'the case asks for a judgment of appearance that no driver can make; the manual steps are reproduced verbatim',
  }),
  VOCABULARY_GAP: Object.freeze({
    disposition: 'needs-human',
    reason: 'a step the case needs, or a declared source or origin for it, is missing from the closed vocabulary; the manual steps are reproduced verbatim',
  }),
  STEP_UNGROUNDED: Object.freeze({
    disposition: 'needs-human',
    reason: 'a step of the case could not be grounded to exactly one element; the manual steps are reproduced verbatim',
  }),
  PARTIAL_REMAINDER: Object.freeze({
    disposition: 'needs-human',
    reason: 'the objective steps ran and the rest of the case is human work; the manual steps are reproduced verbatim',
  }),
  PRODUCT_DEFECT: Object.freeze({
    disposition: 'blocked',
    reason: 'a known product defect blocks the case; the manual steps are reproduced verbatim',
  }),
  STATE_UNCONFIRMED: Object.freeze({
    disposition: 'blocked',
    reason: 'the state the case requires is not confirmed; the manual steps are reproduced verbatim',
  }),
});

/** Codes the runner derives itself (here from `human_remainder`); a plan entry may not declare them. */
export const RUNNER_OWNED_REASON_CODES = Object.freeze(['PARTIAL_REMAINDER']);

/** The four pre-run classes a plan entry may declare, in the order the frozen classification table lists them. */
export const CASE_CLASSES = Object.freeze(['automatable', 'needs-a-new-driver', 'human-by-nature', 'blocked-by-product']);

/** Reported for a case whose plan entry carries no valid class. Never declarable. */
export const CLASS_UNCLASSIFIED = 'unclassified';

/**
 * Validates the classification fields of one plan entry: `class`, `reason_code` and `objective_steps`. Pure.
 * An entry that carries none of the three is valid here, so every plan written before the fields existed behaves
 * exactly as it did. The runner validates and echoes what the plan declares; it never infers a class.
 * @param {any} entry
 * @returns {{ code: string, reason: string } | null}
 */
export function validatePlanClassification(entry) {
  /** @param {string} reason */
  const refuse = (reason) => ({ code: 'PLAN_ENTRY_INVALID', reason });
  /** @param {any} v */
  const bounded = (v) => {
    /** @type {string} */ let text;
    try {
      text = String(v);
    } catch {
      // an object whose own toString is not callable: name its type, never call a planner-supplied method
      text = Object.prototype.toString.call(v);
    }
    return JSON.stringify(text.slice(0, 64));
  };
  if (!isObj(entry)) return refuse('the plan entry is not an object');
  if (entry.class !== undefined && !(isStr(entry.class) && CASE_CLASSES.includes(entry.class))) {
    return refuse(`the plan entry's class ${bounded(entry.class)} is not one of the four classes (${CASE_CLASSES.join(', ')})`);
  }
  const code = entry.reason_code;
  if (code !== undefined) {
    if (!isStr(code) || !Object.hasOwn(REASON_CATALOGUE, code)) {
      return refuse(`the plan entry's reason_code ${bounded(code)} is not in the closed reason-code catalogue`);
    }
    if (RUNNER_OWNED_REASON_CODES.includes(code)) {
      return refuse(`the reason_code ${code} is derived by the runner from human_remainder; a plan entry may not declare it`);
    }
    const noSteps = entry.steps === undefined || (Array.isArray(entry.steps) && entry.steps.length === 0);
    if (!noSteps || entry.human_remainder !== undefined) {
      return refuse('a declining entry carries no steps or human_remainder');
    }
  }
  const objective = entry.objective_steps;
  if (objective !== undefined) {
    if (!Number.isInteger(objective) || objective < 0 || objective > 500) {
      return refuse(`the plan entry's objective_steps ${bounded(objective)} is not an integer from 0 to 500`);
    }
    if (Array.isArray(entry.steps) && entry.steps.length > 0 && objective < entry.steps.length) {
      return refuse(`the plan entry's objective_steps (${objective}) is below its ${entry.steps.length} executable steps; every executable step is an objective step`);
    }
  }
  return null;
}

/**
 * The case a declining plan entry yields: `needs-human` or `blocked` with the catalogued code and its fixed
 * reason. `null` when the entry declines nothing or fails validation. Pure.
 * @param {any} entry
 * @returns {CaseResult | null}
 */
export function declinedCase(entry) {
  if (!isObj(entry) || entry.reason_code === undefined) return null;
  if (validatePlanClassification(entry) !== null) return null;
  const spec = REASON_CATALOGUE[entry.reason_code];
  return spec.disposition === 'blocked' ? blocked(entry.reason_code, spec.reason) : needsHuman(entry.reason_code, spec.reason);
}

/**
 * The class a plan entry declares, or `unclassified` when it is absent or the entry is invalid. Pure.
 * @param {any} entry
 * @returns {string}
 */
export function classOf(entry) {
  if (!isObj(entry) || validatePlanClassification(entry) !== null || !isStr(entry.class)) return CLASS_UNCLASSIFIED;
  return entry.class;
}

/**
 * The objective-step count a plan entry declares: the declared integer, else the number of executable steps,
 * else `null` (a non-object, an invalid entry or a declining entry that declared none). Pure.
 * @param {any} entry
 * @returns {number | null}
 */
export function objectiveStepsOf(entry) {
  if (!isObj(entry) || validatePlanClassification(entry) !== null) return null;
  if (Number.isInteger(entry.objective_steps)) return entry.objective_steps;
  if (Array.isArray(entry.steps) && entry.steps.length > 0) return entry.steps.length;
  return null;
}

/**
 * The classification block of `results.json`, from entries that carry `class`, `outcome`, `reason_code`, `steps`
 * and `objective_steps`. A sibling of `summarizeEntries`, which it leaves untouched. A missing or unknown class
 * counts as `unclassified`; record-resolved and partially executed cases never count as driver-executed. Pure.
 * @param {any[]} entries
 * @returns {{ per_class: Record<string, number>, driver_executed: number, automatable_total: number, automatable_driver_executed: number, automatable_rate: number | null, objective_steps_executed: number, objective_steps_total: number, objective_steps_undeclared: number }}
 */
export function summarizeClassification(entries) {
  /** @type {Record<string, number>} */ const perClass = {};
  for (const c of [...CASE_CLASSES, CLASS_UNCLASSIFIED]) perClass[c] = 0;
  let driverExecuted = 0;
  let automatableTotal = 0;
  let automatableDriverExecuted = 0;
  let stepsExecuted = 0;
  let stepsTotal = 0;
  let stepsUndeclared = 0;
  for (const e of entries) {
    const cls = isObj(e) && isStr(e.class) && CASE_CLASSES.includes(e.class) ? e.class : CLASS_UNCLASSIFIED;
    perClass[cls]++;
    const executed = isObj(e) && (e.outcome === 'pass' || e.outcome === 'fail') && e.reason_code !== 'AUTOMATED_EVIDENCE';
    if (executed) driverExecuted++;
    if (cls === 'automatable') {
      automatableTotal++;
      if (executed) automatableDriverExecuted++;
    }
    if (cls === 'automatable' || cls === 'needs-a-new-driver') {
      const steps = isObj(e) && Array.isArray(e.steps) ? e.steps : [];
      stepsExecuted += steps.filter((/** @type {any} */ s) => isObj(s) && (s.result === 'passed' || s.result === 'failed')).length;
      if (isObj(e) && Number.isInteger(e.objective_steps)) stepsTotal += e.objective_steps;
      else stepsUndeclared++;
    }
  }
  return {
    per_class: perClass,
    driver_executed: driverExecuted,
    automatable_total: automatableTotal,
    automatable_driver_executed: automatableDriverExecuted,
    automatable_rate: automatableTotal === 0 ? null : Math.round((automatableDriverExecuted / automatableTotal) * 10000) / 10000,
    objective_steps_executed: stepsExecuted,
    objective_steps_total: stepsTotal,
    objective_steps_undeclared: stepsUndeclared,
  };
}

/**
 * Stamps every results entry with the class and the objective-step count its plan entry declares; an entry whose
 * plan entry is missing, carries another title or fails validation is stamped `unclassified` with a `null`
 * count. Mutates and returns `entries`.
 * @param {any[]} entries
 * @param {Map<number, any>} planByIndex
 * @returns {any[]}
 */
export function applyClassification(entries, planByIndex) {
  for (const e of entries) {
    const p = planByIndex.get(e.index);
    if (isObj(p) && p.title === e.title) {
      e.class = classOf(p);
      e.objective_steps = objectiveStepsOf(p);
    } else {
      e.class = CLASS_UNCLASSIFIED;
      e.objective_steps = null;
    }
  }
  return entries;
}

/**
 * Same-origin, guard-approved URL resolution.
 * @param {string} path
 * @param {NonNullable<Target>} target
 * @returns {string | null}
 */
function resolveStepUrl(path, target) {
  /** @type {URL} */ let u;
  try {
    u = new URL(path, target.origin);
  } catch {
    return null;
  }
  if (u.origin !== target.origin) return null;
  if (!target.guard.isAllowedHost(u.hostname, target.allowedHosts)) return null;
  return u.href;
}

/**
 * @param {string} root
 * @param {string} pluginRoot
 * @returns {any | null}
 */
function loadPlaywright(root, pluginRoot) {
  for (const base of [join(root, 'package.json'), join(pluginRoot, 'scripts', 'visual', 'package.json')]) {
    try {
      return createRequire(base)('playwright');
    } catch {
      // try the next resolution root
    }
  }
  return null;
}

/**
 * @param {any} obj
 * @param {string} path
 * @returns {any}
 */
function getPath(obj, path) {
  let cur = obj;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

const CAPTURE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * The variable names a declared seed binds (well-formed `captures` entries only).
 * @param {any} seedConfig
 * @param {string} requiredStateText
 * @param {any} planState
 * @returns {string[]}
 */
export function declaredCaptureNames(seedConfig, requiredStateText, planState) {
  if (planState !== 'declared') return [];
  const states = isObj(seedConfig) && isObj(seedConfig.states) ? seedConfig.states : null;
  if (states === null || !Object.hasOwn(states, requiredStateText)) return [];
  const decl = states[requiredStateText];
  if (!isObj(decl) || !isObj(decl.captures)) return [];
  return Object.entries(decl.captures)
    .filter(([name, entry]) => CAPTURE_NAME_PATTERN.test(name) && isObj(entry) && isStr(entry.path) && entry.path !== '')
    .map(([name]) => name);
}

/**
 * Decides whether a seed declaration may run. Pure: no I/O. Null means it may run;
 * otherwise the first refusal wins (undeclared, command gap, unconfirmed, no checkable store).
 * @param {any} decl
 * @param {string} text the required-state text the declaration is keyed by
 * @returns {{ code: string, reason: string } | null}
 */
export function classifySeedDeclaration(decl, text) {
  const wellFormed = (/** @type {any} */ c) => Array.isArray(c) && c.length > 0 && c.every((a) => isStr(a) && a !== '');
  if (!isObj(decl) || (decl.command !== null && !wellFormed(decl.command))) {
    return { code: 'STATE_UNDECLARED', reason: `the required state is not declared: PRPs/auth/qa-seed.json states[${JSON.stringify(text)}]` };
  }
  if (decl.command === null) {
    const gap = isStr(decl.gap) && decl.gap !== '' ? `: ${decl.gap.slice(0, 200)}` : '';
    return { code: 'STATE_COMMAND_MISSING', reason: `no project command is declared for the required state ${JSON.stringify(text)}${gap}` };
  }
  if (decl.status !== 'confirmed') {
    return { code: 'STATE_UNCONFIRMED', reason: `the seed declaration for the required state ${JSON.stringify(text)} is not confirmed; review the entry and set "status": "confirmed" in PRPs/auth/qa-seed.json` };
  }
  if (normalizeStore(decl.store) === null) {
    return { code: 'FAILED_NON_LOCAL_TARGET', reason: 'the seed declaration names no checkable store; the command was not executed' };
  }
  return null;
}

/**
 * Parses a seed's stdout as JSON and resolves each declared capture path. Never echoes an output value.
 * @param {string} stdoutText
 * @param {any} captures
 * @returns {{ ok: true, values: Record<string, { value: string, redact: boolean }> } | { ok: false, code: 'CAPTURE_MISSING', reason: string }}
 */
export function parseSeedCaptures(stdoutText, captures) {
  const entries = isObj(captures) ? Object.entries(captures) : [];
  const names = entries.map(([name]) => name);
  /** @param {string[]} list */
  const missing = (list) => ({ ok: /** @type {const} */ (false), code: /** @type {const} */ ('CAPTURE_MISSING'), reason: `the seed output did not provide the declared capture ${list.map((n) => JSON.stringify(n)).join(', ')}; no step was run` });
  /** @type {any} */ let doc;
  try {
    doc = JSON.parse(String(stdoutText ?? '').trim());
  } catch {
    return missing(names);
  }
  /** @type {Record<string, { value: string, redact: boolean }>} */ const values = {};
  /** @type {string[]} */ const bad = [];
  for (const [name, entry] of entries) {
    if (!CAPTURE_NAME_PATTERN.test(name) || !isObj(entry) || !isStr(entry.path) || entry.path === '') {
      bad.push(name);
      continue;
    }
    const v = getPath(doc, entry.path);
    if (typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) {
      values[name] = { value: String(v), redact: entry.redact === true };
    } else {
      bad.push(name);
    }
  }
  if (bad.length > 0) return missing(bad);
  return { ok: true, values };
}

/**
 * Deep copy of a plan step with every {{name}} replaced by its captured value (the `action` key is skipped).
 * @param {any} step
 * @param {Record<string, { value: string, redact: boolean }>} values
 * @returns {any}
 */
export function substituteVariables(step, values) {
  /** @param {any} v */
  const walk = (v) => {
    if (isStr(v)) {
      return v.replace(VARIABLE_PATTERN, (whole, name) => (Object.hasOwn(values, name) ? values[name].value : whole));
    }
    if (Array.isArray(v)) return v.map(walk);
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  if (!isObj(step)) return step;
  return Object.fromEntries(Object.entries(step).map(([k, v]) => [k, k === 'action' ? v : walk(v)]));
}

/**
 * The string the local-only guard should check for a declared store, or null.
 * @param {any} store
 * @returns {string | null}
 */
export function normalizeStore(store) {
  if (!isStr(store) || store === '' || /\s/.test(store)) return null;
  if (store.includes('://')) return store;
  if (/^[A-Za-z0-9._-]+(:\d+)?$/.test(store)) return `http://${store}`;
  return null;
}

/**
 * @param {RunCtx} ctx
 * @param {string} name
 * @param {any} payload
 * @returns {string} the repo-relative evidence path
 */
function writeEvidence(ctx, name, payload) {
  const abs = join(ctx.runDirAbs, 'evidence', name);
  writeRunFile(ctx, abs, payload);
  return `${ctx.runDirRel}/evidence/${name}`;
}

/**
 * True when every URL-shaped argument of a query source passes the local-target guard.

 * @param {RunCtx} ctx
 * @param {string[]} argv
 * @returns {Promise<boolean>}
 */
async function queryArgvIsLocal(ctx, argv) {
  for (const a of argv.filter((x) => x.includes('://'))) {
    const g = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!g.ok) return false;
  }
  return true;
}

/**
 * Guards a declared API origin and resolves the step path against it.
 * @param {RunCtx} ctx
 * @param {any} step
 * @param {number} n one-based step number
 * @returns {Promise<{ ok: true, spec: any, url: string, host: string } | { ok: false, result: CaseResult }>}
 */
async function resolveApiOrigin(ctx, step, n) {
  const spec = classifyApiOrigin(ctx.loginConfig && isObj(ctx.loginConfig) ? ctx.loginConfig.api_origins : undefined, step.origin);
  if (!spec.ok) return { ok: false, result: blocked(spec.code, `step ${n}: ${spec.reason}`) };
  const g = await ctx.target.guard.checkTarget(spec.url, { root: ctx.root });
  if (!g.ok) {
    return { ok: false, result: blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: the declared origin ${spec.name} is not local (${g.reason}); nothing was requested`) };
  }
  const apiTarget = { guard: ctx.target.guard, origin: g.origin, allowedHosts: g.allowedHosts };
  const url = resolveStepUrl(step.path, /** @type {any} */ (apiTarget));
  if (url === null) return { ok: false, result: blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: the path leaves the declared origin; nothing was requested`) };
  return { ok: true, spec, url, host: g.host };
}

/**
 * Prepares one origin-bearing request step: guard, resolve, derive the header and register it for redaction.
 * @param {RunCtx} ctx
 * @param {any} step
 * @param {number} n one-based step number
 * @param {any} session
 * @returns {Promise<{ ok: true, url: string, headers: Record<string, string> | null } | { ok: false, result: CaseResult }>}
 */
export async function prepareApiStep(ctx, step, n, session) {
  const r = await resolveApiOrigin(ctx, step, n);
  if (!r.ok) return r;
  if (r.spec.header === null || step.session === 'none') return { ok: true, url: r.url, headers: null };
  if (!session || !isStr(session.path)) {
    return { ok: false, result: blocked('API_HEADER_NO_SESSION', `step ${n}: the origin ${r.spec.name} derives a header from the role session, but this case has no session`) };
  }
  const derived = deriveApiHeader(r.spec, readJsonOrNull(session.path), r.host);
  if (!derived.ok) return { ok: false, result: blocked(derived.code, `step ${n}: ${derived.reason}`) };
  addSecretValues(ctx.table, [derived.value, derived.raw]);
  return { ok: true, url: r.url, headers: { [derived.name]: derived.value } };
}

/**
 * Runs one read-only query step against a declared source. Self-sufficient: it re-validates the
 * final (substituted) statement and the source, so a direct call is as safe as one through executeCase.
 * No reason carries a statement fragment, a row value or an expected value.
 * @param {RunCtx} ctx
 * @param {{ index: number }} kase
 * @param {any} step
 * @param {number} n the one-based step number
 * @returns {Promise<{ ok: true, evidence: string } | { ok: false, result: CaseResult }>}
 */
export async function runQueryStep(ctx, kase, step, n) {
  /** @param {CaseResult} result @returns {{ ok: false, result: CaseResult }} */
  const stop = (result) => ({ ok: false, result });
  const Q = await loadQueryModule();
  if (Q === null) return stop(blocked('QUERY_MODULE_UNAVAILABLE', `step ${n}: the query module could not be loaded; nothing was executed`));
  const sql = Q.checkReadOnlySql(step.sql);
  if (!sql.ok) return stop(blocked('QUERY_NOT_READ_ONLY', `step ${n}: ${sql.reason}`));
  const src = Q.classifyQuerySource(ctx.seedConfig && isObj(ctx.seedConfig) ? ctx.seedConfig.query_sources : undefined, step.source);
  if (!src.ok) return stop(blocked(src.code, `step ${n}: ${src.reason}`));
  if (!(await queryArgvIsLocal(ctx, src.argv))) return stop(blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a query source argument names a non-local URL; nothing was executed`));
  const argv = Q.buildQueryArgv(src, step.sql);
  const r = spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: 1048576, timeout: 60000 });
  if (r.error || r.status !== 0) {
    const exit = !r.error && typeof r.status === 'number' ? ` (exit status ${r.status})` : '';
    return stop(blocked('QUERY_FAILED', `step ${n}: the query command failed, timed out or exceeded the output bound${exit}`));
  }
  const parsed = Q.parseQueryOutput(src.kind, String(r.stdout ?? ''));
  if (!parsed.ok) return stop(blocked('QUERY_OUTPUT_UNPARSEABLE', `step ${n}: the query output could not be parsed as rows`));
  const rows = parsed.rows;
  /** @type {string[]} */ const secrets = [];
  for (const row of rows) {
    for (const c of src.redactColumns) {
      if (Object.hasOwn(row, c) && isStr(row[c])) secrets.push(row[c]);
    }
  }
  addSecretValues(ctx.table, secrets);
  /** @type {string} */ let evidencePath;
  try {
    evidencePath = writeEvidence(ctx, `case-${kase.index}.query-${n}.json`, {
      kind: 'json',
      value: {
        source: step.source,
        kind: src.kind,
        read_only_control: src.readOnlyControl,
        statement: step.sql,
        row_count: rows.length,
        truncated: rows.length > 100,
        rows: Q.redactRows(rows.slice(0, 100), src.redactColumns),
      },
    });
  } catch {
    return stop(blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the evidence could not be written`));
  }
  const verdict = Q.checkRows(rows, step);
  if (!verdict.ok) return stop({ outcome: 'fail', reason_code: null, reason: `step ${n}: ${verdict.reason}`, evidence: [evidencePath] });
  return { ok: true, evidence: evidencePath };
}

/**
 * The header a token artifact declares (a static-token role), else today's
 * `Authorization: Bearer <token>`.
 * @param {SessionInfo} session
 * @returns {Record<string, string>}
 */
function sessionAuthHeaders(session) {
  if (session.header) return { [session.header]: `${session.valuePrefix ?? ''}${session.token}` };
  return { Authorization: `Bearer ${session.token}` };
}

/**
 * The options of an HTTP request context. Pure. An anonymous context (a step that asks for no session)
 * carries only the base URL: no storage state, hence no cookie, and no derived header.
 * @param {string} baseURL
 * @param {SessionInfo | null | undefined} session
 * @param {boolean} anonymous
 * @returns {{ baseURL: string, storageState?: string, extraHTTPHeaders?: Record<string, string> }}
 */
export function httpContextOptions(baseURL, session, anonymous) {
  /** @type {{ baseURL: string, storageState?: string, extraHTTPHeaders?: Record<string, string> }} */ const opts = { baseURL };
  if (anonymous === true) return opts;
  if (session && session.path) opts.storageState = session.path;
  if (session && session.token) opts.extraHTTPHeaders = sessionAuthHeaders(session);
  return opts;
}

const BODY_LIMIT = 65536;
const EVIDENCE_HEADERS = ['content-type', 'content-length', 'location', 'cache-control'];

/**
 * Sends one request through a FRESH request context that holds no storage state and no header, so a
 * `Set-Cookie` from one session-less step can never reach the next. The status, the headers and the body
 * are read before the context is disposed (disposal discards the stored responses), and the result is a
 * detached object with the three accessors the driver uses.
 * @param {any} playwright
 * @param {string} baseURL
 * @param {string} url the guard-approved absolute URL
 * @param {any} fetchOptions the options object the driver built for this step
 * @returns {Promise<{ status: () => number, headers: () => Record<string, string>, text: () => Promise<string> }>}
 */
async function fetchAnonymously(playwright, baseURL, url, fetchOptions) {
  const anonymousCtx = await playwright.request.newContext(httpContextOptions(baseURL, null, true));
  try {
    const resp = await anonymousCtx.fetch(url, fetchOptions);
    const status = resp.status();
    const headers = resp.headers();
    const text = await resp.text().catch(() => '');
    return { status: () => status, headers: () => headers, text: async () => text };
  } finally {
    await anonymousCtx.dispose().catch(() => {});
  }
}

DRIVERS.http = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ const opts = httpContextOptions(target.origin, session, false);
  /** @type {string[]} */ const evidence = [];
  /** @type {any} */ let reqCtx = null;
  /** @param {CaseResult} res @param {number} at zero-based index of the step that ended the case @returns {CaseResult} */
  const ended = (res, at) => ({ ...res, steps: recordSteps(plan.steps, at + 1, at, (j) => evidence[j] ?? null) });
  try {
    reqCtx = await ctx.playwright.request.newContext(opts);
    for (const [i, step] of plan.steps.entries()) {
      if (step.action === 'query') {
        const q = await runQueryStep(ctx, kase, step, i + 1);
        if (!q.ok) {
          for (const e of q.result.evidence) evidence.push(e);
          return ended({ ...q.result, evidence }, i);
        }
        evidence.push(q.evidence);
        continue;
      }
      const apiStep = isStr(step.origin) ? await prepareApiStep(ctx, step, i + 1, session) : null;
      if (apiStep !== null && !apiStep.ok) return ended({ ...apiStep.result, evidence }, i);
      const url = apiStep !== null ? apiStep.url : resolveStepUrl(step.path, target);
      if (url === null) return ended(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`, evidence), i);
      const anonymous = step.session === 'none';
      /** @type {any} */ let resp;
      try {
        /** @type {any} */ const fo = { method: step.method, maxRedirects: 0, timeout: 10000, failOnStatusCode: false };
        if (step.body !== undefined) fo.data = step.body;
        if (apiStep !== null && apiStep.headers !== null) fo.headers = apiStep.headers;
        resp = anonymous ? await fetchAnonymously(ctx.playwright, target.origin, url, fo) : await reqCtx.fetch(url, fo);
      } catch (err) {
        return ended(blocked('TARGET_UNREACHABLE', `step ${i + 1}: the request failed or timed out`, evidence), i);
      }
      const status = resp.status();
      const bodyText = await resp.text().catch(() => '');
      const headers = resp.headers();
      /** @type {Record<string, string>} */ const keptHeaders = {};
      for (const h of EVIDENCE_HEADERS) if (headers[h] !== undefined) keptHeaders[h] = headers[h];
      /** @type {any} */ let body = bodyText.length > BODY_LIMIT ? bodyText.slice(0, BODY_LIMIT) : bodyText;
      if (/json/i.test(String(headers['content-type'] ?? '')) && bodyText.length <= BODY_LIMIT) {
        try {
          body = JSON.parse(bodyText);
        } catch {
          // keep the text
        }
      }
      try {
        evidence.push(
          writeEvidence(ctx, i === 0 ? `case-${kase.index}.http.json` : `case-${kase.index}.http-${i + 1}.json`, {
            kind: 'json',
            value: { request: { method: step.method, path: step.path }, response: { status, headers: keptHeaders, body }, ...(apiStep !== null ? { origin: step.origin } : {}), ...(anonymous ? { session: 'none' } : {}) },
          }),
        );
      } catch {
        return ended(blocked('EVIDENCE_WRITE_FAILED', `step ${i + 1}: the evidence could not be written`, evidence), i);
      }
      if (step.expect_status !== undefined && status !== step.expect_status) {
        return ended({ outcome: 'fail', reason_code: null, reason: `step ${i + 1}: expected status ${step.expect_status}, got ${status}`, evidence }, i);
      }
      if (step.expect_body_contains !== undefined && !bodyText.includes(step.expect_body_contains)) {
        return ended({ outcome: 'fail', reason_code: null, reason: `step ${i + 1}: the expected body text was not present`, evidence }, i);
      }
      if (step.expect_json !== undefined) {
        /** @type {any} */ let parsed;
        try {
          parsed = JSON.parse(bodyText);
        } catch {
          parsed = undefined;
        }
        const got = getPath(parsed, step.expect_json.path);
        if (JSON.stringify(got) !== JSON.stringify(step.expect_json.equals)) {
          return ended({ outcome: 'fail', reason_code: null, reason: `step ${i + 1}: the JSON value at ${step.expect_json.path} did not equal the expected value`, evidence }, i);
        }
      }
    }
    return { outcome: 'pass', reason_code: null, reason: null, evidence };
  } finally {
    if (reqCtx) await reqCtx.dispose().catch(() => {});
  }
};

/**
 * One role-and-name or text locator step. The locator must match exactly one element at run time;
 * it never passes through first(), nth() or last() for the decision. Returns a result that ends the
 * case, or null when the step passed. A reason never carries a locator value, a fill value, an input
 * value or page text.
 * @param {any} page
 * @param {any} step
 * @param {{ ok: true, form: 'role', role: string, name: string } | { ok: true, form: 'text', text: string }} loc
 * @param {number} n
 * @param {(kind: string, passed: boolean) => void} [recordComparison] records which comparison an `expect_value` step ran and whether it passed
 * @returns {Promise<CaseResult | null>}
 */
async function runLocatorStep(page, step, loc, n, recordComparison) {
  const target = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });
  if (step.action === 'expect_not_visible') {
    // An absence is decided on the live page, with no wait for the element to attach: a locator that
    // matches nothing is hidden. The anchor rule of validateSteps is what keeps that from being vacuous.
    const present = await target.count().catch(() => 0);
    if (present > 1) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${present} elements at run time; a locator must match exactly one, so nothing was asserted`);
    }
    const hidden = await settleAssertion(() => target.isHidden(), (isHidden) => isHidden === true);
    if (hidden.status === 'accepted') return null;
    if (hidden.status === 'rejected') return { outcome: 'fail', reason_code: null, reason: `step ${n}: the element was still visible`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the visibility of the target could not be read; nothing was asserted`);
  }
  // The wait only gives the page time to render; the decision is the count.
  await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await target.count().catch(() => 0);
  if (count > 1) {
    return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on`);
  }
  const expects = POSITIVE_ASSERTION_ACTIONS.includes(step.action);
  if (count === 0) {
    if (expects) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not found`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
  }
  if (step.action === 'click' || step.action === 'fill') {
    try {
      if (step.action === 'click') await target.click();
      else await target.fill(step.value);
    } catch {
      return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
    }
    return null;
  }
  if (step.action === 'expect_visible') {
    const ok = await target.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    if (!ok) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
    return null;
  }
  if (step.action === 'expect_value') {
    // The value is read with the documented input reader and compared in place: it is never returned,
    // recorded or placed in a reason. An element with no value to read is a blocked case, never a fail.
    const kind = comparisonKindOf(step);
    if (kind === null) return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the expect_value comparison is not declared; nothing was asserted`);
    const settled = await settleAssertion(() => target.inputValue({ timeout: 1000 }), (v) => compareInputValue(step, v)?.passed === true);
    if (settled.status === 'unreadable') {
      return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the expect_value target holds no readable value; nothing was asserted`);
    }
    const passed = settled.status === 'accepted';
    try {
      if (recordComparison) recordComparison(kind, passed);
    } catch {
      return blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the comparison evidence could not be written`);
    }
    if (passed) return null;
    return { outcome: 'fail', reason_code: null, reason: `step ${n}: the field value did not satisfy the declared ${kind} comparison`, evidence: [] };
  }
  if (step.action === 'expect_state') {
    // The state is read through the locator API, never the snapshot token (which has no false form). An
    // element that exposes no such state, or a mixed one, cannot be compared: a read that throws is unreadable.
    const readState = async () => {
      if (step.state === 'expanded') {
        const expanded = ariaExpandedOf(await target.getAttribute('aria-expanded', { timeout: 1000 }));
        if (expanded === null) throw new Error('no expanded state');
        return expanded;
      }
      if (step.state === 'disabled') return target.isDisabled({ timeout: 1000 });
      if ((await target.getAttribute('aria-checked', { timeout: 1000 })) === 'mixed') throw new Error('mixed checked state');
      return target.isChecked({ timeout: 1000 });
    };
    const settled = await settleAssertion(readState, (state) => state === step.equals);
    if (settled.status === 'accepted') return null;
    if (settled.status === 'rejected') {
      return { outcome: 'fail', reason_code: null, reason: `step ${n}: the ${step.state} state did not equal the declared value`, evidence: [] };
    }
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.state} state of the target could not be read; nothing was asserted`);
  }
  if (step.action === 'expect_text') {
    const text = await target.textContent({ timeout: 10000 }).catch(() => null);
    if (text === null || !text.includes(step.contains)) {
      return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
    }
    return null;
  }
  return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
}

DRIVERS.browser = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  // A case that carries an expect_requests step logs the requests of its page and runs with service workers blocked.
  const watchesRequests = plan.steps.some((/** @type {any} */ s) => isObj(s) && s.action === 'expect_requests');
  /** @type {{ method: string, host: string, path: string, local: boolean }[] | null} */ let requestLog = null;
  let windowStart = 0;
  /** @type {any} */ let browser = null;
  try {
    browser = await ctx.playwright.chromium.launch({ headless: true });
  } catch {
    return blocked('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/');
  }
  /** @type {any} */ let context = null;
  /** @type {string[]} */ const evidence = [];
  /** @type {Map<number, string>} */ const queryEvidence = new Map();
  // The located field of every expect_value step that ran: masked in the final capture, so a value the runner read is not left in clear.
  /** @type {any[]} */ const valueMasks = [];
  try {
    context = await browser.newContext({
      ...(session && session.path ? { storageState: session.path } : {}),
      ...(watchesRequests ? { serviceWorkers: 'block' } : {}),
    });
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    if (watchesRequests) requestLog = observeRequests(page, target);
    /** @type {CaseResult | null} */ let verdict = null;
    let ranTo = -1;
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
      // The window of an expect_requests step opens where the case's last interaction starts, before its own requests.
      if (requestLog !== null && (step.action === 'goto' || step.action === 'click' || step.action === 'fill')) windowStart = requestLog.length;
      const lstep = LOCATOR_ACTIONS.includes(step.action) ? locatorOf(step) : null;
      if (lstep !== null && lstep.ok) {
        if (step.action === 'expect_value' && lstep.form === 'role') valueMasks.push(page.getByRole(lstep.role, { name: lstep.name, exact: true }));
        // The comparison evidence holds the action, the step position, the locator already in the plan, the
        // closed comparison word and passed or failed: never the value, its length or the expected string.
        const lr = await runLocatorStep(page, step, lstep, n, (kind, passed) => {
          if (lstep.form !== 'role') return;
          queryEvidence.set(
            i,
            writeEvidence(ctx, `case-${kase.index}.value-${n}.json`, {
              kind: 'json',
              value: { action: 'expect_value', step: n, locator: { role: lstep.role, name: lstep.name }, comparison: kind, result: passed ? 'passed' : 'failed' },
            }),
          );
        });
        if (lr !== null) {
          verdict = lr;
          break;
        }
        continue;
      }
      if (step.action === 'goto') {
        const url = resolveStepUrl(step.path, target);
        if (url === null) {
          verdict = blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: the path leaves the guard-approved origin; nothing was requested`);
          break;
        }
        try {
          await page.goto(url);
        } catch {
          verdict = blocked('TARGET_UNREACHABLE', `step ${n}: the page could not be loaded`);
          break;
        }
      } else if (step.action === 'click' || step.action === 'fill') {
        try {
          if (step.action === 'click') await page.click(step.selector);
          else await page.fill(step.selector, step.value);
        } catch {
          verdict = blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
          break;
        }
      } else if (step.action === 'query') {
        const q = await runQueryStep(ctx, kase, step, n);
        if (!q.ok) {
          if (q.result.evidence.length > 0) queryEvidence.set(i, q.result.evidence[0]);
          verdict = q.result;
          break;
        }
        queryEvidence.set(i, q.evidence);
      } else if (step.action === 'expect_visible') {
        const ok = await page.locator(step.selector).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
        if (!ok) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
          break;
        }
      } else if (step.action === 'expect_text') {
        const text = await page.locator(step.selector).first().textContent({ timeout: 10000 }).catch(() => null);
        if (text === null || !text.includes(step.contains)) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
          break;
        }
      } else if (step.action === 'expect_url') {
        const want = new URL(step.path, target.origin);
        const have = new URL(page.url());
        const same = want.search === '' ? have.pathname === want.pathname : have.pathname + have.search === want.pathname + want.search;
        if (!same) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the page URL did not match the expected path`, evidence: [] };
          break;
        }
      } else if (step.action === 'expect_requests') {
        if (requestLog === null) {
          verdict = blocked('STEP_NOT_PERFORMABLE', `step ${n}: the request log is not available; nothing was asserted`);
          break;
        }
        // The wait comes first and the slice after it, so a request a handler issues once the click returned is counted.
        const seen = await settleRequestWindow(requestLog, windowStart);
        const decided = evaluateRequestWindow(seen, step);
        if (decided.status === 'non-local') {
          verdict = blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a matching request targeted a host the local-only guard does not approve; it was aborted and nothing was asserted`);
          break;
        }
        try {
          // The 200 is an evidence-size cap on the written listing only (chosen, not measured; the Phase 8 dogfood
          // recalibrates it): the window was decided above on the whole path. The path is redacted first and cut
          // after, so a registered secret that straddles the cut is replaced whole and leaves no prefix behind.
          queryEvidence.set(
            i,
            writeEvidence(ctx, `case-${kase.index}.requests-${n}.json`, {
              kind: 'json',
              value: {
                action: 'expect_requests',
                step: n,
                method: step.method,
                expected: step.count,
                observed: decided.observed,
                truncated: decided.observed > EXPECT_REQUESTS_EVIDENCE_MAX,
                requests: decided.matching.slice(0, EXPECT_REQUESTS_EVIDENCE_MAX).map((m) => ({
                  method: m.method,
                  host: m.host,
                  path: redactText(m.path, ctx.table).slice(0, 200),
                })),
                result: decided.status,
              },
            }),
          );
        } catch {
          verdict = blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the request evidence could not be written`);
          break;
        }
        if (decided.status === 'failed') {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the page issued ${decided.observed} matching request(s); ${step.count} were expected`, evidence: [] };
          break;
        }
      } else {
        // Every action the validator accepts has a branch above (the locator forms left through continue), so an
        // accepted action with no handler can never be recorded as passed.
        verdict = blocked('STEP_NOT_PERFORMABLE', `step ${n}: this step has no runtime handler; nothing was asserted`);
        break;
      }
    }
    // Evidence after the last step: a screenshot, or redacted text when the page text holds a secret.
    try {
      const bodyText = await page.innerText('body').catch(() => '');
      if (containsSecret(bodyText, ctx.table)) {
        evidence.push(writeEvidence(ctx, `case-${kase.index}.txt`, { kind: 'text', value: bodyText }));
      } else {
        const png = await page.screenshot({ mask: [page.locator('input[type=password]'), ...valueMasks] });
        evidence.push(writeEvidence(ctx, `case-${kase.index}.png`, { kind: 'binary', value: png }));
      }
    } catch {
      if (verdict === null || verdict.outcome !== 'blocked') {
        return blocked('EVIDENCE_WRITE_FAILED', 'the browser evidence could not be captured or written', evidence);
      }
    }
    // The final capture reflects the state after the last step that ran, so it is attributed to that step.
    const stepsOut = recordSteps(plan.steps, ranTo + 1, verdict !== null ? ranTo : -1, (j) => queryEvidence.get(j) ?? (j === ranTo ? evidence[0] ?? null : null));
    const allEvidence = [...queryEvidence.values(), ...evidence];
    if (verdict !== null) return { ...verdict, evidence: allEvidence, steps: stepsOut };
    return { outcome: 'pass', reason_code: null, reason: null, evidence: allEvidence, steps: stepsOut };
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
};

// ---------------------------------------------------------------------------
// Sessions (from the kit's own login script) and required state (declared only)
// ---------------------------------------------------------------------------

/**
 * Whether a recorded session expiry is inside the pre-run re-mint margin. Anything absent,
 * non-string or unparseable is not due: a missing sidecar must not force a re-mint.
 * @param {any} expiresAt
 * @param {number} nowMs
 * @param {number} [marginMs]
 * @returns {boolean}
 */
export function mintExpiryDue(expiresAt, nowMs, marginMs = RUN_REMINT_MARGIN_MS) {
  if (typeof expiresAt !== 'string') return false;
  const parsed = Date.parse(expiresAt);
  if (!Number.isFinite(parsed)) return false;
  return parsed - nowMs <= marginMs;
}

/**
 * Every string held by IndexedDB records (keys and values, nested values included) of a saved
 * storage-state, for secret registration. Database and store names are never collected.
 * @param {any} state
 * @returns {string[]}
 */
export function collectIndexedDbSecrets(state) {
  /** @type {string[]} */ const found = [];
  /** @param {any} v */
  const walk = (v) => {
    if (typeof v === 'string') found.push(v);
    else if (Array.isArray(v)) for (const x of v) walk(x);
    else if (isObj(v)) for (const x of Object.values(v)) walk(x);
  };
  const origins = state && Array.isArray(state.origins) ? state.origins : [];
  for (const o of origins) {
    for (const db of Array.isArray(o && o.indexedDB) ? o.indexedDB : []) {
      const stores = Array.isArray(db && db.stores) ? db.stores : Array.isArray(db && db.objectStores) ? db.objectStores : [];
      for (const store of stores) {
        for (const rec of Array.isArray(store && store.records) ? store.records : []) {
          if (!isObj(rec)) continue;
          for (const field of ['key', 'value', 'keyEncoded', 'valueEncoded']) {
            walk(rec[field]);
            if (field === 'value' && (Array.isArray(rec[field]) || isObj(rec[field]))) found.push(JSON.stringify(rec[field]));
          }
        }
      }
    }
  }
  return found;
}

/**
 * True iff the role is declared with the `minted` mechanism.
 * @param {RunCtx} ctx
 * @param {string} role
 * @returns {boolean}
 */
function isMintedRole(ctx, role) {
  const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : null;
  return roles !== null && Object.hasOwn(roles, role) && isObj(roles[role]) && roles[role].mechanism === 'minted';
}

/**
 * The expiry the login script recorded for a role: the value-free mint sidecar first, then the token artifact.
 * @param {string} root
 * @param {string} role
 * @returns {string | null}
 */
function readMintExpiry(root, role) {
  const dir = join(root, 'PRPs', 'auth', '.sessions');
  const side = readJsonOrNull(join(dir, `${role}.mint.json`));
  if (side && isStr(side.expires_at)) return side.expires_at;
  const tok = readJsonOrNull(join(dir, `${role}.token.json`));
  return tok && isStr(tok.expires_at) ? tok.expires_at : null;
}

/**
 * A value-free sentence for a minted login halt: only the role name and the code are interpolated.
 * @param {string} code
 * @param {string} role
 * @returns {string}
 */
function mintBlockReason(code, role) {
  switch (code) {
    case 'FAILED_MINT_UNCONFIRMED':
      return `the mint block of role ${role} is not confirmed; review it and set "status": "confirmed" in PRPs/auth/login.config.json; nothing was run, nothing was saved or reused`;
    case 'FAILED_MINT_COMMAND_MISSING':
      return `roles.${role}.mint.command in PRPs/auth/login.config.json declares no command; nothing was run, nothing was saved or reused`;
    case 'FAILED_NON_LOCAL_TARGET':
      return `the baseUrl, a URL argument or the mint store of role ${role} is not local; nothing was run, nothing was saved or reused`;
    case 'FAILED_MINT_COMMAND':
      return `the declared mint command of role ${role} failed, timed out or exceeded its output bound; nothing was saved or reused`;
    default:
      return `the mint command output of role ${role} did not match the contract (cookies, localStorage, token, expires_at); nothing was saved or reused`;
  }
}

/**
 * Read-only stale pre-flight. A template-generated login script whose identity
 * stamp differs from the installed template's, or that carries none (scripts
 * generated before the stamp existed cannot check themselves), is stale.
 * Fails open: an unreadable or unstamped installed template skips the check.
 * @param {string} script absolute path of the login script
 * @returns {string | null} "<script id or unstamped> vs <installed id>" when stale
 */
function staleKitScript(script) {
  /** @type {string} */ let text;
  /** @type {string} */ let installed;
  try {
    text = readFileSync(script, 'utf8');
    installed = readFileSync(join(PLUGIN_ROOT, 'resources', 'auth-login.template.mjs'), 'utf8');
  } catch {
    return null;
  }
  if (!text.includes(KIT_SCRIPT_MARKER)) return null;
  const want = KIT_STAMP_PATTERN.exec(installed);
  if (!want) return null;
  const have = KIT_STAMP_PATTERN.exec(text);
  if (have && have[1] === want[1]) return null;
  return `${have ? have[1] : 'unstamped'} vs ${want[1]}`;
}

/**
 * The origin texts no session value may be registered as a part of: the guarded target origin, every
 * allowed host, the declared base URL and the URL of every declared API origin, so a declared local
 * origin or host can never become a redaction value.
 * @param {RunCtx} ctx
 * @returns {string[]}
 */
function originTextsOf(ctx) {
  /** @type {string[]} */ const texts = [];
  /** @param {any} v */
  const add = (v) => {
    if (isStr(v) && v !== '') texts.push(v);
  };
  const target = isObj(ctx.target) ? ctx.target : null;
  if (target !== null) {
    add(target.origin);
    const hosts = target.allowedHosts;
    if (hosts instanceof Set || Array.isArray(hosts)) for (const h of hosts) add(h);
  }
  const cfg = isObj(ctx.loginConfig) ? ctx.loginConfig : null;
  if (cfg !== null) {
    add(cfg.baseUrl);
    if (isObj(cfg.api_origins)) for (const entry of Object.values(cfg.api_origins)) if (isObj(entry)) add(entry.url);
  }
  return texts;
}

/**
 * The `FAILED_*` code a kit login script named on its standard error, or null. Only the code is taken:
 * the streams of a login script are never printed, logged or stored.
 * @param {{ stderr?: any }} result
 * @returns {string | null}
 */
function loginHaltCode(result) {
  const m = /FAILED_[A-Z_]+/.exec(String(result.stderr ?? ''));
  return m ? m[0] : null;
}

/**
 * The one place the runner runs a kit login script. The arguments are the script's own flags and carry
 * no secret; `--force` makes the script skip its reuse check and mint a new session.
 * @param {string} root
 * @param {string} script
 * @param {boolean} force
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function runLoginScript(root, script, force) {
  return spawnSync(process.execPath, [script, '--root', root, '--plugin-root', PLUGIN_ROOT, ...(force ? ['--force'] : [])], {
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    encoding: 'utf8',
    timeout: 120000,
  });
}

/**
 * Whether a minted role's login script is run once more after a halt. The kit script emits
 * `FAILED_PROBE_MARKER_ABSENT` only after a fresh mint, so for a minted role the halt is exactly a proof
 * failure right after a mint (a cold application may not have rendered the declared marker yet). Pure.
 * @param {boolean} minted
 * @param {number | null} status exit status of the run that just ended
 * @param {string | null} code the `FAILED_*` code that run named, or null
 * @param {number} retries how many times the script was already run again
 * @returns {boolean}
 */
export function shouldRemintLogin(minted, status, code, retries) {
  return minted === true && status !== 0 && code === 'FAILED_PROBE_MARKER_ABSENT' && Number.isInteger(retries) && retries < LOGIN_REMINT_MAX_RETRIES;
}

/**
 * @param {RunCtx} ctx
 * @param {string} role
 * @returns {{ ok: true, info: SessionInfo } | { ok: false, code: string, detail?: string }}
 */
function obtainSession(ctx, role) {
  const cached = ctx.sessions.get(role);
  if (cached) return cached;
  /** @type {{ ok: true, info: SessionInfo } | { ok: false, code: string, detail?: string }} */ let result;
  const script = join(ctx.root, 'PRPs', 'auth', `login-${role}.mjs`);
  const stale = existsSync(script) ? staleKitScript(script) : null;
  if (!existsSync(script)) {
    result = { ok: false, code: 'FAILED_LOGIN_SCRIPT_MISSING' };
  } else if (stale !== null) {
    result = { ok: false, code: 'FAILED_KIT_SCRIPT_STALE', detail: stale };
  } else {
    const minted = isMintedRole(ctx, role);
    const force = minted && mintExpiryDue(readMintExpiry(ctx.root, role), Date.now());
    let r = runLoginScript(ctx.root, script, force);
    // At most LOGIN_REMINT_MAX_RETRIES more runs, only after the halt that follows a fresh mint, each with --force.
    for (let retries = 0; shouldRemintLogin(minted, r.status, loginHaltCode(r), retries); retries++) {
      r = runLoginScript(ctx.root, script, true);
    }
    if (r.status === 0) {
      const sessionPath = join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.json`);
      const state = readJsonOrNull(sessionPath);
      if (state === null) {
        result = { ok: false, code: 'FAILED_SESSION_UNREADABLE' };
      } else {
        const tok = readJsonOrNull(join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.token.json`));
        const token = tok && isStr(tok.token) && tok.token !== '' ? tok.token : null;
        const split = splitSessionValues(state, token, declaredCookieNamesOf(ctx.loginConfig, role), originTextsOf(ctx));
        const secrets = [...split.declared, ...split.undeclared];
        addSecretValues(ctx.table, secrets);
        const header = tok && isStr(tok.header) && /^[A-Za-z0-9-]+$/.test(tok.header) ? tok.header : null;
        const valuePrefix = header !== null && tok && isStr(tok.value_prefix) ? tok.value_prefix : null;
        result = { ok: true, info: { path: sessionPath, token, header, valuePrefix } };
      }
    } else {
      const code = loginHaltCode(r);
      result = { ok: false, code: code ?? 'FAILED_LOGIN_UNKNOWN' };
    }
  }
  ctx.sessions.set(role, result);
  return result;
}

/**
 * Prepares the required state from declared sources only.
 * @param {RunCtx} ctx
 * @param {ReportCase} kase
 * @param {any} plan
 * @returns {Promise<CaseResult | null>} a blocking result, or null when the state is satisfied
 */
async function prepareState(ctx, kase, plan) {
  const text = (kase.required_state ?? '').trim();
  if (text === '' || /^(none|n\/a)\b/i.test(text)) return null;
  const stateKind = plan.state;
  if (stateKind === 'role-only') {
    if (!isStr(plan.role) || !ROLE_PATTERN.test(plan.role)) return blocked('ROLE_UNDECLARED', 'the plan entry declares a role-only state but names no valid role');
    const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    if (!Object.hasOwn(roles, plan.role)) return blocked('ROLE_UNDECLARED', `role ${plan.role} is not declared in PRPs/auth/login.config.json`);
    return null;
  }
  const missing = `the required state is not declared: PRPs/auth/qa-seed.json states[${JSON.stringify(text)}]`;
  if (stateKind !== 'declared') return blocked('STATE_UNDECLARED', missing);
  const states = ctx.seedConfig && isObj(ctx.seedConfig.states) ? ctx.seedConfig.states : {};
  const decl = Object.hasOwn(states, text) ? states[text] : null;
  const verdict = classifySeedDeclaration(decl, text);
  if (verdict !== null) return blocked(verdict.code, verdict.reason);
  const argv = decl.command;
  let seeded = ctx.seeds.get(text);
  if (!seeded) {
    seeded = await runSeed(ctx, argv, decl);
    ctx.seeds.set(text, seeded);
  }
  if (!seeded.ok) return blocked(seeded.code, seeded.reason);
  // Register every redact-marked capture before any later write can carry it.
  if (seeded.captures) addSecretValues(ctx.table, Object.values(seeded.captures).filter((c) => c.redact).map((c) => c.value));
  return null;
}

/**
 * @param {RunCtx} ctx
 * @param {string[]} argv
 * @param {any} [decl] the seed declaration (`captures` / `store` keys are optional)
 * @returns {Promise<{ ok: true, captures?: Record<string, { value: string, redact: boolean }> } | { ok: false, code: string, reason: string }>}
 */
export async function runSeed(ctx, argv, decl = {}) {
  for (const a of argv) {
    if (!a.includes('://')) continue;
    const r = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!r.ok) return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `a seed command argument names a non-local URL (${r.reason}); the command was not executed` };
  }
  const captures = isObj(decl) && isObj(decl.captures) && Object.keys(decl.captures).length > 0 ? decl.captures : null;
  const hasStore = isObj(decl) && decl.store !== undefined;
  if (captures !== null || hasStore) {
    const normalized = normalizeStore(isObj(decl) ? decl.store : undefined);
    if (normalized === null) {
      return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: 'the seed declaration names no checkable store; the command was not executed' };
    }
    const r = await ctx.target.guard.checkTarget(normalized, { root: ctx.root });
    if (!r.ok) return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `the seed's declared store is not local (${r.reason}); the command was not executed` };
  }
  const r = captures === null
    ? spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: 'ignore', timeout: 120000 })
    : spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: 65536, timeout: 120000 });
  if (r.error) {
    if (captures !== null && /** @type {any} */ (r.error).code === 'ENOBUFS') {
      return { ok: false, code: 'CAPTURE_MISSING', reason: 'the seed output exceeded the 65536-byte capture bound' };
    }
    return { ok: false, code: 'SEED_FAILED', reason: 'the declared seed command could not be run or timed out' };
  }
  if (r.status !== 0) return { ok: false, code: 'SEED_FAILED', reason: `the declared seed command exited with status ${r.status}` };
  if (captures === null) return { ok: true };
  const parsed = parseSeedCaptures(String(r.stdout ?? ''), captures);
  if (!parsed.ok) return { ok: false, code: parsed.code, reason: parsed.reason };
  for (const [name, c] of Object.entries(parsed.values)) {
    if (c.redact && c.value.length < 4) {
      return { ok: false, code: 'CAPTURE_UNREDACTABLE', reason: `the capture ${JSON.stringify(name)} is marked redact but is too short to redact; no step was run` };
    }
  }
  return { ok: true, captures: parsed.values };
}

// ---------------------------------------------------------------------------
// Record resolution: automated-coverage cases from the Test Runner's record
// ---------------------------------------------------------------------------

/** A later run overwriting a shared artifact path must not be credited to an older record. */
const JUNIT_MTIME_SLACK_MS = 120000;
const JUNIT_MAX_BYTES = 20 * 1024 * 1024;
const RECORD_EXECUTED_OUTCOMES = ['PASSED', 'FAILED', 'FAILED_AFTER_N_RETRIES', 'FAILED_TIME_BUDGET_EXCEEDED'];
const TEST_PATH_RE = /^[A-Za-z0-9_@./\\-]+\.[A-Za-z0-9]{1,5}$/;

/**
 * The discovery rule of /relay-qa-report: the top-level record.json, else the
 * highest-numbered attempts/<N>/record.json. Only the first candidate that
 * exists is ever examined.
 * @param {string} root
 * @param {string} feature
 * @returns {{ abs: string, rel: string } | null}
 */
function findTestRunnerRecord(root, feature) {
  const relDir = `PRPs/reports/${feature}`;
  const dir = join(root, ...relDir.split('/'));
  const top = join(dir, 'record.json');
  if (existsSync(top)) return { abs: top, rel: `${relDir}/record.json` };
  let best = -1;
  try {
    for (const ent of readdirSync(join(dir, 'attempts'), { withFileTypes: true })) {
      if (ent.isDirectory() && /^\d+$/.test(ent.name) && existsSync(join(dir, 'attempts', ent.name, 'record.json'))) {
        best = Math.max(best, Number(ent.name));
      }
    }
  } catch {
    return null;
  }
  return best >= 0 ? { abs: join(dir, 'attempts', String(best), 'record.json'), rel: `${relDir}/attempts/${best}/record.json` } : null;
}

/**
 * Schema v1 of the Test Runner record. A record outside it, or one whose run
 * executed nothing, is never evidence.
 * @param {any} rec
 * @returns {boolean}
 */
function isSchemaV1Record(rec) {
  if (!isObj(rec)) return false;
  if (!isStr(rec.run_id) || !Number.isInteger(rec.attempt) || rec.attempt < 1 || !isStr(rec.framework)) return false;
  if (!isStr(rec.outcome) || !RECORD_EXECUTED_OUTCOMES.includes(rec.outcome)) return false;
  const c = rec.counts;
  if (!isObj(c)) return false;
  for (const k of ['passed', 'failed', 'skipped', 'total']) if (!Number.isInteger(c[k]) || c[k] < 0) return false;
  if (c.total !== c.passed + c.failed + c.skipped || c.total <= 0) return false;
  if (rec.outcome === 'PASSED' && c.failed !== 0) return false;
  if (!Array.isArray(rec.failures)) return false;
  if (!isObj(rec.artifacts) || !isStr(rec.artifacts.junit_xml) || !isAbsolute(rec.artifacts.junit_xml)) return false;
  return isStr(rec.generated_at);
}

/** @param {string} t @returns {boolean} */
const looksPathLike = (t) => /[/\\]/.test(t) || /\.[A-Za-z0-9]+$/.test(t);

/**
 * The test files an `Automated test path` field cites. `refused` is set when a
 * path-like token fails qualification: the required set is never shrunk
 * silently, so the whole case is then not resolved.
 * @param {string | null} field
 * @returns {{ paths: string[], refused: boolean }}
 */
function extractTestPaths(field) {
  if (!isStr(field)) return { paths: [], refused: false };
  /** @type {string[]} */ const found = [];
  let refused = false;
  /** @param {string} tok */
  const consider = (tok) => {
    if (TEST_PATH_RE.test(tok)) found.push(tok.split('\\').join('/').replace(/^\.\//, ''));
    else if (looksPathLike(tok)) refused = true;
  };
  const spans = [...field.matchAll(/`([^`]*)`/g)].map((m) => m[1].trim());
  for (const s of spans) {
    if (/[("']/.test(s) || s === '') continue; // plainly prose
    if (/\s/.test(s) && !looksPathLike(s)) continue;
    consider(s);
  }
  const plain = field.replace(/`[^`]*`/g, ' ');
  const cut = plain.search(/ [—–-] |\(/);
  const kept = cut >= 0 ? plain.slice(0, cut) : plain;
  if (spans.length === 0 || kept.trim() !== '') {
    for (const tok of kept.split(/[\s,;]+/)) if (tok !== '') consider(tok);
  }
  // The discarded tail is prose only if it carries no unquoted path-like token;
  // otherwise a cited file was truncated away and the case must not resolve.
  if (cut >= 0) {
    for (const raw of plain.slice(cut).split(/[\s,;]+/)) {
      const tok = raw.replace(/^[("'[]+/, '').replace(/[)"'\]:,.;]+$/, '');
      if (tok !== '' && looksPathLike(tok)) refused = true;
    }
  }
  return { paths: [...new Set(found)], refused };
}

/** @param {string} s @returns {string} */
const collapseTitle = (s) => s.replace(/\s+/g, ' ').trim();

/** A backticked `<path>::<title>` or `<path> > <title>` span. */
const TITLED_SPAN_RE = /^([A-Za-z0-9_@./\\-]+\.[A-Za-z0-9]{1,5})(?:::|\s+[>›]\s+)(.+)$/;

/**
 * Rewrites every backticked `<path>::<title>` / `<path> > <title>` span to a span
 * holding only the path, so `extractTestPaths` reads the cited file. Every other
 * character of the field is left exactly as it was.
 * @param {string | null} field
 * @returns {string | null}
 */
export function normalizeTestCitation(field) {
  if (!isStr(field)) return field;
  return field.replace(/`([^`]*)`/g, (whole, inner) => {
    const m = TITLED_SPAN_RE.exec(inner.trim());
    return m === null ? whole : `\`${m[1]}\``;
  });
}

/** @param {string} p @returns {string} */
const normalizeCitedPath = (p) => p.split('\\').join('/').replace(/^\.\//, '');

/**
 * The test titles an `Automated test path` field cites. One item is one cited
 * unit; its segments must all match the same testcase.
 * @param {string | null} field
 * @returns {{ items: { segments: string[], path: string | null }[] }}
 */
export function extractCitedTitles(field) {
  if (!isStr(field)) return { items: [] };
  /** @type {{ index: number, path: string }[]} */ const spans = [];
  /** @type {{ index: number, segments: string[], path: string | null }[]} */ const found = [];
  for (const m of field.matchAll(/`([^`]*)`/g)) {
    const text = m[1].trim();
    const titled = TITLED_SPAN_RE.exec(text);
    const base = titled !== null ? titled[1] : text;
    if (!TEST_PATH_RE.test(base)) continue;
    const path = normalizeCitedPath(base);
    spans.push({ index: m.index ?? 0, path });
    if (titled !== null) {
      const segments = titled[2].split(/\s+[>›]\s+/).map(collapseTitle).filter((s) => s !== '');
      if (segments.length > 0) found.push({ index: m.index ?? 0, segments, path });
    }
  }
  const quoted = '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')';
  /** @param {string} q @returns {string} */
  const unquote = (q) => collapseTitle(q.slice(1, -1).replace(/\\(["'\\])/g, '$1'));
  const callRe = new RegExp(`\\b(?:describe|it|test|suite)\\s*\\(\\s*${quoted}`, 'g');
  const chainRe = new RegExp(`^\\s*\\)?\\s*[›>]\\s*${quoted}`);
  let cm;
  while ((cm = callRe.exec(field)) !== null) {
    const index = cm.index;
    const segments = [unquote(cm[1])];
    let rest = field.slice(callRe.lastIndex);
    let ch;
    while ((ch = chainRe.exec(rest)) !== null) {
      segments.push(unquote(ch[1]));
      rest = rest.slice(ch[0].length);
    }
    callRe.lastIndex = field.length - rest.length;
    const before = spans.filter((s) => s.index < index);
    const path = before.length > 0 ? before[before.length - 1].path : null;
    const kept = segments.filter((s) => s !== '');
    if (kept.length > 0) found.push({ index, segments: kept, path });
  }
  found.sort((a, b) => a.index - b.index);
  /** @type {{ segments: string[], path: string | null }[]} */ const items = [];
  const seen = new Set();
  for (const f of found) {
    const key = JSON.stringify([f.path, f.segments]);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ segments: f.segments, path: f.path });
  }
  return { items };
}

/**
 * Exact, case-sensitive title match (whitespace-collapsed) against a testcase's
 * name, class name, enclosing suite name or one ` > `-separated piece of its name.
 * @param {string} segment
 * @param {{ name: string, classname?: string | null, suites?: string[] }} tc
 * @returns {boolean}
 */
export function titleMatchesTestcase(segment, tc) {
  const want = collapseTitle(segment);
  if (want === '') return false;
  const name = collapseTitle(tc.name ?? '');
  if (want === name) return true;
  if (isStr(tc.classname) && want === collapseTitle(tc.classname)) return true;
  if (Array.isArray(tc.suites) && tc.suites.some((s) => want === collapseTitle(s))) return true;
  return name.split(/\s+[>›]\s+/).some((piece) => want === piece);
}

/** @param {string} s @returns {string} */
const xmlDecode = (s) =>
  s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * @param {string} xml
 * @returns {{ name: string, file: string | null, classname: string | null, failed: boolean, skipped: boolean }[]}
 */
function readJunitTestcases(xml) {
  /** @type {{ name: string, file: string | null, classname: string | null, failed: boolean, skipped: boolean }[]} */
  const out = [];
  const re = /<testcase\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrText = m[1];
    /** @type {Record<string, string>} */ const attrs = {};
    for (const a of attrText.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = xmlDecode(a[2] ?? a[3] ?? '');
    let body = '';
    if (!attrText.trimEnd().endsWith('/')) {
      const end = xml.indexOf('</testcase>', re.lastIndex);
      body = end >= 0 ? xml.slice(re.lastIndex, end) : '';
    }
    out.push({
      name: attrs.name ?? '',
      file: isStr(attrs.file) && attrs.file !== '' ? attrs.file : null,
      classname: isStr(attrs.classname) && attrs.classname !== '' ? attrs.classname : null,
      failed: /<(failure|error)\b/.test(body),
      skipped: /<skipped\b/.test(body),
    });
  }
  return out;
}

/**
 * One entry per `<testcase` of the document, in document order: the names of its
 * enclosing `<testsuite>` elements, outermost first.
 * @param {string} xml
 * @returns {string[][]}
 */
export function readJunitSuiteChains(xml) {
  /** @type {string[][]} */ const out = [];
  if (!isStr(xml)) return out;
  try {
    /** @type {string[]} */ const stack = [];
    const re = /<(\/?)(testsuite|testcase)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const closing = m[1] === '/';
      const selfClosing = m[3].trimEnd().endsWith('/');
      if (m[2] === 'testcase') {
        if (!closing) out.push([...stack]);
      } else if (closing) {
        stack.pop();
      } else if (!selfClosing) {
        /** @type {Record<string, string>} */ const attrs = {};
        for (const a of m[3].matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = xmlDecode(a[2] ?? a[3] ?? '');
        stack.push(attrs.name ?? '');
      }
    }
  } catch {
    return out;
  }
  return out;
}

/**
 * Resolves one `automated`-coverage case from the Test Runner's record, or
 * returns null so the case routes exactly as before.
 * @param {string} root
 * @param {string} feature
 * @param {ReportCase} kase
 * @returns {{ outcome: 'pass' | 'fail', reason: string, value: any } | null}
 */
function resolveFromRecord(root, feature, kase) {
  const cov = (kase.coverage ?? '').replace(/[`*]/g, '').trim().toLowerCase();
  if (cov !== 'automated') return null;
  const found = findTestRunnerRecord(root, feature);
  if (found === null) return null;
  const rec = readJsonOrNull(found.abs);
  if (!isSchemaV1Record(rec)) return null;
  const { paths, refused } = extractTestPaths(normalizeTestCitation(kase.automated_test_path));
  if (refused || paths.length === 0) return null;
  const cited = extractCitedTitles(kase.automated_test_path).items;
  if (cited.some((c) => c.path === null || !paths.includes(c.path))) return null;
  const generated = Date.parse(rec.generated_at);
  if (Number.isNaN(generated)) return null;
  const junit = rec.artifacts.junit_xml;
  /** @type {string} */ let xml;
  /** @type {string} */ let mtimeIso;
  try {
    const st = statSync(junit);
    if (!st.isFile() || st.size > JUNIT_MAX_BYTES) return null;
    if (st.mtimeMs > generated + JUNIT_MTIME_SLACK_MS) return null;
    mtimeIso = new Date(st.mtimeMs).toISOString();
    xml = readFileSync(junit, 'utf8');
  } catch {
    return null;
  }
  const all = readJunitTestcases(xml);
  const chains = readJunitSuiteChains(xml);
  const cases = all.map((t, ti) => {
    const loc = t.file !== null ? t.file : t.classname;
    return { ...t, loc: loc === null ? null : loc.split('\\').join('/'), suites: chains.length === all.length ? chains[ti] : [] };
  });
  /** @type {{ cited: string, testcases: number, failed: string[], granularity?: 'test', titles?: string[] }[]} */ const files = [];
  for (const p of paths) {
    const hit = cases.filter((t) => t.loc !== null && (t.loc === p || t.loc.endsWith(`/${p}`)));
    if (new Set(hit.map((t) => t.loc)).size !== 1) return null;
    const ran = hit.filter((t) => !t.skipped);
    if (ran.length === 0) return null;
    const mine = cited.filter((c) => c.path === p);
    if (mine.length > 0) {
      /** @type {Set<typeof ran[number]>} */ const pooled = new Set();
      for (const c of mine) {
        const matched = ran.filter((t) => c.segments.every((seg) => titleMatchesTestcase(seg, { name: t.name, classname: t.classname, suites: t.suites })));
        if (matched.length === 0) return null;
        for (const t of matched) pooled.add(t);
      }
      const scoped = [...pooled];
      files.push({ cited: p, testcases: scoped.length, failed: scoped.filter((t) => t.failed).map((t) => t.name), granularity: 'test', titles: mine.map((c) => c.segments.join(' > ')) });
      continue;
    }
    files.push({ cited: p, testcases: ran.length, failed: ran.filter((t) => t.failed).map((t) => t.name) });
  }
  const total = files.reduce((n, f) => n + f.testcases, 0);
  const failedCount = files.reduce((n, f) => n + f.failed.length, 0);
  const head = `resolved from ${found.rel} (run ${rec.run_id}, attempt ${rec.attempt}, generated ${rec.generated_at}); ${total} test case(s) in ${files.length} file(s), `;
  return {
    outcome: failedCount > 0 ? 'fail' : 'pass',
    reason: head + (failedCount > 0 ? `${failedCount} failed` : 'none failed'),
    value: {
      resolved_from: 'test-runner-record',
      record: found.rel,
      record_run_id: rec.run_id,
      record_attempt: rec.attempt,
      record_generated_at: rec.generated_at,
      junit_artifact: junit,
      junit_artifact_mtime: mtimeIso,
      files,
      granularity: files.every((f) => f.granularity === 'test') ? 'test' : files.some((f) => f.granularity === 'test') ? 'mixed' : 'file',
    },
  };
}

// ---------------------------------------------------------------------------
// Case classification
// ---------------------------------------------------------------------------

/**
 * Anonymous check for a target recorded as authenticating everyone: a fresh
 * browser context with NO storage state, behind the same guard route, opens the
 * role's browser-probe route on the target. The authenticated-only marker
 * visible means the injection is present (not clean); absent for the whole
 * window with the page loaded means clean. Cached per role.
 * @param {RunCtx} ctx
 * @param {string} role
 * @param {NonNullable<Target>} alt
 * @param {any} bp the role's browserProbe declaration
 * @returns {Promise<'clean' | 'injected' | 'unreachable' | 'unavailable'>}
 */
async function anonymousCheck(ctx, role, alt, bp) {
  const cached = ctx.anonChecks.get(role);
  if (cached) return cached;
  /** @type {'clean' | 'injected' | 'unreachable' | 'unavailable'} */ let verdict = 'unreachable';
  const url = resolveStepUrl(bp.route, alt);
  if (url !== null) {
    /** @type {any} */ let browser = null;
    try {
      browser = await ctx.playwright.chromium.launch({ headless: true });
    } catch {
      verdict = 'unavailable';
    }
    if (browser !== null) {
      try {
        const context = await browser.newContext();
        await context.route('**/*', (/** @type {any} */ route) => {
          const u = new URL(route.request().url());
          if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
          return alt.guard.isAllowedHost(u.hostname, alt.allowedHosts) ? route.continue() : route.abort();
        });
        const page = await context.newPage();
        const res = await page.goto(url, { waitUntil: 'load', timeout: 15000 }).catch(() => null);
        if (res !== null && res.status() < 500) {
          // A settle aid only; the decision is the visible wait below.
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
          const m = bp.marker;
          const loc = m.kind === 'text' ? page.getByText(m.value).first() : page.locator(m.value).first();
          verdict = await loc.waitFor({ state: 'visible', timeout: ANONYMOUS_CHECK_MS }).then(
            () => /** @type {const} */ ('injected'),
            (/** @type {any} */ e) => (e && e.name === 'TimeoutError' ? /** @type {const} */ ('clean') : /** @type {const} */ ('unreachable')),
          );
        }
      } catch {
        verdict = 'unreachable';
      } finally {
        await browser.close().catch(() => {});
      }
    }
  }
  ctx.anonChecks.set(role, verdict);
  return verdict;
}

/**
 * The browser-case gate for a role recorded as authenticated for everyone.
 * @param {RunCtx} ctx
 * @param {string} role
 * @param {any} record the role's authenticatesAnonymous object
 * @returns {Promise<{ block: CaseResult } | { ctx: RunCtx }>} a blocking result, or the context to run the case with
 */
async function preAuthenticatedGate(ctx, role, record) {
  const evidenceText = isStr(record.evidence) && record.evidence !== '' ? record.evidence : 'no evidence recorded';
  const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
  const bp = roles[role] && isObj(roles[role].browserProbe) ? roles[role].browserProbe : null;
  const blockedPre = (/** @type {string} */ why) =>
    ({ block: blocked('FAILED_TARGET_PRE_AUTHENTICATED', `the target authenticates every request for role ${role} (${evidenceText}); ${why}`) });
  const altUrl = isStr(record.alternativeBaseUrl) && record.alternativeBaseUrl !== '' ? record.alternativeBaseUrl : null;
  if (altUrl === null) return blockedPre('a browser case would pass without a session and no alternative local target is configured');
  const r = await ctx.target.guard.checkTarget(altUrl, { root: ctx.root });
  if (!r.ok) {
    return { block: blocked('FAILED_NON_LOCAL_TARGET', `the alternative target is not local (${r.reason}); nothing was requested`) };
  }
  /** @type {NonNullable<Target>} */
  const alt = { guard: ctx.target.guard, origin: r.origin, allowedHosts: r.allowedHosts };
  if (bp === null || !isObj(bp.marker) || !isStr(bp.route)) {
    return blockedPre('the role declares no browser probe, so the alternative target cannot be confirmed');
  }
  const verdict = await anonymousCheck(ctx, role, alt, bp);
  if (verdict === 'clean') return { ctx: { ...ctx, target: alt } };
  if (verdict === 'unreachable') return { block: blocked('TARGET_UNREACHABLE', 'the alternative target could not be loaded for the anonymous check') };
  if (verdict === 'unavailable') {
    return { block: blocked('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/') };
  }
  return blockedPre('the alternative target still showed the authenticated-only marker with no session');
}

/**
 * The plan-time grounding snapshots written by the ground mode under <run-dir>/grounding.
 * @param {string} runDirAbs
 * @returns {any[]}
 */
function loadGroundingSnapshots(runDirAbs) {
  /** @type {string[]} */ let names = [];
  try {
    names = readdirSync(join(runDirAbs, 'grounding'));
  } catch {
    return [];
  }
  /** @type {any[]} */ const docs = [];
  for (const name of names.filter((n) => n.endsWith('.snapshot.json')).sort()) {
    const d = readJsonOrNull(join(runDirAbs, 'grounding', name));
    if (isObj(d) && (d.schema_version === 1 || isPostInteractionSnapshot(d)) && isStr(d.role) && isStr(d.route) && Array.isArray(d.entries)) docs.push(d);
  }
  return docs;
}

/**
 * @param {RunCtx | null} ctxOrNull
 * @param {ReportCase} kase
 * @param {Map<number, any>} planByIndex
 * @param {Target} target
 * @param {() => RunCtx} makeCtx lazily builds the run context (loads Playwright once)
 * @param {string} root
 * @param {string} feature
 * @returns {Promise<{ result: CaseResult, driver: string | null, role: string | null }>}
 */
async function executeCase(ctxOrNull, kase, planByIndex, target, makeCtx, root, feature) {
  const resolved = resolveFromRecord(root, feature, kase);
  if (resolved !== null) {
    // No driver runs for a resolved case, and a plan entry for it is ignored. Never a pass without evidence.
    try {
      const evCtx = ctxOrNull ?? makeCtx();
      const evidence = writeEvidence(evCtx, `case-${kase.index}.record.json`, { kind: 'json', value: resolved.value });
      return { result: { outcome: resolved.outcome, reason_code: 'AUTOMATED_EVIDENCE', reason: resolved.reason, evidence: [evidence] }, driver: null, role: null };
    } catch {
      return { result: blocked('EVIDENCE_WRITE_FAILED', 'the record-resolved evidence file could not be written; no outcome is claimed'), driver: null, role: null };
    }
  }
  const p = planByIndex.get(kase.index);
  if (!p) return { result: needsHuman('NO_PLAN_ENTRY', 'no plan entry covers this case; the manual steps are reproduced verbatim'), driver: null, role: null };
  const driver = isStr(p.driver) ? p.driver : null;
  const role = isStr(p.role) ? p.role : null;
  /** @param {CaseResult} result */
  const out = (result) => ({ result, driver, role });
  if (p.title !== kase.title) return out(needsHuman('PLAN_ENTRY_INVALID', "the plan entry's title does not match the report's title"));
  // A class, a reason code or an objective-step count outside the closed sets is refused naming the value; a
  // declining entry returns here, before the seed declaration is read and before any session, guard call,
  // request or browser load, and it never needs a declared target.
  const invalidClass = validatePlanClassification(p);
  if (invalidClass) return out(needsHuman(invalidClass.code, invalidClass.reason));
  const declined = declinedCase(p);
  if (declined !== null) return { result: declined, driver: null, role: null };
  if (driver === null) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry names no driver'));
  if (driver !== 'http' && driver !== 'browser') {
    return out(needsHuman('NO_ACTIVE_DRIVER', `no active driver handles ${JSON.stringify(driver)}; the manual steps are reproduced verbatim`));
  }
  if (!Array.isArray(p.steps) || p.steps.length === 0) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry carries no steps'));
  // A seed declaration binds names; the values only arrive after the seed ran. A reference no declaration
  // binds is refused here, before any state is seeded, session obtained or request sent.
  const seedConfig = ctxOrNull ? ctxOrNull.seedConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'qa-seed.json'));
  const stateText = (kase.required_state ?? '').trim();
  const invalid = validateSteps(driver, p.steps, declaredCaptureNames(seedConfig, stateText, p.state));
  if (invalid) return out(needsHuman(invalid.code, invalid.reason));
  if (p.human_remainder !== undefined && !(isObj(p.human_remainder) && isStr(p.human_remainder.reason) && p.human_remainder.reason.trim() !== '')) {
    return out(needsHuman('PLAN_ENTRY_INVALID', 'human_remainder must be an object with a non-empty string reason'));
  }
  const hasQuery = p.steps.some((/** @type {any} */ s) => isObj(s) && s.action === 'query');
  const Q = hasQuery ? await loadQueryModule() : null;
  if (hasQuery && Q === null) return out(blocked('QUERY_MODULE_UNAVAILABLE', 'the query module could not be loaded; nothing was executed'));
  const unsafeQuery = Q === null ? null : Q.precheckQuerySteps(p.steps, seedConfig && isObj(seedConfig) ? seedConfig.query_sources : undefined);
  if (unsafeQuery) return out(blocked(unsafeQuery.code, unsafeQuery.reason));
  if (target === null) {
    return out(blocked('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>'));
  }
  const ctx = ctxOrNull ?? makeCtx();
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'request' || s.origin === undefined) continue;
    const r = await resolveApiOrigin(ctx, s, i + 1);
    if (!r.ok) return out(r.result);
    if (r.spec.header !== null && role === null && s.session !== 'none') {
      return out(blocked('API_HEADER_NO_SESSION', `step ${i + 1}: the origin ${r.spec.name} derives a header from the role session, but the plan entry names no role`));
    }
  }
  if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null)) {
    const grounded = precheckGroundedSteps(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role);
    if (grounded !== null) return out(needsHuman(grounded.code, grounded.reason));
  }
  if (ctx.playwright === null) {
    return out(blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright is not resolvable; run `npm install` in plugins/relay/scripts/visual/'));
  }
  for (const [i, s] of p.steps.entries()) {
    if (typeof s.path === 'string' && resolveStepUrl(s.path, target) === null) {
      return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`));
    }
  }
  const querySources = seedConfig && isObj(seedConfig) ? seedConfig.query_sources : undefined;
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'query') continue;
    const src = /** @type {any} */ (Q).classifyQuerySource(querySources, s.source);
    if (!src.ok) return out(blocked(src.code, `step ${i + 1}: ${src.reason}`));
    if (!(await queryArgvIsLocal(ctx, src.argv))) return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: a query source argument names a non-local URL; nothing was executed`));
  }
  /** @type {any[]} */ let steps = p.steps;
  // A browser case for a role whose target authenticates every request cannot
  // prove anything: gate it before anything is seeded or logged in.
  /** @type {RunCtx} */ let runCtx = ctx;
  if (driver === 'browser' && role !== null && ROLE_PATTERN.test(role)) {
    const cfgRoles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    const record = Object.hasOwn(cfgRoles, role) && isObj(cfgRoles[role]) ? cfgRoles[role].authenticatesAnonymous : null;
    if (isObj(record)) {
      const gate = await preAuthenticatedGate(ctx, role, record);
      if ('block' in gate) return out(gate.block);
      runCtx = gate.ctx;
    }
  }
  const stateBlock = await prepareState(ctx, kase, p);
  if (stateBlock) return out(stateBlock);
  const seededValues = ctx.seeds.get(stateText)?.captures;
  if (seededValues) {
    steps = p.steps.map((/** @type {any} */ s) => substituteVariables(s, seededValues));
    for (const [i, s] of steps.entries()) {
      if (typeof s.path === 'string' && resolveStepUrl(s.path, target) === null) {
        return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`));
      }
    }
  }
  /** @type {SessionInfo | null} */ let session = null;
  if (role !== null) {
    const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    if (!ROLE_PATTERN.test(role) || !Object.hasOwn(roles, role)) {
      return out(blocked('ROLE_UNDECLARED', `role ${role} is not declared in PRPs/auth/login.config.json`));
    }
    const s = obtainSession(ctx, role);
    if (!s.ok && s.code === 'FAILED_KIT_SCRIPT_STALE') {
      return out(blocked(s.code, `the kit login script for role ${role} was generated from a different template than the installed one (${s.detail ?? 'identities unknown'}); nothing was saved or reused; run /relay-auth-scripts --refresh`));
    }
    if (!s.ok && PROBE_BLOCK_CODES.includes(s.code)) {
      return out(blocked(s.code, `the kit's session probe for role ${role} halted; nothing was saved or reused`));
    }
    if (!s.ok && MINT_BLOCK_CODES.includes(s.code) && isMintedRole(ctx, role)) {
      return out(blocked(s.code, mintBlockReason(s.code, role)));
    }
    if (!s.ok) return out(blocked('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`));
    session = s.info;
  }
  const fn = DRIVERS[driver];
  if (!fn) return out(needsHuman('NO_ACTIVE_DRIVER', `no active driver handles ${JSON.stringify(driver)}`));
  const ran = await fn(runCtx, kase, { ...p, steps }, session);
  // A driver that passed every step has all of them passed; a driver that ended the case early already recorded its steps.
  const withSteps = ran.outcome === 'pass' && ran.steps === undefined
    ? { ...ran, steps: recordSteps(p.steps, p.steps.length, -1, (j) => (driver === 'http' ? ran.evidence[j] ?? null : j === p.steps.length - 1 ? ran.evidence[0] ?? null : null)) }
    : ran;
  return out(applyPartialRemainder(withSteps, p));
}

// ---------------------------------------------------------------------------
// init and run
// ---------------------------------------------------------------------------

/**
 * @param {Args} args
 * @returns {Promise<number>}
 */
async function runInit(args) {
  const feature = /** @type {string} */ (args.feature);
  const target = await guardTarget(resolveTarget(args.root, args.envHandle), args.root);
  const report = join(args.root, 'PRPs', 'reports', feature, 'qa-report.md');
  if (!existsSync(report)) throw new Halt('FAILED_QA_REPORT_MISSING', `PRPs/reports/${feature}/qa-report.md does not exist`);
  const runId = now().replace(/[-:]/g, '').replace('.', '');
  const runDirRel = `PRPs/reports/${feature}/qa-run/${runId}`;
  const runDirAbs = join(args.root, ...runDirRel.split('/'));
  if (existsSync(runDirAbs)) throw new Halt('FAILED_RUN_DIR_EXISTS', `${runDirRel} already exists`);
  mkdirSync(join(runDirAbs, 'evidence'), { recursive: true });
  const proof = requireRunIgnore(runDirAbs, { alwaysWrite: true });
  process.stdout.write(`RUN_ID: ${runId}\nRUN_DIR: ${runDirRel}\nBASE_URL_ORIGIN: ${target ? target.origin : 'none'}\n`);
  process.stdout.write(`IGNORE_PROOF: ${proof}\n`);
  return 0;
}

/**
 * @param {Args} args
 * @returns {Promise<number>}
 */
async function runRun(args) {
  const feature = /** @type {string} */ (args.feature);
  const root = args.root;
  const base = join(root, 'PRPs', 'reports', feature, 'qa-run');
  const runDirAbs = resolve(root, /** @type {string} */ (args.runDir));
  const within = relative(base, runDirAbs);
  if (within === '' || within.startsWith('..') || isAbsolute(within) || !existsSync(runDirAbs) || !statSync(runDirAbs).isDirectory()) {
    process.stderr.write(`--run-dir must be an existing directory inside PRPs/reports/${feature}/qa-run/\n${USAGE}`);
    return 2;
  }
  const runDirRel = fwd(relative(root, runDirAbs));
  const target = await guardTarget(resolveTarget(root, args.envHandle), root);
  const reportRel = `PRPs/reports/${feature}/qa-report.md`;
  const reportAbs = join(root, ...reportRel.split('/'));
  if (!existsSync(reportAbs)) throw new Halt('FAILED_QA_REPORT_MISSING', `${reportRel} does not exist`);
  const shaBefore = sha256File(reportAbs);
  const parsedReport = parseReport(readFileSync(reportAbs, 'utf8'));
  const cases = parsedReport.cases;
  const warnings = parsedReport.warnings;
  /** @type {Map<number, string[]>} */ const incompleteByIndex = new Map(parsedReport.incomplete.map((x) => [x.index, x.missing]));
  if (cases.length === 0) throw new Halt('FAILED_REPORT_UNPARSEABLE', `no cases found in ${reportRel}`);
  requireRunIgnore(runDirAbs);

  /** @type {Map<number, any>} */ const planByIndex = new Map();
  const planDoc = readJsonOrNull(join(runDirAbs, 'plan.json'));
  if (planDoc && planDoc.schema_version === 1 && Array.isArray(planDoc.cases)) {
    for (const e of planDoc.cases) if (isObj(e) && Number.isInteger(e.index) && !planByIndex.has(e.index)) planByIndex.set(e.index, e);
  }

  const table = buildRedactionTable({ root, env: process.env, secretValues: [] });
  /** @type {RunCtx | null} */ let ctx = null;
  const makeCtx = () => {
    ctx = {
      root,
      runDirAbs,
      runDirRel,
      table,
      target: /** @type {NonNullable<Target>} */ (target),
      playwright: loadPlaywright(root, PLUGIN_ROOT),
      loginConfig: readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json')),
      sessions: new Map(),
      seeds: new Map(),
      seedConfig: readJsonOrNull(join(root, 'PRPs', 'auth', 'qa-seed.json')),
      anonChecks: new Map(),
    };
    return ctx;
  };

  let abortSignal = false;
  const onSignal = () => {
    abortSignal = true;
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  const runStart = now();
  /** @type {any[]} */ const entries = [];
  /** @type {{ reason_code: string, reason: string } | null} */ let aborted = null;
  /** @param {ReportCase} c @param {string} reason */
  const abortedEntry = (c, reason) => {
    const t = now();
    return {
      index: c.index,
      title: c.title,
      risk: c.risk,
      outcome: 'blocked',
      reason_code: 'RUN_ABORTED',
      reason,
      driver: null,
      role: null,
      started_at: t,
      finished_at: t,
      duration_ms: 0,
      evidence: [],
      steps: [],
      manual_steps_verbatim: c.manual_steps_verbatim,
    };
  };
  /** @type {number} */ let exitCode = 0;
  try {
    for (const c of cases) {
      if (abortSignal || (args.maxCases !== null && entries.length >= args.maxCases)) {
        const reason = abortSignal ? 'the run received an interrupt signal before this case was reached' : `the run was capped at --max-cases ${args.maxCases} before this case was reached`;
        if (!aborted) aborted = { reason_code: 'RUN_ABORTED', reason };
        entries.push(abortedEntry(c, reason));
        continue;
      }
      const startedAt = now();
      /** @type {CaseResult} */ let result;
      /** @type {string | null} */ let driver = null;
      /** @type {string | null} */ let role = null;
      try {
        const missing = incompleteByIndex.get(c.index);
        if (missing) {
          // Counted, never dropped, and never executed: a case missing a label is not a case the runner can vouch for.
          result = blocked('CASE_INCOMPLETE', `the case section lacks the labeled field(s): ${missing.join(', ')}`);
        } else {
          const r = await executeCase(ctx, c, planByIndex, target, makeCtx, root, feature);
          result = r.result;
          driver = r.driver;
          role = r.role;
        }
      } catch (err) {
        result = blocked('RUNNER_ERROR', `an unexpected error stopped this case: ${redactText(String(err && /** @type {any} */ (err).message ? /** @type {any} */ (err).message : err), table)}`);
      }
      if (!OUTCOMES.includes(result.outcome)) result = blocked('RUNNER_ERROR', 'an internal path produced a value outside the closed vocabulary');
      const finishedAt = now();
      const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';
      entries.push({
        index: c.index,
        title: c.title,
        risk: c.risk,
        outcome: result.outcome,
        reason_code: result.reason_code,
        reason: result.reason,
        driver,
        role,
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)),
        evidence: result.evidence,
        steps: Array.isArray(result.steps) ? result.steps : [],
        manual_steps_verbatim: keepSteps ? c.manual_steps_verbatim : null,
      });
    }
  } catch (err) {
    const msg = String(err && /** @type {any} */ (err).message ? /** @type {any} */ (err).message : err);
    aborted = { reason_code: 'RUN_ABORTED', reason: `an unexpected error outside a case stopped the run: ${redactText(msg, table)}` };
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    // Totality: N cases in, N entries out, whatever happened above.
    while (entries.length < cases.length) {
      const reason = aborted ? aborted.reason : 'the run stopped before this case was reached';
      if (!aborted) aborted = { reason_code: 'RUN_ABORTED', reason };
      entries.push(abortedEntry(cases[entries.length], reason));
    }
    const finished = now();
    // The class and objective-step count are echoed from the plan entry (never inferred), padded entries included.
    applyClassification(entries, planByIndex);
    const { counts, record_resolved: recordResolved, partially_executed: partiallyExecuted } = summarizeEntries(entries);
    const classification = summarizeClassification(entries);
    // Record-resolved cases are INSIDE counts.pass/fail (the four-key partition is unchanged) but were
    // not executed by a driver: they are reported beside the driver-executed numbers, never added to them.
    const recordEntries = entries.filter((e) => e.reason_code === 'AUTOMATED_EVIDENCE');
    const recordPass = recordEntries.filter((e) => e.outcome === 'pass').length;
    const recordFail = recordEntries.filter((e) => e.outcome === 'fail').length;
    // A report that is gone OR unreadable (e.g. replaced by a directory) yields null, which can
    // never equal shaBefore, so it surfaces below as FAILED_REPORT_MODIFIED instead of throwing
    // out of this finally and losing results.json.
    /** @type {string | null} */ let shaAfter = null;
    try {
      shaAfter = existsSync(reportAbs) ? sha256File(reportAbs) : null;
    } catch {
      shaAfter = null;
    }
    const results = {
      schema_version: 1,
      feature,
      run_id: basename(runDirAbs),
      report_path: reportRel,
      report_sha256_before: shaBefore,
      report_sha256_after: shaAfter,
      started_at: runStart,
      finished_at: finished,
      duration_ms: Math.max(0, Date.parse(finished) - Date.parse(runStart)),
      base_url_origin: target ? target.origin : null,
      counts,
      record_resolved: recordResolved,
      partially_executed: partiallyExecuted,
      classification,
      aborted,
      warnings,
      human_gate: { status: 'open', review_file: reportRel },
      cases: entries,
    };
    if (entries.length !== cases.length) {
      process.stderr.write(`FAILED_ENTRY_COUNT: ${entries.length} entries for ${cases.length} cases\n`);
      exitCode = 1;
    }
    try {
      writeRunFile({ runDirAbs, table }, join(runDirAbs, 'results.json'), { kind: 'json', value: results });
    } catch {
      process.stderr.write('FAILED_RESULTS_WRITE_FAILED: results.json could not be written\n');
      exitCode = 1;
    }
    const lines = [
      `QA run finished: pass=${counts.pass - recordPass} fail=${counts.fail - recordFail} blocked=${counts.blocked} needs-human=${counts['needs-human']}`,
      `Record-resolved (not driver-executed): record-resolved=${recordResolved} (pass=${recordPass} fail=${recordFail})`,
      `Partially executed (not in the driver-executed rate): partially-executed=${partiallyExecuted}`,
      ...entries.filter((e) => e.outcome !== 'pass').map((e) => `  case ${e.index}: ${e.outcome}${e.reason_code ? ` (${e.reason_code})` : ''}`),
      `Results: ${runDirRel}/results.json`,
      `Evidence: ${runDirRel}/evidence/`,
    ];
    for (const w of warnings) lines.push(`WARNING ${w.code}: ${w.message}`);
    if (aborted) lines.push(`RUN ABORTED: ${aborted.reason_code}`);
    if (shaAfter !== shaBefore) {
      process.stderr.write(`FAILED_REPORT_MODIFIED: ${reportRel} changed during the run\n`);
      exitCode = 1;
    }
    lines.push(HUMAN_GATE_SENTENCE, `Review file: ${reportRel}`);
    process.stdout.write(`${lines.join('\n')}\n`);
    if (aborted) exitCode = 1;
  }
  return exitCode;
}

/**
 * @param {Args} args
 * @returns {number}
 */
function runParse(args) {
  const reportPath = resolve(/** @type {string} */ (args.report));
  /** @type {string} */ let text;
  try {
    text = readFileSync(reportPath, 'utf8');
  } catch {
    process.stderr.write(`FAILED_REPORT_UNPARSEABLE: cannot read ${fwd(String(args.report))}\n`);
    return 1;
  }
  const rel = fwd(relative(process.cwd(), reportPath));
  const shown = rel.startsWith('..') || isAbsolute(rel) ? fwd(String(args.report)) : rel;
  const { cases, incomplete, warnings } = parseReport(text);
  if (cases.length === 0) {
    process.stderr.write(`FAILED_REPORT_UNPARSEABLE: no cases found in ${shown}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify({ report_path: shown, cases, incomplete, warnings }, null, 2)}\n`);
  return 0;
}

/** The longest `path` a prefix `goto` may carry, in characters. */
const GROUND_PREFIX_PATH_MAX = 500;

/**
 * Parses the `--prefix` text of the ground mode: a JSON array of at most GROUND_PREFIX_MAX_STEPS flat
 * `goto`, `click` and `fill` steps, each naming its element by role and name or by text. Pure and total:
 * it never throws, and no reason carries a locator, a typed value, a key name or a binding name, only
 * fixed sentences, step positions and the numeric caps.
 * @param {any} text
 * @returns {{ ok: true, steps: any[] } | { ok: false, why: string }}
 */
export function parseGroundPrefix(text) {
  /** @param {string} why @returns {{ ok: false, why: string }} */
  const refuse = (why) => ({ ok: false, why });
  if (!isStr(text) || text.trim() === '') return refuse('the prefix must be a JSON array of steps');
  /** @type {any} */ let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return refuse('the prefix is not valid JSON');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return refuse('the prefix must be a non-empty JSON array of steps');
  if (parsed.length > GROUND_PREFIX_MAX_STEPS) return refuse(`the prefix has more than ${GROUND_PREFIX_MAX_STEPS} steps`);
  /** @type {any[]} */ const steps = [];
  for (const [i, step] of parsed.entries()) {
    const n = i + 1;
    if (!isObj(step)) return refuse(`step ${n}: a step must be a JSON object`);
    const action = step.action;
    if (!isStr(action) || !GROUND_PREFIX_ACTIONS.includes(action)) return refuse(`step ${n}: the action must be goto, click or fill`);
    const allowed = action === 'goto' ? ['action', 'path'] : action === 'click' ? ['action', 'role', 'name', 'text'] : ['action', 'role', 'name', 'text', 'value'];
    const keys = Object.keys(step);
    if (keys.some((k) => !allowed.includes(k))) return refuse(`step ${n}: the step carries a key its action does not take`);
    if (keys.some((k) => !isStr(step[k]))) return refuse(`step ${n}: every key of a step must hold a string`);
    // A capture is unbound at plan time because the ground mode runs before any seed.
    if (stepVariables(step).length > 0) return refuse(`step ${n}: a {{name}} binding is not allowed in a prefix`);
    if (action === 'goto') {
      if (!isStr(step.path) || !/^\/(?!\/)/.test(step.path) || step.path.length > GROUND_PREFIX_PATH_MAX) {
        return refuse(`step ${n}: a goto path must start with a single / and be at most ${GROUND_PREFIX_PATH_MAX} characters`);
      }
      steps.push({ action: 'goto', path: step.path });
      continue;
    }
    const loc = locatorOf(step);
    if (loc === null) return refuse(`step ${n}: a ${action} step must name its element by role and name, or by text`);
    if (!loc.ok) return refuse(`step ${n}: ${loc.why}`);
    /** @type {any} */ const clean = { action };
    if (loc.form === 'role') {
      clean.role = loc.role;
      clean.name = loc.name;
    } else {
      clean.text = loc.text;
    }
    if (action === 'fill') {
      if (!isStr(step.value)) return refuse(`step ${n}: a fill step carries a string value`);
      if (step.value.length > GROUND_PREFIX_VALUE_MAX) return refuse(`step ${n}: a fill value is at most ${GROUND_PREFIX_VALUE_MAX} characters`);
      clean.value = step.value;
    }
    steps.push(clean);
  }
  if (!steps.some((s) => s.action !== 'goto')) return refuse('a prefix needs at least one click or fill step; a goto alone is the plain route');
  return { ok: true, steps };
}

/**
 * The normalized form of one prefix step, or null when it is not a keyable `goto`, `click` or `fill`
 * step (a `selector` step, another action, a non-object, a `fill` with no string value). The keys are
 * built in the order action, the locator keys, then `value_sha256`; a `fill` carries the SHA-256 of its
 * value and never the value. Pure.
 * @param {any} step
 * @returns {{ action: string, path?: string, role?: string, name?: string, text?: string, value_sha256?: string } | null}
 */
export function groundingStepKey(step) {
  if (!isObj(step)) return null;
  if (step.action === 'goto') return isStr(step.path) ? { action: 'goto', path: step.path } : null;
  if (step.action !== 'click' && step.action !== 'fill') return null;
  const loc = locatorOf(step);
  if (loc === null || !loc.ok) return null;
  /** @type {any} */ const norm = { action: step.action };
  if (loc.form === 'role') {
    norm.role = loc.role;
    norm.name = loc.name;
  } else {
    norm.text = loc.text;
  }
  if (step.action === 'fill') {
    if (!isStr(step.value)) return null;
    norm.value_sha256 = createHash('sha256').update(step.value, 'utf8').digest('hex');
  }
  return norm;
}

/**
 * One canonical string for a list of normalized steps: the JSON of fixed-order tuples, so two lists
 * of the same steps in the same order and with the same typed values produce the same string. Null
 * when the list is not an array or any element is not an object. Pure.
 * @param {any} list
 * @returns {string | null}
 */
export function groundingPrefixKey(list) {
  if (!Array.isArray(list)) return null;
  /** @type {any[][]} */ const tuples = [];
  for (const s of list) {
    if (!isObj(s)) return null;
    tuples.push([s.action ?? null, s.path ?? null, s.role ?? null, s.name ?? null, s.text ?? null, s.value_sha256 ?? null]);
  }
  return JSON.stringify(tuples);
}

/**
 * The `goto`, `click` and `fill` steps of a case before the zero-based index `upTo`, each with its
 * one-based position, the step and its normalized form (null when it is not keyable). Pure.
 * @param {any} steps
 * @param {number} upTo
 * @returns {{ at: number, step: any, norm: ReturnType<typeof groundingStepKey> }[]}
 */
export function interactionHistory(steps, upTo) {
  if (!Array.isArray(steps)) return [];
  /** @type {{ at: number, step: any, norm: ReturnType<typeof groundingStepKey> }[]} */ const out = [];
  for (let i = 0; i < steps.length && i < upTo; i++) {
    const step = steps[i];
    if (!isObj(step) || !GROUND_PREFIX_ACTIONS.includes(step.action)) continue;
    out.push({ at: i + 1, step, norm: groundingStepKey(step) });
  }
  return out;
}

/**
 * True for a snapshot document the ground mode wrote after replaying a prefix: schema version 2 with a
 * `prefix` array. A plain snapshot is schema version 1 and carries no prefix. Pure.
 * @param {any} doc
 * @returns {boolean}
 */
export function isPostInteractionSnapshot(doc) {
  return isObj(doc) && doc.schema_version === 2 && Array.isArray(doc.prefix);
}

/**
 * The file name of a grounding snapshot: `<role>--<slug>.snapshot.json` for a plain snapshot (key null,
 * the name it always had), and `<role>--<slug>--after-<8 hex of the SHA-256 of the key>.snapshot.json`
 * for a post-interaction one, so the two kinds can never share a name. Pure.
 * @param {string} role
 * @param {string} slug
 * @param {string | null} key the canonical prefix key
 * @returns {string}
 */
export function groundSnapshotFileName(role, slug, key) {
  if (key === null) return `${role}--${slug}.snapshot.json`;
  const digest = createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 8);
  return `${role}--${slug}--after-${digest}.snapshot.json`;
}

/**
 * The pathname the page is on after a replay, or null when its URL is not on the guard-approved origin
 * (another origin, an error page, `about:blank`, an unparsable string). Pure.
 * @param {any} url
 * @param {any} origin
 * @returns {string | null}
 */
export function finalPageRoute(url, origin) {
  if (!isStr(url) || !isStr(origin)) return null;
  try {
    const u = new URL(url);
    return u.origin === origin ? u.pathname : null;
  } catch {
    return null;
  }
}

const GROUND_USAGE = `Usage:
${GROUND_USAGE_LINE}
  A leading-slash --route reaches the script intact only when the shell does not rewrite it; under Windows Git Bash set MSYS_NO_PATHCONV=1 for the command.
  --prefix takes a JSON array of at most ${GROUND_PREFIX_MAX_STEPS} goto, click and fill steps, each flat and named by role and name or by text, replayed with the role's session after the route loads and before the snapshot is taken; quote it in single quotes.
`;

/**
 * @param {string[]} argv
 * @returns {{ root: string, feature: string, runDir: string, route: string, role: string | null, envHandle: string | null, prefix: string | null } | null}
 */
function parseGroundArgs(argv) {
  let root = process.cwd();
  /** @type {string | null} */ let feature = null;
  /** @type {string | null} */ let runDir = null;
  /** @type {string | null} */ let route = null;
  /** @type {string | null} */ let role = null;
  /** @type {string | null} */ let envHandle = null;
  /** @type {string | null} */ let prefix = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!['--root', '--feature', '--run-dir', '--route', '--role', '--env-handle', '--prefix'].includes(a)) return null;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) return null;
    i++;
    if (a === '--root') root = resolve(v);
    else if (a === '--feature') feature = v;
    else if (a === '--run-dir') runDir = v;
    else if (a === '--route') route = v;
    else if (a === '--role') role = v;
    else if (a === '--prefix') prefix = v;
    else envHandle = v;
  }
  if (feature === null || !FEATURE_PATTERN.test(feature)) return null;
  if (runDir === null || route === null || !/^\/(?!\/)/.test(route)) return null;
  if (role !== null && !ROLE_PATTERN.test(role)) return null;
  return { root, feature, runDir, route, role, envHandle, prefix };
}

/**
 * Replays the steps of a ground prefix on a loaded page, in order, and stops at the first failure. A
 * `goto` is resolved against the guard-approved origin and never loaded when it leaves it. A `click` or
 * `fill` locator is resolved exactly as the run driver resolves it and is acted on only when it matches
 * exactly one element at that moment (zero is a halt here, because the page is not the one the prefix
 * assumes). Every reason is a fixed sentence with a position, an action word or a count: never a
 * locator name, a typed value or page text.
 * @param {any} page
 * @param {any[]} steps validated prefix steps (see parseGroundPrefix)
 * @param {NonNullable<Target>} target
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function replayGroundingPrefix(page, steps, target) {
  for (const [i, step] of steps.entries()) {
    const n = i + 1;
    if (step.action === 'goto') {
      const url = resolveStepUrl(step.path, target);
      if (url === null) return { ok: false, reason: `prefix step ${n}: the path leaves the guard-approved origin; nothing was requested` };
      try {
        const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
        if (resp !== null && resp.status() >= 500) throw new Error('server error');
      } catch {
        return { ok: false, reason: `prefix step ${n}: the page could not be loaded` };
      }
      continue;
    }
    const loc = locatorOf(step);
    if (loc === null || !loc.ok) return { ok: false, reason: `prefix step ${n}: the step does not name its element by role and name, or by text` };
    const located = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });
    // The wait only gives the page time to render; the decision is the count.
    await located.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const count = await located.count().catch(() => 0);
    if (count !== 1) {
      return { ok: false, reason: `prefix step ${n}: the locator matched ${count} elements; a prefix step must match exactly one, so nothing was acted on` };
    }
    try {
      if (step.action === 'click') await located.click();
      else await located.fill(step.value);
    } catch {
      return { ok: false, reason: `prefix step ${n}: the ${step.action} target could not be found or acted on` };
    }
  }
  return { ok: true };
}

/**
 * The one-based position of the first `click` or `fill` prefix step whose locator text (the name, or the
 * text) the redaction rules withhold (a secret known to the table, an e-mail address or a declared
 * pattern), else 0. Such a locator is never replayed: a withheld entry is never usable as a locator.
 * @param {any[]} steps validated prefix steps
 * @param {RedactionTable} table
 * @returns {number}
 */
export function withheldPrefixStep(steps, table) {
  for (const [i, step] of steps.entries()) {
    if (!isObj(step) || step.action === 'goto') continue;
    const entry = isStr(step.name) ? { kind: 'role', role: step.role, name: step.name } : { kind: 'text', text: step.text };
    if (partitionSnapshotEntries([entry], table).withheld > 0) return i + 1;
  }
  return 0;
}

// The ground mode: `qa-run.mjs ground` takes a redacted accessibility snapshot of one route, with one
// role's saved session, behind the local-only guard, and writes the role-and-name and text candidates of
// the page (each with its real match count) to <run-dir>/grounding/<role>--<slug>.snapshot.json. With a
// `--prefix` it first replays the case's own goto, click and fill steps, and writes the snapshot taken
// after them to <run-dir>/grounding/<role>--<slug>--after-<digest>.snapshot.json (schema version 2, the
// prefix recorded with a digest in place of every typed value), which never replaces the plain file.
// Sensitive entries are withheld, never written; the raw snapshot is never persisted or printed.
/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runGround(argv) {
  const a = parseGroundArgs(argv);
  if (a === null) {
    process.stderr.write(GROUND_USAGE);
    return 2;
  }
  // A malformed prefix is refused here, before any file or network access, with a fixed reason.
  /** @type {any[] | null} */ let prefix = null;
  if (a.prefix !== null) {
    const parsed = parseGroundPrefix(a.prefix);
    if (!parsed.ok) {
      process.stderr.write(`GROUND_PREFIX_INVALID: ${parsed.why}\n${GROUND_USAGE}`);
      return 2;
    }
    prefix = parsed.steps;
  }
  const { root, feature, route, role, envHandle } = a;
  const base = join(root, 'PRPs', 'reports', feature, 'qa-run');
  const runDirAbs = resolve(root, a.runDir);
  const within = relative(base, runDirAbs);
  if (within === '' || within.startsWith('..') || isAbsolute(within) || !existsSync(runDirAbs) || !statSync(runDirAbs).isDirectory()) {
    process.stderr.write(`--run-dir must be an existing directory inside PRPs/reports/${feature}/qa-run/\n${GROUND_USAGE}`);
    return 2;
  }
  const runDirRel = fwd(relative(root, runDirAbs));
  const target = await guardTarget(resolveTarget(root, envHandle), root);
  if (target === null) throw new Halt('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>');
  const url = resolveStepUrl(route, target);
  if (url === null) throw new Halt('FAILED_NON_LOCAL_TARGET', 'the route leaves the guard-approved origin; nothing was requested');
  // A prefix path that leaves the approved origin is refused here too, so it costs no file and no request.
  if (prefix !== null && prefix.some((s) => s.action === 'goto' && resolveStepUrl(s.path, target) === null)) {
    throw new Halt('FAILED_NON_LOCAL_TARGET', 'a prefix path leaves the guard-approved origin; nothing was requested');
  }
  requireRunIgnore(runDirAbs);
  const playwright = loadPlaywright(root, PLUGIN_ROOT);
  if (playwright === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright could not be resolved from the target or the plugin');
  const table = buildRedactionTable({ root, env: process.env, secretValues: [] });
  /** @type {RunCtx} */ const ctx = {
    root,
    runDirAbs,
    runDirRel,
    table,
    target,
    playwright,
    loginConfig: readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json')),
    sessions: new Map(),
    seeds: new Map(),
    seedConfig: null,
    anonChecks: new Map(),
  };
  /** @type {string | null} */ let storagePath = null;
  if (role !== null) {
    const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    if (!Object.hasOwn(roles, role)) throw new Halt('ROLE_UNDECLARED', `role ${role} is not declared in PRPs/auth/login.config.json`);
    const s = obtainSession(ctx, role);
    if (!s.ok) throw new Halt('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`);
    storagePath = s.info.path;
  }
  // The session has registered its secrets in the table by now, so a locator that names one is caught
  // before any browser starts.
  const withheldAt = prefix === null ? 0 : withheldPrefixStep(prefix, table);
  if (withheldAt > 0) {
    throw new Halt('GROUND_PREFIX_FAILED', `prefix step ${withheldAt}: its locator names a value the redaction rules withhold; nothing was replayed`);
  }
  /** @type {any} */ let browser = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch {
    throw new Halt('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/');
  }
  try {
    const context = await browser.newContext(storagePath !== null ? { storageState: storagePath } : {});
    await context.route('**/*', (/** @type {any} */ r) => {
      const u = new URL(r.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return r.continue();
      if (!target.guard.isAllowedHost(u.hostname, target.allowedHosts)) return r.abort();
      return r.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      if (resp !== null && resp.status() >= 500) throw new Error('server error');
    } catch {
      throw new Halt('TARGET_UNREACHABLE', 'the route could not be loaded');
    }
    if (prefix !== null) {
      const replayed = await replayGroundingPrefix(page, prefix, target);
      if (!replayed.ok) throw new Halt('GROUND_PREFIX_FAILED', replayed.reason);
    }
    const settled = await waitForStableSnapshot(() => page.locator('body').ariaSnapshot());
    if (settled.status === 'unavailable') throw new Halt('GROUND_SNAPSHOT_UNAVAILABLE', 'the installed Playwright cannot produce an accessibility snapshot');
    if (settled.status === 'unstable') {
      throw new Halt('GROUND_UNSTABLE', `no two successive accessibility snapshots were equal within ${GROUND_STABLE_BOUND_MS} ms (${settled.reads} reads); nothing was written`);
    }
    const yaml = settled.yaml;
    /** @type {any[]} */ const entries = [];
    for (const c of parseAriaSnapshot(yaml)) {
      try {
        if (c.kind === 'role') {
          const matches = await page.getByRole(c.role, { name: c.name, exact: true }).count();
          entries.push({ kind: 'role', role: c.role, name: c.name, matches });
        } else {
          const matches = await page.getByText(c.text, { exact: true }).count();
          entries.push({ kind: 'text', text: c.text, matches });
        }
      } catch {
        // a candidate whose count fails is dropped
      }
    }
    const { kept, withheld } = partitionSnapshotEntries(entries, table);
    // A prefix run records the raw --route first, then the replayed steps with a digest in place of every
    // typed value, and keys its snapshot to the route the page is on afterwards.
    const recorded = prefix === null ? null : [{ action: 'goto', path: route }, ...prefix.map((s) => groundingStepKey(s))];
    const recordedKey = recorded === null ? null : groundingPrefixKey(recorded);
    if (recorded !== null && recordedKey === null) throw new Halt('GROUND_PREFIX_FAILED', 'the prefix could not be keyed; nothing was written');
    let key = routeKey(route) ?? '/';
    if (recorded !== null) {
      const live = finalPageRoute(page.url(), target.origin);
      if (live === null) throw new Halt('GROUND_PREFIX_FAILED', 'the page ended outside the guard-approved origin; nothing was written');
      key = live;
    }
    const slug = key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
    const dest = join(runDirAbs, 'grounding', groundSnapshotFileName(role ?? 'anonymous', slug, recordedKey));
    const snapshotDoc = recorded === null
      ? { schema_version: 1, role: role ?? 'anonymous', route: key, entries: kept, withheld }
      : { schema_version: 2, role: role ?? 'anonymous', route: key, entries: kept, withheld, prefix: recorded };
    try {
      writeRunFile({ runDirAbs, table }, dest, { kind: 'json', value: snapshotDoc });
    } catch {
      throw new Halt('EVIDENCE_WRITE_FAILED', 'the snapshot could not be written');
    }
    process.stdout.write(`GROUNDED: ${fwd(relative(runDirAbs, dest))} entries=${kept.length} withheld=${withheld}\n`);
    return 0;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runGroundGuarded(argv) {
  try {
    return await runGround(argv);
  } catch (err) {
    if (err instanceof Halt) {
      process.stderr.write(`${err.message}\n`);
      return 1;
    }
    process.stderr.write('FAILED_RUNNER_ERROR: the runner stopped on an unexpected error\n');
    return 1;
  }
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
async function main(argv) {
  if (argv[0] === 'ground') return await runGroundGuarded(argv.slice(1));
  const args = parseArgs(argv);
  if (args === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  try {
    if (args.mode === 'parse') return runParse(args);
    if (args.mode === 'init') return await runInit(args);
    return await runRun(args);
  } catch (err) {
    if (err instanceof Halt) {
      process.stderr.write(`${err.message}\n`);
      return 1;
    }
    process.stderr.write('FAILED_RUNNER_ERROR: the runner stopped on an unexpected error\n');
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
