# Feature: Docs updates + version bump (Phase 3 of relay-execute)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: cross-cutting artifact creation; impacts docs/api-reference.md, docs/decisions.md, docs/context/architecture.md, documentation/changelog.html, plugins/relay/.claude-plugin/plugin.json, documentation/reference/commands.html, documentation/roadmap/status.html; plugin manifest version-sync binding rule §7.5 activated; new decisions to pin (D7 dispatch model, D6 state-machine model, D3 retry-budget composition)
- Decisions found:
  - PRP artifacts live under PRPs/ at the repository root, never under .claude/ (docs/decisions.md 2026-04-19)
  - Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html (docs/decisions.md 2026-04-30) — binding rule: version bump MUST be in the same commit as the changelog entry
  - Command surface: one command per stage, writer and reviewer split (docs/decisions.md 2026-04-19)
  - Phased rollout driven by docs/planning/dev_process_improvement_plan.html (docs/decisions.md 2026-04-19)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66) — plan path and all referenced paths must resolve under PRPs/plans/, not .claude/PRPs/
  - Treating plugins/prp-core/ as active relay code (docs/anti-patterns.md) — no imports or references to prp-core assets
- Applicable architectural rules:
  - PRPs/ artifact path convention: all artifacts under PRPs/, never .claude/ (docs/context/architecture.md §PRP artifact paths)
  - Three-pillar architecture: Phase 3 capstone (/relay-execute) completes Pillar 2 (Implementation); docs update must reflect this (docs/context/architecture.md §Phased rollout)
  - Plugin manifest version in lock-step with changelog minor/major release (documentation/AGENTS.md §7.5; docs/decisions.md 2026-04-30)
  - documentation/AGENTS.md is the binding contract for any change to documentation/ — must be read before touching any file under documentation/
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-execute.prd.md` — Implementation Phases row 3: "Docs updates + version bump" — Goal: make the capstone visible to readers of the documentation site and the api-reference, and cut the v0.9.0 release with the §7.5 plugin manifest sync — Success signal: v0.9.0 changelog entry rendered on the documentation site; `plugins/relay/.claude-plugin/plugin.json` version is `0.9.0`; the api-reference shows `/relay-execute` ✅ implemented; `docs/decisions.md` records the three pinned decisions (D7 dispatch model, D6 state-machine model, D3 retry-budget composition).

## Summary

Phase 3 of the relay-execute feature delivers the final documentation and manifest updates that make the shipped `/relay-execute` command visible and durable. The deliverables are purely editorial and configurational — no new commands or agents. Up to seven files are touched (five mandatory plus the binding §7.5 plugin manifest plus two optional documentation site refreshes): `docs/api-reference.md` (mark `/relay-execute` ✅ implemented; promote project Phase 3 row status), `docs/decisions.md` (pin D7 dispatch model, D6 state-machine model, D3 retry-budget composition as three new 2026-05-01 entries), `docs/context/architecture.md` (Phased rollout Phase 3 row promoted to shipped; new §"Orchestrator state machine" sub-section for D6), `documentation/changelog.html` (cut v0.9.0 entry per AGENTS.md §7.5 template), `plugins/relay/.claude-plugin/plugin.json` (version bump 0.8.0 → 0.9.0 in the same commit as the changelog entry — binding §7.5 rule, first application post-codification), and optionally `documentation/reference/commands.html` (add `badge--done` to `/relay-execute`) and `documentation/roadmap/status.html` (project Phase 3 promoted to `done`). The commit that ships all six (or seven) changes constitutes the v0.9.0 release.

## User Story

```
As relay's developer
I want the shipped /relay-execute command reflected in the api-reference, decisions log, architecture doc, and the documentation changelog with a v0.9.0 manifest bump
So that the plugin's cache invalidates for installed users, the capstone is visible on the documentation site, and the three key orchestration decisions (D7, D6, D3) are durably recorded for future agents to consult
```

## Problem Statement

With Phases 1 and 2 of `relay-execute` complete (command file shipped, dogfood validated), the documentation surfaces still show `/relay-execute` as an unimplemented placeholder. `docs/api-reference.md` lists the command under the Orchestrator section without an ✅ badge. `docs/decisions.md` has no entries for the dispatch model (D7), the state-machine model (D6), or the retry-budget composition (D3) that are the central architectural choices of the orchestrator. `docs/context/architecture.md`'s Phased rollout table has project Phase 3 in `partial` status and lacks the §"Orchestrator state machine" sub-section explaining the source-PRD-table-as-state model. `documentation/changelog.html` has no v0.9.0 entry. `plugins/relay/.claude-plugin/plugin.json` is still at version `0.8.0`. This is the first release cut after the §7.5 plugin manifest version-sync rule was codified (commit 26860fc, 2026-04-30): the version bump is non-optional and must land in the same commit as the changelog entry per that binding rule.

## Solution Statement

Make seven surgical edits, all in one commit, to close the visibility gap:

1. `docs/api-reference.md`: promote `/relay-execute` row to ✅ **implemented** with behavioral notes (serial orchestration, inline command-protocol adoption via `Read`, two new orchestration budgets, idempotency via PRD table state machine, audit artifact at `PRPs/reports/<feature>/orchestrator-run.json`); promote project Phase 3 description from "partial" to reflect the capstone shipped.
2. `docs/decisions.md`: append three new `[2026-05-01]` entries — D7 (dispatch model: inline `Read`-based command-protocol adoption), D6 (state machine: source PRD's Implementation Phases table IS the state machine), D3 (retry-budget composition: each downstream command owns its internal loop budget; orchestrator adds `max_plan_review_retries` + `max_orchestrator_minutes`). Each entry follows the canonical four-field shape (Context / Decision / Reason / Areas affected).
3. `docs/context/architecture.md`: update Phased rollout Phase 3 row to `shipped`; add §"Orchestrator state machine" sub-section under the Command surface section explaining the D6 source-PRD-table-as-state model and its idempotency guarantee.
4. `documentation/changelog.html`: rename the current `Unreleased` block to `0.9.0 — 2026-05-01`; start a fresh empty `Unreleased` block at the top; the v0.9.0 block's `Changed` section MUST include the plugin.json bump line per §7.5 HTML template (verbatim: `<li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.8.0</code> &rarr; <code>0.9.0</code> to match this release; users running <code>/plugin</code> after pulling this version will get a fresh <code>relay/0.9.0/</code> cache directory with all newly-shipped commands and agents registered.</li>`).
5. `plugins/relay/.claude-plugin/plugin.json`: bump `"version": "0.8.0"` → `"version": "0.9.0"` (binding §7.5 rule; same commit as changelog).
6. `documentation/reference/commands.html`: add `<span class="badge badge--done">implemented</span>` to the `/relay-execute` heading; expand its `Notes` kv-block with shipped behavioral details (inline `Read`-based dispatch, two orchestration budgets, seven HALT outcome codes, idempotency via PRD table).
7. `documentation/roadmap/status.html`: promote project Phase 3 row from `badge--partial` to `badge--done`; update the scope annotation to list all shipped pieces including `/relay-execute`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation + manifest update |
| Complexity | Low — all edits are surgical and additive; no logic changes, no new files |
| Systems Affected | `docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json`, `documentation/reference/commands.html`, `documentation/roadmap/status.html` |
| Dependencies | Phase 1 (relay-execute command file, `complete`); Phase 2 (dogfood, `complete`); `documentation/AGENTS.md` §7.5 binding rule (read before editing any file under `documentation/`) |
| Estimated Tasks | 7 atomic edit tasks |
| Source PRD line ref | `PRPs/prds/relay-execute.prd.md` Implementation Phases row 3 (line 227); Phase Details §Phase 3 (lines 242–244); AC-16 (line 102); D16 (line 267) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 320–376 | §7.5 binding plugin-manifest version-sync rule — exact HTML template for the changelog Changed entry; must be read before writing the v0.9.0 block |
| P0 | `documentation/changelog.html` | 31–60 | Most recent versioned entry (v0.8.0) — canonical shape, HTML structure, section ordering, kv-item format to mirror |
| P0 | `plugins/relay/.claude-plugin/plugin.json` | 1–9 | Current version field (0.8.0) — must bump to 0.9.0 |
| P1 | `docs/api-reference.md` | 60–65 | Orchestrator section — current `/relay-execute` row (no ✅ badge); location to promote |
| P1 | `docs/decisions.md` | 380–403 | Most recent entry (2026-04-30 plugin manifest version-sync) + template comment — canonical four-field entry shape to mirror for three new D7/D6/D3 entries |
| P1 | `docs/context/architecture.md` | 124–135 | Phased rollout table — Phase 3 row to promote; location for new §"Orchestrator state machine" sub-section |
| P2 | `documentation/reference/commands.html` | 183–199 | `/relay-execute` heading and kv-block — current state (no badge, sparse Notes) |
| P2 | `documentation/roadmap/status.html` | 34–73 | Project-level phases table — Phase 3 row to promote from `badge--partial` to `badge--done` |
| P2 | `PRPs/prds/relay-execute.prd.md` | 250–268 | Decisions Log — D7, D6, D3 full text to adapt for `docs/decisions.md` entries |

## Patterns to Mirror

### Changelog block — v0.8.0 entry shape
# SOURCE: documentation/changelog.html:35-60

```html
<h2 id="v0-8-0">0.8.0 — 2026-04-30</h2>

