#!/usr/bin/env node
// @ts-check
/**
 * Check T — shared-state writer registry parity: every surface the lane
 * contract registers as a writer of shared state must exist, and must still
 * carry the anchor the contract attributes to it.
 *
 * The lane model's safety argument is that shared state has exactly one writer
 * at a time, and it names the surfaces that write it. That naming is a claim
 * about OTHER files — a claim that decays silently. A procedure gets renamed, a
 * mutation is restructured, a file moves; the registry keeps asserting a
 * pipeline that no longer exists, and the concurrency guarantee it underwrites
 * quietly stops describing anything. Prose cannot be held to account this way;
 * a parseable table can.
 *
 * The check verifies the contract's claims against the real files rather than
 * against a hardcoded expected list. A constant here would be a second copy of
 * the registry, free to drift from the first, which is the defect rather than
 * the guard.
 *
 * Vacuity is guarded explicitly. A registry that parses to ZERO rows — because
 * the table was reworded, renamed, or removed — would otherwise report a clean
 * pass while verifying nothing. That is the same failure this repository removed
 * at nine sites in a single day, and the guard is copied deliberately from
 * `lane-worktree-parity.mjs` rather than reinvented.
 *
 * Exports:
 *   checkLaneStateWriters({ contract, surfaces }) — pure function, no file I/O.
 *     `contract` is the lane-model text (null/undefined when missing);
 *     `surfaces` maps registered file paths to their text (a null/undefined
 *     value means unreadable or absent). Returns { name, ok, findings: [...] }.
 *   runLaneStateWritersCheck() — thin wrapper that reads the real files and
 *     delegates to the pure function.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'lane-state-writers';

const CONTRACT_PATH = 'plugins/relay/resources/lane-model.md';

/** The registry table's header line, matched byte-for-byte. */
const REGISTRY_HEADER = '| Surface | Anchor | Writes |';

/**
 * A GFM separator row: pipes, dashes, colons and whitespace ONLY.
 *
 * The pipe must be inside the character class. A three-column separator is
 * `|---|---|---|`, whose INTERNAL pipes a class of `[\s:-]` cannot match — so a
 * class that omits `|` fails to recognise any multi-column separator and parses
 * it as a data row, registering `---------` as a shared-state writer.
 */
const SEPARATOR = /^[|\s:-]+$/;

/**
 * Strip backticks and surrounding whitespace from a table cell.
 *
 * @param {string} cell
 * @returns {string}
 */
function cellValue(cell) {
  return cell.replace(/`/g, '').trim();
}

/**
 * Parse the registry into { surface, anchor } pairs. Parsing stops at the first
 * line that is not a table row, so prose following the table is not consumed.
 *
 * @param {string} text
 * @returns {Array<{ surface: string, anchor: string, line: number }>}
 */
function parseRegistry(text) {
  const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
  const start = lines.findIndex((l) => l.trim() === REGISTRY_HEADER);
  if (start === -1) return [];

  /** @type {Array<{ surface: string, anchor: string, line: number }>} */
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (SEPARATOR.test(trimmed)) continue;
    if (!trimmed.startsWith('|')) break;

    const cells = trimmed.split('|').slice(1, -1);
    if (cells.length < 2) continue;

    const surface = cellValue(cells[0]);
    const anchor = cellValue(cells[1]);
    if (!surface || !anchor) continue;

    rows.push({ surface, anchor, line: i + 1 });
  }
  return rows;
}

/**
 * The registered surfaces, exported so the fs wrapper and any caller read the
 * same list the contract itself declares.
 *
 * @param {string | null | undefined} contract
 * @returns {string[]}
 */
export function registeredSurfaces(contract) {
  if (!contract) return [];
  return parseRegistry(contract).map((r) => r.surface);
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ contract: string | null | undefined, surfaces: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkLaneStateWriters({ contract, surfaces }) {
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

  const rows = parseRegistry(contract);

  if (rows.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message:
            `no shared-state writer rows parsed from ${CONTRACT_PATH} (expected a table under the header ` +
            `"${REGISTRY_HEADER}") — a registry check with nothing to verify passes by vacuity`,
          file: CONTRACT_PATH,
          line: null,
        },
      ],
    };
  }

  const provided = surfaces || {};

  for (const { surface, anchor, line } of rows) {
    const text = provided[surface];

    if (text === null || text === undefined) {
      findings.push({
        message: `${CONTRACT_PATH} registers ${surface} as a shared-state writer, but that file is missing or unreadable`,
        file: CONTRACT_PATH,
        line,
      });
      continue;
    }

    if (!text.includes(anchor)) {
      findings.push({
        message:
          `${CONTRACT_PATH} attributes the anchor "${anchor}" to ${surface}, but that file does not contain it — ` +
          'the registry is describing a pipeline that no longer exists',
        file: CONTRACT_PATH,
        line,
      });
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper that reads the real files and delegates to the pure function.
 * The surfaces read are exactly the ones the contract registers — reading a
 * hardcoded list instead would let a newly registered writer go unverified.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runLaneStateWritersCheck() {
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
  const surfaces = {};
  for (const path of registeredSurfaces(contract)) {
    const abs = resolve(path);
    if (!existsSync(abs)) {
      surfaces[path] = null;
      continue;
    }
    try {
      surfaces[path] = readFileSync(abs, 'utf-8');
    } catch {
      surfaces[path] = null;
    }
  }

  return checkLaneStateWriters({ contract, surfaces });
}
