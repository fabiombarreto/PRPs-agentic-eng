# Feature: Canonical docs (Phase 2 of relay-qa-report-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: modifies cross-cutting canonical documentation (`docs/api-reference.md` + `docs/context/architecture.md`); adds a new command role category (QA / Support) to the api-reference taxonomy; touches the shared command-count invariant that must stay consistent across both doc surfaces; docs-only phase — no source code, no new command file, no `documentation/` rendered site, no `plugin.json` bump
- Decisions found:
  - 2026-04-19 Command surface — one command per stage; writer/reviewer split only for non-deterministic authoring. `/relay-qa-report` is a single LLM-judgment command with NO writer/reviewer pair, so the docs must not describe a reviewer half. (`docs/decisions.md:188-239`)
  - 2026-04-19 PRP artifacts live under `PRPs/`, never `.claude/` — this phase edits only `docs/` canonical files and writes its DRAFT plan under `PRPs/plans/`; no `.claude/` writes. (`docs/decisions.md:261-266`)
  - 2026-04-25 Plan filenames carry the source PRD phase number and slug — this plan itself follows `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`. (`docs/decisions.md:279-284`)
  - 2026-05-?? (v0.17.0 `/relay-approve` release) command-count-bump precedent — the prior 13→14 bump updated exactly `docs/api-reference.md` + `docs/context/architecture.md` (plus a `decisions.md` entry); those two canonical files are the only command-count anchors. (`docs/decisions.md:641` "Areas affected")
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md:61-67`) — the two edited files live under `docs/`; the plan lives under `PRPs/plans/`; nothing is written under `.claude/`.
  - Treating `plugins/prp-core/` as active relay code (`docs/anti-patterns.md:71-76`) — the QA / Support category documents only the relay `/relay-qa-report` command; no prp-core `/prp-*` command is cited as a relay feature.
- Applicable architectural rules:
  - One command per stage (`docs/context/architecture.md:113-135`) — the docs place `/relay-qa-report` as a new QA / Support command role, honestly reconciled against the four existing command-surface philosophy bullets.
  - Interactivity boundary — human gate before Pillar 3 (`docs/context/architecture.md:60-92`) — the happy-path / taxonomy note must position `/relay-qa-report` in the human validation gate between `/relay-execute` (Pillar 2) and Pillar 3, NOT inside the autonomous loop.
  - Command-count invariant (`docs/api-reference.md:17-19`; `docs/context/architecture.md:25,115`) — `docs/api-reference.md` and `docs/context/architecture.md` MUST agree on the count; both bump 14 → 15 in lockstep.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-qa-report-command.prd.md` — Implementation Phases row 2: "Canonical docs" — Goal: Reflect the new command in the tier-1/2 canonical docs — Success signal: api-reference lists `/relay-qa-report` under a "QA / Support" bucket; the command count is consistent across both files. (Source PRD is APPROVED; this plan back-fills row 2 `Status` → `in-progress` and populates its `PRP Plan` cell.)

## Summary

