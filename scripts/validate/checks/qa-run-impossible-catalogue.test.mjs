// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-1 Impossible-only needs-human (every code carries a reason class; results.json reports needs_human_impossible and needs_human_gap)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-2 Counting convention (the command doc defines an objective step, the metric denominator and the frozen pre-run table)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-3 A known product defect is executed (a divergent product ends fail; PRODUCT_DEFECT is only for a case that cannot start and is class gap)
/**
 * Phase 1 (impossible catalogue and counting convention) of qa-runner-ai-executable-steps.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-1-impossible-catalogue-and-counting-convention.plan.md
 *              (AC-A1 the classed catalogue, AC-A2 the counters, AC-A3 the convention, AC-A4 the product-defect rule,
 *              AC-A5 the contract pins, AC-A7 the knowledge base, AC-A8 the site pages)
 *
 * Layers, all over the REAL runner, command doc, contract check and pages (read from disk, never edited):
 *   1. Pure functions of qa-run.mjs: the reason classes, the classed twelve-code catalogue, the runner-owned
 *      codes, the pure class reader and the pure step-counter function.
 *   2. The real runner as a child process (async spawn, because a loopback server lives in this process): a
 *      fixture with one declining entry per code, an aborted run against the same plan run to the end, and a
 *      product that diverges from the report next to a declared product defect.
 *   3. The command doc the planner reads: the counting convention, the Class column bound to the runner, the
 *      product-defect rule and the counters.
 *   4. The qa-run-contract check: a mutation of one anchored token of the real doc, and of a COPY of the runner
 *      imported next to a copy of the check (the catalogue pins read the imported module, so they cannot be
 *      mutated through text); the optional counters of results.json; the opt-in flag.
 *   5. The knowledge base and the three site places that name the catalogue: tokens only, no sentence is pinned.
 *
 * Not repeated here, because they already exist: the key set of the catalogue and the outcome of every
 * declarable code (qa-run-classification.test.mjs, updated for this phase), the registered check count and the
 * absence of a second contract module (validate-registry.test.mjs), the real tree satisfying the contract
 * (qa-run-contract.test.mjs and qa-run-classification.test.mjs), and which codes the commands page and the API
 * reference list against the live catalogue (qa-run-release-pages.test.mjs).
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

import * as RUNNER from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults, checkQaRunContract } from './qa-run-contract.mjs';

const { REASON_CATALOGUE, REASON_CLASSES, RUNNER_OWNED_REASON_CODES, OUTCOMES, reasonClassOf, summarizeNeedsHuman, validatePlanClassification, declinedCase } = RUNNER;

const REAL_SCRIPT = resolve('plugins/relay/scripts/qa-run.mjs');
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
const SCRIPT = read('plugins/relay/scripts/qa-run.mjs');
const COMMAND = read(COMMAND_FILE);
const CONTRACT = read('scripts/validate/checks/qa-run-contract.mjs');
/** @param {string} text */
const collapse = (text) => text.replace(/\s+/g, ' ');

const FEATURE = 'feat';
const RUN_ID = '20261010T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const REPORT_REL = `PRPs/reports/${FEATURE}/qa-report.md`;
const MANUAL_STEPS = ['1. Open the page.', '2. Check the result.'];
const MANUAL_STEPS_VERBATIM = MANUAL_STEPS.join('\n');
const VERBATIM_CLAUSE = '; the manual steps are reproduced verbatim';

/**
 * The outcome and the reason class the PRD gives every code of the catalogue, written out here and not read back
 * from the runner, so a change to the catalogue alone cannot satisfy this test.
 * @type {Record<string, [string, string]>}
 */
const EXPECTED = {
  UNGROUNDABLE_AFTER_INTERACTION: ['needs-human', 'gap'],
  EXTERNAL_CHANNEL: ['needs-human', 'impossible'],
  OUTSIDE_LOCAL_ENVIRONMENT: ['needs-human', 'impossible'],
  HUMAN_SIGNOFF: ['needs-human', 'impossible'],
  VISUAL_JUDGEMENT: ['needs-human', 'gap'],
  JUDGEMENT_UNCERTAIN: ['needs-human', 'gap'],
  VOCABULARY_GAP: ['needs-human', 'gap'],
  STEP_UNGROUNDED: ['needs-human', 'gap'],
  PARTIAL_REMAINDER: ['needs-human', 'gap'],
  PRODUCT_DEFECT: ['blocked', 'gap'],
  STATE_UNCONFIRMED: ['blocked', 'gap'],
  ROLE_NOT_DEDICATED: ['blocked', 'gap'],
};
const IMPOSSIBLE_CODES = ['EXTERNAL_CHANNEL', 'HUMAN_SIGNOFF', 'OUTSIDE_LOCAL_ENVIRONMENT'];
const RUNNER_OWNED_CODES = ['JUDGEMENT_UNCERTAIN', 'PARTIAL_REMAINDER', 'ROLE_NOT_DEDICATED'];

// ---------------------------------------------------------------------------
// AC-1: the classed catalogue
// ---------------------------------------------------------------------------

test('AC-1 the reason classes are exactly impossible and gap, and a reason class is never an outcome', () => {
  assert.deepEqual([...REASON_CLASSES], ['impossible', 'gap']);
  assert.deepEqual([...OUTCOMES], ['pass', 'fail', 'blocked', 'needs-human'], 'the outcome vocabulary stays four values');
  for (const cls of REASON_CLASSES) assert.equal(OUTCOMES.includes(cls), false, `${cls} is a reason class, not an outcome`);
  for (const [code, spec] of Object.entries(REASON_CATALOGUE)) {
    assert.ok(OUTCOMES.includes(spec.disposition), `${code} is reported as ${spec.disposition}, which is not an outcome`);
  }
});

test('AC-1 every code carries the outcome and the class the PRD gives it, and the impossible set is exactly EXTERNAL_CHANNEL, OUTSIDE_LOCAL_ENVIRONMENT and HUMAN_SIGNOFF', () => {
  assert.deepEqual(Object.keys(REASON_CATALOGUE).sort(), Object.keys(EXPECTED).sort(), 'a code without an expected class, or an expected code the catalogue lost');
  for (const [code, [outcome, cls]] of Object.entries(EXPECTED)) {
    const spec = REASON_CATALOGUE[code];
    assert.equal(spec.disposition, outcome, `${code} outcome`);
    assert.equal(spec.class, cls, `${code} class`);
    assert.equal(reasonClassOf(code), cls, `${code} reasonClassOf`);
  }
  const impossible = Object.keys(REASON_CATALOGUE).filter((code) => reasonClassOf(code) === 'impossible');
  assert.deepEqual(impossible.sort(), IMPOSSIBLE_CODES, 'the impossible set is closed');
  // The codes AC-1 names as gaps, and AC-3: a product defect that stops a case from starting is a gap, not human work.
  for (const code of ['VOCABULARY_GAP', 'STEP_UNGROUNDED', 'UNGROUNDABLE_AFTER_INTERACTION', 'VISUAL_JUDGEMENT', 'JUDGEMENT_UNCERTAIN', 'PRODUCT_DEFECT']) {
    assert.equal(reasonClassOf(code), 'gap', code);
  }
});