<p>Implementation authoring stage shipped — ...</p>

<h3 id="v0-8-0-added">Added</h3>
<ul>
  <li><strong><code>plugins/relay/agents/implementer.md</code></strong> &mdash; ...</li>
</ul>

<h3 id="v0-8-0-changed">Changed</h3>
<ul>
  <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
    &mdash; version bumped <code>0.1.0</code> &rarr; <code>0.8.0</code> ...</li>
</ul>
```

Mirror this shape for the v0.9.0 block: `<h2 id="v0-9-0">0.9.0 — 2026-05-01</h2>` followed by a prose paragraph, then `<h3 id="v0-9-0-added">Added</h3>` and `<h3 id="v0-9-0-changed">Changed</h3>` sub-sections. The `Changed` section MUST include the plugin.json bump `<li>` per §7.5 HTML template. Task 4 copies this shape.

### §7.5 binding plugin.json bump `<li>` template
# SOURCE: documentation/AGENTS.md:360-366

```html
<li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
  &mdash; version bumped <code>0.X.Y</code> &rarr; <code>0.A.B</code> to
  match this release; users running <code>/plugin</code> after pulling
  this version will get a fresh <code>relay/0.A.B/</code> cache directory
  with all newly-shipped commands and agents registered.</li>
```

Task 4 copies this verbatim with `0.8.0` → `0.9.0` substituted. This is the mandatory line; the plan-reviewer R-COH-VALIDATE-FRAMEWORK-MISMATCH and AC-16 both key on it.

### decisions.md four-field entry shape
# SOURCE: docs/decisions.md:380-391

```markdown
## [2026-04-30] Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html

