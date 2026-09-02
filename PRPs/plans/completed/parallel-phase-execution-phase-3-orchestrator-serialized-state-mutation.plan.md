# Feature: Orchestrator-serialized state mutation (Phase 3 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: changes who may write the source PRD's Implementation Phases table — relay's canonical state machine; adds a contract section three shipped surfaces are held to; registers a new validation check
- Decisions found:
  - [2026-05-01] The source PRD's Implementation Phases table IS the state machine (D6) — there is no separate state file, so "who writes it" is the whole of the concurrency question
  - [2026-08-05] Five-state phase lifecycle, with the last two transitions owned by `/relay-execute` — this phase extends that ownership to cover every lane-reported transition rather than inventing a lock
  - [2026-04-19] Command surface: one command per stage, writer and reviewer split — lanes adopt the same protocols; nothing is bundled or duplicated
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/` — the ownership rule extends the lane contract
  - [2026-05-18] Pillar 2 never commits — serializing mutations changes who writes files, never whether a commit happens
- Applicable anti-patterns:
  - Writing pipeline artifacts under the agent config directory (docs/anti-patterns.md:61)
  - Relying on interactive permission prompts in the autonomous loop (:80) — serialization is structural, adding no prompt
  - Weakening or deleting tests to make the loop turn green (:15) — the new check ships with its failing direction exercised
- Applicable architectural rules:
  - Graceful degradation: a serial run has exactly one lane, so "the orchestrator applies every mutation" describes today's behaviour unchanged
  - Three-pillar Pillar 2; `PRPs/` artifact paths; writer/reviewer split
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 3:
  "Orchestrator-serialized state mutation" — Goal: Keep exactly one writer for
  every piece of state two lanes would otherwise contend on. — Success signal:
  After a three-lane run, the phase table reflects each phase exactly once and
  the audit log contains every lane's record with none lost.

## Summary

Under concurrency the source PRD's Implementation Phases table has three writers
performing non-atomic read-modify-write, and `orchestrator-run.json` is
overwritten wholesale at three points in a session. This phase removes the race
by construction rather than guarding it: a lane returns a structured outcome and
writes neither surface, and the orchestrator — which already owns two of the five
lifecycle transitions — applies every reported mutation serially as lanes report.
That extends ownership relay already has instead of introducing the codebase's
first lock. The per-plan verdict logs are explicitly excluded, because they are
keyed by plan basename and are therefore already per phase; guarding them would
be effort spent on a resource nothing contends for. A new check holds the
contract's registry of shared-state writers to naming surfaces that actually
exist and actually carry the anchors it claims.

## User Story

As the relay orchestrator running three lanes at once,
I want lanes to report what happened rather than write it,
So that the phase table reflects each phase exactly once and no lane's audit
record is lost to another lane's overwrite.

## Problem Statement

The source PRD's Implementation Phases table has three writers with non-atomic
read-modify-write: `plan-writer` reads the table in Step 1.3 and writes
`in-progress` in the separate, later Step 5.1; `/relay-implement`'s D8 Mutation c
writes `implemented`; `/relay-execute`'s `flip_row_status` reads the whole file,
locates the row, then edits one cell. Each is a read, a gap, and a write.
`orchestrator-run.json` is worse: it is overwritten wholesale at three points in
a session and additionally patched best-effort by `/relay-pr` and
`/relay-approve`, so last-writer-wins is implied by the word "overwrite" and
named as a risk nowhere. Neither surface is safe once two lanes run at once.

## Solution Statement

Declare, in the lane contract, that a lane is **read-only over shared state**: it
returns a structured outcome naming the phase, the stage, the verdict and any
artifacts it produced, and it writes neither the source PRD table nor the audit
log. The orchestrator applies every reported mutation serially, in the order
lanes report, extending the ownership it already holds over the `tested` and
`complete` transitions. Record which surfaces are shared and which are not, so
the exclusion of the per-plan verdict logs is a stated finding rather than an
omission. Guard the registry with a check that verifies each named writer exists
and still carries the anchor the contract attributes to it.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/lane-model.md`, `plugins/relay/commands/relay-execute.md`, `scripts/validate/` |
| Dependencies | Phase 1 (lane model) — `complete` |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:188` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-execute.md` | 795-830 | `flip_row_status` — the orchestrator's existing serialized row-mutation procedure, and the shape the lane-reported mutations extend rather than replace. |
| P0 | `plugins/relay/resources/lane-model.md` | 1-215 | The contract this extends; its `## Worktree identity` section is the immediate sibling the new section sits beside. |
| P0 | `plugins/relay/commands/relay-implement.md` | 625-650 | D8 Mutation c — the second of the three PRD-table writers, and the anchor the new registry attributes to that file. |
| P1 | `plugins/relay/agents/plan-writer.md` | 1283-1320 | Step 5.1 — the third PRD-table writer, and the third registry anchor. |
| P1 | `scripts/validate/checks/lane-worktree-parity.mjs` | 1-160 | The check pattern established in phase 2, including the explicit vacuity guard the new check reuses. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-6 verbatim — lanes return outcomes, the orchestrator applies mutations serially, and the final table reflects every phase exactly once. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-execute.md:802
**`flip_row_status(<expected-from-set>, <to>)`:**
```
Task 2 mirrors this procedure's contract: a named operation the orchestrator
performs on one row, with an expected source state and a target state. The
lane-reported mutations are applied through exactly this procedure rather than
through a second mechanism beside it — which is what makes "the orchestrator
applies every mutation" true rather than aspirational.

```
# SOURCE: scripts/validate/checks/lane-worktree-parity.mjs:118-128
  if (creationCommandsSeen === 0) {
    findings.push({
      message:
        'no worktree-creation command found in any scanned source — a parity check with nothing to compare ' +
        'passes by vacuity; confirm the sources are readable and still carry `git worktree add ... -b feature/...`',
      file: CANDIDATE_SOURCES[0],
      line: null,
    });
  }
