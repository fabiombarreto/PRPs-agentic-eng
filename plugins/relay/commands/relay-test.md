---
description: Run the test suite of a worktree with the auto-correction loop (B1 + B3 + B4 of the Test Runner PRD). Invokes the test-runner agent per attempt; retries by calling the Implementer when failures are classified as legitimate; aborts on oscillation, time budget, or infra issues.
argument-hint: <worktree-path> [--max-retries N] [--max-minutes M] [--tier unit|integration|e2e] [--feature <name>]
---

# /relay-test

**Arguments:** `$ARGUMENTS`

---

## Your mission

You are the orchestration layer for the relay Test Runner. You drive
the auto-correction loop that repeatedly invokes the `test-runner`
agent (component B1 + B3) until one of the terminating conditions is
met. You enforce `max_test_retries`, `max_test_minutes`, oscillation
detection, and the flakiness retry protocol. You do NOT interpret test
output yourself — the agent does that and returns a structured
verdict.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/test-runner.prd.md` — Test Runner PRD
- `${CLAUDE_PLUGIN_ROOT}/docs/decisions.md` — `max_test_retries=3`, `max_test_minutes=30`, layered execution, redaction policy
- `${CLAUDE_PLUGIN_ROOT}/agents/test-runner.md` — the B1 + B3 agent

---

## Decision Gate (before any action)

Emit the evidence block to the user per `docs/decision-gate.md`. Since
you are invoking a reusable service and running cross-cutting
operations (writing reports, spawning retries), the gate is active.
Result should be `PROCEED` except when arguments are missing or the
worktree path is invalid (then HALT).

---

## Parse arguments

- `<worktree-path>` (required): absolute path to the target project worktree.
- `--max-retries N` (optional): override `max_test_retries`. Default 3. Value 0 forbidden.
- `--max-minutes M` (optional): override `max_test_minutes`. Default 30. Value 0 forbidden.
- `--tier unit|integration|e2e` (optional): force a specific layer; otherwise detect signals.
- `--feature <name>` (optional): feature name for `PRPs/reports/<feature>/`. Otherwise derive from the worktree's current branch (`feature/foo` → `foo`; fallback `unnamed-feature`).

HALT with a clear error if the worktree path does not exist or is not
a directory.

---

## Phase 0 — methodology.md self-skip gate

Read `<worktree-path>/docs/context/methodology.md`. Two branches:

### Phase 0.a — self-skip (PRD AC-1, AC-2)

If the file is missing OR its frontmatter `test_frameworks` key is missing OR is an empty list (`[]`):

Emit verbatim and exit 0:

> Test framework inactive (test_frameworks: []). Skipping.

Do NOT initialize loop state. Do NOT write any artifact.

### Phase 0.b — proceed (PRD AC-3)

If `test_frameworks` is non-empty: fall through to the existing
Preconditions check unchanged.

---

## Preconditions check

Before the loop starts:

1. **worktree exists and is a git worktree** — `git -C <worktree> rev-parse --git-dir` succeeds
2. **`.claude/settings.json` exists in the worktree** — if not, HALT with message pointing the user at `*update` in the context-builder skill
3. **methodology.md exists** — read `tdd` for downstream reporting
4. **PRPs/ exists or can be created** — `mkdir -p <worktree>/PRPs/reports/<feature>/attempts`
5. **No pending uncommitted changes in the worktree** — if there are, note them in the final summary but proceed (the user may be iterating manually)

If any of 1–4 fails, HALT and report what's missing.

---

## Initialize loop state

Generate:
- `run_id` = new UUIDv4
- `start_ts` = current epoch ms
- `deadline_ts` = `start_ts + max_minutes * 60_000`
- `attempt` = 1
- `files_changed_by_attempt` = `{}` (maps attempt number to a set of file paths)
- `previous_record_refs` = `[]` (grows with each attempt)

---

## The B4 loop

Repeat until an exit condition fires:

### Step A — Budget checks

- `now = current epoch ms`
- If `now >= deadline_ts`: exit with `FAILED_TIME_BUDGET_EXCEEDED`.
- If `attempt > max_retries + 1` (initial + N retries): exit with `FAILED_AFTER_N_RETRIES`.

### Step B — Invoke the `test-runner` agent

Use the Agent tool with `subagent_type="test-runner"`. Pass a prompt
that includes:

```
worktree: <absolute path>
attempt: <N>
run_id: <uuid>
time_remaining_ms: <deadline_ts - now>
tier: <tier>                  # only if --tier was passed or layered detection decided
framework: <framework>         # only if we already know it; first attempt normally omits so agent detects
feature: <name>                # same as --feature
previous_record_refs:
  - <path to attempt-1 record.json>
  - <path to attempt-2 record.json>
  ...