test('AC-1 AC-3 the redefined and the new codes say what they mean in their fixed reasons', () => {
  /** @type {Record<string, string>} */
  const meaning = {
    EXTERNAL_CHANNEL: 'a real external channel with no declared local source',
    OUTSIDE_LOCAL_ENVIRONMENT: 'production or a physical device',
    HUMAN_SIGNOFF: 'reserves this step for a person',
    JUDGEMENT_UNCERTAIN: 'recorded as uncertain',
    ROLE_NOT_DEDICATED: 'dedicated',
    PRODUCT_DEFECT: 'stops the case from starting',
  };
  for (const [code, phrase] of Object.entries(meaning)) assert.ok(REASON_CATALOGUE[code].reason.includes(phrase), `${code}: ${REASON_CATALOGUE[code].reason}`);
  // What moved out of a code no longer sits in it: a physical device is not an external channel, and a defect no longer "blocks the case".
  assert.equal(REASON_CATALOGUE.EXTERNAL_CHANNEL.reason.includes('physical device'), false);
  assert.equal(REASON_CATALOGUE.PRODUCT_DEFECT.reason.includes('blocks the case'), false);
});

test('AC-1 every reason, the runner-owned ones included, is one fixed sentence that ends with the verbatim-steps clause', () => {
  for (const [code, spec] of Object.entries(REASON_CATALOGUE)) {
    assert.equal(typeof spec.reason, 'string', code);
    assert.ok(spec.reason.endsWith(VERBATIM_CLAUSE), `${code}: ${spec.reason}`);
    assert.equal(spec.reason.includes('\n'), false, code);
  }
});

test('AC-1 a plan entry may not declare a runner-owned code: PARTIAL_REMAINDER keeps its refusal sentence and the two new codes are refused as produced by the runner itself', () => {
  assert.deepEqual([...RUNNER_OWNED_REASON_CODES].sort(), RUNNER_OWNED_CODES);
  /** @param {string} code */
  const entry = (code) => ({ index: 1, title: 't', class: 'human-by-nature', reason_code: code });

  const partial = validatePlanClassification(entry('PARTIAL_REMAINDER'));
  assert.ok(partial);
  assert.equal(partial.code, 'PLAN_ENTRY_INVALID');
  assert.equal(partial.reason, 'the reason_code PARTIAL_REMAINDER is derived by the runner from human_remainder; a plan entry may not declare it');

  for (const code of ['JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED']) {
    const refused = validatePlanClassification(entry(code));
    assert.ok(refused, code);
    assert.equal(refused.code, 'PLAN_ENTRY_INVALID', code);
    assert.ok(refused.reason.includes(code), `${code} not named: ${refused.reason}`);
    assert.ok(refused.reason.includes('is produced by the runner itself'), refused.reason);
    assert.equal(refused.reason.includes('human_remainder'), false, `${code}: only PARTIAL_REMAINDER is derived from human_remainder`);
    assert.equal(declinedCase(entry(code)), null, `${code} declines nothing when a plan declares it`);
  }
  // The runner-owned set is not a way around the impossible set: the three impossible codes stay declarable.
  for (const code of IMPOSSIBLE_CODES) assert.equal(validatePlanClassification(entry(code)), null, code);
});

test('AC-1 reasonClassOf returns the class of a catalogue code and null for everything else, inherited property names included', () => {
  for (const [code, [, cls]] of Object.entries(EXPECTED)) assert.equal(reasonClassOf(code), cls, code);
  const outside = [
    'NO_PLAN_ENTRY', // the planner-defect marker is not a catalogue member
    'PLAN_ENTRY_INVALID',
    'NO_ACTIVE_DRIVER',
    'AUTOMATED_EVIDENCE',
    'external_channel', // case-sensitive
    'constructor',
    'toString',
    '__proto__',
    'hasOwnProperty',
    '',
  ];
  for (const code of outside) assert.equal(reasonClassOf(code), null, code);
  for (const v of [null, undefined, 7, true, {}, [], ['EXTERNAL_CHANNEL']]) assert.equal(reasonClassOf(v), null, JSON.stringify(v));
});

// ---------------------------------------------------------------------------
// AC-1: the needs-human step counters (pure)
// ---------------------------------------------------------------------------

/** @param {string} result */
const stepOf = (result) => ({ result });
/** @param {string | null} code @param {any} objective @param {any} [steps] @param {string} [outcome] */
const nhCase = (code, objective, steps = [], outcome = 'needs-human') => ({ outcome, reason_code: code, objective_steps: objective, steps });

test('AC-1 a declining needs-human case owes all its declared objective steps to the reason class of its code, for every needs-human code', () => {
  for (const [code, [outcome, cls]] of Object.entries(EXPECTED)) {
    if (outcome !== 'needs-human') continue;
    const got = summarizeNeedsHuman([nhCase(code, 7)]);
    assert.deepEqual(got, { needs_human_impossible: cls === 'impossible' ? 7 : 0, needs_human_gap: cls === 'gap' ? 7 : 0 }, code);
  }
  const mixed = summarizeNeedsHuman([
    nhCase('EXTERNAL_CHANNEL', 3),
    nhCase('HUMAN_SIGNOFF', 1),
    nhCase('OUTSIDE_LOCAL_ENVIRONMENT', 2),
    nhCase('VOCABULARY_GAP', 4),
    nhCase('UNGROUNDABLE_AFTER_INTERACTION', 2),
    nhCase('VISUAL_JUDGEMENT', 1),
    nhCase('STEP_UNGROUNDED', 5),
  ]);
  assert.deepEqual(mixed, { needs_human_impossible: 6, needs_human_gap: 12 });
  assert.deepEqual(summarizeNeedsHuman([]), { needs_human_impossible: 0, needs_human_gap: 0 });
});

