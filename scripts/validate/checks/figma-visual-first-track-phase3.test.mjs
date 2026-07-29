// @ts-check
/**
 * Content-invariant tests for Phase 3 ("Plan authoring — visual phase") of
 * the figma-visual-first-track feature (v2 of relay's Figma Implementation
 * Track) — plan-writer.md's new non-heuristic phase_scope sourcing (Step
 * 4.4 item 5, mirroring design_source's exact lineage) with its
 * FAILED_PHASE_SCOPE_UNDECLARED HALT, new Hard Constraint #12 and Step 4.4
 * item 10 task-restriction rule (bounded forbidden-vocabulary denylist +
 * mandatory type-matched [RELAY-MOCK-DATA]/[RELAY-MOCK-BEHAVIOR] sentinel
 * naming) for phase_scope: visual plans, the item 6 mandatory
 * mock-sentinels.md Mandatory Reading rule, and a new anti-pattern bullet;
 * plan-reviewer.md's new deterministic R-COH-VISUAL-SCOPE-PURITY check
 * (zero-emission/otherwise, mirroring R-COH-DESIGN-SOURCE-MISSING /
 * R-COH-DESIGN-GROUNDED's shape) plus its widened 14-to-22-row rubric-count
 * prose; docs/context/plan-template.md's phase_scope stub resolved into the
 * real sourcing mechanism + HALT shape; and documentation/changelog.html's
 * Unreleased entry.
 *
 * Source PRD: PRPs/prds/figma-visual-first-track.prd.md
 * Source plan: PRPs/plans/completed/figma-visual-first-track-phase-3-plan-visual.plan.md
 * Diff reviewed: PRPs/reports/figma-visual-first-track/phase-3/attempts/1/diff.patch (4 files)
 *
 * Same idiom as figma-visual-first-track-phase1/2.test.mjs: every file this
 * phase touches is prompt/template/prose markdown (or HTML) with no
 * companion production module for its content, so these are
 * readFileSync-based content assertions against the real, already-
 * implemented files — not fixture-driven unit tests, EXCEPT for one
 * dedicated, clearly-disclaimed section (see "WHAT THIS DOES AND DOES NOT
 * PROVE" below AC-A2's content-invariant tests) added specifically to close
 * a gap code review flagged against this feature's own PRD Phase-3 success
 * signal.
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file's target-path constants, then
 * investigated every file that reads plugins/relay/agents/plan-writer.md,
 * plugins/relay/agents/plan-reviewer.md, or docs/context/plan-template.md; a
 * background search-agent sweep independently corroborated every finding
 * below before this file was authored):
 *   - figma-visual-first-track-phase1.test.mjs:295-302 and :304-313 already
 *     cover this SAME phase_scope Metadata-row paragraph in
 *     docs/context/plan-template.md, for three properties this phase's diff
 *     left untouched (the conditional-gate statement, the never-inferred /
 *     design_source-lineage-mirroring statement, and the no-companion-
 *     section statement) — confirmed still green by direct comparison
 *     against the post-diff file content. NOT duplicated here. The
 *     missing-property delta this file supplies instead: the concrete
 *     sourcing mechanism (row N's Phase-cell bracket tag) and the
 *     FAILED_PHASE_SCOPE_UNDECLARED HALT summary, plus the entirely new
 *     "What phase_scope: visual implies for the plan body" paragraph — none
 *     of which existed when Phase 1 authored its forward-reference stub.
 *   - figma-visual-first-track-phase2.test.mjs:288-298's first AC-A2 test
 *     already covers the general "R-COH-* failures produce
 *     verdict: CHANGES_REQUESTED the same way R1-R7 failures do" rule
 *     (plan-reviewer.md's "## The R-COH-* coherence layer" intro block,
 *     untouched by this phase's diff) — EXISTING_TEST_COVERS, not
 *     duplicated here.
 *   - Neither figma-visual-first-track-phase1.test.mjs nor
 *     figma-visual-first-track-phase2.test.mjs reads
 *     plugins/relay/agents/plan-writer.md or
 *     plugins/relay/agents/plan-reviewer.md content at all (confirmed
 *     directly and via independent agent corroboration) — every property of
 *     those two files this phase's diff touches is therefore virgin
 *     territory; NEW_TEST_REQUIRED throughout.
 *   - CONFIRMED REGRESSION, fixed this session (EXISTING_TEST_UPDATED, in a
 *     file this phase does NOT otherwise touch):
 *     scripts/validate/checks/figma-track-phase5.test.mjs (a v1
 *     figma-implementation-track file, unrelated to this v2 feature except
 *     for sharing plan-reviewer.md as a read target) contained a test
 *     asserting the pre-Phase-3 wording of plan-reviewer.md's rubric[]
 *     length-range paragraph. This phase's Task 7 rewrote that sentence to
 *     accommodate a 3rd conditional row. Confirmed broken by direct textual
 *     comparison against the real post-diff file, independently
 *     corroborated by a background search agent. The underlying property is
 *     still fully true; only the wording changed. Fixed in place — see that
 *     file's own new Lifecycle-update paragraph and this session's
 *     Lifecycle ledger in PRPs/reports/figma-visual-first-track/test-suite.diff.
 *
 * Lifecycle update (2026-07-26, EXISTING_TEST_UPDATED, performed by the
 * figma-visual-first-track Phase 4 test-writer session): Phase 4 of this
 * same feature (Task 8 of its plan) rewrote the SAME rubric[]-length-range
 * paragraph this file's own AC-A2 "widens the rubric[] length-range prose to
 * 14-22 rows..." test (below) reads, to account for a 4th conditional row
 * class (R-COH-SENTINEL-RESOLUTION-MISSING, mutually exclusive with this
 * phase's own R-COH-VISUAL-SCOPE-PURITY). Confirmed broken by directly
 * reading the post-diff plan-reviewer.md content (independently
 * corroborated by a dedicated search-agent pass before this fix was made):
 * the paragraph no longer says "a 3rd conditional deterministic row
 * (`R-COH-VISUAL-SCOPE-PURITY`) may also appear... (all three conditional
 * rows present at once)" — it now says "exactly one of two
 * mutually-exclusive 3rd conditional deterministic rows may also appear:
 * `R-COH-VISUAL-SCOPE-PURITY`... or `R-COH-SENTINEL-RESOLUTION-MISSING`...
 * since a single plan's `phase_scope` cell carries exactly one value and can
 * never be both at once", and the closing sentence now says "Each of the
 * four conditional rows..." (not "three") and "...project whose plan has no
 * `phase_scope` row at all (neither `visual` nor `logic`...)" (not "...is
 * not `phase_scope: visual`"). The underlying property this test verifies
 * (the maximal range is 14-22, never 14-23, because the two phase_scope
 * rows are mutually exclusive; the 14-19/14-21 baselines are preserved) is
 * still fully true — only the wording grew a 4th conditional row class.
 * Anti-weakening check: the fix below *replaces* the two now-stale
 * `collapsed.includes(...)` string literals (plus the test title) with new
 * ones matching the current wording of the SAME claim; no assertion is
 * dropped, no scope is narrowed. Full justification recorded in
 * PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle ledger
 * (phase 4 revision).
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
 * (R-COH-ACTION-VALIDATE-CONTRADICTION, positioned after
 * R-COH-VALIDATE-ALWAYS-PASS and before R-COH-DESIGN-SOURCE-MISSING) to
 * plan-reviewer.md and rewrote the SAME rubric[]-length-range paragraph
 * this file's own AC-A2 "widens the rubric[] length-range prose to 14-22
 * rows..." test (below) reads, shifting every numeral: baseline
 * `14 to 19 rows` becomes `15 to 20 rows`, maximal `14 to 22 rows`
 * becomes `15 to 23 rows`, "23rd row" becomes "24th row", and the
 * preserved range shifts from 14-21 to 15-22. Confirmed broken by
 * directly reading the post-diff plan-reviewer.md content: the paragraph
 * now reads "8 (R1-R8) + 7 (deterministic R-COH-*) + up to 5 (K=5 pass) =
 * 15 to 20 rows" and "widen the range to `15 to 23 rows` ... the range
 * never extends to a 24th row" and "the baseline 15-20 range is exact ...
 * and the 15-22 range from the prior". The underlying properties this
 * test verifies (the maximal range never reaches the next-forbidden row;
 * the baseline is exact for non-Figma projects; the four conditional rows
 * remain each independently zero-emission) are still fully true — only
 * the numerals moved; the "four conditional rows" wording itself is
 * UNCHANGED by this shipment, since the new check is FIXED, not a fifth
 * conditional row. Anti-weakening check: the fix below *replaces* the
 * four now-stale numeral literals (plus the test title's own numerals,
 * matching this file's own established convention of updating the title
 * alongside the assertions) with the new ones matching the current
 * wording of the SAME claim; no assertion is dropped, no scope is
 * narrowed. Full justification recorded in
 * PRPs/reports/plan-reviewer-action-validate-contradiction-check/test-suite.diff's
 * Lifecycle ledger.
 *
 * Lifecycle update (2026-07-28, EXISTING_TEST_UPDATED, performed by the
 * add-an-8th-fixed-deterministic-check-r-coh-validate-search test-writer
 * session, test-after per docs/context/methodology.md — a distinct
 * session from the two 2026-07-26 ones recorded immediately above): the
 * standalone add-an-8th-fixed-deterministic-check-r-coh-validate-search
 * plan (description mode, no source PRD;
 * PRPs/plans/add-an-8th-fixed-deterministic-check-r-coh-validate-search.plan.md)
 * added an 8th FIXED deterministic R-COH-* check
 * (R-COH-VALIDATE-SEARCH-AMBIGUOUS, positioned after
 * R-COH-ACTION-VALIDATE-CONTRADICTION and before R-COH-DESIGN-SOURCE-MISSING)
 * to plan-reviewer.md and rewrote the SAME rubric[]-length-range paragraph
 * this file's own AC-A2 "widens the rubric[] length-range prose to ...
 * rows..." test (below) reads, shifting every numeral: baseline
 * `15 to 20 rows` becomes `16 to 21 rows`, maximal `15 to 23 rows`
 * becomes `16 to 24 rows`, "24th row" becomes "25th row", and the
 * preserved range shifts from 15–22 to 16–23. Confirmed broken by
 * directly reading the post-diff plan-reviewer.md content: the paragraph
 * now reads "8 (R1-R8) + 8 (deterministic R-COH-*) + up to 5 (K=5 pass) =
 * 16 to 21 rows" and "widen the range to `16 to 24 rows` ... the range
 * never extends to a 25th row" and "the baseline 16-21 range is exact ...
 * and the 16-23 range from the prior". The underlying properties this
 * test verifies (the maximal range never reaches the next-forbidden row;
 * the baseline is exact for non-Figma projects; the four conditional rows
 * remain each independently zero-emission) are still fully true — only
 * the numerals moved; the "four conditional rows" wording itself is
 * UNCHANGED by this shipment, since the new check is FIXED, not a fifth
 * conditional row. Anti-weakening check: the fix below *replaces* the
 * four now-stale numeral literals (plus the test title's own numerals,
 * matching this file's own established convention of updating the title
 * alongside the assertions) with the new ones matching the current
 * wording of the SAME claim; no assertion is dropped, no scope is
 * narrowed. Full justification recorded in
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
 * adding a 9th FIXED deterministic check (R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE)
 * to the two this branch had already shipped, and rewrote the SAME
 * rubric[]-length-range paragraph this file's own AC-A2 "widens the
 * rubric[] length-range prose to ... rows..." test (below) reads, shifting
 * every numeral: baseline `16 to 21 rows` becomes `17 to 22 rows`, maximal
 * `16 to 24 rows` becomes `17 to 25 rows`, "25th row" becomes "26th row",
 * and the preserved range shifts from 16–23 to 17–24. Confirmed broken by
 * directly reading the post-merge plan-reviewer.md content: the paragraph
 * now reads "8 (R1-R8) + 9 (deterministic R-COH-*) + up to 5 (K=5 pass) =
 * 17 to 22 rows" and "widen the range to `17 to 25 rows` ... the range
 * never extends to a 26th row" and "the baseline 17-22 range is exact ...
 * and the 17-24 range from the prior". The underlying properties this test
 * verifies (the maximal range never reaches the next-forbidden row; the
 * baseline is exact for non-Figma projects; the four conditional rows
 * remain each independently zero-emission) are still fully true — only the
 * numerals moved; the "four conditional rows" wording itself is UNCHANGED
 * by this shipment, since the merged-in check is FIXED, not a fifth
 * conditional row. Anti-weakening check: the fix below *replaces* the four
 * now-stale numeral literals (plus the test title's own numerals, matching
 * this file's own established convention of updating the title alongside
 * the assertions) with the new ones matching the current wording of the
 * SAME claim; no assertion is dropped, no scope is narrowed. Full
 * justification recorded in
 * PRPs/reports/rubric-reconciliation/test-suite.diff's Lifecycle ledger.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 3 plan (Status: IMPLEMENTED, archived to
 * PRPs/plans/completed/ — the established test-after ordering for this
 * repo; the pair runs after the Implementer + Code Review, against the
 * already-landed diff):
 * PRPs/plans/completed/figma-visual-first-track-phase-3-plan-visual.plan.md
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 3's in-scope subset per the plan's own
 * ## Acceptance Criteria section AC-A1 through AC-A5; PRD AC-4, AC-5, AC-6
 * are OUT_OF_PHASE_SCOPE, deferred to phases 5, 4, and 5/6 respectively per
 * the Implementation Phases table — no test for any of them in this file):
 *
 *   AC-A1 (PRD AC-3) — plan-writer's Hard Constraint #12, the task-
 *     restriction rule (forbidden vocabulary + mandatory type-matched
 *     sentinel naming), the anti-pattern bullet, and plan-template.md's new
 *     "what phase_scope: visual implies" paragraph.
 *   AC-A2 (PRD AC-3) — plan-reviewer's new R-COH-VISUAL-SCOPE-PURITY check:
 *     its zero-emission branch, both fail conditions, its passed:true /
 *     known-limitation closing, and the widened rubric-count prose. Plus
 *     two additions beyond the plan's own literal AC text: a cross-file
 *     vocabulary-parity regression net (the plan's own flagged top risk,
 *     its Level 3 Validation Command made permanent), and a fixture-based
 *     rule demonstration closing the gap code review flagged against this
 *     feature's own PRD Phase-3 success signal ("A visual-scoped plan
 *     reviewed against a hand-built fixture correctly fails when a task
 *     implies a side effect") — see the extensive disclaimer comment
 *     immediately above that section for exactly what it does and does not
 *     prove.
 *   AC-A3 (PRD AC-2) — plan-writer's non-heuristic phase_scope sourcing
 *     (Phase 0 read, Step 4.4 item 5 mechanism, the
 *     FAILED_PHASE_SCOPE_UNDECLARED HALT, the no-silent-default guard, the
 *     defense-in-depth framing) and plan-template.md's missing-property
 *     delta over Phase 1's existing coverage.
 *   AC-A4 (PRD AC-1) — inert-when-off across every conditional surface this
 *     phase touches (Hard Constraint #12's off-branch, item 5's byte-
 *     identical-to-today off-branch, item 10's not-applicable closing,
 *     R-COH-VISUAL-SCOPE-PURITY's zero-emission branch), a real dogfood
 *     proof (this feature's own phase 3 plan carries no phase_scope row),
 *     and a path-existence regression-safety net.
 *   AC-A5 (PRD AC-3) — plan-writer's Step 4.4 item 6 mandatory
 *     docs/context/mock-sentinels.md P0 Mandatory Reading row.
 *   (documentation of record, AC-A1..AC-A5) — changelog.html's Unreleased
 *     -> Added entry.
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase3.test.mjs
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
const THIS_PLAN_PATH = 'PRPs/plans/completed/figma-visual-first-track-phase-3-plan-visual.plan.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-visual-first-track-phase1.test.mjs's helper of the same
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
 * if `startNeedle` is absent. Mirrors figma-visual-first-track-phase1.test.mjs's
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
 * figma-visual-first-track-phase1.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Same as collapseWs, but additionally strips leading markdown blockquote
 * `>` markers before collapsing — needed for plan-writer.md's
 * FAILED_PHASE_SCOPE_UNDECLARED HALT block, authored as a multi-line `>`
 * blockquote. Mirrors figma-visual-first-track-phase1.test.mjs's helper of
 * the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseBlockquote(str) {
  return str.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ').trim();
}

/**
 * Mirrors figma-track-phase1.test.mjs's helper of the same name/shape.
 * Locates the nearest `<h2 id="unreleased">` or `<h2 id="v...">` release
 * heading at or before `needleIdx`, and the position where that release
 * section ends (the next such heading, or end of file). A changelog entry
 * recorded under `Unreleased` moves, verbatim and in the same relative order
 * among its siblings, into a versioned heading exactly once — when a release
 * is cut (`documentation/AGENTS.md` §7.3: `Unreleased` is renamed to the new
 * version, and a fresh empty `Unreleased` block is created above it). This
 * helper lets a content-invariant test confirm an entry is recorded inside a
 * well-formed release section without pinning it to the transient
 * pre-release `Unreleased` position, which a release cut always invalidates.
 * @param {string} content
 * @param {number} needleIdx
 * @returns {{ id: string, start: number, end: number } | undefined}
 */
