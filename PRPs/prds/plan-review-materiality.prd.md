# Plan-Review Materiality Threshold (BLOCKING / ADVISORY verdict classes)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting patterns (the
  rubric[] verdict contract is produced by plan-reviewer and consumed by
  relay-plan-review, relay-execute, relay-implement, efficiency.mjs and the
  validation-suite corpus); impact on reusable services (retry loop, audit
  jsonl, reporting scripts)
- Decisions found:
  - [2026-04-19] Interactivity boundary — plan-review is autonomous; this
    feature adds no user dialogue downstream of PRD approval
  - [2026-04-28] AC-10 evolution — R-COH-* rows are additive; the
    no-short-circuit invariant (every rubric item always EVALUATED and
    RECORDED) is preserved verbatim by this feature: only the
    gating function (rubric rows → verdict) changes
  - [2026-07-30] prior_feedback / Targeted revision mode — reviewer-side
    delta review was explicitly rejected; this feature does NOT re-introduce
    it (evaluation stays full on every attempt; the convergence ratchet
    narrows what may BLOCK, never what is evaluated)
  - [2026-07-30] Writer pre-emission self-checks: authoring rules, never
    rubric restatement — respected: no writer-side rubric mirroring is added;
    the entry's own registered revert clause (first-attempt failure rate not
    below ~35% after ~10 artifacts) is ARMED (Aug 2026 measured 0.60) and is
    part of this feature's evidence
  - [2026-07-31] review_started_at — a reviewer's `tools:` allowlist is a
    recorded capability contract; this feature widens NO allowlist
  - [2026-05-14] phase_type annotation enables rubric differentiation —
    precedent for per-check conditional metadata
- Applicable anti-patterns: never write pipeline artifacts under `.claude/`;
  no heuristic flips of gating keys; no reliance on interactive prompts in
  the autonomous loop
- Applicable architectural rules: writer/reviewer split per stage;
  `PRPs/plans/<basename>.review.jsonl` is an append-only audit log with
  registered consumers — schema changes must be additive; plan-reviewer owns
  the plan DRAFT→APPROVED flip
