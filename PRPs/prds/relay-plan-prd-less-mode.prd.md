# /relay-plan PRD-less Mode

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (new input mode consumed by the planning AND implementation chains); architectural decision (alternative entrypoint for an existing command); reuse/modification of shared components (/relay-plan, plan-writer, plan-reviewer, plan-template, /relay-implement, implementer, code-reviewer, code-reviewer-semantic); references the 2026-05-15 PRD-less-mode decision this PRD authorizes
- Decisions found:
  - 2026-05-15 "/relay-plan PRD-less mode: registered future capability, not yet implemented" — this PRD is the dedicated PRD that decision requires before implementation; its "Out of scope until a dedicated PRD is approved" list is now in-scope-to-decide here.
  - 2026-04-19 "Command surface: one command per stage, writer and reviewer split" — /relay-plan stays a writer; the description entrypoint does not collapse the writer/reviewer split.
  - 2026-04-25 "Plan filenames carry the source PRD phase number and slug" — description-mode plans have no PRD phase row; they use a flat `<slug>.plan.md`. Conscious divergence recorded in Decisions Log.
  - 2026-04-30 "D8 post-approval mutations are best-effort atomic" — Mutation c (source PRD row N flip) becomes a no-op for PRD-less plans; Mutations a + b are preserved.
  - 2026-05-14 "phase_type annotation enables rubric differentiation" — the model for the R8 description-mode exemption variant (passed:true + explicit rationale, recorded in review.jsonl).
  - 2026-04-28 "R-COH-* rows are additive to the rubric[] array" (plan-reviewer + code-reviewer) — the rubric arrays already tolerate variant rows; the description-mode R8 outcomes append, never short-circuit.
  - 2026-04-19 "PRP artifacts live under PRPs/, never .claude/" — plans still written to PRPs/plans/.
  - 2026-04-19 "Interactivity boundary: PRD interactive, downstream autonomous" — planning is autonomous; the description entrypoint adds no user dialogue downstream.
- Applicable anti-patterns:
  - "Treating plugins/prp-core/ as active relay code" — prp-plan is the behavioral design reference ONLY; its logic is adapted into relay's own assets, never imported or re-exported.
  - "Writing pipeline artifacts under .claude/" — description-mode plans go to PRPs/plans/.
  - "Relying on interactive permission prompts in the autonomous loop" — the description entrypoint must run without per-command prompts.
  - "Weakening or deleting tests to make the loop turn green" — carried over to the implementation chain; R-X strict is unchanged.
- Applicable architectural rules:
  - PRD shape conforms to docs/context/prd-template.md (this file).
  - Plan shape conforms to docs/context/plan-template.md; the `## Source` section generalizes to hold a PRD reference OR the verbatim description.
  - Orchestrator state machine is the source PRD's Implementation Phases table — description-mode plans have no PRD row and are therefore outside /relay-execute (explicit Won't).
  - Writer/reviewer split (one command per stage) is preserved.
