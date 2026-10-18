// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (ground replays the prefix with the role's session through the local-only guard, takes the stable snapshot afterwards and the expanded rows appear among its entries; a prefix step that does not match exactly one element or fails exits non-zero and writes no snapshot)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (a prefix goto or a click that leaves the guard-approved origin never reaches a request)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 5 (grounding after an interaction), the replay, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md
 *              (AC-A1 the replay with the role's session, AC-A2 a failing step halts and writes nothing, AC-A4 a
 *              step that leaves the origin never reaches a request, AC-A5 the file and its schema)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against a loopback application and a real Chromium. The application shows its page only to a request
 * that carries the role's session cookie, and every click and fill reports itself to the server, so what the
 * replay did is read from the server, not from the runner's own words.
 *
 *   1. One replayed click opens a collapsed group: the rows that exist only after it are among the entries of
 *      the snapshot, it is a different file with schema 2 and the recorded prefix, the plain snapshot is not
 *      touched; the same click with no session finds nothing (the control that proves the role's session was used).
 *   2. A fill then a click: both reach the page in order and exactly once with exactly the typed value; the same
 *      prefix re-grounds into the same file, and the replay starts from a fresh page load each time.
 *   3. A click that navigates, and a goto of the prefix: the snapshot is keyed to the route the page ends on, the
 *      recorded prefix starts with the raw --route.
 *   4. A step that matches zero elements, several elements or cannot be performed halts GROUND_PREFIX_FAILED
 *      (exit 1, no GROUNDED line, nothing written) naming a position and a count, never a locator; the steps
 *      before it were performed and the steps after it never are.
 *   5. A prefix goto that leaves the guard-approved origin halts FAILED_NON_LOCAL_TARGET before any request, and
 *      a click that navigates off the origin writes nothing; a second recording server on 127.0.0.2 (loopback,
 *      but not a host the guard accepts) sees no request at all. Where the platform cannot bind that address the
 *      refusal is still asserted by code and sentence.
 *
 * Every run asserts that the QA report is byte-identical before and after. Nothing here calls git: the
 * fixtures are not work trees (the ignore proof in a work tree is driven in qa-run-grounding-prefix-privacy.test.mjs).
 *
 * QA_V2P5_RUNNER_SRC points the runner copy at another file (a mutation control); unset, the real runner is used.
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

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const RUNNER_SRC = process.env.QA_V2P5_RUNNER_SRC ? resolve(process.env.QA_V2P5_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p5-replay-'));
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

/** @param {string} s */
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
/** @param {string} path */
const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

const SID = 'sidvalue-Zq83kd01-Hh2k9X7';
const TYPED = 'abc-typed-4417';
const GROUP = 'Nao concluidas';

/** Requests by pathname, and the values the filter reported. @type {Record<string, number>} */
const hits = {};
/** @type {string[]} */
const typed = [];
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
/** @type {import('node:http').Server | null} */
let farServer = null;
let farBase = 'http://example.com';
/** @type {string[]} */
let farSeen = [];

const resetObservations = () => {
  for (const k of Object.keys(hits)) delete hits[k];
  typed.length = 0;
  farSeen = [];
};

const PAGE_HEAD = '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body>';
const LOGIN_PAGE = `${PAGE_HEAD}<h1>Entrar</h1></body></html>`;
const tasksPage = () =>
  [
    PAGE_HEAD,
    '<h1>Tarefas</h1>',
    `<button id="g" type="button" aria-expanded="false">${GROUP}</button>`,
    '<ul id="rows" hidden><li>Comprar leite</li><li>Pagar conta</li></ul>',
    '<label for="f">Filtro</label><input id="f" type="text">',
    '<button id="a" type="button">Aplicar</button>',
    '<p id="n"></p>',
    '<a href="/tasks/5">Detalhes</a>',
    `<a href="${farBase}/landed">Fora</a>`,
    '<button type="button" onclick="fetch(\'/act/twin\')">Gemeo</button>',
    '<button type="button" onclick="fetch(\'/act/twin\')">Gemeo</button>',
    '<button id="p" type="button">Registrar</button>',
    '<script>',
    'document.getElementById("g").onclick = function () { var open = this.getAttribute("aria-expanded") === "true"; this.setAttribute("aria-expanded", String(!open)); document.getElementById("rows").hidden = open; };',
    'document.getElementById("a").onclick = function () { var v = document.getElementById("f").value; fetch("/act/apply?v=" + encodeURIComponent(v)); document.getElementById("n").textContent = "Filtro com " + v.length + " caracteres"; };',
    'document.getElementById("p").onclick = function () { fetch("/act/ping"); };',
    '</script></body></html>',
  ].join('');
const detailPage = () =>
  [
    PAGE_HEAD,
    '<h1>Detalhe</h1>',
    '<button id="m" type="button">Marcar</button>',
    '<p id="r" hidden>Marcado</p>',
    '<a href="/tasks">Voltar</a>',
    '<script>document.getElementById("m").onclick = function () { document.getElementById("r").hidden = false; };</script>',
    '</body></html>',
  ].join('');

before(async () => {
  server = createServer((req, res) => {
    const u = new URL(String(req.url), 'http://x');
    hits[u.pathname] = (hits[u.pathname] ?? 0) + 1;
    if (u.pathname === '/act/apply') typed.push(u.searchParams.get('v') ?? '');
    if (u.pathname.startsWith('/act/')) {
      res.writeHead(204);
      res.end();
      return;
    }
    const authed = String(req.headers.cookie ?? '').includes(`sid=${SID}`);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(!authed ? LOGIN_PAGE : u.pathname === '/tasks/5' ? detailPage() : tasksPage());
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;

  // A second recording server on 127.0.0.2: loopback, but not one of the guard's built-in local hosts. Where the
  // platform does not bind that address the refusals are still asserted by code and sentence.
  const far = createServer((req, res) => {
    farSeen.push(String(req.url).split('?')[0]);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`${PAGE_HEAD}<h1>Longe</h1></body></html>`);
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
    if (probe.status !== 200) throw new Error('the far recording server does not answer');
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
// The fixture and the runner
// ---------------------------------------------------------------------------

/** A login stub that writes a storage state carrying the session cookie the application asks for. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "sid", value: "${SID}", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] }));`,
].join('\n');

/** @returns {{ root: string, runDir: string, grounding: string, report: string }} a project that is not a git work tree */
function fixture() {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  const block = [
    '### Case 1',
    '**Title:** Group rows',
    '**Risk level:** low',
    '**Required state:** None',
    '**Coverage:** none',
    '**Automated test path:** n/a',
    '**Manual status:** pending',
    '**Manual step-by-step:**',
    '1. Open the tasks.',
    '2. Expand the group and see the rows.',
    '',
  ].join('\n');
  writeFileSync(report, `# QA Report\n\n## Test Cases\n\n${block}\n## Notes\n\nnone\n`);
  return { root, runDir, grounding: join(runDir, 'grounding'), report };
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function spawnRunner(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    // NODE_PATH lets the copied runner resolve Playwright from the repository node_modules, with no junction to clean up.
    const env = { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES };
    const child = spawn(NODE, [COPY, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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
}

/**
 * One ground run, with the QA report asserted byte-identical around it.
 * @param {{ root: string, report: string }} fx
 * @param {string[]} extra
 */
async function ground(fx, extra) {
  const before = sha256File(fx.report);
  const r = await spawnRunner(['ground', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_REL, ...extra], fx.root);
  assert.equal(sha256File(fx.report), before, 'the QA report changed during the run');
  return r;
}
/** @param {any[]} steps @param {string | null} [who] */
const withPrefix = (steps, who = 'admin') => ['--route', '/tasks', ...(who === null ? [] : ['--role', who]), '--prefix', JSON.stringify(steps)];
/** @param {{ grounding: string }} fx @returns {string[]} */
const snapshotFiles = (fx) => (existsSync(fx.grounding) ? readdirSync(fx.grounding).sort() : []);
/** @param {{ grounding: string }} fx @param {string} name */
const readSnapshot = (fx, name) => JSON.parse(readFileSync(join(fx.grounding, name), 'utf8'));
/** @param {any} doc @param {string} name */
const entryOf = (doc, name) => doc.entries.find((/** @type {any} */ e) => e.name === name || e.text === name);
const AFTER_NAME = /^GROUNDED: grounding\/([A-Za-z0-9-]+--after-[0-9a-f]{8}\.snapshot\.json) entries=(\d+) withheld=(\d+)$/m;

const CLICK_GROUP = { action: 'click', role: 'button', name: GROUP };
const FILL_FILTER = { action: 'fill', role: 'textbox', name: 'Filtro', value: TYPED };
const CLICK_APPLY = { action: 'click', role: 'button', name: 'Aplicar' };

// ---------------------------------------------------------------------------
// 1. One replayed click
// ---------------------------------------------------------------------------

test('AC-11 end to end: one replayed click opens the group with the role session, the settled snapshot lists the rows that exist only after it in a file of its own, and the plain snapshot is untouched', SLOW, async () => {
  resetObservations();
  const fx = fixture();

  // The plain snapshot first: the rows are not there, and that is what the prefix is for.
  const plain = await ground(fx, ['--route', '/tasks', '--role', 'admin']);
  assert.equal(plain.code, 0, plain.stderr);
  assert.match(plain.stdout, /^GROUNDED: grounding\/admin--tasks\.snapshot\.json entries=\d+ withheld=\d+$/m);
  const plainPath = join(fx.grounding, 'admin--tasks.snapshot.json');
  const plainBytes = readFileSync(plainPath);
  const plainDoc = JSON.parse(plainBytes.toString('utf8'));
  assert.equal(plainDoc.schema_version, 1);
  assert.equal(entryOf(plainDoc, GROUP)?.matches, 1, 'the group is not in the plain snapshot');
  assert.equal(entryOf(plainDoc, 'Comprar leite'), undefined, 'the rows are in the plain snapshot: the group was not collapsed');

  // One replayed click.
  const one = await ground(fx, withPrefix([CLICK_GROUP]));
  assert.equal(one.code, 0, one.stderr);
  const m = AFTER_NAME.exec(one.stdout);
  assert.ok(m !== null, `the GROUNDED line of a prefix run: ${one.stdout}`);
  const name = /** @type {RegExpExecArray} */ (m)[1];
  assert.match(name, /^admin--tasks--after-/);
  const doc = readSnapshot(fx, name);
  assert.deepEqual(Object.keys(doc).sort(), ['entries', 'prefix', 'role', 'route', 'schema_version', 'withheld']);
  assert.equal(doc.schema_version, 2);
  assert.equal(doc.role, 'admin');
  assert.equal(doc.route, '/tasks');
  assert.deepEqual(doc.prefix, [
    { action: 'goto', path: '/tasks' },
    { action: 'click', role: 'button', name: GROUP },
  ]);
  assert.equal(entryOf(doc, 'Comprar leite')?.matches, 1, 'the expanded rows are missing from the snapshot taken after the click');
  assert.equal(entryOf(doc, 'Pagar conta')?.matches, 1);
  assert.equal(entryOf(doc, GROUP)?.matches, 1, 'the snapshot lists the whole page, not only what is new');
  assert.equal(Number(/** @type {RegExpExecArray} */ (m)[2]), doc.entries.length, 'the GROUNDED line does not report the entries written');
  assert.equal(Number(/** @type {RegExpExecArray} */ (m)[3]), doc.withheld);
  assert.ok(doc.entries.every((/** @type {any} */ e) => Number.isInteger(e.matches) && e.matches >= 1), 'every kept entry carries a real count');

  // Beside, never over: the plain file has the same bytes and the directory holds exactly the two kinds.
  assert.equal(readFileSync(plainPath).equals(plainBytes), true, 'the plain snapshot was overwritten');
  assert.deepEqual(snapshotFiles(fx), ['admin--tasks.snapshot.json', name].sort());

  // Control twin: the same click with no role finds the login page, so the group matches nothing and nothing is written.
  const anonymous = await ground(fx, withPrefix([CLICK_GROUP], null));
  assert.equal(anonymous.code, 1, `${anonymous.stdout}${anonymous.stderr}`);
  assert.match(anonymous.stderr, /^GROUND_PREFIX_FAILED: prefix step 1: the locator matched 0 elements/);
  assert.equal(anonymous.stdout, '');
  assert.deepEqual(snapshotFiles(fx), ['admin--tasks.snapshot.json', name].sort(), 'a failed prefix wrote a snapshot');
});

// ---------------------------------------------------------------------------
// 2. A fill then a click
// ---------------------------------------------------------------------------

test('AC-11 end to end: a fill then a click reach the page in order, once, with the typed value, and re-grounding the same prefix replays from a fresh load into the same file', SLOW, async () => {
  resetObservations();
  const fx = fixture();
  const args = withPrefix([FILL_FILTER, CLICK_APPLY]);

  const first = await ground(fx, args);
  assert.equal(first.code, 0, first.stderr);
  const m = AFTER_NAME.exec(first.stdout);
  assert.ok(m !== null, first.stdout);
  const name = /** @type {RegExpExecArray} */ (m)[1];
  // The server saw exactly one apply, carrying exactly the typed value: the fill came first, and the click once.
  assert.deepEqual(typed, [TYPED]);
  assert.equal(hits['/act/ping'], undefined, 'a step that is not in the prefix was performed');
  const doc = readSnapshot(fx, name);
  assert.equal(entryOf(doc, `Filtro com ${TYPED.length} caracteres`)?.matches, 1, 'the page did not react to the typed value before the snapshot');
  assert.deepEqual(doc.prefix, [
    { action: 'goto', path: '/tasks' },
    { action: 'fill', role: 'textbox', name: 'Filtro', value_sha256: sha(TYPED) },
    { action: 'click', role: 'button', name: 'Aplicar' },
  ]);
  assert.deepEqual(snapshotFiles(fx), [name]);

  // The same prefix again: the same file, and the replay ran again from a fresh page load.
  const second = await ground(fx, args);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(/** @type {RegExpExecArray} */ (AFTER_NAME.exec(second.stdout))[1], name, 're-grounding the same prefix gave another file');
  assert.deepEqual(snapshotFiles(fx), [name]);
  assert.deepEqual(typed, [TYPED, TYPED]);

  // A different typed value is another history: another file, beside the first.
  const third = await ground(fx, withPrefix([{ ...FILL_FILTER, value: `${TYPED}-b` }, CLICK_APPLY]));
  assert.equal(third.code, 0, third.stderr);
  const other = /** @type {RegExpExecArray} */ (AFTER_NAME.exec(third.stdout))[1];
  assert.notEqual(other, name, 'a different typed value gave the same file');
  assert.deepEqual(snapshotFiles(fx), [name, other].sort());
});

// ---------------------------------------------------------------------------
// 3. A click that navigates, and a goto of the prefix
// ---------------------------------------------------------------------------

test('AC-11 end to end: a click that navigates and a goto of the prefix are keyed to the route the page ends on, and the recorded prefix starts with the raw --route', SLOW, async () => {
  resetObservations();
  const fx = fixture();

  const nav = await ground(fx, withPrefix([{ action: 'click', role: 'link', name: 'Detalhes' }]));
  assert.equal(nav.code, 0, nav.stderr);
  const navName = /** @type {RegExpExecArray} */ (AFTER_NAME.exec(nav.stdout))[1];
  assert.match(navName, /^admin--tasks-5--after-[0-9a-f]{8}\.snapshot\.json$/);
  const navDoc = readSnapshot(fx, navName);
  assert.equal(navDoc.route, '/tasks/5', 'the snapshot is not keyed to the route the click led to');
  assert.deepEqual(navDoc.prefix, [
    { action: 'goto', path: '/tasks' },
    { action: 'click', role: 'link', name: 'Detalhes' },
  ]);
  assert.equal(entryOf(navDoc, 'Detalhe')?.matches, 1, 'the snapshot is not the one of the page the click led to');
  assert.equal(entryOf(navDoc, 'Marcar')?.matches, 1);
  assert.equal(entryOf(navDoc, 'Comprar leite'), undefined, 'the snapshot lists the page the click started from');

  const jump = await ground(fx, withPrefix([{ action: 'goto', path: '/tasks/5' }, { action: 'click', role: 'button', name: 'Marcar' }]));
  assert.equal(jump.code, 0, jump.stderr);
  const jumpName = /** @type {RegExpExecArray} */ (AFTER_NAME.exec(jump.stdout))[1];
  const jumpDoc = readSnapshot(fx, jumpName);
  assert.equal(jumpDoc.route, '/tasks/5');
  assert.deepEqual(jumpDoc.prefix, [
    { action: 'goto', path: '/tasks' },
    { action: 'goto', path: '/tasks/5' },
    { action: 'click', role: 'button', name: 'Marcar' },
  ]);
  assert.equal(entryOf(jumpDoc, 'Marcado')?.matches, 1, 'the click after the goto did not reach the page it loaded');
  assert.notEqual(jumpName, navName, 'two histories on one route and role shared a file');
  assert.deepEqual(snapshotFiles(fx), [navName, jumpName].sort());
});

// ---------------------------------------------------------------------------
// 4. A step that fails
// ---------------------------------------------------------------------------

test('AC-11 end to end: a prefix step that matches nothing, matches several elements or cannot be performed halts GROUND_PREFIX_FAILED with exit 1, writes nothing, names a position and a count and never a locator; steps before it were performed and steps after it never are', SLOW, async () => {
  resetObservations();
  const fx = fixture();
  const NEVER_ECHOED = /Inexistente|Gemeo|Registrar|valor-digitado-77/;

  // Position 2 matches nothing; position 1 was performed before it (a replay has real effects).
  const missing = await ground(fx, withPrefix([{ action: 'click', role: 'button', name: 'Registrar' }, { action: 'click', role: 'button', name: 'Inexistente' }]));
  assert.equal(missing.code, 1, `${missing.stdout}${missing.stderr}`);
  assert.match(missing.stderr, /^GROUND_PREFIX_FAILED: prefix step 2: the locator matched 0 elements; a prefix step must match exactly one, so nothing was acted on\n$/);
  assert.equal(hits['/act/ping'], 1, 'the step before the failing one was not performed');
  assert.deepEqual(readdirSync(fx.runDir), [], 'a failed prefix wrote something');

  // Position 1 matches two elements: nothing is acted on, and the step after it never runs.
  const several = await ground(fx, withPrefix([{ action: 'click', role: 'button', name: 'Gemeo' }, { action: 'click', role: 'button', name: 'Registrar' }]));
  assert.equal(several.code, 1, `${several.stdout}${several.stderr}`);
  assert.match(several.stderr, /^GROUND_PREFIX_FAILED: prefix step 1: the locator matched 2 elements; a prefix step must match exactly one, so nothing was acted on\n$/);
  assert.equal(hits['/act/twin'], undefined, 'a locator that matched two elements was acted on');
  assert.equal(hits['/act/ping'], 1, 'a step after the failing one was performed');
  assert.deepEqual(readdirSync(fx.runDir), []);

  // One element, but not a field: the fill cannot be performed.
  const unperformable = await ground(fx, withPrefix([{ action: 'fill', role: 'button', name: 'Registrar', value: 'valor-digitado-77' }]));
  assert.equal(unperformable.code, 1, `${unperformable.stdout}${unperformable.stderr}`);
  assert.match(unperformable.stderr, /^GROUND_PREFIX_FAILED: prefix step 1: the fill target could not be found or acted on\n$/);
  assert.deepEqual(readdirSync(fx.runDir), []);

  for (const [label, r] of /** @type {[string, { stdout: string, stderr: string }][]} */ ([['missing', missing], ['several', several], ['unperformable', unperformable]])) {
    assert.equal(r.stdout, '', `${label}: a failed prefix printed a GROUNDED line or anything else`);
    assert.equal(NEVER_ECHOED.test(r.stderr), false, `${label}: the halt names a locator or a typed value: ${r.stderr}`);
  }
});

// ---------------------------------------------------------------------------
// 5. A step that leaves the approved origin
// ---------------------------------------------------------------------------

test('AC-15 end to end: a prefix goto that leaves the guard-approved origin halts FAILED_NON_LOCAL_TARGET before any request, and a click that navigates off the origin halts GROUND_PREFIX_FAILED and writes nothing', SLOW, async () => {
  resetObservations();
  const fx = fixture();

  // A path with one leading slash and then a backslash: the parser accepts its shape, and the URL parser reads the backslash as a
  // slash, so it names another host. The precondition is asserted, so the refusal below is not a refusal of something local.
  const farHost = new URL(farBase).host;
  const farPath = `/\\${farHost}/landed`;
  assert.notEqual(new URL(farPath, baseUrl).origin, new URL(baseUrl).origin, 'the path does not leave the origin');

  const goto = await ground(fx, withPrefix([CLICK_GROUP, { action: 'goto', path: farPath }]));
  assert.equal(goto.code, 1, `${goto.stdout}${goto.stderr}`);
  assert.match(goto.stderr, /^FAILED_NON_LOCAL_TARGET: a prefix path leaves the guard-approved origin; nothing was requested\n$/);
  assert.equal(goto.stdout, '');
  // The click before it was never performed and the route was never loaded: no request of any kind reached the application.
  assert.deepEqual(hits, {}, 'a request reached the application before the prefix was refused');
  if (farServer !== null) assert.deepEqual(farSeen, [], 'a request reached the far host');
  assert.deepEqual(readdirSync(fx.runDir), []);

  // A click that starts a navigation toward a host the guard does not approve: the context route aborts it.
  const click = await ground(fx, withPrefix([{ action: 'click', role: 'link', name: 'Fora' }]));
  assert.equal(click.code, 1, `${click.stdout}${click.stderr}`);
  assert.match(click.stderr, /^GROUND_PREFIX_FAILED: /);
  assert.equal(click.stdout, '', 'a snapshot of a page outside the approved origin was reported');
  assert.deepEqual(readdirSync(fx.runDir), [], 'a snapshot of a page outside the approved origin was written');
  if (farServer !== null) assert.deepEqual(farSeen, [], 'the navigation reached the far host');
  // The control twin of this click is the same-origin navigation of the test above, which writes its snapshot.
});
