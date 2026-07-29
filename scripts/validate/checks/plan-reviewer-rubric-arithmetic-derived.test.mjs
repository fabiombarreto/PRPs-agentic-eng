// @ts-check
/**
 * DERIVED (not hardcoded) regression test for
 * plugins/relay/agents/plan-reviewer.md's "### Logging discipline"
 * rubric[]-length arithmetic paragraph.
 *
 * Motivation: this is the THIRD time in this repo's history that
 * independent sessions each correctly updated this arithmetic paragraph
 * for their OWN addition in isolation, and each was wrong once combined
 * with a sibling lineage — see docs/decisions.md's [2026-07-26]
 * R-COH-ACTION-VALIDATE-CONTRADICTION entry, [2026-07-28]
 * R-COH-VALIDATE-SEARCH-AMBIGUOUS entry, and [2026-07-28] "Merge
 * origin/development" entry, and the four sibling *.test.mjs files the same
 * rubric-reconciliation session updated alongside this new file
 * (figma-track-phase5.test.mjs, figma-visual-first-track-phase3.test.mjs,
 * plan-reviewer-action-validate-contradiction-check.test.mjs [two tests],
 * plan-reviewer-validate-search-ambiguous-check.test.mjs) — every one of
 * which hardcodes a numeral snapshot that goes stale the next time the
 * `#### R-COH-*` heading catalog changes.
 *
 * This file is deliberately NOT one more numeral snapshot. It DERIVES its
 * own expectation from the live file's actual `#### R-COH-*` heading count
 * — the exact recomputation method docs/decisions.md's recurring entries
 * and this reconciliation's own plan (Task 3's VALIDATE command) all use:
 * total headings minus the 4 known-conditional ones = the deterministic
 * count; baseline = `8 + det` to `8 + det + 5`; maximal = baseline_max + 2
 * (design rows) + 1 (exactly one of the two mutually-exclusive phase_scope
 * rows); the ceiling is maximal_max + 1 — then asserts the live prose
 * paragraph agrees with that DERIVED number, never a number this file's own
 * author computed by hand and might get wrong.
 *
 * Adding an Nth deterministic `#### R-COH-*` heading in the future requires
 * NO edit to this file — it will simply keep passing (when the prose is
 * correctly recomputed) or fail loudly (when the prose is not updated to
 * match), which is exactly the property that would have caught all three
 * independently-drifted lineages this reconciliation repairs, at the moment
 * each one drifted rather than only once forcibly combined at merge time.
 *
 * This does not replace the sibling files' exact-numeral/exact-prose
 * assertions updated alongside this file in the same session
 * (EXISTING_TEST_UPDATED; see
 * PRPs/reports/rubric-reconciliation/test-suite.diff's Lifecycle ledger) —
 * those catch wording/phrasing regressions this file's pure-arithmetic scan
 * does not parse (e.g. a rewritten sentence with the right numbers but a
 * dropped clause, or a missing "never extends to" closing sentence
 * entirely). The two are complementary, not duplicates: the sibling files
 * assert "the paragraph currently says X" (a snapshot); this file asserts
 * "the paragraph's numerals agree with what the live heading count implies"
 * (a standing, self-updating invariant).
 *
 * Source plan (description mode — no source PRD; `## Source` holds a
 * verbatim description, not a `.prd.md` path, so there is no `(PRD AC-N)`
 * token on the assertion below, per this repo's shipped `/relay-plan`
 * PRD-less mode contract):
 * PRPs/plans/completed/reconcile-three-independently-authored-extensions-to-plugin.plan.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file that already touches
 * plugins/relay/agents/plan-reviewer.md's rubric[]-length-range paragraph):
 * figma-track-phase5.test.mjs, figma-visual-first-track-phase3.test.mjs,
 * plan-reviewer-action-validate-contradiction-check.test.mjs, and
 * plan-reviewer-validate-search-ambiguous-check.test.mjs all assert
 * hardcoded numeral snapshots (EXISTING_TEST_UPDATED this same session to
 * the new correct snapshot). None of them derives the expected numerals
 * from a live heading count — this dynamic self-consistency property is
 * NEW_TEST_REQUIRED; no existing test in the corpus performs it.
 *
 * Traceability (plan's own `## Acceptance Criteria`):
 *   AC-A2 — "The ### Logging discipline rubric-length arithmetic paragraph
 *     cites a deterministic-check count that is dynamically consistent
 *     with the actual number of #### R-COH-* deterministic section
 *     headings present in the merged file — re-derived from the real
 *     merged content, not copied from either pre-merge branch." The four
 *     sibling files updated this session assert a point-in-time SNAPSHOT of
 *     AC-A2's satisfaction; this file asserts the DYNAMIC property AC-A2
 *     itself describes.
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';

// The 4 conditional (zero-emission-capable) #### R-COH-* checks, named
// explicitly rather than inferred — mirrors the reconciliation plan's own
// Task 3 VALIDATE command's "total - 4" derivation. If a 5th conditional
// check is ever added, this constant (and the design/phase_scope widening
// formula below) is the one deliberate place a human must extend. The
// routine case this file exists to make maintenance-free is adding or
// removing a DETERMINISTIC (fixed, unconditional) check — which is what all
// three drifted lineages this reconciliation repairs actually did.
const CONDITIONAL_CHECK_IDS = [
  'R-COH-DESIGN-SOURCE-MISSING',
  'R-COH-DESIGN-GROUNDED',
  'R-COH-VISUAL-SCOPE-PURITY',
  'R-COH-SENTINEL-RESOLUTION-MISSING',
];

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the sibling *.test.mjs files' helper of the same name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space. Mirrors the sibling *.test.mjs files' helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors the sibling *.test.mjs files' helper
 * of the same name/shape.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const startIdx = content.indexOf(startNeedle);
  if (startIdx === -1) return undefined;
  const endIdx = content.indexOf(endNeedle, startIdx + startNeedle.length);
  return endIdx === -1 ? content.slice(startIdx) : content.slice(startIdx, endIdx);
}

/**
 * Returns the correct English ordinal suffix for a positive integer (1st,
 * 2nd, 3rd, 4th, 11th, 12th, 13th, 21st, ...). Needed because the derived
 * ceiling row number is NOT fixed at authoring time — it grows by one every
 * time a future deterministic #### R-COH-* check is added — so a hardcoded
 * "th" would itself silently go wrong the day the ceiling first lands on a
 * number ending in 1, 2, or 3 (other than the 11/12/13 teens exception).
 * @param {number} n
 * @returns {string}
 */
