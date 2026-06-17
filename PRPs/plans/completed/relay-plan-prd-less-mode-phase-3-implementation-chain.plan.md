# Feature: Implementation chain (Phase 3 of relay-plan-prd-less-mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of cross-cutting pipeline agents (relay-implement command, implementer agent, code-reviewer agent, code-reviewer-semantic sub-agent); PRD-less mode alternative execution branches for P3 precondition and D8 Mutation c; flat-filename parse tolerance (the 2026-04-25 per-phase filename convention admits a description-mode exception); AC-source substitution propagated to bounded sub-agent dispatch; references 2026-04-30 D8 post-approval mutations decision and 2026-04-25 plan filename convention decision; references 2026-04-28 R-COH-* additive rubric decision
- Decisions found:
  - 2026-04-25 "Plan filenames carry the source PRD phase number and slug" — description-mode plans use flat `<slug>.plan.md`; this phase adds the implementer branch that handles the flat pattern without HALTing.
  - 2026-04-30 "D8 post-approval mutations are best-effort atomic" — Mutation c (source PRD row N flip) becomes a documented no-op for PRD-less plans; Mutations a + b are preserved; no PARTIAL_D8_FAILURE is raised for the absent PRD row.
  - 2026-04-28 "R-COH-* rows are additive to the rubric[] array" — the AC-source substitution in code-reviewer-semantic appends outcomes to the same rubric array; the description-mode branch does not short-circuit any check.
  - 2026-04-19 "PRP artifacts live under PRPs/, never .claude/" — PRPs/reports/<slug>/attempts/ artifact root for description-mode plans.
  - 2026-04-19 "Interactivity boundary: PRD interactive, downstream autonomous" — no user dialogue anywhere in the implementation chain.
  - 2026-04-19 "Command surface: one command per stage, writer and reviewer split" — /relay-implement retains its exact role; no new commands introduced.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — PRPs/reports/<slug>/attempts/ paths must not use .claude/ prefix.
  - "Treating plugins/prp-core/ as active relay code" — the prp-plan description-mode reference is behavioral design only; relay reimplements in its own assets.
  - "Relying on interactive permission prompts in the autonomous loop" — all new branches run without per-command confirmations.
  - "Weakening or deleting tests to make the loop turn green" — R-X guard is unchanged regardless of description mode; carried over explicitly.
- Applicable architectural rules:
  - PRD artifact paths: PRPs/plans/, PRPs/reports/<feature|slug>/phase-<N>|attempts/; never .claude/
  - Three-pillar Pillar 2 interactivity boundary: past PRD-APPROVED (or description-APPROVED) the pipeline is autonomous.
  - Orchestrator state machine is the source PRD's Implementation Phases table — description-mode plans have no PRD row and are outside /relay-execute (explicit Won't in the source PRD).
  - Writer/reviewer split is preserved: /relay-implement is the writer command; code-reviewer is the reviewer agent.
- Result: PROCEED
```

## Source

- `PRPs/prds/relay-plan-prd-less-mode.prd.md` — Implementation Phases row 3:
  "Implementation chain" — Goal: `/relay-implement` implements a PRD-less plan end-to-end — Success
  signal: `IMPLEMENTATION_COMPLETE`; Mutations a+b applied, c skipped; no PRD-shaped or filename-pattern HALT.

## Summary

This phase extends four existing files so that the relay implementation chain can consume a description-only APPROVED plan (flat `<slug>.plan.md`, no `## Source PRD` bullet, no source PRD to read or flip). The changes are strictly additive branches: `/relay-implement` grows a PRD-less detection branch at its "Parse arguments" step and its P3 precondition, and makes D8 Mutation c a documented no-op when no source PRD exists; the `implementer` agent gains source-read tolerance (no HALT when `## Source PRD` is absent, reads `## Source` description + `AC-A<i>` instead) and flat-filename parse tolerance (derives `PRPs/reports/<slug>/attempts/` artifact root and `PRPs/plans/completed/` target from a flat `<slug>.plan.md`); `code-reviewer` gains a source-PRD-read-optional branch and populates `<prd_acs>` from the plan's own `AC-A<i>` items when no source PRD exists; `code-reviewer-semantic` receives the same `<prd_acs>` payload already containing the plan-derived ACs and raises no finding solely because a source PRD is absent. All PRD-mode behavior is regression-safe: every new branch is gated on the detection of a PRD-less plan.

