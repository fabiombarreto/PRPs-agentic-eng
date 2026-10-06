// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-1 Local-only guard is a hard failure (runner slice)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-2 Every case gets an outcome (N in, N out, including on abort)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-3 No driver, no silent pass (needs-human with steps verbatim)
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-4 Closed outcome vocabulary
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-6 Credential values never reach evidence
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-7 The QA report is untouched
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-8 A runner pass is evidence, not the gate
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-13 Real UTC instants
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-14 Required state comes only from declared sources
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-15 Evidence is written and redacted
/**
 * Behavioral tests for plugins/relay/scripts/qa-run.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-4-the-runner.plan.md
 *
 * Every test runs the REAL script as a child process (async cp.spawn wrapped in
 * a Promise: a synchronous spawn would block this process's event loop and
 * deadlock the loopback HTTP servers the runner talks to) against a temp
 * fixture project and 127.0.0.1 servers. The real Chromium + playwright path is
 * used for the browser driver; there are no skip conditions.
 *
 * Mutation proofs: where a guard cannot be broken through input alone, the
 * script is COPIED (the original is never edited) into a temp plugin dir, one
 * anchored token is replaced (the helper asserts the anchor occurs exactly
 * once), and the same fixture is re-run to show the guard is what held the line.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
  copyFileSync,
  appendFileSync,
  statSync,
} from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

import { validateResults } from './qa-run-contract.mjs';

const REAL_SCRIPT = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const REAL_SOURCE = readFileSync(REAL_SCRIPT, 'utf8').replace(/\r\n/g, '\n');
const NODE_MODULES = resolve('node_modules');

const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const REPORT_REL = `PRPs/reports/${FEATURE}/qa-report.md`;
const ISO_MS = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

const ENV_SECRET = 'envsecretvalue-Zq83kd01';
const SESSION_COOKIE = 'sessioncookievalue-77Hh2k9';
const AWS_KEY = 'AKIAABCDEFGHIJKLMNOP';

// ---------------------------------------------------------------------------
// Loopback servers (the test process serves; the runner is always a child)
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
let hits = {};
/** @type {string} */
let lastCookie = '';
/** @type {(() => void) | null} */
let reportMutation = null;
/** @type {import('node:http').Server} */
let server;
/** @type {import('node:http').Server} */
let other;
let port = 0;
let otherPort = 0;
let baseUrl = '';

/** @param {string} p */
function hit(p) {
  hits[p] = (hits[p] ?? 0) + 1;
}

before(async () => {
  other = createServer((req, res) => {
    hit(`other:${String(req.url).split('?')[0]}`);
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('other');
  });
  await new Promise((r) => other.listen(0, '127.0.0.2', () => r(null)));
  otherPort = /** @type {any} */ (other.address()).port;

  server = createServer((req, res) => {
    const full = String(req.url);
    const path = full.split('?')[0];
    hit(path);
    lastCookie = String(req.headers.cookie ?? '');
    if (path === '/ok') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, n: 1 }));
    } else if (path === '/redirect') {
      res.writeHead(302, { location: '/target' });
      res.end();
    } else if (path === '/target') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('target');
    } else if (path === '/boom') {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('boom');
    } else if (path === '/leak') {
      res.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'set-cookie': 'sid=cookie-secret-value-1; Path=/',
        'x-session': 'rawheadervalue777',
      });
      res.end(
        JSON.stringify({
          password: 'pw-struct-1234',
          token: 'tok-struct-5678',
          nested: { authorization: 'Bearer abc' },
          note: `inline ${ENV_SECRET} value`,
          aws: AWS_KEY,
          ok: true,
        }),
      );
    } else if (path === '/text') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`plain body with ${ENV_SECRET} inside`);
    } else if (path === '/echo') {
      req.resume();
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    } else if (path === '/whoami') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ echo: lastCookie }));
    } else if (path === '/mutate-report') {
      if (reportMutation) reportMutation();
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('mutated');
    } else if (path === '/page') {
      const secret = full.includes('secret=1') ? ` ${ENV_SECRET}` : '';
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><html><body><h1 id="t">Hello QA${secret}</h1><input type="password" value="pw"></body></html>`);
    } else if (path === '/page-sub') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><html><body><h1 id="t">Sub</h1><img src="http://127.0.0.2:${otherPort}/pixel"></body></html>`);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('nf');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {any} */ (server.address()).port;
  baseUrl = `http://127.0.0.1:${port}`;
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
 * @param {string} scriptPath
 * @param {string[]} args
 * @param {{ cwd?: string, env?: Record<string, string> }} [opts]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(scriptPath, args, opts = {}) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
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
      resolveP({ code, stdout, stderr });
    });
  });
}

/**
 * @param {{ title: string, risk?: string, state?: string, steps?: string[] }[]} cases
 * @returns {string}
 */
