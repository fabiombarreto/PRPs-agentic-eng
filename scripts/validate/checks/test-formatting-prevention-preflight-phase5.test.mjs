// @ts-check
/**
 * Content-invariant tests for Phase 5 of test-formatting-prevention-preflight
 * ("Docs + release") — docs/decisions.md (two new dated entries),
 * documentation/governance/decisions.html (their mirror),
 * documentation/governance/anti-patterns.html (three new mirrored entries),
 * and documentation/changelog.html (the 0.35.0 release cut + fresh
 * Unreleased block).
 *
 * `phase_type: docs` — every file this phase touches is Markdown, HTML, or
 * the plugin manifest JSON; there is no companion production .mjs module to
 * import, so (mirroring docs-sync-phase1..4.test.mjs's established idiom)
 * these tests assert directly against the real, already-implemented,
 * already-code-reviewed file content on disk via readFileSync. Authored
 * test-after (docs/context/methodology.md: tdd: false + test_frameworks:
 * ["node:test"]) against:
 * PRPs/plans/completed/test-formatting-prevention-preflight-phase-5-docs-release.plan.md
 *
 * Traceability: the plan's own `## Acceptance Criteria` maps AC-A1..AC-A7 to
 * exactly ONE PRD Acceptance Criterion — AC-8 (Validation green) — per the
 * dispatch payload's explicit scope narrowing. AC-1..AC-7 are other phases'
 * own scope, already closed in this suite's earlier Phase 1/2/3/4 sections;
 * OUT_OF_PHASE_SCOPE here.
 *
 * R-DUPLICATE scope note — what this file deliberately does NOT re-test:
 *   - docs/decisions.md <-> documentation/governance/decisions.html ENTRY
 *     COUNT parity (the decisions-mirror invariant AC-A2/AC-A3 restore) is
 *     already mechanically re-derived, against the REAL live files, by
 *     decisions-mirror.test.mjs's "the real repository is in step" test
 *     (scripts/validate/checks/decisions-mirror.test.mjs:111-118), which
 *     will now genuinely re-validate entries 90/91 + their two new index
 *     rows the moment it runs against this session's tree. EXISTING_TEST_COVERS.
 *   - plugins/relay/.claude-plugin/plugin.json <-> documentation/changelog.html
 *     VERSION-NUMBER parity (AC-A5, the §7.5 lock-step contract) is already
 *     mechanically re-derived, against the REAL live files, by
 *     figma-track-phase1.test.mjs's real-tree `runVersionParityCheck()`
 *     assertion (scripts/validate/checks/figma-track-phase1.test.mjs:237-241),
 *     which equally re-validates against whatever plugin.json/changelog.html
 *     currently hold — including this session's 0.35.0 cut.
 *     version-parity.test.mjs itself only fixture-tests the pure
 *     `checkVersionParity` function and is not re-touched. EXISTING_TEST_COVERS.
 *   - `npm run validate` exiting 0 as a spawned end-to-end command is not
 *     re-encoded here, mirroring test-formatting-prevention-preflight-phase1
 *     .test.mjs's own "Testability note": the PRD's Success Metrics table
 *     names "CI-less pre-commit gate + manual run" as How Measured for that
 *     row, not a unit test; the sub-properties that could actually regress
 *     silently are what this file and the two EXISTING_TEST_COVERS mappings
 *     above actually assert between them.
 *
 * The one genuinely UNPROTECTED property this phase adds real, new coverage
 * for (as of authoring, 2026-08-26/27): there is NO `anti-patterns-mirror.mjs`
 * check anywhere in scripts/validate/ (only `decisions-mirror.mjs` exists,
 * scoped to the decisions pair — confirmed by a full pre-authoring `Glob` of
 * scripts/validate/checks/*.mjs). documentation/changelog.html's own
 * 0.20.0-era entry records that this exact drift class ("documentation/
 * governance/anti-patterns.html mirrors only entries 1-10") previously went
 * unnoticed for roughly three and a half months. The tests below originally
 * pinned four properties: (1) the real (docs/anti-patterns.md entry count)
 * <-> (mirrored documentation/governance/anti-patterns.html entry count)
 * relationship — NOT naive equality, because docs/anti-patterns.md had 15
 * real entries while the html deliberately mirrored only 13 of them, per a
 * recorded, reasoned decision to leave two pre-existing, unrelated
 * figma-quota-resilience entries unmirrored; (2) that the html index lists
 * exactly as many rows as its own body has entries; (3) that the two
 * deliberately-unmirrored entries stayed genuinely absent (not merely
 * uncounted) — a count-preserving-swap guard; and (4) the three new
 * entries' own id/title/"what to do instead" content and index rows,
 * pinned against the real, already-implemented HTML text.
 *
 * FOLLOW-UP (2026-08-27, see PRPs/reports/test-formatting-prevention-preflight/
 * test-suite.diff's "Follow-up: anti-patterns-mirror" section for the full
 * lifecycle ledger): properties (1) and (3) above are RETIRED —
 * OBSOLETE_TEST_REMOVED, not merely edited. The operator closed the
 * residual gap they were pinned against: documentation/governance/
 * anti-patterns.html now mirrors all 15 real entries (the two previously
 * unmirrored figma-quota-resilience entries are now numbered entries 14 and
 * 15), so (1)'s "15 minus 2 deliberately-unmirrored" relationship and (3)'s
 * "these two must stay absent" guard both describe a contract that no
 * longer exists. Simultaneously, a new mechanical Level 1 check,
 * `scripts/validate/checks/anti-patterns-mirror.mjs` (registered in
 * `scripts/validate/index.mjs`), now re-derives the general markdown<->html
 * entry-count mirror-parity property on every commit, and its own real-tree
 * unit test (`scripts/validate/checks/anti-patterns-mirror.test.mjs`'s "the
 * real repository is in step" test) re-validates that property against the
 * live tree on every `node --test` run. Re-asserting the same cross-file
 * count relationship here would duplicate that coverage with no
 * discriminative difference (R-DUPLICATE) — exactly the reasoning this file
 * already applies to AC-A2/AC-A3's own EXISTING_TEST_COVERS mappings above.
 * Properties (2) and (4) remain live, in-scope, and untouched below.
 *
 * Every section-range extraction below asserts the extraction itself
 * succeeded (a defined, discoverable boundary) BEFORE any content
 * comparison — an empty-vs-empty comparison is never allowed to pass
 * vacuously.
 *
 * Run: node --test scripts/validate/checks/test-formatting-prevention-preflight-phase5.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DECISIONS_MD_PATH = 'docs/decisions.md';
const DECISIONS_HTML_PATH = 'documentation/governance/decisions.html';
const ANTI_PATTERNS_MD_PATH = 'docs/anti-patterns.md';
const ANTI_PATTERNS_HTML_PATH = 'documentation/governance/anti-patterns.html';
const CHANGELOG_PATH = 'documentation/changelog.html';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Same idiom as docs-sync-phase1..4.test.mjs.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses whitespace runs (including newlines) to a single space, so an
 * assertion can target a verbatim source phrase without being fragile to
 * where the markup happens to hard-wrap. Same idiom as docs-sync-phase4.test.mjs.
 * @param {string} str
 * @returns {string}
 */
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Returns the lines strictly BETWEEN the first line matching `startLineRe`
 * and the next line matching `endLineRe` (both boundary lines excluded).
 * Returns undefined if either boundary is never found — a defined return
 * value means the extraction itself succeeded, independent of whether the
 * captured content happens to be empty.
 * @param {string} content
 * @param {RegExp} startLineRe
 * @param {RegExp} endLineRe
 * @returns {string | undefined}
 */
