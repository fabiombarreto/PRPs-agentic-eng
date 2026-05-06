# Feature: /relay-execute integration (Phase 3 of tdd-writer-reviewer)

```
**Decision Gate**
- Active context: none
- Activated criteria: amends the orchestrator command file; introduces a new HALT code; adds a new orchestrator-level retry budget; reverses the dead-code branch shipped in v0.9.0
- Decisions found:
  - 2026-05-01 D7 dispatch model — inline command-protocol adoption via Read
  - 2026-05-01 D6 state machine — PRD Implementation Phases table
  - 2026-05-01 D3 per-stage retry budget composition — orchestrator owns session-level budgets
  - 2026-04-19 Command surface — `/relay-tdd` and `/relay-tdd-review` slots
  - 2026-04-19 Interactivity boundary — TDD pair runs autonomously
- Applicable anti-patterns:
  - Logic duplication across command files — orchestrator references each command file by path; never pastes steps
  - Bypassing the writer/reviewer split — orchestrator dispatches existing pairs; never bundles
- Applicable architectural rules:
  - The TDD pair slots BETWEEN `/relay-plan-review` and `/relay-implement` (per PRD User Flow)
  - `tdd: false` and missing `methodology.md` paths are silent self-skip (current behavior preserved as live no-op)
  - HALT code semantics distinct: `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` ≠ existing seven HALT codes
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/tdd-writer-reviewer.prd.md` — Implementation Phases row 3: "/relay-execute integration" — Goal: replace the dead-code routing branch in `relay-execute.md` with a live orchestrator-level loop that adopts `/relay-tdd` and `/relay-tdd-review` protocols inline (per D7) — Success signal: AC-10 passes both branches (`tdd: true` and `tdd: false`); AC-9 emits the HALT code on forced double-CHANGES_REQUESTED; AC-11 confirms zero R-X disputes.

## Summary

Surgically amend `plugins/relay/commands/relay-execute.md` to replace the v0.9.0 dead-code TDD routing branch with a live integration. Introduce a new orchestrator-level retry budget `max_tdd_review_retries=2`, a new Phase A.3.5 (`Per-phase TDD sub-flow`) between A.3 (plan-review) and A.4 (implement), a new HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` in the orchestrator-halt schema, and rewrite hard-rule 9 from "do not invoke /relay-tdd" to "loop bounded by max_tdd_review_retries". The amendment is minimally invasive — every existing line that references the non-TDD path remains intact; only the TDD-specific dead-code is replaced with live code.

## User Story

```
As the relay maintainer running `/relay-execute` against a phoenix or sisalfa worktree with tdd: true
I want the orchestrator to invoke /relay-tdd then /relay-tdd-review automatically between plan-review and implement
So that the implementer never sees test files in scope (R-X strict preserved) and the pipeline traverses end-to-end without manual fallback
```

## Problem Statement

`/relay-execute` v0.9.0 ships with a dead-code branch at `relay-execute.md:141-154` that emits a "TDD routing reserved but unshipped" note when `tdd: true` and proceeds with the non-TDD path — ignoring the just-shipped B7/B8 agents and `/relay-tdd*` commands. Hard-rule 9 (line 507) explicitly forbids invoking `/relay-tdd`. Without Phase 3, every `/relay-execute` invocation against `tdd: true` projects bypasses the trilho TDD entirely.

## Solution Statement

Five surgical edits to `relay-execute.md`:
1. Rewrite P5's `tdd: true` branch (lines 145-152) from dead-code note to live integration note pointing at the new Phase A.3.5.
2. Add `max_tdd_review_retries = 2` (0 forbidden) to Phase A.0's budget block.
3. Insert a new Phase A.3.5 between A.3 and A.4 with the B7↔B8 retry loop using D7 dispatch.
4. Extend the orchestrator-halt schema in A.3.5 to include `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`.
5. Rewrite hard-rule 9 from "do not invoke /relay-tdd" to "loop bounded by max_tdd_review_retries; HALT FAILED_TDD_REVIEW_BUDGET_EXCEEDED on exhaustion".

## Metadata

| Key | Value |
|---|---|
| Type | Surgical command-file amendment |
| Complexity | Medium — five Edits in lock-step |
| Systems Affected | `plugins/relay/commands/relay-execute.md` |
| Dependencies | Phase 1 + Phase 2 complete (B7/B8 + commands + fixture exist) |
| Estimated Tasks | 5 (one Edit each) + 1 validation sweep |
| Source PRD line ref | `PRPs/prds/tdd-writer-reviewer.prd.md:200` |

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| HIGH | `plugins/relay/commands/relay-execute.md` | 141-154, 167-220, 237-340, 495-507 | The five surgical-edit anchor points |
| HIGH | `PRPs/prds/tdd-writer-reviewer.prd.md` | 96–110 | AC-9, AC-10, AC-11 — the contract Phase 3 satisfies |
| HIGH | `plugins/relay/commands/relay-tdd.md` | (whole file) | Adopted inline in the new A.3.5 |
| HIGH | `plugins/relay/commands/relay-tdd-review.md` | (whole file) | Adopted inline in the new A.3.5 |
| MED | `plugins/relay/commands/relay-execute.md` | 237-294 (Phase A.3) | Structural template for A.3.5 (retry loop with budget) |

## Patterns to Mirror

### # SOURCE: plugins/relay/commands/relay-execute.md:237-294 (Phase A.3 plan-review retry loop)

The B7↔B8 loop in A.3.5 mirrors A.3's structure exactly:
- adopt writer command via Read
- adopt reviewer command via Read
- on APPROVED → append to orchestrator_run_log → proceed
- on CHANGES_REQUESTED → capture feedback → increment counter → if exceeds budget, write halt.json + HALT; else loop back

Used by Task 3 to compose A.3.5 with `max_tdd_review_retries=2` and HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`.

