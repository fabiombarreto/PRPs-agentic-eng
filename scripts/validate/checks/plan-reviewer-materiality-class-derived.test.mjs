// @ts-check
/**
 * DERIVED (not hardcoded) regression test for
 * plugins/relay/agents/plan-reviewer.md's materiality-class partition —
 * the `## Materiality classes (blocking / advisory)` section's partition
 * table, the per-check `**Class:**` declaration line under every
 * `### R<n>` (R1..R8) and `#### R-COH-*` heading, the K=5 per-finding id
 * taxonomy's ` (class: ...)` annotations, the `### Logging discipline`
 * "Per-class split" paragraph, and the `## review.jsonl format` worked
 * example's per-row `class` field — all introduced by Phase 1 of
 * PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md).
 *
 * This file is deliberately NOT one more numeral/id snapshot, mirroring
 * plan-reviewer-rubric-arithmetic-derived.test.mjs's own stated design
 * principle (see that file's header comment): it DERIVES its expectations
 * from the live file's own independently-authored declarations — the
 * partition table, the per-heading `**Class:**` lines, and the K=5 taxonomy
 * annotations — and cross-checks that all three agree with each other,
 * rather than hardcoding a class value or a row count that would go stale
 * the next time a check is added, removed, or reclassified. Adding an Nth
 * check (with its own `**Class:**` line and its own partition-table row)
 * requires NO edit to this file — it will simply keep passing (when the
 * three declarations are kept consistent) or fail loudly (when they are
 * not), which is exactly the property a hand-maintained snapshot cannot
 * offer. Heading detection deliberately matches on the id token only (not
 * the trailing " — <description>" prose), the same convention
 * plan-reviewer-rubric-arithmetic-derived.test.mjs's own heading regex
 * uses, so a future heading whose description wording changes (or a
 * differently-punctuated separator) does not silently drop out of the
 * derived count.
 *
 * Source plan (PRD mode — dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-1-class-taxonomy-gating.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file that already touches
 * plugins/relay/agents/plan-reviewer.md, plus a corpus-wide search for the
 * literal strings "Materiality classes", "blocking-classed",
 * "advisory-classed", `"class": "blocking"`, `"class": "advisory"`,
 * "Escalation valve", `escalated": true`, and "Non-blocking advisories"):
 * zero matches anywhere in the 45-file corpus outside the three files this
 * same session's own Half 1 fixed for the additive `class` field's byte-shape
 * ripple (plan-reviewer-action-validate-contradiction-check.test.mjs,
 * plan-reviewer-validate-pattern-ungrounded-check.test.mjs,
 * plan-reviewer-validate-search-ambiguous-check.test.mjs — none of which
 * asserts anything about the partition table, the Class declaration lines,
 * or the K=5 taxonomy annotations; their fixes only restore byte-adjacency
 * pins on specific worked-example rows). This is virgin territory —
 * NEW_TEST_REQUIRED throughout this file.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (D8 Mutation c ran; code review APPROVED — see
 * PRPs/reports/plan-review-materiality/phase-1/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`, dual-labelled):
 *   AC-A3 (PRD AC-3) — "Given any emitted verdict, when its jsonl line is
 *     inspected, then every rubric row carries a `class` field whose value
 *     matches the partition table declared in `## Materiality classes`,
 *     and the Logging-discipline prose derives per-class counts consistent
 *     with the live check headings." Every test below is NEW_TEST_REQUIRED
 *     coverage of this one AC, decomposed into its independently-checkable
 *     sub-properties: per-heading Class-line/table agreement (R1..R8 and
 *     `#### R-COH-*`), K=5-taxonomy/table agreement, partition-table
 *     completeness (no orphan or missing row), the catch-all's advisory
 *     class, the worked jsonl example's per-row class-field totality and
 *     table agreement, and the Logging-discipline "Per-class split"
 *     paragraph's derived counts and enumerated ids.
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-materiality-class-derived.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';

// The 4 conditional (figma_track-gated, zero-emission-capable) #### R-COH-*
// checks — named explicitly, mirroring plan-reviewer-rubric-arithmetic-derived.test.mjs's
// own CONDITIONAL_CHECK_IDS constant and its documented rationale: this is
// the one deliberate place a human must extend if a 5th conditional check
// is ever added. Excluded from the "baseline (non-Figma)" derivations below
// because they are absent from a non-Figma worked example and from the
// Logging-discipline "Per-class split" paragraph's baseline enumeration.
const CONDITIONAL_CHECK_IDS = [
  'R-COH-DESIGN-SOURCE-MISSING',
  'R-COH-DESIGN-GROUNDED',
  'R-COH-VISUAL-SCOPE-PURITY',
  'R-COH-SENTINEL-RESOLUTION-MISSING',
];

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

/**
 * Finds every `### R<digits>` (level=3) or `#### R-COH-<ID>` (level=4)
 * heading id, matching on the id token only — NOT the trailing
 * " — <description>" prose — so a future rewording of a heading's
 * description does not silently drop it from the derived count. Returns
 * each match's id plus the index of the end of that heading's own text
 * LINE (the position immediately before its trailing `\n`), independently
 * computed via `indexOf('\n', ...)` rather than the regex match length, so
 * the trailing-prose independence holds for the class-line lookup too.
 * @param {string} content
 * @param {3 | 4} level
 * @returns {{ id: string, lineEnd: number }[]}
 */
