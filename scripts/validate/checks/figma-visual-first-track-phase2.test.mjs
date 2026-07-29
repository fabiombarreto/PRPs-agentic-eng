// @ts-check
/**
 * Content-invariant tests for Phase 2 ("PRD authoring") of the
 * figma-visual-first-track feature (v2 of relay's Figma Implementation
 * Track) — `prd-writer.md`'s new figma_track-gated Item 6.5 visual-first
 * declaration gate (Phase 6 DECISIONS) + item 7's pairing amendment + Step
 * 7.4's item 15 extension and new item 15.4 (`## Visual-First Mode` section
 * assembly); `prd-reviewer.md`'s R2 item-13 dual-branch note extended to
 * cover BOTH `## Visual-First Mode` and `## Design Source`, plus the new
 * deterministic `R-COH-VISUAL-PAIRING-INCOMPLETE` check; and
 * `docs/context/prd-template.md`'s new `### Phase-pairing mechanism`
 * subsection registering the `[VISUAL]`/`[LOGIC]` bracket-tag + strict 1:1
 * `Depends`-pairing convention. `documentation/changelog.html`'s Unreleased
 * entry is covered too (documentation of record).
 *
 * Source PRD: PRPs/prds/figma-visual-first-track.prd.md
 * Source plan: PRPs/plans/completed/figma-visual-first-track-phase-2-prd-authoring.plan.md
 * Diff reviewed: PRPs/reports/figma-visual-first-track/phase-2/attempts/2/diff.patch (4 files)
 *
 * Same idiom as figma-visual-first-track-phase1.test.mjs / figma-track-phase1.test.mjs:
 * every file this phase touches is prompt/template/prose markdown (or HTML)
 * with no companion production module for its content, so these are
 * readFileSync-based content assertions against the real, already-
 * implemented files — not fixture-driven unit tests. `.includes()` on an
 * exact (whitespace-collapsed) substring is preferred over `assert.match`
 * with a hand-escaped regex wherever the target prose is heavy with
 * parentheses/brackets/backticks (which every quoted block below is) — this
 * trades a little of the sibling files' regex-wildcard flexibility for much
 * lower transcription-escaping risk; `assert.match` is kept only where a
 * genuine wildcard (the changelog's "next versioned release heading") is
 * needed. The ONE exception to the content-invariant idiom is AC-A4's
 * path-existence regression-safety test, which calls the real, already-
 * tested `runPathExistenceCheck()` wrapper directly — a genuinely invokable
 * module that happens to scan all three non-HTML files this phase touches
 * (its SCAN_ROOTS are `['plugins/relay', 'docs']`), mirroring
 * figma-track-phase2.test.mjs's identical precedent for an analogous
 * docs-only phase.
 *
 * Existing-coverage scan performed before authoring (Step 2.1): read in full
 * every scripts/validate/checks/figma-track-phase*.test.mjs (1 through 7),
 * figma-track-ac2-reuse-enforcement.test.mjs, and
 * figma-visual-first-track-phase1.test.mjs; Globbed for any pre-existing
 * figma-visual-first-track-phase2*.test.mjs (none exists — CREATE).
 *
 *   - figma-track-phase1.test.mjs:161 (this repository's own
 *     docs/context/methodology.md has no figma_track key) — EXISTING_TEST_COVERS
 *     one precondition sub-fact of AC-A4's "Given a target project without
 *     figma_track: true" clause. Not duplicated; cited by path:line below.
 *   - figma-visual-first-track-phase1.test.mjs:254-258 (this feature's own
 *     source PRD contains no `## Visual-First Mode` section) —
 *     EXISTING_TEST_COVERS the section-heading-absence half of AC-A4's real
 *     dogfood proof. Not duplicated. The missing-property delta this file
 *     supplies instead: the NEW `[VISUAL]`/`[LOGIC]` Phase-cell-tag absence
 *     (a fact that did not exist to check before this phase invented the
 *     tag convention).
 *   - figma-visual-first-track-phase1.test.mjs:224 (prd-template.md orders
 *     `## Visual-First Mode` before `## Design Source`, computed via a
 *     `sliceBetween('## Visual-First Mode', '## Design Source')` window) —
 *     EXISTING_TEST_COVERS that single-file ordering fact in isolation. This
 *     file's own AC-A3 cross-file test computes the SAME ordering fact via a
 *     differently-scoped window (`## Implementation Phases` to `##
 *     Decisions Log`, mirroring the plan's own Level 3 script exactly) AND
 *     additionally cross-checks prd-reviewer.md's R2 block for textual
 *     corroboration — a distinct property the existing test never touches
 *     (it never reads prd-reviewer.md at all). Not a duplicate.
 *   - figma-track-phase5.test.mjs (v1's design_source PRD-authoring phase) —
 *     the ONLY other sibling file that reads prd-writer.md/prd-reviewer.md/
 *     prd-template.md content. Investigated line-by-line for regression risk
 *     from this phase's landed diff, since that diff LITERALLY REPLACED (not
 *     just extended) prd-reviewer.md's R2 item-13 dual-branch note text.
 *     Finding: NOT a regression. Two of that file's tests
 *     (`AC-4/AC-A1: prd-reviewer.md R-COH-DESIGN-SOURCE-INCOMPLETE is a
 *     zero-emission no-op...` and `AC-4/AC-A3: ...fails on a row-count
 *     mismatch...`) both `sliceBetween('#### R-COH-DESIGN-SOURCE-INCOMPLETE...',
 *     '### Bounded K=5 LLM judgment pass')` — that end needle is still
 *     present exactly once, just further down now that this phase inserted
 *     `R-COH-VISUAL-PAIRING-INCOMPLETE` between the two. Both tests'
 *     captured slice is now LARGER (it also picks up the new check's text)
 *     but their own `assert.match` patterns target substrings unique to
 *     R-COH-DESIGN-SOURCE-INCOMPLETE's own (unchanged — confirmed against
 *     Task 6's own "Do not alter ... R-COH-DESIGN-SOURCE-INCOMPLETE ..."
 *     constraint) text, so both still pass with zero false-positive risk.
 *     No other test in that file reads prd-reviewer.md's R2 item-13 note at
 *     all (only plan-reviewer.md's analogous item-6 note, a different file
 *     this phase never touches). Conclusion: zero EXISTING_TEST_UPDATED /
 *     OBSOLETE_TEST_REMOVED / REDUNDANT_TEST_REMOVED operations required
 *     this session — confirmed by direct investigation, not assumed.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 2 plan (Status: IMPLEMENTED, archived to
 * PRPs/plans/completed/ — the established test-after ordering for this
 * repo; the pair runs after the Implementer + Code Review, against the
 * already-landed diff):
 * PRPs/plans/completed/figma-visual-first-track-phase-2-prd-authoring.plan.md
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 2's in-scope subset per the plan's own
 * `## Acceptance Criteria` AC-A1 through AC-A6 — all six cite only PRD AC-1
 * or PRD AC-2; PRD AC-3, AC-4, AC-5, AC-6 are OUT_OF_PHASE_SCOPE, deferred to
 * phases 3, 5, 4, and 5 respectively per the Implementation Phases table —
 * no test for any of them in this file):
 *
 *   AC-A1 (PRD AC-2) — Item 6.5 asks the visual-first question before item
 *     7's phase-list capture; the recorded answer (never inferred) routes
 *     Step 7.4 item 15's table-assembly branch.
 *   AC-A2 (PRD AC-2) — R-COH-VISUAL-PAIRING-INCOMPLETE fails on a
 *     mixed-scope/unmarked phase, an unpaired [VISUAL] row, an
 *     unpaired/malformed [LOGIC] row, or non-1:1 fan-in, each naming the
 *     offending phase number(s).
 *   AC-A3 (PRD AC-2) — a correctly-paired visual-first PRD passes:
 *     R-COH-VISUAL-PAIRING-INCOMPLETE returns passed:true and R2's extended
 *     note's ordering requirement also passes.
 *   AC-A4 (PRD AC-1) — inert when off: no tag, no Item 6.5 question, no
 *     `## Visual-First Mode` section, no R-COH-VISUAL-PAIRING-INCOMPLETE
 *     row — byte-identical to today, across every touched surface.
 *   AC-A5 (PRD AC-2) — Item 6.5 "yes" causes Step 7.4 to emit
 *     `## Visual-First Mode` immediately after `## Implementation Phases`,
 *     before the conditional `## Design Source`, sourced verbatim.
 *   AC-A6 (PRD AC-2) — the `[VISUAL]`/`[LOGIC]` marker lives inside the
 *     existing `Phase` cell; no new `## Implementation Phases` table column
 *     is added.
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase2.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const PRD_TEMPLATE_PATH = 'docs/context/prd-template.md';
const PRD_WRITER_PATH = 'plugins/relay/agents/prd-writer.md';
const PRD_REVIEWER_PATH = 'plugins/relay/agents/prd-reviewer.md';
const CHANGELOG_PATH = 'documentation/changelog.html';
const THIS_PRD_PATH = 'PRPs/prds/figma-visual-first-track.prd.md';

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
 * `>` markers before collapsing — needed for prd-writer.md's Item 6.5
 * question and item 7's amendment, both authored as multi-line `>`
 * blockquotes. Mirrors figma-visual-first-track-phase1.test.mjs's helper of
 * the same name/shape (itself mirroring fix-design-system-config-producer's).
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
// AC-A1 (PRD AC-2) — Item 6.5 asks the visual-first question before item 7's
// phase-list capture; the recorded answer (never inferred) routes Step 7.4
// item 15's table-assembly branch.
// ---------------------------------------------------------------------------

test('AC-A1: prd-writer.md registers Item 6.5 as a figma_track-gated gate positioned immediately before the Decisions blockquote (i.e. before item 7\'s phase-list capture), asking the visual-first yes/no question and recording the answer non-heuristically', () => {
  const content = readRepoFile(PRD_WRITER_PATH);

  const itemIdx = content.indexOf('**Item 6.5');
  const item7Idx = content.indexOf('7. **Implementation phases**');
  assert.notEqual(itemIdx, -1, 'expected a **Item 6.5 heading');
  assert.notEqual(item7Idx, -1, 'expected the existing item 7 Implementation-phases bullet');
  assert.ok(itemIdx < item7Idx, 'Item 6.5 must be positioned before item 7\'s phase-list capture');

  const block = sliceBetween(content, '**Item 6.5', 'Ask the scope and risk questions:');
  assert.ok(block, 'expected an extractable Item 6.5 block');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('**Item 6.5 — Visual-first mode declaration (conditional, `figma_track: true` only).**'),
    'expected the Item 6.5 conditional-gate heading'
  );
  assert.ok(
    collapsed.includes('immediately before the Decisions blockquote below'),
    'expected the "immediately before the Decisions blockquote" positioning statement'
  );
  assert.ok(
    collapsed.includes('since its answer shapes how item 7 (inside the blockquote) must be captured'),
    'expected the forward-reference rationale for running before item 7'
  );
  assert.ok(
    collapsed.includes(
      'Is this PRD visual-first? Visual-first means every phase in your Implementation Phases table will be strictly split into a scope-pure visual phase (UI built against mocked data, blocking visual-verified before any logic exists) paired 1:1 with a scope-pure logic phase (wires the real business rules once the visual is locked). Answer yes or no.'
    ),
    'expected the exact visual-first yes/no question'
  );
  assert.ok(
    collapsed.includes(
      'Record the answer as `visual_first: true | false` — this is never inferred from the feature description, Foundation answers, or any other prior dialogue, the same non-heuristic contract `figma_track`/`design_source` follow.'
    ),
    'expected the non-heuristic recording contract'
  );
  assert.ok(
    collapsed.includes('A "yes" answer means item 7 below must capture the phase list as strict visual/logic pairs'),
    'expected the forward-reference to item 7\'s own conditional note'
  );
});

test('AC-A1: prd-writer.md\'s item 7 (Implementation phases) carries a visual_first:true-conditional amendment requiring strict visual/logic pairing, folding backend/docs-only work into the paired logic phase, with no standalone unpaired phase', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '7. **Implementation phases**', '8. **Acceptance Criteria**');
  assert.ok(block, 'expected an extractable item 7 block');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "(If item 6.5 above recorded `visual_first: true`: every phase must belong to exactly one visual/logic pair — describe each frontend surface as a strictly-paired visual phase + logic phase, e.g. 'Dashboard UI' then 'Dashboard Logic'."
    ),
    'expected the visual_first:true-conditional pairing clause'
  );
  assert.ok(
    collapsed.includes(
      "Any backend-only or docs-only work folds into whichever paired logic phase it most naturally supports; per `PRPs/prds/figma-visual-first-track.prd.md`'s AC-2, a visual-first PRD has no standalone, unpaired phase.)"
    ),
    'expected the backend/docs-only-work-folds-in clause citing AC-2\'s no-standalone-phase rule'
  );
});

test('AC-A1: prd-writer.md\'s Step 7.4 item 15 branches on Item 6.5\'s recorded answer — visual_first:true routes table assembly to apply the [VISUAL]/[LOGIC] tag + strict 1:1 Depends pairing described in prd-template.md\'s Visual-First Mode section', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '15. Implementation Phases (table + Phase Details)', '15.4.');
  assert.ok(block, 'expected an extractable Step 7.4 item 15 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "when Item 6.5 recorded `visual_first: true`, assemble the table applying the `[VISUAL]`/`[LOGIC]` phase-name tag + strict 1:1 `Depends` pairing described in `docs/context/prd-template.md`'s `## Visual-First Mode` section"
    ),
    'expected item 15\'s true-branch: tag + pairing sourced from Item 6.5\'s answer'
  );
  assert.ok(
    collapsed.includes("a `[LOGIC]` row's `Depends` cell names exactly its one paired `[VISUAL]` row's `#`."),
    'expected the Depends-pairing assembly rule'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-2) — R-COH-VISUAL-PAIRING-INCOMPLETE fails on a
// mixed-scope/unmarked phase, an unpaired [VISUAL] row, an
// unpaired/malformed [LOGIC] row, or non-1:1 fan-in, each naming the
// offending phase number(s) — CHANGES_REQUESTED.
// ---------------------------------------------------------------------------

test('AC-A2: prd-reviewer.md\'s R-COH-VISUAL-PAIRING-INCOMPLETE fails (naming offending phase numbers) on a Phase cell missing both/carrying both tags (a), or an unpaired [VISUAL] row (b) — and R-COH-* failures produce CHANGES_REQUESTED', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);

  const generalRuleBlock = sliceBetween(content, '## The R-COH-* coherence layer', '### Deterministic checks');
  assert.ok(generalRuleBlock, 'expected an extractable R-COH-* coherence layer intro block');
  assert.ok(
    collapseWs(/** @type {string} */ (generalRuleBlock)).includes(
      'R-COH-* failures produce `verdict: "CHANGES_REQUESTED"` the same way R1–R7 failures do'
    ),
    'expected R-COH-* failures to produce CHANGES_REQUESTED, same as R1-R7'
  );

  const block = sliceBetween(
    content,
    '#### R-COH-VISUAL-PAIRING-INCOMPLETE',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-VISUAL-PAIRING-INCOMPLETE block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**Otherwise** (`## Visual-First Mode` is present AND `visual_first: true`): for every `## Implementation Phases` data row, read the `Phase` cell\'s leading tag. Fail conditions, each naming the offending phase number(s) in `reason`:'
    ),
    'expected the Otherwise-branch trigger + fail-conditions header'
  );
  assert.ok(
    collapsed.includes(
      '(a) a row\'s `Phase` cell does not start with exactly one of `[VISUAL]` or `[LOGIC]` (missing both, or carrying both) — scope-impure or unmarked;'
    ),
    'expected fail condition (a): mixed-scope/unmarked phase'
  );
  assert.ok(
    collapsed.includes(
      "(b) an unpaired `[VISUAL]` row — no `[LOGIC]` row's `Depends` cell names that row's `#` as a lone value;"
    ),
    'expected fail condition (b): unpaired [VISUAL] row'
  );
});

