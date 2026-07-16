---
description: 'Deterministic Pillar 3 close-out command. Accepts a <pr> argument (PR number or URL; plus optional --strategy merge|squash|rebase, --admin, --force, --no-docs flags); verifies gh auth, PR state, head branch matches feature/<feature>, worktree cleanliness, and merge-readiness (named HALT codes: FAILED_GH_AUTH, FAILED_PR_NOT_FOUND, FAILED_NOT_A_RELAY_FEATURE, FAILED_PR_NOT_MERGEABLE, FAILED_UNCOMMITTED_CHANGES); detects already-merged + already-cleaned state and exits 0 idempotently; merges via gh pr merge <pr> --merge (default) from the repo root (never --delete-branch local cleanup); cleans up in the collision-safe order: git worktree remove → git branch -d feature/<feature> → git push origin --delete feature/<feature> → git worktree prune (each step guarded; partial failure captured to PRPs/reports/<feature>/approve-halt.json with manual_recovery_steps); dispatches docs-updater then docs-reviewer via Task in a max_docs_review_retries bounded loop (on CHANGES_REQUESTED loops back to docs-updater; budget exhausted → HALT FAILED_DOCS_REVIEW_BUDGET_EXCEEDED); on APPROVED confirms manifest *Status: APPROVED* then commits docs(<feature>): sync knowledge base post-merge on the base branch and pushes (never --no-verify; protected base → HALT FAILED_DOCS_PUSH_BLOCKED with commit kept local); emits structured summary; best-effort write-back of merged_at + approve outcome to orchestrator-run.json. The command carries no LLM judgment — all docs interpretation is delegated to the docs-updater/docs-reviewer pair.'
argument-hint: <pr>
---

# /relay-approve

**Arguments:** `$ARGUMENTS`

---

## Your mission

Accept the `<pr>` argument (PR number or URL; plus optional `--strategy merge|squash|rebase`, `--admin`, `--force`, and `--no-docs` flags) and wire the full Pillar 3 close-out: Phase 0 state verification with named HALT codes → merge (from the repo root, never `--delete-branch` local cleanup) → cleanup in the collision-safe order (worktree remove → local branch delete → remote branch delete → prune) → dispatch the docs-updater then docs-reviewer via `Task` in a `max_docs_review_retries` bounded loop → confirm the manifest is `*Status: APPROVED*` → commit and push docs on the base branch → emit a structured summary and write back the approve outcome to `orchestrator-run.json`.

The command carries no LLM judgment — all docs interpretation is delegated to the **docs-updater** (writer) and **docs-reviewer** (reviewer) agent pair, which may reopen dialogue with the operator if needed. The command itself is purely deterministic: gh/git/file operations plus a bounded loop.

See:
- `PRPs/prds/relay-approve-command.prd.md` — source PRD; AC-1 through AC-12; Decisions Log; Architecture Notes
- `plugins/relay/commands/relay-pr.md` — structural sibling; Phase 0 precondition shape; named HALT format; `git -C` discipline; Phase 4 output + next-step pattern
- `plugins/relay/agents/docs-updater.md` — the writer this command dispatches; inputs `pr` + `target_root`; writes `PRPs/reports/<feature>/docs-update.md` ending `*Status: DRAFT*`
- `plugins/relay/agents/docs-reviewer.md` — the reviewer this command dispatches; owns the DRAFT→APPROVED flip; CHANGES_REQUESTED verdict shape; budget-exhaustion handoff

---

## Phase 0: PRECONDITIONS

Parse `$ARGUMENTS`. Extract flags first:
- `--strategy merge|squash|rebase` → record as `<merge_strategy>` (default: `merge`)
- `--admin` → record as `admin_flag = true` (optional; bypasses branch protection on merge)
- `--force` → record as `force_flag = true` (optional; allows `git worktree remove --force` on dirty worktree post-merge)
- `--no-docs` → record as `no_docs_flag = true` (optional; skips the docs cycle entirely)

The remaining positional token is `<pr>`. If it is blank or whitespace after trimming, HALT:

> /relay-approve requires a PR number or URL. Usage:
>   /relay-approve <pr> [--strategy merge|squash|rebase] [--admin] [--force] [--no-docs]
> Example:
>   /relay-approve 42
>   /relay-approve 42 --strategy squash
>   /relay-approve https://github.com/owner/repo/pull/42 --admin

