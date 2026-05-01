# Feature: Docs updates (Phase 5 of implementation-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting docs maintenance (api-reference + decisions + architecture + changelog + 3 documentation/ pages); final phase of implementation-authoring; depends on Phases 1–4 (all complete); zero new behavior introduced — this phase publishes the contracts shipped by prior phases
- Decisions found:
  - [2026-04-19] Documentation/ site changes are governed by documentation/AGENTS.md as a binding contract; modifying-existing-page workflow (§9) requires only a changelog entry, not the full three-file registration of §6.
  - [2026-04-19] Plugin-level docs (docs/) and site-level docs (documentation/) are versioned separately; the changelog at documentation/changelog.html tracks the site-level surface.
  - Phase 6 of plan-authoring.prd.md (shipped 2026-04-25, plan archived at PRPs/plans/completed/plan-authoring-phase-6-docs-updates.plan.md) is the canonical precedent for a docs-update final phase: it landed v0.7.0 with api-reference promotions, two reference-page badge updates, status.html partial-progression, and a single changelog entry. Phase 5 here mirrors that shape.
  - Source PRD `PRPs/prds/implementation-authoring.prd.md` Implementation Phases row 5 description scope (api-reference promotion + decisions log entries + architecture path additions + documentation/changelog.html v0.8.0).
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — not applicable to docs work but enforced as a universal invariant; the new decisions log entries and architecture rows publish this rule explicitly for `PRPs/plans/completed/` and the new `phase-<N>/attempts/<i>/` path.
  - Modifying documentation/ without a changelog entry (AGENTS.md §6.3 + §9 mandate) — Phase 5 explicitly adds the v0.8.0 entry.
  - Adding new NAV / search index entries when no new pages are created (AGENTS.md §6 — three-file rule applies only to page adds; §9 applies to existing-page edits).
