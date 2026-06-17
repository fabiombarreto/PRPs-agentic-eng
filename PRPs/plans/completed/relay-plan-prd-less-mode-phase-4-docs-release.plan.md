# Feature: Docs + release (Phase 4 of relay-plan-prd-less-mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: documentation/ update (AGENTS.md three-file registration rule applies to existing-page edits — changelog.html required; search-index.json excerpt update required for Commands page); plugin.json version bump (2026-04-30 §7.5 lock-step — this release ships plugin assets); docs/decisions.md new dated entry superseding the 2026-05-15 "not yet implemented" framing; cross-cutting artifact creation (api-reference.md + commands.html + changelog.html + plugin.json + decisions.md all touched in a single release commit)
- Decisions found:
  - 2026-04-30 "Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html" — this release ships plugin assets (relay-plan.md, plan-writer.md, plan-reviewer.md, relay-implement.md, implementer.md, code-reviewer.md, code-reviewer-semantic.md from Phases 1–3) plus documentation/, so a minor bump is required and plugin.json MUST be bumped to the same version in the same commit.
  - 2026-05-15 "/relay-plan PRD-less mode: registered future capability, not yet implemented" — this phase's new decisions.md entry supersedes this framing; the 2026-05-15 entry is NOT deleted (ADR convention; the old entry documents the prior state and is required for audit trail).
  - 2026-04-19 "PRP artifacts live under PRPs/, never under .claude/" — no pipeline artifact goes under .claude/.
  - 2026-04-19 "Interactivity boundary: PRD interactive, downstream autonomous" — no user dialogue in this phase.
  - 2026-04-30 "D8 post-approval mutations are best-effort atomic with rollback note" — Mutation c (source PRD row N flip) is a no-op for PRD-less plans; documented in the new decisions.md entry.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — docs and plugin.json go to their canonical paths, never .claude/.
  - "Treating plugins/prp-core/ as active relay code" — prp-plan is cited as reference only; never imported.
- Applicable architectural rules:
  - documentation/AGENTS.md §6 three-file registration rule: every change to an existing documentation/ page (commands.html) requires a changelog.html entry (§6.3); for search-index.json the excerpt for the Commands page must be corrected (still says "Twelve commands plus one placeholder" — stale since v0.11.0).
  - documentation/AGENTS.md §7.5 binding contract: every minor/major changelog release cut MUST bump plugin.json to the same version in the same commit; the changelog Changed section MUST list the plugin bump.
  - documentation/AGENTS.md §2 core invariants: no build step, no external dependencies, no new CSS/JS files, no inline styles, no emojis.
  - docs/decisions.md supersession convention: new entry created with today's date; old 2026-05-15 entry left intact with a cross-reference.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-plan-prd-less-mode.prd.md` — Implementation Phases row 4:
  "Docs + release" — Goal: Surface documented and version cut — Success signal:
  Changelog entry + matching plugin.json bump; decisions.md records the shipped
  contract.

## Summary

Phase 4 is the release-cut phase for the `/relay-plan` PRD-less description-only
mode shipped in Phases 1–3. It updates every documentation surface that
currently describes `/relay-plan` as PRD-only, adds a new dated entry to
`docs/decisions.md` superseding the 2026-05-15 "not yet implemented" framing,
cuts a new minor release in `documentation/changelog.html`, bumps
`plugins/relay/.claude-plugin/plugin.json` to the same version per the 2026-04-30
§7.5 binding contract, and corrects the stale Commands search-index excerpt.
No new pages are created; no new CSS or JS behavior is introduced; the
documentation/AGENTS.md three-file rule is satisfied via the changelog entry
and search-index update (NAV is not affected because no new page is added).

## User Story

As a relay developer or plugin user,
I want the shipped PRD-less mode to be reflected in all documentation surfaces
and in the plugin.json version,
So that the feature is discoverable in the Commands reference, api-reference,
and decisions log, and so that users who pull the updated plugin get a fresh
cache entry that includes all the Phase 1–3 agent changes.

