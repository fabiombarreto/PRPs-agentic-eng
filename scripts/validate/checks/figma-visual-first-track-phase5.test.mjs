// @ts-check
/**
 * Content-invariant + real-behavioral tests for Phase 5 ("Implement-time
 * gate") of the figma-visual-first-track feature (v2 of relay's Figma
 * Implementation Track) — `/relay-implement`'s `Phase A.3.4` becoming
 * dual-mode (a new item 3 "Dual-mode read" + a new "Terminal routing
 * (dual-mode, new)" paragraph, two new named HALT outcomes
 * `AWAITING_VISUAL_APPROVAL` / `VISUAL_GATE_BLOCKED`), `capture.mjs`'s new
 * `parseInteractionScript()` / `executeInteractionSteps()` exports wired
 * additively into `captureFrame()`, and `visual-verifier.md`'s Step 0
 * frame-manifest pass-through of the Design Spec's 9th `Interaction` column.
 *
 * Source PRD: PRPs/prds/figma-visual-first-track.prd.md
 * Source plan: PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed (13/13 on attempt 2), IMPLEMENTED phase 5 plan.
 *
 * Existing-coverage scan performed before authoring (Step 2.1): read every
 * scripts/validate/checks/figma-visual-first-track-phase1-4.test.mjs file in
 * full (none touches capture.mjs, visual-verifier.md, or
 * relay-implement.md's Phase A.3.4 — phase 1 registers the Design Spec
 * template's Interaction COLUMN only, never wiring it into these two files;
 * phases 2-4 are PRD/plan-authoring-layer only), then dispatched an
 * independent Explore-agent sweep across the remaining ~22
 * scripts/validate/checks/*.test.mjs files (everything except
 * figma-visual-first-track-phase1-4.test.mjs, already read directly, and
 * figma-track-phase6.test.mjs, handled separately below) checking
 * specifically for any assertion that would break from this phase's diff.
 * Result: zero genuine hits. Two files read `relay-implement.md` or
 * `visual-verifier.md` at all — `docs-sync-phase2.test.mjs` (scoped
 * strictly to the `### Phase A.3.5` body, which sits AFTER this phase's
 * insertion point and is never sliced into) and `figma-track-phase7.test.mjs`
 * (reads only `visual-verifier.md`'s frontmatter/opening-prose/Out-of-scope
 * sections, never Step 0) — both independently confirmed unaffected. Every
 * property this phase's diff introduces is therefore virgin territory;
 * NEW_TEST_REQUIRED throughout, with two EXISTING_TEST_COVERS carve-outs
 * (cited by path:line, not duplicated) noted below.
 *
 * TEST_CONTRACT_DISPUTE resolution (separate from this new file, recorded
 * here for cross-reference): `scripts/validate/checks/figma-track-phase6.test.mjs`
 * — a v1 figma-implementation-track file authored one day before this v2 PRD
 * existed — pinned two pre-Phase-5 invariants this PRD deliberately
 * supersedes for the `phase_scope: visual` case only. The Implementer's
 * dispute was arbitrated `DISPUTE_UPHELD_TEST_WRONG`; this test-writer
 * session fixed both tests in place this session (EXISTING_TEST_UPDATED, six
 * assertions total — see that file's own new "Lifecycle update
 * (2026-07-27, ...)" header paragraph and this session's Lifecycle ledger in
 * PRPs/reports/figma-visual-first-track/test-suite.diff for the full
 * per-assertion justification). Two properties this new file would otherwise
 * duplicate are EXISTING_TEST_COVERS there instead, cited by path:line below
 * rather than re-asserted:
 *   - The bare 9-field frame-manifest object literal
 *     `{node_id, route, preconditions, auth_mode, viewport: {width, height},
 *     diff_threshold, ref_png, masks, interaction}` —
 *     figma-track-phase6.test.mjs's "Step 0 builds the in-memory frame
 *     manifest" test (updated this session).
 *   - The outcome-vocabulary-preservation / non-visual-scoped never-HALT
 *     property (SKIPPED, APPROVED, degraded-rung, and BUDGET_EXCEEDED-family
 *     bullets, each now carrying the "(subject to the Terminal-routing rule
 *     below)" marker) — figma-track-phase6.test.mjs's "Phase A.3.4 never
 *     issues a HALT for the NON-visual-scoped case" test (updated this
 *     session).
 *
 * ENVIRONMENT-DEPENDENCY NOTE (governs why capture.mjs is imported via a
 * dynamic `await import(...)` INSIDE each test body below, never a top-level
 * static import): capture.mjs's module top-level carries
 * `import { chromium } from 'playwright';`. Per
 * figma-track-phase6.test.mjs's own established disclosure, `playwright` the
 * JS package is present in this repo's node_modules only as an INCIDENTAL
 * transitive dependency of the root devDependency `promptfoo` — relying on
 * that coupling is fragile in principle, since it could vanish if
 * promptfoo's own dependency tree changes. Unlike compare.mjs (which
 * figma-track-phase6.test.mjs never imports, since pngjs/pixelmatch are
 * NOT reachable at all), capture.mjs's import IS already proven to succeed
 * in this exact environment: this phase's own plan Task 1/Task 2/Level-2/
 * Level-3 VALIDATE commands (already executed and passed during the
 * Implementer's own validation, a precondition of the code-review APPROVED
 * verdict this suite is authored against) run the identical
 * `import('./plugins/relay/scripts/visual/capture.mjs').then(...)` pattern
 * this file mirrors. Using a dynamic import scoped inside each async test
 * body (rather than a top-level static import in this file) means that IF
 * the incidental promptfoo coupling ever breaks, only the individual tests
 * that need capture.mjs fail — never the whole file (unlike a top-level
 * import, which would abort every test in the file at module-load time).
 * `parseInteractionScript`/`executeInteractionSteps` are pure/near-pure
 * functions that never touch a real browser (only the fake `page` object
 * these tests supply), so the tests remain fast and fully deterministic
 * regardless of whether Chromium itself is ever provisioned.
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 5's in-scope subset per the plan's own
 * ## Acceptance Criteria section AC-A1 through AC-A6; PRD AC-2, AC-3, AC-5
 * are OUT_OF_PHASE_SCOPE — AC-2 (strict phase pairing) and AC-3 (zero side
 * effects in the visual phase) belong to phases 2/3's already-shipped
 * writer/reviewer changes; AC-5 (sentinel ledger resolution) belongs to
 * phase 4's already-shipped ledger derivation — no test for any of them in
 * this file):
 *
 *   AC-A1 (PRD AC-4) — the Dual-mode read (item 3), the Terminal-routing
 *     paragraph's existence/positioning/framing, the `auto`-mode
 *     "VISUAL_VERIFIED-only" gate (including the re-dispatched-verdict-comes-
 *     back-VISUAL_DEGRADED nuance a plain branch enumeration could miss), and
 *     the two new outcomes' registration in the HALT enumeration +
 *     Constraints item 6 + the exactly-5-sites marker count.
 *   AC-A2 (PRD AC-6) — the NEW "non-visual byte-identical guarantee" prose
 *     (item 3's closing sentence + the Terminal-routing rule's own first
 *     bullet) — the missing-property delta over figma-track-phase6.test.mjs's
 *     transitive outcome-vocabulary/never-HALT coverage (see above).
 *   AC-A3 (PRD AC-1) — phase_scope_value/visual_approval_mode's
 *     default-when-absent values (null / "auto"), plus a real dogfood proof
 *     (this very phase-5 plan's own ## Metadata carries no phase_scope row).
 *   AC-A4 (PRD AC-4) — parseInteractionScript()'s bounded click/fill/wait
 *     vocabulary (including nested parens in a selector and a comma inside a
 *     fill value), its malformed-input error, executeInteractionSteps()
 *     driving a fake page in order, the wiring order in captureFrame()
 *     (strictly between page.goto and page.screenshot), and
 *     visual-verifier.md's Interaction-column pass-through + none-default
 *     documentation (the missing-property delta over
 *     figma-track-phase6.test.mjs's transitive 9-field-shape coverage).
 *   AC-A5 (PRD AC-4) — parseInteractionScript()'s "none"/absent → []
 *     no-op, executeInteractionSteps()'s genuine no-op on an empty array, the
 *     conditional wiring guard, and capture.mjs's top-of-file manifest-shape
 *     comment documenting the new 9th field.
 *   AC-A6 (PRD AC-4, human-mode specifically) — a genuine VISUAL_VERIFIED
 *     result still does NOT complete the phase under
 *     visual_first_approval: human; the exact escape three plan-review
 *     rounds hunted, pinned explicitly so it cannot silently reopen.
 *   (documentation of record, AC-A1..AC-A6) — changelog.html's Unreleased ->
 *     Added entry.
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase5.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const VISUAL_VERIFIER_PATH = 'plugins/relay/agents/visual-verifier.md';
const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';
const CAPTURE_PATH = 'plugins/relay/scripts/visual/capture.mjs';
const CAPTURE_MODULE_SPECIFIER = '../../../plugins/relay/scripts/visual/capture.mjs';
const CHANGELOG_PATH = 'documentation/changelog.html';
const THIS_PLAN_PATH = 'PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-visual-first-track-phase1-4.test.mjs's helper of the same
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
 * if `startNeedle` is absent. Mirrors figma-visual-first-track-phase1-4
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
 * figma-visual-first-track-phase1-4.test.mjs's helper of the same
 * name/shape. NOT used against capture.mjs's `//`-prefixed manifest-shape
 * comment block or relay-implement.md's `>`-prefixed HALT blockquotes — both
 * are genuinely hard-wrapped across physical source lines, so collapsing
 * would splice in stray `//`/`>` marker characters (the same trap this
 * repo's own figma-track-phase6.test.mjs documents for a JSDoc block-comment
 * case); those two spots are asserted via `indexOf`/adjacency checks instead.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
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
// AC-A1 (PRD AC-4) — Blocking visual gate: the Dual-mode read, the
// Terminal-routing paragraph, the auto-mode "VISUAL_VERIFIED-only" gate, and
// the two new outcomes' registration.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): relay-implement.md\'s Phase A.3.4 gains a new item 3 ("Dual-mode read"), positioned between the existing item 2 (Budget init) and the renumbered item 4 (Step A dispatch), reading phase_scope_value/visual_approval_mode non-heuristically and mirroring the established provenance idioms', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const item2Idx = content.indexOf('2. **Budget init.**');
  const item3Idx = content.indexOf('3. **Dual-mode read (new).**');
  const item4Idx = content.indexOf('4. **Step A — dispatch');
  assert.notEqual(item2Idx, -1, 'expected the existing item 2 (Budget init)');
  assert.notEqual(item3Idx, -1, 'expected a new item 3 (Dual-mode read)');
  assert.notEqual(item4Idx, -1, 'expected the renumbered item 4 (Step A dispatch)');
  assert.ok(item2Idx < item3Idx && item3Idx < item4Idx, 'expected item 3 positioned strictly between items 2 and 4');

  const block = sliceBetween(content, '3. **Dual-mode read (new).**', '4. **Step A — dispatch');
  assert.ok(block, 'expected an extractable item 3 block');

  assert.ok(
    /** @type {string} */ (block).includes(
      '— read verbatim, never inferred from row content or task prose (mirrors the non-heuristic `phase_scope` sourcing lineage shipped in Phase 3).'
    ),
    'expected the non-heuristic, never-inferred provenance clause for phase_scope_value'
  );
  assert.ok(
    /** @type {string} */ (block).includes(
      'mirrors the `figma_track`/`docs_sync` default-when-absent idiom already used earlier in this same Phase A.0 (`plugins/relay/commands/relay-implement.md:203-220`)'
    ),
    'expected the cross-reference to the established figma_track/docs_sync default-when-absent idiom'
  );
});

