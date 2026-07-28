---
description: 'Autonomous multi-phase orchestrator for relay pipeline. Takes an APPROVED PRD and serially drives every actionable Implementation Phases row through plan → plan-review → implement → test → test-review by adopting each downstream command protocol inline via Read (D7 dispatch model; zero logic duplication per D15). Adds exactly two orchestration-layer budgets: max_plan_review_retries=2 (re-runs /relay-plan when /relay-plan-review returns CHANGES_REQUESTED, bounded retry) and max_orchestrator_minutes=240 (session-level wall-clock; 0 forbidden). Maintains orchestrator-run.json audit artifact at PRPs/reports/<feature>/. Eight HALT outcome codes: FAILED_PLAN_REVIEW_BUDGET_EXCEEDED, FAILED_PLAN_REVIEW_STUCK (same rubric items fail across consecutive attempts — early halt before budget exhaustion), FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED, FAILED_TEST_REVIEW_REJECTED, plus four propagated from /relay-implement (FAILED_AFTER_N_RETRIES, FAILED_TIME_BUDGET_EXCEEDED, FAILED_OSCILLATION_DETECTED, FAILED_DISPUTE_CAP_EXCEEDED, PARTIAL_D8_FAILURE) and two from /relay-test. State machine is the source PRD Implementation Phases table (D6); re-invocation is idempotent — picks up at next pending row. TDD routing read at startup; dead code in MVP (B7/B8 unshipped). Phase 6 of figma-visual-first-track.prd.md adds AWAITING_VISUAL_APPROVAL, a new propagated non-failure pause (see the Phase A.1 resumable visual-approval check + the Phase A.2.5 resume short-circuit) distinct from the failure codes above.'
argument-hint: <prd-path>
---

# /relay-execute

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the PRD path argument, run preconditions, then enter a multi-phase orchestration loop that iterates every actionable `pending` row of the source PRD's Implementation Phases table serially. For each phase, adopt the protocol of `/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, and `/relay-test-review` in order by reading each command file inline (D7 dispatch model). Record per-stage outcomes to `PRPs/reports/<feature>/orchestrator-run.json`. On the success path, emit the verbatim terminal summary. On any HALT path, write `PRPs/reports/<feature>/orchestrator-halt.json` and surface the structured HALT message verbatim.

You are autonomous. You do not prompt the user. You do not re-implement any logic from the dispatched commands. You do not loop `/relay-implement` — that command's own internal loop already exhausted its budget before its HALT propagates here.

See:
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan.md` — adopted inline in Phase A.3; owns plan-writer protocol.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan-review.md` — adopted inline in Phase A.3; CHANGES_REQUESTED triggers plan-review retry loop bounded by `max_plan_review_retries`.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` — adopted inline in Phase A.4; owns D8 post-approval mutations (plan trailing-block flip, plan move to `PRPs/plans/completed/`, source PRD row flip `in-progress → complete`).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-test.md` — adopted inline in Phase A.5 when available; command-exists guard required (AC-13 risk mitigation).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-test-review.md` — adopted inline in Phase A.5 when available; CHANGES_REQUESTED HALTs with `FAILED_TEST_REVIEW_REJECTED`.
- `${CLAUDE_PLUGIN_ROOT}/agents/plan-reviewer.md` — CHANGES_REQUESTED bullet-list output format (lines 459-483) captured as `prior_feedback` for plan-review retry loop.

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
  - Three-pillar Pillar 2 (Implementation); interactivity boundary; PRPs/ artifact paths; writer/reviewer split; graceful degradation when /relay-worktree fails OR --no-worktree passed (cwd against current branch)
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

Also scan `$ARGUMENTS` for the optional flag `--no-worktree`. If `--no-worktree` is present, record `no_worktree_flag = true`; otherwise record `no_worktree_flag = false`. When `no_worktree_flag = true`, Phase A.3.3 is entirely skipped and all downstream stages operate against cwd on the current branch — exactly preserving the pre-Phase-3 behavior. The `--no-worktree` flag is extracted before the PRD path token; the PRD path is always the first non-flag token in `$ARGUMENTS`.

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

**Resumable visual-approval check (new, additive — runs BEFORE the zero-actionable-rows exit below; never changes the actionable-row rule above).** For every row whose `Status` cell equals `in-progress`, check whether `PRPs/reports/<feature>/phase-<row's #>/halt.json` exists and, if so, `Read` it. When a row's halt.json has `outcome == "AWAITING_VISUAL_APPROVAL"`:
- If the halt.json carries NO `resolution` field yet (the human has not yet run `/relay-visual-approve`): do NOT apply the zero-actionable-rows exit below, even when no row is independently `pending`. Instead emit:

  > Phase `<row #>` (`<Phase name>`) is awaiting human visual approval. Run
  > `/relay-visual-approve <feature>` to review the captured evidence and
  > approve or reject, then re-run `/relay-execute <prd_path>` to resume.
  > No phase work has been performed this invocation.

  Exit 0. Write no artifacts. This is a structured no-op distinct from AC-6's "all phases complete" message — the PRD is not fully done, it is paused on a human decision.
