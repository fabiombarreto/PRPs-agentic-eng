// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-10 Absence and state assertions cannot pass vacuously (an expect_not_visible with no earlier positive step on the same route in the same case is PLAN_ENTRY_INVALID before any side effect; with one it passes only when the grounded locator is hidden or absent; expect_state passes only when the element's state equals the declared value, and a state the element does not expose is a blocked case, never a pass)
/**
 * Phase 4 (request without a session, input value, absence and state), absence-and-state half, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md
 *              (AC-A5 the absence anchor and the absent-or-hidden pass, AC-A6 the state comparison)
 *
 * Layers, all against the REAL runner (never edited):
 *   1. The closed vocabulary: the exported positive-assertion and state sets, the forms of `expect_state` and
 *      `expect_not_visible`, their totality over hostile JSON, and the sequence rule of the absence anchor
 *      (a table of refused and accepted sequences, with the refusal naming a step position and no locator).
 *   2. precheckGroundedSteps for the two new locator steps: one snapshot entry of the step's own route and role,
 *      matched exactly once, and a refusal that echoes no locator.
 *   3. settleAssertion with an injected fake clock (no real wait): accepted on a first or later read, rejected at
 *      the bound, unreadable when no read ever succeeds, and a result that never carries the value it read.
 *   4. The runner as an ASYNC child process against a loopback page and a real Chromium: each state true and
 *      false, a state the element does not expose (no aria-expanded, a plain button asked for `checked`, an ARIA
 *      checkbox whose state is mixed) is blocked and never passes, a state or an absence that settles after the
 *      step began still passes, an element that is still visible fails, a locator that matches twice at run time
 *      asserts nothing, and an absence with no anchor is refused before anything is seeded, authenticated or
 *      requested.
 *
 * KNOWN, DOCUMENTED-AS-OPEN EDGE (named DQ19 by the invoking command): a NATIVE checkbox whose DOM
 * `indeterminate` property is set exposes no aria-checked, so this phase does not block it. It is deliberately
 * NOT pinned here; the ARIA checkbox whose aria-checked is "mixed" IS pinned.
 *
 * Every git call the runner makes carries a hermetic environment (core.fsmonitor=false so no daemon is started,
 * an empty global config, discovery stopped at the sandbox's parent); the sandbox is removed afterwards and every
 * server is closed.
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

import {
  validateStep,
  validateSteps,
  precheckGroundedSteps,
  settleAssertion,
  ariaExpandedOf,
  POSITIVE_ASSERTION_ACTIONS,
  EXPECT_STATES,
  ASSERT_SETTLE_MS,
  ASSERT_POLL_INTERVAL_MS,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p4-state-'));
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

const GOTO = { action: 'goto', path: '/form' };
const HEAD = { action: 'expect_visible', role: 'heading', name: 'Perfil' };
const ABSENT = { action: 'expect_not_visible', text: 'Mensagem visivel' };
/** @param {Record<string, any>} [extra] */
const STATE = (extra = {}) => ({ action: 'expect_state', role: 'button', name: 'Grupo', state: 'expanded', equals: false, ...extra });
const VALUE = { action: 'expect_value', role: 'textbox', name: 'Telefone', not_empty: true };

// ---------------------------------------------------------------------------
// 1. The closed vocabulary and the absence anchor
// ---------------------------------------------------------------------------

test('AC-10 the positive-assertion set is exactly the four steps that fail the case when their element is missing, and the state set is expanded, disabled and checked; both are frozen', () => {
  assert.deepEqual([...POSITIVE_ASSERTION_ACTIONS].sort(), ['expect_state', 'expect_text', 'expect_value', 'expect_visible']);
  assert.deepEqual([...EXPECT_STATES].sort(), ['checked', 'disabled', 'expanded']);
  assert.ok(Object.isFrozen(POSITIVE_ASSERTION_ACTIONS), 'the anchor set can be edited at run time');
  assert.ok(Object.isFrozen(EXPECT_STATES), 'the state set can be edited at run time');
  for (const notAnAssertion of ['expect_not_visible', 'expect_url', 'goto', 'click', 'fill', 'query']) {
    assert.equal(POSITIVE_ASSERTION_ACTIONS.includes(notAnAssertion), false, `${notAnAssertion} must not anchor an absence`);
  }
});

test('AC-10 validateStep accepts expect_state with each state and a boolean equals, in both truth values', () => {
  for (const state of EXPECT_STATES) {
    for (const equals of [true, false]) {
      assert.equal(validateStep('browser', STATE({ state, equals })), null, `${state} ${equals}`);
    }
  }
  assert.equal(validateStep('browser', STATE({ role: 'checkbox', name: 'Aceito', state: 'checked', equals: true })), null);
});

