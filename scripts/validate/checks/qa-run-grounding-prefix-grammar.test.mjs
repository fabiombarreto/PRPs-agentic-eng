// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (the prefix accepts only goto, click and fill steps; a step outside that shape is refused, exit 2 with GROUND_PREFIX_INVALID and nothing written)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (a refused ground neither reads nor writes any file of the project)
/**
 * Phase 5 (grounding after an interaction), the prefix grammar, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md
 *              (AC-A3 the closed prefix shape, AC-A5 the helpers that keep the two snapshot kinds apart)
 *
 * Layers, all against the REAL runner (a copy of it, with the real guard, in a temp plugin tree; never edited):
 *   1. The prefix parser: every accepted and refused shape of the grammar as a table, the inclusive caps (the step
 *      cap and the value cap follow the exported constants, the goto path cap is pinned by behavior), totality
 *      over hostile JSON, and reasons that carry a step position and fixed words only, never a locator, a typed
 *      value, a key name or a binding name.
 *   2. The command line: a refused prefix exits 2 with GROUND_PREFIX_INVALID and the usage text before any file or
 *      network access (a project that holds only its report keeps exactly its files and the report stays
 *      byte-identical), with a valid-prefix control that reaches the next halt; the flag set stays closed.
 *   3. The pure helpers: the normalized step (a typed value only as a SHA-256 digest), the canonical history key,
 *      the history of a case, the snapshot file name and kind, and the route the page ends on.
 *   4. The withheld-locator rule against a real redaction table.
 *
 * No browser and no server: the replay itself, the snapshot file and the consumption are driven end to end in
 * qa-run-grounding-prefix-replay.test.mjs, qa-run-grounding-prefix-consumption.test.mjs and
 * qa-run-grounding-prefix-loop.test.mjs.
 *
 * QA_V2P5_RUNNER_SRC points the runner copy at another file (a mutation control); unset, the real runner is used.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const RUNNER_SRC = process.env.QA_V2P5_RUNNER_SRC ? resolve(process.env.QA_V2P5_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20260101T101010101Z`;

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p5-grammar-'));
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

/** @param {string[]} args @param {string} cwd */
function cli(args, cwd) {
  return spawnSync(NODE, [COPY, ...args], { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, ...GIT_ENV } });
}
/** @param {string} root @param {string} prefix */
const groundArgs = (root, prefix) => ['ground', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL, '--route', '/tasks', '--role', 'admin', '--prefix', prefix];
/** @param {string} s */
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
/** @param {any} v the prefix as a value or as raw text */
const parse = (v) => R.parseGroundPrefix(typeof v === 'string' ? v : JSON.stringify(v));

const CLICK = { action: 'click', role: 'button', name: 'Nao concluidas' };
const FILL = { action: 'fill', role: 'textbox', name: 'Filtro', value: 'abc' };
const GOTO = { action: 'goto', path: '/tasks' };

// ---------------------------------------------------------------------------
// 1. The prefix parser
// ---------------------------------------------------------------------------

test('AC-11 the prefix accepts flat goto, click and fill steps named by role and name or by text, and keeps each exactly as written', () => {
  /** @type {[string, any[]][]} */
  const accepted = [
    ['one click by role and name', [CLICK]],
    ['one click by text', [{ action: 'click', text: 'Aplicar' }]],
    ['a fill then a click', [FILL, { action: 'click', text: 'Aplicar' }]],
    ['a fill by text', [{ action: 'fill', text: 'Filtro', value: 'abc' }, CLICK]],
    ['a goto then a click', [{ action: 'goto', path: '/other?x=1' }, CLICK]],
    ['a value with accents, quotes and a backslash', [{ action: 'fill', role: 'textbox', name: 'Filtro', value: 'Não "concluídas" C:\\x' }]],
  ];
  for (const [label, steps] of accepted) {
    const r = parse(steps);
    assert.equal(r.ok, true, `${label} was refused: ${JSON.stringify(r)}`);
    assert.deepEqual(r.steps, steps, label);
  }
});

