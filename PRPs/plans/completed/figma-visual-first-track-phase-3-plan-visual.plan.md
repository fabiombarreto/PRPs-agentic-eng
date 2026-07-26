# Feature: Plan authoring — visual phase (Phase 3 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of existing shipped agent files (`plan-writer.md`, `plan-reviewer.md`); extension of a canonical template (`plan-template.md`) whose `phase_scope` Metadata-row stub was registered by Phase 1 of this same track; reuse of an established non-heuristic declaration pattern (`design_source`'s lineage) for a field (`phase_scope`) already stubbed but not yet enforced; a new deterministic structural check added to an existing reviewer's additive R-COH-* coherence layer
- Decisions found:
  - [2026-07-25] Visual-first phase-pairing: `[VISUAL]`/`[LOGIC]` bracket tag + strict 1:1 `Depends` pairing (Phase 2) — the exact PRD-level tag this phase's `plan-writer` reads non-heuristically
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference — the exact lineage `phase_scope` mirrors, per the source PRD's own Architecture Notes
  - [2026-05-14] `phase_type` Metadata-field precedent (self-healing, reviewer may infer/insert) — the explicit contrast case `phase_scope` deliberately diverges from
  - [2026-07-09] Validation commands must carry real exit-code semantics; `plan-reviewer` enforces via `R-COH-VALIDATE-ALWAYS-PASS` — binding on every VALIDATE/Level command this plan emits
  - [2026-04-28] AC-10 of `plan-authoring.prd.md` evolves: R-COH-* rows are additive to the `rubric[]` array — confirms the new `R-COH-VISUAL-SCOPE-PURITY` row can be added to `plan-reviewer`'s rubric without violating "no extras"
  - [2026-04-25] Plan filenames carry the source PRD phase number and slug — this plan's own filename convention
  - [2026-05-01] Source PRD's Implementation Phases table IS the state machine; `Depends` is the native sequencing primitive (D6) — the primitive the `[VISUAL]`/`[LOGIC]` pairing already reuses
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — confirms `plan-writer`/`plan-reviewer` both operate with no dialogue; this phase adds no new interactivity-boundary extension
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — generalizes directly to `phase_scope`: never inferred, only copied verbatim from the PRD row's `[VISUAL]`/`[LOGIC]` tag
  - "Writing pipeline artifacts under `.claude/`" — standing background constraint; every write in this phase lands under `plugins/relay/agents/`, `docs/context/`, `documentation/`, or `PRPs/plans/`, never `.claude/`
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; `plan-writer`/`plan-reviewer` both run fully autonomously, no dialogue
  - "One command per stage, writer/reviewer split" — `plan-writer`/`plan-reviewer` remain a matched pair; the new sourcing + restriction logic lives in the writer, the new structural check lives in the reviewer
  - Source PRD's Implementation Phases table is the orchestrator's sole state machine; the `Depends` column is the native sequencing primitive the `[VISUAL]`/`[LOGIC]` pairing already reuses
  - PRP artifact convention (`PRPs/plans/`, `PRPs/prds/`) — this plan and its PRD back-fill both respect it
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 3:
  "Plan authoring — visual phase" — Goal: `/relay-plan` against a
  `phase_scope: visual` row produces a plan whose tasks are
  UI-and-mocks-only, with sentinels enforced. — Success signal: A
  visual-scoped plan reviewed against a hand-built fixture correctly
  fails when a task implies a side effect.

## Summary