test('AC-A1 (PRD AC-4): the "Terminal routing (dual-mode, new)" paragraph is positioned after Step B (the renumbered item 5) and before "No commit issued" (the renumbered item 6), and its framing sentence names every reachable point and states the rule is written as an inverse specifically so it cannot silently miss one', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const item5Idx = content.indexOf('5. **Step B — branch on the returned verdict:**');
  const routingIdx = content.indexOf('**Terminal routing (dual-mode, new).**');
  const item6Idx = content.indexOf('6. **No commit issued.**');
  assert.notEqual(item5Idx, -1, 'expected the renumbered item 5 (Step B)');
  assert.notEqual(routingIdx, -1, 'expected the new Terminal-routing paragraph');
  assert.notEqual(item6Idx, -1, 'expected the renumbered item 6 (No commit issued)');
  assert.ok(
    item5Idx < routingIdx && routingIdx < item6Idx,
    'expected the Terminal-routing paragraph positioned strictly between items 5 and 6'
  );

  assert.ok(
    content.includes(
      'Every one of those points, and the verdict-reaching mechanics that reach them (dispatch, fix-round retry, deterministic revert), are UNCHANGED; only whether reaching "proceed to Phase A.3.5" is ALLOWED is new.'
    ),
    'expected the unchanged-mechanics-only-routing-is-new framing clause'
  );
  assert.ok(
    content.includes(
      'The rule below is written as an inverse — block unless the outcome is exactly `VISUAL_VERIFIED` — precisely so it cannot silently miss one of those points the way a branch enumeration can:'
    ),
    'expected the written-as-an-inverse framing clause'
  );
});

