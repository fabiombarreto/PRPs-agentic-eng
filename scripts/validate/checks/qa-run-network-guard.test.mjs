// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (a request the network assertion observes to a host the guard does not approve is aborted before it leaves, ends the case FAILED_NON_LOCAL_TARGET with nothing asserted, and is never counted)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-12 A network-request assertion (every observed URL is guard-checked; the entry is refused before anything is seeded, authenticated or requested when it has no earlier interaction or a count of 0 has no anchor)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the guard and the context options, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A1 a case that carries the step runs with service workers blocked, AC-A2 an entry that breaks a
 *              sequence rule is refused before any side effect, AC-A3 a matching non-local request is refused and
 *              never counted)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against a loopback application and a real Chromium. A second recording server on 127.0.0.2 (loopback,
 * but not a host the guard approves) is the "far" host; it is probed for reachability first, so "it saw nothing"
 * proves something. Where the platform cannot bind that address the page falls back to a name that cannot
 * resolve, and the case outcome is still asserted.
 *
 *   1. A matching request to the far host ends the case FAILED_NON_LOCAL_TARGET with nothing asserted, for a
 *      count of 1 and for a count of 0 (a count of 0 must never pass on a request that the guard aborted), writes
 *      no request evidence, and the far host receives nothing.
 *   2. The controls: a request that does not match is ignored whatever its host, and the matching local request
 *      alone passes.
 *   3. Service workers: a case that carries the step runs with them blocked (the worker script is never fetched),
 *      while the same page in a case with no such step registers its worker and the script is fetched.
 *   4. An entry that breaks a sequence rule (no earlier interaction, or a count of 0 with no anchor) is refused
 *      before anything is seeded, authenticated or requested, and the twin entry that satisfies the rule seeds,
 *      authenticates and loads its page.
 *
 * Every run asserts that the QA report is byte-identical before and after.
 *
 * QA_V2P6_RUNNER_SRC points the runner copy at another file (a mutation control); unset, the real runner is used.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const RUNNER_SRC = process.env.QA_V2P6_RUNNER_SRC ? resolve(process.env.QA_V2P6_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p6-guard-'));
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

/** The runner and the guard, and only those two files, in a temp plugin tree. */
const COPY = (() => {
  const dir = mkdtempSync(join(SANDBOX, 'plugin-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  copyFileSync(RUNNER_SRC, join(dir, 'scripts', 'qa-run.mjs'));
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return join(dir, 'scripts', 'qa-run.mjs');
})();

/** @param {string} path */
const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

// ---------------------------------------------------------------------------
// The loopback application and the far recording server
// ---------------------------------------------------------------------------

/** GET requests by pathname. @type {Record<string, number>} */
const hits = {};
/** Fetches of each service-worker script. @type {Record<string, number>} */
const workerHits = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
/** @type {import('node:http').Server | null} */
let farServer = null;
/** A host the guard does not approve: loopback 127.0.0.2 when it can be bound, else a name that cannot resolve. */
let farBase = 'http://qa-nonlocal.invalid';
/** @type {string[]} */
let farSeen = [];

/** @param {string} script */
const workerPage = (script) => `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>sw</title></head><body>
<h1>Painel</h1>
<p id="swdone" hidden>registered</p>
<script>
if (navigator.serviceWorker) { navigator.serviceWorker.register("${script}").then(function () { document.getElementById("swdone").hidden = false; }, function () {}); }
</script></body></html>`;

/** The page of every other path. The far base is read when the page is served, after the far server was probed. */
const appPage = () => `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Painel</title></head><body>
<h1>Painel</h1>
<button id="outside" type="button">Fora</button>
<button id="other" type="button">Outro</button>
<button id="save" type="button">Salvar</button>
<script>
var post = function (url) { return fetch(url, { method: "POST", mode: "no-cors", body: "x" }).catch(function () {}); };
document.getElementById("outside").onclick = function () { post("${farBase}/avatar"); };
document.getElementById("other").onclick = function () { post("${farBase}/other"); post("/avatar"); };
document.getElementById("save").onclick = function () { post("/avatar"); };
</script></body></html>`;

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    if (req.method === 'POST') {
      req.resume();
      req.on('end', () => {
        res.writeHead(204);
        res.end();
      });
      return;
    }
    hits[path] = (hits[path] ?? 0) + 1;
    if (path === '/sw-with.js' || path === '/sw-without.js') {
      workerHits[path] = (workerHits[path] ?? 0) + 1;
      res.writeHead(200, { 'content-type': 'application/javascript' });
      res.end('self.addEventListener("fetch", function () {});');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(path === '/app-sw-with' ? workerPage('/sw-with.js') : path === '/app-sw-without' ? workerPage('/sw-without.js') : appPage());
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;

  // A recording server on 127.0.0.2: loopback, but not one of the guard's built-in local hosts.
  const far = createServer((req, res) => {
    farSeen.push(`${req.method} ${String(req.url).split('?')[0]}`);
    res.writeHead(204);
    res.end();
  });
  try {
    await new Promise((resolveP, rejectP) => {
      far.once('error', rejectP);
      far.listen(0, '127.0.0.2', () => resolveP(null));
    });
    const candidate = `http://127.0.0.2:${/** @type {any} */ (far.address()).port}`;
    // Control: it must answer, or "it saw nothing" proves nothing.
    const probe = await fetch(`${candidate}/__probe`);
    await probe.text();
    if (probe.status !== 204 || farSeen.length !== 1) throw new Error('the far recording server does not answer');
    farServer = far;
    farBase = candidate;
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
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
  if (farServer !== null) {
    /** @type {any} */ (farServer).closeAllConnections?.();
    await new Promise((r) => /** @type {import('node:http').Server} */ (farServer).close(() => r(null)));
  }
});

// ---------------------------------------------------------------------------
// The fixture and the runs
// ---------------------------------------------------------------------------

const SEED_STATE = 'A state exists';
/** A login stub: it only exists so a case that reached the session stage leaves a trace. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  'writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [], origins: [] }));',
].join('\n');

const HEAD = { action: 'expect_visible', selector: 'h1' };
/** @param {string} path */
const gotoPath = (path) => ({ action: 'goto', path });
/** @param {string} id */
const click = (id) => ({ action: 'click', selector: `#${id}` });
/** @param {number} count @param {string} [urlContains] */
const post = (count, urlContains = '/avatar') => ({ action: 'expect_requests', method: 'POST', url_contains: urlContains, count });

/**
 * @typedef {{ title: string, steps: any[], role?: string | null, state?: string }} Def
 * @typedef {{ out: { code: number | null, stdout: string, stderr: string }, results: any, runAbs: string, root: string, marker: string }} Done
 */

/**
 * One project and one run of the runner over it.
 * @param {Def[]} defs
 * @returns {Promise<Done>}
 */
async function runProject(defs) {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runAbs = join(root, ...RUN_REL.split('/'));
  mkdirSync(runAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const marker = join(root, 'seed-marker.txt');
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  writeFileSync(
    join(root, 'PRPs', 'auth', 'qa-seed.json'),
    JSON.stringify({
      states: { [SEED_STATE]: { command: [NODE, '-e', 'require("node:fs").writeFileSync(process.argv[1], "ran")', marker], status: 'confirmed', store: 'localhost:5432' } },
    }),
  );
  const block = (/** @type {Def} */ d, /** @type {number} */ i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${d.title}`,
      '**Risk level:** low',
      `**Required state:** ${d.state === undefined || d.state === 'none' ? 'None' : SEED_STATE}`,
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      '1. Open the page.',
      '2. Act and count the requests.',
      '',
    ].join('\n');
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  writeFileSync(report, `# QA Report\n\n## Test Cases\n\n${defs.map(block).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runAbs, 'plan.json'),
    JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: d.role ?? null, state: d.state ?? 'none', steps: d.steps })) }),
  );
  const reportBefore = sha256File(report);
  const out = await new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [COPY, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      // NODE_PATH lets the copied runner resolve Playwright from the repository node_modules, with no junction to clean up.
      env: { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    // Below the test timeout, so a hang ends the child (and the sandbox cleanup can run) before the test is abandoned.
    const timer = setTimeout(() => child.kill(), 260000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stdout, stderr });
    });
  });
  assert.equal(sha256File(report), reportBefore, 'the QA report changed during the run');
  const file = join(runAbs, 'results.json');
  assert.ok(existsSync(file), `no results.json: ${out.stderr}`);
  return { out, results: JSON.parse(readFileSync(file, 'utf8')), runAbs, root, marker };
}

