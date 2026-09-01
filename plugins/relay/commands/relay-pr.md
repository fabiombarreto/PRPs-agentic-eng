---
description: 'Deterministic push + PR command for relay Pillar 3 step 2. Accepts a <feature-name> argument (plus optional --base <ref> and --draft flags); resolves .worktrees/<feature>/ and verifies the worktree is on branch feature/<feature> with a clean working tree; halts with FAILED_UNCOMMITTED_CHANGES when dirty (run /relay-commit first); checks at least one commit ahead of the resolved base (FAILED_NOTHING_TO_PR); enforces a framework-conditional test-review gate (skipped with a note when PRPs/reports/<feature>/run.json is absent; FAILED_TEST_REVIEW_NOT_APPROVED when run.json exists without an APPROVED test-review.json); pushes with a non-forced git push -u origin feature/<feature> only when local SHA differs from origin/feature/<feature> (SHA comparison, not exit code; FAILED_BRANCH_DIVERGENCE on non-fast-forward); detects an existing open PR via gh pr list --head feature/<feature> --state open --json url and exits 0 idempotently; generates PR body via node ${CLAUDE_PLUGIN_ROOT}/scripts/generate-final-report.mjs when run.json+test-review.json exist (applies ${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md; since Figma Implementation Track Phase 7, this same script call also emits a Visual Fidelity section automatically whenever phase-*/visual/*/fidelity-report.json artifacts exist under the reports dir — no new invocation or flag required here), else a minimal generated body; opens PR with gh pr create --base <resolved-base> --head feature/<feature> --title "feat(<feature>): <prd-title>" --body-file <body> (appends --draft when flag passed); writes pr_url back to orchestrator-run.json (best-effort, non-fatal); emits PR URL and Next: /relay-approve <pr>. No LLM, no writer/reviewer split. Infra command analogous to relay-commit, adapted for push + PR creation.'
argument-hint: <feature-name>
---

# /relay-pr

**Arguments:** `$ARGUMENTS`

---

## Your mission

Accept the `<feature>` argument (plus optional `--base <ref>` and `--draft` flags), resolve `.worktrees/<feature>/`, verify the worktree is on the correct branch with a clean working tree, confirm commits ahead of base, enforce the framework-conditional test-review gate, push the branch (non-forced, idempotent), detect or create a pull request, and emit the PR URL with the next step.

You are a deterministic infra command — no LLM dispatch, no writer/reviewer split, no agent. You either push + open a PR (or report an existing one idempotently), then point the operator to `/relay-approve <pr>` as the next step.

This command is the Pillar 3 step 2 successor to `/relay-commit`. It uses Phase 0 worktree preconditions followed by a 4-phase protocol:

- **Phase 1 ASSESS/GATE** — dirty-tree HALT, ahead-of-base HALT, test-review gate, gh/origin pre-flight
- **Phase 2 PUSH** — SHA-compared non-forced push, divergence HALT
- **Phase 3 PR BODY** — existing-PR idempotency, conditional `final-report.md` generation with redaction, minimal body fallback
- **Phase 4 CREATE + OUTPUT** — `gh pr create`, PR-URL write-back, structured output

See:
- the source PRD `relay-pr-command.prd.md`, in the relay plugin repo (not packaged) — AC-1 through AC-11; Decisions Log; Architecture Notes
- `plugins/relay/commands/relay-commit.md` — structural sibling; Phase 0 precondition shape; `git -C` discipline; Phase 4 output + next-step pattern

---

## Per-member iteration (workspace mode)

When the target project declares a `## Repository topology` (see
`${CLAUDE_PLUGIN_ROOT}/resources/repository-topology.md`), this command runs its
entire flow ONCE PER participating member: resolve the member list, and for each
member push `feature/<feature>` from that member's worktree and open one pull
request in that member's repository. A pull request cannot span repositories, so
a cross-repo feature necessarily produces one PR per member.

