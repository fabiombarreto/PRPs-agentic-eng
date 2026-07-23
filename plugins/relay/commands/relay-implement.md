---
description: 'Autonomous code generation from an APPROVED plan. Validates the plan path, runs preconditions, then adopts the implementer/code-reviewer pair via an internal writer↔reviewer loop with bounded retries (max_implement_retries=3), wall-clock budget (max_implement_minutes=45), oscillation detection always-on, dispute cap (max_disputes_per_session=2), per-attempt diff capture at PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch, and on APPROVED rubric dispatches a docs-sync sub-phase (Phase A.3.5 — docs-updater/docs-reviewer pair, non-interactive, own max_docs_review_retries=2 budget, gated by docs_sync/--no-docs, graceful degradation on budget exhaustion, docs pair grounded via explicit feature/prd_path inputs rather than orchestrator-run.json which does not exist yet at implement time) before performing all three D8 post-approval mutations atomically (plan trailing-block flip to *Status: IMPLEMENTED*, plan move to PRPs/plans/completed/, source PRD row N flip from in-progress to complete). Reviewer adoption is single-shot via Task per attempt — there is no Phase B; the loop lives entirely inside Phase A.'
argument-hint: <plan-path>
---

# /relay-implement

**Arguments:** `$ARGUMENTS`

---

## Your mission

Validate the plan path argument, run the preconditions check, then run an internal writer↔reviewer loop that dispatches the `implementer` agent (Phase 1 of `implementation-authoring`, color: green) and the `code-reviewer` agent (Phase 2, color: magenta) once per attempt. Capture `git diff <base-commit>` to a per-attempt artifact after every attempt regardless of verdict. Enforce four orthogonal stop conditions (retry budget, wall-clock budget, oscillation detection, dispute cap) with distinct outcome codes. On APPROVED rubric, run a docs-sync dispatch (Phase A.3.5) that invokes the `docs-updater`/`docs-reviewer` pair non-interactively to sync `docs/` in the worktree — gated by `docs_sync` (`docs/context/methodology.md`) and a per-invocation `--no-docs` flag, with its own bounded retry budget that degrades gracefully (never blocks D8) on exhaustion, grounding the pair via explicit `feature`/`prd_path` inputs rather than `orchestrator-run.json` (which does not exist yet at implement time) — then perform all three D8 post-approval mutations atomically (best-effort) with rollback note on partial failure.

You are autonomous. You do not prompt the user. You do not loop the writer↔reviewer pair across `/relay-implement` invocations — that is `/relay-execute`'s job. A single `/relay-implement` invocation produces zero or one APPROVED implementation; the loop is internal.

