#!/usr/bin/env node
// @ts-check
/**
 * relay efficiency metrics — snapshot and before/after comparison.
 *
 * The relay pipeline's cost is dominated by rework: how many times a writer
 * and reviewer round-trip before an artifact is accepted. Every verdict is
 * already recorded in `PRPs/plans/*.jsonl`, so the metrics are derivable from
 * the repo itself with no new instrumentation.
 *
 * Two modes:
 *
 *   node scripts/efficiency.mjs snapshot --label v0.24.0 [--note "..."]
 *     Aggregates the corpus as it stands and writes a marker to
 *     PRPs/reports/efficiency/<label>.json — the release timestamp plus the
 *     metrics at that moment. Run this at a release cut.
 *
 *   node scripts/efficiency.mjs compare [--since <label>]
 *     Re-aggregates now, splits artifacts into before/after the marker, and
 *     prints the delta. Defaults to the most recent snapshot.
 *
 * Splitting rule: an artifact belongs to the AFTER set when its FIRST recorded
 * verdict is later than the marker. That measures newly-authored artifacts
 * rather than mixing in retries of work that predates the change. An artifact
 * with ANY entry carrying `timestamp_degraded: true` is excluded from BOTH the
 * before and after sets before this split runs at all — the producer already
 * declared that stamp a placeholder, so which side of the marker it belongs on
 * cannot be established. The exclusion is reported through its own named
 * warning rather than silently affecting either count. This is exclusion, not
 * classify-with-a-warning: it reuses the existing `undated` idiom below rather
 * than keeping a known-wrong number in the headline (see `docs/decisions.md`).
 *
 * Honesty guard: some historical entries carry a date-only midnight timestamp,
 * so a purely time-based split can misclassify same-day artifacts. `compare`
 * therefore recomputes the BEFORE set and diffs it against the numbers the
 * snapshot recorded; any mismatch is printed as a warning rather than being
 * silently folded into the result. This guard is orthogonal to the
 * `timestamp_degraded` exclusion above: an unflagged historic midnight stamp
 * stays classified (and can still drift into this warning), while a flagged
 * one is excluded from the split entirely and never reaches this guard.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLANS_DIR = 'PRPs/plans';
const SNAP_DIR = 'PRPs/reports/efficiency';

/** Which jsonl suffix belongs to which pipeline stage. */
const STAGES = {
  '.review.jsonl': 'plan-review',
  '.code-review.jsonl': 'code-review',
  '.test-write-review.jsonl': 'test-write-review',
};

const PASSING = new Set(['APPROVED', 'RUBRIC_PASSED']);

/**
 * Read every verdict in the corpus, grouped per artifact.
 * @returns {Array<{stage: string, file: string, entries: Array<{timestamp: string, verdict: string, action: string, fails: string[], failClasses: Array<{id: string, class: string}>, degraded: boolean}>}>}
 */
export function readCorpus() {
  if (!existsSync(PLANS_DIR)) return [];
  const artifacts = [];
  for (const name of readdirSync(PLANS_DIR)) {
    const suffix = Object.keys(STAGES).find((s) => name.endsWith(s));
    if (!suffix) continue;
    const entries = [];
    for (const line of readFileSync(join(PLANS_DIR, name), 'utf-8').split('\n')) {
      if (!line.trim()) continue;
      let j;
      try {
        j = JSON.parse(line);
      } catch {
        continue; // a malformed line is skipped, never silently counted as a pass
      }
      entries.push({
        timestamp: j.timestamp ?? '',
        verdict: j.verdict ?? '',
        action: j.action ?? '',
        fails: (j.rubric ?? []).filter((r) => r.passed === false).map((r) => r.id),
        // Rows without a `class` field predate the plan-review-materiality
        // taxonomy (Phase 1, docs/decisions.md 2026-08-06) and are read as
        // `blocking` -- the compatibility rule that keeps historic corpora
        // comparable. The ternary IS the rule: any value that is not
        // exactly the string 'advisory' counts as blocking.
        failClasses: (j.rubric ?? []).filter((r) => r.passed === false).map((r) => ({ id: r.id, class: r.class === 'advisory' ? 'advisory' : 'blocking' })),
        // Parsed off the JSON object, never by substring: one file in the
        // corpus mentions this literal token inside a reviewer's prose
        // `reason` string with no such field, which a grep would wrongly match.
        degraded: j.timestamp_degraded === true,
      });
    }
    if (entries.length) artifacts.push({ stage: STAGES[suffix], file: name, entries });
  }
  return artifacts;
}

