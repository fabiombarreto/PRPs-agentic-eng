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
 *
 * ## Why the timeout is what it is
 *
 * The original 10s timeout was barely larger than a single legitimate holder
 * and produced routine, misleading failures: a run immediately after a
 * checkout showed 7 tests failing at once, each having waited exactly
 * 10,013ms — the timeout, not a real assertion failure. Measured on this
 * repository: the slowest critical section spawns the whole validate entry
 * point at ~6.6s (its `native-validate` check alone shells out to
 * `claude plugin validate` for ~2.7s). There are 18 locked sections across 10
 * files, run concurrently, so a waiter legitimately queues behind several
 * holders. A timeout only ~1.5x the slowest single holder guarantees
 * spurious failures under any real contention.
 *
 * The timeout is therefore sized against the measured worst case with room
 * for a realistic queue, and kept finite so a genuine deadlock still fails
 * loudly rather than hanging a CI job forever.
 *
 * ## Stale locks
 *
 * A process killed between `mkdirSync` and its `finally` leaves the lock
 * directory behind, and every subsequent locked test then burns the full
 * timeout before failing — turning one interrupted run into a suite that
 * appears broken until someone deletes a directory by hand. The holder writes
 * its identity into the lock; a waiter that finds a holder older than
 * `STALE_MS` (far beyond any legitimate section) reclaims it and says so on
 * stderr rather than failing silently or waiting for a process that is gone.
 */
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const LOCK_PATH = resolve('.scan-root.lock');
const POLL_MS = 25;

/**
 * Measured worst case on this repo is a ~6.6s holder; 18 locked sections run
 * concurrently. 90s allows a waiter to queue behind roughly a dozen
 * worst-case holders while still failing rather than hanging.
 */
const TIMEOUT_MS = 90_000;

/**
 * A holder older than this cannot be legitimate — the slowest measured
 * section is ~6.6s — so it is the signature of a killed process rather than a
 * slow one.
 */
const STALE_MS = 300_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @returns {{pid: number, startedAt: number, label: string} | null} */
function readHolderAt(holderPath) {
  try {
    return JSON.parse(readFileSync(holderPath, 'utf8'));
  } catch {
    // No holder file, unreadable, or a torn write: treat as unknown rather
    // than crashing a waiter that is only trying to report who holds the lock.
    return null;
  }
}

/** @param {string} label */
function writeHolderAt(holderPath, label) {
  try {
    writeFileSync(holderPath, JSON.stringify({ pid: process.pid, startedAt: Date.now(), label }), 'utf8');
  } catch {
    // The lock itself is the mutex; the holder file is diagnostics only, so a
    // failure to write it must never break an otherwise valid acquisition.
  }
}

/** @param {{pid: number, startedAt: number, label: string} | null} holder @returns {string} */
function describeHolder(holder) {
  if (!holder) return 'holder unknown (no readable holder.json)';
  const ageMs = Date.now() - holder.startedAt;
  return `held by pid ${holder.pid} (${holder.label}) for ${Math.round(ageMs / 1000)}s`;
}

/**
 * Runs `fn` while holding an exclusive lock keyed on the shared SCAN_ROOT
 * trees. Blocks (with polling) until any other holder releases it.
 *
 * @template T
 * @param {() => T | Promise<T>} fn
 * @param {string} [label] short description of the critical section, surfaced
 *   in a timeout message so a failure names the contended section rather than
 *   only the waiter.
 * @returns {Promise<T>}
 */
export async function withScanRootLock(fn, label = 'unlabelled', lockPath = LOCK_PATH) {
  const holderPath = join(lockPath, 'holder.json');
  const readHolder = () => readHolderAt(holderPath);
  const writeHolder = (l) => writeHolderAt(holderPath, l);

  const deadline = Date.now() + TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(lockPath);
      writeHolder(label);
      break;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      const holder = readHolder();
      if (holder && Date.now() - holder.startedAt > STALE_MS) {
        process.stderr.write(
          `withScanRootLock: reclaiming a stale lock — ${describeHolder(holder)}, `
          + `past the ${STALE_MS / 1000}s staleness threshold. The holding process was almost `
          + 'certainly killed mid-section.\n'
        );
        rmSync(lockPath, { recursive: true, force: true });
        continue;
      }

      if (Date.now() > deadline) {
        throw new Error(
          `withScanRootLock: timed out after ${TIMEOUT_MS / 1000}s waiting to run "${label}" — `
          + `${describeHolder(holder)}. This is lock contention, not an assertion failure: `
          + 'test files run concurrently and every locked section serializes on the shared '
          + 'plugins/relay and docs trees.'
        );
      }
      await sleep(POLL_MS);
    }
  }

  try {
    return await fn();
  } finally {
    rmSync(lockPath, { recursive: true, force: true });
  }
}
