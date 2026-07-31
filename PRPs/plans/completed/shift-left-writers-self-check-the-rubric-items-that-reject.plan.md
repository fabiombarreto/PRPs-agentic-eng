# Feature: Shift-left writer self-checks (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting patterns; impact on reusable services (three writer agents plus the validation suite; changes what every downstream plan, diff, and test suite must satisfy before emission)
- Decisions found:
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves — the no-short-circuit invariant requires every rubric item to be evaluated and recorded. This plan modifies no reviewer, adds no rubric row, and changes no rubric[] arithmetic; the invariant holds by construction.
  - [2026-04-28] code-reviewer gains Task + AC-10 of implementation-authoring.prd.md evolves — same invariant on the code-review side, likewise untouched.
  - [2026-05-06] TDD pair is the authorized mechanism for creating test files (R-X strict preserved) — load-bearing here: 15 files under scripts/validate/checks/*.test.mjs assert content of the agents this plan edits. Any trim that breaks an assertion needs an EXISTING_TEST_UPDATED from the test pair, never an Implementer edit. This plan avoids the situation instead of routing around it (Task 2).
  - [2026-07-30] Writers consume prior_feedback (v0.23.1) — the targeted-revision path must keep working, and the new self-check must be reachable from it as well as from first authoring.
  - [2026-04-19] Command surface: writer and reviewer split — this plan changes only the writer half.
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the auto-correction loop turn green" — the trim in Task 2 must never delete agent text merely because a test asserts it. The trim target was chosen by verifying zero assertions corpus-wide, not by removing an inconvenient assertion.
  - "Writing pipeline artifacts under .claude/" — this plan writes only under plugins/relay/, scripts/validate/, and docs/.
  - "Asking the user to confirm anything" — every self-check runs without dialogue; the interactivity boundary is preserved.
- Applicable architectural rules:
  - Interactivity boundary: writers run autonomously past PRD-APPROVED.
  - Writer/reviewer split: a writer-side self-check front-runs the reviewer's independent validation and never replaces it.
- Result: PROCEED
```

## Source

Shift-left: writers self-check the rubric items that reject them, before emitting.

MEASURED PROBLEM (this repo's own audit logs, PRPs/plans/*.jsonl, re-aggregated 2026-07-30 after the v0.23.1 cut): plan-review runs 1.68 times per artifact (78 artifacts / 131 runs) and 50% of plans fail their FIRST review; code-review runs 1.49 (67/100, 34% first-attempt failure); test-write-review runs 3.50 (12/42, 33%). The v0.23.1 feedback-pipe fix cannot touch these numbers by construction: `prior_feedback` is null on attempt 1, so it only reduces the cost of attempts 2 and later. The first-attempt failure rate has a different cause — every writer is graded against rubric items its own protocol never mentions. Verified by grep: of the six checks that cause 73% of plan rejections, `plan-writer.md` names only one; `implementer.md` names ZERO of the three that cause 80% of code rejections (`R-SEM` alone appears 24 times in code-reviewer.md and 0 times in implementer.md).

The failure distribution is concentrated enough to act on. plan-writer, of 97 recorded rubric failures: R-COH-TASK-AC-MISSING 24 (25%), R-COH-OTHER-INTERNAL-CONTRADICTION 13 (13%), R-COH-AC-TASK-DECOUPLED 12 (12%), R-COH-PATTERN-TASK-DRIFT 9 (9%), R-COH-MANDATORY-READING-IRRELEVANT 7 (7%), R8 6 (6%) — together 73%. implementer, of 44: R-COH-OTHER-INTERNAL-CONTRADICTION 17 (39%), R-SEM 10 (23%), R-COH-COMMENT-MISMATCH 8 (18%) — together 80%. test-writer, of 10: R-AC-COVERAGE 5 (50%).

INTENDED CHANGE: give each of the three writer agents a short pre-emission self-check covering exactly the concentrated defect classes above, executed as the last step before the artifact is written. Each item must be phrased as an AUTHORING RULE the writer applies while composing (for example "every task names at least one AC-A<i> it satisfies"), never as a restatement of the reviewer's rubric text — the writer must not be able to satisfy the check by pattern-matching the reviewer's wording instead of producing a coherent artifact.

DESIGN CONSTRAINT: plan-writer.md is already about 1250 lines. A change that only adds text worsens the prompt-bloat problem this efficiency initiative also exists to solve, and long prompts dilute the instructions that matter. Target a net-neutral or net-negative line count for each edited agent by removing redundancy discovered in the same pass — duplicated statements of the same rule, over-long rationale, and guidance already carried by another section.

INVARIANTS THAT MUST NOT BREAK: no rubric item is added, removed, reworded or reweighted; no reviewer agent file is modified (plan-reviewer.md, code-reviewer.md, code-reviewer-semantic.md, test-reviewer.md stay byte-identical); the .jsonl no-short-circuit audit guarantee is untouched; the universal R-X test-modification guard is untouched; the interactivity boundary holds — every self-check runs without user dialogue; the v0.23.1 `prior_feedback` targeted-revision protocol keeps working, and the self-check must also run on a revision attempt, not only on first authoring.

## Summary

This phase gives `plan-writer`, `implementer`, and `test-writer` a named pre-emission self-check covering the concentrated defect classes that actually reject them, placed at each agent's terminal write/emit boundary so it is reached from both the first-authoring path and the v0.23.1 `## Targeted revision mode` path without being written twice. The idiom is not invented: `test-writer` already ships the repo's only self-check — the lifecycle-ledger completeness check — framed as front-running, never replacing, the reviewer's independent validation; the two new checks mirror it and the third extends it. Items are phrased as authoring rules naming a concrete artifact property, never as restatements of reviewer rubric text, because visible grader wording measurably invites literal compliance over real quality. To keep the added instructions from diluting the ones already there, the same pass removes one genuinely redundant rule statement whose text was verified unasserted by any of the 34 test files in the validation corpus. A `feedback-chain` extension turns all of it into a permanent gate.

## User Story

As a developer running `/relay-execute`,
I want each writer to catch the handful of defect classes that actually get it rejected before it emits,
So that half of my plans stop failing their first review and the pipeline stops paying a full writer plus reviewer round trip for defects the writer could have seen itself.

## Problem Statement

Every relay writer is graded against rubric items its own protocol never mentions. Of the six checks causing 73% of the 97 recorded plan-review failures, `plan-writer.md` names one; of the three causing 80% of the 44 code-review failures, `implementer.md` names none — `R-SEM` appears 24 times in `code-reviewer.md` and zero times in `implementer.md`. The result is a 50% first-attempt failure rate on plans and 34% on implementations, each failure costing a full writer plus reviewer round trip. The v0.23.1 feedback pipe cannot help: `prior_feedback` is null on attempt 1, so it reduces only the cost of later attempts, never the rate of the first failure. The defect distribution is concentrated rather than diffuse, which is what makes a short, targeted check plausible where a generic "review your work" instruction would not be.

## Solution Statement

Add one named self-check per writer at the point where its authoring path and its revision path converge on the terminal write — `plan-writer`'s Step 4.5/Phase 5 boundary, `implementer`'s Phase 4 emission, `test-writer`'s existing pre-Step-3.1 check. Each check lists only the concentrated defect classes for that agent, each item stating a property the artifact must have (a task names an AC it satisfies; a comment describes what the code now does) rather than quoting the rubric that will test it, and each check closes with the same framing `test-writer` already uses: the reviewer re-runs its full rubric independently, so this is front-running, not a substitute. `implementer`'s check is placed inside Phase 4 without adding a third `### Phase 4.` heading, because a corpus test asserts that count is exactly two. Net line growth is offset by collapsing the exit-code rule's third redundant statement, whose text carries zero assertions across all 34 corpus test files. `feedback-chain.mjs` gains the assertions that keep every one of these properties true.

## Metadata

| Field | Value |
|-------|-------|
| Type | Prompt-contract change (writer half of three writer/reviewer pairs) + validation-suite extension |
| Complexity | Medium — 3 agent files, 1 checker, 1 decisions entry; additive plus one verified-safe trim |
| Systems Affected | `plan-writer`, `implementer`, `test-writer` agents; `scripts/validate/checks/feedback-chain.mjs`; no reviewer, no command |
| Dependencies | v0.23.1 `## Targeted revision mode` sections must exist in all three agents (shipped commit `0b9ed06`) |
| Estimated Tasks | 6 |
| Source | Description mode — no source PRD (see `## Source`) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/test-writer.md` | 401-411 | The repo's ONLY existing self-check and the idiom all three must share: named, immediately before the terminal write, explicitly front-running the reviewer's independent re-validation rather than replacing it. |
| P0 | `plugins/relay/agents/plan-writer.md` | 71-110, 1081-1104 | The `## Targeted revision mode` section (which exits straight to Phase 5) and the Step 4.5/Phase 5 boundary — the convergence point where one self-check covers both entry paths. |
| P0 | `plugins/relay/agents/implementer.md` | 560-576 | The `Discipline reminders for emitting TEST_CONTRACT_DISPUTE` block — an authoring-rule-shaped list already in this file, the local precedent for the new check's phrasing. |
| P0 | `scripts/validate/checks/feedback-chain.mjs` | 74-150 | The `slice()` helper and the `PLAN_WRITER_INVARIANTS` array (starting line 84) — Task 5 extends this exact structure rather than adding a new check module. |
| P0 | `scripts/validate/checks/figma-track-ac2-reuse-enforcement.test.mjs` | 199-205 | Asserts `implementer.md` has EXACTLY two `### Phase 4.` headings. Task 3 must not add a third; this is why the implementer check is a sub-block, not a phase. |
| P1 | `docs/anti-patterns.md` | 15-21 | The test-weakening prohibition — bounds Task 2: a trim target is chosen by verifying zero assertions, never by removing an assertion that is in the way. |
| P1 | `docs/decisions.md` | 421-433 | The [2026-05-06] R-X-strict entry — why a trim that breaks a corpus test becomes test-pair work rather than Implementer work. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/test-writer.md:401-411
Before proceeding to Step 3.1, run the **lifecycle-ledger
completeness self-check**: confirm every UPDATE and every DELETE
performed this session (across all outcomes above) has a matching
lifecycle-ledger entry — classification + justification — that
Step 3.1 will record. If any UPDATE/DELETE is missing its ledger
entry, treat this as a self-detected defect: do NOT write a
manifest with an incomplete ledger; add the missing entry first.
(This mirrors AC-9 of the source PRD; `test-reviewer`'s
`R-LIFECYCLE-LEGITIMATE` independently re-verifies the same
completeness property — this self-check does not replace that
independent validation, it front-runs it.)
```
Tasks 1, 3 and 4 copy this exact shape: a bolded name, placement immediately before the terminal write, a self-detected-defect instruction, and the closing "front-runs it, does not replace it" framing that keeps the writer from treating its own check as authoritative.

```
# SOURCE: plugins/relay/agents/implementer.md:560
Discipline reminders for emitting `TEST_CONTRACT_DISPUTE`:
```
Task 3 mirrors this label-plus-bullets shape for the implementer's own check, so the new block reads as an existing kind of thing in that file rather than a foreign import — and, being a bolded label rather than a heading, it does not disturb the `### Phase 4.` heading count Task 3's VALIDATE guards.

```
# SOURCE: plugins/relay/agents/plan-writer.md:1081
### Step 4.5 — Write the file
```
Task 1 attaches the plan-writer self-check immediately before this step. Both the first-authoring path (Phases 0-4) and `## Targeted revision mode` (which ends "Then proceed directly to Phase 5") pass through this boundary, so a single placement satisfies the requirement that the check run on revisions too.

```
# SOURCE: scripts/validate/checks/feedback-chain.mjs:84-90
/**
 * plan-writer carries three invariants the generic PAIRS loop cannot express.
 * Each returns an error string when violated, or null when satisfied.
 *
 * @type {Array<{ id: string, check: (content: string) => string | null }>}
 */
