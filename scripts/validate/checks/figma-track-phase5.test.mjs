// @ts-check
/**
 * Content-invariant tests for Phase 5 ("Plan integration") of the
 * figma-implementation-track feature — the conditional `## Design Source`
 * section registered in `plan-template.md`/`prd-template.md`, the mandatory
 * non-heuristic `design_source: figma | none` Metadata field in
 * `plan-writer.md`, the structural (never-inferring) presence checks in
 * `plan-reviewer.md`/`prd-reviewer.md`, the per-phase declaration Q&A in
 * `prd-writer.md`, the new `research-design` grounding subagent's
 * conditional dispatch in `plan-writer.md`'s Phase 2 GROUNDING, and
 * `relay-plan.md`'s flags-first argument-parsing preamble.
 *
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-5-plan-integration.plan.md
 * Diff reviewed: PRPs/reports/figma-implementation-track/phase-5/attempts/2/diff.patch
 *
 * Existing-coverage scan performed before authoring (Step 2.1): read every
 * scripts/validate/checks/*.test.mjs file's target-path constants (including
 * this same feature's own figma-track-phase1/2/3/4.test.mjs). None of them
 * reads plugins/relay/agents/plan-writer.md, plan-reviewer.md,
 * prd-writer.md, prd-reviewer.md, plugins/relay/commands/relay-plan.md,
 * docs/context/plan-template.md, or docs/context/prd-template.md at all —
 * this phase's eight edited/created files are virgin territory for the test
 * suite. Every test below is therefore NEW_TEST_REQUIRED; no
 * EXISTING_TEST_COVERS, EXISTING_TEST_UPDATED, OBSOLETE_TEST_REMOVED, or
 * REDUNDANT_TEST_REMOVED outcome applies to any in-scope AC this session.
 *
 * One property is EXISTING_TEST_COVERS transitively, documented here rather
 * than re-asserted: this phase's new `research-design.md` agent file (and
 * its registration across search-index.json/changelog.html/agents.html) is
 * already exercised by figma-track-phase3.test.mjs's two real-wrapper tests
 * (`runDispatchGraphCheck()` / `runRegistrationParityCheck()`, both
 * `ok:true` with zero findings) — those calls install no fixture isolation
 * and run against whatever is currently on disk, a property phase4's own
 * test file already relied on for its own new files. Since research-design.md
 * and this phase's documentation-registration edits are now part of that
 * "currently on disk" state, those two tests already extend to cover this
 * phase's dispatch-graph-resolves / registration-parity properties too.
 * Re-asserting them here would be a same-input, same-assertion duplicate
 * (R-DUPLICATE) of an already-green test. Likewise, path-existence.mjs's
 * whole-tree, zero-findings, no-fixture-isolation real-wrapper property was
 * established by figma-track-phase2.test.mjs and needs no phase-5 instance
 * for the same transitive reason.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 5 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-5-plan-integration.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 5 per the plan's own Acceptance Criteria
 * section: AC-4 only, via plan AC-A1/AC-A2/AC-A3, all three of which cite
 * "(PRD AC-4)" exclusively. PRD AC-1, AC-2, AC-3, AC-5 are
 * OUT_OF_PHASE_SCOPE — AC-1's general "inert when off" claim was already
 * exercised per-phase by figma-track-phase1/2/3/4.test.mjs against THOSE
 * phases' own new files; AC-2 (reuse enforcement) and AC-3 (explicit human
 * approval) belong to phases 3/4's already-shipped writer/reviewer pairs;
 * AC-5 (visual loop) is deferred to phase 6):
 *
 *   AC-4 / AC-A1 (Inert when off — this phase's own new instruction blocks)
 *     — every one of this phase's conditional additions across
 *     plan-writer.md, plan-reviewer.md, prd-writer.md, prd-reviewer.md,
 *     plan-template.md, prd-template.md, and relay-plan.md states its own
 *     explicit "unchanged / byte-identical / not emitted / zero-emission
 *     when figma_track (or design_source) is off" fallback in prose — no
 *     design_source row, no Design Source section, no new rubric row, no
 *     new HALT fires for a project where figma_track is absent or false.
 *   AC-4 / AC-A2 (plan-reviewer never infers design_source) —
 *     R-COH-DESIGN-SOURCE-MISSING's Present/Absent branches and its
 *     explicit divergence statement from the phase_type Phase-0 self-heal
 *     precedent; R2's dual-branch heading-presence/absence mismatch rule.
 *   AC-4 / AC-A3 (every Implementation Phases row gets a Design Source
 *     declaration) — prd-writer.md's item 7.5 Q&A and Step 7.4 15.5 section
 *     assembly both mandate zero silent omissions; prd-reviewer.md's
 *     R-COH-DESIGN-SOURCE-INCOMPLETE fails on any row-count mismatch or
 *     empty Declaration cell.
 *
 * Lifecycle update (2026-07-25, EXISTING_TEST_UPDATED, performed by the
 * figma-visual-first-track Phase 3 test-writer session): Phase 3 of the
 * separate figma-visual-first-track feature (v2,
 * PRPs/prds/figma-visual-first-track.prd.md, unrelated to this v1 feature
 * except for sharing plan-reviewer.md as a read target) inserted a new
 * R-COH-VISUAL-SCOPE-PURITY check into plan-reviewer.md and rewrote the
 * "## The R-COH-* coherence layer" rubric[]-length-range paragraph this
 * file's own AC-4/AC-A1 "states the rubric[] length range stays the exact
 * 14-19-row baseline..." test (below) reads, to account for a 3rd
 * conditional deterministic row. Confirmed broken by directly reading the
 * post-diff plan-reviewer.md content (not assumed — independently
 * corroborated by a dedicated search pass before this fix was made): the
 * paragraph's closing sentence changed from "both are zero-emission
 * (contribute nothing) when their own gating condition is not met, so the
 * baseline 14–19 range is exact for every non-Figma project." to "Each of
 * the three conditional rows is independently zero-emission (contributes
 * nothing) when its own gating condition is not met, so the baseline 14–19
 * range is exact for every non-Figma project, and the 14–21 range from the
 * prior `design_source` shipment remains exact for a `figma_track: true`
 * project whose plan is not `phase_scope: visual`." The underlying property
 * this test verifies (non-Figma projects keep the exact 14-19 baseline
 * because every conditional row is independently zero-emission) is still
 * fully true — only the wording grew a third conditional row and a
 * trailing clause. Anti-weakening check: the fix below *replaces* the one
 * now-stale regex with a new one matching the current wording of the SAME
 * claim; no assertion is dropped, no scope is narrowed. Full justification
 * recorded in PRPs/reports/figma-visual-first-track/test-suite.diff's
 * Lifecycle ledger (phase 3 revision).
 *
 * Lifecycle update (2026-07-26, EXISTING_TEST_UPDATED, performed by the
 * figma-visual-first-track Phase 4 test-writer session): Phase 4 of the
 * same figma-visual-first-track feature rewrote the SAME rubric[]-length-
 * range paragraph again — Task 8 of that phase's plan replaced "Each of the
 * three conditional rows is independently zero-emission..." with "Each of
 * the four conditional rows is independently zero-emission..." (a new
 * mutually-exclusive R-COH-SENTINEL-RESOLUTION-MISSING row now joins
 * R-COH-VISUAL-SCOPE-PURITY as the 3rd conditional slot, plus the two
 * design_source rows and the K=5 pass make four conditional row classes
 * total). Confirmed broken by directly reading the post-diff
 * plan-reviewer.md content (independently corroborated by a dedicated
 * search-agent pass before this fix was made): the regex below matched
 * "three" literally, which no longer appears in that sentence. The
 * underlying property this test verifies (non-Figma projects keep the
 * exact 14-19 baseline because every conditional row is independently
 * zero-emission) is still fully true — only the row-class count word
 * changed. Anti-weakening check: the fix below changes exactly the one
 * word ("three" → "four") inside the existing regex; the matched span, its
 * start anchor, and its end anchor are otherwise byte-identical, so no
 * assertion is dropped and no scope is narrowed. Full justification
 * recorded in PRPs/reports/figma-visual-first-track/test-suite.diff's
 * Lifecycle ledger (phase 4 revision).
 *
 * Lifecycle update (2026-07-26, EXISTING_TEST_UPDATED, performed by the
 * plan-reviewer-action-validate-contradiction-check test-writer session,
 * test-after per docs/context/methodology.md — a distinct session from the
 * figma-visual-first-track Phase 4 one recorded immediately above, though
 * also dated 2026-07-26): the standalone
 * plan-reviewer-action-validate-contradiction-check plan (description
 * mode, no source PRD;
 * PRPs/plans/completed/plan-reviewer-action-validate-contradiction-check.plan.md)
 * added a 7th FIXED deterministic R-COH-* check
 * (R-COH-ACTION-VALIDATE-CONTRADICTION) to plan-reviewer.md and rewrote
 * the SAME rubric[]-length-range paragraph this file's own AC-4/AC-A1
 * "states the rubric[] length range stays the exact 14-19-row
 * baseline..." test (below) reads, shifting the baseline numeral from
 * `14 to 19 rows` to `15 to 20 rows` (the maximal case also shifts, from
 * 14 to 22 to 15 to 23, but that numeral is not exercised by this file's
 * own regex). Confirmed broken by directly reading the post-diff
 * plan-reviewer.md content: the baseline sentence now reads "8 (R1-R8) +
 * 7 (deterministic R-COH-*) + up to 5 (K=5 pass) = 15 to 20 rows" and the
 * closing sentence now reads "...so the baseline 15-20 range is exact for
 * every non-Figma project...". The underlying property this test verifies
 * (non-Figma projects keep the exact baseline range because every
 * conditional row is independently zero-emission) is still fully true —
 * only the baseline numeral moved; the "four conditional rows" wording
 * this test's own regex also matches is UNCHANGED by this shipment (the
 * new check is FIXED, not a fifth conditional row), so that portion of
 * the regex needs no edit. Anti-weakening check: the fix below changes
 * exactly the one numeral pair ("14–19" to "15–20") inside the existing
 * regex; the matched span, its start anchor, and its end anchor are
 * otherwise byte-identical, so no assertion is dropped and no scope is
 * narrowed. Per this file's own established convention (see the two
 * Lifecycle update paragraphs above, both of which scoped their diff to
 * the regex only), the test title is intentionally left as-is — only the
 * regex numeral is updated. Full justification recorded in
 * PRPs/reports/plan-reviewer-action-validate-contradiction-check/test-suite.diff's
 * Lifecycle ledger.
 *
 * Lifecycle update (2026-07-28, EXISTING_TEST_UPDATED, performed by the
 * add-an-8th-fixed-deterministic-check-r-coh-validate-search test-writer
 * session, test-after per docs/context/methodology.md): the standalone
 * add-an-8th-fixed-deterministic-check-r-coh-validate-search plan
 * (description mode, no source PRD;
 * PRPs/plans/add-an-8th-fixed-deterministic-check-r-coh-validate-search.plan.md)
 * added an 8th FIXED deterministic R-COH-* check
 * (R-COH-VALIDATE-SEARCH-AMBIGUOUS, positioned after
 * R-COH-ACTION-VALIDATE-CONTRADICTION and before R-COH-DESIGN-SOURCE-MISSING)
 * to plan-reviewer.md and rewrote the SAME rubric[]-length-range paragraph
 * this file's own AC-4/AC-A1 "states the rubric[] length range stays the
 * exact ...-row baseline..." test (below) reads, shifting the baseline
 * numeral from `15–20` to `16–21` (the maximal case also shifts, from
 * 15 to 23 to 16 to 24, but that numeral is not exercised by this file's
 * own regex). Confirmed broken by directly reading the post-diff
 * plan-reviewer.md content: the closing sentence now reads "...so the
 * baseline 16–21 range is exact for every non-Figma project...". The
 * underlying property this test verifies (non-Figma projects keep the
 * exact baseline range because every conditional row is independently
 * zero-emission) is still fully true — only the baseline numeral moved;
 * the "four conditional rows" wording this test's own regex also matches
 * is UNCHANGED by this shipment (the new check is FIXED, not a fifth
 * conditional row), so that portion of the regex needs no edit.
 * Anti-weakening check: the fix below changes exactly the one numeral
 * pair ("15–20" to "16–21") inside the existing regex; the matched span,
 * its start anchor, and its end anchor are otherwise byte-identical, so
 * no assertion is dropped and no scope is narrowed.
 *
 * Departing from this file's own prior established convention (see the
 * three Lifecycle update paragraphs above, all of which scoped their diff
 * to the regex only and left the test title untouched): this revision
 * ALSO updates the test title, which by this point was three generations
 * stale ("14-19-row baseline" from the very first shift, and "the two new
 * conditional rows" — a count that grew from two to four across the
 * [2026-07-25] and [2026-07-26] Phase 4 shifts recorded above, neither
 * reflected in the title). `test-reviewer`, reviewing this same session's
 * own new plan-reviewer-validate-search-ambiguous-check.test.mjs file,
 * flagged the drift as a genuine, free-to-fix hygiene defect rather than
 * a rubric failure. Sibling file figma-visual-first-track-phase3.test.mjs
 * already updates its own analogous test's title alongside its assertions
 * on every revision (its own Lifecycle-update paragraphs record this
 * explicitly); bringing this file's practice into alignment with that
 * established sibling precedent — rather than perpetuating an unprincipled
 * divergence between the two files for the same underlying pattern — is
 * the judgment call made here. The title now reads "...stays the exact
 * 16-21-row baseline for every non-Figma project — each of the four
 * conditional rows is independently zero-emission and widens the range
 * only when its own gating condition is met", accurately describing the
 * CURRENTLY enforced behavior. No assertion or scope changed — title-only
 * edit, a documentation-accuracy improvement alongside the regex fix.
 * Full justification recorded in
 * PRPs/reports/add-an-8th-fixed-deterministic-check-r-coh-validate-search/test-suite.diff's
 * Lifecycle ledger.
 *
 * Lifecycle update (2026-07-28, EXISTING_TEST_UPDATED, performed by the
 * rubric-reconciliation test-writer session, test-after per
 * docs/context/methodology.md): the standalone
 * "reconcile-three-independently-authored-extensions-to-plugin" description-
 * mode plan (no source PRD;
 * PRPs/plans/completed/reconcile-three-independently-authored-extensions-to-plugin.plan.md)
 * merged origin/development into feature/figma-implementation-track,
 * bringing in a 9th FIXED deterministic check
 * (R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE) alongside the two this branch had
 * already shipped, and rewrote the SAME rubric[]-length-range paragraph this
 * file's own AC-4/AC-A1 "states the rubric[] length range stays the exact
 * ...-row baseline..." test (below) reads, shifting the baseline numeral
 * from `16 to 21 rows` to `17 to 22 rows` (the maximal case also shifts,
 * from 16 to 24 to 17 to 25, but that numeral is not exercised by this
 * file's own regex). Confirmed broken by directly reading the post-merge
 * plan-reviewer.md content: the paragraph now reads "8 (R1-R8) + 9
 * (deterministic R-COH-*) + up to 5 (K=5 pass) = 17 to 22 rows" and "the
 * baseline 17-22 range is exact ... and the 17-24 range from the prior".
 * The underlying property this test verifies (the baseline is exact for
 * non-Figma projects; the four conditional rows remain each independently
 * zero-emission) is still fully true — only the numeral moved; the "four
 * conditional rows" wording itself is UNCHANGED by this shipment (the new
 * check is FIXED, not a fifth conditional row). Anti-weakening check: the
 * fix below *replaces* the one now-stale regex literal (plus the test
 * title's own numerals, matching this file's own established convention of
 * updating the title alongside the assertions) with the new one matching
 * the current wording of the SAME claim; no assertion is dropped, no scope
 * is narrowed. Full justification recorded in
 * PRPs/reports/rubric-reconciliation/test-suite.diff's Lifecycle ledger.
 *
 * Run: node --test scripts/validate/checks/figma-track-phase5.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_WRITER_PATH = 'plugins/relay/agents/plan-writer.md';
const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';
const PRD_WRITER_PATH = 'plugins/relay/agents/prd-writer.md';
const PRD_REVIEWER_PATH = 'plugins/relay/agents/prd-reviewer.md';
const PLAN_TEMPLATE_PATH = 'docs/context/plan-template.md';
const PRD_TEMPLATE_PATH = 'docs/context/prd-template.md';
const RELAY_PLAN_PATH = 'plugins/relay/commands/relay-plan.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
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
 * strips any Markdown blockquote continuation marker (a leading run of
 * `>` characters, with or without one following space) from the start of
 * each line — otherwise a stray literal "> " gets inserted mid-sentence
 * wherever a blockquote line wraps in the source prose being asserted
 * against (e.g. plan-writer.md's `> \`FAILED_DESIGN_SOURCE_UNDECLARED\`:
 * ...` HALT block, prd-writer.md's `> Please answer for every phase
 * listed...` Q&A block, plan-template.md's `> **Section count
 * reconciliation:** ...` note — all wrap across multiple `>`-prefixed
 * lines). The per-line strip only touches a line's leading `>` run (never
 * an inline `>` mid-sentence), so non-blockquote content is unaffected.
 * Mirrors figma-track-phase1/3/4.test.mjs's helper of the same name/shape,
 * extended here to normalize wrapped blockquote prose.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  const withoutBlockquoteMarkers = str
    .split('\n')
    .map((line) => line.replace(/^\s*>+\s?/, ''))
    .join('\n');
  return withoutBlockquoteMarkers.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1/3/4.test.mjs's
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

// ---------------------------------------------------------------------------
// AC-4 / AC-A1 — Inert when off: every conditional block this phase adds
// states its own explicit "unchanged when figma_track/design_source is off"
// fallback.
// ---------------------------------------------------------------------------

test('AC-4/AC-A1: plan-writer.md Step 4.4 item 5 sources design_source non-heuristically (never inferred), HALTs FAILED_DESIGN_SOURCE_UNDECLARED when undeclared, and leaves the Metadata table byte-identical to today when figma_track is false/absent', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    "Conditionally, when the target's `docs/context/methodology.md`",
    '6. `## Mandatory Reading`'
  );
  assert.ok(block, 'expected an extractable design_source Metadata-row sourcing block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /row to the same Metadata table — sourced as follows, NEVER inferred from plan content the way `phase_type` is/
  );
  assert.match(collapsed, /HALT with:/);
  assert.match(
    collapsed,
    /`FAILED_DESIGN_SOURCE_UNDECLARED`: the target project declares `figma_track: true`, but no `design_source` declaration could be sourced for this phase\./
  );
  assert.match(
    collapsed,
    /Do NOT write a DRAFT in this case\. Do NOT default `design_source` to `none` when `figma_track: true` and the declaration is missing/
  );
  assert.match(
    collapsed,
    /When `figma_track` is `false` or absent, `design_source` is not added at all — the Metadata table is byte-identical to today\./
  );
});

test('AC-4/AC-A1: plan-writer.md Step 4.3.5 emits the conditional ## Design Source section only when design_source: figma, and emits NOTHING (no heading, no placeholder) otherwise, preserving the 15-section byte-identical plan body', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    '### Step 4.3.5 — Design Source section (conditional)',
    '### Step 4.4 — Body sections (14 mandatory)'
  );
  assert.ok(block, 'expected an extractable Step 4.3.5 block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /When `design_source: none` or the key is absent from Metadata \(`figma_track` off\), emit NOTHING — no `## Design Source` heading, no placeholder, no empty section\./
  );
  assert.match(collapsed, /a non-Figma plan's section list stays byte-identical to today's 15 sections\./);
});

test('AC-4/AC-A1: plan-writer.md Phase 2 GROUNDING dispatches research-design as a conditional THIRD parallel Task call only when a design_spec_path is available, and is EXACTLY the existing two calls (unchanged) when absent', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);

  const dispatchBlock = sliceBetween(
    content,
    '- `subagent_type: research-design`',
    "Parse each subagent's returned JSON block per the contract in"
  );
  assert.ok(dispatchBlock, 'expected an extractable research-design conditional dispatch bullet');
  assert.match(
    collapseWs(dispatchBlock),
    /when absent, the dispatch is EXACTLY the existing two calls above — unchanged from today/
  );

  const handleBlock = sliceBetween(
    content,
    "Parse each subagent's returned JSON block per the contract in",
    'No user dialogue. The plan-writer never asks the user to refine'
  );
  assert.ok(handleBlock, 'expected an extractable findings-parsing contract block');
  assert.match(
    collapseWs(handleBlock),
    /All three share the same `\{findings, gaps, degradation_reason, scope_cap_reached\}` return shape, so no special-casing is required for the conditional third subagent\./
  );
});

test('AC-4/AC-A1: plan-reviewer.md R-COH-DESIGN-SOURCE-MISSING is a zero-emission no-op (not even a passed:true row) when figma_track is false/absent, keeping a non-Figma plan\'s rubric[] array byte-identical to today', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active',
    '#### R-COH-DESIGN-GROUNDED — UI/frontend tasks reference the Design Source frame set'
  );
  assert.ok(block, 'expected an extractable R-COH-DESIGN-SOURCE-MISSING block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /if `figma_track` is `false`, absent, or `methodology\.md` itself is missing, emit NO row at all for this check — not even a `passed: true` row — keeping a non-Figma plan's `rubric\[\]` array byte-identical to today\. Do NOT fail in this case\./
  );
});

test('AC-4/AC-A1: plan-reviewer.md R-COH-DESIGN-GROUNDED is a zero-emission no-op when ## Design Source is absent from the plan (the common figma_track-off case)', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-DESIGN-GROUNDED — UI/frontend tasks reference the Design Source frame set',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-DESIGN-GROUNDED block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /\*\*Zero-emission branch:\*\* if `## Design Source` is absent from the plan \(the common case — `figma_track` off, or `design_source: none`\), emit NO row at all for this check, mirroring `R-COH-VALIDATE-FRAMEWORK-MISMATCH`'s silent-degradation-branch precedent for an empty `test_frameworks` array\. Do NOT fail in this case\./
  );
});

test('AC-4/AC-A1: plan-reviewer.md states the rubric[] length range stays the exact 18-23-row baseline for every non-Figma project — each of the four conditional rows is independently zero-emission and widens the range only when its own gating condition is met', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    'The total `rubric[]` length per run is',
    'When the K=5 pass emits N findings'
  );
  assert.ok(block, 'expected an extractable rubric[] length-range paragraph');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /for a project where\s*`figma_track` is absent\/`false` \(the baseline case — unchanged from before this section existed\)\./
  );
  assert.match(
    collapsed,
    /Each of the four conditional rows is independently zero-emission \(contributes nothing\) when its own gating condition is not met, so the baseline 18–23 range is exact for every non-Figma project/
  );
});

test('AC-4/AC-A1: prd-writer.md item 7.5 (per-phase Figma Q&A) and Step 7.4 15.5 (## Design Source assembly) are both silent no-ops that emit nothing when figma_track is false/absent', () => {
  const content = readRepoFile(PRD_WRITER_PATH);

  const item75 = sliceBetween(
    content,
    '**Item 7.5 — Per-phase Figma declaration (conditional, `figma_track:',
    'If the user leaves an item deferred'
  );
  assert.ok(item75, 'expected an extractable item 7.5 block');
  assert.match(
    collapseWs(item75),
    /When `figma_track` is `false` or absent, item 7\.5 is a silent no-op — Phase 6 proceeds exactly as it does today; no additional question is asked\./
  );

  const step74item = sliceBetween(content, '15.5. `## Design Source` (conditional — only when', '16. Decisions Log');
  assert.ok(step74item, 'expected an extractable Step 7.4 item 15.5 block');
  assert.match(
    collapseWs(step74item),
    /When `figma_track` is `false` or absent, this section is NOT emitted at all — no heading, no placeholder\./
  );
});

test('AC-4/AC-A1: prd-reviewer.md R-COH-DESIGN-SOURCE-INCOMPLETE is a zero-emission no-op when ## Design Source is absent from the PRD (the common figma_track-off case)', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-DESIGN-SOURCE-INCOMPLETE — every Implementation Phases row has a Design Source declaration',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-DESIGN-SOURCE-INCOMPLETE block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /\*\*Zero-emission branch:\*\* if `## Design Source` is absent from the PRD \(the common case — `figma_track` off\), emit NO row at all for this check\. Do NOT fail in this case\./
  );
});

test('AC-4/AC-A1: plan-template.md registers design_source/## Design Source as strictly conditional — 16 sections only when figma_track: true AND design_source: figma, fixed 15 (byte-identical) otherwise, and the section is Fully ABSENT (not empty) when design_source: none or absent', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);

  const reconciliation = sliceBetween(
    content,
    '> the template treats Source as a first-class section. A plan whose',
    '```markdown'
  );
  assert.ok(reconciliation, 'expected an extractable section-count reconciliation note');
  const collapsedReconciliation = collapseWs(reconciliation);
  assert.match(
    collapsedReconciliation,
    /16 sections total for that case only\. Every other plan \(`figma_track` absent\/false, or `design_source: none`\) stays at the fixed 15/
  );
  assert.match(
    collapsedReconciliation,
    /the conditional section adds nothing when absent, preserving the "nothing changes when figma_track is off" invariant\./
  );

  const fieldBlock = sliceBetween(content, '**`design_source` (conditional).**', '7. `## Mandatory Reading`');
  assert.ok(fieldBlock, 'expected an extractable design_source field + conditional section block');
  const collapsedField = collapseWs(fieldBlock);
  assert.match(
    collapsedField,
    /Present \(`figma \| none`\) only when the target project's `docs\/context\/methodology\.md` declares `figma_track: true`; absent entirely otherwise\. Never inferred/
  );
  assert.match(
    collapsedField,
    /Fully ABSENT \(not an empty section — no heading at all\) when `design_source: none` or the `design_source` row itself is absent \(i\.e\. `figma_track` off\)\./
  );
});

test('AC-4/AC-A1: prd-template.md registers ## Design Source as present ONLY when figma_track: true, and absent entirely (not an empty section) when figma_track is false/absent', () => {
  const content = readRepoFile(PRD_TEMPLATE_PATH);
  const block = sliceBetween(content, "*(Conditional — present ONLY when the target project's", '## Decisions Log');
  assert.ok(block, 'expected an extractable ## Design Source registration block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /present ONLY when the target project's `docs\/context\/methodology\.md` declares `figma_track: true`; absent entirely, not an empty section, when `figma_track` is `false` or absent\./
  );
});

test('AC-4/AC-A1: relay-plan.md\'s flags-first preamble defaults no_figma_flag to false and design_spec_override to null when neither flag is present, so a flag-less invocation\'s residual string equals $ARGUMENTS unchanged and mode detection is unaffected', () => {
  const content = readRepoFile(RELAY_PLAN_PATH);
  const block = sliceBetween(
    content,
    '### Step 0.0 — Parse arguments — extract flags first',
    '### Step 0.1 — Blank-check and mode detection'
  );
  assert.ok(block, 'expected an extractable Step 0.0 flags-first preamble block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /Before any blank-check or mode detection, scan the raw `\$ARGUMENTS` string for two optional flags and strip them, leaving a residual string that Step 0\.1's blank-check and the Detection step below operate on — never the raw `\$ARGUMENTS`\./
  );
  assert.match(collapsed, /Absent → `no_figma_flag = false`\./);
  assert.match(collapsed, /Absent → `design_spec_override = null`\./);
});

// ---------------------------------------------------------------------------
// AC-4 / AC-A2 — plan-reviewer never infers design_source (deliberate
// divergence from the phase_type self-healing precedent).
// ---------------------------------------------------------------------------

test('AC-4/AC-A2: plan-reviewer.md\'s R-COH-DESIGN-SOURCE-MISSING states its deliberate divergence from phase_type\'s self-healing, never inserts or infers a value, and is READ-ONLY (never performs an Edit) — an absent design_source under figma_track: true is always CHANGES_REQUESTED, never self-healed', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active',
    '#### R-COH-DESIGN-GROUNDED — UI/frontend tasks reference the Design Source frame set'
  );
  assert.ok(block, 'expected an extractable R-COH-DESIGN-SOURCE-MISSING block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /\*\*Deliberate divergence from Phase 0's `phase_type` behavior — stated explicitly:\*\* "has Figma or not" is a business decision the reviewer cannot manufacture on the plan-writer's behalf/
  );
  assert.match(
    collapsed,
    /This check does NOT insert or infer a `design_source` value under any circumstance — an absence is recorded as a structural defect, full stop\./
  );
  assert.match(
    collapsed,
    /"reason": "target project declares figma_track: true but the plan's Metadata table has no design_source row; plan-reviewer does NOT insert or infer this value the way it does phase_type — re-run plan-writer or hand-edit the declaration"/
  );
  assert.match(
    collapsed,
    /This check is READ-ONLY\. Unlike Phase 0's `phase_type` pre-pass, it never performs an `Edit` — an absent `design_source` under `figma_track: true` is always a CHANGES_REQUESTED-triggering structural defect, never a self-healing opportunity\./
  );
});

test('AC-4/AC-A2: plan-reviewer.md R2\'s dual-branch note on item 6 fails the review when the Metadata design_source row and the ## Design Source section\'s presence/absence disagree, in either direction', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '**Conditional `## Design Source` dual-branch note', '7. `## Mandatory Reading`');
  assert.ok(block, 'expected an extractable R2 item-6 dual-branch note');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /When the plan's Metadata `design_source` row reads `figma`, `## Design Source` MUST appear immediately after `## Metadata`, before `## Mandatory Reading`; when `design_source` reads `none` or is absent, `## Design Source` MUST be absent\./
  );
  assert.match(
    collapsed,
    /A mismatch between the two \(row says `figma` but the section is missing, or vice versa\) fails R2\./
  );
});

// ---------------------------------------------------------------------------
// AC-4 / AC-A3 — every Implementation Phases row gets a Design Source
// declaration; no phase may be silently omitted.
// ---------------------------------------------------------------------------

test('AC-4/AC-A3: prd-writer.md item 7.5 requires an answer for EVERY phase listed, including phases that don\'t obviously look like frontend work, with none silently skipped', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(
    content,
    '**Item 7.5 — Per-phase Figma declaration (conditional, `figma_track:',
    'If the user leaves an item deferred'
  );
  assert.ok(block, 'expected an extractable item 7.5 block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /Please answer for every phase listed — including phases that don't obviously look like frontend work/
  );
  assert.match(collapsed, /Every phase gets an answer; none may be silently skipped\./);
});

test('AC-4/AC-A3: prd-writer.md Step 7.4 item 15.5 mandates one Design Source declaration row per Implementation Phases row — every phase row MUST have a corresponding declaration, never omitted', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '15.5. `## Design Source` (conditional — only when', '16. Decisions Log');
  assert.ok(block, 'expected an extractable Step 7.4 item 15.5 block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /Every phase row MUST have a corresponding declaration row — never omit one, including phases that don't obviously look like frontend work\./
  );
});

test('AC-4/AC-A3: prd-template.md\'s ## Design Source table requires one row per Implementation Phases row with no phase silently omitted', () => {
  const content = readRepoFile(PRD_TEMPLATE_PATH);
  const block = sliceBetween(content, "*(Conditional — present ONLY when the target project's", '## Decisions Log');
  assert.ok(block, 'expected an extractable ## Design Source registration block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /One row per `## Implementation Phases` table row above — no phase may be silently omitted, including phases that don't obviously look like frontend work:/
  );
});

test('AC-4/AC-A3: prd-reviewer.md\'s R-COH-DESIGN-SOURCE-INCOMPLETE fails on a row-count mismatch (naming the missing phase number(s)) or on any empty Declaration cell, when ## Design Source is present', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-DESIGN-SOURCE-INCOMPLETE — every Implementation Phases row has a Design Source declaration',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-DESIGN-SOURCE-INCOMPLETE block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /\*\*Row-count mismatch\*\* → fail\. `reason` states both counts and names the missing phase number\(s\)/
  );
  assert.match(
    collapsed,
    /\*\*Row counts match, but a `Declaration` cell is empty for any row\*\* → fail\. `reason` names the phase number\(s\) with an empty `Declaration` cell\./
  );
});