test('AC-A1 (PRD AC-4): under visual_first_approval: auto, Phase A.3.5 is reached ONLY on a genuine VISUAL_VERIFIED result — a re-dispatched fix-round verdict that comes back VISUAL_DEGRADED (not just a first-dispatch VISUAL_MISMATCH) is explicitly named as a case a plain branch enumeration could miss, and is routed to VISUAL_GATE_BLOCKED like every other non-VERIFIED terminal point — never silently proceeding on a mismatch', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(content, '### Phase A.3.4 — Visual-verification dispatch', '### Phase A.3.5 — Docs-sync dispatch');
  assert.ok(block, 'expected an extractable Phase A.3.4 block');

  assert.ok(
    /** @type {string} */ (block).includes(
      'proceed to Phase A.3.5 ONLY when the point reached is a genuine `VISUAL_VERIFIED` result — `visual_outcome = "APPROVED"`, D8 continues normally, exactly as step 5 already says'
    ),
    'expected the ONLY-on-genuine-VISUAL_VERIFIED gate statement'
  );
  assert.ok(
    /** @type {string} */ (block).includes(
      '`VISUAL_DEGRADED` (step 5\'s own bullet, OR the fix-round-succeeds sub-case\'s re-dispatched verdict coming back `VISUAL_DEGRADED` instead of `VISUAL_VERIFIED` — the case a plain branch enumeration can miss), the deterministic-revert sub-case (`BUDGET_EXCEEDED_REVERTED`), or the budget-exhausted-without-a-fix-round sub-case (`BUDGET_EXCEEDED`) — do NOT proceed to Phase A.3.5.'
    ),
    'expected the explicit VISUAL_DEGRADED-on-re-dispatch nuance and the do-NOT-proceed clause covering all three non-VERIFIED points'
  );
  assert.ok(
    /** @type {string} */ (block).includes(
      'Write `<artifact_root>../halt.json` with `{outcome: "VISUAL_GATE_BLOCKED", phase_scope: "visual", final_visual_verdict: "<VISUAL_DEGRADED|VISUAL_MISMATCH>", fidelity_report_path, attempt_history, actionable_recommendation: "Fix the visual implementation or its mocks and re-run /relay-implement, or set visual_first_approval: human in docs/context/methodology.md to route through human review instead."}`.'
    ),
    'expected the VISUAL_GATE_BLOCKED halt.json shape'
  );
  assert.ok(
    /** @type {string} */ (block).includes("VISUAL_GATE_BLOCKED. The visual-scoped blocking gate's final"),
    'expected the verbatim HALT message to open by naming the outcome'
  );
  assert.ok(
    /** @type {string} */ (block).includes('`visual_first_approval: auto` requires a clean `VISUAL_VERIFIED`'),
    'expected the verbatim HALT message to state the auto-mode requirement'
  );
});

