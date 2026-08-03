---
description: 'Give every Figma-enabled project a versioned, human-curatable map from Figma library components to real code components. Queries the target project''s Figma library in the main session (search_design_system + node-scoped get_metadata, budget max_library_search_calls=40; get_code_connect_map read opportunistically), persists evidence bundles to PRPs/reports/design-map/evidence/, dispatches the design-map-writer/design-map-reviewer pair in a bounded max_map_review_retries=2 loop to produce an APPROVED docs/design/component-map.md, runs a preflight report (visual-tooling dependency check, dev-server config check), then asks for the user''s own explicit, quoted confirmation before performing the ONLY sanctioned Edit that flips figma_track: true in the target project''s docs/context/methodology.md. Never invoked by /relay-execute — a per-project, one-time (or --refresh) human-triggered setup command.'
argument-hint: [--refresh]
---

# /relay-design-map

**Arguments:** `$ARGUMENTS`

---

## Your mission

Build (first run) or additively re-scan (`--refresh`) a target
project's `docs/design/component-map.md` — a versioned,
human-curatable table mapping Figma library components to real code
components in the project's design system — then, only after the map
reaches `*Status: APPROVED*` and a preflight report passes, ask the
user for an explicit, quoted confirmation before flipping
`figma_track: true` in `docs/context/methodology.md`.

You own all Figma MCP querying yourself, in this main session — per
the Phase 2 MCP-access-point decision (`docs/decisions.md`
2026-07-22), Figma MCP calls stay in the interactive command only,
never in the dispatched `design-map-writer`/`design-map-reviewer`
agents. You persist every piece of Figma evidence you gather to disk
before dispatching either agent — they are pure file-interpreters over
what you wrote.

You are autonomous within a run, but the run itself is always
human-triggered: this command is never invoked by `/relay-execute`.
The `figma_track` flip at the end is the one deliberate exception to
the "downstream of PRD-approval is autonomous" boundary — it is a
per-project, one-time (or explicitly re-run) human-gated action, never
inferred, never automatic.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/figma-implementation-track.prd.md` — source PRD, Implementation Phases row 3.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-worktree.md` — HALT-code + preflight structure this command mirrors.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` Phase A.3.5 — the bounded writer/reviewer retry-loop shape this command's Phase C mirrors.
- `${CLAUDE_PLUGIN_ROOT}/agents/design-map-writer.md` and `${CLAUDE_PLUGIN_ROOT}/agents/design-map-reviewer.md` — the dispatched agent pair.
- `${CLAUDE_PLUGIN_ROOT}/docs/context/component-map-template.md` — the canonical map shape both agents reference.
- `docs/anti-patterns.md` (target project) — "Flipping `figma_track` (or any future opt-in gating key) by heuristic" entry; this command's Phase E is the one sanctioned non-heuristic flip path.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay
plugin repo. This command creates a cross-cutting artifact
(`docs/design/component-map.md`) that Phases 4–6 of the Figma
Implementation Track consume, and performs the one sanctioned
`figma_track: true` flip. Consult `docs/decisions.md`,
`docs/anti-patterns.md`, and `docs/context/architecture.md` in the
target project.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: cross-cutting artifact creation (component-map.md consumed by Phases 4-6); explicit human-gated figma_track confirmation flip; Figma MCP querying scoped to this interactive command only
- Decisions found:
  - {decision 1 — e.g. Figma MCP calls stay in interactive commands, never dispatched agents (docs/decisions.md, 2026-07-22)}
  - {decision 2 — e.g. PRP artifacts live under PRPs/, never .claude/}
  - {decision 3 — e.g. writer/reviewer split: reviewer alone owns the DRAFT→APPROVED flip}
- Applicable anti-patterns:
  - Flipping figma_track (or any future opt-in gating key) by heuristic — this command's Phase E confirmation is the ONLY sanctioned non-human-edit flip path
  - Writing pipeline artifacts under .claude/ — evidence bundles at PRPs/reports/design-map/evidence/, the map itself at docs/design/
- Applicable architectural rules:
  - documentation/AGENTS.md's three-file registration rule
  - docs/decision-gate.md — this command emits its own evidence block
  - Writer/reviewer split: reviewer alone owns the DRAFT→APPROVED flip
- Result: PROCEED | HALT (reason)
```

