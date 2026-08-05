// @ts-check
/**
 * Regression suite for the 10th fixed deterministic plan-reviewer check,
 * `R-COH-VALIDATE-PATTERN-UNGROUNDED` — see docs/decisions.md's
 * [2026-08-04] entry.
 *
 * Motivation: /relay-execute on PRPs/prds/figma-quota-resilience.prd.md
 * Phase 2 produced an APPROVED plan carrying two validation-command defects
 * of one class, in opposite polarities, neither caught at plan-review time:
 *
 *   - Level 3 scraped the node:test corpus with `grep -oE '# fail [0-9]+'`.
 *     Node v24's default (spec) reporter emits `ℹ fail 2`; `# fail 2`
 *     appears only under an explicitly selected `--test-reporter=tap`. The
 *     pattern therefore matched nothing: FAIL_COUNT silently defaulted to 0
 *     in a bare shell (gate always passes) and the failed pipe aborted the
 *     script under `set -euo pipefail` (gate fails closed).
 *   - Level 2 required `grep -q 'recall-oriented'` and `grep -q 'no
 *     classification authority'`, both case-sensitive, against prose the
 *     SAME plan specified be authored as `**Recall-oriented.**` and `**No
 *     classification authority.**` — blocking a compliant implementation.
 *
 * Both had real exit-code semantics (so both passed
 * R-COH-VALIDATE-ALWAYS-PASS) and neither was a forbidden-reference grep
 * (so R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE never applied). Both were
 * recorded in the R-L2/R-L3 rows of the phase's .code-review.jsonl and the
 * plan was APPROVED anyway — correctly, since a broken gate inside an
 * approved plan is plan debt, not a defect in the implementation diff.
 * That is exactly why the catch had to move upstream.
 *
 * These tests assert the SHIPPED CONTRACT of the new check and its
 * three-site authoring mirror (plan-writer.md + plan-template.md), the
 * pattern the [2026-07-09] and [2026-07-23] decisions established. They do
 * not re-assert the rubric[] length numerals — that is
 * plan-reviewer-rubric-arithmetic-derived.test.mjs's job, which DERIVES
 * them from the live `#### R-COH-*` heading count rather than snapshotting
 * them here (one more numeral snapshot is precisely what that file exists
 * to stop accumulating).
 *
 * Run: node --test "scripts/validate/checks/plan-reviewer-validate-pattern-ungrounded-check.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';
const PLAN_WRITER_PATH = 'plugins/relay/agents/plan-writer.md';
const PLAN_TEMPLATE_PATH = 'docs/context/plan-template.md';
const CONVENTIONS_PATH = 'docs/context/conventions.md';
const DECISIONS_PATH = 'docs/decisions.md';

const CHECK_ID = 'R-COH-VALIDATE-PATTERN-UNGROUNDED';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors plan-reviewer-validate-search-ambiguous-check.test.mjs's helper
 * of the same name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors the sibling helper of the same shape.
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
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a source file happens to wrap a sentence. Mirrors the sibling
 * helper of the same shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Returns the collapsed body of the new check's own `#### ` section in
 * plan-reviewer.md, from its heading up to the next `### ` sibling.
 * @returns {string}
 */
function readCheckSection() {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, `#### ${CHECK_ID} —`, '### Bounded K=5 LLM judgment pass');
  assert.ok(block, `expected an extractable #### ${CHECK_ID} section in ${PLAN_REVIEWER_PATH}`);
  return collapseWs(/** @type {string} */ (block));
}

// ---------------------------------------------------------------------------
// The check exists, is unconditional, and is scoped to both command sites.
// ---------------------------------------------------------------------------

test(`${CHECK_ID}: plan-reviewer.md carries the check as a #### R-COH-* section declaring itself unconditional (always exactly one rubric[] row, never zero-emission)`, () => {
  const section = readCheckSection();

  assert.ok(
    section.includes('**Unconditional — always emitted, never zero-emission.**'),
    'expected the standard unconditional declaration used by the sibling fixed checks'
  );
  assert.ok(
    section.includes('always contributes exactly one row to `rubric[]`'),
    'expected the explicit one-row-per-run statement'
  );
});

test(`${CHECK_ID}: the check scans both command sites — ## Validation Commands Levels 1-3 and per-task **VALIDATE**: commands`, () => {
  const section = readCheckSection();

  assert.ok(
    section.includes('every command body in `## Validation Commands` (Levels 1–3) and every `**VALIDATE**:` command in `## Step-by-Step Tasks`'),
    'expected the same two-site scope statement the sibling VALIDATE checks use'
  );
});

