# Feature: Review + template (Phase 2 of relay-plan-prd-less-mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of shared components (plan-template.md, plan-reviewer.md); cross-cutting artifact affecting the planning AND review chains; the 2026-05-14 phase_type=scaffold exemption precedent is the explicit model for the R8 description-mode variant; the 2026-05-15 "registered future capability" entry is now in-scope per the APPROVED relay-plan-prd-less-mode PRD
- Decisions found:
  - 2026-04-25 "Plan filenames carry the source PRD phase number and slug" — description-mode plans use a flat `<slug>.plan.md`; conscious divergence recorded in relay-plan-prd-less-mode Decisions Log; plan-reviewer R8c filename check must be branched accordingly
  - 2026-04-28 "R-COH-* rows are additive to the rubric[] array" — the R8 description-mode rows append to rubric[], never short-circuit; the no-short-circuit invariant is preserved
  - 2026-04-30 "D8 post-approval mutations are best-effort atomic" — Mutation c (source PRD row flip) is a no-op for PRD-less plans; this Phase 2 scope does not touch D8 directly (Phase 3 owns that)
  - 2026-05-14 "phase_type annotation enables rubric differentiation" — the direct model for emitting passed:true + explicit rationale in plan-reviewer without skipping the row; description-mode R8 exemption mirrors this pattern exactly
  - 2026-05-15 "/relay-plan PRD-less mode: registered future capability, not yet implemented" — this PRD supersedes the "not yet implemented" framing; Phase 2 is now authorized to implement the reviewer-side contracts
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — plan-reviewer writes review.jsonl to PRPs/plans/ only; no .claude/ writes
  - "Treating plugins/prp-core/ as active relay code" — prp-plan is a behavioral reference only; R8 variant is relay's own implementation
  - "Relying on interactive permission prompts in the autonomous loop" — plan-reviewer runs without user dialogue; the description-mode branch is fully autonomous
- Applicable architectural rules:
  - PRP artifacts live under PRPs/, never .claude/ (2026-04-19)
  - Writer/reviewer split preserved — plan-reviewer does NOT generate plans; it only validates them
  - Interactivity boundary: plan review is autonomous (post-PRD-APPROVED); no user prompts in plan-reviewer
  - R-COH-* rows are additive; rubric[] always has all R1–R8 present with no short-circuit
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-plan-prd-less-mode.prd.md` — Implementation Phases row 2:
  "Review + template" — Goal: `plan-reviewer` approves a PRD-less plan without PRD-orphaned HALTs — Success signal: `review.jsonl` shows R8 rows as passed with rationale; APPROVED flip occurs.

## Summary

Phase 2 delivers two tightly-coupled changes that enable `plan-reviewer` to accept a PRD-less DRAFT plan without false HALTs. First, `docs/context/plan-template.md` gains a description-mode branch: the `## Source PRD` section generalizes to a `## Source` section that holds EITHER a PRD reference (existing PRD mode, unchanged) OR the verbatim feature description (new description mode); the Acceptance Criteria format is extended to allow `**AC-A<i>:**` items with no `(PRD AC-N)` token when the plan was generated in description mode; and the template prose documents the minimum-3-AC floor. Second, `plugins/relay/agents/plan-reviewer.md` gains a description-mode detection and three R8 sub-check variants: when a plan's `## Source` section does not reference an `.prd.md` file, R8a/R8b/R8c each emit `passed: true` with an explicit "description-only mode" rationale recorded in `review.jsonl`, following the exact same `passed: true + reason` pattern established by the 2026-05-14 `phase_type=scaffold` exemption. A minimum-AC-count check (≥ 3 derived `AC-A<i>` items) is added as part of the R8 description-mode branch to match the R4 parity floor from PRD AC-9.

## User Story

```
As a relay developer or plugin user running plan-reviewer on a PRD-less DRAFT plan,
I want plan-reviewer to detect description mode and emit R8a/R8b/R8c as passed:true with rationale,
So that description-only plans are approved without false HALTs for missing-PRD reasons,
and the review.jsonl audit trail is preserved with explicit "description-only mode" evidence.
```

