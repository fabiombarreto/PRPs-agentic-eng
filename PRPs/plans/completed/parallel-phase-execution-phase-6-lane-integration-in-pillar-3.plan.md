# Feature: Lane integration in Pillar 3 (Phase 6 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: changes three shipped Pillar 3 command surfaces; relaxes a named HALT that today fires unconditionally; touches the boundary between Pillar 2 and Pillar 3
- Decisions found:
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute` does NOT commit or create a PR — integration is git work, so it belongs where committing already does, never in the orchestration loop
  - [2026-05-18] Pillar 3 command surface: `/relay-commit` + `/relay-pr` + `/relay-approve` (three-command split) — integration joins the first, not a fourth command
  - [2026-09-01] One PR per repository (multi-repo topology) — lane integration collapses N lane branches into ONE branch per repo, which is what keeps that guarantee true under concurrency
  - [2026-07-27] Orchestrator resumability and `/relay-visual-approve` as the third interactivity extension — the multiple-pending halt this phase relaxes was written under an explicit serial assumption
  - [2026-05-11] relay-worktree D10 — the `feature/` branch prefix is preserved; lane branches are `feature/<feature>-lane-<k>` and integrate into `feature/<feature>`
- Applicable anti-patterns:
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:80) — integration is deterministic git work in Pillar 3, which is already operator-driven
  - Writing pipeline artifacts under the agent config directory (:61)
  - Weakening or deleting tests to make the loop turn green (:15)
- Applicable architectural rules:
  - Graceful degradation: with one lane, integration is a no-op and every Pillar 3 command behaves exactly as today
  - Three-pillar architecture; `PRPs/` artifact paths; the four sanctioned interactivity extensions, unchanged
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 6:
  "Lane integration in Pillar 3" — Goal: Turn N lane branches back into one
  branch per repository. — Success signal: A feature built across three lanes
  produces one PR per repository, and two paused lanes can both be approved.

## Summary

Phase 2 gave each lane its own branch because git leaves no alternative. That
makes N branches where Pillar 3 expects one, so this phase teaches
`/relay-commit` to integrate a repository's lane branches into its
`feature/<feature>` branch before any PR is opened — preserving the one-PR-per-
repository guarantee that `multi-repo-topology` shipped. It also relaxes
`/relay-visual-approve`'s `FAILED_MULTIPLE_PENDING_APPROVALS`, which today calls
more than one pending approval "unexpected under this track's serial execution
model" and refuses; once lanes exist that is routine, and refusing would block
every paused phase. Integration belongs in Pillar 3 rather than the orchestration
loop because Pillar 2 never commits — a permanent boundary, not a deferral.

## User Story

As a relay operator whose feature was built across three lanes,
I want one branch and one pull request per repository at the end,
So that concurrency inside the pipeline does not leak into how I review the work.

## Problem Statement

A lane's isolation is its own branch, which means a three-lane feature ends with
`feature/<feature>-lane-1`, `-lane-2` and `-lane-3` and no
`feature/<feature>` carrying the whole change. `/relay-commit`'s worktree mode
verifies the worktree is on `feature/<feature>` and HALTs with
`FAILED_WRONG_BRANCH` otherwise, so it would refuse every lane branch. Separately,
`/relay-visual-approve` HALTs with `FAILED_MULTIPLE_PENDING_APPROVALS` when more
than one unresolved approval exists, explicitly calling that "unexpected under
this track's serial execution model (D6)" — a statement that stops being true the
moment lanes run, at which point the halt fires as routine and blocks approval of
any paused phase.

## Solution Statement

Add an integration step to `/relay-commit`'s worktree mode that runs before its
branch check: when lane branches exist for the feature in this repository, merge
each into `feature/<feature>` in lane order, then proceed with the existing flow
unchanged. Record a merge conflict as evidence that `Depends` was wrong rather
than as a routine failure — lanes are disjoint by construction, so a real
conflict means two chains the graph believed independent touched the same file,
which is worth surfacing loudly. Relax the multiple-pending-approval halt to
present every paused lane and let the operator choose, keeping the halt only for
the case it was written for. Leave `/relay-pr` opening one PR per repository
exactly as it does, because after integration there is again exactly one branch
per repository to open it from.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/lane-model.md`, `plugins/relay/commands/relay-commit.md`, `plugins/relay/commands/relay-visual-approve.md`, `plugins/relay/commands/relay-pr.md` |
| Dependencies | Phases 2 and 5 — both `complete` |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:191` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-commit.md` | 40-110 | Worktree mode's per-member flow and its A.0 branch check — the step integration must precede, and the `FAILED_WRONG_BRANCH` halt that would otherwise refuse every lane branch. |
| P0 | `plugins/relay/commands/relay-visual-approve.md` | 80-100 | The `FAILED_MULTIPLE_PENDING_APPROVALS` halt and its explicit serial-model justification — the sentence this phase must reconcile with concurrency. |
| P0 | `plugins/relay/resources/lane-model.md` | 1-460 | All five sections shipped by phases 1-5; integration is the sixth and consumes the worktree-identity and dispatch rules directly. |
| P1 | `plugins/relay/commands/relay-pr.md` | 1-40 | The one-PR-per-repository guarantee integration exists to preserve; this phase changes nothing here beyond a pointer. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-11 and AC-13 verbatim — one PR per repository after lane integration, and two paused lanes both approvable. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-commit.md:91-99
git -C <repo_root>/.worktrees/<feature>/ branch --show-current
```
Task 2 inserts the integration step immediately BEFORE this check, so that by
the time the branch check runs there is again exactly one branch to find. The
check itself is not modified — which is what keeps a single-lane run
byte-identical.

```
# SOURCE: plugins/relay/commands/relay-visual-approve.md:89-92
> FAILED_MULTIPLE_PENDING_APPROVALS: More than one unresolved
> AWAITING_VISUAL_APPROVAL halt was found for `<feature>`:
> `<list of matched phase-<N> paths>`. This is unexpected under this
> track's serial execution model (D6) — inspect by hand.
```
Task 3 keeps this halt for the case it was written for and adds a lane-aware
branch ahead of it. The message's own words — "unexpected under this track's
serial execution model" — are what date it: the condition it calls unexpected
becomes the normal case the moment lanes exist.

```
# SOURCE: plugins/relay/resources/lane-model.md:1-11
# Lane Model Contract

