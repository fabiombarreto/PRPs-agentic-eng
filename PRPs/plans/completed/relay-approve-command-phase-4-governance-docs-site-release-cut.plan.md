# Feature: Governance + docs site + release cut (Phase 4 of relay-approve-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (docs/decisions.md governance entry + multi-surface docs flip); release cut (v0.17.0 changelog + plugin.json lock-step bump); impacts the documentation/ rendered site (binding documentation/AGENTS.md contract)
- Decisions found:
  - [2026-05-18] Pillar 3 command surface: `/relay-commit` + `/relay-pr` + `/relay-approve` (three-command split); `/relay-approve` was recorded as "(Placeholder — Phase 4)" — this phase ships it
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute` never commits or opens a PR; Pillar 3 owns commit→push→PR→merge; `/relay-approve` merges + runs the docs cycle + cleans up
  - [2026-04-30] Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html (§7.5 binding contract); minor bump → matching plugin.json bump in the same change
  - [2026-04-19] Phased rollout — project Phase 4 (Approval) = merge + docs updater
  - [2026-04-19] Injecting plugin defaults into the target project's `decisions.md` is forbidden — the docs/decisions.md entry records only this project's own /relay-approve design decision, not relay plugin defaults injected elsewhere
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" (docs/anti-patterns.md:60-66) — this plan and every artifact path resolve under `PRPs/`; no `.claude/` write
  - "Injecting plugin defaults into the target project's `decisions.md`" (docs/anti-patterns.md:51-56) — the appended decisions.md entry is a project-own design decision, not a relay default copied into a target
- Applicable architectural rules:
  - documentation/AGENTS.md is binding for every `documentation/` edit: three-file registration rule (NAV in assets/js/app.js + search-index.json + changelog), §7.5 plugin-version lock-step, no emojis, relative paths, canonical page template, no inline styles, badge/callout vocabulary (`badge--done` / `badge--partial`), no new CSS/JS files
  - PRP artifacts under `PRPs/` at the repo root
  - Counts must stay mutually consistent across all surfaces (commands.html, status.html, api-reference.md, architecture.md, search-index.json) — a likely R-COH / R-SEM check
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-approve-command.prd.md` — Implementation Phases row 4:
  "Governance + docs site + release cut" — Goal: Make the shipped command
  visible and documented; record the design decision. — Success signal:
  Every surface names `/relay-approve` and the two agents as implemented;
  `plugin.json` == changelog version; counts internally consistent.

## Summary

This phase is the release/registry-closing cut for the `relay-approve-command`
feature: rows 1–3 already shipped the `docs-updater` agent, the `docs-reviewer`
agent, and the `/relay-approve` command + allowlist patterns onto disk, with
the changelog's `Unreleased` block accumulating their "Added" items plus a
command-count "Fixed" item. This phase makes those shipped assets visible to
installed users and consistent across every documentation surface: it appends a
governance entry to `docs/decisions.md` recording the `/relay-approve` design
(deterministic merge+cleanup command, the Docs Updater/Docs Reviewer pair, the
cli/cli #13380 cleanup ordering, the merge-commit default, docs-commit-on-base
per OQ-a, docs/-only scope per OQ-b, and the interactivity-boundary extension);
flips `/relay-approve` from placeholder to implemented and moves both agents from
"Planned" to "Implemented" in `docs/api-reference.md`, `docs/context/architecture.md`,
`documentation/reference/commands.html`, and `documentation/reference/agents.html`;
flips `documentation/roadmap/status.html` Phase 4 to done; cuts `v0.17.0` in
`documentation/changelog.html` (rename `Unreleased` → `0.17.0 — 2026-06-19`,
add a release-summary paragraph, add the mandatory `plugin.json` bump line under
Changed, start a fresh empty `Unreleased`); bumps `plugins/relay/.claude-plugin/plugin.json`
`0.16.0` → `0.17.0` per the §7.5 lock-step contract; and keeps the command count
mutually consistent at "14 commands, no placeholder" across all five count
surfaces. Every `documentation/` edit honors the binding `documentation/AGENTS.md`
contract. The R-COH-REGISTRY-MISSING checks are satisfied BY this phase (changelog
version cut + agents.html sections + commands.html flip).

## User Story

As a relay operator who has installed the plugin from the marketplace
I want every documentation surface to name `/relay-approve` and the Docs Updater /
Docs Reviewer agents as implemented, and the plugin manifest bumped so my cache
refreshes
So that I can discover and run the now-shipped Pillar 3 close-out command, and so
the knowledge base does not drift from what actually shipped.

## Problem Statement

Rows 1–3 of the `relay-approve-command` PRD shipped the `docs-updater` agent,
the `docs-reviewer` agent, and the `/relay-approve` command + four allowlist
patterns onto disk, but every documentation surface still describes `/relay-approve`
as a placeholder and both agents as "Planned". The plugin manifest is frozen at
`0.16.0`, so installed users who run `/plugin` keep loading the cached old plugin
and never pick up the newly-shipped Pillar 3 command and agents (the exact
cache-staleness failure mode the 2026-04-30 §7.5 contract exists to prevent). The
command-count surfaces (`commands.html`, `status.html`, `api-reference.md`,
`architecture.md`, `search-index.json`) still read "13 commands + 1 placeholder",
which becomes wrong the moment `/relay-approve` is shipped. No `docs/decisions.md`
entry records the `/relay-approve` design, so the rationale (cleanup ordering, the
docs pair, the interactivity-boundary extension) is not in the governance log future
agents consult.

## Solution Statement

