// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-8 A request without the session (no cookie, no storage state, no derived header, through the local-only guard first; a plan without the key behaves exactly as before)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (a session-less request to an origin that is not loopback or a declared local origin halts FAILED_NON_LOCAL_TARGET before any request is sent)
/**
 * Phase 4 (request without a session, input value, absence and state), request half, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md
 *              (AC-A1 the anonymous step, AC-A2 the closed `session` value set, AC-A7 the guard stays first)
 *
 * Layers, all against the REAL runner (never edited):
 *   1. validateStep / validateSteps: `session` has one legal value, `"none"`, legal only on an http `request`
 *      step; any other value, and the key on a `query` step or a browser step, is PLAN_ENTRY_INVALID, and the
 *      key adds no expectation.
 *   2. httpContextOptions and prepareApiStep called directly: an anonymous context carries only the base URL,
 *      and the guard still runs first for a session-less step.
 *   3. The runner as an ASYNC child process against a loopback server that records the Cookie and
 *      Authorization header of every request it receives (so the check does not trust the runner's own
 *      evidence): the anonymous steps carry neither, the next authenticated step of the same case still
 *      carries both, a Set-Cookie of one anonymous step never reaches the next, a refused step sends nothing
 *      and the session value reaches no run file and no terminal stream.
 *
 * Every git call the runner makes carries a hermetic environment (core.fsmonitor=false so no daemon is
 * started, an empty global config, discovery stopped at the sandbox's parent); the sandbox is removed
 * afterwards and every server is closed.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import { validateStep, validateSteps, httpContextOptions, prepareApiStep, buildRedactionTable } from '../../../plugins/relay/scripts/qa-run.mjs';
import * as guard from '../../../plugins/relay/scripts/auth-local-guard.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 150000 };
const SID = 'sidvalue-Zq83kd01-Hh2k9X7';
const TRACKER = 'trk-77aa31';

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p4-sess-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** An environment under which git reads no host configuration and never climbs above the sandbox's parent. */
const GIT_ENV = (() => {
  const globalConfig = join(SANDBOX, 'empty.gitconfig');
  const xdg = join(SANDBOX, 'xdg');
  mkdirSync(xdg, { recursive: true });
  writeFileSync(globalConfig, '');
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.fsmonitor',
    GIT_CONFIG_VALUE_0: 'false',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: '1',
    XDG_CONFIG_HOME: xdg,
    GIT_CEILING_DIRECTORIES: realpathSync(tmpdir()),
  };
})();

/**
 * One http request step.
 * @param {Record<string, any>} [extra]
 */
const REQ = (extra = {}) => ({ action: 'request', method: 'GET', path: '/api/me', expect_status: 401, ...extra });

// ---------------------------------------------------------------------------
// 1. The closed `session` value set
// ---------------------------------------------------------------------------

test('AC-8 validateStep accepts session "none" on an http request step, with or without an origin, and a step without the key is unchanged', () => {
  assert.equal(validateStep('http', REQ({ session: 'none' })), null);
  assert.equal(validateStep('http', REQ({ origin: 'api', session: 'none' })), null);
  assert.equal(validateStep('http', REQ()), null);
  assert.equal(validateSteps('http', [REQ({ origin: 'api', session: 'none' })]), null);
});

test('AC-8 the session key adds no expectation: a request with the key and no expectation of its own is still NO_EXPECTATION', () => {
  const bare = { action: 'request', method: 'GET', path: '/api/me', session: 'none' };
  assert.equal(validateStep('http', bare), null, 'the step itself is valid');
  assert.equal(validateSteps('http', [bare])?.code, 'NO_EXPECTATION');
  assert.equal(validateSteps('http', [bare, REQ({ session: 'none' })]), null, 'an expectation on a sibling step is enough');
});

