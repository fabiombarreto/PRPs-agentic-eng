# Feature: Concurrent lane dispatch (Phase 5 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: reverses an explicitly recorded "Won't" (strictly serial orchestration); changes the orchestrator's phase-selection loop; depends on an agent-dispatch name that is registered nowhere and verified by nothing; registers a new validation check
- Decisions found:
  - [2026-05-01] State machine: the source PRD's Implementation Phases table IS the state machine (D6) — lane selection reads that table and writes nothing new beside it
  - [2026-05-01] Dispatch model: inline command-protocol adoption via Read (D7) — a lane adopts the SAME per-phase protocols the serial path adopts; there is no parallel copy of the pipeline
  - [2026-05-01] Per-stage retry budget composition (D3) — per-phase budgets are re-initialised inside `/relay-implement`, so they are already per lane; the session wall-clock is genuinely shared and is documented as such rather than silently contended
  - [2026-05-18] Pillar 2 never commits — a lane terminates uncommitted exactly as a serial phase does
  - [2026-05-15] Runnable worktree environments — registered and BLOCKED; dispatch is gated on the phase-4 declaration and never assumes a runnable environment
- Applicable anti-patterns:
  - "Logic duplication across command files" — lanes adopt existing protocols by reference; nothing is pasted or forked
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md:80) — concurrency adds no prompt
  - Weakening or deleting tests to make the loop turn green (:15) — the new check ships with its failing direction exercised
  - Writing pipeline artifacts under the agent config directory (:61)
- Applicable architectural rules:
  - Graceful degradation: with the gate absent or false, or with one derived lane, the loop behaves exactly as it does today
  - Interactivity boundary — four sanctioned extensions; this phase adds none
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 5:
  "Concurrent lane dispatch" — Goal: Actually run lanes at the same time. —
  Success signal: Three lanes complete concurrently with every correctness gate
  green, and a halt in one leaves the others in a recorded terminal state.

## Summary

This is the phase where lanes actually run. The orchestrator gains a lane-aware
selection step that derives lanes, consults the phase-4 gate, caps how many are
in flight, and dispatches each as a subagent that adopts the SAME per-phase
protocols the serial path adopts — no parallel copy of the pipeline. Per-lane
budgets follow from where they were already initialised: retry, oscillation and
dispute budgets are re-created inside `/relay-implement` per phase and are
therefore per lane for free, while the session wall-clock is genuinely one
deadline and is documented as shared rather than left to be discovered. Every
lane reaches a defined terminal state when another halts. The phase also closes a
gap it depends on: `dispatch-graph` explicitly scopes itself to command files, so
agent-to-agent dispatch — including `code-reviewer` reaching
`code-reviewer-semantic` — is verified by nothing today.

## User Story

As a relay operator with three independent chains in one PRD,
I want them to run at the same time in their own worktrees,
So that I pay the longest chain rather than the sum of all three.

## Problem Statement

`/relay-execute` picks "the lowest-numbered actionable row" and runs one phase at
a time. `relay-execute.md:1153` records the deferral outright, and
`relay-execute.md:263` asserts "There is at most one such row under this
orchestrator's serial execution model (D6)". Phases 1 through 4 built everything
concurrency needs — a derived lane model, per-lane worktrees and branches,
serialized state mutation, a runtime-safety gate and a cap — and nothing yet
dispatches. Separately, the dispatch mechanism this phase depends on is
unverified: six agents declare `Task` in their `tools:` frontmatter, no agent
declares `Agent`, and `dispatch-graph`'s own docstring states that agent-to-agent
dispatch is out of its scope. If that name does not resolve, `code-reviewer`
cannot reach `code-reviewer-semantic` and the R-SEM layer is silently absent
today — a pre-existing condition this phase does not introduce but must not build
on unexamined.

## Solution Statement

