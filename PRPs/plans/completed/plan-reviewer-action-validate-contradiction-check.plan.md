# Feature: Close a coverage gap in plan-reviewer.md's deterministic rubric (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of an existing shipped reviewer agent's rubric (`plugins/relay/agents/plan-reviewer.md`); a new deterministic structural check added to an existing reviewer's additive R-COH-* coherence layer; cross-cutting arithmetic (the `### Logging discipline` rubric-length-counting paragraph) that must stay internally consistent across four prior shipments; recording a new decision in `docs/decisions.md` per the Decision Gate's own feedback-loop contract
- Decisions found:
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array — confirms a 7th deterministic row can be added without violating "no extras"
  - [2026-07-09] Validation commands must carry real exit-code semantics; plan-reviewer enforces via R-COH-VALIDATE-ALWAYS-PASS — the new check's nearest sibling (also unconditional); its "Areas affected" line records the stale "rubric[] length 14–19" numeral this plan's decisions.md entry explicitly supersedes
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference — the origin of the "declaration-gated zero-emission" pattern this new check deliberately does NOT follow (it is unconditional instead)
  - [2026-07-25] `phase_scope` non-heuristic sourcing + R-COH-VISUAL-SCOPE-PURITY enforcement ship — the direct shape precedent (opening framing sentence, "Known limitation" closing paragraph) this new check's prose mirrors
  - [2026-07-25] `phase_scope: logic` sentinel-ledger resolution + R-COH-SENTINEL-RESOLUTION-MISSING enforcement ship — the most recent prior editor of the same rubric-arithmetic paragraph this plan further updates; its own Task 8 is the real, merged instance of the exact ACTION/VALIDATE contradiction this new check now catches
  - [2026-05-14] `phase_type` annotation enables rubric differentiation for scaffold phases — this plan's own `phase_type: scaffold` Metadata value follows this precedent to secure the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption for its grep-shaped VALIDATE commands
  - [2026-07-10] Test pair universalized: activation on declared framework, `tdd:` selects ordering, full test lifecycle — governs how the two now-stale test files must be updated (`EXISTING_TEST_UPDATED`, test pair only, never the Implementer) rather than deleted
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — standing constraint on this plan's own output path
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — standing background constraint; every path this plan touches (`plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`, and this plan's own `PRPs/plans/` path) resolves outside `.claude/`
  - "Weakening or deleting tests to make the auto-correction loop turn green" — directly relevant: the two existing tests that assert the pre-change rubric arithmetic MUST be updated (`EXISTING_TEST_UPDATED`) by the test pair, never deleted or silently weakened
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; `plan-writer`/`plan-reviewer` both run fully autonomously, no dialogue — unaffected by description mode
  - "One command per stage, writer/reviewer split" — this change is scoped entirely to the reviewer's own file; unlike the `phase_scope` precedent it mirrors, no companion `plan-writer.md` change is needed, because the new check operates purely on content plan-writer already produces (ACTION/VALIDATE task pairs), not on any new plan-writer-authored field
  - `plan-reviewer`'s fixed tool grant (`Read, Edit, Write` — no `Bash`, no `Grep`) bounds every R-COH-* check to a textual/mechanical scan over content already in memory — decisive for how this check must be authored
  - PRP artifact path convention (`PRPs/plans/`) governs this plan's own output path
- Result: PROCEED
```

## Source

Close a coverage gap in `plugins/relay/agents/plan-reviewer.md`: the deterministic rubric has no check that a task's `**ACTION**:` text is self-consistent with that SAME task's own `**VALIDATE**:` command, so a plan can be APPROVED even when following the ACTION verbatim would make the task's own VALIDATE fail. Real instance: `PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md` Task 8 instructed inserting the literal `14 to 23` into `plan-reviewer.md` while that same task's VALIDATE asserted `grep -c "14 to 23" plugins/relay/agents/plan-reviewer.md` returns 0 — literal compliance was structurally impossible. plan-reviewer APPROVED the plan anyway (it verified the rubric-row arithmetic was correct but never cross-checked ACTION against VALIDATE); the implementer had to deviate from the plan text and self-report the judgment call, and code-reviewer independently ruled the deviation justified. Add a new deterministic check `R-COH-ACTION-VALIDATE-CONTRADICTION` that, for each `### Task <i>` in `## Step-by-Step Tasks`, detects when the ACTION prose instructs producing content that the task's own VALIDATE command would reject. The tractable, high-value subset: the ACTION contains a quoted/backticked literal string to insert into a file AND the same task's VALIDATE greps that same file asserting a zero count for that same literal — plus the inverse, where the VALIDATE requires a literal the ACTION says to remove.

## Summary

This phase closes a structural blind spot in `plugins/relay/agents/plan-reviewer.md`'s additive R-COH-* coherence layer: none of its existing six deterministic checks, nor its bounded K=5 LLM judgment pass, cross-reference a single task's own `**ACTION**:` prose against that SAME task's own `**VALIDATE**:` command. A real, merged plan (`PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md` Task 8) demonstrates the gap concretely: its ACTION instructed inserting the literal `14 to 23` into `plugins/relay/agents/plan-reviewer.md`, while that SAME task's own VALIDATE asserted a zero count of that literal — `plan-reviewer` APPROVED the plan anyway. This phase adds a 7th FIXED (unconditional, never zero-emission) deterministic check, `R-COH-ACTION-VALIDATE-CONTRADICTION`, positioned immediately after `R-COH-VALIDATE-ALWAYS-PASS` and before `R-COH-DESIGN-SOURCE-MISSING`, written as a textual scan (the agent has no `Bash`/`Grep` tool) that detects the tractable subset of this contradiction class: an ACTION-inserted literal a same-task VALIDATE asserts absent, and the inverse (ACTION removes a literal a same-task VALIDATE requires present). The phase also updates the cross-cutting rubric[]-length arithmetic paragraph (`### Logging discipline`) for the new 7-fixed-check baseline (15–20 rows non-Figma; 15–23 rows maximal; "24th row", not 23rd), adds a matching JSONL example row, and records the decision — including its numeral supersession of the 2026-07-09 entry — in `docs/decisions.md`. Two existing tests that assert the pre-change arithmetic wording will go stale; this plan explicitly flags them as required `EXISTING_TEST_UPDATED` follow-up for the test pair (test-after mode), never an Implementer task.

## User Story

As a developer relying on `/relay-plan-review` to gate DRAFT plans before implementation,
I want the reviewer to catch a task whose own ACTION prose and own VALIDATE command are mutually unsatisfiable,
So that a structurally-impossible task can never reach APPROVED and force the Implementer into an undocumented judgment call.

## Problem Statement

`plan-reviewer`'s R1–R8 structural rubric and its six existing deterministic R-COH-* checks validate a DRAFT plan's shape, cross-references, and validation-command exit-code semantics — but none of them read a single task's `**ACTION**:` prose against that SAME task's own `**VALIDATE**:` command for mutual satisfiability. A plan can therefore instruct an Implementer to produce content that the plan's own verification step is guaranteed to reject. This escaped review once already: `PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md` Task 8's ACTION told the Implementer to write a sentence containing the literal `14 to 23` into `plugins/relay/agents/plan-reviewer.md` (as part of a "NOT `14 to 23`" clarifying aside), while that task's own VALIDATE ran `grep -q "14 to 23" plugins/relay/agents/plan-reviewer.md` inside an "if found, FAIL" guard. `plan-reviewer` verified the surrounding rubric-row arithmetic was numerically correct and APPROVED the plan without ever noticing the self-contradiction. The Implementer silently deviated from the literal plan text (landing "the range never extends to a 23rd row" instead) to avoid the impossible instruction, self-reporting the judgment call; `code-reviewer` separately ruled the deviation justified — but nothing in the authoring pipeline caught the defect before implementation, when a plan-authoring-time fix is cheapest.

## Solution Statement

Add a 7th FIXED (unconditional — always emitted, never zero-emission) deterministic check, `R-COH-ACTION-VALIDATE-CONTRADICTION`, to `plugins/relay/agents/plan-reviewer.md`'s R-COH-* coherence layer, positioned immediately after `R-COH-VALIDATE-ALWAYS-PASS` and before `R-COH-DESIGN-SOURCE-MISSING`. For each `### Task <i>`, the check performs a textual scan (no `Bash`/`Grep` tool available) that flags two tractable contradiction shapes: (a) the ACTION instructs inserting a quoted/backticked literal into a file while the SAME task's VALIDATE asserts a zero count of that literal in that file; and (b) the inverse — the ACTION instructs removing a literal the SAME task's VALIDATE requires present. A plan with no task matching either shape passes vacuously, mirroring `R-COH-DESIGN-GROUNDED`'s existing "no UI task" precedent. The check closes with a "Known limitation" paragraph, matching the shape already used by `R-COH-VISUAL-SCOPE-PURITY`/`R-COH-SENTINEL-RESOLUTION-MISSING`, documenting that it cannot execute the VALIDATE command and can miss obfuscated contradictions or false-positive on incidental matches — research corroborates this scoping choice: LLM self-contradiction detection over free text is close to chance accuracy (ContraDoc benchmark: GPT-4 at 53.8% binary accuracy), so restricting the check to a narrow, mechanically-describable textual pattern rather than open-ended reasoning is the tractable design. The `### Logging discipline` rubric-arithmetic paragraph, the JSONL worked example, and `docs/decisions.md` are all updated to keep the cross-cutting numerals internally consistent.

## Metadata

| Field | Value |
|---|---|
| Type | Reviewer rubric extension (new FIXED deterministic R-COH-* check) + cross-cutting arithmetic update + decision record |
| Complexity | Low-Medium |
| Systems Affected | `plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`; downstream (test-pair follow-up only, no task in this plan touches them): `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`, `scripts/validate/checks/figma-track-phase5.test.mjs` |
| Dependencies | None — self-contained edit to an already-shipped reviewer agent; no other in-flight phase must land first |
| Estimated Tasks | 4 |
| Source PRD line ref | N/A — description mode, no source PRD |
| phase_type | scaffold |

**On `phase_type: scaffold` despite adding new structural/behavioral capability:** this phase's only deliverables are prompt/documentation markdown content (`plan-reviewer.md`, `decisions.md`); there is no `.mjs` application-code surface for the declared `node:test` framework to exercise. Every legitimate VALIDATE command this phase emits is necessarily grep/content-invariant-shaped (confirming specific strings are present or absent in the two target files), which requires `phase_type: scaffold` to receive the correct `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption — never `feature`. This mirrors the established precedent already used by every prior phase of the sibling `figma-visual-first-track` family for this exact shape (prompt/doc edits validated by grep, not by `node --test`).

No `design_source` or `phase_scope` Metadata row: `docs/context/methodology.md` does not declare `figma_track: true` (confirmed: no `figma_track` key present in its frontmatter at all), so per `docs/context/plan-template.md`'s dual-branch rule this table carries no `design_source` row and the plan body carries no `## Design Source` section. This is also a description-mode plan with no source PRD, so — per `docs/context/plan-template.md`'s `phase_scope` paragraph ("mirrors `design_source`'s lineage exactly... including in description mode, where there is no PRD to declare `visual_first` at all, so `phase_scope` is never sourced or emitted") — no `phase_scope` row is added either.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/plan-reviewer.md` | 435-441 | `R-COH-VALIDATE-ALWAYS-PASS`'s tail + `R-COH-DESIGN-SOURCE-MISSING`'s heading — the exact insertion boundary |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 491-539 | `R-COH-VISUAL-SCOPE-PURITY` — shape precedent for the opening framing sentence and the "Known limitation" closing paragraph |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 541-604 | `R-COH-SENTINEL-RESOLUTION-MISSING` — second shape precedent; its own arithmetic-paragraph edit is the most recent prior editor of the paragraph this phase further updates |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 655-692 | `### Logging discipline` — the rubric[]-length arithmetic paragraph this phase must update for the 6→7 fixed-check shift |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 949-1031 | `## review.jsonl format` — the JSONL worked example this phase extends with a new row |
| P0 | `PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md` | 777-832 | The real, merged instance of the exact ACTION/VALIDATE contradiction this check now catches (Task 8) |
| P1 | `docs/decisions.md` | 680-688 | [2026-07-09] Validation commands must carry real exit-code semantics — the new check's nearest sibling decision; its "Areas affected" line records the stale numeral this phase's own decisions.md entry supersedes |
| P1 | `docs/decisions.md` | 864-877 | [2026-07-25] `phase_scope: logic` sentinel-ledger resolution + `R-COH-SENTINEL-RESOLUTION-MISSING` — the most recent prior shipment to this exact arithmetic paragraph |
| P1 | `docs/context/plan-template.md` | 310-324 | Canonical `### Task <i>` template — confirms ACTION/MIRROR/VALIDATE are documented as independent fields with no existing mutual-consistency rule |
| P2 | `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs` | 456-474 | Existing test whose verbatim-sentence assertions on the arithmetic paragraph will go stale — required test-pair follow-up, not an Implementer task |
| P2 | `scripts/validate/checks/figma-track-phase5.test.mjs` | 309-327 | Second existing test with the same staleness exposure |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:435-441
- PASS iff every scanned command either lets an underlying non-zero
  status propagate as the block's exit code or explicitly `exit 1`s
  on failure. FAIL naming the Level (or task heading), quoting the
  offending command verbatim, and stating the fix form:
  `if <check>; then echo "FAIL: …"; exit 1; else echo "PASS: …"; fi`.

#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active
```
Copied into Task 1 as the exact byte-accurate insertion boundary — the new `#### R-COH-ACTION-VALIDATE-CONTRADICTION` section is inserted immediately after the first fragment and immediately before the second.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:491-497
#### R-COH-VISUAL-SCOPE-PURITY — `phase_scope: visual` plans contain
no side-effecting tasks and no unsentineled data/action tasks

**Deliberate mirror of `R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED`'s
zero-emission/otherwise shape, applied to the `phase_scope` field's own
non-heuristic lineage.** This check never infers or repairs plan
content — an offending task is always a structural defect, never a
self-healing opportunity.
```
```
# SOURCE: plugins/relay/agents/plan-reviewer.md:532-539
**Known limitation (recorded, not blocking):** this is a textual
heuristic scan over plan-authored task PROSE, not real code — it
cannot see an actual diff (no code exists yet at plan-review time) and
can both miss a cleverly-worded side effect and false-positive on an
incidental word match. It is a plan-authoring-time gate, not the final
safety net; Phase 5 (`Implement-time gate`) of
`PRPs/prds/figma-visual-first-track.prd.md` is where a real diff gets
checked against real code, out of this check's scope.
```
Copied into Task 1 as the exact opening-framing-sentence shape and the exact "Known limitation" closing-paragraph shape the new check's own opening and closing paragraphs mirror.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:593-604
**Known limitation (recorded, not blocking):** like
`R-COH-VISUAL-SCOPE-PURITY`, this is a textual heuristic scan over
plan-authored task PROSE, not real code — it confirms the plan
AUTHORED a resolution task and a sentinel-targeting VALIDATE, not that
the task's ledger is complete against the paired visual phase's
ACTUAL files (that would require reading those files and
cross-referencing counts, out of this check's bounded scope —
`plan-reviewer` has no `Glob`/`Grep` tool) or that the VALIDATE was
ever executed. It is a plan-authoring-time gate, not the final safety
net; the real zero-remaining-sentinel enforcement against real code
happens when the Implementer actually runs this plan's VALIDATE
command.
```
Copied into Task 1 as the second shape precedent: both existing checks explicitly name `plan-reviewer`'s missing tools as the reason the check is a textual scan, which the new check's own closing paragraph echoes (no `Bash` tool to execute the VALIDATE command).

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:663-692
The total `rubric[]` length per run is `8 (R1–R8) + 6 (deterministic
R-COH-*) + ≤5 (K=5 pass) = 14 to 19 rows` for a project where
`figma_track` is absent/`false` (the baseline case — unchanged from
before this section existed). When the target declares
`figma_track: true`, up to 2 additional conditional deterministic rows
(`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`) may also
appear, and — independently, on a plan whose `## Metadata` declares
`phase_scope` (itself only reachable inside a `figma_track: true`
project, per the source PRD's own MoSCoW: `visual_first` is gated on
`figma_track: true`) — exactly one of two mutually-exclusive 3rd
conditional deterministic rows may also appear:
`R-COH-VISUAL-SCOPE-PURITY` (on `phase_scope: visual`) or
`R-COH-SENTINEL-RESOLUTION-MISSING` (on `phase_scope: logic`), since a
single plan's `phase_scope` cell carries exactly one value and can
never be both at once. Together these widen the range to
`14 to 22 rows` in the maximal case (both design rows present, plus
exactly one of the two mutually-exclusive phase_scope rows, plus the
full 5-row K=5 pass) — the range never extends to a 23rd row, because
`R-COH-VISUAL-SCOPE-PURITY` and `R-COH-SENTINEL-RESOLUTION-MISSING`
can never both fire on the same plan. Each of the four conditional
rows is independently zero-emission (contributes nothing) when its
own gating condition is not met, so the baseline 14–19 range is exact
for every non-Figma project, and the 14–21 range from the prior
`design_source` shipment remains exact for a `figma_track: true`
project whose plan has no `phase_scope` row at all (neither `visual`
nor `logic` — `visual_first: false`, or the PRD predates the
visual-first track). The
"exactly 8" wording at the five sites is replaced by "R1–R8 always
present, no duplicates among R1–R8; R-COH-* rows additional" — see the
JSONL format section below.
```
Copied into Task 2 as the exact current paragraph. Task 2 applies four precise substitutions within it (6→7; `14 to 19 rows`→`15 to 20 rows`; `14 to 22 rows`→`15 to 23 rows`; `23rd row`→`24th row`; `14–19`/`14–21`→`15–20`/`15–22`) while leaving the "Each of the four conditional rows..." sentence and the closing "exactly 8" sentence untouched.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:1003-1004
    { "id": "R-COH-VALIDATE-ALWAYS-PASS", "passed": true }
  ],
```
Copied into Task 3 as the exact two-line anchor: a comma is appended to the first line and a new row line is inserted before the second.

````
# SOURCE: PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md:777-778, 821-832
### Task 8: UPDATE plugins/relay/agents/plan-reviewer.md — widen the rubric-count prose for the 4th conditional row

**ACTION**: ... replace that passage with: "... Together these widen
the range to `14 to 22 rows` in the maximal case (...) — NOT
`14 to 23`, because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` can never both fire on the same
plan. ..."

**VALIDATE**:
```bash
set -euo pipefail
grep -q "14 to 22 rows" plugins/relay/agents/plan-reviewer.md
grep -q "mutually-exclusive" plugins/relay/agents/plan-reviewer.md
if grep -q "14 to 23" plugins/relay/agents/plan-reviewer.md; then
  echo "FAIL: rubric range incorrectly widened to 14 to 23 rows"
  exit 1
else
  echo "PASS: rubric-count prose updated; range correctly stays at 14 to 22"
fi
```
````
Cited in `## Source` and `## Problem Statement` above as the real, merged instance of the exact contradiction class `R-COH-ACTION-VALIDATE-CONTRADICTION` (Task 1) now catches: the ACTION's own "NOT `14 to 23`" phrase is a quoted literal inserted into `plugins/relay/agents/plan-reviewer.md`, while the SAME task's own VALIDATE asserts that exact literal's absence. The Implementer landed "the range never extends to a 23rd row" instead, deviating from the plan's literal text to avoid the impossible instruction.

```
# SOURCE: docs/decisions.md:878-880
---

<!-- Template for future entries:
```
Copied into Task 4 as the exact insertion anchor: the new `## [2026-07-26]` entry is inserted immediately after this `---` and before the `<!-- Template for future entries:` comment block.

```
# SOURCE: docs/decisions.md:688
**Areas affected:** `plugins/relay/agents/plan-writer.md`, `docs/context/plan-template.md`, `plugins/relay/agents/plan-reviewer.md` (new R-COH-VALIDATE-ALWAYS-PASS deterministic check; rubric[] length 14–19), every future generated plan's Validation Commands and per-task VALIDATE lines.
```
Copied into Task 4's ACTION as the exact stale numeral ("rubric[] length 14–19") this phase's own `docs/decisions.md` entry explicitly states it supersedes.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Insert the new `#### R-COH-ACTION-VALIDATE-CONTRADICTION` deterministic check; update the `### Logging discipline` rubric-arithmetic paragraph; add the matching JSONL example row |
| `docs/decisions.md` | UPDATE | Add the `## [2026-07-26]` entry recording the new check, its unconditional-vs-zero-emission rationale, and the arithmetic-numeral supersession |

## NOT Building (Scope Limits)

- General natural-language contradiction detection between ACTION and VALIDATE — scoped to the tractable, mechanically-describable subset only (quoted/backticked literal inserted vs. same-file zero-count assertion, and its removal-vs-presence inverse). Research corroborates general LLM self-contradiction detection is unreliable (ContraDoc: GPT-4 at 53.8% binary accuracy, near chance) — a broader heuristic would be a false-confidence liability, not a stronger gate.
- Any change to `plugins/relay/agents/plan-writer.md`'s own ACTION-authoring guidance to preemptively avoid this contradiction shape — out of scope; this phase adds only the REVIEW-side structural check.
- Actually executing a task's VALIDATE command to observe its real exit code — `plan-reviewer` has no `Bash` tool; this check is, and remains, a textual scan. Real enforcement stays the Implementer's own VALIDATE execution.
- Any change to the K=5 bounded LLM judgment pass's taxonomy (`R-COH-SUMMARY-TASKS-DRIFT`, `R-COH-AC-TASK-DECOUPLED`, etc.) — this is a new FIXED deterministic check, not a K=5 finding class.
- Updating `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs` or `scripts/validate/checks/figma-track-phase5.test.mjs` directly — R-X strict reserves test-file authorship to the test pair, never the Implementer; this plan flags the staleness explicitly in Notes and Risks instead of authoring a task that would violate R-X.
- Any change to the four existing conditional (`figma_track`/`phase_scope`-gated) checks' own logic, gating, or wording beyond the arithmetic paragraph's numerals — `R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`, `R-COH-VISUAL-SCOPE-PURITY`, and `R-COH-SENTINEL-RESOLUTION-MISSING` are untouched.
- A retroactive re-review of already-APPROVED or already-IMPLEMENTED plans (e.g. re-flagging the historical Task 8 instance after the fact) — out of scope; the check applies only to future plan-reviewer runs.
- Introducing the literal substring `14 to 23` anywhere in `plugins/relay/agents/plan-reviewer.md` — the hard prohibition this phase's own numeral changes must respect (see Task 2's explicit self-check).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/plan-reviewer.md — insert R-COH-ACTION-VALIDATE-CONTRADICTION deterministic check

