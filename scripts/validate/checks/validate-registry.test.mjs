// @ts-check
/**
 * Follow-up: check-registry drop detection.
 *
 * Context: `figma-quota-resilience-phase1.test.mjs`'s AC-A3 test used to be
 * the sole assertion anywhere in this corpus that pinned the registered
 * `npm run validate` check TOTAL (`14 passed, 0 failed (14 checks run)`).
 * That literal broke on every legitimate new-check registration (12 -> 13 ->
 * 14 -> 15, most recently `anti-patterns-mirror`), so the immediately
 * preceding "Follow-up: check-count assertion" session replaced it with a
 * count-AGNOSTIC regex — a correct maintenance fix, APPROVED by
 * test-reviewer.
 *
 * That fix has a side effect: with the literal gone, NOTHING in the corpus
 * would notice a check being silently DROPPED from
 * `scripts/validate/index.mjs`'s `CHECKS` array. 15 -> 14 still prints a
 * self-consistent, zero-failed summary line and still matches the
 * count-agnostic regex — the drop is invisible to every existing assertion.
 * test-reviewer raised exactly this as a non-blocking advisory on that
 * session's APPROVED verdict. This file closes it.
 *
 * The property encoded here is deliberately NOT another inventory count
 * (that is the exact defect the prior session retired). It is a structural
 * equality: every check MODULE that exists on disk under
 * scripts/validate/checks/ (excluding *.test.mjs and non-check helper
 * modules such as scan-root-lock.mjs, which exports no `run*Check` function)
 * is (a) imported by index.mjs and (b) that imported identifier appears in
 * the CHECKS array. Both directions are checked, so this test fails on
 * either failure mode:
 *   - a module added to disk but never imported/registered (never wired up)
 *   - an import silently removed from the CHECKS array while the `import`
 *     statement itself (or the module) still exists (the silent-drop shape)
 *   - a CHECKS-array entry with no matching import at all (would actually
 *     ReferenceError at runtime, but is asserted here too for a fast, clear
 *     failure message instead of an opaque crash)
 *
 * This property grows for free as checks are added or removed — no
 * hardcoded number anywhere in this file.
 *
 * Home: appended as a NEW file rather than into `decisions-mirror.test.mjs`
 * or `figma-quota-resilience-phase1.test.mjs` — this is a distinct subject
 * (the validate ENTRY POINT's own check registry, not a documentation
 * mirror and not one feature's content assertions) that deserves its own
 * discoverable file, following the corpus convention of one *.test.mjs per
 * distinct checked property (e.g. `decisions-mirror.test.mjs`,
 * `anti-patterns-mirror.test.mjs`). Structural model: `decisions-mirror.
 * test.mjs`'s split between pure-function tests over synthetic in-memory
 * strings and a single real-tree test.
 *
 * Run: node --test scripts/validate/checks/validate-registry.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CHECKS_DIR = resolve('scripts/validate/checks');
const INDEX_PATH = resolve('scripts/validate/index.mjs');

// ---------------------------------------------------------------------------
// Pure parsing helpers. Each operates on already-read source TEXT — no
// filesystem access — so the synthetic-string tests below can exercise them
// without touching (let alone mutating) index.mjs or any check module.
// ---------------------------------------------------------------------------

/**
 * Strips `//` line comments and `/* ... *\/` block comments from source
 * text before it is scanned for identifiers. Without this, a check
 * commented OUT of the CHECKS array (e.g. `// runBarCheck,`) — the exact
 * silent-drop shape this file exists to catch — would still be matched by a
 * naive identifier regex and misreported as registered. String literals are
 * not a concern for the two narrow patterns matched below (an import path
 * string never contains `//` or `/*`).
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Parses `import { runXCheck } from './checks/<name>.mjs';` lines out of
 * index.mjs's source text.
 * @param {string} indexSource
 * @returns {Map<string, string>} imported identifier -> module basename (no extension)
 */
