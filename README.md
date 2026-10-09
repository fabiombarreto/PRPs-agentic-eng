# relay

Autonomous feature delivery for Claude Code: a single prompt takes a
feature from PRD to merged PR, orchestrated by writer/reviewer agent
pairs with a Test Runner that closes the loop.

This repository is also the marketplace that publishes the plugin.

---

## Status

Shipped. The pipeline is implemented: PRD authoring, planning, test
authoring, implementation, test running, and PR close-out, plus a
validation suite and on-demand behavioral evals for the plugin itself.
`plugins/relay` (version 0.45.0, per its `plugin.json`) contains 23
`/relay-*` commands, 23 agents and one skill (`context-builder`). It also
includes a local manual-QA runner and opt-in Figma design and
visual-verification commands.

`/relay-execute` drives an approved PRD through planning, test authoring,
implementation and test running, and stops with the changes uncommitted in
a worktree. Committing, opening the PR and merging are the separate
`/relay-commit`, `/relay-pr` and `/relay-approve` commands. Pipeline hooks
are not implemented (there is no `plugins/relay/hooks/` directory). See
`plugins/relay/README.md` and `docs/api-reference.md`.

## Install

Enable this marketplace in Claude Code by pointing it at
`.claude-plugin/marketplace.json` at the repo root. Once enabled, the
`relay` plugin becomes available in that Claude Code session.

## Local development

After cloning, run `npm install` then `npm run setup-hooks` once. This
points git's `core.hooksPath` at the tracked `.githooks/` directory so
`git commit` runs `npm run validate` (see `.githooks/pre-commit`) and
blocks the commit on any violation. `core.hooksPath` is local git config —
it is not auto-applied on clone — so the one-time step is required.

## Testing / validation

The plugin self-tests with a Node/ESM validation suite (the repo is
markdown + JSON, so the "tests" are consistency and cross-reference checks,
not runtime unit tests of application code). After `npm install`:

```
npm run validate     # 28 static checks over the plugin; exits non-zero + names file:line on any violation
node --test scripts/validate/checks/*.test.mjs scripts/eval.test.mjs plugins/relay/scripts/*.test.mjs   # node:test unit tests (checks + scripts); node --test silently drops any segment that stops matching (exit 0), so re-check the printed test count whenever a test file moves
npm run eval         # on-demand behavioral evals (promptfoo) of the test-reviewer agent; needs ANTHROPIC_API_KEY
npm run setup-hooks  # one-time: activate the pre-commit gate (runs npm run validate on every commit)
```

`npm run validate` is fast (about three seconds on the machine it was
timed on) and safe to run on every commit. `npm run eval` calls the Anthropic API once per fixture, so
it costs tokens and is manual/on-demand, never part of the commit gate.

The checks include version-parity, native-validate (wraps
`claude plugin validate --strict`), registration-parity (commands/agents vs
the doc site), path-existence, dispatch-graph, frontmatter-schema (ajv),
artifact-naming, and bootstrap-parity. The registry is
`scripts/validate/index.mjs`; per-check detail is in
`documentation/reference/validation-checks.html`. Full explanation — why
the suite exists, why it is built this way, cost, and how to maintain it —
is in the documentation site: `documentation/guide/validation-suite.html`.

## Day-to-day use

Two commands build the feature:

```
/relay-prd     <feature description>   # interactive — produces an approved PRD
/relay-execute <prd-path>              # autonomous — drives the PRD through implementation; leaves changes uncommitted in .worktrees/<feature>/
```

After you review the changes and run any manual tests, three commands close
it out:

```
/relay-commit  <feature-name>          # commit locally (no push)
/relay-pr      <feature-name>          # push the branch + open the PR
/relay-approve <pr>                    # merge + update project docs
```

**Interactivity boundary:** `/relay-prd` dialogs with you through a
six-phase Q&A until the PRD is approved. After that, `/relay-execute`
runs autonomously and only interrupts you when an agent hits a decision
outside its competence.

## Granular commands

Every pipeline stage is invocable on its own — useful for testing
components, for intervening manually between stages, or for running a
hand-edited artifact through only the review step.

| Stage | Writer | Reviewer |
|-------|--------|----------|
| Plan | `/relay-plan` | `/relay-plan-review` |
| Test suite | `/relay-write-test` | `/relay-test-write-review` |
| Implementation | `/relay-implement` | `/relay-code-review` |
| Tests | `/relay-test` (runs suite + auto-correct loop) | `/relay-test-review` (B5 post-green) |

Infrastructure and finalization:

| Command | Role |
|---------|------|
| `/relay-worktree <feature-name>` | Create the isolated branch + worktree |
| `/relay-commit <feature-name>` | Commit the worktree locally (no push) |
| `/relay-pr <feature-name>` | Produce the execution report + open the PR |

Standalone commands outside the pipeline, none of which `/relay-execute`
invokes: `/relay-qa-report`, `/relay-qa-run` and `/relay-qa-seed` (manual
QA support), `/relay-auth-setup` and `/relay-auth-scripts` (describe how a
project authenticates and generate local login scripts for QA), and the
Figma-track commands `/relay-design-map`, `/relay-design-spec`,
`/relay-visual-review` and `/relay-visual-approve` (gated behind
`figma_track: true`).

Full contracts, inputs, outputs, and preconditions:
`docs/api-reference.md`.

## Key conventions

- **PRP artifacts live at `PRPs/`** (at the target-repo root), never at
  `.claude/`. Claude Code's hardcoded permission prompts on `.claude/`
  would break the autonomous loop. See `docs/anti-patterns.md`.
- **Test ordering is declared explicitly, never inferred.** The test
  Writer/Reviewer pair runs whenever `docs/context/methodology.md` declares a
  non-empty `test_frameworks`. `tdd: true` makes it author tests before the
  Implementer (test-first); `tdd: false` makes it author them after
  (test-after). Heuristic activation (test folder exists → TDD on) is
  forbidden. See `docs/context/methodology.md`.
- **Test retry budget defaults to `max_test_retries: 3`.** Override per
  project when E2E runs are expensive (lower) or when the suite is fast
  and unit-only (higher). See `docs/decisions.md`.

## Going deeper

- `CLAUDE.md` — Tier 1 context loaded every session
- `docs/KNOWLEDGE_BASE.md` — index of all documentation
- `docs/context/architecture.md` — plugin layout, phased rollout, interactivity boundary
- `plugins/relay/resources/prd-template.md` — canonical PRD shape
- `docs/decisions.md` — stable decisions; must not be re-evaluated
- `docs/anti-patterns.md` — forbidden patterns
- `docs/planning/` — living planning documents (Phase 2 spec, three-pillar overview)

## Relationship to `prp-core`

This repository is a fork of
[Wirasm/PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng).
`plugins/prp-core/` is the upstream Wirasm plugin kept on disk as a
reference for Claude Code file formats; `plugins/relay/` is the plugin
developed in this fork. `relay` does not depend on `prp-core` at runtime;
only file-format conventions were inherited.

## Authoring

Author: Fabio Martins Barreto <fabiobarreto208@gmail.com>
License: TBD
