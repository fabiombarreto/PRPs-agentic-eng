// @ts-check
/**
 * Unit tests for check V — lane-fixture — the pure `checkLaneFixture` function
 * exported by scripts/validate/checks/lane-fixture.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module.
 *
 * Traceability:
 *   PRPs/prds/parallel-phase-execution.prd.md AC-5  the interleaving gate must
 *                                                    FAIL on a colliding run; a
 *                                                    run that only ever passes
 *                                                    does not satisfy it
 *   Plan AC-A3, AC-A4                               the positive fixture derives
 *                                                    to three lanes; the negative
 *                                                    fixture's clean derivation
 *                                                    is itself a finding
 *
 * The central test here is `a negative fixture that stops colliding is CAUGHT`.
 * Every other assertion checks that the fixtures are correct today; that one
 * checks that the GATE would notice if they stopped being. Those are different
 * properties, and only the second is what this feature claims.
 *
 * Run: node --test scripts/validate/checks/lane-fixture.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkLaneFixture } from './lane-fixture.mjs';

const NL = String.fromCharCode(10);
const HEADER = '| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |';
const SEP = '|---|-------|-------------|--------|------|----------|---------|----------|';

const POSITIVE = [
  '# Fixture: three independent lanes',
  '',
  HEADER, SEP,
  '| 1 | a | d | pending | - | - | - | - |',
  '| 2 | b | d | pending | - | - | - | - |',
  '| 3 | c | d | pending | - | - | - | - |',
  '| 4 | d | d | pending | - | - | 1 | - |',
  '| 5 | e | d | pending | - | - | 1 | - |',
].join(NL);

const NEGATIVE = [
  '# Fixture: colliding lane labels',
  '',
  HEADER, SEP,
  '| 1 | a | d | pending | - | lane:alpha | - | - |',
  '| 2 | b | d | pending | - | lane:beta | 1 | - |',
].join(NL);

test('the correct fixture pair passes', () => {
  const result = checkLaneFixture({ positive: POSITIVE, negative: NEGATIVE });
  assert.equal(result.name, 'lane-fixture');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('a negative fixture that stops colliding is CAUGHT — the gate notices it stopped failing', () => {
  // This is the load-bearing case. Everything else verifies the fixtures; this
  // verifies the gate.
  const declawed = NEGATIVE.replace('lane:beta', 'lane:alpha');
  const result = checkLaneFixture({ positive: POSITIVE, negative: declawed });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /the gate has stopped failing/);
  assert.match(result.findings[0].message, /Fix the derivation, never the fixture/);
});

test('a negative fixture whose labels are removed entirely is caught', () => {
  const stripped = NEGATIVE.replace('lane:alpha', '-').replace('lane:beta', '-');
  const result = checkLaneFixture({ positive: POSITIVE, negative: stripped });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /WITHOUT the expected FAILED_LANE_SPLIT_FORBIDDEN/);
});

test('a positive fixture deriving to the wrong lane shape is a finding naming both shapes', () => {
  // Row 2 made dependent on 1 collapses {1,4,5} and {2} into one lane.
  const wrong = POSITIVE.replace('| 2 | b | d | pending | - | - | - | - |', '| 2 | b | d | pending | - | - | 1 | - |');
  const result = checkLaneFixture({ positive: wrong, negative: NEGATIVE });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /derived lanes/);
  assert.match(result.findings[0].message, /a bug in the derivation/);
});

test('a positive fixture that derives WITH a refusal is a finding', () => {
  const refusing = POSITIVE
    .replace('| 1 | a | d | pending | - | - | - | - |', '| 1 | a | d | pending | - | lane:x | - | - |')
    .replace('| 4 | d | d | pending | - | - | 1 | - |', '| 4 | d | d | pending | - | lane:y | 1 | - |');
  const result = checkLaneFixture({ positive: refusing, negative: NEGATIVE });
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /must derive cleanly/.test(f.message)));
});

test('a null positive fixture is a loud finding', () => {
  const result = checkLaneFixture({ positive: null, negative: NEGATIVE });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('a null negative fixture is a loud finding', () => {
  const result = checkLaneFixture({ positive: POSITIVE, negative: null });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('a positive fixture parsing to ZERO rows is a finding, not a silent pass', () => {
  const result = checkLaneFixture({ positive: 'prose with no table', negative: NEGATIVE });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('a negative fixture parsing to ZERO rows is a finding — it cannot demonstrate a refusal it never reaches', () => {
  const result = checkLaneFixture({ positive: POSITIVE, negative: 'prose with no table' });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /never reaches/);
});

test('both fixtures broken produces findings for both, not just the first', () => {
  const result = checkLaneFixture({ positive: null, negative: null });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
});

test('findings name the fixture path they came from', () => {
  const result = checkLaneFixture({ positive: POSITIVE, negative: NEGATIVE.replace('lane:beta', 'lane:alpha') });
  assert.equal(result.findings[0].file, 'scripts/validate/fixtures/colliding-lanes.prd.md');
});

test('CRLF fixtures are handled', () => {
  const result = checkLaneFixture({
    positive: POSITIVE.split(NL).join('\r\n'),
    negative: NEGATIVE.split(NL).join('\r\n'),
  });
  assert.equal(result.ok, true);
});
