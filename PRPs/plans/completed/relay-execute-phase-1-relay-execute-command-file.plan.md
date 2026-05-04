# Feature: /relay-execute command file (Phase 1 of relay-execute)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: new command file in plugins/relay/commands/; cross-cutting orchestrator command composing four shipped writer/reviewer pairs; impacts source PRD's Implementation Phases state machine; references implementation-authoring D8 + plan-authoring D6; affects PRPs/reports/<feature>/ artifact paths; capstone command for project Phase 3 — Pillar 2
- Decisions found:
  - Command surface writer/reviewer split (docs/decisions.md, 2026-04-19) — orchestrator dispatches existing pairs; never bundles
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - Interactivity boundary: PRD interactive, downstream autonomous (docs/decisions.md, 2026-04-19)
  - Narrow Bash allowlist patterns at agent layer (docs/decisions.md, 2026-04-19)
  - D8 post-approval mutations are best-effort atomic with rollback note (docs/decisions.md, 2026-04-30)
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
  - Plugin manifest version-sync rule §7.5 (documentation/AGENTS.md, codified commit 26860fc 2026-04-30)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66)
  - Logic duplication across command files — orchestrator references each command file by path and adopts its protocol inline, not by pasting steps
  - Bypassing the writer/reviewer split — orchestrator dispatches existing pairs; never bundles
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary applies — orchestrator never prompts
  - PRPs/ artifact paths; writer/reviewer split; graceful degradation when /relay-worktree absent (operate in cwd against current branch)
  - Per-stage commands own their own internal loops and budgets; orchestrator adds only two new budgets
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-execute.prd.md` — Implementation Phases row 1: "/relay-execute command file" — Goal: ship `plugins/relay/commands/relay-execute.md` as the orchestrator command file, structurally analogous to `/relay-implement` but composing five downstream commands instead of two agents — Success signal: the file passes the plan-reviewer's 8-item structural rubric + R-COH-* coherence layer when its plan is reviewed; manual read-through confirms zero logic duplication against the five referenced command files.

## Summary

This phase delivers a single markdown command file at `plugins/relay/commands/relay-execute.md` — the capstone `/relay-execute` orchestrator for the relay pipeline. The file mirrors the structural shape of `/relay-implement` (frontmatter → Decision Gate → Parse arguments → Preconditions → Phase A multi-phase orchestration loop → Final output → Constraints → What you do NOT do) but composes five downstream commands (relay-plan, relay-plan-review, relay-implement, relay-test, relay-test-review) instead of two agents. It encodes the multi-phase loop logic: actionable-row selection mirroring plan-writer Step 1.3, per-phase sub-flow (inline command-protocol adoption via Read), state-transition recording to `PRPs/reports/<feature>/orchestrator-run.json`, bounded plan-review retry loop, HALT propagation for downstream failures, and idempotent re-entry on next iteration. No companion agent, no other source files are created in this phase.

## User Story

```
As a relay pipeline developer
I want a single /relay-execute <prd-path> command that drives every downstream stage (plan → review → implement → test → test-review) for every actionable phase to completion
So that I can walk away while the autonomous pipeline runs and review only the terminal state — without manually invoking /relay-plan, /relay-plan-review, /relay-implement, /relay-test, and /relay-test-review per phase per feature
```

## Problem Statement

A developer running the relay pipeline against a target project today must invoke `/relay-plan`, `/relay-plan-review`, `/relay-implement` (and eventually `/relay-test`, `/relay-test-review`) by hand for **every** actionable phase of an APPROVED PRD, re-evaluating the Implementation Phases dependency graph between each invocation. The implementation-authoring stack (v0.8.0) explicitly notes its constraint #8: "Never re-run the writer↔reviewer pair across `/relay-implement` invocations. That is `/relay-execute`'s call." The orchestrator is a documented gap. Every multi-phase feature is a manual loop the developer must drive, which is the bottleneck the relay project's "one prompt → PR" promise is supposed to remove.

## Solution Statement

Ship `plugins/relay/commands/relay-execute.md` as a single orchestrator command file that (a) iterates the source PRD's Implementation Phases table serially, picking the lowest-numbered `pending` row whose `Depends` cell is empty or all-`complete` (mirrors plan-writer Step 1.3 verbatim); (b) for each picked phase adopts, in order, the protocols of `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, and `/relay-test-review` by reading each command file inline (D7 dispatch model — zero logic duplication); (c) enforces two new orchestration-layer budgets (`max_plan_review_retries`, `max_orchestrator_minutes`); (d) records per-stage state transitions to `PRPs/reports/<feature>/orchestrator-run.json`; and (e) propagates HALT outcomes verbatim from downstream stages. The source PRD's Implementation Phases table IS the state machine, making re-invocation idempotent without a separate state file (D6).

## Metadata

