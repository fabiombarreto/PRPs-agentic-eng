// @ts-check
// PRPs/prds/test-auth-minted-session.prd.md AC-9 A run never starts on a minted session about to expire; a session inside the re-mint margin is re-minted before the first case
// PRPs/prds/test-auth-minted-session.prd.md AC-10 No minted cookie, localStorage, token or IndexedDB value reaches a run file, a result or the terminal; the minted halts are named, value-free blocked reasons
// PRPs/prds/test-auth-minted-session.prd.md AC-13 (mapped, not duplicated) pinned by auth-minted-session.test.mjs:679 'the code-review loop files and capture.mjs are byte-identical to their pre-feature content'
/**
 * Behavioral tests for the runner integration of the `minted` mechanism
 * (phase 3 of test-auth-minted-session): plugins/relay/scripts/qa-run.mjs.
 *
 * Source PRD:  PRPs/prds/test-auth-minted-session.prd.md (AC-9, AC-10, AC-13)
 * Source plan: PRPs/plans/completed/test-auth-minted-session-phase-3-runner-integration.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every runner scenario
 * runs the REAL runner as an ASYNC child process (a synchronous spawn would block this
 * process's event loop and deadlock the loopback server) against a temp git project that
 * holds a copy of the REAL login template, a fake mint command written next to it, and one
 * in-process 127.0.0.1 application. The runner is run with no terminal and no credential.
 * Cases are HTTP cases, so no browser is involved.
 *
 * Phase 1's tests (auth-minted-session.test.mjs) own the template's own mint, proof and
 * reuse behavior; phase 2's own the kit authoring. This file only covers what the RUNNER
 * adds: the pre-run re-mint margin, the redaction of minted values, the named minted halts.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PLUGIN = join(REPO, 'plugins', 'relay');
const RUNNER = join(PLUGIN, 'scripts', 'qa-run.mjs');
const TEMPLATE = readFileSync(join(PLUGIN, 'resources', 'auth-login.template.mjs'), 'utf8').replace(/\r\n/g, '\n');

const { mintExpiryDue, collectIndexedDbSecrets } = await import(pathToFileURL(RUNNER).href);
const { validateResults } = await import(pathToFileURL(join(HERE, 'qa-run-contract.mjs')).href);

const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const REPORT_REL = `PRPs/reports/${FEATURE}/qa-report.md`;

// Distinctive fixture secrets: the leak scan has fixed needles.
const COOKIE_NAME = 'sid';
const COOKIE_VALUE = 'MINT-COOKIE-7f3a91';
const LS_KEY = 'app_state';
const LS_VALUE = 'MINT-LS-5c20bd';
const TOKEN_VALUE = 'MINT-TOKEN-e41d08';
const STDERR_LINE = 'MINT-STDERR-LINE-b83c52';
const IDB_VALUE = 'MINT-IDB-9a4e17';
const IDB_OBJ_VALUE = 'MINT-IDB-OBJ-62c0d3';
const NEEDLES = [COOKIE_VALUE, LS_VALUE, TOKEN_VALUE, STDERR_LINE, IDB_VALUE, IDB_OBJ_VALUE];

// ---------------------------------------------------------------------------
// The fake mint command (a plain node script written into a temp dir)
// ---------------------------------------------------------------------------

const FAKE_MINT_SOURCE = `import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : dflt; };
const mode = opt('--mode', 'ok');
const countFile = opt('--count-file', null);
const ttl = Number(opt('--ttl', '3600'));
if (countFile) appendFileSync(countFile, 'run\\n');
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
  case 'unknown-key': process.stdout.write(JSON.stringify({ ...okBody(), extra: 'x' })); break;
  case 'exit3': process.stderr.write(${JSON.stringify(`${STDERR_LINE}\n`)}); process.exit(3); break;
  default: process.exit(4);
}
`;

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

const app = { loginRequests: 0 };

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
let port = 0;
let origin = '';
let fakeMint = '';
/** @type {string[]} */
const temps = [];
let envFile = '';

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    if (path.includes('login')) app.loginRequests++;
    /** @param {number} code @param {any} body */
    const json = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const auth = String(req.headers.authorization || '');
    if (path === '/ok') return json(200, { path: 'ok', ok: true });
    if (path === '/api/me') {
      const ok = auth.startsWith('Bearer ') && jwtCarriesToken(auth.slice(7));
      return json(ok ? 200 : 401, { ok });
    }
    if (path === '/echo') return json(200, { cookie: String(req.headers.cookie || ''), authorization: auth });
    if (path === '/leak-idb') return json(200, { note: `value ${IDB_VALUE} and ${IDB_OBJ_VALUE}` });
    return json(404, { nf: true });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {any} */ (server.address()).port;
  origin = `http://127.0.0.1:${port}`;
  const d = mkdtempSync(join(tmpdir(), 'relay-minted-run-cmd-'));
  temps.push(d);
  fakeMint = join(d, 'fake-mint.mjs');
  writeFileSync(fakeMint, FAKE_MINT_SOURCE);
  envFile = join(d, 'empty.gitconfig');
  writeFileSync(envFile, '');
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
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function spawnNode(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    const env = { ...process.env, GIT_CONFIG_GLOBAL: envFile, GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: dirname(tmpdir()) };
    delete env.CLAUDE_PLUGIN_ROOT;
    const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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
      resolveP({ code, stdout, stderr });
    });
  });
}

