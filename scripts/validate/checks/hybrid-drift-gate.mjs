#!/usr/bin/env node
// @ts-check
/**
 * Check — hybrid drift gate: verifies the drift gate's recorded-verdict file
 * (`plugins/relay/resources/drift-gate-status.json`) is well-formed,
 * internally consistent, and actually wired into `code-reviewer.md`'s
 * hybrid pass section.
 *
 * Per `docs/decisions.md` [2026-09-21] decision point 4, the pinned sample
 * set is the regression set for the unversioned `/code-review` skill;
 * falling below a recall threshold disables the hybrid pass with a logged
 * reason. This check never re-runs `/code-review` and never invokes
 * `Skill` — it is a fast, offline, pure read + parse + compare, consistent
 * with the suite's fast/offline contract. The live measurement half of the
 * gate is a separate, manually-triggered procedure
 * (`scripts/record-drift-gate-result.mjs`), out of scope for this check.
 *
 * Exports:
 *   checkHybridDriftGate({ statusText, agentText }) — pure function, no file
 *     I/O. `statusText` is the raw text of `drift-gate-status.json`;
 *     `agentText` is the raw text of `code-reviewer.md`. Either may be
 *     null/undefined for missing/unreadable. Returns { name, ok, findings }.
 *   runHybridDriftGateCheck() — thin wrapper that reads the two real files
 *     and delegates.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'hybrid-drift-gate';

const STATUS_PATH = 'plugins/relay/resources/drift-gate-status.json';
const AGENT_PATH = 'plugins/relay/agents/code-reviewer.md';

const REQUIRED_KEYS = ['disabled', 'reason', 'recall', 'threshold', 'sample_count', 'measured_at'];

/**
 * Pure check function — no file I/O.
 *
 * @param {{ statusText: string | null | undefined, agentText: string | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkHybridDriftGate({ statusText, agentText }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  if (statusText === null || statusText === undefined) {
    findings.push({
      message: `missing or unreadable file: ${STATUS_PATH}`,
      file: STATUS_PATH,
      line: null,
    });
  } else {
    let status;
    try {
      status = JSON.parse(statusText);
    } catch (err) {
      findings.push({
        message: `${STATUS_PATH} failed to JSON.parse: ${err.message}`,
        file: STATUS_PATH,
        line: null,
      });
      status = null;
    }

    if (status) {
      for (const key of REQUIRED_KEYS) {
        if (!(key in status)) {
          findings.push({
            message: `${STATUS_PATH} is missing required key "${key}"`,
            file: STATUS_PATH,
            line: null,
          });
        }
      }

      if (REQUIRED_KEYS.every((key) => key in status)) {
        if (status.recall !== null && status.disabled !== status.recall < status.threshold) {
          findings.push({
            message: `${STATUS_PATH}: disabled (${status.disabled}) is inconsistent with recall (${status.recall}) < threshold (${status.threshold})`,
            file: STATUS_PATH,
            line: null,
          });
        }

        if (status.disabled === true && !status.reason) {
          findings.push({
            message: `${STATUS_PATH}: disabled:true must carry a non-empty reason`,
            file: STATUS_PATH,
            line: null,
          });
        }
      }
    }
  }

  if (agentText === null || agentText === undefined) {
    findings.push({
      message: `missing or unreadable file: ${AGENT_PATH}`,
      file: AGENT_PATH,
      line: null,
    });
  } else {
    if (!agentText.includes('DRIFT_GATE_DISABLED')) {
      findings.push({
        message: `${AGENT_PATH} does not contain the literal substring "DRIFT_GATE_DISABLED" — the hybrid pass section does not appear to wire the drift gate`,
        file: AGENT_PATH,
        line: null,
      });
    }
    if (!agentText.includes('resources/drift-gate-status.json')) {
      findings.push({
        message: `${AGENT_PATH} does not contain the literal substring "resources/drift-gate-status.json" — the hybrid pass section does not appear to read the status file`,
        file: AGENT_PATH,
        line: null,
      });
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper that reads the real files and delegates to the pure function.
 * An unreadable file is a loud validation FAILURE, never a throw and never a
 * silent pass.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runHybridDriftGateCheck() {
  let statusText = null;
  try {
    statusText = readFileSync(resolve(STATUS_PATH), 'utf-8');
  } catch {
    statusText = null;
  }

  let agentText = null;
  try {
    agentText = readFileSync(resolve(AGENT_PATH), 'utf-8');
  } catch {
    agentText = null;
  }

  return checkHybridDriftGate({ statusText, agentText });
}
