# Feature: create dogfood-file-1.md (Phase 1 of relay-execute-dogfood)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: Phase 1 of relay-execute-dogfood; creates no-op markdown file in plugins/relay/commands/dogfood/ as a trivial orchestrator test fixture; no external dependencies
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

- `PRPs/prds/relay-execute-dogfood.prd.md` — Implementation Phases row 1: "create dogfood-file-1.md" — Goal: create `plugins/relay/commands/dogfood/dogfood-file-1.md` as evidence Phase 1 of the orchestrator pipeline ran end-to-end — Success signal: `plugins/relay/commands/dogfood/dogfood-file-1.md` exists; its first (and only) non-empty line is `# Dogfood file 1`.

## Summary

Create a single no-op markdown file at `plugins/relay/commands/dogfood/dogfood-file-1.md` containing only the heading `# Dogfood file 1`. This trivial deliverable serves as evidence that the `/relay-execute` orchestrator successfully ran Phase 1 of the dogfood PRD through the plan → plan-review → implement pipeline.

## User Story

```
As the relay pipeline developer
I want Phase 1 of the dogfood PRD to create dogfood-file-1.md
So that I have observable evidence that /relay-execute ran Phase 1 end-to-end
```

## Problem Statement

The `/relay-execute` orchestrator needs a minimal first-phase deliverable to validate that the plan → plan-review → implement pipeline works for the simplest possible implementation task. Creating a no-op markdown file is the smallest possible task that still exercises the complete pipeline.

## Solution Statement

Create `plugins/relay/commands/dogfood/dogfood-file-1.md` with exactly one line: `# Dogfood file 1`. The directory `plugins/relay/commands/dogfood/` is created if it does not exist. No other files are created or modified.

## Metadata

| Attribute | Value |
|-----------|-------|
| Type | Implementation — file creation |
| Complexity | Trivial — one new file, one line of content |
| Systems Affected | `plugins/relay/commands/dogfood/dogfood-file-1.md` (CREATE) |
| Dependencies | None |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/relay-execute-dogfood.prd.md` Implementation Phases row 1 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `PRPs/prds/relay-execute-dogfood.prd.md` | full | Source PRD; Phase 1 Phase Details |
| 1 | `docs/context/prd-template.md` | 1-50 | PRD shape reference |

## Patterns to Mirror

### Pattern 1 — No-op markdown file shape

```markdown
# SOURCE: plugins/relay/commands/dogfood/dogfood-file-1.md (to be created)
# Dogfood file 1
```

The no-op markdown file contains exactly one heading line and nothing else.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/dogfood/dogfood-file-1.md` | CREATE | Phase 1 deliverable — no-op markdown file as orchestrator test evidence |

## NOT Building (Scope Limits)

- Any content other than the single heading `# Dogfood file 1`.
- Any changes to `dogfood-file-2.md` — that is Phase 2's deliverable.
- Any plugin registration or manifest updates.

## Step-by-Step Tasks

### Task 1: Create directory `plugins/relay/commands/dogfood/` if absent

**ACTION**: Use `Bash` to create the directory with `mkdir -p plugins/relay/commands/dogfood/`. If the directory already exists, this is a no-op.

**MIRROR**: Pattern 1 (no-op markdown file shape — the directory must exist before the file is written).

**VALIDATE**: `test -d plugins/relay/commands/dogfood/ && echo OK`

### Task 2: Create `plugins/relay/commands/dogfood/dogfood-file-1.md`

**ACTION**: Write the file at `plugins/relay/commands/dogfood/dogfood-file-1.md` with exactly the following content:
```
# Dogfood file 1
```
One line only. No trailing content.

**MIRROR**: Pattern 1 (no-op markdown file shape — exactly one heading line).

**VALIDATE**: `test -f plugins/relay/commands/dogfood/dogfood-file-1.md && head -1 plugins/relay/commands/dogfood/dogfood-file-1.md | grep -c '# Dogfood file 1'`

### Task 3: Verify file content integrity

**ACTION**: Read `plugins/relay/commands/dogfood/dogfood-file-1.md` and confirm it contains exactly `# Dogfood file 1` as its first non-empty line. Confirm no extra lines beyond the heading were written.

**MIRROR**: Pattern 1 (no-op markdown file shape — one line only).

**VALIDATE**: `wc -l < plugins/relay/commands/dogfood/dogfood-file-1.md | grep -E '^[12]$' && echo "line count OK"`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
# Verify file exists
test -f plugins/relay/commands/dogfood/dogfood-file-1.md && echo "file exists"

# Verify heading line is correct
head -1 plugins/relay/commands/dogfood/dogfood-file-1.md
```

### Level 2 — CONTENT_INVARIANTS

```bash
# Verify the heading matches exactly
grep -c '^# Dogfood file 1$' plugins/relay/commands/dogfood/dogfood-file-1.md

# Verify no .claude/ path violations
find plugins/relay/commands/dogfood/ -name '*.md' | grep -v '\.claude' && echo "path OK"
```

### Level 3 — INTEGRATION / DRY-RUN END-TO-END

```bash
# Verify directory structure
ls plugins/relay/commands/dogfood/

# Verify file is readable and well-formed markdown
python3 -c "content=open('plugins/relay/commands/dogfood/dogfood-file-1.md').read(); assert content.strip() == '# Dogfood file 1', f'Unexpected content: {repr(content)}'; print('content OK')"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given Phase 1 runs, when `/relay-implement` completes, then `plugins/relay/commands/dogfood/dogfood-file-1.md` exists with `# Dogfood file 1` as its sole content line; the Phase 1 row in the source PRD's Implementation Phases table shows `complete`; the Phase 1 plan is archived under `PRPs/plans/completed/`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Directory creation fails due to permissions | Very Low | Low | `mkdir -p` is idempotent; pre-check with `test -d` |
| File content written incorrectly | Very Low | Low | Level 2 grep verification catches wrong content |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
- This plan is intentionally trivial. Its sole purpose is to provide the `/relay-execute` dogfood with a known-simple Phase 1 deliverable that exercises the full pipeline without plan-review defects.

*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Status: IMPLEMENTED*