| Key | Value |
|-----|-------|
| Type | New command file (markdown prompt) |
| Complexity | High — novel inline command-protocol adoption pattern (D7); multi-phase state machine; seven distinct HALT outcome codes; plan-review feedback loop |
| Systems Affected | `plugins/relay/commands/` (new file); `PRPs/reports/<feature>/` (orchestrator-run.json + orchestrator-halt.json artifacts at runtime); source PRD Implementation Phases table (state machine, mutated by adopted commands) |
| Dependencies | `plugins/relay/commands/relay-implement.md` (structural template); `plugins/relay/commands/relay-plan.md` (adopted inline); `plugins/relay/commands/relay-plan-review.md` (adopted inline); `plugins/relay/agents/plan-reviewer.md` (CHANGES_REQUESTED bullet-list format captured at lines 459-483); `plugins/relay/commands/relay-test.md` (run.json schema reference at lines 176-197); `docs/context/methodology.md` (tdd: routing) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-execute.prd.md` lines 223-227 (Implementation Phases table row 1) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| MUST | `PRPs/prds/relay-execute.prd.md` | 1-306 | Source PRD — full Decision Gate, AC-1 through AC-16, D1–D16 decisions, Technical Risks, User Flow (lines 174-188), Architecture Notes (lines 202-217) |
| MUST | `plugins/relay/commands/relay-implement.md` | 1-461 | Canonical structural sibling — mirrors its shape exactly (frontmatter, Decision Gate, Parse arguments, Preconditions P1–P5, Phase A.0–A.4 loop, Final output, Constraints, What you do NOT do) |
| MUST | `plugins/relay/commands/relay-plan.md` | 120-153 | P4 actionable-row selection rule (plan-writer Step 1.3 verbatim) — the state-machine core of Phase A loop |
| MUST | `plugins/relay/agents/plan-reviewer.md` | 457-484 | CHANGES_REQUESTED bullet-list output format that /relay-execute captures as `prior_feedback` for the plan-review retry loop |
| MUST | `plugins/relay/commands/relay-test.md` | 171-197 | run.json schema — orchestrator-run.json mirrors this shape at the orchestration level |
| SHOULD | `plugins/relay/commands/relay-plan.md` | 1-278 | Full sibling writer-only command shape (Decision Gate emission, all Preconditions, Final output, Constraints, What you do NOT do sections) |
| SHOULD | `docs/context/plan-template.md` | 1-272 | Plan template — the implementer consumes plans conforming to this; relevant because /relay-execute adopts /relay-implement which reads the plan |
| SHOULD | `docs/context/architecture.md` | 55-97 | Interactivity boundary + PRP artifact paths — two architectural rules the command must enforce |

## Patterns to Mirror

### Pattern 1 — Frontmatter shape (command-file)

# SOURCE: `plugins/relay/commands/relay-implement.md:1-4`

```yaml
---
description: 'Autonomous code generation from an APPROVED plan. Validates the plan path, runs preconditions, then adopts the implementer/code-reviewer pair via an internal writer↔reviewer loop with bounded retries (max_implement_retries=3), wall-clock budget (max_implement_minutes=45), oscillation detection always-on, dispute cap (max_disputes_per_session=2), per-attempt diff capture at PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch, and on APPROVED rubric performs all three D8 post-approval mutations atomically (plan trailing-block flip to *Status: IMPLEMENTED*, plan move to PRPs/plans/completed/, source PRD row N flip from in-progress to complete). Reviewer adoption is single-shot via Task per attempt — there is no Phase B; the loop lives entirely inside Phase A.'
argument-hint: <plan-path>
---
```

**Used by:** Task 1 (CREATE `plugins/relay/commands/relay-execute.md` frontmatter). Adapt `description` to describe the orchestrator's multi-phase loop, substituting the correct argument-hint `<prd-path>`.

---

### Pattern 2 — Decision Gate emission block

# SOURCE: `plugins/relay/commands/relay-implement.md:28-48`

```markdown
## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command creates a cross-cutting artifact (the implementation diff that the Test Runner consumes); the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project — these are the same three files the implementer and code-reviewer agents consult in their Phase 0 setups when assembling their own Decision Gate references. Your gate here covers the *command invocation*; the agents' gates inside their dispatch payloads cover the *plan being implemented*.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: {semicolon-separated list — typically: cross-cutting artifact creation; impact on Test Runner; third writer/reviewer pair execution; references source PRD D7+D8+D9+D11}
- Decisions found:
  - {decision 1, e.g. command surface writer/reviewer split (2026-04-19)}
  - {decision 2, e.g. PRP artifact paths under PRPs/ (2026-04-19)}
  - ...
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66)
  - Weakening tests to make the loop turn green (D9 Layer 0 R-X enforcement)
- Applicable architectural rules:
  - Three-pillar Pillar 2; interactivity boundary; PRPs/ artifact paths; writer/reviewer split; graceful degradation
- Result: PROCEED | HALT (reason)
```
```

**Used by:** Task 2 (Decision Gate section + P4 Decision Gate sources precondition). Adapt Activated criteria to reference orchestration-specific concerns: cross-cutting orchestrator command; composes 4 shipped writer/reviewer pairs; impacts source PRD's state machine; references implementation-authoring D8 + plan-authoring D6.

---

### Pattern 3 — Preconditions + HALT messages shape

# SOURCE: `plugins/relay/commands/relay-implement.md:83-170`

```markdown
## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail. The HALTs are surfaced verbatim and the command exits without writing any code, any per-attempt artifact, or any code-review.jsonl entry.

### P1 — Plan path resolves to a readable file

If `plan_path` does not point at an existing readable file:

> I cannot start implementation without `<plan_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-implement PRPs/plans/<feature>-phase-<N>-<slug>.plan.md

### P2 — Plan ends with `*Status: APPROVED*`
...
### P3 — Source PRD row N status cell is `in-progress`
...
### P4 — Decision Gate sources readable
...
### P5 — Base-commit derivable
```

**Used by:** Task 3 (Preconditions section). Mirror this shape with orchestrator-specific preconditions: P1 PRD path readable, P2 PRD ends with `*Status: APPROVED*`, P3 Implementation Phases table parseable (canonical header), P4 Decision Gate sources readable (AC-9 byte-exact halt message), P5 methodology.md tdd routing emitted + concurrency soft-fail diagnostic.

---

### Pattern 4 — Phase A loop initialization and budget state

# SOURCE: `plugins/relay/commands/relay-implement.md:179-190`

```markdown
### Phase A.0 — Initialise loop state

