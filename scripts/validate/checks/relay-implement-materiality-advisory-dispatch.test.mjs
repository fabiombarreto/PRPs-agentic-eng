// @ts-check
/**
 * Content-invariant tests for the advisory pass-through protocol text
 * introduced by Phase 3 of PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-3-advisory-pass-through.plan.md)
 * in plugins/relay/commands/relay-implement.md: Phase A.0's new
 * `open_advisories` loop-state bullet and Advisory-context read paragraph
 * (deriving `review_jsonl_path`, the no-file silent-skip, the LAST-line
 * parse + class:advisory/passed:false selection, and the class-less-reads-
 * as-blocking compatibility rule), and Phase A.2's dispatch-payload
 * `advisories` key injection plus its omitted-when-empty byte-identical
 * guarantee.
 *
 * `relay-implement.md` is an LLM-executed markdown command protocol, not
 * deterministic code — there is no function to invoke and observe a real
 * dispatch payload from in a node:test unit test. The honest,
 * spot-verifiable coverage available (the same static-protocol-text shape
 * every *.test.mjs file in this corpus already uses when asserting
 * relay-implement.md content, e.g. figma-visual-first-track-phase6.test.mjs
 * and figma-track-phase6.test.mjs) is static assertion on the PROTOCOL TEXT
 * `/relay-implement` reads and follows at dispatch time.
 *
 * This file covers PRD AC-4 (Advisory injection into the Implementer) —
 * plan AC-A1 and AC-A2 — in full: the read side (Phase A.0) and the
 * injection side (Phase A.2 payload + omitted-when-empty guarantee). Plan
 * AC-A3 (the implementer's declared consumption rule) is covered
 * separately by implementer-materiality-advisory-consumption.test.mjs,
 * since it lives in a different source file
 * (plugins/relay/agents/implementer.md). Plan AC-A4 (PRD AC-1's surfacing
 * facet) is covered separately by
 * relay-plan-review-materiality-advisory-surfacing.test.mjs, against a
 * third source file (plugins/relay/commands/relay-plan-review.md).
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-3-advisory-pass-through.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — corpus-wide
 * search across all 50 pre-existing scripts/validate/checks/*.test.mjs
 * files for "open_advisories", "Advisory-context read", the literal new
 * payload line, and every existing real-content read of
 * relay-implement.md): zero matches for any of this phase's new text.
 * figma-visual-first-track-phase6.test.mjs pins the unchanged
 * `prior_feedback: <last_reviewer_feedback when non-empty; null
 * otherwise>,` payload line via a substring + Phase-A.2-to-Phase-A.3
 * ordering check only (no adjacency-to-base_commit pin, no bullet-count
 * pin on the Phase A.0 loop-state block) — confirmed unaffected by this
 * phase's insertions (both still pass unchanged against the live file).
 * figma-track-phase6.test.mjs's sliceBetween window for the
 * figma_track_declared/visual_verification_enabled block ends at the same
 * "Soft-fail concurrency diagnostic per source PRD D18" anchor this
 * phase's new paragraph now precedes — its assertions are `.includes()`
 * substring checks only, unaffected by the block growing longer. No
 * pre-existing test asserts on the Phase A.2 payload's line-for-line
 * adjacency or the Phase A.0 bullet list as a whole block.
 * NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-3/attempts/2/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A1 (PRD AC-4) — "Given a plan approved with >=1 open advisory in its
 *     latest review.jsonl entry, when /relay-implement dispatches the
 *     implementer, then Phase A.0 has read that entry and the Phase A.2
 *     payload contains the advisories in the canonical
 *     list<{rubric_id, reason}> shape explicitly marked non-blocking."
 *   AC-A2 (PRD AC-4) — "Given zero open advisories (no jsonl, a
 *     pre-materiality entry with class-less rows, or an all-pass entry),
 *     when the dispatch is assembled, then the advisories key is omitted
 *     entirely and the payload is byte-identical to the pre-Phase-3
 *     dispatch."
 *
 * Run: node --test scripts/validate/checks/relay-implement-materiality-advisory-dispatch.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the sibling *.test.mjs files' helper of the same name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

const LAST_REVIEWER_FEEDBACK_BULLET =
  '- `last_reviewer_feedback: list<{rubric_id, reason}> = []` — carried into the next attempt\'s implementer prompt';
const OPEN_ADVISORIES_BULLET =
  '- `open_advisories: list<{rubric_id, reason}> = []` — read from the plan\'s latest `review.jsonl` entry in Phase A.0 (see the Advisory-context read paragraph below); carried unmodified into the Phase A.2 implementer dispatch';

const ADVISORY_CONTEXT_READ_PARAGRAPH =
  '**Advisory-context read (plan-review pass-through).** Derive `review_jsonl_path = PRPs/plans/<basename>.review.jsonl` using the `<basename>` already computed in `## Parse arguments` (both PRD-mode and PRD-less filenames apply the same derivation; the jsonl is basename-keyed and does NOT move when D8 later relocates the plan to `completed/`). If `review_jsonl_path` does not exist, leave `open_advisories` empty and continue — no halt, no warning; a pre-materiality or reviewer-less plan simply has no advisories. If it exists, parse its LAST line (the verdict that approved the current plan state) and set `open_advisories` to that entry\'s `rubric` rows having BOTH `"class": "advisory"` AND `passed: false`, mapped to the canonical shape `{rubric_id: <row id>, reason: <row reason>}`. Compatibility rule: a row without a `class` field reads as blocking (the Phase-1 rule), so `review.jsonl` entries written before the materiality taxonomy shipped can never contribute an advisory.';

const PLAN_PATH_LINE = 'plan_path: <plan_path>,';
const TARGET_ROOT_LINE = 'target_root: <target_root>,';
const ATTEMPT_LINE = 'attempt: <attempt>,';
const PRIOR_FEEDBACK_LINE = 'prior_feedback: <last_reviewer_feedback when non-empty; null otherwise>,';
const ADVISORIES_LINE = 'advisories: <open_advisories when non-empty; key omitted entirely otherwise>,';
const BASE_COMMIT_LINE = 'base_commit: <base_commit>,';

const PRIOR_FEEDBACK_CONDITION_NOTE =
  '`prior_feedback`\'s condition reads `last_reviewer_feedback` non-emptiness directly rather than `attempt > 1` — a deliberately narrow generalization (Figma Visual-First Track Phase 6, `docs/decisions.md`): in every pre-Phase-6 code path `last_reviewer_feedback` is populated only together with an `attempt` increment (Phase A.3\'s `CHANGES_REQUESTED` branch, and the arbitration mode\'s `DISPUTE_REJECTED` branch), so the two conditions are equivalent for every existing invocation shape; the new condition additionally lets `/relay-execute`\'s resume-from-rejected-visual-approval path (`relay-execute.md` Phase A.2.5) seed feedback for a genuine `attempt == 1` dispatch, which the old condition would have silently discarded.';

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4) — Phase A.0 loop-state: open_advisories declared
// immediately after last_reviewer_feedback, mirroring its bullet shape.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): relay-implement.md\'s Phase A.0 loop-state block declares open_advisories: list<{rubric_id, reason}> = [] immediately after last_reviewer_feedback, mirroring its bullet shape', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const lastIdx = content.indexOf(LAST_REVIEWER_FEEDBACK_BULLET);
  const openIdx = content.indexOf(OPEN_ADVISORIES_BULLET);
  assert.notEqual(lastIdx, -1, 'expected the pre-existing last_reviewer_feedback loop-state bullet, verbatim');
  assert.notEqual(openIdx, -1, 'expected the new open_advisories loop-state bullet, verbatim');

  const between = content.slice(lastIdx + LAST_REVIEWER_FEEDBACK_BULLET.length, openIdx);
  assert.equal(
    between.trim(),
    '',
    'expected open_advisories positioned immediately after last_reviewer_feedback, with no other bullet between them'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4) — the Advisory-context read paragraph: label + the
// review_jsonl_path derivation (basename source, both filename modes,
// does not move with D8 relocation).
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): relay-implement.md carries an Advisory-context read paragraph deriving review_jsonl_path from the <basename> already computed in Parse arguments, covering both filename modes, stating the jsonl does not move when D8 relocates the plan', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  assert.ok(
    content.includes(
      '**Advisory-context read (plan-review pass-through).** Derive `review_jsonl_path = PRPs/plans/<basename>.review.jsonl` using the `<basename>` already computed in `## Parse arguments` (both PRD-mode and PRD-less filenames apply the same derivation; the jsonl is basename-keyed and does NOT move when D8 later relocates the plan to `completed/`).'
    ),
    'expected the Advisory-context read paragraph\'s label and review_jsonl_path derivation sentence, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4) — the paragraph's no-file silent-skip and existing-file
// LAST-line-parse + class:advisory/passed:false selection into the
// canonical {rubric_id, reason} shape.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): the Advisory-context read paragraph leaves open_advisories empty and continues silently (no halt, no warning) when review_jsonl_path does not exist, and otherwise parses the LAST jsonl line, selecting rows with BOTH class:advisory AND passed:false into the canonical {rubric_id, reason} shape', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  assert.ok(
    content.includes(
      'If `review_jsonl_path` does not exist, leave `open_advisories` empty and continue — no halt, no warning; a pre-materiality or reviewer-less plan simply has no advisories.'
    ),
    'expected the no-file silent-skip sentence, verbatim'
  );
  assert.ok(
    content.includes(
      'If it exists, parse its LAST line (the verdict that approved the current plan state) and set `open_advisories` to that entry\'s `rubric` rows having BOTH `"class": "advisory"` AND `passed: false`, mapped to the canonical shape `{rubric_id: <row id>, reason: <row reason>}`.'
    ),
    'expected the existing-file LAST-line-parse + selection + canonical-shape-mapping sentence, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) — the compatibility rule: a class-less row reads as
// blocking, so pre-materiality review.jsonl entries can never contribute
// an advisory (directly serves AC-A2's "pre-materiality entry with
// class-less rows" zero-open-advisories clause).
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-4): the Advisory-context read paragraph states the Phase-1 compatibility rule — a row without a class field reads as blocking, so review.jsonl entries written before the materiality taxonomy shipped can never contribute an advisory', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  assert.ok(
    content.includes(
      'Compatibility rule: a row without a `class` field reads as blocking (the Phase-1 rule), so `review.jsonl` entries written before the materiality taxonomy shipped can never contribute an advisory.'
    ),
    'expected the class-less-reads-as-blocking compatibility rule sentence, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4) — positioning: the paragraph sits inside Phase A.0,
// after the figma_track methodology read, immediately before the
// Soft-fail concurrency diagnostic paragraph, all before Phase A.1.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4): the Advisory-context read paragraph is positioned inside Phase A.0 — after the figma_track methodology-read paragraph, immediately before the Soft-fail concurrency diagnostic paragraph, and before the Phase A.1 heading', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const figmaIdx = content.indexOf(
    'Also read the same `docs/context/methodology.md` frontmatter for the `figma_track` key,'
  );
  const paragraphIdx = content.indexOf(ADVISORY_CONTEXT_READ_PARAGRAPH);
  const softFailIdx = content.indexOf('Soft-fail concurrency diagnostic per source PRD D18:');
  const phaseA1Idx = content.indexOf('### Phase A.1 — Per-attempt pre-flight checks (in order)');

  assert.notEqual(figmaIdx, -1, 'expected the pre-existing figma_track methodology-read paragraph');
  assert.notEqual(paragraphIdx, -1, 'expected the full Advisory-context read paragraph, verbatim, as one contiguous block');
  assert.notEqual(softFailIdx, -1, 'expected the pre-existing Soft-fail concurrency diagnostic paragraph');
  assert.notEqual(phaseA1Idx, -1, 'expected the Phase A.1 heading');

  assert.ok(
    figmaIdx < paragraphIdx && paragraphIdx < softFailIdx && softFailIdx < phaseA1Idx,
    'expected figma_track paragraph -> Advisory-context read paragraph -> Soft-fail paragraph -> Phase A.1 heading, strictly in this order'
  );

  const gap = content.slice(paragraphIdx + ADVISORY_CONTEXT_READ_PARAGRAPH.length, softFailIdx);
  assert.equal(
    gap.trim(),
    '',
    'expected the Soft-fail paragraph positioned immediately after the Advisory-context read paragraph, with no other paragraph between them'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-4), AC-A2 (PRD AC-4) — Phase A.2 payload: the six keys in
// order, advisories landing strictly between prior_feedback and
// base_commit, no other payload line disturbed.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-4), AC-A2 (PRD AC-4): relay-implement.md\'s Phase A.2 Task(subagent_type="implementer", ...) payload carries plan_path, target_root, attempt, prior_feedback, advisories, base_commit in this exact order, with advisories landing immediately between prior_feedback and base_commit and no other payload line touched', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const dispatchOpenIdx = content.indexOf('Task(subagent_type="implementer",');
  assert.notEqual(dispatchOpenIdx, -1, 'expected the Task(subagent_type="implementer", ...) dispatch opening');

  const planPathIdx = content.indexOf(PLAN_PATH_LINE, dispatchOpenIdx);
  const targetRootIdx = content.indexOf(TARGET_ROOT_LINE, dispatchOpenIdx);
  const attemptIdx = content.indexOf(ATTEMPT_LINE, dispatchOpenIdx);
  const priorIdx = content.indexOf(PRIOR_FEEDBACK_LINE, dispatchOpenIdx);
  const advisoriesIdx = content.indexOf(ADVISORIES_LINE, dispatchOpenIdx);
  const baseCommitIdx = content.indexOf(BASE_COMMIT_LINE, dispatchOpenIdx);

  /** @type {[string, number][]} */
  const namedIdxs = [
    ['plan_path', planPathIdx],
    ['target_root', targetRootIdx],
    ['attempt', attemptIdx],
    ['prior_feedback', priorIdx],
    ['advisories', advisoriesIdx],
    ['base_commit', baseCommitIdx],
  ];
  for (const [name, idx] of namedIdxs) {
    assert.notEqual(idx, -1, `expected the ${name} payload line inside the dispatch block`);
  }

  assert.ok(
    planPathIdx < targetRootIdx &&
      targetRootIdx < attemptIdx &&
      attemptIdx < priorIdx &&
      priorIdx < advisoriesIdx &&
      advisoriesIdx < baseCommitIdx,
    'expected the six payload lines in this exact order'
  );

  const gapBeforeAdvisories = content.slice(priorIdx + PRIOR_FEEDBACK_LINE.length, advisoriesIdx);
  assert.equal(
    gapBeforeAdvisories.trim(),
    '',
    'expected the advisories line immediately after prior_feedback, no intervening payload line'
  );
  const gapAfterAdvisories = content.slice(advisoriesIdx + ADVISORIES_LINE.length, baseCommitIdx);
  assert.equal(
    gapAfterAdvisories.trim(),
    '',
    'expected base_commit immediately after advisories, no intervening payload line'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) — the omitted-when-empty guarantee: OMITTED not null,
