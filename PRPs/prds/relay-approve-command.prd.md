# /relay-approve Command + Docs Updater / Docs Reviewer Agents (Pillar 3 Close-Out)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (new command + two new agents); architectural decision (Pillar 3 close-out; interactivity-boundary extension); component creation/reuse (writer/reviewer pair)
- Decisions found:
  - [2026-05-18] Pillar 3 three-command split — `/relay-approve <pr>` = merge + delete branch/worktree + run Docs Updater + Docs Reviewer (placeholder, Phase 4)
  - [2026-05-18] Pillar 2/3 boundary — `/relay-approve` runs the docs-update cycle and deletes branch + worktree post-merge; `/relay-execute` never commits or opens a PR
  - [2026-04-19] Phased rollout — Phase 4 (Approval) = merge + docs updater
  - [2026-04-19] Command surface — one command per stage, writer/reviewer split
  - [2026-05-11 D1/D2/D6] `.worktrees/<feature>/` path + shell-out `git worktree add`; `relay-worktree.md:368` explicitly defers `git worktree remove` + branch deletion to `/relay-approve`
  - [2026-04-30] D8 post-approval mutations are best-effort atomic with a rollback note (model for post-merge cleanup partial-failure capture)
  - [2026-04-30] `plan-reviewer` owns the DRAFT→APPROVED flip + `.jsonl` verdict log (model for the Docs Reviewer)
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" (Areas affected cites the Docs Updater) — every artifact lands under `PRPs/`, never `.claude/`
  - "Injecting plugin defaults into the target project's `decisions.md`" (Areas affected cites the future Docs Updater) — the Docs Updater records only project-derived decisions, never relay's own plugin defaults
- Applicable architectural rules:
  - Interactivity boundary (PRD interactive, downstream autonomous) — `/relay-approve` is deterministic/autonomous; the Docs Updater/Reviewer pair MAY reopen dialogue post-merge (a conscious, recorded extension of the boundary)
  - PRP artifacts under `PRPs/` at the repo root
  - context-builder `*update` PRESERVE-ENTIRELY semantics (the Docs Updater mirrors them)
  - Writer/reviewer split for agent pairs; reviewer owns the status flip
