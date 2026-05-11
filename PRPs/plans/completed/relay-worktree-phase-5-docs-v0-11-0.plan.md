# Feature: Docs + v0.11.0 release cut (Phase 5 of relay-worktree)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: minor-version release cut (§7.5 binding contract); edits to documentation/ (AGENTS.md contract); new decisions.md entry; api-reference promotion; plugin.json bump
- Decisions found:
  - 2026-04-30 Plugin manifest version is bumped on every minor/major release cut — version must match changelog.html in the same commit (§7.5)
  - 2026-04-19 PRP artifacts live under PRPs/ at the repository root, never under .claude/
  - 2026-04-19 Command surface: /relay-worktree listed as infra command with output .worktrees/<feature>/
  - 2026-04-19 Distribute via Claude Code marketplace — plugin.json at plugins/relay/.claude-plugin/plugin.json is the version identifier for cache invalidation
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — plan body must never reference .claude/PRPs/ as a write target; the prohibition itself may be cited as a quoted reference
  - "Reopening APPROVED PRDs" — the source PRD (relay-worktree.prd.md) is APPROVED and MUST NOT be mutated beyond the row-5 back-fill performed by plan-writer
- Applicable architectural rules:
  - documentation/AGENTS.md §7.5 binding: every minor (0.X.0) changelog bump MUST bump plugin.json to the same version in the same commit
  - documentation/AGENTS.md §2 invariant 7: no new pages added — only existing pages edited — so NAV and search-index are untouched
  - documentation/AGENTS.md §9 workflow: full-page read before editing; changelog entry under Changed/Added for every user-visible change
  - docs/context/architecture.md PRP artifact paths: .worktrees/<feature>/ row is missing from the table; this phase adds it
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-worktree.prd.md` — Implementation Phases row 5: "Docs + v0.11.0 release cut" — Goal: make the capstone visible to readers of the documentation site and the api-reference, and cut the v0.11.0 release with the §7.5 plugin manifest sync. — Success signal: v0.11.0 changelog entry rendered on the documentation site; `plugin.json` is `0.11.0`; the api-reference shows `/relay-worktree` implemented; `docs/decisions.md` records the architecture decisions (shell-out vs EnterWorktree; `.worktrees/` path confirmation; bootstrap-hook contract).

## Summary

Phase 5 closes the relay-worktree feature by making all implementation work (Phases 1–4) visible to both internal developers and site readers, and by cutting the v0.11.0 release that keeps Claude Code's plugin cache aligned with the shipped contracts. The deliverables are seven targeted edits plus a verification task: promote `/relay-worktree` to implemented in `docs/api-reference.md`; add a 2026-05-11 decisions block covering D1/D2/D6/D7/D8 to `docs/decisions.md`; extend the PRP artifact paths table in `docs/context/architecture.md` with the `.worktrees/<feature>/` row; upgrade the `/relay-worktree` entry in `documentation/reference/commands.html` from its bare two-row stub to the full kv-block with a `badge--done` badge; remove `/relay-worktree` from the Pillar 2 pending list in `documentation/roadmap/status.html`; add the v0.11.0 entry to `documentation/changelog.html`; bump `plugins/relay/.claude-plugin/plugin.json` from `0.10.0` to `0.11.0`; and verify the NAV/search-index invariant holds. No new pages, no NAV changes, no search-index changes — the documentation/AGENTS.md §2 invariant is fully respected.

## User Story

As a relay-developer or site reader
I want to see `/relay-worktree` marked as implemented across the api-reference and documentation site, with the v0.11.0 release entry present and the plugin manifest bumped
So that the plugin cache invalidates correctly, the architecture decisions are permanently recorded, and the feature's status is discoverable without reading the source PRD directly.

## Problem Statement

After Phases 1–4 of the relay-worktree PRD are complete, the implementation is live in the plugin tree but invisible to readers of the documentation site and the `docs/api-reference.md`. The `/relay-worktree` command entry in `documentation/reference/commands.html` is a bare two-row stub (Input / Output only) with no badge, no mode, no notes, and no agent references. The `documentation/roadmap/status.html` still lists `/relay-worktree` under "Pending (Pillar 2 leftovers)". The `docs/api-reference.md` carries no implemented marker for the command. The five architecture decisions made during relay-worktree Phases 1–3 (D1 path confirmation, D2 shell-out rationale, D6 bootstrap-hook contract, D7 `.gitignore` auto-write evolution, D8 graceful-fallback handling) are not yet recorded in `docs/decisions.md`. And `plugins/relay/.claude-plugin/plugin.json` is still at `0.10.0` — without a bump to `0.11.0`, users who already have the plugin installed will never pick up the new `/relay-worktree` command regardless of how many times they pull the marketplace.

## Solution Statement

Execute seven surgical edits plus one verification step in a single logical commit to close all gaps:

1. **`docs/api-reference.md`** — promote the `/relay-worktree` row in the Infrastructure / execution table from a bare stub to an implemented entry with the checkmark and behavioral notes matching the PRD's AC-1 through AC-15 contract.
2. **`docs/decisions.md`** — append a `[2026-05-11]` entry covering the five decisions: D1 (`.worktrees/<feature>/` path confirmation), D2 (shell-out over `EnterWorktree`), D6 (bootstrap-hook contract), D7 (`.gitignore` auto-write evolution in context-builder), D8 (worktree-creation-failure graceful fallback).
3. **`docs/context/architecture.md`** — add a `.worktrees/<feature>/` row to the PRP artifact paths table, referencing the 2026-05-11 decision entry.
4. **`documentation/reference/commands.html`** — replace the bare `/relay-worktree` kv-block with the full canonical kv-block shape (badge--done, Input, Output, Mode, Preconditions, Idempotency, Bootstrap, Flags, Notes), mirroring the shape of the `/relay-test` and `/relay-execute` entries.
5. **`documentation/roadmap/status.html`** — remove `/relay-worktree` from the "Pending (Pillar 2 leftovers)" bullet list; update the "What's shipped > Plugin artifacts" Commands list to include `commands/relay-worktree.md (v0.11.0)`; update the worktree reference in the "12-command surface" paragraph.
6. **`documentation/changelog.html`** — add the `0.11.0 — 2026-05-11` release block above the existing `0.10.1` block, following the keepachangelog Added/Changed shape per AGENTS.md §7.2–7.5.
7. **`plugins/relay/.claude-plugin/plugin.json`** — bump `"version": "0.10.0"` to `"version": "0.11.0"` per the 2026-04-30 §7.5 binding contract.
8. **Verify NAV / search-index invariant** — confirm that `documentation/assets/js/app.js` and `documentation/assets/data/search-index.json` are unchanged and no new HTML pages were created.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation + release cut |
| Complexity | Low — seven targeted edits to existing files; no new files, no new pages, no logic changes |
| Systems Affected | `docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`, `documentation/reference/commands.html`, `documentation/roadmap/status.html`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json` |
| Dependencies | Phases 1–4 of relay-worktree.prd.md complete (Status: complete) |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/relay-worktree.prd.md` row 5, lines 194 (table row) and 218–222 (Phase Details) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P1 | `PRPs/prds/relay-worktree.prd.md` | 65–83 (Acceptance Criteria), 225–238 (Decisions Log) | Source of behavioral facts for the decisions.md entry and api-reference promotion; all five decisions (D1/D2/D6/D7/D8) are defined here |
| P1 | `documentation/AGENTS.md` | 1–481 (full file) | Binding contract for every edit inside `documentation/`; §7.2–7.5 governs changelog shape and §7.5 is binding for the plugin.json bump |
| P1 | `documentation/changelog.html` | 1–130 (v0.10.1 + v0.10.0 blocks) | Shape reference for the new v0.11.0 block; existing blocks define the exact HTML pattern to mirror |
| P1 | `documentation/reference/commands.html` | 153–162 (/relay-worktree stub), 163–183 (/relay-test full entry) | The stub to replace and the full entry to use as structural mirror |
| P1 | `documentation/roadmap/status.html` | 147–205 (What's shipped + What's next) | Locates the pending list and the Plugin artifacts list that need updating |
| P2 | `docs/api-reference.md` | 55–66 (Infrastructure / execution table) | The table row for `/relay-worktree` that needs the implemented marker added |
| P2 | `docs/context/architecture.md` | 85–93 (PRP artifact paths table) | The table that needs a new `.worktrees/<feature>/` row |
| P2 | `docs/decisions.md` | 439–449 (template comment at end of file) | Canonical four-field entry shape (Context / Decision / Reason / Areas affected) to mirror |
| P2 | `plugins/relay/.claude-plugin/plugin.json` | 1–9 (full file) | Current version `0.10.0` to be bumped to `0.11.0` |

## Patterns to Mirror

### Source: `documentation/changelog.html` lines 61–83 (v0.10.0 release block shape)

```html
      <h2 id="v0-10-0">0.10.0 — 2026-05-06</h2>

      <p>TDD writer/reviewer pair (B7/B8) shipped ...</p>

      <h3 id="v0-10-0-added">Added</h3>

      <ul>
        <li><strong><code>plugins/relay/agents/tdd-writer.md</code></strong> &mdash; ...</li>
      </ul>

      <h3 id="v0-10-0-changed">Changed</h3>

      <ul>
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.9.0</code> &rarr; <code>0.10.0</code> per the 2026-04-30 §7.5 binding contract. ...</li>
      </ul>
