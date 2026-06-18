# Feature: Command file (Phase 1 of relay-pr-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin command file in plugins/relay/commands/ (cross-cutting artifact consumed by the operator workflow); new pipeline stage (push + PR creation); reuses the existing scripts/generate-final-report.mjs; no new agents, hooks, scripts, or allowlist entries
- Decisions found:
  - 2026-05-18 Pillar 3 command surface (three-command split) — /relay-pr verifies branch state (ahead of origin), pushes if needed, runs `gh pr create` with the final report as the PR description, writes PRPs/reports/<feature>/final-report.md
  - 2026-05-18 Pillar 2/3 boundary — Pillar 3 (/relay-commit then /relay-pr) owns commit + push + PR exclusively; /relay-execute permanently prohibited from pushing or opening PRs (hard rule #11)
  - 2026-04-19 command surface — /relay-pr is a deterministic infra command (no writer/reviewer split, no LLM, no rubric); one command per stage
  - 2026-04-19 PRP artifacts live under PRPs/, never under .claude/ — command file at plugins/relay/commands/; final report at PRPs/reports/<feature>/
  - 2026-04-19 secret redaction policy (canonical list in docs/context/redaction-policy.md) — applied before any generated text becomes a (potentially public) PR body
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ — command file goes to plugins/relay/commands/; final report to PRPs/reports/<feature>/; no .claude/ writes
  - Emitting secret values in run reports or logs — final-report.md becomes the PR body; the redaction policy MUST be applied before publishing
  - Relying on interactive permission prompts in the autonomous loop — `git push origin feature/*`, `gh pr create *`, `gh pr view *`, `gh pr list *`, and `generate-final-report.mjs` are already present in docs/context/settings-allowlist.md; force-push and push-to-default-branch are denied
- Applicable architectural rules:
  - Pillar 3 owns the full commit -> push -> PR -> merge lifecycle; /relay-execute is permanently prohibited from committing, pushing, or opening PRs
  - One command per stage; deterministic infra commands have no LLM and no rubric
  - Never push --force; never push to main/master (settings-allowlist denies both)
  - All pipeline artifacts live under PRPs/ at the repo root, never under .claude/
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-pr-command.prd.md` — Implementation Phases row 1: "Command file" — Goal: Produce `plugins/relay/commands/relay-pr.md` with a complete, unambiguous protocol. — Success signal: File exists; a human reads Phases 0–4 and finds no ambiguity; the `/relay-commit` analog is recognizable; all 11 ACs are addressable from the protocol text.

## Summary

This phase authors a single markdown command file, `plugins/relay/commands/relay-pr.md`, that pushes a feature branch and opens a GitHub pull request as relay Pillar 3 step 2. The command is deterministic infra — no LLM, no writer/reviewer split, no rubric — structurally analogous to the sibling `/relay-commit`. It follows the proven Phase 0 worktree-precondition shape of `relay-commit.md`, then a 4-phase protocol: Phase 1 ASSESS/GATE (branch + dirty + ahead-of-base checks; framework-conditional test-review gate; `gh`/`origin` pre-flight), Phase 2 PUSH (SHA-compared non-forced `git push -u origin feature/<feature>`; divergence HALT), Phase 3 PR BODY (idempotent existing-PR detection; conditional `final-report.md` via `generate-final-report.mjs` with redaction, else minimal generated body), and Phase 4 CREATE + OUTPUT (`gh pr create --base <base> --head feature/<feature> ... --body-file`; PR URL write-back to `orchestrator-run.json`; next-step pointer to `/relay-approve <pr>`). All git operations use the `git -C .worktrees/<feature>/` prefix; PR base is resolved via a `--base` override -> source integration branch -> develop-family -> main/master chain.

## User Story

As a relay operator who has just run `/relay-commit <feature>` and validated the local commit
I want to push the branch and open a review-ready PR with a structured, context-derived body in one deterministic step
So that I can advance to merge without any manual `git push` or `gh` ceremony and without ever creating a duplicate PR.

## Problem Statement

After `/relay-commit` creates a local commit in `.worktrees/<feature>/`, the operator must still push the branch and open a pull request before review and merge can happen. Without a dedicated command this requires manual `git push -u origin feature/<feature>` followed by a hand-written `gh pr create` — with no consistent PR title, no structured PR body derived from the pipeline's audit trail, no idempotency guard against a PR that already exists, and no guarantee that secret values in generated text are redacted before they reach a (potentially public) PR description. This phase delivers the command file that closes that gap; the handoff target named by `/relay-commit` Phase 4 (`relay-commit.md:154`) and the `/relay-execute` success message (`relay-execute.md:700-702`) does not yet exist.

## Solution Statement

Author `plugins/relay/commands/relay-pr.md` following the `/relay-commit` structure (Phase 0 worktree preconditions -> assess -> act -> output), adapted for push + PR creation. The command takes `<feature>` as its sole positional argument (plus optional `--base <ref>` and `--draft` flags), resolves `.worktrees/<feature>/`, verifies it is on branch `feature/<feature>` with a clean working tree (HALT -> `/relay-commit` if dirty), confirms at least one commit ahead of the resolved base, enforces the test-review gate only when `run.json` exists (graceful skip otherwise), pushes non-forced only when local is ahead of remote (SHA comparison, not exit code), detects an existing open PR and reports its URL idempotently, generates the PR body (full redacted `final-report.md` when test artifacts exist; minimal body otherwise), and otherwise runs `gh pr create`. It writes the opened/detected PR URL back to `orchestrator-run.json` (best-effort) and emits the PR URL plus `Next: /relay-approve <pr>`.

## Metadata

| Key | Value |
|-----|-------|
| Type | New plugin command file (markdown + YAML frontmatter) |
| Complexity | Medium — single file, but a dense multi-phase protocol covering 11 ACs (idempotency, base resolution, redaction, write-back) |
| Systems Affected | relay command surface (`plugins/relay/commands/`); reuses `scripts/generate-final-report.mjs`; reads `docs/context/redaction-policy.md`; writes `PRPs/reports/<feature>/final-report.md` and `orchestrator-run.json` (best-effort) |
| Dependencies | None (Implementation Phases row 1 `Depends: -`) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-pr-command.prd.md:345` (Implementation Phases row 1); Phase Details `:350-356` |
| phase_type | docs |

Note on `phase_type`: the sole deliverable is a markdown command file under `plugins/relay/commands/` (a documentation-class file — relay commands are prompt + protocol, not application source); the `## Files to Change` table contains only this one `.md` file and no application source files. The relay repo has `test_frameworks: []`, so there is no test-framework invocation as the natural validation mechanism — Level 1/2 validation is markdown-lint + `grep` content invariants, consistent with `docs/context/plan-template.md` item 12 for prompt-only deliverables.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| MUST | `PRPs/prds/relay-pr-command.prd.md` | 40-326, 345-356 | Source PRD: Problem/Solution, AC-1..AC-11, MoSCoW, Architecture Notes (base resolution, push, PR body, write-back), Phase 1 Details |
| MUST | `plugins/relay/commands/relay-commit.md` | 1-185 | Structural sibling: YAML frontmatter shape, Phase 0 preconditions with named HALT codes, `git -C` discipline, PR-title derivation, Phase 4 output + next-step pointer, Constraints/`What you do NOT do` sections |
| MUST | `plugins/relay/commands/relay-worktree.md` | 117-159 | Base-ref resolution chain (D11: `--base` override -> origin/main -> origin/master -> HEAD) and `FAILED_BRANCH_DIVERGENCE` HALT-code precedent to adapt for the develop-family chain |
| MUST | `scripts/generate-final-report.mjs` | 22-352 | Invocation signature `node generate-final-report.mjs <reports-dir> [--out <path>]`; reads `run.json` (required), `test-review.json` (optional), per-attempt `record.json` |
| MUST | `docs/context/settings-allowlist.md` | 52-64, 68-71, 107-118, 132-138 | Confirms `git push origin feature/*`, `gh pr create/view/list *`, and `generate-final-report.mjs` are pre-approved; force-push and push-to-default-branch are denied — no new allowlist entries needed |
| SHOULD | `docs/context/redaction-policy.md` | (whole) | The three-layer redaction list to apply to any generated body before it becomes the PR description |
| SHOULD | `docs/context/plan-template.md` | 1-281 | Canonical command/plan structure conventions; section ordering reference |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-commit.md:1-4
---
description: 'Deterministic local commit for relay Pillar 3. Accepts a <feature-name> argument; resolves .worktrees/<feature>/ and verifies the worktree is on branch feature/<feature>; ... No push, no network calls, no LLM, no writer/reviewer split. Infra command analogous to prp-commit, adapted for relay worktree conventions.'
argument-hint: <feature-name>
---
```
Copied by Task 1 — the new `relay-pr.md` frontmatter is the exact same single-quoted dense `description:` + `argument-hint:` shape, enumerating every behaviour/input/output and stating "no LLM, no writer/reviewer split".

```
# SOURCE: plugins/relay/commands/relay-commit.md:37-61
### P1 — Worktree exists
Check that `.worktrees/<feature>/` exists on disk. If the path is absent, HALT:
> FAILED_MISSING_WORKTREE: `.worktrees/<feature>/` does not exist.
> Run `/relay-worktree <feature>` first ...
### P2 — Branch check
git -C .worktrees/<feature>/ branch --show-current
If the result is NOT `feature/<feature>`, HALT:
> FAILED_WRONG_BRANCH: `.worktrees/<feature>/` is checked out on branch `<actual-branch>`, not the expected branch `feature/<feature>`.
```
Copied by Task 2 — the Phase 0 preconditions of `relay-pr.md` reuse this verbatim structure for `FAILED_MISSING_WORKTREE` (AC-7) and `FAILED_WRONG_BRANCH` (AC-7), then add `FAILED_UNCOMMITTED_CHANGES` (AC-2), `FAILED_NOTHING_TO_PR`, and the framework-conditional test-review gate -> `FAILED_TEST_REVIEW_NOT_APPROVED` (AC-5) / graceful skip (AC-3).

```
# SOURCE: plugins/relay/commands/relay-commit.md:113-129
git -C .worktrees/<feature>/ add -A
git -C .worktrees/<feature>/ diff --cached --stat
git -C .worktrees/<feature>/ commit -m "<generated-or-fallback-message>"
```
Mirrored by Task 3 — every git operation in `relay-pr.md` (`rev-parse`, `push`, `merge-base`, `branch --show-current`, `status --porcelain`) uses the same `git -C .worktrees/<feature>/` prefix (relay-commit.md Constraint 5, line 169). The push step (AC-6/AC-8) is `git -C .worktrees/<feature>/ push -u origin feature/<feature>`, never `--force`.

```
# SOURCE: plugins/relay/commands/relay-worktree.md:119-136
1. If `--base <ref>` was provided: run `git rev-parse --verify <ref>`. If it exits zero -> use `<ref>` ...
2. Otherwise, try each in order until one resolves (exit code 0):
   - git rev-parse --verify origin/main
   - git rev-parse --verify origin/master
   - git rev-parse --verify HEAD
   Use the first that resolves as `<resolved-base>`.
```
Adapted by Task 3 — `relay-pr.md` reuses this `--base`-override-first chain but, per PRD Architecture Notes (`:306-312`) and AC-9, inserts the feature's source integration branch (nearest merge-base ancestor) and the develop-family fallback (`origin/develop` -> `origin/dev` -> `origin/development`) ahead of `origin/main` -> `origin/master`, with `FAILED_BASE_REF_UNRESOLVED` when none resolve.

```
# SOURCE: plugins/relay/commands/relay-commit.md:148-155
**Committed**: <hash-and-message>
**Branch**: feature/<feature>

Next: `/relay:relay-pr <feature>`
```
Mirrored by Task 4 — `relay-pr.md` Phase 4 emits a symmetric structured output block (`**PR**: <url>`, `**Branch**: feature/<feature>`, then `Next: /relay:relay-approve <pr>`), and the PR title derivation reuses the `feat(<feature>): <prd-title>` -> `feat(<feature>): implement via relay` fallback from `relay-commit.md:96-107`.

```
# SOURCE: scripts/generate-final-report.mjs:22-352  (invocation + inputs)
node generate-final-report.mjs <reports-dir> [--out <path>]
const runData = readJsonIfExists(join(reportsDir, 'run.json'));
const reviewData = readJsonIfExists(join(reportsDir, 'test-review.json'));
```
Mirrored by Task 3 — Phase 3 invokes `node <plugin-root>/scripts/generate-final-report.mjs PRPs/reports/<feature>/ --out PRPs/reports/<feature>/final-report.md` only when `run.json` and `test-review.json` exist; the generated body is passed through the `docs/context/redaction-policy.md` pass before becoming `--body-file`. No new script is written (PRD MVP: reuses the existing script).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-pr.md` | CREATE | The sole deliverable: the new Pillar 3 push + PR command file with Phase 0 preconditions + the 4-phase protocol (assess/gate -> push -> PR body -> create + output). No new agents, hooks, or scripts. |

## NOT Building (Scope Limits)

- **Committing changes** — owned by `/relay-commit`; `/relay-pr` HALTs (`FAILED_UNCOMMITTED_CHANGES`) on a dirty worktree rather than committing.
- **Merging the PR, or branch/worktree cleanup** — owned by `/relay-approve` post-merge.
- **Docs Updater / Docs Reviewer cycle** — owned by `/relay-approve`.
- **Force-push or push to `main`/`master`** — permanently denied by the settings allowlist; a diverged remote HALTs (`FAILED_BRANCH_DIVERGENCE`) for human intervention; the command never passes `--force` or `--force-with-lease`.
- **PR review, approval, or status-check polling** — out of scope; the human (or CI) reviews the opened PR.
- **Writer/reviewer split, LLM, or rubric** — `/relay-pr` is deterministic infra (git + gh only).
- **Editing the PR body interactively** — the body is generated from structured artifacts; manual edits go through the GitHub web UI or `gh pr edit`.
- **Plugin version bump and documentation-surface flips** — deferred to Phase 2 of this PRD (`plugin.json` bump + docs updates), which depends on this phase.
- **Phase 2 itself** — this plan covers only Implementation Phases row 1 (Command file).

## Step-by-Step Tasks

### Task 1: CREATE frontmatter + mission of `plugins/relay/commands/relay-pr.md`

- **ACTION**: Create the file with the YAML frontmatter (single-quoted dense `description:` enumerating every behaviour/input/output + flags `--base`/`--draft`, plus `argument-hint: <feature-name>`) and a `# /relay-pr` heading, `**Arguments:** $ARGUMENTS` line, and a `## Your mission` paragraph stating it is a deterministic infra command (no LLM, no writer/reviewer split) analogous to `/relay-commit`, pointing to the source PRD and `relay-commit.md`.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-commit.md:1-4` (frontmatter shape).
- **VALIDATE**:
```bash
test -f plugins/relay/commands/relay-pr.md && head -4 plugins/relay/commands/relay-pr.md | grep -q "argument-hint: <feature-name>"
```

### Task 2: ADD Phase 0 preconditions + Phase 1 ASSESS/GATE to `plugins/relay/commands/relay-pr.md`

- **ACTION**: Append Phase 0 (P0 blank-arg usage HALT; P1 `FAILED_MISSING_WORKTREE`; P2 `FAILED_WRONG_BRANCH` — both AC-7) and Phase 1 ASSESS/GATE: `git -C .worktrees/<feature>/ status --porcelain` non-empty -> `FAILED_UNCOMMITTED_CHANGES` -> `/relay-commit` (AC-2); zero commits ahead of base -> `FAILED_NOTHING_TO_PR`; framework-conditional test-review gate (if `PRPs/reports/<feature>/run.json` exists require APPROVED `test-review.json` else `FAILED_TEST_REVIEW_NOT_APPROVED` (AC-5); if `run.json` absent, skip with a note (AC-3)); and a `gh`-auth / `origin`-remote pre-flight HALT.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-commit.md:37-61` (precondition + named HALT-code pattern).
- **VALIDATE**:
```bash
grep -Eq "FAILED_MISSING_WORKTREE" plugins/relay/commands/relay-pr.md && grep -Eq "FAILED_WRONG_BRANCH" plugins/relay/commands/relay-pr.md && grep -Eq "FAILED_UNCOMMITTED_CHANGES" plugins/relay/commands/relay-pr.md && grep -Eq "FAILED_TEST_REVIEW_NOT_APPROVED" plugins/relay/commands/relay-pr.md
```

### Task 3: ADD Phase 2 PUSH + Phase 3 PR BODY (base resolution, idempotency, redaction) to `plugins/relay/commands/relay-pr.md`

- **ACTION**: Append Phase 2 PUSH — SHA comparison of `git -C .worktrees/<feature>/ rev-parse feature/<feature>` vs `origin/feature/<feature>` (remote ref absent -> push needed); push only when ahead via non-forced `git -C .worktrees/<feature>/ push -u origin feature/<feature>`; never `--force`/`--force-with-lease`; a non-fast-forward rejection -> `FAILED_BRANCH_DIVERGENCE` (AC-6, AC-8). Append Phase 3 PR BODY — base resolution chain (`--base` override -> source integration branch via nearest merge-base -> develop-family `origin/develop`/`dev`/`development` -> `origin/main`/`master` -> `FAILED_BASE_REF_UNRESOLVED`) (AC-9); existing-PR detection via `gh pr list --head feature/<feature> --state open --json url --jq '.[].url'` -> non-empty reports URL and exits 0 (AC-4); body = `node <plugin-root>/scripts/generate-final-report.mjs PRPs/reports/<feature>/ --out PRPs/reports/<feature>/final-report.md` (then apply `docs/context/redaction-policy.md`) when test artifacts exist, else a minimal redacted body (PRD title + `git log` summary), no `final-report.md` written (AC-3).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-worktree.md:119-136` (base-ref chain) and `# SOURCE: scripts/generate-final-report.mjs:22-352` (invocation + inputs).
- **VALIDATE**:
```bash
grep -q "rev-parse" plugins/relay/commands/relay-pr.md && grep -q "push -u origin feature/" plugins/relay/commands/relay-pr.md && grep -q "FAILED_BRANCH_DIVERGENCE" plugins/relay/commands/relay-pr.md && grep -q "gh pr list --head feature/<feature> --state open --json url" plugins/relay/commands/relay-pr.md && grep -q "generate-final-report.mjs" plugins/relay/commands/relay-pr.md && grep -q "redaction-policy.md" plugins/relay/commands/relay-pr.md
```

### Task 4: ADD Phase 4 CREATE + OUTPUT + PR-URL write-back to `plugins/relay/commands/relay-pr.md`

- **ACTION**: Append Phase 4 — `gh pr create --base <resolved-base> --head feature/<feature> --title "feat(<feature>): <prd-title>" --body-file <body>` (append `--draft` when the flag was passed, AC-10; PR title `feat(<feature>): <prd-title>` with fallback `feat(<feature>): implement via relay`, AC-1); best-effort `pr_url` write-back to `PRPs/reports/<feature>/orchestrator-run.json` with a non-fatal note on write/parse failure (AC-11); and a structured output block (`**PR**: <url>`, `**Branch**: feature/<feature>`, `Next: /relay:relay-approve <pr>`) (AC-1).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-commit.md:148-155` (Phase 4 output + next-step pointer; PR-title fallback).
- **VALIDATE**:
```bash
grep -q "gh pr create --base" plugins/relay/commands/relay-pr.md && grep -q -- "--body-file" plugins/relay/commands/relay-pr.md && grep -q "pr_url" plugins/relay/commands/relay-pr.md && grep -q "relay:relay-approve" plugins/relay/commands/relay-pr.md
```

### Task 5: ADD Constraints + "What you do NOT do" + allowlist note to `plugins/relay/commands/relay-pr.md`

- **ACTION** (AC-A5, AC-A11; PRD AC-2, AC-6, AC-8 + anti-patterns): Append a `## Constraints (hard rules)` section (never `--force`/`--force-with-lease`; never push to `main`/`master`; never commit, merge, or clean up; always `git -C .worktrees/<feature>/`; apply redaction before any body is published; never write under `.claude/`; never prompt the user — HALTs are verbatim and the command exits) and a `## What you do NOT do` section (commit, merge, cleanup, writer/reviewer split, interactive body edit), plus an allowlist note stating all required patterns are already in `docs/context/settings-allowlist.md` (`git push origin feature/*` :62; `gh pr create/view/list *` :68-71; `generate-final-report.mjs` :114) — no new entries needed. These hard rules are the enforcement surface for the no-force-push / diverged-remote semantics (AC-A5 ← PRD AC-6, AC-8) and the redaction-applied / no-`.claude/`-writes / no-force-push-spelling anti-pattern guards (AC-A11 ← PRD AC-2, AC-8).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-commit.md:1-4` (the `Constraints` + `What you do NOT do` section discipline established by the sibling; relay-commit.md:163-185).
- **VALIDATE**:
```bash
grep -q "Constraints (hard rules)" plugins/relay/commands/relay-pr.md && grep -q "What you do NOT do" plugins/relay/commands/relay-pr.md && grep -q "settings-allowlist.md" plugins/relay/commands/relay-pr.md && ! grep -q ".claude/PRPs/" plugins/relay/commands/relay-pr.md
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS (markdown well-formedness + frontmatter)

```bash
# File exists and opens with valid YAML frontmatter delimited by ---
test -f plugins/relay/commands/relay-pr.md
head -1 plugins/relay/commands/relay-pr.md | grep -qx -- "---"
grep -qE "^argument-hint: <feature-name>$" plugins/relay/commands/relay-pr.md
# markdownlint if available (non-fatal when absent; relay has no markdown linter wired)
command -v markdownlint >/dev/null 2>&1 && markdownlint plugins/relay/commands/relay-pr.md || echo "markdownlint not installed — skipping (relay ships no markdown linter; structural grep checks at Level 2 are the gate)"
```

### Level 2 — CONTENT_INVARIANTS (grep checks for the prompt-only deliverable)

```bash
# All Phase 0 + Phase 1 gates and HALT codes present
for code in FAILED_MISSING_WORKTREE FAILED_WRONG_BRANCH FAILED_UNCOMMITTED_CHANGES FAILED_NOTHING_TO_PR FAILED_TEST_REVIEW_NOT_APPROVED FAILED_BRANCH_DIVERGENCE FAILED_BASE_REF_UNRESOLVED; do
  grep -q "$code" plugins/relay/commands/relay-pr.md || { echo "MISSING: $code"; exit 1; }
done
# Core operations
grep -q "git -C .worktrees/<feature>/ push -u origin feature/<feature>" plugins/relay/commands/relay-pr.md
grep -q "gh pr list --head feature/<feature> --state open --json url" plugins/relay/commands/relay-pr.md
grep -q "gh pr create --base" plugins/relay/commands/relay-pr.md
grep -q "generate-final-report.mjs" plugins/relay/commands/relay-pr.md
grep -q "redaction-policy.md" plugins/relay/commands/relay-pr.md
grep -q "pr_url" plugins/relay/commands/relay-pr.md
# Anti-pattern guards: no .claude/ writes, no force-push spellings
! grep -q ".claude/PRPs/" plugins/relay/commands/relay-pr.md
! grep -qE "push .*--force|--force-with-lease|push -f" plugins/relay/commands/relay-pr.md
```

### Level 3 — DRY-RUN END-TO-END (human read-through against the PRD ACs)

```bash
# Confirm the four protocol phases and the next-step pointer are all present and ordered
grep -nE "## Phase [0-4]" plugins/relay/commands/relay-pr.md
grep -q "Next: \`/relay:relay-approve <pr>\`" plugins/relay/commands/relay-pr.md
echo "Manual gate: a human reads Phases 0-4 and confirms each of PRD AC-1..AC-11 is addressable from the protocol text (PRD Phase 1 Success signal)."
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1, AC-7):** `plugins/relay/commands/relay-pr.md` exists with valid YAML frontmatter (`description`, `argument-hint: <feature-name>`), a `# /relay-pr` heading, and Phase 0 preconditions defining `FAILED_MISSING_WORKTREE` and `FAILED_WRONG_BRANCH` (missing worktree / wrong branch HALTs), mirroring `relay-commit.md`.
- **AC-A2 (PRD AC-2):** The protocol's Phase 1 specifies that a non-empty `git -C .worktrees/<feature>/ status --porcelain` HALTs with `FAILED_UNCOMMITTED_CHANGES` instructing the operator to run `/relay-commit <feature>` first, with no push and no PR creation.
- **AC-A3 (PRD AC-3):** Phase 1 specifies the framework-conditional test-review gate — skipped with a note when `PRPs/reports/<feature>/run.json` is absent — and Phase 3 specifies a minimal generated body (PRD title + commit summary) with no `final-report.md` written in that case.
- **AC-A4 (PRD AC-5):** Phase 1 specifies that when `run.json` exists but no APPROVED `test-review.json` is present, the command HALTs with `FAILED_TEST_REVIEW_NOT_APPROVED` and performs no push and no PR creation.
- **AC-A5 (PRD AC-6, AC-8):** Phase 2 specifies a SHA-compared no-op push (local vs `origin/feature/<feature>`, not the `git push` exit code) and a non-forced push that fails fast on a non-fast-forward, HALTing with `FAILED_BRANCH_DIVERGENCE` and never passing `--force`/`--force-with-lease`.
- **AC-A6 (PRD AC-4):** Phase 3 specifies idempotent existing-PR detection via `gh pr list --head feature/<feature> --state open --json url` that reports the existing URL and exits 0 without creating a duplicate.
- **AC-A7 (PRD AC-1):** Phase 3 specifies generating the PR body via `node <plugin-root>/scripts/generate-final-report.mjs PRPs/reports/<feature>/ --out PRPs/reports/<feature>/final-report.md` (then redaction) when `run.json` + `test-review.json` exist, supplied to `gh pr create --body-file`.
- **AC-A8 (PRD AC-9):** Phase 3 specifies the PR base resolution chain (`--base` override -> source integration branch -> develop-family `origin/develop`/`dev`/`development` -> `origin/main`/`master` -> `FAILED_BASE_REF_UNRESOLVED`), with an explicit `--base <ref>` used verbatim.
- **AC-A9 (PRD AC-10):** Phase 4 specifies that the `--draft` flag appends `--draft` to `gh pr create`, after the idempotent existing-PR detection runs first regardless of the flag.
- **AC-A10 (PRD AC-1, AC-11):** Phase 4 specifies `gh pr create --base <base> --head feature/<feature> --title "feat(<feature>): <title>" --body-file <body>`, the best-effort `pr_url` write-back to `orchestrator-run.json` (non-fatal on failure), and an output block including the PR URL and `Next: /relay-approve <pr>`.
- **AC-A11 (PRD AC-2, AC-8; anti-patterns):** The command file applies `docs/context/redaction-policy.md` to any generated body before publishing, never writes under `.claude/`, and contains no force-push spellings — verified by the Level 2 negative `grep` guards.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Secret values leak into the PR body via `final-report.md` (the body can become a public PR description) | M | High | Phase 3 applies `docs/context/redaction-policy.md` before the body becomes `--body-file`; the minimal-body path emits only structured fields; Level 2 asserts `redaction-policy.md` is referenced |
| Wrong PR base inferred — feature mis-detected as branched from `main` when the team integrates on `develop` | M | Medium | Develop-family (`origin/develop`/`dev`/`development`) is tried ahead of `main`/`master`; the explicit `--base <ref>` override is the escape hatch; documented in Phase 3 base-resolution prose |
| `gh` not authenticated or no `origin` remote configured | M | Medium | Phase 1 pre-flight check HALTs with an actionable message (`gh auth login` / add remote) before any push |
| `git push` exit 0 misread as "pushed" on an already-up-to-date branch, causing a redundant push attempt | M | Low | Phase 2 detects the no-op by SHA comparison (`rev-parse` local vs `origin/feature/<feature>`), not by the `git push` exit code (web research: up-to-date refs are signalled only under `--porcelain`/`--verbose`) |
| Duplicate-PR race (a PR opens between detection and creation) | L | Low | Detection-first via `gh pr list`; if `gh pr create` still errors on a duplicate, the command surfaces gh stderr and reports the existing PR (PRD Technical Risks) |
| Markdown structural ambiguity makes a downstream operator/agent misread a phase | L | Medium | Level 3 manual read-through gate against PRD AC-1..AC-11 (PRD Phase 1 Success signal); Level 2 grep invariants assert every HALT code and core operation string is present |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
  - Context: the relay repo itself declares `test_frameworks: []`, so `/relay-pr`'s own dogfood run exercises the AC-3 graceful-skip path (no `run.json`, minimal body). This is consistent with the PRD's TDD-routing note (`relay-pr-command.prd.md:288-291`).