- Result: PROCEED
```

## Problem Statement

The relay developer (and plugin users) regularly face small, well-scoped features that do not justify the full 6-phase `/relay-prd` authoring flow plus PRD approval. Today `/relay-plan` hard-requires an APPROVED PRD (preconditions P1–P4), so the only path for a small change is to ask Claude Code to implement directly from a description — bypassing every relay guideline (grounding, Decision Gate, the plan-template, the plan-reviewer rubric). The cost of not solving this is that small work either pays the disproportionate price of a full PRD or escapes relay's quality scaffolding entirely.

## Evidence

- The 2026-05-15 decision (`docs/decisions.md:523`) records this exact pain: "Users working on small, well-scoped features sometimes want to skip the full PRD authoring flow and go directly to planning, using only a feature description as input." It registers the capability but explicitly forbids implementing it before a dedicated PRD (this one) is approved.
- User report during this PRD's authoring (Phase 2): "Atualmente, quando tenho features pequenas que não são necessário um PRD, eu preciso pedir para o claude code implementar diretamente somente com minha descrição. Assim não consigo fazer uso das diretrizes usadas no /relay-plan sem um PRD real." — recurring ad-hoc implementations without relay guidelines.
- The upstream design reference `prp-plan` already supports this: its Phase 0 input-type detection routes a `.prd.md` path (or text containing "Implementation Phases") to PRD mode and any other free text directly to description-based planning (`plugins/prp-core/commands/prp-plan.md:43-85`).

## Proposed Solution

Add a **description-only input mode** to `/relay-plan`, modeled closely on `prp-plan` but adapted to relay's contracts. The command gains a Phase 0 **input-type detection** step: an argument that resolves to a `.prd.md` file (or whose content carries an "Implementation Phases" table) runs the existing PRD mode unchanged; any other free-text argument enters **description mode**. In description mode the planning, review, and implementation chains operate without a PRD: `plan-writer` plans directly from the description (no Implementation Phases table, no PRD back-fill, flat `<slug>.plan.md` filename, description captured as the plan's source of truth, observable ACs derived from the description); `plan-reviewer` applies a description-mode variant of its PRD-dependent rubric (R8a/R8b/R8c emit `passed:true` with rationale); and `/relay-implement` consumes the resulting plan (P3's PRD-row check is branched, D8 Mutation c becomes a no-op, and `code-reviewer`/`code-reviewer-semantic` cross-reference the plan's derived ACs instead of PRD ACs). This approach was chosen over generating a lightweight PRD under the hood (rejected during this PRD's authoring) because the user wants a true PRD-less path that still flows end-to-end through implementation, not a hidden PRD shim.

## Key Hypothesis

We believe a description-only entrypoint into the relay planning **and implementation** chain will eliminate the friction that today pushes small work into ad-hoc, guideline-less implementation. We'll know we're right when small, well-scoped features are routinely planned (and implemented) via `/relay-plan "<description>"` instead of bypassing relay entirely — with the generated plan passing `plan-reviewer` and being consumable by `/relay-implement` without PRD-shaped HALTs.

## What We're NOT Building

- **A lightweight PRD generated under the hood** — explicitly rejected during authoring (option (a)); description mode never synthesizes a PRD. This is the true PRD-less path.
- **`/relay-execute` integration** — the orchestrator's state machine IS the source PRD's Implementation Phases table (`docs/decisions.md` 2026-05-01 D6); a PRD-less plan has no PRD row to drive it. Description-mode plans are a manual single-stage flow, not orchestrated.
- **Merging or aliasing `/relay-prd` + `/relay-plan`** into a single shortcut command — explicitly out of scope per the 2026-05-15 decision; the two commands stay distinct.
- **A `--no-prd` flag** — dispatch is by input-type detection (mirrors prp-plan); no flag is introduced.
- **A complexity/ambiguity guard** — per the authoring scope decision, description mode always plans from the given text; it does not heuristically recommend authoring a PRD for large features.
- **Importing or extending `prp-core` assets** — `prp-plan` is a behavioral reference only; relay reimplements the behavior in its own assets (`docs/anti-patterns.md`).
- **TDD chain (B7/B8) for description mode** — the `tdd-writer` reads the source PRD's Acceptance Criteria, which a PRD-less plan lacks; MVP supports `tdd: false` target projects only. A description-mode branch for the TDD pair is a future feature.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Small tasks planned via description mode instead of ad-hoc implementation | Majority of small tasks | Manual observation / user-reported usage |
| Description-only plans passing `plan-reviewer` without CHANGES_REQUESTED caused by PRD-orphaned rubric items | 100% (0 false R8 HALTs) | `PRPs/plans/<basename>.review.jsonl` (R8a/R8b/R8c rows = passed) |
| `/relay-implement` consuming a description-only plan without a PRD-shaped precondition HALT | 100% | Absence of P3 HALT; `IMPLEMENTATION_COMPLETE` verdict |
| PRD-mode behavior regression | Identical P1–P4 outcomes, generated filename, `## Source PRD` section, and R1–R8 `review.jsonl` outcomes pre/post (plan-prose variation out of scope) | Comparative dogfood: fixed APPROVED PRD; diff the precondition outcomes + generated filename + `## Source PRD` + `review.jsonl` R1–R8 rows |

