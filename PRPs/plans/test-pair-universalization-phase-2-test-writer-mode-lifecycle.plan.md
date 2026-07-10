# Feature: test-writer: mode + lifecycle (Phase 2 of test-pair-universalization)

```
**Decision Gate**
- Active context: none
- Activated criteria: agent-prompt contract change in plugins/relay/agents/; cross-cutting evolution of the sole-test-author invariant from create-only to a full CREATE/UPDATE/DELETE lifecycle; new suite-manifest lifecycle-ledger shape consumed downstream by test-reviewer (Phase 3) and post-green/B5 (Phase 4); anti-gaming (weakening-tests) surface
- Decisions found:
  - 2026-05-06 "TDD pair is the only authorized mechanism for creating test files (R-X strict preserved)" — PARTIALLY SUPERSEDED by this PRD: the pair's authority is EXTENDED from create-only to the full create/update/delete lifecycle via the manifest lifecycle ledger; the sole-author invariant is preserved and R-X strict on the Implementer is untouched (this phase edits only the writer agent, never the Implementer or code-reviewer). Codification of the supersede lands in docs/decisions.md in Phase 8, not here.
  - 2026-05-12 "Test framework absence is a silent self-skip (empty test_frameworks → skip)" — PRESERVED: this phase does not change the activation gate. The agent still treats empty frameworks as an unexpected invocation; the command-layer activation reframe (tdd:false + frameworks → run test-after) is Phase 5's scope.
  - 2026-05-14 "phase_type annotation enables rubric differentiation" — this plan sets `phase_type: feature` (it adds capability to an agent contract; it is not scaffold/docs/refactor/foundation).
  - 2026-04-19 "PRP artifacts live under PRPs/, never under .claude/" — the suite manifest and its lifecycle ledger stay under PRPs/reports/<feature>/.
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the auto-correction loop turn green" — CONSCIOUSLY NARROWED by this PRD (recorded in the PRD's Decision Gate + Decisions Log): obsolete/redundant removals performed by the approved pair and justified in the ledger are legitimate; weakening a test that still encodes a live in-scope AC stays forbidden. This phase implements only the WRITER side (recording ledger entries with classification + justification); the reviewer-side R-LIFECYCLE-LEGITIMATE (Phase 3) and the B5 ledger gate (Phase 4) are what enforce it, and the docs/anti-patterns.md narrowing itself is Phase 8. The Implementer + auto-correction loop still touch zero test files.
  - "Writing TDD tests that mirror the imagined implementation" — in test-after the failure mode inverts to mirroring the ACTUAL implementation; the writer must still derive tests from the AC's observables, not from the code it read (test-reviewer R-IMPL-LEAK enforces in Phase 3; avoided at write time here).
  - "Writing pipeline artifacts under .claude/" — preserved; the manifest stays under PRPs/reports/<feature>/.
- Applicable architectural rules:
  - R-X strict universal guard (Implementer/code-reviewer author zero test files) — untouched by this phase; the pair remains the sole test author, and in test-after the pair's diff is reviewed by test-reviewer, never by the Code Reviewer.
  - Interactivity boundary (autonomous after PRD approval) — the test-writer agent never prompts the user; it emits structured outcomes/halts. Unchanged.
  - PRP artifact paths — suite manifest under PRPs/reports/<feature>/test-suite.diff.
- Result: PROCEED (the create-only → full-lifecycle extension and the anti-pattern narrowing are conscious, PRD-authorized evolutions recorded in the source PRD's Decision Gate + Decisions Log; the governing docs/decisions.md + docs/anti-patterns.md codification is Phase 8's scope, not this phase's)
```

## Source PRD

- `PRPs/prds/test-pair-universalization.prd.md` — Implementation Phases row 2:
  "test-writer: mode + lifecycle" — Goal: the writer authors, updates, and
  retires tests after implementation, recording every non-create op — Success
  signal: AC-3, AC-5, AC-6, AC-7, AC-9 on a tdd:false fixture (Phase Details
  line 219). This phase carries the invariant AC-12 (R-X strict preserved) as
  the boundary it must not cross.

## Summary

