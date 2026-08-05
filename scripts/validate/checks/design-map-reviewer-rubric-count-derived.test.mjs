// @ts-check
/**
 * DERIVED (not hardcoded) regression test for
 * plugins/relay/agents/design-map-reviewer.md's `R-DM<n>` rubric-count
 * self-consistency.
 *
 * Motivation (PRPs/prds/figma-quota-resilience.prd.md AC-13): "Given the
 * `R-DM` (or `R-DS`) rubric gains or loses an item, when the validation
 * corpus runs, then the rubric-count assertion re-derives the count from a
 * live grep of `### R-DM<n>` / `### R-DS<n>` headings and fails loudly on
 * drift, rather than passing against a hardcoded literal." Phase 4 of that
 * PRD (figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md,
 * Task 9) grew this file's rubric from six items (R-DM1-R-DM6) to seven
 * (R-DM1-R-DM7), breaking a hardcoded-literal assertion in
 * figma-track-phase3.test.mjs (fixed the same session as
 * EXISTING_TEST_UPDATED — see that file's own Lifecycle-update comment).
 * That plan's own Task 9 site inventory records THREE consecutive review
 * rounds each shipping a "six→seven" prose regex that looked complete and
 * missed real sites (line-wrapped ids, a JSON-syntax row) — the same defect
 * class `plan-reviewer-rubric-arithmetic-derived.test.mjs`'s own docblock
 * documents for a sibling rubric. This file is this repo's second instance
 * of that DERIVED strategy, applied to `R-DM<n>` instead of `R-COH-*`.
 *
 * Design constraint this file exists to satisfy: re-deriving BOTH sides of
 * a comparison from the same live source is vacuous (`count === count`
 * always passes and proves nothing). Every assertion below instead derives
 * ONE side — the expected rubric size `N` — from the live
 * `### R-DM<n>` heading count, and compares it against the OTHER,
 * independently-authored side: what the file's own prose/JSON actually
 * states its size to be, at roughly a dozen structurally distinct sites
 * (frontmatter, opening prose, both Hard Constraints, the rubric heading,
 * Step 2's heading and walk sentence, the accumulate/verdict-branch/re-run
 * sentences, the jsonl worked example, the format-spec closing, and both
 * anti-patterns bullets). A future contributor who adds `### R-DM8` without
 * updating every one of these sites gets a loud, specific failure naming
 * exactly which site still disagrees — verified by reasoning through the
 * drift scenario before shipping this file: with only the heading added,
 * every `(\w+)`/`(\d+)` capture below still reads "seven"/`7` from the
 * unedited prose, so `assert.equal(..., expectedWord)` /
 * `assert.equal(..., N)` fails at the FIRST unedited site, not silently.
 *
 * Existing-coverage scan performed before authoring: no existing test in
 * scripts/validate/checks/*.test.mjs re-derives design-map-reviewer.md's
 * rubric count from live headings — figma-track-phase3.test.mjs's own
 * assertions pin exact hardcoded phrases (EXISTING_TEST_UPDATED, not
 * DERIVED) and do not perform this file's dynamic self-consistency check.
 * NEW_TEST_REQUIRED, not EXISTING_TEST_COVERS.
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md AC-13 (also AC-A6 of
 * the source plan below).
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md
 *
 * Run: node --test scripts/validate/checks/design-map-reviewer-rubric-count-derived.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REVIEWER_PATH = 'plugins/relay/agents/design-map-reviewer.md';

// Small, closed word-form table. If a future `R-DM<n>` count ever exceeds
// this ceiling, numberToWord() throws loudly rather than silently returning
// undefined — the deliberate place a human must extend this file, mirroring
// plan-reviewer-rubric-arithmetic-derived.test.mjs's own CONDITIONAL_CHECK_IDS
// extension point.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/**
 * @param {number} n
 * @returns {string}
 */
