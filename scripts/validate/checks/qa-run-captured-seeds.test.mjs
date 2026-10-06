// @ts-check
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-2 Variables resolve or the case never starts
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-3 A seed can hand a generated value to later steps
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-10 Declared stores pass the local-only guard (seed side)
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-15 Frozen surfaces and the closed outcome vocabulary
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-16 Captured values never reach evidence in clear
/**
 * Phase 2 (captured seeds) of qa-runner-case-vocabulary.
 *
 * Pure-function tests for the exported capture helpers, `runSeed` tests that spawn
 * `process.execPath -e <script>` (no network, no Playwright), and a few end-to-end runs
 * of the real script against 127.0.0.1 servers using the http driver only.
 *
 * Source plan: PRPs/plans/completed/qa-runner-case-vocabulary-phase-2-captured-seeds.plan.md
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import {
  declaredCaptureNames,
  parseSeedCaptures,
  substituteVariables,
  normalizeStore,
  runSeed,
  validateSteps,
  OUTCOMES,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import * as guard from '../../../plugins/relay/scripts/auth-local-guard.mjs';
import { validateResults } from './qa-run-contract.mjs';

const REAL_SCRIPT = resolve('plugins/relay/scripts/qa-run.mjs');
const COMMAND = readFileSync('plugins/relay/commands/relay-qa-run.md', 'utf8').replace(/\r\n/g, '\n');

/** @type {string[]} */
const temps = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'relay-qaseed-'));
  temps.push(d);
  return d;
};

// ---------------------------------------------------------------------------
// declaredCaptureNames: which names a declaration binds
// ---------------------------------------------------------------------------

const CFG = {
  states: {
    S: { command: ['x'], captures: { a: { path: 'x' }, b: { path: 'y' }, 'bad name': { path: 'z' }, c: { path: '' }, d: 'nope', e: { path: 5 } } },
    Legacy: { command: ['x'] },
  },
};

test('AC-2 declaredCaptureNames returns only the well-formed capture names of the declared state', () => {
  assert.deepEqual(declaredCaptureNames(CFG, 'S', 'declared'), ['a', 'b']);
});

test('AC-2 declaredCaptureNames binds nothing outside a declared state, for an unknown state, a legacy declaration or no config', () => {
  assert.deepEqual(declaredCaptureNames(CFG, 'S', 'none'), []);
  assert.deepEqual(declaredCaptureNames(CFG, 'S', 'role-only'), []);
  assert.deepEqual(declaredCaptureNames(CFG, 'other', 'declared'), []);
  assert.deepEqual(declaredCaptureNames(CFG, 'Legacy', 'declared'), []);
  assert.deepEqual(declaredCaptureNames(null, 'S', 'declared'), []);
  assert.deepEqual(declaredCaptureNames({}, 'S', 'declared'), []);
});

test('AC-2 declaredCaptureNames only honours own properties (no prototype-chain state names)', () => {
  assert.deepEqual(declaredCaptureNames({ states: {} }, 'constructor', 'declared'), []);
  assert.deepEqual(declaredCaptureNames({ states: {} }, 'toString', 'declared'), []);
});

test('AC-2 a declared capture name binds the reference; an undeclared one is still refused naming the variable', () => {
  const step = { action: 'request', method: 'GET', path: '/api/items/{{item_id}}', expect_status: 200 };
  const bound = { states: { S: { command: ['x'], captures: { item_id: { path: 'id' } } } } };
  assert.equal(validateSteps('http', [step], declaredCaptureNames(bound, 'S', 'declared')), null);
  const r = validateSteps('http', [step], declaredCaptureNames({ states: {} }, 'S', 'declared'));
  assert.ok(r);
  assert.equal(r.code, 'PLAN_ENTRY_INVALID');
  assert.match(r.reason, /item_id/);
});

// ---------------------------------------------------------------------------
// parseSeedCaptures: values come from the seed's JSON output only
// ---------------------------------------------------------------------------

