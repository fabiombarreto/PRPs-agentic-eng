// @ts-check
/**
 * Content/structure-invariant tests for Phase 4 ("Evidence contract + rungs
 * + R-DM7") of the figma-quota-resilience PRD — covering PRD AC-8 (additive,
 * cumulative evidence), AC-9 (checkpoint outside the read surface), AC-10
 * (disk-derived completeness flags, guarding the empty-candidate-set
 * vacuous-truth case), and AC-11 (surgical, not wholesale,
 * `DEGRADED_NO_ENRICHMENT` downgrade).
 *
 * AC-12 (`R-DM7`) and AC-13 (DERIVED rubric-count re-derivation) are covered
 * by sibling files (the `figma-track-phase3.test.mjs` `EXISTING_TEST_UPDATED`
 * repair and `design-map-reviewer-rubric-count-derived.test.mjs` /
 * `design-spec-reviewer-rubric-count-derived.test.mjs`, all authored the
 * same session) — not repeated here.
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md (PRD AC-8, AC-9, AC-10, AC-11)
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 4 plan.
 *
 * Existing-coverage scan performed before authoring: grepped every
 * scripts/validate/checks/*.test.mjs file for `last_seen_scan`, `call_log`,
 * `.state/checkpoint.json`, `enrichment_truncated`, `DEGRADED_NO_ENRICHMENT`,
 * `Surgical downgrade`, and `vacuously nothing to enrich` — zero hits
 * anywhere in the corpus prior to this file. `figma-quota-resilience-phase2.
 * test.mjs` and `-phase3.test.mjs` cover Phase B's step count, the
 * pre-match/budget prose, and the quota-preflight/HALT prose respectively,
 * but neither touches step 7's checkpoint/merge/split-flags paragraphs (all
 * appended by THIS phase) nor `design-map-writer.md` Step 1 item 2's
 * propagation clause or Step 2 item 5 (both new this phase) nor
 * `component-map-template.md`'s new `rung`/`enrichment_truncated` markers.
 * Every AC below is therefore NEW_TEST_REQUIRED.
 *
 * Traceability (plan's own `## Acceptance Criteria` — each plan AC-A<i>
 * names exactly one PRD AC-<i>):
 *
 *   AC-A1 (PRD AC-8, evidence writes are additive) — the checkpoint's
 *     cumulative `call_log` (appended, never replaced, survives a
 *     `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT) and is projected into the
 *     evidence bundle header; the merge step reads the EXISTING bundle and
 *     unions rather than replaces; each merged entry carries a
 *     `last_seen_scan` generation id; retirement is gated on THIS run's own
 *     `inventory_truncated: false`, and a partial scan retires nothing.
 *   AC-A2 (PRD AC-9, checkpoint outside the read surface) — the checkpoint
 *     path is stated, in all three surfaces (the command, the writer, the
 *     reviewer), to be structurally outside `evidence_dir` — never a
 *     dotfile-naming-convention argument.
 *   AC-A3 (PRD AC-10, completeness flags describe the artifact, not the
 *     run) — both `inventory_truncated` and `enrichment_truncated` are
 *     derived by scanning disk at write time, never trusted from an
 *     in-memory belief; three degenerate cases are guarded explicitly,
 *     including the empty-candidate-set vacuous-truth case the
 *     code-reviewer caught and fixed in `component-map-template.md`.
 *   AC-A4 (PRD AC-11, surgical not wholesale downgrade) — under
 *     `DEGRADED_NO_ENRICHMENT`, variant-name-derivable rows may remain
 *     `CONFIRMED`; non-variant-dependent rows MUST downgrade to `INFERRED`;
 *     rows carrying a human `verified_at` are NEVER downgraded, only
 *     flagged for re-verification.
 *
 * Run: node --test scripts/validate/checks/figma-quota-resilience-phase4.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-design-map.md';
const WRITER_PATH = 'plugins/relay/agents/design-map-writer.md';
const REVIEWER_PATH = 'plugins/relay/agents/design-map-reviewer.md';
const TEMPLATE_PATH = 'plugins/relay/resources/component-map-template.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the established helper of the same name/shape used throughout
 * this corpus.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
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
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence (these files wrap at
 * ~72-80 columns). Mirrors the sibling *.test.mjs files' helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-8 / AC-A1 — Given a complete evidence bundle on disk and a subsequent
// partial run, when the partial run writes, then the bundle is merged
// rather than replaced, the call log is cumulative across runs, and no
// entry is retired unless the writing scan itself reports
// inventory_truncated: false.
// ---------------------------------------------------------------------------

test('AC-8/AC-A1: the checkpoint holds a cumulative call_log — appended, never replaced, on every run, including a run that HALTs on FAILED_FIGMA_QUOTA_EXHAUSTED (the partial call_log is captured before halting)', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "The checkpoint holds a cumulative `call_log`: an array recording every Figma MCP data call this project's `/relay-design-map` has ever issued across every run (tool name, UTC timestamp, outcome), appended to — never replaced — on every run, including a run that HALTs on `FAILED_FIGMA_QUOTA_EXHAUSTED`"
    ),
    'expected step 7 to state the checkpoint holds a cumulative, append-only call_log surviving a quota-exhaustion HALT'
  );
  assert.ok(
    step7.includes('(capture the partial `call_log` before halting)'),
    'expected step 7 to state the partial call_log is captured before a HALT, not discarded'
  );
});

test('AC-8/AC-A1: on every step-7 write, the checkpoint\'s cumulative call_log is projected into library-search.json\'s own header as call_log, so a reader of the evidence bundle sees the cumulative total without opening the checkpoint', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "On every step-7 write, project (copy) the checkpoint's cumulative `call_log` into `library-search.json`'s own header as `call_log`, so a reader of the evidence bundle sees the cumulative total without opening the checkpoint"
    ),
    'expected step 7 to state the cumulative call_log is projected into library-search.json\'s header on every write'
  );
});

test('AC-8/AC-A1: before writing, the EXISTING library-search.json and metadata/<component-key>.json files are read and this run\'s newly-observed components/component-sets are MERGED into them additively — union, never replace', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "Before writing, `Read` the EXISTING `library-search.json` and `metadata/<component-key>.json` files under `evidence_dir` when present (a prior run's bundle) and MERGE this run's newly-observed components/component-sets into them additively — union, never replace."
    ),
    'expected step 7 to state the prior bundle is read and this run\'s new observations are merged additively — union, never replace'
  );
  assert.ok(
    step7.includes(
      "carries a `last_seen_scan` field set to this run's generation id — the checkpoint's own monotonically incrementing scan counter, incremented once per `/relay-design-map` invocation and persisted alongside `call_log`"
    ),
    'expected each merged entry to carry a last_seen_scan generation id tied to the checkpoint\'s own monotonic scan counter'
  );
});

test('AC-8/AC-A1: an entry present in the prior bundle but not observed this run is retired ONLY when THIS run\'s own inventory_truncated is false — a partial scan (inventory_truncated: true) retires nothing', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "is retired (removed from the merged bundle) only when THIS run's own `inventory_truncated` is `false` — a complete, non-budget-truncated library enumeration, so a component's absence genuinely means it left the Figma library"
    ),
    'expected retirement to be gated on THIS run\'s own inventory_truncated: false'
  );
  assert.ok(
    step7.includes(
      "When this run's `inventory_truncated` is `true` (a partial scan), no entry is ever retired — partial scans merge additively and retire nothing"
    ),
    'expected a partial scan (inventory_truncated: true) to explicitly retire nothing'
  );
});

// ---------------------------------------------------------------------------
// AC-9 / AC-A2 — Given the run checkpoint exists, when either
// design-map-writer or design-map-reviewer executes its "read the evidence"
// step, then the checkpoint file is not among the files read, enforced by
// its path being outside evidence_dir rather than by a dotfile naming
// convention.
// ---------------------------------------------------------------------------

test('AC-9/AC-A2: relay-design-map.md states the checkpoint path is deliberately OUTSIDE evidence_dir, satisfying the checkpoint-exclusion requirement structurally via path placement — explicitly NOT via a dotfile naming convention', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "a path deliberately OUTSIDE `evidence_dir`, never reached by either agent's"
    ),
    'expected the checkpoint path to be stated as deliberately outside evidence_dir, never reached by either agent\'s read instruction'
  );
  assert.ok(
    step7.includes(
      'satisfying the checkpoint-exclusion requirement (PRD AC-9) structurally via path placement rather than a dotfile naming convention.'
    ),
    'expected the exclusion to be stated as enforced structurally via path placement, explicitly NOT via a dotfile naming convention'
  );
});

test('AC-9/AC-A2: design-map-writer.md Step 1 states the checkpoint at PRPs/reports/design-map/.state/ is never part of its evidence_dir read, because it lives outside evidence_dir by design', () => {
  const content = readRepoFile(WRITER_PATH);
  const step1 = sliceBetween(content, '### Step 1 — Read inputs and ground yourself', '### Step 2 — Match every Figma component');
  assert.ok(step1, 'expected an extractable Step 1 section in design-map-writer.md');
  const collapsed = collapseWs(step1);

  assert.ok(
    collapsed.includes(
      "The checkpoint at `PRPs/reports/design-map/.state/` is never part of this read — it lives outside `evidence_dir` by design"
    ),
    'expected design-map-writer.md Step 1 to state the checkpoint is never part of the evidence_dir read, because it lives outside evidence_dir by design'
  );
});

test('AC-9/AC-A2: design-map-reviewer.md Step 1 states the checkpoint at PRPs/reports/design-map/.state/ is never part of its evidence_dir read, because it lives outside evidence_dir by design', () => {
  const content = readRepoFile(REVIEWER_PATH);
  const step1 = sliceBetween(content, '### Step 1 — Ground yourself', '### Step 2 — Run the rubric');
  assert.ok(step1, 'expected an extractable Step 1 section in design-map-reviewer.md');
  const collapsed = collapseWs(step1);

  assert.ok(
    collapsed.includes(
      "The checkpoint at `PRPs/reports/design-map/.state/` is never part of this read — it lives outside `evidence_dir` by design"
    ),
    'expected design-map-reviewer.md Step 1 to state the checkpoint is never part of the evidence_dir read, because it lives outside evidence_dir by design'
  );
});

// ---------------------------------------------------------------------------
// AC-10 / AC-A3 — Given a bundle whose component list is complete and whose
// metadata/ directory holds zero enriched nodes, when the flags are
// computed, then inventory_truncated is false and enrichment_truncated is
// true, both derived by scanning what is on disk rather than from the
// invoking run's intent. Given an empty component-set list, then
// enrichment_truncated is not reported as complete.
// ---------------------------------------------------------------------------

test('AC-10/AC-A3: both inventory_truncated and enrichment_truncated are derived by scanning what this write actually has on disk at write time — never trusted from an in-memory flag the run merely believes about itself', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      'Both `inventory_truncated` and `enrichment_truncated` are derived by scanning what this write actually has on disk at write time — never trusted from an in-memory flag the run merely believes about itself'
    ),
    'expected both flags to be stated as disk-derived at write time, never trusted from an in-memory belief'
  );
  assert.ok(
    step7.includes(
      "`inventory_truncated` is `true` iff step 2's library search stopped before enumerating the full library (cross-checked against the merged component/component-set count, not assumed)"
    ),
    'expected inventory_truncated\'s definition to be cross-checked against the merged count, not assumed'
  );
  assert.ok(
    step7.includes(
      '`enrichment_truncated` is `true` iff any pre-matched candidate lacks a corresponding `metadata/<component-key>.json` file on disk after this write (counted by scanning the `metadata/` directory\'s actual file count against the step 3 candidate set size — never from a flag merely recording whether enrichment was attempted)'
    ),
    'expected enrichment_truncated\'s definition to be counted from the real metadata/ file count, never from an attempted-intent flag'
  );
});

test('AC-10/AC-A3: degenerate case (a) — a run that fails before contributing any new evidence leaves the PRIOR bundle\'s truncation flags untouched, rather than deriving a false inventory_truncated: false from an empty diff', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "(a) a run that fails before contributing any new evidence must leave the PRIOR bundle's `inventory_truncated`/`enrichment_truncated` values untouched rather than deriving a false `inventory_truncated: false` from an empty diff"
    ),
    'expected degenerate case (a) to state a failed contribution-free run leaves the prior bundle\'s truncation flags untouched'
  );
});

test('AC-10/AC-A3: degenerate case (b), relay-design-map.md — an empty component-set list must NOT derive enrichment_truncated: false merely because there was vacuously nothing to enrich (the code-reviewer-caught vacuous-truth defect)', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      'an empty component-set list (a library genuinely containing zero component sets) must not derive `enrichment_truncated: false` merely because there was vacuously nothing to enrich'
    ),
    'expected degenerate case (b) to forbid deriving enrichment_truncated: false from a vacuously-empty component-set list'
  );
  assert.ok(
    step7.includes(
      '`enrichment_truncated` reports whether enrichment was even reachable this run, never a silent "complete"'
    ),
    'expected the empty-candidate-set case to report reachability, never a silent "complete"'
  );
});

test('AC-10/AC-A3: degenerate case (b), component-map-template.md — the enrichment_truncated marker-line comment and its field-reference bullet both pin "never false for an empty candidate set" / "non-empty pre-matched candidate set" so the vacuous-truth fix cannot silently regress', () => {
  const content = readRepoFile(TEMPLATE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    content.includes(
      'enrichment_truncated: true | false — {reason when true; "enrichment complete for all pre-matched candidates" when false — never `false` for an empty candidate set}'
    ),
    'expected the map-body marker-line template to pin the "never false for an empty candidate set" comment'
  );
  assert.ok(
    collapsed.includes(
      'OR the pre-matched candidate set is empty — an empty candidate set must never derive `false` merely because there was vacuously nothing to enrich; `false` only when enrichment is genuinely complete for a non-empty pre-matched candidate set.'
    ),
    'expected the "Column and field reference" bullet to pin the non-empty-candidate-set qualifier that closes the vacuous-truth gap'
  );
});

test('AC-10/AC-A3: degenerate case (c) — enrichment_truncated is always recomputed from the actual metadata/*.json file count on disk, never from a field recording only the run\'s own intent to enrich', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7 = collapseWs(phaseB.slice(phaseB.indexOf('7. **Persist evidence')));

  assert.ok(
    step7.includes(
      "`enrichment_truncated` is always recomputed from the actual `metadata/*.json` file count on disk, never from a field recording only the run's own intent to enrich, so the flag can never diverge from what the evidence bundle actually shows."
    ),
    'expected degenerate case (c) to state enrichment_truncated is always recomputed from the real file count, never from an intent-only field'
  );
});

// ---------------------------------------------------------------------------
// AC-11 / AC-A4 — Given rung DEGRADED_NO_ENRICHMENT, when confidence is
// assigned, then rows whose Props/variant mapping relies only on variant
// axes recoverable from component names may remain CONFIRMED; rows
// depending on non-variant properties (booleans, TEXT, INSTANCE_SWAP) may
// not; and rows carrying a human verified_at are never downgraded, only
// flagged for re-verification.
// ---------------------------------------------------------------------------

test('AC-11/AC-A4: under DEGRADED_NO_ENRICHMENT, a row may remain CONFIRMED ONLY when its Props/variant mapping relies exclusively on variant axes recoverable from the Figma component\'s own name', () => {
  const content = readRepoFile(WRITER_PATH);
  // Item 5 ("Surgical downgrade...") is the LAST item in Step 2, so slicing
  // Step 2 up to (but excluding) the "### Step 3" heading already isolates
  // item 5's full text — no further sub-slice is needed.
  const step2 = sliceBetween(content, '### Step 2 — Match every Figma component to a real code component', '### Step 3 — Write the');
  assert.ok(step2, 'expected an extractable Step 2 section in design-map-writer.md');
  const collapsed = collapseWs(step2);

  assert.ok(
    collapsed.includes(
      "a row may remain `CONFIRMED` ONLY when its `Props/variant mapping` relies exclusively on variant axes recoverable from the Figma component's own name (a `Prop=Value` naming scheme parseable without node enrichment)"
    ),
    'expected the surgical downgrade rule to permit CONFIRMED to survive only for variant-name-derivable rows'
  );
});

test('AC-11/AC-A4: a row whose classification depends on any non-variant property (booleans, TEXT, INSTANCE_SWAP, or any property not derivable from the component name alone) MUST be downgraded to INFERRED when unenriched', () => {
  const content = readRepoFile(WRITER_PATH);
  const step2 = sliceBetween(content, '### Step 2 — Match every Figma component to a real code component', '### Step 3 — Write the');
  assert.ok(step2, 'expected an extractable Step 2 section in design-map-writer.md');
  const collapsed = collapseWs(step2);

  assert.ok(
    collapsed.includes(
      'a row whose classification depends on any non-variant property (booleans, `TEXT`, `INSTANCE_SWAP`, or any property not derivable from the component name alone) MUST be downgraded to `INFERRED` when unenriched'
    ),
    'expected non-variant-dependent rows (booleans, TEXT, INSTANCE_SWAP) to be mandatorily downgraded to INFERRED when unenriched'
  );
});

test('AC-11/AC-A4: a row that already carries a human-populated verified_at is NEVER downgraded by the surgical-downgrade rule — it is flagged for re-verification instead of silently overriding a human\'s prior judgment', () => {
  const content = readRepoFile(WRITER_PATH);
  const step2 = sliceBetween(content, '### Step 2 — Match every Figma component to a real code component', '### Step 3 — Write the');
  assert.ok(step2, 'expected an extractable Step 2 section in design-map-writer.md');
  const collapsed = collapseWs(step2);

  assert.ok(
    collapsed.includes(
      "A row that already carries a human-populated `verified_at` is NEVER downgraded by this rule — flag it for re-verification (a note in the row) instead of silently overriding a human's prior judgment."
    ),
    'expected rows carrying a human verified_at to be exempt from downgrade, flagged for re-verification instead'
  );
});