Add a lane-aware selection step to the orchestrator that runs BEFORE today's
lowest-numbered pick and falls through to it whenever concurrency is not
available — gate absent or false, one derived lane, or a cap of one. When
concurrency IS available, dispatch up to `max_lanes_in_flight` lanes, each
adopting the existing per-phase protocols unchanged, each in its own worktree and
branch from phase 2, each returning the structured outcome from phase 3 rather
than writing shared state. Define a terminal state for every lane when one halts,
so a halt never leaves the others undescribed. And close the agent-to-agent
dispatch gap with a check that resolves every `subagent_type` reference found in
an agent body and holds every dispatching agent to declaring a dispatch tool —
making the `Task`/`Agent` question checkable rather than folklore.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | High |
| Systems Affected | `plugins/relay/resources/lane-model.md`, `plugins/relay/commands/relay-execute.md`, `scripts/validate/` |
| Dependencies | Phases 2, 3, 4 — all `complete` |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:190` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-execute.md` | 250-300 | Phase A.1 — the lowest-numbered actionable pick that the lane step precedes and falls back to. Its "at most one such row" sentence is the assumption this phase relaxes. |
| P0 | `plugins/relay/resources/lane-model.md` | 1-400 | All four sections shipped by phases 1-4: derivation, worktree identity, outcomes and ownership, and the runtime gate plus cap. Dispatch consumes every one of them. |
| P0 | `scripts/validate/checks/dispatch-graph.mjs` | 1-40 | The gap being closed: its own docstring states agent-to-agent dispatch is out of scope, which is why the `code-reviewer` to `code-reviewer-semantic` edge is unguarded. |
| P1 | `plugins/relay/agents/code-reviewer.md` | 1-20 | The one agent that genuinely dispatches another, and the `tools:` line declaring `Task` — the concrete subject of the open question. |
| P1 | `scripts/validate/checks/lane-state-writers.mjs` | 1-220 | The phase-3 check pattern, including the registry parse and the vacuity guard the new check reuses. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-9 and AC-10 verbatim — per-lane budgets with a shared session wall-clock, and a defined terminal state for every lane on halt. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-execute.md:263
There is at most one such row under this orchestrator's serial execution model (D6).
```
Task 2 amends the assumption this sentence encodes. It is quoted here because
the sentence is the load-bearing statement of serial execution in the
orchestrator, and a phase that adds concurrency without reconciling it would
leave the file contradicting itself.

```
# SOURCE: scripts/validate/checks/lane-state-writers.mjs:138-152
  if (rows.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message:
            `no shared-state writer rows parsed from ${CONTRACT_PATH} (expected a table under the header ` +
            `"${REGISTRY_HEADER}") — a registry check with nothing to verify passes by vacuity`,
          file: CONTRACT_PATH,
          line: null,
        },
      ],
    };
  }
```
Task 4 copies this vacuity guard. A dispatch-resolution check whose scanned set
yields no dispatch sites would report a clean pass while resolving nothing.

```
# SOURCE: plugins/relay/resources/lane-model.md:1-11
# Lane Model Contract

Shared, plugin-owned contract defining what a **lane** is — the unit of work
relay may run concurrently — how lanes are derived from an Implementation Phases
table, and what the `Parallel` column is allowed to say about them.
```
Task 1 extends this contract rather than opening a fifth authority; the dispatch
rules belong beside the derivation, identity, ownership and gating rules the same
file already holds.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/lane-model.md` | UPDATE | Add the dispatch rules, the per-lane vs shared budget split, and the terminal-state table. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Add the lane-aware selection step before Phase A.1's pick, and reconcile the "at most one such row" sentence with concurrency. |
| `scripts/validate/checks/agent-dispatch-resolution.mjs` | CREATE | Resolve every `subagent_type` reference found in an agent body, and hold every dispatching agent to declaring a dispatch tool — the gap `dispatch-graph` leaves open by design. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check. |
| `CLAUDE.md` | UPDATE | The advertised check count moves 22 to 23. |

## NOT Building (Scope Limits)

