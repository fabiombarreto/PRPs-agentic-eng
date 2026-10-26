// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-4 Closed failure cause (a blocked click or fill is STEP_NOT_PERFORMABLE with a cause of covered, disabled, not_editable, absent or detached, other for anything else; the reason names the cause from a fixed list; no Playwright error text or page text reaches results.json)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-5 A report-named element the product lacks is a fail (an expect_* step on a report-word locator that matches nothing after the wait is failed with cause absent and the case ends fail with evidence; more than one match still ends needs-human STEP_UNGROUNDED)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-14 Catalogue covers run-time codes (STEP_NOT_PERFORMABLE carries the class gap and the closed cause list; PLAN_ENTRY_INVALID is documented as a plan defect, not a decline)
/**
 * Phase 2 (failure causes) of qa-runner-vocabulary-v4.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-2-failure-causes.plan.md
 *              (AC-A1 closed cause, AC-A2 absent report-named element, AC-A3 run-time catalogue)
 *
 * Layers, all over the REAL runner module and the REAL runner as a child process (never edited):
 *   1. The pure pieces: causeOf (first match wins, an unknown fact is `other`), the fixed sentences, notPerformable,
 *      attachStepCause, and the run-time catalogue (AC-14), with the in-page hit-test run against a fake document.
 *   2. probeActionFailure and isCoveredAtActionPoint on a REAL page in Chromium: one fixture per cause, the
 *      negative fixtures that must stay `other` (a pointer-events:none layer, a descendant hit, a hidden element,
 *      several matches, a fill on a covered input), the probe never performing the action, and a probe that never
 *      throws or leaks when the page is gone.
 *   3. The real `run` mode as child processes over a loopback page: a covered, a disabled, a non-editable, an
 *      absent (selector and snapshot-grounded) action is blocked STEP_NOT_PERFORMABLE with its cause on the case and
 *      on the failed step, a fixed reason naming the cause, and no Playwright error text or page text in results.json;
 *      and a report-word expect_* on a missing element is a fail with cause absent while two matches stay
 *      needs-human STEP_UNGROUNDED.
 *
 * One Chromium is launched lazily for the probe fixtures and closed in an after hook; one loopback server.
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
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261023T121212121Z`;
const PAGE_TIMEOUT = { timeout: 120000 };
const SLOW = { timeout: 290000 };

const CAUSES = ['covered', 'disabled', 'not_editable', 'absent', 'detached', 'other'];
const CANARY = 'canary-cover-text-q81';
const FILL_VALUE = 'zq-fill-value-77';

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v4-causes-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

// ---------------------------------------------------------------------------
// 1. The pure pieces (AC-4, AC-14)
// ---------------------------------------------------------------------------

test('AC-4 the cause list is the closed, frozen list of six words, in order', () => {
  assert.deepEqual([...R.STEP_FAILURE_CAUSES], CAUSES);
  assert.ok(Object.isFrozen(R.STEP_FAILURE_CAUSES));
});

test('AC-4 causeOf names the cause from the facts, first match wins, and an unknown fact is other', () => {
  const c = R.causeOf;
  assert.equal(c({ action: 'click', count: 0, attached: false }), 'absent');
  assert.equal(c({ action: 'click', count: 0, attached: true }), 'detached', 'located before the action and gone now');
  assert.equal(c({ action: 'click', count: 2, attached: true }), 'other');
  assert.equal(c({ action: 'click', count: 1, attached: true, enabled: false, covered: true }), 'disabled', 'disabled outranks covered');
  assert.equal(c({ action: 'fill', count: 1, attached: true, enabled: false, editable: false }), 'disabled', 'disabled outranks not editable');
  assert.equal(c({ action: 'fill', count: 1, attached: true, enabled: true, editable: false }), 'not_editable');
  assert.equal(c({ action: 'click', count: 1, attached: true, enabled: true, covered: true }), 'covered');
  assert.equal(c({ action: 'fill', count: 1, attached: true, enabled: true, editable: true, covered: true }), 'other', 'a covered fact never classifies a fill');
  assert.equal(c({ action: 'click', count: 1, attached: true, enabled: true, editable: false, covered: false }), 'other', 'a click is never not_editable');
  assert.equal(c({ action: 'click', count: 1, attached: true, enabled: null, covered: null }), 'other');
  assert.equal(c({}), 'other');
});

test('AC-4 the reason sentence of each cause is a distinct fixed sentence of letters and spaces, and nothing from a caller string reaches it', () => {
  const sentences = new Set();
  for (const cause of CAUSES) {
    for (const action of ['click', 'fill']) {
      const s = R.actionFailureReason(3, action, cause);
      assert.match(s, new RegExp(`^step 3: the ${action} target could not be acted on: [a-z ]+$`), s);
      sentences.add(s);
    }
  }
  assert.equal(sentences.size, 12, 'each cause says something different for each action');
  // An action or a cause outside the closed set cannot choose the words.
  assert.equal(R.actionFailureReason(3, 'SECRET value', 'bogus'), R.actionFailureReason(3, 'step', 'other'));
  assert.ok(!R.actionFailureReason(3, `${CANARY} <b>`, `${CANARY} cause`).includes(CANARY));
  // The absent-element sentence of AC-5 names a position and nothing else.
  assert.equal(R.absentElementReason(4), 'step 4: the element the report names was not found on the page after the wait');
});

test('AC-4 notPerformable is the blocked STEP_NOT_PERFORMABLE verdict and carries a cause only from the closed list', () => {
  assert.deepEqual(R.notPerformable('step 2: fixed', 'absent'), { outcome: 'blocked', reason_code: 'STEP_NOT_PERFORMABLE', reason: 'step 2: fixed', evidence: [], cause: 'absent' });
  assert.equal(R.notPerformable('step 2: fixed').cause, 'other');
  assert.equal(R.notPerformable('step 2: fixed', 'SECRET').cause, 'other');
  for (const cause of CAUSES) assert.equal(R.notPerformable('step 2: fixed', cause).cause, cause);
});

test('AC-4 attachStepCause puts the cause on exactly the failed step record, without touching the input, and ignores an out-of-list cause or an index outside the records', () => {
  const recs = [1, 2, 3].map((i) => ({ index: i, action: 'click', result: 'passed', evidence: null }));
  const out = R.attachStepCause(recs, 1, 'covered');
  assert.equal(out[1].cause, 'covered');
  assert.equal(out[0].cause, undefined);
  assert.equal(out[2].cause, undefined);
  assert.equal(recs[1].cause, undefined, 'the input was mutated');
  assert.deepEqual({ ...out[1], cause: undefined }, { ...recs[1], cause: undefined }, 'the rest of the record is kept');
  assert.equal(R.attachStepCause(recs, 1, 'SECRET'), recs);
  assert.equal(R.attachStepCause(recs, -1, 'covered'), recs);
  assert.equal(R.attachStepCause(recs, 9, 'covered'), recs);
});

test('AC-4 the hit-test reads a covering element, an unobstructed one, a descendant hit, an unknown hit and a box with no size', () => {
  const el = { scrollIntoView() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }), contains: (/** @type {any} */ x) => x === el };
  const had = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    globalThis.document = /** @type {any} */ ({ elementFromPoint: () => ({}) });
    assert.equal(R.isCoveredAtActionPoint(el), true);
    globalThis.document = /** @type {any} */ ({ elementFromPoint: () => el });
    assert.equal(R.isCoveredAtActionPoint(el), false);
    const child = {};
    const parent = { ...el, contains: (/** @type {any} */ x) => x === child };
    globalThis.document = /** @type {any} */ ({ elementFromPoint: () => child });
    assert.equal(R.isCoveredAtActionPoint(parent), false, 'a hit on a descendant is not a cover');
    globalThis.document = /** @type {any} */ ({ elementFromPoint: () => null });
    assert.equal(R.isCoveredAtActionPoint(el), null);
    globalThis.document = /** @type {any} */ ({ elementFromPoint: () => ({}) });
    const flat = { ...el, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
    assert.equal(R.isCoveredAtActionPoint(flat), null, 'a box with no size is unknown, not covered');
  } finally {
    if (had) Object.defineProperty(globalThis, 'document', had);
    else delete (/** @type {any} */ (globalThis).document);
  }
});