```

Task 6 (changelog entry) mirrors this exact HTML pattern: `<h2 id="v0-11-0">0.11.0 — 2026-05-11</h2>` followed by prose paragraph, then `<h3 id="v0-11-0-added">Added</h3>` / `<h3 id="v0-11-0-changed">Changed</h3>` sub-sections with `<ul><li>` items. The `<strong><code>path</code></strong> &mdash;` prefix on each item is mandatory per the established pattern.

### Source: `documentation/reference/commands.html` lines 163–183 (/relay-test full kv-block shape)

```html
      <h3 id="relay-test"><code>/relay-test &lt;worktree&gt;</code> <span class="badge badge--done">implemented</span></h3>
      <div class="kv">
        <dt>Input</dt>
        <dd>A worktree with pending code changes.</dd>
        <dt>Output</dt>
        <dd>
          Green state, or one of: ...
        </dd>
        <dt>Encapsulates</dt>
        <dd>B1 (Test Runner agent), B2 (structured output), B3 (failure classification), B4 (auto-correction loop ...).</dd>
        <dt>Flags</dt>
        <dd>
          <code>--max-retries N</code> override retry budget (default 3).
          <br /><code>--max-minutes M</code> override time budget (default 30).
        </dd>
        <dt>Agent</dt>
        <dd>Delegates per-attempt execution to the <a href="agents.html"><code>test-runner</code> agent</a>.</dd>
      </div>