This phase wires the `phase_scope` Metadata-field stub Phase 1
registered and the `[VISUAL]`/`[LOGIC]` Phase-cell tag Phase 2 shipped
into real, enforced behavior on `plan-writer` and `plan-reviewer`.
`plan-writer` gains a non-heuristic `phase_scope` sourcing block in
Step 4.4 item 5 (Metadata assembly) that reads row N's `Phase`-cell
tag verbatim — never inferring from task content — and HALTs with a
new `FAILED_PHASE_SCOPE_UNDECLARED` error (mirroring
`design_source`'s `FAILED_DESIGN_SOURCE_UNDECLARED` precedent exactly)
when a `visual_first: true` PRD's row carries no recognized tag; a new
Hard Constraint #12 promotes the resulting `phase_scope: visual`
task-purity rule to top-of-file visibility; and a new conditional
block in Step 4.4 item 10 restricts every task in a `phase_scope:
visual` plan to UI-and-mocks scope — forbidding a bounded vocabulary
of network/persistence/mutation phrases and mandating that every
data-display or interactive-action task name the type-matched
`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel it will emit, per
`docs/context/mock-sentinels.md` (now also a mandatory P0 Mandatory
Reading row for such plans). `plan-reviewer` gains a new deterministic
`R-COH-VISUAL-SCOPE-PURITY` check, mirroring
`R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED`'s exact
zero-emission/otherwise shape: silent when `phase_scope` is absent or
`logic`, and otherwise scanning every task for the same
forbidden-vocabulary and sentinel-mention rules `plan-writer` now
authors against — failing `CHANGES_REQUESTED` on any violation, never
self-healing. `docs/context/plan-template.md`'s existing `phase_scope`
stub is extended (not duplicated) to resolve its own forward-reference
into the mechanism this phase actually ships.

## User Story

As a developer maintaining the relay plugin, I want `plan-writer` to
non-heuristically source a phase's `phase_scope` from its source PRD's
`[VISUAL]`/`[LOGIC]` tag and restrict a `phase_scope: visual` plan's
tasks to sentinel-backed UI-and-mocks work, and `plan-reviewer` to
structurally enforce that restriction, so that a visual phase's plan
can never authorize a task the Implementer would execute as a real
side effect — closing the gap between the source PRD's AC-3
zero-side-effects contract and the plan the Implementer actually
receives.

## Problem Statement

Relay's Figma Visual-First Track exists to catch a wrong visual before
any logic is built on top of it — but that guarantee only holds if the
visual phase's own plan can never authorize a task that reaches past
mocked data/behavior into a real network call, persistence write, or
business mutation. Today, immediately after Phase 2 ships the
PRD-level `[VISUAL]`/`[LOGIC]` tag, no agent reads that tag to
determine a plan's `phase_scope`, no agent restricts a visual-scoped
plan's tasks to UI-and-mocks work, and no agent enforces the mandatory
`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel discipline
`docs/context/mock-sentinels.md` already documents — `phase_scope` is
a registered but inert Metadata-row stub, and AC-3's zero-side-effects
contract has no plan-authoring-time enforcement at all.

## Solution Statement

Give `plan-writer` a non-heuristic `phase_scope` sourcing block
(mirroring `design_source`'s exact lineage and HALT shape) plus a
task-restriction rule for `phase_scope: visual` plans (bounded
forbidden-vocabulary denylist, mandatory type-matched sentinel
naming), and give `plan-reviewer` a new zero-emission
`R-COH-VISUAL-SCOPE-PURITY` deterministic check that structurally
enforces the same rule `plan-writer` now authors against — read-only,
never self-healing, exactly mirroring
`R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED`'s established
shape.

## Metadata

| Field | Value |
|---|---|
| Type | Agent capability extension (new non-heuristic Metadata-field sourcing + new task-authoring constraint + new reviewer structural check) |
| Complexity | Medium-High |
| Systems Affected | `plugins/relay/agents/plan-writer.md`, `plugins/relay/agents/plan-reviewer.md`, `docs/context/plan-template.md`, `documentation/changelog.html` |
| Dependencies | Phase 1 (Foundations) — complete; registers the `phase_scope` Metadata-row stub and `docs/context/mock-sentinels.md` this phase extends/consumes. Phase 2 (PRD authoring) — complete; ships the `[VISUAL]`/`[LOGIC]` Phase-cell tag + `Depends` pairing this phase's `plan-writer` reads from |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` Implementation Phases row 3 |
| phase_type | scaffold |

This target project's own `docs/context/methodology.md` does not
declare `figma_track: true` (confirmed: no `figma_track` key present
in its frontmatter at all), so per `docs/context/plan-template.md`'s
dual-branch rule this table carries no `design_source` row and the
plan body carries no `## Design Source` section. This plan's own
source PRD (`figma-visual-first-track.prd.md`) does not declare
`visual_first: true` either — row 3 ("Plan authoring — visual phase")
carries no `[VISUAL]`/`[LOGIC]` tag, consistent with Phase 1's and
Phase 2's own self-application notes — so this table also carries no
`phase_scope` row: the new visual-scope machinery this phase ships is
inert against this repo and against this very plan, by design.

**On `phase_type: scaffold` despite adding new structural/behavioral
capability:** mirrors Phase 1's and Phase 2's own reasoning exactly —
this phase's deliverables are prompt/template markdown content
(`plan-writer.md`, `plan-reviewer.md`, `plan-template.md`,
`changelog.html`); there is no `.mjs` application-code surface for
`node:test` to exercise. Every legitimate VALIDATE command this phase
can emit is necessarily grep/content-invariant-shaped, which per the
established, now-thrice-recurring lesson (v1 Phase 1, v2 Phase 1, v2
Phase 2) requires `phase_type: scaffold` to get the correct
`R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption, never `feature`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/plan-writer.md` | 575-603 | `design_source`'s non-heuristic sourcing + `FAILED_DESIGN_SOURCE_UNDECLARED` HALT — the exact precedent `phase_scope` sourcing + `FAILED_PHASE_SCOPE_UNDECLARED` must mirror |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 441-489 | `R-COH-DESIGN-SOURCE-MISSING` (zero-emission/otherwise Metadata-presence check) + `R-COH-DESIGN-GROUNDED` (per-task heading-then-body-grep scan) — the two-part shape `R-COH-VISUAL-SCOPE-PURITY` mirrors |
| P0 | `docs/context/plan-template.md` | 191-224 | `design_source`'s companion Metadata-row paragraph (191-206) immediately followed by `phase_scope`'s existing stub (208-224, Phase 1's output) — the exact text this phase must extend, not duplicate |
| P0 | `docs/context/mock-sentinels.md` | 1-135 | The full sentinel convention (both classes, zero-side-effects rule, zero-remaining rule) this phase's task-restriction logic enforces at plan-authoring time |
| P0 | `docs/context/prd-template.md` | 222-246 | The `[VISUAL]`/`[LOGIC]` bracket-tag + `### Phase-pairing mechanism` (Phase 2's output) — the literal source `phase_scope` sourcing reads from |
| P1 | `plugins/relay/agents/prd-reviewer.md` | 380-401 | `R-COH-VISUAL-PAIRING-INCOMPLETE`'s malformed-tag taxonomy — confirms every row of an `APPROVED` `visual_first: true` PRD already carries a valid tag, informing why `FAILED_PHASE_SCOPE_UNDECLARED` is a rare defense-in-depth path (see Risks) |
| P1 | `docs/decisions.md` | 777-786 | `[2026-07-23] design_source declaration is mandatory and non-heuristic` — the decision this phase's `phase_scope` lineage directly implements, one level down (plan-level, not PRD-level) |
| P1 | `docs/decisions.md` | 836-845 | `[2026-07-25] Visual-first phase-pairing` — records the shipped `[VISUAL]`/`[LOGIC]` mechanism this phase's `plan-writer` reads from |
| P1 | `docs/decisions.md` | 680-688 | Exit-code-semantics decision — binding on every VALIDATE/Level command this plan emits |
| P2 | `PRPs/plans/completed/figma-visual-first-track-phase-2-prd-authoring.plan.md` | 1-765 | Direct sibling precedent for shape/style, in particular Task 7 (changelog) and the overall Notes-section self-application framing |
| P2 | `documentation/changelog.html` | 33-43 | Current `Unreleased` → `Added` list shape and insertion point (line 42 is the last `<li>`, line 43 is `</ul>`) |
| P2 | `PRPs/prds/figma-visual-first-track.prd.md` | AC-3 (line 57); Phase 3 detail (170-174); Decisions Log rows | The full contract this phase implements |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/plan-writer.md:575-603
   Conditionally, when the target's `docs/context/methodology.md`
   declares `figma_track: true`, add a `design_source: figma | none`
   row to the same Metadata table — sourced as follows, NEVER inferred
   from plan content the way `phase_type` is: in **PRD mode**, copy
   verbatim the per-phase declaration from the source PRD's `##
   Design Source` section for row N (added by `prd-writer.md` Step
   7.4 item 15.5); in **description mode**, `figma` only when a
   `--design-spec <path>` CLI flag was passed ... When `figma_track: true`
   and no declaration is sourceable ..., HALT with:

   > `FAILED_DESIGN_SOURCE_UNDECLARED`: the target project declares
   > `figma_track: true`, but no `design_source` declaration could be
   > sourced for this phase. ... No DRAFT plan has been written.
   > Resolve the missing declaration (re-run `/relay-prd` to capture
   > it, or hand-edit the PRD's `## Design Source` table) and re-run
   > `/relay-plan`.

   Do NOT write a DRAFT in this case. Do NOT default `design_source`
   to `none` when `figma_track: true` and the declaration is missing —
   that would silently mask an undeclared phase as "confirmed no
   Figma involvement" rather than surfacing the real gap. When
   `figma_track` is `false` or absent, `design_source` is not added
   at all — the Metadata table is byte-identical to today.
```
Copied into Task 3 as the exact non-heuristic sourcing + HALT shape
`phase_scope` + `FAILED_PHASE_SCOPE_UNDECLARED` must mirror.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:441-466
#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active

**Deliberate divergence from Phase 0's `phase_type` behavior — stated
explicitly:** "has Figma or not" is a business decision the reviewer
cannot manufacture on the plan-writer's behalf, unlike `phase_type` (a
structural classification the reviewer can safely infer from
observable plan content). This check does NOT insert or infer a
`design_source` value under any circumstance — an absence is recorded
as a structural defect, full stop.

- Read `<target_root>/docs/context/methodology.md`. Extract the
  `figma_track:` value from the frontmatter.
- **Zero-emission branch:** if `figma_track` is `false`, absent, or
  `methodology.md` itself is missing, emit NO row at all for this
  check — not even a `passed: true` row — keeping a non-Figma plan's
  `rubric[]` array byte-identical to today. Do NOT fail in this case.
- Otherwise (`figma_track: true`): scan the plan's `## Metadata` table
  for a first-cell value matching `design_source` (case-insensitive).
  - **Present** → emit `{ "id": "R-COH-DESIGN-SOURCE-MISSING", "passed": true }`.
  - **Absent** → emit `{ "id": "R-COH-DESIGN-SOURCE-MISSING", "passed": false, "reason": "..." }`.
  - This check is READ-ONLY. ... an absent `design_source` under
    `figma_track: true` is always a CHANGES_REQUESTED-triggering
    structural defect, never a self-healing opportunity.
```
Copied into Task 6 as the exact zero-emission/otherwise Metadata-scan
shape `R-COH-VISUAL-SCOPE-PURITY` mirrors.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:468-489
#### R-COH-DESIGN-GROUNDED — UI/frontend tasks reference the Design Source frame set

- **Zero-emission branch:** if `## Design Source` is absent from the
  plan ..., emit NO row at all for this check ... Do NOT fail in this case.
- Otherwise (`## Design Source` is present): parse `## Step-by-Step
  Tasks` for `### Task <i>: ...` headings. For each task whose
  `**ACTION**:` line names a UI/frontend file (heuristic: file
  extension in `.tsx`, `.jsx`, `.vue`, `.svelte`, or a path segment
  containing `components/`, `pages/`, `views/`, `screens/`), grep its
  body for a frame reference ... or a `CM-<n>` id.
  - A matching task with zero frame/`CM-<n>` references fails this
    check. `reason` names the orphan task by its `### Task <i>:`
    heading verbatim.
  - Otherwise emit `{ "id": "R-COH-DESIGN-GROUNDED", "passed": true }` ...
```
Copied into Task 6 as the exact per-task heading-then-body-grep
scanning idiom `R-COH-VISUAL-SCOPE-PURITY`'s task loop reuses.

```
# SOURCE: docs/context/plan-template.md:208-224
   **`phase_scope` (conditional).** Present (`visual | logic`) only
   when the plan's source PRD declares `visual_first: true`; absent
   entirely otherwise. Never inferred — mirrors `design_source`'s
   lineage exactly, NOT `phase_type`'s self-healing lineage.
   `plan-reviewer.md`'s own contrast for `design_source` is the model:
   "has Figma or not" is a business decision the reviewer cannot
   manufacture on the plan-writer's behalf ... The exact per-row
   sourcing mechanism (how `plan-writer` determines a given PRD row's
   scope) is defined in Phase 3 of
   `PRPs/prds/figma-visual-first-track.prd.md` — this phase registers
   only the field's dual-branch shape. Unlike `design_source`,
   `phase_scope` has no companion conditional section — the source PRD
   names no such companion.
```
Copied into Task 1 as the exact existing stub this phase resolves —
the forward-reference sentence ("is defined in Phase 3 ...") is what
Task 1 replaces with the shipped mechanism; the "no companion
conditional section" sentence is preserved verbatim (this phase adds
no new plan section).

```
# SOURCE: docs/context/mock-sentinels.md:24-51
### `[RELAY-MOCK-DATA]`

Wraps a literal displayed value standing in for real data — anything
that would otherwise come from an API response, a database query, or
a prop threaded down from a real data source.

```js
// [RELAY-MOCK-DATA] user's display name — real source: GET /api/me
const displayName = "Jane Doe";
```

### `[RELAY-MOCK-BEHAVIOR]`

Wraps a handler or interaction standing in for real business logic —
anything that would otherwise call a service, mutate state, or run a
real validation/business rule.
```
Copied into Tasks 4 and 5 as the exact sentinel shape plan-writer's
new task-restriction rule mandates by reference.

```
# SOURCE: docs/context/prd-template.md:222-246
### Phase-pairing mechanism

1. Because the `## Implementation Phases` table above carries no
   dedicated scope column ..., a `visual_first: true` PRD marks each
   phase's scope directly in the `Phase` cell using a mandatory
   leading bracket tag — `[VISUAL] {Phase Name}` (scope-pure visual
   phase: UI + mocked data only) or `[LOGIC] {Phase Name}` (scope-pure
   logic phase: real business rules on an already-locked visual) —
   mirroring `docs/context/mock-sentinels.md`'s
   `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` bracket-tag convention.
2. Every phase row carries exactly one of the two tags, never both,
   never neither.
3. Pairing uses the table's existing `Depends` column ...
```
Copied into Task 3 as the literal tag `plan-writer` reads to determine
`phase_scope` — the sourcing mechanism is "read row N's `Phase` cell,
strip the leading tag."

```
# SOURCE: PRPs/plans/completed/figma-visual-first-track-phase-2-prd-authoring.plan.md:543-567 (Task 7)
### Task 7: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (immediately after the
existing Phase 1 entry, before `</ul>`; do NOT create a new `<h2>`
release heading, do NOT bump
`plugins/relay/.claude-plugin/plugin.json` — stays under `Unreleased`
so `version-parity` remains green), describing: ...
```
Copied into Task 8 as the exact `<li>`-under-`Unreleased`→`Added`
shape and no-version-bump discipline.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `docs/context/plan-template.md` | UPDATE | Resolve the `phase_scope` stub's forward-reference (Phase 1's output) into the sourcing mechanism, HALT shape, and task-restriction summary this phase actually ships |
| `plugins/relay/agents/plan-writer.md` | UPDATE | New Hard Constraint #12; Phase 0 `visual_first` read-and-remember bullet; Step 4.4 item 5 `phase_scope` sourcing + `FAILED_PHASE_SCOPE_UNDECLARED` HALT; item 6 `mock-sentinels.md` Mandatory Reading rule; item 10 task-restriction rule; new anti-pattern bullet |
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | New `R-COH-VISUAL-SCOPE-PURITY` deterministic check; rubric-count prose widened to 14-22 rows |
| `documentation/changelog.html` | UPDATE | Add an `Unreleased` → `Added` entry for this phase |

## NOT Building (Scope Limits)

- Sentinel-ledger resolution / zero-remaining-sentinel enforcement for
  `phase_scope: logic` plans — Phase 4 ("Plan authoring — logic phase
  + sentinel ledger") of `PRPs/prds/figma-visual-first-track.prd.md`'s
  job entirely; this phase's `R-COH-VISUAL-SCOPE-PURITY` zero-emission
  branch explicitly skips `phase_scope: logic` plans rather than
  implementing anything for them.
- Any change to `/relay-implement`, `code-reviewer.md`,
  `code-reviewer-semantic.md`, or `implementer.md` — real-diff,
  real-code enforcement of zero side effects is Phase 5
  ("Implement-time gate")'s job; this phase restricts plan-authored
  TASK PROSE only, never a real diff.
- The `Interaction` column / `capture.mjs` scripted-interaction
  execution — Phase 5's job, unrelated to this phase's scope.
- The `auto`/`human` approval gate or `/relay-visual-approve` — Phase
  6's job.
- Any new PRD-table column, new `## Metadata` companion section for
  `phase_scope`, or new orchestrator sequencing primitive — the source
  PRD's own Decisions Log already rules out a new column, and
  `docs/context/plan-template.md`'s already-registered stub explicitly
  states `phase_scope` "has no companion conditional section," unlike
  `design_source`; this phase does not add one.
- Any change to `plan-reviewer.md`'s R2 section-order check —
  `phase_scope` adds no new section, so R2's existing dual-branch note
  (which only concerns the conditional `## Design Source` section)
  needs no extension.
- Retrofitting existing non-`visual_first` PRDs or plans — inherited
  "no legacy carve-out" precedent.
- Any heuristic inference of `phase_scope` from a task's description,
  a file's name, or any content other than the row's own `Phase`-cell
  tag — explicitly forbidden; sourcing is tag-only, mirroring
  `design_source`.
- Changes to Phase 2 GROUNDING's research-dispatch `focus_areas` for
  `phase_scope: visual` phases — not requested by this phase's scope;
  the existing dispatch shape is unchanged.
- `plugin.json` version bump — deferred to a future release-cut; this
  phase's changelog entry stays under `Unreleased`.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/plan-template.md — resolve the `phase_scope` stub's forward-reference

**ACTION**: In the `## Metadata` walkthrough's `phase_scope` paragraph
(currently ending "...The exact per-row sourcing mechanism (how
`plan-writer` determines a given PRD row's scope) is defined in Phase
3 of `PRPs/prds/figma-visual-first-track.prd.md` — this phase
registers only the field's dual-branch shape."), replace that final
forward-reference sentence with resolved content: state that
`plan-writer` sources `phase_scope` by reading row N's own `Phase`
cell for its mandatory leading `[VISUAL]`/`[LOGIC]` bracket tag
(`[VISUAL]` → `visual`, `[LOGIC]` → `logic`) — never inferred from
task content — and HALTs with `FAILED_PHASE_SCOPE_UNDECLARED` when the
source PRD declares `visual_first: true` but row N's tag is
missing/malformed. Add a short paragraph stating what `phase_scope:
visual` implies for the plan body: every task is restricted to
UI-and-mocks scope, no task may imply a network call, persistence, or
real mutation, and every data-display/interactive-action task must
name the type-matched `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]`
sentinel it will emit — cross-referencing `docs/context/mock-sentinels.md`
and `plan-reviewer`'s new `R-COH-VISUAL-SCOPE-PURITY` check. Preserve
the existing "Unlike `design_source`, `phase_scope` has no companion
conditional section" sentence verbatim — this phase adds no new plan
section. Do not alter the `design_source` paragraph immediately above
it.

**MIRROR**: Patterns to Mirror block 4 (`docs/context/plan-template.md:208-224`).

**ADDRESSES**: AC-A3, AC-A4

**VALIDATE**:
```bash
set -euo pipefail
grep -q "FAILED_PHASE_SCOPE_UNDECLARED" docs/context/plan-template.md
grep -q "RELAY-MOCK-DATA" docs/context/plan-template.md
grep -q "RELAY-MOCK-BEHAVIOR" docs/context/plan-template.md
echo "PASS: plan-template.md phase_scope stub resolved with HALT + sentinel cross-refs"
```

### Task 2: UPDATE plugins/relay/agents/plan-writer.md — Hard Constraint #12 + Phase 0 `visual_first` read

**ACTION**: In the "## Hard constraints (read before anything else)"
list, immediately after existing constraint #11 (validation exit-code
semantics), add a new constraint: "12. **`phase_scope: visual` task
purity (when applicable).** When the plan's `## Metadata` carries
`phase_scope: visual`, every task under `## Step-by-Step Tasks` MUST
stay within UI-and-mocks scope: no task's `**ACTION**:` prose may
imply a real network call, database/persistence write, or real
business-logic mutation (see the forbidden-pattern vocabulary in Step
4.4 item 10), and every task that displays a datum or wires an
interactive handler MUST name the `[RELAY-MOCK-DATA]` or
`[RELAY-MOCK-BEHAVIOR]` sentinel (type-matched: data →
`RELAY-MOCK-DATA`, interactive action → `RELAY-MOCK-BEHAVIOR`) it will
emit, per `docs/context/mock-sentinels.md`. `plan-reviewer`'s new
`R-COH-VISUAL-SCOPE-PURITY` check (Phase 3 of
`PRPs/prds/figma-visual-first-track.prd.md`) rejects any plan that
violates this. Not applicable — silent no-op — when `phase_scope` is
absent or `logic`, mirroring `design_source`'s own dual-branch,
never-inferred lineage." Separately, in "## Phase 0 — Setup (internal,
no user dialogue)", extend the `<prd_path>` read-and-remember bullet
list with a new item: "The PRD's `## Visual-First Mode` section's
`visual_first:` value if present, else treat as `visual_first: false`
(section absent)."

**MIRROR**: Existing Hard Constraint #11's own promotion of exit-code
semantics to top-of-file visibility (`plugins/relay/agents/plan-writer.md`,
Hard constraints list) as the shape precedent for adding a new
numbered constraint.

**ADDRESSES**: AC-A3

**VALIDATE**:
```bash
set -euo pipefail
grep -q "R-COH-VISUAL-SCOPE-PURITY" plugins/relay/agents/plan-writer.md
grep -q "Visual-First Mode" plugins/relay/agents/plan-writer.md
echo "PASS: Hard Constraint 12 forward-references R-COH-VISUAL-SCOPE-PURITY; Phase 0 visual_first read added"
```

### Task 3: UPDATE plugins/relay/agents/plan-writer.md — Step 4.4 item 5: `phase_scope` sourcing + HALT

**ACTION**: Immediately after the existing `design_source` paragraph
in Step 4.4 item 5 (which ends "...the Metadata table is byte-identical
to today."), and before item 6 (`## Mandatory Reading`), insert a new
paragraph: "**`phase_scope` (conditional, non-heuristic — mirrors
`design_source`'s exact lineage).** Present (`visual | logic`) only
when the source PRD's `## Visual-First Mode` section declares
`visual_first: true` (captured during Phase 0's read-through); absent
entirely otherwise — including in description mode, where there is no
PRD to declare `visual_first` at all, so `phase_scope` is never
sourced or emitted. Never inferred from row N's `Description` cell,
its Phase Details Goal/Scope text, or any task content — sourced by
reading row N's own `Phase` cell for its mandatory leading `[VISUAL]`
or `[LOGIC]` bracket tag (registered in
`docs/context/prd-template.md`'s `## Visual-First Mode` →
`### Phase-pairing mechanism`, shipped by Phase 2 of
`PRPs/prds/figma-visual-first-track.prd.md`): `[VISUAL]` →
`phase_scope: visual`; `[LOGIC]` → `phase_scope: logic`. When the
source PRD declares `visual_first: true` and row N's `Phase` cell does
not begin with exactly one recognized tag (missing, both, or
malformed), HALT with:

> `FAILED_PHASE_SCOPE_UNDECLARED`: the source PRD declares
> `visual_first: true`, but Implementation Phases row <N>'s `Phase`
> cell ("<verbatim Phase cell text>") does not begin with a
> recognized `[VISUAL]` or `[LOGIC]` tag. No DRAFT plan has been
> written. Resolve the missing/malformed tag (re-run `/relay-prd` to
> regenerate the row, or hand-edit the PRD's `Phase` cell to add the
> leading tag) and re-run `/relay-plan`.

Do NOT write a DRAFT in this case. Do NOT default `phase_scope` to
`logic` or omit it silently when `visual_first: true` and the tag is
missing — that would mask a scope-purity gap the same way silently
defaulting `design_source` to `none` would mask an undeclared Figma
phase. In practice this HALT should rarely fire: `prd-reviewer`'s
`R-COH-VISUAL-PAIRING-INCOMPLETE` check already structurally
guarantees every row carries exactly one valid tag before a
`visual_first: true` PRD can reach `APPROVED` — this HALT is a
defense-in-depth backstop (e.g. against a hand-edited PRD row
post-approval), not the expected common case. When `visual_first` is
`false`, absent, or the source PRD has no `## Visual-First Mode`
section at all (`figma_track` off), `phase_scope` is not added to `##
Metadata` at all — the table is byte-identical to today."

**MIRROR**: Patterns to Mirror block 1
(`plugins/relay/agents/plan-writer.md:575-603`) for the sourcing +
HALT shape; Patterns to Mirror block 5
(`docs/context/prd-template.md:222-246`) for the literal tag read.

**ADDRESSES**: AC-A3, AC-A4

**VALIDATE**:
```bash
set -euo pipefail
grep -q "FAILED_PHASE_SCOPE_UNDECLARED" plugins/relay/agents/plan-writer.md
grep -q "phase_scope: visual" plugins/relay/agents/plan-writer.md
echo "PASS: phase_scope Metadata sourcing + HALT block present"
```

### Task 4: UPDATE plugins/relay/agents/plan-writer.md — Step 4.4 item 6: mandatory `mock-sentinels.md` reading

**ACTION**: In Step 4.4 item 6 (`## Mandatory Reading` assembly
guidance), append a new sentence: "When `phase_scope: visual` (from
item 5 above), always include `docs/context/mock-sentinels.md` as a P0
`## Mandatory Reading` row — the sentinel convention and
zero-side-effects/zero-remaining rules every task in this plan must
satisfy, and the exact reference the Implementer needs when executing
the plan's tasks." Do not alter the rest of item 6's existing prose.

**MIRROR**: Patterns to Mirror block 6
(`docs/context/mock-sentinels.md:24-51`) — the sentinel shape this
Mandatory Reading row points the Implementer to.

**ADDRESSES**: AC-A5

**VALIDATE**:
```bash
set -euo pipefail
grep -q "mock-sentinels.md" plugins/relay/agents/plan-writer.md
grep -q "phase_scope" plugins/relay/agents/plan-writer.md
echo "PASS: Mandatory Reading rule references mock-sentinels.md, gated on phase_scope"
```

### Task 5: UPDATE plugins/relay/agents/plan-writer.md — Step 4.4 item 10: task restriction + anti-pattern bullet

**ACTION**: In Step 4.4 item 10 (`## Step-by-Step Tasks` assembly
guidance), append a new conditional block: "**`phase_scope: visual`
task restriction (conditional).** When the plan's `## Metadata`
carries `phase_scope: visual` (from item 5), every task under this
section MUST stay within UI-and-mocks scope:
- **Forbidden side-effect vocabulary.** No task's `**ACTION**:` line
  or body prose (excluding its `**VALIDATE**:` line/block — a
  defensive VALIDATE grep for the ABSENCE of one of these tokens is
  expected and must not itself trip this rule) may contain,
  case-insensitively: a client-call shape (`fetch(`, `axios`,
  `XMLHttpRequest`, `WebSocket(`), a persistence-method-call shape
  (`.save(`, `.persist(`), a SQL-write shape (`INSERT INTO`, `DELETE
  FROM`, `UPDATE <table> SET`), a REST-write shape (`POST /`, `PUT /`,
  `PATCH /`, `DELETE /`), or an explicit real-side-effect phrase
  (`real API call`, `real network call`, `real database`, `writes to
  the database`, `persists the data`, `calls the real
  backend/service/server`). A task naming one of these patterns
  describes a `phase_scope: logic` concern and does not belong in a
  visual-scoped plan.
- **Mandatory, type-matched sentinel naming.** A task whose
  `**ACTION**:` line displays or loads a datum (signal words:
  `display`, `render`, `show`, `populate`, `load`) MUST name the
  `[RELAY-MOCK-DATA]` sentinel it will emit at that site. A task whose
  `**ACTION**:` line wires an interactive handler (signal words:
  `wire`, `bind`, `handle`, `on click`, `on submit`, `on change`,
  `button`, `toggle`, `form submit`) MUST name the
  `[RELAY-MOCK-BEHAVIOR]` sentinel it will emit at that site. A task
  matching both signal classes must name both. A purely structural
  task with neither a displayed datum nor an interactive handler
  (e.g., static markup, styling) needs neither sentinel — do not force
  one.
- Reuse the exact sentinel shape documented in
  `docs/context/mock-sentinels.md`.

`plan-reviewer`'s new `R-COH-VISUAL-SCOPE-PURITY` check (Phase 3 of
`PRPs/prds/figma-visual-first-track.prd.md`) enforces both rules
structurally. Not applicable — no restriction, no rubric row — when
`phase_scope` is absent or `logic`." Separately, in the "## Anti-patterns
(hard rules)" section, add a new bullet: "**Authoring a side-effecting
task inside a `phase_scope: visual` plan.** A task naming a real
network call, persistence write, or business mutation (or a
displayed-datum/interactive-action task with no type-matched sentinel)
belongs in the paired `phase_scope: logic` plan (Phase 4 of
`PRPs/prds/figma-visual-first-track.prd.md`), never here.
`plan-reviewer`'s `R-COH-VISUAL-SCOPE-PURITY` check rejects it."

**MIRROR**: Patterns to Mirror block 6
(`docs/context/mock-sentinels.md:24-51`); Hard Constraint #12 added in
Task 2 (same vocabulary, restated at point of task assembly).

**ADDRESSES**: AC-A1

**VALIDATE**:
```bash
set -euo pipefail
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-writer.md
grep -q "R-COH-VISUAL-SCOPE-PURITY" plugins/relay/agents/plan-writer.md
echo "PASS: task-restriction rule + anti-pattern bullet present"
```

### Task 6: UPDATE plugins/relay/agents/plan-reviewer.md — new deterministic check `R-COH-VISUAL-SCOPE-PURITY`

**ACTION**: Immediately after the `R-COH-DESIGN-GROUNDED` check
(currently the last deterministic check) and before the "### Bounded
K=5 LLM judgment pass" heading, add: "#### R-COH-VISUAL-SCOPE-PURITY —
`phase_scope: visual` plans contain no side-effecting tasks and no
unsentineled data/action tasks

**Deliberate mirror of `R-COH-DESIGN-SOURCE-MISSING`/`R-COH-DESIGN-GROUNDED`'s
zero-emission/otherwise shape, applied to the `phase_scope` field's own
non-heuristic lineage.** This check never infers or repairs plan
content — an offending task is always a structural defect, never a
self-healing opportunity.
- **Zero-emission branch:** if the plan's `## Metadata` table has no
  row whose first cell matches `phase_scope` (case-insensitive), OR
  the row's value is `logic` (not `visual`), emit NO row at all for
  this check — not even `passed: true`. Do NOT fail in either case.
- **Otherwise** (`phase_scope: visual`): parse `## Step-by-Step Tasks`
  for `### Task <i>: ...` headings. For each task, scan its
  `**ACTION**:` line and body prose — EXCLUDING its `**VALIDATE**:`
  line/block — for two independent fail conditions:
  - **(a) Forbidden side-effect vocabulary present.** A
    case-insensitive match against any of: a client-call shape
    (`fetch(`, `axios`, `XMLHttpRequest`, `WebSocket(`), a
    persistence-method-call shape (`.save(`, `.persist(`), a SQL-write
    shape (`INSERT INTO`, `DELETE FROM`, `UPDATE <table> SET`), a
    REST-write shape (`POST /`, `PUT /`, `PATCH /`, `DELETE /`), or an
    explicit real-side-effect phrase (`real API call`, `real network
    call`, `real database`, `writes to the database`, `persists the
    data`, `calls the real backend/service/server`) — FAILS this task
    regardless of sentinel presence elsewhere in its body. `reason`
    quotes the offending task heading and the matched phrase verbatim.
  - **(b) Data/action task with no type-matched sentinel.** A task
    whose `**ACTION**:` line matches a data-display signal word
    (`display`, `render`, `show`, `populate`, `load`) but whose body
    never mentions `RELAY-MOCK-DATA`, OR matches an interactive-action
    signal word (`wire`, `bind`, `handle`, `on click`, `on submit`,
    `on change`, `button`, `toggle`, `form submit`) but whose body
    never mentions `RELAY-MOCK-BEHAVIOR` — FAILS. `reason` quotes the
    offending task heading and states which sentinel class is
    missing. A task matching neither signal class (pure
    layout/structural work) is exempt from this sub-check — vacuously
    fine.
  - A single offending task can trip both (a) and (b); name every
    offending task in `reason`.
  - Otherwise → `{ "id": "R-COH-VISUAL-SCOPE-PURITY", "passed": true }`.

**Known limitation (recorded, not blocking):** this is a textual
heuristic scan over plan-authored task PROSE, not real code — it
cannot see an actual diff (no code exists yet at plan-review time) and
can both miss a cleverly-worded side effect and false-positive on an
incidental word match. It is a plan-authoring-time gate, not the final
safety net; Phase 5 (`Implement-time gate`) of
`PRPs/prds/figma-visual-first-track.prd.md` is where a real diff gets
checked against real code, out of this check's scope."

**MIRROR**: Patterns to Mirror block 2
(`plugins/relay/agents/plan-reviewer.md:441-466`) for the zero-emission
branch shape; Patterns to Mirror block 3
(`plugins/relay/agents/plan-reviewer.md:468-489`) for the per-task
heading-then-body-grep loop.

**ADDRESSES**: AC-A2, AC-A4

**VALIDATE**:
```bash
set -euo pipefail
grep -q "R-COH-VISUAL-SCOPE-PURITY" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-reviewer.md
echo "PASS: R-COH-VISUAL-SCOPE-PURITY check added to plan-reviewer.md"
```

### Task 7: UPDATE plugins/relay/agents/plan-reviewer.md — widen the rubric-count prose

**ACTION**: In the "## The R-COH-* coherence layer" section's counting
paragraph (currently: "...When the target declares `figma_track:
true`, up to 2 additional conditional deterministic rows
(`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`) may also
appear, widening the range to `14 to 21 rows`; both are zero-emission
... so the baseline 14–19 range is exact for every non-Figma
project."), extend it to account for the new third conditional row:
replace the sentence with: "When the target declares `figma_track:
true`, up to 2 additional conditional deterministic rows
(`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`) may also
appear, and — independently, only on a `phase_scope: visual` plan,
which per the source PRD's own MoSCoW can only exist inside a
`figma_track: true` project since `visual_first` is itself gated on
`figma_track: true` — a 3rd conditional deterministic row
(`R-COH-VISUAL-SCOPE-PURITY`) may also appear, together widening the
range to `14 to 22 rows` in the maximal case (all three conditional
rows present at once). Each of the three conditional rows is
independently zero-emission (contributes nothing) when its own gating
condition is not met, so the baseline 14–19 range is exact for every
non-Figma project, and the 14–21 range from the prior `design_source`
shipment remains exact for a `figma_track: true` project whose plan is
not `phase_scope: visual`." Do not alter any other sentence in this
section.

**MIRROR**: The existing counting paragraph's own arithmetic shape
(`plugins/relay/agents/plan-reviewer.md`, "## The R-COH-* coherence
layer" section) as the direct base text being extended.

**ADDRESSES**: AC-A2

**VALIDATE**:
```bash
set -euo pipefail
grep -q "14 to 22 rows" plugins/relay/agents/plan-reviewer.md
echo "PASS: rubric-count prose widened to 14-22 rows"
```

### Task 8: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (immediately after the
existing Phase 2 entry, before `</ul>`; do NOT create a new `<h2>`
release heading, do NOT bump
`plugins/relay/.claude-plugin/plugin.json` — stays under `Unreleased`
so `version-parity` remains green), describing: "`plan-writer` gains
non-heuristic `phase_scope` sourcing from a source PRD row's
`[VISUAL]`/`[LOGIC]` tag (HALTing `FAILED_PHASE_SCOPE_UNDECLARED` when
undeclared on a `visual_first: true` PRD) and, for `phase_scope:
visual` plans, restricts authored tasks to UI-and-mocks scope with
mandatory type-matched `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]`
sentinel naming; `plan-reviewer` gains the structural
`R-COH-VISUAL-SCOPE-PURITY` check (zero-emission unless `phase_scope:
visual`), failing `CHANGES_REQUESTED` on any side-effecting or
unsentineled task. Part of the Figma Visual-First Track, Phase 3 of
`PRPs/prds/figma-visual-first-track.prd.md`." Match the exact
`<code>` tagging and "Part of ..., Phase N of ..." closing-sentence
style of the sibling entries already in the same list.

**MIRROR**: Patterns to Mirror block 7
(`PRPs/plans/completed/figma-visual-first-track-phase-2-prd-authoring.plan.md:543-567`).

**ADDRESSES**: AC-A1 through AC-A5 (documentation of record)

**VALIDATE**:
```bash
set -euo pipefail
grep -q "figma-visual-first-track.prd.md" documentation/changelog.html
grep -q "R-COH-VISUAL-SCOPE-PURITY" documentation/changelog.html
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
grep -q "FAILED_PHASE_SCOPE_UNDECLARED" docs/context/plan-template.md
grep -q "FAILED_PHASE_SCOPE_UNDECLARED" plugins/relay/agents/plan-writer.md
grep -q "R-COH-VISUAL-SCOPE-PURITY" plugins/relay/agents/plan-writer.md
grep -q "R-COH-VISUAL-SCOPE-PURITY" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-writer.md
grep -q "RELAY-MOCK-DATA" plugins/relay/agents/plan-reviewer.md
grep -q "RELAY-MOCK-BEHAVIOR" plugins/relay/agents/plan-reviewer.md
grep -q "14 to 22 rows" plugins/relay/agents/plan-reviewer.md
grep -q "figma-visual-first-track.prd.md" documentation/changelog.html
echo "PASS: all content invariants present across the four touched files"
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
# Diff-scoped (never whole-file) cross-file vocabulary-consistency check:
# the phase_scope: visual task-restriction vocabulary plan-writer.md now
# authors against must match, token-for-token, the vocabulary
# plan-reviewer.md's new R-COH-VISUAL-SCOPE-PURITY check greps for — a
# drift here would let a plan-writer-compliant plan still fail review.
writer_diff=$(git diff --unified=0 development -- plugins/relay/agents/plan-writer.md | grep -E "^\+[^+]")
reviewer_diff=$(git diff --unified=0 development -- plugins/relay/agents/plan-reviewer.md | grep -E "^\+[^+]")
for token in "RELAY-MOCK-DATA" "RELAY-MOCK-BEHAVIOR" "R-COH-VISUAL-SCOPE-PURITY"; do
  echo "$writer_diff" | grep -q -- "$token" || { echo "FAIL: plan-writer.md diff missing token: $token"; exit 1; }
  echo "$reviewer_diff" | grep -q -- "$token" || { echo "FAIL: plan-reviewer.md diff missing token: $token"; exit 1; }
done
echo "PASS: phase_scope: visual vocabulary consistent across plan-writer.md and plan-reviewer.md diffs"
```

Every command above either exits with the natural non-zero status of a
failing `grep -q`/`npm run validate` under `set -euo pipefail`, or an
explicit `|| { echo "FAIL: ..."; exit 1; }` guard — none rely on the
forbidden `<check> && echo "PASS" || echo "FAIL"` idiom, per the
2026-07-09 decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** Given a plan with `phase_scope: visual`, when
  `plan-writer` authors its `## Step-by-Step Tasks`, then every task
  whose action displays a datum or wires an interactive handler
  explicitly names a `[RELAY-MOCK-DATA]` or `[RELAY-MOCK-BEHAVIOR]`
  sentinel (type-matched) it will emit, and no task's `**ACTION**:`
  text matches the forbidden side-effect vocabulary (network /
  persistence / mutation) — the source PRD's zero-side-effects
  contract enforced at authoring time.
- **AC-A2 (PRD AC-3):** Given a `phase_scope: visual` plan whose
  `## Step-by-Step Tasks` contain a task naming a forbidden
  side-effect pattern, or a data/action task with no type-matched
  sentinel, when `plan-reviewer` runs the new
  `R-COH-VISUAL-SCOPE-PURITY` check, then it returns
  `CHANGES_REQUESTED` naming the specific offending task.
- **AC-A3 (PRD AC-2):** Given a source PRD row N whose `Phase` cell
  carries a `[VISUAL]` or `[LOGIC]` tag, when `plan-writer` sources
  `phase_scope` for that row, then the value is copied verbatim from
  the tag — never inferred from the row's `Description` cell or any
  task content — and a missing/malformed tag on a `visual_first: true`
  PRD HALTs (`FAILED_PHASE_SCOPE_UNDECLARED`) before any DRAFT plan is
  written.
- **AC-A4 (PRD AC-1):** Given a source PRD that does not declare
  `visual_first: true` (or a target project without `figma_track:
  true`), when `plan-writer`/`plan-reviewer` run, then no
  `phase_scope` row, no task-restriction language, and no
  `R-COH-VISUAL-SCOPE-PURITY` rubric row appears anywhere in the
  output — byte-identical to today.
- **AC-A5 (PRD AC-3):** Given a `phase_scope: visual` plan, when
  `plan-writer` assembles its `## Mandatory Reading` table, then
  `docs/context/mock-sentinels.md` is included as a P0 entry, giving
  the Implementer the sentinel convention it must follow.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `R-COH-VISUAL-SCOPE-PURITY`'s forbidden-vocabulary/sentinel-naming scan is a textual heuristic over plan-authored task PROSE, not real code — it can miss a cleverly-worded side effect or false-positive on an incidental word match (e.g. a pure-UI `.update()` DOM call) | Medium | Medium | The check explicitly excludes the `**VALIDATE**:` line/block from its scan (so a defensive "confirm no fetch(" grep doesn't trip on itself); this is a plan-authoring-time gate, not the final safety net — Phase 5 (`Implement-time gate`)'s real-diff `code-reviewer` enforcement is the load-bearing runtime guarantee once code exists, out of this phase's scope |
| A `phase_scope: visual` plan is very likely also `design_source: figma` (since `visual_first` is itself gated on `figma_track: true`), so a UI/frontend task must simultaneously satisfy `R-COH-DESIGN-GROUNDED`'s frame-reference requirement AND the new check's sentinel-naming requirement | Medium | Low | Both checks are independently well-precedented, per-task, bounded-vocabulary greps; this plan's Step 4.4 item 10 edit explicitly instructs `plan-writer` to satisfy both in the same task's `**ACTION**:` line — no structural conflict exists between naming a frame id and naming a sentinel together |
| `FAILED_PHASE_SCOPE_UNDECLARED` fires only at Step 4.4 item 5 (mid-Phase-4), after Phase 2's research dispatch and Phase 3's Decision Gate consultation have already run — a HALT here wastes those calls | Low | Low | Exactly mirrors `design_source`'s own accepted HALT-late trade-off (the exact precedent this phase was told to mirror); the cost is bounded (two subagent dispatches), and `prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` already structurally guarantees every row of an `APPROVED` `visual_first: true` PRD carries a valid tag — this HALT is a rare defense-in-depth backstop (e.g. a hand-edited PRD row post-approval), not the expected common case |

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
changelog `<li>`) touch zero `.mjs` files, matching Phase 1's and
Phase 2's own precedent (Phase 1 touched exactly one `.mjs` file and
got real `node --test` coverage for that file only; Phase 2 touched
none). This plan's own Validation Commands (Level 2 content-invariant
greps, Level 3 diff-scoped cross-file consistency check) are therefore
the primary mechanical verification for this phase's deliverables.

