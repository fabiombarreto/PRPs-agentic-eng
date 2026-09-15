// @ts-check
/**
 * Tests for the usage-metrics CLI argument contract.
 *
 * Regression: parseArgs defaulted to `materialize` and silently ignored any
 * token it did not recognize, so `--help` or a typo such as `--dryrun` or
 * `querry` rewrote the tracked shards under PRPs/metrics/ and appended a row
 * to the scan history. Every test here spawns the real script with a
 * throwaway directory as both cwd and default root, then asserts that
 * directory is still empty — the only observation that proves "nothing
 * written" rather than "nothing written where we happened to look".
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import { parseArgs, UsageError } from '../../../plugins/relay/scripts/usage-metrics.mjs';

const SCRIPT = resolve('plugins/relay/scripts/usage-metrics.mjs');

/**
 * Run the script in a fresh empty directory. The `<out>` placeholder expands
 * to a not-yet-existing directory inside it.
 * @param {string[]} args
 */
function run(args) {
  const root = mkdtempSync(join(tmpdir(), 'usage-metrics-cli-'));
  const out = join(root, 'out');
  const r = spawnSync(process.execPath, [SCRIPT, ...args.map((a) => (a === '<out>' ? out : a))], {
    cwd: root,
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, root, out };
}

/** @param {{root: string}} r @param {string} label */
function assertNothingWritten(r, label) {
  assert.deepEqual(readdirSync(r.root), [], `${label}: expected no files written under the temp root`);
}

test('positive control: materialize does write into --out, so the no-write assertions below can fail', () => {
  const r = run(['materialize', '--out', '<out>']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(r.out), 'materialize should create the --out directory');
});

for (const flag of ['--help', '-h']) {
  test(`${flag} prints usage to stdout, exits 0, and writes nothing`, () => {
    const r = run([flag]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stderr, '');
    for (const token of ['materialize', '--dry-run', 'query', '--root <dir>', '--out <dir>', '--project <id>']) {
      assert.ok(r.stdout.includes(token), `usage should mention ${token}`);
    }
    assertNothingWritten(r, flag);
  });
}

test('--help wins over a valid subcommand and still writes nothing', () => {
  const r = run(['materialize', '--help', '--out', '<out>']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Usage:/);
  assertNothingWritten(r, 'materialize --help');
});

for (const args of [['--dryrun'], ['querry'], ['materialize', '--bogus'], ['materialize', 'extra']]) {
  test(`unknown argument ${JSON.stringify(args)} exits 2 with error + usage on stderr and writes nothing`, () => {
    const r = run([...args, '--out', '<out>']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^error: unknown argument: /);
    assert.match(r.stderr, /Usage:/);
    assert.equal(r.stdout, '');
    assertNothingWritten(r, args.join(' '));
  });
}

for (const args of [['materialize', '--root'], ['materialize', '--out'], ['materialize', '--project'], ['materialize', '--out', '--dry-run']]) {
  test(`flag missing its value ${JSON.stringify(args)} exits 2 and writes nothing`, () => {
    const r = run(args);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /^error: --(root|out|project) requires a value/);
    assert.match(r.stderr, /Usage:/);
    assert.equal(r.stdout, '');
    assertNothingWritten(r, args.join(' '));
  });
}

test('no arguments no longer materializes: exits 2 and writes nothing', () => {
  const r = run([]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^error: missing subcommand/);
  assertNothingWritten(r, 'no args');
});

for (const args of [['materialize', 'query'], ['query', '--dry-run']]) {
  test(`conflicting modes ${JSON.stringify(args)} exit 2 and write nothing`, () => {
    const r = run([...args, '--out', '<out>']);
    assert.equal(r.status, 2);
    assertNothingWritten(r, args.join(' '));
  });
}

test('parseArgs still accepts every documented invocation', () => {
  const root = resolve('some-root');
  assert.equal(parseArgs(['materialize']).mode, 'materialize');
  assert.equal(parseArgs(['--dry-run']).mode, 'dry-run');
  assert.equal(parseArgs(['materialize', '--dry-run']).mode, 'dry-run');
  assert.equal(parseArgs(['query']).mode, 'query');
  const a = parseArgs(['materialize', '--root', root, '--project', 'p1']);
  assert.equal(a.root, root);
  assert.equal(a.out, join(root, 'PRPs', 'metrics'));
  assert.equal(a.project, 'p1');
  assert.throws(() => parseArgs(['--dryrun']), UsageError);
});
