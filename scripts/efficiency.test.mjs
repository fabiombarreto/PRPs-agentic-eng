// @ts-check
/**
 * Unit tests for the pure classification surface exported by
 * scripts/efficiency.mjs: `classifyArtifacts`, `readCorpus`, `aggregate`,
 * `firstSeen`, `hasDegradedTimestamp` and `sessionsOf`.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, APPROVED scripts/efficiency.mjs.
 *
 * Authored by the test pair under R-X strict (docs/decisions.md
 * [2026-07-12] / [2026-05-06]): the Implementer never touches this file.
 *
 * TWO source plans contribute to this file, both description-mode (no
 * source PRD) and both numbering their criteria `AC-A<i>`. The two AC
 * namespaces are therefore DISJOINT and must not be read as one list —
 * each section below names the plan its criteria belong to.
 *
 *   PLAN 1 — degraded-timestamp consumer:
 *     PRPs/plans/close-the-consumer-half-of-the-v0250-reviewstartedat.plan.md
 *   PLAN 2 — review-session split:
 *     PRPs/plans/fix-a-measurement-defect-in-scriptsefficiencymjs-that.plan.md
 *
 * Scope: covers the unit-testable pure functions via direct calls against
 * the imported module, and — via `execFileSync` subprocess invocations of
 * the real CLI against a synthetic corpus built in a fresh `mkdtempSync`
 * temp directory (never the real `PRPs/plans/` corpus) — the observable
 * CLI-level contracts. The synthetic corpus is deliberate: it pins
 * BEHAVIOUR (a degraded artifact is excluded from both aggregates; a
 * multi-session file is split and named) rather than a corpus-dependent
 * count (e.g. the live corpus's "recomputed 82") that would rot as the
 * real corpus grows.
 *
 * Traceability — PLAN 1 (degraded-timestamp consumer):
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
 * Traceability — PLAN 2 (review-session split):
 *   AC-A1 — a pure exported function partitions an artifact's entries into
 *     review sessions: a session closes on a passing verdict, the next
 *     entry opens the following session, and a trailing group with no
 *     passing verdict is itself a session. Covered by the three
 *     `sessionsOf` partition-shape tests, plus the export-surface tests.
 *   AC-A2 — the boundary is the `PASSING` set, not a literal 'APPROVED'
 *     comparison, so `RUBRIC_PASSED` closes a session too. Covered by the
 *     `sessionsOf` RUBRIC_PASSED test and its never-passed control.
 *   AC-A3 — the rework metric is reported per session and labelled as such,
 *     with a notice naming how many artifacts split and into how many
 *     sessions, while every prior warning survives. Covered by the two
 *     session-split CLI tests and the `aggregate` per-session test.
 *   AC-A4 — first-attempt failure is computed from the first entry of each
 *     SESSION, not of each file. Covered by the `aggregate` per-session
 *     test (per file the same fixture reports 0%) and the amendment test.
 *   AC-A5 — the degraded-timestamp policy is unchanged: exclusion still
 *     operates on the WHOLE artifact, never per session. Covered by the
 *     multi-session degraded-exclusion test.
 *   AC-A6..AC-A9 — documentation and governance prose
 *     (documentation/reference/validation-checks.html,
 *     documentation/changelog.html, docs/context/constraints.md,
 *     docs/decisions.md). Not node:test scope; see the manifest's AC
 *     outcomes table.
 *   AC-A10 — this suite itself, with fixtures proven to fail when the
 *     partition is broken; see the manifest's mutation-verification table.
 *
 * ===========================================================================
 * PHASE 4 (plan-review-materiality PRD, PRD mode -- dual `AC-A<i> (PRD
 * AC-N)` labelling, unlike PLAN 1/PLAN 2's disjoint description-mode AC-A<i>
 * namespaces above):
 *   PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md
 *   Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Extends this same SUT module (readCorpus, aggregate, doCompare's CLI
 * print path) with the class dimension: readCorpus captures each failing
 * rubric row's class (absent => blocking, the Phase-1 compatibility rule);
 * aggregate emits blockingFailRows/advisoryFailRows/topFailuresByClass per
 * stage; doCompare gains one conditional print line, emitted only when a
 * stage's after-set carries >=1 advisory-classed row. Every addition is
 * strictly additive -- fails, topFailures, firstAttemptFailureRate, and
 * every other pre-existing key/behavior are unchanged (pinned by the
 * regression assertions folded into the new tests below).
 *
 * Existing-coverage scan performed before authoring (Step 2.1 -- an
 * Explore-agent sweep of all 53 scripts/validate/checks/*.test.mjs files
 * plus this file itself for "failClasses", "topFailuresByClass",
 * "blockingFailRows", "advisoryFailRows", and "blocking/advisory"): zero
 * matches anywhere. NEW_TEST_REQUIRED throughout; this file is EXTENDED
 * (recorded as EXISTING_TEST_UPDATED at the file-operation level -- an Edit
 * against an already-approved file, not a fresh Write) rather than forked
 * into a sibling file, because this IS the SUT module's own dedicated test
 * file and its established convention (see PLAN 1 / PLAN 2 above) is to
 * accrete one traceability section per contributing plan in this same
 * file. Zero pre-existing test's assertions are modified, narrowed, or
 * removed by this addition -- see the suite manifest's Lifecycle ledger for
 * the non-weakening justification.
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A1 (PRD AC-8) -- "top-failure tallies are reported per class
 *     (blocking vs advisory)... rows without a class field count as
 *     blocking... firstAttemptFailureRate plus every pre-existing key keep
 *     their current semantics." Covered by the readCorpus row-mapping test,
 *     the aggregate real-corpus round-trip test, and the
 *     topFailuresByClass sort/slice-to-8 test below.
 *   AC-A3 (PRD AC-8) (print-path half only -- the command-file
 *     sampling-step half is covered separately by
 *     efficiency-report-materiality-sampling.test.mjs) -- "the after-side
 *     per-class split... appears whenever any advisory-classed row
 *     exists... and is omitted byte-identically to today when none do."
 *     Covered by the two CLI compare tests below.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (see
 * PRPs/reports/plan-review-materiality/phase-4/attempts/1/diff.patch).
 * ===========================================================================
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

import { classifyArtifacts, readCorpus, aggregate, firstSeen, hasDegradedTimestamp, sessionsOf } from './efficiency.mjs';

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
  for (const name of ['classifyArtifacts', 'readCorpus', 'aggregate', 'firstSeen', 'hasDegradedTimestamp', 'sessionsOf']) {
    assert.ok(exportedNames.includes(name), `expected module to export ${name}`);
  }
});

test('scripts/efficiency.mjs: the top-level import in this test file itself resolved to real functions, not undefined stand-ins', () => {
  for (const [name, fn] of Object.entries({ classifyArtifacts, readCorpus, aggregate, firstSeen, hasDegradedTimestamp, sessionsOf })) {
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

// ===========================================================================
// PLAN 2 — review-session split
//   PRPs/plans/fix-a-measurement-defect-in-scriptsefficiencymjs-that.plan.md
//
// A jsonl file is not a review session. Inside one retry loop only the LAST
// verdict can be a passing one, because a passing verdict terminates the
// loop -- so a file holding two passing verdicts necessarily holds two
// independent sessions. Everything below pins that partition and the two
// metrics derived from it, and pins that the split changed GROUPING only:
// degraded exclusion still operates on the whole artifact.
//
// The AC-A<i> ids in this section belong to PLAN 2 and are unrelated to the
// identically-numbered ids in the PLAN 1 sections above.
// ===========================================================================

/** Build a synthetic artifact from a bare verdict sequence, in file order. */
function verdictSeq(file, verdicts) {
  return artifact(
    file,
    verdicts.map((verdict, i) => entry({ verdict, timestamp: `2026-08-05T0${i}:00:00Z` })),
  );
}

