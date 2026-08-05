---
description: 'Give every Figma-enabled project a versioned, human-curatable map from Figma library components to real code components. Queries the target project''s Figma library in the main session (search_design_system, budget max_library_search_calls=40; a local Glob/Grep pre-match against the design-system clone narrows enrichment to candidates only; node-scoped get_metadata for pre-matched candidates, budget max_metadata_calls=150, non-fatal on exhaustion; a re-invocation skips already-recorded work in steps 2, 5, and 6 so a retry can cost only the delta, while --refresh re-runs library search and Code Connect in full and still limits get_metadata enrichment to the delta; get_code_connect_map read opportunistically), persists evidence bundles to PRPs/reports/design-map/evidence/, dispatches the design-map-writer/design-map-reviewer pair in a bounded max_map_review_retries=2 loop to produce an APPROVED docs/design/component-map.md, runs a preflight report (visual-tooling dependency check, dev-server config check), then asks for the user''s own explicit, quoted confirmation before performing the ONLY sanctioned Edit that flips figma_track: true in the target project''s docs/context/methodology.md. Never invoked by /relay-execute — a per-project, one-time (or --refresh) human-triggered setup command.'
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
- the source PRD `figma-implementation-track.prd.md`, in the relay plugin repo (not packaged) — Implementation Phases row 3.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-worktree.md` — HALT-code + preflight structure this command mirrors.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` Phase A.3.5 — the bounded writer/reviewer retry-loop shape this command's Phase C mirrors.
- `${CLAUDE_PLUGIN_ROOT}/agents/design-map-writer.md` and `${CLAUDE_PLUGIN_ROOT}/agents/design-map-reviewer.md` — the dispatched agent pair.
- `${CLAUDE_PLUGIN_ROOT}/resources/component-map-template.md` — the canonical map shape both agents reference.
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
  newly-discovered Figma components receive new `CM-<n>` ids. A
  plain re-invocation (no `--refresh`) resumes at no extra Figma
  cost: Phase B steps 2, 5, and 6 all automatically skip Figma calls
  for work already recorded on disk from a prior run, so retries cost
  only the delta. `--refresh` deliberately re-runs step 2's search in
  full (to catch newly-added or newly-removed Figma components) and
  re-attempts step 6's Code Connect in full (to catch a configuration
  added or fixed since the last recorded outcome); step 5's
  enrichment still costs only the delta, enriching only candidates
  not already covered by an existing metadata file — so `--refresh`
  costs the full search plus the enrichment delta, never a full
  re-enrichment.

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

> FAILED_FIGMA_MCP_UNAVAILABLE: No Figma MCP tools are discoverable in this session.
> `/relay-design-map` requires a configured Figma MCP connection to
> query the target project's design library.
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

Any of this phase's two load-bearing Figma MCP data calls
(`search_design_system`, `get_metadata`) that fails with a
quota-exhaustion error HALTs immediately with
`FAILED_FIGMA_QUOTA_EXHAUSTED` — detection is by error class/string
match, never by HTTP status, since Figma's MCP documentation defines
neither `429` nor `Retry-After`. No retry, no backoff: sleeping is
useless against a per-day or per-month bucket. This rule does NOT
apply to `get_code_connect_map` (step 6): a quota-exhaustion error
there follows step 6's existing, unchanged non-fatal path — recorded
as `code_connect: unavailable(quota-exhausted)` and the run
CONTINUES — because by the time step 6 runs, the enumeration and any
enrichment this run was authorized to perform are already recorded,
so the bundle is as complete as this run intends, and discarding it
over an opportunistic call would be strictly worse than the
interrupted-run cost this PRD exists to reduce.
`PRPs/prds/figma-quota-resilience.prd.md:37` cites Code Connect's
existing non-fatal path as the model this phase's load-bearing HALT
emulates, not a defect to remove — failure handling was "inverted
relative to importance" before this phase; this rule fixes the
load-bearing side without inverting it back onto the opportunistic
side.

> FAILED_FIGMA_QUOTA_EXHAUSTED: A Figma MCP data call failed with a
> quota-exhaustion error — distinct from `FAILED_FIGMA_MCP_UNAVAILABLE`:
> the Figma MCP connection is live; your seat's call quota for the
> current window is spent.
> This message promises no reset time. Figma's MCP documentation
> states no reset mechanics for any seat, so do not assume a fixed
> wait-and-retry window.
> The scoped scan this command already performs (enumerate -> pre-match
> -> enrich only candidates, bounded by `max_metadata_calls`) is the
> durable fix for this failure class.
> Upgrading from a View/Collab seat to Dev/Full multiplies your MCP
> call quota roughly a thousandfold (6/month vs. 200-600/day).
> But no Figma seat makes whole-library enrichment viable.
> Detection is by error class/string match, never by HTTP status —
> Figma's MCP documentation defines neither `429` nor `Retry-After`.
> No retry, no backoff: sleeping is useless against a per-day or
> per-month bucket.
> When the interruption happened after library search completed,
> re-running `/relay-design-map` once your quota has recovered
> costs only the delta — Phase B steps 2, 5, and 6 automatically
> skip work already recorded on disk.
> When the interruption happened during search itself, search
> re-runs from the start on retry, because `search_design_system`
> exposes no resumable cursor; `--refresh` is only needed when
> deliberately re-scanning for new or removed Figma components.

