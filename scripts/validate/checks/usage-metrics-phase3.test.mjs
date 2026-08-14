// @ts-check
/**
 * Tests for Phase 3 ("Layout scaffolding + reader") of the usage-metrics
 * feature — the two scaffolded git control files and the `query` subcommand.
 *
 * The `-diff` assertion is the load-bearing one: it is the anti-Goodhart guard
 * for the channel a prompt-scanning grep cannot see, since /relay-implement
 * writes a full `git diff` into diff.patch and hands it to three agents.
 * Asserting the file exists is not enough — an attribute that is present but
 * not matching protects nothing — so the effect is verified against real git.
 *
 * Authored test-after per `docs/context/methodology.md`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import { doQuery, readShard } from '../../../plugins/relay/scripts/usage-metrics.mjs';

const ATTRIBUTES_PATH = 'PRPs/metrics/.gitattributes';
const IGNORE_PATH = 'PRPs/metrics/.gitignore';

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-6) — shard content never reaches a working-tree diff.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-6): .gitattributes marks the shards -diff and eol=lf', () => {
  assert.ok(existsSync(resolve(ATTRIBUTES_PATH)), `expected ${ATTRIBUTES_PATH} to exist`);
  const content = readFileSync(resolve(ATTRIBUTES_PATH), 'utf8');

  assert.match(content, /^\*\.tsv -diff$/m, 'expected the -diff rule');
  assert.match(content, /^\*\.tsv text eol=lf$/m, 'expected the eol=lf rule');
  assert.match(
    content,
    /relay-implement/,
    'expected the file to name the commands it protects — a future contributor removing it must be able to see what breaks'
  );
});

test('AC-A1 (PRD AC-6): git actually suppresses shard content in a diff (the attribute is in force, not merely present)', () => {
  // A throwaway repo proves the rule itself rather than this checkout's state.
  const dir = mkdtempSync(join(tmpdir(), 'usage-metrics-diff-'));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');

  mkdirSync(join(dir, 'PRPs', 'metrics'), { recursive: true });
  writeFileSync(join(dir, 'PRPs', 'metrics', '.gitattributes'), '*.tsv -diff\n*.tsv text eol=lf\n');
  writeFileSync(join(dir, 'PRPs', 'metrics', 'verdict-v1-2026-08.tsv'), 'proj\tverdict\nalpha\tAPPROVED\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'seed');

  writeFileSync(join(dir, 'PRPs', 'metrics', 'verdict-v1-2026-08.tsv'), 'proj\tverdict\nalpha\tCHANGES_REQUESTED\n');
  const diff = git('diff');

  assert.doesNotMatch(diff, /CHANGES_REQUESTED/, 'a shard value must never appear in diff output');
  assert.match(diff, /Binary files/, 'git must report the shard as binary instead of emitting rows');
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-2) — the defensive re-include survives a blanket *.tsv ignore.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-2): .gitignore carries the re-include and records why it works', () => {
  assert.ok(existsSync(resolve(IGNORE_PATH)), `expected ${IGNORE_PATH} to exist`);
  const content = readFileSync(resolve(IGNORE_PATH), 'utf8');

  assert.match(content, /^!\*\.tsv$/m, 'expected the re-include');
  assert.match(
    content,
    /excluded DIRECTORY/,
    'expected the rationale — the trap applies to directory exclusions only, and that reasoning must survive'
  );
});

test('AC-A2 (PRD AC-2): a root-level blanket *.tsv ignore does not prevent the shards being tracked', () => {
  const dir = mkdtempSync(join(tmpdir(), 'usage-metrics-ignore-'));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-q');

  // The hostile case: a data/ML repo that ignores every TSV at the root.
  writeFileSync(join(dir, '.gitignore'), '*.tsv\n');
  mkdirSync(join(dir, 'PRPs', 'metrics'), { recursive: true });
  writeFileSync(join(dir, 'PRPs', 'metrics', '.gitignore'), '!*.tsv\n');
  writeFileSync(join(dir, 'PRPs', 'metrics', 'verdict-v1-2026-08.tsv'), 'proj\nalpha\n');
  writeFileSync(join(dir, 'elsewhere.tsv'), 'ignored\n');

  const status = git('status', '--porcelain', '--untracked-files=all');
  assert.match(status, /PRPs\/metrics\/verdict-v1-2026-08\.tsv/, 'the shard must be visible to git despite the blanket rule');
  assert.doesNotMatch(status, /elsewhere\.tsv/, 'the blanket rule must still apply outside the metrics directory');
});

// ---------------------------------------------------------------------------
// AC-A3 / AC-A4 — the reader.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4): query attributes rows per project and reports the degraded exclusion as a named warning', () => {
  const dir = mkdtempSync(join(tmpdir(), 'usage-metrics-query-'));
  writeFileSync(join(dir, 'verdict-v1-2026-08.tsv'), [
    'proj\tts\tdeg\tstage\tart\tseq\tverdict',
    'alpha\t2026-08-01T00:00:01Z\t0\tplan-review\ta\t1\tCHANGES_REQUESTED',
    'alpha\t2026-08-01T00:00:02Z\t0\tplan-review\ta\t2\tAPPROVED',
    'beta\t2026-08-01T00:00:03Z\t0\tplan-review\tb\t1\tAPPROVED',
    'beta\t2026-08-01T00:00:04Z\t1\tplan-review\tc\t1\tCHANGES_REQUESTED',
  ].join('\n') + '\n');
  writeFileSync(join(dir, 'rubric-v1-2026-08.tsv'), [
    'proj\tts\tdeg\tstage\tart\tseq\trid\tpass\tcls',
    'alpha\t2026-08-01T00:00:01Z\t0\tplan-review\ta\t1\tR1\t0\tblocking',
  ].join('\n') + '\n');

  const out = doQuery(dir);

  assert.match(out, /projects: alpha, beta/, 'both projects must be attributable from the concatenated corpus');
  assert.match(out, /WARNING - 1 verdict row\(s\)/, 'the degraded row must be surfaced, not folded into the totals');
  assert.match(out, /\[alpha\]/);
  assert.match(out, /\[beta\]/);
  assert.match(out, /first-attempt-fail-rate=1\.00/, 'alpha has one first attempt and it failed');
  assert.match(out, /R1\(1\)/, 'the top-failing rubric id is reported per stage');
});

test('AC-A3 (PRD AC-4): an unmaterialized project is a normal state, not an error', () => {
  const out = doQuery(join(mkdtempSync(join(tmpdir(), 'usage-metrics-empty-')), 'nope'));
  assert.match(out, /No materialized shards/);
});

test('AC-A4 (PRD AC-1): readShard round-trips a rendered shard without losing or inventing cells', () => {
  const dir = mkdtempSync(join(tmpdir(), 'usage-metrics-round-'));
  const path = join(dir, 'verdict-v1-2026-08.tsv');
  writeFileSync(path, 'proj\tts\tverdict\nalpha\t2026-08-01T00:00:01Z\tAPPROVED\n');

  const rows = readShard(path);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { proj: 'alpha', ts: '2026-08-01T00:00:01Z', verdict: 'APPROVED' });
});

test('AC-A4 (PRD AC-1): a shard with only a header yields no rows rather than a phantom one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'usage-metrics-header-'));
  const path = join(dir, 'verdict-v1-2026-08.tsv');
  writeFileSync(path, 'proj\tts\tverdict\n');
  assert.deepEqual(readShard(path), []);
});