/**
 * Partition one artifact's entries into review sessions. Inside a single
 * retry loop only the LAST verdict can be a passing one, because a passing
 * verdict terminates the loop — so a session closes on any verdict in the
 * `PASSING` set (line 59, reused rather than re-derived: a literal
 * 'APPROVED' comparison would wrongly keep splitting a `RUBRIC_PASSED`
 * artifact open) and the following entry opens the next session. A trailing
 * run of entries with no passing verdict is itself an unresolved session,
 * never dropped. The artifact itself is untouched by this split — it stays
 * the unit `hasDegradedTimestamp`/`classifyArtifacts` operate on; sessions
 * are a derived view consumed by `aggregate()` for the rework metric.
 * @param {{entries: Array<{verdict: string}>}} artifact
 * @returns {Array<Array<{verdict: string}>>}
 */
export function sessionsOf(artifact) {
  const sessions = [];
  let current = [];
  for (const entry of artifact.entries) {
    current.push(entry);
    if (PASSING.has(entry.verdict)) {
      sessions.push(current);
      current = [];
    }
  }
  if (current.length) sessions.push(current);
  return sessions;
}

/**
 * Aggregate a set of artifacts into the headline metrics.
 * @param {ReturnType<typeof readCorpus>} artifacts
 */
export function aggregate(artifacts) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const stage of Object.values(STAGES)) {
    const group = artifacts.filter((a) => a.stage === stage);
    const sessionsByArtifact = group.map((a) => sessionsOf(a));
    const sessions = sessionsByArtifact.flat();
    const splitArtifacts = sessionsByArtifact.filter((s) => s.length > 1).length;
    const runs = group.reduce((n, a) => n + a.entries.length, 0);
    // A rubric-amendment entry is an audit record, not a rubric run - counting
    // it as a first attempt would understate the first-pass failure rate.
    // Scoped to the first entry of each SESSION (not each artifact/file), so
    // a multi-session artifact contributes one first-attempt observation per
    // session instead of one for the whole file.
    const rubricRuns = sessions
      .map((s) => s.filter((e) => e.action !== 'human_authorized_ac_amendment'))
      .filter((e) => e.length);
    const firstFail = rubricRuns.filter((e) => !PASSING.has(e[0].verdict)).length;
    /** @type {Record<string, number>} */
    const fails = {};
    for (const a of group) for (const e of a.entries) for (const id of e.fails) fails[id] = (fails[id] ?? 0) + 1;
    // firstAttemptFailureRate above is deliberately unchanged: it is
    // verdict-based, so an advisory-carrying APPROVED already counts as a
    // first-attempt pass. Historic entries with no `class` field on a row
    // (or, for a synthetic/legacy entry shape, no `failClasses` at all)
    // contribute entirely to the blocking side, by the Task-1
    // compatibility rule (docs/decisions.md 2026-08-06).
    /** @type {{blocking: Record<string, number>, advisory: Record<string, number>}} */
    const failsByClass = { blocking: {}, advisory: {} };
    for (const a of group) for (const e of a.entries) for (const f of e.failClasses ?? []) failsByClass[f.class][f.id] = (failsByClass[f.class][f.id] ?? 0) + 1;
    const blockingFailRows = Object.values(failsByClass.blocking).reduce((n, c) => n + c, 0);
    const advisoryFailRows = Object.values(failsByClass.advisory).reduce((n, c) => n + c, 0);
    const topOfClass = (m) =>
      Object.entries(m)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, n]) => ({ id, n }));
    out[stage] = {
      artifacts: group.length,
      sessions: sessions.length,
      splitArtifacts,
      runs,
      runsPerSession: sessions.length ? +(runs / sessions.length).toFixed(2) : null,
      firstAttemptFailures: firstFail,
      firstAttemptFailureRate: rubricRuns.length ? +((100 * firstFail) / rubricRuns.length).toFixed(1) : null,
      topFailures: Object.entries(fails)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([id, n]) => ({ id, n })),
      blockingFailRows,
      advisoryFailRows,
      topFailuresByClass: { blocking: topOfClass(failsByClass.blocking), advisory: topOfClass(failsByClass.advisory) },
    };
  }
  return out;
}

/** First recorded timestamp for an artifact, or '' when unknown. */
export const firstSeen = (a) => a.entries.map((e) => e.timestamp).filter(Boolean).sort()[0] ?? '';

/** Whether any entry in the artifact was flagged by its producer as an unreliable timestamp. */
export const hasDegradedTimestamp = (a) => a.entries.some((e) => e.degraded);

