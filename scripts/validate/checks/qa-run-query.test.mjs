// @ts-check
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-11 A read-only database check: one SELECT, a declared and provably local source, asserted rows
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-15 Frozen surfaces and the closed outcome vocabulary
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-16 No row value, statement fragment or credential reaches a reason or an evidence file in clear
/**
 * Phase 4 (read-only DB driver) of qa-runner-case-vocabulary.
 *
 * - qa-query.mjs: the pure statement guard, the closed source-kind rules, argv assembly, output
 *   parsing, row assertions, row redaction and the plan-time pre-check.
 * - validateStep / validateSteps for the `query` action in both drivers.
 * - runQueryStep called directly, with a fake query command (a node script spawned through
 *   process.execPath that prints JSON rows and leaves a marker file when it runs).
 * - The real runner, end to end over a loopback server with the http driver only (no browser):
 *   a passing and a failing query step, every refusal happening before any seed or request, a
 *   re-check after a captured value is substituted, redaction keeping row values out of the run
 *   directory, and QUERY_MODULE_UNAVAILABLE for a runner copy that lacks its sibling module.
 * - The qa-run-contract pins and the guard-site registration of the query module.
 *
 * Source plan: PRPs/plans/completed/qa-runner-case-vocabulary-phase-4-read-only-db-driver.plan.md
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import { validateStep, validateSteps, runQueryStep, buildRedactionTable, OUTCOMES } from '../../../plugins/relay/scripts/qa-run.mjs';
import {
  QUERY_SOURCE_KINDS,
  checkReadOnlySql,
  neutralizeVariables,
  classifyQuerySource,
  buildQueryArgv,
  parseQueryOutput,
  checkRows,
  redactRows,
  precheckQuerySteps,
} from '../../../plugins/relay/scripts/qa-query.mjs';
import * as guard from '../../../plugins/relay/scripts/auth-local-guard.mjs';
import { checkAuthLocalGuardSites, runAuthLocalGuardSitesCheck, GUARD_SITES } from './auth-local-guard-sites.mjs';
import { checkQaRunContract, runQaRunContractCheck, validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
const PLUGIN = resolve('plugins/relay');
const REAL_RUNNER = join(PLUGIN, 'scripts', 'qa-run.mjs');
const REAL_GUARD = join(PLUGIN, 'scripts', 'auth-local-guard.mjs');
const REAL_QUERY = join(PLUGIN, 'scripts', 'qa-query.mjs');
const QUERY_FILE = 'plugins/relay/scripts/qa-query.mjs';
const read = (/** @type {string} */ p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const RUNNER_TEXT = read(REAL_RUNNER);
const QUERY_TEXT = read(REAL_QUERY);
const COMMAND_TEXT = read(join(PLUGIN, 'commands', 'relay-qa-run.md'));

/** @type {string[]} */
const temps = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'relay-qaquery-'));
  temps.push(d);
  return d;
};

// ---------------------------------------------------------------------------
// checkReadOnlySql: one SELECT or WITH ... SELECT, nothing else
// ---------------------------------------------------------------------------

const Q = "'";

test('AC-11 checkReadOnlySql accepts a single SELECT or WITH ... SELECT, with or without one trailing semicolon', () => {
  const accepted = [
    'SELECT id, name FROM tasks WHERE id = 7',
    'select 1;',
    '  SELECT 1 ;  \n',
    'WITH t AS (SELECT 1 AS a) SELECT a FROM t',
    'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 3) SELECT x FROM c',
    `SELECT replace(name, ${Q}a${Q}, ${Q}b${Q}) FROM t`,
    `SELECT replace (name, ${Q}a${Q}, ${Q}b${Q}) FROM t`,
    `SELECT ${Q};${Q} AS semi`,
    `SELECT ${Q}it${Q}${Q}s; DROP TABLE t${Q} AS escaped`,
    `SELECT ${Q}DELETE${Q} AS word`,
    'SELECT "update" FROM t',
    'SELECT `insert`, [drop] FROM t',
    'SELECT a FROM t WHERE b IN (SELECT b FROM u)',
    `SELECT ${'a'.repeat(4089)}`,
  ];
  for (const sql of accepted) {
    const r = checkReadOnlySql(sql);
    assert.equal(r.ok, true, `a read-only statement was refused: ${sql.slice(0, 60)} -> ${JSON.stringify(r)}`);
  }
});

test('AC-11 checkReadOnlySql refuses writes, other statement kinds and every write keyword wherever it appears', () => {
  const refused = [
    'UPDATE t SET a = 1',
    'DELETE FROM t',
    'INSERT INTO t VALUES (1)',
    'REPLACE INTO t VALUES (1)',
    'DROP TABLE t',
    'CREATE TABLE t (a)',
    'ALTER TABLE t ADD b',
    'PRAGMA query_only = 0',
    'PRAGMA table_info(t)',
    'ATTACH DATABASE x AS y',
    'DETACH DATABASE y',
    'VACUUM',
    'REINDEX',
    'EXPLAIN SELECT 1',
    'VALUES (1)',
    'WITH t AS (SELECT 1) INSERT INTO u SELECT * FROM t',
    'WITH t AS (SELECT 1) DELETE FROM u',
    'WITH t AS (SELECT 1) UPDATE u SET a = 1',
    'SELECT * INTO u FROM t',
    'SELECT 1 FROM t FOR UPDATE',
    `SELECT load_extension(${Q}x${Q})`,
    `SELECT writefile(${Q}f${Q}, ${Q}x${Q})`,
    `SELECT readfile(${Q}f${Q})`,
    'SELECT nextval(seq)',
    'SELECT pg_sleep(10)',
    'SELECT REPLACE FROM t',
    'WITH t AS (SELECT 1) SELECT 2 FROM t, (DELETE FROM u)',
    'WITH x AS (VALUES (1)) VALUES (2)',
    'TRUNCATE t',
    'GRANT ALL ON t TO u',
  ];
  for (const sql of refused) {
    assert.equal(checkReadOnlySql(sql).ok, false, `an unsafe statement was accepted: ${sql}`);
  }
});

test('AC-11 checkReadOnlySql refuses a second statement, however it is hidden', () => {
  const refused = [
    'SELECT 1; SELECT 2',
    'SELECT 1;\nSELECT 2',
    'SELECT 1; DROP TABLE t',
    'SELECT 1;;',
    'SELECT 1; ;',
    `SELECT 1 FROM t WHERE a = ${Q}x${Q}; DROP TABLE t; --`,
    'SELECT 1;SELECT 2',
  ];
  for (const sql of refused) assert.equal(checkReadOnlySql(sql).ok, false, sql);
});

test('AC-11 checkReadOnlySql refuses comments, dollar quoting, backslashes and unterminated or unbalanced input wholesale', () => {
  const refused = [
    'SELECT 1 -- hi',
    'SELECT 1 /* x */',
    'SELECT /* x */ 1',
    'SELECT 1 /* open',
    'SELECT $$x$$',
    'SELECT $1',
    'SELECT 1 \\ 2',
    `SELECT 1 FROM t WHERE a = ${Q}open`,
    'SELECT "open',
    'SELECT `open',
    'SELECT [open',
    'SELECT (1',
    'SELECT 1)',
    'SELECT ((1)',
  ];
  for (const sql of refused) assert.equal(checkReadOnlySql(sql).ok, false, sql);
});

test('AC-11 checkReadOnlySql refuses empty, whitespace, over-length, control-character and non-string input', () => {
  for (const sql of ['', '   ', '\n\t', `SELECT ${'a'.repeat(4090)}`, 'SELECT 1\u0000', 'SELECT\u00071', 'SELECT 1\u007f']) {
    assert.equal(checkReadOnlySql(sql).ok, false, JSON.stringify(sql).slice(0, 40));
  }
  for (const v of [5, null, undefined, {}, [], ['SELECT 1'], true]) assert.equal(checkReadOnlySql(v).ok, false, String(v));
  assert.equal(checkReadOnlySql('SELECT\t1\r\nFROM t').ok, true, 'tab, CR and LF are allowed whitespace');
});