test('AC-3 parseSeedCaptures resolves dotted paths, stringifies scalars and carries redact only when exactly true', () => {
  const r = parseSeedCaptures(
    '  {"row":{"id":"abc-12345","n":7,"ok":false,"list":[{"k":"v"}]}}\n',
    { item_id: { path: 'row.id' }, count: { path: 'row.n', redact: true }, flag: { path: 'row.ok', redact: 'yes' }, plain: { path: 'row.id', redact: false } },
  );
  assert.ok(r.ok);
  assert.deepEqual(r.values, {
    item_id: { value: 'abc-12345', redact: false },
    count: { value: '7', redact: true },
    flag: { value: 'false', redact: false },
    plain: { value: 'abc-12345', redact: false },
  });
});

test('AC-3 parseSeedCaptures: output that is not JSON is CAPTURE_MISSING naming every declared variable', () => {
  const r = parseSeedCaptures('hello world', { item_id: { path: 'id' }, other: { path: 'o' } });
  assert.ok(!r.ok);
  assert.equal(r.code, 'CAPTURE_MISSING');
  assert.match(r.reason, /item_id/);
  assert.match(r.reason, /other/);
});

test('AC-3 parseSeedCaptures: an absent path, null, an object or an array at the path is CAPTURE_MISSING naming the variable and never a value', () => {
  const secret = 'zzz-secret-value-1';
  const doc = JSON.stringify({ other: secret, nul: null, obj: { a: secret }, arr: [secret] });
  for (const path of ['id', 'nul', 'obj', 'arr']) {
    const r = parseSeedCaptures(doc, { item_id: { path } });
    assert.ok(!r.ok, path);
    assert.equal(r.code, 'CAPTURE_MISSING', path);
    assert.match(r.reason, /item_id/, path);
    assert.ok(!r.reason.includes(secret), `${path}: the reason leaked a value from the output`);
  }
});

test('AC-3 parseSeedCaptures: a partial result is not accepted, the missing variable is named and the present value is not echoed', () => {
  const r = parseSeedCaptures('{"id":"present-value-77"}', { item_id: { path: 'id' }, gone: { path: 'nope' } });
  assert.ok(!r.ok);
  assert.match(r.reason, /gone/);
  assert.ok(!r.reason.includes('present-value-77'));
});

test('AC-3 parseSeedCaptures: a malformed entry is CAPTURE_MISSING', () => {
  for (const entry of [{ path: '' }, {}, 'id', null, { path: 3 }]) {
    const r = parseSeedCaptures('{"id":"v"}', { item_id: entry });
    assert.ok(!r.ok, JSON.stringify(entry));
    assert.equal(r.code, 'CAPTURE_MISSING');
  }
});

// ---------------------------------------------------------------------------
// substituteVariables
// ---------------------------------------------------------------------------

const STEP = { action: 'request', method: 'POST', path: '/api/items/{{item_id}}', body: { deep: { ids: ['{{item_id}}', 'x'] }, n: 3 }, expect_json: { path: 'a', equals: '{{ item_id }}' }, expect_status: 200 };
const VALUES = { item_id: { value: 'abc-12345', redact: false } };

test('AC-3 substituteVariables replaces every reference at any depth, with or without inner whitespace, and leaves non-strings alone', () => {
  const out = substituteVariables(STEP, VALUES);
  assert.equal(out.path, '/api/items/abc-12345');
  assert.deepEqual(out.body, { deep: { ids: ['abc-12345', 'x'] }, n: 3 });
  assert.equal(out.expect_json.equals, 'abc-12345');
  assert.equal(out.expect_status, 200);
  assert.equal(out.action, 'request');
});

test('AC-3 substituteVariables does not mutate its input and leaves an unknown name as written', () => {
  const before = JSON.stringify(STEP);
  substituteVariables(STEP, VALUES);
  assert.equal(JSON.stringify(STEP), before);
  assert.equal(substituteVariables(STEP, {}).path, '/api/items/{{item_id}}');
  assert.equal(substituteVariables({ action: 'request', method: 'GET', path: '/{{a}}/{{b}}' }, { a: { value: '1', redact: false } }).path, '/1/{{b}}');
});

test('AC-3 substituteVariables never touches the action key, even when it looks like a reference', () => {
  const out = substituteVariables({ action: '{{item_id}}', path: '/p' }, VALUES);
  assert.equal(out.action, '{{item_id}}');
});

test('AC-3 substituteVariables ignores prototype names (a value named constructor is not resolved from Object.prototype)', () => {
  const out = substituteVariables({ action: 'request', method: 'GET', path: '/{{constructor}}/{{toString}}' }, {});
  assert.equal(out.path, '/{{constructor}}/{{toString}}');
});

