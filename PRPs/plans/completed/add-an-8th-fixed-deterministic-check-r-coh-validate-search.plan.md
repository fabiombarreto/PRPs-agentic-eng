# Feature: Add an 8th FIXED deterministic check to plan-reviewer.md (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of an existing shipped reviewer agent's rubric (`plugins/relay/agents/plan-reviewer.md`); a new deterministic structural check added to an existing reviewer's additive R-COH-* coherence layer; cross-cutting arithmetic (the `### Logging discipline` rubric-length-counting paragraph) that must stay internally consistent across five prior shipments; recording a new decision in `docs/decisions.md` per the Decision Gate's own feedback-loop contract; routing of downstream test-file bookkeeping around `code-reviewer`'s universal R-X test-modification guard
- Decisions found:
  - [2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED deterministic plan-reviewer check catching ACTION/VALIDATE self-contradiction; rubric[] arithmetic shifts to 15–20/15–23 — the direct precedent this new 8th check's shape, unconditional framing, and arithmetic-update mechanics all mirror; its own "Areas affected" line records the "15 to 20"/"15 to 23" numerals this plan's decisions.md entry explicitly supersedes
  - [2026-07-09] Validation commands must carry real exit-code semantics; plan-reviewer enforces via R-COH-VALIDATE-ALWAYS-PASS — the other unconditional sibling check both this and R-COH-ACTION-VALIDATE-CONTRADICTION already cite as their nearest precedent
  - [2026-04-28] AC-10 of plan-authoring.prd.md evolves: R-COH-* rows are additive to the rubric[] array — confirms an 8th deterministic row can be added without violating "no extras"
  - [2026-07-25] `phase_scope: logic` sentinel-ledger resolution + R-COH-SENTINEL-RESOLUTION-MISSING enforcement ship — the origin of the `RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR` sentinel idiom this check's own `RELAY-FIRST-MATCH-INTENDED` escape hatch deliberately mirrors (and deliberately avoids colliding with, by token prefix)
  - [2026-07-10] Test pair universalized: activation on declared framework, `tdd:` selects ordering, full test lifecycle — governs how the three now-stale test files must be updated (`EXISTING_TEST_UPDATED`, test pair only, never the Implementer); its own text ("in test-after the pair's diff is reviewed by test-reviewer, never the code-reviewer — so R-X ... never sees it") is the mechanical basis for routing these fixes around code-reviewer's R-X guard
  - [2026-05-06] TDD pair is the authorized mechanism for creating test files in the autonomous pipeline (R-X strict preserved) — the origin of the universal test-modification guard this plan's own routing decision (Notes) works within, never around
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — standing constraint on this plan's own output path
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" — standing background constraint; every path this plan touches (`plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`, and this plan's own `PRPs/plans/` path) resolves outside `.claude/`
  - "Weakening or deleting tests to make the auto-correction loop turn green" — directly relevant: the three existing tests that assert the pre-change rubric arithmetic (and, for one of them, an exact `#### R-COH-*` heading count) MUST be updated (`EXISTING_TEST_UPDATED`) by the test pair, never deleted or silently weakened
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; `plan-writer`/`plan-reviewer` both run fully autonomously, no dialogue — unaffected by description mode
  - `code-reviewer`'s R-X universal test-modification guard is a blanket, unconditional `git diff --name-only -- <test-glob-pathspec>` match with "no first warning grace period" (D17) — decisive for why this plan routes its three test-file fixes to the test pair's own diff (never reviewed by code-reviewer) rather than authoring them as Implementer Step-by-Step Tasks
  - `plan-reviewer`'s fixed tool grant (`Read, Edit, Write` — no `Bash`, no `Grep`) bounds every R-COH-* check to a textual/mechanical scan over content already in memory — decisive for how this check must be authored
  - PRP artifact path convention (`PRPs/plans/`) governs this plan's own output path
- Result: PROCEED
```

## Source

Add an 8th FIXED deterministic check, `R-COH-VALIDATE-SEARCH-AMBIGUOUS`, to `plugins/relay/agents/plan-reviewer.md`, and re-derive the rubric-length arithmetic prose plus the three test files that assert its exact wording.

### The defect class this closes

A plan task's `**VALIDATE**` uses a position-based search — `src.indexOf(needle)` (or `lastIndexOf`) — whose result feeds an ORDERING comparison (`aIdx > bIdx`, `aIdx < bIdx`) asserting that one edit site appears before or after another. The check fails when `needle` occurs MORE THAN ONCE in the target file and `indexOf` returns an occurrence other than the one the assertion means. The result is a VALIDATE that fails on a byte-perfect implementation, forcing the implementer either to deviate from the plan or to burn its retry budget on work that was already correct.

Four confirmed instances across three phases of the `figma-visual-first-track` run:

1. **Phase 5, Task 2** — `src.indexOf('executeInteractionSteps(page')` resolved to the function DEFINITION (`async function executeInteractionSteps(page, steps)`), which the ACTION places before `captureFrame()` and therefore before `page.goto`. The assertion `execIdx > gotoIdx` was false by construction. Fixed by searching the call-site-unique `'await executeInteractionSteps(page'`.
2. **Phase 6, Validation Commands Level 3** — `va.indexOf('resolution')` resolved to P2's precondition text ("no `resolution` field"), which sits before Phase B's confirmation step, breaking an `editIdx > confirmIdx` ordering assertion. Fixed by anchoring on `'resolved_at'`, which appears only in Phase C.
3. **Phase 6, Task 1 `checkIdx`** and 4. **Phase 6, Level 3 `p3CheckIdx`** — both searched a string sharing a PREFIX with a DIFFERENT task's insertion. They happened to resolve correctly only because of document order, not uniqueness. Tightened to a longer, genuinely unique phrase.

### Why the existing sibling check does not cover it

`R-COH-ACTION-VALIDATE-CONTRADICTION` detects cases where the ACTION's literal text and the VALIDATE's search string DISAGREE — e.g. the ACTION writes `` `resume_mode` `` with backticks and the VALIDATE searches for `resume_mode` without them. That check works (it caught six sites in Phase 6).

This class is different: ACTION and VALIDATE **agree** on the string. The problem is that the string is not UNIQUE in the target file. The two checks are complementary, not overlapping. Say so explicitly in the new check's prose, the way the neighbouring checks cross-reference each other.

### What to build

A deterministic check that, for each position-based search in a task's `**VALIDATE**` (and in the `## Validation Commands` Level 1–3 blocks), flags a search term the reviewer cannot establish as unique to the site the assertion means.

The tractable, high-value subset to enforce — a VALIDATE that satisfies ALL of:
- it calls `indexOf(...)` or `lastIndexOf(...)` on some source string, AND
- the resulting index variable feeds an ordering comparison (`>`, `<`, `>=`, `<=`) against ANOTHER index variable derived the same way (a plain `=== -1` / `!== -1` presence test is NOT in scope — non-uniqueness cannot break a presence test), AND
- the search string is a bare identifier or a short fragment that plausibly recurs.

The strongest, fully plan-local signal — directly checkable from the plan alone with no target-file access — is: **the plan's OWN ACTION text for that same task contains the search string more than once.** Make that the primary FAIL trigger. A secondary, weaker heuristic trigger is a search string that is a bare identifier with no disambiguating context (no leading `await `, no `function `/`const `/`### `/`## ` anchor, no surrounding punctuation) AND shorter than a stated character threshold — pick and state a concrete threshold rather than leaving it vague.

### The escape hatch — do NOT false-positive on the legitimate case

There is a real case where a non-unique search string is CORRECT by construction, and the plan-reviewer already reasoned about it correctly once by hand. Do not break that case.

In the Phase 6 plan, Task 1's `ruleIdx` searched a string that genuinely appears twice: the actionable-row-rule text is DELIBERATELY byte-identical in both `relay-execute.md`'s P3 and its Phase A.1 (the plan's own Pattern 3 mirrors it verbatim into both). No substring could disambiguate two intentionally identical strings, the first occurrence is always P3's copy, and P3 permanently precedes Phase A.1 with no task reordering either section. `indexOf`'s first-match is correct there — not lucky.

So the check must distinguish "ambiguous by accident" from "identical by design, first-match intended". Do this by requiring the plan to STATE the intent explicitly rather than by banning non-uniqueness outright: when a task's VALIDATE (or its immediately adjacent prose) carries the sentinel token `RELAY-FIRST-MATCH-INTENDED` followed by a non-empty justification, the check passes that site. A bare sentinel with no justification text does NOT satisfy the escape hatch — say so. This mirrors the `RELAY-MOCK-DATA` / `RELAY-MOCK-BEHAVIOR` sentinel idiom already used by `R-COH-VISUAL-SCOPE-PURITY` and `R-COH-SENTINEL-RESOLUTION-MISSING`, and it does not collide with them (the token does not contain the substring `RELAY-MOCK`).

### Placement, shape, and the FIXED-vs-conditional decision

The check is **UNCONDITIONAL — an 8th FIXED deterministic `R-COH-*` row, always emitted, never zero-emission.** Justify this in the check's own prose using the same reasoning `R-COH-ACTION-VALIDATE-CONTRADICTION` already gives for itself: zero-emission is reserved for checks gated on a project- or plan-level DECLARATION (`figma_track`, `phase_scope`, `design_source`, `test_frameworks`), and a position-based search is plan CONTENT, not a declaration — there is nothing to gate on. A plan with no position-based search at all passes VACUOUSLY (`passed: true`), exactly as `R-COH-ACTION-VALIDATE-CONTRADICTION` and `R-COH-VALIDATE-ALWAYS-PASS` do.

Insert the new `####` section in the `### Deterministic checks` block immediately AFTER `#### R-COH-ACTION-VALIDATE-CONTRADICTION` and its Known-limitation paragraph, and BEFORE `#### R-COH-DESIGN-SOURCE-MISSING` — i.e. the last of the fixed checks, immediately before the first conditional one. Follow the established shape of the sibling checks (`R-COH-VALIDATE-ALWAYS-PASS`, `R-COH-ACTION-VALIDATE-CONTRADICTION`, `R-COH-VISUAL-SCOPE-PURITY`, `R-COH-SENTINEL-RESOLUTION-MISSING`): a bolded lead paragraph stating the unconditional/zero-emission posture and its rationale, a bulleted detection procedure with lettered sub-conditions, an explicit "Otherwise → `{ "id": ..., "passed": true }`" terminal bullet, and a `reason` discipline that quotes the offending fragments VERBATIM (the task heading, the search string, and the ordering comparison).

### The mandatory Known limitation paragraph

`plan-reviewer`'s tool grant is `Read, Edit, Write` — **no Bash, no Grep, no Glob**. It cannot execute the VALIDATE and cannot scan the target file freely. The check is a textual analysis of the PLAN's own content (the ACTION text and the VALIDATE text), performed while reading the plan. Be honest about that bound in an explicit **Known limitation (recorded, not blocking)** paragraph in the same voice and position as the ones already attached to `R-COH-ACTION-VALIDATE-CONTRADICTION`, `R-COH-VISUAL-SCOPE-PURITY`, and `R-COH-SENTINEL-RESOLUTION-MISSING`. It must state plainly that the reviewer cannot verify true uniqueness in the target file (that would require reading the file and counting occurrences — outside this agent's tool surface), so the check detects the plan-local proxy signals only; it can miss a search string that is non-unique in the target file while appearing once in the plan's ACTION text, and it can false-positive on an incidental repetition. It is a plan-authoring-time gate, not the final safety net; the real enforcement is the Implementer actually running the VALIDATE.

### Bookkeeping that MUST be updated in the same change

1. **The `### Logging discipline` arithmetic prose** in `plan-reviewer.md`. RE-DERIVE the figures from the live file — do NOT trust any numbers quoted second-hand. As of the current file the paragraph reads `8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20 rows` baseline, widening to `15 to 23 rows` maximal with "the range never extends to a 24th row", and preserving `15 to 22` for a `figma_track: true` project whose plan has no `phase_scope` row. Adding one FIXED row shifts every figure by exactly one: baseline `16 to 21`, maximal `16 to 24`, "never extends to a **25th** row", and `16 to 23` for the no-`phase_scope` figma case. The sentence "Each of the four conditional rows is independently zero-emission (contributes nothing) when its own gating condition is not met" must be PRESERVED with "four" intact — the new check is FIXED, not a fifth conditional row. Verify all of this against the live file before editing; the paragraph is around lines 720–749.

2. **The APPROVED JSONL example** in the `## review.jsonl format` section (around lines 1046–1062) currently lists exactly the seven fixed `R-COH-*` rows ending at `{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }`. Append the new row after it so the worked example stays consistent with the arithmetic. This mirrors the precedent in `scripts/validate/checks/figma-track-ac2-reuse-enforcement.test.mjs`, which asserts BOTH the arithmetic block and the JSONL example for `code-reviewer.md`'s equivalent row.

3. **Three existing test files assert the OLD arithmetic wording verbatim and WILL break.** Update exactly the affected numerals/assertions in each, changing nothing else:
   - `scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs` — the AC-A5 test near line 362 asserts `'8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20 rows'`, `'15 to 23 rows'`, `'24th row'`, and a later test near lines 397–398 asserts `'15 to 20'` and `'15 to 23'`. Its file-header comment block (roughly lines 32–76) also narrates the old numerals and should be updated to stay truthful.
   - `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs` — the test near line 492 and its two long verbatim string assertions at roughly lines 500 and 506 carry `15 to 23 rows`, `24th row`, `baseline 15–20`, and `the 15–22 range`. Note these use EN DASHES (`–`, U+2013) in the "15–20"/"15–22" spots and ASCII "to" in the "15 to 23" spots — preserve each site's existing punctuation exactly, changing only the digits and the ordinal. Its header comment (roughly lines 115–127) also narrates the old numerals.
   - `scripts/validate/checks/figma-track-phase5.test.mjs` — the regex assertion near line 361 matches `baseline 15–20 range is exact for every non-Figma project` (en dash). Its header comment near lines 138–156 narrates the old numerals too.

   Do NOT touch `scripts/validate/checks/figma-track-ac2-reuse-enforcement.test.mjs` — its `5 (deterministic R-COH-*)` / `14 to 20 rows` assertions target `plugins/relay/agents/code-reviewer.md`, a DIFFERENT agent with its own independent arithmetic. Do NOT touch `scripts/validate/checks/figma-visual-first-track-phase4.test.mjs` — its only hit is a prose comment mentioning a different check by name, with no arithmetic assertion.

4. **A new dated entry in `docs/decisions.md`** recording the check, the FIXED-not-conditional decision and its rationale, the `RELAY-FIRST-MATCH-INTENDED` escape hatch, and the arithmetic shift — following the shape of the existing `[2026-07-26] R-COH-ACTION-VALIDATE-CONTRADICTION` entry (around line 880) which is the direct precedent. Today's date is 2026-07-28.

*R8b (PRD AC-N token check) does not apply in description mode — no `(PRD AC-N)` token required.*

## Summary

`plan-reviewer`'s additive R-COH-* coherence layer has no check for a distinct defect class from the one `R-COH-ACTION-VALIDATE-CONTRADICTION` catches: a `**VALIDATE**` command computes `str.indexOf(needle)`/`lastIndexOf(needle)` and feeds the result into an ORDERING comparison asserting one edit site precedes or follows another — and the assertion fails on a byte-perfect implementation whenever `needle` recurs in the target file, because `indexOf` silently resolves to whichever occurrence, not necessarily the one the assertion means. Four confirmed, directly-verified instances across Phases 5 and 6 of the `figma-visual-first-track` run demonstrate this is a real, recurring authoring defect, not a hypothetical. This phase adds an 8th FIXED (unconditional, never zero-emission) deterministic check, `R-COH-VALIDATE-SEARCH-AMBIGUOUS`, positioned immediately after `R-COH-ACTION-VALIDATE-CONTRADICTION`'s Known-limitation paragraph and before `R-COH-DESIGN-SOURCE-MISSING`, using a primary plan-local signal (same-task ACTION duplication) and a secondary heuristic (short bare identifier, no disambiguating context, under a stated 20-character threshold), with an explicit `RELAY-FIRST-MATCH-INTENDED` escape hatch for the one legitimate case (a deliberately duplicated, first-match-correct-by-document-order string) already proven in this exact codebase's own history. The phase also re-derives the `### Logging discipline` rubric[]-length arithmetic (7→8 fixed checks; 15–20/15–23/24th → 16–21/16–24/25th; 15–22 → 16–23), extends the JSONL worked example, and records the decision in `docs/decisions.md`. Three existing tests assert the pre-change arithmetic and will go stale; this plan routes their fix to the test pair (never the Implementer) because `code-reviewer`'s R-X guard is a blanket, unconditional test-glob match that would straight-FAIL any Implementer diff touching them regardless of how mechanical the edit is.

## User Story

As a developer relying on `/relay-plan-review` to gate DRAFT plans before implementation,
I want the reviewer to catch a task whose own position-based VALIDATE search could resolve to the wrong occurrence in the target file,
So that a plan that is byte-perfect on paper never fails its own VALIDATE at implementation time because of an avoidable, mechanically-detectable naming ambiguity.

## Problem Statement

`plan-reviewer`'s R1–R8 structural rubric and its seven existing deterministic R-COH-* checks validate a DRAFT plan's shape, cross-references, ACTION/VALIDATE literal agreement, and validation-command exit-code semantics — but none of them examine whether a position-based search string inside a VALIDATE's ordering assertion is actually unique in the file it searches. `R-COH-ACTION-VALIDATE-CONTRADICTION` catches ACTION and VALIDATE disagreeing on a literal; it has no mechanism for the case where they agree on a literal that simply recurs. This escaped review four times across Phases 5 and 6 of the `figma-visual-first-track` run: `PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md` Task 2 authored both the definition `async function executeInteractionSteps(page, steps) {` (line 393) and the call site `await executeInteractionSteps(page, interactionSteps);` (line 419) in the SAME task's own ACTION text, then an early VALIDATE draft searching the ambiguous `'executeInteractionSteps(page'` would have resolved to the definition (which precedes `captureFrame()`, and therefore `page.goto`), breaking an `execIdx > gotoIdx` ordering assertion the ACTION's own literal compliance could never satisfy; `PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md` shows three more sites of the same class in its own Task 1 and Validation Commands Level 3 blocks. None of these defects involve an ACTION/VALIDATE disagreement — `R-COH-ACTION-VALIDATE-CONTRADICTION` would find nothing wrong with any of them. Nothing in the authoring pipeline currently catches a non-unique position-based search before implementation, when a plan-authoring-time fix is cheapest.

## Solution Statement

Add an 8th FIXED (unconditional — always emitted, never zero-emission) deterministic check, `R-COH-VALIDATE-SEARCH-AMBIGUOUS`, to `plugins/relay/agents/plan-reviewer.md`'s R-COH-* coherence layer, positioned immediately after `R-COH-ACTION-VALIDATE-CONTRADICTION`'s Known-limitation paragraph and before `R-COH-DESIGN-SOURCE-MISSING`. For each in-scope `indexOf`/`lastIndexOf`-based ordering comparison (a bare `=== -1`/`!== -1` presence test is out of scope), the check applies the escape hatch first (`RELAY-FIRST-MATCH-INTENDED` + non-empty justification passes the site unconditionally), then two fail triggers: (a) the plan's own ACTION text for that same task contains the search string more than once — the strongest plan-local signal; (b) the search string is a bare identifier under 20 characters with no disambiguating context — a weaker heuristic, its threshold grounded in the closest transferable prior art found during research (bioinformatics' "Maximal Unique Match" concept: uniqueness AND a minimum-length floor together, default 20 characters). A plan with no in-scope site passes vacuously. The check closes with a Known-limitation paragraph matching its siblings' shape, honestly bounding what a `Read, Edit, Write`-only agent can verify. The `### Logging discipline` arithmetic, the JSONL worked example, and `docs/decisions.md` are all updated to keep the cross-cutting numerals internally consistent. Three existing tests that assert the pre-change arithmetic (and, for one of them, an exact `#### R-COH-*` heading count) go stale; this plan explicitly routes their fix to the test pair as `EXISTING_TEST_UPDATED` follow-up, never an Implementer task, because `code-reviewer`'s R-X guard would straight-fail any Implementer diff touching a `*.test.mjs` path regardless of the edit's mechanical nature.

## Metadata

| Field | Value |
|---|---|
| Type | Reviewer rubric extension (new FIXED deterministic R-COH-* check) + cross-cutting arithmetic update + decision record |
| Complexity | Low-Medium |
| Systems Affected | `plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`; downstream (test-pair follow-up only, no task in this plan touches them): `scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs`, `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`, `scripts/validate/checks/figma-track-phase5.test.mjs` |
| Dependencies | None — self-contained edit to an already-shipped reviewer agent; no other in-flight phase must land first |
| Estimated Tasks | 4 |
| Source PRD line ref | N/A — description mode, no source PRD |
| phase_type | scaffold |

**On `phase_type: scaffold` despite adding new structural/behavioral capability:** this phase's only deliverables are prompt/documentation markdown content (`plan-reviewer.md`, `decisions.md`); there is no `.mjs` application-code surface for the declared `node:test` framework to exercise. Every legitimate VALIDATE command this phase emits is necessarily grep/content-invariant-shaped (confirming specific strings are present or absent, or a heading's relative position, in the two target files), which requires `phase_type: scaffold` to receive the correct `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption — never `feature`. This mirrors the established precedent of every prior phase of this exact shape in this repo, most directly `PRPs/plans/completed/plan-reviewer-action-validate-contradiction-check.plan.md` (the immediate predecessor to this plan, which shipped the 7th fixed check via the identical `scaffold` classification and reasoning).

No `design_source` or `phase_scope` Metadata row: `docs/context/methodology.md` does not declare `figma_track: true` (confirmed: no `figma_track` key present in its frontmatter at all), so per `docs/context/plan-template.md`'s dual-branch rule this table carries no `design_source` row and the plan body carries no `## Design Source` section. This is also a description-mode plan with no source PRD, so no `phase_scope` row is added either.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/agents/plan-reviewer.md` | 441-498 | `R-COH-ACTION-VALIDATE-CONTRADICTION`'s full section through its Known-limitation paragraph, plus `R-COH-DESIGN-SOURCE-MISSING`'s heading — the exact insertion boundary and the primary shape precedent |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 720-749 | `### Logging discipline` — the rubric[]-length arithmetic paragraph this phase must update for the 7→8 fixed-check shift |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1042-1066 | `## review.jsonl format` — the JSONL worked example this phase extends with a new row |
| P0 | `PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md` | 387-478 | Task 2's own ACTION (definition at line 393 before call site at line 419, same task, same ACTION text) and its shipped, FIXED VALIDATE (`await executeInteractionSteps(page` at line 471) — the real, verified instance of the primary-trigger shape this check now catches, and its own correct fix |
| P0 | `PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md` | 189-239 | Task 1's own VALIDATE — both the legitimate `ruleIdx` (line 232, deliberately duplicated, first-match-correct-by-document-order — the escape-hatch precedent) and the `checkIdx` risk (line 222) this check's primary trigger targets |
| P0 | `PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md` | 508-565, 625-667 | Task 7's own P2 precondition text ("no `resolution` field", ~line 518) and the aggregate Level 3 block's `editIdx`/`p3CheckIdx` (lines 648, 631) — the shipped, FIXED `resolved_at` anchor and the long-phrase tightening |
| P1 | `docs/decisions.md` | 880-982 | `[2026-07-26]` R-COH-ACTION-VALIDATE-CONTRADICTION entry — the direct shape precedent for this phase's own new decisions.md entry, and the entry whose numerals this phase's own entry explicitly supersedes |
| P1 | `plugins/relay/agents/code-reviewer.md` | 370-401 | `R-X` — the blanket, unconditional test-glob pathspec match ("no first warning grace period", D17) that is the mechanical reason this plan routes its three test-file fixes to the test pair, never the Implementer |
| P2 | `scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs` | 311-342, 362-378 | The AC-A4 exact-11-headings-count test and the AC-A5 arithmetic test — both required test-pair follow-up; the AC-A4 count test was found independently during this plan's own grounding, not named in the dispatching description |
| P2 | `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs` | 492-510 | The AC-A2 rubric-length test asserting `15 to 23 rows`/`24th row`/`15–20`/`15–22` — required test-pair follow-up |
| P2 | `scripts/validate/checks/figma-track-phase5.test.mjs` | 345-363 | The AC-4/AC-A1 rubric-length regex test asserting `baseline 15–20 range` — required test-pair follow-up |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:484-498
  Otherwise (no offending task found — including vacuously, on a
  plan with zero tasks matching this shape at all) →
  `{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }`.

**Known limitation (recorded, not blocking):** this is a heuristic
textual scan over plan-authored prose, not real execution —
`plan-reviewer` has no `Bash` tool and cannot execute a task's
VALIDATE command to observe its real exit code; it matches literals
textually against the ACTION prose, so it can both miss an obfuscated
or paraphrased contradiction (the literal reworded, or split across a
sentence) and false-positive on an incidental match. It is a
plan-authoring-time gate, not the final safety net; the real
enforcement remains the Implementer actually running the task's own
VALIDATE command.

#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active
```
Copied into Task 1 as the exact byte-accurate insertion boundary — the new `#### R-COH-VALIDATE-SEARCH-AMBIGUOUS` section is inserted immediately after the first fragment and immediately before the second.

```
# SOURCE: PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md:393, 419, 468-478
async function executeInteractionSteps(page, steps) {
  ...
}
...
    const interactionSteps = parseInteractionScript(frame.interaction);
    if (interactionSteps.length > 0) {
      await executeInteractionSteps(page, interactionSteps);
    }
...
node -e "
const src = require('fs').readFileSync('plugins/relay/scripts/visual/capture.mjs', 'utf8');
const gotoIdx = src.indexOf('page.goto(frame.route');
const execIdx = src.indexOf('await executeInteractionSteps(page');
const shotIdx = src.indexOf('page.screenshot(');
if (!(gotoIdx > -1 && execIdx > gotoIdx && shotIdx > execIdx)) {
  console.error('FAIL: executeInteractionSteps must be wired strictly between page.goto and page.screenshot in captureFrame');
  process.exit(1);
}
```
Cited in `## Problem Statement` above as the real, verified instance of the primary-trigger shape (a task's own ACTION text authors both the function definition and its call site, so the bare fragment `executeInteractionSteps(page` occurs twice within that same task's ACTION); the shipped VALIDATE already anchors on the call-site-unique `await executeInteractionSteps(page`, demonstrating the correct fix this check's `reason` message should point authors toward.

```
# SOURCE: PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md:216-238
const ruleIdx = src.indexOf('every comma-separated phase number listed has');
if (ruleIdx < 0 || ruleIdx > checkIdx) {
  console.error('FAIL: the existing actionable-row rule bullets must still precede the new check, unmodified');
  process.exit(1);
}
```
Copied into `## The escape hatch` reasoning above as the real, verified LEGITIMATE case: the actionable-row rule text is mirrored verbatim into both `relay-execute.md`'s `P3` and its `Phase A.1` by that plan's own Pattern 3, so `'every comma-separated phase number listed has'` genuinely occurs twice by design; `indexOf`'s first-match (P3's copy, which permanently precedes Phase A.1 in document order) is correct there, not lucky — exactly the shape `RELAY-FIRST-MATCH-INTENDED` is designed to exempt.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:720-749
The total `rubric[]` length per run is `8 (R1–R8) + 7 (deterministic
R-COH-*) + ≤5 (K=5 pass) = 15 to 20 rows` for a project where
`figma_track` is absent/`false` (the baseline case — unchanged from
before this section existed). ... Together these widen the range to
`15 to 23 rows` in the maximal case (...) — the range never extends to
a 24th row, because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` can never both fire on the same
plan. Each of the four conditional rows is independently zero-emission
(contributes nothing) when its own gating condition is not met, so the
baseline 15–20 range is exact for every non-Figma project, and the
15–22 range from the prior `design_source` shipment remains exact for
a `figma_track: true` project whose plan has no `phase_scope` row at
all (...).
```
Copied into Task 2 as the exact current paragraph. Task 2 applies four precise substitutions within it (7→8; `15 to 20 rows`→`16 to 21 rows`; `15 to 23 rows`→`16 to 24 rows`; `24th row`→`25th row`; `15–20`/`15–22`→`16–21`/`16–23`) while leaving the "Each of the four conditional rows..." sentence and the closing "exactly 8" sentence untouched.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:1061-1062
    { "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }
  ],