**Research grounding:** the `Task` tool was available in this
invocation; `research-codebase` and `research-web` subagents were
dispatched in parallel per protocol. `research-codebase` confirmed
every line-number citation used in this plan via direct reads of
`plan-writer.md`, `plan-reviewer.md`, `plan-template.md`,
`mock-sentinels.md`, `prd-template.md`, and `prd-reviewer.md`, and
independently confirmed (whole-repo search) that `plan-writer.md`,
`plan-reviewer.md`, and `relay-plan.md` currently carry zero
references to `phase_scope` anywhere — this phase's wiring is fully
greenfield, not an edit to partially-existing logic.
`research-web`'s pass found real, applicable ESLint precedent for
denylist-based side-effect detection (`no-restricted-syntax`,
`no-restricted-imports`, `eslint-plugin-functional`'s
`immutable-data` rule) and confirmed no tool performs true semantic
side-effect detection at the AST level (`eslint-plugin-pure` explicitly
disclaims network/DB detection) — corroborating this phase's own
textual-heuristic design choice (recorded as Risk 1 above) rather than
a false promise of full static verification. It also confirmed no named
industry convention exists for an inline "this is intentionally
mocked" comment sentinel (MSW's `passthrough()` and Storybook's
args/decorators mock at a code boundary, not via prose comments) —
reconfirming, as Phase 1's own research already found, that
`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` is this repo's own
invention with no external precedent to align to.

