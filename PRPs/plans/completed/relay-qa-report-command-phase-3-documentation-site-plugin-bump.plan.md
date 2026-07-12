# Feature: Documentation site + plugin bump (Phase 3 of relay-qa-report-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: adds a new rendered `documentation/` reference page (cross-cutting doc-site artifact for the new `/relay-qa-report` command); mutates the three coupled doc-site registration files (NAV array in `assets/js/app.js` + `assets/data/search-index.json` + `changelog.html`); cuts a plugin release (version bump of `plugins/relay/.claude-plugin/plugin.json`)
- Decisions found:
  - 2026-04-30 "Plugin manifest version bumped on every minor/major release cut" (binding; restated in `documentation/AGENTS.md` §7.5) — this phase ships a new doc page + NAV entry (a Minor change per AGENTS.md §7.1), so `plugin.json` MUST bump from `0.19.0` to `0.20.0` in the same commit as the changelog release block
  - 2026-04-19 "PRP artifacts live under `PRPs/`, never under `.claude/`" — this plan touches only `documentation/` and `plugins/relay/.claude-plugin/`; no `.claude/` writes
  - 2026-04-25 "Plan filenames carry the source PRD phase number and slug" — this plan is `relay-qa-report-command-phase-3-documentation-site-plugin-bump.plan.md`
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md:60-66`) — none of the Phase 3 edits touch `.claude/`; the new page lives under `documentation/reference/`, the manifest under `plugins/relay/.claude-plugin/`
  - Doc-site core-invariant violations (`documentation/AGENTS.md` §2): no build step / framework, no network `<link>`/`<script>`, no new CSS or JS files, no inline `<style>`/`style=""`, no emojis, relative asset paths only — the new page must obey all of these
  - Orphan page (`documentation/AGENTS.md` §6, §8) — a page that exists in `documentation/` but is absent from NAV or the search index is a bug; the three-file registration prevents it
- Applicable architectural rules:
  - `documentation/` three-file registration rule (NAV + search index + changelog) plus the `plugin.json` version bump for any new command page (`documentation/AGENTS.md` §6 + §7.5)
  - Canonical page template (`documentation/AGENTS.md` §4) — every new HTML page starts from the exact skeleton; `<h1>` once after the breadcrumb, `<h2>`/`<h3>` with `id` slugs feeding the right-rail TOC
  - One command per stage; `/relay-qa-report` is a human-facing QA / Support command in the validation gate between Pillar 2 and Pillar 3 (`docs/context/architecture.md:131-135`) — the page must describe it as a human-gate tool never called by `/relay-execute`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-qa-report-command.prd.md` — Implementation Phases row 3: "Documentation site + plugin bump" — Goal: "Ship the rendered reference page and version the release." — Success signal: "No orphan page (page appears in NAV + search index); `changelog.html` has a versioned entry matching `plugin.json`; `documentation/AGENTS.md` checklist passes." (PRD lines 309, 328-333). Governing Acceptance Criterion: **AC-10** (docs + documentation registration, PRD lines 172-175); the `docs/api-reference.md` half of AC-10 shipped in Phase 2, this phase delivers the `documentation/` rendered-page + three-file-registration half.

## Summary

Phase 3 ships the rendered documentation-site surface and cuts the release for the already-implemented `/relay-qa-report` command (Phase 1) and its canonical-docs coverage (Phase 2). It creates one new HTML reference page, `documentation/reference/relay-qa-report.html`, built verbatim from the `documentation/AGENTS.md` §4 canonical page skeleton and mirroring the per-command section template used throughout `documentation/reference/commands.html` (an `<h3 id>` heading with an `implemented` badge over a `.kv` term/definition block). It then satisfies the binding three-file registration rule — appending a NAV entry to the Reference section of `documentation/assets/js/app.js`, adding a search-index object to `documentation/assets/data/search-index.json`, and adding a versioned `changelog.html` release block — and, in the same change, bumps `plugins/relay/.claude-plugin/plugin.json` from `0.19.0` to `0.20.0` per the AGENTS.md §7.5 lock-step contract. The work is deterministic and doc-only: no plugin agent, command, or script logic changes.

## User Story

```
As a relay operator browsing the rendered documentation site
I want a discoverable, correctly-registered reference page for /relay-qa-report and a version-synced plugin manifest
So that the new QA / Support command appears in the sidebar, search, and changelog, and users who run /plugin after pulling get a fresh cache with the shipped command
```