```

Task 4 (commands.html update) replaces the bare two-row `/relay-worktree` stub with a full kv-block matching this shape: `badge--done`, then Input / Output / Mode / Preconditions / Idempotency / Bootstrap / Flags / Notes rows, using the same `<dt>/<dd>` structure.

### Source: `docs/decisions.md` lines 439–449 (four-field decision entry template)

```markdown
## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]
```

Task 2 (decisions.md entry) mirrors this exact four-field shape for each of the five decisions D1/D2/D6/D7/D8, grouped under a single `## [2026-05-11]` block header titled "relay-worktree architecture decisions (D1/D2/D6/D7/D8)".

### Source: `docs/context/architecture.md` lines 85–93 (PRP artifact paths table)

```markdown
| Path | Contents |
|------|----------|
| `PRPs/prds/<feature>.prd.md` | PRDs ... |
| `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | Implementation plans ... |
| `PRPs/plans/completed/<basename>.plan.md` | Archived implementation plans ... |
| `PRPs/reports/<feature>/` | Test Runner execution reports ... |
```

Task 3 (architecture.md update) appends a new row to this table following the same pipe-delimited markdown format: `| \`.worktrees/<feature>/\` | Per-feature git worktrees created by \`/relay-worktree\` ... |`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/api-reference.md` | UPDATE | Promote `/relay-worktree` Infrastructure row from bare stub to implemented entry with checkmark and behavioral notes |
| `docs/decisions.md` | UPDATE | Append 2026-05-11 entry covering D1 (path), D2 (shell-out), D6 (bootstrap contract), D7 (.gitignore auto-write), D8 (graceful fallback) — five decisions made during Phases 1–3 that have not yet been recorded |
| `docs/context/architecture.md` | UPDATE | Add `.worktrees/<feature>/` row to PRP artifact paths table; the row is currently absent making the table incomplete after Phase 1 shipped |
| `documentation/reference/commands.html` | UPDATE | Replace bare `/relay-worktree` stub (Input + Output only, no badge) with full canonical kv-block including `badge--done`, Mode, Preconditions, Idempotency, Bootstrap, Flags, Notes rows |
| `documentation/roadmap/status.html` | UPDATE | Remove `/relay-worktree` from Pending list; add `commands/relay-worktree.md (v0.11.0)` to Plugin artifacts Commands list; update "12-command surface" paragraph accordingly |
| `documentation/changelog.html` | UPDATE | Add `0.11.0 — 2026-05-11` release block above the `0.10.1` block per AGENTS.md §7.2–7.5 keepachangelog shape |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Bump `"version"` from `"0.10.0"` to `"0.11.0"` — mandatory per the 2026-04-30 §7.5 binding contract whenever a minor release is cut |

## NOT Building (Scope Limits)

- **New documentation pages** — no new HTML files are created; no NAV entries added; no search-index entries added. AGENTS.md §2 invariant 7 requires registration in three places when a new page is added; this phase adds none (only existing pages edited).
- **Worktree cleanup / removal documentation** — the `/relay-approve` Pillar 3 command owns `git worktree remove` + branch deletion; that flow is not documented here.
- **Bootstrap script content generation docs** — the context-builder emits the template; detailed documentation of the bootstrap template format is deferred to context-builder docs (not part of this PRD's scope).
- **Container orchestration / port allocation docs** — out of relay's scope as per PRD "What We're NOT Building".
- **`EnterWorktree` comparison page** — the decision to reject `EnterWorktree` is recorded in decisions.md (Task 2) but a dedicated explainer page is not in scope.
- **`/relay-approve` wiring documentation** — Pillar 3 has its own PRD when designed.
- **Per-attempt diff reports for worktree** — the bootstrap log (`PRPs/reports/<feature>/worktree-bootstrap.log`) is an implementation artifact; its schema documentation belongs to a future Phase if needed.

## Step-by-Step Tasks

### Task 1: UPDATE `docs/api-reference.md`

- **ACTION**: In the Infrastructure / execution table (around line 57), replace the bare `/relay-worktree <feature-name>` row (which currently has only "feature name" as input and "worktree at `.worktrees/<feature>/` + branch `feature/<name>`" as output) with a full row that adds the checkmark marker. The existing api-reference row uses a table format — add the implemented checkmark inline: `` `/relay-worktree <feature-name>` ✅ **implemented** ``. Expand the Output cell to note idempotency, graceful fallback on failure, and bootstrap hook execution. Add a Notes cell referencing `PRPs/prds/relay-worktree.prd.md` and the AC contract (AC-1 through AC-9 for the core command; AC-10/AC-11 for context-builder). Satisfies **AC-A1** (PRD AC-3, AC-9 — idempotency and HALT codes documented).
- **MIRROR**: Source: `docs/api-reference.md` existing row format for `/relay-test` ✅ implemented (line 58), which shows the established style for implemented infrastructure commands in the table.
- **VALIDATE**: `grep -n "relay-worktree" docs/api-reference.md | grep "implemented"` — must return at least one match confirming the implemented marker is present.

### Task 2: UPDATE `docs/decisions.md`

- **ACTION**: Append a new entry immediately before the template comment block at the end of the file (after the last `---` separator following the 2026-05-06 TDD entry). The entry covers all five relay-worktree architecture decisions in one dated block: `## [2026-05-11] relay-worktree architecture decisions: path, shell-out primitive, bootstrap contract, .gitignore evolution, graceful fallback`. Under this header, write five sub-sections using the four-field shape (Context / Decision / Reason / Areas affected):
  - **D1** — `.worktrees/<feature>/` path (not `.claude/worktrees/`); context: `EnterWorktree` hardcodes `.claude/` path; decision: sibling directory per 2026-04-19 surface decision; reason: avoids `.claude/` permission gate; areas: `/relay-worktree` command, `context-builder` `.gitignore` append, `docs/context/architecture.md` artifact paths table.
  - **D2** — Shell-out `git worktree add` via `Bash` rather than `EnterWorktree`; context: `EnterWorktree` path conflict + auto-cleanup-on-session-exit lifecycle misalignment; decision: relay invokes `git worktree add` directly; reason: path contract preserved; lifecycle survives across `/relay-execute` invocations; areas: `/relay-worktree` command.
  - **D6** — Bootstrap-hook contract (project-owned `scripts/worktree-bootstrap.sh`; context-builder emits template on `*init`; failure is non-fatal); decision: delegate stack-specific setup to project script; reason: keeps relay out of Docker/dependency orchestration; areas: `/relay-worktree` command, `context-builder` SKILL.md.
  - **D7** — `.gitignore` auto-write by `context-builder *init`; context: SKILL.md previously advisory only; decision: auto-append `.worktrees/` line with comment; reason: zero-risk single-line append; `*update` PRESERVE-ENTIRELY rule means team edits are never overwritten; areas: `context-builder` SKILL.md, target project `.gitignore`.
  - **D8** — Worktree-creation-failure graceful fallback to cwd (D3/D4 graceful-degradation preserved); decision: pipeline does NOT halt on worktree creation failure; reason: worktree is an optimization, not a correctness requirement; areas: `/relay-execute` D4 live wiring, `orchestrator-run.json` `worktree_attempted` / `worktree_succeeded` / `fallback_reason` fields.
  Satisfies **AC-A2** (PRD AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8 — all five decisions recorded in canonical four-field shape).
