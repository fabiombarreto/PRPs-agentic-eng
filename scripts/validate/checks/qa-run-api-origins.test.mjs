// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-12 Declared API origins: a second local origin reached with the role's session-derived header
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-16 No credential, cookie value or header value reaches a tracked file, a run artifact or the terminal
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-15 The closed outcome vocabulary
/**
 * Phase 5 (declared API origins) of qa-runner-case-vocabulary.
 *
 * - validateStep for the optional `origin` key of an http request step.
 * - classifyApiOrigin: every refusal, the header-less origin and the fully declared origin.
 * - deriveApiHeader: the named cookie of a storage state, domain preference, missing cookie.
 * - prepareApiStep called directly: guard, path resolution, no-session refusal, redaction registration.
 * - The real runner end to end over two loopback servers (an app origin and an API origin) with no
 *   browser: every refusal happens before any request or login, and the API origin receives the
 *   derived Bearer while the token value reaches no run file and no terminal stream.
 *
 * Source plan: PRPs/plans/completed/qa-runner-case-vocabulary-phase-5-declared-api-origins.plan.md
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import { validateStep, classifyApiOrigin, deriveApiHeader, prepareApiStep, buildRedactionTable, redactText, OUTCOMES } from '../../../plugins/relay/scripts/qa-run.mjs';
import * as guard from '../../../plugins/relay/scripts/auth-local-guard.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const TOKEN = 'tok-Zq83kd01-apiorigin';
const RUN_DIR_REL = 'PRPs/reports/feat/qa-run/20260101T101010101Z';

/** @type {string[]} */
const temps = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'relay-qaapi-'));
  temps.push(d);
  return d;
};
after(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

const REQ = (/** @type {string | undefined} */ origin, path = '/api/me', extra = {}) => ({
  action: 'request',
  ...(origin === undefined ? {} : { origin }),
  method: 'GET',
  path,
  expect_status: 200,
  ...extra,
});

// ---------------------------------------------------------------------------
// validateStep: the optional origin key
// ---------------------------------------------------------------------------

test('AC-12 validateStep accepts an http request step naming an origin and still accepts a step without one', () => {
  assert.equal(validateStep('http', REQ('api')), null);
  assert.equal(validateStep('http', REQ('Api_2-x')), null);
  assert.equal(validateStep('http', REQ(undefined)), null);
});

test('AC-12 validateStep rejects an origin that is not a plain declared name', () => {
  for (const origin of ['a b', '', 5, null, 'x'.repeat(41), '-lead', 'a/b', 'http://localhost:8000', ['api'], { name: 'api' }]) {
    const r = validateStep('http', { ...REQ('api'), origin });
    assert.notEqual(r, null, `a malformed origin was accepted: ${JSON.stringify(origin)}`);
  }
});

// ---------------------------------------------------------------------------
// classifyApiOrigin
// ---------------------------------------------------------------------------

const DECL = {
  api: { url: 'http://localhost:8000', header: 'Authorization', cookie: 'access-token', value_prefix: 'Bearer ' },
  plain: { url: 'http://localhost:9000' },
};

test('AC-12 classifyApiOrigin returns the declared header, cookie and prefix of a fully declared origin', () => {
  const c = classifyApiOrigin(DECL, 'api');
  assert.equal(c.ok, true, JSON.stringify(c));
  assert.equal(c.name, 'api');
  assert.equal(c.url, 'http://localhost:8000');
  assert.equal(c.header, 'Authorization');
  assert.equal(c.cookie, 'access-token');
  assert.equal(c.valuePrefix, 'Bearer ');
});

test('AC-12 classifyApiOrigin accepts an origin with neither header nor cookie and gives it no header and an empty prefix', () => {
  const p = classifyApiOrigin(DECL, 'plain');
  assert.equal(p.ok, true, JSON.stringify(p));
  assert.equal(p.header, null);
  assert.equal(p.cookie, null);
  assert.equal(p.valuePrefix, '');
});

test('AC-12 classifyApiOrigin refuses an undeclared origin as FAILED_NON_LOCAL_TARGET, whatever shape the map has', () => {
  /** @type {[string, any, any][]} */
  const cases = [
    ['absent name', DECL, 'nope'],
    ['null map', null, 'api'],
    ['undefined map', undefined, 'api'],
    ['array map', [], 'api'],
    ['string map', 'api', 'api'],
    ['non-object entry', { api: 'x' }, 'api'],
    ['null entry', { api: null }, 'api'],
    ['inherited key', {}, 'constructor'],
    ['non-string name', DECL, undefined],
  ];
  for (const [label, map, name] of cases) {
    const r = classifyApiOrigin(map, name);
    assert.equal(r.ok, false, label);
    assert.equal(r.code, 'FAILED_NON_LOCAL_TARGET', label);
  }
});

test('AC-12 classifyApiOrigin refuses each malformed declaration as API_ORIGIN_INVALID', () => {
  /** @type {[string, any][]} */
  const bad = [
    ['header without cookie', { url: 'http://localhost:1', header: 'Authorization' }],
    ['cookie without header', { url: 'http://localhost:1', cookie: 't' }],
    ['forbidden header Host', { url: 'http://localhost:1', header: 'Host', cookie: 't' }],
    ['forbidden header Cookie (any case)', { url: 'http://localhost:1', header: 'cOOkie', cookie: 't' }],
    ['forbidden header Content-Length', { url: 'http://localhost:1', header: 'Content-Length', cookie: 't' }],
    ['forbidden header Transfer-Encoding', { url: 'http://localhost:1', header: 'Transfer-Encoding', cookie: 't' }],
    ['bad header characters', { url: 'http://localhost:1', header: 'bad header', cookie: 't' }],
    ['non-string header', { url: 'http://localhost:1', header: 7, cookie: 't' }],
    ['bad cookie characters', { url: 'http://localhost:1', header: 'X-A', cookie: 'a b' }],
    ['prefix with a line break', { url: 'http://localhost:1', header: 'X-A', cookie: 't', value_prefix: 'B\nX: y' }],
    ['prefix with a carriage return', { url: 'http://localhost:1', header: 'X-A', cookie: 't', value_prefix: 'B\rX: y' }],
    ['prefix over 32 characters', { url: 'http://localhost:1', header: 'X-A', cookie: 't', value_prefix: 'p'.repeat(33) }],
    ['non-string prefix', { url: 'http://localhost:1', header: 'X-A', cookie: 't', value_prefix: 1 }],
    ['no url', { header: 'X-A', cookie: 't' }],
    ['empty url', { url: '', header: 'X-A', cookie: 't' }],
    ['url with whitespace', { url: 'http://local host', header: 'X-A', cookie: 't' }],
  ];
  for (const [label, entry] of bad) {
    const r = classifyApiOrigin({ a: entry }, 'a');
    assert.equal(r.ok, false, label);
    assert.equal(r.code, 'API_ORIGIN_INVALID', `${label}: ${JSON.stringify(r)}`);
  }
});

test('AC-16 a classifyApiOrigin reason names the origin and never echoes the declared URL', () => {
  const undeclared = classifyApiOrigin(DECL, 'nope');
  assert.ok(undeclared.reason.includes('nope'), undeclared.reason);
  const malformed = classifyApiOrigin({ a: { url: 'http://secret-host.test:4321/x', header: 'Authorization' } }, 'a');
  assert.equal(malformed.code, 'API_ORIGIN_INVALID');
  assert.ok(malformed.reason.includes('a'), malformed.reason);
  assert.ok(!malformed.reason.includes('secret-host.test'), malformed.reason);
});

// ---------------------------------------------------------------------------
// deriveApiHeader
// ---------------------------------------------------------------------------

const SPEC = /** @type {any} */ (classifyApiOrigin(DECL, 'api'));

test('AC-12 deriveApiHeader builds the header value from the named cookie with the declared prefix', () => {
  const state = { cookies: [{ name: 'other', value: 'zzzz1111', domain: 'localhost' }, { name: 'access-token', value: TOKEN, domain: 'localhost' }] };
  const d = deriveApiHeader(SPEC, state, 'localhost');
  assert.equal(d.ok, true, JSON.stringify(d));
  assert.equal(d.name, 'Authorization');
  assert.equal(d.value, `Bearer ${TOKEN}`);
  assert.equal(d.raw, TOKEN);
});

test('AC-12 deriveApiHeader prefers the cookie whose domain matches the origin host, with or without a leading dot', () => {
  const state = { cookies: [{ name: 'access-token', value: 'wrong-one-1', domain: 'example.test' }, { name: 'access-token', value: TOKEN, domain: '.localhost' }] };
  assert.equal(deriveApiHeader(SPEC, state, 'localhost').raw, TOKEN);
  const upper = { cookies: [{ name: 'access-token', value: 'wrong-one-1', domain: 'example.test' }, { name: 'access-token', value: TOKEN, domain: 'LocalHost' }] };
  assert.equal(deriveApiHeader(SPEC, upper, 'localhost').raw, TOKEN);
});

test('AC-12 deriveApiHeader falls back to the first usable cookie when no domain matches', () => {
  const state = { cookies: [{ name: 'access-token', value: 'first-value-1', domain: 'a.test' }, { name: 'access-token', value: 'second-value-2', domain: 'b.test' }] };
  assert.equal(deriveApiHeader(SPEC, state, 'localhost').raw, 'first-value-1');
});

test('AC-12 deriveApiHeader refuses a session with no usable cookie as API_HEADER_SOURCE_MISSING, with no value in the reason', () => {
  const states = [{ cookies: [] }, null, 'x', 42, {}, { cookies: 'x' }, { cookies: [{ name: 'access-token', value: '' }] }, { cookies: [{ name: 'access-token', value: 7 }] }, { cookies: [{ name: 'nope', value: TOKEN }] }];
  for (const s of states) {
    const r = deriveApiHeader(SPEC, s, 'localhost');
    assert.equal(r.ok, false, JSON.stringify(s));
    assert.equal(r.code, 'API_HEADER_SOURCE_MISSING', JSON.stringify(s));
    assert.ok(r.reason.includes('access-token'), 'the reason names the declared cookie');
    assert.ok(!r.reason.includes(TOKEN) && !r.reason.includes('Bearer'), r.reason);
  }
});

// ---------------------------------------------------------------------------
// prepareApiStep, called directly
// ---------------------------------------------------------------------------

const API_DECL = {
  api: { url: 'http://localhost:8000', header: 'Authorization', cookie: 'access-token', value_prefix: 'Bearer ' },
  plain: { url: 'http://localhost:8001' },
  remote: { url: 'http://example.com:8000', header: 'Authorization', cookie: 'access-token' },
  nocookie: { url: 'http://localhost:8000', header: 'Authorization', cookie: 'missing-cookie' },
  bad: { url: 'http://localhost:8000', header: 'Authorization' },
};

function prepFixture(/** @type {any} */ apiOrigins = API_DECL) {
  const root = tmp();
  const sessionPath = join(root, 'admin.json');
  writeFileSync(sessionPath, JSON.stringify({ cookies: [{ name: 'access-token', value: TOKEN, domain: 'localhost' }], origins: [] }));
  const ctx = /** @type {any} */ ({
    root,
    table: buildRedactionTable({ root, env: {} }),
    target: { guard, origin: 'http://localhost:3000', allowedHosts: new Set(['localhost', '127.0.0.1']) },
    loginConfig: { baseUrl: 'http://localhost:3000', roles: { admin: {} }, api_origins: apiOrigins },
  });
  return { root, ctx, session: { path: sessionPath, token: null } };
}

test('AC-12 prepareApiStep resolves the path against the declared origin and derives the header from the session', async () => {
  const fx = prepFixture();
  const r = await prepareApiStep(fx.ctx, REQ('api'), 1, fx.session);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.url, 'http://localhost:8000/api/me');
  assert.deepEqual(r.headers, { Authorization: `Bearer ${TOKEN}` });
});