Ship the release cut: append a single dated governance entry to `docs/decisions.md`
recording the `/relay-approve` design and the conscious interactivity-boundary
extension (the docs pair MAY dialogue post-merge); flip `/relay-approve` to
implemented and both agents from Planned to Implemented across `docs/api-reference.md`,
`docs/context/architecture.md`, `documentation/reference/commands.html`, and
`documentation/reference/agents.html`; flip `documentation/roadmap/status.html`
Phase 4 to done; cut `v0.17.0` in `documentation/changelog.html` (rename the
accumulated `Unreleased` block, add a release summary, add the §7.5 plugin-bump
line under Changed, start a fresh empty `Unreleased`); bump
`plugins/relay/.claude-plugin/plugin.json` to `0.17.0`; and update the two
count-bearing `search-index.json` excerpts and every count surface so all read
"14 commands, no placeholder" and stay mutually consistent. Every `documentation/`
edit follows the canonical page template, badge/callout vocabulary, relative-path,
no-emoji, and no-inline-style rules from `documentation/AGENTS.md`. The edits are
surgical (no PRESERVE-ENTIRELY file regenerated wholesale; `docs/decisions.md`
is append-only).

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation / governance / release cut |
| Complexity | Medium (9 files across markdown + JSON + HTML; mutual-consistency invariant across 5 count surfaces; binding AGENTS.md contract) |
| Systems Affected | `docs/` knowledge base (decisions, api-reference, architecture); `documentation/` rendered site (commands.html, agents.html, status.html, changelog.html, search-index.json); plugin manifest (plugin.json) |
| Dependencies | Phase 3 complete (`/relay-approve` command + allowlist shipped); Phases 1–2 complete (docs-updater + docs-reviewer agents shipped) — all `complete` per the source PRD Implementation Phases table |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/relay-approve-command.prd.md` Implementation Phases row 4 (line 192); Phase Details lines 211-214 |
| phase_type | docs |

`phase_type: docs` — the `## Files to Change` table contains only documentation
files (`.md`, `.html`) plus the plugin manifest JSON and the search-index JSON
data file; no application source files. Validation is filesystem/grep-oriented
(`test_frameworks: []` in `docs/context/methodology.md`), not test-framework
invocation. This value is consumed by `plan-reviewer` Phase 0 and the
`R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption branch — it is accurate for this
phase and is NOT a `scaffold` masquerade on a feature phase.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `documentation/AGENTS.md` | 1-481 (esp. §2 invariants, §5 CSS vocabulary, §6 three-file registration, §7 changelog + §7.5 plugin-version lock-step, §9 modify-existing-page workflow) | BINDING contract for every `documentation/` edit. Three-file registration rule, §7.5 minor-bump → matching plugin.json bump in the same change, no emojis, relative paths, canonical page template, no inline styles, badge/callout vocabulary. Read in full before any HTML edit. |
| 1 | `PRPs/prds/relay-approve-command.prd.md` | 187-214 (Implementation Phases + Phase Details), 65-79 (Acceptance Criteria for traceability) | Source PRD: row 4 scope and success signal; AC-12 (allowlist) and the design facts the decisions.md entry records. |
| 2 | `documentation/changelog.html` | 31-92 (Unreleased block + 0.16.0 + 0.15.0 release blocks) | The accumulated `Unreleased` block (lines 31-43: 3 Added items + 1 Fixed item) is what gets cut to `0.17.0`; the 0.16.0/0.15.0 blocks are the mirror for the release-summary `<p>` and the §7.5 plugin-bump `<li>` under Changed. |
| 2 | `docs/decisions.md` | 591-606 (2026-05-18 Pillar 3 entry), 380-390 (2026-04-30 §7.5 entry), 628-637 (template comment) | The 2026-05-18 entry marks `/relay-approve` as "(Placeholder — Phase 4)"; the new [2026-06-19] entry records it as shipped. The template comment at the file end fixes the canonical four-field entry shape; new entry appends immediately before it. |
| 2 | `documentation/reference/commands.html` | 24 (subtitle), 245-265 (relay-pr badge--done kv-block + relay-approve placeholder block) | The relay-pr entry (245-255) is the mirror for flipping the relay-approve placeholder (257-265) to `badge--done`; the subtitle (24) is one of the five count surfaces. |
| 2 | `documentation/reference/agents.html` | 77-115 (post-green-reviewer implemented section), 212-235 (plan-reviewer implemented section), 436-445 (Planned table) | Mirror for the new docs-updater + docs-reviewer implemented sections; the Planned table (442-443) is where the two agent rows are removed. |
| 2 | `documentation/roadmap/status.html` | 61-66 (Phase 4 row), 148-154 (What's shipped + 14-command line), 199-214 (Pending + Phase 4 section) | Phase 4 badge flip (partial→done); the 14-command/13-shipped line; the agents/commands shipped bullet lists. |
| 3 | `docs/api-reference.md` | 16-22 (count line), 75 (relay-approve row), 109-133 (Implemented + Planned agents) | Count surface + the relay-approve placeholder row + the "Planned: Docs Updater, Docs Reviewer" paragraph. |
| 3 | `docs/context/architecture.md` | 25 (Commands asset-type row), 117-119 (command-surface count), 53-57 + 166 (Pillar 3 / phased-rollout description) | Count surface + Pillar 3 / Phase 4 description to flip placeholder→shipped. |
| 3 | `documentation/assets/data/search-index.json` | 86-97 (Commands + Agents excerpts) | Two count-bearing excerpts: Commands (line 90: "Thirteen commands plus one Pillar 3 placeholder") must flip; Agents (line 96) may be extended for consistency. |
| 3 | `plugins/relay/.claude-plugin/plugin.json` | 1-9 (version field) | The `version` field (`0.16.0`) bumped to `0.17.0` per §7.5. |

## Patterns to Mirror

# SOURCE: documentation/changelog.html:45-57
```html
      <h2 id="v0-16-0">0.16.0 — 2026-06-18</h2>

      <p>Extends <code>/relay-commit</code> with a second mode ... Plugin manifest version bumped <code>0.15.0</code> &rarr; <code>0.16.0</code> per the 2026-04-30 &sect;7.5 binding contract (the change ships a plugin asset).</p>

      <h3 id="v0-16-0-changed">Changed</h3>
      <ul>
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.15.0</code> &rarr; <code>0.16.0</code> per the 2026-04-30 &sect;7.5 binding contract. Users running <code>/plugin</code> after pulling this version get a fresh <code>relay/0.16.0/</code> cache directory ...</li>
        ...
      </ul>
