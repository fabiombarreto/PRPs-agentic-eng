# Feature: Plugin bump + docs (Phase 2 of relay-commit-command)

```
**Decision Gate**
- Active context: docs/context/architecture.md (plugin manifest versioning; documentation site invariants; Pillar 3 /relay-commit shipping)
- Activated criteria: new plugin asset shipped in Phase 1 (plugins/relay/commands/relay-commit.md); documentation/changelog.html must gain a versioned 0.11.3 release entry; plugin.json version bump required per 2026-04-30 §7.5 binding contract; documentation/reference/commands.html /relay-commit section must change from planned to implemented; documentation/AGENTS.md three-file registration rule applies only to NEW pages (no new pages in this phase)
- Decisions found:
  - 2026-04-30 Plugin manifest version bump on every minor/major release shipping a plugin asset — relay-commit.md is a new plugin asset under plugins/relay/commands/; 0.11.3 is a patch bump that ships a plugin asset → bump required; docs/decisions.md:380-386
  - 2026-05-18 Pillar 3 command surface: /relay-commit + /relay-pr + /relay-approve — /relay-commit is the first shipped Pillar 3 command; Phase 4 (Approval) status transitions from "not started" to "partial"
  - 2026-04-19 PRP artifact paths under PRPs/ — all relay pipeline artifacts stay under PRPs/; no .claude/ writes in this phase
  - documentation/AGENTS.md §2 core invariants — no new CSS/JS files; no new HTML pages in this phase (only updating existing pages); changelog entry required per §7
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66) — all writes land in docs/, plugins/, documentation/; no .claude/ writes
  - Adding new CSS files or JS files (documentation/AGENTS.md §2) — extend app.css only; this phase makes no CSS changes
  - Inline style= attributes or new <style> blocks (documentation/AGENTS.md §2) — badge classes only; all from existing app.css vocabulary
- Applicable architectural rules:
  - AGENTS.md §7 changelog rule: every change to documentation/ must add a changelog entry; cutting v0.11.3 satisfies this for all Phase 2 changes
  - Three-file registration rule (NAV + search-index + changelog): applies only to NEW pages; no new pages in Phase 2; existing pages are being edited
  - documentation/ changes require reading documentation/AGENTS.md first (CLAUDE.md); AGENTS.md §2 invariants (no new CSS/JS, relative paths only) must hold
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-commit-command.prd.md` — Implementation Phases row 2: "Plugin bump + docs" — Goal: Ship the command as part of the next versioned relay release; update all documentation surfaces to reflect the shipped `/relay-commit` — Success signal: `documentation/changelog.html` has a new versioned entry referencing `/relay-commit`; `plugin.json` version matches the changelog entry; Pillar 3 section of `documentation/reference/commands.html` shows `/relay-commit` as shipped (not planned).

## Summary

Phase 2 cuts the `0.11.3` release by renaming the existing `Unreleased` block in `documentation/changelog.html` to a versioned entry and adding Phase 2-specific shipping entries. It bumps `plugins/relay/.claude-plugin/plugin.json` from `0.11.2` to `0.11.3` to match. It updates three documentation surfaces to reflect `/relay-commit` as implemented (not planned): `docs/api-reference.md` changes the row from `*(planned)*` to `✅ **implemented**`; `documentation/reference/commands.html` adds the `badge--done` badge and removes the "Planned — not yet implemented" Status dt; `documentation/roadmap/status.html` changes Phase 4 from `badge--pending` to `badge--partial`. No new pages, no new CSS/JS files — all changes are targeted edits to six existing files.

## User Story

```
As a relay operator who sees /relay-commit listed as "planned" in the docs
I want the documentation to show /relay-commit as implemented with v0.11.3
So that I can trust the documentation reflects the shipped command surface
```

## Problem Statement