See:
- `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/implementation-authoring.prd.md` — source PRD with D1–D18 decisions and AC-1 through AC-14, especially D7 (budgets), D8 (post-approval mutations), D9 (TDD opt-in / dispute escape valve), D14–D18 (resolved Open Questions).
- `${CLAUDE_PLUGIN_ROOT}/agents/implementer.md` — the implementer agent's input/output contract (verdict shapes: `IMPLEMENTATION_COMPLETE` and `TEST_CONTRACT_DISPUTE`); D8 boundary (mutations are COMMAND-owned, not agent-owned).
- `${CLAUDE_PLUGIN_ROOT}/agents/code-reviewer.md` — the code-reviewer agent's input/output contract (modes `standard` and `arbitration`; rubric IDs R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X plus R-COH-* additive; jsonl audit log shape).
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-test.md` — closest precedent for the internal-loop pattern with budget checks + oscillation detection + per-attempt artifacts + outcome code distinction.
- `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan.md` — sibling writer-only command shape (Decision Gate emission, Preconditions structure, Final output / Constraints / What you do NOT do sections).
- `docs/context/plan-template.md` (in the target project) — canonical plan shape; the command reads the Step-by-Step Tasks, Validation Commands, Files to Change, and Acceptance Criteria sections from a plan that conforms to this template.

---

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

If the Decision Gate cannot be emitted because one of the three sources is unreadable, fall through to P4 below for the canonical halt message; do not attempt the gate against an incomplete source set.

---

## Parse arguments

Extract flags first, before the positional plan-path parse. Scan `$ARGUMENTS` for the literal token `--no-docs`; when present, strip it from `$ARGUMENTS` and record `no_docs_flag = true` (default `false`) — mirrors `relay-approve.md`'s own `--no-docs` → `no_docs_flag` extraction (`plugins/relay/commands/relay-approve.md:28-32`).

Scan `$ARGUMENTS` for the literal token `--no-visual`; when present, strip it from `$ARGUMENTS` and record `no_visual_flag = true` (default `false`) — sibling extraction to `--no-docs` above, consumed by Phase A.3.4's gate (below).

`$ARGUMENTS` (after flag extraction) MUST be a single non-empty path-like string. Treat the argument as the plan path; resolve it as absolute, or as relative to the current working directory. If the argument is blank/whitespace, HALT with:

> /relay-implement requires a plan path. Usage:
>   /relay-implement PRPs/plans/<feature>-phase-<N>-<slug>.plan.md
> Example:
>   /relay-implement PRPs/plans/implementation-authoring-phase-3-relay-implement-command.plan.md

If the argument is non-empty but does not resolve to an existing readable file, fall through to P1 below for the canonical file-not-readable HALT message.

Record `plan_path` as the resolved absolute path. Record `target_root` as the current working directory (the repository from which the user invoked the command).

**PRD-less detection (flat filename):** Inspect the plan's basename before attempting the canonical pattern parse.

- If the basename matches `<slug>.plan.md` — that is, it does NOT contain the literal substring `-phase-` followed by one or more digits followed by `-` — then:
  - Set `is_prd_less = true`.
  - Set `slug = basename minus .plan.md`.
  - Set `feature = slug` (used for artifact paths and messages).
  - Set `N = null`.
  - Set `artifact_root = PRPs/reports/<slug>/attempts/` (flat, no `/phase-<N>/` tier).
  - Set `completed_target = PRPs/plans/completed/<basename>.plan.md`.
  - Do NOT HALT. Proceed to Preconditions.

- If the basename matches the canonical `<feature>-phase-<N>-<slug>.plan.md` pattern — that is, it contains `-phase-<digits>-` as a literal segment — then:
  - Set `is_prd_less = false`.
  - Parse `<feature>` = basename minus `-phase-<N>-<slug>.plan.md`.
  - Parse `<N>` = the integer between `-phase-` and the next `-`.
  - Parse `<slug>` = the kebab-cased remainder before `.plan.md`.
  - Set `artifact_root = PRPs/reports/<feature>/phase-<N>/attempts/`.
  - Set `completed_target = PRPs/plans/completed/<basename>.plan.md`.
  - Continue to Preconditions.

- If the basename matches neither pattern (unrecognised shape), HALT with:

> Plan filename does not match the canonical pattern
> `<feature>-phase-<N>-<slug>.plan.md`. The plan was not produced by
> /relay-plan (or was hand-renamed). Either re-run /relay-plan to
> regenerate the plan with the canonical filename, or rename the
> plan file to match the pattern.

These derived values are used to locate the source PRD (`PRPs/prds/<feature>.prd.md` — PRD mode only), the per-attempt artifact root (`<artifact_root><i>/`), and the completed-plan target (`<completed_target>`).

---

## Preconditions

HALT with a clear user-facing message (and do not proceed) if any of these fail. The HALTs are surfaced verbatim and the command exits without writing any code, any per-attempt artifact, or any code-review.jsonl entry.

### P1 — Plan path resolves to a readable file

If `plan_path` does not point at an existing readable file:

> I cannot start implementation without `<plan_path>`.
> The path did not resolve to an existing readable file.
> Usage: /relay-implement PRPs/plans/<feature>-phase-<N>-<slug>.plan.md

### P2 — Plan ends with `*Status: APPROVED*`

`Read` the plan. Inspect its trailing status line (the last non-empty line of the file).

- If it equals `*Status: APPROVED*` → proceed.
- If it equals `*Status: DRAFT*`, `*Status: IMPLEMENTED*`, or any other non-APPROVED status, or has no status line:

  HALT with:

  > The plan at `<plan_path>` is not APPROVED (current status:
  > `<status>`). /relay-implement only operates on APPROVED plans.
  > Run /relay-plan-review to bring the plan to APPROVED first
  > (or, if the plan is already IMPLEMENTED, the implementation
  > has already been performed — manual hand-edit to flip the
  > status back to APPROVED + move from PRPs/plans/completed/
  > is the documented escape hatch for re-implementation).

Trim trailing whitespace and newlines before comparison; the check is "the last non-empty line equals `*Status: APPROVED*`" character-for-character.

### P3 — Source PRD row N status cell is `in-progress`

**PRD-less gate:** If `is_prd_less == true`, skip this entire precondition — no source PRD exists to check. Emit a structured skip note:

> P3 skipped: PRD-less plan detected (no source PRD exists to check).

Proceed to P4.

**PRD mode only (`is_prd_less == false`):** `Read` `PRPs/prds/<feature>.prd.md`. Locate the Implementation Phases table by exact-match header line:

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |

Locate row `<N>` (the row whose first cell, trimmed, equals the integer `<N>`). Verify the `Status` cell is exactly `in-progress` (case-sensitive). If the cell value is anything else (`pending`, `complete`, or other), HALT with the source PRD AC-11 message verbatim:

> Source PRD `PRPs/prds/<feature>.prd.md` row <N> has Status cell
> value `<actual>`, expected `in-progress`. /relay-implement
> requires the plan-writer's Phase 5 back-fill to have run before
> implementation begins. Either:
>   (a) re-run /relay-plan against the source PRD (back-fills row N
>       to in-progress and populates the PRP Plan cell), then re-run
>       /relay-implement; OR
>   (b) hand-edit row <N>'s Status cell to `in-progress` if the
>       back-fill was bypassed for a documented reason.
> No code has been changed and no review has been run.

The check is for `in-progress` specifically. If the cell shows `complete`, the implementation has already been performed — refuse rather than re-execute (D8 mutations would corrupt the per-phase state machine).

### P4 — Decision Gate sources readable

All three files must exist and be readable at `target_root`:

- `docs/decisions.md`
- `docs/anti-patterns.md`
- `docs/context/architecture.md`

If any is missing, HALT with the source PRD AC-14 message verbatim:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-implement
> (or /relay-code-review). No code has been changed and no review
> has been run.

### P5 — Base-commit derivable

Detect the base branch in priority order:

1. If `$ARGUMENTS` contained `--base <branch>`, extract that value.
2. Otherwise, run `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'`.
3. Fallback: `git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}'`.
4. Last resort: `main`.

Record `base_branch`. Then compute `base_commit = git merge-base HEAD <base_branch>`. If `git merge-base` exits non-zero (no common ancestor — typically a detached HEAD or unrelated histories), HALT with:

> Cannot derive base-commit: `git merge-base HEAD <base_branch>`
> exited non-zero. /relay-implement needs a base-commit against
> which to compute per-attempt diffs. Set up a worktree against
> the base branch (`/relay-worktree <feature>` when shipped) or
> run /relay-implement from a branch with a clean ancestry to
> `<base_branch>`. No code has been changed.

Record `base_commit` for use in Phase A diff capture.

---

## Phase A — Internal writer↔reviewer loop

This phase holds the entire loop logic. The implementer and code-reviewer agents run once per attempt via `Task`; they do not loop themselves. The loop lives here.

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

