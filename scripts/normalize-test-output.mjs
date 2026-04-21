#!/usr/bin/env node
// @ts-check
/**
 * Normalize JUnit XML output from pytest/Playwright/Vitest into the relay
 * canonical test-output schema.
 *
 * Schema definition: docs/context/test-output-schema.md (relay plugin repo)
 *
 * Usage:
 *   node normalize-test-output.mjs --framework <pytest|playwright|vitest> \
 *        --junit <path> [--tier unit|integration|e2e] [--run-id <uuid>] \
 *        [--attempt N] [--coverage <path>] [--trace <path>]
 *
 * Output: JSON record on stdout. Exits 0 on success, 2 on invalid input.
 *
 * Runtime: Node.js ≥ 18 (for built-in randomUUID and fs/promises). No npm
 * dependencies. Claude Code ships with Node, so this is portable across
 * every relay target project regardless of the project's own stack.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const VALID_FRAMEWORKS = ['pytest', 'playwright', 'vitest'];
const VALID_TIERS = ['unit', 'integration', 'e2e'];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a.startsWith('--')) {
      args[a.slice(2)] = argv[++i];
    }
  }
  return args;
}

function printHelp() {
  process.stdout.write(`Usage:
  node normalize-test-output.mjs --framework <pytest|playwright|vitest> --junit <path>
      [--tier <unit|integration|e2e>] [--run-id <uuid>] [--attempt <N>]
      [--coverage <path>] [--trace <path>]

Outputs relay canonical test-output schema v1 JSON on stdout.
Schema: docs/context/test-output-schema.md (relay plugin repo).
`);
}

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function decodeXml(s) {
  // CDATA first, then standard entities.
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseAttrs(attrString) {
  const attrs = {};
  const pattern = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = pattern.exec(attrString)) !== null) {
    attrs[m[1]] = decodeXml(m[2]);
  }
  return attrs;
}

/**
 * Extract every <testsuite> block from the JUnit XML, regardless of whether
 * the root is <testsuite> or <testsuites>. JUnit allows nested <testsuite>
 * but we treat nested occurrences as siblings for counting purposes; real-world
 * JUnit from pytest/Playwright/Vitest doesn't nest.
 */
function parseSuites(xml) {
  const pattern = /<testsuite\b([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/testsuite>)/g;
  const out = [];
  let m;
  while ((m = pattern.exec(xml)) !== null) {
    out.push({ attrs: parseAttrs(m[1]), body: m[2] || '' });
  }
  return out;
}

function buildCounts(suites) {
  let passed = 0, failed = 0, skipped = 0, total = 0;
  for (const { attrs } of suites) {
    const t = parseInt(attrs.tests || '0', 10);
    const f = parseInt(attrs.failures || '0', 10);
    const e = parseInt(attrs.errors || '0', 10);
    const s = parseInt(attrs.skipped || '0', 10);
    total += t;
    failed += f + e;
    skipped += s;
    passed += t - f - e - s;
  }
  return { passed, failed, skipped, total };
}

function sumDurationMs(suites) {
  let totalSec = 0;
  for (const { attrs } of suites) {
    const t = parseFloat(attrs.time || '0');
    if (!isNaN(t)) totalSec += t;
  }
  return Math.round(totalSec * 1000);
}

function determineOutcome(counts) {
  if (counts.total === 0) return 'SKIPPED_UPSTREAM_FAILURE';
  if (counts.failed > 0) return 'FAILED';
  return 'PASSED';
}

function collectFailures(suites) {
  const out = [];
  const tcPattern = /<testcase\b([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/testcase>)/g;
  const failPattern = /<(failure|error)\b([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/\1>)/;
  for (const { attrs: sAttrs, body } of suites) {
    const suiteName = sAttrs.name || '';
    let m;
    while ((m = tcPattern.exec(body)) !== null) {
      const tcAttrs = parseAttrs(m[1]);
      const tcBody = m[2] || '';
      const fm = failPattern.exec(tcBody);
      if (!fm) continue;
      const fAttrs = parseAttrs(fm[2]);
      const fBody = fm[3] || '';
      let line = null;
      if (tcAttrs.line) {
        const parsed = parseInt(tcAttrs.line, 10);
        line = isNaN(parsed) ? null : parsed;
      }
      const stack = decodeXml(fBody).trim();
      out.push({
        suite: suiteName,
        test: tcAttrs.name || '',
        file: tcAttrs.file || tcAttrs.classname || '',
        line,
        message: fAttrs.message || '',
        stack: stack || null,
        category: null,
        raw_framework_output_ref: `${tcAttrs.classname || ''}#${tcAttrs.name || ''}`,
      });
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.framework || !args.junit) {
    printHelp();
    die(2, 'error: --framework and --junit are required');
  }

  if (!VALID_FRAMEWORKS.includes(args.framework)) {
    die(2, `error: --framework must be one of ${VALID_FRAMEWORKS.join(', ')}`);
  }

  const tier = args.tier || 'unit';
  if (!VALID_TIERS.includes(tier)) {
    die(2, `error: --tier must be one of ${VALID_TIERS.join(', ')}`);
  }

  const attempt = parseInt(args.attempt || '1', 10);
  if (isNaN(attempt) || attempt < 1) {
    die(2, 'error: --attempt must be a positive integer');
  }

  const junitPath = resolve(args.junit);
  if (!existsSync(junitPath)) {
    die(2, `error: JUnit XML not found: ${junitPath}`);
  }

  let xml;
  try {
    xml = readFileSync(junitPath, 'utf-8');
  } catch (err) {
    die(2, `error: cannot read ${junitPath}: ${err.message}`);
  }

  const suites = parseSuites(xml);
  if (suites.length === 0 && !xml.includes('<testsuite')) {
    die(2, `error: no <testsuite> elements found in ${junitPath} (malformed JUnit XML?)`);
  }

  const counts = buildCounts(suites);
  const duration_ms = sumDurationMs(suites);
  const failures = collectFailures(suites);
  const outcome = determineOutcome(counts);

  const coveragePath = args.coverage ? resolve(args.coverage) : null;
  const tracePath = args.trace ? resolve(args.trace) : null;

  const coverage = coveragePath && existsSync(coveragePath)
    ? { lines_pct: null, branches_pct: null, source: coveragePath }
    : null;

  const artifacts = { junit_xml: junitPath };
  if (tracePath && existsSync(tracePath)) artifacts.playwright_trace = tracePath;
  if (coveragePath && existsSync(coveragePath)) artifacts.coverage_raw = coveragePath;

  const record = {
    run_id: args['run-id'] || randomUUID(),
    attempt,
    tier,
    framework: args.framework,
    outcome,
    duration_ms,
    counts,
    failures,
    coverage,
    artifacts,
    generated_at: new Date().toISOString(),
  };

  process.stdout.write(JSON.stringify(record, null, 2) + '\n');
}

main();