const PLAN_WRITER_INVARIANTS = [
```
Task 5 extends this array and adds a sibling per-agent array, reusing the existing `slice()` helper and the `{ id, check }` contract rather than introducing a second checker module.

```
# SOURCE: plugins/relay/agents/plan-writer.md:1176-1177
- **Skipping the Decision Gate.** The fenced block is mandatory.
  Missing it is a template conformance failure; rubric R1 will fail.
```
Task 2 collapses the `Cosmetic validation gates` bullet to exactly this shape: a bolded name, the rule in one clause, and the consequence or the pointer — two lines, no worked example, because the example already lives in Step 4.4 item 11.

```
# SOURCE: docs/decisions.md:1254-1263
<!-- Template for future entries:

## [YYYY-MM-DD] Title of the decision

**Context:** Why this decision was needed.
**Decision:** What was decided.
**Reason:** Why this option was chosen over alternatives.
**Areas affected:** [list domain areas]

-->
```
Task 6 copies this four-field structure verbatim for its new dated entry. This is the file's own canonical entry template, so the format anchor is the template itself rather than any one historical entry.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/plan-writer.md` | UPDATE | Add the pre-emission self-check at the Step 4.5 boundary (Task 1); remove the verified-unasserted third statement of the exit-code rule to hold the line budget (Task 2). |
| `plugins/relay/agents/implementer.md` | UPDATE | Add the Phase 4 pre-emission self-check as a labelled block, not a `### Phase 4.` heading (Task 3). |
| `plugins/relay/agents/test-writer.md` | UPDATE | Extend the existing lifecycle-ledger self-check with the AC-coverage item rather than adding a second, competing self-check (Task 4). |
| `scripts/validate/checks/feedback-chain.mjs` | UPDATE | Gate every property this plan establishes, including the implementer heading-count constraint (Task 5). |
| `docs/decisions.md` | UPDATE | Record the contract change and the rubric-restatement prohibition, per the repo's convention for deliberate contract evolutions (Task 6). |

## NOT Building (Scope Limits)

- **Any reviewer-side change.** No rubric item is added, removed, reworded or reweighted; `plan-reviewer.md`, `code-reviewer.md`, `code-reviewer-semantic.md` and `test-reviewer.md` stay byte-identical. The self-checks front-run the rubric; they never become it.
- **A general prompt-compression pass.** Only one specific redundancy is collapsed, chosen because a corpus-wide grep proved it unasserted. The broader three-tier duplication in `plan-writer.md` (Hard constraints / Step 4.4 / Anti-patterns) is real but largely test-pinned, and reworking it is its own scoped effort.
- **Editing any `*.test.mjs` file.** R-X strict — the Implementer authors zero test files. The trim in Task 2 is bounded precisely so no existing assertion breaks; had it broken one, the fix would route through the test pair as `EXISTING_TEST_UPDATED`.
- **Complexity routing (`express`/`standard`/`full` tracks).** Wave 3 of the efficiency initiative; unrelated surface.
- **Unit tests for the new `feedback-chain` assertions.** Test-pair work under `tdd: false`; the existing `feedback-chain.test.mjs` gap is already recorded in `docs/context/constraints.md`.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/agents/plan-writer.md` — pre-emission self-check

**ACTION**: Insert a new `### Step 4.4.ter — Pre-emission self-check` immediately before `### Step 4.5 — Write the file`, mirroring the test-writer idiom: a bolded name, a short numbered list, a self-detected-defect instruction, and the closing "front-runs, does not replace" sentence naming `plan-reviewer`. The items cover the six concentrated classes but are stated as artifact properties, never as rubric text: (1) every task under `## Step-by-Step Tasks` names at least one `AC-A<i>` it satisfies, and every `AC-A<i>` is named by at least one task; (2) no two sections state contradictory facts about the same file, count, or path — re-read `## Summary`, `## Metadata` and `## Files to Change` against the task list; (3) every `**MIRROR**` line points at a `# SOURCE:` anchor that exists in this plan's own `## Patterns to Mirror`; (4) every `## Mandatory Reading` row is a file a reader of THIS phase must open, not general background. State explicitly that this step runs on every emission, including a `prior_feedback` revision, because `## Targeted revision mode` exits through Phase 5.

**MIRROR**: The `# SOURCE: plugins/relay/agents/test-writer.md:401-411` snippet (idiom) and the `# SOURCE: plugins/relay/agents/plan-writer.md:1081` snippet (placement).

**ADDRESSES**: AC-A1, AC-A2, AC-A7

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/plan-writer.md
grep -q '^### Step 4.4.ter — Pre-emission self-check' "$f"
# the check must sit BEFORE the write step, or it is not pre-emission
a=$(grep -n '^### Step 4.4.ter' "$f" | cut -d: -f1)
b=$(grep -n '^### Step 4.5 — Write the file' "$f" | cut -d: -f1)
if [ "$a" -ge "$b" ]; then echo "FAIL: self-check at line $a is not before the write step at $b"; exit 1; fi
# it must front-run rather than replace the reviewer
grep -q 'front-run' "$f"
echo "PASS: pre-emission self-check present at line $a, before the write at $b"
```

### Task 2: UPDATE `plugins/relay/agents/plan-writer.md` — collapse the redundant exit-code statement

**ACTION**: The exit-code rule ("a command that prints FAIL but exits 0 is a cosmetic gate") is stated three times: Hard Constraint #11, Step 4.4 item 11's `Wrong vs right` block, and the `## Anti-patterns` bullet **Cosmetic validation gates**. A corpus-wide grep over all 34 `scripts/validate/checks/*.test.mjs` files confirms zero assertions on any of these three texts. Collapse the `## Anti-patterns` bullet to a one-line cross-reference pointing at Step 4.4 item 11, keeping Hard Constraint #11 and the Step 4.4 block intact. Do NOT touch the adjacent diff-scope / prohibition-idiom material in any of the three locations — `rubric-reconciliation.test.mjs` asserts substrings from all three of those independently.

**MIRROR**: The `# SOURCE: plugins/relay/agents/plan-writer.md:1176-1177` snippet — the compact two-line Anti-patterns bullet shape (bolded name, rule in one clause, consequence or pointer, no worked example) that the collapsed `Cosmetic validation gates` bullet must match.

**ADDRESSES**: AC-A5, AC-A6, AC-A7

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/plan-writer.md
# This repo's working tree is CRLF. A phrase that spans a line break only
# matches after stripping CR and collapsing whitespace - a plain grep for
# such a phrase is an always-fail gate. Mirrors what the corpus tests do.
c=$(tr -d '\r' < "$f" | tr '\n' ' ' | tr -s ' ')
# (a) the protected diff-scope triad must survive in all three locations
for p in 'See Step 4.4 item 11 for the full wrong' \
         'false-positives on pre-existing prose' \
         'Unscoped or prohibition-blind forbidden-reference greps'; do
  case "$c" in *"$p"*) ;; *) echo "FAIL: protected text lost: $p"; exit 1;; esac