- Result: PROCEED
```

## Problem Statement

The relay Pillar 3 lifecycle (`commit → push → PR → merge → docs`) stops at `/relay-pr`: after a PR is reviewed and ready to merge, the operator must manually merge it, delete the feature branch and its `.worktrees/<feature>/`, and update the knowledge base under `docs/` to reflect what shipped. There is no `/relay-approve` command and no Docs Updater / Docs Reviewer agent — only placeholders. The cost of not solving it: the post-merge docs sync (which `docs/decisions.md` and `docs/anti-patterns.md` already promise via their "Atualizado pelo Docs Updater após cada aprovação" headers) is skipped or done by hand, the knowledge base drifts from the code, and orphaned worktrees and branches accumulate.

## Evidence

- `relay-worktree.md:368` already assigns ownership: "/relay-approve owns `git worktree remove` + branch deletion post-merge. Never call `git worktree remove` from this command." Cleanup has no other home.
- `relay-pr.md:428-430` lists "Merge the PR", "Delete branches or worktrees", and "Run Docs Updater or Docs Reviewer" as explicitly out of its scope — "owned by `/relay-approve`".
- `docs/decisions.md` (2026-05-18) and `docs/api-reference.md:124` ("Docs Updater, Docs Reviewer — to be written during Phase 4") record the command and both agents as the planned, unbuilt remainder of Phase 4.
- `docs/decisions.md` and `docs/anti-patterns.md` headers state "Atualizado pelo Docs Updater após cada aprovação de implementação" — a contract no agent currently fulfills.
- `docs/domain/flows.md:73`: "A Docs Updater agent compares what was implemented against the existing `docs/context/` and `docs/domain/` files and updates them accordingly."
- The 2026-06-18 command-count reconciliation confirmed `/relay-approve` is the single remaining placeholder of the 14-command surface (13 implemented).

## Proposed Solution

Ship the full Pillar 3 close-out as one PRD: a deterministic infra command `/relay-approve <pr>` plus the writer/reviewer agent pair it dispatches. `/relay-approve` verifies the project is in a state consistent with the work it will do (Phase 0 preconditions with named HALT codes), merges the PR (`gh pr merge --merge` default; `--strategy` override), deterministically cleans up in the collision-safe order (remove worktree → delete local branch with `git branch -d` → delete remote branch → `git worktree prune`), then dispatches the **Docs Updater** (writer) and **Docs Reviewer** (reviewer) to sync and validate the `docs/` knowledge base against the merged diff, and finally commits + pushes the docs change on the base branch. The command itself carries no LLM judgment — all interpretation lives in the agent pair, which may reopen dialogue with the operator if needed. This approach mirrors the proven `/relay-commit` / `/relay-pr` deterministic-infra shape for the command and the `plan-writer` / `plan-reviewer` shape for the agents, so it composes cleanly with the existing pipeline and is auditable end-to-end.

## Key Hypothesis

We believe a deterministic `/relay-approve <pr>` command that automates merge + cleanup and delegates the docs sync to a Docs Updater / Docs Reviewer pair will close the Pillar 3 lifecycle and keep the knowledge base trustworthy for the relay operator. We'll know we're right when the full chain `/relay-prd → /relay-execute → /relay-commit → /relay-pr → /relay-approve` runs a relay feature to a merged, cleaned-up, docs-synced state with zero manual post-merge steps and no silent failures.

## What We're NOT Building

- **Pre-merge review / approving the PR itself** — the human and GitHub own merge-readiness; `/relay-approve` acts only on a PR the operator has decided to merge.
- **Operating on non-relay PRs** — a PR whose head branch is not `feature/<feature>` is rejected; the command is scoped to relay-produced features with a worktree + `orchestrator-run.json`.
- **Auto-resolving merge conflicts or failed checks** — a non-mergeable PR HALTs; conflict resolution is human work.
- **Syncing the `documentation/` HTML site** — out of scope (OQ-b); the site is maintained by each feature's own release-cut phase per `documentation/AGENTS.md`. The Docs Updater touches the `docs/` knowledge base only.
- **CI/CD integration** — project Phase 5; not this PRD.
- **Auto-fallback to a docs PR on a protected base branch** — registered as a future Could; the MVP HALTs loud with the docs committed locally (OQ-a).

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Post-merge manual steps on the happy path | 0 | Operator runs `/relay-approve <pr>` on a real relay feature PR; no manual merge / cleanup / doc edit is needed afterward |
| Orphaned worktrees or branches after approve | 0 | `git worktree list` + `git branch --list 'feature/*'` show nothing for the approved feature |
| Knowledge-base drift incidents post-merge | 0 across the first 5 approved features | Docs Reviewer returns `APPROVED`; spot-check that `docs/` reflects the merged change |
| Idempotent re-run safety | 100% | Re-invoking `/relay-approve` on an already-approved PR exits 0 with no destructive action |

## Acceptance Criteria (test scenarios)

- **AC-1 Merge + cleanup happy path:** Given a mergeable PR whose head branch is `feature/<feature>` with a clean `.worktrees/<feature>/`, when `/relay-approve <pr>` runs, then the PR is merged via `gh pr merge --merge`, the worktree is removed, the local and remote `feature/<feature>` branches are deleted (`git branch -d` + remote delete), and `git worktree prune` runs — verifiable via `gh pr view <pr> --json state` == `MERGED` and `git worktree list` no longer containing the path.
- **AC-2 Idempotent re-run:** Given a PR already merged with its worktree already removed and branches already deleted, when `/relay-approve <pr>` is re-invoked, then it detects the completed state, performs no destructive action, and exits 0 with a structured "already approved" message (not an error).
- **AC-3 Not-mergeable HALT:** Given a PR whose `mergeStateStatus` is `CONFLICTING` or `BLOCKED`, when `/relay-approve <pr>` runs, then it HALTs with `FAILED_PR_NOT_MERGEABLE` (naming the state) and performs no merge, removal, or deletion.
- **AC-4 Non-relay-feature HALT:** Given a PR whose head branch does not match `feature/*`, when `/relay-approve <pr>` runs, then it HALTs with `FAILED_NOT_A_RELAY_FEATURE` and produces no side effect.
- **AC-5 Dirty-worktree HALT:** Given a `.worktrees/<feature>/` with uncommitted changes, when `/relay-approve <pr>` runs, then it HALTs with `FAILED_UNCOMMITTED_CHANGES` (pointing to `/relay-commit`) before merging, unless `--force` is passed (which routes through `git worktree remove --force` after merge).
- **AC-6 Docs Updater is diff-driven and additive:** Given a merged PR, when the Docs Updater runs, then it reads `gh pr diff <pr>` and the source PRD (via `orchestrator-run.json` `prd_path`), and writes a docs-update manifest at `PRPs/reports/<feature>/docs-update.md` (status `DRAFT`) enumerating every touched file among `docs/context/`, `docs/domain/`, `docs/decisions.md`, `docs/anti-patterns.md`, `CLAUDE.md`, `docs/KNOWLEDGE_BASE.md` with a per-file rationale; no PRESERVE-ENTIRELY file is regenerated wholesale (edits are surgical, verifiable in `git diff`).
- **AC-7 Docs Reviewer flip + log:** Given a docs-update manifest `DRAFT`, when the Docs Reviewer runs and its rubric passes, then it flips the manifest to `*Status: APPROVED*` and appends a verdict object to `PRPs/reports/<feature>/docs-review.jsonl`; on rubric failure it emits `CHANGES_REQUESTED` with the failing rubric item IDs and does NOT flip the manifest.
- **AC-8 Docs commit on base branch:** Given Docs Reviewer `APPROVED`, when `/relay-approve` finalizes, then the command (not the agent) commits the doc changes on the base branch with a `docs(<feature>): ...` conventional-commit message and pushes; `--no-verify` is never passed.
- **AC-9 No `.claude/` writes, no plugin-default injection:** Given the Docs Updater runs against any target project, then it never writes under `.claude/` and never injects relay plugin defaults (e.g. `max_test_retries`, the `tdd: false` default) into the target's `docs/decisions.md`; the Docs Reviewer rubric has dedicated items that fail `CHANGES_REQUESTED` if either occurs.
- **AC-10 Partial-failure is captured, never silent:** Given the merge succeeds but a subsequent cleanup step fails (e.g. a locked worktree), when `/relay-approve` continues, then it records the partial state to `PRPs/reports/<feature>/approve-halt.json` with `{steps_attempted, steps_succeeded, step_failed, error, manual_recovery_steps}` and surfaces an actionable message — no step is swallowed.
- **AC-11 Protected-base docs-push HALT:** Given the base branch rejects the direct docs push (protected branch), when `/relay-approve` attempts the push, then it HALTs with `FAILED_DOCS_PUSH_BLOCKED`, leaves the docs commit intact locally, and prints recovery steps (open a docs PR manually / re-run after adjusting protection).
- **AC-12 Allowlist entries present:** Given this release, then `docs/context/settings-allowlist.md` lists `gh pr merge *`, `git worktree remove *`, `git branch -d *`, and `git push origin --delete feature/*` as allowed patterns, and `/relay-approve` runs them without an interactive permission prompt; `git branch -D*` remains denied.

## Open Questions

- [ ] If a future team runs relay on a repo with a protected base branch, should the deferred auto-docs-PR fallback (OQ-a Could) be promoted to a Must? Revisit after the first protected-base run.
- [ ] Does the Docs Updater need a bounded source-diff size cap (very large merged diffs)? `TBD - needs validation` from dogfood telemetry.
- [ ] Exact `gh pr merge` exit code on an already-merged PR is undocumented upstream (cli/cli) — the command detects merge state via `gh pr view --json state,mergedAt` first rather than relying on the merge exit code. Confirm during Phase 3 implementation.

---

## Users & Context

**Primary User**
- **Who:** The relay operator (single-developer scale today, any team using Pillar 3) closing out a feature after its PR has been reviewed.
- **Current behavior:** Manually runs `gh pr merge`, `git worktree remove`, `git branch -d`, and hand-edits (or forgets) the `docs/` knowledge base.
- **Trigger:** A relay-produced PR has been reviewed and is ready to merge.
- **Success state:** PR merged; branch + worktree gone; `docs/` synced and Docs-Reviewer-`APPROVED`; docs commit pushed on the base branch; working tree clean.

**Job to Be Done**
When a relay feature's PR is approved and ready to merge, I want to run one deterministic command, so I can merge, clean up the branch + worktree, and keep my knowledge base in sync without manual post-merge bookkeeping.

**Non-Users**
Not for arbitrary GitHub PRs unrelated to a relay feature (no `feature/<feature>` branch, no worktree, no `orchestrator-run.json`); not for pre-merge code review (the human and GitHub own that); not for projects without a `docs/` knowledge base (the docs cycle self-skips or warns).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `/relay-approve <pr>` command with Phase 0 state verification + named HALT codes | Deterministic entry point; fails loud on inconsistent state |
| Must | Deterministic merge (`gh pr merge --merge` default; `--strategy` override) | Core action; merge-commit chosen per OQ decision |
| Must | Deterministic cleanup in collision-safe order (worktree remove → `git branch -d` → remote delete → prune) | Avoids the cli/cli #13380 worktree+`--delete-branch` trap |
| Must | Idempotency (already-merged / already-removed → exit 0) | Safe re-runs; no destructive double-action |
| Must | Docs Updater agent (writer) — diff-driven, PRESERVE-aware, manifest `DRAFT` | The "smart" docs sync; scope = `docs/` KB |
| Must | Docs Reviewer agent (reviewer) — rubric, `APPROVED`/`CHANGES_REQUESTED`, `.jsonl`, DRAFT→APPROVED flip | Validates the sync; mirrors `plan-reviewer` |
| Must | Docs commit + push on the base branch by the command | Closes the cycle in one invocation (OQ-b: commit-direct-to-base) |
| Must | New `settings-allowlist.md` entries (`gh pr merge`, `git worktree remove`, `git branch -d`, remote branch delete) | Without them the autonomous run stalls on permission prompts |
| Must | Release cut: flip `/relay-approve` placeholder → implemented across all surfaces + bump `plugin.json` → v0.17.0 | §7.5 binding contract; visibility to installed users |
| Should | `max_docs_review_retries` budget on the Docs Updater↔Reviewer loop | Bounded convergence; symmetric with other review loops |
| Should | Partial-failure capture (`approve-halt.json`) when post-merge cleanup fails | Merge is irreversible; no silent failure (D8 model) |
| Should | `--admin` (branch protection) and `--force` (dirty worktree) flags | Operator escape hatches |
| Should | Write-back of `merged_at` / approve outcome to `orchestrator-run.json` | Audit trail continuity |
| Could | Self-skip the docs cycle when the merged diff touches no doc-relevant surface | Avoids empty manifests on pure-internal changes |
| Could | `--no-docs` flag to skip the docs cycle | Manual override |
| Could | Auto-fallback to a docs PR on a protected base branch | OQ-a deferral |
| Could | Synthetic dogfood of the full chain | Empirical validation |
| Won't | Pre-merge review / approving the PR | Human + GitHub own it |
| Won't | Syncing the `documentation/` HTML site | OQ-b: feature release-cut owns it |
| Won't | CI/CD integration | Project Phase 5 |
| Won't | Auto-resolving merge conflicts | Human work |

### MVP Scope

The entire **Must** set. The user requirement is that, at the end of this PRD's implementation, `/relay-approve` is fully functional with all capabilities, agents, and commands foreseen in the planning — so the MVP is the complete Must list, not a thin slice. **Should** items are included where they are load-bearing for "no silent failure" (partial-failure capture) and bounded autonomy (`max_docs_review_retries`); the rest of Should/Could are post-MVP.

### User Flow

1. Operator has reviewed the PR for a relay feature and decides to merge.
2. Operator runs `/relay-approve <pr>` (PR number or URL).
3. Phase 0 verifies: gh auth, PR exists, head is `feature/<feature>`, worktree clean, PR mergeable, orchestrator-run.json present. Any failure → named HALT, no side effects.
4. Merge: `gh pr merge --merge` (from repo root, not inside the worktree).
5. Cleanup: `git worktree remove` → `git branch -d feature/<feature>` → delete remote branch → `git worktree prune`. Partial failure → `approve-halt.json` + actionable message.
6. Docs cycle: Docs Updater reads `gh pr diff <pr>` + source PRD, writes manifest `DRAFT`; Docs Reviewer validates → `APPROVED` (flip + `.jsonl`) or loops back (bounded). Either agent may ask the operator a question.
7. Docs commit: the command commits `docs(<feature>): sync knowledge base post-merge` on the base branch and pushes. Protected base → `FAILED_DOCS_PUSH_BLOCKED`, commit kept locally.
8. Output: structured summary (merged, cleaned, docs APPROVED + pushed); write-back to `orchestrator-run.json`.

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.

- If **true:** TDD Writer (B7) produces the initial test suite from the Acceptance Criteria section above, before the Implementer runs.
- If **false:** Implementer writes tests alongside the production code; Acceptance Criteria seed those tests.

TDD track inactive — the relay repo is markdown + JSON with `test_frameworks: []`, so the TDD pair self-skips and the Acceptance Criteria above are validated by manual/dogfood exercise of the command and agents, consistent with every prior relay feature (PRD, plan, implementation authoring shipped this way).

### Architecture Notes

- **Deterministic-infra command, no LLM** (mirrors `relay-commit.md` / `relay-pr.md`): Phase 0 preconditions, named HALT codes, `Next:` pointer, non-interactive. All judgment lives in the dispatched agent pair.
- **Cleanup ordering is load-bearing** (research finding, cli/cli #13380): the merge runs from the repo root, then worktree is removed *before* the local branch is deleted (you cannot delete a branch checked out in a worktree); `--delete-branch`'s local cleanup is NOT relied upon. `git worktree prune` is idempotent and safe to re-run.
- **Idempotency via state detection:** `gh pr view <pr> --json state,mergedAt,headRefName` and `git worktree list --porcelain` decide what is already done; each destructive step is guarded.
- **Docs Updater = writer** (`Read, Write, Edit, Glob, Grep, Bash` for `gh pr diff`): mirrors context-builder `*update` PRESERVE-ENTIRELY semantics; writes only under `docs/` + root memory files + the `PRPs/reports/<feature>/docs-update.md` manifest; never `.claude/`; never injects relay plugin defaults into a target `decisions.md`.
- **Docs Reviewer = reviewer** (`Read, Edit, Write, Glob, Grep`, like `plan-reviewer` which has `Edit` for the flip): runs a docs rubric, appends to `docs-review.jsonl`, owns the manifest DRAFT→APPROVED flip.
- **Interactivity-boundary extension:** the post-merge docs cycle may reopen dialogue with the operator — a conscious extension of the "downstream autonomous" rule, recorded in the Decisions Log and to be added to `docs/decisions.md` in Phase 4.
- **Artifacts** under `PRPs/reports/<feature>/`: `docs-update.md` (manifest), `docs-review.jsonl` (verdict log), `approve-halt.json` (partial-failure capture).

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `gh pr merge --delete-branch` worktree trap (cli/cli #13380) leaves partial local state | M | Never use `--delete-branch` local cleanup; merge from repo root; cleanup ordering worktree→branch; explicit remote delete |
| Post-merge cleanup partial failure (merge is irreversible) | M | Best-effort steps + `approve-halt.json` capture + actionable recovery message (D8 model) |
| Docs Updater overwrites human-validated content | M | Mirror context-builder PRESERVE-ENTIRELY; Docs Reviewer rubric items D-R# block regeneration |
| Docs cycle does not converge | L | `max_docs_review_retries` budget + HALT with the last `CHANGES_REQUESTED` |
| Branch protection blocks merge or docs push | M | `FAILED_PR_NOT_MERGEABLE` / `FAILED_DOCS_PUSH_BLOCKED` HALTs; optional `--admin`; docs commit kept local |
| Allowlist gap stalls the autonomous run on a prompt | M | Phase 3 adds the four allowlist patterns to `settings-allowlist.md` |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Docs Updater agent | `plugins/relay/agents/docs-updater.md` — diff-driven (`gh pr diff`) writer; PRESERVE-aware; scope = `docs/` KB + root memory files; writes `PRPs/reports/<feature>/docs-update.md` manifest (`DRAFT`); may dialogue | complete | - | - | PRPs/plans/relay-approve-command-phase-1-docs-updater-agent.plan.md |
| 2 | Docs Reviewer agent | `plugins/relay/agents/docs-reviewer.md` — rubric runner; `APPROVED`/`CHANGES_REQUESTED`; appends `docs-review.jsonl`; owns manifest DRAFT→APPROVED flip; may dialogue | complete | - | 1 | PRPs/plans/relay-approve-command-phase-2-docs-reviewer-agent.plan.md |
| 3 | `/relay-approve` command + allowlist | `plugins/relay/commands/relay-approve.md` — Phase 0 verify → merge → cleanup → dispatch pair → commit+push docs → output; new patterns in `docs/context/settings-allowlist.md` | complete | - | 1, 2 | PRPs/plans/relay-approve-command-phase-3-relay-approve-command-allowlist.plan.md |
| 4 | Governance + docs site + release cut | `docs/decisions.md` entry (approve design + interactivity-boundary extension); `docs/api-reference.md`, `docs/context/architecture.md`; `documentation/` `commands.html` + `agents.html` + `status.html` + `changelog.html`; bump `plugin.json` → v0.17.0 | complete | - | 3 | PRPs/plans/relay-approve-command-phase-4-governance-docs-site-release-cut.plan.md |

### Phase Details

**Phase 1: Docs Updater agent**
- **Goal:** A writer agent that, given a merged PR's diff + source PRD, produces a surgical, PRESERVE-aware update to the `docs/` knowledge base plus a `DRAFT` manifest.
- **Scope:** `plugins/relay/agents/docs-updater.md`; reads `gh pr diff <pr>`, `orchestrator-run.json`, the source PRD, and existing `docs/context/`, `docs/domain/`, `docs/decisions.md`, `docs/anti-patterns.md`, `CLAUDE.md`, `docs/KNOWLEDGE_BASE.md`; writes targeted edits + `PRPs/reports/<feature>/docs-update.md`.
- **Success signal:** Run against a sample merged diff → manifest `DRAFT` enumerates touched files with rationale; no PRESERVE-ENTIRELY file regenerated; no `.claude/` write; no plugin-default injection.

**Phase 2: Docs Reviewer agent**
- **Goal:** A reviewer agent that validates the Docs Updater's edits and owns the manifest status flip.
- **Scope:** `plugins/relay/agents/docs-reviewer.md`; rubric (every changed file reflects a real diff change; PRESERVE not violated; no fabricated decisions; no plugin-default injection; no `.claude/` write; KNOWLEDGE_BASE/index consistency); appends `PRPs/reports/<feature>/docs-review.jsonl`; flips `docs-update.md` DRAFT→APPROVED.
- **Success signal:** Given a `DRAFT` manifest, emits `APPROVED` (flip + log) on a clean update and `CHANGES_REQUESTED` (with IDs, no flip) on a seeded violation.

**Phase 3: `/relay-approve` command + allowlist**
- **Goal:** The deterministic command wiring merge + cleanup + the agent pair + docs commit.
- **Scope:** `plugins/relay/commands/relay-approve.md` (Phase 0 preconditions + HALT codes; merge; cleanup ordering; dispatch Docs Updater→Docs Reviewer with `max_docs_review_retries`; commit+push docs; `approve-halt.json`; output + `orchestrator-run.json` write-back); `--strategy`, `--admin`, `--force`, `--no-docs` flags; `docs/context/settings-allowlist.md` new allow patterns.
- **Success signal:** End-to-end on a synthetic relay PR — merged, cleaned, docs `APPROVED` + pushed; idempotent re-run exits 0; each HALT code reachable.

**Phase 4: Governance + docs site + release cut**
- **Goal:** Make the shipped command visible and documented; record the design decision.
- **Scope:** `docs/decisions.md` (new entry: `/relay-approve` design + Docs Updater/Reviewer + interactivity-boundary extension); `docs/api-reference.md` + `docs/context/architecture.md` (flip placeholder→implemented; count stays 13 implemented but `/relay-approve` moves out of placeholder); `documentation/reference/commands.html` (`/relay-approve` badge→done) + `agents.html` (add both agents) + `roadmap/status.html` (Phase 4 → done) + `changelog.html` (v0.17.0); bump `plugin.json` `0.16.0` → `0.17.0`.
- **Success signal:** Every surface names `/relay-approve` and the two agents as implemented; `plugin.json` == changelog version; counts internally consistent.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Command nature | Deterministic infra, no LLM | Orchestrator with judgment | Matches `/relay-commit` / `/relay-pr`; safe, repeatable; judgment isolated in the agent pair (user directive) |
| Agent packaging | Docs Updater + Docs Reviewer shipped in this PRD | Separate PRDs per agent | User requires `/relay-approve` fully functional at end of this PRD |
| Merge strategy | `gh pr merge --merge` (merge commit) default; `--strategy` override | Squash; rebase | User choice; preserves feature commit history; flag keeps flexibility |
| Docs landing | Command commits + pushes docs on the base branch | Separate docs PR; working-tree only | User choice (OQ-b answer / Q2); closes the cycle in one command |
| Docs diff source | `gh pr diff <pr>` | `git diff base..merge-sha`; gh+local fallback | User choice; authoritative via API; survives worktree removal |
| Reviewer model | Manifest DRAFT→APPROVED + `.jsonl` (mirror `plan-reviewer`) | Lightweight verdict (mirror `post-green-reviewer`) | User choice; auditable; consistent with the pipeline |
| Cleanup ordering | worktree remove → `git branch -d` → remote delete → prune; merge from repo root | `gh pr merge --delete-branch` from worktree | Avoids cli/cli #13380 partial-failure trap (research) |
| Protected-base docs push | HALT `FAILED_DOCS_PUSH_BLOCKED`, commit kept local | Auto-fallback to docs PR; adaptive detection | User choice (OQ-a); deterministic, no hidden behavior; auto-PR deferred to Could |
| Docs Updater scope | `docs/` KB only (context/domain/decisions/anti-patterns + CLAUDE.md/KNOWLEDGE_BASE.md) | Also `documentation/` HTML site; conditional | User choice (OQ-b); generic across targets; site owned by feature release-cut per AGENTS.md |
| Interactivity boundary | Command autonomous; Docs Updater/Reviewer MAY dialogue post-merge | Fully autonomous; fully interactive | User directive; recorded as a conscious extension of the 2026-04-19 boundary decision |
| Partial-failure handling | Best-effort + `approve-halt.json` capture | Transactional rollback (WAL) | Mirrors 2026-04-30 D8; merge is irreversible; manual recovery documented |

---

## Research Summary

**Market Context**
- `gh pr merge` exposes `--merge` / `--squash` / `--rebase` (mutually exclusive) and `--admin` to bypass branch protection; the official manual does not document exit codes for an already-merged PR, so state must be detected via `gh pr view --json state,mergedAt` (source: cli.github.com/manual/gh_pr_merge; cli/cli #13345).
- `gh pr merge --delete-branch` run from inside a linked worktree fails local cleanup with `fatal: <base> is already used by worktree` — the PR merges remotely but the local branch is not deleted, a partial-failure state (source: cli/cli #13380, #9073). Drives the "merge from repo root; don't rely on `--delete-branch` local cleanup" decision.
- `git worktree remove` refuses dirty worktrees (one `--force` to override; two to remove a locked worktree); `git worktree prune` is non-destructive and safe to re-run; a branch checked out in a worktree cannot be deleted, so the worktree must be removed before `git branch -d` (source: git-scm.com/docs/git-worktree).
- `git branch -d` refuses unmerged branches (safe); `git branch -D` force-deletes — the latter is denied by relay's allowlist, so the design uses `-d` only.

**Technical Context**
- Deterministic-infra command shape is established by `relay-pr.md:17-18` ("no LLM dispatch, no writer/reviewer split, no agent") and `relay-commit.md`; this PRD adopts it for the command and reserves all judgment for the agent pair.
- `relay-worktree.md:368` and `relay-pr.md:428-430` already delegate merge, branch/worktree cleanup, and the Docs Updater/Reviewer dispatch to `/relay-approve` — the command's contract is pre-written by its siblings.
- `orchestrator-run.json` (`relay-execute.md:663-682`) carries `feature`, `prd_path`, and `pr_url`; `<feature>` derives from the PRD basename; `/relay-approve` reads `prd_path` to ground the Docs Updater.
- `plan-reviewer.md:6-86` is the reviewer template (tools `Read, Edit, Write`; `APPROVED`/`CHANGES_REQUESTED`; `.review.jsonl`; two-line `Edit` status flip); `post-green-reviewer.md` is the no-Edit verdict-only contrast. The Docs Reviewer follows `plan-reviewer`.
- context-builder `SKILL.md:475-477` defines PRESERVE-ENTIRELY for `docs/context/*`, `decisions.md`, `anti-patterns.md` (additive-only, never regenerate human-validated content); the Docs Updater mirrors this.
- `settings-allowlist.md:122-138`: `gh pr merge`, `git worktree remove`, `git branch -d`, `git push origin --delete feature/*` are absent from both allow and deny lists; `git branch -D*` is denied; `rm -rf .worktrees/*` is allowed. Phase 3 adds the four missing allow patterns.

---

*Generated: 2026-06-18*
*Approved: 2026-06-18*
*Status: APPROVED*
