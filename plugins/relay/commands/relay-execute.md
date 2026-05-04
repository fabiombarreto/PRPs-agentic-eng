---
description: 'Autonomous multi-phase orchestrator for relay pipeline. Takes an APPROVED PRD and serially drives every actionable Implementation Phases row through plan → plan-review → implement → test → test-review by adopting each downstream command protocol inline via Read (D7 dispatch model; zero logic duplication per D15). Adds exactly two orchestration-layer budgets: max_plan_review_retries=2 (re-runs /relay-plan when /relay-plan-review returns CHANGES_REQUESTED, bounded retry) and max_orchestrator_minutes=240 (session-level wall-clock; 0 forbidden). Maintains orchestrator-run.json audit artifact at PRPs/reports/<feature>/. Seven HALT outcome codes: FAILED_PLAN_REVIEW_BUDGET_EXCEEDED, FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED, FAILED_TEST_REVIEW_REJECTED, plus four propagated from /relay-implement (FAILED_AFTER_N_RETRIES, FAILED_TIME_BUDGET_EXCEEDED, FAILED_OSCILLATION_DETECTED, FAILED_DISPUTE_CAP_EXCEEDED, PARTIAL_D8_FAILURE) and two from /relay-test. State machine is the source PRD Implementation Phases table (D6); re-invocation is idempotent — picks up at next pending row. TDD routing read at startup; dead code in MVP (B7/B8 unshipped).'
argument-hint: <prd-path>
---

# /relay-execute

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the PRD path argument, run preconditions, then enter a multi-phase orchestration loop that iterates every actionable `pending` row of the source PRD's Implementation Phases table serially. For each phase, adopt the protocol of `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, and `/relay-test-review` in order by reading each command file inline (D7 dispatch model). Record per-stage outcomes to `PRPs/reports/<feature>/orchestrator-run.json`. On the success path, emit the verbatim terminal summary. On any HALT path, write `PRPs/reports/<feature>/orchestrator-halt.json` and surface the structured HALT message verbatim.

You are autonomous. You do not prompt the user. You do not re-implement any logic from the dispatched commands. You do not loop `/relay-implement` — that command's own internal loop already exhausted its budget before its HALT propagates here.

See:
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan.md` — adopted inline in Phase A.3; owns plan-writer protocol.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan-review.md` — adopted inline in Phase A.3; CHANGES_REQUESTED triggers plan-review retry loop bounded by `max_plan_review_retries`.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-implement.md` — adopted inline in Phase A.4; owns D8 post-approval mutations (plan trailing-block flip, plan move to `PRPs/plans/completed/`, source PRD row flip `in-progress → complete`).
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` — adopted inline in Phase A.5 when available; command-exists guard required (AC-13 risk mitigation).
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md` — adopted inline in Phase A.5 when available; CHANGES_REQUESTED HALTs with `FAILED_TEST_REVIEW_REJECTED`.
- `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/plan-reviewer.md` — CHANGES_REQUESTED bullet-list output format (lines 459-483) captured as `prior_feedback` for plan-review retry loop.

---

## Decision Gate (before any action)

Emit the evidence block per `docs/decision-gate.md` of the relay plugin repo. This command is a cross-cutting orchestrator composing four shipped writer/reviewer pairs; the gate is active. Consult `docs/decisions.md`, `docs/anti-patterns.md`, and `docs/context/architecture.md` in the target project.

Emit the canonical six-line shape:

```
**Decision Gate**
- Active context: {path to .context.md or "none"}
- Activated criteria: cross-cutting orchestrator command; composes 4 shipped writer/reviewer pairs; impacts source PRD's Implementation Phases state machine; references implementation-authoring D8 + plan-authoring D6
- Decisions found:
  - {decision 1, e.g. command surface writer/reviewer split (2026-04-19)}
  - {decision 2, e.g. PRP artifact paths under PRPs/ (2026-04-19)}
  - {decision 3, e.g. D7 dispatch model — inline command-protocol adoption via Read}
  - ...
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66)
  - Logic duplication across command files — orchestrator references each command file by path; never pastes steps
  - Bypassing the writer/reviewer split — orchestrator dispatches existing pairs; never bundles
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:79-84)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary; PRPs/ artifact paths; writer/reviewer split; graceful degradation when /relay-worktree absent (cwd against current branch)
- Result: PROCEED | HALT (reason)
```

If the Decision Gate cannot be emitted because one of the three sources is unreadable, fall through to P4 below for the canonical halt message.

---

## Parse arguments

`$ARGUMENTS` MUST be a single non-empty path-like string. Treat the argument as the PRD path; resolve it as absolute, or as relative to the current working directory. If the argument is blank/whitespace, HALT with:

> /relay-execute requires a PRD path. Usage:
>   /relay-execute PRPs/prds/<feature>.prd.md
> Example:
>   /relay-execute PRPs/prds/my-feature.prd.md

If the argument is non-empty but does not resolve to an existing readable file, fall through to P1 below for the canonical file-not-readable HALT message.

Record `prd_path` as the resolved absolute path. Record `target_root` as the current working directory. Parse `<feature>` as the PRD basename minus `.prd.md`.

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail. The HALTs are surfaced verbatim and the command exits without writing any artifact or beginning any per-phase work.

### P1 — PRD path resolves to a readable file

If `prd_path` does not point at an existing readable file:

> I cannot start orchestration without `<prd_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-execute PRPs/prds/<feature>.prd.md