test('AC-1 a case owes its declared steps less the steps a driver ran, passed or failed, and never a negative number', () => {
  // A partial remainder: the driver ran two of four declared steps; the synthetic human step is not a driver step.
  assert.deepEqual(summarizeNeedsHuman([nhCase('PARTIAL_REMAINDER', 4, [stepOf('passed'), stepOf('passed'), stepOf('human')])]), { needs_human_impossible: 0, needs_human_gap: 2 });
  // A failed step was run too; not-run and human steps were not.
  assert.deepEqual(summarizeNeedsHuman([nhCase('STEP_UNGROUNDED', 3, [stepOf('passed'), stepOf('failed'), stepOf('not-run')])]), { needs_human_impossible: 0, needs_human_gap: 1 });
  assert.deepEqual(summarizeNeedsHuman([nhCase('STEP_UNGROUNDED', 3, [stepOf('not-run'), stepOf('not-run'), stepOf('human')])]), { needs_human_impossible: 0, needs_human_gap: 3 });
  // More steps ran than were declared: nothing is owed, and nothing is subtracted from another case.
  assert.deepEqual(summarizeNeedsHuman([nhCase('STEP_UNGROUNDED', 1, [stepOf('passed'), stepOf('passed')]), nhCase('VOCABULARY_GAP', 2)]), { needs_human_impossible: 0, needs_human_gap: 2 });
  assert.deepEqual(summarizeNeedsHuman([nhCase('EXTERNAL_CHANNEL', 0, [stepOf('passed')])]), { needs_human_impossible: 0, needs_human_gap: 0 });
});

test('AC-1 a case that declared no objective_steps owes its steps still not-run or human, and a declining case with none owes nothing', () => {
  assert.deepEqual(summarizeNeedsHuman([nhCase('PARTIAL_REMAINDER', null, [stepOf('passed'), stepOf('human')])]), { needs_human_impossible: 0, needs_human_gap: 1 });
  assert.deepEqual(
    summarizeNeedsHuman([nhCase('STEP_UNGROUNDED', undefined, [stepOf('passed'), stepOf('not-run'), stepOf('not-run'), stepOf('human'), stepOf('failed')])]),
    { needs_human_impossible: 0, needs_human_gap: 3 },
  );
  assert.deepEqual(summarizeNeedsHuman([nhCase('EXTERNAL_CHANNEL', null), nhCase('VOCABULARY_GAP', undefined)]), { needs_human_impossible: 0, needs_human_gap: 0 });
  // A value that is not an integer is not a declaration: the steps decide.
  for (const bad of ['3', 1.5, Number.NaN, null, undefined, {}]) {
    assert.deepEqual(summarizeNeedsHuman([nhCase('STEP_UNGROUNDED', bad, [stepOf('not-run')])]), { needs_human_impossible: 0, needs_human_gap: 1 }, String(bad));
  }
});

test('AC-1 a blocked case, a code outside the catalogue and any case that is not needs-human owe nothing to either counter', () => {
  const owes = [
    nhCase('PRODUCT_DEFECT', 5, [], 'blocked'),
    nhCase('STATE_UNCONFIRMED', 3, [], 'blocked'),
    nhCase('ROLE_NOT_DEDICATED', 2, [], 'blocked'),
    nhCase('NO_PLAN_ENTRY', 4),
    nhCase('PLAN_ENTRY_INVALID', 4),
    nhCase('NO_ACTIVE_DRIVER', 4),
    nhCase('NO_EXPECTATION', 4),
    nhCase(null, 4),
    nhCase('constructor', 4),
    nhCase('__proto__', 4),
    nhCase('external_channel', 4),
    nhCase('EXTERNAL_CHANNEL', 3, [], 'fail'),
    nhCase('EXTERNAL_CHANNEL', 3, [], 'pass'),
    nhCase('AUTOMATED_EVIDENCE', 3, [], 'pass'),
  ];
  assert.deepEqual(summarizeNeedsHuman(owes), { needs_human_impossible: 0, needs_human_gap: 0 });
  // The same cases change nothing in a run that also holds a counted case.
  assert.deepEqual(summarizeNeedsHuman([...owes, nhCase('HUMAN_SIGNOFF', 1)]), { needs_human_impossible: 1, needs_human_gap: 0 });
});

test('AC-1 the counters function is total over malformed input, leaves its input untouched and returns exactly the two counter keys', () => {
  const malformed = [
    null,
    undefined,
    7,
    'text',
    [],
    {},
    true,
    { outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 2, steps: 'oops' }, // steps that is not an array: nothing ran, so 2 are owed
    { outcome: 'needs-human', reason_code: 'VOCABULARY_GAP', objective_steps: 3, steps: [null, 7, 'x', { result: 'passed' }] }, // one executed step: 2 owed
    { outcome: 'needs-human', reason_code: 'STEP_UNGROUNDED', steps: null },
    { outcome: 'needs-human', reason_code: 'STEP_UNGROUNDED', objective_steps: '3', steps: [{ result: 'not-run' }, null] }, // not a declaration: one not-run step
  ];
  const untouched = structuredClone(malformed);
  const got = summarizeNeedsHuman(malformed);
  assert.deepEqual(malformed, untouched);
  assert.deepEqual(got, { needs_human_impossible: 2, needs_human_gap: 3 });
  assert.deepEqual(Object.keys(got).sort(), ['needs_human_gap', 'needs_human_impossible']);
});

// ---------------------------------------------------------------------------
// The real runner as a child process
// ---------------------------------------------------------------------------

/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
/** @type {string[]} */
const temps = [];

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    if (path === '/ok') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } else if (path === '/boom') {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('boom');
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('nf');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [REAL_SCRIPT, ...args], { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stdout, stderr });
    });
  });
}

