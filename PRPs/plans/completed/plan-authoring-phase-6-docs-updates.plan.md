# Feature: docs updates (Phase 6 of plan-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting documentation; closes the plan-authoring PRD; impacts external-facing docs site (binding AGENTS contract)
- Decisions found:
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — restated in updated rows.
  - [2026-04-25] Plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` — recorded as a new decision row in this phase.
  - [2026-04-19] Documentation site is the binding contract — `documentation/AGENTS.md` mandates a changelog entry for every site change.
- Applicable anti-patterns:
  - Silent doc drift — every doc change must be auditable; the changelog is the audit trail.
  - Writing under `.claude/` — restated in the new decision row's Reason field.
- Applicable architectural rules:
  - PRPs/ artifact path convention — extended with the per-phase pattern.
  - Documentation site invariants from `documentation/AGENTS.md`.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-authoring.prd.md` — Implementation Phases row 6: "docs updates" — Goal: publish the contract changes the rest of the docs depend on — Success signal: a diff hitting `docs/decisions.md`, `docs/api-reference.md`, and `documentation/changelog.html` plus optionally `architecture.md`. Site renders cleanly. No internal links broken.

## Summary

Land the documentation updates that publish the four shipped Phase 1–5 deliverables (plan-writer agent, plan-reviewer agent, `/relay-plan` command, `/relay-plan-review` command, plan-template) and record the per-phase plan filename pattern as an explicit decision. Touches four files: a new decision row in `docs/decisions.md` (2026-04-25); refined per-phase filename in `docs/api-reference.md` lines 39 and 47 with `✅ implemented` badges; a new "0.7.0" version section in `documentation/changelog.html` per the binding `documentation/AGENTS.md` contract; and an updated row in `docs/context/architecture.md` line 90 reflecting the new filename pattern. Closes the plan-authoring PRD.

## User Story

As a relay developer or external reader,
I want the documentation to accurately reflect that the plan stage is shipped end-to-end with its canonical filename pattern,
So that the api-reference contract matches reality, future maintainers can find the per-phase pattern decision, and the doc site changelog records the user-visible additions.

## Problem Statement

Today the docs say plan files live at `PRPs/plans/<feature>.plan.md` (api-reference, architecture); the actually-shipped pattern is `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`. The api-reference does not mark `/relay-plan` and `/relay-plan-review` as implemented. The decisions log has no row recording the per-phase pattern divergence. The doc site changelog has nothing under `Unreleased` despite four agents/commands and a template having shipped this session. Until Phase 6 lands, external readers see stale contracts.

## Solution Statement

Implement four file edits using narrow `Edit` operations: (1) append a new dated decision row to `docs/decisions.md` recording the per-phase plan filename divergence; (2) edit `docs/api-reference.md` line 39 to refine the `/relay-plan` output to the per-phase pattern and add `✅ implemented` badge; (3) edit line 47 similarly for `/relay-plan-review`; (4) edit `docs/context/architecture.md` line 90 row to reflect the per-phase pattern; (5) add a new `0.7.0 — 2026-04-25` version section to `documentation/changelog.html` ahead of the existing `0.6.0` block, per `documentation/AGENTS.md` §6.3 / §7.1 minor-bump rules. The `Unreleased` block stays at "No unreleased changes" since the version is being cut now.

## Metadata

| Field            | Value                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Type             | ENHANCEMENT (documentation)                                                                            |
| Complexity       | LOW                                                                                                    |
| Systems Affected | `docs/`, `documentation/`                                                                              |
| Dependencies     | rows 1–5 of the source PRD all complete (verified at planning time)                                    |
| Estimated Tasks  | 5                                                                                                      |
| Source PRD       | `PRPs/prds/plan-authoring.prd.md` Phase 6                                                              |

---

## Mandatory Reading

