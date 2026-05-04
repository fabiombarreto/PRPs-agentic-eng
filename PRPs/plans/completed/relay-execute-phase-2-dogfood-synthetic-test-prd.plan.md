# Feature: Dogfood — synthetic test PRD (Phase 2 of relay-execute)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: cross-cutting validation phase — runs /relay-execute (just shipped in Phase 1) against a synthetic APPROVED PRD end-to-end; creates two new artifacts under PRPs/ (synthetic dogfood PRD + dogfood report); exercises happy path, HALT path (deliberate plan-rubric defect), and idempotency; validates D7 dispatch model composes cleanly and D8 per-stage CHANGES_REQUESTED handling behaves per spec
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - Interactivity boundary: PRD interactive, downstream autonomous (docs/decisions.md, 2026-04-19) — Phase 2 dogfood runs the orchestrator autonomously; Phase 2 plan itself is interactive only up to PRD-APPROVED
  - Command surface writer/reviewer split (docs/decisions.md, 2026-04-19) — dogfood invokes /relay-execute which dispatches existing pairs; dogfood does not bypass the split
  - D7 dispatch model — inline command-protocol adoption via Read (relay-execute.prd.md) — Phase 2 is the first empirical validation of this pattern
  - D6 state machine — source PRD's Implementation Phases table IS the state machine; idempotency follows naturally (relay-execute.prd.md Decisions Log)
  - D8 CHANGES_REQUESTED handling per stage — /relay-plan-review re-runs /relay-plan; everything else HALTs (relay-execute.prd.md Decisions Log)
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
  - D8 post-approval mutations are best-effort atomic with rollback note (docs/decisions.md, 2026-04-30)
  - Plugin manifest version-sync rule §7.5 (documentation/AGENTS.md, codified commit 26860fc 2026-04-30)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66) — dogfood PRD, report, orchestrator-run.json, plans, all go under PRPs/
  - Logic duplication across command files — dogfood validates that relay-execute.md references command files by path; never pastes their steps
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84) — /relay-execute must complete the happy path with zero user prompts
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary at PRD approval; PRPs/ artifact paths; writer/reviewer split preserved by orchestrator; graceful degradation when /relay-worktree absent (operates in cwd)
  - Per-stage commands own their own internal loops and budgets; orchestrator adds only two new budgets (max_plan_review_retries, max_orchestrator_minutes)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-execute.prd.md` — Implementation Phases row 2: "Dogfood — synthetic test PRD" — Goal: prove the dispatch model (D7) composes cleanly and the per-stage CHANGES_REQUESTED handling (D8) behaves as specified — Success signal: all three scenarios behave per AC-1, AC-2, AC-6; the dogfood report names every per-stage outcome and the orchestrator-run.json schema is stable enough to commit.

## Summary

This phase validates the `/relay-execute` orchestrator shipped in Phase 1 by running it against a purpose-built synthetic APPROVED PRD with 2–3 trivial phases (e.g., "create a no-op markdown file in `plugins/relay/commands/dogfood/`"). The implementer authors the synthetic PRD at `PRPs/prds/relay-execute-dogfood.prd.md`, invokes `/relay-execute` against it, and records the outcomes of three distinct scenarios: (1) the happy path — all phases reach `complete`, plans are archived under `PRPs/plans/completed/`, `orchestrator-run.json` is written, no user prompts occur; (2) the HALT path — a deliberate plan-rubric defect (e.g., a missing `VALIDATE:` line on one task) is introduced to trigger `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED` after exhausting `max_plan_review_retries`; (3) the idempotency check — `/relay-execute` is invoked after partial completion to confirm it picks up at the next actionable `pending` row. Findings are written to `PRPs/reports/relay-execute/phase-2/dogfood.md`. The plan deliberately does NOT run `/relay-test` or `/relay-test-review` against the dogfood phases (those commands are unshipped for the relay repo itself); the orchestrator's command-exists guard is exercised instead.

## User Story

```
As the relay pipeline developer
I want empirical evidence that /relay-execute drives a 2-phase synthetic PRD
  through plan → review → implement end-to-end without user dialogue,
  handles a deliberate plan-review failure correctly (HALT after retry budget),
  and re-enters idempotently after partial completion
So that I can commit to the v0.9.0 release knowing the D7 dispatch model
  composes cleanly and the D8 CHANGES_REQUESTED handling behaves as specified
