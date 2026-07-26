# Feature: Plan authoring — logic phase + sentinel ledger (Phase 4 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of existing shipped agent files (plan-writer.md, plan-reviewer.md); extension of a canonical template (plan-template.md) whose `phase_scope` Metadata-row paragraph Phase 3 already resolved for the visual branch; reuse of an established non-heuristic declaration pattern (design_source's lineage, and phase_scope's own Phase-3-shipped mirror of it) for the logic branch; a new deterministic structural check added to an existing reviewer's additive R-COH-* coherence layer; cross-cutting arithmetic (rubric-length-counting prose) that must stay internally consistent across a prior shipment
- Decisions found:
  - [2026-07-25] `phase_scope` non-heuristic sourcing + `R-COH-VISUAL-SCOPE-PURITY` enforcement (Phase 3) — explicitly names "future Phase 4 (`phase_scope: logic` + sentinel-ledger resolution)" as this mechanism's next consumer
  - [2026-07-25] Visual-first phase-pairing: `[VISUAL]`/`[LOGIC]` bracket tag + strict 1:1 `Depends` pairing (Phase 2) — the pairing primitive this plan's paired-visual-row derivation reads
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference — the lineage `phase_scope` (and this phase's frame-inheritance amendment) mirrors
  - [2026-05-14] `phase_type` Metadata-field precedent (self-healing, reviewer may infer/insert) — the explicit contrast case `phase_scope` deliberately diverges from
  - [2026-07-09] Validation commands must carry real exit-code semantics; `plan-reviewer` enforces via `R-COH-VALIDATE-ALWAYS-PASS` — binding on every VALIDATE/Level command this plan emits, especially the zero-remaining-sentinel check
  - [2026-04-28] AC-10 of `plan-authoring.prd.md` evolves: R-COH-* rows are additive to the `rubric[]` array — confirms the new `R-COH-SENTINEL-RESOLUTION-MISSING` row can be added without violating "no extras"
  - [2026-04-25] Plan filenames carry the source PRD phase number and slug — this plan's own filename convention (with a Phase-3-precedented hand-simplified slug; see Notes)
  - [2026-05-01] Source PRD's Implementation Phases table IS the state machine; `Depends` is the native sequencing primitive (D6) — the primitive the `[VISUAL]`/`[LOGIC]` pairing, and this phase's paired-visual-row derivation, both reuse
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — confirms `plan-writer`/`plan-reviewer` both operate with no dialogue; this phase adds no new interactivity-boundary extension
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — generalizes to `phase_scope`'s logic branch exactly as it did to the visual branch in Phase 3: never inferred, only copied verbatim from the PRD row's tag
  - "Writing pipeline artifacts under `.claude/`" — standing background constraint; every write in this phase lands under `plugins/relay/agents/`, `docs/context/`, `documentation/`, or `PRPs/plans/`, never `.claude/`
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; `plan-writer`/`plan-reviewer` both run fully autonomously, no dialogue
  - "One command per stage, writer/reviewer split" — `plan-writer`/`plan-reviewer` remain a matched pair; the new sourcing + task-authoring logic lives in the writer, the new structural check lives in the reviewer
  - Source PRD's Implementation Phases table is the orchestrator's sole state machine; the `Depends` column is the native sequencing primitive this phase's paired-visual-row derivation reuses, never re-derives
  - PRP artifact convention (`PRPs/plans/`, `PRPs/prds/`) — this plan and its PRD back-fill both respect it
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 4:
  "Plan authoring — logic phase + sentinel ledger" — Goal: `/relay-plan`
  against a `phase_scope: logic` row produces a plan that resolves the
  paired visual phase's sentinel ledger completely. — Success signal: A
  logic-scoped plan reviewed against a fixture with a
  deliberately-unresolved sentinel correctly fails.

## Summary

This phase completes the `figma-visual-first-track` plan-authoring pair
Phase 3 began: it wires the LOGIC side of `phase_scope` into
`plan-writer` and `plan-reviewer`, symmetric to Phase 3's VISUAL side.
`plan-writer` gains (a) a Phase 2 GROUNDING dispatch extension that
derives an initial sentinel ledger by pointing `research-codebase` at
the paired visual phase's touched files, searching for
`RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR` occurrences; (b) a Step 4.3.5
amendment so a `phase_scope: logic` plan's conditional `## Design
Source` section inherits the paired visual phase's locked frame set
(filtered by the paired visual row's own number — read from row N's
`Depends` cell — rather than row N's own number); (c) a Step 4.4 item
6 Mandatory Reading amendment adding `mock-sentinels.md` and the
paired visual plan as P0 reading; (d) a Step 4.4 item 10 mandatory
task-authoring rule requiring at least one sentinel-resolution task
(per `mock-sentinels.md`'s swap semantics) backed by a strict
zero-remaining VALIDATE with no deferral path, plus a matching
anti-pattern bullet; and (e) a new Hard Constraint #13 promoting that
rule to top-of-file visibility, mirroring #12's promotion of the
visual-side rule. `plan-reviewer` gains a new zero-emission
deterministic check, `R-COH-SENTINEL-RESOLUTION-MISSING`, mirroring
`R-COH-VISUAL-SCOPE-PURITY`'s exact zero-emission/otherwise shape but
keyed on `phase_scope: logic` instead of `visual` — the two checks are
mutually exclusive per plan since they key off the same single-valued
Metadata cell, so the rubric's "14 to 22 rows" maximal bound does NOT
change even though a 4th conditional row now exists; the surrounding
rubric-count prose is updated to state this precisely.
`docs/context/plan-template.md`'s existing `phase_scope` paragraph
gains the "What `phase_scope: logic` implies for the plan body"
counterpart to its existing visual paragraph, preserving the "no
companion conditional section" sentence verbatim.

## User Story

As a developer maintaining the relay plugin, I want `plan-writer` to
non-heuristically derive a `phase_scope: logic` plan's
sentinel-resolution ledger from its paired visual phase's touched
files and author a mandatory, strictly-enforced zero-remaining-sentinel
resolution task, and `plan-reviewer` to structurally enforce that
requirement, so that a logic phase's plan can never reach `complete`
while a mock sentinel silently survives — closing the loop the source
PRD's AC-5 opens and Phase 3's visual-side purity check leaves
half-finished.

## Problem Statement

Phase 3 gave `plan-writer` the ability to source `phase_scope`
non-heuristically and restrict a VISUAL-scoped plan's tasks to
sentinel-backed UI-and-mocks work — but a `phase_scope: logic` plan
today gets none of the symmetric treatment: no agent derives what
sentinels the paired visual phase left behind, no agent requires a
task that resolves them, and no agent enforces the zero-remaining,
no-deferral rule `docs/context/mock-sentinels.md` and the source
PRD's own Decisions Log ("Sentinel deferral policy: Never allowed")
already mandate. Without this phase, a logic-scoped plan could reach
`plan-reviewer` APPROVED — and later Implementer `complete` — while a
`[RELAY-MOCK-DATA]` or `[RELAY-MOCK-BEHAVIOR]` sentinel from the
visual phase is still silently sitting in the codebase, exactly the
"forgotten mock silently ships" failure mode AC-5 exists to prevent.

## Solution Statement

Give `plan-writer` a non-heuristic sentinel-ledger derivation (via an
extended Phase 2 GROUNDING `research-codebase` dispatch against the
paired visual phase's touched files), a mandatory task-authoring rule
requiring at least one resolution task per `mock-sentinels.md`'s swap
semantics backed by a strict zero-remaining VALIDATE, and a
Design-Source frame-inheritance amendment so the logic plan's
regression targets the same locked frames the visual phase declared;
give `plan-reviewer` a new zero-emission `R-COH-SENTINEL-RESOLUTION-MISSING`
check that structurally enforces the same requirement — mutually
exclusive with, and exactly mirroring the shape of, Phase 3's
`R-COH-VISUAL-SCOPE-PURITY`.

## Metadata

| Field | Value |
|---|---|
| Type | Agent capability extension (new non-heuristic sentinel-ledger derivation + mandatory task-authoring rule + new reviewer structural check + Design Source frame-inheritance amendment) |
| Complexity | Medium-High |
| Systems Affected | `plugins/relay/agents/plan-writer.md`, `plugins/relay/agents/plan-reviewer.md`, `docs/context/plan-template.md`, `documentation/changelog.html` |
| Dependencies | Phase 1 (Foundations) — complete; registers the `phase_scope` Metadata-row stub and `docs/context/mock-sentinels.md` this phase consumes. Phase 2 (PRD authoring) — complete; ships the `[VISUAL]`/`[LOGIC]` tag + `Depends` pairing this phase's paired-visual-row derivation reads. Phase 3 (Plan authoring — visual phase) — complete; ships the `phase_scope` non-heuristic sourcing mechanism + `R-COH-VISUAL-SCOPE-PURITY`, the direct precedent this phase mirrors for the logic side |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` Implementation Phases row 4 |
| phase_type | scaffold |

This target project's own `docs/context/methodology.md` does not
declare `figma_track: true` (confirmed: no `figma_track` key present
in its frontmatter at all), so per `docs/context/plan-template.md`'s
dual-branch rule this table carries no `design_source` row and the
plan body carries no `## Design Source` section. This plan's own
source PRD (`figma-visual-first-track.prd.md`) does not declare
`visual_first: true` either — it has no `## Visual-First Mode` section
at all, and row 4's own `Phase` cell ("Plan authoring — logic phase +
sentinel ledger") carries no `[VISUAL]`/`[LOGIC]` tag — consistent
with Phase 1's, Phase 2's, and Phase 3's own self-application notes —
so this table also carries no `phase_scope` row: the new logic-scope
machinery this phase ships is inert against this repo and against
this very plan, by design.

**On `phase_type: scaffold` despite adding new structural/behavioral
capability:** mirrors Phase 1's, Phase 2's, and Phase 3's own
reasoning exactly (now a 5th application of this precedent) — this
phase's deliverables are prompt/template markdown content
(`plan-writer.md`, `plan-reviewer.md`, `plan-template.md`,
`changelog.html`); there is no `.mjs` application-code surface for
`node:test` to exercise. Every legitimate VALIDATE command this phase
can emit is necessarily grep/content-invariant-shaped, which requires
`phase_type: scaffold` to get the correct
`R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption, never `feature`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/plan-writer.md` | 696-733 | `phase_scope: visual` task-restriction block (Step 4.4 item 10) — the exact structural shape the logic-side mandatory resolution-task rule mirrors |
| P0 | `plugins/relay/agents/plan-writer.md` | 513-542 | Step 4.3.5 Design Source section + row-N frame-filter logic — what the `phase_scope: logic` frame-inheritance amendment must extend |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 491-539 | `R-COH-VISUAL-SCOPE-PURITY` (zero-emission/otherwise shape) — the two-part (a)/(b) fail-condition template `R-COH-SENTINEL-RESOLUTION-MISSING` mirrors |
| P0 | `docs/context/mock-sentinels.md` | 85-137 | Swap semantics (DATA/BEHAVIOR resolution rules) + Zero remaining sentinels, no deferral path — the exact resolution discipline every authored task and VALIDATE must enforce |
| P0 | `docs/context/prd-template.md` | 222-246 | Phase-pairing mechanism — the `Depends`-based 1:1 `[VISUAL]`/`[LOGIC]` pairing a logic plan's paired-visual-row number is read from |
| P0 | `docs/context/plan-template.md` | 208-237 | The existing `phase_scope` stub (visual paragraph + "no companion conditional section" sentence) — the exact text this phase extends, not duplicates |
| P1 | `plugins/relay/agents/plan-writer.md` | 332-345 | Existing Phase 2 GROUNDING `research-codebase` dispatch bullet — the shape the `phase_scope: logic` ledger-dispatch extension appends to |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 598-619 | Rubric-length-counting paragraph — the arithmetic this phase's Task 8 must update without breaking the "14 to 22" maximal bound |
| P1 | `PRPs/prds/figma-visual-first-track.prd.md` | 153, 175-178, 204 | Row 4 itself; Phase 4 Goal/Scope/Success-signal detail; the "Sentinel deferral policy: Never allowed" Decisions Log row this phase's zero-remaining VALIDATE enforces |
| P2 | `PRPs/plans/completed/figma-visual-first-track-phase-3-plan-visual.plan.md` | 1-906 | Direct sibling precedent — shape, Level 3 diff-scoped vocabulary-consistency check, Risks framing, self-application Notes |
| P2 | `documentation/changelog.html` | 33-44 | Current `Unreleased` → `Added` list shape and insertion point (line 43 is the last `<li>`, the Phase 3 entry; line 44 is `</ul>`) |

## Patterns to Mirror

```
# SOURCE: docs/context/plan-template.md:208-237
**`phase_scope` (conditional).** Present (`visual | logic`) only
when the plan's source PRD declares `visual_first: true`; absent
entirely otherwise. Never inferred — mirrors `design_source`'s
lineage exactly, NOT `phase_type`'s self-healing lineage. ...
`plan-writer` sources `phase_scope` by reading row N's own `Phase`
cell for its mandatory leading `[VISUAL]` or `[LOGIC]` bracket tag
(`[VISUAL]` → `phase_scope: visual`; `[LOGIC]` → `phase_scope:
logic`) — never inferred from task content. When the source PRD
declares `visual_first: true` and row N's `Phase` cell does not
begin with exactly one recognized tag, `plan-writer` HALTs with
`FAILED_PHASE_SCOPE_UNDECLARED` before any DRAFT plan is written.

**What `phase_scope: visual` implies for the plan body.** Every
task under `## Step-by-Step Tasks` is restricted to UI-and-mocks
scope: ... Unlike `design_source`, `phase_scope` has no companion
conditional section — the source PRD names no such companion.
```
Copied into Task 1 as the exact existing paragraph this phase extends
with a symmetric "What `phase_scope: logic` implies" counterpart —
the "no companion conditional section" sentence is preserved verbatim.

```
# SOURCE: docs/context/mock-sentinels.md:85-137
## Swap semantics — how the paired logic phase resolves a sentinel
...
- **Resolving `[RELAY-MOCK-DATA]`:** replace the literal mock value
  with the real data source ... at the exact sentinel site. The
  displayed shape established during the visual phase does not
  change — only where the value comes from changes.
- **Resolving `[RELAY-MOCK-BEHAVIOR]`:** fill in the real
  handler/business logic in the "middle" of the already-approved
  choreography — the timing, sequencing, and visual states ...
  locked in and blocking-approved during the visual phase are
  preserved; only the substance of what the handler actually does
  ... changes.

## Zero remaining sentinels — no deferral path (binding)

Quoting `PRPs/prds/figma-visual-first-track.prd.md` AC-5 verbatim:
> ... then zero [RELAY-MOCK-DATA]/[RELAY-MOCK-BEHAVIOR] sentinels
> remain in the feature's visual-phase files — validation fails
> otherwise, with no deferral path.
...
There is no recorded-justification escape hatch. A sentinel of either
class still present anywhere in the feature's visual-phase files
after the logic phase completes is a hard failure — never a warning,
never a deferred item, regardless of the reason.
```
Copied into Tasks 5 and 6 as the exact resolution semantics and
no-deferral discipline the mandatory task-authoring rule requires.

```
# SOURCE: plugins/relay/agents/plan-writer.md:696-733
**`phase_scope: visual` task restriction (conditional).** When
the plan's `## Metadata` carries `phase_scope: visual` (from item
5), every task under this section MUST stay within UI-and-mocks
scope:
- **Forbidden side-effect vocabulary.** ...
- **Mandatory, type-matched sentinel naming.** ...
`plan-reviewer`'s new `R-COH-VISUAL-SCOPE-PURITY` check ... enforces
both rules structurally. Not applicable — no restriction, no rubric
row — when `phase_scope` is absent or `logic`.
```
Copied into Task 2 (Hard Constraint shape precedent) and Task 6 as
the exact conditional-block structure the logic-side mandatory
resolution-task rule mirrors.

```
# SOURCE: plugins/relay/agents/plan-writer.md:513-542
### Step 4.3.5 — Design Source section (conditional)
...
When `design_source: figma` ..., emit a `## Design Source` section
... citing the APPROVED Design Spec's path and this phase's in-scope
frame subset: ... Rows are drawn from the APPROVED Design Spec's
`## Visual Acceptance Criteria` section, filtered to frames whose
`Phase assignment` column (when present) matches row N, or the
Design Spec's full frame set when no such column exists.
...
When `design_source: none` or the key is absent from Metadata
(`figma_track` off), emit NOTHING — no `## Design Source` heading,
no placeholder, no empty section.
```
Copied into Task 4 as the exact section this phase amends: for a
`phase_scope: logic` row, the frame filter must key off the paired
visual row's number, not row N's own number.

```
# SOURCE: docs/context/prd-template.md:222-246
### Phase-pairing mechanism
1. ... a `visual_first: true` PRD marks each phase's scope directly
   in the `Phase` cell using a mandatory leading bracket tag —
   `[VISUAL] {Phase Name}` ... or `[LOGIC] {Phase Name}` ...