## Problem Statement

Phases 1–3 of the `relay-plan-prd-less-mode` PRD shipped the full behavioral
implementation: Phase 0 input-type detection in `/relay-plan`, the
description-mode `plan-writer` entrypoint, `plan-reviewer` R8 description-mode
variant, `/relay-implement` P3 branch and D8 Mutation c no-op, `implementer`
flat-filename tolerance, and `code-reviewer`/`code-reviewer-semantic` AC-source
substitution. However, three documentation surfaces still describe the old
PRD-only behavior or the capability as deferred:

- `documentation/reference/commands.html` line 77–79: a `callout--note` block
  titled "Planned: PRD-less mode" describes the feature as a future capability
  not yet implemented, cross-referencing the 2026-05-15 decisions.md entry.
- `docs/api-reference.md` line 40: the `/relay-plan` Input cell describes only
  the APPROVED PRD input path with no mention of the description-only mode.
- `docs/decisions.md` line 523: the 2026-05-15 entry states "It is NOT
  implemented" and forbids any bypass before a dedicated PRD — this framing is
  now superseded by the shipped implementation.

Additionally, `plugins/relay/.claude-plugin/plugin.json` is at `0.12.0` but
Phases 1–3 shipped multiple plugin assets; the §7.5 rule requires a version
bump on the next minor release cut that ships plugin assets. The Commands page
search-index excerpt still reads "Twelve commands plus one placeholder", which
has been stale since v0.11.0.

## Solution Statement

Six targeted edits, each scoped to its file:

1. **`docs/api-reference.md`**: extend the `/relay-plan` Input cell to document
   the description-mode branch (free-text argument → description mode; .prd.md
   path → PRD mode), referencing the detection logic and the flat `<slug>.plan.md`
   output filename.
2. **`documentation/reference/commands.html`**: replace the `callout--note`
   "Planned: PRD-less mode" block with a `callout--success` "Shipped: PRD-less
   mode" block describing the detection logic, the flat filename convention, and
   the Decision Gate preservation; update the Input `<dd>` to name both input
   modes; update the Output `<dd>` to include the flat `<slug>.plan.md` pattern.
3. **`documentation/changelog.html`**: add a new versioned release entry (cut
   from Unreleased or as a new block) documenting the PRD-less mode feature,
   the decisions.md supersession, the api-reference and commands.html updates,
   and the plugin.json bump.
4. **`plugins/relay/.claude-plugin/plugin.json`**: bump `version` from `0.12.0`
   to `0.13.0` per §7.5 — matching the new changelog release.
5. **`docs/decisions.md`**: add a new `[2026-06-16]` entry titled "`/relay-plan`
   PRD-less mode: SHIPPED — supersedes the 2026-05-15 'not yet implemented'
   framing". The entry records the shipped contract, names the files changed
   in Phases 1–3, documents the Mutation c no-op, the flat filename convention,
   and the description-mode R8 exemption. The 2026-05-15 entry is left intact.
6. **`documentation/assets/data/search-index.json`**: correct the Commands page
   excerpt from the stale "Twelve commands plus one placeholder" to an accurate
   description that includes the PRD-less mode.

## Metadata

