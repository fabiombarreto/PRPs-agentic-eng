# Feature: /relay-execute Phase A.5.0 explicit handling (Phase 2 of test-frameworks-empty-self-skip)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: protocol evolution touching /relay-execute Phase A.5; inserts Step A.5.0 symmetric to A.3.5.0; cross-cutting orchestrator command; closes dogfood-A vs dogfood-B non-determinism; formalizes skipped_no_test_framework outcome code in orchestrator_run_log
- Decisions found:
  - 2026-05-06 — TDD pair authorized; /relay-execute A.3.5.0 self-skips silently when tdd: false or methodology.md missing — direct structural precedent for the new A.5.0 step (same re-read pattern, same log-entry shape)
  - 2026-05-01 D6 — Source PRD's Implementation Phases table is the canonical state machine; plan-writer back-fill required (this phase)
  - 2026-05-01 D3 — Per-stage retry budget composition; each downstream command owns its internal loop budget; orchestrator adds session-level budgets — A.5.0 is an orchestrator-layer gate, not a per-stage budget change
  - 2026-05-11 D8 — Worktree-creation-failure graceful fallback to cwd — graceful-degradation philosophy applied symmetrically: test_frameworks absence is a declared state, not an infra failure
  - 2026-04-19 — PRP artifact paths under PRPs/ (never .claude/) — no artifact path change in this phase; constraint satisfied by construction
- Applicable anti-patterns:
  - docs/anti-patterns.md:43-48 — "Activating the TDD track by heuristic" — applied symmetrically: test_frameworks activation requires explicit non-empty declaration; never heuristic; A.5.0 mirrors this opt-in discipline
  - docs/anti-patterns.md:60-66 — "Writing pipeline artifacts under .claude/" — no .claude/ writes; all artifacts under PRPs/
  - docs/anti-patterns.md:79-84 — "Relying on interactive permission prompts in the autonomous loop" — the false FAILED_INFRA_UNRECOVERABLE halt on framework-less projects is semantically equivalent to an unsignalled prompt forcing manual intervention; A.5.0 eliminates it
- Applicable architectural rules:
  - docs/context/architecture.md:57-81 — Interactivity boundary; past PRD approval, autonomous; halts must be semantically correct; FAILED_INFRA_UNRECOVERABLE is preserved for genuine infra failures only
  - docs/context/architecture.md:84-98 — PRPs/ artifact paths; no .claude/ writes
  - Three-pillar Pillar 2 writer/reviewer pairs preserved (no command-surface change; behavioral evolution of the orchestrator only)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-frameworks-empty-self-skip.prd.md` — Implementation Phases row 2: "/relay-execute Phase A.5.0 explicit handling" — Goal: Make `/relay-execute` produce a deterministic structured log entry for framework-less projects, closing the dogfood-A vs dogfood-B inconsistency at the orchestrator layer. — Success signal: `orchestrator_run_log` schema accepts the new outcome; two parallel sessions against framework-less PRDs produce identical `skipped_no_test_framework` entries (AC-5).

## Summary

Phase 2 delivers a single edit to `plugins/relay/commands/relay-execute.md`: a new Step A.5.0 inserted immediately above the existing Step A.5.1 (command-exists check) in Phase A.5. Step A.5.0 re-reads `docs/context/methodology.md` (same re-read discipline as A.3.5.0 — protects against mid-flow mutations) and inspects `test_frameworks`. On `[]` or file-absent, it appends a structured `{"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}` entry to `orchestrator_run_log` and proceeds directly to Phase A.6 — bypassing the command-exists check, the `/relay-test` adoption, and the `/relay-test-review` adoption entirely. When `test_frameworks` is non-empty, the step falls through to the existing A.5.1 chain unchanged, preserving strict `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra failures. The phase also adds a single documentation note at the bottom of Phase A.5 stating that the de-facto contradictory `FAILED_INFRA_UNRECOVERABLE → ALL_PHASES_COMPLETE` path observed in dogfood-B is now structurally impossible: a framework-less project exits A.5 via the A.5.0 branch; a framework-declared project that hits an infra failure halts before reaching A.6.

## User Story

As a relay pipeline operator running `/relay-execute` against a project with `test_frameworks: []` (or no `methodology.md`),
I want the orchestrator to detect the framework-less state at Phase A.5.0 and log a deterministic `skipped_no_test_framework` entry,
So that both parallel sessions produce identical test-stage outcome codes, the pipeline reaches `ALL_PHASES_COMPLETE`, and the contradictory dogfood-B `FAILED_INFRA_UNRECOVERABLE → ALL_PHASES_COMPLETE` path becomes structurally impossible.

## Problem Statement

`/relay-execute` currently reaches Phase A.5 and dispatches `/relay-test` inline for every project, regardless of whether the project has declared any test frameworks. Because `/relay-test`'s precondition chain (before Phase 1's fix) conflated "no framework configured" with "framework configured but infra broken", the orchestrator received non-deterministic outcomes: session A self-skipped with `skipped_no_test_framework` (graceful path, informal) while session B took the strict path and received `FAILED_INFRA_UNRECOVERABLE` — yet still declared `ALL_PHASES_COMPLETE`, directly contradicting the strict orchestrator halt protocol. Phase 1 fixed the command-level path (standalone `/relay-test` now self-skips cleanly), but without an explicit orchestrator-layer gate in A.5, a `/relay-execute` session that does not fully adopt the updated `/relay-test` Phase 0 behavior (e.g., mid-session caching, version drift) can still produce divergent outcomes. The orchestrator must be the source of truth for the test-stage outcome when `test_frameworks` is absent by design.