Shared, plugin-owned contract defining what a **lane** is — the unit of work
relay may run concurrently — how lanes are derived from an Implementation Phases
table, and what the `Parallel` column is allowed to say about them.
```
Task 1 adds integration as the contract's sixth section rather than opening a
separate authority for it, keeping every lane rule in one file.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/lane-model.md` | UPDATE | Define the integration order, the one-branch-per-repository outcome, and what a merge conflict means. |
| `plugins/relay/commands/relay-commit.md` | UPDATE | Integrate lane branches before the existing branch check, so the check finds what it expects. |
| `plugins/relay/commands/relay-visual-approve.md` | UPDATE | Relax the multiple-pending halt to present paused lanes rather than refuse them. |
| `plugins/relay/commands/relay-pr.md` | UPDATE | Point at integration as the precondition for the one-PR-per-repository guarantee under concurrency. |

## NOT Building (Scope Limits)

- **Committing from the orchestration loop.** Pillar 2 never commits — a
  permanent boundary. Integration is git work and belongs in Pillar 3.
- **Deleting lane branches after integration.** The PRD records this as an open
  question (audit trail versus tidiness); resolving it is not this phase's call.
- **Auto-resolving a merge conflict between lanes.** A conflict is evidence that
  `Depends` was wrong, and silently resolving it would destroy the signal.
- **The synthetic fixture and the negative case.** Phase 7.
- **Changing `/relay-pr`'s PR-opening behaviour.** After integration there is one
  branch per repository again, which is exactly what it already expects.
- **Adding a validation check.** The invariants here are cross-file content
  claims asserted directly by this plan's Level 2; the check count stays 23.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/resources/lane-model.md`