Set the budget caps and counters:

- `max_implement_retries = 3` (4 attempts total including the initial)
- `max_implement_minutes = 45` (wall-clock; 0 forbidden per source PRD D7)
- `max_disputes_per_session = 2` (TEST_CONTRACT_DISPUTE cap; consumes from retries per D9 Layer 1)
- `attempt = 1`
- `disputes_used = 0`
- `deadline_ts = now() + max_implement_minutes minutes`
- `files_changed_by_attempt: dict<int, set<str>> = {}` — populated from each attempt's diff.patch
- `last_reviewer_feedback: list<{rubric_id, reason}> = []` — carried into the next attempt's implementer prompt

Soft-fail concurrency diagnostic per source PRD D18: `Glob` `PRPs/reports/<feature>/phase-<N>/attempts/*/diff.patch` for any in-flight attempt...
```

**Used by:** Task 4 (Phase A — orchestration loop, Phase A.0 init). Adapt to orchestrator's two new budgets: `max_plan_review_retries` (default 2) and `max_orchestrator_minutes` (default 240). Add `orchestrator_run_log: list<stage_record>` for the orchestrator-run.json accumulator. Soft-fail concurrency diagnostic: Glob for in-flight `orchestrator-run.json` without a terminal entry.

---

### Pattern 5 — Actionable-row selection rule

# SOURCE: `plugins/relay/commands/relay-plan.md:126-153`

```markdown
### P4 — At least one actionable phase exists

Locate the Implementation Phases table in the PRD by exact-match header line:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

...Parse the data rows that follow...

A row is **actionable** when:
- Its `Status` cell equals `pending` (case-sensitive), AND
- Its `Depends` cell is `-` (empty) OR every comma-separated phase number listed has `Status == complete`.
```

**Used by:** Task 4 (Phase A — orchestration loop, per-iteration row selection). The orchestrator re-reads the Implementation Phases table on each loop iteration after the previous phase reaches `complete`, re-applying this exact rule to pick the next actionable row.

---

### Pattern 6 — CHANGES_REQUESTED bullet-list format (plan-reviewer output)

# SOURCE: `plugins/relay/agents/plan-reviewer.md:459-483`

```markdown
2. Emit a bullet list naming each failing rubric item by ID + reason. Example:

   > **Rubric found defects.**
   >
   > - **R3** — Patterns to Mirror contains "TBD - needs validation"
   >   in 2 snippet SOURCE headers; mandatory section cannot defer.
   > - **R4** — Only 2 tasks under Step-by-Step Tasks; rubric
   >   requires at least 3.
   > - **R8** — Plan AC-A2 references PRD AC-99 which does not
   >   exist in `PRPs/prds/<feature>.prd.md`.
   >
   > File left at `*Status: DRAFT*`. Resolve the defects and re-run
   > `/relay-plan-review`, or hand back to `plan-writer` for
   > structural regeneration via `Task`.
```

**Used by:** Task 4 (Phase A — plan-review retry sub-flow). The orchestrator captures this bullet-list output from `/relay-plan-review`'s CHANGES_REQUESTED response and feeds the defect list as `prior_feedback` into the next `/relay-plan` invocation, bounded by `max_plan_review_retries`.

---

### Pattern 7 — orchestrator-run.json schema (mirrors run.json)

# SOURCE: `plugins/relay/commands/relay-test.md:173-196`

```json
{
  "run_id": "...",
  "feature": "...",
  "started_at": "...",
  "ended_at": "...",
  "elapsed_ms": ...,
  "max_test_retries": 3,
  "max_test_minutes": 30,
  "attempts": [
    { "n": 1, "verdict": "RETRY_NEEDED", "record": "attempts/1/record.json", "implementer_diff": null },
    { "n": 2, "verdict": "GREEN", "record": "attempts/2/record.json" }
  ],
  "outcome": "GREEN | FAILED_AFTER_N_RETRIES | ...",
  "time_breakdown": { ... },
  "tdd_mode": true|false
}
```

**Used by:** Task 4 (Phase A — state-transition recording). The orchestrator-run.json mirrors this shape at the orchestration level. Substitute `phases` for `attempts`; each phase entry records per-stage outcomes: `{phase_N: {plan: "DRAFT|APPROVED", implement: "APPROVED|HALT:<code>", test: "GREEN|HALT:<code>|skipped", test_review: "APPROVED|CHANGES_REQUESTED|skipped"}}`. Outer fields: `feature`, `prd_path`, `started_at`, `ended_at`, `max_plan_review_retries`, `max_orchestrator_minutes`, `outcome`.

---

### Pattern 8 — Final output surface (success + HALT verbatim messages)

# SOURCE: `plugins/relay/commands/relay-implement.md:409-420`

```markdown
## Final output surface

On the success path (Phase A.3 standard-mode APPROVED + all three D8 mutations succeeded), emit verbatim per source PRD AC-1:

> ✅ Plan **IMPLEMENTED** at `PRPs/plans/completed/<basename>.plan.md`.
> Source PRD `PRPs/prds/<feature>.prd.md` row <N> marked `complete`.
> Implementation diff (final attempt) at
> `PRPs/reports/<feature>/phase-<N>/attempts/<attempt>/diff.patch`.
> ...

