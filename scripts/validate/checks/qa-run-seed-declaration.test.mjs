// @ts-check
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-7 The seed declaration file is generated from the report's own state texts
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-8 A proposal cites a real file:line; a missing command is a named gap
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-9 Only an operator-confirmed declaration runs (STATE_UNCONFIRMED, STATE_COMMAND_MISSING)
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-10 A runnable declaration names a store the local-only guard can evaluate
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-15 Frozen surfaces and the closed outcome vocabulary
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-16 Declarations hold no values; the generator never executes or confirms anything
/**
 * Phase 3 (seed declaration path) of qa-runner-case-vocabulary.
 *
 * - classifySeedDeclaration: pure refusal order and codes.
 * - qa-seed.mjs: listStates and mergeProposals (library calls and the CLI), against temp roots.
 * - The real runner, end to end over a loopback server with the http driver only: a proposed
 *   entry is refused with nothing run, a confirmed one runs.
 * - The qa-run-contract pins for the seed script and the seed command.
 *
 * Source plan: PRPs/plans/completed/qa-runner-case-vocabulary-phase-3-seed-declaration-path.plan.md
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { classifySeedDeclaration, normalizeStore, OUTCOMES } from '../../../plugins/relay/scripts/qa-run.mjs';
import { listStates, mergeProposals } from '../../../plugins/relay/scripts/qa-seed.mjs';
import { checkQaRunContract, runQaRunContractCheck, validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_SEED = resolve('plugins/relay/scripts/qa-seed.mjs');
const SEED_SCRIPT_FILE = 'plugins/relay/scripts/qa-seed.mjs';
const SEED_COMMAND_FILE = 'plugins/relay/commands/relay-qa-seed.md';
const read = (/** @type {string} */ p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const RUNNER_TEXT = read('plugins/relay/scripts/qa-run.mjs');
const RUN_COMMAND_TEXT = read('plugins/relay/commands/relay-qa-run.md');
const SEED_TEXT = read(SEED_SCRIPT_FILE);
const SEED_COMMAND_TEXT = read(SEED_COMMAND_FILE);

/** @type {string[]} */
const temps = [];
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), 'relay-qaseeddecl-'));
  temps.push(d);
  return d;
};
const sha = (/** @type {string} */ p) => createHash('sha256').update(readFileSync(p)).digest('hex');

// ---------------------------------------------------------------------------
// classifySeedDeclaration: the refusal order and codes (pure)
// ---------------------------------------------------------------------------

const T = 'A teacher exists';
const BASE = { command: ['node', 'seed.mjs'], store: 'localhost:5432' };
const classify = (/** @type {any} */ d) => classifySeedDeclaration(d, T);

test('AC-9 classifySeedDeclaration: a confirmed declaration with a checkable store may run (null)', () => {
  assert.equal(classify({ ...BASE, status: 'confirmed' }), null);
  assert.equal(classify({ ...BASE, status: 'confirmed', evidence: 'package.json:3', captures: { id: { path: 'id' } } }), null);
});

test('AC-9 classifySeedDeclaration: any status other than the exact string "confirmed" is STATE_UNCONFIRMED naming the state and the operator edit', () => {
  for (const status of [undefined, 'proposed', 'Confirmed', 'CONFIRMED', ' confirmed', 'confirmed ', true, 1, null, '']) {
    const v = classify({ ...BASE, status });
    assert.ok(v, JSON.stringify(status));
    assert.equal(v.code, 'STATE_UNCONFIRMED', JSON.stringify(status));
    assert.ok(v.reason.includes(JSON.stringify(T)), 'the reason names the state text');
    assert.match(v.reason, /"status": "confirmed"/);
    assert.match(v.reason, /PRPs\/auth\/qa-seed\.json/);
  }
  assert.equal(classify(BASE)?.code, 'STATE_UNCONFIRMED', 'a declaration with no status key at all is unconfirmed');
});

test('AC-9 classifySeedDeclaration: command null is STATE_COMMAND_MISSING naming the gap, even when the entry is confirmed', () => {
  const proposed = classify({ command: null, status: 'proposed', gap: 'no seed script exists for teachers' });
  assert.ok(proposed);
  assert.equal(proposed.code, 'STATE_COMMAND_MISSING');
  assert.ok(proposed.reason.includes('no seed script exists for teachers'));
  assert.ok(proposed.reason.includes(JSON.stringify(T)));
  const confirmed = classify({ command: null, status: 'confirmed', store: 'localhost:5432', gap: 'still nothing' });
  assert.equal(confirmed?.code, 'STATE_COMMAND_MISSING', 'confirming a gap does not make it runnable');
  const noGap = classify({ command: null, status: 'proposed' });
  assert.equal(noGap?.code, 'STATE_COMMAND_MISSING');
  assert.ok(noGap.reason.includes(JSON.stringify(T)));
});