// ---------------------------------------------------------------------------
// Both conditions, and the three escape routes on condition (a).
// ---------------------------------------------------------------------------

test(`${CHECK_ID}: condition (a) fails an ungrounded runner-output scrape and names all three ways a plan can ground it (machine-readable reporter / verbatim sample / exit code)`, () => {
  const section = readCheckSection();

  assert.ok(section.includes('**(a) Ungrounded runner-output scrape.**'), 'expected condition (a) to be labelled');
  assert.ok(
    section.includes('pipe into `grep`/`rg`/`sed`/`awk`, or the same inside `$(…)` command substitution'),
    'expected the scrape shapes condition (a) recognizes, including command substitution'
  );
  assert.ok(
    section.includes('that value decides the command\'s exit code'),
    'expected the exit-code-relevance qualifier — a scrape that does not decide the exit code is out of scope'
  );

  for (const escape of [
    'pins a machine-readable output format on the invocation itself',
    'quotes a VERBATIM sample of that tool\'s real output',
    'asserting on the tool\'s own exit code instead',
  ]) {
    assert.ok(section.includes(escape), `expected condition (a) escape route: "${escape}"`);
  }

  assert.ok(
    section.includes('`--test-reporter=tap`'),
    'expected --test-reporter=tap named as a concrete machine-readable reporter — the exact flag that would have made the incident pattern correct'
  );
  assert.ok(
    section.includes('`node --test <glob>` already exits non-zero when any test fails'),
    'expected the fix statement to name the exit-code route concretely for node:test'
  );
});

test(`${CHECK_ID}: condition (b) fails a case-sensitive presence grep that diverges from the literal the plan's own ACTION prose authors, and exempts -i and regex-tolerant patterns`, () => {
  const section = readCheckSection();

  assert.ok(
    section.includes('**(b) Form mismatch against the plan\'s own authored literal.**'),
    'expected condition (b) to be labelled'
  );
  assert.ok(
    section.includes('carrying no `-i` flag and no regex metacharacter that would absorb the difference'),
    'expected the -i / regex-tolerance exemption that keeps condition (b) from false-positiving on deliberately loose patterns'
  );
  assert.ok(
    section.includes('not a byte-exact substring of that authored literal'),
    'expected the byte-exactness rule condition (b) turns on'
  );
  assert.ok(
    section.includes('`recall-oriented` vs `**Recall-oriented.**`'),
    'expected the originating incident quoted as the worked divergence example'
  );
});

test(`${CHECK_ID}: either condition fails the row, a plan can fail both, and a plan with zero in-scope commands passes trivially`, () => {
  const section = readCheckSection();

  assert.ok(
    section.includes('fails this check if EITHER (a) or (b) applies'),
    'expected the either-condition failure rule'
  );
  assert.ok(section.includes('A single plan can fail both'), 'expected the both-conditions case to be addressed');
  assert.ok(
    section.includes(`A plan with zero in-scope commands passes this row trivially → \`{ "id": "${CHECK_ID}", "passed": true }\``),
    'expected the vacuous-pass rule with the literal passing row shape'
  );
});

// ---------------------------------------------------------------------------
// Boundary prose against the four sibling checks, and the known limitation.
// ---------------------------------------------------------------------------

test(`${CHECK_ID}: the check states its boundary against all four sibling checks it could otherwise be confused with`, () => {
  const section = readCheckSection();

  assert.ok(
    section.includes('**Relationship to the sibling VALIDATE checks**'),
    'expected an explicit sibling-relationship paragraph'
  );
  assert.ok(
    section.includes('`R-COH-VALIDATE-ALWAYS-PASS` asks whether a command CAN fail at all — a shell-shape property'),
    'expected the ALWAYS-PASS boundary — the check both incident commands already passed'
  );
  assert.ok(
    section.includes('`R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE` asks whether an ABSENCE grep matches too much'),
    'expected the FORBIDDEN-GREP-SCOPE boundary'
  );
  assert.ok(
    section.includes('`R-COH-VALIDATE-SEARCH-AMBIGUOUS` asks whether a position-based literal matches in too MANY places; this check asks whether a pattern matches in NONE'),
    'expected the SEARCH-AMBIGUOUS boundary — too-many vs none'
  );
  assert.ok(
    section.includes('the boundary is polarity versus form'),
    'expected the ACTION-VALIDATE-CONTRADICTION boundary — that check catches polarity disagreement, condition (b) catches form disagreement'
  );
});