After Phase 1 shipped `plugins/relay/commands/relay-commit.md`, the documentation still shows `/relay-commit` as "planned" in `documentation/reference/commands.html`, `docs/api-reference.md` still marks it `*(planned)*`, `plugin.json` still reads `0.11.2`, and the changelog has no versioned entry for this release. Phase 2 closes this gap.

## Solution Statement

Six targeted edits: (1) `plugin.json` → `0.11.3`; (2) `docs/api-reference.md` → `/relay-commit` row `✅ **implemented**`; (3) `docs/context/architecture.md` → Phase 4 row `partial` + note; (4) `documentation/reference/commands.html` → `/relay-commit` h3 gains `badge--done`, `Status` dt removed; (5) `documentation/changelog.html` → `Unreleased` renamed to `0.11.3 — 2026-05-18`, Phase 2 entries added, new empty `Unreleased` block inserted above; (6) `documentation/roadmap/status.html` → Phase 4 `badge--pending` → `badge--partial`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation + manifest update (no command files, no agent files, no structural changes) |
| Complexity | Low — six targeted text edits; all target files already exist; no new pages; no CSS changes; clear before/after state for each edit |
| Systems Affected | `plugins/relay/.claude-plugin/plugin.json`; `docs/api-reference.md`; `docs/context/architecture.md`; `documentation/reference/commands.html`; `documentation/changelog.html`; `documentation/roadmap/status.html` |
| Dependencies | Phase 1 complete (plugins/relay/commands/relay-commit.md exists); documentation/AGENTS.md §2 invariants; docs/decisions.md 2026-04-30 version-bump contract |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-commit-command.prd.md` lines 250 (Implementation Phases table row 2) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| MUST | `PRPs/prds/relay-commit-command.prd.md` | 261-268 | Phase 2 Phase Details — Goal, Scope, Success signal |
| MUST | `documentation/AGENTS.md` | 1-100 | Binding documentation site contract — §2 core invariants, §6 three-file rule, §7 changelog rules; must be read before editing any documentation/ file |
| MUST | `documentation/changelog.html` | 1-80 | Existing Unreleased block and v0.11.2 entry — understand exact shape of the versioned release entry to rename Unreleased → 0.11.3 and add Phase 2 entries |
| MUST | `documentation/reference/commands.html` | 229-265 | Current /relay-commit Pillar 3 section — understand the exact h3 and dt/dd blocks to edit |
| MUST | `docs/decisions.md` | 380-392 | 2026-04-30 plugin manifest version-bump binding contract — confirms 0.11.3 bump is required for a patch release shipping a plugin asset |
| SHOULD | `docs/api-reference.md` | 67-74 | Current /relay-commit Pillar 3 table row — exact *(planned)* text to replace with ✅ **implemented** |
| SHOULD | `docs/context/architecture.md` | 157-165 | Current Phase 4 row in the phased rollout table — exact "not started" text to replace with partial status |
| SHOULD | `documentation/roadmap/status.html` | 60-70 | Current Phase 4 badge (badge--pending) — exact span to replace with badge--partial |

## Patterns to Mirror

### Pattern 1 — Versioned changelog release entry shape

# SOURCE: `documentation/changelog.html:48-70`

```html
<h2 id="v0-12-0">0.11.2 — 2026-05-14</h2>

<p>Three coordinated improvements to the plan-review pipeline...</p>

<h3 id="v0-12-0-added">Added</h3>
<ul>
  <li><strong><code>phase_type</code> field in plan <code>## Metadata</code> table</strong> &mdash; ...</li>
</ul>

<h3 id="v0-12-0-changed">Changed</h3>
<ul>
  <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.11.1</code> &rarr; <code>0.11.2</code> per the 2026-04-30 &sect;7.5 binding contract. ...</li>