function findEnclosingReleaseSection(content, needleIdx) {
  const h2Re = /<h2 id="(unreleased|v[0-9][^"]*)">/g;
  let match;
  let enclosing;
  while ((match = h2Re.exec(content))) {
    if (match.index > needleIdx) break;
    enclosing = { id: match[1], start: match.index };
  }
  if (!enclosing) return undefined;
  h2Re.lastIndex = enclosing.start + 1;
  const next = h2Re.exec(content);
  return { id: enclosing.id, start: enclosing.start, end: next ? next.index : content.length };
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — plan-writer's task purity: every task in a
// phase_scope: visual plan stays within UI-and-mocks scope, with mandatory
// type-matched sentinel naming.
// ---------------------------------------------------------------------------

test('AC-A1: plan-writer.md registers Hard Constraint #12 (phase_scope: visual task purity), positioned immediately after existing constraint #11, requiring UI-and-mocks-only scope, type-matched sentinel naming, and a forward reference to plan-reviewer\'s R-COH-VISUAL-SCOPE-PURITY check', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);

  const c11Idx = content.indexOf('11. **Validation commands must be able to fail');
  const c12Idx = content.indexOf('12. **`phase_scope: visual` task purity');
  assert.notEqual(c11Idx, -1, 'expected the existing Hard Constraint #11');
  assert.notEqual(c12Idx, -1, 'expected a new Hard Constraint #12');
  assert.ok(c11Idx < c12Idx, 'Hard Constraint #12 must be positioned after #11');

  const block = sliceBetween(content, '12. **`phase_scope: visual` task purity', '## Phase 0 — Setup');
  assert.ok(block, 'expected an extractable Hard Constraint #12 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "(when applicable).** When the plan's `## Metadata` carries `phase_scope: visual`, every task under `## Step-by-Step Tasks` MUST stay within UI-and-mocks scope: no task's `**ACTION**:` prose may imply a real network call, database/persistence write, or real business-logic mutation"
    ),
    'expected the UI-and-mocks-only purity statement'
  );
  assert.ok(
    collapsed.includes(
      "every task that displays a datum or wires an interactive handler MUST name the `[RELAY-MOCK-DATA]` or `[RELAY-MOCK-BEHAVIOR]` sentinel (type-matched: data → `RELAY-MOCK-DATA`, interactive action → `RELAY-MOCK-BEHAVIOR`) it will emit, per `docs/context/mock-sentinels.md`."
    ),
    'expected the type-matched sentinel naming requirement'
  );
  assert.ok(
    collapsed.includes(
      "`plan-reviewer`'s new `R-COH-VISUAL-SCOPE-PURITY` check (Phase 3 of `PRPs/prds/figma-visual-first-track.prd.md`) rejects any plan that violates this."
    ),
    'expected the forward reference to R-COH-VISUAL-SCOPE-PURITY'
  );
});

