// @ts-check
/**
 * Content-invariant tests for Phase 2 ("The pass") of the
 * hybrid-code-review feature — code-reviewer.md's `Skill`-tool grant, the
 * new "## The hybrid /code-review pass" section's safety envelope (level
 * refusal by name, the never-constructed `--fix`/`--comment` guard, the
 * fixed 3-minute internal budget isolated from `max_implement_retries`,
 * the named degradation reasons and never-halt/never-prompt rule, the
 * read-only before/after verification), and relay-implement.md's
 * `deadline_ts` forwarding into the standard-mode dispatch only.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed Phase 2 plan:
 * PRPs/plans/hybrid-code-review-phase-2-the-pass.plan.md — narrowed to
 * the ACs the calling command named in scope: AC-2, AC-3, AC-4, AC-7,
 * AC-10, AC-11 (PRPs/prds/hybrid-code-review.prd.md).
 *
 * Existing-coverage scan performed before authoring (Step 2.1): grepped
 * every scripts/validate/checks/*.test.mjs file for "Skill", "HYBRID_LEVEL_
 * REFUSED", "SKIPPED_INSUFFICIENT_BUDGET", "READ_ONLY_VIOLATION_DETECTED",
 * "hybrid_pass_timeout_minutes", and "deadline_ts". Zero hits anywhere
 * outside code-reviewer.md/relay-implement.md themselves —
 * hybrid-code-review-phase1.test.mjs (the only existing hybrid-code-review
 * test file) covers the Phase 1 contract (the `class` field slot, the four
 * `hyb*` fields' schema-only registration, and this repo's own
 * `hybrid_code_review: false` default); it never reads the `tools:`
 * frontmatter line, the pass section's own prose, or relay-implement.md at
 * all. gating-structure.test.mjs owns the `hybrid_code_review` boolean
 * SITES marker mechanism, not the pass's own safety-envelope prose. No
 * EXISTING_TEST_COVERS, EXISTING_TEST_UPDATED, OBSOLETE_TEST_REMOVED, or
 * REDUNDANT_TEST_REMOVED outcome applies to any AC in this file's scope —
 * every AC below is NEW_TEST_REQUIRED. (The one lifecycle operation this
 * session performs — the arbitrated R-X extraction-anchor fix — is
 * recorded separately against test-formatting-prevention-preflight-
 * phase4.test.mjs, an unrelated feature's file, not against anything in
 * this file's scope.)
 *
 * Static-assertion note: this phase's pass logic (Skill invocation,
 * degradation branching, the read-only git-status comparison) does not
 * exist as executable code in this repo — code-reviewer.md is itself a
 * prompt the `code-reviewer` agent interprets at run time, mirroring
 * hybrid-code-review-phase1.test.mjs's and every prior
 * figma-track-phaseN / test-formatting-prevention-preflight-phaseN
 * test.mjs file's own precedent. The meaningful, discriminative
 * assertion available to a
 * `node:test` file is therefore: does the shipped prose state the exact
 * normative contract each in-scope AC requires, in the position and
 * ordering the APPROVED plan committed to — not "does invoking the pass
 * behave correctly," which is outside this repo's own test surface (no
 * harness here invokes `Skill`).
 *
 * Traceability (PRPs/prds/hybrid-code-review.prd.md Acceptance Criteria,
 * narrowed to the plan's own in-scope subset: AC-A1 (PRD AC-2), AC-A3
 * (PRD AC-3), AC-A4 (PRD AC-4), AC-A5 (PRD AC-7), AC-A6 (PRD AC-10), AC-A7
 * (PRD AC-11). AC-1/AC-5/AC-6/AC-8/AC-9/AC-12 are OUT_OF_PHASE_SCOPE —
 * AC-1 belongs to Phase 1 (shipped, covered by hybrid-code-review-
 * phase1.test.mjs); AC-5/AC-6 (adjudication) and AC-12 (drift gate) belong
 * to Phases 3/4; AC-8 (log stays machine-readable) is a Phase 1 schema
 * concern already covered by hybrid-code-review-phase1.test.mjs's AC-A3
 * tests; AC-9 (R-X / dispute non-interference) is untouched by this
 * phase's own Files to Change and is exercised instead by the R-X
 * byte-identical guard in test-formatting-prevention-preflight-
 * phase4.test.mjs, updated this session to tolerate this phase's own
 * legitimate insertion):
 *
 *   AC-A1 (PRD AC-2, "Declared activation, never inferred") —
 *     code-reviewer.md's `tools:` frontmatter line grants exactly `Skill`
 *     as its one new capability (mirroring the `Task` precedent), and the
 *     pass section states the level configuration is read from the
 *     declared `hybrid_code_review_level` value, never inferred from a
 *     mention of `/code-review` elsewhere.
 *   AC-A3 (PRD AC-3, "Explicit path") — the pass's one `Skill` invocation
 *     shape carries `<target_root>` verbatim in its arguments.
 *   AC-A4 (PRD AC-4, "Level ceiling refused by name") — a
 *     `hybrid_level` other than exactly `medium`/`high` (covering
 *     `xhigh`, `max`, `ultra` by name) is refused with the literal marker
 *     `HYBRID_LEVEL_REFUSED` / `refused_level:<value>` and never invoked;
 *     `--fix`/`--comment` are never constructed under any configuration.
 *   AC-A5 (PRD AC-7, "Graceful degradation, never a halt") — tool error,
 *     unparseable output, or timeout each records one of
 *     `SKILL_UNAVAILABLE` / `SKILL_ERROR:<message>` / `UNPARSEABLE_OUTPUT`
 *     / `TIMEOUT_EXCEEDED` and the section states explicitly it never
 *     halts and never prompts.
 *   AC-A6 (PRD AC-10, "Budget isolation") — the fixed
 *     `hybrid_pass_timeout_minutes = 3` internal budget is distinct from
 *     and never consumes `max_implement_retries`; insufficient remaining
 *     `deadline_ts` budget skips the pass with `SKIPPED_INSUFFICIENT_
 *     BUDGET`; relay-implement.md forwards `deadline_ts` into the
 *     standard-mode dispatch exactly once, and NOT into the arbitration-
 *     mode dispatch (the pass never runs in arbitration mode).
 *   AC-A7 (PRD AC-11, "Read-only over the target") — the pass captures
 *     `git status --porcelain` immediately before and after its one
 *     `Skill` call; a mismatch records `READ_ONLY_VIOLATION_DETECTED`,
 *     discards the findings, and explicitly never attempts a repair.
 *
 * Run: node --test scripts/validate/checks/hybrid-code-review-phase2.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors hybrid-code-review-phase1.test.mjs's readRepoFile.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Returns the substring of `content` from `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Mirrors
 * hybrid-code-review-phase1.test.mjs's / figma-track-phase*.test.mjs's
 * established slicing idiom.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const start = content.indexOf(startNeedle);
  if (start === -1) return undefined;
  const end = content.indexOf(endNeedle, start);
  if (end === -1) return undefined;
  return content.slice(start, end);
}

const PASS_SECTION_HEADING =
  '## The hybrid /code-review pass (Phase 2 — evidence collection only)';
const NEXT_SECTION_HEADING = '## The R-COH-* coherence layer';

/**
 * Extracts the hybrid pass section's own body (heading through, but
 * excluding, the following R-COH-* heading), asserting it is non-empty
 * first so an empty-vs-empty match can never pass vacuously.
 * @param {string} content
 * @returns {string}
 */