```
Copied into Task 3 as the exact two-line anchor: a comma is appended to the first line and a new row line is inserted before the second.

```
# SOURCE: docs/decisions.md:1024-1026
---

<!-- Template for future entries:
```
Copied into Task 4 as the exact insertion anchor, re-read directly from the live file (a prior draft of this block mis-anchored on line 982-984, which is actually the `---` closing `[2026-07-26]` followed by a DIFFERENT, earlier `[2026-07-27] Implement-time visual gate` entry at line 984 — not the `[2026-07-27] Orchestrator resumability` entry, whose own heading is 22 lines later at line 1006 and which itself closes with its own `---` at line 1024): the new `## [2026-07-28]` entry is inserted immediately after this `---` — which closes the `[2026-07-27] Orchestrator resumability + /relay-visual-approve` entry, the LAST real entry in the file, chronologically after BOTH `[2026-07-27]` entries — and immediately before this `<!-- Template for future entries:` comment block, i.e. appended as the file's new last real entry.

```
# SOURCE: plugins/relay/agents/code-reviewer.md:370-395
### R-X — Universal test-modification guard (straight fail, D17)
...
'**/*.test.jsx' '**/*.test.mjs' '**/*.test.cjs' '**/spec/**'
...
If the result is non-empty AND the input `mode` is `"standard"`
(NOT post-arbitration-upheld): straight FAIL with the file paths
listed verbatim. D17 of the source PRD: no "first warning" grace
period — any test-glob match in standard mode without an upheld
dispute is an immediate R-X failure with the file paths recorded
in the jsonl `reason` field.
```
Cited in `## Notes` as the exact mechanical reason this plan routes its three test-file fixes to the test pair rather than an Implementer Step-by-Step Task — R-X is a blanket path-glob match with zero semantic reasoning about edit intent.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/agents/plan-reviewer.md` | UPDATE | Insert the new `#### R-COH-VALIDATE-SEARCH-AMBIGUOUS` deterministic check; update the `### Logging discipline` rubric-arithmetic paragraph; add the matching JSONL example row |
| `docs/decisions.md` | UPDATE | Add the `## [2026-07-28]` entry recording the new check, its unconditional-vs-zero-emission rationale, the `RELAY-FIRST-MATCH-INTENDED` escape hatch, and the arithmetic-numeral supersession |