- Result: PROCEED
```

## Problem Statement

Relay operators running `/relay-execute` (or `/relay-plan-review`) lose more
time and tokens to the plan-review stage than to any other stage: 52.8% of
plans fail their first review attempt (rising monotonically from 0.33 in Apr
2026 to 0.60 in Aug 2026), 55% need at least one full regenerate-and-re-review
round, and the worst measured loop took 7 attempts. Yet 84% of the failing
rubric rows are immaterial — they would not have misled the Implementer — so
almost all of that rework buys no correctness. The cost of not solving it is a
pipeline whose slowest, most expensive stage keeps getting slower as the
rubric grows.

## Evidence

- 2026-08-06 cross-project analysis (353 verdicts / 193 plans / 7 repos,
  Apr–Aug 2026; 280 failing rubric rows individually classified by root
  cause, adversarially re-audited with 83% agreement): only 16% of failing
  rows were substantive (plausibly implementation-misleading). Top failing
  check R-COH-TASK-AC-MISSING (59), then R-COH-OTHER-INTERNAL-CONTRADICTION
  (46 — an open-ended catch-all), R-COH-PATTERN-TASK-DRIFT (29).
- First-attempt failure rate by month: Apr 0.33 → May 0.38 → Jun 0.52 →
  Jul 0.59 → Aug 0.60, while avg rubric rows per verdict grew 8.0 → 19.3.
  The trend holds excluding this repo (0.43 → 0.56), so it is not
  composition.
- Moving-target retries: across consecutive failing attempts, 33 NEWLY
  failing rubric items vs 31 repeated ones — the loop has no fixed point.
  The measured engine of all three worst loops (7-, 5-, 5-attempt) was the
  catch-all R-COH-OTHER-INTERNAL-CONTRADICTION, never failing twice on the
  same text.
- Every prior intervention was writer-side (`prior_feedback` v0.23.1,
  pre-emission self-checks 2026-07-31, tightening 2026-08-05) and the rate
  never fell; the [2026-07-30] decision's own falsification clause
  ("revert rather than add more checklist items" if the rate does not drop
  below ~35%) is armed.
- Industry evidence that any-finding-blocks is a recognized anti-pattern:
  reviewdog's maintainers acknowledge severity-blind `--fail-on-error` as
  unhelpful (reviewdog/reviewdog#856); Clippy ships its noisy lint groups
  allow-by-default because of known false positives; a 146-PR benchmark of
  four LLM reviewers measured CodeRabbit surfacing 1–3 NEW findings per
  fix-push (5–6 cycles per non-trivial PR) with ~2/3 mechanical findings —
  the same moving-target pathology relay exhibits.

## Proposed Solution

Add a materiality dimension to the plan-review verdict. Every rubric check id
carries a statically declared class — `blocking` (a defect the Implementer
cannot recover from; gates approval) or `advisory` (a defect absorbable
downstream; recorded, surfaced, but never gating). The verdict becomes
`CHANGES_REQUESTED` only when at least one blocking-classed row fails;
advisory-only failures approve and flip normally, with the advisories carried
in the jsonl row (additive `class` field) and injected into the Implementer's
dispatch as non-blocking caveats. Two companion mechanisms make retries
converge: a one-way escalation valve (the reviewer may promote an advisory
finding to blocking with an explicit materiality justification, never demote),
and a retry convergence ratchet (on attempt ≥2, only previously-cited ids or
findings inside the sections the Targeted-revision contract let the writer
touch may block; everything else logs as advisory; a per-verdict plan hash
voids the ratchet fail-safe on out-of-band edits). This approach was chosen
over writer-side fixes (measured exhausted), reviewer delta-review (rejected
by the no-short-circuit invariant), and per-finding judged severity (higher
LLM variance than a static per-check partition with a bounded valve —
mirroring GitHub code scanning's per-rule severity + per-finding triage).

## Key Hypothesis

We believe a declared per-check materiality class with advisory pass-through
and a retry blocking-scope ratchet will cut first-attempt CHANGES_REQUESTED
from ~53–60% to ≤20% and cap review loops at ≤2 attempts for relay operators,
without raising the substantive-defect escape rate. We'll know we're right
when the first ~20 post-release plan artifacts measure ≤20% first-attempt
rejection, ≤1.25 mean verdicts per plan, and <10% of open advisories
implicated in later implement-stage failures.

## What We're NOT Building

- **Any reviewer `tools:` widening (e.g. Bash for plan-reviewer)** — the
  [2026-07-31] decision records the allowlist as a capability contract;
  mechanical-check execution stays out of scope.
- **Reviewer delta-review / partial evaluation** — the no-short-circuit
  invariant ([2026-04-28]) stands: every rubric item is evaluated and logged
  on every attempt; only blocking semantics change.
- **A third verdict state or orchestrator state-machine changes** —
  advisory-only outcomes are `APPROVED`; the PRD phase lifecycle and
  `/relay-execute`'s HALT-code surface are untouched except for
  stuck-detection composing over blocking ids.
- **A shared writer↔reviewer rubric resource file** — conflicts with the
  [2026-07-30] anti-gaming rule ("authoring rules, never rubric
  restatement"); writer self-checks are not modified by this feature.
- **Reclassifying or rewriting historic jsonl entries** — the audit log is
  append-only; old rows simply lack the `class` field and consumers treat
  absence as blocking (pre-feature semantics).
- **Per-project class overrides / severity tuning** — single plugin-defined
  partition in MVP; a `methodology.md` override surface is a Could.
- **The task-template `**AC**:` slot fix** — a real writer-side defect-class
  killer (59 failures), but a sibling feature with its own blast radius
  (plan-writer Step 4.4, plan-template.md, R-COH-TASK-AC-MISSING semantics);
  deferred to a separate PRD.
- **Porting the pattern to code-reviewer / other pairs** — second wave after
  the plan-review measurement validates the boundary.
- **User dialogue anywhere in plan-review** — the interactivity boundary
  ([2026-04-19]) is untouched.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| First-attempt CHANGES_REQUESTED rate | ≤ 20% over the first ~20 post-release plan artifacts (baseline 52.8% overall, 0.60 Aug 2026) | `scripts/efficiency.mjs` (verdict-based `firstAttemptFailureRate`, semantics unchanged) against `PRPs/plans/*.review.jsonl` |
| Mean verdicts per plan | ≤ 1.25 (baseline 1.83); zero plans exceeding 2 attempts outside legitimate HALTs (baseline 19% needed ≥3) | `efficiency.mjs` runs-per-artifact over the same corpus |
| Advisory soundness (safety guard) | < 10% of open advisories implicated in a later implement/code-review/test failure of the same phase | Class-aware `efficiency.mjs` tallies + manual sampling via the `efficiency-report` skill (attribution is semi-manual by design) |
| Implement-stage non-regression (escape guard) | Implement-stage rework rate does not rise over the same ~20 artifacts | `efficiency.mjs` on `*.code-review.jsonl`, compared to the 2026-08-05 baseline |

## Acceptance Criteria (test scenarios)

- **AC-1 Advisory-only failures approve:** Given a plan whose full rubric
  evaluation yields failing rows only in advisory-classed checks, when the
  plan-reviewer emits its verdict, then the verdict is `APPROVED`, the
  DRAFT→APPROVED flip is performed, every failing row carries
  `"class": "advisory"`, and the jsonl line records ALL evaluated rubric rows
  (no short-circuit).
- **AC-2 Blocking failures gate:** Given at least one blocking-classed
  failing row, when the verdict is emitted, then it is `CHANGES_REQUESTED`
  and the failing-items bullet list presents blocking rows as mandatory
  fixes with advisory rows listed separately as non-blocking notes.
- **AC-3 Class field is total and declared:** Given any emitted verdict,
  when its jsonl line is inspected, then every rubric row carries a `class`
  field whose value matches the partition table declared in
  `plan-reviewer.md`, and the rubric-arithmetic prose plus the DERIVED
  corpus test (`plan-reviewer-rubric-arithmetic-derived.test.mjs`) agree
  with the partition (counts per class derivable from the live headings).
- **AC-4 Advisory injection into the Implementer:** Given a plan approved
  with ≥1 open advisory, when `/relay-implement` dispatches the implementer,
  then the dispatch prompt contains the open advisories in the canonical
  `list<{rubric_id, reason}>` shape explicitly marked non-blocking; given
  zero open advisories, the dispatch is byte-identical to today's.
- **AC-5 Retry convergence ratchet:** Given a re-review at attempt N≥2
  following a Targeted-revision retry, when the reviewer finds a new defect
  in a section NOT implicated by the previous verdict's cited ids, then the
  finding is logged with `"class": "advisory"` plus a ratchet annotation and
  does not produce `CHANGES_REQUESTED`; findings on previously-cited ids or
  inside implicated sections retain their declared class.
- **AC-6 One-way escalation valve:** Given an advisory-classed check whose
  finding the reviewer judges implementation-misleading, when the reviewer
  escalates it, then the row carries `"class": "blocking"`,
  `"escalated": true`, and a reason that names the concrete Implementer
  impact; no mechanism exists to demote a blocking-classed check.
- **AC-7 Stuck-detection composes over blocking ids only:** Given
  `/relay-execute`'s plan-review retry loop, when consecutive
  `CHANGES_REQUESTED` verdicts are compared for `FAILED_PLAN_REVIEW_STUCK`,
  then the equality test runs over blocking failing-id sets only, and an
  advisory-only outcome never enters the retry loop (it is `APPROVED`).
- **AC-8 Class-aware measurement:** Given `scripts/efficiency.mjs` runs over
  a corpus containing class-annotated rows, when it aggregates, then
  top-failure tallies are reported per class (blocking vs advisory), rows
  without a `class` field count as blocking (backward compatibility), and
  `firstAttemptFailureRate` semantics are unchanged.
- **AC-9 Ratchet integrity hash:** Given each verdict line records a content
  hash of the reviewed plan, when a retry's plan content diverges from the
  Targeted-revision contract (sections outside the implicated set changed),
  then the ratchet is voided for that attempt — full blocking scope applies —
  and the void is recorded on the verdict line.

## Open Questions

- [ ] OQ-1: Final class for the two borderline high-volume ids —
  `R-COH-TASK-AC-MISSING` (59 fails; 71% writer-blind-spot but the AC
  linkage is what the Implementer executes) and `R-COH-AC-TASK-DECOUPLED`
  (26 fails): advisory now, or blocking until the sibling task-template
  `**AC**:` slot feature removes the root cause?
- [ ] OQ-2: For the [2026-07-30] revert-clause bookkeeping, does
  APPROVED-with-advisories count as a first-attempt pass? (Proposal: yes,
  with an explicit note in the measurement so the two regimes are not
  silently conflated.)
- [ ] OQ-3: Should standalone `/relay-plan-review` surface open advisories
  in its console output only, or also write a sidecar artifact for human
  review outside `/relay-execute` runs?

---

## Users & Context

**Primary User**
- **Who:** The relay operator (maintainer or team member) running
  `/relay-execute` or `/relay-plan-review` against a target project.
- **Current behavior:** Watches plan-review reject repeatedly, waits out
  regenerate-and-re-review rounds that burn the 240-minute orchestrator
  budget, and occasionally intervenes manually (amending plans or
  `docs/decisions.md` mid-loop, as in the measured 7-attempt case).
- **Trigger:** Any PRD Implementation Phases row entering the plan stage.
- **Success state:** Plan approved in ≤2 review rounds; real defects still
  blocked; advisories reach the Implementer without operator involvement.

**Job to Be Done**
When a planned phase enters plan-review in the autonomous stretch of the
pipeline, I want only implementation-misleading defects to block approval —
with everything else recorded and carried downstream — so I can reach
implementation in one or two review rounds without sacrificing audit rigor or
letting real defects through.

**Non-Users**
Not for the other reviewer pairs in MVP (code-reviewer, test-reviewer,
prd-reviewer, docs-reviewer, design-map/design-spec reviewers) — plan-reviewer
only, though the pattern is designed to be portable (code-reviewer is the
natural second wave). Not for target-project end users. Not a per-project
severity-tuning surface — the partition is plugin-defined in MVP.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | M1 — Per-check `class: blocking \| advisory` declaration for every rubric id in `plan-reviewer.md`, initial partition from the 2026-08-06 evidence (blocking: R1–R8, R-COH-VALIDATE-ALWAYS-PASS, R-COH-VALIDATE-FRAMEWORK-MISMATCH, R-COH-FILES-UNTOUCHED, named K=5 contradiction classes; advisory: line-cite drift, R-COH-MANDATORY-READING-*, R-COH-SUMMARY-TASKS-DRIFT, catch-all R-COH-OTHER-INTERNAL-CONTRADICTION); future checks default advisory — promotion to blocking requires a recorded decision with measured evidence | The materiality boundary itself; inverts the incident-driven blocking ratchet |
| Must | M2 — Gating function: `CHANGES_REQUESTED` ⇔ ≥1 blocking failing row; advisory-only → `APPROVED` + flip; `class` field added to every jsonl rubric row (additive); no-short-circuit preserved | Removes the 84% immaterial rejections without touching evaluation |
| Must | M3 — One-way escalation valve (`escalated: true` + materiality justification; never demotion) | Safety valve for genuinely misleading instances of advisory checks |
| Must | M4 — `/relay-implement` reads the latest verdict line and injects open advisories into the implementer dispatch as non-blocking caveats (`list<{rubric_id, reason}>` shape) | Advisories must be consumed, not dropped; the Implementer absorbs them at negligible cost |
| Must | M5 — Retry convergence ratchet: attempt ≥2 blocking scope = previously-cited ids + findings in sections implicated by them (the Targeted-revision contract's editable set); new findings elsewhere log advisory; per-verdict plan content hash voids the ratchet on out-of-band edits (fail-safe to full blocking) | Kills the moving-target loop (33 new vs 31 repeated failing items) |
| Must | M6 — `FAILED_PLAN_REVIEW_STUCK` compares blocking failing-id sets only; advisory-only verdicts never enter the retry loop | Composes the ratchet with the existing convergence guard |
| Must | M7 — Class-aware `efficiency.mjs` (per-class tallies; absent `class` = blocking; `firstAttemptFailureRate` unchanged) + DERIVED arithmetic test extended for the partition | The hypothesis is only testable if measurement distinguishes classes |
| Should | "Open plan-review advisories" section in the PR body via `plugins/relay/scripts/generate-final-report.mjs` | Audit visibility of unaddressed advisories at merge time |
| Should | `efficiency-report` skill extension with advisory→defect conversion sampling | Feeds the evidence-based promotion loop |
| Should | Docs sync: `docs/context/architecture.md`, `docs/api-reference.md`, documentation site pages describing the plan-review stage | Repo convention; handled by the docs-sync pair at implement time |
| Could | Port the class pattern to code-reviewer | Second wave, after measurement validates the boundary |
| Could | Per-project class overrides in `methodology.md` | Only if the single partition proves wrong per stack |
| Could | Automated advisory→blocking promotion from measured conversion | No industry precedent found; manual decisions.md promotion first |
| Won't | Reviewer `tools:` widening; delta-review; third verdict state; shared rubric file; historic jsonl rewrites; task-template AC slot; plan-review user dialogue | See "What We're NOT Building" |

### MVP Scope

M1–M7: the class partition, the new gating function with the additive jsonl
`class` field, the escalation valve, the implementer injection, the
convergence ratchet with hash integrity, stuck-detection composition, and
class-aware measurement. Everything else is Should/Could.

### User Flow

Operator runs `/relay-execute` on an APPROVED PRD → plan-writer emits a DRAFT
→ plan-reviewer evaluates the full rubric → two advisory-classed findings
fail, zero blocking → verdict `APPROVED`, advisories logged in the jsonl →
flip → `/relay-implement`'s dispatch carries the two caveats → the Implementer
re-verifies the drifted line cite when it opens the file → the phase proceeds
with zero retries. The operator never sees a loop.

---

## Technical Approach

**Feasibility:** HIGH

### TDD routing

Current value of `tdd` in `docs/context/methodology.md`: **false**.
Test-after ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with no
framework declared, no tests are authored. (This repo declares
`test_frameworks: ["node:test"]`, so the pair is active in test-after mode;
R-X strict applies to the `scripts/validate/` corpus additions.)

### Architecture Notes

- The gating seam is `plugins/relay/agents/plan-reviewer.md:1147-1188` (Step
  3's "any `passed: false` row triggers CHANGES_REQUESTED") — M2 rewrites
  exactly this branch condition. The row shape `{id, passed, reason?}` and
  the "18–23 / 18–26" arithmetic live at lines 1021–1068 and are guarded by
  the DERIVED corpus test
  `scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs`,
  which must be extended to derive per-class counts from the live headings.
- Per-check metadata precedent: R-COH-VALIDATE-FRAMEWORK-MISMATCH's two
  conditional exemption branches (`plan-reviewer.md:374-429`) — the `class`
  declaration hangs off each check definition the same way.
- The retry loop and `FAILED_PLAN_REVIEW_STUCK` (failing-ID-set equality)
  live at `plugins/relay/commands/relay-execute.md:355-432`; M6 modifies the
  set construction, not the mechanism.
- Advisory injection mirrors the canonical `prior_feedback`
  `list<{rubric_id, reason}>` shape (`plugins/relay/agents/plan-writer.md:50-76`);
  `/relay-implement` has NO plan-review input today
  (`plugins/relay/commands/relay-implement.md:214-284`) — M4 is net-new
  plumbing in Phase A.0.
- `scripts/efficiency.mjs:84-156` parses only `id`/`passed`; M7 adds the
  class dimension with absent-field-counts-as-blocking backward
  compatibility, keeping historic corpora comparable.
- The jsonl schema change is additive, consistent with the [2026-04-28]
  AC-10 evolution precedent; `verdict` stays binary so no consumer of the
  APPROVED/CHANGES_REQUESTED contract changes behavior.
- The ratchet leans on the Targeted-revision byte-identical contract
  ([2026-07-30]) instead of per-section hashing; the whole-plan content hash
  per verdict line is the cheap integrity guard that voids the ratchet on
  contract violations.

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Misclassified boundary lets a real defect ship as advisory | M | Conservative initial partition (only checks measured ≥~70% immaterial go advisory); escalation valve; safety metrics M3/M4 with an explicit revert clause mirroring the [2026-07-30] precedent |
| LLM reviewer over-uses the escalation valve, re-blocking everything | M | Escalation requires a materiality justification naming the Implementer impact; escalation rate measured by class-aware `efficiency.mjs`; DERIVED test pins partition completeness |
| Ratchet's reliance on the Targeted-revision contract breaks on out-of-band edits | L–M | Per-verdict plan hash; mismatch voids the ratchet fail-safe (full blocking scope) and records the void on the verdict line |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Class taxonomy + gating | `class` declarations on every check in `plan-reviewer.md`, partition table, new verdict gating function, escalation valve, re-derived rubric arithmetic, extended DERIVED corpus test | complete | - | - | PRPs/plans/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md |
| 2 | Retry convergence ratchet | Attempt-aware blocking scope in `plan-reviewer.md`, per-verdict plan hash + void semantics, `relay-execute.md` stuck-detection over blocking sets and advisory-only never looping | complete | - | 1 | PRPs/plans/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md |
| 3 | Advisory pass-through | `/relay-implement` Phase A.0 reads the latest verdict and injects open advisories into the implementer dispatch; `/relay-plan-review` surfaces open advisories in its command output | complete | - | 1 | PRPs/plans/plan-review-materiality-phase-3-advisory-pass-through.plan.md |
| 4 | Measurement + surfaces | Class-aware `efficiency.mjs` + tests, `efficiency-report` skill extension, PR-body advisories section in `generate-final-report.mjs`, docs sync | complete | - | 1 | PRPs/plans/plan-review-materiality-phase-4-measurement-surfaces.plan.md |

#### Phase-status lifecycle

This table IS relay's canonical phase-state machine (`docs/decisions.md`,
2026-05-04) — there is no separate state file. Every row starts at
`pending` and advances through exactly five states, in order, never
skipping backwards:

| Status | Meaning | Written by |
|--------|---------|------------|
| `pending` | No plan yet. The only state from which a row is actionable. | Authored here, by hand or by `prd-writer` |
| `in-progress` | A DRAFT plan exists and the `PRP Plan` cell points at it. | `plan-writer` Step 5.1 back-fill |
| `implemented` | Code written and code-review APPROVED; tests not yet settled. | `/relay-implement` D8 Mutation c |
| `tested` | Test suite ran GREEN *and* post-green review confirmed the green was not obtained by weakening tests. | `/relay-execute` Step A.5.3 |
| `complete` | The orchestrator drove the phase end to end. | `/relay-execute` Step A.6.0 |

Three rules follow from this table and are enforced across the pipeline:

1. **`tested` is skipped, never faked, when nothing was tested.** A project
   with no declared test framework (or a phase whose test stage self-skipped)
   goes `implemented` → `complete` directly. The skip reason is recorded in
   `PRPs/reports/<feature>/orchestrator-run.json`, not hidden in the Status
   cell.
2. **A dependency is satisfied from `implemented` onward.** A row listed in
   another row's `Depends` cell unblocks it once it reaches `implemented`,
   `tested`, or `complete` — not only at `complete`.
3. **`complete` does not mean "merged".** It means the orchestrator finished
   the phase. Merge, branch cleanup, and post-merge docs sync belong to
   `/relay-approve`, which never edits this table.

To re-run a phase, hand-edit its `Status` cell back to `pending` — that is
the documented escape hatch, and the only sanctioned backwards transition.

### Phase Details

**Phase 1: Class taxonomy + gating**
- **Goal:** The verdict distinguishes materiality; advisory-only plans
  approve.
- **Scope:** `plan-reviewer.md` (class declaration per check, partition
  table, Step 3 gating rewrite, escalation valve, logging-discipline
  arithmetic re-derivation, jsonl example updates);
  `plan-reviewer-rubric-arithmetic-derived.test.mjs` extension; no other
  file.
- **Success signal:** AC-1, AC-2, AC-3, AC-6 demonstrable on a fixture
  plan; `npm run validate` green.

**Phase 2: Retry convergence ratchet**
- **Goal:** Retries converge — the blocking set is monotone non-increasing
  absent new writer-introduced defects in touched sections.
- **Scope:** `plan-reviewer.md` (attempt-aware blocking scope, plan hash,
  void semantics), `relay-execute.md` (stuck-detection over blocking sets;
  advisory-only never loops).
- **Success signal:** AC-5, AC-7, AC-9 demonstrable; stuck-detection
  fixture unchanged behavior for blocking-only corpora.

**Phase 3: Advisory pass-through**
- **Goal:** Open advisories reach the Implementer and the operator.
- **Scope:** `relay-implement.md` (Phase A.0 read + dispatch injection),
  `relay-plan-review.md` (surface advisories in command output).
- **Success signal:** AC-4 demonstrable; dispatch byte-identical when no
  advisories exist.

**Phase 4: Measurement + surfaces**
- **Goal:** The hypothesis is measurable and advisories are visible at
  merge time.
- **Scope:** `scripts/efficiency.mjs` + its tests, `efficiency-report`
  skill, `plugins/relay/scripts/generate-final-report.mjs` PR-body section,
  docs sync (architecture, api-reference, documentation site).
- **Success signal:** AC-8 demonstrable; PR body shows the advisories
  section when advisories exist.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Severity model | Static per-check class + one-way per-finding escalation | Per-finding judged severity; configurable thresholds | Bounds LLM variance; mirrors GitHub code scanning (per-rule severity, per-finding triage); auditable via DERIVED test |
| Advisory-only verdict value | `APPROVED` (binary verdict preserved) | Third verdict state (`APPROVED_WITH_ADVISORIES`) | Zero orchestrator/state-machine changes; advisories live in the payload |
| Default class for future checks | Advisory until promoted by recorded decision with measured evidence | Blocking by default (status quo) | Inverts the incident-driven ratchet that grew the rubric 8→27 ids while the failure rate rose |
| Catch-all `R-COH-OTHER-INTERNAL-CONTRADICTION` | Advisory (escalation valve available) | Keep blocking; delete the check | It is the measured engine of the worst loops with 84%-immaterial evidence; deletion would lose the audit signal |
| Ratchet anchoring | Targeted-revision implicated-sections contract + whole-plan hash void | Per-section hashes; reviewer-side diff of stored plan copies; delta review | Cheapest mechanism that respects no-short-circuit; hash is integrity-only, not a diff |
| Escalation/promotion loop | Manual: measurement produces evidence, a human records promotion in `docs/decisions.md` | Automated promotion pipeline | Market gap — no surveyed tool automates outcome-based promotion; keep human judgment at the boundary |
| `/relay-qa-report` surfacing | Dropped from scope | Include as advisory consumer | Grounding showed it consumes no review.jsonl today; adding it is unrelated plumbing |
| Sibling writer-template fix (`**AC**:` slot) | Separate PRD | Fold into this feature | Different blast radius (writer/template/check semantics); this PRD is reviewer-side gating only |

---

## Research Summary

**Market Context**
- Severity-blind gating is a recognized anti-pattern: reviewdog's
  `--fail-on-error` fails on any diagnostic regardless of level and its
  maintainers propose a cascading `-fail-level`
  (github.com/reviewdog/reviewdog/issues/856).
- GitHub code scanning is the closest template: static per-rule severity,
  a configurable merge-blocking threshold, and per-finding dismissal with a
  logged reason (docs.github.com code-scanning merge-protection + triage
  pages).
- SonarQube PR quality gates evaluate conditions on NEW code only —
  precedent for delta-anchored gating (docs.sonarsource.com quality gates).
- Rust Clippy ships `pedantic`/`restriction` allow-by-default explicitly
  because of known false positives — precedent for advisory-by-default
  noisy checks (doc.rust-lang.org/clippy/usage.html).
- A 146-PR / 679-finding benchmark of four LLM reviewers measured
  CodeRabbit surfacing 1–3 new findings per fix-push (5–6 review cycles per
  non-trivial PR, ~2/3 mechanical findings) — the moving-target pathology is
  industry-wide, and finding-overlap between tools was near zero
  (dev.to/_vjk, 2026). Cross-study false-positive figures conflict, so
  absolute FP rates are provisional.
- Gap: no surveyed tool automates outcome-based severity promotion; relay's
  evidence-based promotion stays manual (decisions.md) in MVP.

**Technical Context**
- Gating seam: `plan-reviewer.md:1147-1188` (any `passed:false` →
  CHANGES_REQUESTED); row shape + 18–23/18–26 arithmetic at 1021–1068,
  pinned by the DERIVED corpus test
  (`scripts/validate/checks/plan-reviewer-rubric-arithmetic-derived.test.mjs`).
- Per-check conditional metadata precedent: `plan-reviewer.md:374-429`
  (R-COH-VALIDATE-FRAMEWORK-MISMATCH exemption branches; 2026-05-14
  phase_type decision).
- Retry loop + `FAILED_PLAN_REVIEW_STUCK` ID-set equality:
  `relay-execute.md:355-432`.
- Feedback shape to mirror: `prior_feedback` `list<{rubric_id, reason}>` +
  Targeted revision mode (`plan-writer.md:50-76`; decisions.md 2026-07-30).
- `/relay-implement` has no plan-review input path today
  (`relay-implement.md:214-284`) — advisory injection is net-new.
- `efficiency.mjs:84-156` reads only `id`/`passed`; class dimension is
  additive with absent=blocking compatibility.
- Research-agent gap corrected during authoring: `generate-final-report.mjs`
  DOES exist at `plugins/relay/scripts/generate-final-report.mjs` (the
  codebase researcher searched the repo-root `scripts/` only); the PR-body
  Should-item is grounded on the verified path.
- `/relay-qa-report` consumes no review.jsonl (verified gap) — dropped from
  scope.

---

*Generated: 2026-08-06*
*Approved: 2026-08-06*
*Status: APPROVED*