## Problem Statement

The `/relay-qa-report` command exists as a plugin asset (Phase 1) and is documented in the tier-1/2 canonical docs (Phase 2, `docs/api-reference.md` + `docs/context/architecture.md`), but the team-facing and external-facing rendered documentation site under `documentation/` does not yet know about it. Without a registered reference page the command is invisible in the sidebar, unsearchable in the client-side index, and absent from the changelog history — the exact "docs / rendered-site drift (orphan page, stale command count)" risk the PRD's Technical Risks table calls out (PRD line 298). Separately, the plugin manifest is still at `0.19.0`: shipping the new command's documentation without bumping `plugin.json` would leave installed users loading a stale cached plugin, the failure mode the AGENTS.md §7.5 binding rule exists to prevent.

## Solution Statement

Create the new page from the canonical skeleton, mirror the existing command-page prose (aligned with the Phase 2 `docs/api-reference.md` "QA / Support" wording), and execute the three-file registration plus the manifest bump as a single coherent release. The page enumerates the command's four-way argument router, its seven-field per-case report schema, the honesty guarantee, the anti-overwrite / clean-tree HALTs, and the `PRPs/reports/<feature>/qa-report.md` output path — mirroring, not re-deriving, the canonical wording. Registration follows AGENTS.md §6 (NAV + search index + changelog) and the release follows §7.1 (a new page + NAV entry is a Minor bump) and §7.5 (the manifest and changelog carry the identical `0.20.0` value in one commit).

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation site + release cut (doc-only) |
| Complexity | Low |
| Systems Affected | Rendered doc site (`documentation/`): new reference page + NAV + search index + changelog; plugin manifest (`plugins/relay/.claude-plugin/plugin.json`) |
| Dependencies | Phase 1 (Command file) — `complete`; the command must exist to be documented. Phase 2 (Canonical docs) — `complete`; supplies the canonical "QA / Support" wording to mirror |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-qa-report-command.prd.md` Implementation Phases row 3 (line 309); Phase Details lines 328-333; governing AC-10 lines 172-175 |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 32-127, 239-380 | Binding contract: §2 core invariants, §4 canonical page skeleton, §6 three-file registration rule, §7.1 versioning + §7.5 plugin-manifest sync. Read in full before editing anything under `documentation/`. |
| P0 | `documentation/reference/commands.html` | 1-70 | The section template every command page mirrors: breadcrumb, `<h1>` + `.page-subtitle`, `<h3 id>` + `badge--done`, `.kv` Input/Output/Mode/Agents/Notes block. |
| P0 | `documentation/assets/js/app.js` | 22-91 | The `NAV` array (single source of truth for sidebar, prev/next, active highlight); the Reference section object to append to (lines 52-63). |
| P0 | `documentation/assets/data/search-index.json` | 86-118 | The flat entry-object shape (`title` / `path` / `category` / `excerpt`); Reference-category examples to mirror (category must match the NAV heading "Reference" exactly). |
| P0 | `documentation/changelog.html` | 31-46 | The empty `Unreleased` block, the newest release block (`0.19.0`), the Added/Changed `<h3>`+`<ul>` shape, and the §7.5 `plugin.json`-bump `<li>` markup to copy (line 44). |
| P0 | `plugins/relay/.claude-plugin/plugin.json` | 1-9 | Current `version` field (`0.19.0`) — the single line to bump to `0.20.0`. |
| P1 | `docs/api-reference.md` | 70-75 | Phase 2 canonical "QA / Support (human validation gate)" wording for `/relay-qa-report`; the new page's prose mirrors this rather than diverging. |
| P1 | `PRPs/prds/relay-qa-report-command.prd.md` | 130-175, 289-299, 328-333 | Acceptance Criteria (esp. AC-10), Technical Risks, and Phase 3 Details — the source of the page's content and this phase's success signal. |

## Patterns to Mirror

# SOURCE: documentation/AGENTS.md:80-115

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page title — relay</title>
  <link rel="stylesheet" href="../assets/css/app.css" />
</head>
<body>
  <header class="topbar"></header>
  <div class="layout">
    <aside class="sidebar"></aside>
    <main class="content">

      <div class="breadcrumb">
        <a href="../index.html">Home</a>
        <span class="breadcrumb__sep">›</span>
        <span>Section name</span>
        <span class="breadcrumb__sep">›</span>
        <span>Page name</span>
      </div>

      <h1>Page title</h1>
      <p class="page-subtitle">One paragraph of plain prose...</p>

      <h2 id="first-section">First section</h2>
      <!-- content -->

      <div class="page-footer"></div>
    </main>
    <aside class="toc"></aside>
  </div>
  <script src="../assets/js/app.js"></script>
</body>
</html>
```

