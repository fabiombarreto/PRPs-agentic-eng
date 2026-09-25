// @ts-check
/**
 * Content-invariant tests for Phase 3 ("Adjudication in R-SEM") of the
 * hybrid-code-review feature — the findings cap, the per-finding
 * reachability confirmation computed against the diff under review, the
 * promotion rule that forces R-SEM's `passed`/`class`/`escalated`/`reason`,
 * the advisory-by-default leave-alone branch, the explicit R-X/dispute
 * non-interference paragraph, and the two Phase 4 worked examples that
 * make the adjudication contract concrete.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed Phase 3 plan:
 * PRPs/plans/hybrid-code-review-phase-3-adjudication-in-r-sem.plan.md —
 * narrowed to the ACs the calling command named in scope: AC-5, AC-6,
 * AC-8, AC-9 (PRPs/prds/hybrid-code-review.prd.md).
 *
 * Existing-coverage scan performed before authoring (Step 2.1): grepped
 * every scripts/validate/checks/*.test.mjs file for "Findings cap",
 * "hybrid_findings_cap", "CONFIRMED REACHABLE", "Reachability confirmation",
 * "Promotion rule", "Explicit non-interference", and "escalated". Zero hits
 * outside code-reviewer.md itself. hybrid-code-review-phase1.test.mjs
 * covers the Phase 1 `class`-slot documentation and the four `hyb*`
 * fields' schema-only registration (one of its own tests is updated below,
 * see the lifecycle note). hybrid-code-review-phase2.test.mjs covers the
 * pass's own safety envelope (steps 1-8) and explicitly marks AC-5/AC-6 as
 * OUT_OF_PHASE_SCOPE, deferred to this phase. No existing test reads steps
 * 9-11, the non-interference paragraph, the replaced closing sentence, or
 * either of the two new Phase 4 worked examples this phase adds — every AC
 * below is NEW_TEST_REQUIRED except the one EXISTING_TEST_UPDATED recorded
 * in the manifest's lifecycle ledger.
 *
 * Static-assertion note: this phase's adjudication logic (the findings
 * cap, the `git diff` reachability check, the promotion branch) does not
 * exist as executable code in this repo — code-reviewer.md is itself a
 * prompt the `code-reviewer` agent interprets at run time, mirroring
 * hybrid-code-review-phase1.test.mjs's and hybrid-code-review-
 * phase2.test.mjs's own precedent. The meaningful, discriminative
 * assertion available to a `node:test` file is therefore: does the
 * shipped prose state the exact normative contract each in-scope AC
 * requires, in the position and ordering the APPROVED plan committed to.
 *
 * Traceability (PRPs/prds/hybrid-code-review.prd.md Acceptance Criteria,
 * narrowed to the plan's own in-scope subset: AC-A1 (PRD AC-5), AC-A2 (PRD
 * AC-6), AC-A3 (PRD AC-9), AC-A4 (PRD AC-8). AC-1 through AC-4, AC-7,
 * AC-10 through AC-12 are OUT_OF_PHASE_SCOPE — AC-1 shipped Phase 1;
 * AC-2/AC-3/AC-4/AC-7/AC-10/AC-11 shipped Phase 2 (hybrid-code-review-
 * phase2.test.mjs); AC-12 belongs to Phase 4's drift gate):
 *
 *   AC-A1 (PRD AC-5, "Advisory by default") — when no capped finding is
 *     both high-severity and confirmed reachable, R-SEM's row carries
 *     `class: advisory` (no `escalated` field), true regardless of
 *     R-SEM's own independent judgment, and the verdict is unaffected.
 *   AC-A2 (PRD AC-6, "Promotion on confirmed reachability") — a capped
 *     finding that is both high-severity and CONFIRMED REACHABLE (per the
 *     step 10 `git diff` procedure) forces R-SEM's `passed` to `false`,
 *     `class: blocking`, `escalated: true`, and a `reason` naming the
 *     finding and quoting its evidentiary `+` line.
 *   AC-A3 (PRD AC-9, "Contract preserved") — the explicit non-interference
 *     paragraph states this adjudication never touches R-X's `passed`
 *     value, and a promoted finding about a test file still never
 *     authorizes a direct edit — `TEST_CONTRACT_DISPUTE` governs
 *     unmodified.
 *   AC-A4 (PRD AC-8, "Log stays machine-readable for its consumers") — the
 *     `class`/`escalated` values this phase now actually emits map onto
 *     the `cls`/`esc` columns usage-metrics-schema.md already declares
 *     contractually (Phase 1) — no new free-text column exists for either
 *     name, so a promoted-finding verdict line still parses under the
 *     closed field contract.
 *
 * Run: node --test scripts/validate/checks/hybrid-code-review-phase3.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const SCHEMA_PATH = 'plugins/relay/resources/usage-metrics-schema.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors hybrid-code-review-phase1.test.mjs's / phase2's readRepoFile.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Returns the substring of `content` from `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Mirrors the
 * established slicing idiom used across every hybrid-code-review-phaseN
 * test file.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const start = content.indexOf(startNeedle);
  if (start === -1) return undefined;
  const end = content.indexOf(endNeedle, start);
  if (end === -1) return undefined;
  return content.slice(start, end);
}

const PASS_SECTION_HEADING =
  '## The hybrid /code-review pass (Phase 2 — evidence collection only)';
const NEXT_SECTION_HEADING = '## The R-COH-* coherence layer';

/**
 * Extracts the hybrid pass section's own body (heading through, but
 * excluding, the following R-COH-* heading). Mirrors
 * hybrid-code-review-phase2.test.mjs's getPassSection.
 * @param {string} content
 * @returns {string}
 */