function findHeadings(content, level) {
  const re = level === 3 ? /^### (R\d+)\b/gm : /^#### (R-COH-[A-Z-]+)\b/gm;
  return [...content.matchAll(re)].map((m) => {
    const idx = /** @type {number} */ (m.index);
    const nlIdx = content.indexOf('\n', idx);
    return { id: m[1], lineEnd: nlIdx === -1 ? content.length : nlIdx };
  });
}

/**
 * Returns the `blocking`/`advisory` value of the first non-blank line
 * following `fromIdx`, when that line is exactly `**Class:** blocking` or
 * `**Class:** advisory`; otherwise returns null (no Class line found as the
 * section's first body content).
 * @param {string} content
 * @param {number} fromIdx
 * @returns {'blocking' | 'advisory' | null}
 */
function firstClassLineAfter(content, fromIdx) {
  const rest = content.slice(fromIdx);
  const lines = rest.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    const m = trimmed.match(/^\*\*Class:\*\* (blocking|advisory)$/);
    return m ? /** @type {'blocking' | 'advisory'} */ (m[1]) : null;
  }
  return null;
}

/**
 * Extracts the live `## Materiality classes` partition table as an
 * id -> class Map, scoped between the table header and the
 * "### Future checks default to advisory" subsection that follows it.
 * @param {string} content
 * @returns {Map<string, string>}
 */