</ul>
```

**Used by:** Task 4 (rename Unreleased → 0.11.3; add Phase 2 entries). The id pattern for 0.11.3 is `v0-11-3`; inner heading ids are `v0-11-3-added` and `v0-11-3-changed`. Summary paragraph describes what shipped. Each `<li>` uses `<strong><code>filename</code></strong> &mdash; description` format. HTML entities: `&mdash;` for em-dash, `&rarr;` for arrow, `&sect;` for §.

---

### Pattern 2 — badge--done span on h3 heading

# SOURCE: `documentation/reference/commands.html:44`

```html
<h3 id="relay-prd"><code>/relay-prd</code> — interactive PRD authoring <span class="badge badge--done">implemented</span></h3>
```

**Used by:** Task 3 (add badge--done to the /relay-commit h3). The badge span comes after the command title text, separated by a space. No text between badge and closing `</h3>`.

---

### Pattern 3 — api-reference.md ✅ **implemented** table row format

# SOURCE: `docs/api-reference.md:39`

```markdown
| `/relay-prd <description \| draft-path>` ✅ **implemented** | description, draft PRD markdown path, or no argument... | `PRPs/prds/<feature>.prd.md` with status `APPROVED`... |
```

**Used by:** Task 2 (replace `/relay-commit <feature-name>` *(planned)* with `✅ **implemented**`). The `✅ **implemented**` marker replaces `*(planned)*` in the command name cell of the table row.

---

### Pattern 4 — plugin.json version field format

# SOURCE: `plugins/relay/.claude-plugin/plugin.json:3`

```json
  "version": "0.11.2",
```

**Used by:** Task 1 (bump version 0.11.2 → 0.11.3). Exact JSON string replacement; no structural changes.

---

### Pattern 5 — badge--partial span (from status.html legend)

# SOURCE: `documentation/roadmap/status.html:29`

```html
<li><span class="badge badge--partial">partial</span> — artifact delivered; some aspect (usually a runtime signal) still pending validation</li>
```

**Used by:** Task 5 (replace badge--pending with badge--partial in Phase 4 row). The badge class is `badge--partial`; content is `partial`. Same CSS class system as badge--done and badge--pending.

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Version bump 0.11.2 → 0.11.3; required by 2026-04-30 §7.5 binding contract for patch releases shipping a plugin asset |
| `docs/api-reference.md` | UPDATE | /relay-commit row changes from `*(planned)*` to `✅ **implemented**`; description updated to reflect implemented state |
| `docs/context/architecture.md` | UPDATE | Phase 4 "not started" → "partial — /relay-commit shipped v0.11.3"; Commands row updated to reflect implemented status |
| `documentation/reference/commands.html` | UPDATE | /relay-commit h3 gains `badge--done` badge; `Status: Planned` dt/dd removed; Mode and Preconditions added per relay-worktree shape |
| `documentation/changelog.html` | UPDATE | Unreleased block renamed 0.11.3 — 2026-05-18; Phase 2 entries added (plugin.json bump, api-reference, architecture, commands.html, roadmap, relay-commit.md); new empty Unreleased block inserted above |
| `documentation/roadmap/status.html` | UPDATE | Phase 4 badge--pending → badge--partial; Scope cell updated to show /relay-commit as shipped |

## NOT Building (Scope Limits)

- **New documentation pages** — no new HTML files; only editing existing pages
- **New CSS classes or CSS files** — badge--partial already exists in app.css; no new styling
- **/relay-pr or /relay-approve documentation** — those are still planned; Phase 2 only ships /relay-commit docs
- **Docs Updater / Docs Reviewer agents** — Phase 4 agent work; out of scope
- **NAV or search-index updates** — no new pages → no three-file registration required; sidebar and search are unchanged
- **docs/decisions.md entries** — the relevant decisions were already added (2026-05-18 Pillar 3 entries exist in changelog Unreleased block)
- **relay-execute.md updates** — success message was already updated to point to /relay-commit in a prior session

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/.claude-plugin/plugin.json` — version bump 0.11.2 → 0.11.3

**ACTION**: Edit `plugins/relay/.claude-plugin/plugin.json`. Replace `"version": "0.11.2"` with `"version": "0.11.3"`. No other changes to the JSON structure. (Satisfies AC-A1 — the plugin.json version bump is the primary shipping signal establishing that the command implementing PRD AC-1 through AC-5 is released as v0.11.3.)