### P2 — PRD ends with `*Status: APPROVED*`

`Read` the PRD. Inspect its trailing status line (the last non-empty line of the file).

- If it equals `*Status: APPROVED*` → proceed.
- If it equals any other non-APPROVED status, or has no status line:

  HALT with:

  > The PRD at `<prd_path>` is not APPROVED (current status: `<status>`).
  > /relay-execute only operates on APPROVED PRDs.
  > Run /relay-prd to bring the PRD to APPROVED first.

Trim trailing whitespace and newlines before comparison; the check is "the last non-empty line equals `*Status: APPROVED*`" character-for-character.

### P3 — Implementation Phases table parseable

`Read` the PRD. Locate the Implementation Phases table by exact-match header line:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

If the header line is not found, HALT with:

> Implementation Phases table header not found in `<prd_path>`.
> Expected: `| # | Phase | Description | Status | Parallel | Depends | PRP Plan |`.
> The PRD must conform to docs/context/prd-template.md before
> /relay-execute can run.

Parse the data rows that follow (skip the GFM separator row consisting only of dashes and pipes). Apply the actionable-row selection rule (plan-writer Step 1.3 verbatim):

A row is **actionable** when:
- Its `Status` cell equals `pending` (case-sensitive), AND
- Its `Depends` cell is `-` (empty) OR every comma-separated phase number listed has `Status == complete`.

If zero rows are actionable, apply AC-6 (idempotent re-entry):

> All phases complete; nothing to orchestrate.

Exit 0. Write no artifacts.

Record the parsed table for the Phase A.0 initial snapshot.

### P4 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the byte-exact AC-9 message:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-execute.
> No code has been changed and no review has been run.

### P5 — TDD routing emitted + concurrency soft-fail diagnostic

Read `docs/context/methodology.md` in the target project. Extract the `tdd:` frontmatter value.

- If `tdd: true`: emit startup note (AC-11 dead-code routing visibility):

  > TDD routing note: docs/context/methodology.md has tdd: true, but the TDD
  > routing branch (B7 TDD Writer + B8 TDD Reviewer integration) is currently
  > dead code in /relay-execute MVP (B7/B8 are unshipped per implementation-
  > authoring.prd.md "What We're NOT Building"). The integration point is
  > reserved. Proceeding with the non-TDD path: /relay-plan → /relay-plan-review
  > → /relay-implement → /relay-test → /relay-test-review.

- If `tdd: false` or file absent: no note required; proceed silently.

Concurrency soft-fail diagnostic (D18): `Glob` `PRPs/reports/<feature>/orchestrator-run.json` for an existing file without a terminal `outcome` entry (heuristic: file exists but does not contain `"outcome":` or contains `"outcome": null`). If found:

> Warning: an in-flight orchestrator-run.json detected for <feature> without
> a terminal outcome entry. Concurrent /relay-execute invocations against the
> same PRD may race on the Implementation Phases table. Proceeding (warn-and-
> continue per D18); robust file-lock semantics deferred.

Continue (do not block). This is a soft-fail diagnostic, not a halt.

---

## Phase A — Multi-phase orchestration loop

This phase holds the entire orchestration loop logic. Each iteration picks one actionable phase, adopts the protocols of the downstream commands inline, records per-stage outcomes, and loops back to pick the next actionable phase.

### Phase A.0 — Initialise orchestrator state

Set the budget caps and counters:

