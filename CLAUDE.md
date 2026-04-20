# relay — Project Context (Tier 1)

`relay` is a Claude Code plugin for autonomous feature delivery: a single prompt
drives the full cycle from PRD to merged PR via orchestrated writer/reviewer
agent pairs and a Test Runner that closes the loop. This repository is also a
Claude Code marketplace (`.claude-plugin/marketplace.json`) that publishes the
plugin.

## Stack

- Markdown (skills, commands, agents, prompts)
- JSON (plugin / marketplace / hooks configuration)
- No runtime package manifest — the plugin is prompt + config, not code

## Essential commands

- Install locally: enable the marketplace at the repo root from Claude Code
- Invoke the context-builder skill: `*init` (inside a target project)
- There are no build, lint, or test commands — the plugin has no source code
  to compile

## Key patterns

1. Every skill/command/agent is a markdown file with YAML frontmatter
2. Hooks reference scripts via `${CLAUDE_PLUGIN_ROOT}` for portable paths
3. Upstream `plugins/prp-core/` is a reference directory, not active relay code

## Context & Domain

Before implementing anything, read:
- docs/context/architecture.md — stack and plugin layout
- docs/context/conventions.md — file format and naming standards
- docs/context/constraints.md — what NOT to do
- docs/decision-gate.md — mandatory gate before planning or coding

Domain areas:
- See docs/domain/areas/README.md — `relay` has no traditional business areas;
  pipeline stages serve that role (documented in architecture.md and flows.md)

Full index: docs/KNOWLEDGE_BASE.md