test('AC-14 the run-time catalogue gives STEP_NOT_PERFORMABLE the class gap with the closed cause list, and documents PLAN_ENTRY_INVALID as a plan defect and not a decline', () => {
  const cat = R.RUNTIME_REASON_CATALOGUE;
  assert.ok(Object.isFrozen(cat));
  assert.equal(cat.STEP_NOT_PERFORMABLE.class, 'gap');
  assert.equal(cat.STEP_NOT_PERFORMABLE.disposition, 'blocked');
  assert.deepEqual([...cat.STEP_NOT_PERFORMABLE.causes], CAUSES);
  assert.equal(typeof cat.STEP_NOT_PERFORMABLE.reason, 'string');
  assert.equal(cat.PLAN_ENTRY_INVALID.class, 'plan-defect');
  assert.equal(cat.PLAN_ENTRY_INVALID.decline, false);
  assert.equal(cat.PLAN_ENTRY_INVALID.disposition, 'needs-human');
  assert.equal(R.runtimeReasonClassOf('STEP_NOT_PERFORMABLE'), 'gap');
  assert.equal(R.runtimeReasonClassOf('PLAN_ENTRY_INVALID'), 'plan-defect');
  assert.equal(R.runtimeReasonClassOf('NOT_A_CODE'), null);
  assert.equal(R.runtimeReasonClassOf('toString'), null, 'only an own key of the catalogue has a class');
  assert.equal(R.runtimeReasonClassOf(undefined), null);
});