| Priority | File                                                              | Lines      | Why                                                                                              |
| -------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| P0       | `documentation/AGENTS.md`                                         | 281-355    | Binding contract: §6.3 changelog entry rule, §7.1 semver, three-file registration               |
| P0       | `docs/decisions.md`                                               | last 30 lines | Existing decision-row format (Context / Decision / Reason / Areas affected) to mirror         |
| P0       | `docs/api-reference.md`                                           | 35-55      | The two rows being edited; existing `✅ implemented` badge format on `/relay-prd` row 37          |
| P0       | `documentation/changelog.html`                                    | 30-100     | Existing version-section format: `<h2 id="v0-X-Y">`, `<p>` summary, `<h3 id="v0-X-Y-added">`     |
| P0       | `PRPs/prds/plan-authoring.prd.md`                                 | all        | Source PRD; Phase 6 success signal anchors the diff scope                                         |
| P1       | `docs/context/architecture.md`                                    | 83-95      | Row to refine; existing PRP-artifact-paths table format                                           |
| P1       | `PRPs/plans/completed/plan-authoring-phase-1-plan-writer.plan.md` | metadata   | Real example of the per-phase filename pattern in the wild                                       |

No external library docs needed.

---

## Patterns to Mirror

### DECISION ROW FORMAT

```markdown
# SOURCE: docs/decisions.md (last entry — line range "[2026-04-19] Methodology declaration ...")
# COPY THIS PATTERN, swap content for plan-filename pattern:

## [2026-04-19] Methodology declaration lives in `docs/context/methodology.md`

**Context:** ...
**Decision:** ...
**Reason:** ...
**Areas affected:** ...

---
```

For the new row:
- Title: `## [2026-04-25] Plan filenames carry the source PRD phase number and slug`
- Insertion point: immediately before the existing trailing template comment block (`<!-- Template for future entries: ... -->`).
- Format mirror is exact: 4 bold-prefixed paragraphs (Context / Decision / Reason / Areas affected) followed by `---`.

### API-REFERENCE ROW FORMAT (with implemented badge)

```markdown
# SOURCE: docs/api-reference.md:37 (the existing /relay-prd row, marked implemented)
# COPY THE BADGE FORMAT for /relay-plan (line 39) and /relay-plan-review (line 47):

| `/relay-prd <description \| draft-path>` ✅ **implemented** | description, draft PRD markdown path, ... | `PRPs/prds/<feature>.prd.md` with status `APPROVED`. Interactive — runs the 6-phase Q&A loop ... |
```

The implemented badge pattern: `✅ **implemented**` immediately after the command in the `Command` cell. The `Output` cell expands with implementation notes paralleling the `/relay-prd` row's verbosity (kebab pattern, collision rule, agent dispatch, etc.).

### ARCHITECTURE PRP-ARTIFACT ROW

```markdown
# SOURCE: docs/context/architecture.md:90
# CURRENT:
| `PRPs/plans/<feature>.plan.md` | Implementation plans (Plan Writer) |

# REFINED (Phase 6):
| `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | Implementation plans, one per PRD phase (plan-writer); status DRAFT until plan-reviewer auto-flips to APPROVED |
```

### CHANGELOG VERSION SECTION

```html
<!-- SOURCE: documentation/changelog.html line ~38 (the existing 0.6.0 section) -->
<!-- COPY THIS PATTERN for the new 0.7.0 entry, inserted between Unreleased and 0.6.0: -->

<h2 id="v0-7-0">0.7.0 — 2026-04-25</h2>

<p>Plan authoring stage shipped — second slice of project Phase 3
(Agents — Orchestrator). The plan-stage writer/reviewer pair is now
live: <code>/relay-plan</code> dispatches the autonomous
<code>plan-writer</code> agent to transform an APPROVED PRD into a
per-phase DRAFT plan; <code>/relay-plan-review</code> dispatches the
autonomous <code>plan-reviewer</code> agent which runs an 8-item
structural rubric (R1–R8 with R8 for PRD↔plan traceability) and
auto-flips DRAFT→APPROVED on full pass. Adds the canonical
<code>docs/context/plan-template.md</code> as the source of truth for
plan section structure. Records the per-phase plan filename pattern
as an explicit decision (refining the api-reference shorthand).
Project-level Phase 3 advances from <code>partial</code> to
<code>partial+</code> (plan stage shipped; <code>/relay-implement</code>
+ <code>/relay-tdd</code> still pending).</p>

