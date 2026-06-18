# Feature: Plugin bump + docs (Phase 2 of relay-pr-command)

```
**Decision Gate**
- Active context: none (docs/context/architecture.md consulted; no per-feature .context.md file present)
- Activated criteria: a new plugin asset shipped in Phase 1 (plugins/relay/commands/relay-pr.md); plugin.json version bump required per 2026-04-30 §7.5 binding contract; documentation/changelog.html must gain a versioned 0.15.0 release entry referencing /relay-pr; documentation/reference/commands.html /relay-pr section must flip from planned to implemented; documentation/AGENTS.md three-file registration rule applies only to NEW pages (no new pages in this phase)
- Decisions found:
  - 2026-04-30 Plugin manifest version bump on every minor/major release shipping a plugin asset (docs/decisions.md; documentation/AGENTS.md §7.5) — relay-pr.md is a new plugin asset under plugins/relay/commands/; shipping a new command is a backward-compatible feature → MINOR bump 0.14.0 → 0.15.0 required in the same commit
  - 2026-05-18 Pillar 3 command surface (/relay-commit + /relay-pr + /relay-approve) — /relay-pr is the second shipped Pillar 3 command; Phase 4 (Approval) remains "partial" (two of three Pillar 3 commands now shipped; /relay-approve + Docs Updater/Reviewer still pending)
  - 2026-04-19 PRP artifacts live under PRPs/, never under .claude/ — this plan and the back-fill write under PRPs/ and the documentation/ + docs/ + plugins/ trees; no .claude/ writes
  - 2026-04-25 Plan filenames carry the source PRD phase number and slug — this plan is named PRPs/plans/relay-pr-command-phase-2-plugin-bump-docs.plan.md
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66) — all writes land in plugins/, docs/, documentation/, and PRPs/; no .claude/ writes
  - Adding new CSS files or JS files (documentation/AGENTS.md §2.3) — this phase makes no CSS/JS changes; badge classes (badge--done, badge--partial) already exist in app.css
  - Inline style= attributes or new <style> blocks (documentation/AGENTS.md §2.4) — only existing badge/kv vocabulary is used
  - Emitting secret values in run reports or logs (docs/anti-patterns.md:33-38) — no run reports or secrets are touched in this phase
- Applicable architectural rules:
  - documentation/AGENTS.md §7 changelog rule: every change to documentation/ must add a changelog entry; cutting v0.15.0 satisfies this for all Phase 2 documentation/ changes
  - documentation/AGENTS.md §7.5 plugin-manifest lock-step (binding): a minor release cut in changelog.html MUST bump plugin.json to the same value in the same commit
  - documentation/AGENTS.md §6 three-file registration rule (NAV + search index + changelog): applies only to NEW pages; no new pages in Phase 2 — only existing pages are edited
  - documentation/AGENTS.md §9 modifying-an-existing-page workflow: preserve structure, do not rename id slugs, log under changelog Changed/Added
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-pr-command.prd.md` — Implementation Phases row 2: "Plugin bump + docs" — Goal: Ship the command in the next versioned relay release and flip every documentation surface from planned to shipped. — Success signal: `documentation/changelog.html` has a new versioned entry referencing `/relay-pr`; `plugin.json` version matches the changelog entry; the Pillar 3 section of `documentation/reference/commands.html` shows `/relay-pr` as shipped (not planned).

## Summary

Phase 2 ships the `/relay-pr` command authored in Phase 1 (`plugins/relay/commands/relay-pr.md`) as a versioned relay release and flips every documentation surface from planned to shipped. It cuts the `0.15.0` release by renaming the empty `Unreleased` block in `documentation/changelog.html` to a versioned `0.15.0` entry (with `Added` and `Changed` subsections referencing `/relay-pr`) and inserting a fresh empty `Unreleased` block above it. It bumps `plugins/relay/.claude-plugin/plugin.json` from `0.14.0` to `0.15.0` in the same commit, per the 2026-04-30 §7.5 binding lock-step contract (shipping a new command is a backward-compatible feature → MINOR bump). It flips `/relay-pr` from `*(planned)*` to `✅ **implemented**` in `docs/api-reference.md`, advances the Phase 4 / Commands rows in `docs/context/architecture.md` to name `/relay-pr` as shipped, replaces the `Status: Planned` dt/dd in `documentation/reference/commands.html` with a `badge--done` badge plus Mode/Preconditions detail (mirroring the `/relay-commit` shape), and updates the Phase 4 Scope cell in `documentation/roadmap/status.html` to move `/relay-pr` from pending to shipped (the badge stays `badge--partial` because `/relay-approve` remains pending). No new pages, no new CSS/JS — all changes are targeted edits to six existing files.

## User Story

```
As a relay operator who sees /relay-pr listed as "planned" in the docs
I want the documentation to show /relay-pr as implemented with v0.15.0
So that I can trust the documentation reflects the shipped Pillar 3 command surface
```

## Problem Statement

After Phase 1 shipped `plugins/relay/commands/relay-pr.md`, the documentation still shows `/relay-pr` as "planned": `documentation/reference/commands.html` carries a `Status: Planned — not yet implemented` dt/dd, `docs/api-reference.md` still marks the Pillar 3 row `*(planned)*`, `docs/context/architecture.md` still names `/relay-pr` as pending, `documentation/roadmap/status.html`'s Phase 4 Scope cell lists `/relay-pr` as pending, `plugin.json` still reads `0.14.0`, and the changelog has no versioned entry for this release. Phase 2 closes this gap so the shipped command surface and the documentation agree, and the plugin cache (keyed on `plugin.json` version) invalidates for installed users.

## Solution Statement