test('AC-16 a checkReadOnlySql reason names a keyword or a class, never a fragment of the statement', () => {
  const statements = [
    'SELECT zzsentinelcol FROM t; DELETE FROM zzsentinelcol',
    'SELECT 1 FROM zzsentineltbl FOR UPDATE',
    `SELECT zzsentinelcol FROM t WHERE a = ${Q}open`,
    'SELECT zzsentinelcol -- zzsentinelcomment',
    'UPDATE zzsentineltbl SET a = 1',
    'PRAGMA zzsentinelpragma',
    'SELECT zzsentinelcol FROM t WHERE a = $zzsentinelvar',
  ];
  for (const sql of statements) {
    const r = checkReadOnlySql(sql);
    assert.equal(r.ok, false, sql);
    assert.ok(typeof r.reason === 'string' && r.reason.length > 0, 'a refusal carries a reason');
    assert.ok(!r.reason.toLowerCase().includes('zzsentinel'), `the reason echoed a statement fragment: ${r.reason}`);
  }
});

test('AC-11 checkReadOnlySql is pure: the same input always gets the same verdict and nothing is retained between calls', () => {
  const unsafe = 'SELECT 1; DROP TABLE t';
  const first = JSON.stringify(checkReadOnlySql(unsafe));
  assert.equal(checkReadOnlySql('SELECT 1').ok, true);
  assert.equal(JSON.stringify(checkReadOnlySql(unsafe)), first);
  assert.equal(checkReadOnlySql('SELECT 1').ok, true);
});

test('AC-11 neutralizeVariables replaces every {{name}} reference with 0 and passes a non-string through', () => {
  assert.equal(neutralizeVariables('SELECT {{a}}, {{ b_2 }} FROM t WHERE id = {{task_id}}'), 'SELECT 0, 0 FROM t WHERE id = 0');
  assert.equal(neutralizeVariables('SELECT 1'), 'SELECT 1');
  assert.equal(neutralizeVariables(42), 42);
  assert.equal(neutralizeVariables(undefined), undefined);
  assert.equal(neutralizeVariables('SELECT {{ 1bad }}'), 'SELECT {{ 1bad }}', 'only a valid variable name is a reference');
});

// ---------------------------------------------------------------------------
// classifyQuerySource: the closed kind table and the provably-local rules
// ---------------------------------------------------------------------------

const D1 = ['wrangler', 'd1', 'execute', 'db', '--local', '--json', '--command'];
const LITE = ['sqlite3', '-readonly', '-json', 'x.db'];
/** @param {any} decl */
const classify = (decl) => classifyQuerySource({ a: decl }, 'a');
/** @param {any} decl */
const codeOf = (decl) => {
  const r = classify(decl);
  return r.ok ? 'OK' : r.code;
};

test('AC-11 QUERY_SOURCE_KINDS is the closed table of the two shipped kinds', () => {
  assert.deepEqual([...QUERY_SOURCE_KINDS], ['wrangler-d1', 'sqlite3']);
});

test('AC-11 a local wrangler-d1 source is accepted and reports that it has no engine-level read-only control', () => {
  const r = classifyQuerySource({ a: { kind: 'wrangler-d1', command: D1, redact_columns: ['email'] } }, 'a');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.kind, 'wrangler-d1');
  assert.deepEqual(r.argv, D1);
  assert.deepEqual(r.redactColumns, ['email']);
  assert.ok(r.readOnlyControl.startsWith('none'), r.readOnlyControl);
});

test('AC-11 a sqlite3 source with -readonly is accepted and reports the engine control that applies', () => {
  const r = classifyQuerySource({ a: { kind: 'sqlite3', command: LITE } }, 'a');
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.kind, 'sqlite3');
  assert.equal(r.readOnlyControl, 'sqlite3 -readonly');
  assert.deepEqual(r.redactColumns, [], 'no redact_columns declared means none');
});

test('AC-11 a wrangler-d1 source that is not provably local is FAILED_NON_LOCAL_TARGET: --remote, --preview or no --local', () => {
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1, '--remote'] }), 'FAILED_NON_LOCAL_TARGET');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1.slice(0, -1), '--remote', '--command'] }), 'FAILED_NON_LOCAL_TARGET');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1.slice(0, -1), '--remote=true', '--command'] }), 'FAILED_NON_LOCAL_TARGET');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1.slice(0, -1), '--preview', '--command'] }), 'FAILED_NON_LOCAL_TARGET');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: ['wrangler', 'd1', 'execute', 'db', '--json', '--command'] }), 'FAILED_NON_LOCAL_TARGET');
});

test('AC-11 a wrangler-d1 source must carry --json and end with --command, otherwise QUERY_SOURCE_INVALID', () => {
  assert.equal(codeOf({ kind: 'wrangler-d1', command: ['wrangler', 'd1', 'execute', 'db', '--local', '--command'] }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1, 'extra'] }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: ['wrangler', 'd1', '--local', '--json'] }), 'QUERY_SOURCE_INVALID');
});

test('AC-11 a sqlite3 source needs -readonly and -json and refuses -cmd, -init, -interactive, URLs and file: databases', () => {
  assert.equal(codeOf({ kind: 'sqlite3', command: ['sqlite3', '-json', 'x.db'] }), 'QUERY_SOURCE_INVALID', 'no -readonly');
  assert.equal(codeOf({ kind: 'sqlite3', command: ['sqlite3', '-readonly', 'x.db'] }), 'QUERY_SOURCE_INVALID', 'no -json');
  for (const flag of ['-cmd', '-init', '-interactive']) {
    assert.equal(codeOf({ kind: 'sqlite3', command: ['sqlite3', '-readonly', '-json', flag, 'x', 'x.db'] }), 'QUERY_SOURCE_INVALID', flag);
  }
  assert.equal(codeOf({ kind: 'sqlite3', command: ['sqlite3', '-readonly', '-json', 'http://example.com/x.db'] }), 'FAILED_NON_LOCAL_TARGET');
  assert.equal(codeOf({ kind: 'sqlite3', command: ['sqlite3', '-readonly', '-json', 'file:x.db?mode=rw'] }), 'FAILED_NON_LOCAL_TARGET');
});

test('AC-11 an unknown kind or a malformed command or redact_columns is QUERY_SOURCE_INVALID', () => {
  assert.equal(codeOf({ kind: 'mysql', command: D1 }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ command: D1 }), 'QUERY_SOURCE_INVALID', 'no kind');
  assert.equal(codeOf({ kind: 'wrangler-d1' }), 'QUERY_SOURCE_INVALID', 'no command');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [] }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: 'wrangler d1 --local --json --command' }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1.slice(0, -1), '', '--command'] }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1.slice(0, -1), 5, '--command'] }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: Array.from({ length: 65 }, (_, i) => `a${i}`) }), 'QUERY_SOURCE_INVALID', 'over 64 elements');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: D1, redact_columns: 'email' }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: D1, redact_columns: ['email', ''] }), 'QUERY_SOURCE_INVALID');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: D1, redact_columns: [] }), 'OK', 'an empty redact_columns list is well formed');
});

test('AC-11 an undeclared source is QUERY_SOURCE_UNDECLARED: no map, a non-object map, an absent name, a non-object entry or a prototype name', () => {
  for (const sources of [undefined, null, {}, 'x', 5, [], [{ kind: 'sqlite3' }]]) {
    const r = classifyQuerySource(sources, 'a');
    assert.equal(r.ok, false, JSON.stringify(sources));
    assert.equal(r.code, 'QUERY_SOURCE_UNDECLARED', JSON.stringify(sources));
  }
  assert.equal(classifyQuerySource({ a: 'nope' }, 'a').code, 'QUERY_SOURCE_UNDECLARED');
  assert.equal(classifyQuerySource({ a: null }, 'a').code, 'QUERY_SOURCE_UNDECLARED');
  assert.equal(classifyQuerySource({ a: { kind: 'sqlite3', command: LITE } }, 'b').code, 'QUERY_SOURCE_UNDECLARED');
  assert.equal(classifyQuerySource({}, 'constructor').code, 'QUERY_SOURCE_UNDECLARED');
  assert.equal(classifyQuerySource({}, 'toString').code, 'QUERY_SOURCE_UNDECLARED');
  assert.equal(classifyQuerySource({ a: { kind: 'sqlite3', command: LITE } }, 5).code, 'QUERY_SOURCE_UNDECLARED');
});