| Key | Value |
|-----|-------|
| Type | docs |
| Complexity | Low |
| Systems Affected | docs/api-reference.md; documentation/reference/commands.html; documentation/changelog.html; documentation/assets/data/search-index.json; plugins/relay/.claude-plugin/plugin.json; docs/decisions.md |
| Dependencies | Phases 1, 2, 3 complete (all status: complete in PRD) |
| Estimated Tasks | 6 |
| Source PRD line ref | PRPs/prds/relay-plan-prd-less-mode.prd.md row 4 |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 1–481 | Binding contract for all documentation/ changes: three-file registration rule (§6), changelog format (§7), §7.5 plugin.json lock-step, core invariants (§2) |
| P0 | `documentation/changelog.html` | 1–120 | Current changelog structure, Unreleased block, v0.12.0 entry shape — must mirror exactly |
| P0 | `documentation/reference/commands.html` | 61–79 | Current /relay-plan kv-block and the "Planned: PRD-less mode" callout to be replaced |
| P0 | `plugins/relay/.claude-plugin/plugin.json` | 1–9 | Current version `0.12.0` — must be bumped to `0.13.0` |
| P0 | `docs/decisions.md` | 523–537 | The 2026-05-15 "not yet implemented" entry to be superseded (not deleted) |
| P1 | `docs/api-reference.md` | 40 | Current /relay-plan Input cell — description-mode branch to be added |
| P1 | `documentation/assets/data/search-index.json` | 88–92 | Stale Commands excerpt — must be corrected |
| P1 | `PRPs/prds/relay-plan-prd-less-mode.prd.md` | 162–191 | Phase 4 scope, success signal, and the full AC list used for traceability |

## Patterns to Mirror

### Changelog release block shape (v0.12.0)

```html
# SOURCE: documentation/changelog.html:38-65

      <h2 id="v0-12-0">0.12.0 — 2026-06-14</h2>

      <p>context-builder now generates a mandatory test guardrail ...</p>

      <h3 id="v0-12-0-added">Added</h3>
      <ul>
        <li><strong><code>plugins/relay/skills/context-builder/SKILL.md</code></strong> &mdash; ...</li>
      </ul>

      <h3 id="v0-12-0-changed">Changed</h3>
      <ul>
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.11.2</code> &rarr; <code>0.12.0</code> per the 2026-04-30 &sect;7.5 binding contract...</li>
      </ul>
```

Task 3 (changelog entry) copies this exact structure with new version, date, and content.

### plugin.json version bump canonical wording in changelog

```html
# SOURCE: documentation/changelog.html:51

        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.11.2</code> &rarr; <code>0.12.0</code> per the 2026-04-30 &sect;7.5 binding contract. Users running <code>/plugin</code> after pulling this version will get a fresh <code>relay/0.12.0/</code> cache directory with all newly-shipped commands and agents registered.</li>
```

Task 3 mirrors this wording for `0.12.0` → `0.13.0`.

### callout--note HTML shape (to be converted to callout--success)

```html
# SOURCE: documentation/reference/commands.html:76-79

      <div class="callout callout--note">
        <div class="callout__title">Planned: PRD-less mode</div>
        <p>A future version of <code>/relay-plan</code> will accept a short feature description string directly &mdash; no APPROVED PRD required &mdash; analogous to how <code>prp-plan</code> (the upstream reference plugin) works. The intention is registered in <code>docs/decisions.md</code> (2026-05-15). The current PRD-required contract (preconditions P1&ndash;P4) remains the only operative behavior until a dedicated PRD for this capability is authored and approved.</p>
      </div>
```

Task 2 replaces this block with a `callout--success` block titled "Shipped: PRD-less mode".

### /relay-plan Input kv-block current text

```html
# SOURCE: documentation/reference/commands.html:63-65

      <div class="kv">
        <dt>Input</dt>
        <dd>A PRD file with status <code>APPROVED</code> (ending with <code>*Status: APPROVED*</code>) containing a parseable Implementation Phases table with at least one row whose <code>Status</code> is <code>pending</code> and whose <code>Depends</code> cell is empty or references only <code>complete</code> rows.</dd>
```

Task 2 extends the Input `<dd>` to describe both modes.

### docs/decisions.md entry shape (2026-05-15 entry to be superseded)

```markdown
# SOURCE: docs/decisions.md:523-537

## [2026-05-15] /relay-plan PRD-less mode: registered future capability, not yet implemented

**Context:** ...
**Decision:** PRD-less mode for `/relay-plan` ... is a **registered future capability**. It is NOT implemented.
**Reason:** ...
**Out of scope until a dedicated PRD is approved:**
...
**Areas affected (when eventually shipped):** ...
```

Task 5 adds a new `## [2026-06-16]` entry immediately after line 537, before the `## [2026-05-15] Runnable worktree environments` entry. The 2026-05-15 entry is not deleted.

