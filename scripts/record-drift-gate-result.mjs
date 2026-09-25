#!/usr/bin/env node
// @ts-check
/**
 * record-drift-gate-result.mjs — CLI that records a measured recall run
 * against the drift gate's pinned sample set (see
 * `docs/decisions.md` [2026-09-21] decision point 4).
 *
 * An operator (or a separately-dispatched measurement agent) re-reviews
 * the ten samples in `PRPs/reports/code-review-evaluation/build-samples.sh`
 * with `/code-review high`, counts how many of
 * `drift-gate-expectations.json`'s ten pinned defects the pass's findings
 * text recovers, and passes that count here as `--recall`. This script
 * computes `disabled = recall < threshold` and writes the recorded-verdict
 * file `code-reviewer.md`'s hybrid pass section reads.
 *
 * Usage:
 *   node scripts/record-drift-gate-result.mjs --recall <int> [--threshold <int>] [--reason <string>] [--status-path <path>]
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_STATUS_PATH = 'plugins/relay/resources/drift-gate-status.json';
const DEFAULT_THRESHOLD = 8;
const DEFAULT_SAMPLE_COUNT = 10;
const EXPECTATIONS_PATH = 'PRPs/reports/code-review-evaluation/drift-gate-expectations.json';

/**
 * @param {string[]} argv
 * @returns {{ recall: string | undefined, threshold: string | undefined, reason: string | undefined, statusPath: string | undefined }}
 */
function parseArgs(argv) {
  /** @type {{ recall: string | undefined, threshold: string | undefined, reason: string | undefined, statusPath: string | undefined }} */
  const out = { recall: undefined, threshold: undefined, reason: undefined, statusPath: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--recall') {
      out.recall = argv[i + 1];
      i += 1;
    } else if (arg === '--threshold') {
      out.threshold = argv[i + 1];
      i += 1;
    } else if (arg === '--reason') {
      out.reason = argv[i + 1];
      i += 1;
    } else if (arg === '--status-path') {
      out.statusPath = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

/**
 * @param {string | undefined} value
 * @returns {number | null}
 */
function parseNonNegativeInt(value) {
  if (value === undefined) return null;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

function die(msg) {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const recall = parseNonNegativeInt(args.recall);
  if (recall === null) {
    die('--recall is required and must be a non-negative integer');
  }

  const thresholdArg = args.threshold === undefined ? String(DEFAULT_THRESHOLD) : args.threshold;
  const threshold = parseNonNegativeInt(thresholdArg);
  if (threshold === null) {
    die('--threshold must be a non-negative integer');
  }

  const statusPath = args.statusPath || DEFAULT_STATUS_PATH;

  let sampleCount = DEFAULT_SAMPLE_COUNT;
  try {
    const expectationsText = readFileSync(resolve(EXPECTATIONS_PATH), 'utf-8');
    const expectations = JSON.parse(expectationsText);
    if (Array.isArray(expectations.defects)) {
      sampleCount = expectations.defects.length;
    }
  } catch (err) {
    process.stderr.write(
      `warning: could not read ${EXPECTATIONS_PATH} (${err.message}); falling back to sample_count=${DEFAULT_SAMPLE_COUNT}\n`,
    );
  }

  const disabled = recall < threshold;
  const reason = disabled ? args.reason || `recall ${recall}/${threshold} below threshold` : null;

  const status = {
    disabled,
    reason,
    recall,
    threshold,
    sample_count: sampleCount,
    measured_at: new Date().toISOString(),
  };

  writeFileSync(resolve(statusPath), `${JSON.stringify(status, null, 2)}\n`, 'utf-8');

  process.stdout.write(
    `recorded drift gate result: recall=${recall}/${threshold}, disabled=${disabled} -> ${statusPath}\n`,
  );
}

main();