- If the halt.json carries a `resolution` field (`"approved"` or `"rejected"`, written by `/relay-visual-approve`): this row IS actionable. Do NOT apply the zero-actionable-rows exit below even when no row is independently `pending`. Proceed to Phase A.0 (Phase A.1's own mirror of this check, Task 2, picks up the row and seeds `resume_mode`).

This check is scoped exclusively to `outcome == "AWAITING_VISUAL_APPROVAL"` — a row `in-progress` for any other reason (a `VISUAL_GATE_BLOCKED` halt, or a genuinely fresh in-flight concurrent run with no halt.json at all) falls through unchanged to the zero-actionable-rows check below.

If zero rows are actionable AND no resumable visual-approval row was found above, apply AC-6 (idempotent re-entry):

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

### P5 — test-authoring routing emitted + concurrency soft-fail diagnostic

Read `docs/context/methodology.md` in the target project. Extract the `tdd:` value and whether `test_frameworks` is non-empty. The test writer/reviewer pair ACTIVATES on a declared framework (non-empty `test_frameworks`), in BOTH methodology modes; the `tdd:` value selects ordering (test-first vs test-after).

- If `test_frameworks` non-empty AND `tdd: true` → **test-first** (AC-11 live-routing visibility):

  > Test-authoring routing: tdd: true with a declared framework. TEST-FIRST path:
  > /relay-plan → /relay-plan-review → /relay-write-test → /relay-test-write-review
  > → /relay-implement → /relay-test → /relay-test-review. The pair runs BEFORE
  > the Implementer (Phase A.3.5), budget max_tdd_review_retries=2 (HALT
  > FAILED_TDD_REVIEW_BUDGET_EXCEEDED on exhaustion). R-X strict preserved — the
  > implementer never edits test files; the test pair is the authorized author.

- If `test_frameworks` non-empty AND `tdd: false` → **test-after**:

  > Test-authoring routing: tdd: false with a declared framework. TEST-AFTER path:
  > /relay-plan → /relay-plan-review → /relay-implement → (code-review) →
  > /relay-write-test → /relay-test-write-review → /relay-test → /relay-test-review.
  > The pair runs AFTER the Implementer + Code Review (Phase A.4.5),
  > authoring/updating/retiring tests, budget max_tdd_review_retries=2. R-X strict
  > preserved — the implementer's diff is test-free (code-reviewed), and the
  > pair's test diff is reviewed by test-reviewer, never the code-reviewer.

- If `test_frameworks: []` (empty) or file absent: no note required; proceed silently. Phases A.3.5 and A.4.5 both self-skip (no declared framework — no idiom to author in).

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
- `max_tdd_review_retries = 2` (0 forbidden; 3 total TDD-write attempts including the initial; only consulted in Phase A.3.5 when `tdd: true`)
- `max_orchestrator_minutes = 240` (session-level wall-clock; 0 forbidden)
- `deadline_ts = now() + max_orchestrator_minutes minutes`
- `orchestrator_run_log = []` — accumulator for `orchestrator-run.json`
- `phases_completed = []` — list of phase numbers that reached `complete` this session
- `last_plan_review_failing_ids = null` — set of failing rubric item IDs from the previous plan-review attempt; used by stuck-loop detection in Step A.3.2. Reset to `null` at the start of each phase iteration (Phase A.1).

Read the source PRD's Implementation Phases table in full for the initial snapshot. Hold this snapshot for Phase A.1's first iteration.

### Phase A.1 — Pick next actionable phase

Re-read the Implementation Phases table from `prd_path` (do not reuse a stale snapshot — the table may have been mutated by prior Phase A iterations). Apply the actionable-row selection rule (plan-writer Step 1.3 verbatim):

A row is **actionable** when:
- Its `Status` cell equals `pending` (case-sensitive), AND
- Its `Depends` cell is `-` (empty) OR every comma-separated phase number listed has `Status == complete`.

**Resumable visual-approval check (new, additive — mirrors the P3 precondition's own check verbatim; re-run here because Phase A.1 re-reads the table fresh on every loop iteration, per its own existing "do not reuse a stale snapshot" instruction above).** Before picking the lowest-numbered actionable row below, scan for any row whose `Status` cell equals `in-progress` and whose `PRPs/reports/<feature>/phase-<row's #>/halt.json` has `outcome == "AWAITING_VISUAL_APPROVAL"`:
- No `resolution` field yet: apply the SAME structured no-op the P3 precondition performs (emit the "awaiting human visual approval" message, exit 0, no artifacts) rather than falling through to the "no actionable row" branch below.
- A `resolution` field is present (`"approved"` or `"rejected"`): set `current_phase_N` to that row's `#` and `current_phase_slug` to that row's kebab-cased `Phase` cell (mirroring `plan-writer.md`'s own slug derivation), set `resume_mode` to the `resolution` value, and skip the normal actionable-row pick below entirely — proceed directly to Phase A.2 (Phase A.2.5, Task 3, branches on `resume_mode`).

There is at most one such row under this orchestrator's serial execution model (D6). If none is found, proceed to the normal actionable-row pick below with `resume_mode = null`.

Pick the lowest-numbered actionable row. Record `current_phase_N` and `current_phase_slug`. Set `resume_mode = null` (a fresh, non-resumed phase pick).

Reset `last_plan_review_failing_ids = null` at the start of each new phase iteration so stuck-loop detection does not carry state across phases.

If **no** actionable row is found (all phases are `complete` or all remaining `pending` rows have unsatisfied dependencies):

Write `PRPs/reports/<feature>/orchestrator-run.json` with the final summary:

```json
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": "<ISO timestamp>",
  "max_plan_review_retries": 2,
  "max_tdd_review_retries": 2,
  "max_orchestrator_minutes": 240,
  "phases": <orchestrator_run_log>,
  "outcome": "ALL_PHASES_COMPLETE",
  "phases_completed": <phases_completed>,
  "worktree_attempted": <boolean | null>,
  "worktree_succeeded": <boolean | null>,
  "fallback_reason": "<string | null>"
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
  "orchestrator_run_log": <orchestrator_run_log>,
  "worktree_attempted": <boolean | null>,
  "worktree_succeeded": <boolean | null>,
  "fallback_reason": "<string | null>"
}
```

HALT with verbatim message:

> FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED. /relay-execute aborted after
> max_orchestrator_minutes=240. Phases completed this session: <phases_completed>.
> Partial state preserved on disk; source PRD table reflects whatever phases
> reached complete. Re-invoke /relay-execute to pick up at the next pending row.
> Halt state at PRPs/reports/<feature>/orchestrator-halt.json.

### Phase A.2.5 — Resume-from-visual-approval short-circuit

Runs only when `resume_mode` is non-null (set by Phase A.1's resumable visual-approval check, Task 2). When `resume_mode` is `null` — the case for every project that does not declare `visual_first: true`, and for every ordinary pending-row pick — this phase is a complete no-op: proceed directly to Phase A.3 exactly as today.

`current_plan_path` is derived directly from disk rather than re-running Phase A.3's plan sub-flow: `Glob` `PRPs/plans/<feature>-phase-<current_phase_N>-*.plan.md`. Exactly one match is expected — the plan already reached `*Status: APPROVED*` in the original session that hit the `AWAITING_VISUAL_APPROVAL` halt, so Phase A.3/A.3.3 already ran for this phase before the halt occurred. If zero or more than one match is found, treat as a structural halt:

> FAILED_RESUME_PLAN_AMBIGUOUS: Resuming phase `<current_phase_N>` after a
> visual-approval decision, but `PRPs/plans/<feature>-phase-<current_phase_N>-*.plan.md`
> matched `<count>` file(s) (expected exactly 1). Inspect `PRPs/plans/` by
> hand, remove or rename any stray duplicate, and re-run
> `/relay-execute <prd_path>`.

`Read` the original `PRPs/reports/<feature>/phase-<current_phase_N>/halt.json` in full — it carries `final_visual_verdict`, `fidelity_report_path`, `attempt_history`, and (on rejection) `rejection_feedback`.

**Re-establish `relay-implement.md`'s own `## Parse arguments` values (common to both branches below — enumerated by walking `relay-implement.md`'s own Parse arguments section end to end, since Phase A.3.5-and-later, and, on the rejected branch, Phase A.2-and-later, all depend on them):**
- `plan_path = current_plan_path` (derived above).
- `target_root` — this `/relay-execute` invocation's own `target_root`, already established.
- `is_prd_less = false` — `/relay-execute` has no PRD-less mode; every phase it drives is PRD mode.
- `feature` — this invocation's own `<feature>`, already established. `prd_path = PRPs/prds/<feature>.prd.md`.
- `N = current_phase_N`; `slug = current_phase_slug` — both already established by Phase A.1 (Task 2).
- `artifact_root = PRPs/reports/<feature>/phase-<N>/attempts/` — `relay-implement.md`'s own canonical-pattern formula.
- `completed_target = PRPs/plans/completed/<basename of plan_path>.plan.md`.
- `no_docs_flag = false`, `no_visual_flag = false` — neither flag has a forwarding mechanism from `/relay-execute`'s own `$ARGUMENTS` into an adopted `/relay-implement` protocol, resumed or not; both are always `false` in every `/relay-execute`-driven adoption.

**Branch on `resume_mode`:**

- **`resume_mode == "approved"`** — Append to `orchestrator_run_log`:
  ```json
  {"phase": <current_phase_N>, "stage": "visual_approval", "outcome": "resumed_approved"}
  ```
  Adopt `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md`'s protocol inline starting at its own `Phase A.3.5 — Docs-sync dispatch` — its Phase A.0 initialisation, Phase A.1 pre-flight checks, and Phase A.2/A.3/A.3.4 dispatch are all SKIPPED entirely for this resume, because the implementer, code-reviewer, and visual-verifier already ran to completion in the session that produced the original halt, and the worktree still holds their exact uncommitted output (Phase A.3.4 performs no commit of its own, per the Pillar 2 "never commit" invariant). Beyond the common values above, seed every remaining value `Phase A.3.5` and everything after it reference: `attempt` = the last entry of the re-read halt.json's `attempt_history`; `docs_sync_enabled` = freshly read from `docs/context/methodology.md` (Phase A.0's own default-`true`-when-absent instruction — the original session's own read predates this invocation, so re-reading is required, not optional); `figma_track_declared` = freshly read from the same file (Phase A.0's own default-`false`-when-absent instruction) — needed only so the eventual Final output surface's `Visual:` line gates correctly; `line_index` = the index of the last line already appended to `PRPs/plans/<basename of plan_path>.code-review.jsonl` (written by the original session's own code-reviewer dispatch — nothing appends to it again on this resumed tail); `docs_deferred_questions = []` (fresh, populated as this adopted Phase A.3.5 run proceeds, exactly like a non-resumed run). Record `visual_outcome = "APPROVED (human-approved after <final_visual_verdict>)"` — deliberately distinct from a plain `"APPROVED"` so the eventual summary never silently implies an unreviewed clean machine pass when the underlying verdict was actually `VISUAL_DEGRADED` or `VISUAL_MISMATCH` and a human overrode it. Continue through the adopted protocol's own Phase A.3.5 (docs-sync) and Phase A.4 (D8 mutations) exactly as `relay-implement.md` already specifies. On success, proceed to Phase A.4.5 exactly as Step A.4.1 already does today. On any HALT surfaced during this adopted tail (e.g. `PARTIAL_D8_FAILURE`), route it through Step A.4.1's existing HALT handling (Task 5) unchanged.

- **`resume_mode == "rejected"`** — Append to `orchestrator_run_log`:
  ```json
  {"phase": <current_phase_N>, "stage": "visual_approval", "outcome": "resumed_rejected"}
  ```
  Beyond the common values above, additionally derive `base_branch`/`base_commit` per `relay-implement.md`'s own `P5 — Base-commit derivable` priority chain (`git symbolic-ref refs/remotes/origin/HEAD` → `git remote show origin` → `main` fallback; then `git merge-base HEAD <base_branch>`) — needed by the re-entered Phase A.2's implementer dispatch, and never computed by the skipped Preconditions section otherwise. (`P1`–`P4` are not separately re-run: `P1`/`P2`/`P3` are already known-satisfied by construction — `current_plan_path` resolved above, the plan is still `*Status: APPROVED*` because D8 never ran, and the source PRD row is still `in-progress` because this whole check only fires on that state — and `P4` was already satisfied earlier in this same `/relay-execute` session's own Decision Gate.) Then adopt `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md`'s protocol inline from its OWN `Phase A.0` — a fresh attempt budget, fresh `deadline_ts`, `attempt = 1`, exactly as every other halt-then-manual-fix-then-rerun path in this codebase already resets — a full re-run, since the human's rejection means real rework may be needed. The one deviation from `Phase A.0`'s own unconditional initialisation: set `last_reviewer_feedback = [{rubric_id: "human_visual_rejection", reason: <the re-read halt.json's rejection_feedback text>}]` instead of the empty list `Phase A.0` normally sets it to — the same `[{rubric_id, reason}]` shape the existing `DISPUTE_REJECTED` arbitration branch already populates it with, reused rather than inventing a new shape. `relay-implement.md`'s own `Phase A.2` implementer dispatch reads `prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>` (Task 4 amends this condition so a non-empty `last_reviewer_feedback` is honored at `attempt == 1` too — see Task 4) — so this seeded value reaches the implementer's very first dispatch of the resumed session, satisfying AC-A2. Every other mechanic — retry budget, oscillation detection, dispute cap, Phase A.3.4's visual gate, Phase A.3.5, Phase A.4 — runs exactly as `relay-implement.md`'s own protocol already specifies from a genuinely fresh `attempt = 1`, including the possibility of hitting `AWAITING_VISUAL_APPROVAL` again if the fix round's own result is again gated by `visual_first_approval: human` — which loops back through this exact same resume mechanism on a later re-invocation.

Skip Phase A.3 (plan sub-flow) and Phase A.3.3 (worktree creation) entirely for this iteration in both branches above — the plan is already `APPROVED` and the worktree already exists from the original session. Once the adopted tail above completes, proceed to Phase A.4.5 → Phase A.5 → Phase A.6 exactly as the normal per-phase flow already does.

### Phase A.3 — Per-phase plan sub-flow (plan-review retry loop)

#### Step A.3.1 — Adopt /relay-plan role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan.md` and execute its full protocol inline for the current phase. Pass context:

- `prd_path`: the resolved absolute path verified by P1–P3
- `target_root`: the cwd
- `prior_feedback`: null on first attempt for this phase; the captured rubric defect bullet-list on retry attempts

The plan-writer's Phase 5.1 back-fill flips the row `pending → in-progress` and populates the PRP Plan cell. Record the generated DRAFT plan path as `current_plan_path`.

Set `plan_review_attempts = 0`.

#### Step A.3.2 — Adopt /relay-plan-review role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan-review.md` and execute its full protocol inline against `current_plan_path`.

**On APPROVED:**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "plan", "outcome": "APPROVED", "plan_path": "<current_plan_path>"}
```

Proceed to Phase A.3.3.

**On CHANGES_REQUESTED:**

Capture the rubric defect bullet-list output (format documented at `plugins/relay/agents/plan-reviewer.md:459-483`). This is the structured list of failing rubric item IDs + reasons.

Increment `plan_review_attempts`.

**Stuck-loop detection (before budget check):**

Extract the set of failing rubric item IDs from the current verdict
(the `id` values of all `passed: false` rows in the JSONL entry just
appended). Call this `current_failing_ids`.

If `last_plan_review_failing_ids` is **not null** AND
`current_failing_ids` is identical to `last_plan_review_failing_ids`
(same set of IDs regardless of order), the plan-writer made zero
progress on the failing items — the loop is stuck.

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_PLAN_REVIEW_STUCK",
  "phase_N": <N>,
  "plan_path": "<current_plan_path>",
  "stuck_rubric_items": <current_failing_ids>,
  "stuck_attempts_count": <plan_review_attempts>,
  "plan_review_attempts": <plan_review_attempts>,
  "max_plan_review_retries": <max_plan_review_retries>,
  "failing_rubric_items": <captured defect list>,
  "orchestrator_run_log": <orchestrator_run_log>,
  "worktree_attempted": <boolean | null>,
  "worktree_succeeded": <boolean | null>,
  "fallback_reason": "<string | null>",
  "halt_reason_summary": "The same rubric items failed across two consecutive plan-review attempts with no change. The plan-writer cannot resolve these items mechanically within the current retry budget. Manual intervention is required — inspect the stuck rubric items for a rubric edge case (e.g., R-COH-VALIDATE-FRAMEWORK-MISMATCH on a scaffold phase without phase_type set).",
  "manual_recovery_paths": [
    "Inspect the stuck_rubric_items list. If the failure is a rubric edge case for this phase type, add `phase_type: scaffold` (or the appropriate value) to the plan's ## Metadata table and re-run /relay-execute — the plan-reviewer Phase 0 pre-pass will detect it on the next invocation.",
    "Edit the plan manually to resolve the stuck rubric items, then re-run /relay-execute.",
    "Implement the phase manually, bypassing the orchestrator for this phase only."
  ]
}
```

HALT with verbatim message:

> FAILED_PLAN_REVIEW_STUCK. /relay-execute detected a stuck plan-review
> loop for phase <N>: the same rubric items failed in two consecutive
> attempts without progress.
> Stuck items: <current_failing_ids>.
> plan_review_attempts=<plan_review_attempts>, max_plan_review_retries=<max_plan_review_retries>.
> Halting early rather than burning the remaining retry budget.
> Halt state at PRPs/reports/<feature>/orchestrator-halt.json.
> Manual recovery: inspect the stuck rubric items. If the root cause
> is a rubric edge case (e.g., R-COH-VALIDATE-FRAMEWORK-MISMATCH on
> a scaffold phase), add `phase_type: scaffold` to the plan's
> ## Metadata table and re-run /relay-execute.

Set `last_plan_review_failing_ids = current_failing_ids` before any
retry (so the next attempt has a valid baseline for comparison).

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

### Phase A.3.3 — Per-phase worktree creation sub-flow

#### Step A.3.3.0 — `--no-worktree` gate

If `no_worktree_flag = true`: skip this phase entirely. Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "worktree", "outcome": "skipped_no_worktree_flag", "worktree_attempted": false}
```
Proceed directly to Phase A.3.5.

#### Step A.3.3.1 — Adopt /relay-worktree role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-worktree.md` and execute its full protocol inline for feature `<feature>`. Pass context:

- `feature`: `<feature>` (derived from the PRD basename in the Parse arguments section)
- `target_root`: the cwd

#### Step A.3.3.2 — Record outcome

**On success (exit 0 / worktree created or idempotently re-used):**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "worktree", "outcome": "CREATED", "worktree_path": ".worktrees/<feature>/", "worktree_attempted": true, "worktree_succeeded": true, "fallback_reason": null}
```

Proceed to Phase A.3.5. All subsequent stages (A.3.5 TDD, A.4 implement, A.5 test) operate with the worktree context established in A.3.3.

**On failure (non-zero exit / /relay-worktree returns a named HALT code):**

Log a structured warning:

> Warning: worktree-creation failure — falling through to cwd-based execution per D3/D4 graceful-degradation. /relay-worktree returned: `<exit-code or error message>`. All subsequent stages will operate against cwd on the current branch.

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "worktree", "outcome": "FALLBACK_CWD", "worktree_attempted": true, "worktree_succeeded": false, "fallback_reason": "<exit-code or error message>"}
```

Continue to Phase A.3.5. The pipeline does NOT halt on worktree-creation failure — only on downstream stage failure (per D8 of relay-worktree.prd.md).

### Phase A.3.5 — Per-phase TDD sub-flow (test-write-review retry loop)

Conditional on `methodology.md` `tdd:` value read in P5.

#### Step A.3.5.0 — methodology.md gate (activation = declared framework; ordering by `tdd:`)

Re-read `<target_root>/docs/context/methodology.md` (already read in P5 — re-read here protects against mid-flow mutations). The single activation gate is a declared test framework; the `tdd:` value selects WHERE the pair runs relative to the Implementer — **test-first** (here, before A.4) when `tdd: true`, **test-after** (Phase A.4.5, after A.4 + code-review) when `tdd: false`.

- If file absent OR `test_frameworks: []` (empty): the pair self-skips entirely (no idiom to author in, either mode). Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "tdd", "outcome": "skipped_no_framework"}
  ```
  Proceed directly to Phase A.4. No suite manifest is produced.

- If `test_frameworks` non-empty AND `tdd: false` → **test-after ordering**: the pair does NOT run here. Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "tdd", "outcome": "deferred_to_test_after"}
  ```
  Proceed to Phase A.4; the pair runs at Phase A.4.5 (post-implement, post-code-review) so its test-file diff is never seen by the code-reviewer's R-X — which by then has already approved the Implementer's test-free diff.

- If `test_frameworks` non-empty AND `tdd: true` → **test-first ordering**: proceed to the phase_type gate below and run the pair here, before the Implementer. (The foundation self-skip below applies to test-first only; in test-after the seam already exists by A.4.5.)

**phase_type gate (foundation self-skip):** `Read` `current_plan_path`'s
`## Metadata` table and inspect the `phase_type` row (populated by the
plan-writer, or by the plan-reviewer's Phase 0 pre-pass during
A.3.2/A.3.2.x).

- If `phase_type: foundation`: A.3.5 self-skips. A foundation phase
  creates the seam (entities, repositories, resolvers,
  schema/migrations) that later phases depend on — its ACs are precise
  but not test-first-authorable until the seam exists, so the
  implementer materializes it and the feature phases that follow run
  fully test-first. Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "tdd", "outcome": "skipped_foundation_phase"}
  ```
  Proceed directly to Phase A.4. No suite manifest is produced. (This
  is symmetric with A.3.5.1's inline adoption of `/relay-write-test`, whose P5
  gate self-skips the same case; the gate is duplicated here so the
  orchestrator records the correct `skipped_foundation_phase` outcome
  rather than surfacing the command's self-skip message as a phase
  result.)

- Otherwise (`phase_type` absent, or `feature`/`scaffold`/`docs`/
  `refactor`): proceed to Step A.3.5.1.

Set `tdd_review_attempts = 0`.

#### Step A.3.5.1 — Adopt /relay-write-test role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-write-test.md` and execute its full protocol inline against `current_plan_path`. Pass context:

- `plan_path`: `current_plan_path`
- `target_root`: the cwd
- `prior_feedback`: null on first attempt; the captured B8 JSONL line on retry attempts (orchestrator-side feedback channel)

The Writer either:
- Produces a DRAFT suite manifest at `PRPs/reports/<feature>/test-suite.diff` with aggregate verdict `SUITE_DRAFT_WRITTEN` or `EXISTING_COVERAGE_SUFFICIENT` → continue to Step A.3.5.2.
- Halts on `AMBIGUOUS` ACs → surface the verbatim halt; write `orchestrator-halt.json`:
  ```json
  {
    "outcome": "FAILED_TDD_AMBIGUOUS_ACS",
    "phase_N": <N>,
    "halting_stage": "tdd_writer",
    "ambiguous_acs": <captured AC list from B7 halt>,
    "orchestrator_run_log": <orchestrator_run_log>,
    "manual_recovery_paths": [
      "If the ambiguous ACs are genuinely vague (no Given/When/Then, no explicit input/output, or they name an implementation method rather than an observable) — tighten those ACs in the source PRD and re-run /relay-execute.",
      "If the ambiguous ACs are precise (clear Given/When/Then) but this phase CREATES the seam they describe — the types/methods do not exist yet, so a test-first suite cannot be authored without referencing non-existent symbols (which breaks a compiled language's test source set) or inventing production signatures (forbidden for B7). This is an ordering problem, not an AC-quality problem: mark the plan's ## Metadata `phase_type: foundation` and re-run /relay-execute. A.3.5's phase_type gate will self-skip test-first for this phase, the implementer will materialize the seam, and the feature phases that follow will run fully test-first."
    ]
  }
  ```
  HALT the orchestrator with the recovery guidance from
  `manual_recovery_paths`. **Do not assume the ACs are vague** — B7's
  `AMBIGUOUS` verdict fires both for genuinely-vague ACs and for
  precise-but-not-yet-seam-backed ACs on a foundation phase.
  Distinguish the two in the surfaced message: recommend tightening the
  PRD ACs **only** when the ACs actually lack Given/When/Then
  concreteness; when the ACs are precise and the phase creates the
  types under test, recommend the `phase_type: foundation` escape
  hatch instead.

Record the suite path as `current_suite_path`.

#### Step A.3.5.2 — Adopt /relay-test-write-review role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-test-write-review.md` and execute its full protocol inline against `current_suite_path`.

**On APPROVED:**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "tdd", "outcome": "APPROVED", "suite_path": "<current_suite_path>"}
```

Proceed to Phase A.4. The implementer's contract for this phase is now the B8-APPROVED suite — R-X strict guarantees no test-file edits in the implementer's diff.

**On CHANGES_REQUESTED:**

Capture the rubric defect bullet-list (failing rubric ids + reasons) from the JSONL line just appended to `PRPs/plans/<basename>.test-write-review.jsonl`. This is the structured feedback for the next /relay-write-test attempt.

Increment `tdd_review_attempts`.

If `tdd_review_attempts > max_tdd_review_retries`:

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "FAILED_TDD_REVIEW_BUDGET_EXCEEDED",
  "phase_N": <N>,
  "halting_stage": "tdd_reviewer",
  "failing_rubric_items": <captured defect list>,
  "tdd_review_attempts": <tdd_review_attempts>,
  "suite_path": "<current_suite_path>",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

HALT with verbatim message:

> FAILED_TDD_REVIEW_BUDGET_EXCEEDED. /relay-execute exhausted TDD-review
> retries for phase <N> (max_tdd_review_retries=2, attempts=<tdd_review_attempts>).
> Failing rubric items: <captured defect list>.
> Suite manifest left at *Status: DRAFT* at <current_suite_path>.
> Halt state at PRPs/reports/<feature>/orchestrator-halt.json.
> Manual recovery: tighten the PRD ACs (likely AMBIGUOUS root cause), or hand-
> edit the suite, then re-run /relay-execute. The implementer is NOT invoked
> on TDD-budget exhaustion — running /relay-implement against an unapproved
> TDD suite would violate R-X strict in the test-file write direction.

Else: re-adopt `/relay-write-test` role passing `prior_feedback = <captured defect list>`. Loop back to Step A.3.5.2.

### Phase A.4 — Per-phase implement sub-flow

#### Step A.4.1 — Adopt /relay-implement role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-implement.md` and execute its full protocol inline against `current_plan_path`. The command's own D8 post-approval mutations run as part of its internal Phase A.4:
- Mutation a: plan trailing-block flip `*Status: APPROVED*` → `*Status: IMPLEMENTED*`
- Mutation b: plan move to `PRPs/plans/completed/<basename>.plan.md`
- Mutation c: source PRD row flip `in-progress → complete`

