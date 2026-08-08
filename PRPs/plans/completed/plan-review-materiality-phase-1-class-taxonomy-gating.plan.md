# Feature: Class taxonomy + gating (Phase 1 of plan-review-materiality)

```
**Decision Gate**
- Active context: none
- Activated criteria: modifies a shipped reviewer agent protocol (plugins/relay/agents/plan-reviewer.md); changes the cross-cutting review.jsonl verdict contract (additive field); impacts the plan-review gating consumed by /relay-plan-review and /relay-execute
- Decisions found:
  - [2026-04-28] AC-10 evolution — R-COH-* rows additive; the no-short-circuit invariant (all rubric items always EVALUATED and RECORDED) is preserved by this phase: only the gating function (which failing rows block) changes
  - [2026-07-30] prior_feedback / targeted revision — reviewer-side delta review stays rejected; this phase does not touch evaluation order or coverage
  - [2026-07-30] Writer self-checks: authoring rules, never rubric restatement — no writer file is touched by this phase
  - [2026-07-31] review_started_at — reviewer tools: allowlist is a recorded capability contract; this phase widens no allowlist
  - [2026-05-14] phase_type rubric differentiation — the per-check conditional-branch precedent the class declaration extends
  - [2026-05-06]/[2026-07-10] R-X strict — test files are authored/updated only by the test pair; this plan routes the DERIVED-test extension there
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (none written by this phase)
  - Weakening or deleting tests to make a loop turn green (the DERIVED corpus test is preserved and must stay green; its extension is test-pair work)
  - Relying on interactive permission prompts in the autonomous loop (no interactivity added)
- Applicable architectural rules:
  - Interactivity boundary: plan-review stays autonomous — the advisory-carrying APPROVED path adds zero user dialogue
  - review.jsonl is an append-only audit log with registered consumers; the class field is strictly additive and absence stays parseable
  - Writer/reviewer split: plan-reviewer owns the DRAFT→APPROVED flip; this phase changes when it flips, not who flips
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 1:
  "Class taxonomy + gating" — Goal: The verdict distinguishes materiality;
  advisory-only plans approve. — Success signal: AC-1, AC-2, AC-3, AC-6
  demonstrable on a fixture plan; `npm run validate` green.

## Summary

This phase gives every rubric check in
`plugins/relay/agents/plan-reviewer.md` a statically declared materiality
class — `blocking` or `advisory` — and rewrites the verdict gating function
so that only blocking-classed failures produce `CHANGES_REQUESTED`. A run
whose failing rows are all advisory-classed proceeds through the existing
Step 4 auto-flip as an advisory-carrying `APPROVED`, with every rubric row
still evaluated and logged (the no-short-circuit invariant is untouched).
A new `## Materiality classes` section declares the full partition table,
the default-advisory rule for future checks, and a one-way escalation valve
(`"escalated": true` + a materiality justification naming the concrete
Implementer impact). The `review.jsonl` row shape gains an additive `class`
field on every row. The sibling DERIVED corpus-test extension is
deliberately NOT implemented here — it is routed through the
test-writer/test-reviewer pair per R-X strict (test-after mode).

## User Story

As a relay operator running `/relay-execute` against a target project
I want plan-review to reject a plan only when a failing rubric row would
actually mislead the Implementer
So that advisory-grade findings stop costing full regenerate-and-re-review
rounds while remaining recorded and visible downstream.

## Problem Statement

The plan-review stage is the pipeline's biggest failure point: 52.8% of
plans fail their first review attempt (rising to 0.60 in Aug 2026), yet
84% of failing rubric rows are immaterial — they would not have misled the
Implementer. The gating function is the direct cause: Step 3 of
`plan-reviewer.md` treats any `passed: false` row anywhere in the combined
rubric array as sufficient for `CHANGES_REQUESTED`, with no materiality
dimension in the check definitions or the jsonl row shape (`{id, passed,
reason?}` only).

## Solution Statement

Declare the materiality class per check id (greenfield addition — no such
field exists today), rewrite Step 2/3/4 branch logic to gate on
blocking-classed failures only, list non-blocking advisory findings
separately in both verdict shapes, add the one-way escalation valve, and
extend the jsonl contract with an additive `class` field (absent field =
pre-feature blocking semantics for consumers). All evaluation, ordering,
and logging behavior stays byte-identical; only the gating function and
the verdict payload change.

