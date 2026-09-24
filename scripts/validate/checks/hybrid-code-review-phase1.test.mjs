// @ts-check
/**
 * Content-invariant tests for Phase 1 ("Contract and opt-in") of the
 * hybrid-code-review feature — the documentation-only, no-code-behavior
 * subset of PRD AC-1 and AC-8 that Phase 1 actually delivers: the `class`
 * field slot on R-SEM plus the four additive `hyb*` verdict-log fields are
 * DOCUMENTED and registered, but stay entirely unpopulated in every real
 * verdict on disk, and today's worked APPROVED example carries none of them
 * — proving the verdict shape a consumer parses today is unchanged.
 *
 * Companion to scripts/validate/checks/gating-structure.test.mjs, NOT a
 * duplicate of it: gating-structure.test.mjs owns the `hybrid_code_review`
 * SITES entry's pure-function marker tests and the real-wrapper
 * zero-findings confirmation (PRD AC-2 / plan AC-A2 — the mechanism that
 * deterministically enforces the key's declared/never-inferred contract).
 * THIS file owns PRD AC-1 / plan AC-A1 (rubric[] shape stays byte-identical
 * while the key is off/absent) and PRD AC-8 / plan AC-A3 (the four `hyb*`
 * fields' closed-domain registration in the CONSUMERS contract) — properties
 * gating-structure.mjs's own module never touches, since it only reads
 * SKILL.md's per-site marker prose, never code-reviewer.md, methodology.md's
 * body prose, usage-metrics-schema.md, or the real `.code-review.jsonl`
 * corpus.
 *
 * Existing-coverage scan performed before authoring: no prior test file
 * reads plugins/relay/agents/code-reviewer.md's R-SEM `class` slot or its
 * `hyb*` verdict-schema documentation, or
 * plugins/relay/resources/usage-metrics-schema.md's `hyb*` column rows or
 * its `cls` caveat's `code-reviewer` sentence (confirmed by scanning every
 * scripts/validate/checks/*.test.mjs file's target-path constants — no
 * existing file names either path). No `NEW_TEST_REQUIRED` outcome here
 * duplicates any existing test.
 *
 * Why this is the only new coverage this phase needs beyond
 * gating-structure.test.mjs's EXISTING_TEST_UPDATED: per the plan's own
 * Notes section ("Test-file routing"), no `## Files to Change` row in
 * PRPs/plans/hybrid-code-review-phase-1-contract-and-opt-in.plan.md targets
 * a test file, and every Task's own VALIDATE command already exercises the
 * prose-content delta directly via `grep -q`. Those VALIDATE commands ran
 * once, at implementation/code-review time, and are not part of the
 * persisted `node --test` regression corpus; the tests below close that gap
 * so a future edit that silently drops the `class` slot's absent-reads-as-
 * blocking documentation, the `hyb*` field shapes, or the CONSUMERS `cls`
 * caveat correction is caught by `node --test`, not only by one-time review.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed Phase 1 plan:
 * PRPs/plans/hybrid-code-review-phase-1-contract-and-opt-in.plan.md
 *
 * Traceability (PRPs/prds/hybrid-code-review.prd.md Acceptance Criteria —
 * in-scope for phase 1 per the plan's own Acceptance Criteria section:
 * AC-A1 (PRD AC-1), AC-A2 (PRD AC-2, covered by gating-structure.test.mjs,
 * not duplicated here), AC-A3 (PRD AC-8). AC-3 through AC-7, AC-9 through
 * AC-12 describe Phase 2+ dispatch/adjudication/gate behavior that does not
 * exist in this repo yet and are out of this phase's scope per the plan's
 * own Phase Details table):
 *
 *   AC-A1 (PRD AC-1, "Opt-in gate" / "byte-identical in shape") — this
 *     repo's own methodology.md still declares `hybrid_code_review: false`;
 *     the R-SEM `class` slot and the four `hyb*` verdict fields are
 *     documented as unpopulated until a later phase; and neither the real
 *     corpus of `.code-review.jsonl` verdicts nor code-reviewer.md's own
 *     worked APPROVED example carries any of them today.
 *   AC-A3 (PRD AC-8, "Log stays machine-readable for its consumers") — the
 *     four `hyb*` fields are registered in usage-metrics-schema.md's
 *     `verdict` relation with closed-domain shapes (a code, a non-negative
 *     integer, or the `-` sentinel — no free-text column), each marked
 *     non-contractual; and the `cls` caveat is corrected to name
 *     `code-reviewer` as a second (schema-only) producer without changing
 *     the "exactly zero carry a `class` field" measured fact.
 *
 * Run: node --test scripts/validate/checks/hybrid-code-review-phase1.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const METHODOLOGY_PATH = 'docs/context/methodology.md';
const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const SCHEMA_PATH = 'plugins/relay/resources/usage-metrics-schema.md';
const PLANS_DIR = 'PRPs/plans';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Returns the substring of `content` from `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Mirrors
 * scripts/validate/checks/figma-track-phase1.test.mjs's established slicing
 * idiom for extracting one section of a long prose/markdown file.
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

/**
 * Finds the single markdown table row beginning with `| \`<column>\` |` in
 * `content`. Used against usage-metrics-schema.md's field-semantics tables.
 * @param {string} content
 * @param {string} column
 * @returns {string}
 */
