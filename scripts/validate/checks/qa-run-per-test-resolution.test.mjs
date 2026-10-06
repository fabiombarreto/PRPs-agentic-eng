// @ts-check
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-14 Record resolution is per cited test title, not per whole file
/**
 * Behavioral tests for per-test record resolution in plugins/relay/scripts/qa-run.mjs.
 *
 * Source PRD:  PRPs/prds/qa-runner-case-vocabulary.prd.md (AC-14)
 * Source plan: PRPs/plans/completed/qa-runner-case-vocabulary-phase-7-per-test-record-resolution.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Two layers:
 *  - the four exported pure helpers (citation normalization, cited-title
 *    extraction, exact title matching, JUnit suite chains), called directly;
 *  - the REAL script run as an async child process (spawned by absolute path)
 *    against a complete temp project: report, record.json, a JUnit artifact older
 *    than the record, and a run directory with evidence/.
 *
 * What the end-to-end layer pins: a citation naming a title is decided only by
 * the testcases that title names (one failing describe fails only its cases), a
 * title that matches nothing, matches only skipped testcases or follows no cited
 * file leaves the case unresolved, a file-only citation stays per file, and the
 * evidence records granularity file / test / mixed.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync, rmSync } from 'node:fs'; // readFileSync also reads the command doc
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateResults } from './qa-run-contract.mjs';
import { extractCitedTitles, normalizeTestCitation, titleMatchesTestcase, readJunitSuiteChains } from '../../../plugins/relay/scripts/qa-run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const REAL_SCRIPT = join(REPO, 'plugins', 'relay', 'scripts', 'qa-run.mjs');

const D = '—';
const R = '›';
const REC_GEN = '2026-10-01T10:00:00+00:00';
const GEN_MS = Date.parse(REC_GEN);
const RUN_DIR_REL = 'PRPs/reports/feat/qa-run/20260101T101010101Z';
const P = 'pass:AUTOMATED_EVIDENCE';
const X = 'fail:AUTOMATED_EVIDENCE';
const N = 'needs-human:NO_PLAN_ENTRY';

/** @type {string[]} */
const temps = [];
after(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/** @returns {string} */
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'qa-pertest-'));
  temps.push(d);
  return d;
}

/**
 * @param {string} script
 * @param {string[]} args
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(script, args) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rej(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      res({ code, stdout, stderr });
    });
  });
}

/**
 * A vitest-shaped testcase: classname is the file, name is `describe > test`.
 * @param {string} file
 * @param {string} name already XML-safe (use &gt; for the chain separator)
 * @param {'pass' | 'fail' | 'skip'} [state]
 */
function tc(file, name, state = 'pass') {
  const body = state === 'fail' ? '<failure type="AssertionError" message="boom"/>' : state === 'skip' ? '<skipped/>' : '';
  return `<testcase classname="${file}" name="${name}" time="0.1">${body}</testcase>`;
}

/**
 * @param {number} n
 * @param {string} path
 */
function caseBlock(n, path) {
  return `### ${n} ${D} Case ${n}\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** automated\n- **Automated test path:** ${path}\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n`;
}

/**
 * Builds a complete temp project, runs the real script in `run` mode and reads results.json.
 * @param {{ xml: string, citations: string[] }} spec `xml` is the inside of <testsuites>
 */