done
# (b) the trim actually happened - this phrase is unique to the removed body
case "$c" in *'can never fail the'*) echo "FAIL: Anti-patterns bullet not collapsed"; exit 1;; esac
# (c) the corpus test pinning the triad must stay green
node --test scripts/validate/checks/rubric-reconciliation.test.mjs >/dev/null
echo "PASS: triad intact, redundant bullet collapsed, rubric-reconciliation green"
```

### Task 3: UPDATE `plugins/relay/agents/implementer.md` — pre-emission self-check

**ACTION**: Inside `## Phase 4`, immediately before the verdict is emitted, add a bolded labelled block **Pre-emission self-check** (a label, NOT a `###` heading — `figma-track-ac2-reuse-enforcement.test.mjs` asserts this file has exactly two `### Phase 4.` headings). Items, as artifact properties: (1) no two edits in this diff assert contradictory things about the same symbol, path, or count — re-read the diff end to end before emitting; (2) every changed line still does what the plan's task said it would, and no task was silently widened or skipped; (3) every comment touched or added describes what the code now does, not what it used to do. Close with the same front-running sentence naming `code-reviewer`. State that it runs on every attempt, including a `prior_feedback` revision.

**MIRROR**: The `# SOURCE: plugins/relay/agents/implementer.md:560` snippet (label-plus-bullets shape, heading-count-safe) and the `# SOURCE: plugins/relay/agents/test-writer.md:401-411` snippet (front-running framing).

