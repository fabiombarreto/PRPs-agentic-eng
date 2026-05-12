# Feature: Docs site + v0.11.1 patch release cut (Phase 4 of test-frameworks-empty-self-skip)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: cross-cutting documentation surface update; patch release cut bumping plugin.json under plugins/relay/; changelog.html entry required per documentation/AGENTS.md §7.4; PRP artifact paths under PRPs/ enforced
- Decisions found:
  - 2026-04-19 — PRP artifact paths under PRPs/ (never .claude/) — artifact path convention unchanged by this phase
  - 2026-04-30 — Plugin manifest version sync binding: patch bump requires plugin.json bump only when patch ships a plugin asset (plugins/relay/ is touched here — commands.html is a doc-only file, but plugin.json bump still required per §7.5 because the release includes behavior changes to plugin commands from Phases 1–3)
  - 2026-05-06 — TDD pair authorized; /relay-execute A.3.5 self-skips silently on tdd: false — precedent for the skipped_no_test_framework outcome being documented in the same api-reference row
  - 2026-05-11 D6 — Version bump: patch (v0.11.0 → v0.11.1) correct for behavior change under existing commands without new pages; AGENTS.md §7.5 binding
- Applicable anti-patterns:
  - docs/anti-patterns.md:60-66 — Writing pipeline artifacts under .claude/ — no writes to .claude/ in this phase; all edits are under docs/, documentation/, plugins/relay/.claude-plugin/
  - docs/anti-patterns.md:70-75 — Treating plugins/prp-core/ as active relay code — this phase does not reference prp-core