## User Story

As a relay developer or plugin user  
I want `/relay-implement` to accept an APPROVED description-only plan at `PRPs/plans/<slug>.plan.md`  
So that a small feature planned without a PRD can be implemented end-to-end without PRD-shaped HALTs, with all applicable mutation and review contracts preserved.

## Problem Statement

After Phases 1 and 2 of this PRD ship, a description-only plan can be generated and reviewed, but `/relay-implement` would immediately HALT on four hard-coded PRD assumptions: (a) the "Parse arguments" section derives `<feature>` and `<N>` from a `<feature>-phase-<N>-<slug>.plan.md` pattern and HALTs if the flat `<slug>.plan.md` filename does not match; (b) precondition P3 unconditionally reads `PRPs/prds/<feature>.prd.md` and checks for `in-progress` — a file that does not exist for PRD-less plans; (c) the `implementer` agent Phase 0 unconditionally reads the source PRD for AC-N traceability and HALTs if it cannot; (d) the `implementer` Step 1.1 repeats the filename pattern check and halts if the flat basename does not match. Downstream, `code-reviewer` unconditionally reads the source PRD for R-S3 and arbitration context, and passes PRD AC excerpts to `code-reviewer-semantic` as `<prd_acs>` — fields that are empty or absent for PRD-less plans, which could produce spurious findings.

## Solution Statement

Add a PRD-less detection gate at the earliest decision point in `/relay-implement` ("Parse arguments") so that flat `<slug>.plan.md` filenames bypass the pattern-HALT and instead derive artifact paths as `PRPs/reports/<slug>/attempts/`. Gate P3's PRD-row-in-progress check on PRD-mode detection (skip entirely for PRD-less plans). In D8, make Mutation c conditional: if `is_prd_less` is set, skip the source PRD row flip and record `mutation_c_skipped: true` in the halt.json schema (no PARTIAL_D8_FAILURE raised for this skip). In the `implementer` agent, introduce a two-branch read in Phase 0 (`## Source PRD` present → PRD mode; absent → description mode reading `## Source` + `AC-A<i>`); in Step 1.1, add the matching flat-filename branch for path derivation. In `code-reviewer` Phase 0, make the source-PRD read conditional on the plan carrying a `## Source PRD` section; when absent, populate the R-S3 AC list and `<prd_acs>` from the plan's `AC-A<i>` bullets. `code-reviewer-semantic` requires no structural change — it receives a well-formed `<prd_acs>` block regardless of whether those ACs came from a PRD or from the plan; it MUST NOT raise a finding solely because no source PRD is cited.

## Metadata

| Key | Value |
|-----|-------|
| Type | feature |
| Complexity | Medium |
| Systems Affected | `/relay-implement` command; `implementer` agent; `code-reviewer` agent; `code-reviewer-semantic` sub-agent |
| Dependencies | Phase 1 (planning entrypoint — flat `<slug>.plan.md` shape established) and Phase 2 (plan-reviewer accepts PRD-less plans — `AC-A<i>` without `(PRD AC-N)` tokens) must be complete |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-plan-prd-less-mode.prd.md` row 3 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/relay-plan-prd-less-mode.prd.md` | 101–148 (Solution Detail), 183–185 (Phase 3 details), 66–76 (AC-6/AC-7/AC-8) | Source PRD Phase 3 scope; AC-6 (P3 branch + implementer tolerances), AC-7 (Mutation c no-op), AC-8 (code-reviewer AC substitution) |
| P0 | `plugins/relay/commands/relay-implement.md` | 55–80 (Parse arguments + pattern HALT), 114–133 (P3 precondition), 341–404 (D8 Mutation c + atomicity discipline) | All three touch-points that must grow a PRD-less branch |
| P0 | `plugins/relay/agents/implementer.md` | 117–137 (Phase 0 reads), 163–178 (Step 1.1 filename parse), 194–197 (AC extraction) | Source-read tolerance and flat-filename parse tolerance |
| P0 | `plugins/relay/agents/code-reviewer.md` | 141–195 (Phase 0 reads including source PRD), 286–300 (R-S3), 487–535 (sub-agent dispatch + `<prd_acs>` template) | AC-source substitution and optional source-PRD read |
| P1 | `plugins/relay/agents/code-reviewer-semantic.md` | 1–50 (frontmatter + Inputs) | `<prd_acs>` payload contract; no structural change needed, but the description-mode constraint must be noted |
| P1 | `PRPs/prds/implementation-authoring.prd.md` | D8 section (post-approval mutations) | D8 atomicity discipline; Mutation c no-op must not break the `mutations_attempted` accounting |
| P2 | `docs/decisions.md` | 2026-04-25 (flat filename), 2026-04-30 (D8 atomicity), 2026-04-28 (R-COH-* additive) | Three directly applicable decisions bounding the implementation |