2. Every phase row carries exactly one of the two tags, never both,
   never neither.
3. Pairing uses the table's existing `Depends` column: a `[LOGIC]`
   row's `Depends` cell names exactly the `#` of its one paired
   `[VISUAL]` row (a lone value, not part of a comma-separated
   list), and a `[VISUAL]` row is named by exactly one `[LOGIC]`
   row's `Depends` cell — strict 1:1, never N:1 ...
```
Copied into Tasks 3 and 4 as the literal mechanism that guarantees a
`[LOGIC]` row's `Depends` cell is always a single bare value naming
its one paired visual row.

```
# SOURCE: plugins/relay/agents/plan-writer.md:332-345
- `subagent_type: research-codebase`
  - `topic`: 1–3 sentences describing the phase being planned. ...
  - `focus_areas`: anchor names extractable from the row's
    `Description` cell. For an agent-file phase, include: ...
  - `roots`: the path inferred from `Description` if it names a
    directory ...; otherwise omit.
```
Copied into Task 3 as the existing dispatch bullet the
`phase_scope: logic` ledger-dispatch extension appends to.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:491-539
#### R-COH-VISUAL-SCOPE-PURITY — `phase_scope: visual` plans contain
no side-effecting tasks and no unsentineled data/action tasks
...
- **Zero-emission branch:** if the plan's `## Metadata` table has no
  row whose first cell matches `phase_scope` ..., OR the row's value
  is `logic` (not `visual`), emit NO row at all for this check —
  not even `passed: true`. Do NOT fail in either case.
