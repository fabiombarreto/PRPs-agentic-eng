# Feature: Advisory pass-through (Phase 3 of plan-review-materiality)

```
**Decision Gate**
- Active context: none
- Activated criteria: modifies the /relay-implement dispatch contract and the /relay-plan-review output surface; adds a consumed input to the implementer agent; cross-cutting consumer of the review.jsonl class field shipped by Phase 1
- Decisions found:
  - [2026-07-30] Writers consume prior_feedback — the severed-pipe lesson: a value computed and passed but consumed by ZERO declared agent inputs is silently dropped. This phase therefore declares the new `advisories` input in implementer.md alongside wiring the dispatch, a conscious in-scope refinement of the PRD Phase-3 file list grounded in the PRD's own M4 rationale ("advisories must be consumed, not dropped")
  - [2026-04-28] AC-10 no-short-circuit — untouched; this phase only reads verdict lines, never changes evaluation
  - Phase 1 consumer-compatibility rule (worktree plan-reviewer.md) — rows without a `class` field read as blocking; therefore historic/pre-materiality verdict entries can never inject advisories (absent class ≠ advisory)
  - PRD OQ-3 resolved minimally: standalone /relay-plan-review surfaces advisories in console output only (verbatim reviewer passthrough + prose naming the case); no sidecar artifact
- Applicable anti-patterns:
  - Relying on interactive permission prompts in the autonomous loop (no interactivity added)
  - Weakening or deleting tests (no test file touched; corpus additions are the test pair's)
- Applicable architectural rules:
  - review.jsonl path is basename-keyed and directory-independent — PRPs/plans/<basename>.review.jsonl stays put when D8 moves the plan to completed/ (filesystem-confirmed on this very feature's phase-1 artifacts)
  - Byte-identical-when-inactive guarantee: zero open advisories ⇒ the implementer dispatch payload is byte-identical to today's (key omitted entirely, not null)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 3:
  "Advisory pass-through" — Goal: Open advisories reach the Implementer and
  the operator. — Success signal: AC-4 demonstrable; dispatch byte-identical
  when no advisories exist.

## Summary

This phase closes the advisory pipe. `/relay-implement`'s Phase A.0 gains
an advisory-context read: derive `PRPs/plans/<basename>.review.jsonl`
(both filename modes; the jsonl never moves with the plan), parse its LAST
entry, and collect `open_advisories` = rows with `"class": "advisory"` AND
`passed: false` (a row without a `class` field reads as blocking per the
Phase-1 compatibility rule, so pre-materiality entries inject nothing).
Phase A.2's implementer dispatch gains an `advisories` key carrying the
canonical `list<{rubric_id, reason}>` shape, explicitly marked
non-blocking — the key is OMITTED entirely when `open_advisories` is
empty, keeping the dispatch byte-identical to today's. The `implementer`
agent declares the matching optional `advisories` input with a
consumption rule (caveats to heed while executing — e.g. re-verify a
drifted cite by content search — never plan-repair obligations, never
gating), avoiding a repeat of the 2026-07-30 severed-pipe defect.
`/relay-plan-review`'s APPROVED prose is updated to name the
advisory-carrying two-line summary its verbatim passthrough already
transports. Phases 1–2 live uncommitted on the feature worktree; the
three files THIS phase edits are untouched there, so main-tree line
numbers are current and the Implementer edits the worktree copies.

## User Story

As the implementer agent receiving an approved-with-advisories plan
I want the plan-review's non-blocking findings delivered in my dispatch
So that I can absorb them at negligible cost (re-verify a drifted line
cite, double-check a flagged section) instead of them being silently
dropped.

## Problem Statement

Phase 1 made advisory-only plans approve with their findings recorded,
but nothing consumes those findings: `/relay-implement` never reads
`review.jsonl` (confirmed — zero references in Parse arguments,
Preconditions, or Phase A.0–A.2), the implementer declares no such input,
and `/relay-plan-review`'s prose still documents only the old single-line
APPROVED summary. Recorded-but-unconsumed advisories are the severed-pipe
defect class of 2026-07-30 all over again.

## Solution Statement

Wire the pipe end to end: command-side read (Phase A.0) → dispatch
injection (Phase A.2, omitted-when-empty) → declared agent input with a
bounded consumption rule (implementer.md) → operator-visible surfacing
prose (/relay-plan-review). Consumer compatibility is inherited from
Phase 1's absent-class-reads-as-blocking rule, so only genuinely
advisory-classed failing rows ever flow.

## Metadata

| Field | Value |
|---|---|
| Type | Feature |
| Complexity | Low-Medium |
| Systems Affected | /relay-implement dispatch contract; implementer agent inputs; /relay-plan-review output surface |
| Dependencies | Implementation Phases row 1 (complete; Depends cell: 1) |
| Estimated Tasks | 4 |
| Source PRD | `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 3 |
| phase_type | feature |

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/commands/relay-implement.md` | 203-221 | Phase A.0 initialisation — the loop-state block (with `last_reviewer_feedback: list<{rubric_id, reason}>`) and the methodology-read idiom the advisory-context read mirrors; insertion site for Task 1 |
| P0 | `plugins/relay/commands/relay-implement.md` | 269-290 | Phase A.2 implementer Task dispatch payload + the decoupled `prior_feedback` condition note — the injection site and the precedent for seeding an input outside the retry path |
| P0 | `plugins/relay/agents/implementer.md` | 44-63 | The Inputs section (three fields today; `prior_feedback` names the canonical shape) — Task 3 declares the sibling `advisories` input here |
| P1 | `plugins/relay/commands/relay-implement.md` | 71-99 | Parse arguments — the `<basename>`/`<feature>` derivations (both filename modes) the jsonl-path computation reuses |
| P1 | `plugins/relay/commands/relay-plan-review.md` | 155-223 | Phase A outcome descriptions + Final output surface (verbatim passthrough contract) — Task 4's prose sites |
| P1 | `.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md` | 1530-1538 | The emitting side: Step 4's conditional "Open advisories: <n>" summary line and the advisory-carrying APPROVED entry the injection consumes |
| P1 | `PRPs/prds/plan-review-materiality.prd.md` | 152-201 | PRD AC-4 (the phase's AC) and AC-1 (the advisory-carrying APPROVED contract the surfacing derives from) |
| P2 | `docs/decisions.md` | 1180-1251 | The 2026-07-30 severed-pipe entry — why the input MUST be declared on the consuming agent, not only passed by the command |

## Patterns to Mirror

# SOURCE: plugins/relay/commands/relay-implement.md:274-282
```
Task(subagent_type="implementer",
     prompt={
       plan_path: <plan_path>,
       target_root: <target_root>,
       attempt: <attempt>,
       prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,
       base_commit: <base_commit>,
     })
