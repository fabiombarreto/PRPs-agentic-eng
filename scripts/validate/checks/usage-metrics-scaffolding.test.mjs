// @ts-check
/**
 * Tests that `usage-metrics.mjs materialize` itself scaffolds the two git
 * control files the usage-metrics PRD's Phase 3 requires.
 *
 * Why this file exists: usage-metrics-phase3.test.mjs asserts against the
 * hand-committed PRPs/metrics/.gitattributes and .gitignore in THIS repo and
 * builds its throwaway git repos with hand-written attribute content. It never
 * runs the script, so it stayed green while the materializer wrote no
 * scaffolding at all — and every other project got bare shards with no `-diff`
 * guard. Every test here drives the real CLI against a fresh directory.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const SCRIPT = resolve('plugins/relay/scripts/usage-metrics.mjs');
const TEMPLATES = {
  '.gitattributes': 'plugins/relay/resources/usage-metrics.gitattributes',
  '.gitignore': 'plugins/relay/resources/usage-metrics.gitignore',
};

/** @param {string} relPath @returns {string} */
function readTemplate(relPath) {
  return readFileSync(resolve(relPath), 'utf8').split('\r\n').join('\n');
}

/** @param {string[]} args @returns {string} stdout */
function run(...args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

/** @param {string} prefix */
function tempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

test('materialize scaffolds both control files into a fresh --out, byte-equal to the LF-normalized templates', () => {
  const root = tempDir('usage-metrics-scaffold-root-');
  const out = join(tempDir('usage-metrics-scaffold-out-'), 'metrics');

  run('materialize', '--root', root, '--out', out);

  for (const [name, template] of Object.entries(TEMPLATES)) {
    const written = readFileSync(join(out, name), 'utf8');
    assert.equal(written, readTemplate(template), `${name} must carry the canonical content, comments included`);
    assert.doesNotMatch(written, /\r/, `${name} must use literal \\n line endings`);
  }
  assert.match(readFileSync(join(out, '.gitattributes'), 'utf8'), /^\*\.tsv -diff$/m);
  assert.match(readFileSync(join(out, '.gitignore'), 'utf8'), /^!\*\.tsv$/m);
  assert.deepEqual(readdirSync(out).filter((n) => n.endsWith('.tmp')), [], 'no atomic-write scratch may remain');
});

test('materialize never overwrites an existing control file, but still scaffolds the missing one', () => {
  const root = tempDir('usage-metrics-scaffold-root-');
  const out = tempDir('usage-metrics-scaffold-custom-');
  const custom = '# project-customized\n*.tsv -diff\n*.csv -diff\n';
  writeFileSync(join(out, '.gitattributes'), custom);

  run('materialize', '--root', root, '--out', out);
  run('materialize', '--root', root, '--out', out);

  assert.equal(readFileSync(join(out, '.gitattributes'), 'utf8'), custom, 'a customized file must survive re-runs untouched');
  assert.equal(readFileSync(join(out, '.gitignore'), 'utf8'), readTemplate(TEMPLATES['.gitignore']));
});

test('--dry-run writes no control file', () => {
  const root = tempDir('usage-metrics-scaffold-root-');
  const parent = tempDir('usage-metrics-scaffold-dry-');
  const out = join(parent, 'metrics');

  const stdout = run('--dry-run', '--root', root, '--out', out);

  assert.match(stdout, /nothing written/);
  assert.equal(existsSync(join(out, '.gitattributes')), false);
  assert.equal(existsSync(join(out, '.gitignore')), false);
});

test('in a throwaway git repo, git check-attr reports diff unset and eol lf for a materialized shard', () => {
  const repo = tempDir('usage-metrics-scaffold-git-');
  const git = (/** @type {string[]} */ ...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q');
  mkdirSync(join(repo, 'PRPs'), { recursive: true });

  // Default --out: <root>/PRPs/metrics, exactly as a target project runs it.
  run('materialize', '--root', repo);

  const shard = 'PRPs/metrics/scan-v1.tsv';
  assert.ok(existsSync(join(repo, shard)), 'an empty corpus still yields the scan shard');
  assert.equal(git('check-attr', 'diff', '--', shard).trim(), `${shard}: diff: unset`);
  assert.equal(git('check-attr', 'eol', '--', shard).trim(), `${shard}: eol: lf`);
});

test('this repo\'s hand-committed PRPs/metrics control files have not drifted from the shipped templates', () => {
  for (const [name, template] of Object.entries(TEMPLATES)) {
    assert.equal(
      readTemplate(`PRPs/metrics/${name}`),
      readTemplate(template),
      `PRPs/metrics/${name} and ${template} must stay identical — the template is what every other project receives`
    );
  }
});
