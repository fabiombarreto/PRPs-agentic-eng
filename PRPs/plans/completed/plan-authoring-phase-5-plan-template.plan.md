# Feature: docs/context/plan-template.md (Phase 5 of plan-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting documentation; canonical contract anchor for plan-reviewer R2; bidirectional surface with the PRD's PRP Plan column
- Decisions found:
  - [2026-04-19] PRP artifact paths under `PRPs/`, never `.claude/` — template's "Output path" section names this convention.
  - [2026-04-19] Methodology declaration — TDD routing note in plan body reads `tdd:` from `docs/context/methodology.md`.
  - [2026-04-25] Plan filename pattern `<feature>-phase-<N>-<slug>.plan.md` (PRD Decisions Log row).
  - [2026-04-25] Section count: 15 mandatory plan sections (`## Source PRD` prefix + 14 body sections), reconciled against the PRD's "14 mandatory" wording during plan-reviewer Phase 2.
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md:60-66`; template restates the prohibition.
  - Treating `plugins/prp-core/` as active relay code — template's provenance line names `prp-plan.md` as reference-only.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — plans live between PRD-APPROVED and Implementer.
  - PRPs/ artifact path convention.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-authoring.prd.md` — Implementation Phases row 5: "docs/context/plan-template.md" — Goal: canonical, versioned plan shape — Success signal: Reviewer's R2 passes only when the plan's section order matches this template byte-for-byte (modulo content).

## Summary

Create `docs/context/plan-template.md` — the canonical, versioned shape every plan produced by `plan-writer` must conform to. Mirrors the structure of `docs/context/prd-template.md` (provenance note + relay adaptations + output path + body structure + lifecycle) but adapted for plans: 15 mandatory sections (`## Source PRD` prefix + 14 body sections), per-phase filename pattern, the PRD↔plan back-reference contract, and the "every Step-by-Step task carries a `VALIDATE:` line" invariant. The file is purely documentation — it has no executable behavior; its consumers are `plan-writer` (assembles plans against this) and `plan-reviewer` (R2 enforces section order against this).

## User Story

As a relay maintainer (and as the plan-writer/plan-reviewer agents),
I want a single canonical document specifying the exact plan shape,
So that the writer has one source of truth to mirror and the reviewer's R2 rubric has a fixed contract to validate against — independent of agent prose drift.

## Problem Statement

Today the plan structure lives in three places: `plan-writer.md` Step 4.4 (the writer's assembly contract), `plan-reviewer.md` R2 (the reviewer's enforcement list), and the shipped Phase 1/3/4 plans (de-facto examples). When section ordering drifts in any of these, the others silently break. Without a canonical template, the writer/reviewer pair has no third-party arbiter and the "14 mandatory sections" wording in the PRD has no concrete referent.

## Solution Statement

Implement a single markdown documentation file (`docs/context/plan-template.md`) following the proven `docs/context/prd-template.md` shape: a top-level title and provenance note, a "Relay adaptations" block calling out the additions over upstream `prp-plan.md`, an Output path note, a fenced Plan-body structure block listing all 15 sections in order with placeholder content, and a Lifecycle note explaining who consumes the template at each stage. Sections inside the fenced block use `{placeholder}` markers consistent with `prd-template.md`'s style. The file is the `plan-reviewer` R2 source-of-truth.

## Metadata

| Field            | Value                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| Type             | NEW_CAPABILITY (documentation artifact)                                              |
| Complexity       | LOW                                                                                  |
| Systems Affected | `docs/context/`; consumed by `plan-writer` Step 4.4 and `plan-reviewer` R2           |
| Dependencies     | none — independent phase, no agent/command dispatch                                  |
| Estimated Tasks  | 4                                                                                    |
| Source PRD       | `PRPs/prds/plan-authoring.prd.md` Phase 5                                            |

---

## Mandatory Reading