## Problem Statement

`plan-reviewer` currently performs three PRD-dependent sub-checks under R8: R8a verifies that the source PRD exists and is APPROVED; R8b verifies that every Acceptance Criteria item carries a `(PRD AC-N)` back-reference token; R8c verifies that the source PRD's row N has been back-filled with `in-progress` status and the plan path. A plan written in description mode (from Phase 1) has no source PRD: its `## Source` section holds a verbatim description, not a `.prd.md` path, and its AC items use `**AC-A<i>:**` format without `(PRD AC-N)` tokens. Without Phase 2's changes, every description-mode DRAFT plan would receive `CHANGES_REQUESTED` from the reviewer on all three R8 sub-checks — false positives that block the PRD-less flow entirely. Additionally, `docs/context/plan-template.md` currently hard-codes `## Source PRD` as section #1 and mandates the `**AC-A<i> (PRD AC-<N>):**` format in section #13, so the template itself does not yet represent a valid PRD-less plan shape.

## Solution Statement

Phase 2 introduces description-mode awareness at exactly two sites, both of which already have established precedents in the codebase. In `docs/context/plan-template.md`, section #1 is generalized from `## Source PRD` to `## Source` with a two-branch definition (PRD reference vs. verbatim description); section #13 adds the `**AC-A<i>:**` format alongside the existing `**AC-A<i> (PRD AC-<N>):**` format, with a note that the minimum-3-AC floor applies in both modes. In `plugins/relay/agents/plan-reviewer.md`, a description-mode detection block is added to Step 2 (before R8 sub-checks run): if the plan's `## Source` section does not reference a `.prd.md` file, the reviewer enters description mode and emits `passed: true` with an explicit "description-only mode" rationale for each of R8a, R8b, and R8c — then additionally checks that the plan has at least 3 `**AC-A<i>:**` items, emitting `CHANGES_REQUESTED` with a structured reason if the count is below 3. This mirrors the `phase_type=scaffold` exemption pattern at `plan-reviewer.md:309–319` exactly: the exemption is gated on a detectable plan-structural property (absence of a `.prd.md` reference in `## Source`), emits `passed: true` with a non-empty `reason` field, and is recorded in `review.jsonl` alongside all other rubric rows without short-circuiting. The R-COH-* layer (R-COH-TASK-AC-MISSING, R-COH-FILES-UNTOUCHED, etc.) operates unchanged on plan-internal `AC-A<i>` tokens regardless of mode, so no R-COH-* changes are needed.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature |
| Complexity | Low-Medium |
| Systems Affected | `docs/context/plan-template.md`, `plugins/relay/agents/plan-reviewer.md` |
| Dependencies | Phase 1 complete (plan-writer description-mode entrypoint shipped) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/relay-plan-prd-less-mode.prd.md` row 2 |
| phase_type | docs |

> **phase_type rationale:** Both files being changed are documentation/prompt-only markdown files (`plan-template.md` is a doc file; `plan-reviewer.md` is an agent-prompt markdown file with no runtime compilation). No application source files are being created or modified. VALIDATE commands for these changes are filesystem/grep-oriented checks, not test-framework invocations. This matches the `docs` phase_type signal exactly.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/relay-plan-prd-less-mode.prd.md` | 1–224 | Source PRD — AC-3 (plan shape), AC-4 (reviewer accepts PRD-less plan), AC-9 (minimum AC count) |
| P0 | `docs/context/plan-template.md` | 1–272 | The file being modified; section #1 (`## Source PRD`) and section #13 (`## Acceptance Criteria`) are the two change sites |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 210–241 | R8a/R8b/R8c sub-check definitions — the three checks gaining description-mode variants |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 300–325 | `R-COH-VALIDATE-FRAMEWORK-MISMATCH` phase-type exemption branch — the exact pattern to mirror for R8 description-mode exemption |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 276–290 | `R-COH-TASK-AC-MISSING` — reads plan-internal `AC-A<i>` tokens; confirms no change needed for description mode |
| P1 | `plugins/relay/agents/plan-writer.md` | 444–460 | Plan-writer's `## Source` section shape in description mode — defines what plan-reviewer must detect |
| P1 | `plugins/relay/agents/plan-writer.md` | 525–537 | Plan-writer's `AC-A<i>` format in description mode (no PRD AC-N token) and ≥3-item floor note |
| P2 | `PRPs/plans/relay-plan-prd-less-mode-phase-1-planning-entrypoint.review.jsonl` | 1–5 | Real review.jsonl showing `passed: true + reason` wire format in production |