**ACTION**: Immediately after `R-COH-VALIDATE-ALWAYS-PASS`'s final bullet (ending "...FAIL naming the Level (or task heading), quoting the offending command verbatim, and stating the fix form: `if <check>; then echo "FAIL: …"; exit 1; else echo "PASS: …"; fi`.") and immediately before the existing `#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active` heading, insert the following new subsection verbatim:

```
#### R-COH-ACTION-VALIDATE-CONTRADICTION — a task's ACTION prose does not contradict that SAME task's own VALIDATE command

**Unconditional — always emitted, never zero-emission.** Unlike the
four `figma_track`/`phase_scope`-gated conditional checks below,
every plan has `### Task <i>` entries carrying `**ACTION**:` and
`**VALIDATE**:` content, and there is no project- or plan-level
declaration this check could gate on — so it always contributes
exactly one row to `rubric[]`. Its nearest sibling in this respect is
`R-COH-VALIDATE-ALWAYS-PASS`, also unconditional.

- Parse `## Step-by-Step Tasks` for `### Task <i>: ...` headings.
  Evaluate each task independently — this check never compares
  across tasks — reading its `**ACTION**:` prose against that SAME
  task's own `**VALIDATE**:` command(s).
- Within a task's `**ACTION**:` prose, look for a quoted or
  backticked literal string (text set off by a pair of backticks or
  double quotes) that the prose instructs be INSERTED, ADDED, or
  WRITTEN into a specific file — the file named in the
  `### Task <i>:` heading, or a file path stated explicitly in the
  ACTION prose.