### # SOURCE: plugins/relay/commands/relay-execute.md:171-181 (Phase A.0 budget initialization)

```
- `max_plan_review_retries = 2` (0 forbidden; 3 total plan attempts including the initial)
- `max_orchestrator_minutes = 240` (session-level wall-clock; 0 forbidden)
```

Used by Task 2: append `max_tdd_review_retries = 2` (0 forbidden; 3 total TDD-write attempts including the initial) right after `max_plan_review_retries`.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/commands/relay-execute.md` | UPDATE | The orchestrator amendment — five surgical Edits |

## NOT Building (Scope Limits)

- **Phase 4 docs/manifest** — `documentation/`, `plugin.json`, `decisions.md`, `changelog.html` all untouched.
- **Phase 5 dogfood** — out-of-orchestrator; runs from external repos.
- **Modifying B7/B8 agents or `/relay-tdd*` commands** — those are Phase 1 deliverables; Phase 3 only consumes them.
- **Updating `relay-execute.prd.md` D5 entry** — separate concern; the source PRD evolution lives in that PRD's own update process. Phase 3 ships only the command-file amendment.

## Step-by-Step Tasks

### Task 1: UPDATE P5 routing note (lines 145–152)

- **ACTION**: Edit the `tdd: true` branch of P5 to replace the dead-code note with a live integration note. The new text says: "Proceeding with the TDD path: /relay-plan → /relay-plan-review → /relay-tdd → /relay-tdd-review → /relay-implement → /relay-test → /relay-test-review."
- **MIRROR**: structural shape preserved; only the message body changes.
- **VALIDATE**: `! grep -q 'dead code in /relay-execute MVP' plugins/relay/commands/relay-execute.md && grep -q 'Proceeding with the TDD path' plugins/relay/commands/relay-execute.md`

### Task 2: UPDATE Phase A.0 to add `max_tdd_review_retries`

- **ACTION**: Edit Phase A.0's budget block to insert `max_tdd_review_retries = 2 (0 forbidden; 3 total TDD-write attempts including the initial)` after the `max_plan_review_retries` line.
- **MIRROR**: same shape as `max_plan_review_retries`.
- **VALIDATE**: `grep -q 'max_tdd_review_retries = 2' plugins/relay/commands/relay-execute.md`

### Task 3: INSERT Phase A.3.5 between A.3 and A.4

- **ACTION**: Insert a new section `### Phase A.3.5 — Per-phase TDD sub-flow (tdd-review retry loop)` immediately before `### Phase A.4 — Per-phase implement sub-flow`. The new section:
  - Step A.3.5.0 — methodology.md gate: read `tdd:`. If `tdd: false` or missing → skip A.3.5 entirely, append `{phase, stage:"tdd", outcome:"skipped_tdd_false"}` to orchestrator_run_log, proceed to A.4.
  - Step A.3.5.1 — adopt `/relay-tdd` via Read of `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-tdd.md`. Pass `prior_feedback` (null on first attempt; B8 JSONL line on retries).
  - Step A.3.5.2 — adopt `/relay-tdd-review` via Read of `${CLAUDE_PLUGIN_ROOT}/plugins/relay/commands/relay-tdd-review.md`. On APPROVED, append to orchestrator_run_log and proceed to A.4. On CHANGES_REQUESTED, increment `tdd_review_attempts`; if `> max_tdd_review_retries`, HALT with `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` (write `orchestrator-halt.json` with the structured failure state); else loop back to A.3.5.1 with the captured feedback.
  - Halt message format: `FAILED_TDD_REVIEW_BUDGET_EXCEEDED. /relay-execute exhausted TDD-review retries for phase <N> (max_tdd_review_retries=2, attempts=<n>). Failing rubric items: <list>. Suite manifest left at *Status: DRAFT* at <suite_path>. Halt state at PRPs/reports/<feature>/orchestrator-halt.json. Manual recovery: tighten the PRD ACs (likely AMBIGUOUS root cause) or hand-edit the suite, then re-run /relay-execute.`