test('AC-11 classifyQuerySource refusal order: undeclared, then kind, then command shape, then locality, then flags', () => {
  assert.equal(codeOf({ kind: 'mysql', command: [] }), 'QUERY_SOURCE_INVALID', 'a bad kind is judged before the command');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: ['wrangler', '--remote'] }), 'FAILED_NON_LOCAL_TARGET', 'locality is judged before the --json and --command rules');
  assert.equal(codeOf({ kind: 'wrangler-d1', command: [...D1, '--remote'], redact_columns: 'bad' }), 'QUERY_SOURCE_INVALID', 'a malformed redact_columns is judged before locality');
});

test('AC-16 a classifyQuerySource reason names the source and never a command element', () => {
  const secret = 'zz-secret-arg-91';
  const decls = [
    { kind: 'wrangler-d1', command: [...D1.slice(0, -1), secret, '--remote', '--command'] },
    { kind: 'wrangler-d1', command: ['wrangler', '--local', secret] },
    { kind: 'sqlite3', command: ['sqlite3', '-json', secret] },
    { kind: 'sqlite3', command: ['sqlite3', '-readonly', '-json', `http://${secret}.example/x.db`] },
    { kind: 'mysql', command: [secret] },
  ];
  for (const decl of decls) {
    const r = classifyQuerySource({ 'my-source': decl }, 'my-source');
    assert.equal(r.ok, false);
    assert.ok(r.reason.includes('my-source'), r.reason);
    assert.ok(!r.reason.includes(secret), `the reason echoed a command element: ${r.reason}`);
  }
});

test('AC-11 classifyQuerySource does not mutate the declaration it reads', () => {
  const decl = { kind: 'wrangler-d1', command: [...D1], redact_columns: ['email'] };
  const before = JSON.stringify(decl);
  classifyQuerySource({ a: decl }, 'a');
  assert.equal(JSON.stringify(decl), before);
});

// ---------------------------------------------------------------------------
// buildQueryArgv, parseQueryOutput, checkRows, redactRows
// ---------------------------------------------------------------------------

test('AC-11 buildQueryArgv appends the statement as one final argv element and leaves the prefix alone', () => {
  const src = { argv: [...D1] };
  const sql = `SELECT ${Q}a b${Q} AS x; rm -rf / && echo $HOME`;
  const argv = buildQueryArgv(src, sql);
  assert.equal(argv.length, D1.length + 1);
  assert.equal(argv[argv.length - 1], sql);
  assert.deepEqual(argv.slice(0, -1), D1);
  assert.deepEqual(src.argv, D1, 'the source prefix is not mutated');
  assert.equal(argv.filter((a) => a === sql).length, 1, 'the statement is never split across elements');
});

test('AC-11 parseQueryOutput reads wrangler-d1 JSON: the first result set, a banner before the JSON, pretty-printed output', () => {
  const doc = [{ results: [{ id: 1 }, { id: 2 }], success: true }];
  const plain = parseQueryOutput('wrangler-d1', JSON.stringify(doc));
  assert.deepEqual(plain, { ok: true, rows: [{ id: 1 }, { id: 2 }] });
  const banner = parseQueryOutput('wrangler-d1', `Resource location: local\n\n${JSON.stringify(doc, null, 2)}\n`);
  assert.deepEqual(banner, { ok: true, rows: [{ id: 1 }, { id: 2 }] });
  assert.deepEqual(parseQueryOutput('wrangler-d1', JSON.stringify([{ results: [], success: true }])), { ok: true, rows: [] });
});

test('AC-11 parseQueryOutput fails closed on wrangler-d1 output that is not the documented shape', () => {
  for (const text of ['not json', '', '{"results":[{"id":1}]}', '[]', '[{"success":true}]', '[{"results":"x"}]', '[{"results":[1,2]}]', '[{"results":[[1]]}]', 'banner only\nno json here']) {
    assert.equal(parseQueryOutput('wrangler-d1', text).ok, false, text);
  }
  assert.equal(parseQueryOutput('wrangler-d1', undefined).ok, false);
});

test('AC-11 parseQueryOutput reads sqlite3 -json output: empty stdout is zero rows, otherwise an array of objects', () => {
  assert.deepEqual(parseQueryOutput('sqlite3', ''), { ok: true, rows: [] });
  assert.deepEqual(parseQueryOutput('sqlite3', '  \n'), { ok: true, rows: [] });
  assert.deepEqual(parseQueryOutput('sqlite3', '[{"id":1,"s":"x"}]\n'), { ok: true, rows: [{ id: 1, s: 'x' }] });
  for (const text of ['not json', '{"id":1}', '[1,2]', '[[1]]', '[{"id":1},']) assert.equal(parseQueryOutput('sqlite3', text).ok, false, text);
});

test('AC-11 parseQueryOutput refuses an unknown kind', () => {
  assert.equal(parseQueryOutput('mysql', '[{"id":1}]').ok, false);
  assert.equal(parseQueryOutput(undefined, '[{"id":1}]').ok, false);
});

const ROWS = [{ id: 1, status: 'done', tags: ['a', 'b'], meta: { n: null } }, { id: 2, status: 'open', tags: [], meta: { n: 3 } }];

test('AC-11 checkRows expect_rows is an exact count, including zero', () => {
  assert.equal(checkRows(ROWS, { expect_rows: 2 }).ok, true);
  assert.equal(checkRows(ROWS, { expect_rows: 1 }).ok, false);
  assert.equal(checkRows(ROWS, { expect_rows: 3 }).ok, false);
  assert.equal(checkRows([], { expect_rows: 0 }).ok, true);
  assert.equal(checkRows(ROWS, { expect_rows: 0 }).ok, false);
});

test('AC-11 checkRows expect_json evaluates a dotted path over the rows array and compares by JSON equality', () => {
  const ok = (/** @type {string} */ path, /** @type {any} */ equals) => checkRows(ROWS, { expect_json: { path, equals } }).ok;
  assert.equal(ok('0.status', 'done'), true);
  assert.equal(ok('1.status', 'open'), true);
  assert.equal(ok('0.status', 'open'), false);
  assert.equal(ok('0.tags.1', 'b'), true);
  assert.equal(ok('0.tags', ['a', 'b']), true);
  assert.equal(ok('0.tags', ['b', 'a']), false);
  assert.equal(ok('0.meta', { n: null }), true);
  assert.equal(ok('0.meta.n', null), true);
  assert.equal(ok('1.meta.n', 3), true);
  assert.equal(ok('1.meta.n', '3'), false, 'a number is not its string');
  assert.equal(ok('2.status', 'done'), false, 'a missing row is undefined, never equal');
  assert.equal(ok('0.nope', null), false, 'a missing key is undefined, not null');
  assert.equal(ok('0.status.length', 4), false, 'a hop through a scalar is a miss');
});

test('AC-11 checkRows requires every expectation present: a right count with a wrong value fails, and a right value with a wrong count fails', () => {
  assert.equal(checkRows(ROWS, { expect_rows: 2, expect_json: { path: '0.status', equals: 'done' } }).ok, true);
  assert.equal(checkRows(ROWS, { expect_rows: 2, expect_json: { path: '0.status', equals: 'open' } }).ok, false);
  assert.equal(checkRows(ROWS, { expect_rows: 3, expect_json: { path: '0.status', equals: 'done' } }).ok, false);
  assert.equal(checkRows(ROWS, {}).ok, true, 'no expectation present asserts nothing');
});

test('AC-16 a checkRows reason carries counts or the path only, never a row value or the expected value', () => {
  const rows = [{ status: 'zzrowvalue', email: 'zzemail@example.test' }];
  const byValue = checkRows(rows, { expect_json: { path: '0.status', equals: 'zzexpected' } });
  assert.equal(byValue.ok, false);
  for (const leak of ['zzrowvalue', 'zzexpected', 'zzemail']) assert.ok(!byValue.reason.includes(leak), `the reason leaked ${leak}: ${byValue.reason}`);
  assert.ok(byValue.reason.includes('0.status'), 'the path is named');
  const byCount = checkRows(rows, { expect_rows: 4 });
  assert.equal(byCount.ok, false);
  assert.ok(byCount.reason.includes('4') && byCount.reason.includes('1'), `the counts are named: ${byCount.reason}`);
  assert.ok(!byCount.reason.includes('zzrowvalue'));
});