function numberToWord(n) {
  if (!Number.isInteger(n) || n < 0 || n >= NUMBER_WORDS.length) {
    throw new Error(
      `numberToWord: ${n} is outside the supported 0-${NUMBER_WORDS.length - 1} range — extend NUMBER_WORDS in this file before adding an R-DM<n> beyond this ceiling`
    );
  }
  return NUMBER_WORDS[n];
}

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so a multi-line prose sentence does not depend on exactly
 * where the source file happens to wrap it.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts every `R-DM<n>` id number found inside `text`, in order, as ints.
 * @param {string} text
 * @returns {number[]}
 */
function extractIds(text) {
  return [...text.matchAll(/R-DM(\d+)/g)].map((m) => Number(m[1]));
}

test("DERIVED: design-map-reviewer.md's R-DM<n> rubric count is self-consistent across every site that states its own size — re-derived from live ### R-DM<n> headings, not hardcoded, so a future heading addition/removal fails loudly instead of silently drifting", () => {
  const content = readRepoFile(REVIEWER_PATH);
  const collapsed = collapseWs(content);

  // 1. Derive N from the LIVE heading count — the single source of truth
  //    every other check below is compared against.
  const headingMatches = [...content.matchAll(/^### R-DM(\d+)/gm)];
  const N = headingMatches.length;
  assert.ok(N > 0, 'expected at least one ### R-DM<n> heading in design-map-reviewer.md');

  const headingIds = headingMatches.map((m) => Number(m[1]));
  assert.deepEqual(
    headingIds,
    Array.from({ length: N }, (_, i) => i + 1),
    `expected ### R-DM<n> headings to be exactly R-DM1..R-DM${N} in order with no gaps/duplicates, found ids [${headingIds.join(', ')}]`
  );

  const expectedWord = numberToWord(N);

  // 2. Frontmatter description.
  {
    const m = content.match(/using a (\w+)-item rubric \(R-DM1-R-DM(\d+), no short-circuit\)/);
    assert.ok(m, 'expected the frontmatter description to state "<word>-item rubric (R-DM1-R-DM<n>, no short-circuit)"');
    assert.equal(
      m[1].toLowerCase(),
      expectedWord,
      `frontmatter description says "${m[1]}-item" but ${N} live headings implies "${expectedWord}-item"`
    );
    assert.equal(Number(m[2]), N, `frontmatter description cites R-DM1-R-DM${m[2]} but ${N} live headings implies R-DM1-R-DM${N}`);
  }

  // 3. Opening body prose.
  {
    const m = collapsed.match(/against a (\w+)-item rubric \(`R-DM1` through `R-DM(\d+)`\)/);
    assert.ok(m, 'expected the opening body prose to state "against a <word>-item rubric (`R-DM1` through `R-DM<n>`)"');
    assert.equal(m[1].toLowerCase(), expectedWord, `opening prose says "${m[1]}-item" but ${N} live headings implies "${expectedWord}-item"`);
    assert.equal(Number(m[2]), N, `opening prose cites through R-DM${m[2]} but ${N} live headings implies R-DM${N}`);
  }

  // 4. Hard Constraint 1's short-circuit sentence.
  {
    const m = collapsed.match(/every `R-DM1`\.\.`R-DM(\d+)` item is evaluated/);
    assert.ok(m, 'expected Hard Constraint 1 to state "every `R-DM1`..`R-DM<n>` item is evaluated"');
    assert.equal(Number(m[1]), N, `Hard Constraint 1 cites R-DM1..R-DM${m[1]} but ${N} live headings implies R-DM1..R-DM${N}`);
  }

  // 5. Hard Constraint 2 — the "run all" range sentence and the exhaustive
  //    enumerated id list.
  {
    const rangeMatch = collapsed.match(/run all R-DM1\.\.R-DM(\d+) every run/);
    assert.ok(rangeMatch, 'expected Hard Constraint 2 to state "run all R-DM1..R-DM<n> every run"');
    assert.equal(
      Number(rangeMatch[1]),
      N,
      `Hard Constraint 2's "run all" sentence cites R-DM1..R-DM${rangeMatch[1]} but ${N} live headings implies R-DM1..R-DM${N}`
    );

    const idListMatch = collapsed.match(/MUST contain exactly (\w+) objects with ids ((?:`R-DM\d+`,?\s*)+)— one of each, no duplicates/);
    assert.ok(idListMatch, 'expected Hard Constraint 2 to state "MUST contain exactly <word> objects with ids `R-DM1`, ... — one of each, no duplicates"');
    assert.equal(
      idListMatch[1].toLowerCase(),
      expectedWord,
      `Hard Constraint 2 says "exactly ${idListMatch[1]} objects" but ${N} live headings implies "exactly ${expectedWord} objects"`
    );
    const enumeratedIds = extractIds(idListMatch[2]);
    assert.deepEqual(
      enumeratedIds,
      headingIds,
      `Hard Constraint 2's enumerated id list [${enumeratedIds.join(', ')}] does not match the live heading ids [${headingIds.join(', ')}]`
    );
  }

  // 6. Rubric section heading + intro sentence.
  {
    const m = collapsed.match(/## The R-DM1\.\.R-DM(\d+) Rubric Evaluate all (\w+) items on every run\./);
    assert.ok(m, 'expected "## The R-DM1..R-DM<n> Rubric" followed by "Evaluate all <word> items on every run."');
    assert.equal(Number(m[1]), N, `rubric heading cites R-DM1..R-DM${m[1]} but ${N} live headings implies R-DM1..R-DM${N}`);
    assert.equal(m[2].toLowerCase(), expectedWord, `rubric intro says "all ${m[2]} items" but ${N} live headings implies "all ${expectedWord} items"`);
  }

  // 7. Step 2 heading + "Walk" sentence.
  {
    const m = collapsed.match(/Run the rubric \(R-DM1\.\.R-DM(\d+)\) Walk `R-DM1` through `R-DM(\d+)` in document order/);
    assert.ok(m, 'expected the Step 2 heading + "Walk `R-DM1` through `R-DM<n>` in document order" sentence');
    assert.equal(Number(m[1]), N, `Step 2 heading cites R-DM1..R-DM${m[1]} but ${N} live headings implies R-DM1..R-DM${N}`);
    assert.equal(Number(m[2]), N, `Step 2's "Walk" sentence cites through R-DM${m[2]} but ${N} live headings implies R-DM${N}`);
  }

  // 8. "Accumulate all <word> results..." sentence.
  {
    const m = collapsed.match(/Accumulate all (\w+) results into the `rubric` array\./);
    assert.ok(m, 'expected "Accumulate all <word> results into the `rubric` array."');
    assert.equal(
      m[1].toLowerCase(),
      expectedWord,
      `accumulate sentence says "all ${m[1]} results" but ${N} live headings implies "all ${expectedWord} results"`
    );
  }

  // 9. Step 3 APPROVED-path branch sentence.
  {
    const m = collapsed.match(/\*\*If all (\w+) items pass \(APPROVED path\):\*\*/);
    assert.ok(m, 'expected "**If all <word> items pass (APPROVED path):**"');
    assert.equal(
      m[1].toLowerCase(),
      expectedWord,
      `Step 3's APPROVED-path sentence says "all ${m[1]} items pass" but ${N} live headings implies "all ${expectedWord} items pass"`
    );
  }

  // 10. Step 4's re-run sentence.
  {
    const m = collapsed.match(/Re-run the R-DM1\.\.R-DM(\d+) rubric fresh/);
    assert.ok(m, 'expected Step 4 to state "Re-run the R-DM1..R-DM<n> rubric fresh"');
    assert.equal(Number(m[1]), N, `Step 4's re-run sentence cites R-DM1..R-DM${m[1]} but ${N} live headings implies R-DM1..R-DM${N}`);
  }

  // 11. APPROVED jsonl entry-shape sentence.
  {
    const m = collapsed.match(/all (\w+) items with `passed: true`, `action: "final_flip"`/);
    assert.ok(m, 'expected the APPROVED entry-shape sentence "all <word> items with `passed: true`, `action: \\"final_flip\\"`"');
    assert.equal(m[1].toLowerCase(), expectedWord, `entry-shape sentence says "all ${m[1]} items" but ${N} live headings implies "all ${expectedWord} items"`);
  }

  // 12. jsonl worked-example row count — the JSON-syntax site no prose regex
  //     above can see (per the plan's own Task 9 history, this is the exact
  //     site three prior review rounds each missed).
  {
    const rows = [...content.matchAll(/"id":\s*"R-DM(\d+)"/g)].map((m) => Number(m[1]));
    assert.equal(rows.length, N, `expected ${N} jsonl worked-example rows ("id": "R-DM<n>"), found ${rows.length}`);
    assert.deepEqual(
      rows,
      headingIds,
      `jsonl worked-example row ids [${rows.join(', ')}] do not match the live heading ids [${headingIds.join(', ')}]`
    );
  }

  // 13. Format-spec closing — the enumerated id-value list and the
  //     "always present" sentence.
  {
    const idListMatch = collapsed.match(/MUST contain exactly (\w+) objects with `id` values ((?:`R-DM\d+`,?\s*)+)— one of each, no duplicates/);
    assert.ok(idListMatch, 'expected the format-spec closing to state "MUST contain exactly <word> objects with `id` values `R-DM1`, ... — one of each, no duplicates"');
    assert.equal(
      idListMatch[1].toLowerCase(),
      expectedWord,
      `format-spec closing says "exactly ${idListMatch[1]} objects" but ${N} live headings implies "exactly ${expectedWord} objects"`
    );
    const enumeratedIds = extractIds(idListMatch[2]);
    assert.deepEqual(
      enumeratedIds,
      headingIds,
      `format-spec closing's enumerated id list [${enumeratedIds.join(', ')}] does not match the live heading ids [${headingIds.join(', ')}]`
    );

    const allPresentMatch = collapsed.match(/No short-circuit: all (\w+) are always present/);
    assert.ok(allPresentMatch, 'expected "No short-circuit: all <word> are always present" in the format spec');
    assert.equal(
      allPresentMatch[1].toLowerCase(),
      expectedWord,
      `format-spec "always present" sentence says "all ${allPresentMatch[1]}" but ${N} live headings implies "all ${expectedWord}"`
    );
  }

  // 14. Anti-patterns — both bullets restate the count independently.
  {
    const flipGuard = collapsed.match(/inside the APPROVED branch \(all (\w+) items `passed: true`\)/);
    assert.ok(flipGuard, 'expected the "Flipping the map on CHANGES_REQUESTED" bullet to say "(all <word> items `passed: true`)"');
    assert.equal(
      flipGuard[1].toLowerCase(),
      expectedWord,
      `anti-patterns flip guard says "all ${flipGuard[1]} items" but ${N} live headings implies "all ${expectedWord} items"`
    );

    const shortCircuitGuard = collapsed.match(/All (\w+) `R-DM1`\.\.`R-DM(\d+)` items MUST be evaluated/);
    assert.ok(shortCircuitGuard, 'expected the "Short-circuiting the rubric" bullet to say "All <word> `R-DM1`..`R-DM<n>` items MUST be evaluated"');
    assert.equal(
      shortCircuitGuard[1].toLowerCase(),
      expectedWord,
      `anti-patterns short-circuit guard says "All ${shortCircuitGuard[1]}" but ${N} live headings implies "All ${expectedWord}"`
    );
    assert.equal(
      Number(shortCircuitGuard[2]),
      N,
      `anti-patterns short-circuit guard cites R-DM1..R-DM${shortCircuitGuard[2]} but ${N} live headings implies R-DM1..R-DM${N}`
    );

    const fewerThanGuard = collapsed.match(/A `rubric` array with fewer than (\w+) objects is a hard violation/);
    assert.ok(fewerThanGuard, 'expected "A `rubric` array with fewer than <word> objects is a hard violation."');
    assert.equal(
      fewerThanGuard[1].toLowerCase(),
      expectedWord,
      `"fewer than" guard says "fewer than ${fewerThanGuard[1]} objects" but ${N} live headings implies "fewer than ${expectedWord} objects"`
    );
  }
});
