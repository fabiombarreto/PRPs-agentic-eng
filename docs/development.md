# Development

How to extend `relay` locally.

## Prerequisites

- Claude Code installed and able to load local plugin marketplaces
- Git
- Optional: MCP Context7 configured, for testing the context-builder's
  `docs/libs/` generation path

The plugin ships no runtime dependency, but the repo now carries a Node/ESM
validation suite that self-tests the plugin's consistency — so Node 18+ and a
one-time `npm install` are needed to run it (see Testing / validation below).

## Install the plugin locally

Point Claude Code at this repo's marketplace (`.claude-plugin/marketplace.json`).
The plugin `relay` then becomes available in that Claude Code session.

## Add a new skill

1. Create `plugins/relay/skills/<skill-name>/SKILL.md`.
2. Write YAML frontmatter (`name`, `description` — see
   `docs/context/conventions.md`).
3. Write the skill body as a prompt the model will follow when the skill is
   invoked.
4. Reload the plugin in Claude Code and invoke the skill.
5. Update `CLAUDE.md` (if user-facing) and `docs/KNOWLEDGE_BASE.md`.

## Add a new command

1. Create `plugins/relay/commands/<command-name>.md`.
2. Frontmatter: `description`, `argument-hint` (optional).
3. Body = the prompt. Use `$ARGUMENTS` to receive the user's argument
   string.
4. Reload and try `/command-name` in a Claude Code session.

## Add a new agent

1. Create `plugins/relay/agents/<agent-name>.md`.
2. Frontmatter: `name`, `description` (used for routing), optional `model`
   and `color`.
3. Body = the agent's system prompt.
4. Other agents can now delegate to it via the Agent tool.

## Add a new hook

1. If `plugins/relay/hooks/hooks.json` does not exist yet, create it with
   the top-level `hooks` key (see upstream `plugins/prp-core/hooks/hooks.json`
   for the shape).
2. Add an entry under the appropriate event (`Stop`, `PostToolUse`, …).
3. Put the script under `plugins/relay/hooks/` and reference it as
   `${CLAUDE_PLUGIN_ROOT}/hooks/<script>`.
4. Make the script executable when relevant.

## Validate documentation changes

When editing files under `docs/`:

- Tier 1 (`CLAUDE.md`) and Tier 2 (`docs/KNOWLEDGE_BASE.md`) should stay
  under their size limits (see `plugins/relay/skills/context-builder/SKILL.md`).
- Re-run the context-builder in `*update` or `*validate` mode after large
  changes, to catch limit or anti-pattern violations.

## Testing / validation

The repo self-tests with a Node/ESM validation suite. After `npm install`:

- `npm run validate` — 8 static consistency checks over the plugin (frontmatter
  schemas, command/agent registration vs the doc site, path integrity,
  version-parity, dispatch graph, artifact naming, `.sh`/`.ps1` parity, and the
  native `claude plugin validate --strict` wrapper). Exits non-zero with a named
  check + `file:line` on any violation; fast enough to run on every commit.
- `node --test scripts/validate/checks/*.test.mjs scripts/eval.test.mjs` — the
  unit tests for the checks (`node:test`).
- `npm run eval` — on-demand promptfoo evals of the reviewer agents against
  golden fixtures. Needs `ANTHROPIC_API_KEY`; costs tokens, so it is manual.
- `npm run setup-hooks` — one-time; wires the pre-commit hook that runs
  `npm run validate` and blocks a commit on any violation.

Adding a check: create `scripts/validate/checks/<name>.mjs` returning
`{ name, ok, findings }`, register it in `scripts/validate/index.mjs`, scope its
reads to `plugins/relay/` (never `prp-core/`), and let the test pair author the
`node:test` unit test-after — the Implementer authors no test files (R-X strict).
Full rationale, cost, and maintenance guidance:
`documentation/guide/validation-suite.html`.

## Commit hygiene

- Do not commit secrets or `.env` files (covered by `.gitignore`).
- Planning documents under `docs/planning/` are binary/HTML — commit them
  whole rather than diffing.
- Do not edit `plugins/prp-core/` as part of relay work. It is an upstream
  reference.
