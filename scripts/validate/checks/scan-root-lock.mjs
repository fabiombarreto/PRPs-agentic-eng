// @ts-check
/**
 * Cross-process advisory lock for tests that touch the real, shared
 * `plugins/relay/` and `docs/` trees walked by
 * scripts/validate/checks/path-existence.mjs's `runPathExistenceCheck()`.
 *
 * `node --test scripts/validate/checks/*.test.mjs ...` (docs/development.md)
 * runs test FILES concurrently by default — only `test()` calls within a
 * single file are serialized. A test in one file that writes a transient
 * fixture into a SCAN_ROOT (e.g. path-existence.test.mjs's AC-5 fixture) can
 * therefore race a test in a different file that expects the real tree to be
 * clean (e.g. figma-track-phase2.test.mjs's AC-1/AC-A1 zero-findings
 * assertion) — a genuine filesystem race, not an application defect.
 *
 * `mkdirSync` is atomic on both POSIX and Windows (fails with `EEXIST` when
 * the directory already exists), so a lock directory is a valid cross-process
 * mutex without requiring the whole suite to run at `--test-concurrency=1`.
 * Any test whose real-wrapper assertions depend on the current state of a
 * SCAN_ROOT should wrap its critical section with `withScanRootLock`.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCK_PATH = resolve('.scan-root.lock');
const POLL_MS = 25;
const TIMEOUT_MS = 10_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs `fn` while holding an exclusive lock keyed on the shared SCAN_ROOT
 * trees. Blocks (with polling) until any other holder releases it.
 *
 * @template T
 * @param {() => T | Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withScanRootLock(fn) {
  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(LOCK_PATH);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      if (Date.now() > deadline) {
        throw new Error(`withScanRootLock: timed out waiting for ${LOCK_PATH} after ${TIMEOUT_MS}ms`);
      }
      await sleep(POLL_MS);
    }
  }

  try {
    return await fn();
  } finally {
    rmSync(LOCK_PATH, { recursive: true, force: true });
  }
}