- **Changing any agent's `tools:` frontmatter from `Task` to `Agent`.** The
  runtime resolution is unverified, and a rename made on a guess could break
  working dispatch. This phase makes the question *visible and checkable*; the
  fix belongs to whoever can run the experiment.
- **Integrating lane branches back into one branch per repository.** Phase 6.
- **The synthetic fixture, the timing instrumentation and the negative case.**
  Phase 7.
- **Replacing the D18 soft-fail concurrency diagnostic.** A Should-item, not in
  this phase's Must set.
- **Tuning `max_lanes_in_flight`.** Phase 7's fixture is the instrument.
- **Any change to the four sanctioned interactivity extensions.** Concurrency
  adds no prompt.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/resources/lane-model.md`

**ACTION**: Add a section headed byte-exactly `## Lane dispatch`, placed after
`## Runtime safety and the concurrency cap` and before `## Named-code registry`.
It defines:
(a) **What a lane dispatch is** — each lane is dispatched as a subagent that
adopts the SAME per-phase command protocols the serial path adopts, by reference,
per the D7 inline-adoption model. There is no parallel copy of the pipeline, and
a lane runs its phases in the order the derivation fixed.
(b) **The budget split** — a table headed byte-exactly
`| Budget | Scope | Why |` with one row per budget: `max_implement_retries`,
oscillation state and the dispute cap are PER LANE because `/relay-implement`
re-initialises them per phase already; `max_plan_review_retries` is per lane for
the same reason; `max_orchestrator_minutes` is SHARED, one deadline for the whole
session, documented as shared rather than silently contended; and
`max_lanes_in_flight` is the shared cap itself.
(c) **Terminal states** — a table headed byte-exactly
`| Lane state | Meaning |` naming `completed`, `halted`, `cancelled` and
`queued`. When one lane halts, every other lane reaches one of these and the run
log records which, so no lane is left undescribed. State that a halt in one lane
does not roll back another's completed work, and that re-invocation resumes only
what is unfinished.
(d) **Degradation** — with the gate absent or false, with one derived lane, or
with a cap of one, dispatch does not occur and the orchestrator's existing
lowest-numbered pick runs unchanged.
Delivers **AC-A1**.
**MIRROR**: `# SOURCE: plugins/relay/resources/lane-model.md:1-11`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
for H in '^## Runtime safety and the concurrency cap$' '^## Lane dispatch$' '^## Named-code registry$'; do
  C=$(grep -c "$H" "$L")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
