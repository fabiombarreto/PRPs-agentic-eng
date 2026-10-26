// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-8 Role-only presence inside a scope (an expect_visible with within and a role but no name passes when the scope holds a visible element of the role; an opacity-0 element, an element outside the scope and an absent element fail; the same step without within is PLAN_ENTRY_INVALID)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-9 Closed pattern for an unstated value (pattern number passes when the visible text holds a run of digits and fails when it holds none; a pattern outside the closed list is PLAN_ENTRY_INVALID; pattern cannot be combined with contains)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-10 Scope anchored on visible text (within anchor_text resolves the nearest ancestor of the one visible anchor that holds the role and acts on the first; zero or several anchors end needs-human STEP_UNGROUNDED; the anchor word follows the same grounding rule as any other word)
/**
 * Phase 4 (assertion vocabulary) of qa-runner-vocabulary-v4.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-4-assertion-vocabulary.plan.md
 *              (AC-A1 role-only presence, AC-A2 role-only needs within, AC-A3 number pattern, AC-A4 anchor scope,
 *              AC-A5 the surrounding rules)
 *
 * Layers, over the REAL runner module and the REAL runner as a child process (never edited):
 *   1. The pure pieces: the closed pattern list, the scope and locator descriptors, the step schema, plan-time grounding.
 *   2. The real `run` mode over a loopback page that records what was done to it: role-only presence (one visible,
 *      opacity 0, outside the scope, absent, several candidates), the number pattern, and the anchored scope (nearest
 *      ancestor, first control only, zero / several / hidden / container-less anchors, an anchor word the report lacks).
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
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261025T101010101Z`;
const SLOW = { timeout: 290000 };

const NC = 'Não concluídas';
const ANCHOR = 'Escolha seu avatar';
const DIALOG = { role: 'dialog', name: 'Validar e-mail' };

/** @param {any} step */
const verdict = (step) => R.validateStep('browser', step);
/** @param {any} step */
const invalid = (step) => verdict(step)?.code;

// ---------------------------------------------------------------------------
// 1. The pure pieces (AC-8, AC-9, AC-10)
// ---------------------------------------------------------------------------

test('AC-9 the pattern list is closed to number and frozen, and a text matches number only when it holds a run of digits', () => {
  assert.deepEqual([...R.TEXT_PATTERN_NAMES], ['number']);
  assert.ok(Object.isFrozen(R.TEXT_PATTERN_NAMES));
  assert.equal(R.textMatchesPattern('number', `${NC} 12`), true);
  assert.equal(R.textMatchesPattern('number', '7'), true);
  assert.equal(R.textMatchesPattern('number', NC), false);
  assert.equal(R.textMatchesPattern('number', ''), false);
});

test('AC-9 textMatchesPattern is total: an unknown pattern name or a text that is not a string never matches and never throws', () => {
  assert.equal(R.textMatchesPattern('email', '12'), false);
  assert.equal(R.textMatchesPattern('', '12'), false);
  for (const name of [null, undefined, 7, {}, ['number']]) assert.equal(R.textMatchesPattern(name, '12'), false, JSON.stringify(name));
  for (const text of [null, undefined, 12, {}, ['12']]) assert.equal(R.textMatchesPattern('number', text), false, JSON.stringify(text));
});

test('AC-10 the anchored scope is opt-in and must stand alone as a non-empty string; the default scope refuses anchor_text', () => {
  assert.deepEqual(R.scopeOf({ anchor_text: ANCHOR }, { allowAnchor: true }), { ok: true, scope: { anchorText: ANCHOR } });
  assert.equal(R.scopeOf({ anchor_text: ANCHOR }).ok, false, 'a scope read without the opt-in (the judge step) must refuse anchor_text');
  for (const bad of [{ anchor_text: 'x', role: 'dialog' }, { anchor_text: 'x', name: 'y' }, { anchor_text: 'x', name_prefix: 'y' }, { anchor_text: '  ' }, { anchor_text: '' }, { anchor_text: 3 }]) {
    assert.equal(R.scopeOf(bad, { allowAnchor: true }).ok, false, JSON.stringify(bad));
  }
  assert.equal(R.scopeOf({ role: 'region', name: 'a', extra: 1 }, { allowAnchor: true }).ok, false);
  assert.equal(R.scopeOf({ role: 'dialog', name: 'Validar e-mail' }, { allowAnchor: true }).ok, true, 'the named scope keeps working with the opt-in');
});