test('AC-A1: docs/context/plan-template.md registers a new "What phase_scope: visual implies for the plan body" paragraph — UI-and-mocks task restriction + type-matched sentinel naming, cross-referencing mock-sentinels.md and plan-reviewer\'s R-COH-VISUAL-SCOPE-PURITY check', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);
  const block = sliceBetween(
    content,
    '**What `phase_scope: visual` implies for the plan body.**',
    '**Conditional `## Design Source` section'
  );
  assert.ok(block, 'expected an extractable "What phase_scope: visual implies" paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'Every task under `## Step-by-Step Tasks` is restricted to UI-and-mocks scope: no task may imply a real network call, persistence write, or real business-logic mutation, and every data-display or interactive-action task must name the type-matched `[RELAY-MOCK-DATA]` or `[RELAY-MOCK-BEHAVIOR]` sentinel it will emit'
    ),
    'expected the task-restriction summary'
  );
  assert.ok(
    collapsed.includes(
      "see `docs/context/mock-sentinels.md` for the sentinel convention and `plugins/relay/agents/plan-reviewer.md`'s `R-COH-VISUAL-SCOPE-PURITY` check, which structurally enforces the same rule."
    ),
    'expected the cross-reference to mock-sentinels.md and R-COH-VISUAL-SCOPE-PURITY'
  );
});

test('AC-A1: plan-writer.md Step 4.4 item 10 forbids the same bounded side-effect vocabulary (client-call, persistence-method-call, SQL-write, REST-write shapes, and explicit real-side-effect phrases) in a phase_scope: visual plan\'s task ACTION/body prose, explicitly excluding the VALIDATE line/block from the scan', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    '**`phase_scope: visual` task restriction (conditional).**',
    '11. `## Validation Commands`'
  );
  assert.ok(block, 'expected an extractable item 10 task-restriction block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "excluding its `**VALIDATE**:` line/block — a defensive VALIDATE grep for the ABSENCE of one of these tokens is expected and must not itself trip this rule"
    ),
    'expected the VALIDATE-exclusion carve-out'
  );
  assert.ok(
    collapsed.includes(
      'a client-call shape (`fetch(`, `axios`, `XMLHttpRequest`, `WebSocket(`), a persistence-method-call shape (`.save(`, `.persist(`), a SQL-write shape (`INSERT INTO`, `DELETE FROM`, `UPDATE <table> SET`), a REST-write shape (`POST /`, `PUT /`, `PATCH /`, `DELETE /`), or an explicit real-side-effect phrase (`real API call`, `real network call`, `real database`, `writes to the database`, `persists the data`, `calls the real backend/service/server`)'
    ),
    'expected the exact forbidden-vocabulary phrase list'
  );
});

test('AC-A1: plan-writer.md Step 4.4 item 10 mandates type-matched sentinel naming — data-display signal words require RELAY-MOCK-DATA, interactive-action signal words require RELAY-MOCK-BEHAVIOR, both when both classes match, neither forced on a purely structural task', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    '**`phase_scope: visual` task restriction (conditional).**',
    '11. `## Validation Commands`'
  );
  assert.ok(block, 'expected an extractable item 10 task-restriction block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'A task whose `**ACTION**:` line displays or loads a datum (signal words: `display`, `render`, `show`, `populate`, `load`) MUST name the `[RELAY-MOCK-DATA]` sentinel it will emit at that site.'
    ),
    'expected the data-signal sentinel mandate'
  );
  assert.ok(
    collapsed.includes(
      'A task whose `**ACTION**:` line wires an interactive handler (signal words: `wire`, `bind`, `handle`, `on click`, `on submit`, `on change`, `button`, `toggle`, `form submit`) MUST name the `[RELAY-MOCK-BEHAVIOR]` sentinel it will emit at that site.'
    ),
    'expected the action-signal sentinel mandate'
  );
  assert.ok(collapsed.includes('A task matching both signal classes must name both.'), 'expected the both-classes clause');
  assert.ok(
    collapsed.includes(
      'A purely structural task with neither a displayed datum nor an interactive handler (e.g., static markup, styling) needs neither sentinel — do not force one.'
    ),
    'expected the neither-forced exemption'
  );
});