Six targeted edits: (1) `plugin.json` → `0.15.0`; (2) `docs/api-reference.md` → `/relay-pr` Pillar 3 row `✅ **implemented**` plus the command-count header line and the stale Infrastructure-section `/relay-pr` row reconciled to the committed-then-pushed contract; (3) `docs/context/architecture.md` → Phase 4 row and Commands asset-type row name `/relay-pr` as shipped v0.15.0; (4) `documentation/reference/commands.html` → `/relay-pr` h3 gains `badge--done`, `Notes`/`Status` dt/dd replaced with `Mode`/`Preconditions`, page subtitle updated; (5) `documentation/changelog.html` → empty `Unreleased` renamed to `0.15.0 — <today>` with `Added` + `Changed` subsections, fresh empty `Unreleased` inserted above; (6) `documentation/roadmap/status.html` → Phase 4 Scope cell moves `/relay-pr` from pending to shipped (badge stays `badge--partial`).

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation + manifest update (no command files, no agent files, no structural changes) |
| Complexity | Low — six targeted text edits; all target files already exist; no new pages; no CSS/JS changes; clear before/after state for each edit |
| Systems Affected | `plugins/relay/.claude-plugin/plugin.json`; `docs/api-reference.md`; `docs/context/architecture.md`; `documentation/reference/commands.html`; `documentation/changelog.html`; `documentation/roadmap/status.html` |
| Dependencies | Phase 1 complete (`plugins/relay/commands/relay-pr.md` exists); `documentation/AGENTS.md` §2/§6/§7/§7.5 invariants; `docs/decisions.md` 2026-04-30 version-bump contract |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/relay-pr-command.prd.md` line 346 (Implementation Phases table row 2); Phase Details lines 358-365 |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| MUST | `PRPs/prds/relay-pr-command.prd.md` | 358-365 | Phase 2 Phase Details — Goal, Scope, Success signal |
| MUST | `documentation/AGENTS.md` | 32-41, 239-381 | Binding documentation-site contract — §2 core invariants, §6 three-file rule, §7 + §7.5 changelog + plugin lock-step rules; must be read before editing any documentation/ file |
| MUST | `documentation/changelog.html` | 31-48 | Empty Unreleased block (line 31) + v0.14.0 versioned entry (33-48) — the exact shape to mirror when renaming Unreleased → 0.15.0 and adding Added/Changed subsections |
| MUST | `documentation/reference/commands.html` | 233-255 | /relay-commit implemented section (233-243, the pattern) + current /relay-pr planned section (245-255, the target) |
| MUST | `docs/decisions.md` | 335-381 | 2026-04-30 plugin manifest version-bump binding contract — confirms the 0.15.0 minor bump is required for a release shipping a plugin asset |
| SHOULD | `docs/api-reference.md` | 17-21, 60, 72-74 | Header command-count line (17-21); stale Infrastructure /relay-pr row (60); /relay-commit implemented Pillar 3 row (72, the pattern) + /relay-pr planned Pillar 3 row (73, the target) |
| SHOULD | `docs/context/architecture.md` | 25, 164 | Commands asset-type row (25) + Phase 4 phased-rollout row (164) — exact current text naming /relay-pr as pending |
| SHOULD | `documentation/roadmap/status.html` | 61-66 | Phase 4 Approval row — badge--partial span + Scope cell text listing /relay-pr as pending |

## Patterns to Mirror

### Pattern 1 — Versioned changelog release entry shape (v0.14.0 block)

# SOURCE: `documentation/changelog.html:33-48`

```html
<h2 id="v0-14-0">0.14.0 — 2026-06-17</h2>

<p>Ships <code>/relay-commit</code>, the first Pillar 3 command, completing the operator&rsquo;s commit step ... Plugin manifest version bumped <code>0.13.1</code> &rarr; <code>0.14.0</code> per the 2026-04-30 &sect;7.5 binding contract (the change ships a plugin asset).</p>

<h3 id="v0-14-0-added">Added</h3>
<ul>
  <li><strong><code>plugins/relay/commands/relay-commit.md</code></strong> &mdash; the <code>/relay-commit &lt;feature-name&gt;</code> command. Four-phase protocol ... </li>
</ul>

<h3 id="v0-14-0-changed">Changed</h3>
<ul>
  <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.13.1</code> &rarr; <code>0.14.0</code> per the 2026-04-30 &sect;7.5 binding contract. ...</li>
</ul>
```

**Used by:** Task 4 (rename Unreleased → 0.15.0; add Added/Changed subsections). The id pattern for 0.15.0 is `v0-15-0`; inner heading ids are `v0-15-0-added` and `v0-15-0-changed`. Summary `<p>` describes what shipped + the §7.5 bump. Each `<li>` uses `<strong><code>path</code></strong> &mdash; description` with HTML entities `&mdash;` (em-dash), `&rarr;` (arrow), `&sect;` (§), `&lt;`/`&gt;` (angle brackets).

---

### Pattern 2 — Empty Unreleased block above the top versioned entry

# SOURCE: `documentation/changelog.html:31`

```html
<h2 id="unreleased">Unreleased</h2>
```

**Used by:** Task 4. The current empty `Unreleased` block (line 31, no child content before the next `<h2>` at line 33) is RENAMED to the `0.15.0` versioned heading; a NEW empty `<h2 id="unreleased">Unreleased</h2>` is then inserted above the renamed block so future changes accumulate.

---

### Pattern 3 — badge--done span on an implemented command h3 (+ Mode/Preconditions dt/dd)

# SOURCE: `documentation/reference/commands.html:233-242`

```html
<h3 id="relay-commit"><code>/relay-commit &lt;feature-name&gt;</code> <span class="badge badge--done">implemented</span></h3>
<div class="kv">
  <dt>Input</dt>
  <dd>...</dd>
  <dt>Output</dt>
  <dd>...</dd>
  <dt>Mode</dt>
  <dd>Deterministic infra command (no LLM, no agent, no writer/reviewer split). ... See <code>plugins/relay/commands/relay-commit.md</code>.</dd>
  <dt>Preconditions</dt>
  <dd>P0: argument non-empty; P1: <code>.worktrees/&lt;feature&gt;/</code> exists (<code>FAILED_MISSING_WORKTREE</code> ...); P2: worktree branch is <code>feature/&lt;feature&gt;</code> (<code>FAILED_WRONG_BRANCH</code> ...).</dd>