**Context:** ...
**Decision:** ...
**Reason:** ...
**Areas affected:** ...
```

Task 2 appends three new entries in this exact shape for D7, D6, and D3. Each entry starts with `## [2026-05-01]` and carries all four fields.

### api-reference.md ✅ implemented badge pattern
# SOURCE: docs/api-reference.md:38-41

```markdown
| `/relay-prd <description \| draft-path>` ✅ **implemented** | description, draft PRD markdown path, or no argument (opens with "What do you want to build?") | `PRPs/prds/<feature>.prd.md` with status `APPROVED`. ... |
| `/relay-plan <prd-path>` ✅ **implemented** | approved PRD ... | `PRPs/plans/...` ... |
```

Task 1 promotes the `/relay-execute` row in the Orchestrator table to `✅ **implemented**` using this same inline-badge pattern.

### documentation/reference/commands.html badge--done pattern
# SOURCE: documentation/reference/commands.html:41

```html
<h3 id="relay-prd"><code>/relay-prd</code> — interactive PRD authoring <span class="badge badge--done">implemented</span></h3>
```

Task 6 adds `<span class="badge badge--done">implemented</span>` to the `/relay-execute` heading in this exact form.

### documentation/roadmap/status.html badge--done table cell pattern
# SOURCE: documentation/roadmap/status.html:44-49

```html
<tr>
  <td>1</td>
  <td><strong>Foundation</strong></td>
  <td>Context-builder skill + decision-gate + decisions.md + anti-patterns.md + MCP validation</td>
  <td><span class="badge badge--done">done</span></td>
</tr>
```

