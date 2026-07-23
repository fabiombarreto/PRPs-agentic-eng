# Flows

High-level flows the `relay` plugin aims to deliver. Described in
non-technical language, drawn from `docs/planning/dev_process_improvement_plan.html`
and `docs/planning/planejamento_fase_2.docx`.

Only the Initialization flow is partially implemented today (the
`context-builder` skill). The other flows are the planned target state.

---

## 1. Initialization flow (Pillar 1 — partially implemented)

The user installs `relay` into a new or existing project and runs the
initializer.

1. User invokes the context-builder skill → skill checks whether MCP
   Context7 is available.
2. Skill scans the project's files and folder structure to understand what
   exists.
3. Skill produces a documentation tree under `docs/` (context, domain,
   optionally libs), plus a decision-gate, decisions, and anti-patterns
   file — marking uncertain items for human validation.
4. Human reviews the `[INFERRED - VALIDATE]` items and confirms or corrects
   them.
5. The project is now ready for the autonomous implementation flow.

## 2. Implementation flow (Pillar 2 — planned)

The user gives one prompt describing a feature; the pipeline takes the
feature from there to a pull request, interrupting the user only at the
PRD stage and only when an agent hits a problem it cannot resolve.

**Interactive portion (the user participates):**

1. User describes the feature in a single prompt.
2. A PRD Writer agent runs an interactive Q&A with the user (problem,
   users, vision, constraints, scope) and produces a PRD.
3. A PRD Reviewer reviews the PRD and loops with the user until the PRD
   is approved. Scope drift and ambiguity are resolved here.

**Autonomous portion (the user walks away):**

4. The system creates an isolated branch and worktree for the run.
5. A Plan Writer produces an implementation plan with unit and E2E test
   cases; a Plan Reviewer validates it.
6. **If** the project declares TDD (`tdd: true` in
   `docs/context/methodology.md`): a TDD Writer produces the initial
   test suite from the PRD's Acceptance Criteria; a TDD Reviewer approves
   or requests changes. Otherwise this step is skipped silently.
7. An Implementer agent executes the approved plan; a Code Reviewer
   checks the result against business rules.
7.4. **When the target project declares `figma_track: true` and the
   plan being implemented is Figma-sourced (`design_source: figma`):**
   immediately after the Code Reviewer returns `APPROVED` — and before
   the docs pair below — a `visual-verifier` agent orchestrates a
   headless-browser capture-and-compare loop against the plan's Design
   Source and the referenced Design Spec's reference screenshots,
   returning `VISUAL_VERIFIED`, `VISUAL_DEGRADED`, or `VISUAL_MISMATCH`.
   A `VISUAL_MISMATCH` triggers at most one bounded fix round before
   either converging or deterministically reverting to the last
   Code-Reviewer-approved state; the sub-phase never halts the run. For
   non-Figma projects this step is inert — nothing changes.
7.5. Immediately after the Code Reviewer returns `APPROVED` — and before
   the plan/PRD state advances — a docs pair (`docs-updater`/`docs-reviewer`)
   runs non-interactively to sync `docs/` with the change directly in the
   worktree; any question it would have asked a human is deferred to the
   final report instead of interrupting the run.
8. A Test Runner spins up the isolated test environment, runs the suite,
   and classifies failures. If anything fails, it loops: ask the
   Implementer to fix, re-run, repeat — up to a configurable retry limit.
9. A post-green reviewer confirms tests were not weakened to pass.
10. A Report + PR Creator agent writes an execution report and opens the
    pull request — when `figma_track: true` and at least one phase
    captured visual-verification evidence, the report and PR body also
    carry a Visual Fidelity section summarizing per-frame results
    (Figma Implementation Track Phase 7).

The autonomous portion only surfaces to the human when an agent exhausts
its recovery strategies and the decision is outside its competence.

All artifacts produced by this flow (PRD, plan, reports) live under
`PRPs/` at the repo root — see `docs/context/architecture.md`.

## 3. Approval flow (Pillar 3 — shipped; docs cycle is now a safety net)

Once the PR is ready, the user triggers the approval flow.

1. User runs `/relay-approve <pr>`.
2. The system merges the PR, deletes the feature branch, and cleans up the
   worktree.
3. A Docs Updater agent runs a low-delta safety-net reconciliation pass —
   primary docs-sync already happened at Implementation-flow step 7.5 — and
   compares what was merged against the existing `docs/context/` and
   `docs/domain/` files, updating them for any decisions made after
   implementation. For `figma_track: true` projects, this pass also
   upgrades a `REUSE`-mapped `docs/design/component-map.md` row's
   Confidence to `verified:auto` when corroborated by fresh
   `VISUAL_VERIFIED` evidence from the merged feature — the component
   map's self-improvement loop (Figma Implementation Track Phase 7).
4. A Docs Reviewer checks the updated documentation and asks the human
   about any ambiguous rules encountered since the implement-time sync.
5. The project's documentation is now in sync with its new state.

---

## Graceful-degradation variants

- **No Docker available** → Test Runner falls back to local execution; the
  report flags the risk.
- **No test suite detected** → Test Runner is skipped; the PR is marked as
  "not verified by tests".
- **TDD declared but no test framework installed** → TDD agents abort with
  an actionable message asking the human to complete the context-builder.
- **No `gh` credentials** → Report + PR Creator outputs the `gh` command
  the human should run manually instead of opening the PR directly.
- **Visual-verification tooling fails to provision (network-blocked /
  restricted environment) or the dev server never becomes ready** → the
  visual-verification sub-phase degrades to a non-blocking
  `VISUAL_DEGRADED` result (still verifies token conformance statically)
  rather than halting `/relay-implement`.
