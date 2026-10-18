// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-17 The suite stays green (the validation pages describe the opt-in rule sets that extend qa-run-contract and auth-secrecy instead of a new check, quote findings the checks really emit, and state the check count the registry holds)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-5 Run evidence is ignored and the ignore is proven (the findings the validation page quotes for the run-evidence rules are the real ones)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-6 Every non-executed case carries a catalogued code (the validation page states the size of the catalogue and the codes the check requires, against the runner)
/**
 * Phase 7 (release cut), the validation pages and the documentation-site registration, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-7-release-cut.plan.md
 *              (AC-A8 the two validation pages describe the rule sets, quote real findings and state the real check
 *              count; AC-A9 the search index names the 0.46.0 behavior, every id added is unique and every link
 *              the pages added resolves)
 *
 * Over the REAL pages, checks and inputs (read from disk, never edited). The findings the page quotes are
 * produced by calling the REAL checks (checkAuthSecrecy, checkQaRunContract) on one anchored mutation of an
 * in-memory copy of the REAL runner and command document: the page is compared with what the check emits, not
 * with a copy of its message. No browser, no child process.
 *
 * Not pinned on purpose: the unit-test counts the page states for the two checks (a count of another file's tests
 * turns red for any later test added to that file, and the two numbers were read from the real test runs by the
 * plan's own validation); the decision and anti-pattern counts of the roadmap page (they turn red on every
 * unrelated registration of a decision, and the roadmap row is expected to change when the dogfood closes);
 * the wording of the search-index excerpts beyond one discriminating phrase each.
 *
 * QA_V2P7_ROOT overlays the real tree for every PAGE read (a mutation control: a file that exists under that root
 * replaces the real one, every other file is the real tree's); the checks, the runner and the packaged policy are
 * always the real ones. Unset, the real tree is read.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

import { checkQaRunContract } from './qa-run-contract.mjs';
import { checkAuthSecrecy } from './auth-secrecy.mjs';
import { REASON_CATALOGUE, RUN_IGNORE_RULES } from '../../../plugins/relay/scripts/qa-run.mjs';

/** @param {string} rel @returns {string} a file of the real tree, LF line endings */
const readReal = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} rel @returns {string} a page (the overlay under QA_V2P7_ROOT when it has one), LF line endings */
function read(rel) {
  const overlay = process.env.QA_V2P7_ROOT ? resolve(process.env.QA_V2P7_ROOT, rel) : null;
  const file = overlay !== null && existsSync(overlay) ? overlay : resolve(rel);
  return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

const ENTITIES = /** @type {Record<string, string>} */ ({ amp: '&', lt: '<', gt: '>', quot: '"', rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d', mdash: '\u2014', ndash: '\u2013', rarr: '\u2192', ge: '\u2265', le: '\u2264', nbsp: ' ' });
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
/** @param {string} text @param {string} from @param {string} next @returns {string} */
function region(text, from, next) {
  const a = text.indexOf(from);
  assert.ok(a !== -1, `start marker not found: ${from}`);
  const b = text.indexOf(next, a + from.length);
  return text.slice(a, b === -1 ? text.length : b);
}
const CARDINAL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const SCREAMING = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;

const CHECKS_PAGE = read('documentation/reference/validation-checks.html');
const SUITE_PAGE = read('documentation/guide/validation-suite.html');
const AUTH_SECTION = region(CHECKS_PAGE, '<h2 id="auth-secrecy"', '<h2 ');
const CONTRACT_SECTION = region(CHECKS_PAGE, '<h2 id="qa-run-contract"', '<h2 ');

// ---------------------------------------------------------------------------
// AC-A8: the validation pages
// ---------------------------------------------------------------------------

test('AC-A8 the findings the validation page quotes for the run-evidence rules of auth-secrecy and the prefix rules of qa-run-contract are what the real checks emit, with their file and line', () => {
  const runner = readReal('plugins/relay/scripts/qa-run.mjs');
  const command = readReal('plugins/relay/commands/relay-qa-run.md');
  const secrecy = {
    ignoreText: readReal('plugins/relay/resources/auth-kit.gitignore'),
    scriptText: readReal('plugins/relay/scripts/auth-kit-secrecy.mjs'),
    policyText: readReal('plugins/relay/resources/redaction-policy.md'),
    requireRunEvidence: true,
  };
  const page = htmlText(AUTH_SECTION);
  const contractPage = htmlText(CONTRACT_SECTION);

  /** @param {{ message: string, file: string, line: number }[]} findings @param {string} message @returns {string} the page line of the one finding with that message */
  const lineOf = (findings, message) => {
    const found = findings.filter((f) => f.message === message);
    assert.equal(found.length, 1, `the check must emit exactly one finding "${message}", found ${found.length}: ${JSON.stringify(findings)}`);
    return `${found[0].file}:${found[0].line} \u2014 ${found[0].message}`;
  };

  // auth-secrecy: a runner whose ignore rules are not defined as the check reads them, and one that hides a tracked file.
  const renamed = checkAuthSecrecy({ ...secrecy, runnerScriptText: runner.replace('export const RUN_IGNORE_RULES', 'export const RUN_IGNORE_RULES_RENAMED') });
  assert.equal(renamed.ok, false);
  const hiding = checkAuthSecrecy({
    ...secrecy,
    runnerScriptText: runner.replace(/export const RUN_IGNORE_RULES = Object\.freeze\(\[([^\]]*)\]\);/, (_, inner) => `export const RUN_IGNORE_RULES = Object.freeze([${inner}, 'results.json']);`),
  });
  assert.equal(hiding.ok, false);
  for (const line of [
    lineOf(renamed.findings, 'runner script does not define: export const RUN_IGNORE_RULES = Object.freeze([...]);'),
    lineOf(hiding.findings, 'runner ignore rules hide the tracked side: results.json'),
  ]) {
    assert.ok(page.includes(line), `the auth-secrecy section of validation-checks.html does not quote the finding: ${line}`);
  }

  // qa-run-contract: a runner that lost a prefix halt and a command that lost the flag.
  const prefix = (/** @type {Record<string, string>} */ over) => checkQaRunContract({ scriptText: runner, commandText: command, results: [], requirePrefix: true, ...over });
  const lostHalt = prefix({ scriptText: runner.split('GROUND_PREFIX_INVALID').join('GROUND_PREFIX_RENAMED') });
  const lostFlag = prefix({ commandText: command.split('--prefix').join('--renamed') });
  assert.equal(lostHalt.ok, false);
  assert.equal(lostFlag.ok, false);
  for (const line of [
    lineOf(lostHalt.findings, 'prefix: the runner script must contain the named halt GROUND_PREFIX_INVALID'),
    lineOf(lostFlag.findings, 'prefix: the runner command must document the ground prefix: it must contain --prefix'),
  ]) {
    assert.ok(contractPage.includes(line), `the qa-run-contract section of validation-checks.html does not quote the finding: ${line}`);
  }
});

test('AC-A8 the two sections that gained rule sets state a unit-test count that their summary row repeats, name a test file that exists, and the stale "none yet" sentence is gone', () => {
  for (const [id, section] of [
    ['auth-secrecy', AUTH_SECTION],
    ['qa-run-contract', CONTRACT_SECTION],
  ]) {
    const counts = [...htmlText(section).matchAll(/Unit tests \((\d+)\)/g)].map((m) => m[1]);
    assert.equal(counts.length, 1, `the ${id} section must state "Unit tests (N)" exactly once, found ${counts.length}`);

    const summary = new RegExp(`<tr><td><a href="#${id}">${id}</a></td>((?:(?!</tr>)[\\s\\S])*?)</tr>`).exec(CHECKS_PAGE);
    assert.ok(summary, `the summary table has no row for ${id}`);
    const cells = [.../** @type {RegExpExecArray} */ (summary)[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => htmlText(m[1]));
    assert.equal(cells[cells.length - 1], counts[0], `the summary row of ${id} says ${cells[cells.length - 1]} but its section says ${counts[0]}`);

    assert.ok(htmlText(section).includes(`scripts/validate/checks/${id}.test.mjs`), `the ${id} section does not name its test file`);
    assert.ok(existsSync(resolve(`scripts/validate/checks/${id}.test.mjs`)), `scripts/validate/checks/${id}.test.mjs does not exist`);
  }
  assert.equal(htmlText(CONTRACT_SECTION).includes('none yet'), false, 'the qa-run-contract section still says its unit tests are "none yet"');
  const featureSuites = readdirSync(resolve('scripts/validate/checks')).filter((f) => /^qa-run-.+\.test\.mjs$/.test(f));
  assert.ok(featureSuites.length >= 1 && htmlText(CONTRACT_SECTION).includes('qa-run-*.test.mjs'), 'the section does not point at the qa-run-*.test.mjs feature suites, or none exists');
});

test('AC-A8 the qa-run-contract section states the size of the catalogue and the codes the check requires, against the runner: the listed codes exist, the count words are the real counts, the omitted-case marker is not a member', () => {
  const text = htmlText(CONTRACT_SECTION);
  const keys = Object.keys(REASON_CATALOGUE);

  const required = /\bthe (\w+) codes the check names \(([^)]*)\)/.exec(text);
  assert.ok(required, 'the section no longer lists the codes the check requires in the form "the N codes the check names (...)"');
  const listed = [...new Set(/** @type {RegExpExecArray} */ (required)[2].match(SCREAMING) ?? [])];
  assert.equal(/** @type {RegExpExecArray} */ (required)[1], CARDINAL[listed.length], `the section says ${/** @type {RegExpExecArray} */ (required)[1]} codes but lists ${listed.length}`);
  for (const code of listed) assert.ok(keys.includes(code), `the section lists ${code}, which is not a key of REASON_CATALOGUE`);

  const size = /\bthe catalogue itself holds (\w+) codes\b/.exec(text);
  assert.ok(size, 'the section no longer states the size of the catalogue in the form "the catalogue itself holds N codes"');
  assert.equal(/** @type {RegExpExecArray} */ (size)[1], CARDINAL[keys.length], `the section says the catalogue holds ${/** @type {RegExpExecArray} */ (size)[1]} codes, the runner has ${keys.length}`);

  const outside = /\bsince (\w+) is not one of the\b/.exec(text);
  assert.ok(outside, 'the section no longer names the member the required list leaves out');
  const left = /** @type {RegExpExecArray} */ (outside)[1];
  assert.ok(keys.includes(left) && !listed.includes(left), `${left} must be a key of the catalogue that the required list does not carry`);
  assert.equal(keys.length - listed.length, 1, 'the page explains one member the required list leaves out, but the difference is not one');

  assert.ok(text.includes('NO_PLAN_ENTRY'), 'the section no longer names the omitted-case marker');
  assert.equal(keys.includes('NO_PLAN_ENTRY'), false, 'NO_PLAN_ENTRY is a member of the catalogue, which the page says it is not');
});

test('AC-A8 the validation guide has one row for each of the two extended checks and each names every rule set it gained, with the ignore rules the runner exports', () => {
  /** @param {string} id @returns {string} */
  const rowOf = (id) => {
    const found = [...SUITE_PAGE.matchAll(new RegExp(`<tr><td><code>${id}</code></td><td>([\\s\\S]*?)</td></tr>`, 'g'))];
    assert.equal(found.length, 1, `exactly one row for ${id} is required in validation-suite.html, found ${found.length}`);
    return htmlText(found[0][1]);
  };
  const secrecy = rowOf('auth-secrecy');
  for (const token of ['run-evidence', ...RUN_IGNORE_RULES, 'results.json', 'plan.json', 'session-value floor']) {
    assert.ok(secrecy.includes(token), `the auth-secrecy row of the guide does not name: ${token}`);
  }
  const contract = rowOf('qa-run-contract');
  // One phrase for each opt-in rule set of the check: catalogue, ground, privacy, vocabulary, prefix, network.
  for (const token of ['reason-code catalogue', 'stable-grounding halt', 'run-evidence ignore proof', 'session-less request', 'grounding prefix', 'bounded re-mint']) {
    assert.ok(contract.includes(token), `the qa-run-contract row of the guide does not name: ${token}`);
  }
});

test('AC-A8 the check count that the README and CLAUDE.md state is the number of checks the registry holds', () => {
  const index = readReal('scripts/validate/index.mjs');
  const array = /const CHECKS = \[([\s\S]*?)\];/.exec(index);
  assert.ok(array, 'scripts/validate/index.mjs has no CHECKS array');
  const registered = new Set([.../** @type {RegExpExecArray} */ (array)[1].replace(/\/\/.*$/gm, '').matchAll(/\brun[A-Za-z0-9]+Check\b/g)].map((m) => m[0]));
  assert.ok(registered.size > 0);

  const stated = [];
  for (const file of ['README.md', 'CLAUDE.md']) {
    for (const m of read(file).matchAll(/\b(\d+) static (?:consistency )?checks\b/g)) stated.push({ file, count: Number(m[1]) });
  }
  assert.ok(stated.length >= 1, 'neither README.md nor CLAUDE.md states a check count in the form "N static checks"');
  for (const { file, count } of stated) assert.equal(count, registered.size, `${file} says ${count} static checks, the registry holds ${registered.size}`);
});

// ---------------------------------------------------------------------------
// AC-A9: the search index, the ids this release added and the links between the edited pages
// ---------------------------------------------------------------------------

test('AC-A9 the search index names the 0.46.0 behavior in the excerpts of the three pages the release changed, and each page has exactly one entry', () => {
  const index = JSON.parse(read('documentation/assets/data/search-index.json'));
  assert.ok(Array.isArray(index));
  /** @param {string} path @returns {string} the excerpt of the one entry of that page */
  const excerpt = (path) => {
    const found = index.filter((/** @type {{ path: string }} */ e) => e.path === path);
    assert.equal(found.length, 1, `exactly one search-index entry is required for ${path}, found ${found.length}`);
    assert.equal(typeof found[0].excerpt, 'string');
    return found[0].excerpt;
  };
  assert.ok(excerpt('reference/commands.html').includes('grounds against the settled page'));
  assert.ok(excerpt('reference/scripts.html').includes('grounds against the settled page'));
  assert.ok(excerpt('reference/redaction-policy.html').includes('QA runner evidence rules'));
});

test('AC-A9 every id the release added is unique on its page, and every link the two edited reference pages carry to a page of the site or to an anchor of their own resolves to an id that exists', () => {
  /** @param {string} html @param {string} id @returns {number} */
  const occurrences = (html, id) => html.split(`id="${id}"`).length - 1;
  const policy = read('documentation/reference/redaction-policy.html');
  for (const id of ['qa-runner-evidence', 'session-values-source-first', 'snapshots-personal-data']) {
    assert.equal(occurrences(policy, id), 1, `<h? id="${id}"> must occur exactly once in redaction-policy.html`);
  }
  const changelog = read('documentation/changelog.html');
  for (const id of ['unreleased', 'v0-46-0', 'v0-46-0-added', 'v0-46-0-changed']) {
    assert.equal(occurrences(changelog, id), 1, `id="${id}" must occur exactly once in changelog.html`);
  }

  // The two links the release added, in both directions.
  const commands = read('documentation/reference/commands.html');
  assert.ok(commands.includes('href="redaction-policy.html#qa-runner-evidence"'), 'commands.html does not link to the QA runner evidence section');
  assert.ok(policy.includes('href="commands.html#relay-qa-run"'), 'redaction-policy.html does not link to the /relay-qa-run entry');

  // Every fragment link of the two pages resolves.
  /** @type {string[]} */ const broken = [];
  for (const page of ['documentation/reference/commands.html', 'documentation/reference/redaction-policy.html']) {
    const html = read(page);
    for (const m of html.matchAll(/href="([^"#]*)#([^"]+)"/g)) {
      const [, file, fragment] = m;
      if (/^[a-z][a-z0-9+.-]*:/i.test(file)) continue;
      const target = file === '' ? html : read(join(dirname(page), file).split('\\').join('/'));
      if (target.split(`id="${fragment}"`).length - 1 < 1) broken.push(`${page} -> ${file}#${fragment}`);
    }
  }
  assert.deepEqual(broken, []);
});
