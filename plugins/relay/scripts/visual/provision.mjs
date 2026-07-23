#!/usr/bin/env node
// plugins/relay/scripts/visual/provision.mjs
//
// Provisioning script for the relay visual-verification tooling package
// (Figma Implementation Track, Phase 6 — Visual loop). Exports
// `provision()` — ensures Chromium is installed for Playwright, exiting
// with a named code so callers (the `visual-verifier` agent) can branch
// into the degradation ladder — and `waitForDevServer()`, a readiness-
// probe helper `capture.mjs` uses before navigating to any in-scope route.
//
// Exit code taxonomy (only meaningful when this file is run directly via
// `node provision.mjs`):
//   0 — Chromium already installed, or the install attempt succeeded.
//   2 — PROVISION_FAILED_NETWORK (network-blocked / restricted environment).
//   3 — PROVISION_FAILED_OTHER (any other provisioning failure).

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

// `exec` (not `execFile`) is deliberate: it always spawns through a shell,
// which is what lets `npx` resolve to the `npx.cmd` shim on Windows —
// `execFile` cannot invoke `.cmd`/`.bat` shims without `shell: true`,
// and passing `shell: true` to `execFile` alongside an args array trips
// Node's DEP0190 deprecation warning (args are concatenated, not escaped,
// when a shell is involved). `exec` takes a single command string instead
// of an args array, sidestepping that warning entirely. Both commands
// below are fixed literal strings with no interpolated/user-controlled
// segments, so there is no shell-injection surface.
const execAsync = promisify(exec);

// Bounded timeout for the provisioning attempt — never allowed to hang the
// visual-verification sub-phase indefinitely.
const PROVISION_TIMEOUT_MS = 120_000;

const NETWORK_ERROR_PATTERNS = [
  /ENOTFOUND/i,
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /EAI_AGAIN/i,
  /getaddrinfo/i,
  /network/i,
  /could not resolve/i,
  /\b403\b/,
];

/**
 * Checks whether Chromium is already installed for Playwright via a
 * dry-run install (reports nothing left to download when already
 * present). Never throws — callers branch on the returned boolean.
 */
async function isChromiumInstalled() {
  try {
    const { stdout } = await execAsync(
      'npx playwright install --dry-run chromium',
      { timeout: PROVISION_TIMEOUT_MS }
    );
    return !/download/i.test(stdout);
  } catch {
    return false;
  }
}

/**
 * Ensures Chromium is installed for Playwright. Returns
 * `{ ok, code, reason?, message? }` and, when run as a CLI, exits with
 * the matching named code so `visual-verifier` can branch into the
 * degradation ladder: 0 = proceed FULL, 2 = PROVISION_FAILED_NETWORK
 * (degrade to DEGRADED_PROVISION_FAILED), 3 = PROVISION_FAILED_OTHER
 * (also degrades to DEGRADED_PROVISION_FAILED — the ladder does not
 * distinguish the two failure reasons downstream, only the exit code
 * taxonomy does, for operator-facing diagnostics).
 */
export async function provision() {
  if (await isChromiumInstalled()) {
    return { ok: true, code: 0 };
  }

  try {
    await execAsync(
      'npx playwright install --with-deps chromium',
      { timeout: PROVISION_TIMEOUT_MS }
    );
    return { ok: true, code: 0 };
  } catch (err) {
    const message = String((err && (err.stderr || err.message)) || err);
    const isNetworkFailure = NETWORK_ERROR_PATTERNS.some((pattern) =>
      pattern.test(message)
    );
    if (isNetworkFailure) {
      console.error('PROVISION_FAILED_NETWORK');
      return { ok: false, code: 2, reason: 'PROVISION_FAILED_NETWORK', message };
    }
    console.error('PROVISION_FAILED_OTHER');
    return { ok: false, code: 3, reason: 'PROVISION_FAILED_OTHER', message };
  }
}

/**
 * Polls an HTTP GET against `url` with exponential backoff until it
 * responds (any status code counts as "up" — this is a readiness probe,
 * not a health check) or `timeoutMs` elapses. Used by `capture.mjs`
 * before navigating the headless browser to any in-scope route; a
 * timeout here is the trigger for the DEGRADED_STATIC_ONLY rung.
 */
export async function waitForDevServer(url, { timeoutMs = 30_000 } = {}) {
  const start = Date.now();
  let delayMs = 250;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res) {
        return { ready: true, elapsedMs: Date.now() - start };
      }
    } catch {
      // Not up yet — fall through to backoff and retry.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 2, 4_000);
  }
  return { ready: false, elapsedMs: Date.now() - start, reason: 'DEV_SERVER_TIMEOUT' };
}

// Allow direct invocation: `node provision.mjs` exits with the named code.
// Cross-platform-correct entry-point guard: `pathToFileURL` normalizes
// path-separator (POSIX `/` vs Windows `\`) and URL-encoding differences
// so this comparison matches on both POSIX and Windows, unlike a naive
// `file://${process.argv[1]}` template-string comparison.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await provision();
  process.exit(result.code);
}
