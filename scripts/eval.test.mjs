// @ts-check
/**
 * Unit test for scripts/eval.mjs's no-key graceful-degradation path.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed scripts/eval.mjs (Phase 5 of validation-suite). Per the
 * phase-5 plan's own Level-2 note, this is the ONE genuinely-behavioral unit
 * deferred to the test-writer/test-reviewer pair; the config's structural
 * soundness and the wrapper's wiring/no-key output are otherwise validated
 * by the plan's shell-level Level 1-3 commands, not by a node:test unit.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-12 eval classifies fixtures
 *     (CRITICAL clause: "given no API key, npm run eval exits with a clear
 *     message rather than crashing")
 *   PRPs/plans/completed/validation-suite-phase-5-eval-layer.plan.md AC-A2
 *     (no-key graceful degradation)
 *
 * scripts/eval.mjs has no pure/wrapper split for its no-key guard — `main()`
 * reads `process.env.ANTHROPIC_API_KEY` directly and calls `process.exit(0)`
 * itself, with no exported function and no dependency-injection seam.
 * Modifying it to add one is forbidden (B7 authors tests only). The
 * hermetic, mock-free way to observe this contract from outside is a real
 * child-process spawn of `node scripts/eval.mjs`, with `ANTHROPIC_API_KEY`
 * removed from the child's environment — this exercises the REAL
 * production code path end-to-end (genuine process, genuine exit code,
 * genuine stdout) with zero network access and zero live API calls, because
 * the no-key branch returns before any promptfoo/network code is ever
 * reached. This is not a mock of the SUT — it is a real subprocess
 * boundary, the same class of technique
 * scripts/validate/checks/native-validate.test.mjs uses for its "claude CLI
 * unavailable" scenario.
 *
 * The with-key path (spawns `promptfoo eval` against the real Anthropic
 * API) is deliberately NOT exercised here: setting a dummy
 * `ANTHROPIC_API_KEY` and letting the wrapper run to completion would either
 * (a) make a real network call to the Anthropic API if `promptfoo` happens
 * to be installed locally (auth would fail with a dummy key, but the
 * network round-trip itself still happens — not hermetic, not
 * network-free), or (b) attempt an `npx` resolution that itself may hit the
 * npm registry over the network if the local binary is absent. Faking
 * either branch deterministically would require mocking `node:child_process`
 * inside a separately-spawned child process (unreachable from this test
 * process) or adding a seam to production code (forbidden — B7 authors
 * tests only). Per the dispatching brief's explicit "if not cleanly
 * hermetic, SKIP" instruction, this scenario is recorded as SKIPPED in the
 * suite manifest (PRPs/reports/validation-suite/test-suite-phase-5.diff)
 * rather than faked.
 *
 * Run: node --test scripts/eval.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..'); // scripts/ -> repo root
const EVAL_SCRIPT = join(__dirname, 'eval.mjs');

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-12 — no-key graceful degradation
// ---------------------------------------------------------------------------

test('eval.mjs: with ANTHROPIC_API_KEY unset, exits 0 and prints a clean-skip guidance message naming ANTHROPIC_API_KEY on stdout — never a crash', () => {
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY;

  const result = spawnSync(process.execPath, [EVAL_SCRIPT], {
    cwd: REPO_ROOT,
    env: childEnv,
    encoding: 'utf-8',
    shell: false,
  });

  assert.equal(result.error, undefined, `child process failed to spawn: ${result.error}`);
  assert.equal(result.signal, null, `child process was killed by a signal: ${result.signal}`);
  assert.equal(result.status, 0, `expected a clean exit 0, got ${result.status}. stderr: ${result.stderr}`);
  assert.match(result.stdout, /ANTHROPIC_API_KEY/, 'guidance message must name the ANTHROPIC_API_KEY variable');
  assert.match(result.stdout, /skip/i, 'message must communicate this is a deliberate, clean skip — not an error');
});

test('eval.mjs: with ANTHROPIC_API_KEY set to an empty string, still takes the no-key path (exit 0 + guidance) — the falsy-value boundary, not just "unset"', () => {
  const childEnv = { ...process.env, ANTHROPIC_API_KEY: '' };

  const result = spawnSync(process.execPath, [EVAL_SCRIPT], {
    cwd: REPO_ROOT,
    env: childEnv,
    encoding: 'utf-8',
    shell: false,
  });

  assert.equal(result.error, undefined, `child process failed to spawn: ${result.error}`);
  assert.equal(result.status, 0, `expected a clean exit 0, got ${result.status}. stderr: ${result.stderr}`);
  assert.match(result.stdout, /ANTHROPIC_API_KEY/, 'guidance message must name the ANTHROPIC_API_KEY variable');
});
