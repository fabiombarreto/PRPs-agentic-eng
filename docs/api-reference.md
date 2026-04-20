# API Reference

Surface exposed by the `relay` plugin. "API" here means the set of skills,
commands, agents, and hooks the plugin publishes into Claude Code.

## Skills (implemented)

| Name | Path | Purpose |
|------|------|---------|
| `context-builder` | `plugins/relay/skills/context-builder/SKILL.md` | Initialize or update a target project's documentation tree (CLAUDE.md, KNOWLEDGE_BASE.md, docs/context, docs/domain, docs/libs) for token-efficient agent operation. |

Modes for `context-builder`: `*init`, `*update`, `*validate`, `*domain`,
`*libs`, `*gate` — see its `SKILL.md` for details.

## Commands (planned — not yet implemented)

12 commands organized by role, plus 1 placeholder for Pillar 3. None are
implemented yet. See `docs/decisions.md` for the decision record and
rationale; the layout is stable enough to code against.

### Happy path

For day-to-day use, two commands cover the full pipeline:

1. `/relay-prd <description>` — interactive; produces an approved PRD.
2. `/relay-execute <prd-path>` — autonomous; drives the PRD through to an
   opened PR.

Once the PR merges, `/relay-approve <pr>` (Pillar 3) runs the docs-update
cycle.

### Full command surface

#### Writers (produce an artifact)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-prd <description \| draft-path>` | description or draft PRD markdown | `PRPs/prds/<feature>.prd.md` with status `APPROVED`. Interactive — runs the 6-phase Q&A loop with the user |
| `/relay-plan <prd-path>` | approved PRD | `PRPs/plans/<feature>.plan.md` with status `DRAFT` |
| `/relay-tdd <plan-path>` | approved plan | test suite committed to worktree (status `DRAFT`). Silently self-skips when `docs/context/methodology.md` has `tdd: false` |
| `/relay-implement <plan-path>` | approved plan (+ TDD suite if present) | implementation committed to worktree |

#### Reviewers (validate an existing artifact; accept hand-edited input)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-plan-review <plan-path>` | plan `DRAFT` (generated or hand-edited) | status flipped to `APPROVED`, or `CHANGES_REQUESTED` with actionable list |
| `/relay-tdd-review <suite-path>` | TDD suite `DRAFT` | `APPROVED` or `CHANGES_REQUESTED`; silently self-skips when `tdd: false` |
| `/relay-code-review <worktree>` | worktree diff | `APPROVED` or `CHANGES_REQUESTED` |
| `/relay-test-review <worktree>` | worktree with green test state (B5 post-green review) | `APPROVED` or `CHANGES_REQUESTED` (weakened tests, coverage drop, mocks hiding behavior) |

#### Infrastructure / execution

| Command | Input | Output |
|---------|-------|--------|
| `/relay-worktree <feature-name>` | feature name | worktree at `.worktrees/<feature>/` + branch `feature/<name>` |
| `/relay-test <worktree>` | worktree with code | green state or `FAILED_AFTER_N_RETRIES`. Encapsulates B1–B4: suite execution, failure classification, auto-correction loop (see `docs/decisions.md` on `max_test_retries`) |
| `/relay-pr <feature-name>` | worktree with green tests + all reviews `APPROVED` | PR opened + `PRPs/reports/<feature>/final-report.md` |

#### Orchestrator

| Command | Input | Output |
|---------|-------|--------|
| `/relay-execute <prd-path>` | approved PRD | opened PR. Composes `/relay-plan → /relay-plan-review → /relay-worktree → /relay-tdd → /relay-tdd-review → /relay-implement → /relay-code-review → /relay-test → /relay-test-review → /relay-pr`. On any `CHANGES_REQUESTED`, loops back to the corresponding writer with feedback until the stage's retry budget is exhausted |

#### Pillar 3 (approval cycle — exact naming TBD)

| Command | Input | Output |
|---------|-------|--------|
| `/relay-approve <pr>` *(placeholder)* | PR number or URL | merge PR, delete branch + worktree, run Docs Updater and Docs Reviewer |

### Preconditions

Each command validates its input on entry and fails loud with an
actionable message if a precondition is unmet:

- Review commands require the target artifact to exist with the expected
  status in its frontmatter.
- `/relay-implement` requires plan `APPROVED` and a checked-out worktree.
- `/relay-test` requires worktree commits to exist.
- `/relay-pr` requires the last `/relay-test-review` to have returned
  `APPROVED`.

Running out of order always fails with a clear message rather than with
undefined behavior.

### Artifact paths

All command outputs land under `PRPs/` at the target-repo root (NEVER under
`.claude/` — see `docs/anti-patterns.md`):

- `PRPs/prds/<feature>.prd.md`
- `PRPs/plans/<feature>.plan.md`
- `PRPs/reports/<feature>/` (execution reports, attempts log, per-attempt diffs, final report; TDD initial suite diff and reviews when applicable)

Worktrees live at `.worktrees/<feature>/` relative to the target repo root.

## Agents (planned)

Relay's agents correspond one-to-one with the commands above (each writer
and reviewer pair is an agent pair). Exact agent names, models, and prompts
are designed during Phase 2/3 implementation.

## Hooks (planned)

No hooks are declared yet (no `plugins/relay/hooks/hooks.json`). Planned
wiring described in `docs/planning/planejamento_fase_2.docx` §7.3 (C2).
