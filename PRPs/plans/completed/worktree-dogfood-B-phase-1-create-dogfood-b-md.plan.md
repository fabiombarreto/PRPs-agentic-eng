# Feature: create dogfood-B.md (Phase 1 of worktree-dogfood-B)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin repo)
- Activated criteria: creates a new markdown file under plugins/relay/commands/dogfood/; trivial dogfood fixture for worktree-dogfood-B end-to-end pipeline validation (AC-16 of relay-worktree.prd.md); no new agent, command, or skill file — purely a fixture artifact
- Decisions found:
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19)
  - PRPs/plans/completed/ is canonical archive path for IMPLEMENTED plans (docs/decisions.md, 2026-04-30)
  - D1 worktree path .worktrees/<feature>/ validates slug derivation for worktree-dogfood-B (docs/decisions.md, 2026-05-11)
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md:60-66)
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:79-84)
- Applicable architectural rules:
  - Interactivity boundary at PRD approval — plan execution is autonomous from this point
  - PRPs/ artifact paths for pipeline artifacts; plugins/ artifact paths for plugin deliverables
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/worktree-dogfood-B.prd.md` — Implementation Phases row 1:
  "create dogfood-B.md" — Goal: create `plugins/relay/commands/dogfood/dogfood-B.md` as evidence the orchestrator pipeline ran end-to-end against Fixture B — Success signal: `plugins/relay/commands/dogfood/dogfood-B.md` exists; its first (and only) non-empty line is `# Dogfood B`.

## Summary

This phase creates `plugins/relay/commands/dogfood/dogfood-B.md` as a no-op markdown file containing a single level-1 heading `# Dogfood B`. The file is the observable artifact proving the relay-execute pipeline ran end-to-end for the `worktree-dogfood-B` fixture PRD. The approach mirrors the canonical pattern established by the two existing dogfood fixtures (`dogfood-file-1.md` and `dogfood-file-2.md`): a plain markdown file with exactly one line, no YAML frontmatter, no body content.

## User Story

As a relay developer running Phase 4 dogfood validation of the relay-worktree feature,
I want `plugins/relay/commands/dogfood/dogfood-B.md` to exist with a `# Dogfood B` heading,
So that I have observable evidence that the `/relay-execute` pipeline ran end-to-end against Fixture B.

## Problem Statement

The relay-worktree feature (AC-16 of `PRPs/prds/relay-worktree.prd.md`) requires two independently runnable fixture PRDs to validate parallel non-collision. Fixture B (`worktree-dogfood-B`) needs an observable output artifact — a file that can only exist if the full plan → plan-review → implement pipeline ran and committed work. Without this artifact, there is no way to distinguish a completed pipeline run from a run that silently failed before the implement phase.

## Solution Statement

Create `plugins/relay/commands/dogfood/dogfood-B.md` with content `# Dogfood B` as its first and only line. The `plugins/relay/commands/dogfood/` directory already exists (confirmed by `dogfood-file-1.md` and `dogfood-file-2.md`). No directory creation is needed. The file requires no frontmatter, no body, and no trailing content — matching the existing fixture pattern exactly.

## Metadata

| Field | Value |
|-------|-------|
| Type | Dogfood fixture / file creation |
| Complexity | Trivial |
| Systems Affected | `plugins/relay/commands/dogfood/` |
| Dependencies | None |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/worktree-dogfood-B.prd.md:104` |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| Must | `PRPs/prds/worktree-dogfood-B.prd.md` | 100–112 | Phase 1 goal, scope, success signal |
| Must | `plugins/relay/commands/dogfood/dogfood-file-1.md` | 1 | Canonical pattern: single-heading no-op fixture |
| Must | `plugins/relay/commands/dogfood/dogfood-file-2.md` | 1 | Confirms pattern is consistent across fixtures |
| Should | `PRPs/prds/relay-worktree.prd.md` | Phase 4 row | Context on why these fixtures exist (AC-16 parallel non-collision) |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/dogfood/dogfood-file-1.md:1
# Dogfood file 1
```
Task 2 mirrors this exact shape: single level-1 heading, no frontmatter, no body. The only difference is the heading text (`# Dogfood B` vs `# Dogfood file 1`).

