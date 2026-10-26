// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-6 A locator step is grounded by a snapshot entry that matches once or by the report's own words (a locator that is neither is PLAN_ENTRY_INVALID; a report-word step is resolved when the case runs)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-7 within: a locator scoped to one group, and name_prefix: an accessible name matched by its start
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-8 label_text: an input found from the text of its label
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-9 index: the Nth control of a role inside a within scope
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-10 expect_requests takes a method or an array of distinct methods
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-22 The command doc, the knowledge base and the site state the sources, the four keys (a marked example each) and the method array
/**
 * Phase 3 (run-time and scoped locators) of qa-runner-ai-executable-steps, the part that needs no browser.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-3-run-time-and-scoped-locators.plan.md
 *              (AC-A1 the two grounding sources, AC-A2 .. AC-A4 the four keys, AC-A5 the method array,
 *              AC-A6 the documents)
 *
 * Layers, all over the REAL runner module, command doc, knowledge base and site pages (read from disk, never edited):
 *   1. groundLocators / precheckGroundedSteps: a snapshot entry that matches once grounds a step and leaves it out
 *      of `runtime`; the report's words ground it and put its index in `runtime`; the report is compared whitespace-
 *      and case-insensitively; an empty, blank or non-string report grounds nothing; a locator with neither source
 *      is PLAN_ENTRY_INVALID with the three sentences it always had; scoped steps need each word they carry
 *      grounded the same way, `index` carries none; the wrapper is the `refusal` of the new function.
 *   2. The vocabulary: locatorOf, scopeOf, isControlLocator, validateStep and validateSteps for every valid and
 *      refused combination of the four keys, the label_text refusals, hostile values that never throw,
 *      groundingStepKey null for a scoped step and unchanged for a plain one.
 *   3. expect_requests method arrays: the accepted forms, the refusals, and evaluateRequestWindow counting any member.
 *   4. The documents: one marked, valid example per key in the command doc, the two sources and the method array
 *      stated, and the knowledge base and site pages naming the keys. Tokens only, no sentence is pinned, nothing
 *      depends on the plugin version or on an `Unreleased` heading.
 *
 * The run-time half (a real Chromium and the real runner) is in qa-run-scoped-locators-browser.test.mjs.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { inspect } from 'node:util';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} text */
const collapse = (text) => text.replace(/\s+/g, ' ');
/** @param {string} html @returns {string} */
const htmlText = (html) => collapse(html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&rsquo;/g, "'")).trim();
/** @param {string} t */
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');

const CANARY = 'canary-zq91-value';
const GOTO = { action: 'goto', path: '/p' };
const B = { role: 'region', name: 'Grupo B' };

/** @param {string} route @param {any[]} entries @param {any} [extra] */
const snap = (route, entries, extra = {}) => ({ schema_version: 1, role: 'anonymous', route, entries, withheld: 0, ...extra });
const role = (/** @type {string} */ r, /** @type {string} */ name, matches = 1) => ({ kind: 'role', role: r, name, matches });
const text = (/** @type {string} */ t, matches = 1) => ({ kind: 'text', text: t, matches });
const SNAP = snap('/p', [
  role('button', 'Salvar'),
  role('button', 'Gemeo', 2),
  role('region', 'Grupo B'),
  role('textbox', 'Filtro'),
  text('Mensagem visivel'),
  text('E-mail*'),
  text('Repetido', 2),
]);

/** @param {any[]} steps @param {any} manual @param {any[]} [snapshots] */
const ground = (steps, manual, snapshots = [SNAP]) => R.groundLocators(steps, snapshots, manual, null);
// vocabulary v4 (step-level validation): a miss is a step gap, never an entry refusal.
/** @param {number[]} runtime the shape of a result with no gap */
const clean = (runtime) => ({ gaps: [], truncateAt: null, runtime });
/** @param {number} at zero-based @param {'assertion' | 'interaction'} kind @param {number[]} [runtime] */
const gapOf = (at, kind, runtime = []) => ({ gaps: [{ at, kind }], truncateAt: kind === 'interaction' ? at : null, runtime });
const STEP_SENTENCE = 'the step could not be grounded to exactly one element';

// ---------------------------------------------------------------------------
// 1. The two grounding sources (PRD AC-6)
// ---------------------------------------------------------------------------

test('AC-6 a locator that a snapshot entry lists with matches 1 is grounded and left out of runtime, whatever the report says', () => {
  assert.deepEqual(ground([GOTO, { action: 'click', role: 'button', name: 'Salvar' }], ''), clean([]));
  assert.deepEqual(ground([GOTO, { action: 'expect_visible', text: 'Mensagem visivel' }], null), clean([]));
  // Listed AND stated: the snapshot grounds it, so the browser does not re-resolve it (a missing element still fails a positive step).
  assert.deepEqual(ground([GOTO, { action: 'click', role: 'button', name: 'Salvar' }], 'Click Salvar.'), clean([]));
});

test('AC-6 a locator whose words the report states is grounded with no snapshot at all and its step index goes to runtime', () => {
  const click = { action: 'click', role: 'button', name: 'Inexistente' };
  assert.deepEqual(ground([GOTO, click], 'Click Inexistente.', []), clean([1]));
  // A text locator, and a role locator on a route whose snapshot lacks the entry.
  assert.deepEqual(ground([GOTO, { action: 'expect_visible', text: 'Algo novo' }], 'See Algo novo on the page.', []), clean([1]));
  assert.deepEqual(ground([GOTO, click], 'Click Inexistente.'), clean([1]));
  // Only the steps with no snapshot entry behind them are listed, in step order.
  const mixed = ground([GOTO, { action: 'click', role: 'button', name: 'Salvar' }, click, { action: 'click', role: 'button', name: 'Outro' }], 'Click Inexistente then Outro.');
  assert.deepEqual(mixed, clean([2, 3]));
  // A 2-match entry stated by the report is grounded too: the browser decides how many there are when the case runs.
  assert.deepEqual(ground([GOTO, { action: 'click', role: 'button', name: 'Gemeo' }], 'Click Gemeo.'), clean([1]));
});