test('AC-10 validateStep refuses every malformed expect_state as PLAN_ENTRY_INVALID: an unknown or missing state, a non-boolean equals, a text or selector locator', () => {
  /** @type {[string, any][]} */
  const bad = [
    ['an unsupported state', STATE({ state: 'pressed' })],
    ['another unsupported state', STATE({ state: 'selected' })],
    ['a state in the wrong case', STATE({ state: 'Expanded' })],
    ['no state', STATE({ state: undefined })],
    ['equals as a string', STATE({ equals: 'true' })],
    ['equals as a number', STATE({ equals: 1 })],
    ['equals null', STATE({ equals: null })],
    ['no equals', STATE({ equals: undefined })],
    ['a text locator', { action: 'expect_state', text: 'Grupo', state: 'expanded', equals: true }],
    ['a selector locator', { action: 'expect_state', selector: '#g', state: 'expanded', equals: true }],
    ['no locator at all', { action: 'expect_state', state: 'expanded', equals: true }],
    ['a role without a name', { action: 'expect_state', role: 'button', state: 'expanded', equals: true }],
    ['a role outside the closed list', { action: 'expect_state', role: 'banana', name: 'Grupo', state: 'expanded', equals: true }],
  ];
  for (const [label, step] of bad) {
    const r = validateStep('browser', step);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${label} was accepted: ${JSON.stringify(step)}`);
  }
  assert.equal(validateStep('http', STATE())?.code, 'PLAN_ENTRY_INVALID', 'expect_state is not an http action');
});

test('AC-10 validateStep accepts expect_not_visible by role and name or by text, and refuses a bare selector, a mixed form and no locator', () => {
  assert.equal(validateStep('browser', ABSENT), null);
  assert.equal(validateStep('browser', { action: 'expect_not_visible', role: 'listitem', name: 'Buy milk' }), null);
  /** @type {[string, any][]} */
  const bad = [
    ['a bare selector', { action: 'expect_not_visible', selector: '.x' }],
    ['a selector with a role', { action: 'expect_not_visible', selector: '.x', role: 'listitem', name: 'a' }],
    ['text with a role', { action: 'expect_not_visible', text: 'a', role: 'listitem', name: 'a' }],
    ['a role without a name', { action: 'expect_not_visible', role: 'listitem' }],
    ['an empty text', { action: 'expect_not_visible', text: '   ' }],
    ['no locator at all', { action: 'expect_not_visible' }],
  ];
  for (const [label, step] of bad) {
    assert.equal(validateStep('browser', step)?.code, 'PLAN_ENTRY_INVALID', `${label} was accepted: ${JSON.stringify(step)}`);
  }
  assert.equal(validateStep('http', ABSENT)?.code, 'PLAN_ENTRY_INVALID', 'expect_not_visible is not an http action');
});

test('AC-10 the expect_state and expect_not_visible validators are total: a hostile JSON value is PLAN_ENTRY_INVALID, never a thrown error', () => {
  const hostile = [JSON.parse('{"toString":1}'), JSON.parse('{"toString":null}'), JSON.parse('[{"toString":1}]'), JSON.parse('{"toString":{"toString":1}}')];
  /** @type {[string, (v: any) => any][]} */
  const builders = [
    ['state', (v) => STATE({ state: v })],
    ['equals', (v) => STATE({ equals: v })],
    ['state name', (v) => STATE({ name: v })],
    ['state role', (v) => STATE({ role: v })],
    ['absence text', (v) => ({ action: 'expect_not_visible', text: v })],
    ['absence name', (v) => ({ action: 'expect_not_visible', role: 'listitem', name: v })],
    ['absence role', (v) => ({ action: 'expect_not_visible', role: v, name: 'a' })],
  ];
  for (const [field, build] of builders) {
    for (const value of hostile) {
      /** @type {any} */ let one;
      /** @type {any} */ let many;
      assert.doesNotThrow(() => {
        one = validateStep('browser', build(value));
        many = validateSteps('browser', [GOTO, HEAD, build(value)], []);
      }, `${field} ${JSON.stringify(value)} threw`);
      assert.equal(one?.code, 'PLAN_ENTRY_INVALID', `${field} ${JSON.stringify(value)}`);
      assert.equal(many?.code, 'PLAN_ENTRY_INVALID', `${field} ${JSON.stringify(value)} as a sequence`);
      assert.match(String(many?.reason), /^step 3:/);
    }
  }
});

test('AC-10 an expect_not_visible with no earlier positive step on the same route since the last goto is PLAN_ENTRY_INVALID, naming its step position and never its locator', () => {
  const OTHER = { action: 'goto', path: '/other' };
  /** @type {[string, any[], number][]} */
  const refused = [
    ['an absence alone', [ABSENT], 1],
    ['an absence right after the goto', [GOTO, ABSENT], 2],
    ['the positive step only comes after the absence', [GOTO, ABSENT, HEAD], 2],
    ['the positive step is on another route', [GOTO, HEAD, OTHER, ABSENT], 4],
    ['a goto to the same path reloads the page and drops the anchor', [GOTO, HEAD, GOTO, ABSENT], 4],
    ['expect_url asserts a path, not that anything rendered', [GOTO, { action: 'expect_url', path: '/form' }, ABSENT], 3],
    ['a click is an action, not an assertion', [GOTO, { action: 'click', role: 'button', name: 'Salvar' }, ABSENT], 3],
    ['a fill is an action, not an assertion', [GOTO, { action: 'fill', role: 'textbox', name: 'Telefone', value: 'x' }, ABSENT], 3],
    ['expect_url to another route leaves the anchor behind', [GOTO, HEAD, { action: 'expect_url', path: '/elsewhere' }, ABSENT], 4],
    ['an absence cannot anchor another absence', [GOTO, ABSENT, ABSENT], 2],
  ];
  for (const [label, steps, at] of refused) {
    const r = validateSteps('browser', steps, []);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${label}: ${JSON.stringify(r)}`);
    assert.match(String(r?.reason), new RegExp(`^step ${at}:`), label);
    assert.ok(String(r?.reason).includes('expect_not_visible'), `${label}: the refusal does not name the step kind: ${r?.reason}`);
    assert.ok(!String(r?.reason).includes('Mensagem'), `${label}: the refusal echoes the locator: ${r?.reason}`);
  }
});

