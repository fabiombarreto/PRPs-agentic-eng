// @ts-check
/**
 * Tests for the decisions-mirror check.
 *
 * The check exists because the invariant it guards broke twice in one day
 * while being maintained by discipline alone: the governance page's index
 * stopped four entries short of its own body, and eleven decisions — ten of
 * them for a feature already in production — sat in the markdown with no
 * counterpart on the site.
 *
 * Both polarities are exercised against the pure function, plus the real
 * repository, because a check that only asserts its own existence tests
 * nothing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkDecisionsMirror,
  countMarkdownEntries,
  countHtmlEntries,
  countHtmlIndexRows,
  runDecisionsMirrorCheck,
} from './decisions-mirror.mjs';

/** Build an HTML page with `n` entries and `indexRows` index rows. */
function page(n, indexRows = n) {
  const rows = Array.from({ length: indexRows }, (_, i) => `        <li><a href="#d${i}">Decision ${i}</a></li>`);
  const bodies = Array.from({ length: n }, (_, i) => `      <h3 id="d${i}">${i + 1}. Decision ${i}</h3>`);
  return `<ol>\n${rows.join('\n')}\n      </ol>\n${bodies.join('\n')}\n`;
}

/** Build a markdown file with `n` dated entries, plus the template placeholder. */
function markdown(n) {
  const entries = Array.from({ length: n }, (_, i) => `## [2026-08-${String((i % 28) + 1).padStart(2, '0')}] Decision ${i}`);
  return `${entries.join('\n\n')}\n\n<!-- Template for future entries:\n\n## [YYYY-MM-DD] Title of the decision\n\n-->\n`;
}

// ---------------------------------------------------------------------------
// Counting — the template placeholder must not inflate the markdown count.
// ---------------------------------------------------------------------------

test('countMarkdownEntries excludes the YYYY-MM-DD template placeholder', () => {
  assert.equal(countMarkdownEntries(markdown(5)), 5);
  assert.equal(
    countMarkdownEntries('## [YYYY-MM-DD] Title of the decision\n'),
    0,
    'the placeholder is not a decision and must never be counted'
  );
});

test('countHtmlEntries and countHtmlIndexRows read the page independently', () => {
  const html = page(7, 7);
  assert.equal(countHtmlEntries(html), 7);
  assert.equal(countHtmlIndexRows(html), 7);
});

test('countHtmlIndexRows counts only the leading index list, not later lists', () => {
  const html = page(3, 3) + '\n<ul>\n<li>a recovery step</li>\n<li>another</li>\n</ul>\n';
  assert.equal(countHtmlIndexRows(html), 3, 'a list elsewhere on the page must not inflate the index count');
});

// ---------------------------------------------------------------------------
// The two drifts that actually happened.
// ---------------------------------------------------------------------------

test('a page in step with the markdown passes', () => {
  const result = checkDecisionsMirror({ markdown: markdown(10), html: page(10) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.equal(result.name, 'decisions-mirror');
});

test('drift 1: decisions in the markdown with no counterpart on the site fails, and says how many', () => {
  const result = checkDecisionsMirror({ markdown: markdown(21), html: page(10) });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /11 missing from the site/);
  assert.match(
    result.findings[0].message,
    /binding on agents while invisible to readers/,
    'the message must say why it matters — the Decision Gate reads the markdown'
  );
});

test('drift 2: an index shorter than the body fails independently of the cross-file count', () => {
  const result = checkDecisionsMirror({ markdown: markdown(10), html: page(10, 6) });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'the cross-file counts agree, so only the index finding fires');
  assert.match(result.findings[0].message, /index lists 6 rows but the body has 10/);
  assert.match(result.findings[0].message, /effectively unpublished/);
});

test('both drifts at once produce both findings', () => {
  const result = checkDecisionsMirror({ markdown: markdown(15), html: page(10, 8) });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
});

test('an extra entry on the site is reported too, not only a shortfall', () => {
  const result = checkDecisionsMirror({ markdown: markdown(5), html: page(8) });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /3 extra on the site/);
});

// ---------------------------------------------------------------------------
// The real tree.
// ---------------------------------------------------------------------------

test('the real repository is in step', () => {
  const result = runDecisionsMirrorCheck();
  assert.equal(
    result.ok,
    true,
    `expected docs/decisions.md and the governance page to agree; found: ${JSON.stringify(result.findings)}`
  );
});