function reportText(cases) {
  const blocks = cases.map((c, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${c.title}`,
      `**Risk level:** ${c.risk ?? 'low'}`,
      `**Required state:** ${c.state ?? 'None'}`,
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      ...(c.steps ?? ['1. Open the page.', '2. Check the result.']),
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/**
 * @param {number} index
 * @param {string} title
 * @param {any[]} steps
 * @param {Record<string, any>} [extra]
 */
function httpEntry(index, title, steps, extra = {}) {
  return { index, title, driver: 'http', role: null, state: 'none', steps, ...extra };
}

/** @param {string} path @param {Record<string, any>} [extra] */
const get = (path, extra = {}) => ({ action: 'request', method: 'GET', path, ...extra });

/**
 * @param {{ baseUrl?: string | null, cases: { title: string, risk?: string, state?: string, steps?: string[] }[], plan?: any[] | null, roles?: Record<string, any>, files?: Record<string, string> }} o
 */
function makeFixture(o) {
  const root = mkdtempSync(join(tmpdir(), 'relay-qarun-'));
  temps.push(root);
  mkdirSync(join(root, ...RUN_DIR_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, ...REPORT_REL.split('/')), reportText(o.cases));
  const bu = o.baseUrl === undefined ? baseUrl : o.baseUrl;
  const cfg = { ...(bu === null ? {} : { baseUrl: bu }), roles: o.roles ?? {} };
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify(cfg));
  if (o.plan) {
    writeFileSync(join(root, ...RUN_DIR_REL.split('/'), 'plan.json'), JSON.stringify({ schema_version: 1, cases: o.plan }));
  }
  for (const [rel, text] of Object.entries(o.files ?? {})) {
    mkdirSync(join(root, ...rel.split('/').slice(0, -1)), { recursive: true });
    writeFileSync(join(root, ...rel.split('/')), text);
  }
  const reportAbs = join(root, ...REPORT_REL.split('/'));
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  return {
    root,
    reportAbs,
    runDirAbs,
    resultsPath: join(runDirAbs, 'results.json'),
    /** @returns {any | null} */
    results() {
      return existsSync(join(runDirAbs, 'results.json')) ? JSON.parse(readFileSync(join(runDirAbs, 'results.json'), 'utf8')) : null;
    },
  };
}

/** @param {string} p @returns {string} */
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/**
 * @param {ReturnType<typeof makeFixture>} fx
 * @param {{ script?: string, env?: Record<string, string>, args?: string[] }} [o]
 */
async function runRun(fx, o = {}) {
  const proc = await runScript(
    o.script ?? REAL_SCRIPT,
    ['run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL, ...(o.args ?? [])],
    { cwd: fx.root, env: o.env },
  );
  return { ...proc, results: fx.results() };
}

/** @param {string} dir @returns {string[]} every file path under dir, sorted, relative with forward slashes */
function listFiles(dir) {
  /** @type {string[]} */ const out = [];
  /** @param {string} d */
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(dir, p).split('\\').join('/'));
    }
  };
  walk(dir);
  return out.sort();
}

/** @param {string} dir @returns {string} the concatenated text of every runner-written file under dir except the test-authored plan.json (binary read as latin1) */
function allText(dir) {
  return listFiles(dir)
    .filter((f) => f !== 'plan.json')
    .map((f) => readFileSync(join(dir, f)).toString('latin1'))
    .join('\n');
}

/**
 * Replaces an anchor that must occur exactly once.
 * @param {string} src @param {string} from @param {string} to
 */
function mutate(src, from, to) {
  const n = src.split(from).length - 1;
  assert.equal(n, 1, `mutation anchor must occur exactly once, found ${n}: ${from.slice(0, 70)}`);
  return src.replace(from, () => to);
}

/**
 * Copies the runner (optionally mutated) and the guard into a temp plugin tree.
 * @param {{ mutations?: [string, string][], omitGuard?: boolean }} [o]
 * @returns {string} the copied script path
 */
function pluginCopy(o = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-qarun-plugin-'));
  temps.push(dir);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  let src = REAL_SOURCE;
  for (const [from, to] of o.mutations ?? []) src = mutate(src, from, to);
  const script = join(dir, 'scripts', 'qa-run.mjs');
  writeFileSync(script, src);
  if (!o.omitGuard) copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return script;
}
/** Playwright resolves from the repo's node_modules for copied runners. */
const COPY_ENV = { NODE_PATH: NODE_MODULES };

const OK_STEPS = [get('/ok', { expect_status: 200, expect_json: { path: 'ok', equals: true } })];

// ---------------------------------------------------------------------------
// Baseline: AC-2, AC-7, AC-8, AC-13, AC-15
// ---------------------------------------------------------------------------

test('baseline run (AC-2/7/8/13/15): N cases give N pass entries with evidence, untouched report, open human gate, real ISO stamps', async () => {
  const fx = makeFixture({
    cases: [{ title: 'Health returns ok' }, { title: 'Body mentions ok' }],
    plan: [
      httpEntry(1, 'Health returns ok', OK_STEPS),
      httpEntry(2, 'Body mentions ok', [get('/ok', { expect_body_contains: '"ok":true' })]),
    ],
  });
  const before = sha(fx.reportAbs);
  const bytes = readFileSync(fx.reportAbs);
  const filesBefore = listFiles(fx.root);
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  const res = r.results;
  assert.equal(res.cases.length, 2);
  assert.deepEqual(res.counts, { pass: 2, fail: 0, blocked: 0, 'needs-human': 0 });
  assert.equal(res.aborted, null);
  assert.deepEqual(res.human_gate, { status: 'open', review_file: REPORT_REL });
  assert.equal(res.report_sha256_before, before);
  assert.equal(res.report_sha256_after, before);
  assert.ok(readFileSync(fx.reportAbs).equals(bytes), 'the report is byte-identical after the run');
  assert.ok(r.stdout.includes('HUMAN GATE STILL OPEN'));
  assert.ok(r.stdout.includes(`Review file: ${REPORT_REL}`));
  assert.deepEqual(validateResults(res), [], 'results.json satisfies the contract validator');
  for (const stamp of [res.started_at, res.finished_at, ...res.cases.flatMap((c) => [c.started_at, c.finished_at])]) {
    assert.match(stamp, ISO_MS);
    assert.ok(!stamp.endsWith('T00:00:00.000Z'));
  }
  assert.ok(Date.parse(res.started_at) <= Date.parse(res.finished_at));
  for (const c of res.cases) {
    assert.ok(Date.parse(c.started_at) <= Date.parse(c.finished_at));
    assert.equal(c.evidence.length, 1);
    assert.ok(c.evidence[0].startsWith(`${RUN_DIR_REL}/evidence/`));
    assert.ok(existsSync(join(fx.root, ...c.evidence[0].split('/'))));
    assert.equal(c.manual_steps_verbatim, null, 'a pass does not carry the manual steps');
  }
  const ev = JSON.parse(readFileSync(join(fx.root, ...res.cases[0].evidence[0].split('/')), 'utf8'));
  assert.equal(ev.response.status, 200);
  // The runner wrote only results.json and evidence under the run dir (plan.json was ours).
  const added = listFiles(fx.root).filter((f) => !filesBefore.includes(f));
  assert.ok(added.length > 0);
  for (const f of added) assert.ok(f.startsWith(`${RUN_DIR_REL}/`), `unexpected write outside the run dir: ${f}`);
});

test('AC-8 sensitivity: with the human-gate sentence mutated away the baseline predicate fails (the assertion is real)', async () => {
  const script = pluginCopy({ mutations: [['HUMAN GATE STILL OPEN: a runner pass', 'GATE NOTE: a runner pass']] });
  const fx = makeFixture({ cases: [{ title: 'Health returns ok' }], plan: [httpEntry(1, 'Health returns ok', OK_STEPS)] });
  const r = await runRun(fx, { script, env: COPY_ENV });
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.stdout.includes('HUMAN GATE STILL OPEN'), false);
  assert.ok(r.stdout.includes(`Review file: ${REPORT_REL}`));
});

// ---------------------------------------------------------------------------
// AC-3 / AC-4: outcomes, closed vocabulary
// ---------------------------------------------------------------------------

test('AC-3/AC-4: a mixed run lands every case in the closed vocabulary; unplanned and non-active-driver cases are needs-human with the steps verbatim', async () => {
  const manual = ['1. Open the inbox.', '2. Click the reset link in the email.'];
  const fx = makeFixture({
    cases: [
      { title: 'Passing case' },
      { title: 'Failing case' },
      { title: 'Off-origin case' },
      { title: 'Unplanned email case', steps: manual },
      { title: 'Email driver case', steps: manual },
      { title: 'No expectation case' },
    ],
    plan: [
      httpEntry(1, 'Passing case', OK_STEPS),
      httpEntry(2, 'Failing case', [get('/boom', { expect_status: 200 })]),
      httpEntry(3, 'Off-origin case', [get('http://evil.example/x', { expect_status: 200 })]),
      httpEntry(5, 'Email driver case', [], { driver: 'email' }),
      httpEntry(6, 'No expectation case', [get('/ok')]),
    ],
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  const byIdx = Object.fromEntries(r.results.cases.map((c) => [c.index, c]));
  assert.equal(byIdx[1].outcome, 'pass');
  assert.equal(byIdx[2].outcome, 'fail');
  assert.equal(byIdx[2].evidence.length, 1, 'a fail carries evidence');
  assert.match(byIdx[2].reason, /expected status 200, got 500/);
  assert.equal(byIdx[3].outcome, 'blocked');
  assert.equal(byIdx[3].reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(byIdx[4].outcome, 'needs-human');
  assert.equal(byIdx[4].reason_code, 'NO_PLAN_ENTRY');
  assert.equal(byIdx[4].manual_steps_verbatim, manual.join('\n'));
  assert.equal(byIdx[5].outcome, 'needs-human');
  assert.equal(byIdx[5].reason_code, 'NO_ACTIVE_DRIVER');
  assert.equal(byIdx[5].manual_steps_verbatim, manual.join('\n'));
  assert.equal(byIdx[6].outcome, 'needs-human');
  assert.equal(byIdx[6].reason_code, 'NO_EXPECTATION');
  for (const c of r.results.cases) assert.ok(['pass', 'fail', 'blocked', 'needs-human'].includes(c.outcome));
  assert.deepEqual(r.results.counts, { pass: 1, fail: 1, blocked: 1, 'needs-human': 3 });
  assert.deepEqual(validateResults(r.results), []);
  assert.ok(r.stdout.includes('case 4: needs-human (NO_PLAN_ENTRY)'));
  assert.equal(hits['/boom'] >= 1, true);
});

test('AC-4: an out-of-vocabulary value from a driver is downgraded to blocked/RUNNER_ERROR (control: unmutated copy passes)', async () => {
  const fxOf = () => makeFixture({ cases: [{ title: 'Health returns ok' }], plan: [httpEntry(1, 'Health returns ok', OK_STEPS)] });
  const anchor = "return { outcome: 'pass', reason_code: null, reason: null, evidence };\n  } finally {\n    if (reqCtx)";
  const control = await runRun(fxOf(), { script: pluginCopy(), env: COPY_ENV });
  assert.equal(control.results.cases[0].outcome, 'pass');
  const script = pluginCopy({ mutations: [[anchor, "return { outcome: 'passed', reason_code: null, reason: null, evidence };\n  } finally {\n    if (reqCtx)"]] });
  const r = await runRun(fxOf(), { script, env: COPY_ENV });
  assert.equal(r.code, 0, r.stderr);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'RUNNER_ERROR');
  assert.match(c.reason, /outside the closed vocabulary/);
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-2: a driver that throws becomes blocked/RUNNER_ERROR for that case only and later cases still run', async () => {
  const badState = JSON.stringify({ cookies: 'nope', origins: [] });
  const login = `import {writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';
const root=process.argv[process.argv.indexOf('--root')+1];
mkdirSync(join(root,'PRPs','auth','.sessions'),{recursive:true});
writeFileSync(join(root,'PRPs','auth','.sessions','admin.json'),${JSON.stringify(badState)});\n`;
  const fx = makeFixture({
    roles: { admin: {} },
    cases: [{ title: 'Throws in driver', state: 'A logged-in admin' }, { title: 'Still runs' }],
    plan: [
      httpEntry(1, 'Throws in driver', OK_STEPS, { role: 'admin', state: 'role-only' }),
      httpEntry(2, 'Still runs', OK_STEPS),
    ],
    files: { 'PRPs/auth/login-admin.mjs': login },
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.results.cases.length, 2);
  assert.equal(r.results.cases[0].outcome, 'blocked');
  assert.equal(r.results.cases[0].reason_code, 'RUNNER_ERROR');
  assert.equal(r.results.cases[1].outcome, 'pass');
  assert.equal(r.results.aborted, null);
});

// ---------------------------------------------------------------------------
// AC-2 on abort
// ---------------------------------------------------------------------------

test('AC-2: --max-cases pads every unreached case as blocked/RUN_ABORTED so entries still equal cases (control: no cap, no abort)', async () => {
  const titles = ['One', 'Two', 'Three'];
  const mk = () =>
    makeFixture({
      cases: titles.map((t) => ({ title: t })),
      plan: titles.map((t, i) => httpEntry(i + 1, t, OK_STEPS)),
    });
  const full = await runRun(mk());
  assert.equal(full.code, 0);
  assert.equal(full.results.aborted, null);
  assert.equal(full.results.cases.length, 3);

  const r = await runRun(mk(), { args: ['--max-cases', '1'] });
  assert.equal(r.code, 1);
  assert.equal(r.results.cases.length, 3);
  assert.equal(r.results.cases[0].outcome, 'pass');
  for (const c of r.results.cases.slice(1)) {
    assert.equal(c.outcome, 'blocked');
    assert.equal(c.reason_code, 'RUN_ABORTED');
    assert.equal(c.duration_ms, 0);
    assert.match(c.started_at, ISO_MS);
    assert.deepEqual(c.evidence, []);
  }
  assert.equal(r.results.aborted.reason_code, 'RUN_ABORTED');
  assert.match(r.results.aborted.reason, /--max-cases 1/);
  assert.deepEqual(r.results.counts, { pass: 1, fail: 0, blocked: 2, 'needs-human': 0 });
  assert.deepEqual(r.results.cases.map((c) => c.title), titles, 'entries stay keyed to the report titles');
  assert.ok(r.stdout.includes('RUN ABORTED: RUN_ABORTED'));
  assert.ok(r.stdout.includes('HUMAN GATE STILL OPEN'), 'the gate is stated even on an abort');
  assert.deepEqual(validateResults(r.results), []);
});

test('--max-cases rejects a non-positive count with exit 2 and writes nothing', async () => {
  const fx = makeFixture({ cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)] });
  const r = await runRun(fx, { args: ['--max-cases', '0'] });
  assert.equal(r.code, 2);
  assert.equal(r.results, null);
});

test('pin (d): an exception OUTSIDE the per-case try aborts the loop; the finally pads the case and every later one as blocked/RUN_ABORTED, redacted, and results.json is still written', async () => {
  const anchor = "const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';";
  const script = pluginCopy({
    mutations: [[anchor, `if (c.index === 2) throw new Error('outer boom ' + process.env.QA_TEST_API_KEY);\n      ${anchor}`]],
  });
  const titles = ['One', 'Two', 'Three'];
  const fx = makeFixture({ cases: titles.map((t) => ({ title: t })), plan: titles.map((t, i) => httpEntry(i + 1, t, OK_STEPS)) });
  const r = await runRun(fx, { script, env: { ...COPY_ENV, QA_TEST_API_KEY: ENV_SECRET } });
  assert.equal(r.code, 1);
  assert.equal(r.results.cases.length, 3);
  assert.equal(r.results.cases[0].outcome, 'pass');
  for (const c of r.results.cases.slice(1)) {
    assert.equal(c.outcome, 'blocked');
    assert.equal(c.reason_code, 'RUN_ABORTED');
    assert.match(c.reason, /unexpected error outside a case/);
  }
  assert.equal(r.results.aborted.reason_code, 'RUN_ABORTED');
  assert.equal(readFileSync(fx.resultsPath, 'utf8').includes(ENV_SECRET), false, 'the error message was redacted');
  assert.ok(readFileSync(fx.resultsPath, 'utf8').includes('[REDACTED]'));
  assert.ok(r.stdout.includes('HUMAN GATE STILL OPEN'));
});

// ---------------------------------------------------------------------------
// AC-1: fail closed
// ---------------------------------------------------------------------------

test('AC-1: a non-local target halts FAILED_NON_LOCAL_TARGET before any case, request or results write; a userinfo-bearing local host too (control: loopback target runs)', async () => {
  for (const bad of ['http://example.com', 'http://localhost@evil.example/', 'ftp://127.0.0.1/']) {
    const fx = makeFixture({ baseUrl: bad, cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)] });
    const before = listFiles(fx.root);
    hits = {};
    const r = await runRun(fx);
    assert.equal(r.code, 1, bad);
    assert.match(r.stderr, /FAILED_NON_LOCAL_TARGET/, bad);
    assert.equal(r.results, null, `no results.json for ${bad}`);
    assert.deepEqual(listFiles(fx.root), before, `no write at all for ${bad}`);
    assert.equal(hits['/ok'], undefined);
    assert.equal(r.stdout.includes('HUMAN GATE STILL OPEN'), false);
  }
  const ok = await runRun(makeFixture({ cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)] }));
  assert.equal(ok.code, 0);
});

test('AC-1: init with a non-local target refuses and creates no run directory; with a local target it creates RUN_DIR and prints the origin', async () => {
  const bad = makeFixture({ baseUrl: 'http://example.com', cases: [{ title: 'One' }] });
  const r1 = await runScript(REAL_SCRIPT, ['init', '--root', bad.root, '--feature', FEATURE], { cwd: bad.root });
  assert.equal(r1.code, 1);
  assert.match(r1.stderr, /FAILED_NON_LOCAL_TARGET/);
  const runs = join(bad.root, 'PRPs', 'reports', FEATURE, 'qa-run');
  assert.deepEqual(readdirSync(runs), [RUN_ID], 'only the fixture run dir; init created nothing');

  const good = makeFixture({ cases: [{ title: 'One' }] });
  const r2 = await runScript(REAL_SCRIPT, ['init', '--root', good.root, '--feature', FEATURE], { cwd: good.root });
  assert.equal(r2.code, 0, r2.stderr);
  assert.match(r2.stdout, /^RUN_ID: \d{8}T\d{9}Z$/m);
  assert.ok(r2.stdout.includes(`BASE_URL_ORIGIN: ${baseUrl}`));
  const dir = /RUN_DIR: (\S+)/.exec(r2.stdout)[1];
  assert.ok(statSync(join(good.root, ...dir.split('/'), 'evidence')).isDirectory());
});

test('AC-1: the guard fails CLOSED when its module is absent (FAILED_GUARD_UNAVAILABLE, no results); the same fixture with the guard present runs', async () => {
  const fxOf = () => makeFixture({ cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)] });
  const withGuard = await runRun(fxOf(), { script: pluginCopy(), env: COPY_ENV });
  assert.equal(withGuard.code, 0, withGuard.stderr);
  hits = {};
  const fx = fxOf();
  const r = await runRun(fx, { script: pluginCopy({ omitGuard: true }), env: COPY_ENV });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /FAILED_GUARD_UNAVAILABLE/);
  assert.equal(r.results, null);
  assert.equal(hits['/ok'], undefined, 'no request was made');
});

test('AC-1: a step path leaving the approved origin is blocked FAILED_NON_LOCAL_TARGET with no request; both guard layers (origin, isAllowedHost) are individually redundant and together the only barrier', async () => {
  const offOrigin = `http://127.0.0.2:${otherPort}/x`;
  const steps = [get(offOrigin, { expect_status: 200 })];
  const fxOf = () => makeFixture({ cases: [{ title: 'Escape' }], plan: [httpEntry(1, 'Escape', steps)] });
  const originAnchor = 'if (u.origin !== target.origin) return null;';
  const hostAnchor = 'if (!target.guard.isAllowedHost(u.hostname, target.allowedHosts)) return null;';

  /** @param {[string, string][]} mutations */
  const attempt = async (mutations) => {
    hits = {};
    const r = await runRun(fxOf(), { script: pluginCopy({ mutations }), env: COPY_ENV });
    return { r, otherHits: hits['other:/x'] ?? 0 };
  };
  const real = await attempt([]);
  assert.equal(real.r.results.cases[0].outcome, 'blocked');
  assert.equal(real.r.results.cases[0].reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(real.otherHits, 0);
  // protocol-relative escape and a different loopback name on the same port
  hits = {};
  const fx2 = makeFixture({
    cases: [{ title: 'A' }, { title: 'B' }],
    plan: [httpEntry(1, 'A', [get(`//127.0.0.2:${otherPort}/x`, { expect_status: 200 })]), httpEntry(2, 'B', [get(`http://localhost:${port}/ok`, { expect_status: 200 })])],
  });
  const r2 = await runRun(fx2);
  assert.deepEqual(r2.results.cases.map((c) => c.reason_code), ['FAILED_NON_LOCAL_TARGET', 'FAILED_NON_LOCAL_TARGET']);
  assert.equal(hits['/ok'], undefined, 'a different host label for the same server is a different origin');

  const noOrigin = await attempt([[originAnchor, '']]);
  assert.equal(noOrigin.r.results.cases[0].outcome, 'blocked', 'isAllowedHost alone still blocks');
  assert.equal(noOrigin.otherHits, 0);
  const noHost = await attempt([[hostAnchor, '']]);
  assert.equal(noHost.r.results.cases[0].outcome, 'blocked', 'the origin check alone still blocks');
  assert.equal(noHost.otherHits, 0);
  const neither = await attempt([[originAnchor, ''], [hostAnchor, '']]);
  assert.equal(neither.r.results.cases[0].outcome, 'pass', 'with both layers removed the request leaves the approved origin');
  assert.equal(neither.otherHits, 1);
});

test('AC-1: no declared target gives blocked/TARGET_UNDECLARED with a null origin; an --env-handle supplies the target; a malformed handle halts FAILED_ENV_HANDLE_INVALID', async () => {
  const fx = makeFixture({ baseUrl: null, cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)] });
  const r = await runRun(fx);
  assert.equal(r.code, 0);
  assert.equal(r.results.cases[0].reason_code, 'TARGET_UNDECLARED');
  assert.equal(r.results.base_url_origin, null);

  const fx2 = makeFixture({ baseUrl: null, cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)], files: { 'handle.json': JSON.stringify({ baseUrl }) } });
  const r2 = await runRun(fx2, { args: ['--env-handle', join(fx2.root, 'handle.json')] });
  assert.equal(r2.results.cases[0].outcome, 'pass');
  assert.equal(r2.results.base_url_origin, baseUrl);

  const fx3 = makeFixture({ cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)], files: { 'bad.json': '{"baseUrl": 5}' } });
  const r3 = await runRun(fx3, { args: ['--env-handle', join(fx3.root, 'bad.json')] });
  assert.equal(r3.code, 1);
  assert.match(r3.stderr, /FAILED_ENV_HANDLE_INVALID/);
  assert.equal(r3.results, null);
});