test('AC-A1 (PRD AC-4): the two new outcomes are registered in "## Final output surface"\'s On-HALT enumeration (immediately after PARTIAL_D8_FAILURE) and in "## Constraints (hard rules)" item 6, which states D8 is never attempted for either', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  assert.ok(
    content.includes(
      'On HALT (one of `FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`, `AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`, or any precondition HALT)'
    ),
    'expected both new outcomes registered adjacently, right after PARTIAL_D8_FAILURE, in the On-HALT enumeration'
  );

  const constraintsBlock = sliceBetween(content, '6. **Never bypass D8.**', '7. **Never skip the Decision Gate');
  assert.ok(constraintsBlock, 'expected an extractable Constraints item 6 block');
  assert.ok(
    /** @type {string} */ (constraintsBlock).includes(
      'The visual-scoped blocking-gate halts (`AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`) occur inside Phase A.3.4, strictly before Phase A.3.5 (docs-sync) and Phase A.4 (D8) ever run — D8 is never attempted for either, mirroring every other named HALT above it in the pipeline.'
    ),
    'expected Constraints item 6 to state D8 is never attempted for either new outcome'
  );
});

test('AC-A1 (PRD AC-4): all five Step B "proceed to Phase A.3.5" sites carry the "(subject to the Terminal-routing rule below)" forward-reference marker — exactly 5 occurrences, none missed', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const marker = '(subject to the Terminal-routing rule below)';
  const count = content.split(marker).length - 1;
  assert.equal(count, 5, `expected exactly 5 occurrences of the Terminal-routing forward-reference marker, found ${count}`);
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-6) — Real-data regression preserved, non-blocking: the NEW
// "non-visual byte-identical guarantee" prose. Outcome-vocabulary
// preservation and the non-visual never-HALT property are EXISTING_TEST_COVERS
// via figma-track-phase6.test.mjs's two (this-session-updated) tests — see
// this file's own header note; not re-asserted here.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-6): the NEW "non-visual byte-identical guarantee" prose — item 3\'s closing sentence and the Terminal-routing rule\'s own first bullet both state the non-visual path is unchanged from today', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const item3Block = sliceBetween(content, '3. **Dual-mode read (new).**', '4. **Step A — dispatch');
  assert.ok(item3Block, 'expected an extractable item 3 block');
  assert.ok(
    /** @type {string} */ (item3Block).includes(
      'Non-visual byte-identical guarantee: when `phase_scope_value` is not `"visual"`, steps 4-6 below are unchanged — `phase_scope_value` and `visual_approval_mode` are read but not consulted again until the new terminal-routing paragraph a following task inserts after step 5.'
    ),
    "expected item 3's own non-visual byte-identical guarantee sentence"
  );

  assert.ok(
    content.includes(
      '- When `phase_scope_value != "visual"` (absent, or `"logic"`): proceed to Phase A.3.5 immediately, exactly as step 5 already says — byte-identical to today, non-visual path unchanged.'
    ),
    'expected the Terminal-routing rule\'s own non-visual-scoped first bullet'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-1) — Inert when off: phase_scope_value/visual_approval_mode