test('AC-6 the report is compared after collapsing whitespace and ignoring case, in both directions', () => {
  const step = { action: 'click', role: 'button', name: 'Dois   Espacos' };
  assert.deepEqual(ground([GOTO, step], 'Click the button dois espacos now', []).gaps, []);
  assert.deepEqual(ground([GOTO, step], 'CLICK DOIS\n\tESPACOS', []).gaps, []);
  assert.deepEqual(ground([GOTO, { action: 'click', role: 'button', name: 'ABC' }], 'press abc', []).gaps, []);
  // A word that is only part of a longer word is still contained: the rule is a contained-text rule, not a token rule.
  assert.deepEqual(ground([GOTO, { action: 'click', role: 'button', name: 'dois' }], 'Click Dois Espacos', []).gaps, []);
  assert.deepEqual(ground([GOTO, { action: 'click', role: 'button', name: 'Dois Espacos Tres' }], 'Click Dois Espacos', []), gapOf(1, 'interaction'));
});

test('AC-6 an empty, blank or non-string report grounds nothing', () => {
  const click = { action: 'click', role: 'button', name: 'Inexistente' };
  for (const manual of ['', '   ', '\n\t', null, undefined, 42, {}, ['Inexistente'], true]) {
    const r = ground([GOTO, click], manual, []);
    assert.deepEqual(r.gaps, [{ at: 1, kind: 'interaction' }], `a report of ${JSON.stringify(manual)} grounded the step`);
    assert.equal(r.truncateAt, 1, `a report of ${JSON.stringify(manual)} did not truncate at the click`);
    assert.deepEqual(r.runtime, [], `a report of ${JSON.stringify(manual)} left a step to run time`);
  }
});

test('AC-1 AC-2 a locator that is neither a snapshot entry with matches 1 nor a word of the report is a step gap that carries no text: an assertion is skipped, an interaction truncates', () => {
  const report = 'Open the page and look around.';
  // An interaction (click) with no source: gap + truncation at its own position.
  const notAnEntry = ground([GOTO, { action: 'click', role: 'button', name: 'Fantasma' }], report);
  assert.deepEqual(notAnEntry, gapOf(1, 'interaction'));
  const twin = ground([GOTO, { action: 'click', role: 'button', name: 'Gemeo' }], report);
  assert.deepEqual(twin, gapOf(1, 'interaction'), 'a snapshot entry counted twice is not a source');
  // An assertion with no source: gap, no truncation.
  const textTwin = ground([GOTO, { action: 'expect_visible', text: 'Repetido' }], report);
  assert.deepEqual(textTwin, gapOf(1, 'assertion'));
  const noSnapshot = ground([GOTO, { action: 'click', role: 'button', name: 'Fantasma' }], report, []);
  assert.deepEqual(noSnapshot, gapOf(1, 'interaction'));
  const noGoto = ground([{ action: 'click', role: 'button', name: 'Fantasma' }], report);
  assert.deepEqual(noGoto, gapOf(0, 'interaction'));
  for (const r of [notAnEntry, twin, textTwin, noSnapshot, noGoto]) {
    assert.ok(!/Fantasma|Gemeo|Repetido/.test(JSON.stringify(r)), `the result echoes a locator: ${JSON.stringify(r)}`);
    assert.equal('refusal' in r, false, 'a grounding miss is no longer an entry refusal');
  }
  // The role of the plan decides which snapshot applies: a snapshot of another role grounds nothing.
  const otherRole = R.groundLocators([GOTO, { action: 'click', role: 'button', name: 'Salvar' }], [SNAP], report, 'admin');
  assert.deepEqual(otherRole, gapOf(1, 'interaction'));
  // The pre-check names the position and one fixed sentence, never the locator.
  assert.deepEqual(R.precheckGroundedSteps([GOTO, { action: 'click', role: 'button', name: 'Fantasma' }], [SNAP], report, null), { code: 'STEP_UNGROUNDED', reason: `step 2: ${STEP_SENTENCE}` });
});

test('AC-2 the walk stops at the first ungrounded interaction: later steps are neither grounded nor gaps, and the gap names its own step position', () => {
  const steps = [GOTO, { action: 'click', role: 'button', name: 'Salvar' }, { action: 'click', role: 'button', name: 'Fantasma' }, { action: 'click', role: 'button', name: 'Gemeo' }];
  const r = ground(steps, 'nothing');
  assert.deepEqual(r, gapOf(2, 'interaction'));
  assert.match(String(R.precheckGroundedSteps(steps, [SNAP], 'nothing', null)?.reason), /^step 3: /);
});

test('AC-1 an assertion gap does not stop the walk: the steps after it are still grounded and later gaps are all listed', () => {
  const bad = (/** @type {string} */ name) => ({ action: 'expect_visible', role: 'button', name });
  const steps = [GOTO, { action: 'expect_visible', role: 'button', name: 'Salvar' }, bad('Fantasma'), { action: 'expect_visible', text: 'Mensagem visivel' }, bad('Outro Fantasma')];
  assert.deepEqual(ground(steps, 'nothing'), { gaps: [{ at: 2, kind: 'assertion' }, { at: 4, kind: 'assertion' }], truncateAt: null, runtime: [] });
  // The first gap is the one the pre-check names.
  assert.match(String(R.precheckGroundedSteps(steps, [SNAP], 'nothing', null)?.reason), /^step 3: /);
});

test('AC-1 the report-text rules on the expectation literals still apply to a report-word locator, as a step gap', () => {
  const heading = { action: 'expect_text', role: 'heading', name: 'Titulo', contains: 'Bem vindo' };
  assert.deepEqual(ground([GOTO, heading], 'See the Titulo heading say Bem vindo.', []).gaps, []);
  const foreign = ground([GOTO, heading], 'See the Titulo heading.', []);
  assert.deepEqual(foreign, gapOf(1, 'assertion'), 'a contains the report never states is a gap, not a runtime step');
  assert.ok(!JSON.stringify(foreign).includes('Bem vindo'));
  const value = { action: 'expect_value', role: 'textbox', name: 'Nome', equals: 'Ana' };
  assert.deepEqual(ground([GOTO, value], 'The Nome field holds Ana.', []).gaps, []);
  assert.deepEqual(ground([GOTO, value], 'The Nome field is filled.', []), gapOf(1, 'assertion'));
});

