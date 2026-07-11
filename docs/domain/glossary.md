# Glossary

Recurring terms used across the `relay` plugin, its planning documents, and
the documentation. Sourced from `docs/planning/planejamento_fase_2.docx` §13
and the upstream prp-core vocabulary.

## Agent

Within Claude Code, a specialized persona with a dedicated system prompt and
its own tool allowlist. Distinct from the orchestrator, which coordinates
agents.

## Auto-correction loop

Automatic cycle in which the Test Runner identifies failures, asks the
Implementer to fix them, re-runs the tests, and repeats until green or a
configurable retry limit is reached.

## Context-builder

Phase 1 component that documents the target project into structured files
(`docs/context/`, `docs/domain/`, `docs/libs/`) so downstream AI agents can
operate precisely in the repository. In `relay`, it ships as the skill at
`plugins/relay/skills/context-builder/`.

## Decision Gate

Mandatory cognitive control mechanism applied before planning, coding, or
reviewing. Forces consultation of `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md`. See
`docs/decision-gate.md`.

## Environment probe

Step executed at the start of an autonomous run that detects which
capabilities are available in the target project (Docker, test frameworks,
`gh` CLI, etc.) so the pipeline can skip components with absent
prerequisites.

## Flakiness

Property of a test that passes and fails non-deterministically without code
changes. Common source of noise in CI pipelines; the Test Runner's failure
classifier (B3) handles it via bounded retry without code changes.

## Graceful degradation

Property of a system that continues functioning (with reduced capabilities)
when an optional component or resource is unavailable. Required of every
relay component — see `docs/context/constraints.md`.

## Implementer (Implementador)

Agent that turns an approved plan into code changes in the worktree. Does not
run tests itself — hands off to the Test Runner.

## Marketplace

Claude Code's distribution container for plugins. In this repo, declared at
`.claude-plugin/marketplace.json` and publishes the single plugin `relay`.

## Orchestrator (Orquestrador)

Phase 3 component that coordinates all agents in sequence, turning N
discrete commands into a single end-to-end command.

## Plugin

A Claude Code installable package that bundles skills, commands, agents, and
hooks under a `.claude-plugin/plugin.json` manifest. `relay` is one such
plugin; `prp-core` is the upstream reference plugin kept on disk.

## Post-green review (Revisão pós-verde)

Validation step executed after the auto-correction loop turns all tests
green, to verify that tests were not weakened and still measure the intended
behavior. Implemented by component B5 of the Phase 2 plan.

## PRD (Product Requirement Document)

Structured specification of a feature, produced by the PRD Writer agent and
reviewed by the PRD Reviewer. Serves as input to the Plan Writer.

## PRP (Product Requirement Prompt)

Concept inherited from `prp-core`: PRD + repository intelligence + an
executable runbook the AI can follow.

## Skill

Reusable capability that Claude Code loads on demand. Each skill lives at
`plugins/<plugin>/skills/<name>/SKILL.md` and is described by YAML
frontmatter. `context-builder` is the only relay skill today.

## TDD (Test-Driven Development)

Development methodology in which tests are written before production code,
in a red-green-refactor cycle. In `relay`, TDD is an opt-in mode: active
only when the target project explicitly declares it in its context-builder
output.

## Test writer/reviewer pair (formerly the TDD track / Trilho de TDD)

Pair of agents — `test-writer` and `test-reviewer` (formerly `tdd-writer` /
`tdd-reviewer`) — that authors and maintains a project's test suite whenever a
test framework is declared. The `tdd:` value selects ordering: test-first
(before the Implementer, `tdd: true`) or test-after (after the Implementer +
Code Review, `tdd: false`). Owns the full test lifecycle (create / update /
delete) via a manifest lifecycle ledger; the Implementer never touches test
files (R-X strict).

## Test Runner

Specialized agent that executes the test suite, interprets results,
coordinates the auto-correction loop, and produces the execution report.
Component B1 of the Phase 2 plan.

## Worktree

Native git mechanism that allows multiple checkouts of different branches
of the same repository in isolated directories. Phase 3 of the plan uses a
worktree per autonomous run so the user's working copy stays untouched.

## Writer / Reviewer pair

Design pattern used throughout the relay pipeline: every generative stage
(PRD, Plan, TDD suite, Code, Docs) has a writer agent and an independent
reviewer agent. The reviewer can request changes; the writer reapplies.
