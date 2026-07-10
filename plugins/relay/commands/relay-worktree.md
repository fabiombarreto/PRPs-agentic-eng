---
description: 'Deterministic git worktree creation for isolated feature development. Shells out git worktree add (D2 shell-out over EnterWorktree); derives the slug from a free argument or PRD basename (D3); enforces four preconditions with named HALT codes (FAILED_NOT_A_GIT_REPO, FAILED_BASE_REF_MISSING, FAILED_BRANCH_CONFLICT, FAILED_PATH_OCCUPIED, FAILED_BRANCH_DIVERGENCE); detects idempotent re-use via git worktree list --porcelain (D4); resolves base ref via origin/main → origin/master → HEAD chain (D11); executes scripts/worktree-bootstrap.sh (or .ps1) with a 60-second timeout (D9) capturing redacted output to PRPs/reports/<feature>/worktree-bootstrap.log (AC-6, AC-7, AC-8). No LLM dispatch, no writer/reviewer split, no agent. This is an infra command.'
argument-hint: <feature-name>
---

# /relay-worktree

**Arguments:** `$ARGUMENTS`

---

## Your mission

Parse the `<feature-name>` argument (or receive the feature name from `/relay-execute`'s `<feature>` value derived from the PRD basename), run four preconditions, then create an isolated git worktree at `.worktrees/<feature>/` on branch `feature/<feature>`. Execute the project's bootstrap hook (if present) with a 60-second timeout and write redacted output to `PRPs/reports/<feature>/worktree-bootstrap.log`. Bootstrap failure is non-fatal — worktree creation is the load-bearing outcome. Emit a clear named success or HALT message.

You are autonomous. You do not prompt the user. You do not invoke any agent. You do not create bootstrap scripts — that is Phase 2 of the relay-worktree PRD (`context-builder` extension). You do not wire into `/relay-execute` — that is Phase 3. You do not remove worktrees — cleanup is Pillar 3 (`/relay-approve`)'s job.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/relay-worktree.prd.md` — source PRD with D1–D11 decisions and AC-1 through AC-9 (Phase 1 scope), Architecture Notes (lines 163–170).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` — canonical structural sibling (frontmatter, Decision Gate, Parse arguments, Preconditions, Phase A/B loop, Final output, Constraints, What you do NOT do).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan.md` — precondition HALT message shape (P1 file-not-readable pattern, P2 status check pattern).
- `${CLAUDE_PLUGIN_ROOT}/agents/plan-writer.md` — slug derivation contract (lines 167–173): `<feature>` = basename minus `.prd.md`; kebab-cased, ASCII only, `[a-z0-9-]`.
- `${CLAUDE_PLUGIN_ROOT}/docs/context/redaction-policy.md` — three-layer redaction policy applied to the bootstrap log (Layer 1 invariant defaults + Layer 2 per-project extensions from `PRPs/redaction-extensions.txt`).

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command creates infrastructure (a git worktree at `.worktrees/<feature>/`) that downstream commands operate against; the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: infra command creating git worktree at .worktrees/<feature>/; shells out git plumbing (D2 shell-out over EnterWorktree); D1 path .worktrees/<feature>/; D4 idempotency via git worktree list --porcelain; D9 60s bootstrap timeout; D10 feature/ branch prefix; D11 base-ref chain origin/main → origin/master → HEAD; bootstrap log artifact at PRPs/reports/<feature>/worktree-bootstrap.log; .claude/settings.json allowlist must include git worktree add and bootstrap invocation
- Decisions found:
  - D2 shell-out over EnterWorktree: EnterWorktree hardcodes .claude/worktrees/<name>/ (D1 conflict) and auto-cleanup-on-session-exit lifecycle conflicts with relay's pipeline lifecycle (docs/decisions.md, 2026-05-10)
  - D1 worktree path: .worktrees/<feature>/ (sibling, not under .claude/) — honors 2026-04-19 surface decision; avoids .claude/ permission-gate concern
  - D4 idempotency: silent re-use when worktree exists on expected branch; HALT loud on branch divergence; no numeric suffix
  - D9 bootstrap timeout default: 60 seconds; --bootstrap-timeout flag deferred as Could-item
  - D10 branch-name pattern: feature/<feature> prefix (2026-04-19 surface decision)
  - D11 base-ref resolution: origin/main → origin/master → HEAD; --base <ref> override supported
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19) — bootstrap log at PRPs/reports/<feature>/worktree-bootstrap.log
  - .claude/settings.json allowlist: narrow patterns, invariant denylist (docs/decisions.md, 2026-04-19) — git worktree add and bootstrap invocation must be in the allow list
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66) — worktree created at .worktrees/<feature>/ (sibling); bootstrap log at PRPs/reports/<feature>/; no writes under .claude/
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84) — .claude/settings.json must pre-approve Bash(git worktree add *) and the bootstrap invocation pattern
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary applies — command never prompts user; HALTs are verbatim and the command exits
  - PRPs/ artifact paths convention — only PRPs/reports/<feature>/worktree-bootstrap.log is written as a pipeline artifact; .worktrees/ is infrastructure, not a PRPs artifact
  - Writer/reviewer split: /relay-worktree is infra-class (deterministic, no agent, no rubric); no companion agent or reviewer
  - Graceful degradation preserved: /relay-execute still works in cwd when /relay-worktree is not yet invoked (D3/D4 contract unchanged by this command's creation)
- Result: PROCEED | HALT (reason)
```

If any Decision Gate source cannot be read, HALT with the canonical byte-exact message:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run `/relay-worktree`. No
> code has been changed and no review has been run.

---

## Parse arguments

`$ARGUMENTS` is an optional `<feature-name>` string. When invoked by `/relay-execute`, the feature name is provided by the orchestrator derived from the PRD basename (per D3 slug derivation).

**Standalone invocation:** if `$ARGUMENTS` is blank/whitespace, HALT with:

> /relay-worktree requires a feature name. Usage:
>   /relay-worktree <feature-name>
> Example:
>   /relay-worktree my-feature-name
> When invoked by /relay-execute, the feature name is derived automatically from the PRD basename.

**Slug sanitization:** Apply the slug derivation contract (mirroring `plan-writer.md:167-173` and `relay-execute.md:68`):

1. Lowercase the argument.
2. Drop any character outside `[a-z0-9-]` (after lowercasing).
3. Truncate to 64 characters maximum.
4. Strip leading and trailing hyphens.
5. Collapse runs of multiple hyphens to a single hyphen.

If the result is empty after sanitization, HALT with:

> FAILED_EMPTY_SLUG: The argument `<original-argument>` produced an empty
> slug after sanitization (lowercase, [a-z0-9-] only, max 64 chars, no
> leading/trailing hyphens). Provide a feature name that contains at least
> one ASCII letter or digit.

Record the sanitized value as `<feature>`.

**Optional flags:**

- `--base <ref>` — override the base ref resolution chain (D11). Captures `<ref>` as `base_override`. When provided, P2 verifies the ref is resolvable before proceeding.
- `--bootstrap-timeout <seconds>` — Could-item; deferred until dogfood telemetry justifies. If provided, it is silently ignored in MVP (the 60-second default remains in effect).

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail. No artifact is written and no git operation is performed on HALT.

### P1 — cwd is a git repository

Run `git rev-parse --show-toplevel`. If the command exits non-zero (cwd is not inside a git repository):

> FAILED_NOT_A_GIT_REPO: The current working directory is not a git repository.
> /relay-worktree requires a git repository to create a worktree.
> Run `git init` to initialize a repository, or navigate to an existing
> git repository root and re-run /relay-worktree.

Record `repo_root` as the output of `git rev-parse --show-toplevel` (the absolute path to the repository root).

### P2 — Base ref resolvable

Resolve `<resolved-base>` using the following priority chain (D11):

1. If `--base <ref>` was provided: run `git rev-parse --verify <ref>`. If it exits zero → use `<ref>` as `<resolved-base>`. If non-zero:

   > FAILED_BASE_REF_MISSING: The specified base ref `<ref>` does not exist locally
   > or in any configured remote. Run `git fetch` to update remote refs, or choose
   > a different base ref. Usage: /relay-worktree <feature-name> --base <valid-ref>

2. Otherwise, try each in order until one resolves (exit code 0):
   - `git rev-parse --verify origin/main`
   - `git rev-parse --verify origin/master`
   - `git rev-parse --verify HEAD`

   Use the first that resolves as `<resolved-base>`. If none resolve (pathological case — no HEAD):

   > FAILED_BASE_REF_MISSING: Cannot resolve a base ref. Tried origin/main, origin/master,
   > and HEAD — none exist. Ensure the repository has at least one commit and run
   > `git fetch` to populate remote refs. Usage: /relay-worktree <feature-name> --base <ref>

### P3 — Path `.worktrees/<feature>/` state check (idempotency + conflict detection)

Run `git worktree list --porcelain` (locale-independent; per git man page, `--porcelain` output is stable across locales and git versions). Parse the output for an entry whose `worktree` field matches the absolute path `<repo_root>/.worktrees/<feature>/`.

**Case A — Entry found, branch matches `feature/<feature>`:**
Set `idempotent_reuse = true`. Proceed to Phase A.0. The bootstrap script is NOT re-executed.

**Case B — Entry found, branch does NOT match `feature/<feature>`:**
Inspect the actual branch for the worktree entry. HALT with:

> FAILED_BRANCH_DIVERGENCE: The worktree at `.worktrees/<feature>/` is registered in
> git but is checked out on branch `<actual-branch>`, not the expected branch
> `feature/<feature>`. This likely means a previous /relay-worktree run used a
> different feature slug, or the branch was manually switched inside the worktree.
> Options:
>   (a) Choose a different feature name: /relay-worktree <different-feature>
>   (b) Remove the existing worktree manually: git worktree remove .worktrees/<feature>/
>       then re-run /relay-worktree <feature>
> Do NOT remove the worktree if it contains uncommitted work you want to preserve.

**Case C — Entry NOT found in `git worktree list`, but the path `.worktrees/<feature>/` exists on disk:**
Run `test -d .worktrees/<feature>/` (or equivalent path-existence check). If the directory exists but is not registered as a worktree:

> FAILED_PATH_OCCUPIED: The path `.worktrees/<feature>/` exists on disk but is NOT
> registered in `git worktree list --porcelain`. This likely means the worktree was
> removed with `rm -rf` without `git worktree remove`, leaving a stale directory.
> To recover: run `git worktree prune` to clean up stale registrations, then manually
> remove the stale directory if it persists (`rm -rf .worktrees/<feature>/`), and
> re-run /relay-worktree <feature>.

**Case D — Entry NOT found and path does NOT exist on disk:**
Set `idempotent_reuse = false`. Proceed to P4.

### P4 — Branch `feature/<feature>` conflict check

Run `git branch --list feature/<feature>`. If the branch exists AND `idempotent_reuse = false` (i.e., no worktree registered for this path):

Verify whether the existing branch points at the same commit as `<resolved-base>` by running `git rev-parse feature/<feature>` and `git rev-parse <resolved-base>`. If they differ:

> FAILED_BRANCH_CONFLICT: Branch `feature/<feature>` already exists (pointing at commit
> `<branch-sha>`) but no worktree is registered at `.worktrees/<feature>/`.
> The branch pre-exists without a registered worktree, which prevents `git worktree add -b`
> from creating a clean new branch.
> Options:
>   (a) Delete the orphaned branch: git branch -D feature/<feature>
>       then re-run /relay-worktree <feature>
>   (b) Use the existing branch by creating the worktree without -b:
>       git worktree add .worktrees/<feature>/ feature/<feature>
>       (do this manually if you want to reuse the branch's existing history)

If the branch exists but points at the same commit as `<resolved-base>`, the `git worktree add` command will still fail with `-b` because the branch exists; treat this as a conflict and HALT with the same `FAILED_BRANCH_CONFLICT` message above.

---

## Phase A — Worktree creation

### Phase A.0 — Idempotency gate

If `idempotent_reuse = true` (set by P3 Case A):

Emit the verbatim AC-3 success message and skip to Final output. The bootstrap script is NOT re-executed:

> Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using.

Do NOT proceed to Phase A.1 or Phase B.

### Phase A.1 — Shell-out: git worktree add

Execute via `Bash`:

```
git worktree add .worktrees/<feature>/ -b feature/<feature> <resolved-base>
```

Capture exit code, stdout, and stderr.

If exit code is non-zero:

> Worktree creation failed. See above for git diagnostic.
> git worktree add .worktrees/<feature>/ -b feature/<feature> <resolved-base>
> Exit code: <exit-code>
> <verbatim git stderr output>
> Manual recovery: inspect the error above, resolve any git state issue, and
> re-run /relay-worktree <feature>.

Exit non-zero. No bootstrap script is run on Phase A.1 failure.

### Phase A.2 — Verify: confirm worktree registered

Run `git worktree list --porcelain` and confirm `.worktrees/<feature>/` appears with branch `refs/heads/feature/<feature>`.

If verification fails (the new worktree is not visible after a git exit 0):

> Worktree creation appeared to succeed (git exit 0) but the new worktree at
> `.worktrees/<feature>/` is not visible in `git worktree list`. This may indicate
> a filesystem race or a git version issue. Manual inspection required:
>   git worktree list --porcelain
> If the entry is absent, run `git worktree prune` then retry /relay-worktree <feature>.

Exit non-zero. No bootstrap script is run when Phase A.2 verification fails.

Record `absolute_worktree_path = <repo_root>/.worktrees/<feature>/` for use in Phase B.

---

## Phase B — Bootstrap hook execution

### Phase B.0 — Script detection

Check for bootstrap scripts in this order:

1. `scripts/worktree-bootstrap.sh` at the repo root.
2. `scripts/worktree-bootstrap.ps1` at the repo root (Windows fallback).

If neither exists → exit Phase B silently. This is AC-8: bootstrap absent is a no-event. No log file is written, no warning is emitted, no prompt is shown. Proceed to Final output (success path).

### Phase B.1 — Execute with timeout

Set `bootstrap_timeout_seconds = 60` (D9 default).

Run the detected script with the absolute worktree path as `$1`:

```
<script-path> <absolute_worktree_path>
```

Execute with a 60-second timeout. Capture stdout and stderr combined.

On Unix/macOS: use `timeout 60 <script-path> <absolute_worktree_path>` or equivalent shell timeout mechanism.
On Windows (`.ps1`): invoke via `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <script-path> <absolute_worktree_path>` wrapped in a timeout mechanism.

### Phase B.2 — Redact and write log

Apply the three-layer redaction policy from `docs/context/redaction-policy.md`:

- **Layer 1 (invariant defaults):** scan all captured output lines for env var value patterns (names matching `*KEY*`, `*TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*PASSWD*`, `*CREDENTIAL*`, `*PRIVATE*`, `*SIGNING*`, `*AUTH*`); exact-match env names (`DATABASE_URL`, `DB_URL`, `REDIS_URL`, `MONGODB_URI`, `KAFKA_BROKERS`, `AMQP_URL`, `GOOGLE_APPLICATION_CREDENTIALS`) → replace matched values with `[REDACTED_URL]` for connection strings, `[REDACTED]` for others; apply well-known value regex (AWS access key `AKIA[0-9A-Z]{16}`, Stripe `sk_live_*`/`sk_test_*`, GitHub PATs, JWTs, PEM headers, OpenAI `sk-*`, Anthropic `sk-ant-*`, Google API keys / OAuth2 tokens).
- **Layer 2 (per-project extensions):** if `PRPs/redaction-extensions.txt` exists at repo root, load additional env var names and value regex patterns and apply them.
- **Layer 3 (documented, not redacted):** service account non-key fields, git hashes — left as-is per policy; teams can opt into redaction via Layer 2.

Create `PRPs/reports/<feature>/` directory if absent. Write redacted output to `PRPs/reports/<feature>/worktree-bootstrap.log`.

### Phase B.3 — Outcome

- If the script exited 0 within the timeout: set `bootstrap_result = "OK"`. Proceed to Final output.
- If the script exited non-zero OR timed out at 60 seconds: set `bootstrap_failed = true`. Log warning to stdout:

  > Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details.

  Proceed to Final output. This is AC-7: bootstrap failure is non-fatal. The worktree creation is the load-bearing outcome and the command still exits success.

---

## Final output surface

### Success path — new worktree created, bootstrap OK or absent

When `bootstrap_result = "OK"`:

> Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Base ref: `<resolved-base>`. (Bootstrap: OK)

When no bootstrap script was present (Phase B.0 no-event):

> Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Base ref: `<resolved-base>`. (Bootstrap: skipped — script absent)

### Success path — new worktree created, bootstrap failed

When `bootstrap_failed = true`:

> Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Base ref: `<resolved-base>`.
> Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details.

Exit code 0. The worktree creation succeeded; bootstrap failure is non-fatal per AC-7.

### Success path — idempotent re-use (AC-3)

When `idempotent_reuse = true` (set in Phase A.0):

> Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using.

Exit code 0. No git operation ran. Bootstrap was not re-executed.

### HALT paths (named codes with actionable messages)

All HALT paths are defined verbatim in the Preconditions and Phase A sections above. Named codes:

- `FAILED_NOT_A_GIT_REPO` — P1: cwd is not a git repository.
- `FAILED_BASE_REF_MISSING` — P2: base ref does not resolve.
- `FAILED_BRANCH_DIVERGENCE` — P3 Case B: worktree registered on wrong branch.
- `FAILED_PATH_OCCUPIED` — P3 Case C: stale directory blocks creation.
- `FAILED_BRANCH_CONFLICT` — P4: branch pre-exists without a registered worktree.
- `FAILED_EMPTY_SLUG` — Parse arguments: sanitized feature name is empty.
- Phase A.1 failure (verbatim git diagnostic) — worktree add shell-out failed.
- Phase A.2 failure (verbatim verification message) — unexpected post-creation state.

No artifact is written on any HALT path. Exit non-zero.

---

## Constraints (hard rules)

1. **Never write under `.claude/`.** The worktree goes to `.worktrees/<feature>/` (sibling to `.claude/`). Only the bootstrap log is written under `PRPs/reports/<feature>/worktree-bootstrap.log`. Nothing else from this command touches `.claude/`. Anti-pattern reference: `docs/anti-patterns.md:60-66`.

2. **Never modify plans or PRDs.** This is an infra command. It creates a worktree; it does not back-fill Implementation Phases tables, flip plan status, or write to `PRPs/prds/` or `PRPs/plans/`. D8 mutations belong to `/relay-implement`.

3. **Never write outside `.worktrees/<feature>/` and `PRPs/reports/<feature>/worktree-bootstrap.log`.** Those are the only two filesystem surfaces this command touches. No other files in the repo are modified.

4. **Do not remove worktrees (never remove worktrees).** Cleanup is Pillar 3's job. `/relay-approve` owns `git worktree remove` + branch deletion post-merge. This command never removes worktrees, never appends a `--remove` flag, and never calls `git worktree remove`.

5. **Never use the `EnterWorktree` native tool (D2).** `EnterWorktree` hardcodes the path to `.claude/worktrees/<name>/` (D1 conflict) and its auto-cleanup-on-session-exit lifecycle misaligns with relay's pipeline lifecycle (worktree must survive until Pillar 3 merge). Shell out `git worktree add` directly via `Bash`.

6. **Never re-execute bootstrap on idempotent re-use (AC-3).** When `idempotent_reuse = true`, Phase A.0 skips to Final output. Phase B is never reached. The bootstrap script is not re-run on an already-existing worktree.

7. **Never HALT on bootstrap failure (AC-7).** If the bootstrap script exits non-zero or times out, `bootstrap_failed = true` is set, a warning is logged, and the command exits code 0. The worktree was successfully created; bootstrap is a best-effort hook.

8. **Never prompt the user.** Past the interactivity boundary (`docs/context/architecture.md` §Interactivity boundary). HALTs are verbatim and the command exits.

9. **Bootstrap log must have redaction applied per `docs/context/redaction-policy.md` before writing.** Apply all three layers before writing to `PRPs/reports/<feature>/worktree-bootstrap.log`. Never write raw bootstrap output.

10. **Never numeric-suffix the worktree path on collision.** Numeric suffix would create surprise paths breaking slug-equality (D4 idempotency policy). HALT loud with the appropriate named code instead.

11. **`.claude/settings.json` allowlist requirement.** The allowlist must include `Bash(git worktree add *)` and the bootstrap script invocation pattern (`Bash(scripts/worktree-bootstrap.sh *)` or `Bash(scripts/worktree-bootstrap.ps1 *)`) before this command can run autonomously. If these entries are absent, Claude Code will prompt for permission per-command, violating the interactivity boundary. The user must add them manually (or via `context-builder` Phase 2) before invoking `/relay-worktree` in the autonomous pipeline.

12. **Idempotency uses `git worktree list --porcelain`, not path-existence.** Path-existence has false positives (stale directories after `rm -rf` without `git worktree prune`). `git worktree list --porcelain` is git's authoritative state source. The P3 check always uses `git worktree list` as the primary source; path-existence is only checked when `git worktree list` does NOT show an entry for the path (Case C).

---

## What you do NOT do

- **Modifying plans or PRDs** — this command never writes to `PRPs/plans/` or `PRPs/prds/`. D8 mutations (plan trailing-block flip, plan archive, PRD row status flip) belong exclusively to `/relay-implement`.
- **Invoking `/relay-execute` or any agent** — this is an infra command. No `Task` dispatch, no writer/reviewer pair, no LLM judgment surface.
- **Cleaning up worktrees** — `/relay-approve` (Pillar 3) owns `git worktree remove` + `git branch -d` + `git push --delete origin <branch>` + `git worktree prune` post-merge. Never call `git worktree remove` from this command.
- **Creating bootstrap scripts** — the `scripts/worktree-bootstrap.sh` template is emitted by `context-builder` Phase 2 of this PRD. This command only invokes an existing script if present; it never creates, modifies, or interprets the script content.
- **Wiring into `/relay-execute`** — Phase 3 of the relay-worktree PRD owns the surgical edits at `relay-execute.md:49` and `relay-execute.md:611`. The deferral comment at line 611 is NOT removed by this command or this phase.
- **Retrying `git worktree add` on failure** — a failed Phase A.1 HALTS with the verbatim git diagnostic. The command never retries creation automatically. The user diagnoses and re-invokes.
- **Numeric-suffixing the worktree path on collision** — per D4, collision means HALT loud. Never create `.worktrees/<feature>-2/` or any variant.
- **Using `EnterWorktree` native tool** — explicitly rejected per D2 (path hardcoded to `.claude/worktrees/<name>/`; lifecycle misaligned).
- **`--bootstrap-timeout <seconds>` flag** — Could-item; deferred. The 60-second default (D9) is fixed in MVP. If provided, silently ignored.
- **Parallel worktree creation for the same feature** — D18 mitigation; deferred to Phase 3/4. Concurrent `/relay-worktree` invocations against the same `<feature>` may race on path creation; idempotency (P3 Case A) handles clean re-invocations; races on simultaneous first-creation are the user's coordination responsibility.
- **Worktree operations on remote repositories** — this command always operates against the local repository at `git rev-parse --show-toplevel`. Remote worktrees are out of scope.
