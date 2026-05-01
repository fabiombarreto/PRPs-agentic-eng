# Feature: `/relay-implement` command (Phase 3 of implementation-authoring)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a command consumed by the future `/relay-execute` orchestrator); creation of a new command file; impacts the already-shipped implementer + code-reviewer agents (Phase 1 and Phase 2 of source PRD); third writer/reviewer pair's command surface
- Decisions found:
  - [2026-04-19] Command surface — writer/reviewer split: `/relay-implement` is writer-only with internal loop; `/relay-code-review` (Phase 4) is the standalone reviewer.
  - [2026-04-19] PRP artifacts under `PRPs/`, never `.claude/` — diff.patch under `PRPs/reports/<feature>/phase-<N>/attempts/<i>/`; code-review.jsonl under `PRPs/plans/<basename>.code-review.jsonl`; completed plans under `PRPs/plans/completed/`.
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — `/relay-implement` runs with no user dialogue; reviewer auto-flips on rubric pass via the internal loop.
  - [2026-04-19] `max_test_retries = 3` semantic precedent — `max_implement_retries = 3` (4 attempts total).
  - [2026-04-19] `max_test_minutes = 30` semantic precedent — `max_implement_minutes = 45` mirrors the wall-clock budget pattern with a wider envelope; first-to-expire wins; FAILED_TIME_BUDGET_EXCEEDED distinct from FAILED_AFTER_N_RETRIES.
  - [2026-04-19] Keep upstream `prp-core` as reference, not active relay code — `plugins/prp-core/commands/prp-implement.md` is the section-shape reference; never imported.
  - [2026-04-25] Plan filenames carry source PRD phase number and slug — Phase 5 of `/relay-implement` mutates row N's `Status` cell `in-progress` → `complete`.
  - Source PRD `PRPs/prds/implementation-authoring.prd.md` — D1 (writer/reviewer split), D2 (diff capture model), D3 (worktree degradation), D6 (per-task execution + aggregate validation), D7 (budgets), D8 (post-approval mutations), D9 (TDD opt-in / dispute escape valve), D11 (tool allowlists), D14–D18 (Open Question resolutions).
- Applicable anti-patterns:
  - Weakening or deleting tests to make the loop turn green — D9 Layer 0 R-X universal rule, enforced by code-reviewer; this command must NOT bypass.
  - Writing pipeline artifacts under `.claude/` — `docs/anti-patterns.md` lines 60–66.
  - Treating `plugins/prp-core/` as active relay code — `prp-implement.md` is studied, never imported.
  - Relying on interactive permission prompts in the autonomous loop — past the interactivity boundary.