test('AC-6 the fill value of a consumed post-interaction prefix is checked only for a step that a snapshot entry grounded', () => {
  const FILL = { action: 'fill', role: 'textbox', name: 'Filtro', value: 'abc' };
  const post = (/** @type {any[]} */ entries) => ({
    schema_version: 2,
    role: 'anonymous',
    route: '/p',
    entries,
    withheld: 0,
    prefix: [{ action: 'goto', path: '/p' }, { action: 'fill', role: 'textbox', name: 'Filtro', value_sha256: sha('abc') }],
  });
  const shown = { action: 'expect_visible', text: 'Resultado' };
  // Listed by the post-interaction snapshot: the typed value must come from the report.
  const listed = R.groundLocators([GOTO, FILL, shown], [SNAP, post([text('Resultado')])], 'See Resultado.', null);
  assert.deepEqual(listed, gapOf(2, 'assertion'), 'the step that depends on the replayed fill is the gap');
  assert.ok(!JSON.stringify(listed).includes('abc'));
  assert.deepEqual(R.groundLocators([GOTO, FILL, shown], [SNAP, post([text('Resultado')])], 'Type abc and see Resultado.', null), clean([]));
  // Grounded only by the report's words: no snapshot entry stands behind the step, so the browser resolves it and the rule has nothing to guard.
  const stated = R.groundLocators([GOTO, FILL, shown], [SNAP, post([])], 'See Resultado.', null);
  assert.deepEqual(stated, clean([2]));
});

test('AC-1 precheckGroundedSteps keeps its signature: null with no gap, else STEP_UNGROUNDED naming the first gap position', () => {
  assert.equal(R.precheckGroundedSteps.length, 4);
  assert.equal(R.groundLocators.length, 4);
  // [steps, snapshots, report, who, expected step position of the first gap or null]
  const inputs = /** @type {[any[], any[], any, string | null, number | null][]} */ ([
    [[GOTO, { action: 'click', role: 'button', name: 'Salvar' }], [SNAP], '', null, null],
    [[GOTO, { action: 'click', role: 'button', name: 'Fantasma' }], [SNAP], 'x', null, 2],
    [[GOTO, { action: 'click', role: 'button', name: 'Fantasma' }], [SNAP], 'Click Fantasma', null, null],
    [[GOTO, { action: 'click', role: 'button', name: 'Gemeo' }], [SNAP], 'x', null, 2],
    [[GOTO, { action: 'click', within: B, role: 'button', index: 0 }], [SNAP], '', null, null],
    [[GOTO, { action: 'click', role: 'button', name: 'Salvar' }], [], '', null, 2],
    [[{ action: 'click', selector: '#legacy' }], [], '', null, null],
  ]);
  for (const [steps, snaps, manual, who, position] of inputs) {
    const expected = position === null ? null : { code: 'STEP_UNGROUNDED', reason: `step ${position}: ${STEP_SENTENCE}` };
    assert.deepEqual(R.precheckGroundedSteps(steps, snaps, manual, who), expected, JSON.stringify(steps));
    assert.equal(R.groundLocators(steps, snaps, manual, who).gaps.length === 0, position === null, JSON.stringify(steps));
  }
  assert.equal(R.precheckGroundedSteps([GOTO, { action: 'click', selector: '#a' }], [], '', null), null, 'a selector step is not checked');
});

test('AC-6 a scoped step needs every word it carries grounded by the report or by a snapshot entry that matches once; it is always left to run time', () => {
  // The scope is a snapshot entry of its own, the target a word of the report.
  const scoped = { action: 'click', within: B, role: 'button', name: 'Excluir' };
  assert.deepEqual(ground([GOTO, scoped], 'In Grupo B click Excluir.'), clean([1]));
  // Both words listed in the snapshot: still run time, because a snapshot lists page-wide candidates only.
  const listedBoth = { action: 'click', within: B, role: 'button', name: 'Salvar' };
  assert.deepEqual(ground([GOTO, listedBoth], ''), clean([1]));
  // The scope word is neither listed nor stated: the click is an interaction gap.
  const noScope = ground([GOTO, scoped], 'Click Excluir.', []);
  assert.deepEqual(noScope, gapOf(1, 'interaction'));
  // The target word is neither listed nor stated.
  const noTarget = ground([GOTO, scoped], 'In Grupo B click the button.');
  assert.deepEqual(noTarget, gapOf(1, 'interaction'));
  for (const r of [noScope, noTarget]) assert.ok(!/Grupo|Excluir/.test(JSON.stringify(r)), `the result echoes a locator: ${JSON.stringify(r)}`);
  // A scope listed twice does not ground its word.
  const twinScope = { action: 'click', within: { role: 'button', name: 'Gemeo' }, role: 'button', index: 0 };
  assert.deepEqual(ground([GOTO, twinScope], ''), gapOf(1, 'interaction'));
  assert.deepEqual(ground([GOTO, twinScope], 'Inside Gemeo click the first button.'), clean([1]));
  // A scope by prefix: the prefix is the word.
  const byPrefix = { action: 'expect_visible', within: { role: 'region', name_prefix: 'Grupo' }, text: 'Mensagem visivel' };
  assert.deepEqual(ground([GOTO, byPrefix], ''), clean([1]));
  assert.deepEqual(ground([GOTO, { ...byPrefix, within: { role: 'region', name_prefix: 'Nada' } }], ''), gapOf(1, 'assertion'));
  // A name_prefix target is grounded by a snapshot entry that starts with it, or by the report.
  const prefixed = { action: 'click', role: 'button', name_prefix: 'Salv' };
  assert.deepEqual(ground([GOTO, prefixed], ''), clean([1]));
  assert.deepEqual(ground([GOTO, { ...prefixed, name_prefix: 'Zzz' }], ''), gapOf(1, 'interaction'));
  assert.deepEqual(ground([GOTO, { ...prefixed, name_prefix: 'Zzz' }], 'The Zzz header'), clean([1]));
});