test('AC-A2: prd-reviewer.md\'s R-COH-VISUAL-PAIRING-INCOMPLETE fails on an unpaired/malformed [LOGIC] row (c) and on non-1:1 fan-in — more than one [LOGIC] row claiming the same [VISUAL] row (d)', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-VISUAL-PAIRING-INCOMPLETE',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-VISUAL-PAIRING-INCOMPLETE block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "(c) an unpaired or malformed `[LOGIC]` row — its `Depends` cell is empty, names a non-existent phase number, names a `[LOGIC]` phase instead of a `[VISUAL]` phase, or lists more than one phase number;"
    ),
    'expected fail condition (c): unpaired/malformed [LOGIC] row'
  );
  assert.ok(
    collapsed.includes(
      "(d) non-1:1 fan-in — more than one `[LOGIC]` row's `Depends` cell names the same `[VISUAL]` row."
    ),
    'expected fail condition (d): non-1:1 fan-in'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-2) — a correctly-paired visual-first PRD passes:
// R-COH-VISUAL-PAIRING-INCOMPLETE returns passed:true and R2's extended
// note's ordering requirement also passes.
// ---------------------------------------------------------------------------

test('AC-A3: prd-reviewer.md\'s R-COH-VISUAL-PAIRING-INCOMPLETE returns passed:true when every phase is scope-pure and 1:1 Depends-paired (the otherwise branch, after all four fail conditions)', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-VISUAL-PAIRING-INCOMPLETE',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-VISUAL-PAIRING-INCOMPLETE block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('Otherwise → `{ "id": "R-COH-VISUAL-PAIRING-INCOMPLETE", "passed": true }`.'),
    'expected the passed:true otherwise-branch line'
  );
});

