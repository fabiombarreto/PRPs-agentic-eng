// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-18 A login-less static-token application is authenticated by the kit (declared token, with/without proof, named halts)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-19 A saved session carries the origin's IndexedDB, and an old Playwright halts by name
/**
 * End-to-end tests for the `static-token` mechanism and the IndexedDB capture of
 * plugins/relay/resources/auth-login.template.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md (AC-18, AC-19)
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-6-dogfood-corrections.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every test
 * copies the REAL template into a temp git project (the single `__RELAY_ROLE__`
 * substitution a generated script gets) and runs it as an ASYNC child process
 * against an in-process loopback server whose app keeps its token in IndexedDB.
 * A synchronous child spawn beside that server would block this process's event
 * loop and the script would see an unreachable target, so none is used.
 *
 * Real Chromium + Playwright are used; there are no skip conditions. When
 * Chromium is absent the tests fail loudly with the command that installs it.
 *
 * Mutation proofs: the proof step, the IndexedDB option, the wait for a late
 * database, the Playwright floor and the persistence of a prompted token are
 * re-run against a COPY of the template (written into a temp project, never the
 * original; the prompted-token one is a pure text check, since no test has a
 * terminal) with anchored replacements that must each occur exactly once.
 *
 * The three template markers (GUARD-SITE, SECRECY-SITE, WRITE-SITE: once each, in
 * order) are already pinned against the real tree by
 * scripts/validate/checks/auth-local-guard-sites.test.mjs and are not repeated.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PLUGIN = join(REPO, 'plugins', 'relay');
const TEMPLATE_PATH = join(PLUGIN, 'resources', 'auth-login.template.mjs');
const TEMPLATE = readFileSync(TEMPLATE_PATH, 'utf8').replace(/\r\n/g, '\n');
const QA_RUN = join(PLUGIN, 'scripts', 'qa-run.mjs');
const CAPTURE = join(PLUGIN, 'scripts', 'visual', 'capture.mjs');

const TOKEN = 'tok-e2e-Zq83kd01-secret';
const ENV_NAME = 'QA_E2E_TOKEN';

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

// The app opens IndexedDB `appdb` (store `kv`) on load and reads `token` from it. It also
// reports which databases exist so a test can prove a database was never created.
const APP_HTML =
  '<!doctype html><p id="s">loading</p><script>' +
  'const r=indexedDB.open("appdb",1);' +
  'r.onupgradeneeded=()=>r.result.createObjectStore("kv");' +
  'r.onsuccess=()=>{const g=r.result.transaction("kv").objectStore("kv").get("token");' +
  'g.onsuccess=()=>{const a=g.result==="' + TOKEN + '";' +
  'document.getElementById("s").textContent=a?"authenticated":"anonymous";' +
  'if(a){const m=document.createElement("i");m.id="authed";m.textContent="ok";document.body.appendChild(m)}}};' +
  // The reporter runs only when the page is opened with ?observe: a steady stream of requests
  // would keep capture.mjs from ever seeing the network go idle.
  'if(location.search.includes("observe")){const rep=async()=>{try{const l=await indexedDB.databases();' +
  'fetch("/__dbs",{method:"POST",body:JSON.stringify(l.map(d=>d.name))})}catch(e){}};rep();setInterval(rep,300)}' +
  '</script>';

// An app that creates its IndexedDB database only ~3 s after load (store `kv`, no token yet). Its
// marker paragraph has text so it is a visible element.
const LATE_HTML =
  '<!doctype html><p id="s">late</p><script>setTimeout(()=>{' +
  'const r=indexedDB.open("latedb",1);' +
  'r.onupgradeneeded=()=>r.result.createObjectStore("kv")},3000)</script>';

/** @type {Record<string, any>[]} */
let driverHeaders = [];
/** @type {Set<string>} */
let dbSeen = new Set();
/** @type {number[]} */
let otherHits = [];
/** @type {import('node:http').Server} */
let server;
/** @type {import('node:http').Server} */
let other;
let base = '';
let otherPort = 0;

