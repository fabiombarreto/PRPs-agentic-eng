// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-12 A network-request assertion (given a browser case that clicks "Salvar" and a step expect_requests POST /avatar count 1, the step passes only when the page issued exactly that many matching requests during the step window; a duplicate submit fails with the counts and no value)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the count and its window, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A1 the step passes only on an exact count of the window's matching requests, decided after the
 *              settle wait)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against a loopback application and a real Chromium, once for the whole file. Every case opens its own
 * page path (/app/<n>), and the application counts what it RECEIVED per page, so what the page really sent is
 * read from the server and not from the runner's own words.
 *
 *   1. One click that POSTs once passes a count of 1 and fails a count of 2 and a count of 0; a click that submits
 *      twice fails a count of 1 and passes a count of 2; a failing reason carries the step position and the two
 *      counts only.
 *   2. The method is part of the match (a GET is not a POST), and an anchored count of 0 passes on a page that
 *      sent nothing.
 *   3. The window: a request a handler issues after click() returned is counted; the window opens at the last
 *      interaction, so a request of an earlier click is outside it (and is counted when no interaction came
 *      between); a request issued after the settle window is outside it, which is a KNOWN LIMIT of the fixed
 *      window and is pinned as it is, not as desired behaviour; each redirect hop is a request of its own.
 *   4. A case that carries no such step runs as it always did: it passes and writes no request file.
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

import { EXPECT_REQUESTS_SETTLE_MS } from '../../../plugins/relay/scripts/qa-run.mjs';
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

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p6-count-'));
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
// The loopback application
// ---------------------------------------------------------------------------

/** A request one chosen settle window plus this long after the click is outside the window. */
const OUTSIDE_DELAY_MS = EXPECT_REQUESTS_SETTLE_MS + 2500;
/** A request this long after the click is inside the window, which is longer than this. */
const INSIDE_DELAY_MS = 600;

const PAGE = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Painel</title></head><body>
<h1>Painel</h1>
<button id="save" type="button">Salvar</button>
<button id="twice" type="button">Duas vezes</button>
<button id="nothing" type="button">Nada</button>
<button id="get" type="button">Ler</button>
<button id="late" type="button">Tarde</button>
<button id="verylate" type="button">Muito tarde</button>
<button id="redirect" type="button">Redirecionar</button>
<p id="done" hidden>Enviado</p>
<p id="late-done" hidden>Chegou</p>
<script>
var post = function (path) { return fetch(path, { method: "POST" }).catch(function () {}); };
document.getElementById("save").onclick = function () { post("/avatar").then(function () { document.getElementById("done").hidden = false; }); };
document.getElementById("twice").onclick = function () { post("/avatar"); post("/avatar"); };
document.getElementById("get").onclick = function () { fetch("/avatar").catch(function () {}); };
document.getElementById("late").onclick = function () { setTimeout(function () { post("/avatar"); }, ${INSIDE_DELAY_MS}); };
document.getElementById("verylate").onclick = function () { setTimeout(function () { post("/avatar").then(function () { document.getElementById("late-done").hidden = false; }); }, ${OUTSIDE_DELAY_MS}); };
document.getElementById("redirect").onclick = function () { post("/redir"); };
</script></body></html>`;

/** What the application received, keyed by the page that sent it: `<page path> <method> <path>`. @type {Record<string, number>} */
const received = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    if (req.method === 'POST') {
      const page = req.headers.referer ? new URL(String(req.headers.referer)).pathname : '(none)';
      const key = `${page} POST ${path}`;
      received[key] = (received[key] ?? 0) + 1;
      req.resume();
      req.on('end', () => {
        if (path === '/redir') res.writeHead(307, { location: '/avatar' });
        else res.writeHead(204);
        res.end();
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

/** How many POSTs of `path` the application received from the page of case `n`. @param {number} n @param {string} path */
const receivedFrom = (n, path) => received[`/app/${n}/ POST ${path}`] ?? received[`/app/${n} POST ${path}`] ?? 0;

// ---------------------------------------------------------------------------
// The fixture and the one run
// ---------------------------------------------------------------------------

/** @param {number} n */
const gotoCase = (n) => ({ action: 'goto', path: `/app/${n}` });
const HEAD = { action: 'expect_visible', selector: 'h1' };
/** @param {string} id */
const click = (id) => ({ action: 'click', selector: `#${id}` });
/** @param {string} method @param {number} count @param {string} [urlContains] */
const req = (method, count, urlContains = '/avatar') => ({ action: 'expect_requests', method, url_contains: urlContains, count });
const SAVED = { action: 'expect_visible', selector: '#done' };