**Design note — Steps 1.4 and 4.1 need no change.** `plan-writer.md`'s
existing slug computation (Step 1.4: kebab-case row N's `Phase` cell,
dropping every character outside `[a-z0-9-]`) and title assembly (Step
4.1: `<Phase Name>` copied verbatim) already handle a bracket-tagged
`Phase` cell correctly without modification — the `[`/`]` characters
are mechanically dropped by the existing "punctuation dropped" rule,
and a title/slug that visibly carries "visual"/"logic" is a
readability feature, not a defect. This phase deliberately does not
touch either step.

**Design note — forbidden-vocabulary scope excludes VALIDATE lines.**
Task headings use the literal form `### Task <i>: <ACTION> <file>`
where `<ACTION>` is `CREATE`/`UPDATE`/`DELETE` (the Files-to-Change
action verb) — a naive denylist scan including the heading or a bare
"update"/"delete" match would false-positive on every task's own
heading. Both the `plan-writer.md` task-restriction rule (Task 5) and
the `plan-reviewer.md` check (Task 6) scope their scan to the
`**ACTION**:` line's prose body and require additional context
(parens, a SQL `SET` clause, a REST path slash, or an explicit
"real"/"database"/"network" qualifier) rather than bare CRUD verbs,
specifically to avoid this collision.

**Self-application note:** this plan's own source PRD
(`figma-visual-first-track.prd.md`) does not declare `visual_first:
true`, and this target repo's own `docs/context/methodology.md` does
not declare `figma_track: true` — consistent with Phase 1's and Phase
2's own framing, this plan's `## Metadata` table carries no
`design_source` row and no `phase_scope` row; the new visual-scope
machinery this phase ships is inert against this repo and against
this very plan, by design.

---

*Generated: 2026-07-25*
*Approved: 2026-07-25*
*Implemented: 2026-07-25*
*Status: IMPLEMENTED*