test(`${CHECK_ID}: the check records its known limitation — no Bash/Grep/Glob, so it detects plan-local proxy signals only`, () => {
  const section = readCheckSection();

  assert.ok(
    section.includes('**Known limitation (recorded, not blocking):**'),
    'expected the standard known-limitation paragraph the sibling heuristic checks all carry'
  );
  assert.ok(
    section.includes('`Read, Edit, Write` — no `Bash`, no `Grep`, no `Glob`'),
    'expected the tool-grant statement explaining why the check cannot execute the tool or read the target file'
  );
  assert.ok(
    section.includes('It is a plan-authoring-time gate, not the final safety net'),
    'expected the standard not-the-final-safety-net framing'
  );
});

// ---------------------------------------------------------------------------
// The worked review.jsonl example carries the new row.
// ---------------------------------------------------------------------------

test(`${CHECK_ID}: plan-reviewer.md's ## review.jsonl format worked example carries a passed:true row for the new check, exactly once`, () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const jsonlBlock = sliceBetween(content, '"rubric": [', '"action": "final_flip"');
  assert.ok(jsonlBlock, 'expected an extractable worked-example rubric[] JSON block');

  const rowOccurrences = (/** @type {string} */ (jsonlBlock)).split(`{ "id": "${CHECK_ID}", "passed": true }`).length - 1;
  assert.equal(rowOccurrences, 1, `expected exactly one worked-example row for ${CHECK_ID}, found ${rowOccurrences}`);
});

// ---------------------------------------------------------------------------
// Three-site authoring mirror: plan-writer.md and plan-template.md.
// ---------------------------------------------------------------------------

test(`${CHECK_ID}: plan-writer.md Hard constraint #11 forward-points to the pattern-grounding traps without disturbing the existing forbidden-grep sentence`, () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '11. **Validation commands must be able to fail', '12. **`phase_scope: visual` task purity');
  assert.ok(block, 'expected an extractable Hard Constraint #11 block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('enforced by `plan-reviewer`\'s R-COH-VALIDATE-FORBIDDEN-GREP-SCOPE check.'),
    'expected the pre-existing forbidden-grep sentence to survive intact, terminal period included — rubric-reconciliation.test.mjs pins this exact string'
  );
  assert.ok(
    collapsed.includes(`enforced by \`plan-reviewer\`'s ${CHECK_ID} check.`),
    'expected the new enforcement cross-reference as its own sentence'
  );
  assert.ok(
    collapsed.includes('never guess a runner\'s output format') && collapsed.includes('copy an authored literal byte-for-byte'),
    'expected both halves of the rule stated in the constraint itself, not only by reference'
  );
});

test(`${CHECK_ID}: plan-writer.md Step 4.4 item 11 carries the pattern-grounding wrong/right example block covering both incident polarities`, () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(
    content,
    '**Pattern-grounding traps (mandatory whenever a command\'s pattern',
    '12. `## Acceptance Criteria`'
  );
  assert.ok(block, 'expected an extractable pattern-grounding traps block in Step 4.4 item 11');
  const raw = /** @type {string} */ (block);

  assert.ok(
    raw.includes("grep -oE '# fail [0-9]+'"),
    'expected the always-pass WRONG case to quote the real offending pattern'
  );
  assert.ok(
    raw.includes('node:test emits "ℹ fail 2", never "# fail 2"'),
    'expected the WRONG case to state the real reporter output that defeats the pattern'
  );
  assert.ok(
    raw.includes("grep -q 'recall-oriented'"),
    'expected the always-fail WRONG case to quote the real offending pattern'
  );
  assert.ok(
    raw.includes("grep -q '\\*\\*Recall-oriented\\.\\*\\*'"),
    'expected the RIGHT case to show the byte-exact authored form'
  );
  assert.ok(
    raw.includes(`\`${CHECK_ID}\` check rejects both shapes.`),
    'expected the enforcement cross-reference closing the block'
  );
});

test(`${CHECK_ID}: plan-writer.md carries an anti-pattern bullet for the class, naming both polarities and the enforcing check`, () => {
  const content = readRepoFile(PLAN_WRITER_PATH);
  const block = sliceBetween(content, '- **Guessing a tool\'s output format', '---');
  assert.ok(block, 'expected an extractable pattern-grounding anti-pattern bullet');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes('carries no signal in either shell'),
    'expected the bullet to explain why the always-pass half is worthless in BOTH shell modes'
  );
  assert.ok(
    collapsed.includes('blocks a fully compliant implementation'),
    'expected the bullet to explain the always-fail half\'s cost'
  );
  assert.ok(collapsed.includes(`${CHECK_ID} rejects both shapes.`), 'expected the enforcement cross-reference');
});

