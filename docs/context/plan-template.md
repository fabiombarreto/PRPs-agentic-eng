# Plan Template

Canonical shape of every plan produced in the `relay` pipeline. Stored at
`PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.

**Provenance:** adapted from `plugins/prp-core/commands/prp-plan.md` (the
canonical plan-shape reference). Relay drops the UX Before/After ASCII
section (relay features have no UI surface), constrains the agent
contract to Validation Levels 1–3 (Levels 4–6 are per-project content if
applicable, not part of the fixed structure), and adds six mandatory
extensions documented below.

**Keeping the fork in sync:** when the upstream template evolves, update
this file or record a conscious divergence in `docs/decisions.md`. Do
not let upstream changes propagate silently. `plugins/prp-core/` is a
reference directory, not active relay code (per the 2026-04-19
command-surface decision).

---

## Relay adaptations (mandatory extensions)

1. **Decision Gate evidence header.** Before the plan body begins, the
   `plan-writer` agent MUST consult `docs/decisions.md`,
   `docs/anti-patterns.md`, and `docs/context/architecture.md` per
   `docs/decision-gate.md`, and emit the evidence block as a fenced
   code block immediately below the plan title. A plan without this
   block fails plan-reviewer R1.

2. **Source reference (dual-branch).** Every plan opens with a
   `## Source` section. In **PRD mode** (the standard case), this
   section names the source PRD path and the row number being
   planned. Symmetrically, the `plan-writer` back-fills the source
   PRD's Implementation Phases row N (`Status` cell from `pending`
   to `in-progress`; `PRP Plan` cell to the relative plan path).
   This bidirectional surface is the orchestrator's single source of
   truth for phase progress. plan-reviewer R8 enforces both
   directions (R8a source PRD exists and is APPROVED; R8b every
   plan AC-A item references a real PRD AC-N; R8c source PRD's row N
   is `in-progress`/`complete` with this plan's path in its `PRP
   Plan` cell). In **description mode** (PRD-less plans, per
   `/relay-plan PRD-less mode`), the `## Source` section holds the
   verbatim feature description instead of a PRD path; no back-fill
   is attempted; plan-reviewer detects description mode by the absence
   of a `.prd.md` reference in the section body and emits R8a/R8b/R8c
   as `passed: true` with explicit rationale (see R8 description-mode
   variant in `plugins/relay/agents/plan-reviewer.md`).

3. **Per-task VALIDATE invariant.** Every entry under
   `## Step-by-Step Tasks` MUST contain a `VALIDATE:` line followed
   by a non-empty command (on the same line or the immediately
   following line). The section MUST contain at least 3 such tasks.
   plan-reviewer R4 enforces.

4. **TDD routing note.** Every plan includes a short note in the
   `## Notes` section that reads the current value of `tdd` from
   `docs/context/methodology.md` and emits one of three byte-exact
   strings sourced from `plugins/relay/agents/prd-writer.md` Step
   7.4 (lines 382–386) — that is the single source of truth.
   plan-reviewer R5 enforces byte-equality.

5. **Validation exit-code semantics.** Every command under
   `## Validation Commands` (Levels 1–3) and every per-task
   `VALIDATE:` command MUST exit non-zero when its invariant is
   violated. The idiom `<check> && echo "PASS" || echo "FAIL"`
   always exits 0 and is forbidden — the `code-reviewer`
   R-L1/R-L2/R-L3 gate scores PASS iff exit code is 0, so a masked
   failure passes review silently. plan-reviewer's
   R-COH-VALIDATE-ALWAYS-PASS check enforces this.

6. **Forbidden-reference grep scope.** Any Validation or per-task
   `VALIDATE:` command that checks for an introduced forbidden
   reference (e.g. `\.claude/PRPs`) MUST scope its grep to the
   `git diff` output for the phase's own changed paths — not the
   whole file — and MUST exclude lines matching this repo's standard
   quoted-prohibition sentence (`MUST NOT appear`) that other agent
   files legitimately cite verbatim. A command satisfying exit-code
   semantics (extension 5) can still false-positive on either gap.
   plan-reviewer's R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE check enforces
   both.

---

## Output path

`PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`

Where:
- `<feature>` is the source PRD's basename (without the `.prd.md`
  suffix). Example: `plan-authoring`.
- `<N>` is the Implementation Phases row number being planned.
- `<slug>` is a kebab-cased version of the row's `Phase` cell
  (lowercase, ASCII only, `-` separator, punctuation dropped).
  Example: `plan-writer agent` → `plan-writer-agent`.