This phase gives the already-renamed `test-writer` agent (Phase 1 landed the
`tdd-writer` → `test-writer` rename) two new capabilities, entirely within the
single prompt file `plugins/relay/agents/test-writer.md`. First, **mode
awareness**: the agent recognises test-first (`tdd: true` → the pair runs before
the Implementer; a legitimately red suite is the target) versus test-after
(`tdd: false` + non-empty frameworks → the pair runs after the Implementer +
Code Review; a legitimately green suite against the already-implemented code is
the target), and its opening "observable contracts the Implementer must satisfy"
framing is reframed to be ordering-agnostic. Second, **full lifecycle
authority**: the create-only rule is relaxed so the writer may CREATE, UPDATE,
and DELETE test files, with every non-create operation recorded in the suite
manifest's new **lifecycle ledger** under one of three classifications —
`EXISTING_TEST_UPDATED`, `OBSOLETE_TEST_REMOVED` (behavior gone from the in-scope
ACs), `REDUNDANT_TEST_REMOVED` (proven duplicate naming the survivor) — each with
a justification. The current hard aborts (AMBIGUOUS on any existing-test edit;
abort when Files-to-Change lists non-test files) are relaxed accordingly, while
the R-X inverse (the writer authors zero production files) and the anti-weakening
guarantee (never retire a test still mapping to a live in-scope AC) are
preserved. The reviewer-side legitimacy check (Phase 3), the command activation
gate (Phase 5), the orchestrator ordering (Phase 6), and the B5 ledger-awareness
(Phase 4) are explicitly out of scope; this phase makes the writer *ready* for
test-after and lifecycle ops, which later phases wire and enforce.

## User Story

As a relay maintainer universalizing the test pair
I want the `test-writer` agent to understand test-first vs test-after ordering and to own the full CREATE/UPDATE/DELETE test lifecycle with an auditable per-operation ledger
So that a `tdd: false` project can have its tests authored, updated, and obsolete/redundant ones retired after implementation — each with a recorded justification — instead of the agent aborting AMBIGUOUS on the first existing-test edit.

## Problem Statement

Today `test-writer` is create-only and test-first-only. Its Phase 0 halts as an
"unexpected invocation" whenever `tdd: false`, so it has no notion of a
test-after ordering. Its hard constraints forbid modifying any existing test
(emit `AMBIGUOUS` and abort the whole suite) and forbid proceeding when the
plan's `## Files to Change` lists non-test files — both of which are wrong in a
test-after world where the Implementer has already produced production code and
where an in-scope AC may legitimately require updating a test whose contract
changed or retiring a test whose behavior was removed. The suite manifest
(`test-suite.diff`) records only create/existing-coverage outcomes, with no place
to record — and therefore no way to justify — an update or a deletion. Without a
mode branch and a lifecycle ledger in the writer, a `tdd: false` feature that
must evolve its suite dead-ends at an AMBIGUOUS abort.

## Solution Statement