// default-when-absent values, plus a real dogfood proof.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-1): phase_scope_value defaults to null when the plan\'s Metadata row is absent, and visual_approval_mode defaults to "auto" only when the methodology.md key is entirely absent — the dual-mode gate activates only on an explicit phase_scope: visual declaration', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(content, '3. **Dual-mode read (new).**', '4. **Step A — dispatch');
  assert.ok(block, 'expected an extractable item 3 block');

  assert.ok(
    /** @type {string} */ (block).includes('Record `phase_scope_value` (`"visual"`, `"logic"`, or `null` when the row is absent)'),
    'expected the null-when-absent default for phase_scope_value'
  );
  assert.ok(
    /** @type {string} */ (block).includes(
      'record `visual_approval_mode`, defaulting to `"auto"` only when the key is entirely absent from the frontmatter'
    ),
    'expected the auto-when-entirely-absent default for visual_approval_mode'
  );
});

test('AC-A3 (real dogfood proof): this feature\'s own phase 5 plan\'s ## Metadata table carries no phase_scope row (only prose explaining its absence) — its source PRD does not declare visual_first: true for this row and this repo does not declare figma_track: true, so the new dual-mode machinery this phase ships is inert against this repo and against this very plan, by design', () => {
  const content = readRepoFile(THIS_PLAN_PATH);
  const metadataBlock = sliceBetween(content, '## Metadata', '## Mandatory Reading');
  assert.ok(metadataBlock, 'expected an extractable ## Metadata block');
  const tableRows = /** @type {string} */ (metadataBlock).split('\n').filter((line) => line.trim().startsWith('|'));

  assert.ok(
    !tableRows.some((row) => /\|\s*phase_scope\s*\|/i.test(row)),
    "expected no phase_scope table row in this plan's own Metadata table"
  );
  assert.ok(
    !tableRows.some((row) => /\|\s*design_source\s*\|/i.test(row)),
    'expected no design_source table row either, for the same reason'
  );

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      "so this table also carries no `phase_scope` row, consistent with Phases 1-4's own self-application notes. The new dual-mode machinery this phase ships is inert against this repo and against this very plan, by design."
    ),
    "expected the plan's own prose to explain the phase_scope absence explicitly"
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-4) — capture.mjs executes the parsed click/fill/wait steps,
// in order, after page.goto and before page.screenshot.
// ---------------------------------------------------------------------------

test('AC-A4: parseInteractionScript() parses the bounded click/fill/wait vocabulary, semicolon-separated, into an ordered step array with the correct per-verb shape', async () => {
  const { parseInteractionScript } = await import(CAPTURE_MODULE_SPECIFIER);
  const steps = parseInteractionScript('click(#a); fill(#b, hello); wait(500)');
  assert.deepEqual(steps, [
    { verb: 'click', selector: '#a' },
    { verb: 'fill', selector: '#b', value: 'hello' },
    { verb: 'wait', ms: 500 },
  ]);
});

test('AC-A4: parseInteractionScript() resolves a non-numeric wait() argument to a selector-wait step (wait(<ms> | <selector>) per the bounded vocabulary), distinguishing it from the numeric-ms form', async () => {
  const { parseInteractionScript } = await import(CAPTURE_MODULE_SPECIFIER);
  const steps = parseInteractionScript('click(.menu-toggle); wait(#menu-open)');
  assert.deepEqual(steps, [
    { verb: 'click', selector: '.menu-toggle' },
    { verb: 'wait', selector: '#menu-open' },
  ]);
});

test('AC-A4: parseInteractionScript() correctly handles a selector containing nested parentheses (e.g. a :nth-child() pseudo-class) for click() — the greedy capture anchors on the OUTERMOST enclosing parens, not the first close-paren it meets', async () => {
  const { parseInteractionScript } = await import(CAPTURE_MODULE_SPECIFIER);
  const steps = parseInteractionScript('click(.menu:nth-child(2))');
  assert.deepEqual(steps, [{ verb: 'click', selector: '.menu:nth-child(2)' }]);
});

test('AC-A4: parseInteractionScript() preserves a literal comma inside a fill() value — splitting only on the FIRST comma to separate selector from value, never truncating the value at an internal comma', async () => {
  const { parseInteractionScript } = await import(CAPTURE_MODULE_SPECIFIER);
  const steps = parseInteractionScript('fill(#coupon, SAVE10,EXTRA5)');
  assert.deepEqual(steps, [{ verb: 'fill', selector: '#coupon', value: 'SAVE10,EXTRA5' }]);
});