test('AC-A3: prd-reviewer.md\'s R2 note requires, when figma_track:true, BOTH sections to appear with Visual-First Mode immediately after Implementation Phases and Design Source immediately after Visual-First Mode, before Decisions Log', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(content, '**Conditional `## Visual-First Mode`', '14. `## Decisions Log`');
  assert.ok(block, 'expected an extractable R2 item-13 dual-branch note');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'BOTH conditional sections MUST appear, in this exact order: `## Visual-First Mode` immediately after `## Implementation Phases`, then `## Design Source` immediately after `## Visual-First Mode`, before `## Decisions Log`.'
    ),
    'expected the true-branch ordering requirement'
  );
});

test('AC-A3 (cross-file consistency delta over figma-visual-first-track-phase1.test.mjs:224\'s single-file order check; mirrors this plan\'s own Level 3 Validation Command): the real prd-template.md heading order between ## Implementation Phases and ## Decisions Log places ## Visual-First Mode before ## Design Source, AND prd-reviewer.md\'s R2 block (### R2 through ### R3) textually corroborates both headings', () => {
  const templateContent = readRepoFile(PRD_TEMPLATE_PATH);
  const headingsBlock = sliceBetween(templateContent, '## Implementation Phases', '## Decisions Log');
  assert.ok(headingsBlock, 'expected an extractable Implementation-Phases-to-Decisions-Log window');
  const vfIdx = headingsBlock.indexOf('## Visual-First Mode');
  const dsIdx = headingsBlock.indexOf('## Design Source');
  assert.notEqual(vfIdx, -1, 'expected a ## Visual-First Mode heading in that window');
  assert.notEqual(dsIdx, -1, 'expected a ## Design Source heading in that window');
  assert.ok(vfIdx < dsIdx, '## Visual-First Mode must precede ## Design Source in the real template');

  const reviewerContent = readRepoFile(PRD_REVIEWER_PATH);
  const r2Block = sliceBetween(reviewerContent, '### R2', '### R3');
  assert.ok(r2Block, 'expected an extractable ### R2 block');
  assert.ok(/** @type {string} */ (r2Block).includes('Visual-First Mode'), 'expected the R2 block to mention Visual-First Mode');
  assert.ok(/** @type {string} */ (r2Block).includes('Design Source'), 'expected the R2 block to mention Design Source');
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1) — inert when off: no tag, no Item 6.5 question, no
// ## Visual-First Mode section, no R-COH-VISUAL-PAIRING-INCOMPLETE row —
// byte-identical to today, across every touched surface. This is the core
// zero-emission invariant of this phase.
// ---------------------------------------------------------------------------

test('AC-A4: prd-writer.md\'s Item 6.5 is a silent no-op when figma_track is false or absent — no additional question asked, visual_first never recorded', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '**Item 6.5', 'Ask the scope and risk questions:');
  assert.ok(block, 'expected an extractable Item 6.5 block');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'When `figma_track` is `false` or absent, Item 6.5 is a silent no-op — no additional question is asked, and `visual_first` is never recorded.'
    ),
    'expected the silent no-op closing sentence'
  );
});

