#!/usr/bin/env node
// @ts-check
/**
 * feedback-chain check — verifies the writer-side `prior_feedback` contract
 * shipped in v0.23.1 stays intact.
 *
 * Background: `prior_feedback` (the reviewer's defect list from a
 * `CHANGES_REQUESTED` verdict) was computed and passed by `/relay-execute`
 * and `/relay-implement` but consumed by ZERO writer agents, and two of the
 * three writer-side commands never forwarded it. Every retry therefore
 * regenerated its artifact from scratch, blind to what had failed. The fix
 * is prose spread across five prompt files, so nothing mechanical prevented
 * a later edit from silently re-severing it — this check is that mechanism.
 *
 * It also discharges two verification gaps accepted as technical debt during
 * the source plan's own review (see `docs/context/constraints.md`, "Known
 * TODOs / open planning items", 2026-07-30): the plan's AC-A6 had no
 * automated verification path at all, and its Task 3 gate could not detect a
 * half-completed edit. Both are now deterministic (see PLAN_WRITER_INVARIANTS).
 *
 * Exports:
 *   checkFeedbackChain({ files }) — pure function, no I/O. `files` maps each
 *     registered path to its already-read content (or null when unreadable).
 *   runFeedbackChainCheck() — thin wrapper that reads the registered files
 *     and delegates.
 *
 * Extensible by design: add a `{ command, agent }` entry to PAIRS when a new
 * writer/reviewer pair gains the input, mirroring `gating-structure.mjs`'s
 * SITES registry precedent rather than creating a new check module.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'feedback-chain';

const PLAN_WRITER = 'plugins/relay/agents/plan-writer.md';

/**
 * Every writer pair that must carry the feedback contract end to end: the
 * command forwards `prior_feedback`, and the agent both declares it and
 * defines what a targeted revision means for its own stage.
 *
 * `docs-updater` is deliberately absent — `/relay-implement` removed
 * `docs_prior_feedback` from its dispatch payload on purpose, and the docs
 * pair shows zero measured churn. Adding it here would assert a contract
 * that does not exist.
 *
 * @type {Array<{ command: string, agent: string }>}
 */
const PAIRS = [
  { command: 'plugins/relay/commands/relay-plan.md', agent: PLAN_WRITER },
  { command: 'plugins/relay/commands/relay-write-test.md', agent: 'plugins/relay/agents/test-writer.md' },
  { command: 'plugins/relay/commands/relay-implement.md', agent: 'plugins/relay/agents/implementer.md' },
];

/**
 * The four grounding-dependent rubric ids. When `plan-writer` reuses a
 * DRAFT's grounding on a retry, a citation naming any of these means the
 * grounding is itself what the reviewer rejected — so the carve-out must
 * re-run the full research dispatch. Listing only a subset silently leaves
 * the omitted ids reusing stale grounding to answer a complaint about that
 * grounding, which guarantees the same item fails again next attempt.
 */
const GROUNDING_DEPENDENT_IDS = [
  'R-COH-PATTERN-TASK-DRIFT',
  'R-COH-PATTERN-SOURCE-MISSING',
  'R-COH-MANDATORY-READING-MISSING',
  'R-COH-MANDATORY-READING-IRRELEVANT',
];

