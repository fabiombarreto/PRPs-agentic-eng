// @ts-check
/**
 * Content-invariant tests for the ratchet integrity-hash SCHEMA / LOGGING
 * protocol text introduced by Phase 2 of
 * PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md)
 * in plugins/relay/agents/plan-reviewer.md: the two new optional `##
 * Inputs` fields (`plan_sha256`, `section_hashes`), the new `### Hash
 * discipline` subsection (write-through-verbatim rule, absence-handling
 * rule, the three new optional top-level jsonl entry fields plus the one
 * new per-row `ratchet` annotation, and the standalone worked
 * ratchet-downgraded jsonl example placed OUTSIDE the pinned worked
 * example), and Step 4 item 2's hash-carrying APPROVED-entry bullet.
 *
 * `plan-reviewer` is an LLM-executed markdown protocol, not deterministic
 * code — there is no function to invoke and observe a real verdict from in
 * a node:test unit test. The honest, spot-verifiable coverage available
 * (the same shape every other *.test.mjs file in this corpus asserting
 * plan-reviewer.md behavior already uses) is static assertion on the
 * PROTOCOL TEXT the LLM reads and follows at review time.
 *
 * This file covers the jsonl SCHEMA/logging half of PRD AC-9 (Ratchet
 * integrity hash) — plan AC-A3. The ratchet SCOPE/ACTIVE-INACTIVE decision
 * half of AC-9 (Step 1.5's three-condition test and the ratchet_void_reason
 * recording trigger) lives in the SAME Step 1.5 subsection as AC-5's scope
 * derivation and is covered by plan-reviewer-materiality-ratchet-gating.test.mjs
 * instead — this file only covers the declarative jsonl-field/logging
 * surface (the `## Inputs` declarations and the `### Hash discipline`
 * subsection), never re-asserting Step 1.5's ACTIVE/INACTIVE prose to avoid
 * duplicate coverage of the same sentences across two files. The
 * INVOKER-side hash computation (relay-execute.md's node one-liner) is
 * covered separately by relay-execute-materiality-ratchet.test.mjs, since
 * it lives in a different source file.
 *
 * This file deliberately does NOT re-assert the pinned worked jsonl
 * example's row content (the `{ "timestamp": ..., "rubric": [...] }` block)
 * that scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs,
 * plan-reviewer-validate-pattern-ungrounded-check.test.mjs, and
 * plan-reviewer-validate-search-ambiguous-check.test.mjs already byte-pin —
 * Task 3 of this phase's plan placed all new hash-discipline material
 * OUTSIDE that pinned fenced block specifically so those three pins would
 * not need touching; this file's "standalone example" test below asserts
 * only the NEW standalone block, plus its position strictly before the
 * pinned block's own opening marker, as an ordering proxy for that
 * placement constraint — without duplicating the three files' own pins.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-2-retry-convergence-ratchet.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — corpus-wide
 * search across all 47 scripts/validate/checks/*.test.mjs files for
 * "plan_sha256", "section_hashes", "Hash discipline", and
 * "ratchet_void_reason"): zero matches anywhere in the corpus outside the
 * source file itself. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-2/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A3 (PRD AC-9) — "Given each verdict line records the invoker-supplied
 *     plan_sha256 and section_hashes, when a retry's plan content diverges
 *     from the Targeted-revision contract (a section outside the implicated
 *     set changed, detected by hash string-inequality), then the ratchet is
 *     voided for that attempt — full blocking scope applies — and
 *     ratchet_void_reason is recorded on the verdict line; when hash inputs
 *     are absent (e.g. standalone /relay-plan-review), the ratchet stays
 *     inactive fail-safe with Phase-1 gating semantics."
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-materiality-hash-discipline.test.mjs
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
// AC-A3 (PRD AC-9) — the two new optional `## Inputs` hash fields.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-9): plan-reviewer.md\'s ## Inputs section declares plan_sha256 as an optional invoker-supplied, never-computed, never-fabricated whole-plan content hash', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "`plan_sha256` *(optional)*: whole-plan content hash of `draft_path` at dispatch time — invoker-supplied, computed by the dispatching command's shell and written through verbatim; this agent never computes a hash (its `tools:` carry no shell) and never fabricates one when absent."
    ),
    'expected the plan_sha256 optional-input declaration, verbatim'
  );
});

test('AC-A3 (PRD AC-9): plan-reviewer.md\'s ## Inputs section declares section_hashes as an optional invoker-supplied, never-computed, never-fabricated per-section content-hash map', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "`section_hashes` *(optional)*: a map of every `## `-heading section of the plan to its content hash — invoker-supplied, computed by the dispatching command's shell and written through verbatim; this agent never computes a hash (its `tools:` carry no shell) and never fabricates one when absent."
    ),
    'expected the section_hashes optional-input declaration, verbatim'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-9) — ### Hash discipline exists, positioned after Timestamp
// discipline and before the pinned worked jsonl example.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-9): plan-reviewer.md carries a ### Hash discipline subsection positioned after ### Timestamp discipline and before the pinned worked jsonl example', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  assert.ok(content.includes('### Hash discipline'), 'expected the Hash discipline heading');

  const timestampIdx = content.indexOf('### Timestamp discipline');
  assert.notEqual(timestampIdx, -1, 'expected Timestamp discipline heading');

  // Step 4 item 2's own hash-carrying bullet cross-references this heading
  // as "`### Hash discipline`" (backtick-quoted, including the literal
  // heading-marker prefix) BEFORE the heading itself appears — searching
  // from `timestampIdx` onward skips that earlier cross-reference and
  // always resolves to the true heading position.
  const hashIdx = content.indexOf('### Hash discipline', timestampIdx);
  assert.notEqual(hashIdx, -1, 'expected the Hash discipline heading at or after Timestamp discipline');

  const pinnedBlockMarkerIdx = content.indexOf('One JSON object per line, appended (never truncated). Shape:');
  assert.notEqual(pinnedBlockMarkerIdx, -1, 'expected the pinned-block opening marker sentence');

  assert.ok(
    timestampIdx < hashIdx && hashIdx < pinnedBlockMarkerIdx,
    'expected Hash discipline positioned strictly between Timestamp discipline and the pinned worked-example marker'
  );
});

test('AC-A3 (PRD AC-9): Hash discipline states hash fields are written through verbatim onto every verdict entry WHEN supplied, and the agent never computes or fabricates them', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "The optional `plan_sha256` and `section_hashes` fields below are written through verbatim onto every verdict entry WHEN supplied by the invoker (see `## Inputs` above) — this agent never computes a hash (its `tools:` carry no shell) and never fabricates either field when absent."
    ),
    'expected the write-through-verbatim-when-supplied rule'
  );
});

test('AC-A3 (PRD AC-9): Hash discipline states an audit line is never dropped when hash inputs are absent — the verdict still appends WITHOUT the hash fields, keeping the next ratchet inactive fail-safe rather than fabricating a fake hash', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "If one or both hash inputs were not supplied by the calling command, append the verdict anyway — never drop an audit line — WITHOUT the hash fields. Their absence keeps the NEXT re-review's ratchet (`### Step 1.5 — Prior-verdict ratchet context`) inactive fail-safe; absence is never fabricated into a present-but-fake hash."
    ),
    'expected the never-drop-an-audit-line absence-handling rule, cross-referencing Step 1.5'
  );
});

test('AC-A3 (PRD AC-9): Hash discipline declares the three new optional top-level jsonl entry fields (plan_sha256, section_hashes, ratchet_void_reason) and the one new per-row ratchet annotation', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Three new OPTIONAL top-level entry fields, additive to the shape below: `plan_sha256` (string — whole-plan content hash of the reviewed plan), `section_hashes` (object — every `## `-heading section mapped to its content hash), `ratchet_void_reason` (string — present only when Step 1.5 voided an otherwise-eligible ratchet due to a hash mismatch outside the implicated set).'
    ),
    'expected the three-new-optional-top-level-fields declaration'
  );
  assert.ok(
    collapsed.includes(
      'One new per-row annotation, additive to a rubric row: `"ratchet": "out-of-scope-new-finding"` (present only on a row Step 2\'s blocking-effective qualifier downgraded from its declared `blocking` class to `advisory`).'
    ),
    'expected the one-new-per-row-annotation declaration'
  );
});

test('AC-A3 (PRD AC-9): Hash discipline carries a standalone ratchet-downgraded worked jsonl row example, explicitly marked as outside the pinned worked example, positioned before the pinned block\'s own opening marker', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  // The intro sentence wraps across two source lines in the markdown
  // ("...standalone — not part of the\nworked example below):"), so a raw
  // (non-whitespace-collapsed) content.includes on the full sentence would
  // silently miss it — check the collapsed form for content, matching this
  // file's other multi-line-prone assertions.
  assert.ok(
    collapsed.includes('Worked jsonl row (ratchet-downgraded, standalone — not part of the worked example below):'),
    'expected the standalone-example intro sentence, explicitly disclaiming membership in the pinned worked example'
  );
  assert.ok(
    content.includes(
      '{ "id": "R-COH-OTHER-INTERNAL-CONTRADICTION", "passed": false, "class": "advisory", "ratchet": "out-of-scope-new-finding", "reason": "New contradiction found in ## Risks and Mitigations, a section outside implicated_sections (previously_cited_ids = [R3, R4], implicating only ## Step-by-Step Tasks and ## Files to Change); ratchet-downgraded from its declared blocking class." }'
    ),
    'expected the standalone worked jsonl row, verbatim'
  );

  // Position check uses a short, single-line-safe anchor rather than the
  // full (line-wrapping) sentence — a raw content.indexOf on the full
  // sentence would return -1, and -1 would compare as "before" any real
  // offset, silently passing this check for the wrong reason.
  const standaloneIntroIdx = content.indexOf('Worked jsonl row (ratchet-downgraded, standalone');
  const pinnedBlockMarkerIdx = content.indexOf('One JSON object per line, appended (never truncated). Shape:');
  assert.notEqual(standaloneIntroIdx, -1, 'expected to locate the standalone-example intro anchor');
  assert.notEqual(pinnedBlockMarkerIdx, -1, 'expected to locate the pinned-block opening marker');
  assert.ok(
    standaloneIntroIdx < pinnedBlockMarkerIdx,
    'expected the standalone example positioned strictly before the pinned worked-example marker (outside the pinned fenced block the three byte-pin tests protect)'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-9) — Step 4 item 2's hash-carrying APPROVED-entry bullet.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-9): Step 4 item 2\'s APPROVED-entry bullet states the entry carries the write-through hash fields per Hash discipline when supplied, and ratchet_void_reason when Step 1.5 voided an otherwise-eligible ratchet', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'The entry carries the write-through hash fields (`plan_sha256`, `section_hashes`) per `### Hash discipline` above WHEN supplied by the invoker; when Step 1.5 voided an otherwise-eligible ratchet, the entry also carries `ratchet_void_reason`.'
    ),
    'expected the Step 4 item 2 hash-carrying bullet'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-9) — the Logging-discipline invariant paragraph gained one
// additive sentence; the ORIGINAL sentence (byte-pinned in spirit by three
// other files' worked-example pins) is preserved verbatim ahead of it.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-9): the Logging-discipline invariant paragraph preserves its original class-field sentence verbatim and appends one additive sentence declaring hash/ratchet fields optional with pre-ratchet fallback semantics', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Every row emitted after this section ships carries a `class` field matching the `## Materiality classes` partition, or `"class": "blocking"` plus `"escalated": true` for a row promoted through the escalation valve. Consumers apply the same rule stated above: rows without a `class` field predate this taxonomy and are read as blocking. Hash fields (`plan_sha256`, `section_hashes`) and the `ratchet_void_reason` / per-row `ratchet` annotations are likewise additive and optional; consumers reading entries without them apply pre-ratchet semantics (full blocking scope, Phase 1 behavior).'
    ),
    'expected the original class-field sentence immediately followed by the new additive hash/ratchet sentence, both verbatim'
  );
});
