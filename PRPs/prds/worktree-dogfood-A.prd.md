# worktree-dogfood-A — Synthetic Test PRD (Fixture A)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: synthetic dogfood PRD for /relay-worktree parallel non-collision validation (AC-16); fixture A of a two-PRD pair designed to run concurrently with worktree-dogfood-B; creates one no-op markdown file in plugins/relay/commands/dogfood/; no external dependencies; trivial phase purpose-built for parallel-worktree testing
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - Interactivity boundary: PRD interactive, downstream autonomous (docs/decisions.md, 2026-04-19) — these fixtures are manually-stamped APPROVED test fixtures, bypassing /relay-prd review
  - D1 worktree path is .worktrees/<feature>/ — this PRD produces slug worktree-dogfood-A, target worktree .worktrees/worktree-dogfood-A/
  - D4 idempotency policy — silent re-use on expected branch feature/worktree-dogfood-A; HALT loud on branch divergence (AC-3 and AC-4 scenarios in dogfood report)
  - D10 branch-name pattern is feature/<feature> — branch will be feature/worktree-dogfood-A
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66)
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary at PRD approval; PRPs/ artifact paths; writer/reviewer split preserved by orchestrator
  - This fixture PRD is manually-stamped APPROVED (not through /relay-prd review) because it is a test fixture, not a real pipeline PRD
- Result: PROCEED
```

## Problem Statement

The relay-worktree feature (Phase 4 synthetic dogfood) requires two independently runnable fixture PRDs to validate parallel non-collision (AC-16 of `PRPs/prds/relay-worktree.prd.md`). This is Fixture A. When `/relay-execute` is invoked against this PRD, it produces slug `worktree-dogfood-A`, creates a worktree at `.worktrees/worktree-dogfood-A/` on branch `feature/worktree-dogfood-A`, and implements one trivial phase (creating `plugins/relay/commands/dogfood/dogfood-A.md`). Running this concurrently with Fixture B (worktree-dogfood-B) validates that two independent pipelines do not collide on branch state, file edits, or worktree paths.

## Evidence

- `PRPs/prds/relay-worktree.prd.md` AC-16: "Given two distinct PRDs at `PRPs/prds/featureA.prd.md` and `PRPs/prds/featureB.prd.md`, when `/relay-execute` is invoked on both within the same minute (in separate shell sessions), then two worktrees `.worktrees/featureA/` and `.worktrees/featureB/` are created on branches `feature/featureA` and `feature/featureB`, and the two pipelines reach their respective terminal states without any cross-contamination."
- Phase 4 of the relay-worktree PRD (`PRPs/prds/relay-worktree.prd.md:213–216`) specifies "author two trivial PRDs ... each with 1 phase; run `/relay-execute` on both in parallel."
- `PRPs/prds/relay-execute-dogfood.prd.md` provides the canonical shape for a synthetic dogfood PRD (Decision Gate block, compact 1-phase Implementation Phases table, manually-stamped APPROVED status).

## Proposed Solution

A single-phase trivial PRD. Phase 1 creates `plugins/relay/commands/dogfood/dogfood-A.md` as a no-op markdown file with heading `# Dogfood A`. The phase is deliberately trivial so the full `/relay-execute` pipeline (plan → plan-review → worktree → implement → code-review → test → pr) runs end-to-end on real pipeline machinery without requiring any domain logic. The slug `worktree-dogfood-A` (PRD basename minus `.prd.md`) determines the worktree path and branch name via D3/D10 slug derivation.

## Key Hypothesis

Running `/relay-execute PRPs/prds/worktree-dogfood-A.prd.md` concurrently with `/relay-execute PRPs/prds/worktree-dogfood-B.prd.md` in two separate shell sessions will produce two non-colliding worktrees (`.worktrees/worktree-dogfood-A/` and `.worktrees/worktree-dogfood-B/`) on two non-colliding branches (`feature/worktree-dogfood-A` and `feature/worktree-dogfood-B`), with zero cross-contamination between the two pipelines.

## What We're NOT Building

