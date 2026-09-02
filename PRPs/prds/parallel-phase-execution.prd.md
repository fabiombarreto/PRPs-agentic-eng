# Parallel Phase Execution

```
**Decision Gate**
- Active context: none
- Activated criteria: reverses an explicitly recorded "Won't" (strictly serial orchestration, D6); introduces concurrent mutation of state that today has exactly one writer at a time; depends on a capability that is registered and explicitly BLOCKED (runnable worktree environments); changes the worktree identity key and therefore the Pillar 3 integration shape
- Decisions found:
  - **[2026-05-15] Runnable worktree environments — registered future feature, implementation BLOCKED until a dedicated PRD is approved.** Its own Context states that two parallel `/relay-execute` runs "are isolated for file writes but cannot reliably start a dev server, a test stack, or a database inside their own worktree folders without manual, collision-prone setup". Its Out-of-scope list forbids modifying `implementer` / `test-runner` to assume a runnable environment exists. This PRD does NOT implement any of its six strategies and does NOT assume them; it gates on a declaration instead.
  - [2026-05-18] Pillar 2 never commits — permanent boundary. Lane integration therefore belongs to Pillar 3, never to the orchestration loop.
  - [2026-05-11] relay-worktree D1/D2/D4/D10 — path, shell-out primitive, `--porcelain` idempotency and the `feature/` branch prefix are preserved; only the identity KEY gains a lane dimension.
  - [2026-08-05] Five-state phase lifecycle, last two transitions owned by `/relay-execute` — this PRD extends that ownership rather than inventing a lock.
  - [2026-09-01] Worktree base per declared member, and the base preflight as the fourth interactivity extension — both shipped by `multi-repo-topology` and treated here as satisfied prerequisites.
  - PRP artifacts live under `PRPs/`, never under `.claude/`.
- Applicable anti-patterns:
  - "Relying on interactive permission prompts in the autonomous loop" — concurrency adds no prompt; the base preflight already confirms before the loop begins.
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — the runtime-safety gate is declared, never inferred from a stack scan.
  - "Logic duplication across command files" — lanes adopt the same command protocols the serial path adopts; no parallel copy of the pipeline.
  - "Weakening or deleting tests to make the auto-correction loop turn green" — every acceptance gate here carries a negative case, because a gate that can only pass is what this repository spent a day removing.
- Applicable architectural rules:
  - Interactivity boundary — four sanctioned extensions; this PRD adds none.
  - Three-pillar Pillar 2 terminates uncommitted; writer/reviewer split unchanged; no new agent.
  - Graceful degradation: a project that declares nothing runs exactly as it does today, serially.
- Result: PROCEED
```

## Problem Statement

`/relay-execute` picks "the lowest-numbered actionable row" and runs one phase at a time, even when the Implementation Phases table says several rows have no dependency on each other. The `Parallel` column has existed in the byte-exact header since the table was defined and is validated at eight sites, but no consumer reads it — it is a reserved slot. The cost is wall-clock: a PRD with independent dependency chains pays their sum instead of their maximum, and the operator waits for work that had no reason to be sequential.

## Evidence