## Patterns to Mirror

### Pattern 1 — relay-implement.md "Parse arguments" current HALT on filename mismatch

# SOURCE: plugins/relay/commands/relay-implement.md:65-79

```
Record `plan_path` as the resolved absolute path. Record `target_root` as the current working directory (the repository from which the user invoked the command). Parse `<feature>` and `<N>` from the plan filename pattern `<feature>-phase-<N>-<slug>.plan.md`:

- `<feature>` = basename of `<plan_path>` minus `-phase-<N>-<slug>.plan.md`.
- `<N>` = the integer between `-phase-` and the next `-`.
- `<slug>` = the kebab-cased remainder before `.plan.md`.

If the filename does not match this pattern, HALT with:

> Plan filename does not match the canonical pattern
> `<feature>-phase-<N>-<slug>.plan.md`. The plan was not produced by
> /relay-plan (or was hand-renamed). Either re-run /relay-plan to
> regenerate the plan with the canonical filename, or rename the
> plan file to match the pattern.

These derived values are used to locate the source PRD (`PRPs/prds/<feature>.prd.md`), the per-attempt artifact root (`PRPs/reports/<feature>/phase-<N>/attempts/<i>/`), and the completed-plan target (`PRPs/plans/completed/<basename>.plan.md`).
```

**Used by Task 1.** The branch point: instead of HALTing on a flat `<slug>.plan.md`, detect description mode and derive the artifact root as `PRPs/reports/<slug>/attempts/<i>/` with `is_prd_less = true`.

### Pattern 2 — relay-implement.md P3 precondition (unconditional PRD read)

# SOURCE: plugins/relay/commands/relay-implement.md:114-133

```
### P3 — Source PRD row N status cell is `in-progress`

`Read` `PRPs/prds/<feature>.prd.md`. Locate the Implementation Phases table by exact-match header line:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

Locate row `<N>` (the row whose first cell, trimmed, equals the integer `<N>`). Verify the `Status` cell is exactly `in-progress` (case-sensitive). If the cell value is anything else (`pending`, `complete`, or other), HALT with the source PRD AC-11 message verbatim:
...
The check is for `in-progress` specifically. If the cell shows `complete`, the implementation has already been performed — refuse rather than re-execute (D8 mutations would corrupt the per-phase state machine).
```

**Used by Task 1.** Gate this entire precondition behind `if not is_prd_less`. When `is_prd_less == true`, P3 is documented as skipped (no HALT, no PRD read).

### Pattern 3 — relay-implement.md D8 Mutation c (source PRD row flip)

# SOURCE: plugins/relay/commands/relay-implement.md:362-369

```
#### Mutation c — Source PRD row N status flip

`Edit` `PRPs/prds/<feature>.prd.md`:
- `old_string`: the verbatim full row N line copied from the source PRD (including all leading and trailing pipes and whitespace; the full line guarantees a unique match).
- `new_string`: the same row line with `Status` cell `in-progress` → `complete`. The `PRP Plan` cell is left unchanged (plan-writer already populated it with the relative path; that path now resolves under `PRPs/plans/completed/` after Mutation b, but the cell is not updated to reflect the move — the row's PRP Plan cell carries the *original* plan name as a stable reference).
- `replace_all`: `false`

Record `mutation_c_success: true|false`. On `false`, capture the error message.
```

**Used by Task 2.** Gate with `if is_prd_less: skip Mutation c; record mutation_c_skipped: true`. Update the atomicity discipline section to reflect `mutations_attempted` as `["a", "b"]` only for PRD-less plans. No PARTIAL_D8_FAILURE when the skip is intentional.

### Pattern 4 — implementer.md Phase 0 source-PRD read (unconditional)

# SOURCE: plugins/relay/agents/implementer.md:120-137

```
  - The `## Source PRD` bullet — extract the source PRD relative
    path (e.g. `PRPs/prds/<feature>.prd.md`) and the row N reference.
  ...