test('AC-16 redactRows replaces exactly the listed columns with [REDACTED], keeps the others and never mutates its input', () => {
  const rows = [{ id: 1, email: 'a@b.test', phone: '555' }, { id: 2, other: 'x' }];
  const before = JSON.stringify(rows);
  const out = redactRows(rows, ['email', 'phone']);
  assert.deepEqual(out, [{ id: 1, email: '[REDACTED]', phone: '[REDACTED]' }, { id: 2, other: 'x' }]);
  assert.equal(JSON.stringify(rows), before, 'the input rows are untouched');
  assert.notEqual(out[0], rows[0], 'rows are copied');
  assert.deepEqual(redactRows(rows, []), rows);
  assert.deepEqual(redactRows([], ['email']), []);
  assert.deepEqual(redactRows([{ id: 1 }], ['email']), [{ id: 1 }], 'a listed column absent from a row is not invented');
});

// ---------------------------------------------------------------------------
// precheckQuerySteps: the plan-time refusal, statement first, then source
// ---------------------------------------------------------------------------

const SOURCES = { d1: { kind: 'wrangler-d1', command: D1 }, remote: { kind: 'wrangler-d1', command: [...D1, '--remote'] } };
/** @param {string} sql @param {string} [source] */
const qstep = (sql, source = 'd1') => ({ action: 'query', source, sql, expect_rows: 1 });

test('AC-11 precheckQuerySteps passes a clean plan, a plan with no query step and a non-array', () => {
  assert.equal(precheckQuerySteps([{ action: 'request', method: 'GET', path: '/a' }, qstep('SELECT id FROM t WHERE id = {{task_id}}')], SOURCES), null);
  assert.equal(precheckQuerySteps([{ action: 'request', method: 'GET', path: '/a' }], undefined), null);
  assert.equal(precheckQuerySteps([], SOURCES), null);
  assert.equal(precheckQuerySteps(undefined, SOURCES), null);
});

test('AC-11 precheckQuerySteps ignores the sql of a non-query step and refuses the first failing query step by number', () => {
  assert.equal(precheckQuerySteps([{ action: 'request', method: 'GET', path: '/a', sql: 'DROP TABLE t' }], SOURCES), null);
  const r = precheckQuerySteps([qstep('SELECT 1'), qstep('UPDATE t SET a = 1'), qstep('DROP TABLE t')], SOURCES);
  assert.ok(r);
  assert.equal(r.code, 'QUERY_NOT_READ_ONLY');
  assert.ok(r.reason.includes('step 2'), r.reason);
});

test('AC-11 precheckQuerySteps judges the statement before the source, then maps source refusals to their codes', () => {
  assert.equal(precheckQuerySteps([qstep('UPDATE t SET a = 1', 'nope')], SOURCES)?.code, 'QUERY_NOT_READ_ONLY');
  assert.equal(precheckQuerySteps([qstep('SELECT 1', 'nope')], SOURCES)?.code, 'QUERY_SOURCE_UNDECLARED');
  assert.equal(precheckQuerySteps([qstep('SELECT 1', 'remote')], SOURCES)?.code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(precheckQuerySteps([qstep('SELECT 1')], undefined)?.code, 'QUERY_SOURCE_UNDECLARED');
  const r = precheckQuerySteps([{ action: 'request' }, qstep('SELECT 1', 'nope')], SOURCES);
  assert.ok(r && r.reason.includes('step 2'), JSON.stringify(r));
});

test('AC-11 precheckQuerySteps checks a template with its variables neutralized: a clean template passes, an unsafe one is refused', () => {
  assert.equal(precheckQuerySteps([qstep('SELECT 1 FROM t WHERE a = {{x}} AND b = {{ y }}')], SOURCES), null);
  assert.equal(precheckQuerySteps([qstep('SELECT 1 FROM t WHERE a = {{x}}; DROP TABLE t')], SOURCES)?.code, 'QUERY_NOT_READ_ONLY');
});

test('AC-16 a precheckQuerySteps reason never carries the statement', () => {
  const r = precheckQuerySteps([qstep('UPDATE zzsentineltbl SET zzsentinelcol = 1')], SOURCES);
  assert.ok(r);
  assert.ok(!r.reason.toLowerCase().includes('zzsentinel'), r.reason);
});

// ---------------------------------------------------------------------------
// validateStep / validateSteps: the query action in both drivers
// ---------------------------------------------------------------------------

const GOOD_STEP = { action: 'query', source: 'd1-local', sql: 'SELECT status FROM tasks WHERE id = 7', expect_rows: 1 };

test('AC-11 validateStep accepts a query step in an http and in a browser entry', () => {
  for (const driver of ['http', 'browser']) {
    assert.equal(validateStep(driver, GOOD_STEP), null, driver);
    assert.equal(validateStep(driver, { ...GOOD_STEP, expect_rows: 0 }), null, `${driver}: zero rows is an expectation`);
    assert.equal(validateStep(driver, { action: 'query', source: 'a_b-1', sql: 'SELECT 1', expect_json: { path: '0.a', equals: null } }), null, `${driver}: expect_json with a null equals`);
    assert.equal(validateStep(driver, { ...GOOD_STEP, expect_json: { path: '0.status', equals: 'done' } }), null, `${driver}: both expectations`);
  }
});

test('AC-11 validateStep rejects each malformed query step in both drivers, naming the rule', () => {
  /** @type {[string, any, string][]} */
  const bads = [
    ['no source', { action: 'query', sql: 'SELECT 1', expect_rows: 1 }, 'source name'],
    ['numeric source', { action: 'query', source: 5, sql: 'SELECT 1', expect_rows: 1 }, 'source name'],
    ['source with a space', { action: 'query', source: 'a b', sql: 'SELECT 1', expect_rows: 1 }, 'source name'],
    ['source starting with a dash', { action: 'query', source: '-a', sql: 'SELECT 1', expect_rows: 1 }, 'source name'],
    ['source over 40 characters', { action: 'query', source: 'a'.repeat(41), sql: 'SELECT 1', expect_rows: 1 }, 'source name'],
    ['no sql', { action: 'query', source: 'd1', expect_rows: 1 }, 'string sql'],
    ['empty sql', { action: 'query', source: 'd1', sql: '', expect_rows: 1 }, 'string sql'],
    ['numeric sql', { action: 'query', source: 'd1', sql: 7, expect_rows: 1 }, 'string sql'],
    ['no expectation', { action: 'query', source: 'd1', sql: 'SELECT 1' }, 'expect_rows or expect_json'],
    ['negative rows', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_rows: -1 }, 'expect_rows must be'],
    ['fractional rows', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_rows: 1.5 }, 'expect_rows must be'],
    ['string rows', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_rows: '1' }, 'expect_rows must be'],
    ['expect_json without equals', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_json: { path: '0.a' } }, 'expect_json needs path and equals'],
    ['expect_json without a string path', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_json: { path: 3, equals: 1 } }, 'expect_json needs path and equals'],
    ['expect_json not an object', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_json: 'x' }, 'expect_json needs path and equals'],
  ];
  for (const driver of ['http', 'browser']) {
    for (const [label, step, fragment] of bads) {
      const r = validateStep(driver, step);
      assert.ok(r, `${driver}: an invalid query step was accepted: ${label}`);
      assert.ok(r.reason.includes(fragment), `${driver}: ${label}: ${r.reason}`);
    }
  }
});

test('AC-11 validateStep rejects the nested query form naming the flat shape, and leaves existing step validation unchanged', () => {
  const nested = validateStep('http', { query: { source: 'd1', sql: 'SELECT 1' } });
  assert.ok(nested && nested.reason.includes('flat shape'), JSON.stringify(nested));
  const nestedBrowser = validateStep('browser', { query: { source: 'd1', sql: 'SELECT 1' } });
  assert.ok(nestedBrowser && nestedBrowser.reason.includes('flat shape'), JSON.stringify(nestedBrowser));
  assert.equal(validateStep('http', { action: 'request', method: 'GET', path: '/a' }), null);
  assert.equal(validateStep('browser', { action: 'goto', path: '/a' }), null);
  assert.ok(validateStep('http', { action: 'goto', path: '/a' }), 'a browser action is still not an http action');
});

