// @ts-check
/**
 * Content-invariant tests for the advisory-surfacing protocol text
 * introduced by Phase 3 of PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-3-advisory-pass-through.plan.md)
 * in plugins/relay/commands/relay-plan-review.md: the APPROVED-outcome
 * bullet's new conditional second summary line, and the
 * `## Final output surface` section's new verbatim-passthrough /
 * console-only-by-design sentence.
 *
 * `relay-plan-review` is an LLM-executed markdown command protocol, not
 * deterministic code — there is no function to invoke and observe a real
 * command run from in a node:test unit test. The honest, spot-verifiable
 * coverage available (the same static-protocol-text shape every
 * *.test.mjs file in this corpus already uses when asserting
 * command-markdown content) is static assertion on the PROTOCOL TEXT the
 * command's own documentation carries about the Reviewer's verdict it
 * surfaces verbatim.
 *
 * This file covers PRD AC-1's surfacing facet (Advisory-only failures
 * approve) — plan AC-A4. PRD AC-1's gating/flip/jsonl-class-field facet
 * was already delivered and covered by Phase 1
 * (plan-reviewer-materiality-gating.test.mjs); this phase adds a NEW
 * facet layered on top — the COMMAND's own documentation of the
 * passthrough surfacing, distinct from the AGENT's emission of the line
 * it documents (see the cross-file distinction note below). Plan AC-A1,
 * AC-A2 (relay-implement.md) and AC-A3 (implementer.md) are covered by
 * their own sibling files in this corpus.
 *
 * Cross-file distinction (important — do not conflate with Phase 1's
 * coverage): plan-reviewer-materiality-gating.test.mjs already asserts
 * the identical literal string `Open advisories: <n> (recorded in
 * review.jsonl; not gating).` — but against
 * plugins/relay/agents/plan-reviewer.md (the AGENT, where the Reviewer
 * itself emits that verdict line, Step 4's final-summary prose). THIS
 * file asserts the same string's occurrence inside
 * plugins/relay/commands/relay-plan-review.md (the COMMAND, a different
 * source file entirely) — the command's own prose describing/naming that
 * the line, when present, flows through its passthrough contract
 * verbatim. Both files now legitimately contain the string because both
 * documents describe the same observable phenomenon from their own two
 * distinct roles (emitter vs. verbatim-relayer); this is not a duplicate
 * assertion, since R-DUPLICATE concerns same-property-same-file coverage,
 * and these are two different SUT files.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-3-advisory-pass-through.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — corpus-wide
 * search across all 50 pre-existing scripts/validate/checks/*.test.mjs
 * files for the literal strings `Plan **APPROVED**`, `Ready for the
 * Implementer`, `appends nothing of its own`, `jsonl log entry is the
 * audit trail`, and `console-only`): zero real-content matches against
 * relay-plan-review.md anywhere in the corpus. The only two files
 * referencing this path at all (timestamp-contract.test.mjs,
 * dispatch-graph.test.mjs) use it solely as a key into their own
 * synthetic in-memory fixtures, never reading the real file content in
 * this region. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-3/attempts/2/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A4 (PRD AC-1) — "Given the plan-reviewer approves with the
 *     advisory-carrying two-line summary, when /relay-plan-review
 *     surfaces the verdict, then the 'Open advisories' line flows through
 *     verbatim, the command's prose names the advisory case, and no
 *     sidecar artifact is written (console-only surfacing)."
 *
 * Run: node --test scripts/validate/checks/relay-plan-review-materiality-advisory-surfacing.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RELAY_PLAN_REVIEW_PATH = 'plugins/relay/commands/relay-plan-review.md';

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

const PASSTHROUGH_SENTENCE_COLLAPSED =
  'The command appends nothing of its own to the Reviewer\'s verdict text. The jsonl log entry is the audit trail; the verbatim verdict text is the user-facing surface.';

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1 surfacing facet) — the APPROVED-outcome bullet: the
// conditional second-line framing, the exact advisory summary line, and
// the still-APPROVED informational-only closing, in order, between the
// base summary and the CHANGES_REQUESTED branch.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-1 surfacing facet): relay-plan-review.md\'s APPROVED-outcome bullet names the conditional second advisories summary line, its exact text, and the still-APPROVED informational-only framing, positioned between "Ready for the Implementer." and the CHANGES_REQUESTED branch', () => {
  const content = readRepoFile(RELAY_PLAN_REVIEW_PATH);

  const block = sliceBetween(
    content,
    '> Ready for the Implementer.',
    '2. **One or more fail** → CHANGES_REQUESTED:'
  );
  assert.ok(block, 'expected an extractable APPROVED-outcome block between the base summary and the CHANGES_REQUESTED branch');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'When one or more advisory-classed rows are open (`passed: false`) on that same APPROVED entry, the summary MAY carry a second line:'
    ),
    'expected the conditional second-line framing sentence, verbatim'
  );
  assert.ok(
    collapsed.includes('> Open advisories: <n> (recorded in review.jsonl; not gating).'),
    'expected the exact advisory summary line, verbatim'
  );
  assert.ok(
    collapsed.includes(
      'An advisory-carrying APPROVED is still APPROVED — the flip proceeds and nothing gates; the second line is informational only.'
    ),
    'expected the still-APPROVED informational-only closing framing, verbatim'
  );

  // Positioning within the full (uncollapsed) content: all four anchors in
  // strict order, proving the new material was inserted after the base
  // summary and before the CHANGES_REQUESTED branch, not scattered
  // elsewhere in the file.
  const readyIdx = content.indexOf('> Ready for the Implementer.');
  const framingIdx = content.indexOf('When one or more advisory-classed rows are open');
  const lineIdx = content.indexOf('> Open advisories: <n> (recorded in review.jsonl; not gating).');
  const stillApprovedIdx = content.indexOf('An advisory-carrying APPROVED is still APPROVED');
  const changesRequestedIdx = content.indexOf('2. **One or more fail** → CHANGES_REQUESTED:');

  assert.notEqual(readyIdx, -1, 'expected the base "Ready for the Implementer." line');
  assert.notEqual(framingIdx, -1, 'expected the conditional framing sentence');
  assert.notEqual(lineIdx, -1, 'expected the exact advisory summary line');
  assert.notEqual(stillApprovedIdx, -1, 'expected the still-APPROVED closing framing');
  assert.notEqual(changesRequestedIdx, -1, 'expected the CHANGES_REQUESTED branch');

  assert.ok(
    readyIdx < framingIdx && framingIdx < lineIdx && lineIdx < stillApprovedIdx && stillApprovedIdx < changesRequestedIdx,
    'expected "Ready for the Implementer." -> framing sentence -> advisory summary line -> still-APPROVED framing -> CHANGES_REQUESTED branch, strictly in this order'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1 surfacing facet) — the Final output surface section's
// new sentence: verbatim passthrough of the advisory line, positioned
// after the pre-existing passthrough-contract sentence and before
// ## Constraints.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-1 surfacing facet): relay-plan-review.md\'s Final output surface section gains a sentence stating the advisory line flows through verbatim like the rest of the verdict and the command still appends nothing of its own, positioned strictly after the pre-existing passthrough-contract sentence and before ## Constraints', () => {
  const content = readRepoFile(RELAY_PLAN_REVIEW_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(PASSTHROUGH_SENTENCE_COLLAPSED),
    'expected the pre-existing passthrough-contract sentence to still be present'
  );
  assert.ok(
    collapsed.includes(
      'When the summary carries the second advisory line, it flows through verbatim exactly like the rest of the verdict — the command still appends nothing of its own, and no sidecar artifact is written; standalone `/relay-plan-review` surfacing is console-only by design.'
    ),
    'expected the new advisory-passthrough sentence, verbatim'
  );

  const passthroughIdx = content.indexOf('The command appends nothing of its own to the Reviewer\'s verdict');
  const advisoryPassthroughIdx = content.indexOf('When the summary carries the second advisory line');
  const constraintsIdx = content.indexOf('## Constraints (hard rules)');

  assert.notEqual(passthroughIdx, -1, 'expected the pre-existing passthrough-contract sentence start');
  assert.notEqual(advisoryPassthroughIdx, -1, 'expected the new advisory-passthrough sentence start');
  assert.notEqual(constraintsIdx, -1, 'expected the ## Constraints heading');

  assert.ok(
    passthroughIdx < advisoryPassthroughIdx && advisoryPassthroughIdx < constraintsIdx,
    'expected passthrough-contract sentence -> new advisory-passthrough sentence -> ## Constraints heading, strictly in this order'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1 surfacing facet) — the no-sidecar-artifact /
// console-only-by-design clause (PRD OQ-3's resolution; the plan's NOT
// Building scope limit against any standalone-surfacing sidecar). This test
// is deliberately NOT a substring re-check of the sentence the preceding
// test already pins in full (that would be non-discriminative — see the
// R-DUPLICATE correction note below); it instead scans the WHOLE file for
// stray advisory-related instructions the two known regions do not account
// for, which is the only way to falsify "no sidecar artifact is written" as
// a file-wide property rather than as a single sentence's presence.
//
// R-DUPLICATE correction (test-reviewer CHANGES_REQUESTED, targeted
// revision, attempt 2): the original version of this test asserted only the
// substring 'no sidecar artifact is written; standalone `/relay-plan-review`
// surfacing is console-only by design.' — a literal tail-substring of the
// sentence the preceding test already verifies in full, so it could never
// fail independently of that test (zero discriminative power: test 3 passed
// whenever test 2 passed). Rewritten below to a genuinely distinct
// observable: an exhaustive whole-file scan proving no THIRD
// advisory-related instruction exists outside the two known regions.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-1 surfacing facet): every "advisor*" occurrence in relay-plan-review.md falls within one of the two known advisory-surfacing regions (the APPROVED-outcome bullet\'s conditional second-line block, and the Final-output-surface passthrough sentence) — no third, unaccounted-for advisory instruction (e.g. a sidecar-artifact write) exists anywhere else in the command file', () => {
  const content = readRepoFile(RELAY_PLAN_REVIEW_PATH);

  // Region 1: the APPROVED-outcome bullet's conditional advisory sub-block
  // (same anchors the first test in this file already establishes).
  const region1Start = content.indexOf('> Ready for the Implementer.');
  const region1End = content.indexOf('2. **One or more fail** → CHANGES_REQUESTED:');
  assert.notEqual(region1Start, -1, 'expected the APPROVED-outcome region start anchor');
  assert.notEqual(region1End, -1, 'expected the APPROVED-outcome region end anchor');

  // Region 2: the Final-output-surface section, from the pre-existing
  // passthrough-contract sentence through the ## Constraints heading (same
  // anchors the preceding test already establishes).
  const region2Start = content.indexOf('The command appends nothing of its own to the Reviewer\'s verdict');
  const region2End = content.indexOf('## Constraints (hard rules)');
  assert.notEqual(region2Start, -1, 'expected the Final-output-surface region start anchor');
  assert.notEqual(region2End, -1, 'expected the Final-output-surface region end anchor');

  // Every case-insensitive "advisor" occurrence (matches "advisory" /
  // "advisories") must fall inside region 1 or region 2. A stray THIRD
  // occurrence anywhere else in the file — e.g. an instruction to write an
  // advisory-specific sidecar artifact elsewhere in the command — would
  // fail this scan even though it would leave both pinned sentences (each
  // checked by name in the two preceding tests) completely untouched; that
  // is precisely the gap a substring re-check of one sentence cannot see.
  const advisorPattern = /advisor/gi;
  const strayOccurrences = [];
  let match;
  while ((match = advisorPattern.exec(content)) !== null) {
    const idx = match.index;
    const inRegion1 = idx >= region1Start && idx < region1End;
    const inRegion2 = idx >= region2Start && idx < region2End;
    if (!inRegion1 && !inRegion2) {
      strayOccurrences.push({ index: idx, context: content.slice(Math.max(0, idx - 30), idx + 30) });
    }
  }

  assert.equal(
    strayOccurrences.length,
    0,
    `expected zero "advisor*" occurrences outside the two known advisory-surfacing regions; found: ${JSON.stringify(strayOccurrences)}`
  );
});
