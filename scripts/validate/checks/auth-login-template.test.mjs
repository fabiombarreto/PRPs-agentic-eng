// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-11 Idempotent reuse; expiry triggers re-login
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-1 (phase-3 slice) local-only hard failure
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-6 (phase-3 slice) no credential value reaches output
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-10 (PARTIAL) a produced storage-state file is accepted by Playwright
/**
 * Behavior tests for plugins/relay/resources/auth-login.template.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-3-login-scripts.plan.md
 *
 * Authored test-after by the test pair. Each test copies the real template
 * with the single documented substitution (__RELAY_ROLE__ -> role slug) into a
 * throwaway git repo and runs it as a subprocess, against a real HTTP server
 * bound to 127.0.0.1 where a session is involved. Refusal and reuse tests are
 * paired with a control that differs in exactly the pinned factor, so a script
 * that always refuses or always reuses fails a test.
 *
 * What is NOT covered here (honestly): the `form` mechanism (needs a launched
 * Chromium), the `headed` login itself (needs a real browser and a TTY), and
 * AC-10's real authenticated capture.mjs render. Those remain for the phase-5
 * dogfood. The `api` mechanism, reuse, expiry and probe behavior are real.
 *
 * Run: node --test scripts/validate/checks/auth-login-template.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, utimesSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const TEMPLATE_PATH = resolve('plugins/relay/resources/auth-login.template.mjs');
const PLUGIN_ROOT = resolve('plugins/relay');
const TEMPLATE = readFileSync(TEMPLATE_PATH, 'utf8').replace(/\r\n/g, '\n');
const TBD = 'TBD - needs validation';

const USERNAME = 'alice@example.test';
const PASSWORD = 's3cret-PW-value';
const COOKIE_VALUE = 'abc123cookievalue';
const TOKEN_VALUE = 'tok-SECRET-xyz-987';
const SESSION_REL = 'PRPs/auth/.sessions/admin.json';
const TOKEN_REL = 'PRPs/auth/.sessions/admin.token.json';

// os.devNull is `\\.\nul` on Windows, which git cannot open; use a real empty file.
const EMPTY_CONFIG = join(mkdtempSync(join(tmpdir(), 'auth-login-gitcfg-')), 'empty.gitconfig');
writeFileSync(EMPTY_CONFIG, '');

/** @type {NodeJS.ProcessEnv} */
const BASE_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: EMPTY_CONFIG,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CEILING_DIRECTORIES: dirname(tmpdir()),
};
delete BASE_ENV.CLAUDE_PLUGIN_ROOT;
delete BASE_ENV.RELAY_TEST_USER;
delete BASE_ENV.RELAY_TEST_PASS;

/** @returns {any | null} */
function loadPlaywrightHere() {
  try {
    return createRequire(resolve('plugins/relay/scripts/visual/package.json'))('playwright');
  } catch {
    return null;
  }
}
const PW = loadPlaywrightHere();
const NEEDS_PW = PW ? false : 'playwright is not resolvable from plugins/relay/scripts/visual';

// ---------------------------------------------------------------------------
// A real local server: login endpoints, an authenticated probe, redirecting variants
// ---------------------------------------------------------------------------

const stats = { login: 0, probe: 0 };
/** @type {import('node:http').Server} */
let server;
/** @type {import('node:http').Server} */
let other;
let otherPort = 0;
let otherOriginHits = 0;
let baseUrl = '';

/** @param {string} s */
function b64url(s) {
  return Buffer.from(s).toString('base64url');
}