**ADDRESSES**: AC-A3, AC-A2, AC-A7

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/implementer.md
grep -q 'Pre-emission self-check' "$f"
n=$(grep -c '^### Phase 4\.' "$f")
if [ "$n" -ne 2 ]; then echo "FAIL: expected exactly 2 '### Phase 4.' headings, found $n"; exit 1; fi
node --test scripts/validate/checks/figma-track-ac2-reuse-enforcement.test.mjs >/dev/null
echo "PASS: self-check added, Phase 4 heading count still 2, corpus test green"
```

### Task 4: UPDATE `plugins/relay/agents/test-writer.md` — extend the existing self-check

**ACTION**: Extend the existing **lifecycle-ledger completeness self-check** (lines 401-411) into a two-item check rather than adding a second competing block: keep the ledger item verbatim, and add an AC-coverage item stating that every in-scope PRD `AC-N` has an explicit recorded outcome — a written test, a documented `EXISTING_TEST_COVERS path:line`, or a lifecycle entry — with no AC left unaddressed. Rename the block to **pre-emission self-check** while preserving the ledger sentence word for word, and extend the closing parenthetical so it names both `R-LIFECYCLE-LEGITIMATE` and `R-AC-COVERAGE` as the checks that independently re-verify.

**MIRROR**: The `# SOURCE: plugins/relay/agents/test-writer.md:401-411` snippet — this task edits that exact block, preserving its ledger sentence and its front-running framing.

