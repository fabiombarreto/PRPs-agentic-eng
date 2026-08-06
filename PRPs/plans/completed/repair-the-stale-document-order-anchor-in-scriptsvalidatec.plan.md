# Feature: Repair the stale document-order test anchor (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: test-file-only edit under `scripts/validate/checks/` (R-X strict / test-pair sole-authorship applies); zero `plugins/relay/` surface touched; zero `documentation/` surface touched
- Decisions found:
  - [2026-05-06] TDD pair is the authorized mechanism for creating test files in the autonomous pipeline (R-X strict preserved) (`docs/decisions.md:421-437`)
  - [2026-07-10] Test pair universalized: activation on declared framework, `tdd:` selects ordering, full CREATE/UPDATE/DELETE test lifecycle with a lifecycle ledger; R-X strict preserved verbatim and extended to the whole lifecycle (`docs/decisions.md:692-707`)
  - [2026-07-12] Validation suite: this repo declares `test_frameworks: ["node:test"]`, `tdd: false` — test-after ordering; the Implementer authors ZERO test files (`docs/decisions.md:710-724`)
- Applicable anti-patterns:
  - Weakening or deleting tests to make the auto-correction loop turn green (`docs/anti-patterns.md:15-21`) — this fix is the explicit carve-out: a legitimate `EXISTING_TEST_UPDATED` performed by the approved test pair, recorded in the suite manifest's lifecycle ledger, validated by `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE`.
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md:61-67`) — not implicated (every artifact this plan produces lives under `PRPs/`), included per standing Decision Gate practice.
- Applicable architectural rules:
  - Command surface: writer and reviewer split — test-file authorship flows exclusively through `test-writer` (`/relay-write-test`) and `test-reviewer` (`/relay-test-write-review`); R-X strict (`docs/context/architecture.md` "Command surface").
  - PRP artifact paths live under `PRPs/`, never `.claude/` (`docs/context/architecture.md` "PRP artifact paths").
- Result: PROCEED
```

## Source