before(async () => {
  server = createServer((req, res) => {
    const cookie = String(req.headers.cookie || '');
    const url = String(req.url);
    if (req.method === 'POST' && (url === '/api/login' || url === '/api/login-jwt')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        stats.login++;
        /** @type {any} */ let j = {};
        try {
          j = JSON.parse(body);
        } catch {
          j = {};
        }
        if (j.email === USERNAME && j.pw === PASSWORD) {
          const token = url === '/api/login-jwt' ? `${b64url('{"alg":"none"}')}.${b64url('{"exp":4102444800}')}.sig` : TOKEN_VALUE;
          res.writeHead(200, {
            'content-type': 'application/json',
            'set-cookie': `sid=${COOKIE_VALUE}; Path=/; HttpOnly`,
          });
          res.end(JSON.stringify({ data: { token } }));
        } else {
          res.writeHead(401);
          res.end('denied');
        }
      });
      return;
    }
    if (req.method === 'POST' && url === '/api/login-redirect') {
      stats.login++;
      res.writeHead(302, { location: '/api/me', 'set-cookie': `sid=${COOKIE_VALUE}; Path=/` });
      res.end();
      return;
    }
    if (url === '/api/me') {
      stats.probe++;
      if (cookie.includes(`sid=${COOKIE_VALUE}`)) {
        res.writeHead(200);
        res.end('ok');
      } else {
        res.writeHead(401);
        res.end('no');
      }
      return;
    }
    if (url === '/api/redirect-probe') {
      stats.probe++;
      res.writeHead(302, { location: '/api/me' });
      res.end();
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', () => done(undefined)));
  const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
  baseUrl = `http://127.0.0.1:${addr.port}`;

  other = createServer((req, res) => {
    otherOriginHits++;
    res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `sid=${COOKIE_VALUE}; Path=/` });
    res.end(JSON.stringify({ data: { token: TOKEN_VALUE } }));
  });
  await new Promise((done) => other.listen(0, '127.0.0.1', () => done(undefined)));
  otherPort = /** @type {import('node:net').AddressInfo} */ (other.address()).port;
});

after(async () => {
  for (const s of [server, other]) {
    s.closeAllConnections();
    await new Promise((done) => s.close(() => done(undefined)));
  }
});

// ---------------------------------------------------------------------------
// Project scaffolding
// ---------------------------------------------------------------------------

/** @param {any} [over] */
function roleConfig(over = {}) {
  return {
    mechanism: 'api',
    loginPath: null,
    form: null,
    api: { path: '/api/login', method: 'POST', usernameField: 'email', passwordField: 'pw', tokenPath: 'data.token' },
    probe: { path: '/api/me', method: 'GET' },
    sessionCookie: 'sid',
    maxAgeMinutes: 60,
    credentials: { usernameEnv: 'RELAY_TEST_USER', passwordEnv: 'RELAY_TEST_PASS' },
    userCreation: { command: null },
    ...over,
  };
}

/**
 * @param {{ role?: string, baseUrl?: string, roleCfg?: any, config?: any, pluginRoot?: string }} [o]
 */
function makeProject(o = {}) {
  const role = o.role ?? 'admin';
  const root = mkdtempSync(join(tmpdir(), 'auth-login-'));
  const g = spawnSync('git', ['-C', root, 'init', '-q'], { encoding: 'utf8', env: BASE_ENV });
  assert.equal(g.status, 0, g.stderr);
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const config = o.config ?? { baseUrl: o.baseUrl ?? baseUrl, roles: { [role]: o.roleCfg ?? roleConfig() } };
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify(config), 'utf8');
  const script = join(root, 'PRPs', 'auth', 'login.mjs');
  writeFileSync(script, TEMPLATE.split('__RELAY_ROLE__').join(role), 'utf8');
  return { root, script, pluginRoot: o.pluginRoot ?? PLUGIN_ROOT };
}

/**
 * @param {{ root: string, script: string, pluginRoot: string }} proj
 * @param {string[]} [extraArgs]
 * @param {{ env?: NodeJS.ProcessEnv, pluginFlag?: boolean }} [opts]
 * @returns {Promise<{ status: number | null, stdout: string, stderr: string }>}
 */