**ADDRESSES**: AC-A4, AC-A2, AC-A7

**VALIDATE**:
```bash
set -euo pipefail
f=plugins/relay/agents/test-writer.md
grep -q 'pre-emission self-check' "$f"
grep -q 'R-LIFECYCLE-LEGITIMATE' "$f"
grep -q 'R-AC-COVERAGE' "$f"
# the original ledger sentence must survive word for word
grep -q 'confirm every UPDATE and every DELETE' "$f"
# both ids must sit in the SAME closing parenthetical, proving one extended
# block rather than two competing ones (CRLF-safe collapse, see Task 2)
c=$(tr -d '\r' < "$f" | tr '\n' ' ' | tr -s ' ')
case "$c" in
  *'R-LIFECYCLE-LEGITIMATE'*'R-AC-COVERAGE'*) ;;
  *) echo "FAIL: the two rubric ids are not in one shared closing parenthetical"; exit 1;;
esac
echo "PASS: single extended self-check, ledger sentence preserved, both rubric ids named"
```

### Task 5: UPDATE `scripts/validate/checks/feedback-chain.mjs` — gate the self-checks

**ACTION**: Extend the module so the properties this plan establishes cannot silently regress. Add a `SELF_CHECKS` registry naming, per agent, the marker its self-check must carry, and assert: each of the three agents carries its self-check marker; `plan-writer`'s appears at a line number lower than `### Step 4.5 — Write the file` (pre-emission, not post-emission); `implementer.md` has exactly two `### Phase 4.` headings; `test-writer.md` retains the original ledger sentence; and — the AC-A2 gate — no item line inside any of the three self-check blocks contains a rubric token matching `R-[A-Z][A-Z-]+`, while each block's closing front-running sentence is exempt and must name its reviewer. Item lines are those beginning with a digit-dot or a dash inside the block; the closing sentence is the block's final parenthetical or sentence naming the reviewer. Reuse the existing `slice()` helper and the `{ id, check }` contract of `PLAN_WRITER_INVARIANTS`; do not add a second check module. Update the module docstring to describe the widened scope.

