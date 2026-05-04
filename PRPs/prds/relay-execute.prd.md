# /relay-execute Orchestrator Command

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: cross-cutting orchestrator command spec; composes the four shipped writer/reviewer pairs (PRD authoring v0.6.0, plan authoring v0.7.0, implementation authoring v0.8.0, test runner); impacts source PRD's Implementation Phases state machine (references implementation-authoring D8 + plan-authoring D6); affects PRPs/reports/<feature>/ artifact paths; capstone command for project Phase 3 — Pillar 2.
- Decisions found:
  - Command surface writer/reviewer split (docs/decisions.md, 2026-04-19)
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - Narrow Bash allowlist patterns at agent layer (docs/decisions.md, 2026-04-19)
  - /relay-worktree deferred as separate future command (docs/decisions.md, 2026-04-19)
  - /relay-implement D8 post-approval mutations: plan trailing-block flip + plan move + source-PRD row flip (PRPs/prds/implementation-authoring.prd.md D8)
  - plan-writer Step 1.3 actionable-row selection (PRPs/prds/plan-authoring.prd.md, plan-writer.md:149-154)
  - Plugin manifest version-sync rule §7.5 (documentation/AGENTS.md, codified commit 26860fc 2026-04-30)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md)
  - Logic duplication across command files (would fork orchestrator from standalone commands)
  - Fabricated research findings (research subagents must record degradation, never invent)
  - Bypassing the writer/reviewer split (orchestrator dispatches existing pairs; never bundles)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary applies — orchestrator never prompts; PRPs/ artifact paths; writer/reviewer split; graceful degradation when /relay-worktree absent (operate in cwd against current branch); per-stage commands own their own internal loops and budgets
- Result: PROCEED
```

## Problem Statement

A developer running the relay pipeline against a target project today must invoke `/relay-plan`, then `/relay-plan-review`, then `/relay-implement` (and eventually `/relay-test`, `/relay-test-review`) by hand for **every** actionable phase of an APPROVED PRD, re-evaluating the Implementation Phases dependency graph between each invocation. With the Implementation-Authoring stack just shipped (v0.8.0), the four writer/reviewer pairs exist but nothing sequences them. Every multi-phase feature today is a manual loop the developer must drive with their attention, which is the bottleneck the relay project's "one prompt → PR" promise is supposed to remove.

## Evidence

- The implementation-authoring ship (commit 7d9f303, v0.8.0) explicitly notes its constraint #8: "Never re-run the writer↔reviewer pair across `/relay-implement` invocations. That is `/relay-execute`'s call." (`plugins/relay/commands/relay-implement.md:441`). The orchestrator is a documented gap, not a future-feature speculation.
- Multi-phase PRDs in this repo (e.g. `prd-authoring`, `plan-authoring`, `implementation-authoring`, `reviewer-coherence-layer`) demonstrate the manual sequence pattern. Each shipped over multiple commits because the developer ran the stages by hand per phase.
- Web research on Claude Code multi-agent orchestrators (`https://github.com/aaddrick/claude-pipeline`, `https://github.com/barkain/claude-code-workflow-orchestration`) confirms the dispatch-via-spawned-subagents model is the community default. The relay choice (inline role adoption via `Read`) is novel; the value over spawned sub-agents is zero logic duplication and a single shared context window.
- Codebase research confirms zero existing precedent for one command's protocol referencing another command's protocol via `Read` (`plugins/relay/commands/relay-plan.md:158-159` is the closest, and that adopts an *agent* role, not a command role). This PRD codifies a new pattern.

## Proposed Solution

Ship `/relay-execute <prd-path>` as the capstone command of project Phase 3 (Pillar 2 — Implementation). One markdown file at `plugins/relay/commands/relay-execute.md`, no companion agent. The command iterates the source PRD's Implementation Phases table serially, picking the lowest-numbered `pending` row whose `Depends` cell is empty or all-`complete` (mirrors plan-writer Step 1.3 verbatim). For each picked phase it adopts, in order, the protocols of `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, and `/relay-test-review` by reading each command file and executing its protocol inline. Each downstream command keeps its own internal loop budget; the orchestrator adds exactly two new orchestration-layer budgets (`max_plan_review_retries`, `max_orchestrator_minutes`) and one new audit artifact (`PRPs/reports/<feature>/orchestrator-run.json`). The PRD's Implementation Phases table IS the orchestrator's state machine, which makes re-invocation idempotent without a separate state file.

## Key Hypothesis

We believe a thin sequencing command that adopts existing command protocols inline (zero logic duplication) will close the gap between an APPROVED PRD and a ready-for-PR worktree for relay's developer. We'll know we're right when, for a 2–3 phase APPROVED PRD with no plan-review defects, a single `/relay-execute <prd-path>` invocation produces all phases with `Status: complete`, all plans archived under `PRPs/plans/completed/`, and an `orchestrator-run.json` audit listing every per-stage outcome — with no manual user dialogue between phases.

## What We're NOT Building