test('AC-11 validateSteps: a {{name}} in sql must be bound by a capture, and a query step counts as the entry expectation', () => {
  const withVar = { ...GOOD_STEP, sql: 'SELECT id FROM t WHERE id = {{task_id}}' };
  const unbound = validateSteps('http', [withVar], []);
  assert.ok(unbound);
  assert.equal(unbound.code, 'PLAN_ENTRY_INVALID');
  assert.ok(unbound.reason.includes('task_id'), unbound.reason);
  assert.equal(validateSteps('http', [withVar], ['task_id']), null);
  assert.equal(validateSteps('browser', [withVar], ['task_id']), null);
  assert.equal(validateSteps('http', [GOOD_STEP], []), null, 'a query-only entry is a valid entry');
});

// ---------------------------------------------------------------------------
// Fixture: a target root with a fake query command
// ---------------------------------------------------------------------------

/**
 * A stand-in for wrangler / sqlite3: records its argv, then prints rows. The statement is the
 * last argument. "boom" in the statement exits 3, "garbage" prints non-JSON, "many" prints 150
 * rows. With -readonly in argv it prints a plain sqlite3 -json array, otherwise the d1 shape.
 */
const FAKE_QUERY = [
  "import { writeFileSync } from 'node:fs';",
  'const a = process.argv.slice(2);',
  'const sql = a[a.length - 1];',
  "writeFileSync('query-ran.txt', JSON.stringify(a));",
  "if (sql.includes('boom')) process.exit(3);",
  "if (sql.includes('garbage')) { process.stdout.write('not json'); process.exit(0); }",
  "const rows = sql.includes('many') ? Array.from({ length: 150 }, (_, i) => ({ id: i })) : [{ id: 7, status: 'done', email: 'person@example.test', alt: 'person@example.test', password: 'hunter2-value' }];",
  "process.stdout.write(a.includes('-readonly') ? JSON.stringify(rows) : JSON.stringify([{ results: rows, success: true }]));",
  '',
].join('\n');
const SEED_MARKER = "import { writeFileSync } from 'node:fs';\nwriteFileSync('ran.txt', 'ran');\n";

const FQ_D1 = [NODE, 'fake-query.mjs', '--local', '--json', '--command'];
const FQ_SOURCES = {
  d1: { kind: 'wrangler-d1', command: FQ_D1, redact_columns: ['email'] },
  lite: { kind: 'sqlite3', command: [NODE, 'fake-query.mjs', '-readonly', '-json'] },
  remote: { kind: 'wrangler-d1', command: [NODE, 'fake-query.mjs', '--local', '--remote', '--json', '--command'] },
  nolocal: { kind: 'wrangler-d1', command: [NODE, 'fake-query.mjs', '--json', '--command'] },
  badlite: { kind: 'sqlite3', command: [NODE, 'fake-query.mjs', '-json'] },
  urlsrc: { kind: 'wrangler-d1', command: [NODE, 'fake-query.mjs', '--local', '--json', 'http://example.com/x', '--command'] },
  gone: { kind: 'wrangler-d1', command: ['relay-no-such-binary-zz', '--local', '--json', '--command'] },
};

const RUN_DIR_REL = 'PRPs/reports/feat/qa-run/20260101T101010101Z';

/** Direct-call fixture for runQueryStep. */
function directFixture() {
  const root = tmp();
  writeFileSync(join(root, 'fake-query.mjs'), FAKE_QUERY);
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(join(runDirAbs, 'evidence'), { recursive: true });
  const ctx = /** @type {any} */ ({
    root,
    runDirAbs,
    runDirRel: RUN_DIR_REL,
    table: buildRedactionTable({ root, env: {} }),
    seedConfig: { query_sources: FQ_SOURCES },
    target: { guard },
  });
  const marker = join(root, 'query-ran.txt');
  return {
    root,
    marker,
    ctx,
    /** @param {string} sql @param {Record<string, any>} [extra] @param {string} [source] @param {number} [n] */
    run: (sql, extra = {}, source = 'd1', n = 1) => runQueryStep(ctx, { index: 1 }, { action: 'query', source, sql, ...extra }, n),
    /** @param {string} evidence */
    evidenceText: (evidence) => readFileSync(join(root, ...evidence.split('/')), 'utf8'),
    evidenceFiles: () => readdirSync(join(runDirAbs, 'evidence')),
  };
}

const OK_SQL = 'SELECT id, status, email FROM tasks WHERE id = 7';

test('AC-11 runQueryStep passes a matching query, passing the statement as the single last argv element of the declared command', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_rows: 1, expect_json: { path: '0.status', equals: 'done' } });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(typeof r.evidence, 'string');
  assert.equal(r.evidence, `${RUN_DIR_REL}/evidence/case-1.query-1.json`);
  const argv = JSON.parse(readFileSync(fx.marker, 'utf8'));
  assert.equal(argv[argv.length - 1], OK_SQL);
  assert.equal(argv.filter((/** @type {string} */ x) => x === OK_SQL).length, 1);
  assert.deepEqual(argv.slice(0, -1), ['--local', '--json', '--command'], 'the declared prefix arrives intact');
});

test('AC-11 runQueryStep names the step number in the evidence file name', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_rows: 1 }, 'd1', 3);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.evidence.endsWith('/evidence/case-1.query-3.json'), r.evidence);
});

test('AC-11 runQueryStep writes evidence recording the source, kind, engine control, count and the rows', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_rows: 1 });
  assert.equal(r.ok, true);
  const ev = JSON.parse(fx.evidenceText(r.evidence));
  assert.equal(ev.source, 'd1');
  assert.equal(ev.kind, 'wrangler-d1');
  assert.ok(ev.read_only_control.startsWith('none'), ev.read_only_control);
  assert.equal(ev.row_count, 1);
  assert.equal(ev.truncated, false);
  assert.equal(ev.rows.length, 1);
  assert.equal(ev.rows[0].id, 7);
  assert.equal(ev.rows[0].status, 'done');
});

test('AC-11 runQueryStep against a sqlite3 source parses plain -json output and records the sqlite3 -readonly control', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_rows: 1, expect_json: { path: '0.status', equals: 'done' } }, 'lite');
  assert.equal(r.ok, true, JSON.stringify(r));
  const ev = JSON.parse(fx.evidenceText(r.evidence));
  assert.equal(ev.kind, 'sqlite3');
  assert.equal(ev.read_only_control, 'sqlite3 -readonly');
  const argv = JSON.parse(readFileSync(fx.marker, 'utf8'));
  assert.ok(argv.includes('-readonly'), 'the engine control reached the command');
});

test('AC-16 runQueryStep evidence redacts redact_columns, registered copies of those values and secret-named columns', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_rows: 1 });
  assert.equal(r.ok, true);
  const text = fx.evidenceText(r.evidence);
  const ev = JSON.parse(text);
  assert.equal(ev.rows[0].email, '[REDACTED]', 'the declared column');
  assert.equal(ev.rows[0].alt, '[REDACTED]', 'the same value in another column is redacted too');
  assert.equal(ev.rows[0].password, '[REDACTED]', 'a secret-named column is redacted structurally');
  assert.ok(!text.includes('person@example.test'), 'the declared value never reaches a file');
  assert.ok(!text.includes('hunter2-value'));
  assert.equal(ev.rows[0].status, 'done', 'a column that is not secret is kept');
});

test('AC-11 runQueryStep caps the evidence rows at 100 and says so, while the assertion sees every row', async () => {
  const fx = directFixture();
  const r = await fx.run('SELECT id FROM many', { expect_rows: 150 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const ev = JSON.parse(fx.evidenceText(r.evidence));
  assert.equal(ev.row_count, 150);
  assert.equal(ev.truncated, true);
  assert.equal(ev.rows.length, 100);
});

test('AC-11 a failing row count is a fail naming the step and the counts, with the evidence listed and no row value', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_rows: 2 });
  assert.equal(r.ok, false);
  assert.equal(r.result.outcome, 'fail');
  assert.equal(r.result.reason_code, null);
  assert.ok(r.result.reason.includes('step 1'), r.result.reason);
  for (const leak of ['done', 'person@example.test', 'hunter2-value']) assert.ok(!r.result.reason.includes(leak), `the reason leaked ${leak}`);
  assert.equal(r.result.evidence.length, 1);
  assert.ok(existsSync(join(fx.root, ...r.result.evidence[0].split('/'))), 'the evidence file named by the result exists');
});

