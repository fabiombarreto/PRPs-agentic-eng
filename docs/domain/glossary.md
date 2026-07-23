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

## Component map

Per-project, cross-feature table (`docs/design/component-map.md`) mapping
Figma library components to real code components in the target project's
design system. Built or additively refreshed by `/relay-design-map` via
the `design-map-writer`/`design-map-reviewer` pair; a durable
knowledge-base artifact, not a per-run pipeline artifact (see
`docs/decisions.md` 2026-07-23). Part of the Figma Implementation Track
(Phase 3).

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

## Design Source

`design_source: figma | none` — a mandatory, non-heuristic Metadata field
on every plan/PRD phase when the target project declares
`figma_track: true`; NEVER inferred by a reviewer (diverges deliberately
from the `phase_type` precedent — see `docs/decisions.md` 2026-07-23).
When `figma`, a conditional `## Design Source` section (table of in-scope
frames: node-id, name-path, route, viewport, diff threshold, ref PNG
path) accompanies the field in both `docs/context/plan-template.md` and
`docs/context/prd-template.md`. Absence under `figma_track: true` is a
structural `CHANGES_REQUESTED` (`plan-reviewer`'s
`R-COH-DESIGN-SOURCE-MISSING`, `prd-reviewer`'s
`R-COH-DESIGN-SOURCE-INCOMPLETE`), never self-healed. Part of the Figma
Implementation Track (Phase 5).

## Design Spec

Per-feature, human-approved contract (`PRPs/designs/<feature>/design-spec.md`)
turning one feature's Figma design into a business-grounded,
evidence-backed intermediate artifact — reference screenshots, an
embedded token map, REUSE/NEW/ASSUMPTION component-mapping rows (citing
the Component map's `CM-<n>` ids), an implementation delta, and
per-frame visual acceptance criteria. Written by `design-spec-writer`,
inline-adopted (never `Task`-dispatched) alongside `design-spec-reviewer`
by `/relay-design-spec`; flips to `APPROVED` only after the user's own
explicit affirmative reply — the single point of human contact with the
raw Figma interpretation. Part of the Figma Implementation Track
(Phase 4).

## Environment probe

Step executed at the start of an autonomous run that detects which
capabilities are available in the target project (Docker, test frameworks,
`gh` CLI, etc.) so the pipeline can skip components with absent
prerequisites.

## Fidelity report

`fidelity-report.json` — per-attempt artifact written by the
`visual-verifier` agent (`PRPs/reports/<feature>/phase-<N>/visual/<attempt>/`)
recording one entry per in-scope frame (`node_id`, `route`,
`diff_percent`, `threshold`, `status`). Written by `compare.mjs` on the
FULL rung; written directly by the agent as a degraded-mode stub on
either degradation rung, so degradation stays visible in the artifact
itself, never only in the command's own `visual_outcome`. Part of the
Figma Implementation Track (Phase 6).

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

## Visual-verification loop

Bounded, non-blocking sub-phase (`/relay-implement`'s `Phase A.3.4`)
that dispatches the `visual-verifier` agent immediately after the Code
Reviewer returns `APPROVED`, when `figma_track: true` and the plan's
`design_source: figma`. Orchestrates `provision.mjs` → `capture.mjs` →
`compare.mjs` against the plan's Design Source and the referenced
Design Spec's Visual Acceptance Criteria, classifying every frame as
`VISUAL_VERIFIED`, `VISUAL_DEGRADED` (a named degradation rung, always
non-blocking), or `VISUAL_MISMATCH` (triggers one bounded fix round,
then a deterministic revert on non-convergence). Part of the Figma
Implementation Track (Phase 6).

## Worktree

Native git mechanism that allows multiple checkouts of different branches
of the same repository in isolated directories. Phase 3 of the plan uses a
worktree per autonomous run so the user's working copy stays untouched.

## Writer / Reviewer pair

Design pattern used throughout the relay pipeline: every generative stage
(PRD, Plan, TDD suite, Code, Docs) has a writer agent and an independent
reviewer agent. The reviewer can request changes; the writer reapplies.
