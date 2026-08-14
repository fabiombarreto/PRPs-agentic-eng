#!/usr/bin/env node
// @ts-check
/**
 * metrics-isolation check — the anti-Goodhart guard for the usage-metrics
 * artifact, enforced as a build invariant rather than a prose promise.
 *
 * The rule: no pipeline agent, command, or skill may reference the metrics
 * artifact path. An LLM reviewer that could read its own pass-rate would have
 * an incentive to approve leniently, which is the failure mode the whole
 * measurement design exists to avoid. The artifact is written by an
 * operator-invoked script and read by an operator; the pipeline never sees it.
 *
 * Scope deliberately includes `plugins/relay/skills/` alongside `agents/` and
 * `commands/`. That is not padding: `skills/` holds `context-builder`, the one
 * shipped skill, and it is exactly the file a future phase would be tempted to
 * teach about the metrics directory. Excluding it would leave the widest gap.
 *
 * A second, narrower rule covers the codebook: the metrics SCHEMA resource may
 * name the path (it documents it), but no agent/command/skill may cite the
 * schema in a way that instructs reading the data.
 *
 * Exports:
 *   checkMetricsIsolation({ files }) — pure function, no I/O. `files` is a
 *     list of { path, content }.
 *   runMetricsIsolationCheck() — wrapper that walks the three scoped
 *     directories and delegates.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHECK_NAME = 'metrics-isolation';

/** Directories whose prose the pipeline turns into agent context. */
const SCOPED_DIRS = [
  'plugins/relay/agents',
  'plugins/relay/commands',
  'plugins/relay/skills',
];

/**
 * The artifact path. A literal match anywhere in a scoped file is a finding.
 * Kept as a plain string (not a regex) so the failure message can quote it.
 */
const FORBIDDEN_PATH = 'PRPs/metrics';

/**
 * The one sanctioned exception: a file may quote the path inside an explicit
 * prohibition, exactly as `docs/anti-patterns.md`'s own idiom does. A line
 * carrying this marker is a rule ABOUT the path, not an instruction to read it.
 */
const PROHIBITION_MARKER = /never|must not|forbidden|MUST NOT/i;

/**
 * @param {{files: {path: string, content: string}[]}} input
 * @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}}
 */
export function checkMetricsIsolation(input) {
  /** @type {{message: string, file: string, line: number}[]} */ const findings = [];

  for (const file of input.files) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(FORBIDDEN_PATH)) continue;
      if (PROHIBITION_MARKER.test(lines[i])) continue;
      findings.push({
        message:
          `references the usage-metrics artifact path "${FORBIDDEN_PATH}" outside a quoted prohibition. `
          + 'No pipeline agent, command, or skill may read metrics: a reviewer aware of its own pass rate '
          + 'has an incentive to approve leniently. If this line is a rule about the path rather than an '
          + 'instruction to read it, phrase it as an explicit prohibition (never / must not / forbidden).',
        file: file.path,
        line: i + 1,
      });
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/** Recursively collect readable text files under a directory. */
function walk(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(path, acc);
    else if (/\.(md|json|mjs|js)$/.test(name)) {
      try {
        acc.push({ path: path.split('\\').join('/'), content: readFileSync(path, 'utf8') });
      } catch {
        // unreadable file — skip rather than crash the runner
      }
    }
  }
  return acc;
}

/** @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}} */
export function runMetricsIsolationCheck() {
  /** @type {{path: string, content: string}[]} */ const files = [];
  for (const dir of SCOPED_DIRS) walk(resolve(dir), files);
  return checkMetricsIsolation({ files });
}

/** Every directory this check reads. @type {string[]} */
export const WATCHED_DIRS = SCOPED_DIRS;