test('AC-9 classifySeedDeclaration: a gap is truncated to 200 characters in the reason', () => {
  const v = classify({ command: null, gap: `${'g'.repeat(200)}${'h'.repeat(100)}` });
  assert.ok(v);
  assert.ok(v.reason.includes('g'.repeat(200)));
  assert.ok(!v.reason.includes('hh'), 'characters past 200 never reach the reason');
  assert.equal(classify({ command: null, gap: 42 })?.code, 'STATE_COMMAND_MISSING', 'a non-string gap is ignored, not echoed');
  assert.ok(!classify({ command: null, gap: 42 })?.reason.includes('42'));
});

test('AC-9 classifySeedDeclaration: an absent or malformed declaration stays STATE_UNDECLARED with the unchanged reason text', () => {
  const expected = `the required state is not declared: PRPs/auth/qa-seed.json states[${JSON.stringify(T)}]`;
  const confirmedStore = { status: 'confirmed', store: 'localhost:5432' };
  for (const d of [null, undefined, 'x', 5, [], { ...confirmedStore }, { ...confirmedStore, command: [] }, { ...confirmedStore, command: ['a', ''] }, { ...confirmedStore, command: ['a', 3] }, { ...confirmedStore, command: 'node seed.mjs' }, { status: 'proposed', command: [] }]) {
    const v = classify(d);
    assert.ok(v, JSON.stringify(d));
    assert.equal(v.code, 'STATE_UNDECLARED', JSON.stringify(d));
    assert.equal(v.reason, expected, JSON.stringify(d));
  }
});

test('AC-10 classifySeedDeclaration: a confirmed declaration with no checkable store is FAILED_NON_LOCAL_TARGET', () => {
  for (const store of [undefined, '', 'a b', 'host/path', 5, null, {}]) {
    const v = classify({ command: ['node', 'x'], status: 'confirmed', store });
    assert.ok(v, JSON.stringify(store));
    assert.equal(v.code, 'FAILED_NON_LOCAL_TARGET', JSON.stringify(store));
    assert.match(v.reason, /no checkable store/);
    assert.equal(normalizeStore(store), null, 'the refused stores are exactly the ones normalizeStore cannot evaluate');
  }
});

test('AC-9/AC-10 classifySeedDeclaration refusal order: undeclared, then command gap, then unconfirmed, then store', () => {
  assert.equal(classify({ command: ['a', ''], status: 'proposed' })?.code, 'STATE_UNDECLARED');
  assert.equal(classify({ command: null, status: 'proposed' })?.code, 'STATE_COMMAND_MISSING', 'gap beats unconfirmed and a missing store');
  assert.equal(classify({ command: ['node', 'x'], status: 'proposed' })?.code, 'STATE_UNCONFIRMED', 'unconfirmed beats a missing store');
  assert.equal(classify({ command: ['node', 'x'], status: 'confirmed' })?.code, 'FAILED_NON_LOCAL_TARGET');
});

test('AC-16 classifySeedDeclaration is pure and its reasons carry no declaration value other than the state text and the gap', () => {
  const decl = { command: ['node', 'secret-arg-9f3'], status: 'proposed', store: 'db-secret-host-77:5432', evidence: 'package.json:3', captures: { tok: { path: 'tok-path-55' } } };
  const before = JSON.stringify(decl);
  const v = classify(decl);
  assert.equal(JSON.stringify(decl), before, 'the declaration is not mutated');
  assert.ok(v);
  for (const leak of ['secret-arg-9f3', 'db-secret-host-77', 'tok-path-55', 'package.json']) {
    assert.ok(!v.reason.includes(leak), `the reason leaked ${leak}`);
  }
  assert.ok(OUTCOMES.join(',') === 'pass,fail,blocked,needs-human', 'the closed outcome vocabulary is unchanged');
});

// ---------------------------------------------------------------------------
// Fixture: a target root with a report, a package.json and a seed marker script
// ---------------------------------------------------------------------------

const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const STATE = 'A teacher exists with two classes';
const PACKAGE_JSON = ['{', '  "scripts": {', '    "seed": "node seed-marker.mjs"', '  }', '}', ''].join('\n');
const SEED_MARKER = "import { writeFileSync } from 'node:fs';\nwriteFileSync('ran.txt', 'ran');\n";

/** @param {string[]} states @returns {string} */
function reportOf(states) {
  const blocks = states.map((s, i) =>
    [`### Case ${i + 1}`, `**Title:** Case ${i + 1} title`, '**Risk level:** low', `**Required state:** ${s}`, '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', ''].join('\n'),
  );
  return ['# QA Report', '', '## Test Cases', '', ...blocks, '## Notes', '', 'none', ''].join('\n');
}

/**
 * @param {{ states?: string[], baseUrl?: string }} [o]
 */
function makeRoot(o = {}) {
  const root = tmp();
  mkdirSync(join(root, ...RUN_DIR_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), reportOf(o.states ?? [STATE]));
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: o.baseUrl ?? baseUrl, roles: {} }));
  writeFileSync(
    join(root, ...RUN_DIR_REL.split('/'), 'plan.json'),
    JSON.stringify({ schema_version: 1, cases: [{ index: 1, title: 'Case 1 title', driver: 'http', role: null, state: 'declared', steps: [{ action: 'request', method: 'GET', path: '/ok', expect_status: 200 }] }] }),
  );
  writeFileSync(join(root, 'package.json'), PACKAGE_JSON);
  writeFileSync(join(root, 'seed-marker.mjs'), SEED_MARKER);
  return root;
}
const reportPath = (/** @type {string} */ root) => join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
const seedPath = (/** @type {string} */ root) => join(root, 'PRPs', 'auth', 'qa-seed.json');

