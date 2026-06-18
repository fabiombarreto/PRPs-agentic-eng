# `/relay-commit` Command

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin command file (cross-cutting artifact consumed by operator
  workflow and referenced by relay-execute, relay-pr, and documentation); impacts command surface,
  plugin manifest, settings allowlist, and all documentation surfaces
- Decisions found:
    • 2026-05-18 Pillar 3 command surface: /relay-commit + /relay-pr + /relay-approve — defines
      /relay-commit as local-only commit, idempotent, no push, deterministic infra command; no
      writer/reviewer split; commit message from orchestrator-run.json + PRD title
    • 2026-05-18 Pillar 2/3 boundary — /relay-execute terminates with uncommitted changes;
      /relay-commit is the exclusively authorized commit step
    • 2026-04-19 Command surface: one command per stage; writer/reviewer split only for non-
      deterministic authoring steps — /relay-commit is deterministic infra (no split)
    • 2026-04-19 PRP artifacts live under PRPs/, never under .claude/ — command file at
      plugins/relay/commands/; PRD at PRPs/prds/
    • 2026-04-30 Plugin manifest version bump on every minor/major release that ships a plugin
      asset — relay-commit.md is a new plugin asset requiring a version bump in plugin.json
    • 2026-04-19 .claude/settings.json allowlist: narrow patterns — git status*, git add *,
      git commit *, git diff* already present in docs/context/settings-allowlist.md; no new
      patterns needed
- Applicable anti-patterns:
    • Writing pipeline artifacts under .claude/ — command file goes to plugins/relay/commands/;
      PRD to PRPs/prds/; no .claude/ writes
    • Relying on interactive permission prompts in the autonomous loop — all required git patterns
      already declared in settings-allowlist.md; /relay-commit must not require new manual approvals
