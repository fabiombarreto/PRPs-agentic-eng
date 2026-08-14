// @ts-check
/**
 * Tests for the scan-root advisory lock.
 *
 * The lock guards the shared `plugins/relay/` and `docs/` trees that
 * concurrently-run test files both read and transiently write. It was
 * producing routine false failures: a suite run immediately after a checkout
 * showed 7 tests failing at once, each having waited exactly 10,013ms — the
 * old timeout, not an assertion. Measured cause: the slowest critical section
 * spawns the whole validate entry point at ~6.6s, and 18 locked sections
 * across 10 files contend for one mutex, so a timeout only ~1.5x the slowest
 * single holder cannot survive a realistic queue.
 *
 * These tests cover the two properties that were missing rather than mutual
 * exclusion itself (which `mkdirSync` provides): a killed holder must not
 * poison every later run, and a holder must be identifiable so a genuine
 * timeout names the contended section.
 *
 * **Every test here uses its own temp lock path.** An earlier version of this
 * file manipulated the real `.scan-root.lock`, which made it an aggressor
 * against the very suite it was meant to stabilize: clearing a lock that
 * another concurrently-running file legitimately held would break mutual
 * exclusion for everyone. Injecting the path is what keeps a test of the mutex
 * from being a race against it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { withScanRootLock } from './scan-root-lock.mjs';

/** A lock path private to one test — never the shared `.scan-root.lock`. */
function tempLockPath(name) {
  return join(mkdtempSync(join(tmpdir(), `scan-root-lock-${name}-`)), 'lock');
}

/** Plant a lock directory owned by a fictitious holder of the given age. */
function plantLock(lockPath, ageMs, label = 'planted') {
  mkdirSync(lockPath, { recursive: true });
  writeFileSync(
    join(lockPath, 'holder.json'),
    JSON.stringify({ pid: 999999, startedAt: Date.now() - ageMs, label })
  );
}

test('the lock is acquired, records its holder, and is released', async () => {
  const lockPath = tempLockPath('acquire');
  let sawHolder = null;

  const result = await withScanRootLock(() => {
    assert.ok(existsSync(lockPath), 'the lock directory must exist while the section runs');
    sawHolder = JSON.parse(readFileSync(join(lockPath, 'holder.json'), 'utf8'));
    return 'done';
  }, 'acquisition probe', lockPath);

  assert.equal(result, 'done');
  assert.equal(sawHolder.pid, process.pid, 'the holder file must identify the owning process');
  assert.equal(sawHolder.label, 'acquisition probe', 'the label must be recorded for diagnostics');
  assert.ok(!existsSync(lockPath), 'the lock must be released when the section returns');
});

test('the lock is released even when the section throws', async () => {
  const lockPath = tempLockPath('throw');

  await assert.rejects(
    () => withScanRootLock(() => { throw new Error('section failed'); }, 'throwing probe', lockPath),
    /section failed/
  );
  assert.ok(
    !existsSync(lockPath),
    'a throwing section must not leak the lock — otherwise one failure poisons every later run'
  );
});

test('a stale lock is reclaimed rather than waited out', async () => {
  const lockPath = tempLockPath('stale');
  // Older than the 300s staleness threshold: the signature of a killed process.
  plantLock(lockPath, 400_000, 'a killed run');

  const started = Date.now();
  const result = await withScanRootLock(() => 'acquired', 'reclaim probe', lockPath);
  const elapsed = Date.now() - started;

  assert.equal(result, 'acquired');
  assert.ok(
    elapsed < 5_000,
    `reclaiming a stale lock must be immediate, not a timeout wait; took ${elapsed}ms`
  );
  assert.ok(!existsSync(lockPath), 'the reclaimed lock must still be released normally');
});

test('a fresh lock held by someone else is NOT reclaimed', async () => {
  const lockPath = tempLockPath('fresh');
  // Well inside the staleness threshold: a legitimate slow holder.
  plantLock(lockPath, 1_000, 'a legitimately slow holder');

  let acquired = false;
  const attempt = withScanRootLock(() => { acquired = true; return 'x'; }, 'impatient probe', lockPath);

  // Give the waiter room to poll several times, then confirm it is still waiting.
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(acquired, false, 'a fresh holder must be waited for, never stolen from');

  rmSync(lockPath, { recursive: true, force: true });
  assert.equal(await attempt, 'x', 'the waiter must acquire once the holder releases');
});

test('a lock with no readable holder file still works — diagnostics never gate correctness', async () => {
  const lockPath = tempLockPath('headless');
  mkdirSync(lockPath, { recursive: true }); // no holder.json at all

  let acquired = false;
  const attempt = withScanRootLock(() => { acquired = true; return 'ok'; }, 'headless probe', lockPath);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(acquired, false, 'an unknown holder is still a holder — it must be waited for');

  rmSync(lockPath, { recursive: true, force: true });
  assert.equal(await attempt, 'ok');
});

test('the default lock path is the shared one, so production call sites need no argument', async () => {
  // Asserted by source rather than by acquiring the real lock, which would
  // make this test the aggressor the file header warns about.
  const src = readFileSync('scripts/validate/checks/scan-root-lock.mjs', 'utf8').replace(/\r\n/g, '\n');
  assert.match(
    src,
    /lockPath = LOCK_PATH/,
    'the injected path must default to the shared lock so existing call sites are unchanged'
  );
  assert.match(src, /const LOCK_PATH = resolve\('\.scan-root\.lock'\)/);
});