function extractPartitionTable(content) {
  const tableBlock = sliceBetween(content, '| Check id | Class | Rationale |', '### Future checks default to advisory');
  assert.ok(tableBlock, 'expected an extractable ## Materiality classes partition table');
  return new Map(
    [...(/** @type {string} */ (tableBlock)).matchAll(/^\| (R[A-Z0-9-]+) \| (blocking|advisory) \|/gm)].map((m) => [m[1], m[2]])
  );
}

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — every ### R<n> (R1..R8) base-rubric heading's own
// **Class:** declaration agrees with its partition-table row.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3), DERIVED: every ### R<n> base-rubric heading (R1..R8) is immediately followed, as its first non-blank body line, by a **Class:** declaration agreeing with its own row in the ## Materiality classes partition table', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const headings = findHeadings(content, 3);

  assert.equal(
    headings.length,
    8,
    `expected exactly 8 base "### R<n>" rubric headings (R1..R8), found ${headings.length}: ${headings.map((h) => h.id).join(', ')}`
  );
  assert.deepEqual(
    headings.map((h) => h.id),
    ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'],
    'expected R1..R8 present in order with no gaps or duplicates'
  );

  const tableRows = extractPartitionTable(content);

  for (const h of headings) {
    const declaredClass = firstClassLineAfter(content, h.lineEnd);
    assert.ok(declaredClass, `expected "### ${h.id}" to be immediately followed by a "**Class:** blocking|advisory" declaration line`);
    assert.ok(tableRows.has(h.id), `expected the partition table to carry a row for ${h.id}`);
    assert.equal(
      declaredClass,
      tableRows.get(h.id),
      `expected ${h.id}'s own **Class:** declaration ("${declaredClass}") to agree with its partition-table row ("${tableRows.get(h.id)}")`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — every #### R-COH-* deterministic-check heading's own
// **Class:** declaration agrees with its partition-table row.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3), DERIVED: every live #### R-COH-* deterministic-check heading is immediately followed, as its first non-blank body line, by a **Class:** declaration agreeing with its own row in the ## Materiality classes partition table', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const headings = findHeadings(content, 4);

  assert.ok(headings.length > 0, 'expected at least one #### R-COH-* deterministic-check heading');
  assert.equal(new Set(headings.map((h) => h.id)).size, headings.length, 'expected no duplicate #### R-COH-* heading ids');

  const tableRows = extractPartitionTable(content);

  for (const h of headings) {
    const declaredClass = firstClassLineAfter(content, h.lineEnd);
    assert.ok(declaredClass, `expected "#### ${h.id}" to be immediately followed by a "**Class:** blocking|advisory" declaration line`);
    assert.ok(tableRows.has(h.id), `expected the partition table to carry a row for ${h.id}`);
    assert.equal(
      declaredClass,
      tableRows.get(h.id),
      `expected ${h.id}'s own **Class:** declaration ("${declaredClass}") to agree with its partition-table row ("${tableRows.get(h.id)}")`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — every K=5 per-finding taxonomy id's (class: ...)
// annotation agrees with its partition-table row.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3), DERIVED: every K=5 per-finding-id-taxonomy entry\'s (class: ...) annotation agrees with its own row in the ## Materiality classes partition table', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const k5Block = sliceBetween(content, 'Per-finding `id` taxonomy', 'Per-finding `reason` discipline');
  assert.ok(k5Block, 'expected an extractable K=5 per-finding id taxonomy block');
  const k5Entries = [...(/** @type {string} */ (k5Block)).matchAll(/`(R-COH-[A-Z-]+)` \(class: (blocking|advisory)\)/g)].map((m) => ({
    id: m[1],
    class: m[2],
  }));
  assert.equal(
    k5Entries.length,
    5,
    `expected exactly 5 K=5 per-finding taxonomy ids each carrying a (class: ...) annotation, found ${k5Entries.length}: ${k5Entries.map((e) => e.id).join(', ')}`
  );

  const tableRows = extractPartitionTable(content);

  for (const entry of k5Entries) {
    assert.ok(tableRows.has(entry.id), `expected the partition table to carry a row for K=5 taxonomy id ${entry.id}`);
    assert.equal(
      entry.class,
      tableRows.get(entry.id),
      `expected K=5 taxonomy id ${entry.id}'s (class: ${entry.class}) annotation to agree with its partition-table row ("${tableRows.get(entry.id)}")`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — partition-table completeness: no orphan row, no
// missing row, across all three independently-authored id sources.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3), DERIVED: the ## Materiality classes partition table contains exactly one row per known id — the 8 base rubric ids, every live #### R-COH-* deterministic-check heading, and every K=5 taxonomy id — with no orphan row and no duplicate', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const baseIds = findHeadings(content, 3).map((h) => h.id);
  const cohHeadingIds = findHeadings(content, 4).map((h) => h.id);

  const k5Block = sliceBetween(content, 'Per-finding `id` taxonomy', 'Per-finding `reason` discipline');
  assert.ok(k5Block, 'expected an extractable K=5 per-finding id taxonomy block');
  const k5Ids = [...(/** @type {string} */ (k5Block)).matchAll(/`(R-COH-[A-Z-]+)` \(class: (?:blocking|advisory)\)/g)].map((m) => m[1]);

  for (const id of k5Ids) {
    assert.ok(
      !cohHeadingIds.includes(id),
      `expected K=5 taxonomy id ${id} to be distinct from the deterministic #### R-COH-* headings — a K=5-judged finding class and a deterministic check are always different checks in this rubric`
    );
  }

  const expectedIds = new Set([...baseIds, ...cohHeadingIds, ...k5Ids]);

  const tableBlock = sliceBetween(content, '| Check id | Class | Rationale |', '### Future checks default to advisory');
  assert.ok(tableBlock, 'expected an extractable partition table');
  const tableIds = [...(/** @type {string} */ (tableBlock)).matchAll(/^\| (R[A-Z0-9-]+) \| (?:blocking|advisory) \|/gm)].map((m) => m[1]);

  assert.equal(new Set(tableIds).size, tableIds.length, 'expected no duplicate ids in the partition table');
  assert.equal(
    tableIds.length,
    expectedIds.size,
    `expected the partition table to carry exactly ${expectedIds.size} rows (${baseIds.length} base + ${cohHeadingIds.length} deterministic R-COH-* + ${k5Ids.length} K=5-only ids), found ${tableIds.length}`
  );

  for (const id of expectedIds) {
    assert.ok(tableIds.includes(id), `expected the partition table to carry a row for ${id}, but no such row was found`);
  }
  for (const id of tableIds) {
    assert.ok(
      expectedIds.has(id),
      `expected partition-table row "${id}" to correspond to a live base-rubric heading, a live #### R-COH-* heading, or a K=5 taxonomy id — found an orphan row mapping to none of these`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — catch-all spot-check, matching the source PRD's
// explicit "catch-all stays advisory" decision and this plan's own Level 2
// gate grep.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3): the catch-all R-COH-OTHER-INTERNAL-CONTRADICTION is classed advisory in both the partition table and its own K=5 taxonomy annotation', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const tableBlock = sliceBetween(content, '| Check id | Class | Rationale |', '### Future checks default to advisory');
  assert.ok(tableBlock, 'expected an extractable partition table');
  assert.ok(
    /** @type {string} */ (tableBlock).includes('| R-COH-OTHER-INTERNAL-CONTRADICTION | advisory |'),
    'expected the catch-all row classed advisory in the partition table'
  );

  const k5Block = sliceBetween(content, 'Per-finding `id` taxonomy', 'Per-finding `reason` discipline');
  assert.ok(k5Block, 'expected an extractable K=5 taxonomy block');
  assert.ok(
    /** @type {string} */ (k5Block).includes('`R-COH-OTHER-INTERNAL-CONTRADICTION` (class: advisory)'),
    "expected the catch-all's K=5 taxonomy annotation to also read (class: advisory)"
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — the worked ## review.jsonl format example: every row
// carries a class field, row count matches the live baseline heading
// count, and every row's class agrees with its partition-table entry.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3), DERIVED: the ## review.jsonl format worked example\'s rubric[] array carries a class field on every row, its row count matches the live baseline (non-Figma) heading count, and every row\'s class agrees with its own partition-table entry', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const jsonlBlock = sliceBetween(content, '"rubric": [', '"action": "final_flip"');
  assert.ok(jsonlBlock, 'expected an extractable worked-example rubric[] JSON block');
  const raw = /** @type {string} */ (jsonlBlock);

  const ids = [...raw.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1]);
  const classes = [...raw.matchAll(/"class": "(blocking|advisory)"/g)].map((m) => m[1]);

  assert.equal(
    classes.length,
    ids.length,
    `expected every one of the ${ids.length} worked-example rubric[] rows to carry a "class" field, found ${classes.length} class fields for ${ids.length} ids`
  );

  const baseIds = findHeadings(content, 3).map((h) => h.id);
  const cohHeadingIds = findHeadings(content, 4).map((h) => h.id);
  const baselineCohIds = cohHeadingIds.filter((id) => !CONDITIONAL_CHECK_IDS.includes(id));
  const expectedRowCount = baseIds.length + baselineCohIds.length;

  assert.equal(
    ids.length,
    expectedRowCount,
    `expected the baseline (non-Figma) worked example to carry exactly ${expectedRowCount} rows (${baseIds.length} base rubric + ${baselineCohIds.length} live baseline deterministic #### R-COH-* checks — the 4 figma_track-conditional checks are zero-emission in a non-Figma example), found ${ids.length}: ${ids.join(', ')}`
  );

  const tableRows = extractPartitionTable(content);
  ids.forEach((id, i) => {
    assert.ok(tableRows.has(id), `expected worked-example row id "${id}" to have a corresponding partition-table row`);
    assert.equal(
      classes[i],
      tableRows.get(id),
      `expected worked-example row "${id}"'s class ("${classes[i]}") to agree with its partition-table row ("${tableRows.get(id)}")`
    );
  });
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-3) — the ### Logging discipline "Per-class split" paragraph
// derives per-class counts consistent with the live check headings (the
// exact clause AC-A3's own text names).
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-3), DERIVED: the ### Logging discipline "Per-class split (baseline, non-Figma case)" paragraph\'s blocking/advisory deterministic-check counts and enumerated ids agree with the live partition table (excluding the 4 known figma_track-conditional checks)', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const cohHeadingIds = findHeadings(content, 4).map((h) => h.id);
  const baselineDeterministicIds = cohHeadingIds.filter((id) => !CONDITIONAL_CHECK_IDS.includes(id));

  const tableRows = extractPartitionTable(content);

  const derivedBlockingIds = baselineDeterministicIds.filter((id) => tableRows.get(id) === 'blocking');
  const derivedAdvisoryIds = baselineDeterministicIds.filter((id) => tableRows.get(id) === 'advisory');
  assert.equal(
    derivedBlockingIds.length + derivedAdvisoryIds.length,
    baselineDeterministicIds.length,
    'expected every baseline deterministic R-COH-* id to be classed either blocking or advisory in the partition table — none unclassified'
  );

  const block = sliceBetween(content, '**Per-class split (baseline, non-Figma case).**', '### Anti-pattern (specific to this layer)');
  assert.ok(block, 'expected an extractable "Per-class split (baseline, non-Figma case)" paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(`plus the ${derivedBlockingIds.length} blocking-classed baseline deterministic R-COH-* rows`),
    `expected the paragraph to cite ${derivedBlockingIds.length} blocking-classed baseline deterministic R-COH-* rows (derived from the live partition table), but it did not`
  );
  assert.ok(
    collapsed.includes(`The advisory-classed rows are the ${derivedAdvisoryIds.length} advisory-classed baseline deterministic checks`),
    `expected the paragraph to cite ${derivedAdvisoryIds.length} advisory-classed baseline deterministic checks (derived from the live partition table), but it did not`
  );

  for (const id of derivedBlockingIds) {
    assert.ok(collapsed.includes(`\`${id}\``), `expected the blocking-classed enumeration to name ${id} verbatim`);
  }
  for (const id of derivedAdvisoryIds) {
    assert.ok(collapsed.includes(`\`${id}\``), `expected the advisory-classed enumeration to name ${id} verbatim`);
  }

  assert.ok(
    collapsed.includes(`The ${CONDITIONAL_CHECK_IDS.length} \`figma_track\`-conditional`),
    `expected the paragraph to cite ${CONDITIONAL_CHECK_IDS.length} figma_track-conditional deterministic rows`
  );
  for (const id of CONDITIONAL_CHECK_IDS) {
    assert.ok(collapsed.includes(`\`${id}\``), `expected the figma_track-conditional enumeration to name ${id} verbatim`);
  }
  assert.ok(
    collapsed.includes('are all blocking-classed when'),
    'expected the paragraph to state the 4 conditional rows are all blocking-classed when they emit'
  );
});
