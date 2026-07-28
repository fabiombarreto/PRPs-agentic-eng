// @ts-check
/**
 * Real-behavioral tests for the stderr-warning fix to the three
 * previously-silent `catch` blocks in `scripts/generate-final-report.mjs`
 * (`loadPhaseScopes()`'s `readFileSync` catch; `loadVisualApprovalLine()`'s
 * `readFileSync` catch; `loadVisualApprovalLine()`'s `JSON.parse` catch).
 *
 * Source plan (description mode — no source PRD; the plan's own
 * `## Acceptance Criteria` AC-A1 through AC-A6 are the canonical list):
 *   PRPs/plans/make-the-silent-failure-paths-in.plan.md
 *
 * Authored test-after (docs/context/methodology.md: `tdd: false` +
 * `test_frameworks: ["node:test"]`) against the already-implemented,
 * already-code-reviewed fix — confirmed by direct read of
 * scripts/generate-final-report.mjs immediately before authoring: all
 * three target catch blocks already carry
 * `catch (err) { process.stderr.write('warning: could not <read|parse> ...'); ... }`.
 *
 * Existing-coverage scan performed before authoring (Step 2.1): Glob'd
 * scripts/validate/checks/*.test.mjs (31 files), read the two files that
 * invoke generate-final-report.mjs directly
 * (figma-visual-first-track-phase7.test.mjs, figma-track-phase7.test.mjs),
 * and dispatched an Explore-agent sweep of the full 31-file corpus for
 * "generate-final-report", "loadPhaseScopes", "loadVisualApprovalLine",
 * "could not read", "could not parse", and "stderr" (case-insensitive).
 * Result: BOTH files that invoke the script do so exclusively via
 * `execFileSync(..., { encoding: 'utf-8' })`, which returns stdout only
 * and silently discards stderr on the success path (confirmed
 * independently) — so stderr content is entirely untested anywhere in the
 * corpus today. figma-visual-first-track-phase7.test.mjs's own AC-A3
 * malformed-jsonl test (~line 492-521) is the ONE existing fixture that
 * already exercises one of the three sites (loadVisualApprovalLine's
 * JSON.parse catch); its own comment (~507-513) explicitly declines to
 * assert anything about stderr, precisely so this fix would not have to
 * fight it. That test is untouched by this session — its
 * rendering-unaffected property at that one site is EXISTING_TEST_COVERS
 * (see AC-A4 below), not re-asserted here. Zero hits anywhere for "could
 * not read" / "could not parse" confirm the warning TEXT itself is wholly
 * new territory. NEW_TEST_REQUIRED throughout except the one
 * EXISTING_TEST_COVERS carve-out noted per-test below.
 *
 * ENVIRONMENT-DEPENDENCY NOTE: generate-final-report.mjs's `main()` runs
 * UNCONDITIONALLY at module load (no entrypoint guard) — importing it
 * directly would execute `main()` against this test runner's own
 * `process.argv` and call `process.exit()` inside the shared test
 * process. A real child-process invocation is required, mirroring
 * figma-visual-first-track-phase7.test.mjs's own established, sanctioned
 * approach. UNLIKE both existing files that invoke this script, every
 * test below uses `spawnSync`, never `execFileSync` — `execFileSync`
 * returns stdout only on its success path and silently discards stderr
 * entirely (confirmed empirically during authoring); asserting on stderr
 * after an `execFileSync` call would silently pass or fail for the wrong
 * reason. `spawnSync` returns both streams plus a numeric exit `status`.
 *
 * CRITICAL gating precondition (verified by direct read of
 * generate-final-report.mjs:489-493): `loadVisualApprovalLine` is called
 * from `buildMarkdown` ONLY when `phaseScopes.get(phase)` is non-null for
 * that phase. Every fixture targeting sites 2/3 (and the AC-A3 jsonl-
 * absence guard test) below therefore first plants a real, readable plan
 * declaring a `phase_scope` row under `<root>/PRPs/plans/` — omitting
 * this would make `loadVisualApprovalLine` unreachable and any assertion
 * about its stderr output would pass or fail for the wrong reason.
 *
 * Traceability (source plan's own `## Acceptance Criteria`, AC-A1 through
 * AC-A6; description mode, no `(PRD AC-N)` token):
 *   AC-A1 (all three sites emit the documented warning shape) and AC-A2
 *     (the two diagnoses stay textually distinct) are folded into the
 *     same three per-site tests below (same fixture, complementary
 *     assertions) rather than duplicated across separate tests.
 *   AC-A3 (existsSync-guarded absence paths stay silent) — three tests:
 *     the jsonl-absence guard, the plan-not-found branch, and a full
 *     happy-path regression net proving a SUCCESSFUL read+parse+render
 *     never warns either (the converse property AC-A3's own "only
 *     genuine errors warn" implies).
 *   AC-A4 (rendered markdown byte-identical / stderr-only diff) — SPLIT:
 *     EXISTING_TEST_COVERS for the JSON.parse-catch site (already proven
 *     unperturbed by figma-visual-first-track-phase7.test.mjs's own
 *     malformed-jsonl test, untouched this session); NEW_TEST_REQUIRED
 *     for the other two sites (no existing fixture makes a plan file or a
 *     visual-approval.jsonl file unreadable) — supplied by full-row-
 *     content assertions folded into this file's own site-1/site-2 tests.
 *   AC-A5 (the two existing suites continue to pass, completely
 *     unmodified) — not a new assertion; this file makes zero edits to
 *     either existing file. Verified this session by direct execution
 *     (see the test-suite.diff manifest's Verification section).
 *   AC-A6 (harness exit code / stderr-inheritance unaffected) — folded
 *     into every test below as a `res.status === 0` assertion using
 *     `spawnSync` (a different invocation mechanism from the existing
 *     `execFileSync`-based tests' implicit `doesNotThrow` proof of the
 *     same property at the JSON.parse-catch site).
 *
 * Run: node --test scripts/validate/checks/generate-final-report-stderr-warnings.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GENERATE_FINAL_REPORT = fileURLToPath(new URL('../../generate-final-report.mjs', import.meta.url));

/**
 * Creates a throwaway temp root, hands it to `fn`, and always cleans up
 * afterward (even on assertion failure). Mirrors
 * figma-visual-first-track-phase7.test.mjs's `withTempRoot` of the same
 * name/shape — every fixture below nests a full `<tmp>/PRPs/reports/<feature>/`
 * + `<tmp>/PRPs/plans/` tree under one root, per the CRITICAL
 * gating-precondition note above (loadPhaseScopes' own
 * `resolve(reportsDir, '..', '..')` plans-root computation requires that
 * exact two-level nesting).
 * @template T
 * @param {(root: string) => T} fn
 * @returns {T}
 */