function getPassSection(content) {
  const section = sliceBetween(content, PASS_SECTION_HEADING, NEXT_SECTION_HEADING);
  assert.ok(section, 'expected an extractable "## The hybrid /code-review pass" section');
  assert.ok(/** @type {string} */ (section).length > 0, 'extracted pass section must be non-empty');
  return /** @type {string} */ (section);
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-2) — Skill is code-reviewer's one new declared capability;
// the level is read from the declared key, never inferred from a mention.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-2): code-reviewer.md\'s tools: frontmatter line grants exactly Skill as the one new capability, preserving every previously granted tool', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  assert.match(
    content,
    /^tools: Read, Write, Glob, Grep, Bash, BashOutput, Task, Skill$/m,
    'expected the tools: line to grant exactly the prior tool set plus Skill, appended last'
  );
});

test('AC-A1 (PRD AC-2): the pass section gates on the declared hybrid_enabled/hybrid_level values and is zero-effect when hybrid_enabled == false — never activated by a mention of /code-review elsewhere', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /Zero-effect when `hybrid_enabled == false`/,
    'expected the pass section to state it is zero-effect when the declared key is off'
  );
  assert.match(
    section,
    /No invocation, no\s+local state, and Phase 4 adds none of the four `hyb_\*` fields/,
    'expected the zero-effect branch to state no invocation and no verdict fields are added'
  );

  const content = readRepoFile(CODE_REVIEWER_PATH);
  const phase0 = sliceBetween(
    content,
    'Also capture `hybrid_code_review`',
    "- `<plan_path>` — read end-to-end"
  );
  assert.ok(phase0, 'expected the Phase 0 methodology-read paragraph describing the hybrid_code_review/hybrid_code_review_level reads');
  assert.match(
    /** @type {string} */ (phase0),
    /read the\s+declared value only/,
    'expected Phase 0 to state hybrid_enabled/hybrid_level are read from the declared value only, never inferred'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — the Skill invocation carries <target_root> verbatim.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3): the pass\'s one Skill invocation shape carries <target_root> verbatim in its arguments, not the session\'s own working directory', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /Skill\("code-review", "<hybrid_level> <target_root>"\)/,
    'expected the Skill invocation to pass <hybrid_level> <target_root> verbatim as its argument string'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-4) — level ceiling refused by name; --fix/--comment never
