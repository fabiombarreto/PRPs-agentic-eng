#!/usr/bin/env node
// @ts-check
// qa-seed.mjs - the deterministic half of /relay-qa-seed.
//
// Contract: lists a QA report's distinct required-state texts and merges validated
// proposals into PRPs/auth/qa-seed.json as `proposed` entries only. It never executes
// anything, never touches the network, never edits the report, and never writes any
// value that makes an entry runnable: the operator edits the tracked file by hand.
//
// Usage:
//   node qa-seed.mjs states --report <qa-report.md>
//   node qa-seed.mjs merge --root <dir> --report <qa-report.md> --proposals <file>

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseReport } from './qa-run.mjs';

const SEED_REL = 'PRPs/auth/qa-seed.json';
const DEFAULT_GAP = 'no existing project command was proposed for this state';

/** @param {any} v */
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {any} v */
const isStr = (v) => typeof v === 'string';

class SeedError extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * The distinct non-none required-state texts of a report, in order of first appearance.
 * @param {string} reportText
 * @returns {string[]}
 */
export function listStates(reportText) {
  const parsed = parseReport(reportText);
  if (parsed.cases.length === 0) throw new SeedError('FAILED_REPORT_UNPARSEABLE', 'the report has no parseable cases');
  /** @type {string[]} */
  const out = [];
  for (const c of parsed.cases) {
    const text = (c.required_state ?? '').trim();
    if (text === '' || /^(none|n\/a)\b/i.test(text)) continue;
    if (!out.includes(text)) out.push(text);
  }
  return out;
}

/**
 * Validates one `<path>:<line>` evidence citation against the files under root.
 * @param {string} root
 * @param {any} evidence
 * @param {string[]} command
 * @returns {string | null} a reason, or null when valid
 */
function checkEvidence(root, evidence, command) {
  if (!isStr(evidence) || evidence === '') return 'a non-null command needs evidence';
  const m = /^(.+):(\d+)$/.exec(evidence);
  if (!m) return 'evidence must be <relative-path>:<line>';
  const rel = m[1];
  const line = Number(m[2]);
  if (isAbsolute(rel) || /^[A-Za-z]:/.test(rel) || rel.split(/[\\/]/).includes('..')) return 'evidence path must be relative and stay under the root';
  const abs = resolve(root, rel);
  if (!existsSync(abs) || !statSync(abs).isFile()) return 'evidence names no existing file under the root';
  const lines = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  if (!Number.isInteger(line) || line < 1 || line > lines.length) return 'evidence line is outside the file';
  const cited = lines[line - 1];
  const needles = command.length === 1 ? [command[0]] : command.slice(1).flatMap((a) => [a, basename(a)]);
  if (!needles.some((n) => n !== '' && cited.includes(n))) return 'the cited line does not name the command';
  return null;
}

/**
 * Writes the seed file: the single write helper (tmp, then rename).
 * @param {string} root
 * @param {string} destAbs
 * @param {string} data
 */
function writeSeedFile(root, destAbs, data) {
  const dest = resolve(destAbs);
  if (dest !== resolve(root, SEED_REL)) throw new SeedError('FAILED_SEED_WRITE_REFUSED', 'only PRPs/auth/qa-seed.json may be written');
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, data); // WRITE-SITE
  renameSync(tmp, dest);
}

/**
 * @param {{ root: string, reportText: string, proposals: any }} opts
 * @returns {{ added: string[], kept: string[], gaps: string[], seed: any, changed: boolean }}
 */