async function scenario(spec) {
  const root = tmp();
  const rd = join(root, 'PRPs', 'reports', 'feat');
  mkdirSync(rd, { recursive: true });
  const junitPath = join(rd, 'junit.xml');
  writeFileSync(junitPath, `<?xml version="1.0"?><testsuites>${spec.xml}</testsuites>`);
  const when = new Date(GEN_MS - 60000);
  utimesSync(junitPath, when, when);
  writeFileSync(
    join(rd, 'record.json'),
    JSON.stringify({
      run_id: 'r-1',
      attempt: 1,
      tier: 'unit',
      framework: 'vitest',
      outcome: 'FAILED',
      duration_ms: 5,
      counts: { passed: 1, failed: 1, skipped: 0, total: 2 },
      failures: [],
      artifacts: { junit_xml: junitPath },
      generated_at: REC_GEN,
    }),
  );
  writeFileSync(join(rd, 'qa-report.md'), `# QA Report\n\n${spec.citations.map((p, i) => caseBlock(i + 1, p)).join('')}`);
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(join(runDirAbs, 'evidence'), { recursive: true });
  const r = await runScript(REAL_SCRIPT, ['run', '--root', root, '--feature', 'feat', '--run-dir', RUN_DIR_REL]);
  /** @type {any} */ let results = null;
  try {
    results = JSON.parse(readFileSync(join(runDirAbs, 'results.json'), 'utf8'));
  } catch {
    // the assertion below reports stderr
  }
  assert.ok(results, `results.json missing; exit ${r.code}; stderr: ${r.stderr}`);
  assert.equal(r.code, 0, `run exited ${r.code}: ${r.stderr}`);
  /** @type {string[]} */ const outcomes = results.cases.map((/** @type {any} */ c) => `${c.outcome}:${c.reason_code}`);
  /** @param {number} i @returns {any} */
  const evidence = (i) => JSON.parse(readFileSync(join(root, ...results.cases[i].evidence[0].split('/')), 'utf8'));
  return { ...r, root, results, outcomes, evidence };
}

// ---------------------------------------------------------------------------
// 1. The pure helpers
// ---------------------------------------------------------------------------

/** @param {string} f */
const items = (f) => extractCitedTitles(f).items;

test('extractCitedTitles: a describe-then-test chain is ONE item, two describes are TWO items', () => {
  assert.deepEqual(items(`\`test/a.ts\` ${D} describe("AC-1 Pure") ${R} "t1"`), [{ segments: ['AC-1 Pure', 't1'], path: 'test/a.ts' }]);
  assert.deepEqual(items(`\`a/x.ts\` ${D} describe("A") plus describe('B')`), [
    { segments: ['A'], path: 'a/x.ts' },
    { segments: ['B'], path: 'a/x.ts' },
  ]);
});

test('extractCitedTitles: a title attaches to the nearest preceding cited path, and to none when no path precedes it', () => {
  assert.deepEqual(items(`\`a.ts\` ${D} describe("A"), \`b.ts\` ${D} describe("B")`), [
    { segments: ['A'], path: 'a.ts' },
    { segments: ['B'], path: 'b.ts' },
  ]);
  assert.deepEqual(items('describe("A") in `t/a.ts`'), [{ segments: ['A'], path: null }]);
});

test('extractCitedTitles: reads the :: and > span forms, and the it/test call forms', () => {
  assert.deepEqual(items('`t/a.ts::A > b`'), [{ segments: ['A', 'b'], path: 't/a.ts' }]);
  assert.deepEqual(items(`\`t/a.ts > A ${R} b\``), [{ segments: ['A', 'b'], path: 't/a.ts' }]);
  assert.deepEqual(items('`t.ts` test("x") it(\'y\')'), [
    { segments: ['x'], path: 't.ts' },
    { segments: ['y'], path: 't.ts' },
  ]);
});

test('extractCitedTitles: a bare file cites no title; escaped quotes are unescaped; whitespace is collapsed; duplicates are dropped; non-strings cite nothing', () => {
  assert.deepEqual(items('`t/a.ts`'), []);
  assert.deepEqual(items('`x.ts` describe("say \\"hi\\"")'), [{ segments: ['say "hi"'], path: 'x.ts' }]);
  assert.deepEqual(items('`x.ts` describe("AC-1   Pure")'), [{ segments: ['AC-1 Pure'], path: 'x.ts' }]);
  assert.deepEqual(items('`x.ts` describe("A") describe("A")'), [{ segments: ['A'], path: 'x.ts' }]);
  assert.deepEqual(extractCitedTitles(null), { items: [] });
});