// constructed under any configuration.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-4): a hybrid_level other than exactly medium/high — covering xhigh, max, ultra by name — is refused with HYBRID_LEVEL_REFUSED / refused_level:<value> and Skill is never invoked in that branch', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(section, /is not exactly\s+`medium` or `high`/, 'expected the refusal guard to name the exact allowed values');
  assert.match(section, /`xhigh`, `ultra`|xhigh.{0,20}max.{0,20}ultra/s, 'expected xhigh/max/ultra named as covered by the refusal');
  assert.match(section, /HYBRID_LEVEL_REFUSED/, 'expected the literal HYBRID_LEVEL_REFUSED marker');
  assert.match(section, /refused_level:<value>/, 'expected the refused_level:<value> reason shape');
  assert.match(section, /do NOT invoke `Skill`/, 'expected the refusal branch to state Skill is never invoked');
});

test('AC-A4 (PRD AC-4): --fix and --comment are never constructed in the invocation args under any configuration, hardcoded and unreachable', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /`--fix` and `--comment` are never constructed/,
    'expected an explicit statement that --fix/--comment are never constructed'
  );
  assert.match(
    section,
    /hardcoded, unreachable via any project declaration/,
    'expected the never-constructed guard to be stated as hardcoded and unreachable via project config'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-7) — graceful degradation, never a halt.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-7): tool error, unparseable output, or timeout each records one of the four named degradation reasons and the section states it never halts and never prompts', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  for (const reason of ['SKILL_UNAVAILABLE', 'SKILL_ERROR:<message>', 'UNPARSEABLE_OUTPUT', 'TIMEOUT_EXCEEDED']) {
    assert.ok(section.includes(reason), `expected the degradation branch to name ${reason}`);
  }
  assert.match(
    section,
    /never\s+halt, never prompt/,
    'expected the degradation branch to state it never halts and never prompts'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-10) — budget isolation: fixed timeout never consumes a