test('AC-11 the caps are inclusive: the step cap, the typed value cap and the goto path cap each accept the limit and refuse one more, and the refusal names the cap', () => {
  const click = (/** @type {number} */ i) => ({ action: 'click', role: 'button', name: `B${i}` });

  const maxSteps = R.GROUND_PREFIX_MAX_STEPS;
  const atCap = Array.from({ length: maxSteps }, (_, i) => click(i));
  assert.equal(parse(atCap).ok, true, `${maxSteps} steps must be accepted`);
  const overCap = parse([...atCap, click(maxSteps)]);
  assert.equal(overCap.ok, false);
  assert.ok(overCap.why.includes(String(maxSteps)), `the refusal does not name the cap: ${overCap.why}`);

  const maxValue = R.GROUND_PREFIX_VALUE_MAX;
  assert.equal(parse([{ ...FILL, value: 'x'.repeat(maxValue) }]).ok, true, `a value of ${maxValue} characters must be accepted`);
  const longValue = parse([{ ...FILL, value: 'x'.repeat(maxValue + 1) }]);
  assert.equal(longValue.ok, false);
  assert.ok(longValue.why.includes(String(maxValue)), `the refusal does not name the cap: ${longValue.why}`);

  // The goto path cap is not exported: it is pinned by behavior, at the 500 characters the plan and the reason state.
  const path = (/** @type {number} */ n) => `/${'p'.repeat(n - 1)}`;
  assert.equal(parse([{ action: 'goto', path: path(500) }, CLICK]).ok, true, 'a path of 500 characters must be accepted');
  const longPath = parse([{ action: 'goto', path: path(501) }, CLICK]);
  assert.equal(longPath.ok, false);
  assert.ok(longPath.why.includes('500'), `the refusal does not name the cap: ${longPath.why}`);
  assert.match(longPath.why, /^step 1:/);
});

/** Every refusal embeds the canary, which no reason may echo. */
const CANARY = 'CanaryZ91';
/** @type {[string, any, number | null][]} label, prefix (a value or raw text), the step position the reason must start with (null: no position) */
const REFUSED = [
  ['text that is not JSON', 'not json', null],
  ['blank text', '   ', null],
  ['an empty string', '', null],
  ['a JSON object', '{}', null],
  ['JSON null', 'null', null],
  ['a JSON number', '5', null],
  ['a JSON string', '"click"', null],
  ['an empty array', '[]', null],
  ['a number as a step', [5], 1],
  ['null as a step', [null], 1],
  ['an array as a step', [[CLICK]], 1],
  ['an assertion step', [CLICK, { action: 'expect_visible', role: 'heading', name: `${CANARY}Name` }], 2],
  ['a query step', [CLICK, { action: 'query', source: 'd', sql: `SELECT '${CANARY}'`, expect_rows: 1 }], 2],
  ['a request step', [{ action: 'request', method: 'GET', path: `/${CANARY}`, expect_status: 200 }, CLICK], 1],
  ['an expect_url step', [CLICK, { action: 'expect_url', path: `/${CANARY}` }], 2],
  ['an action written in the wrong case', [{ action: 'Click', role: 'button', name: `${CANARY}Name` }], 1],
  ['a step with no action', [{ role: 'button', name: `${CANARY}Name` }], 1],
  ['a selector click', [{ action: 'click', selector: `#${CANARY}` }], 1],
  ['a selector fill', [{ action: 'fill', selector: `#${CANARY}`, value: 'v' }, CLICK], 1],
  ['a selector beside a role', [{ action: 'click', selector: `#${CANARY}`, role: 'button', name: 'X' }], 1],
  ['a key the action does not take', [{ ...CLICK, [`${CANARY}Key`]: 'x' }], 1],
  ['a value on a click', [{ ...CLICK, value: `${CANARY}Value` }], 1],
  ['a path on a click', [{ ...CLICK, path: `/${CANARY}` }], 1],
  ['a role on a goto', [{ action: 'goto', path: '/x', role: 'button' }, CLICK], 1],
  ['a session key', [{ ...CLICK, session: 'none' }], 1],
  ['a numeric name', [{ action: 'click', role: 'button', name: 5 }], 1],
  ['a numeric value', [{ ...FILL, value: 5 }, CLICK], 1],
  ['a null value', [{ ...FILL, value: null }, CLICK], 1],
  ['a hostile object as the name', '[{"action":"click","role":"button","name":{"toString":1}}]', 1],
  ['a hostile object as the value', '[{"action":"fill","role":"textbox","name":"F","value":{"toString":null}},{"action":"click","text":"A"}]', 1],
  ['an own __proto__ key', '[{"action":"click","role":"button","name":"X","__proto__":{"a":1}}]', 1],
  ['a role outside the closed list', [{ action: 'click', role: 'banana', name: `${CANARY}Name` }], 1],
  ['a blank name', [{ action: 'click', role: 'button', name: '   ' }], 1],
  ['a role without a name', [{ action: 'click', role: 'button' }], 1],
  ['a name without a role', [{ action: 'click', name: `${CANARY}Name` }], 1],
  ['text beside a role', [{ action: 'click', text: `${CANARY}Text`, role: 'button' }], 1],
  ['blank text', [{ action: 'click', text: '  ' }], 1],
  ['a binding in a name', [{ action: 'click', role: 'button', name: `{{${CANARY}}}` }], 1],
  ['a binding in a text', [{ action: 'click', text: `{{${CANARY}}}` }], 1],
  ['a binding with inner spaces', [{ action: 'click', role: 'button', name: `{{ ${CANARY} }}` }], 1],
  ['a binding in a typed value', [{ ...FILL, value: `{{${CANARY}}}` }, CLICK], 1],
  ['a binding in a goto path', [{ action: 'goto', path: `/{{${CANARY}}}` }, CLICK], 1],
  ['a relative goto path', [{ action: 'goto', path: `${CANARY}` }, CLICK], 1],
  ['an absolute goto path', [{ action: 'goto', path: `http://example.com/${CANARY}` }, CLICK], 1],
  ['a protocol-relative goto path', [{ action: 'goto', path: `//example.com/${CANARY}` }, CLICK], 1],
  ['a goto with no path', [{ action: 'goto' }, CLICK], 1],
  ['a fill with no value', [{ action: 'fill', role: 'textbox', name: `${CANARY}Name` }, CLICK], 1],
  ['a goto alone', [{ action: 'goto', path: '/a' }], null],
  ['two gotos and nothing to act on', [{ action: 'goto', path: '/a' }, { action: 'goto', path: '/b' }], null],
];

