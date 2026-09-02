#!/usr/bin/env node
// @ts-check
/**
 * Check S — lane/worktree identity parity: in every `git worktree add` command
 * the plugin documents, the slug in the worktree PATH and the slug in the
 * BRANCH name must be the same token.
 *
 * A lane gets its own filesystem only if it also gets its own branch — git
 * refuses to check one branch out in two worktrees, so the branch dimension is
 * forced by the path dimension rather than chosen alongside it. The two slugs
 * therefore have to move together. They appear on one line, in two independent
 * positions, which makes editing one and not the other easy and its consequence
 * invisible: the paths would diverge per lane while the branch silently
 * collapsed two lanes back onto one ref.
 *
 * The check compares the two positions against EACH OTHER rather than against a
 * hardcoded expected token. A constant here would itself drift, and a guard that
 * can drift into agreement with nothing is vacuous — the same reasoning
 * `topology-contract` records for the topology header.
 *
 * Vacuity is guarded explicitly. If the scanned sources yield ZERO creation
 * commands — because a file moved, was reworded out of pattern range, or was not
 * read — the check FAILS rather than reporting a clean pass over an empty set.
 * This repository has removed guards that passed on empty input at nine sites;
 * a parity check with nothing to compare is the same defect.
 *
 * Exports:
 *   checkLaneWorktreeParity({ sources }) — pure function, no file I/O.
 *     `sources` maps file paths to their text (a null/undefined value means
 *     unreadable). Returns { name, ok, findings: [...] }.
 *   runLaneWorktreeParityCheck() — thin wrapper that reads the real files and
 *     delegates to the pure function.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'lane-worktree-parity';

/**
 * Files scanned for worktree-creation commands. A file containing none is out
 * of scope for the per-line comparison — but the scanned set as a whole must
 * yield at least one, or the check has nothing to guard.
 */
const CANDIDATE_SOURCES = [
  'plugins/relay/commands/relay-worktree.md',
  'plugins/relay/commands/relay-execute.md',
];

/** The slug between `.worktrees/` and the following `/`. */
const PATH_SLUG = /\.worktrees\/([^/\s]+)\//;

/** The slug after `-b feature/`. */
const BRANCH_SLUG = /-b\s+feature\/(\S+)/;

/**
 * A line is a worktree-creation command when it invokes `worktree add` and
 * creates a branch with `-b feature/`. Both markers are required: `worktree
 * add` alone also matches the documented recovery form that reuses an existing
 * branch, which carries no `-b` and therefore no branch slug to compare.
 *
 * @param {string} line
 * @returns {boolean}
 */
function isCreationCommand(line) {
  return line.includes('worktree add') && /-b\s+feature\//.test(line);
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ sources: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkLaneWorktreeParity({ sources }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];
  let creationCommandsSeen = 0;

  const entries = Object.entries(sources || {});

  for (const [path, text] of entries) {
    if (text === null || text === undefined) {
      findings.push({
        message: `missing or unreadable source file: ${path}`,
        file: path,
        line: null,
      });
      continue;
    }

    const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
    lines.forEach((line, index) => {
      if (!isCreationCommand(line)) return;
      creationCommandsSeen += 1;

      const pathMatch = line.match(PATH_SLUG);
      const branchMatch = line.match(BRANCH_SLUG);

      if (!pathMatch) {
        findings.push({
          message: `${path} has a worktree-creation command with no .worktrees/<slug>/ path to compare against its branch`,
          file: path,
          line: index + 1,
        });
        return;
      }

      const pathSlug = pathMatch[1];
      const branchSlug = branchMatch ? branchMatch[1] : null;

      if (branchSlug === null) {
        findings.push({
          message: `${path} has a worktree-creation command whose -b feature/ branch name could not be read`,
          file: path,
          line: index + 1,
        });
        return;
      }

      if (pathSlug !== branchSlug) {
        findings.push({
          message:
            `${path} creates a worktree at .worktrees/${pathSlug}/ but branches feature/${branchSlug} — ` +
            'the path slug and the branch slug must be the same token, or two lanes share one branch',
          file: path,
          line: index + 1,
        });
      }
    });
  }

  if (creationCommandsSeen === 0) {
    findings.push({
      message:
        'no worktree-creation command found in any scanned source — a parity check with nothing to compare ' +
        'passes by vacuity; confirm the sources are readable and still carry `git worktree add ... -b feature/...`',
      file: CANDIDATE_SOURCES[0],
      line: null,
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
export function runLaneWorktreeParityCheck() {
  /** @type {Record<string, string | null>} */
  const sources = {};
  for (const path of CANDIDATE_SOURCES) {
    const abs = resolve(path);
    if (!existsSync(abs)) {
      sources[path] = null;
      continue;
    }
    try {
      sources[path] = readFileSync(abs, 'utf-8');
    } catch {
      sources[path] = null;
    }
  }

  return checkLaneWorktreeParity({ sources });
}