- **MIRROR**: `plugins/relay/commands/relay-execute.md:237-294` (A.3 plan-review retry loop) — structural twin.
- **VALIDATE**: `grep -q '^### Phase A.3.5' plugins/relay/commands/relay-execute.md && grep -q 'FAILED_TDD_REVIEW_BUDGET_EXCEEDED' plugins/relay/commands/relay-execute.md && grep -q 'tdd_review_attempts' plugins/relay/commands/relay-execute.md`

### Task 4: UPDATE the orchestrator-run.json schema in A.6 to include `max_tdd_review_retries`

- **ACTION**: Edit the JSON schema example in Phase A.6 (line 457-458 area) and the success-path summary (line 203-204 area) to include `"max_tdd_review_retries": 2` alongside the other budgets.
- **MIRROR**: same shape as the existing `max_plan_review_retries` and `max_orchestrator_minutes` keys.
- **VALIDATE**: `test 2 -le $(grep -c '"max_tdd_review_retries"' plugins/relay/commands/relay-execute.md)`

### Task 5: UPDATE hard-rule 9

- **ACTION**: Replace hard-rule 9 (line 507) from "Never invoke /relay-tdd or any TDD-track command" to: "When `tdd: true`, the orchestrator invokes `/relay-tdd` and `/relay-tdd-review` in Phase A.3.5 with budget `max_tdd_review_retries=2`; on budget exhaustion, HALT with `FAILED_TDD_REVIEW_BUDGET_EXCEEDED`. When `tdd: false` or `methodology.md` is missing, A.3.5 self-skips silently per AC-10."
- **MIRROR**: hard-rule shape preserved; only body changes.
- **VALIDATE**: `! grep -q 'Never invoke /relay-tdd' plugins/relay/commands/relay-execute.md && grep -q 'budget `max_tdd_review_retries=2`' plugins/relay/commands/relay-execute.md`

### Task 6: Phase boundary sweep