## Patterns to Mirror

### Pattern 1: phase_type exemption branch emitting passed:true + reason

# SOURCE: plugins/relay/agents/plan-reviewer.md:309-319

```
- **Phase-type exemption branch:** if `plan_phase_type` (recorded in
  Phase 0) is `scaffold` or `docs`, emit a single `passed: true` row
  with `reason: "phase_type: <value>; VALIDATE commands are expected
  to use OS/filesystem tools rather than test-framework invocations
  for <value> phases — framework-mismatch check skipped"` and
  continue. Do NOT fail in this case. Rationale: scaffold and docs
  phases have no application code to exercise; their legitimate
  validation is filesystem-oriented (Test-Path, Select-String,
  Get-ChildItem, git check-ignore, npm install, npx astro check).
  Requiring a test-framework invocation here would produce only
  performative tests that assert on filesystem state.
```

**Used by:** Task 3 (adding the R8 description-mode exemption block in plan-reviewer.md). The description-mode R8 exemption mirrors this pattern exactly: condition on plan-structural property → emit `passed: true` with non-empty `reason` string → continue without failing.

---

### Pattern 2: plan-template ## Source PRD section (current PRD-mode shape)

# SOURCE: docs/context/plan-template.md:115-123

```
1. `## Source PRD`

   Bullet pointing at the PRD path + row N + Goal + Success signal.
   plan-reviewer R8a verifies the file exists and is APPROVED.

   Example:
   - `PRPs/prds/<feature>.prd.md` — Implementation Phases row N:
     "{Phase Name}" — Goal: {Goal line from PRD Phase Details} —
     Success signal: {Success signal line from PRD Phase Details}.
```

**Used by:** Task 1 (generalizing this section to `## Source` with a two-branch definition). The existing single-branch PRD-mode shape is retained verbatim as one branch; the description-mode branch is added alongside it.

---

### Pattern 3: plan-template Acceptance Criteria section (current PRD-mode AC format)

# SOURCE: docs/context/plan-template.md:209-213

```
13. `## Acceptance Criteria`

    Bulleted list. Every bullet must reference at least one PRD
    `AC-N` it derives from (R8b enforces). Format:
    `**AC-A<i> (PRD AC-<N>):** <statement>`.
```

**Used by:** Task 2 (extending the AC section definition to include the description-mode `**AC-A<i>:**` format and the minimum-3-AC floor note). The PRD-mode format is retained unchanged; the description-mode format is added as a conditional branch.

---

### Pattern 4: plan-writer description-mode ## Source section shape

# SOURCE: plugins/relay/agents/plan-writer.md:444-460

```
**When `description_mode = true` (description mode):**

Emit a `## Source` section (not `## Source PRD`) containing the
verbatim description text, with no PRD path, no row number, and no
Goal/Success-signal reference:

```
## Source

<verbatim description text from the $ARGUMENTS string>
```

