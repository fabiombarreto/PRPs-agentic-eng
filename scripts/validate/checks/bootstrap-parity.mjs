#!/usr/bin/env node
// @ts-check
/**
 * Check P — `.sh`/`.ps1` bootstrap parity over the context-builder skill.
 * If `plugins/relay/skills/context-builder/SKILL.md` emits a
 * `worktree-bootstrap.sh` template, it MUST also emit a matching
 * `worktree-bootstrap.ps1` template (Windows parity).
 *
 * Exports:
 *   checkBootstrapParity({ skillMd }) — pure function over the raw SKILL.md
 *     text; returns { name, ok, findings }.
 *   runBootstrapParityCheck() — thin wrapper that reads the real SKILL.md
 *     and delegates.
 *
 * Detection is anchored on the literal `worktree-bootstrap.sh` /
 * `worktree-bootstrap.ps1` filename tokens (word-boundary matched), not a
 * fragile whole-file regex.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SKILL_MD_PATH = 'plugins/relay/skills/context-builder/SKILL.md';
const CHECK_NAME = 'bootstrap-parity';

const SH_TOKEN_RE = /worktree-bootstrap\.sh\b/;
const PS1_TOKEN_RE = /worktree-bootstrap\.ps1\b/;

/**
 * Pure check function — no file I/O. A missing/empty input is a loud
 * validation FAILURE, never a throw and never a silent pass.
 *
 * @param {{ skillMd: string | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkBootstrapParity({ skillMd }) {
  if (!skillMd) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: ${SKILL_MD_PATH}`, file: SKILL_MD_PATH, line: null }],
    };
  }

  const emitsSh = SH_TOKEN_RE.test(skillMd);
  const emitsPs1 = PS1_TOKEN_RE.test(skillMd);

  if (emitsSh && !emitsPs1) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{
        message: `${SKILL_MD_PATH} emits a worktree-bootstrap.sh template but no matching worktree-bootstrap.ps1 template — Windows hosts have no bootstrap script parity`,
        file: SKILL_MD_PATH,
        line: null,
      }],
    };
  }

  return { name: CHECK_NAME, ok: true, findings: [] };
}

/**
 * Thin wrapper — reads the real SKILL.md from the repository root and
 * delegates to the pure function above.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runBootstrapParityCheck() {
  const skillMdPath = resolve(SKILL_MD_PATH);

  let skillMd = null;
  if (existsSync(skillMdPath)) {
    try {
      skillMd = readFileSync(skillMdPath, 'utf-8');
    } catch (err) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `could not read ${SKILL_MD_PATH}: ${err.message}`, file: SKILL_MD_PATH, line: null }],
      };
    }
  }

  return checkBootstrapParity({ skillMd });
}
