// @ts-check
/**
 * Unit tests for the executable lane derivation — `parsePhasesTable` and
 * `deriveLanes` exported by scripts/validate/lane-derivation.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure functions only, via
 * in-memory fixture strings.
 *
 * Traceability:
 *   PRPs/prds/parallel-phase-execution.prd.md AC-2  lanes are weakly-connected
 *                                                    components of the Depends
 *                                                    graph, restricted to a repo
 *   PRPs/prds/parallel-phase-execution.prd.md AC-3  the Parallel override merges
 *                                                    but may never split
 *   Plan AC-A1                                      the contract's own worked
 *                                                    example derives to its
 *                                                    documented lanes
 *
 * The module is a READING of `plugins/relay/resources/lane-model.md`, which
 * remains the authority. These tests therefore assert the contract's documented
 * outcomes rather than whatever the implementation happens to produce — which is
 * what makes them an oracle instead of a mirror.
 *
 * Run: node --test scripts/validate/lane-derivation.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parsePhasesTable, deriveLanes } from './lane-derivation.mjs';

const NL = String.fromCharCode(10);
const HEADER = '| # | Phase | Description | Status | Repo | Parallel | Depends | PRP Plan |';
const SEP = '|---|-------|-------------|--------|------|----------|---------|----------|';

/** Build a canonical eight-column table from `[num, repo, parallel, depends]` tuples. */
function table(rows) {
  return [HEADER, SEP, ...rows.map(([n, repo, par, dep]) =>
    `| ${n} | p${n} | d | pending | ${repo || '-'} | ${par || '-'} | ${dep || '-'} | - |`)].join(NL);
}

/** Order-independent lane shape, for comparison. */
const shape = (lanes) => lanes.map((l) => l.map((r) => r.num)).map((a) => a.slice().sort((x, y) => x - y));

// ---------------------------------------------------------------------------
// parsePhasesTable
// ---------------------------------------------------------------------------

test('parses the canonical eight-column table', () => {
  const rows = parsePhasesTable(table([[1, '', '', ''], [2, '', '', '1']]));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].num, 1);
  assert.deepEqual(rows[1].depends, [1]);
});

test('a multi-column separator row is NOT parsed as data', () => {
  // The pipe must be inside the separator character class. This exact bug
  // shipped once in lane-state-writers.mjs and registered "---------" as data.
  const rows = parsePhasesTable(table([[1, '', '', '']]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].num, 1);
});

test('parses the LEGACY seven-column table with Repo reading as empty', () => {
  const legacyHeader = '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |';
  const t = [legacyHeader, '|---|---|---|---|---|---|---|',
    '| 1 | a | d | pending | - | - | - |',
    '| 2 | b | d | pending | - | 1 | - |'].join(NL);
  const rows = parsePhasesTable(t);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].repo, '');
  assert.deepEqual(rows[1].depends, [1]);
});

test('cells are mapped by NAME, not by ordinal — a legacy row is not misread', () => {
  // An ordinal read would take the legacy `Parallel` column as `Repo`.
  const legacyHeader = '| # | Phase | Description | Status | Parallel | Depends | PRP Plan |';
  const t = [legacyHeader, '|---|---|---|---|---|---|---|',
    '| 1 | a | d | pending | lane:x | - | - |'].join(NL);
  const rows = parsePhasesTable(t);
  assert.equal(rows[0].parallel, 'lane:x');
  assert.equal(rows[0].repo, '');
});

test('a missing table yields an empty row list rather than throwing', () => {
  assert.deepEqual(parsePhasesTable('no table here'), []);
  assert.deepEqual(parsePhasesTable(null), []);
  assert.deepEqual(parsePhasesTable(''), []);
});

test('parsing stops at the prose following the table', () => {
  const rows = parsePhasesTable(table([[1, '', '', '']]) + NL + NL + 'Trailing prose.' + NL);
  assert.equal(rows.length, 1);
});

test('a comma-separated Depends cell yields every dependency', () => {
  const rows = parsePhasesTable(table([[1, '', '', ''], [2, '', '', ''], [3, '', '', '1, 2']]));
  assert.deepEqual(rows[2].depends, [1, 2]);
});

// ---------------------------------------------------------------------------
// deriveLanes — the contract's worked example
// ---------------------------------------------------------------------------

test("the contract's worked example derives to its documented lanes {1,4,5} {2} {3}", () => {
  const rows = parsePhasesTable(table([
    [1, '', '', ''], [2, '', '', ''], [3, '', '', ''], [4, '', '', '1'], [5, '', '', '1'],
  ]));
  const { lanes, refusals } = deriveLanes(rows);
  assert.deepEqual(refusals, []);
  assert.deepEqual(shape(lanes), [[1, 4, 5], [2], [3]]);
});

test('two rows both depending on a third share that third row\'s lane', () => {
  // Weak connectivity is the point: 4 and 5 have no edge to each other.
  const rows = parsePhasesTable(table([[1, '', '', ''], [4, '', '', '1'], [5, '', '', '1']]));
  assert.deepEqual(shape(deriveLanes(rows).lanes), [[1, 4, 5]]);
});