/** @param {string[]} titles @returns {string} */
function reportText(titles) {
  const blocks = titles.map((title, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${title}`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      ...MANUAL_STEPS,
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/** @param {{ titles: string[], plan: any[] }} o */
function makeFixture(o) {
  const root = mkdtempSync(join(tmpdir(), 'relay-impcat-'));
  temps.push(root);
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(runDirAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, ...REPORT_REL.split('/')), reportText(o.titles));
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  writeFileSync(join(runDirAbs, 'plan.json'), JSON.stringify({ schema_version: 1, cases: o.plan }));
  return { root, runDirAbs };
}

/**
 * @param {{ root: string, runDirAbs: string }} fx
 * @param {string[]} [extraArgs]
 */
async function runRun(fx, extraArgs = []) {
  const proc = await runScript(['run', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL, ...extraArgs], fx.root);
  const resultsPath = join(fx.runDirAbs, 'results.json');
  /** @type {any} */ const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')) : null;
  return { ...proc, results };
}

/** @param {any} results @returns {Record<number, any>} */
const byIndex = (results) => Object.fromEntries(results.cases.map((/** @type {any} */ c) => [c.index, c]));

/** @param {string} path @param {Record<string, any>} [extra] */
const get = (path, extra = {}) => ({ action: 'request', method: 'GET', path, ...extra });

test('AC-1 a plan with one declining entry per code splits the steps left to a person by reason class; a refused, omitted, blocked or uncatalogued case owes none', async () => {
  const titles = [
    'Real inbox',
    'Production only',
    'Report signoff',
    'Needs a new step',
    'Element after interaction',
    'Appearance',
    'Ungrounded step',
    'Known defect',
    'State not confirmed',
    'Declared uncertain judgment',
    'Declared role refusal',
    'Omitted case',
    'Channel without a count',
    'Partly executed',
  ];
  const fx = makeFixture({
    titles,
    plan: [
      { index: 1, title: titles[0], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 3 },
      { index: 2, title: titles[1], class: 'human-by-nature', reason_code: 'OUTSIDE_LOCAL_ENVIRONMENT', objective_steps: 2 },
      { index: 3, title: titles[2], class: 'human-by-nature', reason_code: 'HUMAN_SIGNOFF', objective_steps: 1 },
      { index: 4, title: titles[3], class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 4 },
      { index: 5, title: titles[4], class: 'needs-a-new-driver', reason_code: 'UNGROUNDABLE_AFTER_INTERACTION', objective_steps: 2 },
      { index: 6, title: titles[5], class: 'needs-a-new-driver', reason_code: 'VISUAL_JUDGEMENT', objective_steps: 1 },
      { index: 7, title: titles[6], class: 'automatable', reason_code: 'STEP_UNGROUNDED', objective_steps: 2 },
      { index: 8, title: titles[7], class: 'blocked-by-product', reason_code: 'PRODUCT_DEFECT', objective_steps: 5 },
      { index: 9, title: titles[8], class: 'automatable', reason_code: 'STATE_UNCONFIRMED', objective_steps: 3 },
      { index: 10, title: titles[9], class: 'needs-a-new-driver', reason_code: 'JUDGEMENT_UNCERTAIN', objective_steps: 2 },
      { index: 11, title: titles[10], class: 'automatable', reason_code: 'ROLE_NOT_DEDICATED', objective_steps: 2 },
      { index: 13, title: titles[12], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL' },
      {
        index: 14,
        title: titles[13],
        class: 'automatable',
        driver: 'http',
        role: null,
        state: 'none',
        objective_steps: 4,
        steps: [get('/ok', { expect_status: 200 }), get('/ok', { expect_json: { path: 'ok', equals: true } })],
        human_remainder: { reason: 'the last two steps are a visual judgment' },
      },
    ],
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  const res = r.results;
  assert.ok(res, 'results.json was written');
  assert.equal(res.cases.length, titles.length, 'N cases in, N entries out');
  const by = byIndex(res);

  /** @type {Record<number, [string, string]>} */
  const want = {
    1: ['needs-human', 'EXTERNAL_CHANNEL'],
    2: ['needs-human', 'OUTSIDE_LOCAL_ENVIRONMENT'],
    3: ['needs-human', 'HUMAN_SIGNOFF'],
    4: ['needs-human', 'VOCABULARY_GAP'],
    5: ['needs-human', 'UNGROUNDABLE_AFTER_INTERACTION'],
    6: ['needs-human', 'VISUAL_JUDGEMENT'],
    7: ['needs-human', 'STEP_UNGROUNDED'],
    8: ['blocked', 'PRODUCT_DEFECT'],
    9: ['blocked', 'STATE_UNCONFIRMED'],
    10: ['needs-human', 'PLAN_ENTRY_INVALID'],
    11: ['needs-human', 'PLAN_ENTRY_INVALID'],
    12: ['needs-human', 'NO_PLAN_ENTRY'],
    13: ['needs-human', 'EXTERNAL_CHANNEL'],
    14: ['needs-human', 'PARTIAL_REMAINDER'],
  };
  for (const [index, fields] of Object.entries(want)) assert.deepEqual([by[Number(index)].outcome, by[Number(index)].reason_code], fields, `case ${index}`);

  // Every declining entry carries the fixed catalogued sentence and the manual steps verbatim.
  for (const [index, code] of [[1, 'EXTERNAL_CHANNEL'], [2, 'OUTSIDE_LOCAL_ENVIRONMENT'], [3, 'HUMAN_SIGNOFF'], [4, 'VOCABULARY_GAP'], [5, 'UNGROUNDABLE_AFTER_INTERACTION'], [6, 'VISUAL_JUDGEMENT'], [7, 'STEP_UNGROUNDED'], [8, 'PRODUCT_DEFECT'], [9, 'STATE_UNCONFIRMED'], [13, 'EXTERNAL_CHANNEL']]) {
    assert.equal(by[Number(index)].reason, REASON_CATALOGUE[String(code)].reason, `case ${index}`);
    assert.equal(by[Number(index)].manual_steps_verbatim, MANUAL_STEPS_VERBATIM, `case ${index}`);
    assert.deepEqual(by[Number(index)].steps, [], `case ${index}`);
  }
  // A plan cannot declare a runner-owned code: both are refused, naming the code and who produces it.
  for (const index of [10, 11]) {
    const code = index === 10 ? 'JUDGEMENT_UNCERTAIN' : 'ROLE_NOT_DEDICATED';
    assert.ok(String(by[index].reason).includes(code), by[index].reason);
    assert.ok(String(by[index].reason).includes('produced by the runner itself'), by[index].reason);
  }

  // The four-key partition is unchanged and the two counters sit beside it:
  // impossible 3 + 2 + 1 = 6; gap 4 + 2 + 1 + 2 = 9, plus the 2 steps of case 14 its driver did not run (4 declared, 2 run).
  // Cases 8 and 9 are blocked, 10 to 12 are refused or omitted, and 13 declared no count: none of them owes a step.
  assert.deepEqual(res.counts, { pass: 0, fail: 0, blocked: 2, 'needs-human': 12 });
  assert.equal(res.partially_executed, 1);
  assert.equal(res.needs_human_impossible, 6);
  assert.equal(res.needs_human_gap, 11);
  assert.deepEqual(validateResults(res), [], 'the run satisfies the results contract');

  // The summary: the pinned first line keeps its form, and the new line follows the partial-execution line and precedes the per-case lines.
  assert.ok(r.stdout.includes('QA run finished: pass=0 fail=0 blocked=2 needs-human=12\n'), r.stdout);
  const partialAt = r.stdout.indexOf('Partially executed (not in the driver-executed rate)');
  const stepsAt = r.stdout.indexOf('Needs-human steps: impossible=6 gap=11\n');
  const firstCaseAt = r.stdout.indexOf('  case 1: needs-human (EXTERNAL_CHANNEL)');
  assert.ok(partialAt !== -1 && stepsAt !== -1 && firstCaseAt !== -1, r.stdout);
  assert.ok(partialAt < stepsAt && stepsAt < firstCaseAt, 'the Needs-human steps line sits between the partial-execution line and the per-case lines');
});

test('AC-1 a case the run never reached is blocked RUN_ABORTED and owes nothing to either counter, while the same plan run to the end owes its declared steps', async () => {
  const titles = ['First health', 'Inbox', 'Needs a new step'];
  const plan = [
    { index: 1, title: titles[0], class: 'automatable', driver: 'http', role: null, state: 'none', steps: [get('/ok', { expect_status: 200 })] },
    { index: 2, title: titles[1], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 3 },
    { index: 3, title: titles[2], class: 'needs-a-new-driver', reason_code: 'VOCABULARY_GAP', objective_steps: 2 },
  ];

  const full = await runRun(makeFixture({ titles, plan }));
  assert.equal(full.code, 0, full.stderr);
  assert.equal(full.results.needs_human_impossible, 3, 'control: the declining entries owe their declared steps when the run reaches them');
  assert.equal(full.results.needs_human_gap, 2);

  const capped = await runRun(makeFixture({ titles, plan }), ['--max-cases', '1']);
  assert.equal(capped.code, 1, 'an aborted run exits non-zero');
  const res = capped.results;
  assert.ok(res, 'results are still written for an aborted run');
  const by = byIndex(res);
  for (const i of [2, 3]) {
    assert.equal(by[i].outcome, 'blocked', `case ${i}`);
    assert.equal(by[i].reason_code, 'RUN_ABORTED', `case ${i}`);
  }
  assert.equal(res.needs_human_impossible, 0);
  assert.equal(res.needs_human_gap, 0);
  assert.deepEqual(res.counts, { pass: 1, fail: 0, blocked: 2, 'needs-human': 0 });
  assert.ok(capped.stdout.includes('Needs-human steps: impossible=0 gap=0\n'), capped.stdout);
  assert.deepEqual(validateResults(res), []);
});

// ---------------------------------------------------------------------------
// AC-3: a product that diverges from the report is executed and ends fail
// ---------------------------------------------------------------------------

test('AC-3 a case whose expected behaviour the product does not show ends fail with evidence, while a declared PRODUCT_DEFECT is blocked and owes no step', async () => {
  const titles = ['Product shows the wrong value', 'Known defect that stops the case'];
  const fx = makeFixture({
    titles,
    plan: [
      { index: 1, title: titles[0], class: 'automatable', driver: 'http', role: null, state: 'none', steps: [get('/ok', { expect_status: 200, expect_json: { path: 'ok', equals: false } })] },
      { index: 2, title: titles[1], class: 'blocked-by-product', reason_code: 'PRODUCT_DEFECT', objective_steps: 4 },
    ],
  });
  const r = await runRun(fx);
  assert.equal(r.code, 0, r.stderr);
  const res = r.results;
  assert.ok(res);
  const by = byIndex(res);

  assert.equal(by[1].outcome, 'fail', 'a divergence from the report is a result, not a decline');
  assert.equal(by[1].reason_code, null, 'an executed case carries no decline code');
  assert.equal(by[1].class, 'automatable');
  assert.equal(by[1].steps.length, 1);
  assert.equal(by[1].steps[0].result, 'failed', 'the failing step is the one that names the divergence');
  assert.match(String(by[1].reason), /^step 1:/, 'the reason of the failed case names the failing step');
  assert.ok(Array.isArray(by[1].evidence) && by[1].evidence.length > 0, 'the failed case carries evidence');
  assert.equal(by[1].steps[0].evidence, by[1].evidence[0], 'the failing step points at the evidence file the case lists');
  for (const rel of by[1].evidence) {
    assert.ok(String(rel).startsWith(`${RUN_DIR_REL}/evidence/`), `evidence ${rel} sits in the evidence directory of the run`);
    assert.equal(existsSync(join(fx.root, ...String(rel).split('/'))), true, `evidence file ${rel} exists`);
  }

  assert.equal(by[2].outcome, 'blocked');
  assert.equal(by[2].reason_code, 'PRODUCT_DEFECT');
  assert.equal(reasonClassOf(by[2].reason_code), 'gap', 'a declared product defect is class gap');
  assert.deepEqual(by[2].steps, []);

  assert.deepEqual(res.counts, { pass: 0, fail: 1, blocked: 1, 'needs-human': 0 });
  assert.equal(res.needs_human_impossible, 0);
  assert.equal(res.needs_human_gap, 0, 'a blocked product defect leaves no step to a person');
  assert.equal(res.classification.driver_executed, 1, 'the failed case was executed by a driver');
  assert.deepEqual(validateResults(res), []);
  assert.ok(r.stdout.includes('  case 1: fail\n'), r.stdout);
  assert.ok(r.stdout.includes('  case 2: blocked (PRODUCT_DEFECT)\n'), r.stdout);
});

// ---------------------------------------------------------------------------
// AC-2 and AC-3: the command doc the planner reads
// ---------------------------------------------------------------------------

test('AC-2 the command defines an objective step to include judgment and channel steps, the metric denominator, and a pre-run table frozen under the convention before any counted run', () => {
  const flat = collapse(COMMAND);
  assert.match(flat, /judgment and channel steps are objective steps/);
  assert.match(flat, /metric denominator is every objective step not of impossible class/);
  assert.match(flat, /pre-run table is frozen under this convention before any counted run/);
  // The 14-case table was frozen under the earlier convention and is not presented as a table under the new one.
  assert.match(flat, /reference classification, frozen under the earlier convention/);
});

test('AC-1 the reason-code table of the command carries a Class column and gives every code the outcome and class the PRD gives it', () => {
  assert.match(COMMAND, /^\| Code \| Outcome \| Class \| Use it when \|$/m);
  /** @type {Record<string, [string, string]>} */
  const rows = {};
  for (const m of COMMAND.matchAll(/^\| `([A-Z_]+)` \| `(needs-human|blocked)` \| `(impossible|gap)` \|/gm)) rows[m[1]] = [m[2], m[3]];
  assert.deepEqual(rows, EXPECTED);

  const flat = collapse(COMMAND);
  assert.match(flat, /`EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT` and `HUMAN_SIGNOFF` are the only impossible codes/);
  assert.match(flat, /The reason class is not the `class` of a case/);
});

test('AC-3 the command tells the planner to execute a reachable product defect and report fail, and to use PRODUCT_DEFECT only for a case that cannot start', () => {
  const flat = collapse(COMMAND);
  assert.match(flat, /`blocked-by-product`: a known product defect stops the case from starting\./);
  assert.match(flat, /Never decline a case for a product defect it can reach/);
  assert.match(flat, /the case is executed and reported `fail` with evidence naming the failing step/);
  assert.match(flat, /Use `PRODUCT_DEFECT` only for a case that cannot start/);
  assert.match(COMMAND, /^\| `PRODUCT_DEFECT` \| `blocked` \| `gap` \|[^\n]*executed and ends `fail`/m);
  // The sentences this phase replaced are gone.
  assert.equal(flat.includes('a known product defect blocks the case'), false);
  assert.equal(flat.includes('the case needs an inbox, SMS, a physical device or a third-party payment'), false);
});

test('AC-1 the command describes the two step counters in Result fields, before the unchanged four-key counts sentence, and in the final output surface', () => {
  const start = COMMAND.indexOf('Result fields. Each case in `results.json`');
  assert.ok(start !== -1, 'the Result fields paragraph was not found');
  const end = COMMAND.indexOf('\n\n', start);
  const paragraph = collapse(COMMAND.slice(start, end === -1 ? undefined : end));
  assert.ok(paragraph.includes('`needs_human_impossible` and `needs_human_gap`'), paragraph);
  assert.match(paragraph, /a case that declared none contributes its steps still `not-run` or `human`/);
  assert.match(paragraph, /a `blocked` case or a case whose code is outside the catalogue contributes to neither/);
  assert.ok(paragraph.endsWith('The four-key `counts` partition is unchanged.'), 'the closing sentence of the paragraph stays last');

  const flat = collapse(COMMAND);
  assert.match(flat, /Read `needs_human_impossible` and `needs_human_gap` from `results.json` \(the `Needs-human steps` summary line repeats them\): a gap step is a miss against the executed share, an impossible step is not/);
});

// ---------------------------------------------------------------------------
// AC-1, AC-2 and AC-3: the qa-run-contract pins
// ---------------------------------------------------------------------------

/** @param {string} src @param {string} from @param {string} to @returns {string} */
function replaceAll(src, from, to) {
  assert.ok(src.includes(from), `mutation anchor absent: ${from.slice(0, 80)}`);
  return src.split(from).join(to);
}

/** @param {string} commandText */
const contractForDoc = (commandText) => checkQaRunContract({ scriptText: SCRIPT, commandText, results: [], requireStepExamples: true, requireCatalogue: true });
/** @param {{ findings: { message: string, file: string }[] }} r @param {string} part */
const docHits = (r, part) => r.findings.filter((f) => f.file === COMMAND_FILE && f.message.includes(part));

test('AC-2 AC-3 the contract flags a command that loses a phrase of the counting convention, a phrase of the product-defect rule or a documented step counter', () => {
  assert.deepEqual(contractForDoc(COMMAND).findings, [], 'control: the real runner and the real doc satisfy the contract');
  /** @type {[string, string, string][]} */
  const mutations = [
    ['frozen under this convention before any counted run', 'frozen before any counted run', 'must state the counting convention'],
    ['every objective step not of impossible class', 'every objective step', 'must state the counting convention'],
    ['judgment and channel steps are objective steps', 'judgment steps are objective steps', 'must state the counting convention'],
    ['executed and reported `fail`', 'executed and reported as failed', 'must state the product-defect rule'],
    ['stops the case from starting', 'cannot be started', 'must state the product-defect rule'],
    ['`needs_human_gap`', '`needs_human_other`', 'must document the step counter needs_human_gap'],
    ['`needs_human_impossible`', '`needs_human_other`', 'must document the step counter needs_human_impossible'],
  ];
  for (const [from, to, message] of mutations) {
    const r = contractForDoc(replaceAll(COMMAND, from, to));
    assert.equal(r.ok, false, from);
    assert.ok(docHits(r, message).length >= 1, `no finding "${message}" for the mutation of: ${from}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-1 the contract flags a command whose reason-code table has no Class column, lacks a code, or disagrees with the runner on a code outcome or class', () => {
  const noClassColumn = contractForDoc(replaceAll(COMMAND, '| Code | Outcome | Class | Use it when |', '| Code | Outcome | Use it when |'));
  assert.ok(docHits(noClassColumn, 'must carry a Class column').length === 1, JSON.stringify(noClassColumn.findings));

  const wrongClass = contractForDoc(replaceAll(COMMAND, '| `EXTERNAL_CHANNEL` | `needs-human` | `impossible` |', '| `EXTERNAL_CHANNEL` | `needs-human` | `gap` |'));
  const classHit = docHits(wrongClass, 'EXTERNAL_CHANNEL');
  assert.equal(classHit.length, 1, JSON.stringify(wrongClass.findings));
  assert.ok(classHit[0].message.includes('class gap') && classHit[0].message.includes('impossible'), classHit[0].message);

  const wrongOutcome = contractForDoc(replaceAll(COMMAND, '| `ROLE_NOT_DEDICATED` | `blocked` | `gap` |', '| `ROLE_NOT_DEDICATED` | `needs-human` | `gap` |'));
  const outcomeHit = docHits(wrongOutcome, 'ROLE_NOT_DEDICATED');
  assert.equal(outcomeHit.length, 1, JSON.stringify(wrongOutcome.findings));
  assert.ok(outcomeHit[0].message.includes('outcome needs-human') && outcomeHit[0].message.includes('blocked'), outcomeHit[0].message);

  const withoutRow = COMMAND.split('\n').filter((line) => !line.startsWith('| `HUMAN_SIGNOFF` |')).join('\n');
  assert.notEqual(withoutRow, COMMAND, 'the HUMAN_SIGNOFF row was not found');
  const missingRow = contractForDoc(withoutRow);
  assert.equal(docHits(missingRow, 'no row for HUMAN_SIGNOFF').length, 1, JSON.stringify(missingRow.findings));
});

/**
 * Loads a COPY of the contract check next to a COPY of the runner, so the check imports the copy: the catalogue
 * pins read the imported module, and a frozen export cannot be mutated from here.
 * @param {string} runnerText
 */
async function contractWithRunner(runnerText) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-impcat-contract-'));
  temps.push(dir);
  mkdirSync(join(dir, 'scripts', 'validate', 'checks'), { recursive: true });
  mkdirSync(join(dir, 'plugins', 'relay', 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'plugins', 'relay', 'scripts', 'qa-run.mjs'), runnerText);
  const contractCopy = join(dir, 'scripts', 'validate', 'checks', 'qa-run-contract.mjs');
  writeFileSync(contractCopy, CONTRACT);
  const mod = await import(pathToFileURL(contractCopy).href);
  return mod.checkQaRunContract({ scriptText: runnerText, commandText: COMMAND, results: [], requireStepExamples: true, requireCatalogue: true });
}