test('normalizeTestCitation: reduces titled spans to their path and leaves everything else byte-identical', () => {
  assert.equal(normalizeTestCitation('`t/a.ts::A`, `t/b.ts > X > y`, `c.ts`'), '`t/a.ts`, `t/b.ts`, `c.ts`');
  assert.equal(normalizeTestCitation('`tests/a.spec.ts`, `tests/my file.spec.ts`'), '`tests/a.spec.ts`, `tests/my file.spec.ts`');
  assert.equal(normalizeTestCitation(null), null);
});

test('titleMatchesTestcase: exact and case-sensitive over name, class name, suite and ` > ` segment; no prefix or substring matching', () => {
  const m = titleMatchesTestcase;
  assert.ok(m('AC-1', { name: 'AC-1 > t', classname: 'f.ts' }), 'a describe segment of a vitest name');
  assert.ok(m('t', { name: 'AC-1 > t' }), 'the test segment');
  assert.ok(m('AC-1', { name: `AC-1 ${R} t` }), 'the Playwright separator');
  assert.ok(m('AC-1 Pure', { name: 'AC-1   Pure > t' }), 'whitespace collapsed on both sides');
  assert.ok(m('S', { name: 'x', classname: 'test', suites: ['m', 'S'] }), 'an enclosing suite name');
  assert.ok(!m('S', { name: 'x', classname: 'test', suites: ['m'] }), 'a suite that does not enclose does not match');
  assert.ok(!m('AC-1', { name: 'AC-10 > t' }), 'no prefix matching');
  assert.ok(!m('AC', { name: 'AC-1' }), 'no substring matching');
  assert.ok(!m('ac-1', { name: 'AC-1 > t' }), 'case-sensitive');
});

test('readJunitSuiteChains: one entry per testcase in document order, outermost suite first, entities decoded, self-closing handled', () => {
  const xml =
    '<testsuites><testsuite name="a"><testsuite name="b &amp; c"><testcase name="x"/></testsuite><testcase name="y"></testcase></testsuite><testcase name="z"/></testsuites>';
  assert.deepEqual(readJunitSuiteChains(xml), [['a', 'b & c'], ['a'], []]);
  assert.deepEqual(readJunitSuiteChains('<testsuites><testsuite name="s"/><testcase name="q"/></testsuites>'), [[]], 'a self-closing suite encloses nothing');
  // @ts-expect-error a non-string must not throw
  assert.deepEqual(readJunitSuiteChains(5), []);
});

// ---------------------------------------------------------------------------
// 2. End to end: the real runner resolves per cited title
// ---------------------------------------------------------------------------

const F = 'test/m.test.ts';
const G = 'test/g.test.ts';
const MIXED_XML =
  [
    tc(F, 'AC-1 Pure &gt; t1'),
    tc(F, 'AC-1 Pure &gt; t2'),
    tc(F, 'AC-2 Noop &gt; t3', 'fail'),
    tc(F, 'AC-3 Cat &gt; t4'),
    tc(F, 'AC-7 Skipped &gt; t7', 'skip'),
    tc(G, 'Suite G &gt; g1'),
  ].join('') +
  '<testsuite name="n.test"><testsuite name="AC-5 Anchor"><testcase name="t5" classname="test" file="/proj/test/n.test.mjs"/></testsuite>' +
  '<testsuite name="AC-6 Other"><testcase name="t6" classname="test" file="/proj/test/n.test.mjs"><failure message="boom"/></testcase></testsuite></testsuite>';

