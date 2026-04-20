# Architecture (developer view)

For the canonical architectural description, read
`docs/context/architecture.md`. This file only adds developer-workflow notes
that belong alongside day-to-day work.

## How Claude Code loads `relay`

1. Claude Code reads `.claude-plugin/marketplace.json` at the repo root.
2. The marketplace points at `./plugins/relay`.
3. Claude Code reads `plugins/relay/.claude-plugin/plugin.json` for the
   plugin manifest (name, version).
4. Claude Code discovers each asset type by convention from subfolders:
   `skills/`, `commands/`, `agents/`, `hooks/`.
5. Hooks declared in `plugins/relay/hooks/hooks.json` are wired to Claude
   Code lifecycle events and can reference shell scripts in the same
   folder via `${CLAUDE_PLUGIN_ROOT}`.

## Iterating on the plugin

Since assets are markdown + JSON, iteration is: edit a file → reload the
Claude Code session (or use the plugin-reload path that Claude Code
exposes) → observe the change.

There is no build step, no lint, no test suite to run before committing.
Review happens by reading the prompt and validating it behaves as intended
when invoked.

## Where to put new work

| Adding… | Path |
|---------|------|
| A new reusable capability | `plugins/relay/skills/<name>/SKILL.md` |
| A new `/relay-*` slash command | `plugins/relay/commands/<name>.md` |
| A new specialized agent | `plugins/relay/agents/<name>.md` |
| A new lifecycle hook | entry in `plugins/relay/hooks/hooks.json` + script |

Always update `CLAUDE.md` and `docs/KNOWLEDGE_BASE.md` when a new asset
starts to be user-facing.