- **Otherwise** (`phase_scope: visual`): parse `## Step-by-Step
  Tasks` ... for two independent fail conditions: (a) ...; (b) ...
  Otherwise → `{ "id": "R-COH-VISUAL-SCOPE-PURITY", "passed": true }`.

**Known limitation (recorded, not blocking):** this is a textual
heuristic scan over plan-authored task PROSE, not real code ...
```
Copied into Task 7 as the exact zero-emission/otherwise two-part
shape `R-COH-SENTINEL-RESOLUTION-MISSING` mirrors, including its
"Known limitation" framing.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:598-619
The total `rubric[]` length per run is `8 (R1–R8) + 6 (deterministic
R-COH-*) + ≤5 (K=5 pass) = 14 to 19 rows` for a project where
`figma_track` is absent/`false` ... a 3rd conditional deterministic
row (`R-COH-VISUAL-SCOPE-PURITY`) may also appear, together widening
the range to `14 to 22 rows` in the maximal case (all three
conditional rows present at once). Each of the three conditional
rows is independently zero-emission ... so the baseline 14–19 range
is exact for every non-Figma project, and the 14–21 range from the
prior `design_source` shipment remains exact for a `figma_track:
true` project whose plan is not `phase_scope: visual`.
```
Copied into Task 8 as the exact paragraph this phase updates to
account for the new mutually-exclusive 4th conditional row, without
changing the "14 to 22" maximal bound.

```
# SOURCE: PRPs/plans/completed/figma-visual-first-track-phase-3-plan-visual.plan.md:703-735 (Task 8)
### Task 8: UPDATE documentation/changelog.html — Unreleased entry
**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (immediately after the
existing Phase 2 entry, before `</ul>`; do NOT create a new `<h2>`
release heading, do NOT bump
`plugins/relay/.claude-plugin/plugin.json` ...
```
Copied into Task 9 as the exact `<li>`-under-`Unreleased`→`Added`
shape and no-version-bump discipline.

```
# SOURCE: PRPs/prds/figma-visual-first-track.prd.md:204
| Sentinel deferral policy | Never allowed — logic-phase validation
requires zero remaining sentinels | Allowed with a recorded
justification (e.g. a feature flag still off) | Simpler and safer;
no mock silently ships if the recording discipline lapses |
```
Copied into Task 6 as the binding source-of-truth for the "no
deferral path" requirement on the zero-remaining VALIDATE.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `docs/context/plan-template.md` | UPDATE | Add the "What `phase_scope: logic` implies for the plan body" paragraph + Design Source frame-inheritance note, resolving the doc-only half of this phase's deliverable |
| `plugins/relay/agents/plan-writer.md` | UPDATE | New Hard Constraint #13; Phase 2 GROUNDING dispatch extension; Step 4.3.5 frame-inheritance amendment; Step 4.4 item 6 Mandatory Reading amendment; Step 4.4 item 10 mandatory sentinel-resolution task rule + new anti-pattern bullet |
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | New `R-COH-SENTINEL-RESOLUTION-MISSING` deterministic check; rubric-count prose updated for the 4th (mutually-exclusive) conditional row |
| `documentation/changelog.html` | UPDATE | Add an `Unreleased` → `Added` entry for this phase |

## NOT Building (Scope Limits)

- Implement-time real-diff enforcement of zero-remaining sentinels —
  Phase 5 ("Implement-time gate")'s job entirely; this phase
  restricts plan-authored TASK PROSE and adds plan-review-time
  structural checks only, never a real diff.
- Phase A.3.4 dual-mode blocking/non-blocking routing, `capture.mjs`
  interaction-step execution, or `visual-verifier` manifest
  pass-through of the `Interaction` column — Phase 5's job.