before(async () => {
  other = createServer((req, res) => {
    otherHits.push(Date.now());
    res.statusCode = 200;
    res.end('other');
  });
  await new Promise((r) => other.listen(0, '127.0.0.2', () => r(null)));
  otherPort = /** @type {any} */ (other.address()).port;

  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    const h = req.headers;
    if (path === '/') {
      res.statusCode = 200;
      return res.end('ok');
    }
    if (path === '/app') {
      res.setHeader('content-type', 'text/html');
      return res.end(APP_HTML);
    }
    if (path === '/late') {
      res.setHeader('content-type', 'text/html');
      return res.end(LATE_HTML);
    }
    if (path === '/__dbs') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          for (const n of JSON.parse(body)) dbSeen.add(String(n));
        } catch {
          // ignore a malformed report
        }
        res.statusCode = 204;
        res.end();
      });
      return;
    }
    if (path === '/api/open') {
      res.statusCode = 200;
      return res.end('{}');
    }
    if (path === '/api/me') {
      res.statusCode = h['x-api-key'] === TOKEN ? 200 : 401;
      return res.end('{}');
    }
    if (path === '/api/prefixed' || path === '/api/prefixed-driver') {
      if (path === '/api/prefixed-driver') driverHeaders.push({ ...h });
      res.statusCode = h['x-auth'] === `Token ${TOKEN}` ? 200 : 401;
      return res.end('{}');
    }
    res.statusCode = 404;
    res.end('nf');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  base = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

/** @type {string[]} */
const temps = [];
after(async () => {
  await new Promise((r) => server.close(() => r(null)));
  await new Promise((r) => other.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, any>} [browserOver]
 * @param {Record<string, any>} [over]
 */
function idbRole(browserOver = {}, over = {}) {
  return {
    mechanism: 'static-token',
    loginPath: null,
    form: null,
    api: null,
    probe: { path: '/api/me', method: 'GET' },
    sessionCookie: null,
    maxAgeMinutes: 60,
    credentials: { usernameEnv: null, passwordEnv: null },
    userCreation: { command: null },
    staticToken: {
      tokenEnv: ENV_NAME,
      header: 'x-api-key',
      valuePrefix: '',
      browser: { kind: 'indexedDB', originPath: '/app', database: 'appdb', store: 'kv', key: 'token', valueField: null, ...browserOver },
    },
    ...over,
  };
}

/** A login-less role with a custom header and prefix and no browser location. */
const prefixedRole = () => ({
  ...idbRole(),
  probe: { path: '/api/prefixed', method: 'GET' },
  staticToken: { tokenEnv: ENV_NAME, header: 'x-auth', valuePrefix: 'Token ', browser: null },
});

/**
 * A temp git project holding the login script for role `dev` and the config.
 * @param {any} role
 * @param {{ template?: string, fakePlaywright?: string }} [o]
 * @returns {Promise<string>} the project root
 */
async function project(role, o = {}) {
  const d = mkdtempSync(join(tmpdir(), 'relay-statictoken-'));
  temps.push(d);
  await execFileP('git', ['init', '-q', d]);
  mkdirSync(join(d, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(d, 'PRPs', 'auth', 'login-dev.mjs'), (o.template ?? TEMPLATE).replaceAll('__RELAY_ROLE__', 'dev'));
  writeFileSync(join(d, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: base, roles: { dev: role } }));
  if (o.fakePlaywright) {
    const pkg = join(d, 'node_modules', 'playwright');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: 'playwright', version: o.fakePlaywright, main: 'index.js' }));
    writeFileSync(join(pkg, 'index.js'), 'module.exports = {};\n');
  }
  return d;
}

/**
 * Runs the project's login script as an async child.
 * @param {string} d
 * @param {{ token?: string | null }} [o] the value of the token variable; null leaves it unset
 * @returns {Promise<{ code: number | null, o: string, e: string }>}
 */
function login(d, o = {}) {
  const token = o.token === undefined ? TOKEN : o.token;
  /** @type {Record<string, string | undefined>} */ const env = { ...process.env };
  delete env[ENV_NAME];
  if (token !== null) env[ENV_NAME] = token;
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
      res({ code, o: out, e: er });
    });
  });
}

/**
 * @param {string} script
 * @param {string[]} args
 * @param {Record<string, string>} [env]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runNode(script, args, env = {}) {
  return new Promise((res, rej) => {
    const c = spawn(process.execPath, [script, ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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

/**
 * The saved state's IndexedDB must hold the declared database `latedb` with the token in it.
 * @param {string} d
 */