// ---------------------------------------------------------------------------
// normalizeStore
// ---------------------------------------------------------------------------

test('AC-10 normalizeStore: a URL is unchanged, host and host:port get an http scheme', () => {
  assert.equal(normalizeStore('postgres://localhost/db'), 'postgres://localhost/db');
  assert.equal(normalizeStore('http://127.0.0.1:5432'), 'http://127.0.0.1:5432');
  assert.equal(normalizeStore('localhost:5432'), 'http://localhost:5432');
  assert.equal(normalizeStore('db.internal'), 'http://db.internal');
});

test('AC-10 normalizeStore: empty, non-string, whitespace, or a path without a scheme is null', () => {
  for (const bad of ['', 5, null, undefined, {}, 'a b', 'host/path', ' localhost', 'host:port', 'host:']) {
    assert.equal(normalizeStore(bad), null, String(bad));
  }
});

// ---------------------------------------------------------------------------
// runSeed: real spawn, real guard
// ---------------------------------------------------------------------------

const NODE = process.execPath;
/** @param {string} code */
const emit = (code) => [NODE, '-e', code];
const MARKER_WRITER = `require("node:fs").writeFileSync(process.argv[1], "ran")`;

/** @param {string} root */
const makeCtx = (root) => /** @type {any} */ ({ root, target: { guard } });
/** @param {Record<string, any>} [extra] */
const decl = (extra = {}) => ({ store: 'localhost:5432', captures: { item_id: { path: 'id' } }, ...extra });

test('AC-3 runSeed returns the captured value read from the seed output on stdout', async () => {
  const r = await runSeed(makeCtx(tmp()), emit('console.log(JSON.stringify({id:"abc-12345"}))'), decl());
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(/** @type {any} */ (r).captures, { item_id: { value: 'abc-12345', redact: false } });
});

test('AC-3 runSeed: non-JSON output and an absent path both block CAPTURE_MISSING, the latter naming the variable', async () => {
  const ctx = makeCtx(tmp());
  const notJson = await runSeed(ctx, emit('console.log("hello")'), decl());
  assert.ok(!notJson.ok);
  assert.equal(notJson.code, 'CAPTURE_MISSING');
  const absent = await runSeed(ctx, emit('console.log(JSON.stringify({other:"zzz-secret-9"}))'), decl());
  assert.ok(!absent.ok);
  assert.equal(absent.code, 'CAPTURE_MISSING');
  assert.match(absent.reason, /item_id/);
  assert.ok(!absent.reason.includes('zzz-secret-9'));
});

test('AC-3 runSeed: output over the 65536-byte bound is CAPTURE_MISSING, never a partial parse', async () => {
  const r = await runSeed(makeCtx(tmp()), emit('console.log(JSON.stringify({id:"abc-12345",pad:"x".repeat(200000)}))'), decl());
  assert.ok(!r.ok);
  assert.equal(r.code, 'CAPTURE_MISSING');
  assert.match(r.reason, /65536/);
});

test('AC-3 runSeed: a failing seed is SEED_FAILED with its status even when it declares captures', async () => {
  const r = await runSeed(makeCtx(tmp()), emit('process.exit(3)'), decl());
  assert.ok(!r.ok);
  assert.equal(r.code, 'SEED_FAILED');
  assert.match(r.reason, /status 3/);
});

test('AC-3 runSeed: a command-only (legacy) declaration still runs, captures nothing and returns ok', async () => {
  const root = tmp();
  const marker = join(root, 'm.txt');
  const r = await runSeed(makeCtx(root), [NODE, '-e', MARKER_WRITER, marker], { command: [] });
  assert.equal(r.ok, true);
  assert.equal(/** @type {any} */ (r).captures, undefined);
  assert.ok(existsSync(marker));
  const noDecl = await runSeed(makeCtx(root), emit(''));
  assert.equal(noDecl.ok, true);
});