/** Reduce a session partition to its verdict shape, so assertions read as the partition itself. */
const shapeOf = (sessions) => sessions.map((s) => s.map((e) => e.verdict));

// ---------------------------------------------------------------------------
// PLAN 2 AC-A1 — the three partition shapes. Each asserts the CONTENTS of
// every session, not merely the count: a partition that lands the right
// number of sessions while assigning the wrong entries to them still fails.
// ---------------------------------------------------------------------------

test('sessionsOf: a single retry loop is ONE session -- the rejections and the passing verdict that ends them belong together', () => {
  const oneLoop = verdictSeq('single-loop.review.jsonl', ['CHANGES_REQUESTED', 'CHANGES_REQUESTED', 'APPROVED']);

  assert.deepEqual(shapeOf(sessionsOf(oneLoop)), [['CHANGES_REQUESTED', 'CHANGES_REQUESTED', 'APPROVED']]);
});

test('sessionsOf: two passing verdicts followed by a retry loop are THREE sessions, split at each passing verdict', () => {
  const threeSessions = verdictSeq('three.review.jsonl', ['APPROVED', 'APPROVED', 'CHANGES_REQUESTED', 'APPROVED']);

  // Each passing verdict CLOSES its session and the entry after it OPENS the
  // next, so the two consecutive APPROVEDs are two one-entry sessions rather
  // than one two-entry session -- the shape that made 2.38 runs per file read
  // as rework when it was three unrelated reviews.
  assert.deepEqual(shapeOf(sessionsOf(threeSessions)), [['APPROVED'], ['APPROVED'], ['CHANGES_REQUESTED', 'APPROVED']]);
});