```
Task 2 adds the `advisories` key to this exact payload map (omitted
entirely when empty — not null).

# SOURCE: plugins/relay/commands/relay-implement.md:213-214
```
- `files_changed_by_attempt: dict<int, set<str>> = {}` — populated from each attempt's diff.patch
- `last_reviewer_feedback: list<{rubric_id, reason}> = []` — carried into the next attempt's implementer prompt
```
Task 1's `open_advisories: list<{rubric_id, reason}> = []` declaration
mirrors this loop-state bullet shape.

# SOURCE: plugins/relay/agents/implementer.md:55-62
```
- `prior_feedback` *(optional, default `null`)*: the `code-reviewer`
  defect list from a prior `CHANGES_REQUESTED` verdict on this same
  plan, in the canonical `list<{rubric_id, reason}>` shape.
  `/relay-implement` has been sending this on every attempt after the
  first (its Phase A.2 dispatch payload); until this input was
  declared, you had no protocol for it and silently re-ran the whole
  plan instead. When non-empty, follow `## Targeted revision mode`
  below.
```
Task 3's `advisories` input bullet mirrors this declaration shape —
including the lesson clause about undeclared inputs being silently
dropped.

# SOURCE: plugins/relay/commands/relay-plan-review.md:221-223
```
The command appends nothing of its own to the Reviewer's verdict
text. The jsonl log entry is the audit trail; the verbatim verdict
text is the user-facing surface.
```
Task 4 preserves this passthrough contract verbatim — the advisory
surfacing is the reviewer's own two-line summary flowing through, plus
prose that names the case; the command still appends nothing.

# SOURCE: .worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1536
```
   > Open advisories: <n> (recorded in review.jsonl; not gating).
