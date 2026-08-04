# API Reference

Surface exposed by the `relay` plugin. "API" here means the set of skills,
commands, agents, and hooks the plugin publishes into Claude Code.

## Skills (implemented)

| Name | Path | Purpose |
|------|------|---------|
| `context-builder` | `plugins/relay/skills/context-builder/SKILL.md` | Initialize or update a target project's documentation tree (CLAUDE.md, KNOWLEDGE_BASE.md, docs/context, docs/domain, docs/libs) for token-efficient agent operation. |

Modes for `context-builder`: `*init`, `*update`, `*validate`, `*domain`,
`*libs`, `*gate` — see its `SKILL.md` for details.

## Commands

19 commands organized by role (11 Pillar 1–2 plus `/relay-commit`,
`/relay-pr`, and `/relay-approve` as the three Pillar 3 commands, shipped
v0.14.0, v0.15.0, and v0.17.0, plus `/relay-qa-report` as the QA / Support
command in the human validation gate, plus three standalone,
`figma_track: true`-gated Figma Implementation Track commands —
`/relay-design-map` (Phase 3), `/relay-design-spec` (Phase 4), and
`/relay-visual-review` (Phase 7) — none of which is ever invoked by
`/relay-execute`, plus a fourth standalone command, `/relay-visual-approve`,
belonging to the sibling Figma Visual-First Track and gated by
`visual_first_approval: human` (itself only reachable when
`figma_track: true` AND `visual_first: true`) rather than `figma_track`
directly — also never invoked by `/relay-execute`. All 19 commands are now
implemented;
`/relay-execute` ✅ orchestrator shipped in v0.9.0 completing project Phase 3;
`/relay-approve` ✅ shipped in v0.17.0 completing Phase 4. See
`docs/decisions.md` for the decision record and rationale.

### Happy path

For day-to-day use, two commands cover the full pipeline:

1. `/relay-prd <description>` — interactive; produces an approved PRD.
2. `/relay-execute <prd-path>` — autonomous; drives the PRD through to an
   opened PR.

Docs-sync already ran once during `/relay-execute` (inside
`/relay-implement`, immediately after code-review `APPROVED`); once the
PR merges, `/relay-approve <pr>` (Pillar 3) runs a low-delta safety-net
docs-update cycle.

### Full command surface

#### Writers (produce an artifact)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-prd <description \| draft-path>` ✅ **implemented** | description, draft PRD markdown path, or no argument (opens with "What do you want to build?") | `PRPs/prds/<feature>.prd.md` with status `APPROVED`. Interactive — runs the 6-phase Q&A loop with the user, invokes `research-web` + `research-codebase` subagents during GROUNDING, hands off to the `prd-reviewer` agent for the DRAFT→APPROVED flip. Refuses to operate on a file whose current status is `APPROVED` (manual hand-edit is the documented escape hatch). Filename chosen by the writer in kebab-case; collision resolved with numeric suffix; APPROVED files never overwritten. See `PRPs/prds/prd-authoring.prd.md`. |
| `/relay-plan <prd-path>` ✅ **implemented** | **PRD mode:** approved PRD (status `*Status: APPROVED*` at the trailer) with at least one Implementation Phases row in `pending` whose `Depends` cell is empty or all-complete. **Description mode (new, v0.13.0):** Any non-empty argument that does not resolve to a `.prd.md` file and does not contain an `Implementation Phases` table enters description mode; plan written to `PRPs/plans/<slug>.plan.md` (flat filename, no PRD back-fill). | `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` with status `DRAFT` (PRD mode) or `PRPs/plans/<slug>.plan.md` (description mode, flat filename). Autonomous — dispatches the `plan-writer` agent, which in PRD mode parses the PRD's Implementation Phases table, picks the next actionable row, runs `research-codebase` + `research-web` in parallel during GROUNDING, consults the Decision Gate sources, writes the per-phase DRAFT, and back-fills the source PRD's row N (`Status` to `in-progress`; `PRP Plan` cell to the relative plan path). In description mode, the plan is generated directly from the free-text description with derived `AC-A<i>` items and no PRD back-fill. Filename uses kebab-cased phase name (PRD mode) or description slug (description mode); collision resolved with numeric suffix; APPROVED plans never overwritten. See `PRPs/prds/plan-authoring.prd.md` and `PRPs/prds/relay-plan-prd-less-mode.prd.md`. |
| `/relay-write-test <plan-path>` | approved plan | test suite (status `DRAFT`). Activates when `docs/context/methodology.md` declares a framework (non-empty `test_frameworks`), in BOTH modes; `tdd:` selects ordering (test-first before the Implementer / test-after after the Implementer + Code Review). Silently self-skips when `test_frameworks: []` or the file is missing, or — test-first only — when the plan's `## Metadata` has `phase_type: foundation` (the seam-creation phase is not test-first-authorable; the implementer creates the seam and later feature phases run test-first) |
| `/relay-implement <plan-path>` ✅ **implemented** | approved plan ending with `*Status: APPROVED*` whose source PRD's Implementation Phases row N has `Status: in-progress` | working tree carries the implementation diff against the base commit; on APPROVED rubric, plan trailing block flipped to `*Status: IMPLEMENTED*`, plan moved to `PRPs/plans/completed/<basename>.plan.md`, source PRD row N flipped from `in-progress` to `complete`. Autonomous — runs an internal writer↔reviewer loop dispatching the `implementer` agent (writes code via Edit/Write directly in the working tree) and the `code-reviewer` agent (three-layer rubric: structural / static / semantic + R-X universal test-modification guard) once per attempt. Bounded by `max_implement_retries=3` (4 attempts total), `max_implement_minutes=45` (wall-clock; first-to-expire-wins distinct from retry exhaustion), `max_disputes_per_session=2` (TEST_CONTRACT_DISPUTE escape valve cap; arbitration mode resolves with `DISPUTE_REJECTED`/`DISPUTE_UPHELD_TEST_WRONG`/`DISPUTE_UPHELD_PRD_AMBIGUOUS`). Oscillation detection always-on (file-set intersection + semantic-reversal heuristic). Per-attempt cumulative `diff.patch` captured at `PRPs/reports/<feature>/phase-<N>/attempts/<i>/`. D8 post-approval mutations are best-effort atomic with rollback note on partial failure. Immediately after code-review `APPROVED` and before the D8 mutations, a `Phase A.3.5 — Docs-sync dispatch` sub-phase runs the `docs-updater`/`docs-reviewer` pair non-interactively against the current attempt's `diff.patch`, syncing `docs/` in the worktree (own `max_docs_review_retries=2` budget; gated by `docs_sync` in `docs/context/methodology.md` and a per-invocation `--no-docs` flag; deferred operator questions surface via the `Docs:` line in the Final output surface). See `PRPs/prds/implement-phase-docs-sync.prd.md`. See `PRPs/prds/implementation-authoring.prd.md`. |

#### Reviewers (validate an existing artifact; accept hand-edited input)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-plan-review <plan-path>` ✅ **implemented** | plan ending with `*Status: DRAFT*` (generated by `/relay-plan` or hand-edited) | status flipped to `*Status: APPROVED*` via two-line `Edit` (insert `*Approved: <YYYY-MM-DD>*` above the trailer), or `CHANGES_REQUESTED` with the failing rubric items by ID + reason. Autonomous — dispatches the `plan-reviewer` agent which runs the 8-item structural rubric (R1 Decision Gate, R2 mandatory sections, R3 no TBD, R4 ≥3 atomic tasks with `VALIDATE`, R5 TDD routing, R6 no `.claude/` writes, R7 Files-to-Change row, R8 PRD↔plan traceability) without short-circuit. Every verdict appended to `PRPs/plans/<basename>.review.jsonl`. CHANGES_REQUESTED is terminal for one invocation; the orchestrator decides regeneration via `/relay-plan`. See `PRPs/prds/plan-authoring.prd.md`. |
| `/relay-test-write-review <suite-path>` | test suite `DRAFT` | `APPROVED` or `CHANGES_REQUESTED`; activates when a framework is declared (both modes); silently self-skips when `test_frameworks: []` or the file is missing |
| `/relay-code-review <plan-path>` ✅ **implemented** | plan path (status `*Status: APPROVED*` or `*Status: IMPLEMENTED*`) and a working-tree diff against the base branch | `APPROVED` or `CHANGES_REQUESTED` appended to `PRPs/plans/<basename>.code-review.jsonl`. Standalone single-shot dispatch of the `code-reviewer` agent in `mode: 'standard'`; no internal loop, no retries, no per-attempt diff.patch artifact, no D8 mutations. Architectural divergence from `/relay-plan-review`: this command surfaces the verdict and exits without auto-flipping plan status — D8 mutations are exclusively `/relay-implement`'s responsibility. Read-only counterpart to `/relay-implement`'s mutation-triggering autonomous loop, for hand-invoked review of an existing implementation diff. See `PRPs/prds/implementation-authoring.prd.md`. |
| `/relay-test-review <worktree>` ✅ **implemented** | worktree with green test state (B5 post-green review) | `APPROVED` or `CHANGES_REQUESTED` (removed tests / added skips / trivial assertions / coverage drop >5%). Delegates to the `post-green-reviewer` agent; writes `PRPs/reports/<feature>/test-review.json`. Preconditions: `run.json` exists with `outcome=GREEN`. Base branch defaults to `main`/`master` or can be overridden with `--base`. |

#### Infrastructure / execution

| Command | Input | Output |
|---------|-------|--------|
| `/relay-worktree <feature-name>` ✅ **implemented** | feature name (free argument); or PRD-derived slug when invoked internally by `/relay-execute`. Sanitized to `[a-z0-9-]` max 64 chars; empty result after sanitization → HALT. `--base <ref>` flag overrides the base ref (default: `origin/main` → `origin/master` → `HEAD` fallback chain). `--no-worktree` on `/relay-execute` skips invocation entirely. | worktree at `.worktrees/<feature>/` + branch `feature/<feature>`. Idempotent: silently reuses an existing worktree when the branch matches; halts loud (`FAILED_BRANCH_DIVERGENCE`) when the worktree exists on a different branch. Bootstrap log at `PRPs/reports/<feature>/worktree-bootstrap.log` when `scripts/worktree-bootstrap.sh` runs (non-fatal on failure). Precondition halts: `FAILED_NOT_A_GIT_REPO`, `FAILED_BASE_REF_MISSING`, `FAILED_BRANCH_CONFLICT`, `FAILED_PATH_OCCUPIED`. Creation failure inside `/relay-execute` triggers graceful fallback to cwd per D3/D4 — pipeline does NOT halt on worktree creation failure. See `PRPs/prds/relay-worktree.prd.md` AC-1 through AC-9. |
| `/relay-test <worktree>` ✅ **implemented** | worktree with code | green state or `FAILED_AFTER_N_RETRIES` / `FAILED_TIME_BUDGET_EXCEEDED` / `FAILED_OSCILLATION` / `FAILED_INFRA_UNRECOVERABLE`, or `skipped_no_test_framework` (graceful self-skip when `test_frameworks: []` or `methodology.md` absent; no `run.json` written; symmetric with `/relay-write-test` P4.a). Encapsulates B1–B4: suite execution, failure classification, auto-correction loop (see `docs/decisions.md` on `max_test_retries`, `max_test_minutes`). Delegates per-attempt work to the `test-runner` agent (`plugins/relay/agents/test-runner.md`). Produces `PRPs/reports/<feature>/run.json` plus per-attempt `record.json` and `stdout.log`. |
| `/relay-pr <feature-name>` | worktree (`.worktrees/<feature>/`) with a committed branch (produced by `/relay-commit`), green tests, and all reviews `APPROVED` | branch push (non-forced) + PR opened via `gh pr create` + `PRPs/reports/<feature>/final-report.md` (when test artifacts exist) |

#### Orchestrator

| Command | Input | Output |
|---------|-------|--------|
| `/relay-execute <prd-path>` ✅ **implemented** | approved PRD | all phases complete — working tree in `.worktrees/<feature>/` carries uncommitted implementation changes, ready for `/relay-pr`; or a HALT code on unrecoverable failure. Does NOT commit or create a PR (see `docs/decisions.md` 2026-05-18). Serial orchestration via source PRD's Implementation Phases table as state machine (D6 — idempotent on re-invocation; re-reads table on every run; no separate state file). Inline command-protocol adoption via `Read` (D7 — LLM reads each downstream command file and executes its protocol in the same conversation context; zero logic duplication; no sub-agents). Two new orchestration-layer budgets: `max_plan_review_retries` and `max_orchestrator_minutes` (D3 — each downstream command owns its internal loop budget; orchestrator adds session-level wall-clock; first-to-expire wins). Nine distinct HALT outcome codes: `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`, `FAILED_PLAN_REVIEW_STUCK`, `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`, `FAILED_TEST_REVIEW_REJECTED`, plus four propagated from `/relay-implement` and one from `/relay-test`. Phase A.5.0 (v0.11.1): when `test_frameworks: []` or `methodology.md` absent, the orchestrator logs `{"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}` to `orchestrator_run_log` and proceeds to Phase A.6 without halting — not a HALT code but a structured outcome entry (symmetric with A.3.5's `skipped_tdd_false`). Audit artifact at `PRPs/reports/<feature>/orchestrator-run.json`. TDD routing (B7/B8) shipped v0.10.0. Composes: `/relay-plan → /relay-plan-review → /relay-worktree → /relay-write-test → /relay-test-write-review → /relay-implement → /relay-code-review → /relay-test → /relay-test-review`. |

