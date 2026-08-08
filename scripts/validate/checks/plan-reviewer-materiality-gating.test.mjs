// @ts-check
/**
 * Content-invariant tests for the class-aware verdict-gating protocol text
 * and the one-way escalation valve introduced by Phase 1 of
 * PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md)
 * in plugins/relay/agents/plan-reviewer.md.
 *
 * `plan-reviewer` is an LLM-executed markdown protocol, not deterministic
 * code — there is no function to invoke and observe a real verdict from in
 * a node:test unit test. The honest, spot-verifiable coverage available
 * (the same shape every other *.test.mjs file in this corpus asserting
 * plan-reviewer.md behavior already uses) is static assertion on the
 * PROTOCOL TEXT the LLM reads and follows at review time: the class-aware
 * gating sentences, the Step 3 branch headers, the CHANGES_REQUESTED
 * bullet-list example's blocking/advisory split, the Step 4 APPROVED-entry
 * requirement, and the Escalation valve subsection's rule/directionality/
 * worked-example/discipline-note paragraphs. This file covers PRD AC-1
 * (Advisory-only failures approve), AC-2 (Blocking failures gate), and
 * AC-6 (One-way escalation valve) — plan AC-A1, AC-A2, and AC-A4
 * respectively. PRD AC-3 (the class field's totality and partition-table
 * derivation) is covered separately by
 * plan-reviewer-materiality-class-derived.test.mjs.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file that already touches
 * plugins/relay/agents/plan-reviewer.md, plus a corpus-wide search for the
 * literal strings "Materiality classes", "blocking-classed",
 * "advisory-classed", `"class": "blocking"`, `"class": "advisory"`,
 * "Escalation valve", `escalated": true`, and "Non-blocking advisories"):
 * zero matches anywhere in the 45-file corpus outside the three files this
 * same session's own Half 1 fixed for the additive `class` field's
 * byte-shape ripple on unrelated worked-example rows (see those files' own
 * Lifecycle-update comments). None of the gating sentences, branch headers,
 * bullet-list shape, or Escalation valve content this file asserts is
 * covered anywhere else — NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-1/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A1 (PRD AC-1) — "Given a plan whose full rubric evaluation yields
 *     failing rows only in advisory-classed checks, when the plan-reviewer
 *     emits its verdict, then the verdict is APPROVED, the DRAFT->APPROVED
 *     flip is performed, every failing row carries "class": "advisory",
 *     and the jsonl line records ALL evaluated rubric rows (no
 *     short-circuit)."
 *   AC-A2 (PRD AC-2) — "Given at least one blocking-classed failing row,
 *     when the verdict is emitted, then it is CHANGES_REQUESTED and the
 *     failing-items bullet list presents blocking rows as mandatory fixes
 *     with advisory rows listed separately under the 'Non-blocking
 *     advisories' sub-list."
 *   AC-A4 (PRD AC-6) — "Given an advisory-classed check whose finding the
 *     reviewer judges implementation-misleading, when the reviewer
 *     escalates it, then the row carries "class": "blocking",
 *     "escalated": true, and a reason naming the concrete Implementer
 *     impact; no mechanism exists to demote a blocking-classed check."
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-materiality-gating.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the sibling *.test.mjs files' helper of the same name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors the sibling *.test.mjs files' helper
 * of the same name/shape.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const startIdx = content.indexOf(startNeedle);
  if (startIdx === -1) return undefined;
  const endIdx = content.indexOf(endNeedle, startIdx + startNeedle.length);
  return endIdx === -1 ? content.slice(startIdx) : content.slice(startIdx, endIdx);
}

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space. Mirrors the sibling *.test.mjs files' helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1), AC-A2 (PRD AC-2) — Step 2's closing gating sentence is
// class-aware, and its class-blind predecessor is gone (regression guard).
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-1), AC-A2 (PRD AC-2): plan-reviewer.md\'s Step 2 closing sentence gates CHANGES_REQUESTED on blocking-classed rows only, and states an advisory-only-failing run proceeds to Step 4 as an advisory-carrying APPROVED', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  assert.ok(
    content.includes('any blocking-classed `passed: false` row triggers the CHANGES_REQUESTED branch'),
    'expected the class-aware gating fragment'
  );

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      'any blocking-classed `passed: false` row triggers the CHANGES_REQUESTED branch; a run whose only failing rows are advisory-classed proceeds to Step 4 as an advisory-carrying APPROVED.'
    ),
    'expected the full class-aware gating sentence, both clauses, verbatim'
  );
});

test('AC-A1 (PRD AC-1), AC-A2 (PRD AC-2) (regression guard): the stale class-blind gating sentence ("any `passed: false` row triggers the CHANGES_REQUESTED branch", with no "blocking-classed" qualifier) is absent from plan-reviewer.md', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const occurrences = content.split('any `passed: false` row triggers the CHANGES_REQUESTED branch').length - 1;
  assert.equal(occurrences, 0, `expected zero occurrences of the stale class-blind gating sentence, found ${occurrences}`);
});

test('AC-A1 (PRD AC-1), AC-A2 (PRD AC-2): the frontmatter description and the R-COH-* coherence-layer intro sentence are both class-aware', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  assert.ok(
    content.includes(
      'Emit CHANGES_REQUESTED bullet list on any blocking-classed failure (advisory-only failures approve with recorded advisories).'
    ),
    'expected the class-aware frontmatter description sentence'
  );

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      'R-COH-* failures gate `verdict: "CHANGES_REQUESTED"` per their declared class — see `## Materiality classes` — the same way R1–R8 failures do'
    ),
    'expected the class-aware R-COH-* coherence-layer intro sentence'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1) — Step 4's APPROVED-entry requirement: only
// blocking-classed rows must be passed:true; advisory-classed rows may
// carry passed:false with a reason without blocking the flip.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-1): plan-reviewer.md\'s Step 4 APPROVED-entry bullet requires only blocking-classed rows passed:true (explicitly including all 8 R1-R8), permitting advisory-classed rows to carry passed:false with a reason without blocking the flip', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '2. **Append the APPROVED jsonl entry FIRST**', '3. **Re-`Read` the plan one more time**');
  assert.ok(block, 'expected an extractable Step 4 item-2 APPROVED-entry block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('The entry\'s `rubric` array MUST contain all blocking-classed rows with `passed: true`'),
    'expected the blocking-classed-rows-must-pass requirement'
  );
  assert.ok(
    collapsed.includes('this includes all 8 R1–R8 items, since R1–R8 are all blocking-classed'),
    'expected the explicit R1-R8-are-all-blocking-classed clause'
  );
  assert.ok(
    collapsed.includes('advisory-classed rows MAY be `passed: false` with their `reason`'),
    'expected the advisory-rows-may-fail permission'
  );
  assert.ok(
    collapsed.includes('their presence does not block this APPROVED flip'),
    'expected the explicit does-not-block-the-flip statement'
  );
});

test('AC-A1 (PRD AC-1): plan-reviewer.md\'s Step 4 final-summary prose emits an "Open advisories" line only when advisory-classed rows are open, and Step 4a distinguishes a newly-failing advisory item (recorded, non-terminal) from a newly-failing blocking item (terminal CHANGES_REQUESTED)', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes('Open advisories: <n> (recorded in review.jsonl; not gating).'),
    'expected the conditional open-advisories summary line'
  );
  assert.ok(
    collapsed.includes('When one or more advisory-classed rows are open (`passed: false`) on this same entry, append a second summary line'),
    'expected the conditional framing making the advisories line non-mandatory'
  );
  assert.ok(
    collapsed.includes(
      'a previously-passing advisory-classed item flipping to fail does NOT trigger this path — it is simply recorded on the APPROVED entry per Step 4 item 2'
    ),
    'expected Step 4a to explicitly exempt a newly-failing advisory item from the CHANGES_REQUESTED re-validation path'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-2) — Step 3's branch headers are class-aware, and the
// CHANGES_REQUESTED bullet-list example presents blocking items first with
// a separate "Non-blocking advisories" sub-list appended after them.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-2): plan-reviewer.md\'s Step 3 branch headers are class-aware — "No blocking-classed failure" proceeds to Step 4, "One or more blocking-classed failures" triggers CHANGES_REQUESTED', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  assert.ok(
    content.includes('#### No blocking-classed failure → proceed to Step 4 (autonomous flip)'),
    'expected the class-aware "no blocking failure" branch heading'
  );
  assert.ok(
    content.includes('#### One or more blocking-classed failures → CHANGES_REQUESTED (terminal for this run)'),
    'expected the class-aware "one or more blocking failures" branch heading'
  );

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes('A run whose only failing rows are advisory-classed also takes this branch'),
    'expected the "No blocking-classed failure" branch to explicitly cover the advisory-only case'
  );
});

test('AC-A2 (PRD AC-2): plan-reviewer.md\'s CHANGES_REQUESTED bullet-list example lists blocking failures (R3, R4, R8) as mandatory fixes, then a separate "Non-blocking advisories (recorded, not gating):" sub-list positioned strictly after the last blocking bullet', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### One or more blocking-classed failures', '3. Do NOT flip the status.');
  assert.ok(block, 'expected an extractable CHANGES_REQUESTED example block');
  const raw = /** @type {string} */ (block);

  const r3Idx = raw.indexOf('**R3**');
  const r4Idx = raw.indexOf('**R4**');
  const r8Idx = raw.indexOf('**R8**');
  const advisoryHeaderIdx = raw.indexOf('**Non-blocking advisories (recorded, not gating):**');
  const advisoryItemIdx = raw.indexOf('**R-COH-MANDATORY-READING-MISSING**');

  assert.notEqual(r3Idx, -1, 'expected the existing blocking-failure example item R3');
  assert.notEqual(r4Idx, -1, 'expected the existing blocking-failure example item R4');
  assert.notEqual(r8Idx, -1, 'expected the existing blocking-failure example item R8');
  assert.notEqual(advisoryHeaderIdx, -1, 'expected the "Non-blocking advisories" sub-list header');
  assert.notEqual(advisoryItemIdx, -1, 'expected an example advisory bullet');

  assert.ok(
    r3Idx < r4Idx && r4Idx < r8Idx && r8Idx < advisoryHeaderIdx,
    'expected the blocking-failure example bullets (R3, R4, R8) to remain in order, all positioned strictly before the "Non-blocking advisories" sub-list'
  );
  assert.ok(advisoryHeaderIdx < advisoryItemIdx, 'expected the advisory example bullet to follow its own sub-list header');

  const collapsed = collapseWs(raw);
  assert.ok(collapsed.includes('advisory, not gating'), 'expected the advisory example bullet to explicitly state it does not gate');
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-6) — the one-way escalation valve: rule, directionality
// (no demotion), worked jsonl example, and discipline note.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-6): plan-reviewer.md carries a ### Escalation valve (one-way) subsection whose rule lets the reviewer escalate an advisory-classed finding to class:blocking + escalated:true, requiring the reason to name the concrete Implementer impact', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  assert.ok(content.includes('### Escalation valve (one-way)'), 'expected the Escalation valve subsection heading');

  const block = sliceBetween(content, '### Escalation valve (one-way)', '## The 8-item rubric');
  assert.ok(block, 'expected an extractable Escalation valve block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'When an advisory-classed check\'s concrete finding would, in the reviewer\'s own judgment, mislead the Implementer into a wrong or failed implementation, the reviewer MAY emit that row with `"class": "blocking"` plus `"escalated": true` instead of its declared `advisory` class.'
    ),
    "expected the escalation rule's exact framing"
  );
  assert.ok(
    collapsed.includes(
      "The row's `reason` MUST name the concrete Implementer impact — what would be built wrongly if the finding were left advisory — not a restatement of the check's generic rationale."
    ),
    'expected the mandatory concrete-Implementer-impact reason requirement, excluding a generic-rationale restatement'
  );
});

