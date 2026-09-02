# Feature: Synthetic fixture, instrumentation and the negative case (Phase 7 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: converts a prose contract into executable code; adds the feature's only falsifiable acceptance gate; registers a new validation check; adds the repository's first fixture directory
- Decisions found:
  - [2026-05-01] The source PRD's Implementation Phases table IS the state machine (D6) — the fixtures are tables of that exact shape, so the derivation is exercised against the real schema rather than a convenient one
  - [2026-08-05] Rubric-count assertions are re-derived from live headings, never hardcoded — the same discipline applies to the fixture's expected lane count, which is derived from the fixture rather than pinned twice
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/` — the CONTRACT stays there; the executable derivation is repository tooling and lives under `scripts/`
  - [2026-05-15] Runnable worktree environments — registered and BLOCKED; the fixture measures orchestration shape, never a running stack
  - [2026-04-19] PRP artifacts live under `PRPs/` — fixtures are test inputs for the validation suite, not pipeline artifacts, so they live beside the suite
- Applicable anti-patterns:
  - **Weakening or deleting tests to make the auto-correction loop turn green (docs/anti-patterns.md:15)** — the binding rule here: the colliding fixture MUST fail, and a change that makes it pass is the defect, not the fix
  - Writing pipeline artifacts under the agent config directory (:61)
  - Relying on interactive permission prompts in the autonomous loop (:80)
- Applicable architectural rules:
  - Graceful degradation: the derivation is pure and consulted by a check; no pipeline behaviour changes for a project that declares nothing
  - Three-pillar Pillar 2; writer/reviewer split
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 7:
  "Synthetic fixture, instrumentation and the negative case" — Goal: Prove the
  feature works AND that its gates can fail. — Success signal: The parallel
  fixture is not slower than the serial one, timings are recorded for both, and
  the colliding run fails rather than passes.

## Summary

Phases 1 through 6 specify lanes precisely and in prose. Prose cannot fail. This
phase makes the lane model **executable**: a pure `deriveLanes()` implementing the
contract's algorithm, two synthetic fixtures shaped exactly like a real
Implementation Phases table, and a check that runs the derivation against both.
The three-lane fixture must yield exactly three lanes. The colliding fixture must
**FAIL** — it declares two rows in one derived lane with different `lane:` labels,
which the contract forbids, and a run where it passes is a defect in the gate
rather than a success. That negative case is the entire point: this repository
removed three guards in one day that could only ever pass. The phase also adds the
timing fields the run log needs so the non-regression floor has an instrument.

## User Story

As the operator who has to trust that lane derivation is correct,
I want the algorithm to run against fixtures whose expected outcome is known,
So that a change which breaks it fails a check instead of surviving review.

## Problem Statement

Everything phases 1 through 6 shipped is a specification. The derivation
algorithm — partition by `Repo`, weakly-connected components of the `Depends`
graph, then a one-directional `Parallel` override — exists only as prose in
`lane-model.md`, and the checks shipped so far verify that surfaces cite each
other consistently, not that the algorithm they describe produces correct lanes.
Nothing computes a lane. Nothing can therefore demonstrate that a contradicting
declaration is actually refused, which is the one behaviour AC-3 states in the
strongest terms. And `orchestrator-run.json` carries no duration field at all, so
the non-regression floor AC-12 requires has no instrument to read.

## Solution Statement

Implement the contract's algorithm once, as a pure function over parsed rows, and
place it under `scripts/` — the contract stays the authority for the rules, the
module is the executable reading of them. Author two fixtures in the real
Implementation Phases table shape: one with three genuinely independent chains,
one deliberately constructed so two rows in a single derived lane carry different
`lane:` labels. Add a check that derives lanes from both and asserts the positive
outcome AND the refusal, so the gate is exercised in both directions every time
the suite runs. Add per-lane and total duration fields to the run-log schema so
the timing comparison has somewhere to live. Derive the expected lane count from
the fixture rather than pinning it separately, so the fixture and its expectation
cannot drift apart.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | High |
| Systems Affected | `scripts/validate/`, `plugins/relay/resources/lane-model.md`, `plugins/relay/commands/relay-execute.md` |
| Dependencies | Phase 5 — `complete` |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:192` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/resources/lane-model.md` | 30-95 | The derivation algorithm this phase implements: the `Repo` partition, the undirected edges, weakly-connected components, and the worked example whose expected output is {1,4,5},{2},{3}. |
| P0 | `plugins/relay/resources/lane-model.md` | 95-145 | The `Parallel` grammar and the one-directional override, including the two refusals the colliding fixture must trigger. |
| P0 | `plugins/relay/resources/prd-template.md` | 184-210 | The canonical Implementation Phases header and the legacy seven-column form — the fixtures must use the real schema, and cells must map by NAME rather than ordinal. |
| P1 | `scripts/validate/checks/lane-state-writers.mjs` | 60-100 | The GFM table parsing pattern, including the separator-row handling whose earlier bug (a class omitting the pipe) is directly relevant to parsing a fixture table. |
| P1 | `scripts/validate/checks/agent-dispatch-resolution.mjs` | 100-170 | The phase-5 check shape: pure function, injected inputs, explicit vacuity guard. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-2, AC-3, AC-5 and AC-12 verbatim — the derivation example, the refusal, the interleaving gate that must FAIL, and the timing record. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/resources/lane-model.md:74-90
| # | Depends |
|---|---------|
| 1 | -       |
| 2 | -       |
| 3 | -       |
| 4 | 1       |
| 5 | 1       |
```
Task 2 turns this worked example into a real fixture and Task 3's check asserts
its documented outcome — lanes {1,4,5}, {2} and {3}. The contract already states
the expected answer, which is what makes it a usable test oracle rather than a
guess.

