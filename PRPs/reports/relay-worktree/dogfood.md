# Dogfood Report — relay-worktree

**Plan**: `PRPs/plans/relay-worktree-phase-4-synthetic-dogfood.plan.md`
**Source PRD**: `PRPs/prds/relay-worktree.prd.md`
**Date**: 2026-05-11
**Status**: IN-PROGRESS
**Cement decision**: *operator-pending*

---

## Summary

Phase 4 of the relay-worktree feature delivers the synthetic dogfood validation. This report is structured as a two-tier artifact:

**TIER A (implementer-produced, present in this file):** The fixture PRDs and this report skeleton were created autonomously by the implementer. Each scenario section below pre-populates the expected outcome (verbatim from the source PRD's Acceptance Criteria) and the exact shell command the operator must run. The `*operator-pending*` slots mark where the operator fills in observed outcomes.

**TIER B (operator-action-required, not yet run):** The operator must run the seven scenario commands manually in separate shell sessions after verifying Phase 3 is complete. The implementer agent cannot dispatch `/relay-execute` or `/relay-worktree` recursively from within an orchestrator-driven pipeline (no `Task` tool; no relay slash-command dispatch mechanism available). All seven `*operator-pending*` slots in this report, plus the Cement Decision, require operator action.

### Pre-flight checklist for operator

Before running any TIER B scenario, verify:

```powershell
# 1. Confirm Phase 3 is complete (D4 live wiring shipped)
Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\relay-worktree.prd.md | Select-String "relay-execute D4 live wiring"
# Expected: row showing | 3 | ... | complete | ...

# 2. Confirm both fixture PRDs are APPROVED
Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-A.prd.md | Select-String "Status: APPROVED"
Get-Content C:\repos\PRPs-agentic-eng\PRPs\prds\worktree-dogfood-B.prd.md | Select-String "Status: APPROVED"

# 3. Confirm no stale worktrees from prior attempts
git -C C:\repos\PRPs-agentic-eng worktree list
# If stale entries appear, remove them:
# git worktree remove .worktrees/worktree-dogfood-A --force; git branch -D feature/worktree-dogfood-A
# git worktree remove .worktrees/worktree-dogfood-B --force; git branch -D feature/worktree-dogfood-B
```

---

## Scenario AC-16: Parallel non-collision

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given two distinct PRDs at `PRPs/prds/featureA.prd.md` and `PRPs/prds/featureB.prd.md`, when `/relay-execute` is invoked on both within the same minute (in separate shell sessions), then two worktrees `.worktrees/featureA/` and `.worktrees/featureB/` are created on branches `feature/featureA` and `feature/featureB`, and the two pipelines reach their respective terminal states without any cross-contamination (no shared file edits, no shared branch state). This is the explicit success signal for the Key Hypothesis.

**Expected outcome:** Two non-colliding worktrees created at `.worktrees/worktree-dogfood-A/` (branch `feature/worktree-dogfood-A`) and `.worktrees/worktree-dogfood-B/` (branch `feature/worktree-dogfood-B`). Both pipelines reach their respective terminal states. `git worktree list` shows both entries. Diff inside each worktree shows only its own dogfood file (`dogfood-A.md` and `dogfood-B.md` respectively). Zero cross-contamination.

**Operator shell commands (open two PowerShell sessions within 30 seconds of each other):**

Session 1:
```powershell
cd C:\repos\PRPs-agentic-eng
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
git -C C:\repos\PRPs-agentic-eng\.worktrees\worktree-dogfood-A diff feature/worktree-dogfood-A --name-only
# Expected: plugins/relay/commands/dogfood/dogfood-A.md only
git -C C:\repos\PRPs-agentic-eng\.worktrees\worktree-dogfood-B diff feature/worktree-dogfood-B --name-only
# Expected: plugins/relay/commands/dogfood/dogfood-B.md only
```

**Observed outcome:** *operator-pending*

**Worktree A path observed:** *operator-pending*

**Worktree B path observed:** *operator-pending*

**Pipeline A terminal state:** *operator-pending*

**Pipeline B terminal state:** *operator-pending*

---

## Scenario AC-3: Idempotent re-use

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given `.worktrees/<feature>/` already exists AND its current branch matches `feature/<feature>`, when `/relay-worktree <feature>` is re-invoked, then no git operation runs, the bootstrap script is NOT re-executed, and the command exits with code 0 and message "Worktree at `.worktrees/<feature>/` already exists on branch `feature/<feature>`. Re-using."

**Expected outcome:** Exit code 0. Message "Worktree at `.worktrees/worktree-dogfood-A/` already exists on branch `feature/worktree-dogfood-A`. Re-using." No new git operations. No bootstrap re-execution.

**Operator shell command (run after AC-16 worktrees exist):**
```powershell
# Re-invoke relay-worktree manually on an already-existing worktree
/relay-worktree worktree-dogfood-A
# Expected exit: code 0, message "Worktree at `.worktrees/worktree-dogfood-A/` already exists on branch `feature/worktree-dogfood-A`. Re-using."
# Expected: no git operation runs, no bootstrap re-execution
```

**Observed outcome:** *operator-pending*

**Exit code observed:** *operator-pending*

**Message observed (verbatim):** *operator-pending*

---

## Scenario AC-4: Branch divergence halt

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given `.worktrees/<feature>/` exists but is checked out on a branch OTHER than `feature/<feature>`, when `/relay-worktree <feature>` is invoked, then the command HALTs with `FAILED_BRANCH_DIVERGENCE` and message naming both the expected and actual branch, instructing the user to resolve manually or choose a different feature name.

**Expected outcome:** Non-zero exit. HALT code `FAILED_BRANCH_DIVERGENCE`. Message names expected branch `feature/worktree-dogfood-C` and actual branch `wrong/worktree-dogfood-C`. User instructed to resolve manually or choose a different feature name.

**Operator shell commands:**
```powershell
# Temporarily create a worktree on a wrong branch to simulate divergence
git -C C:\repos\PRPs-agentic-eng worktree add .worktrees\worktree-dogfood-C -b wrong/worktree-dogfood-C HEAD
# Invoke relay-worktree — slug worktree-dogfood-C maps to expected branch feature/worktree-dogfood-C, but actual is wrong/worktree-dogfood-C
/relay-worktree worktree-dogfood-C
# Expected: HALT with FAILED_BRANCH_DIVERGENCE naming expected branch feature/worktree-dogfood-C and actual branch wrong/worktree-dogfood-C
# Cleanup after observation:
git -C C:\repos\PRPs-agentic-eng worktree remove .worktrees\worktree-dogfood-C --force
git -C C:\repos\PRPs-agentic-eng branch -D wrong/worktree-dogfood-C
```

**Observed outcome:** *operator-pending*

**Exit code observed:** *operator-pending*

**HALT message observed (verbatim):** *operator-pending*

---

## Scenario AC-7: Bootstrap failure non-fatal

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given the bootstrap script exits non-zero OR times out at 60s, when the command would otherwise return success, then the command STILL returns success (worktree creation is the load-bearing outcome), a warning is logged to stdout naming the bootstrap log path, and the exit message says "Worktree created. Bootstrap script reported errors — see `PRPs/reports/<feature>/worktree-bootstrap.log` for details."

**Expected outcome:** Exit code 0 (worktree creation succeeds despite bootstrap failure). Warning logged to stdout naming the bootstrap log path. Exit message says "Worktree created. Bootstrap script reported errors — see `PRPs/reports/worktree-dogfood-bootstrap-test/worktree-bootstrap.log` for details." Bootstrap log file exists at that path.

**Operator shell commands:**
```powershell
# Create a deliberately failing bootstrap script
New-Item -Path C:\repos\PRPs-agentic-eng\scripts -ItemType Directory -Force
Set-Content C:\repos\PRPs-agentic-eng\scripts\worktree-bootstrap.sh "#!/usr/bin/env bash`nexit 1"
# Run relay-worktree against a fresh feature slug
/relay-worktree worktree-dogfood-bootstrap-test
# Expected: exit code 0; warning; bootstrap log at PRPs/reports/worktree-dogfood-bootstrap-test/worktree-bootstrap.log
# Verify:
Test-Path C:\repos\PRPs-agentic-eng\PRPs\reports\worktree-dogfood-bootstrap-test\worktree-bootstrap.log
# Cleanup:
Remove-Item C:\repos\PRPs-agentic-eng\scripts\worktree-bootstrap.sh
git -C C:\repos\PRPs-agentic-eng worktree remove .worktrees\worktree-dogfood-bootstrap-test --force
git -C C:\repos\PRPs-agentic-eng branch -D feature/worktree-dogfood-bootstrap-test
```

**Observed outcome:** *operator-pending*

**Exit code observed:** *operator-pending*

**Warning message observed (verbatim):** *operator-pending*

**Bootstrap log exists:** *operator-pending*

---

## Scenario AC-8: Bootstrap absent

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given `scripts/worktree-bootstrap.sh` does NOT exist at repo root, when the command succeeds in creating the worktree, then it exits success without warning, without logging anything to the bootstrap log path, and without prompting the user.

**Expected outcome:** Exit code 0. No warning. No bootstrap log written at `PRPs/reports/worktree-dogfood-no-bootstrap/worktree-bootstrap.log`. No user prompt.

**Operator shell commands:**
```powershell
# Verify no bootstrap script exists (relay repo has none by default)
Test-Path C:\repos\PRPs-agentic-eng\scripts\worktree-bootstrap.sh
# Expected: False
# Run relay-worktree on a fresh feature slug
/relay-worktree worktree-dogfood-no-bootstrap
# Expected: exit code 0, no warning, no bootstrap log
$logPath = "C:\repos\PRPs-agentic-eng\PRPs\reports\worktree-dogfood-no-bootstrap\worktree-bootstrap.log"
Test-Path $logPath
# Expected: False (no log created when bootstrap absent)
# Cleanup:
git -C C:\repos\PRPs-agentic-eng worktree remove .worktrees\worktree-dogfood-no-bootstrap --force
git -C C:\repos\PRPs-agentic-eng branch -D feature/worktree-dogfood-no-bootstrap
```

**Observed outcome:** *operator-pending*

**Exit code observed:** *operator-pending*

**Bootstrap log exists (should be False):** *operator-pending*

**Any warning output observed:** *operator-pending*

---

## Scenario AC-13: --no-worktree opt-out

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given `/relay-execute <prd-path> --no-worktree` is invoked, when the orchestrator runs, then `/relay-worktree` is NOT invoked and all subsequent stages operate against cwd against the current branch (current graceful-degradation behavior preserved verbatim). The flag is documented in `commands.html` and the api-reference.

**Expected outcome:** `/relay-worktree` is NOT invoked. All stages operate against cwd. `orchestrator-run.json` has `worktree_attempted: false`. No new worktree entry in `git worktree list`. Pipeline completes (or halts for other reasons) without worktree creation.

**Operator shell commands:**
```powershell
# Run /relay-execute with --no-worktree flag
/relay-execute PRPs/prds/worktree-dogfood-A.prd.md --no-worktree
# Expected: /relay-worktree is NOT invoked; all stages operate against cwd
# orchestrator-run.json has worktree_attempted: false
# Verify no new worktree was created:
git -C C:\repos\PRPs-agentic-eng worktree list
# Should NOT show a new worktree-dogfood-A entry (or if AC-16 worktree still exists, orchestrator should have used cwd, not the worktree)
# Check orchestrator-run.json:
Get-Content C:\repos\PRPs-agentic-eng\PRPs\reports\worktree-dogfood-A\phase-1\orchestrator-run.json 2>&1 | Select-String "worktree_attempted"
# Expected: "worktree_attempted": false
```

**Observed outcome:** *operator-pending*

**`worktree_attempted` value in orchestrator-run.json:** *operator-pending*

**orchestrator-run.json excerpt (worktree fields):** *operator-pending*

---

## Scenario AC-14: Worktree creation failure (write-protect)

**Source PRD AC text (verbatim from `PRPs/prds/relay-worktree.prd.md`):**
> Given `/relay-worktree` returns a non-zero exit code during a `/relay-execute` run AND `--no-worktree` was not passed, when the orchestrator catches the failure, then it logs a warning, falls through to cwd-based execution (D3/D4 graceful-degradation), and records the fallback in `orchestrator-run.json` with `worktree_attempted: true, worktree_succeeded: false, fallback_reason: <code>`. The pipeline does NOT halt on worktree failure — only on downstream stage failure.

**Expected outcome:** `/relay-worktree` fails (permission denied). Orchestrator logs warning. Falls through to cwd-based execution. Pipeline does NOT halt. `orchestrator-run.json` has `worktree_attempted: true`, `worktree_succeeded: false`, `fallback_reason: <code>`.

**Operator shell commands (Windows write-protect method):**
```powershell
# Write-protect the .worktrees/ directory to force creation failure
icacls C:\repos\PRPs-agentic-eng\.worktrees /deny Everyone:(OI)(CI)(W)
# Run relay-execute without --no-worktree against a fresh fixture
/relay-execute PRPs/prds/worktree-dogfood-B.prd.md
# Expected: /relay-worktree fails; orchestrator logs warning; falls through to cwd execution
# Pipeline does NOT halt; orchestrator-run.json records the fallback
# Restore permissions after observation:
icacls C:\repos\PRPs-agentic-eng\.worktrees /reset /T
# Check orchestrator-run.json for fallback fields:
Get-Content C:\repos\PRPs-agentic-eng\PRPs\reports\worktree-dogfood-B\phase-1\orchestrator-run.json 2>&1 | Select-String "worktree_attempted|worktree_succeeded|fallback_reason"
```

**Observed outcome:** *operator-pending*

**`worktree_attempted` value in orchestrator-run.json:** *operator-pending*

**`worktree_succeeded` value in orchestrator-run.json:** *operator-pending*

**`fallback_reason` value in orchestrator-run.json:** *operator-pending*

**Pipeline halted on worktree failure (should be No):** *operator-pending*

**orchestrator-run.json excerpt (worktree fallback fields):** *operator-pending*

---

## Cement Decision

**Result:** *operator-pending*

**Rationale:** *operator-pending* (operator fills in after all 7 scenarios above are completed: PASS if all scenarios produce outcomes matching the expected outcomes above; FAIL if any scenario deviates, with specific scenario numbers and deviations named here)

**Next steps if PASS:**
- Flip Phase 4 row in `PRPs/prds/relay-worktree.prd.md` from `in-progress` to `complete` (if the D8 mutations from `/relay-implement` did not already do this).
- Proceed to Phase 5 (Docs + v0.11.0 release cut).

**Next steps if FAIL:**
- Per Phase 4 Success signal in the source PRD: "any FPs surfaced lead to Phase 1–3 iteration before Phase 5 cuts the release."
- File a follow-up plan against the specific Phase (1, 2, or 3) where the gap was found.
- Re-run affected scenarios after the iteration.

---

*Generated: 2026-05-11*
*Status: IN-PROGRESS*
