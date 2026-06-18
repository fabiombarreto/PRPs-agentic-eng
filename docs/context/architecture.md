# Architecture

## What this repository is

A Claude Code plugin marketplace whose single published plugin is `relay`.
Both the marketplace manifest and the plugin manifest are versioned here:

| File | Purpose |
|------|---------|
| `.claude-plugin/marketplace.json` | Marketplace definition — lists `relay` as an installable plugin |
| `plugins/relay/.claude-plugin/plugin.json` | Plugin manifest (name, version, author) |

## What `relay` is

`relay` is an autonomous feature-delivery plugin. The target experience is: a
single prompt takes a feature from PRD through plan, (optional) TDD,
implementation, test execution with auto-correction, review, and PR creation —
without intermediate human approvals.

The plugin is composed of four Claude Code asset types:

| Type | Folder | Purpose | Status |
|------|--------|---------|--------|
| Skills | `plugins/relay/skills/` | Reusable, prompt-based capabilities loaded on demand. Currently: `context-builder`. | 1 present |
| Commands | `plugins/relay/commands/` | `/relay-*` slash commands users invoke. | 14 implemented (including `/relay-commit` v0.14.0, dual-mode since v0.16.0, and `/relay-pr` v0.15.0); see `docs/api-reference.md` |
| Agents | `plugins/relay/agents/` | Specialized sub-agents (PRD Writer, Plan Writer, Test Runner, etc.). | planned, not yet implemented |
| Hooks | `plugins/relay/hooks/` | Event-triggered scripts (Stop, PostToolUse, etc.) wired in `hooks/hooks.json`. | planned, not yet implemented |

## Relationship to `plugins/prp-core/`