- Complex implementation logic — this phase creates a single no-op markdown file only.
- External service dependencies — no API calls, no database, no framework.
- TDD integration — `tdd: false`; no test suite expected.
- Multi-PRD orchestration — this is a single-PRD fixture.
- Worktree cleanup — out of scope per relay-worktree.prd.md Won't items; Pillar 3 owns removal.

## Success Metrics

| Metric | Target |
|--------|--------|
| Phase 1 completion | `plugins/relay/commands/dogfood/dogfood-A.md` exists with `# Dogfood A` heading |
| Worktree creation | `.worktrees/worktree-dogfood-A/` exists in `git worktree list` on branch `feature/worktree-dogfood-A` |
| Non-collision with Fixture B | When run concurrently with worktree-dogfood-B, no cross-contamination on files or branches |

## Acceptance Criteria (test scenarios)

- **AC-1:** Given `/relay-execute PRPs/prds/worktree-dogfood-A.prd.md` runs against this PRD, when Phase 1 plan is APPROVED and implemented, then `plugins/relay/commands/dogfood/dogfood-A.md` exists with a `# Dogfood A` heading as its first line, the Phase 1 row shows `complete` in the Implementation Phases table, and the Phase 1 plan is archived under `PRPs/plans/completed/`.

## Open Questions

None. This is a trivial fixture; all design decisions are inherited from the relay-worktree PRD and the relay-execute-dogfood pattern.

---

## Users & Context

**Primary User:** relay-developer running Phase 4 dogfood validation of the relay-worktree feature.

**Job to Be Done:** Provide a valid, APPROVED `/relay-execute` input fixture that exercises worktree creation for slug `worktree-dogfood-A` and produces an observable artifact (`dogfood-A.md`) as evidence the pipeline ran end-to-end.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Phase 1 creates `plugins/relay/commands/dogfood/dogfood-A.md` | Observable artifact proving the pipeline ran |
| Must | Slug `worktree-dogfood-A` produces worktree at `.worktrees/worktree-dogfood-A/` | Validates D1/D3/D10 slug derivation |

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — no test suite for this dogfood fixture.

---

## Technical Approach

### Architecture Notes

- Single no-op phase: creates one markdown file with one heading line — the simplest possible implementation that still exercises the full plan → plan-review → worktree → implement pipeline.
- The `plugins/relay/commands/dogfood/` directory may already exist from the relay-execute dogfood run; Phase 1 adds `dogfood-A.md` to it.
- No cleanup required post-dogfood; the file is an intentional artifact committed as evidence.

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | create dogfood-A.md | Create `plugins/relay/commands/dogfood/dogfood-A.md` as a no-op markdown file with a single `# Dogfood A` heading. | complete | - | - | PRPs/plans/worktree-dogfood-A-phase-1-create-dogfood-amd.plan.md |

### Phase Details

**Phase 1: create dogfood-A.md**
- **Goal:** create `plugins/relay/commands/dogfood/dogfood-A.md` as evidence the orchestrator pipeline ran end-to-end against Fixture A.
- **Scope:** one new file at `plugins/relay/commands/dogfood/dogfood-A.md` with content `# Dogfood A` and nothing else. Directory `plugins/relay/commands/dogfood/` is created if absent.
- **Success signal:** `plugins/relay/commands/dogfood/dogfood-A.md` exists; its first (and only) non-empty line is `# Dogfood A`.

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Slug derivation | `worktree-dogfood-A` (PRD basename minus `.prd.md`) | Matches D3 slug derivation contract; produces distinct slug from Fixture B (`worktree-dogfood-B`) for AC-16 non-collision |
| Phase count | 1 | Minimal scope for dogfood fixture; fewer phases = faster validation cycle |
| Artifact path | `plugins/relay/commands/dogfood/dogfood-A.md` | Mirrors the relay-execute-dogfood pattern; `dogfood/` subdirectory groups all fixture artifacts |
| TDD routing | `tdd: false` | No test framework in relay repo; fixture purpose is worktree validation, not TDD |

---

## Research Summary

This fixture PRD is not research-driven; it is a test scaffold. All relevant research is documented in `PRPs/prds/relay-worktree.prd.md` Research Summary. Shape derived from `PRPs/prds/relay-execute-dogfood.prd.md` (canonical synthetic dogfood PRD pattern).

---

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Status: APPROVED*