// ---------------------------------------------------------------------------
// Pins of the code-reviewer's named gaps (current real behavior)
// ---------------------------------------------------------------------------

test('pin (a): every failure BEFORE the main try (halt, unreadable report, no cases, bad handle) ends with a named stderr code and NO results.json, and the human-gate sentence is not printed', async () => {
  /** @type {[string, (fx: ReturnType<typeof makeFixture>) => void, RegExp][]} */
  const scenarios = [
    ['report missing', (fx) => rmSync(fx.reportAbs), /FAILED_QA_REPORT_MISSING/],
    ['no cases in the report', (fx) => writeFileSync(fx.reportAbs, '# QA Report\n\nnothing here\n'), /FAILED_REPORT_UNPARSEABLE/],
    [
      'report path is a directory (non-Halt throw in the setup)',
      (fx) => {
        rmSync(fx.reportAbs);
        mkdirSync(fx.reportAbs);
      },
      /FAILED_RUNNER_ERROR/,
    ],
  ];
  for (const [label, prepare, pattern] of scenarios) {
    const fx = makeFixture({ cases: [{ title: 'One' }], plan: [httpEntry(1, 'One', OK_STEPS)] });
    prepare(fx);
    const r = await runRun(fx);
    assert.equal(r.code, 1, label);
    assert.match(r.stderr, pattern, label);
    assert.equal(existsSync(fx.resultsPath), false, `${label}: no results.json at all`);
    assert.equal(r.stdout.includes('HUMAN GATE STILL OPEN'), false, label);
  }
  const outside = makeFixture({ cases: [{ title: 'One' }] });
  const r = await runScript(REAL_SCRIPT, ['run', '--root', outside.root, '--feature', FEATURE, '--run-dir', '../escape'], { cwd: outside.root });
  assert.equal(r.code, 2, 'a run-dir outside qa-run/ is a usage error');
  assert.ok(r.stderr.includes('--run-dir must be an existing directory inside'));
});

