// @ts-check
/**
 * Content-invariant tests for Phase 4 ("R-SEM prose") of the
 * test-formatting-prevention-preflight feature —
 * plugins/relay/agents/code-reviewer.md (R-SEM section clarifying
 * paragraph + the R-X section's mandatory byte-identical invariant) and
 * plugins/relay/agents/implementer.md (two new Anti-patterns bullets).
 *
 * Same idiom as test-formatting-prevention-preflight-phase1.test.mjs /
 * phase2.test.mjs / figma-track-ac2-reuse-enforcement.test.mjs: this
 * phase's deliverable is prose in two agent-definition markdown files, not
 * a new production .mjs export — there is no runtime code to unit-test
 * directly. The meaningful, non-trivial, discriminative assertion is: does
 * the shipped prose state the exact normative content AC-5/AC-7 require,
 * in the exact position the plan committed to (before the R-X heading;
 * between the named anchor bullets) — and, for AC-4 specifically, did the
 * adjacent R-SEM edit leave the R-X section byte-for-byte untouched. A
 * substring/regex match alone cannot prove "byte-identical"; only an exact
 * equality comparison against the section's pinned canonical text can, so
 * AC-4's test extracts the section, asserts the extraction is non-empty
 * FIRST (an empty-vs-empty comparison would pass vacuously and prove
 * nothing), and only then asserts exact equality.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 4 plan
 * (PRPs/plans/completed/test-formatting-prevention-preflight-phase-4-r-sem-prose.plan.md).
 *
 * Existing-coverage scan performed before authoring (Step 2.1): grepped
 * every scripts/validate/checks/*.test.mjs file for "self-executing",
 * "R-SEM" as a section-content assertion, "TEST_CONTRACT_DISPUTE" against
 * code-reviewer.md's R-SEM section specifically, and "Anti-patterns (hard
 * rules)" / "Silently editing" / "formatting-only" against implementer.md.
 * Zero hits on all of the above — this phase's prose is genuinely
 * uncovered territory (Phases 1/2's own test files never mention
 * code-reviewer.md or implementer.md; figma-track-ac2-reuse-enforcement's
 * code-reviewer.md/implementer.md coverage targets the unrelated
 * R-COH-DS-REUSE / Step 2.3.5 surfaces). No EXISTING_TEST_COVERS,
 * EXISTING_TEST_UPDATED, OBSOLETE_TEST_REMOVED, or REDUNDANT_TEST_REMOVED
 * outcome applies to any in-scope AC this session — every AC below is
 * NEW_TEST_REQUIRED.
 *
 * Traceability (PRPs/prds/test-formatting-prevention-preflight.prd.md
 * Acceptance Criteria, narrowed by the plan's own AC-A1..AC-A3; AC-1/2/3/
 * 6/8 are OUT_OF_PHASE_SCOPE, deferred to Phases 2/3/1/5 respectively —
 * see PRPs/reports/test-formatting-prevention-preflight/test-suite.diff):
 *
 *   AC-A3 (PRD AC-4, "R-X byte-identical") — code-reviewer.md's
 *     `### R-X` section (from its heading through, but excluding, the
 *     following `## The R-COH-*` heading) is extracted, its extraction is
 *     asserted non-empty first, then asserted exactly byte-identical to
 *     the canonical shipped text — zero carve-outs, zero new exception
 *     prose inside the rule. A dedicated negative check also asserts no
 *     carve-out/exception vocabulary appears inside the section (mirrors
 *     the plan's own Level 3 grep).
 *   AC-A1 (PRD AC-5, "R-SEM not self-executing") — both
 *     code-reviewer.md's R-SEM section (new clarifying paragraph,
 *     positioned strictly before the `### R-X` heading) and
 *     implementer.md's new "Treating an R-SEM finding as self-executing
 *     test-edit authorization" bullet (positioned between "Silently
 *     editing a test file" and "Opening `TEST_CONTRACT_DISPUTE` for
 *     formatting") state explicitly that an R-SEM finding is not
 *     self-executing authorization to edit a test — TEST_CONTRACT_DISPUTE
 *     remains the mandatory channel even when it was the reviewer that
 *     requested the change.
 *   AC-A2 (PRD AC-7, "Dispute never formatting") — implementer.md's new
 *     "Opening `TEST_CONTRACT_DISPUTE` for formatting" bullet
 *     (positioned between the AC-A1 bullet and "Re-grounding via research
 *     subagents") states explicitly that formatting is never a
 *     `TEST_CONTRACT_DISPUTE` subject — dispute is the channel for
 *     semantic contradiction with the PRD, never whitespace.
 *
 * Run: node --test scripts/validate/checks/test-formatting-prevention-preflight-phase4.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const IMPLEMENTER_PATH = 'plugins/relay/agents/implementer.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`, so
 * exact-equality/regex assertions behave identically regardless of the
 * checkout's line-ending configuration. Mirrors
 * test-formatting-prevention-preflight-phase1/2.test.mjs's readRepoFile.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns
 * undefined if `startNeedle` is absent. Mirrors
 * figma-track-ac2-reuse-enforcement.test.mjs's (and
 * figma-track-phase1/3/4/5.test.mjs's) helper of the same name/shape.
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

// The canonical, pinned R-X section text — from the `### R-X` heading
// through, but excluding, the following `## The R-COH-*` heading. Captured
// verbatim from the shipped file (PRPs/plans/completed/
// test-formatting-prevention-preflight-phase-4-r-sem-prose.plan.md's own
// Task 3 / Level 2 mechanically verified this stayed byte-identical to the
// pre-phase HEAD baseline at implementation time; this test pins that same
// text as a standing regression guard, independent of git history).
const EXPECTED_RX_SECTION =
  "### R-X — Universal test-modification guard (straight fail, D17)\n\nUsing the canonical test-glob pathspec set:\n\n```\n'**/test_*.py' '**/tests/**/*.py' '**/*.test.ts' '**/*.test.tsx'\n'**/*.spec.ts' '**/*.spec.tsx' '**/*.test.js' '**/*.spec.js'\n'**/*_test.go' '**/tests/**/*.rb' '**/*_spec.rb'\n'**/__tests__/**' '**/*.test.rs' '**/*_test.rs'\n'**/*.test.jsx' '**/*.test.mjs' '**/*.test.cjs' '**/spec/**'\n```\n\nRun via `Bash`:\n\n```\ngit diff --name-only <diff_target>..HEAD -- <pathspec-set>\n```\n\nIf the result is empty: PASS.\n\nIf the result is non-empty AND the input `mode` is `\"standard\"`\n(NOT post-arbitration-upheld), every matched path is a candidate\nR-X failure. Exactly one thing can clear a candidate path: the\ncomputed equivalence step below. Run it before recording the\nverdict; no other consideration — not the implementer's claim, not\nthis reviewer's own reading of the diff, not the sympathy of the\nchange — may clear a path.\n\n#### Step X.2 — Executable-content equivalence (computed, never asserted)\n\nRun via `Bash`, over exactly the matched paths:\n\n```\nnode ${CLAUDE_PLUGIN_ROOT}/scripts/executable-content-hash.mjs --repo <target_root> --base <diff_target> --head HEAD -- <matched-path> [<matched-path> ...]\n```\n\nThe script normalizes both versions of each path — dropping\ncomments, Python docstrings, and the test-title string literal of a\n`describe` / `it` / `test` / `context` / `suite` call — and hashes\nwhat remains. Every other string literal, including every expected\nvalue, survives into the hash; so does the callee, so `it(` and\n`it.skip(` are different executable content.\n\nA path is CLEARED if and only if its report row carries\n`cleared: true`. Every other row is NOT cleared — `supported:\nfalse` (unlisted extension), a path absent on either side (a\ncreated or deleted test file), an ambiguous or unterminated source,\nor differing hashes. The script is fail-closed by construction, and\nso is this step: if the command cannot run at all (node missing,\nscript path unresolvable, non-zero exit), NO path is cleared and\nthe `reason` string says which command failed and how.\n\nRecord verbatim in the jsonl `reason`, for every path this step\nclears, its `base_hash` and `head_hash`. The carve-out is\nlegitimate only because it is reproducible: anyone can re-run that\nexact command against those two revisions and obtain the same two\nhashes, or refute the clearance.\n\n#### Step X.3 — Verdict\n\n- Every matched path cleared → PASS, with the per-path hashes in\n  the `reason` field.\n- Any matched path not cleared → straight FAIL, listing ONLY the\n  not-cleared paths verbatim. D17: no \"first warning\" grace period.\n  A test-glob match whose executable content changed, in standard\n  mode and without an upheld dispute, is an immediate R-X failure\n  with the file paths recorded in the jsonl `reason` field.\n\nWhat Step X.2 is NOT:\n\n- **Not a formatting carve-out.** Formatting is prevented upstream —\n  `/relay-write-test`'s formatting step and `/relay-implement`'s P5\n  preflight — and formatting is never a `TEST_CONTRACT_DISPUTE`\n  subject. A formatting-only diff that reaches R-X anyway clears\n  here as a consequence of being executable-content-identical, never\n  by a rule about whitespace.\n- **Not a self-certification.** The implementer's assertion that an\n  edit was harmless carries exactly the weight it carried before\n  this step existed: none. Only the script's report clears a path.\n- **Not available for ADDED test content.** A new `it()` block\n  changes executable content and can never clear here. Purely\n  additive, PRD-grounded coverage is arbitrated under\n  `DISPUTE_UPHELD_NEW_COVERAGE` (Phase 3) — a different channel with\n  its own, separately verified precondition.\n- **Not a reason to soften the reported failure.** A path that fails\n  to clear is reported exactly as it was before: named verbatim, no\n  hedging about how small the diff looked.\n\nR-X fires regardless of whether `docs/context/methodology.md` has\n`tdd: true` or `tdd: false` (D9 Layer 0 universality). The R-X\nrationale string SHOULD name the universality explicitly so the\nCOMMAND's CHANGES_REQUESTED feedback to the implementer is\nunambiguous.\n\n---\n\n";

// The canonical, pinned R-SEM clarifying-paragraph text — from its own
// bold lead-in through, but excluding, the following `### R-X` heading.
const EXPECTED_SEM_PARAGRAPH =
  "**Not self-executing authorization (2026-08-26 arbitration follow-up):**\nAn R-SEM finding is not self-executing authorization to edit a test.\nWhen a `concern` implies a test file should change, the finding still\nonly records a semantic disagreement — it does NOT license the\nimplementer, or any other agent, to edit the test file directly.\n`TEST_CONTRACT_DISPUTE`, arbitrated in Phase 3 below, remains the\nmandatory channel even when it was this agent's own R-SEM row that\nrequested the change. This agent's read-only charter (Hard constraint\n2) already forbids editing the test itself; this note makes explicit\nthat an R-SEM finding also carries no delegated authority for anyone\nelse to do so outside the dispute channel.\n\n";

// The canonical, pinned implementer.md two-bullet block — both new
// Anti-patterns bullets, from the AC-5 bullet's lead-in through, but
// excluding, the following "Re-grounding via research subagents" bullet.
const EXPECTED_ANTIPATTERN_BLOCK =
  "- **Treating an R-SEM finding as self-executing test-edit authorization.**\n  A code-review R-SEM finding that requests a test change is not\n  itself authorization to edit the test — `TEST_CONTRACT_DISPUTE`\n  (Phase 4.B) remains the mandatory channel even when it was the\n  reviewer that requested the change. A `prior_feedback` entry citing\n  an R-SEM row is read, per \"Targeted revision mode\" above, like any\n  other citation: it identifies what to fix in the *implementation*,\n  never a license to edit the disputed test directly.\n- **Editing a test file's comments or its `describe`/`it` titles.**\n  R-X's Step X.2 equivalence check exists so that such an edit, when\n  it reaches the reviewer from an authorized author, does not\n  deadlock the phase. It is not permission for THIS agent to make\n  one: the implementer authors zero test-file changes of any kind,\n  prose included. A docstring that has gone stale is the test pair's\n  work, or a follow-up — never a quiet edit inside an implementation\n  diff.\n- **Opening `TEST_CONTRACT_DISPUTE` for formatting.** Dispute is the\n  channel for semantic contradiction between a test's expectations\n  and the PRD — never for whitespace, indentation, quote style, or\n  any other formatting-only difference. A formatting-only mismatch is\n  not a `claim` this agent may submit through Phase 4.B.\n";

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — code-reviewer.md's `### R-X` section is byte-identical
// to the pre-phase canonical text, even though the adjacent R-SEM section
// of the same file was edited. Extraction non-emptiness is checked FIRST,
// so an empty-vs-empty comparison can never pass vacuously.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): code-reviewer.md\'s ### R-X section extraction is non-empty (guards against a vacuous empty-vs-empty pass)', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const section = sliceBetween(
    content,
    '### R-X — Universal test-modification guard (straight fail, D17)',
    '## The R-COH-* coherence layer'
  );

  assert.ok(section, 'expected an extractable ### R-X section between its own heading and the ## The R-COH-* heading');
  assert.ok(section.length > 0, 'extracted ### R-X section must be non-empty');
});

test('AC-A3 (PRD AC-4): code-reviewer.md\'s ### R-X section is exactly byte-identical to the canonical shipped text — the D17 rule prose, the 12-pattern test-glob pathspec set, the git diff command, and the straight-fail semantics all unchanged by the adjacent R-SEM edit', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const section = sliceBetween(
    content,
    '### R-X — Universal test-modification guard (straight fail, D17)',
    '## The R-COH-* coherence layer'
  );

  assert.equal(section, EXPECTED_RX_SECTION);
});

test('AC-A3 (PRD AC-4) + the 2026-08-28 R-X equivalence entry: the ### R-X section carries no FORMATTING-specific exception, and its only clearance path is the script-computed one', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const section = sliceBetween(
    content,
    '### R-X — Universal test-modification guard (straight fail, D17)',
    '## The R-COH-* coherence layer'
  );
  assert.ok(section, 'expected an extractable ### R-X section');

  // Still forbidden, and for the original reason: formatting has its own
  // prevention mechanism (the formatter_cmd chain + the P5 preflight), and a
  // whitespace-shaped hole in R-X is exactly what this feature ruled out.
  assert.doesNotMatch(
    /** @type {string} */ (section),
    /except formatting|formatting exception|whitespace-only|prettier/i,
    'no formatting-shaped exception may exist inside the ### R-X section — formatting is prevented upstream, never excused here'
  );

  // The equivalence step that DOES clear a path must be mechanical: named
  // script, hashes recorded, fail-closed. If any of these three disappear the
  // carve-out has quietly become self-certification, which is the failure
  // mode R-X exists to prevent.
  assert.match(
    /** @type {string} */ (section),
    /scripts\/executable-content-hash\.mjs/,
    'the clearance path must name the shipped script that computes it'
  );
  assert.match(
    /** @type {string} */ (section),
    /base_hash[\s\S]{0,80}head_hash/,
    'both hashes must be recorded in the verdict so the clearance is reproducible'
  );
  assert.match(
    /** @type {string} */ (section),
    /fail-closed/,
    'the equivalence step must state its fail-closed default'
  );
  assert.match(
    /** @type {string} */ (section),
    /Not a self-certification/,
    'the section must state that the implementer cannot clear its own edit'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — an R-SEM finding is not self-executing authorization
// to edit a test, stated explicitly in BOTH code-reviewer.md (R-SEM
// section) and implementer.md (Anti-patterns bullet), with TDD "the
// finding is not itself authorization" language sitting strictly before
// the ### R-X heading (code-reviewer.md) and strictly between the named
// anchor bullets (implementer.md).
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): code-reviewer.md\'s R-SEM section states an R-SEM finding is not self-executing authorization, exact canonical text, positioned strictly before the ### R-X heading', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const section = sliceBetween(
    content,
    '**Not self-executing authorization (2026-08-26 arbitration follow-up):**',
    '### R-X — Universal test-modification guard'
  );
  assert.ok(section, 'expected an extractable R-SEM clarifying paragraph before the ### R-X heading');

  assert.equal(section, EXPECTED_SEM_PARAGRAPH);

  const semIdx = content.indexOf('**Not self-executing authorization (2026-08-26 arbitration follow-up):**');
  const rxIdx = content.indexOf('### R-X — Universal test-modification guard (straight fail, D17)');
  assert.notEqual(semIdx, -1, 'expected the R-SEM clarifying paragraph');
  assert.notEqual(rxIdx, -1, 'expected the ### R-X heading');
  assert.ok(semIdx < rxIdx, 'the R-SEM clarifying paragraph must precede the ### R-X heading — it must never cross into the byte-identical section');
});

