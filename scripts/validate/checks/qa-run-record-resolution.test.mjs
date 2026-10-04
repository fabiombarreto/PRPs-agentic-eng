// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-17 A record-resolved pass is one the runner never executed: every refusal path is pinned
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-4 Closed outcome vocabulary (AUTOMATED_EVIDENCE is a reason_code, never an outcome)
/**
 * Behavioral tests for the record-resolution step of plugins/relay/scripts/qa-run.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md (AC-17)
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-6-dogfood-corrections.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). A case whose
 * coverage is `automated` is resolved from the Test Runner's schema-v1
 * record.json by reading the JUnit artifact the record points at. A resolved
 * `pass` is therefore a pass the runner NEVER executed, so the value of this
 * suite is the refusal paths: each input below must route exactly as before
 * (needs-human / NO_PLAN_ENTRY, record_resolved 0) and must never become an
 * AUTOMATED_EVIDENCE outcome.
 *
 * Every scenario runs the REAL script as an ASYNC child process (a sync spawn
 * would block this process's event loop) against a temp project. No baseUrl is
 * declared, so the runner opens no socket and loads no browser.
 *
 * Mutation proofs: the riskiest refusals are re-run against a COPY of the
 * script (under os.tmpdir(), never the original) with ONE anchored replacement.
 * The anchor must occur exactly once in the source, so a mutation can never be
 * a silent no-op; the mutated copy must then flip the outcome, which proves the
 * real assertion above is what held the line.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, utimesSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { validateResults } from './qa-run-contract.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const REAL_SCRIPT = join(REPO, 'plugins', 'relay', 'scripts', 'qa-run.mjs');
const REAL_GUARD = join(REPO, 'plugins', 'relay', 'scripts', 'auth-local-guard.mjs');
const REAL_SOURCE = readFileSync(REAL_SCRIPT, 'utf8').replace(/\r\n/g, '\n');

const CLOSED_OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];
const RESOLVED_PASS = 'pass:AUTOMATED_EVIDENCE';
const RESOLVED_FAIL = 'fail:AUTOMATED_EVIDENCE';
const ROUTED = 'needs-human:NO_PLAN_ENTRY';
const DASH = '—';
const REC_GEN = '2026-10-01T10:00:00+00:00';
const GEN_MS = Date.parse(REC_GEN);
const RUN_DIR_REL = 'PRPs/reports/feat/qa-run/20260101T101010101Z';

/** @type {string[]} */
const temps = [];
after(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/** @returns {string} */
function tmp() {
  const d = mkdtempSync(join(tmpdir(), 'qa-record-'));
  temps.push(d);
  return d;
}

/**
 * @param {string} script
 * @param {string[]} args
 * @param {string} [cwd]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(script, args, cwd) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
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
 * Copies the script (plus the guard it imports) into a temp plugin tree with ONE
 * anchored replacement. The anchor must occur exactly once.
 * @param {string} anchor
 * @param {string} replacement
 * @returns {string} path of the mutated copy
 */
function mutatedCopy(anchor, replacement) {
  assert.equal(REAL_SOURCE.split(anchor).length - 1, 1, `mutation anchor must occur exactly once: ${anchor}`);
  const dir = join(tmp(), 'plugins', 'relay', 'scripts');
  mkdirSync(dir, { recursive: true });
  copyFileSync(REAL_GUARD, join(dir, 'auth-local-guard.mjs'));
  const dest = join(dir, 'qa-run.mjs');
  writeFileSync(dest, REAL_SOURCE.replace(anchor, () => replacement));
  return dest;
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

/**
 * @param {string} file
 * @param {string} name
 * @param {'pass' | 'fail' | 'skip' | 'error'} [state] `error`: an ERRORED test (an `<error>` child and no `<failure>`), as Playwright, pytest and JUnit emit it
 * @param {'file' | 'classname'} [mode] `file`: the node:test shape; `classname`: the Playwright-reporter shape (no file attribute)
 */
function tc(file, name, state = 'pass', mode = 'file') {
  const where = mode === 'file' ? `classname="suite" file="${file}"` : `classname="${file}"`;
  const body =
    state === 'fail'
      ? '<failure type="AssertionError" message="boom: secret-ish-detail"/>'
      : state === 'error'
        ? '<error type="Error" message="crashed: secret-ish-detail"/>'
        : state === 'skip'
          ? '<skipped/>'
          : '';
  return `<testcase name="${name}" ${where} time="0.1">${body}</testcase>`;
}

const AB = [tc('/proj/test/a.test.mjs', 't1'), tc('/proj/test/a.test.mjs', 't2'), tc('/proj/test/b.test.mjs', 't3', 'fail')];

/**
 * A complete schema-v1 record.
 * @param {string} junitPath
 * @param {Record<string, any>} [over]
 * @returns {Record<string, any>}
 */
function validRecord(junitPath, over = {}) {
  return {
    run_id: 'r-1',
    attempt: 1,
    tier: 'unit',
    framework: 'node:test',
    outcome: 'FAILED',
    duration_ms: 5,
    counts: { passed: 2, failed: 1, skipped: 0, total: 3 },
    failures: [],
    artifacts: { junit_xml: junitPath },
    generated_at: REC_GEN,
    ...over,
  };
}

/**
 * @param {number} n
 * @param {string} cov
 * @param {string} path
 */
function caseBlock(n, cov, path) {
  return `### ${n} ${DASH} Case ${n}\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** ${cov}\n- **Automated test path:** ${path}\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n`;
}

/**
 * @typedef {{
 *   cases: { cov: string, path: string }[],
 *   junit?: string[],
 *   junitOffsetSec?: number,
 *   record?: null | Record<string, any> | ((junitPath: string) => Record<string, any>),
 *   attempts?: Record<string, Record<string, any> | ((junitPath: string) => Record<string, any>)>,
 *   script?: string,
 *   cwdIsReportDir?: boolean,
 *   breakEvidence?: boolean,
 * }} Spec
 */

/**
 * Builds the temp project, runs the script in `run` mode and reads results.json.
 * @param {Spec} spec
 */
async function scenario(spec) {
  const root = tmp();
  const rd = join(root, 'PRPs', 'reports', 'feat');
  mkdirSync(rd, { recursive: true });
  const junitPath = join(rd, 'junit.xml');
  writeFileSync(junitPath, `<?xml version="1.0"?><testsuites>${(spec.junit ?? AB).join('')}</testsuites>`);
  const when = new Date(GEN_MS + (spec.junitOffsetSec ?? -60) * 1000);
  utimesSync(junitPath, when, when);
  const rec = spec.record === undefined ? validRecord(junitPath) : typeof spec.record === 'function' ? spec.record(junitPath) : spec.record;
  if (rec !== null) writeFileSync(join(rd, 'record.json'), JSON.stringify(rec));
  for (const [n, r] of Object.entries(spec.attempts ?? {})) {
    mkdirSync(join(rd, 'attempts', n), { recursive: true });
    writeFileSync(join(rd, 'attempts', n, 'record.json'), JSON.stringify(typeof r === 'function' ? r(junitPath) : r));
  }
  writeFileSync(join(rd, 'qa-report.md'), `# QA Report\n\n${spec.cases.map((c, i) => caseBlock(i + 1, c.cov, c.path)).join('')}`);
  const runDirAbs = join(root, ...RUN_DIR_REL.split('/'));
  mkdirSync(runDirAbs, { recursive: true });
  if (spec.breakEvidence) writeFileSync(join(runDirAbs, 'evidence'), 'a file where the evidence directory should be');
  else mkdirSync(join(runDirAbs, 'evidence'));
  const r = await runScript(spec.script ?? REAL_SCRIPT, ['run', '--root', root, '--feature', 'feat', '--run-dir', RUN_DIR_REL], spec.cwdIsReportDir ? rd : undefined);
  /** @type {any} */ let results = null;
  try {
    results = JSON.parse(readFileSync(join(runDirAbs, 'results.json'), 'utf8'));
  } catch {
    // the assertion reading `results` reports stderr
  }
  assert.ok(results, `results.json missing; exit ${r.code}; stderr: ${r.stderr}`);
  /** @type {string[]} */ const outcomes = results.cases.map((/** @type {any} */ c) => `${c.outcome}:${c.reason_code}`);
  return { ...r, root, results, outcomes };
}

/**
 * The evidence file of case `i` (0-based), parsed.
 * @param {{ root: string, results: any }} s
 * @param {number} i
 * @returns {any}
 */
function evidenceOf(s, i) {
  const rel = s.results.cases[i].evidence[0];
  assert.equal(typeof rel, 'string', `case ${i} has no evidence path`);
  const abs = join(s.root, ...rel.split('/'));
  assert.ok(existsSync(abs), `evidence file missing: ${rel}`);
  return JSON.parse(readFileSync(abs, 'utf8'));
}

/** @param {{ code: number | null, stderr: string, results: any, outcomes: string[] }} s */
function assertWellFormed(s) {
  assert.equal(s.code, 0, `run exited ${s.code}: ${s.stderr}`);
  for (const c of s.results.cases) assert.ok(CLOSED_OUTCOMES.includes(c.outcome), `outcome ${c.outcome} outside the closed vocabulary`);
}

const ONE = (/** @type {string} */ path) => [{ cov: 'automated', path }];

// ---------------------------------------------------------------------------
// 1. The positive path: pass / fail / unresolved per cited file
// ---------------------------------------------------------------------------

test('resolves pass, fail and unresolved per cited test file, with evidence, a separate record_resolved count and driver-executed numbers that exclude them', async () => {
  const s = await scenario({
    cases: [
      { cov: 'automated', path: `\`test/a.test.mjs\` ${DASH} describe("AC-1")` },
      { cov: 'automated', path: '`test/b.test.mjs`' },
      { cov: 'automated', path: '`test/c.test.mjs`' },
      { cov: 'manual', path: 'n/a' },
      { cov: 'automated', path: '`test/a.test.mjs`, `test/b.test.mjs`' },
    ],
  });
  assertWellFormed(s);
  assert.deepEqual(s.outcomes, [RESOLVED_PASS, RESOLVED_FAIL, ROUTED, ROUTED, RESOLVED_FAIL]);
  assert.equal(s.results.cases.length, 5);
  assert.equal(s.results.record_resolved, 3);
  assert.deepEqual(s.results.counts, { pass: 1, fail: 2, blocked: 0, 'needs-human': 2 });
  for (const i of [0, 1, 4]) {
    assert.equal(s.results.cases[i].driver, null);
    assert.equal(s.results.cases[i].role, null);
  }
  const ev = evidenceOf(s, 0);
  assert.equal(ev.resolved_from, 'test-runner-record');
  assert.equal(ev.record, 'PRPs/reports/feat/record.json');
  assert.equal(ev.record_run_id, 'r-1');
  assert.equal(ev.record_attempt, 1);
  assert.equal(ev.record_generated_at, REC_GEN);
  assert.match(ev.junit_artifact, /junit\.xml$/);
  assert.ok(Math.abs(Date.parse(ev.junit_artifact_mtime) - (GEN_MS - 60000)) <= 2, `junit_artifact_mtime ${ev.junit_artifact_mtime}`);
  assert.deepEqual(ev.files, [{ cited: 'test/a.test.mjs', testcases: 2, failed: [] }]);
  const failEv = evidenceOf(s, 1);
  assert.deepEqual(failEv.files, [{ cited: 'test/b.test.mjs', testcases: 1, failed: ['t3'] }]);
  assert.doesNotMatch(JSON.stringify(failEv), /secret-ish-detail|boom/, 'a failure message must not be copied into evidence');
  const both = evidenceOf(s, 4);
  assert.deepEqual(
    both.files.map((/** @type {any} */ f) => f.cited),
    ['test/a.test.mjs', 'test/b.test.mjs'],
  );
  assert.match(s.results.cases[0].reason, /PRPs\/reports\/feat\/record\.json/);
  assert.match(s.results.cases[0].reason, /run r-1/);
  assert.match(s.results.cases[0].reason, /attempt 1/);
  assert.ok(s.results.cases[0].reason.includes(REC_GEN), 'the reason must name generated_at');
  // the summary: driver-executed numbers exclude record-resolved ones, which are printed on their own line
  assert.match(s.stdout, /QA run finished: pass=0 fail=0 blocked=0 needs-human=2\n/);
  assert.match(s.stdout, /record-resolved=3 \(pass=1 fail=2\)/);
  // the contract accepts what the runner wrote
  assert.deepEqual(validateResults(s.results), []);
});

// ---------------------------------------------------------------------------
// 2. Refusals: a record that is not evidence
// ---------------------------------------------------------------------------

test('control: the fixture the refusal tests share resolves when the record is valid', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`') });
  assertWellFormed(s);
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
});

/** @type {{ name: string, record: null | Record<string, any> | ((j: string) => Record<string, any>), cwdIsReportDir?: boolean }[]} */
const REFUSED_RECORDS = [
  { name: 'no record at all (absence is not an error)', record: null },
  { name: 'a hand-written outcome GREEN record with no counts, failures or artifacts (praesto-sum real shape)', record: { outcome: 'GREEN', note: 'hand written' } },
  { name: 'a record missing run_id', record: (j) => { const r = validRecord(j); delete r.run_id; return r; } },
  { name: 'a record with attempt 0', record: (j) => validRecord(j, { attempt: 0 }) },
  { name: 'a record missing framework', record: (j) => { const r = validRecord(j); delete r.framework; return r; } },
  { name: 'a record whose counts are strings', record: (j) => validRecord(j, { counts: { passed: '2', failed: '1', skipped: '0', total: '3' } }) },
  { name: 'a record with no artifacts object', record: (j) => { const r = validRecord(j); delete r.artifacts; return r; } },
  { name: 'a record with no generated_at', record: (j) => { const r = validRecord(j); delete r.generated_at; return r; } },
  { name: 'a record whose failures is not an array', record: (j) => validRecord(j, { failures: 'none' }) },
  { name: 'a record with an outcome outside the schema (GREEN) but otherwise complete', record: (j) => validRecord(j, { outcome: 'GREEN' }) },
  { name: 'outcome SKIPPED_UPSTREAM_FAILURE (that run executed nothing), counts otherwise consistent', record: (j) => validRecord(j, { outcome: 'SKIPPED_UPSTREAM_FAILURE' }) },
  { name: 'counts.total == 0 (the run executed nothing)', record: (j) => validRecord(j, { counts: { passed: 0, failed: 0, skipped: 0, total: 0 } }) },
  { name: 'outcome PASSED while counts.failed > 0', record: (j) => validRecord(j, { outcome: 'PASSED' }) },
  { name: 'a total that does not match passed + failed + skipped', record: (j) => validRecord(j, { counts: { passed: 2, failed: 1, skipped: 0, total: 5 } }) },
  { name: 'a negative count that still sums to the total (passed 3, failed -1, skipped 0, total 2)', record: (j) => validRecord(j, { counts: { passed: 3, failed: -1, skipped: 0, total: 2 } }) },
  { name: 'a relative junit_xml path', record: (j) => validRecord(j, { artifacts: { junit_xml: 'junit.xml' } }), cwdIsReportDir: true },
];

for (const r of REFUSED_RECORDS) {
  test(`refused: ${r.name} resolves nothing and the case routes as before`, async () => {
    const s = await scenario({ cases: ONE('`test/a.test.mjs`'), record: r.record, cwdIsReportDir: r.cwdIsReportDir });
    assertWellFormed(s);
    assert.deepEqual(s.outcomes, [ROUTED]);
    assert.equal(s.results.record_resolved, 0);
    assert.ok(!existsSync(join(s.root, ...RUN_DIR_REL.split('/'), 'evidence', 'case-1.record.json')), 'no record-resolution evidence may exist for a refused record');
  });
}

// ---------------------------------------------------------------------------
// 3. Discovery: no fall-through, numeric order
// ---------------------------------------------------------------------------

test('discovery: a top-level record.json that exists but is invalid ends resolution; a valid attempts/3/record.json beside it is never consulted', async () => {
  const s = await scenario({
    cases: ONE('`test/a.test.mjs`'),
    record: { outcome: 'GREEN', note: 'hand written' },
    attempts: { 3: (j) => validRecord(j, { run_id: 'r-3', attempt: 3 }) },
  });
  assertWellFormed(s);
  assert.deepEqual(s.outcomes, [ROUTED]);
  assert.equal(s.results.record_resolved, 0);
});

test('discovery: with no top-level record the attempts/<N>/record.json resolves (control for the no-fall-through test)', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), record: null, attempts: { 3: (j) => validRecord(j, { run_id: 'r-3', attempt: 3 }) } });
  assertWellFormed(s);
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
  const ev = evidenceOf(s, 0);
  assert.equal(ev.record, 'PRPs/reports/feat/attempts/3/record.json');
  assert.equal(ev.record_run_id, 'r-3');
});

test('discovery: a valid top-level record.json wins over any attempts/<N>/record.json', async () => {
  const s = await scenario({
    cases: ONE('`test/a.test.mjs`'),
    record: (j) => validRecord(j, { run_id: 'r-top' }),
    attempts: { 2: (j) => validRecord(j, { run_id: 'r-2', attempt: 2 }) },
  });
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
  assert.equal(evidenceOf(s, 0).record_run_id, 'r-top');
});

test('discovery is numeric: attempts/10 beats attempts/9', async () => {
  const s = await scenario({
    cases: ONE('`test/a.test.mjs`'),
    record: null,
    attempts: { 9: (j) => validRecord(j, { run_id: 'r-9', attempt: 9 }), 10: (j) => validRecord(j, { run_id: 'r-10', attempt: 10 }) },
  });
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
  const ev = evidenceOf(s, 0);
  assert.equal(ev.record_run_id, 'r-10');
  assert.equal(ev.record, 'PRPs/reports/feat/attempts/10/record.json');
});

test('discovery: the highest attempt is the only one examined; an invalid attempts/3 is not skipped in favour of a valid attempts/2', async () => {
  const s = await scenario({
    cases: ONE('`test/a.test.mjs`'),
    record: null,
    attempts: { 2: (j) => validRecord(j, { run_id: 'r-2', attempt: 2 }), 3: { outcome: 'GREEN' } },
  });
  assert.deepEqual(s.outcomes, [ROUTED]);
  assert.equal(s.results.record_resolved, 0);
});

// ---------------------------------------------------------------------------
// 4. Freshness of the JUnit artifact
// ---------------------------------------------------------------------------

test('freshness: a JUnit file 119 s newer than generated_at resolves and its mtime is recorded in the evidence', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), junitOffsetSec: 119 });
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
  const ev = evidenceOf(s, 0);
  assert.ok(Math.abs(Date.parse(ev.junit_artifact_mtime) - (GEN_MS + 119000)) <= 2, `junit_artifact_mtime ${ev.junit_artifact_mtime}`);
});

test('freshness: a JUnit file 121 s newer than generated_at (a later run overwrote the path) is refused', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), junitOffsetSec: 121 });
  assert.deepEqual(s.outcomes, [ROUTED]);
  assert.equal(s.results.record_resolved, 0);
});

test('freshness: an unparseable generated_at is refused', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { generated_at: 'not-a-date' }) });
  assert.deepEqual(s.outcomes, [ROUTED]);
});

// ---------------------------------------------------------------------------
// 5. Exactly one distinct file per cited path
// ---------------------------------------------------------------------------

test('a cited path matches by exact equality or a "/"-bounded suffix: e2e/a.spec.ts resolves against /proj/e2e/a.spec.ts', async () => {
  const s = await scenario({ cases: ONE('`e2e/a.spec.ts`'), junit: [tc('/proj/e2e/a.spec.ts', 't1'), tc('/proj/admin/a.spec.ts', 't2')] });
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
  assert.deepEqual(evidenceOf(s, 0).files, [{ cited: 'e2e/a.spec.ts', testcases: 1, failed: [] }]);
});

test('an ambiguous suffix (a.spec.ts against e2e/a.spec.ts and admin/a.spec.ts) is refused, never merged into one verdict', async () => {
  const s = await scenario({ cases: ONE('`a.spec.ts`'), junit: [tc('/proj/e2e/a.spec.ts', 't1'), tc('/proj/admin/a.spec.ts', 't2', 'fail')] });
  assert.deepEqual(s.outcomes, [ROUTED]);
  assert.equal(s.results.record_resolved, 0);
});

test('an exact match and a suffix match together (two distinct files) are refused', async () => {
  const s = await scenario({ cases: ONE('`a.spec.ts`'), junit: [tc('a.spec.ts', 't1'), tc('/proj/e2e/a.spec.ts', 't2')] });
  assert.deepEqual(s.outcomes, [ROUTED]);
});

test('xa.spec.ts does not match a cited a.spec.ts (the suffix must start at a path separator)', async () => {
  const s = await scenario({ cases: ONE('`a.spec.ts`'), junit: [tc('/proj/xa.spec.ts', 't1')] });
  assert.deepEqual(s.outcomes, [ROUTED]);
});

test('the classname fallback resolves when the testcase has no file attribute (the Playwright reporter shape)', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), junit: [tc('test/a.test.mjs', 't1', 'pass', 'classname'), tc('test/a.test.mjs', 't2', 'fail', 'classname')] });
  assert.deepEqual(s.outcomes, [RESOLVED_FAIL]);
  assert.deepEqual(evidenceOf(s, 0).files, [{ cited: 'test/a.test.mjs', testcases: 2, failed: ['t2'] }]);
});

// ---------------------------------------------------------------------------
// 6. Skipped testcases are not evidence of a pass
// ---------------------------------------------------------------------------

test('a file with only skipped testcases does not pass; it is unresolved', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), junit: [tc('/proj/test/a.test.mjs', 't1', 'skip'), tc('/proj/test/a.test.mjs', 't2', 'skip')] });
  assert.deepEqual(s.outcomes, [ROUTED]);
  assert.equal(s.results.record_resolved, 0);
});

test('an errored testcase (an <error> child, no <failure>) resolves fail, never pass, and is named in the evidence', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), junit: [tc('/proj/test/a.test.mjs', 't1'), tc('/proj/test/a.test.mjs', 't2', 'error')] });
  assertWellFormed(s);
  assert.deepEqual(s.outcomes, [RESOLVED_FAIL]);
  assert.equal(s.results.record_resolved, 1);
  assert.deepEqual(evidenceOf(s, 0).files, [{ cited: 'test/a.test.mjs', testcases: 2, failed: ['t2'] }]);
  assert.doesNotMatch(JSON.stringify(evidenceOf(s, 0)), /secret-ish-detail|crashed/, 'an error message must not be copied into evidence');
});

test('one skipped plus one passing testcase resolves pass, counting only the one that ran', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), junit: [tc('/proj/test/a.test.mjs', 't1', 'skip'), tc('/proj/test/a.test.mjs', 't2', 'pass')] });
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
  assert.deepEqual(evidenceOf(s, 0).files, [{ cited: 'test/a.test.mjs', testcases: 1, failed: [] }]);
});

// ---------------------------------------------------------------------------
// 7. Multi-path decisions
// ---------------------------------------------------------------------------

test('multi-path: one unlisted file leaves the whole case unresolved even when another cited file failed', async () => {
  const s = await scenario({ cases: ONE('`test/b.test.mjs`, `test/c.test.mjs`') });
  assert.deepEqual(s.outcomes, [ROUTED]);
});

test('multi-path: all files listed and one failing file gives fail, naming both files in the evidence', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`, `test/b.test.mjs`') });
  assert.deepEqual(s.outcomes, [RESOLVED_FAIL]);
  assert.equal(evidenceOf(s, 0).files.length, 2);
});

test('multi-path: all files listed and none failing gives pass', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`, `test/d.test.mjs`'), junit: [...AB, tc('/proj/test/d.test.mjs', 't4')] });
  assert.deepEqual(s.outcomes, [RESOLVED_PASS]);
});

// ---------------------------------------------------------------------------
// 8. Path extraction: the required set is never shrunk silently
// ---------------------------------------------------------------------------

test('path extraction: unparseable or truncated citations leave the case unresolved, well-formed ones resolve', async () => {
  const junit = [tc('/proj/tests/a.spec.ts', 't1'), tc('/proj/tests/b.spec.ts', 't2'), tc('/proj/test/missed-sweep.test.ts', 't3')];
  /** @type {[string, string][]} */
  const table = [
    ['`tests/a.spec.ts`', RESOLVED_PASS],
    ['`tests/a.spec.ts`, `tests/b.spec.ts`', RESOLVED_PASS],
    [`\`test/missed-sweep.test.ts\` ${DASH} describe("AC-1 …") › "…"`, RESOLVED_PASS],
    ['tests/a.spec.ts (AC-1), tests/b.spec.ts', ROUTED],
    ['`tests/a.spec.ts`, `login.feature`', ROUTED],
    ['`tests/a.spec.ts`, `tests/my file.spec.ts`', ROUTED],
    ['tests/a.spec.ts:42', ROUTED],
    ['`tests/a.spec.ts:42`', ROUTED],
    ['n/a', ROUTED],
    ['TBD', ROUTED],
  ];
  const s = await scenario({ cases: table.map(([path]) => ({ cov: 'automated', path })), junit });
  assertWellFormed(s);
  assert.deepEqual(
    s.outcomes,
    table.map(([, want]) => want),
    `per-citation outcomes for: ${table.map(([p]) => p).join(' | ')}`,
  );
  assert.equal(s.results.record_resolved, 3);
});

