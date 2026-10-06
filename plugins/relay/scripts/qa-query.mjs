// @ts-check
/**
 * qa-query.mjs - the pure, read-only database query contract of /relay-qa-run.
 *
 * Contract: this module performs no I/O at all. It holds the single-statement lexical guard
 * (one SELECT or WITH ... SELECT, nothing else), the closed source-kind table with its
 * provably-local rules (a wrangler-d1 source needs --local and refuses --remote and --preview;
 * a sqlite3 source needs -readonly), argv assembly, output parsing, row assertions and row
 * redaction. Every spawn lives in qa-run.mjs; every refusal here is blocked-class and its
 * reason names a keyword, a step number, a count or a path - never a statement fragment, a
 * row value, an expected value or a source command.
 *
 * Refusal codes: QUERY_NOT_READ_ONLY, QUERY_SOURCE_UNDECLARED, QUERY_SOURCE_INVALID,
 * FAILED_NON_LOCAL_TARGET.
 */

export const QUERY_SOURCE_KINDS = ['wrangler-d1', 'sqlite3'];

const MAX_SQL_LENGTH = 4096;
const MAX_COMMAND_ELEMENTS = 64;
const VARIABLE_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

const DENYLIST = new Set([
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM',
  'REINDEX', 'TRUNCATE', 'GRANT', 'REVOKE', 'MERGE', 'COPY', 'CALL', 'INTO', 'LOAD_EXTENSION',
  'WRITEFILE', 'READFILE', 'NEXTVAL', 'SETVAL', 'SET_CONFIG', 'PG_SLEEP', 'LO_IMPORT', 'LO_EXPORT', 'DBLINK',
]);

const isStr = (/** @type {any} */ v) => typeof v === 'string';
const isObj = (/** @type {any} */ v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Lexical read-only guard. A tokenizing scan, not a regex over the whole text.
 * @param {any} sql
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkReadOnlySql(sql) {
  const no = (/** @type {string} */ reason) => ({ ok: false, reason });
  if (!isStr(sql)) return no('the statement is not a string');
  const text = sql.trim();
  if (text.length < 1 || text.length > MAX_SQL_LENGTH) return no(`the statement must be 1 to ${MAX_SQL_LENGTH} characters`);
  for (let i = 0; i < sql.length; i++) {
    const c = sql.charCodeAt(i);
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) return no('the statement holds a control character');
    if (c === 127) return no('the statement holds a control character');
  }
  /** @type {string[]} */ const words = [];
  /** @type {boolean[]} */ const beforeParen = [];
  let depth = 0;
  let semicolonAt = -1;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (semicolonAt >= 0 && !/\s/.test(ch)) return no('a second statement follows a semicolon');
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      let j = i + 1;
      let closed = false;
      while (j < n) {
        if (text[j] === close) {
          if (close !== ']' && text[j + 1] === close) {
            j += 2;
            continue;
          }
          closed = true;
          break;
        }
        j++;
      }
      if (!closed) return no('an unterminated quoted token');
      i = j + 1;
      continue;
    }
    if (ch === '-' && text[i + 1] === '-') return no('a comment is not allowed');
    if (ch === '/' && text[i + 1] === '*') return no('a comment is not allowed');
    if (ch === '$') return no('dollar quoting or a dollar sign is not allowed');
    if (ch === '\\') return no('a backslash is not allowed');
    if (ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth < 0) return no('unbalanced parentheses');
      i++;
      continue;
    }
    if (ch === ';') {
      semicolonAt = i;
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(text[j])) j++;
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(text[j])) j++;
      let k = j;
      while (k < n && /\s/.test(text[k])) k++;
      words.push(text.slice(i, j).toUpperCase());
      beforeParen.push(text[k] === '(');
      i = j;
      continue;
    }
    i++;
  }
  if (depth !== 0) return no('unbalanced parentheses');
  if (words.length === 0) return no('the statement has no keyword');
  if (words[0] !== 'SELECT' && words[0] !== 'WITH') return no(`the statement must start with SELECT or WITH, not ${DENYLIST.has(words[0]) || words[0] === 'EXPLAIN' || words[0] === 'VALUES' || words[0] === 'REPLACE' ? words[0] : 'another keyword'}`);
  for (const [idx, w] of words.entries()) {
    if (DENYLIST.has(w)) return no(`the keyword ${w} is not allowed`);
    if (w === 'REPLACE' && !beforeParen[idx]) return no('the keyword REPLACE is not allowed outside the replace() function');
  }
  if (words[0] === 'WITH' && !words.includes('SELECT')) return no('a WITH statement must contain a SELECT');
  return { ok: true };
}

