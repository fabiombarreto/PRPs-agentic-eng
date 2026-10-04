#!/usr/bin/env node
// @ts-check
/**
 * qa-run-contract — pins the QA runner's contract.
 *
 * Fails when the runner script loses its closed outcome vocabulary, gains a fifth
 * outcome literal, loses its guard marker, its single write helper or its
 * human-gate statement; when the runner command loses its human-gate statement or
 * names a banned token; or when a tracked `results.json` carries a value outside
 * the contract (an unknown outcome, counts that do not partition the cases, a
 * degenerate stamp, a closed human gate, a pass or fail with no evidence).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHECK_NAME = 'qa-run-contract';

const SCRIPT_FILE = 'plugins/relay/scripts/qa-run.mjs';
const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';

const OUTCOMES_LITERAL = "export const OUTCOMES = ['pass', 'fail', 'blocked', 'needs-human'];";
const OUTCOME_VALUES = ['pass', 'fail', 'blocked', 'needs-human'];
const BANNED_IN_COMMAND = ['design-spec', 'relay-auth-setup', '.claude/PRPs', 'subagent_type']; // .claude/PRPs MUST NOT appear in the command
const ISO_MS =/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;

/**
 * @typedef {{ message: string, file: string, line: number }} Finding
 */

/**
 * @param {string} text
 * @param {string} needle
 * @returns {number}
 */
function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

/**
 * @param {any} obj a parsed results.json
 * @returns {string[]} finding messages
 */
export function validateResults(obj) {
  /** @type {string[]} */
  const msgs = [];
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return ['results is not an object'];
  const cases = Array.isArray(obj.cases) ? obj.cases : null;
  if (cases === null) msgs.push('results.cases is missing or not an array');
  /** @param {any} v @param {string} label */
  const stamp = (v, label) => {
    if (typeof v !== 'string' || !ISO_MS.test(v)) msgs.push(`${label} is missing or not a UTC instant with milliseconds`);
    else if (v.endsWith('T00:00:00Z') || v.endsWith('T00:00:00.000Z')) msgs.push(`${label} is a degenerate midnight stamp`);
  };
  stamp(obj.started_at, 'started_at');
  stamp(obj.finished_at, 'finished_at');
  if (!obj.human_gate || obj.human_gate.status !== 'open') msgs.push('human_gate.status must be "open"');
  if (cases !== null) {
    const counts = obj.counts && typeof obj.counts === 'object' ? obj.counts : {};
    const sum = OUTCOME_VALUES.reduce((n, k) => n + (Number.isInteger(counts[k]) ? counts[k] : 0), 0);
    if (sum !== cases.length) msgs.push(`cases.length (${cases.length}) does not equal the sum of counts (${sum})`);
    const resolvedCases = cases.filter((c) => c !== null && typeof c === 'object' && c.reason_code === 'AUTOMATED_EVIDENCE');
    if (obj.record_resolved !== undefined) {
      if (!Number.isInteger(obj.record_resolved) || obj.record_resolved < 0 || obj.record_resolved !== resolvedCases.length) {
        msgs.push(`record_resolved (${JSON.stringify(obj.record_resolved)}) does not equal the number of AUTOMATED_EVIDENCE cases (${resolvedCases.length})`);
      }
      for (const [i, c] of cases.entries()) {
        if (c !== null && typeof c === 'object' && c.reason_code === 'AUTOMATED_EVIDENCE' && c.outcome !== 'pass' && c.outcome !== 'fail') {
          msgs.push(`cases[${i}] carries AUTOMATED_EVIDENCE with outcome ${JSON.stringify(c.outcome)}`);
        }
      }
    }
    for (const [i, c] of cases.entries()) {
      const label = `cases[${i}]`;
      if (c === null || typeof c !== 'object') {
        msgs.push(`${label} is not an object`);
        continue;
      }
      if (!OUTCOME_VALUES.includes(c.outcome)) msgs.push(`${label}.outcome ${JSON.stringify(c.outcome)} is outside the closed vocabulary`);
      stamp(c.started_at, `${label}.started_at`);
      stamp(c.finished_at, `${label}.finished_at`);
      if ((c.outcome === 'pass' || c.outcome === 'fail') && (!Array.isArray(c.evidence) || c.evidence.length === 0)) {
        msgs.push(`${label} is ${c.outcome} with an empty evidence array`);
      }
    }
  }
  return msgs;
}