// byte-identical dispatch when empty; non-blocking, non-budget-counted,
// computed once, carried unmodified.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-4): the omitted-when-empty guarantee paragraph states the advisories key is OMITTED (not null) for a byte-identical zero-advisory dispatch, and that advisories are non-blocking, non-budget-counted, computed once in Phase A.0, and carried unmodified across every attempt of the invocation', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  assert.ok(
    content.includes(
      'When open_advisories is empty, the advisories key is OMITTED from the payload entirely — not passed as null — so a zero-advisory dispatch is byte-identical to the pre-Phase-3 dispatch.'
    ),
    'expected the OMITTED-not-null byte-identical-when-empty guarantee sentence, verbatim'
  );
  assert.ok(
    content.includes(
      'Advisories are non-blocking caveats: they are never a retry trigger, are never counted by any budget (`max_implement_retries`, `max_implement_minutes`, `max_disputes_per_session`), and are identical on every attempt of the same plan state — `open_advisories` is computed ONCE in Phase A.0 and carried unmodified into every attempt\'s dispatch of this invocation (the approving verdict does not change mid-invocation; a fresh `/relay-implement` invocation recomputes it), never accumulated or mutated by the loop.'
    ),
    'expected the non-blocking / non-budget-counted / computed-once / carried-unmodified guarantee sentence, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) (regression guard) — the pre-existing prior_feedback
// condition-note paragraph is byte-identical to its pre-Phase-3 wording
// (Task 2's "byte-intact" requirement), with the new guarantee paragraph
// positioned strictly after it.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-4) (regression guard): the pre-existing prior_feedback condition-note paragraph remains byte-identical to its pre-Phase-3 wording, with the new omitted-when-empty guarantee paragraph positioned strictly after it and before the "implementer reads the plan" paragraph', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const conditionNoteIdx = content.indexOf(PRIOR_FEEDBACK_CONDITION_NOTE);
  assert.notEqual(conditionNoteIdx, -1, 'expected the pre-existing prior_feedback condition-note paragraph, byte-identical');

  const guaranteeIdx = content.indexOf(
    'When open_advisories is empty, the advisories key is OMITTED from the payload entirely'
  );
  const implementerReadsIdx = content.indexOf('The implementer reads the plan, executes its Step-by-Step Tasks');

  assert.notEqual(guaranteeIdx, -1, 'expected the omitted-when-empty guarantee paragraph');
  assert.notEqual(implementerReadsIdx, -1, 'expected the "implementer reads the plan" paragraph');

  assert.ok(
    conditionNoteIdx < guaranteeIdx && guaranteeIdx < implementerReadsIdx,
    'expected condition-note paragraph -> omitted-when-empty guarantee paragraph -> "implementer reads the plan" paragraph, strictly in this order'
  );
});
