// @ts-check
/**
 * Tests for the anti-patterns-mirror check.
 *
 * Sibling coverage to decisions-mirror.test.mjs — same idiom, same reasoning:
 * the invariant this check guards drifted twice on the record (documented in
 * anti-patterns-mirror.mjs's own header), most recently on 2026-08-27, when
 * documentation/governance/anti-patterns.html carried 10 entries against
 * docs/anti-patterns.md's 15 and nothing failed. The Decision Gate reads the
 * markdown, so a forbidden pattern missing from the site is binding on
 * agents while invisible to the humans reading the documentation.
 *
 * Follow-up test coverage authored 2026-08-27 for the newly-added
 * scripts/validate/checks/anti-patterns-mirror.mjs (registered in
 * scripts/validate/index.mjs; the drift it now catches mechanically is what
 * test-formatting-prevention-preflight-phase5.test.mjs's own retired tests
 * used to pin manually — see that file's FOLLOW-UP docstring note and
 * PRPs/reports/test-formatting-prevention-preflight/test-suite.diff's
 * "Follow-up: anti-patterns-mirror" section for the full lifecycle ledger).
 *
 * Both polarities are exercised against the pure function, plus the real
 * repository, because a check that only asserts its own existence tests
 * nothing. Every extracted range is asserted non-empty BEFORE any content
 * comparison is made against it — an empty-vs-empty comparison must never
 * be allowed to pass vacuously.
 *
 * Run: node --test scripts/validate/checks/anti-patterns-mirror.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkAntiPatternsMirror,
  countMarkdownEntries,
  htmlEntryNumbers,
  countHtmlIndexRows,
  runAntiPatternsMirrorCheck,
} from './anti-patterns-mirror.mjs';

/**
 * Build a markdown file with `n` real `## ` entry headings, plus the
 * trailing commented-out `## [pattern name]` template the real file ends
 * with (same excluded-placeholder shape as docs/anti-patterns.md itself).
 */
function markdown(n) {
  const entries = Array.from({ length: n }, (_, i) => `## Entry ${i}`);
  return `${entries.join('\n\n')}\n\n<!-- Template for future entries:\n\n## [pattern name]\n\n-->\n`;
}

/**
 * Build an HTML page with numbered body headings reading `numbers` (in
 * document order) and `indexRows` leading-index `<li>` rows (defaults to
 * `numbers.length`). Always carries the two structural, non-numbered
 * `index`/`how-to-add` headings so a regression that started counting them
 * would be caught by the structural-exclusion tests below.
 */
function page(numbers, indexRows = numbers.length) {
  const rows = Array.from(
    { length: indexRows },
    (_, i) => `        <li><a href="#e${i}">Entry ${i}</a></li>`
  );
  const bodies = numbers.map((num, i) => `      <h2 id="e${i}">${num}. Entry ${i}</h2>`);
  return (
    '<h2 id="index">Index</h2>\n'
    + '<ol>\n' + rows.join('\n') + '\n      </ol>\n'
    + bodies.join('\n') + '\n'
    + '<h2 id="how-to-add">Adding a new anti-pattern</h2>\n'
  );
}

// ---------------------------------------------------------------------------
// Pure-function unit tests.
// ---------------------------------------------------------------------------

test('countMarkdownEntries excludes the trailing `## [pattern name]` template heading inside an HTML comment', () => {
  const templateOnly = '<!-- Template for future entries:\n\n## [pattern name]\n\n-->\n';
  assert.equal(countMarkdownEntries(templateOnly), 0, 'the commented-out template heading is not a real entry');

  const md = markdown(15);
  const entries = countMarkdownEntries(md);
  assert.ok(entries > 0, 'expected a non-empty extraction of real entries before asserting the exact count');
  assert.equal(entries, 15, 'the trailing template heading must not inflate the 15 real-entry count');
});

test('countMarkdownEntries strips every HTML comment block, not only the trailing template', () => {
  const md = '## Entry 0\n\n<!-- ## Commented-out entry that must not count -->\n\n## Entry 1\n\n'
    + '<!-- Template for future entries:\n\n## [pattern name]\n\n-->\n';
  const entries = countMarkdownEntries(md);
  assert.ok(entries > 0, 'expected a non-empty extraction before asserting the exact count');
  assert.equal(entries, 2, 'a commented-out heading anywhere in the file, not only the trailing template, must not count as a real entry');
});

