# Feature: Dogfood validation + cement (Phase 4 of reviewer-coherence-layer)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting validation phase (different shape from Phases 1-3 implementation phases — runs all 3 reviewers against existing artifacts, classifies TP/FP, gates feature release at ≤25% FP per reviewer); creation of relay's first dogfood-style validation artifact (`PRPs/reports/reviewer-coherence-layer/dogfood.md`); creation of relay's first synthetic regression fixture (`PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff`); conditional iteration on Phase 1-3 agent files if any reviewer's FP rate exceeds the gate
- Decisions found:
  - 2026-04-19 Interactivity boundary — Phase 4 runs the reviewers in their existing autonomous-or-interactive modes; no new dialog flows
  - 2026-04-19 Command surface (writer/reviewer split) — Phase 4 invokes the reviewers (via direct walk by the implementer; see Methodology in Notes) but does NOT modify the reviewer agent files unless FP > 25% triggers conditional iteration
  - 2026-04-25 Plan filenames carry phase number + slug — this plan uses `reviewer-coherence-layer-phase-4-dogfood-validation-cement.plan.md`
  - 2026-04-19 PRP artifacts under `PRPs/`, never `.claude/` — dogfood report at `PRPs/reports/reviewer-coherence-layer/dogfood.md`; fixtures at `PRPs/reports/reviewer-coherence-layer/fixtures/`
  - 2026-04-28 AC-10 of plan-authoring.prd.md evolves (Phase 2 of this feature) — bound for Phase 4's plan-reviewer dogfood; the new R-COH-* rows are part of what Phase 4 measures
  - 2026-04-28 code-reviewer gains Task tool + AC-10 of implementation-authoring.prd.md evolves (Phase 3 of this feature) — bound for Phase 4's code-reviewer dogfood; both contract evolutions are exercised by Phase 4's measurements
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — dogfood artifacts strictly under `PRPs/reports/`
  - "Activating the TDD track by heuristic" — Phase 4 doesn't touch methodology.md