Record a per-member outcome — the member name, the pushed SHA, the resolved base
and the PR URL — so a partial failure names which repository succeeded and which
did not. A member already carrying an open PR for the branch is an idempotent
skip, exactly as the single-member path already treats it.

**When no topology is declared, everything below runs exactly once against the
one worktree, unchanged.**

---

## Phase 0: PRECONDITIONS

### P0 — Argument non-empty

Parse `$ARGUMENTS`. Extract flags first:
- `--base <ref>` → record as `<base-override>` (optional)
- `--draft` → record as `draft_flag = true` (optional)

The remaining positional token is `<feature>`. If it is blank or whitespace after trimming, HALT:

> /relay-pr requires a feature name. Usage:
>   /relay-pr <feature-name> [--base <ref>] [--draft]
> Example:
>   /relay-pr my-feature-name
>   /relay-pr my-feature-name --base develop
>   /relay-pr my-feature-name --draft

Record the trimmed argument as `<feature>`.

### P1 — Worktree exists

Check that `.worktrees/<feature>/` exists on disk. If the path is absent, HALT:

> FAILED_MISSING_WORKTREE: `.worktrees/<feature>/` does not exist.
> Run `/relay-worktree <feature>` first to create the isolated worktree,
> then re-run `/relay-commit <feature>` to commit, and `/relay-pr <feature>` to push + open the PR.

### P2 — Branch check

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
> Then re-run `/relay-pr <feature>`.

---

## Phase 1: ASSESS / GATE

### Step 1 — Dirty-tree check

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ status --porcelain
```

If the output is **non-empty** (uncommitted changes present), HALT:

> FAILED_UNCOMMITTED_CHANGES: `.worktrees/<feature>/` has uncommitted changes.
> Commit them first:
>   /relay-commit <feature>
> Then re-run `/relay-pr <feature>`.

Do **not** proceed. No push and no PR creation is performed.

### Step 2 — Resolve PR base ref

Resolve `<resolved-base>` using the following priority chain (first match wins):

1. **`--base <ref>` override** — if `<base-override>` was provided, run:

   ```bash
   git rev-parse --verify <base-override>
   ```

   If it exits zero → use `<base-override>` as `<resolved-base>`. If non-zero, HALT:

   > FAILED_BASE_REF_UNRESOLVED: The specified base ref `<base-override>` does not exist.
   > Run `git fetch` to update remote refs, then re-run with a valid `--base` value.

2. **Recorded creation base** — read `PRPs/reports/<feature>/worktree-bases.json`, written by `/relay-worktree` when the worktree was created. When it carries an entry for this member, use its recorded resolved ref as `<resolved-base>`.

   This is a recorded FACT, not an inference: it is the ref the worktree was actually cut from. Using it makes the branch a worktree was created from and the branch its PR merges into the same by construction. The tier this replaces detected the "nearest ancestor" with `git merge-base --fork-point`, which could disagree with the real creation base — on a repository checked out on `dev` while `origin/main` resolves, the two answer `origin/dev` and `origin/main`. That heuristic is deleted rather than demoted: a guess that fires only when the record is missing produces failures that are unreproducible, and the deterministic fallbacks below already cover that case.

3. **Develop-family fallback** — try in order until one resolves (exit code 0):
   ```bash
   git rev-parse --verify origin/develop
   git rev-parse --verify origin/dev
   git rev-parse --verify origin/development
   ```
   Use the first that resolves.

4. **Main/master fallback** — try in order:
   ```bash
   git rev-parse --verify origin/main
   git rev-parse --verify origin/master
   ```
   Use the first that resolves.

5. If **none** resolve, HALT:

   > FAILED_BASE_REF_UNRESOLVED: Cannot resolve a PR base ref.
   > Tried: feature's source integration branch, origin/develop, origin/dev,
   > origin/development, origin/main, origin/master — none exist or are resolvable.
   > Pass an explicit base: /relay-pr <feature> --base <valid-ref>
   > Or run `git fetch` to populate remote refs and retry.

Record `<resolved-base>` (the branch name, not the SHA — e.g., `develop`, `main`).

### Step 3 — Ahead-of-base check

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ rev-list --count <resolved-base>..feature/<feature>
```