## Metadata

| Field | Value |
|---|---|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | plan-reviewer agent protocol; review.jsonl verdict contract (additive) |
| Dependencies | none (Implementation Phases row 1; Depends: `-`) |
| Estimated Tasks | 5 |
| Source PRD | `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 1 |
| phase_type | feature |

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1147-1279 | Steps 2–4: the class-blind gating sentence, the Step 3 branch logic + CHANGES_REQUESTED bullet-list example, and the Step 4 auto-flip ordering this phase rewrites |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1313-1412 | review.jsonl format section + worked example rows the `class` field extends, and the "at least 8 objects" invariant paragraph that gains the class sentences |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1019-1056 | Logging-discipline arithmetic paragraph — its derived strings (`+ 10 (deterministic R-COH-*)`, `18 to 23 rows`, `18 to 26 rows`, `never extends to a 27th row`) must survive byte-intact; per-class prose is added adjacently, never inside a rewritten paragraph |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 366-434 | R-COH-VALIDATE-FRAMEWORK-MISMATCH's named conditional branches — the per-check branch-prose shape the class declaration and escalation valve mirror |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 970-1018 | Bounded K=5 pass + per-finding id taxonomy (catch-all at 995-996) that receives per-id class annotations |
| P1 | `PRPs/prds/plan-review-materiality.prd.md` | 152-201 | PRD AC-1, AC-2, AC-3, AC-6 — the four acceptance criteria this phase delivers |
| P2 | `docs/decisions.md` | 288-297 | The 2026-04-28 AC-10 evolution entry — the no-short-circuit invariant every edit here must preserve |
| P2 | `scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs` | 183-219 | The DERIVED assertion mechanism: which exact substrings of the arithmetic paragraph are pinned. The Implementer must keep this test green and must NOT edit it (R-X — its extension belongs to the test pair) |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/plan-reviewer.md:1172-1177
```
After R1–R8 record their outcomes, walk the R-COH-* coherence layer
(see "## The R-COH-* coherence layer" section above): deterministic
checks first, then the bounded K=5 LLM pass. Append one row per check
and one row per K=5 finding to the same outcome array. The combined
array (R1–R8 + R-COH-*) is what Step 3's branch logic evaluates: any
`passed: false` row triggers the CHANGES_REQUESTED branch.
```
Task 3 rewrites the final sentence of this block into the class-aware
gating sentence (blocking-classed failures gate; advisory-only proceeds to
Step 4).

# SOURCE: plugins/relay/agents/plan-reviewer.md:391-396
```
- **Test-pair-deferral exemption branch:** if BOTH of the following
  hold, emit a single `passed: true` row with `reason: "test-file
  updates deferred to the test pair per R-X strict; a test-framework
  VALIDATE would assert against constants this phase deliberately
  leaves stale — framework-mismatch check skipped"` and continue. Do
  NOT fail in this case.
```
The named-branch prose shape (bold branch label + emit rule + rationale)
is the per-check metadata precedent. Task 2's `**Class:**` declaration
lines and Task 4's escalation valve reuse this labelled-branch idiom.

# SOURCE: plugins/relay/agents/plan-reviewer.md:1027-1028
```
The total `rubric[]` length per run is `8 (R1–R8) + 10 (deterministic
R-COH-*) + ≤5 (K=5 pass) = 18 to 23 rows` for a project where
```
Task 5 preserves this paragraph byte-intact (the DERIVED corpus test pins
its substrings) and appends the per-class subtotal prose as a NEW adjacent
paragraph after the "When the K=5 pass emits N findings" sentence.

# SOURCE: plugins/relay/agents/plan-reviewer.md:1370-1377
```
    { "id": "R1", "passed": true },
    { "id": "R2", "passed": true },
    { "id": "R3", "passed": true },
    { "id": "R4", "passed": true },
    { "id": "R5", "passed": true },
    { "id": "R6", "passed": true },
    { "id": "R7", "passed": true },
    { "id": "R8", "passed": true },