test('AC-6 index carries no word of its own: only its scope has to be grounded', () => {
  const nth = { action: 'click', within: B, role: 'button', index: 1 };
  assert.deepEqual(ground([GOTO, nth], ''), clean([1]), 'the scope is a snapshot entry, the index needs no word');
  const noScope = ground([GOTO, nth], 'x', []);
  assert.deepEqual(noScope, gapOf(1, 'interaction'), 'a scope with no source is a gap');
  assert.deepEqual(ground([GOTO, nth], 'Inside Grupo B click the second button.', []), clean([1]));
  // The role of the button is not a locator word: an index step names none.
  assert.deepEqual(ground([GOTO, { ...nth, role: 'listitem' }], 'Grupo B has list items', []), clean([1]));
});

test('AC-8 label_text is grounded by a text entry that matches once or by the report, and is always left to run time', () => {
  const fill = { action: 'fill', label_text: 'E-mail*', value: 'ana' };
  assert.deepEqual(ground([GOTO, fill], ''), clean([1]), 'a text entry of the snapshot lists the label');
  assert.deepEqual(ground([GOTO, { ...fill, label_text: 'Telefone*' }], 'Type 1199 in Telefone*.'), clean([1]));
  const none = ground([GOTO, { ...fill, label_text: 'Telefone*' }], 'Type in the phone.');
  assert.deepEqual(none, gapOf(1, 'interaction'), 'a fill with an ungrounded label truncates');
  assert.ok(!JSON.stringify(none).includes('Telefone'));
  // A label that the snapshot counted twice is not a snapshot source.
  assert.deepEqual(ground([GOTO, { ...fill, label_text: 'Repetido' }], ''), gapOf(1, 'interaction'));
  // expect_value on a label locator keeps the literal rule.
  const value = { action: 'expect_value', label_text: 'E-mail*', equals: 'ana' };
  assert.deepEqual(ground([GOTO, value], 'Check the field.'), gapOf(1, 'assertion'), 'E-mail* is listed, but the literal ana is not in the report');
  assert.deepEqual(ground([GOTO, value], 'The E-mail* field holds ana.'), clean([1]));
});

// ---------------------------------------------------------------------------
// 2. The vocabulary (PRD AC-7, AC-8, AC-9)
// ---------------------------------------------------------------------------

test('AC-7 AC-8 AC-9 the four keys are the exported set and every valid combination validates alone', () => {
  assert.deepEqual([...R.SCOPED_LOCATOR_KEYS], ['within', 'name_prefix', 'label_text', 'index']);
  assert.equal(Object.isFrozen(R.SCOPED_LOCATOR_KEYS), true);
  for (const name of ['scopeOf', 'isControlLocator', 'groundLocators', 'scopeLocator', 'resolveScopeElement', 'buildLocator']) {
    assert.equal(typeof (/** @type {any} */ (R))[name], 'function', `${name} is not exported`);
  }
  const ok = (/** @type {any} */ s) => assert.equal(R.validateStep('browser', s), null, JSON.stringify(s));
  ok({ action: 'click', within: B, role: 'button', name: 'Excluir' });
  ok({ action: 'expect_visible', within: B, text: 'Salvar' });
  ok({ action: 'expect_text', within: B, text: 'Salvar', contains: 'x' });
  ok({ action: 'click', role: 'button', name_prefix: 'Alunos' });
  ok({ action: 'expect_state', role: 'button', name_prefix: 'Alunos', state: 'expanded', equals: false });
  ok({ action: 'fill', label_text: 'E-mail*', value: 'ana' });
  ok({ action: 'expect_value', label_text: 'E-mail*', equals: 'ana' });
  ok({ action: 'expect_value', label_text: 'E-mail*', not_empty: true });
  ok({ action: 'expect_state', label_text: 'Aceito', state: 'checked', equals: true });
  ok({ action: 'expect_visible', label_text: 'E-mail*' });
  ok({ action: 'click', within: B, role: 'button', index: 0 });
  ok({ action: 'click', within: { role: 'region', name_prefix: 'Grupo' }, role: 'button', index: 2 });
  ok({ action: 'expect_not_visible', within: B, role: 'button', name: 'Remover' });
  ok({ action: 'expect_not_visible', within: B, text: 'Remover' });
  ok({ action: 'click', within: { role: 'region', name: 'Grupo B' }, role: 'button', name_prefix: 'Ex' });
});