test('AC-A4: prd-writer.md\'s Step 7.4 item 15 assembles the Implementation Phases table exactly as today (no tags, ordinary Depends semantics) when visual_first is false, absent, or figma_track is off', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '15. Implementation Phases (table + Phase Details)', '15.4.');
  assert.ok(block, 'expected an extractable Step 7.4 item 15 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'When `visual_first` is `false`, absent, or `figma_track` is off, assemble the table exactly as today (no tags, ordinary `Depends` semantics).'
    ),
    'expected item 15\'s false/absent/off branch'
  );
});

test('AC-A4: prd-writer.md\'s Step 7.4 item 15.4 (## Visual-First Mode) is NOT emitted at all — no heading, no placeholder — when figma_track is false or absent', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '15.4. `## Visual-First Mode`', '15.5. `## Design Source`');
  assert.ok(block, 'expected an extractable Step 7.4 item 15.4 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('When `figma_track` is `false` or absent, the section is NOT emitted at all — no heading, no placeholder.'),
    'expected item 15.4\'s NOT-emitted-at-all closing sentence'
  );
});

test('AC-A4: prd-reviewer.md\'s R-COH-VISUAL-PAIRING-INCOMPLETE is a zero-emission no-op (not even a passed:true row) when ## Visual-First Mode is absent OR visual_first reads false', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-VISUAL-PAIRING-INCOMPLETE',
    '### Bounded K=5 LLM judgment pass'
  );
  assert.ok(block, 'expected an extractable R-COH-VISUAL-PAIRING-INCOMPLETE block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**Zero-emission branch:** if `## Visual-First Mode` is absent from the PRD (the common case — `figma_track` off), OR the section is present but its `visual_first:` value reads `false`, emit NO row at all for this check; do NOT fail in either case.'
    ),
    'expected the zero-emission branch text'
  );
});