Edit `plugins/relay/agents/test-writer.md` only. (1) Reframe the opening role
statement to be ordering-agnostic and add a `mode` (test-first vs test-after)
determination in Phase 0, replacing the `tdd: false` "unexpected invocation"
halt with a mode assignment (empty-frameworks and, for test-first, foundation
halts preserved). (2) Relax hard constraint 1 so a plan whose Files-to-Change
lists the already-run Implementer's production files does not abort — the writer
still authors zero production files. (3) Relax hard constraint 2 from
"modifications to existing test files are forbidden" to "the writer may CREATE,
UPDATE, and DELETE test files; every non-create op is recorded in the lifecycle
ledger with a classification + justification." (4) Add the three new outcomes
(`EXISTING_TEST_UPDATED`, `OBSOLETE_TEST_REMOVED`, `REDUNDANT_TEST_REMOVED`) with
their decision criteria to Phase 2, and remove the "AC requires editing an
existing test — out of B7's scope" bullet from the AMBIGUOUS examples. (5) Extend
the Step 3.1 manifest template with a `## Lifecycle ledger` section and add a
writer-side completeness self-check to Phase 3, and narrow the agent's own
anti-patterns list to carve out ledger-justified removals while keeping weakening
forbidden. No other file is touched; R-X strict on the Implementer/code-reviewer
is untouched.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (agent-contract capability extension: mode-awareness + full test lifecycle) |
| Complexity | Medium — single prompt file, but the edits are semantically load-bearing (new mode branch, relaxed invariants, new manifest section) and must preserve the anti-weakening + R-X-inverse guarantees |
| Systems Affected | `plugins/relay/agents/test-writer.md` only; the `test-suite.diff` manifest artifact shape it produces under `PRPs/reports/<feature>/` (consumed by test-reviewer in Phase 3 and B5 in Phase 4) |
| Dependencies | Source PRD row 2 `Depends: 1` — Phase 1 (rename) is `complete` |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/test-pair-universalization.prd.md` Implementation Phases row 2 (line 206); Phase Details line 219; ACs AC-3 (78), AC-5 (80), AC-6 (81), AC-7 (82), AC-9 (84); invariant AC-12 (87) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-pair-universalization.prd.md` | 206, 219, 78-84, 87 | Phase 2 row + Phase Details + the in-scope ACs (AC-3/5/6/7/9) + the AC-12 invariant boundary |
| P0 | `plugins/relay/agents/test-writer.md` | 44-58 | Hard constraints 1 & 2 — the non-test-file abort and the create-only "existing test edit → AMBIGUOUS" rule this phase relaxes |
| P0 | `plugins/relay/agents/test-writer.md` | 90-119 | Phase 0 — where `tdd:`/`test_frameworks` are read and the `tdd: false` self-skip halt lives (becomes the mode branch); the foundation halt (test-first only) |
| P0 | `plugins/relay/agents/test-writer.md` | 9-14 | The "observable contracts the Implementer must satisfy" role framing to be made ordering-agnostic |
| P0 | `plugins/relay/agents/test-writer.md` | 254-311 | The AMBIGUOUS "editing an existing test — out of B7's scope" bullet (265) + the Phase 3 aggregate-verdict / halt-on-AMBIGUOUS logic |
| P0 | `plugins/relay/agents/test-writer.md` | 315-347 | Step 3.1 `test-suite.diff` manifest template (heading, AC-outcome table, trailing `*Status: DRAFT*`) the lifecycle ledger extends |
| P1 | `plugins/relay/agents/test-writer.md` | 366-397 | The agent's own anti-patterns list (the "Modifying existing test files → AMBIGUOUS" bullet to narrow) |
| P1 | `plugins/relay/agents/docs-updater.md` | 225-265 | Closest per-item "classification + justification" manifest prior art (per-file Change type + Rationale block) to mirror the ledger table shape |
| P2 | `plugins/relay/agents/test-reviewer.md` | 249-322 | The single mode-dependent R-RED-LEGITIMATE check today — read-only context for how the writer's mode/ledger will be validated in Phase 3 (do NOT edit this file) |
| P2 | `plugins/relay/commands/relay-write-test.md` | 112-169 | The P4/P5 command gate that still self-skips on tdd:false / empty frameworks / foundation — confirms activation is Phase 5's scope, NOT this phase's (do NOT edit this file) |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/test-writer.md:44-58
```
## Hard constraints (read before anything else)

1. **Production code is forbidden.** You write only test files.
   ... If
   the plan's `## Files to Change` rows include non-test files,
   abort — those belong to the Implementer.
2. **Modifications to existing test files are forbidden.** B7
   creates new test files only. If covering an AC requires
   editing an existing test, emit
   `AMBIGUOUS` for that AC and abort the suite — the human must
   either expand the AC or rewrite the existing test before the
   Implementer runs.
```
This is the create-only rule Task 2 relaxes. Constraint 1's non-test-file abort
becomes conditional (test-after plans legitimately list the already-run
Implementer's production files; the writer still writes only test files).
Constraint 2 becomes "may CREATE, UPDATE, DELETE with every non-create op in the
lifecycle ledger." The R-X inverse ("the writer authors zero production files")
is retained verbatim in intent.

# SOURCE: plugins/relay/agents/test-writer.md:90-103
```
## Phase 0 — Setup (internal, no user dialogue)

