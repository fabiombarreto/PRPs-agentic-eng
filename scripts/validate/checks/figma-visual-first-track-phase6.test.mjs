// @ts-check
/**
 * Content-invariant tests for Phase 6 ("Orchestrator wiring") of the
 * figma-visual-first-track feature (v2 of relay's Figma Implementation
 * Track) — `/relay-execute` gains a resumable visual-approval check (P3 +
 * Phase A.1, additive extension of the existing actionable-row rule), a new
 * `Phase A.2.5` resume short-circuit (adopts `relay-implement.md`'s
 * protocol mid-way on approval, from its own `Phase A.0` on rejection), and
 * a dedicated `AWAITING_VISUAL_APPROVAL` branch in `Step A.4.1`; a
 * brand-new deterministic infra command
 * `plugins/relay/commands/relay-visual-approve.md` (no writer/reviewer
 * pair); and a one-line, backward-compatible narrowing of
 * `relay-implement.md`'s Phase A.2 `prior_feedback` dispatch condition.
 *
 * Source PRD: PRPs/prds/figma-visual-first-track.prd.md
 * Source plan: PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed (15/15), IMPLEMENTED phase 6 plan. This phase is
 * `phase_type: scaffold` (markdown/JSON only, zero new `.mjs` surface) —
 * every test below is a content-invariant assertion over the edited/created
 * command files, matching the established idiom for every `scaffold` phase
 * of this track (Phases 1-4).
 *
 * Existing-coverage scan performed before authoring (Step 2.1): read
 * figma-visual-first-track-phase1-5.test.mjs in full, then dispatched two
 * independent Explore-agent sweeps across the remaining
 * scripts/validate/checks/*.test.mjs corpus searching specifically for any
 * existing assertion touching `relay-execute.md`'s content, `relay-visual-
 * approve.md`, `AWAITING_VISUAL_APPROVAL`, `Phase A.2.5`, `resume_mode`, or
 * the `last_reviewer_feedback when attempt` dispatch condition. Result:
 * - figma-visual-first-track-phase1-4.test.mjs never read relay-execute.md
 *   or relay-implement.md at all (confirmed via direct grep of their own
 *   path-constant sets — PRD/plan-template + prd-writer/prd-reviewer +
 *   plan-writer/plan-reviewer only).
 * - figma-track-phase6.test.mjs (a DIFFERENT, older v1-track file) and
 *   figma-track-phase7.test.mjs both read relay-implement.md /
 *   relay-execute.md respectively, but are scoped to disjoint properties
 *   (Phase A.3.4's dev-server/degradation mechanics; the v1
 *   `visual_outcome`/"Visual fidelity: ..." rollup line) with zero string
 *   overlap against this phase's orchestrator-level resume machinery.
 * - Zero hits anywhere in the corpus (outside figma-visual-first-track-
 *   phase5.test.mjs's own, unrelated, forward-reference HALT-message quote)
 *   for `Phase A.2.5`, `resume_mode`, `last_reviewer_feedback when
 *   attempt`, or `relay-visual-approve`'s own file content. Every property
 *   below is therefore NEW_TEST_REQUIRED, with one EXISTING_TEST_COVERS
 *   carve-out noted next.
 * - `npm run validate`'s `registration-parity` and `dispatch-graph` checks
 *   (the "does search-index.json/changelog.html registration stay green,
 *   does every dispatch/Next: pointer still resolve" properties) are
 *   EXISTING_TEST_COVERS via `figma-track-phase3.test.mjs`'s own two
 *   real-wrapper tests (`runDispatchGraphCheck()` at lines 204-210,
 *   `runRegistrationParityCheck()` at lines 212-218) — both call the thin,
 *   un-fixtured wrapper functions directly against "whatever is currently
 *   on disk," which now includes this phase's new `relay-visual-
 *   approve.md`. Live-verified this session: both wrappers currently return
 *   `{ok: true, findings: []}` against the real tree (confirmed via a
 *   direct inline invocation, and via `npm run validate`'s own 9/9 PASS
 *   output), inclusive of `relay-visual-approve.md`'s single generic
 *   `search-index.json` mention (the "Commands" page's catch-all excerpt)
 *   and its `changelog.html` entry (this phase's own Task 8). Re-asserting
 *   `ok:true, findings: []` here would be a same-input, same-assertion
 *   duplicate (R-DUPLICATE) of an already-green, already-covering test —
 *   left untouched this session, per the identical precedent
 *   figma-track-phase4.test.mjs's own header already established for this
 *   exact pair of checks.
 *
 * Lifecycle updates (this session, EXISTING_TEST_UPDATED, separate from
 * this new file, recorded here for cross-reference — full justification in
 * PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle
 * ledger): `plugins/relay/commands/relay-visual-approve.md` legitimately
 * references both `/relay-design-map` (its own Phase B mirrors `/relay-
 * design-map`'s Phase E confirm-then-single-Edit discipline "precisely",
 * per this plan's own Task 7 **MIRROR** directive) and `/relay-design-spec`
 * (a single bare sibling-command analogy in Constraint 4). This made two
 * PRE-EXISTING, already-APPROVED tests in the v1-track file corpus
 * over-broad the moment `relay-visual-approve.md` landed on disk — both
 * confirmed failing before this session's fix (`node --test` on each file
 * individually: 4/5 and 5/6 passing respectively, one failure each, both
 * `AssertionError`s naming `relay-visual-approve.md` by name):
 *   - `scripts/validate/checks/figma-track-phase3.test.mjs` — its "no OTHER
 *     command file mentions design-map" test (already extended twice
 *     before, for `relay-design-spec.md` then `relay-visual-review.md`,
 *     via the identical MINIMAL-exclusion discipline). Fixed by adding
 *     `relay-visual-approve.md` as a fourth excluded name — see that
 *     file's own header "Third lifecycle update" paragraph.
 *   - `scripts/validate/checks/figma-track-phase4.test.mjs` — its "no OTHER
 *     command file mentions design-spec" test (already extended twice
 *     before, for `relay-plan.md` then `relay-visual-review.md`). Fixed by
 *     adding `relay-visual-approve.md` as a fourth excluded name — see that
 *     file's own header "Third lifecycle update" paragraph.
 * Both fixes preserve every assertion's teeth: the scan still covers every
 * OTHER command file under `plugins/relay/commands/` (including
 * `relay-execute.md`, this same phase's own orchestrator edits), so either
 * check still catches a genuinely accidental cross-command mention; only
 * one additional, specifically-justified, already-APPROVED filename was
 * added to each exclusion list.
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 6's in-scope subset per the plan's own
 * ## Acceptance Criteria section AC-A1 through AC-A6; PRD AC-2, AC-3, AC-5,
 * AC-6 are OUT_OF_PHASE_SCOPE — already shipped by phases 2/3/4/5 of this
 * same track — no test for any of them in this file):
 *
 *   AC-A1 (PRD AC-4) — the P3 and Phase A.1 resumable visual-approval
 *     checks (an unresolved AWAITING_VISUAL_APPROVAL halt must never be
 *     reported as ALL_PHASES_COMPLETE — the real pre-existing bug this
 *     phase fixes), resume_mode seeding, Phase A.2.5's approved-branch
 *     mid-protocol adoption, and Step A.4.1's dedicated, no-FAILED_-prefix
 *     branch ahead of the extended generic OTHER-HALT bucket.
 *   AC-A2 (PRD AC-4) — the narrowed `prior_feedback` dispatch condition in
 *     relay-implement.md (non-emptiness, not `attempt > 1`) and Phase
 *     A.2.5's rejected-branch seeding of `last_reviewer_feedback` at a
 *     genuinely fresh `attempt = 1`, so the human's rejection feedback
 *     actually reaches the implementer's first dispatch of the resumed
 *     session.
 *   AC-A3 (PRD AC-1) — Phase A.2.5's complete no-op when `resume_mode` is
 *     null, resume_mode's null default on both the ordinary-pick path and
 *     the no-resumable-row-found path, and a real dogfood proof (this
 *     phase's own plan carries no `phase_scope`/`design_source` row).
 *   AC-A4 (PRD AC-4) — relay-visual-approve.md's locate-plan-confirm-record
 *     document order, its `FAILED_NOTHING_TO_APPROVE` /
 *     `FAILED_MULTIPLE_PENDING_APPROVALS` / `FAILED_PLAN_AMBIGUOUS` HALTs,
 *     and the P2 filter that makes a second run against an already-resolved
 *     halt idempotent (zero mutation).
 *   AC-A5 (PRD AC-4; Decisions Log "Human-gate resume mechanism") — an
 *     ambiguous/non-affirmative/non-negative reply is always "do not flip":
 *     zero Edit, zero jsonl append, halt stays unresolved.
 *   AC-A6 (PRD AC-4) — exactly one `Edit` on `halt.json` plus exactly one
 *     appended `visual-approval.jsonl` line per decision, both agreeing;
 *     the FULL-rung captured/reference PNG derivation and the degraded
 *     rung's explicit "no capture" surfacing.
 *   (interactivity boundary, cross-cutting) — `/relay-execute` never
 *     prompts and never inline-adopts `relay-visual-approve.md`; the
 *     command itself confirms it is never invoked by `/relay-execute`.
 *   (documentation of record, AC-A1..AC-A6) — changelog.html's Unreleased
 *     -> Added entry, chained after this feature's own Phase 5 entry.
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase6.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const RELAY_EXECUTE_PATH = 'plugins/relay/commands/relay-execute.md';
const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';
const RELAY_VISUAL_APPROVE_PATH = 'plugins/relay/commands/relay-visual-approve.md';
const CHANGELOG_PATH = 'documentation/changelog.html';
const THIS_PLAN_PATH = 'PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-visual-first-track-phase1-5.test.mjs's helper of the same
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
 * if `startNeedle` is absent. Mirrors figma-visual-first-track-phase1-5
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

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4) — P3's resumable visual-approval check: positioned
// before the amended zero-actionable-rows exit, emitting a structured no-op
// distinct from AC-6's "all phases complete" message.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): P3\'s resumable visual-approval check is positioned strictly between the existing actionable-row rule and the amended zero-actionable-rows exit, emits a message explicitly distinct from AC-6\'s "all phases complete", and the old pre-Phase-6 exit sentence is fully replaced (not left duplicated alongside the new one)', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);

  const p3Idx = content.indexOf('### P3 — Implementation Phases table parseable');
  const ruleIdx = content.indexOf('every comma-separated phase number listed has');
  const checkIdx = content.indexOf('Resumable visual-approval check (new, additive — runs BEFORE');
  const awaitingMsgIdx = content.indexOf('Phase `<row #>` (`<Phase name>`) is awaiting human visual approval. Run');
  const amendedExitIdx = content.indexOf(
    'If zero rows are actionable AND no resumable visual-approval row was found above, apply AC-6 (idempotent re-entry):'
  );
  const allCompleteIdx = content.indexOf('> All phases complete; nothing to orchestrate.');

  assert.ok(p3Idx > -1, 'expected the P3 heading');
  assert.ok(
    ruleIdx > p3Idx && checkIdx > ruleIdx && awaitingMsgIdx > checkIdx && amendedExitIdx > awaitingMsgIdx && allCompleteIdx > amendedExitIdx,
    'expected document order: P3 heading -> existing actionable-row rule (unmodified) -> new resumable check -> its own distinct message -> amended zero-actionable-rows exit -> AC-6\'s "all phases complete" blockquote'
  );

  assert.ok(
    content.includes(
      'Exit 0. Write no artifacts. This is a structured no-op distinct from AC-6\'s "all phases complete" message — the PRD is not fully done, it is paused on a human decision.'
    ),
    'expected the explicit distinct-from-AC-6 framing sentence'
  );
  assert.ok(
    !content.includes('If zero rows are actionable, apply AC-6 (idempotent re-entry):'),
    'expected the OLD pre-Phase-6 zero-actionable-rows sentence to be fully replaced, not left duplicated alongside the new amended one'
  );
});

// ---------------------------------------------------------------------------
// AC-A1, AC-A3 (PRD AC-4, AC-1) — Phase A.1's mirror of the same check: an
// unresolved AWAITING_VISUAL_APPROVAL halt must NEVER fall through to the
// "no actionable row" / ALL_PHASES_COMPLETE branch (the real pre-existing
// bug this phase fixes), and resume_mode defaults to null on every
// non-resumed path.
// ---------------------------------------------------------------------------

test('AC-A1, AC-A3 (PRD AC-4, AC-1): Phase A.1\'s resumable visual-approval check runs BEFORE the "no actionable row" / ALL_PHASES_COMPLETE branch, and an unresolved AWAITING_VISUAL_APPROVAL halt explicitly does NOT fall through to that branch — pinning the exact bug this phase fixes so it cannot silently reopen', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);

  const a1Idx = content.indexOf('### Phase A.1 — Pick next actionable phase');
  const checkIdx = content.indexOf('mirrors the P3 precondition');
  const noActionableIdx = content.indexOf('If **no** actionable row is found');
  const allPhasesCompleteIdx = content.indexOf('"outcome": "ALL_PHASES_COMPLETE"');

  assert.ok(a1Idx > -1, 'expected the Phase A.1 heading');
  assert.ok(
    checkIdx > a1Idx && noActionableIdx > checkIdx && allPhasesCompleteIdx > noActionableIdx,
    'expected document order: Phase A.1 heading -> resumable check -> "no actionable row" branch -> ALL_PHASES_COMPLETE outcome'
  );

  const block = sliceBetween(content, 'mirrors the P3 precondition', 'There is at most one such row');
  assert.ok(block, 'expected an extractable Phase A.1 resumable-check block');
  assert.ok(
    block.includes(
      'No `resolution` field yet: apply the SAME structured no-op the P3 precondition performs (emit the "awaiting human visual approval" message, exit 0, no artifacts) rather than falling through to the "no actionable row" branch below.'
    ),
    'expected the explicit no-fallthrough guarantee for an unresolved AWAITING_VISUAL_APPROVAL halt'
  );
  assert.ok(
    block.includes(
      'A `resolution` field is present (`"approved"` or `"rejected"`): set `current_phase_N` to that row\'s `#` and `current_phase_slug` to that row\'s kebab-cased `Phase` cell (mirroring `plan-writer.md`\'s own slug derivation), set `resume_mode` to the `resolution` value'
    ),
    'expected the resolved branch to seed current_phase_N/current_phase_slug/resume_mode from the halt.json resolution value'
  );

  // AC-A3: resume_mode defaults to null on BOTH non-resumed paths — the
  // "check found nothing" fallthrough, and the ordinary actionable-row pick.
  assert.ok(
    content.includes(
      'There is at most one such row under this orchestrator\'s serial execution model (D6). If none is found, proceed to the normal actionable-row pick below with `resume_mode = null`.'
    ),
    'expected resume_mode to default to null when the resumable-visual-approval scan finds no matching row'
  );
  assert.ok(
    content.includes(
      'Pick the lowest-numbered actionable row. Record `current_phase_N` and `current_phase_slug`. Set `resume_mode = null` (a fresh, non-resumed phase pick).'
    ),
    'expected resume_mode to be explicitly set to null on the ordinary actionable-row pick'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-1) — Phase A.2.5 is a complete no-op when resume_mode is
// null: the case for every project that does not declare visual_first:
// true, and for every ordinary pending-row pick.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-1): Phase A.2.5 is positioned strictly between Phase A.2 and Phase A.3, and is a complete no-op when resume_mode is null — proceeding directly to Phase A.3 exactly as today, for every project that does not declare visual_first: true', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);

  const a2Idx = content.indexOf('### Phase A.2 — Wall-clock budget check');
  const a25Idx = content.indexOf('### Phase A.2.5 — Resume-from-visual-approval short-circuit');
  const a3Idx = content.indexOf('### Phase A.3 — Per-phase plan sub-flow');
  assert.ok(
    a2Idx > -1 && a25Idx > a2Idx && a3Idx > a25Idx,
    'expected Phase A.2.5 positioned strictly between Phase A.2 and Phase A.3'
  );

  const block = sliceBetween(
    content,
    '### Phase A.2.5 — Resume-from-visual-approval short-circuit',
    '`current_plan_path` is derived directly from disk'
  );
  assert.ok(block, 'expected an extractable Phase A.2.5 opening block');
  assert.ok(
    block.includes(
      'Runs only when `resume_mode` is non-null (set by Phase A.1\'s resumable visual-approval check, Task 2). When `resume_mode` is `null` — the case for every project that does not declare `visual_first: true`, and for every ordinary pending-row pick — this phase is a complete no-op: proceed directly to Phase A.3 exactly as today.'
    ),
    'expected the explicit null-resume_mode no-op guarantee'
  );
});

// ---------------------------------------------------------------------------
// AC-A1, AC-A2 (PRD AC-4) — Phase A.2.5's approved-resume branch: adopts
// relay-implement.md's protocol starting at its OWN Phase A.3.5, skipping
// A.0-A.3.4 entirely, and records a visual_outcome value distinct from a
// plain machine-approved pass.
// ---------------------------------------------------------------------------

test('AC-A1, AC-A2 (PRD AC-4): Phase A.2.5\'s approved-resume branch adopts relay-implement.md\'s protocol starting at its OWN Phase A.3.5 — Phase A.0/A.1/A.2/A.3/A.3.4 all SKIPPED because the implementer/code-reviewer/visual-verifier already ran in the original session — and records a visual_outcome distinct from a plain "APPROVED" so a human override is never silently conflated with an unreviewed clean machine pass', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const block = sliceBetween(content, '`resume_mode == "approved"`', '`resume_mode == "rejected"`');
  assert.ok(block, 'expected an extractable approved-branch block');

  assert.ok(
    block.includes(
      'Adopt `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md`\'s protocol inline starting at its own `Phase A.3.5 — Docs-sync dispatch` — its Phase A.0 initialisation, Phase A.1 pre-flight checks, and Phase A.2/A.3/A.3.4 dispatch are all SKIPPED entirely for this resume, because the implementer, code-reviewer, and visual-verifier already ran to completion in the session that produced the original halt, and the worktree still holds their exact uncommitted output'
    ),
    'expected the approved branch to adopt relay-implement.md starting at Phase A.3.5, skipping A.0-A.3.4'
  );
  assert.ok(
    block.includes(
      'Record `visual_outcome = "APPROVED (human-approved after <final_visual_verdict>)"` — deliberately distinct from a plain `"APPROVED"` so the eventual summary never silently implies an unreviewed clean machine pass when the underlying verdict was actually `VISUAL_DEGRADED` or `VISUAL_MISMATCH` and a human overrode it.'
    ),
    'expected the distinct visual_outcome value guarding against implying an unreviewed clean pass'
  );
  assert.ok(
    block.includes('On success, proceed to Phase A.4.5 exactly as Step A.4.1 already does today.'),
    'expected the approved branch to reach D8/Phase A.4.5 on success, same terminal path as a normal implement pass'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) — Phase A.2.5's rejected-resume branch: fresh attempt =
// 1, human_visual_rejection feedback seeded, reaching the implementer's
// FIRST dispatch of the resumed session.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-4): Phase A.2.5\'s rejected-resume branch re-enters relay-implement.md at its OWN Phase A.0 (a genuinely fresh attempt = 1) and seeds last_reviewer_feedback = [{rubric_id: "human_visual_rejection", ...}] — the same [{rubric_id, reason}] shape the existing DISPUTE_REJECTED branch already uses — explicitly stating this reaches the implementer\'s very first dispatch of the resumed session', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const block = sliceBetween(content, '`resume_mode == "rejected"`', 'Skip Phase A.3 (plan sub-flow) and Phase A.3.3');
  assert.ok(block, 'expected an extractable rejected-branch block');

  assert.ok(
    block.includes(
      'adopt `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md`\'s protocol inline from its OWN `Phase A.0` — a fresh attempt budget, fresh `deadline_ts`, `attempt = 1`, exactly as every other halt-then-manual-fix-then-rerun path in this codebase already resets'
    ),
    'expected the rejected branch to re-enter relay-implement.md at its own Phase A.0 with a genuinely fresh attempt = 1'
  );
  assert.ok(
    block.includes(
      'set `last_reviewer_feedback = [{rubric_id: "human_visual_rejection", reason: <the re-read halt.json\'s rejection_feedback text>}]` instead of the empty list `Phase A.0` normally sets it to — the same `[{rubric_id, reason}]` shape the existing `DISPUTE_REJECTED` arbitration branch already populates it with, reused rather than inventing a new shape.'
    ),
    'expected the human_visual_rejection feedback seed reusing the existing [{rubric_id, reason}] shape'
  );
  assert.ok(
    block.includes(
      'so this seeded value reaches the implementer\'s very first dispatch of the resumed session, satisfying AC-A2.'
    ),
    'expected the explicit statement that the seeded feedback reaches the implementer\'s FIRST dispatch'
  );
});

test('AC-A2 (PRD AC-4): relay-implement.md\'s Phase A.2 implementer dispatch reads prior_feedback from last_reviewer_feedback NON-EMPTINESS, not attempt > 1 — a test that would still pass against the old attempt > 1 gate provides no protection against a silent revert of this exact fix, so both the new and the absent-old string are asserted', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  assert.ok(
    content.includes('prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,'),
    'expected the narrowed non-empty condition literally inside the Task(...) dispatch payload'
  );
  assert.ok(
    !content.includes('prior_feedback: <last_reviewer_feedback when attempt > 1; null otherwise>,'),
    'expected the OLD attempt > 1 condition to be fully replaced, not left alongside the new one — a silent revert of this exact line would break AC-A2 structurally'
  );

  const phaseA2Idx = content.indexOf('### Phase A.2 — Implementer dispatch + diff capture');
  const conditionIdx = content.indexOf('prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,');
  const phaseA3Idx = content.indexOf('### Phase A.3 — Code-reviewer dispatch + verdict branching');
  assert.ok(
    phaseA2Idx > -1 && conditionIdx > phaseA2Idx && conditionIdx < phaseA3Idx,
    'expected the narrowed condition positioned inside Phase A.2\'s own dispatch block, before Phase A.3'
  );

  assert.ok(
    content.includes('a deliberately narrow generalization (Figma Visual-First Track Phase 6, `docs/decisions.md`)'),
    'expected the justification sentence framing this as a deliberate, narrow generalization'
  );
  assert.ok(
    content.includes(
      'lets `/relay-execute`\'s resume-from-rejected-visual-approval path (`relay-execute.md` Phase A.2.5) seed feedback for a genuine `attempt == 1` dispatch, which the old condition would have silently discarded.'
    ),
    'expected the justification sentence to name the exact resume path this condition unblocks'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4) — Step A.4.1 gains a dedicated AWAITING_VISUAL_APPROVAL
// branch, checked BEFORE the extended generic OTHER-HALT bucket, carrying
// no FAILED_ prefix.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): Step A.4.1 gains a dedicated AWAITING_VISUAL_APPROVAL branch positioned before the renamed "On any OTHER HALT" bucket, its outcome carries no FAILED_ prefix, and the renamed heading additionally enumerates VISUAL_GATE_BLOCKED', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);

  const successIdx = content.indexOf(
    'Proceed to Phase A.4.5 (test-after sub-flow; a no-op unless this phase deferred to test-after at Step A.3.5.0).'
  );
  const newBranchIdx = content.indexOf('On `AWAITING_VISUAL_APPROVAL` from /relay-implement (new');
  const otherIdx = content.indexOf('On any OTHER HALT from /relay-implement');
  assert.ok(
    successIdx > -1 && newBranchIdx > successIdx && otherIdx > newBranchIdx,
    'expected the new AWAITING_VISUAL_APPROVAL branch positioned between the success branch and the renamed OTHER-HALT branch'
  );

  const block = sliceBetween(content, 'On `AWAITING_VISUAL_APPROVAL` from /relay-implement (new', 'On any OTHER HALT from /relay-implement');
  assert.ok(block, 'expected an extractable AWAITING_VISUAL_APPROVAL branch block');
  assert.ok(block.includes('"outcome": "AWAITING_VISUAL_APPROVAL",'), 'expected the orchestrator-halt.json outcome field');
  assert.ok(
    block.includes(
      'Note the `outcome` value carries NO `FAILED_` prefix — this HALT is a deliberate pause pending a human decision, not a failure.'
    ),
    'expected the explicit no-FAILED_-prefix statement'
  );
  assert.ok(
    block.includes('This is not a failure — `visual_first_approval: human` requires an'),
    'expected the additional verbatim HALT message to open by stating this is not a failure'
  );
  assert.ok(
    block.includes('`/relay-execute <prd_path>` IS the correct next step — it resumes this'),
    'expected the additional verbatim HALT message to state re-running /relay-execute is the correct next step'
  );

  assert.ok(
    !content.includes('FAILED_IMPLEMENT_AWAITING_VISUAL_APPROVAL'),
    'expected AWAITING_VISUAL_APPROVAL to never be wrapped with the FAILED_IMPLEMENT_ prefix anywhere in the file'
  );
  assert.ok(
    content.includes('PARTIAL_D8_FAILURE`, `VISUAL_GATE_BLOCKED`):'),
    'expected the renamed "On any OTHER HALT" heading to append VISUAL_GATE_BLOCKED immediately after PARTIAL_D8_FAILURE'
  );
});

// ---------------------------------------------------------------------------
// relay-visual-approve.md — document-order contract: locate the halt,
// locate the plan, confirm, then record. No Bash dependency.
// ---------------------------------------------------------------------------

test('AC-A4, AC-A5, AC-A6 (PRD AC-4): relay-visual-approve.md follows the locate-halt -> locate-plan -> confirm -> record contract in strict document order, and carries no Bash dependency (Read/Glob/Edit/Write only)', () => {
  const content = readRepoFile(RELAY_VISUAL_APPROVE_PATH);

  const p2Idx = content.indexOf('### P2 — Locate the unresolved halt');
  const p3Idx = content.indexOf('### P3 — Locate the plan');
  const confirmIdx = content.indexOf('## Phase B — Explicit confirmation');
  const recordIdx = content.indexOf('## Phase C — Record the decision');
  const editFieldsIdx = content.indexOf('resolution: "approved"');

  assert.ok(p2Idx > -1, 'expected the P2 heading');
  assert.ok(
    p3Idx > p2Idx && confirmIdx > p3Idx && recordIdx > confirmIdx && editFieldsIdx > recordIdx,
    'expected document order: P2 (locate halt) -> P3 (locate plan) -> Phase B (confirm) -> Phase C (record, adding resolution)'
  );

  assert.ok(
    content.includes('**No `Bash` dependency.** `Read`/`Glob`/`Edit`/`Write` only — no new `.claude/settings.json` allowlist entry is required'),
    'expected Constraint 5 to state no Bash dependency'
  );
});

test('AC-A4 (PRD AC-4): relay-visual-approve.md\'s P2 filter excludes any halt.json that already carries a resolution field — making a second run against an already-resolved halt yield FAILED_NOTHING_TO_APPROVE with zero mutation rather than a double-Edit or double-jsonl-append — and HALTs FAILED_MULTIPLE_PENDING_APPROVALS when more than one unresolved halt is found', () => {
  const content = readRepoFile(RELAY_VISUAL_APPROVE_PATH);
  const block = sliceBetween(content, '### P2 — Locate the unresolved halt', '### P3 — Locate the plan');
  assert.ok(block, 'expected an extractable P2 block');

  assert.ok(
    block.includes('keep only entries with `outcome == "AWAITING_VISUAL_APPROVAL"` AND no `resolution` field.'),
    'expected the P2 filter to exclude any halt.json already carrying a resolution field — the idempotency mechanism'
  );
  assert.ok(block.includes('If zero remain: HALT `FAILED_NOTHING_TO_APPROVE`:'), 'expected the FAILED_NOTHING_TO_APPROVE HALT');
  assert.ok(
    block.includes('No unresolved AWAITING_VISUAL_APPROVAL halt'),
    'expected the FAILED_NOTHING_TO_APPROVE message body'
  );
  assert.ok(
    block.includes(
      'If more than one remains: HALT `FAILED_MULTIPLE_PENDING_APPROVALS`, naming every matched `phase-<N>` path:'
    ),
    'expected the FAILED_MULTIPLE_PENDING_APPROVALS HALT'
  );

  const p3Block = sliceBetween(content, '### P3 — Locate the plan', '### P4 — Decision Gate sources readable');
  assert.ok(p3Block, 'expected an extractable P3 block');
  assert.ok(
    p3Block.includes('HALT `FAILED_PLAN_AMBIGUOUS` (mirrors Phase A.2.5\'s own `FAILED_RESUME_PLAN_AMBIGUOUS` in shape):'),
    'expected the FAILED_PLAN_AMBIGUOUS HALT, explicitly mirroring Phase A.2.5\'s own shape'
  );

  assert.ok(
    content.includes('In every HALT case, zero mutation has occurred.'),
    'expected the Final output surface to state every HALT path performs zero mutation'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-4; Decisions Log "Human-gate resume mechanism") — an
// ambiguous/non-affirmative/non-negative reply is always "do not flip".
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-4; Decisions Log "Human-gate resume mechanism"): relay-visual-approve.md\'s Phase B treats any non-unambiguous reply (silence, ambiguity, a non-answer, or a generic "continue") as "do not flip" — zero Edit, zero jsonl append, halt stays unresolved — mirroring /relay-design-map Phase E\'s discipline exactly', () => {
  const content = readRepoFile(RELAY_VISUAL_APPROVE_PATH);
  const block = sliceBetween(content, '## Phase B — Explicit confirmation', '## Phase C — Record the decision');
  assert.ok(block, 'expected an extractable Phase B block');

  assert.ok(
    block.includes(
      'Anything else — silence, an ambiguous reply, a non-answer, or a generic "continue" — MUST be treated as "do not flip": print a note that the halt remains unresolved and that re-running `/relay-visual-approve <feature>` later is safe, then exit 0 with zero mutation.'
    ),
    'expected the explicit "do not flip" branch for any non-unambiguous reply'
  );
  assert.ok(
    block.includes('Never proceed on inferred consent. Never flip on silence.'),
    'expected the closing never-infer/never-silence discipline statement'
  );
  assert.ok(
    content.includes('Mirror `/relay-design-map`\'s Phase E precisely:'),
    'expected Phase B to explicitly frame itself as mirroring /relay-design-map\'s Phase E'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-4) — exactly one Edit + exactly one jsonl line per
// decision, both agreeing; FULL-rung vs degraded-rung evidence derivation.
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-4): relay-visual-approve.md performs exactly one Edit on halt.json and appends exactly one visual-approval.jsonl line per decision (approval adds resolution/resolved_at/resolver_confirmation; rejection additionally adds rejection_feedback) — both artifacts must agree on the decision', () => {
  const content = readRepoFile(RELAY_VISUAL_APPROVE_PATH);
  const block = sliceBetween(content, '## Phase C — Record the decision', '## Final output surface');
  assert.ok(block, 'expected an extractable Phase C block');

  assert.ok(
    block.includes(
      'Both branches mutate `halt.json` exactly once and append exactly one `visual-approval.jsonl` line — never more, never independently, never any other field.'
    ),
    'expected the explicit exactly-once, both-artifacts-agree guarantee'
  );

  assert.ok(block.includes('resolution: "approved"'), 'expected the approval Edit to add resolution: "approved"');
  assert.ok(block.includes('resolved_at: "<ISO timestamp>"'), 'expected resolved_at on the approval Edit');
  assert.ok(block.includes('resolver_confirmation: "<verbatim user reply>"'), 'expected resolver_confirmation on the approval Edit');
  assert.ok(block.includes('resolution: "rejected"'), 'expected the rejection Edit to add resolution: "rejected"');
  assert.ok(
    block.includes('rejection_feedback: "<the user\'s stated reason>"'),
    'expected rejection_feedback added ONLY on the rejection Edit'
  );
});

test('AC-A4..AC-A6 (PRD AC-4): relay-visual-approve.md\'s Phase A derives a FULL-rung frame\'s captured PNG path via the same convention as compare.mjs\'s frameFilename(), sources the reference PNG path from the plan\'s own Design Source table (never independently re-derived), and surfaces the degraded rung\'s "no capture" case explicitly rather than asserting a nonexistent path', () => {
  const content = readRepoFile(RELAY_VISUAL_APPROVE_PATH);
  const block = sliceBetween(content, '## Phase A — Surface the evidence', '## Phase B — Explicit confirmation');
  assert.ok(block, 'expected an extractable Phase A block');

  assert.ok(block.includes('derive the captured PNG path as'), 'expected the FULL-rung captured PNG path derivation');
  assert.ok(
    block.includes('mirroring `compare.mjs`\'s own `frameFilename()`'),
    'expected the captured PNG path to explicitly cite compare.mjs\'s frameFilename() convention'
  );
  assert.ok(
    block.includes(
      'the reference PNG path by reading `plan_path`\'s `## Design Source` table (or, if absent, the Design Spec it references) for that `node_id`\'s own declared ref-PNG column — never re-derived independently of that authoritative source.'
    ),
    'expected the reference PNG path to be sourced from the plan\'s own Design Source table, never independently re-derived'
  );
  assert.ok(
    block.includes(
      'no captured PNG exists at all; surface this explicitly ("no capture — degraded rung, pixel comparison did not run") rather than asserting a path.'
    ),
    'expected the degraded rung\'s explicit "no capture" surfacing'
  );
});

// ---------------------------------------------------------------------------
// Interactivity boundary (cross-cutting) — /relay-execute never prompts and
// never inline-adopts relay-visual-approve.md; the command itself confirms
// it is never invoked by /relay-execute.
// ---------------------------------------------------------------------------

test('(Interactivity boundary): relay-execute.md never inline-adopts relay-visual-approve.md and states it never performs the human visual-approval decision itself — it only detects an already-recorded decision (Phase A.1) and resumes (Phase A.2.5); relay-visual-approve.md itself states it is never invoked by /relay-execute', () => {
  const execContent = readRepoFile(RELAY_EXECUTE_PATH);

  assert.ok(
    !execContent.includes('${CLAUDE_PLUGIN_ROOT}/commands/relay-visual-approve.md'),
    'expected relay-execute.md to never inline-adopt relay-visual-approve.md\'s protocol (D7 dispatch model) — it is exclusively human-triggered'
  );
  assert.ok(
    execContent.includes(
      '**Performing the human visual-approval decision itself** — that dialogue lives entirely in the separate, explicitly human-triggered `/relay-visual-approve` command; `/relay-execute` never asks the user anything, it only detects an already-recorded decision (Phase A.1) and resumes (Phase A.2.5).'
    ),
    'expected the "What you do NOT do" bullet stating /relay-execute never performs the decision itself'
  );
  assert.ok(
    execContent.includes(
      'the `AWAITING_VISUAL_APPROVAL` pause is not a failure — Phase A.1\'s resumable visual-approval check and Phase A.2.5\'s resume short-circuit are the SANCTIONED mechanism for resuming that specific phase\'s adopted `/relay-implement` protocol after a human records a decision via `/relay-visual-approve`'
    ),
    'expected the Constraints item 5 exception naming the sanctioned resume mechanism'
  );

  const approveContent = readRepoFile(RELAY_VISUAL_APPROVE_PATH);
  assert.ok(
    approveContent.includes(
      '**Never invoked by `/relay-execute`.** This command is exclusively human-triggered, exactly like `/relay-design-map` and `/relay-design-spec`.'
    ),
    'expected relay-visual-approve.md\'s own Constraint 4 stating it is never invoked by /relay-execute'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (real dogfood proof) — this feature's own phase 6 plan carries no
// phase_scope/design_source row; the new resume machinery is inert against
// this repo and this very plan, by design.
// ---------------------------------------------------------------------------

test('AC-A3 (real dogfood proof): this feature\'s own phase 6 plan\'s ## Metadata table carries no phase_scope or design_source row — this repo declares no figma_track/visual_first involvement for this row, so the new resume machinery this phase ships is inert against this repo and against this very plan, by design', () => {
  const content = readRepoFile(THIS_PLAN_PATH);
  const metadataBlock = sliceBetween(content, '## Metadata', '## Mandatory Reading');
  assert.ok(metadataBlock, 'expected an extractable ## Metadata block');
  const tableRows = metadataBlock.split('\n').filter((line) => line.trim().startsWith('|'));

  assert.ok(
    !tableRows.some((row) => /\|\s*phase_scope\s*\|/i.test(row)),
    "expected no phase_scope table row in this plan's own Metadata table"
  );
  assert.ok(
    !tableRows.some((row) => /\|\s*design_source\s*\|/i.test(row)),
    'expected no design_source table row either, for the same reason'
  );

  assert.ok(
    content.includes(
      'The new resume machinery this phase ships is inert against this repo and against this very plan, by design.'
    ),
    "expected the plan's own Notes section to state the inertness explicitly"
  );
});

// ---------------------------------------------------------------------------
// Documentation of record (AC-A1..AC-A6 collectively) — changelog.html's
// Unreleased -> Added section records this phase's entry, after this
// feature's own Phase 5 entry, before any versioned release heading.
// ---------------------------------------------------------------------------

test('(documentation of record, AC-A1..AC-A6): changelog.html\'s Unreleased -> Added section records this phase\'s resumable visual-approval check + relay-visual-approve command entry, positioned after this feature\'s own Phase 5 entry and before any versioned release heading', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  const unreleasedIdx = content.indexOf('<h2 id="unreleased">Unreleased</h2>');
  assert.notEqual(unreleasedIdx, -1, 'expected an id="unreleased" heading');

  const phase5EntryIdx = content.indexOf(
    "<code>/relay-implement</code>'s Phase A.3.4 is dual-mode: on <code>phase_scope: visual</code> plans, the visual gate now genuinely blocks completion until <code>VISUAL_VERIFIED</code>"
  );
  assert.notEqual(phase5EntryIdx, -1, "expected this feature's own Phase 5 changelog entry to still be present");

  const phase6EntryIdx = content.indexOf('<code>/relay-execute</code> gains a resumable visual-approval check');
  assert.notEqual(phase6EntryIdx, -1, 'expected the Phase 6 changelog entry opening clause');

  assert.ok(
    content.includes('New infra command <code>/relay-visual-approve &lt;feature&gt;</code> locates the paused phase'),
    'expected the new relay-visual-approve command clause'
  );
  assert.ok(
    content.includes('Part of the Figma Visual-First Track, Phase 6 of <code>PRPs/prds/figma-visual-first-track.prd.md</code>.'),
    'expected the Phase 6 attribution sentence'
  );

  assert.ok(phase6EntryIdx > phase5EntryIdx, "the Phase 6 entry must be positioned after this feature's own Phase 5 entry");

  const nextReleaseMatch = content.slice(unreleasedIdx).match(/<h2 id="v[0-9][^"]*"/);
  if (nextReleaseMatch) {
    const nextReleaseIdx = unreleasedIdx + /** @type {number} */ (nextReleaseMatch.index);
    assert.ok(
      phase6EntryIdx < nextReleaseIdx,
      'the entry must be positioned before the first versioned release heading (still Unreleased, not yet cut)'
    );
  }
});

// Regression-safety net (not itself one of the plan's numbered AC-A1..AC-A6,
// mirrors figma-visual-first-track-phase2/3/4/5.test.mjs's identical
// precedent for an analogous command/docs-touching phase sharing the same
// scan roots). Uses withScanRootLock since node:test runs files
// concurrently by default and path-existence.test.mjs's own AC-5 test
// transiently mutates the same SCAN_ROOTS with a synthetic fixture.
test(
  "AC-A1..AC-A6 (regression safety net): runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase's relay-execute.md and relay-implement.md edits and the new relay-visual-approve.md — confirms no dangling path/script reference was introduced",
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);