- The source PRD at the relative path captured above — read end-to-
  end for AC-N traceability and for the source PRD basename.
```

**Used by Task 3.** Add a two-branch read: if `## Source PRD` bullet present → PRD mode (read the referenced file); if absent → description mode (read `## Source` body as contract description, extract `AC-A<i>` items from `## Acceptance Criteria` with no `(PRD AC-N)` token).

### Pattern 5 — implementer.md Step 1.1 filename parse halt

# SOURCE: plugins/relay/agents/implementer.md:163-178

```
Parse the plan's basename against the canonical pattern
`<feature>-phase-<N>-<slug>.plan.md`. Hold `<feature>` and `<N>` for
the Phase 5 handoff message. Examples:

- `plan-authoring-phase-1-plan-writer-agent.plan.md` →
  `<feature>=plan-authoring`, `<N>=1`,
  `<slug>=plan-writer-agent`.
...
If the basename does not match the pattern, halt with a structured
error naming the violating basename. The COMMAND has already
verified the pattern — this is a defense-in-depth check.
```

**Used by Task 3.** Add a flat-filename branch: if basename matches `<slug>.plan.md` (no `-phase-` segment) → description mode; derive `PRPs/reports/<slug>/attempts/` as the artifact root and `PRPs/plans/completed/<basename>.plan.md` as the move target. Do NOT halt.

### Pattern 6 — code-reviewer.md Phase 0 source-PRD read and R-S3 AC extraction

# SOURCE: plugins/relay/agents/code-reviewer.md:152-174

```
- `<plan_path>` — read end-to-end and hold the content in context.
  Locate and remember:
  - The plan title (line 1, after `# `).
  - The `## Source PRD` bullet — extract the source PRD relative
    path and the row N reference.
  ...
- The source PRD at the relative path captured above — read end-to-
  end for AC-N traceability (R-S3) and, in arbitration mode, for
  cross-referencing `prd_refs`.
```

**Used by Task 4.** Make the source-PRD read conditional: if `## Source PRD` bullet is absent in the plan, set `is_prd_less = true`; skip the PRD file read; use the plan's `AC-A<i>` items (from `## Acceptance Criteria`) as the R-S3 AC list. Raise no finding solely because no source PRD exists.

### Pattern 7 — code-reviewer.md `<prd_acs>` injection template for code-reviewer-semantic

# SOURCE: plugins/relay/agents/code-reviewer.md:512-514

```
<prd_acs>
...the source PRD's relevant AC-N items the diff is implementing...
</prd_acs>
```

**Used by Task 4.** When `is_prd_less == true`, populate `<prd_acs>` with the plan's `AC-A<i>` bullets (verbatim from the plan's `## Acceptance Criteria` section) instead of source PRD AC-N excerpts. The prompt comment changes to "...the plan's derived AC-A<i> items (PRD-less mode)..." so `code-reviewer-semantic` has meaningful context.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-implement.md` | UPDATE | Add PRD-less detection in "Parse arguments" (flat filename → `is_prd_less = true` + derive `PRPs/reports/<slug>/attempts/` root); gate P3 on `is_prd_less == false`; make D8 Mutation c conditional (skip + `mutation_c_skipped: true` when `is_prd_less`); update atomicity discipline `mutations_attempted` accounting |
| `plugins/relay/agents/implementer.md` | UPDATE | Phase 0: two-branch source read (PRD mode vs description mode); Step 1.1: flat-filename branch for artifact path derivation; Step 1.2: AC extraction tolerates `AC-A<i>` items without `(PRD AC-N)` token |
| `plugins/relay/agents/code-reviewer.md` | UPDATE | Phase 0: conditional source-PRD read (absent → `is_prd_less = true`, use plan ACs); R-S3: tolerate `AC-A<i>` items without `(PRD AC-N)` token; `<prd_acs>` injection: substitute plan `AC-A<i>` items when `is_prd_less` |
| `plugins/relay/agents/code-reviewer-semantic.md` | UPDATE | Add explicit note in "Inputs" section: when `<prd_acs>` carries plan-derived `AC-A<i>` items (PRD-less mode), apply the same K=5 pass over them; do NOT raise a finding solely because no source PRD is cited; the parent has already performed the substitution |

## NOT Building (Scope Limits)

- **`/relay-execute` integration for description-mode plans** — the orchestrator's state machine IS the source PRD's Implementation Phases table; PRD-less plans have no row. Out of scope per the source PRD's "What We're NOT Building" and the 2026-05-01 D6 decision.
- **TDD chain (B7/B8) for description-mode plans** — `tdd-writer` reads source PRD ACs; a PRD-less plan lacks them. Deferred to a future PRD branch per the source PRD's "What We're NOT Building".
- **A complexity/ambiguity guard** — description mode always plans from the given text; no heuristic redirect to `/relay-prd` is introduced here or in the implementation chain.
- **A `--no-prd` flag** — dispatch is by input-type detection (flat filename); no new flags.
- **Lightweight-PRD-under-the-hood** — the implementation chain consumes the description-only plan as-is; it does not synthesize a PRD from the description.
- **Generating a new `## Source PRD` section in the plan** — the implementer does not rewrite the plan; it reads `## Source` (description) as the contract.
- **Docs + release artifacts** — `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugin.json` bump — deferred to Phase 4 of this PRD.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/commands/relay-implement.md — PRD-less detection branch + P3 gate + D8 Mutation c conditional