Repair the stale document-order anchor in scripts/validate/checks/figma-visual-first-track-phase6.test.mjs that makes the repo's only failing test fail. Repo root for ALL reads and writes is the absolute path C:\repos\PRPs-agentic-eng — resolve every relative path against that root. THE DEFECT, diagnosed 2026-08-06: the test at line 221 ("AC-A1 (PRD AC-4): P3's resumable visual-approval check is positioned strictly between the existing actionable-row rule and the amended zero-actionable-rows exit...") builds a six-index document-order assertion over plugins/relay/commands/relay-execute.md — p3Idx, ruleIdx, checkIdx, awaitingMsgIdx, amendedExitIdx, allCompleteIdx — and asserts ruleIdx > p3Idx && checkIdx > ruleIdx && awaitingMsgIdx > checkIdx && amendedExitIdx > awaitingMsgIdx && allCompleteIdx > amendedExitIdx. Five of the six resolve. The sixth, ruleIdx at line 225, is content.indexOf('every comma-separated phase number listed has') and returns -1, so the whole chain collapses. THE PRODUCTION FILE IS CORRECT AND MUST NOT BE TOUCHED: commit 09ad56b ("feat(relay): advance phase status through five states during orchestration") deliberately rewrote that rule in two places from "every comma-separated phase number listed has `Status == complete`." to "every comma-separated phase number listed is in a dependency-satisfying state: `implemented`, `tested`, or `complete`." That rewrite IS the point of 09ad56b — under the five-state lifecycle a Depends reference is satisfied from `implemented` onward, not only at `complete`. The word "has" disappeared, which is precisely the word the test's anchor ends on. So this is a stale test anchor, never a production regression. ROOT CAUSE WORTH FIXING, not just the symptom: the test's own inline comment labels that rule "(unmodified)" — it is neighbouring prose the Phase 6 change never owned, used only as an ordering landmark to prove the new resumable check sits AFTER the pre-existing actionable-row rule. Anchoring a Phase 6 regression test on the exact wording of out-of-scope neighbouring prose is what made it brittle, and a literal find-and-replace to the new wording would leave it just as brittle for the next unrelated rewrite of that same sentence. The replacement anchor must identify the same landmark by something stable — for example the `Depends` cell rule's invariant lead-in rather than its mutable tail — and the plan must state explicitly which anchor was chosen and why it is more stable than the one it replaces. WHAT MUST NOT BE WEAKENED: the assertion must still prove the full six-step ordering. Dropping ruleIdx from the chain, or relaxing the chain to fewer comparisons, would make the test pass by removing the property it exists to pin; that is weakening, and it is forbidden. The other five anchors resolve correctly today and must be left byte-identical. SCOPE, verified rather than assumed: exactly one anchor in exactly one test file. I checked every one of the six lines 09ad56b removed from relay-execute.md against every *.test.mjs in the repo — no other test greps any of them, so there is no second latent stale anchor to fix. No other file changes. This touches no documentation/ page (feature-phase suites like this one are not catalogued in documentation/reference/validation-checks.html, whose summary table lists only the twelve registered validate checks plus efficiency-metrics and the eval layer), the test COUNT does not change (an anchor string is edited, no test is added or removed), and nothing under plugins/relay/ is touched, so no changelog entry and no plugin.json bump are due — it stays at 0.28.1. GOVERNANCE, binding: this is test-pair work under R-X strict. docs/decisions.md [2026-05-06] makes the test pair the only authorized author of test files, and [2026-07-10] preserves that sole-author invariant verbatim while EXTENDING it to the whole CREATE/UPDATE/DELETE lifecycle — "the Implementer and the auto-correction loop still author ZERO test-file changes". The correct outcome is EXISTING_TEST_UPDATED with a lifecycle-ledger entry validated by test-reviewer's R-LIFECYCLE-LEGITIMATE. Plan this as test-pair authoring via /relay-write-test and /relay-test-write-review. Do NOT plan any Implementer task that creates, edits or deletes a *.test.mjs file. VERIFICATION, and the traps that have already burned this initiative. node --test picks its reporter by TTY detection, so ALWAYS pin --test-reporter=tap and match ^# tests [0-9]+$ / ^# pass [0-9]+$ / ^# fail [0-9]+$; the default emits a multibyte-prefixed form that a plain "# tests" grep silently misses. The corpus baseline measured today with node --test --test-reporter=tap scripts/validate/checks/*.test.mjs scripts/eval.test.mjs plugins/relay/scripts/*.test.mjs scripts/efficiency.test.mjs is 571 tests, 570 pass, 1 fail, and that one failure is this defect — so unlike every recent plan in this repo, a whole-corpus zero-failure gate is CORRECT here and the plan should assert 571 tests / 0 fail after the fix, because this change is precisely the one that closes it. Passing a bare directory to node --test triggers MODULE_NOT_FOUND in this repo; use the glob form above. The tree is CRLF, so any command matching a phrase that spans a line break must normalize with tr -d '\r' first, and a multi-line search string must carry CRLF endings or it matches nothing. Every VALIDATE command must be verified against the unmodified tree in BOTH directions before the plan is approved — in particular, confirm that a grep asserting the NEW anchor genuinely fails today, so it is not an always-pass. npm run validate must stay 12 passed, 0 failed.

## Summary

`scripts/validate/checks/figma-visual-first-track-phase6.test.mjs`'s `AC-A1` test asserts a six-index document order over `plugins/relay/commands/relay-execute.md`. Its `ruleIdx` anchor (line 225) was written against the mutable tail of a sentence commit `09ad56b` correctly rewrote while shipping the five-state phase-status lifecycle; the anchor's own file header labels that neighbouring sentence "(unmodified)" — it was only ever meant as a landmark, not content under test. Because the anchor coupled to the tail instead of the sentence's stable lead-in, the unrelated-but-correct rewrite silently broke it. This plan re-anchors `ruleIdx` on `every comma-separated phase number listed` — the clause both the pre- and post-`09ad56b` wording share verbatim, describing the `Depends` cell's multi-value *format* rather than the lifecycle-state *vocabulary* that already changed once. The repair is authored exclusively by the test pair (`test-writer` via `/relay-write-test`, `test-reviewer` via `/relay-test-write-review`) as an `EXISTING_TEST_UPDATED` lifecycle-ledger entry, never by the Implementer, per R-X strict.

## User Story

As a maintainer of the relay repo's validation-suite test corpus,
I want to re-anchor the one failing content-invariant test on the stable, invariant lead-in of the sentence it uses as a landmark rather than its mutable tail,
So that the corpus returns to a genuine zero-failure baseline without weakening the six-step ordering property the test exists to pin, and without the fix itself becoming the next stale-anchor incident.

## Problem Statement

