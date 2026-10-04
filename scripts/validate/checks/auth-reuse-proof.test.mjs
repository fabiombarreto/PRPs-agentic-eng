// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-20 Every saved or reused session is proven in both directions (HTTP negative control, browser probe, named halts)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-21 A session saved for the wrong account halts by name
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-12 (reuse wording) A valid session is reused without a login and without a visible browser
/**
 * End-to-end tests for the session proof of
 * plugins/relay/resources/auth-login.template.mjs and for the three probe halts
 * that plugins/relay/scripts/qa-run.mjs reports as named blocked reasons.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md (AC-20, AC-21, AC-12 reuse wording)
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-7-reuse-proof.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every login test
 * copies the REAL template into a temp git project (the single `__RELAY_ROLE__`
 * substitution a generated script gets) and runs it as an ASYNC child process
 * against one in-process loopback application shaped like a single-page app:
 * every route answers 200 with the same shell, and an authenticated-only marker
 * is rendered by the page script only when the request carries the session
 * cookie. A synchronous child spawn beside that server would block this
 * process's event loop, so none is used.
 *
 * Observable contracts pinned here (what the server received, what the child
 * printed, what is on disk):
 *   - HTTP negative control: 2xx with AND without the session halts
 *     FAILED_PROBE_NOT_PROTECTED and persists nothing.
 *   - The with-session request carries the cookie plus the token header (named
 *     header and prefix, else Authorization: Bearer); the without side carries
 *     neither.
 *   - Browser probe: marker visible with the session, absent for the WHOLE
 *     absence window without one; a marker that shows up only after the presence
 *     window but inside the absence window still fails; a page that does not load
 *     is a halt, never an absence.
 *   - Role marker absent with the session: FAILED_PROBE_WRONG_ACCOUNT.
 *   - A declared browserProbe replaces the HTTP probe; static-token keeps
 *     FAILED_TOKEN_UNPROVEN and may also declare a browserProbe.
 *   - Reuse: a saved session that now fails the proof halts and is neither
 *     re-logged-in nor overwritten; a passing one is reused with no login.
 *   - Config validation names the field before any request is made.
 *   - qa-run maps exactly the three probe codes to named blocked reasons.
 *
 * Timing: the two window literals of the template COPY are shortened with the
 * anchored-mutation pattern of auth-static-token-indexeddb.test.mjs (never an
 * environment knob, so the shipped 15 s / 5 s proof is untouched). The decision
 * margins below are computed from the shortened values.
 *
 * Mutation proofs: the negative window, the anonymous-load check, the HTTP
 * negative control and the token presentation are each broken in a COPY of the
 * template (anchors must occur exactly once) and the matching test scenario is
 * shown to turn into a wrongly saved session.
 *
 * Real Chromium + Playwright are used; there are no skip conditions.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PLUGIN = join(REPO, 'plugins', 'relay');
const TEMPLATE = readFileSync(join(PLUGIN, 'resources', 'auth-login.template.mjs'), 'utf8').replace(/\r\n/g, '\n');
const QA_RUN = join(PLUGIN, 'scripts', 'qa-run.mjs');

const USERNAME = 'qa-user';
const PASSWORD = 'pw-secret-value-123';
const ST_TOKEN = 'tok-static-ZSECRET';
const REUSE_TOKEN = 'tok-reuse-ZSECRET';

// Shortened windows for the template copy. NEGATIVE = POSITIVE + SETTLE, so the
// absence window is 8000 ms here.
const POS_MS = 5000;
const SETTLE_MS = 3000;
const NEG_MS = POS_MS + SETTLE_MS;
// The anonymous page of /late-anon shows the marker this long after load: past the
// presence window (5000) but inside the absence window (8000 plus the settle aid).
const LATE_ANON_MS = POS_MS + 1500;

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

const fx = {
  logins: 0,
  tokenLogins: 0,
  currentToken: '',
  currentBothToken: '',
  meOpen: false,
  neverHits: 0,
  /** @type {string[]} */ requests: [],
  /** @type {{ cookie: string | undefined, authorization: string | undefined, xauth: string | undefined }[]} */ probeLog: [],
};

/** @param {import('node:http').IncomingMessage} req @returns {Promise<string>} */
function readBody(req) {
  return new Promise((done) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => done(b));
  });
}

/** @param {string} script */
const page = (script) => `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="r">Loading</div>${script === '' ? '' : `<script>${script}</script>`}</body></html>`;
/** @param {number} ms */
const reveal = (ms) => page(`setTimeout(function(){document.getElementById('r').innerHTML='<h1>Hello, QA Teacher</h1><p>Teacher area</p>'},${ms})`);
const bare = () => page('');
const LS_APP = page(`setTimeout(function(){if(localStorage.getItem('tok')==='${ST_TOKEN}')document.getElementById('r').innerHTML='<h1>Token user</h1>'},300)`);

/** @type {import('node:http').Server} */
let server;
let base = '';