```

## Problem Statement

Phase 1 shipped `plugins/relay/commands/relay-execute.md` — a structurally sound orchestrator command. However, the command's central novel pattern (inline command-protocol adoption via `Read`, D7) has zero codebase precedent and has not been empirically validated. The PRD's Technical Risks section rates this as Medium likelihood with "Phase 2 dogfood is the first validation." Without Phase 2, `AC-1` (happy-path multi-phase orchestration), `AC-2` (plan-review feedback loop), and `AC-6` (idempotent re-entry on already-complete PRD) remain unverified assertions. The v0.9.0 changelog entry cannot be cut, and Phase 3 docs updates cannot be written, until Phase 2 establishes that the orchestrator works end-to-end against a known-simple PRD.

## Solution Statement

Author a minimal APPROVED PRD at `PRPs/prds/relay-execute-dogfood.prd.md` with 2 phases — each phase creates one no-op markdown file in `plugins/relay/commands/dogfood/`. The PRD is self-contained, has no external dependencies, and is simple enough that each plan-writer pass should produce a structurally clean plan on the first attempt. Invoke `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md` for the happy path and observe `orchestrator-run.json` for `ALL_PHASES_COMPLETE`. Then introduce a deliberate defect into the dogfood PRD's Phase 2 row (or into a test plan variant) that causes the plan-reviewer to emit `CHANGES_REQUESTED` beyond the `max_plan_review_retries=2` bound, triggering `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`. Finally, restore the defect, run Phase 1 only to partial completion by interrupting after Phase 1's plan is APPROVED but before implement completes, then re-invoke `/relay-execute` to confirm it re-reads the table and picks up at Phase 1 implement (or Phase 2 if Phase 1 happened to complete). Capture all scenario outcomes in `PRPs/reports/relay-execute/phase-2/dogfood.md`.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Validation phase — synthetic PRD authoring + orchestrator execution + dogfood report |
| Complexity | Medium — no new agent code; novel interaction pattern (D7) under first empirical test; three distinct execution scenarios; report authoring from scratch |
| Systems Affected | `PRPs/prds/relay-execute-dogfood.prd.md` (NEW); `plugins/relay/commands/dogfood/` (NEW directory + files created by dogfood phases); `PRPs/reports/relay-execute/phase-2/dogfood.md` (NEW); `PRPs/reports/relay-execute-dogfood/orchestrator-run.json` (NEW, created by /relay-execute at runtime); `PRPs/plans/` (DRAFT plans for dogfood phases, created by /relay-plan adopted inline); `PRPs/plans/completed/` (IMPLEMENTED plans archived by /relay-implement D8 mutation b) |
| Dependencies | Phase 1 complete (`plugins/relay/commands/relay-execute.md` exists and is registered); `plugins/relay/commands/relay-plan.md` (adopted inline by orchestrator); `plugins/relay/commands/relay-plan-review.md` (adopted inline); `plugins/relay/commands/relay-implement.md` (adopted inline); `plugins/relay/agents/plan-reviewer.md` (CHANGES_REQUESTED bullet-list format lines 459-483) |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/relay-execute.prd.md` lines 226 (Implementation Phases table row 2) and 236-239 (Phase 2 Phase Details) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `PRPs/prds/relay-execute.prd.md` | 70-102 (AC-1, AC-2, AC-6, AC-12); 236-239 (Phase 2 Phase Details); 209-218 (Technical Risks) | The acceptance criteria this phase empirically validates; the phase's Goal and Success signal; the risk that D7 "may not compose cleanly" — Phase 2 is the stated mitigation |
| 1 | `plugins/relay/commands/relay-execute.md` | full file | The command under test. The dogfood implementer must read it end-to-end before running any scenario to understand exact HALT codes, artifact paths, budget caps, and AC-6 idempotent exit message |
| 1 | `PRPs/reports/reviewer-coherence-layer/dogfood.md` | 1-35 (title + Summary + Methodology); full "Cement decision" section | Prior dogfood report in this repo — canonical shape for the dogfood.md report this phase produces (Summary / Methodology / Scenario sections / Dogfood verdict). The section names differ (scenarios vs per-reviewer walks) but the metadata header + status line conventions are reusable |
| 1 | `plugins/relay/commands/relay-plan.md` | full file | Adopted inline by /relay-execute Phase A.3; the dogfood implementer must understand what plan-writer produces so they can verify the DRAFT plan path and structural completeness |
| 1 | `plugins/relay/commands/relay-plan-review.md` | full file | Adopted inline; CHANGES_REQUESTED output format determines what /relay-execute captures as `prior_feedback` |
| 1 | `plugins/relay/commands/relay-implement.md` | full file; especially Phase A.4 and the D8 mutations (lines ~340-380) | Adopted inline; D8 mutations (plan flip, plan move, PRD row flip) are what move each phase to `complete` |
| 1 | `plugins/relay/agents/plan-reviewer.md` | 459-483 | The CHANGES_REQUESTED bullet-list output format captured as `prior_feedback`; deliberately-broken plan scenario depends on this being surfaced correctly |
| 2 | `PRPs/plans/completed/relay-execute-phase-1-relay-execute-command-file.plan.md` | full file | Structural sibling — how the Phase 1 plan for this very feature was authored; the dogfood PRD's phases must be simpler than Phase 1 |
| 2 | `docs/context/plan-template.md` | full file | The template the plan-writer agent uses; the dogfood PRD must produce valid plans that satisfy R1-R8 + R-COH-* on the happy path |
| 2 | `docs/context/prd-template.md` | full file | The shape the dogfood PRD must conform to (Decision Gate block, Acceptance Criteria section, Implementation Phases table with canonical header) |
| 3 | `PRPs/plans/completed/reviewer-coherence-layer-phase-4-dogfood-validation-cement.plan.md` | Summary, Step-by-Step Tasks | Prior dogfood validation plan — shows how to structure tasks around multiple scenarios, conditional branches, and report writing |

## Patterns to Mirror

### Pattern 1 — Dogfood report header + metadata (reviewer-coherence-layer dogfood)

