// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-11 A value the report leaves open may be chosen only when it is a declared capture or a literal found in a grounding snapshot; an unmarked chosen literal is refused
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-12 A step marked as a write runs only for a role the kit declares dedicated; otherwise the case is blocked ROLE_NOT_DEDICATED before any seed, session or request
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-22 The command doc, the knowledge base and the site state chosen_inputs and effect (a marked example each)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-23 The seed command and the run command recommend capturing the seeded username and entity names, with an equals {{username}} example
/**
 * Phase 4 (chosen inputs, dedicated writes and capture guidance) of qa-runner-ai-executable-steps.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-4-chosen-inputs-dedicated-writes-and-capture-guidance.plan.md
 *              (AC-A1 / AC-A2 chosen inputs, AC-A3 / AC-A4 the effect key and the dedicated role, AC-A5 the capture
 *              guidance, AC-A6 the documents)
 *
 * Layers, all over the REAL runner module, command docs, knowledge base and site pages (read from disk, never edited):
 *   1. The `effect` step key: the one legal value, the three legal actions, every other combination refused with
 *      a reason that echoes no value.
 *   2. firstWriteStep and isDedicatedRole: the first marked step, and the strict boolean flag (a null or missing role,
 *      a string "true", a number and a malformed config are not dedicated).
 *   3. chosen_inputs: validateChosenInputs (shape), chosenFillValues, chosenSnapshotRefusal (the literal is found,
 *      whitespace collapsed and case ignored, in a snapshot entry, at least 3 characters) and groundLocators with a
 *      chosen fill as the second source of an expectation (only for a LATER step; an unmarked literal stays refused).
 *   4. The real runner, in a child process, with no browser: a write by a role that is not dedicated is blocked
 *      ROLE_NOT_DEDICATED before any seed or request, a dedicated role passes the gate, chosen refusals are
 *      PLAN_ENTRY_INVALID, and no chosen literal and no role name reaches results.json.
 *   5. The documents: the three marked examples of the run command validate against the script, the seed command
 *      and the auth-scripts command carry their paragraphs, and the knowledge base and site pages name the keys.
 *      Tokens only; nothing depends on the plugin version.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixture spawns with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'chosen-demo';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261021T000000000Z`;
const SLOW = { timeout: 280000 };

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} t */
const flat = (t) => t.replace(/\s+/g, ' ').trim();
/** @param {string} html */
const htmlText = (html) => flat(html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&rsquo;/g, "'"));

const CANARY = 'canary-zq91-value';
const GOTO = { action: 'goto', path: '/' };

// ---------------------------------------------------------------------------
// 1. The effect step key (PRD AC-12)
// ---------------------------------------------------------------------------

test('AC-12 effect "write" is accepted on a click, a fill and an http request, and on nothing else', () => {
  assert.equal(R.validateStep('browser', { action: 'click', role: 'button', name: 'Save', effect: 'write' }), null);
  assert.equal(R.validateStep('browser', { action: 'fill', selector: '#q', value: 'x', effect: 'write' }), null);
  assert.equal(R.validateStep('http', { action: 'request', method: 'POST', path: '/x', expect_status: 200, effect: 'write' }), null);
  for (const step of [
    { action: 'expect_visible', role: 'button', name: 'Save', effect: 'write' },
    { action: 'goto', path: '/', effect: 'write' },
  ]) {
    assert.equal(R.validateStep('browser', step)?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(step));
  }
  assert.equal(R.validateStep('http', { action: 'query', source: 'd1', sql: 'SELECT 1', expect_rows: 1, effect: 'write' })?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-12 every effect value other than the string write is PLAN_ENTRY_INVALID and the reason echoes no value', () => {
  for (const bad of ['read', 'WRITE', 'write ', true, 1, null, {}, ['write'], CANARY]) {
    const r = R.validateStep('browser', { action: 'click', role: 'button', name: 'Save', effect: bad });
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(bad));
    assert.ok(!String(r?.reason).includes(CANARY), `the reason echoed the value: ${r?.reason}`);
  }
});

test('AC-12 a step marked as a write inside a plan is reported with its position', () => {
  const r = R.validateSteps('browser', [GOTO, { action: 'click', role: 'button', name: 'Save', effect: 'read' }], []);
  assert.equal(r?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(r?.reason), /^step 2: /);
});

// ---------------------------------------------------------------------------
// 2. firstWriteStep and isDedicatedRole (PRD AC-12)
// ---------------------------------------------------------------------------