- **MIRROR**: Source: `docs/decisions.md` lines 439–449 (four-field template comment); existing entries at lines 382–391 (2026-04-30 plugin manifest version-sync entry) as shape exemplar.
- **VALIDATE**: `grep -c "\[2026-05-11\]" docs/decisions.md` — must return `1` (exactly one new dated section).

### Task 3: UPDATE `docs/context/architecture.md`

- **ACTION**: In the PRP artifact paths table (lines 85–93), append a new row for `.worktrees/<feature>/` between the `PRPs/reports/<feature>/` row and the closing prose. The row content: `| \`.worktrees/<feature>/\` | Per-feature isolated git worktrees created by \`/relay-worktree\`. Each worktree checks out branch \`feature/<feature>\` from the base ref (default \`origin/main\`). Idempotent: silently reused when the worktree exists on the expected branch; HALT loud on branch divergence. Worktrees persist until Pillar 3 (\`/relay-approve\`) removes them post-merge. Path sidesteps the \`.claude/\` permission gate — documented in \`docs/decisions.md\` 2026-05-11 D1. |` Satisfies **AC-A3** (PRD AC-1 — worktree path convention surfaced in architecture documentation).
- **MIRROR**: Source: `docs/context/architecture.md` lines 85–93 (PRP artifact paths table — pipe-delimited markdown format).
- **VALIDATE**: `grep -n "worktrees" docs/context/architecture.md` — must return at least one match in the PRP artifact paths table section.

### Task 4: UPDATE `documentation/reference/commands.html`

