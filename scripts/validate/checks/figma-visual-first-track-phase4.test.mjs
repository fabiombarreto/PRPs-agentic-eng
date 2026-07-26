// @ts-check
/**
 * Content-invariant tests for Phase 4 ("Plan authoring — logic phase +
 * sentinel ledger") of the figma-visual-first-track feature (v2 of relay's
 * Figma Implementation Track) — plan-writer.md's new Hard Constraint #13
 * (phase_scope: logic sentinel-ledger resolution), the Phase 2 GROUNDING
 * ledger-dispatch extension (research-codebase focus_areas/roots targeting
 * the paired visual phase's RELAY-MOCK-DATA/RELAY-MOCK-BEHAVIOR
 * occurrences), the Step 4.3.5 frame-inheritance amendment (Design Source
 * frames filtered by the paired visual row, not row N), the Step 4.4 item 6
 * Mandatory Reading amendment, the Step 4.4 item 10 mandatory
 * sentinel-resolution task-authoring rule + its zero-remaining-VALIDATE
 * no-deferral requirement + a new anti-pattern bullet; plan-reviewer.md's
 * new deterministic R-COH-SENTINEL-RESOLUTION-MISSING check (zero-emission/
 * otherwise, mirroring R-COH-VISUAL-SCOPE-PURITY's shape, mutually exclusive
 * with it) plus its widened 14-to-22-row rubric-count prose (now spanning
 * FOUR conditional row classes); docs/context/plan-template.md's
 * `phase_scope: logic` paragraph and the Design Source frame-inheritance
 * exception sentence; and documentation/changelog.html's Unreleased entry.
 *
 * Source PRD: PRPs/prds/figma-visual-first-track.prd.md
 * Source plan: PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md
 *
 * Same idiom as figma-visual-first-track-phase1/2/3.test.mjs: every file
 * this phase touches is prompt/template/prose markdown (or HTML) with no
 * companion production module for its content, so these are
 * readFileSync-based content assertions against the real, already-
 * implemented, code-reviewed, IMPLEMENTED files (Status: IMPLEMENTED,
 * archived to PRPs/plans/completed/) — authored test-after
 * (docs/context/methodology.md: tdd: false + test_frameworks:
 * ["node:test"]), the established ordering for this repo: the pair runs
 * after the Implementer + Code Review, against the already-landed diff.
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file's target-path constants; a
 * dedicated background search-agent sweep independently corroborated every
 * finding below before this file was authored):
 *   - No existing test anywhere in the corpus references
 *     R-COH-SENTINEL-RESOLUTION-MISSING, the Hard Constraint #13 text, the
 *     Step 4.3.5 frame-inheritance paragraph, or the Phase 2 GROUNDING
 *     ledger-dispatch bullet. figma-visual-first-track-phase1.test.mjs's
 *     mock-sentinels.md tests explicitly describe the zero-remaining-
 *     sentinel-ledger check as "Phase 4's job" — i.e., not yet built when
 *     phase 1 was authored. Every property of this phase's diff is
 *     therefore virgin territory; NEW_TEST_REQUIRED throughout.
 *   - CONFIRMED REGRESSION #1, fixed this session (EXISTING_TEST_UPDATED, in
 *     a file this phase does NOT otherwise touch):
 *     figma-visual-first-track-phase3.test.mjs's own AC-A2 test asserting
 *     plan-reviewer.md's rubric[]-length-range paragraph quoted the
 *     PRE-Phase-4 wording verbatim ("all three conditional rows present at
 *     once", "Each of the three conditional rows...", "...whose plan is not
 *     `phase_scope: visual`."). This phase's Task 8 rewrote that paragraph
 *     again to account for a 4th conditional row class
 *     (R-COH-SENTINEL-RESOLUTION-MISSING, mutually exclusive with
 *     R-COH-VISUAL-SCOPE-PURITY). Confirmed broken by direct textual
 *     comparison against the real post-diff file, independently
 *     corroborated by a background search agent. The underlying property is
 *     still fully true; only the wording changed. Fixed in place — see that
 *     file's own new Lifecycle-update paragraph (dated 2026-07-26) and this
 *     session's Lifecycle ledger in
 *     PRPs/reports/figma-visual-first-track/test-suite.diff.
 *   - CONFIRMED REGRESSION #2, fixed this session (EXISTING_TEST_UPDATED, in
 *     a different, unrelated v1 feature's file):
 *     scripts/validate/checks/figma-track-phase5.test.mjs's own AC-4/AC-A1
 *     test asserting the SAME rubric[]-length-range paragraph used a live
 *     regex (`/Each of the three conditional rows is independently
 *     zero-emission.../`) that had already survived one prior rewrite
 *     (Phase 3 of this same v2 feature) but did not survive this phase's
 *     second rewrite — the literal word "three" no longer appears in that
 *     sentence. Confirmed broken by direct textual comparison against the
 *     real post-diff file, independently corroborated by a background
 *     search agent. Fixed with a single-word regex edit ("three" →
 *     "four"); see that file's own new Lifecycle-update paragraph (dated
 *     2026-07-26) and this session's Lifecycle ledger in
 *     PRPs/reports/figma-visual-first-track/test-suite.diff.
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 4's in-scope subset per the plan's own
 * ## Acceptance Criteria section AC-A1 through AC-A5; PRD AC-3, AC-4, AC-6
 * are OUT_OF_PHASE_SCOPE — AC-3 (visual-phase purity) belongs to phase 3's
 * already-shipped R-COH-VISUAL-SCOPE-PURITY; AC-4 (blocking visual gate) and
 * AC-6 (real-data regression) are deferred to phase 5 — no test for any of
 * them in this file):
 *
 *   AC-A1 (PRD AC-5) — plan-writer's Hard Constraint #13, the Phase 2
 *     GROUNDING ledger-dispatch extension, the Step 4.4 item 6 Mandatory
 *     Reading amendment, the Step 4.4 item 10 mandatory sentinel-resolution
 *     task-authoring rule (derive-the-ledger + author-the-task(s) bullets),
 *     the new anti-pattern bullet, and plan-template.md's new "what
 *     phase_scope: logic implies" paragraph.
 *   AC-A2 (PRD AC-5) — plan-writer's Step 4.4 item 10 mandatory
 *     zero-remaining VALIDATE bullet: no count threshold, no deferral,
 *     scoped to the paired visual phase's OWN touched files only.
 *   AC-A3 (PRD AC-5) — plan-reviewer's new R-COH-SENTINEL-RESOLUTION-MISSING
 *     check: registration/positioning, the zero-emission branch, fail
 *     condition (a) (unchanged NEITHER/NOR logic), fail condition (b) (the
 *     CORRECTED EITHER (b1) OR (b2) logic — see the dedicated CRITICAL test
 *     below), the three coverage-satisfying VALIDATE constructs, the
 *     passed:true/known-limitation closing, and a dedicated asymmetry-pin
 *     test confirming (a) and (b) deliberately differ and must stay that
 *     way.
 *   AC-A4 (PRD AC-2) — plan-writer's Step 4.3.5 frame-inheritance amendment
 *     (filter by the paired visual row's number, never row N's own) and
 *     plan-template.md's matching Design Source exception sentence.
 *   AC-A5 (PRD AC-1) — inert-when-off across every conditional surface this
 *     phase touches (Hard Constraint #13's off-branch, item 10's
 *     not-applicable closing, R-COH-SENTINEL-RESOLUTION-MISSING's
 *     zero-emission branch and its explicit mutual-exclusivity statement
 *     with R-COH-VISUAL-SCOPE-PURITY), a real dogfood proof (this feature's
 *     own phase 4 plan carries no phase_scope row), and a path-existence
 *     regression-safety net.
 *   (documentation of record, AC-A1..AC-A5) — changelog.html's Unreleased ->
 *     Added entry.
 *
 * CRITICAL — a post-review corrective fix changed R-COH-SENTINEL-RESOLUTION-
 * MISSING's condition (b). The version shipped and tested here is the
 * CORRECTED version: condition (b) originally used OR-logic ("FAIL if
 * NEITHER token appears in any VALIDATE"), which wrongly PASSED a VALIDATE
 * covering only one sentinel class. The live condition (b) instead fails
 * when EITHER (b1) no sentinel-targeting VALIDATE exists at all, OR (b2) the
 * VALIDATE text names one sentinel class but not the other with no
 * class-agnostic RELAY-MOCK match covering both by construction. Condition
 * (a) deliberately KEEPS its NEITHER/NOR logic (a paired visual phase may
 * legitimately emit only one sentinel class, so requiring both tokens in the
 * TASK would false-positive) — see the dedicated asymmetry-pin test.
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase4.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const PLAN_TEMPLATE_PATH = 'docs/context/plan-template.md';
const PLAN_WRITER_PATH = 'plugins/relay/agents/plan-writer.md';
const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';
const CHANGELOG_PATH = 'documentation/changelog.html';
const THIS_PLAN_PATH = 'PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-visual-first-track-phase1/2/3.test.mjs's helper of the same
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
 * if `startNeedle` is absent. Mirrors figma-visual-first-track-phase1/2/3
 * .test.mjs's helper of the same name/shape.
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
 * figma-visual-first-track-phase1/2/3.test.mjs's helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — plan-writer authors a mandatory sentinel-resolution
// task, deriving its ledger from the Phase 2 GROUNDING dispatch, per
// mock-sentinels.md's Swap semantics.
// ---------------------------------------------------------------------------

test('AC-A1: plan-writer.md registers Hard Constraint #13 (phase_scope: logic sentinel-ledger resolution), positioned immediately after existing constraint #12, requiring a mandatory resolution task backed by a zero-remaining VALIDATE, with a forward reference to R-COH-SENTINEL-RESOLUTION-MISSING', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);

  const c12Idx = content.indexOf('12. **`phase_scope: visual` task purity');
  const c13Idx = content.indexOf('13. **`phase_scope: logic` sentinel-ledger resolution');
  assert.notEqual(c12Idx, -1, 'expected the existing Hard Constraint #12');
  assert.notEqual(c13Idx, -1, 'expected a new Hard Constraint #13');
  assert.ok(c12Idx < c13Idx, 'Hard Constraint #13 must be positioned after #12');

  const block = sliceBetween(content, '13. **`phase_scope: logic` sentinel-ledger resolution', '## Phase 0 — Setup');
  assert.ok(block, 'expected an extractable Hard Constraint #13 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "(when applicable).** When the plan's `## Metadata` carries `phase_scope: logic`, the plan MUST author at least one task under `## Step-by-Step Tasks` that resolves every `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel found in the paired visual phase's touched files"
    ),
    'expected the mandatory resolution-task requirement'
  );
  assert.ok(
    collapsed.includes(
      'backed by at least one VALIDATE command that fails (non-zero exit) if any such sentinel remains — no count threshold, no recorded-justification exception'
    ),
    'expected the zero-remaining VALIDATE requirement'
  );
  assert.ok(
    collapsed.includes(
      "`plan-reviewer`'s new `R-COH-SENTINEL-RESOLUTION-MISSING` check (Phase 4 of `PRPs/prds/figma-visual-first-track.prd.md`) rejects any plan that violates this."
    ),
    'expected the forward reference to R-COH-SENTINEL-RESOLUTION-MISSING'
  );
});

test('AC-A1: docs/context/plan-template.md registers a new "What phase_scope: logic implies for the plan body" paragraph — mandatory sentinel-resolution task per mock-sentinels.md Swap semantics, backed by a zero-remaining VALIDATE, cross-referencing plan-writer Step 4.4 item 10 and R-COH-SENTINEL-RESOLUTION-MISSING', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);
  const block = sliceBetween(
    content,
    '**What `phase_scope: logic` implies for the plan body.**',
    '**Conditional `## Design Source` section'
  );
  assert.ok(block, 'expected an extractable "What phase_scope: logic implies" paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "Every `phase_scope: logic` plan MUST author at least one task under `## Step-by-Step Tasks` that resolves every `[RELAY-MOCK-DATA]` and `[RELAY-MOCK-BEHAVIOR]` sentinel left behind by the paired visual phase, per `docs/context/mock-sentinels.md`'s Swap semantics: replacing each `[RELAY-MOCK-DATA]` literal with its real data source at the exact sentinel site, and filling each `[RELAY-MOCK-BEHAVIOR]` handler with real business logic inside the already-approved choreography."
    ),
    'expected the swap-semantics task-authoring summary'
  );
  assert.ok(
    collapsed.includes(
      "The task (or tasks) MUST be backed by at least one VALIDATE command that greps the paired visual phase's touched files for both sentinel tokens and fails (non-zero exit) if either remains"
    ),
    'expected the zero-remaining VALIDATE summary'
  );
  assert.ok(
    collapsed.includes('this VALIDATE accepts no count threshold and no recorded-justification exception.'),
    'expected the no-deferral-path clause'
  );
  assert.ok(
    collapsed.includes(
      "Like the visual branch, `phase_scope: logic` has no companion conditional section of its own — it reuses the existing conditional `## Design Source` section (governed by `design_source`, not `phase_scope`) when applicable"
    ),
    'expected the no-companion-conditional-section preservation, paralleling the visual branch'
  );
});

test('AC-A1: plan-writer.md Phase 2 GROUNDING dispatch gains a phase_scope: logic ledger-dispatch extension — reads the [LOGIC] tag directly (ahead of Step 4.4 item 5\'s formal assignment), resolves the paired visual row via row N\'s Depends cell, and extends research-codebase\'s focus_areas/roots to target RELAY-MOCK-DATA/RELAY-MOCK-BEHAVIOR in the paired visual phase\'s touched files', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope: logic` ledger-dispatch (conditional).**', '- `subagent_type: research-web`');
  assert.ok(block, 'expected an extractable ledger-dispatch block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "When the source PRD declares `visual_first: true` (Phase 0) and row N's own `Phase` cell carries a leading `[LOGIC]` tag (the same tag Step 4.4 item 5 later formalizes into `phase_scope: logic` — this dispatch reads the tag directly, ahead of that formal assignment, since GROUNDING runs before Step 4.4)"
    ),
    'expected the ahead-of-formal-assignment gate'
  );
  assert.ok(
    collapsed.includes("first resolve the paired visual phase's row number from row N's own `Depends` cell"),
    'expected the Depends-cell paired-row resolution'
  );
  assert.ok(
    collapsed.includes(
      "`focus_areas` gains two entries targeting `RELAY-MOCK-DATA` and `RELAY-MOCK-BEHAVIOR` sentinel occurrences, and `roots` is set to the paired visual phase's touched files/directories from its `## Files to Change` table."
    ),
    'expected the focus_areas/roots extension'
  );
  assert.ok(
    collapsed.includes(
      'fall back to `TBD - needs validation` for the ledger rather than halting — a defensive fallback per Hard Constraint #6, not an expected path.'
    ),
    'expected the TBD fallback rather than halting'
  );
});

test('AC-A1: plan-writer.md Step 4.4 item 6 symmetrically mandates docs/context/mock-sentinels.md AND the paired visual phase\'s plan file as P0 Mandatory Reading rows when phase_scope: logic, naming the swap-semantics section and the concrete Files to Change / Design Source ledger sources', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '6. `## Mandatory Reading`', '7. `## Patterns to Mirror`');
  assert.ok(block, 'expected an extractable item 6 Mandatory Reading block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'Symmetrically, when `phase_scope: logic` (from item 5 above), always include `docs/context/mock-sentinels.md` as a P0 `## Mandatory Reading` row (the swap-semantics section'
    ),
    'expected the symmetric mock-sentinels.md mandate for phase_scope: logic'
  );
  assert.ok(
    collapsed.includes(
      "AND include the paired visual phase's plan file (resolved via row N's own `Depends` cell, per the Phase 2 ledger-dispatch extension above) as a second P0 row"
    ),
    'expected the paired visual plan file as a second mandatory P0 row'
  );
  assert.ok(
    collapsed.includes(
      "its `## Files to Change` table names every file the resolution task must sweep for sentinels, and its `## Design Source` table (when present) is what Step 4.3.5's frame-inheritance amendment inherits verbatim."
    ),
    'expected the concrete ledger-source cross-reference'
  );
});

test('AC-A1: plan-writer.md Step 4.4 item 10\'s phase_scope: logic block requires deriving the ledger from the Phase 2 dispatch findings (never inventing entries) and authoring at least one resolution task per mock-sentinels.md Swap semantics (data: replace the literal; behavior: fill the middle, preserving the locked choreography)', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope: logic` mandatory sentinel-resolution task', '11. `## Validation Commands`');
  assert.ok(block, 'expected an extractable item 10 phase_scope: logic block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**Derive the ledger.** Use the findings from the Phase 2 ledger-dispatch extension (each `RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR` match becomes one ledger entry: `file:line`, sentinel class, evidence snippet).'
    ),
    'expected the derive-the-ledger bullet'
  );
  assert.ok(
    collapsed.includes(
      'When the dispatch returns no sentinel findings, treat the ledger as empty and note this explicitly in the task body and in `## Risks and Mitigations` — do not invent entries.'
    ),
    'expected the empty-ledger-is-noted-not-invented clause'
  );
  assert.ok(
    collapsed.includes(
      'for every `[RELAY-MOCK-DATA]` entry, replace the literal mock value with the real data source at the exact sentinel site (the displayed shape does not change, only where the value comes from); for every `[RELAY-MOCK-BEHAVIOR]` entry, fill in the real handler/business logic in the middle of the already-approved choreography'
    ),
    'expected the swap-semantics task-authoring requirement'
  );
  assert.ok(
    collapsed.includes(
      'Large ledgers MAY be split across multiple tasks (e.g., one per touched file); at least one such task MUST exist regardless of ledger size.'
    ),
    'expected the at-least-one-task-regardless-of-size clause'
  );
});

test('AC-A2 (PRD AC-5): plan-writer.md Step 4.4 item 10\'s phase_scope: logic block mandates a zero-remaining VALIDATE with no deferral path — no count threshold, no recorded justification — scoped to the paired visual phase\'s OWN touched files only, never the whole repo or other visual/logic pairs', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope: logic` mandatory sentinel-resolution task', '11. `## Validation Commands`');
  assert.ok(block, 'expected an extractable item 10 phase_scope: logic block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "**Mandatory zero-remaining VALIDATE — no deferral path.** At least one `**VALIDATE**:` command (task-level, or a `## Validation Commands` Level 2/3 block) MUST grep the paired visual phase's touched files for both sentinel tokens and FAIL (non-zero exit, per Hard Constraint #11) if either is still found."
    ),
    'expected the mandatory zero-remaining VALIDATE requirement'
  );
  assert.ok(
    collapsed.includes(
      'this VALIDATE MUST NOT accept a count threshold, a recorded justification, or any other exception — the check is a strict zero, with no deferral of any kind.'
    ),
    'expected the strict-zero no-deferral clause'
  );
  assert.ok(
    collapsed.includes(
      "Scope the grep to the paired visual phase's OWN touched files only (the 1:1 pair this logic phase resolves), never the whole repo and never other visual/logic pairs elsewhere in the same feature."
    ),
    'expected the scoped-to-paired-visual-files-only clause'
  );
});

test('AC-A1: plan-writer.md Step 4.4 item 10\'s phase_scope: logic block forward-references R-COH-SENTINEL-RESOLUTION-MISSING for enforcement, and registers a matching anti-pattern bullet rejecting a logic plan with no resolution task or a VALIDATE accepting anything short of zero', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);

  const itemBlock = sliceBetween(content, '**`phase_scope: logic` mandatory sentinel-resolution task', '11. `## Validation Commands`');
  assert.ok(itemBlock, 'expected an extractable item 10 phase_scope: logic block');
  assert.ok(
    collapseWs(/** @type {string} */ (itemBlock)).includes(
      "`plan-reviewer`'s new `R-COH-SENTINEL-RESOLUTION-MISSING` check enforces both the task's presence and the VALIDATE's presence structurally."
    ),
    'expected the enforcement forward-reference'
  );

  const antiPatternBlock = sliceBetween(content, '**Authoring a `phase_scope: logic` plan with no sentinel-resolution', '## Out of scope');
  assert.ok(antiPatternBlock, 'expected an extractable anti-pattern bullet');
  const collapsedAntiPattern = collapseWs(/** @type {string} */ (antiPatternBlock));
  assert.ok(
    collapsedAntiPattern.includes(
      "task, or with one whose VALIDATE accepts anything short of zero remaining sentinels.** A `phase_scope: logic` plan MUST contain at least one task resolving every `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel in the paired visual phase's files, backed by a VALIDATE that fails on any remaining sentinel — no count threshold, no recorded-justification exception"
    ),
    'expected the anti-pattern description'
  );
  assert.ok(
    collapsedAntiPattern.includes("`plan-reviewer`'s `R-COH-SENTINEL-RESOLUTION-MISSING` check rejects it."),
    'expected the enforcement cross-reference'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-5) — plan-reviewer's new R-COH-SENTINEL-RESOLUTION-MISSING
