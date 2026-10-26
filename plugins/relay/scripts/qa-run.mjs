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
 *   node <plugin-root>/scripts/qa-run.mjs judge --run-dir <rel-dir> --case <n> --step <k> --verdict pass|fail|uncertain --evidence "<text>" [--root <dir>]
 *   node <plugin-root>/scripts/qa-run.mjs preflight --root <dir>
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
 *   judge  records one verdict of one pending judge step and recomputes results.json; it never calls a model.
 *   preflight  reads files and asks git, with no network request and no write, and reports whether Playwright resolves and from where, whether the Chromium build is installed, whether every kit login script is current and whether PRPs/auth/.sessions/ is ignored; exit 1 on any failure.
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

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync, readdirSync, realpathSync } from 'node:fs';
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

/** The one `judge` usage line, shared by USAGE and JUDGE_USAGE so the two cannot drift. */
const JUDGE_USAGE_LINE = '  qa-run.mjs judge --run-dir <rel-dir> --case <n> --step <k> --verdict <pass|fail|uncertain> --evidence "<what the capture shows>" [--root <dir>]';

/** The one `preflight` usage line, shared by USAGE and PREFLIGHT_USAGE so the two cannot drift. */
const PREFLIGHT_USAGE_LINE = '  qa-run.mjs preflight --root <dir>';

export const USAGE = `Usage:
  qa-run.mjs parse --report <path>
  qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
  qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
${GROUND_USAGE_LINE}
${JUDGE_USAGE_LINE}
${PREFLIGHT_USAGE_LINE}
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
 * @typedef {{ index: number, action: string, result: string, evidence: string | null, reason_code?: string | null, reason?: string, kind?: string, scope_evidence?: string | null, judged_by?: string, judgment_evidence?: string, cause?: string }} StepRecord
 * @typedef {{ outcome: string, reason_code: string | null, reason: string | null, evidence: string[], steps?: StepRecord[], pending_judgment?: number[], record_stale?: string[], cause?: string }} CaseResult
 * @typedef {{ root: string, runDirAbs: string, runDirRel: string, table: RedactionTable, target: NonNullable<Target>, playwright: any, loginConfig: any, sessions: Map<string, any>, seeds: Map<string, any>, seedConfig: any, anonChecks: Map<string, any> }} RunCtx
 * @typedef {{ path: string | null, token: string | null, header?: string | null, valuePrefix?: string | null }} SessionInfo
 */

/** @type {Record<string, (ctx: RunCtx, kase: ReportCase, plan: any, session: SessionInfo | null) => Promise<CaseResult>>} */
const DRIVERS = Object.create(null);

/** @param {string} code @param {string} reason @param {string[]} [evidence] @returns {CaseResult} */
const blocked = (code, reason, evidence = []) => ({ outcome: 'blocked', reason_code: code, reason, evidence });
/** @param {string} code @param {string} reason @returns {CaseResult} */
const needsHuman = (code, reason) => ({ outcome: 'needs-human', reason_code: code, reason, evidence: [] });

/** The closed list of causes a blocked action can carry. A cause is derived by pre-checks, never read from an error. */
export const STEP_FAILURE_CAUSES = Object.freeze(['covered', 'disabled', 'not_editable', 'absent', 'detached', 'other']);
/** The fixed phrase of each cause: letters and spaces only, so no page text or error can reach a reason. */
export const STEP_CAUSE_PHRASES = Object.freeze({
  covered: 'another element covered it at the action point',
  disabled: 'it was disabled',
  not_editable: 'it was not editable',
  absent: 'it was not found on the page',
  detached: 'it was detached from the page during the action',
  other: 'no closed cause applies',
});
/** @param {number} n @param {string} action @param {string} cause @returns {string} */
export function actionFailureReason(n, action, cause) {
  const a = action === 'click' || action === 'fill' ? action : 'step';
  const c = STEP_FAILURE_CAUSES.includes(cause) ? cause : 'other';
  return `step ${n}: the ${a} target could not be acted on: ${STEP_CAUSE_PHRASES[c]}`;
}
/** @param {number} n @returns {string} */
export function absentElementReason(n) {
  return `step ${n}: the element the report names was not found on the page after the wait`;
}
/**
 * Maps pre-check facts to the closed cause list. Pure; first match wins; an unknown fact (null) is `other`.
 * @param {{ action?: string, count?: number | null, attached?: boolean, enabled?: boolean | null, editable?: boolean | null, covered?: boolean | null }} facts
 * @returns {string}
 */
export function causeOf(facts) {
  const { action, count, attached, enabled, editable, covered } = facts;
  if (count === 0) return attached === true ? 'detached' : 'absent';
  if (typeof count === 'number' && count > 1) return 'other';
  if (enabled === false) return 'disabled';
  if (action === 'fill' && editable === false) return 'not_editable';
  if (action === 'click' && covered === true) return 'covered';
  return 'other';
}
/**
 * In-page hit-test at the center of an element. Self-contained: Playwright serializes it into the page.
 * @param {any} el
 * @returns {boolean | null}
 */
export function isCoveredAtActionPoint(el) {
  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', inline: 'center' });
  const r = el.getBoundingClientRect();
  if (!(r.width > 0) || !(r.height > 0)) return null;
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  if (hit === null || hit === undefined) return null;
  return !(hit === el || el.contains(hit));
}
/**
 * Gathers the pre-check facts of a failed click or fill and classifies them. Never calls an action and never
 * reads, stores or returns a thrown error.
 * @param {any} target @param {string} action @param {boolean} attached
 * @returns {Promise<string>}
 */
export async function probeActionFailure(target, action, attached) {
  const count = await Promise.resolve().then(() => target.count()).catch(() => 0);
  const enabled = await Promise.resolve().then(() => target.isEnabled({ timeout: 1000 })).catch(() => null);
  const editable = action === 'fill' ? await Promise.resolve().then(() => target.isEditable({ timeout: 1000 })).catch(() => null) : null;
  const covered = action === 'click' ? await Promise.resolve().then(() => target.evaluate(isCoveredAtActionPoint)).catch(() => null) : null;
  return causeOf({ action, count, attached, enabled, editable, covered });
}
/** @param {string} reason @param {string} [cause] @returns {CaseResult} */
export const notPerformable = (reason, cause = 'other') => ({ ...blocked('STEP_NOT_PERFORMABLE', reason), cause: STEP_FAILURE_CAUSES.includes(cause) ? cause : 'other' });
// These two run-time codes sit outside REASON_CATALOGUE: the command doc's code table (Phase 7) folds them in.
export const RUNTIME_REASON_CATALOGUE = Object.freeze({
  STEP_NOT_PERFORMABLE: Object.freeze({ disposition: 'blocked', class: 'gap', causes: STEP_FAILURE_CAUSES, reason: "a step's target could not be acted on; the cause is one word of the closed list" }),
  PLAN_ENTRY_INVALID: Object.freeze({ disposition: 'needs-human', class: 'plan-defect', decline: false, reason: 'the plan entry is malformed (a schema error); it is a defect of the plan, not a decline of the case' }),
});
/** @param {string} code @returns {string | null} */
export function runtimeReasonClassOf(code) {
  return Object.hasOwn(RUNTIME_REASON_CATALOGUE, code) ? RUNTIME_REASON_CATALOGUE[code].class : null;
}

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'];
const isStr = (/** @type {any} */ v) => typeof v === 'string';
const isObj = (/** @type {any} */ v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const HTTP_ACTIONS = ['request', 'query'];
const API_ORIGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const BROWSER_ACTIONS = ['goto', 'click', 'fill', 'expect_visible', 'expect_text', 'expect_url', 'query', 'expect_value', 'expect_not_visible', 'expect_state', 'expect_requests', 'judge'];
const API_HEADER_FORBIDDEN = ['host', 'content-length', 'cookie', 'transfer-encoding'];
const GAP_INTERACTION_ACTIONS = Object.freeze(['click', 'fill']);
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

/** The optional step keys that scope or reshape a locator; a step that carries any of them is a scoped locator step. */
export const SCOPED_LOCATOR_KEYS = Object.freeze(['within', 'name_prefix', 'label_text', 'index']);

/** The closed list of text patterns an `expect_text` step may declare instead of a literal. */
export const TEXT_PATTERN_NAMES = Object.freeze(['number']);

/**
 * Whether a text matches a named pattern. Pure and total: false for an unknown pattern or a non-string text.
 * @param {any} name
 * @param {any} text
 * @returns {boolean}
 */
export function textMatchesPattern(name, text) {
  if (typeof name !== 'string' || !TEXT_PATTERN_NAMES.includes(name) || typeof text !== 'string') return false;
  if (name === 'number') return /[0-9]+/.test(text);
  return false;
}

/** The kinds of judgment a `judge` step may ask for, the verdicts a judgment may record, and the limits of the texts (chosen, not measured). */
export const JUDGE_KINDS = Object.freeze(['visual', 'language', 'checklist']);
export const JUDGE_VERDICTS = Object.freeze(['pass', 'fail', 'uncertain']);
export const JUDGE_CRITERION_MAX = 500;
export const JUDGE_EVIDENCE_MIN = 10;
export const JUDGE_EVIDENCE_MAX = 2000;

/** The step result of a judged step that waits for a verdict, and the internal result of a case that holds one. Never an outcome. */
export const PENDING_JUDGMENT = 'pending-judgment';

/** The channels a `read_message` step may read, the source kind each channel accepts, and the limits of a read (chosen, not measured). */
export const READ_MESSAGE_CHANNELS = Object.freeze(['mail', 'sms']);
export const CHANNEL_SOURCE_KINDS = Object.freeze({ mail: 'mailpit', sms: 'file' });
export const READ_MESSAGE_WAIT_MS = 10000;
export const READ_MESSAGE_POLL_MS = 500;
export const MESSAGE_REGEX_MAX = 200;
export const MESSAGE_TEXT_MAX = 65536;
export const MESSAGE_VALUE_MAX = 200;
/** A recipient is one plain token: it is placed in a search query and in a line filter, never trusted as free text. */
const MESSAGE_TO_PATTERN = /^[^\s"'<>\\]{3,254}$/;

/**
 * Validates the `within` object of a step: a supported `role` and exactly one of `name` or `name_prefix`, both
 * non-empty strings. Pure and total: it never throws and a reason names keys, never a value.
 * With `opts.allowAnchor` the form `{ anchor_text }` (alone) is also valid and yields `{ anchorText }`.
 * @param {any} within
 * @param {{ allowAnchor?: boolean }} [opts]
 * @returns {{ ok: true, scope: { role: string, name?: string, namePrefix?: string, anchorText?: string } } | { ok: false, why: string }}
 */
export function scopeOf(within, opts = {}) {
  if (opts.allowAnchor === true && isObj(within) && within.anchor_text !== undefined) {
    if (Object.keys(within).length !== 1 || !isStr(within.anchor_text) || within.anchor_text.trim() === '') {
      return { ok: false, why: 'within takes anchor_text alone, or a role and a name or name_prefix' };
    }
    return { ok: true, scope: { anchorText: within.anchor_text } };
  }
  if (!isObj(within) || Object.keys(within).some((k) => !['role', 'name', 'name_prefix'].includes(k))) {
    return { ok: false, why: 'within takes only a role and a name or name_prefix' };
  }
  if (!isStr(within.role) || !LOCATOR_ROLES.includes(within.role)) return { ok: false, why: 'within role must be one of the supported roles' };
  if ((within.name === undefined) === (within.name_prefix === undefined)) return { ok: false, why: 'within takes exactly one of name or name_prefix' };
  const label = within.name !== undefined ? within.name : within.name_prefix;
  if (!isStr(label) || label.trim() === '') return { ok: false, why: 'within name must be a non-empty string' };
  return { ok: true, scope: within.name !== undefined ? { role: within.role, name: within.name } : { role: within.role, namePrefix: within.name_prefix } };
}

/**
 * The locator form of a step that carries `within`, `name_prefix`, `label_text` or `index`. Pure and total.
 * @param {any} step an object that carries at least one of SCOPED_LOCATOR_KEYS
 * @returns {{ ok: false, why: string } | { ok: true, form: 'scoped', scope: null | { role?: string, name?: string, namePrefix?: string, anchorText?: string }, target: { kind: 'role-any', role: string } | { kind: 'role', role: string, name: string } | { kind: 'role-prefix', role: string, namePrefix: string } | { kind: 'text', text: string } | { kind: 'label', labelText: string } | { kind: 'nth', role: string, index: number } }}
 */
function scopedLocatorOf(step) {
  /** @param {string} why @returns {{ ok: false, why: string }} */
  const bad = (why) => ({ ok: false, why });
  const named = (/** @type {any} */ v) => isStr(v) && v.trim() !== '';
  if (step.selector !== undefined) return bad('a step names one locator form: selector, role and name, or text');
  /** @type {null | { role?: string, name?: string, namePrefix?: string, anchorText?: string }} */ let scope = null;
  if (step.within !== undefined) {
    const s = scopeOf(step.within, { allowAnchor: true });
    if (!s.ok) return bad(s.why);
    scope = s.scope;
  }
  const hasRole = step.role !== undefined;
  const hasName = step.name !== undefined;
  const hasPrefix = step.name_prefix !== undefined;
  const hasText = step.text !== undefined;
  const hasLabel = step.label_text !== undefined;
  const hasIndex = step.index !== undefined;
  if (hasText) {
    if (scope !== null && scope.anchorText !== undefined) return bad('within anchor_text needs a role');
    if (hasRole || hasName || hasPrefix || hasLabel || hasIndex) return bad('a step names one locator form: role with name, name_prefix or index; text; or label_text');
    if (!named(step.text)) return bad('text must be a non-empty string');
    return { ok: true, form: 'scoped', scope, target: { kind: 'text', text: step.text } };
  }
  if (hasLabel) {
    if (scope !== null && scope.anchorText !== undefined) return bad('within anchor_text needs a role');
    if (hasRole || hasName || hasPrefix || hasIndex) return bad('label_text names the whole locator: it takes no role, name, name_prefix or index');
    if (!named(step.label_text)) return bad('label_text must be a non-empty string');
    return { ok: true, form: 'scoped', scope, target: { kind: 'label', labelText: step.label_text } };
  }
  if (!hasRole) return bad('a step with within, name_prefix or index needs a role, a text or a label_text');
  if (!isStr(step.role) || !LOCATOR_ROLES.includes(step.role)) return bad('role must be one of the supported roles');
  if (!hasName && !hasPrefix && !hasIndex && scope !== null) {
    if (scope.anchorText !== undefined) return bad('a role without a name needs a role and name scope, not anchor_text');
    return { ok: true, form: 'scoped', scope, target: { kind: 'role-any', role: step.role } };
  }
  if ([hasName, hasPrefix, hasIndex].filter(Boolean).length !== 1) return bad('role takes exactly one of name, name_prefix or index');
  if (hasName) {
    if (!named(step.name)) return bad('name must be a non-empty string');
    return { ok: true, form: 'scoped', scope, target: { kind: 'role', role: step.role, name: step.name } };
  }
  if (hasPrefix) {
    if (!named(step.name_prefix)) return bad('name_prefix must be a non-empty string');
    return { ok: true, form: 'scoped', scope, target: { kind: 'role-prefix', role: step.role, namePrefix: step.name_prefix } };
  }
  if (scope === null) return bad('index needs a within scope');
  if (!Number.isSafeInteger(step.index) || step.index < 0) return bad('index must be a non-negative integer');
  return { ok: true, form: 'scoped', scope, target: { kind: 'nth', role: step.role, index: step.index } };
}

/**
 * Whether a locator descriptor names a control whose value or state can be read: the role form, or a scoped form
 * that is not a bare text. Pure.
 * @param {any} loc
 * @returns {boolean}
 */
export function isControlLocator(loc) {
  return isObj(loc) && loc.ok === true && (loc.form === 'role' || (loc.form === 'scoped' && loc.target.kind !== 'text'));
}

/**
 * The strict locator form of a browser step: role plus name, or visible text, or (when the step carries one of
 * SCOPED_LOCATOR_KEYS) the scoped form. Pure, no I/O.
 * Returns null when the step carries none of the keys role, name, text.
 * @param {any} step
 * @returns {null | { ok: false, why: string } | { ok: true, form: 'role', role: string, name: string } | { ok: true, form: 'text', text: string } | ReturnType<typeof scopedLocatorOf>}
 */
export function locatorOf(step) {
  if (!isObj(step)) return null;
  if (SCOPED_LOCATOR_KEYS.some((k) => step[k] !== undefined)) return scopedLocatorOf(step);
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
 * Whether an `expect_requests` method is one of the six method names or a non-empty array of distinct ones. Pure and
 * total: every member is tested by type before anything is compared, so a hostile value (an object with a
 * `toString` key, a nested array, an array-like) is refused and never coerced.
 * @param {any} method
 * @returns {boolean}
 */
function validRequestMethods(method) {
  const one = (/** @type {any} */ m) => typeof m === 'string' && HTTP_METHODS.includes(m);
  if (Array.isArray(method)) return method.length >= 1 && method.length <= HTTP_METHODS.length && method.every(one) && new Set(method).size === method.length;
  return one(method);
}

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
  // `effect` declares a step that changes state. "write" can be carried by a click, a fill or an http request;
  // "validation" (a form submit with the report's own invalid literal) by a click only. A reason names the key, never a value.
  if (s.effect !== undefined) {
    if (s.effect !== 'write' && s.effect !== 'validation') return bad('effect must be "write" or "validation" when present');
    if (s.effect === 'validation') {
      if (s.action !== 'click') return bad('effect "validation" applies only to click steps');
    } else if (s.action !== 'click' && s.action !== 'fill' && s.action !== 'request') {
      return bad('effect applies only to click, fill and request steps');
    }
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
    if (s.pattern !== undefined) {
      if (s.action !== 'expect_text') return bad('pattern is only for expect_text');
      if (s.contains !== undefined) return bad('expect_text takes contains or pattern, not both');
      if (!isStr(s.pattern) || !TEXT_PATTERN_NAMES.includes(s.pattern)) return bad('pattern must be one of the supported patterns');
      if (loc === null) return bad('pattern needs a role and name, or a text, locator');
    }
    if (loc !== null) {
      if (!loc.ok) return bad(`${s.action}: ${loc.why}`);
      if (loc.form === 'scoped' && loc.target.kind === 'label' && (s.action === 'expect_text' || s.action === 'expect_not_visible')) return bad(`${s.action} does not take label_text: it names an input`);
      if (loc.form === 'scoped' && loc.target.kind === 'role-any' && s.action !== 'expect_visible') return bad(`${s.action} does not take a role without a name; only expect_visible does`);
      if (loc.form === 'scoped' && loc.scope !== null && loc.scope.anchorText !== undefined && (s.action === 'fill' || s.action === 'expect_value')) return bad(`${s.action} does not take anchor_text`);
      if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');
      if (s.action === 'expect_text' && s.pattern === undefined && !isStr(s.contains)) return bad('expect_text needs a string contains or a pattern');
      if (s.action === 'expect_value') {
        if (!isControlLocator(loc)) return bad('expect_value needs a role and a name');
        const comparisons = [s.equals, s.contains, s.not_empty].filter((v) => v !== undefined).length;
        if (comparisons !== 1) return bad('expect_value needs exactly one of equals, contains or not_empty');
        if (s.equals !== undefined && !isStr(s.equals)) return bad('expect_value equals must be a string');
        if (s.contains !== undefined && !(isStr(s.contains) && s.contains !== '')) return bad('expect_value contains must be a non-empty string');
        if (s.not_empty !== undefined && s.not_empty !== true) return bad('expect_value not_empty must be true');
      }
      if (s.action === 'expect_state') {
        if (!isControlLocator(loc)) return bad('expect_state needs a role and a name');
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
        if (!validRequestMethods(s.method)) return bad('expect_requests method must be one of GET, HEAD, POST, PUT, PATCH, DELETE, or a non-empty array of distinct ones');
        if (!isStr(s.url_contains) || s.url_contains.length > 200 || !/^\/(?!\/)[^\s?#]*$/.test(s.url_contains)) {
          return bad('expect_requests url_contains must be a path that starts with a single / and carries no query string, fragment or whitespace, of at most 200 characters');
        }
        if (!Number.isInteger(s.count) || s.count < 0 || s.count > EXPECT_REQUESTS_COUNT_MAX) {
          return bad(`expect_requests count must be an integer from 0 to ${EXPECT_REQUESTS_COUNT_MAX}`);
        }
        expectations++;
        break;
      }
      case 'judge': {
        // A judged step asserts nothing itself: it hands a capture to a recorded verdict, and that verdict is the expectation.
        if (Object.keys(s).some((k) => !['action', 'kind', 'criterion', 'within'].includes(k))) {
          return bad('judge takes only kind, criterion and within');
        }
        if (!isStr(s.kind) || !JUDGE_KINDS.includes(s.kind)) return bad('judge kind must be visual, language or checklist');
        if (!isStr(s.criterion) || s.criterion.trim() === '' || s.criterion.length > JUDGE_CRITERION_MAX) {
          return bad(`judge criterion must be a non-empty string of at most ${JUDGE_CRITERION_MAX} characters`);
        }
        if (s.within !== undefined) {
          const scope = scopeOf(s.within);
          if (!scope.ok) return bad(`judge: ${scope.why}`);
        }
        expectations++;
        break;
      }
      case 'read_message': {
        // A read step asserts nothing: it binds a value read from a declared local source to a variable of the case.
        if (Object.keys(s).some((k) => !['action', 'channel', 'to', 'extract'].includes(k))) {
          return bad('read_message takes only channel, to and extract');
        }
        if (!isStr(s.channel) || !READ_MESSAGE_CHANNELS.includes(s.channel)) return bad('read_message channel must be mail or sms');
        if (!isStr(s.to) || !MESSAGE_TO_PATTERN.test(s.to)) {
          return bad('read_message to must be 3 to 254 characters with no whitespace, quote, angle bracket or backslash');
        }
        if (!isObj(s.extract) || Object.keys(s.extract).some((k) => !['regex', 'as'].includes(k))) {
          return bad('read_message extract takes only regex and as');
        }
        if (!isStr(s.extract.regex) || s.extract.regex === '' || s.extract.regex.length > MESSAGE_REGEX_MAX) {
          return bad(`read_message extract.regex must be a non-empty string of at most ${MESSAGE_REGEX_MAX} characters`);
        }
        if (!isStr(s.extract.as) || !CAPTURE_NAME_PATTERN.test(s.extract.as)) return bad('read_message extract.as must be a variable name');
        let groups = 0;
        try {
          groups = (new RegExp(`${s.extract.regex}|`).exec('') ?? []).length - 1;
        } catch {
          return bad('read_message extract.regex is not a valid regular expression');
        }
        if (groups < 1) return bad('read_message extract.regex needs a capturing group');
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
 * The zero-based index of the first step marked `"effect": "write"`, or -1. Pure and total.
 * @param {any} steps
 * @returns {number}
 */
export function firstWriteStep(steps) {
  return Array.isArray(steps) ? steps.findIndex((s) => isObj(s) && s.effect === 'write') : -1;
}

export const STEP_EFFECTS = Object.freeze(['write', 'validation']);

/**
 * The zero-based index of the first step carrying any legal `effect`, or -1. Pure and total.
 * @param {any} steps
 * @returns {number}
 */
export function firstEffectStep(steps) {
  return Array.isArray(steps) ? steps.findIndex((s) => isObj(s) && STEP_EFFECTS.includes(s.effect)) : -1;
}

/**
 * Whether the kit declares the role dedicated: its entry in the parsed `login.config.json` carries `dedicated`
 * set to the boolean `true`. Any other value, a missing role, a null role and a missing or malformed config are
 * not dedicated. Pure and total; it reads a parsed object and touches no file.
 * @param {any} loginConfig
 * @param {any} role
 * @returns {boolean}
 */
export function isDedicatedRole(loginConfig, role) {
  if (!isObj(loginConfig) || !isObj(loginConfig.roles) || !isStr(role) || !Object.hasOwn(loginConfig.roles, role)) return false;
  const entry = loginConfig.roles[role];
  return isObj(entry) && entry.dedicated === true;
}

/** The sources a chosen input may name, and the limits of the `chosen_inputs` array (chosen, not measured). */
export const CHOSEN_INPUT_SOURCES = Object.freeze(['capture', 'snapshot']);
export const CHOSEN_INPUTS_MAX = 20;
const CHOSEN_REASON_MAX = 200;
const CHOSEN_LITERAL_MIN = 3;

/**
 * Validates the optional `chosen_inputs` key of a plan entry: an array of items `{ step, source, reason }`, each
 * naming a distinct `fill` step with a string value. A `capture` item needs a value that is a `{{name}}` binding
 * (validateSteps already refuses an unbound name); a `snapshot` item needs a literal value. Pure and total; a
 * reason names the key and an item position, never a value.
 * @param {string} driver
 * @param {any[]} steps
 * @param {any} chosen the entry's `chosen_inputs`, undefined when absent
 * @returns {{ code: string, reason: string } | null}
 */
export function validateChosenInputs(driver, steps, chosen) {
  if (chosen === undefined) return null;
  const bad = (/** @type {string} */ why) => ({ code: 'PLAN_ENTRY_INVALID', reason: `chosen_inputs: ${why}` });
  if (driver !== 'browser') return bad('applies to browser entries only');
  if (!Array.isArray(chosen) || chosen.length === 0 || chosen.length > CHOSEN_INPUTS_MAX) {
    return bad(`must be a non-empty array of at most ${CHOSEN_INPUTS_MAX} items`);
  }
  if (!Array.isArray(steps)) return bad('needs the steps of the entry');
  /** @type {Set<number>} */ const seen = new Set();
  for (const [k, item] of chosen.entries()) {
    const at = `item ${k + 1}`;
    if (!isObj(item) || Object.keys(item).some((key) => !['step', 'source', 'reason'].includes(key))) return bad(`${at} takes only step, source and reason`);
    if (!Number.isInteger(item.step) || item.step < 1 || item.step > steps.length) return bad(`${at} step must be the 1-based position of a step of this entry`);
    if (seen.has(item.step)) return bad(`${at} repeats the step of an earlier item`);
    seen.add(item.step);
    const target = steps[item.step - 1];
    if (!isObj(target) || target.action !== 'fill' || !isStr(target.value)) return bad(`${at} must name a fill step with a string value`);
    if (!isStr(item.source) || !CHOSEN_INPUT_SOURCES.includes(item.source)) return bad(`${at} source must be capture or snapshot`);
    if (!isStr(item.reason) || item.reason.trim() === '' || item.reason.length > CHOSEN_REASON_MAX) {
      return bad(`${at} reason must be a non-empty string of at most ${CHOSEN_REASON_MAX} characters`);
    }
    const bound = [...target.value.matchAll(VARIABLE_PATTERN)].length > 0;
    if (item.source === 'capture' && !bound) return bad(`${at} source capture needs a value that is a {{name}} binding`);
    if (item.source === 'snapshot' && bound) return bad(`${at} source snapshot needs a literal value, not a {{name}} binding`);
  }
  return null;
}

/**
 * The literal values of the chosen `fill` steps, with the zero-based index of each step. A step that is not a
 * fill, or whose value is a `{{name}}` binding, is skipped. Pure and total.
 * @param {any} steps
 * @param {any} chosen
 * @returns {{ at: number, value: string }[]}
 */
export function chosenFillValues(steps, chosen) {
  /** @type {{ at: number, value: string }[]} */ const out = [];
  if (!Array.isArray(steps) || !Array.isArray(chosen)) return out;
  for (const item of chosen) {
    if (!isObj(item) || !Number.isInteger(item.step)) continue;
    const s = steps[item.step - 1];
    if (!isObj(s) || s.action !== 'fill' || !isStr(s.value) || [...s.value.matchAll(VARIABLE_PATTERN)].length > 0) continue;
    out.push({ at: item.step - 1, value: s.value });
  }
  return out;
}

/**
 * Requires every `snapshot`-sourced chosen value to appear (whitespace collapsed, case ignored, at least 3
 * characters) inside the `name` or `text` of an entry of some grounding snapshot of the run directory. Returns
 * the first refusal or null. The reason names an item position and never the value. Pure and total.
 * @param {any} steps
 * @param {any} chosen
 * @param {any} snapshots the objects `loadGroundingSnapshots` returns
 * @returns {{ code: string, reason: string } | null}
 */
export function chosenSnapshotRefusal(steps, chosen, snapshots) {
  if (!Array.isArray(chosen) || !Array.isArray(steps)) return null;
  const flat = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  /** @type {string[]} */ const words = [];
  for (const snap of Array.isArray(snapshots) ? snapshots : []) {
    if (!isObj(snap) || !Array.isArray(snap.entries)) continue;
    for (const e of snap.entries) {
      if (!isObj(e)) continue;
      const w = e.kind === 'role' ? e.name : e.kind === 'text' ? e.text : null;
      if (isStr(w)) words.push(flat(w));
    }
  }
  for (const [k, item] of chosen.entries()) {
    if (!isObj(item) || item.source !== 'snapshot') continue;
    const s = Number.isInteger(item.step) ? steps[item.step - 1] : undefined;
    const literal = isObj(s) && isStr(s.value) ? flat(s.value) : '';
    if (literal.length < CHOSEN_LITERAL_MIN || !words.some((w) => w.includes(literal))) {
      return {
        code: 'PLAN_ENTRY_INVALID',
        reason: `chosen_inputs: item ${k + 1} chose a value that appears in no grounding snapshot of the run directory; ground the page that shows it first, or bind the input to a declared capture`,
      };
    }
  }
  return null;
}

/**
 * Requires the `criterion` of every `judge` step to appear in the case's manual steps once whitespace is collapsed
 * (case is kept: the words are the report's own, verbatim). A criterion the report does not state is refused, so a
 * planner can never invent what is judged. Pure and total; the reason names a step position and never the criterion.
 * @param {any} steps
 * @param {any} manualText the case's manual steps as the report states them
 * @returns {{ code: string, reason: string } | null}
 */
export function validateJudgeCriteria(steps, manualText) {
  if (!Array.isArray(steps)) return null;
  const flat = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim();
  const report = isStr(manualText) ? flat(manualText) : null;
  for (const [i, s] of steps.entries()) {
    if (!isObj(s) || s.action !== 'judge') continue;
    const criterion = isStr(s.criterion) ? flat(s.criterion) : '';
    if (report === null || criterion === '' || !report.includes(criterion)) {
      return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: the judge criterion must appear verbatim in the case's manual steps` };
    }
  }
  return null;
}

