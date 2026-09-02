---
description: 'Local commit for relay Pillar 3, with two modes resolved from the argument. WORKTREE MODE (argument names an existing .worktrees/<arg>/): deterministic infra commit — verifies the worktree is on branch feature/<arg>, runs git status --porcelain for idempotency (clean → exit 0), generates a structured message from PRPs/reports/<arg>/orchestrator-run.json + PRD title (fallback feat(<arg>): implement via relay), stages with git -C .worktrees/<arg>/ add -A, commits (pre-commit hooks run; --no-verify never passed), points to /relay-pr. No LLM, no prompts. CURRENT-BRANCH MODE (no argument, or an argument that does not match a worktree — treated as a natural-language target description): reviews the working-tree diff in the current repo, interprets the description to scope which files to stage, flags files that probably should not be committed and asks the operator what to do, generates a concise conventional-commit message from the diff, then stages + commits on the current branch (pre-commit hooks run; --no-verify never passed). Never pushes, never makes network calls in either mode. Infra command analogous to prp-commit, extended with relay worktree conventions.'
argument-hint: '[feature-name | target description] (blank = review + commit current branch)'
---

# /relay-commit

**Arguments:** `$ARGUMENTS`

---

## Your mission

Create one local git commit. This command has **two modes**, selected
automatically from the argument in Phase 0:

- **Worktree mode** — the argument names an existing `.worktrees/<arg>/`.
  Deterministic infra path (the original relay behavior): verify the worktree
  branch, generate a structured commit message from pipeline artifacts, stage
  everything, and commit. No LLM judgment, no prompts. Points the operator to
  `/relay-pr <feature>`.

- **Current-branch mode** — no argument, OR an argument that does **not** match
  a worktree (treated as a natural-language *target description*, like
  `prp-commit`). Operates on the current repository/branch in the working
  directory: review the diff, interpret the description to scope which files to
  stage, flag files that probably should not be committed and ask the operator
  what to do, then write a concise conventional-commit message from the diff and
  commit.

Neither mode pushes or makes any network call — that belongs to `/relay-pr`.

This command is the relay adaptation of `prp-commit`. Worktree mode keeps the
4-phase structure (ASSESS → COMMIT MESSAGE → STAGE+COMMIT → OUTPUT) scoped via
`git -C .worktrees/<feature>/`; current-branch mode follows `prp-commit`'s
assess → interpret/stage → commit → output flow in the current directory, with
an added diff-review-and-confirm safety step.

See:
- the source PRD `relay-commit-command.prd.md`, in the relay plugin repo (not packaged) — AC-1 through AC-9; Decisions Log; git -C pattern
- `plugins/prp-core/commands/prp-commit.md` — structural reference for current-branch mode

---

## Per-member iteration (workspace mode)

When the target project declares a `## Repository topology` (see
`${CLAUDE_PLUGIN_ROOT}/resources/repository-topology.md`), worktree mode runs its
flow ONCE PER participating member: verify the branch, run
`git status --porcelain` for idempotency, stage and commit. A member whose
worktree is clean is a SKIP, not a failure — a cross-repo feature does not
necessarily touch every member.

Record a per-member outcome so a partial failure names the repository. Message
generation is unchanged, and `--no-verify` is never passed in any member.

**When no topology is declared, the flow runs exactly once against the one
worktree, unchanged.**

---

## Phase 0: MODE ROUTING

Trim `$ARGUMENTS`. Record the trimmed value as `<arg>` (may be empty).

Decide the mode:

1. If `<arg>` is **non-empty** AND `.worktrees/<arg>/` **exists on disk** →
   **Worktree mode**. Set `<feature>` = `<arg>` and proceed to **Section A**.
2. Otherwise → **Current-branch mode**. The `<arg>` (if any) is a *target
   description*, not a feature name. Proceed to **Section B**.

> Precedence note: an existing worktree always wins. A non-empty `<arg>` that is
> meant to be a feature name but has no matching `.worktrees/<arg>/` is treated
> as a target description against the current branch (it will not HALT). If you
> intended worktree mode, run `/relay-worktree <arg>` first, then re-run.

---

# Section A — Worktree mode

Reached when `<arg>` names an existing `.worktrees/<feature>/`. Deterministic
and non-interactive. All git operations use the `git -C .worktrees/<feature>/`
prefix.

## A.-1 — Lane-branch integration (runs before the branch check)

List the branches matching `feature/<feature>-lane-*` in this repository:

```bash
git -C <repo_root> branch --list "feature/<feature>-lane-*"
```

**If none exist, this step is a complete no-op** and A.0 proceeds exactly as it
does today. That is the single-lane case, and it must stay byte-identical.

Otherwise, for each matched branch in **ascending lane order**, merge it into
`feature/<feature>`:

```bash
git -C <repo_root>/.worktrees/<feature>/ merge --no-ff feature/<feature>-lane-<k>
```

Then continue to A.0, which will now find the branch it expects.

**On a merge conflict**, HALT:

