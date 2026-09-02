# Feature: Lane model and Parallel semantics (Phase 1 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: creates a new plugin-owned shared contract under `plugins/relay/resources/`; adds a blocking rubric row to a shipped reviewer agent; registers a new validation check; defines the semantics of a PRD-table column that ~13 approved PRDs already carry free-text data in
- Decisions found:
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/` — the lane contract is plugin-owned and belongs beside `repository-topology.md`
  - [2026-09-01] Worktree base per declared member / the topology contract as a shared, exact-match parsing surface — the structural precedent this phase mirrors
  - [2026-05-01] State machine: the source PRD's Implementation Phases table IS the state machine (D6) — lanes are DERIVED from that table, never stored beside it
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — a contradiction is refused by a rubric row at PRD time, never by a prompt at run time
  - [2026-08-05] Rubric-count assertions are re-derived from live headings, never hardcoded — the new `R-COH-*` row must not require an arithmetic edit
  - [2026-05-15] Runnable worktree environments — registered and BLOCKED; this phase defines lanes only and assumes no runnable environment
- Applicable anti-patterns:
  - Writing pipeline artifacts under the agent config directory (docs/anti-patterns.md:61) — every artifact here is source under `plugins/` or `scripts/`
  - Activating the test pair by heuristic (:43) / Flipping a gating key by heuristic (:89) — the `Parallel` override is read from an explicit declaration, never inferred
  - Weakening or deleting tests to make the loop turn green (:15) — the new check ships with a negative case that must fail
- Applicable architectural rules:
  - Three-pillar Pillar 2; `PRPs/` artifact paths; writer/reviewer split
  - Graceful degradation: a PRD with no `lane:` declaration must derive exactly the lanes the graph gives and behave as it does today
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 1:
  "Lane model and Parallel semantics" — Goal: Make "which phases may run
  together" a computed, deterministic fact. — Success signal: A PRD with three
  independent chains yields three lanes; a `Parallel` declaration contradicting
  `Depends` is refused by name rather than honored.

## Summary

This phase gives the `Parallel` column a machine-readable meaning for the first
time and defines the lane as a derived, deterministic object. A lane is a
weakly-connected component of the `Depends` graph, computed after partitioning
rows by `Repo`. The `Parallel` cell becomes a one-directional override: an
author may force two lanes to MERGE (choosing to be more serial than the graph
requires), and may never force one to SPLIT (a lane that violates `Depends` is
not expressible). The deliverable is a new plugin-owned contract file, the
column's authoring semantics in the PRD template, a blocking `prd-reviewer`
rubric row that refuses a contradicting declaration by name, and a validation
check that holds the contract and its consumers to the same named codes. No
scheduler, no worktree, no dispatch — those are phases 2 through 5.

## User Story

As a relay operator authoring a PRD whose phases form independent chains,
I want the `Parallel` column to mean something the machine reads and validates,
So that the lanes my PRD will actually run in are visible and checkable at
approval time rather than discovered at run time.

## Problem Statement

`/relay-execute` picks the lowest-numbered actionable row and runs one phase at
a time. The `Parallel` column has existed in the byte-exact header since the
table was defined, but no consumer reads it — `relay-execute.md:1153` records
the deferral outright: *"Parallel phase orchestration — MVP is strictly serial.
The `Parallel` cell is read but not acted upon."* Narrowed to this phase: there
is today no definition anywhere in the plugin of what a lane is, of how one
would be derived from the table that already exists, or of what a `Parallel`
cell is allowed to say. Grounding confirmed the column's total semantic
vacancy — outside header lines and the "treat `-` as empty" parsing rule, the
plugin never mentions it except to say it is ignored.

## Solution Statement

Define the lane as a derived object and the `Parallel` cell as a bounded
override, in a plugin-owned contract that later phases consume rather than
reinvent — the same shape `repository-topology.md` established for multi-repo
membership. Partition rows by `Repo`, compute weakly-connected components of the
`Depends` graph within each partition, and retain any cross-repo `Depends` edge
as an inter-lane ordering constraint rather than silently dropping it. Admit
exactly one override token, `lane:<label>`, which merges rows into a shared
lane; refuse by name any labelling that would split a graph component or span
two repos. Every value the column carries today is legacy free text and stays a
no-op, so no approved PRD changes meaning.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/`, `plugins/relay/agents/prd-reviewer.md`, `scripts/validate/` |
| Dependencies | None (row 1 has an empty `Depends` cell) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:186` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/resources/repository-topology.md` | 1-252 | The structural precedent: a plugin-owned contract owning its own schema, parsing rules, column semantics, named HALT codes and a named-code registry. The lane contract mirrors its shape section for section. |
| P0 | `scripts/validate/checks/topology-contract.mjs` | 1-190 | The check pattern to mirror: pure `check<Name>({inputs})` plus a thin `run<Name>Check()`, self-selecting scope, and the recorded history of two failed scope attempts that the lane check must not repeat. |
| P0 | `plugins/relay/agents/prd-reviewer.md` | 375-396 | `R-COH-REPO-UNDECLARED` — the exact shape of a blocking coherence row with a zero-emission branch, which the new lane row must copy so a PRD carrying no `lane:` declaration emits no row at all. |
| P1 | `plugins/relay/resources/prd-template.md` | 184-240 | Where the ``Repo`` column section and the phase-status lifecycle are documented; the new ``Parallel`` column section sits alongside them. Note both existing column headings wrap the column name in backticks. |
| P1 | `scripts/validate/index.mjs` | 19-60 | The two-line registration contract: one import, one `CHECKS` array entry. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-2 and AC-3 verbatim — the derivation example and the one-directional override rule this phase must satisfy exactly. |

