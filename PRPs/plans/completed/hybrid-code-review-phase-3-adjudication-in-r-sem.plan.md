# Feature: Adjudication in R-SEM (Phase 3 of hybrid-code-review)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting change to a reviewer agent's semantic rubric row (R-SEM); a new consumer-visible `class`/`escalated` value populated on a rubric row already schema-declared by Phase 1; no new methodology key, no new schema field
- Decisions found:
  - [2026-09-21] "Code-review evaluation outcome: improve" — mandates this phase's scope directly: advisory-by-default intake, promotion only on confirmed reachability
  - [2026-08-06] BLOCKING/ADVISORY materiality taxonomy plus the one-way escalation valve (`plan-reviewer.md`) — the exact vocabulary (`class`, `escalated`, absent-reads-as-blocking, one-way-only) this phase reuses verbatim on R-SEM rather than inventing a parallel taxonomy
  - [2026-08-27]/[2026-08-26] an R-SEM finding is not self-executing test-edit authorization — governs that a promoted hybrid finding concerning a test file still routes through `TEST_CONTRACT_DISPUTE`, never a direct edit
  - [2026-08-28] "Review agents never mutate the target working tree" — unaffected by this phase (no new `Bash` write operation is introduced; reachability confirmation is a read-only `git diff`)
  - [2026-07-09] a `Task`-dispatched subagent never reaches the user — confirms this phase's adjudication, like Phase 2's collection, never halts or prompts on its own
- Applicable anti-patterns:
  - "Clearing an R-X match on anything other than the computed equivalence report" — this phase's reachability confirmation is a DIFFERENT, R-SEM-scoped mechanism and never claims to clear or touch an R-X match; R-X's own clearance path (Step X.2) is untouched
  - "Treating an R-SEM finding as self-executing test-edit authorization" — governs the explicit non-interference statement this phase adds
  - "Mutating a target project's working tree from a review agent" — the reachability confirmation reads the diff only (`git diff <diff_target> -- <file>`), never writes
  - "Writing pipeline artifacts under `.claude/`" — no new artifact path is introduced by this phase