On HALT (one of `FAILED_AFTER_N_RETRIES`, ...), the user-facing message is the verbatim halt message...
```

**Used by:** Task 5 (Final output surface section). Adapt success message to orchestrator terminal state: all phases complete, plans archived, orchestrator-run.json path, "ready for /relay-pr". Adapt HALT to seven orchestrator-level outcome codes.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-execute.md` | CREATE | The sole deliverable of Phase 1 — the orchestrator command file |

## NOT Building (Scope Limits)

- **Dogfood / synthetic test PRD** — Phase 2 of the PRD; separate plan invocation
- **Docs updates (`docs/api-reference.md`, `docs/decisions.md`, `docs/context/architecture.md`)** — Phase 3 of the PRD; separate plan invocation
- **Plugin manifest version bump 0.8.0 → 0.9.0** — Phase 3 deliverable; not this phase (AC-16 applies at Phase 3)
- **`/relay-worktree` integration** — separate future command per the 2026-04-19 surface decision; orchestrator runs against cwd
- **`/relay-pr` integration** — separate future command; orchestrator surfaces "ready for /relay-pr" message
- **Parallel phase orchestration** (when row's `Parallel` cell is non-empty) — Could-item; MVP is strictly serial
- **`--auto-commit` flag** — Could-item; defer to implementation
- **`--from-phase <N>` resume flag** — idempotency via D6 state machine is sufficient for MVP
- **`--dry-run` flag** — Could-item
- **B7/B8 TDD integration in the orchestration loop** — B7/B8 are unshipped; TDD routing decision is dead code in MVP (AC-11)
- **A dedicated orchestrator agent** — the command file IS the orchestrator (D13); no `plugins/relay/agents/orchestrator.md`
- **Recovery from `/relay-implement` `PARTIAL_D8_FAILURE`** — surface and exit; manual recovery per `/relay-implement` docs
- **Recovery from `/relay-test-review` `CHANGES_REQUESTED`** — HALT with `FAILED_TEST_REVIEW_REJECTED`; manual intervention required
- **Re-running a `complete` phase** — refused via precondition
- **Multi-PRD orchestration** — one PRD per `/relay-execute` invocation
- **Real-time progress streaming** — `orchestrator-run.json` is the audit trail

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-execute.md` — frontmatter + title block

**ACTION**: Create the new file with the YAML frontmatter and opening title/arguments/mission sections. The frontmatter `description` field must summarize the orchestrator's multi-phase loop (serial orchestration of pending phases via inline command-protocol adoption; two new budgets `max_plan_review_retries` and `max_orchestrator_minutes`; seven HALT outcome codes; orchestrator-run.json audit artifact). The `argument-hint` is `<prd-path>`. The "Your mission" section mirrors `/relay-implement`'s prose style but scoped to orchestration rather than per-phase implementation.

**MIRROR**: Pattern 1 (frontmatter shape at `plugins/relay/commands/relay-implement.md:1-4`)

**SATISFIES**: AC-A8 (PRPs/ path discipline — establishes the deliverable path under `plugins/relay/commands/`, never `.claude/`) and AC-A15 (zero logic duplication — the frontmatter establishes dispatch-by-Read as the architectural primitive, not inline step pasting).

**VALIDATE**: `grep -c "argument-hint: <prd-path>" plugins/relay/commands/relay-execute.md && grep -c "max_plan_review_retries" plugins/relay/commands/relay-execute.md`

---

### Task 2: ADD Decision Gate section + See references

**ACTION**: Below the title block, add the `## Decision Gate (before any action)` section. It must instruct the LLM to consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` and emit the canonical six-line evidence block. Activated criteria must name: "cross-cutting orchestrator command; composes 4 shipped writer/reviewer pairs; impacts source PRD's Implementation Phases state machine; references implementation-authoring D8 + plan-authoring D6". Also add the `## See` references block listing the five downstream command files and the plan-reviewer agent at their `${CLAUDE_PLUGIN_ROOT}/...` paths.

**MIRROR**: Pattern 2 (Decision Gate emission at `plugins/relay/commands/relay-implement.md:28-48`)

**SATISFIES**: AC-A14 (command-level Decision Gate evidence block is the first user-facing output; six-line canonical format with orchestration-specific Activated criteria) and AC-A9 (the See references block names the same Decision Gate sources whose readability is precondition-checked at command entry).

**VALIDATE**: `grep -c "Decision Gate" plugins/relay/commands/relay-execute.md && grep -c "cross-cutting orchestrator" plugins/relay/commands/relay-execute.md`

---

### Task 3: ADD Parse arguments + Preconditions sections

**ACTION**: Add the `## Parse arguments` section (argument is a single PRD path; blank → HALT with usage message; non-existent file → fall through to P1). Then add the `## Preconditions` section with five checks:
- **P1** — PRD path resolves to a readable file (verbatim HALT message pattern from relay-plan.md P1)
- **P2** — PRD ends with `*Status: APPROVED*` (verbatim HALT message pattern from relay-plan.md P2)
- **P3** — Implementation Phases table parseable (exact-match header `| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`; HALT with same diagnostic as plan-writer Phase 1.1 if header missing; HALT with AC-2 verbatim if zero actionable phases)
- **P4** — Decision Gate sources readable (all three: `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`; HALT with AC-9 byte-exact message substituting `/relay-execute` for `/relay-implement`)
- **P5** — TDD routing emitted + concurrency soft-fail diagnostic (read `docs/context/methodology.md` tdd: value; emit startup note per AC-11 if tdd: true; Glob for in-flight `orchestrator-run.json` without terminal entry and warn-and-continue per D18)

**MIRROR**: Pattern 3 (Preconditions shape at `plugins/relay/commands/relay-implement.md:83-170`) and Pattern 5 (actionable-row selection at `plugins/relay/commands/relay-plan.md:126-153`)

**VALIDATE**: `grep -c "## Preconditions" plugins/relay/commands/relay-execute.md && grep -c "\*Status: APPROVED\*" plugins/relay/commands/relay-execute.md && grep -c "Implementation Phases table header not found" plugins/relay/commands/relay-execute.md`

---

### Task 4: ADD Phase A — multi-phase orchestration loop

**ACTION**: Add `## Phase A — Multi-phase orchestration loop` with the following sub-sections:

**Phase A.0 — Initialise orchestrator state**: Set `max_plan_review_retries = 2` (0 forbidden), `max_orchestrator_minutes = 240` (0 forbidden), `deadline_ts = now() + max_orchestrator_minutes minutes`, `orchestrator_run_log = []`, `phases_completed = []`. Read source PRD's Implementation Phases table in full for the initial snapshot.

**Phase A.1 — Pick next actionable phase**: Re-read the Implementation Phases table. Apply the actionable-row selection rule (plan-writer Step 1.3 verbatim): `Status == "pending"` AND (`Depends == "-"` OR all listed phase numbers are `complete`). Pick lowest-numbered match. If none: all phases complete → write orchestrator-run.json final summary → emit `All phases complete; nothing to orchestrate.` → exit 0 (AC-6).

**Phase A.2 — Wall-clock budget check**: If `now() >= deadline_ts`: write `PRPs/reports/<feature>/orchestrator-halt.json` with `{outcome: "FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED", phases_completed, partial_state_note, manual_recovery: "re-invoke /relay-execute; picks up at next pending row"}`. HALT verbatim with `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`.

**Phase A.3 — Per-phase plan sub-flow (plan-review retry loop)**:
1. Adopt `/relay-plan` role: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan.md` and execute its protocol inline (Phase A — Adopt the Writer role; pass `prd_path` and `target_root`). The plan-writer's Phase 5.1 back-fill flips the row `pending → in-progress` and populates the PRP Plan cell.
2. Adopt `/relay-plan-review` role: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan-review.md` and execute its protocol inline against the generated DRAFT plan path.
   - On `APPROVED`: proceed to Phase A.4.
   - On `CHANGES_REQUESTED`: capture the rubric defect bullet-list (format per `plan-reviewer.md:459-483`). Increment plan_review_attempts. If `plan_review_attempts > max_plan_review_retries`: write `orchestrator-halt.json` with `{outcome: "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED", phase_N, failing_rubric_items, plan_review_attempts}`. HALT verbatim. Else: re-adopt `/relay-plan` role passing `prior_feedback = <captured defect list>`. Loop back to step 2.
3. Append `{phase: N, stage: "plan", outcome: "APPROVED", plan_path: "..."}` to `orchestrator_run_log`.

**Phase A.4 — Per-phase implement sub-flow**:
1. Adopt `/relay-implement` role: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-implement.md` and execute its protocol inline against the APPROVED plan path. The command's own D8 mutations (plan trailing-block flip, plan move to `PRPs/plans/completed/`, source PRD row flip `in-progress → complete`) run as the command's Phase A.4.
2. On success path (APPROVED rubric + D8 mutations succeeded): append `{phase: N, stage: "implement", outcome: "APPROVED"}` to `orchestrator_run_log`.
3. On any HALT (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`): append `{phase: N, stage: "implement", outcome: "HALT:<code>"}` to `orchestrator_run_log`. Write `PRPs/reports/<feature>/orchestrator-halt.json` with `{outcome: "FAILED_IMPLEMENT_<code>", phase_N, halting_stage: "implement", underlying_halt_ref: "PRPs/reports/<feature>/phase-<N>/halt.json", orchestrator_run_log}`. Surface `/relay-implement`'s halt message verbatim. HALT the orchestrator (AC-3).

