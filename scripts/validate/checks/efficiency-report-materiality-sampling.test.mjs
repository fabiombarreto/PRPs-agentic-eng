// @ts-check
/**
 * Content-invariant tests for the advisory->defect conversion-sampling step
 * introduced by Phase 4 of PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md)
 * in .claude/commands/efficiency-report.md: the new numbered step 6,
 * "Sample advisory->defect conversion (semi-manual).".
 *
 * `.claude/commands/efficiency-report.md` is a human/LLM-read maintainer
 * command protocol, not deterministic code invoked by the automated
 * pipeline -- there is no function to call and observe a real sampling run
 * from in a node:test unit test. The honest, spot-verifiable coverage
 * available (the same static-protocol-text shape every other *.test.mjs
 * file in this corpus uses when asserting an LLM-executed .md protocol's
 * content) is static assertion on the PROTOCOL TEXT the command's reader
 * follows.
 *
 * This file covers plan AC-A3 (PRD AC-8)'s command-file sampling-step half
 * only. AC-A3's OTHER half -- the efficiency.mjs print-path that surfaces
 * the per-class tallies this step reads -- is real, deterministic JS and is
 * covered separately (genuinely behaviorally, via fixture corpora and the
 * real CLI) by the PHASE 4 section appended to scripts/efficiency.test.mjs.
 *
 * Source plan (PRD mode -- dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 -- an
 * Explore-agent sweep of all 53 scripts/validate/checks/*.test.mjs files):
 * exactly one file references the literal path
 * `.claude/commands/efficiency-report.md`
 * (scripts/validate/checks/timestamp-contract.test.mjs:256-269), and that
 * test asserts only that the path STRING is excluded from a `WATCHED_FILES`
 * registry and documented as such in timestamp-contract.mjs's own source --
 * it never reads efficiency-report.md's own content. Zero hits anywhere for
 * "Sample advisory", "topFailuresByClass", "blockingFailRows", or
 * "advisoryFailRows" in any test file. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (see
 * PRPs/reports/plan-review-materiality/phase-4/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`):
 *   AC-A3 (PRD AC-8) (command-file half) -- "...so that when the command
 *     reaches the new sampling step, it reads the per-class tallies, samples
 *     advisory ids for later-stage conversion, and reports the result with
 *     an explicit judgment-based/small-sample caveat plus the
 *     human-recorded promotion rule."
 *
 * Run: node --test scripts/validate/checks/efficiency-report-materiality-sampling.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const EFFICIENCY_REPORT_PATH = '.claude/commands/efficiency-report.md';

// Normalized to LF regardless of the checked-out line-ending convention (this
// file is a git checkout and may carry CRLF on some platforms/configs) -- the
// multi-newline literal search in step6Of() below requires a consistent
// terminator, and every other assertion in this file is line-ending-agnostic
// by design (either single-line substring matches or \s+-bridged wraps).
function readEfficiencyReportCommand() {
  return readFileSync(EFFICIENCY_REPORT_PATH, 'utf-8').replace(/\r\n/g, '\n');
}

function stepsSectionOf(content) {
  const start = content.indexOf('## Steps');
  const end = content.indexOf('## Recording a new marker');
  assert.ok(start !== -1 && end !== -1 && end > start, 'expected both the ## Steps and ## Recording a new marker headings to be present and in order');
  return content.slice(start, end);
}

function step6Of(content) {
  const start = content.indexOf('6. **Sample advisory');
  assert.notEqual(start, -1, 'expected the new step 6 heading to be present');
  const end = content.indexOf('\n\n---', start);
  assert.notEqual(end, -1, 'expected step 6 to be followed by the section-closing --- divider');
  return content.slice(start, end);
}

test('AC-A3: efficiency-report.md gains a new step 6 positioned after the pre-existing step 5, with every prior step\'s own opening phrase preserved byte-identical', () => {
  const content = readEfficiencyReportCommand();
  const steps = stepsSectionOf(content);

  assert.match(steps, /1\.\s+\*\*Run the comparison\.\*\*/);
  assert.match(steps, /2\.\s+\*\*Read the output honestly before interpreting it\.\*\*/);
  assert.match(steps, /3\.\s+\*\*Report the delta per stage\*\*/);
  assert.match(steps, /4\.\s+\*\*Name the attribution honestly\.\*\*/);
  assert.match(steps, /5\.\s+\*\*Say when the evidence points the other way\.\*\*/);

  const step5Index = steps.indexOf('5. **Say when the evidence points the other way.**');
  const step6Index = steps.indexOf('6. **Sample advisory');
  assert.ok(step5Index !== -1 && step6Index !== -1 && step6Index > step5Index, 'expected step 6 positioned after step 5, not spliced earlier in the Steps section');
});

test("AC-A3: the sampling step's title names it as the advisory->defect conversion sample", () => {
  const step6 = step6Of(readEfficiencyReportCommand());
  assert.match(step6, /Sample advisory/);
  assert.match(step6, /defect conversion \(semi-manual\)\.\*\*/);
});

test('AC-A3: the sampling step reads the per-class tallies emitted by scripts/efficiency.mjs (topFailuresByClass, blockingFailRows, advisoryFailRows) and states they print only when a stage carries at least one advisory-classed failing row', () => {
  const step6 = step6Of(readEfficiencyReportCommand());
  assert.match(step6, /`scripts\/efficiency\.mjs`/);
  assert.match(step6, /`topFailuresByClass`/);
  assert.match(step6, /`blockingFailRows`/);
  assert.match(step6, /`advisoryFailRows`/);
  assert.match(step6, /printed whenever a stage's after-set carries at\s+least one advisory-classed failing row/);
});

test('AC-A3: the sampling step is explicitly semi-manual -- it directs sampling a handful of artifacts and judging conversion by reading review.jsonl/code-review.jsonl, never a fully automated computation', () => {
  const step6 = step6Of(readEfficiencyReportCommand());
  assert.match(step6, /semi-manual/);
  assert.match(step6, /sample a\s+handful of the artifacts/);
  assert.match(step6, /PRPs\/plans\/<basename>\.review\.jsonl/);
});

test('AC-A3: the sampling step states the reported conversion rate is judgment-based with a small sample size, and must never be presented as a computed precision figure', () => {
  const step6 = step6Of(readEfficiencyReportCommand());
  assert.match(step6, /attribution is judgment-based and the sample size is small/);
  assert.match(step6, /never\s+present it as a computed precision figure/);
});

test('AC-A3: the sampling step names the human-recorded promotion rule -- a frequently-converting advisory check is a promotion candidate via a recorded docs/decisions.md entry, and promotion is never automatic', () => {
  const step6 = step6Of(readEfficiencyReportCommand());
  assert.match(step6, /candidate for promotion to blocking via a recorded `docs\/decisions\.md`/);
  assert.match(step6, /promotion is never automatic/);
});

test('the allowed-tools frontmatter is unchanged -- the new step needs no new tool grant beyond the pre-existing Read and the efficiency.mjs Bash allowance', () => {
  const content = readEfficiencyReportCommand();
  const frontmatter = content.slice(0, content.indexOf('---', 4));
  assert.match(frontmatter, /allowed-tools: Bash\(node scripts\/efficiency\.mjs:\*\), Bash\(ls PRPs\/reports\/efficiency:\*\), Read/);
});
