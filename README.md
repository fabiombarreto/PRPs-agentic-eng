# relay

Autonomous feature delivery for Claude Code: a single prompt takes a
feature from PRD to merged PR, orchestrated by writer/reviewer agent
pairs with a Test Runner that closes the loop.

This repository is also the marketplace that publishes the plugin.

---

## Status

Early development. Only the `context-builder` skill is currently
implemented. The command surface below is designed and documented but not
yet coded — it will land as Phase 2/3 of the rollout. See
`docs/context/architecture.md` for the full phased plan.

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
npm run validate     # 8 static checks over the plugin; exits non-zero + names file:line on any violation
node --test scripts/validate/checks/*.test.mjs scripts/eval.test.mjs plugins/relay/scripts/*.test.mjs   # node:test unit tests (checks + scripts); node --test silently drops any segment that stops matching (exit 0), so re-check the printed test count whenever a test file moves
npm run eval         # on-demand behavioral evals (promptfoo) of the reviewer agents; needs ANTHROPIC_API_KEY
npm run setup-hooks  # one-time: activate the pre-commit gate (runs npm run validate on every commit)
```

`npm run validate` is fast (well under a few seconds) and safe to run on
every commit. `npm run eval` calls the Anthropic API once per fixture, so
it costs tokens and is manual/on-demand, never part of the commit gate.

The eight checks: version-parity, native-validate (wraps
`claude plugin validate --strict`), registration-parity (commands/agents vs
the doc site), path-existence, dispatch-graph, frontmatter-schema (ajv),
artifact-naming, and bootstrap-parity. Full explanation — why the suite
exists, why it is built this way, cost, and how to maintain it — is in the
documentation site: `documentation/guide/validation-suite.html`.

## Day-to-day use

Two commands cover the full happy path:

```
/relay-prd     <feature description>   # interactive — produces an approved PRD
/relay-execute <prd-path>              # autonomous — drives PRD through to an open PR
```

When the PR is ready to merge, run the approval step:

```
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
| `/relay-pr <feature-name>` | Produce the execution report + open the PR |

Full contracts, inputs, outputs, and preconditions:
`docs/api-reference.md`.

## Key conventions

- **PRP artifacts live at `PRPs/`** (at the target-repo root), never at
  `.claude/`. Claude Code's hardcoded permission prompts on `.claude/`
  would break the autonomous loop. See `docs/anti-patterns.md`.
- **TDD is opt-in, declared explicitly.** Set `tdd: true` in
  `docs/context/methodology.md` to activate the TDD Writer/Reviewer pair.
  Heuristic activation (test folder exists → TDD on) is forbidden. See
  `docs/context/methodology.md`.
- **Test retry budget defaults to `max_test_retries: 3`.** Override per
  project when E2E runs are expensive (lower) or when the suite is fast
  and unit-only (higher). See `docs/decisions.md`.

## Going deeper

- `CLAUDE.md` — Tier 1 context loaded every session
- `docs/KNOWLEDGE_BASE.md` — index of all documentation
- `docs/context/architecture.md` — plugin layout, phased rollout, interactivity boundary
- `docs/context/prd-template.md` — canonical PRD shape
- `docs/decisions.md` — stable decisions; must not be re-evaluated
- `docs/anti-patterns.md` — forbidden patterns
- `docs/planning/` — living planning documents (Phase 2 spec, three-pillar overview)

## Relationship to `prp-core`

`plugins/prp-core/` is the upstream Wirasm plugin kept on disk as a
reference for Claude Code file formats. `relay` does not depend on
`prp-core` at runtime; only file-format conventions were inherited.

## Authoring

Author: Fabio Martins Barreto <fabiobarreto208@gmail.com>
License: TBD