- Applicable architectural rules:
  - docs/context/architecture.md:84-98 — PRPs/ artifact paths; no .claude/ writes
  - documentation/AGENTS.md:332-355 — §7.5 plugin manifest version sync: patch (0.x.Y) that ships plugin assets requires plugin.json bump; behavior change to relay-test.md and relay-execute.md (Phases 1–3) satisfies the "ships plugin asset" condition
  - documentation/AGENTS.md:7 — Every new page registered in NAV + search index + changelog (this phase adds no new pages; only existing entries are updated)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-frameworks-empty-self-skip.prd.md` — Implementation Phases row 4:
  "Docs site + v0.11.1 patch release cut" — Goal: External documentation surface coherence (AC-8) — Success signal: all four files show v0.11.1 and the new outcome code; `git diff --stat` shows exactly these four files plus the two command files from Phases 1–2 and the decisions.md entry from Phase 3.

## Summary

This phase cuts the v0.11.1 patch release by updating four files to surface the `skipped_no_test_framework` outcome introduced in Phases 1–3: `docs/api-reference.md` (update `/relay-test` and `/relay-execute` command rows), `documentation/reference/commands.html` (add `skipped_no_test_framework` to the `/relay-test` kv-block Output and update the `/relay-execute` HALT outcome codes note), `documentation/changelog.html` (append new v0.11.1 entry citing dogfood evidence), and `plugins/relay/.claude-plugin/plugin.json` (bump `0.11.0` → `0.11.1`). The approach mirrors the v0.11.0 release structure exactly — same four-file pattern, same HTML entry format, same §7.5 plugin bump rule — differing only in content.

## User Story

```
As a relay pipeline operator reading the documentation
I want the docs and changelog to reflect the skipped_no_test_framework outcome and v0.11.1 version
So that I understand the /relay-test and /relay-execute self-skip behavior for framework-less projects and can confirm the patch release is coherent
```

## Problem Statement

After Phases 1–3 introduced the `/relay-test` Phase 0 self-skip gate and the `/relay-execute` Phase A.5.0 explicit handling, the external documentation surface (`docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json`) still reflects v0.11.0 semantics with no mention of `skipped_no_test_framework`. Operators reading the docs see an incomplete picture: the `skipped_no_test_framework` outcome code is not listed in the `/relay-test` Output row, the `/relay-execute` HALT codes note still states seven codes (missing the new structured log entry semantics), and the changelog has no v0.11.1 entry tracing this behavior change to its dogfood evidence. This is exactly the AC-8 documentation surface coherence criterion in the source PRD.

## Solution Statement

Update the four files that form the documentation surface of a relay release cut, following the exact precedent set by the v0.11.0 release (which updated the same four files in the same commit):

1. `docs/api-reference.md` — in the `/relay-test` row, append `skipped_no_test_framework` as a new graceful outcome (alongside the four existing HALT codes); in the `/relay-execute` row's HALT codes note, add a cross-reference to the new Phase A.5.0 `skipped_no_test_framework` structured log entry.
2. `documentation/reference/commands.html` — in the `/relay-test` kv-block Output `<dd>`, add `skipped_no_test_framework` as a new outcome below `FAILED_INFRA_UNRECOVERABLE`; in the `/relay-execute` Notes `<dd>`, update the HALT outcome codes note to reflect the new outcome and the A.5.0 test-stage skip handling.
3. `documentation/changelog.html` — replace the empty Unreleased block with a v0.11.1 entry dated 2026-05-12, following the v0.11.0 entry's structure (summary paragraph + Changed h3 + ul). Cite "Surfaced by 2026-05-11 relay-worktree dogfood, sessions A vs B" and cross-link to the new `docs/decisions.md` entry from Phase 3.
4. `plugins/relay/.claude-plugin/plugin.json` — bump `"version": "0.11.0"` → `"version": "0.11.1"` per §7.5.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation / release cut |
| Complexity | Low |
| Systems Affected | `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json` |
| Dependencies | Phases 1 (relay-test.md gate), 2 (relay-execute.md A.5.0), 3 (decisions.md entry) — all complete |
| Estimated Tasks | 4 atomic tasks (one per file) |
| Source PRD line ref | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` row 4, Phase Details "Phase 4: Docs site + v0.11.1 patch release cut" |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` | 59–68 (AC-8), 104–113 (Should MoSCoW), 174–178 (Phase 4 Details) | Phase scope, AC-8 success condition, and four-file release cut definition |
| P0 | `documentation/AGENTS.md` | 332–355 | §7.5 plugin manifest version sync binding rule for patch releases |
| P0 | `documentation/changelog.html` | 31–54 (Unreleased + v0.11.0 entry) | Exact HTML entry format to mirror for v0.11.1 |
| P0 | `documentation/reference/commands.html` | 173–228 (`/relay-test` and `/relay-execute` kv-blocks) | Current kv-block content to update in-place |
| P0 | `docs/api-reference.md` | 56–65 (`/relay-test` and `/relay-execute` rows) | Current row text to update in-place |
| P0 | `plugins/relay/.claude-plugin/plugin.json` | 1–9 | Version field to bump |
| P1 | `documentation/changelog.html` | 82–105 (v0.10.0 entry structure) | Cross-reference for multi-section Changed entry format |
| P1 | `PRPs/reports/relay-worktree/dogfood.md` | 78–81, 278–283 | Dogfood evidence to cite in the changelog entry |

## Patterns to Mirror

The following patterns are drawn from the live codebase research findings. Every snippet is sourced from a real file and line range.

---

### Pattern 1 — v0.11.0 changelog entry structure (HTML)

**SOURCE: `documentation/changelog.html`:35-54**

```html
<h2 id="v0-11-0">0.11.0 — 2026-05-11</h2>

<p><code>/relay-worktree</code> command ships, completing the 12-command Pillar 2 surface. [...]</p>

<h3 id="v0-11-0-added">Added</h3>

<ul>
  <li><strong><code>plugins/relay/commands/relay-worktree.md</code></strong> &mdash; [...]</li>
  ...
</ul>

<h3 id="v0-11-0-changed">Changed</h3>

<ul>
  <li><strong><code>documentation/reference/commands.html</code></strong> &mdash; [...]</li>
  ...
  <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.10.0</code> &rarr; <code>0.11.0</code> per the 2026-04-30 &sect;7.5 binding contract. [...]</li>
</ul>
```

Used by: Task 3 (append v0.11.1 entry to `documentation/changelog.html`). The v0.11.1 entry mirrors: same `<h2 id="v0-X-Y">` anchor format; summary paragraph; `<h3 id="v0-X-Y-changed">Changed</h3>` with `<ul>` of `<li>` items per changed file; same plugin.json bump bullet with `&rarr;` entity and §7.5 citation.

---

### Pattern 2 — Unreleased block replacement pattern

**SOURCE: `documentation/changelog.html`:31-34**

```html
<h2 id="unreleased">Unreleased</h2>