// check returns CHANGES_REQUESTED naming the missing task/VALIDATE.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-5), AC-A5 (PRD AC-1): plan-reviewer.md registers R-COH-SENTINEL-RESOLUTION-MISSING as a deliberate mirror of R-COH-VISUAL-SCOPE-PURITY\'s zero-emission/otherwise shape, positioned immediately after R-COH-VISUAL-SCOPE-PURITY and before the Bounded K=5 pass, explicitly mutually exclusive with it, with a zero-emission branch when phase_scope is absent or visual', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const purityIdx = content.indexOf('#### R-COH-VISUAL-SCOPE-PURITY');
  const sentinelIdx = content.indexOf('#### R-COH-SENTINEL-RESOLUTION-MISSING');
  const k5Idx = content.indexOf('### Bounded K=5 LLM judgment pass');
  assert.notEqual(purityIdx, -1, 'expected the existing R-COH-VISUAL-SCOPE-PURITY heading');
  assert.notEqual(sentinelIdx, -1, 'expected a new R-COH-SENTINEL-RESOLUTION-MISSING heading');
  assert.notEqual(k5Idx, -1, 'expected the existing Bounded K=5 heading');
  assert.ok(purityIdx < sentinelIdx, 'R-COH-SENTINEL-RESOLUTION-MISSING must be positioned after R-COH-VISUAL-SCOPE-PURITY');
  assert.ok(sentinelIdx < k5Idx, 'R-COH-SENTINEL-RESOLUTION-MISSING must be positioned before the Bounded K=5 pass');

  const block = sliceBetween(content, '#### R-COH-SENTINEL-RESOLUTION-MISSING', '### Bounded K=5 LLM judgment pass');
  assert.ok(block, 'expected an extractable R-COH-SENTINEL-RESOLUTION-MISSING block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "**Deliberate mirror of `R-COH-VISUAL-SCOPE-PURITY`'s zero-emission/otherwise shape, applied to the opposite `phase_scope` value.**"
    ),
    'expected the deliberate-mirror framing'
  );
  assert.ok(
    collapsed.includes(
      "It is also mutually exclusive with `R-COH-VISUAL-SCOPE-PURITY`: both key off the same `## Metadata` `phase_scope` cell, which carries exactly one value per plan, so at most one of the two checks ever emits a row on a given run."
    ),
    'expected the mutual-exclusivity statement'
  );
  assert.ok(
    collapsed.includes(
      "**Zero-emission branch:** if the plan's `## Metadata` table has no row whose first cell matches `phase_scope` (case-insensitive), OR the row's value is `visual` (not `logic`), emit NO row at all for this check — not even `passed: true`. Do NOT fail in either case."
    ),
    'expected the zero-emission branch'
  );
});