If any Decision Gate source cannot be read, HALT with the canonical
byte-exact message:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run `/relay-design-map`. No
> code has been changed and no review has been run.

---

## Parse arguments

`$ARGUMENTS` accepts one optional flag:

- **`--refresh`** — additive re-scan mode. When absent, this is the
  project's one-time setup path (first-ever map, or a fresh full
  build if no map exists yet). When present, the command re-queries
  the Figma library and additively re-scans: existing `CM-<n>` rows
  are never renumbered, human-verified `Confidence`/`verified_at`
  values are never clobbered without contradicting evidence, and only
  newly-discovered Figma components receive new `CM-<n>` ids.

No other arguments are accepted. Unrecognized flags are ignored with
a one-line note (never a HALT — this command has no other required
positional argument).

---

## Preconditions

HALT with a clear, actionable message (and do not proceed) if any of
these fail. No artifact is written and no agent is dispatched on
HALT.

### P1 — Figma MCP tools discoverable

Attempt to discover Figma MCP tools via `ToolSearch` in this main
session (the harness-level mechanism confirmed reachable by Phase 2's
MCP-access spike, `docs/decisions.md` 2026-07-22). If no Figma MCP
tool (e.g. `search_design_system`, `get_metadata`,
`get_code_connect_map`) can be discovered:

> FAILED_FIGMA_MCP_UNAVAILABLE: No Figma MCP server is reachable from
> this session. `/relay-design-map` requires a configured Figma MCP
> connection to query the target project's design library.
> To connect: add a Figma MCP server to your Claude Code MCP
> configuration (see your Figma MCP server's setup instructions), then
> re-run `/relay-design-map`.
> This command never silently degrades to a Figma-free run — the
> component map's entire purpose is grounding in the real Figma
> library.

Never silently degrade past this precondition — a map built without
any real Figma evidence is worse than no map (it would look
authoritative while being empty).

### P2 — Design-system config present

Check for `docs/context/design-system.md` at the target project root.

If absent, scaffold a starter file, then still HALT:

1. **Infer what is cheaply available.** Read the target project's
   root `package.json` when present: use its `"name"` field for
   `package_name`; use a `scripts.dev` or `scripts.start` entry (in
   that preference order) for `dev_server.command` when discoverable.
   Leave any value that cannot be cheaply inferred unset and mark it
   with the `[INFERRED - VALIDATE]` placeholder instead of guessing —
   mirroring the marker convention at
   `plugins/relay/skills/context-builder/SKILL.md:100`.
2. **Write** `docs/context/design-system.md` with YAML frontmatter
   carrying `package_name`, `local_clone_path`, `tokens_module`,
   `figma_library_file_keys` (a list), and a `dev_server` block
   (`command`, `port`):

   ```yaml
   ---
   package_name: <inferred from package.json "name", or "[INFERRED - VALIDATE] fill in the design-system package name">
   local_clone_path: "[INFERRED - VALIDATE] fill in the local path to the design-system's cloned repo"
   tokens_module: "[INFERRED - VALIDATE] fill in the path to the token module"
   figma_library_file_keys:
     - "[INFERRED - VALIDATE] fill in the Figma library file key(s) this project's design system lives in"
   dev_server:
     command: <inferred from package.json scripts.dev/scripts.start, or "[INFERRED - VALIDATE] fill in the dev-server start command">
     port: "[INFERRED - VALIDATE] fill in the dev-server port"
   ---

   # Design System Config

   Scaffolded by `/relay-design-map` on first run. This file is
   COMMAND-OWNED: `/relay-design-map`'s P2 precondition writes it when
   absent; `context-builder *update` only registers and preserves it,
   never generates or overwrites it. Fill in every
   `[INFERRED - VALIDATE]` placeholder above, then re-run
   `/relay-design-map`.
   ```

3. **HALT** with a new, accurate message naming exactly which keys
   need a human value:

   > FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE: `docs/context/design-system.md`
   > did not exist, so `/relay-design-map` scaffolded a starter file at
   > that path with `[INFERRED - VALIDATE]` placeholders. The following
   > keys still need a human value before this command can run:
   > `figma_library_file_keys`, `local_clone_path`, and any other field
   > still marked `[INFERRED - VALIDATE]` in the scaffolded file (also
   > double-check `package_name` and `dev_server.command` — they were
   > only inferred from `package.json` when discoverable).
   > Fill in the listed keys in `docs/context/design-system.md`, then
   > re-run `/relay-design-map`.

   Do NOT proceed to Phase A. Exit non-zero.

If present, proceed to Phase A — unchanged.

---

## Phase A — Ensure design-system config is loaded

`Read` `docs/context/design-system.md`. Parse its frontmatter for, at
minimum:

- The design-system package name.
- The local design-system clone path (relative to `target_root`).
- The token module path.
- The Figma library file key(s) to query.
- The `dev_server` block (start command, expected port) — consumed by
  Phase D's preflight check.

Hold this parsed config as `design_system_config` for Phase B and for
the payload passed to `design-map-writer`.

---

## Phase B — Query the Figma library (main session only)

All Figma MCP calls in this phase execute in THIS session — never
inside a dispatched agent (Decision Gate result above).

1. **Library search.** Call `search_design_system` against the Figma
   library file key(s) from `design_system_config`, enumerating the
   library's components. Budget: `max_library_search_calls = 40` —
   stop issuing further search calls once this budget is reached and
   record the scan as truncated (this feeds the map's
   `inventory_truncated` marker via the evidence bundle).
2. **Node-scoped metadata.** For each component (or component set)
   discovered, call node-scoped `get_metadata` to retrieve its
   variant/property structure.
3. **Code Connect (opportunistic).** Call `get_code_connect_map` for
   the library. This call is opportunistic — any error (missing Code
   Connect configuration, permission error, timeout) is recorded as
   `code_connect: unavailable(<error class>)` in the evidence bundle's
   header and the run CONTINUES. A Code Connect failure is never
   fatal to this command.
4. **Persist evidence.** Write every raw result from steps 1–3 to
   `PRPs/reports/design-map/evidence/` (create the directory if
   absent) as one or more evidence files — at minimum a
   `library-search.json` (step 1 results plus the
   `max_library_search_calls` budget consumption and a
   `truncated: true|false` flag), a `metadata/<component-key>.json`
   per component (step 2), and a `code-connect.json` (step 3 result or
   the `unavailable(<error class>)` marker). This is the exact and
   only evidence surface `design-map-writer` and
   `design-map-reviewer` are permitted to read for Figma facts — they
   never call the Figma MCP themselves.

---

## Phase C — Dispatch the writer/reviewer pair (bounded loop)

Mirrors `/relay-implement`'s Phase A.3.5 bounded-retry-loop shape.

1. **Initialize the budget.** `map_review_attempts = 0`,
   `max_map_review_retries = 2`, `map_prior_feedback = null`.
2. **Step A — dispatch `design-map-writer` (writer) via `Task`:**

   ```
   Task(subagent_type="design-map-writer",
        prompt={
          target_root: <target_root>,
          design_system_config: <design_system_config>,
          evidence_dir: "PRPs/reports/design-map/evidence/",
        })
   ```

3. **Step B — dispatch `design-map-reviewer` (reviewer) via `Task`:**

   Capture the dispatch instant immediately before invoking the
   agent: `date -u +%Y-%m-%dT%H:%M:%SZ`.

   ```
   Task(subagent_type="design-map-reviewer",
        prompt={
          map_path: "docs/design/component-map.md",
          target_root: <target_root>,
          evidence_dir: "PRPs/reports/design-map/evidence/",
          review_started_at: <the instant captured immediately above>,
        })
   ```

4. **Step C — evaluate the verdict.** Read the just-appended
   `docs/design/component-map-review.jsonl` line:
   - **`APPROVED`** → proceed to Phase D.
   - **`CHANGES_REQUESTED`** → increment `map_review_attempts`; set
     `map_prior_feedback` from the failing `R-DM<i>` reasons. If
     `map_review_attempts > max_map_review_retries`, HALT loudly:

     > FAILED_MAP_REVIEW_BUDGET_EXCEEDED: `design-map-reviewer` returned
     > CHANGES_REQUESTED `<N>` times, exceeding `max_map_review_retries
     > = 2`. Last failing items:
     >   - R-DM<i>: <reason>
     >   - R-DM<j>: <reason>
     > `/relay-design-map` never silently accepts a failing map. Review
     > the reasons above, fix the underlying issue (evidence gap,
     > design-system clone mismatch, or a `design-map-writer` defect),
     > and re-run `/relay-design-map`.

     Do NOT proceed to Phase D. Do NOT flip `figma_track`. Exit
     non-zero.

     Otherwise, loop back to Step A, passing `map_prior_feedback` in
     the writer's dispatch payload so it can address the specific
     failing items on the next attempt.

---

## Phase D — Preflight report

Once the map reaches `*Status: APPROVED*`, run a best-effort
preflight check before offering the `figma_track` confirmation.
Preflight failures are documented notes, never HALTs — this phase
degrades gracefully by design (see NOT Building / Risks in the source
plan).

1. **`node` present.** Check `node --version` resolves. Note pass/fail.
2. **Visual-tooling dependency install (best-effort).**
   `${CLAUDE_PLUGIN_ROOT}/scripts/visual/` ships as of Phase 6 of the
   Figma Implementation Track and is expected to be present
   (`provision.mjs`, `capture.mjs`, `compare.mjs`, `package.json`).
   Attempt `npm install --prefix ${CLAUDE_PLUGIN_ROOT}/scripts/visual/`.
   This directory ships inside the installed plugin, so its `node_modules`
   is NOT present in a fresh install (the cache is versioned per directory,
   so a version bump discards any previous install). Verify that
   `playwright`, `pixelmatch` and `pngjs` actually resolve — `provision.mjs`
   only checks for the Chromium binary, not these packages, so a missing
   one surfaces later as `ERR_MODULE_NOT_FOUND` inside `capture.mjs` /
   `compare.mjs` rather than here.
   In the rare case the directory itself is missing, record a documented
   note: "${CLAUDE_PLUGIN_ROOT}/scripts/visual/ not present — this
   directory ships as of Phase 6 of the Figma Implementation Track; its
   absence indicates a broken plugin install, not an error in this
   command." Never HALT on this absence.
3. **Dev script exists.** Check that `design_system_config`'s
   `dev_server` block names a start command that resolves in the
   target project's package manifest (e.g. an `npm run <script>`
   entry actually defined in `package.json`). Note pass/fail.