test('AC-10 runSeed: a non-local declared store is FAILED_NON_LOCAL_TARGET and the command is never executed', async () => {
  const root = tmp();
  const marker = join(root, 'm.txt');
  for (const store of ['evil.example:5432', 'postgres://evil.example/db', 'http://user@localhost:5432']) {
    const r = await runSeed(makeCtx(root), [NODE, '-e', MARKER_WRITER, marker], decl({ store }));
    assert.ok(!r.ok, store);
    assert.equal(r.code, 'FAILED_NON_LOCAL_TARGET', store);
    assert.equal(existsSync(marker), false, `${store}: the seed ran`);
  }
});

test('AC-10 runSeed: a capturing declaration with a missing or unreadable store is refused unexecuted', async () => {
  const root = tmp();
  const marker = join(root, 'm.txt');
  const argv = [NODE, '-e', MARKER_WRITER, marker];
  for (const d of [{ captures: { item_id: { path: 'id' } } }, decl({ store: '' }), decl({ store: 'a b' }), decl({ store: 7 })]) {
    const r = await runSeed(makeCtx(root), argv, d);
    assert.ok(!r.ok, JSON.stringify(d));
    assert.equal(r.code, 'FAILED_NON_LOCAL_TARGET', JSON.stringify(d));
    assert.equal(existsSync(marker), false);
  }
});

test('AC-10 runSeed: a declaration that names a store without captures is guard-checked too', async () => {
  const root = tmp();
  const marker = join(root, 'm.txt');
  const argv = [NODE, '-e', MARKER_WRITER, marker];
  const bad = await runSeed(makeCtx(root), argv, { command: argv, store: 'evil.example:1' });
  assert.ok(!bad.ok);
  assert.equal(bad.code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(existsSync(marker), false);
  const good = await runSeed(makeCtx(root), argv, { command: argv, store: 'localhost:5432' });
  assert.equal(good.ok, true);
  assert.ok(existsSync(marker));
});

test('AC-10 runSeed: the store refusal reason carries no argv value', async () => {
  const r = await runSeed(makeCtx(tmp()), [NODE, '-e', 'argv-secret-token-1'], decl({ store: 'evil.example:5432' }));
  assert.ok(!r.ok);
  assert.ok(!r.reason.includes('argv-secret-token-1'));
});

test('AC-10 runSeed: an argv element naming a non-local URL is still refused unexecuted', async () => {
  const root = tmp();
  const marker = join(root, 'm.txt');
  const r = await runSeed(makeCtx(root), [NODE, '-e', MARKER_WRITER, marker, 'http://evil.example/x'], {});
  assert.ok(!r.ok);
  assert.equal(r.code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(existsSync(marker), false);
});

test('AC-16 runSeed: a redact-marked capture shorter than 4 characters is CAPTURE_UNREDACTABLE naming the variable only', async () => {
  const r = await runSeed(makeCtx(tmp()), emit('console.log(JSON.stringify({id:"ab"}))'), decl({ captures: { item_id: { path: 'id', redact: true } } }));
  assert.ok(!r.ok);
  assert.equal(r.code, 'CAPTURE_UNREDACTABLE');
  assert.match(r.reason, /item_id/);
  assert.ok(!r.reason.includes('"ab"'));
});

test('AC-16 runSeed: a redact-marked capture of 4 or more characters is accepted and flagged redact; a short one without redact is accepted', async () => {
  const ctx = makeCtx(tmp());
  const long = await runSeed(ctx, emit('console.log(JSON.stringify({id:"abcd"}))'), decl({ captures: { item_id: { path: 'id', redact: true } } }));
  assert.equal(long.ok, true);
  assert.deepEqual(/** @type {any} */ (long).captures.item_id, { value: 'abcd', redact: true });
  const short = await runSeed(ctx, emit('console.log(JSON.stringify({id:"ab"}))'), decl());
  assert.equal(short.ok, true);
});

// ---------------------------------------------------------------------------
// End to end through the real runner (http driver, loopback server)
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
    res.writeHead(path.startsWith('/item/') || path === '/ok' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const STATE_TEXT = 'A row exists';

/**
 * @param {{ steps: any[], seed?: any, seedScript?: string }} o
 */
function seedRunFixture(o) {
  const root = tmp();
  mkdirSync(join(root, ...RUN_DIR_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const report = [
    '# QA Report', '', '## Test Cases', '',
    '### Case 1', '**Title:** Uses the seeded id', '**Risk level:** low', `**Required state:** ${STATE_TEXT}`,
    '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**',
    '1. Open the page.', '', '## Notes', '', 'none', '',
  ].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), report);
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  writeFileSync(
    join(root, ...RUN_DIR_REL.split('/'), 'plan.json'),
    JSON.stringify({ schema_version: 1, cases: [{ index: 1, title: 'Uses the seeded id', driver: 'http', role: null, state: 'declared', steps: o.steps }] }),
  );
  const marker = join(root, 'seed-marker.txt');
  const seed = o.seed ?? {
    states: { [STATE_TEXT]: { command: [NODE, '-e', o.seedScript ?? 'console.log(JSON.stringify({id:"abc-12345"}))'], status: 'confirmed', store: 'localhost:5432', captures: { item_id: { path: 'id' } } } },
  };
  writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify(seed));
  const runDir = join(root, ...RUN_DIR_REL.split('/'));
  return {
    root,
    runDir,
    marker,
    results: () => (existsSync(join(runDir, 'results.json')) ? JSON.parse(readFileSync(join(runDir, 'results.json'), 'utf8')) : null),
  };
}

/** @param {ReturnType<typeof seedRunFixture>} fx */
function runRunner(fx) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_SCRIPT, 'run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL], {
      cwd: fx.root,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (e) => { clearTimeout(timer); rejectP(e); });
    child.on('close', (code) => { clearTimeout(timer); resolveP({ code, stdout, stderr, results: fx.results() }); });
  });
}

