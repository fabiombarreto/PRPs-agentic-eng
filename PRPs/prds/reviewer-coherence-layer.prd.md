# Reviewer Coherence Layer

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting patterns (three reviewer agents touched simultaneously); reuse/extension of existing components (additive rubric layer on prd-reviewer / plan-reviewer / code-reviewer); impact on the autonomous-portion contract (CHANGES_REQUESTED terminality preserved); impact on shared documentation surface (`documentation/` site + `docs/context/*-template.md`); creation of a new sub-agent (`code-reviewer-semantic`) and a new context file (`docs/context/code-review-registries.md`)
- Decisions found:
  - 2026-04-19 Interactivity boundary: PRD interactive, downstream autonomous — `plan-reviewer` and `code-reviewer` MUST remain non-interactive even with the new coherence layer; `prd-reviewer` keeps its dialog-on-approval behavior.
  - 2026-04-19 Command surface (writer/reviewer split) — reviewers must keep working on hand-edited artifacts; coherence checks cannot assume writer-produced state.
  - 2026-04-19 PRD template is a fork of `prp-core/commands/prp-prd.md` — the existing R1–R7 / R1–R8 / R-S/L/SEM/X rubric shapes are contract; new IDs MUST coexist without renumbering.
  - 2026-04-25 Plan filenames carry phase number + slug — `plan-reviewer` R8c lineage rule is the closest precedent and must keep working.
  - 2026-04-19 PRP artifacts under `PRPs/` (never `.claude/`) — review logs (`*.review.jsonl`, `*.code-review.jsonl`) keep their existing paths; dogfood report at `PRPs/reports/<feature>/dogfood.md`.
- Applicable anti-patterns:
  - "Weakening or deleting tests" — code-reviewer R-X guard MUST NOT be weakened by the new layer; coherence layer never modifies tests.
  - "Writing pipeline artifacts under `.claude/`" — coherence-layer outputs (extra JSONL rows, dogfood report, registries config) live under `PRPs/` and `docs/context/`, never `.claude/`.
  - "Relying on interactive permission prompts in the autonomous loop" — code-reviewer's new checks may only use Read/Grep/Glob and read-only Bash; no Edit, no destructive bash; sub-agent inherits the same restriction.
- Applicable architectural rules:
  - Interactivity boundary at PRD approval (`docs/context/architecture.md` §Interactivity boundary).
  - Writer/Reviewer split with reviewer accepting hand-edited input (`docs/context/architecture.md` §Command surface).
  - PRP artifact paths under `PRPs/`, not `.claude/` (`docs/context/architecture.md` §PRP artifact paths).