## Solution Statement

Insert Step A.5.0 immediately above Step A.5.1 in Phase A.5 of `plugins/relay/commands/relay-execute.md`. A.5.0 re-reads `<target_root>/docs/context/methodology.md` and inspects `test_frameworks`. On `[]` or file-absent: append `{"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}` to `orchestrator_run_log` and proceed to Phase A.6 — the command-exists check, `/relay-test` adoption, and `/relay-test-review` adoption are all bypassed. On non-empty `test_frameworks`: fall through to A.5.1 unchanged. Append a documentation note below Step A.5.3 explicitly stating the dogfood-B contradictory path (`FAILED_INFRA_UNRECOVERABLE` from framework-less project → `ALL_PHASES_COMPLETE`) is now structurally impossible.

## Metadata

| Key | Value |
|-----|-------|
| Type | Command file evolution (orchestrator behavioral fix, Markdown) |
| Complexity | Low — single file, two insertion points (Step A.5.0 block + documentation note) |
| Systems Affected | `plugins/relay/commands/relay-execute.md` (Phase A.5) |
| Dependencies | Phase 1 complete (`PRPs/plans/completed/test-frameworks-empty-self-skip-phase-1-relay-test-phase-0-gate.plan.md`) |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` row 2 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-execute.md` | 353–361 | Step A.3.5.0 — the canonical reference pattern to mirror exactly: re-read methodology.md, branch on key, append structured log entry, proceed |
| P0 | `plugins/relay/commands/relay-execute.md` | 484–537 | Phase A.5 current shape — A.5.1 command-exists check + A.5.2 /relay-test adoption + HALT handling; insertion point for A.5.0 is immediately above line 486 |
| P1 | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` | 164–167 | Phase 2 Phase Details: Goal, Scope, Success signal |
| P1 | `PRPs/prds/test-frameworks-empty-self-skip.prd.md` | 59–68 | AC-4, AC-5 — the two ACs this phase directly satisfies |
| P1 | `plugins/relay/commands/relay-execute.md` | 1–50 | Command frontmatter + mission statement — context for how the orchestrator is described; the new step must not contradict the description block |
| P2 | `PRPs/plans/completed/test-frameworks-empty-self-skip-phase-1-relay-test-phase-0-gate.plan.md` | 1–30 | Phase 1 plan structure reference — confirms the shape and Decision Gate evidence used for the symmetric change |
| P2 | `PRPs/reports/relay-worktree/dogfood.md` | 278–283 | "Protocol inconsistency surfaced" passage — driving evidence for the note on the now-impossible contradictory path |

## Patterns to Mirror

### Pattern 1 — Step A.3.5.0 methodology.md gate (re-read + branch + log entry)

# SOURCE: plugins/relay/commands/relay-execute.md:353-361

```markdown
#### Step A.3.5.0 — methodology.md gate (live no-op when `tdd: false`)

Re-read `<target_root>/docs/context/methodology.md` (already read in P5 — re-read here protects against mid-flow mutations).

