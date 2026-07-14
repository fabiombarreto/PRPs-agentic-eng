#!/usr/bin/env node
// @ts-check
/**
 * Check G — artifact naming: no doubled `.plan` segment in review-log
 * filenames under `PRPs/plans/` (e.g. `<basename>.plan.review.jsonl` instead
 * of the correct `<basename>.review.jsonl`, `<basename>.code-review.jsonl`,
 * or `<basename>.test-write-review.jsonl`).
 *
 * Exports:
 *   checkArtifactNaming({ planFiles }) — pure function over an array of
 *     `PRPs/plans/*.jsonl` basenames/paths; returns { name, ok, findings }.
 *   runArtifactNamingCheck() — thin wrapper that lists the real
 *     `PRPs/plans/*.jsonl` files (top-level only; `PRPs/plans/completed/` is
 *     not descended into) and delegates.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const PLANS_DIR = 'PRPs/plans';
const CHECK_NAME = 'artifact-naming';

// Matches the doubled ".plan" segment directly preceding one of the three
// legitimate review-log suffixes.
const DOUBLED_PLAN_RE = /\.plan\.(review|code-review|test-write-review)\.jsonl$/;

/**
 * Pure check function — no file I/O. Flags every `PRPs/plans/*.jsonl` path
 * whose basename carries a doubled `.plan` segment.
 *
 * @param {{ planFiles: string[] | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkArtifactNaming({ planFiles }) {
  if (!planFiles) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: listing of ${PLANS_DIR}/*.jsonl`, file: PLANS_DIR, line: null }],
    };
  }

  const findings = [];
  for (const file of planFiles) {
    if (DOUBLED_PLAN_RE.test(file)) {
      findings.push({
        message: `doubled ".plan" segment in artifact filename — expected "<basename>.review.jsonl", "<basename>.code-review.jsonl", or "<basename>.test-write-review.jsonl"`,
        file,
        line: null,
      });
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper — lists the real `PRPs/plans/*.jsonl` files (top-level only)
 * relative to the repository root and delegates to the pure function above.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runArtifactNamingCheck() {
  const dirPath = resolve(PLANS_DIR);
  if (!existsSync(dirPath)) {
    return checkArtifactNaming({ planFiles: [] });
  }

  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `could not read ${PLANS_DIR}: ${err.message}`, file: PLANS_DIR, line: null }],
    };
  }

  const planFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.jsonl'))
    .map((entry) => `${PLANS_DIR}/${entry.name}`);

  return checkArtifactNaming({ planFiles });
}
