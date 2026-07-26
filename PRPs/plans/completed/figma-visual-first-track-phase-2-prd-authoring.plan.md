# Feature: PRD authoring (Phase 2 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of existing shipped agent files (`prd-writer.md`, `prd-reviewer.md`); extension of a canonical template (`prd-template.md`) consumed by other pipeline agents; reuse of an established non-heuristic declaration pattern (`design_source` lineage) for a new field (`visual_first`); a new deterministic structural check added to an existing reviewer's additive R-COH-* coherence layer
- Decisions found:
  - [2026-05-01] Source PRD's Implementation Phases table IS the state machine; `Depends` is the native sequencing primitive (D6) — the exact column this phase's pairing mechanism reuses rather than inventing a new one
  - [2026-05-14] `phase_type` Metadata-field precedent (self-healing, reviewer may infer/insert) — the explicit contrast case this phase's `[VISUAL]`/`[LOGIC]` marker convention deliberately diverges from
  - [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference — the exact lineage `visual_first` mirrors, and the direct shape template for `prd-writer`'s item 7.5 / `prd-reviewer`'s `R-COH-DESIGN-SOURCE-INCOMPLETE` this phase mirrors verbatim
  - [2026-07-09] Validation commands must carry real exit-code semantics; `plan-reviewer` enforces via `R-COH-VALIDATE-ALWAYS-PASS` — binding on every VALIDATE/Level command this plan emits
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — confirms the new item 6.5 question stays entirely within the already-interactive PRD-authoring stretch; this phase does not create a new interactivity-boundary extension
  - [2026-04-28] AC-10 of `plan-authoring.prd.md` evolves: R-COH-* rows are additive to the `rubric[]` array — `prd-reviewer`'s own R-COH-* layer is already open-ended (no "exactly N" count site to update), confirmed by direct read
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — generalizes directly to `visual_first`: never inferred, only the user's explicit Item 6.5 answer sets it
  - "Writing pipeline artifacts under `.claude/`" — standing background constraint; every write in this phase lands under `plugins/relay/agents/`, `docs/context/`, `documentation/`, or `PRPs/plans/`, never `.claude/`
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; Item 6.5 runs strictly within the pre-boundary interactive PRD-authoring stretch
  - "One command per stage, writer/reviewer split" — `prd-writer`/`prd-reviewer` remain a matched pair; the new question lives in the writer, the new structural check lives in the reviewer
  - Source PRD's Implementation Phases table is the orchestrator's sole state machine; the `Depends` column is the native sequencing primitive this phase's pairing mechanism reuses
  - PRP artifact convention (`PRPs/plans/`, `PRPs/prds/`) — this plan and its PRD back-fill both respect it
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 2:
  "PRD authoring" — Goal: A developer can author a `visual_first:
  true` PRD with correctly paired phase rows. — Success signal: A
  hand-authored visual-first PRD passes `prd-reviewer`'s structural
  pairing check.

## Summary

This phase wires the three declaration surfaces Phase 1 registered
(`## Visual-First Mode` in `prd-template.md`, the `phase_scope`
Metadata-row shape, the `mock-sentinels.md` bracket-tag convention)
into real interactive behavior on `prd-writer` and real structural
enforcement on `prd-reviewer`. `prd-writer` gains a new figma_track-gated
Item 6.5 in its Phase 6 DECISIONS flow that asks whether the PRD is
visual-first; when yes, it guides the Implementation-phases capture
(item 7) into strict visual/logic pairs and, at assembly time
(Step 7.4), tags every phase row's `Phase` cell `[VISUAL]` or `[LOGIC]`
and pairs rows 1:1 via the existing `Depends` column — reusing the
`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` bracket-tag visual grammar
Phase 1 already established, applied here to a new but structurally
identical non-heuristic-marking need. The `[VISUAL]`/`[LOGIC]`
convention itself — invented in this phase, since neither the source
PRD nor Phase 1 specified a PRD-level scope-marking mechanism, and the
PRD's own Decisions Log explicitly rules out a new table column — is
registered in `docs/context/prd-template.md` so Phase 3 (plan
authoring, visual lineage) can consume it without re-deriving.
`prd-reviewer` gains two changes: a corrected R2 section-order note
(the existing note only accounts for `## Design Source`, and would
mis-fire the moment a `figma_track: true` PRD emits the already-registered
`## Visual-First Mode` section — a real regression this phase fixes)
and a new deterministic `R-COH-VISUAL-PAIRING-INCOMPLETE` check
mirroring `R-COH-DESIGN-SOURCE-INCOMPLETE`'s exact zero-emission/otherwise
shape, failing `CHANGES_REQUESTED` on any scope-impure phase, unpaired
visual or logic phase, or non-1:1 `Depends` pairing per source PRD AC-2.

## User Story

As a developer maintaining the relay plugin, I want `prd-writer` to ask
an explicit visual-first question and assemble strictly-paired,
`Depends`-linked Implementation Phases rows, and `prd-reviewer` to
structurally validate that pairing, so that a visual-first PRD's phase
table is correct and enforceable before any downstream plan-authoring
phase (Phase 3/4) has to trust it.

## Problem Statement

Relay's Figma Visual-First Track (v2) needs every `visual_first: true`
PRD's Implementation Phases table to be strictly visual/logic-paired
(source PRD AC-2) — but today, immediately after Phase 1's foundational
declaration-surface registration, no agent asks the user whether a PRD
is visual-first, no agent enforces the strict-pairing structure, and
`prd-reviewer`'s existing R2 rubric would actually mis-fire (flag a
false "extra section" defect) the moment a `figma_track: true` PRD
emits the already-registered `## Visual-First Mode` section, since
R2's current dual-branch note only accounts for `## Design Source`.

## Solution Statement