/** @type {{ title: string, steps: (n: number) => any[] }[]} the position of an entry is its case number (1-based) */
const CASES = [
  { title: 'Save once', steps: (n) => [gotoCase(n), HEAD, click('save'), req('POST', 1)] },
  { title: 'Submit twice counted as one', steps: (n) => [gotoCase(n), HEAD, click('twice'), req('POST', 1)] },
  { title: 'Submit twice counted as two', steps: (n) => [gotoCase(n), HEAD, click('twice'), req('POST', 2)] },
  { title: 'Save once counted as two', steps: (n) => [gotoCase(n), HEAD, click('save'), req('POST', 2)] },
  { title: 'Save once counted as none', steps: (n) => [gotoCase(n), HEAD, click('save'), req('POST', 0)] },
  { title: 'A read is not a write', steps: (n) => [gotoCase(n), HEAD, click('get'), req('POST', 0), req('GET', 1)] },
  { title: 'Nothing is sent', steps: (n) => [gotoCase(n), HEAD, click('nothing'), req('POST', 0)] },
  { title: 'A request after the click returned', steps: (n) => [gotoCase(n), HEAD, click('late'), req('POST', 1)] },
  { title: 'A request after the window closed', steps: (n) => [gotoCase(n), HEAD, click('verylate'), req('POST', 0)] },
  { title: 'The same request once an assertion waited for it', steps: (n) => [gotoCase(n), HEAD, click('verylate'), { action: 'expect_visible', selector: '#late-done' }, req('POST', 1)] },
  { title: 'The window opens at the last interaction', steps: (n) => [gotoCase(n), HEAD, click('save'), SAVED, click('nothing'), req('POST', 0)] },
  { title: 'The earlier click is in the window when nothing came between', steps: (n) => [gotoCase(n), HEAD, click('save'), SAVED, req('POST', 1)] },
  { title: 'A redirect hop is a request of its own', steps: (n) => [gotoCase(n), HEAD, click('redirect'), req('POST', 1, '/redir'), req('POST', 1, '/avatar')] },
  { title: 'A case with no request step', steps: (n) => [gotoCase(n), HEAD, click('save'), SAVED] },
];

/** @type {Promise<{ out: { code: number | null, stdout: string, stderr: string }, results: any, runAbs: string }> | null} */
let runPromise = null;

