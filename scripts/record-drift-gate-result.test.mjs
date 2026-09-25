// @ts-check
/**
 * Tests for scripts/record-drift-gate-result.mjs — the CLI that records a
 * measured drift-gate recall run.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented script.
 * The module runs `main()` unconditionally on import (no `import.meta.main`
 * guard), so it is exercised as a real subprocess via spawnSync — mirroring
 * scripts/validate/checks/usage-metrics-cli.test.mjs's own spawn pattern —
 * rather than imported directly.
 *
 * PRPs/prds/hybrid-code-review.prd.md AC-12's core scenario: "a deliberately
 * degraded expectation set trips the gate and disables the pass with a
 * logged reason." Every test below writes to a throwaway `--status-path`
 * inside a temp directory, never to the shipped
 * plugins/relay/resources/drift-gate-status.json, so a failing assertion
 * cannot leave a stray diff in the working tree.
 *
 * Run: node --test scripts/record-drift-gate-result.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const SCRIPT = resolve('scripts/record-drift-gate-result.mjs');

/**
 * Run the real CLI against a fresh temp status-path, from the repo root
 * (so the expectations ledger at its default relative path is readable).
 * @param {string[]} args
 */
function run(args) {
  const dir = mkdtempSync(join(tmpdir(), 'drift-gate-cli-'));
  const statusPath = join(dir, 'status.json');
  const r = spawnSync(process.execPath, [SCRIPT, ...args, '--status-path', statusPath], {
    cwd: resolve('.'),
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, statusPath };
}

test('rejects a missing --recall with a non-zero exit and writes no status file', () => {
  const r = run(['--threshold', '8']);

  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--recall is required/);
  assert.equal(existsSync(r.statusPath), false);
});

test('rejects a non-numeric --recall with a non-zero exit and writes no status file', () => {
  const r = run(['--recall', 'notanumber', '--threshold', '8']);

  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--recall is required and must be a non-negative integer/);
  assert.equal(existsSync(r.statusPath), false);
});

test('rejects a non-numeric --threshold with a non-zero exit and writes no status file', () => {
  const r = run(['--recall', '9', '--threshold', 'notanumber']);

  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--threshold must be a non-negative integer/);
  assert.equal(existsSync(r.statusPath), false);
});

test('AC-12 core scenario: recall below threshold writes disabled:true with a non-empty logged reason', () => {
  const r = run(['--recall', '5', '--threshold', '8']);

  assert.equal(r.status, 0, r.stderr);
  const written = JSON.parse(readFileSync(r.statusPath, 'utf8'));
  assert.equal(written.disabled, true);
  assert.equal(typeof written.reason, 'string');
  assert.ok(written.reason.length > 0, 'a disabled result must carry a non-empty reason');
  assert.equal(written.recall, 5);
  assert.equal(written.threshold, 8);
});

test('an explicit --reason overrides the default reason text when disabled', () => {
  const r = run(['--recall', '3', '--threshold', '8', '--reason', 'manual re-baseline pending']);

  assert.equal(r.status, 0, r.stderr);
  const written = JSON.parse(readFileSync(r.statusPath, 'utf8'));
  assert.equal(written.disabled, true);
  assert.equal(written.reason, 'manual re-baseline pending');
});

test('AC-A4 re-baselining: recall at or above threshold writes disabled:false with a null reason', () => {
  const r = run(['--recall', '9', '--threshold', '8']);

  assert.equal(r.status, 0, r.stderr);
  const written = JSON.parse(readFileSync(r.statusPath, 'utf8'));
  assert.equal(written.disabled, false);
  assert.equal(written.reason, null);
  assert.equal(written.recall, 9);
});

test('recall exactly equal to threshold is NOT disabled (disabled = recall < threshold, not <=)', () => {
  const r = run(['--recall', '8', '--threshold', '8']);

  assert.equal(r.status, 0, r.stderr);
  const written = JSON.parse(readFileSync(r.statusPath, 'utf8'));
  assert.equal(written.disabled, false);
  assert.equal(written.reason, null);
});

test('sample_count is derived from the real expectations ledger (10 pinned defects), never hardcoded blindly', () => {
  const r = run(['--recall', '9', '--threshold', '8']);

  assert.equal(r.status, 0, r.stderr);
  const written = JSON.parse(readFileSync(r.statusPath, 'utf8'));
  assert.equal(written.sample_count, 10);
});

test('writes a well-formed, parseable measured_at ISO timestamp on every run', () => {
  const r = run(['--recall', '9', '--threshold', '8']);

  assert.equal(r.status, 0, r.stderr);
  const written = JSON.parse(readFileSync(r.statusPath, 'utf8'));
  assert.ok(!Number.isNaN(Date.parse(written.measured_at)), 'measured_at must be a parseable timestamp');
});
