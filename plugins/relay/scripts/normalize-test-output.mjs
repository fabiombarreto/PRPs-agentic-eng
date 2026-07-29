#!/usr/bin/env node
// @ts-check
/**
 * Normalize JUnit XML output from pytest/Playwright/Vitest/node:test into the
 * relay canonical test-output schema.
 *
 * Schema definition: docs/context/test-output-schema.md (relay plugin repo)
 *
 * Usage:
 *   node normalize-test-output.mjs --framework <pytest|playwright|vitest|node:test> \
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
import { pathToFileURL } from 'node:url';

const VALID_FRAMEWORKS = ['pytest', 'playwright', 'vitest', 'node:test'];
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
  node normalize-test-output.mjs --framework <pytest|playwright|vitest|node:test> --junit <path>
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

/** Resolve one Unicode code point to a string, or null if out of range so the
 * caller can leave the original entity text untouched (never throws). */
function fromCharRef(code) {
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return null;
  try {
    return String.fromCodePoint(code);
  } catch {
    return null;
  }
}

function decodeXml(s) {
  // CDATA first, then numeric character references (node:test encodes newlines
  // in failure messages as &#10;), then named entities with &amp; last so an
  // escaped entity like &amp;lt; is not double-decoded.
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-fA-F]+);/g, (whole, hex) => fromCharRef(parseInt(hex, 16)) ?? whole)
    .replace(/&#(\d+);/g, (whole, dec) => fromCharRef(parseInt(dec, 10)) ?? whole)
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

// Opening-tag attribute run. A raw `>` is legal inside a quoted XML attribute
// value, and node:test's JUnit reporter emits `>` literally inside name="..."
// and message="..." (it only escapes `<` as `&lt;`, never `>`). A naive `[^>]*?`
// ends the tag at that raw `>`, so a self-closing `<testcase name="a>b"/>` looks
// unterminated and the lazy `>...</testcase>` body branch swallows the following
// siblings — undercounting tests and misattributing (or dropping) failures.
// Matching quoted spans wholesale means only an *unquoted* `>` closes the tag.
// Interpolate wrapped in a capturing group, `(${TAG_ATTRS})`, to keep the
// attribute string as group 1 (parseAttrs still reads double-quoted values from
// it unchanged).
const TAG_ATTRS = `(?:"[^"]*"|'[^']*'|[^>"'])*?`;

/**
 * Extract every <testsuite> block from the JUnit XML, regardless of whether
 * the root is <testsuite> or <testsuites>. JUnit allows nested <testsuite>
 * but we treat nested occurrences as siblings for counting purposes; real-world
 * JUnit from pytest/Playwright/Vitest doesn't nest.
 *
 * node:test is handled framework-specifically. Node's built-in
 * `--test-reporter=junit` emits two shapes that both defeat suite-attribute
 * summing:
 *   - bare: a <testsuites> root with <testcase> elements nested directly
 *     beneath it — no <testsuite> wrapper and no summary attributes at all
 *     (Node reports totals only in trailing XML comments);
 *   - wrapped: one <testsuite> per describe()/suite() block, arbitrarily
 *     NESTED, whose tests/failures counts do not sum cleanly across the nesting
 *     (an outer suite's `tests` already includes its inner suites).
 * In both shapes the ground truth is the <testcase> elements, so we treat the
 * entire <testsuites> body as one synthesized suite and let buildCounts /
 * sumDurationMs derive the totals by walking <testcase> elements (each appears
 * exactly once in the document regardless of nesting depth). Returns [] when no
 * <testcase> is present so the caller's malformed-input guard still fires.
 */
export function parseSuites(xml, framework) {
  if (framework === 'node:test') {
    const root = new RegExp(`<testsuites\\b(${TAG_ATTRS})(?:\\s*/>|>([\\s\\S]*?)</testsuites>)`).exec(xml);
    const body = root && root[2] ? root[2] : xml;
    if (!/<testcase\b/.test(body)) return [];
    return [{ attrs: {}, body, synthesized: true }];
  }

  const pattern = new RegExp(`<testsuite\\b(${TAG_ATTRS})(?:\\s*/>|>([\\s\\S]*?)</testsuite>)`, 'g');
  const out = [];
  let m;
  while ((m = pattern.exec(xml)) !== null) {
    out.push({ attrs: parseAttrs(m[1]), body: m[2] || '' });
  }
  return out;
}

/**
 * Count pass/fail/skip/total directly from the <testcase> elements in a
 * synthesized suite body (node:test), walking every <testcase> regardless of
 * any intervening <testsuite> nesting. A testcase is failed if its body
 * contains a nested <failure> or <error>, skipped if it contains a nested
 * <skipped>, otherwise passed. The nested element is the reliable signal:
 * node:test also puts a `failure="..."` attribute on the <testcase> open tag,
 * but an unescaped `>` in the message can truncate attribute parsing, whereas
 * the nested <failure> tag always survives inside the captured body.
 */
export function countTestcases(body) {
  let passed = 0, failed = 0, skipped = 0, total = 0;
  const tcPattern = new RegExp(`<testcase\\b(${TAG_ATTRS})(?:\\s*/>|>([\\s\\S]*?)</testcase>)`, 'g');
  let m;
  while ((m = tcPattern.exec(body)) !== null) {
    total += 1;
    const tcBody = m[2] || '';
    if (/<(failure|error)\b/.test(tcBody)) failed += 1;
    else if (/<skipped\b/.test(tcBody)) skipped += 1;
    else passed += 1;
  }
  return { passed, failed, skipped, total };
}

function sumTestcaseTimeSec(body) {
  let sec = 0;
  const tcPattern = new RegExp(`<testcase\\b(${TAG_ATTRS})(?:\\s*/>|>[\\s\\S]*?</testcase>)`, 'g');
  let m;
  while ((m = tcPattern.exec(body)) !== null) {
    const t = parseFloat(parseAttrs(m[1]).time || '0');
    if (!isNaN(t)) sec += t;
  }
  return sec;
}

export function buildCounts(suites) {
  let passed = 0, failed = 0, skipped = 0, total = 0;
  for (const { attrs, body, synthesized } of suites) {
    if (synthesized) {
      const c = countTestcases(body);
      passed += c.passed;
      failed += c.failed;
      skipped += c.skipped;
      total += c.total;
      continue;
    }
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

export function sumDurationMs(suites) {
  let totalSec = 0;
  for (const { attrs, body, synthesized } of suites) {
    if (synthesized) {
      totalSec += sumTestcaseTimeSec(body);
      continue;
    }
    const t = parseFloat(attrs.time || '0');
    if (!isNaN(t)) totalSec += t;
  }
  return Math.round(totalSec * 1000);
}

export function determineOutcome(counts) {
  if (counts.total === 0) return 'SKIPPED_UPSTREAM_FAILURE';
  if (counts.failed > 0) return 'FAILED';
  return 'PASSED';
}

export function collectFailures(suites) {
  const out = [];
  const tcPattern = new RegExp(`<testcase\\b(${TAG_ATTRS})(?:\\s*/>|>([\\s\\S]*?)</testcase>)`, 'g');
  const failPattern = new RegExp(`<(failure|error)\\b(${TAG_ATTRS})(?:\\s*/>|>([\\s\\S]*?)</\\1>)`);
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

  const suites = parseSuites(xml, args.framework);
  if (suites.length === 0 && !xml.includes('<testsuite') && !xml.includes('<testcase')) {
    die(2, `error: no <testsuite>/<testcase> elements found in ${junitPath} (malformed JUnit XML?)`);
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

// Run only when executed directly as a CLI, not when imported by tests.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