Directory is created if it doesn't exist. NEVER write under
`.claude/` — see `docs/anti-patterns.md` lines 60–66 and
`docs/decisions.md` on the PRP artifact path convention.
plan-reviewer R6 enforces both the path and any `.claude/PRPs/`
references inside the plan body.

This refines the api-reference shorthand `<feature>.plan.md`; the
per-phase pattern is recorded as a deliberate divergence in
`PRPs/prds/plan-authoring.prd.md` Decisions Log (and is propagated
into `docs/api-reference.md` via Phase 6 of that PRD).

---

## Plan body — structure

Sections appear in this exact order. Empty sections are marked
`TBD - needs validation` rather than filled with filler.
plan-reviewer R2 enforces the order; R3 enforces no-TBD in
mandatory fields.

> **Section count reconciliation:** the source PRD
> (`PRPs/prds/plan-authoring.prd.md` lines 70 and 206) refers to
> "14 mandatory sections". That wording counts the **14 body
> sections** (Summary through Notes) AFTER the `## Source` prefix.
> Including the prefix as section #1 yields **15** in total — and
> that is what plan-reviewer R2 walks. Both views are consistent;
> the template treats Source as a first-class section.

```markdown
# Feature: {Phase Name} ({Phase N} of {feature})

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {semicolon-separated list}
- Decisions found:
  - {decision 1}
  - {decision 2}
- Applicable anti-patterns:
  - {anti-pattern 1}
- Applicable architectural rules:
  - {rule 1}
- Result: PROCEED | HALT (reason)
```

1. `## Source`

   Two-branch definition:

   **PRD mode** (standard): bullet pointing at the PRD path + row N
   + Goal + Success signal. plan-reviewer R8a verifies the file
   exists and is APPROVED; R8b verifies AC-A items carry `(PRD
   AC-N)` tokens; R8c verifies back-fill.

   PRD-mode example:
   - `PRPs/prds/<feature>.prd.md` — Implementation Phases row N:
     "{Phase Name}" — Goal: {Goal line from PRD Phase Details} —
     Success signal: {Success signal line from PRD Phase Details}.

   **Description mode** (PRD-less plans, per `/relay-plan PRD-less
   mode`): the verbatim feature description provided to `/relay-plan`.
   No PRD path; no row number; no back-fill attempted.
   plan-reviewer detects description mode by the absence of a
   `.prd.md` reference in the section body. In description mode,
   R8a/R8b/R8c do not apply — plan-reviewer emits each as
   `passed: true` with explicit "description-only mode" rationale
   (see R8 description-mode variant in `plan-reviewer.md`).

   Description-mode example:
   ```
   ## Source

   <verbatim description text from the $ARGUMENTS string>
   ```

   Note: "R8b does not apply in description mode — no (PRD AC-N)
   token required."

2. `## Summary`

   One paragraph: what the phase delivers and the high-level
   approach.

3. `## User Story`

   ```
   As a {user}
   I want to {action}
   So that {benefit}
   ```

4. `## Problem Statement`

   Narrowed from the PRD's Problem Statement to the phase's scope.

5. `## Solution Statement`

   Narrowed from the PRD's Proposed Solution to the phase's scope.

6. `## Metadata`

   Table with the keys: Type, Complexity, Systems Affected,
   Dependencies, Estimated Tasks, Source PRD line ref.

7. `## Mandatory Reading`

   Table of files (priority, path, lines, why) drawn from
   `research-codebase` findings + the PRD's Phase Details. Every
   row's path must come from a real research finding or be the PRD
   itself; never invent.

8. `## Patterns to Mirror`

   At least one snippet per architectural anchor identified by
   `research-codebase`. Every snippet header is
   `# SOURCE: <path>:<line-range>` followed by the copy-pasted
   code. `path:line` values come from the research findings'
   `source` field; if research-codebase returned no findings, write
   `TBD - needs validation` rather than inventing. plan-reviewer
   R3 fails any TBD in this section.

9. `## Files to Change`

   Table: File, Action (CREATE / UPDATE / DELETE), Justification.
   At least one data row (R7 enforces).

10. `## NOT Building (Scope Limits)`

    Bullets explicitly excluded from this phase, drawn from the
    PRD's "What We're NOT Building" filtered to the phase's scope.

11. `## Step-by-Step Tasks`

    At least 3 atomic tasks (R4 enforces). Each task has the
    structure:

    ```
    ### Task <i>: <ACTION> <file>

    - **ACTION**: ...
    - **MIRROR**: <reference to a Patterns-to-Mirror anchor>
    - **VALIDATE**: <non-empty shell command>
    ```

    The literal keyword `VALIDATE` followed by a non-empty command
    is mandatory on every task.