Read `<target_root>/docs/context/methodology.md` frontmatter and extract the `docs_sync` key, recording `docs_sync_enabled` (boolean). Default `true` when the key is absent, mirroring the `tdd` absence-handling precedent and `docs-updater.md`'s own default-true-when-absent handling of the same key (`docs/context/methodology.md:45-65`). Precedence rule, evaluated by Phase A.3.5's gate: `no_docs_flag` (set in `## Parse arguments`) always wins over `docs_sync_enabled` — either one alone is sufficient to skip the docs-sync sub-phase.

Also read the same `docs/context/methodology.md` frontmatter for the `figma_track` key, recording `figma_track_declared = (figma_track == true)` (boolean; default `false` when the key is absent — mirrors the non-heuristic `figma_track` contract, `docs/anti-patterns.md:89-95`). Then `Read` the plan at `<plan_path>` and check its `## Metadata` table's `design_source` row (present only when `figma_track_declared == true` at plan-authoring time, per `plan-writer.md` Step 4.4 item 5); derive `visual_verification_enabled = figma_track_declared AND this plan's design_source == "figma"`. Both derivations reuse existing declarations verbatim — never a new methodology.md key (`docs/decisions.md` [2026-04-19] "Flipping `figma_track` ... by heuristic"). Precedence rule, evaluated by Phase A.3.4's gate: `no_visual_flag` (set in `## Parse arguments`) always wins over `visual_verification_enabled` — either one alone is sufficient to skip the visual-verification sub-phase.

Soft-fail concurrency diagnostic per source PRD D18: `Glob` `<artifact_root>*/diff.patch` for any in-flight attempt (heuristic: a `diff.patch` whose corresponding `<basename>.code-review.jsonl` line shows neither APPROVED nor a final HALT). If found, emit warning `"concurrent /relay-implement detected for <feature> (is_prd_less=<is_prd_less>); orchestrator must serialize"` and **continue** (do not block). Robust file-lock semantics deferred until `/relay-execute` is designed.

### Phase A.1 — Per-attempt pre-flight checks (in order)

Run before each implementer/code-reviewer dispatch. The checks are ordered: time budget first, then retry budget, then oscillation, then dispute cap. First-to-trip wins.

1. **Time budget check.** If `now() >= deadline_ts`:
   - Write `<artifact_root>../halt.json` (i.e. `PRPs/reports/<feature>/phase-<N>/halt.json` in PRD mode; `PRPs/reports/<slug>/halt.json` in PRD-less mode) with `{outcome: "FAILED_TIME_BUDGET_EXCEEDED", attempts_completed: <attempt-1>, deadline_ts, elapsed_minutes, remaining_retries: <max_implement_retries + 1 - attempt>, attempt_history: [...], dispute_history: [...], actionable_recommendation: "..."}`.
   - HALT with verbatim message:
     > FAILED_TIME_BUDGET_EXCEEDED. /relay-implement aborted after
     > <elapsed_minutes> wall-clock minutes (max_implement_minutes=45)
     > with <max_implement_retries + 1 - attempt> retries unused.
     > Per-attempt diffs preserved at <artifact_root>. Halt state at
     > <artifact_root>../halt.json.

2. **Retry budget check.** If `attempt > max_implement_retries + 1` (i.e., we have used all 4 attempts):
   - Write `<artifact_root>../halt.json` with `{outcome: "FAILED_AFTER_N_RETRIES", attempts_completed: max_implement_retries + 1, last_reviewer_verdict, attempt_history, dispute_history, actionable_recommendation}`.
   - HALT with verbatim message:
     > FAILED_AFTER_N_RETRIES. /relay-implement aborted after 4
     > attempts (max_implement_retries=3). Last reviewer verdict:
     > <last_reviewer_verdict>. Per-attempt diffs preserved at
     > <artifact_root>. Halt state at <artifact_root>../halt.json.