test('sessionsOf: a trailing group with no passing verdict is itself a session, never dropped', () => {
  const unresolvedTail = verdictSeq('trailing.review.jsonl', ['APPROVED', 'CHANGES_REQUESTED']);

  // An in-flight review that has not been approved yet is still a session; a
  // partition that only emitted a session on a passing verdict would silently
  // discard the second entry and undercount both runs and first attempts.
  assert.deepEqual(shapeOf(sessionsOf(unresolvedTail)), [['APPROVED'], ['CHANGES_REQUESTED']]);
});

// ---------------------------------------------------------------------------
// PLAN 2 AC-A2 — the boundary is the PASSING set, not a literal 'APPROVED'.
// This is the load-bearing test of the pair: replacing `PASSING.has(entry
// .verdict)` with `entry.verdict === 'APPROVED'` collapses the first fixture
// below from two sessions to one, because `prd-reviewer` in subagent mode
// emits RUBRIC_PASSED rather than APPROVED and that verdict also terminates
// a retry loop.
// ---------------------------------------------------------------------------

test('sessionsOf: RUBRIC_PASSED closes a session, because the boundary is the PASSING set and not a literal APPROVED comparison', () => {
  const rubricPassed = verdictSeq('rubric-passed.review.jsonl', ['RUBRIC_PASSED', 'CHANGES_REQUESTED']);

  assert.deepEqual(shapeOf(sessionsOf(rubricPassed)), [['RUBRIC_PASSED'], ['CHANGES_REQUESTED']]);

  // Discriminative control, same two-entry shape with a NON-passing verdict
  // in the first slot: it must NOT split. Without this pair an implementation
  // that started a new session after every entry would satisfy the assertion
  // above by accident.
  const neverPassed = verdictSeq('never-passed.review.jsonl', ['CHANGES_REQUESTED', 'CHANGES_REQUESTED']);

  assert.deepEqual(shapeOf(sessionsOf(neverPassed)), [['CHANGES_REQUESTED', 'CHANGES_REQUESTED']]);
});

// ---------------------------------------------------------------------------
// PLAN 2 AC-A3 / AC-A4 — the two metrics derived from the partition, at the
// pure-function level. The fixture is chosen so per-file and per-session
// disagree on BOTH metrics, which is what makes the assertions discriminative
// rather than merely descriptive.
// ---------------------------------------------------------------------------

test('aggregate: rework and first-attempt failure are counted per session, and a file holding two sessions is reported as split', () => {
  const multiSession = verdictSeq('multi.review.jsonl', ['APPROVED', 'CHANGES_REQUESTED', 'APPROVED']);

  const metrics = aggregate([multiSession])['plan-review'];

  assert.equal(metrics.artifacts, 1);
  assert.equal(metrics.sessions, 2);
  assert.equal(metrics.splitArtifacts, 1);
  assert.equal(metrics.runs, 3);
  // 3 runs over 2 sessions. Divided by FILES the same fixture reads as 3.0 --
  // exactly the overstatement this metric exists to remove.
  assert.equal(metrics.runsPerSession, 1.5);
  // Session 1 opens on APPROVED (a clean first attempt); session 2 opens on
  // CHANGES_REQUESTED (a failed one). Per FILE only the file's first entry --
  // APPROVED -- would be examined, reporting 0 failures and 0%.
  assert.equal(metrics.firstAttemptFailures, 1);
  assert.equal(metrics.firstAttemptFailureRate, 50);
});