test('AC-10 every positive assertion anchors an absence on its route, a chain of absences keeps the anchor, and a later goto needs its own anchor', () => {
  /** @type {[string, any[]][]} */
  const accepted = [
    ['expect_visible by role and name', [GOTO, HEAD, ABSENT]],
    ['expect_visible by text', [GOTO, { action: 'expect_visible', text: 'Perfil' }, ABSENT]],
    ['a legacy expect_visible by selector', [GOTO, { action: 'expect_visible', selector: 'h1' }, ABSENT]],
    ['expect_text by role and name', [GOTO, { action: 'expect_text', role: 'heading', name: 'Perfil', contains: 'Perfil' }, ABSENT]],
    ['a legacy expect_text by selector', [GOTO, { action: 'expect_text', selector: 'h1', contains: 'Perfil' }, ABSENT]],
    ['expect_value', [GOTO, VALUE, ABSENT]],
    ['expect_state', [GOTO, STATE(), ABSENT]],
    ['a chain of absences', [GOTO, HEAD, ABSENT, ABSENT]],
    ['an expect_url to the same route keeps the anchor', [GOTO, HEAD, { action: 'expect_url', path: '/form' }, ABSENT]],
    ['a second route with its own anchor', [GOTO, HEAD, { action: 'goto', path: '/other' }, HEAD, ABSENT]],
  ];
  for (const [label, steps] of accepted) {
    assert.equal(validateSteps('browser', steps, []), null, label);
  }
  assert.equal(validateSteps('browser', [GOTO, { action: 'click', role: 'button', name: 'Salvar' }], [])?.code, 'NO_EXPECTATION', 'a click alone is still not an expectation');
});

// ---------------------------------------------------------------------------
// 2. precheckGroundedSteps for the two new locator steps
// ---------------------------------------------------------------------------

const SNAPSHOTS = [
  {
    schema_version: 1,
    role: 'anonymous',
    route: '/form',
    entries: [
      { kind: 'role', role: 'button', name: 'Grupo', matches: 1 },
      { kind: 'role', role: 'button', name: 'Gemeo', matches: 2 },
      { kind: 'role', role: 'listitem', name: 'Buy milk', matches: 1 },
      { kind: 'text', text: 'Mensagem visivel', matches: 1 },
    ],
    withheld: 0,
  },
];
/** @param {any[]} steps @param {string | null} [role] */
const pre = (steps, role = null) => precheckGroundedSteps(steps, SNAPSHOTS, 'Open the form and see the group.', role);