test('AC-11 a failing expect_json is a fail whose reason carries neither the row value nor the expected value', async () => {
  const fx = directFixture();
  const r = await fx.run(OK_SQL, { expect_json: { path: '0.status', equals: 'zzexpected-value' } });
  assert.equal(r.ok, false);
  assert.equal(r.result.outcome, 'fail');
  for (const leak of ['done', 'zzexpected-value']) assert.ok(!r.result.reason.includes(leak), `the reason leaked ${leak}`);
});

test('AC-11 runQueryStep refuses every unsafe statement as blocked QUERY_NOT_READ_ONLY with nothing executed and nothing written', async () => {
  const fx = directFixture();
  const statements = [
    'UPDATE tasks SET status = 1',
    'SELECT 1; SELECT 2',
    'PRAGMA query_only = 0',
    'ATTACH DATABASE x AS y',
    'VACUUM',
    'SELECT 1 -- trailing',
    `SELECT id FROM t WHERE a = ${Q}x${Q}; DROP TABLE t; --`,
    'SELECT $$x$$',
    'SELECT 1 \\ 2',
    `SELECT id FROM t WHERE a = ${Q}open`,
    'WITH t AS (SELECT 1) INSERT INTO u SELECT * FROM t',
  ];
  for (const sql of statements) {
    const r = await fx.run(sql, { expect_rows: 1 });
    assert.equal(r.ok, false, sql);
    assert.equal(r.result.outcome, 'blocked', sql);
    assert.equal(r.result.reason_code, 'QUERY_NOT_READ_ONLY', sql);
    assert.equal(existsSync(fx.marker), false, `the command ran for: ${sql}`);
  }
  assert.deepEqual(fx.evidenceFiles(), [], 'a refused statement writes no evidence');
});

test('AC-11 runQueryStep refuses an undeclared, invalid or non-local source with nothing executed', async () => {
  const fx = directFixture();
  /** @type {[string, string][]} */
  const cases = [
    ['nope', 'QUERY_SOURCE_UNDECLARED'],
    ['badlite', 'QUERY_SOURCE_INVALID'],
    ['remote', 'FAILED_NON_LOCAL_TARGET'],
    ['nolocal', 'FAILED_NON_LOCAL_TARGET'],
    ['urlsrc', 'FAILED_NON_LOCAL_TARGET'],
  ];
  for (const [source, code] of cases) {
    const r = await fx.run('SELECT 1', { expect_rows: 1 }, source);
    assert.equal(r.ok, false, source);
    assert.equal(r.result.outcome, 'blocked', source);
    assert.equal(r.result.reason_code, code, source);
    assert.ok(r.result.reason.includes('step 1'), source);
    assert.equal(existsSync(fx.marker), false, `${source}: the command ran`);
  }
});

test('AC-11 runQueryStep with no query_sources at all is QUERY_SOURCE_UNDECLARED', async () => {
  const fx = directFixture();
  for (const seedConfig of [null, {}, { states: {} }, { query_sources: 'x' }]) {
    fx.ctx.seedConfig = seedConfig;
    const r = await fx.run('SELECT 1', { expect_rows: 1 });
    assert.equal(r.ok, false, JSON.stringify(seedConfig));
    assert.equal(r.result.reason_code, 'QUERY_SOURCE_UNDECLARED', JSON.stringify(seedConfig));
  }
  assert.equal(existsSync(fx.marker), false);
});

test('AC-11 a command that exits non-zero or cannot be spawned is blocked QUERY_FAILED, never a pass, and the reason holds no statement fragment', async () => {
  const fx = directFixture();
  const boom = await fx.run('SELECT 1 AS boom', { expect_rows: 1 });
  assert.equal(boom.ok, false);
  assert.equal(boom.result.outcome, 'blocked');
  assert.equal(boom.result.reason_code, 'QUERY_FAILED');
  assert.ok(!boom.result.reason.includes('boom'), boom.result.reason);
  const gone = await fx.run('SELECT 1', { expect_rows: 1 }, 'gone');
  assert.equal(gone.ok, false);
  assert.equal(gone.result.reason_code, 'QUERY_FAILED');
  assert.deepEqual(fx.evidenceFiles(), [], 'a failed command writes no evidence');
});