```
Task 3 copies this vacuity guard directly. A registry check whose parsed row set
has silently emptied would report a clean pass while verifying nothing, which is
the same defect in a different surface.

```
# SOURCE: plugins/relay/resources/repository-topology.md:215-224
  (heading: "Named-code registry", at h2 level)

  - `FAILED_TOPOLOGY_MALFORMED_ROW` — a table row has the wrong cell count, an empty `Repo`/`Path`, or an unrecognized `Role`.
  - `FAILED_TOPOLOGY_PATH_UNRESOLVED` — a declared `Path` or `Git root` does not resolve to an existing directory.
```
Task 1 mirrors the registry idiom: the contract is the single authority for a
set of facts about other files, stated as a parseable list so a check can hold
those facts to being true.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/lane-model.md` | UPDATE | Add the lane-outcome shape, the read-only rule, and the shared-state writer registry to the contract that already owns lane semantics. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | State that the orchestrator applies lane-reported mutations serially through the existing `flip_row_status` procedure, and that lanes never write shared state. |
| `scripts/validate/checks/lane-state-writers.mjs` | CREATE | Hold the registry's claims about other files to being true: each named surface exists and carries the anchor attributed to it. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check. |
| `CLAUDE.md` | UPDATE | The advertised check count moves 21 to 22. |

## NOT Building (Scope Limits)

- **A lock, a mutex, or a file-based semaphore.** The design removes the shared
  write instead; a lock would be this codebase's first, in a pipeline whose every
  concurrency mention today is a deferral.
- **Actually dispatching lanes concurrently.** Phase 5.
- **The runtime-safety gate and the concurrency cap.** Phase 4.
- **Guarding the per-plan `.review.jsonl` / `.code-review.jsonl` logs.** They are
  keyed by plan basename and therefore already per phase; the contract records
  this as a finding so the exclusion is deliberate rather than overlooked.
- **Replacing the D18 soft-fail concurrency diagnostic with real detection.**
  A Should-item in the PRD's MoSCoW, not part of this phase's Must set.