test('AC-10 a state or absence step on a snapshot entry of its own route and role, matched exactly once, is grounded', () => {
  assert.equal(pre([GOTO, STATE()]), null);
  assert.equal(pre([GOTO, { action: 'expect_not_visible', role: 'listitem', name: 'Buy milk' }]), null);
  assert.equal(pre([GOTO, ABSENT]), null);
});

// PRD AC-6: a locator that is neither a snapshot entry with matches 1 nor a word of the report is PLAN_ENTRY_INVALID.
test('AC-10 a state or absence step on an unknown, ambiguous, mis-kinded, wrong-role or route-less locator is PLAN_ENTRY_INVALID and the refusal echoes no locator', () => {
  /** @type {[string, any, string | null][]} */
  const cases = [
    ['an unknown state locator', pre([GOTO, STATE({ name: 'Inexistente' })]), null],
    ['a state locator the snapshot counted twice', pre([GOTO, STATE({ name: 'Gemeo' })]), '2 elements'],
    ['an absence locator the snapshot counted twice', pre([GOTO, { action: 'expect_not_visible', role: 'button', name: 'Gemeo' }]), '2 elements'],
    ['an absence text the snapshot does not list', pre([GOTO, { action: 'expect_not_visible', text: 'Nada aqui' }]), null],
    ['a role entry named as text', pre([GOTO, { action: 'expect_not_visible', text: 'Grupo' }]), null],
    ['no goto before the locator', pre([STATE()]), null],
    ['a route with no snapshot', pre([{ action: 'goto', path: '/missing' }, STATE()]), null],
    ['a role the snapshots do not cover', pre([GOTO, STATE()], 'admin'), null],
  ];
  for (const [label, r, part] of cases) {
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${label}: ${JSON.stringify(r)}`);
    assert.match(String(r?.reason), /^step \d+:/, label);
    if (part !== null) assert.ok(String(r?.reason).includes(part), `${label}: ${r?.reason}`);
    assert.ok(!/Grupo|Gemeo|Inexistente|Nada aqui|Buy milk|Mensagem/.test(String(r?.reason)), `${label}: the refusal echoes a locator: ${r?.reason}`);
  }
});

// ---------------------------------------------------------------------------
// 3. settleAssertion with a fake clock, and ariaExpandedOf
// ---------------------------------------------------------------------------

/** A fake clock: sleeping advances it, so a loop bounded by the clock ends with no real wait. */
function fakeClock() {
  let t = 0;
  /** @type {number[]} */ const slept = [];
  return {
    now: () => t,
    sleep: async (/** @type {number} */ ms) => {
      slept.push(ms);
      t += ms;
    },
    advance: (/** @type {number} */ ms) => {
      t += ms;
    },
    elapsed: () => t,
    slept,
  };
}

test('AC-10 settleAssertion accepts a first read that matches, with no wait', async () => {
  const clock = fakeClock();
  const r = await settleAssertion(async () => 'x', (v) => v === 'x', { now: clock.now, sleep: clock.sleep });
  assert.deepEqual(r, { status: 'accepted', reads: 1 });
  assert.equal(clock.elapsed(), 0);
});

test('AC-10 settleAssertion re-reads until a read matches: a state that settles after the first reads is accepted', async () => {
  const clock = fakeClock();
  let n = 0;
  const r = await settleAssertion(async () => (++n < 3 ? 'collapsed' : 'expanded'), (v) => v === 'expanded', { now: clock.now, sleep: clock.sleep });
  assert.deepEqual(r, { status: 'accepted', reads: 3 });
  assert.equal(clock.elapsed(), 2 * ASSERT_POLL_INTERVAL_MS, 'it waited one interval per re-read');
});

test('AC-10 settleAssertion rejects at the bound when every read succeeds and none matches, using the whole window and no more', async () => {
  const clock = fakeClock();
  const r = await settleAssertion(async () => 'collapsed', (v) => v === 'expanded', { now: clock.now, sleep: clock.sleep });
  assert.equal(r.status, 'rejected');
  assert.ok(r.reads >= 2, `a single read cannot be a re-read: ${r.reads}`);
  assert.ok(clock.elapsed() <= ASSERT_SETTLE_MS, `it waited past the bound: ${clock.elapsed()}`);
  assert.ok(clock.elapsed() >= ASSERT_SETTLE_MS - ASSERT_POLL_INTERVAL_MS, `it stopped well before the bound: ${clock.elapsed()}`);
});

test('AC-10 settleAssertion honours a caller bound and interval', async () => {
  const clock = fakeClock();
  const r = await settleAssertion(async () => 0, (v) => v === 1, { boundMs: 1000, intervalMs: 250, now: clock.now, sleep: clock.sleep });
  assert.equal(r.status, 'rejected');
  // It re-read at the caller's interval and stopped at the caller's bound (not at the defaults): between three and
  // four re-reads fit in 1000 ms at 250 ms, whichever way the boundary read is counted.
  assert.ok(clock.slept.length >= 3 && clock.slept.length <= 4, JSON.stringify(clock.slept));
  assert.ok(clock.slept.every((ms) => ms === 250), JSON.stringify(clock.slept));
  assert.ok(clock.elapsed() <= 1000 && clock.elapsed() >= 750, `elapsed ${clock.elapsed()}`);
  assert.equal(r.reads, clock.slept.length + 1, 'one read before the first wait and one after each');
});

test('AC-10 settleAssertion is unreadable, never accepted, when no read ever succeeds, even when the acceptance test would accept anything', async () => {
  const clock = fakeClock();
  const r = await settleAssertion(
    async () => {
      throw new Error('no value');
    },
    () => true,
    { now: clock.now, sleep: clock.sleep },
  );
  assert.equal(r.status, 'unreadable');
  assert.ok(r.reads >= 2, 'a read that throws is retried within the window');
  assert.ok(clock.elapsed() <= ASSERT_SETTLE_MS);
});

test('AC-10 settleAssertion treats a throwing read as unreadable for that round only: a later matching read is accepted, a later throw after a non-match is a rejection', async () => {
  const clockA = fakeClock();
  let a = 0;
  const accepted = await settleAssertion(
    async () => {
      if (++a < 3) throw new Error('not yet readable');
      return 'expanded';
    },
    (v) => v === 'expanded',
    { now: clockA.now, sleep: clockA.sleep },
  );
  assert.equal(accepted.status, 'accepted');
  assert.equal(accepted.reads, 3);

  const clockB = fakeClock();
  let b = 0;
  const rejected = await settleAssertion(
    async () => {
      if (++b === 1) return 'collapsed';
      throw new Error('gone');
    },
    (v) => v === 'expanded',
    { now: clockB.now, sleep: clockB.sleep },
  );
  assert.equal(rejected.status, 'rejected', 'one successful non-matching read means the value was readable and did not match');
});

test('AC-10 settleAssertion stops on the clock, not on a read count, when every read itself takes time', async () => {
  const clock = fakeClock();
  const r = await settleAssertion(
    async () => {
      clock.advance(400);
      return 'collapsed';
    },
    (v) => v === 'expanded',
    { boundMs: 1000, intervalMs: 100, now: clock.now, sleep: clock.sleep },
  );
  assert.equal(r.status, 'rejected');
  assert.ok(r.reads >= 2, `it did not re-read: ${r.reads}`);
  assert.ok(r.reads < 10, `reads ${r.reads}`);
});

test('AC-10 the settle result carries a status and a read count only, never the value it read', async () => {
  const secret = 'secret-field-value-7731';
  const clock = fakeClock();
  const matched = await settleAssertion(async () => secret, (v) => v === secret, { now: clock.now, sleep: clock.sleep });
  const missed = await settleAssertion(async () => secret, (v) => v === 'other', { now: clock.now, sleep: clock.sleep });
  for (const r of [matched, missed]) {
    assert.deepEqual(Object.keys(r).sort(), ['reads', 'status']);
    assert.ok(!JSON.stringify(r).includes(secret), JSON.stringify(r));
  }
  assert.equal(matched.status, 'accepted');
  assert.equal(missed.status, 'rejected');
});

test('AC-10 the exported settle window is longer than its interval, so a value or a state is re-read at least once', () => {
  assert.ok(ASSERT_POLL_INTERVAL_MS > 0);
  assert.ok(ASSERT_SETTLE_MS > ASSERT_POLL_INTERVAL_MS);
});

test('AC-10 ariaExpandedOf reads only the strings true and false and treats every other attribute as no state, so an element with no expanded state is never read as collapsed', () => {
  assert.equal(ariaExpandedOf('true'), true);
  assert.equal(ariaExpandedOf('false'), false);
  for (const none of [null, undefined, '', 'mixed', 'TRUE', 'False', ' true', 'yes', 0, 1, true, false, {}]) {
    assert.equal(ariaExpandedOf(none), null, JSON.stringify(none));
  }
});

// ---------------------------------------------------------------------------
// 4. The real runner and a real Chromium
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
const hits = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

const PAGE = [
  '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Perfil</title></head><body>',
  '<h1>Perfil</h1>',
  '<button id="grp" type="button" aria-expanded="false">Grupo</button>',
  '<button id="slow" type="button" aria-expanded="false">Lento</button>',
  '<button id="save" type="button" disabled>Salvar</button>',
  '<button id="send" type="button">Enviar</button>',
  '<input id="acc" type="checkbox" checked><label for="acc">Aceito</label>',
  '<input id="news" type="checkbox"><label for="news">Novidades</label>',
  '<div id="mix" role="checkbox" aria-checked="mixed" aria-label="Parcial" tabindex="0"></div>',
  '<p id="msg">Mensagem visivel</p>',
  '<p id="note">Aviso temporario</p>',
  // Present in the document and hidden: the "hidden" half of "hidden or absent".
  '<p id="shy" hidden>Texto escondido</p>',
  '<button id="hide" type="button">Esconder</button>',
  '<button id="hideslow" type="button">Esconder devagar</button>',
  '<button class="twin" type="button">Gemeo</button><button class="twin" type="button">Gemeo</button>',
  '<script>',
  'document.getElementById("grp").onclick = function () { this.setAttribute("aria-expanded", this.getAttribute("aria-expanded") === "true" ? "false" : "true"); };',
  // A state that settles shortly AFTER the step that triggered it, so only a re-read can see it.
  'document.getElementById("slow").onclick = function () { var b = this; setTimeout(function () { b.setAttribute("aria-expanded", "true"); }, 400); };',
  'document.getElementById("hide").onclick = function () { document.getElementById("msg").remove(); };',
  'document.getElementById("hideslow").onclick = function () { setTimeout(function () { document.getElementById("note").remove(); }, 400); };',
  '</script></body></html>',
].join('');

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
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

/** A login stub: it only exists so a case that reached the session stage would leave a trace. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  'writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [], origins: [] }));',
].join('\n');

const SEED_STATE = 'A state exists';

/** @param {string} r @param {string} name */
const roleEntry = (r, name) => ({ kind: 'role', role: r, name, matches: 1 });

/**
 * One fixture project: the report, the plan and the hand-written snapshot of `/form`.
 * @param {{ title: string, steps: any[], role?: string | null, state?: string }[]} defs
 * @returns {{ root: string, runDir: string, marker: string }}
 */
function fixture(defs) {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const marker = join(root, 'seed-marker.txt');
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  writeFileSync(
    join(root, 'PRPs', 'auth', 'qa-seed.json'),
    JSON.stringify({
      states: { [SEED_STATE]: { command: [NODE, '-e', 'require("node:fs").writeFileSync(process.argv[1], "ran")', marker], status: 'confirmed', store: 'localhost:5432' } },
    }),
  );
  const blocks = defs.map((d, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${d.title}`,
      '**Risk level:** low',
      `**Required state:** ${d.state === undefined ? 'None' : SEED_STATE}`,
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      '1. Open the form.',
      '2. Check the element.',
      '',
    ].join('\n'),
  );
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: d.role ?? null, state: d.state ?? 'none', steps: d.steps })),
    }),
  );
  const entries = [
    roleEntry('heading', 'Perfil'),
    roleEntry('button', 'Grupo'),
    roleEntry('button', 'Lento'),
    roleEntry('button', 'Salvar'),
    roleEntry('button', 'Enviar'),
    roleEntry('checkbox', 'Aceito'),
    roleEntry('checkbox', 'Novidades'),
    roleEntry('checkbox', 'Parcial'),
    roleEntry('button', 'Esconder'),
    roleEntry('button', 'Esconder devagar'),
    // The snapshot claims Gemeo is unique; the page renders it twice, so only the run-time count can stop the step.
    roleEntry('button', 'Gemeo'),
    { kind: 'text', text: 'Mensagem visivel', matches: 1 },
    { kind: 'text', text: 'Aviso temporario', matches: 1 },
    { kind: 'text', text: 'Texto escondido', matches: 1 },
    // Listed at plan time, absent at run time.
    { kind: 'text', text: 'Fantasma', matches: 1 },
  ];
  writeFileSync(join(runDir, 'grounding', 'anonymous--form.snapshot.json'), JSON.stringify({ schema_version: 1, role: 'anonymous', route: '/form', entries, withheld: 0 }));
  // The refused entry is fully grounded for its own role and route, so only the anchor rule stands between it and
  // a seed, a login and a page load: were the rule missing or late, the entry would run and leave its traces. The
  // control entry has the same shape on its own route and carries an anchor, so it must leave exactly those traces.
  const adminEntries = [roleEntry('heading', 'Perfil'), { kind: 'text', text: 'Fantasma', matches: 1 }];
  for (const [file, route] of [['admin--refused.snapshot.json', '/refused'], ['admin--control.snapshot.json', '/control']]) {
    writeFileSync(join(runDir, 'grounding', file), JSON.stringify({ schema_version: 1, role: 'admin', route, entries: adminEntries, withheld: 0 }));
  }
  return { root, runDir, marker };
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, results: any }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    // Below the test timeout, so a hang ends the child (and the sandbox cleanup can run) before the test is abandoned.
    const timer = setTimeout(() => child.kill(), 260000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      resolveP({ code, stdout, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason]);

test('AC-10 end to end: a state passes only when it equals the declared value, a state the element does not expose is blocked and never passes, and a state that settles after the step began is still read', SLOW, async () => {
  const group = { role: 'button', name: 'Grupo' };
  const fx = fixture([
    {
      title: 'Every state matches',
      steps: [
        GOTO,
        HEAD,
        { action: 'expect_state', ...group, state: 'expanded', equals: false },
        { action: 'click', ...group },
        { action: 'expect_state', ...group, state: 'expanded', equals: true },
        { action: 'expect_state', role: 'button', name: 'Salvar', state: 'disabled', equals: true },
        { action: 'expect_state', role: 'button', name: 'Enviar', state: 'disabled', equals: false },
        { action: 'expect_state', role: 'checkbox', name: 'Aceito', state: 'checked', equals: true },
        { action: 'expect_state', role: 'checkbox', name: 'Novidades', state: 'checked', equals: false },
      ],
    },
    { title: 'Collapsed but expanded declared', steps: [GOTO, HEAD, { action: 'expect_state', ...group, state: 'expanded', equals: true }] },
    { title: 'Disabled but enabled declared', steps: [GOTO, HEAD, { action: 'expect_state', role: 'button', name: 'Salvar', state: 'disabled', equals: false }] },
    { title: 'Unchecked but checked declared', steps: [GOTO, HEAD, { action: 'expect_state', role: 'checkbox', name: 'Novidades', state: 'checked', equals: true }] },
    { title: 'No expanded state exposed', steps: [GOTO, HEAD, { action: 'expect_state', role: 'button', name: 'Enviar', state: 'expanded', equals: false }] },
    { title: 'Not a checkbox', steps: [GOTO, HEAD, { action: 'expect_state', role: 'button', name: 'Enviar', state: 'checked', equals: false }] },
    { title: 'Mixed checkbox declared unchecked', steps: [GOTO, HEAD, { action: 'expect_state', role: 'checkbox', name: 'Parcial', state: 'checked', equals: false }] },
    { title: 'Mixed checkbox declared checked', steps: [GOTO, HEAD, { action: 'expect_state', role: 'checkbox', name: 'Parcial', state: 'checked', equals: true }] },
    { title: 'State that settles later', steps: [GOTO, HEAD, { action: 'click', role: 'button', name: 'Lento' }, { action: 'expect_state', role: 'button', name: 'Lento', state: 'expanded', equals: true }] },
  ]);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.match(String(r.results.report_sha256_before), /^[0-9a-f]{64}$/);
  assert.equal(r.results.report_sha256_after, r.results.report_sha256_before, 'the QA report changed during the run');
  const c = r.results.cases;
  /** @type {[string, string | null][]} */
  const want = [
    ['pass', null],
    ['fail', null],
    ['fail', null],
    ['fail', null],
    ['blocked', 'STEP_NOT_PERFORMABLE'],
    ['blocked', 'STEP_NOT_PERFORMABLE'],
    ['blocked', 'STEP_NOT_PERFORMABLE'],
    ['blocked', 'STEP_NOT_PERFORMABLE'],
    ['pass', null],
  ];
  assert.equal(c.length, want.length);
  for (const [i, [outcome, code]] of want.entries()) {
    assert.deepEqual([c[i].outcome, c[i].reason_code], [outcome, code], `case ${i + 1}: ${brief(c[i])}`);
  }

  // A failed or blocked state names the step position and the closed state word, and carries no locator name.
  for (const [i, state] of [[1, 'expanded'], [2, 'disabled'], [3, 'checked']]) {
    assert.match(c[i].reason, /^step 3:/, brief(c[i]));
    assert.ok(c[i].reason.includes(state), `case ${i + 1} reason does not name the state: ${c[i].reason}`);
  }
  for (const i of [4, 5, 6, 7]) assert.match(c[i].reason, /^step 3:/, brief(c[i]));
  for (const x of c) assert.ok(!/Grupo|Salvar|Enviar|Aceito|Novidades|Parcial|Lento/.test(String(x.reason ?? '')), `a reason echoes a locator name: ${x.reason}`);

  // The per-step record: every step of the passing case passed; the failing step is the only one marked failed.
  assert.deepEqual(c[0].steps.map((/** @type {any} */ s) => s.result), Array(9).fill('passed'));
  assert.deepEqual(c[1].steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'failed']);
  assert.equal(c[0].steps[2].action, 'expect_state');
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-10 end to end: an absence passes only when the grounded locator is hidden or absent, a visible element fails, a locator that matches twice asserts nothing, and an entry with no anchor is refused before anything is seeded, authenticated or requested', SLOW, async () => {
  const fx = fixture([
    { title: 'Hidden after a delayed removal', steps: [GOTO, HEAD, { action: 'click', role: 'button', name: 'Esconder devagar' }, { action: 'expect_not_visible', text: 'Aviso temporario' }] },
    { title: 'Absent from the start', steps: [GOTO, HEAD, { action: 'expect_not_visible', text: 'Fantasma' }] },
    { title: 'Still visible', steps: [GOTO, HEAD, ABSENT] },
    { title: 'Matches twice at run time', steps: [GOTO, HEAD, { action: 'expect_not_visible', role: 'button', name: 'Gemeo' }] },
    { title: 'No anchor', role: 'admin', state: 'declared', steps: [{ action: 'goto', path: '/refused' }, { action: 'expect_not_visible', text: 'Fantasma' }] },
    { title: 'Anchored by a state step', steps: [GOTO, { action: 'expect_state', role: 'checkbox', name: 'Aceito', state: 'checked', equals: true }, { action: 'expect_not_visible', text: 'Fantasma' }] },
    { title: 'Present but hidden', steps: [GOTO, HEAD, { action: 'expect_not_visible', text: 'Texto escondido' }] },
    { title: 'Removed at once by a click', steps: [GOTO, HEAD, { action: 'click', role: 'button', name: 'Esconder' }, ABSENT] },
  ]);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.equal(r.results.report_sha256_after, r.results.report_sha256_before, 'the QA report changed during the run');
  const c = r.results.cases;
  /** @type {[string, string | null][]} */
  const want = [['pass', null], ['pass', null], ['fail', null], ['needs-human', 'STEP_UNGROUNDED'], ['needs-human', 'PLAN_ENTRY_INVALID'], ['pass', null], ['pass', null], ['pass', null]];
  assert.equal(c.length, want.length);
  for (const [i, [outcome, code]] of want.entries()) {
    assert.deepEqual([c[i].outcome, c[i].reason_code], [outcome, code], `case ${i + 1}: ${brief(c[i])}`);
  }
  assert.match(c[2].reason, /^step 3:/, 'the failed absence names its step position');
  assert.match(c[3].reason, /2 elements/, 'the ambiguity names the count');
  assert.deepEqual(c[3].steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'failed']);

  // The refused entry: named by step position, no locator, and no side effect of any kind.
  assert.match(c[4].reason, /^step 2:/);
  assert.ok(c[4].reason.includes('expect_not_visible'), c[4].reason);
  for (const x of c) assert.ok(!/Fantasma|Gemeo|Mensagem|Aviso/.test(String(x.reason ?? '')), `a reason echoes a locator: ${x.reason}`);
  assert.equal(hits['/refused'] ?? 0, 0, 'the refused entry loaded its page');
  assert.equal(existsSync(join(fx.root, 'PRPs', 'auth', '.sessions')), false, 'the refused entry obtained a session');
  assert.equal(existsSync(fx.marker), false, 'the refused entry seeded its state');
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-10 control: the entry shape that is refused for want of an anchor (a role, a declared state and a seed command) seeds, logs in and loads its page once it carries one', SLOW, async () => {
  const fx = fixture([{ title: 'Anchored twin', role: 'admin', state: 'declared', steps: [{ action: 'goto', path: '/control' }, HEAD, { action: 'expect_not_visible', text: 'Fantasma' }] }]);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const [c] = r.results.cases;
  assert.deepEqual([c.outcome, c.reason_code], ['pass', null], brief(c));
  // Without these three traces, "the refused entry left none" in the test above would prove nothing.
  assert.ok((hits['/control'] ?? 0) >= 1, 'the anchored twin did not load its page');
  assert.equal(existsSync(join(fx.root, 'PRPs', 'auth', '.sessions')), true, 'the anchored twin did not obtain a session');
  assert.equal(existsSync(fx.marker), true, 'the anchored twin did not seed its state');
});
