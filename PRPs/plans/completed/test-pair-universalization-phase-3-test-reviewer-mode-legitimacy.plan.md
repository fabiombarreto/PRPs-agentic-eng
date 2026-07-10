# Feature: test-reviewer: mode + legitimacy (Phase 3 of test-pair-universalization)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decision (mode-aware reviewer legitimacy check); cross-cutting pattern (the test-authoring rubric contract intersecting the R-X sole-author invariant); reuse of an existing component (extends the `test-reviewer` agent, adds one rubric row, edits no other file); impact on a reusable service (the `test-reviewer` agent is consumed by `/relay-test-write-review` and the `/relay-execute` orchestrator)
- Decisions found:
  - 2026-05-06 "TDD pair is the only authorized mechanism for creating test files" — the reviewer's new `R-LIFECYCLE-LEGITIMATE` check is the reviewer-side enforcement of the sole-author invariant, now over the full create/update/delete lifecycle (the self-skip half was superseded by this PRD; the sole-author + anti-weakening half is PRESERVED and enforced here)
  - 2026-04-28 "R-COH-* rows are additive to the reviewer rubric[] array" (plan-reviewer + code-reviewer) — precedent that a reviewer's `rubric[]` audit array may gain rows beyond its original fixed count without violating the no-short-circuit contract; the seventh id `R-LIFECYCLE-LEGITIMATE` is added under the same additive discipline
  - Opt-in activation EVOLVED (this PRD): `tdd:` is an ordering selector (test-first vs test-after), not an existence gate — the reviewer's legitimacy row is the reviewer-side embodiment of that selector (RED-legitimate in test-first, GREEN-legitimate in test-after)
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the loop turn green" — consciously NARROWED by this PRD: `R-LIFECYCLE-LEGITIMATE` is the exact mechanism that separates a ledger-justified obsolete/redundant removal from weakening; a recorded removal/update whose test still maps to a live in-scope AC → CHANGES_REQUESTED
  - "Writing TDD tests that mirror the imagined implementation" — in test-after the failure mode shifts to mirroring the ACTUAL implementation; `R-IMPL-LEAK` stays strict and mode-agnostic (unchanged by this phase)
  - "Writing pipeline artifacts under .claude/" — preserved; the verdict JSONL stays under `PRPs/plans/`