## Patterns to Mirror

```
# SOURCE: scripts/validate/checks/topology-contract.mjs:60-73
const HEADER_SHAPE = /^\|\s*Repo\s*\|\s*Path\s*\|/;
```
Task 4 copies the *self-selecting scope* idea, not this regex: scope is decided
by asking the question directly (does this file cite a `FAILED_LANE_*` code?)
rather than by inferring intent from a filename or a section-heading substring.
The comment block above this constant records two scope attempts that failed
exactly that way; the lane check must not repeat them.

```
# SOURCE: scripts/validate/checks/topology-contract.mjs:96-128
export function checkTopologyContract({ contract, consumers }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  if (!contract) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [ /* missing or empty input is a loud FAILURE */ ],
    };
  }
```
Task 4 copies this signature and this discipline verbatim: a pure function over
injected inputs, and a missing or unreadable input returned as a loud finding
rather than thrown or silently passed.

```
# SOURCE: plugins/relay/agents/prd-reviewer.md:375-383
#### R-COH-REPO-UNDECLARED — every Repo cell names a declared editable member

**Class:** blocking

- **Zero-emission branch:** if the target project's
  `docs/context/architecture.md` has no `## Repository topology`
  section, emit NO row at all for this check.
```
Task 3 copies this heading shape, the `**Class:** blocking` line, and above all
the zero-emission branch — a PRD with no `lane:` declaration must emit no rubric
row at all, exactly as a single-repo PRD emits none for `Repo`.

```
# SOURCE: plugins/relay/resources/repository-topology.md:215-224
  (heading: "Named-code registry", at h2 level)

  - `FAILED_TOPOLOGY_MALFORMED_ROW` — a table row has the wrong cell count, an empty `Repo`/`Path`, or an unrecognized `Role`.
  - `FAILED_TOPOLOGY_PATH_UNRESOLVED` — a declared `Path` or `Git root` does not resolve to an existing directory.
  - `FAILED_TOPOLOGY_BASE_UNRESOLVED` — a declared `Base` does not resolve in that member.
```
Task 1 mirrors this section verbatim in structure — an h2 registry heading whose
body is one backticked code per line, each followed by an em-dash and the
condition that raises it. The contract is thereby the single authority for its
own code names, which is what makes Task 4's parity check possible at all. (The
heading itself is shown here as a description rather than reproduced at column
zero: relay's own section parsers are line-based and not fence-aware, so a bare
`##` line inside a snippet would register as a section of THIS plan.)

