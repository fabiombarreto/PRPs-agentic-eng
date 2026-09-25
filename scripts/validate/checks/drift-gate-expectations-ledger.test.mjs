// @ts-check
/**
 * Persistent shape tests for the drift-gate expectations ledger —
 * PRPs/reports/code-review-evaluation/drift-gate-expectations.json — the
 * fixture that scripts/record-drift-gate-result.mjs reads to derive
 * sample_count and that the Skill's own real-run measurement is compared
 * against for PRD AC-12 ("a deliberately degraded expectation set trips the
 * gate").
 *
 * Why this file exists (test-reviewer CHANGES_REQUESTED on
 * PRPs/reports/hybrid-code-review/test-suite-phase4.diff, R-AC-COVERAGE):
 * the plan's own Task 1 VALIDATE step ran `node -e ...` once, by hand, at
 * implementation time — it left no trace in the `node:test` corpus and is
 * never re-run by `npm run validate` or `node --test`. The only persistent
 * assertion that touched this file,
 * scripts/record-drift-gate-result.test.mjs's "sample_count is derived from
 * the real expectations ledger" test, only asserts the incidental
 * `sample_count === 10` byproduct — it does not assert that all ten entries
 * actually carry a valid STILL-PRESENT / MATCH-RELAY label. A hand-edit that
 * corrupts the ledger (wrong label, dropped or duplicated entry, missing
 * field) trips nothing in the regression suite today. This file closes that
 * gap with persistent, additive coverage asserting the ledger's real shape.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * already-shipped ledger fixture.
 *
 * Traceability: PRPs/prds/hybrid-code-review.prd.md AC-12 (plan AC-A2,
 * PRPs/plans/completed/hybrid-code-review-phase-4-drift-gate.plan.md).
 *
 * Run: node --test scripts/validate/checks/drift-gate-expectations-ledger.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEDGER_PATH = resolve('PRPs/reports/code-review-evaluation/drift-gate-expectations.json');
const VALID_LABELS = new Set(['STILL-PRESENT', 'MATCH-RELAY']);
const REQUIRED_DEFECT_FIELDS = ['id', 'sample', 'ref', 'description', 'label'];

function readLedger() {
  const raw = readFileSync(LEDGER_PATH, 'utf8');
  return JSON.parse(raw);
}

test('drift-gate-expectations.json parses as valid JSON', () => {
  assert.doesNotThrow(() => readLedger());
});

test('drift-gate-expectations.json exposes an array of exactly 10 defect entries', () => {
  const ledger = readLedger();
  assert.ok(Array.isArray(ledger.defects), 'ledger.defects must be an array');
  assert.equal(ledger.defects.length, 10);
});

test('every defect entry carries a unique id', () => {
  const { defects } = readLedger();
  const ids = defects.map((d) => d.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, defects.length, `duplicate id(s) found among: ${ids.join(', ')}`);
});

test('every defect entry has all required fields, non-empty', () => {
  const { defects } = readLedger();
  for (const defect of defects) {
    for (const field of REQUIRED_DEFECT_FIELDS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(defect, field),
        `defect ${JSON.stringify(defect.id)} is missing required field "${field}"`,
      );
      assert.equal(
        typeof defect[field],
        'string',
        `defect ${JSON.stringify(defect.id)}'s "${field}" must be a string`,
      );
      assert.ok(
        defect[field].length > 0,
        `defect ${JSON.stringify(defect.id)}'s "${field}" must be non-empty`,
      );
    }
  }
});

test('every defect entry\'s label is one of the two permitted values: STILL-PRESENT or MATCH-RELAY', () => {
  const { defects } = readLedger();
  for (const defect of defects) {
    assert.ok(
      VALID_LABELS.has(defect.label),
      `defect ${JSON.stringify(defect.id)} has an invalid label: ${JSON.stringify(defect.label)}`,
    );
  }
});

test('the ledger carries a numeric threshold and a non-empty source field', () => {
  const ledger = readLedger();
  assert.equal(typeof ledger.threshold, 'number');
  assert.equal(typeof ledger.source, 'string');
  assert.ok(ledger.source.length > 0);
});
