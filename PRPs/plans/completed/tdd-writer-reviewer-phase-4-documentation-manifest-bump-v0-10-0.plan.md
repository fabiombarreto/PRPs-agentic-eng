# Feature: Documentation + manifest bump v0.10.0 (Phase 4 of tdd-writer-reviewer)

```
**Decision Gate**
- Active context: none
- Activated criteria: documentation surface update across multiple HTML pages; plugin manifest version bump; new entry in docs/decisions.md
- Decisions found:
  - 2026-04-30 Plugin manifest version bumped on every minor/major release in lock-step with `documentation/changelog.html`
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/`
  - 2026-04-28 Three-file documentation registration rule (NAV + search index + changelog)
- Applicable anti-patterns:
  - Drift between `plugins/relay/.claude-plugin/plugin.json` and `documentation/changelog.html` (version-sync rule, 2026-04-30)
  - Documenting a feature that does not match the agents/commands actually shipped
- Applicable architectural rules:
  - `documentation/AGENTS.md` §7.5 binding contract: minor/major release → manifest bump in same commit
  - `documentation/changelog.html` follows Keep a Changelog convention
  - New decisions go in `docs/decisions.md` with the canonical four-field shape
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/tdd-writer-reviewer.prd.md` — Implementation Phases row 4: "Documentation + manifest bump v0.10.0" — Goal: complete the documentation surface and align the plugin manifest with the changelog per the 2026-04-30 version-sync rule — Success signal: documentation builds without dead links; plugin cache invalidates correctly on next install.

## Summary

Five surgical updates to align the documentation surface with the just-shipped B7/B8 + commands + `/relay-execute` integration: bump `plugin.json` to `0.10.0`; add a v0.10.0 changelog entry naming the four shipped artifacts and the orchestrator amendment; promote `/relay-tdd` and `/relay-tdd-review` to `badge--done` in `commands.html` with full notes; add detailed `tdd-writer` and `tdd-reviewer` sections to `agents.html` and remove from Planned table; append a 2026-05-06 entry to `docs/decisions.md` codifying that the TDD pair is the authorized mechanism for creating test files in the pipeline (R-X strict preserved).

## User Story

```
As a relay user installing v0.10.0
I want the documentation, command badges, agent reference, and changelog to reflect the just-shipped TDD pair
So that the cache invalidates correctly and the docs match what the commands actually do
```

## Problem Statement

Without Phase 4, users who pull v0.10.0 see commands documented as "opt-in placeholder" stubs and agents listed only in the Planned table — even though the implementations now exist. The plugin manifest still says `0.9.0`, so Claude Code's cache continues serving the v0.9.0 dead-code branch.

## Solution Statement

Five mechanical updates, each minimally invasive: bump `version` field in `plugin.json`; insert a v0.10.0 block at the top of `changelog.html` (after `Unreleased`); replace `badge--info opt-in` with `badge--done implemented` on the two TDD command headings + extend their notes blocks; add detailed `<h3>` sections for `tdd-writer` and `tdd-reviewer` in `agents.html` mirroring the `plan-writer`/`plan-reviewer` shape; remove the two TDD rows from the Planned table; append the 2026-05-06 decisions entry.

## Metadata

| Key | Value |
|---|---|
| Type | Documentation surface update + manifest version bump |
| Complexity | Low — five files, mechanical |
| Systems Affected | `plugins/relay/.claude-plugin/`, `documentation/`, `docs/decisions.md` |
| Dependencies | Phase 1 + Phase 2 + Phase 3 complete |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/tdd-writer-reviewer.prd.md:201` |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| HIGH | `documentation/changelog.html` | 31–55 | v0.9.0 entry shape — direct mirror for v0.10.0 |
| HIGH | `documentation/reference/agents.html` | 189–258, 372–373 | `plan-reviewer` shape (mirror for B8); `tdd-writer`/`tdd-reviewer` rows in Planned (to remove) |
| HIGH | `documentation/reference/commands.html` | 65–115 | Existing TDD command stubs (badge promotion + notes expansion) |
| HIGH | `plugins/relay/.claude-plugin/plugin.json` | 1–10 | Version bump target |
| MED | `docs/decisions.md` | 380-415 | 2026-04-30 plugin-manifest version-sync rule (precedent for new entry shape) |

## Patterns to Mirror