**ACTION**: Add a section headed byte-exactly `## Lane integration in Pillar 3`,
placed after `## Lane dispatch` and before `## Named-code registry`. It defines:
(a) **Where integration happens** — in `/relay-commit`, before its branch check,
never in the orchestration loop. State the reason: Pillar 2 never commits, and
integration is git work.
(b) **The order** — for each participating repository, merge each
`feature/<feature>-lane-<k>` into `feature/<feature>` in ascending lane order,
then proceed with the existing commit flow. After integration there is exactly
one branch per repository, which is what preserves the one-PR-per-repository
guarantee under concurrency.
(c) **What a conflict means** — lanes are disjoint by construction, because a
lane is a connected component of the `Depends` graph and independent chains touch
different files. A real merge conflict is therefore evidence that `Depends` was
WRONG: two chains the graph believed independent modified the same file. Record
that this must be surfaced loudly and never auto-resolved, since auto-resolving
destroys exactly the signal worth having.
(d) **Degradation** — with a single lane there is no lane branch to integrate and
every Pillar 3 command behaves exactly as it does today.
(e) **Register the new code.** Add a `FAILED_LANE_INTEGRATION_CONFLICT` row to
the contract's existing `## Named-code registry` section, in the same
one-backticked-code-per-line, em-dash-then-condition shape the two existing rows
use. Without this the code is one no operator can look up, and `lane-contract`
would fail on it as a cited-but-undefined code — which is precisely the defect
that check exists to catch.
Delivers **AC-A1** and **AC-A5**.
**MIRROR**: `# SOURCE: plugins/relay/resources/lane-model.md:1-11`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
for H in '^## Lane dispatch$' '^## Lane integration in Pillar 3$' '^## Named-code registry$'; do
  C=$(grep -c "$H" "$L")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