function linesBetween(content, startLineRe, endLineRe) {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((line) => startLineRe.test(line));
  if (startIdx === -1) return undefined;
  let endIdx = -1;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endLineRe.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return undefined;
  return lines.slice(startIdx + 1, endIdx).join('\n');
}

/**
 * Counts documentation/governance/anti-patterns.html's numbered body entries
 * (`<h2 id="...">N. ...`), deliberately excluding the two structural
 * headings that are not entries: `<h2 id="index">Index</h2>` and
 * `<h2 id="how-to-add">Adding a new anti-pattern</h2>` (neither carries a
 * leading `N.` digit-dot prefix).
 * @param {string} html
 * @returns {number}
 */
function countHtmlAntiPatternEntries(html) {
  return (html.match(/<h2 id="[^"]+">\d+\./g) || []).length;
}

/**
 * Counts the `<li>` rows in the page's own leading index `<ol>` only (not
 * the later "Adding a new anti-pattern" `<ol>`) — same first-`<ol>`-only
 * scoping as decisions-mirror.mjs's countHtmlIndexRows.
 * @param {string} html
 * @returns {number}
 */
function countHtmlIndexRows(html) {
  const start = html.indexOf('<ol>');
  if (start === -1) return 0;
  const end = html.indexOf('</ol>', start);
  if (end === -1) return 0;
  return (html.slice(start, end).match(/<li>/g) || []).length;
}

// ---------------------------------------------------------------------------
// AC-8 (anti-patterns mirror) — the page's OWN internal index-vs-body
// row-count invariant only. The cross-file markdown<->html entry-count
// mirror-parity property (formerly asserted here as a "15 minus 2
// deliberately-unmirrored" relationship) and the genuine-absence guard for
// the two previously-unmirrored figma-quota-resilience entries were both
// RETIRED on 2026-08-27 — OBSOLETE_TEST_REMOVED, see the file's top
// docstring FOLLOW-UP note and PRPs/reports/test-formatting-prevention-
// preflight/test-suite.diff's "Follow-up: anti-patterns-mirror" lifecycle
// ledger. The residual gap they guarded against is closed (the html now
// mirrors all 15 real entries) and the general mirror-parity property is
// now mechanically re-derived every commit by
// scripts/validate/checks/anti-patterns-mirror.mjs, re-validated against
// the live tree by anti-patterns-mirror.test.mjs's own real-tree test.
// ---------------------------------------------------------------------------

test('AC-8: anti-patterns.html index lists exactly as many rows as its own body has entries', () => {
  const html = readRepoFile(ANTI_PATTERNS_HTML_PATH);
  const bodyEntries = countHtmlAntiPatternEntries(html);
  const indexRows = countHtmlIndexRows(html);

  assert.ok(bodyEntries > 0, 'expected a non-empty extraction of body entries before comparing to the index');
  assert.equal(
    indexRows,
    bodyEntries,
    `anti-patterns.html's index lists ${indexRows} rows but the body has ${bodyEntries} entries`
  );
});

// ---------------------------------------------------------------------------
// AC-8 (anti-patterns mirror) — the three new entries this phase actually
// added, pinned by id/title/"what to do instead" content.
// ---------------------------------------------------------------------------

test('AC-8: anti-patterns.html entry 11 (formatter-cmd-heuristic-inference) carries the real title and "what to do instead" guidance from docs/anti-patterns.md', () => {
  const html = readRepoFile(ANTI_PATTERNS_HTML_PATH);
  const section = linesBetween(
    html,
    /^\s*<h2 id="formatter-cmd-heuristic-inference">/,
    /^\s*<h2 id="r-sem-not-authorization">/
  );
  assert.ok(section !== undefined, 'expected an extractable formatter-cmd-heuristic-inference entry section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    html.includes(
      '<h2 id="formatter-cmd-heuristic-inference">11. Inferring <code>formatter_cmd</code>\'s value or invocation source outside its declared discovery chain</h2>'
    ),
    'expected the exact entry-11 heading'
  );
  assert.ok(
    normalized.includes(
      'always traceable to a human-authored declaration, never to environment sniffing'
    ),
    'expected the "Why it\'s forbidden" paragraph to state the non-heuristic traceability rationale'
  );
  assert.ok(
    normalized.includes(
      "Read <code>formatter_cmd</code> from <code>docs/context/methodology.md</code> frontmatter; when absent, read <code>package.json</code>'s <code>scripts.format</code>; when neither exists, record the omission explicitly and skip the formatting step"
    ),
    'expected the "What to do instead" paragraph to state the two-branch discovery chain plus recorded omission'
  );
});