Before Phase 1, read these files from `<target_root>`:

- `docs/context/methodology.md` — capture `tdd:` and
  `test_frameworks: [...]`.
  - If `tdd: false` or the file is missing: `/relay-write-test` already
    self-skipped; you should not have been invoked. Halt with
    `unexpected invocation: tdd track inactive at agent layer` and
    exit.
```
Task 1 replaces the `tdd: false` halt with a mode assignment: `tdd: true` +
non-empty frameworks → `mode = test-first`; `tdd: false` + non-empty frameworks →
`mode = test-after`. The empty-frameworks halt (unexpected invocation) is kept;
the foundation halt is scoped to test-first (in test-after the seam already
exists).

# SOURCE: plugins/relay/agents/test-writer.md:9-14
```
You are the TDD Writer agent ... walk every Acceptance Criterion (AC-N), and produce
the **initial test suite** that encodes those ACs as observable
contracts the Implementer must satisfy.
```
Task 1 reframes this to be ordering-agnostic: the suite encodes each AC as an
observable contract — which in test-first the Implementer must satisfy, and in
test-after the already-implemented code must satisfy (a red suite then surfaces
an implementation bug or a bad test, resolved by the reviewer's GREEN-legitimate
check in Phase 3).

# SOURCE: plugins/relay/agents/test-writer.md:315-343
```
### Step 3.1 — Write `test-suite.diff`

...
## AC outcomes

| AC | Outcome | Path / mapping |
|---|---|---|
| AC-<N1> | NEW_TEST_REQUIRED | <new_test_path> |
| AC-<N2> | EXISTING_TEST_COVERS | <existing_test_path>:<line> |
| AC-<N3> | OUT_OF_PHASE_SCOPE | (deferred to phase <N+1>) |

## Test files written this session

<list of new test paths, or "(none — existing coverage sufficient)">

## Status

*Status: DRAFT*
```
Task 4 extends this template with a `## Lifecycle ledger` section between the
AC-outcomes table and the Status block, preserving the trailing `*Status: DRAFT*`
that `/relay-test-write-review` flips.