> FAILED_LANE_INTEGRATION_CONFLICT: merging `feature/<feature>-lane-<k>` into
> `feature/<feature>` conflicted on `<path>`.
> Lanes are disjoint by construction — a lane is a connected component of the
> `Depends` graph, so two lanes touching one file means the source PRD's
> `Depends` column was WRONG about their independence. This is a correctness
> finding about the PRD, not a routine merge failure.
> Do NOT auto-resolve: resolving it produces a working branch and destroys the
> only signal that the dependency graph misdescribes the work.
> Inspect `<path>`, correct the PRD's `Depends` cells so the two phases share a
> lane, and re-run the affected phases.

The authority for lane branch names, ordering and the conflict semantics is
`${CLAUDE_PLUGIN_ROOT}/resources/lane-model.md`; the rules are not restated here.

## A.0 — Branch check

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ branch --show-current
```

If the result is NOT `feature/<feature>`, HALT:

> FAILED_WRONG_BRANCH: `.worktrees/<feature>/` is checked out on branch `<actual-branch>`,
> not the expected branch `feature/<feature>`.
> Verify the worktree was created by /relay-worktree and not manually switched.
> Resolve the branch manually:
>   git -C <repo_root>/.worktrees/<feature>/ checkout feature/<feature>
> Then re-run `/relay-commit <feature>`.

## A.1 — ASSESS

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ status --porcelain
```

If the output is **empty** (clean worktree — no uncommitted changes), exit 0:

> Nothing to commit — worktree at `.worktrees/<feature>/` is already clean.
> Next: `/relay:relay-pr <feature>`

Do not proceed. If the output is **non-empty**: continue to A.2.

## A.2 — COMMIT MESSAGE

Generate the message from structured context without user input.

**Step 1 — Read audit log:** Read `PRPs/reports/<feature>/orchestrator-run.json`.
If it exists and is valid JSON, extract the `prd_path` field.

**Step 2 — Extract PRD title:** Read the file at `prd_path`. Find the first line
that starts with `# ` and extract everything after `# ` as `<prd-title>`.

**Step 3 — Compose message:**

```
feat(<feature>): <prd-title>
```

**Fallback** — use `feat(<feature>): implement via relay` when any of these apply:
- `PRPs/reports/<feature>/orchestrator-run.json` is absent or unreadable
- The JSON is invalid or does not contain a `prd_path` field
- The file at `prd_path` is absent or unreadable
- The PRD has no `# ` heading line

Record internally whether the fallback was used (noted in A.4 output).

## A.3 — STAGE + COMMIT

**Step 1 — Stage all changes:**

```bash
git -C <repo_root>/.worktrees/<feature>/ add -A
```

**Step 2 — Preview staged changes:**

```bash
git -C <repo_root>/.worktrees/<feature>/ diff --cached --stat
```

**Step 3 — Commit:**

```bash
git -C <repo_root>/.worktrees/<feature>/ commit -m "<generated-or-fallback-message>"
```

Allow pre-commit hooks to run. Do **NOT** pass `--no-verify`.

If the commit command exits non-zero, surface the verbatim stderr and HALT:

> Commit failed. See above for details.
> If a pre-commit hook failed, resolve the issue manually and re-run `/relay-commit <feature>`.

## A.4 — OUTPUT

**Step 1 — Confirm:**

```bash
git -C <repo_root>/.worktrees/<feature>/ log -1 --oneline
```

**Step 2 — Emit:**

```
**Committed**: <hash-and-message>
**Branch**: feature/<feature>

Next: `/relay:relay-pr <feature>`
```

If A.2 used the fallback message, add one line after `**Committed**`:

> Note: commit message used fallback `feat(<feature>): implement via relay` — `PRPs/reports/<feature>/orchestrator-run.json` was absent or unreadable.

---

# Section B — Current-branch mode

Reached when there is no argument, or when `<arg>` does not match a worktree (in
which case `<arg>` is a target description). All git operations run in the
current working directory (no `git -C`, no worktree path).

## B.1 — ASSESS

Run:

```bash
git status --porcelain
```

If the output is **empty** (clean working tree), exit 0:

> Nothing to commit — the working tree is already clean.

Do not proceed. If non-empty: continue to B.2.

## B.2 — REVIEW THE DIFF

Understand what would be committed before staging anything.

**Step 1 — Survey the changes:**

```bash
git status --short
git diff --stat
```

Also inspect the actual changes when you need detail:

```bash
git diff            # unstaged
git diff --staged   # already-staged
```

**Step 2 — Interpret the target description** (`<arg>`). If `<arg>` is empty,
the target is **all changes**. Otherwise map it to a staging intent:

| Input | Intended scope |
|-------|----------------|
| (blank) | all changes (`git add -A`) |
| `staged` | only what is already staged |
| `*.ts` / `typescript files` | files matching the glob/type |
| `files in src/X` | `src/X/` |
| `except <thing>` | all changes, then unstage paths matching `<thing>` |
| `only new files` | untracked files only |
| `the <X> changes` | the files implementing `<X>`, inferred from the diff |