test('AC-10 a judge step keeps the 0.47.0 within shape: anchor_text is not legal there', () => {
  assert.equal(invalid({ action: 'judge', kind: 'language', criterion: 'reads in Portuguese', within: { anchor_text: ANCHOR } }), 'PLAN_ENTRY_INVALID');
  assert.equal(verdict({ action: 'judge', kind: 'language', criterion: 'reads in Portuguese', within: { role: 'region', name: 'Resumo' } }), null);
});

test('AC-8 AC-10 locatorOf describes a role without a name inside a scope, an anchored index and the refused combinations', () => {
  const roleOnly = R.locatorOf({ within: DIALOG, role: 'alert' });
  assert.equal(roleOnly?.ok, true);
  assert.deepEqual(/** @type {any} */ (roleOnly).target, { kind: 'role-any', role: 'alert' });

  const anchored = R.locatorOf({ within: { anchor_text: ANCHOR }, role: 'button', index: 0 });
  assert.equal(anchored?.ok, true);
  assert.deepEqual(/** @type {any} */ (anchored).scope, { anchorText: ANCHOR });
  assert.deepEqual(/** @type {any} */ (anchored).target, { kind: 'nth', role: 'button', index: 0 });

  assert.equal(R.locatorOf({ within: { anchor_text: ANCHOR }, role: 'alert' })?.ok, false, 'role-only with an anchor is refused');
  assert.equal(R.locatorOf({ within: { anchor_text: ANCHOR }, text: 'x' })?.ok, false);
  assert.equal(R.locatorOf({ within: { anchor_text: ANCHOR }, label_text: 'x' })?.ok, false);
  assert.deepEqual(R.locatorOf({ role: 'button' }), { ok: false, why: 'role and name go together' }, 'role-only without within is still refused');
});

test('AC-8 AC-9 AC-10 the step shapes the vocabulary accepts are valid', () => {
  for (const ok of [
    { action: 'expect_visible', within: DIALOG, role: 'alert' },
    { action: 'expect_text', role: 'button', name_prefix: NC, pattern: 'number' },
    { action: 'expect_text', role: 'button', name: 'Total', pattern: 'number' },
    { action: 'expect_text', text: 'Total', pattern: 'number' },
    { action: 'click', within: { anchor_text: ANCHOR }, role: 'button', index: 0 },
    { action: 'expect_visible', within: { anchor_text: ANCHOR }, role: 'button', index: 0 },
    { action: 'expect_state', within: { anchor_text: ANCHOR }, role: 'checkbox', index: 0, state: 'checked', equals: true },
  ]) assert.equal(verdict(ok), null, JSON.stringify(ok));
});

test('AC-8 a role without a name is valid only for expect_visible inside a within scope', () => {
  assert.equal(invalid({ action: 'expect_visible', role: 'alert' }), 'PLAN_ENTRY_INVALID', 'no within');
  assert.equal(invalid({ action: 'expect_visible', role: 'alert', within: { anchor_text: ANCHOR } }), 'PLAN_ENTRY_INVALID', 'with an anchor the role-only step is circular');
  for (const step of [
    { action: 'click', within: DIALOG, role: 'button' },
    { action: 'fill', within: DIALOG, role: 'textbox', value: 'x' },
    { action: 'expect_not_visible', within: DIALOG, role: 'alert' },
    { action: 'expect_text', within: DIALOG, role: 'alert', contains: 'x' },
  ]) assert.equal(invalid(step), 'PLAN_ENTRY_INVALID', JSON.stringify(step));
});

test('AC-9 a pattern is refused unless it is on expect_text, from the closed list, alone, and with a locator', () => {
  const base = { action: 'expect_text', role: 'button', name: 'B' };
  assert.equal(verdict({ ...base, pattern: 'number' }), null);
  for (const step of [
    { ...base, pattern: 'email' },
    { ...base, pattern: '' },
    { ...base, pattern: 7 },
    { ...base, pattern: 'number', contains: '1' },
    { action: 'expect_visible', role: 'button', name: 'B', pattern: 'number' },
    { action: 'click', role: 'button', name: 'B', pattern: 'number' },
    { action: 'expect_text', selector: '#a', pattern: 'number' },
    { action: 'expect_text', pattern: 'number' },
    base,
  ]) assert.equal(invalid(step), 'PLAN_ENTRY_INVALID', JSON.stringify(step));
});