before(async () => {
  server = createServer(async (req, res) => {
    const p = new URL(req.url ?? '/', 'http://x').pathname;
    fx.requests.push(`${req.method} ${p}`);
    const h = req.headers;
    const cookie = String(h.cookie ?? '');
    const authed = /(?:^|; )qa_session=teacher-/.test(cookie);
    /** @param {number} status @param {string} body @param {Record<string, string>} [headers] */
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': body.startsWith('{') ? 'application/json' : 'text/html', ...headers });
      res.end(body);
    };
    if (req.method === 'POST' && (p === '/api/login' || p === '/api/login-both' || p === '/api/token-login')) {
      let body = {};
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        body = {};
      }
      if (body.username !== USERNAME || body.password !== PASSWORD) return send(401, '{}');
      if (p === '/api/token-login') {
        fx.tokenLogins++;
        fx.currentToken = `tok-${fx.tokenLogins}-ZSECRET`;
        return send(200, JSON.stringify({ token: fx.currentToken }));
      }
      fx.logins++;
      const setCookie = { 'set-cookie': `qa_session=teacher-${fx.logins}; Path=/` };
      if (p === '/api/login-both') {
        fx.currentBothToken = `tok-both-${fx.logins}-ZSECRET`;
        return send(200, JSON.stringify({ token: fx.currentBothToken }), setCookie);
      }
      return send(200, '{}', setCookie);
    }
    if (p === '/api/me') {
      const ok = fx.meOpen || (fx.currentToken !== '' && h.authorization === `Bearer ${fx.currentToken}`);
      return send(ok ? 200 : 401, '{}');
    }
    if (p === '/api/guarded' || p === '/api/guarded-h') {
      fx.probeLog.push({ cookie: h.cookie, authorization: h.authorization, xauth: /** @type {string | undefined} */ (h['x-auth']) });
      const tokenOk = p === '/api/guarded' ? h.authorization === `Bearer ${fx.currentBothToken}` : h['x-auth'] === `Token ${REUSE_TOKEN}`;
      return send(authed && tokenOk ? 200 : 401, '{}');
    }
    if (p === '/api/st') return send(h['x-api-key'] === ST_TOKEN ? 200 : 401, '{}');
    if (p === '/api/open') return send(200, '{}');
    if (p === '/api/never') {
      fx.neverHits++;
      return send(200, '{}');
    }
    if (p === '/perfil') return send(200, authed ? reveal(300) : bare());
    if (p === '/everyone') return send(200, reveal(300));
    if (p === '/late-anon') return send(200, reveal(authed ? 300 : LATE_ANON_MS));
    if (p === '/anon-500') return authed ? send(200, reveal(300)) : send(500, bare());
    if (p === '/boom') return send(500, bare());
    if (p === '/drop') {
      req.socket.destroy();
      return;
    }
    if (p === '/ls-app') return send(200, LS_APP);
    // The single-page-app shape: every other route answers 200 with the same shell.
    return send(200, bare());
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  base = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

/** @type {string[]} */
const temps = [];
after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Applies anchored replacements to the real template; every anchor must occur exactly once.
 * @param {[string, string][]} edits
 * @returns {string}
 */
function mutate(edits) {
  let text = TEMPLATE;
  for (const [anchor, replacement] of edits) {
    assert.equal(text.split(anchor).length - 1, 1, `mutation anchor must occur exactly once: ${anchor}`);
    text = text.replace(anchor, () => replacement);
  }
  return text;
}

/** Real template with only the two timing literals shortened. */
const TIMING = /** @type {[string, string][]} */ ([
  ['const BROWSER_PROBE_POSITIVE_MS = 15000;', `const BROWSER_PROBE_POSITIVE_MS = ${POS_MS};`],
  ['const BROWSER_PROBE_SETTLE_MS = 5000;', `const BROWSER_PROBE_SETTLE_MS = ${SETTLE_MS};`],
]);
const SHORT = mutate(TIMING);

const probeOf = (/** @type {Record<string, any>} */ over = {}) => ({
  route: '/perfil',
  marker: { kind: 'text', value: 'Hello, QA Teacher' },
  roleMarker: { kind: 'text', value: 'Teacher area' },
  ...over,
});

/** @param {Record<string, any>} [over] */
function apiRole(over = {}) {
  return {
    mechanism: 'api',
    loginPath: null,
    form: null,
    api: { path: '/api/login', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: null },
    probe: { path: '/api/never', method: 'GET' },
    sessionCookie: 'qa_session',
    maxAgeMinutes: 60,
    credentials: { usernameEnv: 'QA_USER', passwordEnv: 'QA_PASS' },
    userCreation: { command: null },
    ...over,
  };
}

/** A login-less static-token role whose token lives in localStorage of /ls-app. @param {Record<string, any>} [over] @param {Record<string, any> | null} [browser] */
function staticRole(over = {}, browser = {}) {
  return {
    mechanism: 'static-token',
    loginPath: null,
    form: null,
    api: null,
    probe: { path: '/api/st', method: 'GET' },
    sessionCookie: null,
    maxAgeMinutes: 60,
    credentials: { usernameEnv: null, passwordEnv: null },
    userCreation: { command: null },
    staticToken: {
      tokenEnv: 'QA_ST_TOKEN',
      header: 'x-api-key',
      valuePrefix: '',
      browser: browser === null ? null : { kind: 'localStorage', originPath: '/ls-app', key: 'tok', database: null, store: null, valueField: null, ...browser },
    },
    ...over,
  };
}

/**
 * A temp git project holding the login script for role `dev` and the config.
 * @param {any} role
 * @param {{ template?: string, session?: string, tokenArt?: any }} [o]
 * @returns {Promise<string>} the project root
 */
async function project(role, o = {}) {
  const d = mkdtempSync(join(tmpdir(), 'relay-reuseproof-'));
  temps.push(d);
  await execFileP('git', ['init', '-q', d]);
  mkdirSync(join(d, 'PRPs', 'auth', '.sessions'), { recursive: true });
  writeFileSync(join(d, 'PRPs', 'auth', 'login-dev.mjs'), (o.template ?? TEMPLATE).replaceAll('__RELAY_ROLE__', 'dev'));
  writeFileSync(join(d, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: base, roles: { dev: role } }));
  if (o.session !== undefined) writeFileSync(sessionPath(d), o.session);
  if (o.tokenArt !== undefined) writeFileSync(tokenPath(d), JSON.stringify(o.tokenArt));
  return d;
}

/**
 * Runs the project's login script as an async child.
 * @param {string} d
 * @param {{ env?: Record<string, string> }} [o]
 * @returns {Promise<{ code: number | null, o: string, e: string, ms: number }>}
 */
function login(d, o = {}) {
  /** @type {Record<string, string | undefined>} */ const env = { ...process.env, QA_USER: USERNAME, QA_PASS: PASSWORD, ...(o.env ?? {}) };
  const t0 = Date.now();
  return new Promise((res, rej) => {
    const c = spawn(process.execPath, [join(d, 'PRPs', 'auth', 'login-dev.mjs'), '--plugin-root', PLUGIN, '--root', d], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = '';
    let er = '';
    c.stdout.on('data', (b) => (out += b));
    c.stderr.on('data', (b) => (er += b));
    const timer = setTimeout(() => c.kill(), 120000);
    c.on('error', rej);
    c.on('close', (code) => {
      clearTimeout(timer);
      res({ code, o: out, e: er, ms: Date.now() - t0 });
    });
  });
}

/**
 * @param {string} script
 * @param {string[]} args
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runNode(script, args) {
  return new Promise((res, rej) => {
    const c = spawn(process.execPath, [script, ...args], { env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    c.stdout.on('data', (b) => (stdout += b));
    c.stderr.on('data', (b) => (stderr += b));
    const timer = setTimeout(() => c.kill(), 180000);
    c.on('error', rej);
    c.on('close', (code) => {
      clearTimeout(timer);
      res({ code, stdout, stderr });
    });
  });
}

const sessionPath = (/** @type {string} */ d) => join(d, 'PRPs', 'auth', '.sessions', 'dev.json');
const tokenPath = (/** @type {string} */ d) => join(d, 'PRPs', 'auth', '.sessions', 'dev.token.json');
const credentialsPath = (/** @type {string} */ d) => join(d, 'PRPs', 'auth', 'credentials.json');

/** @param {string} d */
function assertNothingSaved(d) {
  assert.ok(!existsSync(sessionPath(d)), 'a session file was saved');
  assert.ok(!existsSync(tokenPath(d)), 'a token artifact was saved');
  assert.ok(!existsSync(credentialsPath(d)), 'a credential file was written');
}

/** No password, cookie value, token or marker text may reach either stream. @param {{ o: string, e: string }} r */
function assertNoSecrets(r) {
  const out = r.o + r.e;
  assert.ok(!out.includes(PASSWORD), 'the password was printed');
  assert.ok(!/teacher-\d/.test(out), 'a cookie value was printed');
  assert.ok(!out.includes('ZSECRET'), 'a token was printed');
  assert.ok(!out.includes('Hello, QA Teacher') && !out.includes('Teacher area') && !out.includes('Token user'), 'a marker value was printed');
}

/** @param {string} code @param {{ code: number | null, o: string, e: string }} r */
function assertHalt(code, r) {
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, new RegExp(code));
  assert.doesNotMatch(r.o, /SESSION_CREATED|SESSION_REUSED/);
  assertNoSecrets(r);
}

const SLOW = { timeout: 150000 };
const MEDIUM = { timeout: 90000 };

/** The proven browser-probe project (api login, declared browserProbe), created once and shared read-only. */
/** @type {Promise<{ d: string, r: { code: number | null, o: string, e: string, ms: number }, loginsDelta: number, neverDelta: number }> | null} */
let savedMemo = null;
function saved() {
  if (savedMemo === null) {
    savedMemo = (async () => {
      const d = await project(apiRole({ browserProbe: probeOf() }), { template: SHORT });
      const loginsBefore = fx.logins;
      const neverBefore = fx.neverHits;
      const r = await login(d);
      return { d, r, loginsDelta: fx.logins - loginsBefore, neverDelta: fx.neverHits - neverBefore };
    })();
  }
  return savedMemo;
}

// ---------------------------------------------------------------------------
// 1. HTTP negative control
// ---------------------------------------------------------------------------

test('HTTP probe: a route that answers 2xx with AND without the session halts FAILED_PROBE_NOT_PROTECTED and saves nothing', MEDIUM, async () => {
  const d = await project(apiRole({ probe: { path: '/perfil', method: 'GET' } }));
  const r = await login(d);
  assertHalt('FAILED_PROBE_NOT_PROTECTED', r);
  assertNothingSaved(d);
});

test('HTTP probe: the same vacuous route also halts a role that sends a token (token-only session, probe ignores the token)', MEDIUM, async () => {
  fx.meOpen = true;
  try {
    const d = await project(apiRole({ api: { path: '/api/token-login', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: 'token' }, sessionCookie: null, probe: { path: '/api/me', method: 'GET' } }));
    const r = await login(d);
    assertHalt('FAILED_PROBE_NOT_PROTECTED', r);
    assertNothingSaved(d);
  } finally {
    fx.meOpen = false;
  }
});

// ---------------------------------------------------------------------------
// 2. What the HTTP proof presents (asserted on what the server received)
// ---------------------------------------------------------------------------

test('HTTP proof: cookies plus Authorization Bearer on the session side, neither on the anonymous side, on save and on reuse', MEDIUM, async () => {
  const d = await project(apiRole({ api: { path: '/api/login-both', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: 'token' }, probe: { path: '/api/guarded', method: 'GET' } }));
  fx.probeLog = [];
  const created = await login(d);
  assert.equal(created.code, 0, `${created.o}\n${created.e}`);
  assert.match(created.o, /SESSION_CREATED/);
  assertNoSecrets(created);
  assert.equal(fx.probeLog.length, 2, 'one request with the session and one without');
  const withSession = fx.probeLog[0];
  assert.match(String(withSession.cookie), /qa_session=teacher-\d/);
  assert.equal(withSession.authorization, `Bearer ${fx.currentBothToken}`);
  assert.equal(fx.probeLog[1].cookie, undefined, 'the anonymous side sent a cookie');
  assert.equal(fx.probeLog[1].authorization, undefined, 'the anonymous side sent a token');

  fx.probeLog = [];
  const loginsBefore = fx.logins;
  const reused = await login(d);
  assert.equal(reused.code, 0, `${reused.o}\n${reused.e}`);
  assert.match(reused.o, /SESSION_REUSED/);
  assert.equal(fx.logins, loginsBefore, 'reuse must not log in');
  assertNoSecrets(reused);
  assert.equal(fx.probeLog.length, 2);
  assert.match(String(fx.probeLog[0].cookie), /qa_session=teacher-\d/);
  assert.equal(fx.probeLog[0].authorization, `Bearer ${fx.currentBothToken}`);
  assert.equal(fx.probeLog[1].cookie, undefined);
  assert.equal(fx.probeLog[1].authorization, undefined);
});

test('HTTP proof: a token artifact that names a header and a prefix is presented under that header, never as Authorization', MEDIUM, async () => {
  const state = { cookies: [{ name: 'qa_session', value: 'teacher-9', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }], origins: [] };
  const d = await project(apiRole({ probe: { path: '/api/guarded-h', method: 'GET' } }), {
    session: JSON.stringify(state),
    tokenArt: { token: REUSE_TOKEN, header: 'x-auth', value_prefix: 'Token ', expires_at: '2999-01-01T00:00:00.000Z', obtained_at: '2026-01-01T00:00:00.000Z' },
  });
  fx.probeLog = [];
  const r = await login(d);
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.match(r.o, /SESSION_REUSED/);
  assertNoSecrets(r);
  assert.equal(fx.probeLog.length, 2);
  assert.equal(fx.probeLog[0].xauth, `Token ${REUSE_TOKEN}`);
  assert.equal(fx.probeLog[0].authorization, undefined, 'a named header must replace Authorization');
  assert.match(String(fx.probeLog[0].cookie), /qa_session=teacher-9/);
  assert.equal(fx.probeLog[1].xauth, undefined);
  assert.equal(fx.probeLog[1].cookie, undefined);
});

test('HTTP proof: a token-only api session (token, no cookie) saves and reuses with no second login; an open probe on reuse halts without re-login or overwrite; a rotated token re-logs in', MEDIUM, async () => {
  const d = await project(apiRole({ api: { path: '/api/token-login', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: 'token' }, sessionCookie: null, probe: { path: '/api/me', method: 'GET' } }));
  const created = await login(d);
  assert.equal(created.code, 0, `${created.o}\n${created.e}`);
  assert.match(created.o, /SESSION_CREATED/);
  assertNoSecrets(created);
  assert.equal(JSON.parse(readFileSync(sessionPath(d), 'utf8')).cookies.length, 0, 'the fixture session must be token-only');
  assert.ok(existsSync(tokenPath(d)));

  const logins = fx.tokenLogins;
  const reused = await login(d);
  assert.equal(reused.code, 0, `${reused.o}\n${reused.e}`);
  assert.match(reused.o, /SESSION_REUSED/);
  assert.equal(fx.tokenLogins, logins, 'reuse must not log in');

  // The probe now answers 2xx for everyone: reuse halts, it neither re-logs in nor overwrites.
  const before = readFileSync(sessionPath(d), 'utf8');
  const beforeToken = readFileSync(tokenPath(d), 'utf8');
  fx.meOpen = true;
  try {
    const halted = await login(d);
    assertHalt('FAILED_PROBE_NOT_PROTECTED', halted);
  } finally {
    fx.meOpen = false;
  }
  assert.equal(fx.tokenLogins, logins, 'a halted reuse must not log in again');
  assert.equal(readFileSync(sessionPath(d), 'utf8'), before, 'a halted reuse overwrote the session');
  assert.equal(readFileSync(tokenPath(d), 'utf8'), beforeToken, 'a halted reuse overwrote the token artifact');

  // The server rotates its token: non-2xx WITH the session is expiry, so the script logs in again.
  fx.currentToken = 'rotated-elsewhere-ZSECRET';
  const relogged = await login(d);
  assert.equal(relogged.code, 0, `${relogged.o}\n${relogged.e}`);
  assert.match(relogged.o, /SESSION_CREATED/);
  assert.equal(fx.tokenLogins, logins + 1, 'an expired session must log in exactly once more');
});

// ---------------------------------------------------------------------------
// 3. Browser probe: save and reuse in both directions
// ---------------------------------------------------------------------------

test('browser probe: save proves marker present with the session and absent for the full absence window without it; the HTTP probe is never consulted', SLOW, async () => {
  const { d, r, loginsDelta, neverDelta } = await saved();
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.match(r.o, /SESSION_CREATED: PRPs\/auth\/\.sessions\/dev\.json/);
  assert.match(r.o, /auth_mode: storage-state:PRPs\/auth\/\.sessions\/dev\.json/);
  assert.ok(existsSync(sessionPath(d)), 'no session file');
  assert.equal(loginsDelta, 1, 'exactly one login request');
  assert.equal(neverDelta, 0, 'a declared browserProbe replaces the HTTP probe: it must not be requested');
  assertNoSecrets(r);
  // The anonymous side concludes absence only after the whole absence window: the run cannot be shorter.
  assert.ok(r.ms >= NEG_MS - 500, `the save finished after ${r.ms} ms, before the ${NEG_MS} ms absence window could have elapsed`);
});

test('browser probe: a second run reuses the proven session with no login and no HTTP probe request, and leaves the session file untouched', SLOW, async () => {
  const { d, r } = await saved();
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  const before = readFileSync(sessionPath(d), 'utf8');
  const logins = fx.logins;
  const never = fx.neverHits;
  const again = await login(d);
  assert.equal(again.code, 0, `${again.o}\n${again.e}`);
  assert.match(again.o, /SESSION_REUSED/);
  assert.doesNotMatch(again.o, /SESSION_CREATED/);
  assert.equal(fx.logins, logins, 'reuse must not log in');
  assert.equal(fx.neverHits, never, 'reuse must not consult the HTTP probe');
  assert.equal(readFileSync(sessionPath(d), 'utf8'), before);
  assert.ok(again.ms >= NEG_MS - 500, `the reuse proof finished after ${again.ms} ms, before the absence window elapsed`);
  assertNoSecrets(again);
});

test('browser probe: a headed role is reused from a saved session in a run with no terminal (no login, no visible browser), and its HTTP probe is not consulted', SLOW, async () => {
  const { d, r } = await saved();
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  const headed = await project(apiRole({ mechanism: 'headed', loginPath: '/perfil', api: null, browserProbe: probeOf() }), { template: SHORT, session: readFileSync(sessionPath(d), 'utf8') });
  const logins = fx.logins;
  const never = fx.neverHits;
  const again = await login(headed);
  assert.equal(again.code, 0, `${again.o}\n${again.e}`);
  assert.match(again.o, /SESSION_REUSED/);
  assert.doesNotMatch(again.e, /FAILED_INTERACTIVE_LOGIN_REQUIRED/);
  assert.equal(fx.logins, logins);
  assert.equal(fx.neverHits, never);
});

test('browser probe: a saved cookie the server no longer accepts (marker absent with the state) means expiry, so the script logs in again and does not halt', SLOW, async () => {
  const { d, r } = await saved();
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  const st = JSON.parse(readFileSync(sessionPath(d), 'utf8'));
  for (const c of st.cookies) if (c.name === 'qa_session') c.value = 'bogus';
  const tampered = await project(apiRole({ browserProbe: probeOf() }), { template: SHORT, session: JSON.stringify(st) });
  const logins = fx.logins;
  const again = await login(tampered);
  assert.equal(again.code, 0, `${again.o}\n${again.e}`);
  assert.match(again.o, /SESSION_CREATED/);
  assert.equal(fx.logins, logins + 1, 'an expired session must log in exactly once more');
  assert.ok(!JSON.stringify(JSON.parse(readFileSync(sessionPath(tampered), 'utf8'))).includes('bogus'), 'the stale cookie was kept');
  assertNoSecrets(again);
});

// ---------------------------------------------------------------------------
// 4. Halts on save: not protected, late marker, wrong account, unloadable
// ---------------------------------------------------------------------------

test('browser probe: a marker that renders for anonymous visitors too halts FAILED_PROBE_NOT_PROTECTED and saves nothing', MEDIUM, async () => {
  const d = await project(apiRole({ browserProbe: probeOf({ route: '/everyone' }) }), { template: SHORT });
  const r = await login(d);
  assertHalt('FAILED_PROBE_NOT_PROTECTED', r);
  assertNothingSaved(d);
});

test('browser probe: a marker that appears for an anonymous visitor only AFTER the presence window but inside the absence window still halts FAILED_PROBE_NOT_PROTECTED', SLOW, async () => {
  const d = await project(apiRole({ browserProbe: probeOf({ route: '/late-anon' }) }), { template: SHORT });
  const r = await login(d);
  assertHalt('FAILED_PROBE_NOT_PROTECTED', r);
  assertNothingSaved(d);
  assert.ok(r.ms >= LATE_ANON_MS, `the script halted after ${r.ms} ms, before the late marker could have rendered`);
});

test('browser probe: a role marker absent with the session halts FAILED_PROBE_WRONG_ACCOUNT and saves nothing', SLOW, async () => {
  const d = await project(apiRole({ browserProbe: probeOf({ roleMarker: { kind: 'text', value: 'Admin area' } }) }), { template: SHORT });
  const r = await login(d);
  assertHalt('FAILED_PROBE_WRONG_ACCOUNT', r);
  assertNothingSaved(d);
});

test('browser probe: a selector-kind marker and role marker are honoured like text markers', SLOW, async () => {
  const d = await project(apiRole({ browserProbe: probeOf({ marker: { kind: 'selector', value: 'h1' }, roleMarker: { kind: 'selector', value: 'p' } }) }), { template: SHORT });
  const r = await login(d);
  // An h1 with text exists only for the authenticated cookie on /perfil; the anonymous page has none.
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.match(r.o, /SESSION_CREATED/);
  assert.ok(existsSync(sessionPath(d)));
});

for (const [name, route] of /** @type {[string, string][]} */ ([
  ['the page answers 5xx for everyone', '/boom'],
  ['the connection is dropped without a response', '/drop'],
  ['the page loads with the session but answers 5xx to the anonymous probe', '/anon-500'],
])) {
  test(`browser probe: ${name}, so the page is unloadable (never counted as absent): FAILED_PROBE_PAGE_UNLOADABLE and nothing saved`, route === '/anon-500' ? SLOW : MEDIUM, async () => {
    const d = await project(apiRole({ browserProbe: probeOf({ route }) }), { template: SHORT });
    const r = await login(d);
    assertHalt('FAILED_PROBE_PAGE_UNLOADABLE', r);
    assertNothingSaved(d);
  });
}

// ---------------------------------------------------------------------------
// 5. Reuse-time halts: a saved session that now fails the proof
// ---------------------------------------------------------------------------

for (const [name, probe, halt] of /** @type {[string, Record<string, any>, string][]} */ ([
  ['the route now shows the marker to everyone', probeOf({ route: '/everyone' }), 'FAILED_PROBE_NOT_PROTECTED'],
  ['the declared role marker is not what the saved account shows', probeOf({ roleMarker: { kind: 'text', value: 'Admin area' } }), 'FAILED_PROBE_WRONG_ACCOUNT'],
  ['the probe page no longer loads', probeOf({ route: '/boom' }), 'FAILED_PROBE_PAGE_UNLOADABLE'],
])) {
  test(`reuse: a saved session whose proof now fails (${name}) halts ${halt}, does not log in again and does not overwrite the session`, SLOW, async () => {
    const { d, r } = await saved();
    assert.equal(r.code, 0, `${r.o}\n${r.e}`);
    const text = readFileSync(sessionPath(d), 'utf8');
    const rd = await project(apiRole({ browserProbe: probe }), { template: SHORT, session: text });
    const logins = fx.logins;
    const out = await login(rd);
    assertHalt(halt, out);
    assert.equal(fx.logins, logins, 'a halted reuse silently logged in again');
    assert.equal(readFileSync(sessionPath(rd), 'utf8'), text, 'a halted reuse overwrote the session');
    assert.ok(!existsSync(tokenPath(rd)) && !existsSync(credentialsPath(rd)));
  });
}

// ---------------------------------------------------------------------------
// 6. static-token
// ---------------------------------------------------------------------------

test('static-token: an endpoint open to everyone still halts FAILED_TOKEN_UNPROVEN even when a browserProbe is declared, before any browser page is requested', MEDIUM, async () => {
  fx.requests = [];
  const d = await project(staticRole({ probe: { path: '/api/open', method: 'GET' }, browserProbe: probeOf({ route: '/ls-app', marker: { kind: 'text', value: 'Token user' }, roleMarker: null }) }), { template: SHORT });
  const r = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assertHalt('FAILED_TOKEN_UNPROVEN', r);
  assertNothingSaved(d);
  assert.ok(!fx.requests.some((q) => q.endsWith('/ls-app')), 'a browser page was requested before the token proof halted');
});

test('static-token: a declared browserProbe is proven on save (token placed in localStorage, marker with the state, absent without) and on reuse', SLOW, async () => {
  const d = await project(staticRole({ browserProbe: probeOf({ route: '/ls-app', marker: { kind: 'text', value: 'Token user' }, roleMarker: null }) }), { template: SHORT });
  const created = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assert.equal(created.code, 0, `${created.o}\n${created.e}`);
  assert.match(created.o, /SESSION_CREATED/);
  assertNoSecrets(created);
  assert.ok(!(created.o + created.e).includes(ST_TOKEN));
  assert.ok(created.ms >= NEG_MS - 500, `the save finished after ${created.ms} ms, before the absence window elapsed`);
  const art = JSON.parse(readFileSync(tokenPath(d), 'utf8'));
  assert.equal(art.header, 'x-api-key');
  const reused = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assert.equal(reused.code, 0, `${reused.o}\n${reused.e}`);
  assert.match(reused.o, /SESSION_REUSED/);
  assert.ok(!(reused.o + reused.e).includes(ST_TOKEN));
});

// ---------------------------------------------------------------------------
// 7. Config validation names the field before any request is made
// ---------------------------------------------------------------------------

/** @param {string} s */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [name, role, field] of /** @type {[string, any, string][]} */ ([
  ['an empty route', apiRole({ browserProbe: probeOf({ route: '' }) }), 'roles.dev.browserProbe.route'],
  ['a route that is not a string', apiRole({ browserProbe: probeOf({ route: 7 }) }), 'roles.dev.browserProbe.route'],
  ['a marker kind that is neither text nor selector', apiRole({ browserProbe: probeOf({ marker: { kind: 'xpath', value: '//h1' } }) }), 'roles.dev.browserProbe.marker.kind'],
  ['an empty marker value', apiRole({ browserProbe: probeOf({ marker: { kind: 'text', value: '' } }) }), 'roles.dev.browserProbe.marker.value'],
  ['a missing marker', apiRole({ browserProbe: { route: '/perfil', roleMarker: null } }), 'roles.dev.browserProbe.marker'],
  ['a role marker with a bad kind', apiRole({ browserProbe: probeOf({ roleMarker: { kind: 'css', value: 'p' } }) }), 'roles.dev.browserProbe.roleMarker.kind'],
  ['a role marker with an empty value', apiRole({ browserProbe: probeOf({ roleMarker: { kind: 'text', value: '' } }) }), 'roles.dev.browserProbe.roleMarker.value'],
  ['a browserProbe that is not an object', apiRole({ browserProbe: 'yes' }), 'roles.dev.browserProbe'],
  ['a TBD marker value', apiRole({ browserProbe: probeOf({ marker: { kind: 'text', value: 'TBD - needs validation' } }) }), 'roles.dev.browserProbe.marker.value'],
  ['a TBD route', apiRole({ browserProbe: probeOf({ route: 'TBD - needs validation' }) }), 'roles.dev.browserProbe.route'],
  ['a static-token role with an empty browser state (staticToken.browser null) that declares a browserProbe', staticRole({ browserProbe: probeOf() }, null), 'roles.dev.browserProbe'],
])) {
  test(`config: ${name} halts FAILED_LOGIN_CONFIG_INCOMPLETE naming ${field}, saves nothing and starts no browser`, async () => {
    fx.requests = [];
    const d = await project(role);
    const r = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
    assert.equal(r.code, 1, `${r.o}\n${r.e}`);
    assert.match(r.e, new RegExp(`FAILED_LOGIN_CONFIG_INCOMPLETE: ${esc(field)}\\s*$`, 'm'));
    assertNothingSaved(d);
    assert.deepEqual(fx.requests, [], 'the script contacted the application before validating its config');
    assertNoSecrets(r);
  });
}