```
Copied by Task 7: the `Unreleased` block (changelog.html:31-43) is renamed to
`<h2 id="v0-17-0">0.17.0 — 2026-06-19</h2>`; a release-summary `<p>` is inserted
immediately below it (mirroring this paragraph shape, citing the §7.5 contract);
a `plugin.json` bump `<li>` (mirroring the Changed bullet above, `0.16.0` →
`0.17.0`, fresh `relay/0.17.0/` cache directory) is added under a new
`<h3 id="v0-17-0-changed">Changed</h3>`; and a fresh empty `Unreleased` block is
started above it.

# SOURCE: documentation/reference/commands.html:245-255
```html
      <h3 id="relay-pr"><code>/relay-pr &lt;feature-name&gt;</code> <span class="badge badge--done">implemented</span></h3>
      <div class="kv">
        <dt>Input</dt>
        <dd>Worktree branch with a committed implementation ...</dd>
        <dt>Output</dt>
        <dd>Branch pushed to origin ... pull request opened on GitHub via <code>gh pr create</code> ...</dd>
        <dt>Mode</dt>
        <dd>Deterministic infra command (no LLM, no agent, no writer/reviewer split). ... Idempotent: ... See <code>plugins/relay/commands/relay-pr.md</code>.</dd>
        <dt>Preconditions</dt>
        <dd>P0: argument non-empty; ... HALT codes ...</dd>
      </div>
```
Copied by Task 4: the `/relay-approve` placeholder block (commands.html:257-265)
is flipped to this shape — add `<span class="badge badge--done">implemented</span>`
to the `<h3>`, replace the `Status` row with `Mode` (deterministic infra,
delegates docs interpretation to the agent pair, points at
`plugins/relay/commands/relay-approve.md`) and `Preconditions` (the 8 named HALT
codes + `--strategy`/`--admin`/`--force`/`--no-docs` flags) rows.

# SOURCE: documentation/reference/agents.html:77-85
```html
      <h3 id="post-green-reviewer">post-green-reviewer <span class="badge badge--done">shipped</span></h3>

      <div class="kv">
        <dt>Path</dt><dd><code>plugins/relay/agents/post-green-reviewer.md</code></dd>
        <dt>Model</dt><dd>sonnet</dd>
        <dt>Invoked by</dt><dd><code>/relay-test-review</code> command</dd>
        <dt>Responsibility</dt><dd>Given a GREEN test state, verify the green wasn't achieved by weakening tests. Returns <code>APPROVED</code> or <code>CHANGES_REQUESTED</code> with a concrete concerns list.</dd>
        <dt>Never does</dt><dd>Re-run tests. Modify code. ...</dd>
      </div>
```
Copied by Task 5: two new implemented sections (`docs-updater`, `docs-reviewer`)
are added mirroring this `<h3>` + `.kv` (Path / Model / Invoked by / Responsibility /
Never does) shape, and the two corresponding rows are removed from the Planned
table (agents.html:442-443).

# SOURCE: docs/decisions.md:628-637 (canonical entry template)
```
<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
```
Copied by Task 1: a new `## [2026-06-19] /relay-approve design + interactivity-boundary
extension` entry is appended immediately BEFORE this template comment, using the
Context / Decision / Reason / Areas affected shape (mirroring the 2026-05-18
Pillar 3 entry at decisions.md:591-606). Append-only; the rest of the file is
PRESERVE-ENTIRELY.

# SOURCE: documentation/roadmap/status.html:61-66
```html
          <tr>
            <td>4</td>
            <td><strong>Approval</strong></td>
            <td><code>/relay-commit</code> (local commit, no push) <strong>shipped v0.14.0</strong>; <code>/relay-pr</code> ... <strong>shipped v0.15.0</strong>; <code>/relay-approve</code> (merge + branch/worktree cleanup + docs update) + Docs Updater + Docs Reviewer agents pending</td>
            <td><span class="badge badge--partial">partial</span></td>
          </tr>
```
Copied by Task 6: this Phase 4 row's cell is updated so all three Pillar 3
commands + both agents read as shipped (v0.17.0), and the badge flips
`badge--partial` → `badge--done`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/decisions.md` | UPDATE (append-only) | Append a dated [2026-06-19] governance entry recording the `/relay-approve` design + interactivity-boundary extension. Never regenerate (PRESERVE-ENTIRELY); insert before the closing template comment. |
| `docs/api-reference.md` | UPDATE | Flip the `/relay-approve` row from "(placeholder)" to implemented; move docs-updater + docs-reviewer from Planned to Implemented; update the command-count line (13 + 1 placeholder → 14, no placeholder). |
| `docs/context/architecture.md` | UPDATE | Update the command-surface count line (13 + 1 placeholder → 14, no placeholder); update Pillar 3 / phased-rollout Phase 4 so `/relay-approve` is shipped, not placeholder. |
| `documentation/reference/commands.html` | UPDATE | Flip the `/relay-approve` `<h3>` to a `badge--done` implemented kv-block (Mode + Preconditions); update the subtitle "Thirteen commands plus one Pillar 3 placeholder" → "Fourteen commands". |
| `documentation/reference/agents.html` | UPDATE | Add full implemented sections for docs-updater + docs-reviewer (mirror post-green-reviewer); remove their rows from the Planned table. |
| `documentation/roadmap/status.html` | UPDATE | Phase 4 badge partial → done; "14-command surface, 13 shipped, one remaining" → "all 14 shipped"; move `/relay-approve` from pending to shipped; note Docs Updater + Docs Reviewer shipped; append the two agent files + relay-pr/relay-approve commands to the shipped bullets. |
| `documentation/changelog.html` | UPDATE | Cut v0.17.0: rename `Unreleased` → `0.17.0 — 2026-06-19`; add a release-summary `<p>`; add the mandatory plugin.json bump `<li>` under Changed; start a fresh empty `Unreleased` block above it. |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Bump `version` 0.16.0 → 0.17.0 (§7.5 binding contract; this release ships plugin assets: relay-approve.md + docs-updater.md + docs-reviewer.md). |
| `documentation/assets/data/search-index.json` | UPDATE | Update the Commands excerpt (line 90: "Thirteen commands plus one Pillar 3 placeholder" → "Fourteen commands ... no placeholder") and extend the Agents excerpt for consistency so no count/agent excerpt is stale. |

