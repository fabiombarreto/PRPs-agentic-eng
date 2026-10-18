// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-17 The suite stays green (the release cut is lock-step: the manifest, the first released changelog heading and the README name one version, and the Unreleased block is one fresh heading above the release; the check count is not touched by a cut)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the release block records what the release leaves unchanged and claims no installation, which is the operator's step and is not part of this tree)
/**
 * Phase 7 (release cut), the manifest, the changelog and the README, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-7-release-cut.plan.md
 *              (AC-A1 the manifest, the first released heading and the README name one version, with the id and a
 *              real date; AC-A2 one fresh Unreleased above the release, the three entries it held moved and not
 *              copied, the section 7.5 manifest-bump line)
 *
 * Over the REAL manifest, changelog and README (read from disk, never edited), text only, no browser, no child
 * process. Two kinds of assertion, on purpose:
 *   - LIVE properties are derived from plugins/relay/.claude-plugin/plugin.json at test time (the id of the first
 *     released section, the version the README states), so the next cut turns nothing red by itself: both sides move
 *     together or the test says which one did not.
 *   - HISTORY properties (the 0.46.0 section: its three carried-over entries, its manifest-bump line, its Added
 *     list, the absence of an install claim) name that section by its own id. A released section is not edited by a
 *     later cut, so they stay true after 0.47.0.
 *
 * What is NOT pinned, and why: that the Unreleased block is empty (it accumulates entries between cuts, so an
 * empty-block pin would turn red on the first unrelated entry); the SHA-256 of any frozen product file (a property
 * of this feature's diff, covered where it already is: auth-minted-session.test.mjs and qa-run-remint-decision.test.mjs);
 * that the plugin was installed (operator-owned, outside this tree).
 *
 * The comparison "the manifest equals the first released heading" is the version-parity check itself and is
 * asserted by figma-track-phase1.test.mjs and version-parity.test.mjs; it is not repeated here.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PLUGIN_JSON = 'plugins/relay/.claude-plugin/plugin.json';
const CHANGELOG_FILE = 'documentation/changelog.html';
const README_FILE = 'README.md';

/**
 * QA_V2P7_ROOT overlays the real tree for a mutation control: a file that exists under that root replaces the
 * real one, every other file is the real tree's; unset, the real tree is read.
 * @param {string} rel @returns {string} the file with LF line endings
 */
function read(rel) {
  const overlay = process.env.QA_V2P7_ROOT ? resolve(process.env.QA_V2P7_ROOT, rel) : null;
  const file = overlay !== null && existsSync(overlay) ? overlay : resolve(rel);
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

const ENTITIES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', rarr: '→', ge: '≥', le: '≤', nbsp: ' ' });
/** @param {string} html @returns {string} the visible text, entities decoded and whitespace collapsed */
function htmlText(html) {
  return html
    .replace(/<\/?(?:dt|dd|dl|p|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|div|pre|br|section)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (e, name) => ENTITIES[name] ?? e)
    .replace(/\s+/g, ' ')
    .trim();
}

const PLUGIN_VERSION = String(JSON.parse(read(PLUGIN_JSON)).version);
const CHANGELOG = read(CHANGELOG_FILE);
const README = read(README_FILE);

const H2 = [...CHANGELOG.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)].map((m) => ({ id: m[1], text: m[2].trim(), at: /** @type {number} */ (m.index), end: /** @type {number} */ (m.index) + m[0].length }));
const RELEASES = H2.filter((h) => h.id !== 'unreleased' && /^\d+\.\d+\.\d+/.test(h.text));

/** @param {{ end: number }} heading @returns {string} the markup from the end of the heading to the next h2, or the end of the page */
function sectionAfter(heading) {
  const next = CHANGELOG.indexOf('<h2', heading.end);
  return CHANGELOG.slice(heading.end, next === -1 ? CHANGELOG.length : next);
}
/** @param {string} id @returns {{ id: string, text: string, at: number, end: number }} */
function headingOf(id) {
  const found = H2.filter((h) => h.id === id);
  assert.equal(found.length, 1, `exactly one <h2 id="${id}"> is required, found ${found.length}`);
  return found[0];
}
/** @param {string} markup @returns {string[]} the visible text of every list item */
const itemsOf = (markup) => [...markup.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => htmlText(m[1]));

// ---------------------------------------------------------------------------
// The manifest, the README and the first released section (live, derived)
// ---------------------------------------------------------------------------