1. **Quota preflight (`whoami` probe).** Call the quota-exempt
   `whoami` tool (Figma documents exactly three quota-exempt tools:
   `whoami`, `add_code_connect_map`, `generate_figma_design`). When
   the response exposes a seat (e.g. `View`, `Collab`, `Dev`, `Full`)
   and a tier/plan (e.g. `Starter`, `Professional`, `Organization`,
   `Enterprise`), hold both for step 4 and for step 7's evidence
   recording. When the call fails for any reason, or the response
   does not expose one or both fields — `whoami`'s response schema is
   observed, not documented, and may change — record the gap
   (`seat: unavailable` and/or `tier: unavailable`) and continue; this
   step never HALTs regardless of what `whoami` returns.
2. **Library search.** Before issuing any call, check whether
   `--refresh` is ABSENT and a prior evidence bundle exists at
   `evidence_dir/library-search.json` whose own `inventory_truncated`
   field reads `false` (a complete prior enumeration). When both
   hold, SKIP this step's `search_design_system` calls entirely —
   reuse the existing component/component-set list verbatim as this
   run's step 2 result (zero search calls issued, `inventory_truncated`
   carried forward unchanged) — and record `search_skipped: true` for
   step 7. Otherwise (either `--refresh` was passed, or no complete
   prior inventory exists), record `search_skipped: false` and
   proceed as follows. Call `search_design_system` against the Figma
   library file key(s) from `design_system_config`, enumerating the
   library's components. Budget: `max_library_search_calls = 40` —
   stop issuing further search calls once this budget is reached and
   record the scan as truncated (this feeds the map's
   `inventory_truncated` marker via the evidence bundle).
3. **Pre-match candidates (local, Figma-call-free).** Against
   `design_system_config.local_clone_path`, compare each
   component/component-set name (and slug) enumerated in step 2 to
   file names and exported symbol names in the local design-system
   clone via `Glob`/`Grep`, producing a candidate set for enrichment.
   This step issues zero Figma MCP calls. Three properties hold by
   design:
   - **Recall-oriented.** The pre-match over-includes and never
     under-includes — any plausible partial match, pluralization
     difference, or ambiguous multi-candidate name is always
     included, never excluded.
   - **No classification authority.** The pre-match never decides
     `CONFIRMED` vs. `INFERRED` vs. `UNMAPPED` — that remains
     exclusively `design-map-writer` Step 2's job against the full
     evidence bundle, and the writer may map any component present in
     the evidence bundle regardless of membership in this candidate
     set.
   - **A duplicated, drifting heuristic.** This step necessarily
     duplicates part of `design-map-writer.md` Step 2's own
     name/prop matching heuristic; the two are expected to drift over
     time, and neither is authoritative over the other — this
     pre-match only scopes *which components get enriched in step 5*.
