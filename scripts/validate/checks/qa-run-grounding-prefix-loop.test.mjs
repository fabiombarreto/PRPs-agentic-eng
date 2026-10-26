// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (the elements that exist only after a click or a fill become groundable and the case runs to a verdict instead of coming back UNGROUNDABLE_AFTER_INTERACTION)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-1 Stable snapshot or a named failure (the snapshot taken after a replayed prefix binds the same two-equal-successive-snapshots wait: a page that never settles after the interaction ends GROUND_UNSTABLE and writes nothing)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-10 Absence and state assertions cannot pass vacuously (carry-over DQ20: an input value is re-read for the settle window before the comparison fails)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 5 (grounding after an interaction), the settle and the whole loop, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md
 *              (AC-A1 the stable snapshot is taken after the replay, AC-A5 the file ground wrote is the file the
 *              plan-time check consumes, AC-A7 the carry-over doc claim about the re-read of an input value)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against a loopback application and a real Chromium; the application shows its page only to a request
 * that carries the role's session cookie.
 *
 *   1. A response that arrives 400 ms AFTER the click is in the snapshot: the stable wait runs after the replay
 *      and certifies a page that stopped changing; the plain snapshot of the same page does not list it.
 *   2. A page that is stable before the click and never settles after it: the plain ground writes its snapshot,
 *      the same ground with the click prefix ends GROUND_UNSTABLE (exit 1, nothing written), and the click was
 *      performed (the server saw it), so the wait really ran after the replay.
 *   3. The whole loop with no hand-written file: ground writes the plain snapshot and two post-interaction
 *      snapshots, and one `run` over four cases consumes them: the rows that exist only after the click are
 *      asserted and pass, the filter case passes with the value the report states, the same case is refused
 *      PLAN_ENTRY_INVALID at the position of the fill when the report never states the value, and an input whose
 *      value arrives 1.2 s after the load passes its comparison because the value is re-read. The control twin
 *      is the same plan against a project that holds only the plain snapshot: every case is refused
 *      PLAN_ENTRY_INVALID before any login.
 *
 * Every run asserts that the QA report is byte-identical before and after. Nothing here calls git.
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
import { pathToFileURL } from 'node:url';