- `relay-execute.md:1153` states the deferral outright: *"Parallel phase orchestration — MVP is strictly serial. The `Parallel` cell is read but not acted upon."* `relay-execute.md:263` adds *"There is at most one such row under this orchestrator's serial execution model (D6)."*
- The `multi-repo-topology` feature, merged 2026-09-01, is the first PRD in this repository whose `Parallel` column carries real data: rows 1, 2 and 3 were genuinely independent and ran sequentially anyway. Its own plans record the independence as input for this PRD.
- **The worktree has no phase dimension.** `/relay-worktree`'s idempotency key is `.worktrees/<feature>/` — feature name only. Two phases targeting the same repository share one worktree, one branch and one git index. The per-repo worktrees shipped by `multi-repo-topology` add a member dimension, not a phase one.
- **The phase-boundary snapshot is the exact mechanism by which two concurrent phases would corrupt each other.** `relay-execute.md:965-987` runs `git add -A` then `git write-tree` in the worktree at every phase close-out. Under concurrency that stages a second phase's in-flight edits into the first phase's recorded diff base.
- The source PRD's Implementation Phases table has **three writers with non-atomic read-modify-write**: `plan-writer` reads the table in Step 1.3 and writes `in-progress` in the separate, later Step 5.1; `/relay-implement`'s D8 Mutation c writes `implemented`; `/relay-execute`'s `flip_row_status` reads the whole file, locates the row, then edits one cell.
- `orchestrator-run.json` is overwritten wholesale at three points in a session and additionally patched best-effort by `/relay-pr` and `/relay-approve`. Last-writer-wins is implied by "overwrite" and named as a risk nowhere.
- The per-plan `.review.jsonl` and `.code-review.jsonl` logs are keyed by plan basename — effectively per phase — and are therefore NOT contended across concurrent phases. Guarding them would be wasted effort.
- `max_orchestrator_minutes = 240` and `max_plan_review_retries = 2` are initialised once in Phase A.0 and bound the whole run; `max_implement_retries`, `max_implement_minutes`, the dispute cap and oscillation state are re-initialised per phase inside `/relay-implement`. Under concurrency the first pair is silently contended and the second is duplicated per lane with no coordination.
- The D18 concurrency diagnostic exists twice — `relay-execute` P5 and `relay-implement` Phase A.0 — and both explicitly warn and continue: *"robust file-lock semantics deferred"*. It detects that a second invocation has started; it prevents nothing.
- `/relay-visual-approve` P2 HALTs with `FAILED_MULTIPLE_PENDING_APPROVALS` when more than one unresolved halt exists, calling it *"unexpected under this track's serial execution model (D6)"*. Under concurrency that fires as routine and blocks approval of any paused phase.
- **Test-stage resource contention is unaddressed — the finding is silence.** Neither `test-runner.md` nor `relay-test.md` mentions ports, container names or database namespaces. The only related idea in the repository is a commented-out, opt-in PORT-offset snippet in `context-builder`'s SKILL.md, which is not part of any agent contract.
- **Nesting depth was measured, not assumed.** A three-level dispatch experiment (level 0 → 1 → 2 → 3) completed with no error and the sentinel token returned up the chain; depth 4 was not attempted, so the result is a floor. The measurement also corrected a standing assumption: relay's writer/reviewer "agents" are mostly ADOPTED as protocols in the caller's own conversation (`relay-plan.md`: *"Follow the protocol in `agents/plan-writer.md`"*), not dispatched — so today's real depth is 1, and parallelism needs 2, not the 3 previously assumed.

## Proposed Solution

Give each independent dependency chain its own **lane**, and give each lane its own worktree and branch so the two contended resources — the working tree and the git index — stop being shared. Lanes never write the source PRD table or `orchestrator-run.json`: they return structured outcomes and the orchestrator applies every mutation serially, extending the ownership it already holds over the last two lifecycle transitions instead of introducing a lock the codebase has nowhere else. Concurrency activates only when the project declares that its test stage does not contend on shared runtime resources — a declaration, never a scan — because the capability that would make that safe automatically is registered and blocked. Pillar 3 integrates a repository's lane branches into its feature branch at `/relay-commit` time, which is where committing already belongs.

## Key Hypothesis

We believe that per-lane worktrees plus orchestrator-serialized state mutation will let independent dependency chains run concurrently without corrupting the working tree, the phase-status table or the audit log, for the relay operator.

We'll know we're right when a synthetic three-lane run completes with every correctness gate green and is not slower than the same run executed serially — and when a run deliberately constructed to collide fails the interleaving gate rather than passing it.

## What We're NOT Building

