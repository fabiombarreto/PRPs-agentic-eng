// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-13 One bounded re-mint (a minted role whose login script halts FAILED_PROBE_MARKER_ABSENT right after the mint is re-run exactly once with --force; a proven second attempt yields the session and a second failure leaves the role blocked)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (the second run is the one existing spawn: the same arguments plus --force, no secret on a command line)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the re-mint through the runner, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A5 one retry with --force and the session of the second attempt registered for redaction, a
 *              second halt leaves the role blocked, AC-A6 no other role or halt is retried, the retry writes
 *              nothing and prints nothing)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against hand-written stub login scripts. A stub appends its whole argument vector to a log in the
 * project, then halts with the code its script names for that run or writes a session, so what the runner ran,
 * how many times and with which flags is read from the stub and not from the runner's own words. The cases are
 * http cases against a loopback server that echoes the cookie it received, so a session value that was never
 * registered for redaction would reach the evidence. No browser is launched.
 *
 *   1. One halt then a proven session: the script runs twice, the second time with the same arguments plus
 *      --force and nothing else, both cases pass, the script is not run again for the second case, and the
 *      session value of the SECOND attempt is masked in the evidence.
 *   2. Two halts: exactly two runs and the role blocked with the code of the LAST halt, whether it is the same
 *      code (the fixed sentence of today) or another named one; no third run and a cached failure.
 *   3. Never retried: a first halt that is any other named code, and a role whose mechanism is not minted.
 *   4. A run forced before the first case (a session inside the pre-run margin): --force, then --force once more.
 *   5. A `ground` command obtains its session the same way and is a run of its own: one halt then a session
 *      writes its snapshot after two runs, two halts stop it after two runs with nothing written.
 *   6. The retry leaves no trace beyond what a first-try run leaves: the same standard streams, the same files
 *      and the same results, and no value of a login script's streams reaches a run file or a terminal stream.
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
import { join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const RUNNER_SRC = process.env.QA_V2P6_RUNNER_SRC ? resolve(process.env.QA_V2P6_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p6-remint-'));
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

const HALT = 'FAILED_PROBE_MARKER_ABSENT';
/** The session value of the stub: it must be masked wherever the application echoes it. */
const SID = 'sidvalue-Zq83kd01-Hh2k9X7';
/** A value on both streams of every stub run, which no run file and no terminal stream may carry. */
const STUB_CANARY = 'StubCanary-5521';
const PROBE_SENTENCE = "the kit's session probe for role admin halted; nothing was saved or reused";

// ---------------------------------------------------------------------------
// The loopback application: it echoes the cookie it received
// ---------------------------------------------------------------------------

/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    if (String(req.url).split('?')[0] === '/page') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Painel</title></head><body><h1>Painel</h1><p>Texto fixo</p></body></html>');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, c: String(req.headers.cookie ?? '') }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

// ---------------------------------------------------------------------------
// The stub login script, the fixture and the runner
// ---------------------------------------------------------------------------

const STATE = { cookies: [{ name: 'sid', value: SID, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] };

/**
 * The source of a stub login script. Its run number is the number of lines in the log after it appended its own;
 * the entry of `script` for that run (the last entry once the list is exhausted) is a halt code, or null for a
 * proven session.
 * @param {(string | null)[]} script
 */
const stubSource = (script) => `import { appendFileSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[process.argv.indexOf('--root') + 1];
const log = join(root, 'calls.log');
appendFileSync(log, JSON.stringify(process.argv.slice(2)) + '\\n');
const calls = readFileSync(log, 'utf8').split('\\n').filter(Boolean).length;
const script = ${JSON.stringify(script)};
const entry = script[Math.min(calls, script.length) - 1];
process.stdout.write('${STUB_CANARY} on the standard output\\n');
if (entry !== null) {
  process.stderr.write(entry + ': roles.admin.browserProbe.marker never became stably visible (no element matched it) ${STUB_CANARY}\\n');
  process.exit(1);
}
mkdirSync(join(root, 'PRPs', 'auth', '.sessions'), { recursive: true });
writeFileSync(join(root, 'PRPs', 'auth', '.sessions', 'admin.json'), ${JSON.stringify(JSON.stringify(STATE))});
`;

/**
 * @typedef {{ out: { code: number | null, stdout: string, stderr: string }, results: any, runAbs: string, root: string, runs: string[], argvs: string[][] }} Done
 */

/**
 * One project with a stub login script for role `admin`, one run of the runner over it and the leak scan.
 * @param {{ mechanism?: string, script: (string | null)[], cases?: number, expiresInMs?: number | null }} o
 * @returns {Promise<Done>}
 */
async function scenario(o) {
  const mechanism = o.mechanism ?? 'minted';
  const cases = o.cases ?? 1;
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runAbs = join(root, ...RUN_REL.split('/'));
  mkdirSync(runAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: { mechanism, sessionCookie: 'sid' } } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), stubSource(o.script));
  if (o.expiresInMs !== undefined && o.expiresInMs !== null) {
    mkdirSync(join(root, 'PRPs', 'auth', '.sessions'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'auth', '.sessions', 'admin.mint.json'), JSON.stringify({ minted_at: new Date().toISOString(), expires_at: new Date(Date.now() + o.expiresInMs).toISOString() }));
  }
  const block = (/** @type {number} */ i) =>
    [`### Case ${i}`, `**Title:** Case ${i}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', ''].join('\n');
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  writeFileSync(report, `# QA Report\n\n## Test Cases\n\n${Array.from({ length: cases }, (_, i) => block(i + 1)).join('\n')}\n## Notes\n\nnone\n`);
  const plan = Array.from({ length: cases }, (_, i) => ({
    index: i + 1,
    title: `Case ${i + 1}`,
    driver: 'http',
    role: 'admin',
    state: 'role-only',
    steps: [{ action: 'request', method: 'GET', path: '/echo', expect_status: 200 }],
  }));
  writeFileSync(join(runAbs, 'plan.json'), JSON.stringify({ schema_version: 1, cases: plan }));
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
    const timer = setTimeout(() => child.kill(), 150000);
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
  assert.equal(out.code, 0, `the runner exited ${out.code}: ${out.stderr}`);
  const results = JSON.parse(readFileSync(join(runAbs, 'results.json'), 'utf8'));
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');

  // The streams of a login script are never relayed: no run file and no terminal stream carries them.
  for (const f of walk(runAbs).filter((p) => !p.endsWith('plan.json'))) {
    const text = readFileSync(f).toString('latin1');
    for (const v of [STUB_CANARY, SID]) assert.ok(!text.includes(v), `a login-script value reached ${f}`);
  }
  for (const v of [STUB_CANARY, SID]) assert.ok(!(out.stdout + out.stderr).includes(v), 'a login-script value reached a terminal stream');

  const logFile = join(root, 'calls.log');
  const argvs = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => /** @type {string[]} */ (JSON.parse(l))) : [];
  return { out, results, runAbs, root, runs: argvs.map(label), argvs };
}

/**
 * One `ground` run over a minted role whose stub login script follows `script`, with the QA report asserted
 * byte-identical around it.
 * @param {(string | null)[]} script
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, runs: string[], grounding: string[] }>}
 */
async function groundScenario(script) {
  const root = mkdtempSync(join(SANDBOX, 'ground-'));
  const runAbs = join(root, ...RUN_REL.split('/'));
  mkdirSync(runAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: { mechanism: 'minted', sessionCookie: 'sid' } } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), stubSource(script));
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  writeFileSync(report, '# QA Report\n\n## Test Cases\n\n### Case 1\n**Title:** Case 1\n**Risk level:** low\n**Required state:** None\n**Coverage:** none\n**Automated test path:** n/a\n**Manual status:** pending\n**Manual step-by-step:**\n1. Open the page.\n\n## Notes\n\nnone\n');
  const reportBefore = sha256File(report);
  const out = await new Promise((resolveP, rejectP) => {
    const args = ['ground', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL, '--route', '/page', '--role', 'admin'];
    const child = spawn(NODE, [COPY, ...args], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 150000);
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
  for (const v of [STUB_CANARY, SID]) assert.ok(!(out.stdout + out.stderr).includes(v), 'a login-script value reached a terminal stream');
  const logFile = join(root, 'calls.log');
  const runs = existsSync(logFile) ? readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => label(/** @type {string[]} */ (JSON.parse(l)))) : [];
  const dir = join(runAbs, 'grounding');
  return { ...out, runs, grounding: existsSync(dir) ? readdirSync(dir) : [] };
}

