// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-9 An input value is asserted and never written (equals, contains and not_empty with {{name}} bindings pass or fail on the comparison; the evidence records the comparison result and never the input's value)
// PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md Task 1 (the validators of the new step are total: a plan entry carrying a hostile JSON value is PLAN_ENTRY_INVALID, never a thrown error, as AC-7 of the PRD requires of the plan-entry validator)
/**
 * Phase 4 (request without a session, input value, absence and state), input-value half, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-4-request-without-a-session-input-value-absence-and-state.plan.md
 *              (AC-A3 the comparison and its bindings, AC-A4 the value is never written)
 *
 * Layers, all against the REAL runner (never edited):
 *   1. validateStep / validateSteps / precheckGroundedSteps: the closed forms of `expect_value`, the {{name}}
 *      bindings validated before any side effect, the literal that must come from the report, and totality
 *      over hostile JSON.
 *   2. comparisonKindOf and compareInputValue: the comparison semantics, and a result that carries a closed
 *      word and a verdict, never the value.
 *   3. The runner as an ASYNC child process against a loopback page and a real Chromium: each comparison
 *      passes and fails, a bound `equals` compares against the seeded capture, an element with no value is a
 *      blocked case and never a pass, the comparison evidence is a closed shape attributed to its step, the
 *      input value reaches no run file and no terminal stream, and the final screenshot masks the field (two
 *      pages that differ only in the field value give identical masked captures, and the same two pages
 *      without an expect_value step give different ones, so the comparison can see a visible value).
 *
 * Every git call the runner makes carries a hermetic environment (core.fsmonitor=false so no daemon is
 * started, an empty global config, discovery stopped at the sandbox's parent); the sandbox is removed
 * afterwards and every server is closed.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import {
  validateStep,
  validateSteps,
  precheckGroundedSteps,
  comparisonKindOf,
  compareInputValue,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p4-value-'));
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

const GOTO = { action: 'goto', path: '/profile' };
const HEADING = { action: 'expect_visible', role: 'heading', name: 'Perfil' };
/** @param {Record<string, any>} extra */
const VALUE = (extra) => ({ action: 'expect_value', role: 'textbox', name: 'Telefone', ...extra });

// ---------------------------------------------------------------------------
// 1. The closed forms, the bindings, the literal rule and totality
// ---------------------------------------------------------------------------

test('AC-9 validateStep accepts expect_value with exactly one of equals, contains or not_empty on a role-and-name locator', () => {
  assert.equal(validateStep('browser', VALUE({ not_empty: true })), null);
  assert.equal(validateStep('browser', VALUE({ equals: 'x' })), null);
  assert.equal(validateStep('browser', VALUE({ contains: 'x' })), null);
  assert.equal(validateStep('browser', VALUE({ equals: '' })), null, 'equals with an empty string asserts an empty field and must be accepted');
});

test('AC-9 validateStep refuses every malformed expect_value as PLAN_ENTRY_INVALID', () => {
  /** @type {[string, any][]} */
  const bad = [
    ['no comparison', VALUE({})],
    ['two comparisons', VALUE({ equals: 'a', contains: 'b' })],
    ['all three comparisons', VALUE({ equals: 'a', contains: 'b', not_empty: true })],
    ['not_empty false', VALUE({ not_empty: false })],
    ['not_empty as a string', VALUE({ not_empty: 'true' })],
    ['empty contains', VALUE({ contains: '' })],
    ['numeric equals', VALUE({ equals: 5 })],
    ['null equals', VALUE({ equals: null })],
    ['numeric contains', VALUE({ contains: 5 })],
    ['a text locator', { action: 'expect_value', text: 'Telefone', not_empty: true }],
    ['a selector locator', { action: 'expect_value', selector: '#tel', not_empty: true }],
    ['a role without a name', { action: 'expect_value', role: 'textbox', not_empty: true }],
    ['a role outside the closed list', { action: 'expect_value', role: 'banana', name: 'Telefone', not_empty: true }],
    ['no locator at all', { action: 'expect_value', not_empty: true }],
  ];
  for (const [label, step] of bad) {
    const r = validateStep('browser', step);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', `${label} was accepted: ${JSON.stringify(step)}`);
  }
  assert.equal(validateStep('http', VALUE({ not_empty: true }))?.code, 'PLAN_ENTRY_INVALID', 'expect_value is not an http action');
});

