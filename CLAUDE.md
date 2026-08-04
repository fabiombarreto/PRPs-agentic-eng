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
- Validate the plugin: `npm install` then `npm run validate`
  (12 static consistency checks; docs at documentation/guide/validation-suite.html).
  There is no build step — the plugin ships no runtime source to compile.

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

## Documentation site

The `documentation/` folder is a rendered HTML+CSS+JS site that mirrors and
explains the canonical Markdown in `docs/`. It is the team-facing and
external-facing surface.

When asked to modify anything inside `documentation/` (add pages, edit
pages, adjust structure, introduce new sections): **read `documentation/AGENTS.md` first**.
It is the binding contract — site invariants, page template, CSS vocabulary,
the three-file registration rule (NAV + search index + changelog),
per-workflow checklists, and halt conditions. Every change to `documentation/`
must include an entry in `documentation/changelog.html`.
