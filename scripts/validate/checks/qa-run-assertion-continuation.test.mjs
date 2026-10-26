// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-6 Assertions continue after a failure (a failed assertion records itself and the later expect_*, query and judge steps still run and are recorded; the first failure is the case reason; the case ends fail; a blocked or needs-human result still stops the case and never replaces the first failure; a judge after a failure is recorded not-judged and is not counted as executed)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-7 Interactions stop after a failure (the first goto, click, fill, request or read_message, or any step carrying an effect, after a failed assertion and every later step are recorded not-run with one fixed sentence, the page is not touched, and the case ends fail)
/**
 * Phase 3 (assertion continuation) of qa-runner-vocabulary-v4.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-3-assertion-continuation.plan.md
 *              (AC-A1 assertions continue, AC-A2 interactions stop, AC-A3 the continuing set and the stop rules)
 *
 * Layers, all over the REAL runner module and the REAL runner as a child process (never edited):
 *   1. The pure pieces: the continuing set and continuesAfterFailure (an effect makes a step an interaction, and an
 *      effect cannot be written on an expect_* step at all), the fixed sentence, markFailedSteps, overlayStoppedRecords.
 *   2. The real `run` mode over a loopback page that records what was done to it: several failed assertions are all
 *      recorded with the first failure as the case reason; the first interaction after a failure and everything after
 *      it is not-run with the fixed sentence and the page is never touched; a later needs-human step ends the loop
 *      without replacing the first failure; a judge after a failure captures and is not-judged and not counted as judged.
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
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261024T101010101Z`;
const SLOW = { timeout: 290000 };

const CONTINUING = ['expect_visible', 'expect_text', 'expect_url', 'expect_value', 'expect_not_visible', 'expect_state', 'expect_requests', 'query', 'judge'];
const INTERACTIONS = ['goto', 'click', 'fill', 'request', 'read_message', 'teleport'];

// ---------------------------------------------------------------------------
// 1. The pure pieces (AC-6, AC-7)
// ---------------------------------------------------------------------------

test('AC-6 the continuing set is exactly every expect_* step, query and judge, and it is frozen', () => {
  assert.deepEqual([...R.ASSERTION_CONTINUES_ACTIONS].sort(), [...CONTINUING].sort());
  assert.ok(Object.isFrozen(R.ASSERTION_CONTINUES_ACTIONS));
});

test('AC-6 AC-7 continuesAfterFailure is true for each assertion step and false for every interaction, an unknown action and anything that is not a step', () => {
  for (const action of CONTINUING) assert.equal(R.continuesAfterFailure({ action }), true, action);
  for (const action of INTERACTIONS) assert.equal(R.continuesAfterFailure({ action }), false, action);
  for (const notStep of [null, undefined, 'expect_visible', 7, ['expect_visible'], {}, { action: 7 }]) {
    assert.equal(R.continuesAfterFailure(notStep), false, JSON.stringify(notStep));
  }
});

test('AC-7 a step that carries an effect is an interaction whatever its action, and an expect_* step cannot carry an effect in a plan at all', () => {
  for (const action of CONTINUING) assert.equal(R.continuesAfterFailure({ action, effect: 'write' }), false, action);
  assert.equal(R.continuesAfterFailure({ action: 'click', selector: '#a', effect: 'write' }), false);
  // The schema keeps the effect on click, fill and request only, so no plan reaches the driver with an effect on an assertion.
  assert.equal(R.validateStep('browser', { action: 'click', selector: '#a', effect: 'write' }), null, 'an effect is legal on a click');
  assert.equal(R.validateStep('browser', { action: 'expect_url', path: '/', effect: 'write' })?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(R.validateStep('browser', { action: 'expect_text', selector: 'h1', contains: 'x', effect: 'write' })?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(R.validateStep('browser', { action: 'judge', kind: 'visual', criterion: 'x', effect: 'write' })?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-7 the stop sentence is one fixed string that names no step, locator, value or page text and differs from the two gap sentences', () => {
  const s = R.STEP_NOT_RUN_AFTER_FAILURE_REASON;
  assert.equal(typeof s, 'string');
  assert.match(s, /^not run after a failed assertion; [a-z ]+$/);
  assert.ok(!/["'`{}\d]/.test(s), s);
  assert.notEqual(s, R.STEP_GAP_REASON);
  assert.notEqual(s, R.STEP_TRUNCATED_REASON);
});

/** @param {string[]} results */
const records = (results) => results.map((result, j) => ({ index: j + 1, action: 'expect_visible', result, evidence: result === 'not-run' ? null : `evidence/${j + 1}.png` }));

