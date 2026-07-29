# Feature: Reconcile plan-reviewer.md's R-COH-* merge conflict (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact reconciliation across
  plugins/relay/agents/plan-reviewer.md, plugins/relay/agents/plan-writer.md,
  and docs/decisions.md (not confined to a single file); impacts a
  reusable/cross-cutting component (plan-reviewer's R-COH-* rubric
  contract consumed by the orchestrator's plan-approval gate)
- Decisions found:
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows
    are additive to the rubric[] array (docs/decisions.md) — governs
    how new R-COH-* rows are added/counted; this merge's
    union-of-sections resolution directly applies that additive
    contract.
  - [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED
    deterministic plan-reviewer check; rubric[] arithmetic shifts to
    15-20/15-23 (docs/decisions.md:900-981) — first instance of the
    exact recomputation method (8 (R1-R8) + N (deterministic) + <=5
    (K5) formula, +2 design rows, +1 mutually-exclusive phase_scope
    row, "supersedes" cross-reference convention) this merge's
    Task 3 / Task 7 replicate.
  - [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS: an 8th FIXED
    deterministic plan-reviewer check; rubric[] arithmetic shifts to
    16-21/16-24 (docs/decisions.md:1026-1153) — second instance of the
    same method; this is HEAD's current (pre-merge) state.
  - [2026-04-25] Plan filenames carry the source PRD phase number and
    slug (docs/decisions.md) — establishes the PRPs/plans/ convention;
    this plan's own flat filename is the documented description-mode
    divergence from that convention (plugins/relay/agents/plan-writer.md
    Hard Constraint 10), not a violation of it.
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (docs/anti-patterns.md
    lines 61-67) — this plan's own output and every file it touches
    resolve under the target repo root, never `.claude/`.
  - Weakening or deleting tests / test-pair carve-out (docs/anti-patterns.md
    lines 15-21) — only the approved test-writer/test-reviewer pair may
    create, update, or delete test files, recorded in a suite manifest
    lifecycle ledger; the Implementer authors zero test-file changes
    (R-X strict). Grounds this plan's explicit exclusion of all
    `*.test.mjs` work.
- Applicable architectural rules:
  - The plugin is prompt + config, not code (docs/context/architecture.md
    "What `relay` is") — grounds this phase's `phase_type: docs`
    classification and its grep/git-based (not test-framework-based)
    validation style.
  - PRP artifacts live under `PRPs/` at the repository root, never under
    `.claude/` (docs/context/architecture.md "PRP artifact paths") —
    this plan's own path and its `## Files to Change` targets both
    comply.
  - Autonomous pipeline stages run without interrupting the user past
    PRD approval (docs/context/architecture.md "Interactivity
    boundary") — this plan authors no user-facing dialogue; Tasks 1-8
    run unattended.
- Result: PROCEED
```

## Source

Reconcile three independently-authored extensions to
`plugins/relay/agents/plan-reviewer.md`'s additive R-COH-* coherence
layer, by merging `origin/development` into
`feature/figma-implementation-track` and repairing the semantic
inconsistency the merge creates.

Three separate sessions each added deterministic checks in isolation,
each correctly updating the rubric-length arithmetic for its own
lineage. Because they never saw each other, all three arithmetic
statements are wrong once combined.

Current state, verified:

- `origin/development` (commit 89b7f76) carries **7** deterministic
  checks: the 6 long-standing ones plus
  `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE`. Its prose reads
  `8 (R1–R8) + 7 (deterministic ...)`.
- `feature/figma-implementation-track` (HEAD c5dd265) carries **8**
  deterministic checks: the same 6 plus
  `R-COH-ACTION-VALIDATE-CONTRADICTION` and
  `R-COH-VALIDATE-SEARCH-AMBIGUOUS`. Its prose reads
  `8 (R1–R8) + 8 (deterministic ...)` and asserts the range "never
  extends to a 25th row".
- It also carries **4** conditional (zero-emission) checks from the
  Figma tracks: `R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`,
  `R-COH-VISUAL-SCOPE-PURITY`, `R-COH-SENTINEL-RESOLUTION-MISSING`.

After merging, the true count is **9 deterministic** plus 4
conditional. Both arithmetic statements are therefore stale, and the
maximum-row claim must be recomputed from scratch.

`git merge origin/development` produces exactly three conflicted
files, whose shapes are already known:

1. `plugins/relay/agents/plan-reviewer.md` — three hunks. The first is
   a pure ADDITIVE collision: HEAD contributed six `#### R-COH-*`
   sections, origin contributed one, in the same region; the
   resolution is to keep all seven. The second is the rubric-length
   arithmetic paragraph — this is the one requiring genuine
   re-derivation, not a pick-a-side. The third is the example
   `rubric[]` array in the logging section: HEAD lists two new ids,
   origin lists one; keep all three.
2. `plugins/relay/agents/plan-writer.md` — two hunks, both additive
   collisions of the same shape.
3. `docs/decisions.md` — one hunk; the file is append-only, both sides
   appended entries, so the resolution is the union in chronological
   order.

Note `R-COH-VISUAL-SCOPE-PURITY` and `R-COH-SENTINEL-RESOLUTION-MISSING`
are mutually exclusive (both key off the same single-valued
`phase_scope` Metadata cell), so at most one of the two ever emits a
row. Any maximum-row arithmetic must account for that, exactly as the
pre-merge prose already did.

At least five test files on the feature-branch side assert the
arithmetic wording verbatim: `figma-track-ac2-reuse-enforcement.test.mjs`,
`figma-track-phase5.test.mjs`, `figma-visual-first-track-phase3.test.mjs`,
`figma-visual-first-track-phase4.test.mjs`,
`plan-reviewer-action-validate-contradiction-check.test.mjs`. Origin's
side has its own. Every one of them will need updating, and under R-X
strict that belongs to the test-writer/test-reviewer pair, never to
the Implementer — so the plan must NOT author test tasks.

The deliverable is a merge commit on `feature/figma-implementation-track`
in which all nine deterministic checks and all four conditional checks
coexist, every count and maximum-row claim is re-derived from the
merged file rather than carried over from either side, and
`npm run validate` is 9/9.

## Summary

`git merge origin/development` has not yet been run against
`feature/figma-implementation-track`. When it is, it will conflict in
exactly three files, all centered on `plan-reviewer.md`'s additive
`#### R-COH-*` deterministic-check catalog: two of the three conflicts
are pure unions (keep both sides' additions, no judgment required);
the third — the "rubric-length arithmetic" prose paragraph in
`plan-reviewer.md`'s `### Logging discipline` section — is genuinely
stale on both sides and must be recomputed from the real, merged
section count rather than carried over from either branch. This plan
performs the merge, resolves all six conflict hunks (three in
`plan-reviewer.md`, two in `plan-writer.md`, one in
`docs/decisions.md`), records the re-derivation as a new
`docs/decisions.md` entry following this repo's own established
convention, and closes with a merge commit plus a clean
`npm run validate` run. It authors zero test-file changes; that
follow-up belongs to the test-writer/test-reviewer pair.

## User Story

As a relay maintainer
I want the three independently-drifted extensions to
`plan-reviewer.md`'s R-COH-* coherence layer merged into one
internally-consistent file, with `plan-writer.md` and
`docs/decisions.md` correspondingly reconciled
So that the deterministic-check catalog, its rubric-length arithmetic,
and its audit trail all agree with reality, and `npm run validate`
passes cleanly on `feature/figma-implementation-track` after picking
up `origin/development`

## Problem Statement

Three independent editing sessions each added their own deterministic
`#### R-COH-*` check(s) to `plan-reviewer.md` and each correctly
updated the same "rubric-length arithmetic" summary paragraph to
account for their own addition — in isolation, never seeing the other
two sessions' work. `origin/development` (7 deterministic checks) and
`feature/figma-implementation-track` (8 deterministic checks + 4
conditional Figma-track checks) both now carry a stale arithmetic
statement once the two lineages are combined, and the combination
itself has not yet happened: the working tree is clean at `c5dd265`
with no merge in progress. Once `git merge origin/development` runs,
it will conflict in exactly three files, and one of the three hunks
(the arithmetic paragraph) cannot be resolved by picking either side
or mechanically unioning — it requires genuine re-derivation from the
real, merged section count.

## Solution Statement

Run the merge, then resolve each hunk according to its own shape:
the two purely-additive hunks in `plan-reviewer.md` (the new
`#### R-COH-*` section headers, and the illustrative `rubric[]` array
in the `review.jsonl` worked example) are resolved by keeping the
union of both sides verbatim; the third hunk (the rubric-length
arithmetic paragraph) is resolved by dynamically counting the actual
`#### R-COH-*` headings present in the merged file, subtracting the 4
known-conditional ones, and citing the resulting deterministic count
— never a number copied from either branch. `plan-writer.md`'s two
additive hunks are resolved the same union-first way.
`docs/decisions.md`'s append-only hunk is resolved by taking the
chronological union of both sides' entries. A new dated
`docs/decisions.md` entry then documents the merge's re-derived
arithmetic, explicitly naming which prior entries' numerals it
supersedes — mirroring the exact convention the 2026-07-26 and
2026-07-28 entries already established. The plan closes with a merge
commit and a clean `npm run validate` run. No test file is created,
updated, or deleted by any task in this plan — that remains the
test-writer/test-reviewer pair's job, run test-after, per this
project's `tdd: false` declaration and R-X strict.

## Metadata

| Key | Value |
|-----|-------|
| Type | Chore — merge conflict reconciliation |
| Complexity | Medium (multi-file, requires genuine arithmetic re-derivation; bounded scope, no new capability) |
| Systems Affected | `plan-reviewer` agent's R-COH-* coherence layer; `plan-writer` agent; `docs/decisions.md` audit trail; indirectly, the downstream test-writer/test-reviewer pair (out of this plan's scope) |
| Dependencies | `origin/development` (commit 89b7f76) must be fetchable; working tree clean at `c5dd265` with no merge in progress (stated precondition) |
| Estimated Tasks | 8 |
| Source PRD line ref | N/A — description mode (no source PRD) |
| phase_type | docs |

`phase_type: docs` — every file in `## Files to Change` below is a
`.md` file (this repository ships no runtime source; per
`docs/context/architecture.md`, "the plugin is prompt + config, not
code"), and every VALIDATE command in this plan is git/grep-based
content-invariant checking, not a `node:test` framework invocation —
matching the `docs` signal precisely and correctly triggering
`R-COH-VALIDATE-FRAMEWORK-MISMATCH`'s phase-type exemption branch.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/plan-reviewer.md` | 303-852 | The full "## The R-COH-* coherence layer" section — every `#### R-COH-*` check whose heading must survive the hunk-1 union (Task 2), and the "### Logging discipline" arithmetic paragraph requiring re-derivation (Task 3). |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1096-1180 | The `## review.jsonl format` section, including the worked JSON example whose `rubric[]` array is hunk 3 (Task 4). |
| P0 | `docs/decisions.md` | 1026-1153 | The most recent (2026-07-28) entry shipping `R-COH-VALIDATE-SEARCH-AMBIGUOUS` — HEAD's own current arithmetic state, and the exact recomputation-method + "supersedes" convention Task 3 and Task 7 replicate. |
| P0 | `docs/decisions.md` | 900-981 | The tail of the 2026-07-26 entry shipping `R-COH-ACTION-VALIDATE-CONTRADICTION` — a second, independent instance of the same recomputation method, confirming the convention is applied consistently across two prior shipments. |
| P1 | `scripts/validate/checks/figma-track-phase5.test.mjs` | 78-218 | Test-file docblock (not edited by this plan) documenting the "4-site update convention" and four prior real instances of this exact arithmetic-paragraph-rewrite situation — establishes this is a well-precedented class of change, not a novel one. |
| P1 | `scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs` | 311-406 | Pins the current (pre-merge) exact `#### R-COH-*` heading count (12 = 8 fixed + 4 conditional) that this merge changes to 13 — grounds why this plan derives the count dynamically rather than hardcoding it. |
| P1 | `docs/anti-patterns.md` | 15-21 | The test-weakening / R-X-strict carve-out — grounds why this plan authors zero test-file tasks. |
| P1 | `plugins/relay/agents/plan-writer.md` | 138-170 | Hard Constraints #12-#13 (`phase_scope: visual` task-purity + `phase_scope: logic` sentinel-resolution rules) — HEAD-only content (absent from `origin/development`, which is not on the Figma track) whose survival Task 5's strengthened VALIDATE checks as a canary against an accidental whole-file "theirs" resolution. |
| P2 | `scripts/validate/index.mjs` | 37-47 | Confirms `npm run validate`'s 9 checks do not parse the `#### R-COH-*` catalog — Task 8's gate is necessary but not sufficient for arithmetic correctness; see Risks. |
| P2 | `package.json` | 8-12 | The exact `npm run validate` script definition Task 8 invokes. |

## Patterns to Mirror

### P2M-1

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:810-838
The total `rubric[]` length per run is `8 (R1–R8) + 8 (deterministic
R-COH-*) + ≤5 (K=5 pass) = 16 to 21 rows` for a project where
`figma_track` is absent/`false` (the baseline case — unchanged from
before this section existed). When the target declares
`figma_track: true`, up to 2 additional conditional deterministic rows
(`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`) may also
appear, and — independently, on a plan whose `## Metadata` declares
`phase_scope` — exactly one of two mutually-exclusive 3rd conditional
deterministic rows may also appear: `R-COH-VISUAL-SCOPE-PURITY` (on
`phase_scope: visual`) or `R-COH-SENTINEL-RESOLUTION-MISSING` (on
`phase_scope: logic`), since a single plan's `phase_scope` cell
carries exactly one value and can never be both at once. Together
these widen the range to `16 to 24 rows` in the maximal case ... the
range never extends to a 25th row, because `R-COH-VISUAL-SCOPE-PURITY`
and `R-COH-SENTINEL-RESOLUTION-MISSING` can never both fire on the
same plan.
```

Task 3 copies this paragraph's SHAPE — same three-tier bound
derivation (baseline / +design / +phase_scope), same "never extends to
an Nth row" closing sentence — substituting the merged deterministic
count.

### P2M-2

```
# SOURCE: docs/decisions.md:1097-1113
**Rubric[] arithmetic shifts.** The `### Logging discipline`
paragraph in `plugins/relay/agents/plan-reviewer.md` is updated for 8
fixed deterministic checks (was 7): baseline (non-Figma)
`8 (R1–R8) + 8 (deterministic R-COH-*) + ≤5 (K=5 pass) = 16 to 21
rows` (was 15 to 20); maximal (two design rows plus exactly one of
the two mutually-exclusive `phase_scope` rows, plus the full 5-row
K=5 pass) = `16 to 24 rows` (was 15 to 23); the range never extends
to a 25th row (was 24th), because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` remain mutually exclusive. ...
**This entry's numerals supersede the "15 to 20 rows"/"15 to 23 rows"
numerals recorded in the [2026-07-26] entry above** (`docs/decisions.md`
[2026-07-26] "R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED
deterministic plan-reviewer check..."), which predates this shipment.
```

Task 3's arithmetic rewrite and Task 7's new decisions.md entry both
mirror this exact "state the old value, state the new value, name
which prior entry it supersedes" convention.

### P2M-3

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:1132-1157
{
  "timestamp": "2026-04-25T19:33:00Z",
  "verdict": "APPROVED",
  "rubric": [
    { "id": "R1", "passed": true },
    { "id": "R2", "passed": true },
    ...
    { "id": "R-COH-VALIDATE-ALWAYS-PASS", "passed": true },
    { "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true },
    { "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }
  ],
  "action": "final_flip",
  "user_message": ""
}
```

Task 4 mirrors this exact one-object-per-line JSON array shape when
adding origin's 3rd id to the union.

### P2M-4

```
# SOURCE: plugins/relay/agents/plan-writer.md:887-902
# WRONG — exits 0 whether or not the pattern is found:
grep -q "needle" file && echo "PASS" || echo "FAIL"
grep -n "\.claude/PRPs" file && echo "FOUND" || echo "PASS"

# RIGHT — anti-pattern must be ABSENT: exit 1 on any match.
if grep -nE "tdd-writer|/relay-tdd" plugins/relay/; then
  echo "FAIL: residual identifiers"; exit 1
else
  echo "PASS: none found"
fi

# RIGHT — positive presence: let the tool's status propagate,
# with set -e so a mid-block miss fails the whole block.
set -euo pipefail
grep -q "test-writer"   plugins/relay/agents/test-writer.md
grep -q "test-reviewer" plugins/relay/agents/test-reviewer.md
```

Every task's VALIDATE command in this plan mirrors the two RIGHT
shapes shown here — an explicit `if/then/else/exit 1`, or a bare
tool-status-propagating command under `set -euo pipefail`. Never the
WRONG `&&/||` echo idiom.

### P2M-5

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:441
#### R-COH-ACTION-VALIDATE-CONTRADICTION — a task's ACTION prose does not contradict that SAME task's own VALIDATE command
```

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:498
#### R-COH-VALIDATE-SEARCH-AMBIGUOUS — position-based search terms feeding an ordering comparison must be provably unique, or explicitly sentineled as first-match-intended
```

Task 2 preserves these two HEAD-authored headings verbatim,
character-for-character, when resolving hunk 1's union — plus
origin's `#### R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE` heading. Origin's
exact one-line description text after that heading is not visible
from this plan-writer's vantage point (no git access to the
`origin/development` ref) and must be taken verbatim from origin's own
diff content at merge time — Task 2's ACTION says this explicitly.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Resolve 3 merge-conflict hunks: union the additive `#### R-COH-*` section headers (Task 2), re-derive the rubric-length arithmetic paragraph from the merged section count (Task 3), and union the `review.jsonl` worked example's `rubric[]` array (Task 4). |
| `plugins/relay/agents/plan-writer.md` | UPDATE | Resolve 2 additive merge-conflict hunks by taking the union of both branches' content (Task 5). |
| `docs/decisions.md` | UPDATE | Resolve 1 append-only merge-conflict hunk by taking the chronological union of both branches' entries (Task 6), then append a new dated entry documenting this merge's re-derived arithmetic (Task 7). |

## NOT Building (Scope Limits)

- Does not create, update, or delete any `*.test.mjs` file. Test-suite
  reconciliation (the 4 files confirmed to assert `plan-reviewer.md`'s
  arithmetic, per Risks below) is the test-writer/test-reviewer pair's
  job, run test-after (`tdd: false`), per R-X strict
  (`docs/anti-patterns.md` lines 15-21;
  `docs/context/methodology.md`).
- Does not modify `scripts/validate/index.mjs` or any of its 9 check
  modules. None of them parse the `#### R-COH-*` catalog today
  (confirmed by direct inspection); adding such a check is a
  separate, future feature, not part of this reconciliation.
- Does not touch `plugins/relay/agents/code-reviewer.md`. That agent
  carries its own, separate R-COH-* catalog and arithmetic paragraph
  (a sibling system) — it is not one of this merge's 3 conflicted
  files and is unaffected by it.
- Does not resolve any conflict beyond the 3 named files. If
  `git merge` reports conflicts anywhere else, that is a precondition
  violation this plan does not anticipate — Task 1's VALIDATE
  surfaces it rather than silently proceeding.
- Does not push the merge commit or open a PR. Pillar 3
  (`/relay-commit` → `/relay-pr` → `/relay-approve`) remains a
  separately-triggered, human-initiated step per the interactivity
  boundary.

## Step-by-Step Tasks

### Task 1: Fetch `origin` and merge into `feature/figma-implementation-track`

- **ACTION**: From the repository root, run `git fetch origin`
  followed by `git merge origin/development`. The working tree is
  clean at commit `c5dd265` with no merge in progress, so this is
  expected to stop with conflicts in exactly three files:
  `plugins/relay/agents/plan-reviewer.md`,
  `plugins/relay/agents/plan-writer.md`, and `docs/decisions.md`. This
  task is infrastructural — it establishes the conflicted working-tree
  state Tasks 2-7 resolve; it decides no content itself. Serves:
  AC-A5 (infrastructure/scaffolding for the merge commit).
- **MIRROR**: P2M-4 — the VALIDATE below uses the "let the tool's own
  status propagate under `set -e`" idiom.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  actual=$(git diff --name-only --diff-filter=U | sort)
  expected=$(printf '%s\n' "docs/decisions.md" \
    "plugins/relay/agents/plan-reviewer.md" \
    "plugins/relay/agents/plan-writer.md" | sort)
  if [ "$actual" = "$expected" ]; then
    echo "PASS: exactly the 3 expected files are conflicted"
  else
    echo "FAIL: conflicted file set differs from expected."
    echo "Expected:"; echo "$expected"
    echo "Actual:";   echo "$actual"
    exit 1
  fi
  ```

### Task 2: Resolve `plan-reviewer.md`'s hunk 1 — union the additive `#### R-COH-*` section headers

- **ACTION**: Open `plugins/relay/agents/plan-reviewer.md`'s first
  conflict region (inside "## The R-COH-* coherence layer" /
  "### Deterministic checks"). Remove the `<<<<<<<` / `=======` /
  `>>>>>>>` markers and keep the UNION of both sides: HEAD's six
  sections — `#### R-COH-ACTION-VALIDATE-CONTRADICTION` and
  `#### R-COH-VALIDATE-SEARCH-AMBIGUOUS` (both already visible on
  HEAD; see P2M-5) plus HEAD's four conditional sections
  (`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`,
  `R-COH-VISUAL-SCOPE-PURITY`, `R-COH-SENTINEL-RESOLUTION-MISSING`) —
  and origin's one new section, `#### R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE`,
  taken verbatim from origin's side of the conflict (its exact body
  text is not visible from this plan; copy it as written). Do not
  drop, rename, or reorder any of the seven; do not invent content for
  the origin-only section beyond what its own hunk provides. Serves:
  AC-A1.
- **MIRROR**: P2M-5 (heading shape to preserve verbatim) and P2M-4
  (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f="plugins/relay/agents/plan-reviewer.md"
  if git grep -nE '^(<{7}|={7}|>{7})( |$)' -- "$f"; then
    echo "FAIL: conflict markers remain in $f"; exit 1
  fi
  grep -q '^#### R-COH-ACTION-VALIDATE-CONTRADICTION' "$f"
  grep -q '^#### R-COH-VALIDATE-SEARCH-AMBIGUOUS' "$f"
  grep -q '^#### R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE' "$f"
  echo "PASS: hunk 1 resolved — conflict markers gone; all 3 new deterministic check headings present"
  ```

### Task 3: Resolve `plan-reviewer.md`'s hunk 2 — re-derive the rubric-length arithmetic paragraph

- **ACTION**: In the same file's "### Logging discipline" section,
  remove the conflict markers around the "The total `rubric[]` length
  per run is ..." paragraph and REWRITE it from scratch (do not pick
  either side's stale text): count the actual `#### R-COH-*` section
  headings now present in the merged file (Task 2's output), subtract
  the 4 known-conditional ones, and cite the resulting deterministic
  count in the `8 (R1–R8) + N (deterministic R-COH-*)` clause. Apply
  the SAME three-tier derivation method P2M-1/P2M-2 already use
  (baseline = `8 + N` to `8 + N + 5`; + up to 2 for the design rows; +
  exactly 1 more for whichever single mutually-exclusive
  `phase_scope` row applies, never both) to recompute the maximal
  bound and the "never extends to an Nth row" closing sentence.
  Ensure the short numeric clause `8 (R1–R8) + N (deterministic
  R-COH-*)` is written so it sits contiguously on one physical line
  (do not let ordinary prose word-wrap split it across two lines) —
  this is what keeps the VALIDATE below able to match it. Serves:
  AC-A2.
- **MIRROR**: P2M-1 (paragraph shape to replicate), P2M-2 (precedent
  recomputation method), P2M-4 (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f="plugins/relay/agents/plan-reviewer.md"
  flat=$(tr '\n' ' ' < "$f")
  total=$(grep -c '^#### R-COH-' "$f")
  det=$((total - 4))
  base_min=$((8 + det))
  base_max=$((base_min + 5))
  maximal_max=$((base_max + 3))
  never_row=$((maximal_max + 1))
  if echo "$flat" | grep -qE '\+ *7 *\(deterministic|\+ *8 *\(deterministic'; then
    echo "FAIL: stale deterministic count (7 or 8) still present in the arithmetic paragraph"
    exit 1
  fi
  if ! echo "$flat" | grep -qE "\+ *${det} *\(deterministic"; then
    echo "FAIL: arithmetic paragraph does not cite ${det} deterministic checks (derived from ${total} total R-COH-* section headings minus the 4 known-conditional ones)"
    exit 1
  fi
  if ! echo "$flat" | grep -qE "${base_min} to ${base_max} rows"; then
    echo "FAIL: baseline row-bound '${base_min} to ${base_max} rows' not found — not recomputed from the merged deterministic count (${det})"
    exit 1
  fi
  if ! echo "$flat" | grep -qE "${base_min} to ${maximal_max} rows"; then
    echo "FAIL: maximal row-bound '${base_min} to ${maximal_max} rows' not found — not recomputed from the merged deterministic count (${det})"
    exit 1
  fi
  if ! echo "$flat" | grep -qE "${never_row}(st|nd|rd|th) row"; then
    echo "FAIL: 'never extends to a ${never_row}th row' claim not found or not recomputed"
    exit 1
  fi
  echo "PASS: arithmetic paragraph cites ${det} deterministic checks; baseline (${base_min}-${base_max}), maximal (${base_min}-${maximal_max}), and the ${never_row}th-row ceiling are all consistent with ${total} merged R-COH-* section headings"
  ```

### Task 4: Resolve `plan-reviewer.md`'s hunk 3 — union the `review.jsonl` worked-example `rubric[]` array

- **ACTION**: In the "## review.jsonl format" section's worked JSON
  example, remove the conflict markers around the `rubric` array and
  keep the union: HEAD's two new entries
  (`{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }`,
  `{ "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }`,
  already visible on HEAD; see P2M-3) plus origin's one new entry for
  `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE`, in the same one-object-per-line
  style as every other row in the array. Serves: AC-A1.
- **MIRROR**: P2M-3 (JSON array shape), P2M-4 (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f="plugins/relay/agents/plan-reviewer.md"
  if git grep -nE '^(<{7}|={7}|>{7})( |$)' -- "$f"; then
    echo "FAIL: conflict markers remain in $f"; exit 1
  fi
  grep -q '"R-COH-ACTION-VALIDATE-CONTRADICTION"' "$f"
  grep -q '"R-COH-VALIDATE-SEARCH-AMBIGUOUS"' "$f"
  grep -q '"R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE"' "$f"
  echo "PASS: hunk 3 resolved — conflict markers gone; all 3 new deterministic ids present in the review.jsonl worked example"
  ```

### Task 5: Resolve `plan-writer.md`'s two additive hunks

- **ACTION**: Open `plugins/relay/agents/plan-writer.md`'s two
  conflict regions. Their exact content is not visible from this
  plan-writer's vantage point (no git access to `origin/development`),
  but the description confirms both are "additive collisions of the
  same shape" as hunk 1 above — each side added new content in the
  same region and neither side's addition should be dropped. For each
  hunk, remove the conflict markers and keep the UNION of both sides'
  content verbatim, in the order each side presents it (HEAD's
  content first, then origin's, unless the surrounding prose implies
  a more natural ordering — e.g. a numbered list should stay
  correctly numbered). Do not delete or rewrite any existing
  unconflicted content in this file — in particular, HEAD's own
  pre-existing Hard Constraints #12 and #13 (the `phase_scope: visual`
  task-purity rule and the `phase_scope: logic` sentinel-resolution
  rule, naming `R-COH-VISUAL-SCOPE-PURITY` and
  `R-COH-SENTINEL-RESOLUTION-MISSING` respectively — neither is part
  of either conflicting hunk) MUST still be present, byte-for-byte,
  after resolution. Serves: AC-A4.
- **MIRROR**: P2M-5 (structural analogy — the same additive-union
  strategy Task 2 applies to `plan-reviewer.md`) and Task 2's own
  verification style (positive-presence check for named HEAD content,
  not just marker-absence), P2M-4 (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f="plugins/relay/agents/plan-writer.md"
  if git grep -nE '^(<{7}|={7}|>{7})( |$)' -- "$f"; then
    echo "FAIL: conflict markers remain in $f"; exit 1
  fi
  grep -q 'R-COH-VISUAL-SCOPE-PURITY' "$f"
  grep -q 'R-COH-SENTINEL-RESOLUTION-MISSING' "$f"
  echo "PASS: plan-writer.md's 2 additive hunks resolved — no conflict markers remain; HEAD's Hard Constraint #12/#13 content (phase_scope visual/logic) survives"
  ```

### Task 6: Resolve `docs/decisions.md`'s append-only hunk — chronological union

- **ACTION**: Open `docs/decisions.md`'s single conflict region near
  the end of the file. Remove the conflict markers and keep the UNION
  of both sides' appended `## [YYYY-MM-DD] ...` entries, ordered
  chronologically by their date (both sides only ever append, per the
  file's own documented convention — see the closing "Template for
  future entries" comment block already on HEAD). Do not delete,
  truncate, or reorder any existing entry from either side. Serves:
  AC-A3.
- **MIRROR**: P2M-2 (shows the well-formed entry shape/boundaries this
  union must preserve), P2M-4 (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f="docs/decisions.md"
  if git grep -nE '^(<{7}|={7}|>{7})( |$)' -- "$f"; then
    echo "FAIL: conflict markers remain in $f"; exit 1
  fi
  tail -n 15 "$f" | grep -q 'Template for future entries'
  echo "PASS: decisions.md conflict resolved — no markers remain; file still ends with the template comment"
  ```

### Task 7: Append a new `docs/decisions.md` entry documenting the re-derived arithmetic

- **ACTION**: Append one new entry to `docs/decisions.md`, immediately
  before the closing "Template for future entries" comment block,
  dated today (UTC), titled after this merge (e.g. "Merge
  `origin/development`: R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE joins the
  deterministic catalog; rubric[] arithmetic re-derived to 9
  deterministic"). Follow the exact Context / Decision / Reason /
  Areas affected shape every prior entry uses (see P2M-2), and
  explicitly state, in prose, which prior entries' numerals this one
  supersedes — naming the `[2026-07-26]` and `[2026-07-28]` entries by
  date, the same way the 2026-07-28 entry names the 2026-07-26 one.
  Cite Task 3's actual derived deterministic count (whatever it
  computed against the real merged file) rather than any number from
  this plan. Serves: AC-A7.
- **MIRROR**: P2M-2 (the exact convention being replicated), P2M-4
  (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  f="docs/decisions.md"
  today=$(date -u +%Y-%m-%d)
  if ! grep -q "^## \[${today}\]" "$f"; then
    echo "FAIL: no new dated decisions.md entry found for today (${today})"
    exit 1
  fi
  entry=$(sed -n "/^## \[${today}\]/,/^---\$/p" "$f")
  if ! printf '%s' "$entry" | grep -qi "supersede"; then
    echo "FAIL: new ${today} entry does not reference which prior entries' numerals it supersedes"
    exit 1
  fi
  echo "PASS: a new ${today} decisions.md entry exists and follows the supersede-convention"
  ```

### Task 8: Stage, commit the merge, and run `npm run validate`

- **ACTION**: Confirm no unresolved conflicts remain
  (`git diff --name-only --diff-filter=U` empty), `git add` the three
  resolved files plus the amended `docs/decisions.md`, then
  `git commit` to complete the merge (the default merge commit message
  is acceptable — do not use `--no-edit` to skip review of it, but do
  not hand-craft a novel message either). Finally run
  `npm run validate` from the repository root and confirm it exits
  cleanly. Serves: AC-A5.
- **MIRROR**: P2M-4 (VALIDATE idiom).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
    echo "FAIL: unresolved conflicts remain"; exit 1
  fi
  git rev-parse -q --verify HEAD^2 > /dev/null
  npm run validate
  ```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
if git grep -nE '^(<{7}|={7}|>{7})( |$)' -- '*.md'; then
  echo "FAIL: conflict markers remain in tracked markdown files"
  exit 1
fi
echo "PASS: no conflict markers remain in any tracked markdown file"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
f="plugins/relay/agents/plan-reviewer.md"
flat=$(tr '\n' ' ' < "$f")
total=$(grep -c '^#### R-COH-' "$f")
det=$((total - 4))
base_min=$((8 + det))
base_max=$((base_min + 5))
maximal_max=$((base_max + 3))
never_row=$((maximal_max + 1))
if echo "$flat" | grep -qE '\+ *7 *\(deterministic|\+ *8 *\(deterministic'; then
  echo "FAIL: stale deterministic count (7 or 8) still present"; exit 1
fi
if ! echo "$flat" | grep -qE "\+ *${det} *\(deterministic"; then
  echo "FAIL: arithmetic paragraph does not cite the merged deterministic count (${det})"; exit 1
fi
if ! echo "$flat" | grep -qE "${base_min} to ${base_max} rows"; then
  echo "FAIL: baseline row-bound '${base_min} to ${base_max} rows' not recomputed"; exit 1
fi
if ! echo "$flat" | grep -qE "${base_min} to ${maximal_max} rows"; then
  echo "FAIL: maximal row-bound '${base_min} to ${maximal_max} rows' not recomputed"; exit 1
fi
if ! echo "$flat" | grep -qE "${never_row}(st|nd|rd|th) row"; then
  echo "FAIL: 'never extends to a ${never_row}th row' claim not recomputed"; exit 1
fi
grep -q '^#### R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE' "$f"
grep -q '^#### R-COH-ACTION-VALIDATE-CONTRADICTION' "$f"
grep -q '^#### R-COH-VALIDATE-SEARCH-AMBIGUOUS' "$f"
grep -q '^#### R-COH-DESIGN-SOURCE-MISSING' "$f"
grep -q '^#### R-COH-DESIGN-GROUNDED' "$f"
grep -q '^#### R-COH-VISUAL-SCOPE-PURITY' "$f"
grep -q '^#### R-COH-SENTINEL-RESOLUTION-MISSING' "$f"
w="plugins/relay/agents/plan-writer.md"
grep -q 'R-COH-VISUAL-SCOPE-PURITY' "$w"
grep -q 'R-COH-SENTINEL-RESOLUTION-MISSING' "$w"
echo "PASS: all 3 newly-merged deterministic checks and all 4 conditional checks present; arithmetic (${det} deterministic, ${total} total, bounds ${base_min}-${base_max}/${base_min}-${maximal_max}/${never_row}th) is self-consistent; plan-writer.md's HEAD-only content survives"
```

**Level 3 — INTEGRATION / DRY-RUN END-TO-END**

```bash
set -euo pipefail
if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
  echo "FAIL: unresolved conflicts remain at integration time"; exit 1
fi
if ! git rev-parse -q --verify HEAD^2 > /dev/null; then
  echo "FAIL: HEAD is not a merge commit"; exit 1
fi
npm run validate
```

## Acceptance Criteria

- **AC-A1:** After the merge commit, `plugins/relay/agents/plan-reviewer.md`
  contains all 9 deterministic `#### R-COH-*` sections (the 6
  long-standing ones plus `R-COH-ACTION-VALIDATE-CONTRADICTION`,
  `R-COH-VALIDATE-SEARCH-AMBIGUOUS`, and
  `R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE`) and all 4 conditional
  sections (`R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`,
  `R-COH-VISUAL-SCOPE-PURITY`, `R-COH-SENTINEL-RESOLUTION-MISSING`),
  including in the `## review.jsonl format` worked example, with zero
  git conflict markers remaining anywhere in the file.
- **AC-A2:** The "### Logging discipline" rubric-length arithmetic
  paragraph cites a deterministic-check count that is dynamically
  consistent with the actual number of `#### R-COH-*` deterministic
  section headings present in the merged file — re-derived from the
  real merged content, not copied from either pre-merge branch.
- **AC-A3:** `docs/decisions.md` contains the union of both branches'
  appended entries in chronological order, with no conflict markers
  and no entry lost from either side.
- **AC-A4:** `plugins/relay/agents/plan-writer.md` has both additive
  hunks resolved as the union of both branches' content, with no
  conflict markers remaining.
- **AC-A5:** The repository has a merge commit at HEAD with two
  parents (the pre-merge `feature/figma-implementation-track` tip and
  `origin/development`), and `npm run validate` exits 0 against the
  merged tree.
- **AC-A6:** No test file (`*.test.mjs` or otherwise) is created,
  modified, or deleted by any task in this plan — test-suite updates
  remain the test-writer/test-reviewer pair's responsibility, run
  test-after per this project's `tdd: false` methodology declaration.
- **AC-A7:** A new `docs/decisions.md` entry, dated the day this plan
  is implemented, records the merge's re-derived arithmetic and
  explicitly names which prior entries' numerals it supersedes.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The exact content of origin/development's 2 plan-writer.md hunks and its 1 new review.jsonl-array entry cannot be verified from the plan-writer's vantage point (no git access to the origin ref). | Medium | Low — the resolution strategy (union) is unambiguous regardless of exact placement | Tasks 4 and 5 instruct the Implementer (who has real Bash/git access at execution time) to read the actual conflict markers and apply the general additive-union strategy; their VALIDATE commands check structural invariants (conflict-marker absence, named-check presence), not pre-assumed exact content. |
| `npm run validate`'s 9 checks do not parse or cross-validate the R-COH-* catalog (confirmed by direct inspection of `scripts/validate/index.mjs`) — a "9/9" pass does not by itself prove the arithmetic re-derivation is correct. | High (confirmed, not hypothetical) | Low | Documented here explicitly so the Implementer and reviewer do not over-trust the "9/9" signal as end-to-end proof; Task 3's own dynamic count-check is the actual arithmetic-correctness gate within this plan's scope. |
| Of the five test files named in the task description as asserting "the arithmetic wording verbatim," research independently found one (`figma-track-ac2-reuse-enforcement.test.mjs`) actually asserts a different, unrelated file's arithmetic — `code-reviewer.md`'s own separate R-COH-* catalog, not `plan-reviewer.md`'s. `code-reviewer.md` is not one of this merge's 3 conflicted files. | Confirmed (scope correction, not a traditional risk) | Low | Noted here so the downstream test pair does not unnecessarily touch `figma-track-ac2-reuse-enforcement.test.mjs` when resolving THIS merge; the other 4 named files (`figma-track-phase5.test.mjs`, `figma-visual-first-track-phase3.test.mjs`, `figma-visual-first-track-phase4.test.mjs`, `plan-reviewer-action-validate-contradiction-check.test.mjs`) do directly assert `plan-reviewer.md` content and will need the pair's `EXISTING_TEST_UPDATED` follow-up. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value
  of `tdd` in `docs/context/methodology.md`: **false**. Test-after
  ordering — when a test framework is declared, the test pair
  (test-writer/test-reviewer) authors and maintains the suite from the
  Acceptance Criteria above, after the Implementer + Code Review; with
  no framework declared, no tests are authored.
- **R8b does not apply in description mode** — no `(PRD AC-N)` token
  is present on any AC-A item above; every item is derived from the
  observable behaviors named in the `## Source` text.
- **Future-improvement observation, explicitly out of scope for this
  plan:** external research (Single Source of Truth / derived-state
  anti-pattern framing) suggests the deeper fix for this recurring
  class of merge conflict is to stop hand-maintaining the
  rubric-length arithmetic as prose and instead generate it — a
  `npm run validate` check (or a small script) that counts
  `#### R-COH-*` headings and renders the sentence, so no future
  three-way merge can produce three independently-stale numbers
  again. This plan does not build that; it only performs the
  one-time reconciliation the current merge requires. See
  `scripts/validate/index.mjs:37-47` (Mandatory Reading) for
  confirmation that no such check exists today.
- Research (`relay:research-web`) found no established tooling that
  validates a prose arithmetic claim against a live marker count in
  the same file, and no named anti-pattern for hand-maintained
  arithmetic/rubric summary lines specifically (nearest terminology —
  Single Source of Truth, derived state — comes from state-management
  and code-duplication contexts, not prose). This gap is recorded
  rather than papered over.
- All eight tasks in this plan touch only `.md` files and run only
  `git`/`grep`/`npm` commands — consistent with `phase_type: docs`
  and with this repository having no runtime source to compile or
  unit-test (`docs/context/architecture.md`).

*Generated: 2026-07-28*
*Approved: 2026-07-28*
*Implemented: 2026-07-28*
*Status: IMPLEMENTED*