test('AC-A1: plan-writer.md registers a new anti-pattern bullet — authoring a side-effecting task inside a phase_scope: visual plan belongs in the paired logic plan instead, rejected by R-COH-VISUAL-SCOPE-PURITY', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**Authoring a side-effecting task inside a `phase_scope: visual`', '## Out of scope');
  assert.ok(block, 'expected an extractable anti-pattern bullet');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "A task naming a real network call, persistence write, or business mutation (or a displayed-datum/interactive-action task with no type-matched sentinel) belongs in the paired `phase_scope: logic` plan (Phase 4 of `PRPs/prds/figma-visual-first-track.prd.md`), never here."
    ),
    'expected the anti-pattern description'
  );
  assert.ok(
    collapsed.includes("`plan-reviewer`'s `R-COH-VISUAL-SCOPE-PURITY` check rejects it."),
    'expected the enforcement cross-reference'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-3) — plan-reviewer's new R-COH-VISUAL-SCOPE-PURITY check
// returns CHANGES_REQUESTED naming the specific offending task.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-3), AC-A4 (PRD AC-1): plan-reviewer.md registers R-COH-VISUAL-SCOPE-PURITY as a deliberate mirror of R-COH-DESIGN-SOURCE-MISSING/R-COH-DESIGN-GROUNDED\'s zero-emission/otherwise shape, positioned immediately after R-COH-DESIGN-GROUNDED and before the Bounded K=5 LLM judgment pass, with a zero-emission branch when phase_scope is absent or logic', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const groundedIdx = content.indexOf('#### R-COH-DESIGN-GROUNDED');
  const purityIdx = content.indexOf('#### R-COH-VISUAL-SCOPE-PURITY');
  const k5Idx = content.indexOf('### Bounded K=5 LLM judgment pass');
  assert.notEqual(groundedIdx, -1, 'expected the existing R-COH-DESIGN-GROUNDED heading');
  assert.notEqual(purityIdx, -1, 'expected a new R-COH-VISUAL-SCOPE-PURITY heading');
  assert.notEqual(k5Idx, -1, 'expected the existing Bounded K=5 heading');
  assert.ok(groundedIdx < purityIdx, 'R-COH-VISUAL-SCOPE-PURITY must be positioned after R-COH-DESIGN-GROUNDED');
  assert.ok(purityIdx < k5Idx, 'R-COH-VISUAL-SCOPE-PURITY must be positioned before the Bounded K=5 pass');

  const block = sliceBetween(content, '#### R-COH-VISUAL-SCOPE-PURITY', '### Bounded K=5 LLM judgment pass');
  assert.ok(block, 'expected an extractable R-COH-VISUAL-SCOPE-PURITY block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'This check never infers or repairs plan content — an offending task is always a structural defect, never a self-healing opportunity.'
    ),
    'expected the never-infers-or-repairs framing'
  );
  assert.ok(
    collapsed.includes(
      "**Zero-emission branch:** if the plan's `## Metadata` table has no row whose first cell matches `phase_scope` (case-insensitive), OR the row's value is `logic` (not `visual`), emit NO row at all for this check — not even `passed: true`. Do NOT fail in either case."
    ),
    'expected the zero-emission branch'
  );
});

test('AC-A2 (PRD AC-3): plan-reviewer.md\'s R-COH-VISUAL-SCOPE-PURITY fail condition (a) matches the same bounded forbidden-vocabulary phrase list as plan-writer.md, and FAILS a task regardless of sentinel presence elsewhere in its body', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VISUAL-SCOPE-PURITY', '### Bounded K=5 LLM judgment pass');
  assert.ok(block, 'expected an extractable R-COH-VISUAL-SCOPE-PURITY block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**(a) Forbidden side-effect vocabulary present.** A case-insensitive match against any of: a client-call shape (`fetch(`, `axios`, `XMLHttpRequest`, `WebSocket(`), a persistence-method-call shape (`.save(`, `.persist(`), a SQL-write shape (`INSERT INTO`, `DELETE FROM`, `UPDATE <table> SET`), a REST-write shape (`POST /`, `PUT /`, `PATCH /`, `DELETE /`), or an explicit real-side-effect phrase (`real API call`, `real network call`, `real database`, `writes to the database`, `persists the data`, `calls the real backend/service/server`)'
    ),
    "expected fail condition (a)'s exact forbidden-vocabulary phrase list"
  );
  assert.ok(
    collapsed.includes('FAILS this task regardless of sentinel presence elsewhere in its body.'),
    'expected the regardless-of-sentinel-presence clause'
  );
});

test('AC-A2 (PRD AC-3): plan-reviewer.md\'s R-COH-VISUAL-SCOPE-PURITY fail condition (b) fails a data/action task with no type-matched sentinel mention, and exempts a task matching neither signal class as vacuously fine', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VISUAL-SCOPE-PURITY', '### Bounded K=5 LLM judgment pass');
  assert.ok(block, 'expected an extractable R-COH-VISUAL-SCOPE-PURITY block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**(b) Data/action task with no type-matched sentinel.** A task whose `**ACTION**:` line matches a data-display signal word (`display`, `render`, `show`, `populate`, `load`) but whose body never mentions `RELAY-MOCK-DATA`, OR matches an interactive-action signal word (`wire`, `bind`, `handle`, `on click`, `on submit`, `on change`, `button`, `toggle`, `form submit`) but whose body never mentions `RELAY-MOCK-BEHAVIOR` — FAILS.'
    ),
    "expected fail condition (b)'s exact text"
  );
  assert.ok(
    collapsed.includes(
      'A task matching neither signal class (pure layout/structural work) is exempt from this sub-check — vacuously fine.'
    ),
    'expected the neither-signal-class exemption'
  );
});

test('AC-A2 (PRD AC-3): plan-reviewer.md\'s R-COH-VISUAL-SCOPE-PURITY returns passed:true otherwise, and records its own known limitation as a textual heuristic scan over task PROSE — not the real-diff safety net, which remains Phase 5\'s job', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VISUAL-SCOPE-PURITY', '### Bounded K=5 LLM judgment pass');
  assert.ok(block, 'expected an extractable R-COH-VISUAL-SCOPE-PURITY block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('Otherwise → `{ "id": "R-COH-VISUAL-SCOPE-PURITY", "passed": true }`.'),
    'expected the passed:true otherwise-branch line'
  );
  assert.ok(
    collapsed.includes(
      '**Known limitation (recorded, not blocking):** this is a textual heuristic scan over plan-authored task PROSE, not real code — it cannot see an actual diff (no code exists yet at plan-review time) and can both miss a cleverly-worded side effect and false-positive on an incidental word match.'
    ),
    'expected the known-limitation paragraph'
  );
  assert.ok(
    collapsed.includes(
      "It is a plan-authoring-time gate, not the final safety net; Phase 5 (`Implement-time gate`) of `PRPs/prds/figma-visual-first-track.prd.md` is where a real diff gets checked against real code, out of this check's scope."
    ),
    'expected the Phase-5 forward-reference framing this as a plan-authoring-time gate, not the final safety net'
  );
});