- Applicable architectural rules:
  - Interactivity boundary (autonomous after PRD approval) — the reviewer never prompts the user; it returns APPROVED / CHANGES_REQUESTED
  - PRP artifact paths — the verdict JSONL stays under `PRPs/plans/<basename>.test-write-review.jsonl`, never `.claude/`
  - Command surface = 14 commands — this phase edits one agent file; no command is added or removed
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-pair-universalization.prd.md` — Implementation Phases row 3: "test-reviewer: mode + legitimacy" — Goal: the reviewer validates a test-after suite by GREEN legitimacy and validates lifecycle ops. Scope: invert R-RED→R-GREEN for test-after; add `R-LIFECYCLE-LEGITIMATE`; keep the five quality rows. Success signal: AC-4, AC-8, AC-9.

## Summary

This phase makes the `test-reviewer` agent (B8) mode-aware and lifecycle-aware, confined entirely to `plugins/relay/agents/test-reviewer.md`. Today the reviewer reads only `test_frameworks[]` from `methodology.md` and hardcodes a single RED-legitimate check that treats a suite passing pre-implementation as illegitimate — the test-first assumption. This phase (a) adds a Phase 0 `tdd:`-based `mode` derivation mirroring the writer's, (b) makes the legitimacy row mode-selected: `R-RED-LEGITIMATE` in test-first (unchanged) and an inverted `R-GREEN-LEGITIMATE` in test-after (a suite green against the already-implemented code passes; a red suite → CHANGES_REQUESTED surfacing "implementation bug or bad test"), and (c) adds a new seventh rubric row `R-LIFECYCLE-LEGITIMATE` that validates the writer's suite-manifest lifecycle ledger — no unrecorded UPDATE/DELETE in the diff, each `OBSOLETE_TEST_REMOVED` maps to no live in-scope AC, each `REDUNDANT_TEST_REMOVED` names a surviving test. The five quality checks (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) stay mode-agnostic and byte-unchanged in their logic; only the closed six-id enumerations that surround them expand to seven.

## User Story

```
As a developer running relay against a tdd:false project with declared test frameworks
I want the test-reviewer to approve a green test-after suite and to independently re-validate every ledger-recorded test update/removal
So that legitimately authored/updated/retired tests pass review while weakening (removing or gutting a test that still encodes a live requirement) is still blocked
```

## Problem Statement

In test-after mode the reviewer must adjudicate a suite that is green *by construction* (it runs against already-implemented code), yet the current `test-reviewer.md` hardcodes the test-first assumption: exit code 0 (suite green pre-implementation) → `passed: false` (`test-reviewer.md:271-274`). Run unchanged in test-after, the reviewer would reject every valid suite. Separately, the writer (Phase 2) now performs UPDATE and DELETE operations recorded in a suite-manifest lifecycle ledger (`test-writer.md:436-448`), and both the writer's Phase 3 self-check and its Hard constraint 2 forward-reference a `test-reviewer` `R-LIFECYCLE-LEGITIMATE` check that "independently re-validates every recorded op" — but no such check exists anywhere in `test-reviewer.md` today. Without it, an illegitimate removal (a test still mapping to a live in-scope AC) or an unrecorded deletion would pass review, reopening the weakening attack surface the ledger was designed to close.

## Solution Statement

Confine three changes to `plugins/relay/agents/test-reviewer.md`. First, read `tdd:` in Phase 0 and derive `mode` (`test-first` / `test-after`) exactly as the writer does (`test-writer.md:118-126`). Second, branch the single legitimacy rubric row by mode: keep `R-RED-LEGITIMATE` verbatim for test-first, and add an inverted `R-GREEN-LEGITIMATE` for test-after where exit code 0 (green against implemented code) → `passed: true` and any red → `passed: false` with the reason "implementation bug or bad test" (the seam-set discriminator, a test-first concept, does not apply in test-after because the production code already exists). Third, add a `R-LIFECYCLE-LEGITIMATE` section that parses the manifest's lifecycle ledger and cross-checks it against the observed test-file diff: (a) every test-file UPDATE/DELETE in the diff must have a matching ledger row (completeness, PRD AC-9); (b) each `OBSOLETE_TEST_REMOVED` must map to NO live in-scope AC, else weakening → `passed: false` (PRD AC-8); (c) each `REDUNDANT_TEST_REMOVED` must name a surviving test covering the same observable; (d) each `EXISTING_TEST_UPDATED` must not drop an assertion a live AC still requires. The five quality checks remain mode-agnostic and unchanged; the taxonomy grows from six ids to seven, and the aggregate verdict, output templates, JSONL example, and anti-pattern enumerations are updated to match.

## Metadata

| Field | Value |
|-------|-------|
| Type | Agent contract change (prompt-only markdown) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/test-reviewer.md` (B8 reviewer); downstream consumers `/relay-test-write-review` command and `/relay-execute` orchestrator read its verdict/JSONL |
| Dependencies | Phase 2 (test-writer mode + lifecycle ledger) — complete |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/test-pair-universalization.prd.md` Implementation Phases row 3 (line 207); Phase Details (line 221) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/test-reviewer.md` | whole file | The single file this phase edits; all five tasks confine here |
| P0 | `plugins/relay/agents/test-writer.md` | 108-130 | The writer's Phase 0 `tdd:`→`mode` derivation the reviewer must mirror byte-for-byte in semantics |
| P0 | `plugins/relay/agents/test-writer.md` | 285-327 | The three lifecycle classifications + anti-weakening guards `R-LIFECYCLE-LEGITIMATE` re-validates (the input contract) |
| P0 | `plugins/relay/agents/test-writer.md` | 436-448 | The exact `## Lifecycle ledger` table shape (`Op \| Classification \| Test (file:function) \| Justification`) the new check parses |
| P1 | `PRPs/prds/test-pair-universalization.prd.md` | AC-2/AC-4/AC-8/AC-9; Phase 3 Details (line 221); Architecture Notes (line 184) | The phase's acceptance contract and the "one genuinely mode-dependent rubric row" framing |
| P1 | `docs/context/methodology.md` | 1-5 | The `tdd:`/`test_frameworks[]` read target |
| P2 | `plugins/relay/agents/plan-reviewer.md` | 585-633 | The canonical no-short-circuit `rubric[]` append pattern the reviewer's Phase 3 already cites |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/test-writer.md:118-126
```
  - Otherwise determine `mode` from `tdd:` — this is an **ordering**
    selector, not an activation gate: `tdd: true` + non-empty
    `test_frameworks` → `mode = test-first` (the pair runs before the
    Implementer; a legitimately red suite pre-implementation is the
    target). `tdd: false` + non-empty `test_frameworks` → `mode =
    test-after` (the pair runs after the Implementer + Code Review; a
    legitimately green suite against the already-implemented code is
    the target — a red result surfaces an implementation bug or a bad
    test, which `test-reviewer`'s GREEN-legitimate check adjudicates).
```
Task 1 copies this mode-derivation into `test-reviewer.md` Phase 0 so the reviewer branches on the same `mode` the writer used. The writer already names the reviewer's "GREEN-legitimate check" — Task 3 makes that reference real.

