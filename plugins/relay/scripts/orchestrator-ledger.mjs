#!/usr/bin/env node
// @ts-check
/**
 * Check `/relay-execute`'s stage ledger: for every phase a run completed, did
 * each stage the protocol requires leave its entry in `orchestrator-run.json`?
 *
 * Several stages live inside the commands `/relay-execute` adopts (the docs
 * sync and the D8 mutations inside `/relay-implement`, `run.json` inside
 * `/relay-test`). An orchestrator that dispatches the agents directly instead
 * of adopting those commands drops them, and in observed unattended runs the
 * only record of that was the model's own prose summary. This script derives
 * the required stage set from the project's methodology flags and the log, so
 * a skipped stage is recorded the same way whether or not the run announced it.
 *
 * Usage:
 *   node orchestrator-ledger.mjs --run <orchestrator-run.json> \
 *        --methodology <docs/context/methodology.md> [--write]
 *
 *   --write  store the deviations array in the run file's `deviations` field
 *
 * Output: one JSON report on stdout,
 *   {"ok": bool, "phases_checked": [N, ...], "flags": {...}, "deviations":
 *    [{"phase": N, "stage": "<stage>", "problem": "<sentence>"}]}
 * Exit 0 when a report was produced, INCLUDING when deviations were found; the
 * verdict lives in the report. Exit 2 on a usage, read or parse error, with a
 * message on stderr and no report (and nothing written).
 *
 * The stage names and outcomes are the ones `relay-execute.md` defines in its
 * "The stage ledger" table and in each stage's own section.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = 'Usage: node orchestrator-ledger.mjs --run <orchestrator-run.json> --methodology <methodology.md> [--write]';

/**
 * @typedef {{ tdd: boolean, test_frameworks: string[], docs_sync: boolean }} MethodologyFlags
 * @typedef {{ phase: number, stage: string, problem: string }} Deviation
 */

/**
 * Read the three flags the ledger depends on from a methodology.md text.
 * Only the YAML frontmatter is read. `docs_sync` defaults to true when the key
 * is absent, `tdd` to false, `test_frameworks` to []: the defaults
 * `relay-implement.md` and `relay-execute.md` already apply. Pure.
 * @param {string} text
 * @returns {MethodologyFlags}
 */
export function parseMethodologyFlags(text) {
  /** @type {MethodologyFlags} */
  const flags = { tdd: false, test_frameworks: [], docs_sync: true };
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) return flags;
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z_]+):\s*(.*?)\s*(#.*)?$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === 'tdd') flags.tdd = value === 'true';
    else if (key === 'docs_sync') flags.docs_sync = value !== 'false';
    else if (key === 'test_frameworks') {
      if (value.startsWith('[')) {
        flags.test_frameworks = value
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter((s) => s !== '');
      } else if (value === '') {
        /** @type {string[]} */ const items = [];
        while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
          items.push(lines[++i].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''));
        }
        flags.test_frameworks = items;
      }
    }
  }
  return flags;
}

/**
 * @param {any[]} entries
 * @param {string} stage
 * @returns {any[]}
 */
function entriesOf(entries, stage) {
  return entries.filter((e) => e && e.stage === stage);
}

/**
 * @param {any[]} entries
 * @param {string} stage
 * @param {string[]} accepted
 * @returns {string | null} null when an accepted outcome was logged, else a problem sentence
 */
function requireOutcome(entries, stage, accepted) {
  const found = entriesOf(entries, stage);
  if (found.length === 0) return `no "${stage}" entry; expected ${accepted.map((a) => `"${a}"`).join(' or ')}`;
  if (found.some((e) => accepted.includes(e.outcome))) return null;
  const seen = [...new Set(found.map((e) => String(e.outcome)))].map((o) => `"${o}"`).join(', ');
  return `"${stage}" logged ${seen}; expected ${accepted.map((a) => `"${a}"`).join(' or ')}`;
}

/**
 * Check every completed phase of an orchestrator run against the stage ledger.
 * Pure: no I/O.
 * @param {any} run the parsed orchestrator-run.json
 * @param {MethodologyFlags} flags
 * @returns {{ ok: boolean, phases_checked: number[], flags: MethodologyFlags, deviations: Deviation[] }}
 */