`scripts/validate/checks/figma-visual-first-track-phase6.test.mjs`'s `AC-A1` test builds a six-index document-order assertion (`p3Idx < ruleIdx < checkIdx < awaitingMsgIdx < amendedExitIdx < allCompleteIdx`) over `plugins/relay/commands/relay-execute.md`. Five of the six `content.indexOf(...)` anchors resolve correctly today. The sixth, `ruleIdx` at line 225, was written as `content.indexOf('every comma-separated phase number listed has')` — a substring ending on the word "has". Commit `09ad56b` deliberately and correctly rewrote the `Depends`-cell dependency-satisfaction rule (at both `relay-execute.md:118` and `relay-execute.md:218`) from "...has `Status == complete`." to "...is in a dependency-satisfying state: `implemented`, `tested`, or `complete`." — the word "has" no longer appears in either occurrence. `ruleIdx` therefore resolves to `-1`, and the `assert.ok(ruleIdx > p3Idx && ...)` chain fails, because `-1 > p3Idx` is false. This is the repo's only failing test in the 571-test corpus baseline (`571 tests, 570 pass, 1 fail`). The production file is correct; the test's own header comment already labels the sentence it pins as "(unmodified)" — it exists purely as an ordering landmark for the *new* Phase 6 assertions, and coupling that landmark to the sentence's mutable tail (rather than its stable lead-in) is what made the anchor brittle to an unrelated, in-scope rewrite.

## Solution Statement

Re-anchor `ruleIdx` on `every comma-separated phase number listed` — the clause both the pre-`09ad56b` and post-`09ad56b` wording share verbatim at both `relay-execute.md:118` and `relay-execute.md:218`. This lead-in describes the `Depends` cell's own multi-value format (a comma-separated list of phase numbers), which is orthogonal to and does not need to change when the specific vocabulary naming which lifecycle states satisfy a dependency changes — as it already has once (from a single `Status == complete` check to a three-state disjunction), and could again (e.g. if a sixth lifecycle state were ever introduced). Because `String.prototype.indexOf` returns only the FIRST match and the phrase's first occurrence in the file is still at the P3 section (line 118, before the Phase A.1 occurrence at line 218), the new anchor resolves to the exact same position the original anchor targeted — preserving `ruleIdx`'s role in the six-index chain byte-for-byte in every respect except the literal it searches for. The fix is authored exclusively by the test pair as a single `EXISTING_TEST_UPDATED` lifecycle-ledger entry — the test already exercises a real, worth-pinning property (the six-step document order); only the stale implementation detail of one anchor is corrected. No production file changes. All six comparisons in the ordering chain are preserved; none is dropped or relaxed.

## Metadata

