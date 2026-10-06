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
 *   node <plugin-root>/scripts/qa-run.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, or no mode
 * exit 2 without writing (see USAGE / parseArgs).
 *
 * Modes:
 *   parse  prints the report's cases as JSON; read-only.
 *   init   resolves the local target, runs the local-only guard, then creates
 *          the run directory and prints RUN_ID, RUN_DIR and BASE_URL_ORIGIN.
 *   run    executes `<run-dir>/plan.json` against the report's cases and writes
 *          `<run-dir>/results.json` with exactly one entry per case.
 *
 * Exit codes: 0 completed, 1 a named FAILED_* halt or an aborted run, 2 bad
 * arguments.
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
 * applied in memory before any evidence byte is written.
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
/** The identity stamp line the login template carries and a generated script copies verbatim. */
const KIT_STAMP_PATTERN = /^const KIT_TEMPLATE_ID = '([^']+)';$/m;
/** A sentence only a template-generated login script contains (hand-written or stub scripts are not judged). */
const KIT_SCRIPT_MARKER = 'Login script for one role of the test-auth kit';
/** How long the anonymous check waits for the authenticated-only marker to (not) appear. */
const ANONYMOUS_CHECK_MS = 20000;
const HUMAN_GATE_SENTENCE =
  'HUMAN GATE STILL OPEN: a runner pass is evidence, not approval. No Manual status was changed and no phase status advanced.';

const USAGE = `Usage:
  qa-run.mjs parse --report <path>
  qa-run.mjs init  --root <dir> --feature <slug> [--env-handle <path>]
  qa-run.mjs run   --root <dir> --feature <slug> --run-dir <rel-dir> [--env-handle <path>] [--max-cases <n>]
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
const BROWSER_ACTIONS = ['goto', 'click', 'fill', 'expect_visible', 'expect_text', 'expect_url', 'query'];
const API_HEADER_FORBIDDEN = ['host', 'content-length', 'cookie', 'transfer-encoding'];
const LOCATOR_ACTIONS = ['click', 'fill', 'expect_visible', 'expect_text'];
const LOCATOR_ROLES = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'heading', 'tab', 'menuitem', 'option', 'switch', 'searchbox', 'spinbutton', 'slider', 'dialog', 'alert', 'status', 'row', 'cell', 'columnheader', 'listitem', 'img', 'navigation', 'region', 'table', 'menu', 'tabpanel'];

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
    const loc = LOCATOR_ACTIONS.includes(s.action) ? locatorOf(s) : null;
    if (loc !== null) {
      if (!loc.ok) return bad(`${s.action}: ${loc.why}`);
      if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');
      if (s.action === 'expect_text' && !isStr(s.contains)) return bad('expect_text needs a string contains');
      return { expectations: s.action === 'expect_visible' || s.action === 'expect_text' ? 1 : 0 };
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
  for (const [i, s] of steps.entries()) {
    const r = stepRules(driver, s);
    if ('why' in r) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${r.why}` };
    expectations += r.expectations;
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name)) {
        return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: variable ${name} is not bound by a capture declared for this case` };
      }
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

/**
 * Role-and-name and text candidates from the text `locator.ariaSnapshot()` returns. Pure.
 * @param {any} yaml
 * @returns {({ kind: 'role', role: string, name: string } | { kind: 'text', text: string })[]}
 */
export function parseAriaSnapshot(yaml) {
  if (!isStr(yaml)) return [];
  /** @type {({ kind: 'role', role: string, name: string } | { kind: 'text', text: string })[]} */ const out = [];
  const seen = new Set();
  for (const line of yaml.split(/\r?\n/)) {
    if (out.length >= 300) break;
    /** @type {any} */ let cand = null;
    const m = /^\s*-\s+([a-z]+)\s+"((?:[^"\\]|\\.)*)"/.exec(line);
    if (m !== null) {
      const name = m[2].replace(/\\(["\\])/g, '$1');
      if (LOCATOR_ROLES.includes(m[1]) && name.trim() !== '') cand = { kind: 'role', role: m[1], name };
    } else {
      const t = /^\s*-\s+text:\s*(.+?)\s*$/.exec(line);
      if (t !== null && t[1].trim() !== '' && t[1].length <= 200) cand = { kind: 'text', text: t[1] };
    }
    if (cand === null) continue;
    const key = JSON.stringify(cand);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
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
    const snap = route === null ? undefined : snapshots.find((s) => isObj(s) && s.role === wantRole && s.route === route);
    if (snap === undefined) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step` };
    }
    const entry = (Array.isArray(snap.entries) ? snap.entries : []).find((/** @type {any} */ e) =>
      isObj(e) && (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
    if (entry === undefined) return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator is not a snapshot entry` };
    if (entry.matches !== 1) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator matched ${entry.matches} elements in the snapshot; a locator must match exactly one` };
    }
    if (step.action === 'expect_text') {
      const ok = isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains));
      if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_text contains must come from the report's own steps, not from the snapshot` };
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
  if (r.spec.header === null) return { ok: true, url: r.url, headers: null };
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