- **Multi-PRD orchestration** — one PRD per `/relay-execute` invocation; cross-PRD coordination is a separate orchestrator's job.
- **B7/B8 TDD integration in the orchestration loop** — B7 (TDD Writer) and B8 (TDD Reviewer) are unshipped per `prd-authoring.prd.md` MoSCoW + `implementation-authoring.prd.md` "What We're NOT Building". The TDD routing decision in D5 is dead code in MVP.
- **/relay-worktree integration** — separate future command per the 2026-04-19 surface decision; orchestrator runs against cwd until it ships.
- **/relay-pr integration** — separate future command; orchestrator surfaces a "ready for PR" message in the meantime.
- **Parallel phase orchestration** (when a row's `Parallel` cell is non-empty) — Could-item; MVP is strictly serial.
- **Auto-commit between phases** — Could-item per Open Question; defer to implementation.
- **`--from-phase <N>` resume flag** — Could-item; idempotency via the D6 state machine is sufficient for MVP.
- **`--dry-run` flag** — Could-item; the developer can manually inspect the PRD's Implementation Phases table to preview what `/relay-execute` would do.
- **Real-time progress streaming via Monitor or similar** — Could-item; the `orchestrator-run.json` artifact is the audit trail.
- **Re-running a `complete` phase** — refused via precondition; manual hand-edit of the row's `Status` cell back to `pending` is the documented escape hatch.
- **Cross-feature dependency graph orchestration** (e.g., feature A's Phase 3 depending on feature B's Phase 1) — out of scope; the `Depends` column is intra-feature only.
- **Recovery from `/relay-implement` `PARTIAL_D8_FAILURE`** — orchestrator surfaces the underlying `halt.json` and exits; manual recovery per `/relay-implement`'s documented steps.
- **Recovery from `/relay-test-review` `CHANGES_REQUESTED`** — manual intervention required (this is exactly what B5 is designed to catch); future B7/B8 integration may automate.
- **A dedicated orchestrator agent** — the command file IS the orchestrator (matches `/relay-implement`'s pattern). No `plugins/relay/agents/orchestrator.md`.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Capstone-pipeline completion rate (dogfood) | ≥ 1 successful end-to-end run on a synthetic 2-phase APPROVED PRD with zero manual intervention between phases | Run the dogfood test PRD authored in Phase 2; observe `orchestrator-run.json` final summary lists all phases as `complete` |
| Manual-intervention surface | Zero user prompts between APPROVED-PRD invocation and the success/HALT terminal message | Inspect `/relay-execute`'s output stream against the synthetic PRD; count any prompt-for-input lines (target: 0) |
| Logic-duplication budget | Zero functional logic from `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, `/relay-test-review` re-stated inside `relay-execute.md` (the file references those command files for protocol; it does not paste their steps) | Reviewer reads `relay-execute.md` and grep-checks against the five referenced command files; any duplicated step (verbatim or paraphrased) is a defect |
| HALT discriminability | Each of the seven distinct HALT outcome codes (`FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`, `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`, `FAILED_TEST_REVIEW_REJECTED`, plus the four propagated from `/relay-implement` and `/relay-test`) names the failing stage and references the underlying stage's `halt.json` (when applicable) | Inspect `orchestrator-halt.json` after each induced failure scenario in dogfood; verify the `halting_stage` field and `underlying_halt_ref` field are both populated |

## Acceptance Criteria (test scenarios)

- **AC-1 happy-path multi-phase orchestration:** Given an APPROVED PRD at `PRPs/prds/<feature>.prd.md` with N actionable phases (all `pending`, all `Depends` cells empty or all-`complete` after prior phases), when `/relay-execute PRPs/prds/<feature>.prd.md` runs, then for each phase in order it adopts `/relay-plan` → `/relay-plan-review` → `/relay-implement` (then `/relay-test` → `/relay-test-review` when those stages are part of the dogfood scenario) inline; on the success path each phase reaches `Status: complete`; final state has N plans at `PRPs/plans/completed/`, the source PRD's rows 1..N all `complete`, and `PRPs/reports/<feature>/orchestrator-run.json` records every phase's per-stage outcome with the success summary.

- **AC-2 plan-review feedback loop with bounded retries:** Given `/relay-plan-review` returns `CHANGES_REQUESTED` on the first attempt for some phase K, when `/relay-execute` runs, then it captures the rubric defects (the bullet-list output documented at `plan-reviewer.md:459-483`), re-invokes `/relay-plan` with the failing items as `prior_feedback`, and retries up to `max_plan_review_retries` times. On success normal completion. On exhaustion, HALT with outcome `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED` naming the failing phase and the rubric items that did not converge.

- **AC-3 propagate /relay-implement HALTs verbatim:** Given `/relay-implement` HALTs with any of `FAILED_AFTER_N_RETRIES` / `FAILED_TIME_BUDGET_EXCEEDED` / `FAILED_OSCILLATION_DETECTED` / `FAILED_DISPUTE_CAP_EXCEEDED` / `DISPUTE_UPHELD_TEST_WRONG` / `DISPUTE_UPHELD_PRD_AMBIGUOUS` / `PARTIAL_D8_FAILURE`, when `/relay-execute` runs, then it surfaces the underlying `halt.json` content verbatim, writes its own `PRPs/reports/<feature>/orchestrator-halt.json` referencing the `/relay-implement` halt path, and HALTs without re-running `/relay-implement` (respects the per-stage budget contract).

- **AC-4 propagate /relay-test HALTs verbatim:** Given `/relay-test` HALTs with any of `FAILED_AFTER_N_RETRIES` / `FAILED_TIME_BUDGET_EXCEEDED` / `FAILED_OSCILLATION` / `FAILED_INFRA_UNRECOVERABLE` for some phase, when `/relay-execute` runs, then it surfaces the underlying `run.json`'s failure details, writes `orchestrator-halt.json` referencing the `/relay-test` `run.json` path, and HALTs.

- **AC-5 HALT on /relay-test-review CHANGES_REQUESTED:** Given `/relay-test-review` returns `CHANGES_REQUESTED` for a phase (weakened tests detected, coverage drop, trivial assertions), when `/relay-execute` runs, then it HALTs with outcome `FAILED_TEST_REVIEW_REJECTED` naming the rejected test files (manual intervention required; not auto-recovery — future B7/B8 integration MAY introduce a recovery path).

- **AC-6 idempotent re-entry on already-complete PRD:** Given an APPROVED PRD with zero `pending` rows when `/relay-execute` starts (all phases already `complete`), then the command exits 0 with the verbatim message `All phases complete; nothing to orchestrate.` and writes no artifacts (no `orchestrator-run.json`, no `orchestrator-halt.json`).

- **AC-7 orchestrator wall-clock budget:** Given the orchestrator's wall-clock budget `max_orchestrator_minutes` elapses before all phases complete, when `/relay-execute` aborts, then outcome is `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED` (distinct from any per-stage budget exhaustion). Partial state is preserved on disk (the source PRD's table reflects whatever phases reached `complete` before the timeout); re-invocation picks up at the next actionable phase.

- **AC-8 PRPs/ artifact path discipline:** Given any invocation of `/relay-execute`, when any artifact is written (`orchestrator-run.json`, `orchestrator-halt.json`, or anything propagated from downstream stages), then no path resolves under `/.claude/`.

- **AC-9 Decision Gate sources precondition:** Given any of `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` cannot be read at command entry, when `/relay-execute` runs, then HALT with the byte-exact AC-14 message from `implementation-authoring.prd.md` (substituting `/relay-execute` for `/relay-implement`); no per-phase work begins.

- **AC-10 unparseable Implementation Phases table:** Given the source PRD's Implementation Phases table cannot be parsed (header line missing or rows malformed), when `/relay-execute` runs, then HALT with the same diagnostic `/relay-plan` emits ("Implementation Phases table header not found...") and exit without writing any artifact.

- **AC-11 TDD dead-code routing visibility:** Given `docs/context/methodology.md` has `tdd: true` at command entry but B7/B8 are unshipped, when `/relay-execute` runs, then it emits a startup note explaining that the TDD routing branch is currently dead code (the integration point is reserved per D5) and proceeds with the non-TDD path; no `/relay-tdd` invocation is attempted.

- **AC-12 dependency re-evaluation between phases:** Given multiple phases in the source PRD's Implementation Phases table, when `/relay-execute` completes phase K, then phase K+1's `Depends` cell is re-evaluated against the now-updated phase K `Status` (`complete`); phases that became actionable after phase K's completion are picked up in subsequent iterations.

- **AC-13 graceful degradation without /relay-worktree:** Given `/relay-execute` is invoked outside a git worktree (no `/relay-worktree` set up), when the command runs, then it works in cwd against the current branch (D4 graceful degradation; matches `/relay-implement`'s D3) and still writes per-phase artifacts under `PRPs/reports/<feature>/`.

- **AC-14 command-level Decision Gate first:** Given the command-level Decision Gate evidence block is the first user-facing output, when `/relay-execute` runs, then the six-line block matches the canonical format from `docs/decision-gate.md` and includes Activated criteria specific to orchestration (cross-cutting orchestration; composes 4 shipped writer/reviewer pairs; impacts source PRD's state machine; references implementation-authoring D8 + plan-authoring D6).

- **AC-15 zero logic duplication:** Given the implementer reads `relay-execute.md`, when the reviewer searches for verbatim or near-verbatim restatements of step bodies from `relay-plan.md`, `relay-plan-review.md`, `relay-implement.md`, `relay-test.md`, or `relay-test-review.md`, then no such restatements are found — the orchestrator references each command file by path and adopts its protocol inline, not by pasting steps.

- **AC-16 plugin manifest version-sync (per AGENTS.md §7.5):** Given the v0.9.0 changelog entry is added in Phase 3, when the same commit is inspected, then `plugins/relay/.claude-plugin/plugin.json`'s `version` field has been bumped from `0.8.0` to `0.9.0` in the same commit (binding rule codified at commit 26860fc on 2026-04-30, applied here for the first time).

## Open Questions

- [ ] **`max_plan_review_retries` exact value:** 2 (3 plan attempts total) vs 3 (4 plan attempts total) vs 1 (2 plan attempts total). Plan-review CHANGES_REQUESTED is usually a deterministic structural defect (R-S* / R-COH-*) and a single re-plan with feedback often resolves it. Suggest **2** as the starting default; reassess after dogfood.
- [ ] **`max_orchestrator_minutes` value:** 60 / 120 / 240. With `max_implement_minutes=45` per phase and `max_test_minutes=30` per phase, an N-phase feature could envelope at ~75 minutes per phase plus overhead; for a 3-phase feature that's ~225 min worst case. 240 is safer but blocks rapid feedback on stuck loops. Defer empirical validation.
- [ ] **Auto-commit between phases:** should the orchestrator `git commit` after each phase reaches `complete` (one commit per phase, attribution clear) OR leave the entire multi-phase diff uncommitted (developer's call OR `/relay-pr`'s job at the end)? Suggest opt-in via `--auto-commit` flag (Could-item for MVP).
- [ ] **Orchestrator audit log location:** `PRPs/reports/<feature>/orchestrator-run.json` (per-feature, single file accumulating across re-invocations) vs `PRPs/reports/<feature>/orchestrator/<run-id>/run.json` (per-run, separate directory each invocation). The first is simpler and grep-friendly; the second is auditable across re-invocations. Defer to implementation.
- [ ] **`/relay-execute` concurrency on shared worktree:** same D18 concern from `/relay-implement`, generalized. Multiple concurrent `/relay-execute` invocations against the same PRD would race on the source PRD's Implementation Phases table mutations. Soft-fail diagnostic at command start (Glob for in-flight `orchestrator-run.json` with no terminal entry; warn-and-continue) mirrors `/relay-implement`'s D18. Validate when Pillar 3 ships `/relay-approve` and the full pipeline runs at scale.

---

## Users & Context

**Primary User**
- **Who:** relay's own developer (and future relay plugin users) running the relay pipeline against a target project. The user has already authored an APPROVED PRD via `/relay-prd` and now wants the rest of the pipeline to run without further dialogue.
- **Current behavior:** manually invokes `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, `/relay-test-review` per phase per feature, eyeballing the source PRD's Implementation Phases table to know which row to operate on next.
- **Trigger:** an APPROVED PRD whose Implementation Phases table contains at least one `pending` row whose dependencies are satisfied.
- **Success state:** all rows of the source PRD reach `Status: complete`; all per-phase plans are archived under `PRPs/plans/completed/`; the worktree is ready for `/relay-pr <feature>` (when shipped) or for manual `git push` + PR creation. The developer reviews the final state, not the intermediate per-stage transitions.

**Job to Be Done**
When my PRD is APPROVED and I want to ship the feature, I want a single command to drive every downstream stage (plan → review → implement → test → test-review) for every actionable phase to completion, so I can walk away while the autonomous pipeline runs and review only the terminal state.

**Non-Users**
- Developers who want manual control over each stage (they keep using the standalone commands `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, `/relay-test-review` directly).
- Cross-PRD orchestration users — not addressed in MVP.
- Target-project end users who want to *invoke* the resulting feature — they consume the shipped output, not the orchestration.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Serial multi-phase orchestration mirroring plan-writer Step 1.3 actionable-row selection | The state-machine loop is the command's reason to exist (D2, D6) |
| Must | Inline command-protocol adoption via `Read` (no logic duplication) | The dispatch model decision (D7); the value over spawned sub-agents |
| Must | Two new orchestration-layer budgets: `max_plan_review_retries`, `max_orchestrator_minutes` (0 forbidden) | Bounded autonomy; orchestrator-layer envelope distinct from per-stage envelopes (D3) |
| Must | Per-stage CHANGES_REQUESTED handling per D8 (only `/relay-plan-review` re-runs; everything else HALTs) | The orchestrator must respect the per-stage budget contract; never re-run `/relay-implement` whose own loop already exhausted (D8) |
| Must | `orchestrator-run.json` audit artifact at `PRPs/reports/<feature>/` (mirrors `run.json` shape) | Audit trail for the multi-phase run; visible to the developer (D9) |
| Must | Idempotent re-entry on partial completion (state machine is the PRD table) | Re-invocation safety; no separate state file to corrupt (D6, D10) |
| Must | TDD routing decision emitted at startup (dead code in MVP) | Visibility of the integration point reserved for B7/B8 (D5) |
| Must | Plugin manifest version bump 0.8.0 → 0.9.0 in the same commit as changelog v0.9.0 | Binding rule per documentation/AGENTS.md §7.5 (codified 2026-04-30) (D16) |
| Should | Soft-fail concurrency diagnostic (Glob for in-flight `orchestrator-run.json` without terminal entry; warn-and-continue) | Matches `/relay-implement`'s D18 mitigation; full file-lock semantics deferred |
| Could | Parallel phase orchestration (when row's `Parallel` cell is non-empty) | Future feature; MVP is strictly serial |
| Could | `--auto-commit` flag (one commit per `complete` phase) | Open Question; defer to implementation |
| Could | `--from-phase <N>` resume flag | Idempotency via D6 state machine is sufficient for MVP |
| Could | `--dry-run` flag | Developer can inspect PRD's table manually to preview |
| Won't | Multi-PRD orchestration | Out of scope; separate orchestrator's job |
| Won't | B7/B8 TDD integration | B7/B8 are unshipped; D5 routing decision is dead code |
| Won't | `/relay-worktree` integration | Separate future command (2026-04-19 surface decision) |
| Won't | `/relay-pr` integration | Separate future command; orchestrator surfaces "ready for PR" |
| Won't | Recovery from `/relay-implement` `PARTIAL_D8_FAILURE` | Surface and exit; manual recovery per `/relay-implement` docs |
| Won't | Recovery from `/relay-test-review` `CHANGES_REQUESTED` | Manual intervention required (B5 is designed to catch this) |
| Won't | Re-running a `complete` phase | Refused via precondition; manual hand-edit is the escape hatch |
| Won't | Cross-feature dependency graph orchestration | `Depends` column is intra-feature only |
| Won't | Real-time progress streaming | `orchestrator-run.json` is the audit trail |
| Won't | A dedicated orchestrator agent | The command file IS the orchestrator (matches `/relay-implement`) (D13) |

### MVP Scope

The minimum that validates the hypothesis:

1. `plugins/relay/commands/relay-execute.md` exists, has the canonical command-file shape (frontmatter + Decision Gate + Parse arguments + Preconditions + Phase A multi-phase orchestration loop + Final output + Constraints + What you do NOT do), and is registered in the plugin manifest.
2. Against a synthetic 2–3 phase APPROVED PRD with no plan-review defects, a single `/relay-execute <prd-path>` invocation produces the success path: all phases `complete`, plans archived, `orchestrator-run.json` written, no user dialogue between phases.
3. Against a deliberately-broken 2-phase APPROVED PRD (one phase whose plan will fail R-COH on first attempt), the orchestrator exercises the plan-review feedback loop (re-invokes `/relay-plan` with prior_feedback up to `max_plan_review_retries`).
4. Re-invocation against a partially-completed PRD picks up at the next actionable `pending` row (idempotency).
5. The plugin manifest version is bumped 0.8.0 → 0.9.0 in the same commit as the changelog v0.9.0 entry (binding §7.5 rule).

### User Flow

```
1. Developer types: /relay-execute PRPs/prds/<feature>.prd.md
2. Command emits the Decision Gate evidence block (six lines, canonical format).
3. Command runs preconditions (PRD path resolves; PRD ends with *Status: APPROVED*; Implementation Phases table parseable; methodology.md tdd: routing emitted; Decision Gate sources readable; concurrency soft-fail diagnostic).
4. Command enters Phase A loop:
   a. Pick lowest-numbered actionable pending row (mirrors plan-writer Step 1.3).
   b. Adopt /relay-plan role per ${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan.md and execute its protocol inline. Plan-writer back-fills the row pending → in-progress and populates the PRP Plan cell.
   c. Adopt /relay-plan-review role inline. On CHANGES_REQUESTED, re-invoke step 4b with the rubric defects as prior_feedback, up to max_plan_review_retries.
   d. Adopt /relay-implement role inline. On APPROVED rubric, /relay-implement performs its own D8 mutations (plan flip → IMPLEMENTED, plan move → completed/, row → complete). On any HALT outcome, propagate verbatim and HALT the orchestrator.
   e. (When wired: adopt /relay-test → /relay-test-review roles inline. CHANGES_REQUESTED on test-review HALTs the orchestrator with FAILED_TEST_REVIEW_REJECTED.)
   f. Append a state-transition record to orchestrator-run.json (phase-N-plan-DRAFT, phase-N-plan-APPROVED, phase-N-implement-APPROVED, phase-N-test-GREEN, phase-N-complete).
   g. Loop to step 4a (re-evaluate the table; phases that became actionable after phase K are picked up).
5. Terminal state: success path emits the verbatim ✅ summary; any HALT path writes orchestrator-halt.json and emits a structured manual-recovery message naming the next manual step.
6. Developer reviews orchestrator-run.json (or orchestrator-halt.json on failure) and runs /relay-pr <feature> when shipped (or git push + PR by hand in the meantime).
```

---

## Technical Approach

**Feasibility:** HIGH. Zero new agents, zero new logic — the orchestrator is procedural sequencing in markdown. The novel part (inline command-protocol adoption via `Read`) is a new pattern but not a complex one: each "adopt X's role" line is a `Read` of the X command file followed by inline execution of its protocol. All the heavy lifting (plan rubric, implement loop, test runner) lives in the dispatched commands and remains untouched.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Architecture Notes

- **Dispatch model (D7) is the central architectural choice.** The orchestrator follows the existing command protocols by adopting their roles inline: the LLM running `/relay-execute` reads the markdown of `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, `/relay-test-review` and executes their protocols sequentially in the same conversation context. The Read tool is the dispatch primitive. The alternative (orchestrator dispatches dedicated sub-agents that replicate command behavior) is rejected because it forks logic between the standalone command files and the orchestrator's sub-agents, creating maintenance drift; the existing manual-execution pattern shown by relay's developer (running each command in sequence in a single conversation) IS the model the orchestrator formalizes.
- **State machine is the source PRD's Implementation Phases table (D6).** Status cells (`pending` / `in-progress` / `complete`) are the canonical phase-state representation. The orchestrator does NOT maintain a separate state file; the PRD's table is the single source of truth. This means `/relay-execute` is naturally idempotent: re-invocation after partial completion picks up at the next `pending` row whose deps are satisfied (no resume-state to corrupt). Trade-off acknowledged: this is the lightweight Airflow-style "task idempotency by convention" model rather than the Temporal-style event-sourced durable execution model (web research surfaced the trade-off explicitly via temporal.io/blog and zenml.io/blog). The convention model fits relay's scale (single-developer, single-machine, ~tens of phases per feature) and avoids introducing a workflow runtime dependency.
- **Per-stage retry budget composition (D3).** Each downstream command owns its own internal loop budget (`/relay-implement`: `max_implement_retries=3` + `max_implement_minutes=45`; `/relay-test`: `max_test_retries=3` + `max_test_minutes=30`). The orchestrator does NOT add a budget on top of those; their HALT outcomes propagate up unchanged. The orchestrator adds exactly two new budgets at the orchestration layer: `max_plan_review_retries` (re-runs `/relay-plan` when `/relay-plan-review` returns CHANGES_REQUESTED; structural defects in the plan are usually deterministic and re-running with feedback is the recovery path) and `max_orchestrator_minutes` (total session wall-clock; first-to-expire wins among orchestrator and downstream stage budgets). 0 forbidden for both. Web research on Argo Workflows two-level timeouts (`activeDeadlineSeconds` at workflow + template levels) surfaced known-issue #12329 (workflow stuck in 'running' when template-level timeout fires); the orchestrator avoids this class of bug by treating downstream HALTs as authoritative and never re-evaluating per-stage budgets at the orchestrator layer.
- **CHANGES_REQUESTED handling per stage (D8) is the second central decision.** `/relay-plan-review` CHANGES_REQUESTED → re-invoke `/relay-plan` with the rubric defects (the bullet list documented at `plan-reviewer.md:459-483`) as `prior_feedback`, bounded by `max_plan_review_retries`. `/relay-implement` HALT → surface verbatim and HALT (no re-run; `/relay-implement`'s own loop already exhausted). `/relay-test` HALT → surface verbatim and HALT. `/relay-test-review` CHANGES_REQUESTED → HALT (manual intervention required; this is exactly what B5 is designed to catch and the orchestrator must not auto-fix it). `/relay-code-review` is NOT invoked separately by the orchestrator; `/relay-implement` already dispatches the code-reviewer agent internally per its Phase A.3.
- **Tools allowlist (D11).** Orchestrator command file frontmatter declares `Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash, Task` — broad, because the LLM running `/relay-execute` needs to do everything the dispatched commands' protocols require. Same Bash discipline as `/relay-implement` (open at the agent layer; `.claude/settings.json` allowlist is the security gate per the 2026-04-19 narrow-patterns decision). `Task` is included for re-dispatching existing agents (research-* during `/relay-plan` grounding; implementer + code-reviewer during `/relay-implement` loop).
- **No logic duplication (D15).** The orchestrator MUST NOT re-implement any logic that lives in the dispatched commands. If `/relay-plan` changes, `/relay-execute` inherits the change automatically. The orchestrator's job is sequencing + state-machine bookkeeping + retry-budget enforcement at the orchestration layer; nothing else.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Inline command-protocol adoption via `Read` has zero codebase precedent (research finding #5); the pattern may not compose cleanly when a downstream command's protocol assumes it is the top-level invocation | M | Dogfood (Phase 2) is the first validation; if the pattern fails to compose, fall back to `Task` dispatch of a thin wrapper agent per stage (NOT a logic-duplicating sub-agent — a passthrough). Document the fallback in `docs/decisions.md` if exercised. |
| Orchestrator-layer wall-clock budget interacts confusingly with per-stage budgets (web research surfaced the Argo Workflows priority-inversion / budget-starvation pattern) | M | Per-stage budgets are authoritative within their stage; orchestrator budget is a session-level envelope (first-to-expire wins). Distinct outcome codes (`FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED` vs `FAILED_TIME_BUDGET_EXCEEDED` per `/relay-implement`) make the failing layer unambiguous in logs. |
| Concurrent `/relay-execute` invocations against the same PRD race on the Implementation Phases table mutations (D18 generalized) | L (single-developer scale) | Soft-fail diagnostic at command start (Glob for in-flight `orchestrator-run.json` without a terminal entry; warn-and-continue). Robust file-lock semantics deferred until `/relay-approve` ships and the full pipeline runs at scale. |
| Inline role-adoption pulls every dispatched command's protocol into the orchestrator's context window; long features may exceed window budgets | L (current model windows are large; relay PRDs are typically <30k tokens) | Acknowledged trade-off vs the spawned-subagent model documented by Anthropic's agent-teams docs (research finding #1 web). Re-evaluate if a real run hits context limits; the fallback is the wrapper-agent pattern above. |
| `/relay-test` and `/relay-test-review` are referenced in the orchestration loop but not yet shipped at the time of this PRD | L | Phase 1 of the implementation guards every adoption with a "command-exists" precondition; missing downstream commands are surfaced at startup with a structured warning, not a crash. The orchestrator runs whatever stages are available and reports the gaps. |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | /relay-execute command file | `plugins/relay/commands/relay-execute.md` — the deliverable. Mirrors `/relay-implement`'s structural shape (frontmatter + command-level Decision Gate + Parse arguments + Preconditions + Phase A multi-phase orchestration loop + Final output + Constraints + What you do NOT do). Phase A holds the multi-phase loop logic: actionable-row selection (mirrors plan-writer Step 1.3), per-phase orchestration sub-flow (adopt /relay-plan + /relay-plan-review + /relay-implement + /relay-test + /relay-test-review roles inline via Read), state-transition recording to orchestrator-run.json, idempotent re-entry on next iteration. | complete | - | - | PRPs/plans/relay-execute-phase-1-relay-execute-command-file.plan.md |
| 2 | Dogfood — synthetic test PRD | Author a minimal APPROVED PRD with 2–3 simple phases (e.g., "create three new no-op markdown files in plugins/relay/commands/dogfood/"); invoke `/relay-execute` against it; verify happy path end-to-end produces all phases `complete` with `orchestrator-run.json`; verify HALT path by introducing a deliberate plan-rubric defect; verify idempotency by re-invoking after partial completion. | complete | - | 1 | PRPs/plans/relay-execute-phase-2-dogfood-synthetic-test-prd.plan.md |
| 3 | Docs updates + version bump | `docs/api-reference.md` (mark /relay-execute ✅ implemented; promote project Phase 3 row from "partial" to "shipped" if applicable; mention the dead-code TDD branch); `docs/decisions.md` (pin D7 dispatch model, D6 state-machine model, D3 retry-budget composition); `docs/context/architecture.md` (Phased rollout update; new §"Orchestrator state machine" sub-section explaining the source-PRD-table-as-state model from D6); `documentation/changelog.html` v0.9.0 entry per AGENTS.md §7.5 (same-commit `plugins/relay/.claude-plugin/plugin.json` version bump 0.8.0 → 0.9.0; the changelog Changed section names the bump explicitly per §7.5's HTML template); optional `documentation/reference/commands.html` badge promotion + `documentation/roadmap/status.html` refresh ("Project Phase 3 SHIPPED" if applicable). | complete | - | 2 | PRPs/plans/relay-execute-phase-3-docs-updates-version-bump.plan.md |

### Phase Details

**Phase 1: /relay-execute command file**
- **Goal:** ship `plugins/relay/commands/relay-execute.md` as the orchestrator command file, structurally analogous to `/relay-implement` but composing five downstream commands instead of two agents.
- **Scope:** one markdown file; canonical command-file frontmatter; command-level Decision Gate; Parse arguments (one PRD path); Preconditions (PRD readable; PRD ends with `*Status: APPROVED*`; Implementation Phases table parseable per the canonical header; methodology.md tdd routing emitted; Decision Gate sources readable; concurrency soft-fail diagnostic); Phase A multi-phase orchestration loop with the per-phase sub-flow described in User Flow step 4; Final output surface (success ✅ summary + each HALT outcome's verbatim message); Constraints; What you do NOT do.
- **Success signal:** the file passes the plan-reviewer's 8-item structural rubric + R-COH-* coherence layer when its plan is reviewed; manual read-through confirms zero logic duplication against the five referenced command files.

**Phase 2: Dogfood — synthetic test PRD**
- **Goal:** prove the dispatch model (D7) composes cleanly and the per-stage CHANGES_REQUESTED handling (D8) behaves as specified.
- **Scope:** a synthetic PRD authored under `PRPs/prds/orchestrator-dogfood.prd.md` (or similar) with 2–3 trivial phases (e.g., create three no-op markdown files); a happy-path run producing all phases `complete`; a deliberately-broken-plan run exercising the plan-review feedback loop; an idempotency check (interrupt mid-run, re-invoke, observe the next actionable phase is picked up). Capture the dogfood report at `PRPs/reports/orchestrator-dogfood/`.
- **Success signal:** all three scenarios behave per AC-1, AC-2, AC-6; the dogfood report names every per-stage outcome and the orchestrator-run.json schema is stable enough to commit.

**Phase 3: Docs updates + version bump**
- **Goal:** make the capstone visible to readers of the documentation site and the api-reference, and cut the v0.9.0 release with the §7.5 plugin manifest sync.
- **Scope:** edit `docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`, `documentation/changelog.html`, `plugins/relay/.claude-plugin/plugin.json`; optional edits to `documentation/reference/commands.html` and `documentation/roadmap/status.html`. Single commit named per the version-sync rule (changelog cut + plugin.json bump together).
- **Success signal:** v0.9.0 changelog entry rendered on the documentation site; `plugins/relay/.claude-plugin/plugin.json` version is `0.9.0`; the api-reference shows `/relay-execute` ✅ implemented; `docs/decisions.md` records the three pinned decisions (D7 dispatch model, D6 state-machine model, D3 retry-budget composition).

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Input contract (D1) | One APPROVED PRD per `/relay-execute` invocation | Multi-PRD orchestration | Multi-PRD coordination is a separate orchestrator's job and doesn't exist yet; one-PRD scope is sufficient for the capstone milestone |
| Multi-phase serialization (D2) | Strictly serial; mirrors plan-writer Step 1.3 actionable-row selection | Parallel phase orchestration when `Parallel` cell non-empty | Parallel orchestration is a Could-item; serial is the simplest model that proves the capstone hypothesis |
| Per-stage retry budget composition (D3) | Each downstream command owns its internal loop budget; orchestrator adds two new budgets (`max_plan_review_retries`, `max_orchestrator_minutes`); 0 forbidden | Single orchestrator-level budget composing all stages | Per-stage budgets are authoritative within their stage; orchestrator envelope is a session-level wall-clock; first-to-expire wins makes the failing layer unambiguous in logs |
| Worktree management (D4) | Graceful degradation: works in cwd against current branch when no worktree set up | Hard-require `/relay-worktree` | `/relay-worktree` is deferred (2026-04-19 surface decision); matches `/relay-implement`'s D3 graceful degradation |
| TDD opt-in routing (D5) | Read methodology.md `tdd:` at startup; emit dead-code routing decision; never invoke `/relay-tdd` in MVP | Wire `/relay-tdd` placeholder | B7/B8 are unshipped; visible-but-dead-code routing keeps the integration point reserved without misleading the user |
| State machine (D6) | Source PRD's Implementation Phases table IS the state machine | Separate state file (e.g., `PRPs/state/<feature>.json`) | The PRD table is already the canonical phase-state representation per plan-writer; idempotency follows naturally from re-reading the table on each invocation; trade-off vs Temporal-style event-sourced durable execution acknowledged in Architecture Notes |
| Dispatch model (D7) | Inline command-protocol adoption via `Read` (LLM reads each command file and executes its protocol in the same conversation context) | Dispatch dedicated sub-agents that replicate command behavior | (a) sub-agent replication forks logic between command files and sub-agents (maintenance drift); (b) the manual-execution pattern relay's developer runs today IS this model formalized; (c) zero new agents, zero new logic. Trade-off vs spawned-subagent context-isolation acknowledged in Architecture Notes; fallback (wrapper-agent passthrough) documented as risk mitigation |
| CHANGES_REQUESTED handling per stage (D8) | `/relay-plan-review` re-runs `/relay-plan`; everything else HALTs | Auto-recovery for all stages | Each stage's own loop has already exhausted its budget when a HALT propagates; re-running would violate the per-stage budget contract. `/relay-plan-review` is the exception because plan-rubric defects are usually deterministic and a single re-plan with feedback often resolves them. `/relay-test-review` CHANGES_REQUESTED is exactly what B5 is designed to catch — auto-fix would defeat the purpose |
| Per-orchestrator-run audit artifact (D9) | `PRPs/reports/<feature>/orchestrator-run.json` mirrors `run.json` shape at orchestrator level | Per-run subdirectory `PRPs/reports/<feature>/orchestrator/<run-id>/run.json` | Open Question per implementation; current default is single per-feature file (simpler, grep-friendly) |
| Idempotency (D10) | Re-invocation against partially-completed PRD picks up at next actionable `pending` row; zero `pending` rows exits 0 with verbatim message | Maintain explicit resume state | State machine is the PRD table (D6); idempotency follows naturally |
| Tools allowlist (D11) | `Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash, Task` — broad | Narrow allowlist per command stage | Orchestrator must do everything the dispatched commands' protocols require; security gate is `.claude/settings.json` allowlist per 2026-04-19 narrow-patterns decision |
| File location (D12) | `plugins/relay/commands/relay-execute.md` | `plugins/relay/agents/orchestrator.md` (would imply a dedicated agent) | Matches `/relay-implement`'s pattern: command file holds the loop logic |
| No dedicated orchestrator agent (D13) | Command file IS the orchestrator | Companion agent at `plugins/relay/agents/orchestrator.md` | Procedural sequencing in markdown, not a decision-making agent — same precedent as `/relay-implement` |
| Output and final state (D14) | Success: verbatim ✅ summary naming all phases complete + plans archived + audit paths + "ready for /relay-pr" message. HALT: structured `orchestrator-halt.json` with halting stage, underlying halt.json reference, attempt history, manual-recovery message | Free-form summary | Verbatim summary makes downstream tooling (and the developer) able to grep for terminal state |
| No logic duplication (D15) | Orchestrator references each command file by path; never re-states their steps | Inline-paste step bodies for "self-containment" | Maintenance drift is the failure mode; `/relay-plan` evolution must propagate automatically |
| Plugin manifest version-sync (D16) | Bump `plugins/relay/.claude-plugin/plugin.json` from 0.8.0 → 0.9.0 in the same commit as changelog v0.9.0 cut | Defer the bump | Binding rule per documentation/AGENTS.md §7.5 codified at commit 26860fc on 2026-04-30; first PRD authored after §7.5 was codified |

---

## Research Summary

**Market Context**

External research (`relay:research-web` agent) surveyed Claude Code multi-agent orchestrators and the broader workflow-orchestration literature. Key findings:

- Anthropic's Claude Code documentation distinguishes two first-class dispatch primitives — sub-agents (own context window, summary return) and agent teams (peer sessions, mailbox) — and explicitly does NOT document inline role-adoption via Read as a pattern (sources: `https://code.claude.com/docs/en/sub-agents`, `https://code.claude.com/docs/en/agent-teams`). The relay choice (D7) is novel relative to the official primitives; the trade-off is context-window cost vs zero logic duplication.
- Community Claude Code multi-stage orchestrators (`https://github.com/aaddrick/claude-pipeline`, `https://github.com/barkain/claude-code-workflow-orchestration`) all use spawned-subagent dispatch (separate process or `Agent()` tool), confirming the relay inline-Read pattern is genuinely new prior art.
- LangGraph supervisor-vs-swarm benchmarks (`https://dev.to/focused_dot_io/multi-agent-orchestration-in-langgraph-supervisor-vs-swarm-tradeoffs-and-architecture-1b7e`) show centralized routing patterns trade higher per-step token cost (~2,800 vs ~1,900) for simpler observability and routing accuracy (94% vs 91%) — relevant context for D7's choice to keep all routing decisions in the orchestrator's context window rather than distributed across sub-agents.
- Temporal's engineering blog (`https://temporal.io/blog/temporal-replaces-state-machines-for-distributed-applications`) argues against external-table state machines as authoritative state for multi-stage workflows, citing maintenance complexity that grows per state. ZenML's Airflow-vs-Temporal analysis (`https://www.zenml.io/blog/temporal-vs-airflow`) frames the alternative as developer-driven idempotency vs infrastructure-guaranteed exactly-once. The relay D6 choice (markdown table as state machine) is closer to Airflow's idempotency-by-convention model — explicitly acknowledged as a trade-off appropriate for relay's single-developer scale.
- Argo Workflows' two-level timeout model (`https://argo-workflows.readthedocs.io/en/latest/walk-through/timeouts/`) plus the known-issue #12329 (workflow stuck in 'running' when template-level deadline fires) is the closest external precedent for D3's per-stage-budget-plus-orchestrator-budget composition; relay avoids the stuck-state class of bug by treating downstream HALTs as authoritative and never re-evaluating per-stage budgets at the orchestrator layer.

Gap: no external literature found specifically supporting or refuting the HALT-vs-auto-fix decision for automated post-test review rejection (`/relay-test-review` CHANGES_REQUESTED); the MVP HALT-for-human choice is unsupported by external evidence and rests on the in-PRD argument that B5 exists precisely to gate human review.

**Technical Context**

Internal research (`relay:research-codebase` agent) confirmed the structural precedents and surfaced the novelty of the dispatch model:

- `plugins/relay/commands/relay-implement.md` is the canonical orchestrator-of-internal-loop precedent. Its structure (frontmatter → Decision Gate → Parse arguments → Preconditions P1–P5 → Phase A.0–A.4 → Final output → Constraints → What you do NOT do) is the shape `/relay-execute` mirrors. Constraint #8 already names `/relay-execute` by role, confirming the orchestrator is a documented gap.
- The actionable-row selection rule lives at `plugins/relay/agents/plan-writer.md:149-154` and is the verbatim model `/relay-execute` adopts: a row is actionable when its `Status` cell equals `pending` (case-sensitive) AND its `Depends` cell is empty (`-`) OR every comma-separated phase number listed there has `Status == complete`. Pick the first (lowest `#`) actionable row.
- The canonical Implementation Phases table header (`| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`) is enforced at `plugins/relay/agents/plan-writer.md:126-128` and mirrored in `plugins/relay/commands/relay-plan.md` P4 and `plugins/relay/commands/relay-implement.md` P3.
- The `pending → in-progress` flip happens in plan-writer Phase 5.1 (back-fill); the `in-progress → complete` flip happens in `/relay-implement` Phase A.4 Mutation c (`plugins/relay/commands/relay-implement.md:362-368`). The orchestrator inherits both flips for free — it never mutates the table itself.
- The Test Runner artifact schema lives at `plugins/relay/commands/relay-test.md:176-197` (`run.json` with `attempts[]`, `outcome`, `time_breakdown`, `tdd_mode`). The orchestrator's `orchestrator-run.json` mirrors this shape at the orchestration level.
- The plan-reviewer's CHANGES_REQUESTED bullet-list output format lives at `plugins/relay/agents/plan-reviewer.md:459-483`; this is the structured defect list `/relay-execute` captures and feeds back to `/relay-plan` as `prior_feedback`.
- **Critical gap (research finding #5):** zero existing precedent in the codebase for one command's protocol referencing another command's protocol via `Read`. The closest analog (`plugins/relay/commands/relay-plan.md:158-159`) adopts an *agent* role, not a command role. `/relay-execute` codifies a new dispatch pattern; Phase 2 dogfood is the first validation.
- Existing `PRPs/reports/` layout supports per-feature subdirectories (e.g., `PRPs/reports/implementation-authoring/phase-3/attempts/<i>/`); the proposed `PRPs/reports/<feature>/orchestrator-run.json` fits cleanly without collision.
- documentation/AGENTS.md §7.5 (lines 333-356) is the binding plugin-manifest version-sync rule; this PRD is the first one authored after the rule was codified (commit 26860fc, 2026-04-30) — D16 captures the explicit cross-reference.

Gap: `.claude/settings.json` Bash allowlist patterns (focus area #6) were not surfaced in the research pass; the orchestrator inherits whatever allowlist is in place at runtime. If the dogfood (Phase 2) reveals allowlist friction, Phase 3 docs updates can capture the gap.

---

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Status: APPROVED*