- **Runnable worktree environments** — per-worktree port allocation, Compose project-name isolation, dependency installation and env replication are a registered future feature whose implementation is explicitly blocked until its own PRD is approved. This PRD neither implements nor assumes them.
- **Separate sessions per lane** — the isolation parallelism needs is of the filesystem, and no session model provides it; the worktree does. A separate session would additionally lose the single artifact plane, permission inheritance and HALT observability.
- **A file lock or mutex** — the design removes the shared write instead of guarding it. Introducing locking to a pipeline that has none anywhere would be a larger and less reversible change than making lanes read-only over shared state.
- **Parallelism across PRDs** — one PRD per invocation stays the rule.
- **A `Parallel` override that can loosen the dependency graph** — the cell may force two chains into one lane (more serial), but never split rows the `Depends` column ties together. Parallelism that contradicts a declared dependency is not expressible, by design.
- **Speeding up a single dependency chain** — a chain is sequential by definition. This PRD only removes waiting between chains.

## Success Metrics

Binary correctness gates plus one non-regression floor. There is deliberately no speedup target: with a minority of phases typically parallelizable, any number fixed today would be a guess, and model-latency variance would make it unreliable as a gate.

| Metric | Target | How Measured |
|--------|--------|--------------|
| Correctness gates all green | Pass / Fail | The synthetic three-lane fixture completes with no interleaved diff, no lost status transition, no corrupted audit log |
| Detection actually fires | Pass / Fail | A deliberately colliding run FAILS the interleaving gate — the negative half, without which the gate is vacuous |
| No wall-clock regression | Pass / Fail | The three-lane fixture is not slower than the same fixture run serially |
| Timing recorded | Pass / Fail | Per-lane and total durations present in `orchestrator-run.json` for every parallel run |
| Serial path unchanged | Pass / Fail | A project declaring nothing runs exactly as before: same order, same artifacts, no new prompt |

## Acceptance Criteria (test scenarios)

- **AC-1 serial by default:** Given a project that declares no runtime-safety gate, when `/relay-execute` runs a PRD with independent rows, then phases execute in the existing lowest-numbered-first order, no lane is created, and every artifact is byte-identical to a pre-feature run.
- **AC-2 lanes derived from the graph:** Given a PRD whose rows 1, 2 and 3 have empty `Depends` and whose rows 4 and 5 depend on 1, when lanes are computed, then rows 1, 4 and 5 form one lane and rows 2 and 3 form two further lanes — a lane is a weakly-connected component of the `Depends` graph, restricted to a single repo.
- **AC-3 `Parallel` overrides in both directions:** Given two rows the graph would place in separate lanes, when the author marks them to share a lane, then they run sequentially in one lane; and given rows the graph would merge, when the author marks them separable, then the declaration is refused with a named error rather than silently honored — a lane that violates `Depends` is not expressible.
- **AC-4 per-lane isolation:** Given two lanes running concurrently against the same repository, when each implements its phase, then each writes into its own `.worktrees/<feature>-lane-<k>/` on its own `feature/<feature>-lane-<k>` branch, and neither lane's `git add -A` stages the other's files.
- **AC-5 interleaving is detected, not assumed absent:** Given a run deliberately constructed so two concurrent lanes modify the same file, when the run completes, then the interleaving gate FAILS and names both lanes and the contended path. A run with a single lane does not satisfy this criterion.
- **AC-6 lanes do not write shared state:** Given any parallel run, when a lane finishes a phase, then the lane returns a structured outcome and performs no write to the source PRD table or to `orchestrator-run.json`; the orchestrator applies every such mutation serially, and the final table reflects every phase exactly once.
- **AC-7 runtime-safety gate:** Given a project whose declaration says its test stage contends on shared runtime resources — or which makes no declaration — when a PRD with independent chains runs, then execution is serial and the reason is recorded. Given a project that declares it does not contend, then lanes run concurrently.
- **AC-8 concurrency cap:** Given a PRD with more independent chains than the configured cap, when the run starts, then at most the cap's worth of lanes are in flight at once and the remainder queue, so a wide PRD cannot exhaust rate or token budget.
- **AC-9 budgets are per lane where they are per phase:** Given N concurrent lanes, when each dispatches `/relay-implement`, then each carries its own retry, wall-clock, oscillation and dispute budgets; and the session-level orchestrator wall-clock remains one shared deadline, documented as shared rather than silently contended.
- **AC-10 halt in one lane does not corrupt the others:** Given three lanes in flight and one halting, when the halt is surfaced, then the other lanes reach a defined terminal state, the audit log records which lane halted and which completed, and re-invocation resumes only the unfinished work.
- **AC-11 Pillar 3 integrates lanes:** Given a repository whose feature was built across three lane branches, when `/relay-commit` runs, then it integrates those branches into that repository's `feature/<feature>` branch before any PR is opened, and `/relay-pr` opens one PR per repository as it already does.
- **AC-12 no wall-clock regression:** Given the synthetic three-lane fixture, when run in parallel and serially, then the parallel run is not slower, and per-lane plus total durations are recorded in `orchestrator-run.json` for both.
- **AC-13 multiple paused phases are not a failure:** Given two lanes both reaching a state that awaits human approval, when the approval command runs, then it presents both rather than halting with the multiple-pending error that today's serial assumption produces.