// ---------------------------------------------------------------------------
// 9. The coverage gate
// ---------------------------------------------------------------------------

test('coverage gate: only `automated` (and its backticked and bold forms) resolves; manual, none, partial and unverified do not', async () => {
  /** @type {[string, string][]} */
  const table = [
    ['automated', RESOLVED_PASS],
    ['`automated`', RESOLVED_PASS],
    ['**automated**', RESOLVED_PASS],
    ['Automated', RESOLVED_PASS],
    ['manual', ROUTED],
    ['none', ROUTED],
    ['automated (partial)', ROUTED],
    ['unverified', ROUTED],
  ];
  const s = await scenario({ cases: table.map(([cov]) => ({ cov, path: '`test/a.test.mjs`' })) });
  assertWellFormed(s);
  assert.deepEqual(
    s.outcomes,
    table.map(([, want]) => want),
    `per-coverage outcomes for: ${table.map(([c]) => c).join(' | ')}`,
  );
  assert.equal(s.results.record_resolved, 4);
});

// ---------------------------------------------------------------------------
// 10. results.json, the summary and the contract
// ---------------------------------------------------------------------------

test('record_resolved equals the number of AUTOMATED_EVIDENCE entries and counts stays the four-outcome partition that contains them', async () => {
  const s = await scenario({ cases: [...ONE('`test/a.test.mjs`'), ...ONE('`test/b.test.mjs`'), { cov: 'manual', path: 'n/a' }] });
  const resolved = s.results.cases.filter((/** @type {any} */ c) => c.reason_code === 'AUTOMATED_EVIDENCE');
  assert.equal(s.results.record_resolved, resolved.length);
  assert.equal(resolved.length, 2);
  assert.deepEqual(Object.keys(s.results.counts).sort(), [...CLOSED_OUTCOMES].sort());
  assert.equal(
    Object.values(s.results.counts).reduce((a, b) => a + b, 0),
    s.results.cases.length,
  );
  assert.equal(s.results.counts.pass, 1);
  assert.equal(s.results.counts.fail, 1);
});

