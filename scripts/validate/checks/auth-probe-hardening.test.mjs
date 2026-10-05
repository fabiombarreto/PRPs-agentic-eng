// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-22 A browser-probe role needs no HTTP probe (probe null or TBD), a role without one still does
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-23 Presence is a stable state: a marker that vanishes within the dwell is an expired session, never a wrong account
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-24 (script side) A script from a differently stamped template halts FAILED_KIT_SCRIPT_STALE before any write
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-25 A probe that fails after a completed login halts FAILED_PROBE_MARKER_ABSENT
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-26 A static-token role may declare maxAgeMinutes null; every other mechanism may not
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-27 A static-token failure halts with FAILED_TOKEN_REJECTED / FAILED_TOKEN_TRANSPORT / FAILED_TOKEN_PLACEMENT
/**
 * End-to-end tests for the phase-8 hardening of
 * plugins/relay/resources/auth-login.template.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md (AC-22 .. AC-27)
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-8-probe-and-kit-hardening.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every test copies
 * the REAL template into a temp git project (the single `__RELAY_ROLE__`
 * substitution a generated script gets) and runs it as an ASYNC child process
 * against one in-process loopback application. A synchronous child spawn beside
 * that server would block this process's event loop, so none is used.
 *
 * Timing: the three timing literals of the template COPY (presence window, settle
 * aid, dwell) are shortened with the anchored-mutation pattern of
 * auth-reuse-proof.test.mjs; the shipped 15 s / 5 s / 5 s values are untouched.
 * The dwell scenarios are scheduled by the page itself (a marker removed N ms
 * after load) and the margins are derived from the shortened values in the
 * comments beside each fixture.
 *
 * Covered by an existing test instead of repeated here (paths in the suite manifest):
 *   - AC-23(c) a marker still visible while the role marker is absent stays
 *     FAILED_PROBE_WRONG_ACCOUNT: auth-reuse-proof.test.mjs (save and reuse).
 *   - AC-24 fail-open on an unreadable installed template: the fake plugin roots of
 *     auth-login-template.test.mjs. The unstamped-installed-template variant is here.
 *   - AC-27 FAILED_TOKEN_REJECTED naming 401 and FAILED_TOKEN_PLACEMENT for an
 *     absent database or store: auth-static-token-indexeddb.test.mjs.
 *
 * Mutation proofs: the dwell and the re-check of the auth marker are each broken in
 * a COPY of the template (anchors must occur exactly once) and the matching
 * scenario is shown to turn into a wrongly reused session or a wrong-account halt.
 *
 * Real Chromium + Playwright are used; there are no skip conditions.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync, utimesSync } from 'node:fs';
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
const STAMP_LINE = /^const KIT_TEMPLATE_ID = '([^']+)';$/m;
const TBD = 'TBD - needs validation';

const USERNAME = 'qa-user';
const PASSWORD = 'pw-hardening-secret-1';
const ST_TOKEN = 'tok-hardening-ZSECRET';
const CREDS_ENV = { QA_USER: USERNAME, QA_PASS: PASSWORD };

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

const fx = {
  logins: 0,
  stHits: 0,
  stToken: ST_TOKEN,
  /** @type {string[]} */ requests: [],
};

/** @param {import('node:http').IncomingMessage} req @returns {Promise<string>} */
function readBody(req) {
  return new Promise((done) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => done(b));
  });
}

/** @param {string} body @param {string} [script] */
const page = (body, script = '') => `<!doctype html><html><head><meta charset="utf-8"></head><body>${body}${script === '' ? '' : `<script>${script}</script>`}</body></html>`;
const LAYOUT = '<div id="layout">Hello layout</div>';
const ROLE_EL = '<div id="role">Role marker</div>';
/** @param {string} id @param {number} ms */
const removeAfter = (id, ms) => `setTimeout(function(){var e=document.getElementById('${id}');if(e)e.remove()},${ms})`;

// Page-scheduled removals (ms after the page's script starts). The proofs below are
// timed against these; see the margin comments at each scenario.
const TRANSIENT_REMOVE_MS = 2200;
const TRANSIENT_ROLE_REMOVE_MS = 4000;
const ROLE_VANISH_MS = 5500;

/** @type {import('node:http').Server} */
let server;
let base = '';