```
# SOURCE: scripts/validate/checks/lane-state-writers.mjs:76-98
function parseRegistry(text) {
  const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
  const start = lines.findIndex((l) => l.trim() === REGISTRY_HEADING);
  if (start === -1) return [];
```
Task 1 mirrors this GFM table parse, including the separator handling. The bug
that surfaced there — a separator class omitting the pipe, so `|---|---|---|`
parsed as data — applies directly to a phases table with eight columns, and must
not be repeated.

```
# SOURCE: scripts/validate/checks/agent-dispatch-resolution.mjs:158-168
  if (dispatchRefsSeen === 0) {
    findings.push({
      message:
        `no subagent_type reference found in any scanned agent under ${AGENTS_DIR}/ — a dispatch-resolution ` +
        'check with nothing to resolve passes by vacuity; confirm the agent files are readable and still carry ' +
        'their dispatch sites',
      file: AGENTS_DIR,
      line: null,
    });
  }
```
Task 3 copies this vacuity guard: a fixture check whose fixtures failed to load
would report a clean pass over nothing, which is the failure mode this whole
phase exists to eliminate.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/validate/lane-derivation.mjs` | CREATE | The contract's algorithm as a pure, testable function — the first executable reading of the lane model. |
| `scripts/validate/fixtures/three-lane.prd.md` | CREATE | The positive fixture: three genuinely independent chains in the real table shape. |
| `scripts/validate/fixtures/colliding-lanes.prd.md` | CREATE | The negative fixture: two rows in one derived lane with different `lane:` labels, which MUST be refused. |
| `scripts/validate/checks/lane-fixture.mjs` | CREATE | Runs the derivation against both fixtures and asserts the positive outcome AND the refusal. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check. |
| `plugins/relay/resources/lane-model.md` | UPDATE | Record the timing fields and the fixtures' role as the model's executable oracle. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Record per-lane and total durations in `orchestrator-run.json`. |
| `CLAUDE.md` | UPDATE | The advertised check count moves 23 to 24. |

## NOT Building (Scope Limits)

- **Actually running the pipeline concurrently to measure wall-clock.** That
  needs a live orchestrator run, not a static check. This phase builds the
  fixture, the derivation and the instrument; producing the measurement is an
  operator action.
- **Tuning `max_lanes_in_flight` from the measurement.** The value stays
  provisional until a real measurement exists; changing it on the strength of a
  fixture that has not been run would be the guess this feature keeps refusing.
- **A second implementation of the derivation inside the plugin prompts.** The
  contract stays the single authority for the rules; this module is a reading of
  it, not a competing definition.
- **Deleting or relaxing the colliding fixture if it ever fails to fail.** That
  outcome is a defect in the gate and must be fixed at the gate.

## Step-by-Step Tasks

### Task 1: CREATE `scripts/validate/lane-derivation.mjs`

**ACTION**: Implement the contract's algorithm as a pure module exporting
`parsePhasesTable(text)` and `deriveLanes(rows)`.
`parsePhasesTable` locates the Implementation Phases table by either the
canonical eight-column header or the legacy seven-column form, maps cells BY
COLUMN NAME using the header actually matched (never by ordinal — an ordinal read
misreads every legacy row), skips the GFM separator with a pattern whose
character class INCLUDES the pipe, and returns rows carrying `num`, `status`,
`repo`, `parallel` and `depends`.
`deriveLanes` partitions rows by `repo` (empty or `-` is its own partition),
builds undirected edges from each row to every row its `depends` cell names
WITHIN the same partition, computes weakly-connected components, then applies the
`Parallel` override: rows sharing a `lane:<label>` merge; two rows in one derived
component carrying DIFFERENT labels return a refusal
`{ code: 'FAILED_LANE_SPLIT_FORBIDDEN', ... }`; one label spanning differing
`repo` values returns `{ code: 'FAILED_LANE_CROSS_REPO', ... }`. A cross-partition
`depends` edge does NOT merge lanes and is returned as an ordering constraint.
Return `{ lanes, refusals, orderingConstraints }`, lanes sorted by their lowest
row number.
Delivers **AC-A1**.
**MIRROR**: `# SOURCE: scripts/validate/checks/lane-state-writers.mjs:76-98`
**VALIDATE**: the module is exercised against the contract's own worked example,
whose expected answer the contract already states:
```bash
set -euo pipefail
node --input-type=module -e '
import { parsePhasesTable, deriveLanes } from "./scripts/validate/lane-derivation.mjs";
const NL = String.fromCharCode(10);
const T = [
  "| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |",
  "|---|-------|-------------|--------|------|----------|---------|----------|",
  "| 1 | a | d | pending | - | - | - | - |",
  "| 2 | b | d | pending | - | - | - | - |",
  "| 3 | c | d | pending | - | - | - | - |",
  "| 4 | d | d | pending | - | - | 1 | - |",
  "| 5 | e | d | pending | - | - | 1 | - |",
].join(NL);
const rows = parsePhasesTable(T);
if (rows.length !== 5) { console.error("FAIL: expected 5 rows, got " + rows.length); process.exit(1); }
const { lanes, refusals } = deriveLanes(rows);
if (refusals.length) { console.error("FAIL: unexpected refusal: " + JSON.stringify(refusals)); process.exit(1); }
const shape = lanes.map(l => l.map(r => r.num).sort((a,b)=>a-b).join(",")).sort();
const expected = ["1,4,5", "2", "3"].sort();
if (JSON.stringify(shape) !== JSON.stringify(expected)) {
  console.error("FAIL: expected lanes " + JSON.stringify(expected) + " got " + JSON.stringify(shape)); process.exit(1);
}
console.log("PASS: the contract worked example derives to its documented lanes");
'
```