This phase updates the two tier-1/2 canonical documentation files so they reflect the `/relay-qa-report` command shipped in Phase 1. In `docs/api-reference.md` it inserts a new `#### QA / Support` role subsection (positioned in the human validation gate, between the Orchestrator and Pillar 3 buckets) carrying the `/relay-qa-report` `Command | Input | Output` row, and bumps the command count 14 → 15 in the `## Commands` intro (reconciling the parenthetical role breakdown so the arithmetic stays honest). In `docs/context/architecture.md` it bumps the same count in two places (the asset-type table's Commands row and the bold "**14 commands**" line in the Command surface section), adds a fifth command-surface philosophy point acknowledging the QA / Support human-gate role, and threads a `/relay-qa-report` mention into the happy-path arrow-chain's `(human validates + manual testing)` note. The approach is surgical `Edit`s anchored on the exact current wording, mirroring the doc shapes already in the files. No behavior, no command file, no rendered site, and no version bump change here.

## User Story

```
As the relay maintainer keeping the canonical docs truthful
I want docs/api-reference.md and docs/context/architecture.md to list /relay-qa-report under a QA / Support role and to report a consistent 15-command count
So that a reader of the tier-1/2 docs sees the human-gate QA command in the taxonomy and the two files never disagree on how many commands relay ships
```

## Problem Statement

Phase 1 shipped `plugins/relay/commands/relay-qa-report.md`, but the canonical docs still describe a 14-command surface with five role buckets (Writers / Reviewers / Infrastructure / Orchestrator / Pillar 3) and no QA / Support category. Until the docs are updated, `docs/api-reference.md` and `docs/context/architecture.md` under-report the command count and omit the new command from the role taxonomy and the happy-path note, so a reader cannot discover `/relay-qa-report` from the tier-1/2 docs and the two files are one command out of date. This phase's narrow scope is the canonical-docs slice of the source PRD's AC-10: the api-reference command table + count and the architecture count + taxonomy + happy-path note. The `documentation/` rendered site and the `plugin.json` bump (the other half of AC-10) are explicitly Phase 3.

## Solution Statement

Make surgical `Edit`s to the two files, anchored on their exact current wording:

- `docs/api-reference.md`: (1) insert a new `#### QA / Support` subsection with a `Command | Input | Output` table containing one `/relay-qa-report ✅ **implemented**` row, placed between `#### Orchestrator` and `#### Pillar 3` so the taxonomy order tracks the pipeline's human validation gate; (2) bump "14 commands" → "15 commands" and "All 14 commands" → "All 15 commands" in the `## Commands` intro, reconciling the parenthetical breakdown to account for the new non-pillar QA / Support command.
- `docs/context/architecture.md`: (1) bump "14 implemented" → "15 implemented" in the asset-type table Commands row and "**14 commands**" → "**15 commands**" in the Command surface heading; (2) add a fifth philosophy bullet documenting the QA / Support human-gate role; (3) extend the happy-path arrow-chain's `(human validates + manual testing)` parenthetical to name `/relay-qa-report`.

A Level 3 cross-file consistency check asserts both files agree on the 15-count and both mention `/relay-qa-report`, closing the docs-drift risk the PRD flags.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation (canonical tier-1/2 docs edit) |
| Complexity | Low |
| Systems Affected | `docs/api-reference.md` and `docs/context/architecture.md` (two existing files edited). No source executed; no runtime surface; no new file created. |
| Dependencies | Phase 1 (Command file) — `complete`. The command `plugins/relay/commands/relay-qa-report.md` must exist to be documented (row 2 `Depends` cell is `1`). No new dependencies. |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/relay-qa-report-command.prd.md` Implementation Phases row 2 (line 308); Phase Details "Phase 2: Canonical docs" lines 321-326 |
| phase_type | docs |

`phase_type: docs` — both changed files are `.md` canonical docs (`docs/api-reference.md`, `docs/context/architecture.md`); this repo declares `test_frameworks: []` and has no compiled application source, so the deliverable is validated by content-invariant `grep` + markdown structural checks, not by a test framework. This correctly routes `plan-reviewer` to exempt the framework-mismatch check for a docs-only deliverable.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| High | `PRPs/prds/relay-qa-report-command.prd.md` | 305-339 | Implementation Phases table (row 2) + Phase 2 Phase Details (Goal / Scope / Success signal) — the authoritative scope for this phase. |
| High | `docs/api-reference.md` | 15-33 | The `## Commands` intro carrying both count sentences ("14 commands organized by role…", "All 14 commands are now implemented") and the `### Happy path` block — the count-bump target and the happy-path format precedent. |
| High | `docs/api-reference.md` | 35-75 | The `#### Writers / Reviewers / Infrastructure / Orchestrator / Pillar 3` role subsections and the exact `Command | Input | Output` table + `✅ **implemented**` badge shape the new QA / Support row must match, and the insertion point (between Orchestrator L63-67 and Pillar 3 L69). |
| High | `docs/context/architecture.md` | 20-27 | The asset-type table whose Commands row cell reads "14 implemented (…); see `docs/api-reference.md`" — count anchor #2. |
| High | `docs/context/architecture.md` | 113-135 | The Command surface section: bold "**14 commands**" (L115), the four philosophy bullets (L118-130), and the happy-path arrow-chain with `(human validates + manual testing)` (L132-135) — count anchor #3, the taxonomy-bullet insertion site, and the happy-path note target. |
| Medium | `docs/context/architecture.md` | 60-92 | Interactivity boundary — "human gate before Pillar 3" — the source of truth for where `/relay-qa-report` sits (human validation gate, not the autonomous loop). |
| Medium | `docs/decisions.md` | 188-239, 261-266 | The command-surface (one-per-stage, writer/reviewer split) and PRPs/-artifact decisions the docs edits must remain consistent with. |

## Patterns to Mirror

```
# SOURCE: docs/api-reference.md:39-41
| Command | Input | Output |
|---------|-------|--------|
| `/relay-prd <description \| draft-path>` ✅ **implemented** | description, draft PRD markdown path, or no argument (opens with "What do you want to build?") | `PRPs/prds/<feature>.prd.md` with status `APPROVED`. Interactive — runs the 6-phase Q&A loop with the user, … |
```
Task 1 copies this exact table shape — the `| Command | Input | Output |` header, the `|---------|-------|--------|` divider, and the ` ✅ **implemented**` badge suffix on the command name cell — for the new `/relay-qa-report` row under the new `#### QA / Support` heading.

```
# SOURCE: docs/api-reference.md:17-19
14 commands organized by role (11 Pillar 1–2 plus `/relay-commit`,
`/relay-pr`, and `/relay-approve` as the three Pillar 3 commands, shipped
v0.14.0, v0.15.0, and v0.17.0). All 14 commands are now implemented;
```
Task 2 mirrors this exact wording to bump both counts (14 → 15) and reconcile the parenthetical so the breakdown still adds up once the non-pillar QA / Support command is included.

```
# SOURCE: docs/context/architecture.md:20-27
| Type | Folder | Purpose | Status |
|------|--------|---------|--------|
| Commands | `plugins/relay/commands/` | `/relay-*` slash commands users invoke. | 14 implemented (including `/relay-commit` v0.14.0, dual-mode since v0.16.0, `/relay-pr` v0.15.0, and `/relay-approve` v0.17.0); see `docs/api-reference.md` |
```
Task 3 edit (a) mirrors this asset-type table's Commands-row count cell ("14 implemented (…)") for the asset-table count bump; the bold "**14 commands**" prose Task 3 edit (b) touches is the separate snippet below.

```
# SOURCE: docs/context/architecture.md:113-130
Relay exposes **14 commands**, organized by role. Full
table and contracts in `docs/api-reference.md`; rationale in
`docs/decisions.md`. Summary of the philosophy:

- **One command per stage.** Every pipeline step has its own command so it
  can be invoked in isolation — for testing during Phase 2 implementation,
  and for manual intervention by the user between stages.
- **Writers and reviewers are split.** A reviewer accepts a hand-edited
  artifact as input. …
```
Task 3 mirrors the bold "**14 commands**" phrase for the count bump; Task 4 appends a fifth bullet in the same `- **Lead-in.** prose` shape used by the existing four philosophy bullets.

```
# SOURCE: docs/context/architecture.md:132-135
Happy path for day-to-day use: `/relay-prd` → `/relay-execute` →
(human validates + manual testing) → `/relay-commit` → `/relay-pr` →
(after merge) `/relay-approve`. Every intermediate command is there for
flexibility, not for routine use.
```
Task 4 mirrors this inline-parenthetical pattern — the established idiom for a human-validation-gate note — by extending `(human validates + manual testing)` to name `/relay-qa-report`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/api-reference.md` | UPDATE | Add the `#### QA / Support` role subsection with the `/relay-qa-report` command row (Task 1) and bump the command count 14 → 15 in the `## Commands` intro (Task 2) — the api-reference slice of source PRD AC-10. |
| `docs/context/architecture.md` | UPDATE | Bump the command count 14 → 15 in the asset-type table and the Command surface heading (Task 3), and add the QA / Support taxonomy bullet + `/relay-qa-report` happy-path note (Task 4) — the architecture slice of Phase 2's "count + taxonomy + happy-path" scope. |

## NOT Building (Scope Limits)

- **No `documentation/` rendered-site page and no three-file registration** — the NAV entry in `assets/js/app.js`, the `assets/data/search-index.json` entry, and the `changelog.html` entry are Phase 3 (source PRD Implementation Phases row 3).
- **No `plugins/relay/.claude-plugin/plugin.json` version bump** — the manifest version bump is Phase 3.
- **No change to `plugins/relay/commands/relay-qa-report.md`** — the command file is the Phase 1 deliverable (`complete`); this phase only documents it.
- **No dogfood run** — exercising `/relay-qa-report` to validate AC-4/AC-5/AC-6 is Phase 4.
- **No behavior change** — this phase adds no command, flag, or protocol; it edits prose and tables only.
- **No edits to other doc surfaces** — `README`, `docs/KNOWLEDGE_BASE.md`, and the rendered site are out of scope; the v0.17.0 count-bump precedent (`docs/decisions.md:641`) updated exactly these two canonical files, which are the command-count anchors.
- **No `decisions.md` entry authored by this phase** — recording the count bump in `docs/decisions.md` is the Docs Updater's post-merge job (`/relay-approve`), not a plan-writer/implementer task.

## Step-by-Step Tasks

### Task 1: UPDATE `docs/api-reference.md` — add the `#### QA / Support` role subsection + `/relay-qa-report` row

- **ACTION**: Insert a new role subsection between the `#### Orchestrator` block (ends at the `/relay-execute` row, ~line 67) and the `#### Pillar 3 (commit + PR + approval cycle)` heading (~line 69). The new subsection header is `#### QA / Support` (optionally with a parenthetical like "(human validation gate)"). Under it, emit a `| Command | Input | Output |` table with its `|---------|-------|--------|` divider and exactly one data row for `` `/relay-qa-report [<prd-path> | <plan-path> | <description> | (blank)]` `` ✅ **implemented**, whose Input cell describes the four-way routing (`.prd.md` → PRD mode / `.plan.md` → plan mode / free text → description mode / blank → uncommitted-diff mode) and whose Output cell describes the seven-field QA report written to `PRPs/reports/<feature>/qa-report.md`, the `FAILED_NOTHING_TO_REPORT` clean-tree HALT, and the anti-overwrite guard. Position between Orchestrator and Pillar 3 because the command lives in the human validation gate between Pillar 2 and Pillar 3.
- **AC**: PRD AC-10 → this plan's AC-A1 (the `#### QA / Support` category + `/relay-qa-report` row in `docs/api-reference.md`).
- **MIRROR**: `docs/api-reference.md:39-41` (the `Command | Input | Output` table header + divider + `✅ **implemented**` badge shape).
- **VALIDATE**: `grep -q '^#### QA / Support' docs/api-reference.md && grep -q '/relay-qa-report' docs/api-reference.md && grep -q 'PRPs/reports/<feature>/qa-report.md' docs/api-reference.md`

### Task 2: UPDATE `docs/api-reference.md` — bump command count 14 → 15 in the `## Commands` intro

- **ACTION**: In the `## Commands` intro paragraph (lines 17-22), change "14 commands organized by role" → "15 commands organized by role" and "All 14 commands are now implemented" → "All 15 commands are now implemented". Reconcile the parenthetical role breakdown so the arithmetic is honest — the current "(11 Pillar 1–2 plus `/relay-commit`, `/relay-pr`, and `/relay-approve` as the three Pillar 3 commands…)" describes 11+3=14; extend it to account for the new `/relay-qa-report` QA / Support command that is neither Pillar 1–2 nor Pillar 3 (e.g. "…plus the `/relay-qa-report` QA / Support command in the human validation gate").
- **AC**: PRD AC-10 → this plan's AC-A2 (command count 14 → 15 in the `docs/api-reference.md` `## Commands` intro).
- **MIRROR**: `docs/api-reference.md:17-19` (the exact count-sentence + parenthetical wording being edited).
- **VALIDATE**: `if grep -qE '\b14 commands\b' docs/api-reference.md; then echo "FAIL: stale '14 commands' still present"; exit 1; fi; grep -q '15 commands organized by role' docs/api-reference.md && grep -q 'All 15 commands are now implemented' docs/api-reference.md`

### Task 3: UPDATE `docs/context/architecture.md` — bump command count 14 → 15 (asset table + Command surface heading)

- **ACTION**: Two surgical edits. (a) In the asset-type table's Commands row (line 25), change the count cell "14 implemented (…)" → "15 implemented (…)" and extend the parenthetical to name `/relay-qa-report` (the QA / Support command shipped alongside the earlier Pillar 3 commands). (b) In the Command surface section (line 115), change "Relay exposes **14 commands**, organized by role." → "Relay exposes **15 commands**, organized by role." Do not touch any other "14" in the file (e.g. unrelated numeric references).
- **AC**: PRD AC-10 → this plan's AC-A3 (command count 14 → 15 in `docs/context/architecture.md`) and AC-A4 (cross-file count consistency between the two canonical files).
- **MIRROR**: `docs/context/architecture.md:20-27` (the asset-type table Commands-row count cell "14 implemented (…)") for edit (a); and `docs/context/architecture.md:113-130` (the bold "**14 commands**" phrase) for edit (b).
- **VALIDATE**: `if grep -qE '14 (implemented|commands)' docs/context/architecture.md; then echo "FAIL: stale 14-count still present in architecture.md"; exit 1; fi; grep -q '15 implemented' docs/context/architecture.md && grep -q '\*\*15 commands\*\*' docs/context/architecture.md`

### Task 4: UPDATE `docs/context/architecture.md` — QA / Support taxonomy bullet + `/relay-qa-report` happy-path note

- **ACTION**: Two surgical edits in the Command surface section. (a) Append a fifth philosophy bullet after the existing four (which end with "**Naming reuses prp-core where it exists.**" ~line 130), in the same `- **Lead-in.** prose` shape, documenting the QA / Support role — e.g. "**A QA / Support command sits in the human validation gate.** `/relay-qa-report` is invoked by the human between `/relay-execute` (Pillar 2) and Pillar 3 to enumerate per-case test coverage before manual testing; it is not part of the autonomous loop and is never called by `/relay-execute`." (b) In the happy-path arrow-chain (lines 132-135), extend the `(human validates + manual testing)` parenthetical to name the command, e.g. "(human validates + manual testing, aided by `/relay-qa-report`)".
- **AC**: PRD AC-10 → this plan's AC-A5 (position `/relay-qa-report` in the human validation gate via the taxonomy bullet + happy-path note in `docs/context/architecture.md`).
- **MIRROR**: `docs/context/architecture.md:132-135` (the inline `(human validates + manual testing)` human-validation-gate parenthetical) and `docs/context/architecture.md:118-130` (the `- **Lead-in.** prose` philosophy-bullet shape).
- **VALIDATE**: `n=$(grep -c '/relay-qa-report' docs/context/architecture.md); if [ "$n" -lt 2 ]; then echo "FAIL: expected >=2 /relay-qa-report mentions in architecture.md, got $n"; exit 1; fi; grep -q 'human validates + manual testing, aided by' docs/context/architecture.md; echo "PASS: $n mentions"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS (files present + markdown table structure intact)

```bash
set -euo pipefail
a=docs/api-reference.md
b=docs/context/architecture.md
test -f "$a" || { echo "FAIL: $a missing"; exit 1; }
test -f "$b" || { echo "FAIL: $b missing"; exit 1; }
# New QA / Support subsection is a valid h4 with a Command|Input|Output table divider following it
grep -q '^#### QA / Support' "$a" || { echo "FAIL: '#### QA / Support' heading absent"; exit 1; }
grep -q '^| Command | Input | Output |' "$a" || { echo "FAIL: Command|Input|Output header missing in $a"; exit 1; }
# No accidental markdown breakage: the file still starts with its H1
head -1 "$a" | grep -q '^# API Reference' || { echo "FAIL: $a H1 changed"; exit 1; }
head -1 "$b" | grep -q '^# Architecture' || { echo "FAIL: $b H1 changed"; exit 1; }
echo "PASS: static analysis"
```

### Level 2 — CONTENT_INVARIANTS (count bumped, no stale 14, new command documented)

```bash
set -euo pipefail
a=docs/api-reference.md
b=docs/context/architecture.md
# api-reference: no stale "14 commands"; both count sentences bumped to 15; new command present
if grep -qE '\b14 commands\b' "$a"; then echo "FAIL: stale '14 commands' in $a"; exit 1; fi
grep -q '15 commands organized by role' "$a" || { echo "FAIL: '15 commands organized by role' missing in $a"; exit 1; }
grep -q 'All 15 commands are now implemented' "$a" || { echo "FAIL: 'All 15 commands are now implemented' missing in $a"; exit 1; }
grep -q '/relay-qa-report' "$a" || { echo "FAIL: /relay-qa-report not documented in $a"; exit 1; }
# architecture: no stale 14-count; both anchors bumped to 15; new command present
if grep -qE '14 (implemented|commands)' "$b"; then echo "FAIL: stale 14-count in $b"; exit 1; fi
grep -q '15 implemented' "$b" || { echo "FAIL: '15 implemented' missing in $b"; exit 1; }
grep -q '\*\*15 commands\*\*' "$b" || { echo "FAIL: '**15 commands**' missing in $b"; exit 1; }
grep -q '/relay-qa-report' "$b" || { echo "FAIL: /relay-qa-report not mentioned in $b"; exit 1; }
echo "PASS: content invariants"
```

### Level 3 — INTEGRATION (cross-file count consistency; no .claude/ artifact paths introduced)

```bash
set -euo pipefail
a=docs/api-reference.md
b=docs/context/architecture.md
# Both canonical files must agree on the 15-command count (single-source-of-truth / no-drift invariant)
grep -q '15 commands' "$a" || { echo "FAIL: $a does not state a 15-command count"; exit 1; }
grep -q '15 commands' "$b" || { echo "FAIL: $b does not state a 15-command count"; exit 1; }
# Neither file may still assert a 14-command surface anywhere
if grep -rqE '\b14 commands\b|14 implemented' "$a" "$b"; then echo "FAIL: a residual 14-command assertion remains"; exit 1; fi
# The edits must not INTRODUCE a new .claude/PRPs artifact-path reference. Scope the check
# to lines this phase ADDED (git diff), because architecture.md legitimately documents
# prp-core's `.claude/PRPs/...` anti-pattern in a pre-existing line that is out of scope
# here — a blanket file grep would false-positive on that documentation string.
if git diff HEAD -- "$a" "$b" | grep -E '^\+[^+]' | grep -q '\.claude/PRPs'; then echo "FAIL: forbidden .claude/PRPs path introduced by this phase's edits"; exit 1; fi
echo "PASS: api-reference.md and architecture.md agree on 15 commands; no .claude/PRPs paths"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-10):** `/relay-qa-report` appears in `docs/api-reference.md` under a new `#### QA / Support` role category with a `Command | Input | Output` table row that names the four-way routing and the `PRPs/reports/<feature>/qa-report.md` output.
- **AC-A2 (PRD AC-10):** The `docs/api-reference.md` command count is bumped 14 → 15 in both count sentences of the `## Commands` intro, with no stale "14 commands" wording remaining and the parenthetical role breakdown reconciled to include the new QA / Support command.
- **AC-A3 (PRD AC-10):** The `docs/context/architecture.md` command count is updated 14 → 15 in both anchors — the asset-type table's Commands row ("15 implemented") and the Command surface heading ("**15 commands**") — with no stale 14-count remaining.
- **AC-A4 (PRD AC-10):** The command count is consistent across `docs/api-reference.md` and `docs/context/architecture.md` (both assert 15); the Level 3 cross-file check passes, satisfying the Phase 2 success signal "the command count is consistent across both files".
- **AC-A5 (PRD AC-10):** `docs/context/architecture.md` positions `/relay-qa-report` in the human validation gate — a QA / Support philosophy bullet in the Command surface section and a `/relay-qa-report` mention threaded into the happy-path `(human validates + manual testing)` note.