/**
 * A validation submit (a click with `effect: "validation"`) needs an earlier fill of the same case whose value is
 * the report's own literal: no binding, at least CHOSEN_LITERAL_MIN characters, and verbatim in the case's manual
 * steps once whitespace is collapsed and case is folded. Returns the first refusal or null. Pure and total; a
 * reason names a step position, never a value.
 * @param {any} steps
 * @param {any} manualText
 * @returns {{ code: string, reason: string } | null}
 */
export function validateValidationSubmits(steps, manualText) {
  if (!Array.isArray(steps)) return null;
  const flat = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  const report = isStr(manualText) ? flat(manualText) : null;
  for (const [k, s] of steps.entries()) {
    if (!isObj(s) || s.action !== 'click' || s.effect !== 'validation') continue;
    const qualifies =
      report !== null &&
      steps.slice(0, k).some((f) => {
        if (!isObj(f) || f.action !== 'fill' || !isStr(f.value)) return false;
        if (f.value.match(VARIABLE_PATTERN) !== null) return false;
        const literal = flat(f.value);
        return literal.length >= CHOSEN_LITERAL_MIN && report.includes(literal);
      });
    if (!qualifies) {
      return { code: 'PLAN_ENTRY_INVALID', reason: `step ${k + 1}: a validation submit needs an earlier fill step in the same case whose value appears verbatim in the case's manual steps` };
    }
  }
  return null;
}

/**
 * Reads one channel's declaration from the `channel_sources` map of the seed file. Pure and total: no file or network access;
 * a reason is a fixed sentence and never echoes a declared url, path or key.
 * @param {any} sources the `channel_sources` value of the seed file (anything)
 * @param {any} channel
 * @param {string} root the target root
 * @returns {{ ok: true, channel: string, kind: 'mailpit', url: string } | { ok: true, channel: string, kind: 'file', abs: string } | { ok: false, code: string, reason: string }}
 */
export function classifyChannelSource(sources, channel, root) {
  const invalid = (/** @type {string} */ reason) => ({ ok: /** @type {const} */ (false), code: 'CHANNEL_SOURCE_INVALID', reason });
  if (!isStr(channel) || !READ_MESSAGE_CHANNELS.includes(channel)) return invalid('the channel must be mail or sms');
  if (!isObj(sources) || !Object.hasOwn(sources, channel)) {
    return { ok: false, code: 'EXTERNAL_CHANNEL', reason: REASON_CATALOGUE.EXTERNAL_CHANNEL.reason };
  }
  const entry = sources[channel];
  if (!isObj(entry) || Object.keys(entry).some((k) => !['kind', 'url', 'path'].includes(k))) {
    return invalid(`the ${channel} channel source must be an object with kind and ${channel === 'mail' ? 'url' : 'path'} only`);
  }
  const kind = /** @type {Record<string, string>} */ (CHANNEL_SOURCE_KINDS)[channel];
  if (entry.kind !== kind) return invalid(`the ${channel} channel source kind must be ${kind}`);
  if (channel === 'mail') {
    if (!isStr(entry.url) || Object.hasOwn(entry, 'path')) return invalid('the mail channel source needs a url');
    let u;
    try {
      u = new URL(entry.url);
    } catch {
      return invalid('the mail channel source url is not a valid url');
    }
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.username !== '' || u.password !== '') {
      return invalid('the mail channel source url must be http or https with no credentials');
    }
    return { ok: true, channel, kind: 'mailpit', url: u.origin + u.pathname.replace(/\/+$/, '') };
  }
  if (!isStr(entry.path) || entry.path === '' || isAbsolute(entry.path) || Object.hasOwn(entry, 'url')) {
    return invalid('the sms channel source needs a relative path');
  }
  const abs = resolve(root, entry.path);
  const rel = relative(resolve(root), abs);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return invalid('the sms path resolves outside the target root');
  return { ok: true, channel, kind: 'file', abs };
}

/** The most overlay handlers a seed file may declare. */
export const OVERLAY_HANDLERS_MAX = 10;
/** The shape of an overlay handler id. */
export const OVERLAY_HANDLER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
/** The fixed sentence recorded for a write-effect handler that is not registered. */
export const OVERLAY_WRITE_SKIP_REASON = 'a write-effect handler is not registered: the role is not declared dedicated';

/**
 * Reads the `overlay_handlers` declaration of the seed file. Pure and total: no file or network access; a reason is a
 * fixed sentence naming an entry position or a key, and never echoes a declared id, locator word or value. A locator is
 * the plain role-and-name or text form only. A write-effect handler is registered only when the role is dedicated.
 * @param {any} declared the `overlay_handlers` value of the seed file (anything)
 * @param {any} dedicated whether the case's role is declared dedicated (only the boolean true counts)
 * @returns {{ ok: true, handlers: { id: string, trigger: any, dismiss: any, effect: 'write' | null }[], skipped: { id: string, reason: string }[] } | { ok: false, code: 'OVERLAY_HANDLER_INVALID', reason: string }}
 */