- Applicable architectural rules:
  - documentation/ binding contract (AGENTS.md): modifying existing pages requires a changelog entry; no NAV / search index update; no new CSS files; no inline `<style>`; no emojis; relative paths only.
  - PRPs/ artifact path convention: the new decisions log entries and the architecture.md row codify `PRPs/plans/completed/` as the canonical archive path and `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch` as the canonical per-attempt artifact path.
  - Three-pillar architecture: Pillar 2 (Implementation) reaches another shipped milestone with this v0.8.0 release.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/implementation-authoring.prd.md` — Implementation Phases row 5: "Docs updates" — Goal: Publish the contract changes the rest of the docs depend on. Scope: `docs/api-reference.md` (mark `/relay-implement` and `/relay-code-review` as ✅ implemented + agent rows for `implementer` + `code-reviewer`); `docs/decisions.md` (decisions worth pinning); `docs/context/architecture.md` if `PRPs/plans/completed/` and `phase-<N>/attempts/` paths need anchoring; `documentation/changelog.html` v0.8.0 entry per the binding `documentation/AGENTS.md` contract. Success signal: api-reference and reference pages show the two new agents and two commands with their paths and roles; changelog renders the v0.8.0 entry; no internal links broken; site renders cleanly.

## Summary

Surgical edits to seven existing documentation files to publish the contracts shipped by Phases 1–4 of `implementation-authoring`. No new files are created, no new pages are added, no NAV / search index updates are required (per `documentation/AGENTS.md` §9 — modifying-existing-page workflow needs only a changelog entry). The plan covers four plugin-level edits (`docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`) plus four site-level edits (`documentation/changelog.html` cutting v0.8.0; optional but-recommended `documentation/reference/commands.html` + `documentation/reference/agents.html` badge promotions; optional but-recommended `documentation/roadmap/status.html` Plugin-artifacts list refresh). The structural precedent is Phase 6 of `plan-authoring.prd.md` (the analogous final docs phase that landed v0.7.0 on 2026-04-25). The cumulative diff against the base commit will show only existing-file UPDATEs — zero new files in `docs/` or `documentation/`. The cleanest interpretation of the changelog cut: rename the current `<h2 id="unreleased">Unreleased</h2>` block to `<h2 id="v0-8-0">0.8.0 — 2026-04-30</h2>` (folding any unreleased reviewer-coherence-layer entries into the same release if they're at a stable point) and add the implementation-authoring entries beneath, then insert a fresh empty `Unreleased` block at the top — Keep-a-Changelog cut-a-release semantics. The implementer decides between this fold-cut and a separate-0.8.0-below-Unreleased approach at write time based on the actual Unreleased block contents.

## User Story

As a relay developer (or a future user installing the plugin) reading `docs/api-reference.md`, I want to see `/relay-implement` and `/relay-code-review` marked ✅ implemented with their full behavioral notes, the `implementer` and `code-reviewer` agents listed in the Implemented table, the new `PRPs/plans/completed/` and `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch` paths anchored in `docs/context/architecture.md`, the rationale for each shipped decision pinned in `docs/decisions.md`, and a `documentation/changelog.html` v0.8.0 entry naming what shipped, so that the public surface of the plugin matches what the code actually does and so that the next consumer (developer or LLM) can reason about the system without re-deriving context.

## Problem Statement

Phases 1–4 of `implementation-authoring` shipped functional code (two new agents, two new commands) but the public-facing documentation does not yet reflect these contracts:

- `docs/api-reference.md` lines 41 + 49 still list `/relay-implement` and `/relay-code-review` as planned.
- `docs/api-reference.md` lines 116–123 still list `Implementer` and `Code Reviewer` in the Planned narrative; the Implemented Agents table at lines 108–113 has no entries for the two new agents.
- `docs/decisions.md` ends at line 344 (with closing template comment); no entries codify the implementer's open `Bash` + project-allowlist gate, the code-reviewer's no-`Edit` divergence from `plan-reviewer`, the D8 best-effort-atomic discipline, the `PRPs/plans/completed/` archive path, or the `phase-<N>/attempts/<i>/diff.patch` per-attempt artifact path.
- `docs/context/architecture.md` lines 87–94 (PRP artifact paths) lack a `PRPs/plans/completed/` row and the `PRPs/reports/<feature>/` row's description omits the `phase-<N>/attempts/<i>/diff.patch` subpath.
- `docs/context/architecture.md` lines 129–130 (Phased rollout) still show Phase 3 as "not started" — stale relative to v0.6.0 (PRD pair) + v0.7.0 (Plan pair) + this pending v0.8.0 (Implementation pair).
- `documentation/changelog.html` lacks a v0.8.0 entry; the current latest is v0.7.2 (2026-04-28); the Unreleased block already contains reviewer-coherence-layer phases.
- `documentation/reference/commands.html` rows for `/relay-implement` and `/relay-code-review` lack `badge--done` markers.
- `documentation/reference/agents.html` Planned table still lists `implementer` (the `code-reviewer` row was already shipped via reviewer-coherence-layer Phase 3 docs).
- `documentation/roadmap/status.html` "Plugin artifacts" list is stale (missing the entire plan-authoring + implementation-authoring stacks).

Without Phase 5, a developer reading the public surface cannot tell what the plugin actually does; the orchestrator (when built) will generate broken cross-references; future PRDs will cite stale contracts.

## Solution Statement

Apply seven surgical UPDATE edits, one per file. Each edit is small in scope (a few lines added or modified per file); the cumulative diff is well-bounded and trivially reviewable. The plan-template anchors are: api-reference.md modeled on Phase 6 of `plan-authoring.prd.md`'s shipped output (which promoted `/relay-plan` + `/relay-plan-review` and added 4 agent rows on 2026-04-25); decisions.md modeled on the four-field shape (Context / Decision / Reason / Areas affected) used by all existing entries with date headers `[YYYY-MM-DD]`; architecture.md modeled on the existing two-table shape; changelog.html modeled on the v0.6.0 + v0.7.0 entries (Added/Changed sections per Keep-a-Changelog); reference/commands.html + reference/agents.html modeled on the existing `badge--done` markers for `/relay-prd` (commands.html line 41) and the existing shipped section for `prd-writer` (agents.html); roadmap/status.html modeled on its current "What's shipped" / "What's next" structure. No new files, no new directories, no new pages — purely existing-page edits per `documentation/AGENTS.md` §9.

## Metadata

| Field | Value |
|-------|-------|
| Type | Multi-file documentation UPDATE (markdown + HTML; no new files) |
| Complexity | Low-Medium — surgical edits only; no new logic; no new pages; no new NAV / search index entries; relatively many distinct edit points across 7 files but each edit point is small (1–20 lines) |
| Systems Affected | Plugin-level docs (`docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`); site-level docs (`documentation/changelog.html`, `documentation/reference/commands.html`, `documentation/reference/agents.html`, `documentation/roadmap/status.html`); future readers (developers, LLM agents, the orchestrator's cross-reference logic). |
| Dependencies | Phases 1–4 of implementation-authoring (all complete) — Phase 5 publishes the contracts those phases shipped. |
| Estimated Tasks | 7 atomic tasks (one per file edit) |
| Source PRD line ref | `PRPs/prds/implementation-authoring.prd.md` Implementation Phases row 5 (around line 262) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| HIGH | `PRPs/plans/completed/plan-authoring-phase-6-docs-updates.plan.md` | (whole) | Canonical precedent for a docs-update final phase. Plan-authoring's Phase 6 shipped v0.7.0 on 2026-04-25 with the same shape: api-reference promotion + decisions row + architecture refinement + changelog entry + commands.html/agents.html badge promotions + status.html partial-progression. Mirror byte-for-byte where possible. |
| HIGH | `docs/api-reference.md` | 38–123 | Full implemented + planned tables for commands and agents; locate the exact rows to promote (lines 41, 49) + the exact insertion point for new agent rows (after line 113) + the Planned narrative to update (lines 116–123). |
| HIGH | `docs/decisions.md` | 270–344 | Most recent entries are the structural model for new entry shape (especially [2026-04-25] at lines 280–285 — Plan filenames carry source PRD phase number and slug). The closing template comment at line 335–344 marks the insertion boundary. |
| HIGH | `docs/context/architecture.md` | 84–135 | §"PRP artifact paths" table at lines 87–94 (missing `PRPs/plans/completed/` row); §"Phased rollout" table at lines 125–131 (Phase 3 stale at "not started"). |
| HIGH | `documentation/AGENTS.md` | 30–355 | Binding contract. Especially §6 (three-file registration rule for new pages — NOT applicable to Phase 5 since no new pages); §7 (changelog conventions); §9 (modifying existing pages — applicable; only changelog entry required). |
| HIGH | `documentation/changelog.html` | 24–62 | Top of changelog showing newest-at-top convention + Unreleased block + v0.7.2 (2026-04-28) as the most recent version. Implementer must decide at write time whether to cut Unreleased + implementation-authoring as v0.8.0 or add a separate 0.8.0 below the existing Unreleased block. |
| HIGH | `documentation/reference/commands.html` | 41, 82–93, 117–127 | Existing `badge--done` "implemented" patterns (line 41 for `/relay-prd`; line 127 for `/relay-test-review`); the rows for `/relay-implement` (lines 82–93) and `/relay-code-review` (lines 117–125) lack badges and need promotion. |
| HIGH | `documentation/reference/agents.html` | 239, 352–360 | Existing shipped section for `code-reviewer` (line 239 — already shipped via reviewer-coherence-layer Phase 3 docs); Planned table at lines 352–360 still has `implementer` (line 355) — must be removed and a new shipped section added matching the prd-writer / plan-writer / code-reviewer shape. |
| HIGH | `documentation/roadmap/status.html` | 148–152 | "What's shipped > Plugin artifacts" list is stale — missing plan-writer, plan-reviewer, relay-plan.md, relay-plan-review.md, implementer, code-reviewer, relay-implement.md, relay-code-review.md. Phase 5 refreshes this list. |
| MEDIUM | `PRPs/prds/plan-authoring.prd.md` | 568–595 | Plan-authoring PRD's Phase 6 success-signal documentation — the precedent prose for what "publish contracts" means. |
| MEDIUM | `docs/anti-patterns.md` | 60–66 | The "no `.claude/` writes" rule is the basis for one of the new decision entries (`PRPs/plans/completed/` is the relay equivalent of prp-core's `.claude/PRPs/plans/completed/`). |
| LOW | `keepachangelog.com/en/1.1.0/` | — | Convention reference for Added/Changed/Deprecated/Removed/Fixed section ordering within version blocks. (Not strictly needed — existing v0.6.0/v0.7.0 entries already follow it.) |

## Patterns to Mirror

### api-reference.md command-row promotion shape

# SOURCE: docs/api-reference.md:38
```
| `/relay-prd <description \| draft-path>` ✅ **implemented** | description, draft PRD markdown path, or no argument (opens with "What do you want to build?") | `PRPs/prds/<feature>.prd.md` with status `APPROVED`. Interactive — runs the 6-phase Q&A loop with the user, invokes `research-web` + `research-codebase` subagents during GROUNDING, hands off to the `prd-reviewer` agent for the DRAFT→APPROVED flip. ... See `PRPs/prds/prd-authoring.prd.md`. |
```

Used by Task 1 (api-reference promotion): the `/relay-implement` and `/relay-code-review` rows take the same `✅ **implemented**` badge format with expanded behavioral notes ending with `See PRPs/prds/implementation-authoring.prd.md.`

### api-reference.md Implemented Agents row shape

# SOURCE: docs/api-reference.md:113
```
| `research-codebase` ✅ | `plugins/relay/agents/research-codebase.md` | `prd-writer` (Phase 3 GROUNDING; reusable by future relay agents) | Bounded local-codebase research via `Glob`, `Grep`, `Read`. Caps: 5 ops, 25 files, 8 findings. Same JSON return shape as `research-web` but with `path:line` sources. Read-only; never modifies files. |
```

Used by Task 1: insert `implementer` and `code-reviewer` rows after this line, with the agent-name + path + invoked-by + role-description column shape.

### decisions.md entry shape (most recent)

# SOURCE: docs/decisions.md:279-285
```
## [2026-04-25] Plan filenames carry the source PRD phase number and slug