## NOT Building (Scope Limits)

- General target-file uniqueness verification — `plan-reviewer` has no `Bash`/`Grep`/`Glob` tool; the check is scoped to the plan-local proxy signals only (same-task ACTION duplication; unqualified short identifiers), never true target-file occurrence counting.
- Any change to `plugins/relay/agents/plan-writer.md`'s own VALIDATE-authoring guidance to preemptively avoid this ambiguity class — out of scope; this phase adds only the REVIEW-side structural check.
- Actually executing a task's VALIDATE command to observe its real occurrence count — `plan-reviewer` has no `Bash` tool; this check is, and remains, a textual scan.
- Any change to the K=5 bounded LLM judgment pass's taxonomy — this is a new FIXED deterministic check, not a K=5 finding class.
- Updating the three existing test files' assertions directly as an Implementer Step-by-Step Task — `code-reviewer.md`'s R-X guard (lines 370-401) is a blanket, unconditional test-glob pathspec match that would straight-FAIL any Implementer diff touching a `*.test.mjs` path regardless of how mechanical the edit is; this plan routes these three fixes to the test pair instead (see Notes), whose diff `code-reviewer` never reviews.
- Any change to the four existing conditional (`figma_track`/`phase_scope`-gated) checks' own logic, gating, or wording beyond the arithmetic paragraph's numerals — `R-COH-DESIGN-SOURCE-MISSING`, `R-COH-DESIGN-GROUNDED`, `R-COH-VISUAL-SCOPE-PURITY`, and `R-COH-SENTINEL-RESOLUTION-MISSING` are untouched.
- A retroactive re-review of already-APPROVED or already-IMPLEMENTED plans (e.g. re-flagging the four historical instances after the fact) — out of scope; the check applies only to future plan-reviewer runs.
- Introducing the literal substrings `15 to 20 rows`, `15 to 23 rows`, or `24th row` anywhere in `plugins/relay/agents/plan-reviewer.md` — the hard prohibition this phase's own numeral changes must respect.
- Modifying `code-reviewer.md`'s R-X check itself (e.g. to carve out a "mechanical numeral update" exception) — out of scope for this change; not requested, and a change to a guard explicitly designed with "no first warning grace period" warrants its own dedicated, deliberate review, not a byproduct of this plan.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/agents/plan-reviewer.md — insert R-COH-VALIDATE-SEARCH-AMBIGUOUS deterministic check