/** @param {string} anchor @returns {string} the anchor, after asserting it occurs exactly once in the runner */
function once(anchor) {
  const n = SCRIPT.split(anchor).length - 1;
  assert.equal(n, 1, `mutation anchor must occur exactly once, found ${n}: ${anchor.slice(0, 80)}`);
  return anchor;
}

test('AC-1 the contract flags a runner whose catalogue carries a wrong, foreign or missing class, a wrong runner-owned set or a lost code', async () => {
  const control = await contractWithRunner(SCRIPT);
  assert.deepEqual(control.findings, [], 'control: an unmutated copy of the runner satisfies the copy of the check');

  const entry = (/** @type {string} */ code, /** @type {string} */ disposition, /** @type {string} */ cls) => `  ${code}: Object.freeze({\n    disposition: '${disposition}',\n    class: '${cls}',\n`;
  const runnerOwned = "Object.freeze(['PARTIAL_REMAINDER', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED'])";
  /** @type {[string, string, string[]][]} */
  const mutations = [
    ['an impossible code that claims to be a gap', SCRIPT.replace(once(entry('EXTERNAL_CHANNEL', 'needs-human', 'impossible')), entry('EXTERNAL_CHANNEL', 'needs-human', 'gap')), ['EXTERNAL_CHANNEL', 'must carry the class impossible']],
    ['a gap code that claims to be impossible', SCRIPT.replace(once(entry('VOCABULARY_GAP', 'needs-human', 'gap')), entry('VOCABULARY_GAP', 'needs-human', 'impossible')), ['VOCABULARY_GAP', 'must carry the class gap']],
    ['a class outside the two reason classes', SCRIPT.replace(once(entry('STATE_UNCONFIRMED', 'blocked', 'gap')), entry('STATE_UNCONFIRMED', 'blocked', 'human')), ['STATE_UNCONFIRMED', 'has a class outside']],
    ['an entry with no class at all', SCRIPT.replace(once(entry('JUDGEMENT_UNCERTAIN', 'needs-human', 'gap')), "  JUDGEMENT_UNCERTAIN: Object.freeze({\n    disposition: 'needs-human',\n"), ['JUDGEMENT_UNCERTAIN', 'has a class outside']],
    ['a runner-owned set that lost a code', SCRIPT.replace(once(runnerOwned), "Object.freeze(['PARTIAL_REMAINDER', 'ROLE_NOT_DEDICATED'])"), ['runner-owned reason codes must include JUDGEMENT_UNCERTAIN']],
    ['a runner-owned set that gained a code', SCRIPT.replace(once(runnerOwned), "Object.freeze(['PARTIAL_REMAINDER', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED', 'EXTERNAL_CHANNEL'])"), ['runner-owned reason codes must not include EXTERNAL_CHANNEL']],
    ['a required code that is gone', SCRIPT.replace(once('  HUMAN_SIGNOFF: Object.freeze({'), '  HUMAN_SIGN_OFF: Object.freeze({'), ['catalogue must contain HUMAN_SIGNOFF']],
  ];
  for (const [label, runnerText, fragments] of mutations) {
    assert.notEqual(runnerText, SCRIPT, `${label}: the mutation changed nothing`);
    const r = await contractWithRunner(runnerText);
    assert.equal(r.ok, false, label);
    const hit = r.findings.filter((f) => f.file === 'plugins/relay/scripts/qa-run.mjs' && fragments.every((part) => f.message.includes(part)));
    assert.ok(hit.length >= 1, `${label}: no finding carries ${JSON.stringify(fragments)}: ${JSON.stringify(r.findings)}`);
  }
});

