// @ts-check
/**
 * Content-invariant tests for the retry-convergence ratchet's INVOKER-side
 * protocol text introduced by Phase 2 of
 * PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md)
 * in plugins/relay/commands/relay-execute.md's Step A.3.2: the new
 * pre-adoption hash-capture step (the exact dependency-free node one-liner
 * computing `plan_sha256` + per-section `section_hashes`, re-run on every
 * loop iteration), the blocking-only stuck-detection extraction sentence
 * ("whose class is blocking"), the blocking-effective-only `prior_feedback`
 * capture sentence, and the repaired `plan-reviewer.md:459-483` stale
 * line-range pointer.
 *
 * `relay-execute.md` is an LLM-executed markdown command protocol, not
 * deterministic code — there is no function to invoke and observe a real
 * orchestrator run from in a node:test unit test. The honest,
 * spot-verifiable coverage available (the same static-protocol-text shape
 * every *.test.mjs file in this corpus already uses when asserting
 * relay-execute.md content, e.g. figma-track-phase7.test.mjs and
 * figma-visual-first-track-phase6.test.mjs) is static assertion on the
 * PROTOCOL TEXT the orchestrator reads and follows at dispatch time.
 *
 * This file covers PRD AC-7 (Stuck-detection composes over blocking ids
 * only) — plan AC-A2 — in full, plus the INVOKER half of PRD AC-9 (Ratchet
 * integrity hash) — plan AC-A3 — since the hash *computation* lives in
 * relay-execute.md while the hash *recording/schema* lives in
 * plan-reviewer.md (covered by plan-reviewer-materiality-hash-discipline.test.mjs)
 * and the ratchet's ACTIVE/INACTIVE *decision* also lives in plan-reviewer.md
 * (covered by plan-reviewer-materiality-ratchet-gating.test.mjs). This
 * three-way split mirrors the plan's own `## Files to Change` boundary: one
 * file per PRD-AC-and-source-file pairing, no assertion duplicated across
 * files.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — corpus-wide
 * search across all 47 scripts/validate/checks/*.test.mjs files for
 * "FAILED_PLAN_REVIEW_STUCK", "current_failing_ids", "whose class is
 * blocking", "stuck_rubric_items", "last_plan_review_failing_ids",
 * "plan_sha256", and the stale "plan-reviewer.md:459-483" pointer): zero
 * matches anywhere in the corpus. Five other files reference the literal
 * string "relay-execute.md", but none touch the retry/stuck-detection
 * region (relay-execute.md lines ~336-424) this file covers — that region
 * was completely untested before this file. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-2/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A2 (PRD AC-7) — "Given /relay-execute's plan-review retry loop, when
 *     consecutive CHANGES_REQUESTED verdicts are compared for
 *     FAILED_PLAN_REVIEW_STUCK, then the equality test runs over
 *     blocking-classed failing-id sets only (absent class reads as
 *     blocking), and an advisory-only outcome never enters the retry loop —
 *     it is APPROVED and takes the APPROVED branch."
 *   AC-A3 (PRD AC-9), invoker half — "...when hash inputs are absent (e.g.
 *     standalone /relay-plan-review), the ratchet stays inactive fail-safe
 *     with Phase-1 gating semantics." (relay-execute.md is the ONLY caller
 *     that supplies the hash inputs at all; this file asserts the capture
 *     mechanism that makes non-absence — and therefore ratchet eligibility —
 *     possible on every retry iteration.)
 *
 * Run: node --test scripts/validate/checks/relay-execute-materiality-ratchet.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RELAY_EXECUTE_PATH = 'plugins/relay/commands/relay-execute.md';

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

// The exact dependency-free node one-liner Task 5(a) mandates, quoted
// verbatim in relay-execute.md. Built as a template literal so none of the
// one-liner's many embedded single/double quotes need escaping; only the
// literal two-character `\n` (backslash + n, as it appears inside the JS
// snippet's own single-quoted string, itself embedded in the markdown file)
// needs `\\n` here to survive JS string-literal parsing as those same two
// literal characters rather than an actual newline.
const HASH_ONE_LINER =
  `node -e "const fs=require('fs'),c=require('crypto');const t=fs.readFileSync(process.argv[1],'utf8');const h=s=>c.createHash('sha256').update(s).digest('hex');const out={plan_sha256:h(t),section_hashes:{}};for(const m of t.split(/^(?=## )/m))if(m.startsWith('## '))out.section_hashes[m.split('\\n')[0]]=h(m);console.log(JSON.stringify(out))" <current_plan_path>`;

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-9), invoker half — the hash-capture step: heading,
// positioning before the reviewer adoption, the exact one-liner, and the
// per-iteration re-run / no-stale-reuse rule.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-9) invoker half: relay-execute.md\'s Step A.3.2 carries a Hash capture step positioned before the /relay-plan-review adoption line', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);

  const stepHeadingIdx = content.indexOf('#### Step A.3.2 — Adopt /relay-plan-review role');
  const hashCaptureIdx = content.indexOf('**Hash capture (before each adoption below).**');
  const adoptionLineIdx = content.indexOf(
    'Read `${CLAUDE_PLUGIN_ROOT}/commands/relay-plan-review.md` and execute its full protocol inline against `current_plan_path`.'
  );

  assert.notEqual(stepHeadingIdx, -1, 'expected the Step A.3.2 heading');
  assert.notEqual(hashCaptureIdx, -1, 'expected the Hash capture label');
  assert.notEqual(adoptionLineIdx, -1, 'expected the /relay-plan-review adoption line');
  assert.ok(
    stepHeadingIdx < hashCaptureIdx && hashCaptureIdx < adoptionLineIdx,
    'expected Hash capture positioned strictly between the Step A.3.2 heading and the reviewer adoption line'
  );
});

test('AC-A3 (PRD AC-9) invoker half: the Hash capture step quotes the exact dependency-free node one-liner computing plan_sha256 and per-section section_hashes', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  assert.ok(content.includes(HASH_ONE_LINER), 'expected the exact hash-capture node one-liner, verbatim');
  assert.ok(content.includes('```bash'), 'expected the one-liner fenced as a bash code block');
});

test('AC-A3 (PRD AC-9) invoker half: the Hash capture step is parsed and passed alongside review_started_at, cross-referencing the plan-reviewer agent\'s optional inputs, and is re-run every loop iteration without reusing a stale hash', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "Parse the resulting `{ plan_sha256, section_hashes }` JSON from stdout and pass both values into the reviewer adoption's execution context below, alongside `review_started_at`"
    ),
    'expected the parse-and-pass-through sentence'
  );
  assert.ok(
    collapsed.includes("matching the plan-reviewer agent's optional `plan_sha256` / `section_hashes` inputs"),
    'expected the cross-reference to plan-reviewer.md\'s own optional inputs'
  );
  assert.ok(
    collapsed.includes(
      'Re-run this hash capture on every loop iteration (each retry re-adopts this Step against the current `current_plan_path` content), never reusing a stale hash from an earlier attempt.'
    ),
    'expected the per-iteration re-run / no-stale-reuse rule'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-7) — the blocking-only stuck-detection extraction sentence,
// with a regression guard proving the class-blind Phase-1 wording is gone,
// and confirmation the surrounding equality-test / halt mechanism is
// byte-identical (untouched by this phase).
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-7): the stuck-detection extraction sentence composes current_failing_ids over blocking-classed rows only (absent class reads as blocking)', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Extract the set of blocking-effective failing rubric item IDs from the current verdict (the `id` values of all `passed: false` rows whose class is blocking — a row without a class field reads as blocking). Call this `current_failing_ids`.'
    ),
    'expected the blocking-only current_failing_ids extraction sentence, verbatim'
  );
});

test('AC-A2 (PRD AC-7) (regression guard): the Phase-1 class-blind extraction wording ("rows in the JSONL entry just appended", with no blocking-class filter) is absent from relay-execute.md', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const occurrences = content.split('rows in the JSONL entry just appended').length - 1;
  assert.equal(occurrences, 0, `expected zero occurrences of the stale class-blind extraction fragment, found ${occurrences}`);
});

test('AC-A2 (PRD AC-7): the stuck-loop equality test and the FAILED_PLAN_REVIEW_STUCK halt message opening remain byte-identical to Phase 1 — only the extraction sentence upstream of current_failing_ids changed', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "If `last_plan_review_failing_ids` is **not null** AND `current_failing_ids` is identical to `last_plan_review_failing_ids` (same set of IDs regardless of order), the plan-writer made zero progress on the failing items — the loop is stuck."
    ),
    'expected the unchanged equality-test sentence'
  );
  assert.ok(
    content.includes('> FAILED_PLAN_REVIEW_STUCK. /relay-execute detected a stuck plan-review'),
    'expected the unchanged FAILED_PLAN_REVIEW_STUCK halt message opening'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-7) — the blocking-effective-only prior_feedback capture
// sentence, and the structural On APPROVED / On CHANGES_REQUESTED branch
// split (unchanged) that is how "an advisory-only outcome never enters the
// retry loop" cashes out on the relay-execute.md side (the source-of-truth
// APPROVED-vs-CHANGES_REQUESTED classification is plan-reviewer.md's own,
// covered by Phase 1's plan-reviewer-materiality-gating.test.mjs).
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-7): the CHANGES_REQUESTED capture sentence states prior_feedback carries only blocking-effective rows, since an advisory-only verdict is APPROVED and never reaches this branch', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Capture the rubric defect bullet-list output (format documented at `plugins/relay/agents/plan-reviewer.md`, Step 3 "One or more blocking-classed failures" branch).'
    ),
    'expected the repaired capture-source sentence'
  );
  assert.ok(
    collapsed.includes(
      "This is the structured list of blocking-effective failing rubric item IDs + reasons: `prior_feedback` carries only blocking-effective rows' `{rubric_id, reason}` — advisory rows never gate a retry, since an advisory-only verdict is `APPROVED` and never reaches this CHANGES_REQUESTED branch at all."
    ),
    'expected the blocking-effective-only prior_feedback framing, with the advisory-only-is-APPROVED rationale stated explicitly'
  );
});

test('AC-A2 (PRD AC-7): the On APPROVED / On CHANGES_REQUESTED branch split in Step A.3.2 remains structurally intact and in order (unchanged by this phase)', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const stepHeadingIdx = content.indexOf('#### Step A.3.2 — Adopt /relay-plan-review role');
  assert.notEqual(stepHeadingIdx, -1, 'expected the Step A.3.2 heading');

  // relay-execute.md carries multiple review-adoption steps (plan-review,
  // code-review, test-review, ...), each with its own On APPROVED / On
  // CHANGES_REQUESTED branch labels — scope both searches to start at Step
  // A.3.2's own heading so this resolves to ITS branch labels specifically,
  // not an earlier step's coincidentally-identical label text.
  const onApprovedIdx = content.indexOf('**On APPROVED:**', stepHeadingIdx);
  const onChangesRequestedIdx = content.indexOf('**On CHANGES_REQUESTED:**', stepHeadingIdx);

  assert.notEqual(onApprovedIdx, -1, 'expected the On APPROVED branch label at or after Step A.3.2');
  assert.notEqual(onChangesRequestedIdx, -1, 'expected the On CHANGES_REQUESTED branch label at or after Step A.3.2');
  assert.ok(onApprovedIdx < onChangesRequestedIdx, 'expected On APPROVED to remain positioned before On CHANGES_REQUESTED');
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-7) — the stale plan-reviewer.md:459-483 line-range pointer
// is repaired to a line-number-free citation.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-7): the stale plan-reviewer.md:459-483 line-range pointer is gone, replaced by a line-number-free Step 3 branch citation', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);

  const staleOccurrences = content.split('plan-reviewer.md:459-483').length - 1;
  assert.equal(staleOccurrences, 0, `expected zero occurrences of the stale line-range pointer, found ${staleOccurrences}`);

  assert.ok(
    content.includes('`plugins/relay/agents/plan-reviewer.md`, Step 3 "One or more blocking-classed failures" branch'),
    'expected the repaired, line-number-free citation'
  );
});