- The `auto`/`human` approval gate, HALT-and-resume semantics, or
  `/relay-visual-approve` — Phase 6's job.
- Any new PRD-table column, or a new `## Metadata` companion
  SECTION for `phase_scope` — the source PRD's Decisions Log
  already rules out a new column; `phase_scope` still has no
  companion conditional section (unlike `design_source`) after this
  phase — it adds descriptive prose to the EXISTING Metadata
  paragraph and reuses the EXISTING conditional `## Design Source`
  section (governed by `design_source`, not `phase_scope`), never a
  new section.
- Any change to `phase_scope: visual` behavior,
  `R-COH-VISUAL-SCOPE-PURITY`, or any other Phase 3 deliverable —
  this phase is purely additive/symmetric and never touches the
  visual-side logic.
- N:1 phase pairing, or any pairing-cardinality change — resolved
  strict 1:1 by the source PRD's own Decisions Log; this phase reads
  `Depends` assuming that invariant, never re-derives or relaxes it.
- A cross-file ledger-completeness cross-check (verifying the
  plan's resolution task covers EVERY real sentinel against the
  actual paired-visual-phase files) inside `plan-reviewer`'s new
  check — out of the check's bounded tool surface (`plan-reviewer`
  has no `Glob`/`Grep`); the check verifies structural presence
  only, consistent with `R-COH-VISUAL-SCOPE-PURITY`'s own documented
  "textual heuristic, not real code" limitation.
- Retrofitting existing non-`visual_first` PRDs or plans — inherited
  "no legacy carve-out" precedent.
- Any heuristic inference of the sentinel ledger from anything other
  than the paired visual phase's own `## Files to Change` table +
  `research-codebase` findings — never inferred from row N's
  `Description` cell or task content.
- `plugin.json` version bump — deferred to a future release-cut;
  this phase's changelog entry stays under `Unreleased`.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/plan-template.md — add the `phase_scope: logic` paragraph

**ACTION**: Immediately after the existing "What `phase_scope:
visual` implies for the plan body." paragraph (ending "Unlike
`design_source`, `phase_scope` has no companion conditional section
— the source PRD names no such companion."), insert a new paragraph
BEFORE that "Unlike `design_source`..." sentence's own position is
disturbed — i.e., restructure so the new paragraph is inserted
between the visual paragraph's substantive content and the closing
"no companion conditional section" sentence, OR (simpler, preferred)
append the new paragraph immediately AFTER the existing "no companion
conditional section" sentence, leaving that sentence untouched and
in place as the closing statement for the whole `phase_scope` field
(covering both branches). Use the second (simpler) approach. New
paragraph text: "**What `phase_scope: logic` implies for the plan
body.** Every `phase_scope: logic` plan MUST author at least one task
under `## Step-by-Step Tasks` that resolves every `[RELAY-MOCK-DATA]`
and `[RELAY-MOCK-BEHAVIOR]` sentinel left behind by the paired visual
phase, per `docs/context/mock-sentinels.md`'s Swap semantics:
replacing each `[RELAY-MOCK-DATA]` literal with its real data source
at the exact sentinel site, and filling each `[RELAY-MOCK-BEHAVIOR]`
handler with real business logic inside the already-approved
choreography. The task (or tasks) MUST be backed by at least one
VALIDATE command that greps the paired visual phase's touched files
for both sentinel tokens and fails (non-zero exit) if either remains
— per `docs/context/mock-sentinels.md`'s "Zero remaining sentinels —
no deferral path" rule, this VALIDATE accepts no count threshold and
no recorded-justification exception. See
`plugins/relay/agents/plan-writer.md` Step 4.4 item 10 for the full
authoring rule and `plugins/relay/agents/plan-reviewer.md`'s new
`R-COH-SENTINEL-RESOLUTION-MISSING` check, which structurally
enforces the same rule. Like the visual branch, `phase_scope: logic`
has no companion conditional section of its own — it reuses the
existing conditional `## Design Source` section (governed by
`design_source`, not `phase_scope`) when applicable; see the
`## Design Source` conditional-section paragraph below for the
frame-inheritance rule a logic-scoped plan follows when
`design_source: figma`." Also, in the `## Design Source` conditional-section
paragraph (the one beginning "**Conditional `## Design Source`
section (only when `design_source: figma`).**" and ending "...
`plan-reviewer`'s R2 dual-branch note on item 6 enforces the
presence/absence match between the Metadata row and this section."),
append a new sentence at the very end of that paragraph: "**Exception
for `phase_scope: logic` plans:** the
filter key is the PAIRED VISUAL phase's row number (read from row
N's own `Depends` cell), never row N's own number — see
`plugins/relay/agents/plan-writer.md` Step 4.3.5 for the full rule."

**MIRROR**: Patterns to Mirror block 1 (`docs/context/plan-template.md:208-237`).

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**:
```bash
set -euo pipefail
grep -q "phase_scope: logic" docs/context/plan-template.md
grep -q "RELAY-MOCK-DATA" docs/context/plan-template.md
echo "PASS: plan-template.md phase_scope: logic paragraph added"
```

### Task 2: UPDATE plugins/relay/agents/plan-writer.md — Hard Constraint #13

**ACTION**: In the "## Hard constraints (read before anything else)"
list, immediately after existing constraint #12 (`phase_scope:
visual` task purity), add a new constraint: "13. **`phase_scope:
logic` sentinel-ledger resolution (when applicable).** When the
plan's `## Metadata` carries `phase_scope: logic`, the plan MUST
author at least one task under `## Step-by-Step Tasks` that resolves
every `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel found in
the paired visual phase's touched files (see the ledger-derivation
rule in Phase 2 GROUNDING and the task-authoring rule in Step 4.4
item 10), backed by at least one VALIDATE command that fails
(non-zero exit) if any such sentinel remains — no count threshold,
no recorded-justification exception, per
`docs/context/mock-sentinels.md`'s "no deferral path" rule and the
source PRD's own Decisions Log ("Sentinel deferral policy: Never
allowed"). `plan-reviewer`'s new `R-COH-SENTINEL-RESOLUTION-MISSING`
check (Phase 4 of `PRPs/prds/figma-visual-first-track.prd.md`)
rejects any plan that violates this. Not applicable — silent no-op —
when `phase_scope` is absent or `visual`, mirroring constraint #12's
own dual-branch, never-inferred lineage."

**MIRROR**: Patterns to Mirror block 3
(`plugins/relay/agents/plan-writer.md:696-733`) as the shape
precedent for promoting a `phase_scope`-conditional rule to a
numbered Hard Constraint.

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**:
```bash
set -euo pipefail
grep -q "sentinel-ledger" plugins/relay/agents/plan-writer.md
grep -q "R-COH-SENTINEL-RESOLUTION-MISSING" plugins/relay/agents/plan-writer.md
echo "PASS: Hard Constraint 13 added, forward-references R-COH-SENTINEL-RESOLUTION-MISSING"
```

### Task 3: UPDATE plugins/relay/agents/plan-writer.md — Phase 2 GROUNDING ledger-dispatch extension

**ACTION**: In "## Phase 2 — GROUNDING (research dispatch)", under
the `research-codebase` dispatch bullet, immediately after its
existing `roots` sub-bullet, add a new sub-bullet: "  - **`phase_scope:
logic` ledger-dispatch (conditional).** When the source PRD declares
`visual_first: true` (Phase 0) and row N's own `Phase` cell carries a
leading `[LOGIC]` tag (the same tag Step 4.4 item 5 later formalizes
into `phase_scope: logic` — this dispatch reads the tag directly,
ahead of that formal assignment, since GROUNDING runs before Step
4.4), first resolve the paired visual phase's row number from row N's
own `Depends` cell (already parsed in Phase 1; guaranteed a single
bare value for a `[LOGIC]` row per `docs/context/prd-template.md`'s
Phase-pairing mechanism), then `Read` that row's `PRP Plan` cell path.
Hold that plan's `## Files to Change` table (the file set to search)
and its `## Design Source` table, if present (consumed by Step
4.3.5), in context for the remainder of this run. Then extend this
`research-codebase` dispatch: `focus_areas` gains two entries
targeting `RELAY-MOCK-DATA` and `RELAY-MOCK-BEHAVIOR` sentinel
occurrences, and `roots` is set to the paired visual phase's touched
files/directories from its `## Files to Change` table. The returned
`findings` (each carrying a `path:line` `source` field) become the
initial sentinel ledger Step 4.4 item 10 requires. If the paired
visual row's `PRP Plan` cell is empty/unreadable (should not happen —
Step 1.3's `Depends`-completeness gate already guarantees the visual
row is `complete` with a populated `PRP Plan` cell before a paired
logic row is ever actionable), fall back to `TBD - needs validation`
for the ledger rather than halting — a defensive fallback per Hard
Constraint #6, not an expected path."