- `max_plan_review_retries = 2` (0 forbidden; 3 total plan attempts including the initial)
- `max_orchestrator_minutes = 240` (session-level wall-clock; 0 forbidden)
- `deadline_ts = now() + max_orchestrator_minutes minutes`
- `orchestrator_run_log = []` — accumulator for `orchestrator-run.json`
- `phases_completed = []` — list of phase numbers that reached `complete` this session

Read the source PRD's Implementation Phases table in full for the initial snapshot. Hold this snapshot for Phase A.1's first iteration.

### Phase A.1 — Pick next actionable phase

Re-read the Implementation Phases table from `prd_path` (do not reuse a stale snapshot — the table may have been mutated by prior Phase A iterations). Apply the actionable-row selection rule (plan-writer Step 1.3 verbatim):

A row is **actionable** when:
- Its `Status` cell equals `pending` (case-sensitive), AND
- Its `Depends` cell is `-` (empty) OR every comma-separated phase number listed has `Status == complete`.

Pick the lowest-numbered actionable row. Record `current_phase_N` and `current_phase_slug`.

If **no** actionable row is found (all phases are `complete` or all remaining `pending` rows have unsatisfied dependencies):

Write `PRPs/reports/<feature>/orchestrator-run.json` with the final summary:

```json
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

Emit the verbatim AC-6 idempotent exit message and proceed to the Final output surface success path. Exit 0.

### Phase A.2 — Wall-clock budget check

If `now() >= deadline_ts`:

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED",
  "phases_completed": <phases_completed>,
  "partial_state_note": "Source PRD Implementation Phases table reflects phase states at the time of timeout. Phases that reached complete are recorded; remaining pending rows can be retried.",
  "manual_recovery": "re-invoke /relay-execute <prd_path>; picks up at next pending row with satisfied dependencies",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

HALT with verbatim message:

> FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED. /relay-execute aborted after
> max_orchestrator_minutes=240. Phases completed this session: <phases_completed>.
> Partial state preserved on disk; source PRD table reflects whatever phases
> reached complete. Re-invoke /relay-execute to pick up at the next pending row.
> Halt state at PRPs/reports/<feature>/orchestrator-halt.json.

### Phase A.3 — Per-phase plan sub-flow (plan-review retry loop)

#### Step A.3.1 — Adopt /relay-plan role

Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan.md` and execute its full protocol inline for the current phase. Pass context:

- `prd_path`: the resolved absolute path verified by P1–P3
- `target_root`: the cwd
- `prior_feedback`: null on first attempt for this phase; the captured rubric defect bullet-list on retry attempts

The plan-writer's Phase 5.1 back-fill flips the row `pending → in-progress` and populates the PRP Plan cell. Record the generated DRAFT plan path as `current_plan_path`.

Set `plan_review_attempts = 0`.

#### Step A.3.2 — Adopt /relay-plan-review role

Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-plan-review.md` and execute its full protocol inline against `current_plan_path`.

**On APPROVED:**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "plan", "outcome": "APPROVED", "plan_path": "<current_plan_path>"}
```

Proceed to Phase A.4.

**On CHANGES_REQUESTED:**

Capture the rubric defect bullet-list output (format documented at `plugins/relay/agents/plan-reviewer.md:459-483`). This is the structured list of failing rubric item IDs + reasons.

Increment `plan_review_attempts`.

If `plan_review_attempts > max_plan_review_retries`:

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED",
  "phase_N": <N>,
  "failing_rubric_items": <captured defect list>,
  "plan_review_attempts": <plan_review_attempts>,
  "orchestrator_run_log": <orchestrator_run_log>
}
```

HALT with verbatim message:

> FAILED_PLAN_REVIEW_BUDGET_EXCEEDED. /relay-execute exhausted plan-review
> retries for phase <N> (max_plan_review_retries=2, attempts=<plan_review_attempts>).
> Failing rubric items: <captured defect list>.
> Plan left at *Status: DRAFT* at <current_plan_path>.
> Halt state at PRPs/reports/<feature>/orchestrator-halt.json.
> Manual recovery: resolve the rubric defects and re-run /relay-execute,
> or invoke /relay-plan with prior_feedback and /relay-plan-review manually.

Else: re-adopt `/relay-plan` role passing `prior_feedback = <captured defect list>`. Loop back to Step A.3.2.

### Phase A.4 — Per-phase implement sub-flow

#### Step A.4.1 — Adopt /relay-implement role

Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-implement.md` and execute its full protocol inline against `current_plan_path`. The command's own D8 post-approval mutations run as part of its internal Phase A.4:
- Mutation a: plan trailing-block flip `*Status: APPROVED*` → `*Status: IMPLEMENTED*`
- Mutation b: plan move to `PRPs/plans/completed/<basename>.plan.md`
- Mutation c: source PRD row flip `in-progress → complete`

