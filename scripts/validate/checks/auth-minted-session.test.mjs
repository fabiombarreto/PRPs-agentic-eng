// @ts-check
// PRPs/prds/test-auth-minted-session.prd.md AC-1 A confirmed minted role mints, proves, saves and reuses a session with no terminal and no login request
// PRPs/prds/test-auth-minted-session.prd.md AC-2 Only a mint block whose status is exactly "confirmed" runs; a missing command halts by name
// PRPs/prds/test-auth-minted-session.prd.md AC-3 The baseUrl, URL-bearing arguments and the store pass the local-only guard before the command runs
// PRPs/prds/test-auth-minted-session.prd.md AC-4 The command is bounded (timeout, stdout bound), its stderr is never echoed
// PRPs/prds/test-auth-minted-session.prd.md AC-5 The output contract is enforced and no halt line carries a value
// PRPs/prds/test-auth-minted-session.prd.md AC-6 Values land on the baseUrl origin; the saved storage-state is authenticated in a fresh browser context
// PRPs/prds/test-auth-minted-session.prd.md AC-7 A minted session is proven before it is saved; a failed proof saves nothing
// PRPs/prds/test-auth-minted-session.prd.md AC-8 An unexpired proven session is reused; an expired or invalidated one is re-minted with no human action
// PRPs/prds/test-auth-minted-session.prd.md AC-12 (halt half) A script from the auth-login/1 template halts FAILED_KIT_SCRIPT_STALE
// PRPs/prds/test-auth-minted-session.prd.md AC-13 The code-review loop files and capture.mjs are byte-identical to their pre-feature content
/**
 * End-to-end tests for the `minted` mechanism of
 * plugins/relay/resources/auth-login.template.mjs (phase 1 of test-auth-minted-session).
 *
 * Source PRD:  PRPs/prds/test-auth-minted-session.prd.md (AC-1 .. AC-8, AC-12 halt half, AC-13)
 * Source plan: PRPs/plans/completed/test-auth-minted-session-phase-1-minted-mechanism.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every scenario copies
 * the REAL template into a temp git project (the single `__RELAY_ROLE__` substitution a
 * generated script gets) and runs it as an ASYNC child process with no terminal and no
 * credential in the environment, against one in-process loopback application and a fake
 * mint command written next to the project. A synchronous child spawn beside that server
 * would block this process's event loop, so none is used.
 *
 * Every run's stdout and stderr are scanned for each fixture secret (cookie, localStorage
 * value, token, the mint command's stderr line): no halt or status line may carry a value.
 *
 * Timing: the three browser-probe timing literals and the mint timeout of the template COPY
 * are shortened by anchored replacement (each anchor must occur exactly once); the shipped
 * values are untouched.
 *
 * Real Chromium + Playwright (resolved through plugins/relay/scripts/visual/package.json)
 * are used; there are no skip conditions.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PLUGIN = join(REPO, 'plugins', 'relay');
const TEMPLATE = readFileSync(join(PLUGIN, 'resources', 'auth-login.template.mjs'), 'utf8').replace(/\r\n/g, '\n');
const STAMP_LINE = /^const KIT_TEMPLATE_ID = '([^']+)';$/m;

const SESSIONS = 'PRPs/auth/.sessions';
const SESSION_REL = `${SESSIONS}/admin.json`;

// Distinctive fixture secrets: the leak scan has fixed needles.
const COOKIE_NAME = 'sid';
const COOKIE_VALUE = 'MINT-COOKIE-7f3a91';
const LS_KEY = 'app_state';
const LS_VALUE = 'MINT-LS-5c20bd';
const TOKEN_VALUE = 'MINT-TOKEN-e41d08';
const STDERR_LINE = 'MINT-STDERR-LINE-b83c52';

// ---------------------------------------------------------------------------
// The fake mint command (a plain node script written into a temp dir)
// ---------------------------------------------------------------------------

const FAKE_MINT_SOURCE = `import { appendFileSync } from 'node:fs';
import { get } from 'node:http';
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt; };
const mode = opt('--mode', 'ok');
const countFile = opt('--count-file', null);
const ttl = Number(opt('--ttl', '3600'));
const restoreUrl = opt('--restore-url', null);
if (countFile) appendFileSync(countFile, 'run\\n');
if (restoreUrl) {
  await new Promise((done) => {
    const req = get(restoreUrl + '/__restore', (res) => { res.resume(); res.on('end', () => done()); });
    req.on('error', () => done());
  });
}
const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const expSec = Math.floor(Date.now() / 1000) + ttl;
const jwt = () => b({ alg: 'none' }) + '.' + b({ exp: expSec, jti: ${JSON.stringify(TOKEN_VALUE)} }) + '.sig';
const okBody = () => ({
  cookies: { ${COOKIE_NAME}: ${JSON.stringify(COOKIE_VALUE)} },
  localStorage: { ${LS_KEY}: ${JSON.stringify(LS_VALUE)} },
  token: jwt(),
  expires_at: new Date(expSec * 1000).toISOString(),
});
switch (mode) {
  case 'ok': process.stdout.write(JSON.stringify(okBody())); break;
  case 'token-only': process.stdout.write(JSON.stringify({ token: jwt() })); break;
  case 'ls-only': process.stdout.write(JSON.stringify({ localStorage: { ${LS_KEY}: ${JSON.stringify(LS_VALUE)} } })); break;
  case 'unknown-key': process.stdout.write(JSON.stringify({ ...okBody(), extra: 'x' })); break;
  case 'bad-cookie-type': process.stdout.write(JSON.stringify({ cookies: { ${COOKIE_NAME}: 7 } })); break;
  case 'empty-object': process.stdout.write('{}'); break;
  case 'not-json': process.stdout.write('not json'); break;
  case 'oversized': process.stdout.write(JSON.stringify('x'.repeat(70000))); break;
  case 'exit3': process.stderr.write(${JSON.stringify(`${STDERR_LINE}\n`)}); process.exit(3); break;
  case 'past-expiry': process.stdout.write(JSON.stringify({ ...okBody(), expires_at: new Date(Date.now() - 3600 * 1000).toISOString() })); break;
  case 'hang': setTimeout(() => {}, 600000); break;
  default: process.exit(4);
}
`;

// ---------------------------------------------------------------------------
// The loopback application: authenticates from the minted cookie + localStorage
// ---------------------------------------------------------------------------

const fx = { revoked: false, loginRequests: 0, sessionNeedsCookie: true };

const PAGE = `<!doctype html><html><body><div id="loading">loading</div><script>
fetch('/api/session').then(function (r) {
  if (r.ok && localStorage.getItem(${JSON.stringify(LS_KEY)}) === ${JSON.stringify(LS_VALUE)}) {
    document.body.innerHTML = '<div id="authed">in</div><span id="who">admin</span>';
  }
});
</script></body></html>`;

/** @param {string} bearer */
function jwtCarriesToken(bearer) {
  const parts = bearer.split('.');
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).jti === TOKEN_VALUE;
  } catch {
    return false;
  }
}

