# Integrations

External systems and tools the `relay` plugin depends on, now or in planned
phases.

## Claude Code (runtime host)

- **Purpose:** executes the plugin. Loads the marketplace, resolves the
  plugin, runs skills/commands/agents, fires hooks.
- **Auth type:** not applicable — the plugin runs inside the user's Claude
  Code session.
- **Surface used:** skills, slash commands, sub-agents, hooks, MCP tool
  mechanisms.

## MCP Context7 (planned, optional)

- **Purpose:** fetch current library documentation so the context-builder can
  populate `docs/libs/` in target projects.
- **Auth type:** provided by the user's MCP configuration.
- **Used by:** `context-builder` skill, Phase 0 — validates availability and
  sets a `SKIP_LIBS` flag when absent (graceful degradation).
- **Known endpoint/tool:** `resolve-library-id` / `get-library-docs` via the
  Context7 MCP server [INFERRED - VALIDATE].

## Docker / Docker Compose (planned — Phase 2)

- **Purpose:** isolated test environment for the Test Runner auto-correction
  loop. Each target project supplies its own `compose.test.yml`.
- **Auth type:** none — local daemon.
- **Used by:** A1–A4 infra components, Test Runner (B1). Graceful degradation
  when absent: Test Runner runs locally and flags the risk in the report.

## GitHub CLI (`gh`) (planned — Phase 3/4)

- **Purpose:** open pull requests from the Report + PR Creator agent; merge
  PRs during `/approve-implementation`.
- **Auth type:** the user's local `gh` credential — the plugin never stores
  tokens.
- **Used by:** PR Creator agent, `/approve-implementation` command.

## Git worktrees (planned — Phase 3)

- **Purpose:** each autonomous run gets its own branch + worktree, keeping
  the user's working copy untouched until the PR merges.
- **Auth type:** not applicable — local git operation.
- **Used by:** orchestrator (Phase 3), Docs Updater cleanup (Phase 4).

## `plugins/prp-core/` (reference, not an integration)

Not an external system. Included here only to note that `relay` does not
depend on `prp-core` at runtime; it is a documentation reference. See
`docs/context/architecture.md`.

---

**Secrets policy:** no credential values are stored in this repo or in any
generated report. See `docs/anti-patterns.md` entry on secret leakage.