**Step 3 — Flag files that probably should NOT be committed.** Scan the changed
paths and the diff content for likely-unwanted entries, for example:

- Secrets / credentials: `.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, files
  whose diff introduces obvious tokens/passwords/API keys
- Build / dependency artifacts: `dist/`, `build/`, `node_modules/`, `target/`,
  `__pycache__/`, `*.pyc`, coverage output
- Editor / OS / local cruft: `.vscode/` private settings, `.idea/`, `.DS_Store`,
  `*.local`, `*.swp`
- Large binaries or data dumps that look accidental
- Debug scaffolding left in the diff: stray `console.log` / `print` / `debugger`,
  commented-out blocks, `TODO: remove`, scratch files

This is judgment, not a fixed list — surface anything that looks accidental.

**Step 4 — If any suspicious files were found, ASK the operator what to do.**
Present the flagged paths with a one-line reason each, and ask whether to exclude
them, commit them anyway, or abort. Honor the answer:

- *Exclude* → leave those paths unstaged (or unstage them after a broad add).
- *Commit anyway* → include them.
- *Abort* → stop without committing and report that nothing was committed.

If **no** files are flagged, proceed without prompting.

## B.3 — STAGE

Stage according to the target interpretation from B.2, minus anything the
operator chose to exclude. Examples:

```bash
git add -A                       # blank target, nothing excluded
git add "*.ts"                   # a glob/type target
git reset -- path/to/exclude     # drop an excluded path after a broad add
```

Show exactly what will be committed:

```bash
git diff --cached --stat
git diff --cached --name-only
```

If, after exclusions, nothing is staged, stop:

> Nothing staged after applying the target / exclusions — no commit created.

## B.4 — COMMIT MESSAGE + COMMIT

Write a concise message in imperative mood from the staged diff:

```
<type>(<scope>): <summary>
```

- `<type>` ∈ `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`,
  `ci` — chosen from what the diff actually does.
- `<scope>` optional; derive from the dominant changed area when it is clear.
- Add a short body (blank line, then bullet lines) only when the change set is
  large or spans multiple concerns.

Commit (allow pre-commit hooks; never pass `--no-verify`):

```bash
git commit -m "<message>"
```

If the commit exits non-zero, surface the verbatim stderr and HALT:

> Commit failed. See above for details.
> If a pre-commit hook failed, resolve the issue manually and re-run `/relay-commit`.

## B.5 — OUTPUT

```bash
git log -1 --oneline
```

Emit:

```
**Committed**: <hash-and-message>
**Branch**: <current-branch>
**Files**: <count> file(s) (+<add>/-<del>)

Next: review with `git log -1`, then `git push` or `/relay:relay-pr <feature>`.
```

---

## Constraints (hard rules)

**Universal (both modes):**

1. **Never push, never make any network call.** Local commit only; all network
   operations belong to `/relay-pr`.
2. **Never pass `--no-verify`.** Pre-commit hooks must run; they represent
   project quality gates.
3. **Never modify plans, PRDs, or any pipeline artifacts.** This command only
   writes a git commit.
4. **Never write under `.claude/`.** This command has no filesystem output of its
   own (only a git commit).
5. **Never amend, rebase, or cherry-pick.** Out of scope; escape hatch is manual git.
6. **Allowlist note.** All required git patterns (`git status*`, `git add *`,
   `git commit *`, `git diff*`, `git log*`, `git branch*`, `git reset*`) are
   already present in `${CLAUDE_PLUGIN_ROOT}/resources/settings-allowlist.md`. No new allowlist
   entries are needed for this command.

**Worktree mode only:**

7. **All git operations use the `git -C .worktrees/<feature>/` prefix.** Never
   `cd .worktrees/<feature>/ && git ...` — `-C` works on both Unix and Windows.
8. **Never prompt the user.** Worktree mode is deterministic; HALTs are verbatim
   and the command exits.

**Current-branch mode only:**

9. **Only prompt for the suspicious-file decision.** Do not turn the commit into
   an open-ended interview — the single confirmation in B.2 Step 4 is the only
   interaction, and only when something is actually flagged.
10. **Stage exactly what the target description selects** (minus exclusions).
    Do not silently widen scope beyond the operator's stated target.

---

## What you do NOT do

- **Push or open PRs** — `/relay-pr` owns that step; `/relay-commit` is local-only.
- **Suppress hooks with `--no-verify`** — hooks are project quality gates.
- **Create, modify, or read `.claude/` directories** — no `.claude/` writes.
- **Invoke any agent or writer/reviewer pair** — current-branch mode uses inline
  judgment for the message and the suspicious-file scan, but spawns no agents.
- **Retry after a failed commit** — surface the verbatim error and HALT; operator
  resolves manually.
- **Amend, rebase, or cherry-pick** — manual git escape hatch if needed.
- **HALT in current-branch mode just because an argument did not match a
  worktree** — that argument is a target description by design (Phase 0).