test('the outcome vocabulary is still exactly pass | fail | blocked | needs-human and AUTOMATED_EVIDENCE is not one of them', () => {
  assert.equal(REAL_SOURCE.split("export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];").length - 1, 1);
  assert.ok(!CLOSED_OUTCOMES.includes('AUTOMATED_EVIDENCE'));
  const literals = [...REAL_SOURCE.matchAll(/outcome\s*[:=]\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(literals.length > 0, 'the runner must assign outcomes through literals this test can read');
  for (const lit of literals) assert.ok(CLOSED_OUTCOMES.includes(lit), `outcome literal ${lit} is outside the closed vocabulary`);
});

const BASE_RESULTS = {
  started_at: '2026-10-04T10:00:00.123Z',
  finished_at: '2026-10-04T10:00:01.123Z',
  human_gate: { status: 'open' },
  counts: { pass: 1, fail: 0, blocked: 0, 'needs-human': 0 },
  cases: [{ outcome: 'pass', reason_code: 'AUTOMATED_EVIDENCE', started_at: '2026-10-04T10:00:00.123Z', finished_at: '2026-10-04T10:00:00.456Z', evidence: ['e'] }],
};

test('qa-run-contract accepts a consistent record_resolved and a results file that predates the key', () => {
  assert.deepEqual(validateResults({ ...BASE_RESULTS, record_resolved: 1 }), []);
  assert.deepEqual(validateResults({ ...BASE_RESULTS }), []);
});

test('qa-run-contract rejects a record_resolved that disagrees with the AUTOMATED_EVIDENCE entries (too low, too high, negative, non-integer)', () => {
  for (const bad of [0, 2, -1, 1.5, '1']) {
    const msgs = validateResults({ ...BASE_RESULTS, record_resolved: bad });
    assert.ok(
      msgs.some((m) => m.includes('record_resolved')),
      `record_resolved=${JSON.stringify(bad)} must be rejected, got ${JSON.stringify(msgs)}`,
    );
  }
});

test('qa-run-contract rejects an AUTOMATED_EVIDENCE case whose outcome is not pass or fail', () => {
  for (const outcome of ['blocked', 'needs-human']) {
    const results = {
      ...BASE_RESULTS,
      record_resolved: 1,
      counts: { pass: 0, fail: 0, blocked: outcome === 'blocked' ? 1 : 0, 'needs-human': outcome === 'needs-human' ? 1 : 0 },
      cases: [{ ...BASE_RESULTS.cases[0], outcome, evidence: [] }],
    };
    const msgs = validateResults(results);
    assert.ok(
      msgs.some((m) => m.includes('AUTOMATED_EVIDENCE') && m.includes(outcome)),
      `${outcome} + AUTOMATED_EVIDENCE must be rejected, got ${JSON.stringify(msgs)}`,
    );
  }
});

// ---------------------------------------------------------------------------
// 11. An evidence-write failure never yields a pass
// ---------------------------------------------------------------------------

test('an evidence-write failure yields blocked EVIDENCE_WRITE_FAILED, never a pass, and the case is not counted as record-resolved', async () => {
  const s = await scenario({ cases: ONE('`test/a.test.mjs`'), breakEvidence: true });
  assert.equal(s.results.cases.length, 1);
  assert.equal(s.results.cases[0].outcome, 'blocked');
  assert.equal(s.results.cases[0].reason_code, 'EVIDENCE_WRITE_FAILED');
  assert.equal(s.results.record_resolved, 0);
  assert.deepEqual(validateResults(s.results), []);
});

// ---------------------------------------------------------------------------
// 12. Mutation proofs: each refusal is what held the line
// ---------------------------------------------------------------------------

/**
 * @type {{ name: string, anchor: string, replacement: string, spec: Spec }[]}
 */
const MUTATIONS = [
  {
    name: 'allowing a record outside schema v1 (missing run_id)',
    anchor: 'if (!isSchemaV1Record(rec)) return null;',
    replacement: 'if (!isObj(rec)) return null;',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => { const r = validRecord(j); delete r.run_id; return r; } },
  },
  {
    name: 'restoring fall-through to the next candidate when the top-level record is invalid',
    anchor: 'if (existsSync(top)) return { abs: top, rel: `${relDir}/record.json` };',
    replacement: 'if (existsSync(top) && isSchemaV1Record(readJsonOrNull(top))) return { abs: top, rel: `${relDir}/record.json` };',
    spec: { cases: ONE('`test/a.test.mjs`'), record: { outcome: 'GREEN' }, attempts: { 3: (j) => validRecord(j, { run_id: 'r-3', attempt: 3 }) } },
  },
  {
    name: 'dropping the JUnit mtime check',
    anchor: 'if (st.mtimeMs > generated + JUNIT_MTIME_SLACK_MS) return null;',
    replacement: '',
    spec: { cases: ONE('`test/a.test.mjs`'), junitOffsetSec: 121 },
  },
  {
    name: 'dropping the unparseable generated_at refusal',
    anchor: 'if (Number.isNaN(generated)) return null;',
    replacement: '',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { generated_at: 'not-a-date' }) },
  },
  {
    name: 'allowing several matching files for one cited path',
    anchor: 'if (new Set(hit.map((t) => t.loc)).size !== 1) return null;',
    replacement: 'if (hit.length === 0) return null;',
    spec: { cases: ONE('`a.spec.ts`'), junit: [tc('/proj/e2e/a.spec.ts', 't1'), tc('/proj/admin/a.spec.ts', 't2')] },
  },
  {
    name: 'matching by a bare string suffix instead of a path-separator-bounded one',
    anchor: 't.loc !== null && (t.loc === p || t.loc.endsWith(`/${p}`))',
    replacement: 't.loc !== null && t.loc.endsWith(p)',
    spec: { cases: ONE('`a.spec.ts`'), junit: [tc('/proj/xa.spec.ts', 't1')] },
  },
  {
    name: 'dropping the truncated-tail scan',
    anchor: "if (tok !== '' && looksPathLike(tok)) refused = true;",
    replacement: '',
    spec: { cases: ONE('tests/a.spec.ts (AC-1), tests/b.spec.ts'), junit: [tc('/proj/tests/a.spec.ts', 't1'), tc('/proj/tests/b.spec.ts', 't2')] },
  },
  {
    name: 'counting a skipped-only file as listed',
    anchor: 'if (ran.length === 0) return null;',
    replacement: '',
    spec: { cases: ONE('`test/a.test.mjs`'), junit: [tc('/proj/test/a.test.mjs', 't1', 'skip')] },
  },
  {
    name: 'resolving any coverage value that is not empty',
    anchor: "if (cov !== 'automated') return null;",
    replacement: "if (cov === '') return null;",
    spec: { cases: [{ cov: 'manual', path: '`test/a.test.mjs`' }] },
  },
  {
    name: 'accepting a record whose run executed nothing (counts.total == 0)',
    anchor: 'if (c.total !== c.passed + c.failed + c.skipped || c.total <= 0) return false;',
    replacement: 'if (c.total !== c.passed + c.failed + c.skipped) return false;',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { counts: { passed: 0, failed: 0, skipped: 0, total: 0 } }) },
  },
  {
    name: 'accepting a total that does not match the counts',
    anchor: 'if (c.total !== c.passed + c.failed + c.skipped || c.total <= 0) return false;',
    replacement: 'if (c.total <= 0) return false;',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { counts: { passed: 2, failed: 1, skipped: 0, total: 5 } }) },
  },
  {
    name: 'accepting a negative count that still sums to the total',
    anchor: '!Number.isInteger(c[k]) || c[k] < 0',
    replacement: '!Number.isInteger(c[k])',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { counts: { passed: 3, failed: -1, skipped: 0, total: 2 } }) },
  },
  {
    name: 'accepting SKIPPED_UPSTREAM_FAILURE as an executed outcome',
    anchor: "const RECORD_EXECUTED_OUTCOMES = ['PASSED', 'FAILED', 'FAILED_AFTER_N_RETRIES', 'FAILED_TIME_BUDGET_EXCEEDED'];",
    replacement: "const RECORD_EXECUTED_OUTCOMES = ['PASSED', 'FAILED', 'FAILED_AFTER_N_RETRIES', 'FAILED_TIME_BUDGET_EXCEEDED', 'SKIPPED_UPSTREAM_FAILURE'];",
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { outcome: 'SKIPPED_UPSTREAM_FAILURE' }) },
  },
  {
    name: 'accepting outcome PASSED while counts.failed > 0',
    anchor: "if (rec.outcome === 'PASSED' && c.failed !== 0) return false;",
    replacement: '',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { outcome: 'PASSED' }) },
  },
  {
    name: 'accepting a relative junit_xml path',
    anchor: '|| !isAbsolute(rec.artifacts.junit_xml)',
    replacement: '',
    spec: { cases: ONE('`test/a.test.mjs`'), record: (j) => validRecord(j, { artifacts: { junit_xml: 'junit.xml' } }), cwdIsReportDir: true },
  },
];

