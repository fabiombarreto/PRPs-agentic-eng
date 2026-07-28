// @ts-check
/**
 * Content/real-wrapper regression tests for Phase 3 ("Component map") of
 * the figma-implementation-track feature — the new `/relay-design-map`
 * command, the `design-map-writer`/`design-map-reviewer` agent pair, and
 * their `docs/context/component-map-template.md` canonical shape.
 *
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-3-component-map.plan.md
 *
 * Existing-coverage scan performed before authoring: cross-checked every
 * registered check module's own test file (scripts/validate/checks/*.test.mjs)
 * for a real-wrapper "ok:true, zero findings against the real repo tree"
 * assertion that would already cover this phase's three new files.
 *
 *   - dispatch-graph.test.mjs's ONLY real-wrapper test
 *     (`runDispatchGraphCheck: never emits a finding whose file resolves
 *     under plugins/prp-core`) asserts a prp-core-SCOPED subset invariant,
 *     never the broader "ok:true with zero findings against the whole real
 *     tree" property — EXISTING_TEST_COVERS does not apply to that broader
 *     property.
 *   - registration-parity.test.mjs's ONLY real-wrapper test
 *     (`runRegistrationParityCheck: never emits a finding whose file
 *     resolves under plugins/prp-core`) has the identical scoped-subset
 *     shape.
 *
 * Both gaps are the exact same missing-property-delta class already
 * established earlier in this same feature by figma-track-phase1.test.mjs
 * (AC-1/AC-A3's version-parity real-wrapper test) and
 * figma-track-phase2.test.mjs (AC-1/AC-A1's path-existence real-wrapper
 * test) — this file supplies the phase-3 instances of that same delta for
 * the two checks whose scan surface actually includes this phase's new
 * files (dispatch-graph reads every plugins/relay/commands/*.md body for
 * subagent_type/Next: pointers; registration-parity reads
 * plugins/relay/commands/ + plugins/relay/agents/ basenames against the
 * three doc-surface files). No existing test anywhere in the repo asserts
 * the command-scoped "no OTHER command dispatches
 * design-map-writer/design-map-reviewer" inertness property either — that
 * is outside every registered check's scope (dispatch-graph only verifies
 * that a reference RESOLVES, never that a given agent is referenced by
 * exactly one command), so it is a genuinely new assertion, not a
 * duplicate of anything dispatch-graph.test.mjs already proves.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 3 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-3-component-map.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 3 per the plan's own Acceptance Criteria
 * section: AC-1 and AC-2 only, via plan AC-A1/AC-A2. AC-3, AC-4, AC-5 are
 * OUT_OF_PHASE_SCOPE, deferred to later phases of the Implementation Phases
 * table):
 *
 *   AC-1 / AC-A1 (Inert when off) — none of this phase's three new files
 *     (plugins/relay/commands/relay-design-map.md,
 *     plugins/relay/agents/design-map-writer.md,
 *     plugins/relay/agents/design-map-reviewer.md) are ever dispatched or
 *     invoked by any OTHER command; npm run validate's dispatch-graph and
 *     registration-parity checks both still return ok:true with zero
 *     findings against the real repository tree after this phase's
 *     additions — the phase stays fully inert until a human explicitly
 *     runs /relay-design-map.
 *
 *   Lifecycle update (2026-07-23, EXISTING_TEST_UPDATED, corrected same day):
 *     the third AC-1/AC-A1 test below originally scanned EVERY other command
 *     file in plugins/relay/commands/ for any mention of "design-map". Phase 4
 *     (figma-implementation-track-phase-4-design-spec.plan.md, Task 3)
 *     legitimately and intentionally has relay-design-spec.md reference
 *     `/relay-design-map` in prose — its own P1 precondition HALT message
 *     ("Run /relay-design-map first — its Phase E is the one sanctioned
 *     path to flip figma_track: true"), an already-APPROVED, correct
 *     behavior, not a regression.
 *
 *     A first attempt at this update narrowed the scan from ALL other
 *     command files down to relay-execute.md ALONE. test-reviewer correctly
 *     rejected that fix (R-LIFECYCLE-LEGITIMATE FAIL,
 *     PRPs/plans/figma-implementation-track.test-write-review.jsonl
 *     2026-07-23T16:32:25Z): dispatch-graph.mjs only verifies that a
 *     subagent_type/Next: reference RESOLVES, never that a given agent is
 *     referenced by exactly the one command that legitimately dispatches
 *     it — so this prose-scan test is the ONLY guard in the suite against
 *     an accidental design-map mention/dispatch anywhere under
 *     plugins/relay/commands/. relay-execute.md inline-adopts eight other
 *     command files as part of the same autonomous stretch (relay-plan.md,
 *     relay-plan-review.md, relay-implement.md, relay-write-test.md,
 *     relay-test-write-review.md, relay-test.md, relay-test-review.md,
 *     relay-worktree.md, per the D7 dispatch model) — narrowing the scan to
 *     relay-execute.md alone silently dropped coverage over all eight of
 *     those files, which the PRD's own Architecture Notes guarantee
 *     ("the entire autonomous stretch") requires.
 *
 *     Corrected fix (this revision): MINIMAL exclusion instead of narrow
 *     inclusion. The scan again covers EVERY file under
 *     plugins/relay/commands/, exactly as originally, with exactly two
 *     names excluded: relay-design-map.md itself (self-reference — the
 *     file's own name is "design-map") and relay-design-spec.md (the one
 *     file whose P1 precondition HALT message legitimately and
 *     intentionally references `/relay-design-map`, confirmed by direct
 *     read of relay-design-spec.md in full). Every other command file,
 *     including relay-execute.md and all eight files it inline-adopts, is
 *     confirmed by direct read to contain zero mentions of "design-map" and
 *     remains fully covered by this test. Full justification recorded in
 *     PRPs/reports/figma-implementation-track/test-suite.diff's Lifecycle
 *     ledger.
 *
 *   Second lifecycle update (2026-07-23, EXISTING_TEST_UPDATED — same day,
 *     third recurrence of this exact pattern): Phase 7
 *     (figma-implementation-track-phase-7-surface-integration.plan.md,
 *     Task 1) added plugins/relay/commands/relay-visual-review.md, which
 *     legitimately and intentionally references `/relay-design-map` in its
 *     P3 precondition HALT message ("Set figma_track: true via the
 *     explicit, quoted human confirmation step of /relay-design-map
 *     first — this command never flips the key itself"). This is the new
 *     standalone visual-review command's own figma_track-declared
 *     precondition pointing the operator at the one sanctioned setup
 *     command — an already-APPROVED, correct cross-reference, not a
 *     regression. Applying the same MINIMAL-exclusion discipline
 *     established above (never narrowing the scan itself — only adding one
 *     more excluded filename to the existing set): relay-visual-review.md
 *     is added as a third excluded name alongside relay-design-map.md
 *     (self) and relay-design-spec.md. Confirmed by direct read of
 *     relay-visual-review.md in full (exactly one "design-map" mention, at
 *     its P3 HALT message), and by direct read of every other command file
 *     under plugins/relay/commands/ — all 15 remaining files, including
 *     relay-execute.md, relay-qa-report.md, and relay-pr.md (the three
 *     other command files Phase 7 also touched) — to confirm zero mentions
 *     of "design-map" in any of them. Full justification recorded in
 *     PRPs/reports/figma-implementation-track/test-suite.diff's Lifecycle
 *     ledger.
 *
 *   Third lifecycle update (2026-07-27, EXISTING_TEST_UPDATED — test-after
 *     session for figma-visual-first-track Phase 6, "Orchestrator wiring"):
 *     the new deterministic infra command
 *     plugins/relay/commands/relay-visual-approve.md legitimately and
 *     intentionally references `/relay-design-map` three times — its own
 *     "See:" pointer list ("the confirm-then-single-Edit discipline this
 *     command's own Phase B/C mirror"), its "## Phase B — Explicit
 *     confirmation" heading text ("Mirror `/relay-design-map`'s Phase E
 *     precisely"), and Constraint 3's confirmation-discipline cross-
 *     reference, plus a fourth bare mention in Constraint 4 ("exactly like
 *     `/relay-design-map` and `/relay-design-spec`"). This is a direct,
 *     PRD-authorized mirror relationship: the
 *     figma-visual-first-track-phase-6-orchestrator-wiring plan's own
 *     Task 7 **MIRROR** line directs relay-visual-approve.md's Phase B to
 *     mirror relay-design-map.md's Phase E confirm-then-single-Edit
 *     discipline "precisely" — an already-APPROVED, correct cross-
 *     reference, not a regression. Applying the same MINIMAL-exclusion
 *     discipline established above (never narrowing the scan itself — only
 *     adding one more excluded filename to the existing set):
 *     relay-visual-approve.md is added as a fourth excluded name alongside
 *     relay-design-map.md (self), relay-design-spec.md, and
 *     relay-visual-review.md. Confirmed by direct read of
 *     relay-visual-approve.md in full (four "design-map" mentions, all at
 *     its own Phase B / Constraint 3 / Constraint 4 / "See:" pointer, none
 *     a dispatch or invocation), and by direct read of every other command
 *     file under plugins/relay/commands/ — including relay-execute.md
 *     (this same phase's own orchestrator edits) — to confirm zero
 *     mentions of "design-map" in any of them. Full justification recorded
 *     in PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle
 *     ledger.
 *   AC-2 / AC-A2 (Reuse enforced — structural foundation) — the
 *     design-map-reviewer agent's R-DM1 rubric item requires every
 *     CONFIRMED/INFERRED row's cited import path to actually resolve in
 *     the design-system clone source BEFORE the map can reach APPROVED,
 *     and the DRAFT→APPROVED flip is structurally gated behind a full
 *     R-DM1..R-DM6 pass (never performed on a CHANGES_REQUESTED verdict).
 *
 * Run: node --test scripts/validate/checks/figma-track-phase3.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { runDispatchGraphCheck } from './dispatch-graph.mjs';
import { runRegistrationParityCheck } from './registration-parity.mjs';

const COMMANDS_DIR = 'plugins/relay/commands';
const NEW_COMMAND_FILE = 'relay-design-map.md';
const REVIEWER_PATH = 'plugins/relay/agents/design-map-reviewer.md';
// The other command files that legitimately mention "design-map" in prose —
// relay-design-spec.md's P1 precondition HALT message points the user at
// /relay-design-map (confirmed by direct read, Phase 4 plan Task 3,
// already-APPROVED), relay-visual-review.md's P3 precondition HALT message
// does the same (confirmed by direct read, Phase 7 plan Task 1,
// already-APPROVED), and relay-visual-approve.md mirrors /relay-design-map's
// Phase E confirm-then-single-Edit discipline per its own Task 7 MIRROR
// directive (confirmed by direct read, figma-visual-first-track Phase 6
// plan Task 7, already-APPROVED). Every other file under COMMANDS_DIR
// remains scanned.
const LEGITIMATE_REFERENCE_FILES = ['relay-design-spec.md', 'relay-visual-review.md', 'relay-visual-approve.md'];

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
 * where a given source file happens to wrap a sentence.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1.test.mjs's helper
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
// AC-1 / AC-A1 — dispatch-graph and registration-parity both still return
// ok:true with zero findings against the real repo tree after this phase's
// three new files (missing-property delta over each check's existing
// prp-core-scoped-only real-wrapper test).
// ---------------------------------------------------------------------------

test('AC-1/AC-A1: runDispatchGraphCheck() returns ok:true with zero findings against the real repo tree after relay-design-map.md + design-map-writer.md + design-map-reviewer.md were added (the two subagent_type dispatches inside relay-design-map.md resolve; no dangling reference introduced anywhere)', () => {
  const result = runDispatchGraphCheck();

  assert.equal(result.name, 'dispatch-graph');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('AC-1/AC-A1: runRegistrationParityCheck() returns ok:true with zero findings against the real repo tree after relay-design-map/design-map-writer/design-map-reviewer were registered across search-index.json, changelog.html, and the NAV surfaces', () => {
  const result = runRegistrationParityCheck();

  assert.equal(result.name, 'registration-parity');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// Lifecycle update (2026-07-23, EXISTING_TEST_UPDATED; corrected same day
// after test-reviewer's CHANGES_REQUESTED on an over-narrow first attempt,
// then updated a second time same day for Phase 7's relay-visual-review.md,
// then a third time on 2026-07-27 for figma-visual-first-track Phase 6's
// relay-visual-approve.md — see this file's header comment for the full
// history, including the second and third lifecycle-update paragraphs).
// Minimal exclusion: every command file is scanned except
// relay-design-map.md (self-reference) and the three files whose own
// precondition/mirror text legitimately references `/relay-design-map`:
// relay-design-spec.md (P1), relay-visual-review.md (P3), and
// relay-visual-approve.md (Phase B / Constraint 3 / Constraint 4, mirroring
// relay-design-map.md's Phase E confirm-then-single-Edit discipline per its
// own plan Task 7 MIRROR directive). This restores/preserves coverage over
// relay-execute.md AND every command file it inline-adopts (relay-plan.md,
// relay-plan-review.md, relay-implement.md, relay-write-test.md,
// relay-test-write-review.md, relay-test.md, relay-test-review.md,
// relay-worktree.md), per test-reviewer's finding that the PRD's
// Architecture Notes guarantee covers "the entire autonomous stretch", not
// relay-execute.md in isolation. See this file's header comment (AC-1/AC-A1
// lifecycle notes) and PRPs/reports/figma-visual-first-track/test-suite.diff's
// Lifecycle ledger for the full justification.
test('AC-1/AC-A1: every OTHER command file under plugins/relay/commands/ (all files except relay-design-map.md itself and the documented precondition/mirror pointers in relay-design-spec.md, relay-visual-review.md, and relay-visual-approve.md) never mentions "design-map" in any form — including relay-execute.md, the autonomous orchestrator, and every command file it inline-adopts — so this phase\'s interactive-only writer/reviewer pair can never be accidentally wired into any other command or the autonomous pipeline loop', () => {
  const allCommandFiles = readdirSync(resolve(COMMANDS_DIR)).filter((name) => name.endsWith('.md'));
  const scannedFiles = allCommandFiles.filter(
    (name) => name !== NEW_COMMAND_FILE && !LEGITIMATE_REFERENCE_FILES.includes(name)
  );

  // Guard against a silently-empty (or suspiciously small) scan set — e.g. a
  // directory-listing regression that would make the rest of this test a
  // vacuous pass. The commands directory carries well over a dozen files as
  // of this phase; a low count here signals the glob itself is broken.
  assert.ok(
    scannedFiles.length >= 10,
    `expected at least 10 other command files to scan under ${COMMANDS_DIR}, found ${scannedFiles.length} — directory listing may be broken`
  );

  for (const fileName of scannedFiles) {
    const content = readRepoFile(`${COMMANDS_DIR}/${fileName}`);
    assert.ok(
      !/design-map/i.test(content),
      `${fileName} must not mention "design-map" in any form — only relay-design-map.md (itself) and the documented precondition/mirror pointers in relay-design-spec.md, relay-visual-review.md, and relay-visual-approve.md may legitimately reference it`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-2 / AC-A2 — design-map-reviewer's R-DM1 rubric item requires the cited
// import path to resolve in the design-system clone BEFORE APPROVED, and the
// DRAFT→APPROVED flip is structurally gated behind a full R-DM1..R-DM6 pass.
// ---------------------------------------------------------------------------

test('AC-2/AC-A2: design-map-reviewer.md\'s R-DM1 rubric item requires every CONFIRMED/INFERRED row\'s cited import path to resolve to a real file in the design-system clone before the map can reach APPROVED', () => {
  const content = readRepoFile(REVIEWER_PATH);
  const block = sliceBetween(content, '### R-DM1', '### R-DM2');
  assert.ok(block, 'expected an extractable R-DM1 rubric section');

  const collapsed = collapseWs(block);
  assert.match(
    collapsed,
    /`CONFIRMED` or `INFERRED` row in the map's component table, the `Import path` cell resolves to a real file in the design-system clone/
  );
  assert.match(
    collapsed,
    /\*\*Fails when:\*\* any mapped row's import path does not resolve to a real file in the clone\./
  );
});

test('AC-2/AC-A2: the map\'s DRAFT→APPROVED flip is structurally gated behind a full R-DM1..R-DM6 pass — never performed on a CHANGES_REQUESTED verdict', () => {
  const content = readRepoFile(REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.match(
    collapsed,
    /This flip happens ONLY inside the APPROVED branch\*\* — gated by a full R-DM1\.\.R-DM6 pass\. It is NEVER performed on CHANGES_REQUESTED\./
  );

  const changesRequestedBlock = sliceBetween(content, '**If any `passed: false`', '**If all six items pass');
  assert.ok(changesRequestedBlock, 'expected an extractable CHANGES_REQUESTED branch block');
  assert.match(collapseWs(changesRequestedBlock), /Do NOT flip the map\. Do NOT proceed to Step 4\./);
});