| Field | Value |
|-------|-------|
| Type | Test-authoring correction (stale document-order anchor repair) |
| Complexity | Trivial — one string-literal swap inside one existing test assertion; zero production code change |
| Systems Affected | `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs` (test surface only); no `plugins/relay/` surface, no `documentation/` surface |
| Dependencies | `plugins/relay/commands/relay-execute.md` (read-only ground truth for the new anchor's exact wording — never edited); `docs/decisions.md` [2026-05-06]/[2026-07-10] (governs test-pair sole authorship, R-X strict); `docs/context/methodology.md` (`tdd: false`, `test_frameworks: ["node:test"]` — activates the pair, test-after ordering) |
| Estimated Tasks | 3 tasks total, all test-pair dispatch/verification steps (`/relay-write-test`, `/relay-test-write-review`, and a closing corpus-verification step); 0 Implementer tasks — see `## NOT Building` |
| Source PRD line ref | N/A — description mode, no source PRD |
| `phase_type` | `refactor` |

`phase_type: refactor` justification (stated explicitly per this plan's own authoring instructions, since the inference signals in the canonical rule are written with production code in mind): the only file touched, `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs`, is neither application source (ruling out `foundation`/`feature`), nor a documentation file — `.md`/`.html`/`.txt`/doc config (ruling out `docs`), nor a filesystem/OS-oriented bootstrap/config-only deliverable (ruling out `scaffold`). It IS a pure structural correction of an existing assertion's implementation detail — the property under test (the six-step document order) is unchanged; only the string literal used to locate one landmark is corrected to track reality, with zero capability added or removed. That is `refactor`'s definition applied to test-authoring surface rather than production surface, and the most honest of the five values available. `design_source` and `phase_scope` are both absent by rule: `docs/context/methodology.md` declares no `figma_track` key, and description mode has no PRD to declare `visual_first`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs` | 215-249 | The sole file to change: the `AC-A1` test whose `ruleIdx` anchor (line 225) is stale. |
| P0 | `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs` | 69-98 | This file's own established "Lifecycle updates" docblock convention — the shape Task 1's new `EXISTING_TEST_UPDATED` paragraph must mirror. |
| P0 | `plugins/relay/commands/relay-execute.md` | 101-120, 212-224 | Ground truth: the exact current wording of the `Depends`-cell rule at both sites (P3 heading + rule at 118; Phase A.1 heading + rule at 218) the new anchor must match. Read-only — never edited by this plan. |
| P1 | `docs/decisions.md` | 692-707 | [2026-07-10] "Test pair universalized" — the operative R-X-strict + full-lifecycle contract this fix must satisfy (`EXISTING_TEST_UPDATED`, `R-LIFECYCLE-LEGITIMATE`). |
| P1 | `docs/anti-patterns.md` | 15-21 | The test-weakening anti-pattern and its explicit carve-out for a legitimate `EXISTING_TEST_UPDATED` performed by the approved test pair and recorded in the lifecycle ledger — the exact condition this fix must meet to not be a violation. |
| P1 | `PRPs/reports/fix-a-measurement-defect-in-scriptsefficiencymjs-that/test-suite.diff` | 105-113 | An already-`APPROVED` sibling manifest's own "Scoping note — the pre-existing corpus failure" section, independently corroborating this exact defect (commit `09ad56b`, this exact file) and its "test-pair work, out of scope for that plan" framing. |
| P2 | `docs/context/methodology.md` | 1-21 | Confirms `tdd: false` + `test_frameworks: ["node:test"]` — the pair is ACTIVE in test-after ordering for this repo. |

## Patterns to Mirror

```javascript
# SOURCE: scripts/validate/checks/figma-visual-first-track-phase6.test.mjs:224-225
  const p3Idx = content.indexOf('### P3 — Implementation Phases table parseable');
  const ruleIdx = content.indexOf('every comma-separated phase number listed has');
```

Task 1 edits line 225 only, replacing the string literal with `'every comma-separated phase number listed'`. Line 224 and every other anchor in this test (`checkIdx`, `awaitingMsgIdx`, `amendedExitIdx`, `allCompleteIdx`) are left byte-identical.

```
# SOURCE: plugins/relay/commands/relay-execute.md:118
Its `Depends` cell is `-` (empty) OR every comma-separated phase number listed is in a dependency-satisfying state: `implemented`, `tested`, or `complete`.
```

Ground truth wording the new anchor must match, at its first — and, per `indexOf`'s first-match semantics, controlling — occurrence in the file. Never edited by this plan.

```
# SOURCE: plugins/relay/commands/relay-execute.md:218
Its `Depends` cell is `-` (empty) OR every comma-separated phase number listed is in a dependency-satisfying state: `implemented`, `tested`, or `complete` (identical to the P3 rule above; `plan-writer.md` Step 1.3 holds the canonical definition).
```

The second occurrence of the same rule, confirming the replacement anchor's shared lead-in is genuinely verbatim at both sites, not merely at the one the test targets.

```
# SOURCE: scripts/validate/checks/figma-visual-first-track-phase6.test.mjs:82-87
 *   - `scripts/validate/checks/figma-track-phase3.test.mjs` — its "no OTHER
 *     command file mentions design-map" test (already extended twice
 *     before, for `relay-design-spec.md` then `relay-visual-review.md`,
 *     via the identical MINIMAL-exclusion discipline). Fixed by adding
 *     `relay-visual-approve.md` as a fourth excluded name — see that
 *     file's own header "Third lifecycle update" paragraph.
```

The file's own established convention for documenting a prior lifecycle update inline in its header docblock. Task 1's new paragraph mirrors this shape (what changed, why, and a pointer to the fuller manifest).

```
# SOURCE: docs/decisions.md:700-702
- **Full test lifecycle (CREATE / UPDATE / DELETE)** with a suite-manifest **lifecycle ledger.** Every non-create op is recorded (`EXISTING_TEST_UPDATED`, `OBSOLETE_TEST_REMOVED` = behavior gone from the in-scope ACs, `REDUNDANT_TEST_REMOVED` = proven duplicate naming the survivor) and validated by `test-reviewer`'s new `R-LIFECYCLE-LEGITIMATE` check.
```

The exact classification (`EXISTING_TEST_UPDATED`) and validating check (`R-LIFECYCLE-LEGITIMATE`) Task 1 and Task 2 must produce and satisfy.

```json
# SOURCE: PRPs/plans/fix-a-measurement-defect-in-scriptsefficiencymjs-that.test-write-review.jsonl:1
{"timestamp": "2026-08-05T17:55:54Z", "verdict": "APPROVED", "rubric": [{"id": "R-IMPL-LEAK", "passed": true}, {"id": "R-TRIVIAL-ASSERT", "passed": true}, {"id": "R-MOCK-ABUSE", "passed": true}, {"id": "R-AC-COVERAGE", "passed": true}, {"id": "R-DUPLICATE", "passed": true}, {"id": "R-GREEN-LEGITIMATE", "passed": true}, {"id": "R-LIFECYCLE-LEGITIMATE", "passed": true}], "action": "rubric_evaluation", "user_message": ""}
```

The exact JSONL verdict shape (`"verdict": "APPROVED"`, with a space after the colon) Task 2's `VALIDATE` greps for, taken from a real `APPROVED` entry already on disk in this repo.

```
# SOURCE: PRPs/reports/fix-a-measurement-defect-in-scriptsefficiencymjs-that/test-suite.diff:105-113
## Scoping note — the pre-existing corpus failure

`node --test` was invoked on named suites only, never on the whole corpus.
`figma-visual-first-track-phase6.test.mjs` carries one assertion that is
already red on the unmodified tree (commit `09ad56b` rewrote a phrase in
`relay-execute.md` that the test still greps for). It is unrelated to this
work, is itself test-pair work, and is out of scope per the plan's
`## NOT Building`; a whole-corpus gate would have inherited it and reported
it as this change's.
```

An already-`APPROVED` sibling manifest, from a different already-implemented plan in this same repo, independently confirming the exact same pre-fix baseline (one failure, this file, commit `09ad56b`) this plan closes. Task 3's `**ACTION**` cites this as corroborating evidence that the defect and its scope are real, not merely asserted by this plan's own `## Source`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs` | UPDATE | Repairs the stale `ruleIdx` document-order anchor (line 225) and records the fix as an `EXISTING_TEST_UPDATED` lifecycle-ledger entry. Authored exclusively by the test pair (`test-writer`/`test-reviewer`) under R-X strict — the Implementer performs zero test-file edits. |

## NOT Building (Scope Limits)

- No change to `plugins/relay/commands/relay-execute.md` or any other production/plugin file — commit `09ad56b`'s rewrite is correct and final; only the test's anchor was stale.
- No Implementer task creates, edits, or deletes any `*.test.mjs` file — R-X strict; the entire change flows through `/relay-write-test` then `/relay-test-write-review`.
- No second anchor fix elsewhere — a repo-wide grep for every wording `09ad56b` removed confirmed it occurs in no other `*.test.mjs` file; scope is exactly one file, one anchor.
- No relaxation of the six-index ordering chain — dropping `ruleIdx`, or reducing the number of comparisons, would remove the property the test exists to pin and is explicitly forbidden.
- No `documentation/` page update, no `changelog.html` entry — the test count is unchanged (one anchor string edited, no test added or removed), and feature-phase suites like this one are not catalogued in `documentation/reference/validation-checks.html`'s summary table (which lists only the twelve registered `validate` checks plus `efficiency-metrics` and the eval layer).
- No `plugin.json` version bump — nothing under `plugins/relay/` is touched; stays at `0.28.1`.
- **AC-A6 is satisfied structurally, not by any single task's action.** It asserts a negative (no Implementer task touches a `*.test.mjs` file), which this plan satisfies by construction — all three Step-by-Step Tasks below dispatch the test pair or verify its output; none is an Implementer task. There is no task to point AC-A6 at beyond the plan's own task list containing zero Implementer entries.

## Step-by-Step Tasks

### Task 1: Dispatch test-writer (`/relay-write-test`) — author the EXISTING_TEST_UPDATED anchor repair

**ACTION**: Delivers **AC-A1** and **AC-A2**. Once this plan reaches `*Status: APPROVED*`, run `/relay-write-test PRPs/plans/repair-the-stale-document-order-anchor-in-scriptsvalidatec.plan.md`. Walking this plan's own `AC-A1`, `test-writer` classifies the fix as `EXISTING_TEST_UPDATED` — the test already exercises a real property (the six-step document order); only its `ruleIdx` anchor's implementation detail is stale — and makes exactly two edits inside `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs`: (a) at line 225, replace `content.indexOf('every comma-separated phase number listed has')` with `content.indexOf('every comma-separated phase number listed')` — the invariant lead-in clause verbatim-shared by the pre- and post-`09ad56b` sentence at both `relay-execute.md:118` and `relay-execute.md:218` (never the mutable lifecycle-state tail that already changed once); (b) append a new "Lifecycle updates (this session, EXISTING_TEST_UPDATED)" paragraph to the file's header docblock, mirroring the established convention at lines 69-98/82-87, and record the same entry in the suite manifest's Lifecycle ledger at `PRPs/reports/repair-the-stale-document-order-anchor-in-scriptsvalidatec/test-suite.diff`. All five other anchors in this same test (`p3Idx`, `checkIdx`, `awaitingMsgIdx`, `amendedExitIdx`, `allCompleteIdx`) and every other test in the file are left byte-identical. Per this repo's established test-writer discipline (`PRPs/reports/fix-a-measurement-defect-in-scriptsefficiencymjs-that/test-suite.diff`'s "Discriminative-mutation verification" section), confirm the new anchor is capable of failing: temporarily restoring the stale literal must reproduce today's red assertion, and the corrected literal must turn it green, before either is committed to the ledger.

**MIRROR**: `# SOURCE: scripts/validate/checks/figma-visual-first-track-phase6.test.mjs:224-225` — Task 1 edits only the `ruleIdx` line; `p3Idx` and every sibling anchor are the shape to leave untouched.

**VALIDATE**:
```bash
set -euo pipefail
if grep -qF "content.indexOf('every comma-separated phase number listed has')" scripts/validate/checks/figma-visual-first-track-phase6.test.mjs; then
  echo "FAIL: stale ruleIdx anchor (trailing ' has') still present"; exit 1
fi
grep -qF "content.indexOf('every comma-separated phase number listed')" scripts/validate/checks/figma-visual-first-track-phase6.test.mjs
echo "PASS: ruleIdx now anchors on the stable invariant lead-in"
```

### Task 2: Dispatch test-reviewer (`/relay-test-write-review`) — validate R-LIFECYCLE-LEGITIMATE and flip the manifest APPROVED

**ACTION**: Delivers **AC-A3**. Run `/relay-test-write-review PRPs/reports/repair-the-stale-document-order-anchor-in-scriptsvalidatec/test-suite.diff`. `test-reviewer` runs its full seven-item rubric in test-after mode (`R-IMPL-LEAK`, `R-TRIVIAL-ASSERT`, `R-MOCK-ABUSE`, `R-AC-COVERAGE`, `R-DUPLICATE`, `R-GREEN-LEGITIMATE`, `R-LIFECYCLE-LEGITIMATE`) — `R-LIFECYCLE-LEGITIMATE` independently re-validates the ledger entry Task 1 recorded (confirming the edit is a genuine anchor repair, not a disguised weakening of the six-index chain), and `R-GREEN-LEGITIMATE` confirms the corrected test genuinely passes for the right reason (the discriminative-mutation evidence Task 1 gathered). On full pass, `test-reviewer` flips the manifest `*Status: DRAFT*` → `*Status: APPROVED*` and appends the verdict to `PRPs/plans/repair-the-stale-document-order-anchor-in-scriptsvalidatec.test-write-review.jsonl`.

**MIRROR**: `# SOURCE: docs/decisions.md:700-702` — the exact `EXISTING_TEST_UPDATED` / `R-LIFECYCLE-LEGITIMATE` contract this dispatch must satisfy.

**VALIDATE**:
```bash
set -euo pipefail
node --test --test-reporter=tap scripts/validate/checks/figma-visual-first-track-phase6.test.mjs | grep -qE '^# fail 0$'
grep -qF '"verdict": "APPROVED"' PRPs/plans/repair-the-stale-document-order-anchor-in-scriptsvalidatec.test-write-review.jsonl
grep -qF '*Status: APPROVED*' PRPs/reports/repair-the-stale-document-order-anchor-in-scriptsvalidatec/test-suite.diff
echo "PASS: file-scoped run is green, manifest APPROVED, jsonl verdict recorded"
```

### Task 3: Confirm the whole-corpus gate returns to zero failures and npm run validate stays green

**ACTION**: Delivers **AC-A4** and **AC-A5**. With Tasks 1-2 complete, re-run the full `node --test` corpus this repo's baseline was measured against (`scripts/validate/checks/*.test.mjs scripts/eval.test.mjs plugins/relay/scripts/*.test.mjs scripts/efficiency.test.mjs`) and confirm it now reports `571 tests, 571 pass, 0 fail` — the pre-fix baseline was `571 tests, 570 pass, 1 fail`, and this defect was the entirety of that one failure. Then confirm `npm run validate` still reports `12 passed, 0 failed`, proving the plugin-surface static-check layer is unaffected by a test-only change. Then confirm `plugins/relay/.claude-plugin/plugin.json` still reports version `0.28.1` (untouched), closing AC-A5's second half — nothing under `plugins/relay/` is touched by this fix. This is the only task in this plan whose `VALIDATE` legitimately globs the whole corpus rather than a single file — see `## Validation Commands` Level 2 for why that is deliberately correct here, unlike the file-scoped convention recent plans in this repo otherwise follow.

**MIRROR**: `# SOURCE: PRPs/reports/fix-a-measurement-defect-in-scriptsefficiencymjs-that/test-suite.diff:105-113` — the sibling manifest's own "Scoping note" independently documents this exact pre-fix baseline (one failure, this file, commit `09ad56b`); Task 3 is the session that closes it.

**VALIDATE**:
```bash
set -euo pipefail
OUTPUT=$(node --test --test-reporter=tap scripts/validate/checks/*.test.mjs scripts/eval.test.mjs plugins/relay/scripts/*.test.mjs scripts/efficiency.test.mjs)
echo "$OUTPUT" | grep -qE '^# tests 571$'
echo "$OUTPUT" | grep -qE '^# pass 571$'
echo "$OUTPUT" | grep -qE '^# fail 0$'
npm run validate 2>&1 | tee /dev/stderr | grep -qE '^12 passed, 0 failed'
grep -q '"version": "0.28.1"' plugins/relay/.claude-plugin/plugin.json || { echo "FAIL: plugin.json changed; this ships no plugin asset"; exit 1; }
echo "PASS: corpus 571/571/0, npm run validate 12/12, plugin.json unchanged at 0.28.1"
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check scripts/validate/checks/figma-visual-first-track-phase6.test.mjs
echo "PASS: edited test file is syntactically valid"
```

### Level 2 — UNIT_TESTS

```bash
set -euo pipefail
OUTPUT=$(node --test --test-reporter=tap scripts/validate/checks/*.test.mjs scripts/eval.test.mjs plugins/relay/scripts/*.test.mjs scripts/efficiency.test.mjs)
echo "$OUTPUT" | grep -qE '^# tests 571$'
echo "$OUTPUT" | grep -qE '^# fail 0$'
echo "PASS: whole corpus 571 tests, 0 fail"
```

**Why the whole-corpus glob is deliberately correct here, unlike recent plans in this repo.** `fix-a-measurement-defect-in-scriptsefficiencymjs-that.plan.md`'s own Level 2 (and its manifest's "Scoping note — the pre-existing corpus failure") names suites individually rather than globbing the corpus, specifically to avoid inheriting this exact pre-existing failure and reporting it as unrelated work's own regression. This plan is the converse case: it is the fix for that one known failure, so asserting the whole-corpus zero-failure invariant is exactly the check that proves the fix landed. Once this plan is `APPROVED` and implemented, the corpus returns to a legitimate zero-failure baseline; future plans should resume the scoped, named-suite convention and only re-exclude a suite if a NEW, unrelated failure appears — not this one.