/** @type {import('node:http').Server} */
let server;
let origin = '';
let port = 0;
let fakeMint = '';
/** @type {string[]} */
const temps = [];

before(async () => {
  server = createServer((req, res) => {
    const url = String(req.url);
    if (url.includes('login')) {
      fx.loginRequests++;
      res.writeHead(404);
      res.end();
      return;
    }
    if (url === '/__revoke') {
      fx.revoked = true;
      res.writeHead(200);
      res.end('ok');
      return;
    }
    if (url === '/__restore') {
      fx.revoked = false;
      res.writeHead(200);
      res.end('ok');
      return;
    }
    const cookie = String(req.headers.cookie || '');
    if (url === '/api/session') {
      const ok = !fx.revoked && (!fx.sessionNeedsCookie || cookie.includes(`${COOKIE_NAME}=${COOKIE_VALUE}`));
      res.writeHead(ok ? 200 : 401);
      res.end(ok ? 'ok' : 'no');
      return;
    }
    if (url === '/api/me') {
      const auth = String(req.headers.authorization || '');
      const ok = !fx.revoked && auth.startsWith('Bearer ') && jwtCarriesToken(auth.slice(7));
      res.writeHead(ok ? 200 : 401);
      res.end(ok ? 'ok' : 'no');
      return;
    }
    if (url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(PAGE);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {any} */ (server.address()).port;
  origin = `http://127.0.0.1:${port}`;
  const d = mkdtempSync(join(tmpdir(), 'relay-minted-cmd-'));
  temps.push(d);
  fakeMint = join(d, 'fake-mint.mjs');
  writeFileSync(fakeMint, FAKE_MINT_SOURCE);
});

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

/** @param {string} t */
const shortTimings = (t) =>
  mutate(
    [
      ['const BROWSER_PROBE_POSITIVE_MS = 15000;', 'const BROWSER_PROBE_POSITIVE_MS = 4000;'],
      ['const BROWSER_PROBE_SETTLE_MS = 5000;', 'const BROWSER_PROBE_SETTLE_MS = 1500;'],
      ['const BROWSER_PROBE_DWELL_MS = 5000;', 'const BROWSER_PROBE_DWELL_MS = 1500;'],
    ],
    t,
  );

/**
 * A temp git project holding the login script for role `admin` and the config.
 * @param {{ mode?: string, ttl?: number, restore?: boolean, extra?: string[], mint?: Record<string, any>, role?: Record<string, any>, template?: (t: string) => string }} [o]
 */
async function project(o = {}) {
  const root = mkdtempSync(join(tmpdir(), 'relay-minted-'));
  temps.push(root);
  await execFileP('git', ['init', '-q', root]);
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const countFile = join(root, 'count.txt');
  const cmd = [process.execPath, fakeMint, '--mode', o.mode ?? 'ok', '--count-file', countFile];
  if (o.ttl !== undefined) cmd.push('--ttl', String(o.ttl));
  if (o.restore) cmd.push('--restore-url', origin);
  if (o.extra) cmd.push(...o.extra);
  const role = {
    mechanism: 'minted',
    loginPath: null,
    form: null,
    api: null,
    probe: { path: '/api/me', method: 'GET' },
    sessionCookie: 'sid',
    maxAgeMinutes: 60,
    credentials: { usernameEnv: null, passwordEnv: null },
    userCreation: { command: null },
    mint: { command: cmd, store: `127.0.0.1:${port}`, status: 'confirmed', ...(o.mint ?? {}) },
    ...(o.role ?? {}),
  };
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: origin, roles: { admin: role } }));
  const body = (o.template ? o.template(TEMPLATE) : TEMPLATE).replaceAll('__RELAY_ROLE__', 'admin');
  const script = join(root, 'PRPs', 'auth', 'login-admin.mjs');
  writeFileSync(script, body);
  return { root, script, countFile };
}