- Applicable architectural rules:
  - Three-pillar architecture, Pillar 2 — third writer/reviewer pair's command surface.
  - Interactivity boundary — autonomous from PRD-APPROVED onward.
  - PRPs/ artifact path convention.
  - Writer/reviewer split — `/relay-implement` is writer-only; the reviewer surface is `/relay-code-review` (Phase 4).
  - Graceful degradation — D3 worktree degradation; D18 concurrency soft-fail diagnostic.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/implementation-authoring.prd.md` — Implementation Phases row 3: "`/relay-implement` command" — Goal: Public command surface for the writer; orchestrates the internal writer↔reviewer loop with budgets, diff capture, oscillation detection, and D8 mutations. Success signal: `/relay-implement PRPs/plans/<basename>.plan.md` against an APPROVED plan produces the AC-1 mutations or HALTs with a clear preconditions message; the appropriate `diff.patch` / `code-review.jsonl` artifacts land on disk regardless of outcome.

## Summary

Build `plugins/relay/commands/relay-implement.md` — a single markdown file with YAML frontmatter that orchestrates the internal writer↔reviewer loop between the already-shipped `implementer` agent (Phase 1, color: green) and `code-reviewer` agent (Phase 2, color: magenta). The command holds loop logic at the coarsest level only (per the slash-command-as-orchestrator principle): per-attempt budget checks, oscillation detection, dispatch of one agent per attempt via `Task`, parsing of the verdict, capture of `git diff <base-commit>` to `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch`, and on APPROVED rubric the three D8 post-approval mutations (plan trailing-block flip to `*Status: IMPLEMENTED*`, plan move to `PRPs/plans/completed/<basename>.plan.md`, source PRD row N flip from `in-progress` to `complete`). The structural precedent is `plugins/relay/commands/relay-test.md` for the loop shape and `plugins/relay/commands/relay-plan.md` for the writer-only command shape. Dual budget caps (`max_implement_retries = 3`, `max_implement_minutes = 45`, `max_disputes_per_session = 2`) are first-to-expire-wins with distinct outcome codes (FAILED_AFTER_N_RETRIES / FAILED_TIME_BUDGET_EXCEEDED / FAILED_OSCILLATION_DETECTED / FAILED_DISPUTE_CAP_EXCEEDED). No user dialogue at any point; the command is past the interactivity boundary.

## User Story

As the future `/relay-execute` orchestrator (and the relay developer manually invoking the command during Pillar 2 dogfood), I want a single command that drives an APPROVED plan through autonomous code-writing and review with bounded retries, per-attempt audit artifacts, and atomic post-approval state mutations, so that the working tree is left in a state the Test Runner can consume on first invocation without me re-deriving context, and so that the per-phase state machine in the source PRD is closed deterministically.

## Problem Statement

Source PRD's Phase 1 (`implementer` agent) and Phase 2 (`code-reviewer` agent) are complete; the agents exist but have no orchestrator. Without `/relay-implement`, an APPROVED plan cannot be transformed into committed code in the worktree autonomously — the developer must invoke the agents by hand, capture diffs by hand, perform the three D8 mutations by hand, and recover by hand on partial failures. This blocks `/relay-execute` from running end-to-end and forces the developer back into the autonomous portion of the pipeline that the interactivity boundary explicitly excludes.

## Solution Statement

Create `plugins/relay/commands/relay-implement.md` mirroring the canonical relay command shape (frontmatter + command-level Decision Gate + Parse arguments + Preconditions + `Phase A — Internal writer↔reviewer loop` + Final output surface + Constraints + What you do NOT do). Phase A holds the loop logic exactly once: an attempt counter, a wall-clock deadline timer, a `disputes_used` counter, a `files_changed_by_attempt` map, and an ordered sequence of pre-attempt checks (time budget → retry budget → oscillation → dispute cap). Each attempt dispatches the `implementer` agent via `Task` once, captures the cumulative diff to disk, dispatches the `code-reviewer` agent in `standard` or `arbitration` mode based on the implementer's verdict, parses the reviewer verdict, and either exits the loop (APPROVED), bumps the attempt with carried feedback (CHANGES_REQUESTED), or HALTs structurally (DISPUTE_UPHELD_*). On loop exit with APPROVED, the command performs the three D8 mutations in order with best-effort atomicity: each step is attempted; on the first failure the partial state is captured to `PRPs/reports/<feature>/phase-<N>/halt.json` with a structured rollback note. The structural precedent for the loop is `plugins/relay/commands/relay-test.md`; the precedent for the D8 row-update Edit is `plugins/relay/agents/plan-writer.md` Step 5.1.

## Metadata

| Field | Value |
|-------|-------|
| Type | Command file (markdown + YAML frontmatter) |
| Complexity | Medium-High — largest of the three implementation-authoring command/agent files due to internal loop logic + budgets + oscillation detection + D8 mutations |
| Systems Affected | Future `/relay-execute` orchestrator (consumer); `implementer` agent (dispatched via Task); `code-reviewer` agent (dispatched via Task); Test Runner (downstream consumer of worktree state); source PRD's Implementation Phases table (mutated by D8) |
| Dependencies | Phase 1 implementer agent (complete); Phase 2 code-reviewer agent (complete) |
| Estimated Tasks | 8 atomic tasks |
| Source PRD line ref | `PRPs/prds/implementation-authoring.prd.md` Implementation Phases row 3 (around line 260) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| HIGH | `plugins/relay/commands/relay-test.md` | 1–250 | Closest precedent for the internal-loop pattern with budget checks, oscillation detection, per-attempt artifact writes, and outcome code distinction |
| HIGH | `plugins/relay/commands/relay-plan.md` | 1–278 | Sibling writer-only command shape — the command-level Decision Gate emission, Preconditions section structure (P1/P2/P3/P4 with verbatim HALT messages), and "Phase A — Adopt the Writer role" / "What you do NOT do" sections |
| HIGH | `plugins/relay/commands/relay-prd.md` | 1–235 | Canonical command frontmatter (description + argument-hint) and "Your mission" / "Constraints (hard rules)" sections |
| HIGH | `plugins/relay/agents/implementer.md` | 44–66 | Implementer agent input contract (`plan_path`, `target_root`, `attempt`, `prior_feedback?`, `base_commit`) and output verdict shapes (`IMPLEMENTATION_COMPLETE` with `{files_changed, validation, validation_outputs}`; `TEST_CONTRACT_DISPUTE` with `{disputed_tests, prd_refs, claim, proposed_resolution}`) |
| HIGH | `plugins/relay/agents/implementer.md` | 518–530 | Decision Gate fenced block canonical six-line shape |
| HIGH | `plugins/relay/agents/implementer.md` | 626–636 | D8 boundary contract — explicit enumeration of all three post-approval mutations as COMMAND-owned (not agent-owned) |
| HIGH | `plugins/relay/agents/code-reviewer.md` | 49–75 | Code-reviewer input contract (`plan_path`, `target_root`, `mode: standard | arbitration`, `attempt`, `dispute_payload?`, `diff_target`) and rubric IDs (R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X plus R-COH-* additive) |
| HIGH | `plugins/relay/agents/plan-writer.md` | 467–492 | Edit-with-verbatim-full-row-`old_string` mutation pattern (the D8 row-update for Status `in-progress` → `complete` mirrors this discipline) |
| HIGH | `PRPs/prds/implementation-authoring.prd.md` | (whole) | Source PRD with all 14 AC items + D1–D18 decisions, especially D7 (budgets), D8 (mutations), D9 (TDD opt-in / dispute escape valve), D14–D18 (resolved Open Questions) |
| MEDIUM | `docs/decisions.md` | 44–59, 106–133 | `max_test_retries = 3` and `max_test_minutes = 30` semantic precedents (first-to-expire-wins; outcome code distinction; 0 forbidden) |
| MEDIUM | `docs/anti-patterns.md` | 60–66 | "Writing pipeline artifacts under `.claude/`" — the universal anti-pattern enforced by source PRD AC-9 |
| MEDIUM | `docs/context/architecture.md` | 57–96 | Interactivity boundary (this command runs autonomously) + PRP artifact paths convention |
| LOW | `plugins/prp-core/commands/prp-implement.md` | 389–410 | Reference-only — Phase 5.3 (Update Source PRD) + Phase 5.4 (Archive Plan); the `.claude/PRPs/plans/completed/` path in the upstream MUST be replaced with `PRPs/plans/completed/` in relay (D13) |

## Patterns to Mirror

### Loop opener with dual budget checks

# SOURCE: plugins/relay/commands/relay-test.md:84-87
```
if `now >= deadline_ts`: exit with `FAILED_TIME_BUDGET_EXCEEDED`.
if `attempt > max_retries + 1`: exit with `FAILED_AFTER_N_RETRIES`.
```

Used by Task 4 (Phase A loop opener + budget checks): the same two checks fire at the top of each iteration, before agent dispatch, with the relay-implement-specific outcome codes substituted (`FAILED_AFTER_N_RETRIES` / `FAILED_TIME_BUDGET_EXCEEDED`).

### Oscillation detection (file-intersection + semantic-reversal heuristic)

# SOURCE: plugins/relay/commands/relay-test.md:153-166
```
For each prior attempt k, intersect `files_changed_by_attempt[k]` with the new
implementer's proposed file set; if the intersection is non-empty AND the diff
semantically reverses lines from attempt k, it is confirmed oscillation.
MVP pragmatic heuristic: same file touched in 3+ attempts and diff for attempt
N reverses lines from attempt N-1 counts as oscillation.
If oscillation confirmed: exit with `FAILED_OSCILLATION`, attaching the pair
`(k, N)` and the reverting file set.
```

Used by Task 4 (oscillation check sub-step): the same algorithm with relay-implement substitutes `FAILED_OSCILLATION` → `FAILED_OSCILLATION_DETECTED` and the file-set is computed from the per-attempt `diff.patch` rather than from in-memory record state.

### Per-attempt artifact write

# SOURCE: plugins/relay/commands/relay-test.md:109-129
```
PRPs/reports/<feature>/attempts/<N>/record.json
PRPs/reports/<feature>/attempts/<N>/stdout.log
```

Used by Task 5 (implementer dispatch + diff capture): the relay-implement layout adds a `phase-<N>/` segment between `<feature>/` and `attempts/` (`PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch`) because the implementer runs per-PRD-phase, not per-feature; multiple plans may exist for one feature.

### run.json attempt history shape

# SOURCE: plugins/relay/commands/relay-test.md:181-189
```
"attempts": [
  {"n": 1, "verdict": "RETRY_NEEDED", "record": "attempts/1/record.json", "implementer_diff": null}
]
```

Used by Task 7 (D8 mutations) for the analogous `run.json` (or `halt.json` on failure) summary the command writes at the end. relay-implement's per-attempt record carries `{n, verdict (IMPLEMENTATION_COMPLETE | TEST_CONTRACT_DISPUTE | DISPUTE_REJECTED | DISPUTE_UPHELD_TEST_WRONG | DISPUTE_UPHELD_PRD_AMBIGUOUS | CHANGES_REQUESTED | APPROVED), diff_patch (path), code_reviewer_jsonl_line_index}`.

### Edit-with-full-row-`old_string` for PRD row mutation

# SOURCE: plugins/relay/agents/plan-writer.md:467-492
```
Use `Edit` with:
- `file_path`: `<prd_path>`
- `old_string`: the row N line copied verbatim from the PRD,
  including all leading and trailing pipes and whitespace.