```
The emitting-side line Task 4's prose references and Task 1's read
consumes (via the jsonl entry backing it).

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/commands/relay-implement.md` | UPDATE | Phase A.0 advisory-context read + Phase A.2 dispatch injection (omitted-when-empty) |
| `plugins/relay/agents/implementer.md` | UPDATE | Declare the consumed `advisories` input + bounded consumption rule (severed-pipe prevention per docs/decisions.md 2026-07-30 and PRD M4 "advisories must be consumed, not dropped" — a documented refinement of the PRD Phase-3 file list) |
| `plugins/relay/commands/relay-plan-review.md` | UPDATE | APPROVED-outcome prose names the advisory-carrying two-line summary; passthrough contract unchanged |

## NOT Building (Scope Limits)

- **Class-aware `efficiency.mjs`, PR-body advisories section, docs-site
  surfaces** — Phase 4 of the source PRD.
- **Any sidecar advisory artifact for standalone `/relay-plan-review`** —
  PRD OQ-3 resolved minimally: console surfacing only (the reviewer's own
  verbatim output).
- **Advisory injection into the plan-writer retry path** — the writer's
  `prior_feedback` stays blocking-only (Phase 2 shipped that); advisories
  reach the IMPLEMENTER, per PRD M4.
- **Ratchet/gating changes** — Phases 1–2 shipped them; this phase only
  reads what they emit.
- **Test-file edits** — corpus coverage for the pass-through is the test
  pair's (R-X strict; test-after).
- **relay-execute.md changes** — its inline adoption of /relay-implement
  inherits the injection automatically (D7/D15 zero-duplication).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/commands/relay-implement.md — Phase A.0 advisory-context read

**ACTION**: Delivers AC-A1 (PRD AC-4). In Phase A.0, immediately after the
`last_reviewer_feedback` loop-state bullet, add the loop-state bullet
`open_advisories: list<{rubric_id, reason}> = []` and, after the
methodology/figma_track read paragraphs, add a new paragraph titled
`**Advisory-context read (plan-review pass-through).**` specifying:
derive `review_jsonl_path = PRPs/plans/<basename>.review.jsonl` using the
`<basename>` already computed in `## Parse arguments` (both PRD-mode and
PRD-less filenames; the jsonl is basename-keyed and does NOT move when D8
relocates the plan to `completed/`); if the file does not exist, leave
`open_advisories` empty and continue (no halt, no warning — a
pre-materiality or reviewer-less plan simply has no advisories); if it
exists, parse its LAST line and set `open_advisories` to that entry's
rows having BOTH `"class": "advisory"` AND `passed: false`, mapped to the
canonical shape as `{rubric_id: <row id>, reason: <row reason>}`; state
explicitly the compatibility rule: a row without a `class` field reads as
blocking (Phase-1 rule), so entries written before the materiality
taxonomy can never contribute advisories.
**MIRROR**: `plugins/relay/commands/relay-implement.md:213-214` (loop-state
bullet shape).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'open_advisories: list<{rubric_id, reason}> = \[\]' plugins/relay/commands/relay-implement.md
grep -q 'Advisory-context read (plan-review pass-through)' plugins/relay/commands/relay-implement.md
```

### Task 2: UPDATE plugins/relay/commands/relay-implement.md — Phase A.2 dispatch injection

**ACTION**: Delivers AC-A1 and AC-A2 (PRD AC-4). In the Phase A.2
implementer `Task` payload, add the line
`advisories: <open_advisories when non-empty; key omitted entirely otherwise>,`
immediately after the `prior_feedback:` line, leaving every existing
payload line byte-intact. After the payload block's existing
`prior_feedback` condition note, add one paragraph stating the exact
guarantee: `When open_advisories is empty, the advisories key is OMITTED
from the payload entirely — not passed as null — so a zero-advisory
dispatch is byte-identical to the pre-Phase-3 dispatch.` and that
advisories are non-blocking caveats (never a retry trigger, never counted
by any budget, identical on every attempt of the same plan state).
**MIRROR**: `plugins/relay/commands/relay-implement.md:274-282` (the
payload map).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'advisories: <open_advisories when non-empty; key omitted entirely otherwise>,' plugins/relay/commands/relay-implement.md
grep -q 'OMITTED from the payload entirely' plugins/relay/commands/relay-implement.md
```