/**
 * @param {{ scriptText?: string | null, commandText?: string | null, results?: { file: string, value: any }[] }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkQaRunContract({ scriptText, commandText, results }) {
  /** @type {Finding[]} */
  const findings = [];
  /** @param {string} message @param {string} file @param {number} [line] */
  const add = (message, file, line = 1) => findings.push({ message, file, line });

  if (scriptText == null) {
    add(`missing or unreadable file: ${SCRIPT_FILE}`, SCRIPT_FILE);
  } else {
    if (!scriptText.includes(OUTCOMES_LITERAL)) add(`the runner script must contain exactly: ${OUTCOMES_LITERAL}`, SCRIPT_FILE);
    const lines = scriptText.split(/\r?\n/);
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/outcome\s*[:=]\s*['"]([^'"]+)['"]/g)) {
        if (!OUTCOME_VALUES.includes(m[1])) add(`outcome literal ${JSON.stringify(m[1])} is outside the closed vocabulary`, SCRIPT_FILE, i + 1);
      }
      if (/(writeFileSync|appendFileSync|writeFile|rmSync|unlinkSync)\(/.test(l) && l.includes('qa-report.md')) {
        add('a write call names qa-report.md: the runner must never write the report', SCRIPT_FILE, i + 1);
      }
    });
    for (const marker of ['// GUARD-SITE', '// WRITE-SITE']) {
      const n = occurrences(scriptText, marker);
      if (n !== 1) add(`the runner script must contain ${marker} exactly once, found ${n}`, SCRIPT_FILE);
    }
    for (const call of ['writeFileSync(', 'renameSync(']) {
      const n = occurrences(scriptText, call);
      if (n !== 1) add(`the single-write-helper rule: ${call} must appear exactly once, found ${n}`, SCRIPT_FILE);
    }
    for (const required of ['toISOString', 'FAILED_NON_LOCAL_TARGET', 'auth-local-guard.mjs', 'HUMAN GATE STILL OPEN']) {
      if (!scriptText.includes(required)) add(`the runner script must contain ${required}`, SCRIPT_FILE);
    }
  }

  if (commandText == null) {
    add(`missing or unreadable file: ${COMMAND_FILE}`, COMMAND_FILE);
  } else {
    for (const required of ['HUMAN GATE STILL OPEN', 'FAILED_NON_LOCAL_TARGET', 'qa-run.mjs']) {
      if (!commandText.includes(required)) add(`the runner command must contain ${required}`, COMMAND_FILE);
    }
    for (const banned of BANNED_IN_COMMAND) {
      if (commandText.includes(banned)) add(`the runner command must not contain ${banned}; .claude/PRPs MUST NOT appear anywhere in it`, COMMAND_FILE);
    }
  }

  for (const r of results ?? []) {
    for (const m of validateResults(r.value)) add(m, r.file);
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * @param {string} rel
 * @returns {string | null}
 */
function readOrNull(rel) {
  try {
    return readFileSync(resolve(rel), 'utf8');
  } catch {
    return null;
  }
}

/** @returns {{ file: string, value: any }[]} */
function walkResults() {
  /** @type {{ file: string, value: any }[]} */
  const out = [];
  const reports = resolve('PRPs', 'reports');
  /** @type {import('node:fs').Dirent[]} */ let features = [];
  try {
    features = readdirSync(reports, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const f of features) {
    if (!f.isDirectory()) continue;
    const runsDir = join(reports, f.name, 'qa-run');
    /** @type {import('node:fs').Dirent[]} */ let runs = [];
    try {
      runs = readdirSync(runsDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const r of runs) {
      if (!r.isDirectory()) continue;
      const rel = `PRPs/reports/${f.name}/qa-run/${r.name}/results.json`;
      const text = readOrNull(rel);
      if (text === null) continue;
      try {
        out.push({ file: rel, value: JSON.parse(text) });
      } catch {
        out.push({ file: rel, value: null });
      }
    }
  }
  return out;
}

/** @returns {{ name: string, ok: boolean, findings: Finding[] }} */
export function runQaRunContractCheck() {
  return checkQaRunContract({ scriptText: readOrNull(SCRIPT_FILE), commandText: readOrNull(COMMAND_FILE), results: walkResults() });
}
