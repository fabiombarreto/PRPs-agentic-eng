# Feature: Docs + release (Phase 5 of test-formatting-prevention-preflight)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (docs/decisions.md governance entries + anti-patterns.md HTML mirror spanning the documentation/ site); release cut (plugin.json version bump + documentation/changelog.html, binding §7.5 lock-step); impacts the documentation/ rendered site (binding documentation/AGENTS.md contract)
- Decisions found:
  - [2026-04-30] Plugin manifest version bumped on every minor/major release cut, matching the changelog cut version (§7.5 binding contract)
  - [2026-08-26] Test-formatting prevention runs at the command layer (Phase 2, `docs/decisions.md` entry 89) — that entry explicitly scopes itself to Prevention only, leaving Phase 3 (Preflight) and Phase 4 (R-SEM prose)'s `docs/decisions.md` entries deferred to this phase
  - [2026-05-06] / [2026-07-10] TDD pair is the sole authorized test-file author; R-X preserved byte-identical — not touched by this phase (no application source or test files in scope)
  - `documentation/governance/decisions.html`'s own "Adding a new decision" protocol (step 3): a counterpart anti-pattern entry is added to `docs/anti-patterns.md` when applicable — already done by Phases 2 and 4's Implementer work; this phase mirrors those entries to the HTML site only, it does not author new anti-pattern text
- Applicable anti-patterns: "Writing pipeline artifacts under `.claude/`" (docs/anti-patterns.md:61-67) — every path this phase writes resolves under `docs/`, `documentation/`, or `plugins/relay/.claude-plugin/` at the target repo root; no `.claude/` write.
- Applicable architectural rules: `documentation/AGENTS.md` is binding for every `documentation/` edit (three-file registration rule §6 — though no NEW page is added here, so the NAV/search-index obligations don't trigger per §9's modify-existing-page workflow; §7.5 plugin-version lock-step; canonical page template; badge/callout vocabulary; no emojis; no inline styles); three-pillar target architecture (`docs/context/architecture.md:38-49`) — Pillar 2 never commits, this phase's worktree stays uncommitted; PRP artifacts live under `PRPs/` at the target repo root, never `.claude/`.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-formatting-prevention-preflight.prd.md` — Implementation Phases
  row 5: "Docs + release" — Goal: Ship the change surface coherently. —
  Success signal: AC-8; changelog entry present; version parity check green.

## Summary

Phases 1–4 of `test-formatting-prevention-preflight` are `complete` and shipped
onto disk in the feature worktree (formatter_cmd contract, prevention in
`/relay-write-test`, preflight in `/relay-implement`, R-SEM prose in
`code-reviewer.md`/`implementer.md`), but three release surfaces have not
caught up: (1) `docs/decisions.md` has a governance entry for Phase 2
(Prevention, entry 89) but none yet for Phase 3 (Preflight) or Phase 4
(R-SEM prose) — both explicitly deferred; (2) the three anti-pattern entries
Phases 2 and 4 already added to `docs/anti-patterns.md` (formatter_cmd
heuristic inference, R-SEM not self-executing, dispute-for-formatting) have
no counterpart in `documentation/governance/anti-patterns.html`, which
mirrors only the first 10 of the Markdown file's now-15 entries; (3) the
plugin manifest is still frozen at `0.34.0` while `documentation/changelog.html`'s
`Unreleased` block has one accumulated entry and no release has been cut.
This phase closes all three: appends two new dated `docs/decisions.md`
entries (Preflight, R-SEM prose) and mirrors both plus the three anti-pattern
entries into the `documentation/governance/` HTML pages; cuts a `0.35.0`
release in `documentation/changelog.html` (minor bump — new HTML sections are
added to existing pages) with the mandatory plugin.json-bump line; and bumps
`plugins/relay/.claude-plugin/plugin.json` from `0.34.0` to `0.35.0` in the
same change, per the binding `documentation/AGENTS.md` §7.5 lock-step
contract. `npm run validate`'s 14 checks — including `decisions-mirror`, the
mechanical enforcement of point (1) — must exit 0 afterward.

## User Story

As a relay operator who has driven the `test-formatting-prevention-preflight`
feature through Phases 1–4
I want the governance log, the documentation site, and the plugin manifest to
catch up with what already shipped in the worktree
So that the decision rationale is durably recorded, the anti-pattern is
discoverable by the humans reading the site (not just the AI reading the
Markdown), and installed users picking up this version get a plugin cache
that matches what actually shipped.

## Problem Statement