Copied by **Task 1** as the exact starting skeleton for `documentation/reference/relay-qa-report.html`. Breadcrumb section is "Reference", page name "QA report"; `../` asset depth is correct for a `reference/` page.

# SOURCE: documentation/reference/commands.html:44-59

```html
<h3 id="relay-prd"><code>/relay-prd</code> — interactive PRD authoring <span class="badge badge--done">implemented</span></h3>

<div class="kv">
  <dt>Input</dt>
  <dd>A short description of the feature, a path to a draft PRD markdown ...</dd>
  <dt>Output</dt>
  <dd><code>PRPs/prds/&lt;feature&gt;.prd.md</code> with status <code>APPROVED</code>. ...</dd>
  <dt>Mode</dt>
  <dd>Interactive. Runs the 6-phase Q&amp;A ...</dd>
  ...
  <dt>Notes</dt>
  <dd>...</dd>
</div>
```

Copied by **Task 1** for the body of the new page: an `<h3 id="relay-qa-report"><code>/relay-qa-report</code> ... <span class="badge badge--done">implemented</span></h3>` heading over a `.kv` block (Input / Output / Mode / Report schema / Refuses / Notes) describing the four-way router, the seven-field schema, and the HALTs. Prose mirrors `docs/api-reference.md:70-75`.

# SOURCE: documentation/assets/js/app.js:52-63

```js
{
  heading: "Reference",
  items: [
    { title: "Commands",                path: "reference/commands.html" },
    { title: "Agents",                  path: "reference/agents.html" },
    { title: "Skills",                  path: "reference/skills.html" },
    { title: "Scripts",                 path: "reference/scripts.html" },
    { title: "Test output schema",      path: "reference/test-output-schema.html" },
    { title: "Settings allowlist",      path: "reference/settings-allowlist.html" },
    { title: "Redaction policy",        path: "reference/redaction-policy.html" },
  ],
},
```

Extended by **Task 2**: append `{ title: "QA report", path: "reference/relay-qa-report.html" },` as a new item in this same Reference-section `items` array (preserve the aligned-column comma-terminated style).

# SOURCE: documentation/assets/data/search-index.json:86-91

```json
{
  "title": "Commands",
  "path": "reference/commands.html",
  "category": "Reference",
  "excerpt": "Fourteen commands, no placeholder. All Pillar 3 commands shipped: ..."
}
```

Mirrored by **Task 3**: add one object with `title` "QA report", `path` "reference/relay-qa-report.html", `category` "Reference" (exact case match to the NAV heading), and a 15-35 word discovery-keyword `excerpt`.

# SOURCE: documentation/changelog.html:44

```html
<li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.18.0</code> &rarr; <code>0.19.0</code> per the 2026-04-30 &sect;7.5 binding contract. Users running <code>/plugin</code> after pulling this version get a fresh <code>relay/0.19.0/</code> cache directory with the renamed commands and agents registered.</li>
```

Copied by **Task 4** with the version arrow updated to `0.19.0` &rarr; `0.20.0` and the cache path to `relay/0.20.0/`. The changelog release block is created by renaming the empty `Unreleased` block to `0.20.0 &#8212; 2026-07-12` with an `Added` `<h3>`/`<ul>` (new page) and a `Changed` `<h3>`/`<ul>` (this `plugin.json` bump `<li>`), then re-inserting a fresh empty `Unreleased` block above it per AGENTS.md §7.3.

# SOURCE: plugins/relay/.claude-plugin/plugin.json:2-3

```json
  "name": "relay",
  "version": "0.19.0",
```

