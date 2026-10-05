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
 * @typedef {{ outcome: string, reason_code: string | null, reason: string | null, evidence: string[] }} CaseResult
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

/**
 * Validates a plan entry's steps against the closed vocabulary.
 * @param {string} driver
 * @param {any[]} steps
 * @returns {{ code: string, reason: string } | null}
 */
function validateSteps(driver, steps) {
  let expectations = 0;
  for (const [i, s] of steps.entries()) {
    const bad = (/** @type {string} */ why) => ({ code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${why}` });
    if (!isObj(s) || !isStr(s.action)) return bad('not an object with a string action');
    if (driver === 'http') {
      if (s.action !== 'request') return bad(`unknown http action ${JSON.stringify(s.action)}`);
      if (!HTTP_METHODS.includes(s.method)) return bad('method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
      if (!isStr(s.path)) return bad('path must be a string');
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
  }
  if (expectations === 0) return { code: 'NO_EXPECTATION', reason: 'the plan entry carries no expectation step, so no pass could be earned' };
  return null;
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
  try {
    reqCtx = await ctx.playwright.request.newContext(opts);
    for (const [i, step] of plan.steps.entries()) {
      const url = resolveStepUrl(step.path, target);
      if (url === null) return blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`, evidence);
      /** @type {any} */ let resp;
      try {
        /** @type {any} */ const fo = { method: step.method, maxRedirects: 0, timeout: 10000, failOnStatusCode: false };
        if (step.body !== undefined) fo.data = step.body;
        resp = await reqCtx.fetch(url, fo);
      } catch (err) {
        return blocked('TARGET_UNREACHABLE', `step ${i + 1}: the request failed or timed out`, evidence);
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
            value: { request: { method: step.method, path: step.path }, response: { status, headers: keptHeaders, body } },
          }),
        );
      } catch {
        return blocked('EVIDENCE_WRITE_FAILED', `step ${i + 1}: the evidence could not be written`, evidence);
      }
      if (step.expect_status !== undefined && status !== step.expect_status) {
        return { outcome: 'fail', reason_code: null, reason: `step ${i + 1}: expected status ${step.expect_status}, got ${status}`, evidence };
      }
      if (step.expect_body_contains !== undefined && !bodyText.includes(step.expect_body_contains)) {
        return { outcome: 'fail', reason_code: null, reason: `step ${i + 1}: the expected body text was not present`, evidence };
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
          return { outcome: 'fail', reason_code: null, reason: `step ${i + 1}: the JSON value at ${step.expect_json.path} did not equal the expected value`, evidence };
        }
      }
    }
    return { outcome: 'pass', reason_code: null, reason: null, evidence };
  } finally {
    if (reqCtx) await reqCtx.dispose().catch(() => {});
  }
};

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
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
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
    if (verdict !== null) return { ...verdict, evidence };
    return { outcome: 'pass', reason_code: null, reason: null, evidence };
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
  const argv = decl && Array.isArray(decl.command) ? decl.command : null;
  if (argv === null || argv.length === 0 || !argv.every((a) => isStr(a) && a !== '')) return blocked('STATE_UNDECLARED', missing);
  let seeded = ctx.seeds.get(text);
  if (!seeded) {
    seeded = await runSeed(ctx, argv);
    ctx.seeds.set(text, seeded);
  }
  if (!seeded.ok) return blocked(seeded.code, seeded.reason);
  return null;
}

/**
 * @param {RunCtx} ctx
 * @param {string[]} argv
 * @returns {Promise<{ ok: true } | { ok: false, code: string, reason: string }>}
 */
async function runSeed(ctx, argv) {
  for (const a of argv) {
    if (!a.includes('://')) continue;
    const r = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!r.ok) return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `a seed command argument names a non-local URL (${r.reason}); the command was not executed` };
  }
  const r = spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: 'ignore', timeout: 120000 });
  if (r.error) return { ok: false, code: 'SEED_FAILED', reason: 'the declared seed command could not be run or timed out' };
  if (r.status !== 0) return { ok: false, code: 'SEED_FAILED', reason: `the declared seed command exited with status ${r.status}` };
  return { ok: true };
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
  const { paths, refused } = extractTestPaths(kase.automated_test_path);
  if (refused || paths.length === 0) return null;
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
  const cases = readJunitTestcases(xml).map((t) => {
    const loc = t.file !== null ? t.file : t.classname;
    return { ...t, loc: loc === null ? null : loc.split('\\').join('/') };
  });
  /** @type {{ cited: string, testcases: number, failed: string[] }[]} */ const files = [];
  for (const p of paths) {
    const hit = cases.filter((t) => t.loc !== null && (t.loc === p || t.loc.endsWith(`/${p}`)));
    if (new Set(hit.map((t) => t.loc)).size !== 1) return null;
    const ran = hit.filter((t) => !t.skipped);
    if (ran.length === 0) return null;
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
  const invalid = validateSteps(driver, p.steps);
  if (invalid) return out(needsHuman(invalid.code, invalid.reason));
  if (target === null) {
    return out(blocked('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>'));
  }
  const ctx = ctxOrNull ?? makeCtx();
  if (ctx.playwright === null) {
    return out(blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', 'playwright is not resolvable; run `npm install` in plugins/relay/scripts/visual/'));
  }
  for (const [i, s] of p.steps.entries()) {
    if (typeof s.path === 'string' && resolveStepUrl(s.path, target) === null) {
      return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`));
    }
  }
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
  return out(await fn(runCtx, kase, p, session));
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
    /** @type {Record<string, number>} */ const counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 };
    for (const e of entries) counts[e.outcome]++;
    // Record-resolved cases are INSIDE counts.pass/fail (the four-key partition is unchanged) but were
    // not executed by a driver: they are reported beside the driver-executed numbers, never added to them.
    const recordEntries = entries.filter((e) => e.reason_code === 'AUTOMATED_EVIDENCE');
    const recordResolved = recordEntries.length;
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

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
async function main(argv) {
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