function findTableRow(content, column) {
  const line = content.split('\n').find((l) => l.trim().startsWith('| `' + column + '` |'));
  assert.ok(line, `expected a table row starting with "| \`${column}\` |"`);
  return /** @type {string} */ (line);
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1) — the opt-in key defaults off in this repo's own
// dogfooded config; the schema slots this phase documents stay
// entirely unpopulated while it is off.
// ---------------------------------------------------------------------------

test('AC-A1: docs/context/methodology.md declares hybrid_code_review: false in this repo\'s own frontmatter', () => {
  const content = readRepoFile(METHODOLOGY_PATH);
  assert.match(content, /^hybrid_code_review: false$/m);
});

// Updated for hybrid-code-review Phase 3 (test-after, EXISTING_TEST_UPDATED):
// Phase 3's APPROVED plan (Task 1) replaced this paragraph's closing
// sentence — "This phase documents the slot only — no code in this repo
// yet sets `class` on R-SEM." — with a forward-pointer to the adjudication
// steps that now set it, since Phase 3's whole purpose is to make code
// populate `class` on R-SEM. Authorization: PRD row 3 (AC-5, AC-6) plus
// plan Task 1 — the ordinary test-after authorization (this pair owns the
// test files), not a TEST_CONTRACT_DISPUTE arbitration verdict. The
// `class: blocking | advisory` shape and the absent-reads-as-blocking
// compatibility rule are unchanged Phase 1 guarantees and remain asserted
// below, unweakened.
test('AC-A1: code-reviewer.md documents the R-SEM `class` field slot with the absent-reads-as-blocking compatibility rule preserved, and a forward-pointer to the Phase 3 adjudication steps that now set it', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  assert.ok(content.includes('class: blocking | advisory'), 'expected the class field slot shape to be documented on R-SEM');
  assert.ok(
    content.includes('an absent') && content.includes('reads as'),
    'expected the absent-class-reads-as-blocking compatibility rule to be documented',
  );
  assert.ok(
    content.includes('FINAL only after'),
    'expected R-SEM\'s paragraph to state its passed value is FINAL only after the adjudication steps run',
  );
  assert.ok(
    content.includes('adjudication steps (9-11)'),
    'expected R-SEM\'s paragraph to forward-point to the hybrid pass section\'s adjudication steps 9-11 (hybrid-code-review Phase 3), which now set `class` on R-SEM, replacing the Phase-1 "no code sets class yet" sentence',
  );
});

test('AC-A1: code-reviewer.md\'s own worked APPROVED example verdict carries none of the four optional hyb* fields — today\'s verdict shape is unchanged', () => {
  const content = readRepoFile(CODE_REVIEWER_PATH);
  const block = sliceBetween(content, '### Standard-mode APPROVED entry', '### Standard-mode CHANGES_REQUESTED entry');
  assert.ok(block, 'expected to find the "Standard-mode APPROVED entry" example section');
  assert.ok(!/** @type {string} */(block).includes('"hyb"'), 'the worked APPROVED example must not carry a "hyb" field yet');
  assert.ok(!/** @type {string} */(block).includes('"hyb_lvl"'), 'the worked APPROVED example must not carry a "hyb_lvl" field yet');
  assert.ok(!/** @type {string} */(block).includes('"hyb_n"'), 'the worked APPROVED example must not carry a "hyb_n" field yet');
  assert.ok(!/** @type {string} */(block).includes('"hyb_ms"'), 'the worked APPROVED example must not carry a "hyb_ms" field yet');
  assert.ok(
    /** @type {string} */(block).includes('carries none of the four optional `hyb*` fields'),
    'expected the example\'s own explanatory sentence stating it predates the hyb* fields',
  );
});