```markdown
# SOURCE: PRPs/reports/reviewer-coherence-layer/dogfood.md:1-13
# Dogfood Report — reviewer-coherence-layer

**Plan**: `PRPs/plans/reviewer-coherence-layer-phase-4-dogfood-validation-cement.plan.md`
**Source PRD**: `PRPs/prds/reviewer-coherence-layer.prd.md`
**Date**: 2026-04-28
**Status**: COMPLETE
**Cement decision**: PASS (with documented AC-6 ≥1 TP requirement evolution)

---

## Summary
{one paragraph synthesizing all scenario outcomes}
```

Used by Task 6 to write the `PRPs/reports/relay-execute/phase-2/dogfood.md` header. The `**Plan**`, `**Source PRD**`, `**Date**`, `**Status**` metadata block is canonical across relay dogfood reports. The `/relay-execute` dogfood replaces `**Cement decision**` with `**Dogfood verdict**` (PASS / FAIL).

### Pattern 2 — Implementation Phases table canonical header (relay-execute.md precondition P3)

```markdown
# SOURCE: plugins/relay/commands/relay-execute.md:103-104
| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
```

The dogfood PRD authored in Task 1 MUST use this exact header line, byte-for-byte, or `/relay-execute` will HALT at P3. Used by Task 1 when authoring `PRPs/prds/relay-execute-dogfood.prd.md`.

### Pattern 3 — orchestrator-run.json ALL_PHASES_COMPLETE shape (relay-execute.md Phase A.1)

```json
// SOURCE: plugins/relay/commands/relay-execute.md:197-210
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": "<ISO timestamp>",
  "max_plan_review_retries": 2,
  "max_orchestrator_minutes": 240,
  "phases": <orchestrator_run_log>,
  "outcome": "ALL_PHASES_COMPLETE",
  "phases_completed": <phases_completed>
}
```

Used by Task 3 (happy-path verification) to confirm the `orchestrator-run.json` produced by `/relay-execute` has the correct top-level shape and `"outcome": "ALL_PHASES_COMPLETE"`.

### Pattern 4 — orchestrator-halt.json FAILED_PLAN_REVIEW_BUDGET_EXCEEDED shape (relay-execute.md Phase A.3)

```json
// SOURCE: plugins/relay/commands/relay-execute.md:273-282
{
  "outcome": "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED",
  "phase_N": <N>,
  "failing_rubric_items": <captured defect list>,
  "plan_review_attempts": <plan_review_attempts>,
  "orchestrator_run_log": <orchestrator_run_log>
}
```

Used by Task 4 (HALT-path verification) to confirm the `orchestrator-halt.json` shape when `max_plan_review_retries=2` is exhausted. The `failing_rubric_items` must name the specific rubric IDs that failed (e.g., R4 missing VALIDATE).

### Pattern 5 — Prior dogfood plan Scenario section structure (reviewer-coherence-layer Phase 4)

```markdown
# SOURCE: PRPs/plans/completed/reviewer-coherence-layer-phase-4-dogfood-validation-cement.plan.md:199-215
### Task 1: Walk prd-reviewer's R-COH-* layer against ≥3 APPROVED PRDs; classify findings

**ACTION**: For each PRD in the dogfood sample…
  1. Read the PRD body…
  2. For each deterministic check…
  3. Classify TP/FP…

**MIRROR**: Pattern 2 (…)

**VALIDATE**: After this task, the dogfood.md draft must contain ≥3 prd-reviewer subsections…
```

Used to shape this plan's Step-by-Step Tasks: each task has a numbered ACTION sequence, a MIRROR reference, and a VALIDATE grep/test command.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `PRPs/prds/relay-execute-dogfood.prd.md` | CREATE | Synthetic APPROVED PRD that /relay-execute runs against. Must conform to docs/context/prd-template.md (canonical Implementation Phases table header; Decision Gate block; AC section; Status: APPROVED trailing line). Two phases, trivial deliverables (no-op markdown files). |
| `plugins/relay/commands/dogfood/` | CREATE (directory) | Dogfood phases create no-op markdown files here. The directory is the target for dogfood phase deliverables. Created implicitly when Task 2 / Task 3 run /relay-execute which adopts /relay-implement. |
| `PRPs/reports/relay-execute/phase-2/dogfood.md` | CREATE | Dogfood report documenting all three scenario outcomes (happy path, HALT path, idempotency). Canonical shape mirrors `PRPs/reports/reviewer-coherence-layer/dogfood.md`. |
| `PRPs/reports/relay-execute-dogfood/orchestrator-run.json` | CREATE (at runtime by /relay-execute) | Produced by /relay-execute Phase A.1 on ALL_PHASES_COMPLETE. Verified by Task 3. |
| `PRPs/plans/completed/` | UPDATE (at runtime by /relay-implement D8 Mutation b) | /relay-implement archives each dogfood phase's IMPLEMENTED plan here. Verified by Task 3. |

## NOT Building (Scope Limits)