function assertLateDbHoldsToken(d) {
  const st = JSON.parse(readFileSync(sessionPath(d), 'utf8'));
  const dbs = (st.origins ?? []).flatMap((/** @type {any} */ o) => (Array.isArray(o.indexedDB) ? o.indexedDB : []));
  const late = dbs.find((/** @type {any} */ db) => db.name === 'latedb');
  assert.ok(late, `no latedb in the saved IndexedDB: ${JSON.stringify(dbs.map((/** @type {any} */ x) => x.name))}`);
  assert.ok(JSON.stringify(late).includes(TOKEN), 'the saved latedb does not hold the token');
}

/** @param {{ o: string, e: string }} r */
function assertTokenNotPrinted(r) {
  assert.ok(!(r.o + r.e).includes(TOKEN), 'the token was printed to stdout or stderr');
}

/**
 * Launches Chromium or fails with the command that installs it.
 * @param {any} pw
 */
async function launch(pw) {
  try {
    return await pw.chromium.launch({ headless: true });
  } catch (err) {
    throw new Error(`Chromium could not be launched (${/** @type {Error} */ (err).message}); install it with: npx playwright install chromium`);
  }
}

const rootPlaywright = () => createRequire(join(REPO, 'package.json'))('playwright');

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */ const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** The proven project (token in IndexedDB), created once and shared by the read-only tests below. */
/** @type {Promise<{ d: string, r: { code: number | null, o: string, e: string } }> | null} */
let provenMemo = null;
function proven() {
  if (provenMemo === null) {
    provenMemo = (async () => {
      const d = await project(idbRole());
      return { d, r: await login(d) };
    })();
  }
  return provenMemo;
}

// ---------------------------------------------------------------------------
// AC-18: proven with the token
// ---------------------------------------------------------------------------

test('static-token: with the declared token the kit saves a session and a token artifact carrying the declared header, prints no token and writes no credential file', async () => {
  const { d, r } = await proven();
  assert.equal(r.code, 0, r.e);
  assert.match(r.o, /SESSION_CREATED: PRPs\/auth\/\.sessions\/dev\.json/);
  assert.match(r.o, /auth_mode: storage-state:PRPs\/auth\/\.sessions\/dev\.json/);
  assertTokenNotPrinted(r);
  assert.ok(existsSync(sessionPath(d)), 'no session file');
  assert.ok(!existsSync(credentialsPath(d)), 'a token read from the environment must not be persisted as a credential file');
  const art = JSON.parse(readFileSync(tokenPath(d), 'utf8'));
  assert.equal(art.token, TOKEN);
  assert.equal(art.header, 'x-api-key');
  assert.equal(art.value_prefix, '');
});

test('static-token: the saved state contains the origin IndexedDB database the app opened', async () => {
  const { d, r } = await proven();
  assert.equal(r.code, 0, r.e);
  const st = JSON.parse(readFileSync(sessionPath(d), 'utf8'));
  const dbs = (st.origins ?? []).flatMap((/** @type {any} */ o) => (Array.isArray(o.indexedDB) ? o.indexedDB : []));
  assert.ok(
    dbs.some((/** @type {any} */ db) => db.name === 'appdb'),
    `no appdb in the saved IndexedDB: ${JSON.stringify(dbs.map((/** @type {any} */ x) => x.name))}`,
  );
});

test('static-token: a second run reuses the proven session', async () => {
  const { d, r } = await proven();
  assert.equal(r.code, 0, r.e);
  const again = await login(d);
  assert.equal(again.code, 0, again.e);
  assert.match(again.o, /SESSION_REUSED/);
  assertTokenNotPrinted(again);
});

test('IndexedDB: a browser context restored from the saved state is authenticated', async () => {
  const { d, r } = await proven();
  assert.equal(r.code, 0, r.e);
  const browser = await launch(rootPlaywright());
  try {
    const ctx = await browser.newContext({ storageState: sessionPath(d) });
    const page = await ctx.newPage();
    await page.goto(`${base}/app`);
    await page.waitForFunction(() => /** @type {HTMLElement} */ (document.getElementById('s')).textContent !== 'loading');
    assert.equal(await page.textContent('#s'), 'authenticated');
  } finally {
    await browser.close();
  }
});