## Acceptance Criteria (test scenarios)

- **AC-1 (input-type detection → description mode):** Given a non-empty argument to `/relay-plan` that does not resolve to a `.prd.md` file and does not contain an "Implementation Phases" table, when the command runs Phase 0 detection, then it enters description mode and does NOT HALT on P2 (status APPROVED) or P4 (Implementation Phases table). Given instead an empty or whitespace-only argument, when Phase 0 runs, then the command HALTs (adapted P1 — "non-empty argument"). P3 (Decision Gate sources) is retained in both branches; its evidence is covered by AC-5.
- **AC-2 (input-type detection → PRD mode preserved):** Given an argument that resolves to a readable `.prd.md` file, when the command runs Phase 0 detection, then it enters PRD mode and enforces P1–P4 exactly as today (regression-safe).
- **AC-3 (plan generated without a PRD):** Given a valid free-text description, when description mode runs, then a DRAFT plan is written to `PRPs/plans/<slug>.plan.md` conforming to `plan-template.md`, with the description captured verbatim in the plan's `## Source` section, observable `AC-A<i>` items derived from the description (no `(PRD AC-N)` token), no `## Source PRD` APPROVED reference, and no PRD back-fill attempted.
- **AC-4 (plan-reviewer accepts the PRD-less plan):** Given a description-only DRAFT plan, when `plan-reviewer` runs, then R8a/R8b/R8c emit `passed: true` with an explicit "description-only mode" rationale recorded in `PRPs/plans/<basename>.review.jsonl`, and the plan is not rejected for missing-PRD reasons.
- **AC-5 (Decision Gate preserved in description mode):** Given description mode, when planning, then the Decision Gate consultation over the three P3 sources still runs and the generated plan carries a Decision Gate evidence block.
- **AC-6 (/relay-implement consumes the PRD-less plan):** Given an APPROVED description-only plan at a flat `<slug>.plan.md` with no `## Source PRD`, when `/relay-implement` runs, then (a) the command's P3 "source PRD row N is in-progress" precondition is branched/skipped and the command does not HALT for a missing PRD row, (b) the implementer agent does NOT HALT on the now-absent mandatory source-PRD read, and (c) the implementer does NOT HALT on the filename failing the `<feature>-phase-<N>-<slug>` pattern — it derives its artifact/report paths from the flat basename instead. Verify by the absence of any implementer HALT referencing a PRD path or a filename-pattern error, and the presence of `IMPLEMENTATION_COMPLETE`; the implementer reads the plan's `## Source` description and `AC-A<i>` items as the contract.
- **AC-7 (D8 Mutation c is a no-op for PRD-less plans):** Given an APPROVED description-only plan reaching APPROVED rubric, when `/relay-implement` performs the D8 post-approval mutations, then Mutation a (plan trailing-block flip APPROVED→IMPLEMENTED) and Mutation b (move to `PRPs/plans/completed/`) are performed and Mutation c (source PRD row N flip) is skipped as a documented no-op (no PARTIAL_D8_FAILURE for the absent PRD row).
- **AC-8 (code-reviewer uses plan-derived ACs when no PRD):** Given a description-only plan diff under review, when `code-reviewer` runs, then `PRPs/plans/<basename>.code-review.jsonl` contains no finding citing a missing/absent source PRD, and the AC-traceability rows (R-S3) reference the plan's `AC-A<i>` tokens carrying no `(PRD AC-N)` token; internally the `<prd_acs>` payload handed to `code-reviewer-semantic` is sourced from the plan's `AC-A<i>` items rather than a source PRD.
- **AC-9 (minimum derived AC count):** Given a description-only plan, when `plan-reviewer` runs its description-mode AC check, then it requires at least 3 derived `AC-A<i>` items (R4 parity); a plan with fewer than 3 derived ACs yields `CHANGES_REQUESTED`.

## Open Questions

- [ ] **Dogfood validation of the full happy path:** the no-source-PRD-dependency conclusions for the implement / review / test chain (recorded in the Decisions Log and Architecture Notes) were verified by static reading of the agent contracts, not by an end-to-end run. Validate `plan → implement → test` on a real description-mode feature during dogfood. `TBD - needs validation`.

