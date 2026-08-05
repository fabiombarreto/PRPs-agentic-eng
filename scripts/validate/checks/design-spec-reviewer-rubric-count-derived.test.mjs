// @ts-check
/**
 * DERIVED (not hardcoded) regression test for
 * plugins/relay/agents/design-spec-reviewer.md's `R-DS<n>` rubric-count
 * self-consistency.
 *
 * Motivation (PRPs/prds/figma-quota-resilience.prd.md AC-13): "Given the
 * `R-DM` (or `R-DS`) rubric gains or loses an item, when the validation
 * corpus runs, then the rubric-count assertion re-derives the count from a
 * live grep of `### R-DM<n>` / `### R-DS<n>` headings and fails loudly on
 * drift, rather than passing against a hardcoded literal." This file is the
 * `R-DS` sibling of design-map-reviewer-rubric-count-derived.test.mjs,
 * added in the SAME session for the SAME reason those two files' shared
 * source plan names explicitly: "an R-DS-equivalent DERIVED rubric-count
 * test... the test pair should author a DERIVED count test for
 * design-spec-reviewer.md even though this phase does not touch its
 * production content — R-DS's count does not change here, but AC-13's
 * re-derivation requirement is itself an unmet gap the source PRD
 * explicitly names" (figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md,
 * `## Notes`). `design-spec-reviewer.md`'s rubric stays at seven items
 * (`R-DS1`-`R-DS7`) in this phase — this file is pure protective
 * infrastructure against the NEXT drift, mirroring the R-DM sibling.
 *
 * Design constraint this file exists to satisfy (identical to the R-DM
 * sibling's): re-deriving BOTH sides of a comparison from the same live
 * source is vacuous. Every assertion below derives ONE side — the expected
 * rubric size `N` — from the live `### R-DS<n>` heading count, and compares
 * it against the OTHER, independently-authored side: what the file's own
 * prose/JSON actually states its size to be, at structurally distinct
 * sites (frontmatter, opening prose, Hard Constraint 3, the rubric section
 * heading, its trailing "Run all N" sentence, Step 2's "Walk" sentence and
 * its own short-circuit reminder, the jsonl worked example, the format-spec
 * closing, and the anti-patterns short-circuit bullet). A future
 * contributor who adds `### R-DS8` without updating every one of these
 * sites gets a loud, specific failure naming exactly which site still
 * disagrees.
 *
 * Existing-coverage scan performed before authoring: grounding for the
 * source plan confirmed (honest negative) that no existing test under
 * scripts/validate/checks/*.test.mjs hardcodes design-spec-reviewer.md's
 * "seven objects"/`R-DS1`-`R-DS7` count as a literal —
 * figma-visual-first-track-phase1.test.mjs:495-506 only asserts a prose
 * sentence in design-spec-template.md that NAMES R-DS7 by id, never a count
 * assertion against design-spec-reviewer.md itself, and no file performs
 * this file's dynamic self-consistency check. NEW_TEST_REQUIRED, not
 * EXISTING_TEST_COVERS.
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md AC-13 (also AC-A6 of
 * the source plan below).
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-4-evidence-contract-rungs-r-dm7.plan.md
 *
 * Run: node --test scripts/validate/checks/design-spec-reviewer-rubric-count-derived.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REVIEWER_PATH = 'plugins/relay/agents/design-spec-reviewer.md';

// Small, closed word-form table — see the R-DM sibling file for the
// identical extension-point rationale.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

/**
 * @param {number} n
 * @returns {string}
 */