4. **Configured port free.** Best-effort check whether the
   `dev_server` block's configured port is currently free (e.g. via a
   TCP-connect probe or an OS-appropriate port-check command). Note
   pass/fail — a port already in use is a note, not a HALT (the port
   may simply be a dev server the user already has running).

Print a preflight summary listing each of the four checks with its
outcome (`OK`, `NOTE: <detail>`, or `FAIL: <detail>` — note that even
a `FAIL` here does not HALT the command; it is surfaced to the human
as part of the summary they read before confirming Phase E).

---

## Phase E — Explicit human confirmation, then the sanctioned flip

This is the ONLY sanctioned non-human-edit path to flip
`figma_track: true` (per the Phase 1 Decision Gate and
`docs/anti-patterns.md`'s "Flipping `figma_track` ... by heuristic"
entry).

1. Print a summary: the map's location
   (`docs/design/component-map.md`), its row counts (mapped /
   unmapped), the Phase D preflight results, and the exact line that
   will change (`figma_track: false` → `figma_track: true` in
   `docs/context/methodology.md`).
2. Ask the user for an explicit, quoted confirmation — a literal
   affirmative reply is required (e.g. the user typing "yes",
   "confirm", or an equivalent unambiguous affirmative in their own
   words). A non-answer, an ambiguous reply, or any reply that is not
   affirmative MUST be treated as "do not flip" — never proceed on
   inferred consent, silence, or a generic "continue".
3. **On explicit confirmation:** perform a single `Edit` on
   `<target_root>/docs/context/methodology.md`:
   - `old_string`: `figma_track: false`
   - `new_string`: `figma_track: true`
   - `replace_all`: `false`

   If the key is entirely absent from the frontmatter (a project
   whose `methodology.md` predates the Phase 1 Foundations rollout),
   surface this explicitly and instruct the user to add
   `figma_track: false` to the frontmatter first (mirroring the
   backfill-only-when-absent contract from `docs/anti-patterns.md`) —
   do NOT invent the key's placement via a blind append.