test('AC-12 firstWriteStep is the zero-based index of the first marked step, or -1, and never throws', () => {
  assert.equal(R.firstWriteStep([GOTO, { action: 'click', selector: '#a', effect: 'write' }, { action: 'click', selector: '#b', effect: 'write' }]), 1);
  assert.equal(R.firstWriteStep([GOTO, { action: 'click', selector: '#a' }]), -1);
  assert.equal(R.firstWriteStep([]), -1);
  for (const hostile of [null, undefined, {}, 'x', 7, [null, 3, 'x', []]]) assert.equal(R.firstWriteStep(hostile), -1, JSON.stringify(hostile));
});

test('AC-12 isDedicatedRole is true only for the boolean true on the role entry of the parsed config', () => {
  const cfg = { roles: { a: { dedicated: true }, b: { dedicated: 'true' }, c: {}, d: null, e: { dedicated: 1 }, f: { dedicated: false }, g: { dedicated: [true] } } };
  assert.equal(R.isDedicatedRole(cfg, 'a'), true);
  for (const role of ['b', 'c', 'd', 'e', 'f', 'g', 'zz', '__proto__', 'toString', 'constructor', null, undefined, 7, {}]) {
    assert.equal(R.isDedicatedRole(cfg, role), false, String(role));
  }
  for (const config of [null, undefined, {}, { roles: [] }, { roles: 'a' }, { roles: null }, 'x', 7, []]) {
    assert.equal(R.isDedicatedRole(config, 'a'), false, JSON.stringify(config));
  }
});

// ---------------------------------------------------------------------------
// 3. chosen_inputs (PRD AC-11)
// ---------------------------------------------------------------------------

const FILL = { action: 'fill', role: 'textbox', name: 'Busca', value: 'Maria' };
const BOUND = { action: 'fill', role: 'textbox', name: 'Busca', value: '{{username}}' };
const STEPS = [GOTO, FILL, BOUND, { action: 'click', role: 'button', name: 'Ok' }];
/** @param {Record<string, any>} [o] */
const item = (o = {}) => ({ step: 2, source: 'snapshot', reason: 'the page lists it', ...o });

test('AC-11 chosen_inputs names the vocabulary: two sources and a limit of twenty items', () => {
  assert.deepEqual([...R.CHOSEN_INPUT_SOURCES], ['capture', 'snapshot']);
  assert.equal(R.CHOSEN_INPUTS_MAX, 20);
});

test('AC-11 validateChosenInputs accepts an absent key, a snapshot literal fill and a capture-bound fill', () => {
  assert.equal(R.validateChosenInputs('browser', STEPS, undefined), null);
  assert.equal(R.validateChosenInputs('browser', STEPS, [item()]), null);
  assert.equal(R.validateChosenInputs('browser', STEPS, [item(), item({ step: 3, source: 'capture' })]), null);
});

test('AC-11 validateChosenInputs refuses every malformed key as PLAN_ENTRY_INVALID, prefixed chosen_inputs, never echoing the value', () => {
  /** @type {[string, string, any][]} */
  const table = [
    ['http entry', 'http', [item()]],
    ['null', 'browser', null],
    ['string', 'browser', 'x'],
    ['object', 'browser', {}],
    ['empty array', 'browser', []],
    ['number', 'browser', 7],
    ['null item', 'browser', [null]],
    ['string item', 'browser', ['x']],
    ['array item', 'browser', [[]]],
    ['step is a goto', 'browser', [item({ step: 1 })]],
    ['step is a click', 'browser', [item({ step: 4 })]],
    ['step past the end', 'browser', [item({ step: 9 })]],
    ['step zero', 'browser', [item({ step: 0 })]],
    ['step as a string', 'browser', [item({ step: '2' })]],
    ['fractional step', 'browser', [item({ step: 2.5 })]],
    ['unknown source', 'browser', [item({ source: 'other' })]],
    ['non-string source', 'browser', [item({ source: 5 })]],
    ['empty reason', 'browser', [item({ reason: '' })]],
    ['blank reason', 'browser', [item({ reason: '  ' })]],
    ['reason of 201 characters', 'browser', [item({ reason: 'x'.repeat(201) })]],
    ['non-string reason', 'browser', [item({ reason: 5 })]],
    ['extra key', 'browser', [item({ extra: 1 })]],
    ['repeated step', 'browser', [item(), item()]],
    ['capture source on a literal', 'browser', [item({ source: 'capture' })]],
    ['snapshot source on a binding', 'browser', [item({ step: 3 })]],
    ['twenty-one items', 'browser', Array.from({ length: 21 }, () => item())],
  ];
  for (const [label, driver, chosen] of table) {
    const r = R.validateChosenInputs(driver, STEPS, chosen);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', label);
    assert.ok(String(r?.reason).startsWith('chosen_inputs: '), `${label}: ${r?.reason}`);
    assert.ok(!String(r?.reason).includes('Maria'), `${label}: the refusal echoed the chosen value`);
  }
  assert.equal(R.validateChosenInputs('browser', 'x', [item()])?.code, 'PLAN_ENTRY_INVALID', 'steps that are not an array');
  assert.ok(String(R.validateChosenInputs('browser', STEPS, [item({ reason: CANARY + 'x'.repeat(300) })])?.reason).indexOf(CANARY) === -1, 'the refusal echoed the reason');
});