test('AC-11 a prefix outside the closed shape is refused with a reason that carries a step position and fixed words only, never a locator, a typed value, a key name or a binding name', () => {
  for (const [label, input, at] of REFUSED) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = parse(input);
    }, `${label} threw`);
    assert.equal(r.ok, false, `${label} was accepted: ${JSON.stringify(input)}`);
    assert.deepEqual(Object.keys(r), ['ok', 'why'], `${label}: the refusal is not the closed { ok, why } shape`);
    assert.equal(typeof r.why, 'string', label);
    assert.ok(r.why.length > 0, label);
    assert.equal(/canary/i.test(r.why), false, `${label}: the reason echoes a locator, a key, a binding or a value: ${r.why}`);
    if (at === null) assert.equal(/^step \d+:/.test(r.why), false, `${label}: a whole-prefix refusal names no step: ${r.why}`);
    else assert.ok(r.why.startsWith(`step ${at}:`), `${label}: the reason does not start with step ${at}: ${r.why}`);
  }
});

test('AC-11 a refused step never echoes the value typed in an earlier step or the name of a binding', () => {
  const typedValue = 'secret-typed-value-9911';
  const afterValue = parse([{ ...FILL, value: typedValue }, { action: 'click', role: 'banana', name: 'X' }]);
  assert.equal(afterValue.ok, false);
  assert.match(afterValue.why, /^step 2:/);
  assert.equal(afterValue.why.includes(typedValue), false, afterValue.why);
  const binding = parse([{ ...FILL, value: '{{whoami}}' }, CLICK]);
  assert.equal(binding.ok, false);
  assert.match(binding.why, /^step 1:/);
  assert.equal(binding.why.includes('whoami'), false, binding.why);
});

test('AC-11 the parser is total over what a caller can pass: a value that is not text is refused, never thrown', () => {
  for (const input of [undefined, null, 5, true, {}, [], () => 1]) {
    /** @type {any} */ let r;
    assert.doesNotThrow(() => {
      r = R.parseGroundPrefix(input);
    }, String(input));
    assert.equal(r.ok, false, String(input));
    assert.equal(typeof r.why, 'string');
  }
});

