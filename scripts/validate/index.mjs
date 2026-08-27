#!/usr/bin/env node
// @ts-check
/**
 * relay repository validation harness runner.
 *
 * Imports the registered check modules (starting with check B —
 * version-parity), invokes each, aggregates findings, prints a
 * human-readable summary, and sets process.exitCode = 1 when any check
 * reports a violation. Runs ALL registered checks before deciding the exit
 * code — no short-circuit.
 *
 * Usage:
 *   node scripts/validate/index.mjs
 *   npm run validate
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { runVersionParityCheck } from './checks/version-parity.mjs';
import { runNativeValidateCheck } from './checks/native-validate.mjs';
import { runRegistrationParityCheck } from './checks/registration-parity.mjs';
import { runPathExistenceCheck } from './checks/path-existence.mjs';
import { runDispatchGraphCheck } from './checks/dispatch-graph.mjs';
import { runFrontmatterSchemaCheck } from './checks/frontmatter-schema.mjs';
import { runArtifactNamingCheck } from './checks/artifact-naming.mjs';
import { runBootstrapParityCheck } from './checks/bootstrap-parity.mjs';
import { runGatingStructureCheck } from './checks/gating-structure.mjs';
import { runFeedbackChainCheck } from './checks/feedback-chain.mjs';
import { runTimestampContractCheck } from './checks/timestamp-contract.mjs';
import { runPluginRootResolvableCheck } from './checks/plugin-root-resolvable.mjs';
import { runMetricsIsolationCheck } from './checks/metrics-isolation.mjs';
import { runDecisionsMirrorCheck } from './checks/decisions-mirror.mjs';
import { runAntiPatternsMirrorCheck } from './checks/anti-patterns-mirror.mjs';

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

// Registry of check modules. Each entry is a zero-arg function returning
// { name, ok, findings: [{ message, file, line }] }. Phase 2 of
// validation-suite appends checks A, C, D, E, F, G, P here.
const CHECKS = [
  runVersionParityCheck,
  runNativeValidateCheck,
  runRegistrationParityCheck,
  runPathExistenceCheck,
  runDispatchGraphCheck,
  runFrontmatterSchemaCheck,
  runArtifactNamingCheck,
  runBootstrapParityCheck,
  runGatingStructureCheck,
  runFeedbackChainCheck,
  runTimestampContractCheck,
  runPluginRootResolvableCheck,
  runMetricsIsolationCheck,
  runDecisionsMirrorCheck,
  runAntiPatternsMirrorCheck,
];

function runChecks(checks) {
  return checks.map((check) => {
    try {
      return check();
    } catch (err) {
      // A check MUST fail loud, never crash the whole runner.
      return {
        name: check.name || '(unnamed check)',
        ok: false,
        findings: [{ message: `check threw: ${err.message}`, file: null, line: null }],
      };
    }
  });
}

function printResults(results) {
  let anyFailed = false;
  for (const result of results) {
    const status = result.ok ? 'PASS' : 'FAIL';
    process.stdout.write(`[${status}] ${result.name}\n`);
    if (!result.ok) {
      anyFailed = true;
      for (const finding of result.findings || []) {
        const loc = finding.file
          ? `${finding.file}${finding.line != null ? `:${finding.line}` : ''}`
          : '(no location)';
        process.stdout.write(`  ${loc} — ${finding.message}\n`);
      }
    }
  }
  return anyFailed;
}

function main() {
  if (CHECKS.length === 0) {
    die(2, 'error: no checks registered in scripts/validate/index.mjs');
  }

  const results = runChecks(CHECKS);
  const anyFailed = printResults(results);

  const passCount = results.filter((r) => r.ok).length;
  const failCount = results.length - passCount;
  process.stdout.write(`\n${passCount} passed, ${failCount} failed (${results.length} checks run)\n`);

  if (anyFailed) {
    // Set exitCode (not process.exit) so pending stdout writes flush before
    // the process exits gracefully — every aggregated finding above is
    // printed first. See https://nodejs.org/api/process.html.
    process.exitCode = 1;
  }
}

main();