If the count is **0** (no commits ahead of base), HALT:

> FAILED_NOTHING_TO_PR: Branch `feature/<feature>` has no commits ahead of `<resolved-base>`.
> There is nothing to open a PR for.
> Implement changes with /relay-execute <prd-path>, commit with /relay-commit <feature>,
> then re-run /relay-pr <feature>.

### Step 4 — Framework-conditional test-review gate

Check whether `PRPs/reports/<feature>/run.json` exists.

**If `run.json` is absent** (target has `test_frameworks: []` or the Test Runner has not been run):

> Note: test-review gate skipped — `PRPs/reports/<feature>/run.json` is absent.
> This is expected for projects with `test_frameworks: []` (AC-3 graceful skip).
> Proceeding to push + PR creation.

Do **not** HALT. Continue to Step 5.

**If `run.json` exists**: check for `PRPs/reports/<feature>/test-review.json`. Read the file and verify the top-level field `verdict` equals `APPROVED` (case-insensitive). `verdict` is the canonical field name — it is what `/relay-test-review` writes (`plugins/relay/commands/relay-test-review.md`, "Write the review record") and what `generate-final-report.mjs` reads. Do **not** read a `status` field; no producer writes one, so reading it would HALT on every genuinely-approved review. If the file is absent, unreadable, or `verdict` is not `APPROVED`, HALT:

> FAILED_TEST_REVIEW_NOT_APPROVED: `PRPs/reports/<feature>/run.json` exists (a test framework
> is configured) but `PRPs/reports/<feature>/test-review.json` is absent or not APPROVED.
> Run /relay-test-review <feature> and obtain an APPROVED verdict before pushing.
> No push and no PR creation will be performed.

### Step 5 — Pre-flight: gh authentication and origin remote

Run:

```bash
gh auth status
```

If the command fails or reports not authenticated, HALT:

> FAILED_GH_AUTH: `gh` is not authenticated.
> Run `gh auth login` to authenticate, then re-run `/relay-pr <feature>`.

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ remote get-url origin
```

If the command fails (no `origin` remote), HALT:

> FAILED_NO_ORIGIN: No `origin` remote found in `.worktrees/<feature>/`.
> Add the remote with:
>   git -C <repo_root>/.worktrees/<feature>/ remote add origin <repo-url>
> Then re-run `/relay-pr <feature>`.

On success, derive the GitHub `<owner>/<repo>` slug from the returned origin URL and record it as `<origin-repo>`. Support both URL forms (strip any trailing `.git`):

- SSH — `git@github.com:<owner>/<repo>.git` → `<owner>/<repo>`
- HTTPS — `https://github.com/<owner>/<repo>(.git)` → `<owner>/<repo>`

`<origin-repo>` MUST be passed as `--repo <origin-repo>` to **every** `gh pr` call in Phases 3 and 4. This is mandatory, not optional: when the worktree has more than one remote (e.g. a fork `origin` plus an `upstream`), `gh` resolves the *default* repo ambiguously and routinely picks the **upstream** — which would query for, and open, the PR against the wrong repository. Pinning `--repo` to the branch's actual push target (`origin`) is the only correct behavior.

If the origin URL is not a recognizable GitHub `<owner>/<repo>` form, HALT:

> FAILED_ORIGIN_REPO_UNRESOLVED: Could not parse a GitHub `<owner>/<repo>` slug from the
> origin URL `<url>`. /relay-pr pins `gh pr` calls to this repo to avoid targeting an
> upstream remote. Ensure `origin` points at a GitHub repository (or set the slug
> explicitly), then re-run `/relay-pr <feature>`.

