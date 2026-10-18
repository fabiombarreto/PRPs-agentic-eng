// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-12 A network-request assertion (the evidence records method, host, path and count without query strings or bodies)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-5 Run evidence is ignored and the ignore is proven (the new file is written through the single write helper into the ignored evidence/ directory, and no secret reaches it)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the evidence and its privacy, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A4 the evidence file holds method, host, path and counts only, through the one write helper into
 *              the ignored evidence/, no canary reaches a file or a stream, a registered secret in a path is masked,
 *              also when it straddles the 200 character cap of the written listing)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against a loopback application and a real Chromium, once for the whole file, in a real git work tree.
 * The page sends a canary in the query string, a header, an authorization token, the body and a cookie of every
 * request, and the application records what it received, so a "nowhere" below is a statement about values that
 * really were on the wire.
 *
 *   1. The file name and shape: `evidence/case-<index>.requests-<step>.json` holds the action, the step, the
 *      method, the expected and observed counts, the truncated flag, the result and, per listed request, only its
 *      method, host and path; at most 50 are listed with the observed count exact; a failing step has a file too.
 *   2. results.json carries for the step only its index, action, result and the path of that file, and a failing
 *      reason only the step position and the two counts.
 *   3. No canary appears in any run file or on either terminal stream; a registered secret in a path is masked.
 *   4. The cap of 200 characters is a cap on the written listing only: the whole path decides the count, the
 *      listing holds the first 200 characters of the REDACTED path, so a registered secret that straddles
 *      character 200 appears neither whole nor as a prefix of 6 or more characters in any written file.
 *   5. PERMITTED, pinned as it is: an identifier the redaction table does not recognize (a user id, an e-mail
 *      address in a route) may appear in the evidence file, and appears nowhere else. An e-mail address in a path
 *      is NOT withheld: that rule exists only for snapshot entries.
 *   6. In a real work tree, the file is ignored by git and the files that stay tracked are not.
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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { EXPECT_REQUESTS_EVIDENCE_MAX } from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const RUNNER_SRC = process.env.QA_V2P6_RUNNER_SRC ? resolve(process.env.QA_V2P6_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p6-evidence-'));
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
/** @param {string[]} args @param {string} cwd */
const git = (args, cwd) => spawnSync('git', args, { cwd, env: { ...process.env, ...GIT_ENV }, encoding: 'utf8', windowsHide: true });

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

/** One canary per channel a request has beyond its method and its path. */
const CAN = { query: 'QryCanary-7731', fragment: 'FragCanary-7732', header: 'HdrCanary-7733', body: 'BodyCanary-7734', cookie: 'CookCanary-7735', token: 'TokCanary-7736' };
/** Registered through the environment of the runner: a variable whose name carries SECRET is a redaction value. */
const ENV_SECRET = 'envsecretvalue-Zq83kd01';
/** Identifiers no table registers. */
const USER_ID = 'user-8841-ab';
const EMAIL = 'ana.souza@example.com';
/** A path whose distinguishing text lies only past character 200. */
const TAIL = `/avatar/${'a'.repeat(250)}/zzz-tail`;
/** A path whose registered secret starts at character 190, so it straddles the 200 character cap of the listing. */
const STRADDLE = `/avatar/${'a'.repeat(182)}${ENV_SECRET}`;

const PAGE = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Painel</title></head><body>
<h1>Painel</h1>
<button id="save" type="button">Salvar</button>
<button id="twice" type="button">Duas vezes</button>
<button id="many" type="button">Muitas</button>
<button id="secret" type="button">Segredo</button>
<button id="ident" type="button">Identificadores</button>
<button id="tail" type="button">Cauda</button>
<button id="straddle" type="button">Limite</button>
<script>
document.cookie = "cc=${CAN.cookie}; path=/";
var send = function (path) {
  return fetch(path, { method: "POST", headers: { "x-canary": "${CAN.header}", "authorization": "Bearer ${CAN.token}", "content-type": "application/json" }, body: JSON.stringify({ v: "${CAN.body}" }) }).catch(function () {});
};
document.getElementById("save").onclick = function () { send("/avatar?token=${CAN.query}#${CAN.fragment}"); };
document.getElementById("twice").onclick = function () { send("/avatar"); send("/avatar"); };
document.getElementById("many").onclick = function () { for (var i = 0; i < 60; i++) { send("/avatar"); } };
document.getElementById("secret").onclick = function () { send("/avatar/${ENV_SECRET}"); };
document.getElementById("ident").onclick = function () { send("/avatar/${USER_ID}"); send("/avatar/${EMAIL}"); };
document.getElementById("tail").onclick = function () { send("${TAIL}"); };
document.getElementById("straddle").onclick = function () { send("${STRADDLE}"); };
</script></body></html>`;

/** What the application received on a POST. @type {{ url: string, header: string, authorization: string, cookie: string, body: string }[]} */
const received = [];
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        received.push({
          url: String(req.url),
          header: String(req.headers['x-canary'] ?? ''),
          authorization: String(req.headers.authorization ?? ''),
          cookie: String(req.headers.cookie ?? ''),
          body,
        });
        res.writeHead(204);
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

// ---------------------------------------------------------------------------
// The fixture and the one run
// ---------------------------------------------------------------------------

const HEAD = { action: 'expect_visible', selector: 'h1' };
/** @param {number} n */
const gotoCase = (n) => ({ action: 'goto', path: `/app/${n}` });
/** @param {string} id */
const click = (id) => ({ action: 'click', selector: `#${id}` });
/** @param {number} count @param {string} [urlContains] */
const post = (count, urlContains = '/avatar') => ({ action: 'expect_requests', method: 'POST', url_contains: urlContains, count });

/** @type {{ title: string, steps: (n: number) => any[] }[]} the step that counts is the fourth of every case */
const CASES = [
  { title: 'Save once', steps: (n) => [gotoCase(n), HEAD, click('save'), post(1)] },
  { title: 'Submit twice, expected once', steps: (n) => [gotoCase(n), HEAD, click('twice'), post(1)] },
  { title: 'Sixty requests', steps: (n) => [gotoCase(n), HEAD, click('many'), post(60)] },
  { title: 'A registered secret in the path', steps: (n) => [gotoCase(n), HEAD, click('secret'), post(1)] },
  { title: 'Identifiers no table registers', steps: (n) => [gotoCase(n), HEAD, click('ident'), post(2, '/avatar/')] },
  { title: 'A match that lies past character 200', steps: (n) => [gotoCase(n), HEAD, click('tail'), post(1, '/zzz-tail')] },
  { title: 'A count of zero on a request past character 200', steps: (n) => [gotoCase(n), HEAD, click('tail'), post(0, '/zzz-tail')] },
  { title: 'A registered secret that straddles character 200', steps: (n) => [gotoCase(n), HEAD, click('straddle'), post(1)] },
];

/** @type {Promise<{ out: { code: number | null, stdout: string, stderr: string }, results: any, runAbs: string, root: string }> | null} */
let runPromise = null;

function theRun() {
  runPromise ??= (async () => {
    const root = mkdtempSync(join(SANDBOX, 'run-'));
    const init = git(['init', '-q'], root);
    assert.equal(init.status, 0, `git init failed: ${init.stderr}`);
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
        env: { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES, RELAY_QA_FIXTURE_SECRET: ENV_SECRET },
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
    return { out, results: JSON.parse(readFileSync(file, 'utf8')), runAbs, root };
  })();
  return runPromise;
}

/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
/** @param {string} dir @returns {string[]} every file under dir */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
/** @param {string} runAbs @param {number} n @returns {any} the parsed request file of case n (its counting step is the fourth) */
const requestFile = (runAbs, n) => JSON.parse(readFileSync(join(runAbs, 'evidence', `case-${n}.requests-4.json`), 'utf8'));

// ---------------------------------------------------------------------------
// 1. The file and its shape
// ---------------------------------------------------------------------------

test('AC-12 end to end: the evidence file of a passing step holds the action, the step, the method, the two counts, the truncated flag, the result and per request only method, host and path', SLOW, async () => {
  const { out, results, runAbs } = await theRun();
  assert.equal(out.code, 0, `the runner exited ${out.code}: ${out.stderr}`);
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');
  assert.deepEqual([results.cases[0].outcome, results.cases[0].reason_code, results.cases[0].reason], ['pass', null, null], brief(results.cases[0]));

  const doc = requestFile(runAbs, 1);
  assert.deepEqual(Object.keys(doc).sort(), ['action', 'expected', 'method', 'observed', 'requests', 'result', 'step', 'truncated']);
  assert.deepEqual([doc.action, doc.step, doc.method, doc.expected, doc.observed, doc.truncated, doc.result], ['expect_requests', 4, 'POST', 1, 1, false, 'passed']);
  assert.equal(doc.requests.length, 1);
  assert.deepEqual(Object.keys(doc.requests[0]).sort(), ['host', 'method', 'path']);
  assert.deepEqual(doc.requests[0], { method: 'POST', host: baseUrl.replace('http://', ''), path: '/avatar' });
  // The application did receive a query string on that request: it is the path alone that was recorded.
  assert.ok(received.some((r) => r.url === `/avatar?token=${CAN.query}`), 'the page did not send the query string the file must not hold');
});

test('AC-12 end to end: a failing step has a request file too, with its result and counts, and the reason of the case carries only the step position and the two counts', SLOW, async () => {
  const { results, runAbs } = await theRun();
  const c = results.cases[1];
  assert.deepEqual([c.outcome, c.reason_code, c.reason], ['fail', null, 'step 4: the page issued 2 matching request(s); 1 were expected'], brief(c));
  const doc = requestFile(runAbs, 2);
  assert.deepEqual([doc.expected, doc.observed, doc.truncated, doc.result, doc.requests.length], [1, 2, false, 'failed', 2]);
  for (const r of doc.requests) assert.deepEqual(Object.keys(r).sort(), ['host', 'method', 'path']);
});

test('AC-12 end to end: results.json carries for the step only its index, action, result and the path of its evidence file', SLOW, async () => {
  const { results } = await theRun();
  const stepOf = (/** @type {number} */ i) => results.cases[i].steps[3];
  assert.deepEqual(Object.keys(stepOf(0)).sort(), ['action', 'evidence', 'index', 'result']);
  assert.deepEqual(stepOf(0), { index: 4, action: 'expect_requests', result: 'passed', evidence: `${RUN_REL}/evidence/case-1.requests-4.json` });
  assert.deepEqual(Object.keys(stepOf(1)).sort(), ['action', 'evidence', 'index', 'result']);
  assert.deepEqual(stepOf(1), { index: 4, action: 'expect_requests', result: 'failed', evidence: `${RUN_REL}/evidence/case-2.requests-4.json` });
  assert.ok(results.cases[0].evidence.includes(`${RUN_REL}/evidence/case-1.requests-4.json`), JSON.stringify(results.cases[0].evidence));
  assert.deepEqual(validateResults(results), []);
});

test('AC-12 end to end: with more matching requests than the list holds, the observed count stays exact, the list stops at its cap and the file says so', SLOW, async () => {
  const { results, runAbs } = await theRun();
  assert.deepEqual([results.cases[2].outcome, results.cases[2].reason_code], ['pass', null], brief(results.cases[2]));
  const doc = requestFile(runAbs, 3);
  assert.equal(EXPECT_REQUESTS_EVIDENCE_MAX, 50);
  assert.deepEqual([doc.expected, doc.observed, doc.truncated, doc.result], [60, 60, true, 'passed']);
  assert.equal(doc.requests.length, EXPECT_REQUESTS_EVIDENCE_MAX);
});

// ---------------------------------------------------------------------------
// 2. Nothing but method, host and path
// ---------------------------------------------------------------------------

test('AC-12 end to end: a canary in the query string, the fragment, a header, an authorization token, the body and a cookie reaches no file of the run and neither terminal stream', SLOW, async () => {
  const { out, runAbs } = await theRun();
  // The application received each of them: a "nowhere" below is about values that were really on the wire.
  assert.ok(received.some((r) => r.header === CAN.header), 'the page did not send the header canary');
  assert.ok(received.some((r) => r.authorization === `Bearer ${CAN.token}`), 'the page did not send the authorization canary');
  assert.ok(received.some((r) => r.body.includes(CAN.body)), 'the page did not send the body canary');
  assert.ok(received.some((r) => r.cookie.includes(CAN.cookie)), 'the page did not send the cookie canary');

  // The fragment never leaves the browser, so it is covered by the pure classifier test too; it is watched here as well.
  const watched = Object.entries(CAN);
  const files = walk(runAbs).filter((p) => !p.endsWith('plan.json'));
  assert.ok(files.length > 8, `the run directory holds only ${files.length} files`);
  for (const f of files) {
    const text = readFileSync(f).toString('latin1');
    for (const [channel, value] of watched) assert.ok(!text.includes(value), `the ${channel} canary reached ${f}`);
  }
  for (const [channel, value] of watched) assert.ok(!(out.stdout + out.stderr).includes(value), `the ${channel} canary reached a terminal stream`);
});

test('AC-5 end to end: a registered secret that appears in a path is masked in the file and is on no terminal stream', SLOW, async () => {
  const { results, out, runAbs } = await theRun();
  assert.deepEqual([results.cases[3].outcome, results.cases[3].reason_code], ['pass', null], brief(results.cases[3]));
  assert.ok(received.some((r) => r.url === `/avatar/${ENV_SECRET}`), 'the page did not send the secret in the path');
  assert.deepEqual(requestFile(runAbs, 4).requests.map((/** @type {any} */ r) => r.path), ['/avatar/[REDACTED]']);
  assert.ok(!(out.stdout + out.stderr).includes(ENV_SECRET));
});

// ---------------------------------------------------------------------------
// 3. The 200 character cap is a cap on the written listing only
// ---------------------------------------------------------------------------

test('AC-12 end to end: a request whose distinguishing text lies only past character 200 is counted on the whole path, and the file lists the first 200 characters of it', SLOW, async () => {
  const { results, runAbs } = await theRun();
  assert.equal(TAIL.indexOf('/zzz-tail'), TAIL.length - '/zzz-tail'.length);
  assert.ok(TAIL.indexOf('/zzz-tail') > 200, 'the fixture needle must lie past the cap');
  assert.deepEqual([results.cases[5].outcome, results.cases[5].reason_code, results.cases[5].reason], ['pass', null, null], `the match was cut before it was made: ${brief(results.cases[5])}`);
  assert.deepEqual([results.cases[6].outcome, results.cases[6].reason_code, results.cases[6].reason], ['fail', null, 'step 4: the page issued 1 matching request(s); 0 were expected'], `a count of 0 passed on a request that was issued: ${brief(results.cases[6])}`);
  const listed = requestFile(runAbs, 6);
  assert.equal(listed.observed, 1);
  assert.equal(listed.requests[0].path.length, 200);
  assert.equal(listed.requests[0].path, TAIL.slice(0, 200));
});

test('AC-5 end to end: a registered secret that straddles character 200 is replaced whole before the cut, so it appears neither whole nor as a prefix of 6 or more characters in any written file', SLOW, async () => {
  const { results, runAbs, out } = await theRun();
  assert.deepEqual([results.cases[7].outcome, results.cases[7].reason_code], ['pass', null], brief(results.cases[7]));
  assert.equal(STRADDLE.indexOf(ENV_SECRET), 190, 'the fixture secret must start at character 190');
  assert.ok(received.some((r) => r.url === STRADDLE), 'the page did not send the straddling path');
  const listed = requestFile(runAbs, 8).requests[0].path;
  assert.equal(listed, `/avatar/${'a'.repeat(182)}[REDACTED]`, 'the secret was cut before it was redacted, or not redacted');
  assert.equal(listed.length, 200);

  const prefixes = [];
  for (let n = 6; n <= ENV_SECRET.length; n++) prefixes.push(ENV_SECRET.slice(0, n));
  for (const f of walk(runAbs).filter((p) => !p.endsWith('plan.json'))) {
    const text = readFileSync(f).toString('latin1');
    for (const p of prefixes) assert.ok(!text.includes(p), `a prefix of the registered secret (${p.length} characters) reached ${f}`);
  }
  for (const p of prefixes) assert.ok(!(out.stdout + out.stderr).includes(p), `a prefix of the registered secret (${p.length} characters) reached a terminal stream`);
});

// ---------------------------------------------------------------------------
// 4. What is permitted, and the ignore
// ---------------------------------------------------------------------------

test('AC-5 end to end: an identifier no table registers (a user id, an e-mail address in a route) may appear in the evidence file and appears nowhere else; this is permitted, as the policy and the doc state', SLOW, async () => {
  const { results, out, runAbs } = await theRun();
  assert.deepEqual([results.cases[4].outcome, results.cases[4].reason_code, results.cases[4].reason], ['pass', null, null], brief(results.cases[4]));
  assert.ok(received.some((r) => r.url === `/avatar/${EMAIL}`), 'the page did not send the e-mail address in the path');
  const listed = requestFile(runAbs, 5).requests.map((/** @type {any} */ r) => r.path).sort();
  // PERMITTED, pinned as it is: the file lists both identifiers as the page sent them.
  assert.deepEqual(listed, [`/avatar/${EMAIL}`, `/avatar/${USER_ID}`].sort());
  const home = join(runAbs, 'evidence', 'case-5.requests-4.json');
  for (const f of walk(runAbs).filter((p) => p !== home && !p.endsWith('plan.json'))) {
    const text = readFileSync(f).toString('latin1');
    for (const id of [USER_ID, EMAIL]) assert.ok(!text.includes(id), `an identifier reached ${f}, which is not the request file of its step`);
  }
  for (const id of [USER_ID, EMAIL]) assert.ok(!(out.stdout + out.stderr).includes(id), 'an identifier reached a terminal stream');
});

test('AC-5 end to end: in a real work tree the request files are ignored by git, written only under evidence/, and results.json stays trackable', SLOW, async () => {
  const { root, runAbs } = await theRun();
  const rel = `${RUN_REL}/evidence/case-1.requests-4.json`;
  assert.equal(git(['check-ignore', '-q', '--', rel], root).status, 0, 'git does not ignore the request file');
  assert.equal(git(['check-ignore', '-q', '--', `${RUN_REL}/results.json`], root).status, 1, 'the control path is ignored: the proof proves nothing');
  const untracked = git(['ls-files', '--others', '--exclude-standard'], root);
  assert.equal(untracked.status, 0, untracked.stderr);
  const lines = untracked.stdout.split('\n').filter(Boolean);
  assert.ok(lines.includes(`${RUN_REL}/results.json`), `results.json is not trackable: ${lines.join(',')}`);
  assert.ok(!lines.some((l) => l.includes('/evidence/')), `an evidence file is not ignored: ${lines.filter((l) => l.includes('/evidence/')).join(',')}`);
  const files = readdirSync(join(runAbs, 'evidence'));
  assert.ok(files.every((f) => !f.endsWith('.tmp')), `a temporary file was left behind: ${files.join(',')}`);
  assert.ok(files.filter((f) => f.includes('.requests-')).every((f) => /^case-\d+\.requests-\d+\.json$/.test(f)), files.join(','));
});