test('AC-14 the plan-facing REASON_CATALOGUE gains neither run-time code, and the reason classes stay impossible and gap', () => {
  for (const code of ['STEP_NOT_PERFORMABLE', 'PLAN_ENTRY_INVALID']) {
    assert.equal(Object.hasOwn(R.REASON_CATALOGUE, code), false, `${code} must stay outside the plan-facing catalogue`);
    assert.equal(R.reasonClassOf(code), null, code);
  }
  assert.deepEqual([...R.REASON_CLASSES], ['impossible', 'gap']);
});

// ---------------------------------------------------------------------------
// 2. probeActionFailure on a real page (AC-4)
// ---------------------------------------------------------------------------

/** @type {Promise<any> | null} */
let browserPromise = null;
/** @returns {Promise<any>} */
function getBrowser() {
  browserPromise ??= import('playwright').then((pw) => pw.chromium.launch({ headless: true }));
  return browserPromise;
}
after(async () => {
  if (browserPromise === null) return;
  try {
    await (await browserPromise).close();
  } catch {
    // The launch itself failed (the tests that needed it already failed) or the browser is gone.
  }
});

const PROBE_PAGE =
  '<!doctype html><html><body style="margin:0;min-height:3600px">' +
  '<button id="cov" style="position:absolute;left:10px;top:10px;width:120px;height:40px">Covered</button>' +
  `<div style="position:absolute;left:0;top:0;width:300px;height:200px;background:#fff">${CANARY}</div>` +
  '<button id="dis" disabled style="position:absolute;left:10px;top:300px">Dis</button>' +
  '<input id="ro" readonly style="position:absolute;left:10px;top:350px">' +
  '<button id="ok" style="position:absolute;left:10px;top:400px">Fine</button>' +
  '<button id="kid" style="position:absolute;left:10px;top:450px;width:120px;height:40px"><span style="display:block;width:100%;height:100%">Kid</span></button>' +
  '<button id="ghost" style="position:absolute;left:10px;top:500px;width:120px;height:40px">Ghost</button>' +
  '<div style="position:absolute;left:0;top:490px;width:300px;height:60px;pointer-events:none">layer</div>' +
  '<button id="gone" style="display:none">Gone</button>' +
  '<button class="twin" style="position:absolute;left:10px;top:560px">Twin</button><button class="twin" style="position:absolute;left:100px;top:560px">Twin</button>' +
  '<button id="far" style="position:absolute;left:10px;top:3000px;width:120px;height:40px">Far</button>' +
  '<div style="position:absolute;left:0;top:2990px;width:300px;height:60px;background:#fff">far cover</div>' +
  '<input id="covin" style="position:absolute;left:10px;top:620px;width:120px;height:30px">' +
  '<div style="position:absolute;left:0;top:610px;width:300px;height:50px;background:#fff">input cover</div>' +
  '<button id="count" style="position:absolute;left:10px;top:700px" onclick="window.__clicks=(window.__clicks||0)+1">Count</button>' +
  '<input id="typed" style="position:absolute;left:10px;top:750px" oninput="window.__typed=(window.__typed||0)+1">' +
  '</body></html>';