### search-index.json entry shape

```json
# SOURCE: documentation/assets/data/search-index.json:88-92

  {
    "title": "Commands",
    "path": "reference/commands.html",
    "category": "Reference",
    "excerpt": "Twelve commands plus one placeholder: /relay-prd (interactive PRD), /relay-execute (orchestrator), /relay-test, /relay-test-review, /relay-implement, and writer/reviewer pairs for each pipeline stage."
  }
```

Task 6 updates this excerpt to reflect 13 commands and the PRD-less mode.

### api-reference.md /relay-plan current Input cell

```markdown
# SOURCE: docs/api-reference.md:40

| `/relay-plan <prd-path>` ✅ **implemented** | approved PRD (status `*Status: APPROVED*` at the trailer) with at least one Implementation Phases row in `pending` whose `Depends` cell is empty or all-complete | ...
```

Task 1 extends the Input cell (second pipe-delimited column) to document the description-mode branch.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/api-reference.md` | UPDATE | Extend `/relay-plan` Input cell to document description-mode branch (AC-A1, PRD Should-item "Docs + release") |
| `documentation/reference/commands.html` | UPDATE | Replace "Planned: PRD-less mode" callout with "Shipped" block; update Input/Output kv-rows (AC-A2; AGENTS.md §9 modify-existing-page checklist) |
| `documentation/changelog.html` | UPDATE | Add v0.13.0 release entry per AGENTS.md §6.3 / §7 (AC-A3; three-file registration rule) |
| `documentation/assets/data/search-index.json` | UPDATE | Correct stale Commands excerpt (AGENTS.md §6.2; excerpt says "Twelve commands" which is stale since v0.11.0) |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Bump version `0.12.0` → `0.13.0` per §7.5 lock-step binding contract (AC-A4) |
| `docs/decisions.md` | UPDATE | Add new `[2026-06-16]` entry superseding the 2026-05-15 "not yet implemented" framing without deleting that entry (AC-A5) |

## NOT Building (Scope Limits)

- **A lightweight PRD generated under the hood** — explicitly rejected during PRD authoring; description mode never synthesizes a PRD. This phase documents the true PRD-less path only.
- **`/relay-execute` integration** — the orchestrator's state machine is PRD-table-driven; description-mode plans are outside `/relay-execute`. This phase does not document or imply otherwise.
- **`--no-prd` flag** — dispatch is by input-type detection, no flag. This phase does not add a flag entry to the documentation.
- **TDD chain (B7/B8) for description mode** — MVP supports `tdd: false` targets only; the documentation callout notes this explicitly.
- **New documentation pages** — no new HTML files; the three-file rule's NAV update (§6.1) is triggered only by new pages, not existing-page modifications. No NAV entry is added.
- **Modifying or deleting the 2026-05-15 decisions.md entry** — it is left intact as the historical record; only a new entry is added.
- **Importing or extending `prp-core` assets** — `prp-plan` is cited as behavioral reference in the new decisions.md entry only; nothing is imported.

## Step-by-Step Tasks

### Task 1: UPDATE docs/api-reference.md

- **ACTION**: Extend the `/relay-plan` row's Input cell (second pipe-delimited column, line 40) to document both input modes. Add a description-mode branch sentence after the existing PRD-mode description: "**Description mode (new):** Any non-empty argument that does not resolve to a `.prd.md` file and does not contain an `Implementation Phases` table enters description mode; plan written to `PRPs/plans/<slug>.plan.md` (flat filename, no PRD back-fill)."
- **MIRROR**: See `docs/api-reference.md:40` pattern above — extend the existing Input cell inline without changing the table structure.
- **Implements: AC-A1**
- **VALIDATE**: `grep -n "Description mode" C:\repos\PRPs-agentic-eng\docs\api-reference.md`
  Expected: one match on the updated line 40.

### Task 2: UPDATE documentation/reference/commands.html

- **ACTION**: Two sub-edits in `documentation/reference/commands.html`:
  (a) Replace the `<div class="callout callout--note">` block (lines 76–79) with a `<div class="callout callout--success">` block titled "Shipped: PRD-less mode" describing: input-type detection logic, flat `<slug>.plan.md` output, Decision Gate preserved, full chain through `/relay-implement` supported, `tdd: true` targets deferred to a future branch.
  (b) Extend the Input `<dd>` (line 65) to name both modes: "**PRD mode:** A PRD file with status `APPROVED` … **Description mode (new, v0.13.0):** Any non-empty free-text argument that does not resolve to a `.prd.md` file and does not contain an Implementation Phases table — plan written to `PRPs/plans/<slug>.plan.md`."
  Update the Output `<dd>` to mention both filename patterns.
- **MIRROR**: See `callout--note` pattern at `documentation/reference/commands.html:76-79` (replace with `callout--success`); see AGENTS.md §5.1 for callout class variants.
- **Implements: AC-A2**
- **VALIDATE**: `findstr /n "callout--success" C:\repos\PRPs-agentic-eng\documentation\reference\commands.html`
  Expected: at least one match in the /relay-plan section. Also verify no "Planned: PRD-less mode" text remains:
  `findstr /n "Planned: PRD-less" C:\repos\PRPs-agentic-eng\documentation\reference\commands.html`
  Expected: zero matches.

### Task 3: UPDATE documentation/changelog.html

- **Implements: AC-A3**
- **ACTION**: In `documentation/changelog.html`, insert a new versioned release block for `0.13.0` between the `<h2 id="unreleased">` section and the existing `<h2 id="v0-12-0">` block (after line 36). The block structure:
  ```html
  <h2 id="v0-13-0">0.13.0 — 2026-06-16</h2>
  <p>[prose summary of PRD-less mode feature]</p>
  <h3 id="v0-13-0-added">Added</h3>
  <ul>
    <li>... /relay-plan description-only mode ...</li>
  </ul>
  <h3 id="v0-13-0-changed">Changed</h3>
  <ul>
    <li>... commands.html /relay-plan section updated ...</li>
    <li>... api-reference.md /relay-plan Input extended ...</li>
    <li>... decisions.md new [2026-06-16] entry ...</li>
    <li>... search-index.json Commands excerpt corrected ...</li>
    <li>... plugin.json version bumped 0.12.0 → 0.13.0 per §7.5 ...</li>
  </ul>
  ```
  Also clear the Unreleased section's Fixed sub-entry (move it into this release block or preserve it as a separate item under the new release's Fixed section).
- **MIRROR**: See `documentation/changelog.html:38-65` — v0.12.0 block shape; `documentation/changelog.html:51` — canonical plugin.json bump wording.
- **VALIDATE**: `findstr /n "v0-13-0" C:\repos\PRPs-agentic-eng\documentation\changelog.html`
  Expected: at least two matches (the `<h2 id>` and the `<h3 id>` sub-entries).

### Task 4: UPDATE plugins/relay/.claude-plugin/plugin.json

- **ACTION**: Change the `"version"` field from `"0.12.0"` to `"0.13.0"` in `plugins/relay/.claude-plugin/plugin.json`.
- **MIRROR**: See `plugins/relay/.claude-plugin/plugin.json:3` — current `"version": "0.12.0"`.
- **Implements: AC-A4**
- **VALIDATE**: `findstr /n "0.13.0" C:\repos\PRPs-agentic-eng\plugins\relay\.claude-plugin\plugin.json`
  Expected: one match on the version line.

### Task 5: UPDATE docs/decisions.md

- **Implements: AC-A5**
- **ACTION**: Insert a new entry `## [2026-06-16] /relay-plan PRD-less mode: SHIPPED — supersedes the 2026-05-15 "not yet implemented" framing` immediately after the existing `## [2026-05-15] /relay-plan PRD-less mode: registered future capability, not yet implemented` entry (after line 537, before the `## [2026-05-15] Runnable worktree environments` entry). The entry uses the canonical four-field shape (Context / Decision / Reason / Areas affected) and records:
  - Context: the 2026-05-15 entry registered the capability; this PRD (`relay-plan-prd-less-mode.prd.md`, APPROVED 2026-06-16) and Phases 1–3 shipped it.
  - Decision: PRD-less mode IS now implemented. The five Phase 1–3 behavior changes (detection, plan-writer, plan-reviewer R8, relay-implement/implementer, code-reviewer). Mutation c no-op. Flat filename. D8 Mutations a+b preserved. tdd: true deferred.
  - Reason: the 2026-05-15 entry's precondition ("before a dedicated PRD is approved") is now satisfied.
  - Areas affected: `/relay-plan` (Phase 0 detection), `plan-writer` (description-only entrypoint), `plan-reviewer` (R8 description-mode variant), `/relay-implement` (P3 branch, D8 Mutation c no-op), `implementer` (source-read tolerance + flat-filename tolerance), `code-reviewer`/`code-reviewer-semantic` (AC-source substitution), `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json`.
  The 2026-05-15 entry is left intact and unchanged.