test(`${CHECK_ID}: plan-template.md carries mandatory extension 7 (pattern grounding) and the item-12 Level-command note`, () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);

  const extension = sliceBetween(content, '7. **Pattern grounding.**', '---');
  assert.ok(extension, 'expected mandatory extension 7 to exist');
  const collapsedExtension = collapseWs(/** @type {string} */ (extension));

  assert.ok(
    collapsedExtension.includes('Never guess a tool\'s output format'),
    'expected the runner-output half of the extension'
  );
  assert.ok(
    collapsedExtension.includes('copy that literal byte-for-byte from the `**ACTION**:` prose'),
    'expected the authored-literal half of the extension'
  );
  assert.ok(
    collapsedExtension.includes('an unmatched pattern makes the gate always-pass, and a mis-cased one makes it always-fail'),
    'expected the extension to state both failure polarities explicitly'
  );
  assert.ok(
    collapsedExtension.includes(`plan-reviewer's ${CHECK_ID} check enforces both halves.`),
    'expected the enforcement cross-reference'
  );

  const collapsedAll = collapseWs(content);
  assert.ok(
    collapsedAll.includes(`see mandatory extension 7 above; plan-reviewer ${CHECK_ID} enforces this.`),
    'expected the item-12 Level-command note pointing at extension 7, mirroring the extension-5 and extension-6 notes beside it'
  );
});

// ---------------------------------------------------------------------------
// Repo-local complement: the node:test invocation conventions.
// ---------------------------------------------------------------------------

test('docs/context/conventions.md ## Test patterns documents the real node:test summary format and the exit-code-first idiom, replacing its stale "no test suite yet" claim', () => {
  const content = readRepoFile(CONVENTIONS_PATH);

  assert.ok(
    !content.includes('Not applicable — no test suite yet'),
    'expected the stale "no test suite yet" claim to be gone — the repo has self-hosted a node:test corpus since docs/decisions.md [2026-07-12]'
  );

  const block = sliceBetween(content, '## Test patterns', '\n## ');
  assert.ok(block, 'expected an extractable ## Test patterns section');
  const raw = /** @type {string} */ (block);

  assert.ok(
    raw.includes('node --test "scripts/validate/checks/*.test.mjs"'),
    'expected the canonical quoted-glob invocation'
  );
  assert.ok(
    raw.includes('Cannot find module'),
    'expected the bare-directory failure mode to be documented as a module-resolution error, not a test failure'
  );
  assert.ok(raw.includes('ℹ fail 2'), 'expected the DEFAULT reporter summary format');
  assert.ok(raw.includes('# fail 2'), 'expected the TAP reporter summary format shown alongside it for contrast');
  assert.ok(
    raw.includes('already exits non-zero when any test fails'),
    'expected the exit-code-first rule that makes scraping unnecessary'
  );
});

// ---------------------------------------------------------------------------
// The decision record.
// ---------------------------------------------------------------------------

test(`${CHECK_ID}: docs/decisions.md records the [2026-08-04] entry with both rejected alternatives and the DERIVED-count note, positioned before the template comment`, () => {
  const content = readRepoFile(DECISIONS_PATH);

  const heading = `## [2026-08-04] \`${CHECK_ID}\`: a 10th fixed deterministic plan-reviewer check`;
  assert.ok(content.includes(heading), 'expected the new decision heading');

  const block = sliceBetween(content, heading, '<!-- Template for future entries:');
  assert.ok(block, 'expected an extractable decision entry block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  for (const section of ['**Context:**', '**Decision:**', '**Reason:**', '**Areas affected:**']) {
    assert.ok(collapsed.includes(section), `expected the established entry format section ${section}`);
  }

  assert.ok(
    collapsed.includes('Extending `R-COH-VALIDATE-ALWAYS-PASS` was rejected'),
    'expected option (a) to be recorded as considered and rejected, per the entry format\'s rejected-alternatives convention'
  );
  assert.ok(
    collapsed.includes('and stopping there was rejected as structurally unable to close the class'),
    'expected option (c)-alone to be recorded as considered and rejected'
  );
  assert.ok(
    collapsed.includes('It ships anyway, as a complement'),
    'expected the entry to record that the conventions.md half shipped despite being insufficient alone'
  );
  assert.ok(
    collapsed.includes('now DERIVES the expected numerals from the live `#### R-COH-*` heading count'),
    'expected the entry to record that the arithmetic count is derived, not hand-maintained'
  );

  const entryIdx = content.indexOf(heading);
  const templateIdx = content.indexOf('<!-- Template for future entries:');
  assert.ok(entryIdx < templateIdx, 'expected the entry to sit before the template comment');
});