// retry; insufficient deadline_ts budget skips the pass; deadline_ts is
// forwarded into the standard-mode dispatch only.
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-10): hybrid_pass_timeout_minutes = 3 is a fixed internal constant, distinct from and never consuming max_implement_retries', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /`hybrid_pass_timeout_minutes = 3` is a\s+fixed internal constant, NOT project-configurable/,
    'expected the fixed 3-minute internal budget to be stated as a non-configurable constant'
  );
  assert.match(
    section,
    /distinct from and never consumes `max_implement_retries`/,
    'expected the budget to be stated as isolated from the retry budget'
  );
});

test('AC-A6 (PRD AC-10): insufficient deadline_ts budget skips the pass with SKIPPED_INSUFFICIENT_BUDGET rather than overrunning it', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /now\(\) \+ hybrid_pass_timeout_minutes minutes > deadline_ts/,
    'expected the pre-flight skip condition to compare the fixed budget against deadline_ts'
  );
  assert.match(section, /SKIPPED_INSUFFICIENT_BUDGET/, 'expected the literal SKIPPED_INSUFFICIENT_BUDGET marker');
  assert.match(
    section,
    /do NOT invoke `Skill`/,
    'expected the pre-flight skip branch to state Skill is never invoked'
  );
});

test('AC-A6 (PRD AC-10): relay-implement.md forwards deadline_ts into the standard-mode code-reviewer dispatch exactly once, and never into the arbitration-mode dispatch', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const occurrences = content.split('deadline_ts: <deadline_ts>,').length - 1;
  assert.equal(occurrences, 1, 'expected exactly one deadline_ts forwarding line in relay-implement.md');

  const standardBlock = sliceBetween(content, '#### Standard mode (after IMPLEMENTATION_COMPLETE)', '#### Arbitration mode (after TEST_CONTRACT_DISPUTE)');
  assert.ok(standardBlock, 'expected an extractable standard-mode dispatch block');
  assert.ok(
    /** @type {string} */ (standardBlock).includes('deadline_ts: <deadline_ts>,'),
    'expected deadline_ts to be forwarded inside the standard-mode dispatch block'
  );

  const arbitrationBlock = sliceBetween(content, '#### Arbitration mode (after TEST_CONTRACT_DISPUTE)', 'The code-reviewer arbitrates the dispute.');
  assert.ok(arbitrationBlock, 'expected an extractable arbitration-mode dispatch block');
  assert.ok(
    !/** @type {string} */ (arbitrationBlock).includes('deadline_ts'),
    'the arbitration-mode dispatch block must never forward deadline_ts — the pass never runs in arbitration mode'
  );
});

// ---------------------------------------------------------------------------
// AC-A7 (PRD AC-11) — read-only over the target: before/after git status
// comparison; a mismatch discards findings and never attempts a repair.
// ---------------------------------------------------------------------------

test('AC-A7 (PRD AC-11): the pass captures git status --porcelain immediately before and after its one Skill call, and a mismatch records READ_ONLY_VIOLATION_DETECTED and discards the findings', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /Capture `git status --porcelain` via\s+`Bash` immediately before invoking and again immediately after/,
    'expected the before/after git status --porcelain capture to be documented'
  );
  assert.match(section, /READ_ONLY_VIOLATION_DETECTED/, 'expected the literal READ_ONLY_VIOLATION_DETECTED marker');
  assert.match(
    section,
    /discard the pass's findings/,
    'expected a mismatch to discard the pass\'s findings rather than trust them'
  );
});

test('AC-A7 (PRD AC-11): a read-only violation never triggers a repair attempt against the target tree — git restore/checkout/clean are explicitly never run', () => {
  const section = getPassSection(readRepoFile(CODE_REVIEWER_PATH));
  assert.match(
    section,
    /explicitly do NOT attempt any repair/,
    'expected an explicit statement that no repair is attempted'
  );
  assert.match(
    section,
    /`git restore`\/\s*`git checkout`\/`git clean` are never run against the target/,
    'expected git restore/checkout/clean to be named as never run against the target'
  );
  assert.match(
    section,
    /Mutating a target project's working tree from a review agent/,
    'expected the anti-pattern to be cited by name'
  );
});