function run(proj, extraArgs = [], opts = {}) {
  const args = [proj.script, ...(opts.pluginFlag === false ? [] : ['--plugin-root', proj.pluginRoot]), '--root', proj.root, ...extraArgs];
  return new Promise((done) => {
    const child = spawn(process.execPath, args, {
      cwd: proj.root,
      env: { ...BASE_ENV, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => done({ status, stdout, stderr }));
  });
}

const CREDS_ENV = { RELAY_TEST_USER: USERNAME, RELAY_TEST_PASS: PASSWORD };

/** @param {string} root @param {string} rel */
function exists(root, rel) {
  return existsSync(join(root, rel));
}

/**
 * Write a pre-made session file (no login performed).
 * @param {{ root: string }} proj
 * @param {{ cookies?: any[], ageMinutes?: number }} [o]
 */
function writeSession(proj, o = {}) {
  const cookies = o.cookies ?? [validCookie()];
  const dir = join(proj.root, 'PRPs', 'auth', '.sessions');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'admin.json');
  writeFileSync(file, JSON.stringify({ cookies, origins: [] }), 'utf8');
  if (o.ageMinutes) {
    const past = new Date(Date.now() - o.ageMinutes * 60000);
    utimesSync(file, past, past);
  }
  return file;
}

/** @param {any} [over] */
function validCookie(over = {}) {
  return {
    name: 'sid',
    value: COOKIE_VALUE,
    domain: '127.0.0.1',
    path: '/',
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    ...over,
  };
}

/** @param {{ stdout: string, stderr: string }} r */
function assertNoSecrets(r) {
  const all = `${r.stdout}\n${r.stderr}`;
  for (const secret of [USERNAME, PASSWORD, COOKIE_VALUE, TOKEN_VALUE]) {
    assert.ok(!all.includes(secret), `output must not contain a secret value (${secret.slice(0, 4)}...)`);
  }
}

// ===========================================================================
// AC-1 (phase-3 slice): the guard is a hard failure that precedes every write
// ===========================================================================

test('a non-local baseUrl halts FAILED_NON_LOCAL_TARGET before the secrecy ensure writes anything; a loopback baseUrl proceeds past the guard', async () => {
  const remote = makeProject({ baseUrl: 'http://evil.example' });
  const r = await run(remote, [], { env: CREDS_ENV });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_NON_LOCAL_TARGET: not-declared \(host: evil\.example\)/);
  assert.equal(exists(remote.root, 'PRPs/auth/.gitignore'), false, 'the secrecy ensure must not have run');
  assert.equal(exists(remote.root, '.sessions'), false);
  assert.equal(exists(remote.root, SESSION_REL), false);

  // Control: loopback target, no credentials -> passes the guard, runs the secrecy ensure, halts later.
  const local = makeProject();
  const c = await run(local);
  assert.equal(c.status, 1);
  assert.match(c.stderr, /FAILED_CREDENTIALS_UNAVAILABLE/);
  assert.doesNotMatch(c.stderr, /FAILED_NON_LOCAL_TARGET/);
  assert.equal(exists(local.root, 'PRPs/auth/.gitignore'), true, 'the secrecy ensure runs after the guard passes');
});

test('a baseUrl carrying userinfo that names a local host is still refused', async () => {
  const proj = makeProject({ baseUrl: 'http://localhost@evil.example' });
  const r = await run(proj, [], { env: CREDS_ENV });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_NON_LOCAL_TARGET: userinfo/);
  assert.equal(exists(proj.root, 'PRPs/auth/.gitignore'), false);
});