test('AC-11 output that cannot be parsed as rows is blocked QUERY_OUTPUT_UNPARSEABLE', async () => {
  const fx = directFixture();
  const r = await fx.run('SELECT 1 AS garbage', { expect_rows: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.result.outcome, 'blocked');
  assert.equal(r.result.reason_code, 'QUERY_OUTPUT_UNPARSEABLE');
  assert.ok(!r.result.reason.includes('not json'), 'the output is not echoed');
});

test('AC-11 runQueryStep re-checks the final statement: a safe template turned unsafe by a substituted value is refused', async () => {
  const fx = directFixture();
  const template = 'SELECT status FROM tasks WHERE id = {{task_id}}';
  assert.equal(precheckQuerySteps([{ action: 'query', source: 'd1', sql: template, expect_rows: 1 }], FQ_SOURCES), null, 'the template itself is clean');
  const substituted = template.replace('{{task_id}}', '1; DROP TABLE tasks');
  const r = await fx.run(substituted, { expect_rows: 1 });
  assert.equal(r.ok, false);
  assert.equal(r.result.reason_code, 'QUERY_NOT_READ_ONLY');
  assert.equal(existsSync(fx.marker), false);
});

// ---------------------------------------------------------------------------
// The real runner end to end (http driver, loopback server, fake query command)
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
let hits = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    res.writeHead(path === '/ok' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

const STATE = 'A task exists';
const REQUEST_OK = { action: 'request', method: 'GET', path: '/ok', expect_status: 200 };

/** @param {{ seeded: boolean }[]} cases */
function reportOf(cases) {
  const blocks = cases.map((c, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** Case ${i + 1} title`,
      '**Risk level:** low',
      `**Required state:** ${c.seeded ? STATE : 'None'}`,
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      '1. Open the page.',
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/**
 * @param {{ cases: { seeded?: boolean, steps: any[] }[], states?: Record<string, any>, sources?: Record<string, any> }} o
 */
function e2eFixture(o) {
  const root = tmp();
  mkdirSync(join(root, ...RUN_DIR_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const cases = o.cases.map((c) => ({ seeded: c.seeded === true, steps: c.steps }));
  writeFileSync(join(root, 'PRPs', 'reports', 'feat', 'qa-report.md'), reportOf(cases));
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify({ states: o.states ?? {}, query_sources: o.sources ?? FQ_SOURCES }));
  writeFileSync(join(root, 'fake-query.mjs'), FAKE_QUERY);
  writeFileSync(join(root, 'seed-marker.mjs'), SEED_MARKER);
  writeFileSync(
    join(root, ...RUN_DIR_REL.split('/'), 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: cases.map((c, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: 'http', role: null, state: c.seeded ? 'declared' : 'none', steps: c.steps })),
    }),
  );
  return {
    root,
    queryRan: () => existsSync(join(root, 'query-ran.txt')),
    seedRan: () => existsSync(join(root, 'ran.txt')),
    /** @returns {string[]} the argv the fake query command received */
    queryArgv: () => JSON.parse(readFileSync(join(root, 'query-ran.txt'), 'utf8')),
  };
}

/**
 * @param {string} scriptPath
 * @param {string} root
 * @param {Record<string, string>} [env]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, results: any }>}
 */
function runRunner(scriptPath, root, env = {}) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [scriptPath, 'run', '--root', root, '--feature', 'feat', '--run-dir', RUN_DIR_REL], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_DIR_REL.split('/'), 'results.json');
      resolveP({ code, stdout, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

/** @param {string} dir @returns {string} every file under dir, concatenated */
function treeText(dir) {
  let out = '';
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    out += statSync(p).isDirectory() ? treeText(p) : readFileSync(p, 'latin1');
  }
  return out;
}

const SLOW = { timeout: 150000 };

test('AC-11 end to end: a case with a request and two query steps passes, asserts its rows and lists the evidence', SLOW, async () => {
  hits = {};
  const fx = e2eFixture({
    cases: [
      {
        steps: [
          REQUEST_OK,
          { action: 'query', source: 'd1', sql: OK_SQL, expect_rows: 1, expect_json: { path: '0.status', equals: 'done' } },
          { action: 'query', source: 'lite', sql: OK_SQL, expect_rows: 1 },
        ],
      },
    ],
  });
  const r = await runRunner(REAL_RUNNER, fx.root);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.equal(hits['/ok'], 1, 'the request step ran once');
  assert.equal(fx.queryRan(), true, 'the query command ran');
  assert.deepEqual(validateResults(r.results), []);
  const text = JSON.stringify(c);
  assert.ok(text.includes('case-1.query-2.json'), 'the first query step evidence is listed');
  assert.ok(text.includes('case-1.query-3.json'), 'the second query step evidence is listed');
  const ev2 = JSON.parse(readFileSync(join(fx.root, ...RUN_DIR_REL.split('/'), 'evidence', 'case-1.query-2.json'), 'utf8'));
  assert.equal(ev2.kind, 'wrangler-d1');
  const ev3 = JSON.parse(readFileSync(join(fx.root, ...RUN_DIR_REL.split('/'), 'evidence', 'case-1.query-3.json'), 'utf8'));
  assert.equal(ev3.read_only_control, 'sqlite3 -readonly');
});

test('AC-16 end to end: no row value of a redacted or secret-named column appears anywhere in the run directory', SLOW, async () => {
  hits = {};
  const fx = e2eFixture({ cases: [{ steps: [{ action: 'query', source: 'd1', sql: OK_SQL, expect_rows: 1 }] }] });
  const r = await runRunner(REAL_RUNNER, fx.root);
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  const everything = treeText(join(fx.root, ...RUN_DIR_REL.split('/')));
  assert.ok(everything.includes('[REDACTED]'), 'the evidence carries the redaction marker');
  assert.ok(!everything.includes('person@example.test'), 'a redact_columns value reached the run directory');
  assert.ok(!everything.includes('hunter2-value'), 'a secret-named column value reached the run directory');
  assert.ok(!r.stdout.includes('person@example.test') && !r.stderr.includes('person@example.test'), 'a row value reached the terminal');
});

test('AC-11 end to end: a query step whose rows miss the expectation makes the case fail, with a value-free reason', SLOW, async () => {
  hits = {};
  const fx = e2eFixture({ cases: [{ steps: [{ action: 'query', source: 'd1', sql: OK_SQL, expect_rows: 2 }] }] });
  const r = await runRunner(REAL_RUNNER, fx.root);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'fail', JSON.stringify(c));
  assert.ok(c.reason.includes('step 1'), c.reason);
  for (const leak of ['done', 'person@example.test', 'hunter2-value']) assert.ok(!c.reason.includes(leak), `the reason leaked ${leak}`);
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-11 end to end: every unsafe statement or source is refused by name before any seed, session, request or command', SLOW, async () => {
  hits = {};
  const SEEDED_STATES = { [STATE]: { command: [NODE, 'seed-marker.mjs'], status: 'confirmed', store: 'localhost:5432' } };
  /** @type {{ label: string, seeded?: boolean, step: any, code: string }[]} */
  const plan = [
    { label: 'UPDATE', step: { action: 'query', source: 'd1', sql: 'UPDATE tasks SET status = 1', expect_rows: 1 }, code: 'QUERY_NOT_READ_ONLY' },
    { label: 'multi-statement', step: { action: 'query', source: 'd1', sql: 'SELECT 1; SELECT 2', expect_rows: 1 }, code: 'QUERY_NOT_READ_ONLY' },
    { label: 'PRAGMA', step: { action: 'query', source: 'd1', sql: 'PRAGMA table_info(tasks)', expect_rows: 1 }, code: 'QUERY_NOT_READ_ONLY' },
    { label: 'comment', step: { action: 'query', source: 'd1', sql: 'SELECT 1 -- x', expect_rows: 1 }, code: 'QUERY_NOT_READ_ONLY' },
    { label: 'undeclared source', step: { action: 'query', source: 'nope', sql: 'SELECT 1', expect_rows: 1 }, code: 'QUERY_SOURCE_UNDECLARED' },
    { label: '--remote source', step: { action: 'query', source: 'remote', sql: 'SELECT 1', expect_rows: 1 }, code: 'FAILED_NON_LOCAL_TARGET' },
    { label: 'source without --local', step: { action: 'query', source: 'nolocal', sql: 'SELECT 1', expect_rows: 1 }, code: 'FAILED_NON_LOCAL_TARGET' },
    { label: 'sqlite3 without -readonly', step: { action: 'query', source: 'badlite', sql: 'SELECT 1', expect_rows: 1 }, code: 'QUERY_SOURCE_INVALID' },
    { label: 'non-local URL argument', step: { action: 'query', source: 'urlsrc', sql: 'SELECT 1', expect_rows: 1 }, code: 'FAILED_NON_LOCAL_TARGET' },
    { label: 'UPDATE after a declared state', seeded: true, step: { action: 'query', source: 'd1', sql: 'UPDATE tasks SET status = 1', expect_rows: 1 }, code: 'QUERY_NOT_READ_ONLY' },
    { label: 'non-local URL after a declared state', seeded: true, step: { action: 'query', source: 'urlsrc', sql: 'SELECT 1', expect_rows: 1 }, code: 'FAILED_NON_LOCAL_TARGET' },
  ];
  const fx = e2eFixture({ cases: plan.map((p) => ({ seeded: p.seeded, steps: [REQUEST_OK, p.step] })), states: SEEDED_STATES });
  const r = await runRunner(REAL_RUNNER, fx.root);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.equal(r.results.cases.length, plan.length);
  for (const [i, p] of plan.entries()) {
    const c = r.results.cases[i];
    assert.equal(c.outcome, 'blocked', `${p.label}: ${JSON.stringify(c)}`);
    assert.equal(c.reason_code, p.code, p.label);
    assert.ok(c.reason.includes('step 2'), `${p.label}: ${c.reason}`);
  }
  assert.deepEqual(hits, {}, 'a request reached the server although every case was refused');
  assert.equal(fx.queryRan(), false, 'a query command was executed');
  assert.equal(fx.seedRan(), false, 'a seed ran although the query was refused first');
  assert.deepEqual(validateResults(r.results), []);
  for (const o of r.results.cases) assert.ok(OUTCOMES.includes(o.outcome));
});

test('AC-11 end to end: a captured value that turns the statement unsafe after substitution is refused and the command never runs', SLOW, async () => {
  hits = {};
  const seedScript = (/** @type {string} */ id) => `console.log(JSON.stringify({ id: ${JSON.stringify(id)} }));\n`;
  const states = { [STATE]: { command: [NODE, 'seed-capture.mjs'], status: 'confirmed', store: 'localhost:5432', captures: { task_id: { path: 'id' } } } };
  const step = { action: 'query', source: 'd1', sql: 'SELECT status FROM tasks WHERE id = {{task_id}}', expect_rows: 1 };

  const unsafe = e2eFixture({ cases: [{ seeded: true, steps: [step] }], states });
  writeFileSync(join(unsafe.root, 'seed-capture.mjs'), seedScript('1; DROP TABLE tasks'));
  const refused = await runRunner(REAL_RUNNER, unsafe.root);
  assert.ok(refused.results, `no results.json: ${refused.stderr}`);
  const c = refused.results.cases[0];
  assert.equal(c.outcome, 'blocked', JSON.stringify(c));
  assert.equal(c.reason_code, 'QUERY_NOT_READ_ONLY');
  assert.equal(unsafe.queryRan(), false, 'the substituted statement was executed');
  assert.ok(!c.reason.includes('DROP'), 'the reason carries no fragment of the substituted statement');

  const safe = e2eFixture({ cases: [{ seeded: true, steps: [step] }], states });
  writeFileSync(join(safe.root, 'seed-capture.mjs'), seedScript('7'));
  const ran = await runRunner(REAL_RUNNER, safe.root);
  const ok = ran.results.cases[0];
  assert.equal(ok.outcome, 'pass', JSON.stringify(ok));
  const argv = safe.queryArgv();
  assert.equal(argv[argv.length - 1], 'SELECT status FROM tasks WHERE id = 7', 'the captured value was substituted into the statement');
});

/**
 * Copies the runner (and optionally its query module) into a temp plugin tree.
 * @param {{ withQuery: boolean }} o
 * @returns {string} the copied script path
 */
function pluginCopy(o) {
  const dir = tmp();
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'scripts', 'qa-run.mjs'), RUNNER_TEXT);
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  if (o.withQuery) copyFileSync(REAL_QUERY, join(dir, 'scripts', 'qa-query.mjs'));
  return join(dir, 'scripts', 'qa-run.mjs');
}
/** Playwright resolves from the repo's node_modules for copied runners. */
const COPY_ENV = { NODE_PATH: resolve('node_modules') };

test('AC-11 end to end: a runner copy without its query module blocks a query case QUERY_MODULE_UNAVAILABLE and still runs every other case', SLOW, async () => {
  hits = {};
  const fx = e2eFixture({
    cases: [
      { steps: [REQUEST_OK, { action: 'query', source: 'd1', sql: OK_SQL, expect_rows: 1 }] },
      { steps: [REQUEST_OK] },
    ],
  });
  const r = await runRunner(pluginCopy({ withQuery: false }), fx.root, COPY_ENV);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const [query, plain] = r.results.cases;
  assert.equal(query.outcome, 'blocked', JSON.stringify(query));
  assert.equal(query.reason_code, 'QUERY_MODULE_UNAVAILABLE');
  assert.equal(fx.queryRan(), false, 'a query command ran without its module');
  assert.equal(plain.outcome, 'pass', `a case with no query step needs no query module: ${JSON.stringify(plain)}`);
  assert.equal(hits['/ok'], 1, 'only the case without a query step sent its request');
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-11 end to end: the same runner copy with its query module present runs the query case', SLOW, async () => {
  hits = {};
  const fx = e2eFixture({ cases: [{ steps: [REQUEST_OK, { action: 'query', source: 'd1', sql: OK_SQL, expect_rows: 1 }] }] });
  const r = await runRunner(pluginCopy({ withQuery: true }), fx.root, COPY_ENV);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  assert.equal(fx.queryRan(), true);
});

// ---------------------------------------------------------------------------
// Contract pins, guard-site registration and the command doc
// ---------------------------------------------------------------------------

/** @param {string | null | undefined} queryModuleText */
const contractFindings = (queryModuleText) =>
  checkQaRunContract({ scriptText: RUNNER_TEXT, commandText: COMMAND_TEXT, results: [], queryModuleText }).findings.filter((f) => f.file === QUERY_FILE);

test('AC-16 contract: the real query module adds no finding and the real-tree entry point agrees', () => {
  assert.deepEqual(contractFindings(QUERY_TEXT), []);
  const real = runQaRunContractCheck();
  assert.deepEqual(real.findings, []);
  assert.equal(real.ok, true);
});

test('AC-16 contract: a missing query module is a finding, and an omitted queryModuleText adds none', () => {
  const missing = contractFindings(null);
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /missing or unreadable file/);
  assert.deepEqual(contractFindings(undefined), []);
});

test('AC-16 contract: each process, write or network surface in the query module is its own finding', () => {
  const clean = 'QUERY_NOT_READ_ONLY FAILED_NON_LOCAL_TARGET --remote -readonly';
  assert.deepEqual(contractFindings(clean), []);
  for (const banned of ['child_process', 'writeFileSync(a,b)', 'renameSync(a,b)', 'appendFileSync(a,b)', 'fetch(u)']) {
    const found = contractFindings(`${clean} ${banned}`);
    assert.equal(found.length, 1, `${banned}: ${JSON.stringify(found)}`);
    assert.ok(found[0].message.includes(banned.split('(')[0]), found[0].message);
  }
});

test('AC-11 contract: each required refusal token missing from the query module is its own finding', () => {
  const tokens = ['QUERY_NOT_READ_ONLY', 'FAILED_NON_LOCAL_TARGET', '--remote', '-readonly'];
  for (const missing of tokens) {
    const text = tokens.filter((t) => t !== missing).join(' ');
    const found = contractFindings(text);
    assert.equal(found.length, 1, `${missing}: ${JSON.stringify(found)}`);
    assert.ok(found[0].message.includes(missing), found[0].message);
  }
});

test('AC-15/AC-16 the real query module spends no process, write or network surface and the runner keeps its single guard and write sites', () => {
  for (const banned of ['child_process', 'writeFileSync', 'renameSync', 'appendFileSync', 'fetch(']) assert.ok(!QUERY_TEXT.includes(banned), banned);
  assert.ok(!/\bimport\b[^\n]*qa-run/.test(QUERY_TEXT), 'the query module must not import the runner (no cycle)');
  assert.equal(RUNNER_TEXT.split('// GUARD-SITE').length - 1, 1);
  assert.equal(RUNNER_TEXT.split('// WRITE-SITE').length - 1, 1);
  assert.equal(RUNNER_TEXT.split('writeFileSync(').length - 1, 1);
  assert.equal(RUNNER_TEXT.split('renameSync(').length - 1, 1);
  assert.ok(RUNNER_TEXT.includes("export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];"));
  assert.deepEqual([...OUTCOMES], ['pass', 'fail', 'blocked', 'needs-human'], 'no fifth outcome');
});

test('AC-11 the runner loads its query module lazily, through exactly one dynamic import and no static import', () => {
  assert.equal(RUNNER_TEXT.split("import('./qa-query.mjs')").length - 1, 1);
  assert.ok(!/^import\b[^\n]*qa-query\.mjs/m.test(RUNNER_TEXT), 'a static import would break every runner copy made without the module');
});

test('AC-11 guard sites: the query module is registered, satisfies its rules on the real tree, and losing a required token is flagged', () => {
  const site = GUARD_SITES.find((s) => s.file === QUERY_FILE);
  assert.ok(site, 'qa-query.mjs is a registered guard site');
  assert.deepEqual([...site.required].sort(), ['--local', '--preview', '--remote', '-readonly', 'FAILED_NON_LOCAL_TARGET', 'QUERY_NOT_READ_ONLY'].sort());
  assert.ok(site.forbidden.includes('--local-host'));
  const real = runAuthLocalGuardSitesCheck();
  assert.deepEqual(real.findings, []);
  /** @returns {Record<string, string | null>} */
  const realFiles = () => Object.fromEntries(GUARD_SITES.map((s) => [s.file, read(s.file)]));
  for (const token of site.required) {
    const files = realFiles();
    files[QUERY_FILE] = /** @type {string} */ (files[QUERY_FILE]).split(token).join('');
    const found = checkAuthLocalGuardSites({ files }).findings.filter((f) => f.file === QUERY_FILE);
    assert.ok(found.some((f) => f.message.includes(`\`${token}\``)), `losing ${token} was not flagged: ${JSON.stringify(found)}`);
  }
  const forbidden = realFiles();
  forbidden[QUERY_FILE] += '\n// --local-host\n';
  assert.ok(checkAuthLocalGuardSites({ files: forbidden }).findings.some((f) => f.file === QUERY_FILE && f.message.includes('forbidden token')));
  const absent = realFiles();
  absent[QUERY_FILE] = null;
  assert.ok(checkAuthLocalGuardSites({ files: absent }).findings.some((f) => f.file === QUERY_FILE && f.message.includes('missing')));
});