- **MIRROR**: See `docs/decisions.md:523-537` — 2026-05-15 entry four-field shape; see `docs/decisions.md:596-604` — template comment at file end for the canonical structure.
- **VALIDATE**: `findstr /n "2026-06-16" C:\repos\PRPs-agentic-eng\docs\decisions.md`
  Expected: at least one match for the new entry header. Also verify the 2026-05-15 entry still exists:
  `findstr /n "2026-05-15.*PRD-less" C:\repos\PRPs-agentic-eng\docs\decisions.md`
  Expected: still present (not deleted).

### Task 6: UPDATE documentation/assets/data/search-index.json

- **ACTION**: Update the Commands page entry (lines 88–92) to replace the stale excerpt `"Twelve commands plus one placeholder: ..."` with an accurate one: `"Thirteen commands plus one Pillar 3 placeholder. /relay-plan now supports a description-only (PRD-less) mode in addition to the standard APPROVED-PRD mode. Full command surface by role: writers, reviewers, infra, orchestrator, and Pillar 3."`.
- **MIRROR**: See `documentation/assets/data/search-index.json:88-92` — current stale excerpt; see AGENTS.md §6.2 for search index entry shape requirements.
- **Implements: AC-A6**
- **VALIDATE**: `findstr /n "Thirteen commands" C:\repos\PRPs-agentic-eng\documentation\assets\data\search-index.json`
  Expected: one match on the updated excerpt.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Verify JSON validity of plugin.json after the version bump
