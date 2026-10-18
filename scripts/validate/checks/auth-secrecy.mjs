#!/usr/bin/env node
// @ts-check
/**
 * auth-secrecy — pins the test-auth kit's secrecy split.
 *
 * Fails when the packaged ignore resource loses a required rule, gains an extra
 * re-include or a blanket rule, or when the secrecy script loses its halt code
 * or the redaction policy loses its credential-store coverage.
 *
 * With `requireRunEvidence` the QA runner's run-evidence privacy is pinned too:
 * the runner must name the FAILED_IGNORE_UNPROVEN halt and the check-ignore
 * proof, define its exported ignore rules (they must cover grounding/ and
 * evidence/ and must never re-include, blanket or hide the tracked side) and
 * its two session-value floor constants; and the redaction policy must carry
 * the run-evidence section, its two subsections, the ignore, proof and halt
 * tokens, and the same two floor numbers the runner exports.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'auth-secrecy';

const IGNORE_FILE = 'plugins/relay/resources/auth-kit.gitignore';
const SCRIPT_FILE = 'plugins/relay/scripts/auth-kit-secrecy.mjs';
const POLICY_FILE = 'plugins/relay/resources/redaction-policy.md';
const RUNNER_FILE = 'plugins/relay/scripts/qa-run.mjs';

const POLICY_HEADING = '### Credential stores, session files and storage-state paths';
const RUN_EVIDENCE_HEADING = '## QA runner evidence: session values, snapshots, screenshots and personal data';
const SOURCE_FIRST_HEADING = '### Session values are registered source-first';
const SNAPSHOT_HEADING = '### Snapshots, screenshots and personal data';

/** The directories of a run directory the runner's ignore rules must cover. */
const REQUIRED_RUN_IGNORE_RULES = ['grounding/', 'evidence/'];
/** The tracked side of a run directory: no ignore rule may name any of it. */
const TRACKED_RUN_FILES = ['results.json', 'plan.json', '.gitignore'];

/**
 * @typedef {{ message: string, file: string, line: number }} Finding
 */

/**
 * @param {{ ignoreText?: string | null, scriptText?: string | null, policyText?: string | null, runnerScriptText?: string | null, requireRunEvidence?: boolean }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkAuthSecrecy({ ignoreText, scriptText, policyText, runnerScriptText, requireRunEvidence = false }) {
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

  if (requireRunEvidence) {
    // The two numbers the policy must state, read from the runner's own exported constants.
    /** @type {string[]} */
    const floorPhrases = [];
    if (runnerScriptText == null) {
      add(`missing or unreadable file: ${RUNNER_FILE}`, RUNNER_FILE);
    } else {
      for (const token of ['FAILED_IGNORE_UNPROVEN', 'check-ignore']) {
        if (!runnerScriptText.includes(token)) add(`runner script does not contain: ${token}`, RUNNER_FILE);
      }
      const statement = /export const RUN_IGNORE_RULES = Object\.freeze\(\[([^\]]*)\]\);/.exec(runnerScriptText);
      if (statement === null) {
        add('runner script does not define: export const RUN_IGNORE_RULES = Object.freeze([...]);', RUNNER_FILE);
      } else {
        const rules = [...statement[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);
        for (const required of REQUIRED_RUN_IGNORE_RULES) {
          if (!rules.includes(required)) add(`runner ignore rules are missing required rule: ${required}`, RUNNER_FILE);
        }
        for (const rule of rules) {
          if (rule.startsWith('!')) add(`runner ignore rules have an unexpected re-include: ${rule}`, RUNNER_FILE);
          if (rule === '*' || rule === '/*') add(`runner ignore rules have a blanket rule that hides the tracked side: ${rule}`, RUNNER_FILE);
          if (TRACKED_RUN_FILES.some((name) => rule.includes(name))) add(`runner ignore rules hide the tracked side: ${rule}`, RUNNER_FILE);
        }
      }
      const length = /export const SESSION_VALUE_MIN_LENGTH = (\d+);/.exec(runnerScriptText);
      const entropy = /export const SESSION_VALUE_MIN_ENTROPY = (\d+(?:\.\d+)?);/.exec(runnerScriptText);
      if (length === null) add('runner script does not define: export const SESSION_VALUE_MIN_LENGTH = <integer>;', RUNNER_FILE);
      else floorPhrases.push(`${length[1]} characters`);
      if (entropy === null) add('runner script does not define: export const SESSION_VALUE_MIN_ENTROPY = <number>;', RUNNER_FILE);
      else floorPhrases.push(`${Number(entropy[1]).toFixed(1)} bits per character`);
    }
    // A null policy text keeps its single missing-file finding from the block above.
    if (policyText != null) {
      const required = [
        RUN_EVIDENCE_HEADING,
        SOURCE_FIRST_HEADING,
        SNAPSHOT_HEADING,
        'grounding/',
        'evidence/',
        '.gitignore',
        'git check-ignore',
        'FAILED_IGNORE_UNPROVEN',
        'not-applicable',
        'PRPs/redaction-extensions.txt',
        ...floorPhrases,
      ];
      for (const token of required) {
        if (!policyText.includes(token)) add(`redaction policy does not contain: ${token}`, POLICY_FILE);
      }
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
    runnerScriptText: readOrNull(RUNNER_FILE),
    requireRunEvidence: true,
  });
}