```
Task 5 extends every worked-example row with the `class` key (e.g.
`{ "id": "R1", "passed": true, "class": "blocking" },`).

# SOURCE: plugins/relay/agents/plan-reviewer.md:1196-1204
```
2. Emit a bullet list naming each failing rubric item by ID +
   reason. Example:

   > **Rubric found defects.**
   >
   > - **R3** — Patterns to Mirror contains "TBD - needs validation"
   >   in 2 snippet SOURCE headers; mandatory section cannot defer.
   > - **R4** — Only 2 tasks under Step-by-Step Tasks; rubric
   >   requires at least 3.
```
Task 3 keeps this shape for blocking failures and appends a separate
"Non-blocking advisories" sub-list to the same example so advisory
findings are visibly distinct.

# SOURCE: plugins/relay/agents/plan-reviewer.md:1243-1250
```
2. **Append the APPROVED jsonl entry FIRST** (before the plan
   flip):
   - Path: `<target_root>/PRPs/plans/<basename>.review.jsonl`.
   - Append-only: `Read` existing content if the file exists
     (treat absence as empty string), concatenate existing +
     newline + new JSON line, `Write` the result back.
   - The entry's `rubric` array MUST contain all 8 items each with
     `passed: true`. `action: "final_flip"`. `user_message: ""`.