The header is `## Source` only — not `## Source PRD`. The
description is the source of truth for this plan; plan-reviewer
rubric R8a/R8b/R8c do not apply in description mode (note this
explicitly in the plan body: "R8b does not apply in description
mode — no (PRD AC-N) token required").
```

**Used by:** Task 3 (detecting description mode in plan-reviewer). The reviewer identifies description mode by checking whether `## Source` holds a `.prd.md` path reference. This pattern defines the structural signal the reviewer reads.

---

### Pattern 5: R8a/R8b/R8c sub-check definitions (current PRD-mode)

# SOURCE: plugins/relay/agents/plan-reviewer.md:210-241

```
### R8 — PRD↔plan traceability (NEW, plan-stage exclusive)

Three sub-checks, all of which must pass:

- **R8a — Source PRD exists.** The plan's `## Source PRD` section
  names a real PRD file. Resolve the path relative to
  `<target_root>` (or accept the absolute path). The file must
  exist and end with `*Status: APPROVED*`. A missing or
  non-APPROVED PRD fails R8a.
- **R8b — AC traceability.** Every item in the plan's
  `## Acceptance Criteria` section must reference at least one
  PRD `AC-<N>` token. Format expected (matches what `plan-writer`
  emits): `**AC-A<i> (PRD AC-<N>):** <statement>`. Each cited
  PRD `AC-<N>` must actually exist in the source PRD's
  `## Acceptance Criteria (test scenarios)` section. A plan AC-A
  item with no PRD reference, or a reference to a non-existent
  PRD AC-N, fails R8b.
- **R8c — Source PRD back-fill.** Extract `<N>` from the plan
  filename suffix (`...-phase-<N>-<slug>.plan.md`). If the filename
  does not match this pattern (hand-renamed plan), R8c fails with
  reason `"plan filename does not match <feature>-phase-<N>-<slug>.plan.md
  pattern; rename the file or re-run /relay-plan"`. Otherwise, in
  the source PRD's Implementation Phases table, locate row `<N>` and
  verify:
  - `Status` cell is `in-progress` or `complete`.
  - `PRP Plan` cell contains the plan's relative path
    (`PRPs/plans/<basename>.plan.md`).
  A row still showing `pending` or `-` in `PRP Plan` fails R8c
  (plan-writer's Phase 5 back-fill did not run; structural defect).

R8 fails if any of R8a, R8b, R8c fails. The fail reason should
name which sub-check tripped and why.
```

**Used by:** Task 3 (adding the description-mode variant block immediately before the three sub-check prose, so the reviewer enters the exemption branch before evaluating R8a/R8b/R8c individually).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `docs/context/plan-template.md` | UPDATE | Generalize `## Source PRD` section #1 to a two-branch `## Source` definition; extend section #13 AC format to include `**AC-A<i>:**` for description mode with minimum-3 floor note |
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Add description-mode detection + R8a/R8b/R8c exemption variant (passed:true + rationale) + minimum-AC-count check (≥3 `AC-A<i>` items enforced in description mode) before the existing R8 sub-check prose |

## NOT Building (Scope Limits)

- **R-COH-* layer changes** — The Architecture Notes in the source PRD confirm that R-COH-TASK-AC-MISSING and other coherence checks operate on plan-internal `AC-A<i>` tokens unchanged; they need no description-mode branch. This phase leaves all R-COH-* checks untouched.
- **`plan-writer` changes** — Phase 1 already shipped the plan-writer description-mode entrypoint (`## Source` section, `AC-A<i>` format without `(PRD AC-N)` token, flat filename, no back-fill). Phase 2 only adds the reviewer-side and template-side acceptance of that output.
- **`/relay-plan` command changes** — Phase 0 input-type detection and description-mode precondition branch were delivered in Phase 1. Phase 2 touches only the reviewer agent and template.
- **`/relay-implement` chain changes** — Phase 3 owns P3 PRD-row check branch, D8 Mutation c no-op, implementer flat-filename tolerance, and code-reviewer AC-source substitution.
- **PRD-mode regression** — PRD-mode R8a/R8b/R8c is NOT modified. The description-mode exemption is strictly gated on the absence of a `.prd.md` reference in `## Source`; all PRD-mode plans continue through the existing R8 sub-checks unchanged.
- **A lightweight-PRD-under-the-hood fallback** — explicitly rejected in the PRD; description mode never synthesizes a PRD.
- **Minimum-AC floor outside R8 description-mode** — the ≥3 floor is a description-mode-only check (AC-9); PRD-mode plans already have the R8b per-AC traceability check as their quality floor.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/plan-template.md — generalize ## Source PRD section

- **ACTION**: Edit `docs/context/plan-template.md` to replace the existing single-branch `## Source PRD` section #1 definition with a two-branch `## Source` definition. The new text must:
  1. Rename the section header from `## Source PRD` to `## Source`.
  2. Define a PRD-mode branch: same content as before (bullet with PRD path + row N + Goal + Success signal; R8a verifies existence and APPROVED status).
  3. Define a description-mode branch: `## Source` section contains the verbatim feature description; no PRD path, no row number; R8a/R8b/R8c do not apply (noted explicitly); the section is recognized by plan-reviewer as description-mode when no `.prd.md` path appears.
  4. Update the "Relay adaptations" prose at item #2 (lines ~33–40) to note the dual-branch nature.
  5. Update the `## Plan body — structure` markdown example block (lines ~99–117) to show `## Source` (not `## Source PRD`) in the section list.
  - **Implements:** AC-A1 (plan-template Source section generalization), AC-A3 (plan shape conforms to template in description mode).

- **MIRROR**: Pattern 2 (current `## Source PRD` section shape) and Pattern 4 (plan-writer's description-mode `## Source` output) — retain the PRD-mode example verbatim as one branch; the description-mode branch shape is derived from Pattern 4.

- **VALIDATE**: `grep -n "## Source PRD" "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md" | wc -l` — must return `0` (the old heading is gone); and `grep -n "## Source" "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md" | head -5` — must show the generalized `## Source` heading in the body structure block.

### Task 2: UPDATE docs/context/plan-template.md — extend Acceptance Criteria section for description mode

- **ACTION**: Edit `docs/context/plan-template.md` section #13 (`## Acceptance Criteria`) to add a description-mode branch alongside the existing PRD-mode format:
  1. Retain the existing `**AC-A<i> (PRD AC-<N>):** <statement>` format as the PRD-mode branch.
  2. Add a description-mode branch: format `**AC-A<i>:** <statement>` with no `(PRD AC-N)` token.
  3. Add a note that a minimum of 3 `AC-A<i>` items is required in description mode (R4 parity floor; plan-reviewer's description-mode R8 variant enforces this).
  4. Add a note: "R8b (PRD AC-N token check) does not apply in description mode — plan-reviewer emits passed:true with rationale for R8b when the plan's `## Source` section does not reference a `.prd.md` file."
  - **Implements:** AC-A1 (template AC format generalization), AC-A3 (plan with derived `AC-A<i>` items conforms to updated template), AC-A2 (plan-reviewer ≥3 AC floor via AC-9).

- **MIRROR**: Pattern 3 (current PRD-mode AC section) — the PRD-mode text is retained verbatim; the description-mode branch is appended with conditional formatting.

- **VALIDATE**: `grep -n "AC-A<i>:" "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md"` — must return at least one match showing the bare `**AC-A<i>:**` format (no PRD token) in the template.

### Task 3: UPDATE plugins/relay/agents/plan-reviewer.md — add R8 description-mode detection + exemption block

- **ACTION**: Edit `plugins/relay/agents/plan-reviewer.md` to add a description-mode detection and exemption block immediately before the `### R8 — PRD↔plan traceability` sub-check prose (at line ~210). The block must:
  1. **Detection:** Read the plan's `## Source` section content. If it does NOT contain a reference to a file ending in `.prd.md` (i.e., no `<something>.prd.md` path appears in the section body), enter description mode for R8.
  2. **R8a description-mode exemption:** emit `{ "id": "R8a", "passed": true, "reason": "description-only mode — ## Source section holds a verbatim description, not a PRD path; R8a source-PRD-exists check does not apply" }` to `review.jsonl`.
  3. **R8b description-mode exemption:** emit `{ "id": "R8b", "passed": true, "reason": "description-only mode — AC-Ai items carry no (PRD AC-N) token by design; R8b AC-traceability check does not apply" }` to `review.jsonl`.
  4. **R8c description-mode exemption:** emit `{ "id": "R8c", "passed": true, "reason": "description-only mode — plan has no source PRD row to back-fill; R8c back-fill check does not apply" }` to `review.jsonl`.
  5. **Minimum AC count check (AC-9):** after the three exemptions, count the `**AC-A<i>:**` items in the plan's `## Acceptance Criteria` section. If the count is fewer than 3, emit `{ "id": "R8-desc-min-ac", "passed": false, "reason": "description-only mode requires ≥3 derived AC-Ai items; found <N>" }` and set the R8 verdict to CHANGES_REQUESTED. If the count is ≥3, emit `{ "id": "R8-desc-min-ac", "passed": true, "reason": "description-only mode; <N> derived AC-Ai items found (≥3 required)" }`.
  6. **Skip** the existing R8a/R8b/R8c sub-check prose for this plan — the exemption replaces them. Add a note directing the reviewer to skip to R-COH-* after emitting the description-mode R8 rows.
  7. Preserve the existing PRD-mode R8a/R8b/R8c prose entirely — description mode is a BRANCH, not a replacement.
  - **Implements:** AC-A2 (plan-reviewer accepts PRD-less plan; R8a/R8b/R8c emit passed:true + rationale; minimum AC count enforced).

- **MIRROR**: Pattern 1 (phase_type exemption branch emitting `passed: true` + reason — the exact structural model); Pattern 5 (existing R8a/R8b/R8c sub-check prose — must be preserved below the description-mode branch).

- **VALIDATE**: `grep -n "description-only mode" "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" | wc -l` — must return at least 3 matches (one per R8a/R8b/R8c exemption note).

### Task 4: UPDATE plugins/relay/agents/plan-reviewer.md — update frontmatter description and R8 hard-rule callout

- **ACTION**: Edit `plugins/relay/agents/plan-reviewer.md` to surface the description-mode R8 variant in two non-prose locations that are machine-readable or quick-reference:
  1. **Frontmatter `description:` field** (line 3): append ", with description-mode R8 variant (R8a/R8b/R8c → passed:true + rationale when no source PRD; ≥3 AC-Ai items enforced)" to the existing description string.
  2. **Step 2 opening prose** (the paragraph introducing R1–R8): add a note that "R8 has a description-mode variant — see the detection block above the R8 sub-checks."
  3. **Verify** the no-short-circuit invariant prose is still accurate: the description-mode R8 rows are appended to the same `rubric[]` array and all 8 R1–R8 ids are still emitted (R8a/R8b/R8c emit `passed: true` in description mode rather than failing); the "all R1–R8 always present, no short-circuit" contract is unchanged.
  - **Implements:** AC-A2 (review.jsonl audit trail with description-mode rationale recorded), AC-A4 (R-COH-* layer unmodified; only R8 rubric rows emitted in description mode with explicit rationale).

- **MIRROR**: Pattern 1 (the reason string convention: a single human-readable sentence explaining why the check does not apply); Pattern 5 (the hard-rule callout structure in plan-reviewer.md — no short-circuit language must remain).

- **VALIDATE**: `grep -n "description-only mode\|description-mode\|description mode" "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" | wc -l` — must return ≥ 5 matches (frontmatter description, Step 2 prose note, R8a/R8b/R8c exemption, min-AC-count check).

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```powershell
# Verify no broken ## Source PRD heading remains in plan-template.md
# (the old heading should be gone; only "## Source" should appear in the structure block)
Select-String -Path "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md" -Pattern "## Source PRD"

# Verify plan-template.md still has exactly 15 sections in the body structure block
# (Section count should not change — ## Source replaces ## Source PRD as section #1)
Select-String -Path "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md" -Pattern "^\d+\. ``## " | Measure-Object | Select-Object -ExpandProperty Count

# Verify plan-reviewer.md still has all R8a/R8b/R8c headings (PRD-mode not removed)
Select-String -Path "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" -Pattern "R8a|R8b|R8c"
```

### Level 2 — CONTENT_INVARIANTS

```powershell
# Verify description-mode AC format appears in plan-template.md (bare AC-Ai: with no PRD token)
Select-String -Path "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md" -Pattern "\*\*AC-A<i>:\*\*"

# Verify description-mode exemption appears in plan-reviewer.md for R8a
Select-String -Path "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" -Pattern "description-only mode"

# Verify minimum AC count check appears in plan-reviewer.md
Select-String -Path "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" -Pattern "3 derived AC"

# Verify R-COH-* layer references are still intact (no coherence checks removed)
Select-String -Path "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" -Pattern "R-COH-TASK-AC-MISSING|R-COH-FILES-UNTOUCHED|R-COH-VALIDATE-FRAMEWORK-MISMATCH"

# Verify no-short-circuit invariant prose still present in plan-reviewer.md
Select-String -Path "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" -Pattern "no short-circuit|no-short-circuit"
```

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

```powershell
# Dry-run: verify plan-reviewer can read a Phase 1 plan (description-mode) and the
# two modified files are parseable markdown (no syntax breaks).
# Check plan-template.md section count integrity
$templateContent = Get-Content "C:\repos\PRPs-agentic-eng\docs\context\plan-template.md" -Raw
$sectionMatches = [regex]::Matches($templateContent, "(?m)^\d+\. ``## ")
Write-Host "plan-template.md numbered sections: $($sectionMatches.Count) (expect 15)"

# Check plan-reviewer.md retains all 8 R* rubric IDs
$reviewerContent = Get-Content "C:\repos\PRPs-agentic-eng\plugins\relay\agents\plan-reviewer.md" -Raw
$r8Matches = [regex]::Matches($reviewerContent, "\bR8[abc]?\b")
Write-Host "plan-reviewer.md R8 references: $($r8Matches.Count) (expect ≥ 8)"

# Verify the Phase 1 plan file exists as the reference description-mode artifact
Test-Path "C:\repos\PRPs-agentic-eng\PRPs\plans\relay-plan-prd-less-mode-phase-1-planning-entrypoint.plan.md"
```

## Acceptance Criteria

> Note: This plan was produced from a source PRD (relay-plan-prd-less-mode.prd.md) in PRD mode. AC items below follow the standard `**AC-A<i> (PRD AC-<N>):**` format.

- **AC-A1 (PRD AC-3):** Given an updated `docs/context/plan-template.md`, when the plan body structure block is read, then section #1 is `## Source` (not `## Source PRD`) and its definition contains a two-branch specification: PRD-mode branch (bullet with `.prd.md` path + row N + Goal + Success signal; R8a verifies existence) and description-mode branch (verbatim description text; no PRD path; R8a/R8b/R8c noted as not applicable).

- **AC-A2 (PRD AC-4, AC-9):** Given a description-only DRAFT plan (with `## Source` holding a verbatim description and `AC-A<i>:` items without `(PRD AC-N)` tokens), when `plan-reviewer` runs, then `review.jsonl` contains rows with `"id": "R8a"`, `"id": "R8b"`, `"id": "R8c"` each with `"passed": true` and a non-empty `"reason"` field containing "description-only mode"; and if the plan has fewer than 3 `AC-A<i>` items, a row with `"id": "R8-desc-min-ac"` and `"passed": false` is emitted causing `CHANGES_REQUESTED`; if the plan has ≥3 items, the row has `"passed": true` and the plan is eligible for the APPROVED flip.

- **AC-A3 (PRD AC-3):** Given the updated `docs/context/plan-template.md`, when section #13 (`## Acceptance Criteria`) is read, then the definition explicitly documents BOTH formats: `**AC-A<i> (PRD AC-<N>):** <statement>` (PRD mode) and `**AC-A<i>:** <statement>` (description mode), with a note that description mode requires ≥ 3 items and that R8b does not apply.

- **AC-A4 (PRD AC-4):** Given a description-only plan reviewed by `plan-reviewer`, when the R-COH-* layer runs after R8, then all R-COH-* checks (R-COH-TASK-AC-MISSING, R-COH-FILES-UNTOUCHED, R-COH-VALIDATE-FRAMEWORK-MISMATCH, R-COH-PATTERN-SOURCE-MISSING, R-COH-MANDATORY-READING-MISSING) execute unchanged on the plan-internal `AC-A<i>` tokens and task bodies — no R-COH-* checks are skipped or modified; the no-short-circuit invariant is preserved for all rubric rows.

- **AC-A5 (PRD AC-2):** Given a PRD-mode DRAFT plan (with `## Source PRD` section naming a `.prd.md` file), when `plan-reviewer` runs after Phase 2's changes, then the reviewer does NOT enter the description-mode branch, R8a/R8b/R8c run exactly as before Phase 2, and the `review.jsonl` output is byte-identical to pre-Phase-2 behavior for the same input plan. (PRD-mode regression zero.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| R8 detection logic misclassifies a PRD-mode plan as description mode (a PRD path in `## Source PRD` not found because the header changed to `## Source`) | M | High — PRD-mode plans would get false-passed R8, defeating the traceability rubric | Detection reads the section CONTENT for a `.prd.md` suffix in any bullet/reference; the presence of `.prd.md` in the section body is the discriminator, not the section header alone; Task 3 must state this clearly |
| plan-template.md section count drifts from 15 after the heading rename | L | Medium — plan-reviewer R2 validates section order; a drift would cause R2 failures on all new DRAFT plans | Level 3 validation explicitly counts numbered sections in the template; must equal 15 |
| Minimum-AC count check (R8-desc-min-ac) ID not in the existing rubric[] id-set causes downstream tooling to reject unknown IDs | L | Low — rubric[] is additive per the 2026-04-28 decision; new IDs are allowed; the reviewer frontmatter documents the new ID | No change to tooling required; the 2026-04-28 decision explicitly allows additive IDs |
| PRD-mode R8b prose left referencing `## Source PRD` heading after the template renames it to `## Source` | M | Medium — the prose mismatch would confuse future plan-writer reads | Task 3 explicitly preserves the PRD-mode R8a/R8b/R8c prose AND updates any heading references in that prose to reflect the new `## Source` section name |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Divergence from plan-template.md section-header naming:** this plan itself uses `## Source PRD` (not `## Source`) in its source pointer because this plan was produced in PRD mode. The template change in Task 1 is forward-looking — existing APPROVED PRD-mode plans with `## Source PRD` remain valid; the template update applies to plans generated after Phase 2 ships.

**R8 ID naming convention:** The new minimum-AC row uses ID `R8-desc-min-ac` rather than a plain `R-COH-*` ID because it is logically part of the R8 rubric check (it fires only in the R8 description-mode branch) rather than an independent coherence check. This keeps the audit log readable: all R8-related rows appear together under `R8` / `R8a` / `R8b` / `R8c` / `R8-desc-min-ac`.

**Phase 2 is purely reviewer-side and template-side:** the plan-writer already emits the correct description-mode shape from Phase 1. Phase 2 makes the reviewer accept it. Phases 3 and 4 extend acceptance downstream into the implementation chain and documentation surface respectively.

**Dogfood opportunity:** after Phase 2 ships, run `plan-reviewer` against the Phase 1 plan (`relay-plan-prd-less-mode-phase-1-planning-entrypoint.plan.md`) to validate that R8a/R8b/R8c all emit `passed: true` with rationale in `review.jsonl`. This is the direct AC-A2 verification path.

*Generated: 2026-06-16*
*Approved: 2026-06-16*
*Implemented: 2026-06-16*
*Status: IMPLEMENTED*