**ACTION**: Immediately after `R-COH-ACTION-VALIDATE-CONTRADICTION`'s Known-limitation paragraph (ending "...the real enforcement remains the Implementer actually running the task's own VALIDATE command.") and immediately before the existing `#### R-COH-DESIGN-SOURCE-MISSING — design_source declared when figma_track is active` heading, insert the following new subsection verbatim:

```
#### R-COH-VALIDATE-SEARCH-AMBIGUOUS — position-based search terms feeding an ordering comparison must be provably unique, or explicitly sentineled as first-match-intended

**Unconditional — always emitted, never zero-emission.** Like
`R-COH-VALIDATE-ALWAYS-PASS` and `R-COH-ACTION-VALIDATE-CONTRADICTION`,
this check has no project- or plan-level declaration to gate on — a
position-based search inside a `**VALIDATE**:` command or a `##
Validation Commands` block is plan CONTENT, not a declaration
(`figma_track`, `phase_scope`, `design_source`, and `test_frameworks`
are the only gating declarations any conditional check in this layer
keys off, and none of them bears on whether a plan happens to author
an `indexOf`/`lastIndexOf` ordering assertion) — so it always
contributes exactly one row to `rubric[]`. Its nearest sibling in this
respect is `R-COH-ACTION-VALIDATE-CONTRADICTION`: that check catches
ACTION and VALIDATE DISAGREEING on a literal — the ACTION's literal
text and the VALIDATE's search string contradict each other. This
check catches a different class: ACTION and VALIDATE AGREE on the
literal, but the literal is not proven unique in the file the
VALIDATE searches. The two checks are complementary, not overlapping
— a task can trip one, both, or neither.

- Scope: every `**VALIDATE**:` command under `## Step-by-Step Tasks`,
  and every command in the `## Validation Commands` Level 1–3 blocks.
- A site is IN SCOPE for this check only when ALL of the following
  hold:
  - (a) the command calls `indexOf(...)` or `lastIndexOf(...)` on
    some source string;
  - (b) the resulting index value feeds an ORDERING comparison (`>`,
    `<`, `>=`, `<=`) against ANOTHER index value derived the same way
    (via its own `indexOf`/`lastIndexOf` call) — a bare `=== -1` /
    `!== -1` presence test is OUT OF SCOPE; non-uniqueness cannot
    break a presence test;
  - (c) the search string passed to `indexOf`/`lastIndexOf` is a bare
    identifier or a short fragment that plausibly recurs — not, for
    instance, a full sentence or an already-disambiguated call-site
    fragment.
- For each in-scope site, apply the ESCAPE HATCH first: if that
  site's `**VALIDATE**:` text, or the prose immediately adjacent to
  it, carries the sentinel token `RELAY-FIRST-MATCH-INTENDED`
  followed by a non-empty justification, the site PASSES — do not
  evaluate the two fail triggers below for it. A bare sentinel with
  no justification text does NOT satisfy the escape hatch; treat it
  as absent and continue to the fail triggers.
- Otherwise, apply two fail triggers, in order:
  - **(a) Primary trigger — plan-local duplication.** FAILS when the
    plan's OWN `**ACTION**:` text for that SAME task contains the
    search string more than once. This is the strongest signal
    available without reading the target file: if the plan's own
    prose already repeats the string, the target file — which the
    ACTION describes editing — plausibly repeats it too.
  - **(b) Secondary trigger — unqualified short identifier
    (heuristic, weaker).** FAILS when the search string is a bare
    identifier (a contiguous run of letters/digits/underscore, no
    embedded whitespace or punctuation) with NO disambiguating
    context — no leading `await `, no `function `/`const `/`### `/
    `## ` anchor immediately before it, no surrounding punctuation
    (parens, colons, quotes-within-the-match, etc.) — AND the string
    is shorter than **20 characters**. The 20-character threshold
    mirrors the closest transferable prior art found during this
    check's own research grounding: the bioinformatics "Maximal
    Unique Match" concept trusts a substring as a reliable anchor
    only when it clears BOTH a uniqueness test and a minimum-length
    floor (default 20 characters) — a short match is not trusted
    alone, matching this check's own two-trigger design.
  - Either trigger firing FAILS the site. `reason` quotes VERBATIM:
    the offending `### Task <i>:` heading (or the Validation Commands
    Level name), the search string, and the ordering comparison
    expression.
- Otherwise (no in-scope site found at all — including vacuously, on
  a plan with zero `indexOf`/`lastIndexOf`-based ordering comparisons
  — or every in-scope site either passes both triggers or carries a
  justified `RELAY-FIRST-MATCH-INTENDED` sentinel) →
  `{ "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }`.