Edited by **Task 5**: the `"version"` value `0.19.0` → `0.20.0` (only this line changes).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `documentation/reference/relay-qa-report.html` | CREATE | The new rendered reference page for `/relay-qa-report`, built from the AGENTS.md §4 skeleton (AC-10, registration point implied — a page must exist to be registered). |
| `documentation/assets/js/app.js` | UPDATE | Registration point 1 of 3: append the NAV entry to the Reference section so the page appears in the sidebar / prev-next / active-highlight and is not an orphan (AGENTS.md §6.1). |
| `documentation/assets/data/search-index.json` | UPDATE | Registration point 2 of 3: add the page's search-index object (category "Reference") so the page is discoverable via client-side search (AGENTS.md §6.2). |
| `documentation/changelog.html` | UPDATE | Registration point 3 of 3 + release cut: rename `Unreleased` to a versioned `0.20.0` block (Added: new page; Changed: plugin bump), add a fresh empty `Unreleased` (AGENTS.md §6.3, §7.3). |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Version bump `0.19.0` → `0.20.0` in the same commit as the changelog release, per the binding AGENTS.md §7.5 lock-step rule (new page + NAV entry = Minor per §7.1). |

## NOT Building (Scope Limits)

- **No change to the command's runtime behavior, protocol, or schema** — Phase 1 owns `plugins/relay/commands/relay-qa-report.md`; Phase 3 only documents and versions it (PRD "What We're NOT Building", running/authoring nothing new).
- **No new top-level `documentation/` folder** — the page lands in the existing `reference/` folder; a new folder would require user approval per AGENTS.md §3.
- **No new CSS class or JS behavior** — the page reuses the existing `.kv` / `.badge--done` / `.callout` vocabulary; no edit to `app.css`, and the only `app.js` edit is the NAV data entry (AGENTS.md §2 invariant 3).
- **No reconciliation of the pre-existing "Fourteen commands" count language on `documentation/reference/commands.html:24` or `documentation/roadmap/status.html`** — those surfaces still predate `/relay-qa-report` as a 15th command. That copy pass is outside this phase's named scope (new page + three-file registration + plugin bump per PRD Phase 3 Details) and is recorded as a residual risk + follow-up in `## Notes`; folding it in here would broaden the diff beyond the phase contract. (The canonical `docs/` count 14→15 was already handled in Phase 2.)
- **No screenshots or binary images** — AGENTS.md §2 invariant 6; the page communicates with typography and code blocks only.
- **No revisiting the `--force` / update-mode open questions** — Could-items deferred at the PRD level (PRD lines 181-185, 231-232).

## Step-by-Step Tasks

### Task 1: CREATE documentation/reference/relay-qa-report.html

- **ACTION**: Create the new page starting from the AGENTS.md §4 canonical skeleton (do NOT copy an existing content-heavy page). Set `<title>QA report — relay</title>`, the breadcrumb to `Home › Reference › QA report`, `<h1>QA report</h1>`, and a mandatory `<p class="page-subtitle">` describing the command as the human-gate QA / Support tool. Body: an `<h3 id="relay-qa-report"><code>/relay-qa-report</code> ... <span class="badge badge--done">implemented</span></h3>` heading over a `.kv` block covering the four-way argument router (`.prd.md` / `.plan.md` / free-text / blank→diff), `<feature>` derivation, the seven-field per-case schema (title, risk level, required state, coverage, automated test path, manual status `pending`, manual step-by-step), the honesty guarantee (uncovered cases listed explicitly), the `PRPs/reports/<feature>/qa-report.md` output path, `record.json` grounding, and the clean-tree (`FAILED_NOTHING_TO_REPORT`) + anti-overwrite HALTs. Use `<h2 id="...">` section headings so the right-rail TOC populates. Mirror the canonical wording in `docs/api-reference.md:70-75`. Use only relative `../assets/...` and `../index.html` paths; no inline styles, no emojis, no network links.
- **AC**: PRD AC-10 → this plan's AC-A1 (rendered reference page exists at `documentation/reference/relay-qa-report.html`, built from the AGENTS.md §4 skeleton with the required structure).
- **MIRROR**: `# SOURCE: documentation/AGENTS.md:80-115` (skeleton) and `# SOURCE: documentation/reference/commands.html:44-59` (per-command `<h3>`+`.kv` section).
- **VALIDATE**: `if [ -f documentation/reference/relay-qa-report.html ] && grep -q 'id="relay-qa-report"' documentation/reference/relay-qa-report.html && grep -q 'badge--done' documentation/reference/relay-qa-report.html && grep -q 'class="page-subtitle"' documentation/reference/relay-qa-report.html && grep -q '../assets/js/app.js' documentation/reference/relay-qa-report.html; then echo "PASS: page created with required structure"; else echo "FAIL: page missing or malformed"; exit 1; fi`

### Task 2: UPDATE documentation/assets/js/app.js (NAV registration)

