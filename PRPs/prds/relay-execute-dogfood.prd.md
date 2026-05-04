# relay-execute Dogfood — Synthetic Test PRD

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: synthetic dogfood PRD for /relay-execute validation; creates no-op markdown files in a new plugins/relay/commands/dogfood/ directory; no external dependencies; trivial phases purpose-built for orchestrator testing
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - Interactivity boundary: PRD interactive, downstream autonomous (docs/decisions.md, 2026-04-19)
  - Command surface writer/reviewer split (docs/decisions.md, 2026-04-19)
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66)
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary at PRD approval; PRPs/ artifact paths; writer/reviewer split preserved by orchestrator
- Result: PROCEED
```

## Problem Statement

The `/relay-execute` orchestrator (shipped Phase 1) needs empirical validation that its D7 inline command-protocol adoption model composes cleanly end-to-end. This synthetic PRD provides a minimal 2-phase test fixture — each phase creates one no-op markdown file in `plugins/relay/commands/dogfood/` — purpose-built to validate the happy path, HALT path, and idempotency scenarios described in the relay-execute Phase 2 dogfood plan.

## Evidence

- `plugins/relay/commands/relay-execute.md` Phase A.3–A.4 specifies inline adoption of `/relay-plan`, `/relay-plan-review`, and `/relay-implement` protocols via Read — a novel pattern with zero codebase precedent as of 2026-05-01.
- Phase 2 of `PRPs/prds/relay-execute.prd.md` identifies this dogfood as the first validation of the D7 dispatch model.
- Success signal: all three scenarios (happy path, HALT path, idempotency) behave per AC-1, AC-2, AC-6 of the source PRD.

## Proposed Solution

Two trivial phases, each creating one no-op markdown file in `plugins/relay/commands/dogfood/`. Phase 1 has no dependencies; Phase 2 depends on Phase 1. The trivial scope means well-formed plans should be APPROVED on the first attempt (happy path), making defect injection (HALT path) easily controlled.

## Key Hypothesis

A 2-phase APPROVED PRD with trivial, self-contained deliverables will allow the `/relay-execute` orchestrator to complete all phases — plan → plan-review → implement — without user dialogue, producing observable artifacts (`dogfood-file-1.md`, `dogfood-file-2.md`, plans archived, orchestrator-run.json) as evidence the D7 dispatch model composes cleanly.

## What We're NOT Building

- Complex implementation logic — phases create no-op markdown files only.
- External service dependencies — no API calls, no database, no framework.
- TDD integration — `tdd: false`; no test suite expected.
- Multi-PRD orchestration — this is a single-PRD fixture.

## Success Metrics

| Metric | Target |
|--------|--------|
| Happy path completion | Both phases reach `complete`; `orchestrator-run.json` has `"outcome": "ALL_PHASES_COMPLETE"` |
| HALT path validation | `orchestrator-halt.json` has `"outcome": "FAILED_PLAN_REVIEW_BUDGET_EXCEEDED"` with `"plan_review_attempts": 3` |
| Idempotency | Re-invocation after partial completion picks up at Phase 2; third invocation exits with AC-6 message |

## Acceptance Criteria (test scenarios)

- **AC-1:** Given `/relay-execute PRPs/prds/relay-execute-dogfood.prd.md` runs against this PRD, when Phase 1 plan is APPROVED and implemented, then `plugins/relay/commands/dogfood/dogfood-file-1.md` exists with a `# Dogfood file 1` heading, the Phase 1 row shows `complete` in the Implementation Phases table, and the Phase 1 plan is archived under `PRPs/plans/completed/`.

- **AC-2:** Given Phase 1 is `complete` (Depends satisfied), when Phase 2 runs, then `plugins/relay/commands/dogfood/dogfood-file-2.md` exists with a `# Dogfood file 2` heading, the Phase 2 row shows `complete`, and the Phase 2 plan is archived under `PRPs/plans/completed/`.

## Technical Approach

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — no test suite for this dogfood fixture.

### Architecture Notes

- Each phase's deliverable is a single no-op markdown file with one heading line — the simplest possible implementation that still exercises the full plan → plan-review → implement pipeline.
- The `plugins/relay/commands/dogfood/` directory is created by Phase 1's implementation; Phase 2 adds a second file to the same directory.
- No cleanup is required post-dogfood; the files are intentional artifacts committed as evidence.

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | create dogfood-file-1.md | Create `plugins/relay/commands/dogfood/dogfood-file-1.md` as a no-op markdown file with a single `# Dogfood file 1` heading. | complete | - | - | PRPs/plans/relay-execute-dogfood-phase-1-create-dogfood-file-1md.plan.md |
| 2 | create dogfood-file-2.md | Create `plugins/relay/commands/dogfood/dogfood-file-2.md` as a no-op markdown file with a single `# Dogfood file 2` heading. | complete | - | 1 | PRPs/plans/relay-execute-dogfood-phase-2-create-dogfood-file-2md.plan.md |

### Phase Details

**Phase 1: create dogfood-file-1.md**
- **Goal:** create `plugins/relay/commands/dogfood/dogfood-file-1.md` as evidence Phase 1 of the orchestrator pipeline ran end-to-end.
- **Scope:** one new file at `plugins/relay/commands/dogfood/dogfood-file-1.md` with content `# Dogfood file 1` and nothing else. Directory `plugins/relay/commands/dogfood/` is created if absent.
- **Success signal:** `plugins/relay/commands/dogfood/dogfood-file-1.md` exists; its first (and only) non-empty line is `# Dogfood file 1`.

**Phase 2: create dogfood-file-2.md**
- **Goal:** create `plugins/relay/commands/dogfood/dogfood-file-2.md` after Phase 1 completes, confirming dependency re-evaluation (AC-12 of source PRD).
- **Scope:** one new file at `plugins/relay/commands/dogfood/dogfood-file-2.md` with content `# Dogfood file 2` and nothing else. The `Depends: 1` cell is satisfied when Phase 1 is `complete`.
- **Success signal:** `plugins/relay/commands/dogfood/dogfood-file-2.md` exists; its first (and only) non-empty line is `# Dogfood file 2`; Phase 1 `Status` is `complete` at the time Phase 2 is picked by the orchestrator.

---

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Status: APPROVED*
