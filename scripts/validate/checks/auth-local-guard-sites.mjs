#!/usr/bin/env node
// @ts-check
/**
 * auth-local-guard-sites — enumerates the local-only guard sites of the
 * test-auth kit so none is silently missed.
 *
 * Fails when an enumerated site loses its guard reference, when the login
 * script template's guard, secrecy and write markers are missing, repeated or
 * reordered, when the retired per-run host flag reappears in a command or
 * agent, or when the tracked declaration or config files are ever listed in the
 * kit's ignore resource. A later phase appends its own site to GUARD_SITES.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'auth-local-guard-sites';

const TEMPLATE_FILE = 'plugins/relay/resources/auth-login.template.mjs';
const TEMPLATE_MARKERS = ['// GUARD-SITE', '// SECRECY-SITE', '// WRITE-SITE'];
const RETIRED_FLAG = '--local-host';

/**
 * @typedef {{ message: string, file: string, line: number }} Finding
 * @typedef {{ file: string, required: string[], forbidden: string[] }} GuardSite
 */

/** @type {GuardSite[]} */
export const GUARD_SITES = [
  {
    file: 'plugins/relay/scripts/auth-local-guard.mjs',
    required: ['new URL(', 'hostname', 'FAILED_NON_LOCAL_TARGET', 'PRPs/auth/local-hosts.txt', 'userinfo'],
    forbidden: [],
  },
  {
    file: TEMPLATE_FILE,
    required: ['auth-local-guard.mjs', 'auth-kit-secrecy.mjs', 'FAILED_NON_LOCAL_TARGET', ...TEMPLATE_MARKERS],
    forbidden: [],
  },
  {
    file: 'plugins/relay/commands/relay-auth-setup.md',
    required: ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET'],
    forbidden: [RETIRED_FLAG],
  },
  {
    file: 'plugins/relay/commands/relay-auth-scripts.md',
    required: ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET'],
    forbidden: [],
  },
  {
    file: 'plugins/relay/agents/auth-model-writer.md',
    required: [],
    forbidden: [RETIRED_FLAG],
  },
  {
    file: 'plugins/relay/agents/auth-model-reviewer.md',
    required: [],
    forbidden: [RETIRED_FLAG],
  },
  {
    file: 'plugins/relay/resources/auth-kit.gitignore',
    required: [],
    forbidden: ['local-hosts', 'login.config.json'],
  },
  {
    file: 'plugins/relay/scripts/qa-run.mjs',
    required: ['auth-local-guard.mjs', 'checkTarget', 'FAILED_NON_LOCAL_TARGET', '// GUARD-SITE'],
    forbidden: ['--local-host'],
  },
  {
    file: 'plugins/relay/commands/relay-qa-run.md',
    required: ['auth-local-guard.mjs', 'FAILED_NON_LOCAL_TARGET'],
    forbidden: ['--local-host'],
  },
  {
    file: 'plugins/relay/scripts/qa-query.mjs',
    required: ['FAILED_NON_LOCAL_TARGET', 'QUERY_NOT_READ_ONLY', '--local', '--remote', '--preview', '-readonly'],
    forbidden: ['--local-host'],
  },
];

/**
 * @param {{ files: Record<string, string | null> }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkAuthLocalGuardSites({ files }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @param {string} message @param {string} file */
  const add = (message, file) => findings.push({ message, file, line: 1 });

  for (const site of GUARD_SITES) {
    const text = files[site.file];
    if (text === null || text === undefined) {
      add(`guard site file is missing: ${site.file}`, site.file);
      continue;
    }
    for (const token of site.required) {
      if (!text.includes(token)) add(`guard site lacks required token \`${token}\``, site.file);
    }
    for (const token of site.forbidden) {
      if (text.includes(token)) add(`guard site contains forbidden token \`${token}\``, site.file);
    }
    if (site.file === TEMPLATE_FILE) {
      const positions = TEMPLATE_MARKERS.map((m) => text.indexOf(m));
      for (const m of TEMPLATE_MARKERS) {
        if (text.split(m).length !== 2) add(`marker \`${m}\` must appear exactly once`, site.file);
      }
      const ordered = positions.every((p) => p !== -1) && positions[0] < positions[1] && positions[1] < positions[2];
      if (!ordered) add('the guard, secrecy and write markers must appear in that order', site.file);
    }
  }
  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * @param {string} rel
 * @returns {string | null}
 */
function readOrNull(rel) {
  try {
    return readFileSync(resolve(rel), 'utf-8');
  } catch {
    return null;
  }
}

export function runAuthLocalGuardSitesCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};
  for (const site of GUARD_SITES) files[site.file] = readOrNull(site.file);
  return checkAuthLocalGuardSites({ files });
}