test('a missing guard module halts FAILED_GUARD_UNAVAILABLE (fail closed) and nothing is written; a guard lacking an export does the same', async () => {
  const emptyPlugin = mkdtempSync(join(tmpdir(), 'auth-login-noplugin-'));
  const missing = makeProject({ pluginRoot: emptyPlugin });
  const r = await run(missing, [], { env: CREDS_ENV });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_GUARD_UNAVAILABLE/);
  assert.equal(exists(missing.root, 'PRPs/auth/.gitignore'), false);

  const partialPlugin = mkdtempSync(join(tmpdir(), 'auth-login-partial-'));
  mkdirSync(join(partialPlugin, 'scripts'), { recursive: true });
  writeFileSync(
    join(partialPlugin, 'scripts', 'auth-local-guard.mjs'),
    'export async function checkTarget() { return { ok: true, allowedHosts: new Set() }; }\n',
  );
  const partial = makeProject({ pluginRoot: partialPlugin });
  const p = await run(partial, [], { env: CREDS_ENV });
  assert.equal(p.status, 1);
  assert.match(p.stderr, /FAILED_GUARD_UNAVAILABLE/);

  // Control: a guard that exports both functions is loaded; the run then stops at the
  // (absent) secrecy script in that plugin root instead.
  const fullPlugin = mkdtempSync(join(tmpdir(), 'auth-login-full-'));
  mkdirSync(join(fullPlugin, 'scripts'), { recursive: true });
  writeFileSync(
    join(fullPlugin, 'scripts', 'auth-local-guard.mjs'),
    'export async function checkTarget() { return { ok: true, allowedHosts: new Set() }; }\nexport function isAllowedHost() { return true; }\n',
  );
  const full = makeProject({ pluginRoot: fullPlugin });
  const f = await run(full, [], { env: CREDS_ENV });
  assert.equal(f.status, 1);
  assert.match(f.stderr, /FAILED_IGNORE_UNPROVEN/);
  assert.doesNotMatch(f.stderr, /FAILED_GUARD_UNAVAILABLE/);
});

// ===========================================================================
// Argument handling
// ===========================================================================

test('without --plugin-root or CLAUDE_PLUGIN_ROOT the script exits 2 and writes nothing; the environment variable is an accepted alternative', async () => {
  const proj = makeProject();
  const r = await run(proj, [], { pluginFlag: false });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Usage:/);
  assert.equal(exists(proj.root, 'PRPs/auth/.gitignore'), false);

  const viaEnv = await run(proj, [], { pluginFlag: false, env: { CLAUDE_PLUGIN_ROOT: PLUGIN_ROOT } });
  assert.equal(viaEnv.status, 1);
  assert.match(viaEnv.stderr, /FAILED_CREDENTIALS_UNAVAILABLE/);
});

