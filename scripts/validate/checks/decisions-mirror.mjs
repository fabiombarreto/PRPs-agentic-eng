#!/usr/bin/env node
// @ts-check
/**
 * decisions-mirror check — keeps `documentation/governance/decisions.html` in
 * step with `docs/decisions.md`.
 *
 * The canonical decision record is the markdown file; the HTML page is a
 * human-facing mirror of it. Nothing enforced that relationship, and it drifted
 * twice in a single day: the page's index stopped four entries short of its own
 * body, and then eleven decisions — including ten for a feature already in
 * production — sat in the markdown with no counterpart on the site at all.
 *
 * That second drift has teeth beyond tidiness. The Decision Gate reads
 * `docs/decisions.md`, so a decision missing from the site is still binding on
 * agents but invisible to the humans reading the documentation, which is
 * exactly the asymmetry the site exists to remove.
 *
 * The check is deliberately a COUNT comparison, not a title match. The page
 * paraphrases every title on purpose — `## [2026-08-05] Scoped Figma scan: a
 * command-side \`Glob\`/\`Grep\` pre-match...` becomes `76. Scoped Figma scan: a
 * command-side pre-match...` — so any content-matching rule would either fail
 * on legitimate rewording or pass on a stub. Counts cannot express "the summary
 * is faithful", but they do express "an entry exists", which is the invariant
 * that actually broke.
 *
 * Two counts are compared:
 *   - entries: `^## [YYYY-...]` headings in the markdown (the template
 *     placeholder at the bottom uses a literal `YYYY-MM-DD` and is excluded)
 *     against `<h3 id=` headings on the page.
 *   - index rows: the page's own `<ol>` index against its `<h3>` body, since
 *     the first drift was between those two rather than across files.
 *
 * Exports:
 *   checkDecisionsMirror({ markdown, html }) — pure function over two strings.
 *   runDecisionsMirrorCheck() — reads the two real files and delegates.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'decisions-mirror';
const MARKDOWN_PATH = 'docs/decisions.md';
const HTML_PATH = 'documentation/governance/decisions.html';

/** Every file this check reads. @type {string[]} */
export const WATCHED_FILES = [MARKDOWN_PATH, HTML_PATH];

/**
 * Count dated decision headings, excluding the template placeholder that ends
 * the markdown file (it carries a literal `YYYY-MM-DD`, not a real date).
 * @param {string} markdown
 * @returns {number}
 */
export function countMarkdownEntries(markdown) {
  return markdown.split(/\r?\n/).filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
}

/** @param {string} html @returns {number} */
export function countHtmlEntries(html) {
  return (html.match(/<h3 id="/g) || []).length;
}

/**
 * Count the rows of the page's own index list — the `<ol>` that opens the
 * document, not any later list.
 * @param {string} html
 * @returns {number}
 */
export function countHtmlIndexRows(html) {
  const start = html.indexOf('<ol>');
  if (start === -1) return 0;
  const end = html.indexOf('</ol>', start);
  if (end === -1) return 0;
  return (html.slice(start, end).match(/<li>/g) || []).length;
}

/**
 * @param {{markdown: string, html: string}} input
 * @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}}
 */
export function checkDecisionsMirror(input) {
  /** @type {{message: string, file: string, line: number}[]} */ const findings = [];

  const mdEntries = countMarkdownEntries(input.markdown);
  const htmlEntries = countHtmlEntries(input.html);
  const indexRows = countHtmlIndexRows(input.html);

  if (mdEntries !== htmlEntries) {
    const behind = mdEntries - htmlEntries;
    findings.push({
      message:
        `${MARKDOWN_PATH} has ${mdEntries} decision entries but ${HTML_PATH} has ${htmlEntries} `
        + `(${behind > 0 ? `${behind} missing from the site` : `${-behind} extra on the site`}). `
        + 'The Decision Gate reads the markdown, so a decision missing from the site is binding on '
        + 'agents while invisible to readers. Mirror the entry (date / context / decision / reason) '
        + 'and add its index row.',
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

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/** @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}} */
export function runDecisionsMirrorCheck() {
  for (const p of WATCHED_FILES) {
    if (!existsSync(resolve(p))) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `expected ${p} to exist`, file: p, line: 1 }],
      };
    }
  }
  return checkDecisionsMirror({
    markdown: readFileSync(resolve(MARKDOWN_PATH), 'utf8'),
    html: readFileSync(resolve(HTML_PATH), 'utf8'),
  });
}