test('IndexedDB: capture.mjs, unchanged, restores the saved session and captures an authenticated frame', async () => {
  const { d, r } = await proven();
  assert.equal(r.code, 0, r.e);
  const out = mkdtempSync(join(tmpdir(), 'relay-cap-'));
  temps.push(out);
  const manifest = join(out, 'manifest.json');
  writeFileSync(
    manifest,
    JSON.stringify([
      { node_id: '1:1', route: '/app', preconditions: 'none', auth_mode: `storage-state:${sessionPath(d)}`, viewport: { width: 400, height: 300 }, diff_threshold: 0.5, ref_png: 'none', masks: [], interaction: 'wait(#authed)' },
    ]),
  );
  const cap = await runNode(CAPTURE, [manifest, out, base]);
  assert.equal(cap.code, 0, `${cap.stdout}\n${cap.stderr}`);
  assert.ok(existsSync(join(out, '1-1.png')), `capture.mjs did not capture an authenticated frame (the wait for #authed failed): ${cap.stdout}${cap.stderr}`);
});

test('IndexedDB: the Playwright the visual capture resolves from plugins/relay/scripts/visual is at least 1.51', () => {
  const version = createRequire(join(PLUGIN, 'scripts', 'visual', 'package.json'))('playwright/package.json').version;
  const [maj, min] = String(version).split('.').map(Number);
  assert.ok(maj > 1 || (maj === 1 && min >= 51), `Playwright ${version} cannot restore IndexedDB`);
});

// ---------------------------------------------------------------------------
// AC-18: refused without the token, and never saved when the proof proves nothing
// ---------------------------------------------------------------------------

test('static-token: with no token source the script halts FAILED_CREDENTIALS_UNAVAILABLE and saves nothing', async () => {
  const d = await project(idbRole());
  const r = await login(d, { token: null });
  assert.equal(r.code, 1);
  assert.match(r.e, /FAILED_CREDENTIALS_UNAVAILABLE/);
  assertNothingSaved(d);
});

test('static-token: a token the server rejects halts FAILED_LOGIN_REJECTED and saves nothing', async () => {
  const d = await project(idbRole());
  const r = await login(d, { token: 'a-wrong-token' });
  assert.equal(r.code, 1);
  assert.match(r.e, /FAILED_LOGIN_REJECTED/);
  assertNothingSaved(d);
  assert.ok(!(r.o + r.e).includes('a-wrong-token'), 'the rejected token was printed');
});

test('static-token: an endpoint that answers 2xx with AND without the token halts FAILED_TOKEN_UNPROVEN with no session and no credential file', async () => {
  const d = await project(idbRole({}, { probe: { path: '/api/open', method: 'GET' } }));
  const r = await login(d);
  assert.equal(r.code, 1, r.o);
  assert.match(r.e, /FAILED_TOKEN_UNPROVEN/);
  assertNothingSaved(d);
  assertTokenNotPrinted(r);
});

// The script waits up to 10 s for the declared database to appear. Slow by nature, so each test
// below sets an explicit timeout well above that deadline (the runner default would kill them).
const SLOW = { timeout: 90000 };

test('static-token: a declared IndexedDB database that never appears halts FAILED_TOKEN_LOCATION_UNREACHABLE only after waiting out the deadline, and the database is NOT created', SLOW, async () => {
  dbSeen = new Set();
  const d = await project(idbRole({ database: 'ghostdb', originPath: '/app?observe=1' }));
  const t0 = Date.now();
  const r = await login(d);
  const elapsed = Date.now() - t0;
  assert.equal(r.code, 1, r.o);
  assert.match(r.e, /FAILED_TOKEN_LOCATION_UNREACHABLE/);
  assert.match(r.e, /ghostdb/, 'the halt must name the declared database');
  assertNothingSaved(d);
  assertTokenNotPrinted(r);
  // The 10 s deadline starts after the page loads, so a script that really waited takes at least 10 s.
  assert.ok(elapsed >= 9500, `the script halted after ${elapsed} ms: it did not wait out the 10 s deadline`);
  assert.ok(elapsed < 60000, `the script took ${elapsed} ms: the wait is unbounded`);
  // The page reports its databases every 300 ms, so over a 10 s wait the observer has spoken many
  // times: the app's own database must have been reported (the observer works) and the declared
  // ghost database must never have been created by the script.
  assert.ok(dbSeen.has('appdb'), 'the observer never reported: the absence check below would be vacuous');
  assert.ok(!dbSeen.has('ghostdb'), 'the declared database was created by the script');
});