### P0 — GitHub CLI auth check

Run:

```bash
gh auth status
```

If the command fails (non-zero exit), HALT:

> FAILED_GH_AUTH: GitHub CLI is not authenticated.
> Run `gh auth login` to authenticate, then re-run `/relay-approve <pr>`.

### P1 — PR exists and state is readable

Run:

```bash
gh pr view <pr> --json state,mergedAt,headRefName,mergeStateStatus
```

If the command fails (non-zero exit or invalid output), HALT:

> FAILED_PR_NOT_FOUND: PR `<pr>` could not be retrieved.
> Verify the PR number or URL, confirm you have access, and re-run `/relay-approve <pr>`.

Extract and record:
- `state` (e.g., `OPEN`, `MERGED`, `CLOSED`)
- `mergedAt` (ISO timestamp or null)
- `headRefName` (the head branch name, e.g., `feature/my-feature`)
- `mergeStateStatus` (e.g., `CLEAN`, `CONFLICTING`, `BLOCKED`, `UNKNOWN`)

### P2 — Head branch matches `feature/*`

If `headRefName` does NOT match the pattern `feature/*`, HALT:

> FAILED_NOT_A_RELAY_FEATURE: PR `<pr>` has head branch `<headRefName>`,
> which does not match the `feature/*` pattern expected by relay.
> `/relay-approve` only operates on relay-produced feature PRs.
> Merge this PR manually via `gh pr merge <pr>`.

Extract `<feature>` as the portion after `feature/` in `headRefName`.

### P3 — Idempotency guard (already approved + cleaned)

If `state == "MERGED"`:
- Check whether `.worktrees/<feature>/` still exists on disk.
- Check whether branch `feature/<feature>` still exists locally via:
  ```bash
  git branch --list feature/<feature>
  ```
- If the worktree is absent AND the local branch is absent, emit the structured "already approved" message and exit 0 (no destructive action taken):

  > /relay-approve: PR `<pr>` is already merged and branch + worktree are already cleaned up.
  > State: MERGED at `<mergedAt>`.
  > Nothing to do — exiting 0.

- If the worktree or branch still exists (partial cleanup from a prior interrupted run), continue to the Merge phase (the merge step will detect the already-merged state and skip to cleanup).

### P4 — PR is mergeable

If `state == "OPEN"` and `mergeStateStatus` is `CONFLICTING` or `BLOCKED`, HALT:

> FAILED_PR_NOT_MERGEABLE: PR `<pr>` has mergeStateStatus `<mergeStateStatus>` and cannot be merged automatically.
> Resolve conflicts or required checks before re-running `/relay-approve <pr>`.
> No merge, removal, or deletion has been performed.

### P5 — Worktree cleanliness (unless --force)

If `.worktrees/<feature>/` exists AND `force_flag` is NOT set, run:

```bash
git -C .worktrees/<feature>/ status --porcelain
```

If the output is non-empty (dirty working tree), HALT:

> FAILED_UNCOMMITTED_CHANGES: `.worktrees/<feature>/` has uncommitted changes.
> Run `/relay-commit <feature>` to commit, then `/relay-pr <feature>` to push + open the PR, then re-run `/relay-approve <pr>`.
> Pass `--force` to bypass this check and use `git worktree remove --force` after merge.

### P6 — Read `orchestrator-run.json`

Read `PRPs/reports/<feature>/orchestrator-run.json` to extract:
- `prd_path` — passed to the docs-updater agent
- Other fields for write-back reference

If the file does not exist, note it and continue (the docs-updater will attempt to read it and may warn; the command proceeds — the PR data is the authoritative source).

Record `target_root` as the repository root (the current working directory, resolved absolutely).

### P7 — Read `docs_sync` from `docs/context/methodology.md`

Read `<target_root>/docs/context/methodology.md` frontmatter and extract the `docs_sync` key, recording `docs_sync_enabled` (boolean). Default `true` when the key is absent, mirroring the `tdd` absence-handling precedent and `docs-updater.md`'s own default-true-when-absent handling of the same key (`docs/context/methodology.md:45-65`). If `docs/context/methodology.md` itself does not exist, also default `docs_sync_enabled = true` and note the absence — do not HALT (mirrors the existing soft-fail treatment of a missing `orchestrator-run.json` in P6).