# SOURCE: plugins/relay/agents/docs-updater.md:225-265
```
### `<path/to/file.md>`

**Change type:** additive | structural | index-update
**Rationale:** <one or two sentences...>
```
The nearest existing "classification + justification per item" manifest shape in
the plugin. Task 4's lifecycle-ledger table mirrors this idea as columns:
`| Op | Classification | Test (file:function) | Justification |`, where
Classification is one of the three lifecycle tokens and Justification names the
driving AC (update), the removed behavior/AC (obsolete), or the surviving test
(redundant).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/test-writer.md` | UPDATE | The entire Phase 2 scope — mode branch (Phase 0 + opening framing), relaxed hard constraints 1 & 2, three new lifecycle outcomes, the manifest lifecycle-ledger section, the Phase 3 completeness self-check, and the narrowed agent-local anti-patterns list — all live in this single agent prompt file |

## NOT Building (Scope Limits)

- **No reviewer changes.** `R-LIFECYCLE-LEGITIMATE`, the RED↔GREEN mode-dependent
  legitimacy inversion, and validation of ledger entries against the diff are
  Phase 3 (`plugins/relay/agents/test-reviewer.md`). This phase does not edit
  test-reviewer.md.
- **No command-gate changes.** Making `tdd: false` + frameworks actually dispatch
  the pair (stop self-skipping), and scoping foundation-skip to test-first, are
  Phase 5 (`relay-write-test.md` / `relay-test-write-review.md`). This phase does
  not edit either command; the agent is made *ready* for test-after but is not
  yet wired to be reached in that mode.
- **No orchestrator ordering.** Positioning the pair before vs after the
  Implementer, run-log outcomes, and handing the manifest path to B5 are Phase 6
  (`relay-execute.md`). Not touched here.
- **No post-green (B5) ledger-awareness.** Making `post-green-reviewer` consult
  the approved ledger and detect whole-file deletions is Phase 4. Not touched
  here.
- **No R-X change on the Implementer or Code Reviewer.** R-X strict is preserved
  verbatim; `implementer.md` and `code-reviewer.md` are not edited. The writer
  remains the sole test author and authors zero production files.
- **No canonical-docs or governance edits.** The docs/decisions.md supersede,
  the docs/anti-patterns.md "weakening tests" narrowing, methodology semantics,
  and the version bump are Phases 7-9. This phase edits only the agent prompt.
- **No plan/PRD routing-note semantics.** The `tdd: false` note rewrite is Phase 7.

## Step-by-Step Tasks

### Task 1: UPDATE test-writer.md — add mode-awareness (Phase 0 branch + ordering-agnostic role framing)

- **AC**: AC-A1 (PRD AC-3) — the writer recognises test-after ordering and no longer treats `tdd: false` as an unexpected invocation.
- **ACTION**: In the opening role paragraph (lines 9-14), reframe "the **initial test suite** that encodes those ACs as observable contracts the Implementer must satisfy" to ordering-agnostic language: the suite encodes each AC as an observable contract that in **test-first** the Implementer must satisfy and in **test-after** the already-implemented code must satisfy. In Phase 0 (lines 90-119), replace the `tdd: false` "unexpected invocation: tdd track inactive" halt with a `mode` determination: `tdd: true` + non-empty `test_frameworks` → `mode = test-first`; `tdd: false` + non-empty `test_frameworks` → `mode = test-after`. Keep the empty-`test_frameworks` halt (unexpected invocation) verbatim in intent. Scope the `phase_type: foundation` halt to `mode = test-first` only (state that in test-after the seam already exists, so foundation-skip does not apply). Do NOT edit any command or reviewer file.
- **MIRROR**: `plugins/relay/agents/test-writer.md:90-103` (Phase 0 read/halt) and `:9-14` (role framing).
- **VALIDATE**: `f=plugins/relay/agents/test-writer.md; if grep -q 'test-after' "$f" && grep -q 'test-first' "$f"; then echo PASS; else echo "FAIL: mode branch missing"; exit 1; fi`

### Task 2: UPDATE test-writer.md — relax hard constraints 1 & 2 to full lifecycle authority

- **AC**: AC-A2 (PRD AC-5), AC-A6 (PRD AC-3, AC-12) — the writer may modify existing tests; the non-test-file abort no longer fires in test-after; the writer still authors zero production files.
- **ACTION**: In hard constraint 1 (lines 46-52), make the "abort if Files-to-Change lists non-test files" conditional: in `mode = test-after` the plan's Files-to-Change legitimately contains the already-run Implementer's production files, so the writer does NOT abort; it simply authors no production file itself (retain the R-X inverse: "You write only test files"). In hard constraint 2 (lines 53-58), replace "Modifications to existing test files are forbidden … emit `AMBIGUOUS` … and abort the suite" with: the writer may CREATE, UPDATE, and DELETE test files; every non-create operation MUST be recorded in the suite manifest's lifecycle ledger (Step 3.1) with a classification and a justification; a test that still maps to a live in-scope AC must NOT be weakened or removed (that remains AMBIGUOUS / a reviewer-blocked weakening).
- **MIRROR**: `plugins/relay/agents/test-writer.md:44-58` (hard constraints 1 & 2).
- **VALIDATE**: `f=plugins/relay/agents/test-writer.md; if grep -qi 'CREATE, UPDATE, and DELETE' "$f" && grep -qi 'lifecycle ledger' "$f"; then echo PASS; else echo "FAIL: lifecycle authority not stated"; exit 1; fi`

### Task 3: UPDATE test-writer.md — add the three lifecycle outcomes; drop the "existing-test edit → AMBIGUOUS" bullet

- **AC**: AC-A2 (PRD AC-5), AC-A3 (PRD AC-6), AC-A4 (PRD AC-7) — UPDATE/DELETE decisions have named outcomes with decision criteria, and editing an existing test is no longer categorically AMBIGUOUS.
- **ACTION**: In Phase 2 (the per-AC outcome section, near lines 154-268), add three outcomes with decision criteria and the data each must record: `EXISTING_TEST_UPDATED` (an in-scope AC changed the contract of an existing test → UPDATE it; record `file:function` + the driving AC), `OBSOLETE_TEST_REMOVED` (an in-scope behavior was removed from the contract and an existing test only covers it → DELETE it; record `file:function` + the removed behavior/AC), `REDUNDANT_TEST_REMOVED` (two tests cover the same observable with no discriminative difference → remove one; record `file:function` + the surviving test). State the anti-weakening guard on each removal: only when the behavior maps to no live in-scope AC. Remove the "AC requires editing an existing test — out of B7's scope." bullet from the AMBIGUOUS examples (line 265).
- **MIRROR**: `plugins/relay/agents/test-writer.md:254-268` (AMBIGUOUS examples to prune) and the Phase 2 outcome structure at `:154-252`.
- **VALIDATE**: `f=plugins/relay/agents/test-writer.md; miss=0; for t in EXISTING_TEST_UPDATED OBSOLETE_TEST_REMOVED REDUNDANT_TEST_REMOVED; do grep -q "$t" "$f" || { echo "FAIL: missing $t"; miss=1; }; done; if grep -q "out of B7's scope" "$f"; then echo "FAIL: stale AMBIGUOUS edit bullet remains"; miss=1; fi; if [ "$miss" -eq 0 ]; then echo PASS; else exit 1; fi`

### Task 4: UPDATE test-writer.md — add the `## Lifecycle ledger` section to the Step 3.1 manifest template