- Applicable architectural rules:
    • Pillar 3 owns the full commit → push → PR → merge lifecycle; /relay-execute is permanently
      prohibited from committing (hard rule #11)
    • Happy path: /relay-prd → /relay-execute → (human validates) → /relay-commit → /relay-pr
      → /relay-approve
    • One command per stage; no LLM, no rubric for deterministic infra commands
- Result: PROCEED
```

## Problem Statement

After `/relay-execute` completes, the working tree in `.worktrees/<feature>/` holds uncommitted
implementation changes. The operator must create a local git commit before `/relay-pr` can push
and open a PR. Without a dedicated command, this step requires manual `git add` + `git commit`
inside the worktree — with no structured commit message, no idempotency guarantee, and no
integration with the pipeline's audit trail.

## Evidence

- The 2026-05-18 Pillar 2/3 boundary decision formalizes that `/relay-execute` terminates at
  "all phases complete" with uncommitted changes — making a structured commit step a first-class
  pipeline need
- The `/relay-execute` success message already instructs the operator to run
  `/relay-commit <feature>` as step 1 of Pillar 3
  (`plugins/relay/commands/relay-execute.md:699-702`)
- `orchestrator-run.json` contains `feature`, `prd_path`, `outcome`, and `phases_completed` —
  structured context that seeds a meaningful commit message without user input
- The upstream `prp-core/commands/prp-commit.md` establishes a proven assess → stage → commit
  → output pattern that relay adapts with worktree-aware preconditions
- All required git patterns (`git status*`, `git add *`, `git commit *`, `git diff*`) are
  already present in `docs/context/settings-allowlist.md:52-60` — no new allowlist entries needed

## Proposed Solution

A command file `plugins/relay/commands/relay-commit.md` with **two modes resolved from the
argument** in a Phase 0 routing step (added 2026-06-18):

- **Worktree mode** (original behavior) — triggered when the argument names an existing
  `.worktrees/<arg>/`. Follows the `prp-commit` 4-phase structure (assess worktree state → commit
  message → stage + commit → output) scoped via `git -C .worktrees/<feature>/`. Resolves the
  worktree, verifies the branch is `feature/<feature>`, runs `git status --porcelain` to detect a
  clean worktree (exits 0 idempotently), generates a commit message from `orchestrator-run.json` +
  PRD title (fallback `feat(<feature>): implement via relay`), executes
  `git -C .worktrees/<feature>/ add -A && git -C .worktrees/<feature>/ commit -m "<message>"`, and
  emits a structured output block with commit hash and a next-step pointer to `/relay-pr`.
  Deterministic, non-interactive, no LLM judgment.

- **Current-branch mode** (new) — triggered when there is no argument, or when the argument does
  not match a worktree (treated as a natural-language *target description*, like `prp-commit`).
  Operates on the current repository/branch in the working directory: reviews the working-tree
  diff, interprets the description to scope which files to stage, flags files that probably should
  not be committed (secrets, build artifacts, editor cruft, debug scaffolding) and asks the
  operator what to do, generates a concise conventional-commit message from the diff, then stages +
  commits. Brings relay-commit closer to `prp-commit` for everyday commits outside the worktree
  pipeline. The only interaction is the single suspicious-file confirmation, and only when
  something is actually flagged.

An existing worktree always wins the routing decision; a non-empty argument with no matching
worktree falls through to current-branch mode rather than halting.

## Key Hypothesis

We believe that a deterministic, idempotent `/relay-commit` command will eliminate all manual git
ceremony between pipeline completion and PR creation for relay operators.
We'll know we're right when operators consistently advance from `/relay-execute` to `/relay-pr`
without issuing any manual git commands.

## What We're NOT Building

- **Push or PR creation** — exclusively owned by `/relay-pr`; `/relay-commit` is local-only and
  makes no network calls
- **Interactive commit message editing** — message is generated from structured context; manual
  edits go through `git commit --amend` after the fact
- **Selective staging / cherry-pick** — `git add -A` commits all changes; partial commits require
  manual git
- **Amend of prior commits** — out of scope; escape hatch is manual `git commit --amend`
- **Auto-push after commit** — permanent boundary per the 2026-05-18 Pillar 3 decision
- **Writer/reviewer split** — `/relay-commit` is deterministic infra (no LLM, no rubric)
- **`--no-verify` flag** — project pre-commit hooks must run; suppressing them is out of scope

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Idempotent clean-worktree exit | 100% of clean-worktree invocations exit 0 with "Nothing to commit" | Run command twice in succession; second run exits 0 without creating a commit |
| Commit message references PRD title and feature slug | 100% of commit executions | `git log --oneline` inspection after execution |
| Execution time (stage + commit, typical worktree) | < 10 seconds | Chronometer during dogfood run |
| Zero manual git commands required between `/relay-execute` and `/relay-pr` | 0 | Operator observation during dogfood |

## Acceptance Criteria (test scenarios)

- **AC-1 happy-path commit:** Given a worktree at `.worktrees/<feature>/` on branch
  `feature/<feature>` with uncommitted implementation changes, when `/relay-commit <feature>`
  is invoked, then a local git commit is created on `feature/<feature>` with a message of the
  form `feat(<feature>): <prd-title>`, and the output includes the short commit hash, file count,
  and "Next: `/relay-pr <feature>`".

- **AC-2 idempotent clean worktree:** Given a worktree at `.worktrees/<feature>/` with a clean
  working tree (no uncommitted changes), when `/relay-commit <feature>` is invoked, then the
  command exits 0 with the message "Nothing to commit — worktree already clean. Next:
  `/relay-pr <feature>`" and no new commit is created.

- **AC-3 missing worktree HALT:** Given that `.worktrees/<feature>/` does not exist, when
  `/relay-commit <feature>` is invoked, then the command halts with a clear message instructing
  the operator to run `/relay-worktree <feature>` first and exits non-zero.

- **AC-4 missing orchestrator-run.json fallback:** Given that
  `PRPs/reports/<feature>/orchestrator-run.json` does not exist or cannot be parsed, when
  `/relay-commit <feature>` is invoked with uncommitted changes in the worktree, then the commit
  proceeds using the fallback message `feat(<feature>): implement via relay` and the output notes
  that the audit log was unavailable.

- **AC-5 wrong branch HALT:** Given that `.worktrees/<feature>/` exists but its current branch
  is NOT `feature/<feature>`, when `/relay-commit <feature>` is invoked, then the command halts
  with a message showing the actual branch and the expected branch, and exits non-zero.

- **AC-6 no-argument current-branch commit:** Given a repository on any branch with uncommitted
  changes and no flagged files, when `/relay-commit` is invoked with no argument, then the command
  stages all changes, generates a conventional-commit message from the diff, creates a commit on
  the current branch, and reports the hash, branch, and file count — without prompting.

- **AC-7 argument-as-target-description:** Given a non-empty argument that does NOT match any
  `.worktrees/<arg>/`, when `/relay-commit <arg>` is invoked, then the command does NOT halt;
  instead it enters current-branch mode and interprets `<arg>` as a target description scoping
  which files are staged (e.g. `only docs`, `except lockfile`).

- **AC-8 suspicious-file confirmation:** Given uncommitted changes that include a likely-unwanted
  file (e.g. `.env`, a build artifact, or a diff introducing an obvious secret), when
  `/relay-commit` runs in current-branch mode, then it surfaces the flagged path(s) with a reason
  and asks the operator whether to exclude, commit anyway, or abort — and honors the answer.

- **AC-9 clean-tree current-branch exit:** Given a clean working tree, when `/relay-commit` is
  invoked in current-branch mode, then it exits 0 with "Nothing to commit — the working tree is
  already clean" and creates no commit.

## Open Questions

- [ ] Should `/relay-commit` append the commit hash back to `orchestrator-run.json` for audit
  trail completeness? (Should-item — deferred to implementation)
- [ ] Should a `--message` flag be supported for manual override of the generated commit message?
  (Could-item — deferred to implementation)
- [ ] Should pre-commit hooks from the target project run? (Current position: yes — do not pass
  `--no-verify`. If hooks fail, the operator resolves manually and re-runs `/relay-commit`.)

---

## Users & Context

**Primary User**
- **Who:** relay operator (developer or tech lead) who has just completed a `/relay-execute` run
  on a feature
- **Current behavior:** manually runs `cd .worktrees/<feature>/ && git add -A && git commit -m
  "..."` after validating pipeline output, with no structured message and no idempotency check
- **Trigger:** successful `/relay-execute` completion followed by human validation of the
  implementation changes (review of diff, optional manual testing)
- **Success state:** clean worktree with a local commit on `feature/<feature>`, ready for
  `/relay-pr <feature>`

**Job to Be Done**
When I have validated the output of `/relay-execute` and am ready to create a PR, I want to
commit the pipeline's changes locally with a structured, context-derived message, so I can
advance to `/relay-pr` without any manual git ceremony.

**Non-Users**
- Automated CI agents — `/relay-commit` is an explicitly manual step in the human validation
  gate between Pillar 2 and Pillar 3; CI invocation is out of scope
- `/relay-execute` itself — hard rule #11 in `relay-execute.md` permanently prohibits the
  orchestrator from committing

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Accept `<feature>` argument; resolve `.worktrees/<feature>/` automatically | Operator must not need to know the full worktree path |
| Must | HALT if `.worktrees/<feature>/` does not exist | Prevents confusing git errors from missing path |
| Must | HALT if worktree branch is not `feature/<feature>` | Prevents committing to wrong branch silently |
| Must | Detect clean worktree via `git status --porcelain`; exit 0 when clean | Idempotency — safe to run twice without error |
| Must | `git -C .worktrees/<feature>/ add -A` + `git commit -m "<generated>"` | Core commit operation |
| Must | Generate commit message from `orchestrator-run.json` + PRD title | Structured, context-aware message without user input |
| Must | Fallback to `feat(<feature>): implement via relay` if audit log unreadable | Graceful degradation — commit must not fail due to missing JSON |
| Must | Phase 0 mode routing: existing worktree → worktree mode; else → current-branch mode | One command serves both the pipeline worktree flow and everyday current-branch commits |
| Must | Current-branch mode: review the diff, interpret a target description, generate a conventional-commit message, stage + commit on the current branch | Brings relay-commit to parity with `prp-commit` for commits outside the worktree pipeline |
| Must | Current-branch mode: flag likely-unwanted files (secrets, build artifacts, editor cruft, debug scaffolding) and ask the operator what to do | Prevents accidental commit of secrets/artifacts; the only interaction point |
| Should | Emit output block with commit hash, file count, and "Next: /relay-pr <feature>" | Operator confirmation and next-step guidance |
| Should | Note in output when fallback message was used | Transparency about message source |
| Should | Append commit hash to `orchestrator-run.json` for audit trail | Keeps pipeline audit trail complete |
| Could | `--message` flag to override generated commit message | Power-user escape hatch |
| Won't | Push, `gh pr create`, or any network operation | Permanent boundary; owned by `/relay-pr` |
| Won't | Amend, interactive rebase, cherry-pick | Out of scope; manual git escape hatch |
| Won't | `--no-verify` to skip project hooks | Hooks represent project quality gates |

### MVP Scope

A single command file `plugins/relay/commands/relay-commit.md` implementing the 4-phase
prp-commit-analogous flow with relay-specific worktree preconditions, `orchestrator-run.json`-
derived commit message, and idempotent clean-worktree exit.

### User Flow

1. Operator runs `/relay-execute <prd-path>` → pipeline completes → success message names
   `/relay-commit <feature>` as step 1
2. Operator validates changes manually (reviews diff, runs manual tests if needed)
3. Operator runs `/relay-commit <feature>`
4. Command resolves worktree path; checks branch; runs `git status --porcelain`
5. If clean: exit 0 with "Nothing to commit — worktree already clean. Next: /relay-pr <feature>"
6. If dirty: reads `orchestrator-run.json` + PRD title → composes message →
   `git -C .worktrees/<feature>/ add -A && git -C .worktrees/<feature>/ commit -m "feat(<feature>): <title>"`
7. Output: short hash, message, file count, "Next: `/relay-pr <feature>`"
8. Operator proceeds to `/relay-pr <feature>`

---

## Technical Approach

**Feasibility:** HIGH — pure git operations, no new dependencies, no LLM, pattern established by
`prp-commit`

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests
written alongside implementation. Acceptance Criteria seed those tests.

### Architecture Notes

- Command file at `plugins/relay/commands/relay-commit.md` — relay command markdown format with
  YAML frontmatter (`description`, `argument-hint: <feature-name>`)
- Worktree path: `<repo-root>/.worktrees/<feature>/` — derived from `<feature>` argument; no
  ENV variable
- Branch check: `git -C .worktrees/<feature>/ branch --show-current` must equal
  `feature/<feature>`
- Idempotency check: `git -C .worktrees/<feature>/ status --porcelain` — empty string → exit 0
- Commit message generation: read `PRPs/reports/<feature>/orchestrator-run.json` → extract
  `prd_path` → read PRD file → extract first `# ` heading as title → compose
  `feat(<feature>): <title>`; fallback to `feat(<feature>): implement via relay` if either file
  is unreadable
- Stage + commit: `git -C .worktrees/<feature>/ add -A` then
  `git -C .worktrees/<feature>/ commit -m "<message>"`
- Confirm hash: `git -C .worktrees/<feature>/ log -1 --oneline`
- `git -C <path>` pattern (from `relay-worktree.md:140`) scopes all git operations to the
  worktree directory without requiring `cd`; works on both Unix and Windows

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pre-commit hooks fail (commitlint, formatting, lint-staged) | M | Surface hook stderr verbatim; do not suppress; operator resolves manually and re-runs `/relay-commit` |
| `orchestrator-run.json` absent or malformed (pipeline incomplete or feature is new) | M | Fallback to generic message; log warning in output — commit must not fail due to missing JSON |
| Worktree on wrong branch (operator manually checked out a different branch) | L | HALT with clear message showing actual vs expected branch and recovery instruction |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Command file | Author `plugins/relay/commands/relay-commit.md` — 4-phase protocol analogous to prp-commit, with relay worktree preconditions, orchestrator-run.json message generation, and idempotent clean-worktree exit | complete | - | - | PRPs/plans/relay-commit-command-phase-1-command-file.plan.md |
| 2 | Plugin bump + docs | Bump `plugins/relay/.claude-plugin/plugin.json`; update `docs/api-reference.md`, `docs/context/architecture.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `documentation/roadmap/status.html` | complete | - | 1 | PRPs/plans/relay-commit-command-phase-2-plugin-bump-docs.plan.md |
| 3 | Dual mode (current-branch) | Add Phase 0 mode routing; add Section B current-branch mode (review diff, interpret target description, flag suspicious files + confirm, conventional-commit message from diff); split constraints by mode; bump `plugin.json`; refresh all doc surfaces | complete | - | 1 | - |

### Phase Details

**Phase 1: Command file**
- **Goal:** Produce `plugins/relay/commands/relay-commit.md` with complete, unambiguous protocol
- **Scope:** Single file; no agents, hooks, or scripts; analogous to prp-commit structure adapted
  for relay worktree conventions and orchestrator-run.json context
- **Success signal:** File exists; human reads Phases 0–4 and finds no ambiguity; prp-commit
  analog is recognizable; all 5 ACs are addressable from the protocol text

**Phase 2: Plugin bump + docs**
- **Goal:** Ship the command as part of the next versioned relay release; update all documentation
  surfaces to reflect the shipped `/relay-commit`
- **Scope:** `plugin.json` version bump; 5 documentation files updated
- **Success signal:** `documentation/changelog.html` has a new versioned entry referencing
  `/relay-commit`; `plugin.json` version matches the changelog entry; Pillar 3 section of
  `documentation/reference/commands.html` shows `/relay-commit` as shipped (not planned)

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Structural pattern | Analogous to `prp-core/commands/prp-commit.md` (4-phase: assess → stage → commit → output) | Design from scratch | prp-commit is a proven, readable pattern; relay adapts it with worktree-aware preconditions rather than reinventing |
| Commit message source | `orchestrator-run.json` + PRD file title; fallback to generic | Interactive prompt; fixed template | Structured context is available without user input; non-interactive aligns with the deterministic infra character of the command |
| Branch verification | HALT if not `feature/<feature>` | Warn only and proceed | Silent commit to wrong branch would corrupt the pipeline's branch contract and be difficult to detect later |
| Hook execution | Allow hooks to run (no `--no-verify`) | Skip hooks with `--no-verify` | Hooks represent project-level quality gates; suppressing them undermines the commit's trustworthiness |
| Writer/reviewer split | None — single deterministic command | Add reviewer for commit message quality | `/relay-commit` is pure infra (git operations only); LLM review of a generated commit message adds no value and contradicts the "no LLM" character of the command |
| git -C pattern | `git -C .worktrees/<feature>/ <subcommand>` for all git ops | `cd .worktrees/<feature>/ && git ...` | `-C` pattern works on both Unix and Windows without a shell `cd`; established by relay-worktree.md:140 |
| Dual mode (2026-06-18) | Argument routes the command: existing `.worktrees/<arg>/` → worktree mode; no/other argument → current-branch mode (argument is a target description) | Keep worktree-only; or split into two commands | One command covers both the pipeline worktree commit and everyday current-branch commits; existing-worktree-wins routing is unambiguous; avoids a second command and keeps muscle memory |
| Current-branch interactivity (2026-06-18) | Prompt the operator only for the suspicious-file decision, and only when something is flagged | Never prompt (silent `git add -A`); or fully interactive | Silent `add -A` risks committing secrets/artifacts; a single targeted confirmation is the minimum safety gate without turning the command into an interview. Worktree mode stays fully non-interactive |
| Message source by mode (2026-06-18) | Worktree mode: `orchestrator-run.json` + PRD title. Current-branch mode: conventional-commit message inferred from the staged diff | Single message strategy for both | Worktree commits have pipeline artifacts to draw from; ad-hoc current-branch commits do not, so the diff is the only reliable source |

---

## Research Summary

**Market Context**

`git status --porcelain` is the canonical idempotency check for detecting clean working trees in
CI scripts — empty output = worktree clean, exit 0 without committing. Commitizen formalizes this
as exit code 11 (NothingToCommitError), a dedicated non-error state distinct from real failures.
The "local commit only, no push" pattern as a deliberate human checkpoint is absent from all
surveyed tooling — semantic-release, commitizen, and git-cliff all treat commit+push+publish as
an atomic sequence. `/relay-commit` introduces this separation as a novel architectural choice
aligned with relay's human validation gate philosophy. Human-in-the-loop gates in CI operate at
the workflow-job level (environment protection rules), not at the git-commit level — confirming
that relay's operator-triggered local commit is a distinctive pattern, not borrowed from existing
tooling.

**Technical Context**

`plugins/relay/commands/relay-execute.md:699-702`: success message already names
`/relay-commit <feature>` as Pillar 3 step 1 — full alignment. `PRPs/reports/<feature>/
orchestrator-run.json`: confirmed schema (`feature`, `prd_path`, `outcome`, `phases_completed`,
`phases[]`) — provides commit message context; PRD title requires a separate file read since it
is not stored in the JSON. `docs/context/settings-allowlist.md:52-60`: `git status*`,
`git add *`, `git commit *`, `git diff*`, `git worktree *` already present — no new allowlist
entries needed. `plugins/prp-core/commands/prp-commit.md`: 4-phase pattern (assess → stage →
commit → output) confirmed as the direct structural reference. `plugins/relay/commands/
relay-worktree.md:140-141`: `git -C <path>` pattern for scoping git operations to a
subdirectory without `cd` — the correct technique for worktree-scoped commands.

---

*Generated: 2026-05-18*
*Approved: 2026-05-18*
*Updated: 2026-06-18 — dual mode (worktree + current-branch) added (Phase 3)*
*Status: APPROVED*
