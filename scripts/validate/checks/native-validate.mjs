#!/usr/bin/env node
// @ts-check
/**
 * Check A — wraps the native `claude plugin validate ./plugins/relay --strict`
 * command (Claude Code's own frontmatter / kebab-case / wrong-type-field
 * validator), scoped to the relay plugin tree only.
 *
 * A non-zero exit from the native validator is surfaced as a check finding
 * carrying the trimmed combined stdout+stderr tail. When the `claude` CLI
 * itself is unavailable (spawn ENOENT, or any other spawn-level error), this
 * check degrades gracefully: it returns `{ ok: true, findings: [] }` with a
 * `note` field describing the skip, rather than crashing the runner.
 *
 * This check is inherently I/O (it shells out to a subprocess), so — unlike
 * the pure+wrapper split used by the other checks in this suite — it is a
 * single function that both performs the subprocess call and returns the
 * `{ name, ok, findings }` contract directly.
 *
 * Scope: validates `./plugins/relay` only; never `plugins/prp-core/`.
 *
 * Runtime: Node.js >= 18. No npm dependencies beyond `node:child_process`.
 */

import { spawnSync } from 'node:child_process';

const CHECK_NAME = 'native-validate';
const PLUGIN_DIR = './plugins/relay';
const MAX_TAIL_CHARS = 2000;

/**
 * Runs `claude plugin validate ./plugins/relay --strict` via spawnSync (no
 * shell) and translates the outcome into the shared check contract.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }>, note?: string }}
 */
export function runNativeValidateCheck() {
  let result;
  try {
    result = spawnSync('claude', ['plugin', 'validate', PLUGIN_DIR, '--strict'], {
      encoding: 'utf-8',
      shell: false,
    });
  } catch (err) {
    return {
      name: CHECK_NAME,
      ok: true,
      findings: [],
      note: `native validator skipped: could not spawn "claude" CLI (${err.message})`,
    };
  }

  if (result.error) {
    // ENOENT (claude CLI not on PATH) or any other spawn-level failure —
    // graceful degradation, never a crash of the runner (AC-9).
    return {
      name: CHECK_NAME,
      ok: true,
      findings: [],
      note: `native validator skipped: "claude" CLI unavailable (${result.error.code || result.error.message})`,
    };
  }

  if (result.status !== 0) {
    const tail = `${result.stdout || ''}${result.stderr || ''}`.trim().slice(-MAX_TAIL_CHARS);
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{
        message: `claude plugin validate ${PLUGIN_DIR} --strict exited ${result.status}: ${tail}`,
        file: PLUGIN_DIR,
        line: null,
      }],
    };
  }

  return { name: CHECK_NAME, ok: true, findings: [] };
}