export function checkLedger(run, flags) {
  /** @type {Deviation[]} */
  const deviations = [];
  const log = Array.isArray(run?.phases) ? run.phases : [];
  const completed = [...new Set(log.filter((e) => e && e.status === 'complete').map((e) => e.phase))]
    .filter((n) => typeof n === 'number')
    .sort((a, b) => a - b);
  const hasFramework = flags.test_frameworks.length > 0;

  for (const phase of completed) {
    const entries = log.filter((e) => e && e.phase === phase);
    /** @param {string} stage @param {string | null} problem */
    const add = (stage, problem) => {
      if (problem) deviations.push({ phase, stage, problem });
    };

    add('plan', requireOutcome(entries, 'plan', ['APPROVED']));

    add('worktree', requireOutcome(entries, 'worktree', ['CREATED', 'FALLBACK_CWD', 'skipped_no_worktree_flag']));
    for (const e of entriesOf(entries, 'worktree')) {
      if (e.outcome === 'FALLBACK_CWD' && !(typeof e.fallback_reason === 'string' && e.fallback_reason.trim() !== '')) {
        add('worktree', 'FALLBACK_CWD without the /relay-worktree failure that alone permits it (fallback_reason is empty)');
      }
    }

    /** @type {string[]} */
    let tdd;
    if (!hasFramework) tdd = ['skipped_no_framework'];
    else if (flags.tdd) tdd = ['APPROVED', 'skipped_foundation_phase'];
    else tdd = ['deferred_to_test_after'];
    add('tdd', requireOutcome(entries, 'tdd', tdd));

    add('implement', requireOutcome(entries, 'implement', ['APPROVED']));

    const docsAccepted = ['APPROVED', 'BUDGET_EXCEEDED', 'SKIPPED (--no-docs)'];
    if (!flags.docs_sync) docsAccepted.push('SKIPPED (docs_sync: false)');
    add('docs_sync', requireOutcome(entries, 'docs_sync', docsAccepted));

    add('d8', requireOutcome(entries, 'd8', ['APPLIED']));

    add('test_after', requireOutcome(entries, 'test_after', hasFramework && !flags.tdd ? ['APPROVED'] : ['not_applicable']));

    const testAccepted = hasFramework ? ['GREEN', 'skipped_command_absent'] : ['skipped_no_test_framework'];
    add('test', requireOutcome(entries, 'test', testAccepted));
    if (entriesOf(entries, 'test').some((e) => e.outcome === 'GREEN')) {
      add('test_review', requireOutcome(entries, 'test_review', ['APPROVED']));
    }

    add('snapshot', requireOutcome(entries, 'snapshot', ['RECORDED', 'SOFT_FAILED']));
  }

  return { ok: deviations.length === 0, phases_checked: completed, flags, deviations };
}

/**
 * @param {string[]} argv
 * @returns {{ run?: string, methodology?: string, write?: boolean, help?: boolean, error?: string }}
 */
function parseArgs(argv) {
  /** @type {{ run?: string, methodology?: string, write?: boolean, help?: boolean, error?: string }} */
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--write') args.write = true;
    else if (a === '--run' || a === '--methodology') {
      const value = argv[++i];
      if (value === undefined || value === '') return { error: `${a} needs a value` };
      args[/** @type {'run' | 'methodology'} */ (a.slice(2))] = value;
    } else return { error: `unknown argument: ${a}` };
  }
  return args;
}

/**
 * @param {string[]} argv
 * @returns {number} exit code
 */
export function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (args.error || !args.run || !args.methodology) {
    process.stderr.write(`orchestrator-ledger: ${args.error ?? '--run and --methodology are required'}\n${USAGE}\n`);
    return 2;
  }
  const runPath = resolve(args.run);
  let run;
  let methodologyText;
  try {
    run = JSON.parse(readFileSync(runPath, 'utf8'));
  } catch (err) {
    process.stderr.write(`orchestrator-ledger: cannot read ${runPath} as JSON: ${/** @type {Error} */ (err).message}\n`);
    return 2;
  }
  try {
    methodologyText = readFileSync(resolve(args.methodology), 'utf8');
  } catch (err) {
    process.stderr.write(`orchestrator-ledger: cannot read ${args.methodology}: ${/** @type {Error} */ (err).message}\n`);
    return 2;
  }
  const report = checkLedger(run, parseMethodologyFlags(methodologyText));
  if (args.write) {
    try {
      writeFileSync(runPath, `${JSON.stringify({ ...run, deviations: report.deviations }, null, 2)}\n`);
    } catch (err) {
      process.stderr.write(`orchestrator-ledger: cannot write ${runPath}: ${/** @type {Error} */ (err).message}\n`);
      return 2;
    }
  }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
