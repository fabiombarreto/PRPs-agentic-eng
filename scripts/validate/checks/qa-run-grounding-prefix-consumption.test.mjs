// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (the elements that exist only after a click or a fill become groundable: a locator step after the case's own interactions is grounded against the snapshot taken after exactly those interactions)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-6 A locator is grounded by a snapshot entry or by the report words (a locator that is neither is PLAN_ENTRY_INVALID)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 5 (grounding after an interaction), the consumption of a post-interaction snapshot, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md
 *              (AC-A5 the lookup keyed by the case's own history, AC-A9 a replayed fill value comes from the report)
 *
 * Layers, all against the REAL runner (a copy of it, with the real guard, in a temp plugin tree; never edited):
 *   1. The plan-time check over hand-written snapshots: a post-interaction snapshot is consumed only when role,
 *      route and the goto, click and fill history are all equal (assertions between steps ignored, the route after
 *      an expect_url honoured); an extra step, a missing step, a different value, a reload, a selector click, another
 *      role or another route is not consumed; a plain lookup never returns a post-interaction file whatever the file
 *      order; a plan with plain snapshots only refuses with the sentences it always had.
 *   2. A fill value a consumed prefix typed must come from the report's own steps: the step that depends on the
 *      consumed snapshot is a STEP_UNGROUNDED gap, raised at consumption, never naming the value.
 *   3. The real `run` mode over snapshot FILES and a loopback page (vocabulary v4: an ungrounded step is a step gap,
 *      so the valid part of a case runs): a post-interaction document is loaded and consumed at plan time (the
 *      step it lists runs and passes), and a document that is not one (schema 2 with no prefix array, schema 3)
 *      is ignored exactly as an unknown schema always was (that step is a gap).
 *
 * The whole loop with a real Chromium (ground writes the file, run consumes it and passes) is driven in
 * qa-run-grounding-prefix-loop.test.mjs.
 *
 * QA_V2P5_RUNNER_SRC points the runner copy at another file (a mutation control); unset, the real runner is used.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const RUNNER_SRC = process.env.QA_V2P5_RUNNER_SRC ? resolve(process.env.QA_V2P5_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p5-consume-'));
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

/** The runner module of the copy, loaded lazily once the sandbox exists. @type {any} */
let R;
before(async () => {
  R = await import(pathToFileURL(COPY).href);
});

/**
 * A loopback page that every path serves: the heading, the group button, the filter and the apply button of the
 * hand-written snapshots, and a result line that the apply button writes. Since a step that cannot be grounded is a
 * step gap (the valid part of a case runs), the real runner needs a page to run it against.
 */
const PAGE = [
  '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body>',
  '<h1>Tarefas</h1>',
  '<button type="button">Nao concluidas</button>',
  '<label for="f">Filtro</label><input id="f" type="text">',
  '<button id="a" type="button">Aplicar</button>',
  '<p id="n"></p>',
  '<script>document.getElementById("a").onclick = function () { document.getElementById("n").textContent = "Filtro com " + document.getElementById("f").value.length + " caracteres"; };</script>',
  '</body></html>',
].join('');
/** @type {import('node:http').Server} */
let pageServer;
let pageUrl = '';
before(async () => {
  pageServer = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  await new Promise((r) => pageServer.listen(0, '127.0.0.1', () => r(null)));
  pageUrl = `http://127.0.0.1:${/** @type {any} */ (pageServer.address()).port}`;
});
after(async () => {
  /** @type {any} */ (pageServer).closeAllConnections?.();
  await new Promise((r) => pageServer.close(() => r(null)));
});

/** @param {string} s */
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
/** @param {string} path */
const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

// ---------------------------------------------------------------------------
// Hand-written snapshots. The recorded prefix is built by hand, independently of the runner's own helpers: it is
// the file format the ground mode writes, a digest in place of every typed value.
// ---------------------------------------------------------------------------

const GROUP = 'Nao concluidas';
const GOTO = { action: 'goto', path: '/tasks' };
const HEAD = { action: 'expect_visible', role: 'heading', name: 'Tarefas' };
const CLICK = { action: 'click', role: 'button', name: GROUP };
const OTHER_CLICK = { action: 'click', role: 'button', name: 'Outro' };
const DETAILS = { action: 'click', role: 'link', name: 'Detalhes' };
const FILL = { action: 'fill', role: 'textbox', name: 'Filtro', value: 'abc' };
const APPLY = { action: 'click', role: 'button', name: 'Aplicar' };
const ROW = { action: 'expect_visible', text: 'Comprar leite' };
const RESULT = { action: 'expect_visible', text: 'Filtro com 3 caracteres' };
const MANUAL = 'Open the tasks and expand the group.';

/** @param {any} step @returns {any} the step as the ground mode records it */
const recorded = (step) =>
  step.action === 'fill' ? { action: 'fill', role: step.role, name: step.name, value_sha256: sha(step.value) } : { ...step };
const role = (/** @type {string} */ r, /** @type {string} */ name, matches = 1) => ({ kind: 'role', role: r, name, matches });
const text = (/** @type {string} */ t, matches = 1) => ({ kind: 'text', text: t, matches });

const PLAIN = {
  schema_version: 1,
  role: 'admin',
  route: '/tasks',
  withheld: 0,
  entries: [role('heading', 'Tarefas'), role('button', GROUP), role('button', 'Outro'), role('textbox', 'Filtro'), role('button', 'Aplicar'), role('link', 'Detalhes')],
};
/** @param {any[]} steps the case's steps up to the interaction, the first being the route's goto @param {any[]} entries */
const postFile = (steps, entries, route = '/tasks', who = 'admin') => ({
  schema_version: 2,
  role: who,
  route,
  withheld: 0,
  entries,
  prefix: steps.map(recorded),
});
// A post-interaction file lists the whole page as it is after the interaction: the entries of the plain one and the new ones.
const ROWS = [...PLAIN.entries, text('Comprar leite'), text('Pagar conta'), text('Duplicada', 2)];
const POST = postFile([GOTO, CLICK], ROWS);
const POST_FILL = postFile([GOTO, FILL, APPLY], [...PLAIN.entries, text('Filtro com 3 caracteres')]);

/** @param {any[]} steps @param {any[]} snapshots @param {string | null} [manual] @param {string | null} [who] */
const pre = (steps, snapshots, manual = MANUAL, who = 'admin') => precheck(steps, snapshots, manual, who);
/** @param {any[]} steps @param {any[]} snapshots @param {any} manual @param {string | null} who */
const precheck = (steps, snapshots, manual, who) => R.precheckGroundedSteps(steps, snapshots, manual, who);

// ---------------------------------------------------------------------------
// 1. The plan-time check
// ---------------------------------------------------------------------------

test('AC-11 a locator step after the case own interactions is grounded against the post-interaction snapshot of exactly those interactions, whatever the order of the files', () => {
  assert.equal(pre([GOTO, HEAD, CLICK, ROW], [PLAIN, POST]), null, 'the rows of the expanded group were not grounded');
  assert.equal(pre([GOTO, HEAD, CLICK, ROW], [POST, PLAIN]), null, 'the lookup depends on the order of the files');
  assert.equal(pre([GOTO, HEAD, CLICK, { action: 'expect_visible', text: 'Pagar conta' }], [PLAIN, POST]), null);
  // The exactly-one rule holds on the post-interaction entries as it does on the plain ones.
  const twin = pre([GOTO, HEAD, CLICK, { action: 'expect_visible', text: 'Duplicada' }], [PLAIN, POST]);
  assert.equal(twin?.code, 'STEP_UNGROUNDED');
  assert.match(String(twin?.reason), /^step 4:/);
  assert.equal(String(twin?.reason).includes('Duplicada'), false, 'the gap reason echoes the locator');
  assert.equal(/2 elements/.test(String(twin?.reason)), false, 'the gap reason carries a match count');
});

test('AC-11 a step before the interaction, and the interaction itself, are grounded against the plain snapshot; an element only the post-interaction file lists is never used for them', () => {
  assert.equal(pre([GOTO, HEAD, CLICK], [POST, PLAIN]), null, 'the interaction itself must ground against the plain snapshot');
  assert.equal(pre([GOTO, HEAD], [POST, PLAIN]), null);
  // Only the post-interaction file lists the row, and the row is asked for before the click.
  const early = pre([GOTO, ROW, CLICK], [PLAIN, POST]);
  assert.equal(early?.code, 'STEP_UNGROUNDED');
  assert.match(String(early?.reason), /^step 2:/);
  // A post-interaction file alone cannot ground a step of a case that has not interacted yet.
  const alone = pre([GOTO, ROW], [POST]);
  assert.equal(alone?.code, 'STEP_UNGROUNDED');
  assert.match(String(alone?.reason), /^step 2:/);
});

test('AC-11 only the goto, click and fill steps of the case count: an assertion between them is ignored, and a step of the history that cannot be keyed means no post-interaction snapshot', () => {
  const again = { action: 'expect_text', role: 'heading', name: 'Tarefas', contains: 'tasks' };
  assert.equal(pre([GOTO, HEAD, CLICK, again, ROW], [PLAIN, POST], 'Open the tasks and expand the group.'), null, 'an assertion between the steps changed the history');
  assert.equal(pre([GOTO, CLICK, HEAD, ROW], [PLAIN, POST]), null, 'an assertion after the click was counted');

  // A selector click is a legacy step with no key: the history is unkeyable, so the plain snapshot applies and the row is not there.
  const legacy = pre([GOTO, HEAD, { action: 'click', selector: '#legacy' }, ROW], [PLAIN, POST]);
  assert.equal(legacy?.code, 'STEP_UNGROUNDED');
  assert.match(String(legacy?.reason), /^step 4:/);
});

test('AC-11 a post-interaction snapshot is not consumed when the history of the case is not exactly its prefix: an extra step, a missing step, a different value, a reload, another role or another route; the step that needed it is a gap that carries no locator or value', () => {
  /** @type {[string, any[], any[], string | null, number][]} label, steps, snapshots, role, step position of the gap */
  const notConsumed = [
    ['an extra click before the prefix', [GOTO, HEAD, OTHER_CLICK, CLICK, ROW], [PLAIN, POST], 'admin', 5],
    ['an extra fill after the prefix', [GOTO, HEAD, CLICK, FILL, ROW], [PLAIN, POST], 'admin', 5],
    ['a missing step: the fill is not in the case', [GOTO, HEAD, APPLY, RESULT], [PLAIN, POST_FILL], 'admin', 4],
    ['a different typed value', [GOTO, HEAD, { ...FILL, value: 'abd' }, APPLY, RESULT], [PLAIN, POST_FILL], 'admin', 5],
    ['a reload of the route after the interaction', [GOTO, HEAD, CLICK, GOTO, ROW], [PLAIN, POST], 'admin', 5],
    ['another interaction', [GOTO, HEAD, OTHER_CLICK, ROW], [PLAIN, POST], 'admin', 4],
  ];
  for (const [label, steps, snapshots, who, position] of notConsumed) {
    const r = pre(steps, snapshots, 'Type abd in the filter and apply it. Type abc too.', who);
    assert.deepEqual(r, { code: 'STEP_UNGROUNDED', reason: `step ${position}: the step could not be grounded to exactly one element` }, `${label}: ${JSON.stringify(r)}`);
    assert.equal(/Outro|Aplicar|Filtro|abc|abd|Comprar/.test(String(r?.reason)), false, `${label}: the reason echoes a locator or a value: ${r?.reason}`);
  }

  const otherRole = pre([GOTO, HEAD, CLICK, ROW], [PLAIN, postFile([GOTO, CLICK], ROWS, '/tasks', 'viewer')]);
  assert.equal(otherRole?.code, 'STEP_UNGROUNDED', 'a post-interaction snapshot of another role was used');
  const otherRoute = pre([{ action: 'goto', path: '/other' }, HEAD, CLICK, ROW], [{ ...PLAIN, route: '/other' }, POST]);
  assert.equal(otherRoute?.code, 'STEP_UNGROUNDED', 'a post-interaction snapshot of another route was used');
  assert.equal(pre([GOTO, HEAD, CLICK, ROW], [PLAIN, postFile([GOTO, CLICK], ROWS)], MANUAL, 'viewer')?.code, 'STEP_UNGROUNDED');
});

test('AC-11 two post-interaction snapshots of one role and route are told apart by the history of the case, and the route after an expect_url selects the snapshot of that route', () => {
  const a = postFile([GOTO, CLICK], [role('heading', 'Tarefas'), text('Comprar leite')]);
  const b = postFile([GOTO, FILL, APPLY], [role('heading', 'Tarefas'), text('Filtro com 3 caracteres')]);
  assert.equal(pre([GOTO, HEAD, CLICK, ROW], [PLAIN, b, a]), null, 'the click case did not find its own file');
  assert.equal(pre([GOTO, HEAD, FILL, APPLY, RESULT], [PLAIN, a, b], 'Type abc in the filter.'), null, 'the fill case did not find its own file');
  assert.equal(pre([GOTO, HEAD, FILL, APPLY, ROW], [PLAIN, a, b], 'Type abc in the filter.')?.code, 'STEP_UNGROUNDED', 'one file served the other history');
  assert.equal(pre([GOTO, HEAD, CLICK, RESULT], [PLAIN, a, b], 'Type abc in the filter.')?.code, 'STEP_UNGROUNDED', 'one file served the other history');

  // A click that navigates: the snapshot is keyed to the route the page ended on, which the case states with expect_url.
  const nav = postFile([GOTO, DETAILS], [role('heading', 'Detalhe'), text('Comprar leite')], '/tasks/5');
  const landed = { action: 'expect_url', path: '/tasks/5' };
  assert.equal(pre([GOTO, HEAD, DETAILS, landed, ROW], [PLAIN, nav]), null, 'the route after expect_url did not select the snapshot');
  const unstated = pre([GOTO, HEAD, DETAILS, ROW], [PLAIN, nav]);
  assert.deepEqual(unstated, { code: 'STEP_UNGROUNDED', reason: 'step 4: the step could not be grounded to exactly one element' }, 'without expect_url the case is still on the first route');
});

test('AC-11 AC-1 a plan with plain snapshots only reports every miss as the one fixed step-gap sentence, and a plain lookup never returns a post-interaction file', () => {
  assert.equal(pre([GOTO, HEAD, CLICK], [PLAIN]), null);
  const GAP = (/** @type {number} */ n) => ({ code: 'STEP_UNGROUNDED', reason: `step ${n}: the step could not be grounded to exactly one element` });
  const unknown = pre([GOTO, HEAD, CLICK, ROW], [PLAIN]);
  assert.deepEqual(unknown, GAP(4));
  const noSnapshot = pre([GOTO, HEAD], []);
  assert.deepEqual(noSnapshot, GAP(2));
  const ambiguous = pre([GOTO, { action: 'expect_visible', role: 'button', name: 'Gemeo' }], [{ ...PLAIN, entries: [role('button', 'Gemeo', 2)] }]);
  assert.deepEqual(ambiguous, GAP(2));

  // The same entry in a plain file and in a post-interaction file: a step before any interaction reads the plain one.
  const plainTwin = { ...PLAIN, entries: [role('heading', 'Tarefas', 2)] };
  const postOnly = postFile([GOTO, CLICK], [role('heading', 'Tarefas', 1)]);
  for (const snapshots of [[plainTwin, postOnly], [postOnly, plainTwin]]) {
    const r = pre([GOTO, HEAD], snapshots);
    assert.deepEqual(r, GAP(2), 'a plain lookup returned the post-interaction file');
  }
});

// ---------------------------------------------------------------------------
// 2. A replayed fill value comes from the report
// ---------------------------------------------------------------------------

test('AC-11 AC-1 a fill value that a consumed prefix typed must come from the report own steps: the step that depends on the prefix is a gap, whitespace and case insensitively, never naming the value', () => {
  const filled = [GOTO, HEAD, FILL, APPLY, RESULT];
  assert.equal(pre(filled, [PLAIN, POST_FILL], 'Type abc in the filter and apply it.'), null, 'a value the report states was refused');
  assert.equal(pre(filled, [PLAIN, POST_FILL], 'TYPE   ABC\nin the filter'), null, 'the comparison is not whitespace and case insensitive');

  // The result expectation (step 5) is the one that needed the post-interaction snapshot, so it is the gap; the fill and the apply are not.
  const invented = pre(filled, [PLAIN, POST_FILL], 'Open the tasks and apply the filter.');
  assert.equal(invented?.code, 'STEP_UNGROUNDED');
  assert.match(String(invented?.reason), /^step 5:/, 'the gap names the position of the step that depends on the typed value');
  assert.equal(String(invented?.reason).includes('abc'), false, `the reason echoes the value: ${invented?.reason}`);
  assert.deepEqual(R.groundLocators(filled, [PLAIN, POST_FILL], 'Open the tasks and apply the filter.', 'admin'), { gaps: [{ at: 4, kind: 'assertion' }], truncateAt: null, runtime: [] });
  for (const manual of [null, 42, undefined, '']) {
    assert.equal(precheck(filled, [PLAIN, POST_FILL], manual, 'admin')?.code, 'STEP_UNGROUNDED', `a manual text of ${JSON.stringify(manual)} satisfied the rule`);
  }

  // The position is that of the dependent step, wherever it sits in the case.
  const later = pre([GOTO, HEAD, { action: 'expect_visible', role: 'heading', name: 'Tarefas' }, FILL, APPLY, RESULT], [PLAIN, POST_FILL], 'Open the tasks.');
  assert.equal(later?.code, 'STEP_UNGROUNDED');
  assert.match(String(later?.reason), /^step 6:/);
});

test('AC-11 the report-sourced rule applies only to a consumed prefix: a plain plan with a fill, a post-interaction file that is not consumed and a click-only prefix are untouched by it', () => {
  // No post-interaction file: a fill in a plain plan is what it always was.
  assert.equal(pre([GOTO, HEAD, FILL, APPLY], [PLAIN], 'Open the tasks.'), null);
  // A file for another value is not consumed, so the refusal is the grounding one, not the value rule.
  const other = pre([GOTO, HEAD, { ...FILL, value: 'abd' }, APPLY, RESULT], [PLAIN, POST_FILL], 'Open the tasks.');
  assert.equal(other?.code, 'STEP_UNGROUNDED');
  // Both outcomes are the same gap sentence now, so the report's words tell them apart: the result text stated by the
  // report grounds the step when the prefix was not consumed, and would stay a gap if the value rule had fired.
  const stated = 'Open the tasks and see Filtro com 3 caracteres.';
  assert.deepEqual(R.groundLocators([GOTO, HEAD, { ...FILL, value: 'abd' }, APPLY, RESULT], [PLAIN, POST_FILL], stated, 'admin'), { gaps: [], truncateAt: null, runtime: [4] }, 'the value rule fired for a prefix that was not consumed');
  // A prefix of clicks has no typed value to source.
  assert.equal(pre([GOTO, HEAD, CLICK, ROW], [PLAIN, POST], 'Open the tasks.'), null);
});

// ---------------------------------------------------------------------------
// 3. The real run mode over snapshot files: loaded and consumed at plan time, no browser and no login
// ---------------------------------------------------------------------------

/** A login stub that leaves a trace, so a case that reached the session stage would be visible. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  'writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [], origins: [] }));',
].join('\n');

/**
 * @param {{ title: string, manual: string[], steps: any[] }[]} defs
 * @param {[string, any][]} files the grounding files, by name
 */
function projectWith(defs, files) {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: pageUrl, roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: 'admin', state: 'none', steps: d.steps })),
    }),
  );
  for (const [name, doc] of files) writeFileSync(join(runDir, 'grounding', name), JSON.stringify(doc));
  return { root, runDir, report: join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md') };
}