**Phase A.5 — Per-phase test sub-flow (guarded by command-exists check)**:
1. Check that `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` and `relay-test-review.md` are readable. If either is absent: emit structured warning "relay-test / relay-test-review not available; skipping test stage for phase N" and record `{phase: N, stage: "test", outcome: "skipped_command_absent"}` in `orchestrator_run_log`. Proceed to Phase A.6.
2. Adopt `/relay-test` role: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` and execute its protocol inline.
   - On `GREEN`: append `{phase: N, stage: "test", outcome: "GREEN"}`. Proceed to test-review.
   - On any HALT (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION`, `FAILED_INFRA_UNRECOVERABLE`): append `{phase: N, stage: "test", outcome: "HALT:<code>"}`. Write `orchestrator-halt.json` with `{outcome: "FAILED_TEST_<code>", phase_N, halting_stage: "test", underlying_halt_ref: "PRPs/reports/<feature>/run.json", orchestrator_run_log}`. Surface `/relay-test`'s halt details verbatim. HALT the orchestrator (AC-4).
3. Adopt `/relay-test-review` role: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md` and execute its protocol inline.
   - On `APPROVED`: append `{phase: N, stage: "test_review", outcome: "APPROVED"}`.
   - On `CHANGES_REQUESTED` (weakened tests, coverage drop, trivial assertions): append `{phase: N, stage: "test_review", outcome: "CHANGES_REQUESTED"}`. Write `orchestrator-halt.json` with `{outcome: "FAILED_TEST_REVIEW_REJECTED", phase_N, halting_stage: "test_review", rejected_test_files, orchestrator_run_log}`. HALT verbatim with `FAILED_TEST_REVIEW_REJECTED` (AC-5).

**Phase A.6 — State-transition record + loop**:
Append a `{phase: N, status: "complete", plan_path: "PRPs/plans/completed/...", timestamp}` record to `orchestrator_run_log`. Write / overwrite `PRPs/reports/<feature>/orchestrator-run.json` with the full log. Push phase N to `phases_completed`. Loop back to Phase A.1.

**MIRROR**: Pattern 4 (loop init at `relay-implement.md:179-190`), Pattern 5 (actionable-row selection at `relay-plan.md:126-153`), Pattern 6 (CHANGES_REQUESTED format at `plan-reviewer.md:459-483`), Pattern 7 (orchestrator-run.json schema mirroring `relay-test.md:173-196`)

**VALIDATE**: `grep -c "max_plan_review_retries" plugins/relay/commands/relay-execute.md && grep -c "FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED" plugins/relay/commands/relay-execute.md && grep -c "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED" plugins/relay/commands/relay-execute.md && grep -c "FAILED_TEST_REVIEW_REJECTED" plugins/relay/commands/relay-execute.md && grep -c "orchestrator-run.json" plugins/relay/commands/relay-execute.md`

---

### Task 5: ADD Final output surface + Constraints + What you do NOT do

**ACTION**: Add three closing sections:

**`## Final output surface`**: On success path (all N phases complete), emit verbatim per PRD AC-1:
```
✅ All phases complete for `PRPs/prds/<feature>.prd.md`.
Phases completed: <list of phase numbers>.
Plans archived at PRPs/plans/completed/.
Orchestrator audit log at PRPs/reports/<feature>/orchestrator-run.json.
Ready for /relay-pr <feature> (when shipped) or manual git push + PR creation.
```
On any HALT path, the verbatim HALT message is emitted by the relevant Phase A.* sub-section above and the command exits.

