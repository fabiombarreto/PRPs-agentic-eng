# Feature: /relay-worktree command file (Phase 1 of relay-worktree)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin marketplace; Pillar 2 command surface; PRP artifact paths)
- Activated criteria: new infra command file in plugins/relay/commands/; first relay command that shells out git plumbing directly; cross-cutting change activating worktree isolation for /relay-execute; references D1 (.worktrees/ path), D2 (shell-out over EnterWorktree), D3 (slug derivation), D4 (idempotency), D9 (60s timeout), D10 (feature/ prefix), D11 (base-ref chain)
- Decisions found:
  - Command surface writer/reviewer split (docs/decisions.md, 2026-04-19) — /relay-worktree is infra-class (deterministic, no LLM, no writer/reviewer pair); command surface table pins it as an infra command
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19) — bootstrap log at PRPs/reports/<feature>/worktree-bootstrap.log; worktree itself at .worktrees/<feature>/ (sibling, not under .claude/)
  - Interactivity boundary: PRD interactive, downstream autonomous (docs/decisions.md, 2026-04-19) — /relay-worktree runs past the boundary; never prompts user
  - Narrow Bash allowlist patterns (docs/decisions.md, 2026-04-19) — .claude/settings.json must include Bash(git worktree add *) and bootstrap script invocation pattern
  - .claude/settings.json allowlist: narrow patterns, invariant denylist (docs/decisions.md, 2026-04-19) — git worktree add and bootstrap invocation must be in the allow list; rm -rf /* variants remain in denylist
  - D2 shell-out over EnterWorktree: EnterWorktree hardcodes .claude/worktrees/<name>/ (violates D1 surface decision) and its auto-cleanup-on-session-exit lifecycle conflicts with relay's pipeline lifecycle
  - D1 worktree path: .worktrees/<feature>/ (sibling, not under .claude/) — honors the 2026-04-19 surface decision; avoids .claude/ permission-gate concern
  - D4 idempotency: silent re-use when worktree exists on expected branch; HALT loud on branch divergence; no numeric suffix
  - Plan filenames carry source PRD phase number and slug (docs/decisions.md, 2026-04-25) — slug = PRD basename minus .prd.md
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66) — worktree created at .worktrees/<feature>/ (sibling); bootstrap log at PRPs/reports/<feature>/; no writes under .claude/ at all
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84) — .claude/settings.json must pre-approve Bash(git worktree add *) and the bootstrap invocation pattern
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary applies — command never prompts user; HALTs are verbatim and the command exits
  - PRPs/ artifact paths convention — only PRPs/reports/<feature>/worktree-bootstrap.log is written as a pipeline artifact; .worktrees/ is infrastructure, not a PRPs artifact
  - Writer/reviewer split: /relay-worktree is infra-class (deterministic, no agent, no rubric); no companion agent or reviewer
  - Graceful degradation preserved: /relay-execute still works in cwd when /relay-worktree is not yet invoked (D3/D4 contract unchanged by this command's creation)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-worktree.prd.md` — Implementation Phases row 1: "/relay-worktree command file" — Goal: ship `plugins/relay/commands/relay-worktree.md` as the deterministic infra command with all 9 first-mile ACs (1–9) satisfied — Success signal: the file passes the plan-reviewer 8-item structural rubric + R-COH-* coherence layer when its plan is reviewed; manual invocation against a synthetic test repo produces a worktree at the expected path with the expected branch.

## Summary

This phase delivers a single markdown command file at `plugins/relay/commands/relay-worktree.md` — the deterministic infra command that creates an isolated git worktree for a named feature. The file mirrors the structural shape of sibling infra commands (frontmatter → Decision Gate → Parse arguments → Preconditions → Phase A creation logic → Phase B bootstrap hook → Final output → Constraints → What you do NOT do) but has no LLM dispatch, no agent, and no writer/reviewer split. It shells out `git worktree add .worktrees/<feature>/ -b feature/<feature> <base>` after four preconditions pass, uses `git worktree list --porcelain` for authoritative idempotency detection, resolves the base ref via the `origin/main → origin/master → HEAD` chain, executes `scripts/worktree-bootstrap.sh` (or `.ps1`) with a 60-second timeout writing redacted output to `PRPs/reports/<feature>/worktree-bootstrap.log`, and HALTs loud on branch divergence or path conflict with named exit codes. No companion agent, no context-builder changes, and no `/relay-execute` wiring are part of this phase.

## User Story

```
As a relay pipeline developer
I want a /relay-worktree <feature-name> command that creates an isolated git worktree at .worktrees/<feature>/ on branch feature/<feature>
So that I can run multiple /relay-execute invocations in parallel without file/branch/path collision, with the AI's changes physically confined to each feature's worktree
```

## Problem Statement

Relay's autonomous pipeline (`/relay-execute`) cannot run two features in parallel today because every downstream command operates against the cwd's working tree. Concurrent invocations collide on file writes, branch state, and potentially dev-server ports. The `/relay-execute` D4 deferral comment (at `plugins/relay/commands/relay-execute.md:611`) explicitly records that worktree management is deferred to a future command; the graceful-degradation fallback (cwd against current branch) makes the pipeline functional for sequential use but structurally blocks parallelism. Without a physical boundary, the implementer's `Edit`/`Write` calls can reach any file in the repo with only the rubric-level R-X guard as protection. Phase 1 installs that boundary: `plugins/relay/commands/relay-worktree.md` is the standalone command that creates the worktree, enforces slug-derived naming, detects and re-uses existing worktrees idempotently, and wires the project's bootstrap hook — satisfying AC-1 through AC-9 of the source PRD.

## Solution Statement

Ship `plugins/relay/commands/relay-worktree.md` as a deterministic infra command (no LLM, no agent) that: (a) parses `<feature-name>` from a free argument or receives it from `/relay-execute` context, sanitizing to `[a-z0-9-]` max 64 chars; (b) runs four preconditions (P1 cwd is a git repo, P2 branch `feature/<feature>` available, P3 base ref resolvable, P4 path `.worktrees/<feature>/` empty or registered-on-expected-branch); (c) in Phase A shells out `git worktree add .worktrees/<feature>/ -b feature/<feature> <base>` where `<base>` resolves via the `origin/main → origin/master → HEAD` chain (or `--base <ref>` override); (d) in Phase B executes `scripts/worktree-bootstrap.sh <absolute-worktree-path>` (or `.ps1`) with a 60-second timeout, capturing stdout/stderr to `PRPs/reports/<feature>/worktree-bootstrap.log` with secret redaction; bootstrap failure is non-fatal; bootstrap absence is a no-event; (e) emits a clear success message or a named HALT code (`FAILED_NOT_A_GIT_REPO`, `FAILED_BASE_REF_MISSING`, `FAILED_BRANCH_CONFLICT`, `FAILED_PATH_OCCUPIED`, `FAILED_BRANCH_DIVERGENCE`). The idempotency check uses `git worktree list --porcelain` as the authoritative state source (not path-existence, which has false positives on stale directories). The slug derivation mirrors the codebase-wide contract at `plan-writer.md:167-173` and `relay-execute.md:68`.

## Metadata

| Key | Value |
|-----|-------|
| Type | New command file (markdown prompt) |
| Complexity | Medium — deterministic infra command (no LLM); but novel git plumbing shell-out, idempotency detection via porcelain parse, bootstrap hook execution with timeout + redaction, and five named HALT codes |
| Systems Affected | `plugins/relay/commands/` (new file); `PRPs/reports/<feature>/worktree-bootstrap.log` (runtime artifact, written only when bootstrap hook runs); `.worktrees/<feature>/` (git worktree created by the command at runtime) |
| Dependencies | `plugins/relay/commands/relay-implement.md` (structural template — frontmatter, Decision Gate, Parse arguments, Preconditions, Phase A/B loop, Final output, Constraints, What you do NOT do); `plugins/relay/commands/relay-plan.md` (precondition HALT message shape); `plugins/relay/agents/plan-writer.md:167-173` (slug derivation contract); `plugins/relay/commands/relay-execute.md:68` (slug derivation reuse precedent); `docs/context/redaction-policy.md` (AC-6 bootstrap log secret redaction) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-worktree.prd.md` lines 188-191 (Implementation Phases table row 1) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| MUST | `PRPs/prds/relay-worktree.prd.md` | 1-280 | Source PRD — full Decision Gate, AC-1 through AC-9 (the phase-1 ACs), D1–D11 decisions, Technical Risks, User Flow (lines 136-149), Architecture Notes (lines 163-170) |
| MUST | `plugins/relay/commands/relay-implement.md` | 1-100 | Canonical structural sibling — mirrors its shape exactly (frontmatter, Decision Gate, Parse arguments, Preconditions P1–P5, Phase A loop, Final output, Constraints, What you do NOT do) |
| MUST | `plugins/relay/commands/relay-plan.md` | 48-80 | Precondition HALT message shape (P1 file-not-readable pattern, P2 status check pattern) — the canonical HALT message format for relay commands |
| MUST | `plugins/relay/agents/plan-writer.md` | 167-173 | Slug derivation contract: `<feature>` = basename minus `.prd.md`; kebab-cased, ASCII only, `[a-z0-9-]`; mirrored without shared utility per the codebase convention |
| MUST | `plugins/relay/commands/relay-execute.md` | 68 | Slug derivation reuse precedent: `Parse <feature> as the PRD basename minus .prd.md` — confirms the no-shared-utility duplication pattern |
| MUST | `plugins/relay/commands/relay-execute.md` | 607-621 | `## What you do NOT do` section — line 611 is the deferral comment for `/relay-worktree`; this plan ships what line 611 defers |
| SHOULD | `plugins/relay/commands/relay-implement.md` | 100-461 | Full command body — Phase A loop, Constraints, What you do NOT do sections; source of the structural pattern this command mirrors |
| SHOULD | `docs/context/redaction-policy.md` | 1-end | Three-layer redaction policy (AC-6 bootstrap log must apply Layer 1 invariant defaults + Layer 2 per-project extensions from `PRPs/redaction-extensions.txt`) |
| SHOULD | `docs/anti-patterns.md` | 60-84 | The `.claude/` write prohibition (lines 60-66) and interactive permission prompt prohibition (lines 79-84) — both active constraints for this command |

## Patterns to Mirror

### Pattern 1 — Command file frontmatter shape

# SOURCE: `plugins/relay/commands/relay-implement.md:1-4`

```yaml
---
description: 'Autonomous code generation from an APPROVED plan. Validates the plan path, runs preconditions, then adopts the implementer/code-reviewer pair via an internal writer↔reviewer loop with bounded retries (max_implement_retries=3), wall-clock budget (max_implement_minutes=45), oscillation detection always-on, dispute cap (max_disputes_per_session=2), per-attempt diff capture at PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch, and on APPROVED rubric performs all three D8 post-approval mutations atomically (plan trailing-block flip to *Status: IMPLEMENTED*, plan move to PRPs/plans/completed/, source PRD row N flip from in-progress to complete). Reviewer adoption is single-shot via Task per attempt — there is no Phase B; the loop lives entirely inside Phase A.'
argument-hint: <plan-path>
---
```

**Used by:** Task 1 (CREATE `plugins/relay/commands/relay-worktree.md` frontmatter). Adapt `description` to describe the infra command: deterministic git worktree creation, slug derivation, four preconditions, idempotency via `git worktree list --porcelain`, five HALT codes, bootstrap hook with 60s timeout and redacted log capture. Set `argument-hint: <feature-name>`.

---

### Pattern 2 — Decision Gate emission section shape

# SOURCE: `plugins/relay/commands/relay-implement.md:28-48`

```markdown
## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command creates a cross-cutting artifact (the implementation diff that the Test Runner consumes); the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project — these are the same three files the implementer and code-reviewer agents consult in their Phase 0 setups when assembling their own Decision Gate references. Your gate here covers the *command invocation*; the agents' gates inside their dispatch payloads cover the *plan being implemented*.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {semicolon-separated list}
- Decisions found:
  - ...
- Applicable anti-patterns:
  - ...
- Applicable architectural rules:
  - ...
- Result: PROCEED | HALT (reason)
```
```

**Used by:** Task 2 (Decision Gate section). Adapt Activated criteria to: "infra command creating git worktree at .worktrees/<feature>/; shells out git plumbing (D2 shell-out over EnterWorktree); references D1 path, D4 idempotency, D9 timeout, D10 branch prefix, D11 base-ref chain; bootstrap log artifact at PRPs/reports/<feature>/; .claude/settings.json allowlist must include git worktree add and bootstrap invocation."

---

### Pattern 3 — Preconditions + HALT messages shape

# SOURCE: `plugins/relay/commands/relay-plan.md:48-80`

```markdown
## Preconditions

HALT with a clear user-facing message (and do not proceed) if any
of these fail.

### P1 — PRD path resolves to a readable file

If `prd_path` does not point at an existing readable file:

> I cannot start plan authoring without `<prd_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-plan PRPs/prds/<feature>.prd.md
```

**Used by:** Task 3 (Preconditions section). Mirror this shape with worktree-specific preconditions: P1 cwd is git repo (`FAILED_NOT_A_GIT_REPO`), P2 branch `feature/<feature>` available or matches idempotent case, P3 base ref resolvable (`FAILED_BASE_REF_MISSING`), P4 path `.worktrees/<feature>/` empty or registered worktree on expected branch (`FAILED_PATH_OCCUPIED` / `FAILED_BRANCH_DIVERGENCE`).

---

### Pattern 4 — Slug derivation contract

# SOURCE: `plugins/relay/agents/plan-writer.md:167-173`

```markdown
### Step 1.4 — Compute the plan filename

- `<feature>` = basename of `<prd_path>` minus `.prd.md`.
- `<N>` = row N's `#` cell.
- `<slug>` = kebab-cased version of row N's `Phase` cell:
  lowercase, ASCII only, words joined by `-`, no leading/trailing
  hyphens. Any character outside `[a-z0-9-]` (after lowercasing) is
  dropped
```

**Used by:** Task 3 (Parse arguments section — slug sanitization of free argument). Mirror the same `[a-z0-9-]` charset, lowercase, max 64 chars, strip leading/trailing hyphens. Halt if result is empty after sanitization. Reuse without a shared utility (per the codebase convention confirmed at `relay-execute.md:68`).

---

### Pattern 5 — Phase A loop shape with budget state

# SOURCE: `plugins/relay/commands/relay-implement.md:179-190`

```markdown
### Phase A.0 — Initialise loop state

Set the budget caps and counters:

- `max_implement_retries = 3` (4 attempts total including the initial)
- `max_implement_minutes = 45` (wall-clock; 0 forbidden per source PRD D7)
- `max_disputes_per_session = 2` (TEST_CONTRACT_DISPUTE cap; consumes from retries per D9 Layer 1)
- `attempt = 1`
- `disputes_used = 0`
- `deadline_ts = now() + max_implement_minutes minutes`
```

**Used by:** Task 4 (Phase A creation logic + Phase B bootstrap hook). Adapt to worktree-specific state: `bootstrap_timeout_seconds = 60` (D9 default; Could-item `--bootstrap-timeout` flag not in MVP); no retry loop (creation is one-shot); Phase A = git worktree creation + idempotency; Phase B = bootstrap hook execution (best-effort, non-fatal).

---

### Pattern 6 — Final output surface + HALT messages

# SOURCE: `plugins/relay/commands/relay-implement.md:409-420`

```markdown
## Final output surface

On the success path (Phase A.3 standard-mode APPROVED + all three D8 mutations succeeded), emit verbatim per source PRD AC-1:

> ✅ Plan **IMPLEMENTED** at `PRPs/plans/completed/<basename>.plan.md`.
> Source PRD `PRPs/prds/<feature>.prd.md` row <N> marked `complete`.
```

**Used by:** Task 5 (Final output surface section). Adapt success messages for two paths: (a) new worktree created (AC-5): "Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Base ref: `<resolved-base>`."; (b) idempotent re-use (AC-3): "Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using." HALT messages use the five named codes with actionable instructions.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-worktree.md` | CREATE | The sole deliverable of Phase 1 — the infra command file that satisfies AC-1 through AC-9 |

## NOT Building (Scope Limits)

- **`context-builder *init` `.gitignore` evolution (AC-10)** — Phase 2 of the PRD; separate plan invocation; not this phase
- **`scripts/worktree-bootstrap.sh` template emission by context-builder (AC-11)** — Phase 2 of the PRD; separate plan invocation
- **`/relay-execute` D4 live wiring (AC-12, AC-13, AC-14, AC-15)** — Phase 3 of the PRD; this phase creates the standalone command only; the orchestrator deferral comment at `relay-execute.md:611` is NOT removed here
- **`--no-worktree` flag on `/relay-execute`** — Phase 3 deliverable
- **Synthetic dogfood (AC-16)** — Phase 4 of the PRD; separate plan invocation
- **Worktree cleanup / removal** — Pillar 3 (`/relay-approve`) owns `git worktree remove` + branch deletion post-merge; this command never removes worktrees
- **`EnterWorktree` native tool integration** — explicitly rejected per D2; hardcoded path `.claude/worktrees/<name>/` conflicts with D1 surface decision; auto-cleanup-on-session-exit lifecycle misaligned with relay's pipeline lifecycle
- **Docker Compose / dependency installation orchestration** — delegated to bootstrap script; relay does not become a Docker orchestrator
- **Bootstrap script content generation per stack** — bootstrap script template emission is Phase 2; this command only invokes an existing script if present
- **`--bootstrap-timeout <seconds>` flag** — Could-item; deferred until dogfood telemetry justifies
- **Stack auto-detection in bootstrap template** — deferred Could-item; Phase 2 ships a generic template only
- **Parallel `/relay-execute` against the same PRD** — D18 mitigation; deferred to Phase 3/4
- **Docs updates, version bump 0.10.0 → 0.11.0** — Phase 5 of the PRD; separate plan invocation

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-worktree.md` — frontmatter + title block

**ACTION**: Create the new file at `plugins/relay/commands/relay-worktree.md` with the YAML frontmatter and opening title/arguments/mission sections. The frontmatter `description` field must summarize the command: deterministic git worktree creation (shells out `git worktree add`; D2 shell-out over EnterWorktree); slug derivation from free argument or PRD basename (D3); four preconditions with named HALT codes; idempotency via `git worktree list --porcelain` (D4); base-ref resolution chain `origin/main → origin/master → HEAD` (D11); bootstrap hook execution with 60s timeout (D9) + redacted log at `PRPs/reports/<feature>/worktree-bootstrap.log` (AC-6, AC-7, AC-8); five HALT codes. The `argument-hint` must be `<feature-name>`. The "Your mission" section uses the same prose style as `/relay-implement` and `/relay-execute` but scoped to infra (no agent dispatch, no writer/reviewer split, no LLM judgment surface).

**MIRROR**: Pattern 1 (frontmatter shape at `plugins/relay/commands/relay-implement.md:1-4`)

**VALIDATE**: `grep -q "argument-hint: <feature-name>" plugins/relay/commands/relay-worktree.md && grep -q "git worktree add" plugins/relay/commands/relay-worktree.md && echo "TASK1: PASS" || echo "TASK1: FAIL"`

---

### Task 2: ADD Decision Gate section + See references

**ACTION**: Below the title block, add the `## Decision Gate (before any action)` section. It must instruct the command executor to consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` and emit the canonical six-line evidence block. Activated criteria must name: "infra command creating git worktree; shells out git plumbing (D2 shell-out over EnterWorktree); D1 path .worktrees/<feature>/; D4 idempotency; D9 60s timeout; D10 feature/ branch prefix; D11 base-ref chain; bootstrap log artifact at PRPs/reports/<feature>/; .claude/settings.json allowlist must include git worktree add and bootstrap invocation." Add a `## See` references block listing the source PRD and the structural sibling commands at their `${CLAUDE_PLUGIN_ROOT}/...` paths. If any Decision Gate source cannot be read, HALT with the canonical P4 byte-exact message (substituting `/relay-worktree` for the command name).

**MIRROR**: Pattern 2 (Decision Gate emission at `plugins/relay/commands/relay-implement.md:28-48`)

**VALIDATE**: `grep -q "## Decision Gate" plugins/relay/commands/relay-worktree.md && grep -q "PROCEED" plugins/relay/commands/relay-worktree.md && grep -q "D2 shell-out" plugins/relay/commands/relay-worktree.md && echo "TASK2: PASS" || echo "TASK2: FAIL"`

---

### Task 3: ADD Parse arguments + Preconditions sections

**ACTION**: Add the `## Parse arguments` section. The argument is an optional `<feature-name>`; when absent, the command expects to receive the feature name from `/relay-execute`'s `<feature>` value parsed from the PRD basename (per D3). Blank argument from standalone invocation → HALT with a usage message. Apply slug sanitization: lowercase, `[a-z0-9-]` only, max 64 chars, strip leading/trailing hyphens; if result is empty after sanitization → HALT with `FAILED_EMPTY_SLUG` and actionable message. Optional `--base <ref>` flag captures the base ref override (D11). Then add the `## Preconditions` section with four checks:
- **P1** — cwd is a git repo (`git rev-parse --show-toplevel` succeeds; else HALT `FAILED_NOT_A_GIT_REPO`)
- **P2** — base ref resolvable: attempt `origin/main`, then `origin/master`, then `HEAD`; if `--base <ref>` provided, verify that ref exists locally or in any remote; if none resolve → HALT `FAILED_BASE_REF_MISSING`
- **P3** — path `.worktrees/<feature>/` state check: run `git worktree list --porcelain`; if the path appears AND the HEAD branch matches `feature/<feature>` → set `idempotent_reuse = true` (proceed to Phase A idempotency path); if the path appears AND branch does NOT match → HALT `FAILED_BRANCH_DIVERGENCE` naming expected and actual branch; if the path exists on disk but is NOT in `git worktree list` output → HALT `FAILED_PATH_OCCUPIED` with message instructing `git worktree prune` then retry
- **P4** — branch `feature/<feature>` conflict check: run `git branch --list feature/<feature>`; if the branch exists AND points at a commit OTHER than `<base>` AND the path `.worktrees/<feature>/` is NOT in `git worktree list` → HALT `FAILED_BRANCH_CONFLICT` (branch pre-exists without a registered worktree, preventing clean `git worktree add -b`)

**MIRROR**: Pattern 3 (Preconditions shape at `plugins/relay/commands/relay-plan.md:48-80`); Pattern 4 (slug sanitization at `plugins/relay/agents/plan-writer.md:167-173`)

**VALIDATE**: `grep -q "FAILED_NOT_A_GIT_REPO" plugins/relay/commands/relay-worktree.md && grep -q "FAILED_BRANCH_DIVERGENCE" plugins/relay/commands/relay-worktree.md && grep -q "FAILED_PATH_OCCUPIED" plugins/relay/commands/relay-worktree.md && grep -q "FAILED_BASE_REF_MISSING" plugins/relay/commands/relay-worktree.md && grep -q "FAILED_BRANCH_CONFLICT" plugins/relay/commands/relay-worktree.md && echo "TASK3: PASS" || echo "TASK3: FAIL"`

---

### Task 4: ADD Phase A (creation) + Phase B (bootstrap) sections

**ACTION**: Add `## Phase A — Worktree creation` with the following logic:

**Phase A.0 — Idempotency gate**: If `idempotent_reuse = true` (set by P3), emit the verbatim AC-3 success message: "Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using." Skip to Final output. Do NOT re-execute the bootstrap script.

**Phase A.1 — Shell-out**: Execute `git worktree add .worktrees/<feature>/ -b feature/<feature> <resolved-base>`. Capture exit code. If non-zero → HALT verbatim with the git error message plus "Worktree creation failed. See above for git diagnostic." and exit non-zero.

**Phase A.2 — Verify**: Run `git worktree list --porcelain` and confirm `.worktrees/<feature>/` appears with branch `feature/<feature>`. If verification fails → HALT with "Worktree creation appeared to succeed (git exit 0) but the new worktree is not visible in `git worktree list`. This may indicate a filesystem race or a git version issue. Manual inspection required."

Then add `## Phase B — Bootstrap hook execution` with the following logic:

**Phase B.0 — Script detection**: Check for `scripts/worktree-bootstrap.sh` (Unix) then `scripts/worktree-bootstrap.ps1` (Windows) at the repo root. If neither exists → exit Phase B silently (AC-8 bootstrap absent is a no-event; no log, no warning).

**Phase B.1 — Execute with timeout**: Set `bootstrap_timeout_seconds = 60` (D9 default). Run the detected script as `<script-path> <absolute-worktree-path>` with a 60-second timeout. Capture stdout and stderr.

**Phase B.2 — Redact and write log**: Apply the three-layer redaction policy from `docs/context/redaction-policy.md` (Layer 1 invariant defaults on env-var name patterns and value regexes; Layer 2 per-project extensions from `PRPs/redaction-extensions.txt` if present). Write redacted output to `PRPs/reports/<feature>/worktree-bootstrap.log`, creating the directory if absent.

**Phase B.3 — Outcome**: If the script exits 0 within the timeout → proceed to Final output (success path). If the script exits non-zero OR times out → set `bootstrap_failed = true`; log warning to stdout: "Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details." Proceed to Final output (AC-7: bootstrap failure is non-fatal; worktree creation is the load-bearing outcome).

**MIRROR**: Pattern 5 (Phase A state structure at `plugins/relay/commands/relay-implement.md:179-190`); Pattern 6 (Final output shape at `plugins/relay/commands/relay-implement.md:409-420`)

**VALIDATE**: `grep -q "Phase A" plugins/relay/commands/relay-worktree.md && grep -q "Phase B" plugins/relay/commands/relay-worktree.md && grep -q "bootstrap_timeout_seconds" plugins/relay/commands/relay-worktree.md && grep -q "worktree-bootstrap.log" plugins/relay/commands/relay-worktree.md && grep -q "idempotent_reuse" plugins/relay/commands/relay-worktree.md && echo "TASK4: PASS" || echo "TASK4: FAIL"`

---

### Task 5: ADD Final output surface + Constraints + What you do NOT do

**ACTION**: Add three closing sections:

**`## Final output surface`**: Two success variants (verbatim, per AC-3 and AC-5):
- New worktree created (no bootstrap or bootstrap succeeded): "Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Base ref: `<resolved-base>`. (Bootstrap: OK)" or "(Bootstrap: skipped — script absent)"
- New worktree created, bootstrap failed: "Worktree created at `.worktrees/<feature>/` on branch `feature/<feature>`. Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details."
- Idempotent re-use: "Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using."
- Each HALT code emits a named, actionable message (e.g., `FAILED_BRANCH_DIVERGENCE: ...`).

**`## Constraints (hard rules)`**: Must include: (1) never write under `.claude/` — worktree goes to `.worktrees/<feature>/` (sibling) and only the bootstrap log goes under `PRPs/reports/<feature>/`; (2) never modify plans, never modify PRDs — this is an infra command; (3) never write outside `.worktrees/<feature>/` and `PRPs/reports/<feature>/worktree-bootstrap.log`; (4) never remove worktrees — cleanup is Pillar 3's job; (5) never use `EnterWorktree` native tool (D2); (6) never re-execute bootstrap on idempotent re-use (AC-3); (7) never HALT on bootstrap failure (AC-7); (8) never prompt the user — past the interactivity boundary; (9) bootstrap log must have redaction applied per `docs/context/redaction-policy.md` before writing.

**`## What you do NOT do`**: Mirror `/relay-implement`'s section, adapted: not modifying plans or PRDs; not invoking `/relay-execute` or any agent; not cleaning up worktrees; not creating bootstrap scripts (Phase 2); not wiring into `/relay-execute` (Phase 3); not retrying git worktree add on failure — surface and HALT; not numeric-suffixing the worktree path on collision — HALT loud per D4.

**MIRROR**: Pattern 6 (Final output surface at `plugins/relay/commands/relay-implement.md:409-420`)

**VALIDATE**: `grep -q "## Constraints" plugins/relay/commands/relay-worktree.md && grep -q "## What you do NOT do" plugins/relay/commands/relay-worktree.md && grep -q "never remove worktrees" plugins/relay/commands/relay-worktree.md && grep -q "Worktree created at" plugins/relay/commands/relay-worktree.md && echo "TASK5: PASS" || echo "TASK5: FAIL"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify the file exists and has non-zero size
test -s plugins/relay/commands/relay-worktree.md && echo "FILE_EXISTS_NONEMPTY: PASS" || echo "FILE_EXISTS_NONEMPTY: FAIL"

# Verify YAML frontmatter is present (opening and closing ---)
awk '/^---/{c++} c==2{found=1; exit} END{exit !found}' plugins/relay/commands/relay-worktree.md && echo "FRONTMATTER: PASS" || echo "FRONTMATTER: FAIL"

# Verify argument-hint is <feature-name>
grep -q "argument-hint: <feature-name>" plugins/relay/commands/relay-worktree.md && echo "ARGUMENT_HINT: PASS" || echo "ARGUMENT_HINT: FAIL"

# No trailing whitespace (basic markdown lint)
grep -Pn " +$" plugins/relay/commands/relay-worktree.md | head -5 || echo "NO_TRAILING_WHITESPACE: PASS"
```

### Level 2 — CONTENT_INVARIANTS

```bash
# AC anti-pattern: no .claude/ artifact path references in the command body
grep -n "\.claude/PRPs" plugins/relay/commands/relay-worktree.md && echo "ANTIPATTERN_DETECTED: .claude/ path found" || echo "NO_CLAUDE_ARTIFACT_PATHS: PASS"

# EnterWorktree must not be used (D2 decision)
grep -q "EnterWorktree" plugins/relay/commands/relay-worktree.md && echo "D2_VIOLATION: EnterWorktree referenced" || echo "D2_COMPLIANT: PASS"

# All five named HALT codes present
for code in FAILED_NOT_A_GIT_REPO FAILED_BASE_REF_MISSING FAILED_BRANCH_CONFLICT FAILED_PATH_OCCUPIED FAILED_BRANCH_DIVERGENCE; do
  grep -q "$code" plugins/relay/commands/relay-worktree.md && echo "$code: PRESENT" || echo "$code: MISSING"
done

# AC-3 idempotent re-use message present (verbatim from PRD)
grep -q "already exists on branch" plugins/relay/commands/relay-worktree.md && echo "AC3_MSG: PASS" || echo "AC3_MSG: FAIL"

# AC-6 bootstrap log path correct
grep -q "worktree-bootstrap.log" plugins/relay/commands/relay-worktree.md && echo "BOOTSTRAP_LOG: PASS" || echo "BOOTSTRAP_LOG: FAIL"

# AC-7 bootstrap failure non-fatal (command still succeeds)
grep -q "non-fatal" plugins/relay/commands/relay-worktree.md && echo "AC7_NONFATAL: PASS" || echo "AC7_NONFATAL: FAIL"

# D9 60-second timeout present
grep -q "60" plugins/relay/commands/relay-worktree.md && echo "D9_TIMEOUT: PASS" || echo "D9_TIMEOUT: FAIL"

# D11 base-ref resolution chain present
grep -q "origin/main" plugins/relay/commands/relay-worktree.md && grep -q "origin/master" plugins/relay/commands/relay-worktree.md && echo "D11_CHAIN: PASS" || echo "D11_CHAIN: FAIL"

# D10 branch prefix pattern present
grep -q "feature/<feature>" plugins/relay/commands/relay-worktree.md && echo "D10_PREFIX: PASS" || echo "D10_PREFIX: FAIL"

# Idempotency uses git worktree list --porcelain (not path-existence)
grep -q "porcelain" plugins/relay/commands/relay-worktree.md && echo "IDEMPOTENCY_PORCELAIN: PASS" || echo "IDEMPOTENCY_PORCELAIN: FAIL"

# Decision Gate section present
grep -q "## Decision Gate" plugins/relay/commands/relay-worktree.md && echo "DECISION_GATE: PASS" || echo "DECISION_GATE: FAIL"

# Constraints section present
grep -q "## Constraints" plugins/relay/commands/relay-worktree.md && echo "CONSTRAINTS: PASS" || echo "CONSTRAINTS: FAIL"
```

### Level 3 — DRY-RUN END-TO-END

```bash
# Structural shape check: verify all mandatory sections present in order
python3 - <<'EOF'
import sys
content = open("plugins/relay/commands/relay-worktree.md").read()
required = [
    "## Decision Gate",
    "## Parse arguments",
    "## Preconditions",
    "## Phase A",
    "## Phase B",
    "## Final output surface",
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

# Verify the command body does not reference .claude/worktrees/ (D2 / D1 violation)
grep -Pn "\.claude/worktrees" plugins/relay/commands/relay-worktree.md && echo "D1_VIOLATION: .claude/worktrees path found" || echo "D1_COMPLIANT: PASS"

# Verify worktree path uses .worktrees/ not .claude/worktrees/
grep -q "\.worktrees/<feature>/" plugins/relay/commands/relay-worktree.md && echo "WORKTREE_PATH: PASS" || echo "WORKTREE_PATH: FAIL"

# Verify the command is standalone (no relay-execute adoption references — that is Phase 3)
grep -q "relay-execute" plugins/relay/commands/relay-worktree.md && echo "SCOPE_NOTE: relay-execute ref found (verify it is a NOT-building exclusion, not a live wiring)" || echo "NO_EXECUTE_WIRING: PASS"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a PRD at `PRPs/prds/<feature>.prd.md` and the command receiving the PRD basename as the feature name (per D3 slug derivation), when `/relay-worktree` runs, then the worktree is created at `.worktrees/<feature>/` and the branch is named `feature/<feature>`. The command file's Parse arguments section documents the PRD-basename slug derivation contract (mirroring `plan-writer.md:167-173` and `relay-execute.md:68`).

- **AC-A2 (PRD AC-2):** Given a standalone invocation `/relay-worktree my-feature-name`, the command file's Parse arguments section sanitizes the argument to lowercase `[a-z0-9-]`, max 64 chars, strips leading/trailing hyphens. If the result is empty after sanitization, the command HALTs with `FAILED_EMPTY_SLUG` and an actionable message.

- **AC-A3 (PRD AC-3):** Given `.worktrees/<feature>/` already exists AND `git worktree list --porcelain` shows it on branch `feature/<feature>`, the command file's Phase A.0 idempotency gate sets `idempotent_reuse = true`, emits "Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using.", skips Phase A.1–A.2 and skips bootstrap re-execution (Phase B), and exits code 0.

- **AC-A4 (PRD AC-4):** Given `.worktrees/<feature>/` appears in `git worktree list --porcelain` on a branch OTHER than `feature/<feature>`, the command HALTs with `FAILED_BRANCH_DIVERGENCE` and a message naming both the expected branch (`feature/<feature>`) and the actual branch, instructing the user to resolve manually or choose a different feature name.

- **AC-A5 (PRD AC-5):** Given a clean repo where `feature/<feature>` does not yet exist, the command file's Phase A.1 shells out `git worktree add .worktrees/<feature>/ -b feature/<feature> <resolved-base>`. The `<resolved-base>` is determined by the P2 base-ref resolution chain: `origin/main` → `origin/master` → `HEAD`. `--base <ref>` overrides this chain when provided.

- **AC-A6 (PRD AC-6):** Given the target project has `scripts/worktree-bootstrap.sh` (executable, present at repo root), the command file's Phase B.1 invokes it as `<script-path> <absolute-worktree-path>` with a 60-second timeout (D9 default), capturing stdout/stderr into `PRPs/reports/<feature>/worktree-bootstrap.log` with redaction applied per `docs/context/redaction-policy.md` three-layer policy.

- **AC-A7 (PRD AC-7):** Given the bootstrap script exits non-zero OR times out at 60s, the command file's Phase B.3 still returns success (exit 0 with the worktree created), logs a warning to stdout naming the bootstrap log path, and emits "Worktree created. Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details."

- **AC-A8 (PRD AC-8):** Given neither `scripts/worktree-bootstrap.sh` nor `scripts/worktree-bootstrap.ps1` exists at repo root, Phase B.0 silently skips Phase B entirely — no log file written, no warning, no prompt — and the command exits success.

- **AC-A9 (PRD AC-9):** The command file HALTs with a named code + actionable message for each of the four precondition failures: `FAILED_NOT_A_GIT_REPO` (P1), `FAILED_BASE_REF_MISSING` (P2), `FAILED_BRANCH_CONFLICT` (P4), `FAILED_PATH_OCCUPIED` / `FAILED_BRANCH_DIVERGENCE` (P3). No artifact is written on HALT. The HALT message is verbatim and instructs the user on the corrective action.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bootstrap script execution differs across shells (bash on Unix vs PowerShell on Windows without WSL) | Medium | Medium — bootstrap hook unreachable on pure-PowerShell Windows without bash | Command file tries `.ps1` first, then `.sh`; documents the bash requirement; users on pure-PowerShell Windows must create `.ps1` variant manually. Worktree creation (the load-bearing outcome) is unaffected — Phase B is always best-effort |
| `git worktree list --porcelain` locale sensitivity | Low | Low — idempotency detection fails, creating duplicate attempts | Use `--porcelain` flag which is locale-independent per git man page; no human-readable output parsed |
| `.gitignore` does not yet contain `.worktrees/` — worktree files accidentally staged | Medium | Low — aesthetic/workflow issue, not a correctness failure | Documented in the Constraints section: users running this command before context-builder Phase 2 should manually add `.worktrees/` to `.gitignore`; Phase 2 will auto-write the entry |
| Bootstrap log redaction reuse path: `/relay-worktree` reimplements a filter instead of reusing the Test Runner's stdout-capture path | Low | Low — minor code duplication; redaction policy is the same | Both paths apply the same `docs/context/redaction-policy.md` Layer 1 defaults; duplication is acceptable (no shared utility exists in the codebase per D3 precedent). Harmonization is a Could-item post-dogfood |
| Phase 4 dogfood reveals Windows path separator issues in slug or worktree path construction | Medium | Medium — slug may produce invalid paths on Windows | Slug sanitization restricts to `[a-z0-9-]`; path construction uses forward slashes (git-native); the `git worktree add` command itself handles path normalization on Windows via Git for Windows layer |
| Uncommitted changes in the worktree on idempotent re-use (AC-3 covers clean case; dirty case is an Open Question in the PRD) | Low | Low — existing work preserved; new pipeline layer added on top | MVP default per PRD Open Question: warn-and-continue; the Constraints section documents this behavior explicitly |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Infra command vs agent-dispatching command:** `/relay-worktree` is the first relay command that is purely deterministic with no LLM dispatch. The command file instructs the executor (Claude Code) to shell out `git` commands directly via `Bash` — there is no `Task` dispatch to a sub-agent, no writer/reviewer pair, and no rubric evaluation. This is intentional (PRD Architecture Notes line 169: "No new agent. This is an infra command; it has no LLM judgment surface."). The plan-reviewer should not flag the absence of a `## Agent dispatch` section as a defect.

**Allowlist note:** The `.claude/settings.json` allowlist must be updated (either by the user manually or via context-builder Phase 2) to include `Bash(git worktree add *)` and `Bash(scripts/worktree-bootstrap.sh *)` before the command can run autonomously. The Constraints section of the command file should document this requirement explicitly so the user is not surprised by permission prompts on first invocation.

**`relay-execute.md:611` deferral:** The comment "Wiring `/relay-worktree` — deferred per 2026-04-19 surface decision" at line 611 of `relay-execute.md` is NOT removed by this phase. Phase 3 of the PRD owns that surgical Edit. This plan is complete when `plugins/relay/commands/relay-worktree.md` exists and passes plan-reviewer rubric; the orchestrator integration is a separate deliverable.

**Slug derivation reuse without a shared utility:** Per the codebase-wide convention confirmed at `relay-execute.md:68` and `plan-writer.md:167-173`, each command duplicates the slug-derivation regex locally — no shared utility exists and none should be introduced here. The implementer should copy the transform verbatim into the Parse arguments section of the new command file.

*Generated: 2026-05-10*
*Approved: 2026-05-10*
*Implemented: 2026-05-10*
*Status: IMPLEMENTED*
