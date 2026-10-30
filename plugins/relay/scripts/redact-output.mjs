#!/usr/bin/env node
// @ts-check
/**
 * Redact captured test output before it touches disk.
 *
 * The Test Runner may persist `stdout.log` and `junit.xml` only in redacted
 * form (`${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md`). With no tool for
 * that, an agent first stages the raw output somewhere and redacts it by hand.
 * In observed unattended runs the staging went to `/tmp`, and the raw copy
 * outlived the run because relay's own generated deny list forbids
 * `Bash(rm -rf *)`. This filter reads the raw text from stdin (or from `--in`),
 * applies Layer 1 and Layer 2 of the policy, and writes only the redacted text.
 * The redaction table is the QA runner's (`buildRedactionTable` in
 * `qa-run.mjs`), so the two consumers of the policy cannot drift apart.
 *
 * Usage:
 *   <test command> 2>&1 | node redact-output.mjs --out <file> [--root <dir>]
 *   node redact-output.mjs --in <file> --out <file> [--root <dir>]
 *
 *   --root  the artifact root holding PRPs/redaction-extensions.txt (default: cwd)
 *   --in    read this file instead of stdin; it may equal --out (in place)
 *
 * Output: one JSON line on stdout,
 *   {"out": <path>, "secrets_redacted": {"count": N, "categories":
 *    {"env_names": a, "url_values": b, "regex_matches": c}}}
 * — the shape `run.json`'s `secrets_redacted` field and the final report use.
 * Exit 0 when the redacted file was written; exit 2 on a usage or I/O error,
 * with a message on stderr and nothing written.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildRedactionTable } from './qa-run.mjs';

const REDACTED = '[REDACTED]';
const REDACTED_URL = '[REDACTED_URL]';

const USAGE = 'Usage: node redact-output.mjs --out <file> [--in <file>] [--root <dir>]';

/**
 * Redact `text` with `table`, counting each replacement by policy category.
 * Pure: no I/O.
 * @param {string} text
 * @param {{ entries: [string, string][], regexes: RegExp[] }} table
 * @returns {{ text: string, secrets_redacted: { count: number, categories: { env_names: number, url_values: number, regex_matches: number } } }}
 */
export function redactWithCounts(text, table) {
  const categories = { env_names: 0, url_values: 0, regex_matches: 0 };
  let out = text;
  for (const [value, marker] of table.entries) {
    const parts = out.split(value);
    if (parts.length > 1) {
      out = parts.join(marker);
      categories[marker === REDACTED_URL ? 'url_values' : 'env_names'] += parts.length - 1;
    }
  }
  for (const re of table.regexes) {
    re.lastIndex = 0;
    out = out.replace(re, (match) => {
      if (match === '') return match;
      categories.regex_matches += 1;
      return REDACTED;
    });
  }
  const count = categories.env_names + categories.url_values + categories.regex_matches;
  return { text: out, secrets_redacted: { count, categories } };
}

/**
 * @param {string[]} argv
 * @returns {{ out?: string, in?: string, root?: string, help?: boolean, error?: string }}
 */
function parseArgs(argv) {
  /** @type {{ out?: string, in?: string, root?: string, help?: boolean, error?: string }} */
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--out' || a === '--in' || a === '--root') {
      const value = argv[++i];
      if (value === undefined || value === '') return { error: `${a} needs a value` };
      args[/** @type {'out' | 'in' | 'root'} */ (a.slice(2))] = value;
    } else {
      return { error: `unknown argument: ${a}` };
    }
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
  if (args.error || !args.out) {
    process.stderr.write(`redact-output: ${args.error ?? '--out is required'}\n${USAGE}\n`);
    return 2;
  }
  const root = resolve(args.root ?? process.cwd());
  let raw;
  try {
    raw = readFileSync(args.in ? resolve(args.in) : 0, 'utf8');
  } catch (err) {
    process.stderr.write(`redact-output: cannot read ${args.in ?? 'stdin'}: ${/** @type {Error} */ (err).message}\n`);
    return 2;
  }
  const table = buildRedactionTable({ root, env: process.env });
  const { text, secrets_redacted } = redactWithCounts(raw, table);
  const out = resolve(args.out);
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text);
  } catch (err) {
    process.stderr.write(`redact-output: cannot write ${out}: ${/** @type {Error} */ (err).message}\n`);
    return 2;
  }
  process.stdout.write(`${JSON.stringify({ out, secrets_redacted })}\n`);
  return 0;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