test('AC-11 validateChosenInputs accepts exactly twenty items and a reason of exactly 200 characters', () => {
  const many = [GOTO, ...Array.from({ length: 20 }, (_, i) => ({ action: 'fill', role: 'textbox', name: `Campo ${i}`, value: `valor ${i}` }))];
  const items = Array.from({ length: 20 }, (_, i) => item({ step: i + 2, reason: 'x'.repeat(200) }));
  assert.equal(R.validateChosenInputs('browser', many, items), null);
});

test('AC-11 chosenFillValues lists the literal values of the chosen fills with their step index and skips bindings and non-fills', () => {
  assert.deepEqual(R.chosenFillValues(STEPS, [item(), item({ step: 3, source: 'capture' }), item({ step: 4 }), null, 'x']), [{ at: 1, value: 'Maria' }]);
  assert.deepEqual(R.chosenFillValues(null, null), []);
  assert.deepEqual(R.chosenFillValues(STEPS, undefined), []);
  assert.deepEqual(R.chosenFillValues(STEPS, [{ step: 'a' }, { step: 99 }]), []);
});

/** @param {string} route @param {any[]} entries */
const snap = (route, entries, role = 'anonymous') => ({ schema_version: 1, role, route, entries, withheld: 0 });
const SNAPS = [
  snap('/', [
    { kind: 'role', role: 'link', name: 'Maria  Silva', matches: 1 },
    { kind: 'text', text: 'Resultado', matches: 1 },
  ]),
  null,
  5,
  { entries: 'x' },
];
/** @param {string} value */
const withValue = (value) => [GOTO, { ...FILL, value }];

test('AC-11 a snapshot-sourced chosen literal is accepted when a snapshot entry name or text contains it, whitespace collapsed and case ignored', () => {
  assert.equal(R.chosenSnapshotRefusal(STEPS, [item()], SNAPS), null);
  assert.equal(R.chosenSnapshotRefusal(withValue('maria silva'), [item()], SNAPS), null, 'case and inner whitespace fold');
  assert.equal(R.chosenSnapshotRefusal(withValue('  SILVA '), [item()], SNAPS), null, 'a part of an entry name is found');
  assert.equal(R.chosenSnapshotRefusal(withValue('Resultado'), [item()], SNAPS), null, 'a text entry counts');
  assert.equal(R.chosenSnapshotRefusal(STEPS, undefined, SNAPS), null);
  assert.equal(R.chosenSnapshotRefusal(STEPS, [item({ source: 'capture', step: 3 })], []), null, 'a capture source needs no snapshot');
});

test('AC-11 a snapshot-sourced chosen literal found in no snapshot, or shorter than 3 characters, is PLAN_ENTRY_INVALID and the reason names an item, never the literal', () => {
  for (const value of ['Joao Pereira', 'Ma', '', '  ', 'zz']) {
    const r = R.chosenSnapshotRefusal(withValue(value), [item()], SNAPS);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(value));
    assert.ok(String(r?.reason).startsWith('chosen_inputs: item 1'), String(r?.reason));
    assert.ok(!String(r?.reason).includes('Joao') && !String(r?.reason).includes('Pereira'), 'the refusal echoed the literal');
  }
  assert.equal(R.chosenSnapshotRefusal(withValue('Maria'), [item()], []).code, 'PLAN_ENTRY_INVALID', 'no snapshot at all lists nothing');
  assert.equal(R.chosenSnapshotRefusal(STEPS, [item(), null, 'x', { source: 'snapshot' }], SNAPS)?.code, 'PLAN_ENTRY_INVALID', 'an item that names no step chose nothing a snapshot lists');
  assert.match(String(R.chosenSnapshotRefusal(withValue('Joao Pereira'), [item({ source: 'capture' }), item()], SNAPS)?.reason), /item 2/, 'the position is that of the refused item');
});