/**
 * Runs the project's login script as an async child (no terminal, no credential),
 * then asserts no fixture secret appears in its output.
 * @param {{ root: string, script: string }} p
 * @returns {Promise<{ code: number | null, o: string, e: string, all: string }>}
 */
function login(p) {
  /** @type {Record<string, string | undefined>} */ const env = { ...process.env };
  delete env.CLAUDE_PLUGIN_ROOT;
  return new Promise((res, rej) => {
    const c = spawn(process.execPath, [p.script, '--plugin-root', PLUGIN, '--root', p.root], { env, cwd: p.root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let o = '';
    let e = '';
    c.stdout.on('data', (b) => (o += b));
    c.stderr.on('data', (b) => (e += b));
    const timer = setTimeout(() => c.kill(), 120000);
    c.on('error', rej);
    c.on('close', (code) => {
      clearTimeout(timer);
      const needles = [COOKIE_VALUE, LS_VALUE, TOKEN_VALUE, STDERR_LINE];
      const art = join(p.root, SESSIONS, 'admin.token.json');
      if (existsSync(art)) {
        try {
          needles.push(JSON.parse(readFileSync(art, 'utf8')).token);
        } catch {
          /* unreadable artifact: nothing to add */
        }
      }
      for (const n of needles) {
        if (o.includes(n) || e.includes(n)) return rej(new Error('a secret value appeared in the script output'));
      }
      res({ code, o, e, all: `${o}${e}` });
    });
  });
}

/** @param {{ countFile: string }} p */
const runs = (p) => (existsSync(p.countFile) ? readFileSync(p.countFile, 'utf8').split('\n').filter(Boolean).length : 0);
/** @param {{ root: string }} p @param {string} name */
const sessionFile = (p, name) => join(p.root, SESSIONS, name);
/** @param {{ root: string }} p */
const sessionFiles = (p) => (existsSync(join(p.root, SESSIONS)) ? readdirSync(join(p.root, SESSIONS)) : []);

function resetFixture() {
  fx.revoked = false;
  fx.loginRequests = 0;
  fx.sessionNeedsCookie = true;
}

const PW_REQUIRE = createRequire(join(PLUGIN, 'scripts', 'visual', 'package.json'));

// ---------------------------------------------------------------------------
// AC-1 / AC-6 / AC-8 (reuse): mint, place, prove, save, reuse
// ---------------------------------------------------------------------------

test('a confirmed minted role mints, places, saves and reuses a session with no terminal and no login request', async () => {
  resetFixture();
  const p = await project();
  const r1 = await login(p);
  assert.equal(r1.code, 0, r1.all);
  assert.match(r1.o, new RegExp(`SESSION_MINTED: ${SESSION_REL}`));
  assert.match(r1.o, new RegExp(`auth_mode: storage-state:${SESSION_REL}`));
  assert.equal(runs(p), 1);
  assert.equal(fx.loginRequests, 0, 'no login request is sent');

  // AC-6: cookies on the baseUrl origin with path /, localStorage on that origin
  const st = JSON.parse(readFileSync(sessionFile(p, 'admin.json'), 'utf8'));
  const cookie = st.cookies.find((/** @type {any} */ c) => c.name === 'sid');
  assert.ok(cookie, 'the minted cookie is in the saved state');
  assert.equal(cookie.domain, '127.0.0.1');
  assert.equal(cookie.path, '/');
  const org = st.origins.find((/** @type {any} */ x) => x.origin === origin);
  assert.ok(org, 'an origin entry exists for the baseUrl origin');
  assert.ok(org.localStorage.some((/** @type {any} */ e) => e.name === LS_KEY));

  // AC-6: the token artifact carries the default header and prefix, and an expiry
  const art = JSON.parse(readFileSync(sessionFile(p, 'admin.token.json'), 'utf8'));
  assert.equal(art.header, 'Authorization');
  assert.equal(art.value_prefix, 'Bearer ');
  assert.equal(typeof art.expires_at, 'string');
  assert.ok(Number.isFinite(Date.parse(art.expires_at)));
  assert.ok(art.token.includes('.'));

  // the expiry sidecar is value-free; no .tmp leftovers
  const side = readFileSync(sessionFile(p, 'admin.mint.json'), 'utf8');
  for (const n of [COOKIE_VALUE, LS_VALUE, TOKEN_VALUE, art.token]) assert.ok(!side.includes(n), 'the sidecar carries no value');
  assert.ok(sessionFiles(p).every((f) => !f.endsWith('.tmp')), `no .tmp leftover: ${sessionFiles(p).join(',')}`);

  // AC-6: loaded into a fresh browser context the saved state is authenticated; a bare context is not
  const pw = PW_REQUIRE('playwright');
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const authed = await browser.newContext({ storageState: sessionFile(p, 'admin.json') });
    const page = await authed.newPage();
    await page.goto(origin);
    await page.locator('#authed').waitFor({ state: 'visible', timeout: 10000 });
    const bare = await browser.newContext();
    const page2 = await bare.newPage();
    await page2.goto(origin);
    await page2.waitForTimeout(2500);
    assert.equal(await page2.locator('#authed').isVisible(), false, 'a context with no state is not authenticated');
  } finally {
    await browser.close();
  }

  // AC-8: an unexpired, proven session is reused and the command is not run again
  const r2 = await login(p);
  assert.equal(r2.code, 0, r2.all);
  assert.match(r2.o, /SESSION_REUSED/);
  assert.equal(runs(p), 1, 'the command did not run again');
});

test('a token-only output mints a token artifact and a state with no cookies', async () => {
  resetFixture();
  const p = await project({ mode: 'token-only', role: { sessionCookie: null } });
  const r = await login(p);
  assert.equal(r.code, 0, r.all);
  assert.match(r.o, /SESSION_MINTED/);
  assert.ok(existsSync(sessionFile(p, 'admin.token.json')));
  assert.deepEqual(JSON.parse(readFileSync(sessionFile(p, 'admin.json'), 'utf8')).cookies, []);
});

test('a localStorage-only output proven by the browser probe mints with no token artifact', async () => {
  resetFixture();
  fx.sessionNeedsCookie = false;
  try {
    const p = await project({
      mode: 'ls-only',
      role: { sessionCookie: null, probe: null, browserProbe: { route: '/', marker: { kind: 'selector', value: '#authed' }, roleMarker: null } },
      template: shortTimings,
    });
    const r = await login(p);
    assert.equal(r.code, 0, r.all);
    assert.match(r.o, /SESSION_MINTED/);
    assert.equal(existsSync(sessionFile(p, 'admin.token.json')), false, 'no token artifact without a token');
  } finally {
    fx.sessionNeedsCookie = true;
  }
});

// ---------------------------------------------------------------------------
// AC-2: the trust gate
// ---------------------------------------------------------------------------

test('only a mint block whose status is exactly "confirmed" runs the command', async () => {
  resetFixture();
  for (const [label, mint] of /** @type {[string, Record<string, any>][]} */ ([
    ['proposed', { status: 'proposed' }],
    ['wrong case', { status: 'Confirmed' }],
    ['absent', { status: undefined }],
  ])) {
    const p = await project({ mint });
    const r = await login(p);
    assert.equal(r.code, 1, `${label}: ${r.all}`);
    assert.match(r.all, /FAILED_MINT_UNCONFIRMED/, label);
    assert.ok(r.all.includes('admin') && r.all.includes('PRPs/auth/login.config.json'), `${label}: the halt names the role and the config`);
    assert.equal(runs(p), 0, `${label}: the command did not run`);
    assert.equal(sessionFiles(p).length, 0, `${label}: nothing saved`);
  }
  const control = await project();
  const rc = await login(control);
  assert.equal(rc.code, 0, rc.all);
  assert.equal(runs(control), 1);
});

test('a null command halts FAILED_MINT_COMMAND_MISSING and runs nothing', async () => {
  resetFixture();
  const p = await project({ mint: { command: null } });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_MINT_COMMAND_MISSING/);
  assert.equal(runs(p), 0);
});