## Open Questions

- [ ] What is the right default concurrency cap? It bounds rate-limit and token exposure, and no measurement exists yet — the synthetic fixture is the instrument that should set it.
- [ ] Should a lane branch be deleted after integration, or preserved as an audit trail of what each lane produced?
- [ ] Six relay agents declare `Task` in their `tools:` frontmatter while the dispatch tool observed at every level is named `Agent`. Most run by adoption so the declaration is rarely exercised, but `code-reviewer` IS dispatched and declares `Task` in order to reach `code-reviewer-semantic`. Whether that name still resolves is untested; if it does not, the R-SEM layer is silently absent today. This is not caused by this PRD but must be verified before its dispatch design depends on the same resolution.
- [ ] When a lane's phase reveals that `Depends` was wrong — two supposedly independent chains conflict at integration — should the run fail loudly or record the conflict and serialize the affected lanes on retry?

---

## Users & Context

**Primary User**
- **Who:** The relay operator, running a PRD whose phases include independent dependency chains.
- **Current behavior:** Accepts serial execution because there is no alternative; the `Parallel` cell is filled in as documentation and ignored by the machine.
- **Trigger:** A PRD whose table has more than one chain with no edge between them.
- **Success state:** Independent chains finish concurrently, with no one watching for corruption.

**Job to Be Done**
When a PRD has independent dependency chains, I want the orchestrator to run them concurrently with real isolation, so I pay the maximum instead of the sum.