- **AC**: AC-A5 (PRD AC-9) — every UPDATE/DELETE is recorded in the manifest with a classification + justification.
- **ACTION**: In Step 3.1 (lines 315-343), insert a `## Lifecycle ledger` section between the `## Test files written this session` block and the `## Status` block. Give it a table with columns `| Op | Classification | Test (file:function) | Justification |` where `Op` is UPDATE or DELETE, `Classification` is one of `EXISTING_TEST_UPDATED` / `OBSOLETE_TEST_REMOVED` / `REDUNDANT_TEST_REMOVED`, and `Justification` names the driving AC (update), the removed behavior/AC (obsolete), or the surviving test (redundant). State the default row `(none — no update/delete this session)` when the session was create-only. Preserve the trailing `*Status: DRAFT*` line exactly.
- **MIRROR**: `plugins/relay/agents/test-writer.md:315-343` (manifest template) + `plugins/relay/agents/docs-updater.md:225-265` (classification+rationale shape).
- **VALIDATE**: `f=plugins/relay/agents/test-writer.md; if grep -q 'Lifecycle ledger' "$f" && grep -q 'Classification' "$f" && grep -q '\*Status: DRAFT\*' "$f"; then echo PASS; else echo "FAIL: ledger section or status line missing"; exit 1; fi`

### Task 5: UPDATE test-writer.md — Phase 3 completeness self-check + narrow the agent-local anti-patterns

- **AC**: AC-A5 (PRD AC-9), AC-A1 (PRD AC-3) — the writer verifies ledger completeness before writing the manifest, and the SUITE_DRAFT_WRITTEN verdict covers update/delete-only sessions.
- **ACTION**: In Phase 3 (lines 272-311), broaden the `SUITE_DRAFT_WRITTEN` trigger so a session that produced at least one CREATE **or** UPDATE **or** DELETE (with zero AMBIGUOUS) yields the DRAFT verdict, and add a completeness self-check: before Step 3.1, confirm every UPDATE/DELETE performed this session has a matching lifecycle-ledger entry (this mirrors AC-9; the reviewer independently enforces in Phase 3). In the anti-patterns list (lines 366-397), replace the absolute "Modifying existing test files. Always emit `AMBIGUOUS`" bullet with a narrowed one: modifying/removing a test that still maps to a live in-scope AC is weakening (forbidden); a ledger-justified obsolete/redundant removal is legitimate. Do NOT edit `docs/anti-patterns.md` (that narrowing is Phase 8).
- **MIRROR**: `plugins/relay/agents/test-writer.md:272-311` (aggregate verdict) and `:388-397` (anti-patterns bullets).
- **VALIDATE**: `f=plugins/relay/agents/test-writer.md; if grep -qi 'live in-scope AC' "$f" && ! grep -q 'Always emit `AMBIGUOUS`' "$f"; then echo PASS; else echo "FAIL: anti-pattern not narrowed"; exit 1; fi`