test('AC-A4: prd-reviewer.md\'s R2 note requires BOTH ## Visual-First Mode and ## Design Source to be absent when figma_track is false or absent', () => {
  const content = readRepoFile(PRD_REVIEWER_PATH);
  const block = sliceBetween(content, '**Conditional `## Visual-First Mode`', '14. `## Decisions Log`');
  assert.ok(block, 'expected an extractable R2 item-13 dual-branch note');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('When `figma_track` is `false` or absent, BOTH sections MUST be absent.'),
    'expected the false-branch absence requirement'
  );
  assert.ok(
    collapsed.includes(
      'A mismatch (either section present/absent inconsistently with `figma_track`, or present out of order) fails R2.'
    ),
    'expected the mismatch-fails-R2 closing sentence'
  );
});

test('AC-A4 (real dogfood proof; NEW delta over figma-visual-first-track-phase1.test.mjs:254-258\'s section-heading-absence check, and over figma-track-phase1.test.mjs:161\'s figma_track-absence precondition): this feature\'s own source PRD\'s Implementation Phases table carries zero [VISUAL]/[LOGIC] tags in any Phase cell', () => {
  const content = readRepoFile(THIS_PRD_PATH);
  const phasesBlock = sliceBetween(content, '## Implementation Phases', '### Phase Details');
  assert.ok(phasesBlock, 'expected an extractable ## Implementation Phases table block');

  assert.ok(
    !(/** @type {string} */ (phasesBlock).includes('[VISUAL]')),
    'expected zero [VISUAL] tags in this feature\'s own Implementation Phases table (this repo\'s methodology.md does not declare figma_track: true)'
  );
  assert.ok(
    !(/** @type {string} */ (phasesBlock).includes('[LOGIC]')),
    'expected zero [LOGIC] tags in this feature\'s own Implementation Phases table, for the same reason'
  );
});