| Priority | File                                                              | Lines    | Why                                                                                          |
| -------- | ----------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| P0       | `docs/context/prd-template.md`                                    | 1-225    | Pattern to MIRROR — provenance, relay adaptations, output-path, body block, lifecycle        |
| P0       | `plugins/relay/agents/plan-writer.md`                             | Step 4.4 | The writer's section assembly list; the template MUST match section-for-section              |
| P0       | `plugins/relay/agents/plan-reviewer.md`                           | R2       | The reviewer's enforcement list; same 15 sections in same order                              |
| P0       | `PRPs/prds/plan-authoring.prd.md`                                 | all      | Source PRD; AC-1 mandates "14 mandatory sections in order" — reconciled here as 15 with prefix |
| P1       | `plugins/prp-core/commands/prp-plan.md`                           | 358-693  | Upstream reference; provenance citation. The relay template adapts (drops UX, tightens scope) |
| P1       | `PRPs/plans/completed/plan-authoring-phase-1-plan-writer.plan.md` | all      | Real DRAFT plan that conforms — sanity-check the template against it                         |
| P2       | `docs/anti-patterns.md`                                           | 60-66    | `.claude/` prohibition — template's Output path restates it                                  |

No external library docs needed.

---

## Patterns to Mirror

### TOP-LEVEL STRUCTURE

```markdown
# SOURCE: docs/context/prd-template.md:1-14
# COPY THIS PATTERN, adapting feature name and provenance:

# Plan Template

Canonical shape of every plan produced in the `relay` pipeline. Stored at
`PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.

**Provenance:** adapted from `plugins/prp-core/commands/prp-plan.md` (the
canonical plan-shape reference). Relay drops the UX Before/After ASCII
section (no UI surface), constrains the agent contract to Validation
Levels 1–3 (Levels 4–6 are per-project content if applicable, not part
of the fixed structure), and adds three mandatory extensions
documented below.

**Keeping the fork in sync:** when the upstream template evolves, update
this file or record a conscious divergence in `docs/decisions.md`. Do
not let upstream changes propagate silently.
```

### RELAY ADAPTATIONS BLOCK

```markdown
# SOURCE: docs/context/prd-template.md:16-39
# COPY THIS PATTERN, swapping PRD-specific items for plan-specific items.

## Relay adaptations (mandatory extensions)

1. **Decision Gate evidence header.** Before the plan body begins, the
   plan-writer MUST consult `docs/decisions.md`, `docs/anti-patterns.md`,
   and `docs/context/architecture.md` per `docs/decision-gate.md`, and
   emit the evidence block as a fenced code block at the top of the
   plan file. A plan without this block fails plan-reviewer R1.

2. **PRD↔plan back-reference.** Every plan opens with a `## Source PRD`
   section that names the source PRD path and the row number being
   planned. Symmetrically, the plan-writer back-fills the source PRD's
   Implementation Phases row N (`Status` cell from `pending` to
   `in-progress`; `PRP Plan` cell to the relative plan path). This
   bidirectional surface is the orchestrator's single source of truth
   for phase progress. plan-reviewer R8 enforces both directions.

3. **Per-task VALIDATE invariant.** Every entry under `## Step-by-Step
   Tasks` MUST contain a `VALIDATE:` line followed by a non-empty
   command. The section MUST contain at least 3 such tasks.
   plan-reviewer R4 enforces.

4. **TDD routing note.** Every plan includes a short note in the
   `## Notes` section that reads the current value of `tdd` from
   `docs/context/methodology.md` and emits one of three byte-exact
   strings sourced from `plugins/relay/agents/prd-writer.md` Step 7.4
   (lines 382–386). plan-reviewer R5 enforces byte-equality.
```

### OUTPUT PATH BLOCK

```markdown
# SOURCE: docs/context/prd-template.md:41-47
# COPY THIS PATTERN, adapting filename pattern.

## Output path

`PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`

Where:
- `<feature>` is the source PRD's basename (without the `.prd.md`
  suffix).
- `<N>` is the Implementation Phases row number being planned.
- `<slug>` is a kebab-cased version of the row's `Phase` cell.

Directory is created if it doesn't exist. NEVER write under
`.claude/` — see `docs/anti-patterns.md` and `docs/decisions.md` on
the PRP artifact path convention. plan-reviewer R6 enforces.

This refines the api-reference shorthand `<feature>.plan.md`; the
per-phase pattern is recorded as a deliberate divergence in
`PRPs/prds/plan-authoring.prd.md` Decisions Log (and is propagated
into `docs/api-reference.md` via Phase 6 of the PRD).
```

### PLAN BODY — STRUCTURE BLOCK

```markdown
# SOURCE: docs/context/prd-template.md:51-209
# ADAPT: 15 sections instead of PRD's section list; drop UX section;
# anchor placeholder content on the actual plan-writer Step 4.4 spec.