</div>
```

**Used by:** Task 3 (add `badge--done` to the `/relay-pr` h3; replace the `Notes`/`Status` dt/dd with `Mode`/`Preconditions`). The badge span comes after the command title text, separated by a space, with no text between the badge and the closing `</h3>`. The Mode dd ends with a `See plugins/relay/commands/relay-pr.md` pointer; the Preconditions dd lists the relay-pr HALT codes (`FAILED_MISSING_WORKTREE`, `FAILED_WRONG_BRANCH`, `FAILED_UNCOMMITTED_CHANGES`, `FAILED_BRANCH_DIVERGENCE`, `FAILED_TEST_REVIEW_NOT_APPROVED`) drawn from PRD AC-2/AC-5/AC-7/AC-8.

---

### Pattern 4 — api-reference.md ✅ **implemented** Pillar 3 table row

# SOURCE: `docs/api-reference.md:72`

```markdown
| `/relay-commit <feature-name>` ✅ **implemented** | worktree at `.worktrees/<feature>/` on branch `feature/<feature>` with uncommitted changes | local git commit (no push). ... See `plugins/relay/commands/relay-commit.md`. |
```

**Used by:** Task 2 (replace `/relay-pr <feature-name>` *(planned)* at line 73 with `✅ **implemented**`). The `✅ **implemented**` marker replaces `*(planned)*` in the command-name cell; the Output cell is extended with the /relay-pr Phase summary + the `plugins/relay/commands/relay-pr.md` pointer.

---

### Pattern 5 — plugin.json version field format

# SOURCE: `plugins/relay/.claude-plugin/plugin.json:3`

```json
  "version": "0.14.0",
```

**Used by:** Task 1 (bump version 0.14.0 → 0.15.0). Exact JSON string replacement; no structural changes to the manifest.

---

### Pattern 6 — badge--partial span + Scope cell (status.html Phase 4 row)

# SOURCE: `documentation/roadmap/status.html:62-65`

```html
<td>4</td>
<td><strong>Approval</strong></td>
<td><code>/relay-commit</code> (local commit, no push) <strong>shipped v0.14.0</strong>; <code>/relay-pr</code> (push + PR creation) + <code>/relay-approve</code> (merge + branch/worktree cleanup + docs update) + Docs Updater + Docs Reviewer agents pending</td>
<td><span class="badge badge--partial">partial</span></td>
```

**Used by:** Task 5 (move `/relay-pr` from pending to shipped in the Scope cell; badge stays `badge--partial` because `/relay-approve` + Docs Updater/Reviewer remain pending). The badge class is `badge--partial`; content is `partial`. Same CSS class system as `badge--done`/`badge--pending`.

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Version bump 0.14.0 → 0.15.0; required by 2026-04-30 §7.5 binding contract — shipping `relay-pr.md` (a new plugin asset / backward-compatible feature) is a MINOR release |
| `docs/api-reference.md` | UPDATE | Pillar 3 `/relay-pr` row changes from `*(planned)*` to `✅ **implemented**` with extended Output; command-count header line advanced; stale Infrastructure-section `/relay-pr` row (line 60) reconciled to the committed-then-pushed contract |
| `docs/context/architecture.md` | UPDATE | Phase 4 phased-rollout row and Commands asset-type row updated to name `/relay-pr` as shipped v0.15.0 (Phase 4 stays partial — `/relay-approve` pending) |
| `documentation/reference/commands.html` | UPDATE | `/relay-pr` h3 gains `badge--done`; `Notes`/`Status: Planned` dt/dd replaced with `Mode`/`Preconditions` mirroring `/relay-commit`; page subtitle updated |
| `documentation/changelog.html` | UPDATE | Empty `Unreleased` block renamed to `0.15.0 — <today>` with `Added` (relay-pr.md) + `Changed` (plugin.json bump + each doc surface) subsections; fresh empty `Unreleased` inserted above |
| `documentation/roadmap/status.html` | UPDATE | Phase 4 Scope cell moves `/relay-pr` from the pending list to the shipped list (badge remains `badge--partial`) |

## NOT Building (Scope Limits)

- **New documentation pages** — no new HTML files; only editing existing pages, so the §6 three-file registration rule does not fire.
- **New CSS classes or CSS/JS files** — `badge--done` and `badge--partial` already exist in `app.css`; no `app.css`/`app.js` changes (§2.3 invariant).
- **NAV or search-index updates** — no new pages → no NAV (`app.js`) or `search-index.json` changes.
- **`/relay-approve` documentation flip** — `/relay-approve` is still a placeholder; Phase 2 only ships `/relay-pr` docs. The Phase 4 badge therefore stays `badge--partial`, not `badge--done`.
- **`/relay-pr` command-file edits** — `plugins/relay/commands/relay-pr.md` was authored in Phase 1; Phase 2 does not modify it.
- **`docs/decisions.md` new entries** — the relevant decisions (2026-05-18 Pillar 3 split; 2026-04-30 §7.5 lock-step) already exist; no decision is added or re-evaluated.
- **Authoring `final-report.md` or any run report** — out of scope; this is a docs/manifest phase with no pipeline run.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/.claude-plugin/plugin.json` — version bump 0.14.0 → 0.15.0

