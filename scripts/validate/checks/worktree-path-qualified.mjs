#!/usr/bin/env node
// @ts-check
/**
 * Check R — worktree paths are repo-qualified: every git invocation that names
 * `.worktrees/` must also name the repository it runs against.
 *
 * A workspace holds several sibling repositories, and each gets its own worktree
 * at `<repo_root>/.worktrees/<feature>/`. A command that invokes
 * `git worktree remove .worktrees/<feature>/` with no repository named runs
 * against whatever directory happens to be current — in a workspace, the
 * artifact root, which has no such worktree. The failure mode is not a clean
 * error: `git -C` and a qualified path are the difference between operating on
 * the intended repository and operating on the wrong one.
 *
 * Scope is deliberately narrow. The rule matches only lines whose trimmed form
 * BEGINS with `git ` — an actual invocation. Prose that discusses the
 * `.worktrees/<feature>/` convention, allowlist patterns naming it, and skill
 * templates describing a target project's `.gitignore` are all out of scope by
 * construction, not by an exclusion list that would need maintaining.
 *
 * Exports:
 *   checkWorktreePathQualified({ files }) — pure function, no file I/O. `files`
 *     maps a path to its text (a null/undefined value means unreadable).
 *     Returns { name, ok, findings: [...] }.
 *   runWorktreePathQualifiedCheck() — thin wrapper scanning every markdown file
 *     under plugins/relay/commands/.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CHECK_NAME = 'worktree-path-qualified';

const SCAN_DIR = 'plugins/relay/commands';

/** Leading blockquote markers and indentation, stripped before the rule applies. */
const LEADING = /^[\s>]*/;

/** The token that makes an invocation repo-scoped. */
const QUALIFIER = 'repo_root';

/**
 * Pure check function — no file I/O.
 *
 * @param {{ files: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkWorktreePathQualified({ files }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  const entries = Object.entries(files || {});
  if (entries.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [
        {
          message: `no files to scan — expected markdown under ${SCAN_DIR}; an empty scan cannot prove the invariant holds`,
          file: SCAN_DIR,
          line: null,
        },
      ],
    };
  }

  for (const [path, text] of entries) {
    if (text === null || text === undefined) {
      findings.push({ message: `missing or unreadable file: ${path}`, file: path, line: null });
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const stripped = line.replace(LEADING, '');
      if (!stripped.startsWith('git ')) return;
      if (!stripped.includes('.worktrees/')) return;
      if (stripped.includes(QUALIFIER)) return;
      findings.push({
        message: `git invocation against .worktrees/ does not name its repository — use \`git -C <repo_root> …\` and \`<repo_root>/.worktrees/<feature>/\`. Without it the command runs against the current directory, which in a workspace is the artifact root rather than the member repository. Offending line: ${stripped}`,
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
export function runWorktreePathQualifiedCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};

  const abs = resolve(SCAN_DIR);
  if (!existsSync(abs)) {
    files[SCAN_DIR] = null;
    return checkWorktreePathQualified({ files });
  }

  let names = [];
  try {
    names = readdirSync(abs).filter((n) => n.endsWith('.md'));
  } catch {
    files[SCAN_DIR] = null;
    return checkWorktreePathQualified({ files });
  }

  for (const name of names) {
    const rel = join(SCAN_DIR, name).split('\\').join('/');
    try {
      files[rel] = readFileSync(resolve(rel), 'utf-8');
    } catch {
      files[rel] = null;
    }
  }

  return checkWorktreePathQualified({ files });
}
