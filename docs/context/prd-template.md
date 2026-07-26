# PRD Template

Canonical shape of every PRD produced in the `relay` pipeline. Stored at
`PRPs/prds/<kebab-case-name>.prd.md`.

**Provenance:** fork of `plugins/prp-core/commands/prp-prd.md` (Phase 7 output
template). Relay preserves the interactive 6-phase Q&A flow of the upstream
command and keeps the output structure, adding three mandatory extensions.

**Keeping the fork in sync:** when the upstream template evolves, update
this file or record a conscious divergence in `docs/decisions.md`. Do not
let upstream changes propagate silently.

---

## Relay adaptations (mandatory extensions)

1. **Decision Gate evidence header.** Before the PRD body begins, the PRD
   Writer MUST consult `docs/decisions.md`, `docs/anti-patterns.md`, and
   `docs/context/architecture.md` per `docs/decision-gate.md`, and emit the
   evidence block as a fenced code block at the top of the PRD file. A PRD
   without this block is invalid.

2. **Acceptance Criteria (test scenarios).** Mandatory section below "Success
   Metrics", above "Users & Context". Each acceptance criterion is written
   as an observable scenario: *given … when … then …*, or as a concrete
   input/output example. When `docs/context/methodology.md` declares
   `tdd: true`, this section is the direct input to the test pair
   (test-writer/test-reviewer) authoring test-first, before the Implementer.
   When `tdd: false` with a declared framework, the same section is the
   contract the test pair authors test-after (after the Implementer + Code
   Review); with no framework declared, no tests are authored. Either way the
   Test Runner executes the resulting suite.

3. **TDD routing note.** Every PRD includes a short subsection under
   "Technical Approach" that reads the current value of `tdd` from
   `docs/context/methodology.md` and states the ordering explicitly:
   "Test-first ordering" (`tdd: true` — the test pair authors before the
   Implementer) or "Test-after ordering" (`tdd: false` — the test pair authors
   after the Implementer + Code Review). This leaves no ambiguity for the
   orchestrator at hand-off.

---

## Output path

`PRPs/prds/<kebab-case-name>.prd.md`

Directory is created if it doesn't exist. NEVER write under `.claude/` — see
`docs/anti-patterns.md` and `docs/decisions.md` on the PRP artifact path
convention.

---

## PRD body — structure

Sections appear in this exact order. Empty sections are marked `TBD - needs
validation` rather than filled with filler.

```markdown
# {Product / Feature Name}

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {list}
- Decisions found: {list or "none"}
- Applicable anti-patterns: {list or "none"}
- Applicable architectural rules: {list or "none"}
- Result: PROCEED | HALT (reason)
```

## Problem Statement
{2-3 sentences: who has what problem, and what is the cost of not solving it?}

## Evidence
- {Quote, data point, or observation proving this problem exists}
- {Another piece of evidence}
- {If none: "Assumption — needs validation through [method]"}

