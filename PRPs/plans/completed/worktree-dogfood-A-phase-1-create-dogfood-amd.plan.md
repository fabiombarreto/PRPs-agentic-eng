# Feature: create dogfood-A.md (Phase 1 of worktree-dogfood-A)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: Phase 1 of worktree-dogfood-A; creates no-op markdown file in plugins/relay/commands/dogfood/ as a synthetic test fixture for parallel worktree non-collision validation (AC-16 of relay-worktree.prd.md); no external dependencies; trivially scoped
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
  - relay-worktree D1/D10 slug derivation — worktree at .worktrees/worktree-dogfood-A/, branch feature/worktree-dogfood-A (docs/decisions.md, 2026-05-11)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); PRPs/ artifact paths; graceful fallback to cwd when worktree absent (D8)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/worktree-dogfood-A.prd.md` — Implementation Phases row 1: "create dogfood-A.md" — Goal: create `plugins/relay/commands/dogfood/dogfood-A.md` as evidence the orchestrator pipeline ran end-to-end against Fixture A — Success signal: `plugins/relay/commands/dogfood/dogfood-A.md` exists; its first (and only) non-empty line is `# Dogfood A`.

## Summary

Create a single no-op markdown file at `plugins/relay/commands/dogfood/dogfood-A.md` containing only the heading `# Dogfood A`. This trivial deliverable serves as observable evidence that the `/relay-execute` orchestrator successfully ran Phase 1 of the worktree-dogfood-A fixture PRD through the plan → plan-review → implement pipeline, and specifically that it ran in a non-colliding worktree at `.worktrees/worktree-dogfood-A/` on branch `feature/worktree-dogfood-A`.

## User Story

```
As the relay pipeline developer
I want Phase 1 of the worktree-dogfood-A fixture PRD to create dogfood-A.md
So that I have observable evidence that /relay-execute ran Phase 1 end-to-end
in its own non-colliding worktree (validating AC-16 of relay-worktree.prd.md)
```

## Problem Statement

The relay-worktree feature (Phase 4 synthetic dogfood, AC-16 of `PRPs/prds/relay-worktree.prd.md`) requires two independently runnable fixture PRDs to validate parallel non-collision. Fixture A (this PRD) must produce an observable artifact (`dogfood-A.md`) that proves the pipeline ran end-to-end without cross-contaminating Fixture B's worktree or branch. Phase 1 needs the simplest possible implementation — one new markdown file — so the focus is on pipeline machinery, not domain logic.

## Solution Statement

Create `plugins/relay/commands/dogfood/dogfood-A.md` with exactly one line: `# Dogfood A`. The directory `plugins/relay/commands/dogfood/` already exists from prior dogfood runs (dogfood-file-1.md and dogfood-file-2.md are present). No other files are created or modified.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Implementation — file creation |
| Complexity | Trivial — one new file, one line of content |
| Systems Affected | `plugins/relay/commands/dogfood/dogfood-A.md` (CREATE) |
| Dependencies | None |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/worktree-dogfood-A.prd.md` Implementation Phases row 1 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `PRPs/prds/worktree-dogfood-A.prd.md` | full | Source PRD; Phase 1 Phase Details and success signal |
| 1 | `plugins/relay/commands/dogfood/dogfood-file-1.md` | 1 | Canonical shape of a no-op dogfood fixture file |
| 2 | `PRPs/plans/completed/relay-execute-dogfood-phase-1-create-dogfood-file-1md.plan.md` | 84-110 | Predecessor plan — three-task structure for trivial file creation |

## Patterns to Mirror

### Pattern 1 — No-op markdown dogfood file shape

```
# SOURCE: plugins/relay/commands/dogfood/dogfood-file-1.md:1
# Dogfood file 1
```

The no-op markdown file contains exactly one H1 heading line and nothing else. `dogfood-A.md` mirrors this exactly, substituting `# Dogfood A` as the heading. Task 2 copies this pattern.

### Pattern 2 — Three-task structure for trivial file creation

```
# SOURCE: PRPs/plans/completed/relay-execute-dogfood-phase-1-create-dogfood-file-1md.plan.md:84-110
### Task 1: Create directory ... (mkdir -p / idempotent)
### Task 2: Create dogfood-file-1.md (Write the file)
### Task 3: Verify file content integrity (read back and confirm)
```