// ---------------------------------------------------------------------------
// qa-seed.mjs listStates
// ---------------------------------------------------------------------------

test('AC-7 listStates returns the distinct non-none required-state texts, trimmed, in order of first appearance', () => {
  const text = reportOf(['A teacher exists', 'none', '  A student with 2 enrollments  ', 'N/A', 'An admin exists', 'A teacher exists', 'none (anonymous visitor)']);
  assert.deepEqual(listStates(text), ['A teacher exists', 'A student with 2 enrollments', 'An admin exists']);
});

test('AC-7 listStates keeps the report text byte-for-byte (case, punctuation and inner spacing are not normalized)', () => {
  const odd = 'The Teacher "Ana" has 2  classes, (3 students)';
  assert.deepEqual(listStates(reportOf([odd])), [odd]);
});

test('AC-7 listStates on a report with only none states returns an empty list; on a report with no cases it fails FAILED_REPORT_UNPARSEABLE', () => {
  assert.deepEqual(listStates(reportOf(['none', 'N/A'])), []);
  assert.throws(() => listStates('# nothing here\n\njust prose\n'), (/** @type {any} */ e) => e.code === 'FAILED_REPORT_UNPARSEABLE');
});

// ---------------------------------------------------------------------------
// qa-seed.mjs mergeProposals
// ---------------------------------------------------------------------------

const S_TEACHER = 'A teacher exists';
const S_STUDENT = 'A student with 2 enrollments';
const S_ADMIN = 'An admin exists';
const GOOD = { command: ['npm', 'run', 'seed'], evidence: 'package.json:3', store: 'localhost:5432' };

/**
 * @param {any} proposals
 * @param {{ seed?: any, states?: string[] }} [o] seed: an object (serialized) or a string (written raw)
 */
function mergeFx(proposals, o = {}) {
  const root = makeRoot({ states: o.states ?? [S_TEACHER, S_STUDENT, S_ADMIN] });
  if (o.seed !== undefined) writeFileSync(seedPath(root), typeof o.seed === 'string' ? o.seed : `${JSON.stringify(o.seed, null, 2)}\n`);
  const proposalsFile = join(root, 'proposals.json');
  writeFileSync(proposalsFile, typeof proposals === 'string' ? proposals : JSON.stringify(proposals));
  return { root, proposalsFile, run: () => mergeProposals({ root, report: reportPath(root), proposals: proposalsFile }) };
}
const seedBytes = (/** @type {string} */ root) => (existsSync(seedPath(root)) ? readFileSync(seedPath(root), 'utf8') : null);
const invalid = (/** @type {any} */ e) => e && e.code === 'FAILED_SEED_PROPOSAL_INVALID';

test('AC-7/AC-8 mergeProposals writes every missing report state as a byte-equal key with status proposed; existing entries and other top-level keys are preserved; the report is untouched', () => {
  const original = { states: { [S_TEACHER]: { command: ['node', 'old.mjs'], status: 'confirmed', store: 'localhost:5432', captures: { id: { path: 'id' } } } }, query_sources: { keep: 'me' } };
  const fx = mergeFx({ states: { [S_STUDENT]: GOOD } }, { seed: original });
  const reportBefore = sha(reportPath(fx.root));
  const summary = fx.run();
  assert.deepEqual(summary, { added: [S_STUDENT, S_ADMIN], kept: [S_TEACHER], gaps: [S_ADMIN] });
  const raw = /** @type {string} */ (seedBytes(fx.root));
  const seed = JSON.parse(raw);
  assert.equal(raw, `${JSON.stringify(seed, null, 2)}\n`, 'two-space JSON with a trailing newline');
  assert.deepEqual(Object.keys(seed.states).sort(), [S_TEACHER, S_STUDENT, S_ADMIN].sort());
  assert.deepEqual(seed.states[S_TEACHER], original.states[S_TEACHER], 'an existing entry is unchanged');
  assert.deepEqual(seed.query_sources, original.query_sources, 'another top-level key is unchanged');
  assert.deepEqual(seed.states[S_STUDENT], { command: ['npm', 'run', 'seed'], status: 'proposed', evidence: 'package.json:3', store: 'localhost:5432' });
  const gap = seed.states[S_ADMIN];
  assert.equal(gap.command, null);
  assert.equal(gap.status, 'proposed');
  assert.ok(typeof gap.gap === 'string' && gap.gap.length > 0, 'a state with no proposal is a named gap');
  assert.equal(sha(reportPath(fx.root)), reportBefore, 'the report is byte-identical');
  assert.equal(existsSync(`${seedPath(fx.root)}.tmp`), false, 'the atomic write leaves no temp file');
});