- **(a) Insert-vs-reject contradiction.** FAILS when that SAME
  task's `**VALIDATE**:` command(s) check the SAME file for the SAME
  literal and assert it must be ABSENT or occur zero times — e.g. a
  `grep -c "<literal>" <file>` whose expected count is `0`, or a
  `grep -q "<literal>" <file>` used inside an "if found, FAIL" shape
  — because literal compliance with the ACTION (inserting the
  literal) would make the task's own VALIDATE fail. `reason` quotes
  the offending ACTION fragment, the offending VALIDATE fragment, and
  the contradicting literal, verbatim.
- **(b) Remove-vs-require contradiction (the inverse).** FAILS when a
  task's ACTION instead instructs REMOVING, DELETING, or STRIPPING a
  quoted/backticked literal from a file, while that SAME task's
  VALIDATE requires or asserts the literal's PRESENCE in that SAME
  file (e.g. a bare `grep -q "<literal>" <file>` with no absence
  framing, expected to succeed) — literal compliance with the ACTION
  would make the VALIDATE fail for the opposite reason. `reason`
  quotes both fragments and the literal, verbatim, the same way as
  (a).
- A task with no quoted/backticked literal in its ACTION, or whose
  VALIDATE targets a different file or a different literal than the
  one named in its own ACTION, does not trip either condition for
  that task.