test('the gate also halts a would-be reuse once the operator flips the block back to proposed', async () => {
  resetFixture();
  const p = await project();
  assert.equal((await login(p)).code, 0);
  const cfgPath = join(p.root, 'PRPs', 'auth', 'login.config.json');
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  cfg.roles.admin.mint.status = 'proposed';
  writeFileSync(cfgPath, JSON.stringify(cfg));
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_MINT_UNCONFIRMED/);
  assert.equal(runs(p), 1, 'the command did not run again');
});

// ---------------------------------------------------------------------------
// AC-12 (halt half): the stamp
// ---------------------------------------------------------------------------

test('the shipped template is stamped auth-login/2 and a script stamped auth-login/1 halts FAILED_KIT_SCRIPT_STALE naming both', async () => {
  assert.equal(STAMP_LINE.exec(TEMPLATE)?.[1], 'auth-login/2');
  resetFixture();
  const p = await project({ template: (t) => mutate([["const KIT_TEMPLATE_ID = 'auth-login/2';", "const KIT_TEMPLATE_ID = 'auth-login/1';"]], t) });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_KIT_SCRIPT_STALE/);
  assert.ok(r.all.includes('auth-login/1') && r.all.includes('auth-login/2'), 'the halt names both identities');
  assert.equal(existsSync(join(p.root, SESSIONS)), false, 'no .sessions directory was created');
  assert.equal(runs(p), 0);
});