**Non-Users**
PRDs whose table is a single chain — there is nothing to parallelize, and the feature correctly does nothing. Projects whose test stage contends on shared runtime resources, until the registered runnable-worktree-environments feature ships; they run serially by declaration, not by failure.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Lane model — weakly-connected components of the `Depends` graph, restricted to one repo | Deterministic, computable from the table that already exists, no heuristic |
| Must | `Parallel` column semantics as a ONE-DIRECTIONAL author override: it can force lanes to merge (more serial), never split beyond what `Depends` allows | The column has been reserved since the schema was defined; this is what it was reserved for. The asymmetry is deliberate — an author may always choose to be more conservative than the graph, never less |
| Must | Worktree AND branch per lane | The single change that de-shares both contended resources: the working tree and the git index. Git forbids one branch in two worktrees, so lane branches are forced, not chosen |
| Must | Orchestrator-serialized mutation of shared state | Removes the race by construction. Lanes return outcomes; the orchestrator writes. Extends existing ownership instead of introducing the codebase's first lock |
| Must | Declared runtime-safety gate | The capability that would make concurrent test stages safe is registered and blocked; a declaration is the only honest way to proceed without assuming it |
| Must | Explicit concurrency cap | N unbounded lanes is an unmeasured exposure to rate and token limits |
| Must | Per-lane timing recorded in `orchestrator-run.json` | The instrument for the non-regression floor, and the data that should set the cap |
| Must | Synthetic three-lane fixture, run parallel and serially | Isolates orchestration overhead from real work at a fraction of the cost of running a real PRD twice |
| Must | The negative case — a deliberately colliding run that must FAIL | A gate that can only pass is worth nothing; this repository removed three such gates in a single day |
| Must | Lane integration in `/relay-commit` | Pillar 2 never commits; integration belongs where committing already does |
| Should | Replace the D18 soft-fail diagnostic with real detection | It warns and continues today, protecting nothing |
| Should | Relax the multiple-pending-approval halt under concurrency | It fires as routine once lanes exist, blocking every paused phase |
| Could | Dynamic concurrency cap derived from remaining budget | Worth doing once the fixture has produced data; guessing now would be the same error as a speedup target |
| Won't | Runnable worktree environments | Registered, blocked, and out of scope by decision |
| Won't | Separate sessions per lane | The needed isolation is filesystem-level; sessions do not provide it |
| Won't | A lock or mutex over shared state | The design removes the shared write instead |

### MVP Scope

The whole Must set. The hypothesis is only testable when lanes genuinely run at once with isolation, so per-lane worktrees, serialized mutation, the safety gate and the fixture are all preconditions of measuring anything.

### User Flow

Declare the runtime-safety gate once → author a PRD whose `Depends` column expresses the real dependencies → run `/relay-execute` → lanes are derived, capped and dispatched concurrently, each in its own worktree → the orchestrator applies status and audit mutations serially as lanes report → Pillar 3 integrates lane branches per repository and opens one PR each.

---

## Technical Approach

**Feasibility:** MEDIUM-HIGH

The central mechanism was measured rather than assumed: three-level dispatch completed cleanly, and the depth parallelism actually needs is 2, because relay's writer/reviewer protocols are adopted in the caller's conversation rather than dispatched. The remaining unknown is behavioral, not structural — how token budget and request rate behave with N lanes live — which is exactly what the concurrency cap bounds and the fixture measures.

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

### Architecture Notes

- **A lane is a weakly-connected component of the `Depends` graph, restricted to a repo.** Deterministic, computable from the existing table, no inference. Phases in one chain share a lane and stay ordered; chains with no edge between them become separate lanes.
- **Per-lane worktrees are the whole isolation story.** Two phases in one worktree share a working tree AND a git index; the phase-boundary `git add -A` shipped by `multi-repo-topology` would stage a concurrent lane's edits into the wrong diff base. Separate worktrees fix both. Git refuses the same branch in two worktrees, so lane branches follow necessarily.
- **Lanes are read-only over shared state.** The source PRD table and `orchestrator-run.json` keep exactly one writer — the orchestrator — which applies mutations serially as lanes report. This extends the ownership the orchestrator already has over `tested` and `complete` rather than adding the first lock in the codebase. The per-plan verdict logs need no protection: they are keyed by plan basename and therefore already per-phase.
- **The runtime-safety gate is a declaration, not a scan.** The registered runnable-worktree-environments feature is explicitly blocked, and its out-of-scope list forbids assuming a runnable environment. A declaration follows the contract `tdd`, `docs_sync` and `figma_track` already obey, and it degrades to serial — the safe direction.
- **Budgets split by nature.** Wall-clock is genuinely session-wide and stays one deadline, documented as shared. Retry, oscillation and dispute budgets are per-phase and therefore per-lane; the concurrency cap is what keeps their multiplication bounded.
- **Every gate carries its negative case.** This repository spent a day removing guards that passed on empty inputs, on unanchored substrings, and on prose that happened to match. A parallelism gate is especially prone to it: "no interleaving observed" is trivially true with one lane.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Lanes serialize on some unnoticed bottleneck and the feature adds risk with no speed | M | The non-regression floor is designed to catch exactly this; it fails a correct-but-pointless implementation |
| Lane branches multiply Pillar 3's work and produce integration conflicts | H | Lanes are disjoint by construction — independent chains touch different files — so a real conflict is evidence that `Depends` was wrong, which is itself worth surfacing |
| N concurrent lanes exhaust rate or token budget | M | Explicit cap, never unbounded; the fixture produces the data to set it |
| A binary gate passes vacuously on a single-lane run | H | AC-5 requires the colliding run to FAIL; a gate that only ever passes is not accepted |
| The `Task`/`Agent` frontmatter name mismatch breaks dispatch for an agent that is genuinely dispatched | M | Recorded as an open question with a verification step before the dispatch design depends on it; it is a pre-existing condition, not one this PRD introduces |
| Concurrency makes a halt in one lane leave others in an undefined state | M | AC-10 requires a defined terminal state for every lane and a per-lane record of what completed |