#### QA / Support (human validation gate)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-qa-report [<prd-path> \| <plan-path> \| <description>]` (blank = uncommitted diff) ✅ **implemented** | Four-way argument router: a `.prd.md` path enters PRD mode (cases derived from the PRD Acceptance Criteria); a `.plan.md` path enters plan mode (cases derived from the plan's Step-by-Step Tasks + Validation Commands); non-empty free text enters description mode (cases derived from the uncommitted diff read through the description, or from the description itself on a clean tree); blank enters diff mode (cases derived from `git status --porcelain` + `git diff` on the current branch; a clean tree HALTs with `FAILED_NOTHING_TO_REPORT` and writes no file). | `PRPs/reports/<feature>/qa-report.md` — one entry per case carrying all seven fields (title, risk level, required state, coverage, automated test path, manual status defaulting to `pending`, manual step-by-step); uncovered cases are listed explicitly, never omitted. Single LLM-judgment command with NO writer/reviewer pair; never invoked by `/relay-execute`; an anti-overwrite HALT guards an existing report. See `PRPs/prds/relay-qa-report-command.prd.md`. |

#### Design system (Figma track)

Standalone, human-triggered commands for the opt-in Figma Implementation
Track. All three are gated behind `figma_track: true` in the target
project's `docs/context/methodology.md`; none is ever invoked by
`/relay-execute`. When `figma_track` is absent or `false`, none of these
commands' effects appear anywhere in a project's output — see
`docs/decisions.md` [2026-07-23] and `docs/anti-patterns.md`'s "Flipping
`figma_track` ... by heuristic" entry.