**MIRROR**: The `# SOURCE: scripts/validate/checks/feedback-chain.mjs:84-90` snippet — the `PLAN_WRITER_INVARIANTS` array shape and its `{ id, check }` contract.

**ADDRESSES**: AC-A8, AC-A1, AC-A2, AC-A3, AC-A4

**VALIDATE**:
```bash
set -euo pipefail
m=scripts/validate/checks/feedback-chain.mjs
grep -q 'SELF_CHECKS' "$m"
# the AC-A2 gate must exist in the checker, not merely be described in prose
grep -qE 'R-\[A-Z\]' "$m"
npm run validate >/dev/null
echo "PASS: feedback-chain extended with the AC-A2 item-line gate; static suite green"
```

### Task 6: UPDATE `docs/decisions.md` — record the contract

**ACTION**: Append a dated entry `## [2026-07-30] Writer pre-emission self-checks: authoring rules, never rubric restatement` in the file's four-field format. Context cites the 50% and 34% first-attempt failure rates, the concentration of causes, and why v0.23.1 cannot address them. Decision states the three self-checks, their shared placement rule (the convergence point of the authoring and revision paths), and the binding prohibition on phrasing an item as the reviewer's own rubric wording — with the reason that visible grader text invites literal compliance over real quality. Reason explains the front-running framing: the reviewer's full rubric still runs independently every attempt. Areas affected lists the three agents, the checker, and explicitly excludes every reviewer file.

**MIRROR**: The `# SOURCE: docs/decisions.md:1254-1263` snippet — the file's own canonical four-field entry template (Context / Decision / Reason / Areas affected). Copy that structure verbatim.

**ADDRESSES**: AC-A9