- **ACTION**: In the `NAV` array, inside the object whose `heading` is `"Reference"`, append a new item `{ title: "QA report", path: "reference/relay-qa-report.html" },` after the existing `Redaction policy` item. Preserve the file's aligned-column, trailing-comma style. Do not touch any other section or any non-NAV code.
- **AC**: PRD AC-10 → this plan's AC-A2 (page registered in NAV; `node --check` on `app.js` still passes).
- **MIRROR**: `# SOURCE: documentation/assets/js/app.js:52-63`.
- **VALIDATE**: `node --check documentation/assets/js/app.js && if grep -q 'reference/relay-qa-report.html' documentation/assets/js/app.js; then echo "PASS: NAV entry present and JS parses"; else echo "FAIL: NAV entry missing"; exit 1; fi`

### Task 3: UPDATE documentation/assets/data/search-index.json (search registration)

- **ACTION**: Add one JSON object to the top-level array with `"title": "QA report"`, `"path": "reference/relay-qa-report.html"`, `"category": "Reference"` (exact case match to the NAV heading), and a 15-35 word `"excerpt"` rich in discovery keywords (e.g. the four modes, seven-field schema, honesty/uncovered-case guarantee, `qa-report.md` output). Place it adjacent to the other Reference-category entries. Keep the file valid JSON (comma placement, no trailing comma).
- **AC**: PRD AC-10 → this plan's AC-A3 (page registered in the search index with `category` "Reference"; file remains valid JSON).
- **MIRROR**: `# SOURCE: documentation/assets/data/search-index.json:86-91`.
- **VALIDATE**: `node -e "const a=JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8')); if(!a.some(e=>e.path==='reference/relay-qa-report.html'&&e.category==='Reference')){console.error('FAIL: entry missing or wrong category');process.exit(1)} console.log('PASS: search-index entry present, JSON valid')"`

### Task 4: UPDATE documentation/changelog.html (release block)

- **ACTION**: Rename the existing empty `<h2 id="unreleased">Unreleased</h2>` block to a versioned release: insert a fresh empty `<h2 id="unreleased">Unreleased</h2>` at the top of the history, then a `<h2 id="v0-20-0">0.20.0 &#8212; 2026-07-12</h2>` block with a short summary `<p>`, an `<h3 id="v0-20-0-added">Added</h3>` `<ul>` listing the new `documentation/reference/relay-qa-report.html` page + its NAV/search-index registration, and an `<h3 id="v0-20-0-changed">Changed</h3>` `<ul>` containing the §7.5 `plugin.json`-bump `<li>` (version `0.19.0` &rarr; `0.20.0`, cache path `relay/0.20.0/`). Do not modify the `0.19.0` or older blocks.
- **AC**: PRD AC-10 → this plan's AC-A4 (versioned `0.20.0 — 2026-07-12` changelog release block with Added + Changed; exactly one `Unreleased` block retained).
- **MIRROR**: `# SOURCE: documentation/changelog.html:44` (the §7.5 plugin-bump `<li>` markup) and the surrounding `0.19.0` Added/Changed block shape (changelog.html:37-46).
- **VALIDATE**: `if grep -q 'id="v0-20-0"' documentation/changelog.html && grep -q '0.19.0</code> &rarr; <code>0.20.0' documentation/changelog.html && [ "$(grep -c 'id="unreleased"' documentation/changelog.html)" = "1" ]; then echo "PASS: 0.20.0 block added, single Unreleased retained"; else echo "FAIL: changelog block or Unreleased count wrong"; exit 1; fi`

### Task 5: UPDATE plugins/relay/.claude-plugin/plugin.json (version bump)

- **ACTION**: Change the `"version"` field value from `"0.19.0"` to `"0.20.0"`. Change only that line; leave `name`, `description`, and `author` untouched. This must land in the same commit as the Task 4 changelog release (AGENTS.md §7.5).
- **AC**: PRD AC-10 → this plan's AC-A5 (`plugin.json` `version` is `0.20.0`, matching the newest changelog release — §7.5 lock-step).
- **MIRROR**: `# SOURCE: plugins/relay/.claude-plugin/plugin.json:2-3`.
- **VALIDATE**: `node -e "const v=require('./plugins/relay/.claude-plugin/plugin.json').version; if(v!=='0.20.0'){console.error('FAIL: version is '+v);process.exit(1)} console.log('PASS: plugin.json version 0.20.0')"`

