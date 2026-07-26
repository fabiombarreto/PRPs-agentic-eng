#!/usr/bin/env node
// @ts-check
/**
 * gating-structure check — verifies each registered "gating site" (an
 * opt-in methodology key declared in `docs/context/methodology.md`, e.g.
 * `figma_track`) is documented in
 * `plugins/relay/skills/context-builder/SKILL.md` with all three
 * non-heuristic properties the `docs_sync` key established as precedent:
 * default-false emission on `*init`, preserve-on-`*update` (never mutate
 * an already-set value), and backfill-only-when-the-key-is-entirely-absent.
 * This check exists so drift from that discipline (e.g. a future edit that
 * silently starts heuristically inferring a gating key) is caught
 * deterministically rather than relying on review alone.
 *
 * Exports:
 *   checkGatingStructure({ skillContent }) — pure function, no I/O. Tests
 *     every registered `SITES` entry's three marker regexes against the
 *     already-read SKILL.md content and returns { name, ok, findings }.
 *   runGatingStructureCheck() — thin wrapper that reads
 *     `plugins/relay/skills/context-builder/SKILL.md` and delegates.
 *
 * Extensible by design: this module intentionally started with a single
 * site (`figma_track`, added by
 * PRPs/plans/figma-implementation-track-phase-1-foundations.plan.md Task 3)
 * and now registers a 2nd site (`visual_first_approval`, added by
 * PRPs/plans/figma-visual-first-track-phase-1-foundations.plan.md Task 5).
 * Later phases of the Figma implementation track (or any future opt-in
 * methodology key) append a new entry to the `SITES` array below instead
 * of creating a new check module — mirroring the R-COH-* additive-rubric
 * precedent already established in `plugins/relay/agents/code-reviewer.md`.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SKILL_PATH = 'plugins/relay/skills/context-builder/SKILL.md';
const CHECK_NAME = 'gating-structure';

/**
 * Registry of gating sites this check verifies. Each entry names the
 * opt-in methodology key and the three regex markers that must ALL be
 * present in SKILL.md's prose for that key's non-heuristic contract to be
 * considered documented. Append new entries here for future opt-in keys.
 *
 * @type {Array<{ key: string, markers: Array<{ id: string, pattern: RegExp }> }>}
 */
const SITES = [
  {
    key: 'figma_track',
    markers: [
      { id: 'default-false-emission', pattern: /always emit `figma_track: false`/i },
      { id: 'preserve-on-update', pattern: /`figma_track`\s*preservation/i },
      { id: 'backfill-only-when-absent', pattern: /backfill\s*`figma_track: false`/i },
    ],
  },
  {
    key: 'visual_first_approval',
    markers: [
      { id: 'default-auto-emission', pattern: /always emit `visual_first_approval: auto`/i },
      { id: 'preserve-on-update', pattern: /`visual_first_approval`\s*preservation/i },
      { id: 'backfill-only-when-absent', pattern: /backfill\s*`visual_first_approval: auto`/i },
    ],
  },
];

/**
 * Pure check function — no file I/O of its own. Verifies every registered
 * gating SITE's three non-heuristic markers are all present in
 * `skillContent` (already read by the wrapper below).
 *
 * @param {{ skillContent: string | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }> }}
 */
export function checkGatingStructure({ skillContent }) {
  if (!skillContent) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `could not read ${SKILL_PATH}`, file: SKILL_PATH, line: null }],
    };
  }

  const findings = [];

  for (const site of SITES) {
    for (const marker of site.markers) {
      if (!marker.pattern.test(skillContent)) {
        findings.push({
          message: `gating site "${site.key}" missing required marker "${marker.id}" (non-heuristic discipline undocumented)`,
          file: SKILL_PATH,
          line: null,
        });
      }
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper — reads SKILL.md's raw content and delegates to the pure
 * function above. All file I/O lives here so `checkGatingStructure` stays
 * pure and independently testable via in-memory fixtures.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }> }}
 */
export function runGatingStructureCheck() {
  const absPath = resolve(SKILL_PATH);
  if (!existsSync(absPath)) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing file: ${SKILL_PATH}`, file: SKILL_PATH, line: null }],
    };
  }

  let skillContent;
  try {
    skillContent = readFileSync(absPath, 'utf-8');
  } catch (err) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `could not read ${SKILL_PATH}: ${err.message}`, file: SKILL_PATH, line: null }],
    };
  }

  return checkGatingStructure({ skillContent });
}