---

## Implementation Phases

| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|------|----------|---------|----------|
| 1 | Lane model and Parallel semantics | Derive lanes as weakly-connected components of the `Depends` graph restricted to a repo; make the `Parallel` cell an explicit override that cannot contradict `Depends` | complete | - | yes | - | PRPs/plans/completed/parallel-phase-execution-phase-1-lane-model-and-parallel-semantics.plan.md |
| 2 | Per-lane worktree and branch | Extend the worktree identity key with a lane dimension; create `.worktrees/<feature>-lane-<k>/` on `feature/<feature>-lane-<k>` | complete | - | - | 1 | PRPs/plans/completed/parallel-phase-execution-phase-2-per-lane-worktree-and-branch.plan.md |
| 3 | Orchestrator-serialized state mutation | Lanes return structured outcomes and write neither the PRD table nor the audit log; the orchestrator applies every mutation serially | complete | - | - | 1 | PRPs/plans/completed/parallel-phase-execution-phase-3-orchestrator-serialized-state-mutation.plan.md |
| 4 | Runtime-safety gate and concurrency cap | Declared gate that degrades to serial when absent; explicit cap on lanes in flight | complete | - | - | 1 | PRPs/plans/completed/parallel-phase-execution-phase-4-runtime-safety-gate-and-concurrency-cap.plan.md |
| 5 | Concurrent lane dispatch | Dispatch lanes as subagents that adopt the existing per-phase protocols; per-lane budgets; defined terminal state for every lane on halt | complete | - | - | 2, 3, 4 | PRPs/plans/completed/parallel-phase-execution-phase-5-concurrent-lane-dispatch.plan.md |
| 6 | Lane integration in Pillar 3 | `/relay-commit` integrates a repository's lane branches into its feature branch before any PR; halt semantics relaxed for multiple paused lanes | complete | - | - | 2, 5 | PRPs/plans/completed/parallel-phase-execution-phase-6-lane-integration-in-pillar-3.plan.md |
| 7 | Synthetic fixture, instrumentation and the negative case | Three-lane fixture run parallel and serially; per-lane timing in `orchestrator-run.json`; a deliberately colliding run that must fail the interleaving gate | complete | - | - | 5 | PRPs/plans/completed/parallel-phase-execution-phase-7-synthetic-fixture-instrumentation-and-the-negative-case.plan.md |

### Phase Details

**Phase 1: Lane model and Parallel semantics**
- **Goal:** Make "which phases may run together" a computed, deterministic fact.
- **Scope:** Lane derivation from the `Depends` graph restricted to a repo; the `Parallel` cell as an explicit two-directional override; refusal of any declaration that would place a dependent row in a different lane from its dependency.
- **Success signal:** A PRD with three independent chains yields three lanes; a `Parallel` declaration contradicting `Depends` is refused by name rather than honored.