```
Task 3 amends the final bullet: on the advisory-carrying APPROVED path the
entry's R1–R8 blocking rows are all `passed: true`, while advisory-classed
rows MAY carry `passed: false` with their reasons — the flip proceeds.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Sole deliverable of this phase: materiality-class section + partition table, per-check class declarations, class-aware gating in Steps 2/3/4/4a, escalation valve, jsonl class field + invariants, per-class arithmetic prose |

## NOT Building (Scope Limits)

- **The DERIVED corpus-test extension** (per-class partition derivation in
  `scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs`)
  — test files are authored/updated exclusively by the
  test-writer/test-reviewer pair (R-X strict); this phase's test-suite work
  is deferred to the test pair, which runs test-after for this repo.
- **Retry convergence ratchet** (attempt-aware blocking scope, plan hash,
  stuck-detection composition) — Phase 2 of the source PRD.
- **Advisory injection into `/relay-implement` and `/relay-plan-review`
  output surfacing** — Phase 3 of the source PRD.
- **Class-aware `efficiency.mjs`, `efficiency-report`, PR-body advisories
  section, docs-site sync** — Phase 4 of the source PRD.
- **Any reviewer `tools:` widening, delta-review, third verdict state,
  historic jsonl rewrites, per-project class overrides** — PRD "What We're
  NOT Building".
- **Writer-side changes** (`plan-writer.md`, self-checks) — out of scope
  for the whole feature per the 2026-07-30 anti-gaming decision.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/plan-reviewer.md — add the Materiality classes section

**ACTION**: Insert a new section with the exact heading
`## Materiality classes (blocking / advisory)` immediately BEFORE the
section that defines the 8-item rubric (so classes are defined before any
check references them). Delivers AC-A3 (partition declared) and grounds
AC-A1/AC-A2 vocabulary. The section contains, in order:
(a) a definition paragraph: `blocking` = a defect the Implementer cannot
recover from downstream (gates approval); `advisory` = a defect absorbable
downstream at negligible cost (recorded, surfaced, never gating on its
own);
(b) the full partition table with header `| Check id | Class | Rationale |`
and one row per check id, using exactly these class values — R1, R2, R3,
R4, R5, R6, R7, R8 (and the R8a/R8b/R8c/R8-desc-min-ac description-mode
variants, which inherit R8's row): `blocking`;
R-COH-TASK-AC-MISSING: `blocking`; R-COH-FILES-UNTOUCHED: `blocking`;
R-COH-VALIDATE-FRAMEWORK-MISMATCH: `blocking`;
R-COH-PATTERN-SOURCE-MISSING: `advisory`;
R-COH-MANDATORY-READING-MISSING: `advisory`;
R-COH-VALIDATE-ALWAYS-PASS: `blocking`;
R-COH-ACTION-VALIDATE-CONTRADICTION: `blocking`;
R-COH-VALIDATE-SEARCH-AMBIGUOUS: `blocking`;
R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE: `blocking`;
R-COH-VALIDATE-PATTERN-UNGROUNDED: `blocking`;
R-COH-DESIGN-SOURCE-MISSING: `blocking`; R-COH-DESIGN-GROUNDED: `blocking`;
R-COH-VISUAL-SCOPE-PURITY: `blocking`;
R-COH-SENTINEL-RESOLUTION-MISSING: `blocking`;
K=5 named contradiction classes R-COH-PATTERN-TASK-DRIFT,
R-COH-AC-TASK-DECOUPLED, and R-COH-AC-UNVERIFIABLE (as named in the K=5
taxonomy list): `blocking` (per source PRD M1: named K=5 classes are
blocking); R-COH-SUMMARY-TASKS-DRIFT: `advisory` (explicitly advisory in
the source PRD, overriding the named-class default);
R-COH-MANDATORY-READING-IRRELEVANT: `advisory`;
R-COH-OTHER-INTERNAL-CONTRADICTION (the catch-all): `advisory`. Where the
live K=5 taxonomy list names ids differing from this enumeration, follow
the partition rule (named contradiction classes `blocking`; the catch-all
and the two explicitly-advisory ids above `advisory`) and record the
delta in the table's rationale cells. Two spot rows the Level-2 gate greps verbatim:
`| R-COH-OTHER-INTERNAL-CONTRADICTION | advisory |` and
`| R-COH-VALIDATE-ALWAYS-PASS | blocking |` (each followed by its
rationale cell);
(c) a `### Future checks default to advisory` paragraph: any check id
added after this section ships enters the partition as `advisory`;
promotion to `blocking` requires a recorded `docs/decisions.md` entry
citing measured evidence (advisory→defect conversion), inverting the
incident-driven ratchet;
(d) a consumer-compatibility paragraph containing the exact sentence:
`rows without a `class` field predate this taxonomy and are read as
blocking` (consumers treat absence as pre-feature blocking semantics;
historic jsonl is never rewritten).
**MIRROR**: `plugins/relay/agents/plan-reviewer.md:391-396` — labelled-
branch prose idiom for the section's rule paragraphs.
**VALIDATE**:
```bash
set -euo pipefail
grep -q '^## Materiality classes (blocking / advisory)$' plugins/relay/agents/plan-reviewer.md
grep -q '| Check id | Class | Rationale |' plugins/relay/agents/plan-reviewer.md
```

### Task 2: UPDATE plugins/relay/agents/plan-reviewer.md — per-check class declaration lines

**ACTION**: Under EVERY check definition heading — each of the 8 base
rubric items (`### R1` … `### R8`) and every one of the 14 `#### R-COH-`
deterministic/conditional check headings — insert, as the first body line
below the heading, a standalone declaration line with the exact shape
`**Class:** blocking` or `**Class:** advisory` matching the Task 1
partition table. Additionally, annotate the K=5 per-finding id taxonomy
list (lines 970-1018 region): append the marker ` (class: advisory)` or
` (class: blocking)` immediately after each backticked id in the taxonomy
bullets, per the partition — the catch-all line becomes
`` `R-COH-OTHER-INTERNAL-CONTRADICTION` (class: advisory)`` followed by
its existing prose. Do NOT add or remove any `#### R-COH-` heading (the
DERIVED test counts them). Delivers AC-A3.
**MIRROR**: `plugins/relay/agents/plan-reviewer.md:391-396` — the
bold-label line idiom the `**Class:**` line reuses.
**VALIDATE**:
```bash
set -euo pipefail
expected=$(( 8 + $(grep -c '^#### R-COH-' plugins/relay/agents/plan-reviewer.md) ))
actual=$(grep -c '^\*\*Class:\*\* \(blocking\|advisory\)$' plugins/relay/agents/plan-reviewer.md)
[ "$actual" -eq "$expected" ]
grep -q 'R-COH-OTHER-INTERNAL-CONTRADICTION` (class: advisory)' plugins/relay/agents/plan-reviewer.md
```

### Task 3: UPDATE plugins/relay/agents/plan-reviewer.md — class-aware gating function (Steps 2/3/4/4a + frontmatter)

**ACTION**: Rewrite the gating sites so only blocking-classed failures
produce `CHANGES_REQUESTED`, delivering AC-A1 and AC-A2. Exactly these
sites:
(1) Step 2 closing sentence (currently lines 1172-1177): replace the final
sentence with one containing the exact fragments `any blocking-classed
`passed: false` row triggers the CHANGES_REQUESTED branch` and `a run
whose only failing rows are advisory-classed proceeds to Step 4 as an
advisory-carrying APPROVED`;
(2) Step 3 branch headers (1182-1218): `#### All 8 pass → …` becomes
`#### No blocking-classed failure → proceed to Step 4 (autonomous flip)`
and `#### One or more fail → …` becomes `#### One or more blocking-classed
failures → CHANGES_REQUESTED (terminal for this run)`; the bullet-list
example keeps its existing blocking-failure shape and gains, after the
last failing-item bullet, a separate sub-list introduced by the exact line
`> **Non-blocking advisories (recorded, not gating):**` with one example
advisory bullet;
(3) Step 4 (1220-1278): item 1's re-validation criterion becomes "if a
blocking-classed item now fails, return CHANGES_REQUESTED"; item 2's final
bullet is amended so the APPROVED entry requires all blocking-classed rows
`passed: true` while advisory-classed rows MAY be `passed: false` with
reasons; item 4's final summary gains a second line emitted only when open
advisories exist: `> Open advisories: <n> (recorded in review.jsonl; not
gating).`;
(4) Step 4a: re-validation failure wording scoped to blocking-classed
items;
(5) the R-COH layer intro sentence (~321-327) "R-COH-* failures produce
`CHANGES_REQUESTED` the same way R1–R8 failures do" becomes class-aware
("per their declared class — see `## Materiality classes`");
(6) frontmatter `description:` (line 3): `Emit CHANGES_REQUESTED bullet
list on any failure` becomes `Emit CHANGES_REQUESTED bullet list on any
blocking-classed failure (advisory-only failures approve with recorded
advisories)`.
The no-short-circuit invariant text is NOT touched anywhere — every check
still runs and logs on every attempt.
**MIRROR**: `plugins/relay/agents/plan-reviewer.md:1172-1177` (sentence to
replace), `plugins/relay/agents/plan-reviewer.md:1196-1204` (bullet-list
example to extend), `plugins/relay/agents/plan-reviewer.md:1243-1250`
(APPROVED-entry bullet to amend).
**VALIDATE**:
```bash
set -euo pipefail
grep -q 'any blocking-classed `passed: false` row triggers the CHANGES_REQUESTED branch' plugins/relay/agents/plan-reviewer.md
grep -q 'advisory-carrying APPROVED' plugins/relay/agents/plan-reviewer.md
grep -q 'Non-blocking advisories (recorded, not gating):' plugins/relay/agents/plan-reviewer.md
if grep -q 'any `passed: false` row triggers the CHANGES_REQUESTED branch' plugins/relay/agents/plan-reviewer.md; then
  echo "FAIL: stale class-blind gating sentence remains"; exit 1
else
  echo "PASS: class-blind gating sentence fully replaced"
fi
```

### Task 4: UPDATE plugins/relay/agents/plan-reviewer.md — one-way escalation valve

**ACTION**: Delivers AC-A4. Inside the Task 1 `## Materiality classes
(blocking / advisory)` section, append a subsection with the exact heading
`### Escalation valve (one-way)` containing: (a) the rule — when an
advisory-classed check's concrete finding would, in the reviewer's
judgment, mislead the Implementer into wrong or failed implementation, the
reviewer MAY emit that row with `"class": "blocking"` plus
`"escalated": true`, and the row's `reason` MUST name the concrete
Implementer impact (what would be built wrongly); (b) the directionality
rule — a blocking-classed check can NEVER be demoted to advisory at
emission time; no demotion mechanism exists; (c) a one-row jsonl example
containing the exact fragment `"escalated": true`; (d) a discipline note:
escalation without an Implementer-impact justification is a protocol
violation (mirrors the K=5 anti-fabrication discipline). Also add one
sentence to Step 2's per-row recording prose stating that emitted rows
carry `class` (declared, or escalated per the valve).
**MIRROR**: `plugins/relay/agents/plan-reviewer.md:391-396` — the
labelled-branch + rationale idiom for the valve's rule/discipline
paragraphs.
**VALIDATE**:
```bash
set -euo pipefail
grep -q '^### Escalation valve (one-way)$' plugins/relay/agents/plan-reviewer.md
grep -q '"escalated": true' plugins/relay/agents/plan-reviewer.md
```

### Task 5: UPDATE plugins/relay/agents/plan-reviewer.md — jsonl class field + per-class arithmetic prose

**ACTION**: Delivers AC-A1 and AC-A3. In the `## review.jsonl format`
section (1313-1412): (1) extend EVERY rubric row in the worked example
with the `class` key — the R1 row becomes exactly
`{ "id": "R1", "passed": true, "class": "blocking" },` and every other row
gains `, "class": "blocking"` or `, "class": "advisory"` per the Task 1
partition; (2) extend the CHANGES_REQUESTED paragraph (1394-1397) noting
failing rows carry their `class` and escalated rows additionally carry
`"escalated": true`; (3) append to the invariant paragraph (1399-1405) two
sentences: every row emitted after this section ships carries a `class`
field matching the `## Materiality classes` partition (or an escalated
`blocking`), and the exact sentence from Task 1(d): `rows without a
`class` field predate this taxonomy and are read as blocking`. In the
`### Logging discipline` section (1019-1056): (4) preserve the existing
arithmetic paragraph byte-intact — the DERIVED corpus test pins the
substrings `+ 10 (deterministic R-COH-*)`, `18 to 23 rows`, `18 to 26
rows`, and `never extends to a 27th row` — and append a NEW paragraph
AFTER the existing "When the K=5 pass emits N findings…" sentence, stating
the per-class split for the baseline (non-Figma) case: the blocking-classed
rows are the 8 R1–R8 rows plus the 8 blocking-classed baseline
deterministic R-COH-* rows, plus any escalated rows; the advisory-classed
rows are the 2 advisory-classed deterministic checks
(R-COH-PATTERN-SOURCE-MISSING, R-COH-MANDATORY-READING-MISSING) plus
whichever of the ≤5 K=5 rows carry advisory-classed ids; the 4 conditional
deterministic rows are all blocking-classed when they emit; totals
unchanged from the paragraph above.
**MIRROR**: `plugins/relay/agents/plan-reviewer.md:1370-1377` (rows to
extend), `plugins/relay/agents/plan-reviewer.md:1027-1028` (paragraph to
preserve byte-intact).
**VALIDATE**:
```bash
set -euo pipefail
grep -q '"id": "R1", "passed": true, "class": "blocking"' plugins/relay/agents/plan-reviewer.md
grep -q 'rows without a `class` field predate this taxonomy and are read as blocking' plugins/relay/agents/plan-reviewer.md
grep -q '+ 10 (deterministic' plugins/relay/agents/plan-reviewer.md
grep -q '18 to 23 rows' plugins/relay/agents/plan-reviewer.md
grep -q 'never extends to a 27th row' plugins/relay/agents/plan-reviewer.md
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS (file structure intact)

```bash
set -euo pipefail
test "$(head -20 plugins/relay/agents/plan-reviewer.md | grep -cx -- '---')" -ge 2
grep -q '^## Materiality classes (blocking / advisory)$' plugins/relay/agents/plan-reviewer.md
```

### Level 2 — CONTENT_INVARIANTS

```bash
set -euo pipefail
expected=$(( 8 + $(grep -c '^#### R-COH-' plugins/relay/agents/plan-reviewer.md) ))
actual=$(grep -c '^\*\*Class:\*\* \(blocking\|advisory\)$' plugins/relay/agents/plan-reviewer.md)
[ "$actual" -eq "$expected" ]
grep -q '| R-COH-OTHER-INTERNAL-CONTRADICTION | advisory |' plugins/relay/agents/plan-reviewer.md
grep -q '| R-COH-VALIDATE-ALWAYS-PASS | blocking |' plugins/relay/agents/plan-reviewer.md
grep -q 'any blocking-classed `passed: false` row triggers the CHANGES_REQUESTED branch' plugins/relay/agents/plan-reviewer.md
node --test scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs
```

### Level 3 — INTEGRATION (full validation suite + corpus)

```bash
set -euo pipefail
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a plan whose full rubric evaluation yields
  failing rows only in advisory-classed checks, when the plan-reviewer
  emits its verdict, then the verdict is `APPROVED`, the DRAFT→APPROVED
  flip is performed, every failing row carries `"class": "advisory"`, and
  the jsonl line records ALL evaluated rubric rows (no short-circuit).
- **AC-A2 (PRD AC-2):** Given at least one blocking-classed failing row,
  when the verdict is emitted, then it is `CHANGES_REQUESTED` and the
  failing-items bullet list presents blocking rows as mandatory fixes with
  advisory rows listed separately under the "Non-blocking advisories"
  sub-list.
- **AC-A3 (PRD AC-3):** Given any emitted verdict, when its jsonl line is
  inspected, then every rubric row carries a `class` field whose value
  matches the partition table declared in `## Materiality classes`, and
  the Logging-discipline prose derives per-class counts consistent with
  the live check headings (the DERIVED test extension itself is test-pair
  work, not this plan's).
- **AC-A4 (PRD AC-6):** Given an advisory-classed check whose finding the
  reviewer judges implementation-misleading, when the reviewer escalates
  it, then the row carries `"class": "blocking"`, `"escalated": true`, and
  a reason naming the concrete Implementer impact; no mechanism exists to
  demote a blocking-classed check.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A corpus test outside the DERIVED one pins prose this phase rewrites (e.g. the Step 3 sentence), going red after the edits | Medium | Level 3 fails | Tasks preserve every pinned arithmetic substring byte-intact and only replace the class-blind gating sentence; Level 3 runs the full corpus so any residual pin surfaces before code review; a legitimately-stale pinned test routes to the test pair (R-X), never an Implementer edit |
| The five-site sweep (Task 3) misses a stale "any failure blocks" sentence elsewhere in the 1485-line file | Medium | Internal contradiction; downstream reviews confused | Task 3 enumerates the six known sites (frontmatter, R-COH intro, Step 2, Step 3, Step 4, Step 4a); Task 3's VALIDATE greps that the stale sentence form no longer appears anywhere in the file |
| `**Class:**` lines or the partition table accidentally introduce a new `#### R-COH-` heading, shifting the DERIVED count | Low | DERIVED test red | Class lines are body lines (`**Class:** …`), the partition table uses table rows; Task 2 explicitly forbids adding/removing `#### R-COH-` headings; Level 2 runs the DERIVED test |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of
  `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
  when a test framework is declared, the test pair
  (test-writer/test-reviewer) authors and maintains the suite from the
  Acceptance Criteria above, after the Implementer + Code Review; with no
  framework declared, no tests are authored.
- **Test-pair deferral (R-X strict).** This phase's test-file updates —
  extending `plan-reviewer-rubric-arithmetic-derived.test.mjs` (or a
  sibling DERIVED test) to derive the blocking/advisory partition counts —
  are routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger rather than authored by the Implementer. No task in this plan
  touches a test file; the plan's gates exclude a test-framework assertion
  on the new partition for exactly this reason, and the corpus is
  confirmed green one stage later by `/relay-write-test` →
  `/relay-test-write-review` → `/relay-test`. (Both conditions of the
  reviewer's test-pair-deferral exemption hold: documented here, and no
  `## Files to Change` row or task ACTION targets a test glob.)
- The existing `node --test` invocations in Levels 2–3 RUN the existing
  corpus as a regression gate (running ≠ editing); the quoted-glob form is
  used because `node --test <dir>` hits MODULE_NOT_FOUND on this repo.
- Scope discipline: this phase deliberately leaves `relay-plan-review.md`,
  `relay-execute.md`, `relay-implement.md`, `efficiency.mjs`, and all docs
  surfaces untouched — those are Phases 2–4 of the source PRD.

*Generated: 2026-08-06*
*Approved: 2026-08-07*
*Implemented: 2026-08-07*
*Status: IMPLEMENTED*