- Result: PROCEED
```

## Problem Statement

The three relay reviewer agents (`prd-reviewer`, `plan-reviewer`, `code-reviewer`) gate the autonomous portion of the pipeline but currently only verify **structural conformance** to a template (PRD/plan) or **vertical alignment** to upstream artifacts (code vs. plan/PRD). None of them detects **internal contradictions within the artifact under review** — ACs that contradict each other in prose, plan tasks that don't map to any AC, code with dead imports / signature drift / new files unregistered in expected indexes / comments contradicting the code below them. These defects survive review and surface only when the Test Runner happens to break (subset that hits assertions) or when a human reviews the final PR — exactly the rework the post-PRD autonomous pipeline exists to prevent.

## Evidence

- `prd-reviewer.md:343-346` Out-of-scope block: *"Semantic critique of the product idea. You validate structural conformance and TBD discipline — not whether the feature is a good idea."* Coherence is neither structural nor product-merit; it falls in the gap.
- `plan-reviewer.md:499-501` Out-of-scope block: *"Semantic critique of the plan's implementation strategy. You validate structural conformance, traceability, and TDD routing — not whether the plan is a good engineering approach."* Same gap.
- `code-reviewer.md:297-315` R-SEM scope: *"Semantic review of the diff (business-rule consistency, bugs, security gaps). This is the primary value layer per D4 of the source PRD..."* — checks **vertical** alignment (diff faithful to plan), not **horizontal** coherence (intra-diff consistency, drift, registry presence).
- `documentation/concepts/pipeline.html:84` describes the Code Reviewer as "focuses on correctness + rule violations" — the doc-as-contract claim already promises what only structural rules deliver today.
- `plan-reviewer.md:205-233` R8 (PRD↔plan traceability) is the **only** intra-artifact consistency precedent in the codebase. R8b cross-checks that every plan AC reference resolves to a real PRD AC; R8c cross-checks that the plan filename's phase number matches the PRD's Implementation Phases row. The pattern is proven and bounded — it just hasn't been generalized.
- Empirical bug correlation (arXiv 2024, "Investigating the Impact of Code Comment Inconsistency on Bug Introducing"): comment-vs-code mismatch is a statistically significant predictor of bug-introducing changes — confirms that coherence defects map to real downstream cost.

## Proposed Solution

Add an **additive coherence layer** (`R-COH-*` rubric IDs with descriptive names) to each of the three reviewer agents. The layer runs **after** the existing structural rubric passes (or alongside it in the JSONL — same `rubric[]` array, new rows). Each layer is composed of (a) **deterministic checks** (regex / parsed tables / `ast-grep` / cross-reference validation) inline within the agent for the classes detectable mechanically, plus (b) a **bounded LLM judgment pass** (cap K=5 issues per run, evidence-required) for classes that need cross-section semantic reasoning. For the `code-reviewer`, the K=5 pass moves to a dedicated sub-agent (`code-reviewer-semantic`) invoked via `Task` to keep the parent's prompt budget under control; a dedicated check verifies the diff doesn't contradict the literal task description from the source plan. The existing rubrics (R1–R7, R1–R8, R-S/R-L/R-SEM/R-X) are not modified — the layer is purely additive. Validation against industry benchmarks (Graphite/Codeant: 5–15% FP for production AI code review; Codeant: <10% baseline) means dogfood gates release at ≤25% FP per reviewer (MVP threshold) with ≤10% as a future cement target.

## Key Hypothesis

We believe an additive coherence layer (`R-COH-*`) on the three reviewers — composed of deterministic checks for the brief's mechanically-detectable classes plus a bounded K=5 LLM judgment pass per reviewer plus a dedicated "code contradicts task" check on the `code-reviewer` — will reduce the volume of intra-artifact coherence defects that escape the reviewers and only surface in the Test Runner or in human PR review, for relay operators running the post-PRD autonomous pipeline.

We'll know we're right when (MVP) dogfood scoped to ≥3 artifacts per reviewer surfaces ≥1 true positive per reviewer (proving the layer catches real defects the structural rubric let through) AND false positive rate stays ≤25% per reviewer; and (cement, future) after N real production runs the FP rate converges to ≤10%, aligning with industry benchmark.

## What We're NOT Building

- **Validation of product/strategy merit** — humans still own that during the interactive PRD phase; the existing Out-of-scope blocks of `prd-reviewer` and `plan-reviewer` are preserved verbatim.
- **Modifications to the existing rubrics (R1–R7, R1–R8, R-S/R-L/R-SEM/R-X)** — explicit invariant of the brief; the new layer is purely additive.
- **Dialog in `plan-reviewer` or `code-reviewer`** — interactivity boundary is contract; both stay autonomous with `CHANGES_REQUESTED` terminal.
- **Schema changes to `*.review.jsonl` / `*.code-review.jsonl` beyond accommodating new IDs** — the schema's `rubric[]` array already accepts arbitrary `{id, passed, reason?}` rows; no new outcome states (no "indeterminate"), no new top-level fields.
- **Checks that require running the code (tests, integration, e2e)** — Test Runner / post-green-reviewer territory.
- **Subjective clean-code / refactor critique** — coherence ≠ "pretty code".
- **Repo-wide drift terminology detection** — limited to intra-diff + 1-hop imports; deeper sweep would need state-of-the-art tooling not yet shipping in production.
- **Reopening already-APPROVED PRDs to regenerate them with the new layer** — explicit out-of-scope of the brief; manual hand-edit remains the escape hatch.
- **Shadow mode (non-blocking layer for N runs before flip to blocking)** — breaks `CHANGES_REQUESTED` terminality invariant.
- **Verification-script pattern (CodeRabbit-style: LLM generates a shell script to confirm an assumption)** — incompatible with the `code-reviewer`'s read-only Bash restriction (D11 of `implementation-authoring.prd.md`); registered as Alternative Considered in Decisions Log.
- **Automated FP-rate telemetry in MVP** — manual triage suffices for cement reassess; future `/relay-coherence-stats` command deferred to its own PRD (Open Questions).

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| FP rate per reviewer in dogfood (M1 — primary) | ≤25% per reviewer (MVP gate); ≤10% cement target post-N runs | Manual TP/FP classification in `PRPs/reports/<feature>/dogfood.md`, sample ≥3 artifacts per reviewer (≥2 real diffs + ≥1 synthetic for code-reviewer, reported separately) |
| True positives caught in already-APPROVED artifacts (M2 — primary) | ≥1 per reviewer | Same TP/FP classification as M1 |
| Coverage of brief's deterministic classes (M3 — secondary) | 100% of the 14 deterministic classes mapped in Q1 of the authoring session | Checklist in PR description matching deterministic-class list to implemented checks |
| Doc-as-contract alignment (M4 — secondary) | `pipeline.html` declares "structural + coherence" for all three reviewer stages without overclaiming | Inspection of `documentation/concepts/pipeline.html` diff in PR |

## Acceptance Criteria (test scenarios)

Mandatory. Each criterion is an observable scenario the resulting code must satisfy. With `tdd: false` in `docs/context/methodology.md`, these seed the tests the Implementer produces.

- **AC-1 prd-reviewer rubric preserved + extended:** Given a valid PRD where R1–R7 all evaluate `passed: true`, when `/relay-prd-review` runs, then the resulting `PRPs/prds/<basename>.review.jsonl` contains R1–R7 rows in their existing format AND ≥1 new `R-COH-*` row (any `passed` value depending on artifact content); the textual definition of R1–R7 inside `plugins/relay/agents/prd-reviewer.md` is unchanged (verifiable via `git diff`).
- **AC-2 plan-reviewer rubric preserved + extended:** Given a valid plan where R1–R8 all evaluate `passed: true`, when `/relay-plan-review` runs, then the resulting `PRPs/plans/<basename>.review.jsonl` contains R1–R8 rows (including R8a/R8b/R8c) in their existing format AND ≥1 new `R-COH-*` row; the textual definition of R1–R8 inside `plugins/relay/agents/plan-reviewer.md` is unchanged.
- **AC-3 code-reviewer rubric preserved + extended:** Given a valid diff where R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X all evaluate `passed: true`, when `/relay-code-review` runs, then the resulting `PRPs/plans/<basename>.code-review.jsonl` contains all existing rows in their existing format AND ≥1 new `R-COH-*` row whose origin includes at least one row sourced from the `code-reviewer-semantic` sub-agent return; the textual definition of R-S/R-L/R-SEM/R-X inside `plugins/relay/agents/code-reviewer.md` is unchanged.
- **AC-4 interactivity boundary preserved:** Given any `R-COH-*` row evaluates `passed: false` in `plan-reviewer` or `code-reviewer`, when the reviewer terminates, then `verdict` is `CHANGES_REQUESTED` and the agent does NOT enter a dialog turn (terminal). Given the same in `prd-reviewer`, the existing interactive dialog-on-approval behavior is unchanged.
- **AC-5 read-only philosophy preserved in code-reviewer:** Given the coherence layer runs in `code-reviewer`, when the agent executes, then no `Edit` tool call is made AND every `Bash` invocation matches a read-only pattern (lint, type-check report mode, `ast-grep`, `git diff`, `grep`); the `code-reviewer-semantic` sub-agent has the same restriction declared in its frontmatter.
- **AC-6 dogfood report exists with thresholds met:** Given Phase 4 is complete, when `PRPs/reports/<feature>/dogfood.md` is read, then it contains a "Real-world dogfood" section listing ≥3 PRDs / ≥3 plans / ≥2 real code diffs (each finding classified TP/FP with evidence), a "Regression fixtures" section with ≥1 synthetic diff exercising specific `R-COH-*` checks (with expected outcomes), AND the headline FP rate per reviewer (computed only over real-world artifacts) is ≤25% per reviewer AND ≥1 TP per reviewer.
- **AC-7 docs synced (regra dos 3 arquivos do AGENTS.md):** Given any of Phases 1/2/3 is complete, when its diff is inspected, then `documentation/reference/agents.html` (corresponding reviewer section), `documentation/concepts/pipeline.html` (corresponding stage description), and `documentation/changelog.html` (new entry per phase) are updated; AND when Phase 1 is complete, `documentation/guide/writing-a-prd.html` reflects the new prd-reviewer scope.
- **AC-8 registry allowlist functional:** Given a diff that creates a new file under `plugins/relay/agents/` AND fails to register it in any of the 4 default-relay registry paths declared in `docs/context/code-review-registries.md`, when `code-reviewer` runs, then the `R-COH-REGISTRY-MISSING` row has `passed: false` and its `reason` cites each missing registry by path. Given a target project with no `docs/context/code-review-registries.md`, when `code-reviewer` runs, then no `R-COH-REGISTRY-MISSING` row is emitted (silent degradation, not failure).
- **AC-9 sub-agent token budget bounded:** Given a diff of any size, when `code-reviewer-semantic` is invoked via `Task`, then it receives the diff content as part of the parent's prompt (no re-Read via Bash) AND returns a structured list of at most 5 issues, each shaped `{id, passed, reason, file, line}`; if the sub-agent return is unparseable, the parent emits a row `R-COH-SEMANTIC-DEGRADED: passed: true` with reason "sub-agent returned unparseable output" and continues (does not halt the review).
- **AC-10 intra-repo scope bounded for code-reviewer:** Given the coherence layer runs in `code-reviewer`, when it Reads files outside the diff, then the total of such Reads is ≤ 10 first-degree imports per check + ≤ 5 paths from the registry allowlist; no other files are Read by the coherence layer.

## Open Questions

- [ ] **Telemetry of FP rate across real runs** — designed as future `/relay-coherence-stats` command (or script) that aggregates `R-COH-*` outcomes across `PRPs/**/*.review.jsonl` and `PRPs/**/*.code-review.jsonl`. Deferred to its own PRD when cement reassess (≤10% target) is needed; not MVP.
- [ ] **Sample size scale-up** — ≥3 real artifacts per reviewer is a starting point. If dogfood headline FP rate clusters near 25% (boundary), rerun with larger sample before cement; threshold for "rerun needed" not yet defined.
- [ ] **Drift terminology fast-follow** — if Phase 4 dogfood shows the K=5 pass repeatedly catches naming-drift TPs, promote drift terminology to its own deterministic rule in v2 with a tighter scope (1 hop confirmed; 2-hop or registry-cross-reference TBD).
- [ ] **Synthetic regression fixture format** — the structure of "Regression fixtures" section in `dogfood.md` (per-check fixture vs. multi-check diff) is a Phase 4 implementation decision; impacts maintainability if checks evolve.

---

## Users & Context

**Primary User**
- **Who:** `relay` operator running the post-PRD autonomous pipeline. Anchor persona: the user (`fabiombarreto`); generalizes to any future `relay` adopter invoking `/relay-execute` or its sub-commands (`/relay-plan-review`, `/relay-code-review`).
- **Current behavior:** trusts the three reviewer agents as terminal gates. Discovers coherence defects later — when `test-runner` breaks on the subset of defects that hit assertions, or when reviewing the final PR on GitHub. The cost is rework cascading across stages.
- **Trigger:** running the autonomous portion of the pipeline (post-PRD) and the relevant reviewer emits `APPROVED` (or `CHANGES_REQUESTED` on structural-only grounds).
- **Success state:** the reviewer captures intra-artifact contradictions at review time, not in human PR review. The coherence layer becomes the **third filter** (structural → coherence → test-runner) instead of the test-runner being the only filter past structural.

**Job to Be Done**
When I run the autonomous portion of the relay pipeline (post-PRD), I want the reviewer agents to detect internal contradictions within the artifact under review — not just template conformance — so I don't absorb cascading rework from defects discovered later by the test-runner or by my own human review of the PR.

**Non-Users**
- Humans evaluating product/strategy merit — that decision still happens during the interactive PRD phase; the layer does not invade.
- The Test Runner and post-green-reviewer — coherence ≠ test-green; the layer is complementary, not a replacement.
- Reviewers in external platforms (GitHub Actions, Linear) — scope is the relay-internal pipeline; external integration is separate.
- Adopters whose target projects lack a context (`methodology.md`, `architecture.md`) — the layer degrades to "intra-artifact only, no registry checks" silently, not a hard failure; but it is not designed for the no-context-builder case.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | `R-COH-*` additive layer in `prd-reviewer` (deterministic + K=5 LLM inline) | Brief base item; no feature without it |
| Must | `R-COH-*` additive layer in `plan-reviewer` (R8 extension + K=5 LLM inline) | Idem |
| Must | `R-COH-*` additive layer in `code-reviewer` (deterministic intra-diff inline + sub-agent `code-reviewer-semantic` for K=5 + dedicated "code contradicts task" check) | Idem |
| Must | `Task` added to `tools:` of `code-reviewer`; new decision recorded in this PRD's Decisions Log | Required for Q2 Option C; divergence from D11 of `implementation-authoring.prd.md` registered |
| Must | Registry allowlist file (`docs/context/code-review-registries.md`) with default relay 4-path list | Required for Q4 Option C |
| Must | Cap M=10 first-degree imports + intra-diff scope for terminology drift in code-reviewer | Required for Q4 Option C |
| Must | Dogfood report at `PRPs/reports/<feature>/dogfood.md` with FP ≤25% per reviewer | Q3 closed; M1 + M2 |
| Must | Sync of canonical docs (`pipeline.html`, `reference/agents.html`, `guide/writing-a-prd.html`, `changelog.html`) | Three-file rule of `documentation/AGENTS.md` |
| Should | Note in `docs/context/prd-template.md` and `docs/context/plan-template.md` mentioning the new checks | Doc-as-contract; helps future writers |
| Should | Cement target ≤10% FP as post-MVP reassess trigger | Aligns with industry benchmark without blocking release |
| Could | FP-rate telemetry in real runs (aggregation across JSONLs) | Inputs the cement target; low cost if implemented as read-only script |
| Won't (MVP) | Repo-wide terminology drift (beyond 1 hop of imports) | Not state-of-the-art in production tooling |
| Won't (MVP) | CodeRabbit-style verification-script pattern | Conflicts with read-only Bash invariant (D11) |
| Won't (MVP) | Reopening APPROVED PRDs to regenerate with new layer | Explicit out-of-scope of brief |
| Won't (MVP) | Shadow mode (non-blocking layer for N runs) | Breaks "CHANGES_REQUESTED terminal" invariant |
| Won't (MVP) | Modification of existing rubric IDs (R1–R7, R1–R8, R-S/L/SEM/X) | Explicit out-of-scope of brief |

### MVP Scope

The three reviewers receive a working `R-COH-*` layer; dogfood report demonstrates FP ≤25% AND ≥1 TP per reviewer; canonical docs synced. Without all three, the hypothesis is unfalsifiable.

### User Flow

```
Operator runs /relay-* (or /relay-execute)
  ↓