## Proposed Solution
{One paragraph: what we're building and why this approach over alternatives.}

## Key Hypothesis
We believe {capability} will {solve problem} for {users}.
We'll know we're right when {measurable outcome}.

## What We're NOT Building
- {Out of scope item 1} — {why}
- {Out of scope item 2} — {why}

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| {Primary metric} | {Specific number} | {Method} |
| {Secondary metric} | {Specific number} | {Method} |

## Acceptance Criteria (test scenarios)

Mandatory. Each criterion is an observable scenario the resulting code must
satisfy. If `tdd: true` in `docs/context/methodology.md`, these are the
contract the test pair authors test-first (before the Implementer). If
`tdd: false` with a declared framework, they are the contract the test pair
authors test-after (after the Implementer + Code Review). With no framework
declared, no tests are authored.

- **AC-1 {short name}:** Given {precondition}, when {action}, then {observable outcome}.
- **AC-2 {short name}:** {scenario}
- **AC-3 {short name}:** {scenario}

## Open Questions
- [ ] {Unresolved question 1}
- [ ] {Unresolved question 2}

---

## Users & Context

**Primary User**
- **Who:** {Specific description}
- **Current behavior:** {What they do today}
- **Trigger:** {What moment creates the need}
- **Success state:** {What "done" looks like}

**Job to Be Done**
When {situation}, I want to {motivation}, so I can {outcome}.

**Non-Users**
{Who this is NOT for and why}

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | {Feature} | {Why essential} |
| Must | {Feature} | {Why essential} |
| Should | {Feature} | {Why important but not blocking} |
| Could | {Feature} | {Nice to have} |
| Won't | {Feature} | {Explicitly deferred and why} |

### MVP Scope
{Minimum needed to validate the hypothesis.}

### User Flow
{Critical path — shortest journey to value.}

---

## Technical Approach

**Feasibility:** {HIGH / MEDIUM / LOW}

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **{true | false}**.

- If **true:** Test-first ordering — the test pair (test-writer/test-reviewer)
  produces the initial test suite from the Acceptance Criteria section above,
  before the Implementer runs.
- If **false:** Test-after ordering — when a test framework is declared, the
  test pair authors and maintains the suite from the Acceptance Criteria after
  the Implementer + Code Review; with no framework declared, no tests are
  authored.

### Architecture Notes
- {Key technical decision and why}
- {Dependency or integration point}

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| {Risk} | {H / M / L} | {How to handle} |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | {Phase name} | {What this phase delivers} | pending | - | - | - |
| 2 | {Phase name} | {What this phase delivers} | pending | - | 1 | - |

### Phase Details

**Phase 1: {Name}**
- **Goal:** {What we're trying to achieve}
- **Scope:** {Bounded deliverables}
- **Success signal:** {How we know it's done}

---

## Visual-First Mode

*(Conditional — present ONLY when the target project's
`docs/context/methodology.md` declares `figma_track: true`; absent
entirely, not an empty section, when `figma_track` is `false` or
absent.)*

**visual_first:** `true` | `false`

Never inferred from PRD content — the same non-heuristic,
explicit-declaration-only contract every opt-in gating key in this
pipeline follows (mirrors the "What We're NOT Building" guarantee of
`PRPs/prds/figma-visual-first-track.prd.md` itself: "Any heuristic
inference of `visual_first` or `phase_scope` from PRD/plan content").
`visual_first: true` means every phase in the `## Implementation
Phases` table above must be strictly scope-pure — either wholly
visual or wholly logic, never mixed — paired 1:1 via the existing
`Depends` column (`PRPs/prds/figma-visual-first-track.prd.md` AC-2).
`visual_first: false` (or this section's absence when `figma_track`
itself is off) means Implementation Phases keep v1's existing
single-phase shape, unchanged. Phase 2 of
`PRPs/prds/figma-visual-first-track.prd.md` implements the
phase-pairing mechanism below.

### Phase-pairing mechanism

1. Because the `## Implementation Phases` table above carries no
   dedicated scope column (per the source PRD's own Decisions Log
   "Scope-flag placement" row), a `visual_first: true` PRD marks each
   phase's scope directly in the `Phase` cell using a mandatory
   leading bracket tag — `[VISUAL] {Phase Name}` (scope-pure visual
   phase: UI + mocked data only) or `[LOGIC] {Phase Name}` (scope-pure
   logic phase: real business rules on an already-locked visual) —
   mirroring `docs/context/mock-sentinels.md`'s
   `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` bracket-tag convention.
2. Every phase row carries exactly one of the two tags, never both,
   never neither.
3. Pairing uses the table's existing `Depends` column: a `[LOGIC]`
   row's `Depends` cell names exactly the `#` of its one paired
   `[VISUAL]` row (a lone value, not part of a comma-separated list),
   and a `[VISUAL]` row is named by exactly one `[LOGIC]` row's
   `Depends` cell — strict 1:1, never N:1, per the source PRD's own
   "Visual/logic pairing" Decisions Log row.
4. Per source PRD AC-2's "(and vice versa)" clause, every phase —
   visual or logic — belongs to exactly one pair; a visual-first PRD
   has no standalone, unpaired phase.
5. `prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` check enforces
   all of the above structurally, failing `CHANGES_REQUESTED`
   otherwise.

---

## Design Source

*(Conditional — present ONLY when the target project's
`docs/context/methodology.md` declares `figma_track: true`; absent
entirely, not an empty section, when `figma_track` is `false` or
absent.)*

One row per `## Implementation Phases` table row above — no phase may
be silently omitted, including phases that don't obviously look like
frontend work:

| Phase # | Declaration (figma \| none) | Figma URL / frames (when figma) |
|---------|------------------------------|-----------------------------------|
| {#} | {figma \| none} | {Figma URL / frame reference, or "-" when none} |

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| {Decision} | {Choice} | {Options considered} | {Why this one} |

---

## Research Summary

**Market Context**
{Key findings from market research}

**Technical Context**
{Key findings from technical exploration}

---

*Generated: {timestamp}*
*Status: DRAFT | APPROVED*
```

---

## Lifecycle — where this template is consumed

1. **PRD Writer** (planned agent, Phase 3) runs the interactive 6-phase Q&A
   flow, emits the Decision Gate evidence, fills the sections above, writes
   the file to `PRPs/prds/<name>.prd.md`.
2. **PRD Reviewer** (planned agent, Phase 3) reviews against this template,
   can loop with the user until approval. Flips status from DRAFT to
   APPROVED.
3. **Plan Writer** (planned agent, Phase 3) consumes the approved PRD,
   produces the implementation plan at `PRPs/plans/<name>.plan.md`.
4. After PRD approval, the pipeline runs autonomously per
   `docs/context/architecture.md` §Interactivity boundary.