Note: source PRD AC-10 spans two phases. This phase delivers the canonical-docs slice (`docs/api-reference.md` command table + count; `docs/context/architecture.md` count + taxonomy + happy-path). The `documentation/` rendered reference page and its three-file registration (NAV + search index + changelog) — the other half of AC-10 — are delivered by Phase 3 and are out of scope here.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Docs drift — the count is bumped in one file but not the other, or a stale "14 commands" survives in a sentence the edit missed | Medium | Medium | Level 2 asserts no stale 14-count survives in either file; Level 3 asserts both files independently state a 15-command count (cross-file single-source-of-truth check per the docs-as-code no-duplicated-facts principle). |
| Parenthetical breakdown becomes internally inconsistent — "11 Pillar 1–2 + 3 Pillar 3" sums to 14, so a bare 14→15 swap on the headline number leaves the breakdown contradicting the total | Low | Medium | Task 2 explicitly reconciles the parenthetical to add the non-pillar QA / Support command, so the breakdown still reconciles to 15. |
| Over-broad edit — a global 14→15 replace touches an unrelated "14" (line count, version, date) | Low | Medium | Every task uses anchored `Edit`s on the exact surrounding phrase ("14 commands", "14 implemented", "**14 commands**"), and Task 3 explicitly scopes to the two count cells; no global replace is performed. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- Contextual note: the relay repo declares `test_frameworks: []`, so the test writer/reviewer pair self-skips for this docs-only feature regardless of the `tdd:` ordering flag. The Acceptance Criteria above are validated by the content-invariant `grep` checks in `## Validation Commands` and by dogfood inspection (source PRD Phase 4), consistent with `docs/context/methodology.md`.
- Placement rationale: the `#### QA / Support` subsection is inserted between `#### Orchestrator` and `#### Pillar 3` so the api-reference taxonomy order tracks the pipeline — `/relay-qa-report` runs in the human validation gate that sits between Pillar 2 (`/relay-execute`) and Pillar 3 (`/relay-commit`), matching the interactivity-boundary description at `docs/context/architecture.md:79-81`.
- Research note: `research-web` found no external precedent for a role/persona-based command-reference taxonomy (gh, kubectl group by resource/operation, not role) but did confirm the docs-as-code principle that duplicated facts (like a command count spread across two files) drift unless a single-source-of-truth or a consistency check guards them — which is exactly what the Level 3 cross-file check provides. This is a gap, not a blocker: relay's role-based taxonomy is an established local convention (Writers/Reviewers/Infrastructure/Orchestrator/Pillar 3), and this phase extends it.

*Generated: 2026-07-12*
*Approved: 2026-07-12*
*Implemented: 2026-07-12*
*Status: IMPLEMENTED*