test('static-token: a declared IndexedDB database the application creates ~3 s after load is waited for, and the saved state holds the token', SLOW, async () => {
  const d = await project(idbRole({ database: 'latedb', originPath: '/late' }));
  const t0 = Date.now();
  const r = await login(d);
  const elapsed = Date.now() - t0;
  assert.equal(r.code, 0, `${r.o}\n${r.e}`);
  assert.doesNotMatch(r.e, /FAILED_TOKEN_LOCATION_UNREACHABLE/);
  assert.ok(elapsed >= 2500, `the script finished after ${elapsed} ms, before the database even existed`);
  assert.ok(existsSync(sessionPath(d)), 'no session file');
  assertTokenNotPrinted(r);
  assertLateDbHoldsToken(d);
});

test('static-token: a declared object store that does not exist halts FAILED_TOKEN_LOCATION_UNREACHABLE and saves nothing', async () => {
  const d = await project(idbRole({ store: 'nostore' }));
  const r = await login(d);
  assert.equal(r.code, 1, r.o);
  assert.match(r.e, /FAILED_TOKEN_LOCATION_UNREACHABLE/);
  assert.match(r.e, /nostore/, 'the halt must name the declared store');
  assertNothingSaved(d);
  assertTokenNotPrinted(r);
});

// ---------------------------------------------------------------------------
// AC-19: an old Playwright halts by name
// ---------------------------------------------------------------------------

test('IndexedDB: a role that needs IndexedDB on a Playwright below 1.51 halts FAILED_INDEXEDDB_UNSUPPORTED and saves nothing', async () => {
  const d = await project(idbRole(), { fakePlaywright: '1.50.0' });
  const r = await login(d);
  assert.equal(r.code, 1, r.o);
  assert.match(r.e, /FAILED_INDEXEDDB_UNSUPPORTED/);
  assertNothingSaved(d);
  assertTokenNotPrinted(r);
});

test('IndexedDB: the same role on a Playwright reporting exactly 1.51.0 passes the version gate (the halt is the version, not the fake package)', async () => {
  const d = await project(idbRole(), { fakePlaywright: '1.51.0' });
  const r = await login(d);
  assert.doesNotMatch(r.e, /FAILED_INDEXEDDB_UNSUPPORTED/);
});

// ---------------------------------------------------------------------------
// AC-18: the HTTP driver presents the artifact's declared header, only to allowed hosts
// ---------------------------------------------------------------------------

test('the runner HTTP driver sends the artifact custom header and value prefix, never Authorization, never to a non-allowed host, and the token reaches no result file', async () => {
  driverHeaders = [];
  otherHits = [];
  const d = await project(prefixedRole());
  const feature = 'feat';
  const reportDir = join(d, 'PRPs', 'reports', feature);
  mkdirSync(reportDir, { recursive: true });
  const dash = '—';
  const block = (/** @type {number} */ n) =>
    `### ${n} ${dash} Case ${n}\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** n/a\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n`;
  const reportPath = join(reportDir, 'qa-report.md');
  writeFileSync(reportPath, `# QA Report\n\n${block(1)}${block(2)}`);
  const parsed = await runNode(QA_RUN, ['parse', '--report', reportPath]);
  assert.equal(parsed.code, 0, parsed.stderr);
  const titles = JSON.parse(parsed.stdout).cases.map((/** @type {any} */ c) => c.title);
  const runDirRel = `PRPs/reports/${feature}/qa-run/20260101T101010101Z`;
  mkdirSync(join(d, ...runDirRel.split('/'), 'evidence'), { recursive: true });
  const step = (/** @type {string} */ path) => ({ action: 'request', method: 'GET', path, expect_status: 200 });
  writeFileSync(
    join(d, ...runDirRel.split('/'), 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: [
        { index: 1, title: titles[0], driver: 'http', role: 'dev', state: 'none', steps: [step('/api/prefixed-driver')] },
        { index: 2, title: titles[1], driver: 'http', role: 'dev', state: 'none', steps: [step(`http://127.0.0.2:${otherPort}/api/prefixed-driver`)] },
      ],
    }),
  );
  const run = await runNode(QA_RUN, ['run', '--root', d, '--feature', feature, '--run-dir', runDirRel], { [ENV_NAME]: TOKEN });
  assert.equal(run.code, 0, `${run.stdout}\n${run.stderr}`);
  const results = JSON.parse(readFileSync(join(d, ...runDirRel.split('/'), 'results.json'), 'utf8'));
  assert.equal(results.cases[0].outcome, 'pass', JSON.stringify(results.cases[0]));
  assert.ok(driverHeaders.length >= 1, 'the driver never reached the protected endpoint');
  for (const h of driverHeaders) {
    assert.equal(h['x-auth'], `Token ${TOKEN}`, 'the declared header and value prefix must be sent');
    assert.equal(h.authorization, undefined, 'the default Authorization header must not be sent when the artifact declares another');
  }
  assert.equal(results.cases[1].outcome, 'blocked');
  assert.equal(results.cases[1].reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(otherHits.length, 0, 'a request reached the non-allowed host');
  assert.ok(!(run.stdout + run.stderr).includes(TOKEN), 'the token was printed by the runner');
  for (const f of walk(join(d, ...runDirRel.split('/')))) {
    assert.ok(!readFileSync(f).includes(TOKEN), `the token appears in ${f}`);
  }
});