4. **On decline or non-affirmative reply:** do NOT edit
   `methodology.md`. Print a note that the map is APPROVED and
   available for future confirmation, and that re-running
   `/relay-design-map` (with or without `--refresh`) is safe and will
   re-offer the same confirmation without re-doing already-approved
   work when the map is already `*Status: APPROVED*` and no
   `--refresh` was requested.

---

## Final output surface

### Success path — map APPROVED and `figma_track` flipped

> Component map APPROVED at `docs/design/component-map.md`
> (`<M>` mapped, `<U>` unmapped). Preflight: `<summary>`.
> `figma_track: true` confirmed and flipped in
> `docs/context/methodology.md`. The Figma track is now active for
> this project.

### Success path — map APPROVED, confirmation declined

> Component map APPROVED at `docs/design/component-map.md`
> (`<M>` mapped, `<U>` unmapped). Preflight: `<summary>`.
> `figma_track` was NOT flipped — no explicit confirmation was given.
> Re-run `/relay-design-map` when ready to activate the Figma track.

### HALT paths (named codes with actionable messages)

- `FAILED_FIGMA_MCP_UNAVAILABLE` — P1: no Figma MCP tools discoverable.
- `FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE` — P2: `docs/context/design-system.md` absent or incomplete — a starter file was scaffolded; re-run after filling the listed keys.
- `FAILED_MAP_REVIEW_BUDGET_EXCEEDED` — Phase C: `max_map_review_retries` exhausted.

No artifact is written and no `figma_track` flip occurs on any HALT
path. Exit non-zero.

---

## Constraints (hard rules)

1. **All Figma MCP calls happen in this session, never inside a
   dispatched agent.** Neither `design-map-writer` nor
   `design-map-reviewer` has a Figma MCP tool in its allowlist; this
   command is the sole caller. Per the Phase 2 MCP-access-point
   decision.
2. **Every Figma fact used downstream must be persisted first.**
   Phase B writes the full evidence bundle to
   `PRPs/reports/design-map/evidence/` BEFORE Phase C dispatches
   either agent.
3. **Never write pipeline artifacts under `.claude/`.** Evidence
   bundles go under `PRPs/reports/design-map/evidence/`; the map goes
   under `docs/design/`. See `docs/anti-patterns.md` lines 60–66.
4. **Never flip `figma_track` without explicit, quoted human
   confirmation.** No heuristic, no inferred consent, no default-yes
   on silence. This is the one command in the entire pipeline
   authorized to perform this specific `Edit`.
5. **Never silently accept a failing map.** Budget exhaustion in
   Phase C is a loud HALT naming the failing `R-DM<i>` items, never a
   silent pass-through to Phase D.
6. **Preflight failures never HALT.** Phase D's four checks are
   best-effort notes surfaced to the human in the Phase E summary,
   including graceful degradation for the rare case of a broken plugin
   install missing the `${CLAUDE_PLUGIN_ROOT}/scripts/visual/` tooling
   (shipped as of Phase 6).
7. **Never invoked by `/relay-execute`.** This is a standalone,
   human-triggered setup command outside the autonomous Pillar 2
   orchestration.

---

## What you do NOT do

- **Query Figma MCP tools from inside `design-map-writer` or
  `design-map-reviewer`.** Both agents are MCP-free by design; all
  Figma facts route through the persisted evidence bundle.
- **Flip `figma_track` by heuristic, inference, or default.** The
  Phase E confirmation is mandatory and must be an explicit,
  affirmative, quoted human reply.
- **Configure or vendor the `${CLAUDE_PLUGIN_ROOT}/scripts/visual/`
  tooling.** That is Phase 6's deliverable; this command's preflight
  only attempts its dependency install and reports the outcome.
- **Write Code Connect entries back to Figma.** Code Connect
  write-back is a recorded Could-item in the source PRD; this command
  only reads Code Connect data opportunistically.
- **Loop indefinitely on `CHANGES_REQUESTED`.** Bounded by
  `max_map_review_retries = 2`; budget exhaustion HALTs loudly.
- **Modify plans, PRDs, or any file outside `docs/design/`,
  `docs/context/methodology.md` (Phase E only), and
  `PRPs/reports/design-map/evidence/`.** No other filesystem surface
  is touched by this command.
