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
   Code-Reviewer-approved state. On a `phase_scope: logic` plan (or any
   plan with no `phase_scope` row) the sub-phase never halts the run,
   exactly as before. On a `phase_scope: visual` plan (Figma
   Visual-First Track), the sub-phase instead blocks: it moves on to
   the docs pair below only when the result is a genuine
   `VISUAL_VERIFIED` under the project's `auto` approval setting; every
   other outcome halts the run instead, and under the `human` approval
   setting every outcome halts — pending explicit human review — even a
   `VISUAL_VERIFIED` result. Once the human records a decision through
   the separate `/relay-visual-approve` command, a later re-invocation
   of the same `/relay-execute` run resumes exactly this paused phase:
   approved continues on to the docs pair below; rejected returns to a
   fresh Implementer attempt seeded with the human's own feedback. For
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
    (Figma Implementation Track Phase 7). For a `visual_first: true`
    feature, this same section is additionally `phase_scope`-aware: it
    renders a Scope column (`visual`/`logic` per phase, sourced from
    each phase's own plan) and, beneath the table, one line per phase
    surfacing any recorded `/relay-visual-approve` human decision
    (approved/rejected). Both extensions are omitted entirely — the
    section renders byte-identically to the base-track shape described
    above — when no in-scope phase declares a `phase_scope` (Figma
    Visual-First Track Phase 7).

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

## 4. Manual QA flow (human validation gate — shipped)

Between `/relay-execute` and the approval flow, a human validates the feature.
These standalone commands support that gate; none is invoked by
`/relay-execute`.

1. User runs `/relay-qa-report` to list every case with its required state,
   coverage and a manual step-by-step.
2. Once per project, `/relay-auth-setup` produces an approved auth model and
   `/relay-auth-scripts` generates one login script per role, all local-only.
3. `/relay-qa-seed <feature>` proposes seed declarations for each required
   state from commands the project already has; the human confirms entries by
   hand.
4. `/relay-qa-run <feature>` translates the manual steps into a closed plan
   for the drivers it has (HTTP, browser, CLI, read-only database check),
   resolves automated cases from the test record, and gives every case one of
   `pass`, `fail`, `blocked` or `needs-human`, with redacted evidence under
   `PRPs/reports/<feature>/qa-run/<run-id>/`. The plan carries exactly one
   entry per case: an executable entry, or a declining entry that names a
   pre-run class and a code from a closed reason-code catalogue instead of
   steps. A case the plan omits is a planner defect (`NO_PLAN_ENTRY`), and
   `results.json` reports the per-class counts and the driver-executed rate
   over the automatable class.
   Before it plans a locator step, the planner runs the script's `ground` mode
   once per route and role. That mode takes the page's accessibility snapshot
   only once two successive snapshots, one second apart, are equal (it waits at
   most 20 seconds), so locators are planned from the settled page and not from
   its first paint, and its text candidates include paragraph, list-item and
   cell lines. A page that never settles ends `GROUND_UNSTABLE` with no
   snapshot file, and each case that needed a locator on that route is declined
   `STEP_UNGROUNDED` (or `UNGROUNDABLE_AFTER_INTERACTION` when the element
   exists only after an interaction). An automated case that the test record
   resolves still gets its entry: it decides nothing about the outcome, but its
   class and objective-step count are still read.
   The run's evidence is kept readable and out of git. Session values are
   registered for redaction by source: the token artifact, the role's declared
   `sessionCookie` and the cookie of every `api_origins` entry always, and every
   other cookie, `localStorage` or IndexedDB string only when it is at least 12
   characters long, has an entropy of at least 3.0 bits per character and is not
   a part of the target origin, so `localhost` or `false` no longer corrupt the
   URLs the operator reads (a short secret held by an undeclared cookie is not
   masked by value; the remedy is to declare that cookie). `init` also writes a
   `.gitignore` inside the new run directory that ignores `grounding/` and
   `evidence/` (snapshots, screenshots and response and row bodies can hold
   personal data; `results.json` and `plan.json` stay tracked), proves it with
   `git check-ignore -q` and prints `IGNORE_PROOF: proven`, or
   `IGNORE_PROOF: not-applicable` when the run directory is not inside a git work
   tree. With git present and the proof unproven, `init`, `ground` and `run` halt
   `FAILED_IGNORE_UNPROVEN` and write no snapshot, screenshot or result.
   A plan step may also be sent without the role's session, and a browser step
   may assert more than presence. An `http` `request` step that carries
   `"session": "none"` is sent with no cookie, no storage state and no derived
   header, through the same local-only guard (a non-local origin still blocks
   the case `FAILED_NON_LOCAL_TARGET`), so a case can check that an endpoint
   refuses a request made without a token while every other step of the case
   keeps the role's session. Three browser steps take a grounded `role` plus
   `name`, are planned only from a snapshot entry that matches exactly one
   element, and take the expected value or state from the report's own steps:
   `expect_value` compares an input, textarea or select value (`equals`,
   `contains` or `not_empty`) and records only which comparison ran and whether
   it passed, never the value, with the field masked in the final screenshot;
   `expect_state` asserts `expanded`, `disabled` or `checked` against a declared
   boolean, and an element that exposes no such state blocks the case
   `STEP_NOT_PERFORMABLE` instead of passing as collapsed or unchecked;
   `expect_not_visible` asserts that an element is hidden or absent. Each is
   re-read for up to 5 seconds before it is decided. An absence step is valid
   only after a positive step (`expect_visible`, `expect_text`, `expect_value` or
   `expect_state`) on the same route since the last `goto`, because an absence
   alone would pass on a page that never rendered; without that anchor the entry
   is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.
   An element that exists only after a click or a fill is grounded in a second
   pass: after the plain snapshot of the route, `ground --prefix '<json>'`
   replays a prefix of at most 5 flat `goto`, `click` and `fill` steps of the
   case itself (at least one `click` or `fill`, each naming its element by `role`
   and `name` or by `text`, never a `selector` or a `{{name}}` binding, a `fill`
   value of at most 200 characters) with the role's session behind the same
   local-only guard, each `click` or `fill` on exactly one element, and only then
   takes the stable snapshot. It is written beside the plain one and never over
   it, as `grounding/<role>--<route>--after-<8 hex>.snapshot.json` (schema
   version 2, `<route>` the path the page is on after the replay), and it records
   the replayed steps with a SHA-256 digest in place of every typed value. Its
   entries are page text read after the interaction, so they can still echo a
   value the page renders back; the file sits in the run directory's ignored
   `grounding/`. A malformed prefix exits 2 `GROUND_PREFIX_INVALID` and writes
   nothing; a step that matches zero or several elements, cannot be performed
   or names a withheld value halts `GROUND_PREFIX_FAILED` (exit 1) with no
   snapshot, and a `goto` outside the approved origin halts
   `FAILED_NON_LOCAL_TARGET` before any request. The plan-time check grounds a
   locator step against that snapshot only when the `goto`, `click` and `fill`
   steps of the case before it equal the recorded steps in order and in value
   (the case's own `goto` of the `--route` path first, an assertion between them
   ignored) on the route the page is on; every other step keeps the plain
   snapshot, and a prefix `fill` value that the report's own steps do not state
   is `PLAN_ENTRY_INVALID` when such a snapshot is consumed. A replayed `click`
   or `fill` is a real interaction with the local application, made at plan time
   and not undone, and `ground` runs no seed, so the planner prefixes only the
   case's own interactions and never one that submits, saves, deletes or sends;
   an element still not listed declines the case `UNGROUNDABLE_AFTER_INTERACTION`.
   A `click` that navigates does not reset the absence anchor above: the planner
   follows it with an `expect_url` of the new path and a positive step before
   any absence step.
   A browser step may also count the requests the page issues: `expect_requests`
   takes a `method`, a `url_contains` path (one leading `/`, no query string,
   fragment or whitespace) and a `count` from 0 to 100, and passes only when the
   page's requests of that method whose whole path contains `url_contains` number
   exactly `count`, from the start of the case's last `goto`, `click` or `fill`
   until 2 seconds after the step starts. It is valid only after one of those
   three steps, and a `count` of 0 also needs the positive step an absence step
   needs, because a page that never rendered issues no request; otherwise the
   entry is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or
   requested. A case that carries it runs with service workers blocked, and a
   matching request to a host the local-only guard does not approve was aborted
   before it left the machine and blocks the case `FAILED_NON_LOCAL_TARGET`. The
   evidence file `evidence/case-<index>.requests-<step>.json` lists the method,
   host and path of each matching request (at most 50, with `truncated` past
   that and the observed count exact; a listed path is redacted and then cut to
   its first 200 characters) and the runner never reads a query string,
   fragment, header, cookie, token or body. A path can still carry an
   identifier that no secret table recognizes, so the file sits in the run
   directory's ignored `evidence/`; it is on no terminal stream and
   `results.json` carries for the step only its result, the counts of a failing
   reason and the file's path. The window, the 100-request bound on `count`, the
   50 listed requests and the 200 characters of a listed path are chosen, not
   measured (the Phase 8 dogfood recalibrates them), and a request issued after
   the window is outside it, so a `count` of 0 can pass on it.
   A `minted` role whose login script halts `FAILED_PROBE_MARKER_ABSENT` right
   after it minted is run once more by the runner with `--force`, at most once
   per role per run (each `ground` command is a run of its own); a second halt
   leaves the role blocked with that halt's code, and the runner's comment on
   the cap records the cost: every extra run mints again and rotates the
   account's session. In step 2, `/relay-auth-scripts --refresh` regenerates
   only the scripts that already exist of the roles the run selects (the
   model's matrix, narrowed by `--role`); a role the kit holds that the matrix
   does not list is left as it is. The glossary entries "QA observed-request
   window" and "Test-auth kit" carry the detail.
5. A `pass` is evidence, not approval: the human validation gate stays open.

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
  visual-verification sub-phase degrades to a `VISUAL_DEGRADED` result
  (still verifies token conformance statically) rather than halting
  `/relay-implement` — unchanged on a `phase_scope: logic` plan (or a
  plan with no `phase_scope` row). On a `phase_scope: visual` plan
  under the `auto` approval setting, this same degraded result instead
  blocks (`VISUAL_GATE_BLOCKED` — see step 7.4 above).