**MIRROR**: Pattern 4 (`plugins/relay/.claude-plugin/plugin.json:3` — exact version field format)

**VALIDATE**: `python3 -c "import json; d=json.load(open('plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.11.3', f'Expected 0.11.3, got {d[\"version\"]}'; print('PLUGIN_VERSION: PASS')"`

---

### Task 2: UPDATE `docs/api-reference.md` — /relay-commit row from planned to implemented

**ACTION**: In `docs/api-reference.md`, locate the Pillar 3 table row for `/relay-commit`:

```markdown
| `/relay-commit <feature-name>` *(planned)* | worktree ... | git commit (local only; no push). Idempotent: clean worktree exits 0. Commit message generated from orchestrator audit log + source PRD title. |
```

Replace `*(planned)*` with `✅ **implemented**`. Update the Output cell description to add: "Phase 0 validates worktree existence (FAILED_MISSING_WORKTREE) and branch (FAILED_WRONG_BRANCH). Phase 1 idempotency via `git status --porcelain`. Phase 2 commit message from `PRPs/reports/<feature>/orchestrator-run.json` + PRD title; fallback `feat(<feature>): implement via relay`. See `plugins/relay/commands/relay-commit.md`."

Also update the header count line from "13 commands organized by role, plus 1 placeholder for Pillar 3" to "14 commands organized by role (13 implemented + 1 placeholder). All core pipeline commands plus `/relay-commit` (Pillar 3 first command) are now implemented." (Satisfies AC-A2 — this documentation update confirms in the API reference that the command implementing PRD AC-1 through AC-5 is officially shipped.)

**MIRROR**: Pattern 3 (`docs/api-reference.md:39` — ✅ **implemented** format in the Pillar 3 table)

**VALIDATE**: `grep -q "relay-commit.*implemented" docs/api-reference.md && echo "API_REF_COMMIT_STATUS: PASS" || echo "API_REF_COMMIT_STATUS: FAIL"`

---

### Task 3: UPDATE `docs/context/architecture.md` — Phase 4 status + Commands row

**ACTION**: In `docs/context/architecture.md`, locate the phased rollout table row for Phase 4:

```markdown
| 4 | Approval cycle — `/relay-commit` (local commit, no push) + `/relay-pr` (push + PR creation) + `/relay-approve` (merge + cleanup + docs update) | not started |
```

Replace `not started` with `**partial** — \`/relay-commit\` shipped v0.11.3; \`/relay-pr\` + \`/relay-approve\` pending`.

Also locate the asset types table row for Commands:
```markdown
| Commands | `plugins/relay/commands/` | `/relay-*` slash commands users invoke. | planned, not yet implemented |
```

Replace `planned, not yet implemented` with `13 implemented (including /relay-commit v0.11.3); see docs/api-reference.md`. (Satisfies AC-A4 context — the architecture.md Phase 4 and Commands row updates are part of the 0.11.3 release documentation surface catalogued in the changelog entry required by AC-A4.)

**MIRROR**: Pattern 5 (partial status concept from roadmap/status.html legend)

**VALIDATE**: `grep -q "partial" docs/context/architecture.md && echo "ARCH_PHASE4: PASS" || echo "ARCH_PHASE4: FAIL"`

---

### Task 4: UPDATE `documentation/reference/commands.html` — /relay-commit section

**ACTION**: In `documentation/reference/commands.html`:

1. Locate the /relay-commit h3 heading:
   ```html
   <h3 id="relay-commit"><code>/relay-commit &lt;feature-name&gt;</code></h3>
   ```
   Replace with:
   ```html
   <h3 id="relay-commit"><code>/relay-commit &lt;feature-name&gt;</code> <span class="badge badge--done">implemented</span></h3>
   ```