test('config: an absent browserProbe is read as null, so a role without one still saves under the HTTP proof', MEDIUM, async () => {
  const d = await project(apiRole({ probe: { path: '/api/guarded', method: 'GET' }, api: { path: '/api/login-both', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: 'token' } }));
  const r = await login(d);
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.match(r.o, /SESSION_CREATED/);
});

// ---------------------------------------------------------------------------
// 8. qa-run: the three probe codes are named blocked reasons; nothing else changes
// ---------------------------------------------------------------------------

test('qa-run: each probe halt becomes a blocked case with that named reason; every other session failure stays SESSION_UNAVAILABLE', MEDIUM, async () => {
  const d = mkdtempSync(join(tmpdir(), 'relay-reuseproof-qarun-'));
  temps.push(d);
  await execFileP('git', ['init', '-q', d]);
  mkdirSync(join(d, 'PRPs', 'auth'), { recursive: true });
  /** @type {Record<string, { stderr?: string, stdout?: string } | null>} */
  const scripts = {
    'probe-np': { stderr: 'FAILED_PROBE_NOT_PROTECTED: x' },
    'probe-wa': { stderr: 'FAILED_PROBE_WRONG_ACCOUNT: x' },
    'probe-pu': { stderr: 'FAILED_PROBE_PAGE_UNLOADABLE: x' },
    rejected: { stderr: 'FAILED_LOGIN_REJECTED: x' },
    'stdout-only': { stdout: 'FAILED_PROBE_NOT_PROTECTED: only on stdout' },
    'no-script': null,
  };
  /** @type {Record<string, any>} */ const roles = {};
  for (const [role, spec] of Object.entries(scripts)) {
    roles[role] = { mechanism: 'api' };
    if (spec === null) continue;
    writeFileSync(join(d, 'PRPs', 'auth', `login-${role}.mjs`), `${spec.stdout ? `process.stdout.write(${JSON.stringify(`${spec.stdout}\n`)});` : ''}${spec.stderr ? `process.stderr.write(${JSON.stringify(`${spec.stderr}\n`)});` : ''}process.exit(1);\n`);
  }
  writeFileSync(join(d, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: base, roles }));
  const feature = 'feat';
  const reportDir = join(d, 'PRPs', 'reports', feature);
  mkdirSync(reportDir, { recursive: true });
  const names = Object.keys(scripts);
  const block = (/** @type {number} */ n) =>
    `### ${n} — Case ${n}\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** n/a\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n`;
  const reportPath = join(reportDir, 'qa-report.md');
  writeFileSync(reportPath, `# QA Report\n\n${names.map((_, i) => block(i + 1)).join('')}`);
  const parsed = await runNode(QA_RUN, ['parse', '--report', reportPath]);
  assert.equal(parsed.code, 0, parsed.stderr);
  const titles = JSON.parse(parsed.stdout).cases.map((/** @type {any} */ c) => c.title);
  const runDirRel = `PRPs/reports/${feature}/qa-run/20260101T101010101Z`;
  mkdirSync(join(d, ...runDirRel.split('/'), 'evidence'), { recursive: true });
  writeFileSync(
    join(d, ...runDirRel.split('/'), 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: names.map((role, i) => ({ index: i + 1, title: titles[i], driver: 'http', role, state: 'none', steps: [{ action: 'request', method: 'GET', path: '/x', expect_status: 200 }] })),
    }),
  );
  const run = await runNode(QA_RUN, ['run', '--root', d, '--feature', feature, '--run-dir', runDirRel]);
  assert.equal(run.code, 0, `${run.stdout}\n${run.stderr}`);
  const results = JSON.parse(readFileSync(join(d, ...runDirRel.split('/'), 'results.json'), 'utf8'));
  /** @type {(role: string) => any} */
  const caseOf = (role) => results.cases[names.indexOf(role)];
  for (const [role, code] of /** @type {[string, string][]} */ ([
    ['probe-np', 'FAILED_PROBE_NOT_PROTECTED'],
    ['probe-wa', 'FAILED_PROBE_WRONG_ACCOUNT'],
    ['probe-pu', 'FAILED_PROBE_PAGE_UNLOADABLE'],
  ])) {
    const c = caseOf(role);
    assert.equal(c.outcome, 'blocked', JSON.stringify(c));
    assert.equal(c.reason_code, code, JSON.stringify(c));
  }
  for (const [role, code] of /** @type {[string, string][]} */ ([
    ['rejected', 'FAILED_LOGIN_REJECTED'],
    ['stdout-only', 'FAILED_LOGIN_UNKNOWN'],
    ['no-script', 'FAILED_LOGIN_SCRIPT_MISSING'],
  ])) {
    const c = caseOf(role);
    assert.equal(c.outcome, 'blocked', JSON.stringify(c));
    assert.equal(c.reason_code, 'SESSION_UNAVAILABLE', JSON.stringify(c));
    assert.ok(JSON.stringify(c).includes(code), `the blocked reason must still carry ${code}: ${JSON.stringify(c)}`);
  }
});