function getPassSection(content) {
  const section = sliceBetween(content, PASS_SECTION_HEADING, NEXT_SECTION_HEADING);
  assert.ok(section, 'expected an extractable "## The hybrid /code-review pass" section');
  assert.ok(/** @type {string} */ (section).length > 0, 'extracted pass section must be non-empty');
  return /** @type {string} */ (section);
}

/**
 * Finds the single markdown table row beginning with `| \`<column>\` |` in
 * `content`. Mirrors hybrid-code-review-phase1.test.mjs's findTableRow.
 * @param {string} content
 * @param {string} column
 * @returns {string}
 */
function findTableRow(content, column) {
  const line = content.split('\n').find((l) => l.trim().startsWith('| `' + column + '` |'));
  assert.ok(line, `expected a table row starting with "| \`${column}\` |"`);
  return /** @type {string} */ (line);
}

// ---------------------------------------------------------------------------
// Infrastructure the promotion rule (AC-6) and advisory default (AC-5) both
// depend on: the fixed findings cap and the computed reachability check.
// ---------------------------------------------------------------------------

test('Findings cap: hybrid_findings_cap = 10 is a fixed, non-configurable constant; excluded lines are never checked for reachability but still count into hyb_findings_count', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(section, /Findings cap/, 'expected a "Findings cap" step');
  assert.match(section, /hybrid_findings_cap = 10/, 'expected the fixed cap value of 10');
  assert.match(
    section,
    /fixed\s+internal constant, NOT project-configurable/,
    'expected the cap to be stated as a fixed, non-project-configurable constant',
  );
  assert.match(section, /Take\s+the first 10 finding lines in the order the pass returned them/, 'expected the cap to take the first 10 findings in return order');
  assert.match(
    section,
    /excluded\s+from adjudication and never checked for reachability/,
    'expected findings beyond the cap to be excluded from adjudication and never checked for reachability',
  );
  assert.match(
    section,
    /`hyb_findings_count`\s+\(step 8, unchanged\) continues to report the\s+full raw count including the excluded tail/,
    'expected hyb_findings_count to keep reporting the full raw count including the excluded tail',
  );
});

