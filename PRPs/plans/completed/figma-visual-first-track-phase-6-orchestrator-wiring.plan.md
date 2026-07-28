# Feature: Orchestrator wiring (Phase 6 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions (HALT-and-resume orchestration mechanics); cross-cutting artifact creation (new infra command /relay-visual-approve); a deliberate, PRD-authorized extension of the interactivity boundary (relay's third, per the source PRD's own Decision Gate block); reuse of the existing actionable-row selection rule as the state-machine primitive (D6); a narrow, justified, backward-compatible edit to relay-implement.md's own Phase A.2 dispatch condition — outside the source PRD's literal Phase 6 Scope line, but required for AC-A2's rejection-feedback promise to be reachable at all (see this plan's Notes for the full justification and rejected alternatives)
- Decisions found:
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — this phase is the deliberate, PRD-authorized THIRD extension (after PRD approval and the Design Spec pair), confined to a separate, explicitly human-triggered command, never a dialogue inside the autonomous /relay-execute loop itself
  - [2026-05-01] D6 — source PRD's Implementation Phases table IS the state machine — the resume mechanism this phase builds reuses this same table + the existing actionable-row selection rule, never a separate orchestrator-state.json
  - [2026-07-23] Design Spec pair is relay's second interactivity-boundary extension (inline-adopted, mirrors prd-writer/prd-reviewer) — confirms this phase is the third, and that /relay-visual-approve's explicit-confirmation discipline should mirror the no-relayed-consent safeguard already proven twice
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder inside /relay-implement — the mechanism whose human-mode branch (shipped 2026-07-27, Phase 5) this phase completes
  - [2026-07-27] Implement-time visual gate: Phase A.3.4 becomes dual-mode — ships the exact AWAITING_VISUAL_APPROVAL/VISUAL_GATE_BLOCKED halt.json shape and verbatim HALT messages this phase's /relay-execute edits and new /relay-visual-approve command consume verbatim; explicitly forward-references this phase ("Phase 6 is the consumer of the two new HALT outcomes... not built yet")
  - [2026-04-19] Command surface: one command per stage, writer/reviewer split — /relay-visual-approve is infra-class (deterministic Read/Glob/Edit/Write, no writer/reviewer pair), mirroring relay-worktree.md/relay-commit.md/relay-pr.md, not relay-approve.md's docs-pair-dispatching variant
  - [2026-05-18] Pillar 2 "never commit" invariant — this phase's new mechanics perform no commit of any kind, mirroring Phase A.3.4's own guarantee verbatim
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — the human confirmation lives entirely inside the separate, explicitly human-triggered /relay-visual-approve command; /relay-execute itself never prompts, it only detects an already-recorded decision
  - "Writing pipeline artifacts under .claude/" — every write in this phase lands under plugins/relay/commands/, PRPs/reports/<feature>/phase-<N>/, or documentation/changelog.html, never .claude/
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; this phase's dialogue is confined to a separate, explicitly-triggered command — the third recorded extension, not a fourth mechanism
  - PRPs/ artifact convention; one command per stage with writer/reviewer split (or, for infra commands, no pair at all)
  - The source PRD's Implementation Phases table is the orchestrator's sole state machine (D6) — no parallel state file is introduced
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 6:
  "Orchestrator wiring" — Goal: `/relay-execute` can pause on a
  `human`-mode pending visual approval and resume correctly on
  re-invocation, with the human side of the gate served by a dedicated
  command. — Success signal: A simulated multi-phase visual-first run
  halts; `/relay-visual-approve` surfaces the evidence and flips (or
  rejects with routed feedback); a subsequent `/relay-execute`
  re-invocation picks up exactly where it left off.

## Summary

This phase closes the Figma Visual-First Track's `human`-mode approval loop by wiring two things: (1) `/relay-execute` gains a **resumable visual-approval check** — an additive extension of its existing actionable-row selection rule (D6) that detects a phase parked `in-progress` by Phase 5's `AWAITING_VISUAL_APPROVAL` halt and, once a human has recorded a decision, resumes that EXACT phase's `/relay-implement` protocol adoption from the correct mid-point (docs-sync onward on approval; a fresh implementer attempt seeded with the human's feedback on rejection) — never restarting plan-authoring or worktree creation, and never silently reporting `ALL_PHASES_COMPLETE` while a phase sits paused. (2) A brand-new infra command, `/relay-visual-approve <feature>`, gives the human side of the gate a dedicated, deterministic surface: it locates the one unresolved `AWAITING_VISUAL_APPROVAL` halt for a feature, surfaces the fidelity report plus captured/reference PNG paths, requires an explicit quoted affirmative reply (mirroring `/relay-design-map`'s Phase E discipline — this is relay's third interactivity-boundary extension), then records the decision via a single `Edit` on the existing `halt.json` plus an appended audit `jsonl` entry — approval unblocks the resume path above; rejection captures free-text feedback that the resume path threads into the next implementer attempt as `prior_feedback`. Both pieces are additive and gated on state that only exists when Phase 5's dual-mode gate actually fires (`phase_scope: visual` + `visual_first_approval: human`) — every other project's `/relay-execute` run stays byte-identical to today.

## User Story

```
As a developer running relay's Figma Visual-First Track in human-approval mode
I want /relay-execute to pause cleanly when a visual phase needs my sign-off, a dedicated command to show me the evidence and record my decision, and a later /relay-execute re-invocation to resume exactly where it left off
So that the human gate this track was built around is actually usable end-to-end — not just a HALT with nowhere to go — without the orchestrator ever blocking on a live prompt mid-run
```

## Problem Statement

Phase 5 shipped `/relay-implement`'s two new named HALTs (`AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`) but deliberately deferred both halves of making the human-mode gate actually resumable: its own "NOT Building" section states verbatim that "a single `/relay-implement` invocation HALTs and exits — it does not know about, and does not implement, any multi-phase orchestration resume logic," and that the `/relay-visual-approve` command itself is "Phase 6's job entirely." Today, if `/relay-execute` orchestrates a `human`-mode visual phase, `/relay-implement`'s `AWAITING_VISUAL_APPROVAL` HALT falls into `/relay-execute`'s generic "on any HALT from /relay-implement" branch, which (a) mislabels a deliberate pause as `FAILED_IMPLEMENT_AWAITING_VISUAL_APPROVAL`, (b) tells the operator "Do NOT re-run /relay-execute until the underlying cause is resolved" — actively wrong guidance for this code, and (c) leaves the source PRD row stuck at `in-progress` with no route back to `pending`, so even if the operator ignored that guidance and re-ran `/relay-execute`, Phase A.1's actionable-row rule (`Status == pending`) would never re-select the stuck phase — the orchestrator would instead falsely report `ALL_PHASES_COMPLETE`. There is also no command through which a human can actually review the captured evidence and record approval or rejection — the halt message names `/relay-visual-approve` only as a forward reference ("not yet built as of this phase").

## Solution Statement

Extend `/relay-execute`'s existing actionable-row selection rule (never replace it — D6) with one additive, narrowly-scoped clause: before concluding no row is actionable, check every `in-progress` row's own `PRPs/reports/<feature>/phase-<N>/halt.json` for `outcome == "AWAITING_VISUAL_APPROVAL"`. An unresolved one (no `resolution` field) produces a clear, accurate "awaiting human approval" no-op instead of a false `ALL_PHASES_COMPLETE`; a resolved one (`resolution: "approved"` or `"rejected"`, written by the new command below) becomes the actionable row for this invocation, short-circuiting past plan-authoring and worktree creation directly into a resume-shaped adoption of `/relay-implement`'s own protocol — starting at docs-sync on approval, or at a fresh implementer attempt seeded with the human's feedback on rejection. Separately, ship `plugins/relay/commands/relay-visual-approve.md`: a deterministic infra command (no writer/reviewer pair, mirroring `relay-worktree.md`/`relay-commit.md`/`relay-pr.md`'s shape rather than `relay-approve.md`'s docs-pair-dispatching one) that locates the single unresolved `AWAITING_VISUAL_APPROVAL` halt for a feature, surfaces the fidelity report and derived capture-vs-reference PNG paths, requires an explicit quoted affirmative reply exactly like `/relay-design-map`'s Phase E, and on a decision performs exactly one `Edit` on the halt.json plus one appended audit `jsonl` line. Both halves are gated on state (`phase_scope: visual`, `visual_first_approval: human`, an actual `AWAITING_VISUAL_APPROVAL` halt.json) that never exists for a non-visual-first project — so `/relay-execute`'s behavior for every such project stays byte-identical to today.

## Metadata

| Field | Value |
|---|---|
| Type | Feature — orchestrator halt/resume wiring (additive extension of an existing state-machine rule) + a brand-new deterministic infra command |
| Complexity | High — the resume design must interleave correctly with `/relay-execute`'s existing budget/retry/oscillation machinery and D8 mutation ownership without duplicating or contradicting either |
| Systems Affected | `plugins/relay/commands/relay-execute.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-visual-approve.md` (new), `documentation/changelog.html` |
| Dependencies | Phase 5 (Implement-time gate) — complete; ships the `AWAITING_VISUAL_APPROVAL`/`VISUAL_GATE_BLOCKED` halt.json shape and verbatim HALT messages this phase reads and extends |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` Implementation Phases row 6 |
| phase_type | scaffold |

**On `phase_type: scaffold` (not `feature`, not `foundation`):** this phase's entire deliverable is prompt/command markdown — surgical edits to `relay-execute.md`, a one-line surgical edit to `relay-implement.md`, and one brand-new `relay-visual-approve.md` — with **zero** `.mjs`/application-code surface, matching Phases 1-4 of this SAME track precisely (which all chose `scaffold` for the identical reason: "no test-framework invocation is the natural validation mechanism"). This is the direct opposite of Phase 5's own reasoning for choosing `feature`: Phase 5 touched `capture.mjs`, a real executable file with new testable functions, which is what drove its `node`-first VALIDATE shaping under `R-COH-VALIDATE-FRAMEWORK-MISMATCH`. Phase 6 introduces no new seam a later phase depends on as a compiled/buildable artifact either (ruling out `foundation` — there is no compile/build step for markdown), and its `## Files to Change` table is not documentation-only in the `docs/`/`documentation/` knowledge-base sense (command prompt files ARE this repo's application source per `CLAUDE.md`'s own "Stack" section: "the plugin is prompt + config, not code" — ruling out `docs`). `scaffold` is the correct, precedented classification.