test('AC-A2 (PRD AC-3), superseded wording confirmed current by the Phase 4, 2026-07-28 R-COH-VALIDATE-SEARCH-AMBIGUOUS, and rubric-reconciliation-merge lifecycle updates above: plan-reviewer.md widens the rubric[] length-range prose to 17-25 rows for the maximal case (both design rows present, plus exactly one of the two mutually-exclusive phase_scope rows, never both), each conditional row class independently zero-emission, preserving the exact 17-22 baseline for non-Figma projects and the 17-24 range for a figma_track: true project with no phase_scope row at all', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, 'The total `rubric[]` length per run is', 'When the K=5 pass emits N findings');
  assert.ok(block, 'expected an extractable rubric[] length-range paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'exactly one of two mutually-exclusive 3rd conditional deterministic rows may also appear: `R-COH-VISUAL-SCOPE-PURITY` (on `phase_scope: visual`) or `R-COH-SENTINEL-RESOLUTION-MISSING` (on `phase_scope: logic`), since a single plan\'s `phase_scope` cell carries exactly one value and can never be both at once. Together these widen the range to `17 to 25 rows` in the maximal case (both design rows present, plus exactly one of the two mutually-exclusive phase_scope rows, plus the full 5-row K=5 pass) — the range never extends to a 26th row, because `R-COH-VISUAL-SCOPE-PURITY` and `R-COH-SENTINEL-RESOLUTION-MISSING` can never both fire on the same plan.'
    ),
    'expected the mutually-exclusive-3rd-row widening statement, capping at 17-25 (never 17-26)'
  );
  assert.ok(
    collapsed.includes(
      'Each of the four conditional rows is independently zero-emission (contributes nothing) when its own gating condition is not met, so the baseline 17–22 range is exact for every non-Figma project, and the 17–24 range from the prior `design_source` shipment remains exact for a `figma_track: true` project whose plan has no `phase_scope` row at all (neither `visual` nor `logic` — `visual_first: false`, or the PRD predates the visual-first track).'
    ),
    'expected the preserved-baseline-and-preserved-17-24-range statement'
  );
});

const FORBIDDEN_VOCAB_BLOCK =
  'a client-call shape (`fetch(`, `axios`, `XMLHttpRequest`, `WebSocket(`), a persistence-method-call shape (`.save(`, `.persist(`), a SQL-write shape (`INSERT INTO`, `DELETE FROM`, `UPDATE <table> SET`), a REST-write shape (`POST /`, `PUT /`, `PATCH /`, `DELETE /`), or an explicit real-side-effect phrase (`real API call`, `real network call`, `real database`, `writes to the database`, `persists the data`, `calls the real backend/service/server`)';
const DATA_SIGNAL_BLOCK = '`display`, `render`, `show`, `populate`, `load`';
const ACTION_SIGNAL_BLOCK = '`wire`, `bind`, `handle`, `on click`, `on submit`, `on change`, `button`, `toggle`, `form submit`';

