// @ts-check
/**
 * Content-invariant tests for the advisory-consumption protocol text
 * introduced by Phase 3 of PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-3-advisory-pass-through.plan.md)
 * in plugins/relay/agents/implementer.md: the new `advisories` input
 * bullet in `## Inputs (from the calling command)`, and the
 * `**Advisory consumption (non-blocking).**` paragraph declaring its
 * consumption rule.
 *
 * `implementer` is an LLM-executed markdown agent protocol, not
 * deterministic code — there is no function to invoke and observe a real
 * plan execution from in a node:test unit test. The honest,
 * spot-verifiable coverage available (the same static-protocol-text shape
 * every *.test.mjs file in this corpus already uses when asserting
 * agent-markdown content, e.g. plan-reviewer-materiality-gating.test.mjs)
 * is static assertion on the PROTOCOL TEXT the implementer agent reads and
 * follows before executing a plan's tasks.
 *
 * This file covers PRD AC-4 (Advisory injection into the Implementer) —
 * plan AC-A3 — specifically the declared-input-and-consumption-rule half.
 * The read side (Phase A.0) and injection side (Phase A.2 payload) of the
 * same PRD AC live in a different source file
 * (plugins/relay/commands/relay-implement.md) and are covered separately
 * by relay-implement-materiality-advisory-dispatch.test.mjs.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-3-advisory-pass-through.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — corpus-wide
 * search across all 50 pre-existing scripts/validate/checks/*.test.mjs
 * files for "advisories", "Advisory consumption", and every existing
 * real-content read of implementer.md): zero matches for any of this
 * phase's new text. feedback-chain.test.mjs's `PLAN_WRITER_INVARIANTS`
 * structural check (bullet/divider adjacency under a heading literally
 * named "## Inputs (from the calling command)") is scoped only to
 * plugins/relay/agents/plan-writer.md — never to implementer.md — and its
 * own IMPLEMENTER_CONTENT fixture is a synthetic string using the
 * unsuffixed heading "## Inputs" (no "(from the calling command)"),
 * deliberately decoupled from this file's real content. feedback-chain.mjs's
 * real-wrapper check on implementer.md only requires the substring
 * `prior_feedback` and a line starting `## Targeted revision mode` —
 * unaffected by this phase's insertion (the real heading
 * "## Targeted revision mode (when `prior_feedback` is non-empty)" still
 * matches that unanchored prefix check). No pre-existing test asserts on
 * implementer.md's Inputs bullet list, its bullet count, or the `---`
 * dividers surrounding it. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-3/attempts/2/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A3 (PRD AC-4) — "Given the implementer receives the advisories
 *     input, when it executes the plan, then its declared consumption
 *     rule treats each advisory as a non-blocking caveat (content-search a
 *     drifted cite, double-check a flagged section) that never adds
 *     tasks, never modifies the plan, and imposes zero obligations when
 *     the input is absent."
 *
 * Run: node --test scripts/validate/checks/implementer-materiality-advisory-consumption.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const IMPLEMENTER_PATH = 'plugins/relay/agents/implementer.md';

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
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space. Mirrors the sibling *.test.mjs files' helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

const PRIOR_FEEDBACK_BULLET_COLLAPSED =
  '- `prior_feedback` *(optional, default `null`)*: the `code-reviewer` defect list from a prior `CHANGES_REQUESTED` verdict on this same plan, in the canonical `list<{rubric_id, reason}>` shape. `/relay-implement` has been sending this on every attempt after the first (its Phase A.2 dispatch payload); until this input was declared, you had no protocol for it and silently re-ran the whole plan instead. When non-empty, follow `## Targeted revision mode` below.';

const ADVISORIES_BULLET_COLLAPSED =
  '- `advisories` *(optional, default absent)*: open advisory findings from the plan-review verdict that approved this plan, in the canonical `list<{rubric_id, reason}>` shape, explicitly NON-BLOCKING. Sent by `/relay-implement` only when the approving verdict carries advisory-classed failing rows.';

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — the advisories Inputs bullet: declared immediately
// after prior_feedback, canonical shape, explicit NON-BLOCKING marking,
// sent-only-when-condition.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): implementer.md declares the advisories input bullet immediately after the prior_feedback bullet — optional/default-absent, canonical list<{rubric_id, reason}> shape, explicitly NON-BLOCKING, sent only when the approving verdict carries advisory-classed failing rows', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);

  assert.ok(
    content.includes('below.\n- `advisories` *(optional, default absent)*:'),
    'expected the advisories bullet positioned on the line immediately after the prior_feedback bullet\'s closing "below." sentence, with no other bullet or blank line between them'
  );

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(ADVISORIES_BULLET_COLLAPSED),
    'expected the full advisories bullet text, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — structural positioning: Inputs heading -> advisories
// bullet -> --- divider -> Advisory consumption paragraph -> --- divider
// -> Targeted revision mode heading, strictly in this order, with both
// dividers immediately bounding the consumption paragraph.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): the Advisory consumption paragraph is sandwiched between two --- dividers, positioned strictly after the Inputs section (with its new advisories bullet) and before ## Targeted revision mode', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);

  const inputsHeadingIdx = content.indexOf('## Inputs (from the calling command)');
  const advisoriesBulletIdx = content.indexOf('- `advisories` *(optional, default absent)*:');
  const consumptionLabelIdx = content.indexOf('**Advisory consumption (non-blocking).**');
  const targetedRevisionHeadingIdx = content.indexOf(
    '## Targeted revision mode (when `prior_feedback` is non-empty)'
  );

  assert.notEqual(inputsHeadingIdx, -1, 'expected the Inputs heading');
  assert.notEqual(advisoriesBulletIdx, -1, 'expected the advisories bullet');
  assert.notEqual(consumptionLabelIdx, -1, 'expected the Advisory consumption paragraph label');
  assert.notEqual(targetedRevisionHeadingIdx, -1, 'expected the Targeted revision mode heading');

  assert.ok(
    inputsHeadingIdx < advisoriesBulletIdx &&
      advisoriesBulletIdx < consumptionLabelIdx &&
      consumptionLabelIdx < targetedRevisionHeadingIdx,
    'expected Inputs heading -> advisories bullet -> Advisory consumption paragraph -> Targeted revision mode heading, strictly in this order'
  );

  const dividerBeforeIdx = content.indexOf('---', advisoriesBulletIdx);
  assert.notEqual(dividerBeforeIdx, -1, 'expected a --- divider after the advisories bullet');
  assert.ok(dividerBeforeIdx < consumptionLabelIdx, 'expected that divider positioned before the consumption paragraph');
  const gapBefore = content.slice(dividerBeforeIdx + '---'.length, consumptionLabelIdx);
  assert.equal(
    gapBefore.trim(),
    '',
    'expected nothing but whitespace between the --- divider and the Advisory consumption paragraph'
  );

  const consumptionParagraphEndAnchor = 'silently dropped — the 2026-07-30 severed-pipe lesson.';
  const consumptionEndIdx = content.indexOf(consumptionParagraphEndAnchor, consumptionLabelIdx);
  assert.notEqual(consumptionEndIdx, -1, 'expected the consumption paragraph\'s closing sentence');
  const dividerAfterIdx = content.indexOf('---', consumptionEndIdx);
  assert.notEqual(dividerAfterIdx, -1, 'expected a --- divider after the consumption paragraph');
  assert.ok(
    dividerAfterIdx < targetedRevisionHeadingIdx,
    'expected that divider positioned before the Targeted revision mode heading'
  );
  const gapAfter = content.slice(consumptionEndIdx + consumptionParagraphEndAnchor.length, dividerAfterIdx);
  assert.equal(
    gapAfter.trim(),
    '',
    'expected nothing but whitespace between the consumption paragraph\'s closing sentence and the following --- divider'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — the consumption rule's read-before-executing
// directive with its two concrete caveat examples.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): the Advisory consumption paragraph directs reading advisories BEFORE executing tasks, treating each as a caveat, with concrete examples — content-search a drifted file:line cite, double-check a flagged section against the tree', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      '**Advisory consumption (non-blocking).** Read any `advisories` BEFORE executing tasks and treat each as a caveat to absorb during normal execution — e.g. a drifted `file:line` cite means locate the pattern by content search instead of trusting the number; a flagged section means double-check it against the tree while working.'
    ),
    'expected the read-before-executing directive with both concrete caveat examples, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — the consumption rule's bounding guarantees: never
// adds tasks, never modifies the plan, never gates completion, zero
// obligations when absent.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): the Advisory consumption paragraph states advisories NEVER add tasks, never modify the plan, never gate completion, and impose zero obligations when the input is absent', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Advisories NEVER add tasks, never modify the plan, and never gate completion; they impose zero obligations when the input is absent.'
    ),
    'expected the never-add-tasks / never-modify-the-plan / never-gate-completion / zero-obligations-when-absent sentence, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — the consumption rule's severed-pipe framing: the
// declaration exists so the value is consumed, not silently dropped.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): the Advisory consumption paragraph states its declaration exists so the passed advisories value is consumed rather than silently dropped, citing the 2026-07-30 severed-pipe lesson', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'This declaration exists so the passed value is consumed rather than silently dropped — the 2026-07-30 severed-pipe lesson.'
    ),
    'expected the consumed-rather-than-silently-dropped / severed-pipe-lesson closing sentence, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) (regression guard) — the pre-existing prior_feedback
// bullet remains byte-identical (collapsed) to its pre-Phase-3 wording.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4) (regression guard): the pre-existing prior_feedback Inputs bullet remains byte-identical to its pre-Phase-3 wording — the advisories bullet was purely additive', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(PRIOR_FEEDBACK_BULLET_COLLAPSED),
    'expected the prior_feedback bullet unchanged, byte-identical (collapsed)'
  );
});