// ---------------------------------------------------------------------------
// 2. The command line
// ---------------------------------------------------------------------------

/**
 * A project that holds a report and nothing else, so a refused ground can be shown to have written nothing and to
 * have left the report byte-identical.
 * @returns {{ root: string, report: string }}
 */
function projectRoot() {
  const root = mkdtempSync(join(SANDBOX, 'root-'));
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  writeFileSync(report, '# QA Report\n\n## Test Cases\n\n### Case 1\n**Title:** Group rows\n\n## Notes\n\nnone\n');
  return { root, report };
}
/** @param {string} dir @param {string} [base] @returns {string[]} every path under the directory, relative and sorted */
function tree(dir, base = '') {
  return readdirSync(join(dir, base), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? [`${base}${e.name}/`, ...tree(dir, `${base}${e.name}/`)] : [`${base}${e.name}`]))
    .sort();
}
/** @param {string} path */
const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('AC-11 a prefix outside the closed shape exits 2 with GROUND_PREFIX_INVALID and the usage text before any file or network access, and writes nothing; the same line with a valid prefix reaches the next halt', () => {
  const { root, report } = projectRoot();
  const reportSha = sha256File(report);
  const untouched = tree(root);
  const maxSteps = R.GROUND_PREFIX_MAX_STEPS;
  /** @type {[string, string][]} */
  const refused = [
    ['text that is not JSON', 'not json'],
    // What Windows PowerShell 5.1 hands the script for a single-quoted JSON argument once it has removed the double quotes.
    ['the JSON that Windows PowerShell 5.1 hands over with its double quotes removed', '[{action:click,role:button,name:Nao concluidas}]'],
    ['a selector step', JSON.stringify([{ action: 'click', selector: '#a' }])],
    ['an assertion step', JSON.stringify([CLICK, { action: 'expect_visible', role: 'heading', name: 'Tarefas' }])],
    [`${maxSteps + 1} steps`, JSON.stringify(Array.from({ length: maxSteps + 1 }, () => CLICK))],
    ['a goto alone', JSON.stringify([{ action: 'goto', path: '/other' }])],
    ['a binding', JSON.stringify([{ action: 'click', role: 'button', name: '{{canaryWho}}' }])],
  ];
  for (const [label, prefix] of refused) {
    const r = cli(groundArgs(root, prefix), root);
    const where = JSON.stringify([label, r.status, r.stderr]);
    assert.equal(r.status, 2, where);
    assert.ok(r.stderr.includes('GROUND_PREFIX_INVALID'), where);
    assert.ok(r.stderr.includes('Usage:') && r.stderr.includes('[--prefix <json>]'), where);
    assert.equal(r.stdout, '', where);
    assert.equal(r.stderr.includes('canaryWho') || r.stderr.includes('Nao concluidas'), false, `${label}: the refusal echoes the prefix`);
    // The run directory does not even exist: the prefix is refused before the run directory is looked at.
    assert.deepEqual(tree(root), untouched, `${label}: a refused ground wrote something`);
    assert.equal(sha256File(report), reportSha, `${label}: the QA report changed`);
  }

  // Control: the same command line with a valid prefix passes the argument stage and ends in the first named halt after it.
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  const ok = cli(groundArgs(root, JSON.stringify([CLICK])), root);
  assert.equal(ok.status, 1, ok.stderr);
  assert.ok(ok.stderr.includes('TARGET_UNDECLARED'), ok.stderr);
  assert.equal(ok.stderr.includes('GROUND_PREFIX_INVALID'), false, ok.stderr);
  assert.deepEqual(readdirSync(runDir), [], 'the control wrote something into the run directory');
  assert.equal(sha256File(report), reportSha, 'the control changed the QA report');
});