/** @param {string} dir @returns {string[]} every file under dir */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * What a run of the stub got beyond the two flags the runner always passes: `plain`, or the extra flags.
 * @param {string[]} argv
 * @returns {string}
 */
function label(argv) {
  /** @type {string[]} */ const extra = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' || argv[i] === '--plugin-root') {
      i++;
      continue;
    }
    extra.push(argv[i]);
  }
  return extra.length === 0 ? 'plain' : extra.join(' ');
}

/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);

// ---------------------------------------------------------------------------
// 1. One halt, then a proven session
// ---------------------------------------------------------------------------

test('AC-13 end to end: a minted role whose login script halts once is run again with --force, the second attempt yields the session for both cases, and its session value is masked in the evidence', SLOW, async () => {
  const d = await scenario({ script: [HALT, null], cases: 2 });
  assert.deepEqual(d.runs, ['plain', '--force'], 'the script was not run once more with --force, or was run more than once more');
  assert.deepEqual(d.results.cases.map((/** @type {any} */ c) => c.outcome), ['pass', 'pass'], d.results.cases.map(brief).join(' | '));

  // The same arguments as the first run, plus --force and nothing else: no secret on a command line.
  assert.equal(d.argvs.length, 2);
  assert.deepEqual(d.argvs[1], [...d.argvs[0], '--force']);

  // The session of the SECOND attempt was registered: the application echoed its cookie into the evidence and it is masked.
  const rel = d.results.cases[0].evidence[0];
  assert.equal(typeof rel, 'string');
  const file = join(d.root, ...String(rel).split('/'));
  assert.ok(existsSync(file), `no evidence file at ${rel}`);
  const text = readFileSync(file, 'utf8');
  assert.ok(text.includes('[REDACTED]'), 'the echoed session value was not replaced by the redaction marker');
  assert.ok(!text.includes(SID), 'the session value of the second attempt reached the evidence');
});