function numberToWord(n) {
  if (!Number.isInteger(n) || n < 0 || n >= NUMBER_WORDS.length) {
    throw new Error(
      `numberToWord: ${n} is outside the supported 0-${NUMBER_WORDS.length - 1} range — extend NUMBER_WORDS in this file before adding an R-DS<n> beyond this ceiling`
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
 * a single space.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase3.test.mjs's helper
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

test("DERIVED: design-spec-reviewer.md's R-DS<n> rubric count is self-consistent across every site that states its own size — re-derived from live ### R-DS<n> headings, not hardcoded, so a future heading addition/removal fails loudly instead of silently drifting", () => {
  const content = readRepoFile(REVIEWER_PATH);
  const collapsed = collapseWs(content);

  // 1. Derive N from the LIVE heading count — the single source of truth
  //    every other check below is compared against.
  const headingMatches = [...content.matchAll(/^### R-DS(\d+)/gm)];
  const N = headingMatches.length;
  assert.ok(N > 0, 'expected at least one ### R-DS<n> heading in design-spec-reviewer.md');

  const headingIds = headingMatches.map((m) => Number(m[1]));
  assert.deepEqual(
    headingIds,
    Array.from({ length: N }, (_, i) => i + 1),
    `expected ### R-DS<n> headings to be exactly R-DS1..R-DS${N} in order with no gaps/duplicates, found ids [${headingIds.join(', ')}]`
  );

  const expectedWord = numberToWord(N);

  // 2. Frontmatter description.
  {
    const m = content.match(/using a (\w+)-item, MCP-free rubric \(R-DS1-R-DS(\d+):/);
    assert.ok(m, 'expected the frontmatter description to state "<word>-item, MCP-free rubric (R-DS1-R-DS<n>:"');
    assert.equal(
      m[1].toLowerCase(),
      expectedWord,
      `frontmatter description says "${m[1]}-item" but ${N} live headings implies "${expectedWord}-item"`
    );
    assert.equal(Number(m[2]), N, `frontmatter description cites R-DS1-R-DS${m[2]} but ${N} live headings implies R-DS1-R-DS${N}`);
  }

  // 3. Opening body prose.
  {
    const m = collapsed.match(/against a (\w+)-item, MCP-free rubric \(`R-DS1` through `R-DS(\d+)`,/);
    assert.ok(m, 'expected the opening body prose to state "against a <word>-item, MCP-free rubric (`R-DS1` through `R-DS<n>`,"');
    assert.equal(m[1].toLowerCase(), expectedWord, `opening prose says "${m[1]}-item" but ${N} live headings implies "${expectedWord}-item"`);
    assert.equal(Number(m[2]), N, `opening prose cites through R-DS${m[2]} but ${N} live headings implies R-DS${N}`);
  }

  // 4. Hard Constraint 3's short-circuit sentence.
  {
    const m = collapsed.match(/run all R-DS1\.\.R-DS(\d+) every run/);
    assert.ok(m, 'expected Hard Constraint 3 to state "run all R-DS1..R-DS<n> every run"');
    assert.equal(Number(m[1]), N, `Hard Constraint 3 cites R-DS1..R-DS${m[1]} but ${N} live headings implies R-DS1..R-DS${N}`);
  }

  // 5. Rubric section heading.
  {
    const m = collapsed.match(/## The (\w+)-item rubric \(R-DS1–R-DS(\d+), MCP-free\)/);
    assert.ok(m, 'expected "## The <word>-item rubric (R-DS1–R-DS<n>, MCP-free)"');
    assert.equal(m[1].toLowerCase(), expectedWord, `rubric heading says "${m[1]}-item" but ${N} live headings implies "${expectedWord}-item"`);
    assert.equal(Number(m[2]), N, `rubric heading cites R-DS1–R-DS${m[2]} but ${N} live headings implies R-DS1–R-DS${N}`);
  }

  // 6. "Run all <word> on every review" sentence.
  {
    const m = collapsed.match(/Run all (\w+) on every review/);
    assert.ok(m, 'expected "Run all <word> on every review — do not short-circuit."');
    assert.equal(m[1].toLowerCase(), expectedWord, `"Run all" sentence says "${m[1]}" but ${N} live headings implies "${expectedWord}"`);
  }

  // 7. Step 2's "Walk" sentence.
  {
    const m = collapsed.match(/Walk R-DS1 through R-DS(\d+) in order/);
    assert.ok(m, 'expected Step 2 to state "Walk R-DS1 through R-DS<n> in order."');
    assert.equal(Number(m[1]), N, `Step 2's "Walk" sentence cites through R-DS${m[1]} but ${N} live headings implies R-DS${N}`);
  }

  // 8. Step 2's own short-circuit reminder.
  {
    const m = collapsed.match(/No short-circuit — all (\w+) always evaluated and recorded/);
    assert.ok(m, 'expected "No short-circuit — all <word> always evaluated and recorded." after Step 2\'s worked example');
    assert.equal(m[1].toLowerCase(), expectedWord, `Step 2's reminder says "all ${m[1]}" but ${N} live headings implies "all ${expectedWord}"`);
  }

  // 9. jsonl worked-example row count, scoped to the format-spec section's
  //    fenced block — Step 2's own inline single-object illustration
  //    ("{ "id": "R-DS3", "passed": false, ... }") is deliberately outside
  //    this slice so it cannot double-count a partial example as a full
  //    worked one.
  {
    const jsonlSection = sliceBetween(content, '## design-spec-review.jsonl format', '`verdict` is one of:');
    assert.ok(jsonlSection, 'expected an extractable "## design-spec-review.jsonl format" section preceding "`verdict` is one of:"');
    const rows = [...(/** @type {string} */ (jsonlSection)).matchAll(/"id":\s*"R-DS(\d+)"/g)].map((m) => Number(m[1]));
    assert.equal(rows.length, N, `expected ${N} jsonl worked-example rows ("id": "R-DS<n>") in the format-spec section, found ${rows.length}`);
    assert.deepEqual(
      rows,
      headingIds,
      `jsonl worked-example row ids [${rows.join(', ')}] do not match the live heading ids [${headingIds.join(', ')}]`
    );
  }

  // 10. Format-spec closing — the id-range sentence and the "always
  //     present" sentence.
  {
    const idRangeMatch = collapsed.match(/MUST contain exactly (\w+) objects with `id` values `R-DS1`–`R-DS(\d+)` — one of each, no duplicates/);
    assert.ok(idRangeMatch, 'expected the format-spec closing to state "MUST contain exactly <word> objects with `id` values `R-DS1`–`R-DS<n>` — one of each, no duplicates"');
    assert.equal(
      idRangeMatch[1].toLowerCase(),
      expectedWord,
      `format-spec closing says "exactly ${idRangeMatch[1]} objects" but ${N} live headings implies "exactly ${expectedWord} objects"`
    );
    assert.equal(
      Number(idRangeMatch[2]),
      N,
      `format-spec closing cites R-DS1–R-DS${idRangeMatch[2]} but ${N} live headings implies R-DS1–R-DS${N}`
    );

    const allPresentMatch = collapsed.match(/No short-circuit: all (\w+) are always present/);
    assert.ok(allPresentMatch, 'expected "No short-circuit: all <word> are always present" in the format spec');
    assert.equal(
      allPresentMatch[1].toLowerCase(),
      expectedWord,
      `format-spec "always present" sentence says "all ${allPresentMatch[1]}" but ${N} live headings implies "all ${expectedWord}"`
    );
  }

  // 11. Anti-patterns — the short-circuit bullet restates the count
  //     independently of everything above.
  {
    const m = collapsed.match(/All (\w+) `R-DS1`–`R-DS(\d+)` items are always evaluated/);
    assert.ok(m, 'expected the "Short-circuiting the rubric" bullet to say "All <word> `R-DS1`–`R-DS<n>` items are always evaluated"');
    assert.equal(m[1].toLowerCase(), expectedWord, `anti-patterns short-circuit bullet says "All ${m[1]}" but ${N} live headings implies "All ${expectedWord}"`);
    assert.equal(
      Number(m[2]),
      N,
      `anti-patterns short-circuit bullet cites R-DS1–R-DS${m[2]} but ${N} live headings implies R-DS1–R-DS${N}`
    );
  }
});