4. **Cost declaration + confirmation.** Before estimating, partition
   the step 3 candidate set using `evidence_dir`'s existing
   `metadata/<component-key>.json` files — a candidate with an
   existing file is already enriched from a prior run (excluded —
   hold this excluded count as `candidates_skipped_already_enriched`
   for step 7, on every path below, since it is fully knowable here
   regardless of which branch follows); the
   remainder is the delta set step 5 will actually call
   `get_metadata` for. This partition applies regardless of
   `--refresh`. When the delta set is empty, do NOT proceed with the
   declaration/confirmation below: record `metadata_calls_made: 0`,
   `candidates_skipped_already_enriched` (the full step 3
   candidate-set size, since every candidate was already enriched),
   reason `"fully cached — no candidates pending enrichment"`, then
   continue to steps 6-7 as normal — this is not a HALT (mirroring the
   existing decline branch below). Otherwise, continue below using the
   delta set's size — never the full step 3 candidate-set size — as
   the estimate. Using the step 1 `whoami`
   result and the delta set (defined above) size, estimate the number of
   `get_metadata` calls step 5 will issue (the delta set's
   count, capped at `max_metadata_calls = 150` — this is the
   arithmetically infeasible part the source PRD's Problem Statement
   targets, not the cheaper, independently-budgeted step 2 search).
   Compare the estimate against the documented ceiling for the
   detected seat: View/Collab seats are limited to 6 calls **per
   month** on every plan; Dev/Full seats are limited to 200 calls/day
   (Starter, Professional) or 600 calls/day (Organization) —
   Enterprise's ceiling is undocumented. **When `whoami` exposed both
   seat and tier and the estimate exceeds the ceiling:** declare both
   numbers explicitly (e.g. "This run's pre-matched candidate set is
   `<N>`, so at most `<N>` `get_metadata` calls will be issued; your
   `<seat>` seat on the `<tier>` plan is documented to allow
   `<ceiling>`.") and ask the user for an explicit, quoted affirmative
   reply before issuing any `get_metadata` call: a non-answer, an
   ambiguous reply, or any non-affirmative reply MUST be treated as
   do-not-proceed, never inferred consent. **On decline or
   non-affirmative reply:** do NOT proceed to step 5; record
   `metadata_calls_made: 0`, `enrichment_truncated: true`, reason
   `"cost-declaration preflight declined by operator"`, and
   `candidates_skipped_already_enriched` (per the step 4 partition
   above) (fed forward
   to step 7), then continue to steps 6-7 as normal — this is not a
   HALT; the evidence gathered so far, and any prior map, remain
   valid, and re-running later is safe. **When `whoami` did not
   expose seat and/or tier, or the estimate does not exceed the
   ceiling:** proceed directly to step 5 without the confirmation
   gate; when seat/tier was unavailable, record the degradation for
   step 7 rather than halting.
5. **Node-scoped metadata (candidates only).** For each component (or
   component set) in the step 3 candidate set — never the full step 2
   enumeration — call node-scoped `get_metadata`, scoped to step 4's
   delta set only — a candidate excluded from the delta set (an
   existing `metadata/<component-key>.json` file already covers it)
   issues zero calls here, reusing the on-disk file as this run's
   evidence for it, to retrieve its
   variant/property structure. Budget: `max_metadata_calls = 150` —
   stop issuing further `get_metadata` calls once this budget is
   reached. Carry forward `candidates_skipped_already_enriched` as
   established by step 4's partition above for step 7 — the same
   excluded count, since step 5 iterates exactly the delta set step 4
   computed and excludes nothing further of its own. Exhaustion is
   never fatal: record
   `enrichment_truncated: true` with a reason (e.g.
   `"max_metadata_calls exhausted at 150/<candidate count>"`) and
   continue to the next step.
6. **Code Connect (opportunistic).** Before issuing this call, check
   whether `--refresh` is ABSENT and a prior evidence bundle already
   contains `evidence_dir/code-connect.json` — any prior recorded
   outcome, including a `code_connect: unavailable(<error class>)`
   marker, counts as already-recorded, since an opportunistic call
   whose outcome is already known needs no repeat. When both hold,
   SKIP this call entirely: reuse the existing `code-connect.json`
   verbatim as this run's step 6 result (zero calls issued), and
   record `code_connect_skipped: true` for step 7. Otherwise (either
   `--refresh` was passed — deliberately re-attempting in case a Code
   Connect configuration was added or fixed since the last recorded
   outcome — or no prior `code-connect.json` exists), record
   `code_connect_skipped: false` and proceed as follows. Call
   `get_code_connect_map` for
   the library. This call is opportunistic — any error (missing Code
   Connect configuration, permission error, timeout) is recorded as
   `code_connect: unavailable(<error class>)` in the evidence bundle's
   header and the run CONTINUES. A Code Connect failure is never
   fatal to this command.
7. **Persist evidence.** Write every raw result from steps 1–6 to
   `PRPs/reports/design-map/evidence/` (create the directory if
   absent) as one or more evidence files — at minimum a
   `library-search.json` (step 2 results plus the
   `max_library_search_calls` budget consumption and a
   `inventory_truncated: true|false` flag; `candidates_prematched`, the size of
   the step 3 candidate set; `metadata_calls_made`, the count of step
   5 `get_metadata` calls actually issued this run;
   `enrichment_truncated: true|false` with its reason when
   applicable; `seat` — the value read in step 1, or `"unavailable"`
   when `whoami` did not expose it; `tier` — same convention;
   `metadata_call_estimate` — the step 4 estimate;
   `metadata_call_ceiling` — the seat's documented ceiling step 4
   compared against, or `"unavailable"` when seat/tier was
   undetermined; and `preflight_confirmed` — `true` when the user gave
   an explicit affirmative reply, `false` when declined, `null` when
   the confirmation gate was never triggered because the estimate did
   not exceed the ceiling or seat/tier was unavailable); `search_skipped`
   — `true` when step 2 reused a prior run's complete library
   enumeration verbatim (zero `search_design_system` calls issued this
   run), `false` otherwise; `candidates_skipped_already_enriched` —
   the count of step 3 candidates step 5 excluded from its delta set
   because an existing `metadata/<component-key>.json` file from a
   prior run was reused instead of a fresh `get_metadata` call; and
   `code_connect_skipped` — `true` when step 6 reused a prior run's
   `code-connect.json` verbatim (zero `get_code_connect_map` calls
   issued this run), `false` otherwise), a
   `metadata/<component-key>.json` per enriched candidate (step 5),
   and a `code-connect.json` (step 6 result or the
   `unavailable(<error class>)` marker). This is the exact and only
   evidence surface `design-map-writer` and `design-map-reviewer` are
   permitted to read for Figma facts — they never call the Figma MCP
   themselves.

   Immediately before this write, maintain a checkpoint at
   `PRPs/reports/design-map/.state/checkpoint.json` (create the
   `.state/` directory if absent) — a path deliberately OUTSIDE
   `evidence_dir`, never reached by either agent's "Read every file
   under `evidence_dir`" instruction, satisfying the
   checkpoint-exclusion requirement (PRD AC-9) structurally via path
   placement rather than a dotfile naming convention. The checkpoint
   holds a cumulative `call_log`: an array recording every Figma MCP
   data call this project's `/relay-design-map` has ever issued
   across every run (tool name, UTC timestamp, outcome), appended to
   — never replaced — on every run, including a run that HALTs on
   `FAILED_FIGMA_QUOTA_EXHAUSTED` (capture the partial `call_log`
   before halting). On every step-7 write, project (copy) the
   checkpoint's cumulative `call_log` into `library-search.json`'s
   own header as `call_log`, so a reader of the evidence bundle sees
   the cumulative total without opening the checkpoint (this is what
   Success Metric 1's "Cumulative `call_log` in the evidence bundle
   header" measures).

   Before writing, `Read` the EXISTING `library-search.json` and
   `metadata/<component-key>.json` files under `evidence_dir` when
   present (a prior run's bundle) and MERGE this run's
   newly-observed components/component-sets into them additively —
   union, never replace. Each merged entry (in `library-search.json`'s
   component/component-set list, and each
   `metadata/<component-key>.json` file) carries a `last_seen_scan`
   field set to this run's generation id — the checkpoint's own
   monotonically incrementing scan counter, incremented once per
   `/relay-design-map` invocation and persisted alongside `call_log`.
   An entry present in the prior bundle but not observed in this
   run's results is retired (removed from the merged bundle) only
   when THIS run's own `inventory_truncated` is `false` — a complete,
   non-budget-truncated library enumeration, so a component's absence
   genuinely means it left the Figma library. When this run's
   `inventory_truncated` is `true` (a partial scan), no entry is ever
   retired — partial scans merge additively and retire nothing (per
   the source PRD's Decisions Log "Retirement under additive merge"
   row).

   Both `inventory_truncated` and `enrichment_truncated` are derived
   by scanning what this write actually has on disk at write time —
   never trusted from an in-memory flag the run merely believes about
   itself: `inventory_truncated` is `true` iff step 2's library
   search stopped before enumerating the full library (cross-checked
   against the merged component/component-set count, not assumed);
   `enrichment_truncated` is `true` iff any pre-matched candidate
   lacks a corresponding `metadata/<component-key>.json` file on disk
   after this write (counted by scanning the `metadata/` directory's
   actual file count against the step 3 candidate set size — never
   from a flag merely recording whether enrichment was attempted).
   Guard three degenerate cases explicitly: (a) a run that fails
   before contributing any new evidence must leave the PRIOR bundle's
   `inventory_truncated`/`enrichment_truncated` values untouched
   rather than deriving a false `inventory_truncated: false` from an
   empty diff; (b) an empty component-set list (a library genuinely
   containing zero component sets) must not derive
   `enrichment_truncated: false` merely because there was vacuously
   nothing to enrich — when the candidate set is empty,
   `enrichment_truncated` reports whether enrichment was even
   reachable this run, never a silent "complete"; (c)
   `enrichment_truncated` is always recomputed from the actual
   `metadata/*.json` file count on disk, never from a field recording
   only the run's own intent to enrich, so the flag can never diverge
   from what the evidence bundle actually shows.

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
- `FAILED_FIGMA_QUOTA_EXHAUSTED` — Phase B: a Figma MCP data call failed with a quota-exhaustion error; no retry, no backoff.

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
   under `docs/design/`. See `docs/anti-patterns.md` ("Writing pipeline artifacts under .claude/").
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
