# /relay-worktree — isolated git worktree creation for parallel agentic features

```
Decision Gate evidence — PRD authoring for /relay-worktree

Active context: docs/context/architecture.md (relay plugin marketplace; Pillar 2 command surface; PRP artifact paths)
Activated criteria: new command on the 12-command surface; touches /relay-execute D4; cross-cutting change to context-builder; affects target-project .gitignore convention; first relay command that shells out git plumbing
Decisions found:
  - 2026-04-19 Command surface table pins /relay-worktree as infra with output `.worktrees/<feature>/`
  - 2026-04-19 PRP artifacts under PRPs/ at repo root; never .claude/ (working-directory carve-out for .worktrees/ is implicit since it's not a pipeline artifact)
  - 2026-04-25 Plan filenames carry source PRD phase number and slug (slug = PRD basename minus .prd.md)
  - 2026-05-01 /relay-execute D4 graceful degradation: works in cwd against current branch when no worktree set up
  - 2026-04-30 D8 mutations belong to /relay-implement (this command does NOT mutate plans/PRDs)
Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — bypassed by choosing `.worktrees/<feature>/` (sibling), no exception needed
  - "Relying on interactive permission prompts in the autonomous loop" — `.claude/settings.json` allowlist must include `Bash(git worktree add *)` and the bootstrap script invocation pattern
Applicable architectural rules:
  - Writer/reviewer split: /relay-worktree is infra-class (deterministic, no agent, no rubric)
  - Graceful degradation: failures fall through to current cwd behavior (preserves D3/D4 contract)
  - PRP artifact paths convention: worktrees at `.worktrees/<feature>/` relative to repo root
Result: PROCEED
```

## Problem Statement

Relay's autonomous pipeline (`/relay-execute`) cannot run two features in parallel today because every downstream command (`/relay-implement`, `/relay-test`, `/relay-tdd`) operates against the cwd's working tree. Concurrent invocations against the same repository collide on file writes, dev-server ports, container project names, and branch state. The graceful-degradation in `/relay-implement` D3 and `/relay-execute` D4 makes the pipeline functional for single-feature sequential use, but parallelism is structurally blocked — and the absence of a physical boundary means the implementer's `Edit`/`Write` calls can in principle reach any file in the repo, with the rubric-level R-X guard as the only line of defense.

## Evidence

- `/relay-execute` D4 (`PRPs/prds/relay-execute.prd.md:255`) explicitly defers worktree management to a future command: "Graceful degradation: works in cwd against current branch when no worktree set up." The orchestrator's "What you do NOT do" section names the wiring as deferred dead-code at `plugins/relay/commands/relay-execute.md:611`.
- `/relay-implement` D3 (`PRPs/prds/implementation-authoring.prd.md:159`) documents the same fallback as a Should-item, and `plugins/relay/agents/implementer.md:570-572` codifies it as Divergence 1 from prp-core: "Phase 2 PREPARE (git-state) is DROPPED — graceful degradation per D3 means the agent works in the cwd's working tree without assuming a worktree."
- Web research over 2024–2026 practitioner content (Anthropic Claude Code docs, workmux, cwt, Augment Code patterns, pnpm git-worktrees guide) shows that the "one task → one branch → one worktree → one agent" rule has emerged as the de facto agentic-coding boundary. Five workflow archetypes (Solo Agent, Parallel Shop, Hotfix, Reviewer, Ensemble) all assume worktree-per-task as the substrate.
- The Claude Code native `EnterWorktree` tool exists and hardcodes the worktree location to `.claude/worktrees/<name>/`. The hardcoded path is incompatible with the 2026-04-19 surface decision pinning `.worktrees/<feature>/`, and the lifecycle (auto-cleanup on session exit) is misaligned with relay's pipeline lifecycle (worktree must survive until PR merge). Documented as the rationale for shelling out `git worktree add` directly rather than using `EnterWorktree`.
- `docs/anti-patterns.md:60-66` ("Writing pipeline artifacts under `.claude/`") confirms that the `.claude/` permission gate is intentional and has no bypass for autonomous writes. Choosing `.worktrees/<feature>/` (sibling) sidesteps this entirely without requiring an exception entry.

## Proposed Solution

Add `/relay-worktree <feature-name>` as a deterministic infra command (no LLM, no agent, no writer/reviewer split). It shells out `git worktree add .worktrees/<feature>/ -b feature/<feature> <base>` after validating preconditions (cwd is a git repo, branch name available, target path empty or idempotent re-use), then executes the project's `scripts/worktree-bootstrap.sh` (if present, best-effort) to install gitignored config and stack-specific setup. The slug `<feature>` is derived from the PRD basename when invoked by `/relay-execute`, or passed as a free argument when invoked standalone. The command is idempotent: when `.worktrees/<feature>/` already exists with the expected branch, re-use silently; when it exists on a different branch, HALT loud. Cleanup (`git worktree remove` + branch deletion) is owned by the future `/relay-approve` command (Pillar 3) post-merge — this command never removes worktrees. `/relay-execute` evolves to invoke `/relay-worktree` by default; a `--no-worktree` flag preserves the current cwd-based behavior, and any worktree creation failure falls through to the same graceful-degradation per D3/D4.

## Key Hypothesis

We believe a deterministic `/relay-worktree` command will unblock parallel feature execution and establish a physical safety boundary around AI-driven changes for relay-developers running multi-feature autonomous pipelines.

We'll know we're right when (a) two `/relay-execute` invocations against distinct PRDs run concurrently without file/branch/path collision in a single dogfood session, and (b) the implementer's diff (`git diff` against base inside the worktree) contains zero paths outside `.worktrees/<feature>/`.