### Task 2: CREATE the two fixtures under `scripts/validate/fixtures/`

**ACTION**: Author two files in the real Implementation Phases table shape, each
with the canonical eight-column header.
`three-lane.prd.md` — the positive fixture: rows 1, 2 and 3 with empty `Depends`,
rows 4 and 5 depending on 1, every `Parallel` cell `-`. Its documented outcome is
three lanes: {1,4,5}, {2}, {3}.
`colliding-lanes.prd.md` — the negative fixture: rows 1 and 2 where row 2 depends
on 1, so the graph places them in ONE lane, but row 1 carries `lane:alpha` and
row 2 carries `lane:beta`. That is a split the graph forbids, and it MUST be
refused with `FAILED_LANE_SPLIT_FORBIDDEN`.
Each fixture opens with a comment paragraph stating what it is for and — for the
colliding one — that a run in which it PASSES is a defect in the gate, not a
success, and that it must never be "fixed" by relaxing the fixture.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/resources/lane-model.md:74-90`
**VALIDATE**:
```bash
set -euo pipefail
F=scripts/validate/fixtures
test -f "$F/three-lane.prd.md"
test -f "$F/colliding-lanes.prd.md"
# Both must carry the REAL canonical header, or they test a schema nothing uses.
H='| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |'
grep -qF "$H" "$F/three-lane.prd.md"
grep -qF "$H" "$F/colliding-lanes.prd.md"
# The negative fixture must actually contain the contradiction it exists for.
grep -q 'lane:alpha' "$F/colliding-lanes.prd.md"
grep -q 'lane:beta' "$F/colliding-lanes.prd.md"
# And it must say, in its own text, that passing is a defect — so nobody
# "repairs" it later by relaxing it.
grep -qi 'defect' "$F/colliding-lanes.prd.md"
echo "PASS: both fixtures present, real header, contradiction and warning intact"
```

### Task 3: CREATE `scripts/validate/checks/lane-fixture.mjs`

**ACTION**: Author the check as a pure
`checkLaneFixture({ positive, negative })` returning `{ name, ok, findings }`,
plus a thin `runLaneFixtureCheck()` wrapper reading the two fixture files.
Using `parsePhasesTable` and `deriveLanes` from Task 1:
- the POSITIVE fixture must parse to at least two rows, derive with ZERO
  refusals, and yield exactly three lanes whose row sets are {1,4,5}, {2} and
  {3}; any deviation is a finding;
- the NEGATIVE fixture must derive with AT LEAST ONE refusal whose `code` is
  `FAILED_LANE_SPLIT_FORBIDDEN`. **A negative fixture that derives cleanly is a
  finding** — worded to say that the gate failed to fail, not that the fixture is
  wrong;
- a null or unparseable fixture is a loud finding, and a positive fixture parsing
  to zero rows is a finding, copying the vacuity guard from
  `agent-dispatch-resolution.mjs`.
Delivers **AC-A3** and **AC-A4**.
**MIRROR**: `# SOURCE: scripts/validate/checks/agent-dispatch-resolution.mjs:158-168`
**VALIDATE**: the check is exercised in both directions, and — the point of the
whole phase — is shown to FAIL when the negative fixture stops being negative:
```bash
set -euo pipefail
node --input-type=module -e '
import { checkLaneFixture } from "./scripts/validate/checks/lane-fixture.mjs";
import { readFileSync } from "node:fs";
const pos = readFileSync("scripts/validate/fixtures/three-lane.prd.md", "utf-8");
const neg = readFileSync("scripts/validate/fixtures/colliding-lanes.prd.md", "utf-8");
const ok = checkLaneFixture({ positive: pos, negative: neg });
if (!ok.ok) { console.error("FAIL: the real fixtures must pass: " + JSON.stringify(ok.findings)); process.exit(1); }
// The negative fixture with its collision removed must be CAUGHT: the gate has
// to notice that it stopped failing.
const declawed = neg.split(String.fromCharCode(10)).map(l => l.replace("lane:beta", "lane:alpha")).join(String.fromCharCode(10));
const missed = checkLaneFixture({ positive: pos, negative: declawed });
if (missed.ok) { console.error("FAIL: a negative fixture that no longer collides must be caught"); process.exit(1); }
const nullPos = checkLaneFixture({ positive: null, negative: neg });
if (nullPos.ok) { console.error("FAIL: a null fixture must be caught"); process.exit(1); }
const emptyPos = checkLaneFixture({ positive: "no table here", negative: neg });
if (emptyPos.ok) { console.error("FAIL: a fixture parsing to zero rows must be caught"); process.exit(1); }
console.log("PASS: real fixtures pass; a de-clawed negative fixture, a null fixture and an empty fixture all fail");
'
```