test('AC-10 anchor_text is refused on fill and expect_value, which mask the control before the step runs, and alongside a role scope', () => {
  for (const step of [
    { action: 'fill', within: { anchor_text: ANCHOR }, role: 'textbox', index: 0, value: 'x' },
    { action: 'expect_value', within: { anchor_text: ANCHOR }, role: 'textbox', index: 0, not_empty: true },
    { action: 'click', within: { anchor_text: ANCHOR, role: 'dialog' }, role: 'button', index: 0 },
    { action: 'click', within: { anchor_text: '' }, role: 'button', index: 0 },
    { action: 'click', within: { anchor_text: ANCHOR }, text: 'x' },
  ]) assert.equal(invalid(step), 'PLAN_ENTRY_INVALID', JSON.stringify(step));
});

test('AC-8 AC-9 AC-10 the vocabulary that existed before is unchanged', () => {
  assert.deepEqual([...R.SCOPED_LOCATOR_KEYS], ['within', 'name_prefix', 'label_text', 'index']);
  assert.equal(verdict({ action: 'expect_visible', role: 'button', name: 'Salvar' }), null);
  assert.equal(verdict({ action: 'expect_text', role: 'button', name: 'Salvar', contains: 'x' }), null);
  assert.equal(verdict({ action: 'click', within: DIALOG, role: 'button', name_prefix: 'Sal' }), null);
  assert.equal(invalid({ action: 'expect_text', role: 'button', name: 'Salvar' }), 'PLAN_ENTRY_INVALID', 'expect_text still needs contains or a pattern');
});

test('AC-8 AC-9 the new assertions continue after a failure and an anchored click does not', () => {
  assert.equal(R.continuesAfterFailure({ action: 'expect_visible', within: DIALOG, role: 'alert' }), true);
  assert.equal(R.continuesAfterFailure({ action: 'expect_text', role: 'button', name: 'B', pattern: 'number' }), true);
  assert.equal(R.continuesAfterFailure({ action: 'click', within: { anchor_text: ANCHOR }, role: 'button', index: 0 }), false);
});

const GOTO = { action: 'goto', path: '/' };
const ANCHOR_STEP = { action: 'click', within: { anchor_text: ANCHOR }, role: 'button', index: 0 };

test('AC-10 the anchor word is grounded by the report words or a snapshot entry with matches 1, else the step is a gap', () => {
  const onPage = R.groundLocators([GOTO, ANCHOR_STEP], [], `Open the page and see ${ANCHOR}`, null);
  assert.deepEqual(onPage.gaps, [], 'a report word grounds the anchor');
  assert.deepEqual(onPage.runtime, [1], 'a scoped step is resolved when the case runs');

  const offPage = R.groundLocators([GOTO, ANCHOR_STEP], [], 'Open the page and see nothing relevant', null);
  assert.deepEqual(offPage.gaps, [{ at: 1, kind: 'interaction' }]);
  assert.equal(offPage.truncateAt, 1);

  const once = [{ role: 'anonymous', route: '/', entries: [{ kind: 'text', text: ANCHOR, matches: 1 }] }];
  assert.deepEqual(R.groundLocators([GOTO, ANCHOR_STEP], once, 'nothing', null).gaps, [], 'a snapshot entry with matches 1 grounds the anchor');
  const twice = [{ role: 'anonymous', route: '/', entries: [{ kind: 'text', text: ANCHOR, matches: 2 }] }];
  assert.equal(R.groundLocators([GOTO, ANCHOR_STEP], twice, 'nothing', null).gaps.length, 1, 'matches 2 does not ground the anchor');
});

test('AC-8 an ungrounded scope word of a role-only presence is an assertion gap, a grounded one is resolved at run time', () => {
  const step = { action: 'expect_visible', within: DIALOG, role: 'alert' };
  const grounded = R.groundLocators([GOTO, step], [], 'see the Validar e-mail dialog', null);
  assert.deepEqual(grounded.gaps, []);
  assert.deepEqual(grounded.runtime, [1]);
  assert.deepEqual(R.groundLocators([GOTO, step], [], 'nothing relevant', null).gaps, [{ at: 1, kind: 'assertion' }]);
});

test('AC-9 a pattern step needs no literal in the report, its name_prefix word is still grounded, and a contains literal is still required', () => {
  const pattern = { action: 'expect_text', role: 'button', name_prefix: NC, pattern: 'number' };
  assert.deepEqual(R.groundLocators([GOTO, pattern], [], `the ${NC} button shows a count`, null).gaps, []);
  assert.equal(R.groundLocators([GOTO, pattern], [], 'nothing relevant', null).gaps.length, 1);
  const contains = { action: 'expect_text', role: 'button', name_prefix: NC, contains: '99' };
  assert.equal(R.groundLocators([GOTO, contains], [], `the ${NC} button`, null).gaps.length, 1);
});