test('AC-6 markFailedSteps marks every listed passed record failed, keeps the rest of the record, and never touches a record that did not pass', () => {
  const recs = records(['passed', 'passed', 'passed', 'human', 'not-run']);
  const out = R.markFailedSteps(recs, [1, 2, 3, 4]);
  assert.deepEqual(out.map((r) => r.result), ['passed', 'failed', 'failed', 'human', 'not-run']);
  assert.deepEqual(out[1], { ...recs[1], result: 'failed' });
  assert.equal(out[0], recs[0]);
  assert.equal(out[3], recs[3], 'a human record is not a failure');
  assert.equal(out[4], recs[4], 'a not-run record is not a failure');
});

test('AC-6 markFailedSteps ignores an index that is not an integer inside the records, returns the same array when nothing applies, and does not mutate its input', () => {
  const recs = records(['passed', 'passed', 'not-run']);
  const frozen = recs.map((r) => Object.freeze({ ...r }));
  assert.doesNotThrow(() => R.markFailedSteps(Object.freeze(frozen), [0, 1]));
  assert.equal(recs[0].result, 'passed');
  assert.deepEqual(R.markFailedSteps(recs, [9, -1, 1.5, 2]).map((r) => r.result), ['passed', 'passed', 'not-run']);
  assert.equal(R.markFailedSteps(recs, []), recs);
  assert.equal(R.markFailedSteps(recs, [9, -1, 1.5]), recs);
  assert.equal(R.markFailedSteps(recs, [2]), recs);
});

test('AC-7 overlayStoppedRecords writes the fixed sentence and no code on every not-run record from the stop on, keeps the result not-run, and leaves every other record as it was', () => {
  const recs = records(['passed', 'failed', 'passed', 'not-run', 'not-run']);
  const out = R.overlayStoppedRecords(recs, 3);
  assert.deepEqual(out.map((r) => r.result), ['passed', 'failed', 'passed', 'not-run', 'not-run']);
  for (const j of [3, 4]) {
    assert.equal(out[j].reason, R.STEP_NOT_RUN_AFTER_FAILURE_REASON, `record ${j + 1}`);
    assert.equal(out[j].reason_code, null, `record ${j + 1}`);
    assert.equal(out[j].evidence, null, `record ${j + 1}`);
  }
  for (const j of [0, 1, 2]) assert.equal(out[j], recs[j], `record ${j + 1} was touched`);
  assert.equal(recs[3].reason, undefined, 'the input was mutated');
});

test('AC-7 overlayStoppedRecords rewrites only records that are not-run, and returns the same array when there is no stop', () => {
  const recs = records(['passed', 'human', 'failed', 'not-run']);
  const out = R.overlayStoppedRecords(recs, 0);
  assert.equal(out[0], recs[0]);
  assert.equal(out[1], recs[1], 'a human record keeps its own reason');
  assert.equal(out[2], recs[2]);
  assert.equal(out[3].reason, R.STEP_NOT_RUN_AFTER_FAILURE_REASON);
  for (const none of [null, undefined, -1, 1.5, '2', NaN]) assert.equal(R.overlayStoppedRecords(recs, /** @type {any} */ (none)), recs, String(none));
  const frozen = recs.map((r) => Object.freeze({ ...r }));
  assert.doesNotThrow(() => R.overlayStoppedRecords(Object.freeze(frozen), 3));
  assert.equal(R.overlayStoppedRecords(recs, 9)[3], recs[3], 'a stop past the end rewrites nothing');
});

// ---------------------------------------------------------------------------
// 2. The real runner against a loopback page that records what was done to it
// ---------------------------------------------------------------------------

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v4p3-cont-'));
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
  '<script>',
  'document.getElementById("s").onclick = function () { fetch("/act/salvar"); };',
  'document.getElementById("x").onclick = function () { fetch("/act/excluir"); };',
  'document.getElementById("ap").oninput = function () { fetch("/act/digitou"); };',
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
 * A project that is not a git work tree, with its report and its plan.
 * @param {{ title: string, manual: string[], steps: any[] }[]} defs
 */
function project(defs) {
  const root = realpathSync(mkdtempSync(join(SANDBOX, 'run-')));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: 'none', steps: d.steps })) }));
  return { root, runDir };
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
    const timer = setTimeout(() => child.kill(), 270000);
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

