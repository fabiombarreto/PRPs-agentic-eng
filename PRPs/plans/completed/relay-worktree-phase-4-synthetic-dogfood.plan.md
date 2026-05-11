# Feature: Synthetic dogfood (Phase 4 of relay-worktree)

```
**Decision Gate**
- Active context: docs/context/architecture.md
- Activated criteria: new PRD fixtures under PRPs/prds/ (dogfood test PRDs, not pipeline PRDs); new report stub under PRPs/reports/relay-worktree/; TIER B operator-action-required shell commands; validates AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16 against real /relay-execute runs (operator-run)
- Decisions found:
  - 2026-04-19 PRP artifacts under PRPs/, never .claude/ — synthetic PRD fixtures go to PRPs/prds/worktree-dogfood-A.prd.md and -B.prd.md; report stub at PRPs/reports/relay-worktree/dogfood.md
  - 2026-04-19 Interactivity boundary: PRD interactive, downstream autonomous — dogfood PRDs are manually-stamped APPROVED test fixtures (not through /relay-prd review); they are fixtures, not real pipeline PRDs
  - 2026-04-25 Plan filenames carry source PRD phase number and slug
  - 2026-05-01 D6 state machine: source PRD's Implementation Phases table IS the state machine — each dogfood PRD has a 1-row phases table; the worktree-dogfood PRD rows are test-fixture rows, not relay pipeline rows
  - relay-worktree.prd.md D1: worktree path is .worktrees/<feature>/ — verifiable in TIER B via git worktree list
  - relay-worktree.prd.md D4: idempotency policy — silent re-use on expected branch; HALT loud on branch divergence — AC-3 and AC-4 scenarios
  - relay-worktree.prd.md D8: worktree-creation-failure handling is graceful fallback to cwd — AC-14 scenario
  - relay-worktree.prd.md D10: branch-name pattern is feature/<feature>
  - relay-worktree.prd.md D11: base-ref resolution chain origin/main → origin/master → HEAD
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66) — dogfood PRDs go under PRPs/prds/, report goes under PRPs/reports/relay-worktree/; no write under .claude/
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84) — TIER B shell commands must be run by the operator manually; the implementer does not invoke /relay-execute
- Applicable architectural rules:
  - PRPs/ artifact paths convention — all files produced by this phase are under PRPs/prds/ or PRPs/reports/
  - Interactivity boundary past PRD-APPROVED — the implementer (relay:implementer tool set: Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash) cannot dispatch /relay-execute recursively; TIER B is explicitly operator-action-required
  - No recursive /relay-execute invocation from within an orchestrator-driven pipeline
  - Three-pillar Pillar 2 (Implementation); this phase's TIER A deliverables are static artifact creation only
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-worktree.prd.md` — Implementation Phases row 4: "Synthetic dogfood" — Goal: prove parallel execution end-to-end and validate AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16 against real `/relay-execute` runs — Success signal: the dogfood report documents all 7 scenarios passing; the Cement Decision is PASS; any FPs surfaced lead to Phase 1–3 iteration before Phase 5 cuts the release.

## Summary

Phase 4 delivers the synthetic-dogfood validation for the relay-worktree feature. The work is split into two tiers: TIER A (implementer-producible, autonomous) authors two manually-stamped APPROVED test-fixture PRDs (`PRPs/prds/worktree-dogfood-A.prd.md` and `PRPs/prds/worktree-dogfood-B.prd.md`), each with one trivial phase that creates a no-op markdown file in `plugins/relay/commands/dogfood/`, and authors the dogfood report skeleton at `PRPs/reports/relay-worktree/dogfood.md` with 7 scenario sections pre-populated but marked `*operator-pending*` for live results. TIER B (operator-action-required, explicitly outside implementer scope) covers running `/relay-execute` on both PRDs in parallel shell sessions, exercising the five negative-path scenarios (AC-3, AC-4, AC-7, AC-8, AC-13, AC-14), and filling in the report with observed outcomes to reach a Cement Decision of PASS or FAIL. The plan's Step-by-Step Tasks cover TIER A only; TIER B is documented in the Notes section with exact shell commands for the operator to run.

## User Story

```
As a relay-developer who has shipped Phases 1–3 of relay-worktree
I want the Phase 4 synthetic dogfood artifacts (fixture PRDs + report skeleton) to be authored by the implementer
So that I can run the operator-action TIER B steps immediately, filling in live outcomes in a pre-structured report, and reach a Cement Decision (PASS/FAIL) for the v0.11.0 release gate
```

## Problem Statement