test('htmlEntryNumbers and countHtmlIndexRows read the page independently, in document order', () => {
  const html = page([1, 2, 3]);
  const numbers = htmlEntryNumbers(html);
  assert.ok(numbers.length > 0, 'expected a non-empty extraction of body entry numbers before asserting exact contents');
  assert.deepEqual(numbers, [1, 2, 3]);
  assert.equal(countHtmlIndexRows(html), 3);
});

test('htmlEntryNumbers excludes the structural index and how-to-add headings', () => {
  const html = page([1, 2]);
  assert.ok(html.includes('<h2 id="index">Index</h2>'), 'sanity: the structural index heading is present in the fixture');
  assert.ok(html.includes('<h2 id="how-to-add">'), 'sanity: the structural how-to-add heading is present in the fixture');
  const numbers = htmlEntryNumbers(html);
  assert.equal(numbers.length, 2, 'the two structural headings (no leading N.) must not be counted as entries');
});

test('countHtmlIndexRows counts only the leading index list, not a later list', () => {
  const html = page([1, 2, 3]) + '\n<ul>\n<li><a href="#extra">not an index row</a></li>\n</ul>\n';
  assert.equal(countHtmlIndexRows(html), 3, 'a list elsewhere on the page must not inflate the index count');
});

// ---------------------------------------------------------------------------
// checkAntiPatternsMirror — the drifts this check exists to catch.
// ---------------------------------------------------------------------------

test('checkAntiPatternsMirror: a page fully in sync (15/15/15) passes', () => {
  const md = markdown(15);
  const html = page(Array.from({ length: 15 }, (_, i) => i + 1));
  const result = checkAntiPatternsMirror({ markdown: md, html });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.equal(result.name, 'anti-patterns-mirror');
});

test('markdown ahead by 2 — the actual 2026-08-27 drift shape — fails and names how many are missing', () => {
  const result = checkAntiPatternsMirror({
    markdown: markdown(15),
    html: page(Array.from({ length: 13 }, (_, i) => i + 1)),
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'the index agrees with the body (13/13), so only the cross-file entry-count finding fires');
  assert.match(result.findings[0].message, /15 anti-pattern entries but .*has 13/);
  assert.match(result.findings[0].message, /2 missing from the site/);
  assert.match(
    result.findings[0].message,
    /binding on agents while invisible to readers/,
    'the message must say why it matters — the Decision Gate reads the markdown'
  );
});

test('site ahead by 1 is reported too, not only a shortfall', () => {
  const result = checkAntiPatternsMirror({
    markdown: markdown(10),
    html: page(Array.from({ length: 11 }, (_, i) => i + 1)),
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /1 extra on the site/);
});

test('index rows short by 1 fails independently of the cross-file entry count', () => {
  const result = checkAntiPatternsMirror({
    markdown: markdown(10),
    html: page(Array.from({ length: 10 }, (_, i) => i + 1), 9),
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'the cross-file entry counts agree (10/10), so only the index finding fires');
  assert.match(result.findings[0].message, /index lists 9 rows but the body has 10/);
  assert.match(result.findings[0].message, /effectively unpublished/);
});

test('numbering duplicate (1, 2, 3, 3) fails independently of both count checks', () => {
  const result = checkAntiPatternsMirror({ markdown: markdown(4), html: page([1, 2, 3, 3]) });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'both count checks agree (4/4/4), so only the numbering finding fires');
  assert.match(result.findings[0].message, /1, 2, 3, 3/);
  assert.match(result.findings[0].message, /should read 1, 2, 3, 4/);
});

test('numbering gap (1, 2, 4, 5) fails independently of both count checks', () => {
  const result = checkAntiPatternsMirror({ markdown: markdown(4), html: page([1, 2, 4, 5]) });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'both count checks agree (4/4/4), so only the numbering finding fires');
  assert.match(result.findings[0].message, /1, 2, 4, 5/);
  assert.match(result.findings[0].message, /should read 1, 2, 3, 4/);
});

test('all three drift classes at once produce three independent findings', () => {
  const result = checkAntiPatternsMirror({
    markdown: markdown(15),
    html: page([1, 2, 4], 2),
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3, 'entry-count mismatch (15 vs 3), index-row mismatch (2 vs 3), and a numbering gap must each fire independently');
});

// ---------------------------------------------------------------------------
// The real tree.
// ---------------------------------------------------------------------------

test('the real repository is in step', () => {
  const result = runAntiPatternsMirrorCheck();
  assert.equal(
    result.ok,
    true,
    `expected docs/anti-patterns.md and documentation/governance/anti-patterns.html to agree; found: ${JSON.stringify(result.findings)}`
  );
});