test('AC-8: anti-patterns.html entry 12 (r-sem-not-authorization) carries the real title and "what to do instead" guidance from docs/anti-patterns.md', () => {
  const html = readRepoFile(ANTI_PATTERNS_HTML_PATH);
  const section = linesBetween(
    html,
    /^\s*<h2 id="r-sem-not-authorization">/,
    /^\s*<h2 id="dispute-for-formatting">/
  );
  assert.ok(section !== undefined, 'expected an extractable r-sem-not-authorization entry section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    html.includes(
      '<h2 id="r-sem-not-authorization">12. Treating an R-SEM finding as self-executing test-edit authorization</h2>'
    ),
    'expected the exact entry-12 heading'
  );
  assert.ok(
    normalized.includes(
      'read it as identifying what to fix in the implementation, never as license to edit the disputed test directly'
    ),
    'expected the "What to do instead" paragraph to forbid treating the finding as edit license'
  );
  assert.ok(
    normalized.includes(
      'If the implementer genuinely believes the test contradicts the PRD, open <code>TEST_CONTRACT_DISPUTE</code> instead of editing it.'
    ),
    'expected the "What to do instead" paragraph to name TEST_CONTRACT_DISPUTE as the correct channel'
  );
});

test('AC-8: anti-patterns.html entry 13 (dispute-for-formatting) carries the real title and "what to do instead" guidance from docs/anti-patterns.md', () => {
  const html = readRepoFile(ANTI_PATTERNS_HTML_PATH);
  const section = linesBetween(
    html,
    /^\s*<h2 id="dispute-for-formatting">/,
    /^\s*<h2 id="how-to-add">/
  );
  assert.ok(section !== undefined, 'expected an extractable dispute-for-formatting entry section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    html.includes(
      '<h2 id="dispute-for-formatting">13. Opening <code>TEST_CONTRACT_DISPUTE</code> for formatting</h2>'
    ),
    'expected the exact entry-13 heading'
  );
  assert.ok(
    normalized.includes(
      "A formatting-only mismatch is resolved by the test-formatting prevention preflight (<code>/relay-write-test</code>'s formatter invocation, <code>/relay-implement</code>'s preflight), never by disputing the test's contract."
    ),
    'expected the "What to do instead" paragraph to name the prevention/preflight mechanism as the correct fix'
  );
  assert.ok(
    normalized.includes(
      'Reserve <code>TEST_CONTRACT_DISPUTE</code> exclusively for genuine semantic contradictions with the PRD.'
    ),
    'expected the "What to do instead" paragraph to reserve the dispute channel for semantic contradictions only'
  );
});