test('AC-7 AC-8 AC-9 every refused combination of the four keys is PLAN_ENTRY_INVALID with a reason that echoes no value', () => {
  /** @type {[string, any][]} */
  const refused = [
    ['index without within', { action: 'click', role: 'button', index: 0 }],
    ['a negative index', { action: 'click', within: B, role: 'button', index: -1 }],
    ['a fractional index', { action: 'click', within: B, role: 'button', index: 1.5 }],
    ['a string index', { action: 'click', within: B, role: 'button', index: '1' }],
    ['an unsafe integer index', { action: 'click', within: B, role: 'button', index: 2 ** 60 }],
    ['index with name', { action: 'click', within: B, role: 'button', name: 'x', index: 0 }],
    ['index with name_prefix', { action: 'click', within: B, role: 'button', name_prefix: 'x', index: 0 }],
    ['index with text', { action: 'click', within: B, text: 'x', index: 0 }],
    ['index with label_text', { action: 'click', within: B, label_text: 'x', index: 0 }],
    ['index without role', { action: 'click', within: B, index: 0 }],
    ['name and name_prefix', { action: 'click', role: 'button', name: 'a', name_prefix: 'b' }],
    ['name_prefix without role', { action: 'click', name_prefix: 'b' }],
    ['name_prefix with text', { action: 'click', text: 't', name_prefix: 'b' }],
    ['an empty name_prefix', { action: 'click', role: 'button', name_prefix: '' }],
    ['a blank name_prefix', { action: 'click', role: 'button', name_prefix: '   ' }],
    ['a non-string name_prefix', { action: 'click', role: 'button', name_prefix: 4 }],
    ['label_text with role', { action: 'click', label_text: 'x', role: 'textbox' }],
    ['label_text with name', { action: 'click', label_text: 'x', name: 'y' }],
    ['label_text with name_prefix', { action: 'click', label_text: 'x', name_prefix: 'y', role: 'textbox' }],
    ['label_text with text', { action: 'click', label_text: 'x', text: 'y' }],
    ['an empty label_text', { action: 'fill', label_text: '', value: 'v' }],
    ['a blank label_text', { action: 'fill', label_text: ' ', value: 'v' }],
    ['a non-string label_text', { action: 'fill', label_text: 3, value: 'v' }],
    ['label_text on expect_text', { action: 'expect_text', label_text: 'x', contains: 'y' }],
    ['label_text on expect_not_visible', { action: 'expect_not_visible', label_text: 'x' }],
    ['label_text on expect_not_visible inside a scope', { action: 'expect_not_visible', within: B, label_text: 'x' }],
    ['within without role', { action: 'click', within: { name: 'a' }, text: 'x' }],
    ['within with neither name nor name_prefix', { action: 'click', within: { role: 'region' }, text: 'x' }],
    ['within with both name and name_prefix', { action: 'click', within: { role: 'region', name: 'a', name_prefix: 'b' }, text: 'x' }],
    ['within with an unsupported role', { action: 'click', within: { role: 'nope', name: 'a' }, text: 'x' }],
    ['within with an empty name', { action: 'click', within: { role: 'region', name: '' }, text: 'x' }],
    ['within with a non-string name', { action: 'click', within: { role: 'region', name: 5 }, text: 'x' }],
    ['within with an extra key', { action: 'click', within: { role: 'region', name: 'a', index: 0 }, text: 'x' }],
    ['within as an array', { action: 'click', within: [], text: 'x' }],
    ['within as a string', { action: 'click', within: 'Grupo', text: 'x' }],
    ['within with a selector', { action: 'click', within: B, selector: '#a' }],
    ['within with nothing to locate', { action: 'click', within: B }],
    ['a bare text for expect_value', { action: 'expect_value', within: B, text: 'x', not_empty: true }],
    ['a bare text for expect_state', { action: 'expect_state', within: B, text: 'x', state: 'checked', equals: true }],
    ['a session on a scoped step', { action: 'click', within: B, role: 'button', name: 'x', session: 'none' }],
    ['an expect_value that has no comparison', { action: 'expect_value', label_text: 'x' }],
    ['an expect_value that has two comparisons', { action: 'expect_value', label_text: 'x', equals: 'a', not_empty: true }],
  ];
  for (const [label, step] of refused) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = R.validateStep('browser', step);
    }, `${label} threw`);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${label}: ${JSON.stringify(r)}`);
    assert.ok(typeof r.reason === 'string' && r.reason.length > 0, label);
    const inEntry = R.validateSteps('browser', [GOTO, { action: 'expect_visible', role: 'heading', name: 'T' }, step], []);
    assert.equal(inEntry?.code, 'PLAN_ENTRY_INVALID', `${label} as a sequence`);
    assert.match(String(inEntry?.reason), /^step 3: /, label);
  }
  // A reason names keys, never a value.
  for (const key of R.SCOPED_LOCATOR_KEYS) {
    const step = { action: 'click', role: 'button', name: CANARY, [key]: key === 'index' ? CANARY : { toString: CANARY } };
    const r = R.validateStep('browser', step);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', key);
    assert.ok(!String(r?.reason).includes(CANARY), `${key}: the refusal echoes a value: ${r?.reason}`);
  }
});

test('AC-7 AC-8 AC-9 a hostile value in a scoped key never throws and is always PLAN_ENTRY_INVALID', () => {
  const hostile = [{ toString: 1 }, [{ toString: 1 }], null, 7, '', { valueOf: 1, length: 3 }, [[]], [], NaN, Symbol.iterator.toString(), () => 1, { role: { toString: 1 }, name: { toString: 1 } }];
  for (const key of R.SCOPED_LOCATOR_KEYS) {
    for (const value of hostile) {
      const step = { action: 'click', role: 'button', name: 'x', [key]: value };
      /** @type {any} */ let r;
      assert.doesNotThrow(() => {
        r = R.validateStep('browser', step);
      }, key);
      assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${key} ${inspect(value)}`);
    }
  }
  assert.equal(R.validateSteps('browser', [GOTO, { action: 'click', within: { toString: 1 }, role: 'button', index: 0 }], [])?.code, 'PLAN_ENTRY_INVALID');
  for (const bad of [null, undefined, 7, 'x', [], { role: { toString: 1 }, name: 'a' }, { role: 'region', name: { toString: 1 } }, { role: 'region', name_prefix: [] }]) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = R.scopeOf(bad);
    });
    assert.equal(r?.ok, false, JSON.stringify(bad));
    assert.equal(typeof r.why, 'string');
  }
});

test('AC-7 scopeOf validates the within object and its reasons name keys, never a value', () => {
  assert.deepEqual(R.scopeOf({ role: 'region', name: 'Grupo B' }), { ok: true, scope: { role: 'region', name: 'Grupo B' } });
  assert.deepEqual(R.scopeOf({ role: 'navigation', name_prefix: 'Princ' }), { ok: true, scope: { role: 'navigation', namePrefix: 'Princ' } });
  for (const bad of [{ role: 'region' }, { role: 'region', name: 'a', name_prefix: 'b' }, { role: 'nope', name: 'a' }, { role: 'region', name: ' ' }, { role: 'region', name: 'a', extra: 1 }, {}]) {
    const r = R.scopeOf(bad);
    assert.equal(r.ok, false, JSON.stringify(bad));
  }
  const leaky = R.scopeOf({ role: 'region', name: CANARY, [CANARY]: 1 });
  assert.equal(leaky.ok, false);
  assert.ok(!JSON.stringify(leaky).includes(CANARY));
});