test('pin (b): the report is replaced by a directory mid-run (re-hash cannot read it): FAILED_REPORT_MODIFIED (not a generic runner error), results.json written with one entry per case, report_sha256_after null while before keeps the original hash, gate sentence printed', async () => {
  const fx = makeFixture({ cases: [{ title: 'Race' }], plan: [httpEntry(1, 'Race', [get('/mutate-report', { expect_status: 200 })])] });
  const original = sha(fx.reportAbs);
  reportMutation = () => {
    rmSync(fx.reportAbs);
    mkdirSync(fx.reportAbs);
  };
  try {
    const r = await runRun(fx);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /FAILED_REPORT_MODIFIED/);
    assert.equal(r.stderr.includes('FAILED_RUNNER_ERROR'), false, 'not reported as a generic runner error');
    assert.equal(existsSync(fx.resultsPath), true, 'results.json is written');
    assert.equal(r.results.cases.length, 1, 'one entry for the one case (N entries for N cases)');
    assert.equal(r.results.report_sha256_before, original);
    assert.equal(r.results.report_sha256_after, null);
    assert.ok(r.stdout.includes('HUMAN GATE STILL OPEN'));
  } finally {
    reportMutation = null;
  }
});

test('AC-7: a report that changes (or vanishes) during the run is detected: FAILED_REPORT_MODIFIED, exit 1, differing hashes recorded, results.json and the gate sentence still emitted', async () => {
  for (const [label, mutateReport, afterIsNull] of /** @type {[string, (p: string) => void, boolean][]} */ ([
    ['appended', (p) => appendFileSync(p, '\nextra line\n'), false],
    ['deleted', (p) => rmSync(p), true],
  ])) {
    const fx = makeFixture({ cases: [{ title: 'Race' }], plan: [httpEntry(1, 'Race', [get('/mutate-report', { expect_status: 200 })])] });
    const original = sha(fx.reportAbs);
    reportMutation = () => mutateReport(fx.reportAbs);
    try {
      const r = await runRun(fx);
      assert.equal(r.code, 1, label);
      assert.match(r.stderr, /FAILED_REPORT_MODIFIED/, label);
      assert.equal(r.results.report_sha256_before, original, label);
      if (afterIsNull) assert.equal(r.results.report_sha256_after, null, label);
      else assert.notEqual(r.results.report_sha256_after, original, label);
      assert.ok(r.stdout.includes('HUMAN GATE STILL OPEN'), label);
    } finally {
      reportMutation = null;
    }
  }
});