3. **Oscillation check** (only when `attempt >= 3`). For each prior attempt `k` in `[1, attempt-1]`:
   - Compute `intersection_k = files_changed_by_attempt[k] ∩ files_changed_by_attempt[attempt-1]`.
   - If `intersection_k` is non-empty AND, for at least one file in `intersection_k`, the diff in attempt `attempt-1` semantically reverses the diff in attempt `k` (heuristic: same file modified to a state byte-equal to the file's content at attempt `k-1` or earlier base):
     - Write `<artifact_root>../halt.json` with `{outcome: "FAILED_OSCILLATION_DETECTED", oscillation_pair: [k, attempt-1], reverting_files: [...], attempt_history, actionable_recommendation}`.
     - HALT with verbatim message:
       > FAILED_OSCILLATION_DETECTED. Attempt <attempt-1> reverts
       > files changed in attempt <k>: <reverting_files>. The loop
       > is stuck oscillating. Per-attempt diffs preserved at
       > <artifact_root>. Halt state at <artifact_root>../halt.json.
       > Manual recovery: inspect the diffs and either resolve the
       > underlying tension by hand or re-run /relay-plan against
       > the source PRD (or description) to clarify the contract.

4. **Dispute cap check** (only at the start of an arbitration step — not before the implementer dispatch). If `disputes_used >= max_disputes_per_session`:
   - Write `<artifact_root>../halt.json` with `{outcome: "FAILED_DISPUTE_CAP_EXCEEDED", disputes_used, max_disputes_per_session, dispute_history, actionable_recommendation}`.
   - HALT with verbatim message:
     > FAILED_DISPUTE_CAP_EXCEEDED. /relay-implement aborted after
     > <disputes_used> TEST_CONTRACT_DISPUTE attempts
     > (max_disputes_per_session=2). The implementer cannot continue
     > to dispute; either the disputed tests are correct (the
     > implementer must produce code addressing them) or the PRD
     > needs revision. Dispute history preserved at
     > <artifact_root>../halt.json.

If all four checks pass, proceed to Phase A.2.

### Phase A.2 — Implementer dispatch + diff capture

Invoke the implementer agent via `Task`:

```
Task(subagent_type="implementer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       attempt: <attempt>,
       prior_feedback: <last_reviewer_feedback when attempt > 1; null otherwise>,
       base_commit: <base_commit>,
     })
```

The implementer reads the plan, executes its Step-by-Step Tasks via `Edit`/`Write` directly in the working tree, runs the plan's Validation Commands Levels 1–3 after all tasks complete (D6 — aggregate validation), and returns one of two verdicts:

- **`IMPLEMENTATION_COMPLETE`** with `{files_changed: [...], validation: {level_1: PASS|FAIL, level_2: PASS|FAIL, level_3: PASS|FAIL}, validation_outputs: [...]}`.
- **`TEST_CONTRACT_DISPUTE`** with `{disputed_tests: [...], prd_refs: [...], claim: "...", proposed_resolution: "..."}`.

After every attempt regardless of verdict:

1. Run `git add -A` (the implementer uses `Edit`/`Write` and may leave files unstaged; the diff against `<base_commit>` would otherwise miss those files).
2. Run `git diff <base_commit>` and write the result to `<artifact_root><attempt>/diff.patch` (creating parent directories as needed).
3. Parse the diff to extract `files_changed_by_attempt[attempt] = set(<paths>)`.
4. Write `<artifact_root><attempt>/record.json` with `{attempt: <attempt>, verdict: "<IMPLEMENTATION_COMPLETE | TEST_CONTRACT_DISPUTE>", files_changed: [...], validation?: {...}, dispute_evidence?: {...}, base_commit: <base_commit>}`.

Branch on the verdict:

- `IMPLEMENTATION_COMPLETE` → proceed to Phase A.3 (code-reviewer dispatch in standard mode).
- `TEST_CONTRACT_DISPUTE` → increment `disputes_used`, re-run pre-flight check 4 (dispute cap) once before proceeding, then proceed to Phase A.3 (code-reviewer dispatch in arbitration mode).

The implementer is single-attempt; the loop, diff.patch capture, and D8 mutations are all this command's responsibility.

### Phase A.3 — Code-reviewer dispatch + verdict branching

#### Standard mode (after IMPLEMENTATION_COMPLETE)

Invoke the code-reviewer agent via `Task`:

```
Task(subagent_type="code-reviewer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       mode: "standard",
       attempt: <attempt>,
       diff_target: "<artifact_root><attempt>/diff.patch",
     })
```

The code-reviewer runs the 8-item rubric (R-S1, R-S2, R-S3, R-L1, R-L2, R-L3, R-SEM, R-X — plus R-COH-* additive when the reviewer-coherence-layer is active) against the diff. It appends one verdict line to `PRPs/plans/<basename>.code-review.jsonl` itself per its protocol (D11 — code-reviewer is the writer of its own audit log; the command does not duplicate that write). All 8 rubric items are recorded in the verdict line; no short-circuit.

Read the just-appended jsonl line. Parse `verdict`:

- **APPROVED** → exit Phase A loop into Phase A.3.5 (docs-sync dispatch), then Phase A.4 (D8 mutations).
- **CHANGES_REQUESTED** → carry the rubric defects (`reason` fields from each `passed: false` item) into `last_reviewer_feedback`. Increment `attempt`. Restart pre-flight checks (Phase A.1).

#### Arbitration mode (after TEST_CONTRACT_DISPUTE)

Invoke the code-reviewer agent via `Task`:

```
Task(subagent_type="code-reviewer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       mode: "arbitration",
       attempt: <attempt>,
       dispute_payload: <implementer's structured TEST_CONTRACT_DISPUTE evidence>,
       diff_target: "<artifact_root><attempt>/diff.patch",
     })
```

The code-reviewer arbitrates the dispute. It appends one verdict line to `code-review.jsonl` with `mode: "arbitration"` and the full `dispute_evidence` block. Parse `verdict`:

- **`DISPUTE_REJECTED`** → next attempt mandates code (the implementer cannot dispute the same tests again). Carry `last_reviewer_feedback = [{rubric_id: "arbitration", reason: "dispute rejected: <reason>; produce code addressing the disputed tests"}]`. Increment `attempt`. Restart pre-flight checks.

- **`DISPUTE_UPHELD_TEST_WRONG`** → the disputed tests are wrong. B7/B8 bounce-back is deferred per source PRD D14 (placeholder protocol reserved). Write `<artifact_root>../halt.json` with `{outcome: "DISPUTE_UPHELD_TEST_WRONG", dispute_payload, arbitration_verdict, attempt_history, dispute_history, actionable_recommendation: "Surface dispute to user; user decides whether to update tests or re-author the PRD. When B7/B8 ship, re-invoke via Task(subagent_type='test-writer', prompt={attempt_history, dispute_evidence})."}`. HALT with verbatim message:
  > DISPUTE_UPHELD_TEST_WRONG. The code-reviewer agreed the
  > disputed tests contradict the PRD. B7/B8 bounce-back is
  > deferred in MVP per source PRD D14 (placeholder protocol
  > reserved). Manual recovery: review the dispute evidence at
  > PRPs/reports/<feature>/phase-<N>/halt.json; either update the
  > tests by hand or surface the dispute to the user for decision.
  > When TDD Writer (B7) ships, the Task dispatch contract will
  > be: Task(subagent_type='test-writer',
  > prompt={attempt_history, dispute_evidence}).

- **`DISPUTE_UPHELD_PRD_AMBIGUOUS`** → the PRD itself is ambiguous; tests and proposed code both have legitimate readings. Write `<artifact_root>../halt.json` with the same shape, `actionable_recommendation: "Hand-edit the PRD to disambiguate; flip its status back to DRAFT; re-run /relay-prd."`. HALT with verbatim message:
  > DISPUTE_UPHELD_PRD_AMBIGUOUS. The code-reviewer agreed the
  > PRD itself is ambiguous on the disputed point. Manual
  > recovery: hand-edit `PRPs/prds/<feature>.prd.md` per the
  > dispute_evidence in halt.json; flip the PRD status back to
  > DRAFT (and remove the *Approved:* line); re-run /relay-prd
  > to re-author against the disambiguation.

In all `DISPUTE_UPHELD_*` cases, the loop terminates structurally; the orchestrator (or developer) decides the recovery path.

### Phase A.3.4 — Visual-verification dispatch

Triggered exactly once when Phase A.3 standard-mode returns APPROVED — never on an arbitration-mode verdict (mirrors Phase A.3.5's own trigger phrasing below, and runs immediately BEFORE it).

1. **Gate.** If `no_visual_flag == true` OR `visual_verification_enabled == false`, skip the entire visual-verification sub-phase (log a one-line skip note naming which of the two gated it) and proceed directly to Phase A.3.5. Record `visual_outcome = "SKIPPED (--no-visual)"` when `no_visual_flag == true` (checked first — `--no-visual` takes precedence over `visual_verification_enabled` when both are true), otherwise `visual_outcome = "SKIPPED (not figma-sourced)"`.
2. **Budget init.** Otherwise, initialise `visual_review_attempts = 0`, `max_visual_retries = 2` — its own budget, independent of `max_implement_retries`/`disputes_used`/`max_docs_review_retries`.
3. **Step A — dispatch `visual-verifier` via `Task`:**

   ```
   Task(subagent_type="visual-verifier",
        prompt={
          plan_path: <plan_path>,
          target_root: <target_root>,
          design_spec_path: <from the plan's ## Design Source section>,
          attempt: <attempt>,
          diff_target: "<artifact_root><attempt>/diff.patch",
          non_interactive: true,
        })
   ```

4. **Step B — branch on the returned verdict:**
   - **`VISUAL_VERIFIED`** → `visual_outcome = "APPROVED"`; proceed to Phase A.3.5.
   - **`VISUAL_DEGRADED`** → record the named rung (e.g. `DEGRADED_STATIC_ONLY`); log a warning; proceed to Phase A.3.5 WITHOUT halting (this is the AC-5 non-blocking guarantee).
   - **`VISUAL_MISMATCH`** → increment `visual_review_attempts`.
     - If `visual_review_attempts <= max_visual_retries`: dispatch one post-visual fix round — re-invoke `implementer` via `Task` with the `fidelity-report.json`'s failing frames as `prior_feedback`, then `code-reviewer` via `Task` in standard mode to re-approve the code change, then re-dispatch `visual-verifier` via `Task`.
       - If that round's `code-reviewer` step itself returns `CHANGES_REQUESTED`, OR the re-dispatched `visual-verifier` still returns `VISUAL_MISMATCH`: perform a **deterministic revert** — `git checkout <last code-reviewer-APPROVED commit/diff> -- <files touched by the fix attempt>` (using the same `files_changed_by_attempt` bookkeeping Phase A.2 already maintains, mirroring the oscillation-detection precedent at `plugins/relay/commands/relay-implement.md:239-250`) so the worktree returns to exactly the last APPROVED state; set `visual_outcome = "BUDGET_EXCEEDED_REVERTED"`; proceed to Phase A.3.5 WITHOUT halting.
       - Otherwise (the fix round's `code-reviewer` returns `APPROVED` and the re-dispatched `visual-verifier` returns `VISUAL_VERIFIED` or `VISUAL_DEGRADED`): set `visual_outcome` from that re-dispatch's own verdict (`"APPROVED"` or the named degraded rung); proceed to Phase A.3.5.
     - If `visual_review_attempts > max_visual_retries` without ever dispatching a fix round: set `visual_outcome = "BUDGET_EXCEEDED"`; proceed to Phase A.3.5 WITHOUT halting.
5. **No commit issued.** This sub-phase performs no commit action of any kind — any edits from the post-visual fix round land uncommitted in the worktree (or are reverted per Step B above), per the Pillar 2 "never commit" invariant (`docs/decisions.md` 2026-05-18).

### Phase A.3.5 — Docs-sync dispatch

Triggered exactly once when Phase A.3 standard-mode returns APPROVED — never on an arbitration-mode verdict (mirrors Phase A.4's own trigger phrasing below).

1. **Gate.** If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip the entire docs-sync sub-phase (log a one-line skip note naming which of the two gated it) and proceed directly to Phase A.4. Record `docs_sync_outcome = "SKIPPED (--no-docs)"` when `no_docs_flag == true` (checked first — `--no-docs` takes precedence over `docs_sync_enabled` when both are true), otherwise `docs_sync_outcome = "SKIPPED (docs_sync: false)"`.
2. **Initialise the docs-sync budget.** Otherwise, initialise `docs_review_attempts = 0`, `max_docs_review_retries = 2`, `docs_prior_feedback = null` — its own budget, independent of `max_implement_retries`/`disputes_used`, mirroring `/relay-approve`'s Phase 3 DOCS CYCLE loop shape (`plugins/relay/commands/relay-approve.md:275-343`).
3. **Step A — dispatch `docs-updater` (writer) via `Task`:**

   ```
   Task(subagent_type="docs-updater",
        prompt={
          target_root: <target_root>,
          feature: <feature>,
          prd_path: "PRPs/prds/<feature>.prd.md",   # PRD mode only (is_prd_less == false); key omitted entirely in PRD-less mode
          diff_source: "patch",
          patch_path: "<artifact_root><attempt>/diff.patch",
          non_interactive: true,
        })
   ```

4. **Step B — dispatch `docs-reviewer` (reviewer) via `Task`:**

   ```
   Task(subagent_type="docs-reviewer",
        prompt={
          target_root: <target_root>,
          feature: <feature>,
          prd_path: "PRPs/prds/<feature>.prd.md",   # PRD mode only (is_prd_less == false); key omitted entirely in PRD-less mode
          non_interactive: true,
        })
   ```

   `pr` is intentionally omitted — there is no PR yet at implement time.
   `feature` (and, in PRD mode, `prd_path`) are passed EXPLICITLY instead
   of relying on `docs-reviewer`'s `orchestrator-run.json` fallback
   (Task 4's revision of `docs-reviewer.md`), because that file does not
   exist at implement time for standalone `/relay-implement`. `<feature>`
   is the same value this command already derives in `## Parse arguments`
   (lines 69-97: `feature = slug` in PRD-less mode; the parsed `<feature>`
   prefix in PRD mode).

5. **Step C — evaluate the docs-reviewer verdict.** Read the just-appended `PRPs/reports/<feature>/docs-review.jsonl` line:
   - **`APPROVED`** → record `docs_sync_outcome = "APPROVED"`; proceed to Phase A.4.
   - **`CHANGES_REQUESTED`** → increment `docs_review_attempts`; set `docs_prior_feedback` from the failing `D-R<i>` reasons. If `docs_review_attempts > max_docs_review_retries`, record `docs_sync_outcome = "BUDGET_EXCEEDED"` (log a warning naming the last failing `D-R<i>` items) and proceed to Phase A.4 WITHOUT halting the command — this is the docs-sync graceful-degradation path (Decision Gate result): the docs-sync sub-phase never blocks code delivery, and `/relay-approve`'s docs cycle remains the safety net for exactly this case. Otherwise, loop back to Step A (`docs_prior_feedback` is retained only for the `BUDGET_EXCEEDED` warning-log line — Step A's dispatch payload no longer accepts it per edit (i) above).
6. **Deferred questions.** Record deferred questions from BOTH docs-pair
   artifacts into a running list `docs_deferred_questions` (each entry
   tagged with its source): (i) after Step A completes, read
   `PRPs/reports/<feature>/docs-update.md`'s `## Deferred Questions`
   section — append each entry found, tagged `writer`; (ii) after Step B
   completes, read the just-appended `docs-review.jsonl` line's
   `deferred_question` field (string or `null`) — if non-null, append it,
   tagged `reviewer`. The Final output surface's `Docs:` line (Task 6)
   points at both source artifacts explicitly, so source and pointer
   always agree.
7. **No commit issued.** This sub-phase performs no commit action of any kind — edits from `docs-updater` land uncommitted in the worktree, per the Pillar 2 "never commit" invariant (`docs/decisions.md` 2026-05-18). `/relay-commit` bundles docs with code later.

### Phase A.4 — D8 post-approval mutations (best-effort atomic with rollback note)

Triggered exactly once when Phase A.3 standard-mode returns APPROVED. Performed in this order; each step records its success/failure for the rollback note:

#### Mutation a — Plan trailing-block flip

`Edit` `<plan_path>`:
- `old_string`: `*Status: APPROVED*`
- `new_string`: `*Implemented: <YYYY-MM-DD>*\n*Status: IMPLEMENTED*` (where `<YYYY-MM-DD>` is today's date in UTC)
- `replace_all`: `false`

Record `mutation_a_success: true|false`. On `false`, capture the error message.

#### Mutation b — Plan move to PRPs/plans/completed/

`Bash`: `mv <plan_path> PRPs/plans/completed/<basename>.plan.md`

The destination directory `PRPs/plans/completed/` is expected to exist (already populated with prior completed plans across `plan-authoring`, `implementation-authoring`, and `reviewer-coherence-layer` features). If it does not exist, create it first via `mkdir -p PRPs/plans/completed/` then perform the move.

Record `mutation_b_success: true|false`. On `false`, capture the error message and the mid-state plan path.

#### Mutation c — Source PRD row N status flip

**PRD-less gate:** If `is_prd_less == true`, skip Mutation c entirely — no source PRD row exists to flip. Record `mutation_c_skipped: true`. This is NOT a failure; do not raise `PARTIAL_D8_FAILURE` for this skip. Proceed directly to the atomicity discipline section.

**PRD mode only (`is_prd_less == false`):** `Edit` `PRPs/prds/<feature>.prd.md`:
- `old_string`: the verbatim full row N line copied from the source PRD (including all leading and trailing pipes and whitespace; the full line guarantees a unique match).
- `new_string`: the same row line with `Status` cell `in-progress` → `complete`. The `PRP Plan` cell is left unchanged (plan-writer already populated it with the relative path; that path now resolves under `PRPs/plans/completed/` after Mutation b, but the cell is not updated to reflect the move — the row's PRP Plan cell carries the *original* plan name as a stable reference).
- `replace_all`: `false`

Record `mutation_c_success: true|false`. On `false`, capture the error message.

#### Atomicity discipline

**PRD mode (`is_prd_less == false`):** All three mutations a, b, c are attempted. If all succeed → success path; emit the final summary (Final output surface below) and exit.

**PRD-less mode (`is_prd_less == true`):** Only mutations a and b are attempted; Mutation c is always `mutation_c_skipped: true`. If both succeed → success path. The `mutations_attempted` list for PRD-less plans is `["a", "b"]` — Mutation c is not listed as attempted because it was never attempted (it is intentionally absent for PRD-less plans, not a failure).

If any attempted mutation fails: write `<artifact_root>../halt.json` with:

```json
{
  "outcome": "PARTIAL_D8_FAILURE",
  "mutations_attempted": ["a", "b", "c"],
  "mutation_c_skipped": false,
  "mutations_succeeded": ["a", "b" or just "a" or empty],
  "mutation_failed": "a" | "b" | "c",
  "error": "<the failing mutation's error message>",
  "manual_recovery_steps": [
    "<step 1 — e.g., re-run Edit on plan trailing block>",
    "<step 2 — e.g., move plan to completed/ by hand>",
    "<step 3 — e.g., flip source PRD row N Status cell to complete by hand>"
  ],
  "attempt_history": [...],
  "dispute_history": [...]
}
```

For PRD-less plans, the schema is:

```json
{
  "outcome": "PARTIAL_D8_FAILURE",
  "mutations_attempted": ["a", "b"],
  "mutation_c_skipped": true,
  "mutations_succeeded": ["a" or empty],
  "mutation_failed": "a" | "b",
  "error": "<the failing mutation's error message>",
  "manual_recovery_steps": [
    "<step 1 — e.g., re-run Edit on plan trailing block>",
    "<step 2 — e.g., move plan to completed/ by hand>"
  ],
  "attempt_history": [...],
  "dispute_history": [...]
}
```

Note: `mutation_c_skipped: true` is an advisory field, not a failure flag. Its presence in the halt.json schema for PRD-less plans does NOT constitute a `PARTIAL_D8_FAILURE` condition — only a genuinely failed Mutation a or b raises that outcome.

Per source PRD D8: best-effort atomic. The command does **not** roll back successful mutations; recovery is documented, not automatic. Emit a structured rollback note message naming the next manual step:

> PARTIAL_D8_FAILURE. Mutation <which> failed: <error>. Mutations
> succeeded: <list>. Manual recovery steps recorded at
> <artifact_root>../halt.json. The implementation
> diff is preserved in the working tree (or in
> PRPs/plans/completed/ if Mutation b succeeded). The Test Runner
> can still be run against the worktree; the per-phase state
> machine in the source PRD will be inconsistent until the
> manual recovery steps are taken (PRD-less plans: no PRD row
> exists; only Mutations a and b require manual recovery).

---

## Final output surface

On the success path (Phase A.3 standard-mode APPROVED + all applicable D8 mutations succeeded), emit per source PRD AC-1:

**PRD mode (`is_prd_less == false`):**

> ✅ Plan **IMPLEMENTED** at `PRPs/plans/completed/<basename>.plan.md`.
> Source PRD `PRPs/prds/<feature>.prd.md` row <N> marked `complete`.
> Implementation diff (final attempt) at
> `<artifact_root><attempt>/diff.patch`.
> Code-review verdict at
> `PRPs/plans/<basename>.code-review.jsonl` (line <line_index>).
> Docs: `<docs_sync_outcome>` (`APPROVED` / `BUDGET_EXCEEDED` / `SKIPPED (--no-docs)` / `SKIPPED (docs_sync: false)`). When `docs_deferred_questions` is non-empty, see `PRPs/reports/<feature>/docs-update.md`'s `## Deferred Questions` section (writer-side questions) and/or `PRPs/reports/<feature>/docs-review.jsonl`'s `deferred_question` field (reviewer-side questions) — the two artifacts Task 5 Step 6 sources the list from.
> Visual: `<visual_outcome>` (`APPROVED` / named degraded rung, e.g. `DEGRADED_STATIC_ONLY` / `BUDGET_EXCEEDED` / `BUDGET_EXCEEDED_REVERTED` / `SKIPPED (not figma-sourced)` / `SKIPPED (--no-visual)`) — **this line's very presence is gated on `figma_track_declared`** (Phase A.0): shown ONLY when `figma_track_declared == true`; when `figma_track_declared == false` the line is OMITTED ENTIRELY (no line, no `SKIPPED` marker, nothing), so a non-Figma project's output stays byte-identical to today's (PRD AC-1 of `figma-implementation-track.prd.md`).
> Worktree ready for `/relay:relay-test PRPs/plans/completed/<basename>.plan.md`.

**PRD-less mode (`is_prd_less == true`):**

> ✅ Plan **IMPLEMENTED** at `PRPs/plans/completed/<basename>.plan.md`.
> PRD-less mode: Mutation c skipped (no source PRD row to flip).
> Implementation diff (final attempt) at
> `<artifact_root><attempt>/diff.patch`.
> Code-review verdict at
> `PRPs/plans/<basename>.code-review.jsonl` (line <line_index>).
> Docs: `<docs_sync_outcome>` (`APPROVED` / `BUDGET_EXCEEDED` / `SKIPPED (--no-docs)` / `SKIPPED (docs_sync: false)`). When `docs_deferred_questions` is non-empty, see `PRPs/reports/<feature>/docs-update.md`'s `## Deferred Questions` section (writer-side questions) and/or `PRPs/reports/<feature>/docs-review.jsonl`'s `deferred_question` field (reviewer-side questions) — the two artifacts Task 5 Step 6 sources the list from.
> Visual: `<visual_outcome>` (`APPROVED` / named degraded rung, e.g. `DEGRADED_STATIC_ONLY` / `BUDGET_EXCEEDED` / `BUDGET_EXCEEDED_REVERTED` / `SKIPPED (not figma-sourced)` / `SKIPPED (--no-visual)`) — **this line's very presence is gated on `figma_track_declared`** (Phase A.0): shown ONLY when `figma_track_declared == true`; when `figma_track_declared == false` the line is OMITTED ENTIRELY (no line, no `SKIPPED` marker, nothing), so a non-Figma project's output stays byte-identical to today's (PRD AC-1 of `figma-implementation-track.prd.md`).
> Worktree ready for `/relay:relay-test PRPs/plans/completed/<basename>.plan.md`.

On HALT (one of `FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`, `FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`, `PARTIAL_D8_FAILURE`, or any precondition HALT), the user-facing message is the verbatim halt message defined in the relevant Phase A.* sub-section above, and the command exits without performing further mutations.

In all cases, the per-attempt artifacts at `PRPs/reports/<feature>/phase-<N>/attempts/<i>/` are preserved on disk for post-mortem audit.

---

## Constraints (hard rules)

1. **Never write anything under `.claude/`.** Per-attempt artifacts go to `PRPs/reports/<feature>/phase-<N>/attempts/<i>/` (`diff.patch`, `record.json`); halt state goes to `PRPs/reports/<feature>/phase-<N>/halt.json`; the plan moves to `PRPs/plans/completed/`; the source PRD is back-filled in place at `PRPs/prds/<feature>.prd.md`. Nothing else goes on disk from this command. The implementer and code-reviewer agents enforce the same rule at the agent level via their own Hard constraints; this command is the first guard.

2. **Never bundle writer + reviewer.** The internal Phase A loop is NOT bundling — it has the same shape as `/relay-test`'s per-attempt loop (each agent runs once per attempt; the command holds the loop). The reviewer surface for hand-invoked review is `/relay-code-review` (Phase 4 of source PRD), a separate command. The writer/reviewer split decision (2026-04-19) still applies.

3. **Never adopt the reviewer role beyond `Task` dispatch.** The command does not run the rubric inline. The `code-reviewer` agent is the sole authority on rubric pass/fail; this command parses the agent's jsonl verdict line and branches.

4. **Never prompt the user.** Past the interactivity boundary (`docs/context/architecture.md` §Interactivity boundary). HALTs are surfaced verbatim and the command exits.

5. **Never overwrite an APPROVED plan.** P2 catches this at command entry. Phase A.4 Mutation a only operates on `*Status: APPROVED*` (not `*Status: IMPLEMENTED*` or any other state); subsequent re-invocations against an IMPLEMENTED plan fail at P2.

6. **Never bypass D8.** In PRD mode (`is_prd_less == false`): all three mutations (a, b, c) are attempted on APPROVED rubric. In PRD-less mode (`is_prd_less == true`): mutations a and b are attempted; Mutation c is a documented no-op (`mutation_c_skipped: true` — not a failure) because no source PRD row exists to flip. On partial failure of an attempted mutation, the command writes `halt.json` and emits a structured rollback note; it does **not** silently skip a mutation or claim success.

7. **Never skip the Decision Gate evidence block.** The command-level gate (above) is mandatory. The implementer and code-reviewer agents emit their own gates inside their dispatch payloads.

8. **Never re-run the writer↔reviewer pair across `/relay-implement` invocations.** That is `/relay-execute`'s call. A single `/relay-implement` invocation produces zero or one APPROVED implementation; the loop is internal to one invocation. CHANGES_REQUESTED at the end of the budget terminates with `FAILED_AFTER_N_RETRIES`; the orchestrator (or developer) decides whether to re-run.

9. **Never modify test files without an upheld dispute.** This is the universal R-X rule (D9 Layer 0). The code-reviewer enforces R-X; this command does not bypass. If the implementer modifies tests without a `TEST_CONTRACT_DISPUTE` verdict, R-X fails and the loop continues to the next attempt with the R-X reason in `last_reviewer_feedback`.

10. **Never invoke `/relay-code-review` from this command.** The standalone reviewer surface is for hand-invoked review of an existing implementation, not for the internal loop. The internal dispatch goes directly to the `code-reviewer` agent via `Task`.

11. **Never block D8 mutations on docs-sync budget exhaustion.** The docs-sync sub-phase (Phase A.3.5) carries its own retry budget (`max_docs_review_retries=2`), independent of `max_implement_retries`. When that budget is exhausted (`docs_review_attempts > max_docs_review_retries` after a `CHANGES_REQUESTED` docs-reviewer verdict), the command degrades gracefully: it logs `docs_sync_outcome = "BUDGET_EXCEEDED"` and proceeds to Phase A.4 rather than halting the whole invocation. `/relay-approve`'s docs cycle remains the safety net for exactly this case.

---

## What you do NOT do

- **Reviewing the plan** — the `code-reviewer` agent is dispatched via `Task` for that purpose. The standalone `/relay-code-review` command (Phase 4 of source PRD) is the hand-invoked surface.
- **Implementing additional phases beyond row N** — one plan per invocation per source PRD D5. Multi-phase orchestration is `/relay-execute`'s job.
- **Bundling writer + reviewer into a single agent** — bound by the 2026-04-19 command-surface decision; the implementer and code-reviewer are separate agents with separate roles.
- **Reopening an IMPLEMENTED plan via tooling** — out of scope. Manual hand-edit (flip `*Status: IMPLEMENTED*` back to `*Status: APPROVED*` + move from `PRPs/plans/completed/` back to `PRPs/plans/`) is the documented escape hatch.
- **Targeting a specific phase via `--phase <N>` flag** — Could-item per source PRD MoSCoW; deferred. The command parses `<N>` deterministically from the plan filename.
- **Cross-PRD planning** — the command operates on exactly one plan per invocation. Multi-PRD coordination is `/relay-execute`'s job.
- **`--dry-run` flag** — Could-item per source PRD MoSCoW; deferred. To inspect what `/relay-implement` would do without performing mutations, the developer can manually run the implementer agent via `Task` and inspect its return verdict before invoking `/relay-implement` for real.
- **`--from-attempt <N>` resume flag** — Could-item per source PRD MoSCoW; deferred. To resume after a HALT, the developer must re-run `/relay-implement`; the command does not currently support partial-state recovery beyond the per-attempt diffs preserved on disk.
- **Re-grounding via research subagents** — the implementer has no `Task` tool per source PRD D11; the plan is the source of truth. The plan-writer's grounding (recorded in the plan's "Patterns to Mirror" and "Mandatory Reading" sections) is the only research input the implementer consumes.
- **Persisting research blobs** — Could-item; not MVP per source PRD's "What We're NOT Building".
- **Blocking code approval on a docs-sync failure** — the docs-sync sub-phase (Phase A.3.5) degrades gracefully on budget exhaustion; D8 mutations proceed regardless.
