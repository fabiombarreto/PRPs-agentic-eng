# Feature: Measurement + surfaces (Phase 4 of plan-review-materiality)

```
**Decision Gate**
- Active context: none
- Activated criteria: modifies a cross-cutting measurement script consumed by a registered validation check (timestamp-contract's CONSUMERS registry); extends the PR-body report generator; edits the docs knowledge base and the rendered documentation site (governed by documentation/AGENTS.md)
- Decisions found:
  - [2026-07-31] review_started_at + timestamp_degraded — scripts/efficiency.mjs is the registered CONSUMER whose degraded-artifact exclusion must survive untouched; the class dimension is added beside it, never in place of it
  - [2026-08-05] efficiency.mjs counts rework per review SESSION, not per jsonl file — the session-splitting semantics stay byte-identical; only new per-class tallies are added
  - [2026-04-28] AC-10 no-short-circuit — measurement reads what the reviewer logs; nothing about evaluation changes
  - Phase 1 consumer-compatibility rule — a rubric row without a `class` field reads as BLOCKING; this is exactly what keeps historic corpora comparable
  - documentation/AGENTS.md §9 — modifying an existing page requires reading it in full, preserving structure/slugs, and a changelog entry under Unreleased; the three-file registration rule applies to NEW pages only
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (none written)
  - Weakening or deleting tests (scripts/efficiency.test.mjs and the checks corpus stay green; any test change routes to the test pair — R-X)
  - Relying on interactive permission prompts in the autonomous loop
- Applicable architectural rules:
  - Backward compatibility of the audit corpus: absent `class` counts as blocking, so pre-materiality artifacts keep their historic tallies
  - PR-body sections are omitted entirely (no heading, no placeholder) when their data is absent — the established generate-final-report.mjs idiom
  - Every documentation/ change carries a changelog entry
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 4:
  "Measurement + surfaces" — Goal: The hypothesis is measurable and
  advisories are visible at merge time. — Success signal: AC-8
  demonstrable; PR body shows the advisories section when advisories
  exist.

## Summary

This phase makes the feature's own hypothesis measurable and its output
visible. `scripts/efficiency.mjs` gains a class dimension: `readCorpus`
captures each failing row's `class` (absent ⇒ `blocking`, the Phase-1
compatibility rule), `aggregate` emits `topFailuresByClass` plus
`blockingFailRows`/`advisoryFailRows` counts per stage, and
`doCompare()`'s per-stage print block gains one conditional line so those
numbers actually reach the operator instead of sitting unread in the
returned object. `firstAttemptFailureRate`, session splitting, and
degraded-artifact exclusion stay byte-identical. `plugins/relay/scripts/generate-final-report.mjs`
gains an "Open plan-review advisories" PR-body section built with the
existing omit-entirely-when-empty idiom, reading each in-scope phase's
`PRPs/plans/<basename>.review.jsonl` last entry via the plansRoot
resolution the file already performs. `.claude/commands/efficiency-report.md`
(the real efficiency-report surface — no such skill exists under
`plugins/relay/skills/`) gains an advisory→defect conversion-sampling step,
explicitly semi-manual. Finally the stale gating prose is corrected in
`docs/api-reference.md` and in the three documentation pages that repeat
it, with the mandatory changelog entry.

## User Story

As the relay maintainer evaluating whether the materiality threshold
worked
I want per-class failure tallies in the efficiency report and open
advisories visible in the PR body
So that I can tell a real reduction in rework from a reclassification
artifact, and promote or demote a check on measured evidence rather than
by incident.

## Problem Statement

Phases 1–3 changed what blocks and what flows downstream, but the
measurement surface is class-blind: `efficiency.mjs` reads only
`r.passed`/`r.id`, so an advisory-classed row counts exactly like a
blocking one in `topFailures` — which would make the feature's own
success metric unreadable. Open advisories are also invisible at merge
time (the PR body has no section for them), and four documentation
surfaces still describe the pre-materiality gating ("any failure →
CHANGES_REQUESTED", "8-item structural rubric... without short-circuit").

## Solution Statement

Add the class dimension to the measurement path without touching any
existing metric's semantics; add one conditional PR-body section using
the established idiom; add one sampling step to the efficiency-report
command; and correct the four stale documentation surfaces with the
changelog entry `documentation/AGENTS.md` §9 requires.

## Metadata

| Field | Value |
|---|---|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | efficiency measurement pipeline; PR-body report generator; efficiency-report command; docs knowledge base + documentation site |
| Dependencies | Implementation Phases row 1 (complete; Depends cell: 1) |
| Estimated Tasks | 5 |
| Source PRD | `PRPs/prds/plan-review-materiality.prd.md` — Implementation Phases row 4 |
| phase_type | feature |

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `scripts/efficiency.mjs` | 60-80 | `readCorpus`'s entry shape + the `fails` mapping (`r.passed`/`r.id` only) that Task 1 extends with `class` |
| P0 | `scripts/efficiency.mjs` | 124-165 | `aggregate`'s per-stage metric block — the `fails` tally, `firstAttemptFailureRate`, and `topFailures` computation Task 2 extends without altering |
| P0 | `scripts/efficiency.mjs` | 166-190 | `firstSeen`/`hasDegradedTimestamp`/`classifyArtifacts` — the degraded-exclusion contract registered in the timestamp-contract CONSUMERS check that must stay untouched |
| P0 | `plugins/relay/scripts/generate-final-report.mjs` | 455-500 | The Visual Fidelity conditional-section idiom (discover → `if (length > 0)` → push heading) Task 3 mirrors |
| P1 | `plugins/relay/scripts/generate-final-report.mjs` | 169-259 | `findPlanForPhase`/`loadPhaseScopes` plansRoot resolution + `loadVisualApprovalLine`'s per-line JSON.parse — the path and parse precedents the advisory loader reuses |
| P1 | `.claude/commands/efficiency-report.md` | 1-106 | The command's allowed-tools line and 5-step Steps section Task 4 extends |
| P1 | `docs/api-reference.md` | 62 | The stale `/relay-plan-review` row asserting any rubric failure yields CHANGES_REQUESTED |
| P1 | `documentation/AGENTS.md` | 400-406 | §9 modifying-an-existing-page workflow (read in full, preserve slugs, changelog entry mandatory) governing Task 5 |
| P2 | `PRPs/prds/plan-review-materiality.prd.md` | 143-201 | Success Metrics + PRD AC-8 — the metric this phase makes computable |

## Patterns to Mirror

# SOURCE: scripts/efficiency.mjs:84
```
        fails: (j.rubric ?? []).filter((r) => r.passed === false).map((r) => r.id),