// ---------------------------------------------------------------------------
// maxRedirects, WRITE-SITE
// ---------------------------------------------------------------------------

test('maxRedirects 0: a 302 is recorded as the response and never followed (control: maxRedirects 5 follows it)', async () => {
  const fxOf = () =>
    makeFixture({
      cases: [{ title: 'Redirect' }],
      plan: [httpEntry(1, 'Redirect', [get('/redirect', { expect_status: 302 })])],
    });
  hits = {};
  const r = await runRun(fxOf());
  assert.equal(r.results.cases[0].outcome, 'pass');
  assert.equal(hits['/redirect'], 1);
  assert.equal(hits['/target'], undefined, 'the redirect target was never requested');
  const fx = fxOf();
  hits = {};
  const r2 = await runRun(fx);
  const ev = JSON.parse(readFileSync(join(fx.root, ...r2.results.cases[0].evidence[0].split('/')), 'utf8'));
  assert.equal(ev.response.status, 302);
  assert.equal(ev.response.headers.location, '/target');

  hits = {};
  const followed = await runRun(fxOf(), { script: pluginCopy({ mutations: [['maxRedirects: 0', 'maxRedirects: 5']] }), env: COPY_ENV });
  assert.equal(hits['/target'], 1, 'the mutated copy followed the redirect');
  assert.equal(followed.results.cases[0].outcome, 'fail', 'a followed redirect no longer yields status 302');
});

test('WRITE-SITE: a destination outside the run dir is refused (case blocked/EVIDENCE_WRITE_FAILED, nothing escapes); with only the refusal removed the file does escape', async () => {
  const escape = [["const abs = join(ctx.runDirAbs, 'evidence', name);", "const abs = join(ctx.runDirAbs, '..', 'escaped', name);"]];
  const fxOf = () => makeFixture({ cases: [{ title: 'Write' }], plan: [httpEntry(1, 'Write', OK_STEPS)] });

  const fx = fxOf();
  const r = await runRun(fx, { script: pluginCopy({ mutations: /** @type {[string, string][]} */ (escape) }), env: COPY_ENV });
  assert.equal(r.results.cases[0].outcome, 'blocked');
  assert.equal(r.results.cases[0].reason_code, 'EVIDENCE_WRITE_FAILED');
  const runsDir = join(fx.root, 'PRPs', 'reports', FEATURE, 'qa-run');
  assert.equal(existsSync(join(runsDir, 'escaped')), false, 'nothing was written outside the run dir');

  const fx2 = fxOf();
  const anchor = "if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {";
  await runRun(fx2, { script: pluginCopy({ mutations: /** @type {[string, string][]} */ ([...escape, [anchor, 'if (false) {']]) }), env: COPY_ENV });
  const escaped = join(fx2.root, 'PRPs', 'reports', FEATURE, 'qa-run', 'escaped');
  assert.ok(existsSync(escaped) && listFiles(escaped).length === 1, 'with the refusal removed the evidence escaped the run dir');
});