## NOT Building (Scope Limits)

- **Not modifying any `plugins/relay/agents/*.md` or `plugins/relay/commands/*.md` body.**
  The agent and command files (`docs-updater.md`, `docs-reviewer.md`,
  `relay-approve.md`) were shipped in Phases 1–3 and are out of scope here; this
  phase only documents and version-cuts them.
- **Not editing `docs/context/settings-allowlist.md`.** The four allowlist
  patterns were added in Phase 3 (PRD AC-12); this phase does not touch them.
- **Not regenerating any PRESERVE-ENTIRELY file.** `docs/decisions.md` and
  `docs/anti-patterns.md` are append-only; this phase appends one decisions.md
  entry and touches nothing else in those files.
- **Not adding new pages, NAV entries, top-level folders, CSS files, or JS files**
  to `documentation/`. Every change modifies existing registered pages; the
  three-file registration rule's NAV/search-index obligations apply to new pages,
  which none are added. (Per `documentation/AGENTS.md` §2 + §9.)
- **Not adding browser/database/manual validation.** Levels 4–6 do not apply to a
  docs/release-cut phase; the deliverable is verified by filesystem + grep checks.
- **Not bumping any version beyond 0.17.0** or cutting more than one release block.

## Step-by-Step Tasks

### Task 1: UPDATE docs/decisions.md (append governance entry)

- **ACTION**: Append a new `## [2026-06-19] /relay-approve design + interactivity-boundary extension`
  entry immediately BEFORE the closing `<!-- Template for future entries:` comment
  (decisions.md:628). Use the canonical four-field shape (Context / Decision /
  Reason / Areas affected). Record: the deterministic merge+cleanup command; the
  Docs Updater (writer) / Docs Reviewer (reviewer) pair; the cleanup ordering
  (worktree remove → `git branch -d` → remote delete → `git worktree prune`,
  avoiding the cli/cli #13380 trap); the `gh pr merge --merge` merge-commit default;
  docs-commit-on-base (OQ-a); docs/-only scope (OQ-b, not the `documentation/` site);
  and the interactivity-boundary extension (the docs pair MAY dialogue post-merge —
  a conscious, recorded extension of the 2026-04-19 "downstream autonomous" rule).
  Append-only; do not regenerate the file.
- **MIRROR**: `# SOURCE: docs/decisions.md:628-637` (template) + the 2026-05-18
  Pillar 3 entry at decisions.md:591-606.
- **Satisfies**: AC-A1, AC-A6 (PRD AC-12 governance traceability), AC-A9.
- **VALIDATE**:
  ```bash
  # bash
  grep -q "2026-06-19" docs/decisions.md && grep -qi "interactivity.boundary" docs/decisions.md && echo OK
  ```
  ```powershell
  # PowerShell
  if ((Select-String -Path docs/decisions.md -Pattern '2026-06-19' -Quiet) -and (Select-String -Path docs/decisions.md -Pattern 'interactivity.boundary' -Quiet)) { 'OK' } else { 'FAIL' }
  ```

### Task 2: UPDATE plugins/relay/.claude-plugin/plugin.json (bump version)

- **ACTION**: Change the `version` field value from `0.16.0` to `0.17.0`. No other
  field changes. This is the §7.5 binding-contract bump that pairs with the v0.17.0
  changelog cut (Task 7); the release ships plugin assets (relay-approve.md +
  docs-updater.md + docs-reviewer.md shipped in Phases 1–3).
- **MIRROR**: `plugins/relay/.claude-plugin/plugin.json:3` (current `"version": "0.16.0"`).
- **Satisfies**: AC-A2 (PRD success signal "plugin.json == changelog version"), AC-A7.
- **VALIDATE**:
  ```bash
  # bash
  grep -q '"version": "0.17.0"' plugins/relay/.claude-plugin/plugin.json && echo OK
  ```
  ```powershell
  # PowerShell
  if (Select-String -Path plugins/relay/.claude-plugin/plugin.json -Pattern '"version": "0.17.0"' -Quiet) { 'OK' } else { 'FAIL' }
  ```

### Task 3: UPDATE documentation/changelog.html (cut v0.17.0 + fresh Unreleased)

- **ACTION**: Rename `<h2 id="unreleased">Unreleased</h2>` (changelog.html:31) to
  `<h2 id="v0-17-0">0.17.0 — 2026-06-19</h2>` (em dash, not hyphen — AGENTS.md §4).
  Insert a release-summary `<p>` immediately below it describing the release (ships
  the Pillar 3 close-out: `/relay-approve` + docs-updater + docs-reviewer flipped
  from planned to shipped; the accumulated Added items from Phases 1–3 and the
  command-count Fixed item; the §7.5 plugin bump). Change the existing
  `id="unreleased-added"` / `id="unreleased-fixed"` h3 ids to `id="v0-17-0-added"` /
  `id="v0-17-0-fixed"`. Add a new `<h3 id="v0-17-0-changed">Changed</h3>` with the
  mandatory plugin.json bump `<li>` (mirroring the 0.16.0 Changed bullet: `0.16.0`
  → `0.17.0`, fresh `relay/0.17.0/` cache directory). Start a fresh empty
  `<h2 id="unreleased">Unreleased</h2>` block ABOVE the new 0.17.0 block (newest
  at the top, per AGENTS.md §7.3). No emojis; no inline styles.
- **MIRROR**: `# SOURCE: documentation/changelog.html:45-57` (the 0.16.0 release block).
- **Satisfies**: AC-A3, AC-A8 (PRD success signal: changelog version cut), R-COH-REGISTRY-MISSING (changelog version cut satisfied by this phase).
- **VALIDATE**:
  ```bash
  # bash
  grep -q 'id="v0-17-0"' documentation/changelog.html && grep -c 'id="unreleased"' documentation/changelog.html | grep -qx 1 && echo OK
  ```
  ```powershell
  # PowerShell
  $cut = Select-String -Path documentation/changelog.html -Pattern 'id="v0-17-0"' -Quiet
  $unrel = (Select-String -Path documentation/changelog.html -Pattern 'id="unreleased"').Count
  if ($cut -and $unrel -eq 1) { 'OK' } else { 'FAIL' }
  ```

### Task 4: UPDATE documentation/reference/commands.html (flip /relay-approve + subtitle)

- **ACTION**: Flip the `/relay-approve` `<h3>` (commands.html:257) to add
  `<span class="badge badge--done">implemented</span>`; replace the `Status:
  Placeholder` kv row (263-264) with `Mode` (deterministic infra command, no LLM,
  delegates all docs interpretation to the dispatched docs-updater/docs-reviewer
  pair, points at `plugins/relay/commands/relay-approve.md`) and `Preconditions`
  (the 8 named HALT codes + `--strategy`/`--admin`/`--force`/`--no-docs` flags) rows,
  mirroring the relay-pr kv-block. Update the page subtitle (line 24) "Thirteen
  commands plus one Pillar 3 placeholder" → "Fourteen commands" (no placeholder
  remaining). Use only `badge--done` (the valid vocabulary); relative asset paths;
  no inline styles.