// ---------------------------------------------------------------------------
// AC-3: minting stays local
// ---------------------------------------------------------------------------

test('a non-local or unevaluable store, or a non-local URL argument, halts FAILED_NON_LOCAL_TARGET and runs nothing', async () => {
  resetFixture();
  for (const [label, o] of /** @type {[string, any][]} */ ([
    ['remote host store', { mint: { store: 'prod.example.com' } }],
    ['remote URL store', { mint: { store: 'https://evil.example/db' } }],
    ['unevaluable store', { mint: { store: 'not a store' } }],
    ['missing store', { mint: { store: undefined } }],
    ['remote URL argument', { extra: ['--url=https://evil.example/x'] }],
  ])) {
    const p = await project(o);
    const r = await login(p);
    assert.equal(r.code, 1, `${label}: ${r.all}`);
    assert.match(r.all, /FAILED_NON_LOCAL_TARGET/, label);
    assert.ok(!r.all.includes('evil.example/x'), `${label}: the URL is not echoed`);
    assert.equal(runs(p), 0, `${label}: the command did not run`);
    assert.equal(sessionFiles(p).length, 0, `${label}: nothing saved`);
  }
  const ok = await project({ extra: [`--url=${origin}/x`] });
  const r = await login(ok);
  assert.equal(r.code, 0, `a loopback URL argument is allowed: ${r.all}`);
  assert.equal(runs(ok), 1);
});