test('AC-11/AC-16 the runner command doc names the query refusal codes, the source declaration and no longer tells the agent to omit database reads', () => {
  for (const token of [
    'QUERY_NOT_READ_ONLY',
    'QUERY_SOURCE_UNDECLARED',
    'QUERY_SOURCE_INVALID',
    'QUERY_FAILED',
    'QUERY_OUTPUT_UNPARSEABLE',
    'QUERY_MODULE_UNAVAILABLE',
    'query_sources',
    'redact_columns',
    'expect_rows',
    'FAILED_NON_LOCAL_TARGET',
  ]) {
    assert.ok(COMMAND_TEXT.includes(token), token);
  }
  assert.ok(!COMMAND_TEXT.includes('a CLI, a database query'), 'the omit-list still names a database query');
});

test('AC-11 the runner command doc carries a literal query step example that the runner itself validates', () => {
  const blocks = [...COMMAND_TEXT.matchAll(/<!-- qa-step-example driver=(http|browser) -->\n```json\n([\s\S]*?)\n```/g)];
  const queries = blocks.map((m) => ({ driver: m[1], step: JSON.parse(m[2]) })).filter((b) => b.step.action === 'query');
  assert.ok(queries.length >= 1, 'no query step example found');
  for (const { driver, step } of queries) assert.equal(validateStep(driver, step), null, JSON.stringify(step));
});
