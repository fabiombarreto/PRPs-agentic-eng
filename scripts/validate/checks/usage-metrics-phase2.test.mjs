// @ts-check
/**
 * Behavioral tests for Phase 2 ("Materializer + backfill") of the
 * usage-metrics feature — `plugins/relay/scripts/usage-metrics.mjs`.
 *
 * Unlike Phase 1's content-invariant suite, this deliverable has real
 * behavior, so these tests exercise the exported functions directly against
 * hand-built inputs that reproduce the awkward shapes actually observed on
 * disk: an orchestrator-run.json phases[] array carrying three incompatible
 * entry shapes, a malformed jsonl line, and rubric rows with and without a
 * `class` field.
 *
 * Authored test-after per `docs/context/methodology.md` (`tdd: false`,
 * `test_frameworks: ["node:test"]`). The module is imported rather than
 * spawned, which is why the script guards main() behind an import.meta.url
 * check.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  toCell,
  readJsonlLines,
  projectVerdicts,
  projectRubric,
  projectRuns,
  sortRows,
  renderShard,
  shardName,
} from '../../../plugins/relay/scripts/usage-metrics.mjs';

const SCRIPT_PATH = 'plugins/relay/scripts/usage-metrics.mjs';

/** @param {string} name @returns {string} */
function tempDir(name) {
  return mkdtempSync(join(tmpdir(), `usage-metrics-${name}-`));
}

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-7) — the closed field contract is enforced in code, not only
// documented: every emitted cell is a code, a non-negative integer, an
// ISO-8601 instant, or the sentinel, and never carries a tab, CR or newline.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-7): toCell coerces anything outside the closed contract to the sentinel', () => {
  assert.equal(toCell(null), '-');
  assert.equal(toCell(undefined), '-');
  assert.equal(toCell(''), '-');
  assert.equal(toCell(0), '0');
  assert.equal(toCell(42), '42');
  assert.equal(toCell(-1), '-', 'a negative integer is outside the non-negative domain');
  assert.equal(toCell(1.5), '-', 'a non-integer is outside the domain');
  assert.equal(toCell(true), '1');
  assert.equal(toCell('APPROVED'), 'APPROVED');
});

test('AC-A3 (PRD AC-7): any value carrying a tab, CR or newline becomes the sentinel — this is what makes unquoted TSV safe', () => {
  assert.equal(toCell('has\ttab'), '-');
  assert.equal(toCell('has\rcarriage'), '-');
  assert.equal(toCell('has\nnewline'), '-');
  assert.equal(toCell('multi\nline\treason string'), '-');
});

test('AC-A3 (PRD AC-7): a rendered shard has exactly one cell per column on every line and no stray tab', () => {
  const rows = [
    { proj: 'p', ts: '2026-08-01T00:00:01Z', deg: '0', stage: 'plan-review', art: 'a', seq: '1', rid: 'R1', pass: '1', cls: 'blocking', esc: '0', rat: '-' },
  ];
  const out = renderShard('rubric', rows);
  const lines = out.trimEnd().split('\n');
  const width = lines[0].split('\t').length;
  for (const line of lines) {
    assert.equal(line.split('\t').length, width, `every line must have ${width} cells: ${JSON.stringify(line)}`);
  }
  assert.ok(out.endsWith('\n'), 'shard must end with a trailing newline');
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-8) — defensive reads: a malformed line is recorded with its
// 1-based number and every well-formed row still lands.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-8): a malformed jsonl line is reported by line number without losing the well-formed ones', () => {
  const dir = tempDir('jsonl');
  const path = join(dir, 'x.review.jsonl');
  writeFileSync(path, [
    JSON.stringify({ timestamp: '2026-08-01T00:00:01Z', verdict: 'APPROVED', rubric: [] }),
    '{ not json at all',
    '',
    JSON.stringify({ timestamp: '2026-08-01T00:00:02Z', verdict: 'APPROVED', rubric: [] }),
  ].join('\n'));

  const { records, errors } = readJsonlLines(path);
  assert.equal(records.length, 2, 'both well-formed records survive');
  assert.equal(errors.length, 1, 'the malformed line is recorded, not silently dropped');
  assert.equal(errors[0].line, 2, 'the error carries a 1-based line number');
});