test('AC-7 AC-9 locatorOf returns the plain forms exactly as before and an extended scoped descriptor for the four keys; isControlLocator separates controls from bare text', () => {
  assert.deepEqual(R.locatorOf({ role: 'button', name: 'Save' }), { ok: true, form: 'role', role: 'button', name: 'Save' });
  assert.deepEqual(R.locatorOf({ text: 'Welcome' }), { ok: true, form: 'text', text: 'Welcome' });
  assert.equal(R.locatorOf({ selector: '#a' }), null);
  assert.equal(R.locatorOf({ action: 'goto', path: '/' }), null);
  assert.equal(R.locatorOf(null), null);
  assert.deepEqual(R.locatorOf({ role: 'button' }), { ok: false, why: 'role and name go together' });
  assert.deepEqual(R.locatorOf({ within: B, role: 'button', index: 1 }), {
    ok: true,
    form: 'scoped',
    scope: { role: 'region', name: 'Grupo B' },
    target: { kind: 'nth', role: 'button', index: 1 },
  });
  assert.deepEqual(R.locatorOf({ role: 'button', name_prefix: 'Alunos' }), {
    ok: true,
    form: 'scoped',
    scope: null,
    target: { kind: 'role-prefix', role: 'button', namePrefix: 'Alunos' },
  });
  assert.deepEqual(R.locatorOf({ label_text: 'E-mail*' }), { ok: true, form: 'scoped', scope: null, target: { kind: 'label', labelText: 'E-mail*' } });
  assert.deepEqual(R.locatorOf({ within: B, text: 'Salvar' }), { ok: true, form: 'scoped', scope: { role: 'region', name: 'Grupo B' }, target: { kind: 'text', text: 'Salvar' } });
  assert.deepEqual(R.locatorOf({ within: B, role: 'button', name: 'Excluir' }), {
    ok: true,
    form: 'scoped',
    scope: { role: 'region', name: 'Grupo B' },
    target: { kind: 'role', role: 'button', name: 'Excluir' },
  });

  assert.equal(R.isControlLocator(R.locatorOf({ role: 'textbox', name: 'x' })), true);
  assert.equal(R.isControlLocator(R.locatorOf({ label_text: 'x' })), true);
  assert.equal(R.isControlLocator(R.locatorOf({ role: 'button', name_prefix: 'x' })), true);
  assert.equal(R.isControlLocator(R.locatorOf({ within: B, role: 'button', index: 0 })), true);
  assert.equal(R.isControlLocator(R.locatorOf({ text: 'x' })), false);
  assert.equal(R.isControlLocator(R.locatorOf({ text: 'x', within: B })), false);
  for (const not of [null, undefined, 7, 'x', { ok: false, why: 'x' }, R.locatorOf({ role: 'button' }), R.locatorOf({ selector: '#a' })]) {
    assert.equal(R.isControlLocator(not), false, JSON.stringify(not));
  }
});

test('AC-9 an absence step in a scope still needs the positive anchor on the same route, and the anchor is the one of any scoped positive step', () => {
  const absent = { action: 'expect_not_visible', within: B, role: 'button', name: 'Remover' };
  assert.equal(R.validateSteps('browser', [GOTO, absent], [])?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(R.validateSteps('browser', [GOTO, { action: 'expect_visible', within: B, role: 'button', name: 'Salvar' }, absent], []), null);
  assert.equal(R.validateSteps('browser', [GOTO, { action: 'expect_visible', label_text: 'E-mail*' }, absent], []), null);
});

test('AC-9 groundingStepKey is null for a scoped step and unchanged for a plain one', () => {
  assert.equal(R.groundingStepKey({ action: 'click', within: B, role: 'button', index: 0 }), null);
  assert.equal(R.groundingStepKey({ action: 'click', role: 'button', name_prefix: 'Alunos' }), null);
  assert.equal(R.groundingStepKey({ action: 'fill', label_text: 'E-mail*', value: 'ana' }), null);
  assert.equal(R.groundingStepKey({ action: 'click', within: B, text: 'x' }), null);
  assert.deepEqual(R.groundingStepKey({ action: 'click', role: 'button', name: 'Group' }), { action: 'click', role: 'button', name: 'Group' });
  assert.deepEqual(R.groundingStepKey({ action: 'click', text: 'Group' }), { action: 'click', text: 'Group' });
  assert.deepEqual(R.groundingStepKey({ action: 'fill', role: 'textbox', name: 'F', value: 'abc' }), { action: 'fill', role: 'textbox', name: 'F', value_sha256: sha('abc') });
  assert.deepEqual(R.groundingStepKey({ action: 'goto', path: '/p' }), { action: 'goto', path: '/p' });
});

// ---------------------------------------------------------------------------
// 3. expect_requests method arrays (PRD AC-10)
// ---------------------------------------------------------------------------

/** @param {any} method */
const req = (method) => ({ action: 'expect_requests', method, url_contains: '/a', count: 1 });

test('AC-10 expect_requests accepts a method name or a non-empty array of distinct names and refuses every other shape without throwing', () => {
  for (const ok of ['POST', 'GET', ['POST'], ['POST', 'PATCH', 'PUT'], ['GET'], ['DELETE', 'HEAD'], ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']]) {
    assert.equal(R.validateStep('browser', req(ok)), null, JSON.stringify(ok));
  }
  const refused = [
    [], ['POST', 'POST'], ['POST', 7], ['TRACE'], ['post'], [['POST']], {}, 'post', 7, null, undefined, true,
    [{ toString: 1 }], { valueOf: 1, length: 3 }, { 0: 'POST', length: 1 }, [null], [undefined, 'POST'], [''],
    ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'GET'], new Set(['POST']),
  ];
  for (const bad of refused) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = R.validateStep('browser', req(bad));
    }, inspect(bad));
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', inspect(bad));
  }
  const leaky = R.validateStep('browser', req([CANARY]));
  assert.equal(leaky?.code, 'PLAN_ENTRY_INVALID');
  assert.ok(!String(leaky?.reason).includes(CANARY), `the refusal echoes a member: ${leaky?.reason}`);
});