- **ACTION**: Replace the bare `/relay-worktree` kv-block (lines 155–161) with the full canonical kv-block shape. Per AGENTS.md §9 workflow, read the full page first, then make a targeted `Edit` replacing the stub. The new block:
  - Heading: `<h3 id="relay-worktree"><code>/relay-worktree &lt;feature-name&gt;</code> <span class="badge badge--done">implemented</span></h3>`
  - `<div class="kv">` with the following `<dt>/<dd>` rows:
    - **Input**: feature name (free argument); or PRD-derived slug when invoked internally by `/relay-execute`. Sanitized to `[a-z0-9-]` max 64 chars; empty result after sanitization → HALT.
    - **Output**: worktree at `.worktrees/<feature>/` and branch `feature/<feature>`. Bootstrap log at `PRPs/reports/<feature>/worktree-bootstrap.log` when the bootstrap script runs.
    - **Mode**: Deterministic infra command (no LLM, no agent). Idempotent: silently reuses an existing worktree when the branch matches; halts loud (`FAILED_BRANCH_DIVERGENCE`) when the worktree exists on a different branch.
    - **Preconditions**: cwd is a git repo (`FAILED_NOT_A_GIT_REPO`); base ref resolvable (`FAILED_BASE_REF_MISSING`); branch `feature/<feature>` available or already on expected worktree (`FAILED_BRANCH_CONFLICT`); path `.worktrees/<feature>/` either empty or a registered git worktree (`FAILED_PATH_OCCUPIED`).
    - **Bootstrap**: invokes `scripts/worktree-bootstrap.sh <abs-worktree-path>` (or `.ps1` on Windows) with a 60s timeout when the script exists. Failure is non-fatal — worktree creation is the load-bearing outcome.
    - **Flags**: `--base <ref>` — base ref for the new branch (default: `origin/main` → `origin/master` → `HEAD` fallback chain).
    - **Notes**: invoked automatically by `/relay-execute` between `/relay-plan-review` and `/relay-tdd`. `--no-worktree` flag on `/relay-execute` skips invocation and preserves the current cwd-based behavior. Creation failure inside `/relay-execute` falls through to graceful degradation per D3/D4 (pipeline does NOT halt on worktree creation failure). See `PRPs/prds/relay-worktree.prd.md`.
  Satisfies **AC-A4** (PRD AC-12, AC-13, AC-14 — badge, full kv-block, `--no-worktree` opt-out documented).
- **MIRROR**: Source: `documentation/reference/commands.html` lines 163–183 (`/relay-test` full kv-block shape — established badge + multi-row kv pattern).
- **VALIDATE**: `grep -n "badge--done" documentation/reference/commands.html | grep "relay-worktree"` — must return one match confirming the badge was added.

### Task 5: UPDATE `documentation/roadmap/status.html`

- **ACTION**: Two targeted edits per AGENTS.md §9 (read full page first):
  1. In the "What's next > Phase 3" section, find the `<ul>` under `<p><strong>Pending (Pillar 2 leftovers):</strong></p>` (lines ~199–202). Remove the `/relay-worktree` `<li>` bullet entirely (the one reading "worktree — `/relay-implement`'s D4 graceful degradation works against the current cwd today; the standalone command is deferred").
  2. In the "What's shipped > Plugin artifacts > Commands" `<ul>` (line ~151), add `<code>commands/relay-worktree.md</code> (v0.11.0)` to the commands list item. The existing item lists all shipped commands; append `, <code>commands/relay-worktree.md</code> (v0.11.0)` before the closing `</li>`.
  3. Update the sentence "Of the 12-command surface ... only `/relay-worktree` and `/relay-pr` remain `pending` from Pillar 2" (line ~154) to "Of the 12-command surface ... only `/relay-pr` remains `pending` from Pillar 2".
  Satisfies **AC-A5** (PRD AC-12, AC-16 — worktree persistence visible in shipped list; pending list updated).
- **MIRROR**: Source: `documentation/roadmap/status.html` lines 147–205 (existing pending list and plugin artifacts list structure).
- **VALIDATE**: `grep -n "relay-worktree" documentation/roadmap/status.html` — must NOT return any result in the pending list paragraph; must still appear in the Commands list.

### Task 6: UPDATE `documentation/changelog.html`

- **ACTION**: Per AGENTS.md §9 (read full page first, then edit). Insert the new `0.11.0 — 2026-05-11` release block immediately before the `<h2 id="v0-10-1">` heading (i.e., after the closing `</p>` of the `Unreleased` block). The new block follows the exact keepachangelog HTML pattern from the v0.10.0 block:
  - `<h2 id="v0-11-0">0.11.0 — 2026-05-11</h2>`
  - Prose paragraph summarizing the release: `/relay-worktree` command ships completing the 12-command Pillar 2 surface; five architecture decisions recorded; `plugin.json` bumped `0.10.0` → `0.11.0` per §7.5 binding contract.
  - `<h3 id="v0-11-0-added">Added</h3>` section with `<ul><li>` items:
    - `plugins/relay/commands/relay-worktree.md` — new deterministic infra command (brief behavioral summary from PRD).
    - `docs/decisions.md` — new `[2026-05-11]` entry covering D1/D2/D6/D7/D8.
  - `<h3 id="v0-11-0-changed">Changed</h3>` section with `<ul><li>` items:
    - `documentation/reference/commands.html` — `/relay-worktree` promoted from bare stub to full kv-block with `badge--done`.
    - `documentation/roadmap/status.html` — `/relay-worktree` removed from Pending list; Commands list updated.
    - `docs/api-reference.md` — `/relay-worktree` promoted to implemented.
    - `docs/context/architecture.md` — `.worktrees/<feature>/` row added to PRP artifact paths table.
    - `plugins/relay/.claude-plugin/plugin.json` — version bumped `0.10.0` → `0.11.0` per the 2026-04-30 §7.5 binding contract (with the canonical sentence: "Users running `/plugin` after pulling will get a fresh `relay/0.11.0/` cache directory with `/relay-worktree` registered.").
  - Also update the `Unreleased` block text from "No in-flight changes since the v0.10.1 cut" to "No in-flight changes since the v0.11.0 cut on 2026-05-11."
  Satisfies **AC-A6** (PRD AC-12 — release cut success signal; v0.11.0 changelog block with Added + Changed sub-sections per AGENTS.md §7.2–7.5).
