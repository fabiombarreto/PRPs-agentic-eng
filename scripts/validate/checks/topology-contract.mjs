#!/usr/bin/env node
// @ts-check
/**
 * Check Q — repository-topology contract parity: the canonical topology table
 * header defined in `plugins/relay/resources/repository-topology.md` is
 * cross-referenced against every command that cites the contract.
 *
 * The contract is an EXACT-MATCH parsing surface: a consuming command locates a
 * workspace's declaration by a byte-exact header line, and a one-sided edit to
 * that header — changed in the contract but not in a consumer, or the reverse —
 * silently breaks every multi-repo workspace while leaving both files looking
 * individually correct. This is the same defect class the Implementation Phases
 * header assertion guards for the PRD table.
 *
 * The check deliberately compares the two surfaces against EACH OTHER rather
 * than against a third hardcoded copy of the header: a constant living here
 * would itself drift, and a guard that can drift into agreement with nothing is
 * vacuous.
 *
 * Exports:
 *   checkTopologyContract({ contract, consumers }) — pure function, no file
 *     I/O. `contract` is the contract file's text (or null/undefined when it is
 *     missing or unreadable); `consumers` maps consumer file paths to their
 *     text (a null/undefined value means unreadable). Returns
 *     { name, ok, findings: [...] }.
 *   runTopologyContractCheck() — thin wrapper that reads the real files and
 *     delegates to the pure function.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'topology-contract';

const CONTRACT_PATH = 'plugins/relay/resources/repository-topology.md';

/**
 * Commands scanned for the contract citation. A file in this list that does NOT
 * cite the contract is simply out of scope for the header comparison — only
 * files that DO cite it are held to carrying the canonical header.
 */
const CANDIDATE_CONSUMERS = [
  'plugins/relay/commands/relay-execute.md',
  'plugins/relay/commands/relay-worktree.md',
  'plugins/relay/commands/relay-commit.md',
  'plugins/relay/commands/relay-pr.md',
  'plugins/relay/commands/relay-approve.md',
];

/**
 * Shape of a topology table header row — a leading `| Repo |` cell — used to
 * decide whether a file is in
 * scope AT ALL.
 *
 * The invariant is self-selecting: a file that RESTATES the canonical header
 * must restate it correctly. A file carrying no such row is not drifting — it
 * may name the contract, quote a HALT code, or describe the declaration in
 * prose without ever repeating the header, and holding it to a header it never
 * claimed would force it to carry a line that serves no purpose there.
 *
 * Deciding scope by a citation TOKEN was tried first and failed twice: naming
 * the contract file matched commands that only referenced a HALT code, and
 * naming the section heading matched prose that mentions that heading in
 * backticks. Both are the same mistake — inferring intent from a substring.
 * Matching the header's own shape asks the question directly. The shape is deliberately
 * the first TWO cells: a drift that RENAMES a later column (Base -> BaseRef)
 * must still be caught, so the shape cannot depend on the tail; but the leading
 * cell alone was too loose — it matched an unrelated OUTPUT table that happens
 * to start with a Repo column. Repo followed by Path is what a topology header
 * claims to be.
 */
const HEADER_SHAPE = /^\|\s*Repo\s*\|\s*Path\s*\|/;

/**
 * Extract the canonical topology header line from the contract text. The
 * contract carries exactly one copy by construction; anything else is a finding.
 *
 * @param {string} text
 * @returns {{ header: string | null, count: number }}
 */
function extractCanonicalHeader(text) {
  const matches = text
    .split(/\r?\n/)
    .filter((line) => /^\|\s*Repo\s*\|.*\|\s*Base\s*\|$/.test(line.trim()));
  if (matches.length !== 1) {
    return { header: null, count: matches.length };
  }
  return { header: matches[0].trim(), count: 1 };
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ contract: string | null | undefined, consumers: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkTopologyContract({ contract, consumers }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  if (!contract) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message: `missing or empty input: ${CONTRACT_PATH} — the repository-topology contract must exist and be readable`,
          file: CONTRACT_PATH,
          line: null,
        },
      ],
    };
  }

  const { header, count } = extractCanonicalHeader(contract);
  if (header === null) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message:
            count === 0
              ? `no canonical topology table header found in ${CONTRACT_PATH} (expected exactly one line of the form "| Repo | ... | Base |")`
              : `canonical topology table header appears ${count} times in ${CONTRACT_PATH}; exactly one copy is required so consumers compare against a single authority`,
          file: CONTRACT_PATH,
          line: null,
        },
      ],
    };
  }

  const entries = Object.entries(consumers || {});
  for (const [path, text] of entries) {
    if (text === null || text === undefined) {
      findings.push({
        message: `missing or unreadable consumer file: ${path}`,
        file: path,
        line: null,
      });
      continue;
    }
    const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!HEADER_SHAPE.test(trimmed)) return;
      // Carries a topology header row — it must be the canonical one.
      if (trimmed === header) return;
      findings.push({
        message: `${path} restates the ${CONTRACT_PATH} topology header but not verbatim — expected a line equal to: ${header}`,
        file: path,
        line: index + 1,
      });
    });
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper that reads the real files and delegates to the pure function. An
 * unreadable file is a loud validation FAILURE, never a throw and never a
 * silent pass.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runTopologyContractCheck() {
  /** @type {string | null} */
  let contract = null;
  const contractPath = resolve(CONTRACT_PATH);
  if (existsSync(contractPath)) {
    try {
      contract = readFileSync(contractPath, 'utf-8');
    } catch {
      contract = null;
    }
  }

  /** @type {Record<string, string | null>} */
  const consumers = {};
  for (const path of CANDIDATE_CONSUMERS) {
    const abs = resolve(path);
    if (!existsSync(abs)) {
      consumers[path] = null;
      continue;
    }
    try {
      consumers[path] = readFileSync(abs, 'utf-8');
    } catch {
      consumers[path] = null;
    }
  }

  return checkTopologyContract({ contract, consumers });
}