<p>No in-flight changes since the v0.11.0 cut on 2026-05-11. Future docs work accumulates here.</p>
```

Used by: Task 3 (changelog update). Replace this block by updating the `Unreleased` paragraph to reflect no further in-flight changes after the v0.11.1 cut, and insert the v0.11.1 entry immediately below it, above the v0.11.0 entry — newest-at-top convention.

---

### Pattern 3 — `/relay-test` kv-block Output `<dd>` (current state)

**SOURCE: `documentation/reference/commands.html`:173-193**

```html
<h3 id="relay-test"><code>/relay-test &lt;worktree&gt;</code> <span class="badge badge--done">implemented</span></h3>
<div class="kv">
  <dt>Input</dt>
  <dd>A worktree with pending code changes.</dd>
  <dt>Output</dt>
  <dd>
    Green state, or one of: <code>FAILED_AFTER_N_RETRIES</code>, <code>FAILED_TIME_BUDGET_EXCEEDED</code>, <code>FAILED_OSCILLATION</code>, <code>FAILED_INFRA_UNRECOVERABLE</code>.
    <br />Produces <code>PRPs/reports/&lt;feature&gt;/run.json</code> plus per-attempt <code>record.json</code> and <code>stdout.log</code>.
  </dd>
  ...
```

Used by: Task 2 (update `documentation/reference/commands.html`). Add `skipped_no_test_framework` to the Output `<dd>`: update to "Green state, or one of: `FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION`, `FAILED_INFRA_UNRECOVERABLE`, or `skipped_no_test_framework` (graceful self-skip when `test_frameworks: []` or `methodology.md` absent — no `run.json` written)."

---

### Pattern 4 — `/relay-execute` HALT outcome codes note (current state)

**SOURCE: `documentation/reference/commands.html`:224**

```html
<strong>HALT outcome codes (7):</strong> <code>FAILED_PLAN_REVIEW_BUDGET_EXCEEDED</code>, <code>FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED</code>, <code>FAILED_TEST_REVIEW_REJECTED</code>, plus four propagated from <code>/relay-implement</code> [...] and one from <code>/relay-test</code> (<code>FAILED_INFRA_UNRECOVERABLE</code>).<br><br>
```

Used by: Task 2 (update `documentation/reference/commands.html`). The `/relay-execute` HALT codes note currently states one propagated outcome from `/relay-test` (`FAILED_INFRA_UNRECOVERABLE`). Update to add a new test-stage note: "Test stage self-skip: when `test_frameworks: []` or `methodology.md` absent, Phase A.5.0 logs `skipped_no_test_framework` to `orchestrator_run_log` and proceeds to Phase A.6 without halting — not a HALT code but a structured outcome entry."

---

### Pattern 5 — `docs/api-reference.md` `/relay-test` row (current state)

**SOURCE: `docs/api-reference.md`:58**

```
| `/relay-test <worktree>` ✅ **implemented** | worktree with code | green state or `FAILED_AFTER_N_RETRIES` / `FAILED_TIME_BUDGET_EXCEEDED` / `FAILED_OSCILLATION` / `FAILED_INFRA_UNRECOVERABLE`. Encapsulates B1–B4: [...]. |
```

Used by: Task 1 (update `docs/api-reference.md`). Append `skipped_no_test_framework` to the Output cell: "or `skipped_no_test_framework` (graceful self-skip when `test_frameworks: []` or `methodology.md` absent; no `run.json` written; symmetric with `/relay-tdd` P4.a)."

---

### Pattern 6 — `plugin.json` version field (current state)

**SOURCE: `plugins/relay/.claude-plugin/plugin.json`:3**

```json
"version": "0.11.0",
```

Used by: Task 4 (bump `plugin.json`). Change to `"version": "0.11.1"`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/api-reference.md` | UPDATE | AC-8: surface `skipped_no_test_framework` in the `/relay-test` Output cell and update `/relay-execute` row to note Phase A.5.0 structured log entry |
| `documentation/reference/commands.html` | UPDATE | AC-8: add `skipped_no_test_framework` to `/relay-test` kv-block Output `<dd>` and update `/relay-execute` HALT codes note |
| `documentation/changelog.html` | UPDATE | AC-8 + AGENTS.md §7.4: append v0.11.1 entry (2026-05-12) with dogfood citation; replace Unreleased paragraph |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | AC-8 + AGENTS.md §7.5: bump version `0.11.0` → `0.11.1` (patch ships a plugin asset: relay-test.md and relay-execute.md from Phases 1–3 are under `plugins/relay/`) |

## NOT Building (Scope Limits)