test('AC-1 the contract checks a stored step counter against what the cases recompute to, and results written before the counters existed stay valid', () => {
  const T = '2026-10-10T10:00:00.000Z';
  /** @param {Record<string, any>} [extra] */
  const mkCase = (extra = {}) => ({ index: 1, title: 't', outcome: 'needs-human', reason_code: 'EXTERNAL_CHANNEL', started_at: T, finished_at: T, evidence: [], steps: [], ...extra });
  /** @param {any[]} cases @param {Record<string, any>} [extra] */
  const mkResults = (cases, extra = {}) => ({
    started_at: T,
    finished_at: T,
    human_gate: { status: 'open' },
    counts: { pass: 0, fail: 0, blocked: 0, 'needs-human': cases.length },
    cases,
    ...extra,
  });
  const cases = [mkCase({ objective_steps: 3 })]; // 3 impossible steps owed

  assert.deepEqual(validateResults(mkResults(cases)), [], 'results written before the counters existed stay valid');
  assert.deepEqual(validateResults(mkResults(cases, { needs_human_impossible: 3 })), [], 'one counter present, the other absent');
  assert.deepEqual(validateResults(mkResults(cases, { needs_human_impossible: 3, needs_human_gap: 0 })), []);

  const wrong = validateResults(mkResults(cases, { needs_human_impossible: 2, needs_human_gap: 0 }));
  assert.equal(wrong.length, 1, JSON.stringify(wrong));
  assert.ok(wrong[0].includes('needs_human_impossible (2)') && wrong[0].includes('(3)'), wrong[0]);

  const swapped = validateResults(mkResults(cases, { needs_human_impossible: 0, needs_human_gap: 3 }));
  assert.ok(swapped.some((m) => m.includes('needs_human_impossible')) && swapped.some((m) => m.includes('needs_human_gap')), JSON.stringify(swapped));

  for (const bad of [-1, 1.5, '0', null, true, Number.NaN]) {
    const m = validateResults(mkResults(cases, { needs_human_impossible: 3, needs_human_gap: bad }));
    assert.ok(m.some((x) => x.includes('needs_human_gap')), JSON.stringify(bad));
    assert.equal(m.some((x) => x.includes('needs_human_impossible')), false, 'the other counter is judged on its own');
  }

  // The recomputation applies the reason class, the executed-step subtraction and the blocked exclusion.
  const mixed = [
    mkCase({ index: 1, objective_steps: 3 }),
    mkCase({ index: 2, reason_code: 'VOCABULARY_GAP', objective_steps: 4 }),
    mkCase({ index: 3, reason_code: 'PARTIAL_REMAINDER', objective_steps: 3, steps: [{ result: 'passed' }, { result: 'human' }] }),
    mkCase({ index: 4, outcome: 'blocked', reason_code: 'PRODUCT_DEFECT', objective_steps: 5 }),
  ];
  const counts = { pass: 0, fail: 0, blocked: 1, 'needs-human': 3 };
  assert.deepEqual(validateResults(mkResults(mixed, { counts, needs_human_impossible: 3, needs_human_gap: 6 })), []);
  assert.ok(validateResults(mkResults(mixed, { counts, needs_human_impossible: 3, needs_human_gap: 11 })).some((m) => m.includes('needs_human_gap')), 'a blocked case must not be counted');
});