test('AC-11 the flag set of ground stays closed: --prefix needs a value of its own, a neighbour such as --prefix-file is an argument error, and --help lists the flag', () => {
  const { root, report } = projectRoot();
  const reportSha = sha256File(report);
  const untouched = tree(root);
  const base = ['ground', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL, '--route', '/tasks'];
  /** @type {[string, string[]][]} */
  const variants = [
    ['--prefix with no value', ['--prefix']],
    ['a flag in place of the value', ['--prefix', '--role']],
    ['--prefix-file', ['--prefix-file', 'prefix.json']],
    ['--plan-case', ['--plan-case', '1']],
  ];
  for (const [label, extra] of variants) {
    const r = cli([...base, ...extra], root);
    assert.equal(r.status, 2, `${label}: ${r.stderr}`);
    assert.ok(r.stderr.includes('Usage:'), label);
    assert.equal(r.stderr.includes('GROUND_PREFIX_INVALID'), false, `${label}: an argument error is not a prefix error`);
    assert.equal(r.stdout, '', label);
  }
  assert.deepEqual(tree(root), untouched, 'an argument error wrote something');
  assert.equal(sha256File(report), reportSha, 'an argument error changed the QA report');

  const help = cli(['--help'], root);
  assert.equal(help.status, 0, help.stderr);
  assert.equal(help.stdout, R.USAGE);
  const groundLine = R.USAGE.split('\n').find((/** @type {string} */ l) => l.includes('qa-run.mjs ground')) ?? '';
  assert.ok(groundLine.includes('[--prefix <json>]'), `the ground usage line does not list the flag: ${groundLine}`);
  // The six flags that were there before keep their place on the same line.
  for (const flag of ['--root <dir>', '--feature <slug>', '--run-dir <rel-dir>', '--route </path>', '[--role <slug>]', '[--env-handle <path>]']) {
    assert.ok(groundLine.includes(flag), `the ground usage line lost ${flag}`);
  }
  // The ground usage text explains the flag and states the cap the parser enforces.
  const bare = cli(['ground'], root);
  assert.equal(bare.status, 2);
  assert.ok(bare.stderr.includes(`at most ${R.GROUND_PREFIX_MAX_STEPS} goto, click and fill steps`), bare.stderr);
});

// ---------------------------------------------------------------------------
// 3. The pure helpers
// ---------------------------------------------------------------------------

test('AC-11 a replayed step is normalized to its locator, and a typed value is kept only as the lowercase hex SHA-256 of its UTF-8 bytes, never as a value key', () => {
  assert.deepEqual(R.groundingStepKey(CLICK), { action: 'click', role: 'button', name: 'Nao concluidas' });
  assert.deepEqual(R.groundingStepKey({ action: 'click', text: 'Aplicar' }), { action: 'click', text: 'Aplicar' });
  assert.deepEqual(R.groundingStepKey({ action: 'goto', path: '/a?x=1' }), { action: 'goto', path: '/a?x=1' });

  const fill = R.groundingStepKey(FILL);
  assert.deepEqual(fill, { action: 'fill', role: 'textbox', name: 'Filtro', value_sha256: sha('abc') });
  assert.match(fill.value_sha256, /^[0-9a-f]{64}$/);
  assert.equal('value' in fill, false);
  assert.equal(R.groundingStepKey({ ...FILL, value: 'Não concluídas' }).value_sha256, sha('Não concluídas'));
  assert.deepEqual(R.groundingStepKey({ action: 'fill', text: 'Filtro', value: 'abc' }), { action: 'fill', text: 'Filtro', value_sha256: sha('abc') });

  const notKeyable = [
    { action: 'click', selector: '#legacy' },
    { action: 'expect_visible', role: 'heading', name: 'Tarefas' },
    { action: 'query', source: 'd', sql: 'SELECT 1', expect_rows: 1 },
    { action: 'fill', role: 'textbox', name: 'Filtro' },
    { action: 'fill', role: 'textbox', name: 'Filtro', value: 5 },
    { action: 'goto' },
    { action: 'click' },
    null,
    undefined,
    5,
    'click',
    [],
  ];
  for (const step of notKeyable) assert.equal(R.groundingStepKey(step), null, JSON.stringify(step));
});