const BODY_LIMIT = 65536;
const EVIDENCE_HEADERS = ['content-type', 'content-length', 'location', 'cache-control'];

DRIVERS.http = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ const opts = { baseURL: target.origin };
  if (session && session.path) opts.storageState = session.path;
  if (session && session.token) opts.extraHTTPHeaders = sessionAuthHeaders(session);
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
      /** @type {any} */ let resp;
      try {
        /** @type {any} */ const fo = { method: step.method, maxRedirects: 0, timeout: 10000, failOnStatusCode: false };
        if (step.body !== undefined) fo.data = step.body;
        if (apiStep !== null && apiStep.headers !== null) fo.headers = apiStep.headers;
        resp = await reqCtx.fetch(url, fo);
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
            value: { request: { method: step.method, path: step.path }, response: { status, headers: keptHeaders, body }, ...(apiStep !== null ? { origin: step.origin } : {}) },
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
 * case, or null when the step passed. A reason never carries a locator value, a fill value or page text.
 * @param {any} page
 * @param {any} step
 * @param {{ ok: true, form: 'role', role: string, name: string } | { ok: true, form: 'text', text: string }} loc
 * @param {number} n
 * @returns {Promise<CaseResult | null>}
 */
async function runLocatorStep(page, step, loc, n) {
  const target = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });
  // The wait only gives the page time to render; the decision is the count.
  await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await target.count().catch(() => 0);
  if (count > 1) {
    return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on`);
  }
  const expects = step.action === 'expect_visible' || step.action === 'expect_text';
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
  const text = await target.textContent({ timeout: 10000 }).catch(() => null);
  if (text === null || !text.includes(step.contains)) {
    return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
  }
  return null;
}

DRIVERS.browser = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ let browser = null;
  try {
    browser = await ctx.playwright.chromium.launch({ headless: true });
  } catch {
    return blocked('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/');
  }
  /** @type {any} */ let context = null;
  /** @type {string[]} */ const evidence = [];
  /** @type {Map<number, string>} */ const queryEvidence = new Map();
  try {
    context = await browser.newContext(session && session.path ? { storageState: session.path } : {});
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    /** @type {CaseResult | null} */ let verdict = null;
    let ranTo = -1;
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
      const lstep = LOCATOR_ACTIONS.includes(step.action) ? locatorOf(step) : null;
      if (lstep !== null && lstep.ok) {
        const lr = await runLocatorStep(page, step, lstep, n);
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
      }
    }
    // Evidence after the last step: a screenshot, or redacted text when the page text holds a secret.
    try {
      const bodyText = await page.innerText('body').catch(() => '');
      if (containsSecret(bodyText, ctx.table)) {
        evidence.push(writeEvidence(ctx, `case-${kase.index}.txt`, { kind: 'text', value: bodyText }));
      } else {
        const png = await page.screenshot({ mask: [page.locator('input[type=password]')] });
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
    const r = spawnSync(process.execPath, [script, '--root', ctx.root, '--plugin-root', PLUGIN_ROOT], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      encoding: 'utf8',
      timeout: 120000,
    });
    if (r.status === 0) {
      const sessionPath = join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.json`);
      const state = readJsonOrNull(sessionPath);
      if (state === null) {
        result = { ok: false, code: 'FAILED_SESSION_UNREADABLE' };
      } else {
        /** @type {string[]} */ const secrets = [];
        for (const c of Array.isArray(state.cookies) ? state.cookies : []) if (c && isStr(c.value)) secrets.push(c.value);
        for (const o of Array.isArray(state.origins) ? state.origins : []) {
          for (const e of Array.isArray(o && o.localStorage) ? o.localStorage : []) if (e && isStr(e.value)) secrets.push(e.value);
        }
        const tok = readJsonOrNull(join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.token.json`));
        const token = tok && isStr(tok.token) && tok.token !== '' ? tok.token : null;
        if (token !== null) secrets.push(token);
        addSecretValues(ctx.table, secrets);
        const header = tok && isStr(tok.header) && /^[A-Za-z0-9-]+$/.test(tok.header) ? tok.header : null;
        const valuePrefix = header !== null && tok && isStr(tok.value_prefix) ? tok.value_prefix : null;
        result = { ok: true, info: { path: sessionPath, token, header, valuePrefix } };
      }
    } else {
      const m = /FAILED_[A-Z_]+/.exec(String(r.stderr ?? ''));
      result = { ok: false, code: m ? m[0] : 'FAILED_LOGIN_UNKNOWN' };
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
    if (isObj(d) && d.schema_version === 1 && isStr(d.role) && isStr(d.route) && Array.isArray(d.entries)) docs.push(d);
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
    if (r.spec.header !== null && role === null) {
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
  process.stdout.write(`RUN_ID: ${runId}\nRUN_DIR: ${runDirRel}\nBASE_URL_ORIGIN: ${target ? target.origin : 'none'}\n`);
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
    const { counts, record_resolved: recordResolved, partially_executed: partiallyExecuted } = summarizeEntries(entries);
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

const GROUND_USAGE = `Usage:
  qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>]
`;

/**
 * @param {string[]} argv
 * @returns {{ root: string, feature: string, runDir: string, route: string, role: string | null, envHandle: string | null } | null}
 */
function parseGroundArgs(argv) {
  let root = process.cwd();
  /** @type {string | null} */ let feature = null;
  /** @type {string | null} */ let runDir = null;
  /** @type {string | null} */ let route = null;
  /** @type {string | null} */ let role = null;
  /** @type {string | null} */ let envHandle = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!['--root', '--feature', '--run-dir', '--route', '--role', '--env-handle'].includes(a)) return null;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) return null;
    i++;
    if (a === '--root') root = resolve(v);
    else if (a === '--feature') feature = v;
    else if (a === '--run-dir') runDir = v;
    else if (a === '--route') route = v;
    else if (a === '--role') role = v;
    else envHandle = v;
  }
  if (feature === null || !FEATURE_PATTERN.test(feature)) return null;
  if (runDir === null || route === null || !/^\/(?!\/)/.test(route)) return null;
  if (role !== null && !ROLE_PATTERN.test(role)) return null;
  return { root, feature, runDir, route, role, envHandle };
}

// The ground mode: `qa-run.mjs ground` takes a redacted accessibility snapshot of one route, with one
// role's saved session, behind the local-only guard, and writes the role-and-name and text candidates of
// the page (each with its real match count) to <run-dir>/grounding/<role>--<slug>.snapshot.json.
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
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const yaml = await page.locator('body').ariaSnapshot().catch(() => null);
    if (!isStr(yaml)) throw new Halt('GROUND_SNAPSHOT_UNAVAILABLE', 'the installed Playwright cannot produce an accessibility snapshot');
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
    const key = routeKey(route) ?? '/';
    const slug = key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'root';
    const dest = join(runDirAbs, 'grounding', `${role ?? 'anonymous'}--${slug}.snapshot.json`);
    try {
      writeRunFile({ runDirAbs, table }, dest, { kind: 'json', value: { schema_version: 1, role: role ?? 'anonymous', route: key, entries: kept, withheld } });
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