/**
 * The runner copy as an async child (the loopback page must keep answering), with Playwright resolved from the
 * repository node_modules through NODE_PATH.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ status: number | null, stderr: string }>}
 */
function runCopy(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [COPY, ...args], { cwd, env: { ...process.env, ...GIT_ENV, NODE_PATH: resolve('node_modules') }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 200000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (status) => {
      clearTimeout(timer);
      resolveP({ status, stderr });
    });
  });
}

test('AC-11 AC-1 end to end through the real runner: a post-interaction file is loaded and consumed at plan time, so the step that needed it is grounded and runs, and a document that is not one is ignored as an unknown schema always was', { timeout: 280000 }, async () => {
  const plainFor = (/** @type {string} */ route) => ({ ...PLAIN, route });
  const state = postFile([{ action: 'goto', path: '/noprefix' }, CLICK], [role('heading', 'Tarefas'), text('Linha')], '/noprefix');
  const { prefix: _droppedPrefix, ...noPrefixArray } = state;
  const schemaThree = { ...postFile([{ action: 'goto', path: '/v3' }, CLICK], [role('heading', 'Tarefas'), text('Linha')], '/v3'), schema_version: 3 };
  const prefixed = (/** @type {string} */ route) => [{ action: 'goto', path: route }, HEAD, CLICK, { action: 'expect_visible', text: 'Linha' }];
  const stated = ['1. Open the page.', '2. Expand the group and see the line.'];

  const fx = projectWith(
    [
      { title: 'Consumed, value stated', manual: ['1. Open the tasks.', '2. Type abc in the filter and apply it.'], steps: [GOTO, HEAD, FILL, APPLY, RESULT] },
      { title: 'Consumed, value invented', manual: ['1. Open the tasks.', '2. Fill the filter and apply it.'], steps: [GOTO, HEAD, FILL, APPLY, RESULT] },
      { title: 'Control, no file for the route', manual: ['1. Open the page.', '2. Type abc in the filter and apply it.'], steps: [{ action: 'goto', path: '/other' }, HEAD, FILL, APPLY, RESULT] },
      { title: 'Schema 2 without a prefix array', manual: stated, steps: prefixed('/noprefix') },
      { title: 'Schema 3', manual: stated, steps: prefixed('/v3') },
      { title: 'Another typed value', manual: ['1. Open the tasks.', '2. Type abd in the filter and apply it.'], steps: [GOTO, HEAD, { ...FILL, value: 'abd' }, APPLY, RESULT] },
    ],
    [
      ['admin--tasks.snapshot.json', PLAIN],
      ['admin--tasks--after-aaaaaaaa.snapshot.json', POST_FILL],
      ['admin--other.snapshot.json', { ...plainFor('/other'), entries: PLAIN.entries }],
      ['admin--noprefix.snapshot.json', plainFor('/noprefix')],
      ['admin--noprefix--after-aaaaaaaa.snapshot.json', noPrefixArray],
      ['admin--v3.snapshot.json', plainFor('/v3')],
      ['admin--v3--after-aaaaaaaa.snapshot.json', schemaThree],
    ],
  );
  const before = sha256File(fx.report);
  const r = await runCopy(['run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_REL], fx.root);
  assert.equal(r.status, 0, `the runner exited ${r.status}: ${r.stderr}`);
  assert.equal(sha256File(fx.report), before, 'the QA report changed during the run');
  const results = JSON.parse(readFileSync(join(fx.runDir, 'results.json'), 'utf8'));
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');
  assert.deepEqual(validateResults(results), []);
  const brief = (/** @type {any} */ c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
  const stepResults = (/** @type {any} */ c) => c.steps.map((/** @type {any} */ s) => s.result);
  const [consumedStated, consumed, control, noArray, three, another] = results.cases;

  // The file was loaded and consumed against: the result line that only the post-interaction file lists is grounded
  // (the value is the report's), so the step runs on the page and the case passes.
  assert.equal(consumedStated.outcome, 'pass', brief(consumedStated));
  // The value the report never states: the step that depends on the prefix is the one gap; the steps before it ran.
  assert.deepEqual([consumed.outcome, consumed.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(consumed));
  assert.deepEqual(stepResults(consumed), ['passed', 'passed', 'passed', 'passed', 'human']);
  assert.equal(JSON.stringify([consumed.reason, consumed.steps]).includes('abc'), false, 'the case record echoes the typed value');
  // The control of the same shape, value stated, on a route with no post-interaction file: nothing lists the result line.
  assert.deepEqual([control.outcome, control.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(control));
  assert.deepEqual(stepResults(control), ['passed', 'passed', 'passed', 'passed', 'human']);
  // A schema-2 document with no prefix array, and a schema-3 one, are not post-interaction snapshots: ignored, so the step is a gap.
  for (const [label, c] of /** @type {[string, any][]} */ ([['schema 2 without a prefix array', noArray], ['schema 3', three]])) {
    assert.deepEqual([c.outcome, c.reason_code], ['needs-human', 'STEP_UNGROUNDED'], `${label}: ${brief(c)}`);
    assert.deepEqual(stepResults(c), ['passed', 'passed', 'passed', 'human'], label);
  }
  // A file for another value exists for this role and route and is not consumed: the step is a gap, naming nothing.
  assert.deepEqual([another.outcome, another.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(another));
  assert.equal(/abd|abc/.test(JSON.stringify([another.reason, another.steps])), false, brief(another));

  // Each case's valid part ran: the login happened, and the five unlisted steps are the only people-owed ones.
  assert.equal(existsSync(join(fx.root, 'PRPs', 'auth', '.sessions')), true, 'the valid part of a case needs its session');
  assert.equal(results.counts.pass, 1);
  assert.equal(results.counts['needs-human'], 5);
});