## Plan body — structure

Sections appear in this exact order. Empty sections are marked
`TBD - needs validation` rather than filled with filler. plan-reviewer
R2 enforces the order; R3 enforces no-TBD in mandatory fields.

`# Feature: {Phase Name} (Phase {N} of {feature})`

Decision Gate evidence block (fenced; first fenced block below the
title; six required lines per Step 3.2 of `plan-writer.md`).

Then in order:

1. `## Source PRD` — bullet pointing at the PRD path + row N + Goal +
   Success signal. plan-reviewer R8a verifies the file exists and is
   APPROVED.

2. `## Summary` — one paragraph: what the phase delivers and the
   high-level approach.

3. `## User Story` — `As a {user} / I want {action} / So that {benefit}`.

4. `## Problem Statement` — narrowed from the PRD's Problem Statement
   to the phase's scope.

5. `## Solution Statement` — narrowed to the phase's scope.

6. `## Metadata` — table: Type, Complexity, Systems Affected,
   Dependencies, Estimated Tasks, Source PRD line ref.

7. `## Mandatory Reading` — table of files (priority, path, lines, why)
   drawn from research-codebase findings + the PRD's Phase Details.

8. `## Patterns to Mirror` — at least one snippet per architectural
   anchor identified by research-codebase. Every snippet header is
   `# SOURCE: <path>:<line-range>` followed by the copy-pasted code.
   plan-reviewer R3 fails any TBD in this section.

9. `## Files to Change` — table: file, action (CREATE / UPDATE /
   DELETE), justification. At least one row (R7).

10. `## NOT Building (Scope Limits)` — bullets explicitly excluded
    from this phase, drawn from the PRD's "What We're NOT Building"
    filtered to the phase's scope.

11. `## Step-by-Step Tasks` — at least 3 atomic tasks (R4). Each task:
    - `### Task <i>: <ACTION> <file>` heading
    - `**ACTION**:` line
    - `**MIRROR**:` line referencing a Patterns-to-Mirror anchor
    - `**VALIDATE**:` line followed by a non-empty shell command