// ---------------------------------------------------------------------------
// 2. Two halts
// ---------------------------------------------------------------------------

test('AC-13 end to end: a second halt of the same code leaves the role blocked with that code and the fixed sentence of today after exactly two runs, and the cached failure is not retried by the next case', SLOW, async () => {
  const d = await scenario({ script: [HALT], cases: 2 });
  assert.deepEqual(d.runs, ['plain', '--force'], 'a third run, or no second run');
  for (const c of d.results.cases) {
    assert.deepEqual([c.outcome, c.reason_code, c.reason], ['blocked', HALT, PROBE_SENTENCE], brief(c));
  }
});

test('AC-13 end to end: a second halt of another named code leaves the role blocked with the code of the LAST halt, after exactly two runs', SLOW, async () => {
  const d = await scenario({ script: [HALT, 'FAILED_PROBE_WRONG_ACCOUNT'] });
  assert.deepEqual(d.runs, ['plain', '--force']);
  const [c] = d.results.cases;
  assert.deepEqual([c.outcome, c.reason_code, c.reason], ['blocked', 'FAILED_PROBE_WRONG_ACCOUNT', PROBE_SENTENCE], brief(c));
});

// ---------------------------------------------------------------------------
// 3. Never retried
// ---------------------------------------------------------------------------

test('AC-13 end to end: a minted role that halts any other named code is run exactly once and blocked with that code', SLOW, async () => {
  for (const code of ['FAILED_PROBE_NOT_PROTECTED', 'FAILED_PROBE_PAGE_UNLOADABLE', 'FAILED_MINT_COMMAND', 'FAILED_MINT_OUTPUT', 'FAILED_MINT_UNCONFIRMED']) {
    const d = await scenario({ script: [code] });
    assert.deepEqual(d.runs, ['plain'], `${code} was retried`);
    const [c] = d.results.cases;
    assert.deepEqual([c.outcome, c.reason_code], ['blocked', code], `${code}: ${brief(c)}`);
  }
});