- Otherwise (no offending task found — including vacuously, on a
  plan with zero tasks matching this shape at all) →
  `{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }`.

**Known limitation (recorded, not blocking):** this is a heuristic
textual scan over plan-authored prose, not real execution —
`plan-reviewer` has no `Bash` tool and cannot execute a task's
VALIDATE command to observe its real exit code; it matches literals
textually against the ACTION prose, so it can both miss an obfuscated
or paraphrased contradiction (the literal reworded, or split across a
sentence) and false-positive on an incidental match. It is a
plan-authoring-time gate, not the final safety net; the real
enforcement remains the Implementer actually running the task's own
VALIDATE command.
```

**MIRROR**: Patterns to Mirror blocks 1 (insertion boundary), 2 (`R-COH-VISUAL-SCOPE-PURITY` framing + Known-limitation shape), 3 (`R-COH-SENTINEL-RESOLUTION-MISSING` Known-limitation shape).

**ADDRESSES**: AC-A1, AC-A2, AC-A3, AC-A4

**VALIDATE**:
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
grep -q "#### R-COH-ACTION-VALIDATE-CONTRADICTION" "$FILE"
grep -q "Known limitation (recorded, not blocking)" "$FILE"
always_pass_line=$(grep -n "#### R-COH-VALIDATE-ALWAYS-PASS" "$FILE" | head -1 | cut -d: -f1)
new_check_line=$(grep -n "#### R-COH-ACTION-VALIDATE-CONTRADICTION" "$FILE" | head -1 | cut -d: -f1)
design_source_line=$(grep -n "#### R-COH-DESIGN-SOURCE-MISSING" "$FILE" | head -1 | cut -d: -f1)
if [ "$new_check_line" -le "$always_pass_line" ] || [ "$new_check_line" -ge "$design_source_line" ]; then
  echo "FAIL: R-COH-ACTION-VALIDATE-CONTRADICTION is not positioned between R-COH-VALIDATE-ALWAYS-PASS and R-COH-DESIGN-SOURCE-MISSING"
  exit 1
fi
echo "PASS: new check present with Known-limitation paragraph, correctly positioned"
```