// ---------------------------------------------------------------------------
// Template invariants
// ---------------------------------------------------------------------------

test('template invariants: one secret writer, and every storageState call saves IndexedDB (four calls, none bare)', () => {
  assert.equal(TEMPLATE.split('writeFileSync(').length - 1, 1, 'exactly one writeFileSync( call (the single secret writer)');
  assert.equal(TEMPLATE.split('function writeSecret(').length - 1, 1);
  assert.equal(TEMPLATE.split('renameSync(tmp, dest)').length - 1, 1);
  const calls = [...TEMPLATE.matchAll(/\.storageState\(([^)]*)\)/g)].map((m) => m[1].trim());
  assert.equal(calls.length, 4, `expected four storageState( calls, found ${JSON.stringify(calls)}`);
  for (const arg of calls) assert.equal(arg, '{ indexedDB: true }');
  assert.equal(TEMPLATE.split('storageState({ indexedDB: true })').length - 1, 4);
});

/**
 * A prompted token needs a terminal, which no test here has (every spawn uses stdio
 * 'ignore'), so "never persisted before the proof succeeds" is pinned by source order.
 * Over the given template text: the credentials store is written in exactly two places, the
 * interactive username/password prompt (preceded by `merged[ROLE] = creds;`) and the prompted
 * token; the latter lies inside the `if (promptedToken && token !== null)` block, which opens
 * only after the `await proveStaticToken(` call of the static-token branch.
 * @param {string} text
 */
function assertPromptedTokenPersistedOnlyAfterProof(text) {
  /** @param {string} needle @returns {number[]} */
  const indexes = (needle) => {
    /** @type {number[]} */ const at = [];
    for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) at.push(i);
    return at;
  };
  const proof = indexes('await proveStaticToken(cfg, role, source.token, pw)');
  assert.equal(proof.length, 1, 'exactly one proof call on the freshly resolved token');
  const block = indexes('if (promptedToken && token !== null) {');
  assert.equal(block.length, 1, 'exactly one prompted-token persistence block');
  assert.ok(block[0] > proof[0], 'the prompted-token block must come after the proof call');
  const writes = indexes('writeSecret(root, CREDENTIALS_REL');
  assert.equal(writes.length, 2, `the credentials store must be written in exactly two places, found ${writes.length}`);
  const tokenWrites = writes.filter((w) => !text.slice(Math.max(0, w - 60), w).includes('merged[ROLE] = creds;'));
  assert.equal(tokenWrites.length, 1, 'exactly one credentials write that is not the username/password prompt');
  assert.ok(tokenWrites[0] > block[0], 'the prompted token must be written only inside the block that follows the proof');
  const between = text.slice(block[0], tokenWrites[0]);
  assert.ok(between.includes('merged[ROLE] = { token };'), 'the write inside the block must store the token');
  assert.ok(!between.includes('\n  }\n'), 'the write must sit inside the block, not after it closes');
}

test('template invariants: a prompted token is written to the credentials store only after the proof succeeds (source order)', () => {
  assertPromptedTokenPersistedOnlyAfterProof(TEMPLATE);
});

// ---------------------------------------------------------------------------
// Mutation proofs on a copy of the template
// ---------------------------------------------------------------------------