// ---------------------------------------------------------------------------
// AC-4: bounded and silent
// ---------------------------------------------------------------------------

test('a non-zero exit halts FAILED_MINT_COMMAND naming the status and never echoing stderr', async () => {
  resetFixture();
  const p = await project({ mode: 'exit3' });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_MINT_COMMAND/);
  assert.ok(r.all.includes('status 3'));
  assert.ok(!r.all.includes(STDERR_LINE));
  assert.equal(existsSync(sessionFile(p, 'admin.json')), false);
});

test('output over 65536 bytes halts FAILED_MINT_COMMAND naming the bound', async () => {
  resetFixture();
  const p = await project({ mode: 'oversized' });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_MINT_COMMAND/);
  assert.ok(r.all.includes('65536'));
  assert.equal(existsSync(sessionFile(p, 'admin.json')), false);
});

test('a command that cannot be run halts FAILED_MINT_COMMAND', async () => {
  resetFixture();
  const p = await project({ mint: { command: ['definitely-not-a-binary-xyz'] } });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_MINT_COMMAND/);
  assert.equal(existsSync(sessionFile(p, 'admin.json')), false);
});

test('a command that outlives the timeout is killed and halts FAILED_MINT_COMMAND (timeout shortened in the copy)', async () => {
  resetFixture();
  const p = await project({
    mode: 'hang',
    template: (t) => mutate([['const MINT_TIMEOUT_MS = 120000;', 'const MINT_TIMEOUT_MS = 1500;']], t),
  });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_MINT_COMMAND/);
  assert.equal(runs(p), 1);
  assert.equal(existsSync(sessionFile(p, 'admin.json')), false);
});

// ---------------------------------------------------------------------------
// AC-5: the output contract
// ---------------------------------------------------------------------------

test('every output shape outside the contract halts FAILED_MINT_OUTPUT, saves nothing and leaks no value', async () => {
  resetFixture();
  for (const [mode, key] of /** @type {[string, string | null][]} */ ([
    ['unknown-key', 'extra'],
    ['bad-cookie-type', null],
    ['empty-object', null],
    ['not-json', null],
    ['past-expiry', null],
  ])) {
    const p = await project({ mode });
    const r = await login(p);
    assert.equal(r.code, 1, `${mode}: ${r.all}`);
    assert.match(r.all, /FAILED_MINT_OUTPUT/, mode);
    if (key !== null) assert.ok(r.all.includes(key), `${mode}: the halt names the offending key`);
    assert.deepEqual(sessionFiles(p), [], `${mode}: no session file written`);
  }
});

// ---------------------------------------------------------------------------
// AC-8: expiry and invalidation re-mint by themselves
// ---------------------------------------------------------------------------

/**
 * Mint once, mutate the saved state, run again: a new SESSION_MINTED, exactly one more command run, no prompt.
 * @param {string} label
 * @param {(p: { root: string, countFile: string }) => Promise<void> | void} mutateState
 * @param {{ restore?: boolean, ttl?: number }} [opt]
 */
async function remintCase(label, mutateState, opt = {}) {
  resetFixture();
  const p = await project({ restore: opt.restore, ttl: opt.ttl });
  const first = await login(p);
  assert.equal(first.code, 0, `${label}: ${first.all}`);
  assert.match(first.o, /SESSION_MINTED/, label);
  assert.equal(runs(p), 1, `${label}: first run count`);
  await mutateState(p);
  const again = await login(p);
  assert.equal(again.code, 0, `${label}: ${again.all}`);
  assert.match(again.o, /SESSION_MINTED/, `${label}: expected a new mint`);
  assert.equal(runs(p), 2, `${label}: the command ran exactly once more`);
  assert.ok(!again.all.includes('FAILED_INTERACTIVE_LOGIN_REQUIRED') && !/Complete the login|Username for role|Password for role/.test(again.all), `${label}: no prompt`);
  resetFixture();
}

test('a sidecar expiry in the past re-mints with no human action', async () => {
  await remintCase('sidecar expiry', (p) => {
    writeFileSync(sessionFile(p, 'admin.mint.json'), JSON.stringify({ minted_at: new Date().toISOString(), expires_at: new Date(Date.now() - 3600000).toISOString() }));
  });
});

