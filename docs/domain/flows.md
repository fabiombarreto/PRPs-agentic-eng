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
8. A Test Runner spins up the isolated test environment, runs the suite,
   and classifies failures. If anything fails, it loops: ask the
   Implementer to fix, re-run, repeat — up to a configurable retry limit.
9. A post-green reviewer confirms tests were not weakened to pass.
10. A Report + PR Creator agent writes an execution report and opens the
    pull request.

The autonomous portion only surfaces to the human when an agent exhausts
its recovery strategies and the decision is outside its competence.

All artifacts produced by this flow (PRD, plan, reports) live under
`PRPs/` at the repo root — see `docs/context/architecture.md`.

## 3. Approval flow (Pillar 3 — planned)

Once the PR is ready, the user triggers the approval flow.

1. User runs `/approve-implementation`.
2. The system merges the PR, deletes the feature branch, and cleans up the
   worktree.
3. A Docs Updater agent compares what was implemented against the existing
   `docs/context/` and `docs/domain/` files and updates them accordingly.
4. A Docs Reviewer checks the updated documentation and asks the human
   about any ambiguous rules encountered during the implementation.
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