- **Changing any of the three existing writers' own behaviour.** They are
  registered here, not rewritten; a serial run must keep writing exactly as today.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/resources/lane-model.md`

**ACTION**: Add a section headed byte-exactly `## Lane outcomes and state
ownership`, placed after `## Worktree identity` and before `## Named-code
registry`. It defines:
(a) **The read-only rule** — a lane writes neither the source PRD's
Implementation Phases table nor `PRPs/reports/<feature>/orchestrator-run.json`.
It returns a structured outcome and the orchestrator performs the write.
(b) **The lane outcome shape** — a fenced JSON example carrying `lane`, `phase`,
`stage`, `outcome`, `artifacts` and `requested_transition`, where
`requested_transition` names the row status the lane believes the phase reached
and the orchestrator is free to reject.
(c) **Serialization** — the orchestrator applies reported mutations one at a
time, in the order lanes report, through the `flip_row_status` procedure it
already owns. State that this extends existing ownership rather than adding a
lock, and why: a lock would be the codebase's first.
(d) **A shared-state writer registry** — a table whose header is byte-exactly
`| Surface | Anchor | Writes |`, with one row per surface that writes shared
state today: `plugins/relay/agents/plan-writer.md` / `Step 5.1` / the
`pending` to `in-progress` back-fill; `plugins/relay/commands/relay-implement.md`
/ `Mutation c` / `in-progress` to `implemented`; and
`plugins/relay/commands/relay-execute.md` / `flip_row_status` / `tested` and
`complete`.
(e) **What is NOT shared** — the per-plan `.review.jsonl` and
`.code-review.jsonl` logs are keyed by plan basename and therefore already per
phase. Record this explicitly as a finding, so the exclusion reads as a decision
rather than an oversight.
Delivers **AC-A1**, and jointly with Task 3 delivers **AC-A4**.
**MIRROR**: `# SOURCE: plugins/relay/resources/repository-topology.md:215-224`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
for H in '^## Worktree identity$' '^## Lane outcomes and state ownership$' '^## Named-code registry$'; do
  C=$(grep -c "$H" "$L")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