test('AC-16 prepareApiStep registers the derived value for redaction before returning it', async () => {
  const fx = prepFixture();
  assert.ok(redactText(`Authorization: Bearer ${TOKEN}`, fx.ctx.table).includes(TOKEN), 'precondition: the table does not know the value yet');
  const r = await prepareApiStep(fx.ctx, REQ('api'), 1, fx.session);
  assert.equal(r.ok, true);
  const redacted = redactText(`Authorization: Bearer ${TOKEN} and ${TOKEN}`, fx.ctx.table);
  assert.ok(!redacted.includes(TOKEN), redacted);
});

test('AC-12 prepareApiStep needs no session for an origin that declares no header, and returns no headers', async () => {
  const fx = prepFixture();
  const r = await prepareApiStep(fx.ctx, REQ('plain'), 1, null);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(r.headers, null);
  assert.equal(r.url, 'http://localhost:8001/api/me');
});

test('AC-12 prepareApiStep refuses an undeclared, malformed, non-local or path-escaping origin step, naming the step and carrying no value', async () => {
  /** @type {[string, any, any, string][]} */
  const cases = [
    ['an undeclared origin', prepFixture(), REQ('nope'), 'FAILED_NON_LOCAL_TARGET'],
    ['no api_origins at all', prepFixture(null), REQ('api'), 'FAILED_NON_LOCAL_TARGET'],
    ['a non-local declared origin', prepFixture(), REQ('remote'), 'FAILED_NON_LOCAL_TARGET'],
    ['an absolute path to another origin', prepFixture(), REQ('api', 'http://localhost:9999/x'), 'FAILED_NON_LOCAL_TARGET'],
    ['a protocol-relative path', prepFixture(), REQ('api', '//example.com/x'), 'FAILED_NON_LOCAL_TARGET'],
    ['a malformed declaration', prepFixture(), REQ('bad'), 'API_ORIGIN_INVALID'],
    ['a missing cookie', prepFixture(), REQ('nocookie'), 'API_HEADER_SOURCE_MISSING'],
  ];
  for (const [label, fx, step, code] of cases) {
    const r = await prepareApiStep(fx.ctx, step, 3, fx.session);
    assert.equal(r.ok, false, label);
    assert.equal(r.result.outcome, 'blocked', label);
    assert.equal(r.result.reason_code, code, `${label}: ${JSON.stringify(r.result)}`);
    assert.ok(r.result.reason.startsWith('step 3:'), `${label}: ${r.result.reason}`);
    assert.ok(!r.result.reason.includes(TOKEN), label);
    assert.ok(OUTCOMES.includes(r.result.outcome), label);
  }
});