test('AC-9 the expect_value validators are total: a hostile JSON value is PLAN_ENTRY_INVALID, never a thrown error', () => {
  const hostile = [JSON.parse('{"toString":1}'), JSON.parse('{"toString":null}'), JSON.parse('[{"toString":1}]'), JSON.parse('{"toString":{"toString":1}}')];
  /** @type {[string, (v: any) => any][]} */
  const builders = [
    ['equals', (v) => VALUE({ equals: v })],
    ['contains', (v) => VALUE({ contains: v })],
    ['not_empty', (v) => VALUE({ not_empty: v })],
    ['name', (v) => ({ action: 'expect_value', role: 'textbox', name: v, not_empty: true })],
    ['role', (v) => ({ action: 'expect_value', role: v, name: 'Telefone', not_empty: true })],
  ];
  for (const [field, build] of builders) {
    for (const value of hostile) {
      /** @type {any} */ let one;
      /** @type {any} */ let many;
      assert.doesNotThrow(() => {
        one = validateStep('browser', build(value));
        many = validateSteps('browser', [GOTO, HEADING, build(value)], []);
      }, `${field} ${JSON.stringify(value)} threw`);
      assert.equal(one?.code, 'PLAN_ENTRY_INVALID', `${field} ${JSON.stringify(value)}`);
      assert.equal(many?.code, 'PLAN_ENTRY_INVALID', `${field} ${JSON.stringify(value)} as a sequence`);
      assert.match(String(many?.reason), /^step 3:/);
    }
  }
});

