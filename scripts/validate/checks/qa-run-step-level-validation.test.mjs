// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-1 An ungrounded assertion is a step gap, not an entry refusal (the other steps still run, the gap step is recorded human with STEP_UNGROUNDED and the fixed reason, and the case ends needs-human STEP_UNGROUNDED only if no executed step failed)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-2 An ungrounded interaction truncates the rest (steps before it run and count, it and every later step are recorded human, and nothing after the step before it acts on the page)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-3 Malformed entries still refuse whole (a schema error is PLAN_ENTRY_INVALID before anything is seeded, authenticated or requested)
/**
 * Phase 1 (step-level validation) of qa-runner-vocabulary-v4.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-1-step-level-validation.plan.md
 *              (AC-A1 an assertion gap, AC-A2 an interaction gap, AC-A3 schema errors stay whole)
 *
 * Layers, all over the REAL runner module and the REAL runner as a child process (never edited):
 *   1. groundLocators / precheckGroundedSteps as pure functions: the gap shape `{ gaps, truncateAt, runtime }`, an
 *      assertion gap that does not stop the walk, an interaction gap that does, a gap that carries no text, the
 *      absence anchor that is never trusted when it was itself skipped, and no `refusal` field any more.
 *   2. overlayGapRecords, gapVerdict and the two frozen sentences: the per-step records and the case verdict that
 *      follow from the gaps (a failed step still makes the case `fail`), and summarizeNeedsHuman counting the owed steps.
 *   3. validateSteps: a schema error is still a whole-entry PLAN_ENTRY_INVALID, whatever the grounding says.
 *   4. The real runner against a loopback page that records what was done to it: an ungrounded assertion skips only
 *      itself, an ungrounded click or fill stops the acting at that step, a failed executed step makes the case `fail`,
 *      and a malformed entry is refused with no login and no request.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const NODE_MODULES = resolve('node_modules');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261023T101010101Z`;
const SLOW = { timeout: 280000 };

const CANARY = 'canary-gz52-locator';
const GOTO = { action: 'goto', path: '/' };
const HEADING = { action: 'expect_visible', role: 'heading', name: 'Painel' };
const SALVAR = { action: 'expect_visible', role: 'button', name: 'Salvar' };
const GHOST = { action: 'expect_visible', role: 'button', name: 'Fantasma' };
const REPORT = 'Open the page Painel. Click Salvar and see Salvo.';

/** @param {string} route @param {any[]} entries @param {string} [who] */
const snap = (route, entries, who = 'anonymous') => ({ schema_version: 1, role: who, route, entries, withheld: 0 });
const SNAP = snap('/', [{ kind: 'role', role: 'heading', name: 'Painel', matches: 1 }, { kind: 'role', role: 'button', name: 'Salvar', matches: 1 }]);

// ---------------------------------------------------------------------------
// 1. groundLocators and precheckGroundedSteps: a miss is a step gap (AC-1, AC-2)
// ---------------------------------------------------------------------------

test('AC-1 an ungrounded assertion is a gap: it is left out of runtime, the other steps are still grounded, the walk goes on and nothing truncates', () => {
  const g = R.groundLocators([GOTO, HEADING, GHOST, { action: 'click', role: 'button', name: 'Salvar' }, { action: 'expect_visible', text: 'Salvo' }], [], REPORT, null);
  assert.deepEqual(g.gaps, [{ at: 2, kind: 'assertion' }]);
  assert.equal(g.truncateAt, null);
  assert.deepEqual(g.runtime, [1, 3, 4], 'the report-word steps around the gap are still resolved when the case runs');
  assert.equal('refusal' in g, false, 'a grounding miss is no longer a whole-entry refusal');
});

test('AC-1 every ungrounded assertion kind is a gap: expect_text, expect_value, expect_state, expect_not_visible and a scoped judge; several gaps are all listed', () => {
  const steps = [
    GOTO,
    HEADING,
    { action: 'expect_text', role: 'heading', name: 'Painel', contains: 'never written in the report' },
    { action: 'expect_value', role: 'textbox', name: 'Nada', not_empty: true },
    { action: 'expect_state', role: 'button', name: 'Nada', state: 'expanded', equals: false },
    { action: 'judge', kind: 'visual', criterion: 'Open the page Painel', within: { role: 'region', name: 'Nada' } },
    { action: 'expect_not_visible', role: 'button', name: 'Outro' },
  ];
  const g = R.groundLocators(steps, [SNAP], REPORT, null);
  assert.deepEqual(g.gaps, [2, 3, 4, 5, 6].map((at) => ({ at, kind: 'assertion' })));
  assert.equal(g.truncateAt, null);
});