- Auto-detection of test frameworks — explicit anti-pattern (`docs/anti-patterns.md:43-48`); no change to that policy in this phase.
- Changing `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra issues — this phase only documents the new self-skip path; the strict-halt semantics are preserved verbatim.
- New documentation pages — no new HTML files; AGENTS.md §7 three-file registration rule is not triggered because no new pages are added.
- Updating `documentation/roadmap/status.html` or `documentation/reference/agents.html` — no agent changes ship in v0.11.1; those pages are correct at their current state.
- Updating `docs/context/architecture.md` or `docs/decisions.md` — Phase 3 already appended the decisions.md entry; architecture.md requires no change for this behavior patch.
- Re-validating relay-worktree AC-16 cross-contamination methodology gap — separate concern, deferred per PRD.
- Updating `plugins/relay/agents/test-runner.md` to reflect `no_test_framework` ABORT_INFRA as defensive dead code — classified as Could in MoSCoW; out of scope for this phase.

## Step-by-Step Tasks

### Task 1: UPDATE `docs/api-reference.md`

- **ACTION**: In the Infrastructure / execution table, find the `/relay-test` row and append `skipped_no_test_framework` to the Output cell. Find the `/relay-execute` row and add a note about Phase A.5.0 structured log entry for `skipped_no_test_framework`. **AC-A1 (PRD AC-8).**
- **MIRROR**: Pattern 5 (`docs/api-reference.md`:58) — current `/relay-test` Output cell text; extend it with the new outcome code and a parenthetical matching the `/relay-tdd` symmetry note.
- **VALIDATE**: `grep -n "skipped_no_test_framework" docs/api-reference.md` — must return at least one match in the `/relay-test` row and one in the `/relay-execute` row (two distinct lines).

### Task 2: UPDATE `documentation/reference/commands.html`

- **ACTION**: In the `/relay-test` kv-block `<dt>Output</dt>` block, add `<code>skipped_no_test_framework</code>` as a graceful outcome after `FAILED_INFRA_UNRECOVERABLE` with a note that no `run.json` is written and that the self-skip fires when `test_frameworks: []` or `methodology.md` is absent (symmetric with `/relay-tdd` P4.a). In the `/relay-execute` Notes `<dd>` HALT codes paragraph, add a new sentence after the existing HALT codes list explaining Phase A.5.0 structured `skipped_no_test_framework` log entry as a non-HALT graceful path. **AC-A1 (PRD AC-8).**
- **MIRROR**: Patterns 3 and 4 (`documentation/reference/commands.html`:173-193, 224) — current kv-block Output and HALT codes paragraph; extend both in-place using the same HTML style (inline `<code>` tags, `<br />` for line breaks, no new CSS classes, no inline `style=""` attributes per AGENTS.md §2).
- **VALIDATE**: `grep -n "skipped_no_test_framework" documentation/reference/commands.html` — must return matches in both the `/relay-test` section and the `/relay-execute` section.

### Task 3: UPDATE `documentation/changelog.html`

- **ACTION**: Replace the current Unreleased paragraph body ("`No in-flight changes since the v0.11.0 cut on 2026-05-11. Future docs work accumulates here.`") with "`No in-flight changes since the v0.11.1 cut on 2026-05-12. Future docs work accumulates here.`". Immediately below the Unreleased block (and above the v0.11.0 entry), insert a new `<h2 id="v0-11-1">0.11.1 — 2026-05-12</h2>` entry following the v0.11.0 structural template (summary paragraph + `<h3 id="v0-11-1-changed">Changed</h3>` + `<ul>` with one `<li>` per changed file). The summary paragraph must: name the `skipped_no_test_framework` outcome; cite "Surfaced by 2026-05-11 relay-worktree dogfood, sessions A vs B"; note the symmetric shape with `/relay-tdd` P4.a; cross-reference the new `docs/decisions.md` entry from Phase 3. The Changed list covers all four files (api-reference.md, commands.html, changelog.html itself, plugin.json). The plugin.json `<li>` uses the canonical §7.5 template with `&rarr;` entity and version numbers. **AC-A2 (PRD AC-8).**
- **MIRROR**: Patterns 1 and 2 (`documentation/changelog.html`:31-54) — exact HTML structural format for the v0.11.0 entry; replicate `<h2 id>`, summary `<p>`, `<h3 id>`, `<ul>/<li>` nesting; use `&mdash;`, `&rarr;`, `&sect;` HTML entities (no Unicode em-dashes or arrows per AGENTS.md §2 no-inline-styles and §2 no-emoji conventions); no new CSS classes.
- **VALIDATE**: `grep -n "v0-11-1\|0.11.1\|skipped_no_test_framework\|dogfood" documentation/changelog.html` — must return matches in the new v0.11.1 entry block (at minimum: the `<h2 id="v0-11-1">` anchor, the version string, the outcome code, and the dogfood citation).

### Task 4: UPDATE `plugins/relay/.claude-plugin/plugin.json`

- **ACTION**: Change `"version": "0.11.0"` to `"version": "0.11.1"` in the JSON file. No other field changes. **AC-A3 (PRD AC-8) and AC-A4 (PRD AC-8).**
- **MIRROR**: Pattern 6 (`plugins/relay/.claude-plugin/plugin.json`:3) — single-field bump; preserve JSON formatting (2-space indentation, trailing comma where applicable, no trailing whitespace changes to other lines).
- **VALIDATE**: `grep -n "version" plugins/relay/.claude-plugin/plugin.json` — must return `"version": "0.11.1"`.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify JSON is well-formed after version bump
python -c "import json, sys; json.load(open('plugins/relay/.claude-plugin/plugin.json')); print('plugin.json: valid JSON')"

# Verify no .claude/ write paths leaked into any changed file
grep -rn '\.claude/PRPs/' docs/api-reference.md documentation/reference/commands.html documentation/changelog.html plugins/relay/.claude-plugin/plugin.json && echo "FAIL: .claude/ path found" || echo "PASS: no .claude/ path"

# Verify HTML files are not empty and contain expected structural elements
grep -c '<html' documentation/reference/commands.html documentation/changelog.html
```