## Validation Commands

All commands are Git Bash and MUST be run from the repository root (`C:\repos\PRPs-agentic-eng`). Each fails closed (non-zero exit on invariant violation); none uses the forbidden always-exit-0 `<check> && echo PASS || echo FAIL` idiom.

### Level 1 — STATIC_ANALYSIS

Parse/lint the machine-readable artifacts the phase edits:

```bash
node --check documentation/assets/js/app.js \
  && node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8'))" \
  && node -e "JSON.parse(require('fs').readFileSync('plugins/relay/.claude-plugin/plugin.json','utf8'))" \
  && echo "PASS: app.js parses; search-index.json and plugin.json are valid JSON"
```

(`node --check` and `JSON.parse` each exit non-zero on a syntax error, aborting the `&&` chain before the final echo.)

### Level 2 — CONTENT_INVARIANTS

Scoped per-file assertions (no repo-wide `grep -r`; each check targets exactly the file the phase changed):

```bash
set -e
# New page exists with required structure
grep -q 'id="relay-qa-report"' documentation/reference/relay-qa-report.html
grep -q 'badge--done' documentation/reference/relay-qa-report.html
grep -q 'class="page-subtitle"' documentation/reference/relay-qa-report.html
# Doc-site invariants on the new page: no inline style, no CDN/network link, no new stylesheet
if grep -Eq 'style="|<style|https?://[^"]*\.(css|js)|cdn\.' documentation/reference/relay-qa-report.html; then echo "FAIL: forbidden inline-style/network-asset on new page"; exit 1; fi
# Three-file registration present
grep -q 'reference/relay-qa-report.html' documentation/assets/js/app.js
grep -q 'reference/relay-qa-report.html' documentation/assets/data/search-index.json
grep -q 'id="v0-20-0"' documentation/changelog.html
# Manifest bumped
grep -q '"version": "0.20.0"' plugins/relay/.claude-plugin/plugin.json
echo "PASS: new page structure + three-file registration + manifest bump all present"
```

### Level 3 — INTEGRATION / DRY-RUN (no-orphan + version lock-step)

Cross-file consistency: the new page is registered everywhere it must be, no orphan, and the manifest version equals the newest changelog release version. Runnable check:

```bash
set -e
PAGE="documentation/reference/relay-qa-report.html"
test -f "$PAGE"
grep -q 'reference/relay-qa-report.html' documentation/assets/js/app.js       # in NAV
grep -q 'reference/relay-qa-report.html' documentation/assets/data/search-index.json  # in search index
PV=$(node -e "process.stdout.write(require('./plugins/relay/.claude-plugin/plugin.json').version)")
test "$PV" = "0.20.0"
grep -q "id=\"v0-20-0\"" documentation/changelog.html                          # changelog carries the same version
grep -q "0.19.0</code> &rarr; <code>0.20.0" documentation/changelog.html       # §7.5 bump entry recorded
echo "PASS: no orphan; NAV + search + changelog + plugin.json all agree on 0.20.0"
```

Manual dry-run per AGENTS.md §8 step 8 (not scriptable in this repo — no headless browser harness): open `documentation/reference/relay-qa-report.html` from `file://`, confirm the sidebar highlights the QA report entry, the right-rail TOC populates from the `<h2>` ids, the prev/next footer links resolve, the search box finds "QA report", and the theme toggle still works.

## Acceptance Criteria