```
Task 1 extends this single expression to capture each failing row's class
alongside its id, keeping `fails` (the id list) intact for every existing
consumer.

# SOURCE: scripts/efficiency.mjs:147-155
```
    const fails = {};
    for (const a of group) for (const e of a.entries) for (const id of e.fails) fails[id] = (fails[id] ?? 0) + 1;
    out[stage] = {
      artifacts: group.length,
      sessions: sessions.length,
      splitArtifacts,
```
Task 2 adds a sibling per-class tally loop and new output keys beside
these, never modifying the existing `fails` loop or any existing key.

# SOURCE: plugins/relay/scripts/generate-final-report.mjs:469-471
```
  const visualFrames = loadVisualFidelityFrames(reportsDir);
  if (visualFrames.length > 0) {
    const phasesInScope = [...new Set(visualFrames.map((f) => f.phase))];
```
Task 3's advisories section mirrors this discover-then-guard shape
exactly — heading omitted entirely when the loader returns nothing.

# SOURCE: plugins/relay/scripts/generate-final-report.mjs:200
```
  const plansRoot = resolve(reportsDir, '..', '..');
```
Task 3's loader reuses this exact plansRoot derivation — performed by
`loadPhaseScopes`, which passes the result into `findPlanForPhase` as its
first parameter — to reach `PRPs/plans/` (and `PRPs/plans/completed/`)
rather than inventing new path resolution.

# SOURCE: docs/api-reference.md:62
```
| `/relay-plan-review <plan-path>` ✅ **implemented** | plan ending with `*Status: DRAFT*` (generated by `/relay-plan` or hand-edited) | status flipped to `*Status: APPROVED*` via two-line `Edit` (insert `*Approved: <YYYY-MM-DD>*` above the trailer), or `CHANGES_REQUESTED` with the failing rubric items by ID + reason.
```
Task 5 corrects this row's gating clause to the blocking/advisory
contract.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `scripts/efficiency.mjs` | UPDATE | Class capture in `readCorpus`, per-class tallies in `aggregate`, and the `doCompare()` per-stage print line that surfaces them (AC-A1, AC-A3) |
| `plugins/relay/scripts/generate-final-report.mjs` | UPDATE | "Open plan-review advisories" conditional PR-body section (AC-A2) |
| `.claude/commands/efficiency-report.md` | UPDATE | Advisory→defect conversion-sampling step (AC-A3) |
| `docs/api-reference.md` | UPDATE | Correct the stale plan-review gating clause (AC-A4) |
| `documentation/reference/commands.html` | UPDATE | Same stale gating framing on the rendered site (AC-A4) |
| `documentation/concepts/pipeline.html` | UPDATE | Stage-2 "8-item structural rubric" framing (AC-A4) |
| `documentation/changelog.html` | UPDATE | Mandatory changelog entry for every documentation/ change (AGENTS.md §9) |

## NOT Building (Scope Limits)

- **Automated advisory→blocking promotion** — the PRD keeps promotion a
  human decision recorded in `docs/decisions.md`; this phase only
  produces the evidence.
- **A new `plugins/relay/skills/efficiency-report/` asset** — the
  efficiency-report surface is the repo-local
  `.claude/commands/efficiency-report.md` maintainer devtool; creating a
  packaged skill is out of scope.
- **New documentation pages** — only existing pages are corrected, so
  AGENTS.md's three-file registration rule (NAV + search index) does not
  apply; the changelog entry does.
- **Registering efficiency-report in the timestamp-contract CONSUMERS
  array** — it never classifies jsonl by timestamp itself; the check's
  own docblock records this deliberate exclusion.
- **Changing any existing metric's semantics** —
  `firstAttemptFailureRate`, session splitting, and degraded exclusion
  stay byte-identical.
- **Test-file edits** — `scripts/efficiency.test.mjs` and the checks
  corpus are the test pair's (R-X strict; test-after).
- **`documentation/reference/validation-checks.html` counts** — that
  page's numbers track the validation-suite catalog, which this phase
  does not change.

## Step-by-Step Tasks

### Task 1: UPDATE scripts/efficiency.mjs — capture rubric-row class in readCorpus

**ACTION**: Delivers AC-A1 (PRD AC-8). In `readCorpus`'s per-entry object,
keep the existing `fails` id-list expression byte-identical and add a
sibling field `failClasses` mapping each failing row to its class:
`failClasses: (j.rubric ?? []).filter((r) => r.passed === false).map((r) => ({ id: r.id, class: r.class === 'advisory' ? 'advisory' : 'blocking' }))`
— the ternary IS the compatibility rule: any value that is not exactly
the string `advisory` (including an absent `class` on pre-materiality
entries) counts as `blocking`. Update the function's `@returns` JSDoc
entry shape to include the new field. Add a short comment above the new
line stating the compatibility rule and naming the Phase-1 source of it
(rows without a `class` field predate the taxonomy and are read as
blocking).
**MIRROR**: `scripts/efficiency.mjs:84` (the expression being
paralleled).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'failClasses' scripts/efficiency.mjs
node -e "import('./scripts/efficiency.mjs').then(m => { const c = m.readCorpus(); const e = c.flatMap(a => a.entries); if (!e.length) { console.log('PASS: empty corpus, shape check skipped'); process.exit(0); } if (!('failClasses' in e[0])) { console.error('FAIL: failClasses absent from entry shape'); process.exit(1); } const bad = e.flatMap(x => x.failClasses).filter(f => f.class !== 'blocking' && f.class !== 'advisory'); if (bad.length) { console.error('FAIL: non-canonical class values', bad.slice(0,3)); process.exit(1); } console.log('PASS: failClasses present and canonical'); })"
```

### Task 2: UPDATE scripts/efficiency.mjs — per-class tallies in aggregate

**ACTION**: Delivers AC-A1 (PRD AC-8). In `aggregate`'s per-stage block,
leave the existing `fails` tally loop and every existing output key
byte-identical, and add beside them: a `failsByClass` tally
(`{blocking: {id: n}, advisory: {id: n}}`) built from the entries'
`failClasses`; and three new output keys —
`blockingFailRows` (total blocking-classed failing rows in the group),
`advisoryFailRows` (total advisory-classed failing rows), and
`topFailuresByClass` (`{blocking: [{id, n}...], advisory: [{id, n}...]}`,
each sorted descending and sliced to 8, mirroring `topFailures`'
shape). Add a comment stating that `firstAttemptFailureRate` semantics
are deliberately unchanged (it is verdict-based, so an
advisory-carrying APPROVED already counts as a first-attempt pass) and
that historic entries contribute entirely to the blocking side by the
Task-1 compatibility rule.

**Print path (required — a returned key nobody prints is invisible to
the operator).** `doCompare()`'s per-stage output block is hardcoded to
`artifacts`, `runsPerSession`, `firstAttemptFailureRate`, and up to 4
`topFailures` entries; it never prints the new keys, so Task 4's step
would have nothing to read. Extend that block: immediately after the
existing conditional `top failures after` line, add a sibling
conditional line printing the per-class split — the after-side
`blockingFailRows`/`advisoryFailRows` counts and up to 4 entries of
`topFailuresByClass.advisory` — emitted only when
`a.advisoryFailRows > 0` (so a corpus with no advisory-classed rows,
including every pre-materiality corpus, prints byte-identically to
today). Leave every existing print line, the drift/undated/degraded
warnings, the split-session NOTICE, the small-sample CAUTION, and
`doSnapshot()`'s own print loop byte-identical.
**MIRROR**: `scripts/efficiency.mjs:147-155` (the tally loop + output
object being extended), `scripts/efficiency.mjs:328-330` (the
conditional `top failures after` print line the new per-class line
sits beside).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'topFailuresByClass' scripts/efficiency.mjs
grep -q 'firstAttemptFailureRate' scripts/efficiency.mjs
grep -q 'advisoryFailRows' scripts/efficiency.mjs
awk '/^function doCompare\(\) \{/,0' scripts/efficiency.mjs | grep -q 'advisoryFailRows'
node -e "import('./scripts/efficiency.mjs').then(m => { const agg = m.aggregate(m.readCorpus()); const stages = Object.keys(agg); if (!stages.length) { console.error('FAIL: no stages aggregated'); process.exit(1); } for (const s of stages) { const v = agg[s]; for (const k of ['topFailures','firstAttemptFailureRate','topFailuresByClass','blockingFailRows','advisoryFailRows']) { if (!(k in v)) { console.error('FAIL: stage ' + s + ' missing ' + k); process.exit(1); } } if (!v.topFailuresByClass.blocking || !v.topFailuresByClass.advisory) { console.error('FAIL: topFailuresByClass lacks both class keys on ' + s); process.exit(1); } if (v.blockingFailRows + v.advisoryFailRows < 0) { console.error('FAIL: negative row counts'); process.exit(1); } } console.log('PASS: per-class keys present on all ' + stages.length + ' stages'); })"
node --test scripts/efficiency.test.mjs
```

### Task 3: UPDATE plugins/relay/scripts/generate-final-report.mjs — Open plan-review advisories section

**ACTION**: Delivers AC-A2 (PRD AC-8 surfacing half). Add a loader
function `loadOpenPlanReviewAdvisories(reportsDir)` placed beside the
existing loaders: derive `plansRoot = resolve(reportsDir, '..', '..')`
exactly as `loadPhaseScopes` does before passing it into
`findPlanForPhase`, enumerate the feature's plan
basenames already discoverable there (both `PRPs/plans/` and
`PRPs/plans/completed/`), and for each, read
`PRPs/plans/<basename>.review.jsonl` when it exists, `JSON.parse` its
LAST non-empty line (mirroring `loadVisualApprovalLine`'s per-line parse
+ try/catch), and collect rows with `passed === false` AND
`class === 'advisory'` into `{phase, id, reason}` items; return `[]` on
any parse failure or missing file (never throw). Then, immediately after
the Visual Fidelity section block, emit the new section using the same
guard idiom: `const openAdvisories = loadOpenPlanReviewAdvisories(reportsDir);`
followed by `if (openAdvisories.length > 0) {` → push the heading
`## Open plan-review advisories` → a short lead sentence stating these
were recorded, non-gating, and delivered to the implementer → a table
with header `| Phase | Check | Note |`. When the loader returns nothing
the section is omitted entirely — no heading, no placeholder — so a
run without advisories produces a byte-identical PR body. Apply the
project's redaction policy to emitted reason text exactly as neighbouring
sections do.
**MIRROR**: `plugins/relay/scripts/generate-final-report.mjs:469-471`
(the discover-then-guard idiom), `:200` (the plansRoot derivation, inside
`loadPhaseScopes`).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'loadOpenPlanReviewAdvisories' plugins/relay/scripts/generate-final-report.mjs
grep -q '## Open plan-review advisories' plugins/relay/scripts/generate-final-report.mjs
node --check plugins/relay/scripts/generate-final-report.mjs
```

### Task 4: UPDATE .claude/commands/efficiency-report.md — advisory→defect conversion sampling

**ACTION**: Delivers AC-A3 (PRD AC-8 evidence loop). Append a new
numbered step to the existing Steps section (keeping every existing step
byte-identical) titled
`Sample advisory→defect conversion (semi-manual).` specifying: after
reporting the per-stage deltas, read the per-class tallies now emitted by
`scripts/efficiency.mjs` (`topFailuresByClass`, `blockingFailRows`,
`advisoryFailRows`); for the advisory-classed ids that appear most often,
sample a handful of the artifacts that carried them and check whether the
same phase later failed code-review or tests for a related reason;
report the sampled conversion rate with an explicit statement that
attribution is judgment-based and the sample size is small, never a
computed precision figure. Add one sentence stating the decision rule the
sampling feeds: an advisory check that converts often is a candidate for
promotion to blocking via a recorded `docs/decisions.md` entry — the
inverse of the incident-driven ratchet — and that promotion is never
automatic. Do not modify the `allowed-tools:` frontmatter (the step needs
only the already-allowed Read plus the existing efficiency.mjs
invocation).
**MIRROR**: `.claude/commands/efficiency-report.md:1-106` (the existing
5-step Steps section whose numbering and voice the new step continues).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'Sample advisory→defect conversion (semi-manual).' .claude/commands/efficiency-report.md
grep -q 'topFailuresByClass' .claude/commands/efficiency-report.md
```

### Task 5: UPDATE the four documentation surfaces + changelog

**ACTION**: Delivers AC-A4 (PRD AC-8 documentation half). Four surgical
prose corrections plus the mandatory changelog entry, each preserving
surrounding structure and every `id` slug (AGENTS.md §9): (a)
`docs/api-reference.md` line 62's `/relay-plan-review` row — replace the
unqualified "`CHANGES_REQUESTED` with the failing rubric items" and the
"8-item structural rubric ... without short-circuit" phrasing with the
materiality-aware contract: every rubric item is still evaluated and
recorded (no short-circuit), and `CHANGES_REQUESTED` is emitted only when
a BLOCKING-classed item fails — advisory-classed failures approve with
the advisories recorded and passed to the implementer; (b)
`documentation/reference/commands.html`'s `/relay-plan-review` entry —
the same correction in that page's own voice/markup, slugs untouched; (c)
`documentation/concepts/pipeline.html`'s stage-2 entry — replace the
bare "8-item structural rubric" characterisation with one that names the
blocking/advisory classes; (d) `documentation/changelog.html` — add an
entry under `Unreleased` / `Changed` naming the plan-review materiality
threshold and the corrected pages. Read each page in full before editing
it. Do not renumber, re-slug, or restructure anything.
**MIRROR**: `docs/api-reference.md:62` (the row being corrected).
**VALIDATE**:
```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -qi 'advisory' docs/api-reference.md
grep -qi 'advisory' documentation/reference/commands.html
grep -qi 'advisory' documentation/concepts/pipeline.html
grep -qi 'advisor' documentation/changelog.html
if grep -q 'without short-circuit. Every verdict appended' docs/api-reference.md; then
  echo "FAIL: stale unqualified gating clause remains in api-reference.md"; exit 1
else
  echo "PASS: api-reference gating clause corrected"
fi
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS (syntax + structure)

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
node --check scripts/efficiency.mjs
node --check plugins/relay/scripts/generate-final-report.mjs
test "$(head -20 .claude/commands/efficiency-report.md | grep -cx -- '---')" -ge 2
```

### Level 2 — CONTENT_INVARIANTS

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
grep -q 'failClasses' scripts/efficiency.mjs
grep -q 'topFailuresByClass' scripts/efficiency.mjs
grep -q 'loadOpenPlanReviewAdvisories' plugins/relay/scripts/generate-final-report.mjs
grep -q 'Sample advisory→defect conversion (semi-manual).' .claude/commands/efficiency-report.md
node --test scripts/efficiency.test.mjs
```

### Level 3 — INTEGRATION (full validation suite + corpus)

```bash
set -euo pipefail
cd .worktrees/plan-review-materiality
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
node scripts/efficiency.mjs compare 2>&1 | tail -20 || true
```

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** Given `scripts/efficiency.mjs` runs over a corpus
  containing class-annotated rows, when it aggregates, then each stage
  reports `topFailuresByClass` (blocking and advisory keys),
  `blockingFailRows`, and `advisoryFailRows`; rows without a `class`
  field count as blocking; and `firstAttemptFailureRate` plus every
  pre-existing key keep their current semantics.
- **AC-A2 (PRD AC-8):** Given a feature whose plan-review verdicts carry
  open advisory-classed failing rows, when the PR body is generated,
  then it contains an `## Open plan-review advisories` section listing
  phase/check/note; given zero such rows (or no review.jsonl), the
  section is omitted entirely — no heading, no placeholder — and the
  body is byte-identical to today's.
- **AC-A3 (PRD AC-8):** Given the efficiency-report command runs `node
  scripts/efficiency.mjs compare`, when the per-stage output is printed,
  then the after-side per-class split (blocking/advisory row counts plus
  the top advisory ids) appears whenever any advisory-classed row exists
  — and is omitted byte-identically to today when none do — so that when
  the command reaches the new sampling step, it reads the per-class tallies,
  samples advisory ids for later-stage conversion, and reports the
  result with an explicit judgment-based/small-sample caveat plus the
  human-recorded promotion rule.
- **AC-A4 (PRD AC-8):** Given the documentation surfaces, when the
  plan-review gating is described, then `docs/api-reference.md`,
  `documentation/reference/commands.html`, and
  `documentation/concepts/pipeline.html` state the blocking/advisory
  contract (evaluation still exhaustive; only blocking failures gate),
  and `documentation/changelog.html` carries the corresponding
  `Unreleased` entry.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `scripts/efficiency.test.mjs` pins `readCorpus`'s entry shape or `aggregate`'s output keys and goes red on the additions | Medium | Level 2/3 red | Both tasks are strictly additive (no existing key or expression modified); Task 2's VALIDATE runs `efficiency.test.mjs` directly so any pin surfaces immediately; a legitimately-stale pin routes to the test pair (R-X), never an Implementer edit |
| The advisories loader throws on a malformed or partially-written jsonl line and breaks PR-body generation | Low-Medium | `/relay-pr` fails at report time | The loader returns `[]` on any missing file or parse failure and never throws (stated in the ACTION, mirroring `loadVisualApprovalLine`'s try/catch); `node --check` plus the corpus run guard syntax |
| A documentation edit renames a slug or reflows structure, breaking anchors and other pages' hrefs | Low | Broken site links | Task 5 states slug/structure preservation explicitly per AGENTS.md §9, requires reading each page in full first, and the changelog entry is part of the same task rather than a follow-up |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of
  `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering —
  when a test framework is declared, the test pair
  (test-writer/test-reviewer) authors and maintains the suite from the
  Acceptance Criteria above, after the Implementer + Code Review; with no
  framework declared, no tests are authored.
- **Test-pair deferral (R-X strict).** Corpus coverage for the per-class
  tallies, the PR-body section, and the documentation corrections is
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger rather than authored by the Implementer. No task in this plan
  touches a test file; the plan's gates RUN existing tests
  (`scripts/efficiency.test.mjs`, the checks corpus) as regression
  gates — running ≠ editing. (Both conditions of the reviewer's
  test-pair-deferral exemption hold: documented here, and no
  `## Files to Change` row or task ACTION targets a test glob.)
- **Why `.claude/commands/efficiency-report.md` is in scope despite the
  `.claude/` write prohibition.** The prohibition is on writing PIPELINE
  ARTIFACTS under `.claude/` (`docs/anti-patterns.md`); this file is a
  pre-existing, version-controlled maintainer slash-command that already
  lives there and is the only efficiency-report surface in the repo (no
  `plugins/relay/skills/efficiency-report/` exists). Editing it creates
  no artifact.
- **Documentation registration.** All four documentation touches are
  edits to EXISTING pages, so AGENTS.md's three-file registration rule
  (NAV + search index + changelog) reduces to the changelog entry alone
  (§9); no NAV or search-index change is warranted.
- **Worktree note.** Phases 1–3 are uncommitted on the feature worktree;
  the files this phase edits are untouched by them, so main-tree line
  numbers are current and the Implementer edits the worktree copies at
  `.worktrees/plan-review-materiality/`.

*Generated: 2026-08-07*
*Approved: 2026-08-07*
*Implemented: 2026-08-08*
*Status: IMPLEMENTED*