W=$(grep -n '^## Worktree identity$' "$L" | cut -d: -f1)
S=$(grep -n '^## Lane outcomes and state ownership$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$W" -lt "$S" ] && [ "$S" -lt "$R" ]; then
  echo "PASS: the ownership section sits between Worktree identity and the registry"
else
  echo "FAIL: section order is $W / $S / $R"; exit 1
fi
# The registry must be present with its exact header and all three writers.
grep -q '^| Surface | Anchor | Writes |$' "$L"
for A in 'plan-writer.md' 'relay-implement.md' 'relay-execute.md'; do
  grep -q "$A" "$L"
done
grep -q 'requested_transition' "$L"
# The not-shared finding must be stated, not merely implied.
grep -q 'code-review.jsonl' "$L"
echo "PASS: registry, outcome shape and not-shared finding all present"
```

### Task 2: UPDATE `plugins/relay/commands/relay-execute.md`

**ACTION**: In `### Phase A.4.9 — Shared procedure: orchestrator-owned PRD
row-status flip`, immediately after step 6 of the `flip_row_status` procedure
(`On success, record `flip_success: true` and return.`) and before
`### Phase A.5`, add a paragraph beginning byte-exactly
`**Lane-reported mutations use this same procedure.**` It must follow the
procedure's definition rather than precede it — the paragraph explains how the
procedure is used, which only reads correctly once the procedure exists.
It states that when a lane reports a completed stage, the orchestrator — not the
lane — calls `flip_row_status`, applying reported mutations one at a time in the
order received; that a lane writes neither the Implementation Phases table nor
`orchestrator-run.json`; and that under serial execution there is exactly one
lane, so this describes today's behaviour unchanged. It must name
`resources/lane-model.md` as the authority for the outcome shape rather than
restating it.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-execute.md:802`
**VALIDATE**:
```bash
set -euo pipefail
E=plugins/relay/commands/relay-execute.md
grep -q 'Lane-reported mutations use this same procedure' "$E"
grep -q 'resources/lane-model.md' "$E"
# It must live inside Phase A.4.9, after the flip_row_status definition — not
# somewhere else in the file where it would not govern the procedure.
F=$(grep -n '\*\*`flip_row_status(<expected-from-set>, <to>)`:\*\*' "$E" | head -1 | cut -d: -f1)
M=$(grep -n 'Lane-reported mutations use this same procedure' "$E" | head -1 | cut -d: -f1)
A5=$(grep -n '^### Phase A.5 ' "$E" | head -1 | cut -d: -f1)
if [ "$F" -lt "$M" ] && [ "$M" -lt "$A5" ]; then
  echo "PASS: the lane-mutation paragraph sits inside Phase A.4.9"
else
  echo "FAIL: positions are flip=$F para=$M A.5=$A5"; exit 1
fi
```

### Task 3: CREATE `scripts/validate/checks/lane-state-writers.mjs`

**ACTION**: Author the check as a pure `checkLaneStateWriters({ contract, surfaces })`
returning `{ name, ok, findings }`, plus a thin `runLaneStateWritersCheck()`
wrapper. Parse the contract's registry table — the rows under the header
`| Surface | Anchor | Writes |`, skipping the GFM separator — into
`{ surface, anchor }` pairs, stripping backticks from cell values. For each pair:
a surface absent from `surfaces`, or whose text is null, is a finding; a surface
whose text does not contain its claimed `anchor` is a finding naming both. Emit a
finding when the registry parses to ZERO rows, because a registry check with
nothing to verify passes by vacuity — copy the guard from
`lane-worktree-parity.mjs` rather than reinventing it. A null contract is a loud
finding.
Delivers **AC-A3**, and jointly with Task 1 delivers **AC-A4**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-worktree-parity.mjs:118-128`
**VALIDATE**: exercised in both directions, because a registry gate that cannot
fail verifies nothing:
```bash
set -euo pipefail
node --input-type=module -e '
import { checkLaneStateWriters } from "./scripts/validate/checks/lane-state-writers.mjs";
const NL = String.fromCharCode(10);
const BT = String.fromCharCode(96);
const REG = [
  "| Surface | Anchor | Writes |",
  "|---------|--------|--------|",
  "| " + BT + "a.md" + BT + " | " + BT + "Step 5.1" + BT + " | in-progress |",
].join(NL);
const good = checkLaneStateWriters({ contract: REG, surfaces: { "a.md": "see Step 5.1 below" } });
if (!good.ok) { console.error("FAIL: a truthful registry must pass: " + JSON.stringify(good.findings)); process.exit(1); }
const missingAnchor = checkLaneStateWriters({ contract: REG, surfaces: { "a.md": "no such anchor here" } });
if (missingAnchor.ok) { console.error("FAIL: a surface missing its claimed anchor must be caught"); process.exit(1); }
const missingFile = checkLaneStateWriters({ contract: REG, surfaces: {} });
if (missingFile.ok) { console.error("FAIL: a registered surface with no text must be caught"); process.exit(1); }
const noRows = checkLaneStateWriters({ contract: "no registry here", surfaces: {} });
if (noRows.ok) { console.error("FAIL: a registry parsing to zero rows must be caught as vacuity"); process.exit(1); }
const nullContract = checkLaneStateWriters({ contract: null, surfaces: {} });
if (nullContract.ok) { console.error("FAIL: a null contract must be caught"); process.exit(1); }
console.log("PASS: missing anchor, missing file, vacuity and null contract all fail; a truthful registry passes");
'
```

### Task 4: UPDATE `scripts/validate/index.mjs` and `CLAUDE.md`

**ACTION**: Add an import of `runLaneStateWritersCheck` from
`./checks/lane-state-writers.mjs` alongside the existing check imports, and
append `runLaneStateWritersCheck` to the `CHECKS` array. Then update `CLAUDE.md`
so its validation line reads `(22 static consistency checks; docs at
documentation/guide/validation-suite.html).`
Delivers **AC-A5**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-worktree-parity.mjs:118-128`
**VALIDATE**:
```bash
set -euo pipefail
OUT=$(npm run validate 2>&1)
printf '%s\n' "$OUT" | grep -q '^\[PASS\] lane-state-writers$'
ACTUAL=$(printf '%s\n' "$OUT" | grep -oE '[0-9]+ checks run' | grep -oE '[0-9]+')
ADVERTISED=$(grep -oE '[0-9]+ static consistency checks' CLAUDE.md | grep -oE '[0-9]+')
if [ "$ACTUAL" = "$ADVERTISED" ]; then
  echo "PASS: CLAUDE.md advertises $ADVERTISED checks and the suite runs $ACTUAL"
else
  echo "FAIL: CLAUDE.md advertises $ADVERTISED but the suite runs $ACTUAL"; exit 1
fi
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
node --check scripts/validate/checks/lane-state-writers.mjs
node --check scripts/validate/index.mjs
npm run validate 2>&1 | grep -q '^\[PASS\] line-endings$'
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
# Re-derive the registry from the contract and verify every row INDEPENDENTLY of
# the check module, so a broken check cannot vouch for its own subject. Parsing
# the real table is also what makes this level fail before the phase is done:
# assertions about the three pre-existing writers alone would pass on an
# untouched tree and prove nothing.
L=plugins/relay/resources/lane-model.md
ROWS=$(awk -F'|' '/^\| Surface \| Anchor \| Writes \|$/{f=1;next} f&&/^\|[- ]+\|/{next} f&&/^\|/{gsub(/`/,"",$2); gsub(/^[ ]+|[ ]+$/,"",$2); gsub(/`/,"",$3); gsub(/^[ ]+|[ ]+$/,"",$3); print $2"::"$3; next} f&&!/^\|/{f=0}' "$L")
if [ -z "$ROWS" ]; then echo "FAIL: no registry rows parsed from $L"; exit 1; fi
COUNT=0
while IFS= read -r ROW; do
  [ -z "$ROW" ] && continue
  SURFACE=${ROW%%::*}
  ANCHOR=${ROW#*::}
  if [ ! -f "$SURFACE" ]; then echo "FAIL: registry names $SURFACE, which does not exist"; exit 1; fi
  if ! grep -qF "$ANCHOR" "$SURFACE"; then
    echo "FAIL: $SURFACE does not contain its claimed anchor \"$ANCHOR\""; exit 1
  fi
  COUNT=$((COUNT+1))
done <<< "$ROWS"
if [ "$COUNT" -lt 3 ]; then echo "FAIL: registry has $COUNT rows; all three of today's writers must be named"; exit 1; fi
# The phases already shipped must still pass their own checks after the
# contract gained a third section.
npm run validate 2>&1 | grep -q '^\[PASS\] lane-contract$'
npm run validate 2>&1 | grep -q '^\[PASS\] lane-worktree-parity$'
echo "PASS: $COUNT registry rows independently verified, earlier lane checks still green"
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
npm run validate 2>&1 | grep -q '^\[PASS\] lane-state-writers$'
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** `lane-model.md` carries a `## Lane outcomes and state
  ownership` section stating that a lane writes neither the Implementation Phases
  table nor `orchestrator-run.json`, showing the structured outcome shape with
  its `requested_transition` field, and recording that the per-plan verdict logs
  are NOT shared because they are keyed by plan basename.
- **AC-A2 (PRD AC-6):** `relay-execute.md`'s Phase A.4.9 states that
  lane-reported mutations are applied by the orchestrator through the same
  `flip_row_status` procedure, one at a time in the order received.
- **AC-A3 (PRD AC-6):** `lane-state-writers.mjs` emits a finding for a
  registered surface that is absent, for one whose text lacks its claimed anchor,
  for a registry parsing to zero rows, and for a null contract — and passes a
  truthful registry. All five are exercised by Task 3's VALIDATE.
- **AC-A4 (PRD AC-6):** the registry names all three of today's PRD-table
  writers, and each named file genuinely carries the anchor attributed to it —
  asserted by Level 2 independently of the check, so the check cannot vouch for
  its own subject.
- **AC-A5 (PRD AC-1):** `npm run validate` reports `[PASS] lane-state-writers`
  and the count it prints equals the count `CLAUDE.md` advertises.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The registry drifts as the three writers are refactored, and the contract quietly describes a pipeline that no longer exists | H | M | That is precisely what the new check catches: a renamed anchor or a moved file fails it, and Level 2 asserts the same facts independently |
| Declaring lanes read-only without a dispatcher to enforce it leaves the rule unexercised until phase 5 | H | L | Deliberate, and what `Depends: 1` on row 3 expresses. The registry check gives the section a consumer immediately |
| Serializing every mutation makes the orchestrator a throughput bottleneck | L | L | The mutations are single-cell edits to one file; the work being parallelised is the phase itself, which is orders of magnitude larger |
| A lane's `requested_transition` is honoured blindly, letting a lane drive the state machine indirectly | M | M | The contract states the orchestrator is free to reject it, and `flip_row_status` already validates the expected source state before writing |
| The not-shared claim about the per-plan logs is wrong, and two lanes do contend on one jsonl | L | H | The claim is grounded in the key: those logs are named by plan basename, and a plan basename carries the phase number, so two lanes cannot resolve to one file |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework.
- **Grounding method.** Phase 2 GROUNDING was performed inline with `Grep`/`Read`
  rather than by dispatching the research subagents, per the standing operator
  instruction in this session. The three registry anchors were verified to exist
  at `relay-execute.md:802`, `relay-implement.md:630` and `plan-writer.md:1283`
  before being written into the contract.
- **Why a registry rather than prose.** A sentence saying "three surfaces write
  the phase table" is unfalsifiable once someone adds a fourth. A parseable table
  whose every row names a file and an anchor is a claim a check can hold to being
  true — which is the difference between documenting the invariant and enforcing
  it.
- **Why the per-plan logs are excluded, stated as a finding.** The source PRD's
  Evidence section already established that `.review.jsonl` and
  `.code-review.jsonl` are keyed by plan basename and therefore per phase.
  Guarding them would be effort spent on a resource nothing contends for, and
  leaving the exclusion unstated would make a later reader wonder whether it was
  reasoned about at all.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