**MIRROR**: Patterns to Mirror block 6
(`plugins/relay/agents/plan-writer.md:332-345`) for the dispatch
bullet being extended; Patterns to Mirror block 5
(`docs/context/prd-template.md:222-246`) for the guaranteed
single-value `Depends` cell this extension reads.

**ADDRESSES**: AC-A1

**VALIDATE**:
```bash
set -euo pipefail
grep -q "ledger-dispatch" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-writer.md
echo "PASS: Phase 2 GROUNDING dispatch extended for phase_scope: logic ledger derivation"
```

### Task 4: UPDATE plugins/relay/agents/plan-writer.md — Step 4.3.5 frame-inheritance amendment

**ACTION**: At the end of "### Step 4.3.5 — Design Source section
(conditional)" (after the existing paragraph's closing sentence,
which ends "...guarantee for the plan body: a non-Figma plan's
section list stays byte-identical to today's 15 sections."), append
a new paragraph: "**`phase_scope: logic`
frame-inheritance (conditional).** When this row's `phase_scope` (Step
4.4 item 5) is `logic` AND `design_source: figma`, do NOT filter the
Design Spec's frames by row N's own number — row N is the logic row,
and the Design Spec's `Phase assignment` column, when present, names
the VISUAL phase that renders each frame, never the logic phase that
later wires real data behind it. Instead, filter using the paired
visual phase's row number, read from row N's own `Depends` cell
(guaranteed single-valued for a `[LOGIC]` row per
`docs/context/prd-template.md`'s Phase-pairing mechanism; already
resolved during Phase 2's ledger-dispatch extension above, so no
re-read is required here). This is how a `phase_scope: logic` plan's
`## Design Source` section inherits the SAME locked frame set the
paired visual phase's plan already declared — the frames Phase A.3.4's
real-data regression (Phase 5 of this same track, not built here) will
re-verify — rather than deriving an empty or mismatched set from the
logic row's own number. When `phase_scope` is absent or `visual`,
this paragraph does not apply — the existing row-N filter (unchanged)
governs."

**MIRROR**: Patterns to Mirror block 4
(`plugins/relay/agents/plan-writer.md:513-542`) — the exact section
and row-N filter logic being extended.

**ADDRESSES**: AC-A4

**VALIDATE**:
```bash
set -euo pipefail
grep -q "frame-inheritance" plugins/relay/agents/plan-writer.md
grep -q "phase_scope: logic" plugins/relay/agents/plan-writer.md
echo "PASS: Step 4.3.5 phase_scope: logic frame-inheritance rule present"
```

### Task 5: UPDATE plugins/relay/agents/plan-writer.md — Step 4.4 item 6 Mandatory Reading amendment

**ACTION**: In Step 4.4 item 6 (`## Mandatory Reading` assembly
guidance), immediately after the existing sentence "When
`phase_scope: visual` (from item 5 above), always include
`docs/context/mock-sentinels.md` as a P0 `## Mandatory Reading` row —
... the exact reference the Implementer needs when executing the
plan's tasks.", append a new sentence: "Symmetrically, when
`phase_scope: logic` (from item 5 above), always include
`docs/context/mock-sentinels.md` as a P0 `## Mandatory Reading` row
(the swap-semantics section — resolving `[RELAY-MOCK-DATA]` by
replacing the literal with its real source, resolving
`[RELAY-MOCK-BEHAVIOR]` by filling the real handler inside the
already-approved choreography — and the zero-remaining, no-deferral
rule this phase's mandatory resolution task must satisfy) AND include
the paired visual phase's plan file (resolved via row N's own
`Depends` cell, per the Phase 2 ledger-dispatch extension above) as a
second P0 row — the concrete ledger source: its `## Files to Change`
table names every file the resolution task must sweep for sentinels,
and its `## Design Source` table (when present) is what Step 4.3.5's
frame-inheritance amendment inherits verbatim."

**MIRROR**: Patterns to Mirror block 2
(`docs/context/mock-sentinels.md:85-137`) — the sentinel convention
this Mandatory Reading rule points the Implementer to.

**ADDRESSES**: AC-A1

**VALIDATE**:
```bash
set -euo pipefail
grep -q "phase_scope: logic" plugins/relay/agents/plan-writer.md
grep -q "mock-sentinels.md" plugins/relay/agents/plan-writer.md
echo "PASS: Mandatory Reading amendment references phase_scope: logic and mock-sentinels.md"
```

### Task 6: UPDATE plugins/relay/agents/plan-writer.md — Step 4.4 item 10 mandatory resolution-task rule + anti-pattern bullet