export function classifyOverlayHandlers(declared, dedicated) {
  const invalid = (/** @type {string} */ reason) => ({ ok: /** @type {const} */ (false), code: /** @type {const} */ ('OVERLAY_HANDLER_INVALID'), reason });
  if (declared === undefined) return { ok: true, handlers: [], skipped: [] };
  if (!Array.isArray(declared)) return invalid('overlay_handlers must be an array');
  if (declared.length > OVERLAY_HANDLERS_MAX) return invalid(`overlay_handlers allows at most ${OVERLAY_HANDLERS_MAX} entries`);
  /** @param {any} loc */
  const plainLocator = (loc) => {
    if (!isObj(loc)) return null;
    const keys = Object.keys(loc).sort().join(',');
    if (keys !== 'name,role' && keys !== 'text') return null;
    const found = locatorOf(loc);
    if (found === null || !found.ok) return null;
    if (found.form === 'role') return { role: found.role, name: found.name };
    if (found.form === 'text') return { text: found.text };
    return null;
  };
  /** @type {{ id: string, trigger: any, dismiss: any, effect: 'write' | null }[]} */ const handlers = [];
  /** @type {{ id: string, reason: string }[]} */ const skipped = [];
  /** @type {Set<string>} */ const seen = new Set();
  for (const [i, entry] of declared.entries()) {
    const at = (/** @type {string} */ why) => invalid(`overlay_handlers entry ${i + 1}: ${why}`);
    if (!isObj(entry) || Object.keys(entry).some((k) => !['id', 'trigger', 'dismiss', 'effect'].includes(k))
      || !Object.hasOwn(entry, 'id') || !Object.hasOwn(entry, 'trigger') || !Object.hasOwn(entry, 'dismiss')) {
      return at('must be an object with id, trigger, dismiss and optionally effect');
    }
    if (!isStr(entry.id) || !OVERLAY_HANDLER_ID.test(entry.id)) {
      return at('id must be 1 to 40 letters, digits, hyphens or underscores, starting with a letter or digit');
    }
    if (seen.has(entry.id)) return at('id repeats an earlier entry');
    seen.add(entry.id);
    const trigger = plainLocator(entry.trigger);
    if (trigger === null) return at('trigger must name an element by role and name, or by text, and nothing else');
    const dismiss = plainLocator(entry.dismiss);
    if (dismiss === null) return at('dismiss must name an element by role and name, or by text, and nothing else');
    if (Object.hasOwn(entry, 'effect') && entry.effect !== 'write') return at('effect must be "write" when present');
    const effect = entry.effect === 'write' ? /** @type {const} */ ('write') : null;
    if (effect === 'write' && dedicated !== true) {
      skipped.push({ id: entry.id, reason: OVERLAY_WRITE_SKIP_REASON });
      continue;
    }
    handlers.push({ id: entry.id, trigger, dismiss, effect });
  }
  return { ok: true, handlers, skipped };
}

/** The bound of one overlay dismissal click, in milliseconds. Chosen, not measured; the dogfood recalibrates it. */
export const OVERLAY_DISMISS_TIMEOUT_MS = 3000;
/** How many times one overlay handler may run on a page. Chosen, not measured. */
export const OVERLAY_HANDLER_TIMES = 25;

/**
 * Whether a url is one a dismissal may leave the page on: the exemptions of the context route, or the approved
 * origin on an allowed host. Pure and total.
 * @param {any} rawUrl
 * @param {any} target
 * @returns {boolean}
 */
export function overlayUrlApproved(rawUrl, target) {
  if (!isStr(rawUrl)) return false;
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (['data:', 'about:', 'blob:'].includes(u.protocol)) return true;
  return u.origin === target.origin && target.guard.isAllowedHost(u.hostname, target.allowedHosts) === true;
}

/**
 * The overlay evidence of one case, built key by key: handler ids, step positions and closed result words only.
 * @param {any} registeredIds
 * @param {any} skipped
 * @param {any} firings
 * @returns {{ action: 'overlay_handlers', registered: string[], skipped: { handler: string, reason: string }[], firings: { handler: string, step: number, result: string }[] }}
 */
export function summarizeOverlayWatch(registeredIds, skipped, firings) {
  const list = (/** @type {any} */ v) => (Array.isArray(v) ? v : []);
  return {
    action: 'overlay_handlers',
    registered: list(registeredIds).map((/** @type {any} */ id) => id),
    skipped: list(skipped).map((/** @type {any} */ s) => ({ handler: s.handler ?? s.id, reason: s.reason })),
    firings: list(firings).map((/** @type {any} */ f) => ({ handler: f.handler, step: f.step, result: f.result })),
  };
}

/**
 * Registers the declared overlay handlers once on a page. A handler runs only before an action that does an
 * actionability check (a click or a fill), never on a goto or on the runner's own waits, and its runtime counts against
 * that action's timeout. Returns null when the installed Playwright cannot register a handler. The unit reads no page
 * text, locator word or error text and adds no launch, route or request.
 * @param {any} page
 * @param {{ id: string, trigger: any, dismiss: any }[]} handlers
 * @param {any} target
 * @returns {Promise<null | { setStep: (n: number) => void, firings: () => { handler: string, step: number, result: string }[], offOriginAt: () => number | null, registered: string[] }>}
 */
export async function registerOverlayHandlers(page, handlers, target) {
  if (typeof page.addLocatorHandler !== 'function') return null;
  let current = 0;
  let inHandler = false;
  /** @type {number | null} */ let offOrigin = null;
  /** @type {{ handler: string, step: number, result: string }[]} */ const fired = [];
  const build = (/** @type {any} */ loc) => (loc.role !== undefined ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true }));
  for (const h of handlers) {
    const dismiss = build(h.dismiss);
    const run = async () => {
      const stepNow = current;
      inHandler = true;
      try {
        let result = 'dismissed';
        try {
          await dismiss.click({ timeout: OVERLAY_DISMISS_TIMEOUT_MS });
        } catch {
          result = 'dismiss_failed';
        }
        fired.push({ handler: h.id, step: stepNow, result });
        if (!overlayUrlApproved(page.url(), target) && offOrigin === null) offOrigin = stepNow;
      } finally {
        inHandler = false;
      }
    };
    await page.addLocatorHandler(build(h.trigger), run, { times: OVERLAY_HANDLER_TIMES });
  }
  page.on('request', (/** @type {any} */ req) => {
    if (!inHandler) return;
    try {
      if (req.isNavigationRequest() && req.frame() === page.mainFrame() && !overlayUrlApproved(req.url(), target) && offOrigin === null) offOrigin = current;
    } catch {
      // a request that cannot be classified is left to the context route
    }
  });
  return {
    setStep: (n) => { current = n; },
    firings: () => fired.map((f) => ({ handler: f.handler, step: f.step, result: f.result })),
    offOriginAt: () => offOrigin,
    registered: handlers.map((h) => h.id),
  };
}

/**
 * The newest message of a Mailpit search listing that was received at or after the start of the case. Pure and total.
 * @param {any} listing the parsed search response
 * @param {number} startedMs
 * @returns {{ id: string, createdMs: number } | null}
 */
export function newestMailAfter(listing, startedMs) {
  if (!isObj(listing) || !Array.isArray(listing.messages)) return null;
  /** @type {{ id: string, createdMs: number } | null} */ let best = null;
  for (const m of listing.messages) {
    if (!isObj(m) || !isStr(m.ID) || !/^[A-Za-z0-9_-]{1,64}$/.test(m.ID) || !isStr(m.Created)) continue;
    const createdMs = Date.parse(m.Created);
    if (!Number.isFinite(createdMs) || createdMs < startedMs) continue;
    if (best === null || createdMs > best.createdMs) best = { id: m.ID, createdMs };
  }
  return best;
}

/**
 * The last non-blank line of an sms text that holds the recipient. Pure and total.
 * @param {any} text
 * @param {any} to
 * @returns {string | null}
 */
export function smsEntryAfter(text, to) {
  if (!isStr(text) || !isStr(to) || to === '') return null;
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].includes(to)) return lines[i];
  return null;
}

/**
 * Runs the planner's expression on a message text and returns its first group. Pure and total; a reason is a fixed
 * sentence and never contains the text, the expression or the group.
 * @param {any} text
 * @param {any} regex
 * @returns {{ ok: true, value: string } | { ok: false, reason: string }}
 */