**ACTION**: Edit `plugins/relay/.claude-plugin/plugin.json`. Replace `"version": "0.14.0"` with `"version": "0.15.0"`. No other changes to the JSON structure. (Satisfies AC-A1 — the plugin.json version bump is the primary shipping signal establishing that the command implementing PRD AC-1 through AC-11 is released as v0.15.0, per the §7.5 lock-step contract.)

**MIRROR**: Pattern 5 (`plugins/relay/.claude-plugin/plugin.json:3` — exact version field format)

**VALIDATE**: `python3 -c "import json; d=json.load(open('plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.15.0', f'Expected 0.15.0, got {d[\"version\"]}'; print('PLUGIN_VERSION: PASS')"`

---

### Task 2: UPDATE `docs/api-reference.md` — /relay-pr Pillar 3 row planned → implemented (+ count header + stale Infra row)

**ACTION**: In `docs/api-reference.md`:

1. Locate the Pillar 3 table row for `/relay-pr` (line 73):
   ```markdown
   | `/relay-pr <feature-name>` *(planned)* | worktree with a committed branch (produced by `/relay-commit`) + green tests + all reviews `APPROVED` | branch pushed to origin (if not already) + PR opened via `gh pr create` + `PRPs/reports/<feature>/final-report.md` |
   ```
   Replace `*(planned)*` with `✅ **implemented**`. Extend the Output cell to add: "Phase 0 validates worktree existence (`FAILED_MISSING_WORKTREE`), branch (`FAILED_WRONG_BRANCH`), and clean tree (`FAILED_UNCOMMITTED_CHANGES` → run `/relay-commit`). Framework-conditional test-review gate (`FAILED_TEST_REVIEW_NOT_APPROVED` when `run.json` exists without an APPROVED `test-review.json`; graceful skip otherwise). Non-forced push only when local is ahead of remote (`FAILED_BRANCH_DIVERGENCE` on non-fast-forward; never `--force`). Idempotent existing-PR detection via `gh pr list --head ... --json url`. `final-report.md` (redacted) as `--body-file` when test artifacts exist; minimal body otherwise. `--draft` and `--base <ref>` flags; `pr_url` write-back to `orchestrator-run.json` (best-effort). See `plugins/relay/commands/relay-pr.md`."

2. Update the command-count header line (lines 17-19), which currently reads "13 commands organized by role (12 Pillar 1–2 plus `/relay-commit` as the first Pillar 3 command, shipped v0.14.0), plus 1 placeholder for the remaining Pillar 3." Change it to name `/relay-pr` as the second shipped Pillar 3 command (e.g. "14 commands organized by role (12 Pillar 1–2 plus `/relay-commit` and `/relay-pr` as the first two Pillar 3 commands, shipped v0.14.0 and v0.15.0), plus 1 placeholder (`/relay-approve`) for the remaining Pillar 3.").

3. Reconcile the stale Infrastructure-section `/relay-pr` row (line 60), which currently reads `git commit + branch push + PR opened + ...` — `/relay-pr` no longer commits per the three-command split (commit is owned by `/relay-commit`). Update that Output cell to `branch push (non-forced) + PR opened via gh pr create + PRPs/reports/<feature>/final-report.md (when test artifacts exist)`, removing the "git commit" verb. (Satisfies AC-A2 — the API-reference flip and stale-row reconciliation confirm in the canonical command reference that the command implementing PRD AC-1 through AC-11 is officially shipped and described consistently with the three-command split.)

**MIRROR**: Pattern 4 (`docs/api-reference.md:72` — `✅ **implemented**` format in the Pillar 3 table)

**VALIDATE**: `grep -q 'relay-pr <feature-name>`* ✅ \*\*implemented\*\*' docs/api-reference.md || grep -Eq 'relay-pr.*implemented' docs/api-reference.md && echo "API_REF_PR_STATUS: PASS" || echo "API_REF_PR_STATUS: FAIL"`

---

### Task 3: UPDATE `documentation/reference/commands.html` — /relay-pr section planned → implemented

**ACTION**: In `documentation/reference/commands.html`:

1. Locate the `/relay-pr` h3 heading (line 245):
   ```html
   <h3 id="relay-pr"><code>/relay-pr &lt;feature-name&gt;</code></h3>
   ```
   Replace with:
   ```html
   <h3 id="relay-pr"><code>/relay-pr &lt;feature-name&gt;</code> <span class="badge badge--done">implemented</span></h3>
   ```