Add a new `figma_track`-gated Item 6.5 to `prd-writer`'s Phase 6
DECISIONS flow that asks the visual-first yes/no question before the
Implementation-phases list (item 7) is captured, and, when yes,
instructs that capture into strict visual/logic pairs; extend Step 7.4
assembly to tag each Phase-name cell `[VISUAL]` or `[LOGIC]`, pair rows
1:1 via `Depends`, and emit the `## Visual-First Mode` section;
register the tag + pairing convention in the canonical
`docs/context/prd-template.md` so Phase 3 can consume it without
re-deriving; and give `prd-reviewer` both a corrected R2 section-order
note and a new deterministic `R-COH-VISUAL-PAIRING-INCOMPLETE` check
that fails `CHANGES_REQUESTED` on any scope-impure or non-1:1-paired
phase, emitting nothing at all when the PRD isn't visual-first.

## Metadata

| Field | Value |
|---|---|
| Type | Agent capability extension (new interactive Q&A branch + new structural review check) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/prd-writer.md`, `plugins/relay/agents/prd-reviewer.md`, `docs/context/prd-template.md`, `documentation/changelog.html` |
| Dependencies | Phase 1 (Foundations) — complete; provides the `## Visual-First Mode` template registration this phase extends and the `docs/context/mock-sentinels.md` bracket-tag precedent this phase's marker convention reuses |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` Implementation Phases row 2 |
| phase_type | scaffold |