/**
 * @param {string} anchor
 * @param {string} replacement
 * @returns {string} the mutated template text
 */
function mutatedTemplate(anchor, replacement) {
  assert.equal(TEMPLATE.split(anchor).length - 1, 1, `mutation anchor must occur exactly once: ${anchor}`);
  return TEMPLATE.replace(anchor, () => replacement);
}

test('mutation: dropping the without-token half of the proof saves a session for an endpoint that proves nothing (the FAILED_TOKEN_UNPROVEN test is what catches it)', async () => {
  const template = mutatedTemplate("return without >= 200 && without < 300 ? 'unproven' : 'proven';", "return 'proven';");
  const d = await project(idbRole({}, { probe: { path: '/api/open', method: 'GET' } }), { template });
  const r = await login(d);
  assert.equal(r.code, 0, r.e);
  assert.ok(existsSync(sessionPath(d)), 'the mutated copy must save the unproven session');
});

test('mutation: a bare storageState() at the IndexedDB save site saves a state without IndexedDB (the saved-state test is what catches it)', async () => {
  const template = mutatedTemplate('return { state: await context.storageState({ indexedDB: true }), halt: null };', 'return { state: await context.storageState(), halt: null };');
  const d = await project(idbRole(), { template });
  const r = await login(d);
  assert.equal(r.code, 0, r.e);
  const st = JSON.parse(readFileSync(sessionPath(d), 'utf8'));
  const dbs = (st.origins ?? []).flatMap((/** @type {any} */ o) => (Array.isArray(o.indexedDB) ? o.indexedDB : []));
  assert.equal(dbs.length, 0, 'the mutated copy must lose the IndexedDB state');
});

test('mutation: restoring the inert async-predicate waitForFunction in place of the polling loop halts a late-database app FAILED_TOKEN_LOCATION_UNREACHABLE (the late-database test is what catches it)', SLOW, async () => {
  // Skip the polling loop (it starts as already-appeared) and put back the old wait, whose async
  // predicate Playwright does not await: it resolves at once, before the late database exists.
  let template = mutatedTemplate(
    'const dbDeadline = Date.now() + 10000;',
    "await page.waitForFunction(async (/** @type {string} */ db) => (await indexedDB.databases()).some((d) => d.name === db), loc.database, { timeout: 10000 });\n      const dbDeadline = 0;",
  );
  assert.equal(template.split('let dbAppeared = false;').length - 1, 1, 'mutation anchor must occur exactly once: let dbAppeared = false;');
  template = template.replace('let dbAppeared = false;', () => 'let dbAppeared = true;');
  assert.notEqual(template, TEMPLATE);
  const d = await project(idbRole({ database: 'latedb', originPath: '/late' }), { template });
  const r = await login(d);
  assert.equal(r.code, 1, `${r.o}\n${r.e}`);
  assert.match(r.e, /FAILED_TOKEN_LOCATION_UNREACHABLE/, 'the mutated copy must wrongly halt on a late database');
  assert.ok(!existsSync(sessionPath(d)), 'the mutated copy saved a session');
});

test('mutation: persisting a prompted token before the proof (an early credentials write) is caught by the source-order test', () => {
  assertPromptedTokenPersistedOnlyAfterProof(TEMPLATE);
  const template = mutatedTemplate(
    'const proof = await proveStaticToken(cfg, role, source.token, pw);',
    'if (source.prompted) writeSecret(root, CREDENTIALS_REL, `${JSON.stringify({ [ROLE]: { token: source.token } })}\\n`);\n    const proof = await proveStaticToken(cfg, role, source.token, pw);',
  );
  assert.notEqual(template, TEMPLATE);
  assert.throws(() => assertPromptedTokenPersistedOnlyAfterProof(template), assert.AssertionError, 'the mutated copy persists the prompted token before the proof and must fail the source-order test');
});

test('mutation: lowering the Playwright floor to 1.49 lets a 1.50 package through (the FAILED_INDEXEDDB_UNSUPPORTED test is what catches it)', async () => {
  const template = mutatedTemplate('return major > 1 || (major === 1 && minor >= 51);', 'return major > 1 || (major === 1 && minor >= 49);');
  const d = await project(idbRole(), { template, fakePlaywright: '1.50.0' });
  const r = await login(d);
  assert.doesNotMatch(r.e, /FAILED_INDEXEDDB_UNSUPPORTED/);
});