- **MIRROR**: Source: `documentation/changelog.html` lines 61–83 (v0.10.0 block — exact HTML pattern for release blocks per AGENTS.md §7.2).
- **VALIDATE**: `grep -n "v0-11-0" documentation/changelog.html` — must return at least 3 matches (the `<h2>` heading and the two `<h3>` sub-headings).

### Task 7: UPDATE `plugins/relay/.claude-plugin/plugin.json`

- **ACTION**: Replace the `"version"` field value from `"0.10.0"` to `"0.11.0"`. The file has 9 lines; the only change is the version string. Use a verbatim-row `Edit` targeting `"version": "0.10.0"` → `"version": "0.11.0"`. Satisfies **AC-A7** (PRD AC-12 — release cut success signal; §7.5 binding contract compliance; plugin.json and changelog.html versions byte-identical at `0.11.0`).
- **MIRROR**: Source: `plugins/relay/.claude-plugin/plugin.json` lines 1–9 (current content — the exact field being changed is on line 3: `"version": "0.10.0"`).
- **VALIDATE**: `grep -c '"version": "0.11.0"' plugins/relay/.claude-plugin/plugin.json` — must return `1`.

### Task 8: VERIFY NAV / search-index invariant unchanged

- **ACTION**: After all seven edits are complete, confirm that (a) no new HTML files were created under `documentation/`, (b) `documentation/assets/js/app.js` was not modified, and (c) `documentation/assets/data/search-index.json` was not modified. This task owns no edits — it is a pure verification gate. If any of the three checks fails, identify which task introduced the violation and roll it back before proceeding to Level 3 integration validation. Satisfies **AC-A8** (PRD AC-12, AC-15 doc-update implication — AGENTS.md §2 invariant 7 three-file registration rule is satisfied by the fact that no new pages are added; NAV and search-index remain byte-for-byte unchanged).
- **MIRROR**: Source: `documentation/AGENTS.md` §2 invariant 7 (three-file registration rule — any new page requires simultaneous NAV + search-index registration; absence of new pages means those files must be untouched).
- **VALIDATE**: `git diff --name-only documentation/assets/js/app.js documentation/assets/data/search-index.json 2>/dev/null | wc -l` — must output `0` (neither file touched); also run `git status --short documentation/ | grep "^?" | grep "\.html$" | wc -l` — must output `0` (no new HTML files).

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Verify plugin.json is valid JSON after the bump
python -c "import json, sys; json.load(open('plugins/relay/.claude-plugin/plugin.json')); print('plugin.json: valid JSON')"

# Verify no .claude/PRPs/ artifact-write references crept into docs files
grep -rn "\.claude/PRPs/" docs/api-reference.md docs/decisions.md docs/context/architecture.md && echo "FAIL: .claude/PRPs/ found" || echo "PASS: no .claude/PRPs/ references"

# Verify HTML files are well-formed (basic tag balance check on edited files)
python -c "
from html.parser import HTMLParser
import sys

class TagChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.errors = []
    def handle_error(self, message):
        self.errors.append(message)

for f in ['documentation/reference/commands.html', 'documentation/roadmap/status.html', 'documentation/changelog.html']:
    with open(f) as fh:
        content = fh.read()
    checker = TagChecker()
    checker.feed(content)
    print(f'{f}: {\"PASS\" if not checker.errors else \"FAIL: \" + str(checker.errors)}')
"
```

### Level 2 CONTENT_INVARIANTS

```bash
# Task 1: api-reference shows /relay-worktree as implemented
grep -n "relay-worktree" docs/api-reference.md | grep -i "implemented" && echo "PASS: api-reference implemented marker present" || echo "FAIL: implemented marker missing"

# Task 2: decisions.md has the new 2026-05-11 entry
grep -c "\[2026-05-11\]" docs/decisions.md
# Expected: 1

# Task 3: architecture.md has .worktrees row
grep -n "worktrees" docs/context/architecture.md | grep -v "^Binary" && echo "PASS: .worktrees row present" || echo "FAIL: missing"

# Task 4: commands.html has badge--done on relay-worktree
grep -n "badge--done" documentation/reference/commands.html | grep -i "worktree" && echo "PASS: badge present" || echo "FAIL: badge missing"

# Task 5: status.html no longer lists relay-worktree as pending
# The word "deferred" associated with relay-worktree must be gone
python -c "
content = open('documentation/roadmap/status.html').read()
if 'relay-worktree' in content and 'deferred' in content:
    # Check if they appear in the same paragraph
    idx = content.find('relay-worktree')
    window = content[max(0,idx-200):idx+300]
    if 'deferred' in window:
        print('FAIL: relay-worktree still appears near deferred')
    else:
        print('PASS: relay-worktree not in pending context')
else:
    print('PASS: relay-worktree deferred reference removed')
"

# Task 6: changelog has v0.11.0 block
grep -c "v0-11-0" documentation/changelog.html
# Expected: >= 3 (h2 + two h3 sub-headings)