- **MIRROR**: `# SOURCE: documentation/reference/commands.html:245-255` (relay-pr badge--done kv-block).
- **Satisfies**: AC-A4, AC-A5 (count consistency), R-COH-REGISTRY-MISSING (commands.html flip satisfied by this phase).
- **VALIDATE**:
  ```bash
  # bash
  awk '/id="relay-approve"/{f=1} f&&/badge--done/{print "OK"; exit}' documentation/reference/commands.html | grep -qx OK && ! grep -qi "placeholder" documentation/reference/commands.html && echo OK
  ```
  ```powershell
  # PowerShell
  $html = Get-Content documentation/reference/commands.html -Raw
  $hasBadge = $html -match '(?s)id="relay-approve".*?badge--done'
  $noPlaceholder = -not (Select-String -Path documentation/reference/commands.html -Pattern 'placeholder' -Quiet)
  if ($hasBadge -and $noPlaceholder) { 'OK' } else { 'FAIL' }
  ```

### Task 5: UPDATE documentation/reference/agents.html (add two implemented sections; remove Planned rows)

- **ACTION**: Add two full implemented sections for `docs-updater` and `docs-reviewer`
  (each a `<h3 id="...">name <span class="badge badge--done">shipped</span></h3>`
  plus a `.kv` block with Path / Model / Invoked by / Responsibility / Never does),
  placed near the other implemented agent sections, mirroring post-green-reviewer.
  Remove the `docs-updater` and `docs-reviewer` rows (agents.html:442-443) from the
  Planned table, leaving `report-pr-creator` as the only remaining Planned row. Use
  `badge--done`; no emojis; no inline styles.
- **MIRROR**: `# SOURCE: documentation/reference/agents.html:77-85` (post-green-reviewer section) + the Planned table at 436-445.
- **Satisfies**: AC-A5, R-COH-REGISTRY-MISSING (agents.html sections satisfied by this phase).
- **VALIDATE**:
  ```bash
  # bash
  grep -q 'id="docs-updater"' documentation/reference/agents.html && grep -q 'id="docs-reviewer"' documentation/reference/agents.html && echo OK
  ```
  ```powershell
  # PowerShell
  if ((Select-String -Path documentation/reference/agents.html -Pattern 'id="docs-updater"' -Quiet) -and (Select-String -Path documentation/reference/agents.html -Pattern 'id="docs-reviewer"' -Quiet)) { 'OK' } else { 'FAIL' }
  ```

### Task 6: UPDATE documentation/roadmap/status.html (Phase 4 done + shipped lists)

- **ACTION**: Update the Phase 4 Approval row cell (status.html:64) so all three
  Pillar 3 commands + both agents read as shipped (v0.17.0), and flip the badge
  `badge--partial` → `badge--done` (status.html:65). Update the "Of the 14-command
  surface, 13 are shipped; the one remaining Pillar 3 command — /relay-approve" line
  (154) to "all 14 shipped". Move `/relay-approve` from the Pending list (202) to a
  shipped list and note Docs Updater + Docs Reviewer shipped. Append
  `agents/docs-updater.md` + `agents/docs-reviewer.md` to the agents bullet (150)
  and `commands/relay-pr.md` + `commands/relay-approve.md` to the commands bullet
  (151). Use only valid badge vocabulary.