- `new_string`: same row, with `Status` cell `pending` → `in-progress`
  and `PRP Plan` cell → relative plan path.
- `replace_all`: false.
```

Used by Task 7 (D8 mutation c — PRD row update): the relay-implement variant flips `Status` cell `in-progress` → `complete` (instead of `pending` → `in-progress`); the `PRP Plan` cell is left unchanged because plan-writer already populated it with the path that just got moved to `completed/`. The full-row verbatim match guarantees a unique Edit target.

### Decision Gate fenced block (canonical six-line shape)

# SOURCE: plugins/relay/agents/implementer.md:518-530
```
**Decision Gate**
- Active context: {path or "none"}
- Activated criteria: {semicolon-separated list}
- Decisions found:
  - {decision 1}
- Applicable anti-patterns:
  - {anti-pattern 1}
- Applicable architectural rules:
  - {rule 1}
- Result: {PROCEED | HALT (reason)}
```

Used by Task 2 (Decision Gate evidence block): the command-level gate emitted before any action, per `docs/decision-gate.md`.

### Command file frontmatter shape

# SOURCE: plugins/relay/commands/relay-plan.md:1-3
```
---
description: Autonomous plan generation from an APPROVED PRD. ...
argument-hint: <prd-path>
---
```

Used by Task 1 (frontmatter + outer skeleton): the relay-implement frontmatter follows the same two-field pattern.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-implement.md` | CREATE | The phase deliverable — the new command file. Single-file create; no other source files modified by this plan. |

## NOT Building (Scope Limits)

- A bundled writer + reviewer command — the internal loop is NOT bundling; the writer/reviewer split decision (2026-04-19) still applies. The reviewer surface is `/relay-code-review` (Phase 4 of source PRD).
- `/relay-worktree` dependency — the command implements graceful degradation per source PRD D3 (works in cwd if no worktree).
- B7/B8 bounce-back implementation — deferred per source PRD D14; the placeholder protocol surfaces a structured HALT message on `DISPUTE_UPHELD_TEST_WRONG`, but no actual `Task(subagent_type='tdd-writer', ...)` invocation is wired in MVP.
- `--dry-run` flag (could-item per source PRD D7-table; deferred).
- `--from-attempt <N>` flag (could-item per source PRD D7-table; deferred).
- Cross-plan / multi-phase orchestration — source PRD D5; that is `/relay-execute`'s job.
- File-lock or refuse semantics for concurrency — source PRD D18; the MVP is the soft-fail diagnostic only.
- Browser / Database / Manual validation Levels 4–6 in the agent contract — per source PRD's "What We're NOT Building"; per-project plan content if applicable.
- A `--manual` or `--strict` flag re-introducing a user-confirmation gate — past the interactivity boundary.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/commands/relay-implement.md` frontmatter + outer skeleton

**ACTION**: Create the file. Write the YAML frontmatter (`description: Autonomous code generation from an APPROVED plan...`, `argument-hint: <plan-path>`). Write the top-level title `# /relay-implement` and the nine canonical section headings: `## Your mission`, `## Decision Gate (before any action)`, `## Parse arguments`, `## Preconditions`, `## Phase A — Internal writer↔reviewer loop`, `## Final output surface`, `## Constraints (hard rules)`, `## What you do NOT do`, plus a closing `## What `/relay-implement` is NOT` (alias for the same; some sibling commands use slightly different naming — choose one and stay consistent). Leave each section body empty for now (filled in later tasks).