node -e "JSON.parse(require('fs').readFileSync('C:/repos/PRPs-agentic-eng/plugins/relay/.claude-plugin/plugin.json','utf8')); console.log('plugin.json valid JSON')"

# Verify JSON validity of search-index.json after the excerpt update
node -e "JSON.parse(require('fs').readFileSync('C:/repos/PRPs-agentic-eng/documentation/assets/data/search-index.json','utf8')); console.log('search-index.json valid JSON')"

# Verify HTML is non-empty and contains the expected h2 id for the new changelog entry
findstr /n "v0-13-0" C:\repos\PRPs-agentic-eng\documentation\changelog.html
```

### Level 2 CONTENT_INVARIANTS

```bash
# AC-A1: api-reference.md documents description mode
findstr /n "Description mode" C:\repos\PRPs-agentic-eng\docs\api-reference.md

# AC-A2: commands.html no longer says "Planned: PRD-less mode"
findstr /n "Planned: PRD-less" C:\repos\PRPs-agentic-eng\documentation\reference\commands.html
# Expected: zero matches

# AC-A2: commands.html has the shipped callout
findstr /n "Shipped: PRD-less" C:\repos\PRPs-agentic-eng\documentation\reference\commands.html
# Expected: one or more matches

# AC-A3: changelog entry for v0.13.0 exists
findstr /n "0.13.0" C:\repos\PRPs-agentic-eng\documentation\changelog.html