test('AC-A1 the README states the version the manifest declares, once, in the sentence that names plugins/relay', () => {
  const stated = [...README.matchAll(/`plugins\/relay`\s+\(version\s+(\d+\.\d+\.\d+),\s+per\s+its\s+`plugin\.json`\)/g)].map((m) => m[1]);
  assert.equal(stated.length, 1, `README.md must state the plugin version exactly once as "(version X.Y.Z, per its \`plugin.json\`)", found ${stated.length}`);
  assert.equal(stated[0], PLUGIN_VERSION, `README.md says ${stated[0]} but plugins/relay/.claude-plugin/plugin.json declares ${PLUGIN_VERSION}: no check reads the README, so a release cut must bump it by hand`);
});

test('AC-A1 the first released changelog section carries the id of the manifest version and a real date that is neither in the future nor before the release below it', () => {
  assert.ok(RELEASES.length >= 2, 'the changelog must hold at least two released sections');
  const [first, previous] = RELEASES;
  assert.equal(first.id, `v${PLUGIN_VERSION.replaceAll('.', '-')}`, `the first released section is <h2 id="${first.id}"> but the manifest declares ${PLUGIN_VERSION}: its id must be v${PLUGIN_VERSION.replaceAll('.', '-')}`);

  const shape = /^(\d+\.\d+\.\d+) (?:&#8212;|—) (\d{4}-\d{2}-\d{2})$/.exec(first.text);
  assert.ok(shape, `the heading text must be "X.Y.Z &#8212; YYYY-MM-DD", found: ${first.text}`);
  const date = /** @type {RegExpExecArray} */ (shape)[2];
  assert.equal(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10), date, `${date} is not a calendar date`);
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(date <= today, `the release date ${date} is in the future (today is ${today})`);
  const before = /(\d{4}-\d{2}-\d{2})$/.exec(previous.text);
  assert.ok(before, `the release below does not end in a date: ${previous.text}`);
  assert.ok(date >= /** @type {RegExpExecArray} */ (before)[1], `the release date ${date} precedes the release below it (${/** @type {RegExpExecArray} */ (before)[1]})`);
});

test('AC-A2 there is exactly one Unreleased heading, it opens the page above every release, its block is well formed, and nothing it lists is also listed in the first release', () => {
  assert.equal(H2.filter((h) => h.id === 'unreleased').length, 1, 'exactly one <h2 id="unreleased"> is required');
  assert.equal(H2[0].id, 'unreleased', `the first <h2> of the page must be Unreleased, found id ${H2[0].id}`);
  assert.equal(H2[0].text, 'Unreleased');
  assert.ok(RELEASES.length >= 1, 'the changelog must hold a released section');
  // The first <h2 of the page after Unreleased, with an id or without one, is the first released section: nothing
  // splits Unreleased from the release it sits above, so a stray heading (or a cut that left one) is caught here.
  const next = CHANGELOG.indexOf('<h2', H2[0].end);
  assert.equal(next, RELEASES[0].at, `the heading after Unreleased must be the first released section (<h2 id="${RELEASES[0].id}">), found: ${CHANGELOG.slice(next, next + 60)}`);

  // Entries accumulate here between cuts, so the block is never pinned empty. It must be well formed: subsection ids
  // of its own, and a bare block carries the placeholder, so a cut that moved the entries without writing the fresh
  // block is caught.
  const block = sectionAfter(H2[0]);
  for (const id of block.matchAll(/\bid="([^"]+)"/g)) {
    assert.ok(id[1].startsWith('unreleased'), `an id inside the Unreleased block must start with "unreleased", found ${id[1]}`);
  }
  if (!block.includes('<li>')) assert.ok(htmlText(block).includes('Nothing yet.'), 'a bare Unreleased block must carry the "Nothing yet." placeholder');

  // A cut moves the entries. Nothing the Unreleased block lists may also be listed in the first release.
  const released = new Set(itemsOf(sectionAfter(RELEASES[0])));
  for (const item of itemsOf(block)) assert.equal(released.has(item), false, `an Unreleased entry is also in the first release (copied, not moved): ${item.slice(0, 80)}`);
});

test('AC-A2 the subsections of the first released section carry its own id, use the conventional subsection names, and their ids are unique on the page', () => {
  const release = sectionAfter(RELEASES[0]);
  const subsections = [...release.matchAll(/<h3\s+id="([^"]+)"[^>]*>([^<]*)<\/h3>/g)];
  assert.ok(subsections.length >= 1, 'the first release has no subsection');
  for (const [, id, name] of subsections) {
    assert.ok(id.startsWith(`${RELEASES[0].id}-`), `a subsection id of the first release must start with ${RELEASES[0].id}-, found ${id}`);
    assert.ok(['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed'].includes(name.trim()), `an unconventional subsection name: ${name}`);
    assert.equal(CHANGELOG.split(`id="${id}"`).length - 1, 1, `the id ${id} is not unique on the page`);
  }
});