12. `## Validation Commands` — Levels 1–3 only:
    - **Level 1 STATIC_ANALYSIS** (lint / type-check / markdown-lint /
      YAML parse, depending on the phase's deliverable).
    - **Level 2 CONTENT_INVARIANTS** or **UNIT_TESTS** (`grep` checks
      for prompt-only deliverables; framework tests for code
      deliverables).
    - **Level 3 INTEGRATION** or **DRY-RUN END-TO-END**.
    Levels 4–6 are NOT part of the fixed agent contract; include them
    only if the phase's deliverable genuinely needs them.

13. `## Acceptance Criteria` — bulleted list. Every bullet must
    reference at least one PRD `AC-N` it derives from (R8b). Format:
    `**AC-A<i> (PRD AC-<N>):** <statement>`.

14. `## Risks and Mitigations` — table with at least one row when the
    PRD's Technical Risks intersect this phase. Otherwise: a single
    note row.

15. `## Notes` — free-form. The TDD routing note (item 4 above) lives
    here. Other notes (color choices for agents, dogfood
    opportunities, divergence callouts) are also fine.

The plan ends with a trailing two-line block:

```
*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```

`plan-reviewer` flips this trailer to:

```
*Generated: <YYYY-MM-DD>*
*Approved: <YYYY-MM-DD>*
*Status: APPROVED*
```
```

### LIFECYCLE BLOCK

```markdown
# SOURCE: docs/context/prd-template.md:213-225
# ADAPT: name the actual relay components, mark all as shipped
# (post-Phase-4) where relevant.

## Lifecycle — where this template is consumed

1. **`/relay-plan` command + `plan-writer` agent** (Phases 1 & 3 of
   `plan-authoring`, complete) — read the source PRD, dispatch
   research subagents, consult the Decision Gate, assemble a DRAFT
   plan against this template, write to
   `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`, back-fill the
   source PRD's row N.

2. **`/relay-plan-review` command + `plan-reviewer` agent** (Phases 2
   & 4 of `plan-authoring`, complete) — load the DRAFT, run the 8-item
   rubric (R2 enforces this template's section order), auto-flip
   `*Status: DRAFT*` → `*Status: APPROVED*` on full pass, append every
   verdict to `PRPs/plans/<basename>.review.jsonl`.

3. **Implementer** (downstream, future `/relay-implement`) — consumes
   the APPROVED plan, executes the Step-by-Step Tasks in order, runs
   the Validation Commands at Levels 1–3.

4. **Test Runner** (`/relay-test`, shipped) — exercises the
   implementation against tests; the post-green reviewer
   (`/relay-test-review`) catches regressions.

After plan approval, the pipeline runs autonomously per
`docs/context/architecture.md` §Interactivity boundary.
```

---

## Files to Change

| File                                              | Action | Justification                                                            |
| ------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `docs/context/plan-template.md`                   | CREATE | The Phase 5 deliverable — canonical plan shape                           |
| `PRPs/prds/plan-authoring.prd.md`                 | UPDATE | Back-fill row 5 (Status `pending` → `in-progress` → `complete`)          |

---

## NOT Building (Scope Limits)

- **`docs/decisions.md` row recording per-phase plan path divergence.** Phase 6 of the PRD.
- **`docs/api-reference.md` refinement** — Phase 6.
- **`documentation/changelog.html` entry** — Phase 6.
- **Editing `plan-writer.md` or `plan-reviewer.md`** to point at this template — they already enumerate the same sections inline; the template becomes the canonical reference but agents do not need to be re-pointed in this phase. (The PRD Phase 5 success signal speaks of "byte-for-byte match" — that is enforced by R2's identical section list, not by changing agent prose.)
- **Validating existing shipped plans against the new template.** Plans #1–#4 were written before this template existed; if they conform (which they do, since `plan-writer` Step 4.4 already enumerates the same 15 sections), nothing to do. If a future audit finds drift, that is a fix-forward task, not Phase 5.
- **External-facing documentation site update.** The `documentation/` HTML mirror is out of scope here (Phase 6 docs updates handle the changelog).

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and has a VALIDATE step.

### Task 1: CREATE `docs/context/plan-template.md` skeleton (title + provenance + relay adaptations)

- **ACTION**: Create the file with the top-level `# Plan Template` heading, the Canonical-shape paragraph, the Provenance paragraph, the Keeping-the-fork-in-sync paragraph, and the four-item "Relay adaptations" block.
- **MIRROR**: `docs/context/prd-template.md:1-39`
- **DEVIATIONS FROM prd-template**:
  - Provenance cites `prp-core/commands/prp-plan.md` (not the PRD upstream).
  - Relay adaptations are 4 items: Decision Gate, PRD↔plan back-reference, per-task VALIDATE invariant, TDD routing note. (PRD template has 3 because it does not have a back-reference contract or per-task VALIDATE.)
- **VALIDATE**: `head -1 docs/context/plan-template.md` returns `# Plan Template`; `grep -c "^## Relay adaptations" docs/context/plan-template.md` returns `1`; `grep -c -E "^[0-9]+\. \*\*" docs/context/plan-template.md` returns at least `4` (the four adaptation items).

### Task 2: ADD Output path block

- **ACTION**: Append the Output path section per the snippet above. Document the per-phase filename pattern and the `<feature>` / `<N>` / `<slug>` decomposition; restate the `.claude/` prohibition; cite the api-reference divergence.
- **MIRROR**: `docs/context/prd-template.md:41-47`
- **VALIDATE**: `grep -F 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' docs/context/plan-template.md` returns at least one match; `grep -F '.claude/' docs/context/plan-template.md` returns at least one match (the prohibition).

### Task 3: ADD Plan body — structure block (15 sections)

- **ACTION**: Append the Plan-body section with the title-line + Decision-Gate-block placeholder + 15 numbered section descriptors as in the PLAN BODY snippet above.
- **MIRROR**: `docs/context/prd-template.md:51-209` for the fenced-block style and the placeholder discipline.
- **DEVIATIONS FROM prd-template**:
  - 15 sections (Source PRD prefix + 14 body sections), not the PRD's list.
  - Drops the UX Before/After ASCII section (relay features have no UI).
  - Validation Commands explicitly Levels 1–3 only; Levels 4–6 are per-project content.
  - Step-by-Step Tasks discipline: every task must contain `VALIDATE:` + non-empty command (R4 anchor).
  - Trailing status block: `*Generated:*` + `*Status: DRAFT*`; reviewer flip adds `*Approved:*`.
- **GOTCHA**: section count is **15**, not 14. The PRD's "14 mandatory sections" wording (lines 70, 206) refers to the 14 body sections AFTER the Source PRD prefix. Document this reconciliation in a small note inside the body block (matches plan-reviewer's R2 prose).
- **VALIDATE**:
  - `grep -cE "^[0-9]+\. \`## " docs/context/plan-template.md` returns at least `15` (the numbered section list).
  - `grep -F "Source PRD" docs/context/plan-template.md` returns at least one match.
  - `grep -F "Step-by-Step Tasks" docs/context/plan-template.md` returns at least one match.
  - `grep -F "VALIDATE" docs/context/plan-template.md` returns at least one match.
  - `grep -F "*Status: DRAFT*" docs/context/plan-template.md` returns at least one match.

### Task 4: ADD Lifecycle section

- **ACTION**: Append the Lifecycle section per the snippet above. Name the four consumer stages: `/relay-plan` + `plan-writer`, `/relay-plan-review` + `plan-reviewer`, Implementer (future `/relay-implement`), Test Runner (`/relay-test`, shipped). Mark each with its current status (complete / future).
- **MIRROR**: `docs/context/prd-template.md:213-225`
- **VALIDATE**:
  - `grep -F "## Lifecycle" docs/context/plan-template.md` returns at least one match.
  - `grep -F "/relay-plan-review" docs/context/plan-template.md` returns at least one match.
  - `grep -F "Implementer" docs/context/plan-template.md` returns at least one match.
  - `grep -F "Test Runner" docs/context/plan-template.md` returns at least one match.

---

## Validation Commands

This deliverable is documentation; validation is structural.

### Level 1: STATIC_ANALYSIS (markdown lint, basic shape)

```bash
F=docs/context/plan-template.md
# File exists and is readable
test -r "$F"
# Top-level heading is correct
test "$(head -1 $F)" = "# Plan Template"
# No null bytes / binary content
file "$F" | grep -F "ASCII text\|UTF-8 Unicode text"
```

**EXPECT**: Each command exits 0.

### Level 2: CONTENT_INVARIANTS (grep)

```bash
F=docs/context/plan-template.md

# Mandatory top-level sections
grep -c -E "^## (Relay adaptations|Output path|Plan body|Lifecycle)" "$F"
# EXPECT: 4 (one for each)

# Per-phase filename pattern
grep -F 'PRPs/plans/<feature>-phase-<N>-<slug>.plan.md' "$F"

# .claude/ prohibition restated
grep -F '.claude/' "$F"

# 15 numbered sections in the body block (Source PRD + 14 body)
grep -cE '^[0-9]+\. `## ' "$F"
# EXPECT: at least 15

# Step-by-Step Tasks named, VALIDATE keyword named
grep -F 'Step-by-Step Tasks' "$F"
grep -F 'VALIDATE' "$F"

# Status trailer block
grep -F '*Status: DRAFT*' "$F"

# Lifecycle names the relay components
grep -F '/relay-plan' "$F"
grep -F '/relay-plan-review' "$F"
grep -F 'Implementer' "$F"
grep -F 'Test Runner' "$F"

# Provenance cites prp-plan.md (reference-only)
grep -F 'prp-plan.md' "$F"

# TDD routing source-of-truth pointer
grep -E 'prd-writer\.md.*Step 7\.4' "$F" || grep -F '382' "$F"
```

**EXPECT**: Each command exits 0 (matches present).

### Level 3: CONFORMANCE WITH plan-writer / plan-reviewer

```bash
F=docs/context/plan-template.md
W=plugins/relay/agents/plan-writer.md
R=plugins/relay/agents/plan-reviewer.md

# Sanity: each section name in the template's body block also appears
# in the writer's Step 4.4 and the reviewer's R2.
for section in "Source PRD" "Summary" "User Story" "Problem Statement" \
               "Solution Statement" "Metadata" "Mandatory Reading" \
               "Patterns to Mirror" "Files to Change" "NOT Building" \
               "Step-by-Step Tasks" "Validation Commands" \
               "Acceptance Criteria" "Risks and Mitigations" "Notes"; do
  grep -qF "$section" "$F" || { echo "MISSING in template: $section"; exit 1; }
  grep -qF "$section" "$W" || { echo "MISSING in writer: $section"; exit 1; }
  grep -qF "$section" "$R" || { echo "MISSING in reviewer: $section"; exit 1; }
done
echo "OK: all 15 sections cross-referenced"

# Sanity: a real shipped plan still conforms to the template's section
# list (use Phase 1's archived plan).
P=PRPs/plans/completed/plan-authoring-phase-1-plan-writer.plan.md
for section in "Source PRD" "Summary" "User Story" "Problem Statement" \
               "Solution Statement" "Metadata" "Mandatory Reading" \
               "Patterns to Mirror" "Files to Change" "NOT Building" \
               "Step-by-Step Tasks" "Validation Commands" \
               "Acceptance Criteria" "Risks and Mitigations" "Notes"; do
  grep -qF "$section" "$P" || { echo "MISSING in shipped plan: $section"; exit 1; }
done
echo "OK: shipped plan conforms"
```

**EXPECT**: Both loops print their `OK:` line; no `MISSING` errors.

---

## Acceptance Criteria

- **AC-A1 (PRD Phase 5 success signal):** `docs/context/plan-template.md` exists and lists the 15 mandatory plan sections in exact order matching `plan-writer.md` Step 4.4 and `plan-reviewer.md` R2.
- **AC-A2 (PRD AC-6 / template restates):** The template's Output path section names `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` and explicitly forbids `.claude/`.
- **AC-A3 (Relay adaptations clarity):** The Relay adaptations block enumerates four items: Decision Gate header, PRD↔plan back-reference, per-task VALIDATE invariant, TDD routing note. Each names the corresponding plan-reviewer rubric item (R1, R8, R4, R5).
- **AC-A4 (Lifecycle accuracy):** The Lifecycle section names the four consumer stages by their actual relay component names (`/relay-plan` + `plan-writer`, `/relay-plan-review` + `plan-reviewer`, future `/relay-implement` Implementer, shipped `/relay-test` Test Runner).
- **AC-A5 (Conformance):** Phase 1's shipped plan (`plan-authoring-phase-1-plan-writer.plan.md`) contains all 15 section names. (This validates that the template captures reality, not a wish.)

---

## Risks and Mitigations

| Risk                                                                            | Likelihood | Impact | Mitigation                                                                                              |
| ------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Template diverges from `plan-writer.md` Step 4.4 over time                      | M          | M      | Level-3 conformance check loops cross-grep all 15 section names across template + writer + reviewer     |
| `plan-reviewer` R2 references the writer's prose instead of this template       | L          | L      | Out of scope here; future small change can re-point R2 at this file. R2's section list already matches  |
| 14-vs-15 section-count confusion in PRD prose lines 70, 206                     | M          | L      | Template documents the reconciliation explicitly; PRD Phase 6 docs pass can update wording if desired   |
| Documentation site (`documentation/AGENTS.md`) requires changelog entry         | —          | —      | Out of scope — Phase 6 of the PRD owns the changelog entry per the binding `documentation/AGENTS.md`     |
| Provenance citation drifts when prp-core upstream changes                       | L          | L      | "Keeping the fork in sync" paragraph names `docs/decisions.md` as the divergence record                 |

---

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Why no agent or command file in this phase:** Phase 5 is documentation-only. The new template is consumed by `plan-writer` and `plan-reviewer` (both already shipped) but does not require those agents to be re-edited in this phase — they enumerate the same sections inline today, and a future small consolidation can re-point them at `docs/context/plan-template.md` as the source of truth. That re-pointing is not gated by Phase 5 and can ship as part of Phase 6 docs updates.

**Cross-check with Phase 1 plan:** the shipped `plan-authoring-phase-1-plan-writer.plan.md` already contains all 15 sections (it predates the template by happenstance because `plan-writer` Step 4.4 enumerates them). Level-3 validation closes the loop and confirms no drift.

**Phase 6 dependency:** with Phase 5 complete, the PRD has rows 1–5 done. Phase 6 (docs updates) becomes actionable: `docs/decisions.md` row, `docs/api-reference.md` refinement, `documentation/changelog.html` entry, and optional pointer in `docs/context/architecture.md`.

---

*Generated: 2026-04-25*
*Status: DRAFT*