# AC-A4: plugin.json version is 0.13.0
findstr /n "0.13.0" C:\repos\PRPs-agentic-eng\plugins\relay\.claude-plugin\plugin.json

# AC-A5: decisions.md 2026-06-16 entry exists
findstr /n "2026-06-16" C:\repos\PRPs-agentic-eng\docs\decisions.md

# AC-A5: decisions.md 2026-05-15 PRD-less entry still exists (not deleted)
findstr /n "2026-05-15.*PRD-less" C:\repos\PRPs-agentic-eng\docs\decisions.md

# §7.5 check: changelog and plugin.json version match
node -e "const j=JSON.parse(require('fs').readFileSync('C:/repos/PRPs-agentic-eng/plugins/relay/.claude-plugin/plugin.json','utf8')); const c=require('fs').readFileSync('C:/repos/PRPs-agentic-eng/documentation/changelog.html','utf8'); const ok=c.includes('0.13.0'); console.log('plugin.json version:', j.version, '| changelog has 0.13.0:', ok); if(j.version!=='0.13.0'||!ok) process.exit(1)"

# Three-file rule (AGENTS.md §6): changelog updated (verified above); search-index updated
findstr /n "Thirteen commands" C:\repos\PRPs-agentic-eng\documentation\assets\data\search-index.json
```

### Level 3 INTEGRATION

```bash
# End-to-end: open changelog.html in a browser and confirm v0.13.0 section renders,
# sidebar highlight for "Changelog" appears, and prev/next links are intact.
# (Manual step — automated equivalent: confirm the h2 and h3 id slugs are present)
findstr /n "id=\"v0-13-0" C:\repos\PRPs-agentic-eng\documentation\changelog.html

# Verify no .claude/ path references were introduced in any changed file
findstr /n "\.claude/PRPs" C:\repos\PRPs-agentic-eng\docs\decisions.md
findstr /n "\.claude/PRPs" C:\repos\PRPs-agentic-eng\documentation\changelog.html
# Expected: zero matches in each