### # SOURCE: documentation/changelog.html:35-54 (v0.9.0 entry shape)

```
<h2 id="v0-X-Y">X.Y.Z — YYYY-MM-DD</h2>
<p>One-paragraph summary…</p>
<h3 id="v0-X-Y-added">Added</h3>
<ul><li>…</li></ul>
<h3 id="v0-X-Y-changed">Changed</h3>
<ul><li>…</li></ul>
```

Used by Task 2.

### # SOURCE: documentation/reference/agents.html:189 (plan-reviewer shipped section anchor)

```
<h3 id="plan-reviewer">plan-reviewer <span class="badge badge--done">shipped</span></h3>
```

Used by Task 3.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Version bump 0.9.0 → 0.10.0 (one-line diff) |
| `documentation/changelog.html` | UPDATE | New v0.10.0 entry below Unreleased |
| `documentation/reference/commands.html` | UPDATE | Promote `/relay-tdd` and `/relay-tdd-review` from `badge--info opt-in` to `badge--done implemented`; expand Notes |
| `documentation/reference/agents.html` | UPDATE | Add detailed `tdd-writer` and `tdd-reviewer` sections; remove from Planned table |
| `docs/decisions.md` | UPDATE | Append 2026-05-06 entry codifying R-X / B7 relationship |

## NOT Building (Scope Limits)

- **Phase 5 dogfood** — out-of-orchestrator; runs from external repos.
- **Search index regeneration** — none of the new content adds new pages or new top-level NAV entries; index regeneration is unnecessary.
- **`documentation/AGENTS.md` revision** — §7.5 already codifies the version-sync rule; no edit required.
- **`docs/api-reference.md` row promotion** — separate optional polish; not blocking the v0.10.0 ship.

## Step-by-Step Tasks

### Task 1: UPDATE plugin.json version 0.9.0 → 0.10.0

- **ACTION**: Edit `plugins/relay/.claude-plugin/plugin.json` to change `"version": "0.9.0"` to `"version": "0.10.0"`.
- **MIRROR**: 2026-04-30 plugin-manifest version-sync rule.
- **VALIDATE**: `grep -q '"version": "0.10.0"' plugins/relay/.claude-plugin/plugin.json && ! grep -q '"version": "0.9.0"' plugins/relay/.claude-plugin/plugin.json`

### Task 2: UPDATE changelog.html — add v0.10.0 entry

- **ACTION**: Insert a v0.10.0 block immediately after the `Unreleased` heading and update the Unreleased paragraph to reflect that the in-flight changes have been cut into v0.10.0. The new block names the four shipped artifacts (`tdd-writer.md`, `tdd-reviewer.md`, `relay-tdd.md`, `relay-tdd-review.md`), the synthetic fixture, the `/relay-execute` integration (Phase A.3.5 + new HALT code + new budget), and the manifest bump.
- **MIRROR**: `documentation/changelog.html:35-54` v0.9.0 entry shape.
- **VALIDATE**: `grep -q 'id="v0-10-0"' documentation/changelog.html && grep -q '0.10.0 — 2026-05-06' documentation/changelog.html`

### Task 3: UPDATE commands.html — promote TDD commands

- **ACTION**: Replace `<span class="badge badge--info">opt-in</span>` with `<span class="badge badge--done">implemented</span>` on the `/relay-tdd` heading (line 69) and `/relay-tdd-review` heading (line 107). Expand the Notes blocks to describe shipped behavior: `/relay-tdd` self-skip semantics; `/relay-tdd-review` rubric ids + R-RED-LEGITIMATE hybrid + JSONL audit log path. Update line 203 (the planned-table TDD routing note) from "dead-code" to "shipped: TDD pair engaged in Phase A.3.5 of /relay-execute when tdd: true".
- **MIRROR**: `/relay-implement` and `/relay-code-review` badge-promotion pattern (already shipped in v0.8.0).
- **VALIDATE**: `! grep -q 'B7/B8 TDD pair is dead-code' documentation/reference/commands.html && test 2 -le $(grep -c 'badge--done">implemented</span>' documentation/reference/commands.html)`

### Task 4: UPDATE agents.html — add B7/B8 sections; remove from Planned