test('AC-9 {{name}} bindings in equals and contains are validated before any side effect: an unbound name is refused by name and step, a bound one is accepted', () => {
  const unbound = validateSteps('browser', [GOTO, HEADING, VALUE({ equals: '{{phone}}' })], []);
  assert.equal(unbound?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(unbound?.reason), /^step 3:/);
  assert.ok(String(unbound?.reason).includes('phone'), String(unbound?.reason));
  assert.equal(validateSteps('browser', [GOTO, HEADING, VALUE({ equals: '{{phone}}' })], ['phone']), null);
  assert.equal(validateSteps('browser', [GOTO, HEADING, VALUE({ contains: 'x {{ddd}} y' })], ['ddd']), null);
  assert.equal(validateSteps('browser', [GOTO, HEADING, VALUE({ contains: 'x {{ddd}} y' })], ['other'])?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-9 an expect_value step counts as an expectation: an entry whose only expectation is a value comparison is not NO_EXPECTATION', () => {
  assert.equal(validateSteps('browser', [GOTO, VALUE({ not_empty: true })], []), null);
  assert.equal(validateSteps('browser', [GOTO, { action: 'click', role: 'button', name: 'Salvar' }], [])?.code, 'NO_EXPECTATION');
});

const SNAPSHOTS = [
  {
    schema_version: 1,
    role: 'anonymous',
    route: '/profile',
    entries: [
      { kind: 'role', role: 'textbox', name: 'Telefone', matches: 1 },
      { kind: 'role', role: 'textbox', name: 'Gemeo', matches: 2 },
    ],
    withheld: 0,
  },
];
const MANUAL = '1. Open the profile.\n2. The phone equals 55  1199.';
/** @param {any[]} steps @param {any} [manual] */
const pre = (steps, manual = MANUAL) => precheckGroundedSteps(steps, SNAPSHOTS, manual, null);

test('AC-9 a literal equals or contains must come from the report own steps, whitespace and case insensitively, and the refusal names the key and never the literal', () => {
  const foreign = pre([GOTO, VALUE({ equals: 'zz999 absent' })]);
  assert.equal(foreign?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(foreign?.reason), /^step 2:/);
  assert.ok(String(foreign?.reason).includes('equals'), String(foreign?.reason));
  assert.ok(!String(foreign?.reason).includes('zz999'), `the refusal echoes the literal: ${foreign?.reason}`);
  const foreignContains = pre([GOTO, VALUE({ contains: 'zz999 absent' })]);
  assert.equal(foreignContains?.code, 'PLAN_ENTRY_INVALID');
  assert.ok(String(foreignContains?.reason).includes('contains'), String(foreignContains?.reason));
  assert.equal(pre([GOTO, VALUE({ equals: '55 1199' })]), null, 'a literal from the report must pass, whitespace-insensitively');
  assert.equal(pre([GOTO, VALUE({ contains: 'PHONE   EQUALS' })]), null, 'the substring test is case-insensitive');
  assert.equal(pre([GOTO, VALUE({ equals: '55 1199' })], null)?.code, 'PLAN_ENTRY_INVALID', 'a missing manual text fails the expectation');
  assert.equal(pre([GOTO, VALUE({ equals: '55 1199' })], 42)?.code, 'PLAN_ENTRY_INVALID', 'a non-string manual text fails the expectation');
});

test('AC-9 a binding or not_empty needs no literal in the report, and the binding test keeps no state between calls', () => {
  assert.equal(pre([GOTO, VALUE({ not_empty: true })]), null);
  for (let round = 0; round < 3; round++) {
    assert.equal(pre([GOTO, VALUE({ contains: '{{phone}}' })]), null, `a binding was refused in round ${round}`);
    assert.equal(pre([GOTO, VALUE({ equals: 'zz999 absent' })])?.code, 'PLAN_ENTRY_INVALID', `a literal was accepted in round ${round}`);
    assert.equal(pre([GOTO, VALUE({ equals: 'prefix {{a}} {{b}}' })]), null, `a mixed binding was refused in round ${round}`);
  }
});

// PRD AC-6: neither a snapshot entry with matches 1 nor a word of the report is PLAN_ENTRY_INVALID.
test('AC-9 an expect_value on a locator the snapshot lacks, or lists twice, is PLAN_ENTRY_INVALID and names no locator', () => {
  const missing = pre([GOTO, { action: 'expect_value', role: 'textbox', name: 'Inexistente', not_empty: true }]);
  assert.equal(missing?.code, 'PLAN_ENTRY_INVALID');
  const twin = pre([GOTO, { action: 'expect_value', role: 'textbox', name: 'Gemeo', not_empty: true }]);
  assert.equal(twin?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(twin?.reason), /2 elements/);
  for (const r of [missing, twin]) assert.ok(!/Inexistente|Gemeo/.test(String(r?.reason)), `the refusal echoes a locator: ${r?.reason}`);
  assert.equal(precheckGroundedSteps([GOTO, VALUE({ not_empty: true })], [], MANUAL, null)?.code, 'PLAN_ENTRY_INVALID', 'no snapshot covers the route');
});

// ---------------------------------------------------------------------------
// 2. The comparison semantics and a result that never carries the value
// ---------------------------------------------------------------------------

test('AC-9 comparisonKindOf names the one comparison a step declares, as a closed word', () => {
  assert.equal(comparisonKindOf({ not_empty: true }), 'not_empty');
  assert.equal(comparisonKindOf({ equals: 'a' }), 'equals');
  assert.equal(comparisonKindOf({ equals: '' }), 'equals');
  assert.equal(comparisonKindOf({ contains: 'a' }), 'contains');
  assert.equal(comparisonKindOf({}), null);
  assert.equal(comparisonKindOf({ contains: '' }), null);
  assert.equal(comparisonKindOf(null), null);
});

test('AC-9 compareInputValue: equals is exact, contains is a substring, not_empty ignores surrounding whitespace', () => {
  const passed = (/** @type {any} */ step, /** @type {any} */ value) => compareInputValue(step, value)?.passed;
  assert.equal(passed({ equals: 'abc' }, 'abc'), true);
  assert.equal(passed({ equals: 'abc' }, 'ABC'), false, 'no case folding');
  assert.equal(passed({ equals: 'abc' }, ' abc'), false, 'no trimming');
  assert.equal(passed({ equals: 'abc' }, 'abcd'), false);
  assert.equal(passed({ equals: '' }, ''), true);
  assert.equal(passed({ equals: '' }, 'x'), false);
  assert.equal(passed({ contains: 'cde' }, 'abcdef'), true);
  assert.equal(passed({ contains: 'xyz' }, 'abcdef'), false);
  assert.equal(passed({ not_empty: true }, ''), false);
  assert.equal(passed({ not_empty: true }, '   '), false);
  assert.equal(passed({ not_empty: true }, ' x '), true);
});

test('AC-9 compareInputValue gives null for a value that is not a string or a step that names no comparison, and its result carries only the closed word and the verdict', () => {
  assert.equal(compareInputValue({ equals: 'a' }, 5), null);
  assert.equal(compareInputValue({ equals: 'a' }, null), null);
  assert.equal(compareInputValue({}, 'a'), null);
  const secret = 'secret-field-value-7731';
  const r = compareInputValue({ contains: 'value' }, secret);
  assert.deepEqual(r, { kind: 'contains', passed: true });
  assert.ok(!JSON.stringify(r).includes(secret));
  assert.deepEqual(Object.keys(/** @type {any} */ (compareInputValue({ not_empty: true }, secret))).sort(), ['kind', 'passed']);
});

// ---------------------------------------------------------------------------
// 3. The real runner and a real Chromium
// ---------------------------------------------------------------------------

const VALUE_A = '11999990000';
const VALUE_B = '22888880000';
const PHONE_SEED = '11999990000';
/** The text of a textarea the page renders; it is never in the plan, so it must never be in a run file. */
const REMARK = 'Ola mundo cruel';
/** @type {Record<string, number>} */
const hits = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

/** @param {string} phone */
const pageOf = (phone) =>
  [
    '<!doctype html><html><head><meta charset="utf-8"><title>Perfil</title></head><body>',
    '<h1>Perfil</h1>',
    `<label for="tel">Telefone</label><input id="tel" type="text" value="${phone}">`,
    '<label for="nick">Apelido</label><input id="nick" type="text" value="Dudu">',
    '<label for="comp">Complemento</label><input id="comp" type="text" value="">',
    `<label for="obs">Observacao</label><textarea id="obs">${REMARK}</textarea>`,
    '<label for="uf">Estado</label><select id="uf"><option value="RJX1">Rio</option><option value="SPX9" selected>Sao Paulo</option></select>',
    '<button id="save" type="button">Salvar</button>',
    '</body></html>',
  ].join('');

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    const phone = path === '/profile' || path === '/formA' ? VALUE_A : path === '/formB' ? VALUE_B : null;
    if (phone === null) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(pageOf(phone));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
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

test('AC-9 end to end: each comparison passes and fails on a real page, a bound equals compares against the capture, a field with no value blocks, and the value is never written', SLOW, async () => {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  const SEED_STATE = 'A phone is on file';
  writeFileSync(
    join(root, 'PRPs', 'auth', 'qa-seed.json'),
    JSON.stringify({
      states: {
        [SEED_STATE]: {
          command: [NODE, '-e', `console.log(JSON.stringify({phone:${JSON.stringify(PHONE_SEED)}}))`],
          status: 'confirmed',
          store: 'localhost:5432',
          captures: { phone: { path: 'phone' } },
        },
      },
    }),
  );

  const role = (/** @type {string} */ r, /** @type {string} */ name) => ({ kind: 'role', role: r, name, matches: 1 });
  const snapshot = (/** @type {string} */ route, /** @type {any[]} */ entries) => JSON.stringify({ schema_version: 1, role: 'anonymous', route, entries, withheld: 0 });
  writeFileSync(
    join(runDir, 'grounding', 'anonymous--profile.snapshot.json'),
    snapshot('/profile', [
      role('heading', 'Perfil'),
      role('textbox', 'Telefone'),
      role('textbox', 'Apelido'),
      role('textbox', 'Complemento'),
      role('textbox', 'Observacao'),
      role('combobox', 'Estado'),
      role('button', 'Salvar'),
      // Listed at plan time, absent from the page at run time.
      role('textbox', 'Fantasma'),
    ]),
  );
  for (const [file, route] of [['anonymous--forma.snapshot.json', '/formA'], ['anonymous--formb.snapshot.json', '/formB'], ['anonymous--foreign.snapshot.json', '/foreign']]) {
    writeFileSync(join(runDir, 'grounding', file), snapshot(route, [role('heading', 'Perfil'), role('textbox', 'Telefone')]));
  }

  const nick = { role: 'textbox', name: 'Apelido' };
  /** @type {{ title: string, manual: string[], state?: string, steps: any[] }[]} */
  const defs = [
    {
      title: 'Passes every comparison',
      manual: ['1. Open the profile.', '2. The phone is not empty, holds a number containing 9999, and the nickname equals Dudu.'],
      steps: [GOTO, HEADING, VALUE({ not_empty: true }), VALUE({ contains: '9999' }), { action: 'expect_value', ...nick, equals: 'Dudu' }],
    },
    {
      title: 'Empty field',
      manual: ['1. Open the profile.', '2. The complement is filled.'],
      steps: [GOTO, HEADING, { action: 'expect_value', role: 'textbox', name: 'Complemento', not_empty: true }],
    },
    {
      title: 'Wrong equals',
      manual: ['1. Open the profile.', '2. The phone equals wrong-phone-text.'],
      steps: [GOTO, HEADING, VALUE({ equals: 'wrong-phone-text' })],
    },
    {
      title: 'No value to read',
      manual: ['1. Open the profile.', '2. The save button holds a value.'],
      steps: [GOTO, HEADING, { action: 'expect_value', role: 'button', name: 'Salvar', not_empty: true }],
    },
    {
      title: 'Bound equals',
      manual: ['1. Open the profile.', '2. The phone equals the seeded phone.'],
      state: SEED_STATE,
      steps: [GOTO, HEADING, VALUE({ equals: '{{phone}}' })],
    },
    { title: 'Masked A', manual: ['1. Open the form.', '2. The phone is filled.'], steps: [{ action: 'goto', path: '/formA' }, VALUE({ not_empty: true })] },
    { title: 'Masked B', manual: ['1. Open the form.', '2. The phone is filled.'], steps: [{ action: 'goto', path: '/formB' }, VALUE({ not_empty: true })] },
    { title: 'Unmasked A', manual: ['1. Open the form.', '2. The title shows.'], steps: [{ action: 'goto', path: '/formA' }, HEADING] },
    { title: 'Unmasked B', manual: ['1. Open the form.', '2. The title shows.'], steps: [{ action: 'goto', path: '/formB' }, HEADING] },
    {
      title: 'Textarea and select',
      manual: ['1. Open the profile.', '2. The remarks contain mundo and the state equals SPX9.'],
      steps: [GOTO, HEADING, { action: 'expect_value', role: 'textbox', name: 'Observacao', contains: 'mundo' }, { action: 'expect_value', role: 'combobox', name: 'Estado', equals: 'SPX9' }],
    },
    {
      title: 'Field absent at run time',
      manual: ['1. Open the profile.', '2. The spare field is filled.'],
      steps: [GOTO, HEADING, { action: 'expect_value', role: 'textbox', name: 'Fantasma', not_empty: true }],
    },
    {
      title: 'Literal the report never states',
      manual: ['1. Open the foreign page.', '2. The phone is filled.'],
      steps: [{ action: 'goto', path: '/foreign' }, HEADING, VALUE({ equals: 'zz999 invented' })],
    },
    {
      title: 'Binding no capture declares',
      manual: ['1. Open the unbound page.', '2. The phone is filled.'],
      steps: [{ action: 'goto', path: '/unbound' }, HEADING, VALUE({ equals: '{{nope}}' })],
    },
    {
      title: 'Wrong contains',
      manual: ['1. Open the profile.', '2. The phone contains zz-absent-text.'],
      steps: [GOTO, HEADING, VALUE({ contains: 'zz-absent-text' })],
    },
  ];
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', `**Required state:** ${d.state ?? 'None'}`, '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: d.state === undefined ? 'none' : 'declared', steps: d.steps })),
    }),
  );

  const r = await runRunner(root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  assert.match(String(r.results.report_sha256_before), /^[0-9a-f]{64}$/);
  assert.equal(r.results.report_sha256_after, r.results.report_sha256_before, 'the QA report changed during the run');
  const c = r.results.cases;
  const want = [
    ['pass', null],
    ['fail', null],
    ['fail', null],
    ['blocked', 'STEP_NOT_PERFORMABLE'],
    ['pass', null],
    ['pass', null],
    ['pass', null],
    ['pass', null],
    ['pass', null],
    ['pass', null],
    ['fail', null],
    ['needs-human', 'PLAN_ENTRY_INVALID'],
    ['needs-human', 'PLAN_ENTRY_INVALID'],
    ['fail', null],
  ];
  assert.equal(c.length, want.length);
  for (const [i, [outcome, code]] of want.entries()) {
    assert.deepEqual([c[i].outcome, c[i].reason_code], [outcome, code], `case ${i + 1} (${defs[i].title}): ${JSON.stringify([c[i].outcome, c[i].reason_code, c[i].reason])}`);
  }

  // No reason carries a locator name, a field value or an expected string.
  for (const x of c) {
    for (const word of ['Telefone', 'Apelido', 'Complemento', 'Observacao', 'Estado', 'Fantasma', 'Salvar', VALUE_A, VALUE_B, 'wrong-phone-text', 'zz-absent-text', '9999', 'mundo', 'SPX9']) {
      assert.ok(!String(x.reason ?? '').includes(word), `a reason echoes ${word}: ${x.reason}`);
    }
  }
  assert.match(c[1].reason, /^step 3:/);
  assert.match(c[1].reason, /not_empty/, 'a failed comparison names the closed comparison word');
  assert.match(c[2].reason, /equals/);
  assert.match(c[13].reason, /contains/);

  // The comparison evidence is a closed shape, attributed to its step.
  const read = (/** @type {string} */ name) => JSON.parse(readFileSync(join(runDir, 'evidence', name), 'utf8'));
  assert.deepEqual(read('case-1.value-3.json'), { action: 'expect_value', step: 3, locator: { role: 'textbox', name: 'Telefone' }, comparison: 'not_empty', result: 'passed' });
  assert.deepEqual(read('case-1.value-4.json'), { action: 'expect_value', step: 4, locator: { role: 'textbox', name: 'Telefone' }, comparison: 'contains', result: 'passed' });
  assert.deepEqual(read('case-1.value-5.json'), { action: 'expect_value', step: 5, locator: { role: 'textbox', name: 'Apelido' }, comparison: 'equals', result: 'passed' });
  assert.deepEqual(read('case-2.value-3.json'), { action: 'expect_value', step: 3, locator: { role: 'textbox', name: 'Complemento' }, comparison: 'not_empty', result: 'failed' });
  assert.deepEqual(read('case-3.value-3.json'), { action: 'expect_value', step: 3, locator: { role: 'textbox', name: 'Telefone' }, comparison: 'equals', result: 'failed' });
  assert.deepEqual(read('case-5.value-3.json'), { action: 'expect_value', step: 3, locator: { role: 'textbox', name: 'Telefone' }, comparison: 'equals', result: 'passed' });
  assert.deepEqual(read('case-10.value-3.json'), { action: 'expect_value', step: 3, locator: { role: 'textbox', name: 'Observacao' }, comparison: 'contains', result: 'passed' });
  assert.deepEqual(read('case-10.value-4.json'), { action: 'expect_value', step: 4, locator: { role: 'combobox', name: 'Estado' }, comparison: 'equals', result: 'passed' });
  assert.deepEqual(read('case-14.value-3.json'), { action: 'expect_value', step: 3, locator: { role: 'textbox', name: 'Telefone' }, comparison: 'contains', result: 'failed' });
  // A comparison that never ran leaves no comparison evidence: the only file of such a case is its final screenshot.
  const jsonEvidenceOf = (/** @type {number} */ k) => readdirSync(join(runDir, 'evidence')).filter((n) => n.startsWith(`case-${k}.`) && n.endsWith('.json'));
  assert.deepEqual(jsonEvidenceOf(4), [], 'a field with no value left comparison evidence');
  // A field the page does not render is a failed expectation (the element was not found), with nothing compared.
  assert.match(c[10].reason, /^step 3:/);
  assert.deepEqual(jsonEvidenceOf(11), [], 'a missing field left comparison evidence');
  assert.deepEqual(c[10].steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'failed']);
  // A literal the report never states and a binding no capture declares end the entry before any page is loaded.
  assert.match(c[11].reason, /^step 3:/);
  assert.ok(c[11].reason.includes('equals'), c[11].reason);
  assert.ok(!c[11].reason.includes('zz999'), `the refusal echoes the literal: ${c[11].reason}`);
  assert.match(c[12].reason, /^step 3:/);
  assert.ok(c[12].reason.includes('nope'), c[12].reason);
  assert.equal(hits['/foreign'] ?? 0, 0, 'the refused literal entry loaded its page');
  assert.equal(hits['/unbound'] ?? 0, 0, 'the refused binding entry loaded its page');
  const stepRecord = c[0].steps[2];
  assert.equal(stepRecord.action, 'expect_value');
  assert.equal(stepRecord.result, 'passed');
  assert.ok(String(stepRecord.evidence).endsWith('/evidence/case-1.value-3.json'), `the comparison evidence is not attributed to its step: ${JSON.stringify(stepRecord)}`);
  assert.equal(c[1].steps[2].result, 'failed');
  assert.ok(String(c[1].steps[2].evidence).endsWith('/evidence/case-2.value-3.json'));

  // The value reaches no run file and no terminal stream.
  for (const f of walk(runDir)) {
    const text = readFileSync(f).toString('latin1');
    for (const v of [VALUE_A, VALUE_B, REMARK]) assert.ok(!text.includes(v), `an input value reached ${f}`);
  }
  for (const v of [VALUE_A, VALUE_B, REMARK]) {
    assert.ok(!r.stdout.includes(v) && !r.stderr.includes(v), 'an input value reached a terminal stream');
  }

  // The final screenshot masks the located field.
  const png = (/** @type {number} */ i) => {
    const p = (c[i].evidence ?? []).find((/** @type {any} */ e) => String(e).endsWith('.png'));
    assert.ok(p, `case ${i + 1} has no screenshot`);
    return readFileSync(join(root, ...String(p).split('/')));
  };
  assert.equal(Buffer.compare(png(5), png(6)), 0, 'the two masked captures differ: the input value is visible in the final screenshot');
  assert.notEqual(Buffer.compare(png(7), png(8)), 0, 'the control captures are identical: the mask check cannot see a visible value');
  assert.deepEqual(validateResults(r.results), []);
});
