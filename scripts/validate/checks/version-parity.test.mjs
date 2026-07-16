// @ts-check
/**
 * Unit tests for check B — version-parity — the pure `checkVersionParity`
 * function exported by scripts/validate/checks/version-parity.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function only, via
 * in-memory fixture strings — no temp files, no real file I/O, no exercise
 * of the `runVersionParityCheck()` fs wrapper.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-3  version parity (check B)
 *   PRPs/prds/validation-suite.prd.md AC-2  green on a consistent tree
 *                                            (Unreleased-skip / separator-
 *                                            agnostic subset exercised here)
 *   PRPs/prds/validation-suite.prd.md AC-10 scope excludes prp-core
 *
 * Run: node --test scripts/validate/checks/version-parity.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkVersionParity } from './version-parity.mjs';

// Mirrors the exact two file paths named by the PRD/plan Decision Gate —
// this is the documented observable contract, not an invented internal.
const PLUGIN_JSON_PATH = 'plugins/relay/.claude-plugin/plugin.json';
const CHANGELOG_PATH = 'documentation/changelog.html';

const UNRELEASED_HEADING = '<h2 id="unreleased">Unreleased</h2>';

/** @param {string} version */
function pluginJsonFor(version) {
  return JSON.stringify({ name: 'relay', version });
}

/** @param {string} innerHtml */
function changelogWith(innerHtml) {
  return `<!DOCTYPE html><html><body>${innerHtml}</body></html>`;
}

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-3 — version parity (check B)
// ---------------------------------------------------------------------------

test('checkVersionParity: ok:true with no findings when plugin.json version matches the latest changelog release', () => {
  const pluginJson = pluginJsonFor('0.20.0');
  const changelogHtml = changelogWith(`
    ${UNRELEASED_HEADING}
    <h2 id="v0-20-0">0.20.0 &#8212; 2026-07-12</h2>
  `);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.name, 'version-parity');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkVersionParity: ok:false naming BOTH versions when plugin.json version (0.20.0) differs from the latest changelog release (0.19.0)', () => {
  const pluginJson = pluginJsonFor('0.20.0');
  const changelogHtml = changelogWith(`
    ${UNRELEASED_HEADING}
    <h2 id="v0-19-0">0.19.0 &#8212; 2026-07-10</h2>
  `);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  const [finding] = result.findings;
  assert.match(finding.message, /0\.20\.0/, 'finding must name the plugin.json version');
  assert.match(finding.message, /0\.19\.0/, 'finding must name the changelog version');
  assert.equal(finding.file, PLUGIN_JSON_PATH);
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-2 — Unreleased-skip + separator-
// agnostic parsing (the subset of "green on a consistent tree" that is a
// property of the pure checkVersionParity function itself)
// ---------------------------------------------------------------------------

test('checkVersionParity: skips the id="unreleased" heading even when its text looks like a version, and uses the next release heading as Y', () => {
  const pluginJson = pluginJsonFor('0.19.0');
  // The Unreleased heading's text deliberately starts with a version-like
  // token. If the extractor did not explicitly skip id="unreleased", it
  // would read "0.99.9" as the latest release and this comparison would
  // fail against plugin.json's "0.19.0".
  const changelogHtml = changelogWith(`
    <h2 id="unreleased">0.99.9 Unreleased (must never be read as a release)</h2>
    <h2 id="v0-19-0">0.19.0 &#8212; 2026-07-10</h2>
  `);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkVersionParity: takes the FIRST versioned heading after Unreleased as Y, not a later one', () => {
  const pluginJson = pluginJsonFor('0.19.0');
  const changelogHtml = changelogWith(`
    ${UNRELEASED_HEADING}
    <h2 id="v0-19-0">0.19.0 &#8212; 2026-07-10</h2>
    <h2 id="v0-18-0">0.18.0 &#8212; 2026-07-05</h2>
  `);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkVersionParity: parses a release heading using the &#8212; HTML entity separator', () => {
  const pluginJson = pluginJsonFor('1.2.3');
  const changelogHtml = changelogWith(`
    ${UNRELEASED_HEADING}
    <h2 id="v1-2-3">1.2.3 &#8212; 2026-01-01</h2>
  `);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkVersionParity: parses a release heading using a literal em dash (—) separator', () => {
  const pluginJson = pluginJsonFor('1.2.3');
  const changelogHtml = changelogWith(`
    ${UNRELEASED_HEADING}
    <h2 id="v1-2-3">1.2.3 — 2026-01-01</h2>
  `);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// Robustness — missing/unparseable inputs are a loud-failure finding, never
// a throw and never a silent pass.
// ---------------------------------------------------------------------------

test('checkVersionParity: reports a loud failing finding (not a throw) when pluginJson is missing (null)', () => {
  const changelogHtml = changelogWith(`${UNRELEASED_HEADING}<h2 id="v1-0-0">1.0.0 &#8212; 2026-01-01</h2>`);

  const result = checkVersionParity({ pluginJson: null, changelogHtml });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /plugin\.json/i);
  assert.equal(result.findings[0].file, PLUGIN_JSON_PATH);
});

test('checkVersionParity: reports a loud failing finding (not a throw) when pluginJson is missing (undefined/empty string)', () => {
  const changelogHtml = changelogWith(`${UNRELEASED_HEADING}<h2 id="v1-0-0">1.0.0 &#8212; 2026-01-01</h2>`);

  const resultUndefined = checkVersionParity({ pluginJson: undefined, changelogHtml });
  const resultEmpty = checkVersionParity({ pluginJson: '', changelogHtml });

  for (const result of [resultUndefined, resultEmpty]) {
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, PLUGIN_JSON_PATH);
  }
});

test('checkVersionParity: reports a loud failing finding when pluginJson is not valid JSON', () => {
  const changelogHtml = changelogWith(`${UNRELEASED_HEADING}<h2 id="v1-0-0">1.0.0 &#8212; 2026-01-01</h2>`);

  const result = checkVersionParity({ pluginJson: '{ this is not valid json', changelogHtml });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /plugin\.json/i);
  assert.equal(result.findings[0].file, PLUGIN_JSON_PATH);
});