2. In the same `<div class="kv">` block (lines 246-255), replace the `Notes` and `Status` dt/dd pairs:
   ```html
   <dt>Notes</dt>
   <dd>Verifies branch state before pushing &mdash; idempotent if branch was already pushed. Uses <code>gh</code> CLI under the hood.</dd>
   <dt>Status</dt>
   <dd>Planned &mdash; not yet implemented.</dd>
   ```
   with `Mode` and `Preconditions` dt/dd (mirroring the `/relay-commit` shape at lines 239-242):
   ```html
   <dt>Mode</dt>
   <dd>Deterministic infra command (no LLM, no agent, no writer/reviewer split). Pure <code>git</code> + <code>gh</code> operations scoped to the worktree via <code>git -C .worktrees/&lt;feature&gt;/</code>. Idempotent: existing-PR detection via <code>gh pr list --head feature/&lt;feature&gt; --state open --json url</code> exits 0 with the existing URL; non-forced push (never <code>--force</code>) is a no-op when local matches remote. See <code>plugins/relay/commands/relay-pr.md</code>.</dd>
   <dt>Preconditions</dt>
   <dd>P0: argument non-empty; <code>.worktrees/&lt;feature&gt;/</code> exists (<code>FAILED_MISSING_WORKTREE</code>) on branch <code>feature/&lt;feature&gt;</code> (<code>FAILED_WRONG_BRANCH</code>); clean working tree (<code>FAILED_UNCOMMITTED_CHANGES</code> &mdash; run <code>/relay-commit</code> first); test-review gate enforced only when <code>run.json</code> exists (<code>FAILED_TEST_REVIEW_NOT_APPROVED</code>); non-fast-forward push halts (<code>FAILED_BRANCH_DIVERGENCE</code>).</dd>
   ```
   (Keep the existing `Input` and `Output` dt/dd; if the `Output` dd still says "Branch pushed to origin ... final-report.md embedded as the PR description", it remains accurate — optionally tighten "if not already ahead" wording, but the existing text is consistent with the shipped command.)

3. Update the page subtitle (line 24), which currently says "Thirteen commands plus one Pillar 3 placeholder", to reflect `/relay-pr` is now implemented (e.g. "Fourteen commands plus one Pillar 3 placeholder" — `/relay-approve` remains the placeholder). (Satisfies AC-A3 — the `badge--done` badge plus Mode/Preconditions replacement directly fulfills the commands.html Success-signal requirement that the Pillar 3 section shows `/relay-pr` as shipped, not planned.)

**MIRROR**: Pattern 3 (`documentation/reference/commands.html:233-242` — badge--done h3 + Mode/Preconditions dt/dd from the /relay-commit section)

**VALIDATE**: `python3 - <<'EOF'
c = open("documentation/reference/commands.html", encoding="utf-8").read()
start = c.find('id="relay-pr"'); end = c.find('id="relay-approve"')
sec = c[start:end]
assert "badge--done" in sec, "relay-pr h3 missing badge--done"
assert "Planned" not in sec and "not yet implemented" not in sec, "planned text still present in relay-pr section"
print("COMMANDS_PR_BADGE: PASS")
EOF`

---

### Task 4: UPDATE `documentation/changelog.html` — cut v0.15.0 (rename Unreleased + add Added/Changed)

**ACTION**: In `documentation/changelog.html`:

1. Rename the empty `Unreleased` block. Locate `<h2 id="unreleased">Unreleased</h2>` (line 31) and replace it with the new versioned heading PLUS a fresh empty Unreleased block above it:
   ```html
   <h2 id="unreleased">Unreleased</h2>

   <h2 id="v0-15-0">0.15.0 — <today's date YYYY-MM-DD></h2>
   ```

2. Immediately after the new `<h2 id="v0-15-0">`, add a summary `<p>` describing what shipped (mirror the v0.14.0 paragraph shape; use HTML entities `&mdash;`, `&rarr;`, `&sect;`, `&lt;`/`&gt;`):
   ```html
   <p>Ships <code>/relay-pr</code>, the second Pillar 3 command, completing the operator&rsquo;s push + pull-request step between <code>/relay-commit</code> (local commit) and <code>/relay-approve</code> (merge). It is a deterministic infra command &mdash; no LLM, no writer/reviewer split: it resolves <code>.worktrees/&lt;feature&gt;/</code>, verifies the branch and a clean working tree (<code>FAILED_UNCOMMITTED_CHANGES</code> &rarr; run <code>/relay-commit</code>), enforces the test-review gate only when <code>run.json</code> exists, pushes non-forced only when local is ahead of remote (<code>FAILED_BRANCH_DIVERGENCE</code> on a non-fast-forward; never <code>--force</code>), detects an existing open PR idempotently via <code>gh pr list</code>, and runs <code>gh pr create</code> with the redacted <code>final-report.md</code> as <code>--body-file</code> (minimal generated body when test artifacts are absent). Supports <code>--draft</code> and <code>--base &lt;ref&gt;</code>; writes <code>pr_url</code> back to <code>orchestrator-run.json</code> (best-effort). Plugin manifest version bumped <code>0.14.0</code> &rarr; <code>0.15.0</code> per the 2026-04-30 &sect;7.5 binding contract (the change ships a plugin asset).</p>
   ```

3. Add an `Added` subsection:
   ```html
   <h3 id="v0-15-0-added">Added</h3>
   <ul>
     <li><strong><code>plugins/relay/commands/relay-pr.md</code></strong> &mdash; the <code>/relay-pr &lt;feature-name&gt;</code> command. Phase 0 worktree preconditions + 4-phase protocol (assess/gate &rarr; push &rarr; PR body &rarr; create + output); idempotent existing-PR detection, framework-conditional test-review gate, conditional <code>final-report.md</code> generation with redaction, non-forced push. Analogous to <code>/relay-commit</code>, extended for push + PR creation.</li>
   </ul>
   ```

