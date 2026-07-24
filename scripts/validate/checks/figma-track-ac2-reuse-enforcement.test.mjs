// @ts-check
/**
 * Content-invariant tests closing AC-2 ("Reuse enforced") of
 * `PRPs/prds/figma-implementation-track.prd.md` — an Acceptance Criterion
 * left unimplemented across all 7 completed phases of that feature. This
 * suite covers the gap-closure fix: the new `R-COH-DS-REUSE` deterministic
 * coherence check in `code-reviewer.md`'s R-COH-* layer, and the matching
 * Hard Constraint #9 + conditional Phase 0 read + `Step 2.3.5` guard
 * (`REUSE_VIOLATION_REJECTED`) in `implementer.md`.
 *
 * Source (PRD-less / description mode — this plan closes a gap in an
 * already-APPROVED, already-shipped PRD rather than adding a new phase, so
 * it carries no `## Source PRD` pointer and its Acceptance Criteria carry no
 * `(PRD AC-N)` token):
 * PRPs/plans/completed/enforce-figma-component-reuse-per-ac-2-of-figma-implementation-track.plan.md
 * Diff reviewed: PRPs/reports/enforce-figma-component-reuse-per-ac-2-of-figma-implementation-track/attempts/1/diff.patch
 *
 * Existing-coverage scan performed before authoring (Step 2.1): grepped every
 * scripts/validate/checks/*.test.mjs file for a reference to
 * `agents/code-reviewer.md` or `agents/implementer.md` — none found. Both
 * files are virgin territory for the test suite; every test below is
 * NEW_TEST_REQUIRED. No EXISTING_TEST_COVERS, EXISTING_TEST_UPDATED,
 * OBSOLETE_TEST_REMOVED, or REDUNDANT_TEST_REMOVED outcome applies to any
 * in-scope AC-A this session.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED plan:
 * PRPs/plans/completed/enforce-figma-component-reuse-per-ac-2-of-figma-implementation-track.plan.md
 *
 * Traceability (plan's own `## Acceptance Criteria` — description mode, no
 * PRD AC-N token; all four items are in scope, this is a single-phase plan):
 *
 *   AC-A1 (R-COH-DS-REUSE fails, citing the mapped import path, when a
 *     REUSE-mapped node's task creates a duplicate file)
 *   AC-A2 (R-COH-DS-REUSE is zero-emission when figma_track is off/absent or
 *     design_source is none/absent — preserves PRD AC-1 "inert when off")
 *   AC-A3 (implementer.md's Step 2.3.5 halts REUSE_VIOLATION_REJECTED citing
 *     the mapped import path, mirroring Step 2.3's shape — not a silent
 *     workaround, not a third Phase-4 verdict)
 *   AC-A4 (both new checks degrade gracefully to passed:true with an
 *     explicit reason — never a hard failure, never zero-emission once
 *     active — when the Design Spec is unresolvable)
 *
 * Run: node --test scripts/validate/checks/figma-track-ac2-reuse-enforcement.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const IMPLEMENTER_PATH = 'plugins/relay/agents/implementer.md';

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
 * where a given source file happens to wrap a sentence. Mirrors
 * figma-track-phase1/3/4/5.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1/3/4/5.test.mjs's
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
// AC-A2 — zero-emission gate (checked first: this is the load-bearing
// "inert when off" invariant every other property below sits behind).
// ---------------------------------------------------------------------------

test('AC-A2: code-reviewer.md R-COH-DS-REUSE is a zero-emission no-op (not even a passed:true row) unless figma_track: true AND design_source: figma, keeping a non-Figma diff\'s rubric[] array byte-identical to today', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '#### R-COH-DS-REUSE — REUSE-mapped Figma nodes are not duplicated',
    '### Bounded sub-agent dispatch'
  );
  assert.ok(block, 'expected an extractable R-COH-DS-REUSE block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /\*\*Zero-emission branch:\*\* unless `<target_root>\/docs\/context\/methodology\.md` declares `figma_track: true` AND the plan's `## Metadata` table's `design_source` row reads `figma`/
  );
  assert.match(
    collapsed,
    /emit NO row at all for this check — not even a `passed: true` row — keeping a non-Figma diff's `rubric\[\]` array byte-identical to today\. Do NOT fail in this case\./
  );
});

// ---------------------------------------------------------------------------
// AC-A1 — R-COH-DS-REUSE fails, citing the mapped import path, when a
// REUSE-mapped node's task creates a duplicate file.
// ---------------------------------------------------------------------------

test('AC-A1: code-reviewer.md R-COH-DS-REUSE resolves the Design Spec by convention path, extracts REUSE rows from ## Component Mapping, cross-references plan tasks by node-id/CM-<n>, and FAILs citing the mapped import path verbatim when a task CREATEs a file that is not that path', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    "Otherwise (`figma_track: true` and `design_source: figma`):",
    '### Bounded sub-agent dispatch'
  );
  assert.ok(block, 'expected an extractable R-COH-DS-REUSE active-gate block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /Resolve `design_spec_path = <target_root>\/PRPs\/designs\/<feature>\/design-spec\.md`/
  );
  assert.match(
    collapsed,
    /parse its `## Component Mapping` table for `Verdict == REUSE` rows, extracting `\{node_id, cm_id, import_path\}` from each row's Evidence cell/
  );
  assert.match(
    collapsed,
    /grep the plan's `## Step-by-Step Tasks` body .* for the row's node-id or `CM-<n>` id — same technique as `R-COH-DESIGN-GROUNDED` — to find in-scope tasks\./
  );
  assert.match(
    collapsed,
    /For each in-scope REUSE row, FAIL when that task's `## Files to Change` action is `CREATE` of a file that is NOT the REUSE row's cited import path\. The `reason` string MUST cite the mapped import path verbatim \(per AC-2's own wording: "citing the mapped import path"\)\./
  );
});

test('AC-A1: implementer.md Hard Constraint 9 states a CREATE-action task targeting a REUSE-classified node halts per Step 2.3.5 rather than being executed — the mapped import path must be reused, never duplicated', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const block = sliceBetween(
    content,
    '9. **No new component files for REUSE-mapped Figma nodes (Figma',
    '---'
  );
  assert.ok(block, 'expected an extractable Hard Constraint 9 block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /a CREATE-action task whose target node\/`CM-<n>` is classified REUSE in the feature's Design Spec `## Component Mapping` table halts per Step 2\.3\.5 rather than being executed — the mapped import path must be reused, never duplicated\./
  );
});

// ---------------------------------------------------------------------------
// AC-A3 — implementer.md's Step 2.3.5 halts REUSE_VIOLATION_REJECTED citing
// the mapped import path, mirroring Step 2.3's shape.
// ---------------------------------------------------------------------------

test('AC-A3: implementer.md Step 2.3.5 checks a CREATE task\'s node-id/CM-<n> against the held REUSE-row set before Step 2.2 applies the change, and halts with a structured REUSE_VIOLATION_REJECTED error (not a Phase 4 verdict) rather than creating the duplicate', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const block = sliceBetween(
    content,
    '### Step 2.3.5 — REUSE-mapped Figma node guard (Figma track only)',
    '### Step 2.4 — Move on'
  );
  assert.ok(block, 'expected an extractable Step 2.3.5 block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /before applying a CREATE action \(Step 2\.2\), check whether the task's target node-id\/`CM-<n>` .* matches a held REUSE row\. If it does, halt with a structured error/
  );
  assert.match(collapsed, /REUSE_VIOLATION_REJECTED:/);
  assert.match(collapsed, /reused_import_path: <the REUSE row's mapped import path, verbatim>/);
  assert.match(
    collapsed,
    /this is a plan-rubric defect upstream, not something the implementer silently obeys\./
  );
  assert.match(
    collapsed,
    /Do NOT proceed to the next task\. Do NOT continue to Phase 3\. Do NOT emit a Phase 4 verdict — this is a halt, not a third verdict shape\./
  );
});

test('AC-A3: implementer.md still defines exactly two Phase 4 verdict shapes (IMPLEMENTATION_COMPLETE, TEST_CONTRACT_DISPUTE) — the new REUSE guard is a halt, not a third verdict type', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const phase4Headings = content.match(/^### Phase 4\..*$/gm) ?? [];
  assert.equal(phase4Headings.length, 2, `expected exactly 2 Phase 4 verdict headings, found ${phase4Headings.length}: ${phase4Headings.join(', ')}`);
  assert.match(phase4Headings.join(' '), /IMPLEMENTATION_COMPLETE/);
  assert.match(phase4Headings.join(' '), /TEST_CONTRACT_DISPUTE/);
});

// ---------------------------------------------------------------------------
// AC-A4 — both new checks degrade gracefully (passed:true + reason) when the
// Design Spec is unresolvable; never a hard failure, never zero-emission
// once the two-part gate is active.
// ---------------------------------------------------------------------------

test('AC-A4: code-reviewer.md R-COH-DS-REUSE has a named silent-degradation branch (unresolvable spec, zero REUSE rows, or no referencing task) emitting passed:true with a reason, mirroring R-COH-REGISTRY-MISSING/R-COH-CONFIG-DANGLING, and states it is never zero-emission nor a hard failure once the gate is active', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const block = sliceBetween(
    content,
    "Otherwise (`figma_track: true` and `design_source: figma`):",
    '### Bounded sub-agent dispatch'
  );
  assert.ok(block, 'expected an extractable R-COH-DS-REUSE active-gate block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /\*\*Silent-degradation branch:\*\* when the Design Spec can't be resolved\/read \(including description-mode plans where the path isn't derivable\), when the spec has zero REUSE rows, or when no plan task references any REUSE-mapped node, emit `\{ "id": "R-COH-DS-REUSE", "passed": true, "reason": "<specific reason>" \}`/
  );
  assert.match(
    collapsed,
    /mirroring `R-COH-REGISTRY-MISSING`'s and `R-COH-CONFIG-DANGLING`'s existing silent-degradation branches\. Never zero-emission once the two-part gate above is active; never a hard failure in this branch\./
  );
});

test('AC-A4: implementer.md\'s conditional Phase 0 read holds an empty REUSE-row set (never halts) when figma_track is off, design_source is none/absent, or the Design Spec cannot be read', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const block = sliceBetween(
    content,
    'Also from `docs/context/methodology.md`, capture the',
    '`<plan_path>` — read end-to-end'
  );
  assert.ok(block, 'expected an extractable Phase 0 figma_track/design_source read block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /When `figma_track` is false\/absent, or `design_source` is `none`\/absent, or the Design Spec cannot be read, hold an empty REUSE-row set and do NOT halt/
  );
});

test('AC-A4: implementer.md Step 2.3.5 itself is zero-effect (no guard fires) when the Phase 0 REUSE-row set is empty — the common figma-off / no-REUSE-mapping case', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const block = sliceBetween(
    content,
    '### Step 2.3.5 — REUSE-mapped Figma node guard (Figma track only)',
    'Otherwise: before applying a CREATE action'
  );
  assert.ok(block, 'expected an extractable Step 2.3.5 zero-effect preamble');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /Zero-effect when the Phase 0 REUSE-row set .* is empty — this is the common case \(`figma_track` off, `design_source` not `figma`, or the Design Spec unresolvable\) and requires no action here\./
  );
});

// ---------------------------------------------------------------------------
// Row-count / example bookkeeping consistency (supports AC-A1 — a stale
// count would make the rubric's own documentation of R-COH-DS-REUSE's
// existence unreliable).
// ---------------------------------------------------------------------------

test('AC-A1 (bookkeeping): code-reviewer.md\'s rubric[] row-count arithmetic and standard-mode JSONL example both account for the new R-COH-DS-REUSE deterministic row', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);

  const arithmeticBlock = sliceBetween(
    content,
    'The total `rubric[]` length per standard-mode run is',
    'When the K=5 pass emits N findings'
  );
  assert.ok(arithmeticBlock, 'expected an extractable rubric[] length-range paragraph');
  assert.match(collapseWs(arithmeticBlock), /5 \(deterministic R-COH-\*\)/);
  assert.match(collapseWs(arithmeticBlock), /14 to 20 rows/);

  const jsonlBlock = sliceBetween(
    content,
    '### Standard-mode APPROVED entry',
    '### Standard-mode CHANGES_REQUESTED entry'
  );
  assert.ok(jsonlBlock, 'expected an extractable standard-mode APPROVED JSONL example block');
  assert.match(jsonlBlock, /\{ "id": "R-COH-DS-REUSE", "passed": true \}/);
});