**Phase 2: Per-lane worktree and branch**
- **Goal:** Stop two concurrent phases from sharing a working tree and a git index.
- **Scope:** A lane dimension in the worktree identity key and the branch name, preserving D1's path convention, D2's shell-out, D4's `--porcelain` idempotency and D10's `feature/` prefix; the per-repo dimension from `multi-repo-topology` is kept, not replaced.
- **Success signal:** Two lanes in the same repository have distinct worktrees and branches, and neither one's `git add -A` stages the other's files.

**Phase 3: Orchestrator-serialized state mutation**
- **Goal:** Keep exactly one writer for every piece of state two lanes would otherwise contend on.
- **Scope:** Lanes return structured outcomes; the orchestrator performs all source-PRD row transitions and all `orchestrator-run.json` writes serially. The per-plan verdict logs are explicitly out of scope — they are already per-phase.
- **Success signal:** After a three-lane run, the phase table reflects each phase exactly once and the audit log contains every lane's record with none lost.

**Phase 4: Runtime-safety gate and concurrency cap**
- **Goal:** Never run lanes concurrently where the test stage would collide, and never run more lanes than the budget tolerates.
- **Scope:** A declared gate read from the project's own methodology declaration, defaulting to serial when absent; an explicit cap on lanes in flight with the remainder queued; both recorded in the run log.
- **Success signal:** A project with no declaration runs serially and says why; a wide PRD never exceeds the cap.

**Phase 5: Concurrent lane dispatch**
- **Goal:** Actually run lanes at the same time.
- **Scope:** Dispatch each lane as a subagent that adopts the existing per-phase command protocols unchanged; per-lane retry, wall-clock, oscillation and dispute budgets; a defined terminal state for every lane when one halts; the session wall-clock documented as shared.
- **Success signal:** Three lanes complete concurrently with every correctness gate green, and a halt in one leaves the others in a recorded terminal state.

**Phase 6: Lane integration in Pillar 3**
- **Goal:** Turn N lane branches back into one branch per repository.
- **Scope:** `/relay-commit` integrates a repository's lane branches into its `feature/<feature>` branch before any PR is opened; the multiple-pending-approval halt is relaxed so concurrent paused lanes are presented rather than refused.
- **Success signal:** A feature built across three lanes produces one PR per repository, and two paused lanes can both be approved.

**Phase 7: Synthetic fixture, instrumentation and the negative case**
- **Goal:** Prove the feature works AND that its gates can fail.
- **Scope:** A three-phase synthetic fixture with trivial independent work, run parallel and serially; per-lane and total durations recorded in `orchestrator-run.json`; a deliberately colliding run that must fail the interleaving gate.
- **Success signal:** The parallel fixture is not slower than the serial one, timings are recorded for both, and the colliding run fails rather than passes.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Execution unit | Subagents in the same session, one worktree per lane | Separate sessions per lane | The isolation parallelism needs is of the filesystem, and neither option provides it — the worktree does. Sessions would additionally lose the single artifact plane, permission inheritance and HALT observability. Depth was measured, not assumed |
| Lane definition | Weakly-connected component of the `Depends` graph, restricted to one repo | Author-declared lanes; per-phase parallel flags | Deterministic and computable from the table that already exists; no heuristic, and a lane cannot contradict a declared dependency |
| Shared-state safety | Lanes are read-only over shared state; the orchestrator applies all mutations serially | A file lock or mutex; per-lane state files merged at the end | Removes the race by construction rather than guarding it, and extends ownership the orchestrator already has. A lock would be the codebase's first, in a pipeline whose every concurrency mention today is a deferral |
| Worktree identity | Adds a lane dimension to the existing key | Reusing one worktree with careful sequencing; per-phase worktrees | Two phases in one worktree share a git index, and the phase-boundary `git add -A` would stage a concurrent lane's edits. Lane granularity matches the unit that actually runs concurrently |
| Runtime contention | A declared safety gate, degrading to serial when absent | Implementing port/container isolation here; assuming the worktree suffices | The capability that would make it safe is registered and BLOCKED until its own PRD; assuming it would contradict a recorded decision and fail non-deterministically in real workspaces |
| Acceptance shape | Binary correctness gates plus a non-regression floor | Binary only; binary plus an explicit speedup target | Binary alone would accept a correct implementation that is no faster — the likeliest failure mode. A speedup target fixed today would be a guess, and model-latency variance would make it an unreliable gate |
| Measurement | A synthetic three-lane fixture | Running a real PRD twice; instrumenting only and deciding later | Isolates orchestration overhead from real work, costs a fraction, and becomes a repeatable regression. A real double-run's latency variance could dominate the signal |
| Negative case | Mandatory: a colliding run must FAIL the gate | Trusting the positive gates | "No interleaving observed" is trivially true with one lane. Three guards in this repository were found passing vacuously in a single day |