**On success path (APPROVED rubric + D8 mutations succeeded):**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "implement", "outcome": "APPROVED"}
```

Proceed to Phase A.5.

**On any HALT from /relay-implement** (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`):

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "implement", "outcome": "HALT:<code>"}
```

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_IMPLEMENT_<code>",
  "phase_N": <N>,
  "halting_stage": "implement",
  "underlying_halt_ref": "PRPs/reports/<feature>/phase-<N>/halt.json",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

Surface `/relay-implement`'s halt message verbatim. HALT the orchestrator (AC-3).

> Manual recovery: inspect the underlying halt at
> PRPs/reports/<feature>/phase-<N>/halt.json for per-attempt details.
> Do NOT re-run /relay-execute until the underlying cause is resolved —
> /relay-implement's internal loop already exhausted its budget.

### Phase A.5 — Per-phase test sub-flow (guarded by command-exists check)

#### Step A.5.1 — Command-exists check

Check that both `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` and `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md` are readable.

If either is absent: emit structured warning:

> Warning: relay-test / relay-test-review not available; skipping test
> stage for phase <N>. The command file(s) could not be read at:
>   ${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md
>   ${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md
> Proceeding to Phase A.6 (state-transition record + loop).

Record in `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test", "outcome": "skipped_command_absent"}
```

Proceed to Phase A.6.

#### Step A.5.2 — Adopt /relay-test role

Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` and execute its full protocol inline.

**On GREEN:**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test", "outcome": "GREEN"}
```

Proceed to Step A.5.3.

**On any HALT from /relay-test** (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION`, `FAILED_INFRA_UNRECOVERABLE`):

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test", "outcome": "HALT:<code>"}
```

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_TEST_<code>",
  "phase_N": <N>,
  "halting_stage": "test",
  "underlying_halt_ref": "PRPs/reports/<feature>/run.json",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

Surface `/relay-test`'s halt details verbatim. HALT the orchestrator (AC-4).

#### Step A.5.3 — Adopt /relay-test-review role

Read `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md` and execute its full protocol inline.

**On APPROVED:**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test_review", "outcome": "APPROVED"}
```

Proceed to Phase A.6.

**On CHANGES_REQUESTED** (weakened tests, coverage drop, trivial assertions):

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test_review", "outcome": "CHANGES_REQUESTED"}
```

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_TEST_REVIEW_REJECTED",
  "phase_N": <N>,
  "halting_stage": "test_review",
  "rejected_test_files": "<list from /relay-test-review output>",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

HALT with verbatim message (AC-5):

> FAILED_TEST_REVIEW_REJECTED. /relay-test-review returned CHANGES_REQUESTED
> for phase <N>. The test reviewer detected weakened tests, a coverage drop,
> or trivial assertions. Rejected test files: <rejected_test_files>.
> Manual intervention required — no auto-recovery is attempted (B5 exists
> precisely to gate human review; future B7/B8 integration may introduce
> a recovery path).
> Halt state at PRPs/reports/<feature>/orchestrator-halt.json.

### Phase A.6 — State-transition record + loop

Append a completion record to `orchestrator_run_log`:
```json
{
  "phase": <N>,
  "status": "complete",
  "plan_path": "PRPs/plans/completed/<basename>.plan.md",
  "timestamp": "<ISO timestamp>"
}
```

Write / overwrite `PRPs/reports/<feature>/orchestrator-run.json` with the full log:

```json
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": null,
  "max_plan_review_retries": 2,
  "max_orchestrator_minutes": 240,
  "phases": <orchestrator_run_log>,
  "outcome": null,
  "phases_completed": <phases_completed>
}
```

Push `current_phase_N` to `phases_completed`.

Loop back to Phase A.1 (re-read the Implementation Phases table; phases whose `Depends` cell became all-`complete` after this phase are now actionable per AC-12).

---

## Final output surface

### Success path (all phases complete)

When Phase A.1 finds no more actionable rows and `phases_completed` is non-empty, emit verbatim per PRD AC-1:

> ✅ All phases complete for `PRPs/prds/<feature>.prd.md`.
> Phases completed: <list of phase numbers in order>.
> Plans archived at PRPs/plans/completed/.
> Orchestrator audit log at PRPs/reports/<feature>/orchestrator-run.json.
> Ready for /relay-pr <feature> (when shipped) or manual git push + PR creation.

### HALT paths

On any HALT path (one of `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`, `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`, `FAILED_TEST_REVIEW_REJECTED`, or a propagated `/relay-implement` or `/relay-test` HALT), the verbatim HALT message is emitted by the relevant Phase A.* sub-section above and the command exits. The `orchestrator-halt.json` at `PRPs/reports/<feature>/orchestrator-halt.json` carries the structured failure state, the halting stage, the underlying halt reference (when applicable), and the partial `orchestrator_run_log` for post-mortem audit.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** All orchestrator artifacts go to `PRPs/reports/<feature>/` (`orchestrator-run.json`, `orchestrator-halt.json`). Per-phase artifacts (plan, implementation diff, test run) go to their respective per-command paths under `PRPs/`. Nothing goes under `.claude/` — the permission guards are intentional and break the autonomous loop.

2. **Never bundle writer + reviewer.** The orchestrator dispatches existing commands (`/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, `/relay-test-review`). It does not create combined writer-reviewer agents or bypass the split decision (2026-04-19).