---

## Phase 2: PUSH

### Step 1 — SHA comparison (idempotent no-op detection)

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ rev-parse feature/<feature>
```

Record the output as `<local-sha>`.

Attempt to resolve the remote tracking ref:

```bash
git -C <repo_root>/.worktrees/<feature>/ rev-parse origin/feature/<feature>
```

If this command **exits non-zero** (the remote ref does not exist — the branch has never been pushed): the remote ref is absent → push is needed. Proceed to Step 2.

If this command **exits zero**: record the output as `<remote-sha>`.

- If `<local-sha>` equals `<remote-sha>`: the branch is already up to date.
  > Branch `feature/<feature>` is already up to date with `origin/feature/<feature>` (SHA: `<local-sha>`).
  > Skipping push — proceeding to PR detection.
  Proceed to Phase 3 without pushing.

- If `<local-sha>` differs from `<remote-sha>`: push is needed. Proceed to Step 2.

### Step 2 — Non-forced push

Run:

```bash
git -C <repo_root>/.worktrees/<feature>/ push -u origin feature/<feature>
```

Do **NOT** pass any force flag (`--force` or similar variants).

If the push command exits **non-zero** (non-fast-forward rejection or other error):

> FAILED_BRANCH_DIVERGENCE: `git push` to `origin/feature/<feature>` failed.
> The remote branch has commits that are not in your local branch (non-fast-forward).
> Automatic force-push is never performed. Resolve manually:
>   git -C <repo_root>/.worktrees/<feature>/ fetch origin
>   git -C <repo_root>/.worktrees/<feature>/ rebase origin/feature/<feature>
> Then re-run `/relay-pr <feature>`.

If the push exits **zero**: the branch is now at `origin/feature/<feature>`.

---

## Phase 3: PR BODY

### Step 1 — Existing-PR idempotency detection

Run:

```bash
gh pr list --repo <origin-repo> --head feature/<feature> --state open --json url --jq '.[].url'
```

If the output is **non-empty** (an open PR already exists for this head branch):

Record `<pr-url>` from the output. Proceed directly to Phase 4 Step 3 (write-back + output), skipping PR creation entirely. This is the idempotent exit path — no duplicate PR is created.

If the output is **empty**: no open PR exists. Continue to Step 2.

### Step 2 — PR title derivation

Read `PRPs/reports/<feature>/orchestrator-run.json`. If the file exists and is valid JSON, extract the `prd_path` field. Read the file at `prd_path`. Find the first line starting with `# ` and extract everything after `# ` as `<prd-title>`. Then **strip inline Markdown formatting** from `<prd-title>` — remove backticks (`` ` ``) and leading/trailing asterisks (`*`) and underscores (`_`) — because GitHub renders PR titles as plain text, so Markdown syntax appears literally (e.g. a heading ``# `/relay-pr` Command`` yields the title `/relay-pr Command`, not ``` `/relay-pr` Command ```).

Compose the PR title:

```
feat(<feature>): <prd-title>
```

**Fallback** — use `feat(<feature>): implement via relay` when any of these apply:
- `PRPs/reports/<feature>/orchestrator-run.json` is absent or unreadable
- The JSON is invalid or does not contain a `prd_path` field
- The file at `prd_path` is absent or unreadable
- The PRD has no `# ` heading line

Record `<pr-title>`.

### Step 3 — PR body generation

Check whether both `PRPs/reports/<feature>/run.json` and `PRPs/reports/<feature>/test-review.json` exist.

**Full body path (both artifacts exist):**