test('AC-1 AC-2 AC-3 the new doc rules fire only for a caller that opts in', () => {
  const bare = 'HUMAN GATE STILL OPEN FAILED_NON_LOCAL_TARGET qa-run.mjs';
  const fragments = ['counting convention', 'product-defect rule', 'step counter', 'Class column'];
  const without = checkQaRunContract({ scriptText: null, commandText: bare, results: [] }).findings;
  for (const part of fragments) assert.equal(without.some((f) => f.message.includes(part)), false, `${part} is flagged without the opt-in`);
  const opted = checkQaRunContract({ scriptText: null, commandText: bare, results: [], requireCatalogue: true }).findings;
  assert.equal(opted.filter((f) => f.message.includes('must state the counting convention')).length, 3, 'one finding per convention phrase');
  assert.equal(opted.filter((f) => f.message.includes('must state the product-defect rule')).length, 2, 'one finding per rule phrase');
  assert.equal(opted.filter((f) => f.message.includes('must document the step counter')).length, 2, 'one finding per counter');
  assert.equal(opted.filter((f) => f.message.includes('must carry a Class column')).length, 1);
});

// ---------------------------------------------------------------------------
// AC-1: the knowledge base and the site pages that name the catalogue
// ---------------------------------------------------------------------------

const SCREAMING = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;
/** @param {string} html @returns {string} */
const htmlText = (html) => collapse(html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).trim();
/** @param {string} text @returns {string[]} */
const sentencesOf = (text) => text.split(/(?<=[.!?])\s+/);
/** @param {string} text @returns {string[]} the catalogue-shaped tokens of every sentence that states the impossible class */
const impossibleSentenceCodes = (text) => [...new Set(sentencesOf(text).filter((s) => /\bimpossible\b/.test(s)).flatMap((s) => s.match(SCREAMING) ?? []))].sort();
const COUNTERS = ['needs_human_impossible', 'needs_human_gap'];