**MIRROR**: `plugins/relay/commands/relay-prd.md:1-30` (frontmatter shape); `plugins/relay/commands/relay-plan.md:1-12` (single-role command frontmatter).

**VALIDATE**: `grep -c "^## " plugins/relay/commands/relay-implement.md` returns 8 (the eight canonical `##`-level sections).

### Task 2: WRITE the `## Your mission` and `## Decision Gate (before any action)` section bodies

**ACTION**: Within `## Your mission`, write a paragraph explaining what the command does (orchestrate internal writer↔reviewer loop between implementer + code-reviewer agents; capture per-attempt diff.patch artifacts; enforce dual budget caps + oscillation detection; perform D8 post-approval mutations on APPROVED rubric). Include the `See:` references list pointing at: `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/implementation-authoring.prd.md`, `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/implementer.md`, `${CLAUDE_PLUGIN_ROOT}/plugins/relay/agents/code-reviewer.md`, `docs/context/plan-template.md`. Within `## Decision Gate (before any action)`, write the instruction to consult `docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md` and emit the six-line fenced block with the activated criteria specific to `/relay-implement` (cross-cutting artifact creation; new command; impacts implementer + code-reviewer + future `/relay-execute`; references source PRD D7 + D8 + D11). Include the canonical six-line block as a literal example.

**MIRROR**: `plugins/relay/agents/implementer.md:518-530` (six-line block shape); `plugins/relay/commands/relay-plan.md:33-44` (command-level gate emission instruction).

**VALIDATE**: `grep -c "^- Active context:" plugins/relay/commands/relay-implement.md` returns 1 (exactly one Decision Gate template instance — duplicate would indicate accidental two-block emission).

### Task 3: WRITE the `## Parse arguments` and `## Preconditions` section bodies

**ACTION**: In `## Parse arguments`, define `$ARGUMENTS` as a single non-empty path-like string (the plan path); resolve as absolute or relative to cwd; HALT with usage message on blank/whitespace; record `plan_path` and `target_root`. In `## Preconditions`, write five preconditions, each as a `### P<N>` subsection with a verbatim HALT message:
- **P1** — Plan path resolves to a readable file (else canonical file-not-readable HALT).
- **P2** — Plan ends with `*Status: APPROVED*` (last non-empty line equals exactly that string; trim trailing whitespace before comparison; HALT message names the actual status found).
- **P3** — Source PRD's Implementation Phases row N `Status` cell is `in-progress` (extract `<feature>` and `<N>` from plan filename pattern `<feature>-phase-<N>-<slug>.plan.md`; locate the canonical header line in `PRPs/prds/<feature>.prd.md`; locate row `<N>`; verify Status cell is exactly `in-progress`; HALT byte-exact per source PRD AC-11 with cell value, expected value, file path, row number).
- **P4** — Decision Gate sources readable (`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`); HALT byte-exact per source PRD AC-14.
- **P5** — Base-commit derivable: run `git merge-base HEAD <base-branch>`; if no base-branch detectable, fall back to `git symbolic-ref refs/remotes/origin/HEAD` per `prp-implement.md` Phase 0.2 pattern; if neither resolves, HALT with diagnostic naming the failed git command.

**MIRROR**: `plugins/relay/commands/relay-plan.md:69-152` (precondition pattern); source PRD AC-11 + AC-14 (verbatim HALT messages).

**VALIDATE**: `grep -c "^### P[0-9] —" plugins/relay/commands/relay-implement.md` returns 5 (five preconditions P1 through P5).

### Task 4: WRITE `## Phase A` — internal-loop opener + per-attempt budget/oscillation/dispute-cap checks

**ACTION**: In `## Phase A — Internal writer↔reviewer loop`, define the loop-state variables: `attempt = 1`; `max_implement_retries = 3`; `max_implement_minutes = 45`; `deadline_ts = now() + max_implement_minutes minutes`; `disputes_used = 0`; `max_disputes_per_session = 2`; `files_changed_by_attempt: dict<int, set<str>>`. Write the per-attempt pre-flight check sequence (in order):
1. **Time budget check.** If `now() >= deadline_ts`, HALT with outcome `FAILED_TIME_BUDGET_EXCEEDED`; emit structured halt message naming elapsed wall-clock + remaining retries. Write `halt.json`.
2. **Retry budget check.** If `attempt > max_implement_retries + 1`, HALT with outcome `FAILED_AFTER_N_RETRIES`; emit structured halt message naming the attempt count + last reviewer verdict. Write `halt.json`.
3. **Oscillation check** (only when `attempt >= 3`). For each prior attempt `k < attempt`, intersect `files_changed_by_attempt[k]` with `files_changed_by_attempt[attempt-1]`; if non-empty AND the previous attempt's diff reverses lines from attempt `k`, HALT with outcome `FAILED_OSCILLATION_DETECTED`; emit halt message naming the file pair `(k, attempt-1)` and the reverting files. Write `halt.json`.
4. **Dispute cap check** (only at the start of an arbitration step). If `disputes_used >= max_disputes_per_session`, HALT with outcome `FAILED_DISPUTE_CAP_EXCEEDED`; emit halt message naming the cap and the dispute history. Write `halt.json`.