test('AC-7 mergeProposals creates PRPs/auth/qa-seed.json when absent, every entry proposed and none confirmed; a second merge changes nothing', () => {
  const root = tmp();
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  writeFileSync(join(root, 'package.json'), PACKAGE_JSON);
  writeFileSync(reportPath(root), reportOf([S_TEACHER, S_ADMIN]));
  writeFileSync(join(root, 'proposals.json'), JSON.stringify({ states: { [S_TEACHER]: { command: ['npm', 'run', 'seed'], evidence: 'package.json:3' } } }));
  const opts = { root, report: reportPath(root), proposals: join(root, 'proposals.json') };
  assert.equal(existsSync(seedPath(root)), false);
  const first = mergeProposals(opts);
  assert.deepEqual(first.added, [S_TEACHER, S_ADMIN]);
  const seed = JSON.parse(/** @type {string} */ (seedBytes(root)));
  assert.ok(Object.values(seed.states).every((e) => /** @type {any} */ (e).status === 'proposed'));
  assert.ok(!Object.hasOwn(seed.states[S_TEACHER], 'store'), 'no store is invented when none was proposed');
  const bytes = seedBytes(root);
  const second = mergeProposals(opts);
  assert.deepEqual(second, { added: [], kept: [S_TEACHER, S_ADMIN], gaps: [] });
  assert.equal(seedBytes(root), bytes, 'idempotent: nothing is written when no key is added');
});

test('AC-7 mergeProposals never overwrites an existing key, even when a proposal names it', () => {
  const original = { states: { [S_TEACHER]: { command: ['node', 'mine.mjs'], status: 'proposed', evidence: 'x.json:1' } } };
  const fx = mergeFx({ states: { [S_TEACHER]: GOOD } }, { seed: original, states: [S_TEACHER] });
  const bytes = seedBytes(fx.root);
  const r = fx.run();
  assert.deepEqual(r, { added: [], kept: [S_TEACHER], gaps: [] });
  assert.equal(seedBytes(fx.root), bytes);
});

test('AC-8 mergeProposals accepts a null command only with a named gap, and records exactly that gap', () => {
  const fx = mergeFx({ states: { [S_ADMIN]: { command: null, gap: 'no admin seed script exists in the repository' } } }, { states: [S_ADMIN] });
  assert.deepEqual(fx.run(), { added: [S_ADMIN], kept: [], gaps: [S_ADMIN] });
  assert.deepEqual(JSON.parse(/** @type {string} */ (seedBytes(fx.root))).states[S_ADMIN], { command: null, status: 'proposed', gap: 'no admin seed script exists in the repository' });
});

test('AC-8 mergeProposals accepts evidence naming a one-element command and one naming only a command argument by its basename', () => {
  const root = makeRoot({ states: [S_TEACHER, S_STUDENT] });
  writeFileSync(join(root, 'Makefile'), 'seed-all: deps\n\tnode seed-marker.mjs\n');
  writeFileSync(
    join(root, 'proposals.json'),
    JSON.stringify({
      states: {
        [S_TEACHER]: { command: ['seed-all'], evidence: 'Makefile:1' },
        [S_STUDENT]: { command: ['node', '/elsewhere/dir/seed-marker.mjs'], evidence: 'package.json:3' },
      },
    }),
  );
  const r = mergeProposals({ root, report: reportPath(root), proposals: join(root, 'proposals.json') });
  assert.deepEqual(r.added, [S_TEACHER, S_STUDENT]);
});

test('AC-8 mergeProposals refuses every invalid proposal with FAILED_SEED_PROPOSAL_INVALID and writes nothing', () => {
  /** @type {[string, any][]} */
  const cases = [
    ['a status key (even a harmless value)', { [S_STUDENT]: { ...GOOD, status: 'proposed' } }],
    ['a status key set to the runnable value', { [S_STUDENT]: { ...GOOD, status: 'confirmed' } }],
    ['evidence naming a file that does not exist', { [S_STUDENT]: { ...GOOD, evidence: 'missing.json:1' } }],
    ['evidence whose line does not name the command', { [S_STUDENT]: { ...GOOD, evidence: 'package.json:1' } }],
    ['evidence escaping the root', { [S_STUDENT]: { ...GOOD, evidence: '../package.json:3' } }],
    ['evidence with an absolute path', { [S_STUDENT]: { ...GOOD, evidence: `${join(tmpdir(), 'x.json')}:1` } }],
    ['evidence line past the end of the file', { [S_STUDENT]: { ...GOOD, evidence: 'package.json:6' } }],
    ['evidence line 0', { [S_STUDENT]: { ...GOOD, evidence: 'package.json:0' } }],
    ['evidence without a line number', { [S_STUDENT]: { ...GOOD, evidence: 'package.json' } }],
    ['no evidence on a non-null command', { [S_STUDENT]: { command: GOOD.command } }],
    ['an empty command array', { [S_STUDENT]: { command: [], evidence: 'package.json:3' } }],
    ['a command with an empty string element', { [S_STUDENT]: { command: ['npm', ''], evidence: 'package.json:3' } }],
    ['a command that is a string', { [S_STUDENT]: { command: 'npm run seed', evidence: 'package.json:3' } }],
    ['a null command without a gap', { [S_ADMIN]: { command: null } }],
    ['a null command with a blank gap', { [S_ADMIN]: { command: null, gap: '   ' } }],
    ['a state that is not in the report', { 'Invented state': { command: null, gap: 'x' } }],
    ['a state differing from the report only by case', { [S_STUDENT.toLowerCase()]: { command: null, gap: 'x' } }],
    ['an empty store', { [S_STUDENT]: { ...GOOD, store: '' } }],
    ['a non-string store', { [S_STUDENT]: { ...GOOD, store: 5 } }],
    ['a proposal that is not an object', { [S_STUDENT]: 'npm run seed' }],
  ];
  for (const [label, states] of cases) {
    const fx = mergeFx({ states });
    assert.throws(() => fx.run(), invalid, label);
    assert.equal(seedBytes(fx.root), null, `${label}: no seed file was created`);
    const existing = mergeFx({ states }, { seed: { states: { [S_TEACHER]: { command: ['x'], status: 'confirmed', store: 'localhost:5432' } } } });
    const before = seedBytes(existing.root);
    assert.throws(() => existing.run(), invalid, label);
    assert.equal(seedBytes(existing.root), before, `${label}: the existing seed file changed`);
    assert.equal(existsSync(`${seedPath(existing.root)}.tmp`), false, label);
  }
});