test('AC-11 a snapshot entry that is not a role name or a text (a withheld or other kind) does not make a literal choosable', () => {
  const odd = [snap('/', [{ kind: 'role', role: 'textbox', name: 'Busca', matches: 1 }, { kind: 'withheld', text: 'Maria', matches: 1 }, { kind: 'text', name: 'Maria', matches: 1 }])];
  assert.equal(R.chosenSnapshotRefusal(withValue('Maria'), [item()], odd)?.code, 'PLAN_ENTRY_INVALID');
});

// An expectation may expect a chosen value (PRD AC-11).
const SNAP = snap('/', [{ kind: 'role', role: 'textbox', name: 'Busca', matches: 1 }]);
const MANUAL = 'Open the page and use the search.';
/** @param {Record<string, any>} o */
const exp = (o) => ({ action: 'expect_value', role: 'textbox', name: 'Busca', ...o });

test('AC-11 an unmarked chosen literal is refused as an expectation, and an earlier chosen fill makes it expectable', () => {
  const flow = [GOTO, FILL, exp({ equals: 'Maria' })];
  const refused = R.groundLocators(flow, [SNAP], MANUAL, null).refusal;
  assert.equal(refused?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(refused?.reason), /^step 3: expect_value equals must come from the report's own steps or be bound by a declared capture$/);
  assert.equal(R.groundLocators(flow, [SNAP], MANUAL, null, [item()]).refusal, null);
});

test('AC-11 a chosen fill counts only for a LATER step, only when the item names a fill, and equals needs the whole chosen value', () => {
  const early = [GOTO, exp({ equals: 'Maria' }), FILL];
  assert.equal(R.groundLocators(early, [SNAP], MANUAL, null, [item({ step: 3 })]).refusal?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(R.groundLocators([GOTO, FILL, exp({ equals: 'Maria' })], [SNAP], MANUAL, null, [item({ step: 1 })]).refusal?.code, 'PLAN_ENTRY_INVALID', 'an item on a goto chooses nothing');
  assert.equal(R.groundLocators([GOTO, FILL, exp({ equals: 'Mar' })], [SNAP], MANUAL, null, [item()]).refusal?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(R.groundLocators([GOTO, FILL, exp({ contains: 'Mar' })], [SNAP], MANUAL, null, [item()]).refusal, null, 'contains may use a part of the chosen value');
  assert.equal(R.groundLocators([GOTO, FILL, exp({ equals: 'maria' })], [SNAP], MANUAL, null, [item()]).refusal, null, 'the comparison folds case like the report comparison');
  assert.equal(R.groundLocators([GOTO, FILL, exp({ contains: 'Joana' })], [SNAP], MANUAL, null, [item()]).refusal?.code, 'PLAN_ENTRY_INVALID', 'a part of nothing');
});

test('AC-11 an expect_text contains may use the chosen value too, and not without the declaration', () => {
  const textFlow = [GOTO, FILL, { action: 'expect_text', text: 'Resultado', contains: 'Maria' }];
  const manual = `${MANUAL} See Resultado.`;
  const refused = R.groundLocators(textFlow, [SNAP], manual, null).refusal;
  assert.equal(refused?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(refused?.reason), /^step 3: expect_text contains must come from the report's own steps, not from the snapshot$/);
  assert.equal(R.groundLocators(textFlow, [SNAP], manual, null, [item()]).refusal, null);
});

test('AC-11 the chosen parameter is optional and grounding never throws on a hostile chosen_inputs', () => {
  assert.equal(R.groundLocators.length, 4, 'the fifth parameter is a default parameter');
  assert.equal(R.precheckGroundedSteps.length, 4);
  const flow = [GOTO, FILL, exp({ equals: 'Maria' })];
  for (const hostile of ['x', null, {}, 7, [null], [{ step: 'a' }], [{ step: 2, source: 'snapshot' }]]) {
    assert.doesNotThrow(() => R.groundLocators(flow, [SNAP], MANUAL, null, hostile), JSON.stringify(hostile));
  }
});

// ---------------------------------------------------------------------------
// 4. The real runner, no browser (PRD AC-11 and AC-12)
// ---------------------------------------------------------------------------

const LITERAL = 'zz-chosen-literal';
const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v3p4-chosen-'));
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

/** @type {Record<string, number>} */
const hits = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, raw: string | null, results: any }>}
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
    const timer = setTimeout(() => child.kill(), 260000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      const raw = existsSync(file) ? readFileSync(file, 'utf8') : null;
      resolveP({ code, stdout, stderr, raw, results: raw === null ? null : JSON.parse(raw) });
    });
  });
}