---

## Users & Context

**Primary User**
- **Who:** The relay developer and plugin users working on small, well-scoped features.
- **Current behavior:** Ask Claude Code to implement directly from a description, losing relay's grounding, Decision Gate, plan-template, and reviewer rubric.
- **Trigger:** A small task arises that does not justify the 6-phase `/relay-prd` flow.
- **Success state:** Run `/relay-plan "<description>"` and get a valid DRAFT plan — and have `/relay-implement` implement it — without ever touching a PRD.

**Job to Be Done**
When I have a small, clear feature, I want to generate a structured plan directly from the description, so I can use relay's rigor (grounding + Decision Gate + plan-reviewer) without paying the cost of authoring a full PRD.

**Non-Users**
- Large or multi-phase features — those keep using `/relay-prd` → the Implementation Phases table.
- The `/relay-execute` orchestrator — it is PRD-table-driven; description-mode plans never enter it.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Phase 0 input-type detection in `/relay-plan` (`.prd.md` path or "Implementation Phases" content → PRD mode; else description mode) | The dispatch mechanism; mirrors prp-plan, no flag |
| Must | Description-mode precondition branch (skip P2 + P4; keep P3 Decision Gate sources; P1 adapted to "non-empty argument") | Removes the PRD requirement without bypassing the Decision Gate |
| Must | `plan-writer` description-only entrypoint (no table parse, no row selection, flat `<slug>.plan.md`, description as `## Source`, derived `AC-A<i>`, no back-fill, "NOT Building" scope section) | Generates a valid PRD-less plan |
| Must | `plan-template` `## Source` generalization (PRD reference OR verbatim description) + description-mode AC format | Plan shape must represent a PRD-less source |
| Must | `plan-reviewer` R8 description-mode variant (R8a/R8b/R8c → passed:true + rationale, recorded) | Prevents false HALTs on PRD-orphaned rubric items |
| Must | `/relay-implement` P3 branch (skip PRD-row check) + D8 Mutation c no-op for PRD-less plans | Lets implementation consume the plan |
| Must | `implementer` source tolerance (read plan `## Source` + `AC-A<i>` when no PRD) **and flat-filename parse tolerance** (derive artifact/report paths from `<slug>.plan.md` with no `-phase-N-` segment) | Implementer contract without a PRD; the flat filename otherwise fails the implementer's `-phase-N-` parse and HALTs |
| Must | `code-reviewer`/`code-reviewer-semantic` AC-source substitution (plan ACs when no PRD) | Review without PRD AC traceability |
| Should | Docs + release: `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugin.json` bump, new `docs/decisions.md` entry superseding the 2026-05-15 "not yet implemented" framing | Surface + release discipline (§7.5 lock-step) |
| Could | Persist the raw description as a lightweight side artifact | Auditability; not needed for MVP |
| Won't | Lightweight-PRD-under-the-hood; `/relay-execute` integration; `--no-prd` flag; `/relay-prd`+`/relay-plan` merge; complexity guard | Explicitly out of scope (see What We're NOT Building) |

### MVP Scope

PRD mode and description mode coexisting. Running `/relay-plan "<text>"` produces a valid DRAFT plan that passes `plan-reviewer`, and `/relay-implement` implements that plan end-to-end without PRD-shaped HALTs. PRD mode remains behaviorally identical (zero regression).

### User Flow

`/relay-plan "<feature description>"` → Phase 0 detection (no `.prd.md`, no phases table → description mode) → grounding + Decision Gate consultation → write `PRPs/plans/<slug>.plan.md` (DRAFT) → handoff to `plan-reviewer` → (after APPROVED) `/relay-implement PRPs/plans/<slug>.plan.md` → implementation in working tree.

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests. (Note: `relay` itself declares `test_frameworks: []`; the contract is validated against target projects, where `tdd` may differ. In MVP, description mode supports `tdd: false` targets only — the TDD pair reads a source PRD's Acceptance Criteria that a PRD-less plan lacks; see What We're NOT Building and Open Questions.)

### Architecture Notes