Also write the soft-fail concurrency diagnostic per source PRD D18: at the start of Phase A (before attempt 1), `Glob` `PRPs/reports/<feature>/phase-<N>/attempts/*/diff.patch` for in-flight attempts (heuristic: any `diff.patch` whose corresponding `code-review.jsonl` line shows neither APPROVED nor a final HALT); if found, emit warning `"concurrent /relay-implement detected; orchestrator must serialize"` and continue (do not block).

**MIRROR**: `plugins/relay/commands/relay-test.md:84-87` (budget checks) + `:153-166` (oscillation algorithm); source PRD D7 (budgets) + D18 (concurrency).

**VALIDATE**: `grep -cE "FAILED_(AFTER_N_RETRIES|TIME_BUDGET_EXCEEDED|OSCILLATION_DETECTED|DISPUTE_CAP_EXCEEDED)" plugins/relay/commands/relay-implement.md` returns ≥4 (one per outcome code).

### Task 5: WRITE `## Phase A` — implementer dispatch + per-attempt diff capture

**ACTION**: After the pre-flight checks, write the implementer dispatch step: invoke `Task(subagent_type='implementer', prompt=<structured prompt with plan_path, target_root, attempt, prior_feedback?, base_commit>)`. The prompt MUST include the prior reviewer's CHANGES_REQUESTED rubric defects when `attempt > 1` (carried forward from the previous attempt's `code-review.jsonl` entry). On return, parse the implementer's verdict (`IMPLEMENTATION_COMPLETE` or `TEST_CONTRACT_DISPUTE`). After every attempt regardless of verdict: run `git add -A` (because the implementer uses `Edit`/`Write` and may leave files unstaged); run `git diff <base-commit>` and write the result to `PRPs/reports/<feature>/phase-<N>/attempts/<attempt>/diff.patch`; parse the diff to extract `files_changed_by_attempt[attempt] = set(<paths>)`; write `PRPs/reports/<feature>/phase-<N>/attempts/<attempt>/record.json` with `{attempt, verdict, files_changed, dispute_evidence?}`.

**MIRROR**: `plugins/relay/agents/implementer.md:44-66` (verdict shapes); `plugins/relay/commands/relay-test.md:109-129` (per-attempt artifact write pattern).

**VALIDATE**: `grep -c "phase-<N>/attempts" plugins/relay/commands/relay-implement.md` returns ≥1 AND `grep -c "subagent_type=.implementer." plugins/relay/commands/relay-implement.md` returns ≥1.

### Task 6: WRITE `## Phase A` — code-reviewer dispatch + verdict branching

**ACTION**: After the implementer's verdict and diff capture, dispatch the code-reviewer:
- If implementer verdict is `IMPLEMENTATION_COMPLETE`: `Task(subagent_type='code-reviewer', prompt={plan_path, target_root, mode: 'standard', attempt, diff_target: 'phase-<N>/attempts/<attempt>/diff.patch'})`. The reviewer appends to `PRPs/plans/<basename>.code-review.jsonl` itself (D11). Parse the verdict line just appended to that file: APPROVED → exit the loop into D8 mutations (Task 7); CHANGES_REQUESTED → carry the rubric defects (`reason` fields) as feedback, increment `attempt`, restart the pre-flight checks.
- If implementer verdict is `TEST_CONTRACT_DISPUTE`: increment `disputes_used` (counted toward `max_implement_retries` per source PRD D9 Layer 1). Dispatch in arbitration mode: `Task(subagent_type='code-reviewer', prompt={plan_path, target_root, mode: 'arbitration', attempt, dispute_payload: <implementer's structured evidence block>, diff_target: 'phase-<N>/attempts/<attempt>/diff.patch'})`. Parse the appended jsonl verdict line:
  - `DISPUTE_REJECTED` → next attempt mandates code; carry `"dispute rejected; produce code addressing <reason>"` as feedback; increment `attempt`; restart pre-flight checks.
  - `DISPUTE_UPHELD_TEST_WRONG` → HALT with structured message `"DISPUTE_UPHELD_TEST_WRONG. B7/B8 bounce-back deferred per D14. Manual recovery: surface dispute to user; user decides whether to update tests or PRD."` Write `halt.json`.
  - `DISPUTE_UPHELD_PRD_AMBIGUOUS` → HALT with structured message `"DISPUTE_UPHELD_PRD_AMBIGUOUS. Manual recovery: hand-edit PRD per dispute_evidence; flip PRD status back to DRAFT; re-run /relay-prd."` Write `halt.json`.

Per source PRD D9 Layer 4: every HALT message carries the attempt history + dispute history + actionable recommendation.

**MIRROR**: `plugins/relay/agents/code-reviewer.md:49-75` (input/output contract); source PRD D9 (TDD opt-in / dispute escape valve).

**VALIDATE**: `grep -cE "DISPUTE_(REJECTED|UPHELD_TEST_WRONG|UPHELD_PRD_AMBIGUOUS)" plugins/relay/commands/relay-implement.md` returns ≥3 (one per arbitration verdict).