/** @param {string} dir @returns {string} concatenated text of every file under dir */
function dirText(dir) {
  let t = '';
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    t += e.isDirectory() ? dirText(p) : `\n${readFileSync(p).toString('latin1')}`;
  }
  return t;
}

/** @param {{ title: string }[]} cases */
function reportText(cases) {
  const blocks = cases.map((c, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${c.title}`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      '1. Open the page.',
      '2. Check the result.',
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/** @param {string} path @param {number} [status] */
const getStep = (path, status = 200) => ({ action: 'request', method: 'GET', path, expect_status: status });

/**
 * A fixture project: one HTTP case per step list, a login script and the config for role `admin`.
 * @param {{ steps: any[], role: any, loginBody: string }} o
 */
async function makeProject(o) {
  const root = mkdtempSync(join(tmpdir(), 'relay-minted-run-'));
  temps.push(root);
  await execFileP('git', ['init', '-q', root], { env: { ...process.env, GIT_CONFIG_GLOBAL: envFile, GIT_CONFIG_NOSYSTEM: '1' } });
  const runDir = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, ...REPORT_REL.split('/')), reportText([{ title: 'Case under test' }]));
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: origin, roles: { admin: o.role } }));
  const plan = [{ index: 1, title: 'Case under test', driver: 'http', role: 'admin', state: 'role-only', steps: o.steps }];
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: plan }));
  const loginScript = join(root, 'PRPs', 'auth', 'login-admin.mjs');
  writeFileSync(loginScript, o.loginBody, 'utf8');
  return { root, runDir, loginScript, countFile: join(root, 'count.txt') };
}

/** @param {{ root: string, loginScript: string }} p */
const runLogin = (p) => spawnNode([p.loginScript, '--root', p.root, '--plugin-root', PLUGIN], p.root);
/** @param {{ root: string }} p */
const runRunner = (p) => spawnNode([RUNNER, 'run', '--root', p.root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL], p.root);
/** @param {{ countFile: string }} p */
const mints = (p) => (existsSync(p.countFile) ? readFileSync(p.countFile, 'utf8').split('\n').filter(Boolean).length : 0);
/** @param {{ runDir: string }} p @returns {any} */
const resultsOf = (p) => JSON.parse(readFileSync(join(p.runDir, 'results.json'), 'utf8'));

/** The template carries one placeholder: the generated script is the template with the role substituted. */
const templateBody = () => TEMPLATE.split('__RELAY_ROLE__').join('admin');

/**
 * @param {string} countFile
 * @param {{ mode?: string, ttl?: number, mint?: Record<string, any> }} [o]
 */
function mintedRole(countFile, o = {}) {
  return {
    mechanism: 'minted',
    loginPath: null,
    form: null,
    api: null,
    probe: { path: '/api/me', method: 'GET' },
    sessionCookie: COOKIE_NAME,
    maxAgeMinutes: 60,
    credentials: { usernameEnv: null, passwordEnv: null },
    userCreation: { command: null },
    mint: { command: [process.execPath, fakeMint, '--mode', o.mode ?? 'ok', '--ttl', String(o.ttl ?? 200), '--count-file', countFile], store: `127.0.0.1:${port}`, status: 'confirmed', ...(o.mint ?? {}) },
  };
}

/**
 * The secrecy scan: no needle (nor the full JWT the mint produced) in any file of the run
 * directory, nor in either terminal stream.
 * @param {{ root: string, runDir: string }} p
 * @param {{ stdout: string, stderr: string }} r
 * @param {string[]} needles
 */
function assertNoLeak(p, r, needles) {
  const all = [...needles];
  const art = join(p.root, 'PRPs', 'auth', '.sessions', 'admin.token.json');
  if (existsSync(art)) {
    const t = JSON.parse(readFileSync(art, 'utf8')).token;
    if (typeof t === 'string' && t !== '') all.push(t);
  }
  const files = dirText(p.runDir);
  for (const n of all) {
    assert.ok(!files.includes(n), `a secret value is present in the run directory: ${n.slice(0, 12)}...`);
    assert.ok(!r.stdout.includes(n) && !r.stderr.includes(n), `a secret value appeared in the terminal output: ${n.slice(0, 12)}...`);
  }
}

/**
 * A minted project whose session was already minted once (by the login script, run directly) with the given lifetime.
 * @param {number} ttl seconds
 * @param {any[]} steps
 */
async function preMintedProject(ttl, steps) {
  const p = await makeProject({ steps, role: null, loginBody: templateBody() });
  writeFileSync(join(p.root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: origin, roles: { admin: mintedRole(p.countFile, { ttl }) } }));
  const l = await runLogin(p);
  assert.equal(l.code, 0, `the direct login failed: ${l.stdout}${l.stderr}`);
  assert.equal(mints(p), 1, 'the direct login minted exactly once');
  const side = JSON.parse(readFileSync(join(p.root, 'PRPs', 'auth', '.sessions', 'admin.mint.json'), 'utf8'));
  assert.equal(typeof side.expires_at, 'string', 'the login script recorded an expiry in the sidecar');
  return p;
}

// ---------------------------------------------------------------------------
// AC-9 (unit): the margin decision
// ---------------------------------------------------------------------------

test('AC-9: an expiry at or inside the margin is due, one beyond it is not, an expired one is due', () => {
  const now = 1_000_000_000_000;
  const at = (/** @type {number} */ offsetMs) => new Date(now + offsetMs).toISOString();
  assert.equal(mintExpiryDue(at(100_000), now), true, '100 s ahead is inside the 240 s margin');
  assert.equal(mintExpiryDue(at(240_000), now), true, 'exactly the margin ahead is due');
  assert.equal(mintExpiryDue(at(241_000), now), false, 'just past the margin is not due');
  assert.equal(mintExpiryDue(at(900_000), now), false, 'far from expiry is not due');
  assert.equal(mintExpiryDue(at(-3_600_000), now), true, 'an already expired session is due');
  assert.equal(mintExpiryDue(at(100_000), now, 50_000), false, 'an explicit smaller margin is honored');
  assert.equal(mintExpiryDue(at(100_000), now, 100_000), true, 'an explicit margin equal to the remaining time is due');
});

test('AC-9: an absent, non-string or unparseable expiry never forces a re-mint', () => {
  const now = 1_000_000_000_000;
  for (const bad of [undefined, null, '', 'nope', 12345, {}, [], true]) {
    assert.equal(mintExpiryDue(bad, now), false, `not due for ${JSON.stringify(bad)}`);
  }
});

// ---------------------------------------------------------------------------
// AC-10 (unit): IndexedDB secret collection
// ---------------------------------------------------------------------------

/** @param {any[]} records @param {string} [storesKey] */
const idbState = (records, storesKey = 'stores') => ({
  cookies: [],
  origins: [{ origin: 'http://127.0.0.1:1', localStorage: [], indexedDB: [{ name: 'dbname-schema', version: 1, [storesKey]: [{ name: 'storename-schema', records }] }] }],
});

test('AC-10: IndexedDB record keys and values are collected, nested values and their serialized form included, schema names never', () => {
  const got = collectIndexedDbSecrets(
    idbState([
      { key: 'rec-key-one', value: 'rec-value-two' },
      { key: 3, value: { a: 'obj-secret-three', deep: ['arr-secret-four', { x: 'nested-secret-five' }] } },
    ]),
  );
  for (const needle of ['rec-key-one', 'rec-value-two', 'obj-secret-three', 'arr-secret-four', 'nested-secret-five']) {
    assert.ok(got.includes(needle), `${needle} is collected`);
  }
  assert.ok(
    got.includes(JSON.stringify({ a: 'obj-secret-three', deep: ['arr-secret-four', { x: 'nested-secret-five' }] })),
    'the serialized form of an object value is collected too (an application may echo it)',
  );
  for (const schema of ['dbname-schema', 'storename-schema']) assert.ok(!got.includes(schema), `${schema} (a database or store name) is not collected`);
});

test('AC-10: the objectStores alias is read, and any other shape yields an empty list without throwing', () => {
  assert.ok(collectIndexedDbSecrets(idbState([{ key: 'k-alias-key', value: 'v-alias-value' }], 'objectStores')).includes('v-alias-value'));
  for (const odd of [undefined, null, {}, { origins: null }, { origins: [null, 7, {}] }, { origins: [{ indexedDB: 'x' }] }, { origins: [{ indexedDB: [null, { stores: 'x' }, { stores: [null, { records: 'x' }, { records: [null, 'str'] }] }] }] }]) {
    assert.deepEqual(collectIndexedDbSecrets(odd), [], `empty for ${JSON.stringify(odd)}`);
  }
});

// ---------------------------------------------------------------------------
// AC-9: the re-mint before the first case, through the runner
// ---------------------------------------------------------------------------

test('AC-9: a minted session whose expiry is inside the margin is re-minted before the first case, which then passes on the fresh token, with no login request', { timeout: 120000 }, async () => {
  app.loginRequests = 0;
  const p = await preMintedProject(200, [getStep('/api/me')]);
  const r = await runRunner(p);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  const c = resultsOf(p).cases[0];
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.equal(mints(p), 2, 'the runner had the script mint a fresh session before the case (initial mint + one re-mint)');
  assert.equal(app.loginRequests, 0, 'no login request was made');
  assert.ok(!(r.stdout + r.stderr).includes('SESSION_MINTED'), 'the script status line did not reach the terminal');
  assertNoLeak(p, r, NEEDLES);
});

test('AC-9 control: a minted session comfortably outside the margin is reused with no extra mint', { timeout: 120000 }, async () => {
  const p = await preMintedProject(3600, [getStep('/api/me')]);
  const r = await runRunner(p);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  assert.equal(resultsOf(p).cases[0].outcome, 'pass', JSON.stringify(resultsOf(p).cases[0]));
  assert.equal(mints(p), 1, 'no needless rotation: the saved session was reused');
  assertNoLeak(p, r, NEEDLES);
});

test('AC-9 control: a role that is not minted is never called with --force', { timeout: 120000 }, async () => {
  const argvLog = join(mkdtempSync(join(tmpdir(), 'relay-minted-argv-')), 'argv.txt');
  temps.push(dirname(argvLog));
  const stub = `import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';\nimport { join } from 'node:path';\nconst root = process.argv[process.argv.indexOf('--root') + 1];\nappendFileSync(${JSON.stringify(argvLog)}, process.argv.slice(2).join(' ') + '\\n');\nmkdirSync(join(root, 'PRPs', 'auth', '.sessions'), { recursive: true });\nwriteFileSync(join(root, 'PRPs', 'auth', '.sessions', 'admin.json'), ${JSON.stringify(JSON.stringify({ cookies: [], origins: [] }))});\n`;
  const p = await makeProject({ steps: [getStep('/ok')], role: { mechanism: 'api' }, loginBody: stub });
  // Even a (stale) minted-looking sidecar must not make a non-minted role forced.
  mkdirSync(join(p.root, 'PRPs', 'auth', '.sessions'), { recursive: true });
  writeFileSync(join(p.root, 'PRPs', 'auth', '.sessions', 'admin.mint.json'), JSON.stringify({ minted_at: new Date().toISOString(), expires_at: new Date(Date.now() + 1000).toISOString() }));
  const r = await runRunner(p);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  assert.equal(resultsOf(p).cases[0].outcome, 'pass');
  const argv = readFileSync(argvLog, 'utf8');
  assert.ok(argv.trim() !== '', 'the login script was called');
  assert.ok(!argv.includes('--force'), `--force was passed to a non-minted role: ${argv}`);
});

// ---------------------------------------------------------------------------
// AC-10: nothing minted reaches a run file, a result or the terminal
// ---------------------------------------------------------------------------

test('AC-10: the cookie, token and localStorage values minted DURING the run are redacted from the evidence of a case that echoes them', { timeout: 120000 }, async () => {
  const p = await preMintedProject(200, [getStep('/echo')]);
  const r = await runRunner(p);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  assert.equal(resultsOf(p).cases[0].outcome, 'pass');
  assert.equal(mints(p), 2, 'the token under test is the one forced-minted during the run');
  assert.ok(dirText(p.runDir).includes('[REDACTED]'), 'the echoed values were replaced by the redaction marker, not absent');
  assertNoLeak(p, r, NEEDLES);
});

test('AC-10: IndexedDB record keys and values of the saved session (strings and object values) are redacted from the evidence', { timeout: 120000 }, async () => {
  const state = {
    cookies: [{ name: COOKIE_NAME, value: COOKIE_VALUE, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }],
    origins: [
      {
        origin,
        localStorage: [],
        indexedDB: [{ name: 'appdb', version: 1, stores: [{ name: 'kv', autoIncrement: false, indexes: [], records: [{ key: 'token', value: IDB_VALUE }, { key: 'profile', value: { tok: IDB_OBJ_VALUE } }] }] }],
      },
    ],
  };
  const stub = `import { writeFileSync, mkdirSync } from 'node:fs';\nimport { join } from 'node:path';\nconst root = process.argv[process.argv.indexOf('--root') + 1];\nmkdirSync(join(root, 'PRPs', 'auth', '.sessions'), { recursive: true });\nwriteFileSync(join(root, 'PRPs', 'auth', '.sessions', 'admin.json'), ${JSON.stringify(JSON.stringify(state))});\n`;
  const p = await makeProject({ steps: [getStep('/leak-idb')], role: { mechanism: 'api' }, loginBody: stub });
  const r = await runRunner(p);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  assert.equal(resultsOf(p).cases[0].outcome, 'pass');
  assert.ok(dirText(p.runDir).includes('[REDACTED]'), 'the echoed IndexedDB values were replaced by the redaction marker');
  assertNoLeak(p, r, [IDB_VALUE, IDB_OBJ_VALUE]);
});

// ---------------------------------------------------------------------------
// AC-10: the five minted halts are named, value-free blocked reasons
// ---------------------------------------------------------------------------

/** @type {[string, { mode?: string, mint?: Record<string, any> }][]} */
const MINT_HALTS = [
  ['FAILED_MINT_UNCONFIRMED', { mint: { status: 'proposed' } }],
  ['FAILED_MINT_COMMAND_MISSING', { mint: { command: null } }],
  ['FAILED_NON_LOCAL_TARGET', { mint: { store: 'prod.example.com' } }],
  ['FAILED_MINT_COMMAND', { mode: 'exit3' }],
  ['FAILED_MINT_OUTPUT', { mode: 'unknown-key' }],
];

for (const [code, opt] of MINT_HALTS) {
  test(`AC-10: a minted role's ${code} halt is a blocked case carrying that code and a value-free reason naming the role`, { timeout: 120000 }, async () => {
    const p = await makeProject({ steps: [getStep('/api/me')], role: null, loginBody: templateBody() });
    writeFileSync(join(p.root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: origin, roles: { admin: mintedRole(p.countFile, opt) } }));
    const r = await runRunner(p);
    assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
    const res = resultsOf(p);
    const c = res.cases[0];
    assert.equal(c.outcome, 'blocked', JSON.stringify(c));
    assert.equal(c.reason_code, code, 'the named code, not the generic SESSION_UNAVAILABLE');
    assert.match(String(c.reason), /\badmin\b/, 'the reason names the role');
    assert.ok(String(c.reason).trim().length > 20, 'the reason is an actionable sentence');
    for (const n of NEEDLES) assert.ok(!String(c.reason).includes(n), 'the reason carries no value');
    assert.deepEqual(validateResults(res), [], 'results.json satisfies the runner contract');
    assertNoLeak(p, r, NEEDLES);
  });
}