test('AC-12 prepareApiStep refuses a header-bearing origin with no session as API_HEADER_NO_SESSION', async () => {
  const fx = prepFixture();
  for (const session of [null, undefined, { token: null }]) {
    const r = await prepareApiStep(fx.ctx, REQ('api'), 2, session);
    assert.equal(r.ok, false);
    assert.equal(r.result.outcome, 'blocked');
    assert.equal(r.result.reason_code, 'API_HEADER_NO_SESSION');
    assert.ok(r.result.reason.startsWith('step 2:'), r.result.reason);
  }
});

// ---------------------------------------------------------------------------
// The real runner end to end: two loopback servers, a storage-state fixture, no browser
// ---------------------------------------------------------------------------

/** @type {{ url: string, auth: string }[]} */
let baseSeen = [];
/** @type {{ url: string, auth: string }[]} */
let apiSeen = [];
/** @type {import('node:http').Server} */
let baseServer;
/** @type {import('node:http').Server} */
let apiServer;
let baseUrl = '';
let apiUrl = '';

/** @param {{ url: string, auth: string }[]} log */
const handler = (log) => (/** @type {any} */ req, /** @type {any} */ res) => {
  const auth = String(req.headers.authorization ?? '');
  log.push({ url: String(req.url).split('?')[0], auth });
  const good = auth === `Bearer ${TOKEN}`;
  // The body echoes the Authorization header, so a leak through the evidence body would be visible.
  res.writeHead(good ? 200 : 401, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: good, echo: auth }));
};