test('AC-A3 (PRD AC-5): plan-reviewer.md\'s R-COH-SENTINEL-RESOLUTION-MISSING fail condition (a) fails when NEITHER sentinel token appears anywhere in Step-by-Step Tasks\' task bodies', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '**(a) No sentinel-resolution task.**', '**(b) No full-coverage zero-remaining VALIDATE.**');
  assert.ok(block, 'expected an extractable condition (a) block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes("FAIL if NEITHER `RELAY-MOCK-DATA` NOR `RELAY-MOCK-BEHAVIOR` appears anywhere in `## Step-by-Step Tasks`'s task bodies."),
    'expected the NEITHER/NOR condition (a) text'
  );
  assert.ok(
    collapsed.includes(
      "`reason`: no task references either sentinel token; a `phase_scope: logic` plan must author a mandatory sentinel-resolution task."
    ),
    'expected the condition (a) reason text'
  );
});

test('AC-A3 (PRD AC-5), CRITICAL — corrected post-review semantics: plan-reviewer.md\'s R-COH-SENTINEL-RESOLUTION-MISSING fail condition (b) fails on EITHER (b1) no sentinel-targeting VALIDATE at all OR (b2) the VALIDATE text names only one sentinel class with no class-agnostic RELAY-MOCK coverage — NOT the old NEITHER/NOR-only formulation that would wrongly pass a VALIDATE covering just one class', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '**(b) No full-coverage zero-remaining VALIDATE.**', 'The exit-code CORRECTNESS');
  assert.ok(block, 'expected an extractable condition (b) block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'FAIL if EITHER (b1) no `**VALIDATE**:` command (task-level) and no `## Validation Commands` Level 2/3 command block contains `RELAY-MOCK` at all — no sentinel-targeting VALIDATE exists at all — OR (b2) the VALIDATE text collectively names one sentinel class (`RELAY-MOCK-DATA` or `RELAY-MOCK-BEHAVIOR`) but not the other, AND no VALIDATE command contains a class-agnostic `RELAY-MOCK` match that covers both by construction'
    ),
    'expected the corrected EITHER (b1) OR (b2) fail logic'
  );
  assert.ok(
    collapsed.includes(
      '`reason` distinguishes the two failure modes: (b1) states no VALIDATE command references any sentinel token; (b2) names which sentinel class the VALIDATE text covers and which class is missing.'
    ),
    'expected the (b1)/(b2)-distinguishing reason requirement'
  );

  // Anti-regression: the ORIGINAL (pre-review-correction) condition (b) used
  // a single NEITHER/NOR-only test scoped to VALIDATE text — "FAIL if
  // NEITHER `RELAY-MOCK-DATA` NOR `RELAY-MOCK-BEHAVIOR` appears in the text
  // of any" — which wrongly PASSED a VALIDATE covering only one sentinel
  // class. That exact phrase must never reappear in condition (b).
  assert.ok(
    !collapsed.includes('FAIL if NEITHER `RELAY-MOCK-DATA` NOR `RELAY-MOCK-BEHAVIOR` appears in the text of any'),
    'condition (b) must not regress to the old NEITHER/NOR-only formulation scoped to VALIDATE text'
  );
});