This target project's own `docs/context/methodology.md` does not
declare `figma_track: true`, so per `docs/context/plan-template.md`'s
dual-branch rule this table carries no `design_source` row (and the
plan body carries no `## Design Source` section). This plan's own
source PRD does not declare `visual_first: true` either (it is a
meta-PRD about relay's own pipeline machinery), so this table also
carries no `phase_scope` row — the new v2 machinery is inert against
this repo and against this very plan, by design (mirroring Phase 1's
own self-application note).

**On `phase_type: scaffold` despite adding new interactive/structural
capability:** this classification looks counter-intuitive at first —
Phase 2 genuinely adds new *behavior* (a dialogue branch, a rubric
check), which reads like `feature`. But `phase_type` is consumed by
`plan-reviewer`'s `R-COH-VALIDATE-FRAMEWORK-MISMATCH` check, which
requires every VALIDATE command's first token to match the declared
test framework (`node:test` in this repo) *unless* the phase is
`scaffold`/`docs`/`foundation`-exempted. This phase's deliverables are
prompt/template markdown content — there is no `.mjs` module or other
`node:test`-testable application code surface for prd-writer.md,
prd-reviewer.md, or prd-template.md edits (unlike Phase 1, which *did*
touch one real `.mjs` file, `gating-structure.mjs`, and got genuine
`node --test` coverage for that one file only). Every legitimate
VALIDATE command this phase can emit is necessarily grep/content-invariant-shaped.
Per the established, twice-recurring lesson (v1 and v2 Phase 1) —
grep/`npm run validate`-shaped VALIDATE commands require `phase_type:
scaffold`, never `feature`, to get the correct rubric exemption —
this phase is tagged `scaffold` despite its behavioral nature.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `docs/context/prd-template.md` | 198-238 | The already-registered `## Visual-First Mode` section (198-222, Phase 1's output, ending with a forward-reference to *this* phase) and the immediately-following conditional `## Design Source` section (225-238) — the exact shape and ordering this phase's template extension and `prd-reviewer` R2 fix must respect |
| P0 | `plugins/relay/agents/prd-writer.md` | 256-317 | Phase 6 DECISIONS flow, including the existing figma_track-gated Item 7.5 (278-303) — the direct shape precedent (conditional gate, per-row instruction, explicit "silent no-op when off" framing) for the new Item 6.5 |
| P0 | `plugins/relay/agents/prd-writer.md` | 384-421 | Step 7.4 PRD-body assembly numbered list (389-415, including the existing conditional item 15.5 for `## Design Source`) and the TDD-routing verbatim strings (417-421 — note: `docs/context/plan-template.md:58-59` and this very agent's own Hard Constraint #4 cite "lines 382-386" for these strings; that citation has drifted, confirmed via direct read and independently by `research-codebase` — the strings are currently at 417-421; out of scope for this phase to fix, noted per the existing drift already flagged in Phase 1's plan Notes) |
| P0 | `plugins/relay/agents/prd-reviewer.md` | 212-238 | R2 — All mandatory sections present and in order, including the existing item-13 `## Design Source` dual-branch note (229-238) this phase's R2 fix extends |
| P0 | `plugins/relay/agents/prd-reviewer.md` | 297-373 | The R-COH-* coherence layer's general shape (297-317: additive, deterministic-then-K=5, appends to the same `rubric[]`) and `R-COH-DESIGN-SOURCE-INCOMPLETE` (359-373) — the exact zero-emission/otherwise two-branch shape the new `R-COH-VISUAL-PAIRING-INCOMPLETE` check mirrors |
| P0 | `docs/context/mock-sentinels.md` | 22-61 | The `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` bracket-tag convention (Phase 1's output) — the visual grammar this phase's `[VISUAL]`/`[LOGIC]` marker convention deliberately reuses for a structurally identical non-heuristic-marking need |
| P1 | `PRPs/prds/figma-visual-first-track.prd.md` | AC-2 (line 56); Decisions Log "Scope-flag placement" and "Visual/logic pairing" rows (201-202); Phase 2 detail (165-168) | The full contract this phase implements: strict scope-purity, strict 1:1 `Depends` pairing (not N:1), and the explicit ruling-out of a new PRD-table column for the scope marker — the constraint that shapes this phase's `[VISUAL]`/`[LOGIC]` in-cell tag design |
| P1 | `PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md` | 275-291 | The changelog Task pattern (`<li>` under `Unreleased`→`Added`, no version bump) this phase's Task 7 mirrors verbatim |
| P1 | `docs/decisions.md` | 505-520 | The `phase_type` precedent (2026-05-14) — informs both this phase's own `phase_type: scaffold` classification and the explicit contrast the `[VISUAL]`/`[LOGIC]`/`visual_first` non-heuristic lineage diverges from |
| P1 | `docs/decisions.md` | 680-688 | The exit-code-semantics decision (2026-07-09) — binding on every VALIDATE/Level command this plan emits |
| P2 | `docs/decisions.md` | 777-786 | The `design_source` non-heuristic precedent (2026-07-23) — the lineage `visual_first` mirrors in full |
| P2 | `documentation/changelog.html` | 31-42 | The current `Unreleased` → `Added` `<ul>` (Phase 1's own entry is the last `<li>`, line 41) — the exact insertion point and per-entry style Task 7 must match |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/prd-writer.md:278-303
**Item 7.5 — Per-phase Figma declaration (conditional, `figma_track:
true` only).** When the target's `docs/context/methodology.md`
declares `figma_track: true`, immediately after capturing the
Implementation phases list (item 7 above), ask explicitly, for EVERY
row just captured, whether that phase implements a layout already
defined in Figma:

> For each phase above, does it implement a layout already defined in
> Figma?
> - If yes: share the Figma URL and the specific frame(s)/name-path(s)
>   that phase implements.
> - If no: a brief confirmation is enough — say "no" or "not
>   applicable".
>
> Please answer for every phase listed — including phases that don't
> obviously look like frontend work (a `figma_track: true` project may
> still have backend-only or docs-only phases; those get an explicit
> "no" too, never a silent skip).

Every phase gets an answer; none may be silently skipped. Record the
per-phase declarations (Figma URL/frames, or an explicit "none") for
use in Step 7.4 item 15.5 (`## Design Source` section assembly).

When `figma_track` is `false` or absent, item 7.5 is a silent no-op —
Phase 6 proceeds exactly as it does today; no additional question is
asked.
```
Copied into Task 2 as the direct shape precedent for the new Item 6.5:
conditional gate wording, blockquote-question format, and the "silent
no-op when off" closing paragraph.

```
# SOURCE: plugins/relay/agents/prd-writer.md:404-412
15.5. `## Design Source` (conditional — only when
    `docs/context/methodology.md` declares `figma_track: true`) — one
    row per `## Implementation Phases` table row above, per
    `docs/context/prd-template.md`'s registered shape, using the
    per-phase answers captured in Phase 6 item 7.5. Every phase row
    MUST have a corresponding declaration row — never omit one,
    including phases that don't obviously look like frontend work.
    When `figma_track` is `false` or absent, this section is NOT
    emitted at all — no heading, no placeholder.
```
Copied into Task 4 as the exact numbered-list-item shape (conditional
gate line + assembly instruction + "not emitted at all" closing) for
new item 15.4 (`## Visual-First Mode` assembly).

```
# SOURCE: plugins/relay/agents/prd-reviewer.md:229-238
13. `## Implementation Phases`

    **Conditional `## Design Source` dual-branch note
    (figma_track-gated; mirrors `plan-reviewer`'s analogous item-6
    note since prd-reviewer has no existing dual-branch heading of its
    own):** When `figma_track: true` for the target project (read
    `docs/context/methodology.md`), `## Design Source` MUST appear
    immediately after `## Implementation Phases`, before `## Decisions
    Log`; when `figma_track` is `false` or absent, `## Design Source`
    MUST be absent. A mismatch fails R2.
14. `## Decisions Log`
```
Copied into Task 5 as the exact note this phase extends to a two-section
(`## Visual-First Mode` + `## Design Source`) dual-branch note, in
their correct relative order.

```
# SOURCE: plugins/relay/agents/prd-reviewer.md:359-373
#### R-COH-DESIGN-SOURCE-INCOMPLETE — every Implementation Phases row has a Design Source declaration

- **Zero-emission branch:** if `## Design Source` is absent from the
  PRD (the common case — `figma_track` off), emit NO row at all for
  this check. Do NOT fail in this case.
- Otherwise (`## Design Source` is present): count the `##
  Implementation Phases` table's data rows and the `## Design Source`
  table's data rows.
  - **Row-count mismatch** → fail. `reason` states both counts and
    names the missing phase number(s) (the `#` values present in `##
    Implementation Phases` but absent from `## Design Source`).
  - **Row counts match, but a `Declaration` cell is empty for any
    row** → fail. `reason` names the phase number(s) with an empty
    `Declaration` cell.
  - Otherwise → `{ "id": "R-COH-DESIGN-SOURCE-INCOMPLETE", "passed": true }`.
```
Copied into Task 6 as the exact two-branch (zero-emission / otherwise,
itemized fail conditions each naming the offending phase number(s) in
`reason`) shape the new `R-COH-VISUAL-PAIRING-INCOMPLETE` check follows.

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
Copied into Task 1 as the visual-grammar precedent (bracket-tag,
ALL-CAPS, prefix position) for the new `[VISUAL]`/`[LOGIC]` phase-name
marker convention — same non-heuristic-marking need, same repo, same
established convention family.

```
# SOURCE: docs/context/prd-template.md:198-222
## Visual-First Mode

*(Conditional — present ONLY when the target project's
`docs/context/methodology.md` declares `figma_track: true`; absent
entirely, not an empty section, when `figma_track` is `false` or
absent.)*

**visual_first:** `true` | `false`

Never inferred from PRD content ... `visual_first: true` means every
phase in the `## Implementation Phases` table above must be strictly
scope-pure — either wholly visual or wholly logic, never mixed —
paired 1:1 via the existing `Depends` column
(`PRPs/prds/figma-visual-first-track.prd.md` AC-2). ... The exact
enforcement of the phase-pairing check belongs to
`prd-writer`/`prd-reviewer` — Phase 2 of
`PRPs/prds/figma-visual-first-track.prd.md` — not implemented by this
template registration alone.
```
The section Task 1 extends — the closing sentence ("not implemented by
this template registration alone") is superseded by Task 1's new
"Phase-pairing mechanism" subsection, since Phase 2 (this phase) now
implements it.

```
# SOURCE: PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md:276-287
### Task 4: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a list entry under the `Unreleased` section (create the
section if absent, matching the existing changelog's heading structure)
describing: "`figma_track` opt-in key added to `methodology.md` (default
off); ... Part of the Figma Implementation Track, Phase 1 of
`PRPs/prds/figma-implementation-track.prd.md`." Do NOT create a new
versioned `<h2>` release heading and do NOT bump
`plugins/relay/.claude-plugin/plugin.json` — this stays under `Unreleased`
so `version-parity` remains green.
```
Copied into Task 7 as the exact `<li>`-under-`Unreleased`→`Added` shape
and no-version-bump discipline.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `docs/context/prd-template.md` | UPDATE | Register the `[VISUAL]`/`[LOGIC]` marker + strict 1:1 `Depends`-pairing mechanism inside the existing conditional `## Visual-First Mode` section |
| `plugins/relay/agents/prd-writer.md` | UPDATE | New Item 6.5 gate (Phase 6); item 7 pairing amendment; Step 7.4 items 15 (extended) + 15.4 (new) for table/section assembly |
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | R2 item-13 dual-branch note extended to cover `## Visual-First Mode`; new deterministic `R-COH-VISUAL-PAIRING-INCOMPLETE` check |
| `documentation/changelog.html` | UPDATE | Add an `Unreleased` → `Added` entry for this phase |

## NOT Building (Scope Limits)

- Mixed visual+logic phases, N:1 phase pairing, or any heuristic
  inference of `visual_first` — this phase's new check *rejects* these
  (fails `CHANGES_REQUESTED`); it does not build support for them.
- Retrofitting already-APPROVED PRDs — Item 6.5 only applies to PRDs
  authored going forward; this phase never reopens an APPROVED PRD.
- Plan-level `phase_scope` derivation mechanics — this phase creates
  the PRD-level `[VISUAL]`/`[LOGIC]` marker + `Depends` pairing Phase 3
  will read from; it does not implement `plan-writer`'s own per-row
  `phase_scope` sourcing logic (Phase 3's job entirely).
- Zero-side-effects enforcement, sentinel-ledger resolution, the
  implement-time visual gate, orchestrator halt/resume, or
  `/relay-visual-approve` — Phases 3 through 6's job entirely; this
  phase only produces a correctly-paired PRD table for them to consume.
- Any change to `docs/context/plan-template.md`,
  `docs/context/mock-sentinels.md`,
  `plugins/relay/skills/context-builder/SKILL.md`, or
  `scripts/validate/checks/gating-structure.mjs` — already registered
  by Phase 1; this phase reads them for grounding but does not modify
  them.
- A new column on the `## Implementation Phases` table — explicitly
  ruled out by the source PRD's own Decisions Log "Scope-flag
  placement" row; the marker lives inside the existing `Phase` cell.
- `plugin.json` version bump — deferred to a future release-cut; this
  phase's changelog entry stays under `Unreleased`.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/prd-template.md — register the `[VISUAL]`/`[LOGIC]` pairing mechanism

**ACTION**: In the `## Visual-First Mode` section (198-222), replace
the closing sentence "The exact enforcement of the phase-pairing check
belongs to `prd-writer`/`prd-reviewer` — Phase 2 of
`PRPs/prds/figma-visual-first-track.prd.md` — not implemented by this
template registration alone." with a new subsection, `### Phase-pairing
mechanism`, stating: (1) because the PRD's `## Implementation Phases`
table carries no dedicated scope column (per the source PRD's own
Decisions Log "Scope-flag placement" row), a `visual_first: true` PRD
marks each phase's scope directly in the `Phase` cell using a mandatory
leading bracket tag — `[VISUAL] {Phase Name}` (scope-pure visual phase:
UI + mocked data only) or `[LOGIC] {Phase Name}` (scope-pure logic
phase: real business rules on an already-locked visual) — mirroring
`docs/context/mock-sentinels.md`'s `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]`
bracket-tag convention; (2) every phase row carries exactly one of the
two tags, never both, never neither; (3) pairing uses the table's
existing `Depends` column: a `[LOGIC]` row's `Depends` cell names
exactly the `#` of its one paired `[VISUAL]` row (a lone value, not
part of a comma-separated list), and a `[VISUAL]` row is named by
exactly one `[LOGIC]` row's `Depends` cell — strict 1:1, never N:1, per
the source PRD's own "Visual/logic pairing" Decisions Log row; (4) per
source PRD AC-2's "(and vice versa)" clause, every phase — visual or
logic — belongs to exactly one pair; a visual-first PRD has no
standalone, unpaired phase (see this plan's Risks section for the
resulting UX-friction note); (5) `prd-reviewer`'s
`R-COH-VISUAL-PAIRING-INCOMPLETE` check enforces all of the above
structurally, failing `CHANGES_REQUESTED` otherwise.

**MIRROR**: `docs/context/mock-sentinels.md:24-51` bracket-tag visual
grammar (Patterns to Mirror block 5); extends `docs/context/prd-template.md:198-222`
(Patterns to Mirror block 6).

**ADDRESSES**: AC-A1, AC-A5, AC-A6

**VALIDATE**: `if grep -q "\[VISUAL\]" docs/context/prd-template.md && grep -q "\[LOGIC\]" docs/context/prd-template.md && grep -q "Phase-pairing mechanism" docs/context/prd-template.md; then echo "PASS: pairing mechanism registered"; else echo "FAIL: [VISUAL]/[LOGIC] marker convention or Phase-pairing mechanism subsection missing from prd-template.md"; exit 1; fi`

### Task 2: UPDATE plugins/relay/agents/prd-writer.md — insert Item 6.5 (visual-first declaration gate)

**ACTION**: In `## Phase 6 — DECISIONS`, immediately after the section
heading and before the existing "Ask the scope and risk questions:"
line, insert a new conditional paragraph, "**Item 6.5 — Visual-first
mode declaration (conditional, `figma_track: true` only).**" — gated
identically to Item 7.5 (`docs/context/methodology.md` declares
`figma_track: true`) but running *before* the Decisions blockquote
rather than after it, since its answer shapes how item 7 (inside the
blockquote) must be captured. Ask the user, as a blockquote question:
"Is this PRD visual-first? Visual-first means every phase in your
Implementation Phases table will be strictly split into a scope-pure
visual phase (UI built against mocked data, blocking visual-verified
before any logic exists) paired 1:1 with a scope-pure logic phase
(wires the real business rules once the visual is locked). Answer yes
or no." Record the answer as `visual_first: true | false` — state
explicitly this is never inferred from the feature description,
Foundation answers, or any other prior dialogue (the same non-heuristic
contract `figma_track`/`design_source` follow). State that a "yes"
answer means item 7 below must capture the phase list as strict
visual/logic pairs (forward-reference item 7's own conditional note,
added by Task 3). Close with the same "silent no-op when off" framing
Item 7.5 uses: when `figma_track` is `false` or absent, Item 6.5 is a
silent no-op — no additional question is asked, and `visual_first` is
never recorded.

**MIRROR**: Patterns to Mirror block 1 (`plugins/relay/agents/prd-writer.md:278-303`).

**ADDRESSES**: AC-A1, AC-A4

**VALIDATE**: `if grep -q "Item 6.5" plugins/relay/agents/prd-writer.md && grep -q "Is this PRD visual-first" plugins/relay/agents/prd-writer.md; then echo "PASS: Item 6.5 gate present"; else echo "FAIL: Item 6.5 visual-first gate missing from Phase 6 DECISIONS"; exit 1; fi`

### Task 3: UPDATE plugins/relay/agents/prd-writer.md — amend item 7's Implementation-phases bullet

**ACTION**: Within the Phase 6 `> **Decisions:**` blockquote, amend
item 7 ("**Implementation phases** — a rough ordered list; each phase
produces something observable.") to add a parenthetical conditional
clause: "(If item 6.5 above recorded `visual_first: true`: every phase
must belong to exactly one visual/logic pair — describe each frontend
surface as a strictly-paired visual phase + logic phase, e.g.
'Dashboard UI' then 'Dashboard Logic'. Any backend-only or docs-only
work folds into whichever paired logic phase it most naturally
supports; per this PRD's own AC-2, a visual-first PRD has no
standalone, unpaired phase.)" Do not alter items 1-6, 8, or 9 of the
same blockquote.

**MIRROR**: Item 7's existing text as the base to amend (`plugins/relay/agents/prd-writer.md:272-273`); the parenthetical framing mirrors Item 7.5's own "including phases that don't obviously look like frontend work" carve-out language (Patterns to Mirror block 1).

**ADDRESSES**: AC-A1

**VALIDATE**: `if grep -q "every phase must belong to exactly one visual/logic pair" plugins/relay/agents/prd-writer.md; then echo "PASS: item 7 pairing amendment present"; else echo "FAIL: item 7's visual_first-conditional pairing clause missing"; exit 1; fi`

### Task 4: UPDATE plugins/relay/agents/prd-writer.md — Step 7.4: extend item 15 + add item 15.4

**ACTION**: In Step 7.4's numbered assembly list, extend item 15
("Implementation Phases (table + Phase Details)") from its current
one-line form to a short paragraph: when Item 6.5 recorded
`visual_first: true`, assemble the table applying the
`[VISUAL]`/`[LOGIC]` phase-name tag + strict 1:1 `Depends` pairing
described in `docs/context/prd-template.md`'s `## Visual-First Mode`
section — every entry from the paired list captured in item 7 becomes
one tagged row, and a `[LOGIC]` row's `Depends` cell names exactly its
one paired `[VISUAL]` row's `#`; when `visual_first` is `false`,
absent, or `figma_track` is off, assemble the table exactly as today
(no tags, ordinary `Depends` semantics). Then insert a new item 15.4
(between existing items 15 and 15.5, before the existing conditional
`## Design Source` item), for `## Visual-First Mode` (conditional —
only when `docs/context/methodology.md` declares `figma_track: true`):
per `docs/context/prd-template.md`'s registered shape, emit a single
`**visual_first:** \`true\` | \`false\`` line sourced verbatim from
Item 6.5's answer — never inferred; positioned immediately after `##
Implementation Phases`, before the conditional `## Design Source`
section (item 15.5); when `figma_track` is `false` or absent, the
section is NOT emitted at all — no heading, no placeholder. Do not
renumber existing items 15.5, 16, 17, or 18.

**MIRROR**: Patterns to Mirror block 2 (`plugins/relay/agents/prd-writer.md:404-412`, the existing item 15.5).

**ADDRESSES**: AC-A1, AC-A5

**VALIDATE**:
```bash
set -euo pipefail
grep -q "15\.4\." plugins/relay/agents/prd-writer.md
grep -q "\[VISUAL\]" plugins/relay/agents/prd-writer.md
grep -q "\[LOGIC\]" plugins/relay/agents/prd-writer.md
awk '/Step 7\.4/{flag=1} /Step 7\.5/{flag=0} flag' plugins/relay/agents/prd-writer.md | grep -q "Visual-First Mode"
echo "PASS: item 15 extension + item 15.4 present in Step 7.4"
```

### Task 5: UPDATE plugins/relay/agents/prd-reviewer.md — R2 dual-branch note extension

**ACTION**: Replace R2 item 13's existing "Conditional `## Design
Source` dual-branch note" with a note covering BOTH conditional
sections in their correct relative order: "**Conditional `##
Visual-First Mode` + `## Design Source` dual-branch note (both
figma_track-gated; mirrors `plan-reviewer`'s analogous item-6 note
since prd-reviewer has no existing dual-branch heading of its own):**
When `figma_track: true` for the target project (read
`docs/context/methodology.md`), BOTH conditional sections MUST appear,
in this exact order: `## Visual-First Mode` immediately after `##
Implementation Phases`, then `## Design Source` immediately after `##
Visual-First Mode`, before `## Decisions Log`. When `figma_track` is
`false` or absent, BOTH sections MUST be absent. A mismatch (either
section present/absent inconsistently with `figma_track`, or present
out of order) fails R2." Do not alter any other numbered item (1-12,
14, 15) of R2.

**MIRROR**: Patterns to Mirror block 3 (`plugins/relay/agents/prd-reviewer.md:229-238`).

**ADDRESSES**: AC-A3, AC-A5

**VALIDATE**:
```bash
set -euo pipefail
r2_block=$(sed -n '/### R2/,/### R3/p' plugins/relay/agents/prd-reviewer.md)
echo "$r2_block" | grep -q "Visual-First Mode"
echo "$r2_block" | grep -q "Design Source"
echo "PASS: R2 note extended to cover Visual-First Mode"
```

### Task 6: UPDATE plugins/relay/agents/prd-reviewer.md — new deterministic check `R-COH-VISUAL-PAIRING-INCOMPLETE`

**ACTION**: Immediately after the `R-COH-DESIGN-SOURCE-INCOMPLETE`
check (359-373) and before the "### Bounded K=5 LLM judgment pass"
heading, add a new deterministic check `#### R-COH-VISUAL-PAIRING-INCOMPLETE
— every visual-first phase is scope-pure and 1:1 Depends-paired` with
this logic: **Zero-emission branch** — if `## Visual-First Mode` is
absent from the PRD (the common case — `figma_track` off), OR the
section is present but its `visual_first:` value reads `false`, emit
NO row at all for this check; do NOT fail in either case. **Otherwise**
(`## Visual-First Mode` is present AND `visual_first: true`): for
every `## Implementation Phases` data row, read the `Phase` cell's
leading tag. Fail conditions, each naming the offending phase number(s)
in `reason`: (a) a row's `Phase` cell does not start with exactly one
of `[VISUAL]` or `[LOGIC]` (missing both, or carrying both) — scope-impure
or unmarked; (b) an unpaired `[VISUAL]` row — no `[LOGIC]` row's
`Depends` cell names that row's `#` as a lone value; (c) an unpaired or
malformed `[LOGIC]` row — its `Depends` cell is empty, names a
non-existent phase number, names a `[LOGIC]` phase instead of a
`[VISUAL]` phase, or lists more than one phase number; (d) non-1:1
fan-in — more than one `[LOGIC]` row's `Depends` cell names the same
`[VISUAL]` row. Otherwise → `{ "id": "R-COH-VISUAL-PAIRING-INCOMPLETE",
"passed": true }`. Do not alter `R-COH-NUMBER-DRIFT`,
`R-COH-SECTION-REF-MISSING`, `R-COH-DESIGN-SOURCE-INCOMPLETE`, or the
K=5 pass. No `rubric[]` count-site update is needed — `prd-reviewer`'s
R-COH-* layer is already open-ended (confirmed: no "exactly N" count
constraint exists anywhere in this file, unlike `plan-reviewer`/`code-reviewer`).

**MIRROR**: Patterns to Mirror block 4 (`plugins/relay/agents/prd-reviewer.md:359-373`).

**ADDRESSES**: AC-A2, AC-A3, AC-A4

**VALIDATE**: `if grep -q "R-COH-VISUAL-PAIRING-INCOMPLETE" plugins/relay/agents/prd-reviewer.md && grep -q "Zero-emission branch" plugins/relay/agents/prd-reviewer.md; then echo "PASS: R-COH-VISUAL-PAIRING-INCOMPLETE check added"; else echo "FAIL: new deterministic check missing"; exit 1; fi`

### Task 7: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (immediately after the
existing Phase 1 entry, before `</ul>`; do NOT create a new `<h2>`
release heading, do NOT bump
`plugins/relay/.claude-plugin/plugin.json` — stays under `Unreleased`
so `version-parity` remains green), describing: "`prd-writer` gains an
interactive visual-first declaration question (Phase 6 DECISIONS,
`figma_track: true`-gated) and assembles Implementation Phases rows
tagged `[VISUAL]`/`[LOGIC]`, strictly paired 1:1 via `Depends`;
`docs/context/prd-template.md`'s `## Visual-First Mode` section now
documents the tag + pairing mechanism; `prd-reviewer` gains the
structural `R-COH-VISUAL-PAIRING-INCOMPLETE` check (zero-emission
unless `visual_first: true`) plus a corrected R2 section-order note.
Part of the Figma Visual-First Track, Phase 2 of
`PRPs/prds/figma-visual-first-track.prd.md`." Match the exact
`<code>` tagging and "Part of ..., Phase N of ..." closing-sentence
style of the sibling entries already in the same list.

**MIRROR**: Patterns to Mirror block 7 (`PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md:276-287`).

**ADDRESSES**: AC-A1 through AC-A6 (documentation of record)

**VALIDATE**: `if grep -q "R-COH-VISUAL-PAIRING-INCOMPLETE" documentation/changelog.html && grep -q "id=\"unreleased-added\"" documentation/changelog.html; then echo "PASS: changelog Unreleased entry added"; else echo "FAIL: changelog entry missing"; exit 1; fi`

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
grep -q "\[VISUAL\]" docs/context/prd-template.md
grep -q "\[LOGIC\]" docs/context/prd-template.md
grep -q "Phase-pairing mechanism" docs/context/prd-template.md
grep -q "Item 6.5" plugins/relay/agents/prd-writer.md
grep -q "every phase must belong to exactly one visual/logic pair" plugins/relay/agents/prd-writer.md
grep -q "15\.4\." plugins/relay/agents/prd-writer.md
grep -q "R-COH-VISUAL-PAIRING-INCOMPLETE" plugins/relay/agents/prd-reviewer.md
grep -q "figma-visual-first-track.prd.md" documentation/changelog.html
echo "PASS: all content invariants present across the four touched files"
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
# Cross-file integration check: prd-template.md's ACTUAL section order
# between "## Implementation Phases" and "## Decisions Log" must match
# what prd-reviewer.md's R2 note now claims.
headings=$(awk '/^## Decisions Log/{flag=0} flag && /^## /{print} /^## Implementation Phases/{flag=1}' docs/context/prd-template.md)
echo "$headings" | grep -q "Visual-First Mode"
echo "$headings" | grep -q "Design Source"
vf_line=$(echo "$headings" | grep -n "Visual-First Mode" | head -1 | cut -d: -f1)
ds_line=$(echo "$headings" | grep -n "Design Source" | head -1 | cut -d: -f1)
if [ "$vf_line" -ge "$ds_line" ]; then
  echo "FAIL: prd-template.md orders Design Source before (or same as) Visual-First Mode"
  exit 1
fi
r2_block=$(sed -n '/### R2/,/### R3/p' plugins/relay/agents/prd-reviewer.md)
echo "$r2_block" | grep -q "Visual-First Mode"
echo "$r2_block" | grep -q "Design Source"
echo "PASS: prd-template.md's actual section order and prd-reviewer.md's R2 note stay consistent"
```

Every command above either exits with the natural non-zero status of a
failing `grep -q`/`awk`/`npm run validate` under `set -euo pipefail`,
or an explicit `if/then/else/exit 1/fi` — none rely on the forbidden
`<check> && echo "PASS" || echo "FAIL"` idiom, per the 2026-07-09
decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** Given a target project with `figma_track:
  true`, when `prd-writer`'s Phase 6 runs, then Item 6.5 asks the
  visual-first yes/no question before item 7's phase list is captured,
  and the answer (never inferred from any other dialogue) determines
  whether table assembly applies the `[VISUAL]`/`[LOGIC]` tag +
  `Depends`-pairing convention.
- **AC-A2 (PRD AC-2):** Given a hand-authored `visual_first: true` PRD
  whose Implementation Phases table has a mixed-scope phase (no tag,
  or both tags), an unpaired `[VISUAL]` row, an unpaired/malformed
  `[LOGIC]` row, or a `[VISUAL]` row claimed by 2+ `[LOGIC]` rows, when
  `prd-reviewer` runs `R-COH-VISUAL-PAIRING-INCOMPLETE`, then it
  returns `CHANGES_REQUESTED` naming the specific offending phase
  number(s) in `reason`.
- **AC-A3 (PRD AC-2):** Given a hand-authored `visual_first: true` PRD
  whose phases are all correctly scope-pure and 1:1 `Depends`-paired,
  when `prd-reviewer` runs, then `R-COH-VISUAL-PAIRING-INCOMPLETE`
  returns `passed: true` and R2's extended section-order note also
  passes (`## Visual-First Mode` present, immediately after `##
  Implementation Phases`, before `## Design Source`).
- **AC-A4 (PRD AC-1):** Given a target project without `figma_track:
  true` (or with `figma_track: true` but `visual_first: false`), when
  `prd-writer`/`prd-reviewer` run, then no `[VISUAL]`/`[LOGIC]` tag, no
  Item 6.5 question, no `## Visual-First Mode` section is produced, and
  `R-COH-VISUAL-PAIRING-INCOMPLETE` emits no row at all — byte-identical
  to today.
- **AC-A5 (PRD AC-2):** Given Item 6.5 answered "yes", when
  `prd-writer`'s Step 7.4 assembles the PRD, then a `## Visual-First
  Mode` section is emitted immediately after `## Implementation
  Phases` (before the conditional `## Design Source`), carrying
  `visual_first: true` sourced verbatim from the Item 6.5 answer.
- **AC-A6 (PRD AC-2):** Given the source PRD's own Decisions Log
  "Scope-flag placement" row (no new PRD-table column), when this
  phase's `prd-template.md` changes are inspected, then the
  `[VISUAL]`/`[LOGIC]` scope marker lives inside the existing `Phase`
  name cell — no new `## Implementation Phases` table column is added.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The strict bidirectional 1:1 pairing (source PRD AC-2's "and vice versa" clause) forbids any standalone backend-only/docs-only phase in a `visual_first: true` PRD — a real UX friction point the source PRD's Open Questions do not resolve | Medium | Low | Implemented per AC-2's literal wording (no unpaired phase of either scope); the amended item 7 dialogue (Task 3) instructs folding such work into the nearest paired logic phase; named here explicitly for a future PRD iteration or dogfood reassessment, mirroring the source PRD's own "Two-cycle human overhead has no baseline" Open Question in spirit |
| The `[VISUAL]`/`[LOGIC]` bracket-tag marker convention is a plan-writer design choice — neither the source PRD nor Phase 1 specified a PRD-level scope-marking mechanism, and Phase 3 (plan authoring, visual lineage) independently needs to derive per-row `phase_scope` from this exact convention | Low | Medium | This plan registers the convention prominently in `docs/context/prd-template.md` (Task 1) — the canonical, Mandatory-Reading source every downstream phase consults — rather than leaving it only inside `prd-writer.md`'s prompt, precisely so Phase 3 inherits it without re-deriving or inventing a divergent scheme |
| `R-COH-VISUAL-PAIRING-INCOMPLETE`'s `[LOGIC]`-row `Depends`-cell parsing requires a lone phase number; a PRD author who lists an unrelated comma-separated multi-dependency on a `[LOGIC]` row would be flagged malformed even if intent was benign | Low | Low | Matches the source PRD's own explicit "Strict 1:1 ... not N:1" decision; the check's `reason` string names the malformed value specifically, and this rubric still runs entirely inside the interactive PRD-authoring stretch, where a human can resolve it in one dialogue turn |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after ordering
— when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. `test_frameworks:
["node:test"]` is declared in this repo, so the pair is active in
principle — but this phase's deliverables (`prd-writer.md`,
`prd-reviewer.md`, `prd-template.md` prompt/template edits, plus a
changelog `<li>`) touch zero `.mjs` files, and relay's own `node:test`
surface (`scripts/validate/checks/*.test.mjs`) only covers the
deterministic JS checkers under `scripts/validate/`. There is no
`node:test`-testable application-code surface for this phase's
content, unlike Phase 1 (which touched exactly one `.mjs` file,
`gating-structure.mjs`, and got real `node --test` coverage for that
file only). This plan's own Validation Commands (Level 2
content-invariant greps, Level 3 cross-file consistency script) are
therefore the primary mechanical verification for this phase's
deliverables — the test pair has no additional `.mjs` surface to
extend here. (Reference: `docs/context/plan-template.md:58-59` and
this agent's own governing Hard Constraint #4 cite
`plugins/relay/agents/prd-writer.md` "Step 7.4 (lines 382-386)" for
the TDD-routing verbatim strings; direct read confirms the strings
currently live at lines 417-421, and `research-codebase` independently
corroborated this same drift. This is a pre-existing citation drift
already flagged in Phase 1's plan Notes — out of scope for this phase
to fix; the verbatim string content itself is unaffected and matches
byte-for-byte.)