**VALIDATE**:
```bash
set -euo pipefail
grep -q '^## \[2026-07-30\] Writer pre-emission self-checks' docs/decisions.md
grep -q 'never rubric restatement' docs/decisions.md
echo "PASS: decisions.md records the entry and the phrasing prohibition"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
for f in plugins/relay/agents/plan-writer.md \
         plugins/relay/agents/implementer.md \
         plugins/relay/agents/test-writer.md; do
  head -n 1 "$f" | grep -qx -- '---' || { echo "FAIL: $f lost its frontmatter opener"; exit 1; }
done
node --check scripts/validate/checks/feedback-chain.mjs
echo "PASS: frontmatter intact on all three agents; checker parses"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
fail=0
# (a) all three writers carry a self-check
grep -q '^### Step 4.4.ter — Pre-emission self-check' plugins/relay/agents/plan-writer.md || { echo "FAIL: plan-writer"; fail=1; }
grep -q 'Pre-emission self-check' plugins/relay/agents/implementer.md || { echo "FAIL: implementer"; fail=1; }
grep -q 'pre-emission self-check' plugins/relay/agents/test-writer.md || { echo "FAIL: test-writer"; fail=1; }
# (b) no reviewer file touched
for f in plugins/relay/agents/plan-reviewer.md plugins/relay/agents/code-reviewer.md \
         plugins/relay/agents/code-reviewer-semantic.md plugins/relay/agents/test-reviewer.md; do
  if ! git diff --quiet -- "$f"; then echo "FAIL: reviewer $f modified — out of scope"; fail=1; fi
done
# (c) per-agent line ceiling (AC-A5 as relaxed 2026-07-30: <=2% over baseline)
for pair in "plugins/relay/agents/plan-writer.md:1287" \
            "plugins/relay/agents/implementer.md:823" \
            "plugins/relay/agents/test-writer.md:587"; do
  f="${pair%%:*}"; cap="${pair##*:}"; now=$(wc -l < "$f")
  if [ "$now" -gt "$cap" ]; then echo "FAIL: $f is $now lines, ceiling is $cap"; fail=1; fi
done
[ "$fail" -eq 0 ] || exit 1
echo "PASS: three self-checks present, reviewers untouched, line budget held"
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
# the whole corpus that asserts these agents must stay green - this is the R-X boundary:
# a failure here means the trim needs the test pair, not an Implementer edit.
node --test scripts/validate/checks/*.test.mjs
# npm run validate EXECUTES the feedback-chain gates against the real files -
# this is where AC-A2's item-line rule is actually enforced, not merely declared.
npm run validate
echo "PASS: full corpus green, static suite green, AC-A2 item-line gate executed"
```

## Acceptance Criteria

> **R8b does not apply in description mode — no `(PRD AC-N)` token required.** This plan was generated from a free-text description; there is no source PRD, so plan-reviewer's R8a/R8b/R8c apply their description-mode variant.