**On success path (APPROVED rubric + D8 mutations succeeded):**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "implement", "outcome": "APPROVED"}
```

Proceed to Phase A.4.5 (test-after sub-flow; a no-op unless this phase deferred to test-after at Step A.3.5.0).

**On `AWAITING_VISUAL_APPROVAL` from /relay-implement (new — checked BEFORE the generic "on any OTHER HALT" branch below; this is a deliberate pause, not a failure):**

Append to `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "implement", "outcome": "HALT:AWAITING_VISUAL_APPROVAL"}
```

Write `PRPs/reports/<feature>/orchestrator-halt.json`:

```json
{
  "outcome": "AWAITING_VISUAL_APPROVAL",
  "phase_N": <N>,
  "halting_stage": "implement",
  "underlying_halt_ref": "PRPs/reports/<feature>/phase-<N>/halt.json",
  "orchestrator_run_log": <orchestrator_run_log>
}
```

Note the `outcome` value carries NO `FAILED_` prefix — this HALT is a deliberate pause pending a human decision, not a failure. Surface `/relay-implement`'s own halt message verbatim, then HALT the orchestrator with the additional verbatim message:

> This is not a failure — `visual_first_approval: human` requires an
> explicit human decision before this phase can complete. Run
> `/relay-visual-approve <feature>` to review the captured evidence and
> approve or reject. Once a decision is recorded, re-running
> `/relay-execute <prd_path>` IS the correct next step — it resumes this
> exact phase via the resumable visual-approval check (Phase A.1) rather
> than restarting the plan/implement loop from scratch.

**On any OTHER HALT from /relay-implement** (`FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`, `VISUAL_GATE_BLOCKED`):

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

### Phase A.4.5 — Per-phase test-after sub-flow (test-after ordering only)

Runs the test writer/reviewer pair AFTER the Implementer + Code Review, but ONLY
when Step A.3.5.0 recorded `deferred_to_test_after` for this phase
(`test_frameworks` non-empty AND `tdd: false`). In every other case — test-first
(the pair already ran at A.3.5) or `skipped_no_framework` — this phase is a
no-op: proceed directly to Phase A.5.

Because the Implementer (A.4) and Code Reviewer have already run and approved a
test-free diff, R-X held on the Implementer's diff. The pair now authors,
updates, and retires tests in **test-after** mode; its test-file diff is reviewed
by `test-reviewer` (via `/relay-test-write-review`), never by the code-reviewer —
so R-X never sees it.

#### Step A.4.5.0 — gate

Re-read `<target_root>/docs/context/methodology.md`. If NOT (`test_frameworks`
non-empty AND `tdd: false`) — i.e. this phase was test-first or framework-less —
append `{"phase": <N>, "stage": "test_after", "outcome": "not_applicable"}` to
`orchestrator_run_log` and proceed directly to Phase A.5. There is NO foundation
self-skip here: in test-after the Implementer has already materialized the seam.

Set `tdd_review_attempts = 0`.

#### Step A.4.5.1 — Adopt /relay-write-test role (test-after)

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-write-test.md` and execute its full
protocol inline against `current_plan_path` (same adoption as Step A.3.5.1; the
command and Writer derive `mode = test-after` from `tdd: false` themselves). The
Writer produces a DRAFT `PRPs/reports/<feature>/test-suite.diff` — including any
lifecycle-ledger entries for updated/retired tests — → continue to Step A.4.5.2;
or halts on `AMBIGUOUS` ACs → surface verbatim and write `orchestrator-halt.json`
with `outcome: "FAILED_TDD_AMBIGUOUS_ACS"` exactly as Step A.3.5.1. Note: the
`phase_type: foundation` recovery path does NOT apply in test-after (the seam
already exists), so recommend tightening the ACs. Record the suite path as
`current_suite_path`.