Reviewer agent [prd-reviewer | plan-reviewer | code-reviewer]
  ├─ existing structural layer (R1-R7 / R1-R8 / R-S/L/SEM/X) — runs as today
  └─ new coherence layer R-COH-*
      ├─ deterministic checks inline (regex / ast-grep / grep / Read on allowlist)
      ├─ K=5 LLM pass (inline for PRD/plan; sub-agent for code-reviewer)
      └─ [code-reviewer only] dedicated check "code contradicts task in source plan"
  ↓
JSONL written with deterministic rows + new R-COH-* rows in the same rubric[] array
  ↓
verdict: APPROVED if full rubric passed; CHANGES_REQUESTED with failing rows (including R-COH-*)
  ↓
[on CHANGES_REQUESTED] operator edits artifact → reruns /relay-*-review (writer/reviewer split preserved)
```

---

## Technical Approach

**Feasibility:** HIGH

Justification: the JSONL schema already accommodates new IDs in the `rubric[]` array (no schema change); sub-agent invocation via `Task` has direct precedent in `prd-writer` (parallel `research-web` + `research-codebase` calls); the R8 traceability of `plan-reviewer` is concrete intra-artifact-consistency precedent; adding `Task` to `code-reviewer` is a trivial frontmatter change; industry benchmarks (Codeant, Graphite) confirm the category is viable in production. The only element without direct precedent is the `code-reviewer-semantic` sub-agent receiving the diff via prompt (not via re-Read) — this is a Phase 3 implementation detail, not an architectural risk.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Architecture Notes

- **Layer placement:** the coherence layer runs in the same agent process as the structural rubric. Output rows append to the same `rubric[]` array of the same JSONL — single writer per reviewer, no merge logic.
- **Sub-agent contract for `code-reviewer-semantic`:** parent passes `{diff_content, plan_task_text, prd_ac_section}` via prompt; sub-agent returns a JSON list of at most 5 `{id, passed, reason, file, line}` objects. Parent merges the list into its own JSONL emission and writes once. Re-reading the diff inside the sub-agent is forbidden by the contract — the parent already paid that cost.
- **Registry allowlist source-of-truth:** `docs/context/code-review-registries.md` (project-level, regenerable by `context-builder` `*update`). Default for relay declared in this PRD; default for new target projects is empty (silent no-op).
- **Naming convention for IDs:** descriptive prefixed (e.g., `R-COH-AC-CONTRADICT`, `R-COH-DEAD-IMPORT`, `R-COH-REGISTRY-MISSING`, `R-COH-COMMENT-MISMATCH`, `R-COH-CALLER-DRIFT`, `R-COH-CONFIG-DANGLING`, `R-COH-TEST-NAME-LIES`, `R-COH-TASK-CONTRADICTION`, `R-COH-SEMANTIC-DEGRADED`). Final list fixed during Phase 1.
- **K=5 LLM prompt discipline:** the prompt MUST require `file:line` evidence per bullet AND explicitly tell the model NOT to pad to K=5 when fewer real issues exist (acceptable to return 0 bullets).
- **Dogfood report layout:** two sections — "Real-world dogfood" (FP rate computed only over this) and "Regression fixtures" (synthetic diffs documented as such, separate accounting).

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| K=5 LLM pass produces run-to-run variance (LLM non-determinism) | High | Prompt cap K=5 explicit; require `file:line` evidence per bullet; accept up to 1 issue variance per run as natural noise; document as characteristic, not bug |
| Dogfood sample (≥3 artifacts) is statistically thin | Medium | Cement target ≤10% post-N real runs (Should-item); MVP threshold ≤25% acknowledges the limitation; OQ tracks scale-up |
| Adding `Task` to `code-reviewer` violates the spirit of D11 of `implementation-authoring.prd.md` | Medium | Register as new decision (D9 below) in this PRD's Decisions Log; confirm sub-agent is also read-only over the repo (no Edit, no destructive Bash) |
| Code-reviewer token budget exceeds when diff + 10 imports + 5 registries + sub-agent all demand context | Medium | Cap M=10 imports + ≤5 registries hard-coded; sub-agent receives diff via prompt (no re-Read); halt-and-emit-`R-COH-SEMANTIC-DEGRADED` if sub-agent return is unparseable |
| Default-relay registry allowlist ages when `documentation/` structure changes | Low | Allowlist is declarative; `context-builder` `*update` regenerates; smoke-test note in `docs/context/code-review-registries.md` |
| Terminology drift even with 1-hop scope produces too many FPs | Low | Drift terminology limited to K=5 LLM pass (not deterministic rule); if FP > 25% in dogfood, class becomes Won't fast-follow |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | prd-reviewer coherence | Implement `R-COH-*` in `prd-reviewer` (deterministic + K=5 inline). Sync prd-reviewer docs in `documentation/`. Fix the final descriptive ID list and reuse it in subsequent phases. | complete | - | - | PRPs/plans/completed/reviewer-coherence-layer-phase-1-prd-reviewer-coherence.plan.md |
| 2 | plan-reviewer coherence | Implement `R-COH-*` in `plan-reviewer` (R8-pattern extension + K=5 inline). Sync docs. | complete | - | 1 | PRPs/plans/completed/reviewer-coherence-layer-phase-2-plan-reviewer-coherence.plan.md |
| 3 | code-reviewer coherence + sub-agent | Add `Task` to `code-reviewer` `tools:`; create sub-agent `code-reviewer-semantic`; implement deterministic intra-diff checks + 1-hop imports + registry allowlist; dedicated "code contradicts task" check; create `docs/context/code-review-registries.md` with default-relay list; sync docs. | complete | - | 2 | PRPs/plans/completed/reviewer-coherence-layer-phase-3-code-reviewer-coherence-sub-agent.plan.md |
| 4 | Dogfood validation + cement | Run all three reviewers against ≥3 APPROVED artifacts per reviewer (≥2 real diffs + ≥1 synthetic for code-reviewer); classify TP/FP; write `PRPs/reports/<feature>/dogfood.md`; iterate on rules if FP > 25%; finalize doc-as-contract sync. | complete | - | 3 | PRPs/plans/completed/reviewer-coherence-layer-phase-4-dogfood-validation-cement.plan.md |

### Phase Details

**Phase 1: prd-reviewer coherence**
- **Goal:** establish the additive `R-COH-*` pattern on the smallest reviewer (PRD `.md` is the smallest artifact).
- **Scope:** new section in `plugins/relay/agents/prd-reviewer.md` defining each `R-COH-*` ID; deterministic checks (number consistency between table and prose, internal cross-references resolve, no broken section links); K=5 LLM pass inline; JSONL emission extended to include new rows; `documentation/reference/agents.html`, `documentation/concepts/pipeline.html`, `documentation/guide/writing-a-prd.html`, `documentation/changelog.html` updated.
- **Success signal:** `/relay-prd-review` against an existing APPROVED PRD emits the new rows with deterministic checks passing AND K=5 returning 0–5 well-formed issues.

**Phase 2: plan-reviewer coherence**
- **Goal:** apply the Phase 1 pattern to `plan-reviewer`, extending R8 traceability with intra-plan checks.
- **Scope:** new section in `plugins/relay/agents/plan-reviewer.md`; deterministic checks (tasks list ACs that exist; Files-to-Change lists files some task touches; VALIDATE commands match `methodology.md` declared frameworks; Patterns-to-Mirror SOURCE paths exist; Mandatory Reading paths exist); K=5 LLM pass inline; docs synced.
- **Success signal:** `/relay-plan-review` against an existing APPROVED plan emits the new rows; existing R1–R8 unchanged.

**Phase 3: code-reviewer coherence + sub-agent**
- **Goal:** apply the pattern to `code-reviewer`, factoring the K=5 pass to a sub-agent, plus the dedicated "code contradicts task" check.
- **Scope:** add `Task` to `tools:` of `code-reviewer.md`; create `plugins/relay/agents/code-reviewer-semantic.md` (read-only frontmatter, sub-agent prompt for K=5); implement deterministic intra-diff checks (lint/`ast-grep`/grep on diff content), 1-hop imports (M=10 cap), registry allowlist (≤5 paths), dedicated `R-COH-TASK-CONTRADICTION` check; create `docs/context/code-review-registries.md` with default-relay 4-path frontmatter; docs synced (including new sub-agent listed under `documentation/reference/agents.html`).
- **Success signal:** `/relay-code-review` against an existing completed plan diff emits new rows with sub-agent invocation visible in execution; verdict matches expected (APPROVED for clean diffs, CHANGES_REQUESTED for diffs with seeded coherence defects).

**Phase 4: Dogfood validation + cement**
- **Goal:** prove the layer is calibrated before cementing as contract.
- **Scope:** run each reviewer against the sample (≥3 PRDs from `PRPs/prds/`, ≥3 plans from `PRPs/plans/completed/`, ≥2 real diffs + ≥1 synthetic for code-reviewer); produce `PRPs/reports/<feature>/dogfood.md` with two sections (Real-world / Regression fixtures); classify each finding TP/FP with evidence; if FP > 25% per any reviewer, iterate on Phase 1/2/3 rules and rerun dogfood. Final commit to merge.
- **Success signal:** AC-6 satisfied — FP ≤25% per reviewer in Real-world section, ≥1 TP per reviewer.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| D1 — Coverage strategy | Deterministic checks for ~14 mechanically-detectable classes + bounded K=5 LLM pass per reviewer + dedicated "code contradicts task" check on code-reviewer | (A) Deterministic-only, semantic in fast-follow; (B) Semantic from MVP with no cap; (D) verification-script pattern (CodeRabbit-style) | Deterministic covers 60% of brief classes with bounded budget; K=5 LLM provides safety net for the semantic 40% with bounded cost; dedicated task-contradiction check carves out the strongest semantic case where K=5 generic pass is too weak |
| D2 — Layer architecture | `prd-reviewer` and `plan-reviewer` inline; `code-reviewer` inline for deterministic + sub-agent `code-reviewer-semantic` for K=5 | (A) All inline; (B) All sub-agent; (D) shared `coherence-semantic-judge` sub-agent for all three | Concentrates sub-agent complexity where token budget actually pressures (code-reviewer); PRD/plan reviewers stay simple; sub-agent code-reviewer-semantic gets focused attention vs. tucked into a long prompt; testability where it matters most (code-reviewer has the most variable output) |
| D3 — Validation strategy | Dogfood scoped sample ≥3 per reviewer (≥2 real + ≥1 synthetic for code-reviewer, separate accounting); FP threshold ≤25% MVP, ≤10% cement target | (A) No dogfood; (B) Run against all APPROVED artifacts; (D) shadow mode in production; (E) preempt during PRD authoring | A is negligent when sample exists; B is disproportionate work; D breaks `CHANGES_REQUESTED` terminality invariant; ≤25% MVP threshold is honest acknowledgment of small sample, ≤10% cement aligns with industry (Graphite/Codeant: 5–15% range, <10% baseline) |
| D4 — Code-reviewer scope | Diff + first-degree imports (M=10 cap) + registry allowlist (≤5 paths from `docs/context/code-review-registries.md`); intra-diff scope for terminology drift | (A) Diff only; (B) Diff + imports without registries; (D) bounded grep for callers across repo with per-check Read cap; (E) lazy widening per-check with global hard-cap | A loses registry checks (the only class that genuinely needs outside-diff). D conflicts with JSONL schema invariant ("no indeterminate state"). C provides bounded, predictable budget (≤15 extra Reads) covering the necessary class |
| D5 — ID naming convention | Descriptive prefixed: `R-COH-AC-CONTRADICT`, `R-COH-DEAD-IMPORT`, `R-COH-REGISTRY-MISSING`, etc. | (A) Numeric extension of existing series; (B) `R-COH-N` numeric uniform; (D) numeric ID with descriptive name in `reason` | code-reviewer already mixes `R-SEM`/`R-X` (descriptive prefixes are precedent); dogfood report becomes self-documenting; cross-log grep by class becomes trivial; numeric IDs suffer from drift if checks are deprecated |
| D6 — Registry allowlist location | Dedicated file `docs/context/code-review-registries.md` (frontmatter list + prose) | (A) Hardcoded in agent; (B) New key in `methodology.md`; (D) Section inside `architecture.md` | Allowlist is project-level data (varies per target); A impossibilises that variation. `methodology.md` mixes concerns (B). `architecture.md` is high-altitude prose (D). C reuses the `methodology.md` pattern (frontmatter + prose) isolated by concern; default empty for target projects without registries (silent no-op, not failure) |
| D7 — Code-reviewer dogfood composition | ≥2 real diffs + ≥1 synthetic regression fixture, reported in two separate sections of `dogfood.md` | (A) Reduce sample to 2 only; (B) Synthesize a third diff to reach 3; (C) Wait for next `/relay-execute` completion; (D) Use in-progress non-APPROVED branches | Real sample ≥2 is the maximum currently available (`PRPs/plans/completed/` has 2). Synthetic fixture validates determinism without contaminating FP rate. Separate sections preserve epistemic honesty (FP rate computed only on real diffs) |
| D8 — Telemetry strategy | No automatic telemetry in MVP; future `/relay-coherence-stats` aggregator deferred to its own PRD | (B) Aggregate `dogfood_log.jsonl`; (C) Schema row addition (rejected — out-of-scope of brief); (D) External script | Telemetry is non-essential for MVP; cement reassess can be triggered manually. (D) is the right design when promoted because it preserves single-source-of-truth per JSONL — but its full design (command name, output format, trigger) is its own PRD |
| D9 — code-reviewer gains `Task` tool (divergence from D11 of `implementation-authoring.prd.md`) | Add `Task` to `code-reviewer` `tools:` to enable sub-agent invocation | Keep D11 strict and force inline (would mean Q2 Option A) | D11's spirit is "read-only over the repo" — preserved by `Task` (sub-agent inherits read-only). D11's letter excluded `Task` because no use case existed; this PRD provides one. Recorded here as conscious divergence; `code-reviewer-semantic` sub-agent declared read-only in its frontmatter to maintain spirit |
| D10 — Verification-script pattern (CodeRabbit-style) explicitly rejected | Not adopted | Adopt: LLM generates a shell script to verify a coherence assumption | Conflicts with read-only Bash invariant of code-reviewer (D11). Adds dynamic exec to pipeline = exactly what D11 avoids. Increases token budget per run. Recorded as Alternative Considered for posterity |

---

## Research Summary

**Market Context**

- AI-driven code review tools split deterministic checks from LLM judgment in production: CodeRabbit runs linters/security analyzers as a deterministic first pass, then uses LLM reasoning only for semantic judgment, with a verification-script generation step before posting comments (https://www.coderabbit.ai/blog/how-coderabbit-delivers-accurate-ai-code-reviews-on-massive-codebases). The deterministic-first pattern matches D1.
- Industry false-positive thresholds for AI code review converge at 5–15%: Graphite explicitly cites this range with high-quality tools at 5–8% (https://graphite.com/guides/ai-code-review-false-positives); Codeant places <10% as the acceptable baseline and <5% for high-throughput teams, with first-week-vs-third-month accuracy ramps implying calibration periods (https://www.codeant.ai/blogs/ai-code-review-false-positives). The MVP threshold of ≤25% is intentionally generous for a new layer with thin sample; cement target ≤10% aligns with the published baseline.
- Greptile's 2025 benchmark of five AI review tools across 50 PRs measures catch rate (82% overall, 100% on high-severity bugs) but explicitly excludes false positives from measurement (https://www.greptile.com/benchmarks). Industry leaderboards therefore are not comparable to FP-rate guarantees; the dogfood report computes both TP and FP for honesty.
- Code-comment inconsistency confirmed empirically as bug-introducing predictor (arXiv 2024, https://arxiv.org/html/2409.10781v1); validates that comment-vs-code coherence checks (`R-COH-COMMENT-MISMATCH`) target real defect classes, not cosmetic noise.
- ASE 2024 paper (RustC4) demonstrates the LLM-extract + program-analysis-verify hybrid for code-comment inconsistency in Rust (https://conf.researchr.org/details/ase-2024/ase-2024-research/29/Leveraging-Large-Language-Model-to-Assist-Detecting-Rust-Code-Comment-Inconsistency); validates the deterministic+LLM split of D1.
- Naming/terminology drift is recognized as an emerging gap in AI code review (https://medium.com/@API4AI/ai-powered-code-reviews-2025-key-llm-trends-shaping-software-development-eac78e51ee59) without a mature production tool; supports the MVP decision to scope drift terminology to intra-diff + 1 hop only and treat repo-wide as fast-follow.
- Multi-agent token economics: prompt caching reduces input cost ~90% and latency ~75% when sub-agents share a large cacheable context (https://online.stevens.edu/blog/hidden-economics-ai-agents-token-costs-latency/); validates D2 economically — the `code-reviewer-semantic` sub-agent is cost-justified.

**Technical Context**

- All three reviewer JSONL outputs share the same shape `{timestamp, verdict, rubric:[{id, passed, reason?}], action, user_message}` (`code-reviewer.md:598-634`); adding `R-COH-*` rows to the `rubric[]` array is purely additive and does not require schema change.
- `prd-reviewer` already declares `Task` in `tools:` (used to invoke `prd-writer` for structural regeneration); adding sub-agent invocation has zero contractual overhead there. `plan-reviewer` and `code-reviewer` have no `Task` today; only `code-reviewer` needs it added (D9). `plan-reviewer`'s "no Task" hard-constraint is preserved.
- R8 of `plan-reviewer` (R8a/R8b/R8c) is the direct precedent for intra-artifact consistency (`plan-reviewer.md:205-233`): R8b cross-checks plan AC references against PRD ACs, R8c cross-checks the plan filename's phase number against the PRD's Implementation Phases row. The new layer generalizes this pattern to other coherence dimensions.
- `code-reviewer.md:297-315` confirms R-SEM is "primary value layer per D4" and checks **vertical** alignment (diff faithful to plan/PRD); the new layer's `R-COH-TASK-CONTRADICTION` check is its **horizontal** sibling (diff faithful to itself relative to the plan task).
- Sub-agent invocation pattern via `Task` is concretely demonstrated in `prd-writer.md:184-186` (parallel `research-web` + `research-codebase` calls). The `code-reviewer` → `code-reviewer-semantic` invocation will reuse the same shape: parent passes structured input via prompt, sub-agent returns parseable JSON.
- D8 and D11 of `implementation-authoring.prd.md` are the read-only philosophy contracts for `code-reviewer` (`PRPs/prds/implementation-authoring.prd.md:316`); D11 specifies `tools: Read, Write, Glob, Grep, Bash, BashOutput` (no Edit, no Task). D9 of this PRD records the conscious divergence (adding `Task`) and explicitly preserves the spirit (sub-agent is also read-only).
- `documentation/AGENTS.md` Core Invariant 7 mandates the three-file registration rule (NAV + search-index + changelog) for new pages — the closest precedent to the per-project registry allowlist designed in D6.
- No existing relay agent performs intra-artifact coherence checking — confirmed across all three reviewer files; the concept is genuinely new in this codebase.
- No relay-layer precedent for "running an agent against the repo's own artifacts to measure FP rate" — the dogfood-style validation in Phase 4 is the first instance of this pattern.

---

*Generated: 2026-04-28*
*Approved: 2026-04-28*
*Status: APPROVED*