**Context:** ...
**Decision:** ...
**Reason:** ...
**Areas affected:** ...
```

Used by Task 2: each new 2026-04-30 entry follows this four-field shape (Context / Decision / Reason / Areas affected) with a date-prefixed `## [2026-04-30]` heading and a trailing `---` separator before the next entry.

### architecture.md PRP artifact paths row shape

# SOURCE: docs/context/architecture.md:89-91
```
| `PRPs/prds/<feature>.prd.md` | PRDs (written by PRD Writer, approved by PRD Reviewer) |
| `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | Implementation plans, one per PRD phase (`plan-writer` writes DRAFT; `plan-reviewer` flips to APPROVED). Per-phase pattern recorded in `docs/decisions.md` 2026-04-25. |
| `PRPs/reports/<feature>/` | Test Runner execution reports, attempts log, per-attempt diffs, final report; when TDD is active, also `tdd-initial-suite.diff` and `tdd-reviews.md` |
```

Used by Task 3: add a fourth row for `PRPs/plans/completed/<basename>.plan.md` (archived plans after `/relay-implement` Mutation b); extend the third row's description to mention the new `phase-<N>/attempts/<i>/diff.patch` per-attempt path introduced by `/relay-implement`.

### changelog.html version-block shape

# SOURCE: documentation/changelog.html:62 (and surrounding 0.7.x entries)
```html
<h2 id="v0-7-2">0.7.2 — 2026-04-28</h2>

<h3>Added</h3>
<ul>
  <li>...</li>
</ul>

<h3>Changed</h3>
<ul>
  <li>...</li>
</ul>
```

Used by Task 4: emit a v0.8.0 block (`<h2 id="v0-8-0">0.8.0 — 2026-04-30</h2>`) following the canonical Added/Changed/Removed/Fixed ordering. Decide at write time whether to fold Unreleased into 0.8.0 (cut-a-release) or add a separate 0.8.0 below Unreleased.

### commands.html `badge--done` insertion

# SOURCE: documentation/reference/commands.html:41
```html
<h2 id="relay-prd">/relay-prd <span class="badge badge--done">implemented</span></h2>
```

Used by Task 5: add the same `<span class="badge badge--done">implemented</span>` to the `<h2 id="relay-implement">` (line 82) and `<h2 id="relay-code-review">` (line 117) headings.

### agents.html Implemented section shape

# SOURCE: documentation/reference/agents.html:239 (existing code-reviewer shipped section, from reviewer-coherence-layer Phase 3 docs)

Used by Task 6: add an analogous shipped section for `implementer` (the only agent missing from the Implemented set after reviewer-coherence-layer's docs landed). Match the existing prd-writer / plan-writer / code-reviewer section shape: section header with `<h3 id="agent-implementer">implementer <span class="badge badge--done">implemented</span></h3>`, file path, role, tool allowlist, dispatched-by command. Remove the line from the Planned table at line 355.

### status.html Plugin-artifacts list shape

# SOURCE: documentation/roadmap/status.html:148-152
Used by Task 7: refresh the "What's shipped > Plugin artifacts" list to include all currently-implemented agents (`prd-writer`, `prd-reviewer`, `research-web`, `research-codebase`, `plan-writer`, `plan-reviewer`, `implementer`, `code-reviewer`) and commands (`/relay-prd`, `/relay-plan`, `/relay-plan-review`, `/relay-test`, `/relay-test-review`, `/relay-implement`, `/relay-code-review`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/api-reference.md` | UPDATE | Promote `/relay-implement` + `/relay-code-review` to ✅ implemented; insert `implementer` + `code-reviewer` rows in Implemented Agents table; update Planned narrative to remove the implementer pair. |
| `docs/decisions.md` | UPDATE | Append five new [2026-04-30] decision entries codifying the implementer's `Bash` allowlist gate (D11), the code-reviewer's no-`Edit` divergence (D11), D8 best-effort-atomic mutations, the `PRPs/plans/completed/` archive path, and the `phase-<N>/attempts/<i>/diff.patch` per-attempt artifact path. |
| `docs/context/architecture.md` | UPDATE | Add `PRPs/plans/completed/` row to PRP artifact paths table; extend `PRPs/reports/` row description to mention the new `phase-<N>/attempts/<i>/diff.patch` path; update Phased rollout Phase 3 row from "not started" to "partial" with sub-status note. |
| `documentation/changelog.html` | UPDATE | Cut v0.8.0 release block (or rename Unreleased to 0.8.0); list shipped agents/commands under Added; list api-reference + decisions + architecture promotions under Changed. |
| `documentation/reference/commands.html` | UPDATE | Add `badge--done` "implemented" markers to `/relay-implement` and `/relay-code-review` headings; expand Notes blocks with shipped behavioral details. |
| `documentation/reference/agents.html` | UPDATE | Add a shipped section for `implementer` matching the existing `prd-writer` / `plan-writer` / `code-reviewer` shape; remove `implementer` from the Planned table. |
| `documentation/roadmap/status.html` | UPDATE | Refresh "What's shipped > Plugin artifacts" list to include all currently-shipped agents and commands across PRD, Plan, and Implementation pillars. |

## NOT Building (Scope Limits)