---

## Research Summary

**Market Context**

No external research was commissioned for this PRD. The design question is not "how do others parallelize" but "what does this specific orchestrator contend on", which is answerable only from the codebase. The prior-art survey that grounded the lane and declaration model — Google `repo`, `vcstool`, `gita`, and git's own worktree documentation — was performed for the companion `multi-repo-topology` PRD and is recorded in `docs/planning/multi-repo-parallel-phases-research.md`; its findings on declared-over-detected membership carry directly into the runtime-safety gate here.

**Technical Context**

The serial model is stated outright at `relay-execute.md:1153` and `:263`, and two sibling commands cite the same D6 decision in their own deferral notes.

Three pieces of state are genuinely contended across concurrent phases: the source PRD's Implementation Phases table (three writers, non-atomic read-modify-write — `plan-writer` reads in Step 1.3 and writes in Step 5.1, `/relay-implement` D8 Mutation c, and `/relay-execute`'s `flip_row_status`), `orchestrator-run.json` (whole-file overwrite at three points plus best-effort patches from `/relay-pr` and `/relay-approve`, last-writer-wins never named as a risk), and the worktree's git index via the phase-boundary `git add -A` at `relay-execute.md:965-987`. The per-plan `.review.jsonl` and `.code-review.jsonl` logs are keyed by plan basename and are NOT contended — a useful negative that bounds the work.

The worktree identity key is `.worktrees/<feature>/`, feature-name only; `/relay-worktree`'s own out-of-scope note names concurrent creation for the same feature as a live, unmitigated race deferred past MVP and assigned to "the user's coordination responsibility". The per-repo worktrees shipped by `multi-repo-topology` add a member dimension, not a phase or lane one.

Budgets split unevenly: `max_orchestrator_minutes` and `max_plan_review_retries` are initialised once per session and bound the whole run, while `max_implement_retries`, `max_implement_minutes`, the dispute cap and oscillation state are re-initialised per phase inside `/relay-implement`. D18's diagnostic appears in two commands and both warn-and-continue with locking explicitly deferred. `/relay-visual-approve` HALTs on more than one unresolved approval, calling it unexpected under the serial model.

Test-stage resource contention is unaddressed: neither `test-runner.md` nor `relay-test.md` mentions ports, container names or database namespaces, and the only related idea in the repository is a commented-out PORT-offset snippet in `context-builder`'s SKILL.md, outside any agent contract. This silence is what the runtime-safety gate answers.

Nesting depth was measured directly: a level 0 → 1 → 2 → 3 dispatch chain completed with no error and returned its sentinel token, establishing a floor of three (depth 4 untested). The same experiment surfaced that the dispatch tool observed at every level is named `Agent`, while six relay agents declare `Task` in their frontmatter — recorded as an open question because `code-reviewer` is genuinely dispatched and relies on that name to reach `code-reviewer-semantic`.

---

*Generated: 2026-09-01*
*Approved: 2026-09-01*
*Status: APPROVED*