```
# SOURCE: plugins/relay/resources/prd-template.md:190-194
  (heading, verbatim including its backticks: "#### The `Repo` column")

Names the workspace member this phase targets. The value must match a `Repo`
entry declared in the target project's `## Repository topology` section (see
`${CLAUDE_PLUGIN_ROOT}/resources/repository-topology.md`), and that member's
`Role` must be `editable` — a `reference-only` member is never written to.
```
Task 2 copies this exactly: the column heading wraps the column name in
backticks, and the body names the authoritative contract inside a parenthetical
`(see ...)` rather than restating its rules. Note the backticks in the heading —
a pattern written against an unbackticked `#### The Repo column` matches nothing
in this file, which is why Task 2's VALIDATE greps the backticked form.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/lane-model.md` | CREATE | The contract itself: lane derivation, `Parallel` grammar, named codes, named-code registry. Plugin-owned per the 2026-08-05 resources decision. |
| `plugins/relay/resources/prd-template.md` | UPDATE | Add `#### The Parallel column` beside the existing `#### The Repo column` so PRD authors learn the grammar where they learn the table. |
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | Add the blocking `R-COH-PARALLEL-CONTRADICTS-DEPENDS` row that refuses a contradicting declaration by name at approval time. |
| `scripts/validate/checks/lane-contract.mjs` | CREATE | Hold the contract and its consumers to the same named codes; fail on a cited code the contract does not define. |
| `scripts/validate/index.mjs` | UPDATE | Register the new check (one import, one `CHECKS` entry). |
| `CLAUDE.md` | UPDATE | The advertised check count moves 19 to 20; leaving it stale is an immediate documented-vs-actual contradiction. |

## NOT Building (Scope Limits)

- **Any scheduler, dispatch, or concurrency.** Lanes are derived and validated
  here; nothing runs in parallel until phase 5. `/relay-execute`'s loop is not
  touched by this phase.
- **The worktree lane dimension.** Phase 2 owns the identity key and the branch
  name; this phase must not alter `/relay-worktree`.
- **The runtime-safety gate and the concurrency cap.** Phase 4.
- **Serialized state mutation.** Phase 3.
- **Any change to how a row's `Status`, `Depends` or `Repo` cell is read.** The
  existing five-state lifecycle and the actionable-row rule are untouched.
