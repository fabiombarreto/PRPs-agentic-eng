#!/usr/bin/env node
// @ts-check
/**
 * Generate the human-readable final-report.md for a relay Test Runner
 * session. Reads all artifacts in PRPs/reports/<feature>/ produced by the
 * /relay-test and /relay-test-review commands; writes final-report.md to
 * the same directory.
 *
 * Schema inputs:
 *   run.json              — state from /relay-test (B4 loop)
 *   test-review.json      — verdict from /relay-test-review (B5; optional)
 *   attempts/<N>/record.json  — normalized per-attempt record (B2 + B3)
 *   attempts/<N>/stdout.log   — redacted execution log (referenced only)
 *   attempts/<N>/diff.patch   — git diff for the attempt (referenced only)
 *
 * Output: AC-10 compliant markdown report (PRPs/prds/test-runner.prd.md).
 *
 * Runtime: Node.js ≥ 18. No npm dependencies.
 *
 * Usage:
 *   node generate-final-report.mjs <reports-dir> [--out <path>]
 *
 * When --out is omitted, writes <reports-dir>/final-report.md.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') flags.help = true;
    else if (a === '--out') flags.out = argv[++i];
    else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else positional.push(a);
  }
  return { positional, flags };
}

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function printHelp() {
  process.stdout.write(`Usage:
  node generate-final-report.mjs <reports-dir> [--out <path>]

Reads run.json, test-review.json (optional), and attempts/<N>/record.json
from <reports-dir>. Writes final-report.md to the same directory (or to
<path> when --out is given).
`);
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    process.stderr.write(`warning: could not parse ${path}: ${err.message}\n`);
    return null;
  }
}

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

function outcomeBadge(outcome) {
  const map = {
    GREEN: '✅ GREEN',
    PASSED: '✅ PASSED',
    FAILED: '❌ FAILED',
    FAILED_AFTER_N_RETRIES: '❌ FAILED_AFTER_N_RETRIES',
    FAILED_TIME_BUDGET_EXCEEDED: '⏱ FAILED_TIME_BUDGET_EXCEEDED',
    FAILED_OSCILLATION: '🔁 FAILED_OSCILLATION',
    FAILED_INFRA_UNRECOVERABLE: '⚠ FAILED_INFRA_UNRECOVERABLE',
    SKIPPED_UPSTREAM_FAILURE: '⏭ SKIPPED_UPSTREAM_FAILURE',
    skipped_no_test_framework: '⏭ skipped_no_test_framework',
  };
  return map[outcome] || outcome || '—';
}

function verdictBadge(verdict) {
  if (!verdict) return '—';
  if (verdict === 'APPROVED') return '✅ APPROVED';
  if (verdict === 'CHANGES_REQUESTED') return '⚠ CHANGES_REQUESTED';
  return verdict;
}

function listAttempts(reportsDir) {
  const attemptsDir = join(reportsDir, 'attempts');
  if (!existsSync(attemptsDir)) return [];
  return readdirSync(attemptsDir)
    .filter((name) => statSync(join(attemptsDir, name)).isDirectory())
    .map((name) => ({ n: parseInt(name, 10), dir: join(attemptsDir, name) }))
    .filter((a) => !isNaN(a.n))
    .sort((a, b) => a.n - b.n);
}

function loadAttemptRecords(reportsDir) {
  const attempts = listAttempts(reportsDir);
  return attempts.map(({ n, dir }) => {
    const record = readJsonIfExists(join(dir, 'record.json'));
    // Keep artifact references relative to the reports dir and always with
    // forward slashes so the markdown renders consistently across platforms.
    const stdoutLog = existsSync(join(dir, 'stdout.log'))
      ? `attempts/${n}/stdout.log`
      : null;
    const diff = existsSync(join(dir, 'diff.patch'))
      ? `attempts/${n}/diff.patch`
      : null;
    return { n, record, stdoutLog, diff };
  });
}

function buildFailureHistogram(attempts) {
  const histogram = { legitimate: 0, infra: 0, flaky: 0, weak_test: 0, unclassified: 0 };
  for (const { record } of attempts) {
    if (!record || !Array.isArray(record.failures)) continue;
    for (const f of record.failures) {
      const cat = f.category;
      if (cat && histogram[cat] !== undefined) histogram[cat]++;
      else histogram.unclassified++;
    }
  }
  return histogram;
}

function buildMarkdown(reportsDir, runData, reviewData, attempts) {
  const lines = [];
  const feature = runData?.feature || '(feature not recorded)';
  const runId = runData?.run_id || '(run_id not recorded)';
  const outcome = runData?.outcome || 'UNKNOWN';
  const elapsedMs = runData?.elapsed_ms ?? null;
  const tdd = runData?.tdd_mode === true;
  const maxRetries = runData?.max_test_retries ?? null;
  const maxMinutes = runData?.max_test_minutes ?? null;

  lines.push(`# Test Runner Report — ${feature}`);
  lines.push('');
  lines.push(`**Outcome:** ${outcomeBadge(outcome)}`);
  lines.push(`**Duration:** ${formatDuration(elapsedMs)}`);
  lines.push(`**Run ID:** \`${runId}\``);
  lines.push(`**TDD track:** ${tdd ? 'active' : 'inactive'}`);
  if (maxRetries != null || maxMinutes != null) {
    const budgets = [];
    if (maxRetries != null) budgets.push(`max_test_retries = ${maxRetries}`);
    if (maxMinutes != null) budgets.push(`max_test_minutes = ${maxMinutes}`);
    lines.push(`**Budgets:** ${budgets.join(', ')}`);
  }
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  const attemptCount = attempts.length;
  const attemptCap = maxRetries != null ? maxRetries + 1 : null;
  lines.push(`| Attempts | ${attemptCount}${attemptCap != null ? ` / ${attemptCap}` : ''} |`);
  lines.push(`| Total wall-clock | ${formatDuration(elapsedMs)} |`);
  const reviewVerdict = reviewData?.verdict || null;
  lines.push(`| Post-green review | ${reviewVerdict ? verdictBadge(reviewVerdict) : 'not run'} |`);
  lines.push('');

  // Time breakdown
  const breakdown = runData?.time_breakdown || null;
  if (breakdown && Object.keys(breakdown).length > 0) {
    lines.push('## Time breakdown');
    lines.push('');
    lines.push('| Phase | Duration |');
    lines.push('|-------|----------|');
    for (const [key, ms] of Object.entries(breakdown)) {
      lines.push(`| ${key} | ${formatDuration(ms)} |`);
    }
    lines.push('');
  }

  // Failure histogram across attempts
  const histogram = buildFailureHistogram(attempts);
  const totalFailures = Object.values(histogram).reduce((a, b) => a + b, 0);
  if (totalFailures > 0) {
    lines.push('## Failure classification');
    lines.push('');
    lines.push('| Category | Count |');
    lines.push('|----------|-------|');
    for (const [cat, n] of Object.entries(histogram)) {
      if (n > 0) lines.push(`| ${cat} | ${n} |`);
    }
    lines.push('');
  }

  // Attempts
  if (attempts.length > 0) {
    lines.push('## Attempts');
    lines.push('');
    for (const { n, record, stdoutLog, diff } of attempts) {
      const atOutcome = record?.outcome || 'UNKNOWN';
      const atDur = record?.duration_ms ?? null;
      const counts = record?.counts || {};
      lines.push(`### Attempt ${n} — ${outcomeBadge(atOutcome)}`);
      lines.push('');
      lines.push(`- **Duration:** ${formatDuration(atDur)}`);
      if (counts.total != null) {
        lines.push(`- **Tests:** ${counts.passed ?? 0} passed, ${counts.failed ?? 0} failed, ${counts.skipped ?? 0} skipped (total ${counts.total})`);
      }
      if (record?.tier) lines.push(`- **Tier:** ${record.tier}`);
      if (record?.framework) lines.push(`- **Framework:** ${record.framework}`);
      if (stdoutLog) lines.push(`- **Log:** \`${stdoutLog}\``);
      if (diff) lines.push(`- **Diff:** \`${diff}\``);

      const failures = record?.failures || [];
      if (failures.length > 0) {
        lines.push('');
        lines.push('Failures:');
        lines.push('');
        lines.push('| Category | Suite | Test | File:Line | Message |');
        lines.push('|----------|-------|------|-----------|---------|');
        for (const f of failures) {
          const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '—';
          const msg = (f.message || '').slice(0, 120).replace(/\|/g, '\\|').replace(/\n/g, ' ');
          lines.push(`| ${f.category || 'unclassified'} | ${f.suite || '—'} | ${f.test || '—'} | ${loc} | ${msg} |`);
        }
      }
      lines.push('');
    }
  }

  // Post-green review detail
  if (reviewData) {
    lines.push('## Post-green review');
    lines.push('');
    lines.push(`**Verdict:** ${verdictBadge(reviewData.verdict)}`);
    if (reviewData.base_branch) lines.push(`**Base branch:** \`${reviewData.base_branch}\``);
    if (reviewData.analyzed_files != null) lines.push(`**Files analyzed:** ${reviewData.analyzed_files}`);
    lines.push('');
    if (Array.isArray(reviewData.concerns) && reviewData.concerns.length > 0) {
      lines.push('Concerns:');
      lines.push('');
      for (const c of reviewData.concerns) {
        const heading = `- **${c.type}**` + (c.file ? ` in \`${c.file}\`` : '');
        lines.push(heading);
        if (c.type === 'test_removed' && c.net_removed != null) {
          lines.push(`  - Net tests removed: ${c.net_removed}`);
        }
        if (c.type === 'test_skipped' && c.net_added != null) {
          lines.push(`  - Net skips added: ${c.net_added}`);
        }
        if (c.type === 'coverage_drop') {
          lines.push(`  - baseline: ${c.baseline_lines_pct}%, current: ${c.current_lines_pct}%, delta: ${c.delta_pct}% (threshold ${c.threshold_pct}%)`);
        }
        if (Array.isArray(c.evidence) && c.evidence.length > 0) {
          lines.push('  - Evidence:');
          for (const ev of c.evidence.slice(0, 3)) {
            lines.push(`    - \`${ev}\``);
          }
        }
      }
      lines.push('');
    }
    if (Array.isArray(reviewData.notes) && reviewData.notes.length > 0) {
      lines.push('Notes:');
      lines.push('');
      for (const note of reviewData.notes) lines.push(`- ${note}`);
      lines.push('');
    }
  } else {
    lines.push('## Post-green review');
    lines.push('');
    lines.push('_Not run — `/relay-test-review` was not invoked for this run. If the pipeline reached a GREEN state, run `/relay-test-review <worktree>` to validate the result._');
    lines.push('');
  }

  // Secrets redaction
  const secretsRedacted = runData?.secrets_redacted;
  if (secretsRedacted) {
    lines.push('## Secrets redaction');
    lines.push('');
    lines.push(`- Count: ${secretsRedacted.count ?? 0}`);
    if (secretsRedacted.categories) {
      const cats = Object.entries(secretsRedacted.categories)
        .map(([k, v]) => `${k}: ${v}`).join(', ');
      lines.push(`- Categories: ${cats}`);
    }
    lines.push('');
  }

  // Skipped components
  const skipped = runData?.skipped || null;
  if (Array.isArray(skipped) && skipped.length > 0) {
    lines.push('## Skipped components');
    lines.push('');
    for (const s of skipped) {
      lines.push(`- ${s.component || '?'}: ${s.reason || '(no reason given)'}`);
    }
    lines.push('');
  }

  // TDD track (present when tdd_mode was true)
  if (tdd) {
    lines.push('## TDD track');
    lines.push('');
    lines.push(`- Active: true`);
    if (runData?.tdd_initial_suite_diff) lines.push(`- Initial suite diff: \`${runData.tdd_initial_suite_diff}\``);
    if (runData?.tdd_reviews) lines.push(`- B8 reviews: \`${runData.tdd_reviews}\``);
    if (!runData?.tdd_initial_suite_diff && !runData?.tdd_reviews) {
      lines.push('- (no TDD artifacts recorded in run.json — may have been a degraded run)');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`_Generated ${new Date().toISOString()} from artifacts in \`${reportsDir}\`._`);
  lines.push('');

  return lines.join('\n');
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  if (positional.length < 1) {
    printHelp();
    die(2, 'error: <reports-dir> is required');
  }

  const reportsDir = resolve(positional[0]);
  if (!existsSync(reportsDir)) {
    die(2, `error: reports directory not found: ${reportsDir}`);
  }

  const runData = readJsonIfExists(join(reportsDir, 'run.json'));
  if (!runData) {
    die(2, `error: run.json missing or malformed in ${reportsDir}. /relay-test writes this file; run it first.`);
  }

  const reviewData = readJsonIfExists(join(reportsDir, 'test-review.json'));
  const attempts = loadAttemptRecords(reportsDir);

  const md = buildMarkdown(reportsDir, runData, reviewData, attempts);
  const outPath = flags.out ? resolve(flags.out) : join(reportsDir, 'final-report.md');
  writeFileSync(outPath, md, 'utf-8');
  process.stdout.write(`wrote ${outPath}\n`);
}

main();