test('AC-A2 (cross-file vocabulary-parity regression net — the plan\'s own flagged top risk, its Level 3 Validation Command\'s intent made permanent): the forbidden side-effect vocabulary and both signal-word lists are token-for-token identical between plan-writer.md\'s Step 4.4 item 10 task-restriction rule and plan-reviewer.md\'s R-COH-VISUAL-SCOPE-PURITY check, so a plan-writer-compliant plan can never still fail review on a vocabulary drift between the two files', () => {
  const writerCollapsed = collapseWs(readRepoFile(PLAN_WRITER_PATH));
  const reviewerCollapsed = collapseWs(readRepoFile(PLAN_REVIEWER_PATH));

  assert.ok(writerCollapsed.includes(FORBIDDEN_VOCAB_BLOCK), 'expected plan-writer.md to contain the exact forbidden-vocabulary block');
  assert.ok(
    reviewerCollapsed.includes(FORBIDDEN_VOCAB_BLOCK),
    'expected plan-reviewer.md to contain the token-for-token identical forbidden-vocabulary block'
  );

  assert.ok(writerCollapsed.includes(DATA_SIGNAL_BLOCK), 'expected plan-writer.md to contain the exact data-signal-word list');
  assert.ok(
    reviewerCollapsed.includes(DATA_SIGNAL_BLOCK),
    'expected plan-reviewer.md to contain the token-for-token identical data-signal-word list'
  );

  assert.ok(writerCollapsed.includes(ACTION_SIGNAL_BLOCK), 'expected plan-writer.md to contain the exact action-signal-word list');
  assert.ok(
    reviewerCollapsed.includes(ACTION_SIGNAL_BLOCK),
    'expected plan-reviewer.md to contain the token-for-token identical action-signal-word list'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-3) — fixture-based demonstration closing the gap code review
// flagged against this feature's OWN PRD success signal for this phase
// (PRPs/prds/figma-visual-first-track.prd.md, Phase 3 row: "A visual-scoped
// plan reviewed against a hand-built fixture correctly fails when a task
// implies a side effect."). Every AC-A2 test above is a content-invariant
// assertion against R-COH-VISUAL-SCOPE-PURITY's own definition text —
// matching this repo's established idiom for testing prose-only reviewer
// rubric rules (confirmed by direct investigation of every sibling file
// before authoring this section, independently corroborated by a background
// search agent: figma-track-phase5/6/7.test.mjs, figma-track-ac2-reuse-
// enforcement.test.mjs, figma-visual-first-track-phase2.test.mjs's
// R-COH-VISUAL-PAIRING-INCOMPLETE tests, and gating-structure.test.mjs /
// dispatch-graph.test.mjs's synthetic-fixture tests all verify a rubric
// check's PROSE says the right thing, never that the prose, if followed by
// an LLM, would classify a fixture correctly — NO prior test anywhere in
// this repo feeds a synthetic "bad plan" through a reimplementation of a
// documented rubric rule; this section is a deliberate FIRST, added beyond
// the established convention, not a replacement for it).
//
// WHAT THIS DOES AND DOES NOT PROVE (read before trusting this section):
// plan-reviewer is a markdown AGENT PROMPT, not executable code. There is no
// production module anywhere in this repository that implements
// R-COH-VISUAL-SCOPE-PURITY — a real plan-reviewer invocation is an LLM
// judgment call, and this node:test process has no Task-tool access and no
// way to make a deterministic assertion about non-deterministic LLM output.
// The evaluateVisualScopePurity() oracle below is therefore NOT a
// reimplementation of plan-reviewer smuggled in as production code (it is
// test-file-local, exercises no application entry point, and nothing outside
// this file ever imports it) — it is a mechanical transcription of the
// CURRENTLY-DOCUMENTED vocabulary, applied to three hand-built, synthetic
// plan fixtures. The vocabulary it transcribes is the SAME vocabulary the
// vocabulary-parity test above independently confirms is present, token-for-
// token, in the real plan-writer.md/plan-reviewer.md files — so a future
// prose edit that silently drops or renames a token breaks the parity test
// first, not silently invalidating this section.
//
// What a PASS here proves: the documented rule, read literally and executed
// mechanically over three representative cases (a forbidden-vocabulary task,
// a missing-sentinel task, and a clean plan), is internally coherent and
// unambiguous for those cases — it does not contradict itself or leave an
// unhandled gap between "clearly fails (a)", "clearly fails (b)", and
// "clearly passes".
//
// What a PASS here does NOT prove: that the real plan-reviewer LLM agent
// will classify these (or any other) fixtures identically when actually
// dispatched. That behavioral proof requires a real dispatch against a
// hand-built fixture plan file — the PRD's own literal Phase-3 success
// signal — which is out of node:test's reach entirely and remains a manual
// dogfood exercise, exactly as this feature's own Phase 3 plan Notes section
// already acknowledges for its Validation Commands ("content-invariant
// greps... are therefore the primary mechanical verification for this
// phase's deliverables").
// ---------------------------------------------------------------------------

// Mirrors, token-for-token (see the vocabulary-parity test above), the
// forbidden-vocabulary phrase list documented in plan-reviewer.md's
// R-COH-VISUAL-SCOPE-PURITY fail condition (a) / plan-writer.md's Step 4.4
// item 10 "Forbidden side-effect vocabulary" bullet.
const FORBIDDEN_VOCAB_PATTERNS = [
  /fetch\(/i,
  /axios/i,
  /XMLHttpRequest/i,
  /WebSocket\(/i,
  /\.save\(/i,
  /\.persist\(/i,
  /INSERT INTO/i,
  /DELETE FROM/i,
  /UPDATE\s+\S+\s+SET/i,
  /POST \//i,
  /PUT \//i,
  /PATCH \//i,
  /DELETE \//i,
  /real API call/i,
  /real network call/i,
  /real database/i,
  /writes to the database/i,
  /persists the data/i,
  /calls the real (backend|service|server)/i,
];

// Mirrors, token-for-token, the two signal-word lists from the same two
// documented sources' fail condition (b) / "Mandatory, type-matched sentinel
// naming" bullet. Scoped to the task's **ACTION**: line only, per both
// documents' own prose ("A task whose **ACTION**: line matches...").
const DATA_SIGNAL_RE = /\b(display|render|show|populate|load)\b/i;
const ACTION_SIGNAL_RE = /\b(wire|bind|handle|button|toggle)\b|on click|on submit|on change|form submit/i;

/**
 * Mechanically executes the DOCUMENTED R-COH-VISUAL-SCOPE-PURITY algorithm
 * (plugins/relay/agents/plan-reviewer.md's own prose, tested verbatim above)
 * over a plan body: parses `### Task <i>:` headings, then for each task
 * scans its `**ACTION**:` line + body prose EXCLUDING its `**VALIDATE**:`
 * line/block for the two documented fail conditions. Returns one finding per
 * offending task (empty array when clean). Test-file-local oracle only — see
 * the disclaimer comment above for what this is and is not.
 *
 * Simplification (does not affect any of the three fixtures below, since
 * none needs it): when a task matches BOTH signal classes and is missing
 * BOTH sentinels, this oracle records only the first (data) miss rather than
 * both independently, unlike the documented rule's fully independent OR.
 *
 * @param {string} planBody
 * @returns {Array<{ task: string, forbiddenVocabMatch: string | null, missingSentinel: 'RELAY-MOCK-DATA' | 'RELAY-MOCK-BEHAVIOR' | null }>}
 */
function evaluateVisualScopePurity(planBody) {
  const taskHeadingRe = /^### Task \d+:.*$/gm;
  const headingMatches = [...planBody.matchAll(taskHeadingRe)];
  const findings = [];

  headingMatches.forEach((match, i) => {
    const start = /** @type {number} */ (match.index);
    const end = i + 1 < headingMatches.length ? /** @type {number} */ (headingMatches[i + 1].index) : planBody.length;
    const taskBlock = planBody.slice(start, end);
    const taskHeading = match[0].trim();

    const validateIdx = taskBlock.indexOf('**VALIDATE**:');
    const scannedText = validateIdx === -1 ? taskBlock : taskBlock.slice(0, validateIdx);

    const actionMatch = scannedText.match(/\*\*ACTION\*\*:([\s\S]*?)(?:\n\n|\*\*MIRROR\*\*:|$)/);
    const actionLine = actionMatch ? actionMatch[1] : '';

    let forbiddenVocabMatch = null;
    for (const pattern of FORBIDDEN_VOCAB_PATTERNS) {
      const m = scannedText.match(pattern);
      if (m) {
        forbiddenVocabMatch = m[0];
        break;
      }
    }

    let missingSentinel = null;
    if (DATA_SIGNAL_RE.test(actionLine) && !scannedText.includes('RELAY-MOCK-DATA')) {
      missingSentinel = 'RELAY-MOCK-DATA';
    } else if (ACTION_SIGNAL_RE.test(actionLine) && !scannedText.includes('RELAY-MOCK-BEHAVIOR')) {
      missingSentinel = 'RELAY-MOCK-BEHAVIOR';
    }

    if (forbiddenVocabMatch || missingSentinel) {
      findings.push({ task: taskHeading, forbiddenVocabMatch, missingSentinel });
    }
  });

  return findings;
}

// Hand-built fixture (a): phase_scope: visual plan whose one task correctly
// names its [RELAY-MOCK-DATA] sentinel but ALSO issues a real fetch( call —
// demonstrates fail condition (a) firing regardless of correct sentinel
// presence elsewhere in the task's body.
const FIXTURE_FORBIDDEN_VOCAB = `## Metadata

| Field | Value |
|---|---|
| phase_type | feature |
| phase_scope | visual |

## Step-by-Step Tasks

### Task 1: CREATE src/components/AccountBalance.tsx

**ACTION**: Display the account balance using a [RELAY-MOCK-DATA]
literal value, then issue a background fetch(/api/balance) call to
pre-warm the cache.

**MIRROR**: N/A (synthetic fixture -- not a real Patterns-to-Mirror
anchor).

**VALIDATE**:
grep -q "AccountBalance" src/components/AccountBalance.tsx
`;

// Hand-built fixture (b): phase_scope: visual plan whose one task displays a
// datum (signal word "Display") but never mentions [RELAY-MOCK-DATA]
// anywhere in its body — demonstrates fail condition (b) firing on a clean
// (no forbidden vocabulary) but unsentineled task.
const FIXTURE_MISSING_SENTINEL = `## Metadata

| Field | Value |
|---|---|
| phase_type | feature |
| phase_scope | visual |

## Step-by-Step Tasks

### Task 1: CREATE src/components/OrderTotal.tsx

**ACTION**: Display the computed order total in the summary panel.

**MIRROR**: N/A (synthetic fixture -- not a real Patterns-to-Mirror
anchor).

**VALIDATE**:
grep -q "OrderTotal" src/components/OrderTotal.tsx
`;

// Hand-built fixture (c): phase_scope: visual plan that is fully compliant —
// Task 1 names both sentinel classes correctly; Task 2 is purely structural
// (no signal words, exempt from the sentinel requirement); the VALIDATE
// block's own defensive "grep for absence of fetch(" mention must NOT trip
// fail condition (a), demonstrating the VALIDATE-line/block exclusion.
const FIXTURE_CLEAN = `## Metadata

| Field | Value |
|---|---|
| phase_type | feature |
| phase_scope | visual |

## Step-by-Step Tasks

### Task 1: CREATE src/components/OrderTotal.tsx

**ACTION**: Display the order total using a [RELAY-MOCK-DATA] literal
value, and wire the "Place Order" button's click handler to a
[RELAY-MOCK-BEHAVIOR] stub that always resolves successfully.

**MIRROR**: N/A (synthetic fixture -- not a real Patterns-to-Mirror
anchor).

**VALIDATE**:
# Defensive check only: confirms no stray fetch( call was left in the
# component. This mention of "fetch(" lives inside the VALIDATE block
# and must NOT itself trip the forbidden-vocabulary scan.
grep -qv "fetch(" src/components/OrderTotal.tsx

### Task 2: CREATE src/components/OrderTotalLayout.tsx

**ACTION**: Apply the finalized spacing and typography tokens to the
order-total layout container (pure structural styling -- no displayed
datum, no interactive handler).

**MIRROR**: N/A (synthetic fixture -- not a real Patterns-to-Mirror
anchor).

**VALIDATE**:
grep -q "OrderTotalLayout" src/components/OrderTotalLayout.tsx
`;

test('AC-A2 (fixture-based rule demonstration, part 1/3 — closes the PRD Phase-3 success-signal gap): a hand-built phase_scope: visual fixture whose task names a forbidden side-effect phrase (a real fetch( call) fails the documented rule\'s fail condition (a) — even though the SAME task also correctly names its [RELAY-MOCK-DATA] sentinel, confirming the documented "FAILS this task regardless of sentinel presence elsewhere in its body" property', () => {
  const findings = evaluateVisualScopePurity(FIXTURE_FORBIDDEN_VOCAB);
  assert.equal(findings.length, 1, `expected exactly one offending task, got: ${JSON.stringify(findings)}`);
  assert.match(findings[0].task, /Task 1: CREATE src\/components\/AccountBalance\.tsx/);
  assert.equal(findings[0].forbiddenVocabMatch, 'fetch(');
  assert.equal(findings[0].missingSentinel, null, 'the sentinel was correctly present; only the forbidden-vocabulary condition should trip');
});

test('AC-A2 (fixture-based rule demonstration, part 2/3): a hand-built phase_scope: visual fixture whose task displays a datum (signal word "Display") but never mentions [RELAY-MOCK-DATA] anywhere in its body fails the documented rule\'s fail condition (b), with zero forbidden vocabulary present', () => {
  const findings = evaluateVisualScopePurity(FIXTURE_MISSING_SENTINEL);
  assert.equal(findings.length, 1, `expected exactly one offending task, got: ${JSON.stringify(findings)}`);
  assert.match(findings[0].task, /Task 1: CREATE src\/components\/OrderTotal\.tsx/);
  assert.equal(findings[0].forbiddenVocabMatch, null, 'no forbidden vocabulary is present; only the missing-sentinel condition should trip');
  assert.equal(findings[0].missingSentinel, 'RELAY-MOCK-DATA');
});

test('AC-A2 (fixture-based rule demonstration, part 3/3): a hand-built phase_scope: visual fixture where every data/action task correctly names its type-matched sentinel, a purely structural task names neither (vacuously exempt), and a VALIDATE-block-only mention of a forbidden token does not itself trip the rule, produces zero findings — the documented "clean plan" case', () => {
  const findings = evaluateVisualScopePurity(FIXTURE_CLEAN);
  assert.deepEqual(findings, [], `expected zero offending tasks, got: ${JSON.stringify(findings)}`);
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-2) — plan-writer sources phase_scope verbatim from row N's
// Phase-cell bracket tag, never inferred; HALTs FAILED_PHASE_SCOPE_UNDECLARED
// on a missing/malformed tag before any DRAFT plan is written.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-2): plan-writer.md\'s Phase 0 setup reads the PRD\'s Visual-First Mode section\'s visual_first value, defaulting to false when the section is absent', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '## Phase 0 — Setup (internal, no user dialogue)', '## Phase 0.B');
  assert.ok(block, 'expected an extractable Phase 0 setup block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  const acIdx = collapsed.indexOf('The Acceptance Criteria section (AC-1 through AC-N)');
  const vfIdx = collapsed.indexOf("The PRD's `## Visual-First Mode` section's `visual_first:` value");
  assert.notEqual(acIdx, -1, 'expected the existing Acceptance Criteria read-and-remember bullet');
  assert.notEqual(vfIdx, -1, 'expected the new visual_first read-and-remember bullet');
  assert.ok(acIdx < vfIdx, 'the new bullet must be positioned after the existing Acceptance Criteria bullet');

  assert.ok(
    collapsed.includes("The PRD's `## Visual-First Mode` section's `visual_first:` value if present, else treat as `visual_first: false` (section absent)."),
    'expected the exact visual_first read-and-remember instruction'
  );
});

test('AC-A3 (PRD AC-2): plan-writer.md Step 4.4 item 5 sources phase_scope non-heuristically — present only when the source PRD\'s Visual-First Mode declares visual_first: true, sourced by reading row N\'s Phase-cell bracket tag, never inferred from task/description content', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope` (conditional, non-heuristic — mirrors', '6. `## Mandatory Reading`');
  assert.ok(block, 'expected an extractable phase_scope sourcing block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "**`phase_scope` (conditional, non-heuristic — mirrors `design_source`'s exact lineage).** Present (`visual | logic`) only when the source PRD's `## Visual-First Mode` section declares `visual_first: true`"
    ),
    'expected the conditional-gate statement'
  );
  assert.ok(
    collapsed.includes("including in description mode, where there is no PRD to declare `visual_first` at all, so `phase_scope` is never sourced or emitted."),
    'expected the description-mode carve-out'
  );
  assert.ok(
    collapsed.includes("sourced by reading row N's own `Phase` cell for its mandatory leading `[VISUAL]` or `[LOGIC]` bracket tag"),
    'expected the tag-sourcing mechanism'
  );
  assert.ok(collapsed.includes('`[VISUAL]` → `phase_scope: visual`; `[LOGIC]` → `phase_scope: logic`.'), 'expected the tag-to-value mapping');
});

test('AC-A3 (PRD AC-2): plan-writer.md HALTs with FAILED_PHASE_SCOPE_UNDECLARED, naming the offending row and its verbatim Phase-cell text, before any DRAFT plan is written, when visual_first: true and row N\'s tag is missing/malformed', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '> `FAILED_PHASE_SCOPE_UNDECLARED`', 'Do NOT write a DRAFT in this case');
  assert.ok(block, 'expected an extractable FAILED_PHASE_SCOPE_UNDECLARED HALT block');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "`FAILED_PHASE_SCOPE_UNDECLARED`: the source PRD declares `visual_first: true`, but Implementation Phases row <N>'s `Phase` cell (\"<verbatim Phase cell text>\") does not begin with a recognized `[VISUAL]` or `[LOGIC]` tag. No DRAFT plan has been written."
    ),
    'expected the exact HALT message'
  );
  assert.ok(
    collapsed.includes(
      "Resolve the missing/malformed tag (re-run `/relay-prd` to regenerate the row, or hand-edit the PRD's `Phase` cell to add the leading tag) and re-run `/relay-plan`."
    ),
    'expected the remediation instruction'
  );
});