function planMerge(opts) {
  const { root, reportText, proposals } = opts;
  const states = listStates(reportText);
  const seedPath = join(root, SEED_REL);
  /** @type {any} */ let seed = { states: {} };
  if (existsSync(seedPath)) {
    try {
      seed = JSON.parse(readFileSync(seedPath, 'utf8'));
    } catch {
      throw new SeedError('FAILED_SEED_FILE_UNPARSEABLE', `${SEED_REL} is not valid JSON; nothing was written`);
    }
    if (!isObj(seed) || !isObj(seed.states)) throw new SeedError('FAILED_SEED_FILE_UNPARSEABLE', `${SEED_REL} has no states object; nothing was written`);
  }
  const props = isObj(proposals) && isObj(proposals.states) ? proposals.states : null;
  if (props === null) throw new SeedError('FAILED_SEED_PROPOSAL_INVALID', 'the proposals file has no states object');
  /** @param {string} text @param {string} why */
  const invalid = (text, why) => new SeedError('FAILED_SEED_PROPOSAL_INVALID', `states[${JSON.stringify(text)}]: ${why}`);
  for (const [text, p] of Object.entries(props)) {
    if (!states.includes(text)) throw invalid(text, 'not a required-state text of the report');
    if (!isObj(p)) throw invalid(text, 'the proposal is not an object');
    if (Object.hasOwn(p, 'status')) throw invalid(text, 'a proposal must not carry a status key');
    if (p.command === null) {
      if (!isStr(p.gap) || p.gap.trim() === '') throw invalid(text, 'a null command needs a named gap');
    } else {
      if (!Array.isArray(p.command) || p.command.length === 0 || !p.command.every((a) => isStr(a) && a !== '')) throw invalid(text, 'command must be null or a non-empty array of non-empty strings');
      const why = checkEvidence(root, p.evidence, p.command);
      if (why !== null) throw invalid(text, why);
    }
    if (Object.hasOwn(p, 'store') && (!isStr(p.store) || p.store === '')) throw invalid(text, 'store must be a non-empty string');
  }
  /** @type {string[]} */ const added = [];
  /** @type {string[]} */ const kept = [];
  /** @type {string[]} */ const gaps = [];
  for (const text of states) {
    if (Object.hasOwn(seed.states, text)) {
      kept.push(text);
      continue;
    }
    const p = Object.hasOwn(props, text) ? props[text] : null;
    /** @type {any} */ let entry;
    if (p === null) {
      entry = { command: null, status: 'proposed', gap: DEFAULT_GAP };
    } else if (p.command === null) {
      entry = { command: null, status: 'proposed', gap: p.gap };
    } else {
      entry = { command: p.command, status: 'proposed', evidence: p.evidence };
      if (isStr(p.store)) entry.store = p.store;
    }
    if (entry.command === null) gaps.push(text);
    seed.states[text] = entry;
    added.push(text);
  }
  return { added, kept, gaps, seed, changed: added.length > 0 };
}

/**
 * Merges validated proposals into <root>/PRPs/auth/qa-seed.json as `proposed` entries.
 * @param {{ root: string, report: string, proposals: string }} opts
 * @returns {{ added: string[], kept: string[], gaps: string[] }}
 */
export function mergeProposals(opts) {
  const root = resolve(opts.root);
  /** @type {string} */ let reportText;
  try {
    reportText = readFileSync(opts.report, 'utf8');
  } catch {
    throw new SeedError('FAILED_REPORT_UNPARSEABLE', 'the report could not be read');
  }
  /** @type {any} */ let proposals;
  try {
    proposals = JSON.parse(readFileSync(opts.proposals, 'utf8'));
  } catch {
    throw new SeedError('FAILED_SEED_PROPOSAL_INVALID', 'the proposals file is unreadable or not valid JSON');
  }
  const plan = planMerge({ root, reportText, proposals });
  if (plan.changed) writeSeedFile(root, join(root, SEED_REL), JSON.stringify(plan.seed, null, 2) + '\n');
  return { added: plan.added, kept: plan.kept, gaps: plan.gaps };
}

const USAGE = `usage:
  qa-seed.mjs states --report <qa-report.md>
  qa-seed.mjs merge --root <dir> --report <qa-report.md> --proposals <file>
`;

/**
 * @param {string[]} args
 * @param {string} name
 * @returns {string | null}
 */
function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : null;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  const [sub, ...rest] = argv;
  if (sub === '--help' || sub === '-h') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (sub !== 'states' && sub !== 'merge') {
    process.stderr.write(USAGE);
    return 2;
  }
  try {
    const report = flag(rest, '--report');
    if (report === null) throw new SeedError('FAILED_REPORT_UNPARSEABLE', 'missing --report');
    if (sub === 'states') {
      /** @type {string} */ let text;
      try {
        text = readFileSync(report, 'utf8');
      } catch {
        throw new SeedError('FAILED_REPORT_UNPARSEABLE', 'the report could not be read');
      }
      process.stdout.write(JSON.stringify(listStates(text)) + '\n');
      return 0;
    }
    const root = flag(rest, '--root');
    const proposals = flag(rest, '--proposals');
    if (root === null || proposals === null) throw new SeedError('FAILED_SEED_PROPOSAL_INVALID', 'missing --root or --proposals');
    process.stdout.write(JSON.stringify(mergeProposals({ root, report, proposals }), null, 2) + '\n');
    return 0;
  } catch (e) {
    if (e instanceof SeedError) {
      process.stderr.write(`${e.code}: ${e.message}\n`);
      return 1;
    }
    throw e;
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
