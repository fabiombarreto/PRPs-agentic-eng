// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-15 The command document carries a marked, validating example for every new vocabulary item, the overlay declaration, the per-step/cause/continuation rules and the run-time codes table
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-18 Release cut 0.48.0 (the in-tree part: minor bump, changelog block that claims no installation, decision entry 107 in both mirrors; the install is the operator's step and is not testable in this tree)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-17 Suite stays green (covered by the corpus run and validate-registry.test.mjs themselves; nothing is asserted here)
/**
 * Phase 7 (release 0.48.0) of qa-runner-vocabulary-v4: the observables the existing release tests
 * (qa-run-release-cut, qa-run-release-site, qa-run-release-pages, qa-run-release-0-47-0) do not pin.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-7-release.plan.md
 *
 * Over the REAL files (read from disk, never edited), text plus the runner's own pure exports. Live properties are
 * derived from the runner and the manifest; history properties name the 0.48.0 section and decision 107 by their own
 * ids, which a later cut does not edit.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} t */
const collapse = (t) => t.replace(/\s+/g, ' ');

const runner = await import(pathToFileURL(resolve('plugins/relay/scripts/qa-run.mjs')).href);
const COMMAND = read('plugins/relay/commands/relay-qa-run.md');
const FLAT = collapse(COMMAND);
const CHANGELOG = read('documentation/changelog.html');
const DECISIONS_MD = read('docs/decisions.md');
const DECISIONS_HTML = read('documentation/governance/decisions.html');

/** @returns {{ driver: string, step: any }[]} every marked step example of the command doc, parsed */
function markedExamples() {
  return [...COMMAND.matchAll(/<!-- qa-step-example driver=(\w+) -->[ \t]*\n```json\n([\s\S]*?)\n```/g)].map((m) => ({ driver: m[1], step: JSON.parse(m[2]) }));
}

// ---------------------------------------------------------------------------
// AC-15: the command document
// ---------------------------------------------------------------------------

test('AC-15 each new vocabulary item has a marked browser example that the runner validates, found by what it demonstrates', () => {
  const examples = markedExamples().filter((e) => e.driver === 'browser');
  const find = (/** @type {(s: any) => boolean} */ pred) => examples.filter((e) => pred(e.step));

  const anchor = find((s) => s.action === 'click' && s.within?.anchor_text !== undefined);
  const roleOnly = find((s) => s.action === 'expect_visible' && s.within !== undefined && s.within.anchor_text === undefined && s.role !== undefined && s.name === undefined && s.name_prefix === undefined && s.text === undefined && s.index === undefined);
  const pattern = find((s) => s.action === 'expect_text' && s.pattern !== undefined);
  const validation = find((s) => s.action === 'click' && s.effect === 'validation');
  const write = find((s) => s.effect === 'write');
  for (const [label, found] of /** @type {[string, any[]][]} */ ([
    ['anchor_text', anchor],
    ['role-only presence', roleOnly],
    ['pattern', pattern],
    ['effect validation', validation],
  ])) {
    assert.equal(found.length, 1, `${label}: ${found.length} marked examples`);
    assert.equal(runner.validateStep('browser', found[0].step), null, `${label}: the doc example does not validate alone`);
  }
  assert.ok(write.length >= 1, 'the earlier effect write example was lost');
  assert.equal(pattern[0].step.contains, undefined, 'a pattern example carries no contains');
  const names = Array.isArray(runner.TEXT_PATTERN_NAMES) ? runner.TEXT_PATTERN_NAMES : Object.keys(runner.TEXT_PATTERN_NAMES);
  assert.ok(names.includes(pattern[0].step.pattern),'the pattern example names a pattern the runner supports');
  // Every marked example of the document, new and old, validates against the script it describes.
  for (const e of markedExamples()) assert.equal(runner.validateStep(e.driver, e.step), null, JSON.stringify(e.step));
});

test('AC-15 the validation-submit example needs, as the document says, an earlier fill whose value is in the manual steps: alone it is refused, after the fill it validates as a sequence', () => {
  const click = markedExamples().find((e) => e.step.effect === 'validation')?.step;
  assert.ok(click, 'the validation example is missing');
  const fill = { action: 'fill', role: 'textbox', name: 'E-mail', value: 'not-an-email' };
  const goto = { action: 'goto', path: '/p' };
  const manual = 'Type not-an-email in E-mail and press Enviar.';
  assert.equal(runner.validateValidationSubmits([goto, click], manual)?.code, 'PLAN_ENTRY_INVALID', 'a validation click with no earlier fill is refused');
  assert.equal(runner.validateValidationSubmits([goto, fill, click], manual), null, 'the documented fill-then-submit sequence is accepted');
  assert.equal(runner.validateValidationSubmits([goto, fill, click], 'Press Enviar.')?.code, 'PLAN_ENTRY_INVALID', 'a fill value the manual steps never state is refused');
});

test('AC-15 the overlay_handlers declaration is shown once, unmarked, and the runner accepts it (a write-effect twin is skipped for a non-dedicated role)', () => {
  const blocks = [...COMMAND.matchAll(/```json\n(\{ "overlay_handlers"[\s\S]*?)\n```/g)];
  assert.equal(blocks.length, 1, `expected one overlay_handlers example, found ${blocks.length}`);
  const decl = JSON.parse(blocks[0][1]).overlay_handlers;
  const ok = runner.classifyOverlayHandlers(decl, false);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.equal(ok.handlers.length, 1);
  assert.equal(ok.handlers[0].id, 'onboarding-tour');
  const write = runner.classifyOverlayHandlers([{ ...decl[0], effect: 'write' }], false);
  assert.equal(write.ok, true);
  assert.equal(write.handlers.length, 0);
  assert.equal(write.skipped.length, 1);
  assert.equal(new RegExp('<!-- qa-step-example[^>]*-->[ \\t]*\\n```json\\n\\{ "overlay_handlers"').test(COMMAND), false, 'the declaration is not a step and carries no step marker');
  // The numbers the document states are the runner's constants.
  assert.ok(FLAT.includes(`at most ${runner.OVERLAY_HANDLERS_MAX} entries`));
  assert.ok(FLAT.includes(`each handler runs at most ${runner.OVERLAY_HANDLER_TIMES} times per page`));
  assert.ok(FLAT.includes(`the dismissal click is bounded to ${runner.OVERLAY_DISMISS_TIMEOUT_MS / 1000} seconds`));
  assert.ok(FLAT.includes('These numbers are chosen, not measured'));
});

test('AC-15 the per-step validation, failure causes and continuation subsection exists once and states the rules and every closed cause', () => {
  const heading = '### Per-step validation, failure causes and continuation';
  const at = COMMAND.indexOf(heading);
  assert.ok(at >= 0, 'the subsection is missing');
  assert.equal(COMMAND.indexOf(heading, at + 1), -1, 'the subsection heading appears more than once');
  const end = COMMAND.indexOf('\n### ', at + heading.length);
  assert.ok(end > at, 'the subsection has no following heading');
  const section = collapse(COMMAND.slice(at, end));
  for (const token of [
    'a step gap, not a refusal of the entry',
    '`STEP_UNGROUNDED`',
    'not run after an ungrounded interaction',
    'is still `PLAN_ENTRY_INVALID` for the whole entry',
    '`STEP_NOT_PERFORMABLE`',
    'no Playwright error text or page text is ever written',
    'is a `fail` with cause `absent`',
    'A failed assertion does not end the case',
    'not run after a failed assertion',
  ]) assert.ok(section.includes(token), `the subsection does not state: ${token}`);
  for (const cause of runner.STEP_FAILURE_CAUSES) assert.ok(section.includes('`' + cause + '`'), `the subsection does not name the cause ${cause}`);
  // The sentences the phase replaced are gone.
  assert.equal(FLAT.includes('`effect` has one legal value'), false, 'the one-legal-value sentence is still present');
  assert.equal(FLAT.includes('because the script refuses such a step as `PLAN_ENTRY_INVALID`'), false, 'the plan-time refusal sentence is still present');
  assert.ok(FLAT.includes('`effect` has two legal values, `"write"` and `"validation"`'));
});

test('AC-15 the run-time codes table documents the three codes apart from the catalogue and the catalogue rows do not include them', () => {
  const header = '| Code | Outcome | Kind | Meaning |';
  assert.ok(COMMAND.includes(header), 'the run-time codes table is missing');
  for (const row of ['| `STEP_NOT_PERFORMABLE` | `blocked` | run-time gap |', '| `PLAN_ENTRY_INVALID` | `needs-human` | plan defect |', '| `OVERLAY_HANDLER_INVALID` | `blocked` | declaration defect |']) {
    assert.ok(COMMAND.includes(row), `the run-time table lacks the row ${row}`);
  }
  const catalogueRows = [...COMMAND.matchAll(/^\| `([A-Z_]+)` \| `(?:needs-human|blocked)` \| `(?:impossible|gap)` \|/gm)].map((m) => m[1]);
  assert.deepEqual(catalogueRows.sort(), Object.keys(runner.REASON_CATALOGUE).sort());
  assert.ok(FLAT.includes('a defect of the plan, not a decline of the case'));
  // The reworded catalogue sentence is documented and carried by the runner.
  assert.ok(runner.REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason.startsWith('a write or validation step names a role the kit does not declare dedicated;'));
  assert.ok(FLAT.includes('never declared: the runner refuses a write or validation step for a role the kit does not declare dedicated'));
});

// ---------------------------------------------------------------------------
// AC-18: the release cut
// ---------------------------------------------------------------------------

/** @param {string} v @returns {number[]} */
const semver = (v) => v.split('.').map(Number);

test('AC-18 the manifest declares 0.48.0 or a later release', () => {
  const version = String(JSON.parse(read('plugins/relay/.claude-plugin/plugin.json')).version);
  assert.match(version, /^\d+\.\d+\.\d+$/);
  const [a, b, c] = semver(version);
  const [x, y, z] = semver('0.48.0');
  assert.ok(a > x || (a === x && (b > y || (b === y && c >= z))), `the manifest declares ${version}, older than 0.48.0`);
});

test('AC-18 the 0.48.0 changelog section sits directly above 0.47.0, carries its own subsection ids and a real date, and the manifest-bump line names 0.47.0 to 0.48.0', () => {
  const from = CHANGELOG.indexOf('<h2 id="v0-48-0">');
  const to = CHANGELOG.indexOf('<h2 id="v0-47-0">');
  assert.ok(from !== -1 && to > from, 'the 0.48.0 section was not found directly above 0.47.0');
  assert.equal(CHANGELOG.indexOf('<h2', from + 1), to, 'a heading sits between 0.48.0 and 0.47.0');
  const section = CHANGELOG.slice(from, to);
  const head = /<h2 id="v0-48-0">0\.48\.0 &#8212; (\d{4}-\d{2}-\d{2})<\/h2>/.exec(section);
  assert.ok(head, 'the 0.48.0 heading is not "0.48.0 &#8212; YYYY-MM-DD"');
  const date = /** @type {RegExpExecArray} */ (head)[1];
  assert.ok(date >= '2026-10-22' && date <= new Date().toISOString().slice(0, 10), `the release date ${date} is outside 2026-10-22 and today`);
  const added = section.indexOf('<h3 id="v0-48-0-added">Added</h3>');
  const changed = section.indexOf('<h3 id="v0-48-0-changed">Changed</h3>');
  assert.ok(added !== -1 && changed > added, 'the Added subsection must come first and the Changed subsection after it');
  assert.ok((section.slice(added, changed).match(/<li>/g) || []).length >= 7, 'the Added list holds fewer than seven entries');
  const bumps = section.match(/<li><strong><code>plugins\/relay\/\.claude-plugin\/plugin\.json<\/code><\/strong>/g) || [];
  assert.equal(bumps.length, 1, `exactly one manifest-bump entry is required, found ${bumps.length}`);
  const flat = collapse(section);
  assert.ok(flat.includes('<code>0.47.0</code> &rarr; <code>0.48.0</code>'), 'the bump line does not name 0.47.0 and 0.48.0');
  assert.ok(flat.includes('relay/0.48.0/'), 'the bump line does not name the relay/0.48.0/ cache directory');
  for (const token of ['STEP_NOT_PERFORMABLE', 'anchor_text', 'overlay_handlers', 'OVERLAY_HANDLER_INVALID', '31 of the 87']) assert.ok(section.includes(token), `the 0.48.0 section lacks ${token}`);
});

test('AC-18 the 0.48.0 changelog section makes no claim that the release is installed: the install is the operator’s step', () => {
  const from = CHANGELOG.indexOf('<h2 id="v0-48-0">');
  const to = CHANGELOG.indexOf('<h2 id="v0-47-0">');
  assert.ok(from !== -1 && to > from);
  const text = CHANGELOG.slice(from, to).replace(/<[^>]+>/g, ' ');
  assert.ok(text.length > 500, 'the 0.48.0 section is unexpectedly short');
  assert.equal(/\binstalled\b/i.test(text), false, 'the 0.48.0 section claims an installation');
});

test('AC-18 decision 107 is registered once in docs/decisions.md with its fields and mirrored in decisions.html with an index row', () => {
  const heads = [...DECISIONS_MD.matchAll(/^## \[(\d{4}-\d{2}-\d{2})\] (The QA runner degrades by step and names every failure.*)$/gm)];
  assert.equal(heads.length, 1, `exactly one vocabulary v4 entry is required, found ${heads.length}`);
  assert.equal(heads[0][1], '2026-10-25');
  const start = /** @type {number} */ (heads[0].index);
  const marker = DECISIONS_MD.indexOf('<!-- Template for future entries:', start);
  const raw = DECISIONS_MD.slice(start, marker === -1 ? undefined : marker);
  const entry = collapse(raw);
  for (const label of ['**Context:**', '**Decision:**', '**Reason:**', '**Areas affected:**']) assert.ok(entry.includes(label), `the entry lacks ${label}`);
  for (const token of ['STEP_NOT_PERFORMABLE', 'PLAN_ENTRY_INVALID', 'OVERLAY_HANDLER_INVALID', 'overlay_handlers', 'anchor_text', 'effect: "validation"', 'chosen, not measured', '0.48.0']) assert.ok(entry.includes(token), `the entry does not state ${token}`);
  const items = raw.match(/^\d+\. \*\*/gm) || [];
  assert.equal(items.length, 8, `the Decision list must hold eight items, found ${items.length}`);
  assert.equal(/\bis installed\b|\bwas installed\b|\bhas been installed\b/i.test(entry), false, 'the entry claims an installation');

  // The mirror: one h3 numbered 107, one index row, a Date/Context/Decision/Reason block.
  const total = DECISIONS_MD.split('\n').filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
  assert.equal((DECISIONS_HTML.match(/<h3 id="/g) || []).length, total, 'decisions.html does not mirror every markdown entry');
  const h3 = DECISIONS_HTML.indexOf('<h3 id="qa-runner-vocabulary-v4">');
  assert.ok(h3 !== -1, 'the decision 107 heading is missing from decisions.html');
  assert.ok(DECISIONS_HTML.slice(h3).startsWith('<h3 id="qa-runner-vocabulary-v4">107. '), 'the decisions.html entry is not numbered 107');
  assert.ok(DECISIONS_HTML.includes('<li><a href="#qa-runner-vocabulary-v4">'), 'the decisions.html index row is missing');
  const page = DECISIONS_HTML.slice(h3, DECISIONS_HTML.indexOf('<h2 id="how-to-add">', h3));
  for (const s of ['<dt>Date</dt><dd>2026-10-25</dd>', '<dt>Context</dt>', '<dt>Decision</dt>', '<dt>Reason</dt>', 'OVERLAY_HANDLER_INVALID', 'overlay_handlers']) assert.ok(page.includes(s), `decisions.html entry 107 lacks ${s}`);
  assert.equal(((page.match(/<ol>[\s\S]*?<\/ol>/) || [''])[0].match(/<li>/g) || []).length, 8, 'the html Decision list must hold eight items');
});