### Task 7: WRITE `## Phase A` — D8 post-approval mutations (best-effort atomic with rollback note)

**ACTION**: After APPROVED rubric, perform three mutations in order (each with explicit success/failure check):

**Mutation a (plan trailing-block flip):**
- `Edit` `<plan_path>`:
  - `old_string`: `*Status: APPROVED*`
  - `new_string`: `*Implemented: <YYYY-MM-DD>*\n*Status: IMPLEMENTED*`
  - `replace_all`: `false`

**Mutation b (plan move to completed/):**
- `Bash`: `mv <plan_path> PRPs/plans/completed/<basename>.plan.md` (or equivalent; the destination directory exists per `PRPs/plans/completed/` already containing 12 prior completed plans).

**Mutation c (source PRD row N status flip):**
- `Edit` `<source_prd_path>`:
  - `old_string`: the verbatim full row N line copied from the source PRD (including all leading/trailing pipes and whitespace).
  - `new_string`: the same row line with `Status` cell `in-progress` → `complete` (the `PRP Plan` cell is left unchanged; plan-writer already populated it with the path that just moved to `completed/`).
  - `replace_all`: `false`.

On any partial failure: write `PRPs/reports/<feature>/phase-<N>/halt.json` with `{mutations_attempted: ['a', 'b', 'c'], mutations_succeeded: [...], mutation_failed: <which>, error: <reason>, manual_recovery_steps: [...]}`. Emit a structured rollback note message naming the next manual step the user/orchestrator must take. Per source PRD D8: best-effort atomic — the command does NOT roll back successful mutations; recovery is documented, not automatic.

**MIRROR**: `plugins/relay/agents/plan-writer.md:467-492` (Edit-with-full-row-old_string discipline); source PRD D8.

**VALIDATE**: `grep -c "PRPs/plans/completed" plugins/relay/commands/relay-implement.md` returns ≥1 AND `grep -c "Status: IMPLEMENTED" plugins/relay/commands/relay-implement.md` returns ≥1 AND `grep -c "halt.json" plugins/relay/commands/relay-implement.md` returns ≥3 (one per HALT outcome).

### Task 8: WRITE `## Final output surface` + `## Constraints (hard rules)` + `## What you do NOT do` section bodies

**ACTION**: In `## Final output surface`: emit the success summary verbatim per source PRD AC-1 ("✅ Plan **IMPLEMENTED** at `PRPs/plans/completed/<basename>.plan.md`. Source PRD row <N> marked `complete`. Per-attempt diff at `PRPs/reports/<feature>/phase-<N>/attempts/<attempt>/diff.patch`. APPROVED entry at `PRPs/plans/<basename>.code-review.jsonl`. Worktree ready for `/relay-test`."), or one of the four HALT messages with structured halt.json reference. In `## Constraints (hard rules)`: list the eight invariants — never write under `.claude/`; never bundle writer + reviewer (the reviewer surface is `/relay-code-review`); never adopt the reviewer role beyond `Task` dispatch (no inline rubric); never prompt the user; never overwrite an APPROVED plan (P2 catches); never bypass D8 (all three mutations or structured halt.json); never skip the Decision Gate evidence block; never re-run on CHANGES_REQUESTED externally (the loop is internal to one invocation; the orchestrator decides re-invocations). In `## What you do NOT do`: list scope limits — reviewing the plan (that is `/relay-code-review`); implementing additional phases (one plan per invocation per D5); bundling writer + reviewer (D1); reopening an IMPLEMENTED plan via tooling; targeting a specific phase via `--phase <N>` flag (deferred); cross-PRD planning.

**MIRROR**: `plugins/relay/commands/relay-plan.md:215-278` (Final output + Constraints + What you do NOT do shape).

**VALIDATE**: `grep -c "^## " plugins/relay/commands/relay-implement.md` returns 8 (all eight canonical sections present after every task; no accidental section removal).

## Validation Commands

### Level 1 — STATIC_ANALYSIS

- Markdown structure check: `grep -E "^(##|###) " plugins/relay/commands/relay-implement.md | wc -l` returns ≥13 (8 `##` sections + 5 `### P` precondition sub-sections at minimum).
- YAML frontmatter parses: extract lines 1–4 of the file and parse as YAML. The frontmatter must contain `description` (non-empty) and `argument-hint` (non-empty).
- Markdown lint (best-effort; skip if no markdownlint available): `npx --no-install markdownlint plugins/relay/commands/relay-implement.md 2>/dev/null || true` — do not fail the level on missing tool, but capture warnings.

### Level 2 — CONTENT_INVARIANTS

- All eight canonical `##` sections present:
  `grep -cE "^## (Your mission|Decision Gate|Parse arguments|Preconditions|Phase A|Final output|Constraints|What you do NOT do)" plugins/relay/commands/relay-implement.md` returns 8.
- All four FAILED_* outcome codes present:
  `grep -cE "FAILED_(AFTER_N_RETRIES|TIME_BUDGET_EXCEEDED|OSCILLATION_DETECTED|DISPUTE_CAP_EXCEEDED)" plugins/relay/commands/relay-implement.md` returns ≥4.
- All three DISPUTE_* arbitration verdicts present:
  `grep -cE "DISPUTE_(REJECTED|UPHELD_TEST_WRONG|UPHELD_PRD_AMBIGUOUS)" plugins/relay/commands/relay-implement.md` returns ≥3.
- Budget caps present with correct values:
  `grep -c "max_implement_retries.*3\|max_implement_minutes.*45\|max_disputes_per_session.*2" plugins/relay/commands/relay-implement.md` returns ≥3.