**Known limitation (recorded, not blocking):** `plan-reviewer`'s tool
grant is `Read, Edit, Write` — no `Bash`, no `Grep`, no `Glob` — so
this check cannot execute a VALIDATE command and cannot scan the
target file to count real occurrences of the search string; verifying
true uniqueness would require reading the target file and counting
matches, outside this agent's tool surface. The check therefore
detects the plan-local proxy signals only (same-task ACTION
duplication; unqualified short identifiers): it can miss a search
string that is genuinely non-unique in the target file while
appearing only once in the plan's own ACTION text, and it can
false-positive on an incidental, harmless repetition or on a short
identifier that happens to be unique in the target file. It is a
plan-authoring-time gate, not the final safety net; the real
enforcement remains the Implementer actually running the task's own
VALIDATE command and observing whether it passes against the real
file.
```

**MIRROR**: Patterns to Mirror blocks 1 (insertion boundary), 2 (Phase 5 primary-trigger real instance), 3 (Phase 6 escape-hatch legitimate instance).

**ADDRESSES**: AC-A1, AC-A2, AC-A3, AC-A4, AC-A5, AC-A6, AC-A10

**VALIDATE**:
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
grep -q "^#### R-COH-VALIDATE-SEARCH-AMBIGUOUS" "$FILE"
grep -q "RELAY-FIRST-MATCH-INTENDED" "$FILE"
grep -q "Known limitation (recorded, not blocking)" "$FILE"
contradiction_line=$(grep -n "^#### R-COH-ACTION-VALIDATE-CONTRADICTION" "$FILE" | head -1 | cut -d: -f1)
new_check_line=$(grep -n "^#### R-COH-VALIDATE-SEARCH-AMBIGUOUS" "$FILE" | head -1 | cut -d: -f1)
design_source_line=$(grep -n "^#### R-COH-DESIGN-SOURCE-MISSING" "$FILE" | head -1 | cut -d: -f1)
if [ "$new_check_line" -le "$contradiction_line" ] || [ "$new_check_line" -ge "$design_source_line" ]; then
  echo "FAIL: R-COH-VALIDATE-SEARCH-AMBIGUOUS is not positioned between R-COH-ACTION-VALIDATE-CONTRADICTION and R-COH-DESIGN-SOURCE-MISSING"
  exit 1
fi
echo "PASS: new check present with escape hatch and Known-limitation paragraph, correctly positioned"
```

### Task 2: UPDATE plugins/relay/agents/plan-reviewer.md — widen the rubric-count arithmetic to 8 fixed deterministic checks

**ACTION**: Within the `### Logging discipline` paragraph (Patterns to Mirror block 4), using `Edit` with `old_string` copied verbatim from the live file (preserving the real line break that today falls after "deterministic" — this exact span already wraps mid-phrase in the live file, confirmed by this plan's own grounding reads, exactly as the immediately preceding 6→7 shift's own plan noted for the identical span), apply these four precise substitutions and no others:

1. Replace the inline-code span `` `8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20 rows` `` with `` `8 (R1–R8) + 8 (deterministic R-COH-*) + ≤5 (K=5 pass) = 16 to 21 rows` ``.
2. Replace `` `15 to 23 rows` `` with `` `16 to 24 rows` ``.
3. Replace "the range never extends to a 24th row" with "the range never extends to a 25th row".
4. Replace "so the baseline 15–20 range is exact for every non-Figma project, and the 15–22 range from the prior" with "so the baseline 16–21 range is exact for every non-Figma project, and the 16–23 range from the prior".

Leave the sentence "Each of the four conditional rows is independently zero-emission..." and the closing "exactly 8" wording sentence untouched — the new check is FIXED, not a fifth conditional row, so "four conditional rows" stays correct.

**MIRROR**: Patterns to Mirror block 4 (the current arithmetic paragraph, full text).

**ADDRESSES**: AC-A7

**VALIDATE**:
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
grep -q "8 (deterministic" "$FILE"
grep -q "16 to 21 rows" "$FILE"
grep -q "16 to 24 rows" "$FILE"
grep -q "25th row" "$FILE"
grep -q "Each of the four conditional rows" "$FILE"
if grep -q "15 to 20 rows" "$FILE"; then
  echo "FAIL: stale '15 to 20 rows' text still present in $FILE"
  exit 1
fi
if grep -q "15 to 23 rows" "$FILE"; then
  echo "FAIL: stale '15 to 23 rows' text still present in $FILE"
  exit 1
fi
if grep -q "24th row" "$FILE"; then
  echo "FAIL: stale '24th row' wording still present in $FILE"
  exit 1
fi
echo "PASS: rubric-count prose updated to 8 fixed deterministic checks; 16-21/16-24/25th numerals present; four-conditional-rows wording preserved; no stale numerals remain"
```

### Task 3: UPDATE plugins/relay/agents/plan-reviewer.md — add JSONL example row for the new check

**ACTION**: In the `## review.jsonl format` section's example JSON code block (Patterns to Mirror block 5), replace:
```
    { "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true }
  ],
```
with:
```
    { "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true },
    { "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }
  ],
```

**MIRROR**: Patterns to Mirror block 5.

**ADDRESSES**: AC-A8

**VALIDATE**:
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
grep -q '"id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true' "$FILE"
grep -A1 '"id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true' "$FILE" | grep -q "R-COH-VALIDATE-SEARCH-AMBIGUOUS"
echo "PASS: JSONL example row for R-COH-VALIDATE-SEARCH-AMBIGUOUS present immediately after R-COH-ACTION-VALIDATE-CONTRADICTION"
```

### Task 4: UPDATE docs/decisions.md — add the [2026-07-28] decision entry

**ACTION**: Immediately after the `---` (line 1024 of the live file) that closes the `[2026-07-27] Orchestrator resumability + /relay-visual-approve` entry — itself the file's LAST real entry, appearing 22 lines after a DIFFERENT, earlier `[2026-07-27] Implement-time visual gate` entry that starts at line 984; do not anchor on a bare `2026-07-27`, which matches both — and immediately before the `<!-- Template for future entries:` comment block (line 1026) (Patterns to Mirror block 6), insert:

```
## [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS: an 8th FIXED deterministic plan-reviewer check catching non-unique position-based search terms in ordering VALIDATE assertions; rubric[] arithmetic shifts to 16–21/16–24

**Context:** `plan-reviewer`'s additive R-COH-* coherence layer had no
check for a distinct defect class from the one
`R-COH-ACTION-VALIDATE-CONTRADICTION` (shipped 2026-07-26) catches: a
`**VALIDATE**` command computes `str.indexOf(needle)` (or
`lastIndexOf`) and feeds the result into an ORDERING comparison
(`aIdx > bIdx`, etc.) asserting one edit site precedes or follows
another — and the assertion fails on a byte-perfect implementation
whenever `needle` occurs more than once in the target file, because
`indexOf` silently resolves to whichever occurrence, not necessarily
the one the assertion means. Unlike `R-COH-ACTION-VALIDATE-CONTRADICTION`
(where ACTION and VALIDATE DISAGREE on a literal), this class is one
where ACTION and VALIDATE AGREE on the string — the string is simply
not unique in the file being searched. Four confirmed instances across
three phases of the `figma-visual-first-track` run, all now fixed in
their respective archived plans:
`PRPs/plans/completed/figma-visual-first-track-phase-5-implement-time-gate.plan.md`
Task 2 (`executeInteractionSteps(page` resolved to the function
definition at the task's own insertion rather than the call site,
fixed by anchoring on the call-site-unique `await
executeInteractionSteps(page`); and three sites in
`PRPs/plans/completed/figma-visual-first-track-phase-6-orchestrator-wiring.plan.md`
— its Validation Commands Level 3 `editIdx` (resolved to a
precondition's own "no `resolution` field" text, fixed by anchoring on
`resolved_at`), and its Task 1 `checkIdx`/Level 3 `p3CheckIdx` pair
(tightened to a longer, genuinely unique phrase). The same plan's own
Task 1 `ruleIdx` demonstrates the LEGITIMATE inverse case: a search
string that is deliberately byte-identical in two places by design
(the actionable-row rule text, mirrored verbatim into both `P3` and
`Phase A.1`), where `indexOf`'s first-match is correct, not lucky,
because document order permanently guarantees which copy comes first.

**Decision:** `plan-reviewer` gains an 8th FIXED deterministic
`R-COH-*` check, `R-COH-VALIDATE-SEARCH-AMBIGUOUS`, positioned
immediately after `R-COH-ACTION-VALIDATE-CONTRADICTION`'s Known
limitation paragraph and immediately before
`R-COH-DESIGN-SOURCE-MISSING` — preserving "fixed checks first,
conditional checks after". For each position-based search
(`indexOf`/`lastIndexOf`) whose result feeds an ordering comparison
against another same-derived index (a bare `=== -1`/`!== -1` presence
test is out of scope), the check applies a primary, plan-local
signal — the plan's OWN `**ACTION**:` text for that same task
contains the search string more than once — and a secondary, weaker
heuristic: a bare identifier under 20 characters with no
disambiguating context (no leading `await `, no
`function `/`const `/`### `/`## ` anchor, no surrounding punctuation).
An escape hatch — the sentinel token `RELAY-FIRST-MATCH-INTENDED`
followed by a non-empty justification, adjacent to the VALIDATE — lets
a plan author declare a deliberately-duplicated, first-match-intended
site (mirroring the escape-hatch idiom `R-COH-VISUAL-SCOPE-PURITY`/
`R-COH-SENTINEL-RESOLUTION-MISSING` already established for
`RELAY-MOCK-DATA`/`RELAY-MOCK-BEHAVIOR`, using a deliberately
non-colliding token). Like its nearest sibling
`R-COH-ACTION-VALIDATE-CONTRADICTION`, it is a textual scan performed
by the reviewer over the plan already in memory (`plan-reviewer`'s
tool grant is `Read, Edit, Write` — no `Bash`, no `Grep` — so it
cannot execute the VALIDATE command itself or count real occurrences
in the target file), and closes with a "Known limitation" paragraph
in the same voice.

