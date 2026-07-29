// @ts-check
/**
 * Content-invariant tests for the "reconcile-three-independently-authored-
 * extensions-to-plugin" description-mode plan: `git merge
 * origin/development` into `feature/figma-implementation-track`, resolving
 * three conflict hunks (the additive `#### R-COH-*` section-header union
 * and the `## review.jsonl format` worked-example `rubric[]` array union in
 * plugins/relay/agents/plan-reviewer.md — both covered by this same
 * session's EXISTING_TEST_UPDATED fixes to
 * plan-reviewer-action-validate-contradiction-check.test.mjs's AC-A4 test
 * and plan-reviewer-validate-search-ambiguous-check.test.mjs's AC-A8 test,
 * NOT re-asserted here — plus two additive hunks in
 * plugins/relay/agents/plan-writer.md and one append-only hunk in
 * docs/decisions.md), then appending a new docs/decisions.md entry
 * documenting the re-derived rubric[]-length arithmetic.
 *
 * Source plan (description mode — no source PRD; `## Source` holds a
 * verbatim description, not a `.prd.md` path, so there is no `(PRD AC-N)`
 * token on any assertion below, per this repo's shipped `/relay-plan`
 * PRD-less mode contract):
 * PRPs/plans/completed/reconcile-three-independently-authored-extensions-to-plugin.plan.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file that touches
 * plugins/relay/agents/plan-writer.md, plugins/relay/agents/plan-reviewer.md,
 * or docs/decisions.md):
 *   - plugins/relay/agents/plan-writer.md's Hard Constraint #11 forward-
 *     pointer sentence, its Step 4.4 item 11 diff-scope-and-prohibition-
 *     idiom wrong/right example block, and its "Unscoped or
 *     prohibition-blind forbidden-reference greps" anti-pattern bullet —
 *     all three unioned in from origin/development by this merge's Task 5
 *     — are referenced by NO existing test in the corpus (confirmed by
 *     reading figma-visual-first-track-phase1/2/3/4.test.mjs and
 *     figma-track-phase1-7.test.mjs's own PLAN_WRITER_PATH-reading tests:
 *     all target Hard Constraints #12/#13 and other, unrelated sections).
 *     NEW_TEST_REQUIRED throughout.
 *   - The new [2026-07-28] "Merge origin/development" docs/decisions.md
 *     entry did not exist before this merge — NEW_TEST_REQUIRED, mirroring
 *     the established sibling pattern (plan-reviewer-action-validate-
 *     contradiction-check.test.mjs's AC-A8 test for the [2026-07-26] entry;
 *     plan-reviewer-validate-search-ambiguous-check.test.mjs's AC-A9 test
 *     for the [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry).
 *   - The re-derived rubric[]-length arithmetic paragraph's own numerals
 *     (presence side) are EXISTING_TEST_COVERS via this same session's
 *     EXISTING_TEST_UPDATED fixes to figma-track-phase5.test.mjs,
 *     figma-visual-first-track-phase3.test.mjs, and
 *     plan-reviewer-action-validate-contradiction-check.test.mjs's AC-A5
 *     test — not re-asserted here. The DYNAMIC re-derivation property is
 *     separately covered by this same session's new
 *     plan-reviewer-rubric-arithmetic-derived.test.mjs. The `#### R-COH-*`
 *     heading completeness/order property (all 9 deterministic + all 4
 *     conditional, 13 total) is EXISTING_TEST_COVERS via
 *     plan-reviewer-action-validate-contradiction-check.test.mjs's AC-A4
 *     test — not re-asserted here either.
 *   - Not covered by this file, and deliberately out of scope: the
 *     substantive pass/fail LOGIC of R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE
 *     itself (its (a)/(b) fail conditions in plan-reviewer.md) has zero
 *     test coverage anywhere in this corpus. That gap predates this merge
 *     (the check shipped on origin/development on 2026-07-23 without an
 *     accompanying test-writer/test-reviewer session ever landing one) and
 *     is not created by it — the merge only brings pre-existing,
 *     already-approved prose into this tree. None of this reconciliation
 *     plan's own AC-A1 through AC-A7 requires unit-testing that logic
 *     (AC-A1 requires only that the section HEADING survive the merge,
 *     which the heading-completeness test above already covers), so
 *     authoring it here would be inventing a test without AC grounding.
 *     Flagged here as an observation for a future, dedicated session
 *     rather than silently absorbed into this one's scope.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed (all rows, 0 K=5 findings, attempt 2), IMPLEMENTED plan:
 * PRPs/plans/completed/reconcile-three-independently-authored-extensions-to-plugin.plan.md
 * (merge commit 3555b73, follow-up fix ba78042).
 *
 * Traceability (plan's own `## Acceptance Criteria`, description mode,
 * AC-A1 through AC-A7, no PRD AC-N token on any item):
 *
 *   AC-A1 (partial — the review.jsonl/heading-completeness clauses are
 *     EXISTING_TEST_COVERS elsewhere, see above; the "zero git conflict
 *     markers remaining anywhere in the file" clause is NEW_TEST_REQUIRED,
 *     asserted below as a standing regression guard across all three
 *     touched files, not just a one-time check).
 *   AC-A3, AC-A4 (partial — conflict-marker absence only; the full
 *     "chronological union, no entry lost" and "both additive hunks
 *     resolved as the union" properties are one-time merge-completion
 *     facts already gated by the plan's own Task 6/Task 5 VALIDATE scripts
 *     plus human/code-review verification, not re-tested here as an
 *     ongoing node:test regression surface — decisions.md is an
 *     append-only audit log, not a corpus this repo's convention tests
 *     entry-by-entry for historical completeness).
 *   AC-A4 (the plan-writer.md content-survival clause) — the three pieces
 *     of forbidden-reference-grep authoring guidance unioned in from
 *     origin/development (Hard Constraint #11 pointer, Step 4.4 item 11
 *     wrong/right example, anti-pattern bullet) are present verbatim.
 *   AC-A7 — the new dated docs/decisions.md entry records the re-derived
 *     arithmetic and explicitly supersedes both prior entries' numerals,
 *     positioned as the file's last real entry.
 *
 *   Not tested here (recorded, not silently dropped): AC-A2's dynamic
 *     re-derivation property → plan-reviewer-rubric-arithmetic-derived.test.mjs
 *     (this same session). AC-A5 (merge commit topology + `npm run
 *     validate` exit code) and AC-A6 (Implementer authored zero test-file
 *     changes) are one-time infra/process facts already verified by Task 8's
 *     own VALIDATE and by code-review's R-X check respectively — neither is
 *     an "observable contract" of the agent prompt files this corpus's
 *     node:test convention regression-tests on an ongoing basis.
 *
 * Run: node --test scripts/validate/checks/rubric-reconciliation.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';
const PLAN_WRITER_PATH = 'plugins/relay/agents/plan-writer.md';
const DECISIONS_PATH = 'docs/decisions.md';

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
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence. BEFORE collapsing,
 * strips any leading blockquote (`>`) or bash-comment (`#`) continuation
 * marker from the start of each line — otherwise a stray literal "> " or
 * "# " gets inserted mid-sentence wherever such a line wraps in the source
 * prose being asserted against (e.g. plan-writer.md's Step 4.4 item 11
 * "wrong/right" example block, whose WRONG-case explanatory sentences wrap
 * across multiple `#`-prefixed lines inside a fenced bash comment). Mirrors
 * figma-track-phase5.test.mjs's `collapseWs` helper (which strips the
 * analogous `>` blockquote marker), extended here to also strip `#` since
 * the content this file asserts against includes wrapped bash comments, not
 * just wrapped blockquotes. The per-line strip only touches a line's
 * LEADING `>`/`#` run (never an inline `>`/`#` mid-sentence — e.g. an
 * inline `` `#### R-COH-*` `` code-span, or a markdown heading used only as
 * a sliceBetween boundary — both stay untouched), so non-marker content is
 * unaffected.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  const withoutLeadingMarkers = str
    .split('\n')
    .map((line) => line.replace(/^\s*>+\s?/, '').replace(/^\s*#+\s?/, ''))
    .join('\n');
  return withoutLeadingMarkers.replace(/\s+/g, ' ').trim();
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

// ---------------------------------------------------------------------------
// AC-A1, AC-A3, AC-A4 — zero conflict-marker regression guard across all
// three files this merge touched.
// ---------------------------------------------------------------------------

test('AC-A1, AC-A3, AC-A4: zero git conflict markers remain in any of the three files this merge touched (plan-reviewer.md, plan-writer.md, docs/decisions.md) — a standing regression guard beyond the plan\'s own one-time Task 1/8 VALIDATE scripts', () => {
  const conflictMarkerPattern = /^(<{7}|={7}|>{7})( |$)/m;

  for (const path of [PLAN_REVIEWER_PATH, PLAN_WRITER_PATH, DECISIONS_PATH]) {
    const content = readRepoFile(path);
    assert.ok(!conflictMarkerPattern.test(content), `expected zero git conflict markers remaining in ${path}`);
  }
});

// ---------------------------------------------------------------------------
// AC-A4 — plan-writer.md's two additive hunks (forbidden-reference-grep
// authoring guidance unioned in from origin/development) survive the merge.
// ---------------------------------------------------------------------------

test('AC-A4: plan-writer.md Hard Constraint #11 (validation commands must be able to fail) carries its forward-pointer to Step 4.4 item 11 and to plan-reviewer.md\'s R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE check, unioned in from origin/development', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    '11. **Validation commands must be able to fail',
    '12. **`phase_scope: visual` task purity'
  );
  assert.ok(block, 'expected an extractable Hard Constraint #11 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('See Step 4.4 item 11 for the full wrong'),
    'expected the forward-pointer to Step 4.4 item 11'
  );
  assert.ok(
    collapsed.includes('the diff-scope and prohibition-idiom traps that apply specifically to forbidden-reference greps'),
    'expected the diff-scope-and-prohibition-idiom-traps framing'
  );
  assert.ok(
    collapsed.includes('enforced by `plan-reviewer`\'s R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE check.'),
    'expected the enforcement cross-reference to R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE'
  );
});

test('AC-A4: plan-writer.md Step 4.4 item 11 carries the diff-scope-and-prohibition-idiom wrong/right example block for forbidden-reference greps, unioned in from origin/development — the whole-file-grep WRONG case, the prohibition-idiom-blind WRONG case, and the diff-scoped-plus-MUST-NOT-appear-excluding RIGHT case', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    '**Diff-scope and prohibition-idiom traps (mandatory when a',
    'Any forbidden-reference VALIDATE command that skips either the'
  );
  assert.ok(block, 'expected an extractable diff-scope-and-prohibition-idiom traps block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(collapsed.includes('false-positives on pre-existing prose'), 'expected the whole-file-grep WRONG case framing');
  assert.ok(collapsed.includes('grep -q "\\.claude/PRPs" docs/decisions.md'), 'expected the whole-file-grep WRONG example command');
  assert.ok(
    collapsed.includes('still false-positives on this repo\'s own standard quoted-prohibition sentence'),
    'expected the diff-scoped-but-prohibition-idiom-blind WRONG case'
  );
  assert.ok(collapsed.includes('grep -qv "MUST NOT appear"'), 'expected the RIGHT case\'s MUST-NOT-appear exclusion');
  assert.ok(
    collapsed.includes('only a real newly-introduced write-target reference fails'),
    'expected the RIGHT case\'s framing'
  );
});

test('AC-A4: plan-writer.md registers the "Unscoped or prohibition-blind forbidden-reference greps" anti-pattern bullet, unioned in from origin/development, cross-referencing Step 4.4 item 11 and R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes('**Unscoped or prohibition-blind forbidden-reference greps.**'),
    'expected the anti-pattern bullet heading'
  );
  assert.ok(
    collapsed.includes('must grep the `git diff` output, not the whole file'),
    'expected the diff-scoping requirement'
  );
  assert.ok(
    collapsed.includes('must exclude the standard `MUST NOT appear` quoted-prohibition idiom'),
    'expected the prohibition-idiom exclusion requirement'
  );
  assert.ok(
    collapsed.includes('R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE rejects both gaps.'),
    'expected the enforcement cross-reference'
  );
});

// ---------------------------------------------------------------------------
// AC-A7 — the new docs/decisions.md entry records the re-derived
// arithmetic and explicitly supersedes both prior entries.
// ---------------------------------------------------------------------------

test('AC-A7: docs/decisions.md records a new [2026-07-28] "Merge origin/development" entry with the re-derived 17-to-22/17-to-25 arithmetic and the 13-heading/9-deterministic count, explicitly superseding BOTH the [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry\'s numerals AND the [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION entry\'s numerals, positioned as the file\'s last real entry immediately before the template comment', () => {
  const content = readRepoFile(DECISIONS_PATH);

  assert.ok(
    content.includes('## [2026-07-28] Merge `origin/development`: R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE joins the deterministic catalog'),
    'expected the new merge-reconciliation decision heading'
  );

  const block = sliceBetween(content, '## [2026-07-28] Merge `origin/development`', '<!-- Template for future entries:');
  assert.ok(block, 'expected an extractable merge-reconciliation entry block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(collapsed.includes('9 deterministic'), 'expected the re-derived 9-deterministic-checks count');
  assert.ok(collapsed.includes('13 `#### R-COH-*` headings total'), 'expected the re-derived 13-total-headings count');
  assert.ok(collapsed.includes('17 to 22 rows'), 'expected the re-derived baseline numeral');
  assert.ok(collapsed.includes('17 to 25 rows'), 'expected the re-derived maximal numeral');
  assert.ok(collapsed.includes('never extends to a 26th row'), 'expected the re-derived ceiling wording');
  assert.ok(
    collapsed.includes('This entry\'s numerals supersede the "16 to 21 rows"/"16 to 24 rows" numerals recorded in the [2026-07-28] entry above'),
    'expected the explicit supersession statement naming the prior [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry'
  );
  assert.ok(
    collapsed.includes('the "15 to 20 rows"/"15 to 23 rows" numerals recorded in the [2026-07-26] entry above'),
    'expected the explicit supersession statement also naming the [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION entry'
  );

  // Positioning: the new entry must be the file's LAST real entry — after
  // the [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry (itself the
  // file's previous last real entry) and before the template comment.
  const searchAmbiguousIdx = content.indexOf('## [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS');
  const mergeEntryIdx = content.indexOf('## [2026-07-28] Merge `origin/development`');
  const templateIdx = content.indexOf('<!-- Template for future entries:');
  assert.notEqual(searchAmbiguousIdx, -1, 'expected the existing [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry');
  assert.notEqual(templateIdx, -1, 'expected the template-for-future-entries comment');
  assert.ok(
    searchAmbiguousIdx < mergeEntryIdx,
    'the new merge entry must be positioned after the [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry'
  );
  assert.ok(mergeEntryIdx < templateIdx, "the new merge entry must be positioned before the template comment, as the file's last real entry");
});