test('AC-10: the two operator-fixable minted halts tell the operator where to fix them', { timeout: 120000 }, async () => {
  for (const [code, opt] of MINT_HALTS.slice(0, 2)) {
    const p = await makeProject({ steps: [getStep('/api/me')], role: null, loginBody: templateBody() });
    writeFileSync(join(p.root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: origin, roles: { admin: mintedRole(p.countFile, opt) } }));
    const r = await runRunner(p);
    const c = resultsOf(p).cases[0];
    assert.equal(c.reason_code, code);
    assert.match(String(c.reason), /login\.config\.json/, `${code}: the reason names the file to edit`);
    assert.equal(mints(p), 0, `${code}: nothing was run`);
    assert.equal(r.code, 0);
  }
});

test('AC-10 control: the same halt codes on a role that is not minted stay SESSION_UNAVAILABLE', { timeout: 120000 }, async () => {
  for (const code of ['FAILED_MINT_COMMAND', 'FAILED_NON_LOCAL_TARGET']) {
    const stub = `process.stderr.write(${JSON.stringify(`${code}\n`)});\nprocess.exit(1);\n`;
    const p = await makeProject({ steps: [getStep('/ok')], role: { mechanism: 'api' }, loginBody: stub });
    const r = await runRunner(p);
    assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
    const c = resultsOf(p).cases[0];
    assert.equal(c.outcome, 'blocked', JSON.stringify(c));
    assert.equal(c.reason_code, 'SESSION_UNAVAILABLE', `${code} on a non-minted role is not renamed`);
  }
});

