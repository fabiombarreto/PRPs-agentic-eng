// @ts-check
/**
 * Unit tests for check Q — topology-contract — the pure
 * `checkTopologyContract` function exported by
 * scripts/validate/checks/topology-contract.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function only, via
 * in-memory fixture strings — no temp files, no real file I/O, no exercise
 * of the `runTopologyContractCheck()` fs wrapper.
 *
 * Traceability:
 *   PRPs/prds/multi-repo-topology.prd.md AC-2  topology parsed from a
 *                                              byte-exact header
 *   Plan AC-A6                                 the check reports PASS on a
 *                                              consistent tree AND produces a
 *                                              finding on a one-sided header
 *                                              edit (the negative half is the
 *                                              load-bearing case — a guard
 *                                              that cannot fail is vacuous)
 *
 * Run: node --test scripts/validate/checks/topology-contract.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkTopologyContract } from './topology-contract.mjs';

const CONTRACT_PATH = 'plugins/relay/resources/repository-topology.md';
const CONSUMER_PATH = 'plugins/relay/commands/relay-execute.md';

const CANONICAL_HEADER = '| Repo | Path | Git root | Role | Base |';

/** A contract fixture carrying exactly one canonical header. */
const CONTRACT_OK = [
  '# Repository Topology Contract',
  '',
  'The section contains one GFM table whose header line matches byte-for-byte',
  'the header shown in the canonical example below.',
  '',
  '```',
  '## Repository topology',
  '',
  CANONICAL_HEADER,
  '|------|------|----------|------|------|',
  '| spe-services | spe-services | - | editable | current |',
  '```',
  '',
].join('\n');

/** A consumer fixture that cites the contract AND carries the header. */
const CONSUMER_OK = [
  '### P6 — Repository topology resolution',
  '',
  'Locate the declaration under its exact heading:',
  '## Repository topology',
  '',
  CANONICAL_HEADER,
  '',
].join('\n');

test('checkTopologyContract: ok:true with no findings when the contract carries one canonical header and the citing consumer carries it verbatim', () => {
  const result = checkTopologyContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: CONSUMER_OK },
  });

  assert.equal(result.name, 'topology-contract');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkTopologyContract: fails closed with a finding when the contract input is null, never throwing and never silently passing', () => {
  const result = checkTopologyContract({ contract: null, consumers: {} });

  assert.equal(result.name, 'topology-contract');
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CONTRACT_PATH);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('checkTopologyContract: fails closed when the contract input is an empty string', () => {
  const result = checkTopologyContract({ contract: '', consumers: {} });

  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or empty input/);
});

test('checkTopologyContract: ok:false when the contract carries no canonical header at all', () => {
  const result = checkTopologyContract({
    contract: '# Repository Topology Contract\n\nProse only, no table.\n',
    consumers: { [CONSUMER_PATH]: CONSUMER_OK },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /no canonical topology table header found/);
});

test('checkTopologyContract: ok:false when the contract carries the canonical header more than once — exactly one copy is the invariant', () => {
  const result = checkTopologyContract({
    contract: `${CONTRACT_OK}\n${CANONICAL_HEADER}\n`,
    consumers: { [CONSUMER_PATH]: CONSUMER_OK },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /appears 2 times/);
  assert.match(result.findings[0].message, /single authority/);
});

test('checkTopologyContract: ok:false naming the drifted consumer when a citing command carries a one-sided header edit — the negative half of AC-A6', () => {
  const drifted = CONSUMER_OK.replace(CANONICAL_HEADER, '| Repo | Path | Git root | Role | BaseRef |');

  const result = checkTopologyContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: drifted },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CONSUMER_PATH);
  assert.match(result.findings[0].message, /restates the .* topology header but not verbatim/);
  // The expected header is quoted back so the fix is mechanical, not a hunt.
  assert.ok(result.findings[0].message.includes(CANONICAL_HEADER));
});

test('checkTopologyContract: the drift finding carries the 1-indexed line of the citation, so the report points at the offending file position', () => {
  const drifted = CONSUMER_OK.replace(CANONICAL_HEADER, '| Repo | Path | Role |');

  const result = checkTopologyContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: drifted },
  });

  // The finding points at the offending HEADER ROW itself (1-indexed), which is
  // where the fix has to be applied — not at some citation elsewhere in the file.
  assert.equal(result.findings[0].line, 6);
});

test('checkTopologyContract: a consumer carrying no topology header row at all is out of scope — naming the contract, quoting a HALT code, or mentioning the section heading in prose must not force an irrelevant header', () => {
  const unrelated = '### P1 — something else entirely\n\nNo mention of the contract here.\n';

  const result = checkTopologyContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: unrelated },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkTopologyContract: an unreadable consumer (null value) is reported as a finding rather than skipped', () => {
  const result = checkTopologyContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: null },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, CONSUMER_PATH);
  assert.match(result.findings[0].message, /missing or unreadable consumer file/);
});

test('checkTopologyContract: every citing consumer is reported, not just the first, so one pass fixes them all', () => {
  const second = 'plugins/relay/commands/relay-pr.md';
  const drifted = CONSUMER_OK.replace(CANONICAL_HEADER, '| Repo | Path |');

  const result = checkTopologyContract({
    contract: CONTRACT_OK,
    consumers: { [CONSUMER_PATH]: drifted, [second]: drifted },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(
    result.findings.map((f) => f.file).sort(),
    [CONSUMER_PATH, second].sort(),
  );
});

test('checkTopologyContract: an empty consumers map is not a failure — the contract alone is well-formed', () => {
  const result = checkTopologyContract({ contract: CONTRACT_OK, consumers: {} });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