test('AC-11 the canonical key of a list of steps is deterministic and changes with every part of the history: locator, form, action, path, order and typed value', () => {
  const keyOf = (/** @type {any[]} */ list) => R.groundingPrefixKey(list.map((/** @type {any} */ s) => R.groundingStepKey(s)));
  const base = keyOf([GOTO, CLICK]);
  assert.equal(typeof base, 'string');
  assert.equal(keyOf([GOTO, { ...CLICK }]), base, 'a key is deterministic');
  const differing = [
    ['another name', [GOTO, { ...CLICK, name: 'Outro' }]],
    ['another role', [GOTO, { ...CLICK, role: 'link' }]],
    ['text in place of role and name', [GOTO, { action: 'click', text: 'Nao concluidas' }]],
    ['another action on the same locator', [GOTO, { ...CLICK, action: 'fill', value: 'x' }]],
    ['another goto path', [{ action: 'goto', path: '/other' }, CLICK]],
    ['a missing goto', [CLICK]],
    ['an extra step', [GOTO, CLICK, CLICK]],
    ['the order', [CLICK, GOTO]],
  ];
  for (const [label, list] of /** @type {[string, any[]][]} */ (differing)) assert.notEqual(keyOf(list), base, `${label} did not change the key`);

  const filled = keyOf([GOTO, FILL, CLICK]);
  assert.notEqual(keyOf([GOTO, { ...FILL, value: 'abd' }, CLICK]), filled, 'a different typed value must change the key');
  assert.notEqual(keyOf([GOTO, CLICK, FILL]), filled, 'the order of a fill and a click must change the key');
  const secret = 'secret-typed-9911';
  assert.equal(String(keyOf([GOTO, { ...FILL, value: secret }, CLICK])).includes(secret), false, 'the key holds the typed value in clear');

  assert.equal(R.groundingPrefixKey([R.groundingStepKey(GOTO), null]), null, 'an unkeyable step makes the whole key null');
  for (const notAList of ['nope', undefined, null, 5, {}]) assert.equal(R.groundingPrefixKey(notAList), null, String(notAList));
  assert.equal(R.groundingPrefixKey([5]), null);
});

test('AC-11 the history of a case is its goto, click and fill steps before a position, each with its one-based position and its key, and a step that cannot be keyed is kept with no key', () => {
  const heading = { action: 'expect_visible', role: 'heading', name: 'Tarefas' };
  const steps = [GOTO, heading, CLICK, FILL, { action: 'expect_url', path: '/x' }, { action: 'click', selector: '#legacy' }, { action: 'expect_visible', text: 'Row' }];
  const history = R.interactionHistory(steps, 7);
  assert.deepEqual(history.map((/** @type {any} */ h) => h.at), [1, 3, 4, 6]);
  assert.deepEqual(history[0].norm, { action: 'goto', path: '/tasks' });
  assert.deepEqual(history[2].norm, { action: 'fill', role: 'textbox', name: 'Filtro', value_sha256: sha('abc') });
  assert.equal(history[3].norm, null, 'a selector click has no key');
  assert.equal(history[3].step, steps[5]);
  // The bound is a zero-based index and exclusive (the steps before it), and a bound past the end is the whole list.
  assert.deepEqual(R.interactionHistory(steps, 2).map((/** @type {any} */ h) => h.at), [1]);
  assert.deepEqual(R.interactionHistory(steps, 3).map((/** @type {any} */ h) => h.at), [1, 3]);
  assert.deepEqual(R.interactionHistory(steps, 0), []);
  assert.equal(R.interactionHistory(steps, 99).length, 4);
  for (const notAList of ['nope', undefined, null, 5, {}]) assert.deepEqual(R.interactionHistory(notAList, 3), [], String(notAList));
});

