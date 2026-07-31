// @ts-check
/**
 * Unit tests for the pure classification surface exported by
 * scripts/efficiency.mjs: `classifyArtifacts`, `readCorpus`, `aggregate`,
 * `firstSeen` and `hasDegradedTimestamp`.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, APPROVED scripts/efficiency.mjs.
 *
 * Source plan (description mode — no source PRD):
 *   PRPs/plans/close-the-consumer-half-of-the-v0250-reviewstartedat.plan.md
 *
 * Authored by the test pair under R-X strict (docs/decisions.md
 * [2026-07-12] / [2026-05-06]): the Implementer never touches this file.
 *
 * Scope: covers both the unit-testable classification rule (AC-A1, AC-A2,
 * AC-A5, via direct calls against the imported pure functions) and, via
 * `execFileSync` subprocess invocations of the real CLI against a synthetic
 * corpus built in a fresh `mkdtempSync` temp directory (never the real
 * `PRPs/plans/` corpus), the observable CLI-level contracts of AC-A3, AC-A4
 * and AC-A6. The synthetic corpus is deliberate: it pins BEHAVIOUR (a
 * degraded artifact is excluded from both aggregates and named in a
 * distinct warning) rather than a corpus-dependent count (e.g. the live
 * corpus's "recomputed 82") that would rot as the real corpus grows.
 *
 * Traceability:
 *   AC-A1 — readCorpus retains a per-entry `degraded` boolean parsed from
 *     the JSON object's `timestamp_degraded` field; a prose mention of the
 *     token with no such field is NOT treated as degraded. Covered by the
 *     two DECOY tests below (real-corpus + synthetic mutation).
 *   AC-A2 — an artifact ANY of whose entries is degraded appears in neither
 *     the before nor the after aggregate. Covered by the "only entry
 *     degraded" and "one of several entries degraded" tests, plus the
 *     no-regression and undated-vs-degraded tests.
 *   AC-A3 — `compare` prints a `WARNING -` line, distinct from the undated
 *     warning, that states the count AND names each excluded artifact file.
 *     Covered by the CLI warning-naming test below (synthetic corpus with
 *     one degraded, one undated, and one plain artifact).
 *   AC-A4 — a degraded artifact is excluded from both the before and after
 *     aggregates `compare` prints. Covered by the CLI aggregate-exclusion
 *     test below, which asserts the observable behaviour against a
 *     synthetic corpus rather than hardcoding any live-corpus count.
 *   AC-A5 — the module can be imported with no side effects and exports
 *     classifyArtifacts, readCorpus, aggregate, firstSeen and
 *     hasDegradedTimestamp. Covered by the two import-safety tests below.
 *   AC-A6 — both CLI modes still behave: `snapshot --label X` writes a
 *     marker file, and a bare invocation prints `Usage:` and exits
 *     non-zero. Covered by the two CLI-mode tests below.
 *
 * Run: node --test scripts/efficiency.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { classifyArtifacts, readCorpus, aggregate, firstSeen, hasDegradedTimestamp } from './efficiency.mjs';

const MARKER = '2026-07-31T18:02:16.966Z';

/**
 * Absolute path to the CLI script under test, resolved from this test
 * file's own location rather than `process.cwd()` -- the AC-A3/AC-A4/AC-A6
 * tests below invoke it as a subprocess with `cwd` pointed at a synthetic
 * temp-directory corpus, so the script path itself must not depend on cwd.
 */
const SCRIPT_PATH = fileURLToPath(new URL('./efficiency.mjs', import.meta.url));

/** Build a synthetic artifact in the shape `readCorpus` produces. */
function artifact(file, entries) {
  return { stage: 'plan-review', file, entries };
}

/** Build a synthetic entry in the shape `readCorpus` produces. */
function entry({ timestamp = '', verdict = 'APPROVED', action = 'final_flip', fails = [], degraded = false } = {}) {
  return { timestamp, verdict, action, fails, degraded };
}