- **MIRROR**: `# SOURCE: documentation/roadmap/status.html:61-66` (Phase 4 row).
- **Satisfies**: AC-A5 (count consistency), AC-A4.
- **VALIDATE**:
  ```bash
  # bash
  awk '/<td><strong>Approval<\/strong>/{f=1} f&&/badge--done/{print "OK"; exit}' documentation/roadmap/status.html | grep -qx OK && echo OK
  ```
  ```powershell
  # PowerShell
  $html = Get-Content documentation/roadmap/status.html -Raw
  if ($html -match '(?s)<strong>Approval</strong>.*?badge--done') { 'OK' } else { 'FAIL' }
  ```

### Task 7: UPDATE docs/api-reference.md (flip placeholder; move agents; update count)

- **ACTION**: Flip the `/relay-approve <pr>` row (api-reference.md:75) from
  "*(placeholder)*" to an implemented row with a behavioral description (merge +
  collision-safe cleanup + Docs Updater/Reviewer dispatch + docs commit on base).
  Move `Docs Updater` + `Docs Reviewer` out of the "Planned" paragraph (124) into
  the "Implemented" agents table (109-120) with Path / Invoked by / Role columns.
  Update the command-count line (17-19): "13 commands ... 11 Pillar 1–2 ... plus 1
  placeholder (/relay-approve)" → "14 commands ... 11 Pillar 1–2 plus /relay-commit,
  /relay-pr, /relay-approve as the three Pillar 3 commands" (0 placeholders).
- **MIRROR**: the existing Implemented agents table rows at api-reference.md:113-120
  (e.g. the `post-green-reviewer` row) for the two new agent rows.
- **Satisfies**: AC-A5 (count consistency across all surfaces), AC-A4.
- **VALIDATE**:
  ```bash
  # bash
  grep -q "14 commands" docs/api-reference.md && ! grep -q "placeholder (/relay-approve)" docs/api-reference.md && echo OK
  ```
  ```powershell
  # PowerShell
  if ((Select-String -Path docs/api-reference.md -Pattern '14 commands' -Quiet) -and -not (Select-String -Path docs/api-reference.md -Pattern 'placeholder \(/relay-approve\)' -Quiet)) { 'OK' } else { 'FAIL' }
  ```

### Task 8: UPDATE docs/context/architecture.md (count + Pillar 3 description)

- **ACTION**: Update the command-surface count line (architecture.md:117) "Relay
  exposes **13 commands** plus 1 placeholder" → "Relay exposes **14 commands**" (no
  placeholder). Update the Commands asset-type row (25) if it carries a count.
  Update the Pillar 3 description (53-57) and the phased-rollout Phase 4 row (166)
  so `/relay-approve` + Docs Updater/Reviewer read as shipped, not pending/placeholder
  (flip the Phase 4 row from "**partial**" to shipped/done wording consistent with
  the other surfaces).
- **MIRROR**: the existing count-line shape at architecture.md:117 and the phased-rollout
  table rows at 162-167.
- **Satisfies**: AC-A5 (count consistency), AC-A4.
- **VALIDATE**:
  ```bash
  # bash
  grep -q "14 commands" docs/context/architecture.md && ! grep -q "13 commands plus 1 placeholder" docs/context/architecture.md && echo OK
  ```
  ```powershell
  # PowerShell
  if ((Select-String -Path docs/context/architecture.md -Pattern '14 commands' -Quiet) -and -not (Select-String -Path docs/context/architecture.md -Pattern '13 commands plus 1 placeholder' -Quiet)) { 'OK' } else { 'FAIL' }
  ```

### Task 9: UPDATE documentation/assets/data/search-index.json (count/agent excerpts)

- **ACTION**: Update the Commands page excerpt (search-index.json:90) "Thirteen
  commands plus one Pillar 3 placeholder" → "Fourteen commands ... no placeholder"
  (keep the existing PRD-less-mode + role keywords). Extend the Agents page excerpt
  (96) so it is not stale — mention that docs-updater and docs-reviewer are now
  implemented Pillar 3 agents. Preserve valid JSON (no trailing comma; `category`
  values unchanged so they keep matching the NAV section headings per AGENTS.md §6.2).
- **MIRROR**: the existing excerpt objects at search-index.json:86-97 (Commands + Agents).
- **Satisfies**: AC-A5 (count consistency — search-index is the fifth count surface).
- **VALIDATE**:
  ```bash
  # bash
  node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8')); console.log('OK')" && ! grep -qi "thirteen commands plus one" documentation/assets/data/search-index.json && echo OK
  ```
  ```powershell
  # PowerShell
  try { Get-Content documentation/assets/data/search-index.json -Raw | ConvertFrom-Json | Out-Null; $valid = $true } catch { $valid = $false }
  $noStale = -not (Select-String -Path documentation/assets/data/search-index.json -Pattern 'Thirteen commands plus one' -Quiet)
  if ($valid -and $noStale) { 'OK' } else { 'FAIL' }
  ```

## Validation Commands

This repository is markdown + JSON + HTML with `tdd: false` and
`test_frameworks: []` in `docs/context/methodology.md` — there is NO test
framework. All validation is filesystem/grep-oriented (PowerShell `Select-String`
AND bash `grep` equivalents, inline below). NOT a test-framework invocation.

### Level 1 STATIC_ANALYSIS (well-formedness)

JSON parse of the two JSON artifacts (plugin manifest + search index):

```bash
# bash
node -e "JSON.parse(require('fs').readFileSync('plugins/relay/.claude-plugin/plugin.json','utf8'))" && echo "plugin.json OK"
node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8'))" && echo "search-index OK"
```
```powershell
# PowerShell
try { Get-Content plugins/relay/.claude-plugin/plugin.json -Raw | ConvertFrom-Json | Out-Null; 'plugin.json OK' } catch { 'plugin.json FAIL' }
try { Get-Content documentation/assets/data/search-index.json -Raw | ConvertFrom-Json | Out-Null; 'search-index OK' } catch { 'search-index FAIL' }
```