test('AC-11 AC-12 end to end: a write by a role that is not dedicated is blocked before any seed or request, a dedicated role passes the gate, and a chosen literal no snapshot lists is refused', SLOW, async () => {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  // Slugs that appear in no sentence of the runner, so an echoed role name cannot hide in a common word.
  const PLAIN = 'role-plain-qx7';
  const STRINGY = 'role-stringy-qx7';
  const OFF = 'role-off-qx7';
  const DEDICATED = 'role-dedicated-qx7';
  const GHOST = 'role-ghost-qx7';
  const SLUGS = [PLAIN, STRINGY, OFF, DEDICATED, GHOST];
  writeFileSync(
    join(root, 'PRPs', 'auth', 'login.config.json'),
    JSON.stringify({ baseUrl, roles: { [PLAIN]: {}, [STRINGY]: { dedicated: 'true' }, [OFF]: { dedicated: false }, [DEDICATED]: { dedicated: true } } }),
  );
  const WRITE_STATE = 'A seeded row exists for the write cases';
  const READ_STATE = 'A seeded row exists for the read case';
  const markerOf = (/** @type {string} */ name) => join(root, name).replace(/\\/g, '/');
  const seedCommand = (/** @type {string} */ marker) => [NODE, '-e', `require('node:fs').writeFileSync(${JSON.stringify(markerOf(marker))}, 'seeded'); console.log(JSON.stringify({ id: 'row-1' }))`];
  writeFileSync(
    join(root, 'PRPs', 'auth', 'qa-seed.json'),
    JSON.stringify({
      states: {
        [WRITE_STATE]: { command: seedCommand('seeded-write.marker'), status: 'confirmed', store: 'localhost:5432', captures: { id: { path: 'id' } } },
        [READ_STATE]: { command: seedCommand('seeded-read.marker'), status: 'confirmed', store: 'localhost:5432', captures: { id: { path: 'id' } } },
      },
    }),
  );
  writeFileSync(
    join(runDir, 'grounding', 'anonymous--search.snapshot.json'),
    JSON.stringify(snap('/search', [{ kind: 'role', role: 'textbox', name: 'Buscar', matches: 1 }, { kind: 'role', role: 'link', name: 'Maria Silva', matches: 1 }])),
  );

  writeFileSync(
    join(runDir, 'grounding', `${PLAIN}--search.snapshot.json`),
    JSON.stringify(snap('/search', [{ kind: 'role', role: 'textbox', name: 'Buscar', matches: 1 }, { kind: 'role', role: 'link', name: 'Maria Silva', matches: 1 }], PLAIN)),
  );

  const SAVE = { action: 'click', selector: '#save', effect: 'write' };
  const URLOK = { action: 'expect_url', path: '/' };
  const FILL_CHOSEN = { action: 'fill', role: 'textbox', name: 'Buscar', value: 'maria silva' };
  const EXPECT_CHOSEN = { action: 'expect_value', role: 'textbox', name: 'Buscar', equals: 'maria silva' };
  /** @type {{ title: string, driver?: string, role: string | null, state?: string, steps: any[], chosen_inputs?: any[], manual?: string[] }[]} */
  const defs = [
    { title: 'Write by a plain role', role: PLAIN, state: WRITE_STATE, steps: [GOTO, SAVE, URLOK] },
    { title: 'Write by an anonymous visitor', role: null, steps: [GOTO, SAVE, URLOK] },
    { title: 'Write by a role flagged with a string', role: STRINGY, steps: [GOTO, SAVE, URLOK] },
    { title: 'Write by a role flagged false', role: OFF, steps: [GOTO, SAVE, URLOK] },
    { title: 'Write by a role the kit does not list', role: GHOST, steps: [GOTO, SAVE, URLOK] },
    { title: 'Fill marked as a write by a plain role', role: PLAIN, steps: [GOTO, URLOK, { action: 'fill', selector: '#q', value: 'x', effect: 'write' }] },
    { title: 'Request marked as a write by a plain role', driver: 'http', role: PLAIN, steps: [{ action: 'request', method: 'POST', path: '/probe-write', expect_status: 200, effect: 'write' }] },
    { title: 'Write by a dedicated role', role: DEDICATED, steps: [GOTO, SAVE, URLOK] },
    { title: 'Read by a plain role', role: PLAIN, state: READ_STATE, steps: [GOTO, URLOK] },
    { title: 'Read request with no session', driver: 'http', role: null, steps: [{ action: 'request', method: 'GET', path: '/probe-read', session: 'none', expect_status: 200 }] },
    {
      title: 'Chosen literal no snapshot lists',
      role: null,
      steps: [{ action: 'goto', path: '/search' }, { action: 'fill', selector: '#q', value: LITERAL }, { action: 'expect_url', path: '/search' }],
      chosen_inputs: [{ step: 2, source: 'snapshot', reason: 'picked from the page' }],
    },
    { title: 'Chosen input on a step that is not a fill', role: null, steps: [GOTO, URLOK], chosen_inputs: [{ step: 1, source: 'snapshot', reason: 'wrong step' }] },
    {
      title: 'Chosen literal a snapshot lists',
      role: PLAIN,
      steps: [{ action: 'goto', path: '/search' }, FILL_CHOSEN, EXPECT_CHOSEN],
      chosen_inputs: [{ step: 2, source: 'snapshot', reason: 'the report asks for a search and names no text' }],
    },
    { title: 'Same literal, no declaration', role: PLAIN, steps: [{ action: 'goto', path: '/search' }, FILL_CHOSEN, EXPECT_CHOSEN] },
  ];
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', `**Required state:** ${d.state ?? 'None'}`, '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', '2. Check the result.', ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: defs.map((d, i) => ({
        index: i + 1,
        title: d.title,
        driver: d.driver ?? 'browser',
        role: d.role,
        state: d.state === undefined ? 'none' : 'declared',
        steps: d.steps,
        ...(d.chosen_inputs === undefined ? {} : { chosen_inputs: d.chosen_inputs }),
      })),
    }),
  );

  const r = await runRunner(root);
  assert.ok(r.results, `no results.json: ${r.stdout} ${r.stderr}`);
  const c = r.results.cases;
  assert.equal(c.length, defs.length);
  /** @param {number} i */
  const at = (i) => [c[i].outcome, c[i].reason_code];
  const show = (/** @type {number} */ i) => `case ${i + 1} (${defs[i].title}): ${JSON.stringify(c[i])}`;

  // AC-12: every marked step with a role the kit does not declare dedicated ends blocked, naming the step.
  for (const i of [0, 1, 2, 3, 4, 5, 6]) {
    assert.deepEqual(at(i), ['blocked', 'ROLE_NOT_DEDICATED'], show(i));
    assert.ok(String(c[i].reason).includes(R.REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason), `the catalogue sentence is the reason: ${show(i)}`);
  }
  assert.match(c[0].reason, /^step 2: /, show(0));
  assert.match(c[5].reason, /^step 3: /, 'the position is that of the first MARKED step, not of the first step');
  assert.match(c[6].reason, /^step 1: /, show(6));

  // AC-12: nothing was seeded and nothing was requested for a refused write; the read control proves the probes can fire.
  assert.ok(!existsSync(join(root, 'seeded-write.marker')), 'a seed command ran for a refused write');
  assert.equal(hits['/probe-write'], undefined, 'a request reached the server for a refused write');
  assert.ok(existsSync(join(root, 'seeded-read.marker')), 'control: a read case seeds its state');
  assert.ok((hits['/probe-read'] ?? 0) >= 1, 'control: a read request reaches the server');
  assert.deepEqual(at(9), ['pass', null], show(9));

  // AC-12: a dedicated role passes the gate (it ends for another reason, or passes), and a read never meets it.
  for (const i of [7, 8]) assert.notEqual(c[i].reason_code, 'ROLE_NOT_DEDICATED', show(i));

  // AC-11: a chosen literal that no snapshot lists, or a chosen input on a step that is not a fill, ends needs-human.
  assert.deepEqual(at(10), ['needs-human', 'PLAN_ENTRY_INVALID'], show(10));
  assert.match(c[10].reason, /^chosen_inputs: item 1 /, show(10));
  assert.deepEqual(at(11), ['needs-human', 'PLAN_ENTRY_INVALID'], show(11));
  assert.match(c[11].reason, /^chosen_inputs: /, show(11));

  // AC-11: a literal a snapshot lists, folded for case, is accepted by the gate and may be expected afterwards;
  // the same plan without the declaration is refused at the expectation.
  assert.ok(!String(c[12].reason ?? '').includes('chosen_inputs') && c[12].reason_code !== 'PLAN_ENTRY_INVALID', show(12));
  assert.deepEqual(at(13), ['needs-human', 'PLAN_ENTRY_INVALID'], show(13));
  assert.match(c[13].reason, /^step 3: expect_value equals must come from/, show(13));

  // No chosen literal, no snapshot name and no role name reaches results.json or any reason.
  const raw = /** @type {string} */ (r.raw);
  for (const word of [LITERAL, 'maria silva']) assert.ok(!raw.toLowerCase().includes(word), `results.json carries ${word}`);
  for (const [i, x] of c.entries()) {
    // A session failure legitimately names the role it could not log in; the claim is about the refusals of this change.
    if (x.reason_code !== 'ROLE_NOT_DEDICATED' && x.reason_code !== 'PLAN_ENTRY_INVALID') continue;
    for (const slug of SLUGS) assert.ok(!String(x.reason ?? '').includes(slug), `a reason names a role: ${show(i)}`);
  }
});