// Regression-safety net supporting AC-A4's "byte-identical to today" claim
// (not itself one of the plan's numbered AC-A1..AC-A6, but the one
// registered npm-run-validate check whose SCAN_ROOTS actually read this
// phase's three non-HTML touched files) — mirrors figma-track-phase2.test.mjs's
// identical precedent for an analogous docs-only phase touching the same
// scan roots. Uses withScanRootLock since node:test runs files concurrently
// by default and path-existence.test.mjs's own AC-5 test transiently
// mutates the same SCAN_ROOTS with a synthetic fixture.
test(
  'AC-A4 (regression safety net): runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase\'s docs/context/prd-template.md, plugins/relay/agents/prd-writer.md, and plugins/relay/agents/prd-reviewer.md edits — confirms no dangling path/script reference was introduced',
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-2) — Item 6.5 "yes" causes Step 7.4 to emit
// ## Visual-First Mode immediately after ## Implementation Phases, before
// the conditional ## Design Source, sourced verbatim from Item 6.5's answer.
// ---------------------------------------------------------------------------

test('AC-A5: prd-writer.md\'s Step 7.4 item 15.4 emits ## Visual-First Mode (figma_track-gated) carrying a single **visual_first:** line sourced verbatim from Item 6.5\'s answer, positioned immediately after Implementation Phases and before the conditional Design Source (item 15.5)', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const block = sliceBetween(content, '15.4. `## Visual-First Mode`', '15.5. `## Design Source`');
  assert.ok(block, 'expected an extractable Step 7.4 item 15.4 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '15.4. `## Visual-First Mode` (conditional — only when `docs/context/methodology.md` declares `figma_track: true`)'
    ),
    'expected item 15.4\'s conditional gate'
  );
  assert.ok(
    collapsed.includes(
      'emit the single `**visual_first:**` line (value `true` or `false`) sourced verbatim from Item 6.5\'s answer — never inferred.'
    ),
    'expected the verbatim-sourcing, never-inferred instruction'
  );
  assert.ok(
    collapsed.includes(
      'Positioned immediately after `## Implementation Phases`, before the conditional `## Design Source` section (item 15.5).'
    ),
    'expected the positioning instruction'
  );
});