**Deliberately UNCONDITIONAL, not a 5th zero-emission conditional
row.** Mirroring `R-COH-ACTION-VALIDATE-CONTRADICTION`'s own
reasoning: a position-based search inside a `**VALIDATE**:` command is
plan CONTENT, not a project- or plan-level declaration
(`figma_track`, `phase_scope`, `design_source`, `test_frameworks` are
the only gating declarations any conditional check in this layer keys
off) — there is nothing to gate on. It therefore always contributes
exactly one row to `rubric[]`, `passed: true` vacuously on a plan with
no in-scope position-based search at all.

**Rubric[] arithmetic shifts.** The `### Logging discipline`
paragraph in `plugins/relay/agents/plan-reviewer.md` is updated for 8
fixed deterministic checks (was 7): baseline (non-Figma)
`8 (R1–R8) + 8 (deterministic R-COH-*) + ≤5 (K=5 pass) = 16 to 21
rows` (was 15 to 20); maximal (two design rows plus exactly one of
the two mutually-exclusive `phase_scope` rows, plus the full 5-row
K=5 pass) = `16 to 24 rows` (was 15 to 23); the range never extends
to a 25th row (was 24th), because `R-COH-VISUAL-SCOPE-PURITY` and
`R-COH-SENTINEL-RESOLUTION-MISSING` remain mutually exclusive. The
preserved range for a `figma_track: true` project whose plan has no
`phase_scope` row at all shifts from 15–22 to 16–23. The "four
conditional rows" wording is UNCHANGED — the new check is FIXED, not
a fifth conditional row, so the count of conditional rows stays four.
**This entry's numerals supersede the "15 to 20 rows"/"15 to 23 rows"
numerals recorded in the [2026-07-26] entry above** (`docs/decisions.md`
[2026-07-26] "R-COH-ACTION-VALIDATE-CONTRADICTION: a 7th FIXED
deterministic plan-reviewer check..."), which predates this shipment.

**Reason:** The four confirmed instances demonstrate the gap is real
and recurring, not hypothetical — a plan can be byte-perfect and still
have its own VALIDATE fail because a search term the ACTION and
VALIDATE both agree on happens to recur in the target file. The check
is deliberately scoped to the plan-local, mechanically-checkable proxy
signals (same-task ACTION duplication; unqualified short identifiers)
rather than attempting to verify true uniqueness in the target file —
`plan-reviewer` has no `Bash`/`Grep` tool and cannot read the target
file to count occurrences; that would require capability outside this
agent's tool surface. The escape hatch preserves the one legitimate
case this class of check would otherwise false-positive on: a
deliberately duplicated string whose first match is correct by
construction (document order, not luck) — exactly the shape the
`ruleIdx` instance above demonstrates. Making it UNCONDITIONAL rather
than a fifth zero-emission conditional row follows
`R-COH-ACTION-VALIDATE-CONTRADICTION`'s own precedent exactly: every
plan already has `**VALIDATE**` commands by construction; there is no
"doesn't apply" case to gate on, only a "found nothing" vacuous-pass
case.

**Areas affected:** `plugins/relay/agents/plan-reviewer.md` (new
`#### R-COH-VALIDATE-SEARCH-AMBIGUOUS` deterministic check, positioned
between `R-COH-ACTION-VALIDATE-CONTRADICTION` and
`R-COH-DESIGN-SOURCE-MISSING`; `### Logging discipline`
rubric[]-length arithmetic 15–20/15–23 → 16–21/16–24, 24th → 25th row
wording, 15–22 → 16–23 preserved range; `## review.jsonl format`
example block gains a matching row);
`scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs`,
`scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`,
and `scripts/validate/checks/figma-track-phase5.test.mjs` (all three
assert verbatim numerals from the updated paragraph, and the first
also asserts an exact `#### R-COH-*` heading count — required
`EXISTING_TEST_UPDATED` follow-up by the test pair, test-after per
`docs/context/methodology.md`, routed around `code-reviewer`'s
universal R-X test-modification guard exactly as the test pair's own
diff already is (`docs/decisions.md` [2026-07-10])); this entry's own
numerals now the canonical rubric[]-length reference, superseding the
[2026-07-26] entry's "15 to 20"/"15 to 23" mention.

---
```

**MIRROR**: Patterns to Mirror block 6 (insertion anchor).

**ADDRESSES**: AC-A9

**VALIDATE**:
```bash
set -euo pipefail
FILE="docs/decisions.md"
grep -q "## \[2026-07-28\] R-COH-VALIDATE-SEARCH-AMBIGUOUS" "$FILE"
grep -q "16 to 21" "$FILE"
grep -q "16 to 24" "$FILE"
grep -qi "supersede" "$FILE"
grep -q "RELAY-FIRST-MATCH-INTENDED" "$FILE"
orchestrator_line=$(grep -n "^## \[2026-07-27\] Orchestrator resumability" "$FILE" | head -1 | cut -d: -f1)
new_entry_line=$(grep -n "^## \[2026-07-28\] R-COH-VALIDATE-SEARCH-AMBIGUOUS" "$FILE" | head -1 | cut -d: -f1)
template_line=$(grep -n "^<!-- Template for future entries:" "$FILE" | head -1 | cut -d: -f1)
if [ "$new_entry_line" -le "$orchestrator_line" ] || [ "$new_entry_line" -ge "$template_line" ]; then
  echo "FAIL: [2026-07-28] entry is not positioned after the [2026-07-27] Orchestrator resumability entry and before the template comment"
  exit 1
fi
echo "PASS: docs/decisions.md [2026-07-28] entry present with updated arithmetic, escape-hatch mention, supersession note, and correctly positioned as the last real entry before the template comment"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
set -euo pipefail
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
FILE="plugins/relay/agents/plan-reviewer.md"
DFILE="docs/decisions.md"
grep -q "^#### R-COH-VALIDATE-SEARCH-AMBIGUOUS" "$FILE"
grep -q "RELAY-FIRST-MATCH-INTENDED" "$FILE"
grep -q "16 to 21 rows" "$FILE"
grep -q "16 to 24 rows" "$FILE"
grep -q "25th row" "$FILE"
grep -q '"id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true' "$FILE"
grep -q "## \[2026-07-28\] R-COH-VALIDATE-SEARCH-AMBIGUOUS" "$DFILE"
if grep -q "15 to 20 rows" "$FILE"; then
  echo "FAIL: stale '15 to 20 rows' text found in plan-reviewer.md"
  exit 1
fi
if grep -q "15 to 23 rows" "$FILE"; then
  echo "FAIL: stale '15 to 23 rows' text found in plan-reviewer.md"
  exit 1
fi
echo "PASS: all content invariants present across plan-reviewer.md and decisions.md"
```

**Level 3 — DRY-RUN END-TO-END**
```bash
set -euo pipefail
npm run validate

# Known-stale files pending the test pair's own EXISTING_TEST_UPDATED
# follow-up (see ## Notes' "Level 3 known-transient-red-file,
# green-gate note") — Tasks 1-2 above intentionally invalidate their
# pre-change assertions; a failure confined to exactly this set is
# tolerated here. ANY other failing file is a real regression and
# must fail this gate — the glob below is never narrowed to skip
# them.
ALLOWLIST="plan-reviewer-action-validate-contradiction-check.test.mjs figma-visual-first-track-phase3.test.mjs figma-track-phase5.test.mjs"

RUNNER_EXIT=0
TEST_OUTPUT=$(node --test scripts/validate/checks/*.test.mjs 2>&1) || RUNNER_EXIT=$?

if [ "$RUNNER_EXIT" -eq 0 ]; then
  echo "PASS: full corpus green (0 failing files; allowlist currently vestigial)"
  exit 0
fi

set +e
FAILING_FILES=$(printf '%s\n' "$TEST_OUTPUT" | grep -oE 'test at [^ :]+\.test\.mjs' | sed -E 's/^test at //' | sort -u)
set -e

if [ -z "$FAILING_FILES" ]; then
  echo "FAIL: node --test exited non-zero (code $RUNNER_EXIT) but no 'test at <path>.test.mjs' entries could be parsed from its output — treated as an unparseable/uninvokable runner failure, never silently passed"
  exit 1
fi

UNEXPECTED=""
ALLOWED_HIT=""
while IFS= read -r failed_path; do
  [ -z "$failed_path" ] && continue
  base="$(basename "$failed_path")"
  case " $ALLOWLIST " in
    *" $base "*) ALLOWED_HIT="$ALLOWED_HIT $base" ;;
    *) UNEXPECTED="$UNEXPECTED $failed_path" ;;
  esac
done <<< "$FAILING_FILES"

if [ -n "$UNEXPECTED" ]; then
  echo "FAIL: unexpected failing test file(s) outside the known-stale allowlist:$UNEXPECTED"
  if [ -n "$ALLOWED_HIT" ]; then
    echo "      (also failing, tolerated as known-stale pending test-pair follow-up:$ALLOWED_HIT)"
  fi
  exit 1
fi

echo "PASS: only known-stale, allowlisted file(s) failing, pending test-pair follow-up:$ALLOWED_HIT"
exit 0
```

Every command above exits non-zero when its own invariant is violated. Level 1 and Level 2 rely on the natural non-zero status of a failing `grep -q`/`npm run validate` under `set -euo pipefail`, or an explicit `if …; then …; exit 1; fi` guard. Level 3's own gate is a deliberate SUBSET check, not a bare zero-failures check: it exits 0 only when `node --test`'s own failing-file set is empty, or is fully contained in the named, inline three-file allowlist above; it exits 1 via its own explicit `exit 1` guards on any unexpected failing file, any uninvokable/erroring runner, or any unparseable failing-file output — never masking a parse failure as a pass. None of the commands above rely on the forbidden `<check> && echo "PASS" || echo "FAIL"` idiom, per the 2026-07-09 decision and `plan-reviewer`'s own `R-COH-VALIDATE-ALWAYS-PASS`. Note on Task 1's positioning check and Levels 1-2's own commands: every `grep`/`grep -n` search anchors on a `^#### <exact-unique-heading-name>` or a full-line JSON/decision-heading fragment — none is an `indexOf`/`lastIndexOf`-based ordering comparison in the literal sense this plan's own new check scopes to, and every anchor is additionally safe on the merits (each `####` heading is authored exactly once in this file by structural convention) — see the Notes section's Self-application note.

## Acceptance Criteria

- **AC-A1:** Given a DRAFT plan with an in-scope `indexOf`/`lastIndexOf`-based ordering comparison whose search string also appears more than once in that SAME task's own `**ACTION**:` text, when `plan-reviewer` runs the new `R-COH-VALIDATE-SEARCH-AMBIGUOUS` check, then it returns `passed: false`, naming the offending task and quoting the task heading, the search string, and the ordering comparison expression verbatim.
- **AC-A2:** Given an in-scope site whose search string is a bare identifier under 20 characters with no leading `await `, no `function `/`const `/`### `/`## ` anchor, and no surrounding punctuation, when the check runs, then it likewise returns `passed: false` under the secondary trigger, even when the string does not recur in the plan's own ACTION text.
- **AC-A3:** Given an in-scope site whose `**VALIDATE**:` text or immediately adjacent prose carries `RELAY-FIRST-MATCH-INTENDED` followed by a non-empty justification, when the check runs, then that site is exempted from both fail triggers regardless of duplication or identifier shape; given the sentinel appears with NO justification text, the site is NOT exempted and the fail triggers still apply.
- **AC-A4:** Given a VALIDATE command using a bare `=== -1` or `!== -1` presence test (no ordering comparison against another index), when the check runs, then that site is never flagged — it is out of scope by definition, regardless of the search string's uniqueness or length.
- **AC-A5:** Given a DRAFT plan with no in-scope `indexOf`/`lastIndexOf`-based ordering comparison anywhere, when the check runs, then it emits exactly one row `{ "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }` — vacuously — on every run, never zero-emission.
- **AC-A6:** Given `plugins/relay/agents/plan-reviewer.md`'s existing deterministic-check ordering, when the new check is added, then its `#### R-COH-VALIDATE-SEARCH-AMBIGUOUS` heading appears immediately after `#### R-COH-ACTION-VALIDATE-CONTRADICTION`'s Known-limitation paragraph and immediately before `#### R-COH-DESIGN-SOURCE-MISSING`, and the file carries exactly 12 total `#### R-COH-*` headings — 8 fixed then 4 conditional.
- **AC-A7:** Given the `### Logging discipline` rubric-arithmetic paragraph, when this change lands, then it reads "8 (deterministic R-COH-*)" (was 7), "16 to 21 rows" baseline (was 15 to 20), "16 to 24 rows" maximal (was 15 to 23), "25th row" (was 24th), and "16–21"/"16–23" preserved ranges (was 15–20/15–22) — while the "four conditional rows" wording is unchanged.
- **AC-A8:** Given the `## review.jsonl format` example JSONL block, when this change lands, then a new row `{ "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }` appears immediately after the existing `R-COH-ACTION-VALIDATE-CONTRADICTION` row, so all 8 fixed deterministic checks each have an example row.
- **AC-A9:** Given `docs/decisions.md`, when this change lands, then a new `## [2026-07-28]` entry records the new check, the deliberate unconditional-vs-zero-emission rationale, the `RELAY-FIRST-MATCH-INTENDED` escape hatch, and the arithmetic shift, explicitly noting it supersedes the "15 to 20 rows"/"15 to 23 rows" numerals recorded in the [2026-07-26] entry.
- **AC-A10:** Given the new check's own text, when read in full, then it closes with a "Known limitation (recorded, not blocking)" paragraph stating `plan-reviewer` cannot verify true target-file uniqueness (no `Bash`/`Grep`/`Glob`), can miss a search string non-unique in the target file while unique in the plan's own ACTION text, and can false-positive on an incidental repetition or a short-but-actually-unique identifier.
- **AC-A11:** Given this plan's own `## Validation Commands` Level 3 gate, when Tasks 1–4 have landed correctly and the only failing test files are within the named three-file allowlist (the test-pair follow-up's own targets), then Level 3 exits 0; when any OTHER test file fails — a genuine regression unrelated to this plan's own known-stale allowlist — Level 3 exits non-zero and names that file as unexpected, so a real regression is never masked as a pass.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The check is a heuristic textual scan (no `Bash`/`Grep`/`Glob` tool) — it can miss a search string non-unique in the target file but appearing once in the plan's ACTION text, or false-positive on a short-but-actually-unique identifier | Medium | Medium | Documented explicitly as a "Known limitation" in the check itself, mirroring `R-COH-ACTION-VALIDATE-CONTRADICTION`'s own precedent; corroborated by `research-web` findings (Playwright's locator "strict mode": uniqueness matters, and the sanctioned fix is to narrow scope or declare intent, never to silently pick a match) that this defect class is a recognized, real-world category |
| Immediately after this phase's own tasks land (before the test pair's follow-up), the full test corpus shows exactly 3 known-stale failing test FILES | High (certain, until the test pair runs) | Low — Level 3's own gate is built to tolerate exactly this | Level 3 (`## Validation Commands` above) is a named, inline three-file allowlist SUBSET gate, not a bare zero-failures check: it stays green through this exact window and only fails on an unexpected file, an uninvokable/erroring runner, or unparseable output, so `code-reviewer`'s R-L3 is never tripped by this documented staleness; `EXISTING_TEST_UPDATED` is the correct test-pair lifecycle classification for the eventual fix — never `OBSOLETE_TEST_REMOVED`/`REDUNDANT_TEST_REMOVED`, and never silently deleted, per `docs/anti-patterns.md`'s "Weakening or deleting tests" prohibition; the allowlist itself is never narrowed to hide a genuine regression in one of the three files |
| Routing the three test-file fixes to the test pair (rather than the Implementer) diverges from this plan's own dispatching description, which asked for these updates to be "in the Implementer's scope" | Low | Medium | `code-reviewer.md`'s R-X check (lines 370-401) is a blanket, unconditional `git diff --name-only -- <test-glob-pathspec>` match with "no first warning grace period" (D17) and zero semantic reasoning about edit intent — routing these fixes through an Implementer Step-by-Step Task would guarantee an R-X straight-FAIL regardless of plan wording; the test-pair route is the only mechanically compatible path, already proven three times in this exact codebase for this exact arithmetic paragraph (`docs/decisions.md` [2026-07-25] ×2, [2026-07-26]), and is explicitly justified in Notes below |
| A future edit to the same `### Logging discipline` paragraph (a 5th conditional check, or a 9th fixed check) repeats this exact numeral-arithmetic churn and could reintroduce an ambiguous-search defect of its own | Medium | Low | The new `R-COH-VALIDATE-SEARCH-AMBIGUOUS` check itself is the structural mitigation going forward; this plan's own Task 1 VALIDATE self-demonstrates a compliant, disambiguated ordering check (`^#### ` heading-anchored searches, each unique by this file's own structural convention) for the identical positioning-check shape |
| Positioning the new check between two existing headings via `Edit` with a narrow `old_string` could silently fail (whitespace drift) if the live file has changed since this plan's grounding pass | Low | Medium | Task 1's VALIDATE independently re-checks both presence and relative position via `grep -n`, anchored on the `^#### ` heading prefix, so a silent mis-insertion is caught by exit code, not just by visual inspection |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored. `test_frameworks: ["node:test"]` IS declared in this repo, so the pair is active — but this phase's own four tasks (Files to Change: `plugins/relay/agents/plan-reviewer.md`, `docs/decisions.md`) touch zero `.mjs` files, consistent with `phase_type: scaffold` above. The test pair's required follow-up is the three EXISTING test files named below.

**Test impact — required test-pair follow-up (NOT an Implementer task; R-X strict) and the deliberate routing divergence from this plan's own dispatching description.** This plan's dispatching description states that updating the three existing test files is "in the Implementer's scope... mechanical numeral updates to assertions the change invalidates, not new test authoring." That framing is correct about the SUBSTANCE of the work — these genuinely are mechanical, non-authorship maintenance edits — but the literal routing does not survive contact with `code-reviewer`'s actual R-X mechanism, verified directly against the live file during this plan's own grounding: `plugins/relay/agents/code-reviewer.md`'s R-X check (lines 370-401) runs `git diff --name-only <diff_target>..HEAD -- <test-glob-pathspec-set>` (a set that includes `**/*.test.mjs`) and straight-FAILs in standard mode on ANY match, "no first warning grace period" (D17) — it has no mechanism to read plan prose or distinguish a one-line numeral fix from new test authorship; it is a blanket path-glob match, full stop. Routing these three fixes through an Implementer Step-by-Step Task would therefore guarantee an R-X failure regardless of how this plan's own text frames the edit's nature. `docs/decisions.md` [2026-07-10] already documents the mechanically-compatible alternative: "in test-after the pair's diff is reviewed by `test-reviewer`, never the `code-reviewer` — so R-X (which fires on the Implementer's diff) never sees it." This plan therefore preserves the SUBSTANCE of the dispatching description's own distinction — legitimate mechanical maintenance, precisely specified, not vague or hand-waved — by routing execution through the test pair as `EXISTING_TEST_UPDATED` lifecycle entries, exactly the mechanism already used three times in this exact codebase for this exact arithmetic paragraph (`docs/decisions.md` [2026-07-25] ×2, [2026-07-26]; `PRPs/plans/completed/plan-reviewer-action-validate-contradiction-check.plan.md` Notes). No task in this plan creates, edits, or references a `*.test.mjs` file — the Implementer authors ZERO test-file changes (R-X strict, `docs/decisions.md` [2026-05-06]/[2026-07-10]).

Three existing tests assert the pre-change wording/counts this phase's Task 1/Task 2 changes, and WILL go stale:

- `scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs`:
  - Its AC-A5 test (~line 362) asserts `'8 (R1–R8) + 7 (deterministic R-COH-*) + ≤5 (K=5 pass) = 15 to 20 rows'`, `'15 to 23 rows'`, and `'24th row'`, plus the test's own title text — all need the same +1 numeral shift Task 2 applies to the live file (7→8, 15 to 20→16 to 21, 15 to 23→16 to 24, 24th→25th).
  - Its AC-A4 test (~lines 311-342) asserts `headingMatches.length === 11` and a 7-item `expectedFixed` array via `headingMatches.slice(0, 7)`/`.slice(7)` — an exact `#### R-COH-*` heading count this plan's own Task 1 invalidates (7 fixed → 8 fixed, 11 total → 12 total). This is a SEPARATE property from the arithmetic paragraph, not named in this plan's own dispatching description — found independently during this plan's own grounding pass by direct inspection of the live test file. The fix: `11` → `12`, `expectedFixed` gains `'R-COH-VALIDATE-SEARCH-AMBIGUOUS'` as its 8th entry (immediately after `'R-COH-ACTION-VALIDATE-CONTRADICTION'`), `.slice(0, 7)` → `.slice(0, 8)`, `.slice(7)` → `.slice(8)`.
  - Its AC-A8 test (~lines 385-405, assertions at ~397-398) checks `docs/decisions.md`'s EXISTING `[2026-07-26]` entry for `'15 to 20'`/`'15 to 23'` substrings — this entry is NOT edited by this plan (Task 4 only APPENDS a new dated entry after it, per this codebase's own convention of recording supersession via a new entry rather than rewriting history); the old entry's own preserved text still satisfies these two assertions once the new entry is appended after it. No change needed to this specific test.
  - Its file-header comment (~lines 32-51) narrates, in present tense, what "this file's own AC-A5 arithmetic test therefore asserts" — the inline example tokens there (`7 (deterministic`, `15 to 20 rows`, `15 to 23 rows`, `24th row`) should be updated in place to the new tokens (`8 (deterministic`, `16 to 21 rows`, `16 to 24 rows`, `25th row`) so the comment stays an accurate description of the test it sits above; the preceding historical narration of the 14→15 shift (further up the same comment) is a point-in-time record and needs no change.

- `scripts/validate/checks/figma-visual-first-track-phase3.test.mjs`: its AC-A2 test (~line 492) and its two verbatim string assertions (~lines 500, 506) carry `15 to 23 rows`, `24th row`, `15–20` (EN DASH, U+2013), and `15–22` (EN DASH) — preserve each site's existing punctuation exactly (ASCII "to" in the "X to Y rows" spots, en dash in the "X–Y" spots), changing only the digits/ordinal: `15 to 23 rows`→`16 to 24 rows`, `24th row`→`25th row`, `15–20`→`16–21`, `15–22`→`16–23`. Its header comment (~lines 107-141) narrates the prior 6→7 shift in past tense as a dated `Lifecycle update` paragraph — per this file's own established convention (two such paragraphs already stacked there), append a third dated `Lifecycle update (2026-07-28, EXISTING_TEST_UPDATED, ...)` paragraph documenting this shift, rather than editing the prior two paragraphs' own historical narration.

- `scripts/validate/checks/figma-track-phase5.test.mjs`: its regex assertion (~line 361) matches `baseline 15–20 range is exact for every non-Figma project` (EN DASH) — update to `baseline 16–21 range is exact for every non-Figma project`. Its header comment (~lines 130-165) narrates prior shifts in past tense as dated `Lifecycle update` paragraphs (three already stacked); append a fourth documenting this shift, per the same established convention.

`docs/anti-patterns.md`'s "Weakening or deleting tests" prohibition applies: none of the three files may be silently deleted or have its assertion scope narrowed — only the specific stale numerals/counts named above may change, and only via the test pair's own `EXISTING_TEST_UPDATED` ledger entry.

**Level 3 known-transient-red-file, green-gate note.** Immediately after this phase's own Tasks 1–4 land (before the test pair's follow-up), running the full corpus is EXPECTED to show exactly 3 failing test FILES — `plan-reviewer-action-validate-contradiction-check.test.mjs`, `figma-visual-first-track-phase3.test.mjs`, and `figma-track-phase5.test.mjs` — because all three assert stale wording/counts from the paragraph and heading list Tasks 1–2 intentionally change. This is documented, expected staleness, not a defect in this phase's own four tasks. Level 3's own gate (`## Validation Commands` above) is deliberately built to stay GREEN through this exact window: it tolerates a failing-file set that is a subset of its own named three-file allowlist and only fails on an unexpected file, an uninvokable/erroring runner, or unparseable output — so a byte-perfect implementation of Tasks 1–4 reports Level 3 PASS even while these three files are transiently red, and `code-reviewer`'s R-L3 gate (PASS iff exit code 0) is never tripped by the very staleness this plan itself documents. (This corrects an initial DRAFT of this Level 3 block, which ran the plain zero-failures form and would have made Level 3 — and therefore R-L3 — fail on a correct implementation; caught and fixed before `/relay-plan-review`.) Once the test pair lands its own `EXISTING_TEST_UPDATED` follow-up, the failing-file set returns to empty and the allowlist becomes vestigial — the gate is green either way, with or without the three files still on it.