// ---------------------------------------------------------------------------
// AC-6 / AC-15: redaction
// ---------------------------------------------------------------------------

/**
 * @param {ReturnType<typeof makeFixture>} fx
 * @param {any} results
 * @param {number} i
 */
function evidenceJson(fx, results, i = 0) {
  return JSON.parse(readFileSync(join(fx.root, ...results.cases[i].evidence[0].split('/')), 'utf8'));
}

test('AC-15/AC-6: JSON evidence is redacted structurally and by value/regex; Set-Cookie and unlisted headers never land; no raw secret anywhere under the run dir', async () => {
  const fxOf = () => makeFixture({ cases: [{ title: 'Leak' }], plan: [httpEntry(1, 'Leak', [get('/leak', { expect_status: 200 })])] });
  const fx = fxOf();
  const r = await runRun(fx, { env: { QA_TEST_API_KEY: ENV_SECRET } });
  assert.equal(r.results.cases[0].outcome, 'pass');
  const ev = evidenceJson(fx, r.results);
  assert.equal(ev.response.body.password, '[REDACTED]');
  assert.equal(ev.response.body.token, '[REDACTED]');
  assert.equal(ev.response.body.nested.authorization, '[REDACTED]');
  assert.equal(ev.response.body.note, 'inline [REDACTED] value');
  assert.equal(ev.response.body.aws, '[REDACTED]');
  assert.equal(ev.response.body.ok, true, 'non-secret fields stay readable');
  assert.ok('content-type' in ev.response.headers);
  assert.equal('set-cookie' in ev.response.headers, false);
  assert.equal('x-session' in ev.response.headers, false);
  const everything = allText(fx.runDirAbs);
  for (const raw of [ENV_SECRET, 'pw-struct-1234', 'tok-struct-5678', AWS_KEY, 'cookie-secret-value-1', 'rawheadervalue777']) {
    assert.equal(everything.includes(raw), false, `raw value leaked: ${raw}`);
  }

  // Sensitivity: without the env secret in the table the by-value redaction has nothing to match.
  const fx2 = fxOf();
  const r2 = await runRun(fx2);
  assert.equal(evidenceJson(fx2, r2.results).response.body.note, `inline ${ENV_SECRET} value`);
});

test('AC-15: a text/plain body is redacted by value before it is written', async () => {
  const fx = makeFixture({ cases: [{ title: 'Text' }], plan: [httpEntry(1, 'Text', [get('/text', { expect_status: 200 })])] });
  const r = await runRun(fx, { env: { QA_TEST_API_KEY: ENV_SECRET } });
  const ev = evidenceJson(fx, r.results);
  assert.equal(ev.response.body, 'plain body with [REDACTED] inside');
  assert.equal(allText(fx.runDirAbs).includes(ENV_SECRET), false);
});

test('AC-6: the response header allowlist is the only barrier for an unstructured secret header (control: allowlist widened in a copy lets it land)', async () => {
  const fxOf = () => makeFixture({ cases: [{ title: 'Leak' }], plan: [httpEntry(1, 'Leak', [get('/leak', { expect_status: 200 })])] });
  const widened = "const EVIDENCE_HEADERS = ['content-type', 'content-length', 'location', 'cache-control'];";
  const fx = fxOf();
  const r = await runRun(fx, { script: pluginCopy({ mutations: [[widened, "const EVIDENCE_HEADERS = ['content-type', 'set-cookie', 'x-session'];"]] }), env: COPY_ENV });
  const ev = evidenceJson(fx, r.results);
  assert.equal(ev.response.headers['x-session'], 'rawheadervalue777', 'a widened allowlist lets an unstructured header value land');
  assert.equal(ev.response.headers['set-cookie'], '[REDACTED]', 'set-cookie is at least structurally redacted');
  const baseline = fxOf();
  const r0 = await runRun(baseline);
  assert.equal(allText(baseline.runDirAbs).includes('rawheadervalue777'), false);
  assert.equal('x-session' in evidenceJson(baseline, r0.results).response.headers, false);
});

test('AC-6: request bodies are never persisted (control: a copy that persists them leaks the unlisted value)', async () => {
  const marker = 'reqbodynote555';
  const fxOf = () =>
    makeFixture({
      cases: [{ title: 'Echo' }],
      plan: [httpEntry(1, 'Echo', [{ action: 'request', method: 'POST', path: '/echo', body: { note: marker }, expect_status: 200 }])],
    });
  const fx = fxOf();
  const r = await runRun(fx);
  assert.equal(r.results.cases[0].outcome, 'pass');
  assert.deepEqual(evidenceJson(fx, r.results).request, { method: 'POST', path: '/echo' });
  assert.equal(allText(fx.runDirAbs).includes(marker), false);

  const fx2 = fxOf();
  const anchor = 'request: { method: step.method, path: step.path }';
  await runRun(fx2, { script: pluginCopy({ mutations: [[anchor, 'request: { method: step.method, path: step.path, body: step.body }']] }), env: COPY_ENV });
  assert.ok(allText(fx2.runDirAbs).includes(marker), 'the mutated copy persisted the body');
});

test('AC-6: a session cookie value from the kit login script is learned at run time and redacted from evidence that echoes it', async () => {
  const state = {
    cookies: [{ name: 'sid', value: SESSION_COOKIE, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }],
    origins: [],
  };
  const login = `import {writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';
const root=process.argv[process.argv.indexOf('--root')+1];
mkdirSync(join(root,'PRPs','auth','.sessions'),{recursive:true});
writeFileSync(join(root,'PRPs','auth','.sessions','admin.json'),${JSON.stringify(JSON.stringify(state))});\n`;
  const fx = makeFixture({
    roles: { admin: {} },
    cases: [{ title: 'Whoami', state: 'A logged-in admin user' }],
    plan: [httpEntry(1, 'Whoami', [get('/whoami', { expect_status: 200 })], { role: 'admin', state: 'role-only' })],
    files: { 'PRPs/auth/login-admin.mjs': login },
  });
  lastCookie = '';
  const r = await runRun(fx);
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  assert.equal(r.results.cases[0].role, 'admin');
  const ev = evidenceJson(fx, r.results);
  assert.equal(ev.response.body.echo, 'sid=[REDACTED]', 'the cookie really reached the server and came back redacted');
  assert.equal(allText(fx.runDirAbs).includes(SESSION_COOKIE), false);
});

test('AC-6/AC-3: a role the plan names but login.config.json does not declare is blocked ROLE_UNDECLARED; a declared role with no login script is blocked SESSION_UNAVAILABLE', async () => {
  const undeclared = makeFixture({
    roles: { admin: {} },
    cases: [{ title: 'Ghost role' }],
    plan: [httpEntry(1, 'Ghost role', OK_STEPS, { role: 'ghost' })],
  });
  const r = await runRun(undeclared);
  assert.equal(r.results.cases[0].reason_code, 'ROLE_UNDECLARED');
  const noScript = makeFixture({ roles: { admin: {} }, cases: [{ title: 'No script' }], plan: [httpEntry(1, 'No script', OK_STEPS, { role: 'admin' })] });
  const r2 = await runRun(noScript);
  assert.equal(r2.results.cases[0].reason_code, 'SESSION_UNAVAILABLE');
  assert.match(r2.results.cases[0].reason, /FAILED_LOGIN_SCRIPT_MISSING/);
});

