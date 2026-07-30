# Feature: Targeted retry — writers consume reviewer feedback (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting patterns; reuse or creation of components; impact on reusable services (5 prompt files across 3 writer/reviewer pairs; changes contracts consumed by /relay-execute)
- Decisions found:
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves — "no short-circuit; all 8 R1–R8 items always evaluated and recorded regardless of which fail" is preserved verbatim. This plan does NOT touch any reviewer; the invariant is untouched by construction.
  - [2026-04-28] code-reviewer gains Task + AC-10 of implementation-authoring.prd.md evolves — same no-short-circuit invariant on the code-review side; likewise untouched.
  - [2026-05-01] Per-stage retry budget composition (D3) — each downstream command owns its internal loop budget exclusively; the orchestrator adds only max_plan_review_retries and max_orchestrator_minutes. This plan changes what happens INSIDE an attempt, never the budget arithmetic or who owns it.
  - [2026-05-06] TDD pair is the authorized mechanism for creating test files (R-X strict preserved) — this plan authors ZERO test files; the test pair handles the corpus test-after per methodology.md `tdd: false`.
  - [2026-07-28] Merge origin/development — rubric[] arithmetic fixed at 17–22 / 17–25 rows and asserted by scripts/validate/checks/*.test.mjs. This plan adds no rubric row and changes no arithmetic.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — this plan writes only to plugins/relay/ and docs/decisions.md.
  - "Re-grounding without cause. There is no Phase 5 re-grounding in the autonomous flow. The Phase 2 grounding pass is one-shot." (plan-writer.md:1112-1113) — Task 3's grounding-reuse branch OPERATIONALIZES this existing rule rather than contradicting it: today the rule holds only within a single invocation, and a retry silently re-grounds.
  - "Asking the user to confirm anything" — the interactivity boundary is preserved; every branch added here runs without dialogue.
  - "Treating plugins/prp-core/ as active relay code" — untouched.
- Applicable architectural rules:
  - Interactivity boundary: writers run autonomously past PRD-APPROVED; the targeted-revision branch adds no prompt.
  - Writer/reviewer split (2026-04-19 command surface): writers produce, reviewers validate. This plan changes only the writer half.
  - PRPs/ artifact path convention for all pipeline outputs.
- Result: PROCEED
```

## Source

Targeted retry: writers consume reviewer feedback in relay, so a retry becomes a directed correction instead of a regeneration from scratch.

MEASURED PROBLEM (audit logs of this repo, `PRPs/plans/*.jsonl`, 270 recorded review runs): plan-review runs 1.66 times per artifact (77 artifacts / 128 runs; 49% fail on the first attempt); code-review runs 1.49 (67/100; 34% fail first). The cause is that reviewer feedback never reaches the writer: `prior_feedback` is passed by `commands/relay-execute.md` (8 references) and `commands/relay-implement.md` (5 references), but is consumed by ZERO writer agents — `agents/plan-writer.md`, `agents/implementer.md`, `agents/test-writer.md` have 0 references each — and `commands/relay-plan.md` and `commands/relay-write-test.md` do not forward it (0 references). In practice `relay-execute.md` line 429 ("re-adopt /relay-plan role passing prior_feedback") hands the parameter to a command that does not declare it. The HALT code `FAILED_PLAN_REVIEW_STUCK` ("same rubric items fail across consecutive attempts") exists precisely because this blind loop was observed repeating the same defect.

INTENDED CHANGES:
1. Add a targeted-revision mode to the three writer agents with measured churn (`plan-writer`, `implementer`, `test-writer`): when `prior_feedback` is non-empty, correct exactly the cited rubric items and preserve the rest of the artifact, instead of re-running the full protocol from scratch.
2. Make `commands/relay-plan.md` and `commands/relay-write-test.md` declare and forward `prior_feedback` to their writers, closing the plumbing gap with `relay-execute.md`.
3. Skip plan-writer's Phase 2 GROUNDING on retry: reuse the grounding already present in the existing DRAFT instead of re-dispatching the `research-codebase` / `research-web` subagents on every attempt — except when the cited feedback is itself grounding-dependent, in which case GROUNDING re-runs.

INVARIANTS THAT MUST NOT BREAK: no rubric item is removed or weakened; the `.jsonl` continues recording ALL rubric rows on every run (the no-short-circuit invariant is auditability and must not regress); the universal R-X test-modification guard remains untouched; `/relay-execute`'s re-invocation idempotency is preserved.

DELIBERATELY EXCLUDED: delta review on the reviewer side (re-validating only previously-failed items) was cut by the Decision Gate — it contradicts the recorded [2026-04-28] no-short-circuit invariant, which requires all items to be *evaluated*, not merely recorded. `docs-updater` was cut for lack of evidence: its pair shows zero measured churn (one `docs-review.jsonl`, 0 runs), and `relay-implement.md:474` deliberately removed `docs_prior_feedback` from the dispatch payload.

## Summary

This phase closes the writer↔reviewer feedback loop in the relay plugin. Today the orchestrator captures a reviewer's defect list and passes it as `prior_feedback`, but no writer agent declares or reads that input and two of the three writer-side commands never forward it — so every `CHANGES_REQUESTED` retry regenerates the artifact from scratch, blind to what failed. The change is additive and confined to the writer half of three pairs: two commands gain a `prior_feedback` entry in their existing "Execution context to pass into the Writer" lists; three agents gain an optional `prior_feedback` input plus a uniform `## Targeted revision mode` section that narrows a retry to the cited rubric items; and `plan-writer` additionally reuses the DRAFT's existing grounding instead of re-dispatching research subagents, unless the cited feedback is itself grounding-dependent. No reviewer file, rubric item, rubric-array arithmetic, budget, or audit-logging behavior is touched.

## User Story

As a developer running `/relay-execute` on a multi-phase PRD,
I want a rejected plan or implementation to be corrected on exactly the points the reviewer cited,
So that a retry costs a fraction of a full regeneration and stops repeating the same defect across attempts.

## Problem Statement

Reviewer feedback is captured but never delivered. `relay-execute.md` and `relay-implement.md` compute a `prior_feedback` list in the canonical `{rubric_id, reason}` shape, yet `relay-plan.md` and `relay-write-test.md` omit it from the execution-context lists they pass into their writers, and none of `plan-writer.md`, `implementer.md`, `test-writer.md` declares it as an input or branches on it. Every retry therefore re-runs the writer's full protocol against the same inputs that already produced a rejected artifact — for `plan-writer` that includes re-dispatching two research subagents whose findings are already recorded in the DRAFT. Measured across 270 review runs in this repo: 49% of plans and 34% of implementations fail their first review, and the loop's blindness is severe enough that a dedicated HALT code (`FAILED_PLAN_REVIEW_STUCK`) had to be introduced to catch attempts that repeat identical rubric failures.

## Solution Statement

Deliver the missing input end-to-end for the three writer pairs that show measured churn. Each of the two gap-bearing commands gains one `prior_feedback` bullet in its existing execution-context list, matching the shape `relay-implement.md:279` already uses. Each of the three writer agents gains one optional input declaration and one new `## Targeted revision mode (when prior_feedback is non-empty)` section — a uniform, greppable anchor across all three — that instructs the writer to locate the artifact's existing content, correct only what the cited `rubric_id`s name, and leave every other section byte-identical. `plan-writer` additionally gains a Phase 2 conditional that reuses the DRAFT's `## Patterns to Mirror` and `## Mandatory Reading` rather than re-dispatching research, with an explicit carve-out re-running GROUNDING when any cited `rubric_id` is grounding-dependent. The decision is recorded in `docs/decisions.md`.

## Metadata

| Field | Value |
|-------|-------|
| Type | Prompt-contract change (writer half of three writer/reviewer pairs) |
| Complexity | Medium — 5 prompt files + 1 decisions entry; additive, no reviewer touched |
| Systems Affected | `plan-writer`, `implementer`, `test-writer` agents; `/relay-plan`, `/relay-write-test` commands; `/relay-execute` and `/relay-implement` as upstream callers (read-only here) |
| Dependencies | None — `relay-execute.md` and `relay-implement.md` already compute and pass `prior_feedback`; this phase only makes it land |
| Estimated Tasks | 6 |
| Source | Description mode — no source PRD (see `## Source`) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-implement.md` | 214, 279 | The canonical `prior_feedback` contract: `last_reviewer_feedback: list<{rubric_id, reason}> = []` and the dispatch line `prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>`. Every new declaration in this phase must match this shape exactly. |
| P0 | `plugins/relay/commands/relay-plan.md` | 253-259, 290-297 | The two "Execution context to pass into the Writer's Phase 0 setup" lists that must each gain a `prior_feedback` bullet (Phase A = PRD mode, Phase B = description mode). |
| P0 | `plugins/relay/commands/relay-write-test.md` | 192-195 | The single execution-context list that must gain the same bullet. |
| P0 | `plugins/relay/agents/plan-writer.md` | 38-58, 205-208, 345-431, 1112-1113 | The `## Inputs` section to extend; the Phase 0.B skip-idiom to mirror for the new branch; Phase 2 GROUNDING (the dispatch to make conditional); and the "Re-grounding without cause / one-shot" anti-pattern this phase operationalizes. |
| P0 | `plugins/relay/agents/implementer.md` | 44-55 | The `## Inputs (from the calling command)` section to extend — currently `plan_path` + `target_root` only. |
| P0 | `plugins/relay/agents/test-writer.md` | 31-42 | The `## Inputs (from the calling command)` section to extend — currently `plan_path` + `target_root` only. |
| P1 | `docs/decisions.md` | 288-316 | The two [2026-04-28] AC-10 entries whose no-short-circuit invariant bounds this phase: reviewers must not be touched. Also the format precedent for the new entry Task 6 appends. |
| P1 | `docs/anti-patterns.md` | 15-21 | The R-X / test-weakening prohibition — this phase authors zero test files; the test pair handles the corpus test-after. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-implement.md:277-281
       target_root: <target_root>,
       attempt: <attempt>,
       prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,
       base_commit: <base_commit>,
     })
```
Tasks 1 and 2 copy this exact `prior_feedback: <... when non-empty; null otherwise>` phrasing into the two commands' execution-context lists, so all three writer pairs describe the input identically.

```
# SOURCE: plugins/relay/commands/relay-plan.md:253-259
Execution context to pass into the Writer's Phase 0 setup:

- `prd_path`: the resolved absolute path verified by P1–P4.
- `target_root`: the cwd.
- `design_spec_path`: the resolved path from Step 0.0's
  `--design-spec` override or PRD-mode auto-derivation, when set
  (absent/null otherwise).
```
Task 1 appends a fourth bullet to this list (and to the Phase B twin at lines 290-297), matching the existing "(absent/null otherwise)" optional-input idiom already used by `design_spec_path`.

```
# SOURCE: plugins/relay/agents/implementer.md:44-55
## Inputs (from the calling command)

- `plan_path`: absolute path to a plan file. The command has already
  verified the file ends with `*Status: APPROVED*` and either matches
  the canonical filename pattern `<feature>-phase-<N>-<slug>.plan.md`
  (PRD mode) or the flat pattern `<slug>.plan.md` (PRD-less /
  description mode) — you can trust those preconditions.
- `target_root`: absolute path to the target project's root (the
  repository the user invoked `/relay-implement` from). All Decision
  Gate consultation, `docs/context/methodology.md` reads, and source
  edits happen relative to this root.
```
Tasks 3, 4 and 5 append a `prior_feedback` bullet to this exact section shape in each of the three writer agents. `test-writer.md:31-42` and `plan-writer.md:38-58` carry the same section header verbatim, so one idiom fits all three.

```
# SOURCE: plugins/relay/agents/plan-writer.md:205-208
## Phase 0.B — Description-mode setup (when called from Phase B)

*Skip this phase when `description_mode = false` (PRD mode). Enter
here when the calling command dispatched Phase B (description mode).*
```
Tasks 3, 4 and 5 mirror this "skip when / enter when" italic guard line for the new `## Targeted revision mode` section, so the conditional entry reads identically to the existing description-mode branch.

```
# SOURCE: plugins/relay/agents/plan-writer.md:1112-1113
- **Re-grounding without cause.** There is no Phase 5 re-grounding in
  the autonomous flow. The Phase 2 grounding pass is one-shot.
```
Task 3's Phase 2 conditional extends this rule across attempts: the grounding pass becomes one-shot per DRAFT, not merely one-shot per invocation. The anti-pattern bullet is amended in the same task so the file does not contradict itself (a `R-COH-OTHER-INTERNAL-CONTRADICTION` risk otherwise).

```
# SOURCE: docs/decisions.md:1180-1189
<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
```
Task 6 copies this four-field structure verbatim for the new dated entry. This is the file's own canonical entry template, so the format anchor is the template itself rather than any one historical entry.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-plan.md` | UPDATE | Add `prior_feedback` to both the Phase A and Phase B execution-context lists (research confirmed both omit it: lines 253-259, 290-297). |
| `plugins/relay/commands/relay-write-test.md` | UPDATE | Add `prior_feedback` to the Phase A execution-context list (lines 192-195). |
| `plugins/relay/agents/plan-writer.md` | UPDATE | Declare the input; add `## Targeted revision mode`; make Phase 2 GROUNDING conditional; amend the "Re-grounding without cause" anti-pattern bullet. |
| `plugins/relay/agents/implementer.md` | UPDATE | Declare the input; add `## Targeted revision mode`. |
| `plugins/relay/agents/test-writer.md` | UPDATE | Declare the input; add `## Targeted revision mode`. |
| `docs/decisions.md` | UPDATE | Record the targeted-revision + grounding-reuse decision, per the repo's convention that deliberate contract evolutions are recorded (precedent: the two [2026-04-28] AC-10 entries). |

## NOT Building (Scope Limits)

- **Delta review on the reviewer side.** Re-validating only previously-failed rubric items was cut by the Decision Gate: it contradicts the recorded [2026-04-28] invariant that all rubric items are always *evaluated* and recorded. No reviewer file is opened by this plan.
- **`docs-updater` targeted revision.** Excluded for lack of evidence — the docs pair shows zero measured churn in this repo, and `relay-implement.md:474` deliberately removed `docs_prior_feedback` from the dispatch payload. Reversing that is a separate, evidence-gated decision.
- **Shift-left of reviewer rubric checks into writer prompts.** The pre-flight self-check that would reduce the *count* of rejections (rather than the *cost* of each) is a distinct follow-up; this phase delivers only the feedback pipe.
- **Any change to budgets or HALT codes.** `max_plan_review_retries`, `max_implement_retries`, `FAILED_PLAN_REVIEW_STUCK` and every other budget/HALT contract stay byte-identical; per [2026-05-01] D3 those belong to the commands that own them.
- **Authoring or modifying test files.** R-X strict — the test pair authors the corpus test-after per `methodology.md` `tdd: false`.
- **Persisting research blobs to disk.** Grounding reuse reads the DRAFT's own `## Patterns to Mirror` / `## Mandatory Reading` sections; no new artifact is written.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/commands/relay-plan.md`

**ACTION**: Append a `prior_feedback` bullet to BOTH execution-context lists — the Phase A list (PRD mode, currently ending with the `design_spec_path` bullet at lines 253-259) and the Phase B list (description mode, lines 290-297). Each bullet reads: ``- `prior_feedback`: the reviewer defect list from a prior CHANGES_REQUESTED verdict in the canonical `list<{rubric_id, reason}>` shape, forwarded verbatim when the caller supplies one (absent/null otherwise).`` Additionally, amend the Constraints bullet "Never re-run the Writer on CHANGES_REQUESTED" to clarify that the command still never loops, but now forwards the caller's feedback when re-adopted by the orchestrator — otherwise the file contradicts its own new input.

**MIRROR**: The `# SOURCE: plugins/relay/commands/relay-plan.md:253-259` snippet (the existing list shape and its `(absent/null otherwise)` optional-input idiom) and the `# SOURCE: plugins/relay/commands/relay-implement.md:277-281` snippet (canonical phrasing).

**ADDRESSES**: AC-A1

**VALIDATE**:
```bash
set -euo pipefail
n=$(grep -c 'prior_feedback' plugins/relay/commands/relay-plan.md || true)
if [ "$n" -lt 2 ]; then
  echo "FAIL: expected >=2 prior_feedback references in relay-plan.md (Phase A + Phase B), found $n"; exit 1
fi
echo "PASS: $n prior_feedback references in relay-plan.md"
```

### Task 2: UPDATE `plugins/relay/commands/relay-write-test.md`

**ACTION**: Append the same `prior_feedback` bullet to the single Phase A execution-context list (lines 192-195, currently `plan_path` + `target_root` only), using wording identical to Task 1's. Amend its "Never re-run the Writer on CHANGES_REQUESTED" constraint bullet the same way.

**MIRROR**: The `# SOURCE: plugins/relay/commands/relay-implement.md:277-281` snippet — same canonical phrasing as Task 1, so all three commands describe the input identically.

**ADDRESSES**: AC-A2

**VALIDATE**:
```bash
set -euo pipefail
grep -q 'prior_feedback' plugins/relay/commands/relay-write-test.md
echo "PASS: relay-write-test.md forwards prior_feedback"
```

### Task 3: UPDATE `plugins/relay/agents/plan-writer.md`

**ACTION**: Three edits. (a) In `## Inputs (from the calling command)`, add a `prior_feedback` bullet under BOTH the PRD-mode and description-mode input groups, declared optional with default null. (b) Insert a new top-level section `## Targeted revision mode (when prior_feedback is non-empty)` immediately after `## Inputs`, guarded by an italic line mirroring Phase 0.B's idiom, instructing: read the existing DRAFT at the already-computed `plan_path`; correct ONLY the sections the cited `rubric_id`s name; leave every other section byte-identical; never regenerate the Decision Gate block, `## Source`, or any section no cited item touches; re-emit the trailing `*Status: DRAFT*` block unchanged. (c) In Phase 2 GROUNDING, add a leading conditional: when `prior_feedback` is non-empty, SKIP the Task dispatch and reuse the DRAFT's existing `## Patterns to Mirror` and `## Mandatory Reading` sections as the grounding result — EXCEPT when any cited `rubric_id` matches a grounding-dependent check (`R-COH-PATTERN-TASK-DRIFT`, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`, `R-COH-MANDATORY-READING-IRRELEVANT`), in which case GROUNDING re-runs in full. Amend the "Re-grounding without cause" anti-pattern bullet (lines 1112-1113) to state the pass is one-shot per DRAFT, with the grounding-dependent carve-out named, so the file does not contradict itself.

**MIRROR**: The `# SOURCE: plugins/relay/agents/plan-writer.md:205-208` snippet (skip-when/enter-when guard), the `# SOURCE: plugins/relay/agents/implementer.md:44-55` snippet (Inputs shape), and the `# SOURCE: plugins/relay/agents/plan-writer.md:1112-1113` snippet (anti-pattern bullet to amend).

**ADDRESSES**: AC-A3, AC-A4, AC-A5, AC-A6, AC-A7 (AC-A7 is load-bearing here: `plan-reviewer.md` sits beside `plan-writer.md` in the same directory, so this task must not widen into it)

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/plan-writer.md
grep -q 'prior_feedback' "$f"
grep -q '^## Targeted revision mode' "$f"
grep -q 'R-COH-PATTERN-TASK-DRIFT' "$f"
grep -q 'R-COH-MANDATORY-READING-IRRELEVANT' "$f"
echo "PASS: plan-writer.md declares the input, the targeted-revision section, and the grounding-dependent carve-out"
```

### Task 4: UPDATE `plugins/relay/agents/implementer.md`

**ACTION**: Two edits. (a) In `## Inputs (from the calling command)` (lines 44-55), append a `prior_feedback` bullet using the same wording as Task 3, noting that `/relay-implement` already sends it (`relay-implement.md:279`) and it was previously ignored. (b) Insert `## Targeted revision mode (when prior_feedback is non-empty)` immediately after `## Inputs`, instructing: inspect the current working tree (the prior attempt's edits are still present, uncommitted); address ONLY the cited `rubric_id`s; do not revert or re-apply tasks the reviewer did not flag; never widen the diff beyond what the cited items require. State explicitly that R-X still forbids any test-file edit regardless of what a cited item says.

**MIRROR**: The `# SOURCE: plugins/relay/agents/implementer.md:44-55` snippet (Inputs shape) and the `# SOURCE: plugins/relay/agents/plan-writer.md:205-208` snippet (guard-line idiom).

**ADDRESSES**: AC-A3, AC-A4, AC-A7 (AC-A7 is load-bearing here: `code-reviewer.md` sits beside `implementer.md` in the same directory, so this task must not widen into it)

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/implementer.md
grep -q 'prior_feedback' "$f"
grep -q '^## Targeted revision mode' "$f"
grep -q 'R-X' "$f"
echo "PASS: implementer.md declares the input, the targeted-revision section, and restates the R-X guard"
```

### Task 5: UPDATE `plugins/relay/agents/test-writer.md`

**ACTION**: Two edits mirroring Task 4. (a) In `## Inputs (from the calling command)` (lines 31-42), append the `prior_feedback` bullet. (b) Insert `## Targeted revision mode (when prior_feedback is non-empty)` immediately after `## Inputs`, instructing: re-walk only the ACs whose per-AC outcomes the cited `rubric_id`s implicate (e.g. `R-AC-COVERAGE` names uncovered ACs; `R-TRIVIAL-ASSERT` and `R-IMPL-LEAK` name specific test files); preserve every already-accepted per-AC outcome and every existing lifecycle-ledger entry verbatim; never delete or weaken a test to satisfy a cited item.

**MIRROR**: The `# SOURCE: plugins/relay/agents/implementer.md:44-55` snippet (Inputs shape — `test-writer.md:31-42` carries the same header verbatim) and the `# SOURCE: plugins/relay/agents/plan-writer.md:205-208` snippet (guard-line idiom).

**ADDRESSES**: AC-A3, AC-A4, AC-A7 (AC-A7 is load-bearing here: `test-reviewer.md` sits beside `test-writer.md` in the same directory, so this task must not widen into it)

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/test-writer.md
grep -q 'prior_feedback' "$f"
grep -q '^## Targeted revision mode' "$f"
grep -q 'lifecycle' "$f"
echo "PASS: test-writer.md declares the input, the targeted-revision section, and preserves the lifecycle ledger"
```

### Task 6: UPDATE `docs/decisions.md`

**ACTION**: Append a new dated entry `## [2026-07-30] Writers consume prior_feedback: a retry is a targeted revision, and plan-writer's grounding is one-shot per DRAFT` following the file's existing four-field format (Context / Decision / Reason / Areas affected). Context cites the measured 1.66 and 1.49 review-runs-per-artifact and the zero-consumption gap. Decision states the three changes and names what was deliberately excluded (reviewer-side delta review — conflicts with the [2026-04-28] no-short-circuit invariant; `docs-updater` — zero measured churn). Reason explains that closing the pipe reduces retry cost without touching any rubric. Areas affected lists the five prompt files plus `/relay-execute` and `/relay-implement` as upstream callers.

**MIRROR**: The `# SOURCE: docs/decisions.md:1180-1189` snippet — the file's own canonical four-field entry template (Context / Decision / Reason / Areas affected). Copy that structure verbatim.

**ADDRESSES**: AC-A8

**VALIDATE**:
```bash
set -euo pipefail
grep -q '^## \[2026-07-30\] Writers consume prior_feedback' docs/decisions.md
grep -q 'no-short-circuit' docs/decisions.md
echo "PASS: decisions.md records the entry and names the preserved invariant"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
# Every touched agent/command file must still open with valid YAML frontmatter.
for f in plugins/relay/agents/plan-writer.md \
         plugins/relay/agents/implementer.md \
         plugins/relay/agents/test-writer.md \
         plugins/relay/commands/relay-plan.md \
         plugins/relay/commands/relay-write-test.md; do
  head -n 1 "$f" | grep -qx -- '---' || { echo "FAIL: $f lost its frontmatter opener"; exit 1; }
done
echo "PASS: frontmatter intact on all 5 touched prompt files"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
fail=0
# (a) The three writer agents each declare the input AND carry the uniform section anchor.
for f in plugins/relay/agents/plan-writer.md \
         plugins/relay/agents/implementer.md \
         plugins/relay/agents/test-writer.md; do
  grep -q 'prior_feedback' "$f"            || { echo "FAIL: $f does not declare prior_feedback"; fail=1; }
  grep -q '^## Targeted revision mode' "$f" || { echo "FAIL: $f lacks the targeted-revision section"; fail=1; }
done
# (b) The two gap-bearing commands forward it.
for f in plugins/relay/commands/relay-plan.md \
         plugins/relay/commands/relay-write-test.md; do
  grep -q 'prior_feedback' "$f" || { echo "FAIL: $f does not forward prior_feedback"; fail=1; }
done
# (c) No reviewer file was touched — the no-short-circuit invariant is preserved by construction.
for f in plugins/relay/agents/plan-reviewer.md \
         plugins/relay/agents/code-reviewer.md \
         plugins/relay/agents/test-reviewer.md; do
  if ! git diff --quiet -- "$f"; then echo "FAIL: reviewer $f was modified — out of scope"; fail=1; fi
done
[ "$fail" -eq 0 ] || exit 1
echo "PASS: writers consume, commands forward, reviewers untouched"
```

**Level 3 — INTEGRATION (feedback chain closed end-to-end)**

```bash
set -euo pipefail
fail=0
# The chain must close for all three pairs: command forwards -> agent consumes.
for pair in "plugins/relay/commands/relay-plan.md:plugins/relay/agents/plan-writer.md" \
            "plugins/relay/commands/relay-write-test.md:plugins/relay/agents/test-writer.md" \
            "plugins/relay/commands/relay-implement.md:plugins/relay/agents/implementer.md"; do
  cmd="${pair%%:*}"; agent="${pair##*:}"
  grep -q 'prior_feedback' "$cmd"   || { echo "FAIL: $cmd does not forward prior_feedback"; fail=1; }
  grep -q 'prior_feedback' "$agent" || { echo "FAIL: $agent does not consume prior_feedback"; fail=1; }
done
[ "$fail" -eq 0 ] || exit 1
npm run validate
echo "PASS: feedback chain closed for all three writer pairs; static suite green"
```

## Acceptance Criteria

> **R8b does not apply in description mode — no `(PRD AC-N)` token required.** This plan was generated from a free-text description; there is no source PRD, so plan-reviewer's R8a/R8b/R8c apply their description-mode variant.

- **AC-A1:** `plugins/relay/commands/relay-plan.md` declares and forwards `prior_feedback` in BOTH its Phase A (PRD mode) and Phase B (description mode) execution-context lists, using the canonical `list<{rubric_id, reason}>` shape and the existing `(absent/null otherwise)` optional-input idiom.
- **AC-A2:** `plugins/relay/commands/relay-write-test.md` declares and forwards `prior_feedback` in its Phase A execution-context list, with wording identical to AC-A1's.
- **AC-A3:** Each of `plan-writer.md`, `implementer.md`, and `test-writer.md` declares `prior_feedback` as an optional, default-null input in its `## Inputs (from the calling command)` section.
- **AC-A4:** Each of those three agents carries a `## Targeted revision mode (when prior_feedback is non-empty)` section — a uniform, greppable anchor — instructing the writer to correct only the cited rubric items and leave every other part of the artifact byte-identical.
- **AC-A5:** `plan-writer.md`'s Phase 2 GROUNDING skips re-dispatching `research-codebase` / `research-web` when `prior_feedback` is non-empty, EXCEPT when any cited `rubric_id` is grounding-dependent (`R-COH-PATTERN-TASK-DRIFT`, `R-COH-PATTERN-SOURCE-MISSING`, `R-COH-MANDATORY-READING-MISSING`, `R-COH-MANDATORY-READING-IRRELEVANT`), in which case GROUNDING re-runs in full.
- **AC-A6:** `plan-writer.md`'s "Re-grounding without cause" anti-pattern bullet is amended so the file states one consistent rule (one-shot per DRAFT, with the named carve-out) and does not contradict its own Phase 2 conditional.
- **AC-A7:** No reviewer agent file (`plan-reviewer.md`, `code-reviewer.md`, `test-reviewer.md`), no rubric item, no rubric-array arithmetic, no budget value, and no HALT code is modified — verified by a clean `git diff` on the three reviewer files.
- **AC-A8:** `docs/decisions.md` carries a `[2026-07-30]` entry recording the change, naming both deliberate exclusions (reviewer-side delta review; `docs-updater`) and the preserved no-short-circuit invariant.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Over-editing:** a targeted revision deletes correct content while fixing a cited item — the documented failure mode of self-refine loops (research-web finding: "revision can accidentally remove correct content") | M | High | Every `## Targeted revision mode` section states the byte-identical-elsewhere rule explicitly. The reviewers are unchanged and still run their FULL rubric on every attempt, so a regression introduced by a narrow edit is caught exactly as it is today — the no-short-circuit invariant is what makes narrow edits safe. |
| **"Preserve the rest of the artifact" has no operational definition** in any existing agent file (named as a gap by research-codebase) | H | Medium | Tasks 3–5 define it concretely per writer rather than abstractly: plan-writer preserves untouched sections and the Decision Gate block; implementer does not widen the diff; test-writer preserves accepted per-AC outcomes and ledger entries. This phase establishes the idiom the gap says is missing. |
| **plan-writer self-contradiction:** the new Phase 2 conditional vs. the existing "Re-grounding without cause / one-shot" bullet would trip `R-COH-OTHER-INTERNAL-CONTRADICTION` (11 recorded failures — the 3rd most common plan-review defect) | M | Medium | Task 3 amends the anti-pattern bullet in the SAME task that adds the conditional, and AC-A6 makes the consistency a first-class acceptance criterion rather than an implicit one. |
| **Stale grounding on retry:** the DRAFT's `## Patterns to Mirror` anchors may have drifted if the repo changed between attempts | L | Medium | Retries occur within a single orchestrator session (bounded by `max_orchestrator_minutes`), so repo drift mid-loop is not an expected path. The grounding-dependent carve-out in AC-A5 re-runs GROUNDING whenever the reviewer itself flags a pattern/reading defect — the case where staleness would actually matter. |
| **Fixing the plugin's ceremony problem using the full ceremony** is self-defeating for this specific change | M | Low | Deliberately planned in description mode (`/relay-plan "<description>"`) rather than via a full PRD, keeping the pipeline proportionate to a 6-task, additive, reviewer-untouched change. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

- **Why only three writers.** `docs-updater` was in the original scope and was cut on evidence: the docs pair has a single `docs-review.jsonl` in this repo with zero recorded runs, and `relay-implement.md:474` deliberately removed `docs_prior_feedback` from the dispatch payload ("Step A's dispatch payload no longer accepts it per edit (i) above"). That removal is not recorded in `docs/decisions.md`, so reversing it is not gate-blocked — but it is unjustified without data. The three writers in scope are exactly the three with measured churn: plan-writer (1.66 runs/artifact), implementer (1.49), test-writer (3.50).

- **Why `phase_type: docs`.** The precedent for a relay phase whose `## Files to Change` table is entirely `.md` prompt files is `PRPs/plans/completed/relay-approve-command-phase-1-docs-updater-agent.plan.md`, which also created an agent file and used `docs`. This selects the correct `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption — the VALIDATE commands here are grep/filesystem content invariants plus `npm run validate`, not `node:test` invocations, which is appropriate for a prompt-contract change.

- **Measurement follow-up.** The point of this phase is a measurable drop in review runs per artifact. After it ships, re-derive the same three numbers from `PRPs/plans/*.jsonl` (plan-review 1.66, code-review 1.49, test-write-review 3.50 as of 2026-07-30, over 270 runs). If plan-review does not fall meaningfully below ~1.4, the residual cause is the writers not knowing the rubric they are graded against — a distinct follow-up (shift-left pre-flight self-check), not more feedback plumbing.

- **Dogfood opportunity.** This plan's own review cycle is a live test of the problem it fixes: if `plan-reviewer` returns `CHANGES_REQUESTED`, the current blind-retry behavior is what regenerates it.

*Generated: 2026-07-30*
*Approved: 2026-07-30*
*Implemented: 2026-07-30*
*Status: IMPLEMENTED*