test('AC-A1 (PRD AC-8): a file with no trailing newline parses identically to one with it', () => {
  const dir = tempDir('trailing');
  const record = JSON.stringify({ timestamp: '2026-08-01T00:00:01Z', verdict: 'APPROVED', rubric: [] });
  writeFileSync(join(dir, 'with.review.jsonl'), record + '\n');
  writeFileSync(join(dir, 'without.review.jsonl'), record);

  assert.equal(readJsonlLines(join(dir, 'with.review.jsonl')).records.length, 1);
  assert.equal(readJsonlLines(join(dir, 'without.review.jsonl')).records.length, 1);
});

test('AC-A1 (PRD AC-8): a missing file yields empty results rather than throwing', () => {
  const { records, errors } = readJsonlLines(join(tempDir('missing'), 'nope.review.jsonl'));
  assert.equal(records.length, 0);
  assert.equal(errors.length, 0);
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-4) — the absent-class rule, which the codebook's caveat exists
// to explain: a code-review row with no `class` field counts as blocking.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-4): a failing rubric row with no class field counts as blocking, and one marked advisory does not', () => {
  const file = { path: 'x', stage: 'code-review', art: 'feat-phase-1-slug' };
  const records = [{
    timestamp: '2026-08-01T00:00:01Z',
    verdict: 'CHANGES_REQUESTED',
    action: 'rubric_fail',
    rubric: [
      { id: 'R-S1', passed: true },
      { id: 'R-SEM', passed: false },
      { id: 'R-COH-X', passed: false, class: 'advisory' },
    ],
  }];
  const [row] = projectVerdicts('p', file, records);
  assert.equal(row.nrub, '3');
  assert.equal(row.nfail, '2');
  assert.equal(row.nblk, '1', 'the class-less failing row counts as blocking');
  assert.equal(row.nadv, '1');
});

test('AC-A5 (PRD AC-4): the rubric relation denormalizes proj, ts, deg and stage from its parent verdict', () => {
  const file = { path: 'x', stage: 'plan-review', art: 'feat-phase-2-slug' };
  const records = [{
    timestamp: '2026-08-01T00:00:01Z',
    timestamp_degraded: true,
    verdict: 'APPROVED',
    rubric: [{ id: 'R1', passed: true, class: 'blocking' }],
  }];
  const [row] = projectRubric('proj-x', file, records);
  assert.equal(row.proj, 'proj-x');
  assert.equal(row.ts, '2026-08-01T00:00:01Z');
  assert.equal(row.deg, '1', 'degradation is carried onto the rubric row, not left only on the parent');
  assert.equal(row.stage, 'plan-review');
  assert.equal(row.rid, 'R1');
});

test('AC-A5 (PRD AC-4): a verdict whose timestamp is unusable is emitted with the sentinel rather than a fabricated instant', () => {
  const file = { path: 'x', stage: 'plan-review', art: 'a' };
  const [row] = projectVerdicts('p', file, [{ timestamp: 'not-a-date', verdict: 'APPROVED', rubric: [] }]);
  assert.equal(row.ts, '-');
  assert.equal(shardName('verdict', row), 'verdict-v1-undated.tsv', 'it routes to the undated shard');
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-3) — all three real orchestrator-run.json entry shapes project
// without minting a row twice.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-3): the three real phases[] entry shapes each project to exactly one row', () => {
  const dir = tempDir('runs');
  const feat = join(dir, 'my-feature');
  mkdirSync(feat, { recursive: true });
  writeFileSync(join(feat, 'orchestrator-run.json'), JSON.stringify({
    max_plan_review_retries: 2,
    max_orchestrator_minutes: 240,
    phases: [
      { phase: 1, stage: 'plan', outcome: 'APPROVED' },
      { phase: 1, status: 'complete', timestamp: '2026-08-07T14:15:00Z' },
      { phase: 3, stage: 'implement', outcome: 'APPROVED', attempts: 2 },
    ],
  }));

  const rows = projectRuns('p', feat);
  assert.equal(rows.length, 3, 'one row per entry, none minted twice');

  const stageRow = rows.find((r) => r.stage === 'plan');
  assert.ok(stageRow);
  assert.equal(stageRow.ts, '-', 'a stage entry carries no timestamp and must not invent one');
  assert.equal(stageRow.bud_prr, '2');

  const completion = rows.find((r) => r.stage === 'complete');
  assert.ok(completion, 'the status-keyed completion entry is not dropped');
  assert.equal(completion.outcome, 'complete', 'its status value is carried in outcome');
  assert.equal(completion.ts, '2026-08-07T14:15:00Z');

  const implement = rows.find((r) => r.stage === 'implement');
  assert.ok(implement);
  assert.equal(implement.natt, '2', 'the ad hoc attempts key populates natt where it exists');
  assert.equal(stageRow.natt, '-', 'and every other entry writes the sentinel rather than zero');
});