```

The agent runs the suite, classifies failures, writes
`PRPs/reports/<feature>/attempts/<N>/record.json` and
`stdout.log`, and returns a JSON verdict inside a fenced `json` block.

Parse the verdict. Expect one of: `GREEN`, `RETRY_NEEDED`,
`RETRY_FLAKY`, `ABORT_INFRA`, `ABORT_TIME`.

### Step C — Dispatch on verdict

**GREEN** → exit loop successfully. Write a per-run summary (see
"Final summary" below). Next step for the orchestrator is
`/relay-test-review`; for manual use, stop here.

**RETRY_FLAKY** → increment attempt counter (this attempt's outcome
is "flaky retry"), do NOT invoke Implementer, go to Step A. Note: a
flaky retry DOES count against `max_test_retries`; the B3 classifier's
flakiness protocol is "one retry-without-code-change to confirm";
sustained flakiness (same failure after the retry) upgrades to
`legitimate` on the next invocation and then follows the normal path.

**RETRY_NEEDED** →
1. Extract `feedback_for_implementer` from the verdict.
2. Check oscillation: see Step D below. If oscillation detected, exit
   with `FAILED_OSCILLATION`.
3. Invoke the Implementer. For now (relay pipeline WIP, Implementer
   agent not yet written), the command invokes `/relay-implement` via
   the Agent tool with the failure feedback as input. If
   `/relay-implement` command is not yet available, HALT with a clear
   message: "RETRY_NEEDED at attempt N, but /relay-implement is not
   yet implemented. Failure feedback written to
   PRPs/reports/<feature>/attempts/<N>/implementer-feedback.json for
   manual application. Re-run /relay-test after applying the fix."
4. On Implementer success, capture the diff: `git -C <worktree> diff
   HEAD~1..HEAD --name-only` → `files_changed_by_attempt[N]`.
5. Increment `attempt`, add the current record path to
   `previous_record_refs`, go to Step A.

**ABORT_INFRA** → try ONE recovery attempt:
- If `reason` in the verdict suggests something restartable (`docker_not_running`, `db_unreachable`, `container_not_found`), run `make test-down && make test-bootstrap` in the worktree (or the equivalent for the detected stack).
- If `reason` is `missing_settings_json` or `no_runner_detected` or `no_test_framework`, recovery is not possible. Exit with `FAILED_INFRA_UNRECOVERABLE`.
- After one recovery, retry the SAME attempt (do not increment) once. If the next verdict is again `ABORT_INFRA`, exit with `FAILED_INFRA_UNRECOVERABLE`.

**ABORT_TIME** → exit with `FAILED_TIME_BUDGET_EXCEEDED`.

### Step D — Oscillation detection

Before applying a proposed Implementer fix in attempt N:

1. Get the diff the Implementer is about to apply:
   `files_the_implementer_would_change = set(git diff HEAD..<implementer-proposed-commit> --name-only)`.
2. For each previous attempt `k` in `files_changed_by_attempt`:
   - If `files_changed_by_attempt[k] ∩ files_the_implementer_would_change` is non-empty, this is a **candidate oscillation**.
   - Verify semantic reversal by comparing the before/after content of the intersecting files: if attempt N's proposed change reverts a change from attempt k (net zero diff on those lines), it IS an oscillation.
3. If oscillation confirmed: exit with `FAILED_OSCILLATION`, attaching the pair `(k, N)` and the reverting file set.

For simplicity in MVP, a pragmatic heuristic: if the same file is
touched by the Implementer in 3 or more separate attempts and the
Implementer's diff for attempt N reverses lines from attempt `N-1`,
treat it as oscillation.

---

## Final summary

After the loop exits (any outcome), produce:

1. **A run-level file** at `<worktree>/PRPs/reports/<feature>/run.json`:
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
     "outcome": "GREEN | FAILED_AFTER_N_RETRIES | FAILED_TIME_BUDGET_EXCEEDED | FAILED_OSCILLATION | FAILED_INFRA_UNRECOVERABLE",
     "time_breakdown": {
       "attempt_1_suite_ms": ...,
       "attempt_1_correction_ms": ...,
       "attempt_2_suite_ms": ...,
       ...
     },
     "tdd_mode": true|false
   }
   ```