```
# SOURCE: plugins/relay/commands/dogfood/dogfood-file-2.md:1
# Dogfood file 2
```
Task 2 second confirmation: the pattern is identical across all fixtures in the directory.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/commands/dogfood/dogfood-B.md` | CREATE | Observable artifact proving the pipeline ran end-to-end for Fixture B; mirrors pattern from dogfood-file-1.md and dogfood-file-2.md |

## NOT Building (Scope Limits)

- YAML frontmatter in dogfood-B.md — dogfood fixtures are inert content files, not registered slash-commands
- Additional headings, body content, or metadata in the file — single line only, per the PRD scope
- worktree cleanup — out of scope per relay-worktree.prd.md Won't items; Pillar 3 owns removal
- TDD integration — `tdd: false`; no test suite for this dogfood fixture
- Multi-PRD orchestration — single fixture scope

## Step-by-Step Tasks

### Task 1: VERIFY dogfood directory exists

**ACTION:** Infrastructure scaffolding step — confirm `plugins/relay/commands/dogfood/` exists and is writable before writing the new file (prerequisite for AC-A1). The directory should already exist (dogfood-file-1.md and dogfood-file-2.md are confirmed present), but an explicit check prevents a silent Create failure if the directory is missing.

**MIRROR:** Pattern from `plugins/relay/commands/dogfood/dogfood-file-1.md:1` (directory presence confirmed by sibling file existence).

**VALIDATE:** `Test-Path plugins/relay/commands/dogfood/dogfood-file-1.md`

### Task 2: CREATE plugins/relay/commands/dogfood/dogfood-B.md

**ACTION:** Write a new file at `plugins/relay/commands/dogfood/dogfood-B.md` with exactly the following content — satisfies AC-A1 (file exists at expected path), AC-A2 (first line is `# Dogfood B`), AC-A3 (no frontmatter, no additional content):

```
# Dogfood B
```

No trailing newline required beyond what the Write tool appends. No frontmatter. No additional body. The heading text is `# Dogfood B` — exactly as specified in the PRD success signal.

**MIRROR:** `plugins/relay/commands/dogfood/dogfood-file-1.md:1` — `# Dogfood file 1` shape: single level-1 heading, no frontmatter, no additional content.

**VALIDATE:** `Test-Path plugins/relay/commands/dogfood/dogfood-B.md`

### Task 3: VERIFY file content matches expected heading

**ACTION:** Read the first line of the newly created `plugins/relay/commands/dogfood/dogfood-B.md` and confirm it equals `# Dogfood B` — satisfies AC-A2 (first non-empty line = `# Dogfood B`). This validation step satisfies the PRD success signal: "its first (and only) non-empty line is `# Dogfood B`".

**MIRROR:** `plugins/relay/commands/dogfood/dogfood-file-1.md:1` — same structure; the sibling fixture's heading is its first and only line.

**VALIDATE:** `Select-String -Path plugins/relay/commands/dogfood/dogfood-B.md -Pattern '^# Dogfood B$'`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```powershell
# Confirm file exists at expected path
Test-Path "plugins/relay/commands/dogfood/dogfood-B.md"
```

### Level 2 — CONTENT_INVARIANTS

```powershell
# Confirm first non-empty line is exactly "# Dogfood B"
$firstLine = (Get-Content "plugins/relay/commands/dogfood/dogfood-B.md" | Where-Object { $_ -ne '' } | Select-Object -First 1)
if ($firstLine -eq '# Dogfood B') { Write-Host 'PASS' } else { Write-Host "FAIL: got '$firstLine'" }
```

### Level 3 — INTEGRATION

```powershell
# Confirm file appears in git status (new file in working tree)
git status --short plugins/relay/commands/dogfood/dogfood-B.md
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given this plan is implemented, `plugins/relay/commands/dogfood/dogfood-B.md` exists at the expected path.
- **AC-A2 (PRD AC-1):** The first (and only) non-empty line of `plugins/relay/commands/dogfood/dogfood-B.md` is exactly `# Dogfood B`.
- **AC-A3 (PRD AC-1):** The file contains no YAML frontmatter, no additional headings, and no body content beyond the single heading line.
- **AC-A4 (PRD AC-1):** The Phase 1 row in `PRPs/prds/worktree-dogfood-B.prd.md` shows `complete` in the Status cell after the D8 post-approval mutations run.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Directory `plugins/relay/commands/dogfood/` does not exist | Low | High (Write would create file at wrong path) | Task 1 explicitly confirms directory existence via sibling file check before Task 2 writes |
| File content drifts from `# Dogfood B` (e.g., trailing space, wrong capitalisation) | Low | Medium (PRD success signal fails) | Task 3 validates first non-empty line against exact regex `^# Dogfood B$` |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

This fixture is intentionally trivial. Its purpose is not to validate domain logic but to exercise the full `/relay-execute` pipeline machinery (plan → plan-review → implement → D8 mutations) end-to-end against a real PRD. The observable artifact (`dogfood-B.md`) is the proof of execution — mirroring the CI/CD "build-once artifact as evidence token" pattern.

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Implemented: 2026-05-11*
*Status: IMPLEMENTED*