/** @param {string} dir @returns {string} all file text under dir except plan.json */
function allText(dir) {
  /** @type {string[]} */ const parts = [];
  /** @param {string} d */
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name !== 'plan.json') parts.push(readFileSync(p).toString('latin1'));
    }
  };
  walk(dir);
  return parts.join('\n');
}

const ITEM_STEP = { action: 'request', method: 'GET', path: '/item/{{item_id}}', expect_status: 200 };

test('AC-3 end to end: a seed creates an id, the request path uses it, and the case passes', async () => {
  hits = {};
  const fx = seedRunFixture({ steps: [ITEM_STEP] });
  const r = /** @type {any} */ (await runRunner(fx));
  assert.equal(r.code, 0, r.stderr);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.equal(hits['/item/abc-12345'], 1, JSON.stringify(hits));
  assert.deepEqual(validateResults(r.results), []);
  assert.ok(OUTCOMES.includes(c.outcome));
});

test('AC-3 end to end: seed output lacking the declared path blocks CAPTURE_MISSING and no step runs', async () => {
  hits = {};
  const fx = seedRunFixture({ steps: [ITEM_STEP], seedScript: 'console.log(JSON.stringify({other:"x"}))' });
  const r = /** @type {any} */ (await runRunner(fx));
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'CAPTURE_MISSING');
  assert.match(c.reason, /item_id/);
  assert.deepEqual(hits, {}, 'no request reached the server');
});

test('AC-3 end to end: non-JSON seed output blocks CAPTURE_MISSING and no step runs', async () => {
  hits = {};
  const fx = seedRunFixture({ steps: [ITEM_STEP], seedScript: 'console.log("created")' });
  const r = /** @type {any} */ (await runRunner(fx));
  assert.equal(r.results.cases[0].reason_code, 'CAPTURE_MISSING');
  assert.deepEqual(hits, {});
});

test('AC-10 end to end: a non-local declared store blocks the case FAILED_NON_LOCAL_TARGET with the seed unexecuted and no request sent', async () => {
  hits = {};
  const root0 = tmp();
  const marker = join(root0, 'ran.txt');
  const seed = {
    states: { [STATE_TEXT]: { command: [NODE, '-e', MARKER_WRITER, marker], status: 'confirmed', store: 'evil.example:5432', captures: { item_id: { path: 'id' } } } },
  };
  const fx = seedRunFixture({ steps: [ITEM_STEP], seed });
  const r = /** @type {any} */ (await runRunner(fx));
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(existsSync(marker), false, 'the seed command was executed');
  assert.deepEqual(hits, {});
});