#### Step A.4.5.2 — Adopt /relay-test-write-review role (test-after)

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-test-write-review.md` and execute its
full protocol inline against `current_suite_path` (same retry loop as Step
A.3.5.2, bounded by `max_tdd_review_retries`; the reviewer applies its
GREEN-legitimate check + `R-LIFECYCLE-LEGITIMATE` because `tdd: false`).

- **On APPROVED:** append `{"phase": <N>, "stage": "test_after", "outcome": "APPROVED", "suite_path": "<current_suite_path>"}`; proceed to Phase A.5. The APPROVED suite manifest (with its lifecycle ledger) is the positive authorization the post-green reviewer (B5, Step A.5.3) consults for legitimate removals/skips.
- **On CHANGES_REQUESTED:** capture the defect list; increment `tdd_review_attempts`; if `> max_tdd_review_retries`, write `orchestrator-halt.json` with `outcome: "FAILED_TDD_REVIEW_BUDGET_EXCEEDED"` (same shape as Step A.3.5.2) and HALT; else re-adopt `/relay-write-test` with `prior_feedback = <defect list>` and loop back to Step A.4.5.2.

### Phase A.5 — Per-phase test sub-flow (guarded by command-exists check)

#### Step A.5.0 — methodology.md gate (self-skip when `test_frameworks: []` or file absent)

Re-read `<target_root>/docs/context/methodology.md` (already read in P5 — re-read here protects against mid-flow mutations).

- If file absent or `test_frameworks: []` (empty list): A.5 self-skips. Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}
  ```
  Proceed directly to Phase A.6. Steps A.5.1–A.5.3 are not reached.