test('AC-8 mergeProposals validates every proposal before writing: one invalid proposal beside a valid one writes nothing', () => {
  const fx = mergeFx({ states: { [S_STUDENT]: GOOD, [S_ADMIN]: { command: null } } });
  assert.throws(() => fx.run(), invalid);
  assert.equal(seedBytes(fx.root), null);
});

test('AC-16 a refused proposal names the state text but never echoes a status value or a store value', () => {
  const fx = mergeFx({ states: { [S_STUDENT]: { ...GOOD, status: 'zzz-status-sentinel', store: 'zzz-store-sentinel:1' } } });
  assert.throws(
    () => fx.run(),
    (/** @type {any} */ e) => invalid(e) && e.message.includes(JSON.stringify(S_STUDENT)) && !e.message.includes('zzz-status-sentinel') && !e.message.includes('zzz-store-sentinel'),
  );
});

test('AC-7 mergeProposals refuses an unparseable or shapeless existing seed file (FAILED_SEED_FILE_UNPARSEABLE) and leaves it byte-identical', () => {
  for (const seed of ['{ not json', '[]', '{"states": []}', '{"other": 1}', '"states"']) {
    const fx = mergeFx({ states: { [S_STUDENT]: GOOD } }, { seed });
    assert.throws(() => fx.run(), (/** @type {any} */ e) => e.code === 'FAILED_SEED_FILE_UNPARSEABLE', seed);
    assert.equal(seedBytes(fx.root), seed, `${seed}: the file was modified`);
  }
});

test('AC-8 mergeProposals refuses an unreadable report, an unreadable proposals file and a proposals file with no states object', () => {
  const fx = mergeFx({ states: {} });
  assert.throws(() => mergeProposals({ root: fx.root, report: join(fx.root, 'nope.md'), proposals: fx.proposalsFile }), (/** @type {any} */ e) => e.code === 'FAILED_REPORT_UNPARSEABLE');
  assert.throws(() => mergeProposals({ root: fx.root, report: reportPath(fx.root), proposals: join(fx.root, 'nope.json') }), invalid);
  for (const body of ['not json', '[]', '{"states": []}', '{}']) {
    const bad = mergeFx(body);
    assert.throws(() => bad.run(), invalid, body);
    assert.equal(seedBytes(bad.root), null, body);
  }
});

test('AC-8/AC-16 the generator executes nothing: merging a proposal whose command would write a marker leaves the marker absent', () => {
  const root = makeRoot({ states: [S_STUDENT] });
  writeFileSync(join(root, 'proposals.json'), JSON.stringify({ states: { [S_STUDENT]: { command: [NODE, 'seed-marker.mjs'], evidence: 'package.json:3' } } }));
  const r = mergeProposals({ root, report: reportPath(root), proposals: join(root, 'proposals.json') });
  assert.deepEqual(r.added, [S_STUDENT]);
  assert.equal(existsSync(join(root, 'ran.txt')), false, 'the proposed command was run');
});

// ---------------------------------------------------------------------------
// qa-seed.mjs as a CLI
// ---------------------------------------------------------------------------

const cli = (/** @type {string[]} */ ...args) => spawnSync(NODE, [REAL_SEED, ...args], { encoding: 'utf8', windowsHide: true, timeout: 60000 });

test('AC-7 CLI states prints the JSON array of state texts and exits 0; an unreadable report exits 1 with FAILED_REPORT_UNPARSEABLE', () => {
  const root = makeRoot({ states: [S_TEACHER, 'none', S_ADMIN, S_TEACHER] });
  const ok = cli('states', '--report', reportPath(root));
  assert.equal(ok.status, 0, ok.stderr);
  assert.deepEqual(JSON.parse(ok.stdout), [S_TEACHER, S_ADMIN]);
  const bad = cli('states', '--report', join(root, 'missing.md'));
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /^FAILED_REPORT_UNPARSEABLE: /);
});