test('AC-A1 (PRD AC-5): implementer.md\'s new "Treating an R-SEM finding..." bullet states the same non-authorization rule and names TEST_CONTRACT_DISPUTE (Phase 4.B) as the mandatory channel even when the reviewer requested the change', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const bullet = sliceBetween(
    content,
    '- **Treating an R-SEM finding as self-executing test-edit authorization.**',
    '- **Opening `TEST_CONTRACT_DISPUTE` for formatting.**'
  );
  assert.ok(bullet, 'expected an extractable "Treating an R-SEM finding..." bullet');

  assert.match(bullet, /A code-review R-SEM finding that requests a test change is not\s+itself authorization to edit the test/);
  assert.match(bullet, /`TEST_CONTRACT_DISPUTE`\s+\(Phase 4\.B\) remains the mandatory channel even when it was the\s+reviewer that requested the change\./);
});

test('AC-A1 (PRD AC-5): implementer.md\'s new bullets sit in the exact plan-anchored order — after "Silently editing a test file" and before "Re-grounding via research subagents"', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);

  const silentIdx = content.indexOf('- **Silently editing a test file.**');
  const treatingIdx = content.indexOf('- **Treating an R-SEM finding as self-executing test-edit authorization.**');
  const openingIdx = content.indexOf('- **Opening `TEST_CONTRACT_DISPUTE` for formatting.**');
  const regroundingIdx = content.indexOf('- **Re-grounding via research subagents.**');

  assert.notEqual(silentIdx, -1, 'expected the pre-existing "Silently editing a test file" bullet');
  assert.notEqual(treatingIdx, -1, 'expected the new "Treating an R-SEM finding..." bullet');
  assert.notEqual(openingIdx, -1, 'expected the new "Opening TEST_CONTRACT_DISPUTE for formatting" bullet');
  assert.notEqual(regroundingIdx, -1, 'expected the pre-existing "Re-grounding via research subagents" bullet');

  assert.ok(silentIdx < treatingIdx, '"Treating an R-SEM finding..." must come after "Silently editing a test file"');
  assert.ok(treatingIdx < openingIdx, '"Opening TEST_CONTRACT_DISPUTE for formatting" must come after "Treating an R-SEM finding..."');
  assert.ok(openingIdx < regroundingIdx, 'both new bullets must come before "Re-grounding via research subagents"');
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-7) — the implementer never opens TEST_CONTRACT_DISPUTE for
// a formatting-only difference; dispute is the channel for semantic
// contradiction with the PRD, never whitespace.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-7): implementer.md\'s new "Opening TEST_CONTRACT_DISPUTE for formatting" bullet states dispute is for semantic contradiction only, never whitespace/indentation/quote-style, and a formatting-only mismatch is not a submittable claim', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const bullet = sliceBetween(
    content,
    '- **Opening `TEST_CONTRACT_DISPUTE` for formatting.**',
    '- **Re-grounding via research subagents.**'
  );
  assert.ok(bullet, 'expected an extractable "Opening TEST_CONTRACT_DISPUTE for formatting" bullet');

  assert.match(bullet, /Dispute is the\s+channel for semantic contradiction between a test's expectations\s+and the PRD — never for whitespace, indentation, quote style, or\s+any other formatting-only difference\./);
  assert.match(bullet, /A formatting-only mismatch is\s+not a `claim` this agent may submit through Phase 4\.B\./);
});

// ---------------------------------------------------------------------------
// AC-A1 + AC-A2 combined — the full two-bullet insertion, byte-identical to
// the canonical shipped text. Defense-in-depth beyond the narrower
// assert.match checks above: catches drift the per-sentence regexes would
// miss (e.g. reordered clauses that still happen to match each fragment).
// ---------------------------------------------------------------------------

test('AC-A1+AC-A2 (PRD AC-5, AC-7): implementer.md\'s two new Anti-patterns bullets, taken together, are exactly byte-identical to the canonical shipped text', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  const block = sliceBetween(
    content,
    '- **Treating an R-SEM finding as self-executing test-edit authorization.**',
    '- **Re-grounding via research subagents.**'
  );
  assert.ok(block, 'expected an extractable two-bullet block');

  assert.equal(block, EXPECTED_ANTIPATTERN_BLOCK);
});