Task 7 promotes the Phase 3 row from `badge--partial` to `badge--done` following this pattern.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/api-reference.md` | UPDATE | Promote `/relay-execute` to ✅ implemented with behavioral notes; promote project Phase 3 description |
| `docs/decisions.md` | UPDATE | Append three new [2026-05-01] entries: D7 dispatch model, D6 state-machine model, D3 retry-budget composition |
| `docs/context/architecture.md` | UPDATE | Phased rollout Phase 3 row promoted to shipped; new §"Orchestrator state machine" sub-section added |
| `documentation/changelog.html` | UPDATE | Rename Unreleased → v0.9.0 2026-05-01; add v0.9.0 block; add fresh empty Unreleased; Changed section names plugin.json bump (binding §7.5) |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Bump version 0.8.0 → 0.9.0 (binding §7.5 rule; same commit as changelog entry) |
| `documentation/reference/commands.html` | UPDATE | Add `badge--done` to `/relay-execute` heading; expand Notes kv-block with shipped behavioral details |
| `documentation/roadmap/status.html` | UPDATE | Promote project Phase 3 row from `badge--partial` to `badge--done` with full list of shipped pieces |

## NOT Building (Scope Limits)

- **New commands or agents** — this phase is documentation + manifest only; `plugins/relay/commands/relay-execute.md` was shipped in Phase 1 and is not touched here.
- **Multi-PRD orchestration documentation** — one PRD per `/relay-execute` invocation; cross-PRD coordination is out of scope per the PRD's "What We're NOT Building".
- **B7/B8 TDD integration documentation** — B7/B8 are unshipped; only the dead-code routing visibility note in the api-reference entry is appropriate.
- **/relay-worktree integration documentation** — separate future command per the 2026-04-19 surface decision.
- **/relay-pr integration documentation** — separate future command; api-reference already notes "surfaces a 'ready for PR' message".
- **Parallel phase orchestration documentation** — Could-item; MVP is strictly serial; no documentation warranted at this time.
- **Auto-commit flag documentation** — Could-item deferred to implementation.
- **`--from-phase <N>` resume flag documentation** — Could-item; idempotency via D6 state machine is sufficient for MVP.
- **`--dry-run` flag documentation** — Could-item.
- **Recovery from PARTIAL_D8_FAILURE or /relay-test-review CHANGES_REQUESTED** — documented in the command file (Phase 1); api-reference entry points there; no new documentation section needed.
- **Reopening APPROVED PRDs or plans** — out of scope per `docs/anti-patterns.md`; no PRD or plan mutations in this phase.

## Step-by-Step Tasks

### Task 1: UPDATE docs/api-reference.md

- **ACTION**: Promote the `/relay-execute` row in the Orchestrator table from an unimplemented placeholder to ✅ **implemented**. Add behavioral notes in the Output column covering: serial orchestration via PRD table state machine; inline command-protocol adoption via `Read`; two new orchestration-layer budgets (`max_plan_review_retries`, `max_orchestrator_minutes`); seven distinct HALT outcome codes; `orchestrator-run.json` audit artifact at `PRPs/reports/<feature>/`; idempotency on re-invocation. Also update the `## Commands (planned — not yet implemented)` heading: change it to `## Commands` and add `/relay-execute` ✅ to the summary description (it is now the capstone of project Phase 3). Update the "Planned" narrative paragraph at lines 117–128 to note that `/relay-execute` has shipped and the remaining pending pieces are the B7/B8 TDD pair and `/relay-pr`.
- **MIRROR**: `docs/api-reference.md:38-41` — ✅ **implemented** inline badge pattern in the Writer/Orchestrator table rows.
- **SATISFIES**: AC-A2 (api-reference shows /relay-execute as ✅ implemented with behavioral notes).
- **VALIDATE**: `grep -n "relay-execute.*implemented" C:/repos/PRPs-agentic-eng/docs/api-reference.md | grep "✅"` — must return at least one line showing the badge in the Orchestrator row.

### Task 2: UPDATE docs/decisions.md

- **ACTION**: Append three new `## [2026-05-01]` entries to `docs/decisions.md` immediately before the template comment at the end of the file. Each entry uses the canonical four-field shape (Context / Decision / Reason / Areas affected):
  1. **D7 — Dispatch model**: Context: orchestrator needs to sequence five downstream command protocols without duplicating their logic. Decision: inline command-protocol adoption via `Read` (LLM reads each command file and executes its protocol in the same conversation context). Reason: (a) sub-agent replication forks logic; (b) the manual-execution pattern relay's developer runs today IS this model formalized; (c) zero new agents, zero new logic. Areas affected: `/relay-execute` command, five referenced command files, future orchestrator evolution.
  2. **D6 — State machine**: Context: orchestrator needs a phase-state representation that enables idempotent re-entry without a separate state file. Decision: the source PRD's Implementation Phases table IS the state machine; Status cells (`pending`/`in-progress`/`complete`) are the canonical phase-state representation. Reason: the PRD table is already the canonical phase-state representation per plan-writer; idempotency follows naturally from re-reading the table on each invocation; trade-off vs Temporal-style event-sourced durable execution acknowledged. Areas affected: `/relay-execute` command, plan-writer back-fill discipline, future `/relay-execute` re-invocations.
  3. **D3 — Per-stage retry budget composition**: Context: orchestrator composes commands each with their own internal loop budget; needs to add orchestration-layer budgets without violating the per-stage budget contract. Decision: each downstream command owns its internal loop budget (`/relay-implement`: `max_implement_retries=3` + `max_implement_minutes=45`; `/relay-test`: `max_test_retries=3` + `max_test_minutes=30`); orchestrator adds exactly two new budgets at the orchestration layer: `max_plan_review_retries` and `max_orchestrator_minutes`; 0 forbidden for both; first-to-expire wins. Reason: per-stage budgets are authoritative within their stage; orchestrator budget is a session-level wall-clock; distinct outcome codes make the failing layer unambiguous. Areas affected: `/relay-execute` command, per-stage HALT codes, `orchestrator-run.json` schema.
