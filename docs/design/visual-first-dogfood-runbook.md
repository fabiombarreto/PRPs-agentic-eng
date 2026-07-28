# Figma Visual-First Track — Dogfood Runbook

A checklist a human operator runs against a **real downstream project**
to exercise the Figma Visual-First Track's Phase 7 success signal end
to end: *"A real visual-first feature completes through
`/relay-approve` with the Visual Fidelity surfaces correctly
reflecting both phases' outcomes."* (per
`PRPs/prds/figma-visual-first-track.prd.md`, Implementation Phases
row 7).

---

## Why this file exists (scope note)

The literal "end-to-end dogfood on a real visual-first PRD" item
named in the source PRD's Phase 7 description cannot be executed
inside a plan/implement cycle against the `relay` plugin repo itself
— it requires a separate, already-existing downstream project with
`figma_track: true`, a real Figma file, an approved component map,
and a willingness to author a genuinely visual-first feature (a
feature with substantial UI surface and meaningful business logic
built under it), none of which exist as fixtures inside this
repository. `relay`'s own `docs/context/methodology.md` declares no
`figma_track` key at all — this repo is *building* the Figma
Visual-First Track, not *consuming* a Figma design for its own UI
(relay has no UI surface). This mirrors exactly how the sibling base
Figma Implementation Track resolved the identical infeasibility in
its own final phase (`docs/design/dogfood-runbook.md`) — this
success signal is resolved as a **documentation/checklist
deliverable** — this file — rather than a Step-by-Step Task that
pretends to execute the dogfood run.

This file does **not** prove that a real visual capture, a real
human approval round trip, or a real sentinel-resolution pass has
ever executed against this track's mechanics. What this phase's own
plan *does* prove directly, self-hosted, inside this repository's own
validation, is narrower and different in kind: a synthetic-fixture
Level 3 dry run that exercises the new dual-mode rendering logic in
`scripts/generate-final-report.mjs` against two constructed
fixtures (a base-track shape with no `phase_scope` evidence, and a
dual-mode shape with a `phase_scope: visual` plan plus a recorded
`visual-approval.jsonl` decision) — see
`figma-visual-first-track-phase-7-surface-integration-dogfood.plan.md`'s
own `## Validation Commands` Level 3 section. That dry run proves the
*rendering* is correct given real evidence files; it does not — and
cannot — prove the evidence-producing mechanics themselves
(`visual-verifier`, the `human`-mode HALT/resume round trip,
`/relay-visual-approve`) ever ran against a genuine Figma design. A
human operator runs the checklist below against a real project
separately to close that gap.

---

## Prerequisites

- A downstream target project already initialized by `context-builder`
  (`docs/context/methodology.md` exists) with `figma_track: true`
  already set (see the sibling `docs/design/dogfood-runbook.md`
  checklist step 1 if this is not yet true).
- `gh` authenticated and an `origin` remote pointing at a real GitHub
  repository (Pillar 3 needs both).
- Access to a real Figma file the operator is authorized to read via
  the Figma MCP.
- A feature idea with **substantial visual surface AND substantial
  business logic built under it** — visual-first sequencing exists
  specifically to de-risk the case where a wrong visual would force
  reworking already-built logic; a visually-trivial or logic-only
  feature is not a meaningful test of this track.

---

## Checklist

Follow in order. Each step names its own confirmation checkpoint —
do not skip to the next step until the current one's checkpoint is
observably true. Steps 3 and 4 both require a genuine
`visual_first_approval: human` round trip; do not shortcut either by
manually hand-editing `halt.json`.

1. **Author a `visual_first: true` PRD with a Figma URL, and confirm
   `prd-reviewer`'s strict `[VISUAL]`/`[LOGIC]` 1:1 pairing check
   passes.**
   Invoke `/relay-prd`, supply a real Figma design URL, and during
   Phase 6 DECISIONS opt into `visual_first: true`. Describe a feature
   whose Implementation Phases table will naturally split into at
   least one `[VISUAL]`/`[LOGIC]` phase pair.
   **Checkpoint:** the resulting `PRPs/prds/<feature>.prd.md` reaches
   `*Status: APPROVED*` with every phase tagged `[VISUAL]` or
   `[LOGIC]`, each visual phase paired 1:1 with exactly one logic
   phase via `Depends`.

