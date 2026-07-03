# Feature: `/relay-approve` command + allowlist (Phase 3 of relay-approve-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (new command file in plugins/relay/commands/); architectural decision (Pillar 3 close-out wiring merge + cleanup + the writer/reviewer pair; interactivity-boundary extension delegated to the agents); component reuse (dispatches the shipped docs-updater + docs-reviewer pair); allowlist surface change (docs/context/settings-allowlist.md)
- Decisions found:
  - [2026-05-18] Pillar 3 three-command split — `/relay-approve <pr>` = merge + delete branch/worktree + run Docs Updater + Docs Reviewer
  - [2026-05-18] Pillar 2/3 boundary — `/relay-approve` runs the docs-update cycle and deletes branch + worktree post-merge; `/relay-execute` never commits or opens a PR
  - [2026-04-30] D8 post-approval mutations are best-effort atomic with a rollback note (the model for post-merge cleanup partial-failure capture → `approve-halt.json`)
  - [2026-04-30] `plan-reviewer` owns the DRAFT→APPROVED flip + `.jsonl` verdict log (the model the docs-reviewer already follows; the command confirms the manifest is APPROVED, never flips it)
  - [2026-05-11 D1/D2/D6] `.worktrees/<feature>/` path + shell-out `git worktree add`; `relay-worktree.md:368` defers `git worktree remove` + branch deletion to `/relay-approve`
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repo root, never under `.claude/`
  - [2026-04-19] Command surface — one command per stage; `/relay-approve` is the last Pillar 3 placeholder being implemented
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — `orchestrator-run.json`, `approve-halt.json`, and the docs manifest/log all live under `PRPs/reports/<feature>/`; the command never writes under `.claude/`
  - "Relying on interactive permission prompts in the autonomous loop" — Phase 3 adds the four allow patterns so the merge + cleanup gh/git calls do not stall on prompts
  - "Injecting plugin defaults into the target project's `decisions.md`" — applies to the dispatched Docs Updater, not the command; the command performs no docs writes itself