4. Add a `Changed` subsection listing the plugin bump and each documentation surface:
   ```html
   <h3 id="v0-15-0-changed">Changed</h3>
   <ul>
     <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong> &mdash; version bumped <code>0.14.0</code> &rarr; <code>0.15.0</code> per the 2026-04-30 &sect;7.5 binding contract. Users running <code>/plugin</code> after pulling this version get a fresh <code>relay/0.15.0/</code> cache directory with <code>/relay-pr</code> registered.</li>
     <li><strong><code>documentation/reference/commands.html</code></strong> &mdash; the <code>/relay-pr</code> entry flipped from &ldquo;planned&rdquo; to a <code>badge--done</code> implemented entry with Mode / Preconditions detail.</li>
     <li><strong><code>documentation/roadmap/status.html</code></strong> &mdash; Phase 4 Scope cell moved <code>/relay-pr</code> from the pending list to the shipped list (badge stays <code>partial</code> &mdash; <code>/relay-approve</code> pending).</li>
     <li><strong><code>docs/api-reference.md</code></strong> and <strong><code>docs/context/architecture.md</code></strong> &mdash; <code>/relay-pr</code> row flipped to implemented; command-count and Phase 4 / Commands rows updated to name <code>/relay-pr</code> as shipped v0.15.0.</li>
   </ul>
   ```

(Satisfies AC-A4 — the `0.15.0` versioned entry with an Added section listing `plugins/relay/commands/relay-pr.md` and a Changed section listing the `plugin.json 0.14.0 → 0.15.0` bump constitutes the "new versioned entry referencing /relay-pr" required by the PRD Phase 2 Success signal, and keeps the changelog/plugin.json versions in lock-step per AC-A1.)

**MIRROR**: Pattern 1 (`documentation/changelog.html:33-48` — versioned release entry shape) and Pattern 2 (`documentation/changelog.html:31` — empty Unreleased block placement)

**VALIDATE**: `grep -q 'id="v0-15-0"' documentation/changelog.html && grep -q 'relay-pr.md' documentation/changelog.html && grep -q 'id="unreleased"' documentation/changelog.html && echo "CHANGELOG_V0150: PASS" || echo "CHANGELOG_V0150: FAIL"`

---

### Task 5: UPDATE `documentation/roadmap/status.html` — Phase 4 Scope cell moves /relay-pr to shipped

**ACTION**: In `documentation/roadmap/status.html`, locate the Phase 4 Approval row (lines 61-66). In the Scope cell (line 64), move `/relay-pr` from the pending list to the shipped list. Change:
```html
<td><code>/relay-commit</code> (local commit, no push) <strong>shipped v0.14.0</strong>; <code>/relay-pr</code> (push + PR creation) + <code>/relay-approve</code> (merge + branch/worktree cleanup + docs update) + Docs Updater + Docs Reviewer agents pending</td>
```
to name both `/relay-commit` (v0.14.0) and `/relay-pr` (v0.15.0) as shipped, leaving `/relay-approve` + Docs Updater + Docs Reviewer as the only pending items, e.g.:
```html
<td><code>/relay-commit</code> (local commit, no push) <strong>shipped v0.14.0</strong>; <code>/relay-pr</code> (push + PR creation) <strong>shipped v0.15.0</strong>; <code>/relay-approve</code> (merge + branch/worktree cleanup + docs update) + Docs Updater + Docs Reviewer agents pending</td>
```
Leave the `<span class="badge badge--partial">partial</span>` badge (line 65) UNCHANGED — Phase 4 stays partial because `/relay-approve` + the Docs Updater/Reviewer agents remain pending. (Satisfies AC-A5 — the roadmap Scope cell now reflects `/relay-pr` shipped while `/relay-approve` remains pending, keeping the Phase 4 badge `badge--partial` rather than prematurely flipping to `badge--done`.)

**MIRROR**: Pattern 6 (`documentation/roadmap/status.html:62-65` — Phase 4 Approval row Scope cell + badge--partial)

**VALIDATE**: `grep -q 'relay-pr.*shipped v0.15.0' documentation/roadmap/status.html && grep -q 'badge--partial' documentation/roadmap/status.html && echo "ROADMAP_PR_SHIPPED: PASS" || echo "ROADMAP_PR_SHIPPED: FAIL"`

---

### Task 6: UPDATE `docs/context/architecture.md` — Phase 4 phased-rollout row + Commands asset-type row name /relay-pr as shipped v0.15.0

**ACTION**: In `docs/context/architecture.md`:

1. Update the Commands asset-type row (line 25). It currently reads:
   ```markdown
   | Commands | `plugins/relay/commands/` | `/relay-*` slash commands users invoke. | 13 implemented (including `/relay-commit` v0.14.0); see `docs/api-reference.md` |
   ```
   Change the Status cell to advance the implemented count and name `/relay-pr` as shipped v0.15.0, e.g.:
   ```markdown
   | Commands | `plugins/relay/commands/` | `/relay-*` slash commands users invoke. | 14 implemented (including `/relay-commit` v0.14.0 and `/relay-pr` v0.15.0); see `docs/api-reference.md` |
   ```