- **New pages in `documentation/`** — none required; AGENTS.md §6 three-file rule does not apply to Phase 5.
- **New decisions beyond the five identified** — Phase 5 publishes Phases 1–4's contracts; if new decisions emerge from dogfood (e.g., post-implementation telemetry), those are separate decision-log entries dated when the evidence lands.
- **Modifying `app.css` or `app.js` in documentation/** — no styling or runtime changes; AGENTS.md §2 hard constraint.
- **Modifying `documentation/AGENTS.md` itself** — Phase 5 is a consumer of the binding contract, not an editor of it.
- **Bumping the plugin manifest version** — the plugin version is tracked separately from the documentation/changelog.html surface (per documentation/AGENTS.md §7); Phase 5 updates the docs changelog only.
- **Cleaning up `documentation/changelog.html` historical entries** — only adding/cutting the new release; prior entries stay byte-identical.
- **Refactoring the `docs/api-reference.md` table structure** — inserting rows into existing tables only; no column rearrangement.
- **Promoting Phase 4 (Approval cycle) status** — `/relay-approve` is still placeholder; Phase 4 of the rollout stays "not started".
- **Documenting telemetry / dogfood metrics** — none collected yet; the success-metrics promises in source PRD are not yet measurable; Phase 5 publishes the contracts, not the operational data.

## Step-by-Step Tasks

### Task 1: UPDATE `docs/api-reference.md` — promote `/relay-implement` + `/relay-code-review` rows + insert `implementer` + `code-reviewer` agent rows + update Planned narrative

**ACTION**: Three sub-edits via `Edit` (each with a narrow `old_string`):

1. Edit row 41 (`/relay-implement` row): replace the current planned text with a `✅ **implemented**` row matching the `/relay-prd` precedent (line 38), with expanded behavioral notes covering: internal writer↔reviewer loop, per-attempt diff capture at `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch`, dual budget caps (`max_implement_retries=3`, `max_implement_minutes=45`, `max_disputes_per_session=2`), oscillation detection always-on, D8 post-approval mutations (plan flip + plan move to `PRPs/plans/completed/` + source PRD row N flip from `in-progress` to `complete`), and a `See PRPs/prds/implementation-authoring.prd.md.` reference.

2. Edit row 49 (`/relay-code-review` row): replace with `✅ **implemented**` row matching the `/relay-plan-review` precedent (line 47), with expanded behavioral notes covering: standalone single-shot dispatch of `code-reviewer` in `mode: 'standard'`, no internal loop, no D8 mutations (architectural divergence from `/relay-plan-review` documented), one verdict appended to `PRPs/plans/<basename>.code-review.jsonl`, accepts plans with `*Status: APPROVED*` or `*Status: IMPLEMENTED*`, and `See PRPs/prds/implementation-authoring.prd.md.` reference.

3. Edit lines 113–115: insert two new rows in the Implemented Agents table after `research-codebase ✅` (line 113), before the `### Planned` heading (line 115). Row shape: agent name with `✅`, file path, invoked-by command, role description. For `implementer`: invoked by `/relay-implement` command; role: autonomous plan-driven code writer with `TEST_CONTRACT_DISPUTE` escape valve; tool allowlist `Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash`. For `code-reviewer`: invoked by `/relay-implement` (internal dispatch) + `/relay-code-review` (standalone surface); role: three-layer rubric (R-S* / R-L* / R-SEM / R-X) + arbitration mode for disputes; read-only over the repo; `Write` only for `code-review.jsonl`.

4. Edit lines 116–123 (Planned narrative): remove `Implementer, Code Reviewer` from the planned-list and update the next-implementation-target pointer to reference the next planned PRD (or to "no next PRD pending — implementation-authoring complete" if no successor PRD exists at write time).

**MIRROR**: `docs/api-reference.md:38` (relay-prd promotion shape); `docs/api-reference.md:113` (Implemented Agents row shape); `PRPs/plans/completed/plan-authoring-phase-6-docs-updates.plan.md` (plan-authoring's analogous Phase 6 task — promoted /relay-plan + /relay-plan-review + 4 agents on 2026-04-25).

**VALIDATE**: `grep -cE "/relay-(implement|code-review).*✅" docs/api-reference.md` returns 2 (both promoted) AND `grep -E "^\| \`(implementer|code-reviewer)\` ✅" docs/api-reference.md | wc -l` returns 2 (both agent rows added) AND `grep -c "Implementer, Code Reviewer" docs/api-reference.md` returns 0 (Planned narrative cleaned).

### Task 2: UPDATE `docs/decisions.md` — append five new [2026-04-30] decision entries

**ACTION**: Single `Edit` with `old_string` matching the closing template comment at line 335 (`<!-- Template for future entries:` plus its closing `-->`), `new_string` = five new entries followed by the same closing template comment. Each entry follows the canonical four-field shape (Context / Decision / Reason / Areas affected) with `## [2026-04-30] <title>` heading and trailing `---` separator. The five entries:

1. **`## [2026-04-30] Implementer Bash tool allowlist gate (D11)`** — Context: implementer needs `Bash` to run plan VALIDATE commands; agent-level pattern allowlist would duplicate context-builder's project-level `.claude/settings.json` allowlist. Decision: implementer's frontmatter declares `Bash` (open at agent layer); the project's `.claude/settings.json` allowlist is the security gate per the 2026-04-19 narrow-patterns decision. Reason: avoids duplication; reuses existing security plumbing; matches `/relay-test`'s established pattern. Areas affected: implementer agent, `/relay-implement` command, project-level allowlist generation by context-builder.

2. **`## [2026-04-30] Code-reviewer agent has no Edit tool (D11 divergence from plan-reviewer)`** — Context: plan-reviewer has `Edit` to flip DRAFT→APPROVED status; code-reviewer must NOT have `Edit` because D8 mutations are exclusively the COMMAND's responsibility (specifically `/relay-implement`'s). Decision: code-reviewer's frontmatter tool allowlist is `Read, Write, Glob, Grep, Bash, BashOutput` — no `Edit`. `Write` is gated to `PRPs/plans/<basename>.code-review.jsonl` only. Reason: tool-level enforcement of the read-only review philosophy; prevents the agent from accidentally mutating plan or PRD even if its prompt drifted. Areas affected: code-reviewer agent, `/relay-implement` command, `/relay-code-review` command.

3. **`## [2026-04-30] D8 post-approval mutations are best-effort atomic with rollback note (no transactional WAL)`** — Context: `/relay-implement` performs three D8 mutations on APPROVED rubric (plan flip + plan move + PRD row update); a transactional WAL was considered but rejected. Decision: best-effort atomic — each mutation is attempted in order; on the first failure, partial state is captured to `PRPs/reports/<feature>/phase-<N>/halt.json` with structured `{mutations_attempted, mutations_succeeded, mutation_failed, error, manual_recovery_steps}` and an actionable rollback message; the command does NOT roll back successful mutations. Reason: WAL adds complexity without clear value for three-step filesystem mutations on a single repo; partial-state capture + manual recovery is sufficient and matches the "graceful degradation + no silent failures" architectural rule. Areas affected: `/relay-implement` command, plan trailing-block discipline, plan archive directory, source PRD Implementation Phases table back-fill.

4. **`## [2026-04-30] PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans`** — Context: prp-core uses `.claude/PRPs/plans/completed/` for plan archival; relay's no-`.claude/`-writes rule (2026-04-19) forbids that path. Decision: relay archives implemented plans at `PRPs/plans/completed/<basename>.plan.md`. The archive is performed by `/relay-implement` Mutation b after rubric APPROVED. Reason: aligns with relay's PRPs-at-repo-root convention; preserves the prp-core archive convention semantically while avoiding the `.claude/` permission-prompt failure mode. Areas affected: `/relay-implement` command, `docs/context/architecture.md` PRP artifact paths table, future `/relay-execute` orchestrator's state-machine bookkeeping.

5. **`## [2026-04-30] Per-attempt diff.patch artifact at PRPs/reports/<feature>/phase-<N>/attempts/<i>/`** — Context: `/relay-implement` runs an internal writer↔reviewer loop with up to 4 attempts; each attempt's cumulative diff vs base-commit must be auditable. Decision: after each attempt, the command captures `git diff <base-commit>` and writes it to `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch` along with a `record.json` containing `{attempt, verdict, files_changed, validation, base_commit}`. The `phase-<N>/` segment differs from Test Runner's flat `attempts/<N>/` layout because the implementer runs per-PRD-phase and multiple plans may exist for one feature. Reason: per-attempt diff capture is the audit trail for the loop; the `phase-<N>/` segment provides per-phase isolation; reuses the Test Runner C4 directory shape with one additional path tier. Areas affected: `/relay-implement` command, `docs/context/architecture.md` PRP artifact paths table, future Test Runner integration (downstream consumes the worktree state /relay-implement leaves behind), future `/relay-execute` orchestrator (composes both commands).

**MIRROR**: `docs/decisions.md:279-285` (most recent entry, [2026-04-25] Plan filenames, four-field shape).

**VALIDATE**: `grep -c "^## \[2026-04-30\] " docs/decisions.md` returns 5 (five new entries) AND `grep -c "^---$" docs/decisions.md` increments by ≥5 (each new entry has a trailing separator) AND the closing template comment block at the end of the file remains intact: `tail -10 docs/decisions.md | grep -c "Template for future entries"` returns 1.

### Task 3: UPDATE `docs/context/architecture.md` — add PRPs/plans/completed/ row + extend PRPs/reports/ description + update Phased rollout

**ACTION**: Two `Edit`s:

1. Edit lines 87–94 (PRP artifact paths table):
   - Add a new row after the `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` row: `| `PRPs/plans/completed/<basename>.plan.md` | Archived implementation plans after `/relay-implement` reaches APPROVED rubric (Mutation b of D8). Recorded in `docs/decisions.md` 2026-04-30. |`
   - Extend the `PRPs/reports/<feature>/` row description to include: `; per-attempt diffs from /relay-implement at \`phase-<N>/attempts/<i>/diff.patch\` plus \`record.json\` (recorded in \`docs/decisions.md\` 2026-04-30)`.

2. Edit lines 129–130 (Phased rollout table):
   - Phase 3 row (`Agent orchestrator — single \`/relay-*\` command driving the pipeline`): change Status from `not started` to `partial` with note `(PRD pair shipped v0.6.0; Plan pair shipped v0.7.0; Implementation pair shipped v0.8.0; Test Runner shipped earlier; B7/B8 TDD pair + /relay-execute orchestrator + /relay-pr still pending)`.
   - Phase 4 row (`Approval cycle`): leave at `not started` (no Pillar 3 work shipped yet).

**MIRROR**: `docs/context/architecture.md:89-91` (existing PRP artifact paths row shape); `PRPs/plans/completed/plan-authoring-phase-6-docs-updates.plan.md` (plan-authoring Phase 6 architecture.md edits — added the per-phase plan path note on 2026-04-25).

**VALIDATE**: `grep -c "PRPs/plans/completed/" docs/context/architecture.md` returns ≥1 (new row present) AND `grep -c "phase-<N>/attempts" docs/context/architecture.md` returns ≥1 (per-attempt path noted) AND `grep "^| 3 |" docs/context/architecture.md | grep -c "partial"` returns 1 (Phase 3 promoted from "not started").

### Task 4: UPDATE `documentation/changelog.html` — cut v0.8.0 release block

**ACTION**: Single `Edit` with `old_string` matching the current `<h2 id="unreleased">Unreleased</h2>` heading line (or possibly the entire Unreleased block + its first sub-heading). Two acceptable strategies (implementer chooses at write time based on the actual Unreleased block contents):

**Strategy A (cut Unreleased as v0.8.0):** Replace `<h2 id="unreleased">Unreleased</h2>` with two headings — a fresh empty `<h2 id="unreleased">Unreleased</h2>` block at the top and a `<h2 id="v0-8-0">0.8.0 — 2026-04-30</h2>` block below containing the existing reviewer-coherence-layer entries (now versioned) plus new entries for implementation-authoring Phases 1–5. This is the cleanest cut-a-release flow per Keep-a-Changelog semantics.

**Strategy B (separate v0.8.0 below Unreleased):** Leave the Unreleased block as-is and insert a new `<h2 id="v0-8-0">0.8.0 — 2026-04-30</h2>` block between Unreleased (which retains reviewer-coherence-layer entries) and the v0.7.2 (2026-04-28) heading. The new 0.8.0 block contains only implementation-authoring entries.

Either strategy: the new 0.8.0 block contains:

```html
<h3>Added</h3>
<ul>
  <li><strong>implementer agent</strong> at <code>plugins/relay/agents/implementer.md</code> — autonomous plan-driven code writer with <code>TEST_CONTRACT_DISPUTE</code> escape valve. <a href="../../PRPs/prds/implementation-authoring.prd.md">implementation-authoring.prd.md</a>.</li>
  <li><strong>code-reviewer agent</strong> at <code>plugins/relay/agents/code-reviewer.md</code> — three-layer rubric (R-S* / R-L* / R-SEM / R-X) + arbitration mode; read-only over repo.</li>
  <li><strong>/relay-implement command</strong> at <code>plugins/relay/commands/relay-implement.md</code> — internal writer↔reviewer loop with bounded retries, wall-clock budget, oscillation detection, per-attempt diff capture, D8 post-approval mutations.</li>
  <li><strong>/relay-code-review command</strong> at <code>plugins/relay/commands/relay-code-review.md</code> — standalone single-shot reviewer surface (read-only; no D8 mutations).</li>
</ul>

<h3>Changed</h3>
<ul>
  <li><code>docs/api-reference.md</code> — <code>/relay-implement</code> and <code>/relay-code-review</code> rows promoted to ✅ implemented; <code>implementer</code> and <code>code-reviewer</code> rows added to Implemented Agents table; Planned narrative updated.</li>
  <li><code>docs/decisions.md</code> — five new 2026-04-30 entries: implementer Bash allowlist gate; code-reviewer no-Edit divergence; D8 best-effort-atomic mutations; <code>PRPs/plans/completed/</code> archive path; per-attempt <code>diff.patch</code> at <code>PRPs/reports/&lt;feature&gt;/phase-&lt;N&gt;/attempts/&lt;i&gt;/</code>.</li>
  <li><code>docs/context/architecture.md</code> — PRP artifact paths table extended with <code>PRPs/plans/completed/</code> row and the per-attempt diff path; Phased rollout Phase 3 promoted from "not started" to "partial".</li>
  <li><code>documentation/reference/commands.html</code> — <code>badge--done</code> "implemented" markers added to <code>/relay-implement</code> and <code>/relay-code-review</code> headings.</li>
  <li><code>documentation/reference/agents.html</code> — new shipped section for <code>implementer</code>; <code>implementer</code> removed from Planned table.</li>
  <li><code>documentation/roadmap/status.html</code> — "Plugin artifacts" list refreshed with all currently-shipped agents and commands across PRD, Plan, and Implementation pillars.</li>
</ul>
```

**MIRROR**: `documentation/changelog.html:62` (v0.7.2 heading); `documentation/changelog.html` v0.6.0 + v0.7.0 entries (the canonical Added/Changed sections shape).

**VALIDATE**: `grep -c "v0-8-0" documentation/changelog.html` returns ≥1 (new entry id present) AND `grep -c "0.8.0 — 2026-04-30" documentation/changelog.html` returns 1 (heading present) AND `grep -c "implementer agent" documentation/changelog.html` returns ≥1 (added entry present) AND no inline `<style>` introduced: `grep -c "<style>" documentation/changelog.html` is unchanged from before.

### Task 5: UPDATE `documentation/reference/commands.html` — add `badge--done` to `/relay-implement` and `/relay-code-review` headings + expand Notes

**ACTION**: Two `Edit`s:

1. Edit the `<h2 id="relay-implement">` heading (around line 82): add `<span class="badge badge--done">implemented</span>` after the heading text, matching the `/relay-prd` pattern at line 41. Optionally expand the immediately-following Notes block to cover: argument shape, the internal writer↔reviewer loop, dual budget caps, oscillation detection, per-attempt diff capture path, D8 post-approval mutations.

2. Edit the `<h2 id="relay-code-review">` heading (around line 117): add the same badge. Expand Notes to cover: argument shape, single-shot dispatch, no internal loop, no D8 mutations (architectural divergence from `/relay-plan-review`), accepts both APPROVED and IMPLEMENTED plans, `code-review.jsonl` audit log target.

**MIRROR**: `documentation/reference/commands.html:41` (`/relay-prd` badge insertion) + `:127` (`/relay-test-review` badge insertion).

**VALIDATE**: `grep -c 'id="relay-implement".*badge--done' documentation/reference/commands.html` returns 1 AND `grep -c 'id="relay-code-review".*badge--done' documentation/reference/commands.html` returns 1.

### Task 6: UPDATE `documentation/reference/agents.html` — add shipped section for `implementer` + remove from Planned table

**ACTION**: Two `Edit`s:

1. Add a new shipped section for `implementer` matching the existing `prd-writer` / `plan-writer` / `code-reviewer` shape. Section header `<h3 id="agent-implementer">implementer <span class="badge badge--done">implemented</span></h3>`; body covers: file path (`plugins/relay/agents/implementer.md`), color (green), tool allowlist (`Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash`), invoked-by (`/relay-implement` command), role (autonomous plan-driven code writer with `TEST_CONTRACT_DISPUTE` escape valve), key constraints (no `Task` — no re-grounding; the plan is the source of truth; D11). Insert at the appropriate location in the Implemented section (likely after `code-reviewer`, by alphabetical or by-pipeline-order — match prior precedent).

2. Edit the Planned table at lines 352–360: remove the `implementer` row (line 355 per grounding); leave other rows untouched.

**MIRROR**: `documentation/reference/agents.html:239` (existing code-reviewer shipped section).

**VALIDATE**: `grep -c 'id="agent-implementer"' documentation/reference/agents.html` returns 1 (new section present) AND the Planned table's implementer row is removed: `sed -n '/Planned/,/<\/table>/p' documentation/reference/agents.html | grep -c "implementer"` returns 0.

### Task 7: UPDATE `documentation/roadmap/status.html` — refresh "Plugin artifacts" list

**ACTION**: Single `Edit` to refresh the "What's shipped > Plugin artifacts" list (around lines 148–152). Updated list:

- **Skills:** `context-builder` (initial drop)
- **Agents:** `prd-writer` (v0.6.0), `prd-reviewer` (v0.6.0), `research-web` (v0.6.0), `research-codebase` (v0.6.0), `plan-writer` (v0.7.0), `plan-reviewer` (v0.7.0), `test-runner` (v0.5.0), `post-green-reviewer` (v0.5.0), `implementer` (v0.8.0), `code-reviewer` (v0.8.0)
- **Commands:** `/relay-prd` (v0.6.0), `/relay-plan` (v0.7.0), `/relay-plan-review` (v0.7.0), `/relay-test` (v0.5.0), `/relay-test-review` (v0.5.0), `/relay-implement` (v0.8.0), `/relay-code-review` (v0.8.0)

The version annotations are best-effort against the changelog.html version blocks; if a precise version is unclear at write time, omit the annotation rather than guess.

Optional: if the surrounding "What's next" section explicitly named `implementation-authoring` as next-up, update it to point at the next planned PRD (or to "no next PRD pending" if none exists at write time).

**MIRROR**: existing "Plugin artifacts" list shape in `documentation/roadmap/status.html`.

**VALIDATE**: `grep -c "implementer" documentation/roadmap/status.html` returns ≥1 (newly listed) AND `grep -c "/relay-implement" documentation/roadmap/status.html` returns ≥1 AND `grep -c "/relay-code-review" documentation/roadmap/status.html` returns ≥1.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- All seven target files still exist: `for f in docs/api-reference.md docs/decisions.md docs/context/architecture.md documentation/changelog.html documentation/reference/commands.html documentation/reference/agents.html documentation/roadmap/status.html; do test -f $f || echo "MISSING: $f"; done` returns nothing.
- HTML files still have valid structure (no unbalanced tags introduced): `for f in documentation/changelog.html documentation/reference/commands.html documentation/reference/agents.html documentation/roadmap/status.html; do python3 -c "from html.parser import HTMLParser; HTMLParser().feed(open('$f').read())" || echo "INVALID: $f"; done` returns nothing.
- Markdown files still parse (no unbalanced fences): `for f in docs/api-reference.md docs/decisions.md docs/context/architecture.md; do test $(grep -c '^\`\`\`' $f | awk '{print $1 % 2}') -eq 0 || echo "UNBALANCED FENCES: $f"; done` returns nothing.
- No emojis introduced in `documentation/` (AGENTS.md §2 hard constraint): the existing `✅` is plain Unicode used in `docs/api-reference.md` (plugin-level docs, where it's allowed) but should NOT spread to `documentation/*.html` content. Check: `grep -P '[\x{1F300}-\x{1F9FF}]' documentation/changelog.html documentation/reference/commands.html documentation/reference/agents.html documentation/roadmap/status.html` returns nothing.

### Level 2 — CONTENT_INVARIANTS

- api-reference.md promotions:
  - `grep -cE "/relay-(implement|code-review).*✅" docs/api-reference.md` returns ≥2 (both promoted).
  - `grep -E "^\| \`(implementer|code-reviewer)\` ✅" docs/api-reference.md | wc -l` returns 2 (both agent rows added).
  - `grep -c "Implementer, Code Reviewer" docs/api-reference.md` returns 0 (Planned narrative cleaned).
- decisions.md new entries:
  - `grep -c "^## \[2026-04-30\] " docs/decisions.md` returns 5.
  - Closing template comment intact: `tail -10 docs/decisions.md | grep -c "Template for future entries"` returns 1.
- architecture.md edits:
  - `grep -c "PRPs/plans/completed/" docs/context/architecture.md` returns ≥1.
  - `grep -c "phase-<N>/attempts" docs/context/architecture.md` returns ≥1.
  - `grep "^| 3 |" docs/context/architecture.md | grep -c "partial"` returns 1.
- changelog.html v0.8.0 cut:
  - `grep -c '0.8.0 — 2026-04-30' documentation/changelog.html` returns 1.
  - `grep -c 'v0-8-0' documentation/changelog.html` returns ≥1.
  - No new inline `<style>` blocks: `grep -c '<style>' documentation/changelog.html` unchanged from baseline.
- commands.html badge promotions:
  - `grep -c 'id="relay-implement".*badge--done' documentation/reference/commands.html` returns 1.
  - `grep -c 'id="relay-code-review".*badge--done' documentation/reference/commands.html` returns 1.
- agents.html shipped section:
  - `grep -c 'id="agent-implementer"' documentation/reference/agents.html` returns 1.
  - Planned table no longer lists implementer: `sed -n '/Planned/,/<\/table>/p' documentation/reference/agents.html | grep -c "implementer"` returns 0.
- status.html artifact list refresh:
  - `grep -c "implementer\|relay-implement\|code-reviewer\|relay-code-review" documentation/roadmap/status.html` returns ≥4 (all four pieces named).

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

- Site renders cleanly under `file://`: open `documentation/index.html`, `documentation/changelog.html`, `documentation/reference/commands.html`, `documentation/reference/agents.html`, `documentation/roadmap/status.html` in a browser (or, in headless validation, parse each HTML file and confirm no unresolved relative paths). Best-effort check: `for f in documentation/changelog.html documentation/reference/commands.html documentation/reference/agents.html documentation/roadmap/status.html; do grep -E 'href="[^#"]+"' $f | grep -v -E "^[^=]+=\"(\\.\\./|#|http|https|mailto)" | head -3 || true; done` returns nothing (all hrefs are relative-prefixed or fragment/external).
- Snapshot test: `git diff --stat <base_commit> -- docs/ documentation/` shows exactly 7 files modified, zero added, zero deleted.
- Cross-file consistency: the agents named in Task 1's api-reference.md row insertion are the same agents named in Task 6's agents.html shipped section and Task 7's status.html "Plugin artifacts" list. The commands named in Task 1's api-reference promotions are the same commands named in Task 5's commands.html badge additions. No drift between the three surfaces.

## Acceptance Criteria

- **AC-A1 (PRD AC-12 + AC-13 — public surface reflects shipped contracts):** Given Phases 1–4 of `implementation-authoring` are complete, when Phase 5 lands, then `docs/api-reference.md` lists `/relay-implement` and `/relay-code-review` as ✅ implemented with expanded behavioral notes and `implementer` + `code-reviewer` rows in the Implemented Agents table. Verifiable by `grep -cE "/relay-(implement|code-review).*✅" docs/api-reference.md` returning ≥2.

- **AC-A2 (PRD AC-1 + AC-7 + AC-8 — design rationale pinned in decisions log):** Given the `/relay-implement` command's design includes implementer Bash allowlist gate, code-reviewer no-Edit divergence, D8 best-effort-atomic mutations, `PRPs/plans/completed/` archive path, and per-attempt `diff.patch` artifact path, when Phase 5 lands, then `docs/decisions.md` carries five new `[2026-04-30]` entries codifying each rationale, in the canonical four-field shape. Verifiable by `grep -c "^## \[2026-04-30\] " docs/decisions.md` returning 5.

- **AC-A3 (PRD AC-9 + the universal no-`.claude/`-writes invariant):** Given the new artifact paths introduced by Phases 1–4, when Phase 5 lands, then `docs/context/architecture.md`'s PRP artifact paths table includes `PRPs/plans/completed/` (a row distinct from the existing three) AND the `PRPs/reports/<feature>/` row's description names the new `phase-<N>/attempts/<i>/diff.patch` path. The architecture file confirms relay-internal artifacts stay under `PRPs/`, never `.claude/`. Verifiable by `grep -c "PRPs/plans/completed/" docs/context/architecture.md` returning ≥1 and `grep -c "phase-<N>/attempts" docs/context/architecture.md` returning ≥1.

- **AC-A4 (PRD AC-12 + plan-authoring Phase 6 precedent — changelog versioning):** Given the v0.7.2 release on 2026-04-28 was the most recent and an Unreleased block holds reviewer-coherence-layer entries, when Phase 5 lands, then `documentation/changelog.html` has a new `<h2 id="v0-8-0">0.8.0 — 2026-04-30</h2>` block listing the four shipped artifacts under Added and the seven docs edits under Changed. Verifiable by `grep -c "0.8.0 — 2026-04-30" documentation/changelog.html` returning 1.

- **AC-A5 (documentation/AGENTS.md §9 — modifying-existing-page workflow):** Given the seven edits are all to existing pages (no new pages, no NAV changes, no search-index changes), when Phase 5 lands, then `app.js`'s NAV array and `assets/data/search-index.json` are byte-identical pre- and post-edit. Verifiable by `git diff --stat <base_commit> -- documentation/assets/js/app.js documentation/assets/data/search-index.json` returning empty.

- **AC-A6 (PRD AC-12 — site-level reference pages match the shipped contract):** Given the precedent set by v0.6.0 (PRD pair) and v0.7.0 (Plan pair), when Phase 5 lands, then `documentation/reference/commands.html` shows `badge--done` markers on `/relay-implement` and `/relay-code-review` headings, and `documentation/reference/agents.html` has a new shipped section for `implementer` (the `code-reviewer` shipped section already exists from reviewer-coherence-layer Phase 3 docs). Verifiable by the grep checks in Validation Level 2.

- **AC-A7 (PRD AC-12 — roadmap status reflects current ship state):** Given multiple feature stacks have shipped since `documentation/roadmap/status.html`'s last "Plugin artifacts" refresh, when Phase 5 lands, then the list explicitly includes `implementer`, `code-reviewer`, `/relay-implement`, `/relay-code-review` (and any prior gaps for `plan-writer`, `plan-reviewer`, `/relay-plan`, `/relay-plan-review` that were missed by Phase 6 of plan-authoring). Verifiable by the grep check in Validation Level 2.

- **AC-A8 (PRD AC-14 — Decision Gate sources still readable):** Given Phase 5 introduces new entries to `docs/decisions.md` and new rows to `docs/context/architecture.md`, when Phase 5 lands, all three Decision Gate sources (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`) are still readable and well-formed. The implementer is responsible for verifying this with `for f in docs/decisions.md docs/anti-patterns.md docs/context/architecture.md; do test -r $f || echo "MISSING: $f"; done` returning nothing.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Strategy A vs Strategy B changelog cut decision (fold Unreleased into 0.8.0 vs separate 0.8.0 below Unreleased) is ambiguous at write time; implementer may pick the less canonical option | M | L | Both strategies are valid Keep-a-Changelog cuts; the implementer reads the Unreleased block contents and picks the cleaner option; either way the new 0.8.0 block carries the implementation-authoring entries. The plan documents both strategies explicitly. |
| `documentation/AGENTS.md §6` three-file rule (NAV + search index + changelog) might be misapplied to Phase 5 (which only modifies existing pages, no new pages); spurious NAV edits would corrupt navigation | L | M | Plan explicitly cites AGENTS.md §9 (modifying-existing-page workflow) as the applicable contract; AC-A5 verifies app.js and search-index.json are byte-identical pre- and post-edit. |
| The Phased rollout table at `architecture.md:129-130` has accumulated drift across multiple ships (v0.5.0 Test Runner, v0.6.0 PRD, v0.7.0 Plan, v0.7.2 unknown); Phase 5's "partial" promotion may not capture all sub-status correctly | M | L | The plan's Task 3 sub-status note enumerates the shipped pieces explicitly; if dogfood reveals drift, a follow-up entry to `docs/decisions.md` or another docs-update phase corrects it. The risk is bounded — the rollout table is informational, not contract. |
| `documentation/reference/agents.html` Planned table at lines 352–360 may have shifted between grounding and write time (e.g., reviewer-coherence-layer Phase 3 docs may have already removed the `implementer` row in a prior session) | L | L | Task 6 VALIDATE explicitly checks: `sed -n '/Planned/,/<\/table>/p' documentation/reference/agents.html | grep -c "implementer"` returns 0 post-edit. The implementer reads the file at write time and confirms the actual state before editing. |
| Cross-file consistency between Task 1 (api-reference), Task 6 (agents.html), Task 7 (status.html) drifts: the same agent named with different capitalisation, different role description, different paths | L | M | Validation Level 3 cross-file consistency check; the implementer maintains a mental model of the shipped artifacts (4 items: implementer agent, code-reviewer agent, /relay-implement command, /relay-code-review command) and applies the same names + paths to all three surfaces. |
| Test Runner's "v0.5.0" version annotation in Task 7 is a guess; the actual changelog.html may have a different version for that ship | L | L | Task 7 ACTION explicitly says "if a precise version is unclear at write time, omit the annotation rather than guess". The implementer reads the changelog at write time and either uses the verified version or omits. |
| The `/relay-plan` and `/relay-plan-review` Plugin-artifacts entries may have been added by plan-authoring's Phase 6 (in which case Task 7 is a no-op for those rows); grounding showed the list "stale missing them" but the timestamp may be outdated | M | L | Task 7 VALIDATE only checks the four NEW items (implementer, code-reviewer, /relay-implement, /relay-code-review) are present; plan-authoring artifacts are confirmed-present-or-confirmed-still-needed at write time. |
| Implementer accidentally introduces an emoji in `documentation/*.html` content (AGENTS.md §2 hard constraint forbids emojis everywhere — the `✅` in Task 1 is plain Unicode used in `docs/api-reference.md` plugin-level docs only) | L | M | Validation Level 1 emoji-grep check; the implementer is instructed in each Task's MIRROR to follow the existing badge style (`<span class="badge badge--done">implemented</span>`) rather than text-with-emoji. |

## Notes

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Design notes (from grounding)

- **Web grounding returned `findings: []` with documented degradation** — this was deliberate. Phase 5 docs work is fully grounded by relay-internal precedents (Phase 6 of plan-authoring; documentation/AGENTS.md binding contract; existing v0.6.0 / v0.7.0 changelog entries; existing badge / shipped-section patterns in commands.html / agents.html). External evidence (Keep-a-Changelog 1.1.0; AI-pipeline plugin documentation conventions) was canvassed and surfaced no novel signals applicable to Phase 5. The empty findings array is the correct outcome; the plan documents this as a deliberate deferral, not a research failure.
- **Latest released version is v0.7.2 (2026-04-28), not v0.7.0 as initially assumed.** The Unreleased block contains reviewer-coherence-layer phases. Strategy A (cut Unreleased + implementation-authoring as v0.8.0) folds those into the same release; Strategy B (separate 0.8.0 below Unreleased) keeps them apart. Implementer chooses based on whether reviewer-coherence-layer is at a stable shippable point at write time.
- **`code-reviewer` already has a shipped section in `documentation/reference/agents.html`** (line 239 per grounding), shipped via the reviewer-coherence-layer Phase 3 docs update. Phase 5 does NOT need to add a code-reviewer section to agents.html — only the `implementer` section is new. Task 6 reflects this asymmetry.
- **`PRPs/plans/completed/` directory existence** — at the time of writing this plan, the directory exists on disk and is populated with 13+ completed plans (plan-authoring 1–6, implementation-authoring 1–4, reviewer-coherence-layer 1–4). The directory is established by usage; Phase 5 codifies it in `docs/context/architecture.md` and `docs/decisions.md`, completing the "discovered convention → documented contract" lifecycle. No `mkdir -p` is needed in this phase (the directory is already populated and `git`-tracked); the docs simply codify reality.
- **AGENTS.md §9 vs §6** — Phase 5 is firmly a §9 (modifying-existing-page) workflow, not a §6 (new-page) workflow. The §6 three-file rule (NAV + search index + changelog) does NOT apply. Only the changelog entry (§6.3 = §9 step 5) is required. AC-A5 verifies this by snapshotting `app.js` and `search-index.json` as byte-identical pre- and post-edit.
- **Cross-file consistency is the central editing discipline.** Seven distinct files; same four shipped artifacts named in three of them (api-reference, agents.html, status.html) plus two of them (commands.html for the two commands; agents.html for the one new agent) plus the changelog naming all four. The implementer must apply the same names + paths consistently. Validation Level 3 catches drift.
- **No new files, no new directories** — Phase 5's diff against base shows exactly seven files modified, zero added, zero deleted. This is the architectural cleanliness signature of a well-scoped final-phase docs update.

*Generated: 2026-04-30*
*Approved: 2026-04-30*
*Implemented: 2026-04-30*
*Status: IMPLEMENTED*
