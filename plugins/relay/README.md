# relay

Autonomous feature delivery for Claude Code. A single prompt takes a feature from PRD to merged PR, orchestrated by writer/reviewer agent pairs with a Test Runner that closes the loop.

## Status

Shipped. The full pipeline is in place — PRD authoring, planning, test authoring, implementation, test running, visual verification, and PR close-out — driven end to end by `/relay-execute`, or step by step via the individual `/relay-*` commands.

## Structure

- `skills/` — agent skills. Currently: `context-builder` (project documentation initializer).
- `commands/` — `/relay-*` slash commands. Entry points: `/relay-prd`, `/relay-plan`, `/relay-implement`, `/relay-test`, `/relay-approve`, and the `/relay-execute` orchestrator.
- `agents/` — specialized agents, organized as writer/reviewer pairs (PRD, plan, implementation, test, docs, design) plus the Test Runner and the research agents.
- `resources/` — templates and schemas the commands and agents reference (PRD, plan, design spec, component map, redaction policy, test-output schema).
- `scripts/` — Node helpers (test-output normalizer, final-report generator, visual capture tooling).
- `hooks/` — pipeline hooks. *(to be added)*

## Installation

Enabled via the marketplace definition at the repo root (`.claude-plugin/marketplace.json`).