test('AC-A5 (structural ordering): within prd-writer.md\'s Step 7.4 numbered assembly list, item 15.4 is positioned before item 15.5 in file order', () => {
  const content = readRepoFile(PRD_WRITER_PATH);
  const idx154 = content.indexOf('15.4. `## Visual-First Mode`');
  const idx155 = content.indexOf('15.5. `## Design Source`');
  assert.notEqual(idx154, -1, 'expected an item 15.4 heading');
  assert.notEqual(idx155, -1, 'expected the existing item 15.5 heading');
  assert.ok(idx154 < idx155, 'item 15.4 must be positioned before item 15.5');
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-2) — the [VISUAL]/[LOGIC] marker lives inside the existing
// Phase cell; no new ## Implementation Phases table column is added.
// ---------------------------------------------------------------------------

test('AC-A6: prd-template.md\'s Phase-pairing mechanism states the scope marker lives directly in the existing Phase cell (no dedicated scope column) as a mandatory leading bracket tag, exactly one per row', () => {
  const content = readRepoFile(PRD_TEMPLATE_PATH);
  const block = sliceBetween(content, '### Phase-pairing mechanism', '## Design Source');
  assert.ok(block, 'expected an extractable Phase-pairing mechanism block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'Because the `## Implementation Phases` table above carries no dedicated scope column (per the source PRD\'s own Decisions Log "Scope-flag placement" row), a `visual_first: true` PRD marks each phase\'s scope directly in the `Phase` cell using a mandatory leading bracket tag'
    ),
    'expected point 1: marker lives in the Phase cell, no dedicated scope column'
  );
  assert.ok(
    collapsed.includes(
      '`[VISUAL] {Phase Name}` (scope-pure visual phase: UI + mocked data only) or `[LOGIC] {Phase Name}` (scope-pure logic phase: real business rules on an already-locked visual)'
    ),
    'expected the two tag shapes'
  );
  assert.ok(
    collapsed.includes('Every phase row carries exactly one of the two tags, never both, never neither.'),
    'expected point 2: exactly one tag per row'
  );
});

test('AC-A6 (real structural proof): the real ## Implementation Phases table header row in prd-template.md is unchanged — still exactly the 7 pre-existing columns, matching the identical header substring prd-reviewer.md\'s own R7 check quotes, confirming no 8th column was added for the visual/logic scope marker', () => {
  const HEADER_ROW = '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |';

  const templateContent = readRepoFile(PRD_TEMPLATE_PATH);
  assert.ok(templateContent.includes(HEADER_ROW), 'expected the unchanged 7-column header row in prd-template.md');

  const reviewerContent = readRepoFile(PRD_REVIEWER_PATH);
  const r7Block = sliceBetween(reviewerContent, '### R7', '---');
  assert.ok(r7Block, 'expected an extractable ### R7 block');
  assert.ok(
    collapseWs(/** @type {string} */ (r7Block)).includes(HEADER_ROW),
    'expected prd-reviewer.md\'s R7 check to quote the identical 7-column header row'
  );
});

// ---------------------------------------------------------------------------
// Documentation of record (AC-A1..AC-A6 collectively, per Task 7's own
// ADDRESSES tag) — changelog.html's Unreleased -> Added section records this
// phase's entry, after this feature's own Phase 1 entry, before any
// versioned release heading.
// ---------------------------------------------------------------------------

test('(documentation of record, AC-A1..AC-A6): changelog.html\'s Unreleased -> Added section records prd-writer\'s visual-first question + [VISUAL]/[LOGIC] tagging and prd-reviewer\'s R-COH-VISUAL-PAIRING-INCOMPLETE check, positioned after this feature\'s own Phase 1 entry, inside a well-formed release section (still Unreleased, or the versioned release Unreleased was later cut into — see documentation/AGENTS.md §7.3)', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  assert.notEqual(content.indexOf('<h2 id="unreleased">Unreleased</h2>'), -1, 'expected an id="unreleased" heading');

  const phase1EntryIdx = content.indexOf('<code>visual_first</code> (PRD-level)');
  assert.notEqual(phase1EntryIdx, -1, 'expected this feature\'s own Phase 1 changelog entry to still be present');

  assert.ok(
    content.includes(
      '<code>prd-writer</code> gains an interactive visual-first declaration question (Phase 6 DECISIONS, <code>figma_track: true</code>-gated) and assembles Implementation Phases rows tagged <code>[VISUAL]</code>/<code>[LOGIC]</code>, strictly paired 1:1 via <code>Depends</code>'
    ),
    'expected the prd-writer half of the Phase 2 changelog entry'
  );
  assert.ok(
    content.includes(
      '<code>prd-reviewer</code> gains the structural <code>R-COH-VISUAL-PAIRING-INCOMPLETE</code> check (zero-emission unless <code>visual_first: true</code>) plus a corrected R2 section-order note.'
    ),
    'expected the prd-reviewer half of the Phase 2 changelog entry'
  );
  assert.ok(
    content.includes('Part of the Figma Visual-First Track, Phase 2 of <code>PRPs/prds/figma-visual-first-track.prd.md</code>.'),
    'expected the Phase 2 attribution sentence'
  );

  const phase2EntryIdx = content.indexOf('<code>prd-writer</code> gains an interactive visual-first declaration question');
  assert.ok(phase2EntryIdx > phase1EntryIdx, 'the Phase 2 entry must be positioned after this feature\'s own Phase 1 entry');

  const section = findEnclosingReleaseSection(content, phase2EntryIdx);
  assert.ok(section, 'expected the Phase 2 entry to sit within a well-formed release section (an id="unreleased" or id="v..." heading)');
  assert.ok(
    phase2EntryIdx < /** @type {{ end: number }} */ (section).end,
    'expected the Phase 2 entry to sit fully within its enclosing release section, not spill past the next one'
  );
});