// ---------------------------------------------------------------------------
// AC-A2 — an artifact whose ONLY entry is degraded is excluded from BOTH the
// before and after sets. The degraded entry's timestamp deliberately
// predates the marker (it would otherwise land in `before`), so the test
// proves exclusion actually happens rather than the artifact merely landing
// in `before` by coincidence.
// ---------------------------------------------------------------------------

test('classifyArtifacts: an artifact whose only entry is degraded is excluded from both the before and after sets', () => {
  const degradedArtifact = artifact('solo-degraded.review.jsonl', [entry({ timestamp: '2026-07-31T00:00:00Z', degraded: true })]);

  const result = classifyArtifacts([degradedArtifact], MARKER);

  assert.deepEqual(result.before, []);
  assert.deepEqual(result.after, []);
  assert.deepEqual(result.undated, []);
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0].file, 'solo-degraded.review.jsonl');
});

// ---------------------------------------------------------------------------
// AC-A2 — the "ANY of whose entries" clause: an artifact with several
// entries, only ONE of which is degraded, must still be excluded from both
// sides. This is what proves the exclusion is `.some()`, not `.every()`.
// ---------------------------------------------------------------------------

test('classifyArtifacts: an artifact with several entries, only one of which is degraded, is still excluded from both sides', () => {
  const mixedArtifact = artifact('mixed.review.jsonl', [
    entry({ timestamp: '2026-07-25T09:00:00Z' }),
    entry({ timestamp: '2026-07-31T00:00:00Z', degraded: true }),
    entry({ timestamp: '2026-08-02T09:00:00Z' }),
  ]);

  const result = classifyArtifacts([mixedArtifact], MARKER);

  assert.deepEqual(result.before, []);
  assert.deepEqual(result.after, []);
  assert.equal(result.degraded.length, 1);
  assert.equal(result.degraded[0].file, 'mixed.review.jsonl');
});

// ---------------------------------------------------------------------------
// AC-A2 — no regression: an artifact with NO degraded entry classifies
// exactly as the pre-existing before/after/undated rule already did.
// ---------------------------------------------------------------------------

test('classifyArtifacts: an artifact with no degraded entry classifies exactly as before -- no regression in the existing before/after/undated rule', () => {
  const beforeArtifact = artifact('a.review.jsonl', [entry({ timestamp: '2026-07-30T10:00:00Z' })]);
  const afterArtifact = artifact('b.review.jsonl', [entry({ timestamp: '2026-08-01T10:00:00Z' })]);
  const undatedArtifact = artifact('c.review.jsonl', [entry({ timestamp: '' })]);

  const result = classifyArtifacts([beforeArtifact, afterArtifact, undatedArtifact], MARKER);

  assert.deepEqual(result.before.map((a) => a.file), ['a.review.jsonl']);
  assert.deepEqual(result.after.map((a) => a.file), ['b.review.jsonl']);
  assert.deepEqual(result.undated.map((a) => a.file), ['c.review.jsonl']);
  assert.deepEqual(result.degraded, []);
});

// ---------------------------------------------------------------------------
// AC-A2 — the degraded bucket is reported separately from the undated
// bucket: an entry with an empty timestamp and NO flag lands in `undated`,
// while an entry with an empty timestamp AND the flag lands in `degraded` —
// same missing-timestamp shape, different bucket, proving the two doubt
// signals are not conflated.
// ---------------------------------------------------------------------------

test('classifyArtifacts: the degraded bucket is reported separately from the undated bucket -- an empty timestamp with no flag lands in undated, not degraded', () => {
  const undatedArtifact = artifact('undated.review.jsonl', [entry({ timestamp: '' })]);
  const degradedArtifact = artifact('degraded-and-undated.review.jsonl', [entry({ timestamp: '', degraded: true })]);

  const result = classifyArtifacts([undatedArtifact, degradedArtifact], MARKER);

  assert.deepEqual(result.undated.map((a) => a.file), ['undated.review.jsonl']);
  assert.deepEqual(result.degraded.map((a) => a.file), ['degraded-and-undated.review.jsonl']);
  assert.deepEqual(result.before, []);
  assert.deepEqual(result.after, []);
});