Run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/generate-final-report.mjs PRPs/reports/<feature>/ --out PRPs/reports/<feature>/final-report.md
```

This writes `PRPs/reports/<feature>/final-report.md`. Since Figma Implementation Track Phase 7, `generate-final-report.mjs` also discovers any `phase-*/visual/*/fidelity-report.json` artifacts under `PRPs/reports/<feature>/` and appends a "## Visual Fidelity" section automatically when at least one is found — omitted entirely (no heading, no placeholder) for a non-Figma project or when no visual-verification evidence exists yet. Since the Figma Visual-First Track's own Phase 7, this same `generate-final-report.mjs` call additionally renders the section as phase_scope-aware (an added Scope column, present only when a phase's own plan declares `phase_scope`) and surfaces any recorded `/relay-visual-approve` human decision (approved/rejected) from a discovered `phase-<N>/visual-approval.jsonl` file — again inherited automatically from the one existing script invocation this step already makes, with no new flag or invocation. This command performs no new script invocation and takes no new flag to get this behavior; the Visual Fidelity section, when present, is inherited automatically from the same `node ${CLAUDE_PLUGIN_ROOT}/scripts/generate-final-report.mjs` call this step already makes. Apply the `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` three-layer redaction pass to the generated file:
- Layer 1: scan for env-var wildcard patterns (`*KEY*`, `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*PASSWD*`, `*CREDENTIAL*`, `*PRIVATE*`, `*SIGNING*`, `*AUTH*`), exact-match env vars (`DATABASE_URL`, `REDIS_URL`, etc.), and well-known secret regex (AWS keys, Stripe keys, GitHub PATs, JWTs, OpenAI/Anthropic/Google keys, PEM headers).
- Layer 2: apply any project-specific patterns from `PRPs/redaction-extensions.txt` (if it exists).
- Replace matched values with `[REDACTED]` (or `[REDACTED_URL]` for connection strings) in-place before the file is used as `--body-file`.

Set `<body-file>` = `PRPs/reports/<feature>/final-report.md`.

**Minimal body path (no test artifacts or `run.json` absent):**

Compose a minimal PR body containing:
1. The PR title line
2. A `## Summary` section derived from the PRD's first non-heading paragraph (if readable)
3. A `## Commits` section: the output of `git -C .worktrees/<feature>/ log <resolved-base>..feature/<feature> --oneline`

Apply the same `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` Layer 1 + Layer 2 redaction pass to any generated text.

Write the minimal body to a temporary file (e.g., `/tmp/relay-pr-body-<feature>.md`) or pass via `--body`. Set `<body-file>` accordingly.

Do **not** write `PRPs/reports/<feature>/final-report.md` on the minimal-body path.

---

## Phase 4: CREATE + OUTPUT

### Step 1 — Create the pull request

Compose the `gh pr create` command:

```bash
gh pr create \
  --repo <origin-repo> \
  --base <resolved-base> \
  --head feature/<feature> \
  --title "<pr-title>" \
  --body-file <body-file>
```

If `draft_flag = true`, append `--draft`:

```bash
gh pr create \
  --repo <origin-repo> \
  --base <resolved-base> \
  --head feature/<feature> \
  --title "<pr-title>" \
  --body-file <body-file> \
  --draft
```

Capture the output. On success, `gh pr create` emits the new PR URL. Record `<pr-url>`.

If `gh pr create` exits non-zero with an error indicating a PR already exists (duplicate-PR race condition between detection and creation): extract the existing PR URL from the stderr if possible, record it as `<pr-url>`, and continue to Step 2 without HALTing (idempotent handling).

If `gh pr create` exits non-zero for any other reason: surface the verbatim stderr and HALT:

> PR creation failed. See above for details.
> If the base ref was wrong, re-run with: /relay-pr <feature> --base <correct-ref>

### Step 2 — PR URL write-back (best-effort)

Attempt to update `PRPs/reports/<feature>/orchestrator-run.json` with the `pr_url` field:

1. Read the file; parse as JSON.
2. Set or update the `pr_url` field to `<pr-url>`.
3. Write the updated JSON back to the file.

If the file does not exist, create it with `{"pr_url": "<pr-url>"}`.

If any step fails (file unreadable, invalid JSON, write error): note the failure in the output but **do not HALT**:

> Note: could not write pr_url to `PRPs/reports/<feature>/orchestrator-run.json`: <error>.
> PR URL is `<pr-url>` — record it manually if needed.

### Step 3 — Structured output

Emit:

```
**PR**: <pr-url>
**Branch**: feature/<feature>
**Base**: <resolved-base>

Next: `/relay:relay-approve <pr>`
```

If Phase 1 Step 4 used the test-review gate skip (no `run.json`), add:

> Note: test-review gate was skipped (no `run.json` found). PR body uses minimal generated content.

If Phase 2 Step 1 skipped the push (already up to date), add:

> Note: push was a no-op — branch was already up to date with `origin/feature/<feature>`.

If Phase 3 Step 1 detected an existing PR (idempotent exit), add:

> Note: an open PR already existed for `feature/<feature>` — no new PR was created.

---

## Constraints (hard rules)

1. **Never use force flags on push.** The settings allowlist explicitly denies forced pushes (the `--force` family). A diverged remote HALTs with `FAILED_BRANCH_DIVERGENCE` for human resolution; the command never overwrites remote history.
2. **Never push to `main` or `master`.** The push target is always `origin/feature/<feature>`. The settings allowlist denies `git push origin main*` and `git push origin master*`.
3. **Never commit, merge, or clean up.** Committing is owned by `/relay-commit`; merging and cleanup are owned by `/relay-approve`. This command only pushes and opens a PR.
4. **Always use `git -C .worktrees/<feature>/` prefix.** Never `cd .worktrees/<feature>/ && git ...` — the `-C` flag works on both Unix and Windows without a shell `cd`.
5. **Apply `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` before any body becomes the PR description.** `final-report.md` and any generated text may contain secret values; they MUST be redacted through the three-layer pass before being supplied to `--body-file`. A PR body is potentially public.
6. **Never write under `.claude/`.** Pipeline artifacts (`final-report.md`, `orchestrator-run.json`) live under `PRPs/reports/<feature>/`. No write to any path under `.claude/`.
7. **Never pass `--no-verify` to any git command.** Pre-commit and push hooks represent project quality gates; they must run.
8. **Never prompt the user.** HALTs emit a verbatim message and the command exits. No confirmation prompts, no interactive input.
9. **Allowlist note.** All required patterns are already in `${CLAUDE_PLUGIN_ROOT}/resources/settings-allowlist.md`: `git push origin feature/*` (line 62); `gh pr create *`, `gh pr view *`, `gh pr list *` (lines 68-71); `node */plugins/relay/scripts/generate-final-report.mjs *` (line 114). Forced pushes (lines 132-134) and push-to-default-branch (`git push origin main*`/`master*`, line 138) are explicitly denied. No new allowlist entries are needed.

---

## What you do NOT do

- **Commit changes** — `/relay-commit` owns that step; `/relay-pr` HALTs on a dirty worktree rather than committing.
- **Merge the PR** — owned by `/relay-approve`; this command only opens the PR.
- **Delete branches or worktrees** — owned by `/relay-approve` post-merge.
- **Run Docs Updater or Docs Reviewer** — owned by `/relay-approve`.
- **Force-push or push to `main`/`master`** — permanently denied by the settings allowlist.
- **Edit the PR body interactively** — the body is generated from structured artifacts; post-creation edits go through the GitHub web UI or `gh pr edit`.
- **Invoke any agent or writer/reviewer pair** — purely deterministic infra command (git + gh operations only).
- **Write under `.claude/`** — all pipeline artifacts go to `PRPs/reports/<feature>/`.
- **Skip redaction** — `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` Layer 1 + Layer 2 must be applied to every generated body before it becomes a PR description.
- **Suppress hooks with `--no-verify`** — hooks are project quality gates and must run.