test('AC-8 validateStep refuses every session value other than "none" as PLAN_ENTRY_INVALID, naming the key, never echoing the value and never throwing', () => {
  const hostile = [
    'cookie',
    'NONE',
    'None',
    ' none',
    'none ',
    '',
    null,
    0,
    1,
    true,
    false,
    {},
    ['none'],
    JSON.parse('{"toString":1}'),
    JSON.parse('[{"toString":1}]'),
  ];
  for (const bad of hostile) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = validateStep('http', REQ({ session: bad }));
    }, `session ${JSON.stringify(bad)} threw`);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `session ${JSON.stringify(bad)} was accepted`);
    assert.ok(String(r.reason).includes('session'), `the refusal does not name the key: ${r.reason}`);
  }
  const echoed = validateStep('http', REQ({ session: 'hunter2-sessionvalue' }));
  assert.ok(!String(echoed?.reason).includes('hunter2-sessionvalue'), `the refusal echoes the value: ${echoed?.reason}`);
});

test('AC-8 validateSteps names the step position of a refused session value', () => {
  const r = validateSteps('http', [REQ(), REQ({ session: 'cookie' })]);
  assert.equal(r?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(r?.reason), /^step 2:/);
});

test('AC-8 the session key is refused on a query step and on every browser step, so a step can never claim an anonymity it does not have', () => {
  const query = { action: 'query', source: 'd1-local', sql: 'SELECT 1', expect_rows: 1 };
  assert.equal(validateStep('http', query), null, 'control: the query step is valid without the key');
  for (const driver of ['http', 'browser']) {
    assert.equal(validateStep(driver, { ...query, session: 'none' })?.code, 'PLAN_ENTRY_INVALID', `a query step carried the key under ${driver}`);
  }
  /** @type {any[]} */
  const browserSteps = [
    { action: 'goto', path: '/x' },
    { action: 'click', selector: '#a' },
    { action: 'expect_visible', selector: 'h1' },
    { action: 'expect_visible', role: 'heading', name: 'Panel' },
    { action: 'expect_text', text: 'Welcome', contains: 'Wel' },
    { action: 'expect_url', path: '/x' },
  ];
  for (const s of browserSteps) {
    assert.equal(validateStep('browser', s), null, `control: ${JSON.stringify(s)} must be valid without the key`);
    const r = validateStep('browser', { ...s, session: 'none' });
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `a browser step accepted the key: ${JSON.stringify(s)}`);
    assert.ok(String(r?.reason).includes('session'), String(r?.reason));
  }
  assert.equal(validateSteps('browser', [{ action: 'goto', path: '/x', session: 'none' }, { action: 'expect_visible', selector: 'h1' }])?.code, 'PLAN_ENTRY_INVALID');
});

// ---------------------------------------------------------------------------
// 2. The request options and the guard-first path, called directly
// ---------------------------------------------------------------------------

const BASE = 'http://127.0.0.1:1';

test('AC-8 httpContextOptions: an authenticated context keeps the storage state and the token header', () => {
  const session = { path: '/tmp/state.json', token: 'tok-value-1', header: null, valuePrefix: null };
  assert.deepEqual(httpContextOptions(BASE, session, false), {
    baseURL: BASE,
    storageState: '/tmp/state.json',
    extraHTTPHeaders: { Authorization: 'Bearer tok-value-1' },
  });
  const custom = { path: '/tmp/state.json', token: 'k-1', header: 'X-Api-Key', valuePrefix: 'Key ' };
  assert.deepEqual(httpContextOptions(BASE, custom, false).extraHTTPHeaders, { 'X-Api-Key': 'Key k-1' });
  assert.deepEqual(httpContextOptions(BASE, { path: '/tmp/state.json', token: null, header: null, valuePrefix: null }, false), { baseURL: BASE, storageState: '/tmp/state.json' });
});