### Task 3: UPDATE plugins/relay/agents/implementer.md — declare the consumed advisories input

**ACTION**: Delivers AC-A3 (PRD AC-4). In `## Inputs (from the calling
command)`, immediately after the `prior_feedback` bullet, add an
`advisories` bullet: `*(optional, default absent)*` — open advisory
findings from the plan-review verdict that approved this plan, in the
canonical `list<{rubric_id, reason}>` shape, explicitly NON-BLOCKING;
sent by `/relay-implement` only when the approving verdict carries
advisory-classed failing rows. Consumption rule (state as a short
labelled paragraph `**Advisory consumption (non-blocking).**` placed
after the Inputs section): read them BEFORE executing tasks and treat
each as a caveat to absorb during normal execution — e.g. a drifted
`file:line` cite means locate the pattern by content search instead of
trusting the number; a flagged section means double-check it against the
tree while working — advisories NEVER add tasks, never modify the plan,
never gate completion, and impose zero obligations when absent; note the
declaration exists so the passed value is consumed rather than silently
dropped (the 2026-07-30 severed-pipe lesson).
**MIRROR**: `plugins/relay/agents/implementer.md:55-62` (the
`prior_feedback` declaration shape + lesson clause).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q '`advisories` \*(optional, default absent)\*' plugins/relay/agents/implementer.md
grep -q '\*\*Advisory consumption (non-blocking).\*\*' plugins/relay/agents/implementer.md
```

### Task 4: UPDATE plugins/relay/commands/relay-plan-review.md — surface advisories in the APPROVED prose

**ACTION**: Delivers AC-A4 (PRD AC-1). In the Phase A outcome description
(the "All 8 rubric items pass" bullet, lines 158-172), extend the
success-summary description to name the advisory case: the reviewer's
summary MAY carry a second line `Open advisories: <n> (recorded in
review.jsonl; not gating).` when the approving entry has advisory-classed
failing rows — an advisory-carrying APPROVED is still APPROVED (the flip
proceeds; nothing gates). In the `## Final output surface` section, add
one sentence: the advisory line, when present, flows through verbatim
like the rest of the verdict — the command still appends nothing of its
own, and no sidecar artifact is written (standalone surfacing is
console-only by design). Do not alter the passthrough contract sentences.
**MIRROR**: `plugins/relay/commands/relay-plan-review.md:221-223` (the
passthrough contract preserved verbatim),
`.worktrees/plan-review-materiality/plugins/relay/agents/plan-reviewer.md:1536`
(the emitted line named in the prose).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'Open advisories: <n> (recorded in review.jsonl; not gating).' plugins/relay/commands/relay-plan-review.md
grep -q 'console-only by design' plugins/relay/commands/relay-plan-review.md
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS (file structure intact)

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
test "$(head -20 plugins/relay/commands/relay-implement.md | grep -cx -- '---')" -ge 2
test "$(head -20 plugins/relay/agents/implementer.md | grep -cx -- '---')" -ge 2
test "$(head -20 plugins/relay/commands/relay-plan-review.md | grep -cx -- '---')" -ge 2
```

### Level 2 — CONTENT_INVARIANTS

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'Advisory-context read (plan-review pass-through)' plugins/relay/commands/relay-implement.md
grep -q 'advisories: <open_advisories when non-empty; key omitted entirely otherwise>,' plugins/relay/commands/relay-implement.md
grep -q '`advisories` \*(optional, default absent)\*' plugins/relay/agents/implementer.md
grep -q 'Open advisories: <n> (recorded in review.jsonl; not gating).' plugins/relay/commands/relay-plan-review.md
grep -q 'prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,' plugins/relay/commands/relay-implement.md
node --test scripts/validate/checks/relay-execute-materiality-ratchet.test.mjs scripts/validate/checks/plan-reviewer-materiality-gating.test.mjs
```