### Level 2 — CONTENT_INVARIANTS

```bash
# AC-8: skipped_no_test_framework appears in api-reference.md
grep -c "skipped_no_test_framework" docs/api-reference.md

# AC-8: skipped_no_test_framework appears in commands.html (relay-test AND relay-execute sections)
grep -n "skipped_no_test_framework" documentation/reference/commands.html

# AC-8: v0.11.1 entry exists in changelog with the correct anchor and date
grep -n 'id="v0-11-1"\|0\.11\.1.*2026-05-12\|skipped_no_test_framework\|dogfood' documentation/changelog.html

# AC-8: plugin.json version is 0.11.1
grep '"version"' plugins/relay/.claude-plugin/plugin.json | grep -q "0.11.1" && echo "PASS: version 0.11.1" || echo "FAIL: wrong version"

# Verify Unreleased block updated to reference v0.11.1 cut date
grep -n "v0.11.1 cut" documentation/changelog.html

# Verify FAILED_INFRA_UNRECOVERABLE is still present in commands.html (no regression)
grep -c "FAILED_INFRA_UNRECOVERABLE" documentation/reference/commands.html

# Verify FAILED_INFRA_UNRECOVERABLE is still present in api-reference.md (no regression)
grep -c "FAILED_INFRA_UNRECOVERABLE" docs/api-reference.md
```

### Level 3 — DRY-RUN END-TO-END