- **MIRROR**: `docs/decisions.md:380-391` — canonical four-field entry shape (## [YYYY-MM-DD] Title / **Context:** / **Decision:** / **Reason:** / **Areas affected:**).
- **SATISFIES**: AC-A3 (decisions.md contains three new [2026-05-01] entries pinning D7, D6, D3).
- **VALIDATE**: `grep -c "\[2026-05-01\]" C:/repos/PRPs-agentic-eng/docs/decisions.md` — must return `3`.

### Task 3: UPDATE docs/context/architecture.md

- **ACTION**: Two surgical edits:
  (a) In the Phased rollout table (lines 124–135), update Phase 3 row: change the Status cell from `partial (PRD pair shipped v0.6.0; Plan pair shipped v0.7.0; Implementation pair shipped v0.8.0; reviewer-coherence-layer additive R-COH-* shipped 2026-04-28; Test Runner; B7/B8 TDD pair + /relay-execute orchestrator + /relay-pr still pending)` to `shipped (PRD pair v0.6.0; Plan pair v0.7.0; Implementation pair v0.8.0; reviewer-coherence-layer 2026-04-28; Test Runner; /relay-execute orchestrator v0.9.0; B7/B8 TDD pair + /relay-pr pending)`.
  (b) Add a new §"Orchestrator state machine" sub-section after the `## Command surface` section. The sub-section explains: the PRD's Implementation Phases table is the canonical state machine for `/relay-execute`; row Status cells (`pending`/`in-progress`/`complete`) are the authoritative phase-state; re-invocation is idempotent because the table is re-read on every invocation (D6); the orchestrator never maintains a separate state file; this is the lightweight Airflow-style idempotency-by-convention model appropriate for relay's single-developer scale.
- **MIRROR**: `docs/context/architecture.md:124-135` — Phased rollout table row format; `docs/context/architecture.md:104-119` — Command surface section prose format.
- **SATISFIES**: AC-A4 (architecture.md Phased rollout shows Phase 3 as `shipped` and a new §"Orchestrator state machine" sub-section explains the D6 model).
- **VALIDATE**: `grep -n "shipped" C:/repos/PRPs-agentic-eng/docs/context/architecture.md | grep "Phase 3\|Orchestrator state machine\|relay-execute"` — must return at least two lines confirming Phase 3 promoted and new sub-section added.

### Task 4: UPDATE documentation/changelog.html

- **ACTION**: Three sub-edits following AGENTS.md §7 workflow for modifying an existing page (no new page, no NAV change, no search-index change needed — changelog is already registered):
  (a) Replace the current `<h2 id="unreleased">Unreleased</h2><p>No in-flight changes since the v0.8.0 cut on 2026-04-30. Future docs work accumulates here.</p>` block with a fresh empty Unreleased block followed immediately by the v0.9.0 block:
  ```html
  <h2 id="unreleased">Unreleased</h2>
  <p>No in-flight changes since the v0.9.0 cut on 2026-05-01. Future docs work accumulates here.</p>

  <h2 id="v0-9-0">0.9.0 — 2026-05-01</h2>
  ```
  (b) Write the v0.9.0 prose paragraph describing the capstone: `/relay-execute` orchestrator command shipped — serial multi-phase orchestration using inline `Read`-based command-protocol adoption (D7); source PRD's Implementation Phases table as the state machine (D6); two new orchestration-layer budgets `max_plan_review_retries` + `max_orchestrator_minutes` (D3); seven distinct HALT outcome codes; `orchestrator-run.json` audit artifact; idempotency on re-invocation. First release cut after the §7.5 plugin manifest version-sync rule was codified (commit 26860fc 2026-04-30); plugin.json bumped from 0.8.0 → 0.9.0 in this same commit.
  (c) Add `<h3 id="v0-9-0-added">Added</h3>` and `<h3 id="v0-9-0-changed">Changed</h3>` sub-sections. The `Changed` section MUST include the §7.5-mandated plugin.json bump `<li>` verbatim (substituting `0.8.0` → `0.9.0`). Also include `<li>` entries for `docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`, `documentation/reference/commands.html`, `documentation/roadmap/status.html` in the `Changed` section. The `Added` section lists the three new `docs/decisions.md` D7/D6/D3 entries and the new `docs/context/architecture.md` §"Orchestrator state machine" sub-section.
- **MIRROR**: `documentation/changelog.html:35-60` — v0.8.0 block HTML structure (h2 id, prose paragraph, h3 Added/Changed, ul/li shape). `documentation/AGENTS.md:360-366` — §7.5 binding plugin.json `<li>` template.
- **SATISFIES**: AC-A1 (§7.5 Changed entry naming the plugin.json bump) and AC-A5 (changelog v0.9.0 block with Added + Changed sub-sections; Unreleased reset).
- **VALIDATE**: `grep -n "v0-9-0\|0\.9\.0" C:/repos/PRPs-agentic-eng/documentation/changelog.html` — must return lines showing the `id="v0-9-0"` heading and `0.9.0` version string. Also: `grep -c "plugin\.json.*0\.8\.0.*0\.9\.0\|0\.8\.0.*rarr.*0\.9\.0" C:/repos/PRPs-agentic-eng/documentation/changelog.html` — must return 1 (the §7.5 mandated Changed line).

### Task 5: UPDATE plugins/relay/.claude-plugin/plugin.json

- **ACTION**: Change `"version": "0.8.0"` to `"version": "0.9.0"`. This is the binding §7.5 rule application: the same commit that adds the v0.9.0 changelog entry (Task 4) must also bump this field. No other fields are modified.
- **MIRROR**: `plugins/relay/.claude-plugin/plugin.json:1-9` — current JSON structure; only the version string value changes.
- **SATISFIES**: AC-A1 (binding §7.5 plugin manifest bump 0.8.0 → 0.9.0 in the same commit as the changelog v0.9.0 cut).
- **VALIDATE**: `grep -c '"version": "0.9.0"' C:/repos/PRPs-agentic-eng/plugins/relay/.claude-plugin/plugin.json` — must return `1`.

### Task 6: UPDATE documentation/reference/commands.html

- **ACTION**: Two sub-edits to the `/relay-execute` entry:
  (a) Add `<span class="badge badge--done">implemented</span>` to the `<h3 id="relay-execute">` heading line, making it: `<h3 id="relay-execute"><code>/relay-execute &lt;prd-path&gt;</code> <span class="badge badge--done">implemented</span></h3>`.
  (b) Expand the `<dt>Notes</dt><dd>...</dd>` kv-block with shipped behavioral details: inline `Read`-based command-protocol adoption (no sub-agents; zero logic duplication; D7); source PRD's Implementation Phases table as state machine (idempotency; D6); two orchestration-layer budgets `max_plan_review_retries` + `max_orchestrator_minutes`; seven distinct HALT outcome codes (`FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`, `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`, `FAILED_TEST_REVIEW_REJECTED`, plus four propagated from `/relay-implement` + one from `/relay-test`); `orchestrator-run.json` audit artifact at `PRPs/reports/<feature>/`; TDD routing dead-code note (B7/B8 unshipped; D5 routing decision reserved); name distinct from `/relay-implement` to avoid collision.
- **MIRROR**: `documentation/reference/commands.html:41` — `badge--done` badge inline in the `<h3>` heading. `documentation/reference/commands.html:82-93` — `/relay-implement` kv-block structure for rich Notes content.
- **SATISFIES**: AC-A7 (commands.html shows badge--done on /relay-execute heading; Notes block carries shipped behavioral details).
- **VALIDATE**: `grep -n "badge--done.*implemented" C:/repos/PRPs-agentic-eng/documentation/reference/commands.html | grep "relay-execute"` — must return one line for the `/relay-execute` heading.

### Task 7: UPDATE documentation/roadmap/status.html

- **ACTION**: In the project-level phases table, update the Phase 3 row:
  (a) Change the Status cell from `<span class="badge badge--partial">partial</span>` to `<span class="badge badge--done">done</span>`.
  (b) Update the Scope cell annotation to: `Orchestrator — single <code>/relay-execute</code> command driving the full pipeline from approved PRD to PR. Shipped: PRD authoring (<code>/relay-prd</code>, v0.6.0); Plan authoring (<code>/relay-plan</code> + <code>/relay-plan-review</code>, v0.7.0); Implementation authoring (<code>/relay-implement</code> + <code>/relay-code-review</code>, v0.8.0); reviewer-coherence-layer R-COH-* additive layer (2026-04-28); <code>/relay-execute</code> orchestrator (v0.9.0). Pending: B7/B8 TDD pair; <code>/relay-pr</code>.`
- **MIRROR**: `documentation/roadmap/status.html:44-49` — `badge--done` table cell pattern.
- **SATISFIES**: AC-A8 (status.html shows project Phase 3 row with badge--done and updated Scope listing all shipped pieces including /relay-execute v0.9.0).
- **VALIDATE**: `grep -n "badge--done.*done" C:/repos/PRPs-agentic-eng/documentation/roadmap/status.html | head -5` — must include the Phase 3 row promotion.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Confirm plugin.json is valid JSON and version field is 0.9.0
python3 -c "import json,sys; d=json.load(open('C:/repos/PRPs-agentic-eng/plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.9.0', f'Got {d[\"version\"]}'; print('plugin.json version OK')"

# Confirm all modified .md files are parseable (no truncation)
python3 -c "
for f in ['C:/repos/PRPs-agentic-eng/docs/api-reference.md','C:/repos/PRPs-agentic-eng/docs/decisions.md','C:/repos/PRPs-agentic-eng/docs/context/architecture.md']:
    txt = open(f).read()
    assert len(txt) > 100, f'{f} looks truncated'
    print(f'{f}: OK ({len(txt)} bytes)')
"

# Confirm changelog HTML is well-formed (has both v0-9-0 and v0-8-0 anchors)
grep -c 'id="v0-9-0"\|id="v0-8-0"' C:/repos/PRPs-agentic-eng/documentation/changelog.html
```

### Level 2 — CONTENT_INVARIANTS

```bash
# AC-16: plugin.json version must be 0.9.0
grep -c '"version": "0.9.0"' C:/repos/PRPs-agentic-eng/plugins/relay/.claude-plugin/plugin.json

# §7.5 binding Changed entry must name plugin.json bump 0.8.0 → 0.9.0
grep -c "plugin\.json\|0\.8\.0\|0\.9\.0" C:/repos/PRPs-agentic-eng/documentation/changelog.html

# /relay-execute must appear with implemented badge in api-reference
grep -c "relay-execute.*implemented\|✅.*relay-execute" C:/repos/PRPs-agentic-eng/docs/api-reference.md

# Three new decisions entries for 2026-05-01 must exist
grep -c "\[2026-05-01\]" C:/repos/PRPs-agentic-eng/docs/decisions.md

# D7, D6, D3 keywords must appear in decisions.md
grep -c "Dispatch model\|dispatch model" C:/repos/PRPs-agentic-eng/docs/decisions.md
grep -c "State machine\|state machine" C:/repos/PRPs-agentic-eng/docs/decisions.md
grep -c "retry-budget composition\|retry budget composition" C:/repos/PRPs-agentic-eng/docs/decisions.md

# Orchestrator state machine sub-section must exist in architecture.md
grep -c "Orchestrator state machine" C:/repos/PRPs-agentic-eng/docs/context/architecture.md

# Phase 3 promoted in architecture.md
grep -c "shipped.*relay-execute\|relay-execute.*v0\.9\.0" C:/repos/PRPs-agentic-eng/docs/context/architecture.md

# badge--done for relay-execute in commands.html
grep -c "relay-execute.*badge--done\|badge--done.*relay-execute" C:/repos/PRPs-agentic-eng/documentation/reference/commands.html

# Phase 3 badge--done in status.html
python3 -c "
import re
txt = open('C:/repos/PRPs-agentic-eng/documentation/roadmap/status.html').read()
# Find phase 3 row and confirm badge--done
m = re.search(r'<td>3</td>.*?badge--(\w+)', txt, re.DOTALL)
assert m and m.group(1)=='done', f'Phase 3 badge is {m.group(1) if m else \"not found\"}'
print('Phase 3 badge: done OK')
"
```

### Level 3 — INTEGRATION (dry-run consistency check)

```bash
# Verify plugin.json version matches the changelog's most recent versioned h2
python3 -c "
import json, re
plugin_ver = json.load(open('C:/repos/PRPs-agentic-eng/plugins/relay/.claude-plugin/plugin.json'))['version']
changelog = open('C:/repos/PRPs-agentic-eng/documentation/changelog.html').read()
# Find first versioned h2 (not 'unreleased')
m = re.search(r'<h2 id=\"v[\d-]+\">([\d.]+) —', changelog)
changelog_ver = m.group(1) if m else 'not found'
assert plugin_ver == changelog_ver, f'Drift: plugin.json={plugin_ver}, changelog={changelog_ver}'
print(f'Version sync OK: both are {plugin_ver}')
"

# Verify no .claude/ references introduced in any edited docs file
grep -rn "\.claude/PRPs" \
  C:/repos/PRPs-agentic-eng/docs/api-reference.md \
  C:/repos/PRPs-agentic-eng/docs/decisions.md \
  C:/repos/PRPs-agentic-eng/docs/context/architecture.md \
  && echo "FAIL: .claude/PRPs reference found" || echo "OK: no .claude/PRPs references"

# Verify the three decisions entries have all four required fields
python3 -c "
import re
txt = open('C:/repos/PRPs-agentic-eng/docs/decisions.md').read()
entries_2026_05 = [m.start() for m in re.finditer(r'## \[2026-05-01\]', txt)]
assert len(entries_2026_05) == 3, f'Expected 3 entries, found {len(entries_2026_05)}'
for pos in entries_2026_05:
    chunk = txt[pos:pos+800]
    for field in ['**Context:**', '**Decision:**', '**Reason:**', '**Areas affected:**']:
        assert field in chunk, f'Missing {field} in entry at pos {pos}'
print('All three decisions entries have four required fields')
"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-16):** When the v0.9.0 changelog entry is added in `documentation/changelog.html` and the same commit is inspected, `plugins/relay/.claude-plugin/plugin.json`'s `version` field equals `"0.9.0"` (bumped from `"0.8.0"`); the changelog `Changed` section contains the §7.5-mandated `<li>` naming the plugin.json bump from `0.8.0` → `0.9.0` with the exact wording from the §7.5 HTML template in `documentation/AGENTS.md:360-366`.

- **AC-A2 (PRD AC-16; PRD Phase Details §Phase 3 success signal):** `docs/api-reference.md` shows `/relay-execute` as ✅ implemented in the Orchestrator table section, with behavioral notes covering the dispatch model (inline `Read`), orchestration budgets, HALT outcome codes, and audit artifact path.

- **AC-A3 (PRD AC-16; PRD Phase Details §Phase 3 success signal):** `docs/decisions.md` contains three new `[2026-05-01]` entries recording: (a) D7 dispatch model (inline command-protocol adoption via `Read`), (b) D6 state-machine model (source PRD's Implementation Phases table IS the state machine), (c) D3 retry-budget composition (each downstream command owns its internal loop budget; orchestrator adds `max_plan_review_retries` + `max_orchestrator_minutes`). Each entry follows the canonical four-field shape (Context / Decision / Reason / Areas affected).

- **AC-A4 (PRD AC-16; PRD Phase Details §Phase 3 success signal):** `docs/context/architecture.md`'s Phased rollout table shows project Phase 3 as `shipped` (not `partial`), naming `/relay-execute` v0.9.0 among the shipped pieces; a §"Orchestrator state machine" sub-section exists explaining the D6 source-PRD-table-as-state model and its idempotency guarantee.

- **AC-A5 (PRD AC-16; PRD Phase Details §Phase 3 scope):** `documentation/changelog.html` contains a `<h2 id="v0-9-0">0.9.0 — 2026-05-01</h2>` block with at minimum an `Added` sub-section (new decisions entries, new architecture sub-section) and a `Changed` sub-section (api-reference, decisions.md, architecture.md, commands.html, status.html, plugin.json); the `Unreleased` block is reset to "No in-flight changes since the v0.9.0 cut".

- **AC-A6 (PRD AC-8; PRD Phase Details §Phase 3 scope):** No artifact written in this phase resolves under `.claude/`; all paths are under `docs/`, `documentation/`, or `plugins/relay/.claude-plugin/`.

- **AC-A7 (PRD AC-16; PRD Phase Details §Phase 3 scope — optional items):** `documentation/reference/commands.html` shows `<span class="badge badge--done">implemented</span>` on the `/relay-execute` heading and its `Notes` kv-block includes behavioral details matching the shipped command (inline Read dispatch, two orchestration budgets, seven HALT codes, orchestrator-run.json audit path).

- **AC-A8 (PRD AC-16; PRD Phase Details §Phase 3 scope — optional items):** `documentation/roadmap/status.html` shows project Phase 3 row with `badge--done` status and an updated Scope annotation listing all shipped pieces including `/relay-execute` v0.9.0, with B7/B8 TDD pair and `/relay-pr` noted as still pending.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| §7.5 binding rule missed — changelog written without plugin.json bump, or in separate commits | M | High — cache drift repeats the v0.8.0 back-fill scenario; users miss newly-shipped `/relay-execute` command | Task 5 (plugin.json bump) is listed as a separate atomic task but the Level 3 integration check (python3 version-sync assertion) explicitly verifies the two values match; the VALIDATE command for Task 4 also checks for the §7.5 `<li>` in the changelog |
| Changelog HTML structure broken by imprecise Edit — e.g., inserting v0.9.0 block inside v0.8.0 block | L | High — page renders incorrectly; changelog history corrupted | Task 4 replaces the exact Unreleased block verbatim (full `old_string` match); the Level 1 static analysis check confirms both `id="v0-9-0"` and `id="v0-8-0"` anchors are present after the edit |
| decisions.md entries missing one of the four required fields (Context / Decision / Reason / Areas affected) | L | Medium — future agents consulting the gate find incomplete entries | Level 3 integration check (python3) iterates all three [2026-05-01] entries and asserts all four fields are present |
| api-reference.md heading still says "planned — not yet implemented" after the edit | L | Medium — readers see outdated status; plan-reviewer R-COH-MANDATORY-READING-MISSING may flag | Task 1 VALIDATE greps for the ✅ badge in the relay-execute row; Level 2 content invariant check also asserts this |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Validation discipline for documentation-only phases:** This phase has no compiled code; "tests" are `grep`-style content assertions on the produced documentation files. All Level 1–3 validation commands above use `grep` or `python3` one-liners that are runnable without any build step. This matches the relay repo's "no build, lint, or test commands — the plugin has no source code to compile" constraint from `CLAUDE.md`.

**Same-commit discipline:** AC-16 and the §7.5 binding rule require the plugin.json bump (Task 5) and the changelog v0.9.0 entry (Task 4) to land in the same git commit. The developer executing this plan should perform all seven tasks in order and commit the entire changeset at once. The Level 3 integration validation (version-sync assertion) is the final gate before committing.

**documentation/ edit workflow:** Per `documentation/AGENTS.md` §7.4, every change to `documentation/` must include a changelog entry. Tasks 4, 6, and 7 satisfy this requirement; the v0.9.0 block in Task 4 lists all `documentation/` changes.

**No new pages, no NAV change, no search-index change:** All `documentation/` edits in this phase are content updates to existing pages (`changelog.html`, `reference/commands.html`, `roadmap/status.html`). The three-file registration rule (NAV + search index + changelog) does not apply when no new pages are introduced. The changelog entry alone (Task 4) satisfies the §7.4 logging requirement.

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Implemented: 2026-05-01*
*Status: IMPLEMENTED*
