# relay

Autonomous feature delivery for Claude Code. A single prompt takes a feature from PRD to merged PR, orchestrated by writer/reviewer agent pairs with a Test Runner that closes the loop.

## Status

Early development. The first skill (`context-builder`) is in place. Commands, agents, and hooks will be added as each phase of the plan is implemented.

## Structure

- `skills/` — agent skills. Currently: `context-builder` (project documentation initializer).
- `commands/` — `/relay-*` slash commands. *(to be added)*
- `agents/` — specialized agents. *(to be added)*
- `hooks/` — pipeline hooks. *(to be added)*

## Installation

Enabled via the marketplace definition at the repo root (`.claude-plugin/marketplace.json`).