---

## Phase 1: MERGE

### Step 1 — Skip if already merged

If `state == "MERGED"` (detected in Phase 0 P3 — the worktree or branch still exists), log that the PR is already merged and proceed directly to Phase 2: CLEANUP.

### Step 2 — Merge from the repo root

Construct the merge command:
- Base: `gh pr merge <pr> --merge`
- If `<merge_strategy>` is `squash`: replace `--merge` with `--squash`
- If `<merge_strategy>` is `rebase`: replace `--merge` with `--rebase`
- If `admin_flag = true`: append `--admin`
- NEVER pass `--delete-branch` — local branch cleanup is performed deterministically in Phase 2; relying on `--delete-branch` inside a worktree context triggers the cli/cli #13380 trap where the local branch deletion fails with `fatal: <base> is already used by worktree`, leaving partial local state.

Run from the repo root (NOT from inside `.worktrees/<feature>/`):

```bash
gh pr merge <pr> [--merge|--squash|--rebase] [--admin]
```

If the command fails (non-zero exit), HALT:

> FAILED_MERGE: `gh pr merge <pr>` failed.
> Error: <stderr>
> The PR has NOT been merged. Inspect the error above, resolve the cause, and re-run `/relay-approve <pr>`.
> Common causes: branch protection requires admin (try `--admin`); CI checks still running; PR already closed without merging.

---

## Phase 2: CLEANUP (collision-safe ordering)

The cleanup order is load-bearing. Rationale for the ordering:
1. A branch checked out in a worktree cannot be deleted — so the worktree must be removed BEFORE the local branch is deleted.
2. `gh pr merge --delete-branch` is NOT used because it runs local cleanup from inside a worktree context and triggers the cli/cli #13380 partial-failure trap. Instead, each step is performed deterministically in order with an idempotency guard.
3. `git worktree prune` is non-destructive and safe to re-run at any time.

Track cleanup state for partial-failure capture:
```
steps_attempted = []
steps_succeeded = []
step_failed = null
```

### Step 2.1 — Remove worktree

Guard: if `.worktrees/<feature>/` does NOT exist → skip (already removed), record as succeeded.

Otherwise, append `"worktree_remove"` to `steps_attempted`. Run:

```bash
git worktree remove .worktrees/<feature>/
```

If `force_flag = true`, use:

```bash
git worktree remove --force .worktrees/<feature>/
```

On success: append `"worktree_remove"` to `steps_succeeded`.
On failure: set `step_failed = "worktree_remove"`. Capture error. Proceed to **Partial-failure capture** (Step 2.5) and HALT.

### Step 2.2 — Delete local branch

Guard: run `git branch --list feature/<feature>`. If output is empty → skip (already deleted), record as succeeded.

Otherwise, append `"branch_delete_local"` to `steps_attempted`. Run:

```bash
git branch -d feature/<feature>
```

(`-d` only — never `-D`; the branch is already merged so `-d` succeeds. If it refuses because the branch is not fully merged, something unexpected happened — treat as a failure.)

On success: append `"branch_delete_local"` to `steps_succeeded`.
On failure: set `step_failed = "branch_delete_local"`. Capture error. Proceed to **Partial-failure capture** (Step 2.5).

**Note:** even on failure, continue to Step 2.3 and 2.4 so the remaining cleanup is attempted. Record all attempted/succeeded steps before emitting the halt.

### Step 2.3 — Delete remote branch

Guard: run `git ls-remote --heads origin feature/<feature>`. If output is empty → skip (already deleted), record as succeeded.

Otherwise, append `"branch_delete_remote"` to `steps_attempted`. Run:

```bash
git push origin --delete feature/<feature>
```

On success: append `"branch_delete_remote"` to `steps_succeeded`.
On failure: set `step_failed = "branch_delete_remote"` if not already set. Capture error.

### Step 2.4 — Prune worktree references

Append `"worktree_prune"` to `steps_attempted`. Run:

```bash
git worktree prune
```

This command is non-destructive and idempotent. On success: append `"worktree_prune"` to `steps_succeeded`.
On failure: set `step_failed = "worktree_prune"` if not already set. Capture error.

### Step 2.5 — Partial-failure capture