Tasks 1–3 below mirror this three-task pattern. Task 3 copies the verifier approach.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/dogfood/dogfood-A.md` | CREATE | Phase 1 deliverable — no-op markdown file as Fixture A pipeline evidence |

## NOT Building (Scope Limits)

- Any content other than the single heading `# Dogfood A`.
- Any changes to `dogfood-file-1.md`, `dogfood-file-2.md`, or any other existing file.
- Any plugin registration or manifest updates.
- Worktree creation or cleanup — that is `/relay-worktree`'s responsibility (Pillar 3 owns removal).
- TDD integration — `tdd: false`; no test suite for this fixture.
- Multi-PRD orchestration — this is a single-PRD, single-phase fixture.

## Step-by-Step Tasks

### Task 1: Ensure directory `plugins/relay/commands/dogfood/` exists

**ACTION**: Verify the directory exists; create it if absent. The directory already exists (dogfood-file-1.md and dogfood-file-2.md are present), so this is effectively a no-op guard.

**MIRROR**: Pattern 2 (Task 1 of predecessor plan — idempotent directory guard before file write).

**VALIDATE**: `test -d plugins/relay/commands/dogfood/ && echo "directory OK"`

### Task 2: Create `plugins/relay/commands/dogfood/dogfood-A.md`

**ACTION**: Write the file at `plugins/relay/commands/dogfood/dogfood-A.md` using the `Write` tool with exactly the following content:
```
# Dogfood A
```
One line only. No trailing content beyond a single newline.

**MIRROR**: Pattern 1 (single H1 heading, nothing else — mirrors dogfood-file-1.md shape exactly).

**VALIDATE**: `test -f plugins/relay/commands/dogfood/dogfood-A.md && head -1 plugins/relay/commands/dogfood/dogfood-A.md | grep -c '# Dogfood A'`

### Task 3: Verify file content integrity

**ACTION**: Read `plugins/relay/commands/dogfood/dogfood-A.md` and confirm it contains exactly `# Dogfood A` as its first non-empty line. Confirm no extra content was written beyond the heading line.

**MIRROR**: Pattern 2 (Task 3 of predecessor plan — read-back verification of heading-only content).

**VALIDATE**: `python3 -c "content=open('plugins/relay/commands/dogfood/dogfood-A.md').read(); assert content.strip() == '# Dogfood A', f'Unexpected content: {repr(content)}'; print('content OK')"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify file exists
test -f plugins/relay/commands/dogfood/dogfood-A.md && echo "file exists"

# Verify heading line is correct
head -1 plugins/relay/commands/dogfood/dogfood-A.md
```

### Level 2 — CONTENT_INVARIANTS

```bash
# Verify the heading matches exactly
grep -c '^# Dogfood A$' plugins/relay/commands/dogfood/dogfood-A.md

# Verify no .claude/ path violations
ls plugins/relay/commands/dogfood/ | grep -v '\.claude' && echo "path OK"
```

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

```bash
# Verify directory structure
ls plugins/relay/commands/dogfood/

# Verify file content is byte-exact
python3 -c "content=open('plugins/relay/commands/dogfood/dogfood-A.md').read(); assert content.strip() == '# Dogfood A', f'Unexpected content: {repr(content)}'; print('content OK')"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given Phase 1 runs, when `/relay-implement` completes, then `plugins/relay/commands/dogfood/dogfood-A.md` exists with `# Dogfood A` as its sole content line; the Phase 1 row in the source PRD's Implementation Phases table shows `complete`; the Phase 1 plan is archived under `PRPs/plans/completed/`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| File content written with wrong heading text | Very Low | Low | Level 2 grep verification catches wrong content immediately |
| Directory absent (prior dogfood runs not yet executed) | Very Low | Low | Task 1 guard creates directory if needed; idempotent |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
- This plan is intentionally trivial. Its sole purpose is to provide the `/relay-execute` worktree-dogfood-A fixture with a known-simple Phase 1 deliverable that exercises the full pipeline without plan-review defects.
- The `plugins/relay/commands/dogfood/` directory is already populated with `dogfood-file-1.md` and `dogfood-file-2.md` from prior dogfood runs; no directory creation is needed in practice.

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Status: IMPLEMENTED*