function theRun() {
  runPromise ??= (async () => {
    const root = mkdtempSync(join(SANDBOX, 'run-'));
    const runAbs = join(root, ...RUN_REL.split('/'));
    mkdirSync(runAbs, { recursive: true });
    mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
    const block = (/** @type {string} */ title, /** @type {number} */ i) =>
      [`### Case ${i + 1}`, `**Title:** ${title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', '2. Act and count the requests.', ''].join('\n');
    const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
    writeFileSync(report, `# QA Report\n\n## Test Cases\n\n${CASES.map((c, i) => block(c.title, i)).join('\n')}\n## Notes\n\nnone\n`);
    writeFileSync(
      join(runAbs, 'plan.json'),
      JSON.stringify({ schema_version: 1, cases: CASES.map((c, i) => ({ index: i + 1, title: c.title, driver: 'browser', role: null, state: 'none', steps: c.steps(i + 1) })) }),
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
    return { out, results: JSON.parse(readFileSync(file, 'utf8')), runAbs };
  })();
  return runPromise;
}

/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
/** @param {number} issued @param {number} wanted @param {number} at */
const countsReason = (issued, wanted, at) => `step ${at}: the page issued ${issued} matching request(s); ${wanted} were expected`;

// ---------------------------------------------------------------------------
// 1. The exact count
// ---------------------------------------------------------------------------

test('AC-12 end to end: one click that POSTs once passes a count of 1, and fails a count of 2 and a count of 0 with the step position and the two counts only', SLOW, async () => {
  const { out, results } = await theRun();
  assert.equal(out.code, 0, `the runner exited ${out.code}: ${out.stderr}`);
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');
  const c = results.cases;
  assert.equal(c.length, CASES.length);

  // The application's own count of what the page sent is the ground truth the reasons are compared with.
  assert.equal(receivedFrom(1, '/avatar'), 1);
  assert.deepEqual([c[0].outcome, c[0].reason_code, c[0].reason], ['pass', null, null], brief(c[0]));

  assert.equal(receivedFrom(4, '/avatar'), 1);
  assert.deepEqual([c[3].outcome, c[3].reason_code, c[3].reason], ['fail', null, countsReason(1, 2, 4)], brief(c[3]));
  assert.equal(receivedFrom(5, '/avatar'), 1);
  assert.deepEqual([c[4].outcome, c[4].reason_code, c[4].reason], ['fail', null, countsReason(1, 0, 4)], brief(c[4]));

  for (const i of [3, 4]) {
    for (const leak of ['/avatar', 'POST', '127.0.0.1', 'http']) assert.ok(!String(c[i].reason).includes(leak), `case ${i + 1}: the reason carries ${leak}: ${c[i].reason}`);
  }
});

test('AC-12 end to end: a duplicate submit fails a count of 1 with the observed and the expected count, and the same click passes a count of 2', SLOW, async () => {
  const { results } = await theRun();
  const c = results.cases;
  assert.equal(receivedFrom(2, '/avatar'), 2, 'the page was expected to submit twice');
  assert.deepEqual([c[1].outcome, c[1].reason_code, c[1].reason], ['fail', null, countsReason(2, 1, 4)], brief(c[1]));
  assert.equal(receivedFrom(3, '/avatar'), 2);
  assert.deepEqual([c[2].outcome, c[2].reason_code, c[2].reason], ['pass', null, null], brief(c[2]));

  // The failing step is the one that ended the case, and it points at the evidence of its own count.
  const failed = c[1].steps;
  assert.deepEqual(failed.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'passed', 'failed']);
  assert.equal(failed[3].action, 'expect_requests');
  assert.match(failed[3].evidence, /\/evidence\/case-2\.requests-4\.json$/);
});

test('AC-12 end to end: the method is part of the match (a GET is not a POST), and an anchored count of 0 passes on a page that sent nothing', SLOW, async () => {
  const { results } = await theRun();
  const c = results.cases;
  assert.equal(receivedFrom(6, '/avatar'), 0, 'the page of case 6 sent no POST');
  assert.deepEqual([c[5].outcome, c[5].reason_code, c[5].reason], ['pass', null, null], `a GET was counted as a POST or a POST count of 0 failed: ${brief(c[5])}`);
  assert.deepEqual([c[6].outcome, c[6].reason_code, c[6].reason], ['pass', null, null], brief(c[6]));
  assert.equal(receivedFrom(7, '/avatar'), 0);
});

// ---------------------------------------------------------------------------
// 2. The window
// ---------------------------------------------------------------------------

test('AC-12 end to end: a request a handler issues after the click returned is inside the window, because the step waits before it counts', SLOW, async () => {
  assert.ok(INSIDE_DELAY_MS < EXPECT_REQUESTS_SETTLE_MS, 'the fixture delay must be shorter than the window it is meant to be inside');
  const { results } = await theRun();
  const c = results.cases[7];
  assert.equal(receivedFrom(8, '/avatar'), 1, 'the application received the late request');
  assert.deepEqual([c.outcome, c.reason_code, c.reason], ['pass', null, null], `the step counted before the late request arrived: ${brief(c)}`);
});

test('AC-12 end to end: a request issued after the window closed is outside it, so an anchored count of 0 passes on it; this is a known limit of the fixed window, pinned as it is and not as desired behaviour', SLOW, async () => {
  const { results } = await theRun();
  const outside = results.cases[8];
  assert.deepEqual([outside.outcome, outside.reason_code, outside.reason], ['pass', null, null], `a request after the window was counted: ${brief(outside)}`);

  // The page does send that request: the twin that lets an assertion wait for it first counts it, in the same window start.
  const waited = results.cases[9];
  assert.equal(receivedFrom(10, '/avatar'), 1, 'the page of the twin sent the late request');
  assert.deepEqual([waited.outcome, waited.reason_code, waited.reason], ['pass', null, null], brief(waited));
});

test('AC-12 end to end: the window opens at the last interaction, so the request of an earlier click is outside it, and is counted when no interaction came between', SLOW, async () => {
  const { results } = await theRun();
  const c = results.cases;
  // Both cases clicked save, waited for its request to complete, and asserted; only the second one clicked again.
  assert.equal(receivedFrom(11, '/avatar'), 1);
  assert.equal(receivedFrom(12, '/avatar'), 1);
  assert.deepEqual([c[11].outcome, c[11].reason_code, c[11].reason], ['pass', null, null], `the control: the earlier click must be counted: ${brief(c[11])}`);
  assert.deepEqual([c[10].outcome, c[10].reason_code, c[10].reason], ['pass', null, null], `the window started at the first interaction of the case: ${brief(c[10])}`);
});

test('AC-12 end to end: each redirect hop is a request of its own, counted under its own path', SLOW, async () => {
  const { results } = await theRun();
  const c = results.cases[12];
  assert.equal(receivedFrom(13, '/redir'), 1);
  assert.equal(receivedFrom(13, '/avatar'), 1, 'the application received the request of the second hop');
  assert.deepEqual([c.outcome, c.reason_code, c.reason], ['pass', null, null], brief(c));
});

// ---------------------------------------------------------------------------
// 3. A case with no such step, and the shape of the whole run
// ---------------------------------------------------------------------------

test('AC-12 control: a case with no expect_requests step passes as it always did and writes no request file, and the run is a valid results.json', SLOW, async () => {
  const { results, runAbs } = await theRun();
  const c = results.cases[13];
  assert.deepEqual([c.outcome, c.reason_code, c.reason], ['pass', null, null], brief(c));
  assert.deepEqual(c.steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'passed', 'passed']);
  const files = readdirSync(join(runAbs, 'evidence'));
  assert.ok(!files.some((f) => f.startsWith('case-14.requests-')), `a case with no request step wrote ${files.join(',')}`);
  assert.ok(files.includes('case-14.png'), `the case kept its final capture: ${files.join(',')}`);
  // The cases that count requests wrote one file per step, named by case and step position.
  assert.ok(files.includes('case-1.requests-4.json'), files.join(','));
  assert.ok(files.includes('case-13.requests-4.json') && files.includes('case-13.requests-5.json'), files.join(','));
  assert.deepEqual(validateResults(results), []);
});
