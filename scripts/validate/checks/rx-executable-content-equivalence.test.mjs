// @ts-check
/**
 * Content-invariant tests for the 2026-08-28 R-X change (docs/decisions.md
 * entries 92 and 93): the executable-content equivalence step that clears an
 * R-X-matched test path, the fourth arbitration outcome
 * `DISPUTE_UPHELD_NEW_COVERAGE`, and the working-tree prohibition on the two
 * review agents that hold `Bash`.
 *
 * Behavioural coverage of the normalizer itself lives next to the script, in
 * `plugins/relay/scripts/executable-content-hash.test.mjs` — 25 cases weighted
 * toward the adversarial negatives (a changed expected value, an added
 * `.skip`, a removed block, tokenizer traps, the fail-closed paths). This file
 * covers the other half, which cannot be unit-tested: whether the shipped
 * PROSE actually carries the properties the decision depends on. The prose is
 * the executable artifact here — `code-reviewer` is a prompt, so a rule that
 * is not stated in it does not run.
 *
 * The assertions are chosen to fail on the specific regressions that would
 * turn a verifiable carve-out back into a trust-based one:
 *   - the clearance stops naming the script (an agent could then "compute" it
 *     by reading the diff);
 *   - the hashes stop being recorded (the clearance becomes unauditable);
 *   - the fail-closed default disappears (silence becomes a clear);
 *   - the additive-exclusion disappears (new `it()` blocks self-clear,
 *     bypassing the judgment the fourth outcome exists to preserve);
 *   - the numstat precondition on the fourth outcome becomes a claim rather
 *     than a `Bash` verification (the 2026-08-03 exemption's condition-2
 *     lesson, un-learned).
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const IMPLEMENTER_PATH = 'plugins/relay/agents/implementer.md';
const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';
const RELAY_EXECUTE_PATH = 'plugins/relay/commands/relay-execute.md';
const TEST_REVIEWER_PATH = 'plugins/relay/agents/test-reviewer.md';
const POST_GREEN_PATH = 'plugins/relay/agents/post-green-reviewer.md';
const ALLOWLIST_PATH = 'plugins/relay/resources/settings-allowlist.md';
const SCRIPT_PATH = 'plugins/relay/scripts/executable-content-hash.mjs';
const METRICS_SCHEMA_PATH = 'plugins/relay/resources/usage-metrics-schema.md';

/** @param {string} relPath */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
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

function rxSection() {
  const section = sliceBetween(
    readRepoFile(CODE_REVIEWER_PATH),
    '### R-X — Universal test-modification guard (straight fail, D17)',
    '## The R-COH-* coherence layer (additive, runs after'
  );
  assert.ok(section, 'expected an extractable ### R-X section');
  return /** @type {string} */ (section);
}

// ---------------------------------------------------------------------------
// The file-level match is UNCHANGED — the carve-out is downstream of it
// ---------------------------------------------------------------------------

test('R-X still matches at the file level first, with the same 18-pattern pathspec set and the same git command', () => {
  const section = rxSection();
  assert.match(section, /git diff --name-only <diff_target>\.\.HEAD -- <pathspec-set>/);
  for (const glob of [
    "'**/test_*.py'",
    "'**/tests/**/*.py'",
    "'**/*.test.ts'",
    "'**/*.spec.tsx'",
    "'**/*_test.go'",
    "'**/*_spec.rb'",
    "'**/__tests__/**'",
    "'**/*.test.rs'",
    "'**/spec/**'",
  ]) {
    assert.ok(section.includes(glob), `expected the canonical pathspec set to still contain ${glob}`);
  }
  assert.match(section, /If the result is empty: PASS\./);
});

// ---------------------------------------------------------------------------
// Step X.2 — the properties that make the clearance verifiable
// ---------------------------------------------------------------------------

test('the clearance path names the shipped script, and that script exists on disk', () => {
  assert.match(rxSection(), /scripts\/executable-content-hash\.mjs/);
  assert.doesNotThrow(() => readRepoFile(SCRIPT_PATH), 'the script R-X delegates to must exist');
});

test('the clearance is gated on cleared:true, not on the reviewer agreeing with the diff', () => {
  const section = rxSection();
  assert.match(section, /if and only if its report row carries\s+`cleared: true`/);
  assert.match(section, /Not a self-certification/);
  assert.match(
    section,
    /never asserted/,
    'the heading itself must say the equivalence is computed, never asserted'
  );
});

test('both hashes are recorded in the verdict, so a clearance can be re-run and refuted', () => {
  const section = rxSection();
  assert.match(section, /Record verbatim in the jsonl `reason`/);
  assert.match(section, /`base_hash` and `head_hash`/);
  assert.match(section, /reproducible/);
});

test('the equivalence step is fail-closed, including when the script cannot run at all', () => {
  const section = rxSection();
  assert.match(section, /fail-closed by construction/);
  assert.match(section, /node missing,\s+script path unresolvable, non-zero exit/);
  assert.match(section, /NO path is cleared/);
});

test('added test content is explicitly OUTSIDE the carve-out and routed to the fourth outcome', () => {
  const section = rxSection();
  assert.match(section, /Not available for ADDED test content/);
  assert.match(section, /DISPUTE_UPHELD_NEW_COVERAGE/);
});

test('the carve-out is explicitly not a formatting exception — entries 89/90 keep their mechanism', () => {
  const section = rxSection();
  assert.match(section, /Not a formatting carve-out/);
  assert.match(section, /P5\s+preflight/);
  assert.match(section, /never\s+by a rule about whitespace/);
});