- **AC-A1 (PRD AC-10):** A rendered reference page exists at `documentation/reference/relay-qa-report.html`, built from the AGENTS.md §4 canonical skeleton (breadcrumb `Home › Reference › QA report`, single `<h1>`, mandatory `.page-subtitle`, `<h3 id="relay-qa-report">` + `badge--done` over a `.kv` block), documenting the four-way router, seven-field schema, honesty guarantee, output path, and HALTs.
- **AC-A2 (PRD AC-10):** The page is registered in NAV — a `{ title: "QA report", path: "reference/relay-qa-report.html" }` item exists in the Reference section of `documentation/assets/js/app.js`, and `node --check` still passes.
- **AC-A3 (PRD AC-10):** The page is registered in the search index — a single object in `documentation/assets/data/search-index.json` has `path` "reference/relay-qa-report.html" and `category` "Reference", and the file remains valid JSON.
- **AC-A4 (PRD AC-10):** `documentation/changelog.html` carries a versioned `0.20.0 — 2026-07-12` release block (Added: the new page; Changed: the `plugin.json` bump `<li>`), and exactly one `Unreleased` block remains.
- **AC-A5 (PRD AC-10):** `plugins/relay/.claude-plugin/plugin.json` `version` is `0.20.0`, matching the newest changelog release version (AGENTS.md §7.5 lock-step), landing in the same change as the changelog release.
- **AC-A6 (PRD AC-10):** No orphan and no invariant regression — the page appears in both NAV and the search index and the file exists (Level 3 check passes); the new page introduces no new CSS/JS file, no inline `style`/`<style>`, no network `<link>`/`<script>`, no emoji, and uses only relative `../assets/...` paths (AGENTS.md §2).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Orphan page / doc-site drift (page not registered in NAV or search index) | L | M | Three-file registration is split into explicit Tasks 2-3-4; the Level 3 cross-file check fails closed unless the path appears in NAV *and* the search index *and* the file exists. Mirrors PRD Technical Risk "Docs / rendered-site drift" (PRD line 298). |
| Plugin-version drift (`plugin.json` left at `0.19.0` while changelog ships `0.20.0`) → stale plugin cache for installed users | L | M | Task 5 bumps `plugin.json` to `0.20.0` in the same commit as the Task 4 release block; Level 3 asserts `plugin.json` version equals the newest changelog version (AGENTS.md §7.5). |
| Doc-site invariant violation on the new page (inline style, new stylesheet, network asset, emoji) | L | M | Task 1 copies the §4 skeleton verbatim and reuses existing CSS vocabulary; Level 1 `node --check` guards the JS edit; the Level 2 forbidden-pattern grep fails closed on inline-style/network-asset. |
| Malformed JSON in `search-index.json` (stray/missing comma) breaks client-side search silently | L | M | Level 1 `JSON.parse` and the Task 3 `node -e` membership check both fail closed on invalid JSON. |
| Residual: pre-existing "Fourteen commands" count language on `commands.html` / `status.html` not yet including `/relay-qa-report` | L | L | Consciously scoped out (see `## NOT Building`); flagged as a follow-up copy pass in `## Notes` so a reviewer/operator can schedule it, matching the v0.19.0 "documented follow-up copy pass" precedent. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. (For the relay repo itself `test_frameworks: []`, so no automated tests are authored for this doc-only phase — the Acceptance Criteria are validated by the Level 1-3 commands above and the AGENTS.md §8 visual check.) This string is sourced verbatim from `plugins/relay/agents/prd-writer.md` Step 7.4 (line 384), the single source of truth; `plan-reviewer` R5 enforces byte-equality.

- **Version derivation:** `0.20.0` is the deterministic Minor bump from the current `0.19.0` (`plugins/relay/.claude-plugin/plugin.json:3`) per AGENTS.md §7.1 ("new pages, new NAV entries" = Minor) and §7.5 (manifest and changelog carry the identical value in the same commit). It is not filler — it is computed from the read manifest value plus the change class.

- **Dedicated-page divergence (callout):** every other command is documented as an `<h3>` subsection inside `documentation/reference/commands.html`, but this phase creates a standalone `reference/relay-qa-report.html` page. Rationale: PRD AC-10 (lines 172-175) and the calling-command scope require the command's page to be "registered in all three required places (NAV, search index, changelog)", and the three-file registration rule (AGENTS.md §6) applies to a *page*, not a subsection — an in-`commands.html` `<h3>` would touch only the changelog and could not satisfy the NAV + search-index halves of AC-10. The standalone page is therefore the AC-conformant choice. If a future maintainer prefers the subsection form, that is a conscious re-scope to record in `docs/decisions.md`.

- **Follow-up (out of this phase):** `documentation/reference/commands.html:24` page subtitle ("Fourteen commands …") and `documentation/roadmap/status.html` command-count language predate `/relay-qa-report` as a command surface entry; reconciling those counts is a separate copy pass, deliberately excluded here to keep the Phase 3 diff surgical (see `## NOT Building`).

- **Dogfood opportunity:** once this page ships, Phase 4 (Dogfood) can run `/relay-qa-report` against a real executed PRD's `PRPs/reports/<feature>/` and cross-check that the rendered page's described schema matches the actual generated `qa-report.md`.

*Generated: 2026-07-12*
*Approved: 2026-07-12*
*Implemented: 2026-07-12*
*Status: IMPLEMENTED*