test('AC-2 an ungrounded click or fill is an interaction gap: it truncates at its own zero-based index, and the steps after it are not walked at all', () => {
  const later = [{ action: 'click', role: 'button', name: 'Nada' }, GHOST, { action: 'goto', path: '/second' }, HEADING];
  for (const ungrounded of [{ action: 'click', role: 'button', name: 'Fantasma' }, { action: 'fill', role: 'textbox', name: 'Fantasma', value: 'x' }]) {
    // No snapshot: the heading is grounded by the report's own words, so it is the one step left to run time.
    const g = R.groundLocators([GOTO, HEADING, ungrounded, ...later], [], REPORT, null);
    assert.deepEqual(g.gaps, [{ at: 2, kind: 'interaction' }], ungrounded.action);
    assert.equal(g.truncateAt, 2, ungrounded.action);
    assert.deepEqual(g.runtime, [1], `${ungrounded.action}: only the steps before the truncation are listed`);
  }
  // An assertion gap earlier in the walk is kept; the first interaction gap still ends it.
  const both = R.groundLocators([GOTO, GHOST, { action: 'click', role: 'button', name: 'Fantasma' }, GHOST], [SNAP], REPORT, null);
  assert.deepEqual(both.gaps, [{ at: 1, kind: 'assertion' }, { at: 2, kind: 'interaction' }]);
  assert.equal(both.truncateAt, 2);
});

test('AC-1 AC-2 a gap carries no text: nothing of the locator reaches the result, and the pre-check names the first gap by position only', () => {
  const steps = [GOTO, HEADING, { action: 'expect_visible', role: 'button', name: CANARY }, { action: 'click', role: 'button', name: `${CANARY}-click` }];
  const g = R.groundLocators(steps, [SNAP], REPORT, null);
  assert.ok(!JSON.stringify(g).includes(CANARY), `a gap echoes the locator: ${JSON.stringify(g)}`);
  const pre = R.precheckGroundedSteps(steps, [SNAP], REPORT, null);
  assert.deepEqual(pre, { code: 'STEP_UNGROUNDED', reason: 'step 3: the step could not be grounded to exactly one element' });
  assert.ok(!JSON.stringify(pre).includes(CANARY));
  assert.equal(R.precheckGroundedSteps([GOTO, HEADING, SALVAR], [SNAP], REPORT, null), null, 'a fully grounded plan has no gap');
  assert.equal(R.precheckGroundedSteps([GOTO, { action: 'click', selector: '#legacy' }], [], '', null), null, 'a selector step is not checked');
});

test('AC-1 an absence is never asserted on a page whose positive anchor was skipped: expect_not_visible and a count-0 expect_requests after a gap anchor are gaps too', () => {
  const absent = { action: 'expect_not_visible', role: 'button', name: 'Salvar' };
  const noRequest = { action: 'expect_requests', method: 'POST', url_contains: '/api/x', count: 0 };
  // The only positive step is the ungrounded one: both absences lose their anchor.
  const lost = R.groundLocators([GOTO, GHOST, absent, noRequest], [SNAP], REPORT, null);
  assert.deepEqual(lost.gaps, [{ at: 1, kind: 'assertion' }, { at: 2, kind: 'assertion' }, { at: 3, kind: 'assertion' }]);
  // A grounded anchor keeps the absence a normal step.
  const kept = R.groundLocators([GOTO, HEADING, GHOST, absent, noRequest], [SNAP], REPORT, null);
  assert.deepEqual(kept.gaps, [{ at: 2, kind: 'assertion' }]);
  // A goto starts over: the anchor of the previous page does not serve the next one.
  const reloaded = R.groundLocators([GOTO, HEADING, GOTO, GHOST, absent], [SNAP], REPORT, null);
  assert.deepEqual(reloaded.gaps, [{ at: 3, kind: 'assertion' }, { at: 4, kind: 'assertion' }]);
});

