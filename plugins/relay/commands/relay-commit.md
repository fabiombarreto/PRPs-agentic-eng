---
description: 'Deterministic local commit for relay Pillar 3. Accepts a <feature-name> argument; resolves .worktrees/<feature>/ and verifies the worktree is on branch feature/<feature>; runs git status --porcelain for idempotency (clean worktree → exit 0 with next-step pointer); generates a structured commit message from PRPs/reports/<feature>/orchestrator-run.json + PRD title with fallback to feat(<feature>): implement via relay; stages with git -C .worktrees/<feature>/ add -A; commits with git -C .worktrees/<feature>/ commit -m "<message>" (pre-commit hooks allowed; --no-verify never passed); emits commit hash, branch, and Next: /relay-pr <feature>. No push, no network calls, no LLM, no writer/reviewer split. Infra command analogous to prp-commit, adapted for relay worktree conventions.'
argument-hint: <feature-name>
---

# /relay-commit

**Arguments:** `$ARGUMENTS`

---

## Your mission

Accept the `<feature>` argument, resolve `.worktrees/<feature>/`, verify the worktree branch, check for uncommitted changes, generate a structured commit message, and create a local git commit. You are a deterministic infra command — no LLM dispatch, no writer/reviewer split, no agent, no network calls. You make one git commit (or exit idempotently with "Nothing to commit" if the worktree is already clean), then point the operator to `/relay-pr <feature>` as the next step.

This command is the relay adaptation of `prp-commit` — it uses the same 4-phase structure (Phase 1 ASSESS → Phase 2 COMMIT MESSAGE → Phase 3 STAGE+COMMIT → Phase 4 OUTPUT) but prefixes Phase 0 Preconditions for worktree-specific validation and scopes all git operations via `git -C .worktrees/<feature>/` rather than operating in cwd.

See:
- `PRPs/prds/relay-commit-command.prd.md` — source PRD; AC-1 through AC-5; Decisions Log; git -C pattern
- `plugins/prp-core/commands/prp-commit.md` — structural reference for Phases 1–4

---

## Phase 0: PRECONDITIONS

### P0 — Argument non-empty

If `$ARGUMENTS` is blank or whitespace after trimming, HALT:

> /relay-commit requires a feature name. Usage:
>   /relay-commit <feature-name>
> Example:
>   /relay-commit my-feature-name

Record the trimmed argument as `<feature>`.

### P1 — Worktree exists

Check that `.worktrees/<feature>/` exists on disk. If the path is absent, HALT:

> FAILED_MISSING_WORKTREE: `.worktrees/<feature>/` does not exist.
> Run `/relay-worktree <feature>` first to create the isolated worktree,
> then re-run `/relay-commit <feature>`.

### P2 — Branch check

Run:

```bash
git -C .worktrees/<feature>/ branch --show-current
```

If the result is NOT `feature/<feature>`, HALT:

> FAILED_WRONG_BRANCH: `.worktrees/<feature>/` is checked out on branch `<actual-branch>`,
> not the expected branch `feature/<feature>`.
> Verify the worktree was created by /relay-worktree and not manually switched.
> Resolve the branch manually:
>   git -C .worktrees/<feature>/ checkout feature/<feature>
> Then re-run `/relay-commit <feature>`.

---

## Phase 1: ASSESS

Run:

```bash
git -C .worktrees/<feature>/ status --porcelain
```

If the output is **empty** (clean worktree — no uncommitted changes), exit 0:

> Nothing to commit — worktree at `.worktrees/<feature>/` is already clean.
> Next: `/relay:relay-pr <feature>`

Do not proceed to Phase 2.

If the output is **non-empty**: proceed to Phase 2.

---

## Phase 2: COMMIT MESSAGE

Generate the commit message from structured context without user input.

**Step 1 — Read audit log:**

Read `PRPs/reports/<feature>/orchestrator-run.json`. If the file exists and is valid JSON, extract the `prd_path` field.

**Step 2 — Extract PRD title:**

Read the file at `prd_path`. Find the first line that starts with `# ` and extract everything after `# ` as `<prd-title>`.

**Step 3 — Compose message:**

```
feat(<feature>): <prd-title>
```

**Fallback** — use `feat(<feature>): implement via relay` when any of these apply:
- `PRPs/reports/<feature>/orchestrator-run.json` is absent or unreadable
- The JSON is invalid or does not contain a `prd_path` field
- The file at `prd_path` is absent or unreadable
- The PRD has no `# ` heading line

Record internally whether the fallback was used (noted in Phase 4 output).

---

## Phase 3: STAGE + COMMIT

**Step 1 — Stage all changes:**

```bash
git -C .worktrees/<feature>/ add -A
```

**Step 2 — Preview staged changes:**

```bash
git -C .worktrees/<feature>/ diff --cached --stat
```

**Step 3 — Commit:**

```bash
git -C .worktrees/<feature>/ commit -m "<generated-or-fallback-message>"
```

Allow pre-commit hooks to run. Do **NOT** pass `--no-verify`. Hooks represent project quality gates.

If the commit command exits non-zero (e.g., hook failure or other error), surface the verbatim stderr and HALT:

> Commit failed. See above for details.
> If a pre-commit hook failed, resolve the issue manually and re-run `/relay-commit <feature>`.

---

## Phase 4: OUTPUT

**Step 1 — Confirm commit:**

```bash
git -C .worktrees/<feature>/ log -1 --oneline
```

**Step 2 — Emit structured output:**

```
**Committed**: <hash-and-message>
**Branch**: feature/<feature>

Next: `/relay:relay-pr <feature>`
```

If Phase 2 used the fallback message, add one additional line after `**Committed**`:

> Note: commit message used fallback `feat(<feature>): implement via relay` — `PRPs/reports/<feature>/orchestrator-run.json` was absent or unreadable.

---

## Constraints (hard rules)

1. **Never push, never make any network call.** Local commit only; all network operations belong to `/relay-pr`.
2. **Never pass `--no-verify`.** Pre-commit hooks must run; they represent project quality gates.
3. **Never modify plans, PRDs, or any pipeline artifacts.** This command only writes a git commit to the worktree.
4. **Never write under `.claude/`.** This command has no filesystem output of its own (only a git commit).
5. **All git operations use `git -C .worktrees/<feature>/` prefix.** Never `cd .worktrees/<feature>/ && git ...` — the `-C` pattern works on both Unix and Windows without a shell `cd`.
6. **Never amend, rebase, or cherry-pick.** Out of scope; escape hatch is manual git.
7. **Never prompt the user.** HALTs are verbatim and the command exits; do not ask for confirmation.
8. **Allowlist note.** All required git patterns (`git status*`, `git add *`, `git commit *`, `git diff*`, `git log*`, `git branch*`) are already present in `docs/context/settings-allowlist.md:52-65`. No new allowlist entries are needed for this command.

---

## What you do NOT do

- **Push or open PRs** — `/relay-pr` owns that step; `/relay-commit` is local-only.
- **Selectively stage files** — `git add -A` commits all changes; partial commits require manual git.
- **Suppress hooks with `--no-verify`** — hooks are project quality gates and must run.
- **Create, modify, or read `.claude/` directories** — no `.claude/` writes.
- **Invoke any agent or writer/reviewer pair** — purely deterministic infra command.
- **Retry after a failed commit** — surface the verbatim error and HALT; operator resolves manually.
- **Amend, rebase, or cherry-pick** — manual git escape hatch if needed.