// ---------------------------------------------------------------------------
// AC-9 / AC-10 (operator-facing): the documents describe the behavior
// ---------------------------------------------------------------------------

const MINT_CODES = MINT_HALTS.map(([c]) => c);
/** @param {...string} rel */
const readDoc = (...rel) => readFileSync(join(REPO, ...rel), 'utf8').replace(/\r\n/g, '\n');

test('AC-9/AC-10 docs: the command document names the five minted halts, the 240-second pre-run re-mint and IndexedDB redaction', () => {
  const md = readDoc('plugins', 'relay', 'commands', 'relay-qa-run.md');
  for (const c of MINT_CODES) assert.ok(md.includes(c), `relay-qa-run.md names ${c}`);
  assert.match(md, /240/, 'the margin is documented');
  assert.match(md, /--force/, 'the mechanism is documented');
  assert.match(md, /IndexedDB/, 'IndexedDB redaction is documented');
  assert.ok(md.includes('SESSION_UNAVAILABLE'), 'the generic reason is still documented for every other failure');
});

test('AC-9/AC-10 docs: the API reference, the documentation site and the changelog name the minted halts', () => {
  const api = readDoc('docs', 'api-reference.md');
  const cmds = readDoc('documentation', 'reference', 'commands.html');
  const scripts = readDoc('documentation', 'reference', 'scripts.html');
  for (const c of MINT_CODES.filter((x) => x !== 'FAILED_NON_LOCAL_TARGET')) {
    assert.ok(api.includes(c), `docs/api-reference.md names ${c}`);
    assert.ok(cmds.includes(c), `commands.html names ${c}`);
    assert.ok(scripts.includes(c), `scripts.html names ${c}`);
  }
  assert.match(api, /240/, 'api-reference.md documents the margin');
  const log = readDoc('documentation', 'changelog.html');
  assert.ok(log.includes('FAILED_MINT_OUTPUT'), 'the changelog has an entry for the named minted reasons');
  assert.match(log, /IndexedDB/, 'the changelog entry mentions IndexedDB redaction');
});