test('an unknown argument or a flag missing its value exits 2; --help exits 0 with usage', async () => {
  const proj = makeProject();
  assert.equal((await run(proj, ['--bogus'])).status, 2);
  assert.equal((await run(proj, ['--local-host', 'evil.example'])).status, 2);
  const noValue = await new Promise((done) => {
    const c = spawn(process.execPath, [proj.script, '--plugin-root'], { cwd: proj.root, env: BASE_ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    c.on('close', (s) => done(s));
  });
  assert.equal(noValue, 2);
  const help = await run(proj, ['--help']);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
});

test('an invalid role slug exits 2', async () => {
  const proj = makeProject({ role: 'Bad_Role' });
  const r = await run(proj, [], { env: CREDS_ENV });
  assert.equal(r.status, 2);
  assert.equal(exists(proj.root, 'PRPs/auth/.gitignore'), false);
});

// ===========================================================================
// Config completeness
// ===========================================================================

test('an incomplete or TBD config halts FAILED_LOGIN_CONFIG_INCOMPLETE naming the field', async () => {
  const noRole = await run(makeProject({ config: { baseUrl, roles: {} } }));
  assert.match(noRole.stderr, /FAILED_LOGIN_CONFIG_INCOMPLETE: roles\.admin\b/);
  assert.equal(noRole.status, 1);

  const tbdBase = await run(makeProject({ config: { baseUrl: TBD, roles: { admin: roleConfig() } } }));
  assert.match(tbdBase.stderr, /FAILED_LOGIN_CONFIG_INCOMPLETE: baseUrl/);

  const tbdSelector = await run(
    makeProject({
      roleCfg: roleConfig({
        mechanism: 'form',
        loginPath: '/login',
        api: null,
        form: { usernameSelector: TBD, passwordSelector: '#p', submitSelector: '#s' },
      }),
    }),
    [],
    { env: CREDS_ENV },
  );
  assert.match(tbdSelector.stderr, /FAILED_LOGIN_CONFIG_INCOMPLETE: roles\.admin\.form\.usernameSelector/);

  const noProbe = roleConfig();
  delete noProbe.probe;
  const r = await run(makeProject({ roleCfg: noProbe }), [], { env: CREDS_ENV });
  assert.match(r.stderr, /FAILED_LOGIN_CONFIG_INCOMPLETE: roles\.admin\.probe\.path/);
  for (const x of [noRole, tbdBase, tbdSelector, r]) assert.equal(x.status, 1);
});

// ===========================================================================
// Headed mode skips the credential step
// ===========================================================================

test('headed mode halts FAILED_INTERACTIVE_LOGIN_REQUIRED without a TTY and never reaches the credential step; api mode without credentials halts at the credential step', async () => {
  const headed = makeProject({
    roleCfg: roleConfig({ mechanism: 'headed', loginPath: '/login', api: null, form: null }),
  });
  const h = await run(headed);
  assert.equal(h.status, 1);
  assert.match(h.stderr, /FAILED_INTERACTIVE_LOGIN_REQUIRED/);
  assert.doesNotMatch(h.stderr, /FAILED_CREDENTIALS_UNAVAILABLE/);
  assert.equal(exists(headed.root, 'PRPs/auth/credentials.json'), false);
  assert.equal(exists(headed.root, SESSION_REL), false);

  const api = await run(makeProject());
  assert.match(api.stderr, /FAILED_CREDENTIALS_UNAVAILABLE/);
  assert.doesNotMatch(api.stderr, /FAILED_INTERACTIVE_LOGIN_REQUIRED/);
});

// ===========================================================================
// AC-6 (phase-3 slice) + AC-10 (PARTIAL): a real api login, nothing secret printed
// ===========================================================================

test(
  'an api login writes the storage-state and token files, prints only statuses and paths, and Playwright accepts the produced storage state',
  { skip: NEEDS_PW },
  async () => {
    stats.login = 0;
    const proj = makeProject();
    const r = await run(proj, [], { env: CREDS_ENV });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^SESSION_CREATED: ${SESSION_REL.replace(/[.]/g, '\\.')}$`, 'm'));
    assert.match(r.stdout, new RegExp(`^auth_mode: storage-state:${SESSION_REL.replace(/[.]/g, '\\.')}$`, 'm'));
    assertNoSecrets(r);
    assert.equal(stats.login, 1);

    const sessionFile = join(proj.root, SESSION_REL);
    const state = JSON.parse(readFileSync(sessionFile, 'utf8'));
    assert.ok(state.cookies.some((/** @type {any} */ c) => c.name === 'sid' && c.value === COOKIE_VALUE));
    const tokenArtifact = JSON.parse(readFileSync(join(proj.root, TOKEN_REL), 'utf8'));
    assert.equal(tokenArtifact.token, TOKEN_VALUE);
    assert.ok(new Date(tokenArtifact.expires_at).getTime() > Date.now());

    // Atomic write: only the two final files exist, no leftover temp file.
    assert.deepEqual(readdirSync(join(proj.root, 'PRPs/auth/.sessions')).sort(), ['admin.json', 'admin.token.json']);
    // Env-supplied credentials are never persisted by the script.
    assert.equal(exists(proj.root, 'PRPs/auth/credentials.json'), false);
    if (process.platform !== 'win32') {
      assert.equal(statSync(sessionFile).mode & 0o777, 0o600);
      assert.equal(statSync(join(proj.root, TOKEN_REL)).mode & 0o777, 0o600);
    }

    // AC-10 (PARTIAL): Playwright's own loader accepts the file and the session authenticates.
    const withState = await PW.request.newContext({ storageState: sessionFile });
    const without = await PW.request.newContext();
    try {
      assert.equal((await withState.fetch(`${baseUrl}/api/me`)).status(), 200);
      assert.equal((await without.fetch(`${baseUrl}/api/me`)).status(), 401);
    } finally {
      await withState.dispose();
      await without.dispose();
    }

    // The printed consumer value parses the way capture.mjs parses auth_mode
    // (prefix `storage-state:`, remainder is a path that exists relative to the cwd).
    const line = r.stdout.split('\n').find((l) => l.startsWith('auth_mode: '));
    assert.ok(line);
    const value = line.slice('auth_mode: '.length);
    assert.ok(value.startsWith('storage-state:'));
    assert.ok(existsSync(join(proj.root, value.slice('storage-state:'.length))));
  },
);

test('a JWT token with an exp claim records that exp as expires_at', { skip: NEEDS_PW }, async () => {
  const proj = makeProject({
    roleCfg: roleConfig({ api: { path: '/api/login-jwt', method: 'POST', usernameField: 'email', passwordField: 'pw', tokenPath: 'data.token' } }),
  });
  const r = await run(proj, [], { env: CREDS_ENV });
  assert.equal(r.status, 0, r.stderr);
  const t = JSON.parse(readFileSync(join(proj.root, TOKEN_REL), 'utf8'));
  assert.equal(t.expires_at, '2100-01-01T00:00:00.000Z');
});

test('credentials are read from the git-ignored credentials file when no environment variables are set', { skip: NEEDS_PW }, async () => {
  const proj = makeProject();
  writeFileSync(
    join(proj.root, 'PRPs', 'auth', 'credentials.json'),
    JSON.stringify({ admin: { username: USERNAME, password: PASSWORD } }),
    'utf8',
  );
  const r = await run(proj);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SESSION_CREATED/);
  assertNoSecrets(r);
});

// ===========================================================================
// Login rejection: nothing is saved
// ===========================================================================

test('a rejected login, a cross-origin login path, a redirecting login and a missing session cookie all halt FAILED_LOGIN_REJECTED and save nothing', { skip: NEEDS_PW }, async () => {
  stats.login = 0;
  const wrongPw = makeProject();
  const a = await run(wrongPw, [], { env: { RELAY_TEST_USER: USERNAME, RELAY_TEST_PASS: 'not-the-password' } });
  assert.equal(a.status, 1);
  assert.match(a.stderr, /FAILED_LOGIN_REJECTED/);
  assert.equal(stats.login, 1, 'the wrong password did reach the server');
  assert.equal(exists(wrongPw.root, SESSION_REL), false);
  assert.equal(exists(wrongPw.root, TOKEN_REL), false);
  assert.ok(!a.stdout.includes('not-the-password') && !a.stderr.includes('not-the-password'));

  // The escape target is a second, real local server on another port (a different
  // origin) that would happily issue a session: a script that followed the
  // `//host` form would reach it and succeed.
  stats.login = 0;
  otherOriginHits = 0;
  const cross = makeProject({
    roleCfg: roleConfig({ api: { path: `//127.0.0.1:${otherPort}/api/login`, method: 'POST', usernameField: 'email', passwordField: 'pw', tokenPath: null } }),
  });
  const b = await run(cross, [], { env: CREDS_ENV });
  assert.equal(b.status, 1);
  assert.match(b.stderr, /FAILED_LOGIN_REJECTED/);
  assert.equal(stats.login, 0, 'no request may reach the configured origin either');
  assert.equal(otherOriginHits, 0, 'no request may leave the configured origin');
  assert.equal(exists(cross.root, SESSION_REL), false);

  stats.login = 0;
  const redirecting = makeProject({
    roleCfg: roleConfig({ api: { path: '/api/login-redirect', method: 'POST', usernameField: 'email', passwordField: 'pw', tokenPath: null } }),
  });
  const c = await run(redirecting, [], { env: CREDS_ENV });
  assert.equal(c.status, 1);
  assert.match(c.stderr, /FAILED_LOGIN_REJECTED/);
  assert.equal(stats.login, 1);
  assert.equal(exists(redirecting.root, SESSION_REL), false);

  // Control for all three: the same project shape with valid inputs succeeds.
  const okProj = makeProject();
  assert.equal((await run(okProj, [], { env: CREDS_ENV })).status, 0);

  const wrongCookie = makeProject({ roleCfg: roleConfig({ sessionCookie: 'other' }) });
  const d = await run(wrongCookie, [], { env: CREDS_ENV });
  assert.equal(d.status, 1);
  assert.match(d.stderr, /FAILED_LOGIN_REJECTED/);
  assert.equal(exists(wrongCookie.root, SESSION_REL), false);
});

// ===========================================================================
// AC-11: idempotent reuse; expiry triggers re-login
// ===========================================================================

test('a second run reuses the valid session without credentials or a new login; --force bypasses reuse', { skip: NEEDS_PW }, async () => {
  stats.login = 0;
  const proj = makeProject();
  const first = await run(proj, [], { env: CREDS_ENV });
  assert.equal(first.status, 0, first.stderr);
  assert.equal(stats.login, 1);
  const file = join(proj.root, SESSION_REL);
  const before1 = statSync(file).mtimeMs;
  const content1 = readFileSync(file, 'utf8');

  // No credentials supplied on the second run: only reuse can succeed.
  const second = await run(proj);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /^SESSION_REUSED: PRPs\/auth\/\.sessions\/admin\.json$/m);
  assert.match(second.stdout, /^auth_mode: storage-state:PRPs\/auth\/\.sessions\/admin\.json$/m);
  assert.equal(stats.login, 1, 'reuse must not log in again');
  assert.equal(statSync(file).mtimeMs, before1, 'reuse must not rewrite the session file');
  assert.equal(readFileSync(file, 'utf8'), content1);
  assertNoSecrets(second);

  // --force skips reuse, and with no credentials the run halts without touching the file.
  const forced = await run(proj, ['--force']);
  assert.equal(forced.status, 1);
  assert.match(forced.stderr, /FAILED_CREDENTIALS_UNAVAILABLE/);
  assert.equal(readFileSync(file, 'utf8'), content1);
});

test('an expired session cookie, one expiring within a minute, a stale file or a failing probe each force a re-login; their valid controls are reused', { skip: NEEDS_PW }, async () => {
  const nowSec = Date.now() / 1000;

  /** @param {{ cookies?: any[], ageMinutes?: number, roleCfg?: any }} o */
  async function attempt(o) {
    const proj = makeProject({ roleCfg: o.roleCfg });
    writeSession(proj, o);
    return run(proj); // no credentials: reuse succeeds, anything else halts at the credential step
  }

  // Controls: each is reused.
  for (const [label, o] of /** @type {[string, any][]} */ ([
    ['session cookie (-1)', {}],
    ['cookie expiring in an hour', { cookies: [validCookie({ expires: nowSec + 3600 })] }],
    ['young file (10 of 60 minutes)', { ageMinutes: 10 }],
  ])) {
    const r = await attempt(o);
    assert.equal(r.status, 0, `${label}: ${r.stderr}`);
    assert.match(r.stdout, /SESSION_REUSED/, label);
  }

  // Each differs from its control in exactly one factor and is not reused.
  for (const [label, o] of /** @type {[string, any][]} */ ([
    ['expired cookie', { cookies: [validCookie({ expires: 1 })] }],
    ['cookie expiring in 30 seconds', { cookies: [validCookie({ expires: nowSec + 30 })] }],
    ['file older than maxAgeMinutes', { ageMinutes: 120 }],
    ['probe rejects the cookie (401)', { cookies: [validCookie({ value: 'wrong-value' })] }],
    ['probe answers with a redirect', { roleCfg: roleConfig({ probe: { path: '/api/redirect-probe', method: 'GET' } }) }],
    ['the session cookie is absent from the file', { cookies: [validCookie({ name: 'other' })] }],
  ])) {
    const r = await attempt(o);
    assert.equal(r.status, 1, label);
    assert.doesNotMatch(r.stdout, /SESSION_REUSED/, label);
    assert.match(r.stderr, /FAILED_CREDENTIALS_UNAVAILABLE/, label);
  }
});

test('an expired session triggers a fresh login that replaces the stale file', { skip: NEEDS_PW }, async () => {
  stats.login = 0;
  const proj = makeProject();
  const file = writeSession(proj, { cookies: [validCookie({ value: 'stale-value' })], ageMinutes: 120 });
  const staleMtime = statSync(file).mtimeMs;
  const r = await run(proj, [], { env: CREDS_ENV });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^SESSION_CREATED:/m);
  assert.equal(stats.login, 1);
  assert.ok(statSync(file).mtimeMs > staleMtime);
  const state = JSON.parse(readFileSync(file, 'utf8'));
  assert.ok(state.cookies.some((/** @type {any} */ c) => c.value === COOKIE_VALUE));
  assert.ok(!JSON.stringify(state).includes('stale-value'));
  assertNoSecrets(r);
});