test('AC-A1: no real .code-review.jsonl verdict on disk carries any hyb* field or a `class` value on R-SEM yet — the schema slots documented this phase stay entirely unpopulated in the real corpus', () => {
  const dir = resolve(PLANS_DIR);
  const files = readdirSync(dir).filter((f) => f.endsWith('.code-review.jsonl'));
  assert.ok(files.length > 0, 'expected at least one real .code-review.jsonl file to check');

  let checked = 0;
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf-8');
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      checked++;
      assert.equal(obj.hyb, undefined, `${file}: unexpected "hyb" field on a Phase 1 verdict`);
      assert.equal(obj.hyb_lvl, undefined, `${file}: unexpected "hyb_lvl" field on a Phase 1 verdict`);
      assert.equal(obj.hyb_n, undefined, `${file}: unexpected "hyb_n" field on a Phase 1 verdict`);
      assert.equal(obj.hyb_ms, undefined, `${file}: unexpected "hyb_ms" field on a Phase 1 verdict`);
      if (Array.isArray(obj.rubric)) {
        const semRow = obj.rubric.find((r) => r && r.id === 'R-SEM');
        if (semRow) {
          assert.equal(semRow.class, undefined, `${file}: unexpected "class" value on an R-SEM row before Phase 3 exists`);
        }
      }
    }
  }
  assert.ok(checked > 0, 'expected at least one real verdict line to check');
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-8) — the four additive verdict-log fields are registered in
// usage-metrics-schema.md's CONSUMERS contract with closed-domain shapes,
// and the `cls` caveat correctly names code-reviewer as a second, still-
// unpopulated producer.
// ---------------------------------------------------------------------------

test('AC-A3: usage-metrics-schema.md registers `hyb` with domain `0` | `1` | `-`, non-contractual, populated only from Phase 2+', () => {
  const content = readRepoFile(SCHEMA_PATH);
  const row = findTableRow(content, 'hyb');
  assert.ok(row.includes('`0` \\| `1` \\| `-`'), 'expected the hyb column\'s domain to be `0` | `1` | `-`');
  assert.ok(row.includes('Phase 2+ of `hybrid-code-review`'), 'expected the hyb column to note it is populated only from Phase 2+');
  assert.match(row, /\|\s*no\s*\|\s*$/, 'expected the hyb column to be marked non-contractual ("no")');
});

test('AC-A3: usage-metrics-schema.md registers `hyb_lvl` with a code | `-` domain, non-contractual', () => {
  const content = readRepoFile(SCHEMA_PATH);
  const row = findTableRow(content, 'hyb_lvl');
  assert.ok(row.includes('code \\| `-`'), 'expected the hyb_lvl column\'s domain to be code | `-`');
  assert.match(row, /\|\s*no\s*\|\s*$/, 'expected the hyb_lvl column to be marked non-contractual ("no")');
});

test('AC-A3: usage-metrics-schema.md registers `hyb_n` and `hyb_ms` with a non-negative-integer | `-` domain, non-contractual', () => {
  const content = readRepoFile(SCHEMA_PATH);
  for (const col of ['hyb_n', 'hyb_ms']) {
    const row = findTableRow(content, col);
    assert.ok(row.includes('non-negative integer \\| `-`'), `expected the ${col} column's domain to be non-negative integer | \`-\``);
    assert.match(row, /\|\s*no\s*\|\s*$/, `expected the ${col} column to be marked non-contractual ("no")`);
  }
});

test('AC-A3: usage-metrics-schema.md\'s `cls` caveat now also documents code-reviewer\'s R-SEM row as a schema-only, still-unpopulated second producer', () => {
  const content = readRepoFile(SCHEMA_PATH);
  assert.ok(
    content.includes('schema-only, not yet populated) on `code-reviewer`\'s R-SEM row'),
    'expected the cls caveat to name code-reviewer\'s R-SEM row as a schema-only producer',
  );
  assert.ok(
    content.includes('sets the value on R-SEM until a later phase'),
    'expected the cls caveat to state no code sets the value on R-SEM yet',
  );
});

test('AC-A3: usage-metrics-schema.md\'s `cls` caveat scopes its "exactly zero carry a class field" count to code-review.jsonl and test-write-review.jsonl, and the count remains accurate', () => {
  const content = readRepoFile(SCHEMA_PATH);
  assert.ok(
    content.includes('This count is scoped to `code-review.jsonl` and'),
    'expected the cls caveat to scope its zero-count to code-review.jsonl and test-write-review.jsonl',
  );
  assert.ok(
    content.includes('`test-write-review.jsonl` as they stand'),
    'expected the cls caveat to name test-write-review.jsonl as the second scoped source',
  );
  assert.ok(
    content.includes('remains') && content.includes('accurate today'),
    'expected the cls caveat to state the zero-count remains accurate as of this phase',
  );
});