### Level 3 — INTEGRATION

```bash
set -euo pipefail
npm run validate 2>&1 | tee /dev/stderr | grep -qE '^12 passed, 0 failed'
grep -qF '"verdict": "APPROVED"' PRPs/plans/repair-the-stale-document-order-anchor-in-scriptsvalidatec.test-write-review.jsonl
echo "PASS: plugin-surface static checks unaffected; test-pair verdict genuinely APPROVED"
```

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — this plan has no source PRD, so no acceptance criterion carries a `(PRD AC-N)` token.

- **AC-A1:** The `ruleIdx` anchor at `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs:225` no longer contains the stale literal `'every comma-separated phase number listed has'`; it instead reads `content.indexOf('every comma-separated phase number listed')`, the invariant lead-in shared verbatim by the pre- and post-`09ad56b` wording at both `relay-execute.md:118` and `relay-execute.md:218`.
- **AC-A2:** The six-index document-order assertion in the `AC-A1 (PRD AC-4)` test (`p3Idx < ruleIdx < checkIdx < awaitingMsgIdx < amendedExitIdx < allCompleteIdx`) is preserved unmodified — all six comparisons remain in the chain; none is dropped, relaxed, or reordered.
- **AC-A3:** The fix is recorded as an `EXISTING_TEST_UPDATED` entry in the suite manifest's Lifecycle ledger, independently validated by `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE` check, and the manifest reaches `*Status: APPROVED*`.
- **AC-A4:** `node --test --test-reporter=tap` over the full corpus this repo measures its baseline against reports `571 tests, 571 pass, 0 fail` — up from the pre-fix `571 tests, 570 pass, 1 fail` — with this file's fix as the entirety of the delta.
- **AC-A5:** `npm run validate` continues to report `12 passed, 0 failed`, and `plugins/relay/.claude-plugin/plugin.json` is untouched (stays `0.28.1`) — confirming the fix is test-authoring-surface-only with zero plugin-surface impact.
- **AC-A6:** No Implementer task in this plan creates, edits, or deletes any `*.test.mjs` file — the entire change is authored via `/relay-write-test` then `/relay-test-write-review` (R-X strict, `docs/decisions.md` [2026-05-06], [2026-07-10]).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The replacement anchor is coupled to a substring that also appears at a THIRD, unintended site in `relay-execute.md`, silently matching the wrong occurrence | Low | Medium — `ruleIdx` would resolve but to the wrong position, corrupting the ordering chain in a way that could still pass by accident | `research-codebase` confirmed the phrase appears at exactly two sites (118, 218); `indexOf`'s first-match semantics select line 118 — the same position the original anchor targeted. Task 1's `**ACTION**` requires this be verified, not assumed. |
| A future rewrite of the `Depends`-cell rule changes the "every comma-separated phase number listed" lead-in itself (not just the tail), reintroducing the same failure class | Low | Low — a repeat of today's exact incident, now against the new anchor | Documented explicitly in Task 1's ledger entry and this plan's `## Notes`, so a future stale-anchor incident against THIS anchor is diagnosed as fast as this one was, rather than rediscovered from scratch. |
| A future plan copies this one's Level 2 as a template and silently re-inherits a DIFFERENT, unrelated failure later | Low | Medium — a future plan's Level 2 would then fail on unrelated grounds | `## Validation Commands` Level 2 explicitly states the whole-corpus scope is a deliberate exception specific to this plan (the fix for the one known failure), not this repo's general convention. |
| `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE` or `R-GREEN-LEGITIMATE` rejects the ledger entry — e.g. missing discriminative-mutation evidence | Low | Low — bounded retry via `/relay-write-test` with `prior_feedback`, not a structural blocker | Task 1's `**ACTION**` explicitly requires the mutation-verification step (temporarily restoring the stale literal to confirm red, then the fix to confirm green) before the ledger entry is written, mirroring this repo's own established discriminative-mutation-verification convention. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. This particular plan has zero Implementer tasks (see `## NOT Building`), so the before/after-the-Implementer distinction is moot in practice here — the entire diff this plan produces already IS the test pair's own diff.