- Applicable architectural rules:
  - Interactivity boundary at PRD approval (preserved; Phase 4 runs measurements, not new pipeline stages)
  - PRP artifact paths under `PRPs/` (preserved)
  - `documentation/AGENTS.md` §6 three-file registration rule (Phase 4 may extend Phases 1-3's Unreleased changelog block with the cement decision; if no rule changes are needed, the cement is just an annotation in the existing block)
- Result: PROCEED
```

> **Decision Gate note — Phase 4 is structurally different from Phases 1-3.** Phase 4 doesn't ship new agent code or contract evolutions. It runs the layer shipped by Phases 1-3 against existing APPROVED artifacts, classifies findings TP/FP, computes FP rate per reviewer, and gates feature release at ≤25% FP per reviewer (per AC-6 of the source PRD). The deliverable is one new report file plus one (or more) synthetic regression fixture(s); the conditional iteration on agent files only fires if FP exceeds the gate. The cement decision (PASS / FAIL) closes the feature.

## Source PRD

- `PRPs/prds/reviewer-coherence-layer.prd.md` — Implementation Phases row 4: "Dogfood validation + cement" — Goal: prove the layer is calibrated before cementing as contract — Success signal: AC-6 satisfied (FP ≤25% per reviewer in Real-world section, ≥1 TP per reviewer).

## Summary

Run all three reviewer agents (post-Phase-1/2/3 with the additive R-COH-* layer) against existing APPROVED artifacts in the repository: ≥3 PRDs for prd-reviewer dogfood (5 candidates available); ≥3 plans for plan-reviewer dogfood (11 candidates available); ≥2 real code diffs for code-reviewer dogfood (5 candidates available — implementation-authoring Phases 1+2 + reviewer-coherence-layer Phases 1+2+3, recoverable via git history). Author ≥1 synthetic regression fixture for code-reviewer at `PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff` (deliberately triggers `R-COH-DEAD-IMPORT` + `R-COH-COMMENT-MISMATCH` to validate the deterministic checks + sub-agent dispatch). Manually classify each emitted R-COH-* finding as TP (true positive — real intra-artifact contradiction the layer correctly caught) or FP (false positive — finding that doesn't reflect a real contradiction on inspection). Compute FP rate per reviewer, computed only over the real-world section (synthetic fixtures accounted separately per the source PRD's D7). Write `PRPs/reports/reviewer-coherence-layer/dogfood.md` with the canonical 5-section shape (Methodology / Real-world dogfood / Regression fixtures / Headline FP rate / Cement decision). If FP > 25% for any reviewer: apply DeepSource-style iteration (deny-list first, then rule tightening, rule removal as last resort); re-run that reviewer's sample; document the iteration. Final cement: extend `documentation/changelog.html`'s Unreleased block with a "Phase 4 cement: PASS — feature ready for release" annotation.

## User Story

As a relay operator deciding whether to merge the reviewer-coherence-layer feature into production use, I want a dogfood report that empirically demonstrates the new R-COH-* layer's TP/FP rate against existing repository artifacts, so I can make an informed cement decision (release-ready vs. iterate-and-re-measure) backed by concrete evidence rather than implementation-time confidence claims alone.

## Problem Statement

Phases 1, 2, and 3 of the reviewer-coherence-layer feature shipped an additive coherence-checking layer on three reviewer agents with substantial token surface (R-COH-* IDs added across all three; sub-agent factoring for code-reviewer; two contract evolutions in `docs/decisions.md`). The layer is **functional** (validated by Phases 1-3's grep + JSON parse + manual sanity walks) but its **accuracy** — the rate at which it surfaces real contradictions vs. fabricated/spurious findings — has not been empirically measured. Without such measurement, the source PRD's hypothesis (additive layer reduces intra-artifact coherence defects without exceeding industry-baseline FP rates) is unfalsifiable. AC-6 of the source PRD makes this measurement the explicit release gate. Without Phase 4 satisfying AC-6, the feature is shipped in name only — its tangible value (or noise) for downstream consumers is unmeasured.

## Solution Statement

Execute a single dogfood pass: walk each reviewer's R-COH-* layer mentally (the implementer adopts the reviewer's role, since the prd-reviewer's `already_approved` precondition and the absence of code-reviewer DRAFT plans block direct command invocation against APPROVED artifacts; this matches the Phase 1+2+3 reports' "Manual sanity walk" sections, scaled up). For each artifact in the sample, record every R-COH-* finding the reviewer would emit, classify as TP/FP with verbatim evidence quotes, and compute the per-reviewer FP rate over real-world artifacts only (synthetic fixtures accounted in their own section). Author one synthetic regression fixture for code-reviewer that deliberately exercises specific deterministic checks (per source PRD D7's split accounting). Write the dogfood report to `PRPs/reports/reviewer-coherence-layer/dogfood.md` with the canonical 5-section shape designed by Phase 4 (no precedent exists). If any reviewer's FP rate exceeds 25%, apply the DeepSource methodology (deny-list → rule tightening → rule removal as last resort) and re-run that reviewer's sample, documenting the iteration in the report. Final cement annotation to `documentation/changelog.html`'s Unreleased block confirms the feature is release-ready.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Validation phase + new report artifact + new synthetic fixture |
| Complexity | Medium-High (no agent file changes in the happy path — but methodology design + manual classification of dozens of findings + new artifact shapes from scratch) |
| Systems Affected | `PRPs/reports/reviewer-coherence-layer/dogfood.md` (NEW); `PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff` (NEW); conditionally `plugins/relay/agents/{prd,plan,code}-reviewer.md` and `plugins/relay/agents/code-reviewer-semantic.md` (only if FP > 25% triggers iteration); `documentation/changelog.html` (cement annotation) |
| Dependencies | Phases 1, 2, 3 all complete (the layer must exist on all three reviewers + code-reviewer-semantic sub-agent + code-review-registries.md before Phase 4 can measure them) |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/reviewer-coherence-layer.prd.md` Implementation Phases row 4 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| 1 | `PRPs/prds/reviewer-coherence-layer.prd.md` | 79 (AC-6 verbatim), 178 (Architecture Notes for dogfood report shape), 236 (D7 — synthetic fixture composition) | The release gate AC-6, the canonical section names ("Real-world dogfood", "Regression fixtures"), and the synthetic-vs-real accounting separation. |
| 1 | `PRPs/reports/reviewer-coherence-layer/phase-1-implementation.md` | full file (especially the "Manual sanity walk" section) | Structural cousin for Phase 4's dogfood report; the sanity walks established the per-artifact walking pattern Phase 4 scales up. |
| 1 | `PRPs/reports/reviewer-coherence-layer/phase-2-implementation.md` | full file (especially the "Manual sanity walk" section) | Same — Phase 2's mini-dogfood walk against Phase 1's archived plan is a template for Phase 4's full dogfood entries. |
| 1 | `PRPs/reports/reviewer-coherence-layer/phase-3-implementation.md` | full file (especially the "Manual sanity walk" section) | Same — Phase 3's walk against the implementer.md diff is a template for the code-reviewer dogfood entries. |
| 1 | `plugins/relay/agents/prd-reviewer.md` | 153–260 (the Phase 1 R-COH-* section) | The exact rubric Phase 4's prd-reviewer dogfood walks. Each `R-COH-*` ID's check semantics + K=5 prompt discipline. |
| 1 | `plugins/relay/agents/plan-reviewer.md` | 245–411 (the Phase 2 R-COH-* section) | Same — for plan-reviewer dogfood. |
| 1 | `plugins/relay/agents/code-reviewer.md` | the Phase 3 R-COH-* section (between R-X and `## Phase 3 — Arbitration mode`) | Same — for code-reviewer dogfood. The 4 deterministic checks + sub-agent dispatch contract. |
| 1 | `plugins/relay/agents/code-reviewer-semantic.md` | full file | The sub-agent's K=5 contract that code-reviewer dogfood exercises. Output schema + K=5 ID taxonomy + dedicated R-COH-TASK-CONTRADICTION. |
| 1 | `docs/context/code-review-registries.md` | full file | The 4-path default-relay allowlist for `R-COH-REGISTRY-MISSING`. Phase 4's code-reviewer dogfood exercises this against the implementation-authoring + reviewer-coherence-layer diffs (some of which created new files in registered directories). |
| 2 | `docs/decisions.md` | the two 2026-04-28 entries (Phase 2 plan-authoring AC-10; Phase 3 combined D11 + AC-10 of implementation-authoring) | Phase 4 dogfood findings that prompt calibration changes must cite these entries. The "Areas affected" lines bound what Phase 4 may modify. |
| 2 | `plugins/relay/agents/prd-writer.md` | 383–385 | Verbatim TDD routing strings (canonical source) — required for the plan's Notes section by R5 of plan-reviewer. |
| 2 | `PRPs/prds/*.prd.md` | trailing status lines (must all be `*Status: APPROVED*`) | The 5 PRDs that constitute the prd-reviewer dogfood sample. |
| 2 | `PRPs/plans/completed/*.plan.md` | trailing status lines | The 11 plans that constitute the plan-reviewer dogfood sample. |
| 3 | `https://deepsource.com/blog/how-deepsource-ensures-less-false-positives` | - | Production methodology for FP > threshold response: static deny-list → contextual filter → analyzer logic change. Phase 4's "If FP > 25%" branch follows this sequence. |
| 3 | `https://www.datadoghq.com/blog/using-llms-to-filter-out-false-positives/` | - | TP/FP precision-recall tension for LLM judges. Phase 4's calibration recommendations cite this. |
| 3 | `https://arxiv.org/html/2601.18844v1` | - | Two-stage manual review for TP/FP classification (Baidu, 2024-2025). Phase 4 uses single-classifier (the implementer) per the source PRD's D3 scoping; cites this as the conscious deviation from industry-standard double-rating. |

## Patterns to Mirror

### Pattern 1 — Implementation report section structure (Phase 1+2+3's reports)

```markdown
# SOURCE: PRPs/reports/reviewer-coherence-layer/phase-1-implementation.md:1-30
# Implementation Report — Phase 1: prd-reviewer coherence

**Plan**: …
**Source PRD**: …
**Branch**: …
**Date**: …
**Status**: COMPLETE

---

## Summary
{paragraph}

## Tasks Completed
{table: # | Task | File | Status}

## Validation Results
{table: Level | Check | Result | Details}

## Files Changed
{table}

## Deviations from Plan
{numbered list with rationale}

## Issues Encountered
{numbered list}

## Tests Written
{prose or "no tests" justification}

## Manual sanity walk
{per-artifact walk through the rubric}

## PRD Progress
{table showing phase status}

## Next Steps
{checklist}
```

Used by Task 9 to shape `PRPs/reports/reviewer-coherence-layer/dogfood.md`. The skeleton is preserved (Summary / Methodology / per-section measurement tables / classification with evidence / decision); but Validation Results becomes per-artifact TP/FP classification, Files Changed becomes the dogfood report's own files-changed minus the conditional iteration, Manual sanity walk is replaced with the formal per-artifact walks under the "Real-world dogfood" section heading.

### Pattern 2 — Per-artifact manual sanity walk (Phase 1+2+3's report sections)

```markdown
# SOURCE: PRPs/reports/reviewer-coherence-layer/phase-3-implementation.md (the "Manual sanity walk" section)
## Manual sanity walk of the new layer (Level 3 substitute)

Walking the new R-COH-* layer + sub-agent dispatch mentally against
the implementation-authoring Phase 1 diff …:

- **R-COH-DEAD-IMPORT**: implementer.md is a markdown agent file with
  no imports. Check would emit `passed: true` with reason "language
  not supported by ast-grep; check skipped" …
- **R-COH-CALLER-DRIFT**: same — markdown has no signature changes.
  `passed: true` (no callers to drift).
- …
```

Used by Tasks 1, 2, 3 (the per-reviewer walks) to produce the dogfood entries. Phase 4's full version is more rigorous than the Phase-1-2-3 reports' mini-walks: each finding gets explicit TP/FP classification with verbatim evidence quote, not just an expected outcome. The walking pattern itself (one bullet per check, per artifact) is preserved.

### Pattern 3 — AC-6 verbatim (the gate Phase 4 must satisfy)

```markdown
# SOURCE: PRPs/prds/reviewer-coherence-layer.prd.md:79
- **AC-6 dogfood report exists with thresholds met:** Given Phase 4
  is complete, when `PRPs/reports/<feature>/dogfood.md` is read,
  then it contains a "Real-world dogfood" section listing ≥3 PRDs
  / ≥3 plans / ≥2 real code diffs (each finding classified TP/FP
  with evidence), a "Regression fixtures" section with ≥1 synthetic
  diff exercising specific `R-COH-*` checks (with expected outcomes),
  AND the headline FP rate per reviewer (computed only over
  real-world artifacts) is ≤25% per reviewer AND ≥1 TP per reviewer.
```

Used by Task 9 to drive the report's required sections + Task 7 to drive the FP rate computation. Every required clause maps to one specific section of `dogfood.md`; the implementer cross-checks against this AC at write time.

### Pattern 4 — DeepSource FP-exceedance response sequence

```markdown
# SOURCE: https://deepsource.com/blog/how-deepsource-ensures-less-false-positives
First: static deny-list of (issue-type, filename) pairs.
Second: contextual filter requiring multiple parameters (not just file path).
Third: analyzer logic change (rule tightening).
Last resort: rule removal entirely.
```

Used by Task 8 (the conditional iteration branch). When Phase 4 finds FP > 25% for a reviewer, the iteration follows this sequence — start with the cheapest intervention (deny-list entry in the agent file or the registry) and escalate only if needed.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `PRPs/reports/reviewer-coherence-layer/dogfood.md` | CREATE | Phase 4 core deliverable. The dogfood report itself with the canonical 5-section shape designed by this plan. AC-6 of the source PRD verifies this file's content. |
| `PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff` | CREATE | New synthetic regression fixture for code-reviewer per D7. Triggers `R-COH-DEAD-IMPORT` + `R-COH-COMMENT-MISMATCH` deliberately; expected outcomes annotated in the dogfood report's "Regression fixtures" section. |
| `documentation/changelog.html` | UPDATE | Cement annotation: extend Phases 1+2+3's Unreleased block with a "Phase 4 cement: PASS — feature release-ready" annotation in the Notes paragraph. If FP > 25% triggered iteration, the iteration is also documented here. |
| `plugins/relay/agents/prd-reviewer.md` | UPDATE (conditional) | Only modified if Phase 4's prd-reviewer dogfood finds FP > 25% per Task 8's iteration branch. Likely no-op given the rigor of Phase 1's design. |
| `plugins/relay/agents/plan-reviewer.md` | UPDATE (conditional) | Same — only modified if plan-reviewer FP > 25%. |
| `plugins/relay/agents/code-reviewer.md` | UPDATE (conditional) | Same — only modified if code-reviewer parent FP > 25%. |
| `plugins/relay/agents/code-reviewer-semantic.md` | UPDATE (conditional) | Same — only modified if code-reviewer-semantic K=5 pass FP > 25% (specifically: padding, fabrication, or other prompt-calibration issues surface). |

## NOT Building (Scope Limits)

- **New agent files or new sub-agents.** Phase 3 was the last implementation phase. Phase 4 measures what's shipped; it does not extend the agent surface.
- **Modification of R1–R7 / R1–R8 / R-S/R-L/R-SEM/R-X rubric definitions.** The byte-identical invariant from Phases 1-3 is preserved by Phase 4 (the dogfood doesn't touch those definitions).
- **Schema changes to `*.review.jsonl` / `*.code-review.jsonl`** — the rubric[] array shape is unchanged. Phase 4 only reads jsonl files (when they exist post-dogfood) and adds rows to the dogfood.md report.
- **Mutation of APPROVED PRDs** — neither for measurement (the dogfood walks the PRDs read-only) nor for contract evolution (Phases 2-3 already evolved AC-10 and D11; Phase 4 doesn't introduce new evolutions in the happy path).
- **Repo-wide drift terminology measurement** — out of scope of source PRD; Phase 4 measures only the layer's intra-artifact + 1-hop checks.
- **Real production runs / telemetry** — out of source PRD's MVP scope (Could-item per Open Questions). Phase 4 is a one-shot dogfood, not a continuous measurement system.
- **Cement-target ≤10% reassess pass** — that's the post-MVP reassess trigger. Phase 4 measures against the MVP gate (≤25%) only. The cement-target ≤10% is documented as a future reassess in the dogfood report's "Cement decision" section.
- **Promoting plan-writer or code-reviewer-semantic to additional `<h3>` documentation sections beyond what Phases 1-3 already shipped** — out of Phase 4 scope. The fast-follow gap noted in Phase 2's report (plan-writer shipped section in agents.html) remains for a future feature.

## Step-by-Step Tasks

### Task 1: Walk prd-reviewer's R-COH-* layer against ≥3 APPROVED PRDs; classify findings

**ACTION**: For each PRD in the dogfood sample (recommend: `PRPs/prds/test-runner.prd.md`, `PRPs/prds/prd-authoring.prd.md`, `PRPs/prds/plan-authoring.prd.md`; ≥3 required, with ≥2 spare in case any becomes ineligible), walk the prd-reviewer R-COH-* layer mentally:

  1. Read the PRD body (typically ~200-700 lines).
  2. For each deterministic check (`R-COH-NUMBER-DRIFT`, `R-COH-SECTION-REF-MISSING`), execute the check's semantics by hand: extract numbers from tables vs. prose mentions for NUMBER-DRIFT; extract defined section/AC/phase tokens vs. cited tokens for SECTION-REF-MISSING. Record each finding with verbatim evidence quote (`file:line` of the contradicting fragment).
  3. For each K=5 ID class (`R-COH-AC-CONTRADICT`, `R-COH-METRIC-HYPOTHESIS-DECOUPLED`, `R-COH-SOLUTION-DETAIL-DRIFT`, `R-COH-DECISIONS-CONTRADICT`, `R-COH-OTHER-INTERNAL-CONTRADICTION`), do the K=5 LLM judgment pass mentally: read the named sections of the PRD looking for contradictions; cap at 5 findings total; require verbatim quotes from both contradicting sides per finding; return `[]` (no findings) when no real contradictions exist.
  4. For each finding, classify TP (true positive — the contradiction is real and matches the check's semantics) or FP (false positive — the finding either fabricates a contradiction that doesn't exist on inspection, OR triggers under a check whose semantics don't fit the actual content). Record the classification with one-line rationale.
  5. Produce a per-PRD finding list (TP and FP rows; format defined in Pattern 1's adapted skeleton).

**MIRROR**: Pattern 2 (the per-artifact manual sanity walk from Phase 1+2+3 reports). Phase 4's per-PRD walks are scaled-up versions with explicit TP/FP classification.

**VALIDATE**: After this task, the dogfood.md draft (Task 9) must contain ≥3 prd-reviewer subsections under "Real-world dogfood § prd-reviewer", each with:
- The PRD path (verifying it exists and is APPROVED — `tail -1 <prd-path> == "*Status: APPROVED*"`).
- A list of R-COH-* findings with `id`, `passed: true|false`, `reason`, `file`, `line`.
- TP/FP classification per finding.
- Total findings count + TPs + FPs.

### Task 2: Walk plan-reviewer's R-COH-* layer against ≥3 completed plans; classify findings

**ACTION**: Mirror Task 1's structure for plan-reviewer. Recommend ≥3 plans from `PRPs/plans/completed/`: `implementation-authoring-phase-1-implementer-agent.plan.md`, `implementation-authoring-phase-2-code-reviewer-agent.plan.md`, `reviewer-coherence-layer-phase-1-prd-reviewer-coherence.plan.md` (the Phase 1 plan from this very feature — provides cross-feature variety + tests the layer against a known-good plan).

  Walk each plan through the 5 deterministic R-COH-* checks (`R-COH-TASK-AC-MISSING`, `R-COH-FILES-UNTOUCHED`, `R-COH-VALIDATE-FRAMEWORK-MISMATCH` — silent-degradation when `test_frameworks: []` so it WILL emit `passed: true` with reason on relay artifacts, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`) + the K=5 LLM pass over 5 plan-specific IDs (`R-COH-SUMMARY-TASKS-DRIFT`, `R-COH-AC-TASK-DECOUPLED`, `R-COH-PATTERN-TASK-DRIFT`, `R-COH-MANDATORY-READING-IRRELEVANT`, `R-COH-OTHER-INTERNAL-CONTRADICTION`).

  Classify TP/FP per finding.

**MIRROR**: Pattern 2 (the per-artifact manual sanity walk).

**VALIDATE**: dogfood.md draft must contain ≥3 plan-reviewer subsections under "Real-world dogfood § plan-reviewer", each with the same shape as Task 1's prd-reviewer subsections.

### Task 3: Walk code-reviewer's R-COH-* layer against ≥2 real code diffs; classify findings

**ACTION**: Identify ≥2 real diffs via `git log` on the `development` branch. Recommend: the implementation-authoring Phase 1 diff (created `implementer.md`) and Phase 2 diff (created `code-reviewer.md`). Recover each via `git show <commit>` or `git diff <base>..<head>`.

  For each diff, walk:

  1. The 4 deterministic R-COH-* checks (`R-COH-DEAD-IMPORT`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-REGISTRY-MISSING`):
     - DEAD-IMPORT: relay agent files are markdown — emit `passed: true` with reason "language not supported by ast-grep; check skipped".
     - CALLER-DRIFT: markdown has no function signatures — `passed: true`.
     - CONFIG-DANGLING: relay agent files don't reference config keys via the language-agnostic patterns — `passed: true`.
     - REGISTRY-MISSING: this is the **substantive check** for relay diffs. New file `plugins/relay/agents/implementer.md` requires registration in `plugins/relay/commands/` (per `code-review-registries.md`) — confirm if `relay-implement.md` was created in the same diff or earlier. If earlier, `passed: true`; if not, `passed: false` (but for Phase-1+2 of implementation-authoring this should pass, since those diffs presumably created their commands too).
  2. The sub-agent dispatch (`code-reviewer-semantic` via `Task`):
     - K=5 pass: walk for `R-COH-COMMENT-MISMATCH` (look at HTML/markdown comments contradicting body), `R-COH-TEST-NAME-LIES` (no tests in markdown agents), `R-COH-OTHER-INTERNAL-CONTRADICTION`.
     - Dedicated R-COH-TASK-CONTRADICTION: compare the diff content against the source plan task description — does the implementer.md / code-reviewer.md actually deliver what the plan task said?
     - R-COH-SEMANTIC-DEGRADED only fires on unparseable sub-agent return — for a manual walk this is N/A.
  3. Classify TP/FP per finding.

**MIRROR**: Pattern 2 (manual sanity walk; Phase 3's report has the closest precedent for code-reviewer walks).

**VALIDATE**: dogfood.md draft must contain ≥2 code-reviewer subsections under "Real-world dogfood § code-reviewer", each with the same shape. Plus `git log --oneline development | head -20` output preserved as a footnote (or in a sub-section of the report) so future readers can re-recover the diffs.

### Task 4: Author the synthetic regression fixture for code-reviewer

**ACTION**: Create `PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff` — a small (~30-line) unified diff in standard `git diff` format that deliberately introduces ≥2 contradictions deterministic R-COH-* checks should catch. Recommended content: a new Python file with (a) an unused `import os` near the top (triggers `R-COH-DEAD-IMPORT`), (b) a comment `# Returns the user's email` immediately above a function that returns `self.id` (triggers `R-COH-COMMENT-MISMATCH` in the K=5 pass), (c) a config reference `os.environ["MISSING_KEY"]` with no corresponding config file in the diff (triggers `R-COH-CONFIG-DANGLING`).

  Annotate expected outcomes in the dogfood.md "Regression fixtures" section (Task 9): R-COH-DEAD-IMPORT `passed: false`, R-COH-COMMENT-MISMATCH `passed: false`, R-COH-CONFIG-DANGLING `passed: false`, others `passed: true`. The fixture is a determinism-validation tool; its findings are accounted SEPARATELY from the real-world FP rate (D7 of source PRD).

**MIRROR**: No precedent. Phase 4 designs the format. The fixture is a unified-diff format file; the dogfood.md "Regression fixtures" section explains the expected outcomes inline.

**VALIDATE**: `test -f PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff && echo OK` must print OK. The file must be a valid unified diff (parseable by `git apply --check` or visually obvious diff format with `+/-` line prefixes and `@@ ... @@` hunk headers). The dogfood.md "Regression fixtures" section must reference this file by path.

### Task 5: Walk code-reviewer's R-COH-* layer against the synthetic fixture; classify findings (separate accounting)

**ACTION**: Apply Task 3's walking methodology to the synthetic fixture from Task 4. Verify the deterministic R-COH-DEAD-IMPORT, R-COH-CONFIG-DANGLING fire (`passed: false`) as designed. Verify the sub-agent's K=5 pass would flag R-COH-COMMENT-MISMATCH (`passed: false`) as designed. Verify R-COH-CALLER-DRIFT, R-COH-REGISTRY-MISSING, R-COH-TASK-CONTRADICTION pass (the fixture doesn't trigger those).

  Document each finding in the dogfood.md "Regression fixtures" section with explicit "Expected: ... | Actual: ..." columns. The synthetic fixture findings DO NOT count toward the headline FP rate (per D7); they validate the determinism of the deterministic checks + the K=5 pass's prompt discipline.

**MIRROR**: Pattern 2 (manual walk), with the addition of expected-vs-actual columns specific to synthetic fixtures.

**VALIDATE**: dogfood.md "Regression fixtures" section must contain a per-finding table with columns `id | expected_passed | actual_passed | match (✓/✗)`. All matches must be ✓ — if any is ✗, the deterministic checks have a bug Phase 4 must surface (Task 8's iteration branch fires).

### Task 6: Compute headline FP rate per reviewer (real-world section only)

**ACTION**: From the per-PRD, per-plan, per-diff finding lists in Tasks 1-3, aggregate per reviewer:

  - Total findings count (TPs + FPs across all artifacts in that reviewer's sample).
  - TPs count.
  - FPs count.
  - FP rate = FPs / (TPs + FPs). Express as percentage rounded to 1 decimal.
  - ≥1 TP requirement (per AC-6): satisfied if TPs ≥ 1, else fail.
  - Pass/fail vs ≤25% gate.

  The headline FP rate is computed ONLY over the real-world section (synthetic fixtures from Task 5 are NOT included in this calculation per D7).

  Produce the FP rate table for the dogfood.md "Headline FP rate" section.

**MIRROR**: No specific precedent. The table format is standard (Reviewer | Sample size | Total findings | TPs | FPs | FP rate | ≥1 TP | Gate ≤25%). Implementation is straight arithmetic from Tasks 1-3 outputs.

**VALIDATE**: The dogfood.md "Headline FP rate" section table has 3 rows (one per reviewer) with all 7 columns populated. Each row's `Gate ≤25%` cell is either `PASS` (FP rate ≤25%) or `FAIL` (FP rate > 25%). If any reviewer is FAIL, Task 8's iteration branch fires.

### Task 7: Produce calibration recommendations + cement-target reassess plan

**ACTION**: Based on Tasks 1-3 findings + Task 6 FP rates, produce a "Findings & Recommendations" section in the dogfood.md report covering:

  - **Calibration insights**: which check classes had higher TP/FP ratios? Which surface the most "borderline" findings (ambiguous TP/FP)? Which are silent (zero findings across the sample — possibly because the sample doesn't exercise them)?
  - **Suggested rule adjustments** (if any): per the DeepSource sequence (deny-list first, then rule tightening, removal as last resort). Cite the specific R-COH-* IDs and the suggested action. If FP rate is comfortably under 25% AND ≥1 TP is achieved, the recommendation is "no changes; cement at MVP threshold; reassess against ≤10% target after N=10-20 production runs".
  - **Cement-target reassess plan**: when the team should re-run dogfood against new artifacts (post-N production runs) to reassess against ≤10%. Cite source PRD's Should-item.

**MIRROR**: No specific precedent. The section design follows the source PRD's Architecture Notes for what to include.

**VALIDATE**: dogfood.md "Findings & Recommendations" section contains the three subsections (Calibration insights / Suggested rule adjustments / Cement-target reassess plan) with at least 1 paragraph per subsection.

### Task 8: (Conditional) Iterate on rules if FP > 25% per any reviewer

**ACTION**: This task fires ONLY if Task 6's FP rate table has any row with `Gate ≤25% = FAIL`. The iteration follows the DeepSource methodology (Pattern 4):

  1. **First**: Add a static deny-list entry. For example, if `R-COH-AC-CONTRADICT` produces FPs on cross-AC references that legitimately reference each other, add a deny-list pattern in the agent file's K=5 prompt (e.g., "do NOT flag AC-X / AC-Y pairs as contradictions when both ACs are cited together by a third AC-Z that explicitly resolves them"). This is a small Edit to the agent file.
  2. **Second** (if deny-list insufficient): Tighten the rule by adding contextual filters. Example: require the K=5 prompt to additionally check that the verbatim quotes are from non-adjacent paragraphs (avoid flagging stylistic redundancy as contradiction).
  3. **Third** (if tightening insufficient): Remove the rule (R-COH-* ID dropped from the agent file).
  4. After any iteration, re-run that reviewer's sample (Tasks 1-3 walk again, classify, recompute FP rate).
  5. Document the iteration in the dogfood.md "Iteration log" section (NEW subsection added if Task 8 fires) with: which check changed, what action was taken, the new FP rate.
  6. Iterate until FP ≤25% per all reviewers OR until 3 iterations have been attempted (then escalate to a fast-follow design review — this is the "abort" condition).

  In the happy-path case (no FP > 25%), Task 8 is a no-op and the dogfood.md "Iteration log" section is omitted.

**MIRROR**: Pattern 4 (DeepSource FP-exceedance response sequence). Used to drive the iteration order.

**VALIDATE**: If Task 8 was a no-op (happy path), `grep -c "Iteration log" PRPs/reports/reviewer-coherence-layer/dogfood.md` must equal `0`. If Task 8 fired, the section must list each iteration with the check changed + action + new FP rate, and the final FP rate per reviewer must be ≤25% (or the abort condition documented).

### Task 9: Write `PRPs/reports/reviewer-coherence-layer/dogfood.md` with all sections

**ACTION**: Assemble the dogfood report using the canonical 5-section shape designed by Phase 4 (no precedent exists). Sections in order:

  1. **Title + metadata**: `# Dogfood Report — reviewer-coherence-layer`, plan path, source PRD path, date, status (PASS / FAIL).
  2. **Summary**: 1 paragraph synthesizing Tasks 1-7 outcomes.
  3. **Methodology**: how the dogfood was performed (single-classifier — the implementer; manual walk per artifact; classification rubric for TP/FP; verbatim evidence requirement; sample selection rationale; cite the Baidu 2024-2025 paper as the conscious deviation from industry-standard double-rating, justified by the source PRD's D3 single-pass scope).
  4. **Real-world dogfood**:
     - 4.1 prd-reviewer subsections (≥3 PRDs)
     - 4.2 plan-reviewer subsections (≥3 plans)
     - 4.3 code-reviewer subsections (≥2 real diffs)
  5. **Regression fixtures**:
     - 5.1 Fixture description: `synthetic-code-reviewer-fixture-1.diff` content + the 3 deliberate contradictions
     - 5.2 Fixture findings table (expected vs. actual per check)
     - 5.3 Determinism verdict (all checks fire as expected, or the issue is documented)
  6. **Headline FP rate** (Task 6's table):
     - Per-reviewer row with 7 columns
     - Gate verdict (PASS / FAIL per row + overall)
  7. **Findings & Recommendations** (Task 7's content):
     - Calibration insights
     - Suggested rule adjustments
     - Cement-target reassess plan
  8. (Conditional) **Iteration log** (Task 8's content if Task 8 fired)
  9. **Cement decision**: explicit `## Cement decision: PASS` (or FAIL) with justification + next steps. PASS unblocks the feature for release; FAIL routes to Task 8's fast-follow design review or back to Tasks 1-3 with adjusted methodology.
  10. **Trailing metadata**: `*Generated: 2026-04-28*` + `*Status: COMPLETE*` (analogous to plan's status line but for a report, not a plan; the report doesn't go through DRAFT→APPROVED, just exists once written).

**MIRROR**: Pattern 1 (implementation report skeleton) for the section structure; Pattern 2 (per-artifact walk) for the content of section 4; Pattern 3 (AC-6 verbatim) for the gate that section 6 must satisfy.

**VALIDATE**:
- `test -f PRPs/reports/reviewer-coherence-layer/dogfood.md && echo OK` must print OK.
- `grep -c '^## Cement decision: PASS' PRPs/reports/reviewer-coherence-layer/dogfood.md` must equal `1` (in the happy path).
- `grep -cE '^### .* prd-reviewer' PRPs/reports/reviewer-coherence-layer/dogfood.md` must be ≥1 (the prd-reviewer subsection heading).
- `grep -cE '^#### ' PRPs/reports/reviewer-coherence-layer/dogfood.md` must be ≥8 (≥3 prd + ≥3 plan + ≥2 code-reviewer per-artifact subsections).
- AC-6 cross-check: the report contains "Real-world dogfood" section (≥3 PRDs / ≥3 plans / ≥2 real diffs each finding TP/FP-classified with evidence); "Regression fixtures" section (≥1 synthetic diff with expected outcomes); FP rate per reviewer ≤25% AND ≥1 TP per reviewer.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- Markdown lint on the dogfood report: `markdownlint PRPs/reports/reviewer-coherence-layer/dogfood.md` (if installed; otherwise visual review).
- Synthetic fixture file existence + valid unified-diff format: `test -f PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff && head -3 PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff` shows `diff --git` or `--- a/` or `+++ b/` lines.
- HTML well-formedness on `documentation/changelog.html` (cement annotation): the lenient HTMLParser smoke from Phases 1-3 reports.

### Level 2 — CONTENT_INVARIANTS

- Dogfood report sections present: `grep -cE '^## (Methodology|Real-world dogfood|Regression fixtures|Headline FP rate|Findings & Recommendations|Cement decision)' PRPs/reports/reviewer-coherence-layer/dogfood.md` must equal `6` (the six required `## ...` sections of the canonical shape).
- Sample size minimums: `grep -cE '^### prd-reviewer' PRPs/reports/reviewer-coherence-layer/dogfood.md` ≥ `3`; `grep -cE '^### plan-reviewer' PRPs/reports/reviewer-coherence-layer/dogfood.md` ≥ `3`; `grep -cE '^### code-reviewer' PRPs/reports/reviewer-coherence-layer/dogfood.md` ≥ `2`.
- Synthetic fixture referenced: `grep -c 'synthetic-code-reviewer-fixture-1.diff' PRPs/reports/reviewer-coherence-layer/dogfood.md` ≥ `1`.
- AC-6 satisfaction: `grep -c 'FP rate' PRPs/reports/reviewer-coherence-layer/dogfood.md` ≥ `3`; `grep -c '≥1 TP' PRPs/reports/reviewer-coherence-layer/dogfood.md` ≥ `1`; `grep -cE 'Cement decision: (PASS|FAIL)' PRPs/reports/reviewer-coherence-layer/dogfood.md` equals `1`.
- Cement annotation in changelog: `grep -c 'Phase 4' documentation/changelog.html` increases by ≥1 from post-Phase-3.

### Level 3 — INTEGRATION (DRY-RUN END-TO-END)

- Phase 4's "integration test" is the dogfood walk itself — running the layer against real artifacts. The dogfood report's "Manual sanity walk" entries ARE the integration evidence. Level 3 here is meta-validation of the report:
  - Each PRD path cited in the dogfood report exists and is APPROVED (verifiable via `tail -1 <path>`).
  - Each plan path cited exists in `PRPs/plans/completed/` (verifiable via `test -f`).
  - Each cited git commit hash for code-reviewer diffs exists in `git log --oneline development`.
  - The synthetic fixture's expected outcomes match the dogfood report's "Regression fixtures" table.
  - The headline FP rate computed in Task 6 matches the per-finding TP/FP counts from Tasks 1-3 (manual cross-check).

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** `PRPs/reports/reviewer-coherence-layer/dogfood.md` exists and contains the 6 canonical `##` sections (Methodology, Real-world dogfood, Regression fixtures, Headline FP rate, Findings & Recommendations, Cement decision); sub-sections per reviewer present (≥3 PRDs, ≥3 plans, ≥2 real diffs); each finding classified TP/FP with verbatim evidence quote.
- **AC-A2 (PRD AC-6):** Headline FP rate ≤25% per reviewer (computed only over real-world artifacts) AND ≥1 TP per reviewer.
- **AC-A3 (PRD AC-6):** "Regression fixtures" section contains ≥1 synthetic diff (file path: `PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff`); each fixture finding annotated with expected vs. actual outcome.
- **AC-A4 (PRD AC-1):** Phase 1-3's R-COH-* layer is preserved byte-identical pre/post Phase 4 in the happy path (no changes to agent files unless FP > 25% triggers Task 8). If iteration fires, the iteration log documents each change with rationale.
- **AC-A5 (PRD AC-7):** `documentation/changelog.html` Unreleased block extended with the cement annotation (PASS or FAIL with rationale).
- **AC-A6 (PRD AC-2 + AC-3):** The dogfood walks exercise both the deterministic checks AND the K=5 LLM passes in their full intended form for each reviewer; no R-COH-* check class is silent across the entire sample without explicit acknowledgment.
- **AC-A7 (PRD AC-6, M1):** The dogfood report's Cement decision section explicitly states the FP rate per reviewer with the ≤25% MVP gate verdict; the cement-target ≤10% reassess plan is documented as future work.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Manual TP/FP classification has annotator bias (single-classifier per source PRD's D3) | Medium | Medium | Acknowledge explicitly in the Methodology section; cite the Baidu 2024-2025 paper as the industry standard (two-stage) and the conscious deviation; recommend that future reassess passes incorporate a second classifier |
| FP rate exceeds 25% for one or more reviewers | Medium | High (blocks release) | Task 8's iteration branch fires; DeepSource methodology applies; iteration capped at 3 attempts before escalation |
| Sample size (≥3 PRDs / ≥3 plans / ≥2 real diffs) is statistically thin | High | Medium | Acknowledged in the Methodology section as a known limitation; mitigated by the cement-target ≤10% reassess against larger production samples (post-N runs); the MVP threshold of ≤25% accommodates this thinness explicitly |
| Some R-COH-* check classes are silent in the sample (zero findings — could be high precision OR sample miss) | Medium | Low | The Findings & Recommendations section explicitly documents which checks were silent; the synthetic fixture (Task 4) deliberately exercises specific deterministic checks to validate their determinism even when the real-world sample doesn't trigger them |
| Synthetic fixture doesn't trigger the expected deterministic checks (means the checks have a bug) | Low | High (means Phase 1-3 implementation has a defect Phase 4 surfaces) | Task 5's expected-vs-actual table catches this; Task 8's iteration branch fires; the iteration log documents the bug fix as a Phase 4 deliverable |
| Code-reviewer diff selection (which git commits to use) is ambiguous if multiple commits could plausibly serve | Low | Low | Document the selection in the dogfood Methodology section with rationale; recommend the implementation-authoring Phase 1 + Phase 2 diffs as canonical (they were the first relay agent files shipped with the post-D11 read-only contract) |
| The conditional iteration in Task 8 introduces a R-S/R-L/R-SEM/R-X regression by accident | Low | High | Each iteration's Edit uses narrow `old_string`; post-iteration grep on R-S/R-L/R-SEM/R-X heading counts confirms unchanged; the iteration log explicitly cites the rubric byte-identical invariant |
| The dogfood report's Methodology section overspecifies (multi-stage classification when source PRD scoped to single-classifier) | Low | Low | Phase 4 plan's Methodology section is explicitly single-classifier per D3; future reassess can introduce two-stage when sample is larger |
| Phase 4 dogfood report file size grows beyond manageability for review | Low | Low | Per-artifact subsections aim for ~100-200 lines each; total expected report size: ~1500-2500 lines. Implementer monitors at write time; if approaching 3000+ lines, consider splitting into per-reviewer reports (out of MVP scope but documented as fast-follow) |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

- **Phase 4 is the final phase of the reviewer-coherence-layer feature.** Phases 1-3 shipped the layer; Phase 4 measures it. After cement, the feature is complete. Phase 5+ would be future iterations (e.g., the cement-target ≤10% reassess after N production runs, or fast-follow promotions of plan-writer / code-reviewer-semantic to additional `<h3>` documentation sections that Phase 2-3 deferred).

- **Methodology: single-classifier vs. industry-standard two-stage.** The source PRD's D3 explicitly scoped Phase 4 to single-classifier (the implementer) for MVP. The Baidu 2024-2025 paper documents two-stage manual review (developer + dedicated reviewer + senior escalation) as the industry standard for TP/FP classification. Phase 4 acknowledges this in the dogfood Methodology section as a conscious deviation, justified by the small sample size and MVP scope. Future cement-target reassess passes can adopt two-stage.

- **DeepSource FP-exceedance response sequence (Pattern 4) is the canonical iteration order.** Phase 4's Task 8 follows it: deny-list → contextual filter → rule tightening → rule removal as last resort. Iteration capped at 3 attempts before escalation to a fast-follow design review.

- **No precedent for relay dogfood reports.** Phase 4 designs the report shape from scratch (5 canonical sections defined in this plan). The shape can be reused for future relay features that ship measurable layers (e.g., a hypothetical "post-green-reviewer coherence layer" would dogfood with the same structure).

- **Synthetic fixture format: unified diff.** Standard `git diff` format with `+/-` line prefixes. Lives at `PRPs/reports/reviewer-coherence-layer/fixtures/synthetic-code-reviewer-fixture-1.diff`. Future fixtures (when more checks need targeted determinism validation) follow the same naming pattern (`synthetic-code-reviewer-fixture-N.diff`).

- **The dogfood report does NOT go through DRAFT→APPROVED.** It's not a plan or a PRD. It's a one-shot report that exists when written. Trailing metadata uses `*Status: COMPLETE*` rather than `*Status: APPROVED*` to signal the distinction (analogous to the implementation reports' status conventions).

- **Phase 4 may produce zero changes to agent files in the happy path.** That's the desired outcome — Phase 1-3's implementation was rigorous enough that the dogfood validates without iteration. Implementing Phase 4's Task 8 conditionally (only fires on FP > 25%) keeps the happy path cheap. The cement decision in this case is "PASS — no rule changes needed; cement at MVP threshold; reassess against ≤10% after N=10-20 production runs".

- **The cement annotation in `documentation/changelog.html`** extends the existing Unreleased block (no new `<h2>`; matches Phases 1-2-3 pattern). The Notes paragraph adds: "**Phase 4 cement: PASS — feature release-ready.**" If FP > 25% triggered iteration, the annotation reflects the iteration outcome with citation of the iteration log.

- **Future reassess against ≤10% target.** The source PRD's Should-item: cement-target ≤10% FP rate after N=10-20 production runs. Phase 4 documents this as future work in the dogfood report's "Cement-target reassess plan" subsection. The reassess pass would re-run dogfood against new artifacts produced post-Phase-4 and validate the layer's accuracy against the tighter cement target.

*Generated: 2026-04-28*
*Approved: 2026-04-28*
*Status: APPROVED*