If `step_failed` is non-null (any cleanup step failed), write `PRPs/reports/<feature>/approve-halt.json`:

```json
{
  "steps_attempted": ["worktree_remove", "branch_delete_local", "..."],
  "steps_succeeded": ["worktree_remove", "..."],
  "step_failed": "<step_name>",
  "error": "<stderr from the failing command>",
  "manual_recovery_steps": [
    "Check: git worktree list",
    "Check: git branch --list feature/<feature>",
    "Check: git ls-remote --heads origin feature/<feature>",
    "If worktree still present: git worktree remove --force .worktrees/<feature>/",
    "If local branch still present: git branch -d feature/<feature>",
    "If remote branch still present: git push origin --delete feature/<feature>",
    "If stale worktree refs: git worktree prune"
  ]
}
```

Emit an actionable message:

> CLEANUP PARTIAL FAILURE: Step `<step_failed>` failed during post-merge cleanup.
> Steps succeeded: `<steps_succeeded>`.
> The PR has been MERGED — the merge is irreversible. The cleanup failure is NOT a regression.
> Partial state written to `PRPs/reports/<feature>/approve-halt.json`.
> Manual recovery steps are in that file.
> The docs cycle will now run. Re-run `/relay-approve <pr>` after manual cleanup to skip the merge step (already merged) and retry docs.

**Proceed to Phase 3** (the docs cycle runs regardless of cleanup partial failure — the merge is done and the knowledge base should be updated).

---

## Phase 3: DOCS CYCLE

If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip this phase entirely and proceed to Phase 4 (log a one-line skip note naming which of the two gated it). Record `docs_sync_outcome = "SKIPPED (--no-docs)"` when `no_docs_flag == true` (checked first — `--no-docs` takes precedence over `docs_sync_enabled` when both are true), otherwise `docs_sync_outcome = "SKIPPED (docs_sync: false)"` when only `docs_sync_enabled == false` triggered the skip.

This pass is **idempotent** against implement-time sync: when `/relay-implement`'s own docs-sync sub-phase (Phase A.3.5) already synced `docs/` for this feature, `docs-updater`'s comparison logic evaluates against the *current* state of each target file (not merely diff presence), so an edit already present in `docs/` produces no delta on this second pass — operators should expect a low-delta or near-empty manifest in that case, not treat it as a failure. The `docs-updater` invocation for this phase may also consult the implement-time manifest at `PRPs/reports/<feature>/docs-update.md` (when present) to avoid re-proposing edits already applied — noted here as documentation of existing/expected behavior, not a new agent input or contract change.

Set:
```
docs_review_attempts = 0
max_docs_review_retries = 2
prior_feedback = null
```

### Step 3.1 — Dispatch docs-updater (writer)

Use `Task` to dispatch the `docs-updater` agent, passing:
- `pr`: the `<pr>` argument (PR number or URL)
- `target_root`: the absolute path to the repository root

The docs-updater will:
1. Read `PRPs/reports/<feature>/orchestrator-run.json` to extract `feature` and `prd_path`.
2. Read the merged diff via `gh pr diff <pr>`.
3. Make surgical, additive-only updates to the `docs/` knowledge base.
4. Write `PRPs/reports/<feature>/docs-update.md` ending `*Status: DRAFT*`.
5. Emit the verbatim handoff confirmation.

If `prior_feedback` is non-null (this is a retry), pass the prior feedback to the docs-updater so it can address the failing `D-R<i>` items from the previous docs-reviewer run.

Wait for the docs-updater to complete.

### Step 3.2 — Dispatch docs-reviewer (reviewer)

Use `Task` to dispatch the `docs-reviewer` agent, passing:
- `pr`: the `<pr>` argument
- `target_root`: the absolute path to the repository root

The docs-reviewer will:
1. Read the manifest at `PRPs/reports/<feature>/docs-update.md`.
2. Run the 8-item rubric (D-R1..D-R8).
3. Append a verdict object to `PRPs/reports/<feature>/docs-review.jsonl`.
4. Either flip the manifest to `*Status: APPROVED*` (on APPROVED), or emit the failing `D-R<i>` IDs + reasons and exit without flipping (on CHANGES_REQUESTED).

Wait for the docs-reviewer to complete.

### Step 3.3 — Evaluate docs-reviewer verdict

