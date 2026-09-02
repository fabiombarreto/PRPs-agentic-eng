#!/usr/bin/env node
// @ts-check
/**
 * Check R — lane-model contract parity: every `FAILED_LANE_*` code cited by a
 * consumer must be one the contract at `plugins/relay/resources/lane-model.md`
 * actually defines in its named-code registry.
 *
 * A named code is a promise made to an operator: when a run refuses a lane
 * declaration, the operator is told a code and expects the contract to explain
 * it. A consumer that cites a code the registry does not define — a typo, a
 * rename applied on one side only, an invented code — breaks that promise while
 * leaving both files looking individually plausible. That is the same
 * one-sided-edit defect class `topology-contract` guards for the topology table
 * header, and it is checked the same way: the two surfaces are compared against
 * EACH OTHER rather than against a third hardcoded copy, because a constant
 * living here would itself drift, and a guard that can drift into agreement
 * with nothing is vacuous.
 *
 * Scope is self-selecting. A candidate consumer that cites no `FAILED_LANE_*`
 * token at all is simply out of scope — it may name the contract, describe
 * lanes in prose, or say nothing about them, and holding it to citing a code it
 * never claimed would force it to carry text that serves no purpose there. The
 * question asked is the direct one: does this file name a lane code, and if so,
 * is that code real?
 *
 * Exports:
 *   checkLaneContract({ contract, consumers }) — pure function, no file I/O.
 *     `contract` is the contract file's text (or null/undefined when it is
 *     missing or unreadable); `consumers` maps consumer file paths to their
 *     text (a null/undefined value means unreadable). Returns
 *     { name, ok, findings: [...] }.
 *   runLaneContractCheck() — thin wrapper that reads the real files and
 *     delegates to the pure function.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'lane-contract';

const CONTRACT_PATH = 'plugins/relay/resources/lane-model.md';

/**
 * Files scanned for lane-code citations. A file in this list that cites no
 * `FAILED_LANE_*` token is out of scope for the comparison — only files that DO
 * cite one are held to citing a defined one.
 */
const CANDIDATE_CONSUMERS = [
  'plugins/relay/agents/prd-reviewer.md',
  'plugins/relay/commands/relay-execute.md',
  'plugins/relay/resources/prd-template.md',
];

/** Heading under which the contract declares its codes. */
const REGISTRY_HEADING = '## Named-code registry';

/** Shape of a lane code, wherever it appears. */
const LANE_CODE = /FAILED_LANE_[A-Z0-9_]+/g;

/**
 * Extract the set of codes the contract defines under its registry heading.
 * Only the registry section counts: a code merely mentioned in prose elsewhere
 * is a reference, not a definition, and treating it as one would let the
 * registry be gutted while the check still passed.
 *
 * @param {string} text
 * @returns {{ codes: Set<string>, hasRegistry: boolean }}
 */
function extractRegisteredCodes(text) {
  const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
  const start = lines.findIndex((l) => l.trim() === REGISTRY_HEADING);
  if (start === -1) return { codes: new Set(), hasRegistry: false };

  /** @type {Set<string>} */
  const codes = new Set();
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    // The registry section ends at the next heading of the same or higher level.
    if (/^#{1,2}\s/.test(line.trim())) break;
    const found = line.match(LANE_CODE);
    if (found) found.forEach((c) => codes.add(c));
  }
  return { codes, hasRegistry: true };
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ contract: string | null | undefined, consumers: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkLaneContract({ contract, consumers }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  if (!contract) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message: `missing or empty input: ${CONTRACT_PATH} — the lane-model contract must exist and be readable`,
          file: CONTRACT_PATH,
          line: null,
        },
      ],
    };
  }

  const { codes, hasRegistry } = extractRegisteredCodes(contract);

  if (!hasRegistry) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message: `no "${REGISTRY_HEADING}" section found in ${CONTRACT_PATH}; the contract must be the single authority for its own code names`,
          file: CONTRACT_PATH,
          line: null,
        },
      ],
    };
  }

  if (codes.size === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message: `"${REGISTRY_HEADING}" in ${CONTRACT_PATH} defines no FAILED_LANE_* code; an empty registry would let every consumer citation pass by vacuity`,
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
      const cited = line.match(LANE_CODE);
      if (!cited) return;
      for (const code of cited) {
        if (codes.has(code)) continue;
        findings.push({
          message: `${path} cites lane code ${code}, which ${CONTRACT_PATH} does not define — registered codes are: ${[...codes].sort().join(', ')}`,
          file: path,
          line: index + 1,
        });
      }
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
export function runLaneContractCheck() {
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

  return checkLaneContract({ contract, consumers });
}