- **Migrating the ~19 legacy free-text `Parallel` values** across approved PRDs.
  They stay legal and stay no-ops, by design.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/resources/lane-model.md`

**ACTION**: Author the lane contract, mirroring `repository-topology.md`'s
section shape. It must define, in its own words and as the single authority:

(a) **Lane derivation** — partition the Implementation Phases data rows by their
`Repo` cell (an empty cell or `-` is its own partition, the project's single
repository); within each partition build an undirected graph with one edge
between each row and every row named in its `Depends` cell; each
weakly-connected component is one lane. A `Depends` edge whose endpoints fall in
different `Repo` partitions does NOT merge their lanes — it is retained as an
inter-lane ordering constraint, so the dependent lane may not start before the
depended-on lane's row reaches a dependency-satisfying state.

(b) **The `Parallel` grammar** — exactly one override token is recognized, of
the form `lane:<label>` where the label matches `[a-z0-9][a-z0-9-]*`. Rows
carrying the same label are merged into one lane and run sequentially within it.
Every other cell value — including `-`, the empty cell, and free text such as
`yes` or `yes (with #2)` — is LEGACY and carries no override: it is neither
honored nor refused. Record why: roughly 19 such values exist across approved
PRDs and none was ever machine-read, so refusing them would break PRDs that are
already APPROVED.

(c) **The override is one-directional** — a label may only make execution more
serial. Two rows in the same derived component carrying DIFFERENT `lane:` labels
is a split the graph forbids, and is refused as `FAILED_LANE_SPLIT_FORBIDDEN`,
naming both phase numbers and both labels. A single label spanning rows whose
`Repo` cells differ is refused as `FAILED_LANE_CROSS_REPO`, naming the label and
both repos — a lane is per-repository because it will become one worktree in one
repository.

(d) A `## Named-code registry` section listing both codes, mirroring
`repository-topology.md`'s own registry section.

Include the AC-2 worked example verbatim: rows 1, 2, 3 with empty `Depends` and
rows 4, 5 depending on 1 yield three lanes — {1, 4, 5}, {2}, {3}.
Delivers **AC-A1**, and jointly with Task 3 delivers **AC-A6** — clause (b)'s
legacy rule is the half of AC-A6 that keeps every existing `Parallel` value a
no-op.
**MIRROR**: `# SOURCE: plugins/relay/resources/repository-topology.md:215-224`
**VALIDATE**:
```bash
set -euo pipefail
test -f plugins/relay/resources/lane-model.md
grep -q '^## Named-code registry$' plugins/relay/resources/lane-model.md
grep -q 'FAILED_LANE_SPLIT_FORBIDDEN' plugins/relay/resources/lane-model.md
grep -q 'FAILED_LANE_CROSS_REPO' plugins/relay/resources/lane-model.md
grep -q 'lane:<label>' plugins/relay/resources/lane-model.md
```

### Task 2: UPDATE `plugins/relay/resources/prd-template.md`

**ACTION**: Add a section whose heading is byte-exactly `#### The `Parallel` column`
— the column name in backticks, matching the existing `#### The `Repo` column`
heading it sits beside — immediately after that section and before
`#### Phase-status lifecycle`. It states, for a PRD author: the cell is
optional; leaving it `-` derives lanes from `Depends` alone; writing
`lane:<label>` on two or more rows merges them into one lane that runs
sequentially; a label can only make execution more serial, never less; and any
other text is legacy and ignored. It must delegate the authoritative rules to
the contract by naming `resources/lane-model.md` inside a `(see ...)`
parenthetical, exactly as the `Repo` column section delegates to
`repository-topology.md`. Do not restate the derivation algorithm here — one
authority only.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/resources/prd-template.md:190-194`
**VALIDATE**: the three headings are located by their byte-exact backticked
form, and each is asserted UNIQUE before any ordering comparison is made — a
position comparison against a heading that occurs twice would compare the wrong
line and pass or fail for the wrong reason:
```bash
set -euo pipefail
T=plugins/relay/resources/prd-template.md
grep -q 'resources/lane-model.md' "$T"
for H in '^#### The `Repo` column$' '^#### The `Parallel` column$' '^#### Phase-status lifecycle$'; do
  C=$(grep -c "$H" "$T")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
R=$(grep -n '^#### The `Repo` column$' "$T" | cut -d: -f1)
P=$(grep -n '^#### The `Parallel` column$' "$T" | cut -d: -f1)
L=$(grep -n '^#### Phase-status lifecycle$' "$T" | cut -d: -f1)
if [ "$R" -lt "$P" ] && [ "$P" -lt "$L" ]; then
  echo "PASS: Parallel column section is correctly placed"
else
  echo "FAIL: section order is $R / $P / $L; expected Repo < Parallel < lifecycle"; exit 1
fi
```

### Task 3: UPDATE `plugins/relay/agents/prd-reviewer.md`

**ACTION**: Add a `#### R-COH-PARALLEL-CONTRADICTS-DEPENDS` check to the
coherence layer, immediately after `R-COH-REPO-UNDECLARED` and before
`R-COH-DESIGN-SOURCE-INCOMPLETE`, carrying `**Class:** blocking`. Its first
bullet must open with the byte-exact label `**Zero-emission branch:**` — the
same capitalised form `R-COH-REPO-UNDECLARED` uses, which the VALIDATE below
greps case-sensitively — and read: if no Implementation Phases row carries a
`Parallel` cell matching the `lane:` grammar, emit NO row at all — the case for
every PRD that exists today. Otherwise derive the lanes per `resources/lane-model.md` and fail
when two rows in one derived component carry different labels (the `reason`
names both phase numbers, both labels and the code
`FAILED_LANE_SPLIT_FORBIDDEN`), or when one label spans rows with differing
`Repo` cells (the `reason` names the label, both repos and the code
`FAILED_LANE_CROSS_REPO`). Otherwise pass. Do not restate the derivation
algorithm — cite the contract, as `R-COH-REPO-UNDECLARED` cites
`repository-topology.md`.
Delivers **AC-A3**, and jointly with Task 1 delivers **AC-A6** — the
zero-emission branch is the half of AC-A6 that keeps the rubric silent on every
PRD approved before this phase.
**MIRROR**: `# SOURCE: plugins/relay/agents/prd-reviewer.md:375-383`
**VALIDATE**:
```bash
set -euo pipefail
grep -q '^#### R-COH-PARALLEL-CONTRADICTS-DEPENDS' plugins/relay/agents/prd-reviewer.md
grep -q 'FAILED_LANE_SPLIT_FORBIDDEN' plugins/relay/agents/prd-reviewer.md
grep -q 'FAILED_LANE_CROSS_REPO' plugins/relay/agents/prd-reviewer.md
grep -q 'resources/lane-model.md' plugins/relay/agents/prd-reviewer.md
awk '/^#### R-COH-PARALLEL-CONTRADICTS-DEPENDS/{f=1} f && /Zero-emission branch/{found=1} /^#### R-COH-DESIGN-SOURCE-INCOMPLETE/{f=0} END{if(!found){print "FAIL: no zero-emission branch in the new rubric row"; exit 1} print "PASS: zero-emission branch present"}' plugins/relay/agents/prd-reviewer.md
```

### Task 4: CREATE `scripts/validate/checks/lane-contract.mjs`

**ACTION**: Author the check as a pure `checkLaneContract({ contract, consumers })`
returning `{ name, ok, findings }`, plus a thin `runLaneContractCheck()` wrapper
that reads the real files. Invariants, in this order: a missing or empty
`contract` input is a loud finding, never a throw and never a silent pass; the
contract must define at least one `FAILED_LANE_` code under its `## Named-code
registry` heading (a gutted registry is a finding); and every `FAILED_LANE_`
token appearing in any consumer must be one the registry defines (an undefined
or misspelled code is a finding naming the file, the line and the offending
token). Scope is self-selecting in exactly the sense the mirrored comment block
describes: a consumer that cites no such token is out of scope, never held to
citing one. Candidate consumers are `plugins/relay/agents/prd-reviewer.md`,
`plugins/relay/commands/relay-execute.md` and
`plugins/relay/resources/prd-template.md`; an unreadable candidate is a finding.
Delivers **AC-A4**.
**MIRROR**: `# SOURCE: scripts/validate/checks/topology-contract.mjs:96-128`
**VALIDATE**: the check must be exercised, and above all must be shown able to
FAIL — a gate that only passes is what this repository spent a day removing:
```bash
set -euo pipefail
node --input-type=module -e '
import { checkLaneContract } from "./scripts/validate/checks/lane-contract.mjs";
const NL = String.fromCharCode(10);
const REG = ["## Named-code registry", "", "- FAILED_LANE_SPLIT_FORBIDDEN", "- FAILED_LANE_CROSS_REPO", ""].join(NL);
const missing = checkLaneContract({ contract: null, consumers: {} });
if (missing.ok) { console.error("FAIL: a null contract must not pass"); process.exit(1); }
const good = checkLaneContract({ contract: REG, consumers: { "a.md": "cites FAILED_LANE_CROSS_REPO here" } });
if (!good.ok) { console.error("FAIL: a well-formed input must pass: " + JSON.stringify(good.findings)); process.exit(1); }
const bad = checkLaneContract({ contract: REG, consumers: { "a.md": "cites FAILED_LANE_TYPOED here" } });
if (bad.ok) { console.error("FAIL: an undefined cited code must be caught"); process.exit(1); }
const gutted = checkLaneContract({ contract: ["## Named-code registry", "", "none yet", ""].join(NL), consumers: {} });
if (gutted.ok) { console.error("FAIL: an empty registry must be caught"); process.exit(1); }
console.log("PASS: negative cases fail, positive case passes");
'
```

### Task 5: UPDATE `scripts/validate/index.mjs` and `CLAUDE.md`

**ACTION**: Add an import of `runLaneContractCheck` from
`./checks/lane-contract.mjs` alongside the existing check imports, and append
`runLaneContractCheck` to the `CHECKS` array. Then update `CLAUDE.md` so its
validation line reads `(20 static consistency checks; docs at
documentation/guide/validation-suite.html).`
Delivers **AC-A5**.
**MIRROR**: `# SOURCE: scripts/validate/checks/topology-contract.mjs:96-128`
(its `runTopologyContractCheck` export is the wrapper `index.mjs` imports)
**VALIDATE**: the registration is exercised by running the suite, and the
advertised count is compared against the count the suite actually reports:
```bash
set -euo pipefail
OUT=$(npm run validate 2>&1)
printf '%s\n' "$OUT" | grep -q '^\[PASS\] lane-contract$'
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
node --check scripts/validate/checks/lane-contract.mjs
node --check scripts/validate/index.mjs
npm run validate 2>&1 | grep -q '^\[PASS\] line-endings$'
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
for CODE in FAILED_LANE_SPLIT_FORBIDDEN FAILED_LANE_CROSS_REPO; do
  grep -q "$CODE" plugins/relay/resources/lane-model.md
  grep -q "$CODE" plugins/relay/agents/prd-reviewer.md
done
grep -qi 'more serial' plugins/relay/resources/lane-model.md
# `git status --porcelain` rather than `git diff`: the phase-boundary `git add -A`
# stages the tree, and `git diff` (working tree vs index) would then report
# nothing for a file that HAS been modified. The porcelain form sees both.
if git status --porcelain -- plugins/relay/commands/relay-execute.md | grep -q .; then
  echo "FAIL: relay-execute.md is out of scope for phase 1"; exit 1
else
  echo "PASS: orchestrator loop untouched"
fi
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
# `npm run validate` alone is green on an UNMODIFIED tree and therefore cannot
# tell this phase's work apart from its absence. The grep is what makes this
# level able to fail before the phase is done.
npm run validate 2>&1 | tee /dev/stderr | grep -q '^\[PASS\] lane-contract$'
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-2):** `plugins/relay/resources/lane-model.md` defines a lane as
  a weakly-connected component of the `Depends` graph computed within a `Repo`
  partition, and carries the worked example in which rows 1, 2, 3 have empty
  `Depends` and rows 4, 5 depend on 1, yielding the three lanes {1, 4, 5}, {2}
  and {3}.
- **AC-A2 (PRD AC-3):** `prd-template.md` carries a `#### The Parallel column`
  section stating that `lane:<label>` merges rows into one lane, that the
  override can only make execution more serial, and that any other cell value is
  legacy and ignored; the section delegates the authoritative rules to the
  contract rather than restating them.
- **AC-A3 (PRD AC-3):** `prd-reviewer.md` carries a blocking
  `R-COH-PARALLEL-CONTRADICTS-DEPENDS` row with a zero-emission branch, which
  refuses a split by `FAILED_LANE_SPLIT_FORBIDDEN` and a cross-repo label by
  `FAILED_LANE_CROSS_REPO`, each naming the offending phases.
- **AC-A4 (PRD AC-2, AC-3):** `scripts/validate/checks/lane-contract.mjs` exports
  a pure `checkLaneContract({ contract, consumers })` that returns a finding for
  a null contract, for an empty registry, and for a consumer citing a code the
  registry does not define — and passes a well-formed input. All four cases are
  exercised by Task 4's VALIDATE, so the gate is demonstrated able to fail.
- **AC-A5 (PRD AC-1):** `npm run validate` reports `[PASS] lane-contract` and the
  count it prints equals the count `CLAUDE.md` advertises.
- **AC-A6 (PRD AC-1):** No approved PRD changes meaning: every `Parallel` cell
  value present in `PRPs/prds/` today remains a legacy no-op, and the new rubric
  row emits nothing for a PRD carrying no `lane:` declaration.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A strict `Parallel` grammar retroactively invalidates the ~19 free-text values across 13 approved PRDs | H | H | Only `lane:<label>` is recognized; every other value is legacy and explicitly a no-op. AC-A6 and the rubric row's zero-emission branch both encode this, and Level 2 asserts the one-directional sentence survives |
| The new `R-COH-*` row perturbs `prd-reviewer`'s rubric-count assertions | M | M | The 2026-08-05 decision requires those counts be re-derived from live headings, never hardcoded; Level 3 runs the full corpus, which is where a hardcoded count would surface |
| The lane check passes vacuously because no consumer cites a code | M | H | Task 3 makes `prd-reviewer` cite both codes in the same phase, and Level 2 asserts each code appears in both the contract and a consumer; Task 4's VALIDATE additionally proves the failing direction |
| The cross-repo `Depends` edge is silently dropped, letting a dependent lane start early | M | H | The contract states explicitly that such an edge is retained as an inter-lane ordering constraint rather than merging lanes; phase 5's scheduler consumes that clause |
| Defining lanes without a scheduler leaves a contract nothing exercises until phase 5 | M | L | Accepted and deliberate — this is what `Depends: 1` on rows 2, 3 and 4 expresses. The validation check gives the contract a consumer immediately rather than leaving it inert |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework.
- **Grounding method.** This plan's Phase 2 GROUNDING was performed inline with
  `Grep`/`Read` rather than by dispatching the `research-codebase` and
  `research-web` subagents, because this session carries a standing operator
  instruction not to dispatch subagents unless explicitly requested. Every
  `# SOURCE:` anchor above is a real, verified `file:line` in this repository;
  no finding is inferred. Web research was not performed — this phase is
  entirely internal to relay's own contract surface and has no external
  grounding value, which is the `degradation_reason` the `research-web`
  contract would itself have returned.
- **Why the override is one-directional.** An author choosing to be more
  conservative than the graph is always safe: merging two lanes only removes
  concurrency. An author claiming two dependent rows are separable asserts
  something the `Depends` column already contradicts, and honoring it would run
  a phase before the phase it depends on. The asymmetry is therefore not a
  convention but a consequence.
- **The legacy vocabulary, measured.** Across `PRPs/prds/`, the `Parallel`
  column holds 113 `-` cells and roughly 19 free-text values (`yes`,
  `yes (with #2)`, `with 4`, `after 1 contract`). None was ever machine-read.
  The `lane:` prefix was chosen precisely because no existing value carries it,
  so the new grammar cannot collide with the old prose.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