// ---------------------------------------------------------------------------
// AC-A1 — THE DECOY CASE, load-bearing: a reason string containing the
// literal text "timestamp_degraded" with NO such JSON field must NOT be
// treated as degraded. Two tests: one against the real, named corpus
// fixture the plan cites, one synthetic and self-contained so the property
// stays pinned even if the real file is ever edited or removed.
// ---------------------------------------------------------------------------

test('readCorpus: DECOY (real corpus fixture) -- a reason string containing the literal text "timestamp_degraded" with no such JSON field is NOT treated as degraded', () => {
  const decoyFile = 'fix-degenerate-t000000-timestamps-in-relay-reviewer-jsonl.code-review.jsonl';
  const rawContent = readFileSync(join('PRPs/plans', decoyFile), 'utf-8');

  // Fixture preconditions, asserted rather than assumed: the raw file must
  // still carry the token in prose and must NOT carry it as a JSON field
  // key -- exactly the shape a substring-matching implementation would get
  // wrong and a field-parsing implementation gets right.
  assert.match(rawContent, /timestamp_degraded/, 'fixture precondition: the raw file must contain the literal token somewhere');
  assert.doesNotMatch(rawContent, /"timestamp_degraded"\s*:/, 'fixture precondition: the raw file must NOT carry the token as a JSON field key');

  const artifacts = readCorpus();
  const decoyArtifact = artifacts.find((a) => a.file === decoyFile);

  assert.ok(decoyArtifact, `expected the real corpus at PRPs/plans/ to contain ${decoyFile}`);
  assert.equal(hasDegradedTimestamp(decoyArtifact), false);
  assert.ok(decoyArtifact.entries.every((e) => e.degraded === false));
});