**`## Constraints (hard rules)`**: Mirror `/relay-implement`'s constraint list adapted to orchestration. Must include: (1) never write under `.claude/`; (2) never bundle writer + reviewer — orchestrator dispatches existing commands; (3) never re-implement any logic from the five dispatched commands; (4) never prompt the user; (5) never re-run `/relay-implement` after a HALT — that is manual recovery; (6) never skip the Decision Gate evidence block; (7) never set `max_plan_review_retries` or `max_orchestrator_minutes` to 0; (8) never orchestrate multiple PRDs in one invocation; (9) when `tdd: true` but B7/B8 unshipped — emit dead-code routing note and proceed with non-TDD path (AC-11).

**`## What you do NOT do`**: Mirror `/relay-implement`'s section. Include: not re-implementing plan-writer logic; not running the plan rubric inline; not wiring `/relay-worktree` or `/relay-pr`; not auto-recovering from `/relay-implement` HALT; not auto-recovering from `/relay-test-review` CHANGES_REQUESTED; not targeting a specific phase via `--phase <N>`; not persisting research blobs; not committing between phases unless `--auto-commit` is shipped.

**MIRROR**: Pattern 8 (Final output surface at `relay-implement.md:409-420`)

**VALIDATE**: `grep -c "## Constraints" plugins/relay/commands/relay-execute.md && grep -c "## What you do NOT do" plugins/relay/commands/relay-execute.md && grep -c "All phases complete" plugins/relay/commands/relay-execute.md`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify the file exists and has non-zero size
test -s plugins/relay/commands/relay-execute.md && echo "FILE_EXISTS_NONEMPTY: PASS" || echo "FILE_EXISTS_NONEMPTY: FAIL"

# Verify YAML frontmatter is present and parseable (has opening and closing ---)
awk '/^---/{c++} c==2{found=1; exit} END{exit !found}' plugins/relay/commands/relay-execute.md && echo "FRONTMATTER: PASS" || echo "FRONTMATTER: FAIL"

# Verify argument-hint is <prd-path> not <plan-path>
grep -q "argument-hint: <prd-path>" plugins/relay/commands/relay-execute.md && echo "ARGUMENT_HINT: PASS" || echo "ARGUMENT_HINT: FAIL"

# Markdown-lint: no trailing whitespace, no broken ATX headings (basic)
grep -Pn " +$" plugins/relay/commands/relay-execute.md | head -5 || echo "NO_TRAILING_WHITESPACE: PASS"
```

### Level 2 — CONTENT_INVARIANTS

```bash
# AC-8: no .claude/ artifact path references in the command body
grep -n "\.claude/PRPs" plugins/relay/commands/relay-execute.md && echo "ANTIPATTERN_DETECTED: .claude/ path found" || echo "NO_CLAUDE_PATHS: PASS"

# AC-15: command body must NOT contain logic lifted from the five dispatched commands
# Heuristic: must contain Read references to each command file rather than inline step text
grep -c "relay-plan\.md" plugins/relay/commands/relay-execute.md
grep -c "relay-plan-review\.md" plugins/relay/commands/relay-execute.md
grep -c "relay-implement\.md" plugins/relay/commands/relay-execute.md

# Seven HALT outcome codes present
for code in FAILED_PLAN_REVIEW_BUDGET_EXCEEDED FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED FAILED_TEST_REVIEW_REJECTED FAILED_AFTER_N_RETRIES FAILED_TIME_BUDGET_EXCEEDED FAILED_OSCILLATION PARTIAL_D8_FAILURE; do
  grep -q "$code" plugins/relay/commands/relay-execute.md && echo "$code: PRESENT" || echo "$code: MISSING"
done