/** @type {Promise<Done> | null} */
let mainRun = null;
/** @type {Promise<Done> | null} */
let controlRun = null;

/** The guard, worker and refusal cases; none of the executed ones names a role or a state, so none seeds or logs in. */
function theMainRun() {
  mainRun ??= runProject([
    { title: 'A matching request to a host the guard does not approve', steps: [gotoPath('/app/1'), HEAD, click('outside'), post(1)] },
    { title: 'A matching request to such a host under a count of zero', steps: [gotoPath('/app/2'), HEAD, click('outside'), post(0)] },
    { title: 'A request that does not match is ignored', steps: [gotoPath('/app/3'), HEAD, click('other'), post(1)] },
    { title: 'The local request alone', steps: [gotoPath('/app/4'), HEAD, click('save'), post(1)] },
    { title: 'Service workers are blocked for a case that counts requests', steps: [gotoPath('/app-sw-with'), HEAD, post(0)] },
    { title: 'Service workers are allowed for a case that does not', steps: [gotoPath('/app-sw-without'), HEAD, { action: 'expect_visible', selector: '#swdone' }] },
    { title: 'Refused: no earlier interaction', role: 'admin', state: 'declared', steps: [post(1), gotoPath('/refused/one'), HEAD] },
    { title: 'Refused: a count of zero with no anchor', role: 'admin', state: 'declared', steps: [gotoPath('/refused/two'), click('save'), post(0)] },
  ]);
  return mainRun;
}