| Command | Input | Output |
|---------|-------|--------|
| `/relay-design-map [--refresh]` ✅ **implemented** (`figma_track: true` gate) | No required argument; optional `--refresh` selects an additive re-scan. Reads `docs/context/design-system.md`. | `docs/design/component-map.md` with status `APPROVED` — a versioned, human-curatable Figma-to-code component map (`## Conventions`, `## Components`, `## UNMAPPED`). All Figma MCP querying happens in this command's own session, never inside a dispatched agent (`docs/decisions.md` 2026-07-22). Dispatches the `design-map-writer`/`design-map-reviewer` pair in a bounded `max_map_review_retries=2` loop. On explicit human confirmation only, a single `Edit` flips `figma_track: true` in `docs/context/methodology.md` — the one sanctioned non-heuristic path to set that key. Figma Implementation Track Phase 3. |
| `/relay-design-spec <figma-url> [feature-or-description]` ✅ **implemented** (`figma_track: true` gate) | A Figma design URL plus optional free text naming the feature. Reads `docs/design/component-map.md` when present (absence is a documented degraded mode). | `PRPs/designs/<feature>/design-spec.md` with status `APPROVED` only after the user's own explicit affirmative reply. Inline-adopts `design-spec-writer`/`design-spec-reviewer` directly in the main conversation (mirrors `/relay-prd`'s bundling, never `Task`-dispatched), performing all Figma MCP querying itself. Figma Implementation Track Phase 4. |
| `/relay-visual-review <plan-path>` ✅ **implemented** (`figma_track: true` gate) | A plan whose `## Metadata` carries `design_source: figma`, ending `*Status: APPROVED*` or `*Status: IMPLEMENTED*`. Resolves the referenced APPROVED Design Spec at `PRPs/designs/<feature>/design-spec.md`. | Single-shot standalone dispatch of the `visual-verifier` agent (`attempt: 1` sentinel, mirroring `/relay-code-review`'s dispatch shape) — surfaces `VISUAL_VERIFIED` / `VISUAL_DEGRADED` / `VISUAL_MISMATCH` plus the `fidelity-report.json` path. Performs zero D8 mutations and never edits application source; structurally identical, non-mutating, single-shot standalone command, mirroring `/relay-code-review`'s shape exactly. Figma Implementation Track Phase 7. |

#### Figma Visual-First Track

A sibling, dependent track to the Design system (Figma track) commands
above — reachable only once `figma_track: true` AND `visual_first: true`
are both declared. Never invoked by `/relay-execute`.

| Command | Input | Output |
|---------|-------|--------|
| `/relay-visual-approve <feature>` ✅ **implemented** (`visual_first_approval: human` gate) | A feature name identifying the single unresolved `AWAITING_VISUAL_APPROVAL` halt to locate. | A recorded approve/reject decision via a single `Edit` on the paused phase's `halt.json` plus an appended audit `visual-approval.jsonl` line. Three HALT codes: `FAILED_NOTHING_TO_APPROVE`, `FAILED_MULTIPLE_PENDING_APPROVALS`, `FAILED_PLAN_AMBIGUOUS`. Never invoked by `/relay-execute`. Figma Visual-First Track Phase 6. |

#### Pillar 3 (commit + PR + approval cycle)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-commit [feature-name \| target description]` ✅ **implemented** | **Worktree mode:** an argument naming an existing `.worktrees/<arg>/` on branch `feature/<arg>` with uncommitted changes. **Current-branch mode:** no argument, or an argument that does not match a worktree (treated as a target description), against the current repo/branch. | local git commit (no push). **Phase 0 routing:** existing `.worktrees/<arg>/` → worktree mode; otherwise current-branch mode (argument is a target description — no HALT). **Worktree mode:** branch check (`FAILED_WRONG_BRANCH` showing actual vs expected); idempotency via `git status --porcelain` (clean → exit 0); message from `PRPs/reports/<arg>/orchestrator-run.json` + PRD title (fallback `feat(<arg>): implement via relay`); `git -C .worktrees/<arg>/ add -A` + commit; points to `/relay-pr`. Deterministic, non-interactive. **Current-branch mode:** reviews the diff, interprets the target description to scope staging, flags likely-unwanted files (secrets, build artifacts, editor cruft, debug scaffolding) and asks the operator to exclude / commit anyway / abort, then writes a conventional-commit message inferred from the staged diff and commits on the current branch. Both modes: pre-commit hooks run; `--no-verify` never passed; no push, no network. See `plugins/relay/commands/relay-commit.md`. |
| `/relay-pr <feature-name>` ✅ **implemented** | worktree with a committed branch (produced by `/relay-commit`) + green tests + all reviews `APPROVED` | branch pushed to origin (if not already) + PR opened via `gh pr create` + `PRPs/reports/<feature>/final-report.md`. Phase 0 validates worktree existence (`FAILED_MISSING_WORKTREE`), branch (`FAILED_WRONG_BRANCH`), and clean tree (`FAILED_UNCOMMITTED_CHANGES` → run `/relay-commit`). Framework-conditional test-review gate (`FAILED_TEST_REVIEW_NOT_APPROVED` when `run.json` exists without an APPROVED `test-review.json`; graceful skip otherwise). Non-forced push only when local is ahead of remote (`FAILED_BRANCH_DIVERGENCE` on non-fast-forward; never `--force`). Idempotent existing-PR detection via `gh pr list --head ... --json url`. `final-report.md` (redacted) as `--body-file` when test artifacts exist; minimal body otherwise. `--draft` and `--base <ref>` flags; `pr_url` write-back to `orchestrator-run.json` (best-effort). See `plugins/relay/commands/relay-pr.md`. |
| `/relay-approve <pr>` ✅ **implemented** | PR number or URL | merge PR via `gh pr merge --merge`; delete branch + worktree in collision-safe order; dispatch Docs Updater then Docs Reviewer; commit `docs/` updates on the base branch (`docs(<feature>): sync knowledge base post-merge`). Supports `--strategy merge|squash|rebase`, `--admin`, `--force`, `--no-docs`. The docs cycle self-skips when `docs_sync: false` in `docs/context/methodology.md` (the same master switch shared with the implement-time dispatch); when it runs, it is idempotent against a worktree already synced at implement time — see `docs/context/architecture.md`. 8 HALT codes. See `plugins/relay/commands/relay-approve.md`. |

### Preconditions

Each command validates its input on entry and fails loud with an
actionable message if a precondition is unmet:

- Review commands require the target artifact to exist with the expected
  status in its frontmatter.
- `/relay-implement` requires plan `APPROVED` and a checked-out worktree.
- `/relay-test` requires worktree commits to exist.
- `/relay-pr` requires the last `/relay-test-review` to have returned
  `APPROVED`.

Running out of order always fails with a clear message rather than with
undefined behavior.

### Artifact paths

All command outputs land under `PRPs/` at the target-repo root (NEVER under
`.claude/` — see `docs/anti-patterns.md`):

- `PRPs/prds/<feature>.prd.md`
- `PRPs/plans/<feature>.plan.md`
- `PRPs/reports/<feature>/` (execution reports, attempts log, per-attempt diffs, final report; TDD initial suite diff and reviews when applicable)

Worktrees live at `.worktrees/<feature>/` relative to the target repo root.

## Agents

Relay's agents correspond one-to-one with the commands above (each writer
and reviewer pair is an agent pair). Exact agent names, models, and
prompts are designed during Phase 2/3 implementation.