# Verify the decisions.md new entry uses the canonical four-field shape
findstr /n "Areas affected" C:\repos\PRPs-agentic-eng\docs\decisions.md
# Expected: the new 2026-06-16 entry contributes one more "Areas affected" line
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1, AC-3):** `docs/api-reference.md` line 40's `/relay-plan` Input cell documents both input modes: the existing PRD mode (APPROVED `.prd.md` path) and the new description mode (free-text argument not resolving to `.prd.md` and not containing an Implementation Phases table → flat `PRPs/plans/<slug>.plan.md`). `grep "Description mode" docs/api-reference.md` returns one match.
- **AC-A2 (PRD AC-1, AC-3, AC-5):** `documentation/reference/commands.html` no longer contains the "Planned: PRD-less mode" callout text; it contains a `callout--success` block titled "Shipped: PRD-less mode" describing the input-type detection logic, the flat filename output, Decision Gate preservation, and the `/relay-implement` chain support. The Input `<dd>` documents both modes. `findstr "Planned: PRD-less" commands.html` returns zero matches.
- **AC-A3 (PRD AC-1, AC-3):** `documentation/changelog.html` contains a versioned release block `<h2 id="v0-13-0">0.13.0 — 2026-06-16</h2>` with at least one Added item (PRD-less mode) and a Changed item for the plugin.json bump using the §7.5 canonical wording. The block appears before the `v0-12-0` entry and after the Unreleased section.
- **AC-A4 (PRD AC-1, AC-3):** `plugins/relay/.claude-plugin/plugin.json`'s `"version"` field equals `"0.13.0"`, matching the new changelog release version. `node -e "..."` JSON validation passes. `findstr "0.13.0" plugin.json` returns one match.
- **AC-A5 (PRD AC-1, AC-6):** `docs/decisions.md` contains a new `## [2026-06-16]` entry recording the shipped PRD-less mode contract in the canonical four-field shape (documenting the full implementation chain through `/relay-implement`). The existing `## [2026-05-15] /relay-plan PRD-less mode: registered future capability, not yet implemented` entry is still present and unmodified. `findstr "2026-06-16" decisions.md` returns at least one match; `findstr "2026-05-15.*PRD-less" decisions.md` still returns its match.
- **AC-A6 (PRD AC-3):** `documentation/assets/data/search-index.json` Commands page excerpt no longer says "Twelve commands plus one placeholder"; it accurately reflects 13 commands and mentions the PRD-less mode (the shipped description-only plan generation capability). `findstr "Thirteen commands" search-index.json` returns one match.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Changelog HTML structure drift breaks sidebar/TOC in the browser | L | M | Mirror v0.12.0 block structure exactly; include all required `id` attributes on h2/h3; validate with `findstr` on id slugs post-edit |
| §7.5 version mismatch (plugin.json bumped but changelog entry says different version, or vice versa) | L | H | Level 2 CONTENT_INVARIANTS node script cross-checks both files; any mismatch exits 1 |
| 2026-05-15 decisions.md entry accidentally deleted or modified | L | H | Level 2 CONTENT_INVARIANTS `findstr` verifies the old entry still exists; `Edit` with verbatim old_string is narrow and will fail closed if the surrounding text was already changed |
| search-index.json becomes invalid JSON after excerpt update | L | M | Level 1 STATIC_ANALYSIS node JSON.parse check catches this immediately |
| commands.html callout--success class not in app.css (AGENTS.md §5.1 violation) | L | M | AGENTS.md §5.1 table lists `callout--success` as an existing variant (green); no new CSS needed |
| New decisions.md entry inserted at wrong location (between two 2026-05-15 entries) | M | L | Task 5 VALIDATE grep for both the new entry and the two 2026-05-15 entries; review output confirms ordering |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Phase type rationale:** This phase is classified `docs` because all six files in "Files to Change" are documentation files or configuration (`.md`, `.html`, `.json`) with no application source. There is no test-framework invocable deliverable; VALIDATE commands use `findstr`/`grep` and `node -e JSON.parse` — standard docs-phase validation tools. The `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption branch applies per the 2026-05-14 `phase_type` decision.

**Version bump rationale:** Phases 1–3 of this PRD shipped the following plugin assets: `plugins/relay/commands/relay-plan.md` (Phase 0 detection + description-mode precondition branch), `plugins/relay/agents/plan-writer.md` (description-only entrypoint), `plugins/relay/agents/plan-reviewer.md` (R8 description-mode variant), `plugins/relay/commands/relay-implement.md` (P3 branch + D8 Mutation c no-op), `plugins/relay/agents/implementer.md` (source-read tolerance + flat-filename parse tolerance), `plugins/relay/agents/code-reviewer.md` + `plugins/relay/agents/code-reviewer-semantic.md` (AC-source substitution). Per §7.5, a release that ships plugin assets requires a minor version bump. Bumping `0.12.0` → `0.13.0` is the correct next minor version.

**AGENTS.md three-file rule applicability:** Phase 4 modifies one existing documentation page (`commands.html`) but does NOT add a new page. The three-file rule (§6 of AGENTS.md) mandates NAV + search-index + changelog updates only when a page is **added, renamed, or removed** (§6 header). For existing-page modifications, §9 (Workflow — modifying an existing page) applies: read the full page first (done via grounding), preserve structure, log in changelog. The changelog entry (Task 3) satisfies §9 item 5. The search-index excerpt update (Task 6) is a correction of stale content, triggered by the content change to the Commands page, not by the three-file addition rule per se.

**Unreleased block handling:** The current Unreleased block contains a single Fixed item (the changelog subtitle correction). This item should be included in the 0.13.0 release block as a Fixed sub-section rather than discarded. The Unreleased block is then left empty (or the empty section is preserved for future accumulation per §7.3).

*Generated: 2026-06-16*
*Approved: 2026-06-16*
*Implemented: 2026-06-16*
*Status: IMPLEMENTED*
