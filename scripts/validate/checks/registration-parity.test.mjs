// @ts-check
/**
 * Unit tests for check C — registration-parity — the pure
 * `checkRegistrationParity` function exported by
 * scripts/validate/checks/registration-parity.mjs, plus a small number of
 * real-wrapper regression tests for the AC-10 scope invariant.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function via
 * in-memory fixture strings — no temp files, no real doc-surface I/O —
 * except for the dedicated AC-10 tests, which call the real
 * `runRegistrationParityCheck()` wrapper against the actual repo tree
 * because the prp-core scope invariant is a property of the wrapper's
 * hardcoded scan roots (COMMANDS_DIR/AGENTS_DIR), not of the pure function
 * (which has no notion of "prp-core" — it only ever compares the on-disk
 * names it is handed against the three doc-surface strings it is handed).
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-4  three-file registration parity
 *   PRPs/prds/validation-suite.prd.md AC-10 scope excludes prp-core
 *
 * Run: node --test scripts/validate/checks/registration-parity.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkRegistrationParity, runRegistrationParityCheck } from './registration-parity.mjs';

const COMMANDS_DIR = 'plugins/relay/commands';
const NAV_PATH = 'documentation/assets/js/app.js';
const SEARCH_INDEX_PATH = 'documentation/assets/data/search-index.json';
const CHANGELOG_PATH = 'documentation/changelog.html';

// NAV coverage is page-level only (see the module's own header comment) —
// this fixture satisfies both required substrings.
const CLEAN_NAV_HTML = "const NAV = [{href:'reference/commands.html'},{href:'reference/agents.html'}];";

/**
 * A neutral "Release notes below." paragraph is always inserted between the
 * version heading and the caller's content. This guarantees a non-word
 * character (".") always immediately precedes whatever the caller's own
 * markup contains — including a "/relay-x" mention placed as the very FIRST
 * character of the caller's content — decoupling every test fixture from
 * node-html-parser's exact whitespace-preservation behavior between sibling
 * tags (which inserts no separator at all): without this neutral spacer, a
 * heading ending in a digit ("...1.0.0") directly abutting a caller mention
 * ("/relay-plan...") would defeat COMMAND_MENTION_RE's negative-lookbehind
 * precise anchor (registration-parity.mjs), since a digit is a word
 * character.
 *
 * @param {string} innerHtml
 */
function changelogWith(innerHtml) {
  return `<!DOCTYPE html><html><body><h2 id="v1">1.0.0</h2><p>Release notes below.</p>${innerHtml}</body></html>`;
}

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-4 — three-file registration parity
// ---------------------------------------------------------------------------

test('checkRegistrationParity: ok:true with no findings when commands/agents are consistently referenced across all three surfaces', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: ['plan-writer'],
    navHtml: CLEAN_NAV_HTML,
    searchIndexJson: JSON.stringify([{ excerpt: 'Run /relay-plan to generate a plan. See plan-writer for details.' }]),
    changelogHtml: changelogWith('<p>Added /relay-plan command, powered by plan-writer.</p>'),
  });

  assert.equal(result.name, 'registration-parity');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkRegistrationParity: fails naming a command present on disk but MISSING from search-index.json', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan', 'relay-execute'],
    agents: [],
    navHtml: CLEAN_NAV_HTML,
    searchIndexJson: JSON.stringify([{ excerpt: 'Use /relay-plan for planning.' }]),
    changelogHtml: changelogWith('<p>/relay-plan and /relay-execute both shipped in this release.</p>'),
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /relay-execute/);
  assert.equal(result.findings[0].file, SEARCH_INDEX_PATH);
});

test('checkRegistrationParity: fails naming a STALE command mentioned in search-index.json but absent from commands/', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: [],
    navHtml: CLEAN_NAV_HTML,
    searchIndexJson: JSON.stringify([{ excerpt: 'Use /relay-plan or the deprecated /relay-old-thing.' }]),
    changelogHtml: changelogWith('<p>/relay-plan shipped.</p>'),
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /relay-old-thing/);
  assert.equal(result.findings[0].file, SEARCH_INDEX_PATH);
});