- **Dispatch by input-type detection** (not a flag) is the central design choice, adapted from `prp-plan` Phase 0 (`plugins/prp-core/commands/prp-plan.md:43-85`). prp-core is a reference only — the behavior is reimplemented in relay's own command file.
- **The plan's `## Source` section becomes the source of truth** for a PRD-less plan: it holds the verbatim description, replacing the `## Source PRD` reference that `plan-reviewer` R8a and `implementer` depend on (`plugins/relay/agents/implementer.md:136-137`).
- **Derived ACs (`AC-A<i>`) replace PRD ACs** as the contract threaded through the chain: `code-reviewer-semantic` receives them as `<prd_acs>` (`plugins/relay/agents/code-reviewer-semantic.md:44-45`) instead of source-PRD excerpts.
- **R8 exemption follows the `phase_type=scaffold` precedent** (`docs/decisions.md` 2026-05-14): the reviewer detects PRD-less plans and emits `passed:true` with rationale rather than skipping the row, preserving the no-short-circuit audit trail in `review.jsonl`.
- **D8 Mutation c no-op**: `/relay-implement` Phase A.4 (`plugins/relay/commands/relay-implement.md:362-369`) skips the source-PRD-row flip for PRD-less plans; Mutations a + b are unchanged. P3 (`relay-implement.md:114-133`) is branched to skip the PRD-row-in-progress check.
- **Flat filename ↔ implementer parse**: the description-mode flat `<slug>.plan.md` does not match the implementer's `<feature>-phase-<N>-<slug>.plan.md` parse (`plugins/relay/agents/implementer.md:163-178`), which today HALTs on mismatch and derives `<feature>`/`<N>` for the `PRPs/reports/<feature>/phase-<N>/attempts/` artifact root. Phase 3 adds a description-mode branch so the implementer derives these paths from the flat basename (e.g., `PRPs/reports/<slug>/attempts/`) instead of HALTing.
- **`plan-reviewer` R-COH-* layer is plan-internal**: only R8a/R8b/R8c read the source PRD (`plugins/relay/agents/plan-reviewer.md:214-232`); every `R-COH-*` check operates on the plan's own `## Acceptance Criteria` (`AC-A<i>`) and tasks (`plan-reviewer.md:278-283`), so the layer works unchanged once the description-mode plan carries derived `AC-A<i>` items. Only R8a/R8b/R8c need the description-mode variant.
- **Test chain has no source-PRD dependency**: `/relay-test` and `post-green-reviewer` (B5) reference only the Test Runner PRD as their own spec and operate over the worktree + plan, not the feature's source PRD — so the test stage works unchanged for description-mode plans (to be confirmed end-to-end in dogfood per Open Questions).
- **`phase_type` needs no PRD**: `plan-writer` infers `phase_type` from the description and Files-to-Change (default `feature`) and `plan-reviewer`'s Phase 0 pre-pass consults it; the inference carries cleanly without a PRD.
- **Worktree slug needs no PRD**: `/relay-worktree` takes a free `<feature-name>` argument (sanitized to a slug) and only derives from a PRD basename when driven by `/relay-execute` (`plugins/relay/commands/relay-worktree.md:66-80`); manual description-mode use works unchanged.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope creep / hallucinated requirements without a PRD scope anchor | M | Mandatory "What We're NOT Building" section in the generated plan; derived ACs bound the contract; grounding strengthened to compensate for the missing anchor |
| R8 / rubric regression silently breaking PRD-mode plans | M | The description-mode branch is strictly gated on PRD-absence; AC-2 + AC-4 cover PRD-mode regression; description outcomes append to rubric[] (never short-circuit) |
| Implementation chain coupling missed (a hidden PRD dependency in implementer/code-reviewer) | M | Phase 3 audits every PRD touch-point identified in research; AC-6/AC-7/AC-8 exercise the full chain |
| Divergence from prp-core if behavior is copied too literally | L | Adapt-don't-import rule; relay's Decision Gate, paths, and rubric have no prp-core equivalent and must be preserved |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Planning entrypoint | `/relay-plan` Phase 0 input-type detection + description-mode precondition branch; `plan-writer` description-only entrypoint | in-progress | - | - | PRPs/plans/relay-plan-prd-less-mode-phase-1-planning-entrypoint.plan.md |
| 2 | Review + template | `plan-template` `## Source` generalization + description-mode AC format; `plan-reviewer` R8 description-mode variant | pending | - | 1 | - |
| 3 | Implementation chain | `/relay-implement` P3 branch + D8 Mutation c no-op; `implementer` source-read tolerance + flat-filename parse tolerance; `code-reviewer`/`code-reviewer-semantic` AC-source substitution | pending | - | 2 | - |
| 4 | Docs + release | api-reference, commands.html, changelog, `plugin.json` bump, new decisions.md entry superseding 2026-05-15 framing | pending | - | 1,2,3 | - |