test('AC-13 end to end: a role whose mechanism is not minted is run exactly once when its script halts the same code, and keeps the code and the sentence it always had', SLOW, async () => {
  for (const mechanism of ['form', 'api']) {
    const d = await scenario({ mechanism, script: [HALT, null] });
    assert.deepEqual(d.runs, ['plain'], `a ${mechanism} role was retried`);
    const [c] = d.results.cases;
    assert.deepEqual([c.outcome, c.reason_code, c.reason], ['blocked', HALT, PROBE_SENTENCE], `${mechanism}: ${brief(c)}`);
  }
});

// ---------------------------------------------------------------------------
// 4. A run forced before the first case
// ---------------------------------------------------------------------------

test('AC-13 end to end: a session inside the pre-run margin starts forced, a proven forced run is not retried, and a forced run that halts is forced once more and no more', SLOW, async () => {
  const ok = await scenario({ script: [null], expiresInMs: 1000 });
  assert.deepEqual(ok.runs, ['--force'], 'a proven forced run was run again');
  assert.equal(ok.results.cases[0].outcome, 'pass');

  const recovered = await scenario({ script: [HALT, null], expiresInMs: 1000 });
  assert.deepEqual(recovered.runs, ['--force', '--force']);
  assert.equal(recovered.results.cases[0].outcome, 'pass', brief(recovered.results.cases[0]));

  const stuck = await scenario({ script: [HALT], expiresInMs: 1000 });
  assert.deepEqual(stuck.runs, ['--force', '--force'], 'a third forced run, or no retry');
  assert.deepEqual([stuck.results.cases[0].outcome, stuck.results.cases[0].reason_code], ['blocked', HALT]);
});

// ---------------------------------------------------------------------------
// 5. A ground command is a run of its own
// ---------------------------------------------------------------------------

test('AC-13 end to end: a ground command obtains the session the same way: a minted role that halts once is run again with --force and the snapshot is written', SLOW, async () => {
  const g = await groundScenario([HALT, null]);
  assert.equal(g.code, 0, `ground exited ${g.code}: ${g.stderr}`);
  assert.deepEqual(g.runs, ['plain', '--force']);
  assert.match(g.stdout, /^GROUNDED: grounding\/admin--page\.snapshot\.json entries=\d+ withheld=0$/m);
  assert.deepEqual(g.grounding, ['admin--page.snapshot.json']);
});

test('AC-13 end to end: a ground command whose minted role halts twice stops after two runs, exits non-zero and writes no snapshot', SLOW, async () => {
  const g = await groundScenario([HALT]);
  assert.notEqual(g.code, 0, 'ground exited 0 with no session');
  assert.deepEqual(g.runs, ['plain', '--force'], 'a third run, or no second run');
  assert.ok(!/GROUNDED:/.test(g.stdout), g.stdout);
  assert.deepEqual(g.grounding, [], 'a snapshot was written without a session');
});

// ---------------------------------------------------------------------------
// 6. The retry leaves no trace
// ---------------------------------------------------------------------------

test('AC-13 end to end: a run that needed the retry prints, writes and reports exactly what a run that was proven the first time does', SLOW, async () => {
  const first = await scenario({ script: [null] });
  const retried = await scenario({ script: [HALT, null] });
  assert.deepEqual(first.runs, ['plain']);
  assert.deepEqual(retried.runs, ['plain', '--force']);

  assert.equal(retried.out.stdout, first.out.stdout, 'the retry changed what the runner prints');
  assert.equal(retried.out.stderr, first.out.stderr, 'the retry changed what the runner writes to its error stream');

  // The files of the project, the stub's own log aside, are the same set.
  /** @param {Done} d @returns {string[]} */
  const tree = (d) => walk(d.root).map((p) => relative(d.root, p).split('\\').join('/')).filter((p) => p !== 'calls.log').sort();
  assert.deepEqual(tree(retried), tree(first), 'the retry left files the first-try run did not');

  // The results are the same apart from the clock.
  /** @param {Done} d */
  const shape = (d) => ({
    counts: d.results.counts,
    cases: d.results.cases.map((/** @type {any} */ c) => {
      const { started_at, finished_at, duration_ms, ...rest } = c;
      return rest;
    }),
  });
  assert.deepEqual(shape(retried), shape(first), 'the retry is visible in results.json');
});