- **No new allowlist entries.** All required patterns are already present in `docs/context/settings-allowlist.md`: `git push origin feature/*` (line 62), `gh pr create *` / `gh pr view *` / `gh pr list *` (lines 68-71), and `node */plugins/relay/scripts/generate-final-report.mjs *` (line 114). Force-push (lines 132-134) and push-to-default-branch (line 138) are explicitly denied — the command must never emit those forms.
- **Reuses, does not author, `scripts/generate-final-report.mjs`.** PRD MVP scope: no new agents, hooks, or scripts. The script's invocation signature (`<reports-dir> [--out <path>]`) and inputs (`run.json`, `test-review.json`, per-attempt `record.json`) are anchored at `scripts/generate-final-report.mjs:22-352`.
- **Research gaps surfaced during grounding (carry into implementation):**
  - research-codebase: no existing relay command calls `generate-final-report.mjs` and no command uses `gh pr list` idempotency or `gh pr create --base` — the invocation conventions (working directory, `${CLAUDE_PLUGIN_ROOT}` node path, base as branch name vs SHA) are inferred from the allowlist pattern and the gh manual rather than a live in-repo example. Confirm the exact `node` path spelling against the allowlist pattern `Bash(node */plugins/relay/scripts/generate-final-report.mjs *)` during implementation.
  - research-web: the exact `git push` process exit value for the already-up-to-date case was not confirmable from a primary source — which is precisely why Phase 2 relies on SHA comparison rather than the exit code; and `git rev-parse origin/<branch>` behaviour when the remote tracking ref does not yet exist (never-pushed branch) must be handled (treat ref-resolution failure as "push needed").
- **Phase 2 (plugin bump + docs) is out of scope here** and depends on this phase per the PRD Implementation Phases table.

*Generated: 2026-06-17*
*Approved: 2026-06-17*
*Implemented: 2026-06-17*
*Status: IMPLEMENTED*