test('the straight-fail branch still names only the not-cleared paths, verbatim, with no grace period', () => {
  const section = rxSection();
  assert.match(section, /straight FAIL, listing ONLY the\s+not-cleared paths verbatim/);
  assert.match(section, /no "first warning" grace period/);
  assert.match(section, /tdd: true` or `tdd: false`/, 'D9 Layer 0 universality must survive the rewrite');
});

// ---------------------------------------------------------------------------
// The fourth arbitration outcome
// ---------------------------------------------------------------------------

test('arbitration Step 3.3 offers four outcomes, and the new one carries BOTH mandatory conditions', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  assert.match(content, /specific AC-N text\. Four\npossible outcomes:/);

  const block = sliceBetween(
    content,
    '- **`DISPUTE_UPHELD_NEW_COVERAGE`**',
    '- **`DISPUTE_UPHELD_PRD_AMBIGUOUS`**'
  );
  assert.ok(block, 'expected an extractable DISPUTE_UPHELD_NEW_COVERAGE block');
  const b = /** @type {string} */ (block);

  assert.match(b, /Two conditions, BOTH mandatory/);
  assert.match(b, /git diff --numstat <diff_target>\.\.HEAD -- <cited-test-path>/);
  assert.match(b, /deletions column MUST be `0`/);
  assert.match(b, /verified by `Bash`, not\s+claimed/);
  assert.match(
    b,
    /not automatically harmless/,
    'the block must state why this stays a judged outcome rather than a mechanical clearance'
  );
});

test('the new outcome is registered in every enum that routes on a verdict', () => {
  for (const [path, needle] of [
    [CODE_REVIEWER_PATH, '"DISPUTE_UPHELD_NEW_COVERAGE"'],
    [METRICS_SCHEMA_PATH, '`DISPUTE_UPHELD_NEW_COVERAGE`'],
    [RELAY_IMPLEMENT_PATH, '- **`DISPUTE_UPHELD_NEW_COVERAGE`** →'],
    [RELAY_EXECUTE_PATH, '`DISPUTE_UPHELD_NEW_COVERAGE`'],
  ]) {
    assert.ok(
      readRepoFile(/** @type {string} */ (path)).includes(/** @type {string} */ (needle)),
      `expected ${path} to register the new outcome (${needle})`
    );
  }
});

test('an upheld new-coverage dispute still routes through the test pair — the implementer never authors the addition', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(
    content,
    '- **`DISPUTE_UPHELD_NEW_COVERAGE`** →',
    '- **`DISPUTE_UPHELD_PRD_AMBIGUOUS`** →'
  );
  assert.ok(block, 'expected an extractable routing branch');
  const b = /** @type {string} */ (block);
  assert.match(b, /\/relay-write-test <plan_path>/);
  assert.match(b, /NEW test/);
  assert.match(b, /the implementer never authors the addition|Implementer/);
});

test('the implementer is told the equivalence check is not permission to edit test prose', () => {
  const content = readRepoFile(IMPLEMENTER_PATH);
  assert.match(content, /Editing a test file's comments or its `describe`\/`it` titles/);
  assert.match(content, /not permission for THIS agent/);
  assert.match(content, /Never dispute a comment-only or title-only test edit/);
});

test('/relay-implement hard rule 9 forbids the command from asserting an equivalence of its own', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const rule = sliceBetween(content, '9. **Never modify test files without an upheld dispute.**', '\n10.');
  assert.ok(rule, 'expected an extractable hard rule 9');
  assert.match(/** @type {string} */ (rule), /never asserts an equivalence of its own/);
  assert.match(/** @type {string} */ (rule), /never treats a small diff as self-clearing/);
});

// ---------------------------------------------------------------------------
// Decision 93 — review agents never mutate the target working tree
// ---------------------------------------------------------------------------

test('test-reviewer forbids every tree-mutating git command and points at the degraded path instead', () => {
  const content = readRepoFile(TEST_REVIEWER_PATH);
  const block = sliceBetween(content, '2b. **Never change the target', '3. **JSONL is append-only.**');
  assert.ok(block, 'expected an extractable Hard constraint 2b');
  const b = /** @type {string} */ (block);
  for (const cmd of ['git stash', 'git stash pop', 'git checkout', 'git restore', 'git reset', 'git clean']) {
    assert.ok(b.includes(cmd), `expected Hard constraint 2b to name ${cmd}`);
  }
  assert.match(b, /no exception for "I will put it\s+back afterwards"/);
  assert.match(b, /`passed: null`/, 'the constraint must name the degraded outcome it requires instead');
});

test('post-green-reviewer carries the same rule, before its first instruction', () => {
  const content = readRepoFile(POST_GREEN_PATH);
  const ruleIdx = content.indexOf('**Working-tree rule, before anything else:**');
  const roleIdx = content.indexOf('You are the Post-Green Reviewer');
  assert.notEqual(ruleIdx, -1, 'expected the working-tree rule');
  assert.ok(ruleIdx < roleIdx, 'the rule must precede the role description, not sit in a footnote');
  assert.match(content.slice(ruleIdx, roleIdx), /git stash[\s\S]{0,200}forbidden/);
});

test('the recommended allowlist no longer pre-authorizes git stash, and says why', () => {
  const content = readRepoFile(ALLOWLIST_PATH);
  assert.ok(
    !content.includes('- `Bash(git stash*)` — stash/pop acceptable'),
    'the pre-authorizing allowlist entry must be gone'
  );
  assert.match(content, /`Bash\(git stash\*\)` is deliberately NOT allowlisted/);
  assert.match(content, /uncommitted work/);
});
