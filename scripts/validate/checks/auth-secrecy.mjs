#!/usr/bin/env node
// @ts-check
/**
 * auth-secrecy — pins the test-auth kit's secrecy split.
 *
 * Fails when the packaged ignore resource loses a required rule, gains an extra
 * re-include or a blanket rule, or when the secrecy script loses its halt code
 * or the redaction policy loses its credential-store coverage.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'auth-secrecy';

const IGNORE_FILE = 'plugins/relay/resources/auth-kit.gitignore';
const SCRIPT_FILE = 'plugins/relay/scripts/auth-kit-secrecy.mjs';
const POLICY_FILE = 'plugins/relay/resources/redaction-policy.md';

const POLICY_HEADING = '### Credential stores, session files and storage-state paths';

/**
 * @typedef {{ message: string, file: string, line: number }} Finding
 */

/**
 * @param {{ ignoreText?: string | null, scriptText?: string | null, policyText?: string | null }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkAuthSecrecy({ ignoreText, scriptText, policyText }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @param {string} message @param {string} file */
  const add = (message, file) => findings.push({ message, file, line: 1 });

  if (ignoreText == null) {
    add(`missing or unreadable file: ${IGNORE_FILE}`, IGNORE_FILE);
  } else {
    const rules = ignoreText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'));
    for (const required of ['credentials.*', '.sessions/', '*.storage-state.json', '*.session.json']) {
      if (!rules.includes(required)) add(`ignore resource is missing required rule: ${required}`, IGNORE_FILE);
    }
    const reinclude = '!credentials.example.*';
    const reIdx = rules.indexOf(reinclude);
    if (reIdx === -1) {
      add(`ignore resource is missing required rule: ${reinclude}`, IGNORE_FILE);
    } else if (reIdx < rules.indexOf('credentials.*')) {
      add(`${reinclude} must appear after credentials.*`, IGNORE_FILE);
    }
    for (const rule of rules) {
      if (rule.startsWith('!') && rule !== reinclude) {
        add(`ignore resource has an unexpected re-include: ${rule}`, IGNORE_FILE);
      }
      if (rule === '*' || rule === '/*') {
        add(`ignore resource has a blanket rule that hides the tracked side: ${rule}`, IGNORE_FILE);
      }
    }
  }

  if (scriptText == null) {
    add(`missing or unreadable file: ${SCRIPT_FILE}`, SCRIPT_FILE);
  } else {
    for (const token of ['FAILED_IGNORE_UNPROVEN', 'check-ignore']) {
      if (!scriptText.includes(token)) add(`secrecy script does not contain: ${token}`, SCRIPT_FILE);
    }
  }

  if (policyText == null) {
    add(`missing or unreadable file: ${POLICY_FILE}`, POLICY_FILE);
  } else {
    for (const token of [POLICY_HEADING, 'Set-Cookie', 'PRPs/auth/.sessions/']) {
      if (!policyText.includes(token)) add(`redaction policy does not contain: ${token}`, POLICY_FILE);
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

export function runAuthSecrecyCheck() {
  return checkAuthSecrecy({
    ignoreText: readOrNull(IGNORE_FILE),
    scriptText: readOrNull(SCRIPT_FILE),
    policyText: readOrNull(POLICY_FILE),
  });
}