## What We're NOT Building

- **Worktree cleanup / removal** — out of scope. Pillar 3 (`/relay-approve`) owns the post-merge `git worktree remove` + branch deletion sequence. Users who want manual removal use plain `git worktree remove`.
- **Bootstrap script content generation per stack** — out of scope for MVP. The `context-builder` emits a generic template with TODO markers; teams customize once. We don't try to detect every Docker Compose pattern, every package manager, every env file convention. (Stack detection beyond what `context-builder` already does is a Could-item.)
- **Container orchestration / port allocation** — out of scope. Relay does NOT become a Docker orchestrator. Per-worktree `COMPOSE_PROJECT_NAME` and port offsets are the bootstrap script's responsibility (the project owns its Makefile contract; relay invokes `make test-*` and trusts the contract).
- **Dependency installation (`npm install`, `pip install`, etc.)** — out of scope. Same rationale: bootstrap script delegated to project.
- **Concurrent `/relay-execute` against the same PRD** — out of scope per D18 mitigation in `/relay-implement` and `/relay-execute`; deferred until Pillar 3.
- **`EnterWorktree` native tool integration** — explicitly rejected. The hardcoded `.claude/worktrees/<name>/` path conflicts with the 2026-04-19 surface decision and triggers the `.claude/` permission gate concern; the auto-cleanup-on-session-exit lifecycle conflicts with relay's pipeline-lifecycle (worktree persists until merge).

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Parallel `/relay-execute` runs without collision | 2 concurrent runs complete to "ready for PR" without manual intervention | Synthetic dogfood (Phase 4): author 2 trivial PRDs, run `/relay-execute` on both within 30 seconds of each other, observe both reach completion with disjoint `.worktrees/` dirs and disjoint `feature/*` branches |
| Worktree creation overhead | < 5 seconds for a clean repo on warm filesystem | Time `/relay-worktree` invocation from start to "worktree ready" message; measured during Phase 4 dogfood |
| Implementer diff containment | 100% of file paths in implementer's `git diff` are under the worktree root | Phase 4 dogfood: run `/relay-execute` end-to-end, then `git -C .worktrees/<feature> diff <base> --name-only` and verify no paths escape |
| Graceful-degradation preservation | `/relay-execute --no-worktree` and `/relay-execute` against a non-git directory both still work | Phase 4 dogfood includes a `--no-worktree` invocation and confirms it operates against cwd as today |
| Idempotency on re-invocation | Re-running `/relay-worktree <same-feature>` twice produces zero state change | Phase 4 dogfood includes a double-invocation test |

## Acceptance Criteria (test scenarios)