/**
 * Runs fn on a fresh page holding the probe fixture and closes the page afterwards.
 * @template T
 * @param {(page: any) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withProbePage(fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(PROBE_PAGE);
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

test('AC-4 probeActionFailure names covered, disabled, not_editable, absent and detached on a real page, and other for a target nothing is wrong with', PAGE_TIMEOUT, async () => {
  await withProbePage(async (page) => {
    assert.equal(await R.probeActionFailure(page.locator('#cov'), 'click', true), 'covered');
    assert.equal(await R.probeActionFailure(page.locator('#dis'), 'click', true), 'disabled');
    assert.equal(await R.probeActionFailure(page.locator('#ro'), 'fill', true), 'not_editable');
    assert.equal(await R.probeActionFailure(page.locator('#nope'), 'click', false), 'absent');
    assert.equal(await R.probeActionFailure(page.locator('#ok'), 'click', true), 'other');
    // Detached: the element was located before the action and is gone when the probe looks.
    await page.evaluate(() => document.getElementById('ok')?.remove());
    assert.equal(await R.probeActionFailure(page.locator('#ok'), 'click', true), 'detached');
    assert.equal(await R.probeActionFailure(page.locator('#ok'), 'click', false), 'absent', 'the same page, never located before: absent');
  });
});

test('AC-4 a disabled input is disabled before it is not editable, and a covered target far below the fold is still read as covered', PAGE_TIMEOUT, async () => {
  await withProbePage(async (page) => {
    await page.evaluate(() => {
      document.getElementById('ro')?.setAttribute('disabled', '');
    });
    assert.equal(await R.probeActionFailure(page.locator('#ro'), 'fill', true), 'disabled');
    assert.equal(await R.probeActionFailure(page.locator('#far'), 'click', true), 'covered', 'the hit-test scrolls the target into view first');
  });
});

test('AC-4 the probe claims covered only on a positive hit by a non-descendant: a pointer-events:none layer, a descendant, a hidden box, several matches and a fill on a covered input are other', PAGE_TIMEOUT, async () => {
  await withProbePage(async (page) => {
    assert.equal(await R.probeActionFailure(page.locator('#ghost'), 'click', true), 'other', 'a layer that takes no pointer events is not a cover');
    assert.equal(await R.probeActionFailure(page.locator('#kid'), 'click', true), 'other', 'the hit lands on a descendant of the target');
    assert.equal(await R.probeActionFailure(page.locator('#gone'), 'click', true), 'other', 'a box with no size cannot be hit-tested');
    assert.equal(await R.probeActionFailure(page.locator('.twin'), 'click', true), 'other', 'two matches name no element');
    assert.equal(await R.probeActionFailure(page.locator('#covin'), 'fill', true), 'other', 'a covered fact never classifies a fill');
  });
});

test('AC-4 the probe only reads: it never clicks or types, and a page that is gone still yields a word of the closed list instead of an error', PAGE_TIMEOUT, async () => {
  await withProbePage(async (page) => {
    assert.equal(await R.probeActionFailure(page.locator('#count'), 'click', true), 'other');
    assert.equal(await R.probeActionFailure(page.locator('#typed'), 'fill', true), 'other');
    assert.equal(await page.evaluate(() => /** @type {any} */ (window).__clicks ?? 0), 0, 'the probe clicked the target');
    assert.equal(await page.evaluate(() => /** @type {any} */ (window).__typed ?? 0), 0, 'the probe typed into the target');
    assert.equal(await page.locator('#typed').inputValue(), '');
  });
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(PROBE_PAGE);
  const lost = page.locator('#cov');
  await page.close();
  for (const attached of [true, false]) {
    for (const action of ['click', 'fill']) {
      const cause = await R.probeActionFailure(lost, action, attached);
      assert.ok(CAUSES.includes(cause), `${action}/${attached}: ${cause}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3. The real run mode over a loopback page (AC-4, AC-5)
// ---------------------------------------------------------------------------

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

const HEAD = '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body><h1>Painel</h1>';
/** The pages of the end-to-end runs, by pathname. */
const PAGES = {
  '/covered': `${HEAD}<button id="s" style="position:absolute;left:20px;top:120px;width:140px;height:40px">Salvar</button><div style="position:absolute;left:10px;top:110px;width:200px;height:60px;background:#eee;z-index:5">${CANARY}</div></body></html>`,
  '/disabled': `${HEAD}<button id="x" disabled>Excluir</button></body></html>`,
  '/readonly': `${HEAD}<label for="ap">Apelido</label><input id="ap" type="text" readonly value="fixo"></body></html>`,
  '/plain': `${HEAD}<button type="button">Salvar</button></body></html>`,
  '/twins': `${HEAD}<button type="button">Salvar</button><button type="button">Excluir</button><button type="button">Excluir</button></body></html>`,
};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    const html = /** @type {Record<string, string>} */ (PAGES)[path];
    if (html === undefined) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});
after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

const GOTO = (/** @type {string} */ path) => ({ action: 'goto', path });
const HEADING = { action: 'expect_visible', role: 'heading', name: 'Painel' };

/**
 * A project that is not a git work tree, with its report, its plan and an optional grounding snapshot of /plain.
 * @param {{ title: string, manual: string[], steps: any[] }[]} defs
 * @param {{ snapshot?: any[] }} [o]
 */
function project(defs, o = {}) {
  const root = realpathSync(mkdtempSync(join(SANDBOX, 'run-')));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  if (o.snapshot) {
    writeFileSync(join(runDir, 'grounding', 'anonymous--plain.snapshot.json'), JSON.stringify({ schema_version: 1, role: 'anonymous', route: '/plain', entries: o.snapshot, withheld: 0 }));
  }
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: 'none', steps: d.steps })) }));
  return { root, runDir };
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stderr: string, raw: string, results: any }>}
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
    // Below the test timeout, so a hang ends the child (and the sandbox cleanup can run) before the test is abandoned.
    const timer = setTimeout(() => child.kill(), 270000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      const raw = existsSync(file) ? readFileSync(file, 'utf8') : '';
      resolveP({ code, stderr, raw, results: raw === '' ? null : JSON.parse(raw) });
    });
  });
}

/** @param {any} c @returns {string[]} */
const stepResults = (c) => c.steps.map((/** @type {any} */ s) => s.result);
/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.cause ?? null, c.reason, stepResults(c)]);

/** What no results.json may carry: a thrown Playwright error, its call log, the page text or the fill value. */
const LEAKS = [CANARY, FILL_VALUE, 'Timeout', 'waiting for', 'Call log', 'intercepts pointer events', 'locator.click', 'locator.fill', 'Element is not', 'strict mode violation', 'TimeoutError'];

test('AC-4 end to end: a click or fill that cannot be performed is blocked STEP_NOT_PERFORMABLE with its cause on the case and on the failed step, a fixed reason naming that cause, and no error or page text in results.json', SLOW, async () => {
  const click = (/** @type {string} */ name) => ({ action: 'click', role: 'button', name });
  const defs = [
    { title: 'Covered click', manual: ['1. Open the page Painel.', '2. Click Salvar.'], steps: [GOTO('/covered'), HEADING, click('Salvar')] },
    { title: 'Disabled click', manual: ['1. Open the page Painel.', '2. Click Excluir.'], steps: [GOTO('/disabled'), HEADING, click('Excluir')] },
    { title: 'Read-only fill', manual: ['1. Open the page Painel.', '2. Type the nickname in Apelido.'], steps: [GOTO('/readonly'), HEADING, { action: 'fill', role: 'textbox', name: 'Apelido', value: FILL_VALUE }] },
    { title: 'Absent selector click', manual: ['1. Open the page Painel.', '2. Press the save control.'], steps: [GOTO('/plain'), HEADING, { action: 'click', selector: '#nao-existe' }] },
    { title: 'Snapshot-grounded click on a missing element', manual: ['1. Open the page Painel.', '2. Press the save control.'], steps: [GOTO('/plain'), HEADING, click('Ausente9')] },
  ];
  const fx = project(defs, { snapshot: [{ kind: 'role', role: 'heading', name: 'Painel', matches: 1 }, { kind: 'role', role: 'button', name: 'Ausente9', matches: 1 }] });
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.deepEqual(validateResults(r.results), []);
  assert.equal(r.results.cases.length, defs.length);

  /** @type {[string, string, string][]} [cause, action, expected reason] by case */
  const want = [
    ['covered', 'click', R.actionFailureReason(3, 'click', 'covered')],
    ['disabled', 'click', R.actionFailureReason(3, 'click', 'disabled')],
    ['not_editable', 'fill', R.actionFailureReason(3, 'fill', 'not_editable')],
    ['absent', 'click', R.actionFailureReason(3, 'click', 'absent')],
    ['absent', 'click', R.actionFailureReason(3, 'click', 'absent')],
  ];
  for (const [i, [cause, , reason]] of want.entries()) {
    const c = r.results.cases[i];
    const label = `case ${i + 1} (${defs[i].title}): ${brief(c)}`;
    assert.deepEqual([c.outcome, c.reason_code], ['blocked', 'STEP_NOT_PERFORMABLE'], label);
    assert.equal(c.cause, cause, label);
    assert.equal(c.reason, reason, label);
    assert.ok(CAUSES.includes(c.cause) && c.reason.includes(R.STEP_CAUSE_PHRASES[cause]), 'the reason names the cause from the fixed list');
    // The cause is recorded on the failed step, and on no other step.
    assert.deepEqual(stepResults(c).slice(0, 2), ['passed', 'passed'], label);
    assert.equal(c.steps[2].result, 'failed', label);
    assert.equal(c.steps[2].cause, cause, label);
    assert.equal(c.steps[0].cause, undefined, label);
    assert.equal(c.steps[1].cause, undefined, label);
  }
  // The covered click is told apart from the others only by the hit-test: the page text of the cover never reaches the file.
  assert.equal(r.results.counts.blocked, 5);
  for (const leak of LEAKS) assert.ok(!r.raw.includes(leak), `results.json carries ${JSON.stringify(leak)}`);
});

test('AC-5 end to end: a report-word expect_* on a missing element is a fail with cause absent and evidence, more than one match stays needs-human STEP_UNGROUNDED, and an element that exists still passes', SLOW, async () => {
  const defs = [
    { title: 'Missing element is visible', manual: ['1. Open the page Painel.', '2. See the Fantasma button.'], steps: [GOTO('/plain'), HEADING, { action: 'expect_visible', role: 'button', name: 'Fantasma' }] },
    { title: 'Missing element has text', manual: ['1. Open the page Painel.', '2. See the Fantasma button with Salvo.'], steps: [GOTO('/plain'), HEADING, { action: 'expect_text', role: 'button', name: 'Fantasma', contains: 'Salvo' }] },
    { title: 'Two matches', manual: ['1. Open the page Painel.', '2. See the Excluir button.'], steps: [GOTO('/twins'), HEADING, { action: 'expect_visible', role: 'button', name: 'Excluir' }] },
    { title: 'Present element', manual: ['1. Open the page Painel.', '2. See the Salvar button.'], steps: [GOTO('/plain'), HEADING, { action: 'expect_visible', role: 'button', name: 'Salvar' }] },
    { title: 'Report-word click on a missing element', manual: ['1. Open the page Painel.', '2. Click Inexistente.'], steps: [GOTO('/plain'), HEADING, { action: 'click', role: 'button', name: 'Inexistente' }] },
  ];
  const fx = project(defs);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.deepEqual(validateResults(r.results), []);
  const [visible, text, twins, present, click] = r.results.cases;

  for (const [c, what] of /** @type {[any, string][]} */ ([[visible, 'expect_visible'], [text, 'expect_text']])) {
    assert.deepEqual([c.outcome, c.reason_code], ['fail', null], `${what}: ${brief(c)}`);
    assert.equal(c.cause, 'absent', what);
    assert.equal(c.reason, R.absentElementReason(3), what);
    assert.deepEqual(stepResults(c), ['passed', 'passed', 'failed'], what);
    assert.equal(c.steps[2].cause, 'absent', what);
    assert.ok(Array.isArray(c.evidence) && c.evidence.length >= 1, `${what}: a fail carries evidence: ${JSON.stringify(c.evidence)}`);
    assert.ok(!/Fantasma|Salvo/.test(JSON.stringify([c.reason, c.steps])), `${what}: a record echoes a locator word or a literal`);
  }
  // More than one match is still a planning gap, with nothing acted on and no cause.
  assert.deepEqual([twins.outcome, twins.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(twins));
  assert.match(twins.reason, /^step 3: the locator matched 2 elements at run time/);
  assert.equal('cause' in twins, false);
  // The report-word click on nothing is not an assertion: it stays a planning gap.
  assert.deepEqual([click.outcome, click.reason_code], ['needs-human', 'STEP_UNGROUNDED'], brief(click));
  assert.match(click.reason, /^step 3: the locator matched no element at run time/);
  assert.equal('cause' in click, false);
  // The control: an element that exists passes and carries no cause anywhere.
  assert.deepEqual([present.outcome, present.reason_code], ['pass', null], brief(present));
  assert.equal('cause' in present, false);
  assert.ok(present.steps.every((/** @type {any} */ s) => s.cause === undefined));

  assert.deepEqual(r.results.counts, { pass: 1, fail: 2, blocked: 0, 'needs-human': 2 });
});