### Level 3 — INTEGRATION (full validation suite + corpus)

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given a plan approved with ≥1 open advisory in its
  latest `review.jsonl` entry, when `/relay-implement` dispatches the
  implementer, then Phase A.0 has read that entry and the Phase A.2
  payload contains the advisories in the canonical
  `list<{rubric_id, reason}>` shape explicitly marked non-blocking.
- **AC-A2 (PRD AC-4):** Given zero open advisories (no jsonl, a
  pre-materiality entry with class-less rows, or an all-pass entry), when
  the dispatch is assembled, then the `advisories` key is omitted entirely
  and the payload is byte-identical to the pre-Phase-3 dispatch.
- **AC-A3 (PRD AC-4):** Given the implementer receives the `advisories`
  input, when it executes the plan, then its declared consumption rule
  treats each advisory as a non-blocking caveat (content-search a drifted
  cite, double-check a flagged section) that never adds tasks, never
  modifies the plan, and imposes zero obligations when the input is
  absent.
- **AC-A4 (PRD AC-1):** Given the plan-reviewer approves with the
  advisory-carrying two-line summary, when `/relay-plan-review` surfaces
  the verdict, then the "Open advisories" line flows through verbatim,
  the command's prose names the advisory case, and no sidecar artifact is
  written (console-only surfacing).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The `feedback-chain` validation check pins the Phase A.2 payload/`prior_feedback` wiring and breaks on an adjacent added line | Medium | Level 3 red | Task 2 adds the `advisories` line WITHOUT touching any existing payload line (byte-intact rule stated in ACTION); Level 2 re-greps the untouched `prior_feedback` line verbatim; Level 3 runs `npm run validate` (feedback-chain included) so any pin surfaces before code review; a legitimately-stale check routes to the test pair per R-X |
| Injecting stale advisories from an OLD verdict (e.g. re-running against a hand-rewritten plan) misleads the implementer | Low | Wasted attention, no gating harm | Only the LAST jsonl entry is read (the verdict that approved the current plan state); advisories are non-blocking by contract, so worst case is a harmless extra double-check |
| The K=5 reviewer flags the third Files-to-Change row (implementer.md) as diverging from the PRD Phase-3 scope list | Medium | CHANGES_REQUESTED round | The divergence is documented three times with its grounding (Decision Gate bullet, Files-to-Change justification, Notes) as a conscious severed-pipe-prevention refinement required by the PRD's own M4 consumption mandate — a documented derivation, not an unexplained contradiction |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of
  `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
  when a test framework is declared, the test pair
  (test-writer/test-reviewer) authors and maintains the suite from the
  Acceptance Criteria above, after the Implementer + Code Review; with no
  framework declared, no tests are authored.
- **Test-pair deferral (R-X strict).** Corpus coverage for the
  pass-through (advisory-context-read paragraph presence, payload key
  line, implementer input declaration, plan-review surfacing prose) is
  routed through the test pair's lifecycle ledger, never authored by the
  Implementer. No task touches a test file; the plan's gates run existing
  tests only. (Both conditions of the reviewer's test-pair-deferral
  exemption hold.)
- **Scope refinement, documented.** The PRD's Phase-3 file list names the
  two command files; this plan adds `implementer.md`'s input declaration
  because the PRD's own M4 ("Advisories must be consumed, not dropped")
  cannot be satisfied by an undeclared input — the exact defect class
  `docs/decisions.md` 2026-07-30 records (`prior_feedback` was passed by
  commands and consumed by zero agents). The Implementer edits all three
  files in the feature worktree.
- **Worktree note.** The three edited files are untouched by Phases 1–2,
  so main-tree line numbers are current; edits land on the worktree
  copies (`.worktrees/plan-review-materiality/`), same as prior phases.

*Generated: 2026-08-07*
*Approved: 2026-08-07*
*Implemented: 2026-08-07*
*Status: IMPLEMENTED*