- **AC-1 PRD-derived slug:** Given a PRD at `PRPs/prds/<feature>.prd.md` and a `/relay-execute` invocation, when `/relay-worktree` is invoked internally with the PRD path in scope, then the worktree is created at `.worktrees/<feature>/` and the branch is named `feature/<feature>` (slug = PRD basename minus `.prd.md`, mirroring `plan-writer.md:167-173` and `relay-execute.md:68`).
- **AC-2 Free-argument slug:** Given a standalone invocation `/relay-worktree my-feature-name`, when the command runs, then the worktree is created at `.worktrees/my-feature-name/` and the branch is `feature/my-feature-name`. The argument is sanitized: lowercase, ASCII, `[a-z0-9-]` only, max 64 chars; characters outside the set are dropped; leading/trailing hyphens stripped. If the result is empty after sanitization, HALT with a clear message.
- **AC-3 Idempotent re-use:** Given `.worktrees/<feature>/` already exists AND its current branch matches `feature/<feature>`, when `/relay-worktree <feature>` is re-invoked, then no git operation runs, the bootstrap script is NOT re-executed, and the command exits with code 0 and message "Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using."
- **AC-4 Branch divergence halt:** Given `.worktrees/<feature>/` exists but is checked out on a branch OTHER than `feature/<feature>`, when `/relay-worktree <feature>` is invoked, then the command HALTs with `FAILED_BRANCH_DIVERGENCE` and message naming both the expected and actual branch, instructing the user to resolve manually or choose a different feature name.
- **AC-5 New branch from base:** Given a clean repo with `feature/<feature>` not present, when `/relay-worktree <feature> --base <ref>` runs, then `git worktree add .worktrees/<feature>/ -b feature/<feature> <ref>` is executed. Default `<ref>` resolves to `origin/main`, falling back to `origin/master`, then to `HEAD` if neither remote ref exists.
- **AC-6 Bootstrap hook execution:** Given the target project has `scripts/worktree-bootstrap.sh` (executable, present at repo root before worktree creation), when `/relay-worktree` succeeds in creating the worktree, then the bootstrap script is invoked as `scripts/worktree-bootstrap.sh <absolute-worktree-path>` with a 60-second timeout. Stdout/stderr are captured into `PRPs/reports/<feature>/worktree-bootstrap.log` with secret redaction applied per `docs/context/redaction-policy.md`.
- **AC-7 Bootstrap failure non-fatal:** Given the bootstrap script exits non-zero OR times out at 60s, when the command would otherwise return success, then the command STILL returns success (worktree creation is the load-bearing outcome), a warning is logged to stdout naming the bootstrap log path, and the exit message says "Worktree created. Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details."
- **AC-8 Bootstrap absent is non-event:** Given `scripts/worktree-bootstrap.sh` does NOT exist at repo root, when the command succeeds in creating the worktree, then it exits success without warning, without logging anything to the bootstrap log path, and without prompting the user.
- **AC-9 Precondition halts:** The command HALTs loud (non-zero exit + actionable message) on any of: cwd is not a git repo (`FAILED_NOT_A_GIT_REPO`); `<base>` ref does not exist locally and `git fetch` returns it not in any remote (`FAILED_BASE_REF_MISSING`); the branch `feature/<feature>` already exists pointing at a different commit than `<base>` (`FAILED_BRANCH_CONFLICT`); the path `.worktrees/<feature>/` exists but is NOT a registered git worktree per `git worktree list` (`FAILED_PATH_OCCUPIED`).
- **AC-10 `.gitignore` evolution by context-builder:** Given a target project where `context-builder *init` runs against a `.gitignore` that does NOT contain `.worktrees/`, when `*init` completes, then `.worktrees/` is auto-appended to `.gitignore` with a comment line `# relay — per-feature worktrees (ephemeral)` immediately above it. Re-runs of `*init` or `*update` on a `.gitignore` that already contains `.worktrees/` are no-ops (no duplicate entry).
- **AC-11 Bootstrap template emission by context-builder:** Given `context-builder *init` runs against a project that does NOT have `scripts/worktree-bootstrap.sh`, when `*init` completes, then `scripts/worktree-bootstrap.sh` is created with shebang `#!/usr/bin/env bash`, executable bit set (`chmod +x` equivalent via Write+post-write or documented manual step on Windows), and body containing the canonical template (env-file replication block, optional Docker Compose project name override block, optional dependency install block — all as commented-out TODO sections the team uncomments per stack). `*update` mode against an already-edited script is a no-op (PRESERVE ENTIRELY per `SKILL.md:861-868`).
- **AC-12 `/relay-execute` D4 live wiring:** Given `/relay-execute <prd-path>` is invoked on a target where `/relay-worktree` is available, when the orchestrator reaches the worktree-creation step (between `/relay-plan-review` and `/relay-tdd`), then it invokes `/relay-worktree <feature>` internally and proceeds with all subsequent stages operating against the worktree path. The `relay-execute.md:611` deferral comment and `relay-execute.md:49` rule bullet are replaced with the live wiring; the dead-code reservation is gone.
- **AC-13 `--no-worktree` opt-out:** Given `/relay-execute <prd-path> --no-worktree` is invoked, when the orchestrator runs, then `/relay-worktree` is NOT invoked and all subsequent stages operate against cwd against the current branch (current graceful-degradation behavior preserved verbatim). The flag is documented in `commands.html` and the api-reference.
- **AC-14 Worktree creation failure → graceful fallback:** Given `/relay-worktree` returns a non-zero exit code during a `/relay-execute` run AND `--no-worktree` was not passed, when the orchestrator catches the failure, then it logs a warning, falls through to cwd-based execution (D3/D4 graceful-degradation), and records the fallback in `orchestrator-run.json` with `worktree_attempted: true, worktree_succeeded: false, fallback_reason: <code>`. The pipeline does NOT halt on worktree failure — only on downstream stage failure.
- **AC-15 Worktree persistence across halt:** Given `/relay-execute` halts mid-pipeline (e.g., `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`), when the orchestrator exits, then the worktree at `.worktrees/<feature>/` and its branch `feature/<feature>` persist on disk and in `git worktree list`. The user can inspect the halt state inside the worktree and re-invoke `/relay-execute` for idempotent resume.
- **AC-16 Parallel non-collision:** Given two distinct PRDs at `PRPs/prds/featureA.prd.md` and `PRPs/prds/featureB.prd.md`, when `/relay-execute` is invoked on both within the same minute (in separate shell sessions), then two worktrees `.worktrees/featureA/` and `.worktrees/featureB/` are created on branches `feature/featureA` and `feature/featureB`, and the two pipelines reach their respective terminal states without any cross-contamination (no shared file edits, no shared branch state). This is the explicit success signal for the Key Hypothesis.

## Open Questions