test('AC-1 AC-2 a plan with no locator step has no gap, no truncation and nothing left to run time', () => {
  assert.deepEqual(R.groundLocators([GOTO, { action: 'expect_url', path: '/' }], [], '', null), { gaps: [], truncateAt: null, runtime: [] });
});

// ---------------------------------------------------------------------------
// 2. overlayGapRecords, gapVerdict and the fixed sentences (AC-1, AC-2)
// ---------------------------------------------------------------------------

const RECORDS = () => [1, 2, 3, 4].map((i) => ({ index: i, action: 'expect_visible', result: 'passed', evidence: `evidence/${i}.png` }));

test('AC-1 AC-2 the two sentences are different fixed strings that name no locator, value or page text', () => {
  assert.equal(typeof R.STEP_GAP_REASON, 'string');
  assert.equal(typeof R.STEP_TRUNCATED_REASON, 'string');
  assert.notEqual(R.STEP_GAP_REASON, R.STEP_TRUNCATED_REASON);
  assert.match(R.STEP_TRUNCATED_REASON, /not run after an ungrounded interaction/);
  for (const sentence of [R.STEP_GAP_REASON, R.STEP_TRUNCATED_REASON]) assert.ok(sentence.length > 0 && !/["'`{}]/.test(sentence), sentence);
});

test('AC-1 an assertion gap turns only its own record into human with STEP_UNGROUNDED and the fixed reason, and drops its evidence', () => {
  const recs = RECORDS();
  const out = R.overlayGapRecords(recs, [{ at: 1, kind: 'assertion' }], null);
  assert.equal(out.length, 4);
  assert.deepEqual(out[1], { index: 2, action: 'expect_visible', result: 'human', evidence: null, reason_code: 'STEP_UNGROUNDED', reason: R.STEP_GAP_REASON });
  for (const j of [0, 2, 3]) assert.deepEqual(out[j], recs[j], `record ${j + 1} was touched`);
});

test('AC-2 a truncation turns the gap record into STEP_UNGROUNDED human and every later record into human with the truncation sentence and no code', () => {
  const out = R.overlayGapRecords(RECORDS(), [{ at: 2, kind: 'interaction' }], 2);
  assert.deepEqual(out.map((r) => r.result), ['passed', 'passed', 'human', 'human']);
  assert.equal(out[2].reason_code, 'STEP_UNGROUNDED');
  assert.equal(out[2].reason, R.STEP_GAP_REASON);
  assert.equal(out[3].reason_code, null);
  assert.equal(out[3].reason, R.STEP_TRUNCATED_REASON);
  assert.equal(out[3].evidence, null);
  assert.equal(out[0].evidence, 'evidence/1.png', 'a step that ran keeps its evidence');
});

test('AC-1 AC-2 overlayGapRecords is pure: the input is not mutated, no gap returns equal records, and a gap past the end changes nothing', () => {
  const recs = RECORDS();
  const frozen = recs.map((r) => Object.freeze({ ...r }));
  assert.doesNotThrow(() => R.overlayGapRecords(frozen, [{ at: 1, kind: 'assertion' }], 1), 'the overlay wrote into its input');
  assert.deepEqual(R.overlayGapRecords(recs, [], null), recs);
  assert.deepEqual(R.overlayGapRecords(RECORDS(), [{ at: 9, kind: 'assertion' }], null), RECORDS());
});

test('AC-1 gapVerdict keeps a verdict that already ended the case (a failed step makes the case fail), else needs-human STEP_UNGROUNDED when there is a gap, else none', () => {
  const failed = { outcome: 'fail', reason_code: null, reason: 'step 3: x', evidence: [] };
  const blocked = { outcome: 'blocked', reason_code: 'TARGET_UNREACHABLE', reason: 'step 1: x', evidence: [] };
  const gaps = [{ at: 2, kind: 'assertion' }];
  assert.equal(R.gapVerdict(failed, gaps), failed);
  assert.equal(R.gapVerdict(blocked, gaps), blocked);
  assert.equal(R.gapVerdict(failed, []), failed);
  assert.equal(R.gapVerdict(null, []), null);
  const nh = R.gapVerdict(null, gaps);
  assert.equal(nh?.outcome, 'needs-human');
  assert.equal(nh?.reason_code, 'STEP_UNGROUNDED');
  assert.equal(nh?.reason, R.REASON_CATALOGUE.STEP_UNGROUNDED.reason);
  assert.ok(R.OUTCOMES.includes(nh?.outcome), 'the outcome stays inside the closed vocabulary');
});

test('AC-1 AC-2 the human step records of a gap case are counted as owed by summarizeNeedsHuman', () => {
  const steps = R.overlayGapRecords(RECORDS(), [{ at: 2, kind: 'interaction' }], 2);
  const summary = R.summarizeNeedsHuman([{ outcome: 'needs-human', reason_code: 'STEP_UNGROUNDED', steps }]);
  assert.equal(summary.needs_human_gap, 2);
  assert.equal(summary.needs_human_impossible, 0);
});

// ---------------------------------------------------------------------------
// 3. Schema errors still refuse the whole entry (AC-3)
// ---------------------------------------------------------------------------

test('AC-3 a schema error is PLAN_ENTRY_INVALID for the whole entry with its position: an unknown action, a missing required key, an invalid effect and an unbound name', () => {
  /** @type {[string, any, number][]} */
  const malformed = [
    ['an unknown action', { action: 'teleport' }, 3],
    ['a missing required key', { action: 'fill', role: 'textbox', name: 'Apelido' }, 3],
    ['an invalid effect', { action: 'click', role: 'button', name: 'Salvar', effect: 'delete' }, 3],
    ['an unbound name', { action: 'fill', role: 'textbox', name: 'Apelido', value: '{{who}}' }, 3],
  ];
  for (const [label, step, position] of malformed) {
    const r = R.validateSteps('browser', [GOTO, HEADING, step], []);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', label);
    assert.match(String(r?.reason), new RegExp(`^step ${position}: `), label);
  }
  // A declared capture binds the name: the same step is then no schema error.
  assert.equal(R.validateSteps('browser', [GOTO, HEADING, { action: 'fill', role: 'textbox', name: 'Apelido', value: '{{who}}' }], ['who']), null);
});

test('AC-3 a schema error wins over an ungrounded step: validation does not depend on the snapshots or the report, and grounding never turns a malformed step into a gap', () => {
  const steps = [GOTO, HEADING, GHOST, { action: 'teleport' }];
  assert.equal(R.validateSteps('browser', steps, [])?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(R.validateSteps('browser', steps, [])?.reason), /^step 4: /);
  // The same step list without the schema error is valid, and then the ungrounded step is a gap.
  assert.equal(R.validateSteps('browser', steps.slice(0, 3), []), null);
  assert.deepEqual(R.groundLocators(steps.slice(0, 3), [SNAP], REPORT, null).gaps, [{ at: 2, kind: 'assertion' }]);
  // A malformed locator step is no gap candidate: grounding skips what it cannot read, and validation refuses it.
  const malformedLocator = { action: 'click', role: 'button' };
  assert.equal(R.validateSteps('browser', [GOTO, HEADING, malformedLocator], [])?.code, 'PLAN_ENTRY_INVALID');
  assert.deepEqual(R.groundLocators([GOTO, HEADING, malformedLocator], [SNAP], REPORT, null).gaps, []);
});

// ---------------------------------------------------------------------------
// 4. The real runner against a loopback page
// ---------------------------------------------------------------------------

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v4p1-steps-'));
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

/** What the page was asked for, by pathname. @type {Record<string, number>} */
const hits = {};
const PAGE = [
  '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body>',
  '<h1>Painel</h1>',
  '<button type="button" id="s">Salvar</button>',
  '<button type="button" id="x">Excluir</button>',
  '<label for="ap">Apelido</label><input id="ap" type="text">',
  '<p id="log"></p>',
  '<script>',
  'document.getElementById("s").onclick = function () { fetch("/act/salvar"); document.getElementById("log").textContent = "Salvo"; };',
  'document.getElementById("x").onclick = function () { fetch("/act/excluir"); };',
  '</script></body></html>',
].join('');
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    if (path.startsWith('/act/')) {
      res.writeHead(204);
      res.end();
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

/**
 * A project that is not a git work tree, with its report, its plan and (for a role) a login stub.
 * @param {{ title: string, manual: string[], steps: any[] }[]} defs
 * @param {{ role?: string | null }} [o]
 */
function project(defs, o = {}) {
  const role = o.role ?? null;
  const root = realpathSync(mkdtempSync(join(SANDBOX, 'run-')));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: role === null ? {} : { [role]: {} } }));
  if (role !== null) {
    const stub = [
      'import { writeFileSync, mkdirSync } from "node:fs";',
      'import { join } from "node:path";',
      'const root = process.argv[process.argv.indexOf("--root") + 1];',
      'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
      `writeFileSync(join(root, "PRPs", "auth", ".sessions", "${role}.json"), JSON.stringify({ cookies: [], origins: [] }));`,
    ].join('\n');
    writeFileSync(join(root, 'PRPs', 'auth', `login-${role}.mjs`), stub);
  }
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role, state: 'none', steps: d.steps })) }));
  return { root, runDir, sessions: join(root, 'PRPs', 'auth', '.sessions') };
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stderr: string, results: any }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    // NODE_PATH keeps Playwright resolvable whatever the target root holds.
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    child.stdout.on('data', () => {});
    const timer = setTimeout(() => child.kill(), 260000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      resolveP({ code, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

const resetHits = () => {
  for (const k of Object.keys(hits)) delete hits[k];
};
/** @param {any} c @returns {string[]} */
const stepResults = (c) => c.steps.map((/** @type {any} */ s) => s.result);

test('AC-1 AC-2 end to end: an ungrounded assertion skips only itself, a failed executed step still makes the case fail, and an ungrounded click or fill stops the acting at that step', SLOW, async () => {
  resetHits();
  const manualFor = (/** @type {string} */ line) => ['1. Open the page Painel.', `2. ${line}`];
  const click = (/** @type {string} */ name) => ({ action: 'click', role: 'button', name });
  const defs = [
    // AC-1: step 3 is an assertion nobody grounds; steps 1, 2, 4 and 5 run.
    {
      title: 'Assertion gap',
      manual: manualFor('Click Salvar and see Salvo.'),
      steps: [GOTO, HEADING, GHOST, click('Salvar'), { action: 'expect_visible', text: 'Salvo' }],
    },
    // AC-1: the same gap, but an executed step fails, so the case is fail and not needs-human.
    {
      title: 'Assertion gap and a failed step',
      manual: manualFor('Stay on the page.'),
      steps: [GOTO, HEADING, GHOST, { action: 'expect_url', path: '/nowhere' }],
    },
    // AC-2: step 3 is a click nobody grounds; the goto and everything after it are not run.
    {
      title: 'Click gap',
      manual: manualFor('Click Salvar.'),
      steps: [GOTO, HEADING, click('Excluir'), { action: 'goto', path: '/second' }, HEADING, click('Salvar')],
    },
    // AC-2: the same for a fill.
    {
      title: 'Fill gap',
      manual: manualFor('Click Salvar.'),
      steps: [GOTO, HEADING, { action: 'fill', role: 'textbox', name: 'Apelido', value: 'ana' }, click('Salvar')],
    },
  ];
  const fx = project(defs);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.deepEqual(validateResults(r.results), []);
  const [assertionGap, failedStep, clickGap, fillGap] = r.results.cases;
  const brief = (/** @type {any} */ c) => JSON.stringify([c.outcome, c.reason_code, c.reason, stepResults(c)]);

  // AC-1: steps 1, 2, 4 and 5 ran and passed; step 3 is human with the code and the fixed sentence.
  assert.deepEqual([assertionGap.outcome, assertionGap.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(assertionGap));
  assert.deepEqual(stepResults(assertionGap), ['passed', 'passed', 'human', 'passed', 'passed']);
  assert.equal(assertionGap.steps[2].reason_code, 'STEP_UNGROUNDED');
  assert.equal(assertionGap.steps[2].reason, R.STEP_GAP_REASON);
  assert.equal(assertionGap.steps[2].evidence, null);
  assert.equal(typeof assertionGap.manual_steps_verbatim, 'string', 'the manual steps go to the person');
  assert.match(assertionGap.manual_steps_verbatim, /Click Salvar and see Salvo/);
  // AC-1: a failed executed step makes the case fail; the gap before it is still human.
  assert.deepEqual([failedStep.outcome, failedStep.reason_code], ['fail', null], brief(failedStep));
  assert.deepEqual(stepResults(failedStep), ['passed', 'passed', 'human', 'failed']);
  assert.equal(failedStep.steps[2].reason, R.STEP_GAP_REASON);

  // AC-2: steps 1-2 ran and count; the gap step and every later step are human; the later ones carry the truncation sentence.
  assert.deepEqual([clickGap.outcome, clickGap.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(clickGap));
  assert.deepEqual(stepResults(clickGap), ['passed', 'passed', 'human', 'human', 'human', 'human']);
  assert.equal(clickGap.steps[2].reason_code, 'STEP_UNGROUNDED');
  assert.equal(clickGap.steps[2].reason, R.STEP_GAP_REASON);
  for (const j of [3, 4, 5]) {
    assert.equal(clickGap.steps[j].reason_code, null, `step ${j + 1}`);
    assert.equal(clickGap.steps[j].reason, R.STEP_TRUNCATED_REASON, `step ${j + 1}`);
  }
  assert.deepEqual([fillGap.outcome, fillGap.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(fillGap));
  assert.deepEqual(stepResults(fillGap), ['passed', 'passed', 'human', 'human']);
  assert.equal(fillGap.steps[3].reason, R.STEP_TRUNCATED_REASON);

  // Nothing after the step before the gap acted on the page: the only action of the run is the passing case's own Salvar click.
  await new Promise((done) => setTimeout(done, 300));
  assert.equal(hits['/act/salvar'], 1, `the page saw Salvar clicked ${hits['/act/salvar']} times`);
  assert.equal(hits['/act/excluir'], undefined, 'the ungrounded click acted on the page');
  assert.equal(hits['/second'], undefined, 'a goto after the truncation loaded its page');

  // The reasons and the step records echo no locator word and no typed value.
  for (const c of r.results.cases) {
    const text = JSON.stringify([c.reason, c.steps]);
    assert.ok(!/Fantasma|Excluir|Apelido|\bana\b/.test(text), `a record echoes a locator or a value: ${text}`);
  }
});

test('AC-3 end to end: a malformed entry is refused whole with its step position, before any login or request, even next to an ungrounded step', SLOW, async () => {
  resetHits();
  const manual = ['1. Open the page Painel.', '2. Click Salvar.'];
  const defs = [
    { title: 'Unknown action', manual, steps: [GOTO, HEADING, { action: 'teleport' }] },
    { title: 'Missing required key', manual, steps: [GOTO, HEADING, { action: 'fill', role: 'textbox', name: 'Apelido' }] },
    { title: 'Invalid effect', manual, steps: [GOTO, HEADING, { action: 'click', role: 'button', name: 'Salvar', effect: 'delete' }] },
    { title: 'Unbound name', manual, steps: [GOTO, HEADING, { action: 'fill', role: 'textbox', name: 'Apelido', value: '{{who}}' }] },
    { title: 'Schema error after a gap', manual, steps: [GOTO, HEADING, GHOST, { action: 'teleport' }] },
  ];
  // A named role with a login script: had any entry got past validation, the session would exist and the page would be hit.
  const fx = project(defs, { role: 'admin' });
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.deepEqual(validateResults(r.results), []);
  assert.equal(r.results.cases.length, defs.length);
  for (const [i, c] of r.results.cases.entries()) {
    assert.deepEqual([c.outcome, c.reason_code], ['needs-human', 'PLAN_ENTRY_INVALID'], `case ${i + 1} (${defs[i].title}): ${JSON.stringify([c.outcome, c.reason_code, c.reason])}`);
    assert.match(c.reason, new RegExp(`^step ${i === 4 ? 4 : 3}: `), `case ${i + 1}`);
    assert.deepEqual(c.steps, [], `case ${i + 1}: a refused entry runs no step and records none`);
    // The reason names a position and a rule; the binding case may name the unbound name, no case names a locator.
    assert.ok(!/Fantasma|Apelido/.test(c.reason), `case ${i + 1}: ${c.reason}`);
  }
  assert.deepEqual(hits, {}, `the page was requested: ${JSON.stringify(hits)}`);
  assert.equal(existsSync(fx.sessions), false, 'a login ran for an entry that was refused whole');
});
