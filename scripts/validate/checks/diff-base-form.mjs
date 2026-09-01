#!/usr/bin/env node
// @ts-check
/**
 * Check Q — diff-base form: no plugin prompt may derive its changed-file set
 * with a two-dot commit range against a diff base.
 *
 * Relay's Pillar 2 never commits, and a feature worktree's `HEAD` never moves
 * off its base, so `git diff <base>..HEAD` compares a commit to itself and
 * returns an EMPTY set. An empty set does not fail a rubric — it makes
 * `R-S1` trivially true and `R-X`, the universal test-modification guard, pass
 * by vacuity. The failure is silent by construction: every run looks green.
 *
 * This check pins the corrected single-argument form (`git diff <base>`, which
 * compares the base against the working tree) by failing on any reintroduction
 * of the two-dot shape on a line that actually invokes `git diff`.
 *
 * Prose that documents the prohibition is deliberately exempt — the contract
 * has to be able to quote the forbidden form in order to forbid it. A line is
 * exempt when it carries a prohibition marker, or when it does not invoke
 * `git diff` at all.
 *
 * Exports:
 *   checkDiffBaseForm({ files }) — pure function, no file I/O. `files` maps a
 *     path to its text (a null/undefined value means unreadable). Returns
 *     { name, ok, findings: [...] }.
 *   runDiffBaseFormCheck() — thin wrapper that reads every markdown file under
 *     plugins/relay/agents/ and plugins/relay/commands/ and delegates.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CHECK_NAME = 'diff-base-form';

const SCAN_DIRS = ['plugins/relay/agents', 'plugins/relay/commands'];

/**
 * A `git diff` invocation whose base is a placeholder or a relative commit and
 * which is followed by the two-dot range operator ending at HEAD.
 */
const TWO_DOT_FORM = /git diff\b[^\n]*?(<[A-Za-z0-9_-]+>|HEAD~\d+)\.\.HEAD/;

/** Markers identifying prose that documents the prohibition rather than using it. */
const PROHIBITION_MARKERS = ['MUST NOT', 'Never write', 'do not "restore"', 'must not be used'];

/**
 * @param {string} line
 * @returns {boolean}
 */
function isProhibitionProse(line) {
  return PROHIBITION_MARKERS.some((marker) => line.includes(marker));
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ files: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkDiffBaseForm({ files }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  const entries = Object.entries(files || {});
  if (entries.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message: `no files to scan — expected markdown under ${SCAN_DIRS.join(' and ')}; an empty scan cannot prove the invariant holds`,
          file: SCAN_DIRS[0],
          line: null,
        },
      ],
    };
  }

  for (const [path, text] of entries) {
    if (text === null || text === undefined) {
      findings.push({
        message: `missing or unreadable file: ${path}`,
        file: path,
        line: null,
      });
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!TWO_DOT_FORM.test(line)) return;
      if (isProhibitionProse(line)) return;
      findings.push({
        message: `two-dot diff range against a diff base — use the single-argument form (\`git diff <base>\`), which compares the base against the working tree. The two-dot form returns an empty set on uncommitted work, silently emptying every changed-file-set rubric item. Offending line: ${line.trim()}`,
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
export function runDiffBaseFormCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};

  for (const dir of SCAN_DIRS) {
    const abs = resolve(dir);
    if (!existsSync(abs)) {
      files[dir] = null;
      continue;
    }
    let names = [];
    try {
      names = readdirSync(abs).filter((n) => n.endsWith('.md'));
    } catch {
      files[dir] = null;
      continue;
    }
    for (const name of names) {
      const rel = join(dir, name).split('\\').join('/');
      try {
        files[rel] = readFileSync(resolve(rel), 'utf-8');
      } catch {
        files[rel] = null;
      }
    }
  }

  return checkDiffBaseForm({ files });
}