2. Update the Phase 4 phased-rollout row (line 164). It currently reads:
   ```markdown
   | 4 | Approval cycle — `/relay-commit` (local commit) + `/relay-pr` (push + PR creation) + `/relay-approve` (merge + docs update + worktree cleanup) | **partial** — `/relay-commit` shipped v0.14.0; `/relay-pr` + `/relay-approve` + Docs Updater/Reviewer pending |
   ```
   Change the Status cell to name `/relay-pr` as shipped v0.15.0, leaving `/relay-approve` + Docs Updater/Reviewer pending and keeping the phase `**partial**`, e.g.:
   ```markdown
   | 4 | Approval cycle — `/relay-commit` (local commit) + `/relay-pr` (push + PR creation) + `/relay-approve` (merge + docs update + worktree cleanup) | **partial** — `/relay-commit` shipped v0.14.0; `/relay-pr` shipped v0.15.0; `/relay-approve` + Docs Updater/Reviewer pending |
   ```
   Do NOT change the Phase column, the Deliverable column, or the `**partial**` status word — only the prose after `**partial** —` in the Status cell is edited to move `/relay-pr` from pending to shipped. (Satisfies AC-A5 — `docs/context/architecture.md`'s Phase 4 phased-rollout row and Commands asset-type row are updated to name `/relay-pr` as shipped v0.15.0, with Phase 4 staying `**partial**` because `/relay-approve` remains pending.)

**MIRROR**: Pattern 6 (`documentation/roadmap/status.html:62-65` — the Phase 4 "shipped vX.Y.Z; … pending" phrasing convention; architecture.md's Phase 4 row mirrors the same shipped-vs-pending split, keeping the phase partial)

**VALIDATE**: `grep -Eq 'relay-pr.*shipped v0.15.0' docs/context/architecture.md && grep -q '14 implemented' docs/context/architecture.md && echo "ARCH_PR_SHIPPED: PASS" || echo "ARCH_PR_SHIPPED: FAIL"`

---

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify plugin.json is valid JSON with the bumped version
python3 -c "import json; d=json.load(open('plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.15.0', f'Expected 0.15.0, got {d[\"version\"]}'; print('PLUGIN_JSON: PASS')"

# Verify the edited HTML files are non-empty (basic existence check)
test -s documentation/changelog.html && echo "CHANGELOG_EXISTS: PASS" || echo "CHANGELOG_EXISTS: FAIL"
test -s documentation/reference/commands.html && echo "COMMANDS_HTML_EXISTS: PASS" || echo "COMMANDS_HTML_EXISTS: FAIL"
test -s documentation/roadmap/status.html && echo "STATUS_HTML_EXISTS: PASS" || echo "STATUS_HTML_EXISTS: FAIL"
```

### Level 2 — CONTENT_INVARIANTS

```bash
# plugin.json version 0.15.0
python3 -c "import json; d=json.load(open('plugins/relay/.claude-plugin/plugin.json')); assert d['version']=='0.15.0'; print('PLUGIN_VERSION: PASS')"

# api-reference.md: /relay-pr marked implemented (not planned)
grep -Eq 'relay-pr.*implemented' docs/api-reference.md && echo "API_REF_PR: PASS" || echo "API_REF_PR: FAIL"

# architecture.md: /relay-pr named as shipped v0.15.0 (Phase 4 row + Commands asset-type row); Phase 4 stays partial
grep -Eq 'relay-pr.*shipped v0.15.0' docs/context/architecture.md && grep -q '14 implemented' docs/context/architecture.md && grep -q 'partial' docs/context/architecture.md && echo "ARCH_PR: PASS" || echo "ARCH_PR: FAIL"

# commands.html: /relay-pr has badge--done and no residual "Planned" in its section
python3 - <<'EOF'
c = open("documentation/reference/commands.html", encoding="utf-8").read()
start = c.find('id="relay-pr"'); end = c.find('id="relay-approve"')
sec = c[start:end]
assert "badge--done" in sec, "relay-pr missing badge--done"
assert "Planned" not in sec and "not yet implemented" not in sec, "planned text still present"
print("COMMANDS_PR_BADGE: PASS")
EOF

# changelog.html: v0.15.0 versioned entry exists and references relay-pr.md; fresh Unreleased present
grep -q 'id="v0-15-0"' documentation/changelog.html && echo "CHANGELOG_V0150: PASS" || echo "CHANGELOG_V0150: FAIL"
grep -q 'relay-pr.md' documentation/changelog.html && echo "CHANGELOG_RELAY_PR: PASS" || echo "CHANGELOG_RELAY_PR: FAIL"
grep -q 'id="unreleased"' documentation/changelog.html && echo "CHANGELOG_UNRELEASED: PASS" || echo "CHANGELOG_UNRELEASED: FAIL"

# roadmap/status.html: /relay-pr shipped; Phase 4 stays partial
grep -q 'badge--partial' documentation/roadmap/status.html && echo "ROADMAP_PARTIAL: PASS" || echo "ROADMAP_PARTIAL: FAIL"
```

### Level 3 — DRY-RUN END-TO-END

```bash
# Consistency: plugin.json version appears as a versioned changelog entry (§7.5 lock-step)
python3 - <<'EOF'
import json, re
ver = json.load(open("plugins/relay/.claude-plugin/plugin.json"))["version"]
changelog = open("documentation/changelog.html", encoding="utf-8").read()
dash_id = "v" + ver.replace(".", "-")
assert f'id="{dash_id}"' in changelog, f"plugin.json {ver} has no matching changelog id {dash_id}"
assert re.search(rf'{re.escape(ver)}\s*(&mdash;|—)\s*\d{{4}}', changelog), f"{ver} not a dated versioned heading"
print(f"VERSION_CONSISTENCY: PASS — plugin.json {ver} matches changelog entry id={dash_id}")
EOF

# No new CSS/JS files were added (AGENTS.md §2.3 invariant)
python3 - <<'EOF'
import os
css = sum(1 for r,d,fs in os.walk("documentation/assets/css") for f in fs if f.endswith(".css"))
js  = sum(1 for r,d,fs in os.walk("documentation/assets/js")  for f in fs if f.endswith(".js"))
assert css == 1, f"Expected 1 CSS file, found {css}"
assert js  == 1, f"Expected 1 JS file, found {js}"
print(f"NO_NEW_ASSETS: PASS — {css} CSS file, {js} JS file (unchanged)")
EOF

# No new HTML pages created (no three-file registration required); all 6 targets pre-existed
for f in "plugins/relay/.claude-plugin/plugin.json" "docs/api-reference.md" "docs/context/architecture.md" "documentation/reference/commands.html" "documentation/changelog.html" "documentation/roadmap/status.html"; do
  test -f "$f" && echo "EXISTS: $f" || echo "MISSING: $f"
done
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1 through AC-11):** `plugins/relay/.claude-plugin/plugin.json` reports version `0.15.0`, matching the `documentation/changelog.html` versioned entry `0.15.0 — <today>`. The 2026-04-30 §7.5 binding contract is satisfied: the release ships a plugin asset (`plugins/relay/commands/relay-pr.md`, which directly implements PRD AC-1 through AC-11), and shipping a new backward-compatible command is a MINOR bump.

- **AC-A2 (PRD AC-1 through AC-11):** `docs/api-reference.md` Pillar 3 table row for `/relay-pr` reads `✅ **implemented**` (not `*(planned)*`), the command-count header names `/relay-pr` as a shipped Pillar 3 command, and the stale Infrastructure-section `/relay-pr` row no longer claims `/relay-pr` commits (the commit verb is owned by `/relay-commit` per the three-command split) — confirming the command satisfying AC-1 through AC-11 is officially shipped and consistently described.

- **AC-A3 (PRD AC-1 through AC-11):** `documentation/reference/commands.html` Pillar 3 `/relay-pr` heading carries the `badge--done` badge. The `Status: Planned — not yet implemented` dt/dd is absent; `Mode` (deterministic infra, no LLM) and `Preconditions` (P0 + HALT codes `FAILED_MISSING_WORKTREE` / `FAILED_WRONG_BRANCH` / `FAILED_UNCOMMITTED_CHANGES` / `FAILED_TEST_REVIEW_NOT_APPROVED` / `FAILED_BRANCH_DIVERGENCE`) replace it, reflecting the behavior described in PRD AC-2/AC-5/AC-7/AC-8. This fulfills the PRD Phase 2 Success signal that the Pillar 3 section of commands.html shows `/relay-pr` as shipped.

- **AC-A4 (PRD AC-1 through AC-11):** `documentation/changelog.html` contains a versioned entry `0.15.0 — <today>` with an `Added` section listing `plugins/relay/commands/relay-pr.md` and a `Changed` section listing `plugin.json 0.14.0 → 0.15.0`. The previous empty `Unreleased` block is renamed to `0.15.0`; a fresh empty `Unreleased` block appears above it. This constitutes the required "new versioned entry referencing /relay-pr" from the PRD Phase 2 Success signal.

- **AC-A5 (PRD AC-1 through AC-11):** `documentation/roadmap/status.html` Phase 4 (Approval) Scope cell names both `/relay-commit` (v0.14.0) and `/relay-pr` (v0.15.0) as shipped, with `/relay-approve` + Docs Updater + Docs Reviewer remaining pending; the Phase 4 badge stays `badge--partial` (not prematurely `badge--done`), and `docs/context/architecture.md`'s Phase 4 phased-rollout row and Commands asset-type row are updated to name `/relay-pr` as shipped v0.15.0.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| HTML entity encoding errors (e.g. `&mdash;` vs a bare `—`) in the new changelog block | Low | Low — rendering issue only, not a functional regression | Copy the entity patterns verbatim from the v0.14.0 entry (Pattern 1); all entities already exist in the file |
| Accidentally deleting the v0.14.0 (or other) versioned entry while renaming the empty Unreleased block | Medium | Medium — changelog history loss | Edit only the `<h2 id="unreleased">` line: insert the new `0.15.0` heading after it and re-add an empty Unreleased above; never touch the existing v0.14.0 / v0.13.1 blocks (Risk mirrors the relay-commit Phase 2 mitigation) |
| Phase 4 badge prematurely flipped to `badge--done` | Low | Medium — overstates shipped surface (`/relay-approve` still pending) | Task 5 explicitly leaves the badge `badge--partial`; only the Scope cell text changes |
| Stale Infrastructure-section `/relay-pr` row (api-reference line 60) left claiming `/relay-pr` commits | Medium | Low | Task 2 step 3 reconciles that row to the committed-then-pushed contract; covered by AC-A2 |
| §7.5 lock-step missed (changelog cut without the plugin.json bump) | Low | High — installed users keep loading the cached old plugin | Task 1 + Task 4 are both required; Level 3 VERSION_CONSISTENCY check fails the build if the plugin.json version has no matching dated changelog id |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**docs-only phase:** This plan authors no command files, agent files, or hook scripts — `plugins/relay/commands/relay-pr.md` already exists from Phase 1 and is not modified here. The `phase_type: docs` annotation correctly suppresses the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` rubric check — all VALIDATE commands use `grep`, `python3`, and `test`, which are appropriate tooling for a docs/manifest phase and do not require a test-framework token. (relay itself has `test_frameworks: []`.)

**Changelog Unreleased → 0.15.0 scope:** Research confirmed the current `Unreleased` block (line 31) is EMPTY — there is no accumulated content to carry forward. The correct operation is therefore to rename `Unreleased` to the `0.15.0` versioned heading and author the Added/Changed subsections fresh, then insert a new empty `Unreleased` above it (per AGENTS.md §7.3 and keepachangelog convention). This differs from the relay-commit Phase 2, where the Unreleased block already carried preparatory entries.

**Phase 4 stays partial, not done:** Unlike a hypothetical final Pillar 3 release, this phase ships only the second of three Pillar 3 commands. The roadmap badge remains `badge--partial`; flipping it to `badge--done` would be incorrect while `/relay-approve` and the Docs Updater/Reviewer agents are unbuilt. Recorded explicitly so a reviewer does not flag the unchanged badge as an omission.

*Generated: 2026-06-17*
*Approved: 2026-06-17*
*Status: APPROVED*