export function extractMessageValue(text, regex) {
  if (!isStr(text) || !isStr(regex)) return { ok: false, reason: 'the message or the expression is not text' };
  let match;
  try {
    match = new RegExp(regex).exec(text.slice(0, MESSAGE_TEXT_MAX));
  } catch {
    return { ok: false, reason: 'the expression is not a valid regular expression' };
  }
  if (match === null) return { ok: false, reason: 'the expression matched nothing' };
  const value = match[1];
  if (!isStr(value) || value === '' || value.length > MESSAGE_VALUE_MAX) return { ok: false, reason: 'the first group is missing, empty or too long' };
  return { ok: true, value };
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
  /** @type {Set<string>} */ const messageBound = new Set();
  for (const [i, s] of steps.entries()) {
    const r = stepRules(driver, s);
    if ('why' in r) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${r.why}` };
    expectations += r.expectations;
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name) && !messageBound.has(name)) {
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
      if (s.action === 'read_message') {
        if (!interacted) {
          return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: read_message needs an earlier goto, click or fill step in the same case` };
        }
        if (boundNames.includes(s.extract.as) || messageBound.has(s.extract.as)) {
          return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: read_message extract.as names a variable that is already bound in this case` };
        }
        messageBound.add(s.extract.as);
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

/** The fixed sentence of a step that could not be grounded and so was not run. Never a locator, a value or page text. */
export const STEP_GAP_REASON = 'the step could not be grounded to exactly one element, so it was not run; a person owes it';
/** The fixed sentence of a step that follows an ungrounded interaction and so was not run. */
export const STEP_TRUNCATED_REASON = 'not run after an ungrounded interaction; a person owes it';
/** The fixed sentence of a step stopped because an assertion failed before it. Never step data. */
export const STEP_NOT_RUN_AFTER_FAILURE_REASON = 'not run after a failed assertion; an interaction after a failure would act on a page in an unknown state';
/** The actions that keep running after a failed assertion: assertions only, never an interaction. */
export const ASSERTION_CONTINUES_ACTIONS = Object.freeze(['expect_visible', 'expect_text', 'expect_url', 'expect_value', 'expect_not_visible', 'expect_state', 'expect_requests', 'query', 'judge']);

/**
 * Whether a step still runs after an assertion has failed. Pure; an interaction, an unknown action
 * and any step carrying an effect stop the case.
 * @param {any} step @returns {boolean}
 */
export function continuesAfterFailure(step) {
  return isObj(step) && ASSERTION_CONTINUES_ACTIONS.includes(step.action) && step.effect === undefined;
}

/**
 * Marks every passed record whose index is in `failedIdx` as failed. Pure; returns the same array when nothing applies.
 * @param {StepRecord[]} records @param {number[]} failedIdx @returns {StepRecord[]}
 */
export function markFailedSteps(records, failedIdx) {
  const at = new Set(failedIdx.filter((j) => Number.isInteger(j) && j >= 0 && j < records.length && records[j].result === 'passed'));
  if (at.size === 0) return records;
  return records.map((rec, j) => (at.has(j) ? { ...rec, result: 'failed' } : rec));
}

/**
 * Writes the fixed stop sentence on every not-run record from `stoppedAt` on. Pure; returns the same array when nothing applies.
 * @param {StepRecord[]} records @param {number | null} stoppedAt @returns {StepRecord[]}
 */
export function overlayStoppedRecords(records, stoppedAt) {
  if (!Number.isInteger(stoppedAt) || /** @type {number} */ (stoppedAt) < 0) return records;
  return records.map((rec, j) => (j >= /** @type {number} */ (stoppedAt) && rec.result === 'not-run' ? { ...rec, reason_code: null, reason: STEP_NOT_RUN_AFTER_FAILURE_REASON } : rec));
}

/**
 * Attaches a closed-list cause to the failed step record. Pure; returns the same array when nothing applies.
 * @param {StepRecord[]} records @param {number} failedAt @param {string} cause @returns {StepRecord[]}
 */
export function attachStepCause(records, failedAt, cause) {
  if (!STEP_FAILURE_CAUSES.includes(cause) || !Number.isInteger(failedAt) || failedAt < 0 || failedAt >= records.length) return records;
  return records.map((rec, j) => (j === failedAt ? { ...rec, cause } : rec));
}

/**
 * Rewrites the per-step records of a case that has step gaps: each gap step becomes `human` with `STEP_UNGROUNDED`,
 * and each step after a truncating interaction gap becomes `human` with the truncation sentence. Pure; a record
 * that is not touched is returned unchanged.
 * @param {StepRecord[]} records
 * @param {{ at: number, kind: string }[]} gaps
 * @param {number | null} truncateAt
 * @returns {StepRecord[]}
 */
export function overlayGapRecords(records, gaps, truncateAt) {
  const gapAt = new Set(gaps.map((g) => g.at));
  return records.map((rec, j) => {
    if (gapAt.has(j)) return { ...rec, result: 'human', evidence: null, reason_code: 'STEP_UNGROUNDED', reason: STEP_GAP_REASON };
    if (truncateAt !== null && j > truncateAt) return { ...rec, result: 'human', evidence: null, reason_code: null, reason: STEP_TRUNCATED_REASON };
    return rec;
  });
}

/**
 * The case verdict once step gaps are known: a verdict that already ended the case (a failed or blocked step) is
 * kept; otherwise a case with gaps is needs-human STEP_UNGROUNDED, and a case with none has no verdict yet.
 * @param {CaseResult | null} verdict
 * @param {{ at: number, kind: string }[]} gaps
 * @returns {CaseResult | null}
 */
export function gapVerdict(verdict, gaps) {
  if (verdict !== null) return verdict;
  if (gaps.length === 0) return null;
  return needsHuman('STEP_UNGROUNDED', REASON_CATALOGUE.STEP_UNGROUNDED.reason);
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
 * Whether the located element is visible to a person. Playwright counts an element at `opacity: 0` as
 * visible, so its own check is joined (AND) with the browser's `checkVisibility`, read with its opacity and
 * visibility options on the same element: an element at `opacity: 0`, under an ancestor at `opacity: 0`, or
 * at `visibility: hidden` is not visible. A locator that matches nothing is not visible. A browser that
 * cannot answer throws, which `settleAssertion` reads as unreadable and never as a pass.
 * @param {any} target a Playwright locator that matches at most one element
 * @returns {Promise<boolean>}
 */
export async function isVisibleToPerson(target) {
  if (!(await target.isVisible())) return false;
  return target.evaluate(
    (/** @type {any} */ el) => {
      if (typeof el.checkVisibility !== 'function') throw new Error('checkVisibility is unavailable');
      return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) === true;
    },
    undefined,
    { timeout: 1000 },
  );
}

/**
 * The positive half of the visibility rule for one step: null when the located element is visible to a
 * person within the settle window (so a fade-in has time to finish), else the case verdict. The reasons are
 * fixed sentences that carry no locator word and no page text.
 * @param {any} target
 * @param {number} n the 1-based step position
 * @param {{ boundMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number }} [opts] forwarded to `settleAssertion`
 * @returns {Promise<CaseResult | null>}
 */
export async function requireVisibleToPerson(target, n, opts = {}) {
  const seen = await settleAssertion(() => isVisibleToPerson(target), (visible) => visible === true, opts);
  if (seen.status === 'accepted') return null;
  if (seen.status === 'rejected') {
    return { outcome: 'fail', reason_code: null, reason: `step ${n}: the target was present but not visible to a person (opacity or visibility hides it)`, evidence: [] };
  }
  return notPerformable(`step ${n}: the visibility of the target could not be read; nothing was asserted`);
}

/**
 * Whether at least one element the locator matches is visible to a person (each candidate goes through
 * `isVisibleToPerson`). Zero candidates are false; a read that throws propagates.
 * @param {any} locator
 * @returns {Promise<boolean>}
 */
export async function isAnyVisibleToPerson(locator) {
  const count = await locator.count();
  for (let k = 0; k < count; k++) {
    if (await isVisibleToPerson(locator.nth(k))) return true;
  }
  return false;
}

/**
 * The role-only presence check: like `requireVisibleToPerson`, over every candidate of the locator.
 * @param {any} locator
 * @param {number} n the 1-based step position
 * @param {{ boundMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number }} [opts] forwarded to `settleAssertion`
 * @returns {Promise<CaseResult | null>}
 */
export async function requireAnyVisibleToPerson(locator, n, opts = {}) {
  const seen = await settleAssertion(() => isAnyVisibleToPerson(locator), (visible) => visible === true, opts);
  if (seen.status === 'accepted') return null;
  if (seen.status === 'rejected') {
    return { outcome: 'fail', reason_code: null, reason: `step ${n}: the target was present but not visible to a person (opacity or visibility hides it)`, evidence: [] };
  }
  return notPerformable(`step ${n}: the visibility of the target could not be read; nothing was asserted`);
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
  const wanted = Array.isArray(method) ? method : [method];
  const matching = needle === null ? [] : entries.filter((e) => isObj(e) && wanted.includes(e.method) && isStr(e.path) && e.path.includes(needle));
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
 * Summarizes the requests a validation submit issued: method, host and path only, capped. Any request the
 * local-only guard does not approve makes the whole window non-local. Pure and total.
 * @param {any} window
 * @returns {{ status: 'non-local' } | { status: 'recorded', observed: number, truncated: boolean, requests: { method: string, host: string, path: string }[] }}
 */
export function summarizeValidationWindow(window) {
  const entries = Array.isArray(window) ? window : [];
  if (entries.some((e) => isObj(e) && e.local !== true)) return { status: 'non-local' };
  const kept = entries.filter((e) => isObj(e) && isStr(e.method) && isStr(e.host) && isStr(e.path));
  return {
    status: 'recorded',
    observed: kept.length,
    truncated: kept.length > EXPECT_REQUESTS_EVIDENCE_MAX,
    requests: kept.slice(0, EXPECT_REQUESTS_EVIDENCE_MAX).map((e) => ({ method: e.method, host: e.host, path: e.path })),
  };
}

/**
 * Waits out the settle window after a validation click and writes the requests it issued to the step evidence.
 * @param {any} ctx
 * @param {any} kase
 * @param {any[] | null} requestLog
 * @param {number} windowStart
 * @param {number} n
 * @returns {Promise<{ evidence: string } | { result: any }>}
 */
async function recordValidationSubmit(ctx, kase, requestLog, windowStart, n) {
  if (requestLog === null) {
    return { result: notPerformable(`step ${n}: the request log is not available; the requests of the validation submit were not recorded`) };
  }
  const seen = await settleRequestWindow(requestLog, windowStart);
  const summary = summarizeValidationWindow(seen);
  if (summary.status === 'non-local') {
    return { result: blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a request of the validation submit targeted a host the local-only guard does not approve; it was aborted`) };
  }
  try {
    const evidence = writeEvidence(ctx, `case-${kase.index}.requests-${n}.json`, {
      kind: 'json',
      value: {
        action: 'click',
        effect: 'validation',
        step: n,
        observed: summary.observed,
        truncated: summary.truncated,
        requests: summary.requests.map((m) => ({ method: m.method, host: m.host, path: redactText(m.path, ctx.table).slice(0, 200) })),
        result: 'recorded',
      },
    });
    return { evidence };
  } catch {
    return { result: blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the request evidence could not be written`) };
  }
}

/**
 * Plan-time grounding pre-check. Returns null when every locator step is grounded, else a step-gap notice for the
 * first gap (a miss is a step gap, not an entry refusal). A reason names a step position, never a locator value.
 * See `groundLocators`.
 * @param {any[]} steps
 * @param {any[]} snapshots
 * @param {any} manualText
 * @param {string | null} role
 * @returns {{ code: string, reason: string } | null}
 */
export function precheckGroundedSteps(steps, snapshots, manualText, role) {
  const { gaps } = groundLocators(steps, snapshots, manualText, role);
  if (gaps.length === 0) return null;
  return { code: 'STEP_UNGROUNDED', reason: `step ${gaps[0].at + 1}: the step could not be grounded to exactly one element` };
}

/**
 * Plan-time grounding of every locator step, and which of them the browser resolves when the case runs. A
 * locator is grounded by a snapshot entry of the step's role and route with `matches` exactly 1 (as before) or by
 * the report's own words: its `name`, `text` or label appears in `manualText` once whitespace is collapsed and
 * case is ignored. A locator with neither source is a step gap (never an entry refusal): an assertion gap is skipped
 * when the case runs, and an interaction gap (`click`, `fill`) truncates the case at that step (`truncateAt`,
 * zero-based, else null); the steps after it are not walked. A gap carries no text. `runtime` lists the zero-based
 * indexes of the steps with no snapshot entry behind them (grounded only by the report's words) and of every
 * step that carries a scoped key, because a snapshot lists page-wide candidates only. A scoped step needs each
 * word it carries (scope, name, prefix, text or label) grounded the same way; `index` carries none. Pure.
 * @param {any[]} steps
 * @param {any[]} snapshots
 * @param {any} manualText
 * @param {string | null} role
 * @param {any} [chosen] the entry's chosen_inputs; an expectation may match the value of an EARLIER chosen fill
 * @returns {{ gaps: { at: number, kind: 'assertion' | 'interaction' }[], truncateAt: number | null, runtime: number[] }}
 */
export function groundLocators(steps, snapshots, manualText, role, chosen = []) {
  const wantRole = role === null ? 'anonymous' : role;
  const collapse = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  const report = isStr(manualText) ? collapse(manualText) : null;
  // A word is the report's own only when it is a non-blank string that the case's manual steps contain.
  const inReport = (/** @type {any} */ word) => report !== null && isStr(word) && word.trim() !== '' && report.includes(collapse(word));
  // A chosen fill is a second source for an expectation, but only for a step AFTER it. An empty literal matches nothing.
  const chosenFills = chosenFillValues(steps, chosen);
  const chosenHas = (/** @type {any} */ literal, /** @type {number} */ before, /** @type {boolean} */ whole) =>
    isStr(literal) && collapse(literal) !== '' && chosenFills.some((c) => c.at < before && (whole ? collapse(c.value) === collapse(literal) : collapse(c.value).includes(collapse(literal))));
  /** @type {number[]} */ const runtime = [];
  /** @type {{ at: number, kind: 'assertion' | 'interaction' }[]} */ const gaps = [];
  /** @type {number | null} */ let truncateAt = null;
  /** @param {number} at @param {any} step */
  const miss = (at, step) => {
    const kind = GAP_INTERACTION_ACTIONS.includes(step.action) ? 'interaction' : 'assertion';
    gaps.push({ at, kind });
    if (kind === 'interaction') truncateAt = at;
  };
  /** @type {string | null} */ let route = null;
  // The absence anchor as validateSteps tracks it (any positive assertion) and as it stands once gap steps are
  // left out (a non-gap positive assertion only): an absence whose anchor exists only through gaps is a gap.
  /** @type {string | null | undefined} */ let anyAnchor;
  /** @type {string | null | undefined} */ let liveAnchor;
  stepLoop: for (const [i, step] of steps.entries()) {
    if (truncateAt !== null) break;
    if (!isObj(step)) continue;
    if (step.action === 'goto' || step.action === 'expect_url') route = routeKey(step.path);
    if (step.action === 'goto') { anyAnchor = undefined; liveAnchor = undefined; }
    const positive = POSITIVE_ASSERTION_ACTIONS.includes(step.action);
    if (positive) anyAnchor = route;
    if ((step.action === 'expect_not_visible' || step.action === 'expect_requests' && step.count === 0)
      && anyAnchor !== undefined && anyAnchor === route && liveAnchor !== route) {
      miss(i, step);
      continue;
    }
    if (step.action === 'judge' && step.within !== undefined) {
      const scoped = scopeOf(step.within);
      if (scoped.ok) {
        const sc = scoped.scope;
        const word = sc.name !== undefined ? sc.name : /** @type {string} */ (sc.namePrefix);
        const plain = route === null ? undefined : snapshots.find((s) => isObj(s) && s.role === wantRole && s.route === route && !isPostInteractionSnapshot(s));
        const listed = plain !== undefined && Array.isArray(plain.entries) && plain.entries.some((/** @type {any} */ e) => isObj(e) && e.matches === 1 && e.kind === 'role' && e.role === sc.role
          && (sc.name !== undefined ? e.name === sc.name : isStr(e.name) && e.name.startsWith(word)));
        if (!inReport(word) && !listed) {
          miss(i, step);
          continue;
        }
      }
    }
    if (!LOCATOR_ACTIONS.includes(step.action)) continue;
    const loc = locatorOf(step);
    if (loc === null || !loc.ok) {
      if (positive) liveAnchor = route;
      continue;
    }
    // The snapshot is the one taken after exactly the case's own goto, click and fill steps before this
    // step when such a post-interaction snapshot exists; otherwise the first plain snapshot of the role
    // and route (a plain lookup never returns a post-interaction file, whatever the file order).
    const candidates = route === null ? [] : snapshots.filter((s) => isObj(s) && s.role === wantRole && s.route === route);
    const hist = interactionHistory(steps, i);
    const histKey = hist.some((h) => h.step.action !== 'goto') ? groundingPrefixKey(hist.map((h) => h.norm)) : null;
    const after = histKey === null ? undefined : candidates.find((s) => isPostInteractionSnapshot(s) && groundingPrefixKey(s.prefix) === histKey);
    const snap = after ?? candidates.find((s) => !isPostInteractionSnapshot(s));
    /** @type {any[]} */ const entries = snap !== undefined && Array.isArray(snap.entries) ? snap.entries.filter(isObj) : [];
    if (loc.form === 'scoped') {
      // A snapshot lists page-wide candidates only, so a scoped step is always resolved when the case runs; each
      // word it carries is still grounded by the report or by a snapshot entry that matches exactly one element.
      /** @type {{ word: string, listed: (e: any) => boolean }[]} */ const words = [];
      const sc = loc.scope;
      if (sc !== null && sc.anchorText !== undefined) {
        const anchorWord = sc.anchorText;
        words.push({ word: anchorWord, listed: (/** @type {any} */ e) => e.kind === 'text' && e.text === anchorWord });
      } else if (sc !== null) {
        words.push(sc.name !== undefined
          ? { word: sc.name, listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === sc.role && e.name === sc.name }
          : { word: /** @type {string} */ (sc.namePrefix), listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === sc.role && isStr(e.name) && e.name.startsWith(/** @type {string} */ (sc.namePrefix)) });
      }
      const t = loc.target;
      if (t.kind === 'role') words.push({ word: t.name, listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === t.role && e.name === t.name });
      else if (t.kind === 'role-prefix') words.push({ word: t.namePrefix, listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === t.role && isStr(e.name) && e.name.startsWith(t.namePrefix) });
      else if (t.kind === 'text') words.push({ word: t.text, listed: (/** @type {any} */ e) => e.kind === 'text' && e.text === t.text });
      else if (t.kind === 'label') words.push({ word: t.labelText, listed: (/** @type {any} */ e) => e.kind === 'text' && e.text === t.labelText });
      for (const w of words) {
        if (inReport(w.word) || entries.some((e) => e.matches === 1 && w.listed(e))) continue;
        miss(i, step);
        continue stepLoop;
      }
      runtime.push(i);
    } else {
      const entry = entries.find((e) => (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
      const listed = entry !== undefined && entry.matches === 1;
      if (!listed && !inReport(loc.form === 'role' ? loc.name : loc.text)) {
        miss(i, step);
        continue;
      }
      if (!listed) {
        runtime.push(i);
      } else if (after !== undefined) {
        // A value a consumed prefix typed must come from the report's own steps; the reason names a position only.
        for (const h of hist) {
          if (h.step.action !== 'fill') continue;
          const ok = isStr(manualText) && isStr(h.step.value) && collapse(manualText).includes(collapse(h.step.value));
          if (!ok) {
            miss(i, step);
            continue stepLoop;
          }
        }
      }
    }
    if (step.action === 'expect_text' && step.pattern === undefined) {
      const ok = (isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains))) || chosenHas(step.contains, i, false);
      if (!ok) {
        miss(i, step);
        continue;
      }
    }
    if (step.action === 'expect_value') {
      // A literal expectation comes from the report's own steps; a {{name}} binding is validated against the declared captures.
      for (const key of ['equals', 'contains']) {
        const literal = step[key];
        if (!isStr(literal) || [...literal.matchAll(VARIABLE_PATTERN)].length > 0) continue;
        const ok = (isStr(manualText) && collapse(manualText).includes(collapse(literal))) || chosenHas(literal, i, key === 'equals');
        if (!ok) {
          miss(i, step);
          continue stepLoop;
        }
      }
    }
    if (positive) liveAnchor = route;
  }
  const gapAt = new Set(gaps.map((g) => g.at));
  return { gaps, truncateAt, runtime: runtime.filter((j) => !gapAt.has(j)) };
}

/**
 * The four-key partition plus the two beside-the-rate counters.
 * @param {{ outcome: string, reason_code?: string | null }[]} entries
 * @returns {{ counts: Record<string, number>, record_resolved: number, partially_executed: number }}
 */
export function summarizeEntries(entries) {
  /** @type {Record<string, number>} */ const counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 };
  for (const e of entries) if (Object.hasOwn(counts, e.outcome)) counts[e.outcome]++;
  return {
    counts,
    record_resolved: entries.filter((e) => e.reason_code === 'AUTOMATED_EVIDENCE').length,
    partially_executed: entries.filter((e) => e.reason_code === 'PARTIAL_REMAINDER').length,
  };
}

/**
 * Whether a driver result is a case that holds judge steps awaiting a verdict: the internal pending value, a
 * non-empty list of step positions and nothing else. The one exception to the closed outcome vocabulary. Pure.
 * @param {any} result
 * @returns {boolean}
 */
export function isPendingResult(result) {
  return isObj(result) && result.outcome === PENDING_JUDGMENT && Array.isArray(result.pending_judgment) && result.pending_judgment.length > 0;
}

/**
 * The judgment block of `results.json`: how many judge steps wait for a verdict and how many have one. `null`
 * when no entry holds a judge step, so a run without one keeps the file it always had. Pure and total.
 * @param {any[]} entries
 * @returns {{ pending_steps: number, judged_steps: number } | null}
 */
export function summarizeJudgment(entries) {
  let seen = 0;
  let pending = 0;
  let judged = 0;
  for (const e of Array.isArray(entries) ? entries : []) {
    for (const s of isObj(e) && Array.isArray(e.steps) ? e.steps : []) {
      if (!isObj(s) || s.action !== 'judge') continue;
      seen++;
      if (s.result === PENDING_JUDGMENT) pending++;
      else if (s.judged_by === 'model' && (s.result === 'passed' || s.result === 'failed' || s.result === 'uncertain')) judged++;
    }
  }
  return seen === 0 ? null : { pending_steps: pending, judged_steps: judged };
}

// The reason classes: `impossible` is what no AI agent can execute alone, `gap` is every other limit. The reason
// class belongs to a catalogue code and is not the `class` of a case (`CASE_CLASSES`).
export const REASON_CLASSES = Object.freeze(['impossible', 'gap']);

/**
 * The plan-facing closed catalogue of reason codes: the causes a plan entry may name when it declines a case
 * instead of executing it. `disposition` is the outcome a declined case is reported with; `class` is the reason
 * class of the code; `reason` is a fixed sentence that carries no planner-supplied text. A runtime halt code
 * (session, probe, query or origin) stays a specific runner code outside this list, and the planner-defect marker
 * for a case the plan omitted entirely is deliberately not a member.
 * @type {Readonly<Record<string, Readonly<{ disposition: 'needs-human' | 'blocked', class: 'impossible' | 'gap', reason: string }>>>}
 */
export const REASON_CATALOGUE = Object.freeze({
  UNGROUNDABLE_AFTER_INTERACTION: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'the case needs an element that exists only after an interaction and cannot be grounded before it; the manual steps are reproduced verbatim',
  }),
  EXTERNAL_CHANNEL: Object.freeze({
    disposition: 'needs-human',
    class: 'impossible',
    reason: 'the case needs a real external channel with no declared local source; the manual steps are reproduced verbatim',
  }),
  OUTSIDE_LOCAL_ENVIRONMENT: Object.freeze({
    disposition: 'needs-human',
    class: 'impossible',
    reason: 'the case needs production or a physical device that no local environment provides; the manual steps are reproduced verbatim',
  }),
  HUMAN_SIGNOFF: Object.freeze({
    disposition: 'needs-human',
    class: 'impossible',
    reason: 'the report reserves this step for a person; the manual steps are reproduced verbatim',
  }),
  VISUAL_JUDGEMENT: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'the case asks for a judgment of appearance that no driver can make; the manual steps are reproduced verbatim',
  }),
  JUDGEMENT_UNCERTAIN: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'a judgment of the captured evidence was recorded as uncertain; the manual steps are reproduced verbatim',
  }),
  VOCABULARY_GAP: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'a step the case needs, or a declared source or origin for it, is missing from the closed vocabulary; the manual steps are reproduced verbatim',
  }),
  STEP_UNGROUNDED: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'a step of the case could not be grounded to exactly one element; the manual steps are reproduced verbatim',
  }),
  PARTIAL_REMAINDER: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'the objective steps ran and the rest of the case is human work; the manual steps are reproduced verbatim',
  }),
  PRODUCT_DEFECT: Object.freeze({
    disposition: 'blocked',
    class: 'gap',
    reason: 'a known product defect stops the case from starting; the manual steps are reproduced verbatim',
  }),
  STATE_UNCONFIRMED: Object.freeze({
    disposition: 'blocked',
    class: 'gap',
    reason: 'the state the case requires is not confirmed; the manual steps are reproduced verbatim',
  }),
  ROLE_NOT_DEDICATED: Object.freeze({
    disposition: 'blocked',
    class: 'gap',
    reason: 'a write or validation step names a role the kit does not declare dedicated; nothing was executed; the manual steps are reproduced verbatim',
  }),
});

/** Codes the runner derives or records itself (`PARTIAL_REMAINDER` from `human_remainder`); a plan entry may not declare them. */
export const RUNNER_OWNED_REASON_CODES = Object.freeze(['PARTIAL_REMAINDER', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED']);

/**
 * The reason class of a catalogue code, or `null` for anything that is not an own key of the catalogue. Pure.
 * @param {any} code
 * @returns {'impossible' | 'gap' | null}
 */
export function reasonClassOf(code) {
  if (!isStr(code) || !Object.hasOwn(REASON_CATALOGUE, code)) return null;
  return REASON_CATALOGUE[code].class;
}

/**
 * The step counters of `results.json` for what a `needs-human` case leaves to a person, split by the reason class
 * of its code. A case owes its declared `objective_steps` less the steps a driver ran (`passed` or `failed`); one
 * that declared none owes its steps still `not-run` or `human`. A `blocked` case, a code outside the catalogue and
 * anything that is not an object add nothing. A sibling of `summarizeEntries`, which it leaves untouched. Pure.
 * @param {any[]} entries
 * @returns {{ needs_human_impossible: number, needs_human_gap: number }}
 */
export function summarizeNeedsHuman(entries) {
  const total = { impossible: 0, gap: 0 };
  for (const e of entries) {
    if (!isObj(e) || e.outcome !== 'needs-human') continue;
    const cls = reasonClassOf(e.reason_code);
    if (cls === null) continue;
    const steps = Array.isArray(e.steps) ? e.steps : [];
    const executed = steps.filter((/** @type {any} */ s) => isObj(s) && (s.result === 'passed' || s.result === 'failed')).length;
    const owed = Number.isInteger(e.objective_steps)
      ? Math.max(0, e.objective_steps - executed)
      : steps.filter((/** @type {any} */ s) => isObj(s) && (s.result === 'not-run' || s.result === 'human')).length;
    total[cls] += owed;
  }
  return { needs_human_impossible: total.impossible, needs_human_gap: total.gap };
}

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
    if (code === 'PARTIAL_REMAINDER') {
      return refuse(`the reason_code ${code} is derived by the runner from human_remainder; a plan entry may not declare it`);
    }
    if (RUNNER_OWNED_REASON_CODES.includes(code)) {
      return refuse(`the reason_code ${code} is produced by the runner itself; a plan entry may not declare it`);
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

/** The plugin's visual-tooling directory, with forward slashes: where the runner looks for Playwright when the target has none. */
function visualDirOf(/** @type {string} */ pluginRoot) {
  return fwd(join(pluginRoot, 'scripts', 'visual'));
}

/** The one command that provisions the visual tooling's packages; the package's own postinstall also installs the Chromium build. */
function provisionCommand(/** @type {string} */ dir) {
  return `npm --prefix "${dir}" install`;
}

/** The reason a persisted case carries: a fixed sentence with no path, because the plugin cache path holds the operator's home directory. */
const PLAYWRIGHT_UNAVAILABLE_REASON = "playwright is not resolvable from the target or from the plugin's visual tooling directory; the run printed the resolved path and the one command that provisions it";

/** The persisted reason of a case blocked because a headless Chromium could not be launched: a fixed sentence with no path. */
const BROWSER_UNAVAILABLE_REASON = 'a headless Chromium could not be launched; the preflight mode names the one command that provisions the visual tooling';

/**
 * The terminal text of an unresolvable Playwright, in every mode: the resolved plugin directory and the one
 * provisioning command. It names an absolute path, so it is printed and never written to a run file.
 * @param {string} pluginRoot
 * @returns {string}
 */
export function playwrightUnavailableText(pluginRoot) {
  const dir = visualDirOf(pluginRoot);
  return `playwright is not resolvable from the target or from ${dir}; provision it once, with your consent, by running: ${provisionCommand(dir)}`;
}

/**
 * The terminal text of a Chromium build that is missing or cannot start, with the same one command.
 * @param {string} pluginRoot
 * @returns {string}
 */
function browserUnavailableText(pluginRoot) {
  const dir = visualDirOf(pluginRoot);
  return `the Chromium build of the resolved playwright is not installed or could not be launched; install it once, with your consent, by running: ${provisionCommand(dir)}`;
}

/**
 * Whether Playwright resolves for a target and plugin root, from which package directory and at which version.
 * It loads the package the way the runner does and reports where it came from; it makes no request and starts no browser.
 * @param {string} root the target root
 * @param {string} pluginRoot
 * @returns {{ playwright: any | null, path: string | null, version: string | null, visualDir: string }}
 */
export function describePlaywright(root, pluginRoot) {
  const visualDir = visualDirOf(pluginRoot);
  const playwright = loadPlaywright(root, pluginRoot);
  if (playwright === null) return { playwright: null, path: null, version: null, visualDir };
  for (const base of [join(root, 'package.json'), join(pluginRoot, 'scripts', 'visual', 'package.json')]) {
    try {
      const dir = dirname(createRequire(base).resolve('playwright'));
      const pkg = readJsonOrNull(join(dir, 'package.json'));
      return { playwright, path: fwd(dir), version: isObj(pkg) && isStr(pkg.version) ? pkg.version : null, visualDir };
    } catch {
      // this base does not resolve the package; the next one may
    }
  }
  return { playwright, path: null, version: null, visualDir };
}

/**
 * The kit login scripts under `PRPs/auth/` whose template stamp differs from the installed template's, by role.
 * It reuses `staleKitScript`, so it fails open exactly as the run does: a script without the template sentence, an
 * unreadable script or template and an unstamped installed template are never reported. Reads files only.
 * @param {string} root the target root
 * @returns {{ role: string, detail: string }[]}
 */
export function staleKitRoles(root) {
  const dir = join(root, 'PRPs', 'auth');
  /** @type {string[]} */ let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  /** @type {{ role: string, detail: string }[]} */ const stale = [];
  for (const name of names.sort()) {
    const m = /^login-(.+)\.mjs$/.exec(name);
    if (!m || !ROLE_PATTERN.test(m[1])) continue;
    const detail = staleKitScript(join(dir, name));
    if (detail !== null) stale.push({ role: m[1], detail });
  }
  return stale;
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
 * The bound of one final-capture attempt, in milliseconds. It is explicit because the capture used to run under
 * the page default of 10 seconds, and a full-page capture is heavier than a viewport one; a larger bound costs
 * nothing on the success path and only delays a capture that is stuck. Chosen, not measured.
 */
export const CAPTURE_TIMEOUT_MS = 30000;

/**
 * The final screenshot of a browser case: the full page with the given masks applied. If the full-page capture
 * throws (a very tall page, a page that closed), the viewport is captured once with the same masks, so a case
 * keeps the evidence it had before the capture grew. The caller writes the bytes through the single evidence
 * writer; a page that cannot be captured either way throws and the caller classifies that.
 * @param {any} page
 * @param {any[]} masks
 * @returns {Promise<Buffer>}
 */
export async function captureFinalPng(page, masks) {
  try {
    return await page.screenshot({ mask: masks, fullPage: true, timeout: CAPTURE_TIMEOUT_MS });
  } catch {
    return page.screenshot({ mask: masks, timeout: CAPTURE_TIMEOUT_MS });
  }
}

/**
 * A screenshot of one located element with the given masks. Reusable by a step that scopes its evidence to a
 * locator; the `judge` step uses it for a scoped capture. Like the final capture it returns bytes and writes nothing.
 * @param {any} target a Playwright locator
 * @param {any[]} masks
 * @returns {Promise<Buffer>}
 */
export function captureElementPng(target, masks) {
  return target.screenshot({ mask: masks, timeout: CAPTURE_TIMEOUT_MS });
}

/**
 * The XPath, relative to the element that holds the label text, of the nearest container (the element itself
 * included) that holds exactly one `input`, `textarea` or `select`; a hidden input is not counted. Counts only
 * ever grow going up, so the first container that holds any control either holds exactly one (the target) or
 * more (nothing matches, and the case ends `STEP_UNGROUNDED`). A fixed constant, never planner text.
 */
export const LABEL_CONTAINER_XPATH = "xpath=ancestor-or-self::*[count(.//input[not(@type='hidden')] | .//textarea | .//select) = 1][1]";

/** The control inside the container that `LABEL_CONTAINER_XPATH` selects. */
const LABEL_CONTROL_CSS = "input:not([type='hidden']), textarea, select";

/** @param {string} s @returns {string} the text with every regular-expression metacharacter escaped */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The `getByRole` options for an exact accessible name, or for a name matched by its start: an anchored,
 * case-sensitive regular expression whose whitespace runs match any whitespace run.
 * @param {{ name?: string, namePrefix?: string }} spec
 * @returns {{ name: string | RegExp, exact?: boolean }}
 */
function nameOption(spec) {
  if (spec.name !== undefined) return { name: spec.name, exact: true };
  return { name: new RegExp(`^${/** @type {string} */ (spec.namePrefix).trim().split(/\s+/).map(escapeRegExp).join('\\s+')}`) };
}

/**
 * The locator of a `within` scope: every element of the scope's role whose accessible name is the scope's name
 * (exact) or starts with its name prefix. It may match any number of elements; the caller requires exactly one.
 * @param {any} page a Playwright page
 * @param {{ role: string, name?: string, namePrefix?: string }} scope
 * @returns {any}
 */
export function scopeLocator(page, scope) {
  return page.getByRole(scope.role, nameOption(scope));
}

/**
 * Resolves a scope to its single element: waits up to 10 seconds for the first match to attach, then counts.
 * Exported so that a later step (the `judge` step's element capture) resolves the same scope the same way and
 * hands `locator` to `captureElementPng`, with no second implementation of scope resolution.
 * @param {any} page
 * @param {{ role: string, name?: string, namePrefix?: string }} scope
 * @returns {Promise<{ ok: true, locator: any } | { ok: false, count: number }>}
 */
export async function resolveScopeElement(page, scope) {
  const locator = scopeLocator(page, scope);
  await locator.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await locator.count().catch(() => 0);
  return count === 1 ? { ok: true, locator } : { ok: false, count };
}

/** The ancestors-or-self of an element in document order. A fixed constant, never planner text. */
export const ANCHOR_ANCESTORS_XPATH = 'xpath=ancestor-or-self::*';

/**
 * Resolves an `anchor_text` scope: the one visible element whose text equals the anchor, then its nearest
 * ancestor that holds at least one element of `role`. Every failure is a value, never a throw.
 * @param {any} page
 * @param {{ anchorText: string }} scope
 * @param {string} role
 * @returns {Promise<{ ok: true, locator: any } | { ok: false, why: 'count' | 'hidden' | 'container', count: number }>}
 */
export async function resolveAnchorScope(page, scope, role) {
  const anchor = page.getByText(scope.anchorText, { exact: true });
  await anchor.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const found = await anchor.count().catch(() => 0);
  if (found !== 1) return { ok: false, why: 'count', count: found };
  if (!(await isVisibleToPerson(anchor).catch(() => false))) return { ok: false, why: 'hidden', count: 1 };
  const chain = anchor.locator(ANCHOR_ANCESTORS_XPATH);
  const depth = await chain.count().catch(() => 0);
  for (let k = depth - 1; k >= 0; k--) {
    const container = chain.nth(k);
    const holds = await container.getByRole(role).count().catch(() => 0);
    if (holds > 0) return { ok: true, locator: container };
  }
  return { ok: false, why: 'container', count: 1 };
}

/**
 * Builds the Playwright locator of an `ok` descriptor of `locatorOf`, with the locators that must each match
 * exactly one element before the target can be trusted (the scope, and the label element of `label_text`) and,
 * for an `index`, the list the index selects from. It builds locators and resolves nothing. Scope is a chain of
 * ordinary locators (the scope's own `getByRole`, then the target's), never the locator-level scoping method that
 * arrives only in Playwright 1.64.
 * @param {any} page
 * @param {any} loc
 * @param {any} [anchorBase] the container `resolveAnchorScope` resolved, required for an `anchor_text` scope
 * @returns {{ target: any, guards: { what: 'scope' | 'label', locator: any }[], indexed: null | { all: any, index: number } }}
 */
export function buildLocator(page, loc, anchorBase = null) {
  if (loc.form === 'role') return { target: page.getByRole(loc.role, { name: loc.name, exact: true }), guards: [], indexed: null };
  if (loc.form === 'text') return { target: page.getByText(loc.text, { exact: true }), guards: [], indexed: null };
  /** @type {{ what: 'scope' | 'label', locator: any }[]} */ const guards = [];
  /** @type {any} */ let base = page;
  if (loc.scope !== null && loc.scope.anchorText !== undefined) {
    if (anchorBase === null) throw new Error('an anchor_text scope is resolved before the locator is built');
    base = anchorBase;
    guards.push({ what: 'scope', locator: base });
  } else if (loc.scope !== null) {
    base = scopeLocator(page, loc.scope);
    guards.push({ what: 'scope', locator: base });
  }
  const t = loc.target;
  if (t.kind === 'role') return { target: base.getByRole(t.role, { name: t.name, exact: true }), guards, indexed: null };
  if (t.kind === 'role-prefix') return { target: base.getByRole(t.role, nameOption({ namePrefix: t.namePrefix })), guards, indexed: null };
  if (t.kind === 'text') return { target: base.getByText(t.text, { exact: true }), guards, indexed: null };
  if (t.kind === 'label') {
    const labelElement = base.getByText(t.labelText, { exact: true });
    guards.push({ what: 'label', locator: labelElement });
    return { target: labelElement.locator(LABEL_CONTAINER_XPATH).locator(LABEL_CONTROL_CSS), guards, indexed: null };
  }
  if (t.kind === 'role-any') return { target: base.getByRole(t.role), guards, indexed: null };
  const all = base.getByRole(t.role);
  return { target: all.nth(t.index), guards, indexed: { all, index: t.index } };
}

/**
 * The locator keys of a scoped step as the comparison evidence records them: the words already in the plan,
 * never a typed or compared value.
 * @param {any} step
 * @returns {Record<string, any>}
 */
function scopedLocatorRecord(step) {
  /** @type {Record<string, any>} */ const record = {};
  for (const k of ['within', 'role', 'name', 'name_prefix', 'label_text', 'index', 'text']) if (step[k] !== undefined) record[k] = step[k];
  return record;
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

const pauseMs = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The byte size of a declared sms file at the start of a case (0 when it does not exist yet).
 * @param {string} abs
 * @returns {number}
 */
function smsBaselineSize(abs) {
  try {
    return statSync(abs).size;
  } catch {
    return 0;
  }
}

/**
 * Reads a verification value from a declared Mailpit origin: the newest message to the recipient received after the
 * start of the case. The guard is checked again right before the first request. Returns no message text.
 * @param {RunCtx} ctx
 * @param {string} base the declared origin (no trailing slash)
 * @param {string} to
 * @param {number} startedMs
 * @param {string} regex
 * @returns {Promise<{ ok: true, value: string, receivedAt: string } | { ok: false, kind: 'non-local' | 'unreachable' | 'absent' }>}
 */
async function readMailValue(ctx, base, to, startedMs, regex) {
  const g = await ctx.target.guard.checkTarget(base, { root: ctx.root });
  if (!g.ok) return { ok: false, kind: 'non-local' };
  // A redirect is never followed: the catcher's answer is read as it is.
  const noRedirects = 0;
  const options = { method: 'GET', maxRedirects: noRedirects, timeout: 10000, failOnStatusCode: false };
  const deadline = Date.now() + READ_MESSAGE_WAIT_MS;
  for (;;) {
    /** @type {any} */ let listing;
    try {
      const search = await fetchAnonymously(ctx.playwright, new URL(base).origin, `${base}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}&limit=50`, options);
      if (search.status() !== 200) return { ok: false, kind: 'unreachable' };
      listing = JSON.parse(await search.text());
    } catch {
      return { ok: false, kind: 'unreachable' };
    }
    const hit = newestMailAfter(listing, startedMs);
    if (hit !== null) {
      /** @type {any} */ let detail = null;
      try {
        const resp = await fetchAnonymously(ctx.playwright, new URL(base).origin, `${base}/api/v1/message/${encodeURIComponent(hit.id)}`, options);
        if (resp.status() !== 200) return { ok: false, kind: 'unreachable' };
        detail = JSON.parse(await resp.text());
      } catch {
        return { ok: false, kind: 'unreachable' };
      }
      const got = isObj(detail) && isStr(detail.Text) ? extractMessageValue(detail.Text, regex) : null;
      if (got !== null && got.ok) return { ok: true, value: got.value, receivedAt: new Date(hit.createdMs).toISOString() };
    }
    if (Date.now() >= deadline) return { ok: false, kind: 'absent' };
    await pauseMs(READ_MESSAGE_POLL_MS);
  }
}

/**
 * Reads a verification value from a declared sms file: only the bytes appended since the case started, the last line
 * that holds the recipient. A link that leaves the target root is refused.
 * @param {string} root
 * @param {string} abs
 * @param {number} baseline
 * @param {string} to
 * @param {string} regex
 * @returns {Promise<{ ok: true, value: string, receivedAt: null } | { ok: false, kind: 'outside' | 'unreachable' | 'absent' }>}
 */
async function readSmsValue(root, abs, baseline, to, regex) {
  const deadline = Date.now() + READ_MESSAGE_WAIT_MS;
  for (;;) {
    if (existsSync(abs)) {
      try {
        const real = realpathSync(abs);
        const rel = relative(realpathSync(root), real);
        if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return { ok: false, kind: 'outside' };
        const bytes = readFileSync(real);
        const appended = bytes.subarray(bytes.length >= baseline ? baseline : 0).toString('utf8');
        const entry = smsEntryAfter(appended, to);
        const got = entry === null ? null : extractMessageValue(entry, regex);
        if (got !== null && got.ok) return { ok: true, value: got.value, receivedAt: null };
      } catch {
        return { ok: false, kind: 'unreachable' };
      }
    }
    if (Date.now() >= deadline) return { ok: false, kind: 'absent' };
    await pauseMs(READ_MESSAGE_POLL_MS);
  }
}

/**
 * Runs one `read_message` step: classify the declared source, read the message, register the value for redaction
 * BEFORE anything is written, and write a metadata-only evidence file. No reason, evidence value or terminal line
 * carries the message, the recipient, the value or the expression.
 * @param {RunCtx} ctx
 * @param {any} kase
 * @param {any} step
 * @param {number} n the one-based step position
 * @param {number} startedMs
 * @param {number} smsBaseline
 * @returns {Promise<{ ok: true, value: string, evidence: string } | { ok: false, result: any }>}
 */
async function runReadMessage(ctx, kase, step, n, startedMs, smsBaseline) {
  const src = classifyChannelSource(isObj(ctx.seedConfig) ? ctx.seedConfig.channel_sources : undefined, step.channel, ctx.root);
  if (!src.ok) {
    return { ok: false, result: src.code === 'EXTERNAL_CHANNEL' ? needsHuman(src.code, `step ${n}: ${src.reason}`) : blocked(src.code, `step ${n}: ${src.reason}`) };
  }
  if (!isStr(step.to) || !MESSAGE_TO_PATTERN.test(step.to)) {
    return { ok: false, result: notPerformable(`step ${n}: the recipient is not a plain address or number; nothing was requested`) };
  }
  const read = src.kind === 'mailpit'
    ? await readMailValue(ctx, src.url, step.to, startedMs, step.extract.regex)
    : await readSmsValue(ctx.root, src.abs, smsBaseline, step.to, step.extract.regex);
  if (!read.ok) {
    if (read.kind === 'non-local') return { ok: false, result: blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: the declared mail source is not local; nothing was requested`) };
    if (read.kind === 'outside') return { ok: false, result: blocked('CHANNEL_SOURCE_INVALID', `step ${n}: the declared sms file resolves outside the target root; nothing was read`) };
    if (read.kind === 'unreachable') return { ok: false, result: blocked('CHANNEL_UNREACHABLE', `step ${n}: the declared ${step.channel} source could not be read`) };
    return { ok: false, result: { outcome: 'fail', reason_code: null, reason: `step ${n}: no message from the declared ${step.channel} source matched within ${READ_MESSAGE_WAIT_MS / 1000} seconds`, evidence: [] } };
  }
  if (read.value.length < 4) {
    return { ok: false, result: blocked('CAPTURE_UNREDACTABLE', `step ${n}: the extracted value is too short to redact; nothing was kept`) };
  }
  addSecretValues(ctx.table, [read.value]);
  try {
    const evidence = writeEvidence(ctx, `case-${kase.index}.message-${n}.json`, {
      kind: 'json',
      value: { action: 'read_message', step: n, channel: step.channel, received_at: read.receivedAt, result: 'passed' },
    });
    return { ok: true, value: read.value, evidence };
  } catch {
    return { ok: false, result: blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the message evidence could not be written`) };
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
 * One role-and-name, text or scoped locator step. The locator must match exactly one element at run time;
 * the decision never passes through first() or last(), and nth() only for the indexed form, whose index is
 * checked against the number of matches in its scope first. Returns a result that ends the
 * case, or null when the step passed. A reason never carries a locator value, a fill value, an input
 * value or page text.
 * @param {any} page
 * @param {any} step
 * @param {any} loc
 * @param {number} n
 * @param {(kind: string, passed: boolean) => void} [recordComparison] records which comparison an `expect_value` step ran and whether it passed
 * @param {boolean} [runtime] true when no snapshot entry grounds the step, so the report's words do
 * @returns {Promise<CaseResult | null>}
 */
async function runLocatorStep(page, step, loc, n, recordComparison, runtime = false) {
  /** @type {any} */ let anchorBase = null;
  if (loc.form === 'scoped' && loc.scope !== null && loc.scope.anchorText !== undefined) {
    const resolved = await resolveAnchorScope(page, loc.scope, loc.target.role);
    if (resolved.ok === false && resolved.why === 'count') {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the anchor text matched ${resolved.count} elements at run time; an anchor must match exactly one, so nothing was asserted or acted on`);
    }
    if (resolved.ok === false && resolved.why === 'hidden') {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the anchor text is not visible to a person, so nothing was asserted or acted on`);
    }
    if (resolved.ok === false) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: no container of the anchor text holds an element of the role, so nothing was asserted or acted on`);
    }
    anchorBase = resolved.locator;
  }
  const built = buildLocator(page, loc, anchorBase);
  const target = built.target;
  // A scoped locator is never a snapshot entry, and a plain one that no entry grounds (`runtime`) is the report's
  // word. Both are resolved here: zero matches end the case needs-human instead of failing it.
  const atRunTime = runtime || loc.form === 'scoped';
  for (const guard of built.guards) {
    await guard.locator.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const found = await guard.locator.count().catch(() => 0);
    if (found !== 1) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the ${guard.what} matched ${found} elements at run time; a ${guard.what} must match exactly one, so nothing was asserted or acted on`);
    }
  }
  if (built.indexed !== null) {
    await built.indexed.all.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const total = await built.indexed.all.count().catch(() => 0);
    if (built.indexed.index >= total) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the index is past the last matching element of the scope (${total} found), so nothing was asserted or acted on`);
    }
  }
  if (step.action === 'expect_not_visible') {
    if (built.guards.length > 0 && built.guards[0].what === 'scope') {
      const shown = await settleAssertion(() => isVisibleToPerson(built.guards[0].locator), (visible) => visible === true);
      if (shown.status === 'rejected') return needsHuman('STEP_UNGROUNDED', `step ${n}: the scope is not visible to a person, so an absence inside it asserts nothing`);
      if (shown.status === 'unreadable') return notPerformable(`step ${n}: the visibility of the target could not be read; nothing was asserted`);
    }
    // An absence is decided on the live page, with no wait for the element to attach: a locator that
    // matches nothing is hidden. The anchor rule of validateSteps is what keeps that from being vacuous.
    const present = await target.count().catch(() => 0);
    if (present > 1) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${present} elements at run time; a locator must match exactly one, so nothing was asserted`);
    }
    const hidden = await settleAssertion(async () => !(await isVisibleToPerson(target)), (isHidden) => isHidden === true);
    if (hidden.status === 'accepted') return null;
    if (hidden.status === 'rejected') return { outcome: 'fail', reason_code: null, reason: `step ${n}: the element was still visible`, evidence: [] };
    return notPerformable(`step ${n}: the visibility of the target could not be read; nothing was asserted`);
  }
  if (loc.form === 'scoped' && loc.target.kind === 'role-any') {
    // A role with no name inside the scope: several candidates are normal; one visible to a person is enough.
    await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const present = await target.count().catch(() => 0);
    if (present === 0) return { outcome: 'fail', reason_code: null, reason: absentElementReason(n), evidence: [], cause: 'absent' };
    return requireAnyVisibleToPerson(target, n);
  }
  // The wait only gives the page time to render; the decision is the count.
  await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await target.count().catch(() => 0);
  if (count > 1) {
    return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on`);
  }
  const expects = POSITIVE_ASSERTION_ACTIONS.includes(step.action);
  if (count === 0) {
    if (expects) return { outcome: 'fail', reason_code: null, reason: absentElementReason(n), evidence: [], cause: 'absent' };
    if (atRunTime) return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched no element at run time, so nothing was asserted or acted on`);
    return notPerformable(actionFailureReason(n, step.action, 'absent'), 'absent');
  }
  if (step.action === 'click' || step.action === 'fill') {
    try {
      if (step.action === 'click') await target.click();
      else await target.fill(step.value);
    } catch {
      const cause = await probeActionFailure(target, step.action, true);
      return notPerformable(actionFailureReason(n, step.action, cause), cause);
    }
    return null;
  }
  if (step.action === 'expect_visible') {
    const ok = await target.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    if (!ok) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
    return requireVisibleToPerson(target, n);
  }
  if (step.action === 'expect_value') {
    // The value is read with the documented input reader and compared in place: it is never returned,
    // recorded or placed in a reason. An element with no value to read is a blocked case, never a fail.
    const kind = comparisonKindOf(step);
    if (kind === null) return notPerformable(`step ${n}: the expect_value comparison is not declared; nothing was asserted`);
    const settled = await settleAssertion(() => target.inputValue({ timeout: 1000 }), (v) => compareInputValue(step, v)?.passed === true);
    if (settled.status === 'unreadable') {
      return notPerformable(`step ${n}: the expect_value target holds no readable value; nothing was asserted`);
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
    return notPerformable(`step ${n}: the ${step.state} state of the target could not be read; nothing was asserted`);
  }
  if (step.action === 'expect_text') {
    if (isStr(step.pattern)) {
      const read = await settleAssertion(() => target.innerText({ timeout: 1000 }), (t) => textMatchesPattern(step.pattern, t));
      if (read.status === 'unreadable') return notPerformable(`step ${n}: the text of the target could not be read; nothing was asserted`);
      if (read.status === 'rejected') return { outcome: 'fail', reason_code: null, reason: `step ${n}: the text did not match the declared pattern`, evidence: [] };
      return requireVisibleToPerson(target, n);
    }
    const text = await target.textContent({ timeout: 10000 }).catch(() => null);
    if (text === null || !text.includes(step.contains)) {
      return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
    }
    return requireVisibleToPerson(target, n);
  }
  return notPerformable(actionFailureReason(n, step.action, 'other'));
}

DRIVERS.browser = async (ctx, kase, plan, session) => {
  // The plan is copied so that rewriting the steps after a read never touches the caller's array.
  plan = { ...plan, steps: plan.steps.slice() };
  // "After the case started" means after the browser steps began; an sms source also records how long its file was then.
  const startedMs = Date.now();
  /** @type {Record<string, { value: string, redact: boolean }>} */ const messageValues = {};
  /** @type {Set<number>} */ const secretFillAt = new Set();
  const smsSource = classifyChannelSource(isObj(ctx.seedConfig) ? ctx.seedConfig.channel_sources : undefined, 'sms', ctx.root);
  const smsBaseline = smsSource.ok && plan.steps.some((/** @type {any} */ s) => isObj(s) && s.action === 'read_message' && s.channel === 'sms') ? smsBaselineSize(smsSource.abs) : 0;
  const target = ctx.target;
  const runtimeSteps = Array.isArray(plan.runtime_steps) ? plan.runtime_steps : [];
  /** @type {{ at: number, kind: string }[]} */ const gapSteps = Array.isArray(plan.gap_steps) ? plan.gap_steps : [];
  const truncateAt = Number.isInteger(plan.truncate_at) ? plan.truncate_at : null;
  const assertionGapAt = new Set(gapSteps.filter((g) => g.kind === 'assertion').map((g) => g.at));
  // A case that carries an expect_requests step logs the requests of its page and runs with service workers blocked.
  const watchesRequests = plan.steps.some((/** @type {any} */ s) => isObj(s) && (s.action === 'expect_requests' || s.effect === 'validation'));
  /** @type {{ method: string, host: string, path: string, local: boolean }[] | null} */ let requestLog = null;
  let windowStart = 0;
  /** @type {any} */ let browser = null;
  try {
    browser = await ctx.playwright.chromium.launch({ headless: true });
  } catch {
    return blocked('FAILED_BROWSER_UNAVAILABLE', BROWSER_UNAVAILABLE_REASON);
  }
  /** @type {any} */ let context = null;
  /** @type {string[]} */ const evidence = [];
  /** @type {Map<number, string>} */ const queryEvidence = new Map();
  // The located field of every expect_value step that ran: masked in the final capture, so a value the runner read is not left in clear.
  /** @type {any[]} */ const valueMasks = [];
  /** @type {Map<number, string>} */ const judgeKinds = new Map();
  /** @type {Map<number, string>} */ const judgeScope = new Map();
  /** @type {number[]} */ const pendingAt = [];
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
    const overlayHandlers = Array.isArray(plan.overlay_handlers) ? plan.overlay_handlers : [];
    const overlaySkipped = Array.isArray(plan.overlay_skipped) ? plan.overlay_skipped : [];
    const overlayWatch = overlayHandlers.length > 0 ? await registerOverlayHandlers(page, overlayHandlers, target) : null;
    if (overlayHandlers.length > 0 && overlayWatch === null) return blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', 'the installed Playwright cannot register overlay handlers (version 1.44 or newer is needed); nothing was executed');
    if (watchesRequests) requestLog = observeRequests(page, target);
    /** @type {CaseResult | null} */ let verdict = null;
    /** @type {number[]} */ const failedIdx = [];
    /** @type {Map<number, string>} */ const causeAt = new Map();
    let stoppedAt = null;
    // The only place that assigns the case verdict: the first one is kept; true only when a failed assertion lets the loop go on.
    const settle = (/** @type {CaseResult} */ res, /** @type {number} */ at, /** @type {any} */ stepAt) => {
      failedIdx.push(at);
      if (isStr(res.cause)) causeAt.set(at, res.cause);
      if (verdict === null) verdict = res;
      return res.outcome === 'fail' && continuesAfterFailure(stepAt);
    };
    let ranTo = -1;
    let executedTo = -1;
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
      // A dismissal that left the approved origin ends the acting: no step acts after it.
      if (overlayWatch !== null && overlayWatch.offOriginAt() !== null) { stoppedAt = i; ranTo = i - 1; break; }
      // An ungrounded interaction ends the acting here; an ungrounded assertion is skipped without touching the page.
      if (i === truncateAt) break;
      if (assertionGapAt.has(i)) continue;
      // Once an assertion has failed, an interaction would act on a page left in an unknown state: it and every later step stay not-run.
      if (verdict !== null && !continuesAfterFailure(step)) { stoppedAt = i; ranTo = i - 1; break; }
      if (overlayWatch !== null) overlayWatch.setStep(n);
      executedTo = i;
      // The window of an expect_requests step opens where the case's last interaction starts, before its own requests.
      if (requestLog !== null && (step.action === 'goto' || step.action === 'click' || step.action === 'fill')) windowStart = requestLog.length;
      const lstep = LOCATOR_ACTIONS.includes(step.action) ? locatorOf(step) : null;
      if (lstep !== null && lstep.ok) {
        if (step.action === 'expect_value' && isControlLocator(lstep)) valueMasks.push(buildLocator(page, lstep).target);
        if (step.action === 'fill' && secretFillAt.has(i) && isControlLocator(lstep)) valueMasks.push(buildLocator(page, lstep).target);
        // The comparison evidence holds the action, the step position, the locator already in the plan, the
        // closed comparison word and passed or failed: never the value, its length or the expected string.
        const lr = await runLocatorStep(page, step, lstep, n, (kind, passed) => {
          if (!isControlLocator(lstep)) return;
          queryEvidence.set(
            i,
            writeEvidence(ctx, `case-${kase.index}.value-${n}.json`, {
              kind: 'json',
              value: { action: 'expect_value', step: n, locator: lstep.form === 'role' ? { role: lstep.role, name: lstep.name } : scopedLocatorRecord(step), comparison: kind, result: passed ? 'passed' : 'failed' },
            }),
          );
        }, runtimeSteps.includes(i));
        if (lr !== null) {
          if (settle(lr, i, step)) continue;
          break;
        }
        if (step.action === 'click' && step.effect === 'validation') {
          const rec = await recordValidationSubmit(ctx, kase, requestLog, windowStart, n);
          if ('result' in rec) {
            if (settle(rec.result, i, step)) continue;
            break;
          }
          queryEvidence.set(i, rec.evidence);
        }
        continue;
      }
      if (step.action === 'goto') {
        const url = resolveStepUrl(step.path, target);
        if (url === null) {
          if (settle(blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: the path leaves the guard-approved origin; nothing was requested`), i, step)) continue;
          break;
        }
        try {
          await page.goto(url);
        } catch {
          if (settle(blocked('TARGET_UNREACHABLE', `step ${n}: the page could not be loaded`), i, step)) continue;
          break;
        }
      } else if (step.action === 'click' || step.action === 'fill') {
        if (step.action === 'fill' && secretFillAt.has(i)) valueMasks.push(page.locator(step.selector));
        try {
          if (step.action === 'click') await page.click(step.selector);
          else await page.fill(step.selector, step.value);
        } catch {
          const cause = await probeActionFailure(page.locator(step.selector), step.action, false);
          if (settle(notPerformable(actionFailureReason(n, step.action, cause), cause), i, step)) continue;
          break;
        }
        if (step.action === 'click' && step.effect === 'validation') {
          const rec = await recordValidationSubmit(ctx, kase, requestLog, windowStart, n);
          if ('result' in rec) {
            if (settle(rec.result, i, step)) continue;
            break;
          }
          queryEvidence.set(i, rec.evidence);
        }
      } else if (step.action === 'query') {
        const q = await runQueryStep(ctx, kase, step, n);
        if (!q.ok) {
          if (q.result.evidence.length > 0) queryEvidence.set(i, q.result.evidence[0]);
          if (settle(q.result, i, step)) continue;
          break;
        }
        queryEvidence.set(i, q.evidence);
      } else if (step.action === 'expect_visible') {
        const located = page.locator(step.selector).first();
        const ok = await located.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
        if (!ok) {
          if (settle({ outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] }, i, step)) continue;
          break;
        }
        const seen = await requireVisibleToPerson(located, n);
        if (seen !== null) {
          if (settle(seen, i, step)) continue;
          break;
        }
      } else if (step.action === 'expect_text') {
        const located = page.locator(step.selector).first();
        const text = await located.textContent({ timeout: 10000 }).catch(() => null);
        if (text === null || !text.includes(step.contains)) {
          if (settle({ outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] }, i, step)) continue;
          break;
        }
        const seen = await requireVisibleToPerson(located, n);
        if (seen !== null) {
          if (settle(seen, i, step)) continue;
          break;
        }
      } else if (step.action === 'expect_url') {
        const want = new URL(step.path, target.origin);
        const have = new URL(page.url());
        const same = want.search === '' ? have.pathname === want.pathname : have.pathname + have.search === want.pathname + want.search;
        if (!same) {
          if (settle({ outcome: 'fail', reason_code: null, reason: `step ${n}: the page URL did not match the expected path`, evidence: [] }, i, step)) continue;
          break;
        }
      } else if (step.action === 'expect_requests') {
        if (requestLog === null) {
          if (settle(notPerformable(`step ${n}: the request log is not available; nothing was asserted`), i, step)) continue;
          break;
        }
        // The wait comes first and the slice after it, so a request a handler issues once the click returned is counted.
        const seen = await settleRequestWindow(requestLog, windowStart);
        const decided = evaluateRequestWindow(seen, step);
        if (decided.status === 'non-local') {
          if (settle(blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a matching request targeted a host the local-only guard does not approve; it was aborted and nothing was asserted`), i, step)) continue;
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
          if (settle(blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the request evidence could not be written`), i, step)) continue;
          break;
        }
        if (decided.status === 'failed') {
          if (settle({ outcome: 'fail', reason_code: null, reason: `step ${n}: the page issued ${decided.observed} matching request(s); ${step.count} were expected`, evidence: [] }, i, step)) continue;
          break;
        }
      } else if (step.action === 'judge') {
        // The capture is what a person would look at; the verdict is recorded later by the command session.
        const masks = [page.locator('input[type=password]'), ...valueMasks];
        /** @type {any} */ let scopeElement = null;
        if (step.within !== undefined) {
          const scoped = scopeOf(step.within);
          const found = scoped.ok ? await resolveScopeElement(page, scoped.scope) : { ok: false, count: 0 };
          if (!found.ok) {
            if (settle(needsHuman('STEP_UNGROUNDED', `step ${n}: the judge scope matched ${found.count} elements at run time; a scope must match exactly one, so nothing was captured or judged`), i, step)) continue;
            break;
          }
          scopeElement = found.locator;
        }
        try {
          const pageText = await page.innerText('body').catch(() => '');
          queryEvidence.set(
            i,
            containsSecret(pageText, ctx.table)
              ? writeEvidence(ctx, `case-${kase.index}.judge-${n}.txt`, { kind: 'text', value: pageText })
              : writeEvidence(ctx, `case-${kase.index}.judge-${n}.png`, { kind: 'binary', value: await captureFinalPng(page, masks) }),
          );
          if (scopeElement !== null) {
            const scopeText = await scopeElement.innerText({ timeout: 5000 }).catch(() => '');
            judgeScope.set(
              i,
              containsSecret(scopeText, ctx.table)
                ? writeEvidence(ctx, `case-${kase.index}.judge-${n}.scope.txt`, { kind: 'text', value: scopeText })
                : writeEvidence(ctx, `case-${kase.index}.judge-${n}.scope.png`, { kind: 'binary', value: await captureElementPng(scopeElement, masks) }),
            );
          }
        } catch {
          if (settle(blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the judge capture could not be taken or written`), i, step)) continue;
          break;
        }
        judgeKinds.set(i, step.kind);
        pendingAt.push(i);
      } else if (step.action === 'read_message') {
        const read = await runReadMessage(ctx, kase, step, n, startedMs, smsBaseline);
        if (!read.ok) {
          if (settle(read.result, i, step)) continue;
          break;
        }
        queryEvidence.set(i, read.evidence);
        messageValues[step.extract.as] = { value: read.value, redact: true };
        // The value reaches only the steps after this one; a fill that uses it is masked in every later capture.
        for (let j = i + 1; j < plan.steps.length; j++) {
          const before = plan.steps[j];
          if (isObj(before) && before.action === 'fill' && stepVariables(before).includes(step.extract.as)) secretFillAt.add(j);
          plan.steps[j] = substituteVariables(before, messageValues);
        }
      } else {
        // Every action the validator accepts has a branch above (the locator forms left through continue), so an
        // accepted action with no handler can never be recorded as passed.
        if (settle(notPerformable(`step ${n}: this step has no runtime handler; nothing was asserted`), i, step)) continue;
        break;
      }
    }
    // The guard is a hard failure: a dismissal that left the approved origin replaces any earlier result of the case.
    if (overlayWatch !== null && overlayWatch.offOriginAt() !== null) {
      const at = /** @type {number} */ (overlayWatch.offOriginAt());
      failedIdx.push(at - 1);
      verdict = blocked('FAILED_NON_LOCAL_TARGET', `step ${at}: an overlay dismissal left the guard-approved origin; nothing further was acted on`);
    }
    // Evidence after the last step: a full-page screenshot, or redacted text when the page text holds a secret.
    try {
      const bodyText = await page.innerText('body').catch(() => '');
      if (containsSecret(bodyText, ctx.table)) {
        evidence.push(writeEvidence(ctx, `case-${kase.index}.txt`, { kind: 'text', value: bodyText }));
      } else {
        const png = await captureFinalPng(page, [page.locator('input[type=password]'), ...valueMasks]);
        evidence.push(writeEvidence(ctx, `case-${kase.index}.png`, { kind: 'binary', value: png }));
      }
    } catch {
      if (verdict === null || verdict.outcome !== 'blocked') {
        return blocked('EVIDENCE_WRITE_FAILED', 'the browser evidence could not be captured or written', evidence);
      }
    }
    // The final capture reflects the state after the last step that ran, so it is attributed to that step.
    const recordedRaw = markFailedSteps(recordSteps(plan.steps, ranTo + 1, -1, (j) => queryEvidence.get(j) ?? (j === executedTo ? evidence[0] ?? null : null)), failedIdx);
    // Gap records are applied only to indexes the loop reached: a verdict that ended the case first leaves later steps not-run.
    const reachedGaps = gapSteps.filter((g) => g.at <= ranTo);
    const causeRecorded = [...causeAt].reduce((recs, [at, cause]) => attachStepCause(recs, at, cause), recordedRaw);
    const recorded = overlayStoppedRecords(overlayGapRecords(causeRecorded, reachedGaps, truncateAt !== null && ranTo >= truncateAt ? truncateAt : null), stoppedAt);
    verdict = gapVerdict(verdict, gapSteps);
    // A captured judge step waits for a verdict only when no other step ended the case; otherwise it is moot.
    const stepsOut = recorded.map((rec, j) => (judgeKinds.has(j)
      ? { ...rec, result: verdict === null ? PENDING_JUDGMENT : 'not-judged', kind: judgeKinds.get(j), scope_evidence: judgeScope.get(j) ?? null }
      : rec));
    /** @type {string[]} */ const overlayEvidence = [];
    if ((overlayWatch !== null && overlayWatch.firings().length > 0) || overlaySkipped.length > 0) {
      try {
        overlayEvidence.push(writeEvidence(ctx, `case-${kase.index}.overlay.json`, {
          kind: 'json',
          value: summarizeOverlayWatch(overlayWatch === null ? [] : overlayWatch.registered, overlaySkipped.map((/** @type {any} */ s) => ({ id: s.id, reason: s.reason })), overlayWatch === null ? [] : overlayWatch.firings()),
        }));
      } catch {
        if (verdict === null || verdict.outcome !== 'blocked') return blocked('EVIDENCE_WRITE_FAILED', 'the overlay evidence could not be written');
      }
    }
    const allEvidence = [...queryEvidence.values(), ...judgeScope.values(), ...overlayEvidence, ...evidence];
    if (verdict !== null) return { ...verdict, evidence: allEvidence, steps: stepsOut };
    if (pendingAt.length > 0) return { outcome: PENDING_JUDGMENT, reason_code: null, reason: null, evidence: allEvidence, steps: stepsOut, pending_judgment: pendingAt.map((j) => j + 1) };
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

/** Extensions tried, in order, when a relative specifier names no file as written. */
const SOURCE_EXTENSIONS = ['', '.mjs', '.js', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts'];

/** The relative specifiers a test file imports statically: `from` forms, a bare side-effect form and a literal `require`. */
const STATIC_IMPORT_PATTERNS = [
  /(?:^|[^\w$.])(?:import|export)\s[^'";]*?\sfrom\s*['"](\.{1,2}\/[^'"\r\n]+)['"]/g,
  /(?:^|[^\w$.])import\s*['"](\.{1,2}\/[^'"\r\n]+)['"]/g,
  /(?:^|[^\w$.])require\(\s*['"](\.{1,2}\/[^'"\r\n]+)['"]\s*\)/g,
];

/**
 * The repository-relative path of the file a relative specifier names, or null when none exists or it leaves the root.
 * @param {string} fromFile absolute path of the importing file
 * @param {string} spec
 * @param {string} rootAbs
 * @returns {string | null}
 */
function resolveRelativeImport(fromFile, spec, rootAbs) {
  const base = resolve(dirname(fromFile), spec);
  const stem = base.replace(/\.[mc]?js$/, '');
  const candidates = SOURCE_EXTENSIONS.map((ext) => base + ext);
  if (stem !== base) for (const ext of ['.ts', '.tsx', '.mts', '.cts']) candidates.push(stem + ext);
  for (const ext of SOURCE_EXTENSIONS.slice(1)) candidates.push(join(base, `index${ext}`));
  for (const candidate of candidates) {
    try {
      if (!statSync(candidate).isFile()) continue;
    } catch {
      continue;
    }
    const rel = relative(rootAbs, candidate);
    return rel === '' || rel.startsWith('..') || isAbsolute(rel) ? null : fwd(rel);
  }
  return null;
}

/**
 * Whether git reports a file changed after an instant: its last commit is later, or it has uncommitted changes and
 * its modification time is later. A git failure is never "changed".
 * @param {ProcessRunner} run
 * @param {string} root
 * @param {string} rel
 * @param {number} generatedMs
 * @returns {boolean}
 */
function changedAfter(run, root, rel, generatedMs) {
  const log = gitCall(run, root, ['log', '-1', '--format=%ct', '--', rel]);
  const committedMs = !log.error && log.status === 0 ? Number(String(log.stdout).trim()) * 1000 : Number.NaN;
  if (Number.isFinite(committedMs) && committedMs > generatedMs) return true;
  const status = gitCall(run, root, ['status', '--porcelain', '--', rel]);
  if (status.error || status.status !== 0 || String(status.stdout).trim() === '') return false;
  try {
    return statSync(join(root, rel)).mtimeMs > generatedMs;
  } catch {
    return false;
  }
}

/**
 * The source files that cited test files import statically (one level) and that git reports changed after the
 * record's `generated_at`. Pure of the outcome: it only reads. Total: anything it cannot read or ask is an empty list,
 * and outside a git work tree it is always empty.
 * @param {string} root the target root
 * @param {string[]} citedPaths repository-relative paths of the cited test files
 * @param {string} generatedAt the record's `generated_at`
 * @param {ProcessRunner} [run] injectable so a test drives it without git
 * @returns {string[]} sorted repository-relative paths
 */
export function recordStaleSources(root, citedPaths, generatedAt, run = spawnSync) {
  try {
    const generated = isStr(generatedAt) ? Date.parse(generatedAt) : Number.NaN;
    if (!isStr(root) || !Array.isArray(citedPaths) || Number.isNaN(generated)) return [];
    if (!insideWorkTree(run, root)) return [];
    const rootAbs = resolve(root);
    /** @type {Set<string>} */ const sources = new Set();
    for (const cited of citedPaths) {
      if (!isStr(cited)) continue;
      const abs = resolve(rootAbs, cited);
      const own = relative(rootAbs, abs);
      if (own === '' || own.startsWith('..') || isAbsolute(own)) continue;
      /** @type {string} */ let text;
      try {
        const st = statSync(abs);
        if (!st.isFile() || st.size > 524288) continue;
        text = readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      for (const pattern of STATIC_IMPORT_PATTERNS) {
        for (const hit of text.matchAll(pattern)) {
          const rel = resolveRelativeImport(abs, hit[1], rootAbs);
          if (rel !== null && rel !== fwd(own)) sources.add(rel);
        }
      }
    }
    return [...sources].filter((rel) => changedAfter(run, rootAbs, rel, generated)).sort();
  } catch {
    return [];
  }
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
    return { block: blocked('FAILED_BROWSER_UNAVAILABLE', BROWSER_UNAVAILABLE_REASON) };
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
      const stale = recordStaleSources(root, resolved.value.files.map((/** @type {{ cited: string }} */ f) => f.cited), resolved.value.record_generated_at);
      const value = stale.length > 0 ? { ...resolved.value, stale_sources: stale } : resolved.value;
      const evidence = writeEvidence(evCtx, `case-${kase.index}.record.json`, { kind: 'json', value });
      return { result: { outcome: resolved.outcome, reason_code: 'AUTOMATED_EVIDENCE', reason: resolved.reason, evidence: [evidence], ...(stale.length > 0 ? { record_stale: stale } : {}) }, driver: null, role: null };
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
  // The chosen inputs are checked for shape before anything else is read, and a write is allowed only for a role the
  // kit declares dedicated. Both refusals come before the query module, the target, any seed, session or request.
  const invalidChosen = validateChosenInputs(driver, p.steps, p.chosen_inputs);
  if (invalidChosen) return out(needsHuman(invalidChosen.code, invalidChosen.reason));
  const invalidJudge = validateJudgeCriteria(p.steps, kase.manual_steps_verbatim);
  if (invalidJudge) return out(needsHuman(invalidJudge.code, invalidJudge.reason));
  const invalidSubmit = validateValidationSubmits(p.steps, kase.manual_steps_verbatim);
  if (invalidSubmit) return out(needsHuman(invalidSubmit.code, invalidSubmit.reason));
  const effectAt = firstEffectStep(p.steps);
  if (effectAt !== -1) {
    const kitConfig = ctxOrNull ? ctxOrNull.loginConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json'));
    if (!isDedicatedRole(kitConfig, role)) {
      return out(blocked('ROLE_NOT_DEDICATED', `step ${effectAt + 1}: ${REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason}`));
    }
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
  if (p.chosen_inputs !== undefined) {
    const chosenRefusal = chosenSnapshotRefusal(p.steps, p.chosen_inputs, loadGroundingSnapshots(ctx.runDirAbs));
    if (chosenRefusal) return out(needsHuman(chosenRefusal.code, chosenRefusal.reason));
  }
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'request' || s.origin === undefined) continue;
    const r = await resolveApiOrigin(ctx, s, i + 1);
    if (!r.ok) return out(r.result);
    if (r.spec.header !== null && role === null && s.session !== 'none') {
      return out(blocked('API_HEADER_NO_SESSION', `step ${i + 1}: the origin ${r.spec.name} derives a header from the role session, but the plan entry names no role`));
    }
  }
  /** @type {number[]} */ let runtimeSteps = [];
  /** @type {{ at: number, kind: string }[]} */ let gapSteps = [];
  /** @type {number | null} */ let truncateAt = null;
  if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && (LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null || s.action === 'judge' && s.within !== undefined))) {
    const grounded = groundLocators(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role, p.chosen_inputs);
    runtimeSteps = grounded.runtime;
    gapSteps = grounded.gaps;
    truncateAt = grounded.truncateAt;
  }
  if (ctx.playwright === null) {
    return out(blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', PLAYWRIGHT_UNAVAILABLE_REASON));
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
  const channelSources = seedConfig && isObj(seedConfig) ? seedConfig.channel_sources : undefined;
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'read_message') continue;
    const src = classifyChannelSource(channelSources, s.channel, root);
    if (!src.ok) return out(src.code === 'EXTERNAL_CHANNEL' ? needsHuman(src.code, `step ${i + 1}: ${src.reason}`) : blocked(src.code, `step ${i + 1}: ${src.reason}`));
    if (src.kind === 'mailpit') {
      const g = await ctx.target.guard.checkTarget(src.url, { root });
      if (!g.ok) return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the declared mail source is not local; nothing was requested`));
    }
  }
  // Declared overlay handlers are read and refused here, before any state, session or request; only a browser case reads them.
  /** @type {any} */ let overlay = { ok: true, handlers: [], skipped: [] };
  if (driver === 'browser') {
    const kitForOverlay = ctxOrNull ? ctxOrNull.loginConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json'));
    overlay = classifyOverlayHandlers(seedConfig && isObj(seedConfig) ? seedConfig.overlay_handlers : undefined, isDedicatedRole(kitForOverlay, role));
    if (!overlay.ok) return out(blocked(overlay.code, overlay.reason));
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
  const ran = await fn(runCtx, kase, { ...p, steps, runtime_steps: runtimeSteps, gap_steps: gapSteps, truncate_at: truncateAt, overlay_handlers: overlay.handlers, overlay_skipped: overlay.skipped }, session);
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
      if (!OUTCOMES.includes(result.outcome) && !isPendingResult(result)) result = blocked('RUNNER_ERROR', 'an internal path produced a value outside the closed vocabulary');
      if (Array.isArray(result.record_stale) && result.record_stale.length > 0) {
        warnings.push({
          code: 'RECORD_STALE',
          message: `case ${c.index}: ${result.record_stale.length} source file(s) imported by the cited tests changed in git after the record was generated; the outcome is unchanged, re-run the cited tests before trusting it (the files are listed in the case evidence)`,
          case: c.index,
          files: result.record_stale,
        });
      }
      const finishedAt = now();
      const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';
      const pending = isPendingResult(result);
      entries.push({
        index: c.index,
        title: c.title,
        risk: c.risk,
        outcome: pending ? null : result.outcome,
        reason_code: result.reason_code,
        reason: result.reason,
        driver,
        role,
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)),
        evidence: result.evidence,
        steps: Array.isArray(result.steps) ? result.steps : [],
        manual_steps_verbatim: keepSteps || pending ? c.manual_steps_verbatim : null,
        ...(pending ? { pending_judgment: result.pending_judgment } : {}),
        ...(STEP_FAILURE_CAUSES.includes(result.cause) ? { cause: result.cause } : {}),
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
    const needsHuman = summarizeNeedsHuman(entries);
    const judgment = summarizeJudgment(entries);
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
      needs_human_impossible: needsHuman.needs_human_impossible,
      needs_human_gap: needsHuman.needs_human_gap,
      ...(judgment === null ? {} : { judgment }),
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
      `Needs-human steps: impossible=${needsHuman.needs_human_impossible} gap=${needsHuman.needs_human_gap}`,
      ...entries.filter((e) => e.outcome !== 'pass').map((e) => `  case ${e.index}: ${e.outcome === null ? 'pending-judgment' : e.outcome}${e.reason_code ? ` (${e.reason_code})` : ''}`),
      ...(judgment !== null && judgment.pending_steps > 0
        ? [`Pending judgment: ${judgment.pending_steps} step(s); record each verdict with qa-run.mjs judge`,
          ...entries.flatMap((e) => (Array.isArray(e.steps) ? e.steps : []).filter((/** @type {any} */ s) => s.result === PENDING_JUDGMENT).map((/** @type {any} */ s) => `  judge case ${e.index} step ${s.index} (${s.kind}): ${s.evidence}${s.scope_evidence ? ` and ${s.scope_evidence}` : ''}`))]
        : []),
      `Results: ${runDirRel}/results.json`,
      `Evidence: ${runDirRel}/evidence/`,
    ];
    for (const w of warnings) lines.push(`WARNING ${w.code}: ${w.message}`);
    if (aborted) lines.push(`RUN ABORTED: ${aborted.reason_code}`);
    if (shaAfter !== shaBefore) {
      process.stderr.write(`FAILED_REPORT_MODIFIED: ${reportRel} changed during the run\n`);
      exitCode = 1;
    }
    if (entries.some((e) => e.reason_code === 'FAILED_PLAYWRIGHT_UNAVAILABLE')) {
      process.stderr.write(`FAILED_PLAYWRIGHT_UNAVAILABLE: ${playwrightUnavailableText(PLUGIN_ROOT)}\n`);
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
  if (loc.form === 'scoped') return null;
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
 * @param {{ setStep: (n: number) => void } | null} [watch] told the one-based step position before each step acts
 * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
 */
export async function replayGroundingPrefix(page, steps, target, watch = null) {
  for (const [i, step] of steps.entries()) {
    const n = i + 1;
    if (watch !== null && typeof watch.setStep === 'function') watch.setStep(n);
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
  if (playwright === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', playwrightUnavailableText(PLUGIN_ROOT));
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
  // Declared overlay handlers are read and refused here, before any session or browser.
  const groundSeed = readJsonOrNull(join(root, 'PRPs', 'auth', 'qa-seed.json'));
  const groundOverlay = classifyOverlayHandlers(groundSeed && isObj(groundSeed) ? groundSeed.overlay_handlers : undefined, isDedicatedRole(ctx.loginConfig, role));
  if (!groundOverlay.ok) throw new Halt(groundOverlay.code, groundOverlay.reason);
  /** @type {string | null} */ let storagePath = null;
  if (role !== null) {
    const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    if (!Object.hasOwn(roles, role)) throw new Halt('ROLE_UNDECLARED', `role ${role} is not declared in PRPs/auth/login.config.json`);
    const s = obtainSession(ctx, role);
    if (!s.ok && s.code === 'FAILED_KIT_SCRIPT_STALE') {
      throw new Halt('FAILED_KIT_SCRIPT_STALE', `the kit login script for role ${role} was generated from a different template than the installed one (${s.detail ?? 'identities unknown'}); run /relay-auth-scripts --role ${role} --refresh`);
    }
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
    throw new Halt('FAILED_BROWSER_UNAVAILABLE', browserUnavailableText(PLUGIN_ROOT));
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
    const groundWatch = groundOverlay.handlers.length > 0 ? await registerOverlayHandlers(page, groundOverlay.handlers, target) : null;
    if (groundOverlay.handlers.length > 0 && groundWatch === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', 'the installed Playwright cannot register overlay handlers (version 1.44 or newer is needed); nothing was written');
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      if (resp !== null && resp.status() >= 500) throw new Error('server error');
    } catch {
      throw new Halt('TARGET_UNREACHABLE', 'the route could not be loaded');
    }
    if (prefix !== null) {
      const replayed = await replayGroundingPrefix(page, prefix, target, groundWatch);
      if (!replayed.ok) throw new Halt('GROUND_PREFIX_FAILED', replayed.reason);
    }
    if (groundWatch !== null) {
      if (groundWatch.offOriginAt() !== null) throw new Halt('FAILED_NON_LOCAL_TARGET', 'an overlay dismissal left the guard-approved origin; nothing was written');
      groundWatch.setStep(prefix === null ? 0 : prefix.length);
      // A trial hover runs Playwright's actionability checks without acting, which is what runs the handlers: a load-time overlay is dismissed before the snapshot.
      await page.locator('body').hover({ trial: true, timeout: 3000 }).catch(() => {});
      if (groundWatch.offOriginAt() !== null) throw new Halt('FAILED_NON_LOCAL_TARGET', 'an overlay dismissal left the guard-approved origin; nothing was written');
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
    if (groundWatch !== null) {
      for (const f of groundWatch.firings()) process.stdout.write(`OVERLAY_DISMISSED: ${f.handler} step ${f.step} ${f.result}\n`);
    }
    for (const sk of groundOverlay.skipped) process.stdout.write(`OVERLAY_HANDLER_SKIPPED: ${sk.id}\n`);
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

/** The probe path of the session directory; `git check-ignore` evaluates the pathname, so it need not exist. */
export const PREFLIGHT_SESSION_PROBES = Object.freeze(['PRPs/auth/.sessions/probe.json']);

/**
 * The environment check behind `qa-run.mjs preflight`: one line per check and a final line. It reads files and
 * asks git; it makes no network request, starts no browser and writes nothing.
 * @param {string} root the target root
 * @param {{ pluginRoot?: string, run?: ProcessRunner }} [opts] injectable so a test drives it without the real plugin directory or git
 * @returns {{ ok: boolean, lines: string[], failures: number }}
 */
export function runPreflight(root, opts = {}) {
  const pluginRoot = opts.pluginRoot ?? PLUGIN_ROOT;
  const run = opts.run ?? spawnSync;
  /** @type {string[]} */ const lines = [];
  let failures = 0;
  /** @param {string} code @param {string} detail */
  const fail = (code, detail) => {
    failures++;
    lines.push(`PREFLIGHT ${code}: ${detail}`);
  };
  const pw = describePlaywright(root, pluginRoot);
  if (pw.playwright === null) {
    fail('FAILED_PLAYWRIGHT_UNAVAILABLE', playwrightUnavailableText(pluginRoot));
    lines.push('PREFLIGHT chromium: skipped (playwright is not resolvable)');
  } else {
    lines.push(`PREFLIGHT playwright: ok ${pw.path ?? 'path unknown'}${pw.version !== null ? ` (version ${pw.version})` : ''}`);
    /** @type {any} */ let exe = null;
    try {
      exe = pw.playwright.chromium.executablePath();
    } catch {
      exe = null;
    }
    if (isStr(exe) && exe !== '' && existsSync(exe)) lines.push('PREFLIGHT chromium: ok');
    else fail('FAILED_BROWSER_UNAVAILABLE', browserUnavailableText(pluginRoot));
  }
  const stale = staleKitRoles(root);
  if (stale.length === 0) lines.push('PREFLIGHT kit: ok (every kit login script is current)');
  for (const s of stale) fail('FAILED_KIT_SCRIPT_STALE', `role ${s.role} (${s.detail}); run /relay-auth-scripts --role ${s.role} --refresh`);
  if (!insideWorkTree(run, root)) {
    lines.push('PREFLIGHT sessions: ok (not inside a git work tree; nothing there can be committed)');
  } else {
    const unproven = PREFLIGHT_SESSION_PROBES.filter((probe) => {
      const r = gitCall(run, root, ['check-ignore', '-q', '--', probe]);
      return Boolean(r.error) || r.status !== 0;
    });
    if (unproven.length === 0) lines.push('PREFLIGHT sessions: ok (PRPs/auth/.sessions/ is ignored)');
    else fail('FAILED_IGNORE_UNPROVEN', 'PRPs/auth/.sessions/ is not proven ignored by git; add PRPs/auth/.sessions/ to the project .gitignore');
  }
  lines.push(failures === 0 ? 'PREFLIGHT: ok' : `PREFLIGHT: FAILED (${failures} check(s))`);
  return { ok: failures === 0, lines, failures };
}

const PREFLIGHT_USAGE = `Usage:
${PREFLIGHT_USAGE_LINE}
  Reads files and asks git; it makes no network request and writes nothing. Exit 1 when any check fails.
`;

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runPreflightGuarded(argv) {
  if (argv.length !== 2 || argv[0] !== '--root' || argv[1].startsWith('--')) {
    process.stderr.write(PREFLIGHT_USAGE);
    return 2;
  }
  const root = resolve(argv[1]);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    process.stderr.write(`--root must be an existing directory\n${PREFLIGHT_USAGE}`);
    return 2;
  }
  try {
    const result = runPreflight(root);
    process.stdout.write(`${result.lines.join('\n')}\n`);
    return result.ok ? 0 : 1;
  } catch {
    process.stderr.write('FAILED_RUNNER_ERROR: the runner stopped on an unexpected error\n');
    return 1;
  }
}

/**
 * Parses the arguments of the judge mode. Pure and total. Every flag takes a value that does not start with `--`;
 * `--case` and `--step` are positive integers, `--verdict` is one of JUDGE_VERDICTS and `--evidence` is a text of
 * JUDGE_EVIDENCE_MIN to JUDGE_EVIDENCE_MAX characters once trimmed. A refusal carries a fixed sentence that names a
 * flag and never a value.
 * @param {any} argv
 * @returns {{ ok: true, root: string, runDir: string, caseIndex: number, stepIndex: number, verdict: string, evidence: string } | { ok: false, why: string }}
 */
export function parseJudgeArgs(argv) {
  /** @param {string} why @returns {{ ok: false, why: string }} */
  const refuse = (why) => ({ ok: false, why });
  if (!Array.isArray(argv)) return refuse('JUDGE_ARGUMENTS_INVALID: the arguments must be a list');
  /** @type {Record<string, string>} */ const given = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!isStr(a) || !['--root', '--run-dir', '--case', '--step', '--verdict', '--evidence'].includes(a)) return refuse('JUDGE_ARGUMENTS_INVALID: an unknown argument');
    const v = argv[i + 1];
    if (!isStr(v) || v.startsWith('--')) return refuse(`JUDGE_ARGUMENTS_INVALID: ${a} needs a value`);
    if (Object.hasOwn(given, a)) return refuse(`JUDGE_ARGUMENTS_INVALID: ${a} is given twice`);
    given[a] = v;
    i++;
  }
  if (!Object.hasOwn(given, '--run-dir')) return refuse('JUDGE_ARGUMENTS_INVALID: --run-dir is required');
  if (!Object.hasOwn(given, '--case') || !/^[1-9]\d*$/.test(given['--case'])) return refuse('JUDGE_ARGUMENTS_INVALID: --case must be a positive integer');
  if (!Object.hasOwn(given, '--step') || !/^[1-9]\d*$/.test(given['--step'])) return refuse('JUDGE_ARGUMENTS_INVALID: --step must be a positive integer');
  if (!Object.hasOwn(given, '--verdict') || !JUDGE_VERDICTS.includes(given['--verdict'])) return refuse('JUDGE_ARGUMENTS_INVALID: --verdict must be pass, fail or uncertain');
  const evidence = Object.hasOwn(given, '--evidence') ? given['--evidence'].trim() : '';
  if (evidence === '') return refuse('JUDGE_EVIDENCE_REQUIRED: a verdict is recorded only with --evidence, the text of what the capture shows');
  if (evidence.length < JUDGE_EVIDENCE_MIN || evidence.length > JUDGE_EVIDENCE_MAX) {
    return refuse(`JUDGE_EVIDENCE_REQUIRED: --evidence must be ${JUDGE_EVIDENCE_MIN} to ${JUDGE_EVIDENCE_MAX} characters`);
  }
  return { ok: true, root: resolve(Object.hasOwn(given, '--root') ? given['--root'] : process.cwd()), runDir: given['--run-dir'], caseIndex: Number(given['--case']), stepIndex: Number(given['--step']), verdict: given['--verdict'], evidence };
}

/**
 * The final outcome of a case whose judge steps all have a verdict: any `failed` judge step gives `fail`, else any
 * `uncertain` one gives `needs-human` with `JUDGEMENT_UNCERTAIN`, else `pass`; a `pass` of a plan entry with
 * `human_remainder` becomes `PARTIAL_REMAINDER` through `applyPartialRemainder`. A reason is a fixed sentence with a
 * step position; it never carries the verdict text. Pure and total.
 * @param {any} entry the results.json case entry
 * @param {any} planEntry its plan entry, or undefined
 * @returns {CaseResult}
 */
export function settleJudgedCase(entry, planEntry) {
  const steps = isObj(entry) && Array.isArray(entry.steps) ? entry.steps : [];
  const evidence = isObj(entry) && Array.isArray(entry.evidence) ? entry.evidence : [];
  const judged = steps.filter((/** @type {any} */ s) => isObj(s) && s.action === 'judge');
  const failed = judged.find((/** @type {any} */ s) => s.result === 'failed');
  if (failed !== undefined) return { outcome: 'fail', reason_code: null, reason: `step ${failed.index}: the judged criterion was not met`, evidence, steps };
  const unsure = judged.find((/** @type {any} */ s) => s.result === 'uncertain');
  if (unsure !== undefined) {
    return { outcome: 'needs-human', reason_code: 'JUDGEMENT_UNCERTAIN', reason: `step ${unsure.index}: ${REASON_CATALOGUE.JUDGEMENT_UNCERTAIN.reason}`, evidence, steps };
  }
  return applyPartialRemainder({ outcome: 'pass', reason_code: null, reason: null, evidence, steps }, planEntry);
}

/**
 * Records one verdict in a parsed results.json and returns the recomputed document, or a refusal. The step must be a
 * `judge` step of a case that has no outcome yet and is still `pending-judgment`: a recorded verdict is never
 * replaced. When the case has no pending step left it is settled; the counts, the two needs-human counters, the
 * classification block and the judgment block are recomputed from the entries. Pure and total; the input is not
 * mutated and no reason carries the verdict text.
 * @param {any} results
 * @param {any} planEntry
 * @param {{ caseIndex: number, stepIndex: number, verdict: string, evidencePath: string }} req
 * @returns {{ ok: true, results: any, settled: boolean, pendingSteps: number } | { ok: false, code: string, reason: string }}
 */
export function applyJudgeVerdict(results, planEntry, req) {
  /** @param {string} code @param {string} reason @returns {{ ok: false, code: string, reason: string }} */
  const refuse = (code, reason) => ({ ok: false, code, reason });
  if (!isObj(results) || !Array.isArray(results.cases) || !isObj(req) || !JUDGE_VERDICTS.includes(req.verdict)) {
    return refuse('JUDGE_RESULTS_UNREADABLE', 'results.json is not a results document the judge mode can update');
  }
  const next = JSON.parse(JSON.stringify(results));
  const entry = next.cases.find((/** @type {any} */ c) => isObj(c) && c.index === req.caseIndex);
  const rec = isObj(entry) && Array.isArray(entry.steps) ? entry.steps.find((/** @type {any} */ s) => isObj(s) && s.index === req.stepIndex) : undefined;
  if (!isObj(entry) || entry.outcome !== null || !isObj(rec) || rec.action !== 'judge' || rec.result !== PENDING_JUDGMENT) {
    return refuse('JUDGE_STEP_NOT_PENDING', `step ${req.stepIndex} of case ${req.caseIndex} is not a judge step that awaits a verdict`);
  }
  rec.result = req.verdict === 'pass' ? 'passed' : req.verdict === 'fail' ? 'failed' : 'uncertain';
  rec.judged_by = 'model';
  rec.judgment_evidence = req.evidencePath;
  const waiting = entry.steps.filter((/** @type {any} */ s) => isObj(s) && s.action === 'judge' && s.result === PENDING_JUDGMENT);
  if (waiting.length === 0) {
    const settled = settleJudgedCase(entry, planEntry);
    entry.outcome = settled.outcome;
    entry.reason_code = settled.reason_code;
    entry.reason = settled.reason;
    entry.steps = settled.steps;
    delete entry.pending_judgment;
    if (settled.outcome !== 'needs-human' && settled.outcome !== 'blocked') entry.manual_steps_verbatim = null;
  } else {
    entry.pending_judgment = waiting.map((/** @type {any} */ s) => s.index);
  }
  const sums = summarizeEntries(next.cases);
  next.counts = sums.counts;
  next.record_resolved = sums.record_resolved;
  next.partially_executed = sums.partially_executed;
  const needs = summarizeNeedsHuman(next.cases);
  next.needs_human_impossible = needs.needs_human_impossible;
  next.needs_human_gap = needs.needs_human_gap;
  next.classification = summarizeClassification(next.cases);
  const judgment = summarizeJudgment(next.cases);
  if (judgment !== null) next.judgment = judgment;
  const pendingSteps = judgment === null ? 0 : judgment.pending_steps;
  return { ok: true, results: next, settled: waiting.length === 0, pendingSteps };
}

const JUDGE_USAGE = `Usage:
${JUDGE_USAGE_LINE}
  The verdict is recorded for one judge step that run left pending-judgment; --evidence is the text of what the capture visibly shows, never a secret or a personal value. A recorded verdict is never replaced.
`;

/**
 * Records one verdict of one pending judge step and rewrites results.json. It reads and writes only inside one run
 * directory, spawns nothing and calls no model. The verdict text goes to an evidence file under the ignored
 * `evidence/` directory through `writeEvidence`; results.json carries only fixed sentences and paths and is
 * rewritten through `writeRunFile`, the one writer.
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runJudge(argv) {
  const a = parseJudgeArgs(argv);
  if (!a.ok) {
    process.stderr.write(`${a.why}\n${JUDGE_USAGE}`);
    return 2;
  }
  const root = a.root;
  const runDirAbs = resolve(root, a.runDir);
  const runDirRel = fwd(relative(root, runDirAbs));
  if (!/^PRPs\/reports\/[a-z0-9][a-z0-9-]*\/qa-run\/[^/]+$/.test(runDirRel) || !existsSync(runDirAbs) || !statSync(runDirAbs).isDirectory()) {
    process.stderr.write(`--run-dir must be an existing run directory inside PRPs/reports/<feature>/qa-run/\n${JUDGE_USAGE}`);
    return 2;
  }
  requireRunIgnore(runDirAbs);
  const results = readJsonOrNull(join(runDirAbs, 'results.json'));
  if (!isObj(results) || results.schema_version !== 1 || !Array.isArray(results.cases)) {
    throw new Halt('JUDGE_RESULTS_UNREADABLE', 'results.json is missing or is not a results document; run the plan first');
  }
  const plan = readJsonOrNull(join(runDirAbs, 'plan.json'));
  const planEntry = isObj(plan) && Array.isArray(plan.cases) ? plan.cases.find((/** @type {any} */ e) => isObj(e) && e.index === a.caseIndex) : undefined;
  const table = buildRedactionTable({ root, env: process.env, secretValues: [] });
  const name = `case-${a.caseIndex}.judge-${a.stepIndex}.verdict.json`;
  const evidencePath = `${runDirRel}/evidence/${name}`;
  const applied = applyJudgeVerdict(results, planEntry, { caseIndex: a.caseIndex, stepIndex: a.stepIndex, verdict: a.verdict, evidencePath });
  if (!applied.ok) throw new Halt(applied.code, applied.reason);
  try {
    writeEvidence({ runDirAbs, runDirRel, table }, name, { kind: 'json', value: { case: a.caseIndex, step: a.stepIndex, verdict: a.verdict, evidence: a.evidence, recorded_at: now() } });
  } catch {
    throw new Halt('EVIDENCE_WRITE_FAILED', 'the verdict could not be written; results.json was not changed');
  }
  try {
    writeRunFile({ runDirAbs, table }, join(runDirAbs, 'results.json'), { kind: 'json', value: applied.results });
  } catch {
    throw new Halt('FAILED_RESULTS_WRITE_FAILED', 'results.json could not be written');
  }
  const settledEntry = applied.results.cases.find((/** @type {any} */ c) => isObj(c) && c.index === a.caseIndex);
  process.stdout.write(`JUDGED: case ${a.caseIndex} step ${a.stepIndex} verdict=${a.verdict}\n`);
  process.stdout.write(applied.settled ? `CASE_SETTLED: case ${a.caseIndex} outcome=${settledEntry.outcome}${settledEntry.reason_code ? ` (${settledEntry.reason_code})` : ''}\n` : `CASE_PENDING: case ${a.caseIndex} has ${settledEntry.pending_judgment.length} step(s) left\n`);
  process.stdout.write(applied.pendingSteps === 0 ? 'RESULTS: final\n' : `RESULTS: pending ${applied.pendingSteps} step(s)\n`);
  process.stdout.write(`${HUMAN_GATE_SENTENCE}\n`);
  return 0;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function runJudgeGuarded(argv) {
  try {
    return await runJudge(argv);
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
  if (argv[0] === 'judge') return await runJudgeGuarded(argv.slice(1));
  if (argv[0] === 'preflight') return await runPreflightGuarded(argv.slice(1));
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