/** @type {[string, string][]} */
const CITATIONS = [
  [`\`${F}\` ${D} describe("AC-1 Pure")`, P], // 0 titled, passing describe
  [`\`${F}\` ${D} describe("AC-2 Noop")`, X], // 1 the failing describe fails only its case
  [`\`${F}\` ${D} describe("AC-3 Cat")`, P], // 2 a passing describe of the same file passes although a sibling failed
  [`\`${F}\` ${D} describe("AC-9 Missing")`, N], // 3 a title matching no testcase is unresolved
  [`\`${F}\``, X], // 4 file only: per file, the failing describe fails it
  [`\`${F}::AC-1 Pure\``, P], // 5 the :: span form
  [`\`${F} > AC-1 Pure > t1\``, P], // 6 the > span form
  [`\`${F}\` ${D} describe("AC-1 Pure") ${R} "t1"`, P], // 7 a chain narrows to one testcase
  [`\`${F}\` ${D} describe("AC-1 Pure"), \`${G}\` ${D} describe("Suite G")`, P], // 8 two files, both titled
  [`\`${F}\` ${D} describe("AC-1 Pure"), \`${G}\``, P], // 9 one titled file and one file-only: mixed
  [`describe("AC-1 Pure") in \`${F}\``, N], // 10 a title that follows no cited file is unresolved
  [`\`${F}\` ${D} describe("AC-1 …")`, N], // 11 a title in the report that no testcase carries
  ['`test/n.test.mjs` ' + D + ' describe("AC-5 Anchor")', P], // 12 an enclosing suite name scopes a node:test-shaped file
  ['`test/n.test.mjs` ' + D + ' describe("AC-6 Nothing")', N], // 13
  ['`test/n.test.mjs`', X], // 14 file only: the sibling failing suite fails it
  [`\`${F}\` ${D} describe("AC-7 Skipped")`, N], // 15 a title matching only skipped testcases is unresolved
  [`\`${F}\` ${D} describe("AC-2 Noop") ${R} "t1"`, N], // 16 chain segments must match the SAME testcase
];

test('per-title resolution: each citation routes by only the testcases its titles name', async () => {
  const s = await scenario({ xml: MIXED_XML, citations: CITATIONS.map(([c]) => c) });
  assert.deepEqual(
    s.outcomes,
    CITATIONS.map(([, want]) => want),
    `per-citation outcomes for: ${CITATIONS.map(([c]) => c).join(' | ')}`,
  );
  assert.equal(s.results.record_resolved, CITATIONS.filter(([, w]) => w !== N).length);
  assert.equal(s.results.report_sha256_before, s.results.report_sha256_after, 'the report must stay byte-identical');
  assert.deepEqual(validateResults(s.results), []);
});

test('per-title resolution: a failing describe fails only the case citing it and the evidence names its failing test', async () => {
  const s = await scenario({ xml: MIXED_XML, citations: CITATIONS.map(([c]) => c) });
  const failing = s.evidence(1);
  assert.deepEqual(failing.files[0].failed, ['AC-2 Noop > t3']);
  assert.equal(failing.files[0].testcases, 1);
  const passing = s.evidence(0);
  assert.equal(passing.files[0].testcases, 2);
  assert.deepEqual(passing.files[0].failed, []);
  assert.deepEqual(passing.files[0].titles, ['AC-1 Pure']);
  assert.equal(s.evidence(7).files[0].testcases, 1, 'a describe-then-test chain narrows to one testcase');
  assert.equal(s.evidence(5).files[0].testcases, 2, 'the :: form');
  assert.equal(s.evidence(6).files[0].testcases, 1, 'the > form');
  assert.deepEqual(s.evidence(12).files[0].failed, [], 'a failing sibling suite of the same file does not fail the cited one');
  assert.deepEqual(s.evidence(14).files[0].failed, ['t6'], 'the file-only citation of the same file fails');
});

test('granularity: file for a file-only citation (entry keeps its original keys), test for titled, mixed for both', async () => {
  const s = await scenario({ xml: MIXED_XML, citations: CITATIONS.map(([c]) => c) });
  const fileOnly = s.evidence(4);
  assert.equal(fileOnly.granularity, 'file');
  assert.equal(fileOnly.files[0].testcases, 4, 'file level decides over every non-skipped testcase of the file (the skipped one is excluded)');
  assert.deepEqual(Object.keys(fileOnly.files[0]).sort(), ['cited', 'failed', 'testcases']);
  assert.equal(s.evidence(0).granularity, 'test');
  assert.equal(s.evidence(8).granularity, 'test');
  assert.equal(s.evidence(8).files.length, 2);
  assert.equal(s.evidence(9).granularity, 'mixed');
});