test('AC-A3 (PRD AC-5): plan-reviewer.md\'s R-COH-SENTINEL-RESOLUTION-MISSING condition (b2) treats a bare common-prefix grep, an alternation, or two separate single-token greps as all satisfying full sentinel coverage — none of these trip the sub-condition', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '**(b) No full-coverage zero-remaining VALIDATE.**', 'The exit-code CORRECTNESS');
  assert.ok(block, 'expected an extractable condition (b) block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(collapsed.includes('a bare common-prefix grep (e.g. `grep -r "RELAY-MOCK-" src/`)'), 'expected the bare-common-prefix-grep coverage example');
  assert.ok(
    collapsed.includes('an alternation (e.g. `grep -rE "RELAY-MOCK-(DATA|BEHAVIOR)"` or `grep -r "RELAY-MOCK-DATA\\|RELAY-MOCK-BEHAVIOR"`)'),
    'expected the alternation coverage example (extended regex and escaped-pipe BRE forms)'
  );
  assert.ok(
    collapsed.includes('or two separate greps naming one literal token each all satisfy full coverage and do NOT trip this sub-condition.'),
    'expected the two-separate-greps coverage example'
  );
});

test('AC-A3 (PRD AC-5), asymmetry pin (deliberate, not a drift risk): plan-reviewer.md\'s condition (a) keeps its NEITHER/NOR-only logic (a paired visual phase may legitimately emit only one sentinel class, so requiring both tokens in the TASK would false-positive) while condition (b) uses the corrected EITHER-of-two-subconditions logic for the VALIDATE — a future edit must not silently re-weaken (b) back to NEITHER/NOR-only, nor over-tighten (a) to require both tokens', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const blockA = sliceBetween(content, '**(a) No sentinel-resolution task.**', '**(b) No full-coverage zero-remaining VALIDATE.**');
  const blockB = sliceBetween(content, '**(b) No full-coverage zero-remaining VALIDATE.**', 'The exit-code CORRECTNESS');
  assert.ok(blockA, 'expected an extractable condition (a) block');
  assert.ok(blockB, 'expected an extractable condition (b) block');
  const collapsedA = collapseWs(/** @type {string} */ (blockA));
  const collapsedB = collapseWs(/** @type {string} */ (blockB));

  assert.ok(
    collapsedA.includes('FAIL if NEITHER `RELAY-MOCK-DATA` NOR `RELAY-MOCK-BEHAVIOR` appears anywhere'),
    'expected condition (a) to retain its NEITHER/NOR-only logic'
  );
  assert.ok(
    !collapsedA.includes('(a1)') && !collapsedA.includes('(a2)'),
    'condition (a) must not have grown a two-subcondition split -- that is condition (b)\'s corrected shape, not (a)\'s'
  );

  assert.ok(collapsedB.includes('FAIL if EITHER (b1)'), 'expected condition (b) to use the corrected EITHER (b1) OR (b2) split');
  assert.ok(collapsedB.includes('OR (b2)'), 'expected condition (b) to name its second sub-condition explicitly');
});