// ---------------------------------------------------------------------------
// AC-14: declared required state
// ---------------------------------------------------------------------------

const STATE_TEXT = 'Seeded demo data';
const SEED_SCRIPT = "import {writeFileSync} from 'node:fs';writeFileSync(process.argv[2], 'seeded');\n";

/**
 * @param {{ seed?: any, plan?: Record<string, any>, seedArgs?: string[] }} o
 */
function seedFixture(o = {}) {
  const fx = makeFixture({
    cases: [{ title: 'Needs seed', state: STATE_TEXT }],
    plan: [httpEntry(1, 'Needs seed', OK_STEPS, { state: 'declared', ...(o.plan ?? {}) })],
    files: { 'seed.mjs': SEED_SCRIPT },
  });
  const marker = join(fx.root, 'seed-marker.txt');
  if (o.seed !== null) {
    const seed = o.seed ?? { states: { [STATE_TEXT]: { command: [process.execPath, join(fx.root, 'seed.mjs'), marker, ...(o.seedArgs ?? [])], status: 'confirmed', store: 'localhost:5432' } } };
    writeFileSync(join(fx.root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify(seed));
  }
  return { fx, marker };
}

test('AC-14: a state declared by exact text in qa-seed.json is seeded by its declared argv only, then the case runs (marker proves the seed ran)', async () => {
  const { fx, marker } = seedFixture({ seedArgs: [`${baseUrl}/seed`] });
  const r = await runRun(fx);
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  assert.ok(existsSync(marker));
});

test('AC-14: undeclared states are blocked STATE_UNDECLARED naming the missing declaration and nothing is seeded: wrong case, no seed file, plan state not "declared", empty argv', async () => {
  const exactKey = STATE_TEXT;
  /** @type {[string, ReturnType<typeof seedFixture>][]} */
  const scenarios = [
    ['key differs only by case', seedFixture({ seed: { states: { [exactKey.toLowerCase()]: { command: [process.execPath, '-e', ''] } } } })],
    ['no qa-seed.json', seedFixture({ seed: null })],
    ['plan.state is not declared', seedFixture({ plan: { state: 'none' } })],
    ['empty command', seedFixture({ seed: { states: { [exactKey]: { command: [] } } } })],
  ];
  for (const [label, { fx, marker }] of scenarios) {
    const r = await runRun(fx);
    const c = r.results.cases[0];
    assert.equal(c.outcome, 'blocked', label);
    assert.equal(c.reason_code, 'STATE_UNDECLARED', label);
    assert.match(c.reason, /PRPs\/auth\/qa-seed\.json states\[/, label);
    assert.equal(existsSync(marker), false, label);
  }
});

test('AC-14: a failing declared seed command is blocked SEED_FAILED (and the case is not run)', async () => {
  const { fx } = seedFixture({ seed: { states: { [STATE_TEXT]: { command: [process.execPath, '-e', 'process.exit(3)'], status: 'confirmed', store: 'localhost:5432' } } } });
  hits = {};
  const r = await runRun(fx);
  assert.equal(r.results.cases[0].reason_code, 'SEED_FAILED');
  assert.match(r.results.cases[0].reason, /status 3/);
  assert.equal(hits['/ok'], undefined);
});

test('AC-1/AC-14: isAllowedHost is applied to seed argv containing :// - a non-local URL blocks the seed unexecuted (control: the guard line removed in a copy runs it)', async () => {
  const bad = ['http://evil.example/seed'];
  const { fx, marker } = seedFixture({ seedArgs: bad });
  const r = await runRun(fx);
  assert.equal(r.results.cases[0].outcome, 'blocked');
  assert.equal(r.results.cases[0].reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(existsSync(marker), false, 'the seed command was not executed');

  const m = seedFixture({ seedArgs: bad });
  const script = pluginCopy({ mutations: [["if (!a.includes('://')) continue;", 'continue;']] });
  const r2 = await runRun(m.fx, { script, env: COPY_ENV });
  assert.equal(r2.results.cases[0].outcome, 'pass');
  assert.ok(existsSync(m.marker), 'with the argv scan removed the non-local seed ran');
});

// ---------------------------------------------------------------------------
// Browser driver (real Chromium)
// ---------------------------------------------------------------------------

test('browser driver: goto/expect_visible/expect_text/expect_url pass with a PNG screenshot as evidence; a missing element fails with evidence', async () => {
  const fx = makeFixture({
    cases: [{ title: 'Page renders' }, { title: 'Element missing' }],
    plan: [
      httpEntry(1, 'Page renders', [
        { action: 'goto', path: '/page' },
        { action: 'expect_visible', selector: '#t' },
        { action: 'expect_text', selector: '#t', contains: 'Hello' },
        { action: 'expect_url', path: '/page' },
      ], { driver: 'browser' }),
      httpEntry(2, 'Element missing', [
        { action: 'goto', path: '/page' },
        { action: 'expect_text', selector: '#t', contains: 'Absent words' },
      ], { driver: 'browser' }),
    ],
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  assert.equal(r.results.cases[1].outcome, 'fail');
  assert.equal(r.results.cases[1].evidence.length, 1);
  const png = readFileSync(join(fx.root, ...r.results.cases[0].evidence[0].split('/')));
  assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(r.results.cases[0].driver, 'browser');
});

test('AC-6/AC-15 browser: when the page text holds a secret the screenshot is withheld and redacted text is written instead', async () => {
  const fx = makeFixture({
    cases: [{ title: 'Secret page' }],
    plan: [httpEntry(1, 'Secret page', [{ action: 'goto', path: '/page?secret=1' }, { action: 'expect_visible', selector: '#t' }], { driver: 'browser' })],
  });
  const r = await runRun(fx, { env: { QA_TEST_API_KEY: ENV_SECRET } });
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.match(c.evidence[0], /\.txt$/);
  assert.equal(listFiles(fx.runDirAbs).some((f) => f.endsWith('.png')), false);
  assert.equal(allText(fx.runDirAbs).includes(ENV_SECRET), false);
  assert.ok(readFileSync(join(fx.root, ...c.evidence[0].split('/')), 'utf8').includes('Hello QA [REDACTED]'));
});

test('AC-1 browser: a subresource on a non-approved host is aborted by the context route (control: route guard removed in a copy lets it load)', async () => {
  const fxOf = () =>
    makeFixture({
      cases: [{ title: 'Sub' }],
      plan: [httpEntry(1, 'Sub', [{ action: 'goto', path: '/page-sub' }, { action: 'expect_visible', selector: '#t' }], { driver: 'browser' })],
    });
  hits = {};
  const r = await runRun(fxOf());
  assert.equal(r.results.cases[0].outcome, 'pass', JSON.stringify(r.results.cases[0]));
  assert.equal(hits['other:/pixel'], undefined, 'the non-approved host was never contacted');

  hits = {};
  const anchor = 'return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();';
  const r2 = await runRun(fxOf(), { script: pluginCopy({ mutations: [[anchor, 'return route.continue();']] }), env: COPY_ENV });
  assert.equal(r2.results.cases[0].outcome, 'pass');
  assert.equal(hits['other:/pixel'], 1, 'without the route guard the subresource was fetched');
});

// ---------------------------------------------------------------------------
// parse mode
// ---------------------------------------------------------------------------

test('parse mode: prints the seven report fields per case as JSON, steps verbatim, and halts FAILED_REPORT_UNPARSEABLE with nothing printed for a report with no cases', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'relay-qarun-parse-'));
  temps.push(dir);
  const report = join(dir, 'qa-report.md');
  writeFileSync(
    report,
    reportText([
      { title: 'First case', risk: 'high', state: 'A user exists', steps: ['1. Do a thing.', '   indented continuation', '2. Check it.'] },
      { title: 'Second case', risk: 'low' },
    ]),
  );
  const r = await runScript(REAL_SCRIPT, ['parse', '--report', report], { cwd: dir });
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.cases.length, 2);
  const c1 = out.cases[0];
  assert.equal(c1.index, 1);
  assert.equal(c1.title, 'First case');
  assert.equal(c1.risk, 'high');
  assert.equal(c1.required_state, 'A user exists');
  assert.equal(c1.coverage, 'none');
  assert.equal(c1.automated_test_path, 'n/a');
  assert.equal(c1.manual_status, 'pending');
  assert.equal(c1.manual_steps_verbatim, '1. Do a thing.\n   indented continuation\n2. Check it.');
  assert.equal(out.cases[1].index, 2);

  const empty = join(dir, 'empty.md');
  writeFileSync(empty, '# nothing\n');
  const r2 = await runScript(REAL_SCRIPT, ['parse', '--report', empty], { cwd: dir });
  assert.equal(r2.code, 1);
  assert.match(r2.stderr, /FAILED_REPORT_UNPARSEABLE/);
  assert.equal(r2.stdout, '');
  const r3 = await runScript(REAL_SCRIPT, ['parse', '--report', join(dir, 'missing.md')], { cwd: dir });
  assert.equal(r3.code, 1);
  assert.match(r3.stderr, /FAILED_REPORT_UNPARSEABLE/);
});

// Regression: dogfood of /relay-qa-run against a real /relay-qa-report output
// (praesto-sum, unit 10 `missed-sweep`, 2026-10-02) halted
// FAILED_REPORT_UNPARSEABLE on a 23-case report. Two independent causes, both
// covered here: FIELD_RE rejected the `- ` list-item prefix the generator
// writes, so all seven fields parsed as null; and the no-`## Test Cases` branch
// required a literal `Title:` label, so blocks whose title lives in the `###`
// heading were dropped. reportText() above builds the parser-friendly shape, so
// it could never have caught either — this report is written out literally in
// the shape /relay-qa-report emits.
test('parse mode: a generator-shaped report parses — bullet-prefixed fields, titles from the ### heading, no "## Test Cases" section, and a field-less subsection is not a case', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'relay-qarun-shape-'));
  temps.push(dir);
  const report = join(dir, 'qa-report.md');
  writeFileSync(
    report,
    [
      '# QA support report — demo',
      '',
      '- **Mode:** `prd` — source `PRPs/prds/demo.prd.md`',
      '- **Cases:** 2',
      '',
      '## Where the cited code lives',
      '',
      'Prose that carries no field label at all.',
      '',
      '### A note that is not a case',
      '',
      'Narrative only, at case-heading depth.',
      '',
      '## Phase 1 — the pure plan',
      '',
      '### AC-1 — Pure and clock-free',
      '',
      '- **Risk:** Medium',
      '- **Required state:** none (pure function arguments only)',
      '- **Coverage:** automated',
      '- **Automated test path:** `test/demo.test.ts`',
      '- **Manual status:** — (automated; no manual test needed)',
      '- **Manual step-by-step:**',
      '  1. Run the suite.',
      '  2. Confirm it passes.',
      '',
      '## Phase 2 — the screen',
      '',
      '### AC-2 — On screen (manual)',
      '',
      '- **Risk level:** High',
      '- **Required state:** at least one `missed` occurrence',
      '- **Coverage:** manual',
      '- **Automated test path:** —',
      '- **Manual status:** `pending`',
      '- **Manual step-by-step:**',
      '  1. Open the app.',
      '  2. Confirm the group is collapsed by default.',
      '',
    ].join('\n'),
  );
  const r = await runScript(REAL_SCRIPT, ['parse', '--report', report], { cwd: dir });
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);

  // The field-less `### A note that is not a case` must not become a case.
  assert.equal(out.cases.length, 2, JSON.stringify(out.cases.map((c) => c.title)));

  const [c1, c2] = out.cases;
  assert.equal(c1.index, 1);
  assert.equal(c1.title, 'AC-1 — Pure and clock-free', 'the title falls back to the ### heading');
  assert.equal(c1.risk, 'Medium', '`Risk` is accepted as a synonym for `Risk level`');
  assert.equal(c1.required_state, 'none (pure function arguments only)');
  assert.equal(c1.coverage, 'automated');
  assert.equal(c1.automated_test_path, '`test/demo.test.ts`');
  assert.equal(c1.manual_status, '— (automated; no manual test needed)');
  assert.equal(c1.manual_steps_verbatim, '  1. Run the suite.\n  2. Confirm it passes.');

  assert.equal(c2.index, 2);
  assert.equal(c2.title, 'AC-2 — On screen (manual)');
  assert.equal(c2.risk, 'High', 'the canonical `Risk level` label still works');
  assert.equal(c2.coverage, 'manual');
  assert.equal(c2.manual_status, '`pending`');
  assert.equal(c2.manual_steps_verbatim, '  1. Open the app.\n  2. Confirm the group is collapsed by default.');

  // Mutation proof: with only the list-item prefix removed from FIELD_RE, the
  // same report loses every field and both cases fall out of the list.
  const broken = pluginCopy({ mutations: [['(?:[-*+]\\s+|\\d+\\.\\s*)?', '(?:\\d+\\.\\s*)?']] });
  const r2 = await runScript(broken, ['parse', '--report', report], { cwd: dir, env: COPY_ENV });
  assert.equal(r2.code, 1, 'without the bullet prefix the generator-shaped report is unparseable');
  assert.match(r2.stderr, /FAILED_REPORT_UNPARSEABLE/);
});

test('arguments: no mode, an unknown flag and a run without --run-dir exit 2 and write nothing; --help exits 0', async () => {
  for (const args of [[], ['run', '--bogus'], ['run', '--feature', FEATURE], ['init']]) {
    const r = await runScript(REAL_SCRIPT, args);
    assert.equal(r.code, 2, JSON.stringify(args));
    assert.ok(r.stderr.includes('Usage:'));
  }
  const h = await runScript(REAL_SCRIPT, ['--help']);
  assert.equal(h.code, 0);
  assert.ok(h.stdout.includes('qa-run.mjs run'));
});