function parseImportedCheckIdentifiers(indexSource) {
  const map = new Map();
  const re = /import\s*\{\s*(run\w*Check)\s*\}\s*from\s*'\.\/checks\/([\w-]+)\.mjs';/g;
  let m;
  while ((m = re.exec(stripComments(indexSource)))) {
    map.set(m[1], m[2]);
  }
  return map;
}

/**
 * Parses the identifiers listed inside the `const CHECKS = [ ... ];` array
 * literal in index.mjs's source text. Comments are stripped first — see
 * `stripComments` — so a commented-out entry is correctly treated as NOT
 * registered rather than matched by accident.
 * @param {string} indexSource
 * @returns {string[]}
 */
function parseRegisteredCheckIdentifiers(indexSource) {
  const source = stripComments(indexSource);
  const start = source.indexOf('const CHECKS = [');
  if (start === -1) {
    throw new Error('parseRegisteredCheckIdentifiers: no `const CHECKS = [` array found in the given source');
  }
  const end = source.indexOf('];', start);
  if (end === -1) {
    throw new Error('parseRegisteredCheckIdentifiers: `const CHECKS = [` array is never closed with `];`');
  }
  const body = source.slice(start, end);
  return Array.from(body.matchAll(/\b(run\w*Check)\b/g)).map((mm) => mm[1]);
}

/**
 * Parses the `run*Check` function identifiers a check module's source text
 * EXPORTS. A module that exports zero such identifiers is a helper module
 * (e.g. scan-root-lock.mjs's `withScanRootLock`), not a check module, and is
 * correctly excluded from the registry comparison.
 * @param {string} moduleSource
 * @returns {string[]}
 */