test('AC-7/AC-8 CLI merge prints the added/kept/gaps summary and exits 0; an invalid proposal exits 1 with FAILED_SEED_PROPOSAL_INVALID and writes nothing', () => {
  const fx = mergeFx({ states: { [S_STUDENT]: GOOD } });
  const ok = cli('merge', '--root', fx.root, '--report', reportPath(fx.root), '--proposals', fx.proposalsFile);
  assert.equal(ok.status, 0, ok.stderr);
  const summary = JSON.parse(ok.stdout);
  assert.deepEqual([...summary.added].sort(), [S_TEACHER, S_STUDENT, S_ADMIN].sort());
  assert.deepEqual([...summary.gaps].sort(), [S_TEACHER, S_ADMIN].sort());

  const bad = mergeFx({ states: { [S_STUDENT]: { ...GOOD, status: 'confirmed' } } });
  const r = cli('merge', '--root', bad.root, '--report', reportPath(bad.root), '--proposals', bad.proposalsFile);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^FAILED_SEED_PROPOSAL_INVALID: /);
  assert.equal(seedBytes(bad.root), null);
});

test('CLI: --help exits 0 with usage; an unknown or missing subcommand exits 2', () => {
  const help = cli('--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /qa-seed\.mjs states/);
  assert.match(help.stdout, /qa-seed\.mjs merge/);
  assert.equal(cli('frobnicate').status, 2);
  assert.equal(cli().status, 2);
});

// ---------------------------------------------------------------------------
// The real runner end to end (http driver, loopback server)
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
let hits = {};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    res.writeHead(path === '/ok' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, path }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/** @param {string} root */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (e) => { clearTimeout(timer); rejectP(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_DIR_REL.split('/'), 'results.json');
      resolveP({ code, stdout, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

/**
 * @param {any} decl the seed declaration for STATE
 * @returns {Promise<{ root: string, c: any, ran: boolean, r: any }>}
 */
async function runWithDeclaration(decl) {
  hits = {};
  const root = makeRoot();
  writeFileSync(seedPath(root), JSON.stringify({ states: { [STATE]: decl } }));
  const r = /** @type {any} */ (await runRunner(root));
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  return { root, c: r.results.cases[0], ran: existsSync(join(root, 'ran.txt')), r };
}
const RUNNABLE = { command: [NODE, 'seed-marker.mjs'], store: 'localhost:5432' };

test('AC-9 end to end: a proposed declaration is blocked STATE_UNCONFIRMED, nothing runs and no request is sent', async () => {
  const { c, ran } = await runWithDeclaration({ ...RUNNABLE, status: 'proposed', evidence: 'package.json:3' });
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'STATE_UNCONFIRMED');
  assert.ok(c.reason.includes(STATE), 'the reason names the state text');
  assert.equal(ran, false, 'the seed command was executed');
  assert.deepEqual(hits, {}, 'a request reached the server');
});

test('AC-9 end to end: a declaration with no status key, or a near-miss status, is blocked STATE_UNCONFIRMED and nothing runs', async () => {
  for (const status of [undefined, 'Confirmed', true]) {
    const { c, ran } = await runWithDeclaration({ ...RUNNABLE, status });
    assert.equal(c.reason_code, 'STATE_UNCONFIRMED', JSON.stringify(status));
    assert.equal(c.outcome, 'blocked');
    assert.equal(ran, false, JSON.stringify(status));
    assert.deepEqual(hits, {});
  }
});

test('AC-9 end to end: a command null entry is blocked STATE_COMMAND_MISSING naming the gap, even confirmed, and nothing runs', async () => {
  for (const status of ['proposed', 'confirmed']) {
    const { c, ran } = await runWithDeclaration({ command: null, status, store: 'localhost:5432', gap: 'the project has no teacher seed command' });
    assert.equal(c.outcome, 'blocked', status);
    assert.equal(c.reason_code, 'STATE_COMMAND_MISSING', status);
    assert.ok(c.reason.includes('the project has no teacher seed command'), status);
    assert.equal(ran, false, status);
    assert.deepEqual(hits, {});
  }
});

test('AC-9 end to end: STATE_UNDECLARED keeps its meaning for a missing key and for an empty command', async () => {
  const empty = await runWithDeclaration({ command: [], status: 'confirmed', store: 'localhost:5432' });
  assert.equal(empty.c.reason_code, 'STATE_UNDECLARED');
  hits = {};
  const root = makeRoot();
  writeFileSync(seedPath(root), JSON.stringify({ states: { 'Some other state': { ...RUNNABLE, status: 'confirmed' } } }));
  const r = /** @type {any} */ (await runRunner(root));
  assert.equal(r.results.cases[0].reason_code, 'STATE_UNDECLARED');
  assert.equal(existsSync(join(root, 'ran.txt')), false);
});

test('AC-10 end to end: a confirmed declaration with no store is blocked FAILED_NON_LOCAL_TARGET and nothing runs', async () => {
  const { c, ran } = await runWithDeclaration({ command: [NODE, 'seed-marker.mjs'], status: 'confirmed' });
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(ran, false);
  assert.deepEqual(hits, {});
});

test('AC-10 end to end: a confirmed declaration with a non-local store is blocked FAILED_NON_LOCAL_TARGET and nothing runs', async () => {
  const { c, ran } = await runWithDeclaration({ ...RUNNABLE, status: 'confirmed', store: 'evil.example:5432' });
  assert.equal(c.outcome, 'blocked');
  assert.equal(c.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.equal(ran, false);
  assert.deepEqual(hits, {});
});

test('AC-9 end to end: a confirmed declaration with a local store runs its declared argv once, then the case runs and passes', async () => {
  const { c, ran, r } = await runWithDeclaration({ ...RUNNABLE, status: 'confirmed' });
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.equal(ran, true, 'the seed command ran');
  assert.equal(hits['/ok'], 1);
  assert.deepEqual(validateResults(r.results), []);
  assert.ok(OUTCOMES.includes(c.outcome));
});

test('AC-7/AC-9 end to end: an entry written by mergeProposals is refused as proposed, and the same entry runs once the operator edits status and store', async () => {
  hits = {};
  const a = makeRoot();
  writeFileSync(join(a, 'proposals.json'), JSON.stringify({ states: { [STATE]: { command: [NODE, 'seed-marker.mjs'], evidence: 'package.json:3' } } }));
  mergeProposals({ root: a, report: reportPath(a), proposals: join(a, 'proposals.json') });
  const generated = JSON.parse(/** @type {string} */ (seedBytes(a)));
  assert.equal(generated.states[STATE].status, 'proposed');
  const refused = /** @type {any} */ (await runRunner(a));
  assert.equal(refused.results.cases[0].reason_code, 'STATE_UNCONFIRMED');
  assert.equal(existsSync(join(a, 'ran.txt')), false, 'a generated entry ran before the operator confirmed it');
  assert.deepEqual(hits, {});

  const b = makeRoot();
  const edited = JSON.parse(JSON.stringify(generated));
  edited.states[STATE].status = 'confirmed';
  edited.states[STATE].store = 'localhost:5432';
  writeFileSync(seedPath(b), JSON.stringify(edited, null, 2));
  assert.deepEqual(edited.states[STATE].command, generated.states[STATE].command, 'only status and store were edited');
  const ran = /** @type {any} */ (await runRunner(b));
  assert.equal(ran.results.cases[0].outcome, 'pass', JSON.stringify(ran.results.cases[0]));
  assert.equal(existsSync(join(b, 'ran.txt')), true, 'the confirmed entry ran');
  assert.equal(hits['/ok'], 1);
});

// ---------------------------------------------------------------------------
// Command docs
// ---------------------------------------------------------------------------

test('AC-9/AC-10 the runner command doc states the refusal codes and /relay-qa-seed, and its example declaration is runnable under the classifier', () => {
  for (const token of ['STATE_UNCONFIRMED', 'STATE_COMMAND_MISSING', '/relay-qa-seed', '"command": null', '"status": "confirmed"']) {
    assert.ok(RUN_COMMAND_TEXT.includes(token), token);
  }
  const blocks = [...RUN_COMMAND_TEXT.matchAll(/```json\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const found = blocks.map((b) => { try { return JSON.parse(b); } catch { return null; } }).find((j) => j && j.states);
  assert.ok(found, 'no declaration example found');
  const [text, d] = Object.entries(found.states)[0];
  assert.equal(classifySeedDeclaration(d, text), null, 'the documented example declaration may run');
});

test('AC-8/AC-16 the seed command doc is a flat-frontmatter standalone command that cannot confirm an entry or dispatch anything', () => {
  const head = SEED_COMMAND_TEXT.split('\n').slice(0, 5).join('\n');
  assert.match(head, /^---\ndescription: /);
  assert.match(head, /\nargument-hint: /);
  assert.ok(!/^name:/m.test(SEED_COMMAND_TEXT.split('---')[1] ?? ''), 'a command carries no name key');
  assert.ok(SEED_COMMAND_TEXT.includes('Never invoked by /relay-execute'));
  for (const token of ['qa-seed.mjs" states', 'qa-seed.mjs" merge', '"command": null', 'STATE_UNCONFIRMED', 'STATE_COMMAND_MISSING', 'qa-seed-proposals.json']) {
    assert.ok(SEED_COMMAND_TEXT.includes(token), token);
  }
  for (const banned of ['subagent_type', '.claude/PRPs', 'Next:', '"status": "confirmed"']) {
    assert.ok(!SEED_COMMAND_TEXT.includes(banned), banned);
  }
});

test('AC-16 the generator script itself spawns nothing, fetches nothing and never writes the quoted word confirmed; the runner keeps its single guard and write sites', () => {
  assert.ok(!/child_process|spawn|exec(File)?Sync|fetch\(/.test(SEED_TEXT));
  assert.ok(!/["']confirmed["']/.test(SEED_TEXT));
  assert.equal(SEED_TEXT.split('writeFileSync(').length - 1, 1);
  assert.equal(SEED_TEXT.split('renameSync(').length - 1, 1);
  assert.equal(RUNNER_TEXT.split('// GUARD-SITE').length - 1, 1);
  assert.equal(RUNNER_TEXT.split('// WRITE-SITE').length - 1, 1);
  assert.ok(RUNNER_TEXT.includes("if (!a.includes('://')) continue;"), 'the pinned seed argv guard line survives');
});

// ---------------------------------------------------------------------------
// qa-run-contract: the seed script and seed command pins
// ---------------------------------------------------------------------------

/** @param {{ seedScriptText?: string | null, seedCommandText?: string | null }} o */
const contract = (o) => checkQaRunContract({ scriptText: RUNNER_TEXT, commandText: RUN_COMMAND_TEXT, results: [], ...o });
/** @param {{ findings: { message: string, file: string }[] }} r @param {string} file @param {string} part */
const found = (r, file, part) => r.findings.filter((f) => f.file === file && f.message.includes(part));
const seedFindings = (/** @type {any} */ r) => r.findings.filter((/** @type {any} */ f) => f.file === SEED_SCRIPT_FILE || f.file === SEED_COMMAND_FILE);

test('contract baseline: the real seed script and seed command add no finding, and the real-tree entry point agrees', () => {
  assert.deepEqual(seedFindings(contract({ seedScriptText: SEED_TEXT, seedCommandText: SEED_COMMAND_TEXT })), []);
  assert.equal(runQaRunContractCheck().ok, true);
});

test('contract: omitted seed inputs add no finding; null inputs report a missing file', () => {
  assert.deepEqual(seedFindings(contract({})), []);
  assert.equal(found(contract({ seedScriptText: null }), SEED_SCRIPT_FILE, `missing or unreadable file: ${SEED_SCRIPT_FILE}`).length, 1);
  assert.equal(found(contract({ seedCommandText: null }), SEED_COMMAND_FILE, `missing or unreadable file: ${SEED_COMMAND_FILE}`).length, 1);
});

test('AC-16 contract: each seed script violation is flagged individually (process spawning, a quoted confirmed, a second write, a lost marker, the report as a write target, no proposed)', () => {
  const r1 = contract({ seedScriptText: `${SEED_TEXT}\nimport 'node:child_process';\n` });
  assert.equal(found(r1, SEED_SCRIPT_FILE, 'must not use child_process').length, 1);
  for (const quote of ["'", '"']) {
    const r = contract({ seedScriptText: `${SEED_TEXT}\nconst c = ${quote}confirmed${quote};\n` });
    assert.equal(found(r, SEED_SCRIPT_FILE, 'quoted word confirmed').length, 1, quote);
  }
  const dupWrite = contract({ seedScriptText: `${SEED_TEXT}\nwriteFileSync('x', 'y');\n` });
  assert.equal(found(dupWrite, SEED_SCRIPT_FILE, 'writeFileSync( must appear exactly once, found 2').length, 1);
  const dupRename = contract({ seedScriptText: `${SEED_TEXT}\nrenameSync('a', 'b');\n` });
  assert.equal(found(dupRename, SEED_SCRIPT_FILE, 'renameSync( must appear exactly once, found 2').length, 1);
  const noMarker = contract({ seedScriptText: SEED_TEXT.split('// WRITE-SITE').join('// W') });
  assert.equal(found(noMarker, SEED_SCRIPT_FILE, '// WRITE-SITE exactly once, found 0').length, 1);
  const report = contract({ seedScriptText: `${SEED_TEXT}\nrmSync('qa-report.md');\n` });
  assert.equal(found(report, SEED_SCRIPT_FILE, 'must never write the report').length, 1);
  const noProposed = contract({ seedScriptText: SEED_TEXT.split("'proposed'").join("'x'").split('"proposed"').join('"x"') });
  assert.equal(found(noProposed, SEED_SCRIPT_FILE, 'must write proposed entries').length, 1);
});

test('contract: each seed command violation is flagged individually (a lost script reference, a lost proposed, a banned token, a confirmed status literal)', () => {
  assert.equal(found(contract({ seedCommandText: SEED_COMMAND_TEXT.split('qa-seed.mjs').join('REMOVED') }), SEED_COMMAND_FILE, 'must contain qa-seed.mjs').length, 1);
  assert.equal(found(contract({ seedCommandText: SEED_COMMAND_TEXT.split('proposed').join('REMOVED') }), SEED_COMMAND_FILE, 'must contain proposed').length, 1);
  for (const banned of ['subagent_type', '.claude/PRPs', '"status": "confirmed"']) {
    const r = contract({ seedCommandText: `${SEED_COMMAND_TEXT}\n${banned}\n` });
    assert.equal(found(r, SEED_COMMAND_FILE, `must not contain ${banned}`).length, 1, banned);
  }
});