test('AC-A3 (PRD AC-2): plan-writer.md never defaults phase_scope to logic or omits it silently on a missing tag, and frames the HALT as a rare defense-in-depth backstop since prd-reviewer\'s R-COH-VISUAL-PAIRING-INCOMPLETE already guarantees every row of an APPROVED visual_first: true PRD carries a valid tag', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, "Do NOT write a DRAFT in this case. Do NOT default `phase_scope`", '6. `## Mandatory Reading`');
  assert.ok(block, 'expected an extractable no-default-and-rarely-fires block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "Do NOT default `phase_scope` to `logic` or omit it silently when `visual_first: true` and the tag is missing — that would mask a scope-purity gap the same way silently defaulting `design_source` to `none` would mask an undeclared Figma phase."
    ),
    'expected the no-silent-default guard'
  );
  assert.ok(
    collapsed.includes(
      "`prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` check already structurally guarantees every row carries exactly one valid tag before a `visual_first: true` PRD can reach `APPROVED` — this HALT is a defense-in-depth backstop"
    ),
    'expected the defense-in-depth framing'
  );
});

test('AC-A3 (missing-property delta over figma-visual-first-track-phase1.test.mjs:304-313, which already covers this same plan-template.md paragraph\'s lineage/never-inferred/no-companion-section properties): docs/context/plan-template.md now also states the concrete sourcing mechanism (row N\'s Phase-cell bracket tag) and the FAILED_PHASE_SCOPE_UNDECLARED HALT — content that did not exist when Phase 1 authored its forward-reference stub', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);
  const block = sliceBetween(content, '**`phase_scope` (conditional).**', '**Conditional `## Design Source` section');
  assert.ok(block, 'expected an extractable phase_scope paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "`plan-writer` sources `phase_scope` by reading row N's own `Phase` cell for its mandatory leading `[VISUAL]` or `[LOGIC]` bracket tag (`[VISUAL]` → `phase_scope: visual`; `[LOGIC]` → `phase_scope: logic`) — never inferred from task content."
    ),
    'expected the concrete sourcing mechanism sentence'
  );
  assert.ok(
    collapsed.includes(
      "When the source PRD declares `visual_first: true` and row N's `Phase` cell does not begin with exactly one recognized tag, `plan-writer` HALTs with `FAILED_PHASE_SCOPE_UNDECLARED` before any DRAFT plan is written."
    ),
    'expected the HALT summary sentence'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1) — inert when off: no phase_scope row, no task-restriction
// language, no R-COH-VISUAL-SCOPE-PURITY rubric row — byte-identical to
// today for a non-visual_first plan.
// ---------------------------------------------------------------------------