Three release surfaces lag behind the code that already shipped in Phases
1–4. `docs/decisions.md` entry 89 explicitly states it covers Prevention
only ("the PRD's Phase 3 ... is separate, not-yet-shipped scope and is not
covered here"), and Phase 4's R-SEM prose clarification has no entry at all
— so the governance log a future agent reads via the Decision Gate is
incomplete for a feature whose code is already `complete`.
`documentation/governance/anti-patterns.html` mirrors only entries 1–10 of
`docs/anti-patterns.md`'s now-15 real entries; the 5 missing include the 3
this PRD's own Phases 2 and 4 added — an anti-pattern binding on every agent
via the Markdown source, but invisible to a human reading the site, which is
exactly the asymmetry `decisions-mirror.mjs`'s doc-comment names as the
failure mode worth preventing (no equivalent mechanical check exists for
anti-patterns). And `plugins/relay/.claude-plugin/plugin.json` is still
`0.34.0` while the feature's four shipped phases sit undocumented in the
changelog's `Unreleased` block — the exact cache-staleness failure mode
AGENTS.md §7.5 exists to prevent.

## Solution Statement

Append two new `docs/decisions.md` entries — one for Preflight (Phase 3:
test-file formatting normalized before `base_commit`/`diff_target` capture),
one for R-SEM prose (Phase 4: reviewer findings are not self-executing
test-edit authorization) — immediately before the file's closing template
comment, append-only. Mirror both into
`documentation/governance/decisions.html` as new numbered entries (90, 91)
with matching index rows. Mirror the 3 in-scope `docs/anti-patterns.md`
entries this PRD's Phases 2 and 4 already wrote (formatter_cmd heuristic
inference; R-SEM not self-executing; dispute-for-formatting) into
`documentation/governance/anti-patterns.html` as 3 new numbered entries (11,
12, 13) with matching index rows — explicitly leaving the 2 pre-existing,
unrelated `figma-quota-resilience` drift entries (sleeping/backing off
against a Figma quota error; wholesale confidence downgrade) unmirrored and
recording that decision explicitly rather than silently. Cut a `0.35.0`
release in `documentation/changelog.html`: rename `Unreleased` to a dated
`0.35.0` block with a release-summary paragraph and the mandatory
plugin.json-bump `<li>` under a `Changed` section, add the 3 anti-pattern
mirrors under a new `Added` section, and start a fresh empty `Unreleased`
block above it. Bump `plugins/relay/.claude-plugin/plugin.json`'s `version`
from `0.34.0` to `0.35.0` in the same change. Every `documentation/` edit
follows the canonical page template, badge/callout vocabulary, and
no-emoji/no-inline-style rules from `documentation/AGENTS.md`. `docs/decisions.md`
and `docs/anti-patterns.md` stay append-only / untouched respectively — no
wholesale regeneration.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation / governance / release cut |
| Complexity | Low-Medium (5 files: 1 append-only Markdown governance log, 2 HTML governance mirrors, 1 HTML changelog cut, 1 JSON manifest bump; no application source, no test files) |
| Systems Affected | `docs/` knowledge base (`decisions.md`); `documentation/` rendered site (`governance/decisions.html`, `governance/anti-patterns.html`, `changelog.html`); plugin manifest (`plugin.json`) |
| Dependencies | Phases 2, 3, 4 `complete` in the feature worktree (Prevention, Preflight, R-SEM prose) — source PRD row 5 `Depends: 2, 3, 4`, all satisfied |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/test-formatting-prevention-preflight.prd.md` Implementation Phases row 5 (line 296); Phase Details lines 371-377 |
| phase_type | docs |

`phase_type: docs` — the `## Files to Change` table below contains only
`docs/decisions.md` (Markdown), three `documentation/` HTML pages, and the
plugin manifest JSON — no application source file (`.mjs`, agent/command
Markdown) is touched. This mirrors the identical classification of the
`relay-approve-command` Phase 4 release-cut plan (`PRPs/plans/completed/relay-approve-command-phase-4-governance-docs-site-release-cut.plan.md:110-118`),
which reasoned the same way over an almost identical file set (docs +
HTML + plugin.json + a JSON data file). Validation is
filesystem/grep-oriented (`npm run validate` + targeted `grep`/`Select-String`
checks), not a `node:test` invocation — see `## Notes` for the
framework-mismatch exemption this phase relies on.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `documentation/AGENTS.md` | 1-481 (esp. §2 invariants, §5 CSS vocabulary, §6 three-file registration, §7 changelog + §7.5 plugin-version lock-step, §9 modify-existing-page workflow) | BINDING contract for every `documentation/` edit in this phase. |
| 1 | `PRPs/prds/test-formatting-prevention-preflight.prd.md` | 371-377 (Phase 5 Details), 381-389 (Decisions Log), 108 + 149-151 (AC-8 + validation-suite success metric) | Source PRD: row 5 scope, Goal, Success signal, and AC-8 traceability. |
| 1 | `docs/anti-patterns.md` | 125-148 (the 3 in-scope entries: formatter_cmd heuristic inference, R-SEM not self-executing, dispute-for-formatting) | The literal source text this phase mirrors verbatim-in-spirit into the HTML site — do not paraphrase away the "What to do instead" guidance. |
| 2 | `docs/decisions.md` | 2167-2189 (entry 89 "Test-formatting prevention runs at the command layer" + the closing template comment) | Entry 89's shape (Context/Decision/Reason/Areas affected) is the template for the two new entries; its own text confirms Phase 3 is "not covered here" — the gap this phase closes. New entries are appended immediately before the template comment at line 2179. |
| 2 | `documentation/governance/decisions.html` | 119-123 (index tail + `</ol>` + `<h2 id="entries">`), 820-853 (entries 86-89 kv-block shape) | Where the 2 new index `<li>` rows are appended (before `</ol>` at line 123) and the kv-block shape (Date/Context/Decision/Reason) the 2 new `<h3>` entries mirror. |
| 2 | `documentation/governance/anti-patterns.html` | 33-44 (index + entries 9-10 links, `</ol>` at line 44), 133-153 (entries 9 "heuristic-gating-keys" and 10 "mcp-from-subagent" full shape) | Where the 3 new index `<li>` rows are appended and the `callout--error` shape (What it is / Why it's forbidden / What to do instead / Areas affected) the 3 new `<h2>` entries mirror. Entry 10 (line 143) is the last existing entry — new entries append immediately after its closing `</div>` (line 152), before `<h2 id="how-to-add">` (line 154). |
| 2 | `documentation/changelog.html` | 31-130 (`Unreleased` block + `0.34.0` release block) | The `Unreleased` block (31-44) is renamed to the new `0.35.0` cut; the `0.34.0` block (46+) is the release-summary-paragraph + plugin-bump-`<li>` template. |
| 3 | `plugins/relay/.claude-plugin/plugin.json` | 1-9 (whole file; `version` at line 3) | The field this phase bumps `0.34.0` → `0.35.0`. |
| 3 | `PRPs/plans/completed/relay-approve-command-phase-4-governance-docs-site-release-cut.plan.md` | 1-684 (whole file) | A prior SHIPPED plan covering an almost identical file set (decisions.md append + HTML governance mirror + changelog cut + plugin.json bump). Its Step-by-Step Tasks structure, VALIDATE style, and `## Notes` framework-mismatch-exemption citation are the direct structural template for this plan. |

## Patterns to Mirror

# SOURCE: docs/decisions.md:2167-2189
```
## [2026-08-26] Test-formatting prevention runs at the command layer, never inside `test-writer`

**Context:** ...
**Decision:** ...
**Reason:** ...

**Areas affected:** ...

---

<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
```
Copied by Task 1: two new `## [2026-08-27] ...` entries (Preflight, R-SEM
prose) are appended immediately before the `<!-- Template for future
entries:` comment, in the same four-field Context/Decision/Reason/Areas-
affected shape, separated by `---`. Append-only — the rest of the file,
including entry 89, is PRESERVE-ENTIRELY.

# SOURCE: documentation/governance/decisions.html:847-853
```html
      <h3 id="test-formatting-command-layer">89. Test-formatting prevention runs at the command layer, never inside <code>test-writer</code></h3>
      <div class="kv">
        <dt>Date</dt><dd>2026-08-26</dd>
        <dt>Context</dt><dd>...</dd>
        <dt>Decision</dt><dd>...</dd>
        <dt>Reason</dt><dd>...</dd>
      </div>
```
Copied by Task 2: two new `<h3 id="...">90./91. ...</h3>` + `.kv` blocks
(Date/Context/Decision/Reason, no "Areas affected" row — matching entries
86-89's shape, not entry 89's Markdown counterpart's extra field) are
inserted immediately after this block (line 853) and before `<h2
id="how-to-add">` (line 855); two matching `<li>` rows are appended to the
index `<ol>` (before `</ol>` at line 123).

# SOURCE: documentation/governance/anti-patterns.html:143-153
```html
      <h2 id="mcp-from-subagent">10. Querying the Figma MCP from a dispatched writer/reviewer agent</h2>

      <div class="callout callout--error">
        <div class="callout__title">Anti-pattern</div>
        <p><strong>What it is:</strong> ...</p>
        <p><strong>Why it's forbidden:</strong> ...</p>
        <p><strong>What to do instead:</strong> ...</p>
        <p><strong>Areas affected:</strong> ...</p>
      </div>
```
Copied by Task 3: three new `<h2 id="...">11./12./13. ...</h2>` +
`callout--error` blocks (mirroring the exact four-paragraph shape) are
inserted immediately after this block (line 152) and before `<h2
id="how-to-add">` (line 154); three matching `<li>` rows are appended to the
index `<ol>` (before `</ol>` at line 44). Content is sourced from
`docs/anti-patterns.md:125-148`, not invented.

# SOURCE: documentation/changelog.html:31-48
```html
      <h2 id="unreleased">Unreleased</h2>

      <h3 id="unreleased-changed">Changed</h3>
      <ul>
        <li><strong><a href="governance/decisions.html">Decisions</a></strong>
          &mdash; entry 89 mirrors ...</li>
      </ul>

      <h2 id="v0-34-0">0.34.0 &#8212; 2026-08-20</h2>

      <p>Eleven defects reported ... Plugin manifest bumped <code>0.33.0</code> &rarr; <code>0.34.0</code> per <a href="AGENTS.md">AGENTS.md</a> &sect;7.5.</p>
```
Copied by Task 4: `<h2 id="unreleased">` is renamed to `<h2
id="v0-35-0">0.35.0 &#8212; 2026-08-27</h2>`; a release-summary `<p>`
(mirroring the 0.34.0 paragraph's shape) is inserted below it; the existing
`Changed` `<ul>` (with its entry-89 `<li>` preserved) gains two new `<li>`
items (decisions.md entries 90/91) plus the mandatory plugin.json-bump
`<li>`; a new `<h3 id="v0-35-0-added">Added</h3>` lists the 3 anti-pattern
mirrors; a fresh empty `<h2 id="unreleased">Unreleased</h2>` is started
above the renamed block.

# SOURCE: plugins/relay/.claude-plugin/plugin.json:3
```json
  "version": "0.34.0",
```
Copied by Task 5: value changed to `"0.35.0"`. No other field changes.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `docs/decisions.md` | UPDATE (append-only) | Append two dated `[2026-08-27]` governance entries (Preflight; R-SEM prose) immediately before the closing template comment. Never regenerate. |
| `documentation/governance/decisions.html` | UPDATE | Mirror the two new entries as numbered entries 90-91 (kv-block shape) plus two index rows, restoring the `decisions-mirror` count invariant. |
| `documentation/governance/anti-patterns.html` | UPDATE | Mirror the 3 in-scope `docs/anti-patterns.md` entries (11-13) already added by Phases 2/4, plus 3 index rows. The 2 pre-existing, unrelated `figma-quota-resilience` gaps are deliberately left unmirrored (see `## Notes`). |
| `documentation/changelog.html` | UPDATE | Cut `0.35.0`: rename `Unreleased` → dated release block with summary paragraph, `Changed` (2 decisions.md mirrors + plugin.json bump) and `Added` (3 anti-pattern mirrors) sections; start a fresh empty `Unreleased` above it. |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Bump `version` `0.34.0` → `0.35.0` (§7.5 binding contract; this release ships plugin assets across Phases 1-4: `context-builder`, `relay-write-test.md`, `relay-implement.md`, `code-reviewer.md`, `implementer.md`, `docs/context/methodology.md`). |

## NOT Building (Scope Limits)

- **Not modifying any `plugins/relay/agents/*.md`, `plugins/relay/commands/*.md`,
  or `plugins/relay/skills/*` body.** Those were shipped in Phases 1-4 and are
  out of scope here; this phase only documents and version-cuts them.
- **Not regenerating `docs/decisions.md` or `docs/anti-patterns.md`
  wholesale.** `docs/decisions.md` is append-only (2 new entries added, rest
  PRESERVE-ENTIRELY); `docs/anti-patterns.md` is not touched at all — its 3
  in-scope entries already exist from Phases 2/4.
- **Not mirroring the 2 pre-existing `figma-quota-resilience` anti-pattern
  entries** ("Sleeping, retrying, or backing off against a Figma MCP quota
  error"; "Wholesale confidence downgrade on a degraded Figma rung") into
  `anti-patterns.html`. That drift predates and is unrelated to this PRD; see
  `## Notes` for the explicit rationale.
- **Not authoring a new `scripts/validate/checks/anti-patterns-mirror.mjs`
  check.** Considered and explicitly deferred — see `## Notes`.
- **Not adding any new `documentation/` page, NAV entry, search-index entry,
  or top-level folder.** Every edit touches an existing registered page; per
  AGENTS.md §9 (modify-existing-page workflow), the three-file registration
  rule's NAV/search-index obligations apply only to new pages.
- **Not running the full `node:test` corpus.** A pre-existing, unrelated
  failure (`scripts/validate/checks/relay-field-findings-2026-08.test.mjs:84`)
  fails at the base commit too; validation here is scoped to `npm run
  validate`'s 14 static checks plus targeted greps.
- **Not committing anything.** Pillar 2 (`/relay-implement`) never commits;
  the worktree stays uncommitted after this phase.

## Step-by-Step Tasks

### Task 1: UPDATE docs/decisions.md (append Preflight + R-SEM prose entries)

- **ACTION**: Append two new dated entries immediately before the `<!--
  Template for future entries:` comment (docs/decisions.md:2179), separated
  by `---`, in the canonical Context/Decision/Reason/Areas-affected shape:
  (a) `## [2026-08-27] Test-file formatting is normalized before base_commit/diff_target capture`
  — records that `/relay-implement`'s Phase A.1 preflight runs the same
  three-branch formatter-discovery chain as Prevention, scoped to the
  canonical test globs, before `base_commit` is recorded
  (`relay-implement.md:195`), so `git diff --name-only <diff_target>..HEAD
  -- <test-globs>` is empty for formatting-only content regardless of suite
  provenance; and that formatting is never a `TEST_CONTRACT_DISPUTE`
  subject. (b) `## [2026-08-27] Reviewer findings are never self-executing test-edit authorization`
  — records that `code-reviewer.md`'s R-SEM section and `implementer.md`'s
  dispute guidance both now state explicitly that an R-SEM finding
  requesting a test change does not itself authorize editing the test;
  `TEST_CONTRACT_DISPUTE` (Phase 4.B) remains the mandatory channel even
  when the reviewer's own finding requested the change (codifying the
  2026-08-26 arbitration's second ruling). Append-only; do not regenerate
  the file.
- **MIRROR**: `# SOURCE: docs/decisions.md:2167-2189` (entry 89 shape +
  template comment).
- **Satisfies**: AC-A2, AC-A3.
- **VALIDATE**:
  ```bash
  # bash
  set -euo pipefail
  grep -q '^## \[2026-08-27\] Test-file formatting is normalized before' docs/decisions.md
  grep -q '^## \[2026-08-27\] Reviewer findings are never self-executing test-edit authorization' docs/decisions.md
  echo "PASS: both decisions.md entries present"
  ```
  ```powershell
  # PowerShell
  $e1 = Select-String -Path docs/decisions.md -Pattern '^## \[2026-08-27\] Test-file formatting is normalized before' -Quiet
  $e2 = Select-String -Path docs/decisions.md -Pattern '^## \[2026-08-27\] Reviewer findings are never self-executing test-edit authorization' -Quiet
  if ($e1 -and $e2) { 'PASS: both decisions.md entries present' } else { Write-Error 'FAIL: missing decisions.md entry'; exit 1 }
  ```

### Task 2: UPDATE documentation/governance/decisions.html (mirror entries 90-91)

- **ACTION**: Insert two new `<h3 id="preflight-baseline-normalization">90.
  Test-file formatting is normalized before base_commit/diff_target
  capture</h3>` and `<h3 id="r-sem-prose-clarification">91. Reviewer
  findings are never self-executing test-edit authorization</h3>` blocks
  (each with a `.kv` of Date/Context/Decision/Reason, paraphrasing Task 1's
  Markdown entries the same way entries 86-89 paraphrase theirs) immediately
  after the entry-89 block (decisions.html:853) and before `<h2
  id="how-to-add">` (855). Append two matching `<li>` rows — `<li><a
  href="#preflight-baseline-normalization">Test-file formatting is
  normalized before base_commit/diff_target capture</a></li>` and `<li><a
  href="#r-sem-prose-clarification">Reviewer findings are never
  self-executing test-edit authorization</a></li>` — immediately before
  `</ol>` (123).
- **MIRROR**: `# SOURCE: documentation/governance/decisions.html:847-853`
  (entry 89 kv-block shape) + the index tail at 119-123.
- **Satisfies**: AC-A2, AC-A3.
- **VALIDATE**:
  ```bash
  # bash
  set -euo pipefail
  grep -q 'id="preflight-baseline-normalization"' documentation/governance/decisions.html
  grep -q 'id="r-sem-prose-clarification"' documentation/governance/decisions.html
  echo "PASS: decisions.html mirrors entries 90 and 91"
  ```
  ```powershell
  # PowerShell
  $h1 = Select-String -Path documentation/governance/decisions.html -Pattern 'id="preflight-baseline-normalization"' -Quiet
  $h2 = Select-String -Path documentation/governance/decisions.html -Pattern 'id="r-sem-prose-clarification"' -Quiet
  if ($h1 -and $h2) { 'PASS: decisions.html mirrors entries 90 and 91' } else { Write-Error 'FAIL: missing html mirror'; exit 1 }
  ```

### Task 3: UPDATE documentation/governance/anti-patterns.html (mirror entries 11-13)

- **ACTION**: Insert three new `<h2 id="...">` + `callout--error` blocks —
  `id="formatter-cmd-heuristic-inference"` (11. "Inferring `formatter_cmd`'s
  value or invocation source outside its declared discovery chain"),
  `id="r-sem-not-authorization"` (12. "Treating an R-SEM finding as
  self-executing test-edit authorization"), `id="dispute-for-formatting"`
  (13. "Opening `TEST_CONTRACT_DISPUTE` for formatting") — sourced verbatim
  in spirit from `docs/anti-patterns.md:125-148` (What it is / Why it's
  forbidden / What to do instead / Areas affected paragraphs), placed
  immediately after the entry-10 block (anti-patterns.html:152) and before
  `<h2 id="how-to-add">` (154). Append three matching `<li>` index rows
  immediately before `</ol>` (44). Deliberately do NOT add entries for the
  two pre-existing `figma-quota-resilience` gaps (see `## Notes`).
- **MIRROR**: `# SOURCE: documentation/governance/anti-patterns.html:143-153`
  (entry 10 shape) + the index at 33-44.
- **Satisfies**: AC-A4, AC-A7.
- **VALIDATE**:
  ```bash
  # bash
  set -euo pipefail
  grep -q 'id="formatter-cmd-heuristic-inference"' documentation/governance/anti-patterns.html
  grep -q 'id="r-sem-not-authorization"' documentation/governance/anti-patterns.html
  grep -q 'id="dispute-for-formatting"' documentation/governance/anti-patterns.html
  echo "PASS: three new anti-pattern HTML mirrors present"
  ```
  ```powershell
  # PowerShell
  $a = Select-String -Path documentation/governance/anti-patterns.html -Pattern 'id="formatter-cmd-heuristic-inference"' -Quiet
  $b = Select-String -Path documentation/governance/anti-patterns.html -Pattern 'id="r-sem-not-authorization"' -Quiet
  $c = Select-String -Path documentation/governance/anti-patterns.html -Pattern 'id="dispute-for-formatting"' -Quiet
  if ($a -and $b -and $c) { 'PASS: three new anti-pattern HTML mirrors present' } else { Write-Error 'FAIL: missing anti-pattern mirror'; exit 1 }
  ```

### Task 4: UPDATE documentation/changelog.html (cut 0.35.0 + fresh Unreleased)

- **ACTION**: Rename `<h2 id="unreleased">Unreleased</h2>` (changelog.html:31)
  to `<h2 id="v0-35-0">0.35.0 &#8212; 2026-08-27</h2>` (em dash — AGENTS.md
  §4). Insert a release-summary `<p>` immediately below it describing the
  release (ships `test-formatting-prevention-preflight`: the `formatter_cmd`
  contract, command-layer Prevention in `/relay-write-test`, Preflight
  normalization in `/relay-implement` before the R-X inspection window, and
  the R-SEM prose clarification — zero R-X/D17 carve-outs throughout;
  plugin manifest bumped `0.34.0` → `0.35.0` per AGENTS.md §7.5). Rename the
  existing `id="unreleased-changed"` h3 to `id="v0-35-0-changed"`, keep its
  existing entry-89 `<li>`, and add two new `<li>` items for the decisions.md
  entries 90/91 plus the mandatory plugin.json-bump `<li>` (mirroring the
  0.34.0 Changed bullet shape, `0.34.0` → `0.35.0`, fresh `relay/0.35.0/`
  cache directory). Add a new `<h3 id="v0-35-0-added">Added</h3>` listing
  the 3 anti-pattern HTML mirrors (Task 3). Start a fresh, empty `<h2
  id="unreleased">Unreleased</h2>` block ABOVE the new 0.35.0 block (newest
  at the top, AGENTS.md §7.3). No emojis; no inline styles.
- **MIRROR**: `# SOURCE: documentation/changelog.html:31-48` (Unreleased
  block being renamed + the 0.34.0 block being used as the release-cut
  template).
- **Satisfies**: AC-A5.
- **VALIDATE**:
  ```bash
  # bash
  set -euo pipefail
  grep -q 'id="v0-35-0"' documentation/changelog.html
  [ "$(grep -c 'id="unreleased"' documentation/changelog.html)" = "1" ]
  echo "PASS: 0.35.0 cut + exactly one fresh Unreleased block"
  ```
  ```powershell
  # PowerShell
  $cut = Select-String -Path documentation/changelog.html -Pattern 'id="v0-35-0"' -Quiet
  $unrel = (Select-String -Path documentation/changelog.html -Pattern 'id="unreleased"').Count
  if ($cut -and $unrel -eq 1) { 'PASS: 0.35.0 cut + exactly one fresh Unreleased block' } else { Write-Error 'FAIL: cut or Unreleased-count wrong'; exit 1 }
  ```

### Task 5: UPDATE plugins/relay/.claude-plugin/plugin.json (bump version)

- **ACTION**: Change the `version` field value from `0.34.0` to `0.35.0`. No
  other field changes. Pairs with Task 4's changelog cut in the same change
  per the §7.5 binding contract.
- **MIRROR**: `# SOURCE: plugins/relay/.claude-plugin/plugin.json:3`
  (current `"version": "0.34.0"`).
- **Satisfies**: AC-A5.
- **VALIDATE**:
  ```bash
  # bash
  set -euo pipefail
  grep -q '"version": "0.35.0"' plugins/relay/.claude-plugin/plugin.json
  echo "PASS: plugin.json bumped to 0.35.0"
  ```
  ```powershell
  # PowerShell
  if (Select-String -Path plugins/relay/.claude-plugin/plugin.json -Pattern '"version": "0.35.0"' -Quiet) { 'PASS: plugin.json bumped to 0.35.0' } else { Write-Error 'FAIL: version not bumped'; exit 1 }
  ```

## Validation Commands

This repository declares `test_frameworks: ["node:test"]` but this phase's
`## Files to Change` table contains zero application source or test files
(`phase_type: docs`) — validation is `npm run validate` (the repo's 14-check
static-analysis gate) plus targeted filesystem/grep checks, never a
`node:test` invocation. See `## Notes` for the framework-mismatch exemption.

### Level 1 STATIC_ANALYSIS

```bash
# bash
npm run validate
```
```powershell
# PowerShell
npm run validate
```
`npm run validate` (`scripts/validate/index.mjs`) sets `process.exitCode = 1`
when any of its 14 registered checks fails — including `decisions-mirror`,
which mechanically re-derives the count invariant Tasks 1-2 restore. Real
exit-code semantics: the command's own exit code propagates, no
`echo`-masking.

JSON well-formedness of the touched manifest:

```bash
# bash
node -e "JSON.parse(require('fs').readFileSync('plugins/relay/.claude-plugin/plugin.json','utf8'))" && echo "plugin.json OK"
```
```powershell
# PowerShell
try { Get-Content plugins/relay/.claude-plugin/plugin.json -Raw | ConvertFrom-Json | Out-Null; 'plugin.json OK' } catch { Write-Error 'plugin.json FAIL'; exit 1 }
```

No-emoji guard on every touched `documentation/` file (AGENTS.md §2.5).

**Command-layer correction (2026-08-27):** the originally-authored bash and
PowerShell variants of this guard were both found non-functional on this
machine at implement time, and are replaced below. Evidence:
- The bash variant used `grep -rlP`, which aborts on this git-bash build with
  "grep: -P supports only unibyte and UTF-8 locales" — it never evaluates.
- The PowerShell variant used `\p{So}`, which in .NET/PowerShell 5.1 matches
  U+00A7 SECTION SIGN even though .NET's own
  `[System.Globalization.CharUnicodeInfo]::GetUnicodeCategory` correctly
  reports it as OtherPunctuation. This repo legitimately uses `§` nine times
  (the AGENTS.md §7.5 references), so the guard reported permanent false
  failures. Worse, when that same pattern is written into a `.ps1` file rather
  than passed inline, PowerShell 5.1 reads the file as ANSI, mangles the
  literal glyphs, throws "range in reverse order", and returns exit 0 for
  every input — a silent always-pass.

Replaced with a Python guard over the two emoji ranges the original line named. Python is
already a dependency of this repo's tooling and gives correct categories.

```bash
python - documentation/governance/decisions.html documentation/governance/anti-patterns.html documentation/changelog.html <<'GUARD'
import sys
# The two ranges the original bash line named: astral emoji, plus misc symbols
# and dingbats. Deliberately NOT `unicodedata.category(ch) == "So"`, which is
# broader than "emoji" and flags the box-drawing characters (U+2500-U+257F)
# this documentation legitimately uses to render directory trees.
RANGES = ((0x1F300, 0x1FAFF), (0x2600, 0x27BF))
bad = []
for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as fh:
        for n, line in enumerate(fh, 1):
            for ch in line:
                cp = ord(ch)
                if any(lo <= cp <= hi for lo, hi in RANGES):
                    bad.append("%s:%d: U+%04X" % (path, n, cp))
if bad:
    print("FAIL: emoji found")
    for b in bad:
        print(" ", b)
    sys.exit(1)
print("PASS: no emoji")
sys.exit(0)
GUARD
```

Verified in BOTH directions against scratch files in a temp directory (never
against repo files), with the observed exit codes:
- `§` SECTION SIGN → exit 0 (correctly NOT flagged; this is the case the old
  PowerShell variant got wrong)
- `→` RIGHTWARDS ARROW (category Sm) → exit 0 (correctly not an emoji)
- plain ASCII → exit 0
- `☀` (BMP, category So) → exit 1
- `➿` (dingbat, category So) → exit 1
- an astral emoji U+1F4CA (surrogate pair) → exit 1
Run against the three real touched files it reports `PASS: no emoji`, exit 0,
independently confirming zero category-So characters were introduced.

### Level 2 CONTENT_INVARIANTS

Version lock-step (plugin.json == changelog cut version, fresh Unreleased):

```bash
# bash
set -euo pipefail
grep -q '"version": "0.35.0"' plugins/relay/.claude-plugin/plugin.json
grep -q 'id="v0-35-0"' documentation/changelog.html
[ "$(grep -c 'id="unreleased"' documentation/changelog.html)" = "1" ]
echo "PASS: version lock-step + fresh Unreleased"
```
```powershell
# PowerShell
$pv = Select-String -Path plugins/relay/.claude-plugin/plugin.json -Pattern '"version": "0.35.0"' -Quiet
$cut = Select-String -Path documentation/changelog.html -Pattern 'id="v0-35-0"' -Quiet
$unrel = (Select-String -Path documentation/changelog.html -Pattern 'id="unreleased"').Count
if ($pv -and $cut -and $unrel -eq 1) { 'PASS: version lock-step + fresh Unreleased' } else { Write-Error 'FAIL'; exit 1 }
```

Governance entries + HTML mirrors present (all 5 new anchors from Tasks
1-3 in one assertion):

```bash
# bash
set -euo pipefail
grep -q '^## \[2026-08-27\] Test-file formatting is normalized before' docs/decisions.md
grep -q '^## \[2026-08-27\] Reviewer findings are never self-executing test-edit authorization' docs/decisions.md
grep -q 'id="preflight-baseline-normalization"' documentation/governance/decisions.html
grep -q 'id="r-sem-prose-clarification"' documentation/governance/decisions.html
grep -q 'id="formatter-cmd-heuristic-inference"' documentation/governance/anti-patterns.html
grep -q 'id="r-sem-not-authorization"' documentation/governance/anti-patterns.html
grep -q 'id="dispute-for-formatting"' documentation/governance/anti-patterns.html
echo "PASS: governance entries + HTML mirrors present"
```
```powershell
# PowerShell
$checks = @(
  @{Path='docs/decisions.md'; Pattern='^## \[2026-08-27\] Test-file formatting is normalized before'},
  @{Path='docs/decisions.md'; Pattern='^## \[2026-08-27\] Reviewer findings are never self-executing test-edit authorization'},
  @{Path='documentation/governance/decisions.html'; Pattern='id="preflight-baseline-normalization"'},
  @{Path='documentation/governance/decisions.html'; Pattern='id="r-sem-prose-clarification"'},
  @{Path='documentation/governance/anti-patterns.html'; Pattern='id="formatter-cmd-heuristic-inference"'},
  @{Path='documentation/governance/anti-patterns.html'; Pattern='id="r-sem-not-authorization"'},
  @{Path='documentation/governance/anti-patterns.html'; Pattern='id="dispute-for-formatting"'}
)
$allOk = $true
foreach ($c in $checks) { if (-not (Select-String -Path $c.Path -Pattern $c.Pattern -Quiet)) { $allOk = $false } }
if ($allOk) { 'PASS: governance entries + HTML mirrors present' } else { Write-Error 'FAIL'; exit 1 }
```

### Level 3 DRY-RUN END-TO-END

One consolidated sweep re-asserting every Level 1/2 check plus `npm run
validate` in a single failable chain:

```bash
# bash — one-shot consistency assertion
set -euo pipefail
npm run validate
grep -q '"version": "0.35.0"' plugins/relay/.claude-plugin/plugin.json
grep -q 'id="v0-35-0"' documentation/changelog.html
[ "$(grep -c 'id="unreleased"' documentation/changelog.html)" = "1" ]
grep -q '^## \[2026-08-27\] Test-file formatting is normalized before' docs/decisions.md
grep -q '^## \[2026-08-27\] Reviewer findings are never self-executing test-edit authorization' docs/decisions.md
grep -q 'id="preflight-baseline-normalization"' documentation/governance/decisions.html
grep -q 'id="r-sem-prose-clarification"' documentation/governance/decisions.html
grep -q 'id="formatter-cmd-heuristic-inference"' documentation/governance/anti-patterns.html
grep -q 'id="r-sem-not-authorization"' documentation/governance/anti-patterns.html
grep -q 'id="dispute-for-formatting"' documentation/governance/anti-patterns.html
echo "Phase 5 release-cut consistency: PASS"
```
```powershell
# PowerShell — one-shot consistency assertion
npm run validate
if ($LASTEXITCODE -ne 0) { Write-Error 'npm run validate FAILED'; exit 1 }
$pv = Select-String -Path plugins/relay/.claude-plugin/plugin.json -Pattern '"version": "0.35.0"' -Quiet
$cut = Select-String -Path documentation/changelog.html -Pattern 'id="v0-35-0"' -Quiet
$unrel = (Select-String -Path documentation/changelog.html -Pattern 'id="unreleased"').Count
$d1 = Select-String -Path docs/decisions.md -Pattern '^## \[2026-08-27\] Test-file formatting is normalized before' -Quiet
$d2 = Select-String -Path docs/decisions.md -Pattern '^## \[2026-08-27\] Reviewer findings are never self-executing test-edit authorization' -Quiet
$h1 = Select-String -Path documentation/governance/decisions.html -Pattern 'id="preflight-baseline-normalization"' -Quiet
$h2 = Select-String -Path documentation/governance/decisions.html -Pattern 'id="r-sem-prose-clarification"' -Quiet
$a1 = Select-String -Path documentation/governance/anti-patterns.html -Pattern 'id="formatter-cmd-heuristic-inference"' -Quiet
$a2 = Select-String -Path documentation/governance/anti-patterns.html -Pattern 'id="r-sem-not-authorization"' -Quiet
$a3 = Select-String -Path documentation/governance/anti-patterns.html -Pattern 'id="dispute-for-formatting"' -Quiet
if ($pv -and $cut -and ($unrel -eq 1) -and $d1 -and $d2 -and $h1 -and $h2 -and $a1 -and $a2 -and $a3) { 'Phase 5 release-cut consistency: PASS' } else { Write-Error 'Phase 5 release-cut consistency: FAIL'; exit 1 }
```

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** `npm run validate` exits 0 against the full change
  surface (Phases 1-4's shipped agents/commands/skills + this phase's
  `docs/decisions.md`, `documentation/` site edits, and `plugin.json` bump).
- **AC-A2 (PRD AC-3 traceability):** `docs/decisions.md` carries a new
  `[2026-08-27]` entry documenting the Preflight mechanism (test-file
  formatting normalized before `base_commit`/`diff_target` capture),
  mirrored into `documentation/governance/decisions.html` as entry 90 with a
  matching index row.
- **AC-A3 (PRD AC-5, AC-7 traceability):** `docs/decisions.md` carries a
  second new `[2026-08-27]` entry documenting the R-SEM prose clarification
  (reviewer findings are not self-executing test-edit authorization;
  formatting is never a dispute subject), mirrored into
  `documentation/governance/decisions.html` as entry 91 with a matching
  index row.
- **AC-A4 (PRD AC-8):** `documentation/governance/anti-patterns.html` mirrors
  the 3 `docs/anti-patterns.md` entries this PRD's Phases 2 and 4 added
  (formatter_cmd heuristic inference; R-SEM not self-executing; dispute for
  formatting), each as a full `<h2>` entry plus a matching index row — part
  of the "docs site three-file rule" surface AC-8 names as in scope for the
  `npm run validate` green check.
- **AC-A5 (PRD AC-8, §7.5):** `plugins/relay/.claude-plugin/plugin.json`
  `version` is `0.35.0`, and `documentation/changelog.html`'s `Unreleased`
  block is renamed to a dated `0.35.0` release section carrying a
  release-summary paragraph and the mandatory plugin.json-bump line, with
  exactly one fresh empty `Unreleased` block above it.
- **AC-A6 (PRD AC-8):** No artifact path written or referenced by this phase
  is under `.claude/`; every edit resolves under `docs/`, `documentation/`,
  or `plugins/relay/.claude-plugin/` at the target repo root — a structural
  precondition for the "full change surface" AC-8's `npm run validate` pass
  is asserting over.
- **AC-A7 (PRD AC-8):** This phase's `## Notes` explicitly records, rather
  than silently omits, the deliberate decision to leave the 2 pre-existing
  `figma-quota-resilience` anti-pattern entries unmirrored on the HTML site
  — the documentation-coherence bar AC-8's "full change surface" success
  signal (changelog entry present; version parity check green) is read
  against.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing an anti-pattern HTML mirror (or leaving the residual figma-quota-resilience drift unrecorded) repeats the exact silent-drift incident `decisions-mirror.mjs`'s own doc-comment names ("eleven decisions ... sat in the markdown with no counterpart on the site at all") | M | M | Task 3 enumerates each of the 3 in-scope entries with an individual VALIDATE grep; `## Notes` records the figma-quota-resilience decision explicitly rather than omitting it. |
| `plugin.json` bump and changelog cut land out of lock-step (one without the other) | M | H | Level 2/3 validation asserts both `"version": "0.35.0"` AND `id="v0-35-0"` in the same failable chain, mirroring the Phase-4 precedent (`relay-approve-command-phase-4-...plan.md:512-527`). |
| `docs/decisions.md` edited non-additively (regenerated instead of appended) | L | H | Task 1 is append-only, inserted immediately before the closing template comment; PRESERVE-ENTIRELY for the rest of the file. |
| `npm run validate` regresses due to an unrelated pre-existing `node:test` failure being mistaken for this phase's fault | L | M | Validation is scoped to `npm run validate`'s 14 static checks (no `node:test` corpus invocation); `relay-field-findings-2026-08.test.mjs:84`'s pre-existing failure is out of this Level's scope entirely. |
| `docs/decisions.md` entry count vs `decisions.html` entry/index count drift — the exact failure `decisions-mirror.mjs` exists to catch | M | M | `npm run validate` Level 1 runs `decisions-mirror` as one of its 14 checks; Task 2's paired entry + index-row additions are what keeps the count aligned. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd`
in `docs/context/methodology.md`: **false**. Test-after ordering — when a
test framework is declared, the test pair (test-writer/test-reviewer)
authors and maintains the suite from the Acceptance Criteria above, after
the Implementer + Code Review; with no framework declared, no tests are
authored. (This repo declares `test_frameworks: ["node:test"]`, so the pair
is active in test-after mode for phases that touch application source — but
this phase's `## Files to Change` table contains none, so no test-file
activity is expected from this phase at all.)

- **`phase_type: docs` framework-mismatch exemption:** this repo declares
  `test_frameworks: ["node:test"]`, but every file this phase touches is
  Markdown, HTML, or the plugin manifest JSON — no application source, no
  test file. All `VALIDATE` commands above are filesystem/grep-oriented per
  the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` docs/scaffold exemption (the same
  exemption the `relay-approve-command` Phase 4 release-cut plan relied on
  under an earlier `test_frameworks: []` declaration — the exemption is keyed
  on `phase_type`, not on whether the repo happens to declare a framework
  elsewhere).
- **Anti-patterns.html scope decision (deliberate, not silent):** `docs/anti-patterns.md`
  has 15 real entries; `documentation/governance/anti-patterns.html` mirrors
  only 10 today. Of the 5 missing, 3 belong to this PRD (formatter_cmd
  heuristic inference, R-SEM not self-executing, dispute-for-formatting) and
  are mirrored by Task 3. The other 2 — "Sleeping, retrying, or backing off
  against a Figma MCP quota error" and "Wholesale confidence downgrade on a
  degraded Figma rung" — are pre-existing drift from the unrelated
  `figma-quota-resilience` feature line. This plan deliberately does NOT fix
  them: fixing them here would mix an unrelated feature's documentation debt
  into this PRD's diff, and attribute it to `test-formatting-prevention-preflight`
  in git history for no functional reason. They are recorded here, in the
  open, as a known residual gap rather than silently left — the outcome the
  task brief explicitly asked this plan to avoid. A follow-up phase or a
  dedicated docs-debt phase against `figma-quota-resilience` (or a future
  `/relay-plan` invocation against that PRD) is the correct place to close
  them.
- **`anti-patterns-mirror.mjs` check — considered, explicitly deferred:**
  no mechanical parity check exists for `docs/anti-patterns.md` ↔
  `documentation/governance/anti-patterns.html` today (only
  `decisions-mirror.mjs` exists, for the decisions pair). Authoring one
  would be the single highest-leverage fix available in this area — it
  would make the drift class this `## Notes` section is currently
  compensating for by hand mechanically impossible going forward, mirroring
  `decisions-mirror.mjs`'s own count-comparison pattern (undated `## `
  headings vs `<h2 id=` count, index-vs-body count). It is deliberately NOT
  built in this phase: the source PRD's Phase 5 scope names exactly three
  deliverables (documentation site three-file rule, `docs/decisions.md`
  entry, `plugin.json` bump) and does not name a new validation check; and
  adding a new `.mjs` module would pull a real application-source file into
  this phase's `## Files to Change` table, breaking the `phase_type: docs`
  classification this plan relies on for its framework-mismatch exemption —
  it would additionally need its own `node:test` unit-test coverage
  authored by the test pair (test-writer/test-reviewer) in a separate
  lifecycle event this phase's Implementer scope cannot provide (R-X
  strict). This is recorded as an explicit, reasoned deferral, not an
  oversight — a strong candidate for a small, dedicated follow-up phase.
- **Dogfood note:** this release cut is structurally identical to the
  `relay-approve-command` Phase 4 release-cut plan (decisions.md append +
  HTML governance mirror + changelog cut + plugin.json bump), reused here as
  the direct structural template — see `## Mandatory Reading` and `##
  Patterns to Mirror`.

*Generated: 2026-08-27*
*Approved: 2026-08-27*
*Implemented: 2026-08-27*
*Status: IMPLEMENTED*