### Phase Details

**Phase 1: Planning entrypoint**
- **Goal:** `/relay-plan "<text>"` enters description mode and `plan-writer` produces a PRD-less DRAFT plan.
- **Scope:** Phase 0 detection; precondition branch (skip P2/P4, keep P3, adapt P1); `plan-writer` entrypoint (no table parse, flat filename, `## Source` = description, derived `AC-A<i>`, no back-fill, "NOT Building" section).
- **Success signal:** A description-only DRAFT plan exists at `PRPs/plans/<slug>.plan.md` and PRD mode is unchanged.

**Phase 2: Review + template**
- **Goal:** `plan-reviewer` approves a PRD-less plan without PRD-orphaned HALTs.
- **Scope:** `plan-template` `## Source` generalization + description-mode AC format; `plan-reviewer` R8a/R8b/R8c description-mode variant (passed:true + rationale); any R-COH check that reads PRD ACs gets the same branch.
- **Success signal:** `review.jsonl` shows R8 rows as passed with rationale; APPROVED flip occurs.

**Phase 3: Implementation chain**
- **Goal:** `/relay-implement` implements a PRD-less plan end-to-end.
- **Scope:** P3 PRD-row check branched; D8 Mutation c no-op; `implementer` source-read tolerance (no HALT on the absent source-PRD read; reads `## Source` + `AC-A<i>`) **and flat-filename parse tolerance** (derive the `PRPs/reports/<...>/attempts/<i>/` artifact root and the `PRPs/plans/completed/` target from a flat `<slug>.plan.md` that has no `-phase-<N>-` segment, instead of HALTing on the `<feature>-phase-<N>-<slug>` pattern); `code-reviewer`/`code-reviewer-semantic` use plan-derived ACs as `<prd_acs>`.
- **Success signal:** `IMPLEMENTATION_COMPLETE`; Mutations a+b applied, c skipped; no PRD-shaped or filename-pattern HALT.

**Phase 4: Docs + release**
- **Goal:** Surface documented and version cut.
- **Scope:** `docs/api-reference.md`, `documentation/reference/commands.html`, `documentation/changelog.html`, `plugin.json` bump (per 2026-04-30 §7.5 lock-step), new `docs/decisions.md` entry superseding the 2026-05-15 "not yet implemented" framing.
- **Success signal:** Changelog entry + matching `plugin.json` bump; decisions.md records the shipped contract.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Dispatch mechanism | Input-type detection (no flag) | `--no-prd` flag; both | Mirrors prp-plan; zero flags to remember; argument shape is self-describing |
| Lightweight-PRD-under-the-hood | Rejected — true PRD-less path | Generate a hidden PRD then plan | User wants no PRD at all (authoring decision — option (b)); a hidden PRD reintroduces the cost we are removing |
| R8 rubric in description mode | Description-mode variant (passed:true + rationale) | Skip R8 entirely | Follows phase_type=scaffold precedent (2026-05-14); keeps full audit trail; no short-circuit |
| Complexity/ambiguity guard | None | prp-plan-style "recommend a PRD" guard | Per the authoring scope decision: always plan from the given description; simpler and predictable |
| `/relay-implement` consumption | In-scope (full chain) | Out of MVP (plan + review only) | User directive: relay-implement must implement the PRD-less plan |
| Plan filename | Flat `<slug>.plan.md` | `<feature>-phase-N-<slug>.plan.md` | No PRD phase row exists; conscious divergence from the 2026-04-25 per-phase convention for description mode. Consequence: the implementer's `-phase-N-` filename parse needs a description-mode branch (Phase 3, AC-6) |
| TDD chain in description mode | MVP: `tdd: false` targets only; TDD pair branch deferred | Support `tdd: true` now (description-mode TDD branch) | The `tdd-writer` walks source-PRD `AC-N`; a PRD-less plan has no PRD — a TDD branch is its own scope |
| Description-mode slug collision | Numeric suffix `-2`, `-3`, … | Overwrite; HALT on collision | Mirrors the PRD/`prd-writer` collision convention; predictable and non-destructive |
| Minimum derived AC count | Reviewer's description-mode branch enforces ≥3 `AC-A<i>` (R4 parity); `<3` → `CHANGES_REQUESTED` | No floor | A quality floor independent of the (rejected) complexity guard; keeps PRD-less plans testable |
| Idempotency / resumability | None in description mode (accepted); re-run produces a new plan (suffix on collision) | A state machine for description plans | Description mode is a single-shot convenience outside `/relay-execute`; a state machine would be over-engineering |