# Task 7: plugin.json version is 0.11.0
grep '"version": "0.11.0"' plugins/relay/.claude-plugin/plugin.json && echo "PASS" || echo "FAIL: version not bumped"

# §7.5 consistency check: changelog and plugin.json agree on version
CHANGELOG_VER=$(grep -m1 '<h2 id="v[0-9]' documentation/changelog.html | grep -oP '\d+\.\d+\.\d+' | head -1)
PLUGIN_VER=$(python -c "import json; print(json.load(open('plugins/relay/.claude-plugin/plugin.json'))['version'])")
[ "$CHANGELOG_VER" = "$PLUGIN_VER" ] && echo "PASS: versions aligned ($PLUGIN_VER)" || echo "FAIL: changelog=$CHANGELOG_VER plugin=$PLUGIN_VER"

# Task 8: NAV and search-index untouched
git diff --name-only documentation/assets/js/app.js documentation/assets/data/search-index.json 2>/dev/null | wc -l
# Expected: 0
git status --short documentation/ | grep "^?" | grep "\.html$" | wc -l
# Expected: 0 (no new HTML files)
```

### Level 3 INTEGRATION

```bash
# Verify no new pages were accidentally added (NAV/search-index must remain unchanged)
# Count HTML files in documentation/ before and after — should be identical
echo "HTML file count in documentation/:"
find documentation -name "*.html" | wc -l

# Verify the AGENTS.md three-file rule is satisfied: since no new pages are added,
# NAV (app.js) and search-index.json must NOT have been modified
git diff --name-only documentation/assets/js/app.js documentation/assets/data/search-index.json 2>/dev/null | wc -l
# Expected: 0 (neither file touched)

# Verify plugin.json is importable and version field is correct
node -e "const p = require('./plugins/relay/.claude-plugin/plugin.json'); console.log('version:', p.version); process.exit(p.version === '0.11.0' ? 0 : 1)" && echo "PASS: plugin.json node-parseable and version correct"

# Full cross-file consistency: decisions.md entry exists, api-reference updated, architecture updated
python -c "
import re
checks = []

# Check 1: api-reference has implemented marker for relay-worktree
with open('docs/api-reference.md') as f:
    content = f.read()
    checks.append(('api-reference implemented', 'implemented' in content and 'relay-worktree' in content))

# Check 2: decisions.md has 2026-05-11 entry
with open('docs/decisions.md') as f:
    content = f.read()
    checks.append(('decisions 2026-05-11', '[2026-05-11]' in content))

# Check 3: architecture.md has .worktrees row
with open('docs/context/architecture.md') as f:
    content = f.read()
    checks.append(('architecture .worktrees row', '.worktrees' in content))

# Check 4: plugin.json is 0.11.0
import json
with open('plugins/relay/.claude-plugin/plugin.json') as f:
    data = json.load(f)
    checks.append(('plugin.json 0.11.0', data.get('version') == '0.11.0'))

# Check 5: changelog has v0.11.0 entry
with open('documentation/changelog.html') as f:
    content = f.read()
    checks.append(('changelog v0.11.0', 'v0-11-0' in content))

# Check 6: NAV and search-index untouched (files exist, not modified)
import subprocess
result = subprocess.run(['git', 'diff', '--name-only',
    'documentation/assets/js/app.js',
    'documentation/assets/data/search-index.json'],
    capture_output=True, text=True)
checks.append(('NAV/search-index unchanged', result.stdout.strip() == ''))

for name, result in checks:
    print(f'  {\"PASS\" if result else \"FAIL\"}: {name}')