test('AC-8: anti-patterns.html index carries all 3 new index rows with matching hrefs and anchor text', () => {
  const html = readRepoFile(ANTI_PATTERNS_HTML_PATH);
  const indexStart = html.indexOf('<ol>');
  const indexEnd = html.indexOf('</ol>', indexStart);
  assert.ok(indexStart !== -1 && indexEnd !== -1, 'expected an extractable leading index <ol>...</ol>');
  const index = html.slice(indexStart, indexEnd);

  assert.ok(
    index.includes(
      '<li><a href="#formatter-cmd-heuristic-inference">Inferring <code>formatter_cmd</code>\'s value or invocation source outside its declared discovery chain</a></li>'
    ),
    'expected the entry-11 index row'
  );
  assert.ok(
    index.includes(
      '<li><a href="#r-sem-not-authorization">Treating an R-SEM finding as self-executing test-edit authorization</a></li>'
    ),
    'expected the entry-12 index row'
  );
  assert.ok(
    index.includes(
      '<li><a href="#dispute-for-formatting">Opening <code>TEST_CONTRACT_DISPUTE</code> for formatting</a></li>'
    ),
    'expected the entry-13 index row'
  );
});

// ---------------------------------------------------------------------------
// AC-8 (docs/decisions.md governance entries) — the two new dated entries,
// append-only (the immediately preceding entry 89 heading occurs exactly
// once — the append-only invariant), mirroring docs-sync-phase4.test.mjs's
// AC-A4 idiom. The COUNT parity between this file and its HTML mirror is
// EXISTING_TEST_COVERS (decisions-mirror.test.mjs's real-repository test);
// this test instead pins the two entries' actual CONTENT, which the count
// check never inspects.
// ---------------------------------------------------------------------------