/**
 * Replaces every {{name}} with 0, for the pre-substitution check of a statement template.
 * @param {any} sql
 * @returns {any}
 */
export function neutralizeVariables(sql) {
  return isStr(sql) ? sql.replace(VARIABLE_PATTERN, '0') : sql;
}

/**
 * Classifies a declared query source. The source's command is the argv PREFIX.
 * @param {any} sources the query_sources map
 * @param {any} name
 * @returns {{ ok: true, kind: string, argv: string[], redactColumns: string[], readOnlyControl: string } | { ok: false, code: string, reason: string }}
 */
export function classifyQuerySource(sources, name) {
  const no = (/** @type {string} */ code, /** @type {string} */ reason) => ({ ok: false, code, reason });
  const label = isStr(name) ? JSON.stringify(name) : 'the step source';
  const entry = isObj(sources) && isStr(name) && Object.hasOwn(sources, name) ? sources[name] : undefined;
  if (!isObj(entry)) return no('QUERY_SOURCE_UNDECLARED', `the query source ${label} is not declared in PRPs/auth/qa-seed.json query_sources`);
  const cmd = entry.command;
  const wellFormed = Array.isArray(cmd) && cmd.length > 0 && cmd.length <= MAX_COMMAND_ELEMENTS && cmd.every((a) => isStr(a) && a !== '');
  if (!isStr(entry.kind) || !QUERY_SOURCE_KINDS.includes(entry.kind)) return no('QUERY_SOURCE_INVALID', `the query source ${label} has an unknown kind`);
  if (!wellFormed) return no('QUERY_SOURCE_INVALID', `the query source ${label} needs a non-empty command array of non-empty strings`);
  const rc = entry.redact_columns;
  if (rc !== undefined && !(Array.isArray(rc) && rc.every((c) => isStr(c) && c !== ''))) {
    return no('QUERY_SOURCE_INVALID', `the query source ${label} has a malformed redact_columns`);
  }
  /** @type {string[]} */ const argv = cmd;
  const redactColumns = Array.isArray(rc) ? rc : [];
  if (entry.kind === 'wrangler-d1') {
    if (!argv.includes('--local') || argv.some((a) => a.startsWith('--remote') || a.startsWith('--preview'))) {
      return no('FAILED_NON_LOCAL_TARGET', `the query source ${label} is not provably local (needs --local, refuses --remote and --preview); nothing was executed`);
    }
    if (!argv.includes('--json') || argv[argv.length - 1] !== '--command') {
      return no('QUERY_SOURCE_INVALID', `the query source ${label} needs --json and a command ending in --command`);
    }
    return { ok: true, kind: 'wrangler-d1', argv, redactColumns, readOnlyControl: 'none (lexical guard and --local only)' };
  }
  if (argv.some((a) => a.includes('://') || a.startsWith('file:'))) {
    return no('FAILED_NON_LOCAL_TARGET', `the query source ${label} names a URL or file: database; nothing was executed`);
  }
  if (!argv.includes('-readonly') || !argv.includes('-json') || argv.some((a) => a === '-cmd' || a === '-init' || a === '-interactive')) {
    return no('QUERY_SOURCE_INVALID', `the query source ${label} needs -readonly and -json and no -cmd, -init or -interactive`);
  }
  return { ok: true, kind: 'sqlite3', argv, redactColumns, readOnlyControl: 'sqlite3 -readonly' };
}