test('checkRegistrationParity: fails naming an agent missing from changelog.html, but a stray unrelated mention never produces a finding (agents are missing-only, never stale)', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: ['plan-writer', 'ghost-writer'],
    navHtml: CLEAN_NAV_HTML,
    searchIndexJson: JSON.stringify([{ excerpt: '/relay-plan uses plan-writer and ghost-writer together.' }]),
    changelogHtml: changelogWith('<p>/relay-plan shipped, powered by plan-writer. Also mentions an unrelated extinct-writer token.</p>'),
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'the unrelated "extinct-writer" mention must never produce a finding — agent coverage is missing-only');
  assert.match(result.findings[0].message, /ghost-writer/);
  assert.equal(result.findings[0].file, CHANGELOG_PATH);
});

test('checkRegistrationParity: fails naming BOTH missing NAV surfaces when app.js references neither reference page', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: [],
    navHtml: 'no relevant nav content here',
    searchIndexJson: JSON.stringify([{ excerpt: '/relay-plan' }]),
    changelogHtml: changelogWith('<p>/relay-plan</p>'),
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  assert.ok(result.findings.every((f) => f.file === NAV_PATH));
  assert.ok(result.findings.some((f) => /reference\/commands\.html/.test(f.message)));
  assert.ok(result.findings.some((f) => /reference\/agents\.html/.test(f.message)));
});

// ---------------------------------------------------------------------------
// Precision — no false positive on a legitimate path segment that merely
// CONTAINS "/relay-" preceded by a word character (prior art: the
// relay-execute docs-phase Level-3 grep false-positive lesson).
// ---------------------------------------------------------------------------

test('checkRegistrationParity: does not false-positive on "/relay-" occurring mid-path (preceded by a word character)', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: [],
    navHtml: CLEAN_NAV_HTML,
    // "cache/relay-marketplace/relay-plan-cached/" both embed "/relay-" preceded
    // by a word character ("e") — the precise anchor must exclude both, leaving
    // only the genuine, space-preceded "/relay-plan" mention.
    searchIndexJson: JSON.stringify([{
      excerpt: '/relay-plan is documented; see cache/relay-marketplace/relay-plan-cached/ for the mirrored copy.',
    }]),
    changelogHtml: changelogWith('<p>/relay-plan shipped.</p>'),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// Robustness — missing/malformed inputs are a loud-failure finding, never a
// throw and never a silent pass.
// ---------------------------------------------------------------------------

test('checkRegistrationParity: reports a loud failing finding (not a throw) when commands is missing (null) or empty', () => {
  for (const commands of [null, undefined, []]) {
    const result = checkRegistrationParity({ commands, agents: [], navHtml: 'x', searchIndexJson: 'x', changelogHtml: 'x' });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, COMMANDS_DIR);
    assert.match(result.findings[0].message, /listing of/);
  }
});

test('checkRegistrationParity: reports a loud failing finding naming NAV_PATH when navHtml is missing, without affecting the other two surfaces', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: [],
    navHtml: null,
    searchIndexJson: JSON.stringify([{ excerpt: '/relay-plan' }]),
    changelogHtml: changelogWith('<p>/relay-plan</p>'),
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, NAV_PATH);
});

test('checkRegistrationParity: reports a loud failing finding naming SEARCH_INDEX_PATH when searchIndexJson is missing', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: [],
    navHtml: CLEAN_NAV_HTML,
    searchIndexJson: undefined,
    changelogHtml: changelogWith('<p>/relay-plan</p>'),
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, SEARCH_INDEX_PATH);
});

test('checkRegistrationParity: reports a loud failing finding naming CHANGELOG_PATH when changelogHtml is missing', () => {
  const result = checkRegistrationParity({
    commands: ['relay-plan'],
    agents: [],
    navHtml: CLEAN_NAV_HTML,
    searchIndexJson: JSON.stringify([{ excerpt: '/relay-plan' }]),
    changelogHtml: '',
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CHANGELOG_PATH);
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-10 — scope excludes prp-core. This is
// a property of the WRAPPER's hardcoded scan roots (plugins/relay/commands,
// plugins/relay/agents — never plugins/prp-core), so it is asserted here
// against the real wrapper and the real repo tree rather than a fixture.
// ---------------------------------------------------------------------------

test('runRegistrationParityCheck: never emits a finding whose file resolves under plugins/prp-core', () => {
  const result = runRegistrationParityCheck();
  for (const finding of result.findings) {
    assert.ok(
      !finding.file || !finding.file.startsWith('plugins/prp-core'),
      `finding must never reference plugins/prp-core, got: ${JSON.stringify(finding)}`
    );
  }
});
