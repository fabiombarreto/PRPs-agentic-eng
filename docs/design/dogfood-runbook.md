# Figma Implementation Track — Dogfood Runbook

A checklist a human operator runs against a **real downstream project**
to exercise the Figma Implementation Track's Phase 7 success signal end
to end: *"One real feature runs the full pipeline end to end, including
a multi-phase PRD and at least one auth-gated route, and the map gains
at least one `verified:auto` row without human intervention."* (per
`PRPs/prds/figma-implementation-track.prd.md`, Implementation Phases
row 7).

---

## Why this file exists (scope note)

The literal "end-to-end dogfood on a real project" item named in the
source PRD's Phase 7 description cannot be executed inside a
plan/implement cycle against the `relay` plugin repo itself — it
requires a separate, already-existing downstream project with
`figma_track: true`, a real Figma file, an approved component map, and
an in-flight multi-phase PRD with an auth-gated route, none of which
exist as fixtures inside this repository. `relay`'s own
`docs/context/methodology.md` does not declare `figma_track` at all —
this repo is *building* the Figma Implementation Track, not *consuming*
a Figma design for its own UI (relay has no UI surface). Consistent
with how this feature has already handled other non-executable scope
items (e.g. Phase 2's MCP-access spike was a one-time empirical finding
recorded directly in `docs/decisions.md` rather than a repeatable
task), this success signal is resolved as a **documentation/checklist
deliverable** — this file — rather than a Step-by-Step Task that
pretends to execute the dogfood run. A human operator runs the
checklist below against a real project separately.

---

## Prerequisites

- A downstream target project already initialized by `context-builder`
  (`docs/context/methodology.md` exists).
- `gh` authenticated and an `origin` remote pointing at a real GitHub
  repository (Pillar 3 needs both).
- Access to a real Figma file the operator is authorized to read via
  the Figma MCP.
- A feature idea whose scope naturally spans **more than one
  Implementation Phase** and includes **at least one auth-gated route**
  (a route that requires an authenticated session/role to reach) — this
  is a hard requirement of the success signal, not an optional nicety.

---

## Checklist

Follow in order. Each step names its own confirmation checkpoint —
do not skip to the next step until the current one's checkpoint is
observably true.

1. **Confirm `figma_track: true` is set via `/relay-design-map`'s
   confirmation gate.**
   Run `/relay-design-map` against the target project. Complete its
   preflight and the `design-map-writer`/`design-map-reviewer` loop
   until `docs/design/component-map.md` reaches `*Status: APPROVED*`.
   On the command's explicit, quoted human-confirmation prompt, confirm
   — this is the one sanctioned non-heuristic path that flips
   `figma_track: true` in `docs/context/methodology.md`.
   **Checkpoint:** `docs/context/methodology.md` reads `figma_track:
   true`, and `docs/design/component-map.md` exists with at least one
   `CONFIRMED` or `INFERRED` row.

2. **Run `/relay-prd` with a Figma URL for a multi-phase feature
   including an auth-gated route.**
   Invoke `/relay-prd` and, during the interactive Q&A, supply a real
   Figma design URL and describe a feature whose Implementation Phases
   table will naturally split into two or more rows, with at least one
   phase implementing a route that requires authentication.
   **Checkpoint:** the resulting `PRPs/prds/<feature>.prd.md` reaches
   `*Status: APPROVED*` with an Implementation Phases table carrying
   ≥2 rows, and at least one phase's scope names an auth-gated route.

3. **Confirm the Design Spec's explicit human approval.**
   Run `/relay-design-spec <figma-url> <feature>` for the phase(s)
   that are Figma-sourced. Work through `design-spec-writer`'s
   restate-and-wait gate and any bounded Q&A round. When
   `design-spec-reviewer` (`invocation_context: main`) asks "Aprovar o
   Design Spec?", reply with your own explicit affirmative confirmation
   — this is the second place in relay (after PRD authoring) where a
   reviewer dialogues with the user before flipping status.
   **Checkpoint:** `PRPs/designs/<feature>/design-spec.md` reaches
   `*Status: APPROVED*` only after your own explicit reply (never a
   relayed "the user approved").

4. **Run `/relay-execute` end to end and observe the `Visual:` line
   per phase.**
   Invoke `/relay-execute PRPs/prds/<feature>.prd.md` and let the
   orchestrator drive every actionable phase through plan →
   plan-review → implement → test → test-review. For each
   Figma-sourced phase, `/relay-implement`'s own Final output surface
   emits a `Visual:` line (`APPROVED` / a named degraded rung /
   `BUDGET_EXCEEDED` / `BUDGET_EXCEEDED_REVERTED`) — this line's very
   presence is gated on `figma_track_declared`.
   **Checkpoint:** the orchestrator reaches "all phases complete";
   `PRPs/reports/<feature>/orchestrator-run.json` records a
   `visual_outcome` key on every Figma-sourced phase's completion
   record, and the terminal summary prints the gated "Visual fidelity:
   N phase(s) APPROVED, ..." rollup line.

5. **Confirm `/relay-qa-report` renders the Visual Fidelity section.**
   Run `/relay-qa-report PRPs/prds/<feature>.prd.md` (or against the
   uncommitted diff).
   **Checkpoint:** the written `PRPs/reports/<feature>/qa-report.md`
   carries a "## Visual Fidelity" section listing each in-scope
   frame's `node_id` / `route` / `diff_percent` / `threshold` /
   `status`, sourced from the same `phase-*/visual/*/fidelity-report.json`
   artifacts `/relay-execute` referenced in step 4.

6. **Merge via `/relay-pr` → `/relay-approve` and confirm
   `docs/design/component-map.md` gains at least one `verified:auto`
   row without a human edit.**
   Run `/relay-commit`, then `/relay-pr <feature>` (confirm the
   generated `final-report.md` also carries the "## Visual Fidelity"
   section), then merge with `/relay-approve <pr>`. The post-merge
   `docs-updater`/`docs-reviewer` pair runs automatically.
   **Checkpoint:** without any manual edit, at least one `REUSE`-mapped
   row in `docs/design/component-map.md` shows `Confidence:
   verified:auto` and a populated `verified_at` date, traceable to a
   `PASS` frame in this run's `fidelity-report.json` evidence — the
   self-improvement loop the component-map template has referenced
   since Phase 3, now with a real closing mechanism.

7. **Record the wall-clock time against the PRD's Success Metrics
   table for future recalibration.**
   Note the total elapsed time from step 2 (PRD authoring start) to
   step 6 (merge) and record it against
   `PRPs/prds/figma-implementation-track.prd.md`'s Success Metrics
   table (human time per feature, component reuse rate, visual
   fidelity at first pass, manual adjustment rounds).
   **Checkpoint:** a dated entry exists recording this run's timing and
   outcome, feeding the "~10-20 real feature runs" recalibration
   threshold the PRD's own Open Questions defer automated
   telemetry/dashboarding until.

---

## What "done" looks like

All seven checkpoints above observed as true in a single, real,
downstream-project run constitutes the Phase 7 success signal being
exercised end to end. Record the outcome (pass, partial, or blocked —
with the blocking reason) wherever this project tracks dogfood runs;
this repository has no dogfood-tracking artifact of its own to update,
since `relay` itself never declares `figma_track: true`.