test('aggregate: a human_authorized_ac_amendment entry is still excluded from the first-attempt count, now scoped per session', () => {
  const amended = artifact('amended.review.jsonl', [
    entry({ verdict: 'APPROVED', action: 'final_flip', timestamp: '2026-08-05T01:00:00Z' }),
    entry({ verdict: 'CHANGES_REQUESTED', action: 'human_authorized_ac_amendment', timestamp: '2026-08-05T02:00:00Z' }),
    entry({ verdict: 'APPROVED', action: 'final_flip', timestamp: '2026-08-05T03:00:00Z' }),
  ]);

  const metrics = aggregate([amended])['plan-review'];

  assert.equal(metrics.sessions, 2);
  // Session 2 opens with an amendment -- an audit record, not a rubric run --
  // so its first ATTEMPT is the APPROVED that follows. Were the amendment
  // filter dropped when the metric moved per session, that CHANGES_REQUESTED
  // would be read as a failed first attempt and this would report 1 / 50%.
  assert.equal(metrics.firstAttemptFailures, 0);
  assert.equal(metrics.firstAttemptFailureRate, 0);

  // A session consisting of NOTHING but amendments contributes no first-attempt
  // observation at all, rather than crashing on an empty filtered session.
  const trailingAmendmentOnly = artifact('amendment-tail.review.jsonl', [
    entry({ verdict: 'APPROVED', action: 'final_flip', timestamp: '2026-08-05T01:00:00Z' }),
    entry({ verdict: 'CHANGES_REQUESTED', action: 'human_authorized_ac_amendment', timestamp: '2026-08-05T02:00:00Z' }),
  ]);

  const tailMetrics = aggregate([trailingAmendmentOnly])['plan-review'];

  assert.equal(tailMetrics.sessions, 2);
  assert.equal(tailMetrics.firstAttemptFailures, 0);
  assert.equal(tailMetrics.firstAttemptFailureRate, 0);
});

// ---------------------------------------------------------------------------
// PLAN 2 AC-A5 — the split changed GROUPING, never PARTICIPATION. A degraded
// artifact is excluded whole even when it holds several sessions, one of
// which is entirely clean. This is the property `timestamp-contract`'s
// CONSUMERS registry pins, and the one a per-session exclusion rule would
// have quietly broken.
// ---------------------------------------------------------------------------

test('classifyArtifacts: a multi-session artifact carrying one degraded entry is excluded WHOLE -- no clean session leaks into before or after', () => {
  const multiSessionDegraded = artifact('multi-degraded.review.jsonl', [
    // Session 1 is clean and pre-marker: absent the exclusion it would land in `before`.
    entry({ timestamp: '2026-07-25T09:00:00Z', verdict: 'APPROVED' }),
    // Session 2 opens on the degraded entry.
    entry({ timestamp: '2026-08-02T09:00:00Z', verdict: 'CHANGES_REQUESTED', degraded: true }),
    entry({ timestamp: '2026-08-03T09:00:00Z', verdict: 'APPROVED' }),
  ]);

  // Fixture preconditions, asserted rather than assumed: the artifact really
  // does hold two sessions (so a per-session rule would have had a clean one
  // to leak) and really is degraded at the artifact level.
  assert.equal(sessionsOf(multiSessionDegraded).length, 2);
  assert.equal(hasDegradedTimestamp(multiSessionDegraded), true);

  const result = classifyArtifacts([multiSessionDegraded], MARKER);

  assert.deepEqual(result.before, []);
  assert.deepEqual(result.after, []);
  assert.deepEqual(result.undated, []);
  assert.deepEqual(result.degraded.map((a) => a.file), ['multi-degraded.review.jsonl']);
});

// ---------------------------------------------------------------------------
// PLAN 2 AC-A3 — CLI level. Same synthetic-corpus technique as the PLAN 1 CLI
// tests: a fresh temp directory is built per test and the real CLI is driven
// against it with execFileSync, so nothing here reads or mutates the real
// PRPs/plans/ corpus and no assertion hardcodes a live-corpus count.
// ---------------------------------------------------------------------------