- D8 mutation targets present:
  `grep -c "PRPs/plans/completed" plugins/relay/commands/relay-implement.md` returns ≥1; `grep -c "Status: IMPLEMENTED" plugins/relay/commands/relay-implement.md` returns ≥1.
- Per-attempt artifact path present with `phase-<N>` segment:
  `grep -c "phase-<N>/attempts" plugins/relay/commands/relay-implement.md` returns ≥2 (cited at least in Phase A diff capture and in Validation Commands).
- No `.claude/PRPs/` write target (contrastive references in quoted prohibitions are allowed; check is "no `Write(`/`Edit(` followed by a path under `.claude/`"):
  `grep -E "(Write|Edit).*\.claude/PRPs" plugins/relay/commands/relay-implement.md` returns nothing.
- Five preconditions present:
  `grep -c "^### P[0-9] —" plugins/relay/commands/relay-implement.md` returns 5.

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

- Synthesise a minimal APPROVED plan at `PRPs/plans/_dryrun-implement-test-phase-1-noop.plan.md` whose Step-by-Step Tasks are trivially passing (e.g., a single task `echo OK`); ensure `_dryrun-implement-test.prd.md` has row 1 in `in-progress`. Invoke the `/relay-implement` flow against the dry-run plan in a sandbox: verify (a) all 5 preconditions pass, (b) the implementer dispatch returns `IMPLEMENTATION_COMPLETE`, (c) the diff.patch artifact lands at `PRPs/reports/_dryrun-implement-test/phase-1/attempts/1/diff.patch`, (d) the code-reviewer dispatch returns APPROVED on first attempt, (e) all three D8 mutations succeed (plan flipped, plan moved, PRD row complete), (f) the success summary matches the AC-1 verbatim text. Cleanup: remove the dry-run PRD + plan + reports + completed/ entry.
- Snapshot test: take a `git diff plugins/relay/commands/relay-implement.md` and confirm it is the only file modified by Phase 3 of this plan (no incidental edits to sibling commands or agents).

## Acceptance Criteria

- **AC-A1 (PRD AC-1 + AC-13):** Given a synthetic APPROVED plan whose Step-by-Step Tasks pass on first attempt, when `/relay-implement` runs, then it emits the AC-1 success summary, performs all three D8 mutations (plan flip, plan move, PRD row update), appends one APPROVED line to `<basename>.code-review.jsonl`, writes `attempts/1/diff.patch`, and exits — without any user prompt (autonomous; past the interactivity boundary).

- **AC-A2 (PRD AC-2 + AC-7 + AC-8):** The command implements the loop with `max_implement_retries=3` (4 attempts total), `max_implement_minutes=45` (wall-clock), `max_disputes_per_session=2`, and oscillation detection always-on. Distinct outcome codes are emitted: FAILED_AFTER_N_RETRIES (retries exhausted), FAILED_TIME_BUDGET_EXCEEDED (wall-clock exhausted, first-to-expire-wins), FAILED_OSCILLATION_DETECTED (file-set intersection + semantic-reversal). Each HALT writes a structured `halt.json`.

- **AC-A3 (PRD AC-3 + AC-5):** The command dispatches `code-reviewer` in arbitration mode when the implementer emits `TEST_CONTRACT_DISPUTE`; tracks the `disputes_used` counter; refuses a third dispute attempt with `FAILED_DISPUTE_CAP_EXCEEDED`. Each arbitration verdict produces one `code-review.jsonl` line with `mode: "arbitration"` and the full `dispute_evidence` block.

- **AC-A4 (PRD AC-9):** No path resolved by the command for any artifact write (`diff.patch`, `code-review.jsonl`, plan-move target, halt.json) starts with or contains `/.claude/`. Static check via `grep -E "(Write|Edit).*\.claude/PRPs" plugins/relay/commands/relay-implement.md` returns nothing.

- **AC-A5 (PRD AC-11):** The command's P3 precondition reads the source PRD's row N `Status` cell and HALTs with a structured precondition message naming the cell value, the expected value, the file path, and the row number when the cell is not `in-progress`. The plan-writer's back-fill must have run; this precondition catches the failure mode where it did not.

- **AC-A6 (PRD AC-14):** The command's Decision Gate consultation HALTs with the byte-exact AC-14 message ("I cannot emit the Decision Gate evidence block without reading `<missing-file>`. Please ensure the file exists at `<target_root>/<relative-path>` and re-run `/relay-implement`. No code has been changed and no review has been run.") if any of the three sources is unreadable.

- **AC-A7 (PRD AC-1 D8 mutation atomicity):** On any partial-failure of D8 mutations, the command writes `PRPs/reports/<feature>/phase-<N>/halt.json` with the partial state (`mutations_attempted`, `mutations_succeeded`, `mutation_failed`, `error`, `manual_recovery_steps`) and emits a structured rollback note message naming the next manual step. The command does NOT roll back successful mutations (best-effort atomic per D8).