test('AC-1 the API reference names the twelve codes, the two reason classes and the two counters in the /relay-qa-run row, and the new exports in the qa-run.mjs row', () => {
  const lines = read('docs/api-reference.md').split('\n');
  const qa = lines.find((l) => l.startsWith('| `/relay-qa-run '));
  const runner = lines.find((l) => l.startsWith('| `qa-run.mjs` '));
  assert.ok(qa && runner, 'the /relay-qa-run row or the qa-run.mjs row was not found');
  for (const code of Object.keys(EXPECTED)) assert.ok(qa.includes(`\`${code}\``), `the /relay-qa-run row does not name ${code}`);
  for (const name of [...REASON_CLASSES, ...COUNTERS]) assert.ok(qa.includes(`\`${name}\``), `the /relay-qa-run row does not name ${name}`);
  assert.ok(qa.includes('a `classification` block beside the unchanged four-key `counts`'), 'the classification clause stays verbatim');
  for (const name of ['REASON_CLASSES', 'reasonClassOf', 'summarizeNeedsHuman']) {
    assert.ok(runner.includes(`\`${name}\``), `the qa-run.mjs row does not name ${name}`);
    assert.ok(name in RUNNER, `${name} is not an export of the runner`);
  }
});

test('AC-1 the glossary paragraph on the catalogue names the twelve codes, states the closed impossible set, and names the two counters', () => {
  const paragraph = read('docs/domain/glossary.md')
    .split(/\n\n/)
    .find((p) => p.includes('`REASON_CATALOGUE`'));
  assert.ok(paragraph, 'the glossary paragraph that names REASON_CATALOGUE was not found');
  for (const code of Object.keys(EXPECTED)) assert.ok(paragraph.includes(`\`${code}\``), `the glossary paragraph does not name ${code}`);
  for (const name of [...REASON_CLASSES, ...COUNTERS]) assert.ok(paragraph.includes(`\`${name}\``), `the glossary paragraph does not name ${name}`);
  assert.deepEqual(impossibleSentenceCodes(collapse(paragraph).replace(/`/g, '')), IMPOSSIBLE_CODES);
});

test('AC-1 the commands reference lists every code, states the closed impossible set and the product-defect rule, and names the two counters in the /relay-qa-run Classification row', () => {
  const page = read('documentation/reference/commands.html');
  const start = page.indexOf('<h3 id="relay-qa-run"');
  assert.ok(start !== -1, 'the /relay-qa-run entry was not found');
  const row = /<dt>Classification<\/dt>\s*<dd>([\s\S]*?)<\/dd>/.exec(page.slice(start));
  assert.ok(row, 'the Classification row of the /relay-qa-run entry was not found');
  for (const code of Object.keys(EXPECTED)) assert.ok(row[1].includes(`<code>${code}</code>`), `the Classification row does not name ${code}`);
  for (const name of [...REASON_CLASSES, ...COUNTERS, 'fail']) assert.ok(row[1].includes(`<code>${name}</code>`), `the Classification row does not name ${name}`);
  const text = htmlText(row[1]);
  assert.deepEqual(impossibleSentenceCodes(text), IMPOSSIBLE_CODES);
  assert.ok(text.includes('PRODUCT_DEFECT is only for a case that cannot start'), text);
});

test('AC-1 the validation-checks reference states the class pins, the runner-owned codes, the convention and the counters in the qa-run-contract section', () => {
  const page = read('documentation/reference/validation-checks.html');
  const start = page.indexOf('<h2 id="qa-run-contract"');
  assert.ok(start !== -1, 'the qa-run-contract section was not found');
  const end = page.indexOf('<h2 ', start + 10);
  const text = htmlText(page.slice(start, end === -1 ? undefined : end));
  for (const part of [...COUNTERS, 'runner-owned', 'counting convention', 'reason-code table of the command', 'impossible', 'gap']) assert.ok(text.includes(part), `the qa-run-contract section does not state: ${part}`);
  for (const code of RUNNER_OWNED_CODES) assert.ok(text.includes(code), `the qa-run-contract section does not name the runner-owned code ${code}`);
});

test('AC-1 the changelog records the classed catalogue, the new codes, the counters and the product-defect change', () => {
  const text = htmlText(read('documentation/changelog.html'));
  for (const part of ['OUTSIDE_LOCAL_ENVIRONMENT', 'HUMAN_SIGNOFF', 'JUDGEMENT_UNCERTAIN', 'ROLE_NOT_DEDICATED', ...COUNTERS, 'Needs-human steps', 'counting convention', 'PRODUCT_DEFECT is only for a case that cannot start']) {
    assert.ok(text.includes(part), `the changelog does not mention: ${part}`);
  }
});
