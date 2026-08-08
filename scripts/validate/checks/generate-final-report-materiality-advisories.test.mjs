// @ts-check
/**
 * Real-behavioral tests for the "Open plan-review advisories" PR-body
 * section introduced by Phase 4 of PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md)
 * in plugins/relay/scripts/generate-final-report.mjs: the new
 * `loadOpenPlanReviewAdvisories(reportsDir)` loader and the
 * discover-then-guard section it feeds, mirroring the pre-existing Visual
 * Fidelity section's own omit-entirely-when-empty idiom.
 *
 * This file covers plan AC-A2 (PRD AC-8's surfacing half). Plan AC-A1 (the
 * measurement half, in scripts/efficiency.mjs) is covered separately by the
 * PHASE 4 section appended to scripts/efficiency.test.mjs. Plan AC-A3 (the
 * efficiency-report.md sampling step) is covered separately by
 * efficiency-report-materiality-sampling.test.mjs. Plan AC-A4 (the docs
 * corrections) is covered separately by
 * plan-review-materiality-docs-sync.test.mjs.
 *
 * Source plan (PRD mode -- dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Unlike the Phase 1-3 siblings that test LLM-executed markdown protocols
 * via static text assertion, `generate-final-report.mjs` is real,
 * deterministic JS -- this file drives the REAL CLI against synthetic
 * `PRPs/plans/` + `PRPs/reports/<feature>/` fixtures built in a fresh
 * `mkdtempSync` temp directory (never the real corpus) and asserts on the
 * rendered markdown output, mirroring
 * generate-final-report-stderr-warnings.test.mjs's own `withTempRoot` +
 * real-CLI-invocation technique (that file's own CRITICAL gating-precondition
 * note applies equally here: `loadOpenPlanReviewAdvisories`'s
 * `plansRoot = resolve(reportsDir, '..', '..')` requires the same
 * `<root>/PRPs/reports/<feature>/` + `<root>/PRPs/plans/` two-level nesting).
 *
 * Existing-coverage scan performed before authoring (Step 2.1 -- an
 * Explore-agent sweep of all 53 scripts/validate/checks/*.test.mjs files for
 * "loadOpenPlanReviewAdvisories", "Open plan-review advisories", and every
 * existing real-content read of generate-final-report.mjs): three files
 * reference generate-final-report.mjs (figma-track-phase7.test.mjs,
 * figma-visual-first-track-phase7.test.mjs,
 * generate-final-report-stderr-warnings.test.mjs), all three scoped
 * exclusively to the Visual Fidelity section and its Scope-column/stderr-warning
 * extensions -- none touch PR-body section-building logic related to
 * plan-review materiality/advisories. Zero matches for the loader name or
 * section heading anywhere. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (see
 * PRPs/reports/plan-review-materiality/phase-4/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`):
 *   AC-A2 (PRD AC-8) -- "Given a feature whose plan-review verdicts carry
 *     open advisory-classed failing rows, when the PR body is generated,
 *     then it contains an `## Open plan-review advisories` section listing
 *     phase/check/note; given zero such rows (or no review.jsonl), the
 *     section is omitted entirely -- no heading, no placeholder -- and the
 *     body is byte-identical to today's."
 *
 * Run: node --test scripts/validate/checks/generate-final-report-materiality-advisories.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GENERATE_FINAL_REPORT = fileURLToPath(new URL('../../../plugins/relay/scripts/generate-final-report.mjs', import.meta.url));

/**
 * Creates a throwaway temp root, hands it to `fn`, and always cleans up
 * afterward (even on assertion failure). Mirrors
 * generate-final-report-stderr-warnings.test.mjs's `withTempRoot` of the
 * same name/shape.
 * @template T
 * @param {(root: string) => T} fn
 * @returns {T}
 */