// ===========================================================================
// Source-level invariants of the template (each pinned by a mutation)
// ===========================================================================

/** @param {string} text */
function templateFindings(text) {
  /** @type {string[]} */
  const f = [];
  const count = (/** @type {string} */ needle) => text.split(needle).length - 1;
  if (count('maxRedirects: 0') < 2) f.push('REDIRECTS_FOLLOWED');
  if (count('writeFileSync(') !== 1) f.push('WRITE_OUTSIDE_WRITESITE');
  if (!text.includes('mode: 0o600')) f.push('MODE');
  if (!text.includes('renameSync(tmp, dest)')) f.push('NOT_ATOMIC');
  if (/console\.(log|error|info)/.test(text)) f.push('CONSOLE');
  if (text.includes('--local-host')) f.push('RETIRED_FLAG');
  if (!text.includes('FAILED_GUARD_UNAVAILABLE')) f.push('FAIL_CLOSED');
  const g = text.indexOf('guard.checkTarget(cfg.baseUrl');
  const s = text.indexOf("'ensure'");
  const reuse = text.indexOf('await sessionReusable(');
  const creds = text.indexOf('resolveCredentials(root, role);');
  const write = text.indexOf('writeSecret(root, SESSION_REL');
  const order = [g, s, reuse, creds, write];
  if (order.some((v) => v === -1) || order.some((v, i) => i > 0 && v <= order[i - 1])) f.push('RUN_ORDER');
  if (!text.includes('u.origin === base.origin')) f.push('SAME_ORIGIN');
  return f;
}