test("AC-8: decisions.md carries the two new [2026-08-27] entries (Preflight; R-SEM prose), appended without disturbing the immediately preceding [2026-08-26] entry", () => {
  const content = readRepoFile(DECISIONS_MD_PATH);

  assert.ok(
    content.includes(
      '## [2026-08-27] Test-file formatting is normalized before base_commit/diff_target capture'
    ),
    'expected the new Preflight decision heading'
  );
  assert.ok(
    content.includes(
      '## [2026-08-27] Reviewer findings are never self-executing test-edit authorization'
    ),
    'expected the new R-SEM prose decision heading'
  );

  const priorEntryOccurrences = (
    content.match(/^## \[2026-08-26\] Test-formatting prevention runs at the command layer, never inside `test-writer`/gm) || []
  ).length;
  assert.equal(
    priorEntryOccurrences,
    1,
    `expected the immediately-preceding [2026-08-26] entry to occur exactly once (append-only invariant), found ${priorEntryOccurrences}`
  );
});

test('AC-8: decisions.html mirrors both new entries as numbered entries 90-91 (kv-block Date/Context/Decision/Reason shape) plus their index rows', () => {
  const html = readRepoFile(DECISIONS_HTML_PATH);

  assert.ok(
    html.includes(
      '<h3 id="preflight-baseline-normalization">90. Test-file formatting is normalized before <code>base_commit</code>/<code>diff_target</code> capture</h3>'
    ),
    'expected entry 90\'s exact heading'
  );
  assert.ok(
    html.includes(
      '<h3 id="r-sem-prose-clarification">91. Reviewer findings are never self-executing test-edit authorization</h3>'
    ),
    'expected entry 91\'s exact heading'
  );

  const entry90Section = linesBetween(
    html,
    /^\s*<h3 id="preflight-baseline-normalization">/,
    /^\s*<h3 id="r-sem-prose-clarification">/
  );
  assert.ok(entry90Section !== undefined, 'expected an extractable entry-90 kv-block section');
  assert.match(entry90Section, /<dt>Date<\/dt><dd>2026-08-27<\/dd>/, 'expected entry 90\'s Date row');

  const entry91Section = linesBetween(
    html,
    /^\s*<h3 id="r-sem-prose-clarification">/,
    /^\s*<h2 id="how-to-add">/
  );
  assert.ok(entry91Section !== undefined, 'expected an extractable entry-91 kv-block section');
  assert.match(entry91Section, /<dt>Date<\/dt><dd>2026-08-27<\/dd>/, 'expected entry 91\'s Date row');

  assert.ok(
    html.includes(
      '<li><a href="#preflight-baseline-normalization">Test-file formatting is normalized before base_commit/diff_target capture</a></li>'
    ),
    'expected entry 90\'s index row'
  );
  assert.ok(
    html.includes(
      '<li><a href="#r-sem-prose-clarification">Reviewer findings are never self-executing test-edit authorization</a></li>'
    ),
    'expected entry 91\'s index row'
  );
});

// ---------------------------------------------------------------------------
// AC-8 (release cut) — documentation/changelog.html carries the 0.35.0
// release heading and a genuinely fresh, empty Unreleased block above it.
// Deliberately does NOT read plugin.json's LIVE version field — mirroring
// docs-sync-phase4.test.mjs's 2026-07-29 EXISTING_TEST_UPDATED lifecycle
// lesson, a literal live-version equality is release-cut-fragile (it goes
// red the moment the NEXT release bumps plugin.json again) and is already
// covered, non-fragile, by figma-track-phase1.test.mjs's real-tree
// runVersionParityCheck() assertion. This test instead asserts the
// PERMANENT, DATED historical bump prose, which never changes once written.
// ---------------------------------------------------------------------------

test('AC-8: changelog.html cuts the 0.35.0 release heading with exactly one, genuinely empty, fresh Unreleased block above it', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  assert.ok(
    content.includes('<h2 id="v0-35-0">0.35.0 &#8212; 2026-08-27</h2>'),
    'expected the 0.35.0 release heading'
  );

  const unreleasedCount = (content.match(/<h2 id="unreleased">/g) || []).length;
  assert.equal(unreleasedCount, 1, `expected exactly one fresh Unreleased heading, found ${unreleasedCount}`);

  const between = linesBetween(
    content,
    /^\s*<h2 id="unreleased">Unreleased<\/h2>/,
    /^\s*<h2 id="v0-35-0">/
  );
  // Extraction must succeed (both boundaries found) BEFORE checking the
  // captured region is empty — a missing boundary must never be silently
  // read as "zero content", which would let a deleted heading pass too.
  assert.ok(
    between !== undefined,
    'expected an extractable region between the Unreleased heading and the 0.35.0 release heading'
  );
  assert.equal(
    between.trim(),
    '',
    'expected zero accumulated content between the freshly-cut Unreleased heading and the new 0.35.0 release heading'
  );
});