test('a server-side invalidated session fails its proof and re-mints', async () => {
  await remintCase('revoked', async () => {
    await fetch(`${origin}/__revoke`);
  }, { restore: true });
});

test('a deleted session file re-mints', async () => {
  await remintCase('deleted session', (p) => {
    rmSync(sessionFile(p, 'admin.json'));
  });
});

test('a session older than maxAgeMinutes re-mints', async () => {
  await remintCase('aged session', (p) => {
    const old = new Date(Date.now() - 2 * 3600000);
    utimesSync(sessionFile(p, 'admin.json'), old, old);
  });
});

test('a token whose exp claim is inside the 60 s floor is re-minted on the next run', async () => {
  resetFixture();
  const p = await project({ ttl: 30 });
  const first = await login(p);
  assert.equal(first.code, 0, first.all);
  assert.match(first.o, /SESSION_MINTED/);
  const again = await login(p);
  assert.equal(again.code, 0, again.all);
  assert.match(again.o, /SESSION_MINTED/);
  assert.equal(runs(p), 2);
});

// ---------------------------------------------------------------------------
// AC-7: proof before save
// ---------------------------------------------------------------------------

test('a session that fails its proof right after minting halts FAILED_LOGIN_REJECTED and saves nothing', async () => {
  resetFixture();
  fx.revoked = true;
  try {
    const p = await project();
    const r = await login(p);
    assert.equal(r.code, 1, r.all);
    assert.match(r.all, /FAILED_LOGIN_REJECTED/);
    assert.equal(runs(p), 1, 'the mint ran exactly once');
    for (const f of ['admin.json', 'admin.token.json', 'admin.mint.json']) assert.equal(existsSync(sessionFile(p, f)), false, `${f} was not written`);
  } finally {
    fx.revoked = false;
  }
});

/** @param {string} roleSel */
const browserRole = (roleSel) => ({
  sessionCookie: 'sid',
  probe: null,
  browserProbe: { route: '/', marker: { kind: 'selector', value: '#authed' }, roleMarker: { kind: 'selector', value: roleSel } },
});

test('a minted session proven by the browser probe (marker and role marker) is saved', async () => {
  resetFixture();
  const p = await project({ role: browserRole('#who'), template: shortTimings });
  const r = await login(p);
  assert.equal(r.code, 0, r.all);
  assert.match(r.o, /SESSION_MINTED/);
  assert.ok(existsSync(sessionFile(p, 'admin.json')));
});

test('a minted session whose role marker is absent halts FAILED_PROBE_WRONG_ACCOUNT and saves nothing', async () => {
  resetFixture();
  const p = await project({ role: browserRole('#nobody'), template: shortTimings });
  const r = await login(p);
  assert.equal(r.code, 1, r.all);
  assert.match(r.all, /FAILED_PROBE_WRONG_ACCOUNT/);
  assert.equal(existsSync(sessionFile(p, 'admin.json')), false);
});

// ---------------------------------------------------------------------------
// AC-13: the review loop does not know the minted mechanism
// ---------------------------------------------------------------------------

test('the code-review loop files and capture.mjs are byte-identical to their pre-feature content', () => {
  // sha256 of each file at base tree 09926778dc0a8295d77ae72b47c1968f5d30d96d, CRLF normalized to LF.
  /** @type {[string[], string][]} */
  const pinned = [
    [['agents', 'code-reviewer.md'], '0a16ae2314431898c7faba74d69bbc5c2ab09e765229b96534d3bd6f9c9ea669'],
    [['agents', 'code-reviewer-semantic.md'], 'd6a60f551d18c206be16c7cc944b533c2d5cbf50d4a040e02083faed4b528b1e'],
    [['commands', 'relay-implement.md'], '2cd7ccd70884a45ce97db4c826fe634ec5019c7a4f2b345710653d1836cac4be'],
    [['scripts', 'visual', 'capture.mjs'], 'de9298b556df7789ede97233162ee9eec18d77e3c4e8eb63b7a4b063f274c178'],
  ];
  for (const [rel, sha] of pinned) {
    const text = readFileSync(join(PLUGIN, ...rel), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(createHash('sha256').update(text).digest('hex'), sha, `${rel.join('/')} must be byte-identical to its pre-feature content`);
  }
});