test('readCorpus: DECOY (synthetic, mutation-of-a-passing-baseline) -- appending a prose "reason" mentioning timestamp_degraded does not flip degraded classification', () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-test-'));

  try {
    process.chdir(tempDir);
    mkdirSync('PRPs/plans', { recursive: true });
    const fixturePath = join('PRPs', 'plans', 'synthetic.review.jsonl');

    const baselineObj = { timestamp: '2026-07-31T10:00:00Z', verdict: 'APPROVED', action: 'final_flip', rubric: [] };
    const baselineLine = JSON.stringify(baselineObj);
    writeFileSync(fixturePath, baselineLine + '\n');

    const baselineArtifacts = readCorpus();
    assert.equal(baselineArtifacts.length, 1);
    assert.equal(hasDegradedTimestamp(baselineArtifacts[0]), false, 'fixture precondition: the unmutated baseline must not be degraded');

    // Mutation: append a "reason" property mentioning the literal token in
    // prose, without ever setting a real timestamp_degraded field.
    const mutatedObj = { ...baselineObj, reason: 'this reviewer never fabricates a stamp and never sets timestamp_degraded itself' };
    const mutatedLine = JSON.stringify(mutatedObj);
    assert.notEqual(mutatedLine, baselineLine, 'fixture precondition: the mutation must actually change the line');
    assert.ok(!('timestamp_degraded' in mutatedObj), 'fixture precondition: the mutation must not introduce a real timestamp_degraded field');
    writeFileSync(fixturePath, mutatedLine + '\n');

    const mutatedArtifacts = readCorpus();
    assert.equal(mutatedArtifacts.length, 1);
    assert.equal(hasDegradedTimestamp(mutatedArtifacts[0]), false, 'a prose mention of timestamp_degraded must not be treated as the flag');
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-A5 — the module imports with no side effects: importing it must never
// dispatch the CLI or call process.exit. A real subprocess import is the
// only way to prove this from outside -- if the import.meta.url guard were
// absent, the subprocess would call process.exit(2) on a bare import and
// execFileSync would throw on the non-zero exit, failing this test loudly.
// ---------------------------------------------------------------------------

test('scripts/efficiency.mjs: importing the module has no side effects (no CLI dispatch, no process.exit) and exports the pure classifier surface', () => {
  const out = execFileSync(
    process.execPath,
    ['--input-type=module', '-e', "import * as m from './scripts/efficiency.mjs'; console.log(JSON.stringify(Object.keys(m).sort()));"],
    { encoding: 'utf-8' },
  );

  const exportedNames = JSON.parse(out.trim());
  for (const name of ['classifyArtifacts', 'readCorpus', 'aggregate', 'firstSeen', 'hasDegradedTimestamp']) {
    assert.ok(exportedNames.includes(name), `expected module to export ${name}`);
  }
});

test('scripts/efficiency.mjs: the top-level import in this test file itself resolved to real functions, not undefined stand-ins', () => {
  for (const [name, fn] of Object.entries({ classifyArtifacts, readCorpus, aggregate, firstSeen, hasDegradedTimestamp })) {
    assert.equal(typeof fn, 'function', `expected ${name} to be exported as a function`);
  }
});

// ---------------------------------------------------------------------------
// AC-A3 / AC-A4 — CLI-level, synthetic-corpus tests. A fresh temp directory
// is built per test (via mkdtempSync) and the real CLI is driven with
// execFileSync against it: both PLANS_DIR ('PRPs/plans') and SNAP_DIR
// ('PRPs/reports/efficiency') are relative paths inside scripts/efficiency.mjs,
// resolved against the child process's cwd, so pointing `cwd` at the temp
// directory gives full control over the fixture without touching the real
// corpus. Neither test reads or mutates the real PRPs/plans/ corpus.
// ---------------------------------------------------------------------------

/**
 * Build a synthetic corpus in a fresh temp directory and run `compare`
 * against it: one baseline artifact predating a `snapshot`, then a genuine
 * post-marker artifact, a post-marker DEGRADED artifact (which, absent the
 * exclusion rule, would land in the after-set -- its own timestamp is later
 * even than the plain after-artifact's), and an undated artifact are added
 * after the snapshot is taken. Returns the temp dir (caller must rmSync it)
 * and the `compare` command's stdout.
 */
function buildDegradedExclusionFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-cli-test-'));
  const plansDir = join(tempDir, 'PRPs', 'plans');
  mkdirSync(plansDir, { recursive: true });

  const jsonlLine = (obj) => JSON.stringify(obj) + '\n';

  const baselineEntry = { timestamp: '2020-01-01T00:00:00.000Z', verdict: 'APPROVED', action: 'final_flip', rubric: [] };
  writeFileSync(join(plansDir, 'baseline.review.jsonl'), jsonlLine(baselineEntry));

  execFileSync(process.execPath, [SCRIPT_PATH, 'snapshot', '--label', 'baseline'], { cwd: tempDir, encoding: 'utf-8' });

  const markerRaw = readFileSync(join(tempDir, 'PRPs', 'reports', 'efficiency', 'baseline.json'), 'utf-8');
  const markerMs = new Date(JSON.parse(markerRaw).markerUtc).getTime();

  const afterEntry = {
    timestamp: new Date(markerMs + 3600_000).toISOString(),
    verdict: 'APPROVED',
    action: 'final_flip',
    rubric: [],
  };
  writeFileSync(join(plansDir, 'after.review.jsonl'), jsonlLine(afterEntry));

  const degradedEntry = {
    timestamp: new Date(markerMs + 7200_000).toISOString(),
    verdict: 'CHANGES_REQUESTED',
    action: 'final_flip',
    rubric: [],
    timestamp_degraded: true,
  };
  writeFileSync(join(plansDir, 'degraded.review.jsonl'), jsonlLine(degradedEntry));

  const undatedEntry = { verdict: 'APPROVED', action: 'final_flip', rubric: [] };
  writeFileSync(join(plansDir, 'undated.review.jsonl'), jsonlLine(undatedEntry));

  const stdout = execFileSync(process.execPath, [SCRIPT_PATH, 'compare', '--since', 'baseline'], {
    cwd: tempDir,
    encoding: 'utf-8',
  });

  return { tempDir, stdout };
}

test('CLI: compare prints a WARNING - line, distinct from the undated warning, naming the count and each excluded degraded artifact file', () => {
  const { tempDir, stdout } = buildDegradedExclusionFixture();
  try {
    assert.match(
      stdout,
      /WARNING - 1 artifact\(s\) carry a producer-flagged unreliable timestamp\s*\n\s*\(timestamp_degraded\) and are excluded from both sides:/,
    );
    assert.match(stdout, /degraded\.review\.jsonl/);

    // Distinct from the undated warning: both appear, with different prose,
    // and the undated warning's own line must not name the degraded file.
    assert.match(stdout, /WARNING - 1 artifact\(s\) have no usable timestamp and are excluded from both sides\./);
    const undatedLine = stdout.split('\n').find((l) => l.includes('have no usable timestamp'));
    assert.ok(undatedLine, 'expected a distinct undated-warning line');
    assert.ok(!undatedLine.includes('degraded.review.jsonl'), 'the undated warning must not itself name the degraded artifact');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI: compare excludes a degraded artifact from both the before and after aggregates (synthetic corpus, not a hardcoded live-corpus count)', () => {
  const { tempDir, stdout } = buildDegradedExclusionFixture();
  try {
    // Only after.review.jsonl (undegraded) is counted in the after-set for
    // plan-review; the degraded artifact is genuinely post-marker (its
    // timestamp is 1 hour later than after.review.jsonl's) but must be
    // absent from this count.
    assert.match(stdout, /artifacts\s+1 before -> 1 after/);
    // No drift warning: the recomputed before-set (1, from baseline.jsonl
    // alone) matches what the snapshot originally recorded (1) exactly --
    // proving the degraded artifact never leaked into the before aggregate
    // either, even though a naive time-only split (its timestamp is later
    // than the marker) would not by itself explain that.
    assert.doesNotMatch(stdout, /snapshot recorded/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-A6 — both CLI modes still behave as before.
// ---------------------------------------------------------------------------

test('CLI: `snapshot --label X` writes a marker file to PRPs/reports/efficiency/<label>.json', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-cli-snapshot-test-'));
  try {
    const label = 'cli-probe';
    const out = execFileSync(process.execPath, [SCRIPT_PATH, 'snapshot', '--label', label], { cwd: tempDir, encoding: 'utf-8' });

    const markerPath = join(tempDir, 'PRPs', 'reports', 'efficiency', `${label}.json`);
    assert.ok(existsSync(markerPath), 'expected snapshot to write a marker file at PRPs/reports/efficiency/<label>.json');

    const marker = JSON.parse(readFileSync(markerPath, 'utf-8'));
    assert.equal(marker.label, label);
    assert.match(marker.markerUtc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    assert.match(out, /Baseline recorded:/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI: a bare invocation with no mode prints Usage: for both CLI modes and exits non-zero', () => {
  let caught = null;
  try {
    execFileSync(process.execPath, [SCRIPT_PATH], { encoding: 'utf-8' });
  } catch (err) {
    caught = err;
  }
  assert.ok(caught, 'expected the bare invocation to throw (non-zero exit)');
  assert.notEqual(caught.status, 0);
  assert.match(caught.stderr, /Usage:/);
  assert.match(caught.stderr, /node scripts\/efficiency\.mjs snapshot --label/);
  assert.match(caught.stderr, /node scripts\/efficiency\.mjs compare/);
});
