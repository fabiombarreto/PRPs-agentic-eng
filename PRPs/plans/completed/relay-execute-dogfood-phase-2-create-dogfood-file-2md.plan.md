# Feature: create dogfood-file-2.md (Phase 2 of relay-execute-dogfood)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: Phase 2 of relay-execute-dogfood; creates second no-op markdown file in plugins/relay/commands/dogfood/ as orchestrator test fixture; depends on Phase 1 complete
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - PRPs/plans/completed/ is the canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66)
- Applicable architectural rules:
  - Three-pillar Pillar 2 (Implementation); PRPs/ artifact paths
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-execute-dogfood.prd.md` — Implementation Phases row 2: "create dogfood-file-2.md" — Goal: create `plugins/relay/commands/dogfood/dogfood-file-2.md` after Phase 1 completes, confirming dependency re-evaluation — Success signal: `plugins/relay/commands/dogfood/dogfood-file-2.md` exists; its first (and only) non-empty line is `# Dogfood file 2`; Phase 1 Status is `complete` at the time Phase 2 is picked.

## Summary

Create a single no-op markdown file at `plugins/relay/commands/dogfood/dogfood-file-2.md` containing only the heading `# Dogfood file 2`. This trivial deliverable serves as evidence that the `/relay-execute` orchestrator correctly re-evaluated Phase 2's `Depends: 1` dependency after Phase 1 reached `complete`, and ran Phase 2 through the plan → plan-review → implement pipeline.

## User Story

```
As the relay pipeline developer
I want Phase 2 of the dogfood PRD to create dogfood-file-2.md after Phase 1 completes
So that I have observable evidence of dependency re-evaluation (AC-12) and serial orchestration
```

## Problem Statement

After Phase 1 creates `dogfood-file-1.md` and its row flips to `complete`, the orchestrator must re-evaluate the Implementation Phases table and recognize that Phase 2's `Depends: 1` is now satisfied. Phase 2 provides the second artifact needed to confirm this dependency-aware serial orchestration works correctly.

## Solution Statement

Create `plugins/relay/commands/dogfood/dogfood-file-2.md` with exactly one line: `# Dogfood file 2`. The directory already exists from Phase 1. No other files are created or modified.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Implementation — file creation |
| Complexity | Trivial — one new file, one line of content |
| Systems Affected | `plugins/relay/commands/dogfood/dogfood-file-2.md` (CREATE) |
| Dependencies | Phase 1 complete (Phase 1 created `plugins/relay/commands/dogfood/` directory) |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/relay-execute-dogfood.prd.md` Implementation Phases row 2 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `PRPs/prds/relay-execute-dogfood.prd.md` | full | Source PRD; Phase 2 Phase Details |
| 1 | `plugins/relay/commands/dogfood/dogfood-file-1.md` | full | Phase 1 sibling — same file shape |

## Patterns to Mirror

### Pattern 1 — No-op markdown file shape (Phase 1 sibling)

```markdown
# SOURCE: plugins/relay/commands/dogfood/dogfood-file-1.md:1
# Dogfood file 1
```

Phase 2 uses the identical shape: one heading line, nothing else. Substitute `1` → `2`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/dogfood/dogfood-file-2.md` | CREATE | Phase 2 deliverable — no-op markdown file as orchestrator test evidence |

## NOT Building (Scope Limits)

- Any content other than the single heading `# Dogfood file 2`.
- Any changes to `dogfood-file-1.md` — that is Phase 1's deliverable (already complete).
- Any plugin registration or manifest updates.

## Step-by-Step Tasks

### Task 1: Verify Phase 1 prerequisite is satisfied

**ACTION**: Confirm `plugins/relay/commands/dogfood/dogfood-file-1.md` exists (Phase 1 delivered it). Confirm the `plugins/relay/commands/dogfood/` directory exists for Phase 2's file.

**MIRROR**: Pattern 1 (Phase 1 sibling shape — directory and Phase 1 file must exist before Phase 2 file is created).

**VALIDATE**: `test -f plugins/relay/commands/dogfood/dogfood-file-1.md && test -d plugins/relay/commands/dogfood/ && echo "Phase 1 prereq OK"`

### Task 2: Create `plugins/relay/commands/dogfood/dogfood-file-2.md`

**ACTION**: Write the file at `plugins/relay/commands/dogfood/dogfood-file-2.md` with exactly the following content:
```
# Dogfood file 2
```
One line only. No trailing content.

**MIRROR**: Pattern 1 (Phase 1 sibling shape — identical structure with heading `# Dogfood file 2`).

**VALIDATE**: `test -f plugins/relay/commands/dogfood/dogfood-file-2.md && head -1 plugins/relay/commands/dogfood/dogfood-file-2.md | grep -c '# Dogfood file 2'`

### Task 3: Verify file content integrity

**ACTION**: Read `plugins/relay/commands/dogfood/dogfood-file-2.md` and confirm it contains exactly `# Dogfood file 2` as its first non-empty line. Confirm no extra lines beyond the heading were written.

**MIRROR**: Pattern 1 (Phase 1 sibling shape — one line only).

**VALIDATE**: `python3 -c "content=open('plugins/relay/commands/dogfood/dogfood-file-2.md').read(); assert content.strip() == '# Dogfood file 2', f'Unexpected: {repr(content)}'; print('content OK')"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify file exists
test -f plugins/relay/commands/dogfood/dogfood-file-2.md && echo "file exists"

# Verify heading line is correct
head -1 plugins/relay/commands/dogfood/dogfood-file-2.md
```

### Level 2 — CONTENT_INVARIANTS

```bash
# Verify the heading matches exactly
grep -c '^# Dogfood file 2$' plugins/relay/commands/dogfood/dogfood-file-2.md

# Verify both dogfood files exist
test -f plugins/relay/commands/dogfood/dogfood-file-1.md && test -f plugins/relay/commands/dogfood/dogfood-file-2.md && echo "both files OK"
```

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

```bash
# Verify directory contains both files
ls plugins/relay/commands/dogfood/

# Verify file is readable and well-formed markdown
python3 -c "content=open('plugins/relay/commands/dogfood/dogfood-file-2.md').read(); assert content.strip() == '# Dogfood file 2', f'Unexpected content: {repr(content)}'; print('content OK')"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** Given Phase 2 runs after Phase 1 is `complete`, when `/relay-implement` completes, then `plugins/relay/commands/dogfood/dogfood-file-2.md` exists with `# Dogfood file 2` as its sole content line; the Phase 2 row in the source PRD's Implementation Phases table shows `complete`; the Phase 2 plan is archived under `PRPs/plans/completed/`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Phase 1 not complete when Phase 2 runs | Very Low | High | Orchestrator enforces Depends check (AC-12); will not pick Phase 2 until Phase 1 is complete |
| File content written incorrectly | Very Low | Low | Level 2 grep and python3 verification catch wrong content |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
- This plan is intentionally trivial. Its sole purpose is to provide the `/relay-execute` dogfood with a known-simple Phase 2 deliverable that exercises dependency re-evaluation (AC-12 of source PRD).

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Status: IMPLEMENTED*