test('AC-A4 (malformed input): parseInteractionScript() throws a discriminative error naming the exact offending step when a step\'s verb is outside the bounded click|fill|wait vocabulary, even when it is not the first step', async () => {
  const { parseInteractionScript } = await import(CAPTURE_MODULE_SPECIFIER);
  assert.throws(() => parseInteractionScript('click(#a); hover(#b)'), /unrecognized interaction step: "hover\(#b\)"/);
});

test('AC-A4: executeInteractionSteps() drives a fake Playwright page through a multi-step click/fill/wait script, in order, invoking the correct per-verb page method with the correct arguments', async () => {
  const { parseInteractionScript, executeInteractionSteps } = await import(CAPTURE_MODULE_SPECIFIER);
  /** @type {Array<any>} */
  const calls = [];
  const fakePage = {
    click: async (/** @type {string} */ selector) => {
      calls.push(['click', selector]);
    },
    fill: async (/** @type {string} */ selector, /** @type {string} */ value) => {
      calls.push(['fill', selector, value]);
    },
    waitForTimeout: async (/** @type {number} */ ms) => {
      calls.push(['waitForTimeout', ms]);
    },
    waitForSelector: async (/** @type {string} */ selector) => {
      calls.push(['waitForSelector', selector]);
    },
  };
  const steps = parseInteractionScript('click(.menu-toggle); wait(#menu-open); fill(#promo, SAVE10); wait(300)');
  await executeInteractionSteps(fakePage, steps);
  assert.deepEqual(calls, [
    ['click', '.menu-toggle'],
    ['waitForSelector', '#menu-open'],
    ['fill', '#promo', 'SAVE10'],
    ['waitForTimeout', 300],
  ]);
});

test('AC-A4: capture.mjs wires parseInteractionScript()/executeInteractionSteps() strictly between page.goto and page.screenshot inside captureFrame() — so interaction-reached states are part of the captured (and, on the blocking path, gating) pixel diff', () => {
  const content = readRepoFile(CAPTURE_PATH);
  const gotoIdx = content.indexOf('page.goto(frame.route');
  const parseIdx = content.indexOf('parseInteractionScript(frame.interaction)');
  const execIdx = content.indexOf('await executeInteractionSteps(page, interactionSteps)');
  const shotIdx = content.indexOf('page.screenshot(');
  assert.notEqual(gotoIdx, -1, 'expected a page.goto(frame.route call');
  assert.notEqual(parseIdx, -1, 'expected a parseInteractionScript(frame.interaction) call');
  assert.notEqual(execIdx, -1, 'expected an executeInteractionSteps(page, interactionSteps) call');
  assert.notEqual(shotIdx, -1, 'expected a page.screenshot( call');
  assert.ok(
    gotoIdx < parseIdx && parseIdx < execIdx && execIdx < shotIdx,
    'expected the order: page.goto, then parseInteractionScript, then executeInteractionSteps, then page.screenshot'
  );
});

test('AC-A4, AC-A5: visual-verifier.md\'s Step 0 reads the Design Spec\'s 9th Interaction column through to the frame manifest, defaulting to the "none" no-op sentinel when the column/cell is absent — the missing-property delta over figma-track-phase6.test.mjs\'s own (now-updated) manifest-shape test, cited by path:line rather than duplicated', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 0 — Ground yourself', '### Step 1 — Provision');
  assert.ok(block, 'expected an extractable Step 0 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  // EXISTING_TEST_COVERS (not re-asserted here): the bare 9-field object
  // literal `{node_id, ..., masks, interaction}` is pinned by
  // scripts/validate/checks/figma-track-phase6.test.mjs's own
  // (updated this session) "Step 0 builds the in-memory frame manifest" test.
  assert.ok(
    collapsed.includes(
      '`${CLAUDE_PLUGIN_ROOT}/resources/design-spec-template.md:111-113` shape: node-id, route, preconditions, auth mode, viewport, diff threshold, ref PNG path + dims, masks, interaction)'
    ),
    'expected the sub-step-2 prose enumeration to list all 9 fields, ending in "masks, interaction)"'
  );
  assert.ok(
    collapsed.includes(
      "Read the row's `Interaction` column (the 9th column, added by Phase 1 of this same PRD to `${CLAUDE_PLUGIN_ROOT}/resources/design-spec-template.md`)"
    ),
    'expected the 9th-column cross-reference to Phase 1'
  );
  assert.ok(
    collapsed.includes(
      'when the column is absent from a given Design Spec (a pre-Phase-5 spec) or the cell is empty, set `interaction: "none"` — the exact no-op sentinel `capture.mjs`\'s `parseInteractionScript` treats as zero steps'
    ),
    'expected the documented none-default for an absent column/cell'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-4) — zero-effect capture behavior for a frame whose
// interaction is absent or "none": the structural, same-mechanism sibling of
// AC-A4's interaction-present case.
// ---------------------------------------------------------------------------

test('AC-A5: parseInteractionScript() returns [] for "none" and for an absent (undefined) interaction — the exact no-op sentinel that keeps a frame with no Interaction script byte-identical to today\'s capture behavior', async () => {
  const { parseInteractionScript } = await import(CAPTURE_MODULE_SPECIFIER);
  assert.deepEqual(parseInteractionScript('none'), []);
  assert.deepEqual(parseInteractionScript(undefined), []);
});

test('AC-A5: executeInteractionSteps() is a genuine no-op on an empty steps array — zero Playwright page method calls fire, matching a frame that declares no Interaction script (or "none")', async () => {
  const { executeInteractionSteps } = await import(CAPTURE_MODULE_SPECIFIER);
  /** @type {Array<string>} */
  const calls = [];
  const fakePage = {
    click: async () => calls.push('click'),
    fill: async () => calls.push('fill'),
    waitForTimeout: async () => calls.push('waitForTimeout'),
    waitForSelector: async () => calls.push('waitForSelector'),
  };
  await executeInteractionSteps(fakePage, []);
  assert.deepEqual(calls, []);
});

test('AC-A5: capture.mjs only calls executeInteractionSteps() when parseInteractionScript() returned a non-empty steps array — the conditional guard that keeps a no-Interaction frame\'s capture path additive/zero-effect', () => {
  const content = readRepoFile(CAPTURE_PATH);
  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      'const interactionSteps = parseInteractionScript(frame.interaction); if (interactionSteps.length > 0) { await executeInteractionSteps(page, interactionSteps); }'
    ),
    'expected the conditional guard around the executeInteractionSteps call'
  );
});