- [ ] **Windows shell-script execution.** The canonical bootstrap template uses bash (`#!/usr/bin/env bash`). On Windows hosts without WSL or Git Bash in PATH, the bootstrap hook is unreachable. MVP scope: document the requirement; users on pure-PowerShell Windows manually create `scripts/worktree-bootstrap.ps1` and the command tries `.ps1` first then `.sh`. Resolution deferred to Phase 1 implementation.
- [ ] **Bootstrap log redaction reuse.** AC-6 mandates secret redaction on the bootstrap log per `docs/context/redaction-policy.md`. The redaction is implemented today by the Test Runner's stdout-capture path; whether the `/relay-worktree` command reuses that exact code path or duplicates a small inline filter is a Phase 1 implementation question.
- [ ] **Bootstrap timeout default.** AC-6 specifies 60 seconds. Some stacks (large `pnpm install` from cold cache, heavy Docker `compose build`) routinely exceed this. The 60s default may need an override flag (`--bootstrap-timeout <seconds>`). Defer empirical recalibration to post-dogfood telemetry.
- [ ] **Idempotent re-use when the worktree exists but has uncommitted changes.** AC-3 covers the clean case. If `.worktrees/<feature>/` exists on the correct branch BUT has uncommitted changes from a previous halted run, should re-invocation refuse, warn-and-continue, or transparently re-use? MVP default: warn-and-continue (the user's halted work is preserved, the new invocation just adds layers).

---

## Users & Context

**Primary User**
- **Who:** Relay-developer — technical, terminal-first, comfortable with git plumbing. Currently using `/relay-execute` to drive single features end-to-end; wants to start parallelizing.
- **Current behavior:** Invokes `/relay-execute <prd-path>` from the repo root cwd. Pipeline runs against the current branch. To work on a second feature, must wait for the first to finish (or merge), then start the next.
- **Trigger:** User has 2+ approved PRDs queued and wants to start them in parallel; OR a long-running feature is mid-pipeline and the user wants to begin a second one without disturbing the first.
- **Success state:** Two `/relay-execute` invocations running simultaneously in separate shell sessions, each producing its own opened PR (or HALT diagnostic), with zero manual coordination.

**Job to Be Done**
When I have multiple approved PRDs ready for autonomous implementation, I want isolated git worktrees created automatically by the pipeline, so I can run features in parallel without manually managing branches, ports, or file conflicts — and so the AI's changes are physically confined to the feature's worktree.

**Non-Users**
Relay-developers running a single feature sequentially and not needing parallelism. The `--no-worktree` flag preserves their current experience identically; nothing about their flow changes. Also non-users: developers on pure-PowerShell Windows without bash available — the bootstrap hook degrades to no-op for them (worktree still creates, but the bootstrap step is skipped).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `/relay-worktree <feature-name>` command file in `plugins/relay/commands/` | The deliverable; shells out `git worktree add` with idempotency, slug sanitization, branch conflict detection, base-ref resolution |
| Must | PRD-basename slug derivation when invoked from `/relay-execute` | Slug contract uniformity across the relay codebase (plan-writer, relay-execute already use it) |
| Must | Idempotent re-use semantics (AC-3, AC-4) | Re-invocation safety; orchestrator may call `/relay-worktree` multiple times during a long pipeline; halt path divergence |
| Must | `/relay-execute` D4 live wiring + `--no-worktree` flag | Activates the value; preserves the existing graceful-degradation contract for opt-out and creation-failure cases |
| Must | `context-builder *init` auto-writes `.worktrees/` to `.gitignore` (AC-10) | Closes the gap surfaced by codebase research (SKILL.md currently advises but doesn't auto-write); zero-risk single-line append |
| Must | `context-builder *init` emits `scripts/worktree-bootstrap.sh` template (AC-11) | The hook the project customizes; `*update` preserves any team edits per SKILL.md:861-868 PRESERVE rule |
| Must | Bootstrap script execution with timeout + redacted log (AC-6, AC-7) | Bridges relay to the project's stack-specific setup without relay becoming a Docker/dependency orchestrator |
| Should | Cross-OS shell-script support (bash + PowerShell variants) | Windows users without WSL still need a bootstrap path; tries `.ps1` then `.sh` |
| Could | Stack auto-detection in the emitted bootstrap template | The template could ship with specific blocks for Django+React, Phoenix+ExUnit, etc.; deferred until dogfood telemetry reveals which stacks deserve dedicated blocks |
| Could | `--bootstrap-timeout <seconds>` flag | Empirical defaults likely needed for heavy stacks; deferred until usage justifies |
| Won't | `git worktree remove` / cleanup logic | Owned by Pillar 3 (`/relay-approve`) post-merge; introducing it here violates the writer/reviewer split for that command |
| Won't | Docker Compose project-name auto-management | Out of relay's scope; bootstrap script's responsibility |
| Won't | Dependency installation orchestration | Same rationale |
| Won't | `EnterWorktree` native tool integration | Hardcoded path conflicts with surface decision; lifecycle (cleanup-on-session-exit) conflicts with relay's pipeline lifecycle |
| Won't | Pillar 3 `/relay-approve` wiring | Separate PRD when Pillar 3 is designed |

### MVP Scope

Five-phase delivery covering the command itself, the context-builder extension that emits supporting artifacts (`.gitignore` line + bootstrap template), the `/relay-execute` D4 evolution, a synthetic dogfood validating parallel execution, and the docs+manifest release cut. With those, an APPROVED PRD can be driven through `/relay-execute` with automatic worktree isolation, two PRDs can run in parallel, and `--no-worktree` preserves the current sequential flow.

### User Flow

Critical path (autonomous, post-PRD-approval):

1. User runs `/relay-execute PRPs/prds/feature-X.prd.md` in shell session 1.
2. Orchestrator parses `<feature>` = `feature-X`; reaches the worktree-creation step.
3. `/relay-worktree feature-X` is invoked internally. Preconditions pass (cwd is git repo, branch `feature/feature-X` doesn't exist, base ref resolvable, path `.worktrees/feature-X/` empty). Command shells out `git worktree add .worktrees/feature-X/ -b feature/feature-X origin/main`.
4. `scripts/worktree-bootstrap.sh .worktrees/feature-X/` runs (if present); env files copied, deps installed, etc.; exit code captured; log written with redaction.
5. Orchestrator continues with `/relay-tdd`, `/relay-implement`, `/relay-test`, `/relay-code-review`, `/relay-test-review`, `/relay-pr` — all operating against the worktree path.
6. Concurrently, user runs `/relay-execute PRPs/prds/feature-Y.prd.md` in shell session 2. Steps 2–5 repeat with `feature-Y` slug; the two pipelines never touch the same files or branch.
7. PRs open; Pillar 3 (`/relay-approve`) later removes both worktrees + branches post-merge.

Opt-out path: `/relay-execute <prd-path> --no-worktree` → orchestrator skips step 3 entirely; everything runs against cwd as today.

Failure path: step 3 fails (e.g., disk full, permission denied) → orchestrator logs warning, falls through to cwd-based execution per AC-14; pipeline does NOT halt on worktree-creation failure.

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.

- If true: TDD Writer (B7) would produce the initial test suite from the Acceptance Criteria above before the Implementer runs.
- If false (this case): the Implementer writes tests alongside the production code; the Acceptance Criteria seed those tests. The relay repo itself has no test suite (it's markdown + JSON; per methodology.md "This repository has no test suite yet"). Validation for the relay plugin is performed via plan-reviewer rubric + code-reviewer three-layer rubric + the Phase 4 synthetic dogfood; no automated test framework runs against relay's own code.

### Architecture Notes

- **Shell-out, not `EnterWorktree`.** Decision recorded explicitly: relay invokes `git worktree add` via `Bash` rather than using Claude Code's native `EnterWorktree` tool. Two reasons: (a) `EnterWorktree` hardcodes the path to `.claude/worktrees/<name>/`, which conflicts with the 2026-04-19 surface decision pinning `.worktrees/<feature>/` and risks triggering the `.claude/` permission gate documented in `docs/anti-patterns.md`; (b) `EnterWorktree`'s auto-cleanup-on-session-exit lifecycle (per its tool schema) is misaligned with relay's pipeline lifecycle, where the worktree must survive across multiple `/relay-execute` invocations and only be removed by Pillar 3 post-merge. Trade-off: relay loses the native cwd-switching behavior; downstream commands continue to receive worktree path as an argument (current contract).
- **Bootstrap hook contract.** The contract between `/relay-worktree` and the project is a single shell script at `scripts/worktree-bootstrap.sh` (Unix) or `scripts/worktree-bootstrap.ps1` (Windows). The command invokes whichever is present, passing the absolute worktree path as `$1`. The script is project-owned (versioned, code-reviewed by the team once); `context-builder` only emits the initial template on `*init`. This mirrors the pattern already used for `.claude/settings.json` allowlist and `PRPs/redaction-extensions.txt`: relay provides a starter, the team customizes, and `*update` preserves any human-edited content per `SKILL.md:861-868`.
- **Idempotency via `git worktree list` parse.** Detection of "worktree already exists" uses `git worktree list --porcelain` output rather than path-existence check, because path-existence has false positives (a stale directory left after a manual `rm -rf` of the worktree without `git worktree prune` registers as occupied but isn't a real worktree). `git worktree list` is git's authoritative state.
- **No new agent.** This is an infra command; it has no LLM judgment surface. The command file alone (plus the `context-builder` extension) is the entire plugin-side change.
- **Slug derivation reuse.** The `<feature> = basename - .prd.md` transform is already implemented at `plan-writer.md:167-173` and `relay-execute.md:68`; the `/relay-worktree` command duplicates the same regex/parsing logic locally (no shared utility — the codebase has no precedent for shared utilities across commands) to avoid coupling.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Bootstrap script execution differs across shells (bash, zsh, PowerShell, Git Bash on Windows) | M | Restrict the template to POSIX-compatible bash for `.sh` variant; document the requirement in `commands.html`; ship a parallel `.ps1` template only when dogfood telemetry from a Windows-pure project demands it (deferred Could-item) |
| `git worktree list` parse fails on non-English locales (translated git output) | L | Use `--porcelain` flag which is locale-independent; documented in git man page |
| `.gitignore` evolution by `*init` overwrites a deliberately-omitted line if the team excluded `.worktrees/` on purpose | L | `*update` does NOT touch `.gitignore` (preserve-entirely rule per SKILL.md:861-868); only `*init` writes the entry; the team can remove it manually if undesired |
| `--no-worktree` flag is omitted from documentation and users don't discover it | L | Phase 5 docs updates explicitly mention the flag in `commands.html`, `api-reference.md`, and `status.html`; the flag is also surfaced in `/relay-execute --help` output (already part of the existing command's preconditions output) |
| Parallel `/relay-execute` against the SAME PRD races on `Implementation Phases` table mutations | L (single-developer scale) | Pre-existing D18 concern from `/relay-implement` and `/relay-execute`; the new command does NOT introduce this risk (worktrees are per-feature, not per-PRD-phase); same soft-fail diagnostic as today |
| Bootstrap script becomes the load-bearing dependency the user forgets to maintain | M | AC-7 makes bootstrap failure non-fatal; warnings surface in the orchestrator-run.json `worktree_attempted` field; dogfood Phase 4 explicitly tests the "no bootstrap script" path (AC-8) and the "bootstrap fails" path (AC-7) |
| Phase 4 dogfood reveals an unanticipated platform-specific issue (Windows path separators in slug, etc.) | M | Slug sanitization (AC-2) restricts characters to ASCII `[a-z0-9-]`; path construction uses forward slashes (git-native); dogfood Phase 4 runs on the developer's actual host (Windows in this case per the environment context) |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | `/relay-worktree` command file | `plugins/relay/commands/relay-worktree.md` — preconditions (cwd is git repo, branch name available, base ref resolvable, path empty or idempotent), slug derivation (PRD basename or sanitized argument), shell-out `git worktree add .worktrees/<feature>/ -b feature/<feature> <base>`, idempotency via `git worktree list --porcelain` parse, branch-divergence HALT (AC-4), base-ref resolution chain (origin/main → origin/master → HEAD), bootstrap script execution with 60s timeout + redacted log capture (AC-6, AC-7, AC-8). Single file; satisfies AC-1 through AC-9. | complete | yes (with #2) | - | PRPs/plans/completed/relay-worktree-phase-1-relay-worktree-command-file.plan.md |
| 2 | context-builder extension | `plugins/relay/skills/context-builder/SKILL.md` — new Phase N section: auto-write `.worktrees/` line to `.gitignore` during `*init` (AC-10); emit `scripts/worktree-bootstrap.sh` template with shebang, commented-out env-replication / docker-compose / dependency-install TODO blocks during `*init` (AC-11); `*update` is no-op for both artifacts per the existing PRESERVE-ENTIRELY rule at SKILL.md:861-868. Documentation of the new artifacts in the SKILL.md Final Report section. Satisfies AC-10, AC-11. | complete | yes (with #1) | - | PRPs/plans/completed/relay-worktree-phase-2-context-builder-extension.plan.md |
| 3 | `/relay-execute` D4 live wiring | `plugins/relay/commands/relay-execute.md` — replace the dead-code reservation at line 611 with live invocation of `/relay-worktree` between `/relay-plan-review` (Phase A.3) and `/relay-tdd` (Phase A.3.5); evolve the rule bullet at line 49 from "graceful degradation when /relay-worktree absent" to "graceful degradation when /relay-worktree fails OR --no-worktree passed"; add `--no-worktree` flag to the command's argument parser with documented opt-out semantics (AC-13); add the fallback chain on worktree-creation failure (AC-14) with `orchestrator-run.json` schema extension for `worktree_attempted` / `worktree_succeeded` / `fallback_reason` fields. Satisfies AC-12, AC-13, AC-14, AC-15. | complete | - | 1, 2 | PRPs/plans/completed/relay-worktree-phase-3-relay-execute-d4-live-wiring.plan.md |
| 4 | Synthetic dogfood | Author two trivial PRDs (`PRPs/prds/worktree-dogfood-A.prd.md`, `PRPs/prds/worktree-dogfood-B.prd.md`) each with 1 phase ("create a no-op markdown file at `plugins/relay/commands/dogfood/<X>.md`"); run `/relay-execute` on both in parallel (two shell sessions); verify the two worktrees materialize without collision (AC-16); also exercise: AC-3 idempotent re-use, AC-4 branch divergence halt, AC-7 bootstrap failure non-fatal, AC-8 bootstrap absent, AC-13 `--no-worktree`, AC-14 worktree creation failure (synthetic: write-protect `.worktrees/`). Dogfood report at `PRPs/reports/relay-worktree/dogfood.md`. | complete | - | 3 | PRPs/plans/completed/relay-worktree-phase-4-synthetic-dogfood.plan.md |
| 5 | Docs + v0.11.0 release cut | `docs/api-reference.md` (promote `/relay-worktree` to ✅ implemented); `docs/decisions.md` (new 2026-MM-DD entry recording: shell-out over `EnterWorktree` rationale, `.worktrees/<feature>/` path confirmation, bootstrap-hook contract, D3/D4 graceful-degradation preservation, context-builder `.gitignore` auto-write evolution); `docs/context/architecture.md` (PRP artifact paths table grows with `.worktrees/<feature>/` row); `documentation/reference/commands.html` (badge + full kv-block); `documentation/roadmap/status.html` (remove `/relay-worktree` from Pillar 2 pending list); `documentation/changelog.html` (v0.11.0 entry per AGENTS.md §7.5); `plugins/relay/.claude-plugin/plugin.json` (0.10.0 → 0.11.0 bump per §7.5 minor-bump rule). | complete | - | 4 | PRPs/plans/completed/relay-worktree-phase-5-docs-v0-11-0.plan.md |

### Phase Details

**Phase 1: `/relay-worktree` command file**
- **Goal:** ship `plugins/relay/commands/relay-worktree.md` as the deterministic infra command with all 9 first-mile ACs (1–9) satisfied.
- **Scope:** one markdown file matching the relay command frontmatter shape (description, model = sonnet for safety though no LLM is dispatched, color, allowed-tools allowlist including Bash); command-level Decision Gate; Parse arguments (`<feature-name>` optional; `--base <ref>` optional; `--bootstrap-timeout <seconds>` optional Could-item); Preconditions (P1 cwd is git repo via `git rev-parse --show-toplevel`; P2 branch name `feature/<feature>` available; P3 base ref resolvable; P4 path `.worktrees/<feature>/` empty OR registered worktree on expected branch); Phase A creation logic (slug derivation, shell-out, idempotency); Phase B bootstrap hook execution; Final output (success message + path; HALT codes on failure); Constraints (never modify plans, never modify PRDs, never write outside `.worktrees/<feature>/` and `PRPs/reports/<feature>/worktree-bootstrap.log`).
- **Success signal:** the file passes the `plan-reviewer` 8-item structural rubric + R-COH-* coherence layer when its plan is reviewed; manual invocation against a synthetic test repo produces a worktree at the expected path with the expected branch.

**Phase 2: context-builder extension**
- **Goal:** ship the supporting artifacts (`.gitignore` line + `scripts/worktree-bootstrap.sh` template) without breaking existing `context-builder` consumers.
- **Scope:** edit `plugins/relay/skills/context-builder/SKILL.md` to add a new artifact-emission section between the existing `redaction-extensions.txt` emission and the SKILL.md Final Report; specify the `.gitignore` append logic (read existing, check for `.worktrees/`, append with comment line if absent); specify the `scripts/worktree-bootstrap.sh` template content (shebang, CHANGELOG-style comment header naming the source PRD, four commented-out TODO blocks: env replication, Docker Compose project name, dependency install, port allocation); document `*update` no-op behavior; document the chmod step for non-Windows hosts (manual on Windows or fallback `git update-index --chmod=+x`).
- **Success signal:** running `context-builder *init` on a clean target project produces both artifacts at the expected paths with the expected content; running `*update` on a project with team-edited versions of either artifact leaves them unchanged.

**Phase 3: `/relay-execute` D4 live wiring**
- **Goal:** activate the value — `/relay-execute` now creates worktrees by default.
- **Scope:** two surgical Edits in `plugins/relay/commands/relay-execute.md` (lines 49 and 611 per the codebase research findings); add a new Phase A.X step between Phase A.3 (`/relay-plan-review`) and Phase A.3.5 (`/relay-tdd`) for worktree creation; add the `--no-worktree` flag to the argument parser with documented semantics; extend the `orchestrator-run.json` schema with three new fields (`worktree_attempted`, `worktree_succeeded`, `fallback_reason`); add the fallback chain (worktree-creation failure → log warning → continue against cwd).
- **Success signal:** Phase 3's plan passes the plan-reviewer rubric (R8 PRD↔plan traceability against this PRD's row 3); the modified `relay-execute.md` passes a manual `/relay-code-review` pass against the source plan.

**Phase 4: Synthetic dogfood**
- **Goal:** prove parallel execution end-to-end and validate AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16 against real `/relay-execute` runs.
- **Scope:** two trivial 1-phase PRDs authored manually (not through `/relay-prd` — they're test fixtures); run `/relay-execute` on both in two shell sessions opened within 30 seconds of each other; verify the parallel-non-collision Success Metric; run six negative-path scenarios (idempotent re-use, branch divergence, bootstrap failure, bootstrap absent, `--no-worktree`, worktree creation failure via write-protected `.worktrees/`); capture all outcomes in `PRPs/reports/relay-worktree/dogfood.md` with a Cement Decision.
- **Success signal:** the dogfood report documents all 7 scenarios passing; the Cement Decision is PASS; any FPs surfaced lead to Phase 1–3 iteration before Phase 5 cuts the release.

**Phase 5: Docs + v0.11.0 release cut**
- **Goal:** make the capstone visible to readers of the documentation site and the api-reference, and cut the v0.11.0 release with the §7.5 plugin manifest sync.
- **Scope:** edit five docs files + the changelog + the plugin manifest in one commit per the version-sync rule. Promote `/relay-worktree` to ✅ implemented across api-reference and documentation/; remove from the "pending" lists in `status.html`; add the new decision entry to `docs/decisions.md`; bump `plugins/relay/.claude-plugin/plugin.json` from `0.10.0` to `0.11.0`.
- **Success signal:** v0.11.0 changelog entry rendered on the documentation site; `plugin.json` is `0.11.0`; the api-reference shows `/relay-worktree` ✅ implemented; `docs/decisions.md` records the architecture decisions (shell-out vs EnterWorktree; `.worktrees/` path confirmation; bootstrap-hook contract).

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Worktree path (D1) | `.worktrees/<feature>/` (sibling, not under `.claude/`) | `.claude/worktrees/<name>/` (Claude Code native default) | Honors 2026-04-19 surface decision; avoids `.claude/` permission-gate concern documented in `docs/anti-patterns.md:60-66`; no surface decision evolution required |
| Worktree creation primitive (D2) | Shell-out `git worktree add` via `Bash` | `EnterWorktree` native tool | `EnterWorktree` hardcodes path to `.claude/worktrees/<name>/` (D1 conflict) and its auto-cleanup-on-session-exit lifecycle conflicts with relay's pipeline-lifecycle (worktree must persist until Pillar 3 merge). Trade-off acknowledged: relay loses native cwd-switching; downstream commands continue to receive worktree path as argument (existing contract preserved) |
| Slug derivation source (D3) | PRD basename minus `.prd.md` when invoked by `/relay-execute`; sanitized free argument when standalone | Branch name as slug; UUID; timestamp | Mirrors the codebase-wide contract at `plan-writer.md:167-173` and `relay-execute.md:68`; deterministic and predictable; supports both orchestrator-driven and manual invocation |
| Idempotency policy (D4) | Silent re-use when worktree exists on expected branch; HALT loud on branch divergence; numeric-suffix collision rejected | Silent re-use always; suffix on collision | Silent re-use is safe when state matches; suffix would create surprise worktrees the user didn't ask for and break the slug-equality contract `/relay-execute` depends on for resume |
| Cleanup ownership (D5) | Pillar 3 (`/relay-approve`) owns `git worktree remove` + branch deletion post-merge | This command owns cleanup via `--remove` flag; auto-cleanup on success | Cleanup is a state-mutation tied to merge events, not creation events; Pillar 3 is the natural owner per the writer/reviewer split decision (2026-04-19); manual `git worktree remove` remains available for users who want immediate removal |
| Bootstrap hook contract (D6) | Project-owned `scripts/worktree-bootstrap.sh` (Unix) / `.ps1` (Windows); context-builder emits template on `*init`; failure is non-fatal | relay implements bootstrap detection per stack; bootstrap-on-failure halts the command | Delegating to a project-owned script keeps relay out of Docker / dependency orchestration; mirrors the precedent of `.claude/settings.json` allowlist (template + customize); non-fatal failure preserves the worktree as the load-bearing outcome |
| `.gitignore` auto-write (D7) | `context-builder *init` auto-appends `.worktrees/` line with comment | Advisory-only (current `SKILL.md:1090-1106` behavior); manual user edit | Zero-risk single-line append; closes the gap surfaced by codebase research; `*update` PRESERVE-ENTIRELY rule means team edits are never overwritten |
| Worktree-creation-failure handling (D8) | Graceful fallback to cwd per D3/D4 graceful-degradation; pipeline does NOT halt | HALT pipeline; retry creation N times; surface to user for decision | Preserves the existing D3/D4 contract verbatim; worktree is an optimization, not a correctness requirement; halt-on-creation-failure would block users on transient git issues (permission, disk space) the AI cannot resolve autonomously |
| Bootstrap timeout default (D9) | 60 seconds | 30s; 120s; configurable only (no default) | Empirical default for typical small stacks; heavy stacks override via Could-item `--bootstrap-timeout` flag; recalibrate from dogfood telemetry |
| Branch-name pattern (D10) | `feature/<feature>` prefix | `<feature>` alone; `relay/<feature>`; `worktree/<feature>` | `feature/` prefix matches the 2026-04-19 surface decision's stated branch convention and aligns with industry archetype (workmux, claude-worktree, Augment Code all use `feature/` or equivalent) |
| Base ref resolution (D11) | `origin/main` → `origin/master` → `HEAD` fallback chain; `--base <ref>` override | Always `HEAD`; always `origin/main`; require explicit `--base` | Matches the convention surfaced by web research (Claude Code `EnterWorktree` defaults to `origin/HEAD`); `--base` override supports hotfix-style workflows (Archetype C from web research); fallback chain handles repos with non-standard mainline names |

---

## Research Summary

**Market Context**

Web research over 2024–2026 practitioner content surfaced five consolidated workflow archetypes for git worktree use in modern engineering:

- **Solo Agent Per Worktree** (the relay archetype): one task → one branch → one worktree → one agent. Claude Code's `--worktree` flag, Cursor 2.0's multi-agent, and Codex CLI's `--worktree` request all assume this. The relay pipeline's `/relay-execute` against the worktree maps directly.
- **Parallel Feature Shop**: 3–8 agents working concurrently on decomposed subtasks of a larger feature, each in its own worktree. Out of relay's MVP scope but the architecture supports it (two `/relay-execute` invocations in parallel = de facto parallel shop).
- **Hotfix Worktree**: urgent fix without disturbing in-progress work. `/relay-worktree <name> --base origin/production` supports this directly via D11.
- **Reviewer Worktree**: checkout someone else's PR locally for deep review. Out of relay's scope (relay is for writing, not reviewing PRs).
- **Ensemble / Comparative**: N agents try the same problem in parallel; best output selected. Out of relay's scope.

Bootstrapping the worktree for actual work is the consistently-cited hardest unsolved problem. The consolidated answers across workmux, wtp, cwt, claude-worktree, and Augment Code converge on: (a) `.worktreeinclude`-style declarative file (gitignored-file replication), (b) `post_create` hook (project-owned script), and (c) deterministic port allocation (cksum-based offset from branch name). Relay's MVP adopts (b) explicitly via `scripts/worktree-bootstrap.sh`; (a) is replaced by the bootstrap script's env-replication block; (c) is delegated to the bootstrap script as a Could-item TODO block.

Cleanup is universally a developer's responsibility (orphan branches, `git worktree prune` after manual `rm -rf`). Pillar 3's `/relay-approve` will encapsulate the four-step cleanup (`git worktree remove` + `git branch -d` + `git push --delete origin` + `git worktree prune`) when shipped.

Full source list: Anthropic Claude Code docs ([code.claude.com/docs/en/worktrees](https://code.claude.com/docs/en/worktrees)); MindStudio; Upsun; AppXLab; Zylos Research; Augment Code; pnpm git-worktrees guide; workmux; wtp; cwt; lazyworktree.

**Technical Context**

Codebase research (research-codebase subagent, single dispatch) confirmed:

- **Slug-from-PRD-basename is a codebase-wide contract.** Both `plan-writer.md:167-173` and `relay-execute.md:68` apply the `basename - .prd.md` transform; no shared utility exists, each command duplicates the logic locally. `/relay-worktree` follows the same pattern.
- **Slug collision precedent**: `plan-writer.md:182-193` uses numeric suffix (`-2`, `-3`, ...) and never overwrites APPROVED or DRAFT files. For worktrees, the idempotent re-use case differs (D4 above): re-use silently when state matches, HALT loud on divergence. No suffix logic — that would create surprise paths breaking slug-equality.
- **D3/D4 graceful-degradation is load-bearing.** `implementer.md:570-572` codifies "Phase 2 PREPARE (git-state) is DROPPED" as Divergence 1 from prp-core. Phase 3 of this PRD preserves the rule and adds the worktree-presence branch.
- **`.worktrees/` is currently advisory only** in `SKILL.md:1090-1106`; the context-builder does NOT auto-write the `.gitignore` line today. D7 evolves this to auto-write on `*init` (preserve on `*update` per the existing PRESERVE-ENTIRELY rule at `SKILL.md:861-868`).
- **No precedent for shell-script emission from `context-builder`.** All current emitted artifacts are Markdown or JSON. The `scripts/worktree-bootstrap.sh` template is the first executable artifact; shebang, chmod, and cross-OS pattern are defined fresh in Phase 2.
- **Anti-pattern scope unchanged for `.worktrees/` choice.** `docs/anti-patterns.md:65` exception list contains only `.claude/settings.json`; `.worktrees/<feature>/` sits outside `.claude/` entirely, so no exception entry is needed (confirmed in D1 above).
- **Exact lines for Phase 3 surgical Edits**: `plugins/relay/commands/relay-execute.md:611` (the deferral comment) and `plugins/relay/commands/relay-execute.md:49` (the rule bullet). Cirúrgico, low-risk.

Gaps explicitly carried into Open Questions: cross-OS shell-script execution detail (Windows without WSL); bootstrap log redaction reuse path (Test Runner's stdout-capture code vs inline filter); bootstrap timeout default empirical recalibration; uncommitted-changes case in idempotent re-use (D4 covers clean case; the dirty case is an Open Question).

---

*Generated: 2026-05-10*
*Approved: 2026-05-10*
*Status: APPROVED*