```bash
# Verify all four changed files are present and modified relative to HEAD
git diff --name-only HEAD -- docs/api-reference.md documentation/reference/commands.html documentation/changelog.html "plugins/relay/.claude-plugin/plugin.json"

# Verify changelog entry new-to-top ordering: v0.11.1 anchor appears before v0.11.0 anchor
python -c "
content = open('documentation/changelog.html').read()
pos_111 = content.find('id=\"v0-11-1\"')
pos_110 = content.find('id=\"v0-11-0\"')
assert pos_111 != -1, 'FAIL: v0.11.1 anchor not found'
assert pos_110 != -1, 'FAIL: v0.11.0 anchor not found'
assert pos_111 < pos_110, f'FAIL: v0.11.1 ({pos_111}) is not before v0.11.0 ({pos_110})'
print('PASS: newest-at-top ordering confirmed')
"

# Verify no new pages were added (three-file registration rule not triggered)
git diff --name-only HEAD -- documentation/ | grep -v "reference/commands.html\|changelog.html" | grep "\.html$" && echo "WARN: unexpected new HTML file" || echo "PASS: no unexpected new HTML files"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** `docs/api-reference.md` `/relay-test` Output cell includes `skipped_no_test_framework` as a listed outcome with a parenthetical noting no `run.json` is written and the symmetric self-skip condition (`test_frameworks: []` or `methodology.md` absent); `/relay-execute` row includes a cross-reference to the Phase A.5.0 structured log entry for framework-less projects.
- **AC-A2 (PRD AC-8):** `documentation/reference/commands.html` `/relay-test` kv-block Output `<dd>` includes `<code>skipped_no_test_framework</code>` as a graceful outcome; `/relay-execute` Notes section updated to describe the Phase A.5.0 `skipped_no_test_framework` structured log path as a non-HALT outcome.
- **AC-A3 (PRD AC-8):** `documentation/changelog.html` contains a new `<h2 id="v0-11-1">0.11.1 — 2026-05-12</h2>` entry above the v0.11.0 entry, with a summary paragraph citing "Surfaced by 2026-05-11 relay-worktree dogfood, sessions A vs B", a Changed list covering all four files, and a §7.5-canonical plugin.json bump bullet.
- **AC-A4 (PRD AC-8):** `plugins/relay/.claude-plugin/plugin.json` `version` field equals `"0.11.1"`.
- **AC-A5 (PRD AC-8):** The Unreleased block in `documentation/changelog.html` is updated to reference the v0.11.1 cut date (2026-05-12), maintaining the newest-at-top invariant.
- **AC-A6 (PRD AC-8):** `FAILED_INFRA_UNRECOVERABLE` remains present in both `docs/api-reference.md` and `documentation/reference/commands.html` — no regression to existing halt-code documentation (AC-3 of the source PRD).
- **AC-A7 (PRD AC-8):** No new HTML pages are introduced; `documentation/AGENTS.md` §7 three-file registration rule is not triggered; no changes to `assets/css/app.css`, `assets/js/app.js`, or `assets/data/search-index.json` are required.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| HTML entity drift: using literal Unicode `→` or `—` instead of `&rarr;` / `&mdash;` in changelog | M | Low — cosmetic only but inconsistent with existing entries | Mirror Pattern 1 verbatim; Level 2 validation grepping for `&rarr;` in the new plugin.json bump bullet confirms the entity is present |
| Changelog entry newest-at-top ordering violation (v0.11.1 entry inserted below v0.11.0) | L | Medium — changelog becomes confusing and the Level 3 ordering assertion fails | Level 3 Python ordering assertion (`pos_111 < pos_110`) is the explicit guard; the Unreleased block is the insertion anchor |
| `/relay-test` Output `<dd>` HTML becomes malformed (missing `<br />`, unclosed tags) | L | Medium — page renders incorrectly | Edit is a narrow in-place extension; Level 1 `grep -c '<html'` confirms the file still parses as an HTML document with a root element; browser rendering is not tested but structural integrity is verified |
| plugin.json JSON formatting broken (trailing comma after version field, missing comma on preceding field) | L | High — JSON parse failure; Level 1 assertion catches it | Level 1 `python -m json.tool` (or equivalent `json.load`) validates the file immediately after the bump |
| `docs/api-reference.md` table cell breaks: pipe characters in the new outcome description corrupting the Markdown table | L | Medium — table renders incorrectly in Markdown | New outcome description uses parenthetical prose without pipe characters; Level 2 grep confirms the cell is present and readable |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Release cut discipline:** This phase's four-file scope precisely mirrors the v0.11.0 release cut (`relay-worktree` ship), which also touched `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, and `plugins/relay/.claude-plugin/plugin.json`. The precedent is explicit and repeatable.

**No new pages:** AGENTS.md §7 rule 7 (every new page registered in NAV + search index + changelog) is not triggered because this release adds no new HTML pages. Only existing entries within existing pages are updated.

**Dogfood evidence citation:** The changelog entry must name the dogfood report explicitly — per the source PRD's Open Question resolution ("default to yes for traceability"): "Surfaced by 2026-05-11 relay-worktree dogfood, sessions A vs B".

**Symm note in commands.html:** When updating the `/relay-test` kv-block, the parenthetical describing the self-skip condition should mirror the existing `/relay-tdd` Mode `<dd>` language ("silent self-skip exiting 0 with the verbatim line...") so readers can cross-reference the two commands' symmetry directly from the commands page.

*Generated: 2026-05-12*
*Approved: 2026-05-12*
*Implemented: 2026-05-12*
*Status: IMPLEMENTED*