test('AC-8: changelog.html\'s 0.35.0 Changed list documents both new decisions.md mirrors (entries 90/91) plus the mandatory plugin.json version-bump line, in permanent dated prose', () => {
  const content = readRepoFile(CHANGELOG_PATH);
  const section = linesBetween(
    content,
    /^\s*<h2 id="v0-35-0">/,
    /^\s*<h2 id="v0-34-0">/
  );
  assert.ok(section !== undefined, 'expected an extractable 0.35.0 release section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes(
      'entry 90 mirrors the new <code>docs/decisions.md</code> (2026-08-27) decision "<a href="governance/decisions.html#preflight-baseline-normalization">Test-file formatting is normalized before <code>base_commit</code>/<code>diff_target</code> capture</a>"'
    ),
    'expected the Changed list to name entry 90\'s mirror'
  );
  assert.ok(
    normalized.includes(
      'entry 91 mirrors the new <code>docs/decisions.md</code> (2026-08-27) decision "<a href="governance/decisions.html#r-sem-prose-clarification">Reviewer findings are never self-executing test-edit authorization</a>"'
    ),
    'expected the Changed list to name entry 91\'s mirror'
  );
  assert.ok(
    normalized.includes(
      'version bumped <code>0.34.0</code> &rarr; <code>0.35.0</code> to match this release'
    ),
    'expected the Changed list to carry the mandatory plugin.json version-bump line'
  );
  assert.ok(
    normalized.includes('Plugin manifest bumped <code>0.34.0</code> &rarr; <code>0.35.0</code> per'),
    'expected the release-summary paragraph\'s permanent, dated historical bump sentence'
  );
});

test("AC-8: changelog.html's 0.35.0 Added list documents all 3 new anti-pattern mirrors with matching hrefs", () => {
  const content = readRepoFile(CHANGELOG_PATH);
  const section = linesBetween(
    content,
    /^\s*<h3 id="v0-35-0-added">Added<\/h3>/,
    /^\s*<h2 id="v0-34-0">/
  );
  assert.ok(section !== undefined, 'expected an extractable 0.35.0 "Added" section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes('href="governance/anti-patterns.html#formatter-cmd-heuristic-inference"'),
    'expected the Added list to link entry 11'
  );
  assert.ok(
    normalized.includes('href="governance/anti-patterns.html#r-sem-not-authorization"'),
    'expected the Added list to link entry 12'
  );
  assert.ok(
    normalized.includes('href="governance/anti-patterns.html#dispute-for-formatting"'),
    'expected the Added list to link entry 13'
  );
});
