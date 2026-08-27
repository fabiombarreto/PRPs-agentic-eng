#!/usr/bin/env node
// @ts-check
/**
 * anti-patterns-mirror check — keeps `documentation/governance/anti-patterns.html`
 * in step with `docs/anti-patterns.md`.
 *
 * The sibling `decisions-mirror` check has enforced the same relationship for
 * `docs/decisions.md` since 2026-08. Anti-patterns had no such enforcement, and
 * drifted exactly the way decisions did — twice on the record. The changelog
 * documents the first incident (the page "was missing two anti-patterns and,
 * worse, taught a test-pair activation rule superseded in July"). The second was
 * found in 2026-08-27 while closing out the test-formatting-prevention-preflight
 * PRD: the page carried 10 entries against the markdown's 15, and nothing failed.
 *
 * The asymmetry has teeth for the same reason it does for decisions. The
 * Decision Gate reads `docs/anti-patterns.md`, so a forbidden pattern missing
 * from the site is still binding on agents while invisible to the humans reading
 * the documentation — which is precisely the gap the site exists to close.
 *
 * Like `decisions-mirror`, this is a COUNT comparison rather than a title match.
 * The page deliberately condenses and rewords every title, so any content-match
 * rule would either fail on legitimate rewording or pass on a stub. Counts
 * cannot express "the summary is faithful", but they do express "an entry
 * exists", which is the invariant that actually broke — twice.
 *
 * Three things are compared:
 *   - entries: `^## ` headings in the markdown against numbered `<h2 id="...">N.`
 *     headings on the page. HTML comments are stripped from the markdown first,
 *     so the `## [pattern name]` template that ends the file — which lives inside
 *     a comment — is excluded. The page's `index` and `how-to-add` headings carry
 *     no leading number and are excluded by the same token.
 *   - index rows: the page's own leading `<ol>` against its numbered body
 *     headings, since one recorded drift was between those two rather than
 *     across files.
 *   - numbering: the body headings must read 1..N with no gap, duplicate, or
 *     reordering — a renumbering slip silently breaks every index link.
 *
 * Exports:
 *   checkAntiPatternsMirror({ markdown, html }) — pure function over two strings.
 *   runAntiPatternsMirrorCheck() — reads the two real files and delegates.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'anti-patterns-mirror';
const MARKDOWN_PATH = 'docs/anti-patterns.md';
const HTML_PATH = 'documentation/governance/anti-patterns.html';

/** Every file this check reads. @type {string[]} */
export const WATCHED_FILES = [MARKDOWN_PATH, HTML_PATH];

/**
 * Count `## ` entry headings, excluding anything inside an HTML comment. The
 * markdown ends with a commented-out `## [pattern name]` template block; it is
 * not an entry and must not be counted.
 * @param {string} markdown
 * @returns {number}
 */
export function countMarkdownEntries(markdown) {
  const withoutComments = markdown.replace(/<!--[\s\S]*?(?:-->|$)/g, '');
  return withoutComments.split(/\r?\n/).filter((l) => /^## \S/.test(l)).length;
}

/**
 * Numbered body headings only. The page's structural `index` and `how-to-add`
 * headings use the same `<h2 id=...>` shape but carry no leading `N.`, so the
 * number is what distinguishes an entry from furniture.
 * @param {string} html
 * @returns {number[]} the numbers, in document order
 */
export function htmlEntryNumbers(html) {
  const out = [];
  const re = /<h2 id="[^"]+">\s*(\d+)\./g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(Number(m[1]));
  return out;
}

/**
 * Count the anchor rows of the page's own index list — the first `<ol>` in the
 * document, not the later `how-to-add` list.
 * @param {string} html
 * @returns {number}
 */
export function countHtmlIndexRows(html) {
  const start = html.indexOf('<ol>');
  if (start === -1) return 0;
  const end = html.indexOf('</ol>', start);
  if (end === -1) return 0;
  return (html.slice(start, end).match(/<li><a href="#/g) || []).length;
}

/**
 * @param {{markdown: string, html: string}} input
 * @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}}
 */
export function checkAntiPatternsMirror(input) {
  /** @type {{message: string, file: string, line: number}[]} */ const findings = [];

  const mdEntries = countMarkdownEntries(input.markdown);
  const numbers = htmlEntryNumbers(input.html);
  const htmlEntries = numbers.length;
  const indexRows = countHtmlIndexRows(input.html);

  if (mdEntries !== htmlEntries) {
    const behind = mdEntries - htmlEntries;
    findings.push({
      message:
        `${MARKDOWN_PATH} has ${mdEntries} anti-pattern entries but ${HTML_PATH} has ${htmlEntries} `
        + `(${behind > 0 ? `${behind} missing from the site` : `${-behind} extra on the site`}). `
        + 'The Decision Gate reads the markdown, so a forbidden pattern missing from the site is '
        + 'binding on agents while invisible to readers. Mirror the entry (What it is / Why it\'s '
        + 'forbidden / What to do instead / Areas affected) and add its index row.',
      file: HTML_PATH,
      line: 1,
    });
  }

  if (indexRows !== htmlEntries) {
    findings.push({
      message:
        `${HTML_PATH}'s index lists ${indexRows} rows but the body has ${htmlEntries} entries. `
        + 'An entry reachable only by scrolling is effectively unpublished.',
      file: HTML_PATH,
      line: 1,
    });
  }

  const expected = numbers.map((_, i) => i + 1);
  if (numbers.length > 0 && numbers.join(',') !== expected.join(',')) {
    findings.push({
      message:
        `${HTML_PATH}'s entry numbering reads ${numbers.join(', ')} but should read `
        + `${expected.join(', ')}. A gap, duplicate, or reordering silently breaks the index links.`,
      file: HTML_PATH,
      line: 1,
    });
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/** @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}} */
export function runAntiPatternsMirrorCheck() {
  for (const p of WATCHED_FILES) {
    if (!existsSync(resolve(p))) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `expected ${p} to exist`, file: p, line: 1 }],
      };
    }
  }
  return checkAntiPatternsMirror({
    markdown: readFileSync(resolve(MARKDOWN_PATH), 'utf8'),
    html: readFileSync(resolve(HTML_PATH), 'utf8'),
  });
}