/**
 * Pure classification: partitions artifacts into degraded / before / after /
 * undated sets against a release marker, with no I/O. Degraded artifacts are
 * pre-filtered out before the before/after/undated split runs, so they land
 * in neither aggregate — see the module docblock's Splitting rule.
 * @param {ReturnType<typeof readCorpus>} artifacts
 * @param {string} markerUtc
 * @returns {{before: ReturnType<typeof readCorpus>, after: ReturnType<typeof readCorpus>, undated: ReturnType<typeof readCorpus>, degraded: ReturnType<typeof readCorpus>}}
 */
export function classifyArtifacts(artifacts, markerUtc) {
  const degraded = artifacts.filter((a) => hasDegradedTimestamp(a));
  const rest = artifacts.filter((a) => !hasDegradedTimestamp(a));
  const before = rest.filter((a) => firstSeen(a) && firstSeen(a) <= markerUtc);
  const after = rest.filter((a) => firstSeen(a) > markerUtc);
  const undated = rest.filter((a) => !firstSeen(a));
  return { before, after, undated, degraded };
}

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function listSnapshots() {
  if (!existsSync(SNAP_DIR)) return [];
  return readdirSync(SNAP_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, ...JSON.parse(readFileSync(join(SNAP_DIR, f), 'utf-8')) }))
    .sort((a, b) => String(a.markerUtc).localeCompare(String(b.markerUtc)));
}

function pct(n) {
  return n === null ? 'n/a' : `${n}%`;
}

function doSnapshot() {
  const label = arg('--label');
  if (!label) {
    process.stderr.write('snapshot requires --label <version>, e.g. --label v0.24.0\n');
    process.exit(2);
  }
  const markerUtc = new Date().toISOString();
  const artifacts = readCorpus();
  const snap = {
    label,
    markerUtc,
    note: arg('--note', ''),
    metrics: aggregate(artifacts),
    corpusFiles: artifacts.length,
    corpusRuns: artifacts.reduce((n, a) => n + a.entries.length, 0),
  };
  mkdirSync(SNAP_DIR, { recursive: true });
  const path = join(SNAP_DIR, `${label}.json`);
  writeFileSync(path, JSON.stringify(snap, null, 2) + '\n');
  process.stdout.write(`Baseline recorded: ${path}\n  marker (UTC): ${markerUtc}\n`);
  for (const [stage, m] of Object.entries(snap.metrics)) {
    process.stdout.write(
      `  ${stage.padEnd(18)} ${m.artifacts} artifacts, ${m.sessions} sessions, ${m.runs} runs, ${m.runsPerSession ?? 'n/a'} runs/session, ${pct(m.firstAttemptFailureRate)} first-attempt failure\n`,
    );
  }
}