12. `## Validation Commands`

    Levels 1–3 only:
    - **Level 1 STATIC_ANALYSIS** (lint / type-check /
      markdown-lint / YAML parse, depending on the phase's
      deliverable).
    - **Level 2 CONTENT_INVARIANTS** or **UNIT_TESTS** (`grep`
      checks for prompt-only deliverables; framework tests for
      code deliverables).
    - **Level 3 INTEGRATION** or **DRY-RUN END-TO-END**.

    Levels 4–6 (browser / database / manual) are NOT part of the
    fixed agent contract; include them only if the phase's
    deliverable genuinely needs them.

    **Exit-code semantics (mandatory).** Each Level command must
    exit non-zero when its invariant fails — the `code-reviewer`
    scores PASS iff exit code is 0 (R-L1/R-L2/R-L3). Do NOT use
    `<check> && echo "PASS" || echo "FAIL"` (always exits 0), and
    do NOT rely on a multi-line block whose earlier failure is
    masked by a later passing line (a block returns its LAST
    command's exit code). Use `if grep -q … ; then echo "FAIL: …";
    exit 1; else echo "PASS: …"; fi`, or let the tool's own status
    propagate under `set -euo pipefail`. See `plan-writer.md`
    Step 4.4 item 11 for the full wrong→right examples.
    plan-reviewer R-COH-VALIDATE-ALWAYS-PASS enforces this. A
    forbidden-reference grep (e.g. `\.claude/PRPs`) must additionally
    be diff-scoped and exclude the standard `MUST NOT appear`
    quoted-prohibition idiom — see mandatory extension 6 above;
    plan-reviewer R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE enforces this.

13. `## Acceptance Criteria`

    Bulleted list. Two-branch definition:

    **PRD mode** (standard): every bullet must reference at least one
    PRD `AC-N` it derives from (R8b enforces). Format:
    `**AC-A<i> (PRD AC-<N>):** <statement>`.

    **Description mode** (PRD-less plans): bullets carry no `(PRD
    AC-N)` token — the format is simply `**AC-A<i>:** <statement>`.
    A minimum of 3 `AC-A<i>` items is required in description mode
    (R4 parity floor; plan-reviewer's description-mode R8 variant
    enforces this via the `R8-desc-min-ac` check). R8b (PRD AC-N
    token check) does not apply in description mode — plan-reviewer
    emits `passed: true` with rationale for R8b when the plan's
    `## Source` section does not reference a `.prd.md` file.

14. `## Risks and Mitigations`

    Table: Risk, Likelihood, Impact, Mitigation. At least one row
    when the PRD's Technical Risks intersect this phase. Otherwise
    a single note row.

15. `## Notes`

    Free-form. The TDD routing note (item 4 above) lives here.
    Other notes (color choices for agents, dogfood opportunities,
    divergence callouts) are also fine.

The plan ends with a trailing two-line block:

```
*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```

`plan-reviewer` flips this on rubric pass to:

```
*Generated: <YYYY-MM-DD>*
*Approved: <YYYY-MM-DD>*
*Status: APPROVED*
```
```

---

## Lifecycle — where this template is consumed

1. **`/relay-plan` command + `plan-writer` agent** (Phases 1 & 3 of
   `plan-authoring`, complete) — read the source PRD, dispatch
   research subagents, consult the Decision Gate, assemble a DRAFT
   plan against this template, write to
   `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`, back-fill the
   source PRD's row N (`Status` → `in-progress`; `PRP Plan` cell
   populated).

2. **`/relay-plan-review` command + `plan-reviewer` agent**
   (Phases 2 & 4 of `plan-authoring`, complete) — load the DRAFT,
   run the 8-item rubric (R2 enforces this template's section
   order), auto-flip `*Status: DRAFT*` → `*Status: APPROVED*` on
   full pass, append every verdict to
   `PRPs/plans/<basename>.review.jsonl`.

3. **Implementer** (downstream, future `/relay-implement`) —
   consumes the APPROVED plan, executes the Step-by-Step Tasks in
   order, runs the Validation Commands at Levels 1–3.

4. **Test Runner** (`/relay-test`, shipped) — exercises the
   implementation against tests; the post-green reviewer
   (`/relay-test-review`, shipped) catches regressions.

After plan approval, the pipeline runs autonomously per
`docs/context/architecture.md` §Interactivity boundary.