### Task 2: UPDATE plugins/relay/agents/plan-reviewer.md — widen the rubric-count arithmetic to 7 fixed deterministic checks

**ACTION**: Within the `### Logging discipline` paragraph (Patterns to Mirror block 4), using `Edit` with `old_string` copied verbatim from the live file (preserving the real line break that today falls after "deterministic" — this exact span already wraps mid-phrase in the live file, confirmed by this plan's own grounding reads), apply these four precise substitutions and no others:

1. Replace the inline-code span `` `8 (R1–R8) + 6 (deterministic R-COH-*) + ≤5 (K=5 pass) = 14 to 19 rows` `` with `` `8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20 rows` ``.
2. Replace `` `14 to 22 rows` `` with `` `15 to 23 rows` ``.
3. Replace "the range never extends to a 23rd row" with "the range never extends to a 24th row".
4. Replace "so the baseline 14–19 range is exact for every non-Figma project, and the 14–21 range from the prior" with "so the baseline 15–20 range is exact for every non-Figma project, and the 15–22 range from the prior".

Leave the sentence "Each of the four conditional rows is independently zero-emission..." and the closing "exactly 8" wording sentence untouched — the new check is FIXED, not a fifth conditional row, so "four conditional rows" stays correct.

**MIRROR**: Patterns to Mirror block 4 (the current arithmetic paragraph, full text).

**ADDRESSES**: AC-A5, AC-A6

**VALIDATE**:
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
grep -q "7 (deterministic" "$FILE"
grep -q "15 to 20 rows" "$FILE"
grep -q "15 to 23 rows" "$FILE"
grep -q "24th row" "$FILE"
grep -q "Each of the four conditional rows" "$FILE"
if grep -q "14 to 23" "$FILE"; then
  echo "FAIL: forbidden literal '14 to 23' found in $FILE"
  exit 1
fi
if grep -q "14 to 19 rows" "$FILE"; then
  echo "FAIL: stale '14 to 19 rows' text still present in $FILE"
  exit 1
fi
if grep -q "14 to 22 rows" "$FILE"; then
  echo "FAIL: stale '14 to 22 rows' text still present in $FILE"
  exit 1
fi
if grep -q "23rd row" "$FILE"; then
  echo "FAIL: stale '23rd row' wording still present in $FILE"
  exit 1
fi
echo "PASS: rubric-count prose updated to 7 fixed deterministic checks; 15-20/15-23/24th numerals present; four-conditional-rows wording preserved; no stale or forbidden numerals remain"
```

### Task 3: UPDATE plugins/relay/agents/plan-reviewer.md — add JSONL example row for the new check

**ACTION**: In the `## review.jsonl format` section's example JSON code block (Patterns to Mirror block 5), replace:
```
    { "id": "R-COH-VALIDATE-ALWAYS-PASS", "passed": true }
  ],
```
with:
```
    { "id": "R-COH-VALIDATE-ALWAYS-PASS", "passed": true },
    { "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }
  ],
```

**MIRROR**: Patterns to Mirror block 5.

**ADDRESSES**: AC-A7

**VALIDATE**:
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
grep -q '"id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true' "$FILE"
grep -A1 '"id": "R-COH-VALIDATE-ALWAYS-PASS", "passed": true' "$FILE" | grep -q "R-COH-ACTION-VALIDATE-CONTRADICTION"
echo "PASS: JSONL example row for R-COH-ACTION-VALIDATE-CONTRADICTION present immediately after R-COH-VALIDATE-ALWAYS-PASS"
```

### Task 4: UPDATE docs/decisions.md — add the [2026-07-26] decision entry

**ACTION**: Immediately after the `---` that closes the [2026-07-25] `phase_scope: logic` sentinel-ledger resolution entry and immediately before the `<!-- Template for future entries:` comment block (Patterns to Mirror block 7), insert:

```
## [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED deterministic plan-reviewer check catching ACTION/VALIDATE self-contradiction; rubric[] arithmetic shifts to 15–20/15–23

**Context:** `plan-reviewer`'s additive R-COH-* coherence layer had no
check cross-referencing a single task's own `**ACTION**:` prose
against that SAME task's own `**VALIDATE**:` command. A real instance
escaped review: `PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md`
Task 8 instructed inserting the literal `` `14 to 23` `` into
`plugins/relay/agents/plan-reviewer.md` (as part of a clarifying "NOT
`14 to 23`" aside) while that SAME task's own VALIDATE asserted
`grep -q "14 to 23" plugins/relay/agents/plan-reviewer.md` must find
nothing — literal compliance with the ACTION was structurally
impossible. `plan-reviewer` APPROVED the plan anyway: it verified the
rubric-row arithmetic was correct but never cross-checked the ACTION
prose against the VALIDATE command of the SAME task. The Implementer
deviated from the plan's literal ACTION text (landing "the range
never extends to a 23rd row" instead of the plan's literal
instruction) and self-reported the judgment call; `code-reviewer`
independently ruled the deviation justified. No mechanism existed to
catch the authoring-time defect itself, before implementation.

**Decision:** `plan-reviewer` gains a 7th FIXED deterministic
`R-COH-*` check, `R-COH-ACTION-VALIDATE-CONTRADICTION`, positioned
immediately after `R-COH-VALIDATE-ALWAYS-PASS` and immediately before
`R-COH-DESIGN-SOURCE-MISSING` — preserving "fixed checks first,
conditional checks after". For each `### Task <i>` in `##
Step-by-Step Tasks`, it detects two contradiction shapes between that
task's own ACTION and its own VALIDATE: (a) the ACTION instructs
inserting a quoted/backticked literal into a file while the VALIDATE
asserts a zero count of that same literal in that same file; and (b)
the inverse — the ACTION instructs removing a literal while the
VALIDATE requires its presence. It is a textual scan performed by the
reviewer over the plan already in memory (`plan-reviewer`'s tool
grant is `Read, Edit, Write` — no `Bash`, no `Grep` — so it cannot
execute the VALIDATE command itself), in the same voice as
`R-COH-VALIDATE-ALWAYS-PASS`, and closes with a "Known limitation"
paragraph matching `R-COH-VISUAL-SCOPE-PURITY`/`R-COH-SENTINEL-RESOLUTION-MISSING`'s
own shape.

**Deliberately UNCONDITIONAL, not a 5th zero-emission conditional
row.** Unlike the four existing declaration-gated zero-emission
checks (`R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED` gated on
`figma_track`; `R-COH-VISUAL-SCOPE-PURITY`/`R-COH-SENTINEL-RESOLUTION-MISSING`
gated on `phase_scope`), `R-COH-ACTION-VALIDATE-CONTRADICTION` has no
project- or plan-level declaration to gate on — every plan has
ACTION+VALIDATE tasks by construction (the plan template already
mandates this shape on every task). It therefore always contributes
exactly one row to `rubric[]`, `passed: true` vacuously on a plan
with no task matching the tractable contradiction shape, mirroring
`R-COH-VALIDATE-ALWAYS-PASS`'s own unconditional precedent, not the
four conditional siblings' zero-emission one.

**Rubric[] arithmetic shifts.** The `### Logging discipline`
paragraph in `plugins/relay/agents/plan-reviewer.md` is updated for 7
fixed deterministic checks (was 6): baseline (non-Figma)
`8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20
rows` (was 14 to 19); maximal (two design rows plus exactly one of
the two mutually-exclusive `phase_scope` rows, plus the full 5-row
K=5 pass) = `15 to 23 rows` (was 14 to 22); the range never extends
to a 24th row (was 23rd), because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` remain mutually exclusive. The
preserved range for a `figma_track: true` project whose plan has no
`phase_scope` row at all shifts from 14–21 to 15–22. The "four
conditional rows" wording is UNCHANGED — the new check is FIXED, not
a fifth conditional row, so the count of conditional rows stays four.
**This entry's numerals supersede the "rubric[] length 14–19" numeral
recorded in the [2026-07-09] entry's "Areas affected" line above**
(`docs/decisions.md` [2026-07-09] "Validation commands must carry
real exit-code semantics..."), which predates this shipment.

**Reason:** The escaped instance demonstrates the gap is real, not
hypothetical: a plan can be structurally well-formed (correct
rubric-row arithmetic, correct ordering, correct wording) while still
being internally self-contradictory at the single-task granularity
R1–R8 and the six prior R-COH-* checks do not examine. The check is
deliberately scoped to the tractable, high-value subset (quoted/
backticked literal + same-file zero-count/presence grep) rather than
attempting general natural-language contradiction detection,
consistent with this layer's existing deterministic checks
(mechanical, not LLM-judged) and its separate bounded K=5 LLM pass
(which already covers broader, harder-to-mechanize contradiction
classes). Making it UNCONDITIONAL rather than a fifth zero-emission
conditional row is correct because — unlike Figma/visual-first
involvement, which is a business decision the reviewer cannot
manufacture — every plan already has ACTION+VALIDATE task pairs by
construction; there is no "doesn't apply" case to gate on, only a
"found nothing" vacuous-pass case, mirroring
`R-COH-VALIDATE-ALWAYS-PASS`'s own precedent exactly.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md` (new
`#### R-COH-ACTION-VALIDATE-CONTRADICTION` deterministic check,
positioned between `R-COH-VALIDATE-ALWAYS-PASS` and
`R-COH-DESIGN-SOURCE-MISSING`; `### Logging discipline`
rubric[]-length arithmetic 14–19/14–22 → 15–20/15–23, 23rd → 24th row
wording, 14–21 → 15–22 preserved range; `## review.jsonl format`
example block gains a matching row); `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`
and `scripts/validate/checks/figma-track-phase5.test.mjs` (both
assert verbatim sentences from the updated paragraph —
`EXISTING_TEST_UPDATED` follow-up by the test pair, test-after per
`docs/context/methodology.md`); this entry's own numerals now the
canonical rubric[]-length reference, superseding the [2026-07-09]
entry's stale "14–19" mention.

---
```

**MIRROR**: Patterns to Mirror blocks 6 (historical bug instance, for Context), 7 (insertion anchor), 8 (2026-07-09 entry, for the supersession citation).

**ADDRESSES**: AC-A8

**VALIDATE**:
```bash
set -euo pipefail
FILE="docs/decisions.md"
grep -q "## \[2026-07-26\] R-COH-ACTION-VALIDATE-CONTRADICTION" "$FILE"
grep -q "15 to 20" "$FILE"
grep -q "15 to 23" "$FILE"
grep -qi "supersede" "$FILE"
if grep -q "14 to 23" "$FILE"; then
  echo "FAIL: forbidden literal '14 to 23' found in $FILE"
  exit 1
fi
echo "PASS: docs/decisions.md [2026-07-26] entry present with updated arithmetic and supersession note; no forbidden literal introduced"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
DFILE="docs/decisions.md"
grep -q "#### R-COH-ACTION-VALIDATE-CONTRADICTION" "$FILE"
grep -q "15 to 20 rows" "$FILE"
grep -q "15 to 23 rows" "$FILE"
grep -q "24th row" "$FILE"
grep -q '"id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true' "$FILE"
grep -q "## \[2026-07-26\] R-COH-ACTION-VALIDATE-CONTRADICTION" "$DFILE"
if grep -q "14 to 23" "$FILE"; then
  echo "FAIL: forbidden literal '14 to 23' found in plan-reviewer.md"
  exit 1
fi
echo "PASS: all content invariants present across plan-reviewer.md and decisions.md"
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
npm run validate
node --test scripts/validate/checks/
```

Every command above either exits with the natural non-zero status of a failing `grep -q`/`npm run validate`/`node --test` under `set -euo pipefail`, or an explicit `if …; then …; exit 1; fi` guard — none rely on the forbidden `<check> && echo "PASS" || echo "FAIL"` idiom, per the 2026-07-09 decision and `plan-reviewer`'s own `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1:** Given a DRAFT plan with at least one `### Task <i>` whose `**ACTION**:` prose instructs inserting a quoted/backticked literal into a file and whose own `**VALIDATE**:` command greps that same file asserting a zero count of that same literal, when `plan-reviewer` runs the new `R-COH-ACTION-VALIDATE-CONTRADICTION` check, then it returns `passed: false`, naming the offending task and quoting the ACTION fragment, the VALIDATE fragment, and the contradicting literal verbatim.
- **AC-A2:** Given a DRAFT plan with at least one task whose ACTION instructs removing a quoted/backticked literal from a file while that SAME task's VALIDATE requires/asserts the literal's presence in that file (the inverse contradiction), when `plan-reviewer` runs the check, then it likewise returns `passed: false`, naming the offending task.
- **AC-A3:** Given a DRAFT plan with no task exhibiting either contradiction shape, when `plan-reviewer` runs the check, then it emits exactly one row `{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }` — vacuously — on every run, never zero-emission, unlike the four `figma_track`/`phase_scope`-gated conditional checks.
- **AC-A4:** Given `plugins/relay/agents/plan-reviewer.md`'s existing deterministic-check ordering, when the new check is added, then its `#### R-COH-ACTION-VALIDATE-CONTRADICTION` heading appears immediately after `#### R-COH-VALIDATE-ALWAYS-PASS` and immediately before `#### R-COH-DESIGN-SOURCE-MISSING`, preserving the existing relative order of the four conditional checks and the `groundedIdx < purityIdx < k5Idx`-style ordering assertions in `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`.
- **AC-A5:** Given the `### Logging discipline` rubric-arithmetic paragraph, when this change lands, then it reads "7 (deterministic R-COH-*)" (was 6), "15 to 20 rows" baseline (was 14 to 19), "15 to 23 rows" maximal (was 14 to 22), "24th row" (was 23rd), and "15–20"/"15–22" preserved ranges (was 14–19/14–21) — while the "four conditional rows" wording is unchanged.
- **AC-A6:** Given `plugins/relay/agents/plan-reviewer.md`'s full content after this change, when scanned for the literal substring `14 to 23`, then zero matches are found anywhere in the file.
- **AC-A7:** Given the `## review.jsonl format` example JSONL block, when this change lands, then a new row `{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }` appears immediately after the existing `R-COH-VALIDATE-ALWAYS-PASS` row, so all 7 fixed deterministic checks each have an example row.
- **AC-A8:** Given `docs/decisions.md`, when this change lands, then a new `## [2026-07-26]` entry records the new check, the deliberate unconditional-vs-zero-emission rationale, and the arithmetic shift, explicitly noting it supersedes the "rubric[] length 14–19" numeral recorded in the [2026-07-09] entry's "Areas affected" line.

*R8b (PRD AC-N token check) does not apply in description mode — no `(PRD AC-N)` token required.*

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The check is a heuristic textual scan (no `Bash`/`Grep` tool) — it can miss an obfuscated/paraphrased ACTION/VALIDATE contradiction or false-positive on an incidental literal match | Medium | Medium | Documented explicitly as a "Known limitation" in the check itself, mirroring `R-COH-VISUAL-SCOPE-PURITY`/`R-COH-SENTINEL-RESOLUTION-MISSING`'s own precedent; corroborated by `research-web` findings that LLM self-contradiction detection over free text is itself unreliable (ContraDoc: GPT-4 at 53.8% binary accuracy, near chance) — the check is deliberately scoped to a narrow, mechanically-describable pattern rather than general reasoning, and the real safety net remains the Implementer actually running the VALIDATE command |
| `node --test scripts/validate/checks/` (this plan's own Level 3) is expected to report 2 pre-existing test failures immediately after this phase's own tasks land, before the test pair's follow-up lands | High (certain, until the test pair runs) | Low | Explicitly documented in `## Notes` as a known-transient-red condition tied to the two named files; `EXISTING_TEST_UPDATED` is the correct lifecycle classification (the property each test verifies is unchanged, only numerals move) — never `OBSOLETE_TEST_REMOVED`/`REDUNDANT_TEST_REMOVED`, and never silently deleted, per `docs/anti-patterns.md`'s "Weakening or deleting tests" prohibition |
| A future edit to the same `### Logging discipline` paragraph (a 5th conditional check, or an 8th fixed check) repeats this exact numeral-arithmetic churn and could reintroduce an ACTION/VALIDATE mismatch of its own | Medium | Low | The new `R-COH-ACTION-VALIDATE-CONTRADICTION` check itself is the structural mitigation going forward; this plan's own Task 2 self-demonstrates a compliant, non-contradictory ACTION/VALIDATE pair for the identical edit shape |
| Positioning the new check between two existing headings via `Edit` with a narrow `old_string` could silently fail (whitespace drift) if the live file has changed since this plan's grounding pass | Low | Medium | Task 1's VALIDATE independently re-checks both presence and relative position (`always_pass_line < new_check_line < design_source_line`) via `grep -n`, so a silent mis-insertion is caught by exit code, not just by visual inspection |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` IS declared in this repo, so the pair is active — but this phase's own four tasks (Files to Change: `plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`) touch zero `.mjs` files, consistent with `phase_type: scaffold` above. The test pair's required follow-up is the two EXISTING test files named below.

**Test impact — required test-pair follow-up (NOT an Implementer task; R-X strict).** Two existing tests assert the pre-change wording of the `### Logging discipline` paragraph this phase's Task 2 rewrites, and WILL go stale:
- `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs` (~line 456) asserts verbatim sentences containing `14 to 22 rows`, `never extends to a 23rd row`, `baseline 14–19`, and `14–21`.
- `scripts/validate/checks/figma-track-phase5.test.mjs` (~line 309) asserts a regex over the same paragraph matching `14–19 baseline` and the "four conditional rows" wording.

Both are legitimate `EXISTING_TEST_UPDATED` lifecycle entries — the underlying property each test verifies (the maximal range never reaches the next-forbidden row; the baseline is exact for non-Figma projects; four conditional rows are each independently zero-emission) is unchanged; only the numerals move (14–19/14–22/23rd → 15–20/15–23/24th). Per `docs/anti-patterns.md`'s "Weakening or deleting tests" prohibition, neither file may be silently deleted or have its assertion scope narrowed — the test pair (test-writer/test-reviewer, test-after) must record each fix as an `EXISTING_TEST_UPDATED` ledger entry, exactly as this same paragraph's two prior updates ([2026-07-25] Phase 3, [2026-07-25] Phase 4) were each independently recorded by that pair in this exact codebase. This plan intentionally does NOT add a Step-by-Step Task instructing either file's update — the Implementer authors ZERO test-file changes (R-X strict, `docs/decisions.md` [2026-05-06]/[2026-07-10]); test authorship/update is the test pair's exclusive authority.

New tests the pair should add, beyond updating the two existing assertions: (1) the new check's presence and heading text; (2) its position between `R-COH-VALIDATE-ALWAYS-PASS` and `R-COH-DESIGN-SOURCE-MISSING`; (3) its unconditional (non-zero-emission) framing, distinguishing it from the four conditional siblings; (4) its `Known limitation` paragraph; (5) its JSONL example row; (6) the continued absence of the literal `14 to 23` from `plugins/relay/agents/plan-reviewer.md`.

**Level 3 known-transient-red note.** Immediately after this phase's own Tasks 1–4 land (before the test pair's follow-up), `node --test scripts/validate/checks/` is EXPECTED to report exactly 2 failing tests — one each in `figma-visual-first-track-phase3.test.mjs` and `figma-track-phase5.test.mjs` — because both assert verbatim sentences from the paragraph Task 2 intentionally rewords. This is the documented, expected staleness described in Risks above, not a defect in this phase's own four tasks. It resolves to a fully green run once the test pair lands its own `EXISTING_TEST_UPDATED` follow-up.

**Design note — grep-target discipline (LINE-WRAP vs GREP), applying the established lesson from `PRPs/plans/completed/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md`'s own Notes.** Every `VALIDATE` grep target in this plan is a short, single-line-safe fragment (`7 (deterministic`, `15 to 20 rows`, `15 to 23 rows`, `24th row`, `14 to 23`, `14 to 19 rows`, `14 to 22 rows`, `23rd row`) rather than a long multi-word span that could straddle this file's own prose line-wrapping — the `### Logging discipline` paragraph's own inline-code arithmetic span already wraps mid-span in the live file today (confirmed by this plan's own grounding reads), so Task 2's ACTION performs that specific substitution via `Edit`'s exact-byte `old_string` match (which spans the real line break correctly) while every VALIDATE grep target stays deliberately short and unwrapped.