test('AC-2 end to end: an unbound reference is needs-human PLAN_ENTRY_INVALID naming the variable before the seed ran or any request was sent', async () => {
  hits = {};
  const root0 = tmp();
  const marker = join(root0, 'ran.txt');
  const seed = { states: { [STATE_TEXT]: { command: [NODE, '-e', MARKER_WRITER, marker] } } };
  const fx = seedRunFixture({ steps: [{ ...ITEM_STEP, path: '/item/{{unbound_id}}' }], seed });
  const r = /** @type {any} */ (await runRunner(fx));
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'needs-human');
  assert.equal(c.reason_code, 'PLAN_ENTRY_INVALID');
  assert.match(c.reason, /unbound_id/);
  assert.equal(existsSync(marker), false, 'the seed ran before validation');
  assert.deepEqual(hits, {});
});

test('AC-2 end to end: a name bound by one capture does not bind a different name in the plan', async () => {
  hits = {};
  const fx = seedRunFixture({ steps: [{ ...ITEM_STEP, path: '/item/{{other_id}}' }] });
  const r = /** @type {any} */ (await runRunner(fx));
  assert.equal(r.results.cases[0].reason_code, 'PLAN_ENTRY_INVALID');
  assert.match(r.results.cases[0].reason, /other_id/);
  assert.deepEqual(hits, {});
});

test('AC-10 end to end: a captured value that redirects the path off the approved origin is refused before any request', async () => {
  hits = {};
  const fx = seedRunFixture({
    steps: [{ action: 'request', method: 'GET', path: '{{item_id}}', expect_status: 200 }],
    seedScript: 'console.log(JSON.stringify({id:"//evil.example/x"}))',
  });
  const r = /** @type {any} */ (await runRunner(fx));
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.deepEqual(hits, {});
});

test('AC-16 end to end: a redact-marked capture used in a path never appears in clear under the run directory', async () => {
  hits = {};
  const secret = 'redactme-9876-Qx';
  const seed = {
    states: { [STATE_TEXT]: { command: [NODE, '-e', `console.log(JSON.stringify({tok:"${secret}"}))`], status: 'confirmed', store: 'localhost:5432', captures: { item_id: { path: 'tok', redact: true } } } },
  };
  const fx = seedRunFixture({ steps: [ITEM_STEP], seed });
  const r = /** @type {any} */ (await runRunner(fx));
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  assert.equal(hits[`/item/${secret}`], 1, 'the real value was requested');
  assert.ok(!allText(fx.runDir).includes(secret), 'the redacted value leaked into the run directory');
  assert.ok(!r.stdout.includes(secret) && !r.stderr.includes(secret), 'the redacted value reached the terminal');
});

test('AC-16 end to end: a redact-marked capture too short to redact blocks CAPTURE_UNREDACTABLE and no step runs', async () => {
  hits = {};
  const seed = {
    states: { [STATE_TEXT]: { command: [NODE, '-e', 'console.log(JSON.stringify({tok:"ab"}))'], status: 'confirmed', store: 'localhost:5432', captures: { item_id: { path: 'tok', redact: true } } } },
  };
  const fx = seedRunFixture({ steps: [ITEM_STEP], seed });
  const r = /** @type {any} */ (await runRunner(fx));
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'CAPTURE_UNREDACTABLE');
  assert.deepEqual(hits, {});
});

// ---------------------------------------------------------------------------
// Command doc: the enforced schema and the variable rule
// ---------------------------------------------------------------------------

test('AC-15 the command doc states the enforced captures/store schema and the variable rule, with the Phase 1 stop-gap gone', () => {
  for (const token of ['CAPTURE_MISSING', 'CAPTURE_UNREDACTABLE', '"captures"', '"store"', 'FAILED_NON_LOCAL_TARGET', 'HUMAN GATE STILL OPEN']) {
    assert.ok(COMMAND.includes(token), token);
  }
  assert.ok(!COMMAND.includes('Until seeds'));
  assert.ok(!COMMAND.includes('not yet read by the runner'));
});

test('AC-15 the capturing declaration example in the command doc parses and its captures are well-formed', () => {
  const blocks = [...COMMAND.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const found = blocks.map((b) => { try { return JSON.parse(b); } catch { return null; } }).find((j) => j && j.states);
  assert.ok(found, 'no declaration example found');
  const [text, d] = Object.entries(found.states)[0];
  assert.deepEqual(declaredCaptureNames(found, text, 'declared'), ['teacher_id']);
  assert.ok(normalizeStore(/** @type {any} */ (d).store));
});