# SOURCE: plugins/relay/agents/test-reviewer.md:271-274
```
- **Exit code 0** (suite green pre-implementation): the new
  tests pass before any implementation exists. The suite is
  *not* red-for-legitimate-reason. → `passed: false`,
  `reason: "suite green pre-implementation — tests pass without the SUT"`.
```
Task 3 wraps this rule in a `mode == test-first` branch (kept verbatim) and adds the inverted `mode == test-after` branch where exit code 0 → `passed: true` and a non-zero exit → `passed: false` with reason "suite red in test-after — implementation bug or bad test".

# SOURCE: plugins/relay/agents/test-writer.md:436-448
```
## Lifecycle ledger

Every UPDATE or DELETE performed this session, one row each. When
the session was create-only (no UPDATE/DELETE), the table's sole
row is the default `(none — no update/delete this session)` row
below instead of any operation rows.

| Op | Classification | Test (file:function) | Justification |
|----|-----------------|-----------------------|----------------|
| UPDATE | EXISTING_TEST_UPDATED | <file:function> | <driving AC + what changed> |
| DELETE | OBSOLETE_TEST_REMOVED | <file:function> | <removed behavior/AC> |
| DELETE | REDUNDANT_TEST_REMOVED | <file:function> | <surviving test file:function> |
| (none — no update/delete this session) | — | — | — |
```
Task 4's `R-LIFECYCLE-LEGITIMATE` parses this exact table. The sentinel `(none — no update/delete this session)` row means a create-only session → the check passes trivially (`passed: true`, nothing to validate).

# SOURCE: plugins/relay/agents/test-writer.md:301-327
```
### Outcome `OBSOLETE_TEST_REMOVED`
... Anti-weakening guard: this outcome applies ONLY
when the covered behavior maps to NO live in-scope AC. If any
in-scope AC still requires the behavior, removing the test is
weakening — emit `AMBIGUOUS` instead and do not delete anything.

### Outcome `REDUNDANT_TEST_REMOVED`
... Anti-weakening guard: this outcome applies ONLY
when the removed test is *provably* a duplicate of the survivor —
if the two tests differ in any discriminative input, precondition,
or assertion, neither is redundant; removing either one is
weakening — emit `AMBIGUOUS` instead.
```
Task 4 re-implements these guards as reviewer-side validations: `OBSOLETE_TEST_REMOVED` whose named behavior still maps to a live in-scope AC → `passed: false`; `REDUNDANT_TEST_REMOVED` whose ledger row names no surviving test (or a survivor that does not cover the same observable) → `passed: false`.