before(async () => {
  server = createServer(async (req, res) => {
    const p = new URL(req.url ?? '/', 'http://x').pathname;
    fx.requests.push(`${req.method} ${p}`);
    const h = req.headers;
    const has = /(?:^|; )s=1(?:;|$)/.test(String(h.cookie ?? ''));
    /** @param {number} status @param {string} body @param {Record<string, string>} [headers] */
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': body.startsWith('{') ? 'application/json' : 'text/html', ...headers });
      res.end(body);
    };
    if (req.method === 'POST' && p === '/api/login') {
      let body = {};
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        body = {};
      }
      if (body.username !== USERNAME || body.password !== PASSWORD) return send(401, '{}');
      fx.logins++;
      return send(200, '{}', { 'set-cookie': 's=1; Path=/' });
    }
    // An HTTP probe that the login cookie alone does not satisfy (needs s=2).
    if (p === '/api/cookie2') return send(/(?:^|; )s=2(?:;|$)/.test(String(h.cookie ?? '')) ? 200 : 401, '{}');
    if (p === '/api/st') {
      fx.stHits++;
      return send(h['x-api-key'] === fx.stToken ? 200 : 401, '{}');
    }
    if (p === '/api/forbidden') return send(403, '{}');
    if (p === '/stable') return send(200, page(has ? LAYOUT : ''));
    if (p === '/transient') return send(200, page(has ? LAYOUT : '', has ? removeAfter('layout', TRANSIENT_REMOVE_MS) : ''));
    if (p === '/transient-role') return send(200, page(has ? LAYOUT : '', has ? removeAfter('layout', TRANSIENT_ROLE_REMOVE_MS) : ''));
    if (p === '/role-vanish') return send(200, page(has ? LAYOUT + ROLE_EL : '', has ? removeAfter('role', ROLE_VANISH_MS) : ''));
    if (p === '/hidden') return send(200, page('<div id="layout" style="display:none">x</div>'));
    return send(200, page('<p>nothing to see</p>'));
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
 * Applies anchored replacements; every anchor must occur exactly once.
 * @param {[string, string][]} edits
 * @param {string} [text]
 * @returns {string}
 */
function mutate(edits, text = TEMPLATE) {
  let out = text;
  for (const [anchor, replacement] of edits) {
    assert.equal(out.split(anchor).length - 1, 1, `mutation anchor must occur exactly once: ${anchor}`);
    out = out.replace(anchor, () => replacement);
  }
  return out;
}

/**
 * The real template with only the three timing literals shortened.
 * @param {{ pos?: number, settle?: number, dwell?: number }} [o]
 * @param {[string, string][]} [extra]
 */
function variant(o = {}, extra = []) {
  const { pos = 2500, settle = 500, dwell = 1000 } = o;
  return mutate(
    [
      ['const BROWSER_PROBE_POSITIVE_MS = 15000;', `const BROWSER_PROBE_POSITIVE_MS = ${pos};`],
      ['const BROWSER_PROBE_SETTLE_MS = 5000;', `const BROWSER_PROBE_SETTLE_MS = ${settle};`],
      ['const BROWSER_PROBE_DWELL_MS = 5000;', `const BROWSER_PROBE_DWELL_MS = ${dwell};`],
      ...extra,
    ],
  );
}

const SESSION_STATE = JSON.stringify({
  cookies: [{ name: 's', value: '1', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }],
  origins: [],
});

/** @param {string} route @param {Record<string, any>} [over] */
const bp = (route, over = {}) => ({ route, marker: { kind: 'selector', value: '#layout' }, roleMarker: null, ...over });
const ROLE_MARKER = { kind: 'selector', value: '#role' };

const NO_CREDS = { usernameEnv: null, passwordEnv: null };

/** @param {Record<string, any>} [over] */
function apiRole(over = {}) {
  return {
    mechanism: 'api',
    loginPath: null,
    form: null,
    api: { path: '/api/login', method: 'POST', usernameField: 'username', passwordField: 'password', tokenPath: null },
    probe: { path: '/api/cookie2', method: 'GET' },
    sessionCookie: 's',
    maxAgeMinutes: 60,
    credentials: { usernameEnv: 'QA_USER', passwordEnv: 'QA_PASS' },
    userCreation: { command: null },
    ...over,
  };
}

/** @param {Record<string, any>} [over] */
function formRole(over = {}) {
  return {
    ...apiRole(),
    mechanism: 'form',
    loginPath: '/login',
    form: { usernameSelector: '#u', passwordSelector: '#p', submitSelector: '#s' },
    api: null,
    ...over,
  };
}

/** @param {Record<string, any>} [over] */
function headedRole(over = {}) {
  return { ...apiRole(), mechanism: 'headed', loginPath: '/login', api: null, ...over };
}

/** A login-less static-token role. @param {Record<string, any>} [over] @param {Record<string, any> | null} [browser] */
function staticRole(over = {}, browser = null) {
  return {
    mechanism: 'static-token',
    loginPath: null,
    form: null,
    api: null,
    probe: { path: '/api/st', method: 'GET' },
    sessionCookie: null,
    maxAgeMinutes: 60,
    credentials: NO_CREDS,
    userCreation: { command: null },
    staticToken: { tokenEnv: 'QA_ST_TOKEN', header: 'x-api-key', valuePrefix: '', browser },
    ...over,
  };
}

/**
 * A temp git project holding the login script for role `dev` and the config.
 * @param {any} role
 * @param {{ template?: string, session?: string, baseUrl?: string }} [o]
 * @returns {Promise<string>} the project root
 */
async function project(role, o = {}) {
  const d = mkdtempSync(join(tmpdir(), 'relay-hardening-'));
  temps.push(d);
  await execFileP('git', ['init', '-q', d]);
  mkdirSync(join(d, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(d, 'PRPs', 'auth', 'login-dev.mjs'), (o.template ?? TEMPLATE).replaceAll('__RELAY_ROLE__', 'dev'));
  writeFileSync(join(d, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: o.baseUrl ?? base, roles: { dev: role } }));
  if (o.session !== undefined) {
    mkdirSync(join(d, 'PRPs', 'auth', '.sessions'), { recursive: true });
    writeFileSync(sessionPath(d), o.session);
  }
  return d;
}

/**
 * Runs the project's login script as an async child (no terminal).
 * @param {string} d
 * @param {{ env?: Record<string, string>, pluginRoot?: string }} [o]
 * @returns {Promise<{ code: number | null, o: string, e: string, ms: number }>}
 */
function login(d, o = {}) {
  /** @type {Record<string, string | undefined>} */ const env = { ...process.env };
  for (const k of ['QA_USER', 'QA_PASS', 'QA_ST_TOKEN', 'CLAUDE_PLUGIN_ROOT']) delete env[k];
  Object.assign(env, o.env ?? {});
  const t0 = Date.now();
  return new Promise((res, rej) => {
    const c = spawn(process.execPath, [join(d, 'PRPs', 'auth', 'login-dev.mjs'), '--plugin-root', o.pluginRoot ?? PLUGIN, '--root', d], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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

const sessionPath = (/** @type {string} */ d) => join(d, 'PRPs', 'auth', '.sessions', 'dev.json');
const tokenPath = (/** @type {string} */ d) => join(d, 'PRPs', 'auth', '.sessions', 'dev.token.json');
const credentialsPath = (/** @type {string} */ d) => join(d, 'PRPs', 'auth', 'credentials.json');

/** @param {string} d */
function assertNothingSaved(d) {
  assert.ok(!existsSync(sessionPath(d)), 'a session file was saved');
  assert.ok(!existsSync(tokenPath(d)), 'a token artifact was saved');
  assert.ok(!existsSync(credentialsPath(d)), 'a credential file was written');
}

/** @param {{ o: string, e: string }} r */
function assertNoSecrets(r) {
  const out = r.o + r.e;
  for (const secret of [PASSWORD, ST_TOKEN, 'Hello layout', 'Role marker']) assert.ok(!out.includes(secret), `a secret or marker value was printed: ${secret.slice(0, 5)}...`);
}

/** @param {string} code @param {{ code: number | null, o: string, e: string }} r */
function assertHalt(code, r) {
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, new RegExp(code));
  assert.doesNotMatch(r.o, /SESSION_CREATED|SESSION_REUSED/);
  assertNoSecrets(r);
}

/** @returns {Promise<number>} a loopback port nothing listens on */
async function closedPort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, '127.0.0.1', () => r(null)));
  const port = /** @type {any} */ (s.address()).port;
  await new Promise((r) => s.close(() => r(null)));
  return port;
}

const SLOW = { timeout: 150000 };
const MEDIUM = { timeout: 90000 };
const QUICK = { timeout: 60000 };

// ---------------------------------------------------------------------------
// AC-22: the HTTP probe is optional when a browser probe is declared
// ---------------------------------------------------------------------------

for (const [mech, make, halt] of /** @type {[string, (o?: Record<string, any>) => any, RegExp][]} */ ([
  ['form', formRole, /FAILED_CREDENTIALS_UNAVAILABLE/],
  ['api', apiRole, /FAILED_CREDENTIALS_UNAVAILABLE/],
  ['headed', headedRole, /FAILED_INTERACTIVE_LOGIN_REQUIRED/],
])) {
  for (const [shape, probe] of /** @type {[string, any][]} */ ([
    ['null', null],
    ['TBD - needs validation in both fields', { path: TBD, method: TBD }],
    ['absent', undefined],
  ])) {
    test(`AC-22: a ${mech} role with a browserProbe and a probe that is ${shape} passes the config check (it reaches the credential/terminal step) and contacts nothing`, QUICK, async () => {
      fx.requests = [];
      const d = await project(make({ probe, credentials: NO_CREDS, browserProbe: bp('/stable') }));
      const r = await login(d);
      assert.equal(r.code, 1, `${r.o}\n${r.e}`);
      assert.doesNotMatch(r.e, /FAILED_LOGIN_CONFIG_INCOMPLETE/);
      assert.match(r.e, halt);
      assertNothingSaved(d);
      assert.deepEqual(fx.requests, [], 'the script contacted the application before the credential step');
    });
  }
}

for (const [mech, make] of /** @type {[string, (o?: Record<string, any>) => any][]} */ ([
  ['form', formRole],
  ['api', apiRole],
  ['headed', headedRole],
])) {
  for (const [shape, probe] of /** @type {[string, any][]} */ ([
    ['null', null],
    ['TBD - needs validation', { path: TBD, method: TBD }],
  ])) {
    test(`AC-22: a ${mech} role WITHOUT a browserProbe and a probe that is ${shape} still halts FAILED_LOGIN_CONFIG_INCOMPLETE naming roles.dev.probe.path`, QUICK, async () => {
      fx.requests = [];
      const d = await project(make({ probe, credentials: NO_CREDS }));
      const r = await login(d);
      assert.equal(r.code, 1, `${r.o}\n${r.e}`);
      assert.match(r.e, /FAILED_LOGIN_CONFIG_INCOMPLETE: roles\.dev\.probe\.path\s*$/m);
      assertNothingSaved(d);
      assert.deepEqual(fx.requests, []);
    });
  }
}

test('AC-22: a static-token role keeps probe.path required even when it declares a browserProbe (probe null halts FAILED_LOGIN_CONFIG_INCOMPLETE roles.dev.probe.path)', QUICK, async () => {
  const browser = { kind: 'localStorage', originPath: '/stable', key: 'tok', database: null, store: null, valueField: null };
  const d = await project(staticRole({ probe: null, browserProbe: bp('/stable') }, browser));
  const r = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, /FAILED_LOGIN_CONFIG_INCOMPLETE: roles\.dev\.probe\.path\s*$/m);
  assertNothingSaved(d);
  assertNoSecrets(r);
});

// The two end-to-end proofs use the fast timing variant: absence window 2500 + 500 = 3000 ms.
const FAST = variant({ pos: 2500, settle: 500, dwell: 1000 });

test('AC-22: a role with a browserProbe and probe null saves a session and then reuses it with no second login', SLOW, async () => {
  const d = await project(apiRole({ probe: null, browserProbe: bp('/stable') }), { template: FAST });
  const logins = fx.logins;
  const created = await login(d, { env: CREDS_ENV });
  assert.equal(created.code, 0, `${created.o}\n${created.e}`);
  assert.match(created.o, /SESSION_CREATED: PRPs\/auth\/\.sessions\/dev\.json/);
  assert.equal(fx.logins, logins + 1, 'exactly one login request');
  assert.ok(existsSync(sessionPath(d)), 'no session file');
  assertNoSecrets(created);
  const reused = await login(d, { env: CREDS_ENV });
  assert.equal(reused.code, 0, `${reused.o}\n${reused.e}`);
  assert.match(reused.o, /SESSION_REUSED/);
  assert.equal(fx.logins, logins + 1, 'reuse must not log in');
});

test('AC-22: a role whose probe fields are TBD - needs validation but which declares a browserProbe saves a session', SLOW, async () => {
  const d = await project(apiRole({ probe: { path: TBD, method: TBD }, browserProbe: bp('/stable') }), { template: FAST });
  const r = await login(d, { env: CREDS_ENV });
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.match(r.o, /SESSION_CREATED/);
  assert.ok(existsSync(sessionPath(d)), 'no session file');
});

// ---------------------------------------------------------------------------
// AC-23: presence is a stable state
// ---------------------------------------------------------------------------

// Dwell 3000 ms. The settle aid (networkidle, at most 500 ms) and the first re-check come
// before the dwell, so the second re-check is at least 3000 ms after the marker was seen.
// /transient removes the marker 2200 ms after the page starts: after the first re-check of a
// healthy machine, before the second one with 800 ms or more to spare. The shortened dwell
// of the mutation proof (0) leaves both re-checks inside the window the marker is present.
const TRANSIENT = variant({ pos: 2500, settle: 500, dwell: 3000 });

test('AC-23(a) reuse: a marker visible for a moment and then removed by the page within the dwell is an expired session: with no terminal the script halts FAILED_INTERACTIVE_LOGIN_REQUIRED and neither reuses nor overwrites the session (control: a stable marker is reused)', SLOW, async () => {
  const d = await project(headedRole({ probe: null, browserProbe: bp('/transient') }), { template: TRANSIENT, session: SESSION_STATE });
  const before = readFileSync(sessionPath(d), 'utf8');
  const r = await login(d);
  assertHalt('FAILED_INTERACTIVE_LOGIN_REQUIRED', r);
  assert.doesNotMatch(r.e, /FAILED_PROBE_WRONG_ACCOUNT|FAILED_PROBE_NOT_PROTECTED/);
  assert.equal(readFileSync(sessionPath(d), 'utf8'), before, 'the session was overwritten');
  assert.ok(!existsSync(tokenPath(d)) && !existsSync(credentialsPath(d)));

  const control = await project(headedRole({ probe: null, browserProbe: bp('/stable') }), { template: TRANSIENT, session: SESSION_STATE });
  const ok = await login(control);
  assert.equal(ok.code, 0, `${ok.o}\n${ok.e}`);
  assert.match(ok.o, /SESSION_REUSED/);
});

test('AC-23(a) save: a marker that shows after the login and is then removed by the page is never saved: FAILED_PROBE_MARKER_ABSENT, nothing written', SLOW, async () => {
  const d = await project(apiRole({ probe: null, browserProbe: bp('/transient') }), { template: TRANSIENT });
  const r = await login(d, { env: CREDS_ENV });
  assertHalt('FAILED_PROBE_MARKER_ABSENT', r);
  assert.match(r.e, /browserProbe\.marker/);
  assert.doesNotMatch(r.e, /FAILED_LOGIN_REJECTED|FAILED_PROBE_WRONG_ACCOUNT/);
  assertNothingSaved(d);
});

// Reviewer's reproduction (role marker declared, auth marker removed during the role-marker
// wait), scaled: presence window 4000 ms, dwell 1500 ms. The first dwell ends 1500 ms plus at
// most the 1000 ms settle after the marker was seen; the role-marker wait then runs a further
// 4000 ms. /transient-role removes the auth marker at 4000 ms: after the first dwell with 1 s
// to spare and well inside the role-marker wait. The role marker never exists.
const REPRO = variant({ pos: 4000, settle: 1000, dwell: 1500 });
const REPRO_ROLE = () => headedRole({ probe: null, browserProbe: bp('/transient-role', { roleMarker: ROLE_MARKER }) });

test('AC-23(b) the reviewer reproduction: the auth marker removed during the role-marker wait is an expired session (FAILED_INTERACTIVE_LOGIN_REQUIRED with no terminal), NOT FAILED_PROBE_WRONG_ACCOUNT', SLOW, async () => {
  const d = await project(REPRO_ROLE(), { template: REPRO, session: SESSION_STATE });
  const before = readFileSync(sessionPath(d), 'utf8');
  const r = await login(d);
  assertHalt('FAILED_INTERACTIVE_LOGIN_REQUIRED', r);
  assert.doesNotMatch(r.e, /FAILED_PROBE_WRONG_ACCOUNT/);
  assert.equal(readFileSync(sessionPath(d), 'utf8'), before, 'the session was overwritten');
});

test('mutation: skipping the re-check of the auth marker after a role-marker timeout reports the reproduction as FAILED_PROBE_WRONG_ACCOUNT (the AC-23(b) test is what catches it)', SLOW, async () => {
  const template = variant({ pos: 4000, settle: 1000, dwell: 1500 }, [
    ['// re-check the auth marker first; only a still-visible one makes this a wrong account.', "if (true) return 'wrong-account';"],
  ]);
  assert.notEqual(template, REPRO);
  const d = await project(REPRO_ROLE(), { template, session: SESSION_STATE });
  const r = await login(d);
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, /FAILED_PROBE_WRONG_ACCOUNT/, 'the mutated copy must misreport the logged-out session as a wrong account');
});

test('mutation: a zero dwell lets the transient marker be reused (the AC-23(a) reuse test is what catches it)', SLOW, async () => {
  const template = variant({ pos: 2500, settle: 500, dwell: 0 });
  const d = await project(headedRole({ probe: null, browserProbe: bp('/transient') }), { template, session: SESSION_STATE });
  const r = await login(d);
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.match(r.o, /SESSION_REUSED/, 'with no dwell the marker is still visible at both checks and the session is wrongly reused');
});

// AC-23(d): the role marker appears at once and is removed 5500 ms after the page starts.
// Dwell 3000 ms: the role marker is seen about 3.7 s in (marker re-check 0.6 s + dwell), and
// the re-check of both markers after the second dwell is about 6.7 s in, so the removal
// lands between them with more than a second on each side.
const ROLE_VANISH = variant({ pos: 4000, settle: 1000, dwell: 3000 });

test('AC-23(d) a role marker that vanishes within its dwell is an expired session naming the roleMarker, never a wrong account', SLOW, async () => {
  const d = await project(apiRole({ probe: null, browserProbe: bp('/role-vanish', { roleMarker: ROLE_MARKER }) }), { template: ROLE_VANISH });
  const r = await login(d, { env: CREDS_ENV });
  assertHalt('FAILED_PROBE_MARKER_ABSENT', r);
  assert.match(r.e, /browserProbe\.roleMarker/);
  assert.doesNotMatch(r.e, /FAILED_PROBE_WRONG_ACCOUNT/);
  assertNothingSaved(d);
});

// ---------------------------------------------------------------------------
// AC-25: a probe that fails after a completed login names the probe
// ---------------------------------------------------------------------------

test('AC-25: a login that completes but whose marker matches no element halts FAILED_PROBE_MARKER_ABSENT naming the marker and "no element matched it", saving nothing', MEDIUM, async () => {
  const logins = fx.logins;
  const d = await project(apiRole({ probe: null, browserProbe: bp('/none') }), { template: FAST });
  const r = await login(d, { env: CREDS_ENV });
  assertHalt('FAILED_PROBE_MARKER_ABSENT', r);
  assert.equal(fx.logins, logins + 1, 'the login itself completed');
  assert.match(r.e, /roles\.dev\.browserProbe\.marker/);
  assert.match(r.e, /no element matched it/);
  assert.doesNotMatch(r.e, /existed but was not visible|FAILED_LOGIN_REJECTED/);
  assertNothingSaved(d);
});

test('AC-25: a marker that matches an element which is not visible halts FAILED_PROBE_MARKER_ABSENT with "existed but was not visible", saving nothing', MEDIUM, async () => {
  const d = await project(apiRole({ probe: null, browserProbe: bp('/hidden') }), { template: FAST });
  const r = await login(d, { env: CREDS_ENV });
  assertHalt('FAILED_PROBE_MARKER_ABSENT', r);
  assert.match(r.e, /roles\.dev\.browserProbe\.marker/);
  assert.match(r.e, /an element matching it existed but was not visible/);
  assert.doesNotMatch(r.e, /no element matched it|FAILED_LOGIN_REJECTED/);
  assertNothingSaved(d);
});

test('AC-25: a role WITHOUT a browser probe whose save proof fails keeps FAILED_LOGIN_REJECTED (and never says FAILED_PROBE_MARKER_ABSENT)', MEDIUM, async () => {
  // The login sets s=1; the HTTP probe wants s=2, so it answers 401 with the session.
  const d = await project(apiRole());
  const r = await login(d, { env: CREDS_ENV });
  assertHalt('FAILED_LOGIN_REJECTED', r);
  assert.doesNotMatch(r.e, /FAILED_PROBE_MARKER_ABSENT/);
  assertNothingSaved(d);
});

// ---------------------------------------------------------------------------
// AC-26: maxAgeMinutes null is for static-token only
// ---------------------------------------------------------------------------

for (const [name, role] of /** @type {[string, any][]} */ ([
  ['form', formRole({ maxAgeMinutes: null, credentials: NO_CREDS })],
  ['api', apiRole({ maxAgeMinutes: null, credentials: NO_CREDS })],
  ['headed', headedRole({ maxAgeMinutes: null, credentials: NO_CREDS })],
  ['api with a browserProbe and a null probe', apiRole({ maxAgeMinutes: null, probe: null, credentials: NO_CREDS, browserProbe: bp('/stable') })],
])) {
  test(`AC-26: maxAgeMinutes null is rejected for ${name} (FAILED_LOGIN_CONFIG_INCOMPLETE naming roles.dev.maxAgeMinutes, nothing requested or saved)`, QUICK, async () => {
    fx.requests = [];
    const d = await project(role);
    const r = await login(d);
    assert.equal(r.code, 1, `${r.o}\n${r.e}`);
    assert.match(r.e, /FAILED_LOGIN_CONFIG_INCOMPLETE: roles\.dev\.maxAgeMinutes\s*$/m);
    assertNothingSaved(d);
    assert.deepEqual(fx.requests, []);
  });
}

test('AC-26: a static-token role with maxAgeMinutes null saves, carries no expires_at (no NaN, no always-fresh stamp), and every reuse re-proves the token whatever the age of the session file (control: with a number the aged session is not reused)', MEDIUM, async () => {
  fx.stToken = ST_TOKEN;
  const d = await project(staticRole({ maxAgeMinutes: null }));
  const created = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assert.equal(created.code, 0, `${created.o}\n${created.e}`);
  assert.match(created.o, /SESSION_CREATED/);
  assertNoSecrets(created);
  const raw = readFileSync(tokenPath(d), 'utf8');
  const art = JSON.parse(raw);
  assert.equal(art.token, ST_TOKEN);
  assert.ok(!('expires_at' in art), `a null-age token must not carry expires_at: ${Object.keys(art)}`);
  assert.doesNotMatch(raw, /NaN|Invalid Date|1970-01-01/);
  assert.ok(!Number.isNaN(Date.parse(art.obtained_at)), 'obtained_at must stay a real instant');

  const old = new Date(Date.now() - 400 * 24 * 3600 * 1000);
  utimesSync(sessionPath(d), old, old);
  const hitsBefore = fx.stHits;
  const reused = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assert.equal(reused.code, 0, `${reused.o}\n${reused.e}`);
  assert.match(reused.o, /SESSION_REUSED/, 'a session of any age is reusable while the token proves');
  assert.equal(fx.stHits - hitsBefore, 2, 'the reuse re-proved the token: one request with and one without it');

  // The server stops accepting the token: the reuse proof fails, the old session is not trusted.
  const sessionText = readFileSync(sessionPath(d), 'utf8');
  fx.stToken = 'rotated-elsewhere-ZSECRET';
  try {
    const rejected = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
    assertHalt('FAILED_TOKEN_REJECTED', rejected);
    assert.equal(readFileSync(sessionPath(d), 'utf8'), sessionText, 'a rejected token overwrote the session');
  } finally {
    fx.stToken = ST_TOKEN;
  }

  // Control: the same aged session under a numeric maxAgeMinutes is expired, so the script logs in again.
  const numeric = await project(staticRole({ maxAgeMinutes: 60 }));
  assert.equal((await login(numeric, { env: { QA_ST_TOKEN: ST_TOKEN } })).code, 0);
  utimesSync(sessionPath(numeric), old, old);
  const again = await login(numeric, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assert.equal(again.code, 0, `${again.o}\n${again.e}`);
  assert.match(again.o, /SESSION_CREATED/, 'an aged session under a numeric maxAgeMinutes must not be reused');
});

test('AC-26: a token that is a JWT with an exp claim keeps that expiry even when maxAgeMinutes is null', MEDIUM, async () => {
  const b64 = (/** @type {string} */ s) => Buffer.from(s).toString('base64url');
  const jwt = `${b64('{"alg":"none"}')}.${b64('{"exp":4102444800}')}.sig`;
  fx.stToken = jwt;
  try {
    const d = await project(staticRole({ maxAgeMinutes: null }));
    const r = await login(d, { env: { QA_ST_TOKEN: jwt } });
    assert.equal(r.code, 0, `${r.o}\n${r.e}`);
    const art = JSON.parse(readFileSync(tokenPath(d), 'utf8'));
    assert.equal(art.expires_at, '2100-01-01T00:00:00.000Z');
  } finally {
    fx.stToken = ST_TOKEN;
  }
});

// ---------------------------------------------------------------------------
// AC-27: a static-token failure names the step that failed
// ---------------------------------------------------------------------------

test('AC-27: a protected endpoint that answers non-2xx with the token halts FAILED_TOKEN_REJECTED naming the status it answered (403 here), never the old code, and prints no token', MEDIUM, async () => {
  const d = await project(staticRole({ probe: { path: '/api/forbidden', method: 'GET' } }));
  const r = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assertHalt('FAILED_TOKEN_REJECTED', r);
  assert.match(r.e, /answered 403/);
  assert.doesNotMatch(r.e, /FAILED_LOGIN_REJECTED/);
  assertNothingSaved(d);
});

test('AC-27: a refused connection to the protected endpoint halts FAILED_TOKEN_TRANSPORT (not a rejection), saves nothing and prints no token', MEDIUM, async () => {
  const port = await closedPort();
  const d = await project(staticRole(), { baseUrl: `http://127.0.0.1:${port}` });
  const r = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assertHalt('FAILED_TOKEN_TRANSPORT', r);
  assert.doesNotMatch(r.e, /FAILED_TOKEN_REJECTED|FAILED_LOGIN_REJECTED/);
  assertNothingSaved(d);
});

test('AC-27: a token proven against the endpoint but declared for a browser location off the target origin halts FAILED_TOKEN_PLACEMENT, saves nothing and prints no token', MEDIUM, async () => {
  fx.stToken = ST_TOKEN;
  const browser = { kind: 'localStorage', originPath: 'https://example.org/app', key: 'tok', database: null, store: null, valueField: null };
  const d = await project(staticRole({}, browser));
  const r = await login(d, { env: { QA_ST_TOKEN: ST_TOKEN } });
  assertHalt('FAILED_TOKEN_PLACEMENT', r);
  assert.doesNotMatch(r.e, /FAILED_LOGIN_REJECTED|FAILED_TOKEN_REJECTED/);
  assertNothingSaved(d);
});

// ---------------------------------------------------------------------------
// AC-24 (script side): the template identity stamp and the stale halt
// ---------------------------------------------------------------------------

const STAMP = /** @type {RegExpExecArray} */ (STAMP_LINE.exec(TEMPLATE))[1];

test('AC-24: the template carries exactly one identity stamp line, above ROLE, and the stale halt sits between the guard site and the secrecy site with no write in that span', () => {
  assert.ok(STAMP !== '', 'the stamp must name an identity');
  assert.equal(TEMPLATE.split(/^const KIT_TEMPLATE_ID = /m).length - 1, 1, 'exactly one line starts the stamp');
  assert.ok(TEMPLATE.indexOf('const KIT_TEMPLATE_ID = ') < TEMPLATE.indexOf("const ROLE = '__RELAY_ROLE__';"), 'the stamp sits above ROLE');
  assert.ok(!STAMP.includes('__RELAY_ROLE__'), 'the stamp survives the single role substitution unchanged');
  assert.equal(TEMPLATE.replaceAll('__RELAY_ROLE__', 'dev').match(STAMP_LINE)?.[1], STAMP, 'the generated script carries the same stamp as the template');
  const guard = TEMPLATE.indexOf('// GUARD-SITE');
  const secrecy = TEMPLATE.indexOf('// SECRECY-SITE');
  const stale = TEMPLATE.lastIndexOf('FAILED_KIT_SCRIPT_STALE');
  assert.ok(guard > 0 && guard < stale && stale < secrecy, 'the stale halt must come after the guard and before the secrecy step');
  const span = TEMPLATE.slice(guard, secrecy);
  assert.ok(!span.includes('writeFileSync(') && !span.includes('writeSecret(') && !span.includes('mkdirSync('), 'the stale check writes nothing');
});

/** @param {{ template?: string }} o @returns {string} a fake plugin root holding the real guard */
function fakePlugin(o) {
  const p = mkdtempSync(join(tmpdir(), 'relay-hardening-plugin-'));
  temps.push(p);
  mkdirSync(join(p, 'scripts'), { recursive: true });
  copyFileSync(join(PLUGIN, 'scripts', 'auth-local-guard.mjs'), join(p, 'scripts', 'auth-local-guard.mjs'));
  if (o.template !== undefined) {
    mkdirSync(join(p, 'resources'), { recursive: true });
    writeFileSync(join(p, 'resources', 'auth-login.template.mjs'), o.template);
  }
  return p;
}

test('AC-24: a script generated from a differently stamped template halts FAILED_KIT_SCRIPT_STALE naming both identities, saves and reuses nothing, and touches nothing before the secrecy step (control: the matching stamp is not stale)', QUICK, async () => {
  fx.requests = [];
  const older = `${STAMP}-older`;
  const staleTemplate = TEMPLATE.replace(STAMP_LINE, (line) => line.replace(STAMP, older));
  assert.notEqual(staleTemplate, TEMPLATE);
  const d = await project(apiRole({ credentials: NO_CREDS }), { template: staleTemplate, session: SESSION_STATE });
  const sessionText = readFileSync(sessionPath(d), 'utf8');
  const r = await login(d);
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, new RegExp(`FAILED_KIT_SCRIPT_STALE: this script was generated from template ${older} but the installed template is ${STAMP}\\b`));
  assert.match(r.e, /--refresh/);
  assert.doesNotMatch(r.o, /SESSION_REUSED|SESSION_CREATED/);
  assert.ok(!existsSync(join(d, 'PRPs', 'auth', '.gitignore')), 'the secrecy step ran before the stale halt');
  assert.equal(readFileSync(sessionPath(d), 'utf8'), sessionText, 'the session was touched');
  assert.ok(!existsSync(tokenPath(d)) && !existsSync(credentialsPath(d)));
  assert.deepEqual(fx.requests, [], 'the application was contacted');

  const fresh = await project(apiRole({ credentials: NO_CREDS }), { template: staleTemplate });
  await login(fresh);
  assert.ok(!existsSync(join(fresh, 'PRPs', 'auth', '.sessions')), 'a stale halt must not create the sessions directory');

  const control = await project(apiRole({ credentials: NO_CREDS }));
  const c = await login(control);
  assert.doesNotMatch(c.e, /FAILED_KIT_SCRIPT_STALE/);
  assert.match(c.e, /FAILED_CREDENTIALS_UNAVAILABLE/, 'a matching stamp proceeds past the stale check');
});

test('AC-24: the stale check runs before the secrecy step: against a plugin root whose installed template is stamped differently and which has no secrecy script, the halt is FAILED_KIT_SCRIPT_STALE, not FAILED_IGNORE_UNPROVEN', QUICK, async () => {
  const newer = TEMPLATE.replace(STAMP_LINE, (line) => line.replace(STAMP, `${STAMP}-newer`));
  const plugin = fakePlugin({ template: newer });
  const d = await project(apiRole({ credentials: NO_CREDS }));
  const r = await login(d, { pluginRoot: plugin });
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, new RegExp(`FAILED_KIT_SCRIPT_STALE: this script was generated from template ${STAMP} but the installed template is ${STAMP}-newer`));
  assert.doesNotMatch(r.e, /FAILED_IGNORE_UNPROVEN/);
  assert.ok(!existsSync(join(d, 'PRPs', 'auth', '.gitignore')));
});

test('AC-24: an installed template that carries no stamp (or an identical one) skips the check, so the run stops at the absent secrecy script instead (fails open)', QUICK, async () => {
  for (const [label, text] of /** @type {[string, string][]} */ ([
    ['no stamp line', '// an installed template that carries no identity stamp\n'],
    ['the identical stamp', TEMPLATE],
  ])) {
    const plugin = fakePlugin({ template: text });
    const d = await project(apiRole({ credentials: NO_CREDS }));
    const r = await login(d, { pluginRoot: plugin });
    assert.equal(r.code, 1, `${label}: ${r.o}\n${r.e}`);
    assert.doesNotMatch(r.e, /FAILED_KIT_SCRIPT_STALE/, label);
    assert.match(r.e, /FAILED_IGNORE_UNPROVEN/, label);
  }
});