- Applicable architectural rules:
  - Interactivity boundary (PRD interactive, downstream autonomous) — `/relay-approve` is deterministic/autonomous and never prompts; the Docs Updater/Reviewer pair MAY reopen dialogue post-merge (the conscious, recorded boundary extension lives in the agents, not in the command)
  - PRP artifacts under `PRPs/` at the repo root
  - Deterministic-infra command shape (no LLM, no writer/reviewer split inside the command) — mirrors `relay-pr.md` / `relay-commit.md`
  - Writer/reviewer split for agent pairs; the reviewer owns the status flip (the command consumes the verdict, never flips the manifest)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-approve-command.prd.md` — Implementation Phases row 3:
  "`/relay-approve` command + allowlist" — Goal: The deterministic command
  wiring merge + cleanup + the agent pair + docs commit. — Success signal:
  End-to-end on a synthetic relay PR — merged, cleaned, docs `APPROVED` +
  pushed; idempotent re-run exits 0; each HALT code reachable.

## Summary

This phase delivers the deterministic infra command
`plugins/relay/commands/relay-approve.md` — the last unbuilt Pillar 3
placeholder — plus four new allow patterns in
`docs/context/settings-allowlist.md`. The command carries no LLM judgment:
it runs a Phase 0 precondition/state-verification block with named `FAILED_*`
HALT codes, merges the PR (`gh pr merge --merge` default, `--strategy`
override), cleans up in the collision-safe order (worktree remove → local
`git branch -d` → remote branch delete → `git worktree prune`), dispatches the
already-shipped **docs-updater** (writer) then **docs-reviewer** (reviewer) via
`Task` inside a `max_docs_review_retries` bounded loop, confirms the manifest
flipped to `*Status: APPROVED*`, commits `docs(<feature>): ...` on the base
branch and pushes, then emits a structured summary and writes back
`merged_at`/outcome to `orchestrator-run.json`. The approach mirrors the
proven `relay-pr.md` / `relay-commit.md` deterministic-infra shape for the
command and reuses the `plan-reviewer`-style writer/reviewer pattern that the
two docs agents already implement, so all judgment stays isolated in the agent
pair and every destructive step is guarded and idempotent.

## User Story

```
As a relay operator who has reviewed a relay feature's PR and decided to merge
I want to run one deterministic `/relay-approve <pr>` command
So that the PR is merged, the branch + worktree are cleaned up, and the docs/
knowledge base is synced + reviewer-APPROVED + pushed — with zero manual
post-merge bookkeeping and no silent failures.
```

## Problem Statement

The relay Pillar 3 lifecycle stops at `/relay-pr`: after a PR is ready to
merge, the operator must manually merge it, delete the feature branch and its
`.worktrees/<feature>/`, and hand-sync the `docs/` knowledge base. Phases 1 and
2 of this PRD shipped the docs-updater and docs-reviewer agents, but nothing
wires merge + cleanup + the agent pair + the docs commit together. Both
`relay-worktree.md:368` and `relay-pr.md:428-430` already delegate merge,
branch/worktree cleanup, and the Docs Updater/Reviewer dispatch to
`/relay-approve` — the contract is pre-written by its siblings, but the command
does not exist, so the post-merge sync is skipped or done by hand and the
knowledge base drifts.

## Solution Statement

Ship the deterministic infra command `plugins/relay/commands/relay-approve.md`
that wires the full close-out: Phase 0 state verification with named HALT codes
→ merge (from the repo root, never `--delete-branch` local cleanup) → cleanup
in the collision-safe order → dispatch docs-updater then docs-reviewer with a
bounded `max_docs_review_retries` loop → confirm manifest APPROVED → commit +
push docs on the base branch → structured output + `orchestrator-run.json`
write-back. Add the four allow patterns (`gh pr merge *`, `git worktree remove
*`, `git branch -d *`, `git push origin --delete feature/*`) to
`settings-allowlist.md` so the autonomous run never stalls on a permission
prompt; `git branch -D*` stays denied. The command never carries LLM judgment —
all docs interpretation lives in the agent pair, which may reopen dialogue.

## Metadata

| Key | Value |
|-----|-------|
| Type | New deterministic infra command + allowlist surface edit |
| Complexity | High (8 named HALT codes; load-bearing cleanup ordering; bounded agent loop; partial-failure capture) |
| Systems Affected | `plugins/relay/commands/` (new command); `docs/context/settings-allowlist.md` (4 allow patterns); reads/dispatches the shipped `docs-updater` + `docs-reviewer` agents; reads/writes `PRPs/reports/<feature>/orchestrator-run.json`, `approve-halt.json`, `docs-update.md`, `docs-review.jsonl` |
| Dependencies | Phases 1 (docs-updater, complete) and 2 (docs-reviewer, complete) |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/relay-approve-command.prd.md` Implementation Phases row 3 (line 191); Phase Details (lines 206-209) |
| phase_type | docs |

> `phase_type: docs` rationale: the `## Files to Change` table contains only a
> Markdown command file (`relay-approve.md`) and a Markdown context file
> (`settings-allowlist.md`) — no application source files. The relay repo has
> `tdd: false` and `test_frameworks: []`, so validation is filesystem/grep
> oriented, not a test-framework invocation. This field is consumed by
> `plan-reviewer` Phase 0 and the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption
> branch; `docs` is the accurate classification for a prompt + config
> deliverable in this repo.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-pr.md` | 1-29, 31-74, 411-436 | Canonical deterministic-infra command shape: frontmatter, "no LLM dispatch, no writer/reviewer split, no agent" declaration, Phase 0 PRECONDITIONS block, named `FAILED_*` HALT formatting, `git -C` discipline, hard-rules block, "What you do NOT do" out-of-scope section, and the `Next:` pointer pattern |
| P0 | `plugins/relay/agents/docs-updater.md` | 1-50, 295-306 | The writer this command dispatches: `name: docs-updater`, inputs `pr` + `target_root`, the `orchestrator-run.json` shape it reads (no `pr_url`), the manifest path `PRPs/reports/<feature>/docs-update.md` ending `*Status: DRAFT*`, and the verbatim handoff line |
| P0 | `plugins/relay/agents/docs-reviewer.md` | 1-64, 305-320, 326-359, 451-462 | The reviewer this command dispatches: `name: docs-reviewer`, manifest + `docs-review.jsonl` paths, owns the DRAFT→APPROVED flip, the CHANGES_REQUESTED verdict shape (loop-back signal) and APPROVED handoff (the command commits next); budget-exhaustion handoff text |
| P1 | `plugins/relay/commands/relay-execute.md` | 203-221, 252-362 | The `orchestrator-run.json` final-write shape (keys feature/prd_path/started_at/ended_at/outcome/phases_completed) and the canonical bounded writer→reviewer retry loop (set attempts=0, on CHANGES_REQUESTED increment + budget check → HALT `FAILED_*_BUDGET_EXCEEDED`, else re-adopt writer; mirror with `max_docs_review_retries`) |
| P1 | `docs/context/settings-allowlist.md` | 50-64, 66-74, 120-122, 126-138 | The allow git block, GitHub CLI block, scoped worktree-cleanup allow, and the invariant deny block — exact insertion points for the four new allow patterns and confirmation that `git branch -D*` (line 137) stays denied |
| P1 | `plugins/relay/commands/relay-pr.md` | 426-436 | Pre-written sibling contract delegating Merge / Delete branches+worktrees / Run Docs Updater+Reviewer to `/relay-approve` |
| P2 | `PRPs/prds/relay-approve-command.prd.md` | 65-78, 162-181, 206-209, 220-232 | The 12 ACs the command must satisfy, the Architecture Notes (cleanup ordering, idempotency, artifacts), the Phase 3 Details, and the Decisions Log (merge strategy, docs landing, protected-base HALT, partial-failure model) |

## Patterns to Mirror

### Deterministic-infra command shape + "no LLM" declaration

```
# SOURCE: plugins/relay/commands/relay-pr.md:13-18
## Your mission

Accept the `<feature>` argument (plus optional `--base <ref>` and `--draft` flags), resolve `.worktrees/<feature>/`, verify the worktree is on the correct branch with a clean working tree, confirm commits ahead of base, enforce the framework-conditional test-review gate, push the branch (non-forced, idempotent), detect or create a pull request, and emit the PR URL with the next step.

You are a deterministic infra command — no LLM dispatch, no writer/reviewer split, no agent. You either push + open a PR (or report an existing one idempotently), then point the operator to `/relay-approve <pr>` as the next step.
```

Mirrored by Task 1 (frontmatter + mission). Note the deliberate divergence:
`/relay-approve` DOES dispatch agents (the docs pair) via `Task` — so the
mission states "the command carries no LLM judgment; all docs interpretation is
delegated to the docs-updater/docs-reviewer pair" rather than copying the "no
agent" clause verbatim. The command itself remains deterministic.

### Named HALT-code format (FAILED_* blockquote + recovery text)

```
# SOURCE: plugins/relay/commands/relay-pr.md:53-58
> FAILED_MISSING_WORKTREE: `.worktrees/<feature>/` does not exist.
> Run `/relay-worktree <feature>` first to create the isolated worktree,
> then re-run `/relay-commit <feature>` to commit, and `/relay-pr <feature>` to push + open the PR.
```

Mirrored by Task 1's Phase 0 + cleanup HALT blocks (FAILED_GH_AUTH,
FAILED_PR_NOT_FOUND, FAILED_NOT_A_RELAY_FEATURE, FAILED_PR_NOT_MERGEABLE,
FAILED_UNCOMMITTED_CHANGES, FAILED_MERGE, FAILED_DOCS_REVIEW_BUDGET_EXCEEDED,
FAILED_DOCS_PUSH_BLOCKED): each is an ALL_CAPS code in a blockquote with a
one-line explanation and an actionable recovery instruction.

### "What you do NOT do" / out-of-scope delegation block

```
# SOURCE: plugins/relay/commands/relay-pr.md:426-430
## What you do NOT do

- **Commit changes** — `/relay-commit` owns that step; `/relay-pr` HALTs on a dirty worktree rather than committing.
- **Merge the PR** — owned by `/relay-approve`; this command only opens the PR.
- **Delete branches or worktrees** — owned by `/relay-approve` post-merge.
- **Run Docs Updater or Docs Reviewer** — owned by `/relay-approve`.
```

Mirrored by Task 1's "What you do NOT do" section (approve the PR / resolve
conflicts / touch the `documentation/` HTML site / write the docs KB itself —
that is the docs-updater's job / prompt the user / write under `.claude/` /
pass `--no-verify` / force-delete with `git branch -D`).

### orchestrator-run.json shape + best-effort write-back

```
# SOURCE: plugins/relay/commands/relay-execute.md:205-221
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": "<ISO timestamp>",
  "max_plan_review_retries": 2,
  "max_tdd_review_retries": 2,
  "max_orchestrator_minutes": 240,
  "phases": <orchestrator_run_log>,
  "outcome": "ALL_PHASES_COMPLETE",
  "phases_completed": <phases_completed>,
  "worktree_attempted": <boolean | null>,
  "worktree_succeeded": <boolean | null>,
  "fallback_reason": "<string | null>"
}
```

Mirrored by Task 1 Phase 0 (read this file to derive `<feature>` and
`prd_path`; the docs-updater contract at `docs-updater.md:47-50` confirms the
shape does NOT carry `pr_url`, so the PR number arrives from the `<pr>`
argument) and Task 1's final output step (best-effort write-back of `merged_at`
+ approve outcome, non-fatal on failure — mirroring `relay-pr.md:370-383`).

### Bounded writer→reviewer retry loop (budget + CHANGES_REQUESTED loop-back)

```
# SOURCE: plugins/relay/commands/relay-execute.md:338-362
If `plan_review_attempts > max_plan_review_retries`:
... HALT: FAILED_PLAN_REVIEW_BUDGET_EXCEEDED ...
Else: re-adopt `/relay-plan` role passing `prior_feedback = <captured defect list>`. Loop back to Step A.3.2.
```

Mirrored by Task 1's docs-cycle loop: set `docs_review_attempts = 0`; dispatch
docs-updater (writer) then docs-reviewer (reviewer) via `Task`; on
CHANGES_REQUESTED increment, check `> max_docs_review_retries` → HALT
`FAILED_DOCS_REVIEW_BUDGET_EXCEEDED` with the last failing `D-R<i>` IDs, else
re-dispatch docs-updater with the prior feedback and loop back.

### Docs Reviewer verdict contract (loop-back vs commit signal)

```
# SOURCE: plugins/relay/agents/docs-reviewer.md:451-462
On APPROVED: emit the success summary (Step 4.4) and exit. The
`/relay-approve` command reads the manifest status to confirm
`*Status: APPROVED*` and then proceeds to commit and push the docs
changes on the base branch.

On CHANGES_REQUESTED: emit the bullet list of failing IDs + reasons
and exit. The `/relay-approve` command loops back to the Docs
Updater (bounded by `max_docs_review_retries`) or halts with the
last CHANGES_REQUESTED if the budget is exhausted.
```

Mirrored by Task 1's manifest-confirmation step: after docs-reviewer returns
APPROVED, re-read `PRPs/reports/<feature>/docs-update.md` and confirm it ends
with `*Status: APPROVED*` before the `docs(<feature>): ...` commit; on
CHANGES_REQUESTED, loop back per the budget.

### settings-allowlist allow block + invariant deny block

```
# SOURCE: docs/context/settings-allowlist.md:60-64
- `Bash(git worktree *)`
- `Bash(git fetch*)`
- `Bash(git push origin feature/*)` — never `main`, never `--force`
- `Bash(git stash*)` — stash/pop acceptable
- `Bash(git rev-parse*)`, `Bash(git show*)`, `Bash(git ls-files*)`
```

```
# SOURCE: docs/context/settings-allowlist.md:137
- `Bash(git branch -D*)` — force-delete branches
```

Mirrored by Task 5: add `Bash(git worktree remove *)` and `Bash(git branch -d
*)` and `Bash(git push origin --delete feature/*)` into the allow git block
(lines 50-64) and `Bash(gh pr merge *)` into the GitHub CLI allow block (lines
66-74), leaving the deny block's `Bash(git branch -D*)` (line 137) unchanged.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-approve.md` | CREATE | The deterministic Pillar 3 close-out command: Phase 0 verify → merge → cleanup → dispatch docs pair (bounded loop) → commit+push docs → output + write-back (PRD row 3 primary deliverable; AC-1..AC-11) |
| `docs/context/settings-allowlist.md` | UPDATE | Add the four allow patterns (`gh pr merge *`, `git worktree remove *`, `git branch -d *`, `git push origin --delete feature/*`) so the autonomous merge + cleanup runs without permission prompts; `git branch -D*` stays denied (AC-12) |
| `documentation/changelog.html` | UPDATE | Add one `<li>` to the EXISTING Unreleased "Added" `<ul>` (line 34-37) announcing `/relay-approve` as a new command; registry-safe + consistent (the full version cut stays in Phase 4) |

## NOT Building (Scope Limits)

- **Pre-merge review / approving the PR itself** — the human and GitHub own
  merge-readiness; the command acts only on a PR the operator decided to merge.
- **Operating on non-relay PRs** — a head branch not matching `feature/*` HALTs
  with `FAILED_NOT_A_RELAY_FEATURE`.
- **Auto-resolving merge conflicts or failed checks** — a non-mergeable PR HALTs
  with `FAILED_PR_NOT_MERGEABLE`; conflict resolution is human work.
- **Syncing the `documentation/` HTML site** — out of scope (OQ-b); the
  docs-updater touches the `docs/` knowledge base only. The single changelog
  `<li>` added in this phase is a registry-compliance courtesy, not a site sync.
- **Writing the `docs/` knowledge base from the command** — all docs edits are
  performed by the dispatched docs-updater agent; the command only commits +
  pushes what the agent wrote and the reviewer APPROVED.
- **Auto-fallback to a docs PR on a protected base branch** — deferred Could;
  the MVP HALTs loud with `FAILED_DOCS_PUSH_BLOCKED`, docs committed locally.
- **The Phase 4 governance + release cut** — `docs/decisions.md` entry,
  `docs/api-reference.md` / `architecture.md` placeholder→implemented flips,
  `documentation/` `commands.html` / `agents.html` / `status.html`, the full
  version cut, and the `plugin.json` → v0.17.0 bump are Phase 4, not this phase.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-approve.md`

- **ACTION**: Author the full deterministic-infra command. Frontmatter
  `description` + `argument-hint: <pr>`, then a `## Your mission` block stating
  the command is deterministic and carries no LLM judgment (all docs
  interpretation is delegated to the docs-updater/docs-reviewer pair). Body
  protocol in order: **Phase 0 PRECONDITIONS** with named HALT codes —
  `FAILED_GH_AUTH` (`gh auth status` fails), `FAILED_PR_NOT_FOUND`
  (`gh pr view <pr> --json state,mergedAt,headRefName,mergeStateStatus` fails),
  `FAILED_NOT_A_RELAY_FEATURE` (headRefName not `feature/*`),
  `FAILED_PR_NOT_MERGEABLE` (mergeStateStatus CONFLICTING/BLOCKED),
  `FAILED_UNCOMMITTED_CHANGES` (`.worktrees/<feature>/` dirty via
  `git -C .worktrees/<feature>/ status --porcelain`, unless `--force`);
  **idempotency guard** — if `state == MERGED` and worktree/branch already
  absent, emit the structured "already approved" message and exit 0;
  **Merge** — `gh pr merge <pr> --merge` from the repo root (NOT
  `--delete-branch`'s local cleanup), `--strategy merge|squash|rebase` override,
  `--admin` passthrough; `FAILED_MERGE` on failure; **Cleanup** in the
  collision-safe order: `git worktree remove .worktrees/<feature>/` (or
  `--force` with `--force` flag) → `git branch -d feature/<feature>` →
  `git push origin --delete feature/<feature>` → `git worktree prune`, each
  guarded by a state check (already-done → skip), partial failure captured to
  `PRPs/reports/<feature>/approve-halt.json` with
  `{steps_attempted, steps_succeeded, step_failed, error, manual_recovery_steps}`;
  **Docs cycle** — unless `--no-docs`: set `docs_review_attempts = 0`, dispatch
  `docs-updater` then `docs-reviewer` via `Task` (passing `pr` + `target_root`),
  on CHANGES_REQUESTED increment + check `> max_docs_review_retries` → HALT
  `FAILED_DOCS_REVIEW_BUDGET_EXCEEDED`, else re-dispatch docs-updater with prior
  feedback; **Docs commit** — confirm `docs-update.md` ends `*Status: APPROVED*`,
  then `git commit` `docs(<feature>): sync knowledge base post-merge` on the
  base branch and push (never `--no-verify`); protected base →
  `FAILED_DOCS_PUSH_BLOCKED` with the commit kept local; **Output + write-back**
  — structured summary + best-effort `merged_at`/outcome write-back to
  `orchestrator-run.json`; a `## Constraints (hard rules)` block and a
  `## What you do NOT do` block.
- **MIRROR**: "Deterministic-infra command shape + 'no LLM' declaration",
  "Named HALT-code format", "Bounded writer→reviewer retry loop", "Docs Reviewer
  verdict contract", "orchestrator-run.json shape", and "What you do NOT do"
  anchors above.
- **Satisfies:** AC-A1, AC-A2, AC-A3, AC-A4, AC-A6, AC-A7, AC-A8, AC-A9
- **VALIDATE**:
  ```bash
  test -f plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_GH_AUTH" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_PR_NOT_FOUND" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_NOT_A_RELAY_FEATURE" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_PR_NOT_MERGEABLE" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_UNCOMMITTED_CHANGES" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_MERGE" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_DOCS_REVIEW_BUDGET_EXCEEDED" plugins/relay/commands/relay-approve.md && \
  grep -q "FAILED_DOCS_PUSH_BLOCKED" plugins/relay/commands/relay-approve.md && \
  echo "OK: command + 8 HALT codes present"
  ```
  PowerShell equivalent:
  ```powershell
  $f = 'plugins/relay/commands/relay-approve.md'
  $codes = 'FAILED_GH_AUTH','FAILED_PR_NOT_FOUND','FAILED_NOT_A_RELAY_FEATURE','FAILED_PR_NOT_MERGEABLE','FAILED_UNCOMMITTED_CHANGES','FAILED_MERGE','FAILED_DOCS_REVIEW_BUDGET_EXCEEDED','FAILED_DOCS_PUSH_BLOCKED'
  if ((Test-Path $f) -and (($codes | Where-Object { Select-String -Path $f -Pattern $_ -CaseSensitive -Quiet }).Count -eq 8)) { 'OK: command + 8 HALT codes present' } else { throw 'missing command or HALT code' }
  ```

### Task 2: ADD the merge + cleanup-ordering protocol to `relay-approve.md`

- **ACTION**: Verify the merge + cleanup section of the command (written in
  Task 1) names the load-bearing sequence explicitly: detect PR state via
  `gh pr view <pr> --json state,mergedAt,headRefName,mergeStateStatus`; merge
  from the repo root with `gh pr merge <pr> --merge` (NOT relying on
  `--delete-branch` local cleanup); then `git worktree remove` → `git branch -d
  feature/<feature>` → `git push origin --delete feature/<feature>` →
  `git worktree prune`; and that each destructive step is guarded so an
  already-done state is a no-op (idempotent re-run exits 0). The section must
  reference the cli/cli #13380 worktree+`--delete-branch` trap as the rationale
  for the ordering.
- **MIRROR**: "Named HALT-code format" + the cleanup-ordering Architecture Note
  in the source PRD (`relay-approve-command.prd.md:165`).
- **Satisfies:** AC-A1, AC-A2, AC-A3
- **VALIDATE**:
  ```bash
  grep -q "gh pr merge" plugins/relay/commands/relay-approve.md && \
  grep -q "git worktree remove" plugins/relay/commands/relay-approve.md && \
  grep -q "git branch -d feature/" plugins/relay/commands/relay-approve.md && \
  grep -q "git push origin --delete feature/" plugins/relay/commands/relay-approve.md && \
  grep -q "git worktree prune" plugins/relay/commands/relay-approve.md && \
  echo "OK: merge + 4-step cleanup ordering present"
  ```
  PowerShell equivalent:
  ```powershell
  $f = 'plugins/relay/commands/relay-approve.md'
  $pats = 'gh pr merge','git worktree remove','git branch -d feature/','git push origin --delete feature/','git worktree prune'
  if (($pats | Where-Object { Select-String -Path $f -Pattern ([regex]::Escape($_)) -Quiet }).Count -eq 5) { 'OK: merge + 4-step cleanup ordering present' } else { throw 'cleanup ordering incomplete' }
  ```

### Task 3: ADD the bounded docs-cycle dispatch to `relay-approve.md`

- **ACTION**: Verify the docs-cycle section dispatches the two agents by their
  exact `subagent_type` names — `docs-updater` (writer) and `docs-reviewer`
  (reviewer) — via the `Task` tool, passing `pr` and `target_root`; initializes
  `docs_review_attempts = 0`; loops back to the docs-updater on
  CHANGES_REQUESTED; and HALTs with `FAILED_DOCS_REVIEW_BUDGET_EXCEEDED`
  (carrying the last failing `D-R<i>` IDs) when `docs_review_attempts >
  max_docs_review_retries`. After APPROVED, the command re-reads
  `PRPs/reports/<feature>/docs-update.md` and confirms `*Status: APPROVED*`
  before committing. The `--no-docs` flag skips the whole cycle.
- **MIRROR**: "Bounded writer→reviewer retry loop" + "Docs Reviewer verdict
  contract" anchors.
- **Satisfies:** AC-A6, AC-A7, AC-A8
- **VALIDATE**:
  ```bash
  grep -q "docs-updater" plugins/relay/commands/relay-approve.md && \
  grep -q "docs-reviewer" plugins/relay/commands/relay-approve.md && \
  grep -q "max_docs_review_retries" plugins/relay/commands/relay-approve.md && \
  grep -q "docs-update.md" plugins/relay/commands/relay-approve.md && \
  grep -Eq "Status: APPROVED" plugins/relay/commands/relay-approve.md && \
  echo "OK: bounded docs cycle + manifest confirmation present"
  ```
  PowerShell equivalent:
  ```powershell
  $f = 'plugins/relay/commands/relay-approve.md'
  $pats = 'docs-updater','docs-reviewer','max_docs_review_retries','docs-update.md','Status: APPROVED'
  if (($pats | Where-Object { Select-String -Path $f -Pattern ([regex]::Escape($_)) -Quiet }).Count -eq 5) { 'OK: bounded docs cycle + manifest confirmation present' } else { throw 'docs cycle incomplete' }
  ```

### Task 4: ADD partial-failure capture + write-back to `relay-approve.md`

- **ACTION**: Verify the command captures post-merge cleanup partial failures to
  `PRPs/reports/<feature>/approve-halt.json` with the structured keys
  `{steps_attempted, steps_succeeded, step_failed, error, manual_recovery_steps}`
  and surfaces an actionable message (no step swallowed); and that the final
  output step performs a best-effort, non-fatal write-back of `merged_at` +
  approve outcome to `PRPs/reports/<feature>/orchestrator-run.json`. Confirm no
  artifact path resolves under `.claude/`.
- **MIRROR**: "orchestrator-run.json shape + best-effort write-back" anchor +
  the D8 partial-failure model (`docs/decisions.md` 2026-04-30).
- **Satisfies:** AC-A5, AC-A9, AC-A10
- **VALIDATE**:
  ```bash
  grep -q "approve-halt.json" plugins/relay/commands/relay-approve.md && \
  grep -q "manual_recovery_steps" plugins/relay/commands/relay-approve.md && \
  grep -q "orchestrator-run.json" plugins/relay/commands/relay-approve.md && \
  grep -q "merged_at" plugins/relay/commands/relay-approve.md && \
  ! grep -q ".claude/PRPs/" plugins/relay/commands/relay-approve.md && \
  echo "OK: partial-failure capture + write-back present, no .claude/ writes"
  ```
  PowerShell equivalent (the `.claude/PRPs/` guard uses `-CaseSensitive`):
  ```powershell
  $f = 'plugins/relay/commands/relay-approve.md'
  $pats = 'approve-halt.json','manual_recovery_steps','orchestrator-run.json','merged_at'
  $hasAll = ($pats | Where-Object { Select-String -Path $f -Pattern ([regex]::Escape($_)) -Quiet }).Count -eq 4
  $noClaude = -not (Select-String -Path $f -Pattern ([regex]::Escape('.claude/PRPs/')) -CaseSensitive -Quiet)
  if ($hasAll -and $noClaude) { 'OK: partial-failure capture + write-back present, no .claude/ writes' } else { throw 'capture/write-back incomplete or .claude write present' }
  ```

### Task 5: UPDATE `docs/context/settings-allowlist.md` with the four allow patterns

- **ACTION**: Add `Bash(gh pr merge *)` to the GitHub CLI allow block (lines
  66-74) and `Bash(git worktree remove *)`, `Bash(git branch -d *)`, and
  `Bash(git push origin --delete feature/*)` to the Git allow block (lines
  50-64), each with a short scoped comment. Do NOT modify the invariant deny
  block — `Bash(git branch -D*)` (line 137) must remain denied.
- **MIRROR**: "settings-allowlist allow block + invariant deny block" anchor.
- **Satisfies:** AC-A11
- **VALIDATE**:
  ```bash
  grep -q "Bash(gh pr merge \*)" docs/context/settings-allowlist.md && \
  grep -q "Bash(git worktree remove \*)" docs/context/settings-allowlist.md && \
  grep -q "Bash(git branch -d \*)" docs/context/settings-allowlist.md && \
  grep -q "Bash(git push origin --delete feature/\*)" docs/context/settings-allowlist.md && \
  grep -q "Bash(git branch -D\*)" docs/context/settings-allowlist.md && \
  echo "OK: 4 allow patterns added, git branch -D* still denied"
  ```
  PowerShell equivalent:
  ```powershell
  $f = 'docs/context/settings-allowlist.md'
  $allow = 'Bash(gh pr merge *)','Bash(git worktree remove *)','Bash(git branch -d *)','Bash(git push origin --delete feature/*)'
  $hasAllow = ($allow | Where-Object { Select-String -Path $f -Pattern ([regex]::Escape($_)) -Quiet }).Count -eq 4
  $stillDeny = Select-String -Path $f -Pattern ([regex]::Escape('Bash(git branch -D*)')) -Quiet
  if ($hasAllow -and $stillDeny) { 'OK: 4 allow patterns added, git branch -D* still denied' } else { throw 'allowlist edit incomplete' }
  ```

### Task 6: UPDATE `documentation/changelog.html` Unreleased "Added" list

- **ACTION**: Add exactly one `<li>` to the EXISTING Unreleased "Added" `<ul>`
  (between the docs-reviewer `<li>` on line 36 and the closing `</ul>` on line
  37) announcing `plugins/relay/commands/relay-approve.md` as the new Pillar 3
  command (Phase 3 of the relay-approve-command feature). Do NOT create a
  duplicate "Added" `<h3>`; do NOT cut a version (the full version cut +
  `plugin.json` bump are Phase 4). Note in the `<li>` that the version cut lands
  in Phase 4.
- **MIRROR**: the existing Unreleased "Added" `<li>` entries for docs-updater
  (line 35) and docs-reviewer (line 36) — same `<strong><code>...</code></strong>
  &mdash; ...` shape.
- **Satisfies:** AC-A12
- **VALIDATE**:
  ```bash
  grep -q "relay/commands/relay-approve.md" documentation/changelog.html && \
  test "$(grep -c 'id="unreleased-added"' documentation/changelog.html)" -eq 1 && \
  echo "OK: one changelog Added <li> for /relay-approve, no duplicate Added heading"
  ```
  PowerShell equivalent:
  ```powershell
  $f = 'documentation/changelog.html'
  $hasLi = Select-String -Path $f -Pattern ([regex]::Escape('relay/commands/relay-approve.md')) -Quiet
  $oneHeading = (Select-String -Path $f -Pattern 'id="unreleased-added"').Count -eq 1
  if ($hasLi -and $oneHeading) { 'OK: one changelog Added <li> for /relay-approve, no duplicate Added heading' } else { throw 'changelog entry missing or duplicate heading' }
  ```

## Validation Commands

The relay repo is markdown + JSON with `tdd: false` and `test_frameworks: []`,
so validation is filesystem/grep oriented (no test-framework invocation). Each
level is given in both bash and PowerShell so the Implementer can run whichever
matches the host shell.

### Level 1 — STATIC_ANALYSIS (frontmatter + structure well-formedness)

The new command file must parse as a valid command: YAML frontmatter delimited
by `---`, a `description` key, and an `argument-hint` key.

```bash
# bash
head -1 plugins/relay/commands/relay-approve.md | grep -q '^---$' && \
grep -q '^description:' plugins/relay/commands/relay-approve.md && \
grep -q '^argument-hint:' plugins/relay/commands/relay-approve.md && \
echo "L1 OK: frontmatter well-formed"
```
```powershell
# PowerShell
$f = 'plugins/relay/commands/relay-approve.md'
$first = (Get-Content $f -TotalCount 1)
if ($first -eq '---' -and (Select-String -Path $f -Pattern '^description:' -Quiet) -and (Select-String -Path $f -Pattern '^argument-hint:' -Quiet)) { 'L1 OK: frontmatter well-formed' } else { throw 'L1 FAIL: frontmatter malformed' }
```

### Level 2 — CONTENT_INVARIANTS (all 8 HALT codes, cleanup ordering, bounded loop, allowlist, no .claude/ writes)

```bash
# bash — command content invariants
F=plugins/relay/commands/relay-approve.md
for c in FAILED_GH_AUTH FAILED_PR_NOT_FOUND FAILED_NOT_A_RELAY_FEATURE \
         FAILED_PR_NOT_MERGEABLE FAILED_UNCOMMITTED_CHANGES FAILED_MERGE \
         FAILED_DOCS_REVIEW_BUDGET_EXCEEDED FAILED_DOCS_PUSH_BLOCKED; do
  grep -q "$c" "$F" || { echo "L2 FAIL: missing $c"; exit 1; }
done
for p in "gh pr merge" "git worktree remove" "git branch -d feature/" \
         "git push origin --delete feature/" "git worktree prune" \
         "docs-updater" "docs-reviewer" "max_docs_review_retries" \
         "approve-halt.json" "orchestrator-run.json"; do
  grep -q "$p" "$F" || { echo "L2 FAIL: missing $p"; exit 1; }
done
grep -q ".claude/PRPs/" "$F" && { echo "L2 FAIL: .claude/ write present"; exit 1; }
# allowlist invariants
A=docs/context/settings-allowlist.md
grep -q "Bash(gh pr merge \*)" "$A" && \
grep -q "Bash(git worktree remove \*)" "$A" && \
grep -q "Bash(git branch -d \*)" "$A" && \
grep -q "Bash(git push origin --delete feature/\*)" "$A" && \
grep -q "Bash(git branch -D\*)" "$A" && \
echo "L2 OK: all content invariants satisfied"
```
```powershell
# PowerShell — command content invariants (the .claude/ guard is -CaseSensitive)
$F = 'plugins/relay/commands/relay-approve.md'
$codes = 'FAILED_GH_AUTH','FAILED_PR_NOT_FOUND','FAILED_NOT_A_RELAY_FEATURE','FAILED_PR_NOT_MERGEABLE','FAILED_UNCOMMITTED_CHANGES','FAILED_MERGE','FAILED_DOCS_REVIEW_BUDGET_EXCEEDED','FAILED_DOCS_PUSH_BLOCKED'
$pats  = 'gh pr merge','git worktree remove','git branch -d feature/','git push origin --delete feature/','git worktree prune','docs-updater','docs-reviewer','max_docs_review_retries','approve-halt.json','orchestrator-run.json'
$missing = @($codes + $pats) | Where-Object { -not (Select-String -Path $F -Pattern ([regex]::Escape($_)) -Quiet) }
$claude  = Select-String -Path $F -Pattern ([regex]::Escape('.claude/PRPs/')) -CaseSensitive -Quiet
$A = 'docs/context/settings-allowlist.md'
$allow = 'Bash(gh pr merge *)','Bash(git worktree remove *)','Bash(git branch -d *)','Bash(git push origin --delete feature/*)','Bash(git branch -D*)'
$allowMissing = $allow | Where-Object { -not (Select-String -Path $A -Pattern ([regex]::Escape($_)) -Quiet) }
if ($missing.Count -eq 0 -and -not $claude -and $allowMissing.Count -eq 0) { 'L2 OK: all content invariants satisfied' } else { throw "L2 FAIL: missing=$($missing -join ',') claude=$claude allowMissing=$($allowMissing -join ',')" }
```

### Level 3 — DRY-RUN END-TO-END (sibling-shape parity + changelog registry)

Confirm the command mirrors the deterministic-infra sibling shape (a "What you
do NOT do" / out-of-scope section and a `Next:` pointer or output surface are
present) and that the single changelog `<li>` was added without a duplicate
heading.

```bash
# bash
F=plugins/relay/commands/relay-approve.md
grep -Eq "do NOT do|What you do NOT do|do not do" "$F" && \
grep -q "relay/commands/relay-approve.md" documentation/changelog.html && \
[ "$(grep -c 'id=\"unreleased-added\"' documentation/changelog.html)" -eq 1 ] && \
echo "L3 OK: sibling-shape parity + single changelog Added entry"
```
```powershell
# PowerShell
$F = 'plugins/relay/commands/relay-approve.md'
$notDo = Select-String -Path $F -Pattern 'do NOT do|What you do NOT do|do not do' -Quiet
$li = Select-String -Path 'documentation/changelog.html' -Pattern ([regex]::Escape('relay/commands/relay-approve.md')) -Quiet
$oneHeading = (Select-String -Path 'documentation/changelog.html' -Pattern 'id="unreleased-added"').Count -eq 1
if ($notDo -and $li -and $oneHeading) { 'L3 OK: sibling-shape parity + single changelog Added entry' } else { throw 'L3 FAIL: parity or changelog invariant unmet' }
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** The command merges a mergeable `feature/<feature>` PR via
  `gh pr merge --merge` from the repo root, removes the worktree, deletes the
  local + remote `feature/<feature>` branches (`git branch -d` + remote delete),
  and runs `git worktree prune` — the merge + 4-step cleanup ordering is present
  and explicit (Task 1, Task 2).
- **AC-A2 (PRD AC-2):** The command detects an already-merged / already-cleaned
  state via `gh pr view --json state,mergedAt,...` + a `git worktree list` /
  state check, performs no destructive action, and exits 0 with a structured
  "already approved" message — each destructive step is guarded (Task 1, Task 2).
- **AC-A3 (PRD AC-3):** A PR whose `mergeStateStatus` is CONFLICTING/BLOCKED
  HALTs with `FAILED_PR_NOT_MERGEABLE` and performs no merge/removal/deletion
  (Task 1, Task 2).
- **AC-A4 (PRD AC-4):** A PR whose head branch does not match `feature/*` HALTs
  with `FAILED_NOT_A_RELAY_FEATURE` and produces no side effect (Task 1).
- **AC-A5 (PRD AC-5):** A dirty `.worktrees/<feature>/` HALTs with
  `FAILED_UNCOMMITTED_CHANGES` before merging, unless `--force` routes through
  `git worktree remove --force` after merge (Task 1, Task 4).
- **AC-A6 (PRD AC-6):** The command dispatches the `docs-updater` agent (which
  reads `gh pr diff <pr>` + the source PRD via `orchestrator-run.json` and writes
  the `DRAFT` manifest); the command itself performs no docs KB write (Task 1,
  Task 3).
- **AC-A7 (PRD AC-7):** The command dispatches the `docs-reviewer` agent, which
  owns the manifest DRAFT→APPROVED flip and the `docs-review.jsonl` log; on
  CHANGES_REQUESTED the command loops back to docs-updater within
  `max_docs_review_retries` (Task 1, Task 3).
- **AC-A8 (PRD AC-8):** On docs-reviewer APPROVED, the command confirms the
  manifest is `*Status: APPROVED*`, then commits `docs(<feature>): ...` on the
  base branch and pushes; `--no-verify` is never passed (Task 1, Task 3).
- **AC-A9 (PRD AC-9):** The command never writes under `.claude/`; the docs KB
  writes are delegated to the docs-updater whose own contract forbids `.claude/`
  writes + plugin-default injection. The command body contains no `.claude/PRPs/`
  path (Task 1, Task 4).
- **AC-A10 (PRD AC-10):** A post-merge cleanup partial failure is captured to
  `PRPs/reports/<feature>/approve-halt.json` with
  `{steps_attempted, steps_succeeded, step_failed, error, manual_recovery_steps}`
  and surfaced actionably — no step swallowed (Task 1, Task 4).
- **AC-A11 (PRD AC-11):** A protected base branch that rejects the docs push
  HALTs with `FAILED_DOCS_PUSH_BLOCKED`, leaves the docs commit intact locally,
  and prints recovery steps (Task 1).
- **AC-A12 (PRD AC-12):** `docs/context/settings-allowlist.md` lists
  `gh pr merge *`, `git worktree remove *`, `git branch -d *`, and
  `git push origin --delete feature/*` as allowed patterns; `git branch -D*`
  remains denied (Task 5). A registry-courtesy changelog `<li>` is added to the
  existing Unreleased "Added" list (Task 6).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `gh pr merge --delete-branch` worktree trap (cli/cli #13380) leaves partial local state | M | H | Never use `--delete-branch` local cleanup; merge from repo root; cleanup ordering worktree→branch→remote→prune; explicit remote delete (Task 2) |
| Post-merge cleanup partial failure (merge is irreversible) | M | H | Best-effort guarded steps + `approve-halt.json` capture + actionable recovery message, mirroring the 2026-04-30 D8 model (Task 4) |
| Docs cycle does not converge | L | M | `max_docs_review_retries` bounded loop + HALT `FAILED_DOCS_REVIEW_BUDGET_EXCEEDED` carrying the last CHANGES_REQUESTED `D-R<i>` IDs (Task 3) |
| Branch protection blocks the docs push | M | M | `FAILED_DOCS_PUSH_BLOCKED` HALT; optional `--admin`; docs commit kept local with recovery steps (Task 1) |
| Allowlist gap stalls the autonomous run on a prompt | M | M | Phase 3 adds the four allow patterns to `settings-allowlist.md` (Task 5) |
| `gh pr merge` exit code on an already-merged PR is undocumented (cli/cli #13345) | L | M | Detect merge state via `gh pr view --json state,mergedAt` first rather than relying on the merge exit code (Task 1, Task 2) — confirmed by web research (cli/cli #12998) |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in
  `docs/context/methodology.md`: **false**. TDD track inactive — tests written
  alongside implementation. Acceptance Criteria seed those tests.

- **No test framework in this repo.** The relay repo is markdown + JSON with
  `test_frameworks: []`. All Validation Commands are filesystem/grep oriented
  (PowerShell `Test-Path` / `Select-String` and bash `test -f` / `grep`), never
  a test-framework invocation. This is consistent with every prior relay feature
  and is why `phase_type: docs` is set in `## Metadata`.

- **PowerShell `.claude/` guards use `-CaseSensitive`.** The Level 2 and Task 4
  `Select-String` guards that catch `.claude/PRPs/` use `-CaseSensitive` so the
  literal path token is matched exactly and the check is not fooled by casing.

- **Deterministic command that dispatches agents — intentional divergence.**
  Unlike `relay-pr.md` / `relay-commit.md` (which dispatch no agents),
  `/relay-approve` DOES dispatch the docs pair via `Task`. The "no LLM judgment"
  invariant is preserved because all interpretation lives in the dispatched
  agents; the command's own logic is purely deterministic gh/git/file operations
  + a bounded loop. The mission statement reflects this rather than copying the
  "no agent" clause verbatim.

- **Registry compliance.** `relay-approve.md` is a new file under
  `plugins/relay/commands/` (a registry per `docs/context/code-review-registries.md`
  line 3). Creating it ALSO satisfies the agents/ registry rule (line 4) for the
  Phase-1/Phase-2 docs-updater + docs-reviewer agents, which now have a
  referencing command. The changelog rule (line 8) is scoped to
  `plugins/relay/agents/` changes; Phase 3 changes `commands/` + `docs/`, not
  `agents/`, so it is not strictly triggered — but Task 6 adds one changelog
  `<li>` to the existing Unreleased "Added" list proactively for consistency and
  to avoid an `R-COH-REGISTRY-MISSING` surprise on the new command file. The
  full version cut + `commands.html` / `agents.html` flips + `api-reference` +
  `plugin.json` bump are deliberately deferred to Phase 4.

- **Dogfood opportunity.** Once shipped, this command can be exercised against a
  synthetic relay PR (per the PRD Phase 3 success signal) to confirm merged +
  cleaned + docs APPROVED + pushed, idempotent re-run exits 0, and each HALT code
  is reachable.

*Generated: 2026-06-19*
*Approved: 2026-06-19*
*Status: IMPLEMENTED*