- **AC-A8 (PRD AC-6):** The command computes `<base-commit>` as `git merge-base HEAD <base-branch>` (or fallback to `git symbolic-ref refs/remotes/origin/HEAD`) and writes `diff.patch` artifacts at `PRPs/reports/<feature>/phase-<N>/attempts/<i>/` regardless of whether the cwd is inside a git worktree set up by `/relay-worktree`. Graceful degradation per D3.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Loop logic in markdown-prose may be ambiguous to the LLM at runtime, causing drift from intended budget semantics (e.g., `max_implement_retries=3` interpreted as 3 total attempts instead of 3 retries + 1 initial = 4) | M | M | Mirror `relay-test.md`'s prose conventions byte-for-byte (numbered steps, explicit conditional checks, `attempt > max_retries + 1` formula); plan-reviewer R3 / R4 / R5 catches drift; AC-A2 explicit Validation Level 2 grep checks for the verbatim cap values. |
| D8 partial-failure scenarios under-tested (the three mutations interleave with filesystem races) | L | H | AC-A7 explicit `halt.json` artifact + structured rollback message; the actual transactional implementation is best-effort per D8; manual recovery is documented in the halt message. |
| `git diff <base-commit>` produces an empty diff if the implementer wrote files but did not stage them | L | M | The command runs `git add -A` before computing the diff (Task 5); fallback `git diff HEAD` if base-commit equals HEAD. |
| Implementer or code-reviewer agent spec drifts from this command's expected input/output shapes | M | M | Mandatory Reading anchors the contracts at fixed `file:line`; rubric R8 (PRD↔plan traceability) on plan-reviewer side catches PRD-AC traceability gaps that would surface schema mismatches; integration test in Validation Level 3 catches runtime drift. |
| markdownlint errors block Validation Level 1 over stylistic concerns (line length, table formatting) | L | L | Level 1 markdownlint invocation uses `\|\| true` to avoid hard-fail on missing tool; plan-reviewer R3 only checks structural TBD, not stylistic lint; relay's existing command files have already passed lint without a `.markdownlintrc`. |
| Concurrent `/relay-implement` invocations on the same worktree corrupt the `attempts/` directory | L | M | D18 soft-fail diagnostic (Task 4) emits warning and continues; robust file-lock semantics deferred until `/relay-execute` is designed (Open Question #5 in source PRD, resolved as D18). |
| The `phase-<N>` path segment is relay-implement-original (no Test Runner precedent) and may need future re-derivation when `/relay-execute` orchestrates multiple phases | L | L | Documented as a relay-original in this plan's Notes section; the segment is needed because the implementer runs per-PRD-phase, not per-feature; multiple plans per feature each need their own `attempts/` directory. |

## Notes

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### Design notes (from grounding)

- The `phase-<N>/` path segment in `PRPs/reports/<feature>/phase-<N>/attempts/<i>/diff.patch` is a **relay-implement-original** with no precedent in the existing Test Runner layout (which uses flat `PRPs/reports/<feature>/attempts/<N>/`). The `phase-<N>` segment is needed because the implementer runs per-PRD-phase, not per-feature; multiple plans may exist for one feature, and each phase's attempts live under its own directory. Documented in source PRD's Architecture Notes.
- The plan-move-to-`completed/` mechanic has **no `Bash(mv ...)` precedent in any existing relay command or agent file** — `PRPs/plans/completed/` is already populated with 12 prior completed plans (plan-authoring, implementation-authoring phases 1–2, reviewer-coherence-layer), but those moves were performed in prior sessions. Task 7 (Mutation b) introduces the canonical invocation: `Bash(mv <plan_path> PRPs/plans/completed/<basename>.plan.md)` with explicit success/failure check.
- The `code-review.jsonl` audit log shape is defined in `plugins/relay/agents/code-reviewer.md:49-75` with rubric IDs R-S1/R-S2/R-S3/R-L1/R-L2/R-L3/R-SEM/R-X (plus R-COH-* additive from the reviewer-coherence-layer feature). The existing `.review.jsonl` files under `PRPs/plans/` use plan-reviewer IDs (R1–R8); none are code-reviewer logs yet — this command will be the first producer.
- The source PRD's D8 specifies "best-effort atomic with rollback note on partial failure" — Task 7 implements this as: each mutation attempted in order; on the first failure, the partial state is captured in `halt.json` with `{mutations_attempted, mutations_succeeded, mutation_failed, error, manual_recovery_steps}`; the command does NOT roll back successful mutations. The plan-stage rubric does not specify a transactional WAL.
- **`git add -A` before each diff capture** is needed because the implementer uses `Edit`/`Write` and may leave files unstaged; the `git diff <base-commit>` would otherwise miss those files. Pattern lifted from `prp-implement.md` Phase 0.2 base-branch detection.
- Color of the command file: command files don't have a `color` field (only agents do). Only the dispatched `implementer` (green) and `code-reviewer` (magenta) are colored.
- Concurrent `/relay-implement` on shared worktree (D18): the command performs a soft-fail diagnostic check at start by `Glob`-ing `PRPs/reports/<feature>/phase-<N>/attempts/*/diff.patch` for in-flight attempts; emits warning `"concurrent /relay-implement detected; orchestrator must serialize"` and continues without blocking. Robust file-lock semantics deferred until `/relay-execute` is designed.
- The implementer's `IMPLEMENTATION_COMPLETE` verdict carries `{files_changed, validation: {level_1, level_2, level_3}, validation_outputs}` per `plugins/relay/agents/implementer.md:44-66`; the command can short-circuit a code-reviewer dispatch if all three Validation Levels report PASS — but D6 specifies the code-reviewer is the authority on rubric pass, so the dispatch is mandatory regardless.
- B7/B8 bounce-back (D14 placeholder): the `DISPUTE_UPHELD_TEST_WRONG` HALT message in Task 6 includes the placeholder protocol comment `"// TODO when B7/B8 ship: Task(subagent_type='tdd-writer', prompt={attempt_history, dispute_evidence})"` so the integration point is visible in code; no actual `Task` invocation is wired in MVP.

*Generated: 2026-04-30*
*Approved: 2026-04-30*
*Implemented: 2026-04-30*
*Status: IMPLEMENTED*