// ---------------------------------------------------------------------------
// 5. The documents (PRD AC-22, AC-23)
// ---------------------------------------------------------------------------

const RUN_DOC_FILE = 'plugins/relay/commands/relay-qa-run.md';
const RUN_DOC = read(RUN_DOC_FILE);
const SEED_DOC = read('plugins/relay/commands/relay-qa-seed.md');
const AUTH_DOC = read('plugins/relay/commands/relay-auth-scripts.md');
const STEP_BLOCK = /<!-- qa-step-example driver=(\w+) -->[ \t]*\n```json\n([\s\S]*?)\n```/g;
const ENTRY_BLOCK = /<!-- qa-plan-entry-example -->[ \t]*\n```json\n([\s\S]*?)\n```/g;
const STEP_EXAMPLES = [...RUN_DOC.matchAll(STEP_BLOCK)].map((m) => ({ driver: m[1], step: JSON.parse(m[2]) }));
const ENTRY_EXAMPLES = [...RUN_DOC.matchAll(ENTRY_BLOCK)].map((m) => JSON.parse(m[1]));
/** @param {string} text @param {string} start @returns {string} the one paragraph starting with `start`, flattened */
function paragraphStarting(text, start) {
  const found = text.split(/\n\s*\n/).map(flat).filter((p) => p.startsWith(start));
  assert.equal(found.length, 1, `exactly one paragraph must start with ${start}, found ${found.length}`);
  return found[0];
}