/** @param {any} c @returns {string[]} */
const stepResults = (c) => c.steps.map((/** @type {any} */ s) => s.result);
/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason, stepResults(c)]);

const GOTO = { action: 'goto', path: '/' };
/** A text assertion that holds on the page. */
const HOLDS = { action: 'expect_text', selector: 'h1', contains: 'Painel' };
/** @param {string} word a text assertion that fails at once, because the heading never contains the word */
const MISSING = (word) => ({ action: 'expect_text', selector: 'h1', contains: word });
const SEE = ['1. Open the page and see the Panel heading.'];
const CRITERION = 'the preview looks right';
const SCOPED_CRITERION = 'the Resumo panel reads in Portuguese';

test('AC-6 AC-7 end to end: later assertions run and are recorded after a failure, the first interaction after a failure and every step after it is not-run with the fixed sentence, and the page is never touched', SLOW, async () => {
  for (const k of Object.keys(hits)) delete hits[k];
  const defs = [
    // AC-6: goto, expect A (fails), expect B (passes), expect C (fails).
    { title: 'Three assertions', manual: SEE, steps: [GOTO, MISSING('Nope-one'), HOLDS, MISSING('Nope-two')] },
    // AC-7: goto, expect A (fails), click D, expect E.
    { title: 'Click right after the failure', manual: SEE, steps: [GOTO, MISSING('Nope-one'), { action: 'click', selector: '#s' }, HOLDS] },
    // AC-6 then AC-7: an assertion still runs, the click after it does not.
    { title: 'Assertion then click', manual: SEE, steps: [GOTO, { action: 'expect_url', path: '/nowhere' }, HOLDS, { action: 'click', selector: '#x' }, HOLDS] },
    // AC-7: a fill and a goto after a failure are interactions too; the trailing goto never loads its page.
    { title: 'Fill and goto after the failure', manual: SEE, steps: [GOTO, MISSING('Nope-one'), { action: 'fill', selector: '#ap', value: 'digitado' }, { action: 'goto', path: '/second' }, HOLDS] },
    // AC-6: a needs-human step after the failure ends the loop and does not replace the first failure.
    {
      title: 'A later needs-human step',
      manual: [...SEE, `2. Check that ${SCOPED_CRITERION}.`],
      steps: [GOTO, MISSING('Nope-one'), { action: 'judge', kind: 'language', criterion: SCOPED_CRITERION, within: { role: 'region', name: 'Resumo' } }, HOLDS],
    },
    // AC-6: a judge after a failure captures and is recorded not-judged.
    { title: 'A judge after the failure', manual: [...SEE, `2. Check that ${CRITERION}.`], steps: [GOTO, MISSING('Nope-one'), { action: 'judge', kind: 'visual', criterion: CRITERION }] },
    // Control: a failure on the last step is recorded exactly as before.
    { title: 'Failure on the last step', manual: SEE, steps: [GOTO, HOLDS, MISSING('Nope-one')] },
    // Control: nothing fails, nothing stops.
    { title: 'Nothing fails', manual: SEE, steps: [GOTO, HOLDS, HOLDS] },
  ];
  const fx = project(defs);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.equal(r.results.cases.length, defs.length);
  const [three, clickAfter, assertThenClick, fillGoto, laterHuman, judgeAfter, lastFails, allPass] = r.results.cases;
  const label = (/** @type {string} */ name, /** @type {any} */ c) => `${name}: ${brief(c)}`;

  // AC-6: B and C still run; each ended step is recorded on its own result; the first failure is the case's reason.
  assert.deepEqual([three.outcome, three.reason_code], ['fail', null], label('three', three));
  assert.deepEqual(stepResults(three), ['passed', 'failed', 'passed', 'failed'], label('three', three));
  assert.match(three.reason, /^step 2: /, 'the case reason is the first failure');
  assert.ok(!three.reason.includes('step 4'), 'a later failed assertion does not replace the case reason');
  assert.ok(three.steps.every((/** @type {any} */ s) => s.reason !== R.STEP_NOT_RUN_AFTER_FAILURE_REASON), 'a step that ran carries no stop sentence');

  // AC-7: the click and the assertion after it are not run, with the one fixed sentence and no code.
  assert.deepEqual([clickAfter.outcome, clickAfter.reason_code], ['fail', null], label('click after', clickAfter));
  assert.deepEqual(stepResults(clickAfter), ['passed', 'failed', 'not-run', 'not-run'], label('click after', clickAfter));
  assert.match(clickAfter.reason, /^step 2: /);
  for (const j of [2, 3]) {
    assert.equal(clickAfter.steps[j].reason, R.STEP_NOT_RUN_AFTER_FAILURE_REASON, `step ${j + 1}`);
    assert.equal(clickAfter.steps[j].reason_code, null, `step ${j + 1}`);
    assert.equal(clickAfter.steps[j].evidence, null, `step ${j + 1}`);
  }

  // AC-6 then AC-7: the assertion after the failure ran, the click after that did not, and neither did the step behind it.
  assert.deepEqual(stepResults(assertThenClick), ['passed', 'failed', 'passed', 'not-run', 'not-run'], label('assert then click', assertThenClick));
  assert.equal(assertThenClick.outcome, 'fail');
  assert.match(assertThenClick.reason, /^step 2: /);
  for (const j of [3, 4]) assert.equal(assertThenClick.steps[j].reason, R.STEP_NOT_RUN_AFTER_FAILURE_REASON, `step ${j + 1}`);

  // AC-7: a fill and a goto are interactions as well.
  assert.deepEqual(stepResults(fillGoto), ['passed', 'failed', 'not-run', 'not-run', 'not-run'], label('fill and goto', fillGoto));
  assert.equal(fillGoto.outcome, 'fail');
  for (const j of [2, 3, 4]) assert.equal(fillGoto.steps[j].reason, R.STEP_NOT_RUN_AFTER_FAILURE_REASON, `step ${j + 1}`);

  // AC-6: a later needs-human result is recorded on its own step, ends the loop, and the case stays the first failure.
  assert.equal(laterHuman.outcome, 'fail', label('later needs-human', laterHuman));
  assert.equal(laterHuman.reason_code, null, 'the later needs-human code did not replace the first failure');
  assert.match(laterHuman.reason, /^step 2: /);
  assert.deepEqual(stepResults(laterHuman), ['passed', 'failed', 'failed', 'not-run'], label('later needs-human', laterHuman));

  // AC-6: a judge after a failure captures, is recorded not-judged, leaves the case final, and is not counted as judged.
  assert.equal(judgeAfter.outcome, 'fail', label('judge after', judgeAfter));
  assert.match(judgeAfter.reason, /^step 2: /);
  assert.deepEqual(stepResults(judgeAfter), ['passed', 'failed', 'not-judged'], label('judge after', judgeAfter));
  assert.equal(judgeAfter.steps[2].kind, 'visual');
  assert.equal(typeof judgeAfter.steps[2].evidence, 'string', 'the capture a person would look at is kept');
  assert.ok(existsSync(join(fx.root, ...judgeAfter.steps[2].evidence.split('/'))), 'the capture file is on disk');
  assert.equal('pending_judgment' in judgeAfter, false);
  assert.deepEqual(R.summarizeJudgment([judgeAfter]), { pending_steps: 0, judged_steps: 0 });

  // Controls: a failure on the last step and a case that passes are unchanged.
  assert.deepEqual([lastFails.outcome, stepResults(lastFails)], ['fail', ['passed', 'passed', 'failed']]);
  assert.match(lastFails.reason, /^step 3: /);
  assert.deepEqual([allPass.outcome, stepResults(allPass)], ['pass', ['passed', 'passed', 'passed']]);

  // The page was never touched after a failure: no click, no typing, no second page.
  await new Promise((done) => setTimeout(done, 300));
  assert.equal(hits['/act/salvar'], undefined, 'the click right after a failure reached the page');
  assert.equal(hits['/act/excluir'], undefined, 'the click after a continued assertion reached the page');
  assert.equal(hits['/act/digitou'], undefined, 'the fill after a failure typed into the page');
  assert.equal(hits['/second'], undefined, 'the goto after a failure loaded its page');

  // The results stay a valid document with several failed steps in a case, and carry no step data in a stop sentence.
  assert.deepEqual(validateResults(r.results), []);
  assert.deepEqual(r.results.counts, { pass: 1, fail: 7, blocked: 0, 'needs-human': 0 });
  for (const c of r.results.cases) {
    for (const s of c.steps) {
      if (s.reason === R.STEP_NOT_RUN_AFTER_FAILURE_REASON) assert.equal(s.result, 'not-run');
    }
  }
});