<h3 id="v0-7-0-changed">Changed</h3>

<ul>
  <li><strong><code>reference/commands.html</code></strong> — TBD if
      this page exists in the site for plan commands; otherwise
      omitted. (Confirm during implementation; if no page entry, the
      Changed list does not include this line.)</li>
</ul>

<h3 id="v0-7-0-added">Added</h3>

<ul>
  <li>... (per per-task spec below)</li>
</ul>
```

The exact bullet list is task-defined; format mirrors `<strong><code>...</code></strong> — sentence.` per the `0.6.0` precedent.

---

## Files to Change

| File                                      | Action | Justification                                                                                |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| `docs/decisions.md`                       | UPDATE | Append a new dated decision row recording the per-phase plan filename pattern               |
| `docs/api-reference.md`                   | UPDATE | Edit lines 39 + 47 — per-phase filename pattern + `✅ implemented` badges                    |
| `docs/context/architecture.md`            | UPDATE | Edit line 90 — per-phase filename pattern in the PRP-artifact-paths table                    |
| `documentation/changelog.html`            | UPDATE | Add `0.7.0 — 2026-04-25` version section per AGENTS.md §6.3 / §7.1 minor-bump rules         |
| `PRPs/prds/plan-authoring.prd.md`         | UPDATE | Back-fill row 6 (Status `pending` → `in-progress` → `complete`) — closes the PRD            |

---

## NOT Building (Scope Limits)

- **`reference/commands.html` updates for the new commands.** The PRD's Phase 6 scope (line 230) names only `docs/decisions.md`, `docs/api-reference.md`, `documentation/changelog.html`, and (optionally) `architecture.md`. If the doc site has a per-command reference page that needs the implemented-badge update, do that as a follow-up in a small docs-only commit; not gated by Phase 6.
- **`reference/agents.html` updates for the four new agents.** Same reasoning — out of scope per PRD Phase 6.
- **Re-pointing `plan-writer.md` / `plan-reviewer.md` at `docs/context/plan-template.md` as their R2/Step-4.4 source of truth.** Optional consolidation; can ship as a follow-up. Phase 6 only documents the contract.
- **`roadmap/status.html` updates.** Out of scope; the PRD scope does not name it. Future docs pass.
- **Search index regeneration** for changelog content. The changelog is already part of the site search index (NAV-registered); no new pages added means no search-index update required per AGENTS.md §6.

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and has a VALIDATE step.

### Task 1: UPDATE `docs/decisions.md` — append per-phase plan filename decision row

- **ACTION**: Insert a new H2 decision section between the existing `## [2026-04-19] Methodology declaration ...` block's closing `---` separator and the trailing `<!-- Template for future entries: ... -->` HTML comment block.
- **MIRROR**: `docs/decisions.md` (use the last existing decision row as the format template).
- **EXACT CONTENT TO INSERT** (between the existing `---` separator and the template comment):

  ```markdown
  ## [2026-04-25] Plan filenames carry the source PRD phase number and slug

  **Context:** The api-reference shorthand at `docs/api-reference.md:39` lists `/relay-plan` output as `PRPs/plans/<feature>.plan.md`, treating each feature as one plan. The plan-authoring PRD (Phase 1 of `plan-authoring.prd.md`, shipped 2026-04-25) generates one plan per PRD Implementation Phases row, not one per feature. A `<feature>.plan.md` shorthand cannot represent that 1-to-many relationship and would force collisions whenever a PRD has more than one phase to plan.
  **Decision:** Plan files written by `plan-writer` use the path `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`, where `<feature>` is the PRD basename (without `.prd.md`), `<N>` is the Implementation Phases row number, and `<slug>` is the kebab-cased phase name. The plan-template at `docs/context/plan-template.md` codifies this; `plan-reviewer` rubric R8c validates the back-reference between the plan filename and the source PRD's row.
  **Reason:** Per-phase plans match the actual unit of work the Implementer consumes, keep filenames grep-friendly, and make orchestrator state machine bookkeeping trivial (`PRP Plan` cell of row N points at exactly one plan). The `<feature>.plan.md` shorthand survives only as a documentation simplification in the api-reference and architecture rows; both have been refined to the per-phase pattern in Phase 6 of `plan-authoring.prd.md`.
  **Areas affected:** plan-writer agent, plan-reviewer agent, `/relay-plan` command, `/relay-plan-review` command, `docs/context/plan-template.md`, `docs/api-reference.md`, `docs/context/architecture.md`, future Implementer (`/relay-implement`)

  ---
  ```