function withTempRoot(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-gfr-advisories-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Runs the real generate-final-report.mjs CLI against `reportsDir` (which
 * must already carry a run.json) and returns the rendered report text.
 * @param {string} reportsDir
 * @param {string} outPath
 * @returns {string}
 */
function runGenerateFinalReport(reportsDir, outPath) {
  execFileSync(process.execPath, [GENERATE_FINAL_REPORT, reportsDir, '--out', outPath], { encoding: 'utf-8' });
  return readFileSync(outPath, 'utf-8');
}

/**
 * Strips the one dynamic line (`_Generated <ISO timestamp>_`) so two
 * renders taken at different wall-clock moments can be compared for
 * byte-identity.
 */
function stripGeneratedTimestamp(text) {
  return text.replace(/^_Generated .*$/m, '_Generated <normalized>_');
}

// ---------------------------------------------------------------------------
// AC-A2 -- positive case: an advisory-classed failing row surfaces; a
// blocking-classed failing row and a passing row in the SAME entry do not
// (proves the filter is `class === 'advisory'`, not merely `passed ===
// false`). Also proves the pipe-escaping table-safety pass on the Note
// column.
// ---------------------------------------------------------------------------

test('AC-A2: the report contains an "## Open plan-review advisories" section listing phase/check/note for an advisory-classed failing row, while a blocking-classed failing row and a passing row in the same entry are excluded, and a pipe character in the reason is escaped so the table stays well-formed', () => {
  withTempRoot((root) => {
    const feature = 'gfr-advisories-positive';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));

    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    const planBasename = `${feature}-phase-1-x`;
    writeFileSync(join(root, 'PRPs', 'plans', `${planBasename}.plan.md`), '## Metadata\n');
    writeFileSync(
      join(root, 'PRPs', 'plans', `${planBasename}.review.jsonl`),
      JSON.stringify({
        verdict: 'CHANGES_REQUESTED',
        rubric: [
          { id: 'R-COH-ADV', passed: false, class: 'advisory', reason: 'line cite drift | still readable' },
          { id: 'R-BLOCK-EXCLUDED', passed: false, class: 'blocking', reason: 'must not appear -- this row is blocking' },
          { id: 'R-PASS-EXCLUDED', passed: true, class: 'advisory', reason: 'must not appear -- this row passed' },
        ],
      }) + '\n',
    );

    const report = runGenerateFinalReport(reportsDir, join(reportsDir, 'out.md'));

    assert.match(report, /## Open plan-review advisories/);
    assert.match(report, /Recorded by plan-review as advisory-classed \(non-gating\) findings and delivered to the Implementer; none of these blocked approval\./);
    assert.match(report, /\| Phase \| Check \| Note \|/);
    assert.match(report, /\| phase-1 \| R-COH-ADV \| line cite drift \\\| still readable \|/, 'expected the advisory row with its pipe character escaped so the table cell stays well-formed');
    assert.doesNotMatch(report, /R-BLOCK-EXCLUDED/, 'expected the blocking-classed row to be excluded entirely');
    assert.doesNotMatch(report, /R-PASS-EXCLUDED/, 'expected the passing row to be excluded entirely');
  });
});

// ---------------------------------------------------------------------------
// AC-A2 -- negative case (the critical contract): zero open advisories --
// whether because no plan/review.jsonl exists at all, or because the only
// review.jsonl carries solely blocking-classed failures -- omits the section
// ENTIRELY (no heading, no placeholder), and the two renders are
// byte-identical modulo the one dynamic timestamp line.
// ---------------------------------------------------------------------------

test('AC-A2: the "Open plan-review advisories" section is omitted entirely -- no heading, no placeholder -- when zero open advisory-classed rows exist, and the rendered body is byte-identical (modulo the dynamic _Generated_ line) whether no plans exist at all or a plan exists with only blocking/passing rows', () => {
  withTempRoot((root) => {
    const feature = 'gfr-advisories-omitted';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));

    // Baseline: no PRPs/plans directory at all.
    const reportNoPlans = runGenerateFinalReport(reportsDir, join(reportsDir, 'out-a.md'));
    assert.doesNotMatch(reportNoPlans, /Open plan-review advisories/);

    // Now add a plan whose review.jsonl carries only a blocking failure and a
    // passing advisory-classed row -- zero OPEN advisories.
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    const planBasename = `${feature}-phase-1-x`;
    writeFileSync(join(root, 'PRPs', 'plans', `${planBasename}.plan.md`), '## Metadata\n');
    writeFileSync(
      join(root, 'PRPs', 'plans', `${planBasename}.review.jsonl`),
      JSON.stringify({
        verdict: 'CHANGES_REQUESTED',
        rubric: [
          { id: 'R1', passed: false, class: 'blocking' },
          { id: 'R2', passed: true, class: 'advisory' },
        ],
      }) + '\n',
    );
    const reportBlockingOnly = runGenerateFinalReport(reportsDir, join(reportsDir, 'out-b.md'));
    assert.doesNotMatch(reportBlockingOnly, /Open plan-review advisories/);

    assert.equal(
      stripGeneratedTimestamp(reportNoPlans),
      stripGeneratedTimestamp(reportBlockingOnly),
      'expected byte-identical output (modulo the dynamic _Generated_ timestamp) whether zero plans exist or a plan exists with zero open advisories',
    );
  });
});