function parseExportedCheckIdentifiers(moduleSource) {
  const re = /export\s+(?:async\s+)?function\s+(run\w*Check)\s*\(/g;
  const found = [];
  let m;
  while ((m = re.exec(moduleSource))) {
    found.push(m[1]);
  }
  return found;
}

/**
 * Set-difference by value, returned sorted for a stable, readable failure
 * message.
 * @param {Iterable<string>} a
 * @param {Iterable<string>} b
 * @returns {string[]}
 */
function setDifferenceSorted(a, b) {
  const bSet = new Set(b);
  return [...new Set(a)].filter((x) => !bSet.has(x)).sort();
}

// ---------------------------------------------------------------------------
// Real-tree I/O helpers.
// ---------------------------------------------------------------------------

/** @returns {string} */
function readRealIndexSource() {
  return readFileSync(INDEX_PATH, 'utf-8');
}

/**
 * Enumerates scripts/validate/checks/*.mjs (excluding *.test.mjs) and
 * returns only the ones that export at least one `run*Check` identifier —
 * i.e. the actual check modules, determined from the real files, not
 * assumed by filename.
 * @returns {Map<string, string[]>} module basename -> exported run*Check identifiers
 */
function readRealCheckModules() {
  const files = readdirSync(CHECKS_DIR).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'));
  const map = new Map();
  for (const file of files) {
    const source = readFileSync(join(CHECKS_DIR, file), 'utf-8');
    const idents = parseExportedCheckIdentifiers(source);
    if (idents.length > 0) {
      map.set(file.replace(/\.mjs$/, ''), idents);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Synthetic-string tests — prove the parsing logic actually discriminates
// the two failure modes this file exists to catch, without touching any
// real file. Run FIRST so a broken parser is caught before it is trusted
// against the real tree below.
// ---------------------------------------------------------------------------

test('[synthetic] parseImportedCheckIdentifiers and parseRegisteredCheckIdentifiers agree on a self-consistent registry (control case)', () => {
  const src = `
import { runFooCheck } from './checks/foo.mjs';
import { runBarCheck } from './checks/bar.mjs';

const CHECKS = [
  runFooCheck,
  runBarCheck,
];
`;
  const imported = parseImportedCheckIdentifiers(src);
  assert.deepEqual([...imported.keys()].sort(), ['runBarCheck', 'runFooCheck']);
  assert.deepEqual([...imported.values()].sort(), ['bar', 'foo']);

  const registered = parseRegisteredCheckIdentifiers(src);
  assert.deepEqual(setDifferenceSorted(imported.keys(), registered), [], 'a self-consistent registry must produce zero drift in the control case');
});

test('[synthetic] a dropped registration (import kept, CHECKS entry silently removed entirely) is detected', () => {
  const src = `
import { runFooCheck } from './checks/foo.mjs';
import { runBarCheck } from './checks/bar.mjs';

const CHECKS = [
  runFooCheck,
  // the second entry was accidentally dropped here — this is the exact
  // silent-drop shape a count-agnostic pass/total assertion cannot catch.
];
`;
  const imported = parseImportedCheckIdentifiers(src);
  const registered = parseRegisteredCheckIdentifiers(src);

  const dropped = setDifferenceSorted(imported.keys(), registered);
  assert.deepEqual(dropped, ['runBarCheck'], 'an imported check missing from the CHECKS array must be named as dropped');
});

test('[synthetic] a dropped registration (import kept, CHECKS entry commented OUT rather than deleted) is detected — proves comment-stripping, not a naive substring match', () => {
  const src = `
import { runFooCheck } from './checks/foo.mjs';
import { runBarCheck } from './checks/bar.mjs';

const CHECKS = [
  runFooCheck,
  // runBarCheck, -- temporarily disabled, TODO re-enable
];
`;
  const imported = parseImportedCheckIdentifiers(src);
  const registered = parseRegisteredCheckIdentifiers(src);

  const dropped = setDifferenceSorted(imported.keys(), registered);
  assert.deepEqual(
    dropped,
    ['runBarCheck'],
    'a CHECKS entry commented OUT (not actually registered) must still be detected as dropped, not accidentally matched by a naive regex scanning the comment text'
  );
});

test('[synthetic] a ghost registration (CHECKS entry with no matching import) is detected', () => {
  const src = `
import { runFooCheck } from './checks/foo.mjs';

const CHECKS = [
  runFooCheck,
  runBarCheck,
];
`;
  const imported = parseImportedCheckIdentifiers(src);
  const registered = parseRegisteredCheckIdentifiers(src);

  const ghosts = setDifferenceSorted(registered, imported.keys());
  assert.deepEqual(ghosts, ['runBarCheck'], 'a CHECKS entry with no matching import must be named as a ghost registration');
});

test('[synthetic] an unregistered module (exists on disk, exports a run*Check, never imported) is detected', () => {
  const src = `
import { runFooCheck } from './checks/foo.mjs';

const CHECKS = [
  runFooCheck,
];
`;
  const imported = parseImportedCheckIdentifiers(src);
  const importedBasenames = new Set(imported.values());

  // Simulates readRealCheckModules()'s return shape without touching disk.
  const syntheticDiskModules = new Map([
    ['foo', ['runFooCheck']],
    ['newly-added', ['runNewlyAddedCheck']], // module exists, exports a check, never wired up
  ]);
  const diskOnly = setDifferenceSorted(syntheticDiskModules.keys(), importedBasenames);
  assert.deepEqual(diskOnly, ['newly-added'], 'a check module present on disk but never imported must be named');
});

test('[synthetic] parseExportedCheckIdentifiers returns empty for a helper module (no run*Check export) — the scan-root-lock.mjs shape', () => {
  const helperSource = `
export async function withScanRootLock(fn, label) {
  return fn();
}
`;
  assert.deepEqual(parseExportedCheckIdentifiers(helperSource), [], 'a module exporting no run*Check function must not be treated as a check module');
});

test('[synthetic] parseExportedCheckIdentifiers finds a run*Check export alongside a pure helper export — the check<Thing>/run<Thing>Check pairing shape', () => {
  const checkSource = `
export function checkFoo(input) { return { ok: true, findings: [] }; }
export function runFooCheck() { return checkFoo({}); }
`;
  assert.deepEqual(parseExportedCheckIdentifiers(checkSource), ['runFooCheck']);
});

// ---------------------------------------------------------------------------
// Real-tree tests — the actual property this file exists to protect.
// ---------------------------------------------------------------------------

test('every check module on disk is imported by the real scripts/validate/index.mjs (no module added but never wired up)', () => {
  const indexSource = readRealIndexSource();
  const imported = parseImportedCheckIdentifiers(indexSource);
  const importedBasenames = new Set(imported.values());

  const diskModules = readRealCheckModules();
  const diskOnly = setDifferenceSorted(diskModules.keys(), importedBasenames);

  assert.deepEqual(
    diskOnly,
    [],
    `check module(s) exist on disk under scripts/validate/checks/ but are never imported by scripts/validate/index.mjs, so they never run as part of npm run validate: ${diskOnly.join(', ')}`
  );
});

test('every import in the real scripts/validate/index.mjs resolves to a real check module on disk that actually exports the imported identifier', () => {
  const indexSource = readRealIndexSource();
  const imported = parseImportedCheckIdentifiers(indexSource);
  const diskModules = readRealCheckModules();

  const missing = [];
  for (const [identifier, basename] of imported) {
    const exported = diskModules.get(basename);
    if (!exported || !exported.includes(identifier)) {
      missing.push(`${identifier} (from ./checks/${basename}.mjs)`);
    }
  }

  assert.deepEqual(
    missing,
    [],
    `index.mjs imports identifier(s) that no on-disk module actually exports: ${missing.join(', ')}`
  );
});

test('every imported run*Check identifier in the real scripts/validate/index.mjs is registered in the CHECKS array (no silent drop)', () => {
  const indexSource = readRealIndexSource();
  const imported = parseImportedCheckIdentifiers(indexSource);
  const registered = parseRegisteredCheckIdentifiers(indexSource);

  const dropped = setDifferenceSorted(imported.keys(), registered);
  assert.deepEqual(
    dropped,
    [],
    `imported but never registered in the CHECKS array — this check module is silently never run despite being imported: ${dropped.join(', ')}`
  );
});

test('every CHECKS-array entry in the real scripts/validate/index.mjs corresponds to an actual import (no ghost registration)', () => {
  const indexSource = readRealIndexSource();
  const imported = parseImportedCheckIdentifiers(indexSource);
  const registered = parseRegisteredCheckIdentifiers(indexSource);

  const ghosts = setDifferenceSorted(registered, imported.keys());
  assert.deepEqual(
    ghosts,
    [],
    `registered in the CHECKS array but never imported (would ReferenceError at runtime): ${ghosts.join(', ')}`
  );
});

test('the registered CHECKS-array count equals the on-disk check-module count (both derived, neither hardcoded)', () => {
  const indexSource = readRealIndexSource();
  const registered = parseRegisteredCheckIdentifiers(indexSource);
  const diskModules = readRealCheckModules();

  // Both sides are read from the real tree/source at test-run time, so this
  // assertion never needs a maintenance bump when a check is legitimately
  // added or removed — it fails only when the two derived counts disagree,
  // which is exactly the drop/orphan shape this file exists to catch.
  assert.equal(
    registered.length,
    diskModules.size,
    `CHECKS array registers ${registered.length} check(s) but ${diskModules.size} check module(s) exist on disk under scripts/validate/checks/ — see the other tests in this file for which side is out of step`
  );
});

test('scan-root-lock.mjs (a helper, not a check) remains correctly excluded from the registry comparison', () => {
  const source = readFileSync(join(CHECKS_DIR, 'scan-root-lock.mjs'), 'utf-8');
  assert.deepEqual(
    parseExportedCheckIdentifiers(source),
    [],
    'scan-root-lock.mjs must continue to export zero run*Check functions to remain excluded as a helper module, not silently miscounted as a check'
  );
});
