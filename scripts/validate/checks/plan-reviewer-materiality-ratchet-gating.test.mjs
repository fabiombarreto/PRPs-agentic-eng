// @ts-check
/**
 * Content-invariant tests for the retry-convergence ratchet's SCOPE/GATING
 * decision protocol text introduced by Phase 2 of
 * PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md)
 * in plugins/relay/agents/plan-reviewer.md: the new `### Step 1.5 —
 * Prior-verdict ratchet context` subsection (previously_cited_ids /
 * implicated_sections derivation, the three-condition ACTIVE test, the
 * INACTIVE fail-safe causes and ratchet_void_reason discipline), Step 2's
 * `**Blocking-effective (ratchet qualifier).**` paragraph (the downgrade
 * rule and the escalation-valve always-blocking-effective override), Step
 * 3's branch-extension sentences (a fully ratchet-downgraded run still
 * takes the "no blocking-classed failure" branch; a ratchet-downgraded row
 * in the CHANGES_REQUESTED bullet list lands in "Non-blocking advisories"),
 * and Step 4 / Step 4a's "SAME ratchet context, never recomputed"
 * consistency rule.
 *
 * `plan-reviewer` is an LLM-executed markdown protocol, not deterministic
 * code — there is no function to invoke and observe a real verdict from in
 * a node:test unit test. The honest, spot-verifiable coverage available
 * (the same shape every other *.test.mjs file in this corpus asserting
 * plan-reviewer.md behavior already uses, e.g.
 * plan-reviewer-materiality-gating.test.mjs from Phase 1) is static
 * assertion on the PROTOCOL TEXT the LLM reads and follows at review time.
 *
 * This file covers PRD AC-5 (Retry convergence ratchet) — plan AC-A1 — and
 * the ratchet-SCOPE half of PRD AC-9 (Ratchet integrity hash): the
 * ACTIVE/INACTIVE decision and ratchet_void_reason recording live in the
 * SAME Step 1.5 subsection as the scope derivation, so this file covers
 * both halves together rather than splitting a single subsection across two
 * files. The jsonl SCHEMA/logging half of AC-9 (the `## Inputs` optional
 * hash fields, the `### Hash discipline` subsection, and Step 4's
 * hash-carrying bullet) is covered separately by
 * plan-reviewer-materiality-hash-discipline.test.mjs — that split mirrors
 * Phase 1's own precedent of separating the Step 2/3/4 gating file from the
 * dedicated class-field-schema DERIVED file. PRD AC-7 (stuck-detection
 * composes over blocking ids only) is covered by
 * relay-execute-materiality-ratchet.test.mjs, since it lives entirely in
 * plugins/relay/commands/relay-execute.md, a different source file.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — corpus-wide
 * search across all 47 scripts/validate/checks/*.test.mjs files for
 * "ratchet", "blocking-effective", "Step 1.5", "previously_cited_ids",
 * "implicated_sections", "ratchet_void_reason", and "out-of-scope-new-
 * finding"): zero matches anywhere in the corpus. None of this file's
 * assertions are covered anywhere else — NEW_TEST_REQUIRED throughout.
 * plan-reviewer-materiality-gating.test.mjs (Phase 1) asserts the Step 3
 * branch HEADINGS this file also touches, but only their class-aware
 * wording from Phase 1 — not the ratchet-extension sentences Phase 2 added
 * after them, which is what this file adds (verified by direct comparison
 * against Phase 1's byte-pinned assertions: none overlap this file's
 * fragments).
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-2/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A1 (PRD AC-5) — "Given a re-review at attempt N>=2 following a
 *     Targeted-revision retry with an active ratchet, when the reviewer
 *     finds a new defect in a section NOT implicated by the previous
 *     verdict's cited ids, then the finding is logged with "class":
 *     "advisory" plus the "ratchet": "out-of-scope-new-finding" annotation
 *     and does not produce CHANGES_REQUESTED; findings on previously-cited
 *     ids or inside implicated sections retain their declared class and
 *     may gate."
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-materiality-ratchet-gating.test.mjs
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
// AC-A1 (PRD AC-5) — Step 1.5 exists, is positioned between Step 1 and
// Step 2, and derives previously_cited_ids / implicated_sections per the
// plan-writer.md Targeted revision mode mapping contract.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): plan-reviewer.md carries a ### Step 1.5 — Prior-verdict ratchet context subsection positioned between Step 1 and Step 2', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  assert.ok(content.includes('### Step 1.5 — Prior-verdict ratchet context'), 'expected the Step 1.5 heading');

  const step1Idx = content.indexOf('### Step 1 — Load and parse');
  assert.notEqual(step1Idx, -1, 'expected Step 1 heading');

  // Both Step 3 and Hash discipline later cross-reference this heading
  // inline as "`### Step 1.5 — Prior-verdict ratchet context`" — those
  // mentions sit AFTER the real heading, so a plain indexOf from the start
  // of the file already resolves correctly, but scope from step1Idx anyway
  // for the same defensive reason the Hash discipline heading search does
  // (plan-reviewer-materiality-hash-discipline.test.mjs hit a real
  // duplicate-substring collision on an earlier cross-reference).
  const step15Idx = content.indexOf('### Step 1.5 — Prior-verdict ratchet context', step1Idx);
  const step2Idx = content.indexOf('### Step 2 — Run the rubric', step15Idx);

  assert.notEqual(step15Idx, -1, 'expected the Step 1.5 heading at or after Step 1');
  assert.notEqual(step2Idx, -1, 'expected Step 2 heading at or after Step 1.5');
  assert.ok(step1Idx < step15Idx && step15Idx < step2Idx, 'expected Step 1.5 positioned strictly between Step 1 and Step 2');
});

test('AC-A1 (PRD AC-5): Step 1.5 derives previously_cited_ids from the prior CHANGES_REQUESTED entry\'s blocking-classed ids only, excluding that same entry\'s advisory-classed ids', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'set `previously_cited_ids` to that entry\'s blocking-classed `passed: false` ids (an advisory-classed failing id on that same entry is never previously-cited for ratchet purposes).'
    ),
    'expected the previously_cited_ids derivation sentence, explicitly excluding advisory-classed ids from that same entry'
  );
});

test('AC-A1 (PRD AC-5): Step 1.5 derives implicated_sections via the same cited-id-to-sections mapping contract plan-writer.md\'s Targeted revision mode uses, with a reason-based fallback for unrecognized ids', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Derive `implicated_sections` by mapping each id in `previously_cited_ids` to the plan section(s) it implicates — the same cited-id→sections mapping `plan-writer.md`\'s `## Targeted revision mode` item 2 applies from the writer\'s side'
    ),
    'expected the implicated_sections derivation sentence cross-referencing plan-writer.md\'s Targeted revision mode item 2'
  );
  assert.ok(
    collapsed.includes(
      'Map each cited `rubric_id` to the sections it implicates. Correct only those sections. A `rubric_id` you do not recognize is still addressed: read its `reason` and fix what the reason describes.'
    ),
    'expected the verbatim-quoted mapping contract text from plan-writer.md'
  );
  assert.ok(
    collapsed.includes(
      'a `rubric_id` with no obvious section is mapped the same way, by reading its stored `reason` and identifying the section that reason describes.'
    ),
    'expected the reason-based fallback sentence for an unrecognized rubric_id'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) / AC-A3 (PRD AC-9) scope half — the ACTIVE three-condition
// test and the INACTIVE fail-safe causes + ratchet_void_reason discipline.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5), AC-A3 (PRD AC-9): Step 1.5\'s ratchet is ACTIVE only when all three named conditions hold (prior section_hashes present, this invocation\'s section_hashes present, every non-implicated section\'s hash unchanged by string-equality)', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes('The ratchet is **ACTIVE** only when ALL of the following hold:'), 'expected the ACTIVE conjunctive-conditions intro sentence');
  assert.ok(
    collapsed.includes('The prior (last) jsonl entry carries a `section_hashes` map.'),
    'expected ACTIVE condition 1 (prior entry carries section_hashes)'
  );
  assert.ok(
    collapsed.includes('This invocation received a `section_hashes` input (see `## Inputs` above).'),
    'expected ACTIVE condition 2 (this invocation received section_hashes)'
  );
  assert.ok(
    collapsed.includes(
      "Every section OUTSIDE `implicated_sections` has an unchanged hash — string-equality between the prior entry's `section_hashes` map and this invocation's `section_hashes` map, checked for every key not in `implicated_sections`. This is a string comparison only; this agent never computes a hash."
    ),
    'expected ACTIVE condition 3 (unchanged-hash string-equality outside implicated_sections, explicitly a string comparison only)'
  );
});

test('AC-A1 (PRD AC-5), AC-A3 (PRD AC-9): Step 1.5\'s INACTIVE causes are enumerated (no prior entry, prior APPROVED, either hash map absent, or a non-implicated hash mismatch), and ratchet_void_reason is recorded only for the out-of-contract-edit cause, never for the other causes', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "Any other state — no prior entry, the prior entry's verdict was `APPROVED`, either hash map is absent, or a non-implicated section's hash differs between the two maps — sets the ratchet **INACTIVE**."
    ),
    'expected the enumerated INACTIVE-causes sentence'
  );
  assert.ok(
    collapsed.includes('record `ratchet_void_reason` as a one-sentence explanation naming the changed section'),
    'expected the ratchet_void_reason recording instruction for the out-of-contract-edit cause'
  );
  assert.ok(
    collapsed.includes('out-of-contract edit detected in section'),
    'expected the worked ratchet_void_reason example text'
  );
  assert.ok(
    collapsed.includes(
      'Every other inactive cause (no prior entry, prior APPROVED, either hash map absent) leaves `ratchet_void_reason` unset — inactive-by-absence is the normal, expected state, not a violation to record.'
    ),
    'expected the explicit non-violation framing for the non-hash-mismatch INACTIVE causes'
  );
});

test('AC-A1 (PRD AC-5): an INACTIVE ratchet gates exactly as Phase 1 shipped (full blocking scope), and the ratchet can only narrow gating, never widen it or change what is evaluated/logged', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      '**An inactive ratchet means Step 2/3 gate exactly as Phase 1 shipped** — full blocking scope, every blocking-classed failing row gates.'
    ),
    'expected the INACTIVE-ratchet-equals-Phase-1-semantics invariant'
  );
  assert.ok(
    collapsed.includes(
      'The ratchet can only narrow what gates approval; it never widens gating, and it never changes WHAT is evaluated or logged — Step 2 still runs the full rubric plus coherence layer every time (AC-10 no-short-circuit, unchanged).'
    ),
    'expected the narrows-never-widens + no-short-circuit-preserved invariant'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — Step 2's blocking-effective qualifier: the downgrade
// rule and the escalation-valve always-blocking-effective override.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): Step 2\'s Blocking-effective (ratchet qualifier) paragraph defines the downgrade rule — blocking-effective only when cited or anchored inside an implicated section, else emitted class:advisory + ratchet:out-of-scope-new-finding and does not gate', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  assert.ok(content.includes('**Blocking-effective (ratchet qualifier).**'), 'expected the Blocking-effective paragraph label');

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      'Under an ACTIVE ratchet (Step 1.5), a blocking-classed failing row is blocking-effective only when its id is in `previously_cited_ids` OR its finding is anchored inside an implicated section; every other blocking-classed failing row is emitted with `"class": "advisory"` plus `"ratchet": "out-of-scope-new-finding"` and does not gate.'
    ),
    'expected the exact downgrade-rule sentence'
  );
  assert.ok(
    collapsed.includes(
      'Under an INACTIVE ratchet, every blocking-classed failing row is blocking-effective — Phase 1 semantics verbatim, unchanged.'
    ),
    'expected the INACTIVE-ratchet equivalence sentence'
  );
  assert.ok(
    collapsed.includes('a `"class": "blocking"` row IS a blocking-effective row by construction from this point forward.'),
    'expected the by-construction closing statement'
  );
});

test('AC-A1 (PRD AC-5): the escalation valve remains available on retries — an escalated row is always blocking-effective regardless of ratchet state, and the ratchet never disables the valve', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'The escalation valve (`## Materiality classes` above) remains available on retries: an escalated row — `"class": "blocking"` plus `"escalated": true` and its mandatory Implementer-impact justification — is always blocking-effective regardless of ratchet state; the ratchet narrows gating, it never disables the valve.'
    ),
    'expected the escalation-valve-always-blocking-effective override sentence'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — Step 3's branch-extension sentences.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): Step 3\'s "No blocking-classed failure" branch explicitly covers a run whose blocking-classed failures were ALL ratchet-downgraded to advisory (zero blocking-classed rows remain by the time the branch is evaluated)', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "A run whose blocking-classed failures were all ratchet-downgraded to advisory under an ACTIVE ratchet (Step 2's blocking-effective qualifier, `### Step 1.5 — Prior-verdict ratchet context`) likewise has zero blocking-classed `passed: false` rows by the time this branch is evaluated, and takes this branch for the same reason."
    ),
    'expected the fully-ratchet-downgraded-run branch sentence'
  );
  assert.ok(
    collapsed.includes(
      'Under an INACTIVE ratchet, blocking-classed and blocking-effective are the identical set — Phase 1 semantics verbatim.'
    ),
    'expected the INACTIVE-ratchet identical-set closing sentence'
  );
});

test('AC-A1 (PRD AC-5): the CHANGES_REQUESTED bullet-list step names blocking-EFFECTIVE rows as mandatory fixes, and a ratchet-downgraded row is listed in the existing "Non-blocking advisories" sub-list, never as a mandatory fix', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes('Emit a bullet list naming each blocking-effective failing rubric item by ID + reason.'),
    'expected the blocking-effective-qualified bullet-list instruction'
  );
  assert.ok(
    collapsed.includes(
      'A row Step 2\'s ratchet qualifier downgraded (`"class": "advisory"` plus `"ratchet": "out-of-scope-new-finding"`) is listed in the existing "Non-blocking advisories" sub-list alongside declared-advisory rows, carrying its ratchet annotation, never as a mandatory fix.'
    ),
    'expected the ratchet-downgraded-row routing sentence'
  );
});

test('AC-A1 (PRD AC-5) (regression guard): the Phase-1 class-blind bullet-list intro ("naming each failing rubric item by ID + reason. Example:", without the blocking-effective qualifier) is absent from plan-reviewer.md', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const occurrences = content.split('Emit a bullet list naming each failing rubric item by ID + reason. Example:').length - 1;
  assert.equal(occurrences, 0, `expected zero occurrences of the stale class-blind (non-ratchet-qualified) bullet-list intro, found ${occurrences}`);
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — Step 4 / Step 4a: the SAME ratchet context, never
// recomputed, applies to re-validation and the Step 4a abort path.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): Step 4 item 1\'s re-validation applies the SAME ratchet context Step 1.5 computed (never recomputed) — only a blocking-effective newly-failing item aborts the flip via Step 4a', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '1. **Re-run R1 through R8**', '2. **Append the APPROVED jsonl entry FIRST**');
  assert.ok(block, 'expected an extractable Step 4 item-1 re-validation block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "This re-evaluation applies the SAME ratchet context Step 1.5 computed (`previously_cited_ids`, `implicated_sections`, and the ratchet's active/inactive state) — never recomputed here — so a finding that would be ratchet-downgraded in Step 2 is equally downgraded on this re-run: only a blocking-effective newly-failing item (per Step 2's blocking-effective qualifier) aborts the flip via Step 4a below; a ratchet-downgraded newly-failing item is recorded on the flipping entry with its `\"ratchet\": \"out-of-scope-new-finding\"` annotation, the same way a newly-failing advisory-classed item already is."
    ),
    'expected the SAME-ratchet-context re-validation consistency sentence'
  );
});

test('AC-A1 (PRD AC-5): Step 4a uses the SAME ratchet context Step 1.5 computed (never recomputed) — a ratchet-downgraded finding does not trigger Step 4a, only a blocking-effective newly-failing item does', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '### Step 4a — Re-validation failure path', '### Step 5 — DEFERRED');
  assert.ok(block, 'expected an extractable Step 4a block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'This path uses the SAME ratchet context Step 1.5 computed (never recomputed): the "previously-passing **blocking-classed**" rubric item referenced above is evaluated as blocking-effective per Step 2\'s qualifier'
    ),
    'expected the Step 4a SAME-ratchet-context sentence opening'
  );
  assert.ok(
    collapsed.includes(
      'a finding ratchet-downgraded to `"class": "advisory"` does not trigger this path, exactly like a declared-advisory finding; only a blocking-effective newly-failing item triggers Step 4a.'
    ),
    'expected the Step 4a ratchet-downgraded-does-not-trigger closing sentence'
  );
});