test('AC-A4: plan-writer.md\'s Hard Constraint #12 is a silent no-op — not applicable — when phase_scope is absent or logic, mirroring design_source\'s dual-branch, never-inferred lineage', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '12. **`phase_scope: visual` task purity', '## Phase 0 — Setup');
  assert.ok(block, 'expected an extractable Hard Constraint #12 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes("Not applicable — silent no-op — when `phase_scope` is absent or `logic`, mirroring `design_source`'s own dual-branch, never-inferred lineage."),
    'expected the not-applicable off-branch clause'
  );
});

test('AC-A4: plan-writer.md\'s phase_scope Metadata field is not added at all — byte-identical to today — when visual_first is false, absent, or the source PRD has no Visual-First Mode section', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope` (conditional, non-heuristic — mirrors', '6. `## Mandatory Reading`');
  assert.ok(block, 'expected an extractable phase_scope sourcing block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "When `visual_first` is `false`, absent, or the source PRD has no `## Visual-First Mode` section at all (`figma_track` off), `phase_scope` is not added to `## Metadata` at all — the table is byte-identical to today."
    ),
    'expected the byte-identical-to-today off-branch statement'
  );
});

test('AC-A4: plan-writer.md Step 4.4 item 10\'s phase_scope: visual restriction is explicitly not applicable — no restriction, no rubric row — when phase_scope is absent or logic', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '**`phase_scope: visual` task restriction (conditional).**', '11. `## Validation Commands`');
  assert.ok(block, 'expected an extractable item 10 task-restriction block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "`plan-reviewer`'s new `R-COH-VISUAL-SCOPE-PURITY` check (Phase 3 of `PRPs/prds/figma-visual-first-track.prd.md`) enforces both rules structurally. Not applicable — no restriction, no rubric row — when `phase_scope` is absent or `logic`."
    ),
    'expected the not-applicable closing statement'
  );
});

test('AC-A4 (real dogfood proof): this feature\'s own phase 3 plan\'s ## Metadata table carries no phase_scope row (only prose explaining its absence) — its source PRD does not declare visual_first: true and this repo does not declare figma_track: true, so the new visual-scope machinery is inert against this very plan, by design', () => {
  const content = readRepoFile(THIS_PLAN_PATH);
  const metadataBlock = sliceBetween(content, '## Metadata', '## Mandatory Reading');
  assert.ok(metadataBlock, 'expected an extractable ## Metadata block');
  const tableRows = /** @type {string} */ (metadataBlock).split('\n').filter((line) => line.trim().startsWith('|'));

  assert.ok(!tableRows.some((row) => /\|\s*phase_scope\s*\|/i.test(row)), "expected no phase_scope table row in this plan's own Metadata table");
  assert.ok(!tableRows.some((row) => /\|\s*design_source\s*\|/i.test(row)), 'expected no design_source table row either, for the same reason');

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      "so this table also carries no `phase_scope` row: the new visual-scope machinery this phase ships is inert against this repo and against this very plan, by design."
    ),
    "expected the plan's own prose to explain the phase_scope absence explicitly"
  );
});

// Regression-safety net (not itself one of the plan's numbered AC-A1..AC-A5,
// mirrors figma-visual-first-track-phase2.test.mjs's identical precedent for
// an analogous docs-only phase touching the same scan roots) — confirms this
// phase's edits introduced no dangling path/script reference anywhere under
// plugins/relay/ or docs/ (path-existence.mjs's two scan roots, which cover
// three of this phase's four touched files: plan-writer.md, plan-reviewer.md,
// plan-template.md). Uses withScanRootLock since node:test runs files
// concurrently by default and path-existence.test.mjs's own AC-5 test
// transiently mutates the same SCAN_ROOTS with a synthetic fixture.
test(
  "AC-A4 (regression safety net): runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase's plan-writer.md, plan-reviewer.md, and plan-template.md edits — confirms no dangling path/script reference was introduced",
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-3) — plan-writer's Mandatory Reading table includes
// mock-sentinels.md as a P0 entry for a phase_scope: visual plan.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-3): plan-writer.md Step 4.4 item 6 always includes docs/context/mock-sentinels.md as a P0 Mandatory Reading row when phase_scope: visual, naming the sentinel convention and zero-side-effects/zero-remaining rules the Implementer must satisfy', () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '6. `## Mandatory Reading`', '7. `## Patterns to Mirror`');
  assert.ok(block, 'expected an extractable item 6 Mandatory Reading block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "When `phase_scope: visual` (from item 5 above), always include `docs/context/mock-sentinels.md` as a P0 `## Mandatory Reading` row — the sentinel convention and zero-side-effects/zero-remaining rules every task in this plan must satisfy, and the exact reference the Implementer needs when executing the plan's tasks."
    ),
    'expected the mock-sentinels.md mandatory-reading rule'
  );
});

// ---------------------------------------------------------------------------
// Documentation of record (AC-A1..AC-A5 collectively) — changelog.html's
// Unreleased -> Added section records this phase's entry, after this
// feature's own Phase 2 entry, before any versioned release heading.
// ---------------------------------------------------------------------------

test('(documentation of record, AC-A1..AC-A5): changelog.html\'s Unreleased -> Added section records this phase\'s plan-writer/plan-reviewer entry — non-heuristic phase_scope sourcing + FAILED_PHASE_SCOPE_UNDECLARED HALT, task-restriction with mandatory sentinel naming, and the R-COH-VISUAL-SCOPE-PURITY check — positioned after this feature\'s own Phase 2 entry, inside a well-formed release section (still Unreleased, or the versioned release Unreleased was later cut into — see documentation/AGENTS.md §7.3)', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  assert.notEqual(content.indexOf('<h2 id="unreleased">Unreleased</h2>'), -1, 'expected an id="unreleased" heading');

  const phase2EntryIdx = content.indexOf('<code>prd-writer</code> gains an interactive visual-first declaration question');
  assert.notEqual(phase2EntryIdx, -1, "expected this feature's own Phase 2 changelog entry to still be present");

  assert.ok(
    content.includes(
      "<code>plan-writer</code> gains non-heuristic <code>phase_scope</code> sourcing from a source PRD row's <code>[VISUAL]</code>/<code>[LOGIC]</code> tag (HALTing <code>FAILED_PHASE_SCOPE_UNDECLARED</code> when undeclared on a <code>visual_first: true</code> PRD)"
    ),
    'expected the plan-writer sourcing half of the Phase 3 changelog entry'
  );
  assert.ok(
    content.includes(
      'restricts authored tasks to UI-and-mocks scope with mandatory type-matched <code>[RELAY-MOCK-DATA]</code>/<code>[RELAY-MOCK-BEHAVIOR]</code> sentinel naming'
    ),
    'expected the task-restriction half of the Phase 3 changelog entry'
  );
  assert.ok(
    content.includes(
      '<code>plan-reviewer</code> gains the structural <code>R-COH-VISUAL-SCOPE-PURITY</code> check (zero-emission unless <code>phase_scope: visual</code>), failing <code>CHANGES_REQUESTED</code> on any side-effecting or unsentineled task.'
    ),
    'expected the plan-reviewer half of the Phase 3 changelog entry'
  );
  assert.ok(
    content.includes('Part of the Figma Visual-First Track, Phase 3 of <code>PRPs/prds/figma-visual-first-track.prd.md</code>.'),
    'expected the Phase 3 attribution sentence'
  );

  const phase3EntryIdx = content.indexOf("<code>plan-writer</code> gains non-heuristic <code>phase_scope</code> sourcing");
  assert.ok(phase3EntryIdx > phase2EntryIdx, "the Phase 3 entry must be positioned after this feature's own Phase 2 entry");

  const section = findEnclosingReleaseSection(content, phase3EntryIdx);
  assert.ok(section, 'expected the Phase 3 entry to sit within a well-formed release section (an id="unreleased" or id="v..." heading)');
  assert.ok(
    phase3EntryIdx < /** @type {{ end: number }} */ (section).end,
    'expected the Phase 3 entry to sit fully within its enclosing release section, not spill past the next one'
  );
});
