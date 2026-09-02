#!/usr/bin/env node
// @ts-check
/**
 * Check V — lane fixture: the lane derivation is exercised against two
 * synthetic fixtures on every suite run, in BOTH directions.
 *
 * The positive fixture proves the algorithm computes something. The negative
 * fixture proves the gate can REFUSE something, and that is the load-bearing
 * half. Every other lane check shipped by this feature verifies that surfaces
 * cite each other consistently; none of them can demonstrate that a
 * contradicting `Parallel` declaration is actually rejected, because until the
 * derivation became executable nothing computed a lane at all.
 *
 * The negative fixture's failure is therefore not incidental — it is the
 * deliverable. A run in which `colliding-lanes.prd.md` derives cleanly means the
 * derivation has lost the ability to refuse, and this check reports that as the
 * gate failing to fail rather than as the fixture being wrong. The distinction
 * matters because the tempting "fix" — relaxing the fixture until the suite goes
 * green — is exactly the anti-pattern this repository has a named rule against.
 *
 * The expected lane shape comes from the contract's own worked example
 * (`plugins/relay/resources/lane-model.md`), which already documents the answer.
 * That makes it a genuine oracle rather than a number invented here to agree
 * with whatever the code happens to produce.
 *
 * Exports:
 *   checkLaneFixture({ positive, negative }) — pure function, no file I/O.
 *     Both inputs are fixture file contents (null/undefined when unreadable).
 *     Returns { name, ok, findings: [...] }.
 *   runLaneFixtureCheck() — thin wrapper that reads the two fixture files.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { parsePhasesTable, deriveLanes } from '../lane-derivation.mjs';

const CHECK_NAME = 'lane-fixture';

const POSITIVE_PATH = 'scripts/validate/fixtures/three-lane.prd.md';
const NEGATIVE_PATH = 'scripts/validate/fixtures/colliding-lanes.prd.md';

/**
 * The expected lane shape of the positive fixture, taken from the contract's own
 * worked example rather than invented here.
 */
const EXPECTED_LANES = [[1, 4, 5], [2], [3]];

/** The refusal the negative fixture exists to trigger. */
const EXPECTED_REFUSAL = 'FAILED_LANE_SPLIT_FORBIDDEN';

/**
 * Render lanes as a comparable, order-independent shape.
 *
 * @param {Array<Array<{num: number}>>} lanes
 * @returns {string}
 */
function laneShape(lanes) {
  return JSON.stringify(
    lanes.map((l) => l.map((r) => r.num).sort((a, b) => a - b)).sort((a, b) => a[0] - b[0])
  );
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ positive: string | null | undefined, negative: string | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkLaneFixture({ positive, negative }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  // ---- positive fixture ----
  if (!positive) {
    findings.push({
      message: `missing or empty input: ${POSITIVE_PATH} — the positive lane fixture must exist and be readable`,
      file: POSITIVE_PATH,
      line: null,
    });
  } else {
    const rows = parsePhasesTable(positive);
    if (rows.length === 0) {
      findings.push({
        message:
          `${POSITIVE_PATH} parsed to ZERO phase rows — a fixture check with nothing to derive passes by vacuity; ` +
          'confirm the fixture still carries a canonical Implementation Phases table',
        file: POSITIVE_PATH,
        line: null,
      });
    } else {
      const { lanes, refusals } = deriveLanes(rows);
      if (refusals.length > 0) {
        findings.push({
          message:
            `${POSITIVE_PATH} derived with ${refusals.length} refusal(s) but must derive cleanly: ` +
            refusals.map((r) => r.code).join(', '),
          file: POSITIVE_PATH,
          line: null,
        });
      }
      const shape = laneShape(lanes);
      const expected = JSON.stringify(EXPECTED_LANES);
      if (shape !== expected) {
        findings.push({
          message:
            `${POSITIVE_PATH} derived lanes ${shape} but the contract's worked example documents ${expected} — ` +
            'the derivation and the contract disagree, which is a bug in the derivation',
          file: POSITIVE_PATH,
          line: null,
        });
      }
    }
  }

  // ---- negative fixture: the load-bearing half ----
  if (!negative) {
    findings.push({
      message: `missing or empty input: ${NEGATIVE_PATH} — the negative lane fixture must exist and be readable`,
      file: NEGATIVE_PATH,
      line: null,
    });
  } else {
    const rows = parsePhasesTable(negative);
    if (rows.length === 0) {
      findings.push({
        message:
          `${NEGATIVE_PATH} parsed to ZERO phase rows — the negative fixture cannot demonstrate a refusal it never ` +
          'reaches; confirm the fixture still carries a canonical Implementation Phases table',
        file: NEGATIVE_PATH,
        line: null,
      });
    } else {
      const { refusals } = deriveLanes(rows);
      if (!refusals.some((r) => r.code === EXPECTED_REFUSAL)) {
        findings.push({
          message:
            `${NEGATIVE_PATH} derived WITHOUT the expected ${EXPECTED_REFUSAL} refusal — the gate has stopped ` +
            'failing. This fixture declares two rows in one derived lane with different lane: labels, which the ' +
            'contract forbids; a clean derivation means the derivation can no longer refuse anything. Fix the ' +
            'derivation, never the fixture.',
          file: NEGATIVE_PATH,
          line: null,
        });
      }
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper that reads the real fixtures and delegates to the pure function.
 * An unreadable file is a loud validation FAILURE, never a throw and never a
 * silent pass.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runLaneFixtureCheck() {
  /** @param {string} p @returns {string | null} */
  const read = (p) => {
    const abs = resolve(p);
    if (!existsSync(abs)) return null;
    try {
      return readFileSync(abs, 'utf-8');
    } catch {
      return null;
    }
  };

  return checkLaneFixture({ positive: read(POSITIVE_PATH), negative: read(NEGATIVE_PATH) });
}