- **ACTION**: confirm no Phase 4 work — `documentation/` HTML, `plugin.json`, `docs/decisions.md`, `changelog.html` all unchanged.
- **MIRROR**: same negative-space pattern as Phase 1 Task 5 / Phase 2 Task 4.
- **VALIDATE**: `git diff --quiet plugins/relay/.claude-plugin/plugin.json && git diff --quiet docs/decisions.md && (git diff --name-only HEAD | grep -E '^documentation/.*\.html$'; test $? -eq 1)`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```sh
test -f plugins/relay/commands/relay-execute.md
head -1 plugins/relay/commands/relay-execute.md | grep -q '^---$'
echo "L1 PASS"
```

### Level 2 — CONTENT_INVARIANTS

```sh
# Dead-code references gone
! grep -q 'dead code in /relay-execute MVP' plugins/relay/commands/relay-execute.md
! grep -q 'Never invoke /relay-tdd' plugins/relay/commands/relay-execute.md

# Live integration markers present
grep -q 'Proceeding with the TDD path' plugins/relay/commands/relay-execute.md
grep -q 'max_tdd_review_retries = 2' plugins/relay/commands/relay-execute.md
grep -q '^### Phase A.3.5' plugins/relay/commands/relay-execute.md
grep -q 'FAILED_TDD_REVIEW_BUDGET_EXCEEDED' plugins/relay/commands/relay-execute.md
grep -q 'tdd_review_attempts' plugins/relay/commands/relay-execute.md

# Phase ordering preserved (A.3 before A.3.5 before A.4)
awk '/^### Phase A\.3 /{a=NR} /^### Phase A\.3\.5/{b=NR} /^### Phase A\.4 /{c=NR} END{exit !(a<b && b<c)}' plugins/relay/commands/relay-execute.md
echo "L2 PASS"
```

### Level 3 — DRY-RUN END-TO-END

```sh
# Phase 4 boundary preserved
git diff --quiet plugins/relay/.claude-plugin/plugin.json
git diff --quiet docs/decisions.md
git diff --name-only HEAD | grep -E '^documentation/.*\.html$' && exit 1 || true
echo "L3 PASS"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-9):** new HALT code `FAILED_TDD_REVIEW_BUDGET_EXCEEDED` is present and emitted on `tdd_review_attempts > max_tdd_review_retries`.
- **AC-A2 (PRD AC-10):** Phase A.3.5 self-skips when `tdd: false` or missing; invokes the B7↔B8 loop when `tdd: true`.
- **AC-A3 (PRD AC-11):** A.3.5 runs strictly BEFORE A.4 — confirmed by section ordering invariant in L2.
- **AC-A4 (PRD MoSCoW Won't):** the only file modified by this phase is `plugins/relay/commands/relay-execute.md`. No `documentation/`, `plugin.json`, or `decisions.md` mutations.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Edit to lines 141-154 fails because exact line numbers drift between Phase 1 commits and Phase 3 | M | M | Use full-line `old_string` for each Edit; never line-number-anchored |
| New Phase A.3.5 inserted at wrong location (after A.4 instead of before) | L | H | L2 has explicit awk ordering check |
| `max_tdd_review_retries` only added to A.0 but not to A.6 schema | L | M | Task 4 explicitly handles both occurrences; L2 grep -c ≥2 |
| Hard-rule 9 replaced but constraints list breaks numbering | L | L | Edit replaces only the rule-9 paragraph body; "9." prefix and following rules untouched |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Decision evolution:** the `relay-execute.prd.md` D5 entry ("never invoke /relay-tdd in MVP") is now superseded by this PRD. The original PRD is APPROVED and out of scope for re-authoring (per `prd-reviewer` `already_approved` precondition); the supersession is recorded only in this plan's Decisions Log + the source PRD's own Decisions Log when this work lands.

**Live no-op for `tdd: false`:** the `tdd: false` path is a *live* no-op in A.3.5 — no longer dead code, but functionally equivalent to the previous behavior (skip TDD, proceed to implement). The L2 invariant on dead-code-marker absence proves the live conversion.

*Generated: 2026-05-06*
*Approved: 2026-05-06*
*Implemented: 2026-05-06*
*Status: IMPLEMENTED*