test('AC-22 the run command carries one marked write example that validates alone', () => {
  const write = STEP_EXAMPLES.filter((e) => e.step.effect === 'write');
  assert.equal(write.length, 1, 'exactly one marked step example carries effect');
  assert.equal(R.validateStep(write[0].driver, write[0].step), null);
  assert.ok(['click', 'fill', 'request'].includes(write[0].step.action));
});

test('AC-22 the run command carries one marked plan-entry example with chosen_inputs that validates, grounds and is refused without its declaration', () => {
  const entries = ENTRY_EXAMPLES.filter((e) => e.chosen_inputs !== undefined);
  assert.equal(entries.length, 1, 'exactly one marked plan-entry example carries chosen_inputs');
  const e = entries[0];
  assert.equal(R.validatePlanClassification(e), null);
  assert.equal(R.validateSteps(e.driver, e.steps, []), null);
  assert.equal(R.validateChosenInputs(e.driver, e.steps, e.chosen_inputs), null);
  // The example is a coherent plan: its literal is one the page lists, and its expectation uses the chosen value.
  const chosenStep = e.steps[e.chosen_inputs[0].step - 1];
  assert.equal(chosenStep.action, 'fill');
  const route = e.steps.find((/** @type {any} */ s) => s.action === 'goto').path;
  const page = [snap(route, [{ kind: 'role', role: chosenStep.role, name: chosenStep.name, matches: 1 }, { kind: 'role', role: 'link', name: `Ver ${chosenStep.value} agora`, matches: 1 }])];
  assert.equal(R.chosenSnapshotRefusal(e.steps, e.chosen_inputs, page), null);
  assert.equal(R.groundLocators(e.steps, page, '', e.role, e.chosen_inputs).refusal, null);
  assert.equal(R.groundLocators(e.steps, page, '', e.role).refusal?.code, 'PLAN_ENTRY_INVALID', 'without the declaration the expectation is an unmarked chosen literal');
});

test('AC-22 the run command states the two sources, the 3-character floor, the 200-character reason and the dedicated flag', () => {
  const chosen = paragraphStarting(RUN_DOC, 'Chosen inputs.');
  const rest = flat(RUN_DOC.slice(RUN_DOC.indexOf('Chosen inputs. When the report leaves a value open'), RUN_DOC.indexOf('Seed captures worth using.')));
  for (const token of ['chosen_inputs', '"source": "capture"', '"source": "snapshot"', 'at least 3 characters', 'at most 200 characters', 'PLAN_ENTRY_INVALID', '<RUN_DIR>/grounding/']) {
    assert.ok(rest.includes(token), `the chosen-inputs block lacks ${token}`);
  }
  assert.ok(chosen.length > 0);
  for (const token of ['"effect"', '"write"', '"dedicated": true', 'PRPs/auth/login.config.json', 'ROLE_NOT_DEDICATED', 'never write it']) {
    assert.ok(rest.includes(token), `the write-steps block lacks ${token}`);
  }
  const limit = RUN_DOC.slice(RUN_DOC.indexOf('Honesty rules:'));
  assert.ok(flat(limit).includes('chosen_inputs') && flat(limit).includes('"effect": "write"'), 'the honesty rules lack the chosen-input and write bullet');
});