### Task 4: UPDATE `plugins/relay/resources/lane-model.md`

**ACTION**: Add a section headed byte-exactly `## Timing and the executable
oracle`, placed after `## Lane integration in Pillar 3` and before `## Named-code
registry`. It defines:
(a) **The timing fields** — `orchestrator-run.json` carries `lane_durations_ms`
(a map from lane id to milliseconds) and `total_duration_ms`, recorded for both
parallel and serial runs so the two are comparable at all.
(b) **The non-regression floor** — the parallel run must not be SLOWER than the
serial one. State that no speedup target is set, and why: no measurement exists,
and naming a target would be presenting a guess in the shape of a finding.
(c) **The executable oracle** — the derivation algorithm above is implemented in
`scripts/validate/lane-derivation.mjs` and exercised against fixtures by the
`lane-fixture` check. This contract remains the authority for the rules; the
module is a reading of it, and any disagreement is a bug in the module.
(d) **The negative fixture is load-bearing.** A run in which the colliding
fixture passes is a defect in the gate, never a success, and must never be
resolved by relaxing the fixture.
Delivers **AC-A5**.
**MIRROR**: `# SOURCE: plugins/relay/resources/lane-model.md:74-90`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
for H in '^## Lane integration in Pillar 3$' '^## Timing and the executable oracle$' '^## Named-code registry$'; do
  C=$(grep -c "$H" "$L")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