test('Reachability confirmation (step 10): computed via git diff against the diff under review, never on the pass\'s own say-so, with a reproducible evidentiary + line quoted for every confirmed finding', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(section, /Reachability confirmation \(per capped finding\)/, 'expected a "Reachability confirmation (per capped finding)" step');
  assert.match(
    section,
    /independently\s+confirm reachability against the diff under review/,
    'expected reachability to be independently confirmed against the diff under review',
  );
  assert.match(
    section,
    /never against the working tree at large, and never on the pass's\s+own say-so/,
    'expected an explicit statement that reachability is never asserted on the pass\'s own say-so',
  );
  assert.match(
    section,
    /Run `git diff <diff_target> -- <file>`/,
    'expected the single-argument diff-base form scoped to the finding\'s cited file',
  );
  assert.match(
    section,
    /CONFIRMED REACHABLE if and only if its cited\s+file appears in that diff's output AND its cited line number\s+falls inside an added\/modified \(`\+`\) hunk line/,
    'expected CONFIRMED REACHABLE to require both file presence and an added/modified (+) hunk line',
  );
  assert.match(
    section,
    /never a `-`\s+removed line, never unmodified context surfaced only for\s+readability, and never a file absent from the diff entirely/,
    'expected the reachability definition to exclude removed lines, unmodified context, and absent files',
  );
  assert.match(
    section,
    /quote the exact `\+` line verbatim as the\s+row's evidentiary anchor/,
    'expected a confirmed finding to quote the exact + line verbatim as its evidentiary anchor',
  );
  assert.match(
    section,
    /is NOT confirmed — it stays advisory and\s+triggers no further action/,
    'expected an unreachable/unlocatable finding to stay advisory and trigger no further action',
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-6) — promotion on confirmed reachability.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-6): Promotion rule forces R-SEM passed:false, class:blocking, escalated:true, and a reason naming the confirmed finding plus its quoted + line, only when BOTH high-severity AND CONFIRMED REACHABLE', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(section, /Promotion rule/, 'expected a "Promotion rule" step');
  assert.match(
    section,
    /promotes R-SEM iff BOTH:\s*\(i\) its severity, as reported in the pass's own finding text, is\s*`high`; and \(ii\) it is CONFIRMED REACHABLE per step 10/,
    'expected promotion to require both high severity and confirmed reachability',
  );
  assert.match(
    section,
    /R-SEM's `passed` value recorded into `rubric\[\]` \(Phase 4\) is\s+forced to `false`, regardless of what this section's own\s+independent R-SEM judgment above concluded on its own/,
    'expected a promoted finding to force passed:false regardless of R-SEM\'s own independent judgment',
  );
  assert.ok(section.includes('"class": "blocking"'), 'expected the promoted row to carry "class": "blocking"');
  assert.ok(section.includes('"escalated": true'), 'expected the promoted row to carry "escalated": true');
  assert.match(
    section,
    /R-SEM's `reason` names the confirmed finding by its\s+`file:line` and quotes the evidentiary `\+` line from step\s+10\.c, appended after any pre-existing reason text from this\s+section's own independent judgment \(never replacing it\)/,
    'expected the reason to name the confirmed finding, quote its + line, and append rather than replace prior reason text',
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — advisory by default; passed/verdict untouched when
// nothing promotes.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): when no capped finding satisfies both promotion conditions, R-SEM instead carries class:advisory with no escalated field, describing only the hybrid evidence\'s disposition and never overriding R-SEM\'s own independent passed value', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /NO capped finding satisfies both conditions, R-SEM's row\s+instead carries `"class": "advisory"` \(no `escalated` field\)/,
    'expected the no-promotion branch to carry class:advisory with no escalated field',
  );
  assert.match(
    section,
    /true whether R-SEM's own independent judgment above passed or\s+failed on its own merits/,
    'expected the advisory class to apply regardless of R-SEM\'s own independent passed/failed outcome',
  );
  assert.match(
    section,
    /the `advisory` class describes only the\s+disposition of the hybrid evidence, never the reviewer's own\s+independent finding/,
    'expected the advisory class to describe only the hybrid evidence\'s disposition, never override R-SEM\'s own finding',
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-9) — contract preserved: R-X untouched; a promoted test
// finding still never authorizes a direct edit; the pre-adjudication
// closing sentence is replaced, not merely appended to.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-9): explicit non-interference paragraph states this adjudication never touches R-X\'s passed value, and a promoted test-file finding still routes through TEST_CONTRACT_DISPUTE rather than authorizing a direct edit', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(section, /Explicit non-interference \(AC-9\)/, 'expected an "Explicit non-interference (AC-9)" paragraph');
  assert.match(
    section,
    /This adjudication never touches\s+R-X's `passed` value under any branch — R-X is computed entirely\s+above, in its own section, before this one even runs/,
    'expected the paragraph to state R-X is computed entirely above and untouched by this adjudication',
  );
  assert.match(
    section,
    /is still never self-executing authorization to edit\s+that file/,
    'expected a confirmed-reachable test-file finding to still never self-execute a test edit',
  );
  assert.match(
    section,
    /the `TEST_CONTRACT_DISPUTE`\s+channel govern exactly as they did before this phase, unmodified/,
    'expected TEST_CONTRACT_DISPUTE to govern exactly as before this phase',
  );
  assert.match(
    section,
    /that dispute still runs through\s+Phase 3 of the arbitration flow, never through a direct edit/,
    'expected a disputed promoted finding to still route through the arbitration flow, never a direct edit',
  );
});