// ---------------------------------------------------------------------------
// 2. The real runner against a loopback page that records what was done to it
// ---------------------------------------------------------------------------

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v4p4-vocab-'));
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
/** @param {string} body */
const page = (body) => `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body><h1>Panel</h1>${body}</body></html>`;
/** @param {string} inner */
const dlg = (inner) => `<div role="dialog" aria-label="Validar e-mail">${inner}</div>`;
/** An unnamed button that asks the server for a path when clicked. @param {string} p */
const btn = (p) => `<button type="button" style="width:24px;height:24px" onclick="fetch('${p}')"></button>`;
/** @type {Record<string, string>} */
const PAGES = {
  '/ro-ok': page(dlg('<div role="alert">Erro</div>')),
  '/ro-hidden': page(dlg('<div role="alert" style="opacity:0">Erro</div>')),
  '/ro-outside': page(dlg('<p>vazio</p>') + '<div role="alert">Erro fora</div>'),
  '/ro-none': page(dlg('<p>vazio</p>')),
  '/ro-several': page(dlg('<div role="alert" style="opacity:0">Escondido</div><div role="alert">Um</div><div role="alert">Dois</div>')),
  '/pat-ok': page(`<button type="button">${NC} 3</button>`),
  '/pat-none': page(`<button type="button">${NC}</button>`),
  '/anchor': page(`<div><p>${ANCHOR}</p><div>${btn('/picked0')}${btn('/picked1')}</div></div>`),
  // The anchor's own parent holds no button; the section above it does. A decoy section elsewhere holds buttons too.
  '/anchor-nested': page(`<section><div><p>${ANCHOR}</p></div><div>${btn('/nested0')}${btn('/nested1')}</div></section><section><p>Outra secao</p>${btn('/decoy0')}</section>`),
  '/anchor-two': page(`<div><p>${ANCHOR}</p>${btn('/picked0')}</div><div><p>${ANCHOR}</p>${btn('/picked1')}</div>`),
  '/anchor-none': page('<p>outra coisa</p>'),
  '/anchor-hidden': page(`<div><p style="display:none">${ANCHOR}</p>${btn('/picked0')}</div>`),
  '/anchor-nobutton': page(`<div><p>${ANCHOR}</p><span>sem controles</span></div>`),
};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    if (/^\/(picked|nested|decoy)\d$/.test(path)) {
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGES[path] ?? page(''));
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

/** The report words every case needs so each locator word is grounded by the case's manual steps. */
const SEE = [`1. Open the page and see Panel, Validar e-mail, ${ANCHOR} and ${NC}`];
const SEE_HEADING = { action: 'expect_visible', role: 'heading', name: 'Panel' };
const ROLE_ONLY = { action: 'expect_visible', within: DIALOG, role: 'alert' };
const PATTERN = { action: 'expect_text', role: 'button', name_prefix: NC, pattern: 'number' };
/** @param {string} path */
const at = (path) => ({ action: 'goto', path });