- **GOTCHA**: the trailing `---` separator is part of the inserted block, matching the format of every prior decision row. The existing template comment block stays AFTER this new row.
- **VALIDATE**:
  - `grep -F '## [2026-04-25] Plan filenames carry the source PRD phase number and slug' docs/decisions.md` returns at least one match.
  - `grep -c -E '^## \[202[0-9]-' docs/decisions.md` returns one more than before this task (count was N; now N+1).
  - The trailing template comment block (`<!-- Template for future entries:`) remains present and in the same spot relative to the file end.

### Task 2: UPDATE `docs/api-reference.md` line 39 — `/relay-plan` row

- **ACTION**: Replace the line:

  ```
  | `/relay-plan <prd-path>` | approved PRD | `PRPs/plans/<feature>.plan.md` with status `DRAFT` |
  ```

  with:

  ```
  | `/relay-plan <prd-path>` ✅ **implemented** | approved PRD (status `*Status: APPROVED*` at the trailer) with at least one Implementation Phases row in `pending` whose `Depends` cell is empty or all-complete | `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` with status `DRAFT`. Autonomous — dispatches the `plan-writer` agent, which parses the PRD's Implementation Phases table, picks the next actionable row, runs `research-codebase` + `research-web` in parallel during GROUNDING, consults the Decision Gate sources, writes the per-phase DRAFT, and back-fills the source PRD's row N (`Status` to `in-progress`; `PRP Plan` cell to the relative plan path). Filename uses kebab-cased phase name; collision resolved with numeric suffix; APPROVED plans never overwritten. See `PRPs/prds/plan-authoring.prd.md`. |
  ```