# SOURCE: plugins/relay/agents/test-reviewer.md:338-355
```
  "rubric": [
    { "id": "R-IMPL-LEAK", "passed": true },
    { "id": "R-TRIVIAL-ASSERT", "passed": false, "reason": "tests/foo.test.ts:45 — `expect(true).toBe(true)`" },
    { "id": "R-MOCK-ABUSE", "passed": true },
    { "id": "R-AC-COVERAGE", "passed": true },
    { "id": "R-DUPLICATE", "passed": true },
    { "id": "R-RED-LEGITIMATE", "passed": null, "reason": "degraded — test framework execution unavailable: pytest not in PATH" }
  ],
```
Task 5 extends this example array to seven rows: the legitimacy row becomes the mode-selected id (`R-RED-LEGITIMATE` in test-first / `R-GREEN-LEGITIMATE` in test-after) and a `R-LIFECYCLE-LEGITIMATE` row is appended, preserving the no-short-circuit walk.

# SOURCE: plugins/relay/agents/test-reviewer.md:61-72
```
4. **The five rubric ids are the canonical taxonomy:**
   `R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`,
   `R-AC-COVERAGE`, `R-DUPLICATE`. Plus the hybrid check
   `R-RED-LEGITIMATE`. Do not invent new ids; if a finding does
   not fit one of the six, drop it.
5. **No padding.** ...
6. **`passed: null` is reserved for `R-RED-LEGITIMATE` degraded
   environments only.** All other ids must produce `true` or
   `false`.
```
Task 2 expands this closed six-id enumeration to seven ids (adds `R-LIFECYCLE-LEGITIMATE`; generalizes the legitimacy id to the mode-selected pair), and generalizes constraint 6's `passed: null` reservation to "the mode-selected legitimacy row".

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/test-reviewer.md` | UPDATE | Add Phase 0 `tdd:`→`mode` read; make the legitimacy rubric row mode-selected (RED test-first / GREEN test-after); add the `R-LIFECYCLE-LEGITIMATE` check; expand the six-id enumerations to seven across frontmatter, Hard constraints, aggregate verdict, output templates, and anti-patterns. The entire phase is confined to this one file. |

## NOT Building (Scope Limits)

- **No change to the five quality checks' internal logic** (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) — they stay mode-agnostic and byte-identical; only the enumerations that surround them expand.
- **No B5 / post-green-reviewer ledger-awareness** — that is Phase 4 (`post-green-reviewer.md` + `/relay-test-review`).
- **No command-gate changes** — `/relay-write-test` / `/relay-test-write-review` activation and foundation-skip logic is Phase 5.
- **No orchestrator ordering** — positioning the pair before/after the Implementer is Phase 6.
- **No writer changes** — the lifecycle ledger and mode branch in `test-writer.md` shipped in Phase 2 (complete); this phase treats the writer's manifest as a fixed input contract.
- **No governance / docs / version bump** — `decisions.md`, `anti-patterns.md`, docs-site, and `plugin.json` → `0.19.0` are Phases 7–9.
- **No ledger content-hash anti-spoof** — MVP matches a removed test by `file + function` only; content-hash hardening is a deferred Could-item + Open Question in the PRD.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/test-reviewer.md — Phase 0 mode derivation

- **AC**: AC-A1 (PRD AC-4), AC-A2 (PRD AC-2) — deriving `mode` in Phase 0 is the precondition that lets the legitimacy row select RED (test-first) vs GREEN (test-after).
- **ACTION**: In `## Phase 0 — Setup`, extend the `methodology.md` read so it captures `tdd:` in addition to `test_frameworks[...]`, and derive `mode` (`test-first` when `tdd: true`, `test-after` when `tdd: false`), both gated on non-empty `test_frameworks`. State that `mode` is an ordering selector, not an activation gate, and that the legitimacy row's semantics (Step 1.6) branch on it. Preserve the committed canonical jsonl-basename derivation (the parent-directory-name rule) unchanged.
- **MIRROR**: Pattern `# SOURCE: plugins/relay/agents/test-writer.md:118-126` (the writer's `tdd:`→`mode` derivation).
- **VALIDATE**:
```bash
if ! grep -q 'test-first' plugins/relay/agents/test-reviewer.md || ! grep -q 'test-after' plugins/relay/agents/test-reviewer.md; then echo "FAIL: Phase 0 mode derivation (test-first/test-after) not added"; exit 1; fi; echo "PASS: mode read present"
```

### Task 2: UPDATE plugins/relay/agents/test-reviewer.md — expand taxonomy to seven ids

- **AC**: AC-A5 (PRD AC-8), AC-A1 (PRD AC-4) — enumerating `R-LIFECYCLE-LEGITIMATE` and the mode-selected legitimacy row in the canonical taxonomy is what lets those checks be emitted rather than dropped as "not one of the six".
- **ACTION**: Update the frontmatter `description`, the opening prose ("five-pathology rubric ... plus a hybrid `R-RED-LEGITIMATE` check"), Hard constraint 4 (the canonical-taxonomy enumeration — replace "one of the six" closed set with the seven ids: five quality + the mode-selected legitimacy row + `R-LIFECYCLE-LEGITIMATE`), and Hard constraint 6 (generalize the `passed: null` reservation to "the mode-selected legitimacy row: `R-RED-LEGITIMATE` in test-first, `R-GREEN-LEGITIMATE` in test-after"). Do NOT touch the five quality-check `###` sections themselves.
- **MIRROR**: Pattern `# SOURCE: plugins/relay/agents/test-reviewer.md:61-72` (the closed six-id enumeration being expanded).
- **VALIDATE**:
```bash
if ! grep -q 'R-LIFECYCLE-LEGITIMATE' plugins/relay/agents/test-reviewer.md; then echo "FAIL: R-LIFECYCLE-LEGITIMATE not enumerated in taxonomy"; exit 1; fi; if grep -qi 'one of the six' plugins/relay/agents/test-reviewer.md; then echo "FAIL: stale six-id closed set remains"; exit 1; fi; echo "PASS: taxonomy expanded to seven"
```

### Task 3: UPDATE plugins/relay/agents/test-reviewer.md — mode-select the legitimacy row (RED↔GREEN)

- **AC**: AC-A1 (PRD AC-4), AC-A2 (PRD AC-2) — this is the RED↔GREEN inversion itself: GREEN-legitimate for test-after (AC-A1) while preserving RED-legitimate for test-first (AC-A2).
- **ACTION**: In the legitimacy section (currently `### R-RED-LEGITIMATE`, Step 1.6), wrap the existing classification in a `mode == test-first` branch (kept verbatim, emitted under id `R-RED-LEGITIMATE`) and add a `mode == test-after` branch emitted under id `R-GREEN-LEGITIMATE`: exit code 0 (green against the already-implemented code) → `passed: true`; non-zero exit (assertion failure, compile/setup error, or any red) → `passed: false`, `reason: "suite red in test-after — implementation bug or bad test: <first failure line>"`. State explicitly that the seam-set discriminator applies to test-first ONLY (the production code already exists in test-after, so a red is never red-by-design). Keep the degraded `passed: null` fallback in both modes.
- **MIRROR**: Pattern `# SOURCE: plugins/relay/agents/test-reviewer.md:271-274` (the exit-code-0 rule being inverted for test-after).
- **VALIDATE**:
```bash
if ! grep -q 'GREEN-legitimate' plugins/relay/agents/test-reviewer.md || ! grep -q 'implementation bug or bad test' plugins/relay/agents/test-reviewer.md; then echo "FAIL: test-after GREEN-legitimate branch or reason string missing"; exit 1; fi; if ! grep -q 'R-GREEN-LEGITIMATE' plugins/relay/agents/test-reviewer.md; then echo "FAIL: R-GREEN-LEGITIMATE id not present"; exit 1; fi; echo "PASS: mode-selected legitimacy row present"
```

### Task 4: UPDATE plugins/relay/agents/test-reviewer.md — add the R-LIFECYCLE-LEGITIMATE check

- **ACTION**: Add a new `### R-LIFECYCLE-LEGITIMATE` subsection under `## Phase 1 — Run the rubric`. Instruct the reviewer to parse the manifest's `## Lifecycle ledger` table and cross-check it against the observed test-file changes in the diff. Rules: (a) completeness — every test-file UPDATE or DELETE present in the diff must have a matching ledger row keyed by `file:function`; any unrecorded op → `passed: false` (PRD AC-9); (b) `OBSOLETE_TEST_REMOVED` — the removed test's named behavior must map to NO live in-scope AC; if any in-scope AC still requires it → weakening → `passed: false` (PRD AC-8); (c) `REDUNDANT_TEST_REMOVED` — the ledger row must name a surviving test that covers the same observable; missing or non-covering survivor → `passed: false`; (d) `EXISTING_TEST_UPDATED` — the update must not drop an assertion a live in-scope AC still requires → else `passed: false`. A create-only session (sentinel `(none — no update/delete this session)` row) → `passed: true` with nothing to validate. This row is mode-agnostic. Note it matches by `file + function` (content-hash hardening deferred).
- **MIRROR**: Patterns `# SOURCE: plugins/relay/agents/test-writer.md:436-448` (ledger table shape) and `# SOURCE: plugins/relay/agents/test-writer.md:301-327` (the anti-weakening guards to re-validate).
- **VALIDATE**:
```bash
if ! grep -q 'OBSOLETE_TEST_REMOVED' plugins/relay/agents/test-reviewer.md || ! grep -q 'REDUNDANT_TEST_REMOVED' plugins/relay/agents/test-reviewer.md || ! grep -qi 'unrecorded' plugins/relay/agents/test-reviewer.md; then echo "FAIL: R-LIFECYCLE-LEGITIMATE validation rules (obsolete/redundant/unrecorded) incomplete"; exit 1; fi; echo "PASS: lifecycle check present"
```

### Task 5: UPDATE plugins/relay/agents/test-reviewer.md — wire seven rows into verdict, output, and JSONL example

- **AC**: AC-A1 (PRD AC-4), AC-A5 (PRD AC-8), AC-A4 (PRD AC-9) — wiring all seven rows into the verdict/output/JSONL with no short-circuit is what makes the mode-selected legitimacy row (AC-A1), the lifecycle rows (AC-A5), and the completeness failure (AC-A4) actually surface in the recorded verdict.
- **ACTION**: Update `## Phase 2 — Aggregate verdict` (the `rubric[]` example array → seven rows: five quality + the mode-selected legitimacy row + `R-LIFECYCLE-LEGITIMATE`), the `## Phase 4 — Output` templates (the APPROVED line "all 5 pathology checks passed; ..." now also names `R-LIFECYCLE-LEGITIMATE` and the mode-selected legitimacy row), and the Anti-patterns section (replace "Six rows always" with "Seven rows always"). Preserve the no-short-circuit discipline: every id emits exactly one row with a definitive `passed`, CHANGES_REQUESTED iff any row is `passed: false`, `passed: null` (degraded) non-blocking only on the legitimacy row.
- **MIRROR**: Pattern `# SOURCE: plugins/relay/agents/test-reviewer.md:338-355` (the verdict/JSONL rubric array being extended).
- **VALIDATE**:
```bash
if [ "$(grep -c 'R-LIFECYCLE-LEGITIMATE' plugins/relay/agents/test-reviewer.md)" -lt 2 ]; then echo "FAIL: R-LIFECYCLE-LEGITIMATE not wired into verdict/output/example"; exit 1; fi; if grep -qi 'Six rows always' plugins/relay/agents/test-reviewer.md; then echo "FAIL: stale 'Six rows always' anti-pattern remains"; exit 1; fi; echo "PASS: seven rows wired"
```

## Validation Commands

The `relay` repo has no build/lint/test toolchain (`methodology.md` is `tdd: false`, `test_frameworks: []`); the deliverable is a prompt-only markdown agent contract. Validation is therefore content-invariant grep with real exit-code semantics (the idiom `<check> && echo PASS || echo FAIL` is forbidden — it always exits 0). All commands run from `<target_root>` (`C:\repos\PRPs-agentic-eng`).

**Level 1 — STATIC_ANALYSIS (frontmatter / read-only invariant intact)**
```bash
if ! grep -qxF 'tools: Read, Write, Glob, Grep, Bash, BashOutput, Task' plugins/relay/agents/test-reviewer.md; then echo "FAIL: frontmatter tools line altered — Edit must stay absent (read-only review philosophy)"; exit 1; fi; echo "PASS: read-only frontmatter intact"
```

**Level 2 — CONTENT_INVARIANTS (mode-awareness + lifecycle + quality checks intact)**
```bash
f=plugins/relay/agents/test-reviewer.md
if ! grep -q 'R-LIFECYCLE-LEGITIMATE' "$f"; then echo "FAIL: R-LIFECYCLE-LEGITIMATE section missing"; exit 1; fi
if ! grep -q 'GREEN-legitimate' "$f"; then echo "FAIL: test-after GREEN-legitimate branch missing"; exit 1; fi
if ! grep -q 'implementation bug or bad test' "$f"; then echo "FAIL: test-after red reason string missing"; exit 1; fi
for id in R-IMPL-LEAK R-TRIVIAL-ASSERT R-MOCK-ABUSE R-AC-COVERAGE R-DUPLICATE; do
  if ! grep -q "$id" "$f"; then echo "FAIL: mode-agnostic quality check $id missing"; exit 1; fi
done
echo "PASS: mode-aware + lifecycle content invariants hold, five quality checks intact"
```

**Level 3 — DRY-RUN CONSISTENCY (enumerations agree; no stale closed-set text)**
```bash
f=plugins/relay/agents/test-reviewer.md
if grep -qi 'one of the six' "$f"; then echo "FAIL: stale 'one of the six' closed-set enumeration remains"; exit 1; fi
if grep -qi 'Six rows always' "$f"; then echo "FAIL: stale 'Six rows always' anti-pattern remains"; exit 1; fi
if ! grep -q 'R-RED-LEGITIMATE' "$f" || ! grep -q 'R-GREEN-LEGITIMATE' "$f"; then echo "FAIL: both mode-selected legitimacy ids must be enumerated"; exit 1; fi
if ! grep -q 'test-after' "$f"; then echo "FAIL: mode (test-first/test-after) not read in Phase 0"; exit 1; fi
echo "PASS: enumerations consistent across the file"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** In test-after mode, when `test-reviewer` evaluates the suite against the already-implemented code, it emits the legitimacy row `R-GREEN-LEGITIMATE` with `passed: true` when the suite is green and `passed: false` (reason "implementation bug or bad test") when the suite is red — the inversion of the RED-legitimate check.
- **AC-A2 (PRD AC-2):** In test-first mode, the legitimacy row stays `R-RED-LEGITIMATE` with its existing semantics (suite green pre-implementation → `passed: false`; legitimate red-by-design via the seam-set discriminator → `passed: true`), behavior identical to pre-change modulo the mode branch.
- **AC-A3 (PRD AC-8):** `R-LIFECYCLE-LEGITIMATE` returns `passed: false` (CHANGES_REQUESTED) when a ledger `OBSOLETE_TEST_REMOVED`/`REDUNDANT_TEST_REMOVED`/`EXISTING_TEST_UPDATED` op's test still maps to a live in-scope AC (weakening), and the operation is not approved.
- **AC-A4 (PRD AC-9):** `R-LIFECYCLE-LEGITIMATE` returns `passed: false` when the diff contains a test-file UPDATE or DELETE with no matching lifecycle-ledger row (completeness); a create-only session (sentinel row) passes trivially.
- **AC-A5 (PRD AC-8):** The five quality checks (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`) remain mode-agnostic and unchanged in logic; the rubric emits seven rows per run with no short-circuit (every id always evaluated and recorded), and the verdict is CHANGES_REQUESTED iff any row is `passed: false`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| test-after tests mirror the actual implementation (coupled to code the writer read) | M | H | `R-IMPL-LEAK` stays strict and mode-agnostic — it flags implementation-coupled tests in both modes; this phase does not weaken it |
| Legitimate deletion becomes a weakening loophole | M | H | `R-LIFECYCLE-LEGITIMATE` validates each op (obsolete ⇒ maps to no live in-scope AC; redundant ⇒ named survivor covers the observable) AND completeness (no unrecorded op); a red-still-mapping op → `passed: false` |
| Spoofed ledger entry launders an unrelated deletion | M | M | MVP matches a removed test by `file + function`; content-hash hardening is a deferred Could-item + Open Question (out of this phase's scope) |
| Mode-selected legitimacy id (`R-RED-LEGITIMATE`/`R-GREEN-LEGITIMATE`) confuses downstream JSONL consumers expecting one fixed id | L | M | Generalize Hard constraint 6 and the aggregate-verdict special-case to "the mode-selected legitimacy row" and enumerate both ids in the taxonomy so `/relay-test-write-review` and `/relay-execute` read either as "the legitimacy row" |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
  - Contextual clarification (not a substitute for the verbatim string above): the `relay` repo itself is `tdd: false` with `test_frameworks: []`, so no relay-authored suite validates this phase in-repo. Per `methodology.md`, the test-pair contract is exercised against target projects (the PRD's dogfood is `printed-exams-single-record`), not against this plugin repo. The five Acceptance Criteria here are validated by human review of `test-reviewer.md` and by the Level 1–3 grep invariants.
- **Design decision — mode-selected legitimacy id.** The single legitimacy rubric row carries a mode-selected id: `R-RED-LEGITIMATE` in test-first (unchanged) and `R-GREEN-LEGITIMATE` in test-after. This is the most honest shape for the `rubric[]` audit log (a reviewer reading the JSONL sees which legitimacy semantics ran) and matches the PRD Phase Details wording "invert R-RED→R-GREEN for test-after." The considered alternative — a single stable id (`R-RED-LEGITIMATE` or a neutral `R-LEGITIMATE`) with a `mode` field and branched semantics — was rejected because "R-RED-LEGITIMATE, passed:true" for a green test-after suite reads as a contradiction. The `R-LIFECYCLE-LEGITIMATE` id is stable and mode-agnostic.
- **Confinement.** Every change is inside `plugins/relay/agents/test-reviewer.md`. Preserve the earlier committed pipeline-hardening fix (the canonical jsonl-basename parent-directory derivation, `test-reviewer.md:112-126`) unchanged. B5 ledger-awareness is Phase 4; command gates are Phase 5; orchestrator ordering is Phase 6.
- **No-short-circuit invariant** is inherited from the reviewer's existing Phase 3 append pattern (which cites `plan-reviewer.md:585-633`) and the 2026-04-28 additive-rubric-row decision; the seventh id is additive and does not change that the array is always fully walked.

*Generated: 2026-07-10*
*Approved: 2026-07-10*
*Implemented: 2026-07-10*
*Status: IMPLEMENTED*