test('AC-A2 (PRD AC-3): duration is captured where run.json records it, and stays the sentinel where it does not — never zero', () => {
  const dir = tempDir('durations');

  const withTiming = join(dir, 'timed-feature');
  mkdirSync(withTiming, { recursive: true });
  writeFileSync(join(withTiming, 'run.json'), JSON.stringify({
    outcome: 'GREEN',
    ended_at: '2026-08-01T00:08:00Z',
    elapsed_ms: 480000,
    time_breakdown: { attempt_1_suite_ms: 377446, attempt_1_correction_ms: 0, attempt_2_suite_ms: 1000, attempt_2_correction_ms: 250 },
    attempts: [{ n: 1, record: 'phase-4/attempts/1/record.json' }],
  }));
  const timed = projectRuns('p', withTiming).find((r) => r.stage === 'test');
  assert.ok(timed);
  assert.equal(timed.ms, '480000');
  assert.equal(timed.suite_ms, '378446', 'suite milliseconds are summed across attempts');
  assert.equal(timed.corr_ms, '250', 'correction milliseconds are summed separately — the split is what distinguishes a slow suite from a churning loop');

  // Two of four real run.json files on disk carry no timing fields at all.
  const untimed = join(dir, 'untimed-feature');
  mkdirSync(untimed, { recursive: true });
  writeFileSync(join(untimed, 'run.json'), JSON.stringify({ outcome: 'GREEN', started_at: '2026-08-01T00:00:01Z' }));
  const plain = projectRuns('p', untimed).find((r) => r.stage === 'test');
  assert.ok(plain);
  assert.equal(plain.ms, '-', 'absent duration must be the sentinel, not zero — a zero reads as "ran instantly" and drags every average toward it');
  assert.equal(plain.suite_ms, '-');
  assert.equal(plain.corr_ms, '-');
});

test('AC-A2 (PRD AC-3): orchestrator stage entries carry no duration rather than an inferred one', () => {
  const dir = tempDir('nostagems');
  const feat = join(dir, 'f');
  mkdirSync(feat, { recursive: true });
  writeFileSync(join(feat, 'orchestrator-run.json'), JSON.stringify({
    phases: [
      { phase: 1, stage: 'plan', outcome: 'APPROVED' },
      { phase: 1, status: 'complete', timestamp: '2026-08-07T14:15:00Z' },
    ],
  }));
  for (const row of projectRuns('p', feat)) {
    assert.equal(row.ms, '-', 'deriving a stage duration from consecutive completion timestamps would be inference presented as measurement');
  }
});