/**
 * Build a synthetic corpus whose after-set contains one MULTI-SESSION
 * artifact, plus a degraded artifact so the new split notice and the
 * pre-existing degraded warning are observed coexisting in one run.
 *
 * Deliberately distinct from `buildDegradedExclusionFixture`: that fixture's
 * tests assert `1 before -> 1 after` and the absence of a drift warning, and
 * adding a multi-session artifact to it would perturb those assertions.
 */
function buildSessionSplitFixture() {
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-session-cli-test-'));
  const plansDir = join(tempDir, 'PRPs', 'plans');
  mkdirSync(plansDir, { recursive: true });

  const jsonl = (objs) => objs.map((o) => JSON.stringify(o)).join('\n') + '\n';

  writeFileSync(
    join(plansDir, 'baseline.review.jsonl'),
    jsonl([{ timestamp: '2020-01-01T00:00:00.000Z', verdict: 'APPROVED', action: 'final_flip', rubric: [] }]),
  );

  execFileSync(process.execPath, [SCRIPT_PATH, 'snapshot', '--label', 'baseline'], { cwd: tempDir, encoding: 'utf-8' });

  const markerRaw = readFileSync(join(tempDir, 'PRPs', 'reports', 'efficiency', 'baseline.json'), 'utf-8');
  const markerMs = new Date(JSON.parse(markerRaw).markerUtc).getTime();
  const at = (offsetMs) => new Date(markerMs + offsetMs).toISOString();

  // Two independent sessions in ONE file. Per file: 3 runs over 1 artifact
  // with a passing first entry -> 3.0 runs and 0% first-attempt failure. Per
  // session: 3 runs over 2 sessions -> 1.5 runs and 50%.
  writeFileSync(
    join(plansDir, 'multi.review.jsonl'),
    jsonl([
      { timestamp: at(3600_000), verdict: 'APPROVED', action: 'final_flip', rubric: [] },
      { timestamp: at(7200_000), verdict: 'CHANGES_REQUESTED', action: 'final_flip', rubric: [] },
      { timestamp: at(10800_000), verdict: 'APPROVED', action: 'final_flip', rubric: [] },
    ]),
  );

  writeFileSync(
    join(plansDir, 'degraded.review.jsonl'),
    jsonl([
      { timestamp: at(14400_000), verdict: 'CHANGES_REQUESTED', action: 'final_flip', rubric: [], timestamp_degraded: true },
    ]),
  );

  const stdout = execFileSync(process.execPath, [SCRIPT_PATH, 'compare', '--since', 'baseline'], {
    cwd: tempDir,
    encoding: 'utf-8',
  });

  return { tempDir, stdout };
}