import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const RUNNER_SRC = process.env.QA_V2P5_RUNNER_SRC ? resolve(process.env.QA_V2P5_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p5-loop-'));
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

/** The runner module of the copy, loaded lazily once the sandbox exists (for the exported bound and interval). @type {any} */
let R;
before(async () => {
  R = await import(pathToFileURL(COPY).href);
});

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

const resetObservations = () => {
  for (const k of Object.keys(hits)) delete hits[k];
  typed.length = 0;
};

const PAGE_HEAD = '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body>';
const LOGIN_PAGE = `${PAGE_HEAD}<h1>Entrar</h1></body></html>`;
const TASKS_PAGE = [
  PAGE_HEAD,
  '<h1>Tarefas</h1>',
  `<button id="g" type="button" aria-expanded="false">${GROUP}</button>`,
  '<ul id="rows" hidden><li>Comprar leite</li><li>Pagar conta</li></ul>',
  '<label for="f">Filtro</label><input id="f" type="text">',
  '<button id="a" type="button">Aplicar</button>',
  '<p id="n"></p>',
  // A response that arrives 400 ms after the click.
  '<button id="slow" type="button">Carregar</button>',
  '<ul id="late-rows"></ul>',
  // A value that arrives 1.2 s after the load, so only a re-read can see it.
  '<label for="late">Atrasado</label><input id="late" type="text">',
  '<script>',
  'document.getElementById("g").onclick = function () { var open = this.getAttribute("aria-expanded") === "true"; this.setAttribute("aria-expanded", String(!open)); document.getElementById("rows").hidden = open; };',
  'document.getElementById("a").onclick = function () { var v = document.getElementById("f").value; fetch("/act/apply?v=" + encodeURIComponent(v)); document.getElementById("n").textContent = "Filtro com " + v.length + " caracteres"; };',
  'document.getElementById("slow").onclick = function () { setTimeout(function () { document.getElementById("late-rows").innerHTML = "<li>Linha tardia</li>"; }, 400); };',
  'setTimeout(function () { document.getElementById("late").value = "pronto"; }, 1200);',
  '</script></body></html>',
].join('');
// Stable until its button is clicked; after that a new button with a new name appears every 100 ms, forever.
const LIVE_PAGE = [
  PAGE_HEAD,
  '<h1>Painel</h1>',
  '<button id="go" type="button">Iniciar</button>',
  '<script>',
  'document.getElementById("go").onclick = function () { fetch("/act/start"); setInterval(function () { var b = document.createElement("button"); b.textContent = "T" + Math.random(); document.body.appendChild(b); }, 100); };',
  '</script></body></html>',
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
    if (u.pathname === '/live') res.end(LIVE_PAGE);
    else res.end(authed ? TASKS_PAGE : LOGIN_PAGE);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
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

/**
 * A project that is not a git work tree, with its report and, when cases are given, its plan.
 * @param {{ title: string, manual: string[], steps: any[] }[]} [cases]
 */
function fixture(cases = []) {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  const defs = cases.length > 0 ? cases : [{ title: 'Group rows', manual: ['Open the tasks.', 'See the rows.'], steps: [] }];
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [
      `### Case ${n}`,
      `**Title:** ${d.title}`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      ...d.manual.map((/** @type {string} */ m, /** @type {number} */ i) => `${i + 1}. ${m}`),
      '',
    ].join('\n');
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  writeFileSync(report, `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  if (cases.length > 0) {
    writeFileSync(
      join(runDir, 'plan.json'),
      JSON.stringify({
        schema_version: 1,
        cases: cases.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: 'admin', state: 'none', steps: d.steps })),
      }),
    );
  }
  return { root, runDir, grounding: join(runDir, 'grounding'), report, sessions: join(root, 'PRPs', 'auth', '.sessions') };
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
    const timer = setTimeout(() => child.kill(), 200000);
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
 * One runner invocation, with the QA report asserted byte-identical around it.
 * @param {{ root: string, report: string }} fx
 * @param {string[]} args
 */
async function runner(fx, args) {
  const before = sha256File(fx.report);
  const r = await spawnRunner([...args], fx.root);
  assert.equal(sha256File(fx.report), before, 'the QA report changed during the run');
  return r;
}
/** @param {{ root: string, report: string }} fx @param {string[]} extra */
const ground = (fx, extra) => runner(fx, ['ground', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_REL, ...extra]);
/** @param {{ root: string, report: string }} fx */
const runCases = (fx) => runner(fx, ['run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_REL]);
/** @param {string} route @param {any[]} steps @param {string | null} [who] */
const withPrefix = (route, steps, who = 'admin') => ['--route', route, ...(who === null ? [] : ['--role', who]), '--prefix', JSON.stringify(steps)];
/** @param {{ grounding: string }} fx @returns {string[]} */
const snapshotFiles = (fx) => (existsSync(fx.grounding) ? readdirSync(fx.grounding).sort() : []);
/** @param {string} stdout @returns {string} the snapshot file name a GROUNDED line reports */
function groundedName(stdout) {
  const m = /^GROUNDED: grounding\/(\S+\.snapshot\.json) entries=\d+ withheld=\d+$/m.exec(stdout);
  assert.ok(m !== null, `no GROUNDED line: ${stdout}`);
  return /** @type {RegExpExecArray} */ (m)[1];
}
/** @param {any} doc @param {string} name */
const entryOf = (doc, name) => doc.entries.find((/** @type {any} */ e) => e.name === name || e.text === name);
/** @param {{ grounding: string }} fx @param {string} name */
const readSnapshot = (fx, name) => JSON.parse(readFileSync(join(fx.grounding, name), 'utf8'));

// ---------------------------------------------------------------------------
// 1. A response that arrives after the click
// ---------------------------------------------------------------------------

test('AC-1 AC-11 end to end: the stable snapshot is taken after the replay, so a response that arrives 400 ms after the click is in it, and the plain snapshot of the same page does not list it', SLOW, async () => {
  resetObservations();
  const fx = fixture();

  const plain = await ground(fx, ['--route', '/tasks', '--role', 'admin']);
  assert.equal(plain.code, 0, plain.stderr);
  const plainDoc = readSnapshot(fx, groundedName(plain.stdout));
  assert.equal(entryOf(plainDoc, 'Carregar')?.matches, 1);
  assert.equal(entryOf(plainDoc, 'Linha tardia'), undefined, 'the late row is in the plain snapshot: the control proves nothing');

  const clicked = await ground(fx, withPrefix('/tasks', [{ action: 'click', role: 'button', name: 'Carregar' }]));
  assert.equal(clicked.code, 0, clicked.stderr);
  const doc = readSnapshot(fx, groundedName(clicked.stdout));
  assert.equal(doc.schema_version, 2);
  assert.equal(entryOf(doc, 'Linha tardia')?.matches, 1, 'the snapshot was taken before the page settled after the click');
});

// ---------------------------------------------------------------------------
// 2. A page that never settles after the interaction
// ---------------------------------------------------------------------------

test('AC-1 end to end: a page that is stable before the click and never settles after it ends GROUND_UNSTABLE with nothing written, although the click was performed; the plain ground of the same page settles', SLOW, async () => {
  resetObservations();
  const fx = fixture();

  // Control: before the interaction the page is stable, so the plain snapshot is written.
  const plain = await ground(fx, ['--route', '/live']);
  assert.equal(plain.code, 0, plain.stderr);
  assert.match(plain.stdout, /^GROUNDED: grounding\/anonymous--live\.snapshot\.json entries=\d+ withheld=\d+$/m);
  assert.equal(hits['/act/start'], undefined, 'the plain ground clicked');
  const before = snapshotFiles(fx);
  assert.deepEqual(before, ['anonymous--live.snapshot.json']);

  const started = Date.now();
  const unstable = await ground(fx, withPrefix('/live', [{ action: 'click', role: 'button', name: 'Iniciar' }], null));
  const elapsed = Date.now() - started;
  assert.equal(unstable.code, 1, `${unstable.stdout}${unstable.stderr}`);
  assert.match(unstable.stderr, /^GROUND_UNSTABLE: /);
  assert.equal(unstable.stdout.includes('GROUNDED:'), false, 'an unstable page printed a GROUNDED line');
  assert.deepEqual(snapshotFiles(fx), before, 'an unstable page left a snapshot behind');
  assert.equal(/Painel|Iniciar|T0\./.test(unstable.stderr), false, `the halt carries page text: ${unstable.stderr}`);
  // The click was performed, so the wait that gave up ran after it: waiting before the replay would have settled.
  assert.equal(hits['/act/start'], 1, 'the click was not performed');
  assert.ok(elapsed >= R.GROUND_STABLE_BOUND_MS - 2 * R.GROUND_POLL_INTERVAL_MS, `gave up after ${elapsed} ms, before the bound of ${R.GROUND_STABLE_BOUND_MS} ms`);
});

// ---------------------------------------------------------------------------
// 3. The whole loop
// ---------------------------------------------------------------------------

test('AC-11 AC-1 end to end: ground writes the files and one run consumes them: the rows after the click and the filter result pass, a fill value the report never states makes the step that depends on it a step gap, and a value that arrives late is re-read; with only the plain snapshot every case runs its valid part and records the unlisted step as a gap', SLOW, async () => {
  resetObservations();
  const resultText = `Filtro com ${TYPED.length} caracteres`;
  const heading = { action: 'expect_visible', role: 'heading', name: 'Tarefas' };
  const goto = { action: 'goto', path: '/tasks' };
  const fill = { action: 'fill', role: 'textbox', name: 'Filtro', value: TYPED };
  const apply = { action: 'click', role: 'button', name: 'Aplicar' };
  const filterSteps = [goto, heading, fill, apply, { action: 'expect_visible', text: resultText }];
  const cases = [
    {
      title: 'Group rows',
      manual: ['Open the tasks.', 'Expand the group and see the rows.'],
      steps: [goto, heading, { action: 'click', role: 'button', name: GROUP }, { action: 'expect_visible', text: 'Comprar leite' }],
    },
    { title: 'Filter results', manual: ['Open the tasks.', `Type ${TYPED} in the filter and apply it.`], steps: filterSteps },
    { title: 'Invented filter value', manual: ['Open the tasks.', 'Fill the filter and apply it.'], steps: filterSteps },
    {
      title: 'Late value',
      manual: ['Open the tasks.', 'The late field shows pronto.'],
      steps: [goto, heading, { action: 'expect_value', role: 'textbox', name: 'Atrasado', equals: 'pronto' }],
    },
  ];
  const fx = fixture(cases);

  // Plan time: the plain snapshot and the two post-interaction snapshots, written by the ground mode itself.
  const plain = await ground(fx, ['--route', '/tasks', '--role', 'admin']);
  assert.equal(plain.code, 0, plain.stderr);
  const plainName = groundedName(plain.stdout);
  assert.equal(plainName, 'admin--tasks.snapshot.json');
  const group = await ground(fx, withPrefix('/tasks', [{ action: 'click', role: 'button', name: GROUP }]));
  assert.equal(group.code, 0, group.stderr);
  const filter = await ground(fx, withPrefix('/tasks', [fill, apply]));
  assert.equal(filter.code, 0, filter.stderr);
  const groupName = groundedName(group.stdout);
  const filterName = groundedName(filter.stdout);
  assert.notEqual(groupName, filterName, 'two histories shared a file');
  assert.deepEqual(snapshotFiles(fx), [plainName, groupName, filterName].sort());
  // Grounding wrote the typed value nowhere; the case plan carries it, as the report does.
  assert.equal(readFileSync(join(fx.grounding, filterName), 'utf8').includes(TYPED), false, 'the typed value is in the snapshot file');

  // Run time: one run over the four cases, consuming exactly those files.
  resetObservations();
  const run = await runCases(fx);
  assert.equal(run.code, 0, `the runner exited ${run.code}: ${run.stderr}`);
  const results = JSON.parse(readFileSync(join(fx.runDir, 'results.json'), 'utf8'));
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');
  assert.deepEqual(validateResults(results), []);
  const brief = (/** @type {any} */ c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
  const [rows, filtered, invented, late] = results.cases;
  assert.equal(rows.outcome, 'pass', `the rows that exist only after the click were not asserted: ${brief(rows)}`);
  assert.equal(filtered.outcome, 'pass', `the filter result was not asserted: ${brief(filtered)}`);
  // The value the report never states: the step that depends on the replayed fill (the result expectation) is the gap,
  // the steps before it ran, and the case needs a person only for that step.
  assert.deepEqual([invented.outcome, invented.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(invented));
  assert.deepEqual(invented.steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'passed', 'passed', 'human']);
  assert.equal(invented.steps[4].reason_code, 'STEP_UNGROUNDED');
  assert.equal(JSON.stringify(invented).includes(TYPED), false, `the case record echoes the value: ${brief(invented)}`);
  assert.equal(late.outcome, 'pass', `the value that arrived after the load was not re-read: ${brief(late)}`);
  // Both filter cases ran their fill and apply (the second one's only gap is its expectation), with exactly the typed value.
  assert.deepEqual(typed, [TYPED, TYPED], 'the filter was applied other than once per case, or with another value');

  // Control twin: the same plan against a project that holds the plain snapshot only: the element that exists only
  // after the interaction is not listed, so that one step is a gap; everything before it runs.
  const controlCases = cases.slice(0, 3);
  const control = fixture(controlCases);
  mkdirSync(control.grounding, { recursive: true });
  copyFileSync(join(fx.grounding, plainName), join(control.grounding, plainName));
  const refused = await runCases(control);
  assert.equal(refused.code, 0, `the control run exited ${refused.code}: ${refused.stderr}`);
  const controlResults = JSON.parse(readFileSync(join(control.runDir, 'results.json'), 'utf8'));
  assert.deepEqual(validateResults(controlResults), []);
  const [c1, c2, c3] = controlResults.cases;
  for (const [label, c, step] of /** @type {[string, any, number][]} */ ([['the rows', c1, 4], ['the filter result', c2, 5], ['the invented value', c3, 5]])) {
    assert.deepEqual([c.outcome, c.reason_code], ['needs-human', 'STEP_UNGROUNDED'], `${label}: ${brief(c)}`);
    // Only the unlisted step is human; every step before it ran.
    assert.deepEqual(c.steps.map((/** @type {any} */ s) => s.result), [...Array(step - 1).fill('passed'), 'human'], label);
    assert.equal(c.steps[step - 1].reason_code, 'STEP_UNGROUNDED', label);
  }
  assert.equal(existsSync(control.sessions), true, 'the valid part of each case needs its session, so the login ran');
});
