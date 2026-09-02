// @ts-check
/**
 * Unit tests for check T — lane-state-writers — the pure
 * `checkLaneStateWriters` function and the `registeredSurfaces` helper exported
 * by scripts/validate/checks/lane-state-writers.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure functions only, via
 * in-memory fixture strings — no temp files, no real file I/O, no exercise of
 * the `runLaneStateWritersCheck()` fs wrapper.
 *
 * Traceability:
 *   PRPs/prds/parallel-phase-execution.prd.md AC-6  lanes do not write shared
 *                                                    state; the orchestrator
 *                                                    applies every mutation
 *   Plan AC-A3                                      a finding for an absent
 *                                                    surface, a missing anchor,
 *                                                    a zero-row registry and a
 *                                                    null contract — and a pass
 *                                                    for a truthful registry
 *
 * The multi-column separator case is a REGRESSION test, not a hypothetical. The
 * first implementation's separator pattern omitted the pipe from its character
 * class, so `|---|---|---|` failed to match, was parsed as a data row, and the
 * check registered `---------` as a shared-state writer. Caught by executing the
 * check against a real three-column table.
 *
 * Run: node --test scripts/validate/checks/lane-state-writers.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkLaneStateWriters, registeredSurfaces } from './lane-state-writers.mjs';

const CONTRACT_PATH = 'plugins/relay/resources/lane-model.md';
const NL = String.fromCharCode(10);
const BT = String.fromCharCode(96);

/** A registry fixture with three rows and a real three-column separator. */
const REGISTRY = [
  '## Lane outcomes and state ownership',
  '',
  '| Surface | Anchor | Writes |',
  '|---------|--------|--------|',
  `| ${BT}a.md${BT} | ${BT}Step 5.1${BT} | pending to in-progress |`,
  `| ${BT}b.md${BT} | ${BT}Mutation c${BT} | in-progress to implemented |`,
  `| ${BT}c.md${BT} | ${BT}flip_row_status${BT} | tested and complete |`,
  '',
  '### Prose after the table',
].join(NL);

const TRUTHFUL = {
  'a.md': 'see Step 5.1 for the back-fill',
  'b.md': 'Mutation c flips the row',
  'c.md': 'the flip_row_status procedure',
};

test('a truthful registry passes', () => {
  const result = checkLaneStateWriters({ contract: REGISTRY, surfaces: TRUTHFUL });
  assert.equal(result.name, 'lane-state-writers');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('a multi-column separator row is NOT parsed as data (regression)', () => {
  // The original separator pattern omitted `|` from its class, so `|---|---|---|`
  // parsed as a row and `---------` was registered as a writer.
  assert.deepEqual(registeredSurfaces(REGISTRY), ['a.md', 'b.md', 'c.md']);
});

test('a surface missing its claimed anchor is a finding naming both', () => {
  const result = checkLaneStateWriters({
    contract: REGISTRY,
    surfaces: { ...TRUTHFUL, 'b.md': 'this file was restructured and no longer says it' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /Mutation c/);
  assert.match(result.findings[0].message, /b\.md/);
  assert.match(result.findings[0].message, /no longer exists/);
});

test('a registered surface that is absent entirely is a finding', () => {
  const { ['c.md']: _omitted, ...withoutC } = TRUTHFUL;
  const result = checkLaneStateWriters({ contract: REGISTRY, surfaces: withoutC });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /missing or unreadable/);
});

test('a registered surface that is unreadable (null) is a finding', () => {
  const result = checkLaneStateWriters({
    contract: REGISTRY,
    surfaces: { ...TRUTHFUL, 'a.md': null },
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or unreadable/);
});

test('every failing row produces its own finding', () => {
  const result = checkLaneStateWriters({
    contract: REGISTRY,
    surfaces: { 'a.md': 'wrong', 'b.md': 'wrong', 'c.md': 'wrong' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
});

test('a registry parsing to ZERO rows is a finding — it would verify nothing', () => {
  const result = checkLaneStateWriters({ contract: 'prose with no registry table', surfaces: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('a header present but immediately followed by prose parses to zero rows', () => {
  const headerOnly = ['| Surface | Anchor | Writes |', '', 'no rows at all'].join(NL);
  const result = checkLaneStateWriters({ contract: headerOnly, surfaces: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('a null contract is a loud finding, not a throw and not a silent pass', () => {
  const result = checkLaneStateWriters({ contract: null, surfaces: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('an empty-string contract is treated the same as a missing one', () => {
  const result = checkLaneStateWriters({ contract: '', surfaces: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('parsing stops at the prose following the table', () => {
  // The fixture has a `### Prose after the table` line; it must not be consumed.
  assert.equal(registeredSurfaces(REGISTRY).length, 3);
});

test('an anchor containing spaces survives cell parsing', () => {
  // `Step 5.1` and `Mutation c` both contain a space; stripping whitespace too
  // aggressively would make every anchor unmatchable.
  const result = checkLaneStateWriters({ contract: REGISTRY, surfaces: TRUTHFUL });
  assert.equal(result.ok, true);
});

test('a missing surfaces object does not throw', () => {
  const result = checkLaneStateWriters({ contract: REGISTRY, surfaces: undefined });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
});

test('registeredSurfaces returns an empty list for a null contract', () => {
  assert.deepEqual(registeredSurfaces(null), []);
  assert.deepEqual(registeredSurfaces(undefined), []);
});

test('CRLF line endings are handled', () => {
  const crlf = REGISTRY.split(NL).join('\r\n');
  const result = checkLaneStateWriters({ contract: crlf, surfaces: TRUTHFUL });
  assert.equal(result.ok, true);
  assert.deepEqual(registeredSurfaces(crlf), ['a.md', 'b.md', 'c.md']);
});