test('AC-10 evaluateRequestWindow counts a request whose method is any member of the set, and a single string behaves as before', () => {
  const hit = (/** @type {string} */ method, extra = {}) => ({ method, host: '127.0.0.1:3000', path: '/api/profile', local: true, ...extra });
  const set = { ...req(['POST', 'PATCH', 'PUT']), url_contains: '/api/profile' };
  const one = R.evaluateRequestWindow([hit('PATCH')], set);
  assert.equal(one.status, 'passed');
  assert.equal(/** @type {any} */ (one).observed, 1);
  assert.deepEqual(/** @type {any} */ (one).matching, [{ method: 'PATCH', host: '127.0.0.1:3000', path: '/api/profile' }]);
  assert.equal(/** @type {any} */ (R.evaluateRequestWindow([hit('PATCH'), hit('GET')], set)).observed, 1, 'a GET is not a member');
  assert.equal(R.evaluateRequestWindow([hit('PATCH'), hit('PUT')], set).status, 'failed', 'two members counted, one expected');
  assert.equal(/** @type {any} */ (R.evaluateRequestWindow([hit('PATCH'), hit('PUT'), hit('POST')], set)).observed, 3);
  assert.equal(R.evaluateRequestWindow([hit('PATCH'), hit('PUT')], { ...set, count: 2 }).status, 'passed');
  assert.equal(R.evaluateRequestWindow([], { ...set, count: 0 }).status, 'passed');
  // A single string: exactly the old comparison.
  assert.equal(/** @type {any} */ (R.evaluateRequestWindow([hit('PATCH')], { ...set, method: 'POST' })).observed, 0);
  assert.equal(R.evaluateRequestWindow([hit('POST')], { ...set, method: 'POST' }).status, 'passed');
  assert.equal(R.evaluateRequestWindow([hit('PATCH')], { ...set, method: 'POST', count: 0 }).status, 'passed');
  // A one-member array is the same as the string.
  assert.deepEqual(R.evaluateRequestWindow([hit('POST'), hit('GET')], { ...set, method: ['POST'] }), R.evaluateRequestWindow([hit('POST'), hit('GET')], { ...set, method: 'POST' }));
  // A matching request to a host the guard does not approve is `non-local`; a non-matching method is never inspected.
  assert.deepEqual(R.evaluateRequestWindow([hit('PATCH', { local: false })], set), { status: 'non-local' });
  assert.equal(R.evaluateRequestWindow([hit('GET', { local: false })], set).status, 'failed', 'a request outside the member set is ignored, even to a foreign host');
  assert.equal(R.evaluateRequestWindow([hit('PATCH', { path: '/other' })], set).status, 'failed');
});

// ---------------------------------------------------------------------------
// 4. The documents (PRD AC-22)
// ---------------------------------------------------------------------------

const COMMAND_DOC = read('plugins/relay/commands/relay-qa-run.md');

/** @returns {{ line: number, step: any }[]} every marked browser example of the command doc, parsed */
function browserExamples() {
  const out = [];
  const re = /<!-- qa-step-example driver=browser -->\n```json\n([\s\S]*?)\n```/g;
  for (const m of COMMAND_DOC.matchAll(re)) {
    out.push({ line: COMMAND_DOC.slice(0, m.index).split('\n').length, step: JSON.parse(m[1]) });
  }
  return out;
}

test('AC-22 the command doc carries a marked literal example per new key, exactly one per (key, form), and each validates alone against the script', () => {
  const examples = browserExamples();
  assert.ok(examples.length >= 4, 'the marked examples were not found');
  const withKey = (/** @type {(s: any) => boolean} */ pred) => examples.filter((e) => pred(e.step));
  const isAnchor = (/** @type {any} */ s) => s.within !== undefined && s.within !== null && s.within.anchor_text !== undefined;
  // Vocabulary v4 adds forms of the same keys (a within scope by anchor text, a role-only presence step, a name_prefix
  // beside a pattern, an index inside an anchor scope), so each key is pinned per form: one example each.
  const byKey = /** @type {[string, { line: number, step: any }[]][]} */ ([
    ['within', withKey((s) => s.within !== undefined && !isAnchor(s) && s.index === undefined && (s.name !== undefined || s.text !== undefined))],
    ['name_prefix', withKey((s) => s.name_prefix !== undefined && s.pattern === undefined)],
    ['label_text', withKey((s) => s.label_text !== undefined)],
    ['index', withKey((s) => s.index !== undefined && !isAnchor(s))],
  ]);
  for (const [key, found] of byKey) {
    assert.equal(found.length, 1, `${key}: ${found.length} marked examples`);
    assert.equal(R.validateStep('browser', found[0].step), null, `${key}: the doc example does not validate alone`);
    assert.ok(R.SCOPED_LOCATOR_KEYS.includes(/** @type {any} */ (key)), key);
  }
  // The index example is a scoped one, and the within example carries the scope the doc describes.
  assert.ok(R.scopeOf(byKey[0][1][0].step.within).ok);
  assert.ok(R.scopeOf(byKey[3][1][0].step.within).ok);
  // The v4 forms of within: the anchor-text scope and the role-only presence step, one marked example each.
  const anchor = withKey(isAnchor);
  assert.equal(anchor.length, 1, `anchor_text: ${anchor.length} marked examples`);
  const roleOnly = withKey((s) => s.action === 'expect_visible' && s.within !== undefined && !isAnchor(s) && s.role !== undefined && s.name === undefined && s.name_prefix === undefined && s.text === undefined && s.index === undefined);
  assert.equal(roleOnly.length, 1, `role-only presence: ${roleOnly.length} marked examples`);
  // Every marked browser example in the doc validates alone (a regression guard over the older examples too).
  for (const e of examples) assert.equal(R.validateStep('browser', e.step), null, `the example at line ${e.line} does not validate`);
});