/** The twin of the refused entries: the same shape with its interaction and its anchor, with a role and a declared state. */
function theControlRun() {
  controlRun ??= runProject([
    { title: 'Anchored twin', role: 'admin', state: 'declared', steps: [gotoPath('/control'), HEAD, click('save'), post(0, '/nothing-like-this'), post(1)] },
  ]);
  return controlRun;
}

/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
/** @param {string} runAbs @returns {string[]} */
const evidenceFiles = (runAbs) => (existsSync(join(runAbs, 'evidence')) ? readdirSync(join(runAbs, 'evidence')) : []);

// ---------------------------------------------------------------------------
// 1. A matching request to a host the guard does not approve
// ---------------------------------------------------------------------------

test('AC-15 end to end: a matching request to a host the guard does not approve ends the case FAILED_NON_LOCAL_TARGET with nothing asserted, for a count of 1 and for a count of 0, and that host receives nothing', SLOW, async () => {
  const { out, results, runAbs } = await theMainRun();
  assert.equal(out.code, 0, `the runner exited ${out.code}: ${out.stderr}`);
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');
  const c = results.cases;
  assert.equal(c.length, 8);
  for (const i of [0, 1]) {
    assert.deepEqual([c[i].outcome, c[i].reason_code], ['blocked', 'FAILED_NON_LOCAL_TARGET'], `case ${i + 1}: ${brief(c[i])}`);
    assert.match(c[i].reason, /^step 4: /, brief(c[i]));
    for (const leak of ['127.0.0.2', 'qa-nonlocal', '/avatar', 'POST']) assert.ok(!String(c[i].reason).includes(leak), `case ${i + 1}: the reason names ${leak}: ${c[i].reason}`);
    assert.ok(c[i].evidence.every((/** @type {string} */ e) => !e.includes('.requests-')), `case ${i + 1} wrote a request file: ${JSON.stringify(c[i].evidence)}`);
  }
  const files = evidenceFiles(runAbs);
  assert.ok(!files.some((f) => f.startsWith('case-1.requests-') || f.startsWith('case-2.requests-')), `a blocked case wrote a request file: ${files.join(',')}`);
  if (farServer !== null) {
    assert.deepEqual(farSeen, [], 'the far host received a request: the guard did not stop it');
  }
});