test('AC-A5: capture.mjs\'s top-of-file manifest-shape comment documents the new 9th "interaction" field, positioned immediately after "masks" — keeping the comment accurate to the real manifest shape, per this repo\'s established comment-accuracy discipline', () => {
  const content = readRepoFile(CAPTURE_PATH);
  const masksLineIdx = content.indexOf('"masks": [],');
  const interactionLineIdx = content.indexOf('"interaction": "click(<selector>); wait(300)" | "none"');
  assert.notEqual(masksLineIdx, -1, 'expected the pre-existing "masks" field line in the manifest-shape comment');
  assert.notEqual(interactionLineIdx, -1, 'expected the new "interaction" field line in the manifest-shape comment');
  assert.ok(interactionLineIdx > masksLineIdx, 'expected "interaction" to be documented immediately after "masks"');

  // Confirms true adjacency (no other field line was inserted between them):
  // the only text between the two matched substrings should be a line break
  // plus the next line's `//` comment-marker + leading whitespace. Verified
  // via indexOf/slice rather than collapseWs() specifically because this is
  // a `//`-prefixed multi-line JS comment block — collapsing it would splice
  // a literal `//` into the middle of any merged multi-line substring (the
  // same trap this repo's own figma-track-phase6.test.mjs documents for a
  // `/** */`-doc-comment case).
  const between = content.slice(masksLineIdx + '"masks": [],'.length, interactionLineIdx);
  assert.match(
    between,
    /^\s*\/\/\s*$/,
    'expected only a line break plus the next line\'s comment marker between the "masks" and "interaction" field lines'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-4, human-mode specifically) — a genuine VISUAL_VERIFIED
// result still does not complete the phase under visual_first_approval:
// human. The exact escape three plan-review rounds hunted; pinned explicitly
// so it cannot silently reopen.
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-4, human-mode specifically): a genuine VISUAL_VERIFIED result still does NOT complete the phase under visual_first_approval: human — /relay-implement HALTs with AWAITING_VISUAL_APPROVAL regardless of which terminal-routing point was reached, requiring the explicit human review step this PRD\'s human tier exists to guarantee', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(content, '### Phase A.3.4 — Visual-verification dispatch', '### Phase A.3.5 — Docs-sync dispatch');
  assert.ok(block, 'expected an extractable Phase A.3.4 block');

  assert.ok(
    /** @type {string} */ (block).includes(
      '- When `phase_scope_value == "visual"` AND `visual_approval_mode == "human"`: regardless of which point above was reached (including a genuine `VISUAL_VERIFIED` result), do NOT proceed to Phase A.3.5.'
    ),
    'expected the human-mode bullet to explicitly block even a genuine VISUAL_VERIFIED result'
  );
  assert.ok(
    /** @type {string} */ (block).includes(
      'Write `<artifact_root>../halt.json` with `{outcome: "AWAITING_VISUAL_APPROVAL", phase_scope: "visual", final_visual_verdict: "<VISUAL_VERIFIED|VISUAL_DEGRADED|VISUAL_MISMATCH>", fidelity_report_path, attempt_history, actionable_recommendation: "Run /relay-visual-approve (Phase 6 of PRPs/prds/figma-visual-first-track.prd.md) to review the captures at <fidelity_report_path> and approve or reject. Until then this phase cannot reach complete."}`.'
    ),
    'expected the AWAITING_VISUAL_APPROVAL halt.json shape, whose final_visual_verdict field explicitly allows the VISUAL_VERIFIED value'
  );
  assert.ok(
    /** @type {string} */ (block).includes(
      'HALT the entire `/relay-implement` invocation (Phase A.3.5 and Phase A.4 are never entered — no docs-sync, no D8 mutation) with the verbatim message:'
    ),
    'expected the whole-invocation HALT statement — Phase A.3.5/A.4 never entered, even on a clean pass'
  );
  assert.ok(
    /** @type {string} */ (block).includes('AWAITING_VISUAL_APPROVAL. The visual gate reached a final verdict'),
    'expected the verbatim HALT message to open by naming the outcome'
  );
  assert.ok(
    /** @type {string} */ (block).includes('requires explicit human review before this phase can complete —'),
    'expected the verbatim HALT message to state the human-review requirement'
  );
});