test('AC-A3 (PRD AC-5): plan-reviewer.md\'s R-COH-SENTINEL-RESOLUTION-MISSING returns passed:true otherwise, allows a single plan to fail both (a) and (b) simultaneously, composes with (rather than duplicates) R-COH-VALIDATE-ALWAYS-PASS, and records its own known limitation as a textual heuristic scan — not a real ledger-completeness cross-check against the paired visual phase\'s actual files', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-SENTINEL-RESOLUTION-MISSING', '### Bounded K=5 LLM judgment pass');
  assert.ok(block, 'expected an extractable R-COH-SENTINEL-RESOLUTION-MISSING block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('A single plan can fail both (a) and (b) simultaneously; name both in `reason` when so.'),
    'expected the both-can-fail-simultaneously clause'
  );
  assert.ok(
    collapsed.includes('Otherwise → `{ "id": "R-COH-SENTINEL-RESOLUTION-MISSING", "passed": true }`.'),
    'expected the passed:true otherwise-branch line'
  );
  assert.ok(
    collapsed.includes(
      "that is already `R-COH-VALIDATE-ALWAYS-PASS`'s job, run independently over every VALIDATE command in the plan regardless of `phase_scope`. This check only confirms a sentinel-targeting VALIDATE exists; the two checks compose rather than duplicate."
    ),
    'expected the composes-rather-than-duplicates clause versus R-COH-VALIDATE-ALWAYS-PASS'
  );
  assert.ok(
    collapsed.includes(
      "it confirms the plan AUTHORED a resolution task and a sentinel-targeting VALIDATE, not that the task's ledger is complete against the paired visual phase's ACTUAL files"
    ),
    'expected the known-limitation textual-heuristic framing'
  );
  assert.ok(
    collapsed.includes("`plan-reviewer` has no `Glob`/`Grep` tool) or that the VALIDATE was ever executed. It is a plan-authoring-time gate, not the final safety net"),
    'expected the no-Glob/Grep-tool + not-the-final-safety-net framing'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-2) — a phase_scope: logic plan's Design Source frame set is
// filtered by the PAIRED VISUAL phase's row number, never row N's own.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-2): plan-writer.md Step 4.3.5 gains a phase_scope: logic frame-inheritance amendment — filters the Design Spec\'s frames by the PAIRED VISUAL phase\'s row number (read from row N\'s own Depends cell), never row N\'s own number, since the Design Spec\'s Phase assignment column names the visual phase that renders each frame', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope: logic` frame-inheritance (conditional).**', '### Step 4.4 — Body sections (14 mandatory)');
  assert.ok(block, 'expected an extractable frame-inheritance amendment block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "When this row's `phase_scope` (Step 4.4 item 5) is `logic` AND `design_source: figma`, do NOT filter the Design Spec's frames by row N's own number — row N is the logic row, and the Design Spec's `Phase assignment` column, when present, names the VISUAL phase that renders each frame, never the logic phase that later wires real data behind it."
    ),
    'expected the do-not-filter-by-row-N statement'
  );
  assert.ok(
    collapsed.includes("Instead, filter using the paired visual phase's row number, read from row N's own `Depends` cell"),
    'expected the filter-by-paired-visual-row instruction'
  );
  assert.ok(
    collapsed.includes("This is how a `phase_scope: logic` plan's `## Design Source` section inherits the SAME locked frame set the paired visual phase's plan already declared"),
    'expected the same-locked-frame-set inheritance statement'
  );
  assert.ok(
    collapsed.includes('When `phase_scope` is absent or `visual`, this paragraph does not apply — the existing row-N filter (unchanged) governs.'),
    'expected the not-applicable-off-branch clause'
  );
});

