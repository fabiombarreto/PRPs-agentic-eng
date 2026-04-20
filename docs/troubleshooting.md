# Troubleshooting

Known friction points when working with `relay`.

## "MCP Context7 not available" warning from the context-builder

**Symptom:** the context-builder skill prints a warning at Phase 0 and skips
generating `docs/libs/`.

**Cause:** the Context7 MCP server is not configured in the Claude Code
session.

**Fix:** either install/enable Context7 MCP and re-run `*libs`, or accept
the skip — the context-builder continues normally without it.

## The context-builder generated no `docs/domain/areas/*.md` files

**Symptom:** `docs/domain/areas/` contains only `README.md`, no per-area
files.

**Cause:** this is expected for the `relay` repo itself. `relay` is a
pipeline-of-agents project, not a business-domain project, so traditional
area files are intentionally absent. See `docs/domain/areas/README.md`.

**Fix:** none — this is by design. For target projects run through
`context-builder`, area files will be generated normally.

## Confusion between `plugins/relay/` and `plugins/prp-core/`

**Symptom:** you find yourself reading `prp-core` files and wondering why
they are not reflected in relay's behavior.

**Cause:** `prp-core` is the upstream Wirasm plugin, kept in the repo as a
read-only reference for Claude Code file format and agent design. It is
not part of `relay`'s runtime surface.

**Fix:** edit only files under `plugins/relay/`. Treat `prp-core` as
external documentation.

## A hook script fails to run with a "file not found" error

**Symptom:** Claude Code reports it cannot find the hook script.

**Cause:** the script path is hardcoded instead of using
`${CLAUDE_PLUGIN_ROOT}`.

**Fix:** rewrite the path in `plugins/relay/hooks/hooks.json` to
`${CLAUDE_PLUGIN_ROOT}/hooks/<script>` so the plugin works regardless of
install location. See `docs/context/conventions.md`.

## Installing the plugin does nothing

**Symptom:** after enabling the marketplace, `relay`'s skills/commands do
not show up.

**Cause:** most likely the plugin manifest is malformed or the marketplace
does not point at the correct `source`.

**Fix:** verify `.claude-plugin/marketplace.json` has `source: "./plugins/relay"`
and that `plugins/relay/.claude-plugin/plugin.json` is valid JSON with at
least `name`, `version`, and `description`.