- **ACTION**: Edit `plugins/relay/commands/relay-implement.md` to add three coordinated changes:
  (a) In "Parse arguments", before the existing HALT on filename mismatch, add a detection branch: if the basename matches `<slug>.plan.md` (i.e. contains no `-phase-<digits>-` segment), set `is_prd_less = true`, set `slug = basename minus .plan.md`, set `feature = slug`, set `N = null`, and compute `artifact_root = PRPs/reports/<slug>/attempts/`. Do NOT HALT. If the basename matches the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern, set `is_prd_less = false` and continue as today. If it matches neither pattern, emit the existing HALT.
  (b) In "Preconditions", gate the entire P3 block with `if not is_prd_less`. When `is_prd_less == true`, emit a structured skip note: `"P3 skipped: PRD-less plan detected (no source PRD exists to check)"` and proceed to P4. The P3 HALT message is unchanged for PRD-mode plans.
  (c) In Phase A.4 "Mutation c", wrap the Edit in `if not is_prd_less`. When `is_prd_less == true`, skip the Edit, record `mutation_c_skipped: true` (not a failure), and update the `mutations_attempted` list to `["a", "b"]` for the halt.json schema in PRD-less mode. The atomicity discipline paragraph must note that `mutation_c_skipped: true` is not a PARTIAL_D8_FAILURE condition.
  Implements: **AC-A1 (PRD AC-6a, AC-7)**.
- **MIRROR**: Pattern 1 (relay-implement.md:65-79), Pattern 2 (relay-implement.md:114-133), Pattern 3 (relay-implement.md:362-369)
- **VALIDATE**: `grep -n "is_prd_less" plugins/relay/commands/relay-implement.md | grep -c "is_prd_less"` — expect 6 or more occurrences covering detection, P3 gate, and Mutation c gate; `grep -n "mutation_c_skipped" plugins/relay/commands/relay-implement.md` — expect at least 1 hit; `grep -n "P3 skipped" plugins/relay/commands/relay-implement.md` — expect 1 hit

### Task 2: UPDATE plugins/relay/agents/implementer.md — source-read tolerance + flat-filename parse tolerance

- **ACTION**: Edit `plugins/relay/agents/implementer.md` to add two tolerance branches:
  (a) In Phase 0 reads, replace the unconditional `## Source PRD` bullet extraction and source-PRD file read with a two-branch block: if `## Source PRD` bullet is present in the plan → PRD mode (extract path + row N, read PRD end-to-end for AC-N traceability; behavior unchanged); if `## Source PRD` bullet is absent → description mode (read `## Source` section body as the feature description; set `is_prd_less = true`; extract `AC-A<i>` items from `## Acceptance Criteria` section, noting they carry no `(PRD AC-N)` token; set source PRD path to null; do NOT HALT). The instruction text `"The source PRD at the relative path captured above — read end-to-end for AC-N traceability and for the source PRD basename."` gains a conditional prefix.
  (b) In Step 1.1, after the existing examples, add a flat-filename branch: if the plan basename matches `<slug>.plan.md` (no `-phase-<digits>-` segment), set `is_prd_less = true`, `feature = slug`, `N = null`, `artifact_root = PRPs/reports/<slug>/attempts/`, `completed_target = PRPs/plans/completed/<basename>.plan.md`. Do NOT emit the existing "halt with a structured error" — the flat pattern is valid for description-mode plans. The defense-in-depth note becomes: "If the basename does not match either the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern OR the flat `<slug>.plan.md` pattern, halt with a structured error."
  In Step 1.2, update the AC extraction line to tolerate both `**AC-A<i> (PRD AC-<N>):**` and plain `**AC-A<i>:**` bullet forms.
  Implements: **AC-A2 (PRD AC-6b, AC-6c)**.