2. Locate and remove the Status dt/dd pair:
   ```html
   <dt>Status</dt>
   <dd>Planned &mdash; not yet implemented.</dd>
   ```
   Replace with a Mode dt/dd and a Preconditions dt/dd:
   ```html
   <dt>Mode</dt>
   <dd>Deterministic infra command (no LLM, no agent). Analogous to <code>/relay-worktree</code> — pure git operations scoped to the worktree via <code>git -C .worktrees/&lt;feature&gt;/</code>. Never passes <code>--no-verify</code>. See <code>plugins/relay/commands/relay-commit.md</code>.</dd>
   <dt>Preconditions</dt>
   <dd>P0: argument non-empty; P1: <code>.worktrees/&lt;feature&gt;/</code> exists (<code>FAILED_MISSING_WORKTREE</code> with instruction to run <code>/relay-worktree</code>); P2: worktree branch is <code>feature/&lt;feature&gt;</code> (<code>FAILED_WRONG_BRANCH</code> showing actual vs expected).</dd>
   ```

Also update the page subtitle to reflect the command is now implemented: change "one Pillar 3 placeholder" to "two Pillar 3 placeholders" (since /relay-commit is now implemented, /relay-pr and /relay-approve remain planned/placeholder). (Satisfies AC-A3 — the badge--done badge and Mode/Preconditions replacement directly fulfill the commands.html requirement stated in AC-A3.)

**MIRROR**: Pattern 2 (`documentation/reference/commands.html:44` — badge--done on h3); `/relay-worktree` Mode/Preconditions shape (commands.html:170-178)

**VALIDATE**: `grep -q "relay-commit.*badge--done" documentation/reference/commands.html && echo "COMMANDS_BADGE: PASS" || echo "COMMANDS_BADGE: FAIL"`

---

### Task 5: UPDATE `documentation/changelog.html` (cut v0.11.3) + `documentation/roadmap/status.html` (Phase 4 partial)

**ACTION in `documentation/changelog.html`:**

1. Locate `<h2 id="unreleased">Unreleased</h2>` and its inner heading `<h3 id="unreleased-changed">Changed</h3>`. Rename to v0.11.3:
   - `<h2 id="unreleased">Unreleased</h2>` → `<h2 id="v0-11-3">0.11.3 &mdash; 2026-05-18</h2>`
   - `<h3 id="unreleased-changed">Changed</h3>` → `<h3 id="v0-11-3-changed">Changed</h3>`

2. Add a summary paragraph immediately after the h2 (before the first h3):
   ```html
   <p>Ships <code>/relay-commit</code> as the first Pillar 3 command &mdash; the human-triggered local commit step between <code>/relay-execute</code> completion and <code>/relay-pr</code>. This is a deterministic infra command (no LLM, no writer/reviewer split): it validates the worktree, generates a structured commit message from the orchestrator audit log, and commits via <code>git -C .worktrees/&lt;feature&gt;/ commit</code> without <code>--no-verify</code>. Plugin manifest version bumped <code>0.11.2</code> &rarr; <code>0.11.3</code> per the 2026-04-30 &sect;7.5 binding contract.</p>
   ```

3. Add an "Added" subsection before the "Changed" subsection:
   ```html
   <h3 id="v0-11-3-added">Added</h3>
   <ul>
     <li><strong><code>plugins/relay/commands/relay-commit.md</code></strong> &mdash; new Pillar 3 infra command. Phase 0 preconditions: P0 argument non-empty; P1 <code>.worktrees/&lt;feature&gt;/</code> must exist (<code>FAILED_MISSING_WORKTREE</code>); P2 branch must be <code>feature/&lt;feature&gt;</code> (<code>FAILED_WRONG_BRANCH</code>). Phase 1 idempotency: <code>git -C .worktrees/&lt;feature&gt;/ status --porcelain</code> empty &rarr; exit 0 with &ldquo;Nothing to commit&rdquo;. Phase 2 commit message: <code>PRPs/reports/&lt;feature&gt;/orchestrator-run.json</code> + PRD title; fallback <code>feat(&lt;feature&gt;): implement via relay</code>. Phase 3 stage + commit via <code>git -C .worktrees/&lt;feature&gt;/ add -A</code> + <code>git commit</code> (pre-commit hooks run; <code>--no-verify</code> never passed). Phase 4 output: short hash, branch, <code>Next: /relay-pr &lt;feature&gt;</code>. Analogous to <code>plugins/prp-core/commands/prp-commit.md</code> adapted for relay worktree conventions.</li>
   </ul>
   ```