**Anchor-stability rationale, stated explicitly per this task's own instructions.** The replacement anchor `'every comma-separated phase number listed'` was chosen over the alternative of literally swapping in the new tail (e.g. anchoring on `'...is in a dependency-satisfying state'`) because the latter would re-couple the anchor to the exact same class of mutable, lifecycle-vocabulary-dependent tail that just broke it once already — fixing the symptom, not the root cause the task description calls out. The chosen lead-in instead describes the `Depends` cell's row *format* (a comma-separated list), which is independent of which state names currently satisfy a dependency, and is present verbatim, at the correct first-match position, at both `relay-execute.md:118` and `:218` today.

**Grounding.** `research-codebase` confirmed both rule occurrences' exact current wording, confirmed (via a repo-wide grep of all six wordings `09ad56b` removed) that no other `*.test.mjs` file greps any of them — so this is genuinely a single-anchor, single-file defect — and confirmed this test file's own anchor-style and lifecycle-update-paragraph conventions. `research-web` returned general "assert only the invariant part of a string, not its full mutable content" guidance as the closest analogue (an expected, explicitly-flagged `gaps` entry notes no direct prior art exists for markdown document-order `indexOf` assertions specifically) — consistent with, and supporting, the lead-in-vs-tail anchor choice made here. A third, unusually strong grounding source was found directly on disk: `PRPs/reports/fix-a-measurement-defect-in-scriptsefficiencymjs-that/test-suite.diff` — an already-`APPROVED` sibling manifest from a different, already-implemented plan in this same repo — independently documents this exact same defect (commit `09ad56b`, this exact file, "one assertion... already red on the unmodified tree") in its own "Scoping note", corroborating both the diagnosis and the `571 tests, 570 pass, 1 fail` baseline this plan cites.

**Verification honesty note.** This agent (`plan-writer`) has no `Bash` tool and did not execute any command against the repo. Every `VALIDATE` command's target state was instead confirmed by direct `Read` of the unmodified tree: line 225 of `scripts/validate/checks/figma-visual-first-track-phase6.test.mjs` reads exactly `const ruleIdx = content.indexOf('every comma-separated phase number listed has');` today (Task 1's `FAIL` grep target is genuinely present pre-fix), and the corrected literal `content.indexOf('every comma-separated phase number listed')` does not appear anywhere in the file today (the `PASS` grep is not vacuously true). The `571 tests, 570 pass, 1 fail` and `12 passed, 0 failed` baselines cited throughout this plan were supplied as already-measured context for this task and are independently corroborated by the sibling manifest cited above, not re-executed by this agent.

**CRLF.** The tree is CRLF. None of this plan's `VALIDATE` commands match a phrase that spans a line break, so no `tr -d '\r'` normalization is required for any of them.

*Generated: 2026-08-06*
*Approved: 2026-08-06*
*Implemented: 2026-08-06*
*Status: IMPLEMENTED*