No-emoji guard on every touched `documentation/` file (AGENTS.md §2.5) — the grep
matches the common emoji ranges; an empty result is a pass:

```bash
# bash
! grep -rlP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" documentation/reference/commands.html documentation/reference/agents.html documentation/roadmap/status.html documentation/changelog.html && echo "no-emoji OK"
```
```powershell
# PowerShell
$files = 'documentation/reference/commands.html','documentation/reference/agents.html','documentation/roadmap/status.html','documentation/changelog.html'
$hit = $files | Where-Object { (Get-Content $_ -Raw) -match '[ἰ0-ᾯF☀-➿]' }
if (-not $hit) { 'no-emoji OK' } else { "emoji in $hit" }
```

### Level 2 CONTENT_INVARIANTS (per-deliverable grep checks)

Version lock-step (plugin.json == changelog cut version):

```bash
# bash
grep -q '"version": "0.17.0"' plugins/relay/.claude-plugin/plugin.json \
  && grep -q 'id="v0-17-0"' documentation/changelog.html \
  && [ "$(grep -c 'id="unreleased"' documentation/changelog.html)" = "1" ] \
  && echo "version lock-step + fresh Unreleased OK"
```
```powershell
# PowerShell
$pv = Select-String -Path plugins/relay/.claude-plugin/plugin.json -Pattern '"version": "0.17.0"' -Quiet
$cut = Select-String -Path documentation/changelog.html -Pattern 'id="v0-17-0"' -Quiet
$unrel = (Select-String -Path documentation/changelog.html -Pattern 'id="unreleased"').Count
if ($pv -and $cut -and $unrel -eq 1) { 'version lock-step + fresh Unreleased OK' } else { 'FAIL' }
```

Implemented-flip invariants (commands.html /relay-approve badge--done; agents.html
docs-updater + docs-reviewer sections):

```bash
# bash
grep -q 'id="docs-updater"' documentation/reference/agents.html \
  && grep -q 'id="docs-reviewer"' documentation/reference/agents.html \
  && grep -Pzoq '(?s)id="relay-approve".*?badge--done' documentation/reference/commands.html \
  && echo "implemented-flip OK"
```
```powershell
# PowerShell
$du = Select-String -Path documentation/reference/agents.html -Pattern 'id="docs-updater"' -Quiet
$dr = Select-String -Path documentation/reference/agents.html -Pattern 'id="docs-reviewer"' -Quiet
$ra = (Get-Content documentation/reference/commands.html -Raw) -match '(?s)id="relay-approve".*?badge--done'
if ($du -and $dr -and $ra) { 'implemented-flip OK' } else { 'FAIL' }
```

Count consistency across all five surfaces (14 commands / no placeholder):

```bash
# bash
grep -q "14 commands" docs/api-reference.md \
  && grep -q "14 commands" docs/context/architecture.md \
  && ! grep -qi "placeholder" documentation/reference/commands.html \
  && ! grep -qi "thirteen commands plus one" documentation/assets/data/search-index.json \
  && grep -q "all 14 shipped" documentation/roadmap/status.html \
  && echo "count-consistency OK"
```
```powershell
# PowerShell
$a = Select-String -Path docs/api-reference.md -Pattern '14 commands' -Quiet
$b = Select-String -Path docs/context/architecture.md -Pattern '14 commands' -Quiet
$c = -not (Select-String -Path documentation/reference/commands.html -Pattern 'placeholder' -Quiet)
$d = -not (Select-String -Path documentation/assets/data/search-index.json -Pattern 'Thirteen commands plus one' -Quiet)
$e = Select-String -Path documentation/roadmap/status.html -Pattern 'all 14 shipped' -Quiet
if ($a -and $b -and $c -and $d -and $e) { 'count-consistency OK' } else { 'FAIL' }
```

Governance entry present (decisions.md append):

```bash
# bash
grep -q "2026-06-19" docs/decisions.md && grep -qi "interactivity.boundary" docs/decisions.md && echo "decisions entry OK"
```
```powershell
# PowerShell
if ((Select-String -Path docs/decisions.md -Pattern '2026-06-19' -Quiet) -and (Select-String -Path docs/decisions.md -Pattern 'interactivity.boundary' -Quiet)) { 'decisions entry OK' } else { 'FAIL' }
```

### Level 3 DRY-RUN END-TO-END (mutual-consistency sweep)

A single consolidated sweep confirming every surface agrees that all 14 commands
are shipped with zero placeholders and the release is internally consistent
(version cut, fresh Unreleased, both agents documented, governance entry present).
Re-run the Level 2 blocks together; all must emit their `OK` line and none may emit
`FAIL`. Optionally open the four touched HTML pages from `file://` in a browser to
confirm the sidebar highlight, TOC, prev/next, and search still work (AGENTS.md §8
step 8) — manual, non-blocking.

```bash
# bash — one-shot consistency assertion
test -z "$(grep -rli 'placeholder' documentation/reference/commands.html)" \
  && grep -q '"version": "0.17.0"' plugins/relay/.claude-plugin/plugin.json \
  && grep -q 'id="v0-17-0"' documentation/changelog.html \
  && echo "Phase 4 release-cut consistency: PASS"
```
```powershell
# PowerShell — one-shot consistency assertion
$noPh = -not (Select-String -Path documentation/reference/commands.html -Pattern 'placeholder' -Quiet)
$pv = Select-String -Path plugins/relay/.claude-plugin/plugin.json -Pattern '"version": "0.17.0"' -Quiet
$cut = Select-String -Path documentation/changelog.html -Pattern 'id="v0-17-0"' -Quiet
if ($noPh -and $pv -and $cut) { 'Phase 4 release-cut consistency: PASS' } else { 'Phase 4 release-cut consistency: FAIL' }
```

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** `docs/decisions.md` carries a new dated [2026-06-19] entry
  recording the `/relay-approve` design (deterministic merge+cleanup; Docs
  Updater/Reviewer pair; cli/cli #13380 cleanup ordering; merge-commit default;
  docs-commit-on-base OQ-a; docs/-only scope OQ-b; interactivity-boundary extension),
  appended before the template comment, with no other content in `decisions.md` or
  `anti-patterns.md` regenerated.