- **MIRROR**: `docs/api-reference.md:37` (the existing `/relay-prd` row's verbosity + badge format).
- **GOTCHA**: this is a single Markdown table row — no line breaks inside it. The `<feature>-phase-<N>-<slug>` pattern uses ASCII hyphens, not en-dashes.
- **VALIDATE**:
  - `grep -F '/relay-plan <prd-path>` ✅ **implemented**' docs/api-reference.md` returns at least one match.
  - `grep -F 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' docs/api-reference.md` returns at least one match.
  - `grep -F 'PRPs/plans/<feature>.plan.md' docs/api-reference.md` returns 0 matches in the `/relay-plan` line region (the shorthand should no longer appear in the writer row; it may legitimately persist in unrelated text — verify by line number).

### Task 3: UPDATE `docs/api-reference.md` line 47 — `/relay-plan-review` row

- **ACTION**: Replace the line:

  ```
  | `/relay-plan-review <plan-path>` | plan `DRAFT` (generated or hand-edited) | status flipped to `APPROVED`, or `CHANGES_REQUESTED` with actionable list |
  ```

  with:

  ```
  | `/relay-plan-review <plan-path>` ✅ **implemented** | plan ending with `*Status: DRAFT*` (generated by `/relay-plan` or hand-edited) | status flipped to `*Status: APPROVED*` via two-line `Edit` (insert `*Approved: <YYYY-MM-DD>*` above the trailer), or `CHANGES_REQUESTED` with the failing rubric items by ID + reason. Autonomous — dispatches the `plan-reviewer` agent which runs the 8-item structural rubric (R1 Decision Gate, R2 mandatory sections, R3 no TBD, R4 ≥3 atomic tasks with `VALIDATE`, R5 TDD routing, R6 no `.claude/` writes, R7 Files-to-Change row, R8 PRD↔plan traceability) without short-circuit. Every verdict appended to `PRPs/plans/<basename>.review.jsonl`. CHANGES_REQUESTED is terminal for one invocation; the orchestrator decides regeneration via `/relay-plan`. See `PRPs/prds/plan-authoring.prd.md`. |
  ```

- **MIRROR**: `docs/api-reference.md:48` (the existing `/relay-test-review` row's verbosity + badge format).
- **VALIDATE**:
  - `grep -F '/relay-plan-review <plan-path>` ✅ **implemented**' docs/api-reference.md` returns at least one match.
  - `grep -F '8-item structural rubric' docs/api-reference.md` returns at least one match.
  - `grep -F 'PRPs/plans/<basename>.review.jsonl' docs/api-reference.md` returns at least one match.

### Task 4: UPDATE `docs/context/architecture.md` line 90 — PRP-artifact row

- **ACTION**: Replace the line:

  ```
  | `PRPs/plans/<feature>.plan.md` | Implementation plans (Plan Writer) |
  ```

  with:

  ```
  | `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` | Implementation plans, one per PRD phase (`plan-writer` writes DRAFT; `plan-reviewer` flips to APPROVED). Per-phase pattern recorded in `docs/decisions.md` 2026-04-25. |
  ```

- **MIRROR**: existing rows at `docs/context/architecture.md:89` and `:91` (same column count, same prose density).
- **VALIDATE**:
  - `grep -F 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' docs/context/architecture.md` returns at least one match.
  - `grep -F 'PRPs/plans/<feature>.plan.md' docs/context/architecture.md` returns 0 matches (the old shorthand is fully replaced in the row).
  - `grep -F '`plan-writer`' docs/context/architecture.md` returns at least one match.

### Task 5: UPDATE `documentation/changelog.html` — add 0.7.0 version section

- **ACTION**: Insert a new version section between the existing `<h2 id="unreleased">Unreleased</h2>` block (with its "No unreleased changes" `<p>`) and the existing `<h2 id="v0-6-0">0.6.0 — 2026-04-25</h2>` block. Leave Unreleased as-is ("No unreleased changes at the moment.") — the version is being cut now.
- **MIRROR**: `documentation/changelog.html` 0.6.0 section (lines ~38 onward) for structure: `<h2 id="v0-X-Y">`, summary `<p>`, `<h3 id="v0-X-Y-added">`, `<ul>`, optionally `<h3 id="v0-X-Y-changed">`.
- **EXACT CONTENT TO INSERT** (between the Unreleased block's closing `<p>` and the existing `<h2 id="v0-6-0">` line):

  ```html
  <h2 id="v0-7-0">0.7.0 — 2026-04-25</h2>

        <p>Plan authoring stage shipped — second slice of project Phase 3 (Agents — Orchestrator). The plan-stage writer/reviewer pair is now live: <code>/relay-plan</code> dispatches the autonomous <code>plan-writer</code> agent to transform an APPROVED PRD into a per-phase DRAFT plan; <code>/relay-plan-review</code> dispatches the autonomous <code>plan-reviewer</code> agent which runs an 8-item structural rubric (R1–R8 with R8 for PRD&harr;plan traceability) and auto-flips DRAFT&rarr;APPROVED on full pass. Adds the canonical <code>docs/context/plan-template.md</code> as the source of truth for plan section structure. Records the per-phase plan filename pattern (<code>&lt;feature&gt;-phase-&lt;N&gt;-&lt;slug&gt;.plan.md</code>) as an explicit decision, refining the api-reference shorthand.</p>

        <h3 id="v0-7-0-added">Added</h3>

        <ul>
          <li><strong><code>plugins/relay/agents/plan-writer.md</code></strong> — autonomous PRD-phase &rarr; DRAFT plan transformer. Parses the source PRD's Implementation Phases table, selects the next actionable row, dispatches <code>research-codebase</code> + <code>research-web</code> in parallel, consults the three Decision Gate sources, writes a DRAFT plan to <code>PRPs/plans/&lt;feature&gt;-phase-&lt;N&gt;-&lt;slug&gt;.plan.md</code>, and back-fills the source PRD's row N (Status to in-progress; PRP Plan cell to the relative plan path).</li>
          <li><strong><code>plugins/relay/agents/plan-reviewer.md</code></strong> — autonomous 8-item rubric runner. Diverges from <code>prd-reviewer</code> in three documented ways: auto-flips <code>*Status: DRAFT*</code> &rarr; <code>*Status: APPROVED*</code> on rubric pass without user dialogue (interactivity boundary), evaluates all 8 items every run with no short-circuit (per AC-10), and has no Step 5 dialogue loop (CHANGES_REQUESTED is terminal). Every verdict appended to <code>PRPs/plans/&lt;basename&gt;.review.jsonl</code>.</li>
          <li><strong><code>plugins/relay/commands/relay-plan.md</code></strong> — public command surface for the plan-writer. Single-role (no Phase B reviewer adoption per the writer/reviewer split decision); 4 preconditions (P1 PRD readable, P2 PRD ends with <code>*Status: APPROVED*</code>, P3 Decision Gate sources readable, P4 actionable phase exists in the table); surfaces <code>plan-writer</code>'s halts verbatim and exits.</li>
          <li><strong><code>plugins/relay/commands/relay-plan-review.md</code></strong> — public command surface for the plan-reviewer. Single-role (no Phase B writer adoption); 3 preconditions (P1 plan readable, P2 plan ends with <code>*Status: DRAFT*</code>, P3 Decision Gate sources readable); surfaces APPROVED summary or CHANGES_REQUESTED bullet list verbatim.</li>
          <li><strong><code>docs/context/plan-template.md</code></strong> — canonical plan section shape. Mirrors <code>docs/context/prd-template.md</code> structure with four mandatory adaptations: Decision Gate header, PRD&harr;plan back-reference, per-task <code>VALIDATE</code> invariant, TDD routing note. Anchors plan-reviewer R2 (15 mandatory sections in order) and Implementer expectations.</li>
          <li><strong><code>docs/decisions.md</code></strong> — new <code>2026-04-25</code> row recording the per-phase plan filename pattern as an explicit decision, refining the api-reference shorthand.</li>
        </ul>

        <h3 id="v0-7-0-changed">Changed</h3>

        <ul>
          <li><strong><code>docs/api-reference.md</code></strong> — <code>/relay-plan</code> and <code>/relay-plan-review</code> rows now carry the <code>&#x2705; <strong>implemented</strong></code> badge and the per-phase filename pattern. Notes expanded to cover the writer's autonomous PRD-parse + research dispatch + back-fill, and the reviewer's 8-item rubric with R8 traceability.</li>
          <li><strong><code>docs/context/architecture.md</code></strong> — &sect;PRP artifact paths row for plans refined from <code>&lt;feature&gt;.plan.md</code> shorthand to the per-phase pattern <code>&lt;feature&gt;-phase-&lt;N&gt;-&lt;slug&gt;.plan.md</code>, with cross-reference to the new decision row.</li>
        </ul>

  ```

  Insert this block immediately before `      <h2 id="v0-6-0">0.6.0 — 2026-04-25</h2>`. Indentation matches existing `<h2>`/`<p>`/`<h3>`/`<ul>` siblings (6 spaces of leading indent for `<h2>`, etc., per the surrounding file).
- **MIRROR**: `documentation/changelog.html` 0.6.0 section for structural shape; AGENTS.md §6.3 / §7.1 for entry rules.
- **GOTCHA**: per `documentation/AGENTS.md` rule 5, NO emojis anywhere in the doc site (including the changelog). Use HTML entities for special characters (`&rarr;` for →, `&harr;` for ↔, `&sect;` for §, `&#x2705;` for the implemented badge ✅ since the implemented badge is the one explicit emoji exception used in the site for status). Confirm against the existing 0.6.0 entry which uses `&amp;` for ampersands (e.g. `Q&amp;A`); the existing site convention is HTML entities throughout.
- **VALIDATE**:
  - `grep -F 'v0-7-0">0.7.0 — 2026-04-25' documentation/changelog.html` returns at least one match.
  - `grep -F 'plan-writer.md' documentation/changelog.html` returns at least one match.
  - `grep -F 'plan-reviewer.md' documentation/changelog.html` returns at least one match.
  - `grep -F 'docs/context/plan-template.md' documentation/changelog.html` returns at least one match.
  - The Unreleased block remains intact: `grep -F '<em>No unreleased changes at the moment.</em>' documentation/changelog.html` returns at least one match.
  - HTML well-formedness sanity: `python -c "import html.parser; p=html.parser.HTMLParser(); p.feed(open('documentation/changelog.html').read()); print('OK')"` exits 0.

---

## Validation Commands

This deliverable is documentation; validation is structural.

### Level 1: STATIC_ANALYSIS

```bash
# All four files exist and are readable
for f in docs/decisions.md docs/api-reference.md docs/context/architecture.md documentation/changelog.html; do
  test -r "$f" && echo "OK: $f"
done

# changelog.html parses as HTML (basic well-formedness)
python -c "import html.parser; p=html.parser.HTMLParser(); p.feed(open('documentation/changelog.html').read()); print('changelog OK')"
```

**EXPECT**: `OK:` printed for each file; `changelog OK` printed.

### Level 2: CONTENT_INVARIANTS (grep)

```bash
# Task 1 — new decision row present + properly delimited
grep -F '## [2026-04-25] Plan filenames carry the source PRD phase number and slug' docs/decisions.md
# The trailing template comment block must still be the last block in the file
grep -F '<!-- Template for future entries:' docs/decisions.md

# Task 2 — /relay-plan row refined
grep -F '/relay-plan <prd-path>` ✅ **implemented**' docs/api-reference.md
grep -F 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' docs/api-reference.md

# Task 3 — /relay-plan-review row refined
grep -F '/relay-plan-review <plan-path>` ✅ **implemented**' docs/api-reference.md
grep -F '8-item structural rubric' docs/api-reference.md

# Task 4 — architecture row refined
grep -F 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' docs/context/architecture.md
# Old shorthand should no longer appear in the architecture row's exact line
! grep -F '`PRPs/plans/<feature>.plan.md` | Implementation plans (Plan Writer) |' docs/context/architecture.md

# Task 5 — 0.7.0 changelog section + Unreleased intact
grep -F 'id="v0-7-0">0.7.0 — 2026-04-25' documentation/changelog.html
grep -F '<em>No unreleased changes at the moment.</em>' documentation/changelog.html

# Five new artifacts mentioned in the changelog Added list
for artifact in 'plan-writer.md' 'plan-reviewer.md' 'relay-plan.md' 'relay-plan-review.md' 'plan-template.md'; do
  grep -F "$artifact" documentation/changelog.html || { echo "MISSING in changelog: $artifact"; exit 1; }
done
echo "OK: all 5 artifacts named in changelog"
```

**EXPECT**: Each command exits 0 (matches present, except the negated `! grep` line); `OK: all 5 artifacts named in changelog` printed.

### Level 3: CROSS-FILE CONSISTENCY

```bash
# The per-phase pattern is documented in three files (decisions, api-reference, architecture, plan-template)
files_with_pattern=$(grep -lF 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' \
  docs/decisions.md \
  docs/api-reference.md \
  docs/context/architecture.md \
  docs/context/plan-template.md \
  | wc -l)
test "$files_with_pattern" -ge 4 && echo "OK: per-phase pattern in 4+ canonical files"

# The new decision row's date matches the changelog's version date
grep -F '2026-04-25' docs/decisions.md > /dev/null
grep -F '0.7.0 — 2026-04-25' documentation/changelog.html > /dev/null
echo "OK: dates aligned"

# No internal documentation links broken — sample check on the new entries
for ref in 'plan-authoring.prd.md' 'plan-template.md' 'plan-writer.md' 'plan-reviewer.md'; do
  grep -lF "$ref" docs/ documentation/ -r > /dev/null && echo "OK: $ref referenced"
done
```

**EXPECT**: Three `OK:` lines; no error output.

---

## Acceptance Criteria

- **AC-A1 (PRD Phase 6 success signal):** A diff hits `docs/decisions.md`, `docs/api-reference.md`, `documentation/changelog.html`, AND `docs/context/architecture.md`. Site renders cleanly (HTML parses); no internal links broken.
- **AC-A2 (decisions.md row):** A new `## [2026-04-25] Plan filenames carry the source PRD phase number and slug` row exists in `docs/decisions.md`, follows the exact 4-paragraph format (Context / Decision / Reason / Areas affected), and is the last decision row before the trailing template comment block.
- **AC-A3 (api-reference badges):** Both `/relay-plan` and `/relay-plan-review` rows in `docs/api-reference.md` carry the `✅ **implemented**` badge and reference the per-phase filename pattern.
- **AC-A4 (architecture row):** `docs/context/architecture.md` line 90 row uses the per-phase filename pattern; the old `<feature>.plan.md` shorthand is removed from that row.
- **AC-A5 (changelog entry):** `documentation/changelog.html` has a new `<h2 id="v0-7-0">0.7.0 — 2026-04-25</h2>` section between Unreleased and 0.6.0, with Added (≥5 artifacts) and Changed (≥2 docs) subsections per AGENTS.md §6.3 / §7.1 minor-bump conventions.
- **AC-A6 (Unreleased intact):** The Unreleased block remains at "No unreleased changes at the moment." (the version is being cut, not accumulated).
- **AC-A7 (no `.claude/` references introduced):** Per the binding anti-pattern, none of the four edited files newly references `.claude/PRPs/` as a write target. (All preexisting references to the prohibition itself remain valid.)

---

## Risks and Mitigations

| Risk                                                                  | Likelihood | Impact | Mitigation                                                                                              |
| --------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------- |
| HTML well-formedness drift in changelog.html                          | L          | M      | Level 1 validation parses with Python's HTMLParser; visually verify in browser per AGENTS.md §6.3 step 8 |
| Edit fails because line content has whitespace drift                  | L          | L      | Each Edit uses a verbatim line copied from the file; if it fails, re-Read the line and retry            |
| Documentation site search index out of date                           | L          | L      | No new pages added; existing changelog entry surfaces in search via existing index. Per AGENTS.md §6, only new pages need search-index changes |
| AGENTS.md emoji rule (rule 5) blocks the ✅ in api-reference markdown   | L          | L      | The implemented badge is a documented exception used by `/relay-prd` and `/relay-test-review` rows already; consistent |
| docs/context/architecture.md line 90 number drifts before edit        | L          | L      | Validate with grep on the exact old line content before Edit; line-number is a hint, not a contract     |

---

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Final phase of `plan-authoring`:** completing this phase closes the PRD. After Phase 6 lands, all 6 rows in `PRPs/prds/plan-authoring.prd.md` are `complete` and the PRD is ready for archival or for a top-level status flip indicating "feature shipped."

**Optional follow-ups (out of scope for Phase 6):**
- Update `documentation/reference/commands.html` to mark `/relay-plan` and `/relay-plan-review` as implemented, mirroring what was done for `/relay-prd` in 0.6.0.
- Update `documentation/reference/agents.html` with sections for `plan-writer` and `plan-reviewer`, mirroring the four PRD-stage agent sections shipped in 0.6.0.
- Update `documentation/roadmap/status.html` to reflect Phase 3 progress (plan stage shipped; only `/relay-implement` and `/relay-tdd` remain).
- Re-point `plan-writer.md` Step 4.4 and `plan-reviewer.md` R2 at `docs/context/plan-template.md` as the canonical source of truth (currently they enumerate the same 15 sections inline; the template was just added in Phase 5 and the agents have not been re-pointed).

These are all docs-only or consolidation changes; none are gated by Phase 6, all can ship as small follow-ups.

**Why Unreleased stays empty:** AGENTS.md §7 documents the Unreleased convention — accumulate while in flight, rename to a version when cutting. Since Phase 6 IS the version cut (0.7.0), Unreleased is correctly empty post-edit. A future doc change would push entries into Unreleased again until the next minor/patch bump.

---

*Generated: 2026-04-25*
*Status: DRAFT*