D=$(grep -n '^## Lane dispatch$' "$L" | cut -d: -f1)
I=$(grep -n '^## Lane integration in Pillar 3$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$D" -lt "$I" ] && [ "$I" -lt "$R" ]; then echo "PASS: integration section correctly placed"; else echo "FAIL: order $D / $I / $R"; exit 1; fi
# The conflict-means-Depends-was-wrong finding is the section's real content;
# without it this is just a merge instruction.
grep -qi 'Depends' "$L"
grep -qi 'never auto-resolved\|never be auto-resolved\|auto-resolving' "$L"
grep -q 'feature/<feature>-lane-<k>' "$L"
# The new code must be REGISTERED, not merely used: an unregistered code is one
# no operator can look up, and lane-contract fails on it from the consumer side.
awk '/^## Named-code registry$/{f=1;next} f&&/^## /{f=0} f&&/FAILED_LANE_INTEGRATION_CONFLICT/{found=1} END{if(!found){print "FAIL: FAILED_LANE_INTEGRATION_CONFLICT is not in the named-code registry"; exit 1} print "PASS: new code registered"}' "$L"
echo "PASS: integration order, branch shape and conflict finding all present"
```

### Task 2: UPDATE `plugins/relay/commands/relay-commit.md`

**ACTION**: Add a section headed byte-exactly
`## A.-1 — Lane-branch integration (runs before the branch check)` immediately
before `## A.0 — Branch check`. It states: list branches matching
`feature/<feature>-lane-*` in this repository; if none exist, this step is a
no-op and A.0 proceeds exactly as today; otherwise merge each into
`feature/<feature>` in ascending lane order, then continue to A.0, which will now
find the branch it expects. On a merge conflict, HALT with a named code
`FAILED_LANE_INTEGRATION_CONFLICT` naming both lane branches and the contended
path, and state that this indicates the source PRD's `Depends` column was wrong
rather than a routine merge problem, so it must not be auto-resolved. It must
name `resources/lane-model.md` as the authority rather than restating the rules.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-commit.md:91-99`
**VALIDATE**:
```bash
set -euo pipefail
C=plugins/relay/commands/relay-commit.md
grep -q '^## A.-1 — Lane-branch integration (runs before the branch check)$' "$C"
grep -q 'FAILED_LANE_INTEGRATION_CONFLICT' "$C"
grep -q 'resources/lane-model.md' "$C"
# It must precede the branch check, or the check would still refuse lane branches.
I=$(grep -n '^## A.-1 — Lane-branch integration' "$C" | head -1 | cut -d: -f1)
B=$(grep -n '^## A.0 — Branch check$' "$C" | head -1 | cut -d: -f1)
if [ "$I" -lt "$B" ]; then echo "PASS: integration precedes the branch check"; else echo "FAIL: positions integration=$I branch-check=$B"; exit 1; fi
# The existing branch check must SURVIVE unmodified — that is what keeps a
# single-lane run byte-identical.
grep -q 'FAILED_WRONG_BRANCH' "$C"
echo "PASS: integration added, existing branch check intact"
```

### Task 3: UPDATE `plugins/relay/commands/relay-visual-approve.md`

**ACTION**: Amend the `FAILED_MULTIPLE_PENDING_APPROVALS` precondition. Before
the existing "If more than one remains" HALT branch, add a branch beginning
byte-exactly `**Lane-aware branch.**` stating: when the matched pending
approvals belong to DIFFERENT lanes, more than one is expected rather than
unexpected, so present all of them — each with its phase number, its lane and its
fidelity-report path — and let the operator choose which to act on, rather than
halting. Keep the existing HALT for the case it was written for: more than one
unresolved approval within a SINGLE lane, which remains unexpected because a lane
runs its phases sequentially. Do not delete the existing halt or its message.
Delivers **AC-A3**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-visual-approve.md:89-92`
**VALIDATE**:
```bash
set -euo pipefail
V=plugins/relay/commands/relay-visual-approve.md
grep -q '^\*\*Lane-aware branch\.\*\*' "$V"
# The original halt must SURVIVE — it is still correct within one lane.
grep -q 'FAILED_MULTIPLE_PENDING_APPROVALS' "$V"
grep -q "unexpected under this" "$V"
# The lane-aware branch must come BEFORE the halt it qualifies, or the halt
# fires first and the branch is unreachable.
LA=$(grep -n '^\*\*Lane-aware branch\.\*\*' "$V" | head -1 | cut -d: -f1)
HALT=$(grep -n 'If more than one remains: HALT' "$V" | head -1 | cut -d: -f1)
if [ "$LA" -lt "$HALT" ]; then
  echo "PASS: the lane-aware branch precedes the halt it qualifies"
else
  echo "FAIL: lane-aware branch at $LA does not precede the halt at $HALT"; exit 1
fi
```

### Task 4: UPDATE `plugins/relay/commands/relay-pr.md`

**ACTION**: Add a paragraph beginning byte-exactly
`**Lane integration is a precondition.**` stating that under lane execution a
repository's lane branches are integrated into its `feature/<feature>` branch by
`/relay-commit` BEFORE this command runs, so `/relay-pr` still finds exactly one
branch per repository and opens exactly one PR per repository, unchanged. It must
name `resources/lane-model.md` as the authority. Change nothing else in this
file — the PR-opening behaviour is deliberately untouched.
Delivers **AC-A4**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-commit.md:91-99`
**VALIDATE**:
```bash
set -euo pipefail
P=plugins/relay/commands/relay-pr.md
grep -q '^\*\*Lane integration is a precondition\.\*\*' "$P"
grep -q 'resources/lane-model.md' "$P"
# The one-PR-per-repository guarantee must still be stated somewhere in the file.
grep -qi 'one PR per' "$P" || grep -qi 'per repository' "$P"
echo "PASS: precondition noted, one-PR-per-repository guarantee intact"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
VOUT=${VOUT:-$(npm run validate 2>&1)}
printf '%s
' "$VOUT" | grep -q '^\[PASS\] line-endings$'
VOUT=${VOUT:-$(npm run validate 2>&1)}
printf '%s
' "$VOUT" | grep -q '^\[PASS\] path-existence$'
# The two assertions above are pure regression checks — both are green on an
# untouched tree, so on their own this level could not tell the phase's work
# from its absence. The structural assertions below are this phase's own.
L=plugins/relay/resources/lane-model.md
# Every h2 heading in the contract must be unique: a duplicate would give two
# sections the same anchor and make every position-based guard in this plan
# ambiguous.
DUPES=$(grep -E '^## ' "$L" | sort | uniq -d)
if [ -n "$DUPES" ]; then
  echo "FAIL: duplicate h2 headings in the lane contract:"; printf '%s
' "$DUPES"; exit 1
fi
# The new code must be shaped like every other named code in this pipeline.
if ! grep -qE 'FAILED_LANE_INTEGRATION_CONFLICT' "$L"; then
  echo "FAIL: FAILED_LANE_INTEGRATION_CONFLICT absent from the contract"; exit 1
fi
echo "PASS: contract headings unique, new code present and well-formed"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
# The integration ordering is the whole of AC-11: integrate, THEN open the PR.
# Asserted across all three surfaces, because the guarantee is cross-file and
# any one of them drifting alone would break it silently.
grep -q '^## A.-1 — Lane-branch integration (runs before the branch check)$' plugins/relay/commands/relay-commit.md
grep -q '^\*\*Lane integration is a precondition\.\*\*' plugins/relay/commands/relay-pr.md
grep -q '^\*\*Lane-aware branch\.\*\*' plugins/relay/commands/relay-visual-approve.md
# The new named code must be defined in the contract's registry, or it is a code
# no operator can look up — the exact defect lane-contract exists to catch.
grep -q 'FAILED_LANE_INTEGRATION_CONFLICT' plugins/relay/resources/lane-model.md
VOUT=${VOUT:-$(npm run validate 2>&1)}
printf '%s
' "$VOUT" | grep -q '^\[PASS\] lane-contract$'
# Every contract section from phases 1-6 must still be present.
L=plugins/relay/resources/lane-model.md
for H in '^## Lane derivation$' '^## Worktree identity$' '^## Lane outcomes and state ownership$' '^## Runtime safety and the concurrency cap$' '^## Lane dispatch$' '^## Lane integration in Pillar 3$'; do
  if ! grep -q "$H" "$L"; then echo "FAIL: contract lost section $H"; exit 1; fi
done
echo "PASS: integration ordering asserted across all three surfaces; contract intact"
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
# The phase-specific assertion: without it, `npm run validate` alone is green on
# the unmodified tree and this level cannot tell the phase's work from its absence.
grep -q 'FAILED_LANE_INTEGRATION_CONFLICT' plugins/relay/commands/relay-commit.md
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** `lane-model.md` carries a
  `## Lane integration in Pillar 3` section stating where integration happens and
  why, the ascending-lane-order merge into `feature/<feature>`, and the finding
  that a merge conflict is evidence `Depends` was wrong and must never be
  auto-resolved.
- **AC-A2 (PRD AC-11):** `relay-commit.md` integrates lane branches in a step
  that precedes its existing branch check, is a no-op when no lane branch exists,
  and HALTs with `FAILED_LANE_INTEGRATION_CONFLICT` on a conflict — with the
  existing `FAILED_WRONG_BRANCH` check left intact.
- **AC-A3 (PRD AC-13):** `relay-visual-approve.md` presents multiple pending
  approvals when they belong to different lanes, rather than halting, while
  keeping the original halt for multiple pending approvals within one lane.
- **AC-A4 (PRD AC-11):** `relay-pr.md` records that integration is a
  precondition, so it still opens exactly one PR per repository.
- **AC-A5 (PRD AC-1):** the new named code is registered in the contract's
  named-code registry, so `lane-contract` resolves it and an operator who sees
  the code can look it up.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Integration silently changes a single-lane run | M | H | The step is a documented no-op when no lane branch exists, and Task 2's VALIDATE asserts the existing branch check survives unmodified |
| A lane merge conflict is auto-resolved, destroying the signal that `Depends` was wrong | M | H | The contract states plainly it must never be auto-resolved, and the named HALT surfaces both branches and the contended path |
| Relaxing the multiple-pending halt lets a genuine within-lane anomaly through | M | M | The original halt is preserved for exactly that case; only the cross-lane case is presented instead of refused |
| The new named code is used but never registered, so an operator cannot look it up | M | M | AC-A5 and Level 2 both assert its presence in the registry, and `lane-contract` fails on a cited-but-undefined code |
| Lane branches accumulate after integration | H | L | Out of scope by decision — the PRD records deletion versus audit-trail as an open question rather than assuming an answer |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework.
- **Grounding method.** GROUNDING was performed inline with `Grep`/`Read` rather
  than by dispatching the research subagents, per the standing operator
  instruction in this session. Every `# SOURCE:` anchor is a verified
  `file:line`.
- **Why this phase adds no validation check.** Its invariants are cross-file
  content claims, and Level 2 asserts all three surfaces together — which is the
  form that actually catches the failure, since any one surface drifting alone
  breaks the guarantee. Adding a module to wrap three greps would be ceremony.
  Phase 4 set the same precedent for the same reason. The check count stays 23.
- **The conflict is the interesting case.** Lanes are disjoint by construction:
  a lane is a connected component of the `Depends` graph, so two lanes touching
  one file means the graph was wrong about their independence. That makes a merge
  conflict a *correctness signal about the PRD*, not a routine git event — which
  is why it halts by name and why auto-resolution is forbidden rather than merely
  discouraged.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