// ---------------------------------------------------------------------------
// 3. The praesto-sum PS4 shape: nine describes of ONE file resolve independently
// ---------------------------------------------------------------------------

test('praesto-sum shape: nine describes of one file resolve independently; one failing describe fails only its case', async () => {
  const file = 'test/missed-sweep.test.ts';
  const describes = Array.from({ length: 9 }, (_, i) => `AC-${i + 1} Block ${i + 1}`);
  const FAILING = 3; // describe index
  // 13 testcases over the nine describes: four describes carry two tests
  const xml = describes
    .flatMap((d, i) => {
      const bad = i === FAILING ? 'fail' : 'pass';
      const out = [tc(file, `${d} &gt; first`, bad)];
      if (i < 4) out.push(tc(file, `${d} &gt; second`));
      return out;
    })
    .join('');
  const s = await scenario({ xml, citations: describes.map((d) => `\`${file}\` ${D} describe("${d}") ${R} "first"`) });
  assert.deepEqual(
    s.outcomes,
    describes.map((_, i) => (i === FAILING ? X : P)),
  );
  assert.equal(s.results.record_resolved, 9);
  for (let i = 0; i < 9; i++) {
    const ev = s.evidence(i);
    assert.equal(ev.granularity, 'test');
    assert.equal(ev.files[0].testcases, 1, `case ${i + 1} is decided by its own testcase alone`);
  }
  assert.deepEqual(s.evidence(FAILING).files[0].failed, [`${describes[FAILING]} > first`]);
});

test('praesto-sum shape: a cited describe absent from the run is unresolved even though its file passed', async () => {
  const file = 'test/missed-sweep.test.ts';
  const s = await scenario({
    xml: tc(file, 'AC-1 Block 1 &gt; first') + tc(file, 'AC-2 Block 2 &gt; first'),
    citations: [`\`${file}\` ${D} describe("AC-1 Block 1")`, `\`${file}\` ${D} describe("AC-3 Block 3")`],
  });
  assert.deepEqual(s.outcomes, [P, N]);
  assert.equal(s.results.record_resolved, 1);
});

// ---------------------------------------------------------------------------
// 4. The command documents title-level resolution and granularity (plan AC-A5)
// ---------------------------------------------------------------------------

const COMMAND_TEXT = readFileSync(join(REPO, 'plugins', 'relay', 'commands', 'relay-qa-run.md'), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} start the opening words of a bullet @returns {string | undefined} that bullet's single line */
const bulletStarting = (start) => COMMAND_TEXT.split('\n').find((l) => l.startsWith(start));

test('relay-qa-run.md documents title-level resolution: the cited shapes, exact matching and the unmatched-title rule', () => {
  const b = bulletStarting('- A cited test title narrows the decision to the testcases it names:');
  assert.ok(b, 'the title-level resolution bullet is missing from the record-resolution section');
  for (const phrase of [
    '`describe("...")`, `it("...")` or `test("...")`',
    '`<path>::<title>` or `<path> > <title>`',
    'must match a JUnit testcase of that file exactly',
    'an enclosing suite name',
    'only the matching testcases decide the outcome',
    'a cited title with no match, or one that follows no cited file, leaves the case not resolved',
  ]) {
    assert.ok(b.includes(phrase), `the bullet must state: ${phrase}`);
  }
});

test('relay-qa-run.md documents the evidence granularity values file, test and mixed', () => {
  const b = bulletStarting('- When the field cites only a file, resolution stays per file');
  assert.ok(b, 'the granularity bullet is missing from the record-resolution section');
  for (const phrase of ['the evidence records `granularity: file`', 'records `granularity: test`', 'records `granularity: mixed`']) {
    assert.ok(b.includes(phrase), `the bullet must state: ${phrase}`);
  }
  const at = COMMAND_TEXT.indexOf('- When the field cites only a file');
  assert.ok(at > COMMAND_TEXT.indexOf('never added to them.'), 'the bullet belongs to the record-resolution bullets, after the record_resolved one');
});
