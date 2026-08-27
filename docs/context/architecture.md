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
| Commands | `plugins/relay/commands/` | `/relay-*` slash commands users invoke. | 19 implemented (including `/relay-commit` v0.14.0, dual-mode since v0.16.0, `/relay-pr` v0.15.0, `/relay-approve` v0.17.0, `/relay-qa-report` as the QA / Support command, three standalone `figma_track`-gated Figma Implementation Track commands — `/relay-design-map`, `/relay-design-spec`, `/relay-visual-review` — and `/relay-visual-approve`, the sibling Figma Visual-First Track's own standalone command); see `docs/api-reference.md` |
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
   starting and auto-generates `docs/libs/` when available. The Figma MCP
   server (planned, Pillar 2 extension) is confirmed reachable from
   Task-dispatched subagents as well as the main session — see
   `docs/decisions.md` 2026-07-22 — though the baseline design keeps Figma
   MCP calls in the interactive commands only.
2. **Implementation (single command)** — a chain of writer/reviewer agent
   pairs: PRD → Plan → (optional TDD) → Implementer → Code Reviewer →
   Test Runner (with auto-correction loop). Terminates with all phases
   complete and uncommitted changes in `.worktrees/<feature>/`. Does NOT
   commit or create a PR — that boundary is permanent (see
   `docs/decisions.md` 2026-05-18). When the target project declares
   `figma_track: true` and the plan being implemented carries
   `design_source: figma`, immediately after Code Reviewer returns
   `APPROVED` — and before the docs-sync pass below —
   `/relay-implement`'s `Phase A.3.4` dispatches the `visual-verifier`
   agent non-interactively to orchestrate the self-contained
   `plugins/relay/scripts/visual/` tooling (provision → capture →
   compare) against the plan's `## Design Source` table and the
   referenced Design Spec, returning `VISUAL_VERIFIED` / `VISUAL_DEGRADED`
   / `VISUAL_MISMATCH` and writing `fidelity-report.json`; bounded by its
   own `max_visual_retries` budget and a per-invocation `--no-visual`
   flag (see `docs/decisions.md` 2026-07-23 Visual-verification loop).
   On a `phase_scope: logic` plan, or any plan with no `phase_scope`
   Metadata row, the gate stays always non-blocking exactly as
   originally shipped. On a `phase_scope: visual` plan (Figma
   Visual-First Track, Phase 5), the gate instead blocks: Phase A.3.4
   proceeds to the docs-sync pass below (and to D8) only on a genuine
   `VISUAL_VERIFIED` result under `visual_first_approval: auto`
   (`docs/context/methodology.md`, default `auto`); every other
   outcome — including a `VISUAL_VERIFIED` result reached under
   `visual_first_approval: human`, which always requires a separate
   explicit human approval before proceeding — HALTs the invocation
   before docs-sync and D8 ever run (`VISUAL_GATE_BLOCKED` under
   `auto`, `AWAITING_VISUAL_APPROVAL` under `human`; see
   `docs/decisions.md` 2026-07-27 Implement-time visual gate).
   Immediately after Code Reviewer
   returns `APPROVED` and before the phase's D8 state-machine mutations,
   the `docs-updater`/`docs-reviewer` pair runs as the primary pass —
   non-interactively, consuming the working-tree diff / captured attempt
   `diff.patch` — to sync `docs/` with the change in the same worktree
   (implement-time docs-sync); gated by `docs_sync` in
   `docs/context/methodology.md` and a per-invocation `--no-docs` flag;
   any operator question defers to the implementation report (see
   `docs/decisions.md` 2026-07-16).
3. **Approval** — three commands after human validation: `/relay-commit`
   commits locally (no push); `/relay-pr` pushes + opens the PR;
   `/relay-approve` merges the PR, deletes the branch and worktree in
   collision-safe order, then runs Docs Updater and Docs Reviewer as a
   low-delta safety-net reconciliation pass — primary docs-sync now
   happens at implement time (Pillar 2); Pillar 3's pass catches only
   decisions made after implementation (see `docs/decisions.md`
   2026-07-16). All three Pillar 3 commands shipped (v0.14.0–v0.17.0).

## Interactivity boundary

Relay is not fully autonomous end-to-end. The pipeline has a primary
explicit boundary at PRD approval, plus two deliberately recorded
extensions (see the Design Spec and Visual Approval bullets below):

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
- **Deliberately re-extended, `figma_track`-gated:** the standalone
  `/relay-design-spec` command (Figma Implementation Track, Phase 4)
  inline-adopts a second writer/reviewer pair —
  `design-spec-writer`/`design-spec-reviewer` — directly in the main
  conversation, mirroring the PRD pair's shape: the Writer runs a
  restate-and-wait gate plus a bounded batched Q&A round, and the
  Reviewer (`invocation_context: main`) asks the user directly "Aprovar
  o Design Spec?" and owns the `DRAFT → APPROVED` flip only after both
  the rubric passing AND the user's own explicit affirmative reply. This
  is the **second** place in relay (after PRD authoring) where a
  reviewer dialogues with the user before flipping status. It is gated
  behind `figma_track: true` and never runs inside the autonomous
  `/relay-execute` loop. See `docs/decisions.md` [2026-07-23].
- **Deliberately re-extended a third time, Figma Visual-First
  Track-scoped:** the standalone `/relay-visual-approve <feature>`
  command (Figma Visual-First Track, Phase 6) is the **third** place in
  relay (after PRD authoring and the Design Spec pair) where a human
  decision gates a pipeline artifact's status — but via a structurally
  different mechanism than the first two places' synchronous,
  in-conversation dialogue. `/relay-execute` autonomously drives many
  phases across one long run with no guaranteed human presence
  mid-flight, so a `phase_scope: visual` phase under
  `visual_first_approval: human` instead HALTs
  (`AWAITING_VISUAL_APPROVAL`, written by `/relay-implement`'s Phase
  A.3.4) and waits; the human runs `/relay-visual-approve` separately —
  outside the autonomous loop, never invoked by `/relay-execute` — to
  review the fidelity report and captured/reference screenshots and
  record an approve/reject decision (a single `Edit` on the phase's
  `halt.json` plus an appended `visual-approval.jsonl` audit line); a
  *later* `/relay-execute` re-invocation then resumes the exact paused
  phase (Phase A.1's resumable visual-approval check + Phase A.2.5's
  resume short-circuit), routing rejection feedback into the next
  implementer attempt automatically. See `docs/decisions.md`
  [2026-07-27].

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
| `PRPs/reports/<feature>/` | Test Runner execution reports, attempts log, per-attempt diffs, final report; when TDD is active, also `tdd-initial-suite.diff` and `tdd-reviews.md`; per-attempt diffs from `/relay-implement` at `phase-<N>/attempts/<i>/diff.patch` plus `record.json` (recorded in `docs/decisions.md` 2026-04-30). `/relay-implement`'s P5 test-file formatting preflight (precondition, runs before `base_commit`/`diff_target` capture) also writes a command-owned side-record at `phase-<N>/preflight-formatting.json` (PRD mode; `<slug>/preflight-formatting.json` in description mode) carrying `{formatter_cmd, discovery_source, files_scoped, outcome, exit_code_or_null}` — distinct from any test-suite manifest or lifecycle ledger (`test-formatting-prevention-preflight` Phase 3). |
| `PRPs/reports/design-map/evidence/` | Persisted Figma evidence bundle (library search results, node-scoped metadata, opportunistic Code Connect map) written by `/relay-design-map` before dispatching `design-map-writer`/`design-map-reviewer` — the sole Figma-fact source either agent is permitted to read (Figma Implementation Track Phase 3; MCP-access-point decision, `docs/decisions.md` 2026-07-22). The durable map itself lives outside `PRPs/`, at `docs/design/component-map.md` — see `docs/decisions.md` 2026-07-23. |
| `PRPs/reports/design-map/.state/checkpoint.json` | `/relay-design-map` run checkpoint — a cumulative Figma MCP `call_log` (tool name, UTC timestamp, outcome) plus a monotonically incrementing scan-generation counter, appended on every run (including a run that halts on `FAILED_FIGMA_QUOTA_EXHAUSTED`). Deliberately placed outside `evidence_dir` so neither `design-map-writer`'s nor `design-map-reviewer`'s "read every file under `evidence_dir`" instruction ever reaches it. Its cumulative `call_log` is projected into `library-search.json`'s own header on every evidence write. figma-quota-resilience Phase 4. |
| `PRPs/designs/<feature>/design-spec.md` | Per-feature Design Spec (written DRAFT by `design-spec-writer`, flipped to `APPROVED` by `design-spec-reviewer` only after the user's own explicit affirmative reply) — a business-grounded, evidence-backed contract turning one feature's Figma design into an artifact the rest of the autonomous pipeline trusts blindly. Sibling paths under the same feature directory: `raw/` (persisted Figma traversal evidence), `refs/` (reference screenshots), `design-spec-review.jsonl` (reviewer's append-only verdict log). Canonical shape: `plugins/relay/resources/design-spec-template.md`. Figma Implementation Track Phase 4; standalone via `/relay-design-spec`, never invoked by `/relay-execute` — see `docs/decisions.md` [2026-07-23]. |
| `PRPs/reports/<feature>/phase-<N>/visual/<attempt>/fidelity-report.json` | Per-attempt visual-verification artifact — one entry per in-scope frame (`node_id`, `route`, `comparison_basis`, `comparison_png`, `diff_percent`, `pixelmatch_threshold`, `threshold`, `diff_png`, `status`) — written by `compare.mjs` on the FULL rung, or directly by the `visual-verifier` agent on either degraded rung. Each diffed frame also gets an inspectable diff overlay at `visual/<attempt>/diff/<node-id>.png`. `status` is `PASS`/`FAIL` only when the frame was diffed against its approved baseline (`PRPs/reports/<feature>/visual-baseline/index.json`, written by `/relay-visual-approve`); with no baseline it is the advisory `NO_BASELINE` — see `docs/decisions.md` [2026-08-20] Approved-capture baseline. Sibling artifact root to the same attempt's `diff.patch`. Figma Implementation Track Phase 6; dispatched by `/relay-implement`'s Phase A.3.4 — see `docs/decisions.md` [2026-07-23] Visual-verification loop. |
| `.worktrees/<feature>/` | Per-feature isolated git worktrees created by `/relay-worktree`. Each worktree checks out branch `feature/<feature>` from the base ref (default `origin/main` → `origin/master` → `HEAD` fallback chain). Idempotent: silently reused when the worktree exists on the expected branch; HALT loud on branch divergence. Worktrees persist until Pillar 3 (`/relay-approve`) removes them post-merge. Path sidesteps the `.claude/` permission gate — documented in `docs/decisions.md` 2026-05-11 D1. |

Artifacts are NEVER written under `.claude/`. Claude Code enforces
hardcoded permission prompts on writes to that folder; those prompts
would interrupt the autonomous loop on every file write. See
`docs/anti-patterns.md` and `docs/decisions.md`.

The canonical PRD shape is defined in `plugins/relay/resources/prd-template.md`.

## Command surface

Relay exposes **19 commands**, organized by role. Full
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
- **A QA / Support command sits in the human validation gate.**
  `/relay-qa-report` is invoked by the human between `/relay-execute`
  (Pillar 2) and Pillar 3 to enumerate per-case test coverage before
  manual testing; it is not part of the autonomous loop and is never
  called by `/relay-execute`.
- **A standalone, human-triggered setup command sits outside all three
  pillars.** `/relay-design-map` (Figma Implementation Track, Phase 3)
  builds or additively refreshes a per-project Figma-to-code component
  map (`docs/design/component-map.md`) via the `design-map-writer`/
  `design-map-reviewer` pair; it is invoked once per project (or
  re-run with `--refresh`), is never called by `/relay-execute`, and
  gates the one sanctioned `figma_track: true` flip behind an
  explicit, quoted human confirmation. Since figma-quota-resilience
  Phase 5, a plain re-invocation (no `--refresh`) resumes at no extra
  Figma cost — library search, node-scoped metadata enrichment, and
  Code Connect each skip work already recorded in the prior evidence
  bundle, so a fully-cached re-run issues zero Figma calls — while
  `--refresh` deliberately re-runs library search and Code Connect in
  full and still limits metadata enrichment to the delta.
- **A second standalone, human-triggered command inline-adopts a
  writer/reviewer pair and extends the interactivity boundary.**
  `/relay-design-spec` (Figma Implementation Track, Phase 4) inline-adopts
  `design-spec-writer`/`design-spec-reviewer` directly in the main
  conversation — mirroring how `/relay-prd` bundles
  `prd-writer`/`prd-reviewer` — rather than `Task`-dispatching an
  MCP-free pair the way `/relay-design-map` does. It performs all Figma
  MCP querying itself, in this session, as the Writer's own protocol
  directs; it is never called by `/relay-execute`. See "Interactivity
  boundary" above and `docs/decisions.md` [2026-07-23]. Since
  figma-quota-resilience Phase 6, a Figma MCP refusal mid-traversal no
  longer deadlocks the Writer's Phase 2: partial evidence narrows scope
  (and, for a missing token map specifically, sets rung
  `DEGRADED_NO_TOKENS`), while zero evidence gathered at all HALTs —
  `FAILED_FIGMA_QUOTA_EXHAUSTED` when the refusal(s) were
  quota-exhaustion errors, or the same zero-evidence HALT naming the
  actual refusal honestly otherwise. A `cumulative_figma_calls` count,
  carried across both user-chosen re-traversal paths, is displayed in
  the `max_spec_review_retries` exhaustion offer, which suppresses its
  "retry with corrected inputs" outcome after a `DEGRADED_NO_TOKENS`
  round.
- **A third standalone, human-triggered command mirrors
  `/relay-implement`'s own visual-verification dispatch, read-only.**
  `/relay-visual-review` (Figma Implementation Track, Phase 7) is a
  single-shot, non-mutating standalone re-check of visual fidelity —
  it dispatches the already-shipped `visual-verifier` agent exactly
  once against a plan whose `## Metadata` carries `design_source:
  figma` (reusing `/relay-implement`'s own Phase A.3.4 dispatch
  payload shape with an `attempt: 1` sentinel, per
  `/relay-code-review`'s precedent), surfaces `VISUAL_VERIFIED` /
  `VISUAL_DEGRADED` / `VISUAL_MISMATCH`, performs zero D8 mutations,
  and is never called by `/relay-execute`.
- **A fourth standalone, human-triggered command records the Figma
  Visual-First Track's human-mode visual-approval decision.**
  `/relay-visual-approve <feature>` (Figma Visual-First Track, Phase 6)
  locates the single unresolved `AWAITING_VISUAL_APPROVAL` halt for a
  feature, surfaces the fidelity report plus derived captured/reference
  screenshot paths, requires an explicit quoted confirmation before
  recording either decision, and flips the phase's `halt.json` (plus an
  appended `visual-approval.jsonl` audit line) via a single `Edit` —
  mirroring `/relay-design-map`'s own confirm-then-flip discipline. It
  does not resume the pipeline itself — a later `/relay-execute`
  re-invocation does that (Phase A.1's resumable visual-approval check +
  Phase A.2.5's resume short-circuit). Never called by `/relay-execute`.
  See "Interactivity boundary" above and `docs/decisions.md`
  [2026-07-27].

Happy path for day-to-day use: `/relay-prd` → `/relay-execute` →
(human validates + manual testing, aided by `/relay-qa-report`) →
`/relay-commit` → `/relay-pr` → (after merge) `/relay-approve`. Every
intermediate command is there for flexibility, not for routine use.

## Orchestrator state machine

The `/relay-execute` orchestrator uses the source PRD's Implementation
Phases table as its canonical state machine (D6 — 2026-05-01 decision).

- **Phase-state representation:** each row's `Status` cell is the
  authoritative phase-state, moving through five values in order —
  `pending` → `in-progress` → `implemented` → `tested` → `complete`
  (2026-08-05 decision; the vocabulary and its rules are documented in
  `plugins/relay/resources/prd-template.md`). No separate state file
  (e.g. `orchestrator-state.json`) is maintained.
- **Idempotency:** on every invocation, the orchestrator re-reads the PRD
  table from disk. Only `pending` rows are actionable, so every row that
  has left `pending` is skipped; execution resumes from the first
  `pending` row with satisfied dependencies. Re-invoking after
  a budget-exceeded halt is safe and correct. A row `in-progress` because
  of an unresolved `AWAITING_VISUAL_APPROVAL` halt is a distinct case —
  handled explicitly, as of Figma Visual-First Track Phase 6, rather
  than falling through to either the actionable-row pick or the "all
  phases complete" exit: the orchestrator reports the pending human decision
  when no `resolution` is recorded yet, and resumes that exact phase via
  Phase A.2.5's short-circuit once `/relay-visual-approve` has recorded
  one — see "Interactivity boundary" above.
- **State transitions:** each of the four transitions has exactly one
  owner. `plan-writer` back-fills row N to `in-progress` on plan
  generation; `/relay-implement` flips it to `implemented` on successful
  D8 post-approval mutations; `/relay-execute` itself writes the last
  two — `tested` after test-review returns APPROVED (Step A.5.3), and
  `complete` as it closes the phase out (Step A.6.0). The orchestrator
  owning the tail of the lifecycle is a deliberate split of the D8
  row-mutation rule: `/relay-test` and `/relay-test-review` are plan-
  and feature-scoped and know neither the row number nor the PRD path,
  so the orchestrator is the only component positioned to record them.
  Both orchestrator flips are idempotent and soft-fail — a failed flip
  warns and continues, because a stale status cell is bookkeeping drift,
  not a broken tree.
- **Skipped `tested`:** when a project declares no test framework (or the
  test stage self-skips for any other reason), the row moves
  `implemented` → `complete` directly. `tested` is never written for
  work that was not tested; the skip reason lives in
  `orchestrator-run.json`.
- **Dependency satisfaction:** a row listed in another row's `Depends`
  cell unblocks it from `implemented` onward — not only at `complete`.
  A hand-invoked `/relay-implement` legitimately stops at `implemented`,
  since nothing outside the orchestrator writes the last two states, and
  the stricter rule would block every dependent phase forever.
- **`complete` ≠ merged:** `complete` means the orchestrator drove the
  phase end to end. Merge, branch cleanup, and post-merge docs sync
  belong to `/relay-approve`, which never edits the Implementation
  Phases table.
- **Model:** lightweight Airflow-style idempotency-by-convention, appropriate
  for relay's single-developer scale. A durable execution engine (Temporal-
  style event-sourced) would be over-engineering for the current use case.

## Phased rollout

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1 | Foundation — context-builder + decision-gate | `context-builder` done; `decision-gate` generated by this doc run |
| 2 | Test automation — isolated container, Test Runner, auto-correction loop, test writer/reviewer pair (test-first + test-after) | not started |
| 3 | Agent orchestrator — single `/relay-*` command driving the pipeline through implementation (does NOT commit or create PR) | shipped (PRD pair v0.6.0; Plan pair v0.7.0; Implementation pair v0.8.0; reviewer-coherence-layer 2026-04-28; Test Runner; `/relay-execute` orchestrator v0.9.0; test writer/reviewer pair v0.10.0, universalized to test-first + test-after with full lifecycle v0.19.0; `/relay-worktree` v0.11.0) |
| 4 | Approval cycle — `/relay-commit` (local commit) + `/relay-pr` (push + PR creation) + `/relay-approve` (merge + docs update + worktree cleanup) | **done** — `/relay-commit` shipped v0.14.0; `/relay-pr` shipped v0.15.0; `/relay-approve` + Docs Updater + Docs Reviewer shipped v0.17.0 |
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
    ├── design/               Figma Implementation Track design-system artifacts (dogfood-runbook.md; component-map.md when figma_track: true)
    ├── domain/               glossary, flows; areas/ is a stub
    ├── planning/             source-of-truth planning docs (HTML + DOCX)
    └── *.md                  tier-3 developer docs + governance files
```