test('AC-A3 (PRD AC-9): the pre-adjudication closing sentence is replaced — steps 9-11 are now stated as the sole mechanism by which this section ever changes a rubric row, touching ONLY R-SEM and leaving R-S*/R-L*/R-X untouched', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /Steps 1-8 above \(evidence collection\) alter no rubric `passed`\s+value/,
    'expected the replaced closing sentence to state steps 1-8 alter no rubric passed value',
  );
  assert.match(
    section,
    /Steps 9-11 \(findings cap, reachability confirmation,\s+promotion — Phase 3 of `hybrid-code-review`\) are the sole mechanism\s+by which this section ever changes a rubric row/,
    'expected steps 9-11 to be named as the sole mechanism by which this section changes a rubric row',
  );
  assert.match(
    section,
    /they touch ONLY\s+R-SEM's `passed`\/`class`\/`escalated`\/`reason` — `R-S\*`, `R-L\*`, and\s+`R-X` remain untouched by this section under every branch/,
    'expected the replaced sentence to scope the touched fields to R-SEM only, leaving R-S*/R-L*/R-X untouched',
  );
  assert.ok(
    !section.includes('No branch of this section alters any'),
    'the stale Phase-2 closing sentence ("No branch of this section alters any…") must no longer be present',
  );
});

// ---------------------------------------------------------------------------
// AC-A1/AC-A2/AC-A4 — the two Phase 4 worked examples make the advisory and
// blocking/escalated outcomes concrete and machine-parseable.
// ---------------------------------------------------------------------------

test('Worked example: "Standard-mode APPROVED entry with the hybrid pass active" carries class:advisory on R-SEM, and its prose states the 3 findings were adjudicated per Phase 3 with none promoted', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '### Standard-mode APPROVED entry with the hybrid pass active',
    '### Standard-mode CHANGES_REQUESTED entry with a promoted hybrid finding',
  );
  assert.ok(block, 'expected to find the "Standard-mode APPROVED entry with the hybrid pass active" example section');
  const b = /** @type {string} */ (block);
  assert.ok(
    b.includes('{ "id": "R-SEM", "passed": true, "class": "advisory" }'),
    'expected the R-SEM row to carry passed:true, class:advisory',
  );
  assert.ok(b.includes('"hyb": 1'), 'expected the example to carry hyb: 1 (the pass was invoked)');
  assert.ok(b.includes('"hyb_lvl": "medium"'), 'expected the example to carry hyb_lvl');
  assert.ok(b.includes('"hyb_n": 3'), 'expected the example to carry hyb_n');
  assert.ok(b.includes('"hyb_ms"'), 'expected the example to carry hyb_ms');
  assert.match(
    b,
    /The 3\s+findings were adjudicated per Phase 3 of `hybrid-code-review`:\s+none\s+were both high-severity and confirmed reachable in the diff,\s+so\s+R-SEM stays `passed: true` and carries `class: advisory`/,
    'expected the prose to state the 3 findings were adjudicated per Phase 3 with none promoted',
  );
});