test('AC-15 control: a request that does not match is ignored whatever its host, and the matching local request alone passes', SLOW, async () => {
  const { results, runAbs } = await theMainRun();
  const c = results.cases;
  assert.deepEqual([c[2].outcome, c[2].reason_code, c[2].reason], ['pass', null, null], `a non-matching non-local request blocked the case: ${brief(c[2])}`);
  assert.deepEqual([c[3].outcome, c[3].reason_code, c[3].reason], ['pass', null, null], brief(c[3]));
  const files = evidenceFiles(runAbs);
  assert.ok(files.includes('case-3.requests-4.json') && files.includes('case-4.requests-4.json'), files.join(','));
  // The ignored request left the machine for nowhere: the context route aborts every request to a host the guard does not approve.
  if (farServer !== null) assert.deepEqual(farSeen, [], 'the far host received a request');
});

// ---------------------------------------------------------------------------
// 2. Service workers
// ---------------------------------------------------------------------------

test('AC-12 end to end: a case that carries the step runs with service workers blocked, so the worker script is never fetched, while the same markup in a case with no such step registers its worker', SLOW, async () => {
  const { results } = await theMainRun();
  const c = results.cases;
  assert.deepEqual([c[5].outcome, c[5].reason_code, c[5].reason], ['pass', null, null], `the control page must register its worker and show it: ${brief(c[5])}`);
  assert.ok((workerHits['/sw-without.js'] ?? 0) >= 1, 'the control page never fetched its worker script, so the blocked case below proves nothing');
  assert.deepEqual([c[4].outcome, c[4].reason_code, c[4].reason], ['pass', null, null], brief(c[4]));
  assert.equal(workerHits['/sw-with.js'] ?? 0, 0, 'a worker script was fetched although service workers are blocked for a case that carries the step');
});

// ---------------------------------------------------------------------------
// 3. Refusal before any side effect
// ---------------------------------------------------------------------------

test('AC-12 end to end: an entry with no earlier interaction, or with a count of 0 and no anchor, is refused naming its step before anything is seeded, authenticated or requested', SLOW, async () => {
  const { results, runAbs, root, marker } = await theMainRun();
  const c = results.cases;
  assert.deepEqual([c[6].outcome, c[6].reason_code], ['needs-human', 'PLAN_ENTRY_INVALID'], brief(c[6]));
  assert.match(c[6].reason, /^step 1: .*expect_requests/, brief(c[6]));
  assert.deepEqual([c[7].outcome, c[7].reason_code], ['needs-human', 'PLAN_ENTRY_INVALID'], brief(c[7]));
  assert.match(c[7].reason, /^step 3: .*count 0/, brief(c[7]));
  for (const i of [6, 7]) {
    assert.deepEqual(c[i].evidence, [], `case ${i + 1} left evidence`);
    assert.ok(!/refused|avatar/.test(String(c[i].reason)), `case ${i + 1}: the reason echoes a path: ${c[i].reason}`);
  }
  // No side effect of any kind: no page was loaded, no session was obtained, no state was seeded.
  assert.equal(hits['/refused/one'] ?? 0, 0, 'the first refused entry loaded its page');
  assert.equal(hits['/refused/two'] ?? 0, 0, 'the second refused entry loaded its page');
  assert.equal(existsSync(join(root, 'PRPs', 'auth', '.sessions')), false, 'a refused entry obtained a session');
  assert.equal(existsSync(marker), false, 'a refused entry seeded its state');
  const files = evidenceFiles(runAbs);
  assert.ok(!files.some((f) => f.startsWith('case-7.') || f.startsWith('case-8.')), `a refused entry wrote evidence: ${files.join(',')}`);
  assert.deepEqual(validateResults(results), []);
});

test('AC-12 control: the entry shape that is refused for want of an interaction and an anchor (a role, a declared state and a seed command) seeds, logs in, loads its page and counts once it carries them', SLOW, async () => {
  const { out, results, root, marker } = await theControlRun();
  assert.equal(out.code, 0, `the runner exited ${out.code}: ${out.stderr}`);
  const [c] = results.cases;
  assert.deepEqual([c.outcome, c.reason_code, c.reason], ['pass', null, null], brief(c));
  // Without these three traces, "the refused entry left none" above would prove nothing.
  assert.ok((hits['/control'] ?? 0) >= 1, 'the anchored twin did not load its page');
  assert.equal(existsSync(join(root, 'PRPs', 'auth', '.sessions')), true, 'the anchored twin did not obtain a session');
  assert.equal(existsSync(marker), true, 'the anchored twin did not seed its state');
});