- If `test_frameworks` is non-empty: proceed to Step A.5.1.

#### Step A.5.1 — Command-exists check

Check that both `${CLAUDE_PLUGIN_ROOT}/commands/relay-test.md` and `${CLAUDE_PLUGIN_ROOT}/commands/relay-test-review.md` are readable.

If either is absent: emit structured warning:

> Warning: relay-test / relay-test-review not available; skipping test
> stage for phase <N>. The command file(s) could not be read at:
>   ${CLAUDE_PLUGIN_ROOT}/commands/relay-test.md
>   ${CLAUDE_PLUGIN_ROOT}/commands/relay-test-review.md
> Proceeding to Phase A.6 (state-transition record + loop).

Record in `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test", "outcome": "skipped_command_absent"}
```

Proceed to Phase A.6.

#### Step A.5.2 — Adopt /relay-test role

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-test.md` and execute its full protocol inline.

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

Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-test-review.md` and execute its full protocol inline.

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

> **Note — de-facto contradictory path now structurally impossible:** Prior to Step A.5.0, a framework-less project could reach Phase A.5 and receive a `FAILED_INFRA_UNRECOVERABLE` outcome from `/relay-test` while the session still declared `ALL_PHASES_COMPLETE` (observed in dogfood-B, 2026-05-11). This path is now structurally impossible: Step A.5.0 intercepts the `test_frameworks: []` or file-absent case before any command dispatch, logs `skipped_no_test_framework`, and proceeds directly to Phase A.6 — bypassing Steps A.5.1–A.5.3 entirely. A framework-declared project that encounters genuine infra failure (missing `settings.json`, docker not running, container failure, normalizer failure) still reaches Step A.5.2 and HALTs with `FAILED_INFRA_UNRECOVERABLE` before reaching Phase A.6 or `ALL_PHASES_COMPLETE`. The two paths are mutually exclusive at the structural level; a session cannot simultaneously enter the A.5.0 self-skip branch and the A.5.2 strict-halt branch.

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