4. In the existing Changed `<ul>`, add the following entries at the top of the list (before the existing docs/decisions.md entries):
   ```html
   <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.11.2</code> &rarr; <code>0.11.3</code> per the 2026-04-30 &sect;7.5 binding contract. Behavior changes to <code>relay-commit.md</code> satisfy the &ldquo;ships plugin asset&rdquo; condition.</li>
   <li><strong><code>docs/api-reference.md</code></strong> &mdash; <code>/relay-commit</code> row updated from <code>*(planned)*</code> to <code>&#x2705; **implemented**</code>; output description extended with Phase 0&ndash;4 details and link to command file.</li>
   <li><strong><code>docs/context/architecture.md</code></strong> &mdash; Phase 4 (Approval) phased rollout status updated from &ldquo;not started&rdquo; to &ldquo;partial&rdquo;; Commands asset-type row updated to reflect 13 commands implemented.</li>
   <li><strong><code>documentation/reference/commands.html</code></strong> &mdash; <code>/relay-commit</code> heading gains <code>badge--done</code>; &ldquo;Planned &mdash; not yet implemented&rdquo; Status row replaced with Mode (deterministic infra) and Preconditions (P0/P1/P2) rows.</li>
   <li><strong><code>documentation/roadmap/status.html</code></strong> &mdash; Phase 4 (Approval) badge updated from <code>badge--pending</code> to <code>badge--partial</code>; Scope cell updated to note <code>/relay-commit</code> shipped v0.11.3.</li>
   ```

5. Insert a new empty Unreleased block ABOVE the renamed v0.11.3 block:
   ```html
   <h2 id="unreleased">Unreleased</h2>

   ```

**ACTION in `documentation/roadmap/status.html`:**