test('Worked example: "Standard-mode CHANGES_REQUESTED entry with a promoted hybrid finding" carries R-SEM passed:false, class:blocking, escalated:true, with the verdict flipped to CHANGES_REQUESTED and every other row still passing', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '### Standard-mode CHANGES_REQUESTED entry with a promoted hybrid finding',
    '### Arbitration-mode entry',
  );
  assert.ok(block, 'expected to find the "Standard-mode CHANGES_REQUESTED entry with a promoted hybrid finding" example section');
  const b = /** @type {string} */ (block);
  assert.match(
    b,
    /"id": "R-SEM", "passed": false, "class": "blocking", "escalated": true, "reason": "[^"]+"/,
    'expected the R-SEM row to carry passed:false, class:blocking, escalated:true, and a non-empty reason',
  );
  assert.ok(b.includes('"verdict": "CHANGES_REQUESTED"'), 'expected the example\'s verdict to be CHANGES_REQUESTED');
  assert.ok(b.includes('"action": "rubric_fail"'), 'expected the example\'s action to be rubric_fail');
  // Every non-R-SEM rubric row in this example is passed: true (7 other
  // standard-mode rows: R-S1, R-S2, R-S3, R-L1, R-L2, R-L3, R-X — the
  // R-COH-* rows are omitted from this worked example's own row count
  // check since they are not part of the fixed 8-item R-S*/R-L*/R-SEM/R-X
  // layer this test cares about).
  for (const id of ['R-S1', 'R-S2', 'R-S3', 'R-L1', 'R-L2', 'R-L3', 'R-X']) {
    assert.ok(
      b.includes(`{ "id": "${id}", "passed": true }`),
      `expected rubric row ${id} to be passed: true in this worked example`,
    );
  }
  assert.ok(b.includes('"hyb": 1'), 'expected the example to carry hyb: 1 (the pass was invoked)');
  assert.match(
    b,
    /The pass returned a high-severity finding whose cited line the\s+reviewer independently confirmed inside an added `\+` hunk of the\s+diff, so R-SEM fails and the verdict flips to\s+`CHANGES_REQUESTED`/,
    'expected the prose to name the scenario: a confirmed high-severity finding flips the verdict',
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-8) — the class/escalated values this phase now emits map
// onto the already-contractual cls/esc columns; no new free-text column
// was introduced for either name.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-8): usage-metrics-schema.md\'s cls/esc columns already cover the class:advisory|blocking and escalated:true values this phase now emits on R-SEM, and no separate class/escalated column was introduced', () => {
  const content = readRepoFile(SCHEMA_PATH);
  const clsRow = findTableRow(content, 'cls');
  assert.ok(clsRow.includes('`blocking`') && clsRow.includes('`advisory`'), 'expected the cls column\'s domain to cover blocking and advisory');
  assert.match(clsRow, /\|\s*yes\s*\|\s*$/, 'expected the cls column to be marked contractual ("yes")');

  const escRow = findTableRow(content, 'esc');
  assert.ok(escRow.includes('`0`') && escRow.includes('`1`'), 'expected the esc column\'s domain to cover 0 and 1');
  assert.match(escRow, /\|\s*no\s*\|\s*$/, 'expected the esc column to be marked non-contractual ("no")');

  const hasClassColumn = content.split('\n').some((l) => l.trim().startsWith('| `class` |'));
  const hasEscalatedColumn = content.split('\n').some((l) => l.trim().startsWith('| `escalated` |'));
  assert.ok(!hasClassColumn, 'no separate `class` column should exist — cls is the contractual materialization');
  assert.ok(!hasEscalatedColumn, 'no separate `escalated` column should exist — esc is the contractual materialization');
});