**`visual_outcome` field (Figma Implementation Track Phase 7 — gated,
mirrors `/relay-implement`'s own `Visual:` line idiom exactly).** When
the just-adopted `/relay-implement` protocol (Step A.4.1) emitted a
`Visual:` line in its Final output surface for this phase — present
only when that phase's own `figma_track_declared == true` (per
`relay-implement.md` Phase A.0) — capture the line's `<visual_outcome>`
value (`APPROVED` / a named degraded rung / `BUDGET_EXCEEDED` /
`BUDGET_EXCEEDED_REVERTED` / `SKIPPED (not figma-sourced)` /
`SKIPPED (--no-visual)`) and add it to the completion record above as
a `visual_outcome` key. When the `Visual:` line was absent for this
phase (`figma_track_declared == false`, or the target project does
not declare `figma_track` at all), the `visual_outcome` key is
OMITTED from the completion record entirely — not `null`, a
genuinely absent key, matching the line-omission idiom
`/relay-implement`'s own `Visual:` line already established (PRD AC-1
of `figma-implementation-track.prd.md`): a non-Figma project's
`orchestrator-run.json` stays byte-identical to today's.

Write / overwrite `PRPs/reports/<feature>/orchestrator-run.json` with the full log:

```json
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": null,
  "max_plan_review_retries": 2,
  "max_tdd_review_retries": 2,
  "max_orchestrator_minutes": 240,
  "phases": <orchestrator_run_log>,
  "outcome": null,
  "phases_completed": <phases_completed>,
  "worktree_attempted": <boolean | null>,
  "worktree_succeeded": <boolean | null>,
  "fallback_reason": "<string | null>"
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
> Working tree in .worktrees/<feature>/ carries uncommitted implementation changes.
> Next step (Pillar 3): review the changes, run any manual tests, then:
>   1. /relay:relay-commit <feature>  — commit locally (reversible; no push)
>   2. /relay:relay-pr <feature>      — push branch + open PR

**Gated visual-fidelity rollup line (Figma Implementation Track Phase
7).** Immediately after the "Orchestrator audit log at ..." line
above, add one additional line — present ONLY when at least one
completion record in `orchestrator_run_log` carries a `visual_outcome`
key (i.e. `figma_track_declared == true` for at least one completed
phase this session); OMITTED ENTIRELY (no line, no `SKIPPED` marker,
nothing) when zero completion records carry the key, so a non-Figma
project's terminal summary stays byte-identical to today's:

> Visual fidelity: <N> phase(s) APPROVED, <M> degraded, <K>
> mismatch/budget-exceeded (see
> PRPs/reports/<feature>/orchestrator-run.json).

Tally `<N>` / `<M>` / `<K>` from every completion record's
`visual_outcome` value across the session: `<N>` counts `APPROVED`;
`<M>` counts any named degraded rung (`DEGRADED_STATIC_ONLY` /
`DEGRADED_PROVISION_FAILED` / `SKIPPED (not figma-sourced)` /
`SKIPPED (--no-visual)`); `<K>` counts `BUDGET_EXCEEDED` /
`BUDGET_EXCEEDED_REVERTED`. Phases without a `visual_outcome` key
(i.e. `figma_track_declared == false` for that phase, or the target
project does not declare `figma_track` at all — the same omission
condition defined above) are excluded from all three counts; note
this is distinct from a phase whose own plan simply isn't
Figma-sourced under an active `figma_track_declared == true` project
— that case still carries a `visual_outcome` key
(`SKIPPED (not figma-sourced)`) and is counted in `<M>` above.

### HALT paths

On any HALT path (one of `FAILED_PLAN_REVIEW_BUDGET_EXCEEDED`, `FAILED_ORCHESTRATOR_TIME_BUDGET_EXCEEDED`, `FAILED_TEST_REVIEW_REJECTED`, or a propagated `/relay-implement` or `/relay-test` HALT), the verbatim HALT message is emitted by the relevant Phase A.* sub-section above and the command exits. The `orchestrator-halt.json` at `PRPs/reports/<feature>/orchestrator-halt.json` carries the structured failure state, the halting stage, the underlying halt reference (when applicable), and the partial `orchestrator_run_log` for post-mortem audit. One propagated code, `AWAITING_VISUAL_APPROVAL`, is a deliberate pause pending a human decision rather than a failure — see Phase A.1's resumable visual-approval check and Step A.4.1's dedicated branch above; its `orchestrator-halt.json` `outcome` field carries no `FAILED_` prefix, and re-running `/relay-execute` is the correct, sanctioned next step once `/relay-visual-approve` has recorded a decision.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** All orchestrator artifacts go to `PRPs/reports/<feature>/` (`orchestrator-run.json`, `orchestrator-halt.json`). Per-phase artifacts (plan, implementation diff, test run) go to their respective per-command paths under `PRPs/`. Nothing goes under `.claude/` — the permission guards are intentional and break the autonomous loop.

2. **Never bundle writer + reviewer.** The orchestrator dispatches existing commands (`/relay-plan`, `/relay-plan-review`, `/relay-implement`, `/relay-test`, `/relay-test-review`). It does not create combined writer-reviewer agents or bypass the split decision (2026-04-19).

3. **Never re-implement logic from the five dispatched commands.** The orchestrator references each command file by `${CLAUDE_PLUGIN_ROOT}` path and adopts its protocol inline. If `/relay-plan` changes, `/relay-execute` inherits the change automatically. Zero logic duplication (D15).

4. **Never prompt the user.** Past the interactivity boundary (`docs/context/architecture.md` §Interactivity boundary). HALTs are surfaced verbatim and the command exits.

5. **Never re-run `/relay-implement` after a HALT.** `/relay-implement`'s internal loop already exhausted its budget. The orchestrator surfaces the halt and exits. Manual recovery is required before re-invoking. **Exception:** the `AWAITING_VISUAL_APPROVAL` pause is not a failure — Phase A.1's resumable visual-approval check and Phase A.2.5's resume short-circuit are the SANCTIONED mechanism for resuming that specific phase's adopted `/relay-implement` protocol after a human records a decision via `/relay-visual-approve`; every other HALT code is unaffected by this exception.

6. **Never skip the Decision Gate evidence block.** The command-level Decision Gate (above) is the first user-facing output per AC-14.

7. **Never set `max_plan_review_retries` or `max_orchestrator_minutes` to 0.** 0 disables the budget, which defeats its purpose (same discipline as `max_implement_retries` and `max_implement_minutes` in `/relay-implement`).

8. **Never orchestrate multiple PRDs in one invocation.** One PRD per `/relay-execute` invocation. Cross-PRD orchestration is a separate future concern.

9. **When a test framework is declared (`test_frameworks` non-empty), the orchestrator invokes `/relay-write-test` and `/relay-test-write-review` in BOTH methodology modes with budget `max_tdd_review_retries=2` (HALT `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` on exhaustion): in Phase A.3.5 BEFORE the Implementer when `tdd: true` (test-first), or in Phase A.4.5 AFTER the Implementer + Code Review when `tdd: false` (test-after).** When `test_frameworks: []` or `methodology.md` is missing, both A.3.5 and A.4.5 self-skip silently (no declared framework — no idiom to author in). The implementer is NEVER invoked when A.3.5 (test-first) halted — running it against an unapproved test suite would violate R-X strict in the test-file write direction. In test-after, R-X holds structurally: the pair runs only after the Implementer's test-free diff has already been code-reviewed, and the pair's own test diff is reviewed by `test-reviewer`, never the code-reviewer.

10. **`/relay-worktree` is invoked in Phase A.3.3 by default before Phase A.3.5.** When `--no-worktree` is passed, Phase A.3.3 is entirely skipped. When `/relay-worktree` returns a non-zero exit code, the orchestrator logs a warning, records `worktree_succeeded: false` and `fallback_reason` in `orchestrator-run.json`, and continues against cwd — the pipeline does NOT halt on worktree-creation failure (D8 of relay-worktree.prd.md). The worktree at `.worktrees/<feature>/` and its branch `feature/<feature>` persist on disk even if /relay-execute halts mid-pipeline (AC-15).

11. **Never commit working-tree changes or create a PR.** `/relay-execute` terminates at "all phases complete" state with implementation changes uncommitted in the worktree. `git add`, `git commit`, `git push`, `gh pr create`, and any equivalent operations are Pillar 3's exclusive responsibility (`/relay-commit` then `/relay-pr`). This is a permanent architectural boundary, not a deferral — see `docs/decisions.md` 2026-05-18.

---

## What you do NOT do

- **Re-implementing plan-writer logic** — the orchestrator adopts `/relay-plan` inline via Read; it does not paste or summarize plan-writer's step bodies.
- **Running the plan rubric inline** — the orchestrator adopts `/relay-plan-review` inline via Read; it does not evaluate R1–R8 or R-COH-* rubric items itself.
- **Committing working-tree changes or creating a PR** — permanently out of scope (see hard rule 11 and `docs/decisions.md` 2026-05-18). Pillar 3 (`/relay-pr`) owns commit and PR creation exclusively. The success message points to `/relay-pr` as the next manual step.
- **Auto-recovering from `/relay-implement` HALT** — the orchestrator surfaces the halt and exits. Manual intervention is required.
- **Auto-recovering from `/relay-test-review` CHANGES_REQUESTED** — HALT with `FAILED_TEST_REVIEW_REJECTED`; no auto-correction path. B5 exists precisely to gate human review.
- **Targeting a specific phase via `--phase <N>` flag** — Could-item; deferred. Idempotency via D6 state machine (re-invocation picks up at next pending row) is sufficient for MVP.
- **Persisting research blobs** — research subagents invoked during `/relay-plan` adoption write to the plan file via the plan-writer protocol; no separate research artifact is written by the orchestrator.
- **Committing between phases or at the end** — permanently out of scope (covered by hard rule 11). Commit discipline belongs to Pillar 3.
- **Re-running a `complete` phase** — refused via P3 (zero actionable rows with status `complete` are not re-picked). Manual hand-edit of the row's `Status` cell back to `pending` is the documented escape hatch.
- **Parallel phase orchestration** — MVP is strictly serial. The `Parallel` cell is read but not acted upon.
- **Multi-PRD orchestration** — one PRD per invocation; cross-PRD coordination is a separate orchestrator's job.
- **Performing the human visual-approval decision itself** — that dialogue lives entirely in the separate, explicitly human-triggered `/relay-visual-approve` command; `/relay-execute` never asks the user anything, it only detects an already-recorded decision (Phase A.1) and resumes (Phase A.2.5).