**On CHANGES_REQUESTED:**

Increment `docs_review_attempts`. Capture the failing `D-R<i>` IDs from the docs-reviewer output as `current_failing_ids`.

Set `prior_feedback = current_failing_ids`.

If `docs_review_attempts > max_docs_review_retries`, HALT:

> FAILED_DOCS_REVIEW_BUDGET_EXCEEDED: The docs-reviewer returned CHANGES_REQUESTED `<docs_review_attempts>` time(s) (max_docs_review_retries=`<max_docs_review_retries>`).
> Last failing rubric items: `<current_failing_ids>`.
> The PR has been MERGED and the cleanup has been performed.
> Docs manifest left at *Status: DRAFT* at `PRPs/reports/<feature>/docs-update.md`.
> Manual recovery: review the failing D-R<i> items in `PRPs/reports/<feature>/docs-review.jsonl`, edit the docs manually, then re-run `/relay-approve <pr> --no-docs` and commit+push the docs separately.

Else: loop back to Step 3.1 with the prior feedback.

**On APPROVED:**

Proceed to Step 3.4.

### Step 3.4 — Confirm manifest status

Re-read `PRPs/reports/<feature>/docs-update.md` and confirm it ends with `*Status: APPROVED*`. If the file does not end with `*Status: APPROVED*`, treat as CHANGES_REQUESTED (docs-reviewer may have failed to flip) and re-evaluate per Step 3.3.

---

## Phase 4: DOCS COMMIT + PUSH

If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip this phase entirely (log a one-line skip note naming which of the two gated it). Record `docs_sync_outcome = "SKIPPED (--no-docs)"` when `no_docs_flag == true` (checked first — `--no-docs` takes precedence over `docs_sync_enabled` when both are true), otherwise `docs_sync_outcome = "SKIPPED (docs_sync: false)"` when only `docs_sync_enabled == false` triggered the skip.

### Step 4.1 — Stage docs changes

From the repo root, stage all modified files under `docs/` and root memory files (`CLAUDE.md`, `docs/KNOWLEDGE_BASE.md`) that the docs-updater modified. Do not stage files outside the docs KB scope.

```bash
git add docs/ CLAUDE.md docs/KNOWLEDGE_BASE.md
```

Only stage files that were actually modified by the docs-updater (verify with `git diff --cached` before committing).

### Step 4.2 — Commit

Determine the base branch. Read from `orchestrator-run.json` if available, or detect via `git remote show origin | grep 'HEAD branch'` as a fallback.

Run:

```bash
git commit -m "docs(<feature>): sync knowledge base post-merge"
```

NEVER pass `--no-verify`. Pre-commit hooks are project quality gates and must run.

On failure, surface the error. Do NOT proceed to Step 4.3.

### Step 4.3 — Push

```bash
git push origin <base-branch>
```

On success: proceed to Phase 5.

On failure (protected base branch or other rejection), HALT with the docs commit kept locally:

> FAILED_DOCS_PUSH_BLOCKED: Push to `<base-branch>` was rejected.
> Error: <stderr>
> The PR has been MERGED, cleaned up, and the docs commit is retained locally.
> Recovery options:
>   1. If branch protection can be bypassed: git push origin <base-branch> --no-verify (if hooks block) or adjust protection settings, then push.
>   2. Create a docs PR manually: git push origin docs/<feature>-post-merge && gh pr create --title "docs(<feature>): sync knowledge base post-merge" --base <base-branch> --head docs/<feature>-post-merge.
>   3. Re-run `/relay-approve <pr> --no-docs` to skip the docs cycle on the next attempt after manually committing the docs.

---

## Phase 5: OUTPUT + WRITE-BACK

### Step 5.1 — Emit structured summary

Emit:

> /relay-approve complete for PR `<pr>` (feature: `<feature>`).
>
> Merge:      MERGED at `<mergedAt>`
> Cleanup:    worktree removed, local branch deleted, remote branch deleted, prune complete
> Docs:       [APPROVED + pushed to `<base-branch>` | skipped (--no-docs) | skipped (docs_sync: false) | APPROVED + push FAILED (see FAILED_DOCS_PUSH_BLOCKED)]
> Manifest:   PRPs/reports/<feature>/docs-update.md — *Status: APPROVED*
> Verdict log: PRPs/reports/<feature>/docs-review.jsonl
>
> Next: the feature is closed out. The knowledge base has been synced and the docs commit is on `<base-branch>`.