// ---------------------------------------------------------------------------
// Documentation of record (AC-A1..AC-A6 collectively) — changelog.html's
// Unreleased -> Added section records this phase's entry, after this
// feature's own Phase 4 entry, before any versioned release heading.
// ---------------------------------------------------------------------------

test('(documentation of record, AC-A1..AC-A6): changelog.html\'s Unreleased -> Added section records this phase\'s dual-mode-gate + interaction-executor entry, positioned after this feature\'s own Phase 4 entry, inside a well-formed release section (still Unreleased, or the versioned release Unreleased was later cut into — see documentation/AGENTS.md §7.3)', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  assert.notEqual(content.indexOf('<h2 id="unreleased">Unreleased</h2>'), -1, 'expected an id="unreleased" heading');

  const phase4EntryIdx = content.indexOf('<code>plan-writer</code> gains a non-heuristic sentinel-ledger derivation');
  assert.notEqual(phase4EntryIdx, -1, "expected this feature's own Phase 4 changelog entry to still be present");

  const phase5EntryIdx = content.indexOf(
    "<code>/relay-implement</code>'s Phase A.3.4 is dual-mode: on <code>phase_scope: visual</code> plans, the visual gate now genuinely blocks completion until <code>VISUAL_VERIFIED</code>"
  );
  assert.notEqual(phase5EntryIdx, -1, 'expected the Phase 5 changelog entry opening clause');

  assert.ok(
    content.includes(
      "via two new HALT outcomes, <code>AWAITING_VISUAL_APPROVAL</code> and <code>VISUAL_GATE_BLOCKED</code>; every other plan (<code>phase_scope</code> absent, or <code>phase_scope: logic</code>) keeps today's non-blocking regression byte-identical."
    ),
    'expected the two-new-outcomes + byte-identical-regression clause'
  );
  assert.ok(
    content.includes(
      '<code>capture.mjs</code> gains an additive interaction-step executor (bounded <code>click</code>/<code>fill</code>/<code>wait</code> vocabulary) for frames declaring a Design Spec <code>Interaction</code> script; <code>visual-verifier.md</code> passes the column through; <code>compare.mjs</code>/<code>provision.mjs</code> untouched.'
    ),
    'expected the capture.mjs/visual-verifier.md/untouched-scripts clause'
  );
  assert.ok(
    content.includes('Part of the Figma Visual-First Track, Phase 5 of <code>PRPs/prds/figma-visual-first-track.prd.md</code>.'),
    'expected the Phase 5 attribution sentence'
  );

  assert.ok(phase5EntryIdx > phase4EntryIdx, "the Phase 5 entry must be positioned after this feature's own Phase 4 entry");

  const section = findEnclosingReleaseSection(content, phase5EntryIdx);
  assert.ok(section, 'expected the Phase 5 entry to sit within a well-formed release section (an id="unreleased" or id="v..." heading)');
  assert.ok(
    phase5EntryIdx < /** @type {{ end: number }} */ (section).end,
    'expected the Phase 5 entry to sit fully within its enclosing release section, not spill past the next one'
  );
});

// Regression-safety net (not itself one of the plan's numbered AC-A1..AC-A6,
// mirrors figma-visual-first-track-phase2/3/4.test.mjs's identical precedent
// for an analogous docs-touching phase sharing the same scan roots). Uses
// withScanRootLock since node:test runs files concurrently by default and
// path-existence.test.mjs's own AC-5 test transiently mutates the same
// SCAN_ROOTS with a synthetic fixture.
test(
  "AC-A1..AC-A6 (regression safety net): runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase's relay-implement.md and visual-verifier.md edits — confirms no dangling path/script reference was introduced",
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);