- Applicable architectural rules:
  - the writer/reviewer pair model — `code-reviewer` stays the sole verdict owner; the COMMAND still owns D8 mutations; this phase changes neither
  - the diff-base contract (`git diff <base>`, single-argument form) — the reachability confirmation reuses this exact form, scoped to one finding's cited file
  - PRP artifact paths — no new artifact path; this phase only changes prompt text inside `plugins/relay/agents/code-reviewer.md`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/hybrid-code-review.prd.md` — Implementation Phases row 3:
  "Adjudication in R-SEM" — Goal: findings influence the verdict only
  under the materiality rule — Success signal: an unreachable finding
  leaves the verdict unchanged and shows as advisory; a confirmed
  reachable high-severity finding produces `CHANGES_REQUESTED` naming
  it.

## Summary

This phase gives `code-reviewer`'s R-SEM row the adjudication logic
Phase 2 deferred: findings the hybrid `/code-review` pass already
collects (Phase 2, shipped) are bounded to a fixed cap, then each
capped finding is independently checked for reachability against the
diff under review — never accepted on the pass's own say-so. A
finding promotes R-SEM to `class: blocking` (mirroring
`plan-reviewer.md`'s own one-way escalation vocabulary, `escalated:
true` included) only when it is BOTH high-severity and confirmed
reachable; every other outcome — unreachable, non-high-severity, or
no pass run at all — leaves R-SEM's row at `class: advisory` and
changes nothing about `passed`, `verdict`, or `action`. R-X, the
"not self-executing authorization" rule, and `TEST_CONTRACT_DISPUTE`
are explicitly untouched: a promoted finding about a test file is
recorded like any other and still cannot license a direct edit.
Every new value this phase populates (`class`, `escalated`) already
has a generic, contractual column in the shared `rubric` relation of
`usage-metrics-schema.md` (`cls`, `esc`) — no schema change is
needed.

## User Story

As a relay operator who has opted a target project into the hybrid
`/code-review` evidence pass
I want `code-reviewer` to adjudicate the pass's findings instead of
blocking on raw noise — admitting them as advisory by default and
blocking only on a finding it independently confirmed reachable and
high-severity
So that the pipeline surfaces genuine defects without inflating
retries on non-actionable findings, and without ever letting the
pass's evidence bypass R-X or the test-dispute channel

## Problem Statement

Narrowed to this phase: Phase 2 collects `/code-review` findings but
explicitly forbids them from influencing `verdict` or `action` — the
adjudication logic does not exist yet. Without this phase, every
hybrid finding is either wasted (never surfacing) or would have to be
treated as blanket-blocking, which the evaluation's own evidence
(about 40-42% non-actionable findings elsewhere) shows drives retries
and eventual bypass rather than fixing defects. The phase must also
guard two things Phase 2 did not need to: that a "reachable" claim is
computed against the actual diff rather than asserted by the pass,
and that promoting a finding never quietly reopens the R-X /
`TEST_CONTRACT_DISPUTE` guarantees the rest of this agent already
provides.

## Solution Statement

Extend R-SEM's existing `class` slot (Phase 1, currently documented
but never populated) and the hybrid pass section's step sequence
(Phase 2, currently ending at step 8) with three new steps: a fixed
findings cap (mirroring the fixed, non-configurable
`hybrid_pass_timeout_minutes` precedent), a per-finding reachability
confirmation computed via `git diff <diff_target> -- <file>` against
the exact file:line the pass cited (mirroring R-X's own "computed,
never asserted" discipline), and a promotion rule that reuses
`plan-reviewer.md`'s `class`/`escalated` vocabulary verbatim rather
than inventing a parallel taxonomy. R-SEM's own paragraph gains a
forward-pointer stating explicitly that its `passed`/`class` value is
not final until these adjudication steps run, so the two sections
never contradict each other. The Phase-4 worked JSON examples are
extended to show both outcomes concretely. Nothing about R-X, the
non-authorization rule, or `TEST_CONTRACT_DISPUTE` is touched — this
phase adds one explicit paragraph stating so, rather than relying on
the reader to infer it.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/code-reviewer.md` |
| Dependencies | Phase 2 (`hybrid-code-review-phase-2-the-pass.plan.md`) — the `Skill` invocation, the `hyb_findings_count` parse, the `hyb`/`hyb_lvl`/`hyb_n`/`hyb_ms` verdict fields, and the hybrid pass section's step 1-8 sequence this phase extends with steps 9-11 |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/hybrid-code-review.prd.md:170,186-189` (Implementation Phases row 3 + Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/code-reviewer.md` | 377-420 | R-SEM's current section, including the `class` slot paragraph this phase's Task 1 edits, and the "Not self-executing authorization" rule immediately below it that Task 3's non-interference paragraph must not contradict |
| P0 | `plugins/relay/agents/code-reviewer.md` | 422-514 | R-X — the pinned section this phase must NOT edit; also the exact single-argument diff-base form (`git diff --name-only <diff_target> -- <pathspec-set>`) the reachability confirmation's own `git diff <diff_target> -- <file>` mirrors |
| P0 | `plugins/relay/agents/code-reviewer.md` | 516-571 | The full Phase-2-shipped hybrid pass section (steps 1-8, the `---` boundary before and after) this phase's Tasks 2-3 extend with steps 9-11 |
| P0 | `plugins/relay/agents/code-reviewer.md` | 969-1018 | Phase 4's verdict JSON schema and the four already-declared `hyb*` field semantics this phase's adjudication reads (`hyb_findings_count` via local state, not a verdict field itself) but never mutates |
| P0 | `plugins/relay/agents/code-reviewer.md` | 1269-1307 | The existing "Standard-mode APPROVED entry with the hybrid pass active" worked example Task 4 extends with `class: advisory`, and the exact spot the new blocking/escalated example is inserted after |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 114-196 | The materiality-class table, the one-way escalation valve rule, and its worked jsonl row — the exact `class`/`escalated` vocabulary and shape this phase mirrors onto R-SEM rather than inventing a parallel one |
| P1 | `plugins/relay/resources/usage-metrics-schema.md` | 171-214 | The shared `rubric` relation's `cls`/`esc` columns — already generic across every stage (plan-review, code-review, test-write-review), so this phase needs zero schema changes; also the "read `cls` only within a stage" caveat this phase's population finally makes non-vacuous for code-review |
| P1 | `PRPs/plans/completed/hybrid-code-review-phase-2-the-pass.plan.md` | 1-620 | The shipped Phase 2 plan this phase builds on — its own working-tree-split precedent (grounding against `C:/repos/PRPs-agentic-eng/.worktrees/hybrid-code-review` while authored from a different target_root), which this plan repeats |
| P2 | `docs/decisions.md` | (search: "2026-08-06", "2026-08-26", "2026-08-27") | The BLOCKING/ADVISORY taxonomy decision and the R-SEM non-authorization arbitration follow-up this phase's Decision Gate block cites |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:403-408
R-SEM's row MAY additionally carry a `class: blocking | advisory` field
once `docs/context/methodology.md` declares `hybrid_code_review: true`
and a later phase populates the value (Phase 3 of `hybrid-code-review`);
an absent `class` field reads as `blocking`, matching
`plan-reviewer.md`'s own compatibility rule. This phase documents the
slot only — no code in this repo yet sets `class` on R-SEM.
```
Copied/replaced by Task 1 (the exact paragraph this phase must
finally make true — the "no code sets class" sentence stops being
accurate once this plan's Task 2-3 exist).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:450-478
#### Step X.2 — Executable-content equivalence (computed, never asserted)

Run via `Bash`, over exactly the matched paths:
...
A path is CLEARED if and only if its report row carries
`cleared: true`. ...
Record verbatim in the jsonl `reason`, for every path this step
clears, its `base_hash` and `head_hash`. The carve-out is
legitimate only because it is reproducible: anyone can re-run that
exact command against those two revisions and obtain the same two
hashes, or refute the clearance.
```
Copied by Task 2 (the "computed, never asserted, reproducible"
discipline the reachability confirmation reuses — a finding is
CONFIRMED REACHABLE only by an independently re-runnable `git diff`
check, never by trusting the pass's own claim).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:518-570
## The hybrid /code-review pass (Phase 2 — evidence collection only)
...
8. **On success, parse findings.** Parse the returned text for the
   `file:line — description` finding-line shape (per `report.md`
   §1's documented free-text output at `medium`/`high`) and count
   matching lines as `hyb_findings_count`.

**No branch of this section alters any `R-S*/R-L*/R-SEM/R-X`
`passed` value or the run's `verdict`/`action` in this phase** —
adjudication is deferred to Phase 3 of `hybrid-code-review`; this
section only populates local state consumed by Phase 4.
```
Copied/replaced by Tasks 2-3 (steps 9-11 are appended after step 8,
in the same numbered-step voice; the closing sentence is replaced
since it is this phase itself that adjudication was deferred to).

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:168-187
### Escalation valve (one-way)

**The rule.** When an advisory-classed check's concrete finding
would, in the reviewer's own judgment, mislead the Implementer into
a wrong or failed implementation, the reviewer MAY emit that row
with `"class": "blocking"` plus `"escalated": true` instead of its
declared `advisory` class. ...
**Directionality (one-way, no exceptions).** A blocking-classed
check can NEVER be demoted to `advisory` at emission time. ...

Worked jsonl row:

{ "id": "R-COH-OTHER-INTERNAL-CONTRADICTION", "passed": false, "class": "blocking", "escalated": true, "reason": "..." }
```
Copied by Task 3 (the exact `class`/`escalated` field names and
worked-row shape the promotion rule reuses verbatim on R-SEM, per
the calling instruction to mirror this vocabulary rather than invent
a parallel one).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:1269-1307
### Standard-mode APPROVED entry with the hybrid pass active
...
  "hyb": 1,
  "hyb_lvl": "medium",
  "hyb_n": 3,
  "hyb_ms": 61234
}
```
The project declares `hybrid_code_review: true` and
`hybrid_code_review_level: "medium"`; the pass invoked `Skill` once,
returned 3 parseable findings, and completed in ~61 seconds. Per this
phase's scope, none of those 3 findings influenced R-SEM or any other
rubric row — they are recorded evidence only; adjudication is
Phase 3 of `hybrid-code-review`.
```
Extended by Task 4 (the R-SEM row in this exact example gains
`"class": "advisory"`, and a second worked example is added showing
the promoted/blocking outcome).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/code-reviewer.md` | UPDATE | add the R-SEM forward-pointer (Task 1); add findings-cap + reachability-confirmation steps 9-10 to the hybrid pass section (Task 2); add the promotion rule (step 11), the R-X/dispute non-interference paragraph, and replace the section's closing sentence (Task 3); extend the Phase 4 worked examples with `class`/`escalated` (Task 4) |

## NOT Building (Scope Limits)

- No new `docs/context/methodology.md` key — the findings cap is a
  fixed internal constant (`hybrid_findings_cap = 10`), mirroring
  `hybrid_pass_timeout_minutes`'s own not-project-configurable
  precedent from Phase 2; this phase adds no second knob.
- No `usage-metrics-schema.md` edit — the `cls`/`esc` columns already
  exist generically on the shared `rubric` relation (they already
  serve `plan-reviewer`'s rows); this phase only makes them
  non-vacuous for `code-review.jsonl`, it does not add a column.
- No change to R-X, arbitration, the dispute channel, or
  `/relay-code-review` (explicit PRD exclusions, reaffirmed here by
  this phase's own explicit non-interference paragraph rather than
  silence).
- No change to any `hyb*` verdict-level field's semantics — this
  phase reads local pass state (whether the pass reached the invoked
  state, and its findings) but never redefines `hyb`/`hyb_lvl`/
  `hyb_n`/`hyb_ms`.
- No drift gate, no pinned-sample-set wiring (Phase 4).
- No target-project dogfood, no default-level decision (Phase 5).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/code-reviewer.md (R-SEM forward-pointer)

- **ACTION**: In R-SEM's section, replace the final sentence of the
  `class` slot paragraph — currently "This phase documents the slot
  only — no code in this repo yet sets `class` on R-SEM." — with:
  "R-SEM's `passed` value recorded into `rubric[]` in Phase 4 is
  FINAL only after the adjudication steps (9-11) in the
  `## The hybrid /code-review pass` section below have run — not the
  value this section computes in isolation. When `hybrid_enabled ==
  false`, or the pass never reaches the invoked state, this section's
  own judgment above is already final and adjudication steps (9-11)
  make no change." Leave every other sentence in the paragraph
  unchanged (the "MAY additionally carry a `class`" framing and the
  absent-reads-as-blocking compatibility rule both still hold).
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:403-408`
- **AC**: AC-A1 (PRD AC-5), AC-A2 (PRD AC-6) — the forward-pointer is
  what makes R-SEM's own section and the hybrid pass section's
  adjudication logically consistent instead of contradictory.
- **VALIDATE**: `if grep -q 'adjudication steps (9-11)' plugins/relay/agents/code-reviewer.md && grep -q 'FINAL only after' plugins/relay/agents/code-reviewer.md; then echo "PASS: R-SEM forward-pointer present"; else echo "FAIL: R-SEM forward-pointer missing"; exit 1; fi`

### Task 2: UPDATE plugins/relay/agents/code-reviewer.md (findings cap + reachability confirmation)

- **ACTION**: In the `## The hybrid /code-review pass` section,
  immediately after step 8 ("On success, parse findings.") and
  before the closing "No branch of this section alters..." sentence,
  insert two new numbered steps:

  "9. **Findings cap.** Before adjudication, bound the findings
  considered to at most `hybrid_findings_cap = 10` — a fixed
  internal constant, NOT project-configurable, mirroring
  `hybrid_pass_timeout_minutes`'s own fixed-constant precedent. Take
  the first 10 finding lines in the order the pass returned them
  (the same `file:line — description` lines step 8 already counts
  into `hyb_findings_count`); any lines beyond the cap are excluded
  from adjudication and never checked for reachability, though
  `hyb_findings_count` (step 8, unchanged) continues to report the
  full raw count including the excluded tail.

  10. **Reachability confirmation (per capped finding).** For each
  of the (at most 10) capped findings' cited `file:line`,
  independently confirm reachability against the diff under review —
  never against the working tree at large, and never on the pass's
  own say-so:
     a. Run `git diff <diff_target> -- <file>` (the same
     single-argument diff-base form R-X's own file-set derivation
     uses above), scoped to the finding's cited file.
     b. A finding is CONFIRMED REACHABLE if and only if its cited
     file appears in that diff's output AND its cited line number
     falls inside an added/modified (`+`) hunk line — never a `-`
     removed line, never unmodified context surfaced only for
     readability, and never a file absent from the diff entirely.
     c. When reachable, quote the exact `+` line verbatim as the
     row's evidentiary anchor — the same "reproducible, anyone can
     re-run it" discipline Step X.2 uses for R-X.
     d. A finding whose file is untouched by the diff, whose cited
     line is unmodified context, or whose `file:line` cannot be
     located at all is NOT confirmed — it stays advisory and
     triggers no further action."

  Do NOT insert anything between the R-X heading (line 422) and the
  hybrid pass section heading (line 518) — that span is pinned by an
  existing test and must not move.
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:450-478`
- **AC**: AC-A1 (PRD AC-5), AC-A2 (PRD AC-6) — the cap and the
  computed reachability check are the evidentiary backbone both ACs
  depend on.
- **VALIDATE**: `if grep -q 'Findings cap' plugins/relay/agents/code-reviewer.md && grep -q 'hybrid_findings_cap = 10' plugins/relay/agents/code-reviewer.md && grep -q 'CONFIRMED REACHABLE' plugins/relay/agents/code-reviewer.md && grep -q 'Reachability confirmation (per capped finding)' plugins/relay/agents/code-reviewer.md; then echo "PASS: findings cap and reachability confirmation steps present"; else echo "FAIL: one or more of findings cap / reachability confirmation markers missing"; exit 1; fi`

### Task 3: UPDATE plugins/relay/agents/code-reviewer.md (promotion rule + non-interference + closing sentence)

- **ACTION**: Immediately after step 10 (Task 2), insert step 11:

  "11. **Promotion rule.** A capped finding promotes R-SEM iff BOTH:
  (i) its severity, as reported in the pass's own finding text, is
  `high`; and (ii) it is CONFIRMED REACHABLE per step 10. When at
  least one capped finding satisfies both:
     - R-SEM's `passed` value recorded into `rubric[]` (Phase 4) is
     forced to `false`, regardless of what this section's own
     independent R-SEM judgment above concluded on its own.
     - R-SEM's row carries `\"class\": \"blocking\"` and
     `\"escalated\": true` — mirroring `plan-reviewer.md`'s own
     one-way escalation valve vocabulary and worked-row shape
     verbatim.
     - R-SEM's `reason` names the confirmed finding by its
     `file:line` and quotes the evidentiary `+` line from step
     10.c, appended after any pre-existing reason text from this
     section's own independent judgment (never replacing it).
  When `hybrid_enabled == true`, the pass reached the invoked state,
  and NO capped finding satisfies both conditions, R-SEM's row
  instead carries `\"class\": \"advisory\"` (no `escalated` field) —
  true whether R-SEM's own independent judgment above passed or
  failed on its own merits; the `advisory` class describes only the
  disposition of the hybrid evidence, never the reviewer's own
  independent finding."

  Immediately after step 11, add: "**Explicit non-interference
  (AC-9).** This adjudication never touches R-X's `passed` value
  under any branch — R-X is computed entirely above, in its own
  section, before this one even runs. A confirmed-reachable finding
  that concerns a test file (matches R-X's own pathspec set) is
  still never self-executing authorization to edit that file: the
  'Not self-executing authorization (2026-08-26 arbitration
  follow-up)' rule above and the `TEST_CONTRACT_DISPUTE` channel
  govern exactly as they did before this phase, unmodified — a
  promoted finding about a test is recorded on R-SEM like any other,
  and if the implementer disputes it, that dispute still runs
  through Phase 3 of the arbitration flow, never through a direct
  edit."

  Then replace the closing sentence ("**No branch of this section
  alters any `R-S*/R-L*/R-SEM/R-X` `passed` value or the run's
  `verdict`/`action` in this phase** — adjudication is deferred to
  Phase 3 of `hybrid-code-review`; this section only populates local
  state consumed by Phase 4.") with: "**Steps 1-8 above (evidence
  collection) alter no rubric `passed` value.** Steps 9-11 (findings
  cap, reachability confirmation, promotion — Phase 3 of
  `hybrid-code-review`) are the sole mechanism by which this section
  ever changes a rubric row, and they touch ONLY R-SEM's
  `passed`/`class`/`escalated`/`reason` — `R-S*`, `R-L*`, and `R-X`
  remain untouched by this section under every branch, and the run's
  `verdict`/`action` change only as a downstream consequence of
  R-SEM's own `passed` value, exactly as they always have."
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:168-187`
- **AC**: AC-A2 (PRD AC-6), AC-A3 (PRD AC-9) — the promotion rule and
  the explicit R-X/dispute non-interference statement.
- **VALIDATE**: `set -euo pipefail
grep -q 'Promotion rule' plugins/relay/agents/code-reviewer.md
grep -q '"escalated": true' plugins/relay/agents/code-reviewer.md
grep -q 'Explicit non-interference (AC-9)' plugins/relay/agents/code-reviewer.md
grep -q 'Steps 1-8 above (evidence collection) alter no rubric' plugins/relay/agents/code-reviewer.md
if grep -q 'No branch of this section alters any' plugins/relay/agents/code-reviewer.md; then echo "FAIL: stale closing sentence still present"; exit 1; fi
echo "PASS: promotion rule, escalated field, non-interference paragraph, and replaced closing sentence all present"`

### Task 4: UPDATE plugins/relay/agents/code-reviewer.md (Phase 4 worked examples)

- **ACTION**: In the "### Standard-mode APPROVED entry with the
  hybrid pass active" worked example, add `"class": "advisory"` as a
  key inside the `{ "id": "R-SEM", "passed": true }` object (making
  it `{ "id": "R-SEM", "passed": true, "class": "advisory" }`).
  Replace the prose sentence immediately after the example — "Per
  this phase's scope, none of those 3 findings influenced R-SEM or
  any other rubric row — they are recorded evidence only;
  adjudication is Phase 3 of `hybrid-code-review`." — with: "The 3
  findings were adjudicated per Phase 3 of `hybrid-code-review`:
  none were both high-severity and confirmed reachable in the diff,
  so R-SEM stays `passed: true` and carries `class: advisory` — the
  hybrid evidence is recorded, but changes nothing about the
  verdict." Immediately after that paragraph, add a new worked
  example titled "### Standard-mode CHANGES_REQUESTED entry with a
  promoted hybrid finding" showing a full verdict JSON object with
  `"verdict": "CHANGES_REQUESTED"`, `"action": "rubric_fail"`, an
  `R-SEM` row shaped `{ "id": "R-SEM", "passed": false, "class":
  "blocking", "escalated": true, "reason": "<file:line> high-severity
  finding confirmed reachable: <quoted + line>" }`, the other 7
  standard-mode rows `passed: true`, and populated `hyb`/`hyb_lvl`/
  `hyb_n`/`hyb_ms` fields consistent with the scenario (a pass that
  ran, found at least one finding, at least one of which was
  promoted). Follow with one sentence of prose naming the scenario:
  the pass returned a high-severity finding whose cited line the
  reviewer independently confirmed inside an added `+` hunk of the
  diff, so R-SEM fails and the verdict flips to
  `CHANGES_REQUESTED`.
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:1269-1307` and `# SOURCE: plugins/relay/agents/plan-reviewer.md:184-187` (worked-row shape)
- **AC**: AC-A1 (PRD AC-5), AC-A2 (PRD AC-6), AC-A4 (PRD AC-8) — the
  worked examples are what make the adjudication contract concrete
  and machine-parseable for downstream consumers.
- **VALIDATE**: `set -euo pipefail
grep -q '"id": "R-SEM", "passed": true, "class": "advisory"' plugins/relay/agents/code-reviewer.md
grep -q 'Standard-mode CHANGES_REQUESTED entry with a promoted hybrid finding' plugins/relay/agents/code-reviewer.md
count=$(grep -c '"escalated": true' plugins/relay/agents/code-reviewer.md)
if [ "$count" -lt 2 ]; then echo "FAIL: expected escalated:true in both the promotion-rule prose (Task 3) and the new worked example (Task 4), found $count occurrence(s)"; exit 1; fi
echo "PASS: advisory worked-example update and new blocking worked example both present"`

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```
npm run validate
```

Runs the full 24-check `scripts/validate/index.mjs` suite from the
repository root. Exits non-zero if any check fails (real tool exit
code, no wrapping). This phase adds no new `gating-structure.mjs`
site and touches no methodology key, so this level also serves as a
no-regression check on the already-registered `hybrid_code_review`
site.

**Level 2 CONTENT_INVARIANTS**

```
set -euo pipefail
grep -q 'adjudication steps (9-11)' plugins/relay/agents/code-reviewer.md
grep -q 'Findings cap' plugins/relay/agents/code-reviewer.md
grep -q 'hybrid_findings_cap = 10' plugins/relay/agents/code-reviewer.md
grep -q 'CONFIRMED REACHABLE' plugins/relay/agents/code-reviewer.md
grep -q 'Promotion rule' plugins/relay/agents/code-reviewer.md
grep -q '"escalated": true' plugins/relay/agents/code-reviewer.md
grep -q 'Explicit non-interference (AC-9)' plugins/relay/agents/code-reviewer.md
if grep -q 'No branch of this section alters any' plugins/relay/agents/code-reviewer.md; then
  echo "FAIL: stale pre-adjudication closing sentence still present"; exit 1
fi
grep -q '"id": "R-SEM", "passed": true, "class": "advisory"' plugins/relay/agents/code-reviewer.md
grep -q 'Standard-mode CHANGES_REQUESTED entry with a promoted hybrid finding' plugins/relay/agents/code-reviewer.md
echo "PASS: all Phase 3 markers present"
```

`set -euo pipefail` makes any single failing `grep -q` abort the
whole block with a non-zero exit before the final `echo` runs — not
the `&& echo PASS || echo FAIL` idiom that always exits 0.

**Level 3 DRY-RUN END-TO-END**

```
node --test "scripts/validate/**/*.test.mjs"
```

Re-runs the existing `node:test` corpus to confirm this phase's
prompt-text edits did not regress the already-registered
`hybrid_code_review` gating site or any other existing check. Exits
non-zero on any test failure (the glob form, per the documented
`node --test <dir>` `MODULE_NOT_FOUND` gotcha).

## Acceptance Criteria

- **AC-A1 (PRD AC-5):** Given the pass returns N findings and the
  reviewer confirms none of them reachable in the diff under review,
  when it emits R-SEM, then R-SEM is `passed: true`, the row carries
  `class: advisory`, and the verdict is unchanged from what it would
  have been without the pass.
- **AC-A2 (PRD AC-6):** Given the pass returns a finding the reviewer
  confirms is reachable in the diff under review and high-severity,
  when it emits R-SEM, then that row is `passed: false` with `class:
  blocking` (and `escalated: true`), the reason names the confirmed
  finding, and the verdict is `CHANGES_REQUESTED`.
- **AC-A3 (PRD AC-9):** Given a diff that touches a test-glob path,
  when the reviewer runs with the pass active, then R-X still fails
  unless cleared by the computed equivalence report, untouched by
  this phase's adjudication; and given an admitted finding that
  concerns a test, then it does not authorize a test edit and still
  routes through `TEST_CONTRACT_DISPUTE`.
- **AC-A4 (PRD AC-8):** Given a verdict written with a promoted
  finding, when `usage-metrics.mjs` and `scripts/efficiency.mjs` read
  the line, then both parse it without error — `class` and
  `escalated` are already contractual columns (`cls`, `esc`) on the
  shared `rubric` relation, so no new free-text column is introduced
  and no schema change is required.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Noise turns into retries (measured actionable rate elsewhere is about 58%) | M | M | Advisory by default; promotion only on BOTH high-severity AND confirmed reachability; a fixed cap of 10 findings bounds tokens and noise; first-attempt rejection rate is a Phase 5 success metric measured against baseline |
| A "reachable" claim is asserted rather than computed, letting a hallucinated or stale `file:line` block a merge | M | H | Step 10's confirmation is a re-runnable `git diff <diff_target> -- <file>` check, mirroring R-X's own "computed, never asserted" discipline — never the pass's own say-so |
| R-SEM's own paragraph and the hybrid pass section's adjudication logic read as contradictory (R-SEM says one thing, the pass section overrides it later) | M | M | Task 1's explicit forward-pointer states which value is FINAL and why, closing the gap the self-check in plan-writer's own protocol exists to catch |
| A promoted finding is misread as authorizing a test-file edit, reopening the 2026-08-26 arbitration question | L | H | Task 3's explicit "Explicit non-interference (AC-9)" paragraph states the rule inline, adjacent to the promotion rule itself, rather than relying on the reader to recall the separate R-SEM-section rule above |
| Disturbing the pinned byte range between the R-X heading and the next level-2 heading (a prior dispute already fired here) | L | M | Every insertion in this plan targets the hybrid pass section (after the R-X-to-hybrid-pass boundary) or R-SEM's own section (before R-X begins) — never the R-X section's own interior; Task 2's ACTION states this explicitly |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates
are routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not
authored by the Implementer — R-X is a blanket straight-fail on any
test glob in the Implementer's diff. No task above and no `## Files
to Change` row targets a test file, so this plan's `**VALIDATE**`
commands exercise the change directly rather than invoking the test
framework for new coverage.

**On the CODE root / artifact plane split.** Per the calling
instruction, every `# SOURCE:` anchor, every insertion point, and
every line range cited in `## Mandatory Reading` was verified against
`C:/repos/PRPs-agentic-eng/.worktrees/hybrid-code-review` — the
worktree carrying Phase 1 and Phase 2's shipped-but-uncommitted
state — not against this plan's own `target_root`
(`C:/repos/PRPs-agentic-eng/.claude/worktrees/sharp-ardinghelli-112988`),
which holds no `docs/`-tree copy of Phase 1/2's diff. This repeats
Phase 2's own documented split (see its `## Notes`, "On the
working-tree gap flagged in the Risks table"). All paths in this
plan's tasks are written relative to a repository root, so they
resolve correctly when the Implementer executes them against the
CODE root where Phase 1 and Phase 2 actually live.

**On avoiding the pinned R-X span.** The calling instruction flagged
that a test in this repo pins the byte range between the R-X heading
(`### R-X — Universal test-modification guard...`, line 422 in the
CODE root's current tree) and the next level-2 heading (`## The
hybrid /code-review pass...`, line 518) — i.e., R-X's own section
content — and that a prior dispute already had to be arbitrated over
an insertion anchor in this exact file, with this session's dispute
cap now exhausted. Every insertion this plan specifies targets either
R-SEM's own section (which sits BEFORE R-X begins) or the hybrid pass
section's own body (which sits AFTER R-X ends, past line 518) —
never R-X's interior. This was a deliberate anchor choice, not an
accident: this plan does not attempt to modify R-X in any way, so
there was no reason to place an insertion point anywhere near its
pinned span.

**Why the findings cap is a fixed constant, not a new methodology
key.** Mirrors Phase 2's own "Why the 3-minute pass timeout is fixed,
not project-configurable" note: this phase's own PRD scope names only
"a findings cap" (Open Question, unresolved to a specific number) and
Phase 2's `## NOT Building` explicitly deferred it here as "No
findings cap" without implying a second project-declared knob. `10`
is a reasonable, explicitly revisable starting bound; Phase 5's
dogfood measurement is where a data-driven adjustment belongs.

*Generated: 2026-09-23*
*Approved: 2026-09-23*
*Status: IMPLEMENTED*