test('AC-8 httpContextOptions: an anonymous context carries the base URL and nothing else, even when a session exists', () => {
  const sessions = [
    { path: '/tmp/state.json', token: 'tok-value-1', header: null, valuePrefix: null },
    { path: '/tmp/state.json', token: 'k-1', header: 'X-Api-Key', valuePrefix: 'Key ' },
    null,
  ];
  for (const session of sessions) {
    assert.deepEqual(httpContextOptions(BASE, session, true), { baseURL: BASE }, JSON.stringify(session));
  }
  assert.deepEqual(httpContextOptions(BASE, null, false), { baseURL: BASE }, 'a role-less authenticated context holds no session either');
});

const API_DECL = {
  api: { url: 'http://localhost:8000', header: 'Authorization', cookie: 'access-token', value_prefix: 'Bearer ' },
  remote: { url: 'http://example.com:8000', header: 'Authorization', cookie: 'access-token' },
};

/** @returns {{ ctx: any, session: { path: string, token: null } }} */
function prepFixture() {
  const root = mkdtempSync(join(SANDBOX, 'prep-'));
  const sessionPath = join(root, 'admin.json');
  writeFileSync(sessionPath, JSON.stringify({ cookies: [{ name: 'access-token', value: SID, domain: 'localhost' }], origins: [] }));
  const ctx = {
    root,
    table: buildRedactionTable({ root, env: {} }),
    target: { guard, origin: 'http://localhost:3000', allowedHosts: new Set(['localhost', '127.0.0.1']) },
    loginConfig: { baseUrl: 'http://localhost:3000', roles: { admin: {} }, api_origins: API_DECL },
  };
  return { ctx, session: { path: sessionPath, token: null } };
}

test('AC-8 prepareApiStep: a session-less step to a header-bearing origin is guarded and resolved, carries no derived header and needs no role session', async () => {
  const fx = prepFixture();
  const step = (/** @type {string} */ origin, /** @type {Record<string, any>} */ extra = {}) => REQ({ origin, ...extra });
  const withSession = await prepareApiStep(fx.ctx, step('api', { session: 'none' }), 1, fx.session);
  assert.equal(withSession.ok, true, JSON.stringify(withSession));
  assert.equal(withSession.headers, null, 'a header was derived for a session-less step');
  assert.equal(withSession.url, 'http://localhost:8000/api/me');
  const noSession = await prepareApiStep(fx.ctx, step('api', { session: 'none' }), 1, null);
  assert.equal(noSession.ok, true, JSON.stringify(noSession));
  assert.equal(noSession.headers, null);
});

test('AC-8 AC-15 prepareApiStep: a session-less step to a non-local origin is refused FAILED_NON_LOCAL_TARGET by step position, before anything is sent', async () => {
  const fx = prepFixture();
  for (const session of [null, fx.session]) {
    const r = await prepareApiStep(fx.ctx, REQ({ origin: 'remote', session: 'none' }), 2, session);
    assert.equal(r.ok, false);
    assert.equal(r.result.outcome, 'blocked');
    assert.equal(r.result.reason_code, 'FAILED_NON_LOCAL_TARGET');
    assert.ok(r.result.reason.startsWith('step 2:'), r.result.reason);
    // The refusal comes from the local-only guard check of the declared origin (which a session-less step must not skip),
    // not from the path resolution that follows it: the sentence says the origin is not local.
    assert.match(r.result.reason, /is not local/, r.result.reason);
  }
  const absolute = await prepareApiStep(fx.ctx, REQ({ origin: 'api', path: 'http://example.com/x', session: 'none' }), 3, null);
  assert.equal(absolute.ok, false);
  assert.equal(absolute.result.reason_code, 'FAILED_NON_LOCAL_TARGET', 'an absolute URL to another origin is refused with the key too');
});

test('AC-8 prepareApiStep: a step without the key behaves exactly as before (header derived from the session, API_HEADER_NO_SESSION without one)', async () => {
  const fx = prepFixture();
  const kept = await prepareApiStep(fx.ctx, REQ({ origin: 'api' }), 4, fx.session);
  assert.equal(kept.ok, true, JSON.stringify(kept));
  assert.deepEqual(kept.headers, { Authorization: `Bearer ${SID}` });
  const none = await prepareApiStep(fx.ctx, REQ({ origin: 'api' }), 5, null);
  assert.equal(none.ok, false);
  assert.equal(none.result.reason_code, 'API_HEADER_NO_SESSION');
});