Locate the Phase 4 table row. Replace `<span class="badge badge--pending">pending</span>` with `<span class="badge badge--partial">partial</span>`. Also update the Scope cell to append: ` <code>/relay-commit</code> shipped v0.11.3; <code>/relay-pr</code> + <code>/relay-approve</code> + Docs Updater/Reviewer pending.` (Satisfies AC-A4 and AC-A5 — the changelog 0.11.3 — 2026-05-18 versioned entry fulfills AC-A4's Success signal requirement that documentation/changelog.html has a new versioned entry referencing /relay-commit; the roadmap badge--partial update fulfills AC-A5 reflecting /relay-commit shipped while /relay-pr + /relay-approve remain pending.)

**MIRROR**: Pattern 1 (changelog.html:48-70 — versioned release entry shape); Pattern 5 (roadmap/status.html:29 — badge--partial)

**VALIDATE**: `grep -q "v0-11-3" documentation/changelog.html && echo "CHANGELOG_VERSION: PASS" || echo "CHANGELOG_VERSION: FAIL" && grep -q "badge--partial" documentation/roadmap/status.html && echo "ROADMAP_PARTIAL: PASS" || echo "ROADMAP_PARTIAL: FAIL"`

---

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify plugin.json is valid JSON with correct version
python3 -c "import json; d=json.load(open('plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.11.3', f'Expected 0.11.3, got {d[\"version\"]}'; print('PLUGIN_JSON: PASS')"

# Verify HTML files are non-empty (basic existence check)
test -s documentation/changelog.html && echo "CHANGELOG_EXISTS: PASS" || echo "CHANGELOG_EXISTS: FAIL"
test -s documentation/reference/commands.html && echo "COMMANDS_HTML_EXISTS: PASS" || echo "COMMANDS_HTML_EXISTS: FAIL"
test -s documentation/roadmap/status.html && echo "STATUS_HTML_EXISTS: PASS" || echo "STATUS_HTML_EXISTS: FAIL"
```

### Level 2 — CONTENT_INVARIANTS

```bash
# plugin.json version 0.11.3
python3 -c "import json; d=json.load(open('plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.11.3'; print('PLUGIN_VERSION: PASS')"

# api-reference.md: /relay-commit marked implemented (not planned)
grep -q "relay-commit.*implemented" docs/api-reference.md && echo "API_REF_COMMIT: PASS" || echo "API_REF_COMMIT: FAIL"

# architecture.md: Phase 4 partial status
grep -q "partial" docs/context/architecture.md && echo "ARCH_PARTIAL: PASS" || echo "ARCH_PARTIAL: FAIL"

# commands.html: /relay-commit has badge--done
grep -q "relay-commit.*badge--done" documentation/reference/commands.html && echo "COMMANDS_BADGE: PASS" || echo "COMMANDS_BADGE: FAIL"

# commands.html: "Planned — not yet implemented" removed from relay-commit section
python3 - <<'EOF'
content = open("documentation/reference/commands.html").read()
relay_commit_pos = content.find('id="relay-commit"')
relay_pr_pos = content.find('id="relay-pr"')
relay_commit_section = content[relay_commit_pos:relay_pr_pos]
if "Planned" in relay_commit_section and "not yet implemented" in relay_commit_section:
    print("PLANNED_TEXT_STILL_PRESENT: FAIL")
    raise SystemExit(1)
print("PLANNED_TEXT_REMOVED: PASS")
EOF

# changelog.html: v0.11.3 versioned entry exists
grep -q "v0-11-3" documentation/changelog.html && echo "CHANGELOG_V0113: PASS" || echo "CHANGELOG_V0113: FAIL"

# changelog.html: relay-commit.md mentioned in v0.11.3 section
grep -q "relay-commit.md" documentation/changelog.html && echo "CHANGELOG_RELAY_COMMIT: PASS" || echo "CHANGELOG_RELAY_COMMIT: FAIL"

# roadmap/status.html: Phase 4 badge--partial
grep -q "badge--partial" documentation/roadmap/status.html && echo "ROADMAP_PARTIAL: PASS" || echo "ROADMAP_PARTIAL: FAIL"
```

### Level 3 — DRY-RUN END-TO-END

```bash
# Consistency check: plugin.json version appears in changelog
python3 - <<'EOF'
import json, re
plugin_ver = json.load(open("plugins/relay/.claude-plugin/plugin.json"))["version"]
changelog = open("documentation/changelog.html").read()
# Check version appears as a versioned entry header (e.g., "0.11.3 &mdash;")
pattern = rf'{re.escape(plugin_ver)}.*2026'
if re.search(pattern, changelog):
    print(f"VERSION_CONSISTENCY: PASS — plugin.json {plugin_ver} matches changelog entry")
else:
    print(f"VERSION_CONSISTENCY: FAIL — plugin.json {plugin_ver} not found in changelog as versioned entry")
    raise SystemExit(1)
EOF

# Verify no new CSS files or JS files were added
python3 - <<'EOF'
import os
css_count = sum(1 for r, d, files in os.walk("documentation/assets/css") for f in files if f.endswith(".css"))
js_count = sum(1 for r, d, files in os.walk("documentation/assets/js") for f in files if f.endswith(".js"))
assert css_count == 1, f"Expected 1 CSS file, found {css_count}"
assert js_count == 1, f"Expected 1 JS file, found {js_count}"
print(f"NO_NEW_ASSETS: PASS — {css_count} CSS file, {js_count} JS file (unchanged)")
EOF

# Verify no new HTML pages were created (no three-file registration required)
# Phase 2 only edits existing files; all 6 target files existed before
for f in "plugins/relay/.claude-plugin/plugin.json" "docs/api-reference.md" "docs/context/architecture.md" "documentation/reference/commands.html" "documentation/changelog.html" "documentation/roadmap/status.html"; do
  test -f "$f" && echo "EXISTS: $f" || echo "MISSING: $f"
done
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1 through AC-5):** `plugins/relay/.claude-plugin/plugin.json` reports version `0.11.3`, matching the `documentation/changelog.html` versioned entry `0.11.3 — 2026-05-18`. The `docs/decisions.md` 2026-04-30 §7.5 binding contract is satisfied: the patch release ships a plugin asset (`plugins/relay/commands/relay-commit.md`, which directly implements PRD AC-1 through AC-5).