- **AC-A2 (PRD AC-12):** `plugins/relay/.claude-plugin/plugin.json` `version` is
  `0.17.0`, equal to the changelog cut version (PRD success signal: plugin.json ==
  changelog version).
- **AC-A3 (PRD AC-12):** `documentation/changelog.html` contains a
  `0.17.0 — 2026-06-19` block (renamed from the accumulated `Unreleased` block)
  with a release-summary paragraph and the mandatory plugin.json bump line under
  Changed, AND exactly one fresh empty `Unreleased` block above it.
- **AC-A4 (PRD AC-12):** `documentation/reference/commands.html` renders the
  `/relay-approve` entry as a `badge--done` "implemented" kv-block (Mode +
  Preconditions, mirroring relay-pr), and its subtitle reads "Fourteen commands"
  with no "placeholder" string remaining on the page.
- **AC-A5 (PRD AC-12):** All five count surfaces agree on "14 commands, no
  placeholder": `docs/api-reference.md`, `docs/context/architecture.md`,
  `documentation/reference/commands.html`, `documentation/roadmap/status.html`,
  and `documentation/assets/data/search-index.json` are mutually consistent (the
  Success signal "counts internally consistent").
- **AC-A6 (PRD AC-12):** `documentation/reference/agents.html` contains full
  implemented sections for `docs-updater` and `docs-reviewer` (mirroring an existing
  implemented agent section), and neither appears in the Planned table anymore.
- **AC-A7 (PRD AC-12):** `documentation/roadmap/status.html` Phase 4 (Approval)
  badge is `badge--done`, the 14-command line reads "all 14 shipped", `/relay-approve`
  is listed as shipped, and Docs Updater + Docs Reviewer are noted as shipped.
- **AC-A8 (PRD AC-12):** Both JSON artifacts (`plugin.json`, `search-index.json`)
  parse as valid JSON, and no touched `documentation/` file contains an emoji
  (AGENTS.md §2.5).
- **AC-A9 (PRD AC-12):** No artifact path written or referenced by this phase is
  under `.claude/`; the `documentation/AGENTS.md` three-file registration rule and
  §7.5 lock-step are honored (the plugin.json bump pairs with the changelog cut in
  the same change).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Count surfaces drift — one of the five surfaces left at "13 + placeholder" | M | H | Level 2 count-consistency sweep asserts all five surfaces in one block; the 2026-06-18 count-consistency Fixed item (already in the Unreleased block) is the prior precedent for keeping them aligned. |
| Missing plugin.json bump (§7.5 violation) leaves shipped assets invisible to installed users | M | H | Task 2 + Task 3 are paired; Level 2 version-lock-step check asserts plugin.json == 0.17.0 AND changelog has the v0-17-0 cut in one assertion. |
| `documentation/` edit violates a binding AGENTS.md invariant (emoji, inline style, invented badge variant, new CSS/JS file) | M | M | AGENTS.md is Mandatory Reading priority 1; only `badge--done`/`badge--partial` used; no-emoji Level 1 guard; no new files added; mirror existing kv-block/section shapes. |
| Changelog cut produces two `Unreleased` blocks or zero | L | M | Level 2 check asserts exactly one `id="unreleased"` remains after the cut. |
| Editing a PRESERVE-ENTIRELY file (decisions.md) non-additively | L | H | Task 1 is append-only, inserted before the template comment; no regeneration; the rest of decisions.md untouched. |
| search-index.json malformed (trailing comma / broken JSON) breaks client-side search | L | M | Level 1 JSON parse of search-index.json (Node + PowerShell ConvertFrom-Json). |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in
`docs/context/methodology.md`: **false**. TDD track inactive — tests written
alongside implementation. Acceptance Criteria seed those tests.

- This is a **docs/governance/release-cut** phase (`phase_type: docs`). The relay
  repo is markdown + JSON + HTML with `test_frameworks: []`, so the TDD pair
  self-skips and there is no test-framework invocation; all validation is
  filesystem/grep-oriented per the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` docs/scaffold
  exemption (decisions.md 2026-05-14).
- **R-COH-REGISTRY-MISSING is satisfied BY this phase**, not violated: the changelog
  version cut (Task 3), the agents.html docs-updater/docs-reviewer sections (Task 5),
  and the commands.html `/relay-approve` badge--done flip (Task 4) are the registry-
  closing actions themselves. A reviewer should read these as the registry being
  populated by this very phase.
- **Binding contract:** every `documentation/` edit follows `documentation/AGENTS.md`
  — the three-file registration rule (no new pages here, so the NAV + search-index
  obligations reduce to keeping the existing registered pages' excerpts accurate),
  the §7.5 plugin-version lock-step (Task 2 pairs with Task 3 in the same change),
  no emojis, relative paths, the canonical page template, no inline styles, and the
  `badge--done` / `badge--partial` vocabulary only.
- **Dogfood note:** this release cut is itself an instance of the work the future
  Docs Updater / Docs Reviewer pair will automate post-merge for other features;
  the `documentation/` HTML site is explicitly OUT of the Docs Updater's scope (OQ-b)
  and is maintained per-feature by this kind of release-cut phase, as the PRD's
  "What We're NOT Building" records.

*Generated: 2026-06-19*
*Approved: 2026-06-19*
*Status: IMPLEMENTED*