test('AC-A4 (PRD AC-2): docs/context/plan-template.md\'s Conditional ## Design Source section paragraph gains the phase_scope: logic exception sentence, naming the paired visual phase\'s Depends-cell row number as the filter key and cross-referencing plan-writer Step 4.3.5', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);
  const block = sliceBetween(content, '**Conditional `## Design Source` section (only when', '7. `## Mandatory Reading`');
  assert.ok(block, 'expected an extractable Conditional Design Source section block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "**Exception for `phase_scope: logic` plans:** the filter key is the PAIRED VISUAL phase's row number (read from row N's own `Depends` cell), never row N's own number — see `plugins/relay/agents/plan-writer.md` Step 4.3.5 for the full rule."
    ),
    'expected the phase_scope: logic exception sentence'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-1) — inert when off: no phase_scope: logic machinery fires
// for a non-visual_first PRD or a phase_scope: visual plan; mutual
// exclusivity with R-COH-VISUAL-SCOPE-PURITY holds by construction.
// ---------------------------------------------------------------------------

test('AC-A5: plan-writer.md\'s Hard Constraint #13 is a silent no-op — not applicable — when phase_scope is absent or visual, mirroring constraint #12\'s own dual-branch, never-inferred lineage', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '13. **`phase_scope: logic` sentinel-ledger resolution', '## Phase 0 — Setup');
  assert.ok(block, 'expected an extractable Hard Constraint #13 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes("Not applicable — silent no-op — when `phase_scope` is absent or `visual`, mirroring constraint #12's own dual-branch, never-inferred lineage."),
    'expected the not-applicable off-branch clause'
  );
});