2. **A terse human summary** printed to the user, regardless of outcome:
   - Outcome line with color-coded status
   - Attempt count and total elapsed time
   - For failed outcomes: the abort reason
   - For GREEN: pointer to `/relay:relay-test-review` as the next step (when Phase 7 lands)

Do NOT write the final pretty report (`final-report.md`) here — that's
the `/relay-pr` command's job (Phase 8, B6). `run.json` is
machine-readable state that downstream consumers (test-review,
report-generator) read.

---

## Constraints (hard rules)

- **Never modify test files or production code directly** — that is
  the Implementer's job, invoked via the Agent tool.
- **Never emit raw test output** in your user-facing messages — it
  may contain secrets. The redacted log lives at
  `attempts/<N>/stdout.log`.
- **Never skip the Decision Gate evidence block.**
- **Never write under `.claude/`** — all artifacts go to `PRPs/reports/`.
- **Never continue past budget limits** — honor `max_test_retries`
  and `max_test_minutes` strictly. Value `0` for either is forbidden
  (per `docs/decisions.md`).
- **Never treat `RETRY_FLAKY` as free** — it still counts against
  `max_test_retries`; the whole point of the budget is to bound
  session wall-clock.

---

## Graceful degradation summary

| Scenario | Outcome code | What happens |
|----------|--------------|--------------|
| `.claude/settings.json` missing | HALT at precondition check | User re-runs context-builder |
| Worktree has no test framework (`test_frameworks: []` or `methodology.md` absent) | `skipped_no_test_framework` (Phase 0 self-skip, exit 0) | Phase 0 gate fires before preconditions; verbatim line emitted; no artifacts written |
| Docker not running | Recovery once via `make test-down && make test-bootstrap`; if still fails, `FAILED_INFRA_UNRECOVERABLE` | User checks docker daemon |
| Time budget exceeded mid-attempt | `FAILED_TIME_BUDGET_EXCEEDED` | Run stops, partial record preserved |
| Retry budget exhausted | `FAILED_AFTER_N_RETRIES` | Run stops with attempt history |
| Implementer proposes oscillation | `FAILED_OSCILLATION` | Run stops; pair of conflicting attempts reported |
| `/relay-implement` command not yet available (pipeline WIP) | HALT on first `RETRY_NEEDED` | Feedback written to disk; user applies manually |

---

## What you do NOT do

- **Post-green review** (B5 / `/relay-test-review`): separate command.
- **Write the final PR-ready report** (B6 / `/relay-pr`): separate command.
- **Classify failures yourself** — the `test-runner` agent does that.
- **Invoke `/relay-test-review` automatically** — the `/relay-execute`
  orchestrator does that when composing the full pipeline.
- **Start a new Git branch or worktree** — the orchestrator's
  `/relay-worktree` step owns that.
