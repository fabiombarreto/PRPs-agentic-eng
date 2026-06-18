# `/relay-pr` Command

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin command file (cross-cutting artifact consumed by the operator
  workflow, referenced by relay-execute and documentation); new pipeline stage (push + PR creation);
  impacts command surface, plugin manifest, settings allowlist, and all documentation surfaces
- Decisions found:
    • 2026-05-18 Pillar 3 command surface (three-command split) — /relay-pr verifies branch state (ahead
      of origin), pushes if needed, runs `gh pr create` with the final report as the PR description, and
      writes PRPs/reports/<feature>/final-report.md
    • 2026-05-18 Pillar 2/3 boundary — /relay-execute terminates with uncommitted changes; Pillar 3
      (/relay-commit then /relay-pr) owns commit + push + PR exclusively; /relay-execute permanently
      prohibited from pushing or opening PRs (hard rule #11)
    • 2026-04-19 command surface — /relay-pr precondition: last /relay-test-review returned APPROVED;
      one command per stage; writer/reviewer split only for non-deterministic authoring steps → /relay-pr
      is a deterministic infra command (no split, no LLM, no rubric)
    • 2026-04-19 PRP artifacts live under PRPs/, never under .claude/ — command file at
      plugins/relay/commands/; PRD at PRPs/prds/; final report at PRPs/reports/<feature>/
    • 2026-04-30 §7.5 plugin manifest version bump on every release that ships a plugin asset —
      relay-pr.md is a new plugin asset requiring a version bump in plugin.json
- Applicable anti-patterns:
    • Writing pipeline artifacts under .claude/ — command file goes to plugins/relay/commands/; PRD to
      PRPs/prds/; final report to PRPs/reports/<feature>/; no .claude/ writes
    • Emitting secret values in run reports or logs — final-report.md becomes the PR body (potentially
      public); the redaction policy (docs/context/redaction-policy.md) MUST be applied before publishing
    • Relying on interactive permission prompts in the autonomous loop — `git push origin feature/*`,
      `gh pr create *`, `gh pr view *`, `gh pr list *`, and `generate-final-report.mjs` are already
      present in docs/context/settings-allowlist.md; force-push and push-to-default-branch are denied
- Applicable architectural rules:
    • Pillar 3 owns the full commit → push → PR → merge lifecycle; /relay-execute is permanently
      prohibited from committing, pushing, or opening PRs
    • Happy path: /relay-prd → /relay-execute → (human validates) → /relay-commit → /relay-pr → /relay-approve
    • One command per stage; deterministic infra commands have no LLM and no rubric
    • Never push --force; never push to main/master (settings-allowlist denies both)
- Result: PROCEED
```

## Problem Statement

After `/relay-commit` creates a local commit in `.worktrees/<feature>/`, the operator must still push
the branch and open a pull request before review and merge can happen. Without a dedicated command this
requires manual `git push -u origin feature/<feature>` followed by a hand-written `gh pr create` — with
no consistent PR title, no structured PR body derived from the pipeline's audit trail, no idempotency
guard against a PR that already exists, and no guarantee that secret values in generated text are
redacted before they reach a (potentially public) PR description.

## Evidence

- The 2026-05-18 Pillar 2/3 boundary decision formalizes that `/relay-execute` terminates with
  uncommitted changes and is permanently prohibited from pushing or opening PRs (hard rule #11 in
  `plugins/relay/commands/relay-execute.md:732`) — making a dedicated push + PR command a first-class
  pipeline need.
- The `/relay-execute` success message already names `/relay:relay-pr <feature>` as Pillar 3 step 2,
  immediately after `/relay:relay-commit` (`plugins/relay/commands/relay-execute.md:700-702`).
- The `/relay-commit` Phase 4 output already points the operator to `/relay:relay-pr <feature>` as the
  next step (`plugins/relay/commands/relay-commit.md:154`) — the handoff target does not yet exist.
- The 2026-05-18 Pillar 3 command-surface decision pins the contract precisely: `/relay-pr` "verifies
  branch state (checks whether ahead of origin); pushes if needed; runs `gh pr create` with the final
  report as the PR description; writes `PRPs/reports/<feature>/final-report.md`."
- `scripts/generate-final-report.mjs` already exists and assembles the canonical `final-report.md`
  from `run.json` + `test-review.json` + per-attempt records — the source of the PR body when test
  artifacts are present.
- All required patterns are already in `docs/context/settings-allowlist.md`: `git push origin feature/*`
  (line 62), `gh pr create *` / `gh pr view *` / `gh pr list *` (lines 68-71), and
  `generate-final-report.mjs` (line 114). Force-push (lines 132-134) and push-to-default-branch
  (line 138) are explicitly denied — no new allowlist entries are needed.
- Web research confirms `gh pr create` does not upsert; the canonical idempotency pattern is to detect
  an existing PR with `gh pr list --head <branch> --state open --json url` before attempting creation
  (cli/cli Discussion #5792), and `git push` returns exit 0 even when the branch is already up to date,
  so a no-op push must be detected by comparing local vs. remote SHAs rather than the exit code.

## Proposed Solution

A new command file `plugins/relay/commands/relay-pr.md` that follows the `/relay-commit` structure
(Phase 0 worktree preconditions → assess → act → output), adapted for push + PR creation. The command
takes `<feature>` as its sole argument, resolves `.worktrees/<feature>/`, verifies it is on branch
`feature/<feature>` with no uncommitted changes (HALT → `/relay-commit` if dirty), confirms the branch
has at least one commit ahead of the resolved base ref, enforces the test-review gate **only when a
test framework is configured** (graceful skip when `run.json` is absent, symmetric with `/relay-test`
and `/relay-tdd`), pushes the branch with a non-forced `git push -u origin feature/<feature>` only when
local is ahead of remote, generates the PR body (full `final-report.md` via `generate-final-report.mjs`
when test artifacts exist; otherwise a minimal generated body with no final report written), detects an
existing open PR for the branch and reports its URL idempotently, and otherwise runs `gh pr create
--base <base> --head feature/<feature> --title "<feat(...): title>" --body-file <body>`. It is a
deterministic infra command — no LLM, no writer/reviewer split — that emits the PR URL and points to
`/relay-approve <pr>` as the next step.

## Key Hypothesis

We believe that a deterministic, idempotent `/relay-pr` command will eliminate all manual git-push and
`gh pr create` ceremony between a local commit and an open, review-ready pull request for relay
operators.
We'll know we're right when operators consistently advance from `/relay-commit` to a review-ready PR
without issuing any manual `git push` or `gh` commands, and re-running `/relay-pr` never creates a
duplicate PR.

## What We're NOT Building

- **Committing changes** — exclusively owned by `/relay-commit`; `/relay-pr` HALTs when the worktree has
  uncommitted changes rather than committing them, keeping the three-command split clean.
- **Merging the PR** — owned by `/relay-approve`; `/relay-pr` only opens the PR.
- **Branch / worktree cleanup** — owned by `/relay-approve` post-merge.
- **Docs Updater / Docs Reviewer cycle** — owned by `/relay-approve`.
- **Force-push or push to `main`/`master`** — permanently denied by the settings allowlist; a diverged
  remote HALTs for human intervention rather than overwriting history.
- **PR review, approval, or status-check polling** — out of scope; the human (or CI) reviews the opened
  PR.
- **Writer/reviewer split** — `/relay-pr` is deterministic infra (git + gh operations only); no LLM, no
  rubric.
- **Editing the PR body interactively** — the body is generated from structured artifacts; manual edits
  go through the GitHub web UI or `gh pr edit` after the fact.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Idempotent existing-PR exit | 100% of invocations against a branch that already has an open PR exit 0 and report the existing URL without creating a duplicate | Run command twice in succession; second run exits 0 and names the same PR URL |
| Zero manual git/gh commands between `/relay-commit` and an open PR | 0 | Operator observation during dogfood |
| PR body derived from structured context | 100% of executions | Inspect opened PR body: full `final-report.md` when test artifacts exist, minimal generated body otherwise |
| No secret values in PR bodies | 0 leaked values | Audit opened PR bodies against `docs/context/redaction-policy.md` during dogfood |
| Execution time (push + PR, typical worktree) | < 20 seconds | Chronometer during dogfood run |

## Acceptance Criteria (test scenarios)

- **AC-1 happy-path PR (test framework present):** Given a worktree at `.worktrees/<feature>/` on branch
  `feature/<feature>` with a clean working tree, at least one commit ahead of the base ref, and
  `PRPs/reports/<feature>/run.json` with `outcome=GREEN` plus an APPROVED `test-review.json`, when
  `/relay-pr <feature>` is invoked, then the branch is pushed to `origin/feature/<feature>`,
  `PRPs/reports/<feature>/final-report.md` is generated via `generate-final-report.mjs`, `gh pr create`
  is run with that file as `--body-file` and base `<resolved-base>`, and the output includes the PR URL
  and "Next: `/relay-approve <pr>`".

- **AC-2 uncommitted changes HALT:** Given a worktree at `.worktrees/<feature>/` with uncommitted
  changes (`git status --porcelain` non-empty), when `/relay-pr <feature>` is invoked, then the command
  halts with `FAILED_UNCOMMITTED_CHANGES` instructing the operator to run `/relay-commit <feature>`
  first, exits non-zero, and performs no push and no PR creation.

- **AC-3 no-framework graceful skip + minimal body:** Given a worktree on `feature/<feature>` with a
  clean tree and a commit ahead of base, and `PRPs/reports/<feature>/run.json` is absent (target has
  `test_frameworks: []`), when `/relay-pr <feature>` is invoked, then the test-review gate is skipped
  with a note in the output, no `final-report.md` is written, and the PR is opened with a minimal
  generated body (PRD title + commit summary).

- **AC-4 idempotent existing PR:** Given an open PR already exists for head branch `feature/<feature>`,
  when `/relay-pr <feature>` is invoked, then the command detects it via
  `gh pr list --head feature/<feature> --state open --json url`, reports the existing PR URL, and exits
  0 without creating a duplicate PR.

- **AC-5 test-review-not-approved HALT:** Given `PRPs/reports/<feature>/run.json` exists (a framework
  is configured) but there is no APPROVED `test-review.json`, when `/relay-pr <feature>` is invoked,
  then the command halts with `FAILED_TEST_REVIEW_NOT_APPROVED`, exits non-zero, and performs no push
  and no PR creation.

- **AC-6 idempotent no-op push:** Given the branch `feature/<feature>` is already pushed and up to date
  with `origin/feature/<feature>` (local and remote SHAs equal), when `/relay-pr <feature>` is invoked,
  then the push step is a no-op (detected by SHA comparison, not by `git push` exit code) and PR
  detection/creation proceeds normally.

- **AC-7 missing worktree / wrong branch HALT:** Given `.worktrees/<feature>/` does not exist, when
  `/relay-pr <feature>` is invoked, then the command halts with `FAILED_MISSING_WORKTREE` instructing
  the operator to run `/relay-worktree <feature>`; and given the worktree exists but is on a branch
  other than `feature/<feature>`, the command halts with `FAILED_WRONG_BRANCH` showing actual vs.
  expected branch. Both exit non-zero.

- **AC-8 diverged remote HALT (no force-push):** Given the remote `origin/feature/<feature>` has
  commits the local branch does not (non-fast-forward), when `/relay-pr <feature>` is invoked, then the
  non-forced push fails fast and the command halts with `FAILED_BRANCH_DIVERGENCE` instructing manual
  resolution; the command never passes `--force` or `--force-with-lease`.

- **AC-9 PR base = integration branch:** Given no `--base` flag and the feature branch
  `feature/<feature>` was created from `origin/develop`, when `/relay-pr <feature>` is invoked, then
  `gh pr create` is run with `--base develop` (the integration branch the feature branched from), not
  `main`/`master`; and given an explicit `--base <ref>`, that ref is used verbatim as the PR base.

- **AC-10 draft PR flag:** Given the `--draft` flag is passed and no open PR yet exists for the branch,
  when `/relay-pr <feature> --draft` is invoked, then `gh pr create` is run with `--draft` and the PR
  is opened in GitHub draft state.

- **AC-11 PR URL write-back:** Given a PR is opened (or an existing open PR is detected), when
  `/relay-pr <feature>` completes, then `PRPs/reports/<feature>/orchestrator-run.json` is updated with
  a `pr_url` field set to the PR URL; a write or parse failure is non-fatal and is noted in the output.

## Open Questions

All initial open questions were resolved during PRD authoring (2026-06-17) and folded into the
Decisions Log, Acceptance Criteria, and Architecture Notes:

- [x] **PR URL write-back** — RESOLVED: `/relay-pr` appends the opened/detected PR URL to
  `PRPs/reports/<feature>/orchestrator-run.json` (`pr_url` field; best-effort, non-fatal). See AC-11
  and Decisions Log.
- [x] **`--draft` flag** — RESOLVED: supported; passes `gh pr create --draft` to open a GitHub draft
  PR. See AC-10 and Decisions Log.
- [x] **`--base <ref>` flag + base resolution** — RESOLVED: `--base` overrides everything; otherwise
  the base is the integration branch the feature was branched from, then the develop-family fallback
  (`origin/develop` → `origin/dev` → `origin/development`), then `origin/main` → `origin/master`. See
  AC-9 and Architecture Notes "Base ref resolution".
- [x] **PR title source** — RESOLVED: `feat(<feature>): <PRD # heading>`, fallback
  `feat(<feature>): implement via relay` (mirrors `/relay-commit`). See Decisions Log.

---

## Users & Context

**Primary User**
- **Who:** relay operator (developer or tech lead) who has just run `/relay-commit <feature>` and
  validated the local commit.
- **Current behavior:** manually runs `git -C .worktrees/<feature>/ push -u origin feature/<feature>`
  followed by a hand-written `gh pr create`, with no structured body, no idempotency guard, and no
  redaction pass.
- **Trigger:** a clean, committed `feature/<feature>` branch ready to be shared for review.
- **Success state:** branch pushed to origin and an open PR (review-ready, with a structured body),
  ready for `/relay-approve <pr>`.

**Job to Be Done**
When I have committed a feature locally with `/relay-commit` and want it reviewed, I want to push the
branch and open a PR with a structured, context-derived body in one step, so I can advance to merge
without any manual git-push or `gh` ceremony and without risking a duplicate PR.

**Non-Users**
- `/relay-execute` itself — hard rule #11 permanently prohibits the orchestrator from pushing or opening
  PRs.
- Automated CI agents — `/relay-pr` is a manual step in the human validation gate between Pillar 2 and
  merge; unattended CI invocation is out of scope for the MVP.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Accept `<feature>` argument; resolve `.worktrees/<feature>/` automatically | Operator must not need the full worktree path |
| Must | HALT if `.worktrees/<feature>/` missing or branch is not `feature/<feature>` | Mirrors `/relay-commit` P1/P2; prevents confusing git errors |
| Must | HALT (`FAILED_UNCOMMITTED_CHANGES`) when the worktree is dirty | Keeps the three-command split: `/relay-commit` owns committing |
| Must | HALT (`FAILED_NOTHING_TO_PR`) when the branch has no commits ahead of base | There is nothing to open a PR for |
| Must | Test-review gate enforced only when `run.json` exists; graceful skip otherwise | Symmetric with `/relay-test` / `/relay-tdd` self-skip on `test_frameworks: []` |
| Must | Non-forced `git push -u origin feature/<feature>`, only when local is ahead of remote | Idempotent no-op push; never force, never default branch |
| Must | Detect an existing open PR via `gh pr list --head ... --json url`; report URL and exit 0 | Idempotency — safe to re-run without duplicating the PR |
| Must | `gh pr create --base <base> --head feature/<feature> --title ... --body-file <body>` | Core PR-creation operation |
| Must | PR body = `final-report.md` (via `generate-final-report.mjs`) when test artifacts exist; minimal generated body otherwise | User decision: minimal body / no final report when artifacts absent |
| Must | Apply `docs/context/redaction-policy.md` to any generated body before it becomes the PR description | Anti-pattern: never emit secrets into a (public) PR body |
| Must | Resolve PR base: feature's source integration branch → develop-family (`origin/develop`→`origin/dev`→`origin/development`) → `origin/main`→`origin/master`; `--base <ref>` overrides all | Targets the integration branch the feature branched from, not production by default (user decision 2026-06-17) |
| Should | Emit output block with PR URL, branch, and "Next: `/relay-approve <pr>`" | Operator confirmation + next-step guidance |
| Should | HALT (`FAILED_BRANCH_DIVERGENCE`) on a non-fast-forward push | Never overwrite remote history automatically |
| Should | Pre-flight check that `gh` is authenticated and an `origin` remote exists | Fail loud with an actionable message rather than a cryptic gh error |
| Should | `--draft` flag → `gh pr create --draft` (open as a GitHub draft PR) | User decision (2026-06-17): low-cost, useful for WIP PRs; included in MVP |
| Should | Append the opened/detected PR URL to `orchestrator-run.json` (`pr_url` field; best-effort) | Audit-trail completeness (user decision 2026-06-17) |
| Won't | Commit, merge, push `--force`, or push to `main`/`master` | Boundaries owned by other commands / denied by allowlist |
| Won't | Writer/reviewer split, LLM, or rubric | Deterministic infra command |

### MVP Scope

A single command file `plugins/relay/commands/relay-pr.md` implementing the Phase 0 preconditions +
4-phase flow (assess/gate → push → PR body → create + output) with: dirty-worktree HALT,
framework-conditional test-review gate, idempotent no-op push, existing-PR detection, conditional
`final-report.md` generation with redaction, and `gh pr create` with `--body-file`. No new agents,
hooks, or scripts (reuses the existing `generate-final-report.mjs`).

### User Flow

1. Operator runs `/relay-commit <feature>` → local commit created → output names `/relay-pr <feature>`.
2. Operator runs `/relay-pr <feature>`.
3. Command resolves the worktree; checks branch; checks `git status --porcelain` (dirty → HALT →
   `/relay-commit`); checks commits ahead of base (none → HALT).
4. Test-review gate: if `PRPs/reports/<feature>/run.json` exists, require an APPROVED `test-review.json`
   (else HALT); if `run.json` is absent, skip the gate with a note.
5. Push: compare local vs. `origin/feature/<feature>` SHA; push (non-forced) only if ahead; a
   non-fast-forward push HALTs (`FAILED_BRANCH_DIVERGENCE`).
6. PR detection: `gh pr list --head feature/<feature> --state open --json url` — non-empty → report URL,
   exit 0.
7. PR body: test artifacts present → `generate-final-report.mjs` → `final-report.md` (redacted);
   absent → minimal generated body, no final report written.
8. `gh pr create --base <base> --head feature/<feature> --title "<feat(<feature>): title>"
   --body-file <body>`.
9. Output: PR URL, branch, "Next: `/relay-approve <pr>`".

---

## Technical Approach

**Feasibility:** HIGH — pure git + `gh` operations, reuses the existing `generate-final-report.mjs`, no
new dependencies, no LLM; pattern established by `/relay-commit`.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written
alongside implementation. Acceptance Criteria seed those tests. (relay itself has `test_frameworks: []`,
so `/relay-pr`'s own dogfood run exercises the AC-3 graceful-skip path.)

### Architecture Notes

- Command file at `plugins/relay/commands/relay-pr.md` — relay command markdown with YAML frontmatter
  (`description`, `argument-hint: <feature-name>`); structurally analogous to `relay-commit.md`.
- All git operations use the `git -C .worktrees/<feature>/` prefix (from `relay-worktree.md:140`); works
  on Unix and Windows without a shell `cd`.
- Branch check: `git -C .worktrees/<feature>/ branch --show-current` must equal `feature/<feature>`.
- Dirty check: `git -C .worktrees/<feature>/ status --porcelain` must be empty.
- Ahead-of-remote check: compare `git rev-parse feature/<feature>` with `git rev-parse
  origin/feature/<feature>` (remote ref absent → push needed); `git push` exit 0 is NOT a reliable
  no-op signal.
- Push: `git -C .worktrees/<feature>/ push -u origin feature/<feature>` — never `--force`,
  `--force-with-lease`, or a default branch; a non-fast-forward rejection → `FAILED_BRANCH_DIVERGENCE`.
- Base ref resolution (PR `--base`; first match wins): (1) explicit `--base <ref>` flag; (2) the
  integration branch the feature branch was created from — detected as the candidate `origin` branch
  that is the nearest ancestor (closest merge-base) of `feature/<feature>`; (3) develop-family fallback
  when no parent is detected: first existing of `origin/develop` → `origin/dev` → `origin/development`;
  (4) `origin/main` → `origin/master` when no develop-family branch exists, or the detected parent is
  itself unusable as a PR target; (5) HALT (`FAILED_BASE_REF_UNRESOLVED`) with guidance to pass
  `--base` when none resolve. Never target the feature branch itself.
- Existing-PR detection: `gh pr list --head feature/<feature> --state open --json url --jq '.[].url'`;
  non-empty → idempotent exit.
- PR body: `node <plugin-root>/scripts/generate-final-report.mjs ...` when
  `PRPs/reports/<feature>/run.json` and `test-review.json` exist; the generated `final-report.md` is
  passed through the redaction policy, then supplied via `gh pr create --body-file`. When test artifacts
  are absent, a minimal body is composed from the PRD title + `git log` summary and passed via
  `--body-file` (a temp body file or `--body`), with no `final-report.md` written.
- PR title: `feat(<feature>): <prd-title>` (PRD `# ` heading), falling back to `feat(<feature>):
  implement via relay` — same derivation as `/relay-commit`.
- `--draft` flag: when passed, append `--draft` to `gh pr create`; the idempotent existing-PR detection
  (`gh pr list --head ...`) runs first regardless of the flag.
- PR URL write-back: after the PR is opened or an existing one is detected, set a `pr_url` field on
  `PRPs/reports/<feature>/orchestrator-run.json` (best-effort JSON merge; a write/parse failure is
  non-fatal and noted in the output, consistent with the graceful-degradation mandate).

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `gh` not authenticated, or no `origin` remote configured | M | Pre-flight check; HALT with an actionable message (`gh auth login` / add remote) before any push |
| Secret values leak into the PR body via `final-report.md` | M | Apply `docs/context/redaction-policy.md` before publishing; web research confirms GitHub does NOT auto-redact arbitrary generated text; minimal-body path emits only structured fields |
| Remote branch diverged (non-fast-forward push) | L | Non-forced push fails fast → `FAILED_BRANCH_DIVERGENCE`; never auto-force |
| `gh pr create` duplicate-PR race (PR opened between detection and creation) | L | Detection-first via `gh pr list`; if creation still errors on duplicate, surface gh stderr and report the existing PR |
| PR base branch unresolvable (no source integration branch, no develop-family, no `main`/`master`) | L | Five-step resolution chain (source branch → develop-family → main/master) + `--base` override; HALT (`FAILED_BASE_REF_UNRESOLVED`) with guidance if none resolve |
| Wrong base inferred — feature mis-detected as branched from `main` when team integrates on `develop` | M | Develop-family is tried ahead of `main`/`master`; `--base <ref>` override is the explicit escape hatch when detection picks the wrong parent |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Command file | Author `plugins/relay/commands/relay-pr.md` — Phase 0 preconditions + 4-phase protocol (assess/gate → push → PR body → create + output), idempotent existing-PR detection, framework-conditional test-review gate, conditional `final-report.md` generation with redaction, non-forced push | complete | - | - | PRPs/plans/relay-pr-command-phase-1-command-file.plan.md |
| 2 | Plugin bump + docs | Bump `plugins/relay/.claude-plugin/plugin.json` (0.14.0 → 0.15.0); flip `/relay-pr` from planned to implemented in `docs/api-reference.md`, `docs/context/architecture.md`, `documentation/reference/commands.html`, `documentation/roadmap/status.html`; add a `documentation/changelog.html` entry | complete | - | 1 | PRPs/plans/relay-pr-command-phase-2-plugin-bump-docs.plan.md |

### Phase Details

**Phase 1: Command file**
- **Goal:** Produce `plugins/relay/commands/relay-pr.md` with a complete, unambiguous protocol.
- **Scope:** Single file; no agents, hooks, or scripts; analogous to `relay-commit.md`, extended with
  push, idempotent PR detection, the framework-conditional test-review gate, and conditional
  final-report generation with redaction.
- **Success signal:** File exists; a human reads Phases 0–4 and finds no ambiguity; the `/relay-commit`
  analog is recognizable; all 11 ACs are addressable from the protocol text.

**Phase 2: Plugin bump + docs**
- **Goal:** Ship the command in the next versioned relay release and flip every documentation surface
  from planned to shipped.
- **Scope:** `plugin.json` version bump; ~5 documentation files updated; project phase 4 badge advances
  (two of three Pillar 3 commands now shipped).
- **Success signal:** `documentation/changelog.html` has a new versioned entry referencing `/relay-pr`;
  `plugin.json` version matches the changelog entry; the Pillar 3 section of
  `documentation/reference/commands.html` shows `/relay-pr` as shipped (not planned).

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Structural pattern | Analogous to `plugins/relay/commands/relay-commit.md` (Phase 0 preconditions + 4-phase) | Design from scratch | `/relay-commit` is a proven, readable sibling; `/relay-pr` reuses its worktree-precondition and `git -C` conventions |
| Uncommitted-changes handling | HALT (`FAILED_UNCOMMITTED_CHANGES`) → run `/relay-commit` first | Auto-commit then push | User decision (2026-06-17 Q&A): keeps the three-command split clean; avoids duplicating `/relay-commit`'s message-generation logic |
| Test-review gate | Required only when `run.json` exists; graceful skip when absent | Always require APPROVED; warn-only | User decision (2026-06-17 Q&A): symmetric with `/relay-test` / `/relay-tdd` self-skip on `test_frameworks: []`; does not block test-less features |
| PR body when test artifacts absent | Minimal generated body; no `final-report.md` written | Degrade to a reduced final report | User decision (2026-06-17 Q&A): keep the no-framework path simple; full `final-report.md` only when `run.json` + `test-review.json` exist |
| Existing-PR idempotency | Detect via `gh pr list --head ... --json url`; report URL, exit 0 | Rely on `gh pr create` duplicate error string | Web research (cli/cli #5792): detection-first validates state rather than matching error text; avoids duplicate PRs |
| Push safety | Non-forced `git push -u origin feature/<feature>`; SHA-compare for no-op; HALT on divergence | `--force-with-lease`; trust `git push` exit code | Allowlist denies force-push; `git push` returns 0 even when up-to-date, so a no-op needs an explicit SHA comparison |
| Writer/reviewer split | None — single deterministic command | Add a reviewer for PR-body quality | `/relay-pr` is pure infra (git + gh); LLM review of a generated body adds no value, per the 2026-04-19 surface decision |
| PR base resolution | `--base` override → feature's source integration branch → develop-family (`origin/develop`/`dev`/`development`) → `origin/main`/`master` | Always target `origin/main`/`master` (mirror `/relay-worktree`) | User decision (2026-06-17): PRs target the integration branch the feature branched from, not production; develop-family is the team's integration tier |
| `--draft` flag | Supported — passes `gh pr create --draft` | Defer to a future release | User decision (2026-06-17): low-cost, useful for WIP PRs; included in MVP |
| PR URL write-back | Append `pr_url` to `orchestrator-run.json` (best-effort, non-fatal) | Leave the URL only in command output | User decision (2026-06-17): completes the pipeline audit trail; degradation-safe so it never blocks PR creation |
| PR title source | `feat(<feature>): <PRD # heading>`; fallback `feat(<feature>): implement via relay` | Prefer the `orchestrator-run.json` feature title | User decision (2026-06-17): mirrors `/relay-commit` exactly for Pillar 3 consistency |

---

## Research Summary

**Market Context**

`gh pr create` does not upsert an existing PR; the maintainers explicitly declined automatic update
behavior (cli/cli Discussion #5792). The canonical idempotency pattern for CI is to query
`gh pr list --head <branch> --state open --json url --jq '.[].url'` first and exit 0 with the existing
URL when non-empty, rather than matching the "a pull request for branch … already exists" error string.
`gh pr create --body-file <path>` reads the PR body verbatim from a file (cli.github.com manual), which
fits supplying `final-report.md` as the description. GitHub's automatic secret redaction relies on exact
matching and does NOT reliably scrub derived secrets or values embedded in structured (JSON/YAML/XML)
text from generated report files (GitHub Actions "Secure use" reference) — confirming relay must apply
its own `docs/context/redaction-policy.md` pass before the body becomes a (potentially public) PR
description. `git push` exits 0 even when the branch is already up to date (up-to-date refs are signaled
by a leading `=` only under `--porcelain`/`--verbose`), so a no-op push must be detected by comparing
local vs. remote SHAs; community consensus is to never `--force` a shared branch in an automated
pipeline and to let a non-forced push fail fast on divergence for human resolution
(community Discussion #188246).

**Technical Context**

`plugins/relay/commands/relay-execute.md:700-702`: the success message already names
`/relay:relay-pr <feature>` as Pillar 3 step 2 — full alignment. `plugins/relay/commands/relay-commit.md:154`:
`/relay-commit` Phase 4 output already points to `/relay:relay-pr <feature>` as the next step.
`docs/decisions.md` (2026-05-18, three-command split): `/relay-pr` "verifies branch state (checks
whether ahead of origin); pushes if needed; runs `gh pr create` with the final report as the PR
description; writes `PRPs/reports/<feature>/final-report.md`" — the operative contract. `docs/decisions.md`
(2026-05-18, Pillar 2/3 boundary) + `relay-execute.md:732` hard rule #11: `/relay-execute` is
permanently prohibited from pushing or opening PRs. `scripts/generate-final-report.mjs`: exists; produces
the canonical `final-report.md` from `run.json` + `test-review.json` + per-attempt records — the
PR-body source when test artifacts exist. `docs/context/settings-allowlist.md`: `git push origin
feature/*` (line 62), `gh pr create *` / `gh pr view *` / `gh pr list *` (lines 68-71), and
`generate-final-report.mjs` (line 114) are already allowed; `git push --force*` (lines 132-134) and
`git push origin main*`/`master*` (line 138) are denied — no new allowlist entries needed.
`plugins/relay/commands/relay-worktree.md` (D11 base-ref chain): `origin/main` → `origin/master` → `HEAD`
fallback plus the `--base` override is the established base-resolution convention; `/relay-pr` adapts it
to prefer the feature's source integration branch and the develop-family (`origin/develop` / `dev` /
`development`) ahead of `main`/`master`, since PRs target the integration branch rather than production
(user decision 2026-06-17).

---

*Generated: 2026-06-17*
*Approved: 2026-06-17*
*Status: APPROVED*