test('AC-A5: plan-writer.md Step 4.4 item 10\'s phase_scope: logic block is explicitly not applicable — no requirement, no rubric row — when phase_scope is absent or visual', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope: logic` mandatory sentinel-resolution task', '11. `## Validation Commands`');
  assert.ok(block, 'expected an extractable item 10 phase_scope: logic block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('Not applicable — no requirement, no rubric row — when `phase_scope` is absent or `visual`.'),
    'expected the not-applicable closing statement'
  );
});

test('AC-A5 (real dogfood proof): this feature\'s own phase 4 plan\'s ## Metadata table carries no phase_scope row (only prose explaining its absence) — its source PRD does not declare visual_first: true and this repo does not declare figma_track: true, so the new logic-scope machinery is inert against this very plan, by design', () => {
  const content = readRepoFile(THIS_PLAN_PATH);
  const metadataBlock = sliceBetween(content, '## Metadata', '## Mandatory Reading');
  assert.ok(metadataBlock, 'expected an extractable ## Metadata block');
  const tableRows = /** @type {string} */ (metadataBlock).split('\n').filter((line) => line.trim().startsWith('|'));

  assert.ok(!tableRows.some((row) => /\|\s*phase_scope\s*\|/i.test(row)), "expected no phase_scope table row in this plan's own Metadata table");
  assert.ok(!tableRows.some((row) => /\|\s*design_source\s*\|/i.test(row)), 'expected no design_source table row either, for the same reason');

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      "so this table also carries no `phase_scope` row: the new logic-scope machinery this phase ships is inert against this repo and against this very plan, by design."
    ),
    "expected the plan's own prose to explain the phase_scope absence explicitly"
  );
});