- **MIRROR**: Pattern 4 (implementer.md:120-137), Pattern 5 (implementer.md:163-178)
- **VALIDATE**: `grep -n "is_prd_less" plugins/relay/agents/implementer.md | grep -c "is_prd_less"` — expect 4 or more occurrences; `grep -n "flat" plugins/relay/agents/implementer.md` — expect at least 1 hit referencing the flat filename branch; `grep -n "PRD-less" plugins/relay/agents/implementer.md` — expect at least 2 hits

### Task 3: UPDATE plugins/relay/agents/code-reviewer.md — optional source-PRD read + AC-source substitution + `<prd_acs>` template update

- **ACTION**: Edit `plugins/relay/agents/code-reviewer.md` to add three coordinated changes:
  (a) In Phase 0, after the plan read extracts the `## Source PRD` bullet, add a two-branch block: if the bullet is present → PRD mode (read source PRD end-to-end for R-S3 and arbitration; behavior unchanged); if absent → description mode (set `is_prd_less = true`; do NOT read any source PRD file; do NOT HALT; populate the R-S3 AC list from the plan's `## Acceptance Criteria` section's `AC-A<i>` bullets).
  (b) In R-S3, update the bullet text to tolerate both `**AC-A<i> (PRD AC-<N>):**` and plain `**AC-A<i>:**` forms. Add a note: "In description mode (`is_prd_less == true`), AC items carry no `(PRD AC-N)` token; R-S3 checks observable counterparts against these plan-derived items. No finding is raised solely because a source PRD is absent."
  (c) In the sub-agent dispatch section, update the `<prd_acs>` template injection: when `is_prd_less == true`, substitute the plan's `AC-A<i>` bullets (verbatim from `## Acceptance Criteria`) as the `<prd_acs>` payload; update the XML comment from "the source PRD's relevant AC-N items" to "the plan's derived AC-A<i> items (PRD-less mode — no source PRD)".
  Implements: **AC-A3 (PRD AC-8)**.
- **MIRROR**: Pattern 6 (code-reviewer.md:152-174), Pattern 7 (code-reviewer.md:512-514)
- **VALIDATE**: `grep -n "is_prd_less" plugins/relay/agents/code-reviewer.md | grep -c "is_prd_less"` — expect 3 or more occurrences; `grep -n "PRD-less mode" plugins/relay/agents/code-reviewer.md` — expect at least 2 hits (R-S3 note + prd_acs comment); `grep -n "AC-A" plugins/relay/agents/code-reviewer.md` — expect at least 1 hit in the R-S3 and prd_acs sections

### Task 4: UPDATE plugins/relay/agents/code-reviewer-semantic.md — description-mode `<prd_acs>` note

- **ACTION**: Edit `plugins/relay/agents/code-reviewer-semantic.md` to add a note in the "Inputs" section, specifically in the `<prd_acs>` bullet description. The note must state: "In PRD-less (description) mode, the parent `code-reviewer` substitutes the plan's derived `AC-A<i>` items into this field instead of source PRD AC-N excerpts. Apply the same K=5 judgment pass over these items. Do NOT raise a finding solely because no source PRD is referenced — the substitution has already been performed by the parent." This is a documentation-only change to the sub-agent's input contract; no structural change to the K=5 pass or the output schema is required.
  Implements: **AC-A4 (PRD AC-8)**.
- **MIRROR**: Pattern 7 (code-reviewer.md:512-514)
- **VALIDATE**: `grep -n "PRD-less" plugins/relay/agents/code-reviewer-semantic.md` — expect at least 1 hit; `grep -n "AC-A" plugins/relay/agents/code-reviewer-semantic.md` — expect at least 1 hit in the prd_acs bullet description

### Task 5: Regression check — verify PRD-mode behavior is unchanged