2. **Run `/relay-execute` through one visual/logic pair under
   `visual_first_approval: auto`, confirming a genuine
   `VISUAL_VERIFIED` unblocks the paired logic phase automatically
   with no halt.**
   With `visual_first_approval` absent or `auto` in
   `docs/context/methodology.md`, invoke
   `/relay-execute PRPs/prds/<feature>.prd.md` and let it drive the
   first visual/logic pair. The visual phase's Implementer builds UI
   against `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinels; the
   blocking `visual-verifier` gate must reach `VISUAL_VERIFIED` before
   the paired logic phase is permitted to start.
   **Checkpoint:** the visual phase reaches `complete` with no
   `VISUAL_GATE_BLOCKED` halt in its history, and the paired logic
   phase starts automatically on the same invocation (or the next,
   idempotent re-invocation) with zero manual intervention.

3. **For a second visual/logic pair, set `visual_first_approval:
   human`, run `/relay-execute`, confirm it HALTs with
   `AWAITING_VISUAL_APPROVAL`, then run `/relay-visual-approve` and
   approve.**
   Hand-edit `docs/context/methodology.md` to
   `visual_first_approval: human`, then invoke `/relay-execute` again
   against the same PRD to drive its second visual phase. Confirm the
   invocation HALTs with `AWAITING_VISUAL_APPROVAL` even though the
   underlying visual-verification result was a genuine
   `VISUAL_VERIFIED` — the human tier always requires explicit review,
   never silently proceeding on an unreviewed pass. Run
   `/relay-visual-approve <feature>`, confirm it surfaces the fidelity
   report summary plus the captured/reference PNG paths, and reply
   with an explicit affirmative confirmation.
   **Checkpoint:** `PRPs/reports/<feature>/phase-<N>/halt.json` gains
   `resolution: "approved"`; a `visual-approval.jsonl` line is
   appended with `"decision": "approved"`; a subsequent
   `/relay-execute` re-invocation resumes via Phase A.2.5's resume
   short-circuit and completes the paused phase WITHOUT re-running the
   implementer, code-reviewer, or visual-verifier for that phase.

4. **Exercise the rejection path.**
   On a third visual phase (or by re-running step 3 against a fresh
   visual phase if only two pairs exist in the PRD), reply to
   `/relay-visual-approve` with an explicit negative confirmation plus
   concrete feedback describing what needs to change.
   **Checkpoint:** the `visual-approval.jsonl` line carries
   `"decision": "rejected"` and a `"rejection_feedback"` field; the
   next `/relay-execute` re-invocation seeds that exact feedback text
   as the implementer's first `prior_feedback` for a new fix round on
   that same visual phase (confirm by reading the re-invocation's
   attempt history, not just trusting the log line).

5. **Confirm the logic phase's sentinel ledger resolves to zero
   remaining sentinels.**
   Once a logic phase (paired with an approved visual phase) reaches
   `complete`, grep its touched files for
   `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]`.
   **Checkpoint:** zero matches remain anywhere in the feature's
   visual-phase files — the logic phase's own mandatory
   sentinel-resolution task closed every one, with no deferral.

6. **Confirm `/relay-qa-report` and the PR's `final-report.md` both
   render the new dual-mode Visual Fidelity section.**
   Run `/relay-qa-report PRPs/prds/<feature>.prd.md` (or against the
   uncommitted diff), then `/relay-commit` → `/relay-pr <feature>`.
   **Checkpoint:** both `PRPs/reports/<feature>/qa-report.md` and
   `PRPs/reports/<feature>/final-report.md` carry a "## Visual
   Fidelity" table with a Scope column populated `visual`/`logic` per
   phase, plus a recorded human-approval line for each phase that went
   through step 3 or step 4 above — exactly the dual-mode surfaces
   Tasks 1–3 of this same plan
   (`figma-visual-first-track-phase-7-surface-integration-dogfood.plan.md`)
   ship.

7. **Merge via `/relay-approve` and record the wall-clock/human-
   touchpoint timing against the source PRD's Success Metrics table.**
   Merge with `/relay-approve <pr>`. Note the total elapsed time and
   the number of distinct human touchpoints (PRD authoring dialogue,
   the `human`-mode approval reply in step 3, the rejection-feedback
   reply in step 4) from PRD authoring start to merge.
   **Checkpoint:** a dated entry exists recording this run's timing
   and human-touchpoint count against
   `PRPs/prds/figma-visual-first-track.prd.md`'s Success Metrics
   table row "Two-cycle human overhead" — feeding the "~5-10 real
   features" recalibration threshold that same PRD's Open Questions
   defer a baseline until.

---

## What "done" looks like

All seven checkpoints above observed as true — including a genuine
`auto`-mode pass (step 2), a genuine `human`-mode approval round trip
that skips re-running the implementer/code-reviewer/visual-verifier
on resume (step 3), and a genuine rejection-feedback round trip (step
4) — in a single, real, downstream-project run constitutes the Phase
7 success signal being exercised end to end for the Figma
Visual-First Track. Record the outcome (pass, partial, or blocked —
with the blocking reason) wherever this project tracks dogfood runs;
this repository has no dogfood-tracking artifact of its own to
update, since `relay` itself never declares `figma_track: true` or
`visual_first: true`. Until this checklist is run against a real
project, treat the dual-mode surfaces this same phase ships
(`scripts/generate-final-report.mjs`'s Scope column and approval
lines) as verified only at the synthetic-fixture level described
above under "Why this file exists" — correct given constructed
evidence, not yet exercised against a genuine end-to-end run.