// ---------------------------------------------------------------------------
// 9. Mutation proofs on a copy of the template
// ---------------------------------------------------------------------------

test('mutation: an absence window as short as the presence window lets the late-anonymous-marker page be saved (the late-marker test is what catches it)', SLOW, async () => {
  const template = mutate([...TIMING, ['const BROWSER_PROBE_NEGATIVE_MS = BROWSER_PROBE_POSITIVE_MS + BROWSER_PROBE_SETTLE_MS;', 'const BROWSER_PROBE_NEGATIVE_MS = BROWSER_PROBE_POSITIVE_MS;']]);
  assert.notEqual(template, SHORT);
  const d = await project(apiRole({ browserProbe: probeOf({ route: '/late-anon' }) }), { template });
  const r = await login(d);
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.ok(existsSync(sessionPath(d)), 'the mutated copy must save the unprotected page');
});

test('mutation: not requiring the anonymous page to load lets a page that answers 5xx be counted as absent and saved (the unloadable tests are what catch it)', SLOW, async () => {
  const template = mutate([...TIMING, ["if (!(await load(freshPage))) return 'unloadable';", 'await load(freshPage);']]);
  const d = await project(apiRole({ browserProbe: probeOf({ route: '/anon-500' }) }), { template });
  const r = await login(d);
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.ok(existsSync(sessionPath(d)), 'the mutated copy must save a session proven by an unloadable page');
});

test('mutation: dropping the anonymous half of the HTTP proof saves a session for a probe that proves nothing (the NOT_PROTECTED test is what catches it)', MEDIUM, async () => {
  const template = mutate([["return without >= 200 && without < 300 ? 'not-protected' : 'proven';", "return 'proven';"]]);
  const d = await project(apiRole({ probe: { path: '/perfil', method: 'GET' } }), { template });
  const r = await login(d);
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.ok(existsSync(sessionPath(d)), 'the mutated copy must save the unproven session');
});

test('mutation: sending no token on the session side rejects a valid token-only session (the token-only save test is what catches it)', MEDIUM, async () => {
  const template = mutate([['const withSession = await status({ storageState: storage }, headers);', 'const withSession = await status({ storageState: storage }, undefined);']]);
  const d = await project(apiRole({ api: { path: '/api/token-login', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: 'token' }, sessionCookie: null, probe: { path: '/api/me', method: 'GET' } }), { template });
  const r = await login(d);
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, /FAILED_LOGIN_REJECTED/);
  assertNothingSaved(d);
});