### Implemented

| Agent | Path | Invoked by | Role |
|-------|------|------------|------|
| `test-runner` ✅ | `plugins/relay/agents/test-runner.md` | `/relay-test` command | Per-attempt: run the suite, normalize output via `plugins/relay/scripts/normalize-test-output.mjs`, classify failures (B3: `infra` / `flaky` / `legitimate`), return a structured verdict (`GREEN` / `RETRY_NEEDED` / `RETRY_FLAKY` / `ABORT_INFRA` / `ABORT_TIME`). Never loops, never edits code. |
| `post-green-reviewer` ✅ | `plugins/relay/agents/post-green-reviewer.md` | `/relay-test-review` command | Given a GREEN `run.json`, diffs changed test files against the base branch and flags weakening: removed tests, added skips, trivial assertions, coverage drop >5% (when baseline is available). Returns `APPROVED` or `CHANGES_REQUESTED` with concerns. Never modifies code, never re-runs tests. |
| `prd-writer` ✅ | `plugins/relay/agents/prd-writer.md` | `/relay-prd` command | Drives the interactive 6-phase PRD authoring flow with the user (Initiate → Foundation → Grounding → Deep Dive → optional re-grounding → Decisions → Generate), invokes `research-web` + `research-codebase` during GROUNDING, consults Decision Gate sources, writes the DRAFT to `PRPs/prds/<kebab>.prd.md`. Never approves its own output. |
| `prd-reviewer` ✅ | `plugins/relay/agents/prd-reviewer.md` | `/relay-prd` command (Phase B) | Validates the DRAFT against the 7-item structural rubric (Decision Gate, sections, no-TBD, AC observability, TDD routing, no-`.claude/`, Implementation Phases). Dialogs the user — small edits applied inline via `Edit`, structural defects routed back to `prd-writer` via `Task`. Owns the DRAFT→APPROVED flip after rubric pass + explicit user approval. Logs every verdict to `PRPs/prds/<basename>.review.jsonl`. |
| `research-web` ✅ | `plugins/relay/agents/research-web.md` | `prd-writer` (Phase 3 GROUNDING; reusable by future relay agents) | Bounded market-context web research. Tool allowlist: `WebSearch`, `WebFetch`. Caps: 4 searches, 10 fetches, 8 findings. Returns a JSON block `{ findings: [{title, summary, evidence, source}], gaps, degradation_reason?, scope_cap_reached? }`. Read-only; never edits files. |
| `research-codebase` ✅ | `plugins/relay/agents/research-codebase.md` | `prd-writer` (Phase 3 GROUNDING; reusable by future relay agents) | Bounded local-codebase research via `Glob`, `Grep`, `Read`. Caps: 5 ops, 25 files, 8 findings. Same JSON return shape as `research-web` but with `path:line` sources. Read-only; never modifies files. |
| `implementer` ✅ | `plugins/relay/agents/implementer.md` | `/relay-implement` command (internal dispatch per attempt) | Autonomous plan-driven code writer. Tools: `Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash` (no `Task` — re-grounding forbidden; the plan is the source of truth per D11). Reads plan + source PRD + methodology; executes Step-by-Step Tasks via `Edit`/`Write` directly in the working tree (state accumulates per D6); runs Validation Commands Levels 1–3 after all tasks complete; emits `IMPLEMENTATION_COMPLETE` (with files_changed + validation results) or `TEST_CONTRACT_DISPUTE` (with structured evidence — Layer 1 of D9 escape valve). Color: green. |
| `code-reviewer` ✅ | `plugins/relay/agents/code-reviewer.md` | `/relay-implement` command (internal dispatch per attempt) + `/relay-code-review` command (standalone) | Three-layer rubric runner: structural (R-S1/R-S2/R-S3 — every Step-by-Step Task addressed; every Files-to-Change row touched; every plan AC-A satisfied) + static (R-L1/R-L2/R-L3 — Levels 1–2 of plan's Validation Commands) + semantic (R-SEM — business-rule consistency, bugs, security gaps) + universal R-X test-modification guard (D9 Layer 0; fires when diff modifies test files without an upheld TEST_CONTRACT_DISPUTE). Plus additive R-COH-* coherence layer in standard mode (shipped via reviewer-coherence-layer Phase 3). Standard mode + arbitration mode (resolves disputes with `DISPUTE_REJECTED`/`DISPUTE_UPHELD_TEST_WRONG`/`DISPUTE_UPHELD_PRD_AMBIGUOUS`). Tools: `Read, Write, Glob, Grep, Bash, BashOutput, Task` (no `Edit` — D11 read-only invariant; `Write` only for code-review.jsonl). Color: magenta. |
| `docs-updater` ✅ | `plugins/relay/agents/docs-updater.md` | `/relay-implement` command (Phase A.3.5, immediately after code-review `APPROVED`, non-interactive, working-tree `diff.patch`) AND `/relay-approve` command (post-merge, before `docs-reviewer`, safety-net pass) | WRITER — dispatched twice: Pillar 2 (implement-time, primary) and Pillar 3 (approve-time, safety net). Diff source is per-invocation: implement-time consumes the working-tree/attempt `diff.patch` (`diff_source: worktree`, explicit `feature`/`prd_path`); approve-time consumes `gh pr diff <pr>` from the merged PR. Either way it compares the change set against the `docs/` knowledge base, makes surgical additive-only updates mirroring the context-builder `*update` PRESERVE-ENTIRELY rules, and writes `PRPs/reports/<feature>/docs-update.md` ending `*Status: DRAFT*`. Scoped to `docs/context/` and `docs/domain/` only — never touches `documentation/` HTML site. Tools: `Read, Write, Edit, Glob, Grep, Bash`. |
| `docs-reviewer` ✅ | `plugins/relay/agents/docs-reviewer.md` | `/relay-implement` command (Phase A.3.5, immediately after code-review `APPROVED`, non-interactive, working-tree `diff.patch`) AND `/relay-approve` command (post-merge, immediately after `docs-updater`, safety-net pass) | REVIEWER — dispatched twice: Pillar 2 (implement-time, primary) and Pillar 3 (approve-time, safety net). Validates the Docs Updater's `docs-update.md` manifest and `docs/` edits against an 8-item rubric (D-R1–D-R8: diff-traceability, PRESERVE-ENTIRELY, no fabricated decisions, no plugin-default injection, no `.claude/` writes, `documentation/` untouched, KNOWLEDGE_BASE index consistency, manifest well-formedness). Appends every verdict to `PRPs/reports/<feature>/docs-review.jsonl`. Owns the `*Status: DRAFT*`→`*Status: APPROVED*` flip on rubric pass. Emits `APPROVED` or `CHANGES_REQUESTED`. Tools: `Read, Edit, Write, Glob, Grep, Bash`. |
| `design-map-writer` ✅ | `plugins/relay/agents/design-map-writer.md` | `/relay-design-map` command (Phase C, per attempt; `figma_track: true` gate) | Reads a persisted Figma evidence bundle (`PRPs/reports/design-map/evidence/`) plus the target project's local design-system clone, matches every Figma component to a real code component (`CONFIRMED` / `INFERRED` / routed to `## UNMAPPED` with a reason), assigns stable `CM-<n>` ids, and writes `docs/design/component-map.md` conforming to `plugins/relay/resources/component-map-template.md`, trailing `*Status: DRAFT*`. MCP-free — no `Bash`, no MCP tool access; never approves its own output. Tools: `Read, Write, Edit, Glob, Grep`. Color: orange. Figma Implementation Track Phase 3. |
| `design-map-reviewer` ✅ | `plugins/relay/agents/design-map-reviewer.md` | `/relay-design-map` command (Phase C, after `design-map-writer`; `figma_track: true` gate) | Validates a DRAFT `component-map.md` against a six-item rubric (`R-DM1` import-path resolution, `R-DM2` evidence cross-reference, `R-DM3` prop/variant existence, `R-DM4` no duplicate ids, `R-DM5` honest `inventory_truncated` scoping, `R-DM6` non-empty `## Conventions`) with no short-circuit; auto-flips `*Status: DRAFT*` → `*Status: APPROVED*` on full pass. MCP-free. Tools: `Read, Edit, Write`. Color: cyan. Figma Implementation Track Phase 3. |
| `design-spec-writer` ✅ | `plugins/relay/agents/design-spec-writer.md` | `/relay-design-spec` command (Phase A) — inline-adopted directly in the main conversation, never `Task`-dispatched; `figma_track: true` gate | Restates the confirmed Figma URL + scope and waits for the user; traverses the design directly via Figma MCP calls in this session (node-scoped `get_metadata`, chunked persist-then-discard `get_design_context`, `get_variable_defs`, per-frame `get_screenshot`; `max_figma_nodes=20`); classifies every subtree `REUSE` / `NEW` / `AMBIGUOUS` against the component map; writes `PRPs/designs/<feature>/design-spec.md` DRAFT. Tools: `Read, Write, Edit, Glob, Grep`. Color: blue. Figma Implementation Track Phase 4. |
| `design-spec-reviewer` ✅ | `plugins/relay/agents/design-spec-reviewer.md` | `/relay-design-spec` command (Phase B, `invocation_context: main`) — inline-adopted, never `Task`-dispatched; `figma_track: true` gate | Validates a DRAFT `design-spec.md` against a seven-item `R-DS1`–`R-DS7` rubric, MCP-free; on full pass asks the user directly "Aprovar o Design Spec?" and flips `*Status: DRAFT*` → `*Status: APPROVED*` only after the user's own explicit affirmative reply — the second place in relay (after `prd-reviewer`) where a reviewer dialogues with the user before flipping status. Tools: `Read, Edit, Write`. Color: teal. Figma Implementation Track Phase 4. |
| `research-design` ✅ | `plugins/relay/agents/research-design.md` | `plan-writer` (Phase 2 GROUNDING) — a conditional third parallel `Task` call alongside `research-codebase`/`research-web`, dispatched only when a `design_spec_path` is available (`design_source: figma`); `figma_track: true` gate | Cross-checks every `CM-<n>` id a Design Spec's `## Component Mapping` cites against `docs/design/component-map.md`, verifies the import path still resolves in the design-system clone, flags stale mappings, and harvests real usage snippets for the plan's own Patterns to Mirror section. Text-only; never queries the Figma MCP; never reads image files. Tools: `Read, Glob, Grep`. Color: purple. Figma Implementation Track Phase 5. |
| `visual-verifier` ✅ | `plugins/relay/agents/visual-verifier.md` | `/relay-implement` command (Phase A.3.4, immediately after code-review `APPROVED`, never on an arbitration-mode verdict) AND `/relay-visual-review` command (standalone, single-shot, `attempt: 1` sentinel); `figma_track: true` gate | Given a plan's `## Design Source` table and the referenced APPROVED Design Spec, orchestrates the self-contained `plugins/relay/scripts/visual/` tooling (provision → capture → compare), classifies every frame, performs content-vs-style triage on `FAIL` frames before ever returning `VISUAL_MISMATCH`, and returns `VISUAL_VERIFIED` / `VISUAL_DEGRADED` / `VISUAL_MISMATCH` plus the `fidelity-report.json` path. Degrades gracefully (`DEGRADED_STATIC_ONLY` / `DEGRADED_PROVISION_FAILED`) rather than blocking delivery; never edits application code; never queries the Figma MCP. Tools: `Read, Write, Glob, Grep, Bash, BashOutput, KillBash`. Color: cyan. Figma Implementation Track Phase 6 (dispatcher extended in Phase 7). |

### Planned

All planned agents have now shipped. The PRD Authoring pair (PRD Writer + PRD Reviewer + the two research
subagents) shipped in v0.6.0. The Plan Authoring pair (Plan Writer +
Plan Reviewer) shipped in v0.7.0. The Implementation Authoring pair
(Implementer + Code Reviewer + `/relay-implement` + `/relay-code-review`)
shipped in v0.8.0. The `/relay-execute` orchestrator shipped in v0.9.0.
The test pair (`test-writer` + `test-reviewer`, formerly `tdd-writer`/`tdd-reviewer`) shipped in v0.10.0; universalized to both test-first and test-after ordering with full test lifecycle in v0.19.0.
The Pillar 3 commands shipped v0.14.0–v0.17.0; the Docs Updater + Docs
Reviewer agents shipped in v0.17.0 completing Phase 4.

## Hooks (planned)

No hooks are declared yet (no `plugins/relay/hooks/hooks.json`). Planned
wiring described in `docs/planning/planejamento_fase_2.docx` §7.3 (C2).