# orchestrator-run.json and orchestrator-halt.json both referenced
grep -q "orchestrator-run.json" plugins/relay/commands/relay-execute.md && echo "RUN_JSON: PASS" || echo "RUN_JSON: FAIL"
grep -q "orchestrator-halt.json" plugins/relay/commands/relay-execute.md && echo "HALT_JSON: PASS" || echo "HALT_JSON: FAIL"

# AC-6 idempotent exit message present verbatim
grep -q "All phases complete; nothing to orchestrate" plugins/relay/commands/relay-execute.md && echo "AC6_MSG: PASS" || echo "AC6_MSG: FAIL"

# max_plan_review_retries and max_orchestrator_minutes both declared
grep -q "max_plan_review_retries" plugins/relay/commands/relay-execute.md && echo "BUDGET1: PASS" || echo "BUDGET1: FAIL"
grep -q "max_orchestrator_minutes" plugins/relay/commands/relay-execute.md && echo "BUDGET2: PASS" || echo "BUDGET2: FAIL"

# TDD dead-code routing note present (AC-11)
grep -q "dead.code" plugins/relay/commands/relay-execute.md && echo "TDD_DEADCODE: PASS" || echo "TDD_DEADCODE: FAIL"

# Mandatory Decision Gate section present
grep -q "## Decision Gate" plugins/relay/commands/relay-execute.md && echo "DECISION_GATE: PASS" || echo "DECISION_GATE: FAIL"

# Canonical Implementation Phases table header enforced
grep -q "| # | Phase | Description | Status | Parallel | Depends | PRP Plan |" plugins/relay/commands/relay-execute.md && echo "TABLE_HEADER: PASS" || echo "TABLE_HEADER: FAIL"
```

### Level 3 — DRY-RUN END-TO-END

```bash
# Structural shape check: verify all mandatory sections are present in order
python3 - <<'EOF'
import re, sys
content = open("plugins/relay/commands/relay-execute.md").read()
required = [
    "## Decision Gate",
    "## Parse arguments",
    "## Preconditions",
    "## Phase A",
    "## Final output surface",
    "## Constraints",
    "## What you do NOT do",
]
pos = 0
for section in required:
    idx = content.find(section, pos)
    if idx == -1:
        print(f"MISSING or OUT OF ORDER: {section}")
        sys.exit(1)
    pos = idx + len(section)
print("SECTION_ORDER: PASS — all 7 command sections present in canonical order")
EOF

# Zero-duplication heuristic: command body must not paste step text from relay-implement
# Check that relay-implement's Phase A.1 budget-check prose is NOT in relay-execute
grep -q "If \`attempt > max_implement_retries" plugins/relay/commands/relay-execute.md && echo "DUPLICATION_DETECTED: implement retry logic pasted into orchestrator" || echo "NO_DUPLICATION: PASS"

# Verify the file does NOT reference .claude/ as an artifact path (second pass, stricter)
grep -Pn "\.claude/(PRPs|plans|reports)" plugins/relay/commands/relay-execute.md && echo "ARTIFACT_PATH_VIOLATION" || echo "ARTIFACT_PATH_CLEAN: PASS"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given an APPROVED PRD with N actionable phases (all `pending`, all `Depends` empty or all-`complete`), the command file's Phase A loop iterates each phase in order, adopts `/relay-plan` → `/relay-plan-review` → `/relay-implement` (then `/relay-test` → `/relay-test-review` when available) inline via Read, and on the success path emits a verbatim summary naming all phases complete with plans archived under `PRPs/plans/completed/` and `orchestrator-run.json` written at `PRPs/reports/<feature>/`.

- **AC-A2 (PRD AC-2):** The command file's Phase A.3 plan-review retry sub-flow captures the `CHANGES_REQUESTED` bullet-list output (per `plan-reviewer.md:459-483`), re-invokes `/relay-plan` with the failing items as `prior_feedback`, and retries up to `max_plan_review_retries` times. On exhaustion, HALT with `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED` naming the failing phase and rubric items.

- **AC-A3 (PRD AC-3):** The command file's Phase A.4 surfaces any `/relay-implement` HALT outcome code verbatim, writes `orchestrator-halt.json` with `halting_stage: "implement"` and `underlying_halt_ref` pointing to the `/relay-implement` `halt.json`, and HALTs without re-running `/relay-implement`.

- **AC-A4 (PRD AC-4):** The command file's Phase A.5 surfaces any `/relay-test` HALT outcome code verbatim, writes `orchestrator-halt.json` with `halting_stage: "test"` and `underlying_halt_ref` pointing to the `/relay-test` `run.json`, and HALTs.

- **AC-A5 (PRD AC-5):** The command file's Phase A.5 HALTs with `FAILED_TEST_REVIEW_REJECTED` when `/relay-test-review` returns `CHANGES_REQUESTED`, naming the rejected test files; no auto-recovery is attempted.

- **AC-A6 (PRD AC-6):** When the Implementation Phases table has zero `pending` rows at command entry, the command file exits 0 with the verbatim message `All phases complete; nothing to orchestrate.` and writes no artifacts.

- **AC-A7 (PRD AC-7):** The command file's Phase A.2 wall-clock budget check fires when `now() >= deadline_ts`, writes `orchestrator-halt.json` with `outcome: FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`, and HALTs preserving partial state on disk (source PRD table reflects whatever phases reached `complete`).

- **AC-A8 (PRD AC-8):** No artifact path in the command file resolves under `.claude/`. The `orchestrator-run.json` and `orchestrator-halt.json` paths are `PRPs/reports/<feature>/orchestrator-run.json` and `PRPs/reports/<feature>/orchestrator-halt.json`.