test('AC-22 the command doc states the two locator sources, the run-time resolution and the method array', () => {
  const start = COMMAND_DOC.indexOf('Run-time and scoped locators.');
  assert.ok(start >= 0, 'the Run-time and scoped locators paragraph is missing');
  assert.equal(COMMAND_DOC.indexOf('Run-time and scoped locators.', start + 1), -1, 'the paragraph start appears more than once');
  const grounding = COMMAND_DOC.indexOf('Grounding rules.');
  assert.ok(grounding > start, 'the grounding rules must come after the paragraph they refer to');
  const paragraph = collapse(COMMAND_DOC.slice(start, COMMAND_DOC.indexOf('\n\n', start)));
  for (const token of ['snapshot', '`matches`', 'manual steps', 'whitespace', 'case', 'STEP_UNGROUNDED', 'step gap', 'needs-human', 'Four optional keys']) {
    assert.ok(paragraph.includes(token), `the paragraph does not state ${token}`);
  }
  // Vocabulary v4: an ungrounded locator is a step gap, no longer a refusal of the whole entry.
  assert.equal(paragraph.includes('is `PLAN_ENTRY_INVALID` before anything is seeded'), false, 'the paragraph still calls an ungrounded locator PLAN_ENTRY_INVALID');
  assert.ok(paragraph.includes('not a refusal of the entry'), 'the paragraph does not say an ungrounded locator leaves the entry valid');
  // The grounding rules and the absence paragraph name the report's words as a source.
  assert.ok(collapse(COMMAND_DOC.slice(grounding, grounding + 1500)).includes('report'), 'the grounding rules do not name the report');
  for (const key of R.SCOPED_LOCATOR_KEYS) assert.ok(COMMAND_DOC.slice(start).includes('`' + key + '`'), 'the doc after the paragraph does not explain ' + key);
  assert.equal(COMMAND_DOC.includes('The element must be one the snapshot of that page state already lists'), false, 'the snapshot-only sentence is still there');

  const arrayStart = COMMAND_DOC.indexOf('`method` may also be an array');
  assert.ok(arrayStart >= 0, 'the method-array paragraph is missing');
  const arrayParagraph = COMMAND_DOC.slice(arrayStart, COMMAND_DOC.indexOf('\n\n', arrayStart));
  const literal = arrayParagraph.match(/`(\[[^\]`]*\])`/);
  assert.ok(literal, 'the method-array paragraph has no literal array');
  const methods = JSON.parse(/** @type {RegExpMatchArray} */ (literal)[1]);
  assert.ok(Array.isArray(methods) && methods.length >= 2);
  assert.equal(R.validateStep('browser', { action: 'expect_requests', method: methods, url_contains: '/avatar', count: 1 }), null, 'the doc literal array does not validate');
  assert.ok(arrayParagraph.includes('PLAN_ENTRY_INVALID'), 'the refusals of the array are not stated');
});

const KEYS = ['within', 'name_prefix', 'label_text'];
/** @type {[string, boolean][]} path, html */
const SYNC_PAGES = [
  ['docs/api-reference.md', false],
  ['docs/domain/glossary.md', false],
  ['docs/domain/flows.md', false],
  ['documentation/reference/commands.html', true],
  ['documentation/reference/scripts.html', true],
  ['documentation/changelog.html', true],
];

test('AC-22 the knowledge base and the site pages name the four keys and the report-words source', () => {
  for (const [rel, html] of SYNC_PAGES) {
    const raw = read(rel);
    const body = html ? htmlText(raw) : collapse(raw);
    for (const key of KEYS) assert.ok(body.includes(key), `${rel} does not mention ${key}`);
    assert.ok(html ? raw.includes('<code>index</code>') : raw.includes('`index`'), `${rel} does not mention index as a key`);
    assert.ok(/report['’]s (own )?(words|steps)/i.test(body), `${rel} does not state that the report's own steps ground a locator`);
  }
});

test('AC-22 the glossary and the changelog state the method array; the API reference and the scripts page name the new exports and each is real', () => {
  assert.ok(/array of (distinct )?(HTTP )?methods?|array of method/i.test(htmlText(read('documentation/changelog.html'))), 'the changelog does not state the method array');
  assert.ok(/array/i.test(read('docs/domain/glossary.md')) && /expect_requests/.test(read('docs/domain/glossary.md')), 'the glossary does not state the method array');
  const names = ['SCOPED_LOCATOR_KEYS', 'scopeOf', 'isControlLocator', 'groundLocators', 'LABEL_CONTAINER_XPATH', 'scopeLocator', 'resolveScopeElement'];
  const onSite = ['groundLocators', 'buildLocator', 'resolveScopeElement'];
  const api = read('docs/api-reference.md');
  const scripts = read('documentation/reference/scripts.html');
  for (const name of names) {
    assert.notEqual(/** @type {any} */ (R)[name], undefined, `${name} is not exported`);
    assert.ok(api.includes(name), `docs/api-reference.md does not name ${name}`);
  }
  for (const name of onSite) {
    assert.equal(typeof (/** @type {any} */ (R))[name], 'function', `${name} is not exported`);
    assert.ok(scripts.includes(name), `scripts.html does not name ${name}`);
  }
});

test('AC-22 the changelog entry for this phase leaves the plugin version out and does not depend on the Unreleased heading', () => {
  const page = read('documentation/changelog.html');
  const text = htmlText(page);
  // The entry is found by what it says, so cutting the release later (renaming the heading) keeps it true.
  const at = text.indexOf('within');
  assert.ok(at > 0, 'the changelog entry is missing');
  const entry = text.slice(Math.max(0, at - 600), at + 600);
  for (const key of ['name_prefix', 'label_text']) assert.ok(entry.includes(key), `the entry does not carry ${key} next to within`);
});