G=$(grep -n '^## Runtime safety and the concurrency cap$' "$L" | cut -d: -f1)
D=$(grep -n '^## Lane dispatch$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$G" -lt "$D" ] && [ "$D" -lt "$R" ]; then echo "PASS: dispatch section correctly placed"; else echo "FAIL: order $G / $D / $R"; exit 1; fi
grep -q '^| Budget | Scope | Why |$' "$L"
grep -q '^| Lane state | Meaning |$' "$L"
# The shared wall-clock must be named as shared; that is the whole of AC-9's
# second half, and leaving it implicit is what "silently contended" means.
grep -q 'max_orchestrator_minutes' "$L"
for S in completed halted cancelled queued; do grep -q "$S" "$L"; done
echo "PASS: budget split and terminal states both present"
```

### Task 2: UPDATE `plugins/relay/commands/relay-execute.md`

**ACTION**: Two edits inside `### Phase A.1 — Pick next actionable phase`.
First, add a subsection headed byte-exactly
`#### Lane-aware selection (runs before the lowest-numbered pick)` immediately
after the actionable-row rule and before the resumable visual-approval check. It
states: derive lanes per `resources/lane-model.md`; read `lane_runtime_safe`; if
the gate is absent or `false`, or fewer than two lanes are derived, or
`max_lanes_in_flight` is 1, record the reason in the run log and fall through to
the existing lowest-numbered pick UNCHANGED; otherwise dispatch up to
`max_lanes_in_flight` lanes concurrently, queue the remainder, and apply each
returned outcome serially through `flip_row_status`.
Second, amend the existing sentence
`There is at most one such row under this orchestrator's serial execution model (D6).`
by appending a sentence stating that under lane dispatch more than one row may be
in flight, that each is owned by exactly one lane, and that the
visual-approval check therefore scans per lane. Do not delete the original
sentence — it remains true of the serial path, which is still the default.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-execute.md:263`
**VALIDATE**:
```bash
set -euo pipefail
E=plugins/relay/commands/relay-execute.md
grep -q '^#### Lane-aware selection (runs before the lowest-numbered pick)$' "$E"
grep -q 'resources/lane-model.md' "$E"
grep -q 'lane_runtime_safe' "$E"
grep -q 'max_lanes_in_flight' "$E"
# The original serial sentence must SURVIVE — deleting it would remove the
# statement that is still true of the default path.
grep -q "There is at most one such row under this orchestrator's serial execution model (D6)." "$E"
# The new subsection must live inside Phase A.1, before Phase A.2.
A1=$(grep -n '^### Phase A.1 ' "$E" | head -1 | cut -d: -f1)
S=$(grep -n '^#### Lane-aware selection' "$E" | head -1 | cut -d: -f1)
A2=$(grep -n '^### Phase A.2 ' "$E" | head -1 | cut -d: -f1)
if [ "$A1" -lt "$S" ] && [ "$S" -lt "$A2" ]; then
  echo "PASS: lane-aware selection sits inside Phase A.1"
else
  echo "FAIL: positions A1=$A1 sel=$S A2=$A2"; exit 1
fi
```

### Task 3: UPDATE `plugins/relay/resources/lane-model.md` — record the dispatch-name finding

**ACTION**: Inside the `## Lane dispatch` section authored by Task 1, add a
subsection headed byte-exactly `### The dispatch tool name is unverified` that
records, as a finding rather than a rumour: six agent files declare `Task` in
their `tools:` frontmatter and none declares `Agent`; `dispatch-graph`'s own
docstring scopes it to command files and states agent-to-agent dispatch is out of
scope, so no check resolves the `code-reviewer` to `code-reviewer-semantic` edge;
and consequently, IF the declared name does not resolve at runtime, the `R-SEM`
semantic layer is absent today and silently. State plainly that this is a
PRE-EXISTING condition that lane dispatch does not introduce, that verifying it
requires actually dispatching an agent, and that no `tools:` frontmatter is
changed on a guess. Name the check Task 4 adds as the structural half of the
answer.
Delivers **AC-A3**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-state-writers.mjs:138-152`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
grep -q '^### The dispatch tool name is unverified$' "$L"
grep -q 'code-reviewer-semantic' "$L"
grep -q 'R-SEM' "$L"
# The finding must be inside the dispatch section, not stranded elsewhere.
D=$(grep -n '^## Lane dispatch$' "$L" | cut -d: -f1)
U=$(grep -n '^### The dispatch tool name is unverified$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$D" -lt "$U" ] && [ "$U" -lt "$R" ]; then echo "PASS: finding recorded inside the dispatch section"; else echo "FAIL: order $D / $U / $R"; exit 1; fi
# No agent frontmatter may have been changed on a guess.
if grep -l '^tools:.*\bAgent\b' plugins/relay/agents/*.md 2>/dev/null | grep -q .; then
  echo "FAIL: an agent tools: line was changed to Agent, which this phase forbids"; exit 1
else
  echo "PASS: no agent frontmatter changed"
fi
```

### Task 4: CREATE `scripts/validate/checks/agent-dispatch-resolution.mjs`

**ACTION**: Author the check as a pure
`checkAgentDispatchResolution({ agents, agentNames, dispatchToolNames })`
returning `{ name, ok, findings }`, plus a thin
`runAgentDispatchResolutionCheck()` wrapper. `agents` maps agent file paths to
their text; `agentNames` is the set of on-disk agent basenames;
`dispatchToolNames` is the set of tool names that count as a dispatch tool,
defaulting to `['Task', 'Agent']`. For each agent: find every
`subagent_type: <name>` or `subagent_type="<name>"` reference in its body; a
reference resolving to no agent name is a finding; an agent that has at least one
such reference but declares NONE of `dispatchToolNames` in its `tools:`
frontmatter is a finding naming the agent and the tools it does declare. Emit a
finding when the scanned set yields ZERO dispatch references overall — vacuity,
copying the phase-3 guard. A null/absent agent text is a loud finding.
Delivers **AC-A4**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-state-writers.mjs:138-152`
**VALIDATE**: exercised in both directions:
```bash
set -euo pipefail
node --input-type=module -e '
import { checkAgentDispatchResolution } from "./scripts/validate/checks/agent-dispatch-resolution.mjs";
const NL = String.fromCharCode(10);
const withTool = ["---", "tools: Read, Task", "---", "dispatch subagent_type: helper here"].join(NL);
const noTool  = ["---", "tools: Read, Grep", "---", "dispatch subagent_type: helper here"].join(NL);
const unknown = ["---", "tools: Read, Task", "---", "dispatch subagent_type: ghost here"].join(NL);
const names = new Set(["helper", "caller"]);
const ok = checkAgentDispatchResolution({ agents: { "caller.md": withTool }, agentNames: names });
if (!ok.ok) { console.error("FAIL: a resolvable dispatch with a declared tool must pass: " + JSON.stringify(ok.findings)); process.exit(1); }
const missingTool = checkAgentDispatchResolution({ agents: { "caller.md": noTool }, agentNames: names });
if (missingTool.ok) { console.error("FAIL: a dispatching agent declaring no dispatch tool must be caught"); process.exit(1); }
const unresolved = checkAgentDispatchResolution({ agents: { "caller.md": unknown }, agentNames: names });
if (unresolved.ok) { console.error("FAIL: an unresolvable subagent_type must be caught"); process.exit(1); }
const vacuous = checkAgentDispatchResolution({ agents: { "caller.md": "no dispatch here" }, agentNames: names });
if (vacuous.ok) { console.error("FAIL: zero dispatch references must be caught as vacuity"); process.exit(1); }
const unreadable = checkAgentDispatchResolution({ agents: { "caller.md": null }, agentNames: names });
if (unreadable.ok) { console.error("FAIL: an unreadable agent must be caught"); process.exit(1); }
console.log("PASS: missing tool, unresolvable name, vacuity and unreadable input all fail; a valid dispatch passes");
'
```

### Task 5: UPDATE `scripts/validate/index.mjs` and `CLAUDE.md`

**ACTION**: Add an import of `runAgentDispatchResolutionCheck` from
`./checks/agent-dispatch-resolution.mjs` alongside the existing check imports,
and append `runAgentDispatchResolutionCheck` to the `CHECKS` array. Then update
`CLAUDE.md` so its validation line reads `(23 static consistency checks; docs at
documentation/guide/validation-suite.html).`
Delivers **AC-A5**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-state-writers.mjs:138-152`
**VALIDATE**:
```bash
set -euo pipefail
OUT=$(npm run validate 2>&1)
printf '%s\n' "$OUT" | grep -q '^\[PASS\] agent-dispatch-resolution$'
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
node --check scripts/validate/checks/agent-dispatch-resolution.mjs
node --check scripts/validate/index.mjs
npm run validate 2>&1 | grep -q '^\[PASS\] line-endings$'
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
# The new check must actually RESOLVE the real code-reviewer edge, not merely
# be registered. If code-reviewer stops referencing code-reviewer-semantic, the
# gap this phase closes has reopened and the assertion below is how we hear.
grep -q 'code-reviewer-semantic' plugins/relay/agents/code-reviewer.md
test -f plugins/relay/agents/code-reviewer-semantic.md
# Every phase's contract section must still be present after the fifth was added.
L=plugins/relay/resources/lane-model.md
for H in '^## Lane derivation$' '^## Worktree identity$' '^## Lane outcomes and state ownership$' '^## Runtime safety and the concurrency cap$' '^## Lane dispatch$'; do
  if ! grep -q "$H" "$L"; then echo "FAIL: contract lost section $H"; exit 1; fi
done
# The earlier phases' checks must still be green.
npm run validate 2>&1 | grep -q '^\[PASS\] lane-contract$'
npm run validate 2>&1 | grep -q '^\[PASS\] lane-worktree-parity$'
npm run validate 2>&1 | grep -q '^\[PASS\] lane-state-writers$'
echo "PASS: all five contract sections present, real dispatch edge intact, earlier checks green"
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
npm run validate 2>&1 | grep -q '^\[PASS\] agent-dispatch-resolution$'
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-9, AC-10):** `lane-model.md` carries a `## Lane dispatch`
  section with a budget table distinguishing per-lane budgets from the shared
  session wall-clock, and a terminal-state table naming `completed`, `halted`,
  `cancelled` and `queued`, so a halt in one lane leaves every other lane
  described rather than undefined.
- **AC-A2 (PRD AC-1, AC-8):** `relay-execute.md`'s Phase A.1 gains a lane-aware
  selection step that derives lanes, reads the gate, caps lanes in flight, and
  falls through to the existing lowest-numbered pick unchanged when concurrency
  is unavailable — with the original serial sentence preserved rather than
  deleted.
- **AC-A3 (PRD AC-9):** the contract records, as a finding with its evidence,
  that the dispatch tool name is declared as `Task` by six agents, declared as
  `Agent` by none, resolved by no check, and unverified at runtime — and that no
  `tools:` frontmatter is changed on a guess.
- **AC-A4 (PRD AC-9):** `agent-dispatch-resolution.mjs` emits a finding for an
  unresolvable `subagent_type`, for a dispatching agent declaring no dispatch
  tool, for zero dispatch references, and for an unreadable agent — and passes a
  valid dispatch. All five are exercised by Task 4's VALIDATE.
- **AC-A5 (PRD AC-1):** `npm run validate` reports
  `[PASS] agent-dispatch-resolution` and the count it prints equals the count
  `CLAUDE.md` advertises.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The declared dispatch tool name does not resolve, so lane dispatch silently runs nothing | M | H | Task 3 records the finding with its evidence and Task 4 makes the structural half checkable; the phase deliberately changes no frontmatter on a guess, and phase 7's fixture is what would expose a non-resolving dispatch behaviourally |
| Adding a selection step ahead of Phase A.1 changes serial behaviour by accident | M | H | The step falls through to the existing pick UNCHANGED in three named cases, and Task 2's VALIDATE asserts the original serial sentence survives rather than being replaced |
| Lanes contend on the session wall-clock without anyone noticing | M | M | The budget table names it shared explicitly — AC-9's requirement is precisely that it be documented as shared rather than silently contended |
| A halt in one lane leaves the others in an undefined state | M | H | The terminal-state table requires every lane to reach one of four named states, and the run log to record which |
| The new check passes vacuously if no agent body contains a dispatch reference | M | H | The zero-reference case is itself a finding, and Task 4's VALIDATE exercises it directly |

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
  instruction in this session. That same instruction is why the runtime half of
  the dispatch-name question is recorded as unverified rather than answered:
  settling it requires actually dispatching a subagent.
- **What this phase does and does not settle about the dispatch name.** It
  settles the structural facts — who declares what, and that nothing checks the
  agent-to-agent edge — and it makes those facts checkable going forward. It does
  not settle whether the name resolves at runtime, and it deliberately does not
  rename anything on the strength of a guess. A rename made blind could break
  dispatch that currently works, which would be worse than the ambiguity.
- **Why the fall-through is stated as three named cases.** "Falls back when
  concurrency is unavailable" is the kind of sentence that reads as complete and
  guards nothing. Naming the gate, the lane count and the cap makes the
  degradation path enumerable, and makes it possible for a later check or fixture
  to assert each branch separately.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