- If file absent or `tdd: false`: A.3.5 self-skips. Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "tdd", "outcome": "skipped_tdd_false"}
  ```
  Proceed directly to Phase A.4. No suite manifest is produced.

- If `tdd: true`: proceed to Step A.3.5.1.

Set `tdd_review_attempts = 0`.
```

Task 1 mirrors this pattern verbatim, substituting `test_frameworks` for `tdd`, `skipped_no_test_framework` for `skipped_tdd_false`, and Phase A.6 for Phase A.4. The three-part shape (re-read note, absent/empty branch with log entry + proceed, non-empty fall-through) is copied exactly.

### Pattern 2 — Existing A.5.1 heading (insertion anchor)

# SOURCE: plugins/relay/commands/relay-execute.md:486-488

```markdown
#### Step A.5.1 — Command-exists check

Check that both `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test.md` and `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-test-review.md` are readable.
```

Task 1 inserts the new Step A.5.0 block immediately above this heading. The heading is the unambiguous insertion anchor for the `Edit` operation.

### Pattern 3 — orchestrator_run_log entry shape for skipped stages

# SOURCE: plugins/relay/commands/relay-execute.md:498-502

```markdown
Record in `orchestrator_run_log`:
```json
{"phase": <N>, "stage": "test", "outcome": "skipped_command_absent"}
```
```

Task 1's new A.5.0 log entry uses the identical JSON shape (`phase`, `stage`, `outcome`), with `"outcome": "skipped_no_test_framework"`. This is the third existing `test`-stage log entry shape, making the new outcome a consistent member of the family.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/relay-execute.md` | UPDATE | Insert Step A.5.0 immediately above Step A.5.1 in Phase A.5; append documentation note below Step A.5.3 on the now-impossible contradictory path |

## NOT Building (Scope Limits)

- **`docs/decisions.md` codification entry** — Phase 3 of this PRD. Phase 2 does NOT write the decisions.md entry.
- **Documentation site updates** (`documentation/commands.html`, `docs/api-reference.md`, `documentation/changelog.html`, `plugin.json` version bump) — Phase 4 of this PRD.
- **`plugins/relay/agents/test-runner.md` defensive dead-code update** — Could-item in MoSCoW; deferred to the implementer's discretion per the Open Question.
- **`/relay-test` Phase 0 gate** — Phase 1, already complete.
- **`/relay-test-review` explicit gate code change** — D5 decision: natural inheritance (no `run.json` → self-skips); only documentation required (Phase 3).
- **New halt outcome codes, new agents, new commands, new artifact paths** — out of scope for this PRD.
- **Auto-detection of test frameworks** — explicit anti-pattern (`docs/anti-patterns.md:43-48`).
- **Changing `FAILED_INFRA_UNRECOVERABLE` semantics for genuine infra failures** — preserved verbatim.

## Step-by-Step Tasks

### Task 1: INSERT Step A.5.0 in relay-execute.md Phase A.5

**ACTION:** Edit `plugins/relay/commands/relay-execute.md` to insert a new Step A.5.0 block immediately above the existing `#### Step A.5.1 — Command-exists check` heading. The new block mirrors A.3.5.0 exactly, substituting `test_frameworks` for `tdd` and `skipped_no_test_framework` for `skipped_tdd_false`.

**MIRROR:** Pattern 1 (A.3.5.0 shape) from `plugins/relay/commands/relay-execute.md:353-361`; Pattern 2 (A.5.1 heading as insertion anchor) from `plugins/relay/commands/relay-execute.md:486-488`.

The new text to insert (replacing the `#### Step A.5.1` heading as the `new_string` continuation):