/** Slice `content` from the first line matching `startRe` up to the next line matching `endRe`. */
function slice(content, startRe, endRe) {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => endRe.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/**
 * plan-writer carries three invariants the generic PAIRS loop cannot express.
 * Each returns an error string when violated, or null when satisfied.
 *
 * @type {Array<{ id: string, check: (content: string) => string | null }>}
 */
const PLAN_WRITER_INVARIANTS = [
  {
    // Discharges accepted debt (a): the shipped gate used a bare presence
    // grep, so an edit adding the input to only one of the two input groups
    // would pass while leaving description-mode retries blind.
    id: 'input-declared-in-both-mode-groups',
    check(content) {
      const inputs = slice(content, /^## Inputs \(from the calling command\)/, /^## /);
      if (inputs === null) return 'no "## Inputs (from the calling command)" section';
      const splitAt = inputs.search(/^\*\*Description mode/m);
      if (splitAt === -1) return 'Inputs section has no "**Description mode" group to split on';
      const prd = inputs.slice(0, splitAt);
      const desc = inputs.slice(splitAt);
      const missing = [
        !prd.includes('prior_feedback') && 'PRD mode',
        !desc.includes('prior_feedback') && 'description mode',
      ].filter(Boolean);
      return missing.length
        ? `prior_feedback missing from the ${missing.join(' and ')} input group(s); a retry in that mode stays blind`
        : null;
    },
  },
  {
    // Discharges accepted debt (b): the shipped gate checked 2 of the 4 ids.
    id: 'grounding-carve-out-names-all-four-ids',
    check(content) {
      const phase2 = slice(content, /^## Phase 2 — GROUNDING/, /^## /);
      if (phase2 === null) return 'no "## Phase 2 — GROUNDING" section';
      const missing = GROUNDING_DEPENDENT_IDS.filter((id) => !phase2.includes(id));
      return missing.length
        ? `Phase 2 grounding carve-out omits ${missing.join(', ')}; a retry citing those would reuse the stale grounding they reject`
        : null;
    },
  },
  {
    // Discharges accepted debt (c) — the plan's AC-A6, which had no
    // automated verification path anywhere. The Phase 2 retry short-circuit
    // and this anti-pattern bullet must state one consistent rule; a stale
    // unqualified "one-shot" bullet contradicts the conditional above it.
    id: 'regrounding-anti-pattern-consistent-with-phase-2',
    check(content) {
      const bullet = slice(content, /^- \*\*Re-grounding without cause\.\*\*/, /^- \*\*/);
      if (bullet === null) return 'no "Re-grounding without cause" anti-pattern bullet';
      if (!/per DRAFT/i.test(bullet)) {
        return 'anti-pattern still states an unqualified one-shot rule (no "per DRAFT"), contradicting Phase 2\'s retry short-circuit';
      }
      const missing = GROUNDING_DEPENDENT_IDS.filter((id) => !bullet.includes(id));
      return missing.length
        ? `anti-pattern bullet omits carve-out id(s) ${missing.join(', ')}, so it disagrees with Phase 2's own list`
        : null;
    },
  },
];

/** Every file this check reads. */
export const WATCHED_FILES = [...new Set(PAIRS.flatMap((p) => [p.command, p.agent]))];

/**
 * Pure check function — no file I/O of its own.
 *
 * @param {{ files: Record<string, string | null | undefined> }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }> }}
 */
export function checkFeedbackChain({ files }) {
  const findings = [];
  const add = (message, file) => findings.push({ message, file, line: null });

  for (const { command, agent } of PAIRS) {
    const cmd = files[command];
    const agt = files[agent];

    if (!cmd) add(`could not read ${command}`, command);
    else if (!cmd.includes('prior_feedback')) {
      add(`command does not forward prior_feedback to ${agent}; its retries regenerate blind`, command);
    }

    if (!agt) {
      add(`could not read ${agent}`, agent);
      continue;
    }
    if (!agt.includes('prior_feedback')) {
      add(`writer does not declare prior_feedback, so ${command} forwards it into a void`, agent);
    }
    if (!/^## Targeted revision mode/m.test(agt)) {
      add('writer declares no "## Targeted revision mode" section, so a retry has no protocol to correct rather than regenerate', agent);
    }
  }

  const planWriter = files[PLAN_WRITER];
  if (planWriter) {
    for (const inv of PLAN_WRITER_INVARIANTS) {
      const err = inv.check(planWriter);
      if (err) add(`${inv.id}: ${err}`, PLAN_WRITER);
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper — reads every watched file and delegates. All I/O lives here
 * so `checkFeedbackChain` stays pure and testable via in-memory fixtures.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }> }}
 */
export function runFeedbackChainCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};
  const findings = [];

  for (const path of WATCHED_FILES) {
    const abs = resolve(path);
    if (!existsSync(abs)) {
      files[path] = null;
      findings.push({ message: `missing file: ${path}`, file: path, line: null });
      continue;
    }
    try {
      files[path] = readFileSync(abs, 'utf-8');
    } catch (err) {
      files[path] = null;
      findings.push({ message: `could not read ${path}: ${err.message}`, file: path, line: null });
    }
  }

  const result = checkFeedbackChain({ files });
  return { name: CHECK_NAME, ok: findings.length === 0 && result.ok, findings: [...findings, ...result.findings] };
}