- **`/relay-test` and `/relay-test-review` integration in the dogfood.** Those commands are unshipped for the relay repo (no test suite exists). The orchestrator's command-exists guard surfaces a warning and proceeds with the non-test path; this is verified by the happy-path scenario but no test-stage HALT is deliberately induced.
- **Multi-PRD orchestration.** The dogfood validates one PRD. Cross-PRD coordination is a separate orchestrator's job (explicitly out of scope per source PRD).
- **`--auto-commit` or `--from-phase` flags.** Could-items deferred per source PRD's "What We're NOT Building". The dogfood uses the plain `/relay-execute` invocation.
- **Parallel phase orchestration** (non-empty `Parallel` cell). The dogfood PRD's phases have `-` in their `Parallel` cells. Parallel orchestration is a Could-item for MVP.
- **B7/B8 TDD integration.** Dead code in MVP; the dogfood explicitly does NOT activate `tdd: true`.
- **A dedicated `relay-execute-dogfood` agent.** The dogfood implementer (this plan's implementer) runs /relay-execute directly; no wrapper agent is created.
- **Docs updates + version bump.** That is Phase 3's deliverable. Phase 2 ends with the dogfood report; the v0.9.0 changelog entry and plugin.json bump are Phase 3 tasks.
- **Recovery from `/relay-implement` `PARTIAL_D8_FAILURE`.** The dogfood happy-path and HALT-path scenarios use clean state; D8 partial-failure recovery is a manual procedure documented in the source PRD and is not the subject of this dogfood.

## Step-by-Step Tasks

### Task 1: Author `PRPs/prds/relay-execute-dogfood.prd.md` — minimal APPROVED PRD

**ACTION**:
1. Author a minimal PRD conforming to `docs/context/prd-template.md` at `PRPs/prds/relay-execute-dogfood.prd.md`. The PRD MUST:
   - Include the canonical Decision Gate evidence block (fenced, immediately below the title). Use `Result: PROCEED` (no conflicts — the dogfood creates no-op files in a new directory).
   - Include exactly two Implementation Phases with the byte-exact header:
     `| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`
   - Phase 1: `create dogfood-file-1.md` — Description: "Create `plugins/relay/commands/dogfood/dogfood-file-1.md` as a no-op markdown file with a single `# Dogfood file 1` heading." Status: `pending`. Parallel: `-`. Depends: `-`. PRP Plan: `-`.
   - Phase 2: `create dogfood-file-2.md` — Description: "Create `plugins/relay/commands/dogfood/dogfood-file-2.md` as a no-op markdown file with a single `# Dogfood file 2` heading." Status: `pending`. Parallel: `-`. Depends: `1`. PRP Plan: `-`.
   - Include Phase Details for each phase with Goal + Scope + Success signal.
   - Include a minimal Acceptance Criteria section with at least AC-1 (dogfood-file-1.md created) and AC-2 (dogfood-file-2.md created after Phase 1 completes).
   - Include trailing lines: `*Generated: 2026-05-01*` then `*Approved: 2026-05-01*` then `*Status: APPROVED*`.
2. The PRD must NOT include fields that would require external dependencies (no `tdd: true`, no framework references, no external URLs in the scope).

**MIRROR**: Pattern 2 (canonical Implementation Phases table header — must match byte-for-byte or P3 will HALT).

**VALIDATE**: `grep -c '^\*Status: APPROVED\*' PRPs/prds/relay-execute-dogfood.prd.md` must equal `1`; `grep -c '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |' PRPs/prds/relay-execute-dogfood.prd.md` must equal `1`; `grep -c 'pending' PRPs/prds/relay-execute-dogfood.prd.md` must be ≥ `2` (both phases start pending).

### Task 2: Run Scenario 1 — Happy path end-to-end

**ACTION**:
1. Invoke `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md` (or adopt the relay-execute protocol inline, reading `plugins/relay/commands/relay-execute.md` and executing its full protocol against the dogfood PRD).
2. Observe the orchestration loop:
   - Phase A.1 picks Phase 1 (lowest `pending` row, Depends `-`).
   - Phase A.3 adopts `/relay-plan` role: produces a DRAFT plan at `PRPs/plans/relay-execute-dogfood-phase-1-create-dogfood-file-1md.plan.md`.
   - Phase A.3 adopts `/relay-plan-review` role: reviews the DRAFT; expect APPROVED on first attempt (trivial plan with straightforward tasks).
   - Phase A.4 adopts `/relay-implement` role: creates `plugins/relay/commands/dogfood/dogfood-file-1.md`; performs D8 mutations (plan flip → IMPLEMENTED, plan move → `PRPs/plans/completed/`, PRD row 1 → `complete`).
   - Phase A.5: `/relay-test` command-exists guard fires (command unshipped for relay repo); warning emitted; proceeds.
   - Loop back to Phase A.1: picks Phase 2 (Depends `1`, now `complete`).
   - Repeat for Phase 2 deliverable (`dogfood-file-2.md`).
   - Phase A.1 finds no actionable rows: writes `orchestrator-run.json` with `"outcome": "ALL_PHASES_COMPLETE"`.
3. Record all per-stage outcomes (plan paths, review verdicts, implement outcomes, orchestrator-run.json content) for the dogfood report.

**MIRROR**: Pattern 3 (orchestrator-run.json ALL_PHASES_COMPLETE shape — verify the produced JSON matches this schema).

**VALIDATE**: `test -f PRPs/reports/relay-execute-dogfood/orchestrator-run.json && grep -c '"outcome": "ALL_PHASES_COMPLETE"' PRPs/reports/relay-execute-dogfood/orchestrator-run.json` must equal `1`; `test -f plugins/relay/commands/dogfood/dogfood-file-1.md && test -f plugins/relay/commands/dogfood/dogfood-file-2.md && echo OK` must print `OK`; `grep -c '"stage": "plan", "outcome": "APPROVED"' PRPs/reports/relay-execute-dogfood/orchestrator-run.json` must be ≥ `2` (one per phase); `grep 'complete' PRPs/prds/relay-execute-dogfood.prd.md | grep -c '|'` must be ≥ `2` (both rows show `complete` in the Implementation Phases table).

### Task 3: Run Scenario 2 — HALT path (deliberate plan-rubric defect)

**ACTION**:
1. Reset the dogfood PRD to its Task-1 state (both phases `pending`; PRP Plan cells `-`). Use `Edit` to flip Phase 1 Status back to `pending` if it was mutated to `complete` by Scenario 1. Alternatively, prepare a fresh copy of the PRD.
2. Introduce a deliberate plan-rubric defect that will survive `/relay-plan`'s initial write AND cause `/relay-plan-review` to emit `CHANGES_REQUESTED`. The recommended defect: prepend a note to the dogfood PRD's Phase 1 Phase Details that explicitly says "VALIDATE commands are intentionally omitted from all tasks" — this directs the plan-writer to omit `VALIDATE:` lines, which will trigger plan-reviewer R4. (Alternatively, the implementer may introduce the defect directly into the DRAFT plan after the plan-writer produces it, before running plan-review.)
3. Invoke `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md` (or adopt the protocol inline).
4. Observe Phase A.3: plan-review returns `CHANGES_REQUESTED` on attempt 1; orchestrator captures the rubric defect bullet-list and re-invokes `/relay-plan` with `prior_feedback`. On attempt 2: plan-review returns `CHANGES_REQUESTED` again (if the defect is structural and the prior_feedback loop cannot resolve it without removing the Phase Details note). On attempt 3 (`plan_review_attempts > max_plan_review_retries=2`): orchestrator writes `orchestrator-halt.json` with `"outcome": "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED"` and HALTs.
5. Verify `orchestrator-halt.json` contains the expected shape (Pattern 4).
6. Record all observations for the dogfood report, including: rubric IDs in `failing_rubric_items`, `plan_review_attempts` value, and the verbatim HALT message.

**MIRROR**: Pattern 4 (orchestrator-halt.json FAILED_PLAN_REVIEW_BUDGET_EXCEEDED shape — verify the produced JSON matches this schema).

**VALIDATE**: `test -f PRPs/reports/relay-execute-dogfood/orchestrator-halt.json && grep -c '"outcome": "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED"' PRPs/reports/relay-execute-dogfood/orchestrator-halt.json` must equal `1`; `grep -c '"plan_review_attempts"' PRPs/reports/relay-execute-dogfood/orchestrator-halt.json` must equal `1`; `grep '"plan_review_attempts": 3' PRPs/reports/relay-execute-dogfood/orchestrator-halt.json` must match (attempts exhausted after 3 plan-writer invocations: initial + 2 retries = 3 total).

### Task 4: Run Scenario 3 — Idempotency check (partial completion + re-entry)

**ACTION**:
1. Reset the dogfood PRD to its Task-1 state (both phases `pending`; PRP Plan cells `-`; remove the deliberate defect from Task 3 if applicable).
2. Run the orchestrator through Phase 1 only — either by simulating an interruption after Phase 1's implement completes (both Phase 1 D8 mutations done: row 1 = `complete`; plan archived) but before Phase 2 begins, OR by setting Phase 2's Depends to a phase that doesn't exist yet (temporarily) so only Phase 1 is actionable. The recommended approach: run `/relay-execute` normally through Phase 1 (allowing it to pick up Phase 1 naturally); after Phase 1 `complete`, manually edit the dogfood PRD to temporarily add Phase 3 as a dependency blocker for Phase 2 (Depends: `3`), then invoke `/relay-execute` again to verify it picks up Phase 2 once the dependency is restored. Simpler alternative: allow the Scenario 1 run to complete only Phase 1 (stop it mid-Phase-2) and then re-invoke.
3. Re-invoke `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md`. Observe:
   - Phase A.1 reads the table: Phase 1 is `complete`; Phase 2 is `pending` with Depends `1` (now satisfied). Picks Phase 2.
   - Orchestrator executes Phase 2 through completion.
   - `orchestrator-run.json` is updated (or a new one written) with `"outcome": "ALL_PHASES_COMPLETE"`.
4. Re-invoke a third time on the fully-complete PRD (both phases `complete`). Observe Phase A.1 exits immediately with the AC-6 verbatim message: `All phases complete; nothing to orchestrate.` and writes no artifacts.
5. Record observations for the dogfood report under a dedicated "Scenario 3 — Idempotency" section.

**MIRROR**: Pattern 3 (orchestrator-run.json ALL_PHASES_COMPLETE shape — final state after re-entry).

**VALIDATE**: `grep 'complete' PRPs/prds/relay-execute-dogfood.prd.md | grep -c '|'` must be ≥ `2` after full re-entry; third invocation produces no new orchestrator-run.json artifacts (the AC-6 exit writes no file per relay-execute.md Phase A.1 — confirm by checking file modification timestamps or by grep for `"outcome"` in the existing file remaining `ALL_PHASES_COMPLETE` from the prior run).

### Task 5: Verify AC-12 — dependency re-evaluation between phases

**ACTION**:
1. As part of Scenario 3's re-entry (or as an additional micro-scenario), verify that Phase 2's `Depends: 1` cell is correctly re-evaluated after Phase 1 reaches `complete`. Specifically:
   - After Scenario 1 (or the idempotency re-entry) completes Phase 1, confirm that the `orchestrator-run.json` `phases` array records Phase 1 before Phase 2 (serial ordering correct).
   - Confirm that Phase 2 was NOT attempted before Phase 1's D8 mutations wrote `complete` to the PRD table (the orchestrator re-reads the table at each Phase A.1 iteration — D6 state machine).
2. Record the specific `phases` array from `orchestrator-run.json` in the dogfood report as evidence that Phase 2 was picked only after Phase 1's `status` was `complete`.

**MIRROR**: Pattern 3 (orchestrator-run.json phases array — verify ordering).

**VALIDATE**: `python3 -c "import json; d=json.load(open('PRPs/reports/relay-execute-dogfood/orchestrator-run.json')); phases=[p['phase'] for p in d['phases']]; assert phases.index(1) < phases.index(2), 'Phase 2 must appear after Phase 1'; print('PASS')"` must print `PASS`; or equivalent jq: `jq '[.phases[].phase]' PRPs/reports/relay-execute-dogfood/orchestrator-run.json` must output `[1, 1, 1, 2, 2, 2]` or similar ordered sequence where all Phase-1 entries precede all Phase-2 entries.

### Task 6: Write `PRPs/reports/relay-execute/phase-2/dogfood.md` with all scenario outcomes

**ACTION**:
Assemble the dogfood report at `PRPs/reports/relay-execute/phase-2/dogfood.md`. Use the canonical report shape (Pattern 1). Sections in order:
1. **Title + metadata**: `# Dogfood Report — relay-execute Phase 2`, plan path, source PRD path, date, status, dogfood verdict (PASS / FAIL).
2. **Summary**: 1 paragraph synthesizing all three scenario outcomes and confirming the D7 dispatch model composed cleanly.
3. **Methodology**: how the dogfood was run (the implementer adopts /relay-execute's protocol; synthetic PRD with 2 trivial phases; three scenarios exercised; what "PASS" means for this dogfood — AC-1, AC-2, AC-6 all satisfied with observable evidence).
4. **Scenario 1 — Happy path**: Per-phase table showing: phase number, plan-review verdict (APPROVED / retries), implement outcome, D8 mutations verified, orchestrator-run.json `"outcome"` field. Evidence: `orchestrator-run.json` content verbatim (or excerpt).
5. **Scenario 2 — HALT path**: Deliberate defect description; rubric IDs in `failing_rubric_items`; `plan_review_attempts` value; orchestrator-halt.json content verbatim (or excerpt); confirmation that HALT message matched relay-execute.md's verbatim format.
6. **Scenario 3 — Idempotency**: Partial-completion state before re-entry; Phase A.1 pick after re-entry (Phase 2, Depends `1` satisfied); final `orchestrator-run.json` outcome; third-invocation AC-6 exit message evidence.
7. **AC-12 dependency re-evaluation evidence**: `phases` array from `orchestrator-run.json` confirming serial ordering (Phase 1 entries before Phase 2 entries).
8. **Dogfood verdict**: explicit `## Dogfood verdict: PASS` (or FAIL with rationale). PASS requires: Scenario 1 ✓ (ALL_PHASES_COMPLETE, zero user prompts, plans archived, orchestrator-run.json schema matches Pattern 3); Scenario 2 ✓ (FAILED_PLAN_REVIEW_BUDGET_EXCEEDED, orchestrator-halt.json schema matches Pattern 4, plan_review_attempts=3); Scenario 3 ✓ (idempotent re-entry picks up Phase 2; third invocation exits with AC-6 message and writes no artifacts).
9. **Trailing metadata**: `*Generated: 2026-05-01*` + `*Status: COMPLETE*`.

**MIRROR**: Pattern 1 (dogfood report header + metadata from reviewer-coherence-layer dogfood).

**VALIDATE**: `test -f PRPs/reports/relay-execute/phase-2/dogfood.md && echo OK` must print `OK`; `grep -c '^## Dogfood verdict: PASS' PRPs/reports/relay-execute/phase-2/dogfood.md` must equal `1` (in the happy path); `grep -cE '^## Scenario [123]' PRPs/reports/relay-execute/phase-2/dogfood.md` must equal `3`; `grep -c 'FAILED_PLAN_REVIEW_BUDGET_EXCEEDED' PRPs/reports/relay-execute/phase-2/dogfood.md` must be ≥ `1`; `grep -c 'ALL_PHASES_COMPLETE' PRPs/reports/relay-execute/phase-2/dogfood.md` must be ≥ `1`.

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify dogfood PRD is well-formed markdown with APPROVED status
grep -c '^\*Status: APPROVED\*' PRPs/prds/relay-execute-dogfood.prd.md

# Verify canonical Implementation Phases table header present in dogfood PRD
grep -c '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |' PRPs/prds/relay-execute-dogfood.prd.md

# Verify dogfood report file exists and has COMPLETE status
grep -c '^\*Status: COMPLETE\*' PRPs/reports/relay-execute/phase-2/dogfood.md

# Verify orchestrator-run.json is valid JSON
python3 -c "import json; json.load(open('PRPs/reports/relay-execute-dogfood/orchestrator-run.json')); print('valid JSON')"

# Verify orchestrator-halt.json is valid JSON (written by Scenario 2)
python3 -c "import json; json.load(open('PRPs/reports/relay-execute-dogfood/orchestrator-halt.json')); print('valid JSON')"
```

### Level 2 — CONTENT_INVARIANTS

```bash
# orchestrator-run.json has ALL_PHASES_COMPLETE outcome (happy path)
grep -c '"outcome": "ALL_PHASES_COMPLETE"' PRPs/reports/relay-execute-dogfood/orchestrator-run.json

# orchestrator-halt.json has FAILED_PLAN_REVIEW_BUDGET_EXCEEDED (HALT path)
grep -c '"outcome": "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED"' PRPs/reports/relay-execute-dogfood/orchestrator-halt.json

# Dogfood phases created their deliverable files
test -f plugins/relay/commands/dogfood/dogfood-file-1.md && test -f plugins/relay/commands/dogfood/dogfood-file-2.md && echo "dogfood files OK"

# Dogfood PRD's both rows reached complete (after happy path)
grep -c '| complete |' PRPs/prds/relay-execute-dogfood.prd.md

# Plans were archived (D8 Mutation b confirmed)
ls PRPs/plans/completed/ | grep 'relay-execute-dogfood'

# Dogfood report has all 3 scenario sections
grep -cE '^## Scenario [123]' PRPs/reports/relay-execute/phase-2/dogfood.md

# Dogfood report has PASS verdict
grep -c '^## Dogfood verdict: PASS' PRPs/reports/relay-execute/phase-2/dogfood.md

# AC-12: Phase ordering correct in orchestrator-run.json
python3 -c "import json; d=json.load(open('PRPs/reports/relay-execute-dogfood/orchestrator-run.json')); phases=[p['phase'] for p in d['phases']]; assert all(p==1 for p in phases[:phases.index(2)]), 'Phase 2 must follow all Phase 1 entries'; print('AC-12 OK')"
```

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

```bash
# Third invocation exits 0 with AC-6 message (all phases complete; nothing to orchestrate)
# Since relay-execute is a Claude Code command, verify by checking the PRD table state:
grep -c 'complete' PRPs/prds/relay-execute-dogfood.prd.md

# Verify source PRD's row N was back-filled by plan-writer (PRP Plan cells populated)
grep 'relay-execute-dogfood' PRPs/prds/relay-execute-dogfood.prd.md | grep 'PRPs/plans'

# Verify IMPLEMENTED plans present in completed/ for both dogfood phases
test -f PRPs/plans/completed/relay-execute-dogfood-phase-1-create-dogfood-file-1md.plan.md && echo "Phase 1 plan archived"
test -f PRPs/plans/completed/relay-execute-dogfood-phase-2-create-dogfood-file-2md.plan.md && echo "Phase 2 plan archived"

# Verify no artifacts written under .claude/ (anti-pattern check)
find . -path './.git' -prune -o -path './plugins/prp-core' -prune -o -name '*.json' -print | grep '\.claude/' | grep -v settings && echo "no .claude artifacts" || echo "VIOLATION: .claude artifact found"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md` is invoked against the synthetic 2-phase APPROVED PRD (Scenario 1), when the orchestration loop completes, then `PRPs/reports/relay-execute-dogfood/orchestrator-run.json` exists with `"outcome": "ALL_PHASES_COMPLETE"`, the `phases` array contains per-stage entries for both Phase 1 and Phase 2, `plugins/relay/commands/dogfood/dogfood-file-1.md` and `dogfood-file-2.md` exist, both plans are archived under `PRPs/plans/completed/`, and the dogfood PRD's both Implementation Phases rows show `complete` — with zero user prompts between PRD-APPROVED invocation and the success terminal message.

- **AC-A2 (PRD AC-2):** Given a deliberate plan-rubric defect (e.g., missing `VALIDATE:` line on all tasks) causes `/relay-plan-review` to return `CHANGES_REQUESTED` on Phase 1 of the dogfood PRD (Scenario 2), when `/relay-execute` runs, then it captures the rubric defect bullet-list (plan-reviewer R4 cited in `failing_rubric_items`), re-invokes `/relay-plan` with the defects as `prior_feedback` up to `max_plan_review_retries=2`, and after 3 total plan-writer invocations (initial + 2 retries) HALTs with `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`; `orchestrator-halt.json` exists with `"plan_review_attempts": 3` and `"failing_rubric_items"` naming the defect; the HALT message matches the verbatim format in `relay-execute.md` Phase A.3.

- **AC-A3 (PRD AC-6):** Given the synthetic dogfood PRD with both phases `complete` (Scenario 3, third invocation), when `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md` is invoked, then it exits immediately with the verbatim message `All phases complete; nothing to orchestrate.` and writes no new artifacts (no `orchestrator-run.json` overwrite, no `orchestrator-halt.json`).

- **AC-A4 (PRD AC-12):** Given the dogfood PRD's Phase 2 has `Depends: 1`, when `/relay-execute` completes Phase 1 and loops back to Phase A.1, then the re-read of the Implementation Phases table reveals Phase 1 is now `complete`, making Phase 2 actionable; the `orchestrator-run.json` `phases` array records all Phase 1 entries before any Phase 2 entries; Phase 2 was never attempted while Phase 1 was still `pending` or `in-progress`.

- **AC-A5 (PRD AC-1 + AC-8):** Given any invocation of `/relay-execute` in any scenario (happy path, HALT path, idempotency), when any artifact is written (`orchestrator-run.json`, `orchestrator-halt.json`, DRAFT plans, dogfood PRD), then no path resolves under `.claude/`; all artifacts are under `PRPs/` at the repository root.

- **AC-A6 (PRD AC-1 + AC-2):** Given the dogfood report at `PRPs/reports/relay-execute/phase-2/dogfood.md`, when it is read, then it contains all 3 scenario sections (Scenario 1 — Happy path; Scenario 2 — HALT path; Scenario 3 — Idempotency), plus an AC-12 dependency re-evaluation evidence section, plus an explicit `## Dogfood verdict: PASS` section with rationale; the `*Status: COMPLETE*` trailing line is present.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| D7 inline command-protocol adoption via `Read` does not compose cleanly — the LLM adopting /relay-execute's protocol may not correctly inherit /relay-plan's protocol from a nested Read | Medium | High (blocks dogfood PASS; blocks v0.9.0 release) | If the pattern fails, document the failure mode verbatim in the dogfood report's Scenario 1 section and fall back to the wrapper-agent passthrough documented in the PRD's Technical Risks (Mitigation column); that fallback itself then needs a fast-follow plan |
| The synthetic dogfood PRD's trivial phases produce plans so simple that the plan-reviewer APPROVES even the deliberately-defective plan in Scenario 2 | Low | Medium (Scenario 2 cannot be validated) | Choose a defect type that is deterministic and structural (missing VALIDATE: on ALL tasks) rather than semantic; the plan-reviewer's R4 is a grep-level check that fires regardless of task content |
| orchestrator-run.json schema produced by the actual relay-execute.md differs from the Pattern 3 schema documented in the plan | Low | Medium (Validation Commands fail) | Read relay-execute.md Phase A.1 JSON block before writing the VALIDATE commands; Pattern 3 is sourced directly from that file; if the file changed since plan-write, update the VALIDATE grep accordingly |
| Scenario 3 idempotency check is difficult to verify without an actual interruption mechanism | Medium | Low | Accept the partial-completion simulation approach (manually editing Phase 2's Depends cell to block it, running Phase 1, restoring, re-invoking); document the simulation approach explicitly in the dogfood report's Methodology section |
| The dogfood creates files in `plugins/relay/commands/dogfood/` that must be cleaned up or committed | Low | Low | The files are intentional artifacts of the dogfood; commit them as part of the Phase 2 deliverable; their presence is evidence the orchestrator completed the implement stage |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

- **Phase 2 is a validation phase, not an implementation phase.** No new agent code or command files are shipped in Phase 2. The deliverables are: (1) `PRPs/prds/relay-execute-dogfood.prd.md` (a synthetic APPROVED PRD used as a test fixture); (2) `PRPs/reports/relay-execute/phase-2/dogfood.md` (the dogfood report documenting the three scenario outcomes). The files created inside `plugins/relay/commands/dogfood/` are runtime evidence of the orchestrator's implementation stage and are committed as Phase 2 artifacts.

- **orchestrator-run.json path note.** Per `relay-execute.md` Phase A.1, the file is written at `PRPs/reports/<feature>/orchestrator-run.json` where `<feature>` is parsed from the PRD path. For the dogfood PRD at `PRPs/prds/relay-execute-dogfood.prd.md`, `<feature>` = `relay-execute-dogfood`. The actual path is therefore `PRPs/reports/relay-execute-dogfood/orchestrator-run.json`. The plan's Validation Commands use the feature-specific path. The dogfood report documents this explicitly.

- **HALT-path scenario cleanup.** Scenario 2 produces an `orchestrator-halt.json` at `PRPs/reports/relay-execute-dogfood/orchestrator-halt.json`. Between scenarios, the implementer resets the dogfood PRD's row statuses and removes or renames prior artifacts to keep scenario evidence isolated. The dogfood report's Methodology section documents the reset procedure.

- **The dogfood report does NOT go through DRAFT → APPROVED.** It is a one-shot report, trailing `*Status: COMPLETE*` per the `reviewer-coherence-layer/dogfood.md` convention.

- **No `/relay-test` / `/relay-test-review` in the dogfood.** Those commands are unshipped for the relay repo itself (no test suite exists). The orchestrator's command-exists guard (P1 of /relay-test's preconditions, per relay-execute.md Phase A.5) should surface a structured warning and proceed. The Scenario 1 happy-path observation must document whether the guard fired and what message was emitted; this is a secondary validation of AC-13 (graceful degradation without /relay-worktree / missing downstream commands).

- **Phase 3 dependency.** Phase 3 (Docs updates + version bump) Depends on Phase 2 (this phase). Phase 3 will update `docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`, and `documentation/changelog.html` (v0.9.0 entry) — none of those are touched by Phase 2. The version bump (`plugins/relay/.claude-plugin/plugin.json` 0.8.0 → 0.9.0) per the §7.5 binding rule is also Phase 3's job.

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Implemented: 2026-05-01*
*Status: IMPLEMENTED*