test('template: redirects are never followed, the only file write is the atomic 0600 writer, nothing is logged, and the run order is guard, secrecy, reuse, credentials, write', () => {
  assert.deepEqual(templateFindings(TEMPLATE), []);
});

test('template: each source invariant is detected when violated', () => {
  /** @param {string} from @param {string} to */
  const mut = (from, to) => {
    assert.ok(TEMPLATE.includes(from), `anchor not found: ${from}`);
    return TEMPLATE.split(from).join(to);
  };
  assert.ok(templateFindings(mut('maxRedirects: 0', 'maxRedirects: 5')).includes('REDIRECTS_FOLLOWED'));
  assert.ok(templateFindings(`${TEMPLATE}\nwriteFileSync('x', 'y');\n`).includes('WRITE_OUTSIDE_WRITESITE'));
  assert.ok(templateFindings(mut('mode: 0o600', 'mode: 0o644')).includes('MODE'));
  assert.ok(templateFindings(mut('renameSync(tmp, dest)', 'void 0')).includes('NOT_ATOMIC'));
  assert.ok(templateFindings(`${TEMPLATE}\nconsole.log(1);\n`).includes('CONSOLE'));
  assert.ok(templateFindings(mut("'ensure'", "'prove'")).includes('RUN_ORDER'));
  assert.ok(templateFindings(mut('guard.checkTarget(cfg.baseUrl', 'guard.checkTarget(cfg.other')).includes('RUN_ORDER'));
  assert.ok(templateFindings(mut('FAILED_GUARD_UNAVAILABLE', 'FAILED_SOMETHING')).includes('FAIL_CLOSED'));
  assert.ok(templateFindings(mut('u.origin === base.origin', 'true')).includes('SAME_ORIGIN'));
  assert.ok(templateFindings(`${TEMPLATE}\n// --local-host\n`).includes('RETIRED_FLAG'));
});