all_pass = all(r for _, r in checks)
print('Overall:', 'PASS' if all_pass else 'FAIL')
"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-3, AC-9):** `docs/api-reference.md` shows `/relay-worktree` as ✅ implemented in the Infrastructure / execution table, with behavioral notes covering idempotency, HALT codes, and bootstrap hook; the row is no longer a bare stub.
- **AC-A2 (PRD AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-8):** `docs/decisions.md` contains a `[2026-05-11]` entry that records all five decisions: D1 (`.worktrees/<feature>/` path), D2 (shell-out over `EnterWorktree`), D6 (bootstrap-hook contract), D7 (`.gitignore` auto-write evolution), D8 (worktree-creation-failure graceful fallback). Each decision uses the canonical four-field shape (Context / Decision / Reason / Areas affected).
- **AC-A3 (PRD AC-1):** `docs/context/architecture.md` PRP artifact paths table contains a `.worktrees/<feature>/` row describing the worktree location, idempotency semantics, and lifecycle (persists until Pillar 3 removes it).
- **AC-A4 (PRD AC-12, AC-13, AC-14):** `documentation/reference/commands.html` `/relay-worktree` heading carries a `badge--done` "implemented" badge; the kv-block contains at minimum Input, Output, Mode, Preconditions, Idempotency, Bootstrap, and Notes rows; the `--no-worktree` opt-out behavior is documented in the Notes row.
- **AC-A5 (PRD AC-12, AC-16):** `documentation/roadmap/status.html` no longer lists `/relay-worktree` under "Pending (Pillar 2 leftovers)"; the command appears in the "What's shipped > Plugin artifacts > Commands" list with `(v0.11.0)` annotation; the "12-command surface" sentence no longer names `/relay-worktree` as pending.
- **AC-A6 (PRD AC-12 — release cut success signal):** `documentation/changelog.html` contains a `0.11.0 — 2026-05-11` release block above the `0.10.1` block, with both `<h3 id="v0-11-0-added">` and `<h3 id="v0-11-0-changed">` sub-sections; the `Unreleased` block is updated to reference `v0.11.0`.
- **AC-A7 (PRD AC-12 — release cut success signal):** `plugins/relay/.claude-plugin/plugin.json` `"version"` field equals `"0.11.0"`; the changelog v0.11.0 `Changed` section contains the canonical §7.5 plugin-bump sentence. The two version values are byte-identical (AGENTS.md §7.5 compliance).
- **AC-A8 NAV / search-index invariant preserved (PRD AC-12, AC-15 doc-update implication):** No new HTML pages created; `documentation/assets/js/app.js` NAV array is unchanged; `documentation/assets/data/search-index.json` is unchanged. AGENTS.md §2 invariant 7 (three-file registration rule for new pages) is satisfied by the fact that no new pages are added. Task 8 owns verification of this invariant and its VALIDATE command must pass with output `0` on both `git diff` and `git status` checks.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| commands.html edit misses the full-page read first, breaking existing structure around the `/relay-worktree` section | M | Medium — surrounding elements (h2 heading, adjacent h3 entries) may be damaged | AGENTS.md §9 mandates full-page read before editing; implementer must use an `old_string` spanning from the bare `<h3 id="relay-worktree">` through the closing `</div>` of the stub kv-block to make the Edit unambiguous |
| changelog block inserted in wrong position (e.g., before the Unreleased block or inside v0.10.1) | L | Medium — version history ordering broken; readers see wrong latest release | Task 6 specifies "immediately before `<h2 id="v0-10-1">`" as the insertion anchor; the `old_string` for the Edit should include enough surrounding lines (the Unreleased closing `</p>` + blank line) to ensure a unique match |
| §7.5 binding contract missed: changelog bumped but plugin.json not bumped in same pass | L | High — plugin cache drift; users on v0.10.0 do not see `/relay-worktree` despite pulling | Task 7 is the last edit task; the Level 2 validation command explicitly checks alignment between changelog and plugin.json versions before the plan is considered complete |
| decisions.md entry violates the four-field canonical shape (e.g., omits "Areas affected") | L | Low — cosmetic; future agents consult the entry and find incomplete data | Task 2 MIRROR points to the template comment at lines 439–449 of decisions.md; implementer must follow the four-field shape exactly for all five decisions |
| status.html edit removes the wrong bullet (e.g., `/relay-pr` bullet instead of `/relay-worktree`) | L | Medium — /relay-pr would incorrectly appear as shipped | VALIDATE for Task 5 checks that relay-worktree no longer appears in the pending context while also confirming the Commands list is updated |
| NAV or search-index accidentally modified by a task edit (e.g., a Write call targeting the wrong path) | L | High — AGENTS.md §2 invariant 7 violation; new feature appears to users as undiscoverable | Task 8 explicitly verifies both files via `git diff`; Level 3 integration script also includes the check; any non-zero output is a FAIL that blocks plan completion |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Edit strategy for HTML files.** Because HTML files are large, the implementer should use `Read` with a narrow `offset`+`limit` to locate the exact lines before each `Edit`, then use a sufficiently large `old_string` (including 2–3 lines of surrounding context) to guarantee a unique match. Never use `Write` to rewrite an entire HTML file — the diff would be enormous and the risk of structural regression is high.

**Atomic commit requirement.** All seven tasks belong in a single logical commit. The AGENTS.md §7.5 binding contract requires the `plugin.json` bump and the changelog entry to land in the same commit. The implementer should complete all seven tasks before running the Level 3 integration validation that cross-checks all files simultaneously. Task 8 runs after the commit is staged (or before it is committed) to confirm the invariant.

**AGENTS.md §9 full-page read discipline.** Before editing `documentation/reference/commands.html`, `documentation/roadmap/status.html`, and `documentation/changelog.html`, the implementer must read each file in full (or at minimum the relevant sections with surrounding context) to confirm structural assumptions. These files are moderately large; a missed reading risks breaking the sidebar, TOC, or prev/next navigation.

**decisions.md D1/D2/D6/D7/D8 grouping.** The five decisions are grouped under a single `## [2026-05-11]` heading because they were all made as a cohesive architectural package during relay-worktree Phases 1–3. This mirrors the precedent of the `[2026-04-30]` entry that grouped five implementation-authoring decisions in one block. Splitting them into five separate `## [date]` headings would be correct but verbose; a single heading with labeled sub-sections is more scannable.

**Task 8 is verification-only.** Task 8 owns no file edits. Its sole purpose is to provide an explicit task-level owner for AC-A8, ensuring the NAV/search-index invariant is checked as a discrete step and not merely buried in the aggregate Level 3 validation. The VALIDATE command for Task 8 is the canonical gate for AC-A8.

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Implemented: 2026-05-11*
*Status: IMPLEMENTED*
