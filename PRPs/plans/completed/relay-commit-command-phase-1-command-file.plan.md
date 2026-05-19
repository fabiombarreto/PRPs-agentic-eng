# Feature: Command file (Phase 1 of relay-commit-command)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin marketplace; Pillar 3 three-command split; Pillar 2/3 boundary decision 2026-05-18)
- Activated criteria: new infra command file in plugins/relay/commands/; Pillar 3 first command (/relay-commit); deterministic git operations only (no LLM, no writer/reviewer split); references 2026-05-18 Pillar 3 split + 2026-05-18 Pillar 2/3 boundary + git -C worktree-scoped pattern + prp-commit structural analogy; .claude/settings.json allowlist already covers all required git patterns
- Decisions found:
  - 2026-05-18 Pillar 3 command surface: /relay-commit + /relay-pr + /relay-approve — /relay-commit is local-only commit, idempotent, no push, deterministic infra command; no writer/reviewer split, no LLM
  - 2026-05-18 Pillar 2/3 boundary: /relay-execute terminates with uncommitted changes; /relay-commit is the exclusively authorized commit step; /relay-execute hard rule #11 prohibits committing
  - Command surface writer/reviewer split (docs/decisions.md, 2026-04-19) — /relay-commit is infra-class (deterministic, no LLM, no rubric); no companion reviewer
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19) — command file at plugins/relay/commands/; no .claude/ writes in this phase
  - Plugin manifest version bump on every minor/major release shipping a plugin asset (docs/decisions.md, 2026-04-30) — relay-commit.md is a new plugin asset requiring a version bump in plugin.json (Phase 2 deliverable, not this phase)
  - git -C pattern for worktree-scoped git operations (established by relay-worktree.md precedent) — `git -C .worktrees/<feature>/ <subcommand>` scopes all git ops to the worktree without requiring cd; works on both Unix and Windows
  - .claude/settings.json allowlist: git status*, git add *, git commit *, git diff*, git log*, git branch* already present in docs/context/settings-allowlist.md:52-65 — no new allowlist entries needed for relay-commit
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66) — command file goes to plugins/relay/commands/; no .claude/ writes in this phase; the command itself produces no filesystem artifacts (only a git commit)
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:79-84) — all required git patterns already declared in settings-allowlist.md; relay-commit must not require new manual approvals
- Applicable architectural rules:
  - Pillar 3 owns the full commit → push → PR → merge lifecycle; /relay-execute is permanently prohibited from committing (hard rule #11 in relay-execute.md)
  - Happy path: /relay-prd → /relay-execute → (human validates) → /relay-commit → /relay-pr → /relay-approve
  - One command per stage; no LLM, no rubric for deterministic infra commands (/relay-commit is analogous to /relay-worktree: infra-class, no agent dispatch)
  - Interactivity boundary: /relay-commit runs after the human validation gate; the command is deterministic and human-triggered
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-commit-command.prd.md` — Implementation Phases row 1: "Command file" — Goal: Produce `plugins/relay/commands/relay-commit.md` with complete, unambiguous protocol — Success signal: File exists; human reads Phases 0–4 and finds no ambiguity; prp-commit analog is recognizable; all 5 ACs are addressable from the protocol text.

## Summary

Phase 1 delivers a single markdown command file at `plugins/relay/commands/relay-commit.md`. The file mirrors the 4-phase structure of `plugins/prp-core/commands/prp-commit.md` (Phase 1 ASSESS → Phase 2 COMMIT MESSAGE → Phase 3 STAGE+COMMIT → Phase 4 OUTPUT), adapted for relay's worktree architecture. Relay-specific additions are: a Phase 0 Preconditions block (argument validation, worktree existence check, branch verification) before Phase 1; a commit-message generation phase that reads `PRPs/reports/<feature>/orchestrator-run.json` + the PRD title before staging; and a `git -C .worktrees/<feature>/` prefix on all git operations to scope them to the worktree without requiring `cd`. The command is purely deterministic (no LLM, no writer/reviewer split, no rubric), idempotent via `git status --porcelain` (clean worktree → exit 0 with structured message), and makes no network calls (local commit only, permanently). No companion agent, no docs updates, and no plugin version bump are part of this phase.

## User Story

```
As a relay operator who has validated the output of /relay-execute
I want to run /relay-commit <feature> to commit all pipeline changes locally
So that I can advance to /relay-pr <feature> without any manual git ceremony
```

## Problem Statement

After `/relay-execute` completes, the working tree in `.worktrees/<feature>/` holds uncommitted implementation changes. There is no structured way to commit these changes with a context-aware message, verify branch correctness, or ensure idempotency. The operator must currently run `cd .worktrees/<feature>/ && git add -A && git commit -m "..."` manually — with no structured message, no idempotency check, and no integration with the pipeline's audit trail. Phase 1 installs the missing link by shipping `plugins/relay/commands/relay-commit.md`, the first command of Pillar 3.

## Solution Statement

Author `plugins/relay/commands/relay-commit.md` as a deterministic infra command (no LLM, no agent) that: (a) parses `<feature>` from its argument; (b) runs preconditions (worktree existence check, branch verification); (c) checks `git -C .worktrees/<feature>/ status --porcelain` for idempotency (empty output → exit 0 with "Nothing to commit"); (d) generates a commit message from `PRPs/reports/<feature>/orchestrator-run.json` + PRD title, with fallback to `feat(<feature>): implement via relay`; (e) stages with `git -C .worktrees/<feature>/ add -A` and commits with `git -C .worktrees/<feature>/ commit -m "<message>"`; (f) emits a structured output block with commit hash, branch, and "Next: `/relay-pr <feature>`".

## Metadata

| Key | Value |
|-----|-------|
| Type | New command file (markdown prompt) |
| Complexity | Low — deterministic infra command (no LLM, no loop); straight git operations scoped via -C; prp-commit is the proven structural reference |
| Systems Affected | `plugins/relay/commands/` (new file); runtime: `.worktrees/<feature>/` (git commit on the worktree's branch) |
| Dependencies | `plugins/prp-core/commands/prp-commit.md` (4-phase structural reference); `plugins/relay/commands/relay-worktree.md` (git -C pattern precedent and infra command shape); `docs/context/settings-allowlist.md:52-65` (git patterns already present — no new entries needed) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/relay-commit-command.prd.md` lines 247-248 (Implementation Phases table row 1) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| MUST | `PRPs/prds/relay-commit-command.prd.md` | 1-317 | Source PRD — full Decision Gate, AC-1 through AC-5, Decisions Log (structural pattern, commit message source, branch verification, hook execution, git -C pattern), Technical Risks, User Flow (lines 193-208), Architecture Notes (lines 218-234) |
| MUST | `plugins/prp-core/commands/prp-commit.md` | 1-86 | Canonical 4-phase structural reference — Phase 1 ASSESS (`git status --short`), Phase 2 INTERPRET & STAGE (`git add -A`), Phase 3 COMMIT (message format), Phase 4 OUTPUT (hash + count + next pointer). Every phase is adapted for relay worktree conventions. |
| MUST | `plugins/relay/commands/relay-worktree.md` | 1-55 | Frontmatter + Decision Gate section shape — the canonical infra command sibling; shows how to write the decision-gate block, argument-hint, and mission prose for a deterministic relay infra command with no LLM dispatch |
| MUST | `plugins/relay/commands/relay-worktree.md` | 66-168 | Parse arguments + Preconditions sections — shows the HALT message shape, slug sanitization contract, and the pattern for P-numbered preconditions with named HALT codes; adapt for /relay-commit's simpler argument (just `<feature>`, no optional flags in MVP) |
| SHOULD | `docs/context/settings-allowlist.md` | 52-65 | Git (always, non-destructive only) section — confirms all required patterns are present; documents that no new allowlist entries are needed; the Constraints section of relay-commit.md must state this explicitly |
| SHOULD | `plugins/relay/commands/relay-execute.md` | 699-702 | Success message naming /relay-commit as step 1 of Pillar 3 — confirms the command's context in the operator flow and the exact next-step instruction to mirror in Phase 4 output |

## Patterns to Mirror

### Pattern 1 — prp-commit 4-phase structure (structural reference)

# SOURCE: `plugins/prp-core/commands/prp-commit.md:1-86`

```markdown
---
description: Quick commit with natural language file targeting
argument-hint: [target description] (blank = all changes)
---

# Commit

**Target**: $ARGUMENTS

---

## Your Mission

Stage files matching the target, write a concise commit message, commit.

---

## Phase 1: ASSESS

```bash
git status --short
```

If nothing to commit, stop.

---

## Phase 2: INTERPRET & STAGE

**Target interpretation:**

| Input | Action |
|-------|--------|
| (blank) | `git add -A` (all changes) |

Stage the matching files. Show what will be committed:

```bash
git diff --cached --name-only
```

---

## Phase 3: COMMIT

Write a single-line message in imperative mood:

```
{type}: {description}
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

```bash
git commit -m "{type}: {description}"
```

---

## Phase 4: OUTPUT

```markdown
**Committed**: {hash} - {message}
**Files**: {count} files (+{add}/-{del})

Next: `git push` or `/prp-pr`
```
```

**Used by:** All 4 tasks. Adapt each phase: add Phase 0 Preconditions before Phase 1; replace `git status --short` with `git -C .worktrees/<feature>/ status --porcelain` in Phase 1 (empty = clean worktree = idempotent exit); insert relay-specific Phase 2 commit-message generation (read orchestrator-run.json + PRD title) before staging; replace `git add -A` with `git -C .worktrees/<feature>/ add -A` and `git commit` with `git -C .worktrees/<feature>/ commit -m "<message>"` in Phase 3; emit "Next: `/relay-pr <feature>`" in Phase 4.

---

### Pattern 2 — relay infra command frontmatter shape

# SOURCE: `plugins/relay/commands/relay-worktree.md:1-16`

```markdown
---
description: 'Deterministic git worktree creation for isolated feature development. Shells out git worktree add (D2 shell-out over EnterWorktree); derives the slug from a free argument or PRD basename (D3); enforces four preconditions with named HALT codes ...; no LLM dispatch, no writer/reviewer split, no agent. This is an infra command.'
argument-hint: <feature-name>
---

# /relay-worktree

**Arguments:** `$ARGUMENTS`

---

## Your mission

Parse the `<feature-name>` argument ..., run four preconditions, then create an isolated git worktree at `.worktrees/<feature>/` on branch `feature/<feature>`.

You are autonomous. You do not prompt the user. You do not invoke any agent.
```

**Used by:** Task 1 (frontmatter + title + mission). Adapt `description` for relay-commit: deterministic local commit; worktree-scoped git operations via `git -C`; prp-commit structural analogy; Phase 0 preconditions (worktree existence, branch check); idempotent clean-worktree exit via `git status --porcelain`; commit message from `orchestrator-run.json` + PRD title; fallback message; no push, no network calls, no LLM, no writer/reviewer split. Set `argument-hint: <feature-name>`.

---

### Pattern 3 — Precondition HALT message shape

# SOURCE: `plugins/relay/commands/relay-worktree.md:104-168`

```markdown
## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail.
No artifact is written and no git operation is performed on HALT.

### P1 — cwd is a git repository

Run `git rev-parse --show-toplevel`. If the command exits non-zero:

> FAILED_NOT_A_GIT_REPO: The current working directory is not a git repository.
> /relay-worktree requires a git repository to create a worktree.
> ...

### P2 — Base ref resolvable

...

### P3 — Path `.worktrees/<feature>/` state check

...FAILED_BRANCH_DIVERGENCE: The worktree at `.worktrees/<feature>/` is registered in
git but is checked out on branch `<actual-branch>`, not the expected branch
`feature/<feature>`.
```

**Used by:** Task 2 (Phase 0 Preconditions section). Adapt P-numbered block structure for relay-commit's simpler preconditions: P0 argument non-empty (HALT with usage message), P1 `.worktrees/<feature>/` exists (HALT instructing operator to run `/relay-worktree <feature>` first), P2 worktree branch is `feature/<feature>` (HALT showing actual vs expected). No idempotency check in Preconditions — that is Phase 1 ASSESS.

---

### Pattern 4 — relay infra command Final output surface shape

# SOURCE: `plugins/relay/commands/relay-worktree.md:292-332`

```markdown
## Final output surface

### Success path — new worktree created, bootstrap OK or absent

> Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Base ref: `<resolved-base>`. (Bootstrap: OK)

### HALT paths (named codes with actionable messages)

All HALT paths are defined verbatim in the Preconditions and Phase A sections above. Named codes:

- `FAILED_NOT_A_GIT_REPO` — P1: cwd is not a git repository.
- `FAILED_BASE_REF_MISSING` — P2: base ref does not resolve.
```

**Used by:** Task 4 (Phase 4 OUTPUT + Constraints + What you do NOT do). Adapt success messages for relay-commit: (a) committed path: "`**Committed**: <hash> — <message>` / `**Branch**: feature/<feature>` / `Next: /relay-pr <feature>`"; (b) clean worktree path (AC-2): "Nothing to commit — worktree at `.worktrees/<feature>/` is already clean. Next: `/relay-pr <feature>`". HALT paths use named codes with actionable messages.

---

### Pattern 5 — git -C worktree-scoped operation pattern

# SOURCE: `PRPs/prds/relay-commit-command.prd.md:228-234` (Architecture Notes)

```markdown
- Branch check: `git -C .worktrees/<feature>/ branch --show-current` must equal `feature/<feature>`
- Idempotency check: `git -C .worktrees/<feature>/ status --porcelain` — empty string → exit 0
- Stage + commit: `git -C .worktrees/<feature>/ add -A` then
  `git -C .worktrees/<feature>/ commit -m "<message>"`
- Confirm hash: `git -C .worktrees/<feature>/ log -1 --oneline`
- `git -C <path>` pattern scopes all git operations to the worktree directory without requiring `cd`; works on both Unix and Windows
```

**Used by:** Tasks 2, 3, and 4. Every git operation in the command file uses `git -C .worktrees/<feature>/` prefix, never `cd .worktrees/<feature>/ && git ...`. This pattern is required for Windows compatibility and is the established relay infra convention.

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-commit.md` | CREATE | The sole deliverable of Phase 1 — the Pillar 3 infra command that satisfies AC-1 through AC-5 |

## NOT Building (Scope Limits)

- **Push or PR creation** — exclusively owned by `/relay-pr`; relay-commit is local-only and makes no network calls
- **Interactive commit message editing** — message is generated from structured context; no `--message` flag in MVP (Could-item deferred to implementation)
- **Selective staging / cherry-pick** — `git add -A` commits all changes; partial commits require manual git
- **Amend of prior commits** — out of scope; escape hatch is manual `git commit --amend`
- **`--no-verify` flag** — project pre-commit hooks must run; suppressing them is out of scope
- **Writer/reviewer split** — `/relay-commit` is deterministic infra (no LLM, no rubric); no companion reviewer needed
- **Plugin version bump** — Phase 2 deliverable; `plugin.json` is not touched in Phase 1
- **Documentation updates** — Phase 2 deliverable; docs files are not touched in Phase 1
- **Appending commit hash to `orchestrator-run.json`** — Should-item; deferred to implementation if needed

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-commit.md` — frontmatter + title + mission

**ACTION**: Create the new file at `plugins/relay/commands/relay-commit.md`. Start with YAML frontmatter: `description` summarizing the command (deterministic local commit; worktree-scoped git operations via `git -C`; prp-commit structural analogy adapted for relay worktrees; Phase 0 preconditions including worktree existence check and branch verification; idempotent clean-worktree exit via `git status --porcelain`; commit message from `PRPs/reports/<feature>/orchestrator-run.json` + PRD title with fallback to `feat(<feature>): implement via relay`; no push, no network calls, no LLM, no writer/reviewer split; this is an infra command); set `argument-hint: <feature-name>`. Below frontmatter, add: title `# /relay-commit`, `**Arguments:** $ARGUMENTS` line, horizontal rule, and `## Your mission` prose (2 paragraphs: accept `<feature>` argument; resolve `.worktrees/<feature>/`; deterministic infra command analogous to prp-commit; no LLM dispatch; no writer/reviewer split; no agent). Optionally add a `## See` references block pointing at the source PRD and prp-commit.

**MIRROR**: Pattern 2 (relay-worktree frontmatter + mission prose at `plugins/relay/commands/relay-worktree.md:1-16`); Pattern 1 (prp-commit title + mission at `plugins/prp-core/commands/prp-commit.md:1-14`)

**VALIDATE**: `grep -q "argument-hint: <feature-name>" plugins/relay/commands/relay-commit.md && grep -q "## Your mission" plugins/relay/commands/relay-commit.md && echo "TASK1: PASS" || echo "TASK1: FAIL"`

---

### Task 2: ADD Phase 0 (Preconditions) + Phase 1 (ASSESS)

**ACTION**: Add `## Phase 0: PRECONDITIONS` section with three checks:

- **P0 — Argument non-empty**: if `$ARGUMENTS` is blank/whitespace after trimming, HALT with usage message:
  > `/relay-commit` requires a feature name. Usage:
  >   /relay-commit <feature-name>
  > Example:
  >   /relay-commit my-feature-name

- **P1 — Worktree exists**: verify that `.worktrees/<feature>/` exists on disk. If absent, HALT:
  > FAILED_MISSING_WORKTREE: `.worktrees/<feature>/` does not exist.
  > Run `/relay-worktree <feature>` first to create the isolated worktree,
  > then re-run `/relay-commit <feature>`.

- **P2 — Branch check**: run `git -C .worktrees/<feature>/ branch --show-current`. If the result is NOT `feature/<feature>`, HALT:
  > FAILED_WRONG_BRANCH: `.worktrees/<feature>/` is checked out on branch `<actual-branch>`,
  > not the expected branch `feature/<feature>`.
  > Verify the worktree was created by /relay-worktree and not manually switched.
  > Resolve the branch manually (`git -C .worktrees/<feature>/ checkout feature/<feature>`)
  > and re-run `/relay-commit <feature>`.

Then add `## Phase 1: ASSESS` analogous to prp-commit Phase 1:
- Run `git -C .worktrees/<feature>/ status --porcelain`
- If the output is empty (clean worktree): emit the AC-2 idempotent exit message and exit 0:
  > Nothing to commit — worktree at `.worktrees/<feature>/` is already clean.
  > Next: `/relay-pr <feature>`
- If non-empty: proceed to Phase 2.

**MIRROR**: Pattern 3 (precondition HALT shape at `plugins/relay/commands/relay-worktree.md:104-168`); Pattern 1 (Phase 1 ASSESS at `plugins/prp-core/commands/prp-commit.md:16-23`); Pattern 5 (git -C prefix for all git ops)

**VALIDATE**: `grep -q "FAILED_MISSING_WORKTREE" plugins/relay/commands/relay-commit.md && grep -q "FAILED_WRONG_BRANCH" plugins/relay/commands/relay-commit.md && grep -q "status --porcelain" plugins/relay/commands/relay-commit.md && grep -q "Nothing to commit" plugins/relay/commands/relay-commit.md && echo "TASK2: PASS" || echo "TASK2: FAIL"`

---

### Task 3: ADD Phase 2 (Commit message generation) + Phase 3 (Stage + Commit)

**ACTION**: Add `## Phase 2: COMMIT MESSAGE` section (relay-specific; no prp-commit analog):

1. Read `PRPs/reports/<feature>/orchestrator-run.json`. If the file exists and is valid JSON, extract the `prd_path` field.
2. Read the file at `prd_path`. Extract the first `# ` heading line as `<prd-title>` (everything after `# ` on that line).
3. Compose the commit message: `feat(<feature>): <prd-title>`.
4. **Fallback paths** (any of these conditions → use fallback `feat(<feature>): implement via relay`):
   - `orchestrator-run.json` is absent or unreadable
   - The JSON is unparseable or does not contain a `prd_path` field
   - The `prd_path` file is absent or unreadable
   - The PRD file has no `# ` heading line
5. Note internally whether the fallback was used (emitted in Phase 4 output).

Then add `## Phase 3: STAGE + COMMIT` analogous to prp-commit Phases 2+3:

1. Stage: `git -C .worktrees/<feature>/ add -A`
2. Preview staged changes: `git -C .worktrees/<feature>/ diff --cached --stat`
3. Commit: `git -C .worktrees/<feature>/ commit -m "<generated-or-fallback-message>"`
   - Allow pre-commit hooks to run. Do NOT pass `--no-verify`.
   - If the commit command exits non-zero (e.g., hook failure or other error): surface the verbatim stderr output and HALT:
     > Commit failed. See above for details.
     > If a pre-commit hook failed, resolve the issue manually and re-run `/relay-commit <feature>`.

**MIRROR**: Pattern 1 (prp-commit Phase 2 + Phase 3 at `plugins/prp-core/commands/prp-commit.md:25-62`); Pattern 5 (git -C prefix)

**VALIDATE**: `grep -q "orchestrator-run.json" plugins/relay/commands/relay-commit.md && grep -q "implement via relay" plugins/relay/commands/relay-commit.md && grep -q "git -C .worktrees" plugins/relay/commands/relay-commit.md && grep -q "add -A" plugins/relay/commands/relay-commit.md && grep -q "no-verify" plugins/relay/commands/relay-commit.md && echo "TASK3: PASS" || echo "TASK3: FAIL"`

---

### Task 4: ADD Phase 4 (Output) + Constraints + What you do NOT do

**ACTION**: Add `## Phase 4: OUTPUT` analogous to prp-commit Phase 4:

1. Confirm commit: `git -C .worktrees/<feature>/ log -1 --oneline` → capture `<hash-and-message>`.
2. Emit the structured output block (per PRD AC-1):
   ```
   **Committed**: <hash-and-message>
   **Branch**: feature/<feature>

   Next: `/relay-pr <feature>`
   ```
3. If Phase 2 used the fallback message: add one additional line after `**Committed**`:
   > Note: commit message used fallback `feat(<feature>): implement via relay` — `PRPs/reports/<feature>/orchestrator-run.json` was absent or unreadable.

Then add `## Constraints (hard rules)` section with these rules:
1. Never push, never make any network call — local commit only; all network operations belong to `/relay-pr`.
2. Never pass `--no-verify` — pre-commit hooks must run; they represent project quality gates.
3. Never modify plans, PRDs, or any pipeline artifacts — this command only writes a git commit to the worktree.
4. Never write under `.claude/` — this command has no filesystem output of its own.
5. All git operations use `git -C .worktrees/<feature>/` prefix — never `cd .worktrees/<feature>/ && git ...`.
6. Never amend, rebase, or cherry-pick — out of scope; escape hatch is manual git.
7. Never prompt the user — HALTs are verbatim and the command exits; do not ask for confirmation.
8. `.claude/settings.json` allowlist note: all required git patterns (`git status*`, `git add *`, `git commit *`, `git diff*`, `git log*`, `git branch*`) are already present in `docs/context/settings-allowlist.md:52-65` — no new allowlist entries are needed for this command.

Then add `## What you do NOT do` section:
- Not pushing or opening PRs — `/relay-pr` owns that step.
- Not selectively staging — `git add -A` commits all changes; partial commits require manual git.
- Not suppressing hooks with `--no-verify`.
- Not creating, modifying, or reading `.claude/` directories.
- Not invoking any agent or writer/reviewer pair — purely deterministic infra command.
- Not retrying after a failed commit — surface the error verbatim and HALT.

**MIRROR**: Pattern 1 (prp-commit Phase 4 at `plugins/prp-core/commands/prp-commit.md:64-76`); Pattern 4 (relay infra command Final output + Constraints shape at `plugins/relay/commands/relay-worktree.md:292-332`)

**VALIDATE**: `grep -q "## Phase 4" plugins/relay/commands/relay-commit.md && grep -q "## Constraints" plugins/relay/commands/relay-commit.md && grep -q "## What you do NOT do" plugins/relay/commands/relay-commit.md && grep -q "relay-pr" plugins/relay/commands/relay-commit.md && grep -q "no-verify" plugins/relay/commands/relay-commit.md && echo "TASK4: PASS" || echo "TASK4: FAIL"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify the file exists and has non-zero size
test -s plugins/relay/commands/relay-commit.md && echo "FILE_EXISTS_NONEMPTY: PASS" || echo "FILE_EXISTS_NONEMPTY: FAIL"

# Verify YAML frontmatter is present (opening and closing ---)
awk '/^---/{c++} c==2{found=1; exit} END{exit !found}' plugins/relay/commands/relay-commit.md && echo "FRONTMATTER: PASS" || echo "FRONTMATTER: FAIL"

# Verify argument-hint is <feature-name>
grep -q "argument-hint: <feature-name>" plugins/relay/commands/relay-commit.md && echo "ARGUMENT_HINT: PASS" || echo "ARGUMENT_HINT: FAIL"

# No trailing whitespace (basic markdown lint)
grep -Pn " +$" plugins/relay/commands/relay-commit.md | head -5 || echo "NO_TRAILING_WHITESPACE: PASS"
```

### Level 2 — CONTENT_INVARIANTS

```bash
# HALT codes for precondition failures present
grep -q "FAILED_MISSING_WORKTREE" plugins/relay/commands/relay-commit.md && echo "P1_HALT: PASS" || echo "P1_HALT: FAIL"
grep -q "FAILED_WRONG_BRANCH" plugins/relay/commands/relay-commit.md && echo "P2_HALT: PASS" || echo "P2_HALT: FAIL"

# Idempotency check: git status --porcelain
grep -q "status --porcelain" plugins/relay/commands/relay-commit.md && echo "IDEMPOTENCY_CHECK: PASS" || echo "IDEMPOTENCY_CHECK: FAIL"

# AC-2 idempotent exit message
grep -q "Nothing to commit" plugins/relay/commands/relay-commit.md && echo "AC2_MSG: PASS" || echo "AC2_MSG: FAIL"

# Commit message source: orchestrator-run.json
grep -q "orchestrator-run.json" plugins/relay/commands/relay-commit.md && echo "COMMIT_MSG_SOURCE: PASS" || echo "COMMIT_MSG_SOURCE: FAIL"

# AC-4 fallback message
grep -q "implement via relay" plugins/relay/commands/relay-commit.md && echo "FALLBACK_MSG: PASS" || echo "FALLBACK_MSG: FAIL"

# git -C pattern used for git ops
grep -q "git -C .worktrees" plugins/relay/commands/relay-commit.md && echo "GIT_C_PATTERN: PASS" || echo "GIT_C_PATTERN: FAIL"

# --no-verify mentioned (must be in constraints/not-do, not used operationally)
grep -q "no-verify" plugins/relay/commands/relay-commit.md && echo "NO_VERIFY_REFERENCED: PASS (verify it is a prohibition, not a usage)" || echo "NO_VERIFY_NOT_MENTIONED: FAIL"

# Next step pointer to /relay-pr
grep -q "relay-pr" plugins/relay/commands/relay-commit.md && echo "NEXT_STEP: PASS" || echo "NEXT_STEP: FAIL"

# No .claude/ artifact path references in the command body
grep -n "\.claude/PRPs" plugins/relay/commands/relay-commit.md && echo "ANTIPATTERN_DETECTED: .claude/ path found" || echo "NO_CLAUDE_ARTIFACT_PATHS: PASS"

# Constraints section present
grep -q "## Constraints" plugins/relay/commands/relay-commit.md && echo "CONSTRAINTS: PASS" || echo "CONSTRAINTS: FAIL"

# feat(<feature>) commit message format
grep -q 'feat(<feature>)' plugins/relay/commands/relay-commit.md && echo "COMMIT_FORMAT: PASS" || echo "COMMIT_FORMAT: FAIL"
```

### Level 3 — DRY-RUN END-TO-END

```bash
# Structural shape check: verify mandatory sections present in order
python3 - <<'EOF'
import sys
content = open("plugins/relay/commands/relay-commit.md").read()
required = [
    "## Your mission",
    "## Phase 0",
    "## Phase 1",
    "## Phase 2",
    "## Phase 3",
    "## Phase 4",
    "## Constraints",
    "## What you do NOT do",
]
pos = 0
for section in required:
    idx = content.find(section, pos)
    if idx == -1:
        print(f"MISSING or OUT OF ORDER: {section}")
        sys.exit(1)
    pos = idx + len(section)
print("SECTION_ORDER: PASS — all 8 command sections present in canonical order")
EOF

# Verify no git push or gh pr create used operationally (only in constraint text)
python3 - <<'EOF'
import sys, re
content = open("plugins/relay/commands/relay-commit.md").read()
# Find any line that looks like an operational git push or gh pr create (outside constraints/not-do)
constraints_pos = content.find("## Constraints")
not_do_pos = content.find("## What you do NOT do")
before_constraints = content[:constraints_pos] if constraints_pos > 0 else content
for i, line in enumerate(before_constraints.split('\n'), 1):
    if re.search(r'`git push|`gh pr create', line) and 'never' not in line.lower() and 'not' not in line.lower():
        print(f"POSSIBLE_PUSH_VIOLATION line {i}: {line.strip()}")
        sys.exit(1)
print("NO_OPERATIONAL_PUSH: PASS")
EOF

# Verify worktree path uses .worktrees/ (not .claude/worktrees/)
grep -q "\.worktrees/<feature>/" plugins/relay/commands/relay-commit.md && echo "WORKTREE_PATH: PASS" || echo "WORKTREE_PATH: FAIL"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** The command file's Phase 3 (STAGE + COMMIT) uses `git -C .worktrees/<feature>/ add -A` followed by `git -C .worktrees/<feature>/ commit -m "feat(<feature>): <prd-title>"`, producing a local commit on branch `feature/<feature>`. Phase 4 emits the short commit hash, the commit message, the branch name, and "Next: `/relay-pr <feature>`".

- **AC-A2 (PRD AC-2):** The command file's Phase 1 (ASSESS) runs `git -C .worktrees/<feature>/ status --porcelain`; if the output is empty (clean worktree), the command exits 0 with the message "Nothing to commit — worktree at `.worktrees/<feature>/` is already clean. Next: `/relay-pr <feature>`", creating no new commit.

- **AC-A3 (PRD AC-3):** The command file's Phase 0 P1 checks for the existence of `.worktrees/<feature>/`; if absent, it HALTs with `FAILED_MISSING_WORKTREE` and an instruction to run `/relay-worktree <feature>` first, and exits non-zero.

- **AC-A4 (PRD AC-4):** The command file's Phase 2 (COMMIT MESSAGE) reads `PRPs/reports/<feature>/orchestrator-run.json`; if the file is absent, unreadable, or does not contain a parseable `prd_path`, the commit proceeds using the fallback message `feat(<feature>): implement via relay`, and Phase 4 output notes that the fallback was used.

- **AC-A5 (PRD AC-5):** The command file's Phase 0 P2 runs `git -C .worktrees/<feature>/ branch --show-current`; if the result is not `feature/<feature>`, it HALTs with `FAILED_WRONG_BRANCH`, displaying the actual branch and the expected branch, and exits non-zero.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Pre-commit hooks fail (commitlint, formatting, lint-staged) | Medium | Medium — commit operation blocked, operator must resolve manually | Command surfaces hook stderr verbatim; does not suppress; Constraints explicitly state "Never pass `--no-verify`"; Phase 3 HALT message instructs operator to resolve and re-run `/relay-commit <feature>` |
| `orchestrator-run.json` absent or malformed (pipeline incomplete or new feature) | Medium | Low — fallback message used; commit still succeeds | Phase 2 has explicit fallback (`feat(<feature>): implement via relay`); Phase 4 output notes when fallback was used; commit never fails due to missing JSON |
| Worktree on wrong branch (operator manually checked out a different branch) | Low | Medium — commit would go to wrong branch, corrupting pipeline branch contract | Phase 0 P2 checks `git -C .worktrees/<feature>/ branch --show-current` and HALTs with `FAILED_WRONG_BRANCH` before any git operation; prevents silent corruption |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Infra command vs agent-dispatching command:** `/relay-commit` is a deterministic infra command analogous to `/relay-worktree` — no `Task` dispatch to a sub-agent, no writer/reviewer pair, and no rubric evaluation. The plan-reviewer should not flag the absence of a `## Decision Gate (before any action)` section as a defect — relay infra commands embed the Decision Gate inline in the command body rather than as a separate agent dispatch preamble.

**Allowlist note:** The `.claude/settings.json` allowlist already contains all required patterns (`git status*`, `git add *`, `git commit *`, `git diff*`, `git log*`, `git branch*`) per `docs/context/settings-allowlist.md:52-65`. No new allowlist entries are needed. The Constraints section of the command file must state this explicitly so the operator knows no settings update is required.

**prp-commit phase-naming adaptation:** prp-commit has four phases (1 ASSESS, 2 INTERPRET & STAGE, 3 COMMIT, 4 OUTPUT). relay-commit adds Phase 0 (Preconditions) before Phase 1 and replaces Phase 2 INTERPRET & STAGE with relay-specific commit-message generation, making the relay-commit protocol a 5-phase command (Phase 0 → Phase 4). The prp-commit structural analogy is preserved in the naming and intent of Phases 1 and 3–4; Phase 0 and the new Phase 2 are relay-specific.

*Generated: 2026-05-18*
*Approved: 2026-05-18*
*Status: IMPLEMENTED*
