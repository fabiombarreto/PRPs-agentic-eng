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
 * steps verbatim.
 *
 * Redaction follows ${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md and is
 * applied in memory before any evidence byte is written.
 *
 * No npm dependencies of its own; `playwright` is resolved lazily at run time.
 * Node >=18, ESM.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { resolve, join, relative, dirname, isAbsolute, basename } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];

const FEATURE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const ROLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
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

const FIELD_RE =
  /^\s*(?:\d+\.\s*)?\*\*(Title|Risk level|Required state|Coverage|Automated test path|Manual status|Manual step-by-step):\*\*\s*(.*)$/;
/** @type {Record<string, string>} */
const FIELD_KEYS = {
  Title: 'title',
  'Risk level': 'risk',
  'Required state': 'required_state',
  Coverage: 'coverage',
  'Automated test path': 'automated_test_path',
  'Manual status': 'manual_status',
  'Manual step-by-step': 'steps',
};

/**
 * @typedef {{ index: number, heading: string, title: string, risk: string | null, required_state: string | null, coverage: string | null, automated_test_path: string | null, manual_status: string | null, manual_steps_verbatim: string | null }} ReportCase
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
 * @returns {{ kase: ReportCase, hasTitleLabel: boolean }}
 */
function parseBlock(heading, body, index) {
  /** @type {Record<string, { inline: string, rest: string[] }>} */
  const raw = {};
  /** @type {string | null} */ let cur = null;
  for (const line of body) {
    const m = FIELD_RE.exec(line);
    if (m) {
      cur = FIELD_KEYS[m[1]];
      raw[cur] = { inline: m[2], rest: [] };
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
 * @param {string[]} lines
 * @returns {{ heading: string, body: string[] }[]}
 */
function splitHeadingBlocks(lines) {
  /** @type {{ heading: string, body: string[] }[]} */
  const blocks = [];
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    const h = fenced ? null : /^#{3,4}\s+(.*)$/.exec(line);
    if (h) blocks.push({ heading: h[1].trim(), body: [] });
    else if (blocks.length > 0) blocks[blocks.length - 1].body.push(line);
  }
  return blocks;
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
 * @returns {{ cases: ReportCase[] }}
 */
export function parseReport(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  /** @type {ReportCase[]} */
  let cases = [];
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
    cases = splitHeadingBlocks(lines.slice(start + 1, end)).map((b, i) => parseBlock(b.heading, b.body, i + 1).kase);
  } else {
    const parsed = splitHeadingBlocks(lines).map((b) => ({ b, p: parseBlock(b.heading, b.body, 0) }));
    cases = parsed.filter((x) => x.p.hasTitleLabel).map((x, i) => ({ ...x.p.kase, index: i + 1 }));
  }
  if (cases.length === 0) cases = parseTableCases(lines);
  return { cases };
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
 * @typedef {{ root: string, runDirAbs: string, runDirRel: string, table: RedactionTable, target: NonNullable<Target>, playwright: any, loginConfig: any, sessions: Map<string, any>, seeds: Map<string, any>, seedConfig: any }} RunCtx
 * @typedef {{ path: string | null, token: string | null }} SessionInfo
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

const BODY_LIMIT = 65536;
const EVIDENCE_HEADERS = ['content-type', 'content-length', 'location', 'cache-control'];

DRIVERS.http = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ const opts = { baseURL: target.origin };
  if (session && session.path) opts.storageState = session.path;
  if (session && session.token) opts.extraHTTPHeaders = { Authorization: `Bearer ${session.token}` };
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
 * @param {RunCtx} ctx
 * @param {string} role
 * @returns {{ ok: true, info: SessionInfo } | { ok: false, code: string }}
 */
function obtainSession(ctx, role) {
  const cached = ctx.sessions.get(role);
  if (cached) return cached;
  /** @type {{ ok: true, info: SessionInfo } | { ok: false, code: string }} */ let result;
  const script = join(ctx.root, 'PRPs', 'auth', `login-${role}.mjs`);
  if (!existsSync(script)) {
    result = { ok: false, code: 'FAILED_LOGIN_SCRIPT_MISSING' };
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
        result = { ok: true, info: { path: sessionPath, token } };
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
// Case classification
// ---------------------------------------------------------------------------

/**
 * @param {RunCtx | null} ctxOrNull
 * @param {ReportCase} kase
 * @param {Map<number, any>} planByIndex
 * @param {Target} target
 * @param {() => RunCtx} makeCtx lazily builds the run context (loads Playwright once)
 * @returns {Promise<{ result: CaseResult, driver: string | null, role: string | null }>}
 */
async function executeCase(ctxOrNull, kase, planByIndex, target, makeCtx) {
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
  const stateBlock = await prepareState(ctx, kase, p);
  if (stateBlock) return out(stateBlock);
  /** @type {SessionInfo | null} */ let session = null;
  if (role !== null) {
    const roles = ctx.loginConfig && isObj(ctx.loginConfig.roles) ? ctx.loginConfig.roles : {};
    if (!ROLE_PATTERN.test(role) || !Object.hasOwn(roles, role)) {
      return out(blocked('ROLE_UNDECLARED', `role ${role} is not declared in PRPs/auth/login.config.json`));
    }
    const s = obtainSession(ctx, role);
    if (!s.ok) return out(blocked('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`));
    session = s.info;
  }
  const fn = DRIVERS[driver];
  if (!fn) return out(needsHuman('NO_ACTIVE_DRIVER', `no active driver handles ${JSON.stringify(driver)}`));
  return out(await fn(ctx, kase, p, session));
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
  const cases = parseReport(readFileSync(reportAbs, 'utf8')).cases;
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
        const r = await executeCase(ctx, c, planByIndex, target, makeCtx);
        result = r.result;
        driver = r.driver;
        role = r.role;
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
      aborted,
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
      `QA run finished: pass=${counts.pass} fail=${counts.fail} blocked=${counts.blocked} needs-human=${counts['needs-human']}`,
      ...entries.filter((e) => e.outcome !== 'pass').map((e) => `  case ${e.index}: ${e.outcome}${e.reason_code ? ` (${e.reason_code})` : ''}`),
      `Results: ${runDirRel}/results.json`,
      `Evidence: ${runDirRel}/evidence/`,
    ];
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
  const { cases } = parseReport(text);
  if (cases.length === 0) {
    process.stderr.write(`FAILED_REPORT_UNPARSEABLE: no cases found in ${shown}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify({ report_path: shown, cases }, null, 2)}\n`);
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