- **AC-A2 (PRD AC-1 through AC-5):** `docs/api-reference.md` Pillar 3 table row for `/relay-commit` reads `✅ **implemented**` (not `*(planned)*`), confirming the command that satisfies AC-1 through AC-5 is officially shipped in the documentation.

- **AC-A3 (PRD AC-1 through AC-5):** `documentation/reference/commands.html` Pillar 3 `/relay-commit` heading carries the `badge--done` badge. The `Status: Planned — not yet implemented` dt/dd is absent; Mode (deterministic infra, no LLM) and Preconditions (P0/P1/P2 with HALT codes) replace it, reflecting the behavior described in PRD AC-1 through AC-5.

- **AC-A4 (PRD AC-1 through AC-5):** `documentation/changelog.html` contains a versioned entry `0.11.3 — 2026-05-18` with an `Added` section listing `plugins/relay/commands/relay-commit.md` and a `Changed` section listing `plugin.json 0.11.2 → 0.11.3`. The previous `Unreleased` block is renamed to `0.11.3`; a new empty `Unreleased` block appears above it. This constitutes the required "new versioned entry referencing /relay-commit" from the PRD Phase 2 Success signal.

- **AC-A5 (PRD AC-1 through AC-5):** `documentation/roadmap/status.html` Phase 4 (Approval) row shows `badge--partial` (not `badge--pending`), reflecting that `/relay-commit` is shipped while `/relay-pr` and `/relay-approve` remain pending.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| HTML entity encoding errors (e.g., `&mdash;` vs bare `—`) | Low | Low — rendering issue only, not a functional regression | Follow Pattern 1 exactly (copy HTML entity patterns from the v0.11.2 entry); all entities are already present in the file |
| Accidentally removing existing Unreleased entries when renaming the block | Medium | Medium — changelog history loss | Rename only the `<h2>` and `<h3>` id attributes; do NOT delete the existing Changed `<ul>` content — only add to it |
| Three-file registration rule violation (new page without NAV + search + changelog) | Low (no new pages in Phase 2) | Medium if triggered | Plan explicitly excludes new page creation; AGENTS.md §6 only fires for new pages |
| badge--partial CSS class missing from app.css | Low | Medium — badge renders without styling | Pattern 5 confirms the class is already declared in the status.html legend; verify in app.css before using |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**docs-only phase:** This plan authors no command files, agent files, or hook scripts. The `phase_type: docs` annotation correctly suppresses the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` rubric check — all VALIDATE commands use `grep`, `python3`, and `test`, which are appropriate tools for a docs/manifest phase and do not require a test-framework token.

**Changelog Unreleased → 0.11.3 scope:** The existing Unreleased block (carrying the docs/decisions.md 2026-05-18 Pillar 3 entries and the preparatory api-reference/architecture/commands.html updates from prior sessions) is wholesale renamed to `0.11.3`. Phase 2-specific entries (plugin.json bump, api-reference.md implemented status, commands.html badge, roadmap.html partial) are added to the same block. The net effect is that everything in Unreleased is released together as 0.11.3.

*Generated: 2026-05-18*
*Approved: 2026-05-18*
*Status: IMPLEMENTED*