- **AC-A9 (PRD AC-9):** If any of `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` cannot be read at command entry, the command file HALTs with the byte-exact AC-9 message (substituting `/relay-execute` for `/relay-implement` in the P4 template) and no per-phase work begins.

- **AC-A10 (PRD AC-10):** If the source PRD's Implementation Phases table cannot be parsed (header line missing or rows malformed), the command file HALTs with the same diagnostic `/relay-plan` emits and exits without writing any artifact.

- **AC-A11 (PRD AC-11):** When `docs/context/methodology.md` has `tdd: true` at command entry, the command file emits a startup note explaining that the TDD routing branch is currently dead code and proceeds with the non-TDD path; no `/relay-tdd` invocation is attempted.

- **AC-A12 (PRD AC-12):** The command file re-reads the Implementation Phases table on each Phase A.1 iteration, re-evaluating the actionable-row selection rule so that phases whose `Depends` cell becomes all-`complete` after a prior phase are picked up in subsequent iterations.

- **AC-A13 (PRD AC-13):** The command file operates in cwd against the current branch when no worktree is set up (D4 graceful degradation), and still writes per-phase artifacts under `PRPs/reports/<feature>/`.

- **AC-A14 (PRD AC-14):** The command-level Decision Gate evidence block is the first user-facing output of the command and includes Activated criteria naming: cross-cutting orchestrator command; composes 4 shipped writer/reviewer pairs; impacts source PRD's state machine; references implementation-authoring D8 + plan-authoring D6.

- **AC-A15 (PRD AC-15):** A reviewer reading `relay-execute.md` finds no verbatim or near-verbatim restatements of step bodies from `relay-plan.md`, `relay-plan-review.md`, `relay-implement.md`, `relay-test.md`, or `relay-test-review.md`; the orchestrator references each command file by path for inline protocol adoption.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Inline command-protocol adoption via `Read` has zero codebase precedent (PRD research finding #5); the pattern may not compose cleanly when a downstream command's protocol assumes it is the top-level invocation | Medium | High — the dispatch model (D7) is the entire value proposition | The command file must explicitly instruct the LLM that each `Read` + inline execution operates in the same conversation context; the Phase A.3–A.5 prose must be specific enough that the adopting LLM passes correct `prd_path` / `target_root` / `plan_path` context into each adopted protocol. Dogfood (Phase 2) is the first validation. |
| Orchestrator-layer wall-clock budget interacts confusingly with per-stage budgets (Argo Workflows priority-inversion known issue #12329 is the external precedent) | Medium | Medium — stuck-in-running failure mode | Phase A.2 checks the orchestrator budget BEFORE each phase iteration; per-stage HALTs propagate up as authoritative. Distinct outcome codes (`FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED` vs `FAILED_TIME_BUDGET_EXCEEDED` per `/relay-implement`) make the failing layer unambiguous in logs. |
| Inline role-adoption pulls every dispatched command's protocol into the orchestrator's context window; long features may exceed window budgets | Low | Medium | Acknowledged trade-off per PRD Architecture Notes. The command file instructs the LLM to Read each command file at the point of adoption, not all upfront. Re-evaluate if a real run hits context limits; fallback is the wrapper-agent pattern per PRD Technical Risks. |
| `/relay-test` and `/relay-test-review` not yet shipped at Phase 1 time | Low | Low — guarded | Phase A.5 opens with a command-exists check (Read of each command file); missing commands surface as a structured warning, not a crash, and the orchestrator proceeds with whatever stages are available (AC per PRD Technical Risks). |
| Concurrent `/relay-execute` invocations against the same PRD race on the Implementation Phases table mutations | Low (single-developer scale) | Medium | Soft-fail diagnostic at command start (Glob for in-flight `orchestrator-run.json` without terminal entry; warn-and-continue). Robust file-lock semantics deferred per PRD Open Questions. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Inline command-protocol adoption (D7) — implementer guidance:** The implementer writing `relay-execute.md` must be careful to instruct the LLM at runtime to `Read` each downstream command file and execute its protocol inline — NOT to paste or summarize any step text from those files. The exact phrasing to use: "Adopt the `/relay-plan` role: Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan.md` and execute its full protocol for the given PRD path." This pattern is novel (zero prior art in the codebase per PRD research finding #5) and is the deliverable's central architectural bet.

**`orchestrator-run.json` — deferred schema decision:** PRD Open Question 4 (single per-feature file vs per-run subdirectory) is unresolved. The plan defaults to single per-feature file (`PRPs/reports/<feature>/orchestrator-run.json`) as specified in D9; the implementation may refine this. The schema shape (mirroring `relay-test.md:173-196` run.json with `phases` instead of `attempts`) is the authoritative reference, not a separate schema file.

**`max_plan_review_retries = 2` default:** PRD Open Question 1 suggests 2 (3 total plan attempts) as the starting default; this plan codifies that as the initial value. The implementer should declare it in Phase A.0 as a named constant so it is visible to the dogfood reviewer.

**Dogfood opportunity:** After this file is written, run `/relay-plan-review` against this plan itself to verify the plan-reviewer rubric (R1–R8 + R-COH-*) passes before proceeding to `/relay-implement`. The plan-reviewer rubric R-COH-* coherence layer may flag the novel "inline command-protocol adoption" pattern as potentially ambiguous — that is a signal to tighten the Phase A.3 prose before implementation.

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Implemented: 2026-05-01*
*Status: IMPLEMENTED*