Phases 1–3 shipped the `/relay-worktree` command, the context-builder extension, and the `/relay-execute` D4 live wiring — but no empirical validation has run against real parallel invocations. Until two real `/relay-execute` sessions run concurrently against distinct worktree-dogfood PRDs and produce non-colliding worktrees at `.worktrees/worktree-dogfood-A/` and `.worktrees/worktree-dogfood-B/`, the Key Hypothesis of the PRD (physical isolation enables parallel autonomous feature delivery) is unverified. Additionally, the implementer agent running inside an orchestrator-driven `/relay-execute` pipeline cannot itself dispatch `/relay-execute` recursively — the toolset is `Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash` with no `Task` tool and no ability to invoke relay commands. This structural constraint means Phase 4's live execution must be split: the implementer produces the fixture files and the report skeleton, and the operator runs the actual parallel sessions and fills in the outcomes.

## Solution Statement

TIER A (this plan's tasks): author `PRPs/prds/worktree-dogfood-A.prd.md` and `PRPs/prds/worktree-dogfood-B.prd.md` as manually-stamped `*Status: APPROVED*` fixtures (bypassing `/relay-prd` review — they are test fixtures, not real pipeline PRDs). Each fixture has one 1-phase Implementation Phases table row ("create `plugins/relay/commands/dogfood/<X>.md`"). Author `PRPs/reports/relay-worktree/dogfood.md` as a report skeleton with 7 labelled scenario sections (AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16), each containing the expected outcome statement and an `*operator-pending*` slot for the live result. Validate structural conformance of the fixture PRDs using grep checks against the canonical PRD template's mandatory section ordering.

TIER B (operator-action-required, documented in Notes): the operator opens two shell sessions within 30 seconds of each other, runs `/relay-execute PRPs/prds/worktree-dogfood-A.prd.md` and `/relay-execute PRPs/prds/worktree-dogfood-B.prd.md`, observes both worktrees materializing at disjoint paths, and runs the five negative-path scenarios. The operator then fills in the 7 `*operator-pending*` slots in `dogfood.md` with observed outcomes and sets the Cement Decision to PASS or FAIL.

## Metadata

| Key | Value |
|-----|-------|
| Type | Artifact authoring — two fixture PRD files + one report skeleton markdown |
| Complexity | Low (TIER A) / Operator-dependent (TIER B) |
| Systems Affected | `PRPs/prds/worktree-dogfood-A.prd.md` (CREATE); `PRPs/prds/worktree-dogfood-B.prd.md` (CREATE); `PRPs/reports/relay-worktree/dogfood.md` (CREATE) |
| Dependencies | Phase 3 complete (`relay-execute.md` D4 live wiring shipped) |
| Estimated Tasks | 4 atomic TIER A tasks (create fixture PRD A, create fixture PRD B, create report skeleton, validate structural conformance) |
| Source PRD line ref | `PRPs/prds/relay-worktree.prd.md` line 193 (row 4 of Implementation Phases table) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/relay-worktree.prd.md` | 65–83 (AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16) | The 7 ACs this dogfood must validate — each scenario section in the report skeleton derives directly from these ACs |
| P0 | `PRPs/prds/relay-execute-dogfood.prd.md` | 1–94 | Canonical shape for a synthetic dogfood PRD (Decision Gate block, 1–2 phase Implementation Phases table, manually-stamped APPROVED status, minimal ACs) — the direct pattern source for worktree-dogfood-A and -B |
| P0 | `PRPs/reports/reviewer-coherence-layer/dogfood.md` | 1–32 | Canonical shape for a dogfood report skeleton (header metadata, Methodology section, per-scenario subsections with evidence tables, Cement Decision) |
| P1 | `docs/context/prd-template.md` | 56–196 | Canonical PRD section ordering (Decision Gate → Problem Statement → Evidence → Proposed Solution → Key Hypothesis → What We're NOT Building → Success Metrics → Acceptance Criteria → Open Questions → Users & Context → Solution Detail → Technical Approach → Implementation Phases → Decisions Log → Research Summary) — used for R2-equivalent structural conformance check |
| P1 | `PRPs/plans/completed/relay-worktree-phase-3-relay-execute-d4-live-wiring.plan.md` | 1–28 | Most recently completed plan in this feature; Decision Gate evidence block shape and back-fill discipline to mirror |
| P2 | `PRPs/prds/relay-worktree.prd.md` | 213–222 | Phase 4 Phase Details block (Goal, Scope, Success signal) for the source PRD pointer |

## Patterns to Mirror

### Pattern 1 — Synthetic dogfood PRD shape (Decision Gate + compact phases table)

```
# SOURCE: PRPs/prds/relay-execute-dogfood.prd.md:1-18
```
```
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
```
Task 1 (CREATE worktree-dogfood-A.prd.md) and Task 2 (CREATE worktree-dogfood-B.prd.md) both copy this Decision Gate block shape, adapting the Activated criteria and Decisions found to the worktree feature's D1/D4/D10 decisions.

### Pattern 2 — Compact 1-phase Implementation Phases table in a fixture PRD

```
# SOURCE: PRPs/prds/relay-execute-dogfood.prd.md:71-76
```
```
## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | create dogfood-file-1.md | Create `plugins/relay/commands/dogfood/dogfood-file-1.md` as a no-op markdown file with a single `# Dogfood file 1` heading. | pending | - | - | - |
```
Task 1 and Task 2 copy this exact table shape: one data row, `pending` status (stamped to `*Status: APPROVED*` in the trailing block manually), trivial phase description.

### Pattern 3 — Manually-stamped APPROVED trailing block for test fixtures

```
# SOURCE: PRPs/prds/relay-execute-dogfood.prd.md:92-94
```
```
*Generated: 2026-05-01*
*Approved: 2026-05-01*
*Status: APPROVED*
```
Task 1 and Task 2 emit this trailing block (with `*Generated: 2026-05-11*` and `*Approved: 2026-05-11*`) because these are manually-stamped test fixtures, not PRDs that go through the interactive `/relay-prd` flow.

### Pattern 4 — Dogfood report header + scenario section shape

```
# SOURCE: PRPs/reports/reviewer-coherence-layer/dogfood.md:1-13
```
```
# Dogfood Report — reviewer-coherence-layer

**Plan**: `PRPs/plans/reviewer-coherence-layer-phase-4-dogfood-validation-cement.plan.md`
**Source PRD**: `PRPs/prds/reviewer-coherence-layer.prd.md`
**Date**: 2026-04-28
**Status**: COMPLETE
**Cement decision**: PASS (with documented AC-6 ≥1 TP requirement evolution)
```
Task 3 (CREATE dogfood.md) copies this header shape, adapting the Plan, Source PRD, Date, Status (→ `IN-PROGRESS`), and Cement decision (→ `*operator-pending*`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `PRPs/prds/worktree-dogfood-A.prd.md` | CREATE | Fixture PRD for worktree-dogfood-A; one trivial phase ("create `plugins/relay/commands/dogfood/dogfood-A.md`"); manually-stamped APPROVED; used by operator in TIER B to run `/relay-execute` against |
| `PRPs/prds/worktree-dogfood-B.prd.md` | CREATE | Fixture PRD for worktree-dogfood-B; one trivial phase ("create `plugins/relay/commands/dogfood/dogfood-B.md`"); manually-stamped APPROVED; used by operator in TIER B for the parallel run (AC-16 non-collision test) |
| `PRPs/reports/relay-worktree/dogfood.md` | CREATE | Dogfood report skeleton with 7 scenario sections (AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16), each marked `*operator-pending*`; operator fills in live results in TIER B; Cement Decision slot left open |

## NOT Building (Scope Limits)

- **Running `/relay-execute` on the fixture PRDs** — this is TIER B (operator-action-required). The implementer cannot dispatch `/relay-execute` recursively from within an orchestrator-driven pipeline. The exact shell commands are documented in the Notes section.
- **Exercising the five negative-path scenarios live** (AC-3 idempotent re-use, AC-4 branch divergence, AC-7 bootstrap failure, AC-8 bootstrap absent, AC-13 `--no-worktree`, AC-14 write-protected `.worktrees/`) — all TIER B. The report skeleton pre-populates the expected outcome for each; the operator fills in the observed outcome.
- **Filling in the Cement Decision** — TIER B. The implementer creates the `*operator-pending*` slot; the operator writes PASS or FAIL after observing TIER B outcomes.
- **Worktree cleanup / removal** — out of scope per PRD. Pillar 3 (`/relay-approve`) owns `git worktree remove` + branch deletion.
- **Docs + v0.11.0 release cut** — Phase 5 scope, not Phase 4.
- **`EnterWorktree` native tool integration** — explicitly rejected (PRD Won't).
- **Stack-specific bootstrap template generation** — deferred Could-item.

## Step-by-Step Tasks

### Task 1: CREATE PRPs/prds/worktree-dogfood-A.prd.md

- **ACTION**: Write the fixture PRD for worktree-dogfood-A. (Satisfies AC-A1, AC-A7 / PRD AC-16) The file must contain: (1) Decision Gate fenced block with `Activated criteria` naming the worktree parallel-non-collision scenario; (2) all canonical PRD sections in template order (Problem Statement through Research Summary); (3) exactly one Implementation Phases row — `| 1 | create dogfood-A.md | Create \`plugins/relay/commands/dogfood/dogfood-A.md\` as a no-op markdown file with a single \`# Dogfood A\` heading. | pending | - | - | - |`; (4) Acceptance Criteria with one AC covering the file's existence and heading content; (5) TDD routing note declaring `tdd: false`; (6) trailing block manually stamped `*Generated: 2026-05-11*` / `*Approved: 2026-05-11*` / `*Status: APPROVED*`.
- **MIRROR**: Pattern 1 (Decision Gate block shape from `PRPs/prds/relay-execute-dogfood.prd.md:1-18`), Pattern 2 (compact 1-phase Implementation Phases table from `PRPs/prds/relay-execute-dogfood.prd.md:71-76`), Pattern 3 (manually-stamped APPROVED trailing block from `PRPs/prds/relay-execute-dogfood.prd.md:92-94`).
- **VALIDATE**: `Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-A.prd.md | Select-String "Status: APPROVED"` (PowerShell) — confirms trailing APPROVED stamp; also: `Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-A.prd.md | Select-String "Decision Gate"` — confirms gate block present.

### Task 2: CREATE PRPs/prds/worktree-dogfood-B.prd.md

- **ACTION**: Write the fixture PRD for worktree-dogfood-B. (Satisfies AC-A1 / PRD AC-16) Identical structure to Task 1 but for the B variant: phase creates `plugins/relay/commands/dogfood/dogfood-B.md` with heading `# Dogfood B`. Decision Gate `Activated criteria` names this as the second fixture in the parallel-non-collision test pair. All canonical PRD sections present; TDD routing `tdd: false`; trailing block manually stamped APPROVED.
- **MIRROR**: Pattern 1, Pattern 2, Pattern 3 (same sources as Task 1 — `PRPs/prds/relay-execute-dogfood.prd.md:1-18`, `:71-76`, `:92-94`).
- **VALIDATE**: `Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-B.prd.md | Select-String "Status: APPROVED"` (PowerShell) — confirms trailing APPROVED stamp; also: `Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-B.prd.md | Select-String "worktree-dogfood-B"` — confirms slug appears correctly in file content.

### Task 3: CREATE PRPs/reports/relay-worktree/dogfood.md

- **ACTION**: Write the dogfood report skeleton. The file must contain: (1) header block (Plan, Source PRD, Date, Status: `IN-PROGRESS`, Cement decision: `*operator-pending*`); (2) a Summary section explaining the TIER A / TIER B split; (3) exactly 7 scenario subsections labelled by AC number — `### Scenario AC-16: Parallel non-collision`, `### Scenario AC-3: Idempotent re-use`, `### Scenario AC-4: Branch divergence halt`, `### Scenario AC-7: Bootstrap failure non-fatal`, `### Scenario AC-8: Bootstrap absent`, `### Scenario AC-13: --no-worktree opt-out`, `### Scenario AC-14: Worktree creation failure (write-protect)`; (4) each scenario section contains: the expected outcome (verbatim from the relevant PRD AC), the exact shell command the operator must run (copied from the Notes section of this plan), and an `**Observed outcome:** *operator-pending*` slot; (5) a final `## Cement Decision` section with `**Result:** *operator-pending*` and space for the operator's rationale.
- **MIRROR**: Pattern 4 (dogfood report header shape from `PRPs/reports/reviewer-coherence-layer/dogfood.md:1-13`).
- **VALIDATE**: `Get-Content C:\repos\PRPs-agentic-eng\PRPs\reports\relay-worktree\dogfood.md | Select-String "operator-pending"` (PowerShell) — must return at least 7 lines (one per scenario plus the Cement Decision slot).

### Task 4: VALIDATE structural conformance of both fixture PRDs

- **ACTION**: Run grep/Select-String checks confirming both fixture PRDs contain the mandatory canonical PRD sections in the correct order: `## Problem Statement`, `## Evidence`, `## Proposed Solution`, `## Key Hypothesis`, `## What We're NOT Building`, `## Success Metrics`, `## Acceptance Criteria`, `## Implementation Phases`. Also verify each PRD's `*Status: APPROVED*` trailing line and `Decision Gate` fenced block are present. (Verifies AC-A1, AC-A7 / PRD AC-16)
- **MIRROR**: Pattern 2 and Pattern 3 structural expectations from `PRPs/prds/relay-execute-dogfood.prd.md`.
- **VALIDATE**: `@("PRPs/prds/worktree-dogfood-A.prd.md","PRPs/prds/worktree-dogfood-B.prd.md") | ForEach-Object { $f = "C:\repos\PRPs-agentic-eng\$_"; @("## Problem Statement","## Acceptance Criteria","## Implementation Phases","Status: APPROVED","Decision Gate") | ForEach-Object { if (-not (Get-Content $f | Select-String $_ -Quiet)) { Write-Error "MISSING '$_' in $f" } } }` — exits without error if all required strings are present in both files.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```powershell
# Confirm both fixture PRDs exist and are non-empty
Test-Path "C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-A.prd.md"
Test-Path "C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-B.prd.md"
Test-Path "C:\repos\PRPs-agentic-eng\PRPs\reports\relay-worktree\dogfood.md"

# Confirm none of the new files write under .claude/
Get-ChildItem "C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-*.prd.md" | ForEach-Object { if ($_.FullName -match "\.claude") { Write-Error "Path violates anti-pattern: $($_.FullName)" } }
```

### Level 2 CONTENT_INVARIANTS

```powershell
# Verify both fixture PRDs have the APPROVED trailing stamp
foreach ($file in @("worktree-dogfood-A.prd.md","worktree-dogfood-B.prd.md")) {
  $path = "C:\repos\PRPs-agentic-eng\PRPs\prds\$file"
  if (-not (Get-Content $path | Select-String "Status: APPROVED" -Quiet)) { Write-Error "Missing APPROVED stamp in $file" }
  if (-not (Get-Content $path | Select-String "Decision Gate" -Quiet)) { Write-Error "Missing Decision Gate block in $file" }
  if (-not (Get-Content $path | Select-String "## Implementation Phases" -Quiet)) { Write-Error "Missing Implementation Phases section in $file" }
  if (-not (Get-Content $path | Select-String "## Acceptance Criteria" -Quiet)) { Write-Error "Missing Acceptance Criteria section in $file" }
}

# Verify report skeleton has all 7 scenario labels
$report = "C:\repos\PRPs-agentic-eng\PRPs\reports\relay-worktree\dogfood.md"
foreach ($ac in @("AC-16","AC-3","AC-4","AC-7","AC-8","AC-13","AC-14")) {
  if (-not (Get-Content $report | Select-String $ac -Quiet)) { Write-Error "Missing scenario $ac in dogfood.md" }
}

# Verify report has at least 7 operator-pending slots
$pendingCount = (Get-Content $report | Select-String "operator-pending").Count
if ($pendingCount -lt 7) { Write-Error "Expected >=7 operator-pending slots, found $pendingCount" }
```

### Level 3 INTEGRATION (dry-run conformance)

```powershell
# Dry-run: confirm both fixture PRDs would be parseable as relay PRDs
# (check the canonical Implementation Phases table header is present verbatim)
$header = "| # | Phase | Description | Status | Parallel | Depends | PRP Plan |"
foreach ($file in @("worktree-dogfood-A.prd.md","worktree-dogfood-B.prd.md")) {
  $path = "C:\repos\PRPs-agentic-eng\PRPs\prds\$file"
  if (-not (Get-Content $path | Select-String ([regex]::Escape($header)) -Quiet)) {
    Write-Error "Implementation Phases table header not found in $file"
  }
}

# Confirm the worktree-dogfood PRD slugs are distinct (prerequisite for AC-16 non-collision)
$slugA = "worktree-dogfood-A"
$slugB = "worktree-dogfood-B"
if ($slugA -eq $slugB) { Write-Error "Slugs must be distinct for AC-16 non-collision test" }
Write-Host "Slug A: $slugA | Slug B: $slugB — distinct: OK"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-16):** Both fixture PRDs (`worktree-dogfood-A.prd.md` and `worktree-dogfood-B.prd.md`) exist under `PRPs/prds/`, have `*Status: APPROVED*` trailing stamps, contain a valid Decision Gate fenced block, and each carries exactly one Implementation Phases row describing creation of a distinct no-op markdown file (`dogfood-A.md` vs `dogfood-B.md`) — making them valid inputs to two independent `/relay-execute` invocations (TIER B).
- **AC-A2 (PRD AC-3, AC-4):** The dogfood report skeleton at `PRPs/reports/relay-worktree/dogfood.md` contains `### Scenario AC-3` and `### Scenario AC-4` subsections, each with the verbatim expected outcome from the source PRD's AC-3 and AC-4 text, the exact operator shell command, and an `*operator-pending*` observed-outcome slot.
- **AC-A3 (PRD AC-7, AC-8):** The dogfood report skeleton contains `### Scenario AC-7` and `### Scenario AC-8` subsections with expected outcomes, operator commands, and `*operator-pending*` slots.
- **AC-A4 (PRD AC-13, AC-14):** The dogfood report skeleton contains `### Scenario AC-13` and `### Scenario AC-14` subsections with expected outcomes, operator commands, and `*operator-pending*` slots.
- **AC-A5 (PRD AC-16):** The dogfood report skeleton contains `### Scenario AC-16` as a dedicated subsection (the primary parallel-non-collision scenario), with expected outcome verbatim from source PRD AC-16, operator shell commands for both parallel sessions, and `*operator-pending*` slots for both worktree paths and both pipeline outcomes.
- **AC-A6 (PRD AC-3, AC-4, AC-7, AC-8, AC-13, AC-14, AC-16):** The total count of `*operator-pending*` slots in `dogfood.md` is at least 7 (one per scenario) plus one for the Cement Decision — verifiable by grep.
- **AC-A7 (PRD AC-16):** Neither fixture PRD nor the report skeleton writes any file under `.claude/` — verified by Level 1 STATIC_ANALYSIS path checks.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Operator TIER B runs Phase 5 docs update before completing TIER B scenarios, blocking the release gate | L | M | Phase 5 depends on Phase 4 per the PRD's Depends column; Phase 5 is only actionable when Phase 4 is `complete`; the orchestrator's state machine (D6) enforces this — Phase 5 row remains `pending` until Phase 4's `Status` flips to `complete` |
| Fixture PRD slugs (`worktree-dogfood-A`, `worktree-dogfood-B`) collide with an existing worktree or branch from a prior partial dogfood run | L | M | Operator should run `git worktree list` and `git branch -a` before TIER B; if `.worktrees/worktree-dogfood-A/` exists from a prior attempt, run `git worktree remove .worktrees/worktree-dogfood-A/ --force && git branch -D feature/worktree-dogfood-A` to reset; AC-3 idempotency test relies on a second invocation against an existing worktree (intentional) |
| AC-14 write-protect scenario on Windows requires different `icacls` command rather than Unix `chmod 000` | M | L | The TIER B notes below include the Windows-native `icacls .worktrees /deny Everyone:(OI)(CI)(W)` command and the matching cleanup `icacls .worktrees /reset /T`; the operator must use these on the Windows host |
| Fixture PRD structural conformance check misses a section that `/relay-execute` requires at runtime | L | H | Level 3 integration check validates the canonical Implementation Phases table header byte-for-byte; plan-reviewer R2 will also validate if the plan for these fixture PRDs is reviewed before TIER B execution |
| Bootstrap script absent on this repo (relay has no `scripts/worktree-bootstrap.sh`) means AC-7 and AC-8 tests overlap | L | L | AC-8 (bootstrap absent) is the natural state of this repo; AC-7 (bootstrap failure non-fatal) requires the operator to temporarily create a failing bootstrap script — see TIER B notes for exact commands |

## Notes

### TDD routing

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

### TIER A / TIER B split rationale

The relay:implementer agent's toolset (`Read, Write, Edit, Glob, Grep, Bash, BashOutput, KillBash`) does not include the `Task` tool and does not provide a mechanism to invoke relay slash-commands (`/relay-execute`, `/relay-plan`, etc.) recursively. The implementer runs inside an orchestrator-driven `/relay-execute` pipeline; dispatching a second `/relay-execute` from within that session would create an unbounded recursive invocation and violates the "Asking the user to confirm anything" anti-pattern (the loop would have no exit condition the agent can autonomously resolve). Therefore, all live execution is operator-action-required (TIER B).

### TIER B — Operator actions and exact shell commands

The following actions are EXPLICITLY OUTSIDE implementer scope. The operator must run them manually after the implementer completes TIER A.

**Pre-flight checks (run before any TIER B step):**

```powershell
# 1. Confirm Phase 3 is complete (D4 live wiring shipped)
Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\relay-worktree.prd.md | Select-String "relay-execute D4 live wiring"
# Should show: | 3 | ... | complete | ...

# 2. Confirm both fixture PRDs are APPROVED and parseable
Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-A.prd.md | Select-String "Status: APPROVED"
Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-B.prd.md | Select-String "Status: APPROVED"

# 3. Confirm no stale worktrees from prior attempts
git -C C:\repos\PRPs-agentic-eng worktree list
# If .worktrees/worktree-dogfood-A or -B appear, remove them:
# git worktree remove .worktrees/worktree-dogfood-A --force; git branch -D feature/worktree-dogfood-A
# git worktree remove .worktrees/worktree-dogfood-B --force; git branch -D feature/worktree-dogfood-B
```

**Scenario AC-16: Parallel non-collision — open two PowerShell sessions within 30 seconds of each other:**

Session 1:
```powershell
cd C:\repos\PRPs-agentic-eng
# Invoke the relay plan+execute pipeline against fixture PRD A
# (using whatever mechanism the relay plugin exposes — /relay-execute or equivalent)
/relay-execute PRPs/prds/worktree-dogfood-A.prd.md
```

Session 2 (start within 30 seconds of Session 1):
```powershell
cd C:\repos\PRPs-agentic-eng
/relay-execute PRPs/prds/worktree-dogfood-B.prd.md
```

After both complete:
```powershell
git -C C:\repos\PRPs-agentic-eng worktree list
# Expected: two lines with .worktrees/worktree-dogfood-A [feature/worktree-dogfood-A] and .worktrees/worktree-dogfood-B [feature/worktree-dogfood-B]
# Verify no cross-contamination:
git -C C:\repos\PRPs-agentic-eng\.worktrees\worktree-dogfood-A diff feature/worktree-dogfood-A --name-only
# Should show only: plugins/relay/commands/dogfood/dogfood-A.md
git -C C:\repos\PRPs-agentic-eng\.worktrees\worktree-dogfood-B diff feature/worktree-dogfood-B --name-only
# Should show only: plugins/relay/commands/dogfood/dogfood-B.md
```

Fill in `PRPs/reports/relay-worktree/dogfood.md` Scenario AC-16 with observed worktree paths, branch names, and pipeline outcomes.

**Scenario AC-3: Idempotent re-use — run after AC-16 worktrees exist:**

```powershell
# Re-invoke relay-worktree manually on an already-existing worktree
/relay-worktree worktree-dogfood-A
# Expected exit: code 0, message "Worktree at `.worktrees/worktree-dogfood-A/` already exists on branch `feature/worktree-dogfood-A`. Re-using."
# Expected: no git operation runs, no bootstrap re-execution
```

Fill in Scenario AC-3 with the observed exit code and message.

**Scenario AC-4: Branch divergence halt — requires a worktree on the wrong branch:**

```powershell
# Temporarily create a worktree-dogfood-C on a different branch name to simulate divergence:
git -C C:\repos\PRPs-agentic-eng worktree add .worktrees\worktree-dogfood-C -b wrong/worktree-dogfood-C HEAD
# Now invoke relay-worktree with the slug that maps to this path but the wrong branch:
/relay-worktree worktree-dogfood-C
# Expected: HALT with FAILED_BRANCH_DIVERGENCE naming expected branch feature/worktree-dogfood-C and actual branch wrong/worktree-dogfood-C
# Cleanup after observation:
git -C C:\repos\PRPs-agentic-eng worktree remove .worktrees\worktree-dogfood-C --force
git -C C:\repos\PRPs-agentic-eng branch -D wrong/worktree-dogfood-C
```

Fill in Scenario AC-4 with observed exit code and HALT message verbatim.

**Scenario AC-7: Bootstrap failure non-fatal — create a failing bootstrap script temporarily:**

```powershell
# Create a deliberately failing bootstrap script
New-Item -Path C:\repos\PRPs-agentic-eng\scripts -ItemType Directory -Force
Set-Content C:\repos\PRPs-agentic-eng\scripts\worktree-bootstrap.sh "#!/usr/bin/env bash`nexit 1"
# Run relay-worktree against a fresh feature
/relay-worktree worktree-dogfood-bootstrap-test
# Expected: exit code 0 (worktree creation succeeds despite bootstrap failure); warning logged; bootstrap log created at PRPs/reports/worktree-dogfood-bootstrap-test/worktree-bootstrap.log
# Verify:
Test-Path C:\repos\PRPs-agentic-eng\PRPs\reports\worktree-dogfood-bootstrap-test\worktree-bootstrap.log
# Cleanup:
Remove-Item C:\repos\PRPs-agentic-eng\scripts\worktree-bootstrap.sh
git -C C:\repos\PRPs-agentic-eng worktree remove .worktrees\worktree-dogfood-bootstrap-test --force
git -C C:\repos\PRPs-agentic-eng branch -D feature/worktree-dogfood-bootstrap-test
```

Fill in Scenario AC-7 with observed exit code, warning message, and log path.

**Scenario AC-8: Bootstrap absent — relay repo has no scripts/worktree-bootstrap.sh by default:**

```powershell
# Verify no bootstrap script exists
Test-Path C:\repos\PRPs-agentic-eng\scripts\worktree-bootstrap.sh
# Expected: False
# Run relay-worktree (on any fresh feature slug)
/relay-worktree worktree-dogfood-no-bootstrap
# Expected: exit code 0, no warning, no bootstrap log written
$logPath = "C:\repos\PRPs-agentic-eng\PRPs\reports\worktree-dogfood-no-bootstrap\worktree-bootstrap.log"
Test-Path $logPath
# Expected: False (no log created when bootstrap absent)
# Cleanup:
git -C C:\repos\PRPs-agentic-eng worktree remove .worktrees\worktree-dogfood-no-bootstrap --force
git -C C:\repos\PRPs-agentic-eng branch -D feature/worktree-dogfood-no-bootstrap
```

Fill in Scenario AC-8 with observed behavior (no warning, no log).

**Scenario AC-13: `--no-worktree` opt-out:**

```powershell
# Run /relay-execute with --no-worktree flag
/relay-execute PRPs/prds/worktree-dogfood-A.prd.md --no-worktree
# Expected: /relay-worktree is NOT invoked; all stages operate against cwd; orchestrator-run.json has worktree_attempted: false
# Verify no new worktree was created:
git -C C:\repos\PRPs-agentic-eng worktree list
# Should NOT show a second entry for worktree-dogfood-A (if AC-16 worktree already exists, verify orchestrator reused cwd, not the worktree)
```

Fill in Scenario AC-13 with observed orchestrator behavior and `orchestrator-run.json` excerpt.

**Scenario AC-14: Worktree creation failure → graceful fallback (write-protect `.worktrees/`):**

```powershell
# Write-protect the .worktrees/ directory to force a creation failure (Windows)
icacls C:\repos\PRPs-agentic-eng\.worktrees /deny Everyone:(OI)(CI)(W)
# Run relay-execute without --no-worktree against a fresh fixture
/relay-execute PRPs/prds/worktree-dogfood-B.prd.md
# Expected: /relay-worktree fails (permission denied); orchestrator logs warning and falls through to cwd execution; orchestrator-run.json has worktree_attempted: true, worktree_succeeded: false, fallback_reason: <code>; pipeline does NOT halt
# Restore permissions after observation:
icacls C:\repos\PRPs-agentic-eng\.worktrees /reset /T
```

Fill in Scenario AC-14 with observed fallback behavior and `orchestrator-run.json` excerpt.

**After all TIER B scenarios completed:**

```powershell
# Set Cement Decision in the report
# Edit PRPs/reports/relay-worktree/dogfood.md: replace *operator-pending* Cement Decision with PASS or FAIL + rationale

# If PASS: flip Phase 4 row in relay-worktree.prd.md to complete (the orchestrator D8 mutations will do this automatically when /relay-implement completes the TIER A plan, but TIER B manual completion requires a manual PRD back-fill if not routed through /relay-implement)
# If FAIL: iterate Phase 1–3 plans per PRD Phase 4 Success signal instructions
```

### Decisions log reference for this phase

| Decision | Relevance to Phase 4 |
|----------|----------------------|
| D1 (.worktrees/ path) | TIER B AC-16 verification: both worktrees appear at `.worktrees/worktree-dogfood-A/` and `.worktrees/worktree-dogfood-B/` |
| D2 (shell-out git) | Underlying mechanism; TIER B AC-14 write-protect test exercises the failure path |
| D3 (slug derivation) | Both fixture PRD basenames (`worktree-dogfood-A.prd.md`, `worktree-dogfood-B.prd.md`) produce the expected slugs when processed by `/relay-execute` |
| D4 (idempotency) | TIER B AC-3 (silent re-use) and AC-4 (branch divergence HALT) |
| D8 (worktree-creation-failure) | TIER B AC-14 (write-protect test → graceful fallback) |
| D10 (branch prefix) | TIER B AC-16: branches are `feature/worktree-dogfood-A` and `feature/worktree-dogfood-B` |
| D11 (base-ref chain) | TIER B general execution: base ref resolves via `origin/main → origin/master → HEAD` |

*Generated: 2026-05-11*
*Approved: 2026-05-11*
*Implemented: 2026-05-11*
*Status: IMPLEMENTED*