test('AC-A4 (PRD AC-6): plan-reviewer.md\'s escalation valve is explicitly one-way — a blocking-classed check can never be demoted to advisory, and no demotion mechanism exists anywhere in the protocol', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '### Escalation valve (one-way)', '## The 8-item rubric');
  assert.ok(block, 'expected an extractable Escalation valve block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('A blocking-classed check can NEVER be demoted to `advisory` at emission time.'),
    'expected the one-way directionality rule'
  );
  assert.ok(
    collapsed.includes('No demotion mechanism exists anywhere in this protocol'),
    'expected the explicit no-demotion-mechanism statement'
  );
  assert.ok(
    collapsed.includes('the valve opens in one direction only, escalating advisory findings up, never relaxing blocking findings down'),
    'expected the explicit one-direction-only closing clause'
  );
});

test('AC-A4 (PRD AC-6): plan-reviewer.md\'s escalation valve carries a worked jsonl row example with escalated:true and a concrete Implementer-impact reason, plus a discipline note against hollow escalations', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '### Escalation valve (one-way)', '## The 8-item rubric');
  assert.ok(block, 'expected an extractable Escalation valve block');
  const raw = /** @type {string} */ (block);
  const collapsed = collapseWs(raw);

  assert.ok(raw.includes('"escalated": true'), 'expected the worked jsonl example to carry escalated:true');
  assert.ok(raw.includes('"class": "blocking"'), 'expected the worked jsonl example row to carry class:blocking');
  assert.ok(raw.includes('"passed": false'), 'expected the worked jsonl example row to be a failing (passed:false) row');
  assert.ok(
    raw.includes('the Implementer would build against an endpoint no other section grounds, producing a working-but-wrong integration'),
    'expected the worked example\'s reason to name a concrete Implementer impact, not a generic restatement'
  );

  assert.ok(
    collapsed.includes(
      'Escalating a row without a concrete Implementer-impact justification is a protocol violation'
    ),
    'expected the discipline note opening'
  );
  assert.ok(
    collapsed.includes('better to leave a finding at its declared `advisory` class than to escalate on a hollow or generic rationale'),
    'expected the discipline note\'s closing better-to-leave-advisory clause'
  );
});

test('AC-A4 (PRD AC-6): plan-reviewer.md\'s Step 2 per-row recording prose states every emitted row carries its class, declared or escalated per the valve', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "Every emitted row also carries its `class` — the value declared in `## Materiality classes`, or `blocking` with `escalated: true` when the reviewer invokes the escalation valve."
    ),
    'expected the Step 2 per-row class-recording sentence'
  );
});