- **AC-A1:** `plan-writer.md` carries a named pre-emission self-check positioned strictly before `### Step 4.5 — Write the file`, so it is reached from both the first-authoring path and the `## Targeted revision mode` exit without being duplicated.
- **AC-A2:** Every self-check ITEM across all three agents states a property the artifact must have, not the reviewer's rubric wording — mechanically: no rubric token matching `R-[A-Z][A-Z-]+` appears in any item line of a self-check block. Rubric tokens are permitted ONLY in each block's closing front-running sentence, which must name the reviewer that independently re-verifies. (The split is load-bearing: Task 4 requires `test-writer`'s closing sentence to name `R-LIFECYCLE-LEGITIMATE` and `R-AC-COVERAGE`, so a whole-block prohibition would contradict it.)
- **AC-A3:** `implementer.md` carries an equivalent pre-emission self-check inside `## Phase 4`, added as a bolded label such that the file still has exactly two `### Phase 4.` headings.
- **AC-A4:** `test-writer.md`'s existing lifecycle-ledger self-check is extended in place with an AC-coverage item — its original ledger sentence preserved word for word — rather than gaining a second competing self-check block.
- **AC-A5:** *(relaxed 2026-07-30 by explicit human decision, mid-implementation — see `## Notes`.)* Each edited agent file grows by no more than 2% over its pre-change baseline: plan-writer ≤ 1287 (baseline 1262), implementer ≤ 823 (807), test-writer ≤ 587 (576). The original "≤ baseline" target was set in the source description without measuring what the self-check would actually cost; the compressed check is 21 lines against 3 recovered by the authorized trim. Hitting zero would have required cutting Step 4.4 item 11's worked exit-code example — 20 lines, verified unasserted, but the single concrete anchor for a rule this plan's own Risks table relies on, and explicitly out of Task 2's scope. Trading it for a self-imposed number would be metric-gaming of exactly the kind this plan exists to prevent.
- **AC-A6:** The only text removed is the `## Anti-patterns` restatement of the exit-code rule, verified to carry zero assertions across all 34 `scripts/validate/checks/*.test.mjs` files; the diff-scope / prohibition-idiom material remains verbatim in all three of its locations.
- **AC-A7:** No reviewer agent file is modified and no rubric item is added, removed, reworded or reweighted — verified by a clean `git diff` on the four reviewer files.
- **AC-A8:** `feedback-chain.mjs` asserts every property above, including the `### Phase 4.` heading count, and `npm run validate` stays green.
- **AC-A9:** `docs/decisions.md` records the change and the binding prohibition on phrasing a self-check item as the reviewer's own rubric text.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **The premise may be weak.** Research on self-refinement finds unaided self-critique yields marginal gains (about +1.8pp) because models cannot reliably self-diagnose; large gains appear only with external feedback | M | High | These checks are not generic self-critique. Each names a concrete, mechanically-checkable defect class drawn from measured failure data, which is the structured-constraint-checklist shape that research reports outperforms open-ended critique. The honest test is the measurement in `## Notes` — if the first-attempt failure rate does not move, this is the evidence to revert rather than extend. |
| **Specification gaming.** Showing a writer the criteria it is graded on measurably increases literal compliance that satisfies the check while failing the goal | M | High | The binding phrasing rule (AC-A2, recorded as a decision in Task 6) is the mitigation research specifically recommends: state the underlying property and its intent, never the grader's wording. The reviewer's independent full rubric still runs every attempt and is unchanged, so gaming the self-check buys nothing. |
| **The trim breaks a corpus assertion**, making the fix test-pair work mid-implementation | L | High | The target was chosen by a corpus-wide grep across all 34 test files returning zero matches, and the adjacent test-pinned material is explicitly fenced off in Task 2's ACTION. Task 2's own VALIDATE re-runs `rubric-reconciliation.test.mjs`, and Level 3 runs the entire corpus. |
| **Added instructions dilute existing ones** — instruction-following degrades as instruction count grows | M | Medium | The net-neutral line budget is enforced mechanically by Level 2 check (c) against recorded baselines, so the change cannot silently inflate the prompts it is meant to sharpen. |
| **`plan-writer` grows a fourth place stating the same rule**, worsening the three-tier duplication this plan also complains about | M | Low | The self-check items are properties of the artifact, deliberately not restatements of Hard constraints or Step 4.4 items; Task 2 removes one existing restatement in the same pass. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

- **Why one self-check per agent and not per phase.** Research grounding confirmed both entry paths converge: `plan-writer`'s `## Targeted revision mode` ends "Then proceed directly to Phase 5", so a check at the Step 4.5 boundary is reached by revisions too. Placing it inside each `## Targeted revision mode` section instead would have produced a second copy and violated the line budget for no coverage gain.

- **Why `test-writer` is extended rather than given a new block.** It already ships the repo's only self-check, and that check already carries the exact framing the other two need. A second block would compete with it and invite the writer to treat one as optional.

- **The heading-count trap.** `figma-track-ac2-reuse-enforcement.test.mjs` asserts `implementer.md` has exactly two `### Phase 4.` headings. The natural way to add a self-check — a new `### Phase 4.C` — would break a currently-green corpus test and, under R-X strict, could not be fixed by the Implementer. Task 3 uses a bolded label for this reason; the constraint is encoded in its VALIDATE and in `feedback-chain`.

- **CRLF trap in VALIDATE commands (found while self-testing this plan).** This
  repo's working tree uses CRLF. A `grep` for a phrase that spans a line break
  never matches, even on a byte-perfect implementation — an always-fail gate,
  the mirror of the always-pass one `R-COH-VALIDATE-ALWAYS-PASS` catches, and
  just as invisible. Task 2's VALIDATE originally had exactly this defect; it
  was caught by running the block against the unmodified tree and diagnosing
  why it failed rather than assuming the implementation was simply absent. The
  working idiom, mirroring what the corpus tests already do, is
  `tr -d '\r' < f | tr '\n' ' ' | tr -s ' '` before matching. Any future plan
  asserting a multi-line-spanning phrase in this repo needs it.

- **Measurement follow-up — this is the decisive one.** The target metric is the FIRST-attempt failure rate, currently 50% for plans (39/78) and 34% for implementations (23/67). Wave 1 provably cannot move it (`prior_feedback` is null on attempt 1), so any movement after this ships is attributable here. Re-derive from `PRPs/plans/*.jsonl` after roughly ten new artifacts. If the plan rate does not fall below about 35%, the self-refinement research in the Risks table is the better explanation than the concentration hypothesis, and the honest response is to revert rather than add more checklist items.

*Generated: 2026-07-30*
*Approved: 2026-07-30*
*Implemented: 2026-07-30*
*Status: IMPLEMENTED*