---

## Research Summary

**Market Context**
`prp-plan` (the upstream design reference) already implements description-only planning via Phase 0 input-type detection: a `.prd.md` path or "Implementation Phases" content routes to PRD mode; any other free text is used directly as the feature description, skipping back-fill and using a flat filename (`https://github.com/Wirasm/PRPs-agentic-eng`; fork detail at `https://github.com/affaan-m/ECC/blob/main/commands/prp-plan.md`). Upstream's intended split: PRD→Plan for large multi-phase features, direct Plan for medium features where immediate implementation is appropriate. Industry analysis flags scope creep and hallucinated requirements as the dominant failure modes of spec-less agentic planning, amplified in cascade across multi-agent pipelines (`https://nimblebrain.ai/why-ai-fails/agent-governance/agent-failure-modes/`); documented mitigations are explicit non-scope boundaries and "ask, don't guess" on ambiguity (`https://www.coderabbit.ai/guides/agentic-sdlc`). The mandatory "What We're NOT Building" section in the generated plan is relay's adaptation of that mitigation.

**Technical Context**
Codebase research mapped every PRD coupling point the description mode must replace: `/relay-plan` preconditions P2 (status APPROVED) + P4 (Implementation Phases table) (`plugins/relay/commands/relay-plan.md:84-148`); `plan-writer` Phase 1 filename derivation from PRD basename + row N and Phase 5 PRD back-fill (`plugins/relay/agents/plan-writer.md:164-179`, `:485-499`); `plan-reviewer` R8a/R8b/R8c, all assuming a source PRD (`plugins/relay/agents/plan-reviewer.md:210-238`); `plan-template` `## Source PRD` section #1 (`docs/context/plan-template.md:115-123`) and the `**AC-A<i> (PRD AC-<N>):**` AC format (`docs/context/plan-template.md:209-213`); the `phase_type` metadata is defined/inferred in `plan-writer` (`plugins/relay/agents/plan-writer.md:362-377`) and consumed by `plan-reviewer` Phase 0, not in the template; `/relay-implement` P3 PRD-row-in-progress check (`plugins/relay/commands/relay-implement.md:114-133`) and D8 Mutation c (`:362-369`); `implementer` source-PRD read for AC traceability (`plugins/relay/agents/implementer.md:136-194`); `code-reviewer-semantic` `<prd_acs>` payload (`plugins/relay/agents/code-reviewer-semantic.md:44-45`). The upstream `prp-plan` (`plugins/prp-core/commands/prp-plan.md:43-85`, `:697-706`) confirms the description path skips back-fill and uses a flat filename — the design reference for relay's adaptation. Gaps: the current template has no PRD-less alternative for the AC back-reference format, the per-phase filename convention, or the R8c filename→row check — each requires a new branch this PRD authorizes.

---

*Generated: 2026-06-16*
*Approved: 2026-06-16*
*Status: APPROVED*
