// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (the elements that exist only after a click or a fill become groundable: a locator step after the case's own interactions is grounded against the snapshot taken after exactly those interactions)
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
 *   2. A fill value a consumed prefix typed must come from the report's own steps: PLAN_ENTRY_INVALID at the
 *      position of the fill, raised at consumption, never naming the value.
 *   3. The real `run` mode over snapshot FILES, with no browser and no login: a post-interaction document is
 *      loaded and consumed at plan time (its refusal is the proof), and a document that is not one (schema 2 with
 *      no prefix array, schema 3) is ignored exactly as an unknown schema always was.
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
import { spawnSync } from 'node:child_process';
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
  assert.match(String(twin?.reason), /2 elements/);
  assert.equal(String(twin?.reason).includes('Duplicada'), false, 'the refusal echoes the locator');
});

test('AC-11 a step before the interaction, and the interaction itself, are grounded against the plain snapshot; an element only the post-interaction file lists is never used for them', () => {
  assert.equal(pre([GOTO, HEAD, CLICK], [POST, PLAIN]), null, 'the interaction itself must ground against the plain snapshot');
  assert.equal(pre([GOTO, HEAD], [POST, PLAIN]), null);
  // Only the post-interaction file lists the row, and the row is asked for before the click.
  const early = pre([GOTO, ROW, CLICK], [PLAIN, POST]);
  assert.equal(early?.code, 'STEP_UNGROUNDED');
  assert.match(String(early?.reason), /^step 2:/);
  assert.match(String(early?.reason), /not a snapshot entry/);
  // A post-interaction file alone cannot ground a step of a case that has not interacted yet.
  const alone = pre([GOTO, ROW], [POST]);
  assert.equal(alone?.code, 'STEP_UNGROUNDED');
  assert.match(String(alone?.reason), /no plan-time snapshot covers this role and route/);
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

test('AC-11 a post-interaction snapshot is not consumed when the history of the case is not exactly its prefix: an extra step, a missing step, a different value, a reload, another role or another route; the refusal carries a fixed hint and no locator or value', () => {
  /** @type {[string, any[], any[], string | null][]} label, steps, snapshots, role */
  const notConsumed = [
    ['an extra click before the prefix', [GOTO, HEAD, OTHER_CLICK, CLICK, ROW], [PLAIN, POST], 'admin'],
    ['an extra fill after the prefix', [GOTO, HEAD, CLICK, FILL, ROW], [PLAIN, POST], 'admin'],
    ['a missing step: the fill is not in the case', [GOTO, HEAD, APPLY, RESULT], [PLAIN, POST_FILL], 'admin'],
    ['a different typed value', [GOTO, HEAD, { ...FILL, value: 'abd' }, APPLY, RESULT], [PLAIN, POST_FILL], 'admin'],
    ['a reload of the route after the interaction', [GOTO, HEAD, CLICK, GOTO, ROW], [PLAIN, POST], 'admin'],
    ['another interaction', [GOTO, HEAD, OTHER_CLICK, ROW], [PLAIN, POST], 'admin'],
  ];
  for (const [label, steps, snapshots, who] of notConsumed) {
    const r = pre(steps, snapshots, 'Type abd in the filter and apply it. Type abc too.', who);
    assert.equal(r?.code, 'STEP_UNGROUNDED', `${label}: ${JSON.stringify(r)}`);
    assert.match(String(r?.reason), /not a snapshot entry/, label);
    assert.match(String(r?.reason), /post-interaction snapshot exists for this role and route/, `${label}: no hint`);
    assert.equal(/Outro|Aplicar|Filtro|abc|abd|Comprar/.test(String(r?.reason)), false, `${label}: the refusal echoes a locator or a value: ${r?.reason}`);
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
  assert.equal(unstated?.code, 'STEP_UNGROUNDED', 'without expect_url the case is still on the first route');
  assert.equal(/post-interaction snapshot exists/.test(String(unstated?.reason)), false, 'the hint names a snapshot of a route the case never reached');
});

test('AC-11 a plan with plain snapshots only refuses with the sentences it always had, byte for byte, and a plain lookup never returns a post-interaction file', () => {
  assert.equal(pre([GOTO, HEAD, CLICK], [PLAIN]), null);
  const unknown = pre([GOTO, HEAD, CLICK, ROW], [PLAIN]);
  assert.deepEqual(unknown, { code: 'STEP_UNGROUNDED', reason: 'step 4: the locator is not a snapshot entry' });
  const noSnapshot = pre([GOTO, HEAD], []);
  assert.deepEqual(noSnapshot, {
    code: 'STEP_UNGROUNDED',
    reason: 'step 2: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step',
  });
  const ambiguous = pre([GOTO, { action: 'expect_visible', role: 'button', name: 'Gemeo' }], [{ ...PLAIN, entries: [role('button', 'Gemeo', 2)] }]);
  assert.deepEqual(ambiguous, { code: 'STEP_UNGROUNDED', reason: 'step 2: the locator matched 2 elements in the snapshot; a locator must match exactly one' });

  // The same entry in a plain file and in a post-interaction file: a step before any interaction reads the plain one.
  const plainTwin = { ...PLAIN, entries: [role('heading', 'Tarefas', 2)] };
  const postOnly = postFile([GOTO, CLICK], [role('heading', 'Tarefas', 1)]);
  for (const snapshots of [[plainTwin, postOnly], [postOnly, plainTwin]]) {
    const r = pre([GOTO, HEAD], snapshots);
    assert.equal(r?.code, 'STEP_UNGROUNDED', 'a plain lookup returned the post-interaction file');
    assert.match(String(r?.reason), /2 elements/);
  }
});

// ---------------------------------------------------------------------------
// 2. A replayed fill value comes from the report
// ---------------------------------------------------------------------------

test('AC-11 a fill value that a consumed prefix typed must come from the report own steps: PLAN_ENTRY_INVALID at the position of the fill, whitespace and case insensitively, never naming the value', () => {
  const filled = [GOTO, HEAD, FILL, APPLY, RESULT];
  assert.equal(pre(filled, [PLAIN, POST_FILL], 'Type abc in the filter and apply it.'), null, 'a value the report states was refused');
  assert.equal(pre(filled, [PLAIN, POST_FILL], 'TYPE   ABC\nin the filter'), null, 'the comparison is not whitespace and case insensitive');

  const invented = pre(filled, [PLAIN, POST_FILL], 'Open the tasks and apply the filter.');
  assert.equal(invented?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(invented?.reason), /^step 3:/, 'the refusal names the position of the fill');
  assert.equal(String(invented?.reason).includes('abc'), false, `the refusal echoes the value: ${invented?.reason}`);
  for (const manual of [null, 42, undefined, '']) {
    assert.equal(precheck(filled, [PLAIN, POST_FILL], manual, 'admin')?.code, 'PLAN_ENTRY_INVALID', `a manual text of ${JSON.stringify(manual)} satisfied the rule`);
  }

  // The position is the fill's own, wherever it sits in the case.
  const later = pre([GOTO, HEAD, { action: 'expect_visible', role: 'heading', name: 'Tarefas' }, FILL, APPLY, RESULT], [PLAIN, POST_FILL], 'Open the tasks.');
  assert.equal(later?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(later?.reason), /^step 4:/);
});

test('AC-11 the report-sourced rule applies only to a consumed prefix: a plain plan with a fill, a post-interaction file that is not consumed and a click-only prefix are untouched by it', () => {
  // No post-interaction file: a fill in a plain plan is what it always was.
  assert.equal(pre([GOTO, HEAD, FILL, APPLY], [PLAIN], 'Open the tasks.'), null);
  // A file for another value is not consumed, so the refusal is the grounding one, not the value rule.
  const other = pre([GOTO, HEAD, { ...FILL, value: 'abd' }, APPLY, RESULT], [PLAIN, POST_FILL], 'Open the tasks.');
  assert.equal(other?.code, 'STEP_UNGROUNDED');
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
  // Nothing listens on this port: a case that reached a page would be blocked, not refused at plan time.
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: 'http://127.0.0.1:9', roles: { admin: {} } }));
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

test('AC-11 end to end through the real runner: a post-interaction file is loaded and consumed at plan time, before any login or browser, and a document that is not one is ignored as an unknown schema always was', () => {
  const plainFor = (/** @type {string} */ route) => ({ ...PLAIN, route });
  const state = postFile([{ action: 'goto', path: '/noprefix' }, CLICK], [role('heading', 'Tarefas'), text('Linha')], '/noprefix');
  const { prefix: _droppedPrefix, ...noPrefixArray } = state;
  const schemaThree = { ...postFile([{ action: 'goto', path: '/v3' }, CLICK], [role('heading', 'Tarefas'), text('Linha')], '/v3'), schema_version: 3 };
  const prefixed = (/** @type {string} */ route) => [{ action: 'goto', path: route }, HEAD, CLICK, { action: 'expect_visible', text: 'Linha' }];
  const stated = ['1. Open the page.', '2. Expand the group and see the line.'];

  const fx = projectWith(
    [
      { title: 'Consumed, value invented', manual: ['1. Open the tasks.', '2. Fill the filter and apply it.'], steps: [GOTO, HEAD, FILL, APPLY, RESULT] },
      { title: 'Control, no file for the route', manual: ['1. Open the page.', '2. Fill the filter and apply it.'], steps: [{ action: 'goto', path: '/other' }, HEAD, FILL, APPLY, RESULT] },
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
  const r = spawnSync(NODE, [COPY, 'run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_REL], {
    cwd: fx.root,
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, ...GIT_ENV },
  });
  assert.equal(r.status, 0, `the runner exited ${r.status}: ${r.stderr}`);
  assert.equal(sha256File(fx.report), before, 'the QA report changed during the run');
  const results = JSON.parse(readFileSync(join(fx.runDir, 'results.json'), 'utf8'));
  assert.equal(results.report_sha256_after, results.report_sha256_before, 'the QA report changed during the run');
  assert.deepEqual(validateResults(results), []);
  const brief = (/** @type {any} */ c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);
  const [consumed, control, noArray, three, another] = results.cases;

  // The file was loaded and the case was consumed against it: the value the report never states is a plan defect at the fill.
  assert.deepEqual([consumed.outcome, consumed.reason_code], ['needs-human', 'PLAN_ENTRY_INVALID'], brief(consumed));
  assert.match(consumed.reason, /^step 3:/);
  assert.equal(consumed.reason.includes('abc'), false, consumed.reason);
  // The control of the same shape on a route with no post-interaction file is refused for grounding, not for the value.
  assert.deepEqual([control.outcome, control.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(control));
  assert.match(control.reason, /^step 5:/);
  assert.match(control.reason, /not a snapshot entry/);
  assert.equal(/post-interaction/.test(control.reason), false, control.reason);
  // A schema-2 document with no prefix array, and a schema-3 one, are not post-interaction snapshots: ignored, so no hint.
  for (const [label, c] of /** @type {[string, any][]} */ ([['schema 2 without a prefix array', noArray], ['schema 3', three]])) {
    assert.deepEqual([c.outcome, c.reason_code], ['needs-human', 'STEP_UNGROUNDED'], `${label}: ${brief(c)}`);
    assert.match(c.reason, /^step 4:/, label);
    assert.match(c.reason, /not a snapshot entry/, label);
    assert.equal(/post-interaction/.test(c.reason), false, `${label}: the file was recognized: ${c.reason}`);
  }
  // A file for another value exists for this role and route and is not consumed: the fixed hint says so, naming nothing.
  assert.deepEqual([another.outcome, another.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(another));
  assert.match(another.reason, /post-interaction snapshot exists for this role and route/);
  assert.equal(/abd|abc/.test(another.reason), false, another.reason);

  // Every case was refused at plan time: no login, no seed, no browser.
  assert.equal(existsSync(join(fx.root, 'PRPs', 'auth', '.sessions')), false, 'a login ran although every case was refused at plan time');
  assert.equal(results.counts['needs-human'], 5);
});