before(async () => {
  baseServer = createServer(handler(baseSeen));
  apiServer = createServer(handler(apiSeen));
  await new Promise((r) => baseServer.listen(0, '127.0.0.1', () => r(null)));
  await new Promise((r) => apiServer.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (baseServer.address()).port}`;
  apiUrl = `http://127.0.0.1:${/** @type {any} */ (apiServer.address()).port}`;
});

after(async () => {
  for (const s of [baseServer, apiServer]) {
    /** @type {any} */ (s).closeAllConnections?.();
    await new Promise((r) => s.close(() => r(null)));
  }
});

/** @param {number} n */
function reportOf(n) {
  const blocks = Array.from({ length: n }, (_, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** Case ${i + 1} title`,
      '**Risk level:** low',
      '**Required state:** None',
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

/** A login stub that writes a storage state carrying the JWT-in-a-cookie, like a script-set cookie. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "${TOKEN}", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
].join('\n');

/**
 * @param {{ apiOrigins: Record<string, any> | undefined, cases: { role: string | null, steps: any[] }[] }} o
 */
function e2eFixture(o) {
  const root = tmp();
  mkdirSync(join(root, ...RUN_DIR_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', 'feat', 'qa-report.md'), reportOf(o.cases.length));
  writeFileSync(
    join(root, 'PRPs', 'auth', 'login.config.json'),
    JSON.stringify({ baseUrl, roles: { admin: {} }, ...(o.apiOrigins === undefined ? {} : { api_origins: o.apiOrigins }) }),
  );
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  writeFileSync(
    join(root, ...RUN_DIR_REL.split('/'), 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: o.cases.map((c, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: 'http', role: c.role, state: 'none', steps: c.steps })),
    }),
  );
  const runDir = join(root, ...RUN_DIR_REL.split('/'));
  return { root, runDir, sessionsDir: join(root, 'PRPs', 'auth', '.sessions') };
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, results: any }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', 'feat', '--run-dir', RUN_DIR_REL], {
      cwd: root,
      env: { ...process.env },
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

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const SLOW = { timeout: 150000 };

test('AC-12 end to end: every undeclared, malformed, non-local or role-less origin step is refused by name before any request or login', SLOW, async () => {
  baseSeen.length = 0;
  apiSeen.length = 0;
  const fx = e2eFixture({
    apiOrigins: {
      remote: { url: 'http://example.com:8000' },
      hdr: { url: apiUrl, header: 'Authorization', cookie: 'access-token', value_prefix: 'Bearer ' },
      bad: { url: apiUrl, header: 'Authorization' },
      ok: { url: apiUrl },
    },
    cases: [
      { role: null, steps: [REQ('nope')] },
      { role: null, steps: [REQ('remote')] },
      { role: null, steps: [REQ('hdr')] },
      { role: 'admin', steps: [REQ('bad')] },
      { role: null, steps: [REQ('ok', '//example.com/x')] },
      { role: null, steps: [REQ('ok', `${baseUrl}/api/me`)] },
      { role: 'admin', steps: [REQ(undefined, '/health'), REQ('nope')] },
    ],
  });
  const r = await runRunner(fx.root);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const want = ['FAILED_NON_LOCAL_TARGET', 'FAILED_NON_LOCAL_TARGET', 'API_HEADER_NO_SESSION', 'API_ORIGIN_INVALID', 'FAILED_NON_LOCAL_TARGET', 'FAILED_NON_LOCAL_TARGET', 'FAILED_NON_LOCAL_TARGET'];
  assert.equal(r.results.cases.length, want.length);
  for (const [i, code] of want.entries()) {
    const c = r.results.cases[i];
    assert.equal(c.outcome, 'blocked', `case ${i + 1}: ${JSON.stringify(c)}`);
    assert.equal(c.reason_code, code, `case ${i + 1}: ${c.reason}`);
  }
  assert.ok(r.results.cases[6].reason.includes('step 2'), 'the refusal names the offending step');
  assert.deepEqual(baseSeen, [], 'a request reached the app origin although every case was refused');
  assert.deepEqual(apiSeen, [], 'a request reached the API origin although every case was refused');
  assert.equal(existsSync(fx.sessionsDir), false, 'a login ran before the origin refusals');
  assert.deepEqual(validateResults(r.results), []);
  for (const c of r.results.cases) assert.ok(OUTCOMES.includes(c.outcome));
});

test('AC-12 end to end: with no api_origins declared at all, an origin step is refused FAILED_NON_LOCAL_TARGET and nothing is requested', SLOW, async () => {
  baseSeen.length = 0;
  apiSeen.length = 0;
  const fx = e2eFixture({ apiOrigins: undefined, cases: [{ role: 'admin', steps: [REQ('api')] }] });
  const r = await runRunner(fx.root);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked', JSON.stringify(c));
  assert.equal(c.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.deepEqual([...baseSeen, ...apiSeen], []);
  assert.equal(existsSync(fx.sessionsDir), false);
});

test('AC-12 AC-16 end to end: the API origin receives the derived Bearer, the app origin does not, an undeclared origin is refused and the token reaches no file or stream', SLOW, async () => {
  baseSeen.length = 0;
  apiSeen.length = 0;
  const fx = e2eFixture({
    apiOrigins: { api: { url: apiUrl, header: 'Authorization', cookie: 'access-token', value_prefix: 'Bearer ' } },
    cases: [
      { role: 'admin', steps: [REQ('api'), REQ(undefined, '/health', { expect_status: 401 })] },
      { role: 'admin', steps: [REQ('nope')] },
    ],
  });
  const r = await runRunner(fx.root);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const [c1, c2] = r.results.cases;
  assert.equal(c1.outcome, 'pass', JSON.stringify(c1));
  assert.equal(c2.outcome, 'blocked', JSON.stringify(c2));
  assert.equal(c2.reason_code, 'FAILED_NON_LOCAL_TARGET');

  assert.deepEqual(apiSeen, [{ url: '/api/me', auth: `Bearer ${TOKEN}` }], 'the API origin got exactly one request, carrying the derived Bearer');
  assert.deepEqual(baseSeen, [{ url: '/health', auth: '' }], 'the app origin got only the plain step, without the derived header');

  const evidence = JSON.parse(readFileSync(join(fx.runDir, 'evidence', 'case-1.http.json'), 'utf8'));
  assert.equal(evidence.origin, 'api', 'evidence records the origin name');
  assert.deepEqual(evidence.request, { method: 'GET', path: '/api/me' });
  const plainEvidence = JSON.parse(readFileSync(join(fx.runDir, 'evidence', 'case-1.http-2.json'), 'utf8'));
  assert.equal('origin' in plainEvidence, false, 'a step without an origin records none');

  for (const f of walk(fx.runDir)) {
    assert.ok(!readFileSync(f, 'latin1').includes(TOKEN), `the token value leaked into ${f}`);
  }
  assert.ok(!r.stdout.includes(TOKEN), 'the token value reached stdout');
  assert.ok(!r.stderr.includes(TOKEN), 'the token value reached stderr');
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-12 end to end: an origin that declares no header reaches the API origin with no derived Authorization', SLOW, async () => {
  baseSeen.length = 0;
  apiSeen.length = 0;
  const fx = e2eFixture({
    apiOrigins: { plain: { url: apiUrl } },
    cases: [{ role: null, steps: [REQ('plain', '/api/open', { expect_status: 401 })] }],
  });
  const r = await runRunner(fx.root);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.deepEqual(apiSeen, [{ url: '/api/open', auth: '' }]);
  assert.deepEqual(baseSeen, []);
});

test('AC-12 end to end: a role whose session lacks the declared cookie is blocked API_HEADER_SOURCE_MISSING with nothing sent to the API origin', SLOW, async () => {
  baseSeen.length = 0;
  apiSeen.length = 0;
  const fx = e2eFixture({
    apiOrigins: { api: { url: apiUrl, header: 'Authorization', cookie: 'no-such-cookie', value_prefix: 'Bearer ' } },
    cases: [{ role: 'admin', steps: [REQ('api')] }],
  });
  const r = await runRunner(fx.root);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked', JSON.stringify(c));
  assert.equal(c.reason_code, 'API_HEADER_SOURCE_MISSING');
  assert.deepEqual(apiSeen, [], 'no request reached the API origin');
  assert.ok(!JSON.stringify(c).includes(TOKEN));
  assert.ok(!r.stdout.includes(TOKEN) && !r.stderr.includes(TOKEN));
});