test('AC-8 AC-9 AC-10 end to end: role-only presence, the number pattern and the anchored scope on a real page', SLOW, async () => {
  for (const k of Object.keys(hits)) delete hits[k];
  /** @type {{ title: string, manual: string[], steps: any[] }[]} */
  const defs = [
    /* 1 */ { title: 'Role-only, one visible alert', manual: SEE, steps: [at('/ro-ok'), ROLE_ONLY] },
    /* 2 */ { title: 'Role-only, alert at opacity 0', manual: SEE, steps: [at('/ro-hidden'), ROLE_ONLY] },
    /* 3 */ { title: 'Role-only, alert outside the scope', manual: SEE, steps: [at('/ro-outside'), ROLE_ONLY] },
    /* 4 */ { title: 'Role-only, no alert at all', manual: SEE, steps: [at('/ro-none'), ROLE_ONLY] },
    /* 5 */ { title: 'Role-only, several candidates one hidden', manual: SEE, steps: [at('/ro-several'), ROLE_ONLY] },
    /* 6 */ { title: 'Pattern number, digits present', manual: SEE, steps: [at('/pat-ok'), PATTERN] },
    /* 7 */ { title: 'Pattern number, no digits', manual: SEE, steps: [at('/pat-none'), PATTERN] },
    /* 8 */ { title: 'Anchor, first unnamed button', manual: SEE, steps: [at('/anchor'), ANCHOR_STEP, SEE_HEADING] },
    /* 9 */ { title: 'Anchor, nearest ancestor holding the role', manual: SEE, steps: [at('/anchor-nested'), ANCHOR_STEP, SEE_HEADING] },
    /* 10 */ { title: 'Anchor matches two elements', manual: SEE, steps: [at('/anchor-two'), ANCHOR_STEP, SEE_HEADING] },
    /* 11 */ { title: 'Anchor matches nothing', manual: SEE, steps: [at('/anchor-none'), ANCHOR_STEP, SEE_HEADING] },
    /* 12 */ { title: 'Anchor is hidden', manual: SEE, steps: [at('/anchor-hidden'), ANCHOR_STEP, SEE_HEADING] },
    /* 13 */ { title: 'Anchor with no container holding the role', manual: SEE, steps: [at('/anchor-nobutton'), ANCHOR_STEP, SEE_HEADING] },
    /* 14 */ { title: 'Anchor word the report never states', manual: ['1. Open the page and see Panel'], steps: [at('/anchor'), ANCHOR_STEP, SEE_HEADING] },
  ];
  const fx = project(defs);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const c = r.results.cases;
  assert.equal(c.length, defs.length);
  if (c[0].reason_code === 'FAILED_BROWSER_UNAVAILABLE') {
    // Not an assertion about the vocabulary: the host cannot launch Chromium.
    console.log('SKIP-BROWSER-UNAVAILABLE: the runner could not launch Chromium here');
    return;
  }
  const label = (/** @type {number} */ i) => `case ${i + 1}: ${brief(c[i])}`;

  // AC-8: role-only presence. One visible alert passes; several candidates are the normal case.
  assert.equal(c[0].outcome, 'pass', label(0));
  assert.deepEqual(stepResults(c[0]), ['passed', 'passed']);
  for (const i of [1, 2, 3]) {
    assert.equal(c[i].outcome, 'fail', label(i));
    assert.equal(c[i].reason_code, null, label(i));
    assert.equal(c[i].steps[1].result, 'failed', label(i));
  }
  assert.equal(c[3].steps[1].cause, 'absent', 'a role-only presence that finds nothing is a fail with cause absent, never a gap');
  assert.notEqual(c[1].steps[1].cause, 'absent', 'a present but hidden alert is a fail without the absent cause');
  assert.equal(c[4].outcome, 'pass', label(4));

  // AC-9: the number pattern, and no page text in the record of the failing case.
  assert.equal(c[5].outcome, 'pass', label(5));
  assert.equal(c[6].outcome, 'fail', label(6));
  assert.equal(c[6].steps[1].result, 'failed');
  assert.ok(!JSON.stringify(c[6]).includes(NC), 'no page text in the case record');

  // AC-10: the first unnamed button of the anchored container is the only one acted on.
  assert.equal(c[7].outcome, 'pass', label(7));
  assert.deepEqual(stepResults(c[7]), ['passed', 'passed', 'passed']);
  assert.equal(c[8].outcome, 'pass', label(8));

  // AC-10: zero, several, hidden and container-less anchors, and an anchor the report lacks, are needs-human STEP_UNGROUNDED.
  for (const i of [9, 10, 11, 12, 13]) {
    assert.equal(c[i].outcome, 'needs-human', label(i));
    assert.equal(c[i].reason_code, 'STEP_UNGROUNDED', label(i));
    assert.ok(!c[i].reason.includes('Escolha'), `case ${i + 1}: the anchor text is not in the reason`);
    for (const s of c[i].steps) assert.ok(!String(s.reason ?? '').includes('Escolha'), `case ${i + 1}: the anchor text is not in a step reason`);
  }
  // The anchored click is where it stopped: nothing after it ran.
  for (const i of [9, 10, 11, 12]) assert.notEqual(c[i].steps[1].result, 'passed', label(i));

  // The page proves which control was acted on: never the second button, never the decoy, never in a refused case.
  await new Promise((done) => setTimeout(done, 300));
  assert.equal(hits['/picked0'], 1, 'the first button of the anchored container was clicked once, and by no refused case');
  assert.equal(hits['/picked1'], undefined, 'the second button was never acted on');
  assert.equal(hits['/nested0'], 1, 'the first button of the nearest ancestor holding the role was clicked');
  assert.equal(hits['/nested1'], undefined);
  assert.equal(hits['/decoy0'], undefined, 'the control of another container was never acted on');

  assert.deepEqual(validateResults(r.results), []);
});