- **ACTION**: After Tasks 1–4, perform a cross-file grep regression check to confirm that PRD-mode execution paths (canonical `<feature>-phase-<N>-<slug>.plan.md`) are gated correctly and unchanged: every new branch added must be behind `is_prd_less` conditions; no existing PRD-mode text may have been deleted. Verify that relay-implement.md still contains the full P3 precondition text (only wrapped in a condition), the full Mutation c text (only wrapped in a condition), and the full canonical filename HALT message (still present for non-matching basenames). Verify that implementer.md still contains the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern check, now extended with an `elif` flat-filename branch. Verify that code-reviewer.md still contains the unconditional source-PRD read text, now inside an `if not is_prd_less` branch.
  Implements: **AC-A5 (PRD AC-2)**.
- **MIRROR**: Pattern 1 (relay-implement.md:65-79), Pattern 2 (relay-implement.md:114-133)
- **VALIDATE**: `grep -c "is_prd_less" plugins/relay/commands/relay-implement.md && grep -c "is_prd_less" plugins/relay/agents/implementer.md && grep -c "is_prd_less" plugins/relay/agents/code-reviewer.md` — all three counts must be non-zero; `grep -n "feature.*phase.*N.*slug" plugins/relay/commands/relay-implement.md` — must still reference the canonical pattern (PRD mode preserved); `grep -n "HALT" plugins/relay/commands/relay-implement.md | grep -i "filename"` — the filename HALT for unrecognised patterns must still be present

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Markdown lint on the four modified files (markdownlint if available; else basic checks)
for f in \
  "plugins/relay/commands/relay-implement.md" \
  "plugins/relay/agents/implementer.md" \
  "plugins/relay/agents/code-reviewer.md" \
  "plugins/relay/agents/code-reviewer-semantic.md"; do
  echo "=== $f ===";
  grep -c "^#" "$f" || true;
done
# Confirm no .claude/ path leakage in modified files
grep -rn '\.claude/PRPs' \
  plugins/relay/commands/relay-implement.md \
  plugins/relay/agents/implementer.md \
  plugins/relay/agents/code-reviewer.md \
  plugins/relay/agents/code-reviewer-semantic.md \
  && echo "FAIL: .claude/PRPs reference found" || echo "PASS: no .claude/PRPs references"
```

### Level 2 CONTENT_INVARIANTS

```bash
# Verify is_prd_less guard present in relay-implement.md
grep -c "is_prd_less" plugins/relay/commands/relay-implement.md
# Verify P3 gate exists
grep -n "P3 skipped\|is_prd_less.*P3\|P3.*is_prd_less" plugins/relay/commands/relay-implement.md
# Verify mutation_c_skipped present
grep -n "mutation_c_skipped" plugins/relay/commands/relay-implement.md
# Verify implementer flat-filename branch
grep -n "flat\|is_prd_less\|PRD-less" plugins/relay/agents/implementer.md
# Verify code-reviewer AC substitution note
grep -n "PRD-less\|is_prd_less" plugins/relay/agents/code-reviewer.md
# Verify code-reviewer-semantic description-mode note
grep -n "PRD-less\|AC-A" plugins/relay/agents/code-reviewer-semantic.md
# Confirm PRD-mode HALT still present in relay-implement.md (regression guard)
grep -n "Plan filename does not match" plugins/relay/commands/relay-implement.md
# Confirm canonical pattern phrase still present in implementer.md
grep -n "feature.*phase.*N.*slug\|<feature>-phase" plugins/relay/agents/implementer.md
```

### Level 3 INTEGRATION (DRY-RUN END-TO-END)

```bash
# Dry-run: confirm relay-implement.md frontmatter is intact (YAML parse)
head -5 plugins/relay/commands/relay-implement.md
# Dry-run: confirm implementer.md frontmatter is intact
head -8 plugins/relay/agents/implementer.md
# Dry-run: confirm code-reviewer.md frontmatter is intact
head -8 plugins/relay/agents/code-reviewer.md
# Dry-run: confirm code-reviewer-semantic.md frontmatter is intact
head -8 plugins/relay/agents/code-reviewer-semantic.md
# Dry-run: grep all four files for the AC-A tolerant pattern to confirm
# that the extraction now handles both AC-A<i> (PRD AC-N) and plain AC-A<i>
grep -n "AC-A" \
  plugins/relay/agents/implementer.md \
  plugins/relay/agents/code-reviewer.md \
  plugins/relay/agents/code-reviewer-semantic.md
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6a, AC-7):** `/relay-implement` does not HALT on a flat `<slug>.plan.md` filename — it detects PRD-less mode and derives `PRPs/reports/<slug>/attempts/<i>/` as the artifact root. P3's source-PRD-row check is skipped with a structured skip note (no HALT). D8 Mutation c is skipped with `mutation_c_skipped: true` (not a PARTIAL_D8_FAILURE) when `is_prd_less == true`; Mutations a and b are performed as normal.