for (const m of MUTATIONS) {
  test(`mutation: ${m.name} flips the outcome (the refusal test above is what catches it)`, async () => {
    const real = await scenario(m.spec);
    assert.deepEqual(real.outcomes, [ROUTED], `the real script must refuse; stderr: ${real.stderr}`);
    const mutated = await scenario({ ...m.spec, script: mutatedCopy(m.anchor, m.replacement) });
    assert.equal(mutated.code, 0, mutated.stderr);
    assert.deepEqual(mutated.outcomes, [RESOLVED_PASS], 'the mutated copy must resolve the case the real script refuses');
  });
}

test('mutation: reading only <failure> (not <error>) as a failed testcase turns an errored test into a record-resolved pass (the errored-testcase test above is what catches it)', async () => {
  const spec = { cases: ONE('`test/a.test.mjs`'), junit: [tc('/proj/test/a.test.mjs', 't1', 'error')] };
  const real = await scenario(spec);
  assert.deepEqual(real.outcomes, [RESOLVED_FAIL], `the real script must resolve an errored test as fail; stderr: ${real.stderr}`);
  const mutated = await scenario({ ...spec, script: mutatedCopy('failed: /<(failure|error)\\b/.test(body),', 'failed: /<(failure)\\b/.test(body),') });
  assert.equal(mutated.code, 0, mutated.stderr);
  assert.deepEqual(mutated.outcomes, [RESOLVED_PASS], 'the mutated copy must resolve the errored test as a pass the runner never executed');
});

test('mutation: lexicographic discovery picks attempts/9 over attempts/10 (the numeric-discovery test above is what catches it)', async () => {
  const spec = {
    cases: ONE('`test/a.test.mjs`'),
    record: null,
    attempts: { 9: (/** @type {string} */ j) => validRecord(j, { run_id: 'r-9', attempt: 9 }), 10: (/** @type {string} */ j) => validRecord(j, { run_id: 'r-10', attempt: 10 }) },
  };
  const real = await scenario(spec);
  assert.equal(evidenceOf(real, 0).record_run_id, 'r-10');
  const mutated = await scenario({
    ...spec,
    script: mutatedCopy('best = Math.max(best, Number(ent.name));', 'best = best < 0 || ent.name > String(best) ? Number(ent.name) : best;'),
  });
  assert.equal(evidenceOf(mutated, 0).record_run_id, 'r-9');
});