// Regression-safety net (not itself one of the plan's numbered AC-A1..AC-A5,
// mirrors figma-visual-first-track-phase2/3.test.mjs's identical precedent
// for an analogous docs-only phase touching the same scan roots) — confirms
// this phase's edits introduced no dangling path/script reference anywhere
// under plugins/relay/ or docs/ (path-existence.mjs's two scan roots, which
// cover three of this phase's four touched files: plan-writer.md,
// plan-reviewer.md, plan-template.md). Uses withScanRootLock since node:test
// runs files concurrently by default and path-existence.test.mjs's own AC-5
// test transiently mutates the same SCAN_ROOTS with a synthetic fixture.
test(
  "AC-A5 (regression safety net): runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase's plan-writer.md, plan-reviewer.md, and plan-template.md edits — confirms no dangling path/script reference was introduced",
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);

// ---------------------------------------------------------------------------
// Documentation of record (AC-A1..AC-A5 collectively) — changelog.html's
// Unreleased -> Added section records this phase's entry, after this
// feature's own Phase 3 entry, before any versioned release heading.
// ---------------------------------------------------------------------------

test('(documentation of record, AC-A1..AC-A5): changelog.html\'s Unreleased -> Added section records this phase\'s plan-writer/plan-reviewer entry — non-heuristic sentinel-ledger derivation, mandatory resolution-task rule with zero-remaining VALIDATE, Design Source frame-inheritance amendment, and the mutually-exclusive R-COH-SENTINEL-RESOLUTION-MISSING check — positioned after this feature\'s own Phase 3 entry and before any versioned release heading', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  const unreleasedIdx = content.indexOf('<h2 id="unreleased">Unreleased</h2>');
  assert.notEqual(unreleasedIdx, -1, 'expected an id="unreleased" heading');

  const phase3EntryIdx = content.indexOf('<code>plan-writer</code> gains non-heuristic <code>phase_scope</code> sourcing');
  assert.notEqual(phase3EntryIdx, -1, "expected this feature's own Phase 3 changelog entry to still be present");

  assert.ok(
    content.includes(
      "<code>plan-writer</code> gains a non-heuristic sentinel-ledger derivation for <code>phase_scope: logic</code> plans (extending Phase 2 GROUNDING's <code>research-codebase</code> dispatch against the paired visual phase's touched files)"
    ),
    'expected the sentinel-ledger derivation half of the Phase 4 changelog entry'
  );
  assert.ok(
    content.includes(
      "a mandatory resolution-task-authoring rule (per <code>mock-sentinels.md</code>'s swap semantics, backed by a strict zero-remaining VALIDATE with no deferral path)"
    ),
    'expected the mandatory resolution-task-authoring half of the Phase 4 changelog entry'
  );
  assert.ok(
    content.includes(
      "a Design Source frame-inheritance amendment so a logic-scoped plan's regression targets the same locked frames its paired visual phase declared"
    ),
    'expected the frame-inheritance half of the Phase 4 changelog entry'
  );
  assert.ok(
    content.includes(
      "<code>plan-reviewer</code> gains the structural <code>R-COH-SENTINEL-RESOLUTION-MISSING</code> check (zero-emission unless <code>phase_scope: logic</code>; mutually exclusive with Phase 3's <code>R-COH-VISUAL-SCOPE-PURITY</code>), failing <code>CHANGES_REQUESTED</code> when a logic-scoped plan lacks the resolution task or its zero-remaining validation."
    ),
    'expected the plan-reviewer half of the Phase 4 changelog entry'
  );
  assert.ok(
    content.includes('Part of the Figma Visual-First Track, Phase 4 of <code>PRPs/prds/figma-visual-first-track.prd.md</code>.'),
    'expected the Phase 4 attribution sentence'
  );

  const phase4EntryIdx = content.indexOf('<code>plan-writer</code> gains a non-heuristic sentinel-ledger derivation');
  assert.ok(phase4EntryIdx > phase3EntryIdx, "the Phase 4 entry must be positioned after this feature's own Phase 3 entry");

  const nextReleaseMatch = content.slice(unreleasedIdx).match(/<h2 id="v[0-9][^"]*"/);
  if (nextReleaseMatch) {
    const nextReleaseIdx = unreleasedIdx + /** @type {number} */ (nextReleaseMatch.index);
    assert.ok(phase4EntryIdx < nextReleaseIdx, 'the entry must be positioned before the first versioned release heading (still Unreleased, not yet cut)');
  }
});