3. **Never re-implement logic from the five dispatched commands.** The orchestrator references each command file by `${CLAUDE_PLUGIN_ROOT}` path and adopts its protocol inline. If `/relay-plan` changes, `/relay-execute` inherits the change automatically. Zero logic duplication (D15).

4. **Never prompt the user.** Past the interactivity boundary (`docs/context/architecture.md` §Interactivity boundary). HALTs are surfaced verbatim and the command exits.

5. **Never re-run `/relay-implement` after a HALT.** `/relay-implement`'s internal loop already exhausted its budget. The orchestrator surfaces the halt and exits. Manual recovery is required before re-invoking.

6. **Never skip the Decision Gate evidence block.** The command-level Decision Gate (above) is the first user-facing output per AC-14.

7. **Never set `max_plan_review_retries` or `max_orchestrator_minutes` to 0.** 0 disables the budget, which defeats its purpose (same discipline as `max_implement_retries` and `max_implement_minutes` in `/relay-implement`).

8. **Never orchestrate multiple PRDs in one invocation.** One PRD per `/relay-execute` invocation. Cross-PRD orchestration is a separate future concern.

9. **When `tdd: true` but B7/B8 are unshipped — emit the dead-code routing note (P5) and proceed with the non-TDD path (AC-11).** Do not attempt to invoke `/relay-tdd` or any TDD-track command.

---

## What you do NOT do

- **Re-implementing plan-writer logic** — the orchestrator adopts `/relay-plan` inline via Read; it does not paste or summarize plan-writer's step bodies.
- **Running the plan rubric inline** — the orchestrator adopts `/relay-plan-review` inline via Read; it does not evaluate R1–R8 or R-COH-* rubric items itself.
- **Wiring `/relay-worktree`** — deferred per 2026-04-19 surface decision; the orchestrator runs against cwd until `/relay-worktree` ships.
- **Wiring `/relay-pr`** — separate future command; the orchestrator surfaces "ready for /relay-pr" on success but does not invoke it.
- **Auto-recovering from `/relay-implement` HALT** — the orchestrator surfaces the halt and exits. Manual intervention is required.
- **Auto-recovering from `/relay-test-review` CHANGES_REQUESTED** — HALT with `FAILED_TEST_REVIEW_REJECTED`; no auto-correction path. B5 exists precisely to gate human review.
- **Targeting a specific phase via `--phase <N>` flag** — Could-item; deferred. Idempotency via D6 state machine (re-invocation picks up at next pending row) is sufficient for MVP.
- **Persisting research blobs** — research subagents invoked during `/relay-plan` adoption write to the plan file via the plan-writer protocol; no separate research artifact is written by the orchestrator.
- **Committing between phases** — Could-item (`--auto-commit` flag); deferred. The developer or `/relay-pr` decides when to commit.
- **Re-running a `complete` phase** — refused via P3 (zero actionable rows with status `complete` are not re-picked). Manual hand-edit of the row's `Status` cell back to `pending` is the documented escape hatch.
- **Parallel phase orchestration** — MVP is strictly serial. The `Parallel` cell is read but not acted upon.
- **Multi-PRD orchestration** — one PRD per invocation; cross-PRD coordination is a separate orchestrator's job.