test('AC-23 the run command carries one marked equals {{username}} example that validates only when username is a declared capture', () => {
  const user = STEP_EXAMPLES.filter((e) => e.step.action === 'expect_value' && e.step.equals === '{{username}}');
  assert.equal(user.length, 1, 'exactly one marked equals {{username}} example');
  assert.equal(R.validateStep(user[0].driver, user[0].step), null);
  assert.equal(R.validateSteps('browser', [GOTO, user[0].step], ['username']), null);
  assert.equal(R.validateSteps('browser', [GOTO, user[0].step], [])?.code, 'PLAN_ENTRY_INVALID', 'an unbound username is refused, so the doc cannot teach an invented binding');
  const guidance = paragraphStarting(RUN_DOC, 'Seed captures worth using.');
  for (const token of ['username', 'not_empty', 'never edits the declaration']) {
    assert.ok(flat(RUN_DOC.slice(RUN_DOC.indexOf('Seed captures worth using.'), RUN_DOC.indexOf('The paragraphs that follow'))).includes(token), `the seed-capture block lacks ${token}`);
  }
  assert.ok(guidance.includes('seeded'));
});

test('AC-23 the seed command recommends capturing the seeded username and entity names in prose, and still never writes captures', () => {
  const text = flat(SEED_DOC);
  for (const token of ['recommend', '`captures`', '`username`', 'equals {{username}}', 'seeded row', 'never writes `captures`']) {
    assert.ok(text.includes(token), `relay-qa-seed.md lacks ${token}`);
  }
  assert.ok(text.indexOf('equals {{username}}') < text.indexOf('Constraints (hard rules)'), 'the recommendation belongs to the final output, before the constraints');
});

test('AC-12 the auth-scripts command documents the dedicated key as operator-set, never generated, never changed by the merge or the refresh', () => {
  const dedicated = paragraphStarting(AUTH_DOC, 'Dedicated roles.');
  for (const token of ['"dedicated": true', 'by hand', 'QA runner', 'never writes the key', '--refresh', 'boolean `true`', 'no credential']) {
    assert.ok(dedicated.includes(token), `the dedicated paragraph lacks ${token}`);
  }
  const text = flat(AUTH_DOC);
  assert.ok(text.indexOf('Dedicated roles.') < text.indexOf('Which roles `--refresh` covers.'), 'the paragraph sits before the refresh role-set paragraph');
  assert.ok(text.includes('**The only files written**'), 'the pinned only-files-written sentence is intact');
  const template = read('plugins/relay/resources/auth-login.template.mjs');
  assert.ok(!template.includes('dedicated'), 'the kit login template must not generate or read the dedicated flag');
});

test('AC-22 the knowledge base and the site pages name both declarations and the five new exports are real', () => {
  const names = ['validateChosenInputs', 'chosenSnapshotRefusal', 'chosenFillValues', 'firstWriteStep', 'isDedicatedRole'];
  for (const name of names) assert.equal(typeof (/** @type {any} */ (R))[name], 'function', `${name} is not an export`);
  const api = read('docs/api-reference.md');
  for (const name of names) assert.ok(api.includes(`\`${name}\``), `docs/api-reference.md does not name ${name}`);
  for (const [file, text] of /** @type {[string, string][]} */ ([
    ['docs/api-reference.md', flat(api)],
    ['docs/domain/glossary.md', flat(read('docs/domain/glossary.md'))],
    ['docs/domain/flows.md', flat(read('docs/domain/flows.md'))],
    ['documentation/reference/commands.html', htmlText(read('documentation/reference/commands.html'))],
    ['documentation/changelog.html', htmlText(read('documentation/changelog.html'))],
  ])) {
    for (const token of ['chosen_inputs', 'dedicated', 'ROLE_NOT_DEDICATED']) assert.ok(text.includes(token), `${file} lacks ${token}`);
  }
  const scripts = htmlText(read('documentation/reference/scripts.html'));
  for (const name of names) assert.ok(scripts.includes(name), `documentation/reference/scripts.html does not name ${name}`);
});
