// @ts-check
/**
 * Unit tests for the check — feedback-chain — the pure `checkFeedbackChain`
 * function and the `runFeedbackChainCheck` thin wrapper exported by
 * scripts/validate/checks/feedback-chain.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * shipped-and-passing production module, mirroring
 * scripts/validate/checks/gating-structure.test.mjs's shape: synthetic
 * in-memory fixtures exercise the pure function's assertion classes, plus
 * one real-wrapper test against the actual repository tree, plus one
 * registration test against scripts/validate/index.mjs.
 *
 * Source plan (description mode — no source PRD):
 *   PRPs/plans/close-the-validation-docs-debt-recorded-in.plan.md
 *
 * Authored by the test pair under R-X strict (docs/decisions.md
 * [2026-07-12] / [2026-05-06]): the Implementer never touches this file.
 *
 * Traceability (plan Acceptance Criteria, in-scope subset AC-A1..AC-A5 —
 * AC-A6 through AC-A11 are the Implementer's documentation-page tasks and
 * are out of scope here):
 *   AC-A1 — this file exists and exits 0 under `node --test`, exercising
 *     the pure `checkFeedbackChain({ files })` export with synthetic
 *     in-memory fixtures rather than by mutating real repository files.
 *     Covered by every test below using BASELINE_FILES / its mutations.
 *   AC-A2 — every assertion class the module implements is covered: see
 *     the per-section comments (PAIRS, PLAN_WRITER_INVARIANTS x3,
 *     SELF_CHECKS x3, ordering guard, Phase-4-heading count, ledger
 *     sentence) below.
 *   AC-A3 — every failure test is a mutation of a passing baseline
 *     (BASELINE_FILES), asserting ok:false and a finding naming the
 *     specific violated invariant — never an independently-authored
 *     fixture that might fail for an unrelated reason.
 *   AC-A4 — the "rubric token in surrounding non-item prose is accepted"
 *     complement. See the dedicated section below.
 *   AC-A5 — the real-wrapper test and the registration test.
 *
 * Run: node --test scripts/validate/checks/feedback-chain.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkFeedbackChain, runFeedbackChainCheck } from './feedback-chain.mjs';

const INDEX_PATH = 'scripts/validate/index.mjs';

const RELAY_PLAN_CMD = 'plugins/relay/commands/relay-plan.md';
const PLAN_WRITER = 'plugins/relay/agents/plan-writer.md';
const RELAY_WRITE_TEST_CMD = 'plugins/relay/commands/relay-write-test.md';
const TEST_WRITER = 'plugins/relay/agents/test-writer.md';
const RELAY_IMPLEMENT_CMD = 'plugins/relay/commands/relay-implement.md';
const IMPLEMENTER = 'plugins/relay/agents/implementer.md';

// ---------------------------------------------------------------------------
// Mutation helper — mirrors gating-structure.test.mjs:124-129 exactly.
// Removing every line that contains `needle` from `content` is what makes
// each failure test provably a mutation of a passing baseline rather than
// an independently-authored fixture that might fail for an unrelated
// reason.
// ---------------------------------------------------------------------------
function withoutLine(content, needle) {
  return content
    .split('\n')
    .filter((line) => !line.includes(needle))
    .join('\n');
}

// ---------------------------------------------------------------------------
// Synthetic fixtures. Deliberately NOT copied verbatim from the real
// prompt files — these fixtures exercise the check logic itself,
// independent of the real files' exact wording (that real-content
// assertion lives in the real-wrapper test near the bottom). Every fixture
// below is constructed so BASELINE_FILES, taken together, satisfies EVERY
// assertion class the module implements (see the "baseline sanity" test),
// and every failure test mutates exactly one property of it.
// ---------------------------------------------------------------------------

const RELAY_PLAN_CMD_CONTENT = `# /relay-plan

Dispatch plan-writer with plan_path and target_root.
Forward prior_feedback when the caller supplies it.
`;

const RELAY_WRITE_TEST_CMD_CONTENT = `# /relay-write-test

Dispatch test-writer with plan_path and target_root.
Forward prior_feedback when the caller supplies it.
`;

const RELAY_IMPLEMENT_CMD_CONTENT = `# /relay-implement

Dispatch implementer with plan_path and target_root.
Forward prior_feedback when the caller supplies it.
`;

// plan-writer.md — carries the Inputs split, the Phase 2 GROUNDING carve-out,
// the Re-grounding anti-pattern bullet, and the Step 4.4.ter self-check
// followed by Step 4.5's write step, in that order.
const PLAN_WRITER_CONTENT = `# plan-writer

## Inputs (from the calling command)

- \`plan_path\`: absolute path to the target PRD or plan.
- \`prior_feedback\`: the reviewer's defect list from a prior CHANGES_REQUESTED verdict on the PRD-mode plan; forwarded by /relay-plan.

**Description mode inputs**

- \`description\`: the raw free-text feature description (no source PRD).
- \`prior_feedback\`: the reviewer's defect list from a prior CHANGES_REQUESTED verdict on the description-mode plan; forwarded by /relay-plan.

## Targeted revision mode

When \`prior_feedback\` is non-empty, correct the cited defects rather than re-authoring the plan from scratch.

## Phase 2 — GROUNDING

Dispatch research-codebase and research-web. Reusing a DRAFT's own grounding on a retry is permitted UNLESS the reviewer's citation names one of these four ids, in which case re-run the full dispatch:

- R-COH-PATTERN-TASK-DRIFT — reused grounding contradicts a task pattern
- R-COH-PATTERN-SOURCE-MISSING — reused grounding cites a source no longer present
- R-COH-MANDATORY-READING-MISSING — reused grounding omits mandatory reading
- R-COH-MANDATORY-READING-IRRELEVANT — reused grounding cites irrelevant reading

## Anti-patterns

- **Re-grounding without cause.** Re-running research-codebase and
  research-web on every retry is wasteful — per DRAFT this section already
  qualifies the carve-out, which re-triggers the full dispatch only when the
  citation names one of:
  - R-COH-PATTERN-TASK-DRIFT (same four ids as Phase 2's carve-out)
  - R-COH-PATTERN-SOURCE-MISSING (same four ids as Phase 2's carve-out)
  - R-COH-MANDATORY-READING-MISSING (same four ids as Phase 2's carve-out)
  - R-COH-MANDATORY-READING-IRRELEVANT (same four ids as Phase 2's carve-out)
- **Some other anti-pattern.** Unrelated prose that must not be touched by
  any mutation targeting the bullet above.

### Step 4.4.ter — Pre-emission self-check

Before Step 4.5, run this self-check to front-run the reviewer's own rubric rather than replace it:

1. The plan cites real file:line anchors for every pattern.
2. The plan's Acceptance Criteria enumerate every phase-relevant AC.

### Step 4.5 — Write the file

Write the DRAFT plan to PRPs/plans/<feature>-phase-<N>-<slug>.plan.md.
`;

// Shared prefix for the ordering-guard test (E below): everything through
// the Anti-patterns section, identical to PLAN_WRITER_CONTENT, so only the
// Step 4.4.ter / Step 4.5 ordering differs between the two variants.
const PLAN_WRITER_PREFIX = PLAN_WRITER_CONTENT.slice(0, PLAN_WRITER_CONTENT.indexOf('### Step 4.4.ter'));

const PLAN_WRITER_SWAPPED_ORDER_CONTENT = `${PLAN_WRITER_PREFIX}### Step 4.5 — Write the file

Write the DRAFT plan to PRPs/plans/<feature>-phase-<N>-<slug>.plan.md.

### Step 4.4.ter — Pre-emission self-check

Before Step 4.5, run this self-check to front-run the reviewer's own rubric rather than replace it:

1. The plan cites real file:line anchors for every pattern.
2. The plan's Acceptance Criteria enumerate every phase-relevant AC.
`;

// test-writer.md — carries the Inputs/Targeted-revision-mode declarations,
// the pre-emission self-check (whose surrounding prose names
// R-LIFECYCLE-LEGITIMATE and R-AC-COVERAGE — AC-A4's load-bearing case),
// and the verbatim lifecycle-ledger sentence.
const TEST_WRITER_CONTENT = `# test-writer

## Inputs

- \`prior_feedback\`: the test-reviewer's defect list from a prior CHANGES_REQUESTED verdict on this same suite; forwarded by /relay-write-test.

## Targeted revision mode

When \`prior_feedback\` is non-empty, follow this section rather than re-walking every AC from scratch.

## Phase 3 — Aggregate verdict

Before Step 3.1, run the **pre-emission self-check**.

Either failure is a self-detected defect: fix it first, then write the manifest. Both checks below front-run the reviewer's own rubric rather than replace it (R-LIFECYCLE-LEGITIMATE and R-AC-COVERAGE independently re-verify these same properties after this self-check runs).

1. Ledger completeness — confirm every UPDATE and every DELETE performed this session has a matching lifecycle-ledger entry.
2. Coverage completeness — every in-scope AC has an explicit recorded outcome.

Proceed to Step 3.1.
`;

// implementer.md — carries exactly two "### Phase 4." headings and the
// pre-emission self-check block bounded by the "**Pre-emission
// self-check**" marker and "Emit exactly one verdict".
const IMPLEMENTER_CONTENT = `# implementer

## Inputs

- \`prior_feedback\`: the code-reviewer's defect list from a prior CHANGES_REQUESTED verdict; forwarded by /relay-implement.

## Targeted revision mode

When \`prior_feedback\` is non-empty, correct only the cited tasks rather than re-implementing the whole plan.

### Phase 4. Execute the plan's tasks

Execute each Step-by-Step task via Edit/Write, in order.

### Phase 4. Run validation

Run the plan's Level 1-3 Validation Commands after all tasks complete.

**Pre-emission self-check**

Run this check to front-run the code-reviewer's own rubric rather than replace it:

1. Every changed file is named in the plan's Files to Change table.
2. No test file was created, updated, or deleted this session.

Emit exactly one verdict: IMPLEMENTATION_COMPLETE or TEST_CONTRACT_DISPUTE.
`;

const BASELINE_FILES = {
  [RELAY_PLAN_CMD]: RELAY_PLAN_CMD_CONTENT,
  [PLAN_WRITER]: PLAN_WRITER_CONTENT,
  [RELAY_WRITE_TEST_CMD]: RELAY_WRITE_TEST_CMD_CONTENT,
  [TEST_WRITER]: TEST_WRITER_CONTENT,
  [RELAY_IMPLEMENT_CMD]: RELAY_IMPLEMENT_CMD_CONTENT,
  [IMPLEMENTER]: IMPLEMENTER_CONTENT,
};

// ---------------------------------------------------------------------------
// Baseline sanity — every fixture above satisfies every assertion class the
// module implements simultaneously. Every failure test below mutates
// exactly one property of this baseline (AC-A3).
// ---------------------------------------------------------------------------

test('checkFeedbackChain: ok:true with zero findings when every watched file satisfies every invariant (baseline fixture)', () => {
  const result = checkFeedbackChain({ files: BASELINE_FILES });

  assert.equal(result.name, 'feedback-chain');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-A2 — PAIRS loop, three failure modes, exercised across the three
// distinct pairs (relay-plan/plan-writer, relay-write-test/test-writer,
// relay-implement/implementer) so the shared mechanism is proven for more
// than one registered pair.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: reports a command that does not forward prior_feedback to its writer (relay-plan.md -> plan-writer.md)', () => {
  const files = { ...BASELINE_FILES, [RELAY_PLAN_CMD]: withoutLine(BASELINE_FILES[RELAY_PLAN_CMD], 'Forward prior_feedback') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /command does not forward prior_feedback to plugins\/relay\/agents\/plan-writer\.md/);
  assert.equal(result.findings[0].file, RELAY_PLAN_CMD);
});

test('checkFeedbackChain: reports a writer agent that does not declare prior_feedback (relay-write-test.md -> test-writer.md)', () => {
  const files = { ...BASELINE_FILES, [TEST_WRITER]: withoutLine(BASELINE_FILES[TEST_WRITER], 'prior_feedback') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /writer does not declare prior_feedback, so plugins\/relay\/commands\/relay-write-test\.md forwards it into a void/);
  assert.equal(result.findings[0].file, TEST_WRITER);
});

test('checkFeedbackChain: reports a writer agent with no "## Targeted revision mode" section (relay-implement.md -> implementer.md)', () => {
  const files = { ...BASELINE_FILES, [IMPLEMENTER]: withoutLine(BASELINE_FILES[IMPLEMENTER], '## Targeted revision mode') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /no "## Targeted revision mode" section/);
  assert.equal(result.findings[0].file, IMPLEMENTER);
});

// ---------------------------------------------------------------------------
// AC-A2 — PLAN_WRITER_INVARIANTS #1: input-declared-in-both-mode-groups.
// Four independent degenerate cases: PRD-mode half missing, description-mode
// half missing, no Inputs section at all, and no Description-mode split
// marker at all.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: input-declared-in-both-mode-groups fails when prior_feedback is missing from the PRD-mode input group', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], 'PRD-mode plan') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /input-declared-in-both-mode-groups/);
  assert.match(result.findings[0].message, /PRD mode/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

test('checkFeedbackChain: input-declared-in-both-mode-groups fails when prior_feedback is missing from the description-mode input group', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], 'description-mode plan') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /input-declared-in-both-mode-groups/);
  assert.match(result.findings[0].message, /description mode/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

test('checkFeedbackChain: input-declared-in-both-mode-groups fails when there is no "## Inputs (from the calling command)" section at all', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], '## Inputs (from the calling command)') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /input-declared-in-both-mode-groups: no "## Inputs \(from the calling command\)" section/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

test('checkFeedbackChain: input-declared-in-both-mode-groups fails when the Inputs section has no "**Description mode" split marker', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], '**Description mode inputs**') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /input-declared-in-both-mode-groups: Inputs section has no "\*\*Description mode" group to split on/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

// ---------------------------------------------------------------------------
// AC-A2 — PLAN_WRITER_INVARIANTS #2: grounding-carve-out-names-all-four-ids.
// Omitting one of the four ids from the Phase 2 GROUNDING section (leaving
// the anti-pattern bullet's own copy of all four ids untouched, proving the
// two invariants are checked independently) must name the omitted id.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: grounding-carve-out-names-all-four-ids fails and names the omitted id when Phase 2 GROUNDING omits one of the four ids', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], 'TASK-DRIFT — reused grounding contradicts') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /grounding-carve-out-names-all-four-ids/);
  assert.match(result.findings[0].message, /R-COH-PATTERN-TASK-DRIFT/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

// ---------------------------------------------------------------------------
// AC-A2 — PLAN_WRITER_INVARIANTS #3:
// regrounding-anti-pattern-consistent-with-phase-2. Two independent
// branches: the missing-"per DRAFT" qualifier, and an omitted carve-out id
// (with Phase 2's own copy of that id left untouched, proving the two
// invariants are checked independently).
// ---------------------------------------------------------------------------

test('checkFeedbackChain: regrounding-anti-pattern-consistent-with-phase-2 fails when the anti-pattern bullet has no "per DRAFT" qualifier', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], 'per DRAFT this section already') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /regrounding-anti-pattern-consistent-with-phase-2/);
  assert.match(result.findings[0].message, /no "per DRAFT"/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

test('checkFeedbackChain: regrounding-anti-pattern-consistent-with-phase-2 fails and names the omitted id when the anti-pattern bullet omits one of the four carve-out ids', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], 'SOURCE-MISSING (same four ids') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /regrounding-anti-pattern-consistent-with-phase-2/);
  assert.match(result.findings[0].message, /R-COH-PATTERN-SOURCE-MISSING/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

// ---------------------------------------------------------------------------
// AC-A2 — SELF_CHECKS: block entirely absent; block present but missing the
// front-run framing.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: fails when a writer has no pre-emission self-check block at all (implementer.md)', () => {
  const files = { ...BASELINE_FILES, [IMPLEMENTER]: withoutLine(BASELINE_FILES[IMPLEMENTER], '**Pre-emission self-check**') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /self-check missing: no pre-emission self-check block found/);
  assert.equal(result.findings[0].file, IMPLEMENTER);
});

test('checkFeedbackChain: fails when a writer\'s self-check block does not state that it front-runs the reviewer (plan-writer.md)', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: withoutLine(BASELINE_FILES[PLAN_WRITER], 'front-run the reviewer') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /self-check does not state that it front-runs \(rather than replaces\) the reviewer/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

// ---------------------------------------------------------------------------
// AC-A2 + AC-A3 — SELF_CHECKS: an ITEM line quoting a rubric token, paired
// with AC-A4 immediately below — same rubric token, same file, different
// line role (item vs. surrounding prose) — to prove the check discriminates
// rather than applying a whole-block ban.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: fails when a self-check item line quotes a rubric token instead of stating the property (implementer.md)', () => {
  // Kept short deliberately: the module truncates the quoted item line to
  // its first 80 characters (`line.trim().slice(0, 80)`), so the mutated
  // line must be short enough for the full rubric token to survive that
  // truncation and still be assertable below.
  const mutated = BASELINE_FILES[IMPLEMENTER].replace(
    '2. No test file was created, updated, or deleted this session.',
    '2. No test file changes (R-COH-TASK-AC-MISSING).',
  );
  assert.notEqual(mutated, BASELINE_FILES[IMPLEMENTER], 'fixture precondition: the targeted item line must exist verbatim in the baseline');

  const files = { ...BASELINE_FILES, [IMPLEMENTER]: mutated };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /self-check item quotes a rubric id instead of stating the property/);
  assert.match(result.findings[0].message, /R-COH-TASK-AC-MISSING/);
  assert.equal(result.findings[0].file, IMPLEMENTER);
});

// ---------------------------------------------------------------------------
// AC-A4 — the load-bearing complement: a rubric token in the self-check
// block's surrounding NON-item prose is ACCEPTED, not flagged. This is what
// keeps test-writer's real closing parenthetical (naming
// R-LIFECYCLE-LEGITIMATE and R-AC-COVERAGE) legal. Two tests: one against
// the baseline fixture (which already carries two rubric tokens in prose
// for test-writer), and one dedicated mutation on implementer.md that
// inserts a rubric token into the intro sentence (non-item prose) — the
// direct counterpart of the item-line test immediately above. A naive
// whole-block prohibition on rubric tokens would fail both.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: AC-A4 — the baseline test-writer.md self-check carries rubric tokens (R-LIFECYCLE-LEGITIMATE, R-AC-COVERAGE) in its surrounding prose and is NOT flagged', () => {
  assert.match(BASELINE_FILES[TEST_WRITER], /R-LIFECYCLE-LEGITIMATE/);
  assert.match(BASELINE_FILES[TEST_WRITER], /R-AC-COVERAGE/);

  const result = checkFeedbackChain({ files: BASELINE_FILES });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkFeedbackChain: AC-A4 — a rubric token inserted into self-check prose (not an item line) does not trigger a finding, proving the item-vs-prose split is real', () => {
  const mutated = BASELINE_FILES[IMPLEMENTER].replace(
    "Run this check to front-run the code-reviewer's own rubric rather than replace it:",
    "Run this check to front-run the code-reviewer's own rubric (independently re-verified by R-COH-TASK-AC-MISSING) rather than replace it:",
  );
  assert.notEqual(mutated, BASELINE_FILES[IMPLEMENTER], 'fixture precondition: the targeted prose line must exist verbatim in the baseline');
  assert.match(mutated, /R-COH-TASK-AC-MISSING/);

  const files = { ...BASELINE_FILES, [IMPLEMENTER]: mutated };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-A2 — plan-writer's self-check-before-write ordering guard: the
// self-check heading must sit BEFORE the write-step heading. Swapping the
// two (keeping every other property intact — front-run framing present,
// item lines clean) isolates the ordering finding alone.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: fails when plan-writer\'s self-check sits after the write step, so it cannot be pre-emission', () => {
  const files = { ...BASELINE_FILES, [PLAN_WRITER]: PLAN_WRITER_SWAPPED_ORDER_CONTENT };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /self-check sits at line \d+, after the write step at line \d+ — it cannot be pre-emission/);
  assert.equal(result.findings[0].file, PLAN_WRITER);
});

// ---------------------------------------------------------------------------
// AC-A2 — implementer's "exactly 2 '### Phase 4.' headings" count. Both
// directions: too few (one removed) and too many (a third added).
// ---------------------------------------------------------------------------

test('checkFeedbackChain: fails when implementer.md has only 1 "### Phase 4." heading', () => {
  const files = { ...BASELINE_FILES, [IMPLEMENTER]: withoutLine(BASELINE_FILES[IMPLEMENTER], "### Phase 4. Run validation") };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /expected exactly 2 '### Phase 4\.' headings, found 1/);
  assert.equal(result.findings[0].file, IMPLEMENTER);
});

test('checkFeedbackChain: fails when implementer.md grows a 3rd "### Phase 4." heading', () => {
  const withExtraHeading = `${BASELINE_FILES[IMPLEMENTER]}\n### Phase 4. Emit the verdict\n\nEmit the final verdict object.\n`;
  const files = { ...BASELINE_FILES, [IMPLEMENTER]: withExtraHeading };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /expected exactly 2 '### Phase 4\.' headings, found 3/);
  assert.equal(result.findings[0].file, IMPLEMENTER);
});

// ---------------------------------------------------------------------------
// AC-A2 — test-writer's verbatim lifecycle-ledger sentence
// "confirm every UPDATE and every DELETE" being lost when the self-check is
// extended.
// ---------------------------------------------------------------------------

test('checkFeedbackChain: fails when test-writer.md loses the verbatim "confirm every UPDATE and every DELETE" ledger sentence', () => {
  const files = { ...BASELINE_FILES, [TEST_WRITER]: withoutLine(BASELINE_FILES[TEST_WRITER], 'confirm every UPDATE and every DELETE') };
  const result = checkFeedbackChain({ files });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /the original lifecycle-ledger sentence was lost when the self-check was extended/);
  assert.equal(result.findings[0].file, TEST_WRITER);
});

// ---------------------------------------------------------------------------
// Robustness — unreadable/null file entries produce loud findings, never a
// throw (mirrors gating-structure.test.mjs's established robustness-test
// convention for missing input).
// ---------------------------------------------------------------------------

test('checkFeedbackChain: reports loud failing findings (not a throw) across every unreadable-file input shape (all-null map, no keys at all, empty-string values)', () => {
  const paths = Object.keys(BASELINE_FILES);
  const shapes = [
    Object.fromEntries(paths.map((k) => [k, null])),
    {},
    Object.fromEntries(paths.map((k) => [k, ''])),
  ];

  for (const files of shapes) {
    let result;
    assert.doesNotThrow(() => {
      result = checkFeedbackChain({ files });
    });

    assert.equal(result.ok, false);
    // 3 pairs x 2 ("could not read <command>" + "could not read <agent>") = 6.
    assert.equal(result.findings.length, 6);
    assert.ok(result.findings.every((f) => /^could not read /.test(f.message)));
  }
});

// ---------------------------------------------------------------------------
// AC-A5 — real-wrapper test: runFeedbackChainCheck() against the actual,
// already-implemented repository tree.
// ---------------------------------------------------------------------------

test('runFeedbackChainCheck: ok:true with zero findings against the real, already-implemented prompt files', () => {
  const result = runFeedbackChainCheck();

  assert.equal(result.name, 'feedback-chain');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-A5 — registration: scripts/validate/index.mjs imports
// runFeedbackChainCheck and lists it in the CHECKS array (mirrors
// gating-structure.test.mjs:307-314).
// ---------------------------------------------------------------------------

test('scripts/validate/index.mjs imports runFeedbackChainCheck and registers it in the CHECKS array', () => {
  const content = readFileSync(resolve(INDEX_PATH), 'utf-8');

  assert.match(content, /import\s*\{\s*runFeedbackChainCheck\s*\}\s*from\s*'\.\/checks\/feedback-chain\.mjs'/);

  const checksBlock = content.slice(content.indexOf('const CHECKS'), content.indexOf('];', content.indexOf('const CHECKS')) + 2);
  assert.match(checksBlock, /runFeedbackChainCheck/);
});