test('AC-11 a post-interaction snapshot has its own file name and kind: the plain name is unchanged, the other carries the first 8 hex of the key digest, and only schema 2 with a prefix array is that kind', () => {
  const key = R.groundingPrefixKey([GOTO, CLICK].map((s) => R.groundingStepKey(s)));
  assert.equal(R.groundSnapshotFileName('admin', 'tasks', null), 'admin--tasks.snapshot.json');
  const name = R.groundSnapshotFileName('admin', 'tasks', key);
  assert.match(name, /^admin--tasks--after-[0-9a-f]{8}\.snapshot\.json$/);
  assert.equal(name, `admin--tasks--after-${sha(key).slice(0, 8)}.snapshot.json`);
  assert.equal(R.groundSnapshotFileName('admin', 'tasks', key), name, 'the same key must give the same name');
  const otherKey = R.groundingPrefixKey([GOTO, FILL].map((s) => R.groundingStepKey(s)));
  assert.notEqual(R.groundSnapshotFileName('admin', 'tasks', otherKey), name, 'another history must give another name');
  assert.notEqual(name, 'admin--tasks.snapshot.json', 'a post-interaction snapshot must never share the plain name');

  const base = { role: 'admin', route: '/tasks', entries: [], withheld: 0 };
  assert.equal(R.isPostInteractionSnapshot({ ...base, schema_version: 2, prefix: [] }), true);
  assert.equal(R.isPostInteractionSnapshot({ ...base, schema_version: 2, prefix: [{ action: 'goto', path: '/tasks' }] }), true);
  /** @type {[string, any][]} */
  const plainOrOther = [
    ['a plain snapshot', { ...base, schema_version: 1 }],
    ['a plain snapshot that carries a prefix', { ...base, schema_version: 1, prefix: [] }],
    ['schema 2 with no prefix', { ...base, schema_version: 2 }],
    ['schema 2 with a prefix that is not an array', { ...base, schema_version: 2, prefix: 'x' }],
    ['schema 3 with a prefix', { ...base, schema_version: 3, prefix: [] }],
    ['null', null],
    ['a string', 'x'],
  ];
  for (const [label, doc] of plainOrOther) assert.equal(R.isPostInteractionSnapshot(doc), false, label);
});

test('AC-11 the route a page ends on is the pathname of its URL on the approved origin, and anything else (another origin or port, an error page, text that is not a URL) is no route', () => {
  const origin = 'http://127.0.0.1:3000';
  assert.equal(R.finalPageRoute('http://127.0.0.1:3000/tasks/5?x=1#h', origin), '/tasks/5');
  assert.equal(R.finalPageRoute('http://127.0.0.1:3000/', origin), '/');
  for (const url of ['http://example.com/tasks', 'http://127.0.0.1:3001/tasks', 'https://127.0.0.1:3000/tasks', 'http://127.0.0.2:3000/tasks', 'about:blank', 'chrome-error://chromewebdata/', 'not a url', '', undefined, null, 5]) {
    assert.equal(R.finalPageRoute(url, origin), null, String(url));
  }
  for (const notAnOrigin of [undefined, null, 5]) assert.equal(R.finalPageRoute('http://127.0.0.1:3000/tasks', notAnOrigin), null, String(notAnOrigin));
});

// ---------------------------------------------------------------------------
// 4. The withheld-locator rule
// ---------------------------------------------------------------------------

test('AC-11 a prefix step whose locator the redaction rules withhold is named by position: an e-mail address, a registered secret and a declared pattern, by name or by text; a goto and a clean locator are not', () => {
  const root = mkdtempSync(join(SANDBOX, 'table-'));
  mkdirSync(join(root, 'PRPs'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'redaction-extensions.txt'), 'regex:Ana Souza\n');
  const table = R.buildRedactionTable({ root, env: {}, secretValues: ['tok-secret-value-1'] });

  const clean = { action: 'click', role: 'button', name: 'Salvar' };
  assert.equal(R.withheldPrefixStep([clean, { action: 'goto', path: '/a' }, { ...FILL, name: 'Filtro' }], table), 0, 'a clean prefix was withheld');
  assert.equal(R.withheldPrefixStep([clean, { action: 'click', role: 'link', name: 'ana.souza@example.com' }], table), 2, 'an e-mail locator was not withheld');
  assert.equal(R.withheldPrefixStep([{ action: 'fill', role: 'textbox', name: 'Codigo tok-secret-value-1', value: 'x' }], table), 1, 'a secret locator was not withheld');
  assert.equal(R.withheldPrefixStep([clean, clean, { action: 'click', text: 'Ana Souza' }], table), 3, 'a declared pattern was not withheld by text');
  assert.equal(R.withheldPrefixStep([{ action: 'goto', path: '/ana.souza@example.com' }, clean], table), 0, 'a goto path is not a locator');
  // The first offender is reported.
  assert.equal(R.withheldPrefixStep([{ action: 'click', text: 'Ana Souza' }, { action: 'click', role: 'link', name: 'ana.souza@example.com' }], table), 1);
});