// ---------------------------------------------------------------------------
// The 0.46.0 section (history, named by its own id)
// ---------------------------------------------------------------------------

const CARRIED_OVER = [
  'roadmap/status.html — synced with the PRDs after the 2026-10-09 dogfoods.',
  'governance/decisions.html — entry 105 registers the separation from the upstream Wirasm repository',
  'roadmap/status.html — added the “Planned: separate relay from the upstream repository” section',
];

test('AC-A2 the 0.46.0 section sits directly above 0.45.0, with an Added and a Changed subsection in that order, and the three entries the Unreleased block held are in its Changed list exactly once', () => {
  const release = headingOf('v0-46-0');
  const below = headingOf('v0-45-0');
  assert.ok(release.text.startsWith('0.46.0'), release.text);
  assert.equal(H2.indexOf(below) - H2.indexOf(release), 1, 'a heading sits between 0.46.0 and 0.45.0');

  const body = sectionAfter(release);
  const added = body.indexOf('<h3 id="v0-46-0-added">Added</h3>');
  const changed = body.indexOf('<h3 id="v0-46-0-changed">Changed</h3>');
  assert.ok(added !== -1 && changed > added, 'the Added subsection must come first and the Changed subsection after it');
  const changedList = htmlText(body.slice(changed));
  const everyItem = itemsOf(CHANGELOG);
  for (const start of CARRIED_OVER) {
    assert.equal(everyItem.filter((i) => i.startsWith(start)).length, 1, `the carried-over entry must occur exactly once on the page: ${start}`);
    assert.ok(changedList.includes(start), `the carried-over entry is not in the 0.46.0 Changed subsection: ${start}`);
    assert.equal(htmlText(body.slice(0, changed)).includes(start), false, `the carried-over entry is in the Added subsection: ${start}`);
  }
});

test('AC-A2 the 0.46.0 Changed list carries the section 7.5 manifest-bump line, naming the manifest, the two versions and the cache directory', () => {
  const body = sectionAfter(headingOf('v0-46-0'));
  const changed = htmlText(body.slice(body.indexOf('<h3 id="v0-46-0-changed">')));
  const bump = itemsOf(body).filter((i) => i.startsWith('plugins/relay/.claude-plugin/plugin.json'));
  assert.equal(bump.length, 1, `exactly one list item must start with the manifest path, found ${bump.length}`);
  assert.ok(changed.includes(bump[0]), 'the manifest-bump line is not in the Changed subsection');
  assert.ok(bump[0].includes('version bumped 0.45.0 → 0.46.0'), bump[0]);
  assert.ok(bump[0].includes('relay/0.46.0/'), bump[0]);
});

test('AC-A2 the 0.46.0 Added list records each capability the release ships, one entry each, in the order of the phases', () => {
  const body = sectionAfter(headingOf('v0-46-0'));
  const addedBlock = body.slice(body.indexOf('<h3 id="v0-46-0-added">'), body.indexOf('<h3 id="v0-46-0-changed">'));
  const labels = [...addedBlock.matchAll(/<li><strong>([^<]+)<\/strong>/g)].map((m) => htmlText(m[1]));
  assert.deepEqual(labels, [
    'Reason-code catalogue and pre-run classification',
    'Stable grounding and text candidates',
    'Redaction precision and run-evidence privacy',
    'A request without the session, an input value, absence and state',
    'Grounding after an interaction',
    'Request count, bounded re-mint and refresh role set',
    'Validation suite',
  ]);
});

test('AC-14 the 0.46.0 section makes no claim that the release was installed: the install is the operator’s step and is not part of this tree', () => {
  const text = htmlText(sectionAfter(headingOf('v0-46-0')));
  assert.ok(text.length > 500, 'the 0.46.0 section is unexpectedly short');
  assert.equal(/\binstalled\b/i.test(text), false, 'the 0.46.0 section claims an installation');
  // The release states what it leaves unchanged, which is what lets a kit generated by 0.45.0 stay current.
  assert.ok(text.includes('KIT_TEMPLATE_ID'), 'the 0.46.0 section does not say that the login template stamp is unchanged');
});