`plugins/prp-core/` is the upstream [Wirasm PRP plugin](https://github.com/Wirasm/PRPs-agentic-eng)
kept on disk as a reference. It is **not** part of the `relay` surface: its
commands, agents, and skills are read-only examples of Claude Code file format
and agent design, used to inform how `relay`'s own assets should be written.
The `relay` plugin does not import, extend, or re-export any `prp-core` asset.
Treat it as external documentation that happens to live in the same repo.

## Three-pillar target architecture [INFERRED - VALIDATE]

From `docs/planning/dev_process_improvement_plan.html`, the final shape of the
plugin covers three pillars:

1. **Initialization** — `context-builder` skill (present) generates
   `/context`, `/domain`, `/libs` plus `decision-gate.md`, `decisions.md`,
   `anti-patterns.md` for any target project. Validates MCP Context7 before
   starting and auto-generates `docs/libs/` when available.
2. **Implementation (single command)** — a chain of writer/reviewer agent
   pairs: PRD → Plan → (optional TDD) → Implementer → Code Reviewer →
   Test Runner (with auto-correction loop). Terminates with all phases
   complete and uncommitted changes in `.worktrees/<feature>/`. Does NOT
   commit or create a PR — that boundary is permanent (see
   `docs/decisions.md` 2026-05-18).
3. **Approval** — three commands after human validation: `/relay-commit`
   commits locally (no push); `/relay-pr` pushes + opens the PR;
   `/relay-approve` merges the PR, deletes the branch and worktree, then
   runs Docs Updater and Docs Reviewer to keep `/context` and `/domain`
   in sync with what was actually implemented.

All three pillars are inferred from the planning document and are not yet
reflected in code beyond the `context-builder` skill.

## Interactivity boundary

Relay is not fully autonomous end-to-end. The pipeline has a single
explicit boundary at PRD approval:

- **Interactive (up to and including PRD Reviewer):** the PRD Writer runs
  a 6-phase Q&A flow with the user (Initiate → Foundation → Grounding →
  Deep Dive → Grounding → Decisions → Generate), and the PRD Reviewer can
  loop with the user until the PRD is approved. User input is expected
  here — the purpose of this phase is catching ambiguity before it
  cascades.
- **Autonomous (after PRD approval):** Plan Writer, Plan Reviewer, TDD
  Writer/Reviewer (when `docs/context/methodology.md` has `tdd: true`),
  Implementer, Code Reviewer, and Test Runner with auto-correction loop
  run without interrupting the user. The autonomous pipeline stops at
  "all phases complete" with uncommitted changes — it does NOT commit
  or create a PR. An agent only surfaces to the human when it has
  exhausted its recovery strategies and a decision outside its
  competence is required.
- **Human gate before Pillar 3:** after `/relay-execute` completes, the
  human reviews the result and performs any manual testing before
  triggering Pillar 3.
- **Explicitly triggered:** Pillar 3 (`/relay-commit` → `/relay-pr` →
  `/relay-approve`) is initiated by the user step by step; each command
  runs autonomously once invoked. `/relay-commit` is local and reversible
  (dual mode since v0.16.0: an existing worktree → deterministic worktree
  commit; no/other argument → review + commit the current branch);
  `/relay-pr` pushes + opens the PR; `/relay-approve` merges and cleans up.

The boundary exists because the highest-leverage moment to catch scope
drift or misunderstanding is during PRD authoring. Resolving ambiguity at
that point costs minutes; resolving it after implementation cascades into
plan, tests, and code rework. See `docs/decisions.md`.

## PRP artifact paths

All pipeline artifacts live under `PRPs/` at the repository root:

| Path | Contents |
|------|----------|
| `PRPs/prds/<feature>.prd.md` | PRDs (written by PRD Writer, approved by PRD Reviewer) |
| `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | Implementation plans, one per PRD phase (`plan-writer` writes DRAFT; `plan-reviewer` flips to APPROVED). Per-phase pattern recorded in `docs/decisions.md` 2026-04-25. |
| `PRPs/plans/completed/<basename>.plan.md` | Archived implementation plans after `/relay-implement` reaches APPROVED rubric and performs D8 Mutation b. Archive path codified in `docs/decisions.md` 2026-04-30; relay equivalent of prp-core's `.claude/PRPs/plans/completed/` (the upstream path violates the no-`.claude/`-writes rule). |
| `PRPs/reports/<feature>/` | Test Runner execution reports, attempts log, per-attempt diffs, final report; when TDD is active, also `tdd-initial-suite.diff` and `tdd-reviews.md`; per-attempt diffs from `/relay-implement` at `phase-<N>/attempts/<i>/diff.patch` plus `record.json` (recorded in `docs/decisions.md` 2026-04-30). |
| `.worktrees/<feature>/` | Per-feature isolated git worktrees created by `/relay-worktree`. Each worktree checks out branch `feature/<feature>` from the base ref (default `origin/main` → `origin/master` → `HEAD` fallback chain). Idempotent: silently reused when the worktree exists on the expected branch; HALT loud on branch divergence. Worktrees persist until Pillar 3 (`/relay-approve`) removes them post-merge. Path sidesteps the `.claude/` permission gate — documented in `docs/decisions.md` 2026-05-11 D1. |

Artifacts are NEVER written under `.claude/`. Claude Code enforces
hardcoded permission prompts on writes to that folder; those prompts
would interrupt the autonomous loop on every file write. See
`docs/anti-patterns.md` and `docs/decisions.md`.

The canonical PRD shape is defined in `docs/context/prd-template.md`.

## Command surface

Relay exposes **13 commands** plus 1 placeholder, organized by role. Full
table and contracts in `docs/api-reference.md`; rationale in
`docs/decisions.md`. Summary of the philosophy:

- **One command per stage.** Every pipeline step has its own command so it
  can be invoked in isolation — for testing during Phase 2 implementation,
  and for manual intervention by the user between stages.
- **Writers and reviewers are split.** A reviewer accepts a hand-edited
  artifact as input. This means the user can edit a plan, TDD suite, code,
  or test state manually and re-run just the review to validate.
- **The orchestrator composes the stages.** `/relay-execute <prd-path>`
  invokes each command in order, looping writer→reviewer pairs on
  `CHANGES_REQUESTED`.
- **Naming reuses prp-core where it exists.** `/relay-implement` matches
  the familiar `/prp-implement` convention. The orchestrator is
  `/relay-execute` to avoid collision.

Happy path for day-to-day use: `/relay-prd` → `/relay-execute` →
(human validates + manual testing) → `/relay-commit` → `/relay-pr` →
(after merge) `/relay-approve`. Every intermediate command is there for
flexibility, not for routine use.

## Orchestrator state machine

The `/relay-execute` orchestrator uses the source PRD's Implementation
Phases table as its canonical state machine (D6 — 2026-05-01 decision).

- **Phase-state representation:** each row's `Status` cell (`pending` /
  `in-progress` / `complete`) is the authoritative phase-state. No separate
  state file (e.g. `orchestrator-state.json`) is maintained.
- **Idempotency:** on every invocation, the orchestrator re-reads the PRD
  table from disk. Rows with `Status: complete` are skipped; execution
  resumes from the first `pending` or `in-progress` row. Re-invoking after
  a budget-exceeded halt is safe and correct.
- **State transitions:** plan-writer back-fills row N `Status` to
  `in-progress` on plan generation; `/relay-implement` flips it to
  `complete` on successful D8 post-approval mutations. The orchestrator
  reads these transitions but does not write them directly.
- **Model:** lightweight Airflow-style idempotency-by-convention, appropriate
  for relay's single-developer scale. A durable execution engine (Temporal-
  style event-sourced) would be over-engineering for the current use case.

## Phased rollout

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Foundation — context-builder + decision-gate | `context-builder` done; `decision-gate` generated by this doc run |
| 2 | Test automation — isolated container, Test Runner, auto-correction loop, optional TDD track (B7/B8) | not started |
| 3 | Agent orchestrator — single `/relay-*` command driving the pipeline through implementation (does NOT commit or create PR) | shipped (PRD pair v0.6.0; Plan pair v0.7.0; Implementation pair v0.8.0; reviewer-coherence-layer 2026-04-28; Test Runner; `/relay-execute` orchestrator v0.9.0; B7/B8 TDD pair v0.10.0; `/relay-worktree` v0.11.0) |
| 4 | Approval cycle — `/relay-commit` (local commit) + `/relay-pr` (push + PR creation) + `/relay-approve` (merge + docs update + worktree cleanup) | **partial** — `/relay-commit` shipped v0.14.0; `/relay-pr` shipped v0.15.0; `/relay-approve` + Docs Updater/Reviewer pending |
| 5 | Full CI/CD integration — end-to-end autonomous pipeline | not started |

See `docs/planning/planejamento_fase_2.docx` for the Phase 2 design in detail
(16 components across Infra / Plugin / Integrations layers, plus the TDD
opt-in trilho). **This `.docx` is a living document**, not a historical
record: when the Phase 2 scope changes (components added, removed, or
materially redesigned), the file MUST be updated to match. Edits are
performed programmatically via `python-docx` rather than Word/LibreOffice
to preserve a clean diff and to avoid spurious formatting churn.

## Folder structure explained

```
/
├── .claude-plugin/           marketplace manifest
├── plugins/
│   ├── relay/                ACTIVE plugin — edit this
│   │   ├── .claude-plugin/   plugin manifest
│   │   ├── skills/           reusable capabilities (context-builder today)
│   │   ├── commands/         planned
│   │   ├── agents/           planned
│   │   └── hooks/            planned
│   └── prp-core/             REFERENCE — Wirasm upstream, do not modify for relay
└── docs/                     this documentation tree
    ├── context/              stack, conventions, integrations, constraints
    ├── domain/               glossary, flows; areas/ is a stub
    ├── planning/             source-of-truth planning docs (HTML + DOCX)
    └── *.md                  tier-3 developer docs + governance files
```