**Design note — grep-target discipline, applying the established lesson from this exact paragraph's own edit history.** Every `VALIDATE` grep target in this plan is a short, single-line-safe fragment (`8 (deterministic`, `16 to 21 rows`, `16 to 24 rows`, `25th row`, `15 to 20 rows`, `15 to 23 rows`, `24th row`) rather than a long multi-word span that could straddle this file's own prose line-wrapping — the `### Logging discipline` paragraph's own inline-code arithmetic span already wraps mid-span in the live file today (confirmed by this plan's own grounding reads), so Task 2's ACTION performs that specific substitution via `Edit`'s exact-byte `old_string` match (which spans the real line break correctly) while every VALIDATE grep target stays deliberately short and unwrapped. Every Level-2/3 grep in this plan is also scoped to the two files this change actually touches (`plan-reviewer.md`, `decisions.md`), never a whole-repo scan that could false-positive on unrelated pre-existing content elsewhere.

**Research grounding.** `research-codebase` and `research-web` subagents were dispatched in parallel per protocol, alongside this plan's own extensive direct grounding reads (the full live `plan-reviewer.md`, the full `docs/decisions.md`, `code-reviewer.md`'s R-X section, both historical Phase 5/6 plans, and all three stale test files). `research-web` found no single established name for this exact bug class but surfaced directly relevant, corroborating prior art: Playwright's locator "strict mode" (locators must resolve to exactly one element; the sanctioned fix is to narrow scope or declare intent, never to positionally pick via `nth()`/`first()`/`last()` — validating this check's own escape-hatch design over a silent-first-match alternative), Go's internal diff algorithm (an anchor line is trusted only when it occurs exactly once in both texts — validating the "uniqueness, not just presence" framing), and the bioinformatics "Maximal Unique Match" concept (uniqueness AND a minimum-length floor, default 20 characters — the direct source of this check's own 20-character secondary-trigger threshold). No real-world postmortem was found describing this exact `indexOf`-ordering failure inside test/validation scripts specifically — this check's own four confirmed instances (independently verified by direct file reads during this plan's grounding, not merely relayed) are therefore original, first-party evidence, not corroboration of an already-documented pattern.

**Self-application note.** This plan is itself, by construction, a demonstration of the rule it adds. None of its own four tasks author an `indexOf`/`lastIndexOf`-based ordering VALIDATE at all: Task 1's positioning check uses bash `grep -n` line-number comparison, not JS `indexOf` — outside this check's literal scope by construction, and additionally safe on the merits, since every search anchors on a `^#### <exact-heading-name>` prefix, which by this file's own structural convention is authored exactly once per check name (never colliding with an inline cross-reference, since those use backticks or plain quotes, never the `#### ` heading prefix). Tasks 2–4 use only `grep -q` presence/absence checks — never a two-index ordering comparison at all. No task's own VALIDATE would trip the very rule it installs.

---

*Generated: 2026-07-28*
*Approved: 2026-07-28*
*Status: IMPLEMENTED*