function withTempRoot(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-gfr-stderr-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Runs the real generate-final-report.mjs script as a child process via
 * `spawnSync` — never `execFileSync`, see the file header's
 * ENVIRONMENT-DEPENDENCY NOTE — against `reportsDir` (which must already
 * carry a run.json), writing <reportsDir>/final-report.md. Returns the
 * rendered report text, the raw stderr string, and the numeric exit
 * status.
 * @param {string} reportsDir
 * @returns {{ report: string, stderr: string, status: number | null }}
 */
function runGenerateFinalReportCapturingStderr(reportsDir) {
  const outPath = join(reportsDir, 'final-report.md');
  const res = spawnSync(process.execPath, [GENERATE_FINAL_REPORT, reportsDir, '--out', outPath], { encoding: 'utf-8' });
  assert.equal(res.error, undefined, `spawnSync itself failed to launch the script: ${res.error}`);
  const report = readFileSync(outPath, 'utf-8');
  return { report, stderr: res.stderr, status: res.status };
}

/** @param {string} scope */
function planMetadataWithScope(scope) {
  return `## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_scope | ${scope} |\n`;
}

// ---------------------------------------------------------------------------
// AC-A1, AC-A2, AC-A4, AC-A6 — the three previously-silent sites now emit a
// single-line, textually-distinct stderr warning; rendering is unaffected;
// the exit code stays 0.
// ---------------------------------------------------------------------------

test('AC-A1, AC-A2, AC-A4, AC-A6 (real CLI invocation): loadPhaseScopes\' readFileSync catch — a matched plan file that is actually a directory (EISDIR) produces exactly one "warning: could not read <planPath>: <err.message>" stderr line, never collapsed into the "could not parse" diagnosis, exit 0, and the unaffected phase\'s own row still renders its real scope', () => {
  withTempRoot((root) => {
    const feature = 'gfr-stderr-site1';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
    mkdirSync(join(reportsDir, 'phase-2', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    writeFileSync(
      join(reportsDir, 'phase-2', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '2:2', route: '/x', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-1-x.plan.md`), planMetadataWithScope('visual'));
    // Site 1 trigger: a DIRECTORY named exactly like a matching plan file —
    // findPlanForPhase's own filename regex still matches it (so it IS
    // "found"), but readFileSync then throws EISDIR reading it.
    mkdirSync(join(root, 'PRPs', 'plans', `${feature}-phase-2-y.plan.md`));

    const { report, stderr, status } = runGenerateFinalReportCapturingStderr(reportsDir);

    assert.equal(status, 0, 'script must still exit 0 despite the read failure on the phase-2 plan');
    const nonEmptyLines = stderr.split('\n').filter((l) => l.length > 0);
    assert.equal(nonEmptyLines.length, 1, `expected exactly one stderr line, got: ${JSON.stringify(stderr)}`);
    assert.match(stderr, /warning: could not read .*phase-2-y\.plan\.md: .+\n/i, 'expected the could-not-read shape naming the unreadable plan path and a bound err.message');
    assert.doesNotMatch(stderr, /could not parse/i, 'expected the read-failure diagnosis only — must not collapse into the parse diagnosis');
    assert.match(report, /\| phase-1 \| 1:1 \| \/ \| 0 \| 2 \| PASS \| visual \|/, 'expected phase-1\'s row to still render its real declared scope, unperturbed by phase-2\'s failure');
    assert.match(report, /\| phase-2 \| 2:2 \| \/x \| 0 \| 2 \| PASS \| — \|/, 'expected phase-2\'s row to fall back to the literal em-dash, not crash or blank the whole table');
  });
});

test('AC-A1, AC-A2, AC-A4, AC-A6 (real CLI invocation): loadVisualApprovalLine\'s readFileSync catch — a visual-approval.jsonl path that is actually a directory (EISDIR) produces exactly one "warning: could not read <jsonlPath>: <err.message>" stderr line, never collapsed into the "could not parse" diagnosis, exit 0, and the Scope column still renders correctly from the valid, unrelated plan read', () => {
  withTempRoot((root) => {
    const feature = 'gfr-stderr-site2';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-1-x.plan.md`), planMetadataWithScope('visual'));
    // Site 2 trigger: visual-approval.jsonl exists (existsSync true, so the
    // absence guard is NOT taken) but is a directory, not a file — EISDIR on
    // readFileSync.
    mkdirSync(join(reportsDir, 'phase-1', 'visual-approval.jsonl'));

    const { report, stderr, status } = runGenerateFinalReportCapturingStderr(reportsDir);

    assert.equal(status, 0, 'script must still exit 0 despite the read failure on visual-approval.jsonl');
    const nonEmptyLines = stderr.split('\n').filter((l) => l.length > 0);
    assert.equal(nonEmptyLines.length, 1, `expected exactly one stderr line, got: ${JSON.stringify(stderr)}`);
    assert.match(stderr, /warning: could not read .*visual-approval\.jsonl: .+\n/i, 'expected the could-not-read shape naming the unreadable jsonl path and a bound err.message');
    assert.doesNotMatch(stderr, /could not parse/i, 'expected the read-failure diagnosis only — must not collapse into the parse diagnosis');
    assert.match(report, /\| phase-1 \| 1:1 \| \/ \| 0 \| 2 \| PASS \| visual \|/, 'expected the Scope column to still render the real declared scope, unperturbed by the jsonl read failure');
    assert.doesNotMatch(report, /human visual approval/, 'expected no approval line to be fabricated when the source jsonl could not even be read');
  });
});

test('AC-A1, AC-A2, AC-A6 (real CLI invocation): loadVisualApprovalLine\'s JSON.parse catch — a real, readable visual-approval.jsonl whose last non-empty line is not valid JSON produces exactly one "warning: could not parse <jsonlPath>: <err.message>" stderr line, never collapsed into the "could not read" diagnosis, exit 0. (AC-A4\'s rendering-unaffected property at this exact site is EXISTING_TEST_COVERS via figma-visual-first-track-phase7.test.mjs\'s own malformed-jsonl test, untouched this session — not re-asserted here.)', () => {
  withTempRoot((root) => {
    const feature = 'gfr-stderr-site3';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-1-x.plan.md`), planMetadataWithScope('visual'));
    // Site 3 trigger: a real, readable file whose last non-empty line is
    // not valid JSON.
    writeFileSync(join(reportsDir, 'phase-1', 'visual-approval.jsonl'), 'not-valid-json{');

    const { stderr, status } = runGenerateFinalReportCapturingStderr(reportsDir);

    assert.equal(status, 0, 'script must still exit 0 despite the parse failure');
    const nonEmptyLines = stderr.split('\n').filter((l) => l.length > 0);
    assert.equal(nonEmptyLines.length, 1, `expected exactly one stderr line, got: ${JSON.stringify(stderr)}`);
    assert.match(stderr, /warning: could not parse .*visual-approval\.jsonl: .+\n/i, 'expected the could-not-parse shape naming the jsonl path and a bound err.message');
    assert.doesNotMatch(stderr, /could not read/i, 'expected the parse-failure diagnosis only — must not collapse into the read diagnosis');
  });
});

// ---------------------------------------------------------------------------
// AC-A3 — the existsSync-guarded "resource legitimately absent" paths (and,
// as the converse regression net, a fully successful read+parse+render)
// stay completely silent on stderr.
// ---------------------------------------------------------------------------

test('AC-A3 (real CLI invocation): loadVisualApprovalLine\'s existsSync-guarded absence path stays completely silent on stderr — no visual-approval.jsonl file at all, despite a real declared phase_scope reaching that call', () => {
  withTempRoot((root) => {
    const feature = 'gfr-stderr-jsonl-absent';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-1-x.plan.md`), planMetadataWithScope('visual'));
    // Deliberately no visual-approval.jsonl anywhere — legitimate absence,
    // not a failure. phaseScopes.get('phase-1') IS non-null here (a real
    // declared scope), so loadVisualApprovalLine IS called and must hit its
    // own existsSync guard, not skip via the outer gate.

    const { report, stderr, status } = runGenerateFinalReportCapturingStderr(reportsDir);

    assert.equal(status, 0);
    assert.equal(stderr, '', 'expected zero stderr output for a legitimately absent jsonl file — absence is not a failure');
    assert.match(report, /\| phase-1 \| 1:1 \| \/ \| 0 \| 2 \| PASS \| visual \|/);
    assert.doesNotMatch(report, /human visual approval/);
  });
});

test('AC-A3 (real CLI invocation): loadPhaseScopes\' "no plan file found" branch stays completely silent on stderr — a resolvable plans root exists but carries no file matching the phase\'s filename pattern', () => {
  withTempRoot((root) => {
    const feature = 'gfr-stderr-plan-absent';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    // A real PRPs/plans/ directory exists (so plansRoot itself resolves)
    // but carries zero files matching the phase-1 filename pattern —
    // findPlanForPhase legitimately returns null; loadPhaseScopes' "not
    // found" branch (scopes.set(phase, null); continue;) is taken, never
    // reaching the try/catch this fix touches.
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', 'unrelated-file.txt'), 'not a plan');

    const { report, stderr, status } = runGenerateFinalReportCapturingStderr(reportsDir);

    assert.equal(status, 0);
    assert.equal(stderr, '', 'expected zero stderr output when no plan file is found for the phase — absence is not a failure');
    assert.doesNotMatch(report, /\| Scope \|/);
    assert.doesNotMatch(report, /human visual approval/);
  });
});

test('AC-A3 (regression net — the converse of "only genuine errors warn"): a fully successful read-and-parse of a well-formed visual-approval.jsonl through to a rendered approval line produces zero stderr output', () => {
  withTempRoot((root) => {
    const feature = 'gfr-stderr-happy-path';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(reportsDir, 'phase-1', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0, threshold: 2, status: 'PASS' }])
    );
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-1-x.plan.md`), planMetadataWithScope('visual'));
    writeFileSync(
      join(reportsDir, 'phase-1', 'visual-approval.jsonl'),
      JSON.stringify({ timestamp: '2026-07-28T00:00:00Z', decision: 'approved', confirmation_text: 'ok' }) + '\n'
    );

    const { stderr, status } = runGenerateFinalReportCapturingStderr(reportsDir);

    assert.equal(status, 0);
    assert.equal(stderr, '', 'expected zero stderr on a fully successful read+parse+render path — no genuine error occurred anywhere');
  });
});