function doCompare() {
  const snaps = listSnapshots();
  if (!snaps.length) {
    process.stderr.write(`No baseline found under ${SNAP_DIR}. Run: node scripts/efficiency.mjs snapshot --label <version>\n`);
    process.exit(2);
  }
  const wanted = arg('--since');
  const snap = wanted ? snaps.find((s) => s.label === wanted) : snaps[snaps.length - 1];
  if (!snap) {
    process.stderr.write(`No baseline labelled "${wanted}". Available: ${snaps.map((s) => s.label).join(', ')}\n`);
    process.exit(2);
  }

  const artifacts = readCorpus();
  const { before, after, undated, degraded } = classifyArtifacts(artifacts, snap.markerUtc);

  const beforeNow = aggregate(before);
  const afterNow = aggregate(after);

  process.stdout.write(`relay efficiency — since ${snap.label} (${snap.markerUtc})\n`);
  if (snap.note) process.stdout.write(`  note: ${snap.note}\n`);
  process.stdout.write('\n');

  // Honesty guard: the recomputed BEFORE must match what the snapshot recorded.
  const drift = [];
  for (const stage of Object.values(STAGES)) {
    const was = snap.metrics?.[stage]?.artifacts ?? 0;
    const now = beforeNow[stage].artifacts;
    if (was !== now) drift.push(`${stage}: snapshot recorded ${was} artifacts, recomputed ${now}`);
  }
  if (drift.length) {
    process.stdout.write('  WARNING - the before-set does not reproduce the snapshot exactly.\n');
    process.stdout.write('  Some entries carry a date-only timestamp, so same-day artifacts can land\n');
    process.stdout.write('  on either side. Treat small deltas below as noise:\n');
    for (const d of drift) process.stdout.write(`    ${d}\n`);
    process.stdout.write('\n');
  }
  if (undated.length) {
    process.stdout.write(`  WARNING - ${undated.length} artifact(s) have no usable timestamp and are excluded from both sides.\n\n`);
  }
  if (degraded.length) {
    process.stdout.write(
      `  WARNING - ${degraded.length} artifact(s) carry a producer-flagged unreliable timestamp\n` +
        `  (timestamp_degraded) and are excluded from both sides:\n`,
    );
    for (const a of degraded) process.stdout.write(`    ${a.file}\n`);
    process.stdout.write('\n');
  }

  // Surface doubt rather than manufacture a clean number: a jsonl file can
  // hold more than one independent review session (a retry loop only ends
  // on a passing verdict, so two or more in one file mean two or more
  // sessions). Splitting is silent otherwise, so it is named here exactly
  // like the degraded-exclusion warning above.
  const splitArtifacts = artifacts.filter((a) => sessionsOf(a).length > 1);
  if (splitArtifacts.length) {
    const totalSessions = artifacts.reduce((n, a) => n + sessionsOf(a).length, 0);
    process.stdout.write(
      `  NOTICE - ${splitArtifacts.length} artifact(s) hold more than one review session\n` +
        `  (an APPROVED or RUBRIC_PASSED verdict followed by further entries): the\n` +
        `  ${artifacts.length} artifacts in the corpus split into ${totalSessions} sessions.\n` +
        `  Rework below is reported per session, not per artifact:\n`,
    );
    for (const a of splitArtifacts) process.stdout.write(`    ${a.file}\n`);
    process.stdout.write('\n');
  }

  const totalAfter = Object.values(STAGES).reduce((n, s) => n + afterNow[s].artifacts, 0);
  if (totalAfter === 0) {
    process.stdout.write('  No artifacts authored since the marker yet - nothing to compare.\n');
    process.stdout.write('  Run the pipeline on real work, then re-run this command.\n');
    return;
  }

  for (const stage of Object.values(STAGES)) {
    const b = beforeNow[stage];
    const a = afterNow[stage];
    process.stdout.write(`  ${stage}\n`);
    if (a.artifacts === 0) {
      process.stdout.write(`    no new artifacts since the marker (before: ${b.artifacts})\n\n`);
      continue;
    }
    const dRuns = b.runsPerSession !== null && a.runsPerSession !== null ? +(a.runsPerSession - b.runsPerSession).toFixed(2) : null;
    const dRate =
      b.firstAttemptFailureRate !== null && a.firstAttemptFailureRate !== null
        ? +(a.firstAttemptFailureRate - b.firstAttemptFailureRate).toFixed(1)
        : null;
    const sign = (n) => (n === null ? '' : n > 0 ? ` (+${n})` : ` (${n})`);
    process.stdout.write(`    artifacts            ${b.artifacts} before -> ${a.artifacts} after\n`);
    process.stdout.write(`    runs per session     ${b.runsPerSession ?? 'n/a'} -> ${a.runsPerSession ?? 'n/a'}${sign(dRuns)}\n`);
    process.stdout.write(`    first-attempt fail   ${pct(b.firstAttemptFailureRate)} -> ${pct(a.firstAttemptFailureRate)}${sign(dRate)}\n`);
    if (a.artifacts < 10) {
      process.stdout.write(`    CAUTION: ${a.artifacts} artifact(s) is a small sample - treat the delta as directional only\n`);
    }
    if (a.topFailures.length) {
      process.stdout.write(`    top failures after   ${a.topFailures.slice(0, 4).map((f) => `${f.id} x${f.n}`).join(', ')}\n`);
    }
    // Per-class split (plan-review-materiality Phase 4): emitted only when
    // this stage's after-set actually carries an advisory-classed failing
    // row, so a corpus with none -- including every pre-materiality corpus
    // -- prints byte-identically to today.
    if (a.advisoryFailRows > 0) {
      process.stdout.write(
        `    blocking/advisory    ${a.blockingFailRows} blocking, ${a.advisoryFailRows} advisory; top advisory ${a.topFailuresByClass.advisory.slice(0, 4).map((f) => `${f.id} x${f.n}`).join(', ')}\n`,
      );
    }
    process.stdout.write('\n');
  }
}

// Guarded so the module can be imported (e.g. for unit testing the pure
// classifier above) with no side effects — only a direct CLI invocation
// dispatches. Mirrors the only other import.meta.url CLI-entry guard in this
// repo, plugins/relay/scripts/normalize-test-output.mjs:334.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const mode = process.argv[2];
  if (mode === 'snapshot') doSnapshot();
  else if (mode === 'compare') doCompare();
  else {
    process.stderr.write(
      'Usage:\n' +
        '  node scripts/efficiency.mjs snapshot --label <version> [--note "..."]\n' +
        '  node scripts/efficiency.mjs compare [--since <version>]\n',
    );
    process.exit(2);
  }
}
