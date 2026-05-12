# Feature: create dogfood-A.md (Phase 1 of worktree-dogfood-A)

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new file in the relay plugin repo (plugins/relay/commands/dogfood/dogfood-A.md); simple file-creation phase with no cross-cutting architectural impact; PRP artifact paths convention applies
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19) — plan lives at PRPs/plans/, implementation artifact lives at plugins/relay/commands/dogfood/
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
  - Interactivity boundary: PRD interactive, downstream autonomous (docs/decisions.md, 2026-04-19)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66)
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); interactivity boundary at PRD approval; PRPs/ artifact paths; writer/reviewer split preserved by orchestrator
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/worktree-dogfood-A.prd.md` — Implementation Phases row 1:
  "create dogfood-A.md" — Goal: create `plugins/relay/commands/dogfood/dogfood-A.md` as evidence the orchestrator pipeline ran end-to-end against Fixture A — Success signal: `plugins/relay/commands/dogfood/dogfood-A.md` exists; its first (and only) non-empty line is `# Dogfood A`.

## Summary

Phase 1 delivers a single no-op markdown file at `plugins/relay/commands/dogfood/dogfood-A.md` with a single `# Dogfood A` heading. This trivial artifact serves as observable evidence that the `/relay-execute` orchestrator pipeline ran end-to-end against Fixture A of the relay-worktree AC-16 parallel-non-collision dogfood validation.

## User Story

As a relay developer running Phase 4 dogfood validation,
I want `/relay-execute PRPs/prds/worktree-dogfood-A.prd.md` to produce `plugins/relay/commands/dogfood/dogfood-A.md`,
So that I have observable proof the full plan→plan-review→worktree→implement pipeline completed successfully for Fixture A.

## Problem Statement

The relay-worktree feature (Phase 4 synthetic dogfood) requires two independently runnable fixture PRDs to validate parallel non-collision (AC-16 of `PRPs/prds/relay-worktree.prd.md`). Fixture A needs to create a distinguishable artifact (`dogfood-A.md`, not `dogfood-B.md`) so post-run inspection can confirm both pipelines ran without cross-contamination.

## Solution Statement

Create `plugins/relay/commands/dogfood/dogfood-A.md` containing exactly one non-empty line: `# Dogfood A`. If the `plugins/relay/commands/dogfood/` directory does not exist, create it first. No other files are created or modified.

## Metadata

| Field | Value |
|-------|-------|
| Type | File creation |
| Complexity | Trivial (1 file, 1 line) |
| Systems Affected | `plugins/relay/commands/dogfood/` |
| Dependencies | None |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/worktree-dogfood-A.prd.md` Phase Details §Phase 1 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| HIGH | `plugins/relay/commands/dogfood/dogfood-B.md` | 1 | Sibling fixture file — exact parallel pattern for Fixture A |
| HIGH | `plugins/relay/commands/dogfood/dogfood-file-1.md` | 1 | Existing dogfood file — confirms single-heading convention |
| MEDIUM | `PRPs/prds/worktree-dogfood-A.prd.md` | 108–112 | Phase Details block defining the exact success signal |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/dogfood/dogfood-B.md:1
# Dogfood B
```
Task 2 mirrors this exact shape for Fixture A: `# Dogfood A`.

```
# SOURCE: plugins/relay/commands/dogfood/dogfood-file-1.md:1
# Dogfood file 1
```
Confirms single-line heading convention used by all dogfood fixtures.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/dogfood/dogfood-A.md` | CREATE | Observable artifact proving the pipeline ran end-to-end; mirrors dogfood-B.md shape |

## NOT Building (Scope Limits)

- Complex implementation logic — this phase creates a single no-op markdown file only
- External service dependencies — no API calls, no database, no framework
- TDD test suite — `tdd: false` per methodology.md; no test suite expected
- Multi-file creation — only `dogfood-A.md` is in scope for this phase
- Worktree cleanup — out of scope per relay-worktree.prd.md Won't items; Pillar 3 owns removal

## Step-by-Step Tasks

### Task 1: VERIFY plugins/relay/commands/dogfood/ directory exists

**ACTION**: Confirm the `plugins/relay/commands/dogfood/` directory exists; create it if absent using `mkdir -p` or equivalent. The directory likely already exists from prior dogfood runs.

**MIRROR**: Pattern from `plugins/relay/commands/dogfood/dogfood-B.md` — sibling file exists in this directory.

**VALIDATE**: `Test-Path plugins/relay/commands/dogfood/` (PowerShell) — must return True.

### Task 2: CREATE plugins/relay/commands/dogfood/dogfood-A.md

**ACTION**: Write the file `plugins/relay/commands/dogfood/dogfood-A.md` with exactly this content:

```
# Dogfood A
```

The file must contain exactly one non-empty line. No trailing content beyond the heading.

**MIRROR**: `plugins/relay/commands/dogfood/dogfood-B.md:1` — `# Dogfood B` is the exact parallel; substitute `A` for `B`.

**VALIDATE**: `Get-Content plugins/relay/commands/dogfood/dogfood-A.md` — must output `# Dogfood A`.

### Task 3: VERIFY content and first-line invariant

**ACTION**: Read `dogfood-A.md` and confirm its first non-empty line is exactly `# Dogfood A`. This is the PRD AC-1 success signal check.

**MIRROR**: Same single-heading convention verified in `dogfood-file-1.md:1` and `dogfood-B.md:1`.

**VALIDATE**: `(Get-Content plugins/relay/commands/dogfood/dogfood-A.md | Where-Object { $_ -ne '' } | Select-Object -First 1) -eq '# Dogfood A'` — must return True.

## Validation Commands

**Level 1 — STATIC_ANALYSIS:**
```powershell
# Verify file exists and is non-empty
Test-Path plugins/relay/commands/dogfood/dogfood-A.md
```

**Level 2 — CONTENT_INVARIANTS:**
```powershell
# Verify first non-empty line is exactly "# Dogfood A"
$line = Get-Content plugins/relay/commands/dogfood/dogfood-A.md | Where-Object { $_ -ne '' } | Select-Object -First 1
if ($line -ne '# Dogfood A') { throw "Content mismatch: got '$line'" }
```

**Level 3 — INTEGRATION (dry-run end-to-end):**
```powershell
# Verify file can be found and has the correct heading for git staging
git status plugins/relay/commands/dogfood/dogfood-A.md
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given Phase 1 is implemented, then `plugins/relay/commands/dogfood/dogfood-A.md` exists on disk.
- **AC-A2 (PRD AC-1):** Given `dogfood-A.md` exists, its first non-empty line is exactly `# Dogfood A`.
- **AC-A3 (PRD AC-1):** Given Phase 1 completes, the Phase 1 row in the Implementation Phases table shows `complete` status.
- **AC-A4 (PRD AC-1):** Given Phase 1 completes, the Phase 1 plan is archived under `PRPs/plans/completed/`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| File already exists from previous run | High | Low | Idempotent write — overwrite with identical content causes no harm; file content is deterministic |
| Directory absent | Low | Low | Task 1 creates directory if absent with `mkdir -p` |
| research-web returned no findings | Certain | None | Internal-only phase; no external patterns needed; dogfood-B.md provides the exact mirror pattern |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

This is a synthetic dogfood fixture plan, not a real feature plan. Its purpose is to exercise the `/relay-execute` pipeline machinery end-to-end with minimal implementation scope, validating that the orchestrator correctly sequences plan→plan-review→worktree→implement→code-review against a trivial deliverable.

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Implemented: 2026-05-11*
*Status: IMPLEMENTED*