## Validation Commands

**Level 1 — STATIC_ANALYSIS (frontmatter / structure well-formedness)**

```bash
f=plugins/relay/agents/test-writer.md
# The file still exists, opens with YAML frontmatter, and keeps its renamed name field.
test -f "$f" || { echo "MISSING $f"; exit 1; }
head -n 1 "$f" | grep -q '^---$' || { echo "FAIL: no frontmatter open"; exit 1; }
grep -q '^name: test-writer$' "$f" || { echo "FAIL: name field drifted"; exit 1; }
echo "PASS: structure intact"
```

**Level 2 — CONTENT_INVARIANTS (new capabilities present; stale prohibitions gone)**

```bash
f=plugins/relay/agents/test-writer.md
fail=0
# Positive presence: mode branch, full lifecycle, the three classifications, the ledger section.
for pat in 'test-after' 'test-first' 'CREATE, UPDATE, and DELETE' 'lifecycle ledger' \
           'EXISTING_TEST_UPDATED' 'OBSOLETE_TEST_REMOVED' 'REDUNDANT_TEST_REMOVED' 'Lifecycle ledger'; do
  grep -q "$pat" "$f" || { echo "FAIL: missing '$pat'"; fail=1; }
done
# Negative presence: the create-only prohibitions must be gone (real exit-code semantics, not grep && ||).
if grep -q "out of B7's scope" "$f"; then echo "FAIL: stale AMBIGUOUS edit bullet"; fail=1; fi
if grep -q 'Modifications to existing test files are forbidden' "$f"; then echo "FAIL: create-only rule remains"; fail=1; fi
# The anti-weakening guard survives.
grep -qi 'live in-scope AC' "$f" || { echo "FAIL: anti-weakening guard missing"; fail=1; }
if [ "$fail" -eq 0 ]; then echo "PASS: content invariants hold"; else exit 1; fi
```

**Level 3 — INTEGRATION (scope containment + manifest self-consistency)**

