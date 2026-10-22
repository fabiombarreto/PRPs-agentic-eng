// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-25 Release cut (the in-tree part: minor bump, changelog, documentation; the install is the operator's step after merge and is not testable in this tree)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-24 Suite stays green (the cut leaves the check count and the corpus intact; covered by validate-registry.test.mjs and the corpus run itself)
/**
 * Phase 8 (release cut 0.47.0) of qa-runner-ai-executable-steps: the observables the existing release tests
 * (qa-run-release-cut, qa-run-release-site, qa-run-release-pages) do not pin.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-8-release-cut.plan.md
 *
 * Over the REAL files (read from disk, never edited), text only. Live properties are derived from the runner's
 * exports and from docs/decisions.md; history properties name the 0.47.0 section by its own id, which a later
 * cut does not edit.
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

const runner = await import(pathToFileURL(resolve('plugins/relay/scripts/qa-run.mjs')).href);
const SCRIPTS = read('documentation/reference/scripts.html');
const CHANGELOG = read('documentation/changelog.html');
const STATUS = read('documentation/roadmap/status.html');
const DECISIONS_MD = read('docs/decisions.md');

/** @param {string} name @returns {string} the dd of the named row inside the qa-run.mjs entry of scripts.html */
function qaRunRow(name) {
  const from = SCRIPTS.indexOf('<h2 id="qa-run">');
  const to = SCRIPTS.indexOf('<h2 id="qa-seed">');
  assert.ok(from !== -1 && to > from, 'the qa-run.mjs entry was not found on scripts.html');
  const entry = SCRIPTS.slice(from, to);
  const start = entry.indexOf(`<dt>${name}</dt><dd>`);
  assert.ok(start !== -1, `the ${name} row is missing from the qa-run.mjs entry`);
  return entry.slice(start, entry.indexOf('</dd>', start));
}

test('AC-25 the scripts page Classification row names every runner-owned reason code the runner exports, and the impossible and gap counters', () => {
  const codes = runner.RUNNER_OWNED_REASON_CODES;
  assert.ok(Array.isArray(codes) && codes.length >= 1, 'the runner exports no runner-owned reason codes');
  const row = qaRunRow('Classification');
  for (const code of codes) assert.ok(row.includes(`<code>${code}</code>`), `the Classification row does not name the runner-owned code ${code}`);
  assert.equal(row.includes('<code>PARTIAL_REMAINDER</code> is runner-owned'), false, 'the stale one-code sentence is still present');
  assert.ok(row.includes('<code>needs_human_impossible</code>') && row.includes('<code>needs_human_gap</code>'), 'the step counters of the impossible and gap classes are not named');
});

test('AC-25 the scripts page states the real halt for an unresolvable Playwright, not a crash-free claim', () => {
  const row = qaRunRow('Dependencies');
  assert.ok(row.includes('<code>FAILED_PLAYWRIGHT_UNAVAILABLE</code>'), 'the Dependencies row does not name FAILED_PLAYWRIGHT_UNAVAILABLE');
  assert.ok(/stderr/.test(row) && /exits 1/.test(row), 'the Dependencies row does not describe the stderr message and the exit status 1');
  assert.ok(/never installs anything/.test(row), 'the Dependencies row does not say the runner installs nothing');
  assert.equal(SCRIPTS.includes('never a crash'), false, 'the stale "never a crash" sentence is still on the scripts page');
});

test('AC-25 the 0.47.0 changelog section makes no claim that the release is installed and carries exactly one manifest-bump line from 0.46.0 to 0.47.0', () => {
  const from = CHANGELOG.indexOf('<h2 id="v0-47-0">');
  const to = CHANGELOG.indexOf('<h2 id="v0-46-0">');
  assert.ok(from !== -1 && to > from, 'the 0.47.0 section was not found directly above 0.46.0');
  const section = CHANGELOG.slice(from, to);
  const intro = section.slice(0, section.indexOf('<h3 id="v0-47-0-added">'));
  assert.equal(/\binstalled\b/i.test(intro.replace(/<[^>]+>/g, ' ')), false, 'the 0.47.0 intro claims an installation');
  const bumps = section.match(/<li><strong><code>plugins\/relay\/\.claude-plugin\/plugin\.json<\/code><\/strong>/g) || [];
  assert.equal(bumps.length, 1, `exactly one manifest-bump entry is required in the 0.47.0 section, found ${bumps.length}`);
  const flat = section.replace(/\s+/g, ' ');
  assert.ok(flat.includes('<code>0.46.0</code> &rarr; <code>0.47.0</code>'), 'the bump line does not name 0.46.0 and 0.47.0');
  assert.ok(flat.includes('relay/0.47.0/'), 'the bump line does not name the relay/0.47.0/ cache directory');
});

test('AC-25 the newest decision entry of docs/decisions.md claims no installation and carries its five fields', () => {
  const heads = [...DECISIONS_MD.matchAll(/^## \[(\d{4}-\d{2}-\d{2})\] .*$/gm)];
  const dated = heads.filter((h) => h[1] === '2026-10-22');
  assert.equal(dated.length, 1, `exactly one 2026-10-22 entry is required, found ${dated.length}`);
  const start = /** @type {number} */ (dated[0].index);
  const marker = DECISIONS_MD.indexOf('<!-- Template for future entries:', start);
  const entry = DECISIONS_MD.slice(start, marker === -1 ? undefined : marker).replace(/\s+/g, ' ');
  for (const label of ['**Context:**', '**Decision:**', '**Reason:**', '**Areas affected:**']) assert.ok(entry.includes(label), `the entry lacks ${label}`);
  assert.equal(/\bis installed\b|\bwas installed\b|\bhas been installed\b/i.test(entry), false, 'the decision entry claims an installation');
});

test('AC-25 the status page states the number of decisions docs/decisions.md holds and lists the feature once', () => {
  const total = DECISIONS_MD.split('\n').filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
  const stated = /<code>decisions\.md<\/code> [^0-9]*(\d+) recorded decisions/.exec(STATUS);
  assert.ok(stated, 'the status page does not state a decision count');
  assert.equal(Number(/** @type {RegExpExecArray} */ (stated)[1]), total, 'the status page decision count differs from docs/decisions.md');
  assert.equal(STATUS.split('<code>qa-runner-ai-executable-steps</code></td>').length - 1, 1, 'the feature row must occur exactly once on the status page');
});