**ACTION**: In Step 4.4 item 10 (`## Step-by-Step Tasks` assembly
guidance), immediately after the existing `phase_scope: visual` task
restriction block (ending "... Not applicable — no restriction, no
rubric row — when `phase_scope` is absent or `logic`."), append a new
conditional block: "**`phase_scope: logic` mandatory
sentinel-resolution task (conditional).** When the plan's `##
Metadata` carries `phase_scope: logic` (from item 5), the plan MUST
author at least one task that resolves every `[RELAY-MOCK-DATA]`/
`[RELAY-MOCK-BEHAVIOR]` sentinel left behind by the paired visual
phase:
- **Derive the ledger.** Use the findings from the Phase 2
  ledger-dispatch extension (each `RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR`
  match becomes one ledger entry: `file:line`, sentinel class,
  evidence snippet). When the dispatch returns no sentinel findings,
  treat the ledger as empty and note this explicitly in the task body
  and in `## Risks and Mitigations` — do not invent entries.
- **Author the resolution task(s).** At least one `### Task <i>: ...`
  heading whose `**ACTION**:` enumerates the ledger (inline, or by
  reference to the paired visual plan's Mandatory Reading row) and
  requires, per `docs/context/mock-sentinels.md`'s Swap semantics: for
  every `[RELAY-MOCK-DATA]` entry, replace the literal mock value with
  the real data source at the exact sentinel site (the displayed shape
  does not change, only where the value comes from); for every
  `[RELAY-MOCK-BEHAVIOR]` entry, fill in the real handler/business
  logic in the middle of the already-approved choreography (the
  timing, sequencing, and visual states locked in during the visual
  phase are preserved; only the substance of what the handler does
  changes). Large ledgers MAY be split across multiple tasks (e.g.,
  one per touched file); at least one such task MUST exist regardless
  of ledger size.
- **Mandatory zero-remaining VALIDATE — no deferral path.** At least
  one `**VALIDATE**:` command (task-level, or a `## Validation
  Commands` Level 2/3 block) MUST grep the paired visual phase's
  touched files for both sentinel tokens and FAIL (non-zero exit, per
  Hard Constraint #11) if either is still found. Per
  `docs/context/mock-sentinels.md`'s "Zero remaining sentinels — no
  deferral path" section and the source PRD's own Decisions Log
  ("Sentinel deferral policy: Never allowed"), this VALIDATE MUST NOT
  accept a count threshold, a recorded justification, or any other
  exception — the check is a strict zero, with no deferral of any
  kind. Scope the grep to the paired visual phase's OWN touched files
  only (the 1:1 pair this logic phase resolves), never the whole repo
  and never other visual/logic pairs elsewhere in the same feature.

`plan-reviewer`'s new `R-COH-SENTINEL-RESOLUTION-MISSING` check
enforces both the task's presence and the VALIDATE's presence
structurally. Not applicable — no requirement, no rubric row — when
`phase_scope` is absent or `visual`." Separately, in the "##
Anti-patterns (hard rules)" section, add a new bullet immediately
after the existing "Authoring a side-effecting task inside a
`phase_scope: visual` plan." bullet: "**Authoring a `phase_scope:
logic` plan with no sentinel-resolution task, or with one whose
VALIDATE accepts anything short of zero remaining sentinels.** A
`phase_scope: logic` plan MUST contain at least one task resolving
every `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel in the
paired visual phase's files, backed by a VALIDATE that fails on any
remaining sentinel — no count threshold, no recorded-justification
exception, per `docs/context/mock-sentinels.md`'s "no deferral path"
rule and the source PRD's own Decisions Log ("Sentinel deferral
policy: Never allowed"). `plan-reviewer`'s
`R-COH-SENTINEL-RESOLUTION-MISSING` check rejects it."

**MIRROR**: Patterns to Mirror block 3
(`plugins/relay/agents/plan-writer.md:696-733`) for the conditional
block shape; Patterns to Mirror block 2
(`docs/context/mock-sentinels.md:85-137`) for the resolution
semantics; Patterns to Mirror block 10
(`PRPs/prds/figma-visual-first-track.prd.md:204`) for the binding
no-deferral source.

**ADDRESSES**: AC-A1, AC-A2

**VALIDATE**:
```bash
set -euo pipefail
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-writer.md
grep -q "R-COH-SENTINEL-RESOLUTION-MISSING" plugins/relay/agents/plan-writer.md
grep -q "deferral" plugins/relay/agents/plan-writer.md
echo "PASS: mandatory sentinel-resolution task-authoring rule + anti-pattern bullet present"
```

### Task 7: UPDATE plugins/relay/agents/plan-reviewer.md — new deterministic check `R-COH-SENTINEL-RESOLUTION-MISSING`

**ACTION**: Immediately after the `R-COH-VISUAL-SCOPE-PURITY` check
(currently the last deterministic check, including its "Known
limitation" paragraph) and before the "### Bounded K=5 LLM judgment
pass" heading, add: "#### R-COH-SENTINEL-RESOLUTION-MISSING —
`phase_scope: logic` plans contain a sentinel-resolution task and its
zero-remaining VALIDATE

**Deliberate mirror of `R-COH-VISUAL-SCOPE-PURITY`'s
zero-emission/otherwise shape, applied to the opposite `phase_scope`
value.** Like its visual counterpart, this check never infers or
repairs plan content — an offending (missing) task or VALIDATE is
always a structural defect, never a self-healing opportunity. It is
also mutually exclusive with `R-COH-VISUAL-SCOPE-PURITY`: both key off
the same `## Metadata` `phase_scope` cell, which carries exactly one
value per plan, so at most one of the two checks ever emits a row on
a given run.
- **Zero-emission branch:** if the plan's `## Metadata` table has no
  row whose first cell matches `phase_scope` (case-insensitive), OR
  the row's value is `visual` (not `logic`), emit NO row at all for
  this check — not even `passed: true`. Do NOT fail in either case.
- **Otherwise** (`phase_scope: logic`): parse `## Step-by-Step Tasks`
  for `### Task <i>: ...` headings and every `**VALIDATE**:` command
  (task-level and `## Validation Commands` Level 2/3 blocks), and
  check two independent conditions:
  - **(a) No sentinel-resolution task.** FAIL if NEITHER
    `RELAY-MOCK-DATA` NOR `RELAY-MOCK-BEHAVIOR` appears anywhere in
    `## Step-by-Step Tasks`'s task bodies. `reason`: no task
    references either sentinel token; a `phase_scope: logic` plan
    must author a mandatory sentinel-resolution task.
  - **(b) No zero-remaining VALIDATE.** FAIL if NEITHER
    `RELAY-MOCK-DATA` NOR `RELAY-MOCK-BEHAVIOR` appears in the text of
    any `**VALIDATE**:` command (task-level) or any `## Validation
    Commands` Level 2/3 command block. `reason`: no VALIDATE command
    references either sentinel token; a `phase_scope: logic` plan
    must validate zero remaining sentinels.
  - The exit-code CORRECTNESS of a matched VALIDATE command (does it
    actually fail non-zero on a match, rather than the forbidden
    always-pass idiom) is NOT re-checked here — that is already
    `R-COH-VALIDATE-ALWAYS-PASS`'s job, run independently over every
    VALIDATE command in the plan regardless of `phase_scope`. This
    check only confirms a sentinel-targeting VALIDATE exists; the two
    checks compose rather than duplicate.
  - A single plan can fail both (a) and (b) simultaneously; name both
    in `reason` when so.
  - Otherwise → `{ "id": "R-COH-SENTINEL-RESOLUTION-MISSING", "passed": true }`.

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
command."

**MIRROR**: Patterns to Mirror block 7
(`plugins/relay/agents/plan-reviewer.md:491-539`) — the exact
zero-emission/otherwise two-part shape and "Known limitation" framing
this check mirrors.

**ADDRESSES**: AC-A3

**VALIDATE**:
```bash
set -euo pipefail
grep -q "R-COH-SENTINEL-RESOLUTION-MISSING" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-reviewer.md
echo "PASS: R-COH-SENTINEL-RESOLUTION-MISSING check added to plan-reviewer.md"
```

### Task 8: UPDATE plugins/relay/agents/plan-reviewer.md — widen the rubric-count prose for the 4th conditional row

**ACTION**: In the "## The R-COH-* coherence layer" section's
rubric-length-counting paragraph (currently: "...and — independently,
only on a `phase_scope: visual` plan, which per the source PRD's own
MoSCoW can only exist inside a `figma_track: true` project since
`visual_first` is itself gated on `figma_track: true` — a 3rd
conditional deterministic row (`R-COH-VISUAL-SCOPE-PURITY`) may also
appear, together widening the range to `14 to 22 rows` in the maximal
case (all three conditional rows present at once). Each of the three
conditional rows is independently zero-emission (contributes nothing)
when its own gating condition is not met, so the baseline 14–19 range
is exact for every non-Figma project, and the 14–21 range from the
prior `design_source` shipment remains exact for a `figma_track: true`
project whose plan is not `phase_scope: visual`."), replace that
passage with: "and — independently, on a plan whose `## Metadata`
declares `phase_scope` (itself only reachable inside a `figma_track:
true` project, per the source PRD's own MoSCoW: `visual_first` is
gated on `figma_track: true`) — exactly one of two mutually-exclusive
3rd conditional deterministic rows may also appear:
`R-COH-VISUAL-SCOPE-PURITY` (on `phase_scope: visual`) or
`R-COH-SENTINEL-RESOLUTION-MISSING` (on `phase_scope: logic`), since a
single plan's `phase_scope` cell carries exactly one value and can
never be both at once. Together these widen the range to `14 to 22
rows` in the maximal case (both design rows present, plus exactly one
of the two mutually-exclusive phase_scope rows, plus the full 5-row
K=5 pass) — NOT `14 to 23`, because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` can never both fire on the same
plan. Each of the four conditional rows is independently zero-emission
(contributes nothing) when its own gating condition is not met, so the
baseline 14–19 range is exact for every non-Figma project, and the
14–21 range from the prior `design_source` shipment remains exact for
a `figma_track: true` project whose plan has no `phase_scope` row at
all (neither `visual` nor `logic` — `visual_first: false`, or the PRD
predates the visual-first track)." Do not alter any other sentence in
this section (the "8 (R1–R8) + 6 (deterministic R-COH-*)..." opening
sentence and the closing "exactly 8" wording sentence stay as-is).

**MIRROR**: Patterns to Mirror block 8
(`plugins/relay/agents/plan-reviewer.md:598-619`) — the exact
paragraph being extended.

**ADDRESSES**: AC-A3, AC-A5

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

### Task 9: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (immediately after the
existing Phase 3 entry at line 43, before `</ul>` at line 44; do NOT
create a new `<h2>` release heading, do NOT bump
`plugins/relay/.claude-plugin/plugin.json` — stays under `Unreleased`
so `version-parity` remains green), describing: "`plan-writer` gains a
non-heuristic sentinel-ledger derivation for `phase_scope: logic`
plans (extending Phase 2 GROUNDING's `research-codebase` dispatch
against the paired visual phase's touched files), a mandatory
resolution-task-authoring rule (per `mock-sentinels.md`'s swap
semantics, backed by a strict zero-remaining VALIDATE with no
deferral path), and a Design Source frame-inheritance amendment so a
logic-scoped plan's regression targets the same locked frames its
paired visual phase declared; `plan-reviewer` gains the structural
`R-COH-SENTINEL-RESOLUTION-MISSING` check (zero-emission unless
`phase_scope: logic`; mutually exclusive with Phase 3's
`R-COH-VISUAL-SCOPE-PURITY`), failing `CHANGES_REQUESTED` when a
logic-scoped plan lacks the resolution task or its zero-remaining
validation. Part of the Figma Visual-First Track, Phase 4 of
`PRPs/prds/figma-visual-first-track.prd.md`." Match the exact `<code>`
tagging and "Part of ..., Phase N of ..." closing-sentence style of
the sibling entries already in the same list.

**MIRROR**: Patterns to Mirror block 9
(`PRPs/plans/completed/figma-visual-first-track-phase-3-plan-visual.plan.md:703-735`).

**ADDRESSES**: AC-A1 through AC-A5 (documentation of record)

**VALIDATE**:
```bash
set -euo pipefail
grep -q "figma-visual-first-track.prd.md" documentation/changelog.html
grep -q "R-COH-SENTINEL-RESOLUTION-MISSING" documentation/changelog.html
echo "PASS: changelog Unreleased entry added"
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
grep -q "phase_scope: logic" docs/context/plan-template.md
grep -q "R-COH-SENTINEL-RESOLUTION-MISSING" plugins/relay/agents/plan-writer.md
grep -q "R-COH-SENTINEL-RESOLUTION-MISSING" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-reviewer.md
grep -q "frame-inheritance" plugins/relay/agents/plan-writer.md
grep -q "14 to 22 rows" plugins/relay/agents/plan-reviewer.md
grep -q "figma-visual-first-track.prd.md" documentation/changelog.html
echo "PASS: all content invariants present across the four touched files"
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
# Diff-scoped (never whole-file) cross-file vocabulary-consistency check:
# the phase_scope: logic sentinel-resolution vocabulary plan-writer.md now
# authors against must match, token-for-token, the vocabulary
# plan-reviewer.md's new R-COH-SENTINEL-RESOLUTION-MISSING check greps for —
# a drift here would let a plan-writer-compliant plan still fail review,
# exactly the WRITER/REVIEWER VOCABULARY PARITY risk Phase 3's Notes flagged.
writer_diff=$(git diff --unified=0 development -- plugins/relay/agents/plan-writer.md | grep -E "^\+[^+]")
reviewer_diff=$(git diff --unified=0 development -- plugins/relay/agents/plan-reviewer.md | grep -E "^\+[^+]")
for token in "RELAY-MOCK-DATA" "RELAY-MOCK-BEHAVIOR" "R-COH-SENTINEL-RESOLUTION-MISSING"; do
  echo "$writer_diff" | grep -q -- "$token" || { echo "FAIL: plan-writer.md diff missing token: $token"; exit 1; }
  echo "$reviewer_diff" | grep -q -- "$token" || { echo "FAIL: plan-reviewer.md diff missing token: $token"; exit 1; }
done
echo "PASS: phase_scope: logic vocabulary consistent across plan-writer.md and plan-reviewer.md diffs"
```

Every command above either exits with the natural non-zero status of a
failing `grep -q`/`npm run validate` under `set -euo pipefail`, or an
explicit `if`/`|| { ...; exit 1; }` guard — none rely on the forbidden
`<check> && echo "PASS" || echo "FAIL"` idiom, per the 2026-07-09
decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-5):** Given a `phase_scope: logic` plan paired with
  an already-complete visual phase, when `plan-writer` authors its
  `## Step-by-Step Tasks`, then at least one task requires resolving
  every `RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR` sentinel in the paired
  visual phase's files per the swap semantics (data: literal → real
  source; behavior: fill the middle preserving the locked
  choreography), with the ledger derived via a `research-codebase`
  dispatch against those files — never invented.
- **AC-A2 (PRD AC-5):** Given the same plan, when `plan-writer`
  authors its Validation Commands / task VALIDATE lines, then at
  least one command greps the paired visual phase's files for both
  sentinel tokens and exits non-zero if either remains — no count
  threshold, no deferral/justification exception.
- **AC-A3 (PRD AC-5):** Given a `phase_scope: logic` plan whose
  `## Step-by-Step Tasks` lack a sentinel-resolution task, or whose
  VALIDATE commands never target the sentinel tokens, when
  `plan-reviewer` runs the new `R-COH-SENTINEL-RESOLUTION-MISSING`
  check, then it returns `CHANGES_REQUESTED` naming the missing
  element.
- **AC-A4 (PRD AC-2):** Given a source PRD row N whose `Depends` cell
  names its paired `[VISUAL]` row, when `plan-writer` assembles a
  `phase_scope: logic` plan's conditional `## Design Source` section
  (only when `design_source: figma`), then the frame set is filtered
  by the paired visual row's number, not by row N's own number —
  inheriting the same locked frames the visual phase declared.
- **AC-A5 (PRD AC-1):** Given a source PRD that does not declare
  `visual_first: true` (or a target project without `figma_track:
  true`), when `plan-writer`/`plan-reviewer` run, then no
  sentinel-ledger task-authoring language, no frame-inheritance
  behavior, and no `R-COH-SENTINEL-RESOLUTION-MISSING` rubric row
  appears anywhere in the output — byte-identical to today — and on
  any single plan where `phase_scope` IS declared,
  `R-COH-SENTINEL-RESOLUTION-MISSING` and `R-COH-VISUAL-SCOPE-PURITY`
  are mutually exclusive (never both emit).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `R-COH-SENTINEL-RESOLUTION-MISSING` is a textual presence-check, not a real ledger-completeness cross-check against the paired visual phase's actual files (`plan-reviewer` has no `Glob`/`Grep` tool) — a plan could name ONE sentinel but silently omit others from its ledger and still pass | Medium | Medium | Documented as a "Known limitation" in the check itself, mirroring `R-COH-VISUAL-SCOPE-PURITY`'s own precedent; the real safety net is the Implementer's own VALIDATE execution at implementation time (this plan's own zero-remaining grep, run for real against real files) plus Phase 5's future real-diff enforcement — this is a plan-authoring-time gate, not the final one |
| `research-web`'s pass found no industry precedent for a genuinely non-overridable "zero remaining, no waiver" ledger gate (every analog checked — ESLint's `no-warning-comments`, LaunchDarkly/Vega flag-debt cleanup, `pact-msw-adapter`'s URL-granularity contract mapping — has an explicit human-override path or coarser granularity) — this design is intentionally stricter and more granular than typical industry practice | Low | Low | Consciously chosen and already recorded in the source PRD's own Decisions Log ("Sentinel deferral policy: Never allowed... Simpler and safer; no mock silently ships if the recording discipline lapses"); this phase implements that explicit choice rather than the more common override-friendly pattern, and `mock-sentinels.md` already states there is "no recorded-justification escape hatch" |
| The Step 4.3.5 frame-inheritance amendment (filtering by the paired visual row instead of row N) is new, untested machinery layered on top of the already-shipped Design Source mechanism — a subtle mis-parse of `Depends` (e.g., treating it as a comma-list instead of the guaranteed single value) could silently misroute frames | Low | Medium | `docs/context/prd-template.md`'s Phase-pairing mechanism guarantees a `[LOGIC]` row's `Depends` cell is always a single bare value (never comma-separated) — `prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` check structurally enforces this before a `visual_first: true` PRD can reach APPROVED, so the single-value assumption is safe by construction, not merely by convention; this repo's own `figma_track: false` state means the amendment is inert here and untested by dogfood until a real Figma visual-first project exercises it |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering
— when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. `test_frameworks:
["node:test"]` is declared in this repo, so the pair is active in
principle — but this phase's deliverables (`plan-writer.md`,
`plan-reviewer.md`, `plan-template.md` prompt/template edits, plus a
changelog `<li>`) touch zero `.mjs` files, matching Phase 1's,
Phase 2's, and Phase 3's own precedent. This plan's own Validation
Commands (Level 2 content-invariant greps, Level 3 diff-scoped
cross-file consistency check) are therefore the primary mechanical
verification for this phase's deliverables.

**Research grounding:** `research-codebase` and `research-web`
subagents were dispatched in parallel per protocol. `research-codebase`
confirmed every `file:line` citation used in this plan via direct
reads of `plan-writer.md`, `plan-reviewer.md`, `plan-template.md`,
`mock-sentinels.md`, and `prd-template.md`, and independently confirmed
that no literal `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel
exists anywhere in this repo's actual application code — every
occurrence is prose, documentation, or planning-artifact text,
confirming no `phase_scope: visual` phase has ever actually been
implemented here (this phase's own machinery is therefore, like
Phase 3's, exercised only by dogfood on a real Figma project in the
future). `research-web`'s pass corroborated Phase 1's own finding that
the sentinel convention itself has no external precedent, and further
found that the "zero remaining, no waiver" enforcement DISCIPLINE also
has no direct industry analog (see Risks); it also confirmed Chromatic's
git-based visual-baseline inheritance ("a newly created branch inherits
its baseline from the commit it was branched off from") as a real,
if distant, market-context analog for this phase's own
frame-inheritance amendment — a downstream artifact reusing an
upstream-locked reference rather than re-deriving its own.

**Design note — task ordering follows the target file's own top-to-bottom
layout.** Tasks 2 through 6 (all `plan-writer.md` edits) are ordered
by the edited section's position in the file (Hard Constraints ~line
153, Phase 2 GROUNDING ~line 332, Step 4.3.5 ~line 513, Step 4.4 item
6 ~line 663, Step 4.4 item 10 ~line 696) rather than by a numbering
scheme, mirroring Phase 3's own task ordering — this keeps each edit's
anchor text unambiguous even as earlier tasks in the same file shift
later tasks' exact line numbers.

**Design note — grep-target discipline (LINE-WRAP vs GREP).** Every
`VALIDATE` command in this plan greps for a single, unwrapped
identifier token (`RELAY-MOCK-DATA`, `RELAY-MOCK-BEHAVIOR`,
`R-COH-SENTINEL-RESOLUTION-MISSING`, `sentinel-ledger`,
`ledger-dispatch`, `frame-inheritance`, `deferral`,
`mock-sentinels.md`, `mutually-exclusive`) or a short colon-joined
pair already proven safe by Phase 3 precedent (`phase_scope: logic`,
mirroring the already-shipped `phase_scope: visual`) or a
longer phrase already proven to survive unwrapped in this exact file
(`14 to 22 rows`, unchanged by this phase, only reconfirmed). This
plan deliberately avoids inventing new multi-word grep targets: a
direct read of `docs/context/plan-template.md` lines 236-237 during
this plan's own grounding pass showed the phrase "no companion
conditional section" split across two physical lines in the live
file — concrete, first-party proof that this repo's prose wrapping
can silently break a multi-word `grep -q` target, which cost Phase 2
of this same track a review round per the calling context's own
retrospective.

**Design note — filename diverges from the mechanical Step 1.4 slug,
following Phase 3's own precedent.** `plan-writer.md` Step 1.4's
literal algorithm (kebab-case the full `Phase` cell, dropping
punctuation) would mechanically produce
`figma-visual-first-track-phase-4-plan-authoring-logic-phase-sentinel-ledger.plan.md`
from this row's `Phase` cell ("Plan authoring — logic phase + sentinel
ledger"). This plan instead uses the shorter, hand-simplified
`figma-visual-first-track-phase-4-plan-logic-ledger.plan.md`,
mirroring Phase 3's own shipped divergence (`Phase` cell "Plan
authoring — visual phase" → mechanical slug `plan-authoring-visual-phase`,
actual shipped slug `plan-visual`). Both Phase 1's and Phase 2's
filenames DO match the mechanical algorithm exactly
(`figma-visual-first-track-phase-1-foundations.plan.md`,
`figma-visual-first-track-phase-2-prd-authoring.plan.md`); Phase 3
is the first divergence in this track, and this plan continues that
established (if non-mechanical) convention for filename consistency
across the `plan-*` sibling series rather than reverting to the
literal algorithm mid-series.

**Self-application note:** this plan's own source PRD
(`figma-visual-first-track.prd.md`) does not declare `visual_first:
true` (it has no `## Visual-First Mode` section at all), and this
target repo's own `docs/context/methodology.md` does not declare
`figma_track: true` — consistent with Phase 1's, Phase 2's, and
Phase 3's own framing, this plan's `## Metadata` table carries no
`design_source` row and no `phase_scope` row; the new logic-scope
machinery this phase ships is inert against this repo and against
this very plan, by design.

---

*Generated: 2026-07-25*
*Approved: 2026-07-25*
*Implemented: 2026-07-26*
*Status: IMPLEMENTED*