test('AC-A2 (PRD AC-3): run.json phase identity falls back to a record-path match when phase_context is absent', () => {
  const dir = tempDir('runjson');
  const feat = join(dir, 'other-feature');
  mkdirSync(feat, { recursive: true });
  writeFileSync(join(feat, 'run.json'), JSON.stringify({
    outcome: 'GREEN',
    started_at: '2026-08-01T00:00:01Z',
    ended_at: '2026-08-01T00:00:09Z',
    attempts: [{ n: 1, record: 'PRPs/reports/other-feature/phase-7/attempts/1/record.json' }],
  }));

  const rows = projectRuns('p', feat);
  const testRow = rows.find((r) => r.stage === 'test');
  assert.ok(testRow);
  assert.equal(testRow.phase, '7', 'phase recovered from the record path when phase_context is absent');
  assert.equal(testRow.natt, '1');
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1) — determinism: ordering is stable and locale-independent,
// and the source carries neither localeCompare nor an os import.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-1): sortRows is deterministic and independent of insertion order', () => {
  const mk = (art, seq) => ({ proj: 'p', stage: 's', art, seq: String(seq) });
  const a = sortRows('verdict', [mk('b', 1), mk('a', 2), mk('a', 1)]);
  const b = sortRows('verdict', [mk('a', 1), mk('b', 1), mk('a', 2)]);
  assert.deepEqual(a.map((r) => `${r.art}${r.seq}`), b.map((r) => `${r.art}${r.seq}`));
  assert.deepEqual(a.map((r) => `${r.art}${r.seq}`), ['a1', 'a2', 'b1']);
});

test('AC-A4 (PRD AC-1): rendering the same rows twice produces byte-identical output', () => {
  const rows = [
    { proj: 'p', ts: '2026-08-01T00:00:02Z', deg: '0', stage: 's', art: 'z', seq: '1', rid: 'R2', pass: '1', cls: 'blocking', esc: '0', rat: '-' },
    { proj: 'p', ts: '2026-08-01T00:00:01Z', deg: '0', stage: 's', art: 'a', seq: '1', rid: 'R1', pass: '0', cls: 'advisory', esc: '0', rat: '-' },
  ];
  assert.equal(renderShard('rubric', rows), renderShard('rubric', [...rows].reverse()));
});

test('AC-A4 (PRD AC-1): the source uses neither localeCompare nor os.EOL, whose results are platform- or engine-dependent', () => {
  const src = readFileSync(SCRIPT_PATH, 'utf8');
  assert.doesNotMatch(src, /\.localeCompare\(/, 'localeCompare is documented as implementation-dependent');
  assert.doesNotMatch(src, /from 'node:os'/, 'os.EOL is CRLF on Windows and would break cross-platform byte-identity');
  assert.match(src, /import\.meta\.url/, 'main() must be guarded so the module can be imported by this test');
  assert.match(src, /renameSync/, 'writes must be atomic so an interrupted run cannot leave a truncated shard');
});

test('AC-A4 (PRD AC-1): the scan relation is a history that grows, not a snapshot that overwrites — and the codebook scopes the byte-identity claim accordingly', () => {
  // Regression for a defect that a same-second double-run hid: comparing every
  // shard including `scan` reports byte-identity only when both runs land in
  // the same second. The scan relation is one row per materialization by
  // contract, so it MUST grow; the guarantee belongs to the fact tables.
  const src = readFileSync(SCRIPT_PATH, 'utf8');
  assert.match(
    src,
    /The scan relation is a HISTORY/,
    'the append semantics must be stated where the writer implements them'
  );
  assert.match(
    src,
    /deduped\s+\*?\s*\/?\/?\s*on the \(proj, ts\) composite key|deduped on the \(proj, ts\)/,
    'a re-run inside the same second must be idempotent rather than duplicated'
  );

  const codebook = readFileSync('plugins/relay/resources/usage-metrics-schema.md', 'utf8');
  assert.match(
    codebook,
    /Scope of the byte-identity guarantee/,
    'the codebook must scope the claim, since a reader verifying determinism across two instants would otherwise read a growing scan file as a failure'
  );
  assert.match(
    codebook,
    /a `scan` file that did\s+NOT grow would mean the collector did not run/,
    'the inverse reading is the liveness signal and must be stated'
  );
});

test('AC-A4 (PRD AC-1): the source is free of raw control bytes that would make it binary to grep and diff tooling', () => {
  const buf = readFileSync(SCRIPT_PATH);
  const offenders = [];
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c === 0 || c < 9 || (c > 13 && c < 32)) offenders.push(i);
  }
  assert.deepEqual(offenders, [], 'a raw control byte makes grep treat the file as binary and suppress line output');
});
