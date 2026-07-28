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

## Figma MCP (Phase 3 shipped — `/relay-design-map`; Phase 4 shipped — `/relay-design-spec`)

- **Purpose:** provide Figma design data (metadata, node trees, assets) to
  the figma-implementation-track commands (`/relay-design-map`, shipped
  Phase 3; `/relay-design-spec`, shipped Phase 4) so implementation plans
  can be grounded in the actual design rather than a manually-transcribed
  description.
- **Auth type:** provided by the user's MCP configuration.
- **Used by:** the interactive commands only — `/relay-design-map`
  (confirmed, Phase 3: queries via `search_design_system`, node-scoped
  `get_metadata`, and opportunistic `get_code_connect_map`; budget
  `max_library_search_calls = 40`) and `/relay-design-spec` (Phase 4:
  node-scoped `get_metadata` first, then chunked `get_design_context`
  at 6–8 calls per chunk with persist-then-discard evidence capture,
  `get_variable_defs` for tokens, and per-frame `get_screenshot` at 1x;
  hard cap `max_figma_nodes = 20`). Never called from a Task-dispatched
  agent — `design-map-writer` and `design-map-reviewer` are MCP-free by
  design (no Figma MCP tool in either's allowlist), reading only the
  evidence `/relay-design-map` persists to
  `PRPs/reports/design-map/evidence/`. `design-spec-writer` diverges
  deliberately from that shape: it is inline-adopted by
  `/relay-design-spec`, never `Task`-dispatched, so it calls the Figma
  MCP directly in this session as its own protocol directs;
  `design-spec-reviewer` stays MCP-free like the Phase 3 pair (no Figma
  MCP tool in its `Read, Edit, Write` allowlist). Confirmed reachable
  from Task-dispatched subagents as well as the main session (empirical
  spike, `docs/decisions.md` 2026-07-22), but the baseline design keeps
  Figma MCP calls in the interactive commands only — see
  `docs/decisions.md` [2026-07-23] Design Spec pair extends the
  interactivity boundary. Phase 5's `research-design` grounding subagent
  (dispatched by `plan-writer` during GROUNDING, conditionally, when a
  Design Spec is available) is similarly Figma-MCP-free by construction —
  its `Read, Glob, Grep` tools allowlist carries no MCP tool at all; it
  reads exclusively from `docs/design/component-map.md` and the
  design-system clone already on disk to verify cited `CM-<n>` mappings,
  never touching a Figma fact directly.
- **Known endpoint/tool:** `get_metadata` confirmed callable (returned a
  Figma-backend access-denial error for a fake `fileKey`, not a
  tool-routing failure) — see `docs/decisions.md` 2026-07-22.
  `search_design_system` and `get_code_connect_map` are named by
  `/relay-design-map`'s Phase B (Figma Implementation Track Phase 3) but
  not independently spike-confirmed the way `get_metadata` was.
  `get_design_context`, `get_variable_defs`, and `get_screenshot` are
  named by `/relay-design-spec`'s Phase A (Figma Implementation Track
  Phase 4), also not independently spike-confirmed beyond `get_metadata`.

## Playwright / Chromium (Figma Implementation Track Phase 6 shipped — visual-verification loop; Figma Visual-First Track Phase 5 — additive interaction-step capture + `phase_scope: visual` blocking gate)

- **Purpose:** headless-browser screenshot capture and AA-tolerant pixel
  diffing so `/relay-implement`'s Phase A.3.4 can automatically verify an
  implementation attempt's visual fidelity against a Design Spec's
  reference PNGs, closing the fidelity loop without a human eyeballing
  every frame.
- **Auth type:** none — local Chromium instance provisioned on demand.
- **Used by:** the `visual-verifier` agent only, via the self-contained
  `plugins/relay/scripts/visual/` tooling package (`provision.mjs`
  Chromium provisioning with a named exit-code taxonomy, `capture.mjs`
  dev-server readiness probe + per-frame screenshot — plus, since Figma
  Visual-First Track Phase 5, an additive bounded interaction-step
  executor (`click`/`fill`/`wait`, sourced from the Design Spec's
  optional `Interaction` column) run immediately before the screenshot
  when a frame declares one, a genuine no-op otherwise — `compare.mjs`
  AA-tolerant `pixelmatch` diff writing `fidelity-report.json`). Kept in
  its own `package.json` (`playwright`, `pixelmatch`, `pngjs`) separate
  from the repo root, so a non-Figma project never pays the
  Playwright/Chromium install cost. Provisioning failure or a dev-server
  readiness timeout degrades gracefully to a `DEGRADED_PROVISION_FAILED`
  / `DEGRADED_STATIC_ONLY` rung rather than halting `/relay-implement`
  — unchanged on a `phase_scope: logic` plan (or no `phase_scope` row);
  on a `phase_scope: visual` plan under `auto` approval, that same
  degraded rung instead blocks (`VISUAL_GATE_BLOCKED`) — see
  `docs/decisions.md` [2026-07-23] Visual-verification loop and
  [2026-07-27] Implement-time visual gate.
- **Known endpoint/tool:** `npx playwright install --with-deps chromium`
  (provisioning); `chromium.launch({ headless: true })` (capture).

## Docker / Docker Compose (planned — Phase 2)

- **Purpose:** isolated test environment for the Test Runner auto-correction
  loop. Each target project supplies its own `compose.test.yml`.
- **Auth type:** none — local daemon.
- **Used by:** A1–A4 infra components, Test Runner (B1). Graceful degradation
  when absent: Test Runner runs locally and flags the risk in the report.

## GitHub CLI (`gh`)

- **Purpose:** open pull requests from the Report + PR Creator agent; merge
  PRs during `/relay-approve <pr>`.
- **Auth type:** the user's local `gh` credential — the plugin never stores
  tokens.
- **Used by:** PR Creator agent, `/relay-approve <pr>` command.

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