- **ACTION**: Add `<h3 id="tdd-writer">` and `<h3 id="tdd-reviewer">` sections in the shipped agents area, mirroring the `plan-reviewer` / `code-reviewer` shape (kv-block: Path / Model / Color / Tools / Invoked by / Responsibility / Never). Remove the two `tdd-writer` and `tdd-reviewer` rows from the Planned table (lines 372–373).
- **MIRROR**: `documentation/reference/agents.html:189-258` (plan-reviewer + code-reviewer shipped sections).
- **VALIDATE**: `grep -q 'id="tdd-writer"' documentation/reference/agents.html && grep -q 'id="tdd-reviewer"' documentation/reference/agents.html && ! grep -E '<tr><td><code>tdd-(writer|reviewer)</code>' documentation/reference/agents.html`

### Task 5: UPDATE docs/decisions.md — append 2026-05-06 entry

- **ACTION**: Append a new `## [2026-05-06] TDD pair is the authorized mechanism for creating test files in the autonomous pipeline (R-X strict preserved)` entry following the canonical four-field shape (Context / Decision / Reason / Areas affected). The entry codifies: B7 is the only agent authorized to create test files; R-X strict (D17 of `implementation-authoring.prd.md`) is preserved verbatim; `/relay-execute` Phase A.3.5 with `max_tdd_review_retries=2` budget; HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`; relay-execute.prd.md D5 superseded.
- **MIRROR**: `docs/decisions.md` 2026-04-30 plugin-manifest version-sync entry shape.
- **VALIDATE**: `grep -q '\[2026-05-06\] TDD pair is the authorized mechanism' docs/decisions.md`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```sh
test -f plugins/relay/.claude-plugin/plugin.json
python -c "import json; json.load(open('plugins/relay/.claude-plugin/plugin.json'))"  # JSON parse
echo "L1 PASS"
```

### Level 2 — CONTENT_INVARIANTS

```sh
grep -q '"version": "0.10.0"' plugins/relay/.claude-plugin/plugin.json
grep -q 'id="v0-10-0"' documentation/changelog.html
grep -q 'id="tdd-writer"' documentation/reference/agents.html
grep -q 'id="tdd-reviewer"' documentation/reference/agents.html
! grep -q 'B7/B8 TDD pair is dead-code' documentation/reference/commands.html
grep -q '\[2026-05-06\]' docs/decisions.md
echo "L2 PASS"
```

### Level 3 — DRY-RUN END-TO-END

```sh
# All Phase 4 deliverables intersect; this is a "files modified" cross-check
git status --short | awk '$2~/^(plugins\/relay\/\.claude-plugin\/plugin\.json|documentation\/(changelog|reference\/(commands|agents))\.html|docs\/decisions\.md)$/{c++} END{exit !(c>=4)}'
echo "L3 PASS"
```

## Acceptance Criteria

- **AC-A1 (PRD MoSCoW Must — manifest bump):** `plugin.json` version is `0.10.0` exactly.
- **AC-A2 (PRD MoSCoW Must — changelog):** `changelog.html` carries an `id="v0-10-0"` block with the release date 2026-05-06.
- **AC-A3 (PRD MoSCoW Must — commands.html):** both `/relay-tdd` and `/relay-tdd-review` carry `badge--done implemented` and the dead-code note is removed.
- **AC-A4 (PRD MoSCoW Must — agents.html):** detailed `<h3 id="tdd-writer">` and `<h3 id="tdd-reviewer">` sections present; both removed from Planned table.
- **AC-A5 (PRD MoSCoW Should — decisions.md):** new `[2026-05-06]` entry appended codifying the R-X / B7 relationship.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Changelog format drifts from Keep-a-Changelog convention | L | L | Mirror v0.9.0 entry verbatim |
| agents.html Planned table mutation breaks unrelated rows | M | M | Remove only the two named rows by full-line `old_string` |
| decisions.md entry malformed (missing one of four fields) | L | M | Mirror 2026-04-30 entry shape verbatim |
| Cache invalidation skipped because plugin.json unchanged | L | H | Task 1 explicit; L2 grep confirms |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Out-of-scope polish:** `docs/api-reference.md` row promotions for `/relay-tdd` and `/relay-tdd-review`, search-index regeneration, NAV menu updates — none required because no new pages are added.

*Generated: 2026-05-06*
*Approved: 2026-05-06*
*Implemented: 2026-05-06*
*Status: IMPLEMENTED*