// ---------------------------------------------------------------------------
// 3. The real runner end to end against a server that records what it receives
// ---------------------------------------------------------------------------

/** @type {{ path: string, cookie: string, auth: string }[]} */
let seen = [];
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
/** @type {import('node:http').Server | null} */
let farServer = null;
/** The declared "far" origin: a loopback address the guard does not know (see the before hook), else a public name. */
let farUrl = 'http://example.com:8000';
/** @type {string[]} */
let farSeen = [];

before(async () => {
  server = createServer((req, res) => {
    const cookie = String(req.headers.cookie ?? '');
    const auth = String(req.headers.authorization ?? '');
    const path = String(req.url).split('?')[0];
    seen.push({ path, cookie, auth });
    const credentialed = cookie.includes(`sid=${SID}`) || auth === `Bearer ${SID}`;
    /** @type {Record<string, string>} */
    const headers = { 'content-type': 'application/json' };
    // A response that sets a cookie: a session-less step that follows must not carry it.
    if (path.endsWith('-track')) headers['set-cookie'] = `tracker=${TRACKER}; Path=/`;
    res.writeHead(credentialed ? 200 : 401, headers);
    // The body echoes the credentials the request carried, so a value that escaped redaction would sit in the evidence
    // body. The keys are not secret-looking names: the runner masks a property called `cookie` by its NAME, which would
    // hide a failure of the value-based redaction.
    res.end(JSON.stringify({ ok: credentialed, echo: { seen_cookie: cookie, seen_auth: auth } }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;

  // A second recording server on 127.0.0.2: loopback, but not one of the guard's built-in local hosts, so the guard
  // refuses it while a request that slipped past the guard would be recorded here. Where the platform does not bind
  // that address (macOS exposes only 127.0.0.1) the refusal is still asserted by its code and sentence.
  const far = createServer((req, res) => {
    farSeen.push(String(req.url).split('?')[0]);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
  try {
    await new Promise((resolveP, rejectP) => {
      far.once('error', rejectP);
      far.listen(0, '127.0.0.2', () => resolveP(null));
    });
    const candidate = `http://127.0.0.2:${/** @type {any} */ (far.address()).port}`;
    // The control: the far server must answer, or "it saw nothing" would prove nothing.
    const probe = await fetch(`${candidate}/__probe`);
    await probe.text();
    if (probe.status !== 200) throw new Error('the far recording server does not answer');
    farServer = far;
    farUrl = candidate;
    farSeen = [];
  } catch {
    farServer = null;
    if (far.listening) {
      /** @type {any} */ (far).closeAllConnections?.();
      await new Promise((r) => far.close(() => r(null)));
    }
  }
});

after(async () => {
  for (const s of /** @type {any[]} */ ([server, farServer])) {
    if (!s) continue;
    s.closeAllConnections?.();
    await new Promise((r) => s.close(() => r(null)));
  }
});

/** @param {string[]} titles */
function reportText(titles) {
  const blocks = titles.map((title, i) =>
    [`### Case ${i + 1}`, `**Title:** ${title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', '2. Check the result.', ''].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/** A login stub that writes a storage state carrying the session cookie the origin declares. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "sid", value: "${SID}", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] }));`,
].join('\n');

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, results: any }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV },
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
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      resolveP({ code, stdout, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

test('AC-8 AC-15 end to end: a session-less step carries no cookie and no derived header, the other steps of the case keep the role session, and a refused step sends nothing', SLOW, async () => {
  seen = [];
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const titles = [
    'Authenticated and anonymous steps',
    'Anonymous on a header origin',
    'Header origin without the key',
    'Non-local origin',
    'Absolute path to another origin',
    'Set-Cookie is not carried',
    'Anonymous step expecting an authenticated answer',
  ];
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), reportText(titles));
  writeFileSync(
    join(root, 'PRPs', 'auth', 'login.config.json'),
    JSON.stringify({
      baseUrl,
      roles: { admin: {} },
      api_origins: { api: { url: baseUrl, header: 'Authorization', cookie: 'sid', value_prefix: 'Bearer ' }, far: { url: farUrl } },
    }),
  );
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  /** @type {any[][]} */
  const stepLists = [
    [
      REQ({ origin: 'api', path: '/api/c1-authed-origin', expect_status: 200 }),
      REQ({ origin: 'api', session: 'none', path: '/api/c1-anon-origin' }),
      REQ({ session: 'none', path: '/api/c1-anon-path' }),
      REQ({ path: '/api/c1-authed-path', expect_status: 200 }),
      // After the anonymous steps the role's derived header is still sent to the origin.
      REQ({ origin: 'api', path: '/api/c1-authed-origin-again', expect_status: 200 }),
    ],
    [REQ({ origin: 'api', session: 'none', path: '/api/c2-anon-origin' })],
    [REQ({ origin: 'api', path: '/api/c3-no-key' })],
    [REQ({ origin: 'far', session: 'none', path: '/api/c4-far' })],
    [REQ({ session: 'none', path: `${farUrl}/c5-absolute` })],
    [REQ({ session: 'none', path: '/api/c6-track' }), REQ({ session: 'none', path: '/api/c6-after' })],
    // A role case whose step asks for no session and still expects the authenticated answer: the server answers
    // 401 because the request really carried no credential, so the case fails rather than passing on a leak.
    [REQ({ session: 'none', path: '/api/c7-anon-expects-ok', expect_status: 200 })],
  ];
  /** @type {(string | null)[]} */
  const roles = ['admin', null, null, null, null, null, 'admin'];
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: stepLists.map((steps, i) => ({ index: i + 1, title: titles[i], driver: 'http', role: roles[i], state: 'none', steps })),
    }),
  );

  const r = await runRunner(root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.match(String(r.results.report_sha256_before), /^[0-9a-f]{64}$/);
  assert.equal(r.results.report_sha256_after, r.results.report_sha256_before, 'the QA report changed during the run');
  const [c1, c2, c3, c4, c5, c6, c7] = r.results.cases;
  const brief = (/** @type {any} */ c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
  assert.equal(c1.outcome, 'pass', `case 1: ${brief(c1)}`);
  assert.equal(c2.outcome, 'pass', `case 2 (a role-less entry on a header-bearing origin, with the key): ${brief(c2)}`);
  assert.equal(c3.outcome, 'blocked', `case 3: ${brief(c3)}`);
  assert.equal(c3.reason_code, 'API_HEADER_NO_SESSION', 'without the key the header-bearing origin keeps its refusal');
  assert.equal(c4.outcome, 'blocked', `case 4: ${brief(c4)}`);
  assert.equal(c4.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.match(c4.reason, /^step 1:/);
  assert.match(c4.reason, /is not local/, 'the declared origin was refused by the guard, not by a later path check');
  assert.equal(c5.outcome, 'blocked', `case 5: ${brief(c5)}`);
  assert.equal(c5.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(c6.outcome, 'pass', `case 6: ${brief(c6)}`);
  assert.equal(c7.outcome, 'fail', `case 7 (a session-less step that expects the authenticated answer must fail): ${brief(c7)}`);
  assert.match(c7.reason, /^step 1:/);

  // Nothing a refused step names reached a server: the app origin saw no request for case 3, and where the platform
  // binds 127.0.0.2 (a loopback address the guard does not accept) the far server, proven reachable in the before
  // hook, saw none for cases 4 and 5.
  const at = (/** @type {string} */ path) => seen.filter((x) => x.path === path);
  const one = (/** @type {string} */ path) => {
    const found = at(path);
    assert.equal(found.length, 1, `expected exactly one request to ${path}, the server saw ${found.length}`);
    return found[0];
  };
  assert.deepEqual(at('/api/c3-no-key'), [], 'a refused step reached the app origin');
  if (farServer !== null) assert.deepEqual(farSeen, [], 'a refused session-less step reached the far origin');
  for (const [refused, name] of /** @type {[any, string][]} */ ([[c4, 'case-4'], [c5, 'case-5']])) {
    assert.deepEqual(refused.evidence, [], `${name}: a refused step left evidence`);
    assert.equal(existsSync(join(runDir, 'evidence', `${name}.http.json`)), false, `${name}: a refused step wrote a response record`);
  }
  assert.equal(seen.length, 9, `expected 9 requests (5 + 1 + 2 + 1, none for the refused cases): ${JSON.stringify(seen.map((x) => x.path))}`);
  const c7seen = one('/api/c7-anon-expects-ok');
  assert.deepEqual([c7seen.cookie, c7seen.auth], ['', ''], 'the session-less step of a role case carried a credential');

  const authedOrigin = one('/api/c1-authed-origin');
  assert.ok(authedOrigin.cookie.includes(`sid=${SID}`), 'the authenticated origin step must carry the role cookie');
  assert.equal(authedOrigin.auth, `Bearer ${SID}`, 'the authenticated origin step must carry the derived header');
  for (const path of ['/api/c1-anon-origin', '/api/c1-anon-path', '/api/c2-anon-origin']) {
    const x = one(path);
    assert.deepEqual([x.cookie, x.auth], ['', ''], `the session-less step ${path} carried a credential`);
  }
  assert.ok(one('/api/c1-authed-path').cookie.includes(`sid=${SID}`), 'the step after a session-less step lost the role session');
  const authedAgain = one('/api/c1-authed-origin-again');
  assert.ok(authedAgain.cookie.includes(`sid=${SID}`), 'the origin step after the session-less steps lost the role cookie');
  assert.equal(authedAgain.auth, `Bearer ${SID}`, 'the origin step after the session-less steps lost the derived header');

  const track = one('/api/c6-track');
  const after2 = one('/api/c6-after');
  assert.deepEqual([track.cookie, track.auth], ['', '']);
  assert.deepEqual([after2.cookie, after2.auth], ['', ''], `a Set-Cookie of one session-less step reached the next: ${after2.cookie}`);

  const readEvidence = (/** @type {string} */ name) => JSON.parse(readFileSync(join(runDir, 'evidence', name), 'utf8'));
  const anonOrigin = readEvidence('case-1.http-2.json');
  assert.equal(anonOrigin.session, 'none', 'the evidence must record that the step was session-less');
  assert.equal(anonOrigin.origin, 'api');
  assert.equal(anonOrigin.response.status, 401);
  assert.deepEqual(anonOrigin.request, { method: 'GET', path: '/api/c1-anon-origin' });
  assert.equal(readEvidence('case-1.http-3.json').session, 'none');
  for (const name of ['case-1.http.json', 'case-1.http-4.json', 'case-1.http-5.json']) {
    assert.equal('session' in readEvidence(name), false, `${name}: an authenticated step recorded a session key`);
  }

  // The server echoed the credentials it received into the response body: the evidence body of the authenticated
  // step must hold the redaction marker where the value was, so the scan below is not vacuous.
  const authedBody = readEvidence('case-1.http.json').response.body;
  assert.ok(String(authedBody?.echo?.seen_cookie).includes('[REDACTED]'), `the echoed cookie was not redacted: ${JSON.stringify(authedBody)}`);
  assert.ok(String(authedBody?.echo?.seen_auth).includes('[REDACTED]'), `the echoed header was not redacted: ${JSON.stringify(authedBody)}`);
  for (const f of walk(runDir)) {
    assert.ok(!readFileSync(f, 'latin1').includes(SID), `the session value leaked into ${f}`);
  }
  assert.ok(!r.stdout.includes(SID) && !r.stderr.includes(SID), 'the session value reached a terminal stream');
  assert.deepEqual(validateResults(r.results), []);
});