### Step 5.2 — Best-effort write-back to `orchestrator-run.json`

Attempt to read and update `PRPs/reports/<feature>/orchestrator-run.json` (best-effort, non-fatal on failure):

Add or update the following keys in the JSON:
```json
{
  "merged_at": "<ISO timestamp from gh pr view mergedAt>",
  "approve_outcome": "COMPLETE",
  "docs_outcome": "APPROVED" | "SKIPPED" | "FAILED_DOCS_PUSH_BLOCKED"
}
```

Write the file back. If the read/write fails for any reason, skip silently (the merge and cleanup succeeded; the write-back is informational).

---

## Constraints (hard rules)

1. **Never use `--delete-branch` local cleanup.** Merge from the repo root; perform local branch cleanup explicitly in Phase 2 in the collision-safe order. Avoids the cli/cli #13380 worktree+`--delete-branch` partial-failure trap.
2. **Never use `git branch -D` (force-delete).** Use `git branch -d` only. The branch is merged so `-d` succeeds; `-D` is denied by the settings allowlist.
3. **Never commit, push, or cleanup from inside `.worktrees/<feature>/`.** All git commands that target the base branch or remote run from the repo root.
4. **Never pass `--no-verify` to any git command.** Pre-commit and pre-push hooks are project quality gates and must run.
5. **Never write under `.claude/`.** All pipeline artifacts (`orchestrator-run.json`, `approve-halt.json`, `docs-update.md`, `docs-review.jsonl`) live under `PRPs/reports/<feature>/`. The docs KB writes are delegated to the docs-updater, whose own contract also forbids `.claude/` writes.
6. **Never prompt the user mid-run.** HALTs emit a verbatim message and the command exits. The docs-updater and docs-reviewer agents may reopen dialogue with the operator — that interactivity is a conscious, recorded extension of the boundary (see `docs/decisions.md` 2026-05-18) — but the command itself never prompts.
7. **Allowlist note.** The four new allow patterns (`gh pr merge *`, `git worktree remove *`, `git branch -d *`, `git push origin --delete feature/*`) are added to `docs/context/settings-allowlist.md` in Phase 3 of this PRD. Without them the autonomous run stalls on permission prompts.
8. **Partial-failure is captured, never swallowed.** If any cleanup step fails, the state is written to `approve-halt.json` with `{steps_attempted, steps_succeeded, step_failed, error, manual_recovery_steps}` and an actionable message is emitted. No step is silently skipped.
9. **Idempotent re-run.** Each destructive step is guarded by a state check. A fully-cleaned PR exits 0 immediately. A partially-cleaned PR skips the steps that already succeeded and retries the failed ones.
10. **Merge state detection via `gh pr view`, not exit code.** The `gh pr merge` exit code on an already-merged PR is undocumented (cli/cli #13345). State is always detected via `gh pr view --json state,mergedAt` first.

---

## What you do NOT do

- **Approve the PR or review the code** — the human and GitHub own merge-readiness; this command acts only on a PR the operator has decided to merge.
- **Auto-resolve merge conflicts** — a CONFLICTING or BLOCKED PR HALTs with `FAILED_PR_NOT_MERGEABLE`; conflict resolution is human work.
- **Write the `docs/` knowledge base yourself** — all docs edits are performed by the dispatched docs-updater agent; the command only commits + pushes what the agent wrote and the reviewer APPROVED.
- **Touch the `documentation/` HTML site** — out of scope; the site is maintained by each feature's own release-cut phase per `documentation/AGENTS.md`.
- **Write under `.claude/`** — all pipeline artifacts go to `PRPs/reports/<feature>/`.
- **Force-delete branches with `git branch -D`** — the settings allowlist permanently denies this; use `git branch -d` only.
- **Pass `--no-verify` to any git command** — hooks are quality gates and must run.
- **Operate on non-relay PRs** — a head branch not matching `feature/*` HALTs with `FAILED_NOT_A_RELAY_FEATURE`.
- **Flip the docs manifest yourself** — the docs-reviewer owns the DRAFT→APPROVED flip.
- **Prompt the user** — the command is deterministic; HALTs emit verbatim messages and exit.