**Research grounding.** `research-codebase` confirmed every `file:line` citation in this plan via direct reads of `plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`, and the historical completed plan, and independently corroborated the real bug instance: Task 8's ACTION instructed inserting a "NOT `14 to 23`" clarifying aside while its own VALIDATE asserted `grep -q "14 to 23"` must find nothing. `research-web`'s pass found no direct industry precedent for this exact narrow pattern (an LLM reviewer cross-checking a single generated item's own instruction-text against its own verification-text pre-execution) but surfaced directly relevant caution: the ContraDoc benchmark measures LLMs (including GPT-4, at 53.8% binary accuracy — near chance) as unreliable at detecting self-contradictions in free text, and a Snorkel AI analysis found repeated LLM self-critique loops can actively degrade already-correct outputs. Both findings support this phase's explicit scoping decision: the check targets only the tractable, mechanically-describable subset rather than open-ended contradiction reasoning.

**Self-application note.** This plan is itself, by construction, a live test of the rule it adds: Task 2's ACTION instructs removing the exact strings `14 to 19 rows`, `14 to 22 rows`, and `23rd row` from `plugins/relay/agents/plan-reviewer.md` and replacing them with `15 to 20 rows`, `15 to 23 rows`, and `24th row` — at no point does any task's ACTION instruct inserting the literal `14 to 23`, so every task's own VALIDATE (which asserts that substring's continued absence) is satisfiable by literal compliance with its own ACTION.

---

*Generated: 2026-07-26*
*Approved: 2026-07-26*
*Implemented: 2026-07-26*
*Status: IMPLEMENTED*