test('checkVersionParity: reports a loud failing finding when pluginJson parses but has no "version" field', () => {
  const changelogHtml = changelogWith(`${UNRELEASED_HEADING}<h2 id="v1-0-0">1.0.0 &#8212; 2026-01-01</h2>`);

  const result = checkVersionParity({ pluginJson: JSON.stringify({ name: 'relay' }), changelogHtml });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, PLUGIN_JSON_PATH);
});

test('checkVersionParity: reports a loud failing finding (not a throw) when changelogHtml is missing (undefined)', () => {
  const pluginJson = pluginJsonFor('1.0.0');

  const result = checkVersionParity({ pluginJson, changelogHtml: undefined });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /changelog\.html/i);
  assert.equal(result.findings[0].file, CHANGELOG_PATH);
});

test('checkVersionParity: reports a loud failing finding when the changelog has no <h2> release heading at all (unparseable)', () => {
  const pluginJson = pluginJsonFor('1.0.0');
  const changelogHtml = '<!DOCTYPE html><html><body><p>not a changelog</p></body></html>';

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CHANGELOG_PATH);
});

test('checkVersionParity: reports a loud failing finding when the changelog contains ONLY the Unreleased heading', () => {
  const pluginJson = pluginJsonFor('1.0.0');
  const changelogHtml = changelogWith(UNRELEASED_HEADING);

  const result = checkVersionParity({ pluginJson, changelogHtml });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /no versioned/i);
  assert.equal(result.findings[0].file, CHANGELOG_PATH);
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-10 — scope excludes prp-core: check B
// reads EXACTLY the two named files. Asserted here as a property of the pure
// function's input surface — a third, unrelated input is never consulted.
// ---------------------------------------------------------------------------

test('checkVersionParity: consults only pluginJson and changelogHtml — an unrelated third input is never read', () => {
  const pluginJson = pluginJsonFor('0.20.0');
  const changelogHtml = changelogWith(`
    ${UNRELEASED_HEADING}
    <h2 id="v0-20-0">0.20.0 &#8212; 2026-07-12</h2>
  `);

  const result = checkVersionParity({
    pluginJson,
    changelogHtml,
    // Simulates a foreign input (e.g. a plugins/prp-core/ manifest). If the
    // pure function consulted anything beyond its two named properties, this
    // deliberately-mismatched version would flip the verdict to a failure.
    prpCorePluginJson: pluginJsonFor('9.9.9'),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