This target project's own `docs/context/methodology.md` does not declare `figma_track: true`, so per `docs/context/plan-template.md`'s dual-branch rule this table carries no `design_source` row and the plan body carries no `## Design Source` section. This plan's own source PRD (`figma-visual-first-track.prd.md`) does not declare `visual_first: true` either — row 6's own `Phase` cell ("Orchestrator wiring") carries no `[VISUAL]`/`[LOGIC]` tag — so this table also carries no `phase_scope` row, consistent with every prior phase of this track's own self-application notes.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/commands/relay-execute.md` | 101-126 | `P3` precondition — the exact "zero actionable rows → exit" branch this phase intercepts with the new resumable-visual-approval check |
| P0 | `plugins/relay/commands/relay-execute.md` | 197-231 | `Phase A.1` — the same actionable-row rule re-applied per loop iteration; the exact insertion point for the SAME resumable check plus `resume_mode`/`current_phase_N` seeding |
| P0 | `plugins/relay/commands/relay-execute.md` | 233-259 | `Phase A.2` (wall-clock budget check) and the boundary immediately before `Phase A.3` — the exact insertion point for the new `Phase A.2.5` resume short-circuit |
| P0 | `plugins/relay/commands/relay-execute.md` | 548-589 | `Step A.4.1` — the "adopt /relay-implement role" success/HALT branches this phase gives a dedicated `AWAITING_VISUAL_APPROVAL` branch, checked before the existing generic "on any HALT" bucket |
| P0 | `plugins/relay/commands/relay-implement.md` | 398-427 | Phase A.3.4's Terminal-routing paragraph — the exact `halt.json` shape (`outcome`, `phase_scope`, `final_visual_verdict`, `fidelity_report_path`, `attempt_history`, `actionable_recommendation`) and verbatim HALT messages for `AWAITING_VISUAL_APPROVAL`/`VISUAL_GATE_BLOCKED` this phase reads, edits, and mirrors |
| P0 | `plugins/relay/commands/relay-implement.md` | 54-99, 269-282, 327-345 | `## Parse arguments` (54-99) values Phase A.3.5-and-later depend on; Phase A.2's implementer dispatch block (269-282, the exact `prior_feedback` condition Task 4 narrows); the arbitration mode's `DISPUTE_REJECTED` branch (327-345, the `[{rubric_id, reason}]` shape Task 3's rejected-branch reuses for its own `last_reviewer_feedback` seed) |
| P0 | `plugins/relay/commands/relay-design-map.md` | 336-374 | Phase E — the exact confirm-then-single-`Edit` pattern (explicit quoted affirmative reply required; ambiguous/non-answer = do not flip) `/relay-visual-approve`'s own confirmation step mirrors |
| P1 | `plugins/relay/scripts/visual/compare.mjs` | 21-23, 104-111 | `frameFilename()` (captured-PNG naming convention) and the FULL-rung `fidelity-report.json` per-frame schema (`node_id, route, diff_percent, threshold, status, masked_regions` — no PNG path field) `/relay-visual-approve` must derive capture/ref paths around |
| P1 | `plugins/relay/agents/visual-verifier.md` | 121-142 | The degraded-rung `fidelity-report.json` stub schema (`token_conformant`, no `masked_regions`, no captured PNG at all) — `/relay-visual-approve`'s evidence surfacing must handle this distinctly from the FULL rung |
| P1 | `plugins/relay/commands/relay-approve.md` | 86-100 | `P3` — the closest existing "already resolved, do nothing" idempotency-guard precedent `/relay-visual-approve`'s own "nothing to approve" detection mirrors |
| P1 | `PRPs/prds/figma-visual-first-track.prd.md` | 128-134, 185-188, 206-208 | Architecture Notes' human-gate-mechanism paragraph, Phase 6's own Goal/Scope/Success-signal block, and the Decisions Log "Human-gate mechanism" + "Human-gate resume mechanism" rows — the source of the HALT-and-resume mandate and the confirm-then-single-Edit-then-audit-jsonl-then-rejection-routes-feedback shape |
| P2 | `PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md` | 265-308 | Phase 5's own "NOT Building" section — the exact boundary this phase must honor (Phase 5 defined the halt outcome name + shape only; this phase owns everything downstream of it) |
| P2 | `docs/context/settings-allowlist.md` | 101-122 | Confirms no `date`/`mkdir` Bash pattern exists and that Read/Glob/Edit/Write need no allowlist entry — grounds this phase's choice to use prose `<ISO timestamp>` placeholders rather than a `Bash date` call, and to avoid any Bash dependency in the new command entirely |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-design-map.md:348-374
2. Ask the user for an explicit, quoted confirmation — a literal
   affirmative reply is required (e.g. the user typing "yes",
   "confirm", or an equivalent unambiguous affirmative in their own
   words). A non-answer, an ambiguous reply, or any reply that is not
   affirmative MUST be treated as "do not flip" — never proceed on
   inferred consent, silence, or a generic "continue".
3. On explicit confirmation: perform a single Edit on
   <target_root>/docs/context/methodology.md:
   - old_string: figma_track: false
   - new_string: figma_track: true
   - replace_all: false
```
Copied into Task 7 as the exact confirmation-discipline wording and single-`Edit` shape `/relay-visual-approve`'s own approval step mirrors (target file and fields differ: the target is the phase's own `halt.json`, adding `resolution`/`resolved_at`/`resolver_confirmation` fields rather than flipping a methodology key).

```
# SOURCE: plugins/relay/commands/relay-implement.md:400-411
- When phase_scope_value == "visual" AND visual_approval_mode ==
  "human": regardless of which point above was reached (including a
  genuine VISUAL_VERIFIED result), do NOT proceed to Phase
  A.3.5. Write <artifact_root>../halt.json with {outcome:
  "AWAITING_VISUAL_APPROVAL", phase_scope: "visual",
  final_visual_verdict: "<VISUAL_VERIFIED|VISUAL_DEGRADED|
  VISUAL_MISMATCH>", fidelity_report_path, attempt_history,
  actionable_recommendation: "..."}.
```
Copied into Tasks 1, 2, and 3 as the exact `halt.json` field names (`outcome`, `phase_scope`, `final_visual_verdict`, `fidelity_report_path`, `attempt_history`, `actionable_recommendation`) the new resumable-visual-approval check reads, and into Task 7 as the exact fields `/relay-visual-approve` reads before adding its own `resolution` field.

```
# SOURCE: plugins/relay/commands/relay-execute.md:114-118
A row is actionable when:
- Its Status cell equals pending (case-sensitive), AND
- Its Depends cell is - (empty) OR every comma-separated phase number listed has Status == complete.
```
Copied verbatim (unchanged) into Tasks 1 and 2 as the EXISTING rule that stays completely intact — the new resumable-visual-approval check is additive and runs strictly BEFORE this rule's own "zero actionable → exit" consequence, never replacing or editing the rule's own two bullets.

```
# SOURCE: plugins/relay/commands/relay-execute.md:548-563
Read ${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md and execute its full protocol inline against current_plan_path. The command's own D8 post-approval mutations run as part of its internal Phase A.4:
- Mutation a: plan trailing-block flip *Status: APPROVED* -> *Status: IMPLEMENTED*
- Mutation b: plan move to PRPs/plans/completed/<basename>.plan.md
- Mutation c: source PRD row flip in-progress -> complete
```
Copied into Task 3 as the exact "inline adoption" idiom (D7 dispatch model — the orchestrator re-executes the referenced command's own protocol steps itself, rather than sub-invoking it as an opaque black box) that makes a mid-protocol resume entry point (starting the adopted `relay-implement.md` protocol at its own Phase A.3.5 rather than its Phase A.0) a legitimate variation confined almost entirely to `relay-execute.md`'s own prose — Task 4's single-line `relay-implement.md` edit is the one narrow, separately-justified exception (see Notes).

```
# SOURCE: plugins/relay/commands/relay-approve.md:86-100
If state == "MERGED":
- Check whether .worktrees/<feature>/ still exists on disk.
- Check whether branch feature/<feature> still exists locally...
- If the worktree is absent AND the local branch is absent, emit the structured "already approved" message and exit 0 (no destructive action taken)
```
Copied into Task 7 as the idempotency-guard shape `/relay-visual-approve`'s own "nothing to approve" detection mirrors: check disk state (here, `Glob` for an unresolved `AWAITING_VISUAL_APPROVAL` halt.json) before concluding there is work to do, and exit 0 with zero mutation when there genuinely is none.

```
# SOURCE: plugins/relay/scripts/visual/compare.mjs:21-23
function frameFilename(nodeId) {
  return `${nodeId.replace(/[:/\\]/g, '-')}.png`;
}
```
Copied into Task 7 as the exact captured-PNG filename convention `/relay-visual-approve` reuses to locate a FULL-rung frame's captured screenshot on disk (sibling to `fidelity_report_path`, under `visual/<attempt>/captured/`) — never re-derived differently or guessed.

```
# SOURCE: plugins/relay/commands/relay-implement.md:279
prior_feedback: <last_reviewer_feedback when attempt > 1; null otherwise>,
```
Copied into Task 4 as the exact line being narrowed (the ACTION replaces `attempt > 1` with `non-empty`), and referenced by Task 3's rejected branch as the mechanism its seeded `last_reviewer_feedback` value must reach for AC-A2 to hold.

```
# SOURCE: plugins/relay/commands/relay-implement.md:343
Carry last_reviewer_feedback = [{rubric_id: "arbitration", reason: "dispute rejected: <reason>; produce code addressing the disputed tests"}]. Increment attempt.
```
Copied into Task 3's rejected branch as the existing `[{rubric_id, reason}]` shape its own `last_reviewer_feedback` seed (`rubric_id: "human_visual_rejection"`) reuses rather than inventing a new one.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/commands/relay-execute.md` | UPDATE | Adds the resumable-visual-approval check to `P3` and `Phase A.1`, a new `Phase A.2.5` resume short-circuit, a dedicated `AWAITING_VISUAL_APPROVAL` branch in `Step A.4.1` (checked before the generic "any HALT" bucket, which itself gains `VISUAL_GATE_BLOCKED` in its enumeration), and documents the new outcome + resume semantics in the frontmatter description, `Final output surface`, `Constraints`, and `What you do NOT do` |
| `plugins/relay/commands/relay-visual-approve.md` | CREATE | New deterministic infra command: locates the unresolved `AWAITING_VISUAL_APPROVAL` halt for a feature, surfaces the fidelity report + derived capture/ref PNG paths, requires explicit confirmation, records the decision via a single `Edit` on `halt.json` + an appended audit `jsonl` line, and on rejection captures feedback for the resume path to route |
| `plugins/relay/commands/relay-implement.md` | UPDATE | One-line, backward-compatible narrowing of the Phase A.2 implementer dispatch's `prior_feedback` condition (`attempt > 1` → `last_reviewer_feedback` non-empty) plus one explanatory sentence — the only way `/relay-execute`'s rejected-visual-approval resume path can actually deliver the human's feedback to the implementer's first attempt (see Notes for the deliberate, justified scope-widening this represents) |
| `documentation/changelog.html` | UPDATE | `Unreleased` → `Added` entry for this phase, mirroring every prior phase of this track |

## NOT Building (Scope Limits)

- Any BROAD change to `plugins/relay/commands/relay-implement.md` — the source PRD's Phase 6 Scope line names only `relay-execute.md` halt/resume semantics and the new `/relay-visual-approve` command. **Deliberate, narrow exception (Task 4):** this plan makes exactly one additional, backward-compatible edit there — the Phase A.2 dispatch's `prior_feedback` condition — because without it AC-A2's "rejection feedback is routed into the next implementer attempt" promise is structurally unreachable (the plan's own first-draft design was reviewed and found to seed a variable the dispatch gate then discarded; see Notes for the full analysis and the two rejected alternatives). Every other line of `relay-implement.md` — its own Preconditions, Phase A.0–A.4 mechanics, and Final output surface — is untouched.
- Standalone, direct `/relay-implement <plan-path>` resume after an `AWAITING_VISUAL_APPROVAL` halt (bypassing `/relay-execute` entirely) — the source PRD's own User Flow names "re-runs `/relay-execute`" as the resume action, not a direct `/relay-implement` re-invocation; a bare `/relay-implement` re-run today would simply restart its own Phase A loop from scratch (wasteful but not incorrect) and is a documented, known gap for a future phase, not this one.
- Resume semantics for `VISUAL_GATE_BLOCKED` (the `auto`-mode budget-exhaustion code) — its own existing HALT message already names the correct recovery ("fix and re-run `/relay-implement`, or switch to `human` mode"), which needs no orchestrator-level resume machinery; this phase only adds it to `Step A.4.1`'s existing generic-bucket enumeration for documentation accuracy, per the source PRD's own Phase 6 scope naming "the `human`-mode pending-approval case" specifically.
- Any new PRD-table Status-cell literal (e.g. a fourth `awaiting-visual-approval` value alongside `pending`/`in-progress`/`complete`) — the source PRD's Architecture Notes call for reuse of "the existing actionable-row rule," and D6 names the three-value vocabulary as load-bearing for every other consumer (`plan-writer.md` Step 1.3, `relay-implement.md` P3). This phase's resumability signal comes entirely from `halt.json`'s own `resolution` field, layered additively on top of the unchanged three-value `Status` vocabulary.
- A `--phase <N>` disambiguation flag for `/relay-visual-approve` — Could-item per the base orchestrator PRD's own MoSCoW precedent; this track's serial execution model (D6) means at most one phase is ever `in-progress` awaiting visual approval at a time, so the MVP command auto-locates the single unresolved case and HALTs defensively (never guesses) if it ever finds more than one.
- Any writer/reviewer pair for `/relay-visual-approve` — it is deterministic infra (Read/Glob/Edit/Write only), mirroring `relay-worktree.md`/`relay-commit.md`/`relay-pr.md`, not `relay-approve.md`'s docs-pair-dispatching shape; there is no rubric to run and no LLM judgment surface beyond interpreting the human's own reply.
- Registering `/relay-visual-approve` in `docs/api-reference.md` or `documentation/reference/commands.html` — this project's `docs_sync: true` routes broader knowledge-base registration through the automated `docs-updater`/`docs-reviewer` pair at implement time (Phase A.3.5); this plan, like every prior phase of this track, hand-authors only the `documentation/changelog.html` entry (Task 7).
- Fixing the pre-existing "four propagated" HALT-code miscount already present in `relay-execute.md`'s own frontmatter `description:` field (predates this phase; the enumerated list does not match its own stated count and omits `DISPUTE_UPHELD_TEST_WRONG`/`DISPUTE_UPHELD_PRD_AMBIGUOUS`) — flagged in this plan's Notes as an observed-but-deliberately-untouched item to avoid an unrelated, error-prone recount inside a phase already carrying real count risk of its own.

## Step-by-Step Tasks

### Task 1: UPDATE relay-execute.md — P3 precondition gains the resumable visual-approval check

**ACTION**: In `plugins/relay/commands/relay-execute.md`'s `### P3 — Implementation Phases table parseable` section, insert a new paragraph immediately after the existing "A row is **actionable** when: ... `Status == complete`." bullet list and BEFORE the existing "If zero rows are actionable, apply AC-6 (idempotent re-entry):" sentence. Insert exactly:

```
**Resumable visual-approval check (new, additive — runs BEFORE the zero-actionable-rows exit below; never changes the actionable-row rule above).** For every row whose `Status` cell equals `in-progress`, check whether `PRPs/reports/<feature>/phase-<row's #>/halt.json` exists and, if so, `Read` it. When a row's halt.json has `outcome == "AWAITING_VISUAL_APPROVAL"`:
- If the halt.json carries NO `resolution` field yet (the human has not yet run `/relay-visual-approve`): do NOT apply the zero-actionable-rows exit below, even when no row is independently `pending`. Instead emit:

  > Phase `<row #>` (`<Phase name>`) is awaiting human visual approval. Run
  > `/relay-visual-approve <feature>` to review the captured evidence and
  > approve or reject, then re-run `/relay-execute <prd_path>` to resume.
  > No phase work has been performed this invocation.

  Exit 0. Write no artifacts. This is a structured no-op distinct from AC-6's "all phases complete" message — the PRD is not fully done, it is paused on a human decision.
- If the halt.json carries a `resolution` field (`"approved"` or `"rejected"`, written by `/relay-visual-approve`): this row IS actionable. Do NOT apply the zero-actionable-rows exit below even when no row is independently `pending`. Proceed to Phase A.0 (Phase A.1's own mirror of this check, Task 2, picks up the row and seeds `resume_mode`).

This check is scoped exclusively to `outcome == "AWAITING_VISUAL_APPROVAL"` — a row `in-progress` for any other reason (a `VISUAL_GATE_BLOCKED` halt, or a genuinely fresh in-flight concurrent run with no halt.json at all) falls through unchanged to the zero-actionable-rows check below.

If zero rows are actionable AND no resumable visual-approval row was found above, apply AC-6 (idempotent re-entry):
```

The existing "If zero rows are actionable, apply AC-6 (idempotent re-entry):" line is REPLACED by the final sentence above ("If zero rows are actionable AND no resumable visual-approval row was found above, apply AC-6 (idempotent re-entry):") — same consequence (the `> All phases complete; nothing to orchestrate.` blockquote and `Exit 0. Write no artifacts.` immediately below it stay completely untouched, word-for-word).

**MIRROR**: Pattern 3 (`plugins/relay/commands/relay-execute.md:114-118`) — the actionable-row rule's own two bullets, quoted verbatim and left completely unmodified.

**ADDRESSES**: AC-A3

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const p3Idx = src.indexOf('P3 — Implementation Phases table parseable');
const checkIdx = src.indexOf('Resumable visual-approval check (new, additive — runs BEFORE');
const oldExitIdx = src.indexOf('If zero rows are actionable AND no resumable visual-approval row was found above, apply AC-6');
if (!(p3Idx > -1 && checkIdx > p3Idx && oldExitIdx > checkIdx)) {
  console.error('FAIL: P3 must gain the resumable visual-approval check, positioned between the P3 heading and the amended zero-actionable-rows exit sentence');
  process.exit(1);
}
if (!src.includes('AWAITING_VISUAL_APPROVAL') || !src.includes('resolution')) {
  console.error('FAIL: P3 check must reference AWAITING_VISUAL_APPROVAL and a resolution field');
  process.exit(1);
}
const ruleIdx = src.indexOf('every comma-separated phase number listed has');
if (ruleIdx < 0 || ruleIdx > checkIdx) {
  console.error('FAIL: the existing actionable-row rule bullets must still precede the new check, unmodified');
  process.exit(1);
}
console.log('PASS: P3 gains the resumable visual-approval check without disturbing the existing actionable-row rule');
"
```

### Task 2: UPDATE relay-execute.md — Phase A.1 gains the same resumable check + seeds resume_mode

**ACTION**: In `plugins/relay/commands/relay-execute.md`'s `### Phase A.1 — Pick next actionable phase` section, insert a new paragraph immediately after the existing "A row is **actionable** when: ... `Status == complete`." bullet list and BEFORE the existing "Pick the lowest-numbered actionable row. Record `current_phase_N` and `current_phase_slug`." sentence. Insert exactly:

```
**Resumable visual-approval check (new, additive — mirrors the P3 precondition's own check verbatim; re-run here because Phase A.1 re-reads the table fresh on every loop iteration, per its own existing "do not reuse a stale snapshot" instruction above).** Before picking the lowest-numbered actionable row below, scan for any row whose `Status` cell equals `in-progress` and whose `PRPs/reports/<feature>/phase-<row's #>/halt.json` has `outcome == "AWAITING_VISUAL_APPROVAL"`:
- No `resolution` field yet: apply the SAME structured no-op the P3 precondition performs (emit the "awaiting human visual approval" message, exit 0, no artifacts) rather than falling through to the "no actionable row" branch below.
- A `resolution` field is present (`"approved"` or `"rejected"`): set `current_phase_N` to that row's `#` and `current_phase_slug` to that row's kebab-cased `Phase` cell (mirroring `plan-writer.md`'s own slug derivation), set `resume_mode` to the `resolution` value, and skip the normal actionable-row pick below entirely — proceed directly to Phase A.2 (Phase A.2.5, Task 3, branches on `resume_mode`).

There is at most one such row under this orchestrator's serial execution model (D6). If none is found, proceed to the normal actionable-row pick below with `resume_mode = null`.
```

Then, in the existing sentence "Pick the lowest-numbered actionable row. Record `current_phase_N` and `current_phase_slug`.", append: " Set `resume_mode = null` (a fresh, non-resumed phase pick)." — so the full sentence reads: "Pick the lowest-numbered actionable row. Record `current_phase_N` and `current_phase_slug`. Set `resume_mode = null` (a fresh, non-resumed phase pick)."

**MIRROR**: Pattern 3 (`plugins/relay/commands/relay-execute.md:114-118`), applied identically to Task 1's own P3 edit.

**ADDRESSES**: AC-A1, AC-A2, AC-A3

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const a1Idx = src.indexOf('Phase A.1 — Pick next actionable phase');
const checkIdx = src.indexOf('mirrors the P3 precondition');
const pickIdx = src.indexOf('Set \`resume_mode = null\` (a fresh, non-resumed phase pick).');
if (!(a1Idx > -1 && checkIdx > a1Idx && pickIdx > checkIdx)) {
  console.error('FAIL: Phase A.1 must gain the resumable visual-approval check before the actionable-row pick, and the pick sentence must set resume_mode = null');
  process.exit(1);
}
if (!src.includes('set \`resume_mode\` to the \`resolution\` value')) {
  console.error('FAIL: Phase A.1 check must seed resume_mode from the halt.json resolution field on the resumed path');
  process.exit(1);
}
console.log('PASS: Phase A.1 gains the resumable visual-approval check and seeds resume_mode on both paths');
"
```

### Task 3: UPDATE relay-execute.md — new Phase A.2.5 resume short-circuit

**ACTION**: Immediately after `### Phase A.2 — Wall-clock budget check`'s existing closing HALT-message blockquote (the `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED` block) and BEFORE `### Phase A.3 — Per-phase plan sub-flow (plan-review retry loop)`, insert a new section:

````
### Phase A.2.5 — Resume-from-visual-approval short-circuit

Runs only when `resume_mode` is non-null (set by Phase A.1's resumable visual-approval check, Task 2). When `resume_mode` is `null` — the case for every project that does not declare `visual_first: true`, and for every ordinary pending-row pick — this phase is a complete no-op: proceed directly to Phase A.3 exactly as today.

`current_plan_path` is derived directly from disk rather than re-running Phase A.3's plan sub-flow: `Glob` `PRPs/plans/<feature>-phase-<current_phase_N>-*.plan.md`. Exactly one match is expected — the plan already reached `*Status: APPROVED*` in the original session that hit the `AWAITING_VISUAL_APPROVAL` halt, so Phase A.3/A.3.3 already ran for this phase before the halt occurred. If zero or more than one match is found, treat as a structural halt:

> FAILED_RESUME_PLAN_AMBIGUOUS: Resuming phase `<current_phase_N>` after a
> visual-approval decision, but `PRPs/plans/<feature>-phase-<current_phase_N>-*.plan.md`
> matched `<count>` file(s) (expected exactly 1). Inspect `PRPs/plans/` by
> hand, remove or rename any stray duplicate, and re-run
> `/relay-execute <prd_path>`.

`Read` the original `PRPs/reports/<feature>/phase-<current_phase_N>/halt.json` in full — it carries `final_visual_verdict`, `fidelity_report_path`, `attempt_history`, and (on rejection) `rejection_feedback`.

**Re-establish `relay-implement.md`'s own `## Parse arguments` values (common to both branches below — enumerated by walking `relay-implement.md`'s own Parse arguments section end to end, since Phase A.3.5-and-later, and, on the rejected branch, Phase A.2-and-later, all depend on them):**
- `plan_path = current_plan_path` (derived above).
- `target_root` — this `/relay-execute` invocation's own `target_root`, already established.
- `is_prd_less = false` — `/relay-execute` has no PRD-less mode; every phase it drives is PRD mode.
- `feature` — this invocation's own `<feature>`, already established. `prd_path = PRPs/prds/<feature>.prd.md`.
- `N = current_phase_N`; `slug = current_phase_slug` — both already established by Phase A.1 (Task 2).
- `artifact_root = PRPs/reports/<feature>/phase-<N>/attempts/` — `relay-implement.md`'s own canonical-pattern formula.
- `completed_target = PRPs/plans/completed/<basename of plan_path>.plan.md`.
- `no_docs_flag = false`, `no_visual_flag = false` — neither flag has a forwarding mechanism from `/relay-execute`'s own `$ARGUMENTS` into an adopted `/relay-implement` protocol, resumed or not; both are always `false` in every `/relay-execute`-driven adoption.

**Branch on `resume_mode`:**

- **`resume_mode == "approved"`** — Append to `orchestrator_run_log`:
  ```json
  {"phase": <current_phase_N>, "stage": "visual_approval", "outcome": "resumed_approved"}
  ```
  Adopt `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md`'s protocol inline starting at its own `Phase A.3.5 — Docs-sync dispatch` — its Phase A.0 initialisation, Phase A.1 pre-flight checks, and Phase A.2/A.3/A.3.4 dispatch are all SKIPPED entirely for this resume, because the implementer, code-reviewer, and visual-verifier already ran to completion in the session that produced the original halt, and the worktree still holds their exact uncommitted output (Phase A.3.4 performs no commit of its own, per the Pillar 2 "never commit" invariant). Beyond the common values above, seed every remaining value `Phase A.3.5` and everything after it reference: `attempt` = the last entry of the re-read halt.json's `attempt_history`; `docs_sync_enabled` = freshly read from `docs/context/methodology.md` (Phase A.0's own default-`true`-when-absent instruction — the original session's own read predates this invocation, so re-reading is required, not optional); `figma_track_declared` = freshly read from the same file (Phase A.0's own default-`false`-when-absent instruction) — needed only so the eventual Final output surface's `Visual:` line gates correctly; `line_index` = the index of the last line already appended to `PRPs/plans/<basename of plan_path>.code-review.jsonl` (written by the original session's own code-reviewer dispatch — nothing appends to it again on this resumed tail); `docs_deferred_questions = []` (fresh, populated as this adopted Phase A.3.5 run proceeds, exactly like a non-resumed run). Record `visual_outcome = "APPROVED (human-approved after <final_visual_verdict>)"` — deliberately distinct from a plain `"APPROVED"` so the eventual summary never silently implies an unreviewed clean machine pass when the underlying verdict was actually `VISUAL_DEGRADED` or `VISUAL_MISMATCH` and a human overrode it. Continue through the adopted protocol's own Phase A.3.5 (docs-sync) and Phase A.4 (D8 mutations) exactly as `relay-implement.md` already specifies. On success, proceed to Phase A.4.5 exactly as Step A.4.1 already does today. On any HALT surfaced during this adopted tail (e.g. `PARTIAL_D8_FAILURE`), route it through Step A.4.1's existing HALT handling (Task 5) unchanged.

- **`resume_mode == "rejected"`** — Append to `orchestrator_run_log`:
  ```json
  {"phase": <current_phase_N>, "stage": "visual_approval", "outcome": "resumed_rejected"}
  ```
  Beyond the common values above, additionally derive `base_branch`/`base_commit` per `relay-implement.md`'s own `P5 — Base-commit derivable` priority chain (`git symbolic-ref refs/remotes/origin/HEAD` → `git remote show origin` → `main` fallback; then `git merge-base HEAD <base_branch>`) — needed by the re-entered Phase A.2's implementer dispatch, and never computed by the skipped Preconditions section otherwise. (`P1`–`P4` are not separately re-run: `P1`/`P2`/`P3` are already known-satisfied by construction — `current_plan_path` resolved above, the plan is still `*Status: APPROVED*` because D8 never ran, and the source PRD row is still `in-progress` because this whole check only fires on that state — and `P4` was already satisfied earlier in this same `/relay-execute` session's own Decision Gate.) Then adopt `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md`'s protocol inline from its OWN `Phase A.0` — a fresh attempt budget, fresh `deadline_ts`, `attempt = 1`, exactly as every other halt-then-manual-fix-then-rerun path in this codebase already resets — a full re-run, since the human's rejection means real rework may be needed. The one deviation from `Phase A.0`'s own unconditional initialisation: set `last_reviewer_feedback = [{rubric_id: "human_visual_rejection", reason: <the re-read halt.json's rejection_feedback text>}]` instead of the empty list `Phase A.0` normally sets it to — the same `[{rubric_id, reason}]` shape the existing `DISPUTE_REJECTED` arbitration branch already populates it with, reused rather than inventing a new shape. `relay-implement.md`'s own `Phase A.2` implementer dispatch reads `prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>` (Task 4 amends this condition so a non-empty `last_reviewer_feedback` is honored at `attempt == 1` too — see Task 4) — so this seeded value reaches the implementer's very first dispatch of the resumed session, satisfying AC-A2. Every other mechanic — retry budget, oscillation detection, dispute cap, Phase A.3.4's visual gate, Phase A.3.5, Phase A.4 — runs exactly as `relay-implement.md`'s own protocol already specifies from a genuinely fresh `attempt = 1`, including the possibility of hitting `AWAITING_VISUAL_APPROVAL` again if the fix round's own result is again gated by `visual_first_approval: human` — which loops back through this exact same resume mechanism on a later re-invocation.

Skip Phase A.3 (plan sub-flow) and Phase A.3.3 (worktree creation) entirely for this iteration in both branches above — the plan is already `APPROVED` and the worktree already exists from the original session. Once the adopted tail above completes, proceed to Phase A.4.5 → Phase A.5 → Phase A.6 exactly as the normal per-phase flow already does.
````

**MIRROR**: Pattern 4 (`plugins/relay/commands/relay-execute.md:548-563`) — the "inline adoption" idiom (D7 dispatch model) that makes a mid-protocol resume entry point a legitimate, self-contained variation confined to `relay-execute.md`'s own prose.

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const a2Idx = src.indexOf('Phase A.2 — Wall-clock budget check');
const a25Idx = src.indexOf('Phase A.2.5 — Resume-from-visual-approval short-circuit');
const a3Idx = src.indexOf('Phase A.3 — Per-phase plan sub-flow');
if (!(a2Idx > -1 && a25Idx > a2Idx && a3Idx > a25Idx)) {
  console.error('FAIL: Phase A.2.5 must be inserted strictly between Phase A.2 and Phase A.3');
  process.exit(1);
}
const required = ['resume_mode == \"approved\"', 'resume_mode == \"rejected\"', 'FAILED_RESUME_PLAN_AMBIGUOUS', 'resumed_approved', 'resumed_rejected', 'Skip Phase A.3 (plan sub-flow) and Phase A.3.3', 'artifact_root', 'docs_sync_enabled', 'figma_track_declared', 'line_index', 'base_branch', 'base_commit', 'human_visual_rejection', 'Task 4', 'Task 5'];
const missing = required.filter((s) => !src.includes(s));
if (missing.length > 0) {
  console.error('FAIL: Phase A.2.5 missing required tokens: ' + JSON.stringify(missing));
  process.exit(1);
}
console.log('PASS: Phase A.2.5 resume short-circuit present with both branches, the full re-established variable set, and correct forward references to Tasks 4 and 5');
"
```

### Task 4: UPDATE relay-implement.md — prior_feedback dispatch condition (resume support)

**ACTION**: In `plugins/relay/commands/relay-implement.md`'s `### Phase A.2 — Implementer dispatch + diff capture` section, replace the `Task(subagent_type="implementer", ...)` dispatch block's `prior_feedback` line:

Old:
```
prior_feedback: <last_reviewer_feedback when attempt > 1; null otherwise>,
```

New:
```
prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,
```

Then, immediately after the closing `)` of the `Task(...)` block (and before the existing "The implementer reads the plan..." paragraph), insert a new sentence: "`prior_feedback`'s condition reads `last_reviewer_feedback` non-emptiness directly rather than `attempt > 1` — a deliberately narrow generalization (Figma Visual-First Track Phase 6, `docs/decisions.md`): in every pre-Phase-6 code path `last_reviewer_feedback` is populated only together with an `attempt` increment (Phase A.3's `CHANGES_REQUESTED` branch, and the arbitration mode's `DISPUTE_REJECTED` branch), so the two conditions are equivalent for every existing invocation shape; the new condition additionally lets `/relay-execute`'s resume-from-rejected-visual-approval path (`relay-execute.md` Phase A.2.5) seed feedback for a genuine `attempt == 1` dispatch, which the old condition would have silently discarded."

**MIRROR**: Pattern 2 (`plugins/relay/commands/relay-implement.md:400-411`) — the same dispatch-payload editing discipline already used elsewhere in this file; this task applies it to the Phase A.2 dispatch block instead.

**ADDRESSES**: AC-A2

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
if (src.includes('last_reviewer_feedback when attempt > 1')) {
  console.error('FAIL: the old attempt > 1 condition must be fully replaced, not left alongside the new one');
  process.exit(1);
}
if (!src.includes('last_reviewer_feedback when non-empty')) {
  console.error('FAIL: Phase A.2 dispatch must read prior_feedback from a non-empty check, not attempt > 1');
  process.exit(1);
}
if (!src.includes('deliberately narrow generalization') || !src.includes('Figma Visual-First Track Phase 6')) {
  console.error('FAIL: the justification sentence for this change must be present immediately after the dispatch block');
  process.exit(1);
}
console.log('PASS: relay-implement.md Phase A.2 dispatch reads prior_feedback from last_reviewer_feedback non-emptiness, with the justification sentence present');
"
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const requiredUnchanged = ['plan_path: <plan_path>', 'target_root: <target_root>', 'attempt: <attempt>', 'base_commit: <base_commit>'];
const missing = requiredUnchanged.filter((s) => !src.includes(s));
if (missing.length > 0) {
  console.error('FAIL: the Phase A.2 dispatch payload lost an unrelated field it must keep unchanged: ' + JSON.stringify(missing));
  process.exit(1);
}
console.log('PASS: every other Phase A.2 dispatch field is preserved unchanged (surgical edit, not a rewrite)');
"
```

### Task 5: UPDATE relay-execute.md — Step A.4.1 gains a dedicated AWAITING_VISUAL_APPROVAL branch

**ACTION**: In `plugins/relay/commands/relay-execute.md`'s `#### Step A.4.1 — Adopt /relay-implement role` section, insert a new branch immediately after the existing "**On success path (APPROVED rubric + D8 mutations succeeded):**" block (ending "...Proceed to Phase A.4.5 (test-after sub-flow; a no-op unless this phase deferred to test-after at Step A.3.5.0).") and BEFORE the existing "**On any HALT from /relay-implement**" heading. Insert exactly:

````
**On `AWAITING_VISUAL_APPROVAL` from /relay-implement (new — checked BEFORE the generic "on any OTHER HALT" branch below; this is a deliberate pause, not a failure):**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "implement", "outcome": "HALT:AWAITING_VISUAL_APPROVAL"}
```

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "AWAITING_VISUAL_APPROVAL",
  "phase_N": <N>,
  "halting_stage": "implement",
  "underlying_halt_ref": "PRPs/reports/<feature>/phase-<N>/halt.json",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

Note the `outcome` value carries NO `FAILED_` prefix — this HALT is a deliberate pause pending a human decision, not a failure. Surface `/relay-implement`'s own halt message verbatim, then HALT the orchestrator with the additional verbatim message:

> This is not a failure — `visual_first_approval: human` requires an
> explicit human decision before this phase can complete. Run
> `/relay-visual-approve <feature>` to review the captured evidence and
> approve or reject. Once a decision is recorded, re-running
> `/relay-execute <prd_path>` IS the correct next step — it resumes this
> exact phase via the resumable visual-approval check (Phase A.1) rather
> than restarting the plan/implement loop from scratch.
````

Then, rename the existing heading "**On any HALT from /relay-implement** (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`):" to "**On any OTHER HALT from /relay-implement** (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`, `VISUAL_GATE_BLOCKED`):" — a rename-and-extend of the existing heading only (adding the word "OTHER" and appending `` `VISUAL_GATE_BLOCKED` `` to the parenthetical); every line of that branch's own body (the `orchestrator_run_log` append, the `orchestrator-halt.json` write with its `FAILED_IMPLEMENT_<code>` outcome shape, the "Manual recovery" blockquote) stays completely unmodified.

**MIRROR**: Pattern 2 (`plugins/relay/commands/relay-implement.md:400-411`) — the exact `halt.json` field vocabulary this new branch reads and re-emits at the orchestrator level.

**ADDRESSES**: AC-A1, AC-A3

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const successIdx = src.indexOf('Proceed to Phase A.4.5 (test-after sub-flow; a no-op unless this phase deferred to test-after at Step A.3.5.0).');
const newBranchIdx = src.indexOf('On \`AWAITING_VISUAL_APPROVAL\` from /relay-implement (new');
const otherIdx = src.indexOf('On any OTHER HALT from /relay-implement');
if (!(successIdx > -1 && newBranchIdx > successIdx && otherIdx > newBranchIdx)) {
  console.error('FAIL: the new AWAITING_VISUAL_APPROVAL branch must sit between the success branch and the renamed OTHER-HALT branch');
  process.exit(1);
}
if (!src.includes('PARTIAL_D8_FAILURE\`, \`VISUAL_GATE_BLOCKED')) {
  console.error('FAIL: the renamed OTHER-HALT heading must add VISUAL_GATE_BLOCKED to its parenthetical enumeration, immediately after PARTIAL_D8_FAILURE');
  process.exit(1);
}
if (!src.includes('\"outcome\": \"AWAITING_VISUAL_APPROVAL\",')) {
  console.error('FAIL: the new orchestrator-halt.json write must use outcome: AWAITING_VISUAL_APPROVAL with no prefix');
  process.exit(1);
}
if (src.includes('FAILED_IMPLEMENT_AWAITING_VISUAL_APPROVAL')) {
  console.error('FAIL: AWAITING_VISUAL_APPROVAL must never be wrapped with the FAILED_IMPLEMENT_ prefix');
  process.exit(1);
}
console.log('PASS: Step A.4.1 gains a dedicated, correctly-labeled AWAITING_VISUAL_APPROVAL branch ahead of the extended generic OTHER-HALT bucket');
"
```

### Task 6: UPDATE relay-execute.md — Final output surface, Constraints, What-you-do-NOT-do, and frontmatter description

**ACTION**: Four small, independent edits in `plugins/relay/commands/relay-execute.md`:

1. In `### HALT paths` (under `## Final output surface`), append a new sentence to the end of the existing paragraph ("...the partial `orchestrator_run_log` for post-mortem audit."): " One propagated code, `AWAITING_VISUAL_APPROVAL`, is a deliberate pause pending a human decision rather than a failure — see Phase A.1's resumable visual-approval check and Step A.4.1's dedicated branch above; its `orchestrator-halt.json` `outcome` field carries no `FAILED_` prefix, and re-running `/relay-execute` is the correct, sanctioned next step once `/relay-visual-approve` has recorded a decision."

2. In `## Constraints (hard rules)`, item 5 ("**Never re-run `/relay-implement` after a HALT.**"), append to the end of its existing sentence ("...Manual recovery is required before re-invoking."): " **Exception:** the `AWAITING_VISUAL_APPROVAL` pause is not a failure — Phase A.1's resumable visual-approval check and Phase A.2.5's resume short-circuit are the SANCTIONED mechanism for resuming that specific phase's adopted `/relay-implement` protocol after a human records a decision via `/relay-visual-approve`; every other HALT code is unaffected by this exception."

3. In `## What you do NOT do`, add a new bullet: "- **Performing the human visual-approval decision itself** — that dialogue lives entirely in the separate, explicitly human-triggered `/relay-visual-approve` command; `/relay-execute` never asks the user anything, it only detects an already-recorded decision (Phase A.1) and resumes (Phase A.2.5)."

4. In the frontmatter `description:` field, append to the very end of the existing string — the live string does NOT end at "...and two from /relay-test."; it continues two more sentences past that point and actually ends "...State machine is the source PRD Implementation Phases table (D6); re-invocation is idempotent — picks up at next pending row. TDD routing read at startup; dead code in MVP (B7/B8 unshipped)." Append immediately after that real final sentence, still inside the closing single-quote of the YAML value: " Phase 6 of figma-visual-first-track.prd.md adds AWAITING_VISUAL_APPROVAL, a new propagated non-failure pause (see Phase A.1's resumable visual-approval check + Phase A.2.5's resume short-circuit) distinct from the failure codes above." Do NOT alter, recount, or otherwise touch the pre-existing "four propagated" phrase or its enumerated list, nor the "State machine"/"TDD routing" sentences between it and the true end of the string — that phrasing predates this phase and is intentionally left untouched (see this plan's Notes).

**MIRROR**: Pattern 2 (`plugins/relay/commands/relay-implement.md:400-411`) — the same named-outcome vocabulary this task registers into the orchestrator-level documentation surfaces, mirroring how Phase 5 registered its two new outcomes into `relay-implement.md`'s own Final-output/Constraints sites.

**ADDRESSES**: AC-A1, AC-A3

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const checks = [
  [src.includes('is a deliberate pause pending a human decision rather than a failure'), 'HALT paths paragraph missing the AWAITING_VISUAL_APPROVAL clarification'],
  [src.includes('the \`AWAITING_VISUAL_APPROVAL\` pause is not a failure'), 'Constraints item 5 missing the AWAITING_VISUAL_APPROVAL exception'],
  [src.includes('Performing the human visual-approval decision itself'), 'What you do NOT do missing the new bullet'],
  [src.includes('Phase 6 of figma-visual-first-track.prd.md adds AWAITING_VISUAL_APPROVAL'), 'frontmatter description missing the Phase 6 addition'],
  [src.includes('plus four propagated from /relay-implement (FAILED_AFTER_N_RETRIES'), 'the pre-existing four-propagated phrase must remain untouched, not recounted'],
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length > 0) {
  for (const [, msg] of failed) console.error('FAIL: ' + msg);
  process.exit(1);
}
console.log('PASS: Final output surface, Constraints, What-you-do-NOT-do, and frontmatter description all updated; pre-existing count phrase left untouched');
"
```

### Task 7: CREATE plugins/relay/commands/relay-visual-approve.md

**ACTION**: Create a new file `plugins/relay/commands/relay-visual-approve.md`, a deterministic infra command (no writer/reviewer pair — mirrors `relay-worktree.md`/`relay-commit.md`/`relay-pr.md`'s shape) with the following structure:

- **Frontmatter**: `description:` summarizing the command (locate the unresolved `AWAITING_VISUAL_APPROVAL` halt for `<feature>`, surface the fidelity report + derived capture/ref PNG paths, require explicit confirmation, record the decision via a single `Edit` on `halt.json` + an appended audit `jsonl` line; on rejection capture feedback for the resume path). `argument-hint: <feature-name>`.
- **Your mission** paragraph naming this as relay's third interactivity-boundary extension (after PRD approval and the Design Spec pair), confined to this standalone command — never invoked by `/relay-execute`.
- **Decision Gate** block (canonical six-line shape per `docs/decision-gate.md`), consulting `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` in the target project. Activated criteria include: explicit human-gated decision recording; the third interactivity-boundary extension; reuse of Phase 5's `halt.json` shape.
- **Parse arguments**: `$ARGUMENTS` is the required `<feature>` name. Blank → HALT with a usage message (`/relay-visual-approve <feature-name>`).
- **Preconditions**:
  - P1 — `<feature>` non-empty (per Parse arguments).
  - P2 — Locate the unresolved halt: `Glob` `PRPs/reports/<feature>/phase-*/halt.json`. For each match, `Read` it; keep only entries with `outcome == "AWAITING_VISUAL_APPROVAL"` AND no `resolution` field. If zero remain: HALT `FAILED_NOTHING_TO_APPROVE` — "No unresolved AWAITING_VISUAL_APPROVAL halt was found for `<feature>`. Either no phase is currently paused on visual approval, or it was already resolved — re-run `/relay-execute PRPs/prds/<feature>.prd.md` to check current status." If more than one remains: HALT `FAILED_MULTIPLE_PENDING_APPROVALS` naming every matched `phase-<N>` path — "unexpected under this track's serial execution model; inspect by hand." Otherwise record the single match's `<N>` (parsed from its own `phase-<N>/` path segment) and its parsed JSON as `halt_state`.
  - P3 — Locate the plan: `Glob` `PRPs/plans/<feature>-phase-<N>-*.plan.md`. Exactly one match expected; zero or multiple → HALT `FAILED_PLAN_AMBIGUOUS` (mirrors Phase A.2.5's own `FAILED_RESUME_PLAN_AMBIGUOUS` in shape). Record `plan_path`.
  - P4 — Decision Gate sources readable (standard byte-exact HALT message pattern shared by every relay command).
- **Phase A — Surface the evidence**: `Read` `halt_state.fidelity_report_path`. For each frame entry: when `status` is `PASS`/`FAIL` (FULL rung — `masked_regions` field present), derive the captured PNG path as `<dirname of fidelity_report_path>/captured/<node_id with [:/\\] replaced by '-'>.png` (mirroring `compare.mjs`'s own `frameFilename()` — Pattern 6) and the reference PNG path by reading `plan_path`'s `## Design Source` table (or, if absent, the Design Spec it references) for that `node_id`'s own declared ref-PNG column — never re-derived independently of that authoritative source. When `status` is `DEGRADED_STATIC_ONLY`/`DEGRADED_PROVISION_FAILED` (degraded rung — `token_conformant` field present, no `masked_regions`): no captured PNG exists at all; surface this explicitly ("no capture — degraded rung, pixel comparison did not run") rather than asserting a path. Print a structured summary: feature, phase `<N>` and its `Phase` name, `final_visual_verdict`, per-frame status list with capture/ref paths (or the degraded no-capture note), and `halt_state.actionable_recommendation`.
- **Phase B — Explicit confirmation**: mirror Pattern 1 (`relay-design-map.md:348-374`) precisely — print the exact effect that will occur (which `halt.json` field flips, that a `jsonl` audit line will be appended), then ask for an explicit, quoted, affirmative reply distinguishing three outcomes: an unambiguous affirmative → approve; an unambiguous negative (with optional accompanying feedback text) → reject; anything else (silence, ambiguity, a non-answer) → treat as "do not flip", print a note that the halt remains unresolved and re-running `/relay-visual-approve <feature>` later is safe, and exit 0 with zero mutation.
- **Phase C — Record the decision**:
  - **On approval**: single `Edit` on the located `halt.json` adding `resolution: "approved"`, `resolved_at: "<ISO timestamp>"`, `resolver_confirmation: "<verbatim user reply>"` (old_string/new_string/replace_all: false, anchored on the file's own closing structure). Append one line to `PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl`: `{"timestamp": "<ISO timestamp>", "feature": "<feature>", "phase_N": <N>, "decision": "approved", "confirmation_text": "<verbatim reply>", "fidelity_report_path": "<path>"}`. Emit success + "Next: re-run `/relay-execute PRPs/prds/<feature>.prd.md` to resume — it will pick up this exact phase via Phase A.1's resumable visual-approval check."
  - **On rejection**: single `Edit` on the same `halt.json` adding `resolution: "rejected"`, `resolved_at: "<ISO timestamp>"`, `resolver_confirmation: "<verbatim user reply>"`, `rejection_feedback: "<the user's stated reason>"`. Append one line to the same `visual-approval.jsonl` with `"decision": "rejected"` and a `"rejection_feedback"` field. Emit success + "Next: re-run `/relay-execute PRPs/prds/<feature>.prd.md` — your feedback will be passed to the implementer's next attempt automatically via Phase A.2.5's resume short-circuit."
- **Final output surface**: success (approved), success (rejected), success (declined/ambiguous — no mutation), and the three named HALT paths.
- **Constraints (hard rules)**: never write under `.claude/`; never mutate any `halt.json` field other than the four `resolution`/`resolved_at`/`resolver_confirmation`/`rejection_feedback` additions; never flip on inferred consent, silence, or a generic "continue" (mirrors `relay-design-map.md` Constraint 4 verbatim in spirit); never invoked by `/relay-execute`; no Bash dependency (Read/Glob/Edit/Write only — no new `.claude/settings.json` allowlist entry required, confirmed against `docs/context/settings-allowlist.md`).
- **What you do NOT do**: resuming the pipeline itself (that is `/relay-execute`'s job, via Phase A.1 + Phase A.2.5); performing any D8 mutation; dispatching any writer/reviewer pair; querying the Figma MCP (no such tool in this command's surface).

**MIRROR**: Pattern 1 (`plugins/relay/commands/relay-design-map.md:348-374`) for the confirmation discipline; Pattern 2 (`plugins/relay/commands/relay-implement.md:400-411`) for the `halt.json` field vocabulary read and extended; Pattern 5 (`plugins/relay/commands/relay-approve.md:86-100`) for the "nothing to do, exit 0" idempotency-guard shape; Pattern 6 (`plugins/relay/scripts/visual/compare.mjs:21-23`) for the captured-PNG filename convention.

**ADDRESSES**: AC-A4, AC-A5, AC-A6

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const fs = require('fs');
if (!fs.existsSync('plugins/relay/commands/relay-visual-approve.md')) {
  console.error('FAIL: plugins/relay/commands/relay-visual-approve.md was not created');
  process.exit(1);
}
const src = fs.readFileSync('plugins/relay/commands/relay-visual-approve.md', 'utf8');
const required = [
  'FAILED_NOTHING_TO_APPROVE', 'FAILED_MULTIPLE_PENDING_APPROVALS', 'FAILED_PLAN_AMBIGUOUS',
  'AWAITING_VISUAL_APPROVAL', 'resolution', 'resolved_at', 'resolver_confirmation', 'rejection_feedback',
  'visual-approval.jsonl', 'frameFilename', 'token_conformant', 'masked_regions',
  'explicit, quoted', 'never invoked by \`/relay-execute\`',
];
const missing = required.filter((s) => !src.includes(s));
if (missing.length > 0) {
  console.error('FAIL: relay-visual-approve.md missing required tokens: ' + JSON.stringify(missing));
  process.exit(1);
}
console.log('PASS: relay-visual-approve.md created with all required preconditions, evidence-surfacing, confirmation, and recording mechanics');
"
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-visual-approve.md', 'utf8');
if (!/^---\n[\s\S]*?\ndescription:/.test(src)) {
  console.error('FAIL: relay-visual-approve.md must open with YAML frontmatter carrying a description key');
  process.exit(1);
}
console.log('PASS: relay-visual-approve.md carries valid-looking YAML frontmatter');
"
```

### Task 8: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3 id="unreleased-added">Added</h3>` `<ul>` (do NOT create a new `<h2>` release heading, do NOT bump `plugins/relay/.claude-plugin/plugin.json` — stays under `Unreleased` so `version-parity` remains green), describing: "`/relay-execute` gains a resumable visual-approval check (an additive extension of its existing actionable-row selection rule) and a dedicated `AWAITING_VISUAL_APPROVAL` HALT branch, so a `human`-mode visual gate pause resumes correctly — at the right mid-point of `/relay-implement`'s own protocol — on a later re-invocation instead of falsely reporting all phases complete. New infra command `/relay-visual-approve <feature>` locates the paused phase, surfaces the fidelity report and captured/reference screenshots, requires explicit confirmation, and records the decision (a single `Edit` + an audit `jsonl` line); rejection feedback is routed into the next implementation attempt automatically. Part of the Figma Visual-First Track, Phase 6 of `PRPs/prds/figma-visual-first-track.prd.md`." Match the exact `<code>` tagging and "Part of ..., Phase N of ..." closing-sentence style of the sibling entries already in the same list (e.g. Phase 5's own entry).

**MIRROR**: N/A — matches the established `<li>`-under-`Unreleased` shape every sibling phase of this track already used (see `documentation/changelog.html`'s current Phase 1-5 entries).

**ADDRESSES**: AC-A1 through AC-A6 (documentation of record)

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('documentation/changelog.html', 'utf8');
if (!src.includes('figma-visual-first-track.prd.md') || !src.includes('id=\"unreleased-added\"') || !src.includes('AWAITING_VISUAL_APPROVAL') || !src.includes('relay-visual-approve')) {
  console.error('FAIL: changelog Unreleased entry missing or incomplete');
  process.exit(1);
}
console.log('PASS: changelog Unreleased entry added');
"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```sh
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```sh
set -euo pipefail
node -e "
const fs = require('fs');
const re = fs.readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const va = fs.readFileSync('plugins/relay/commands/relay-visual-approve.md', 'utf8');
const ri = fs.readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const checks = [
  [re.includes('Resumable visual-approval check'), 'relay-execute.md missing the resumable visual-approval check'],
  [re.includes('Phase A.2.5'), 'relay-execute.md missing the new Phase A.2.5 resume short-circuit'],
  [re.includes('resume_mode == \"approved\"') && re.includes('resume_mode == \"rejected\"'), 'relay-execute.md missing both resume_mode branches'],
  [re.includes('On \`AWAITING_VISUAL_APPROVAL\` from /relay-implement'), 'relay-execute.md missing the dedicated Step A.4.1 branch'],
  [!re.includes('FAILED_IMPLEMENT_AWAITING_VISUAL_APPROVAL'), 'relay-execute.md must never wrap AWAITING_VISUAL_APPROVAL with the FAILED_IMPLEMENT_ prefix'],
  [re.includes('every comma-separated phase number listed has'), 'relay-execute.md must preserve the existing actionable-row rule (inertness guarantee)'],
  [va.includes('FAILED_NOTHING_TO_APPROVE'), 'relay-visual-approve.md missing the nothing-to-approve HALT'],
  [va.includes('resolution') && va.includes('visual-approval.jsonl'), 'relay-visual-approve.md missing the halt.json Edit + jsonl audit mechanics'],
  [ri.includes('last_reviewer_feedback when non-empty'), 'relay-implement.md missing the narrowed prior_feedback condition'],
  [!ri.includes('last_reviewer_feedback when attempt > 1'), 'relay-implement.md must not retain the old attempt > 1 condition'],
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length > 0) {
  for (const [, msg] of failed) console.error('FAIL: ' + msg);
  process.exit(1);
}
console.log('PASS: all content invariants across all three edited/created command files hold');
"
```

**Level 3 — INTEGRATION (dry run, no live orchestration)**
```sh
set -euo pipefail
node -e "
const re = require('fs').readFileSync('plugins/relay/commands/relay-execute.md', 'utf8');
const p3Idx = re.indexOf('P3 — Implementation Phases table parseable');
const p3CheckIdx = re.indexOf('Resumable visual-approval check (new, additive — runs BEFORE');
const a1Idx = re.indexOf('Phase A.1 — Pick next actionable phase');
const a1CheckIdx = re.indexOf('mirrors the P3 precondition');
const a25Idx = re.indexOf('Phase A.2.5 — Resume-from-visual-approval short-circuit');
const a4Idx = re.indexOf('Step A.4.1 — Adopt /relay-implement role');
const dedicatedIdx = re.indexOf('On \`AWAITING_VISUAL_APPROVAL\` from /relay-implement (new');
if (!(p3Idx > -1 && p3CheckIdx > p3Idx && a1Idx > p3CheckIdx && a1CheckIdx > a1Idx && a25Idx > a1CheckIdx && a4Idx > a25Idx && dedicatedIdx > a4Idx)) {
  console.error('FAIL: dry-run structural check failed — the five edit sites (P3, Phase A.1, Phase A.2.5, Step A.4.1 heading, dedicated branch) must appear in this exact document order');
  process.exit(1);
}
console.log('PASS: dry-run confirms all five relay-execute.md edit sites are present and correctly ordered');
"
node -e "
const va = require('fs').readFileSync('plugins/relay/commands/relay-visual-approve.md', 'utf8');
const p2Idx = va.indexOf('FAILED_NOTHING_TO_APPROVE');
const p3Idx = va.indexOf('FAILED_PLAN_AMBIGUOUS');
const confirmIdx = va.indexOf('explicit, quoted');
const editIdx = va.indexOf('resolved_at');
const jsonlIdx = va.indexOf('visual-approval.jsonl');
if (!(p2Idx > -1 && p3Idx > p2Idx && confirmIdx > p3Idx && editIdx > confirmIdx && jsonlIdx > editIdx)) {
  console.error('FAIL: dry-run structural check failed — relay-visual-approve.md must locate the halt, locate the plan, confirm, then record (Edit + jsonl) in that order');
  process.exit(1);
}
console.log('PASS: dry-run confirms relay-visual-approve.md follows locate -> confirm -> record ordering');
"
node -e "
const ri = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const dispatchIdx = ri.indexOf('Phase A.2 — Implementer dispatch');
const conditionIdx = ri.indexOf('last_reviewer_feedback when non-empty');
const justificationIdx = ri.indexOf('deliberately narrow generalization');
if (!(dispatchIdx > -1 && conditionIdx > dispatchIdx && justificationIdx > conditionIdx)) {
  console.error('FAIL: dry-run structural check failed — relay-implement.md must carry the narrowed condition immediately inside its Phase A.2 dispatch block, followed by the justification sentence');
  process.exit(1);
}
console.log('PASS: dry-run confirms relay-implement.md carries the narrowed prior_feedback condition with its justification, inside Phase A.2');
"
```

Every command above either exits with the natural non-zero status of a
failing `node -e`/`npm run validate` invocation, or an explicit
`process.exit(1)` inside the script — none rely on the forbidden
`<check> && echo "PASS" || echo "FAIL"` idiom, per the 2026-07-09
decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given a `phase_scope: visual` plan's `/relay-implement` invocation HALTs with `AWAITING_VISUAL_APPROVAL` under `visual_first_approval: human`, when the human runs `/relay-visual-approve <feature>` and explicitly approves, then a subsequent `/relay-execute <prd_path>` re-invocation resumes exactly that phase — via Phase A.1's resumable visual-approval check and Phase A.2.5's short-circuit — and reaches `complete` through the adopted protocol's own Phase A.3.5 (docs-sync) and Phase A.4 (D8), without re-running the implementer, code-reviewer, or visual-verifier.
- **AC-A2 (PRD AC-4):** Given the human rejects via `/relay-visual-approve`, when a subsequent `/relay-execute` re-invocation resumes that phase, then the implementer is re-dispatched (via Phase A.2.5's adopted-from-Phase-A.0 branch) with the human's rejection feedback seeded as `prior_feedback` for its first attempt.
- **AC-A3 (PRD AC-1):** Given a PRD/project with no `visual_first`/`phase_scope`/`visual_first_approval: human` involvement, when `/relay-execute` runs, then the resumable visual-approval check in P3/Phase A.1 finds no matching row, `resume_mode` stays `null` throughout, Phase A.2.5 is a complete no-op, and Step A.4.1's new dedicated branch is never reached — the run stays byte-identical to today.
- **AC-A4 (PRD AC-4):** Given `/relay-visual-approve <feature>` is invoked with no unresolved `AWAITING_VISUAL_APPROVAL` halt found for that feature, then it HALTs with `FAILED_NOTHING_TO_APPROVE` and performs zero mutation (no `Edit`, no `jsonl` append).
- **AC-A5 (PRD AC-4; Decisions Log "Human-gate resume mechanism"):** Given `/relay-visual-approve` reaches its confirmation step, when the human's reply is not an unambiguous, explicit affirmative or negative, then no `Edit` is performed and no `jsonl` entry is appended — the halt stays unresolved, mirroring `/relay-design-map` Phase E's "ambiguous reply MUST be treated as do not flip" discipline exactly.
- **AC-A6 (PRD AC-4):** Given `/relay-visual-approve` records either an approval or a rejection, when it completes, then exactly one `Edit` has been applied to the phase's `halt.json` (adding `resolution`/`resolved_at`/`resolver_confirmation`, plus `rejection_feedback` on rejection) AND exactly one line has been appended to that phase's `visual-approval.jsonl` — both artifacts agree on the decision.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The resume design's "adopt `/relay-implement`'s protocol starting mid-way" instruction (Phase A.2.5) is a genuinely novel pattern in this codebase — every other `/relay-execute` adoption starts a referenced command's protocol from its own top (Phase A.0) | Medium | Medium | Confined almost entirely to `relay-execute.md`'s own prose (D7's "inline adoption" already gives the orchestrator this latitude); every seeded value on both branches (`attempt`, `artifact_root`, `docs_sync_enabled`, `figma_track_declared`, `line_index`, `visual_outcome`, and — on the rejected branch — `base_branch`/`base_commit`) is enumerated explicitly by walking `relay-implement.md`'s own Parse arguments/Phase A.3.5 dependency chain, rather than left implicit |
| Task 4's narrowing of `relay-implement.md`'s Phase A.2 dispatch condition is a deliberate widening beyond the source PRD's literal Phase 6 Scope line | Low | Low | Proven behavior-preserving for every pre-Phase-6 code path (`last_reviewer_feedback` is populated only together with an `attempt` increment in both existing paths that set it — see Notes); a single-line condition change plus one explanatory sentence, not a rewrite; the rejected alternative (starting the resumed session at `attempt = 2`) was traced further and found to silently weaken oscillation detection via a phantom gap in `files_changed_by_attempt`, so the narrower `relay-implement.md` edit is the safer choice, not a convenience shortcut |
| A human could re-run `/relay-visual-approve` a second time against an already-resolved `halt.json` (e.g. after a slow re-run of `/relay-execute`), risking a double-Edit or double-jsonl-append | Low | Low | P2's own Glob-and-filter precondition only matches halt.json entries with `outcome == "AWAITING_VISUAL_APPROVAL"` AND no `resolution` field — an already-resolved halt.json is structurally excluded, producing `FAILED_NOTHING_TO_APPROVE` on a second run rather than a double-write |
| `fidelity-report.json` carries no capture/reference PNG path field on either rung (confirmed via direct research against `compare.mjs`/`visual-verifier.md`) — a naive implementation could invent a wrong path convention | Low | Medium | Task 7's ACTION specifies the exact derivation: `frameFilename()`'s sanitization convention for the captured PNG (FULL rung only), and the plan's own `## Design Source` table / referenced Design Spec as the sole authoritative source for the reference PNG path — never independently re-derived; the degraded rung's "no capture exists" case is surfaced explicitly rather than asserting a nonexistent path |
| Windows-specific defect classes that have hit this repo before (a `file://${process.argv[1]}` CLI-guard mismatch; `execFileAsync`/`npx` ENOENT) | None, by construction | N/A | This phase adds no new CLI entry point, no new subprocess/shell-out, and no `.mjs` file at all — every task's deliverable is markdown prose plus one HTML changelog entry |

## Notes

**Rejection-feedback delivery mechanism (Defect 4 resolution — plan-reviewer round 1):** the first draft of this plan seeded `last_reviewer_feedback` on the rejected-resume branch but left `attempt = 1`, which `relay-implement.md`'s own Phase A.2 dispatch (`prior_feedback: <last_reviewer_feedback when attempt > 1; null otherwise>`) silently discards — the human's rejection feedback would never have reached the implementer. Three options were weighed: **(a)** start the resumed session at `attempt = 2` so the existing `attempt > 1` gate passes without touching `relay-implement.md` — rejected after tracing it further: `attempt = 2` with a freshly-empty `files_changed_by_attempt = {}` (Phase A.0 always initializes this empty) leaves a phantom gap at index 1 that the oscillation check (fires at `attempt >= 3`) would read as an empty set instead of the real attempt-1 diff, silently weakening oscillation detection for exactly the sessions most likely to need it; it would also uniquely special-case attempt-numbering for only this one resume path, unlike every other halt-then-rerun path in this codebase, which always restarts at `attempt = 1`. **(b)** smuggle the feedback through a different field of the existing dispatch payload without touching `relay-implement.md` — rejected: the payload is fixed to `{plan_path, target_root, attempt, prior_feedback, base_commit}`, and the only plausible smuggling route (temporarily annotating the plan file itself) would mutate an `APPROVED` artifact, which this pipeline treats as stable. **(c) — the option chosen:** narrow `relay-implement.md`'s own Phase A.2 condition from `attempt > 1` to `last_reviewer_feedback` non-emptiness (Task 4). This is provably behavior-preserving for every pre-Phase-6 code path — `last_reviewer_feedback` is populated ONLY together with an `attempt` increment in both existing paths that set it (Phase A.3's `CHANGES_REQUESTED` branch and the arbitration mode's `DISPUTE_REJECTED` branch) — so the two conditions are logically equivalent everywhere they already matter, and the one-line change is far simpler and safer than reconstructing `files_changed_by_attempt`'s history to make option (a) fully correct. This is a deliberate, narrow widening of this plan's own scope beyond the source PRD's literal Phase 6 Scope line (`relay-execute.md` + the new command only) — justified because AC-A2's promise is otherwise structurally unreachable, not a convenience shortcut.

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` IS declared here, so the pair is ACTIVE — but this phase's deliverable is markdown-only (`phase_type: scaffold`, matching Phases 1-4 of this same track), so there is no `.mjs` production surface for the pair to cover; the Implementer authors ZERO test files (R-X strict) regardless. No task in this plan creates, edits, or references a `*.test.mjs` file.

**Research grounding:** `research-codebase` and `research-web` subagents were dispatched in parallel per protocol. `research-codebase` confirmed the exact `fidelity-report.json` schemas on both rungs (neither carries a PNG-path field — Task 7's evidence-surfacing derivation is grounded directly in `compare.mjs`'s `frameFilename()` and the plan's own Design Source table rather than inventing a convention), the exact line ranges for every `relay-execute.md` insertion point, and flagged that no prior command reads-then-Edits ANOTHER command's own `halt.json` in place — Task 7's single-Edit-on-a-sibling-artifact is a structurally new (but small, well-bounded) pattern, called out explicitly rather than silently assumed safe. `research-web` corroborated the general HALT-and-resume shape against GitHub Actions' environment-protection reviewer gate and Temporal's durable human-in-the-loop pattern, but found no source documenting a rejection's free-text feedback being automatically threaded into the next automated retry attempt — every real-world precedent treats a rejection comment as audit documentation only, never as machine input. This phase's own `rejection_feedback` → `prior_feedback` routing (Phase A.2.5) is therefore a deliberate, source-PRD-mandated design choice without a direct external precedent to lean on, not an oversight; the design stays conservative by seeding only the FIRST resumed attempt, then falling back to `/relay-implement`'s own already-proven fix-round/budget/HALT mechanics unchanged for everything after.

**Observed-but-not-fixed pre-existing drift:** `relay-execute.md`'s own frontmatter `description:` field currently reads "...plus four propagated from /relay-implement (FAILED_AFTER_N_RETRIES, FAILED_TIME_BUDGET_EXCEEDED, FAILED_OSCILLATION_DETECTED, FAILED_DISPUTE_CAP_EXCEEDED, PARTIAL_D8_FAILURE)..." — five items are enumerated against a stated count of "four," and `DISPUTE_UPHELD_TEST_WRONG`/`DISPUTE_UPHELD_PRD_AMBIGUOUS` (both already handled by Step A.4.1's existing arbitration-mode branches) are omitted entirely from that list. This predates this phase. Task 6 deliberately appends an additive, count-free sentence about the new `AWAITING_VISUAL_APPROVAL` addition rather than attempting to recount or repair the pre-existing phrase — fixing it correctly would require re-verifying an unrelated historical enumeration under this same phase's already-real count-drift risk, for a cosmetic frontmatter string with no downstream `VALIDATE`/rubric dependency identified during grounding.

**Self-application note:** this plan's own source PRD (`figma-visual-first-track.prd.md`) does not declare `visual_first: true` — it is the PRD that BUILDS the visual-first mechanism, not one that USES it; row 6's own `Phase` cell ("Orchestrator wiring") carries no `[VISUAL]`/`[LOGIC]` tag, so this table carries no `phase_scope` row. This target repo's own `docs/context/methodology.md` declares no `figma_track` key at all, so this table also carries no `design_source` row and the plan body carries no `## Design Source` section — consistent with every prior phase of this track. The new resume machinery this phase ships is inert against this repo and against this very plan, by design.

---

*Generated: 2026-07-27*
*Approved: 2026-07-27*
*Implemented: 2026-07-27*
*Status: IMPLEMENTED*