- **AC-A2 (PRD AC-6b, AC-6c):** The `implementer` agent does not HALT when the plan has no `## Source PRD` bullet — it reads the `## Source` description body as the feature contract and extracts `AC-A<i>` items (without `(PRD AC-N)` tokens) as its traceability list. The `implementer` does not HALT on a flat `<slug>.plan.md` filename — it derives artifact paths from the flat basename instead.

- **AC-A3 (PRD AC-8):** `code-reviewer` does not HALT or raise a finding solely because the plan has no `## Source PRD` section. It populates its R-S3 AC list and the `<prd_acs>` payload from the plan's `AC-A<i>` bullets when `is_prd_less == true`. R-S3 passes when every plan-derived `AC-A<i>` item has an observable counterpart in the diff.

- **AC-A4 (PRD AC-8):** `code-reviewer-semantic` receives a well-formed `<prd_acs>` block carrying plan-derived `AC-A<i>` items in PRD-less mode. It applies the K=5 pass over these items and raises no finding solely because no source PRD is cited.

- **AC-A5 (PRD AC-2):** PRD-mode behavior is regression-safe: all four files still contain their canonical PRD-mode paths (filename HALT for unrecognised patterns, full P3 precondition, full Mutation c procedure, unconditional source-PRD read) — now gated by `is_prd_less == false` rather than removed.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The flat-filename detection regex (`<slug>.plan.md` vs `<feature>-phase-<N>-<slug>`) is ambiguous for a slug that happens to contain digits but no `-phase-` segment | L | H | The detection condition is `basename does not contain the literal substring '-phase-' followed by one or more digits followed by '-'`; kebab slugs from descriptions cannot produce a substring matching `-phase-<N>-` because plan-writer's slug generation (Phase 1) does not insert `-phase-` into description-derived slugs |
| Mutation c skip raises PARTIAL_D8_FAILURE because `mutations_attempted` still lists `["a","b","c"]` | M | M | Task 1 explicitly updates `mutations_attempted` to `["a","b"]` for PRD-less plans; `mutation_c_skipped: true` is an additional field, not a failure flag; the halt.json schema comment is updated |
| code-reviewer-semantic raises a fabricated finding about missing PRD reference in `<prd_acs>` | M | M | Task 4 adds an explicit note prohibiting findings raised solely because no source PRD is cited; the parent's substitution note in the `<prd_acs>` XML comment also signals the mode |
| A hand-renamed PRD-mode plan with no `-phase-` segment is misclassified as PRD-less | L | H | The COMMAND reads the plan's `## Source PRD` or `## Source` section content to confirm mode; both the filename pattern and the plan section shape must agree; a mismatch surfaces a structured warning (not a silent misclassification) |
| R-S3 in code-reviewer still looks for `(PRD AC-N)` tokens and fails on plan-derived ACs | M | H | Task 3 explicitly updates the R-S3 bullet-matching to tolerate plain `**AC-A<i>:**` form; the toleration branch is gated on `is_prd_less` to preserve PRD-mode behaviour |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Scope of `is_prd_less`:** The flag is a local variable within `/relay-implement`'s execution context and within each agent's Phase 0 context. It is NOT persisted to disk. The plan's `## Source PRD` / `## Source` section shape is the durable signal that downstream agents read to determine mode.

**Mutation c accounting:** The `halt.json` `mutations_attempted` field is protocol-significant — `/relay-execute`'s recovery guidance reads it. For PRD-less plans the field should be `["a", "b"]` (not `["a", "b", "c"]` with c listed as succeeded) so that manual recovery steps are accurate. The `mutation_c_skipped: true` field is additive and advisory.

**Dogfood note:** Per the source PRD's Open Questions, the full happy path (`plan → implement → test`) for description mode has been verified only by static reading of agent contracts. End-to-end dogfood validation remains an open item after this phase ships.

*Generated: 2026-06-16*
*Approved: 2026-06-16*
*Implemented: 2026-06-16*
*Status: IMPLEMENTED*