// ---------------------------------------------------------------------------
// AC-A2 -- the real repo directory shape: a plan archived under
// PRPs/plans/completed/ (post-/relay-execute) while its .review.jsonl audit
// log stays at PRPs/plans/<basename>.review.jsonl (never moved) -- exactly
// the layout this very repo uses for every completed phase (see e.g.
// PRPs/plans/completed/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md
// co-existing with PRPs/plans/plan-review-materiality-phase-1-class-taxonomy-gating.review.jsonl).
// ---------------------------------------------------------------------------

test('AC-A2: advisories still surface when the plan file has been archived to PRPs/plans/completed/ while its review.jsonl remains at PRPs/plans/ -- the real post-/relay-execute directory shape', () => {
  withTempRoot((root) => {
    const feature = 'gfr-advisories-completed';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));

    mkdirSync(join(root, 'PRPs', 'plans', 'completed'), { recursive: true });
    const planBasename = `${feature}-phase-1-x`;
    writeFileSync(join(root, 'PRPs', 'plans', 'completed', `${planBasename}.plan.md`), '## Metadata\n');
    // The .review.jsonl audit log is never archived -- it stays directly
    // under PRPs/plans/, exactly as loadOpenPlanReviewAdvisories always
    // reads it regardless of where the .plan.md itself was found.
    writeFileSync(
      join(root, 'PRPs', 'plans', `${planBasename}.review.jsonl`),
      JSON.stringify({ verdict: 'APPROVED', rubric: [{ id: 'R-ARCHIVED', passed: false, class: 'advisory', reason: 'still open after archival' }] }) + '\n',
    );

    const report = runGenerateFinalReport(reportsDir, join(reportsDir, 'out.md'));

    assert.match(report, /## Open plan-review advisories/);
    assert.match(report, /\| phase-1 \| R-ARCHIVED \| still open after archival \|/);
  });
});

// ---------------------------------------------------------------------------
// AC-A2 -- multi-phase aggregation: each phase's own open advisories surface
// under its own phase label, reading the LAST non-empty jsonl line per phase
// independently.
// ---------------------------------------------------------------------------

test("AC-A2: multiple phases each contribute their own open advisories, reading the LAST non-empty line of each phase's own review.jsonl independently", () => {
  withTempRoot((root) => {
    const feature = 'gfr-advisories-multiphase';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));

    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    const phaseRows = [
      [1, [{ id: 'R-P1', passed: false, class: 'advisory', reason: 'phase 1 advisory' }]],
      [2, [{ id: 'R-P2', passed: false, class: 'advisory', reason: 'phase 2 advisory' }]],
    ];
    for (const [n, rows] of phaseRows) {
      const planBasename = `${feature}-phase-${n}-x`;
      writeFileSync(join(root, 'PRPs', 'plans', `${planBasename}.plan.md`), '## Metadata\n');
      // A superseded FIRST line establishes that only the LAST line is read:
      // it carries a different, would-fail-the-test id.
      const supersededLine = JSON.stringify({ verdict: 'CHANGES_REQUESTED', rubric: [{ id: 'R-SUPERSEDED', passed: false, class: 'advisory', reason: 'must not appear -- superseded' }] });
      const finalLine = JSON.stringify({ verdict: 'APPROVED', rubric: rows });
      writeFileSync(join(root, 'PRPs', 'plans', `${planBasename}.review.jsonl`), supersededLine + '\n' + finalLine + '\n');
    }

    const report = runGenerateFinalReport(reportsDir, join(reportsDir, 'out.md'));

    assert.match(report, /\| phase-1 \| R-P1 \| phase 1 advisory \|/);
    assert.match(report, /\| phase-2 \| R-P2 \| phase 2 advisory \|/);
    assert.doesNotMatch(report, /R-SUPERSEDED/, 'expected only the LAST non-empty jsonl line to be read, not a superseded earlier line');
  });
});