/**
 * The statement is one argv element, never part of a shell string.
 * @param {{ argv: string[] }} source
 * @param {string} sql
 * @returns {string[]}
 */
export function buildQueryArgv(source, sql) {
  return [...source.argv, sql];
}

/** @param {any} rows */
const plainRows = (rows) => Array.isArray(rows) && rows.every((r) => isObj(r));

/**
 * @param {string} kind
 * @param {any} stdoutText
 * @returns {{ ok: true, rows: any[] } | { ok: false }}
 */
export function parseQueryOutput(kind, stdoutText) {
  const text = isStr(stdoutText) ? stdoutText.trim() : '';
  if (kind === 'sqlite3') {
    if (text === '') return { ok: true, rows: [] };
    try {
      const doc = JSON.parse(text);
      return plainRows(doc) ? { ok: true, rows: doc } : { ok: false };
    } catch {
      return { ok: false };
    }
  }
  if (kind === 'wrangler-d1') {
    /** @type {any} */ let doc;
    try {
      doc = JSON.parse(text);
    } catch {
      const lines = text.split(/\r?\n/);
      const at = lines.findIndex((l) => l.startsWith('[') || l.startsWith('{'));
      if (at < 0) return { ok: false };
      try {
        doc = JSON.parse(lines.slice(at).join('\n'));
      } catch {
        return { ok: false };
      }
    }
    if (Array.isArray(doc) && isObj(doc[0]) && Array.isArray(doc[0].results) && plainRows(doc[0].results)) return { ok: true, rows: doc[0].results };
    return { ok: false };
  }
  return { ok: false };
}

/**
 * Row assertions. A reason states counts or the path, never a row value or the expected value.
 * @param {any[]} rows
 * @param {any} step
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkRows(rows, step) {
  if (step.expect_rows !== undefined && rows.length !== step.expect_rows) {
    return { ok: false, reason: `expect_rows: expected ${step.expect_rows} rows, got ${rows.length}` };
  }
  if (step.expect_json !== undefined) {
    const path = String(step.expect_json.path);
    /** @type {any} */ let cur = rows;
    for (const hop of path.split('.')) {
      if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, hop)) {
        cur = undefined;
        break;
      }
      cur = cur[hop];
    }
    if (JSON.stringify(cur) !== JSON.stringify(step.expect_json.equals)) {
      return { ok: false, reason: `expect_json: the value at path ${JSON.stringify(path)} did not equal the expected value` };
    }
  }
  return { ok: true };
}

/**
 * @param {any[]} rows
 * @param {string[]} columns
 * @returns {any[]}
 */
export function redactRows(rows, columns) {
  return rows.map((row) => {
    const copy = { ...row };
    for (const c of columns) if (Object.hasOwn(copy, c)) copy[c] = '[REDACTED]';
    return copy;
  });
}

/**
 * Plan-time pre-check of every query step: statement first, then source.
 * @param {any[]} steps
 * @param {any} sources
 * @returns {{ code: string, reason: string } | null}
 */
export function precheckQuerySteps(steps, sources) {
  if (!Array.isArray(steps)) return null;
  for (const [i, step] of steps.entries()) {
    if (!isObj(step) || step.action !== 'query') continue;
    const sql = checkReadOnlySql(neutralizeVariables(step.sql));
    if (!sql.ok) return { code: 'QUERY_NOT_READ_ONLY', reason: `step ${i + 1}: ${sql.reason}` };
    const src = classifyQuerySource(sources, step.source);
    if (!src.ok) return { code: src.code, reason: `step ${i + 1}: ${src.reason}` };
  }
  return null;
}