I=$(grep -n '^## Lane integration in Pillar 3$' "$L" | cut -d: -f1)
T=$(grep -n '^## Timing and the executable oracle$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$I" -lt "$T" ] && [ "$T" -lt "$R" ]; then echo "PASS: timing section correctly placed"; else echo "FAIL: order $I / $T / $R"; exit 1; fi
grep -q 'lane_durations_ms' "$L"
grep -q 'total_duration_ms' "$L"
grep -q 'lane-derivation.mjs' "$L"
# The no-speedup-target reasoning must be stated, or the floor reads as timidity.
grep -qi 'no speedup target\|not set a speedup target\|no target' "$L"
echo "PASS: timing fields, oracle pointer and the no-target reasoning all present"
```

### Task 5: UPDATE `plugins/relay/commands/relay-execute.md`

**ACTION**: In Phase A.6.1's `orchestrator-run.json` schema block, add two
fields alongside `phase_diff_bases`: `"lane_durations_ms": {}` and
`"total_duration_ms": null`. Immediately after that block, add a paragraph
beginning byte-exactly `**Timing is recorded for serial runs too.**` stating that
both fields are written whether or not lanes ran, because a parallel duration is
only meaningful against a serial one measured the same way, and that a run
carrying neither cannot participate in the non-regression comparison at all.
Delivers **AC-A6**.
**MIRROR**: `# SOURCE: scripts/validate/checks/agent-dispatch-resolution.mjs:158-168`
**VALIDATE**:
```bash
set -euo pipefail
E=plugins/relay/commands/relay-execute.md
grep -q '"lane_durations_ms"' "$E"
grep -q '"total_duration_ms"' "$E"
grep -q '^\*\*Timing is recorded for serial runs too\.\*\*' "$E"
# The fields must sit in the run-log schema, next to phase_diff_bases.
P=$(grep -n '"phase_diff_bases"' "$E" | head -1 | cut -d: -f1)
D=$(grep -n '"lane_durations_ms"' "$E" | head -1 | cut -d: -f1)
if [ $((D - P)) -le 6 ] && [ $((D - P)) -ge -6 ]; then
  echo "PASS: timing fields sit alongside phase_diff_bases in the run-log schema"
else
  echo "FAIL: lane_durations_ms at $D is not adjacent to phase_diff_bases at $P"; exit 1
fi
```

### Task 6: UPDATE `scripts/validate/index.mjs` and `CLAUDE.md`

**ACTION**: Add an import of `runLaneFixtureCheck` from
`./checks/lane-fixture.mjs` alongside the existing check imports, and append
`runLaneFixtureCheck` to the `CHECKS` array. Then update `CLAUDE.md` so its
validation line reads `(24 static consistency checks; docs at
documentation/guide/validation-suite.html).`
Delivers **AC-A7**.
**MIRROR**: `# SOURCE: scripts/validate/checks/agent-dispatch-resolution.mjs:158-168`
**VALIDATE**:
```bash
set -euo pipefail
VOUT=$(npm run validate 2>&1)
printf '%s\n' "$VOUT" | grep -q '^\[PASS\] lane-fixture$'
ACTUAL=$(printf '%s\n' "$VOUT" | grep -oE '[0-9]+ checks run' | grep -oE '[0-9]+')
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
node --check scripts/validate/lane-derivation.mjs
node --check scripts/validate/checks/lane-fixture.mjs
node --check scripts/validate/index.mjs
VOUT=$(npm run validate 2>&1)
printf '%s\n' "$VOUT" | grep -q '^\[PASS\] line-endings$'
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
# The negative fixture must FAIL derivation. This is the phase's whole claim,
# asserted here independently of the check module so a broken check cannot
# vouch for its own subject.
node --input-type=module -e '
import { parsePhasesTable, deriveLanes } from "./scripts/validate/lane-derivation.mjs";
import { readFileSync } from "node:fs";
const neg = readFileSync("scripts/validate/fixtures/colliding-lanes.prd.md", "utf-8");
const { refusals } = deriveLanes(parsePhasesTable(neg));
if (!refusals.some(r => r.code === "FAILED_LANE_SPLIT_FORBIDDEN")) {
  console.error("FAIL: the colliding fixture derived without the refusal it exists to trigger");
  process.exit(1);
}
const pos = readFileSync("scripts/validate/fixtures/three-lane.prd.md", "utf-8");
const derived = deriveLanes(parsePhasesTable(pos));
if (derived.refusals.length !== 0 || derived.lanes.length !== 3) {
  console.error("FAIL: the positive fixture must derive to exactly 3 lanes with no refusal");
  process.exit(1);
}
console.log("PASS: negative fixture refuses, positive fixture derives to 3 lanes");
'
# Every contract section from phases 1-7 must still be present.
L=plugins/relay/resources/lane-model.md
for H in '^## Lane derivation$' '^## Worktree identity$' '^## Lane outcomes and state ownership$' '^## Runtime safety and the concurrency cap$' '^## Lane dispatch$' '^## Lane integration in Pillar 3$' '^## Timing and the executable oracle$'; do
  if ! grep -q "$H" "$L"; then echo "FAIL: contract lost section $H"; exit 1; fi
done
echo "PASS: both directions asserted independently; all seven contract sections intact"
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
VOUT=$(npm run validate 2>&1)
printf '%s\n' "$VOUT" | grep -q '^\[PASS\] lane-fixture$'
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** `scripts/validate/lane-derivation.mjs` exports
  `parsePhasesTable` and `deriveLanes` implementing the contract's algorithm, and
  derives the contract's own worked example to its documented lanes {1,4,5}, {2}
  and {3}.
- **AC-A2 (PRD AC-2, AC-5):** two fixtures exist in the real canonical
  eight-column table shape — one with three independent chains, one deliberately
  colliding — and the colliding one states in its own text that a passing run is
  a defect in the gate.
- **AC-A3 (PRD AC-2):** `lane-fixture.mjs` derives the positive fixture to
  exactly three lanes with zero refusals, and reports a finding on any deviation.
- **AC-A4 (PRD AC-5):** `lane-fixture.mjs` reports a finding when the negative
  fixture derives WITHOUT a `FAILED_LANE_SPLIT_FORBIDDEN` refusal — the gate
  notices when it stops failing. Task 3's VALIDATE exercises exactly that by
  de-clawing the fixture and requiring the check to catch it.
- **AC-A5 (PRD AC-12):** `lane-model.md` records `lane_durations_ms` and
  `total_duration_ms`, the non-regression floor with no speedup target and the
  reason for that, and names the derivation module as the contract's executable
  reading.
- **AC-A6 (PRD AC-12):** `relay-execute.md`'s run-log schema carries both timing
  fields, written for serial runs too, so a parallel duration has something to be
  compared against.
- **AC-A7 (PRD AC-1):** `npm run validate` reports `[PASS] lane-fixture` and the
  count it prints equals the count `CLAUDE.md` advertises.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The derivation module and the prose contract drift, and the module silently becomes the real definition | H | H | The contract is named the authority explicitly and the module a reading of it; a disagreement is defined as a bug in the module. The fixture's expected outcome comes from the contract's own worked example, so drift shows up as a failing check |
| The colliding fixture is later "fixed" so the suite goes green | M | H | The fixture says in its own text that passing is a defect, the contract repeats it, and Task 3's VALIDATE actively de-claws the fixture and requires the check to catch it |
| The table parser repeats the separator bug found in phase 3 | M | M | Task 1's ACTION names the pipe-in-the-character-class requirement explicitly, and the mirrored snippet is the very module where that bug was found and fixed |
| Timing fields are added but never populated, so the floor has no data | H | M | The fields are recorded for serial runs too, which is what makes a first data point available without a concurrent run; producing the comparison is named as an operator action rather than pretended to be automatic |
| A fixture in the real PRD shape is mistaken for a real PRD by another tool | M | M | The fixtures live under `scripts/validate/fixtures/`, beside the suite that reads them, and never under `PRPs/prds/` where the pipeline looks |

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
- **Why the contract stays the authority.** It would be tempting to call the
  module the definition now that it exists and runs. But the module is consumed
  by one check, while the contract is consumed by `/relay-execute`,
  `/relay-worktree`, `/relay-commit`, `/relay-pr`, `/relay-visual-approve` and
  `prd-reviewer` — all of which read prose. Making the module authoritative would
  silently split the definition in two.
- **The negative case is the deliverable.** The positive fixture proves the
  algorithm computes something. The colliding fixture proves the gate can refuse
  something, which is the property this repository spent a day discovering it
  lacked at nine sites. Task 3's VALIDATE does not merely assert that the
  collision is caught today — it removes the collision and requires the check to
  notice, which is the difference between testing the fixture and testing the
  gate.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