test('a single chain yields exactly one lane', () => {
  const rows = parsePhasesTable(table([[1, '', '', ''], [2, '', '', '1'], [3, '', '', '2']]));
  assert.deepEqual(shape(deriveLanes(rows).lanes), [[1, 2, 3]]);
});

test('no rows yields no lanes and no refusals', () => {
  const { lanes, refusals } = deriveLanes([]);
  assert.deepEqual(lanes, []);
  assert.deepEqual(refusals, []);
});

// ---------------------------------------------------------------------------
// deriveLanes — the Repo partition
// ---------------------------------------------------------------------------

test('rows in different Repo partitions are never in the same lane', () => {
  const rows = parsePhasesTable(table([[1, 'api', '', ''], [2, 'web', '', '']]));
  assert.deepEqual(shape(deriveLanes(rows).lanes), [[1], [2]]);
});

test('a cross-repo Depends edge does NOT merge lanes and IS retained as an ordering constraint', () => {
  // Dropping it would let a phase run before the phase it depends on — silently,
  // and only in workspaces, which is where it would be hardest to notice.
  const rows = parsePhasesTable(table([[1, 'api', '', ''], [2, 'web', '', '1']]));
  const { lanes, orderingConstraints } = deriveLanes(rows);
  assert.deepEqual(shape(lanes), [[1], [2]]);
  assert.deepEqual(orderingConstraints, [{ from: 1, to: 2 }]);
});

// ---------------------------------------------------------------------------
// deriveLanes — the Parallel override
// ---------------------------------------------------------------------------

test('the same lane: label MERGES two otherwise-independent rows', () => {
  const rows = parsePhasesTable(table([[1, '', 'lane:a', ''], [2, '', 'lane:a', '']]));
  const { lanes, refusals } = deriveLanes(rows);
  assert.deepEqual(refusals, []);
  assert.deepEqual(shape(lanes), [[1, 2]]);
});

test('DIFFERENT labels in one derived lane are REFUSED — a split the graph forbids', () => {
  const rows = parsePhasesTable(table([[1, '', 'lane:a', ''], [2, '', 'lane:b', '1']]));
  const { refusals } = deriveLanes(rows);
  assert.equal(refusals.length, 1);
  assert.equal(refusals[0].code, 'FAILED_LANE_SPLIT_FORBIDDEN');
  assert.match(refusals[0].message, /more serial/);
});

test('one label spanning differing Repo cells is REFUSED', () => {
  const rows = parsePhasesTable(table([[1, 'api', 'lane:a', ''], [2, 'web', 'lane:a', '']]));
  const { refusals } = deriveLanes(rows);
  assert.ok(refusals.some((r) => r.code === 'FAILED_LANE_CROSS_REPO'));
});

test('legacy free text in Parallel carries NO override and is not an error', () => {
  // 113 empty cells and ~19 free-text values exist across approved PRDs; the
  // grammar must leave every one of them meaning exactly what it meant before.
  for (const legacy of ['yes', 'yes (with #2)', 'with 4', 'after 1 contract', '-']) {
    const rows = parsePhasesTable(table([[1, '', legacy, ''], [2, '', legacy, '']]));
    const { lanes, refusals } = deriveLanes(rows);
    assert.deepEqual(refusals, [], `legacy value ${legacy} must not be refused`);
    assert.deepEqual(shape(lanes), [[1], [2]], `legacy value ${legacy} must not merge lanes`);
  }
});

test('a malformed label is treated as legacy free text, not as a refusal', () => {
  // `lane:` with an invalid label does not match the grammar, so it carries no
  // override — refusing it would break PRDs the grammar was never applied to.
  const rows = parsePhasesTable(table([[1, '', 'lane:UPPER', ''], [2, '', 'lane:-bad', '']]));
  const { lanes, refusals } = deriveLanes(rows);
  assert.deepEqual(refusals, []);
  assert.deepEqual(shape(lanes), [[1], [2]]);
});

test('merging is one-directional: a label may make execution MORE serial only', () => {
  // Three independent rows, two of them labelled: 2 lanes, never 4.
  const rows = parsePhasesTable(table([[1, '', 'lane:x', ''], [2, '', 'lane:x', ''], [3, '', '', '']]));
  assert.deepEqual(shape(deriveLanes(rows).lanes), [[1, 2], [3]]);
});

test('lanes are returned sorted by their lowest row number', () => {
  const rows = parsePhasesTable(table([[3, '', '', ''], [1, '', '', ''], [2, '', '', '']]));
  const lanes = deriveLanes(rows).lanes;
  assert.deepEqual(lanes.map((l) => l[0].num), [1, 2, 3]);
});

test('a Depends pointing at a row that does not exist is ignored rather than throwing', () => {
  const rows = parsePhasesTable(table([[1, '', '', '99']]));
  const { lanes, refusals } = deriveLanes(rows);
  assert.deepEqual(shape(lanes), [[1]]);
  assert.deepEqual(refusals, []);
});

test('CRLF line endings are handled', () => {
  const crlf = table([[1, '', '', ''], [2, '', '', '1']]).split(NL).join('\r\n');
  const rows = parsePhasesTable(crlf);
  assert.equal(rows.length, 2);
  assert.deepEqual(shape(deriveLanes(rows).lanes), [[1, 2]]);
});