**Research grounding:** the `Task` tool was available in this
invocation; `research-codebase` and `research-web` subagents were
dispatched in parallel per protocol. `research-codebase` confirmed
every line-number citation used in this plan via independent direct
reads of `prd-writer.md`, `prd-reviewer.md`, `prd-template.md`, and
`mock-sentinels.md`, and surfaced a genuine, previously-unflagged gap:
`prd-reviewer.md`'s existing R2 dual-branch note only accounts for `##
Design Source`, with no equivalent note for the already-registered `##
Visual-First Mode` section — meaning, unfixed, R2 would literally
mis-fire (flag a false "extra section between Implementation Phases
and Decisions Log" defect) the moment `prd-writer` starts emitting
that section. This finding directly produced Task 5 above.
`research-web`'s pass returned thin, largely inapplicable evidence (as
expected for this internal, tool-specific mechanism): Storybook's
isolate-then-integrate component-driven-development sequence
corroborates the underlying visual-first *premise* but offers no
guidance on structuring *work-tracking artifacts* into paired,
dependency-linked units; contract-first API development's mock-then-real
split is explicitly a *parallel*-track pattern, not a *sequential
1:1-dependency* pattern, so its applicability to this phase's exact
mechanism is limited; horizontal-vs-vertical story-slicing literature
addresses ticket-level splitting, not phase-level splitting, and is
inferred-applicable rather than directly confirmed. No source
documents a named convention for "strict 1:1 phase pairing via
explicit dependency link," confirming this phase's `[VISUAL]`/`[LOGIC]`
+ `Depends` mechanism is this repo's own invention, grounded in its
own prior art (`design_source`, `mock-sentinels.md`) rather than
external precedent — consistent with how Phase 1's own research pass
found the load-bearing precedent was this repo's own lineage, not
external sources.

**Design decision — `[VISUAL]`/`[LOGIC]` marker convention:** neither
the source PRD nor Phase 1 specified how an individual PRD phase row
should declare its visual/logic scope (the source PRD's own Decisions
Log "Scope-flag placement" row rules out a new table column, but says
nothing about the `Phase`-cell marking mechanism itself). This plan
invents the `[VISUAL] {Phase Name}` / `[LOGIC] {Phase Name}` bracket-tag
convention, deliberately reusing `mock-sentinels.md`'s established
bracket-tag visual grammar (`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]`)
for a structurally identical non-heuristic-marking need, and registers
it in `docs/context/prd-template.md` (Task 1) as the single canonical
source Phase 3 (plan authoring) must consult when deriving each plan's
`phase_scope` from its source PRD row.

**Design decision — strict bidirectional pairing:** source PRD AC-2
reads "every visual phase has exactly one paired logic phase via
`Depends` (and vice versa)" — read literally, this is bidirectional:
every logic phase also requires exactly one paired visual phase, with
no carve-out for a standalone backend-only or docs-only phase within a
`visual_first: true` PRD. This plan implements `R-COH-VISUAL-PAIRING-INCOMPLETE`
per that literal, stricter reading (Task 6) rather than inventing an
unpaired-logic-phase exception the source PRD does not state. The
resulting UX friction (a visual-first PRD cannot mix in a standalone
backend phase) is named explicitly in this plan's Risks table for
future reassessment — this plan implements the acceptance criterion as
written rather than silently relaxing it.

**Self-application note:** this plan's own source PRD
(`figma-visual-first-track.prd.md`) does not declare `visual_first:
true`, and this target repo's own `docs/context/methodology.md` does
not declare `figma_track: true` — consistent with Phase 1's own
framing, this plan's `## Metadata` table carries no `design_source`
row and no `phase_scope` row; the new v2 machinery is inert against
this repo and against this very plan, by design.

---

*Generated: 2026-07-24*
*Approved: 2026-07-24*
*Implemented: 2026-07-25*
*Status: IMPLEMENTED*