```bash
f=plugins/relay/agents/test-writer.md
# Scope containment: ONLY test-writer.md changed in the working tree (no reviewer / command / docs drift).
changed=$(git diff --name-only -- 'plugins/relay/' 'docs/')
if [ "$changed" != "plugins/relay/agents/test-writer.md" ]; then
  echo "FAIL: unexpected files changed ->"; echo "$changed"; exit 1
fi
# R-X inverse preserved: the writer still declares it authors only test files.
grep -qi 'You write only test files' "$f" || { echo "FAIL: R-X inverse dropped"; exit 1; }
# Manifest self-consistency: the trailing DRAFT status the review command flips is intact.
grep -q '\*Status: DRAFT\*' "$f" || { echo "FAIL: manifest DRAFT status missing"; exit 1; }
echo "PASS: scope contained + manifest consistent"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-3):** In `mode = test-after` (`tdd: false` + non-empty `test_frameworks`) the agent no longer halts as an unexpected invocation; it recognises test-after ordering and authors/updates tests against the already-implemented code, and its role framing reads as an ordering-agnostic "observable contract" (the Implementer must satisfy in test-first; the already-implemented code must satisfy in test-after).
- **AC-A2 (PRD AC-5):** When an in-scope AC requires modifying an existing test, the agent UPDATEs the test and records an `EXISTING_TEST_UPDATED` ledger entry (`file:function` + the driving AC) instead of aborting AMBIGUOUS.
- **AC-A3 (PRD AC-6):** When an in-scope behavior is removed from the contract and an existing test only covers it, the agent DELETEs that test and records an `OBSOLETE_TEST_REMOVED` ledger entry (`file:function` + the removed behavior/AC), without aborting.
- **AC-A4 (PRD AC-7):** When two tests cover the same observable with no discriminative difference, the agent removes one and records a `REDUNDANT_TEST_REMOVED` ledger entry naming the surviving test.
- **AC-A5 (PRD AC-9):** The Step 3.1 manifest template carries a `## Lifecycle ledger` section, and Phase 3 requires every UPDATE/DELETE performed in the session to have a matching ledger entry (classification + justification) before the manifest is written.
- **AC-A6 (PRD AC-3, PRD AC-12):** Hard constraint 1 no longer aborts when the plan's Files-to-Change lists the already-run Implementer's production files (test-after), and the R-X inverse is preserved verbatim in intent — the writer authors zero production files; every test-file change still originates from the pair.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Relaxing the create-only rule opens a weakening loophole (a still-live test retired as "obsolete") — PRD Technical Risk "legitimate deletion becomes a weakening loophole" (line 192) | M | H | Each removal decision states the anti-weakening guard (only when the behavior maps to no live in-scope AC); the ledger records classification + justification; the reviewer's `R-LIFECYCLE-LEGITIMATE` (Phase 3) and B5's ledger gate (Phase 4) independently validate — this phase only records, it is not the sole check |
| Test-after tests mirror the actual implementation (coupled) — PRD risk line 194 | M | M | Task 1 keeps the "derive from AC observables, not imagined/actual implementation" discipline; test-reviewer R-IMPL-LEAK stays strict (Phase 3); the reframed role text names the coupling failure mode explicitly |
| Agent made test-after-ready before the command wires it (Phase 5) / reviewer validates it (Phase 3), leaving a partially-active contract | M | M | The command still self-skips on tdd:false until Phase 5, so the agent is never *reached* in test-after in the interim — no observable regression; this is the same "contract-ready-before-wired" pattern used by the v0.9.0→v0.10.0 TDD routing branch; the phase ordering (5 depends on 2,3) is respected |
| An edit accidentally weakens R-X strict or touches a sibling agent/command/doc | L | H | Level-3 scope-containment check fails if any file other than `test-writer.md` changed under `plugins/relay/` or `docs/`; the R-X inverse ("You write only test files") is asserted present |
| Coupled manifest strings drift (ledger classifications don't match the Phase 2 outcome names) | L | M | Tasks 3 and 4 use the same three tokens; Level-2 greps assert all three appear (they are shared between the outcomes and the ledger table) |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
- Context for the routing note: the `relay` repo is itself `tdd: false` with `test_frameworks: []`, so no test suite is authored for this plan regardless of mode — the note is emitted byte-exact per its single source of truth (`plugins/relay/agents/prd-writer.md` Step 7.4). This PRD's Phase 7 later revises that note's *semantics* (to describe test-after authoring); Phase 2 does not touch the note.
- **Dogfood caveat.** This phase edits an agent prompt, not runtime code; its Acceptance Criteria are validated by human review of the prompt contract plus the grep-based content invariants here, and behaviorally by the dogfood run against a `tdd: false` target (`printed-exams-single-record`, per the PRD Success Metrics), not by an authored suite in this repo.
- **Grep exit-code discipline.** All "must-be-absent" checks in the Validation Commands use `if grep -q …; then echo FAIL; exit 1; fi` (real exit-code semantics), never the `grep … && echo FAIL || echo PASS` idiom, which always exits 0 and would mask a failure.
- **Cross-phase readiness.** Phase 2 makes the writer *capable* of test-after + lifecycle ops; the reviewer legitimacy check (Phase 3), the command activation (Phase 5), the orchestrator ordering (Phase 6), and B5 ledger-awareness (Phase 4) are the phases that wire and enforce it. The suite-manifest lifecycle-ledger shape introduced here is the contract those phases consume.
- **Web-research context (informational).** External practice corroborates the design: AI agents are documented to weaken/delete failing tests to force a green build (htek.dev "vibe testing when AI agents goodhart your test suite"; codescene.com agentic-AI best practices), which is exactly what the anti-weakening guard + ledger prevent; mutation testing is the industry evidence path for proving a test redundant (lakitna.medium.com), and quarantine-then-retire governance frames obsolete-test removal as an audited event (minware.com) — the lifecycle ledger is the relay analogue. No shipped tool was found implementing a per-op classification+justification ledger for AI-agent test lifecycle changes, so this is a novel synthesis (research gap, not a blocker).

*Generated: 2026-07-09*
*Approved: 2026-07-09*
*Status: APPROVED*