function ordinalSuffix(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

test('DERIVED: plan-reviewer.md\'s ### Logging discipline rubric[]-length arithmetic is dynamically consistent with the live #### R-COH-* heading count — re-derived here, not hardcoded, so a future heading addition/removal fails loudly instead of silently drifting', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  // 1. Count the ACTUAL #### R-COH-* headings present in the live file.
  const allHeadings = [...content.matchAll(/^#### (R-COH-[A-Z-]+)/gm)].map((m) => m[1]);
  const totalHeadings = allHeadings.length;

  // 2. Every named conditional check must actually be present as a live
  //    heading — a sanity guard on CONDITIONAL_CHECK_IDS itself, not just
  //    an assumed constant divorced from reality.
  for (const id of CONDITIONAL_CHECK_IDS) {
    assert.ok(
      allHeadings.includes(id),
      `expected the known-conditional check "${id}" to be present among the live #### R-COH-* headings — if it was renamed or removed, CONDITIONAL_CHECK_IDS in this test must be updated deliberately, not silently`
    );
  }

  // 3. Derive the deterministic count and the expected row bounds using the
  //    SAME formula plugins/relay/agents/plan-reviewer.md's own reconciliation
  //    Task 3 VALIDATE command (and docs/decisions.md's recurring
  //    recomputation convention) uses: total - 4 known-conditional =
  //    deterministic; baseline = 8 (R1-R8) + deterministic, to baseline + 5
  //    (K=5 pass); maximal = baseline_max + 2 (design rows) + 1 (exactly
  //    one of the two mutually-exclusive phase_scope rows); ceiling =
  //    maximal_max + 1.
  const deterministicCount = totalHeadings - CONDITIONAL_CHECK_IDS.length;
  const baselineMin = 8 + deterministicCount;
  const baselineMax = baselineMin + 5;
  const maximalMax = baselineMax + 3;
  const ceilingRow = maximalMax + 1;

  // 4. Extract the paragraph and confirm its stated numbers agree with the
  //    DERIVED ones — never comparing against a number this test hardcodes.
  const block = sliceBetween(content, 'The total `rubric[]` length per run is', 'When the K=5 pass emits N findings');
  assert.ok(block, 'expected an extractable rubric[] length-range paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(`+ ${deterministicCount} (deterministic R-COH-*)`),
    `expected the paragraph to cite ${deterministicCount} deterministic checks (derived from ${totalHeadings} total #### R-COH-* headings minus the ${CONDITIONAL_CHECK_IDS.length} known-conditional ones), but it did not`
  );
  assert.ok(
    collapsed.includes(`${baselineMin} to ${baselineMax} rows`),
    `expected the derived baseline row-bound "${baselineMin} to ${baselineMax} rows" (8 + ${deterministicCount} deterministic, to +5 for the K=5 pass), but it was not found`
  );
  assert.ok(
    collapsed.includes(`${baselineMin} to ${maximalMax} rows`),
    `expected the derived maximal row-bound "${baselineMin} to ${maximalMax} rows" (baseline max + 2 design rows + 1 phase_scope row), but it was not found`
  );
  assert.ok(
    collapsed.includes(`never extends to a ${ceilingRow}${ordinalSuffix(ceilingRow)} row`),
    `expected the derived ceiling claim "never extends to a ${ceilingRow}${ordinalSuffix(ceilingRow)} row", but it was not found`
  );
});
