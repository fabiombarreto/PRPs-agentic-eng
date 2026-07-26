# Figma Visual-First Track

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions, cross-cutting patterns, reuse or creation of components, a new interactivity-boundary extension
- Decisions found: [2026-04-19] Interactivity boundary (PRD interactive, downstream autonomous); [2026-05-01] Source PRD's Implementation Phases table IS the state machine, `Depends` is the native sequencing primitive (D6); [2026-07-09] PRD `DRAFT→APPROVED` flip ownership is invocation-context-scoped; [2026-05-14] `phase_type` Metadata-field precedent (self-healing, reviewer may infer/insert); [2026-07-23] `design_source` declaration is mandatory and non-heuristic, diverging deliberately from `phase_type`'s self-healing inference; [2026-07-23] Design Spec pair is relay's second interactivity-boundary extension (inline-adopted, synchronous, mirrors prd-writer/prd-reviewer); [2026-07-23] Visual-verification loop is a bounded, non-blocking degradation ladder inside `/relay-implement` (the exact mechanism this feature extends to a dual-mode blocking/non-blocking shape)
- Applicable anti-patterns: activating any pipeline track/key by heuristic (must be explicit declaration only — applies identically to `visual_first` and `phase_scope`); relying on interactive permission prompts inside the autonomous loop (rules out a synchronous dialogue for the human-approval gate)
- Applicable architectural rules: interactivity boundary is fixed at PRD approval — nothing after that point may dialogue with the user except explicitly-recorded extensions (this PRD proposes relay's THIRD such extension); `PRPs/` artifact convention; one command per stage with writer/reviewer split; the source PRD's Implementation Phases table is the orchestrator's sole state machine
- Result: PROCEED
```

## Problem Statement

Developers using relay's Figma Implementation Track only get visual feedback at the very end of each phase's implementation (`/relay-implement`'s Phase A.3.4, non-blocking, after logic and UI are already built together). When the visual comes out wrong — and matching Figma pixel-for-pixel is inherently the hardest, most iterative part of the work — the fix can cascade into reworking business logic that was already built on top of the wrong visual assumption. The cost is late, expensive rework concentrated in exactly the highest-effort dimension of the task, discovered only after the cheaper alternative (catching it before any logic exists) has already passed.

## Evidence

- User's own account: verifying the visual only at the end "pode acabar gerando muito retrabalho, considerando que a parte visual é a mais difícil de se acertar," and errors there can force refatorar "também a parte lógica e de regras de negócio."
- Storybook's component-driven development methodology documents a four-stage isolate-then-integrate sequence — build each component in isolation with mocked data/props, compose, assemble pages, and only in the final stage wire up real data and business logic (storybook.js.org/docs/get-started/why-storybook).
- The presentational/container component split (Dan Abramov's original essay) ties UI isolation directly to the ability to run screenshot regression tests without touching app logic (medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0).
- Production visual-regression tooling (Playwright's own snapshot-testing docs, Chromatic, BrowserStack guidance) universally masks or freezes dynamic content because a live-data screen is inherently non-deterministic for diffing — the same root cause that makes relay's own v1 end-of-implementation visual check non-blocking by design.
- Assumption — needs validation: no source found gives quantified rework-reduction data for visual-first sequencing specifically, and vendor documentation does not clarify whether a failing visual-regression test hard-blocks CI in practice versus only advising a human reviewer. Tracked via this PRD's own Success Metrics once real visual-first features run.

## Proposed Solution

Add a per-PRD opt-in "visual-first" mode to relay's Implementation Phases model: instead of a single phase building UI and business logic together, a visual-first PRD is authored with strictly-separated phase pairs — one phase implementing only the UI against inline-mocked data and behavior (`[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinel comments, zero side effects), gated by a blocking visual-verification check that reuses the already-shipped `visual-verifier` agent and `plugins/relay/scripts/visual/*` tooling verbatim, followed by a paired logic phase that resolves every sentinel and wires real business rules, still protected by the existing non-blocking real-data regression. This was chosen over simply improving the existing end-of-implementation check because the limitation isn't the check's placement — a diff against live data can never be safely blocking; mocking the data first is what makes an early, blocking gate possible at all.

## Key Hypothesis

We believe that locking and blocking-approving the visual implementation (built against deterministic mocks) before any business-logic code exists will reduce the late, expensive rework that happens today when a wrong visual forces refactoring of already-built logic.
We'll know we're right when visual-phase fixes are caught during the visual phase — not in the post-logic regression — at a high rate, and the post-logic real-data regression rarely finds a break, across real visual-first feature runs.

## What We're NOT Building

- Mixed visual+logic phases — strict separation is the mechanism itself; there is no partial mode.
- N:1 phase pairing (multiple visual phases feeding one logic phase) — decided strict 1:1 for MVP; a future extension if a real feature needs it.
- Retrofitting existing PRDs (with or without `figma_track`) — same "no legacy carve-out" precedent as v1; `visual_first` is always an explicit declaration at authoring time, never applied retroactively.
- Any heuristic inference of `visual_first` or `phase_scope` from PRD/plan content — the same activation-by-heuristic anti-pattern v1 already respects, applied identically here.
- Rewrites of `visual-verifier` or `plugins/relay/scripts/visual/*` — reused with only additive, backward-compatible extensions (the Design Spec's optional `Interaction` column passed through to the frame manifest, and `capture.mjs` executing declared interaction steps before capture); `compare.mjs`/`provision.mjs` untouched; frames without an `Interaction` entry behave byte-identically to today.
- Smoke-render assertions for interactive states with no pinned reference frame — a Could-item defense-in-depth mechanism, not required to validate the hypothesis.
- A mandatory typed-contract-first phase before the visual phase — valuable where the target stack has strong typing, but not universal; a Could-item, not MVP.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Rework caught early | High % of visual-phase fixes happen during the visual phase itself, not in the post-logic regression (initial estimate; no baseline yet) | % of visual-first phases whose fix round occurs before reaching `complete`, vs. only detected by the post-logic Phase A.3.4 regression |
| Post-logic regression rate | Low — few visual-first features break their visual approval once the logic phase wires real data (initial estimate) | % of logic phases whose final Phase A.3.4 regression reports a mismatch/break vs. `VISUAL_VERIFIED` |
| Visual first-pass approval rate | High — expected to exceed the equivalent v1 metric, since the diff is now against deterministic mocks (initial estimate) | % of visual phases reaching `VISUAL_VERIFIED` on the Implementer's first attempt |
| Two-cycle human overhead | A measurable, acceptable cost relative to a single-cycle v1 run (no baseline yet) | Wall-clock/human-touchpoint delta between a visual-first feature (2 phases) and an equivalent v1 single-phase run |

## Acceptance Criteria (test scenarios)

- **AC-1 Inert when off:** Given a PRD that does not declare `visual_first: true`, when `/relay-prd`, `/relay-plan`, `/relay-implement`, or `/relay-execute` run against it, then no visual-first-related section, field, gate, or output appears anywhere in that run — byte-identical to today.
- **AC-2 Strict phase separation enforced:** Given a PRD marked `visual_first: true`, when `prd-writer`/`prd-reviewer` assemble or validate its Implementation Phases table, then every phase is either scope-pure-visual or scope-pure-logic (never mixed), and every visual phase has exactly one paired logic phase via `Depends` (and vice versa) — `prd-reviewer` returns `CHANGES_REQUESTED` otherwise.
- **AC-3 Zero side effects in the visual phase:** Given a plan with `phase_scope: visual`, when the Implementer executes its tasks, then no task performs a network call, persists data, or mutates real application state — every displayed datum and interactive action is wrapped in a `[RELAY-MOCK-DATA]` or `[RELAY-MOCK-BEHAVIOR]` sentinel; `code-reviewer` fails the diff otherwise.
- **AC-4 Blocking visual gate:** Given a `phase_scope: visual` plan's Implementer diff has passed code review, when `visual-verifier` runs against the phase's own mocked captures, then the phase does not reach `complete` until the verifier returns `VISUAL_VERIFIED` (or, in `human` approval mode, until the human explicitly approves after inspecting the captures) — never silently proceeding on a mismatch.
- **AC-5 Sentinel ledger resolved before logic-phase completion:** Given a `phase_scope: logic` plan paired with an already-complete visual phase, when the Implementer completes its tasks, then zero `[RELAY-MOCK-DATA]`/`[RELAY-MOCK-BEHAVIOR]` sentinels remain in the feature's visual-phase files — validation fails otherwise, with no deferral path.
- **AC-6 Real-data regression preserved, non-blocking:** Given a `phase_scope: logic` phase reaches code-review `APPROVED`, when `/relay-implement`'s Phase A.3.4 runs against the now-real-data app, then the outcome (`VISUAL_VERIFIED`/degraded/mismatch) is recorded and surfaced — never silently dropped — but never blocks D8 or delivery, identical to today's v1 behavior.

## Open Questions

- [ ] N:1 phase pairing was deferred out of MVP (strict 1:1 decided) — revisit if a real feature needs multiple visual phases feeding one logic phase.
- [ ] Two-cycle human overhead has no baseline — reassess after visual-first runs on ~5-10 real features, mirroring this repo's own `max_test_retries` reassess-trigger convention.

---

## Users & Context

**Primary User**
- **Who:** The same developer as the base Figma Implementation Track (including the plugin's own maintainer) — specifically when choosing `visual_first` for a feature with substantial visual surface *and* substantial logic built on top of it, where the risk of a wrong visual forcing logic rework is real.
- **Current behavior:** Invokes `/relay-execute` against a `figma_track`-enabled PRD; each phase builds UI and logic together; visual verification happens only at the end of that phase's implement cycle, non-blocking; if the visual was wrong, this is discovered only after logic already exists on top of it.
- **Trigger:** Authoring a PRD (`/relay-prd`) for a feature with substantial Figma-defined visual surface, at the moment of `prd-writer`'s Phase 6 DECISIONS Implementation Phases scoping — the deliberate opt-in point.
- **Success state:** Marks the PRD `visual_first: true` at authoring time; each visual/logic phase pair runs through relay's pipeline; the visual is locked and approved before logic starts; when the logic phase lands, the final regression against real data confirms the earlier approval still holds; any forced redo happened cheaply, during the visual phase, never after logic was built on a wrong assumption.

**Job to Be Done**
When I have a feature with a layout finalized in Figma and meaningful business logic to build under it, I want the UI to be locked and pixel-approved before any logic code exists, so I can avoid discovering — after building the logic — that the visual needs to change in a way that forces me to rework that logic too.

**Non-Users**
Projects without `figma_track: true` — unchanged, inherited from v1. PRDs not marked `visual_first`, even within a `figma_track: true` project — the opt-in is per PRD, so visually-trivial or logic-heavy features stay on the v1 single-phase flow by choice. Designers and end-users of the shipped application — unchanged, not applicable to this pipeline layer.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `visual_first: true` PRD-level opt-in flag, non-heuristic, only meaningful when `figma_track: true` | The single top-level gate; nothing else in this feature activates without it |
| Must | Strict 1:1 visual↔logic phase pairing in the Implementation Phases table via the existing `Depends` column | The state-machine expression of "exclusive visual phase, then logic" — no new sequencing primitive needed |
| Must | `phase_scope: visual \| logic` non-heuristic field in the plan's `## Metadata`, never inferred | Mirrors `design_source`'s proven lineage; scope purity is as consequential as design-source declaration |
| Must | Inline mock sentinel convention (`[RELAY-MOCK-DATA]` / `[RELAY-MOCK-BEHAVIOR]`), no phase-number reference | Zero-setup, framework-agnostic mock mechanism; the ledger a later logic phase resolves |
| Must | Hard constraint: zero side effects in a visual-scoped plan (no network/persistence/real mutation) | The property that makes the mocked diff deterministic enough to block on |
| Must | Blocking `visual-verifier` gate on the visual phase, reusing the agent and `scripts/visual/*` with only additive, backward-compatible extensions | Only the caller's routing changes plus the interaction-capture extension below — no new verification mechanism |
| Must | Design Spec `Interaction` column + `capture.mjs` scripted-interaction capture (bounded click/fill/wait vocabulary) | Pins interaction-reached states (spinners, toasts) deterministically — the mocked behavior controls all timing, and the script verifies the choreography actually fires, not just that a forced state renders |
| Must | `visual_first_approval: auto \| human` methodology key, default `auto` | Machine gate always runs; human tier is opt-in for teams that want an explicit sign-off |
| Must | Mandatory sentinel-ledger resolution before a logic phase can complete (zero remaining, no deferral) | Prevents a forgotten mock from silently shipping |
| Must | Existing Phase A.3.4 real-data regression preserved, non-blocking, on the logic phase | The safety net for "wiring real data broke the approved visual" |
| Must | `/relay-visual-approve` infra command (evidence surfacing, explicit confirmation, audit-logged flip, rejection→feedback routing) | The `human` tier is only real if approval surfaces the evidence, leaves an audit trail, and rejection feeds back into the loop instead of dead-ending |
| Should | Per-frame state variants in the Design Spec beyond the single state Figma drew | Lets empty/loading/error states be captured deterministically during the visual phase |
| Could | Smoke-render (renders-without-crash) assertion for interactive states with no pinned reference frame | Defense-in-depth for the long tail of un-pinned states; not required to validate the hypothesis |
| Could | Typed-contract-first phase before the visual phase (mock shape == real shape by construction) | Valuable on strongly-typed stacks, not universal — stack-dependent, not core |
| Won't | Any activation by heuristic | Inherited anti-pattern (`docs/anti-patterns.md`), applies identically to `visual_first`/`phase_scope` |
| Won't | Mixed visual+logic phases | Defeats the entire mechanism — strict separation is the point |
| Won't | N:1 phase pairing | Resolved to strict 1:1 for MVP; see Open Questions |
| Won't | Retrofitting pre-existing PRDs | Same "no legacy carve-out" precedent as v1 |

### MVP Scope

A single visual-first PRD with one complete visual/logic phase pair, with both approval modes (`auto` and `human`) functional — both are structurally cheap (mostly a branch on an existing gate) and the human tier is core to what was asked for, not an extension to defer.

### User Flow

Developer authors a PRD, marks it `visual_first: true` at `prd-writer`'s Phase 6 DECISIONS → `prd-writer` emits paired visual+logic phase rows (`Depends`-linked) for each frontend surface → `/relay-execute` runs the visual phase: Implementer builds UI against sentinels, `visual-verifier` blocks until `VISUAL_VERIFIED` → `auto` mode: logic phase unlocks immediately; `human` mode: the orchestrator halts, the developer runs `/relay-visual-approve`, reviews the surfaced captures, and approves (or rejects with feedback that feeds the next visual fix round), then re-runs `/relay-execute` → logic phase resolves sentinels, wires real data, and the existing Phase A.3.4 regression re-verifies non-blocking → the feature proceeds through docs-sync/D8/test/QA exactly as v1 already does.

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. (`test_frameworks: ["node:test"]` is declared in this repo, so the pair is active.)

### Architecture Notes

- `phase_scope: visual | logic` lives in the plan's `## Metadata` table (never a new PRD-table column), mirroring `design_source`'s non-heuristic, never-inferred, HALT-if-absent lineage — deliberately NOT `phase_type`'s self-healing/reviewer-inferred lineage, since scope purity is as consequential a declaration as `design_source`.
- Visual/logic phase pairing is strict 1:1, expressed entirely through the existing `Depends` column — no new PRD-table column, no new orchestrator sequencing primitive.
- The `human`-mode approval gate must NOT be modeled on `design-spec-reviewer`'s `invocation_context` mechanism (a synchronous, in-conversation dialogue) — that pattern only works inside a single unbroken interactive session. Because `/relay-execute` autonomously drives many phases across one long run with no guaranteed human presence mid-flight, the human gate instead needs the HALT-and-resume pattern `/relay-execute` already uses for its other outcome codes: write a halt state, exit, and resume later via re-invocation using the existing actionable-row rule. This is relay's third interactivity-boundary extension (after PRD approval and the Design Spec pair) — but it reuses an existing mechanism rather than inventing a new dialogue shape.
- `visual-verifier` and `plugins/relay/scripts/visual/*` are reused with only additive, backward-compatible extensions: the Design Spec's Visual Acceptance Criteria table gains an optional `Interaction` column (bounded click/fill/wait step vocabulary, authored and human-approved at Design Spec time — the Storybook play-function pattern), `visual-verifier` passes it through to the frame manifest, and `capture.mjs` executes the steps before capturing. Deterministic because `[RELAY-MOCK-BEHAVIOR]` handlers control all timing. `compare.mjs`/`provision.mjs` are untouched, and the blocking-vs-non-blocking routing still changes only in the calling command.
- The existing Phase A.3.4 real-data regression (degradation ladder: `DEGRADED_STATIC_ONLY` / `DEGRADED_PROVISION_FAILED`, `BUDGET_EXCEEDED`, etc.) is preserved unchanged on the logic phase — this PRD does not modify it.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Happy-path lock-in — the visual is approved against mocks, and real-data or un-pinned-state divergence surfaces late, in the logic phase's regression, reintroducing the rework this feature exists to avoid | Medium | Phase A.3.4 real-data regression stays in place; Design Spec per-frame state variants (Should item); regression failures are always recorded and surfaced, never silently shipped |
| Sentinel-scope creep — a logic-phase edit goes beyond resolving sentinels and silently drifts from the approved visual | Medium | Code-review guidance for logic-scoped diffs to verify edits concentrate on sentinel sites; the "zero remaining sentinels" gate catches the sentinel-completeness half of this |
| The `human`-mode gate becomes a UX dead end — an unclear or manual resume path lets a human "approve" without genuinely reviewing the captures, defeating the tier's purpose | Low | Resolved at PRD time: the dedicated `/relay-visual-approve` command surfaces the fidelity report + capture/ref paths and requires explicit confirmation before any flip; rejection collects feedback and routes it into the next fix round (residual rubber-stamping remains the user's own choice, by design) |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Foundations | `visual_first` (PRD) + `phase_scope` (plan Metadata) + `visual_first_approval` (methodology) declarations + sentinel convention documented + Design Spec `Interaction` column registered in `design-spec-template.md` + new deterministic validate check. Zero behavior change when off. | complete | - | - | PRPs/plans/figma-visual-first-track-phase-1-foundations.plan.md |
| 2 | PRD authoring | `prd-writer`/`prd-template`/`prd-reviewer` gain the visual-first question and assemble the 1:1 `Depends`-paired Implementation Phases rows. | complete | - | 1 | PRPs/plans/figma-visual-first-track-phase-2-prd-authoring.plan.md |
| 3 | Plan authoring — visual phase | `plan-writer`/`plan-template`/`plan-reviewer` gain `phase_scope: visual` handling: tasks restricted to UI+mocks, mandatory sentinel emission, R-COH-* scope-purity check. | complete | - | 2 | PRPs/plans/figma-visual-first-track-phase-3-plan-visual.plan.md |
| 4 | Plan authoring — logic phase + sentinel ledger | `phase_scope: logic` handling: sentinel-resolution task requirement (grep-derived ledger, zero remaining), inherits the paired visual phase's locked frames for the final regression. | complete | - | 3 | PRPs/plans/figma-visual-first-track-phase-4-plan-logic-ledger.plan.md |
| 5 | Implement-time gate | `/relay-implement`'s Phase A.3.4 becomes dual-mode: blocking on a visual-scoped phase (against its own mocks), unchanged non-blocking regression on a logic-scoped phase (against real data); `auto`/`human` approval branching; `capture.mjs` gains additive interaction-step execution for frames declaring an `Interaction` script. | in-progress | - | 4 | PRPs/plans/figma-visual-first-track-phase-5-implement-time-gate.plan.md |
| 6 | Orchestrator wiring | `/relay-execute` gains the new halt outcome + resume semantics for the `human`-mode pending-approval case (idempotent re-entry via the existing actionable-row rule) + the new `/relay-visual-approve` infra command (evidence surfacing, confirmation, audit-logged flip, rejection→feedback routing). | pending | - | 5 | - |
| 7 | Surface integration + dogfood | QA report / PR body / documentation site made aware of the dual-mode outcome; end-to-end dogfood on a real visual-first PRD. | pending | - | 6 | - |

### Phase Details

**Phase 1: Foundations**
- **Goal:** Establish the non-heuristic declaration surfaces with zero behavior change to any existing path.
- **Scope:** `methodology.md` key, plan-template Metadata field registration, sentinel convention doc, one new validate check.
- **Success signal:** `npm run validate` stays green; no existing test or output changes.

**Phase 2: PRD authoring**
- **Goal:** A developer can author a `visual_first: true` PRD with correctly paired phase rows.
- **Scope:** `prd-writer`/`prd-reviewer`/`prd-template` changes only.
- **Success signal:** A hand-authored visual-first PRD passes `prd-reviewer`'s structural pairing check.

**Phase 3: Plan authoring — visual phase**
- **Goal:** `/relay-plan` against a `phase_scope: visual` row produces a plan whose tasks are UI-and-mocks-only, with sentinels enforced.
- **Scope:** `plan-writer`/`plan-reviewer`/`plan-template` changes for the visual lineage only.
- **Success signal:** A visual-scoped plan reviewed against a hand-built fixture correctly fails when a task implies a side effect.

**Phase 4: Plan authoring — logic phase + sentinel ledger**
- **Goal:** `/relay-plan` against a `phase_scope: logic` row produces a plan that resolves the paired visual phase's sentinel ledger completely.
- **Scope:** `plan-writer`/`plan-reviewer` changes for the logic lineage; ledger derivation logic.
- **Success signal:** A logic-scoped plan reviewed against a fixture with a deliberately-unresolved sentinel correctly fails.

**Phase 5: Implement-time gate**
- **Goal:** Phase A.3.4 blocks a visual-scoped phase on anything short of `VISUAL_VERIFIED`/human approval, while leaving the logic-scoped regression behavior byte-identical to today.
- **Scope:** `relay-implement.md` Phase A.3.4 dual-mode routing + additive `capture.mjs` interaction-step execution + `visual-verifier` manifest pass-through of the `Interaction` column; `compare.mjs`/`provision.mjs` untouched.
- **Success signal:** A visual-scoped dry run halts correctly on a deliberate mismatch; a logic-scoped dry run reproduces today's exact non-blocking behavior.

**Phase 6: Orchestrator wiring**
- **Goal:** `/relay-execute` can pause on a `human`-mode pending visual approval and resume correctly on re-invocation, with the human side of the gate served by a dedicated command.
- **Scope:** `relay-execute.md` halt/resume semantics + the new `/relay-visual-approve` infra command (locates the `awaiting-visual-approval` phase, surfaces fidelity report + capture/ref paths, explicit confirmation, single-Edit flip + audit jsonl; rejection collects feedback and routes it as the next visual fix round's `prior_feedback`).
- **Success signal:** A simulated multi-phase visual-first run halts; `/relay-visual-approve` surfaces the evidence and flips (or rejects with routed feedback); a subsequent `/relay-execute` re-invocation picks up exactly where it left off.

**Phase 7: Surface integration + dogfood**
- **Goal:** The dual-mode outcome is visible end-to-end and the whole mechanism is proven on one real feature.
- **Scope:** `relay-qa-report.md`, PR-body generation, documentation site registration, one real dogfood run.
- **Success signal:** A real visual-first feature completes through `/relay-approve` with the Visual Fidelity surfaces correctly reflecting both phases' outcomes.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Scope-flag placement | New non-heuristic field in the plan's `## Metadata` (`phase_scope: visual \| logic`) | New column in the PRD's Implementation Phases table; reuse `phase_type` | Mirrors `design_source`'s proven non-heuristic lineage; keeps the PRD table lean; `phase_type`'s self-healing/inferable behavior is wrong for a decision this consequential |
| Visual/logic pairing | Strict 1:1 via the existing `Depends` column | N:1 (multiple visual phases feeding one logic phase) | Maps directly onto the existing dependency primitive with no ambiguity about which logic phase owns which visual phase; N:1 deferred as a future extension |
| Sentinel format | `[RELAY-MOCK-DATA]` / `[RELAY-MOCK-BEHAVIOR]`, no phase-number reference | Carry the target logic-phase number in the comment | Simpler to write; avoids staleness if phases are later renumbered |
| Sentinel deferral policy | Never allowed — logic-phase validation requires zero remaining sentinels | Allowed with a recorded justification (e.g. a feature flag still off) | Simpler and safer; no mock silently ships if the recording discipline lapses |
| Approval mode default | `visual_first_approval: auto \| human`, default `auto` | Human-only (always blocks for review); machine-only (no human tier) | The user's explicit ask includes a genuine human-review option; `auto`-by-default preserves relay's single-prompt autonomy for teams that trust the deterministic gate |
| Human-gate mechanism | HALT-and-resume, mirroring `/relay-execute`'s own halt-state + re-invocation pattern | Synchronous in-conversation dialogue, mirroring `design-spec-reviewer`'s `invocation_context` | `/relay-execute` autonomously drives many phases across one long run with no guaranteed human presence mid-flight; the dialogue pattern only works inside a single unbroken interactive turn |
| Interactive-state capture (resolved OQ) | Scripted-interaction capture: optional `Interaction` column in the Design Spec's frame table (bounded click/fill/wait vocabulary), executed by `capture.mjs` before the screenshot | Addressable mock-state variant (prop/query/flag); deferring all interaction states to human QA | Mirrors the industry-standard Storybook play-function pattern; verifies the choreography actually fires (not just that a forced state renders); deterministic because mocked behavior controls all timing. Consciously amends the "scripts reused verbatim" input constraint to "additive, backward-compatible extensions only" |
| Human-gate resume mechanism (resolved OQ) | Dedicated infra command `/relay-visual-approve <feature>`: locates the `awaiting-visual-approval` phase, surfaces the fidelity-report summary + capture-vs-ref PNG paths, requires explicit in-dialogue confirmation, then flips the row via a single Edit + appends an audit jsonl entry; on rejection, collects the user's feedback and routes it into the next visual fix round as `prior_feedback` | Manual Status-cell hand-edit (no evidence surfacing, no audit trail, no rejection channel); overloading the read-only `/relay-visual-review` with an `--approve` mode (contradicts its documented non-mutating contract) | Mirrors `/relay-design-map` Phase E's shipped verbatim-confirmation→single-Edit flip pattern; keeps every human approval in relay auditable; closes the rejection→feedback loop without hand-written prompts |

## Research Summary

**Market Context**
Component-driven development (Storybook) formally documents the isolate-then-integrate sequence this PRD proposes: build components against mocked data first, wire real data/logic last. The presentational/container split ties that same isolation to reliable screenshot regression testing. Production visual-regression tooling (Playwright, Chromatic, BrowserStack) consistently treats live/dynamic content as a source of diff non-determinism requiring masking or freezing — independent confirmation of this PRD's central technical claim that mocked data, not live data, is what makes a blocking visual gate trustworthy. Gap: no source quantifies rework reduction from visual-first sequencing specifically, and vendor docs don't clarify hard-block-vs-advisory enforcement semantics in practice — tracked as an assumption pending this feature's own Success Metrics.

**Technical Context**
Confirmed against the shipped Figma Implementation Track v1 (branch `feature/figma-implementation-track`): Phase A.3.4's exact trigger/budget/outcome vocabulary (`relay-implement.md:368-397`), `visual-verifier`'s real 6-field input contract and 3-verdict output (`visual-verifier.md:54-63`), the Design Spec's 8-column Visual Acceptance Criteria table (`design-spec-template.md:107-113`), and the two existing, contrasting Metadata-field lineages — `design_source` (non-heuristic, `plan-writer.md:575-603`) versus `phase_type` (self-healing) — that this PRD deliberately picks between. Critically, `design-spec-reviewer`'s `invocation_context` gate (`design-spec-reviewer.md:28-46`) turned out to be a synchronous in-turn mechanism, not a halt-and-resume one — this PRD's human-approval gate instead mirrors `/relay-execute`'s own halt/resume idiom, confirmed via its actionable-row rule (`relay-execute.md:101-126`, `197-207`). Three additional `docs/decisions.md` entries from 2026-07-23 ground the reused visual-verification loop, the `design_source` non-heuristic precedent, and the Design Spec pair's interactivity-boundary extension.

---

*Generated: 2026-07-24*
*Approved: 2026-07-24*
*Status: APPROVED*
