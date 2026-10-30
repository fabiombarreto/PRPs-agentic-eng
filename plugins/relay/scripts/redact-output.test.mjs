// @ts-check
/**
 * Unit coverage for scripts/redact-output.mjs — the filter `test-runner`
 * pipes captured test output through so the raw output never touches disk.
 *
 * The property that matters is that nothing a policy layer selects survives
 * into the written file, and that the counts the command records in
 * `run.json` are the counts of what was actually replaced. The CLI tests run
 * the script as a child process against a temporary directory, because the
 * stdin path and the in-place path are exactly what the agent uses.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { redactWithCounts } from './redact-output.mjs';
import { buildRedactionTable } from './qa-run.mjs';

const SCRIPT = fileURLToPath(new URL('./redact-output.mjs', import.meta.url));

/** @param {string} root */
function tableFor(root, env = {}) {
  return buildRedactionTable({ root, env });
}

test('an env value selected by a Layer 1 wildcard name is replaced and counted as env_names', () => {
  const r = redactWithCounts('token=abcd-1234-secret in the log', tableFor(tmpdir(), { MY_API_TOKEN: 'abcd-1234-secret' }));
  assert.equal(r.text, 'token=[REDACTED] in the log');
  assert.deepEqual(r.secrets_redacted, { count: 1, categories: { env_names: 1, url_values: 0, regex_matches: 0 } });
});

test('a connection-string env value is replaced whole with [REDACTED_URL] and counted as url_values', () => {
  const url = 'postgres://user:p@ss@db:5432/app';
  const r = redactWithCounts(`connecting to ${url} ... ${url}`, tableFor(tmpdir(), { DATABASE_URL: url }));
  assert.equal(r.text, 'connecting to [REDACTED_URL] ... [REDACTED_URL]');
  assert.equal(r.secrets_redacted.categories.url_values, 2);
});

test('a well-known secret format is replaced by the Layer 1 value regex with no env context', () => {
  const r = redactWithCounts('key AKIAABCDEFGHIJKLMNOP leaked', tableFor(tmpdir()));
  assert.equal(r.text, 'key [REDACTED] leaked');
  assert.equal(r.secrets_redacted.categories.regex_matches, 1);
});

test('Layer 2 names and regexes from PRPs/redaction-extensions.txt are applied', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-redact-'));
  try {
    mkdirSync(join(root, 'PRPs'));
    writeFileSync(join(root, 'PRPs', 'redaction-extensions.txt'), '# project rules\nPHOENIX_PROXY\nregex:phx-[a-f0-9]{8}\n');
    const r = redactWithCounts('a=proxyvalue b=phx-deadbeef', tableFor(root, { PHOENIX_PROXY: 'proxyvalue' }));
    assert.equal(r.text, 'a=[REDACTED] b=[REDACTED]');
    assert.deepEqual(r.secrets_redacted.categories, { env_names: 1, url_values: 0, regex_matches: 1 });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('output with nothing to hide is unchanged and still reports count 0', () => {
  const r = redactWithCounts('5 passed in 0.12s\n', tableFor(tmpdir()));
  assert.equal(r.text, '5 passed in 0.12s\n');
  assert.equal(r.secrets_redacted.count, 0);
});

test('CLI: stdin is redacted straight into --out, parent directories are created, and the JSON line names the counts', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-redact-'));
  try {
    const out = join(root, 'PRPs', 'reports', 'f', 'attempts', '1', 'stdout.log');
    const res = spawnSync(process.execPath, [SCRIPT, '--root', root, '--out', out], {
      input: 'FAILED test_login - token s3cr3t-value-123 rejected\n',
      env: { ...process.env, SERVICE_TOKEN: 's3cr3t-value-123' },
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(readFileSync(out, 'utf8'), 'FAILED test_login - token [REDACTED] rejected\n');
    const report = JSON.parse(res.stdout);
    assert.equal(report.secrets_redacted.count, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI: --in equal to --out redacts a JUnit file in place', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-redact-'));
  try {
    const junit = join(root, 'junit.xml');
    writeFileSync(junit, '<testcase><failure>expected AKIAABCDEFGHIJKLMNOP</failure></testcase>');
    const res = spawnSync(process.execPath, [SCRIPT, '--root', root, '--in', junit, '--out', junit], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(readFileSync(junit, 'utf8'), '<testcase><failure>expected [REDACTED]</failure></testcase>');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI: a missing --out, an unknown argument or an unreadable --in exits 2 and writes nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-redact-'));
  try {
    const out = join(root, 'never.log');
    for (const args of [[], ['--out', out, '--bogus'], ['--in', join(root, 'absent.txt'), '--out', out]]) {
      const res = spawnSync(process.execPath, [SCRIPT, ...args], { input: 'x', encoding: 'utf8' });
      assert.equal(res.status, 2, `expected exit 2 for ${JSON.stringify(args)}`);
      assert.equal(existsSync(out), false, `wrote ${out} for ${JSON.stringify(args)}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
