// @ts-check
/**
 * Unit tests for check R — lane-contract — the pure `checkLaneContract`
 * function exported by scripts/validate/checks/lane-contract.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function only, via
 * in-memory fixture strings — no temp files, no real file I/O, no exercise of
 * the `runLaneContractCheck()` fs wrapper.
 *
 * Traceability:
 *   PRPs/prds/parallel-phase-execution.prd.md AC-2  lanes derived from the graph
 *   PRPs/prds/parallel-phase-execution.prd.md AC-3  a contradicting declaration
 *                                                   is refused BY NAME, so the
 *                                                   names must be real
 *   Plan AC-A4                                      the check produces a finding
 *                                                   for a null contract, an empty
 *                                                   registry, and a consumer
 *                                                   citing an undefined code —
 *                                                   and passes a well-formed
 *                                                   input
 *
 * The negative cases carry the weight here. A parity check that only ever
 * passes is worth nothing, and this repository removed three such guards in a
 * single day; every assertion below that expects `ok === false` exists to prove
 * this one can fail.
 *
 * Run: node --test scripts/validate/checks/lane-contract.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkLaneContract } from './lane-contract.mjs';

const CONTRACT_PATH = 'plugins/relay/resources/lane-model.md';
const CONSUMER_PATH = 'plugins/relay/agents/prd-reviewer.md';

/** A contract fixture whose registry defines both real codes. */
const CONTRACT_OK = [
  '# Lane Model Contract',
  '',
  'A lane is a weakly-connected component of the `Depends` graph.',
  '',
  '## Named-code registry',
  '',
  '- `FAILED_LANE_SPLIT_FORBIDDEN` — two rows in one derived lane carry different labels.',
  '- `FAILED_LANE_CROSS_REPO` — one label spans rows whose `Repo` cells differ.',
  '',
  '## The compatibility clause',
  '',
  'A PRD in which no row carries a `lane:` value is served by derivation alone.',
].join('\n');

test('a well-formed contract and a consumer citing a defined code passes', () => {
  const result = checkLaneContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: 'fail with `FAILED_LANE_SPLIT_FORBIDDEN` naming both phases' },
  });
  assert.equal(result.name, 'lane-contract');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('a consumer citing an UNDEFINED code is a finding naming the file and line', () => {
  const consumer = ['line one', 'cites `FAILED_LANE_TYPOED` here', 'line three'].join('\n');
  const result = checkLaneContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: consumer },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CONSUMER_PATH);
  assert.equal(result.findings[0].line, 2);
  assert.match(result.findings[0].message, /FAILED_LANE_TYPOED/);
  // The message must name what IS registered, so the fix is obvious.
  assert.match(result.findings[0].message, /FAILED_LANE_CROSS_REPO/);
});

test('a code renamed on the contract side only is caught', () => {
  // The realistic one-sided edit: the contract renames a code, the consumer
  // still cites the old name. Neither file looks individually wrong.
  const renamed = CONTRACT_OK.replace('FAILED_LANE_CROSS_REPO', 'FAILED_LANE_MULTI_REPO');
  const result = checkLaneContract({
    contract: renamed,
    consumers: { [CONSUMER_PATH]: 'refuse with `FAILED_LANE_CROSS_REPO`' },
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /FAILED_LANE_CROSS_REPO/);
});

test('a null contract is a loud finding, not a throw and not a silent pass', () => {
  const result = checkLaneContract({ contract: null, consumers: {} });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CONTRACT_PATH);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('an empty-string contract is treated the same as a missing one', () => {
  const result = checkLaneContract({ contract: '', consumers: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('a contract with no registry section is a finding', () => {
  const noRegistry = ['# Lane Model Contract', '', 'Prose only, no registry.'].join('\n');
  const result = checkLaneContract({ contract: noRegistry, consumers: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /Named-code registry/);
});

test('a registry defining no code is a finding — an empty registry would pass by vacuity', () => {
  const gutted = ['## Named-code registry', '', 'None defined yet.', ''].join('\n');
  const result = checkLaneContract({ contract: gutted, consumers: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /defines no FAILED_LANE_\* code/);
});

test('a code mentioned only in prose OUTSIDE the registry does not count as defined', () => {
  // Definition is scoped to the registry section on purpose: otherwise the
  // registry could be gutted while a passing mention elsewhere kept the check green.
  const proseOnly = [
    'Refusals include `FAILED_LANE_SPLIT_FORBIDDEN` and `FAILED_LANE_CROSS_REPO`.',
    '',
    '## Named-code registry',
    '',
    '- `FAILED_LANE_SPLIT_FORBIDDEN` — the only registered code.',
  ].join('\n');
  const result = checkLaneContract({
    contract: proseOnly,
    consumers: { [CONSUMER_PATH]: 'cites `FAILED_LANE_CROSS_REPO`' },
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /FAILED_LANE_CROSS_REPO/);
});

test('the registry section ends at the next heading', () => {
  // A code introduced under a LATER heading is not part of the registry.
  const spillover = [
    '## Named-code registry',
    '',
    '- `FAILED_LANE_SPLIT_FORBIDDEN` — registered.',
    '',
    '## Some other section',
    '',
    '- `FAILED_LANE_ELSEWHERE` — not registered.',
  ].join('\n');
  const result = checkLaneContract({
    contract: spillover,
    consumers: { [CONSUMER_PATH]: 'cites `FAILED_LANE_ELSEWHERE`' },
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /FAILED_LANE_ELSEWHERE/);
});

test('a consumer citing no lane code at all is OUT OF SCOPE, not a failure', () => {
  // Self-selecting scope: a file that never claims a lane code is not drifting.
  const result = checkLaneContract({
    contract: CONTRACT_OK,
    consumers: {
      [CONSUMER_PATH]: 'This file describes lanes in prose and names no code.',
      'plugins/relay/resources/prd-template.md': 'Delegates to resources/lane-model.md.',
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('an unreadable consumer is a loud finding, never a silent pass', () => {
  const result = checkLaneContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: null },
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or unreadable consumer file/);
  assert.equal(result.findings[0].file, CONSUMER_PATH);
});

test('multiple undefined citations across files each produce their own finding', () => {
  const result = checkLaneContract({
    contract: CONTRACT_OK,
    consumers: {
      [CONSUMER_PATH]: 'cites `FAILED_LANE_ONE`',
      'plugins/relay/commands/relay-execute.md': 'cites `FAILED_LANE_TWO`',
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
});

test('two undefined codes on ONE line each produce a finding', () => {
  const result = checkLaneContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: 'either `FAILED_LANE_AAA` or `FAILED_LANE_BBB`' },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
});

test('a missing consumers object does not throw', () => {
  // Defensive: the wrapper always supplies one, but a caller may not.
  const result = checkLaneContract({ contract: CONTRACT_OK, consumers: undefined });
  assert.equal(result.ok, true);
});

test('CRLF line endings are handled — findings still carry the right line number', () => {
  const consumer = ['line one', 'cites `FAILED_LANE_TYPOED`'].join('\r\n');
  const result = checkLaneContract({
    contract: CONTRACT_OK.split('\n').join('\r\n'),
    consumers: { [CONSUMER_PATH]: consumer },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings[0].line, 2);
});