test('CLI: compare labels the rework metric per session and reports the per-session first-attempt rate, not the per-file one', () => {
  const { tempDir, stdout } = buildSessionSplitFixture();
  try {
    // Per file this same after-set reads as `3` runs and `0%`; the values
    // asserted here are reachable only if the entries were partitioned.
    assert.match(stdout, /runs per session\s+1 -> 1\.5 \(\+0\.5\)/);
    assert.match(stdout, /first-attempt fail\s+0% -> 50% \(\+50\)/);
    // The superseded label must be gone, so no reader mistakes the new figure
    // for the old one. (The notice's own "not per artifact" phrasing is a
    // different string and is asserted in the next test.)
    assert.doesNotMatch(stdout, /runs per artifact/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI: compare prints a NOTICE naming how many artifacts split, the resulting session total, and each split file, alongside every prior warning', () => {
  const { tempDir, stdout } = buildSessionSplitFixture();
  try {
    assert.match(stdout, /NOTICE - 1 artifact\(s\) hold more than one review session/);
    assert.match(stdout, /3 artifacts in the corpus split into 4 sessions/);

    // The notice enumerates the affected file, mirroring the degraded block --
    // the correction is auditable, not just counted.
    const notice = stdout.slice(stdout.indexOf('NOTICE - 1 artifact(s)'));
    assert.ok(notice.includes('multi.review.jsonl'), 'expected the split notice to name the multi-session file');
    assert.ok(!notice.includes('baseline.review.jsonl'), 'the split notice must not name a single-session file');

    // Every pre-existing doubt signal survives the new block.
    assert.match(stdout, /WARNING - 1 artifact\(s\) carry a producer-flagged unreliable timestamp/);
    assert.match(stdout, /CAUTION: 1 artifact\(s\) is a small sample/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ===========================================================================
// PHASE 4 -- plan-review-materiality Phase 4 (measurement + surfaces)
//   PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md
//   Source PRD: PRPs/prds/plan-review-materiality.prd.md
//
// AC-A1 (PRD AC-8) -- class-aware measurement (readCorpus/aggregate).
// AC-A3 (PRD AC-8) -- print-path half only (doCompare's conditional line);
// the command-file sampling-step half of AC-A3 is covered separately by
// efficiency-report-materiality-sampling.test.mjs. See the file header's
// PHASE 4 block above for the full traceability note.
// ===========================================================================

test('AC-A1 (PRD AC-8): readCorpus maps each failing rubric row into failClasses -- an explicit "advisory" class is preserved, while an absent class field or any other value collapses to "blocking" (the Phase-1 compatibility rule) -- and the pre-existing fails id-list stays byte-identical', () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-test-phase4-'));
  try {
    process.chdir(tempDir);
    mkdirSync('PRPs/plans', { recursive: true });
    const entryObj = {
      timestamp: '2026-08-07T10:00:00Z',
      verdict: 'CHANGES_REQUESTED',
      action: 'final_flip',
      rubric: [
        { id: 'R-ADV', passed: false, class: 'advisory' },
        { id: 'R-BLOCK', passed: false, class: 'blocking' },
        { id: 'R-LEGACY', passed: false }, // no class field at all -- pre-materiality shape
        { id: 'R-WEIRD', passed: false, class: 'urgent' }, // a non-canonical value must still collapse to blocking
        { id: 'R-PASS', passed: true, class: 'advisory' }, // passing rows are never in fails or failClasses
      ],
    };
    writeFileSync(join('PRPs', 'plans', 'phase4-rowmap.review.jsonl'), JSON.stringify(entryObj) + '\n');

    const artifacts = readCorpus();
    assert.equal(artifacts.length, 1);
    const [entry0] = artifacts[0].entries;

    assert.deepEqual(entry0.fails, ['R-ADV', 'R-BLOCK', 'R-LEGACY', 'R-WEIRD'], 'expected the pre-existing fails id-list unchanged by the failClasses addition');
    assert.deepEqual(entry0.failClasses, [
      { id: 'R-ADV', class: 'advisory' },
      { id: 'R-BLOCK', class: 'blocking' },
      { id: 'R-LEGACY', class: 'blocking' },
      { id: 'R-WEIRD', class: 'blocking' },
    ]);
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('AC-A1 (PRD AC-8): aggregate tallies blockingFailRows/advisoryFailRows/topFailuresByClass from the real corpus, a historic row with no class field counts as blocking, and every pre-existing key (fails via topFailures, firstAttemptFailureRate) computes unchanged on the same fixture', () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-test-phase4-agg-'));
  try {
    process.chdir(tempDir);
    mkdirSync('PRPs/plans', { recursive: true });

    // legacy.review.jsonl: pre-materiality shape -- two failing rows, neither
    // carries a class field at all.
    const legacy = {
      timestamp: '2026-08-01T00:00:00Z',
      verdict: 'CHANGES_REQUESTED',
      action: 'final_flip',
      rubric: [
        { id: 'R-OLD-1', passed: false },
        { id: 'R-OLD-2', passed: false },
      ],
    };
    writeFileSync(join('PRPs', 'plans', 'phase4-legacy.review.jsonl'), JSON.stringify(legacy) + '\n');

    // fresh.review.jsonl: one advisory row, plus a repeat of R-OLD-1 this
    // time explicitly classed blocking.
    const fresh = {
      timestamp: '2026-08-07T00:00:00Z',
      verdict: 'CHANGES_REQUESTED',
      action: 'final_flip',
      rubric: [
        { id: 'R-ADV', passed: false, class: 'advisory' },
        { id: 'R-OLD-1', passed: false, class: 'blocking' },
      ],
    };
    writeFileSync(join('PRPs', 'plans', 'phase4-fresh.review.jsonl'), JSON.stringify(fresh) + '\n');

    const metrics = aggregate(readCorpus())['plan-review'];

    // New per-class tallies, with the class-absent legacy rows counted blocking.
    assert.equal(metrics.blockingFailRows, 3, 'R-OLD-1 (legacy, no class) + R-OLD-2 (legacy, no class) + R-OLD-1 (fresh, explicit blocking)');
    assert.equal(metrics.advisoryFailRows, 1, 'R-ADV only');
    assert.equal(metrics.topFailuresByClass.advisory.length, 1);
    assert.deepEqual(metrics.topFailuresByClass.advisory[0], { id: 'R-ADV', n: 1 });
    const blockingR1 = metrics.topFailuresByClass.blocking.find((f) => f.id === 'R-OLD-1');
    const blockingR2 = metrics.topFailuresByClass.blocking.find((f) => f.id === 'R-OLD-2');
    assert.ok(blockingR1 && blockingR1.n === 2, 'expected R-OLD-1 tallied twice across the two files');
    assert.ok(blockingR2 && blockingR2.n === 1);

    // Regression net: the pre-existing fails/topFailures tally is UNCHANGED --
    // it counts every failing row regardless of class, exactly as before this
    // phase.
    const topR1 = metrics.topFailures.find((f) => f.id === 'R-OLD-1');
    assert.ok(topR1 && topR1.n === 2, 'expected topFailures (pre-existing, class-blind) to still count R-OLD-1 twice');
    assert.ok(metrics.topFailures.some((f) => f.id === 'R-ADV' && f.n === 1), 'expected topFailures to still include the advisory-classed id -- it is class-blind by design');

    // Regression net: firstAttemptFailureRate is unaffected by the class
    // dimension -- both single-entry sessions opened on CHANGES_REQUESTED, an
    // advisory-carrying entry is not exempted from this verdict-based metric.
    assert.equal(metrics.sessions, 2);
    assert.equal(metrics.firstAttemptFailureRate, 100);
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('AC-A1 (PRD AC-8): topFailuresByClass.advisory is sorted descending by count and sliced to 8, mirroring topFailures\' own shape', () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-test-phase4-top8-'));
  try {
    process.chdir(tempDir);
    mkdirSync('PRPs/plans', { recursive: true });

    // 10 distinct advisory-classed ids, each repeated a DIFFERENT number of
    // times (10 down to 1, all distinct -- no ties), so the expected top-8
    // descending order is unambiguous.
    for (let i = 1; i <= 10; i++) {
      const reps = 11 - i;
      const lines = Array.from({ length: reps }, () =>
        JSON.stringify({ timestamp: '2026-08-07T00:00:00Z', verdict: 'CHANGES_REQUESTED', action: 'final_flip', rubric: [{ id: `R-ADV-${i}`, passed: false, class: 'advisory' }] }),
      ).join('\n');
      writeFileSync(join('PRPs', 'plans', `phase4-top8-${i}.review.jsonl`), lines + '\n');
    }

    const metrics = aggregate(readCorpus())['plan-review'];

    assert.equal(metrics.topFailuresByClass.advisory.length, 8, 'expected the advisory top-list capped at 8 even though 10 distinct ids exist');
    const counts = metrics.topFailuresByClass.advisory.map((f) => f.n);
    const sortedDesc = [...counts].sort((a, b) => b - a);
    assert.deepEqual(counts, sortedDesc, 'expected descending sort order');
    assert.deepEqual(metrics.topFailuresByClass.advisory[0], { id: 'R-ADV-1', n: 10 }, 'expected the highest-count id first');
    assert.ok(
      !metrics.topFailuresByClass.advisory.some((f) => f.id === 'R-ADV-9' || f.id === 'R-ADV-10'),
      'expected the two lowest-count ids (counts 2 and 1) to be excluded by the top-8 cap',
    );
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI: compare prints a "blocking/advisory" line with the after-side blocking/advisory row counts and the top advisory ids (by count) when the after-set carries at least one advisory-classed failing row', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-cli-phase4-adv-'));
  const plansDir = join(tempDir, 'PRPs', 'plans');
  mkdirSync(plansDir, { recursive: true });
  try {
    const jsonlLine = (obj) => JSON.stringify(obj) + '\n';
    const baselineEntry = { timestamp: '2020-01-01T00:00:00.000Z', verdict: 'APPROVED', action: 'final_flip', rubric: [] };
    writeFileSync(join(plansDir, 'baseline.review.jsonl'), jsonlLine(baselineEntry));

    execFileSync(process.execPath, [SCRIPT_PATH, 'snapshot', '--label', 'baseline'], { cwd: tempDir, encoding: 'utf-8' });
    const markerRaw = readFileSync(join(tempDir, 'PRPs', 'reports', 'efficiency', 'baseline.json'), 'utf-8');
    const markerMs = new Date(JSON.parse(markerRaw).markerUtc).getTime();
    const at = (offsetMs) => new Date(markerMs + offsetMs).toISOString();

    // ADV-A appears in both after-files (count 2); ADV-B once (count 1);
    // BLOCK-A and BLOCK-B once each (blocking total 2).
    writeFileSync(
      join(plansDir, 'after1.review.jsonl'),
      jsonlLine({
        timestamp: at(3600_000),
        verdict: 'CHANGES_REQUESTED',
        action: 'final_flip',
        rubric: [
          { id: 'ADV-A', passed: false, class: 'advisory' },
          { id: 'ADV-B', passed: false, class: 'advisory' },
          { id: 'BLOCK-A', passed: false, class: 'blocking' },
        ],
      }),
    );
    writeFileSync(
      join(plansDir, 'after2.review.jsonl'),
      jsonlLine({
        timestamp: at(7200_000),
        verdict: 'CHANGES_REQUESTED',
        action: 'final_flip',
        rubric: [
          { id: 'ADV-A', passed: false, class: 'advisory' },
          { id: 'BLOCK-B', passed: false, class: 'blocking' },
        ],
      }),
    );

    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, 'compare', '--since', 'baseline'], { cwd: tempDir, encoding: 'utf-8' });

    assert.match(stdout, /blocking\/advisory\s+2 blocking, 3 advisory; top advisory ADV-A x2, ADV-B x1/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('CLI: compare OMITS the "blocking/advisory" line entirely when the after-set carries zero advisory-classed rows -- including when every failing row is shaped exactly like a pre-materiality corpus (no class field at all) -- printing byte-identically to the pre-Phase-4 output', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'efficiency-cli-phase4-noadv-'));
  const plansDir = join(tempDir, 'PRPs', 'plans');
  mkdirSync(plansDir, { recursive: true });
  try {
    const jsonlLine = (obj) => JSON.stringify(obj) + '\n';
    const baselineEntry = { timestamp: '2020-01-01T00:00:00.000Z', verdict: 'APPROVED', action: 'final_flip', rubric: [] };
    writeFileSync(join(plansDir, 'baseline.review.jsonl'), jsonlLine(baselineEntry));

    execFileSync(process.execPath, [SCRIPT_PATH, 'snapshot', '--label', 'baseline'], { cwd: tempDir, encoding: 'utf-8' });
    const markerRaw = readFileSync(join(tempDir, 'PRPs', 'reports', 'efficiency', 'baseline.json'), 'utf-8');
    const markerMs = new Date(JSON.parse(markerRaw).markerUtc).getTime();

    // Pre-materiality shape: no `class` field anywhere, exactly like every
    // artifact this file's own PLAN 1/PLAN 2 fixtures above already use.
    const afterEntry = {
      timestamp: new Date(markerMs + 3600_000).toISOString(),
      verdict: 'CHANGES_REQUESTED',
      action: 'final_flip',
      rubric: [{ id: 'R-OLD', passed: false }],
    };
    writeFileSync(join(plansDir, 'after.review.jsonl'), jsonlLine(afterEntry));

    const stdout = execFileSync(process.execPath, [SCRIPT_PATH, 'compare', '--since', 'baseline'], { cwd: tempDir, encoding: 'utf-8' });

    assert.match(stdout, /top failures after\s+R-OLD x1/, 'sanity: the pre-existing top-failures line is unaffected');
    assert.doesNotMatch(stdout, /blocking\/advisory/, 'expected the new per-class line to be entirely absent when the after-set has zero advisory-classed rows');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