```markdown
#### Step A.5.0 — methodology.md gate (self-skip when `test_frameworks: []` or file absent)

Re-read `<target_root>/docs/context/methodology.md` (already read in P5 — re-read here protects against mid-flow mutations).

- If file absent or `test_frameworks: []` (empty list): A.5 self-skips. Append to `orchestrator_run_log`:
  ```json
  {"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}
  ```
  Proceed directly to Phase A.6. Steps A.5.1–A.5.3 are not reached.

- If `test_frameworks` is non-empty: proceed to Step A.5.1.

#### Step A.5.1 — Command-exists check
```

*(satisfies AC-A1, AC-A2)*

**VALIDATE:** `grep -n "Step A.5.0" plugins/relay/commands/relay-execute.md`

### Task 2: VERIFY log entry shape and insertion order in relay-execute.md

**ACTION:** Confirm that the inserted Step A.5.0 appears before Step A.5.1, that the log entry uses `"outcome": "skipped_no_test_framework"`, and that Step A.5.1 and its body remain unchanged below the new step.

**MIRROR:** Pattern 3 (`orchestrator_run_log` entry shape) from `plugins/relay/commands/relay-execute.md:498-502`; Pattern 2 (A.5.1 heading must still exist below A.5.0).

*(satisfies AC-A1, AC-A2)*

**VALIDATE:** `grep -n "skipped_no_test_framework\|Step A.5.0\|Step A.5.1\|Command-exists check" plugins/relay/commands/relay-execute.md`

### Task 3: INSERT documentation note on the now-impossible contradictory path

**ACTION:** Edit `plugins/relay/commands/relay-execute.md` to append a documentation note immediately below the Step A.5.3 block (after the `FAILED_TEST_REVIEW_REJECTED` HALT block). The note must state that the de-facto contradictory path observed in dogfood-B — where a framework-less project produced `FAILED_INFRA_UNRECOVERABLE` yet the session declared `ALL_PHASES_COMPLETE` — is now structurally impossible: A.5.0 intercepts the framework-less case before any command dispatch, so the orchestrator exits A.5 via Phase A.6 (not via a HALT); a framework-declared project that encounters genuine infra failure still HALTs with `FAILED_INFRA_UNRECOVERABLE` and never reaches `ALL_PHASES_COMPLETE`.

**MIRROR:** Pattern 1 (same re-read/branch discipline that makes the impossibility argument hold) from `plugins/relay/commands/relay-execute.md:353-361`.

*(satisfies AC-A3)*

**VALIDATE:** `grep -n "structurally impossible\|dogfood-B\|FAILED_INFRA_UNRECOVERABLE" plugins/relay/commands/relay-execute.md`

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Verify the file is well-formed Markdown (no broken fenced blocks or heading hierarchy breaks)
grep -c "^####" plugins/relay/commands/relay-execute.md
# Expected: count includes the new A.5.0 heading; no drop in total heading count relative to pre-edit baseline

# Confirm YAML frontmatter is intact (description field still present)
grep -c "^description:" plugins/relay/commands/relay-execute.md
# Expected: 1
```

### Level 2 CONTENT_INVARIANTS

```bash
# A.5.0 step present and before A.5.1
grep -n "Step A.5.0\|Step A.5.1" plugins/relay/commands/relay-execute.md
# Expected: A.5.0 line number < A.5.1 line number

# New outcome code present in A.5.0
grep -n "skipped_no_test_framework" plugins/relay/commands/relay-execute.md
# Expected: at least 1 match (the log entry inside A.5.0)

# A.3.5.0 reference pattern unchanged (no collateral damage)
grep -n "skipped_tdd_false" plugins/relay/commands/relay-execute.md
# Expected: 1 match (A.3.5.0 unchanged)

# Strict HALT path still present in A.5.2 (FAILED_INFRA_UNRECOVERABLE preserved)
grep -n "FAILED_INFRA_UNRECOVERABLE" plugins/relay/commands/relay-execute.md
# Expected: at least 1 match (A.5.2 HALT list intact)

# Documentation note on contradictory path present
grep -n "structurally impossible" plugins/relay/commands/relay-execute.md
# Expected: 1 match
```

### Level 3 INTEGRATION (DRY-RUN END-TO-END)

```bash
# Confirm the full Phase A.5 section has the correct step sequence: A.5.0 → A.5.1 → A.5.2 → A.5.3
grep -n "Step A.5\." plugins/relay/commands/relay-execute.md
# Expected: lines in ascending order: A.5.0, A.5.1, A.5.2, A.5.3

# Confirm no .claude/ path introduced
grep -n "\.claude/" plugins/relay/commands/relay-execute.md | grep -v "settings\.json\|\.claude/worktrees\|CLAUDE_PLUGIN_ROOT"
# Expected: 0 results (only the known-allowed references remain)

# Confirm symmetric shape: A.5.0 uses same JSON key pattern as A.3.5.0
grep -A3 "Step A.5.0" plugins/relay/commands/relay-execute.md | grep '"stage": "test"'
# Expected: 1 match confirming the log entry carries stage: test
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given a project with `test_frameworks: []` and an APPROVED PRD, when `/relay-execute` reaches Phase A.5 for some phase N, then Step A.5.0 fires, `orchestrator_run_log` contains `{"phase": <N>, "stage": "test", "outcome": "skipped_no_test_framework"}`, and the orchestrator proceeds to Phase A.6 without dispatching `/relay-test` or `/relay-test-review`.
- **AC-A2 (PRD AC-5):** Given two parallel `/relay-execute` sessions against framework-less PRDs, when both sessions reach Phase A.5, both log `skipped_no_test_framework` (the dogfood-B `FAILED_INFRA_UNRECOVERABLE` outcome is structurally blocked by Step A.5.0 running before any command dispatch).
- **AC-A3 (PRD AC-4, AC-5):** The documentation note appended below Step A.5.3 explicitly states that the de-facto contradictory `FAILED_INFRA_UNRECOVERABLE → ALL_PHASES_COMPLETE` path observed in dogfood-B is now structurally impossible; `grep -n "structurally impossible" plugins/relay/commands/relay-execute.md` returns 1 match.
- **AC-A4 (PRD AC-3):** Given `test_frameworks: ["pytest"]` (non-empty), Step A.5.0 falls through to Step A.5.1 unchanged; the full A.5.1 → A.5.2 → A.5.3 chain executes; `FAILED_INFRA_UNRECOVERABLE` is still reachable for genuine infra failures (A.5.2 HALT list unchanged).
- **AC-A5 (PRD AC-7):** Step A.5.0's structural shape (re-read note, absent/empty branch with log entry + proceed, non-empty fall-through) is symmetric to A.3.5.0's shape — confirmed by side-by-side grep of both step blocks showing identical three-part structure with substituted key names.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The `Edit` insertion of A.5.0 accidentally truncates or merges with A.5.1's body, breaking the command-exists check for framework-declared projects | L | H | Task 2 VALIDATE grep explicitly checks that Step A.5.1 and the "Command-exists check" text are still present and below A.5.0; Level 2 CONTENT_INVARIANTS checks FAILED_INFRA_UNRECOVERABLE still present in A.5.2 |
| The new A.5.0 step fires for projects with `test_frameworks: ["pytest"]` (false positive on the framework-declared path) | L | H | Task 1 explicitly codes the branch condition as `test_frameworks: []` (empty list) OR file-absent; non-empty list falls through; AC-A4 tests this boundary |
| Documentation note on the contradictory path is placed incorrectly (before A.5.3 instead of after) | M | L | Task 3 VALIDATE grep targets `structurally impossible` and the implementer confirms placement is after the A.5.3 HALT block |
| Collateral damage to the A.3.5.0 block or other Phase A.5 content during the Edit operation | L | M | Level 2 CONTENT_INVARIANTS checks `skipped_tdd_false` (A.3.5.0 unchanged) and full step sequence A.5.0→A.5.1→A.5.2→A.5.3 |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Symmetry note:** A.5.0 is to Phase A.5 what A.3.5.0 is to Phase A.3.5 — identical structural relationship: a methodology.md re-read gate that self-skips the entire sub-flow on the inactive-framework case and falls through on the active case. The log entry shape (`{"phase": <N>, "stage": "<stage>", "outcome": "skipped_<reason>"}`) is the same family.

**Dogfood-B impossibility argument:** After this phase, a framework-less project can only exit Phase A.5 via the A.5.0 branch → Phase A.6 → `ALL_PHASES_COMPLETE`. A framework-declared project that encounters genuine infra failure exits Phase A.5 via the A.5.2 HALT block → `FAILED_TEST_<code>` → orchestrator HALT. The two paths are now mutually exclusive at the structural level; the dogfood-B scenario (framework-less → `FAILED_INFRA_UNRECOVERABLE` → `ALL_PHASES_COMPLETE`) requires both branches to fire simultaneously, which is impossible.

**Phase 1 dependency:** Phase 1 is complete (plan archived at `PRPs/plans/completed/test-frameworks-empty-self-skip-phase-1-relay-test-phase-0-gate.plan.md`). The command-level gate in `/relay-test` Phase 0 and the orchestrator-level gate in `/relay-execute` Phase A.5.0 together form the dual-layer fix described in the PRD Architecture Notes. Neither gate alone is sufficient — Phase 2 is the orchestrator half.

*Generated: 2026-05-12*
*Approved: 2026-05-12*
*Implemented: 2026-05-12*
*Status: IMPLEMENTED*
