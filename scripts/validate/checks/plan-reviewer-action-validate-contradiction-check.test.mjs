// @ts-check
/**
 * Content-invariant tests for the `plan-reviewer-action-validate-contradiction-check`
 * description-mode plan: adds a 7th FIXED (unconditional, never
 * zero-emission) deterministic check, `R-COH-ACTION-VALIDATE-CONTRADICTION`,
 * to `plugins/relay/agents/plan-reviewer.md`'s R-COH-* coherence layer —
 * positioned immediately after `R-COH-VALIDATE-ALWAYS-PASS` and immediately
 * before `R-COH-DESIGN-SOURCE-MISSING` — that detects when a single task's
 * own `**ACTION**:` prose contradicts that SAME task's own `**VALIDATE**:`
 * command (insert-a-literal-vs-assert-zero-count, and the inverse,
 * remove-a-literal-vs-assert-presence). Also updates the cross-cutting
 * `### Logging discipline` rubric[]-length arithmetic paragraph for the
 * 6->7 fixed-check shift, adds a matching `## review.jsonl format` example
 * row, and records the decision (including its explicit numeral
 * supersession of the [2026-07-09] entry) in `docs/decisions.md`.
 *
 * Source plan (description mode — no source PRD; `## Source` holds a
 * verbatim description, not a `.prd.md` path, so there is no `(PRD AC-N)`
 * token on any assertion below, per this repo's shipped `/relay-plan`
 * PRD-less mode contract):
 * PRPs/plans/completed/plan-reviewer-action-validate-contradiction-check.plan.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file that already touches
 * plugins/relay/agents/plan-reviewer.md or docs/decisions.md):
 *   - scripts/validate/checks/figma-visual-first-track-phase3.test.mjs
 *     (~line 456) and scripts/validate/checks/figma-track-phase5.test.mjs
 *     (~line 309) both already assert the FULL verbatim `### Logging
 *     discipline` rubric[]-length-range sentences, for THEIR OWN phases'
 *     concerns (the `phase_scope`-row widening and the design_source-row
 *     widening, respectively) — both went stale under this phase's Task 2
 *     numeral shift (14-19/14-22/23rd -> 15-20/15-23/24th) and were fixed
 *     in place THIS session as `EXISTING_TEST_UPDATED` (see those two
 *     files' own new Lifecycle-update comment paragraphs, and this
 *     session's Lifecycle ledger in
 *     PRPs/reports/plan-reviewer-action-validate-contradiction-check/test-suite.diff).
 *     Re-asserting those same long verbatim sentences again here would be a
 *     same-input, same-assertion duplicate (R-DUPLICATE) of already-green
 *     tests. This file's own AC-A5 arithmetic test therefore asserts only
 *     the short numeral/phrase tokens this phase's own Task 2 VALIDATE
 *     command greps for (`8 (deterministic`, `16 to 21 rows`,
 *     `16 to 24 rows`, `25th row`, `Each of the four conditional rows is
 *     independently zero-emission`) — a Level-3-Validation-Command-made-
 *     permanent smoke check, not a re-assertion of the full sentences.
 *   - Neither of those two files, nor any other file in this directory,
 *     reads the new check's OWN heading text, its position relative to
 *     `R-COH-VALIDATE-ALWAYS-PASS`/`R-COH-DESIGN-SOURCE-MISSING`, its
 *     unconditional/non-zero-emission framing, either of its two fail
 *     conditions, its own Known-limitation paragraph, its JSONL example
 *     row, or docs/decisions.md's new [2026-07-26] entry — every property
 *     of those is virgin territory; NEW_TEST_REQUIRED throughout this file.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED plan:
 * PRPs/plans/completed/plan-reviewer-action-validate-contradiction-check.plan.md
 *
 * Traceability (plan's own `## Acceptance Criteria` — description mode,
 * AC-A<i> only, AC-A1 through AC-A8, no PRD AC-N token on any item):
 *
 *   AC-A1 — insert-vs-reject fail condition (a): an ACTION-inserted
 *     quoted/backticked literal whose SAME task's VALIDATE asserts a zero
 *     count of that literal in that file.
 *   AC-A2 — remove-vs-require fail condition (b), the inverse: an
 *     ACTION-removed literal whose SAME task's VALIDATE requires its
 *     presence.
 *   AC-A3 — the vacuous-pass / unconditional-emission contract: exactly one
 *     `passed: true` row on every run when no task matches either shape,
 *     never zero-emission (the property distinguishing this check from its
 *     four `figma_track`/`phase_scope`-gated conditional siblings).
 *   AC-A4 — heading presence and exact position: immediately after
 *     `R-COH-VALIDATE-ALWAYS-PASS`, immediately before
 *     `R-COH-DESIGN-SOURCE-MISSING`; plus the full 11-heading order/count
 *     (7 fixed then 4 conditional).
 *   AC-A5 — the `### Logging discipline` arithmetic shift: 7 fixed checks,
 *     15-to-20-row baseline, 15-to-23-row maximal, "24th row", "four
 *     conditional rows" wording preserved.
 *   AC-A6 — the forbidden literal `14 to 23` stays absent from
 *     plugins/relay/agents/plan-reviewer.md (count 0) — the standing
 *     regression guard against the exact defect this new check itself now
 *     catches.
 *   AC-A7 — the `## review.jsonl format` example block gains a matching
 *     `R-COH-ACTION-VALIDATE-CONTRADICTION` row immediately after the
 *     existing `R-COH-VALIDATE-ALWAYS-PASS` row.
 *   AC-A8 — docs/decisions.md records a new `[2026-07-26]` entry that
 *     explicitly states it supersedes the "rubric[] length 14-19" numeral
 *     recorded in the [2026-07-09] entry's "Areas affected" line.
 *   (structural completeness, Task 1's own VALIDATE) — the check's own
 *     "Known limitation (recorded, not blocking)" paragraph is present,
 *     matching the shape already used by its `R-COH-VISUAL-SCOPE-PURITY` /
 *     `R-COH-SENTINEL-RESOLUTION-MISSING` siblings.
 *
 * Lifecycle update (2026-07-28, EXISTING_TEST_UPDATED, performed by the
 * rubric-reconciliation test-writer session, test-after per
 * docs/context/methodology.md): the standalone
 * "reconcile-three-independently-authored-extensions-to-plugin" description-
 * mode plan (no source PRD;
 * PRPs/plans/completed/reconcile-three-independently-authored-extensions-to-plugin.plan.md)
 * merged origin/development into feature/figma-implementation-track,
 * bringing in origin's own R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE check as a
 * 9th deterministic check overall, landed by the merge AFTER the four
 * figma_track/phase_scope conditional checks rather than immediately after
 * this file's own R-COH-VALIDATE-SEARCH-AMBIGUOUS — so "fixed checks
 * first, conditional checks after" no longer holds file-wide for this 9th
 * check specifically, only for the original 8. Two of this file's own
 * tests went stale:
 *
 *   - AC-A4 (heading count/order): the merge raises the total from 12 to
 *     13 `#### R-COH-*` headings, and the merged-in 9th fixed check landed
 *     AFTER the 4 conditional ones (not before them), so the test's own
 *     "first 8 fixed, remaining 4 conditional" two-slice structure no
 *     longer describes the file. Confirmed by directly reading the
 *     post-merge plan-reviewer.md content and counting its `#### R-COH-*`
 *     headings (13, in the exact order: the original 8 fixed, then the 4
 *     conditional, then R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE). Anti-weakening
 *     check: the fix below *strengthens* the assertion from a two-slice
 *     partial-order check to a single exact-order check over all 13
 *     headings — strictly more discriminative than the original, not less;
 *     no coverage is dropped, only a false "fixed checks first file-wide"
 *     framing is corrected to match the real, code-reviewed merged
 *     structure.
 *   - AC-A5 (rubric[] arithmetic): shifts every numeral the same way this
 *     session shifted them in figma-track-phase5.test.mjs and
 *     figma-visual-first-track-phase3.test.mjs (see those files' own
 *     Lifecycle-update paragraphs): `8 (deterministic` becomes
 *     `9 (deterministic`, `16 to 21 rows` becomes `17 to 22 rows`,
 *     `16 to 24 rows` becomes `17 to 25 rows`, and `25th row` becomes
 *     `26th row`. The "four conditional rows" wording is UNCHANGED (the
 *     merged-in check is FIXED, not a fifth conditional row).
 *     Anti-weakening check: the fix below *replaces* the four now-stale
 *     numeral literals (plus the test title's own numerals, matching this
 *     file's own established convention) with the new ones matching the
 *     current wording of the SAME claim; no assertion is dropped, no scope
 *     is narrowed.
 *
 * The stale "AC-A4 (full order/count)" section comment above the AC-A4
 * test (which still read "11 total... 7 fixed" from before even the
 * 2026-07-28 R-COH-VALIDATE-SEARCH-AMBIGUOUS shipment) is also corrected
 * in place — a pre-existing hygiene defect, not itself a behavioral
 * regression, fixed opportunistically while this exact block was already
 * being touched. Full justification for both fixes recorded in
 * PRPs/reports/rubric-reconciliation/test-suite.diff's Lifecycle ledger.
 *
 * Lifecycle update (2026-08-07, EXISTING_TEST_UPDATED, performed by the
 * plan-review-materiality Phase 1 test-writer session, test-after per
 * docs/context/methodology.md): PRPs/plans/completed/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md
 * (source PRD PRPs/prds/plan-review-materiality.prd.md) added an additive
 * `"class": "blocking" | "advisory"` field to every row of the
 * `## review.jsonl format` worked example in plan-reviewer.md, including
 * the `R-COH-VALIDATE-ALWAYS-PASS` and `R-COH-ACTION-VALIDATE-CONTRADICTION`
 * rows this file's own AC-A7 test pins byte-exactly. The two-field shape
 * (`{ "id": "...", "passed": true }`) this test asserted no longer matches
 * the live three-field rows (`{ "id": "...", "passed": true, "class":
 * "blocking" }`), so the AC-A7 test's two `content.includes(...)` pins went
 * stale. Confirmed by directly reading the post-implementation
 * plan-reviewer.md content. Anti-weakening check: the fix below *extends*
 * both pinned substrings to include the new `, "class": "blocking"` segment
 * so they again pin the SAME two rows' SAME adjacency byte-exactly — no
 * assertion is dropped, no scope is narrowed, only the literal byte shape
 * the additive field changed is followed. Full justification recorded in
 * PRPs/reports/plan-review-materiality/test-suite.diff's Lifecycle ledger.
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';
const DECISIONS_PATH = 'docs/decisions.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-visual-first-track-phase3.test.mjs's helper of the same
 * name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-visual-first-track-phase3.test.mjs's
 * helper of the same name/shape.
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
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence. Mirrors
 * figma-visual-first-track-phase3.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-A3, AC-A4 — heading presence, exact position, and the unconditional /
// non-zero-emission framing that distinguishes this check from its four
// figma_track/phase_scope-gated conditional siblings.
// ---------------------------------------------------------------------------

test('AC-A3, AC-A4: plan-reviewer.md registers #### R-COH-ACTION-VALIDATE-CONTRADICTION positioned immediately after R-COH-VALIDATE-ALWAYS-PASS and immediately before R-COH-DESIGN-SOURCE-MISSING, framed as unconditional/always-emitted (never zero-emission) with no "Zero-emission branch" clause of its own, and emitting passed:true vacuously when no task matches either contradiction shape', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const alwaysPassIdx = content.indexOf('#### R-COH-VALIDATE-ALWAYS-PASS');
  const contradictionIdx = content.indexOf('#### R-COH-ACTION-VALIDATE-CONTRADICTION');
  const designSourceIdx = content.indexOf('#### R-COH-DESIGN-SOURCE-MISSING');
  assert.notEqual(alwaysPassIdx, -1, 'expected the existing R-COH-VALIDATE-ALWAYS-PASS heading');
  assert.notEqual(contradictionIdx, -1, 'expected the new R-COH-ACTION-VALIDATE-CONTRADICTION heading');
  assert.notEqual(designSourceIdx, -1, 'expected the existing R-COH-DESIGN-SOURCE-MISSING heading');
  assert.ok(alwaysPassIdx < contradictionIdx, 'R-COH-ACTION-VALIDATE-CONTRADICTION must be positioned after R-COH-VALIDATE-ALWAYS-PASS');
  assert.ok(contradictionIdx < designSourceIdx, 'R-COH-ACTION-VALIDATE-CONTRADICTION must be positioned before R-COH-DESIGN-SOURCE-MISSING');

  const block = sliceBetween(content, '#### R-COH-ACTION-VALIDATE-CONTRADICTION', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-ACTION-VALIDATE-CONTRADICTION block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**Unconditional — always emitted, never zero-emission.** Unlike the four `figma_track`/`phase_scope`-gated conditional checks below, every plan has `### Task <i>` entries carrying `**ACTION**:` and `**VALIDATE**:` content, and there is no project- or plan-level declaration this check could gate on — so it always contributes exactly one row to `rubric[]`.'
    ),
    'expected the unconditional/always-emitted framing sentence'
  );
  assert.ok(
    collapsed.includes("Its nearest sibling in this respect is `R-COH-VALIDATE-ALWAYS-PASS`, also unconditional."),
    'expected the nearest-sibling cross-reference to R-COH-VALIDATE-ALWAYS-PASS'
  );
  assert.equal(
    block.includes('Zero-emission branch'),
    false,
    'expected NO "Zero-emission branch" clause — unlike its four conditional siblings, this check has no declaration to gate on'
  );
  assert.ok(
    collapsed.includes(
      'Otherwise (no offending task found — including vacuously, on a plan with zero tasks matching this shape at all) → `{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }`.'
    ),
    'expected the vacuous-pass otherwise-branch line'
  );
});

// ---------------------------------------------------------------------------
// AC-A1, AC-A2 — the two tractable contradiction shapes: insert-vs-reject
// and its inverse, remove-vs-require.
// ---------------------------------------------------------------------------

test('AC-A1: plan-reviewer.md\'s fail condition (a) fires when a task\'s ACTION inserts a quoted/backticked literal into a file and that SAME task\'s VALIDATE asserts the literal absent/zero-count in that SAME file, quoting the ACTION fragment, VALIDATE fragment, and literal verbatim in reason', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-ACTION-VALIDATE-CONTRADICTION', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-ACTION-VALIDATE-CONTRADICTION block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**(a) Insert-vs-reject contradiction.** FAILS when that SAME task\'s `**VALIDATE**:` command(s) check the SAME file for the SAME literal and assert it must be ABSENT or occur zero times'
    ),
    "expected fail condition (a)'s exact framing"
  );
  assert.ok(
    collapsed.includes(
      'because literal compliance with the ACTION (inserting the literal) would make the task\'s own VALIDATE fail. `reason` quotes the offending ACTION fragment, the offending VALIDATE fragment, and the contradicting literal, verbatim.'
    ),
    'expected the reason-quotes-both-fragments-and-the-literal clause for condition (a)'
  );
});

test('AC-A2: plan-reviewer.md\'s fail condition (b), the inverse, fires when a task\'s ACTION removes/deletes/strips a quoted/backticked literal from a file while that SAME task\'s VALIDATE requires/asserts the literal\'s presence in that SAME file', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-ACTION-VALIDATE-CONTRADICTION', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-ACTION-VALIDATE-CONTRADICTION block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**(b) Remove-vs-require contradiction (the inverse).** FAILS when a task\'s ACTION instead instructs REMOVING, DELETING, or STRIPPING a quoted/backticked literal from a file, while that SAME task\'s VALIDATE requires or asserts the literal\'s PRESENCE in that SAME file'
    ),
    "expected fail condition (b)'s exact framing"
  );
  assert.ok(
    collapsed.includes(
      'literal compliance with the ACTION would make the VALIDATE fail for the opposite reason. `reason` quotes both fragments and the literal, verbatim, the same way as (a).'
    ),
    'expected the reason-quotes-both-fragments clause for condition (b), cross-referencing (a)'
  );
});

test('plan-reviewer.md evaluates each task independently (never comparing across tasks), and a task with no quoted/backticked ACTION literal, or whose VALIDATE targets a different file/literal than its own ACTION names, trips neither condition', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-ACTION-VALIDATE-CONTRADICTION', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-ACTION-VALIDATE-CONTRADICTION block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('Evaluate each task independently — this check never compares across tasks'),
    'expected the per-task-independent-evaluation clause'
  );
  assert.ok(
    collapsed.includes(
      'A task with no quoted/backticked literal in its ACTION, or whose VALIDATE targets a different file or a different literal than the one named in its own ACTION, does not trip either condition for that task.'
    ),
    'expected the neither-condition-trips exemption clause'
  );
});

// ---------------------------------------------------------------------------
// Structural completeness (Task 1's own VALIDATE) — the Known-limitation
// paragraph, matching the shape already used by R-COH-VISUAL-SCOPE-PURITY /
// R-COH-SENTINEL-RESOLUTION-MISSING.
// ---------------------------------------------------------------------------

test('plan-reviewer.md\'s R-COH-ACTION-VALIDATE-CONTRADICTION closes with a "Known limitation (recorded, not blocking)" paragraph stating it is a heuristic textual scan (no Bash tool, cannot execute the VALIDATE command), can miss obfuscated contradictions or false-positive on incidental matches, and that real enforcement remains the Implementer running the VALIDATE command', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-ACTION-VALIDATE-CONTRADICTION', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-ACTION-VALIDATE-CONTRADICTION block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**Known limitation (recorded, not blocking):** this is a heuristic textual scan over plan-authored prose, not real execution — `plan-reviewer` has no `Bash` tool and cannot execute a task\'s VALIDATE command to observe its real exit code'
    ),
    'expected the known-limitation opening: heuristic scan, no Bash tool'
  );
  assert.ok(
    collapsed.includes(
      'it can both miss an obfuscated or paraphrased contradiction (the literal reworded, or split across a sentence) and false-positive on an incidental match.'
    ),
    'expected the miss/false-positive clause'
  );
  assert.ok(
    collapsed.includes(
      'It is a plan-authoring-time gate, not the final safety net; the real enforcement remains the Implementer actually running the task\'s own VALIDATE command.'
    ),
    'expected the plan-authoring-time-gate-not-final-safety-net closing clause'
  );
});

// ---------------------------------------------------------------------------
// AC-A7 — the ## review.jsonl format worked example gains a matching row.
// ---------------------------------------------------------------------------

test('AC-A7: plan-reviewer.md\'s ## review.jsonl format example JSON block includes a new R-COH-ACTION-VALIDATE-CONTRADICTION passed:true row immediately after the existing R-COH-VALIDATE-ALWAYS-PASS row', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  assert.ok(
    content.includes('{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true, "class": "blocking" }'),
    'expected the new JSONL example row (now carrying the additive class field)'
  );
  assert.ok(
    content.includes(
      '{ "id": "R-COH-VALIDATE-ALWAYS-PASS", "passed": true, "class": "blocking" },\n    { "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true, "class": "blocking" }'
    ),
    'expected the new row positioned immediately after the existing R-COH-VALIDATE-ALWAYS-PASS row, with no other row between them (both now carrying the additive class field)'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (full order/count) — the file carries exactly 14 total
// #### R-COH-* deterministic-check headings: the original 8 fixed
// (unconditional) checks, then the 4 figma_track/phase_scope-gated
// conditional checks, then two further fixed checks appended at the tail
// (R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE, merged in from origin/development
// by the rubric-reconciliation plan, and R-COH-VALIDATE-PATTERN-UNGROUNDED,
// added 2026-08-04) — "fixed checks first, conditional checks after" (per
// docs/decisions.md's [2026-07-26] entry) still holds for the original 8,
// but no longer holds file-wide once the two tail-appended fixed checks
// are counted.
// ---------------------------------------------------------------------------

test('AC-A4: plan-reviewer.md carries exactly 14 total #### R-COH-* deterministic-check headings in this exact merged order — the original 8 fixed checks, then the 4 conditional checks, then the two tail-appended fixed checks R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE and R-COH-VALIDATE-PATTERN-UNGROUNDED', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const headingMatches = [...content.matchAll(/^#### (R-COH-[A-Z-]+)/gm)].map((m) => m[1]);

  assert.equal(
    headingMatches.length,
    14,
    `expected exactly 14 total #### R-COH-* headings (10 fixed + 4 conditional), found ${headingMatches.length}: ${headingMatches.join(', ')}`
  );

  const expectedOrder = [
    'R-COH-TASK-AC-MISSING',
    'R-COH-FILES-UNTOUCHED',
    'R-COH-VALIDATE-FRAMEWORK-MISMATCH',
    'R-COH-PATTERN-SOURCE-MISSING',
    'R-COH-MANDATORY-READING-MISSING',
    'R-COH-VALIDATE-ALWAYS-PASS',
    'R-COH-ACTION-VALIDATE-CONTRADICTION',
    'R-COH-VALIDATE-SEARCH-AMBIGUOUS',
    'R-COH-DESIGN-SOURCE-MISSING',
    'R-COH-DESIGN-GROUNDED',
    'R-COH-VISUAL-SCOPE-PURITY',
    'R-COH-SENTINEL-RESOLUTION-MISSING',
    'R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE',
    'R-COH-VALIDATE-PATTERN-UNGROUNDED',
  ];

  assert.deepEqual(
    headingMatches,
    expectedOrder,
    'expected exactly these 14 headings in this exact order — the merge appended R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE after the 4 conditional checks, and R-COH-VALIDATE-PATTERN-UNGROUNDED was appended after that, so file-wide "fixed checks first" no longer holds for these two checks specifically (it still holds for the original 8)'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 — standing regression guard: the forbidden literal never returns.
// ---------------------------------------------------------------------------

test('AC-A6 (regression guard): the forbidden literal "14 to 23" is absent from plugins/relay/agents/plan-reviewer.md (count 0) — the exact self-contradiction shape R-COH-ACTION-VALIDATE-CONTRADICTION itself now exists to catch', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const occurrences = content.split('14 to 23').length - 1;
  assert.equal(occurrences, 0, `expected zero occurrences of the forbidden literal "14 to 23", found ${occurrences}`);
});

// ---------------------------------------------------------------------------
// AC-A5 — the ### Logging discipline rubric[]-length arithmetic shift.
// A short-token smoke check only (mirrors this phase's own Task 2 VALIDATE
// command greps) — the FULL verbatim sentences are already covered by
// figma-visual-first-track-phase3.test.mjs and figma-track-phase5.test.mjs
// (both fixed this same session; see this file's header comment).
// ---------------------------------------------------------------------------

test('AC-A5: plan-reviewer.md\'s ### Logging discipline paragraph reads 10 fixed deterministic checks, an 18-to-23-row baseline, an 18-to-26-row maximal case, "27th row", and preserves the "Each of the four conditional rows is independently zero-emission" wording verbatim (the merged-in check is FIXED, not a fifth conditional row)', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, 'The total `rubric[]` length per run is', 'When the K=5 pass emits N findings');
  assert.ok(block, 'expected an extractable rubric[] length-range paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('8 (R1–R8) + 10 (deterministic R-COH-*) + ≤5 (K=5 pass) = 18 to 23 rows'),
    'expected the updated baseline arithmetic (10 fixed checks, 18 to 23 rows)'
  );
  assert.ok(collapsed.includes('18 to 26 rows'), 'expected the updated 18-to-26-row maximal case');
  assert.ok(collapsed.includes('27th row'), 'expected the "27th row" never-extends-to wording');
  assert.ok(
    collapsed.includes('Each of the four conditional rows is independently zero-emission'),
    'expected the preserved "four conditional rows" wording — unchanged, since the 10th check is FIXED, not a fifth conditional row'
  );
});

// ---------------------------------------------------------------------------
// AC-A8 — docs/decisions.md records the decision, including its explicit
// numeral supersession of the [2026-07-09] entry.
// ---------------------------------------------------------------------------

test('AC-A8: docs/decisions.md records a new [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION entry with the updated arithmetic, explicitly stating it supersedes the "rubric[] length 14-19" numeral recorded in the [2026-07-09] entry\'s "Areas affected" line', () => {
  const content = readRepoFile(DECISIONS_PATH);

  assert.ok(
    content.includes('## [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION'),
    'expected the new [2026-07-26] decision heading'
  );

  const block = sliceBetween(content, '## [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION', '<!-- Template for future entries:');
  assert.ok(block, 'expected an extractable [2026-07-26] entry block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(collapsed.includes('15 to 20'), 'expected the updated baseline numeral');
  assert.ok(collapsed.includes('15 to 23'), 'expected the updated maximal numeral');
  assert.ok(
    collapsed.includes(
      'This entry\'s numerals supersede the "rubric[] length 14–19" numeral recorded in the [2026-07-09] entry\'s "Areas affected" line above'
    ),
    'expected the explicit supersession statement naming the 2026-07-09 entry and its stale 14–19 numeral'
  );
});
