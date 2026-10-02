// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-1 (phase-3 slice) local-only hard failure
/**
 * Behavior tests for plugins/relay/scripts/auth-local-guard.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-3-login-scripts.plan.md
 *
 * Authored test-after by the test pair. The guard is exercised through its
 * public surface only: the exported checkTarget / isAllowedHost functions with
 * an injected address lookup (so no test depends on real DNS), and the CLI run
 * as a subprocess. Every refusal class is paired with an allowed control so a
 * guard that always refuses, or always allows, fails a test.
 *
 * Run: node --test scripts/validate/checks/auth-local-guard.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import {
  checkTarget,
  isAllowedHost,
  isLoopbackAddress,
  parseDeclaration,
  resolveDeclared,
} from '../../../plugins/relay/scripts/auth-local-guard.mjs';

const GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');

function tempRoot() {
  return mkdtempSync(join(tmpdir(), 'auth-local-guard-'));
}

/** @param {string} root @param {string} content */
function declare(root, content) {
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'local-hosts.txt'), content, 'utf8');
}

/** @param {string[]} addresses */
function lookupReturning(addresses) {
  return async () => addresses.map((address) => ({ address }));
}

/** @param {string[]} args */
function cli(args) {
  const r = spawnSync(process.execPath, [GUARD, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

// ---------------------------------------------------------------------------
// Built-in loopback names are allowed (controls)
// ---------------------------------------------------------------------------

test('checkTarget allows the built-in loopback names over http and https', async () => {
  const root = tempRoot();
  for (const url of [
    'http://localhost:3000',
    'https://localhost',
    'http://127.0.0.1:8080/app',
    'http://[::1]:3000',
    'http://LOCALHOST:3000',
  ]) {
    const r = await checkTarget(url, { root });
    assert.equal(r.ok, true, url);
  }
  const r = await checkTarget('http://localhost:3000/deep/path?x=1', { root });
  assert.equal(r.ok && r.origin, 'http://localhost:3000');
  assert.equal(r.ok && r.host, 'localhost');
});

// ---------------------------------------------------------------------------
// Refusals: the decision is made on the parsed hostname, never on a substring
// ---------------------------------------------------------------------------

test('checkTarget refuses remote hosts, including names that merely contain or start with a local name', async () => {
  const root = tempRoot();
  for (const url of [
    'http://evil.com',
    'http://localhost.evil.com',
    'http://127.0.0.1.evil.com',
    'http://notlocalhost',
    'http://localhost.',
    'http://0.0.0.0:3000',
    'http://evil.com#@localhost',
    'http://evil.com/?next=localhost',
  ]) {
    const r = await checkTarget(url, { root });
    assert.equal(r.ok, false, url);
    assert.equal(!r.ok && r.reason, 'not-declared', url);
  }
});

test('checkTarget refuses userinfo even when the real host is local, and when the local name is only the userinfo', async () => {
  const root = tempRoot();
  const userinfoLocal = await checkTarget('http://user:pw@localhost:3000', { root });
  assert.equal(userinfoLocal.ok, false);
  assert.equal(!userinfoLocal.ok && userinfoLocal.reason, 'userinfo');
  const disguised = await checkTarget('http://localhost@evil.com', { root });
  assert.equal(disguised.ok, false);
  assert.equal(!disguised.ok && disguised.reason, 'userinfo');
  const disguisedPort = await checkTarget('http://localhost:3000@evil.com', { root });
  assert.equal(disguisedPort.ok, false);
  // Control: the same host without userinfo is allowed.
  assert.equal((await checkTarget('http://localhost:3000', { root })).ok, true);
});

test('checkTarget decides on the URL the parser sees: a backslash ends the authority, so the host is local', async () => {
  const root = tempRoot();
  const r = await checkTarget('http://localhost\\@evil.com', { root });
  assert.equal(r.ok && r.host, 'localhost');
  assert.equal(r.ok && r.origin, 'http://localhost');
});

test('checkTarget refuses non-http schemes and unparseable input', async () => {
  const root = tempRoot();
  for (const [url, reason] of [
    ['ftp://localhost', 'scheme'],
    ['file:///etc/passwd', 'scheme'],
    ['javascript:alert(1)', 'scheme'],
    ['not a url', 'unparseable'],
    ['', 'unparseable'],
    ['//evil.com', 'unparseable'],
  ]) {
    const r = await checkTarget(url, { root });
    assert.equal(r.ok, false, url);
    assert.equal(!r.ok && r.reason, reason, url);
  }
});

// ---------------------------------------------------------------------------
// Declared hosts: only from the tracked file, and only when every address is loopback
// ---------------------------------------------------------------------------

test('a declared host is allowed only when its lookup yields loopback addresses exclusively', async () => {
  const root = tempRoot();
  declare(root, '# local dev hosts\napp.test\n');

  const ok = await checkTarget('http://app.test:3000', { root, lookup: lookupReturning(['127.0.0.1', '::1']) });
  assert.equal(ok.ok, true);
  assert.ok(ok.ok && ok.allowedHosts.has('app.test'));
  assert.ok(ok.ok && ok.allowedHosts.has('localhost'));

  for (const addresses of [['10.0.0.5'], ['127.0.0.1', '8.8.8.8'], ['192.168.1.10'], []]) {
    const r = await checkTarget('http://app.test:3000', { root, lookup: lookupReturning(addresses) });
    assert.equal(r.ok, false, addresses.join(','));
    assert.equal(!r.ok && r.reason, 'declared-not-loopback', addresses.join(','));
  }

  const failing = await checkTarget('http://app.test:3000', {
    root,
    lookup: async () => {
      throw new Error('ENOTFOUND');
    },
  });
  assert.equal(failing.ok, false);
});

test('a host that resolves to loopback but is not declared is refused; an absent declaration file declares nothing', async () => {
  const declaredElsewhere = tempRoot();
  declare(declaredElsewhere, 'other.test\n');
  const loopback = lookupReturning(['127.0.0.1']);
  const r1 = await checkTarget('http://app.test', { root: declaredElsewhere, lookup: loopback });
  assert.equal(!r1.ok && r1.reason, 'not-declared');

  const noFile = tempRoot();
  const r2 = await checkTarget('http://app.test', { root: noFile, lookup: loopback });
  assert.equal(!r2.ok && r2.reason, 'not-declared');

  // Control: declaring it flips the verdict.
  declare(declaredElsewhere, 'other.test\napp.test\n');
  assert.equal((await checkTarget('http://app.test', { root: declaredElsewhere, lookup: loopback })).ok, true);
});

test('a declared host is matched exactly: a declared name does not admit a suffix or a prefix', async () => {
  const root = tempRoot();
  declare(root, 'app.test\n');
  const loopback = lookupReturning(['127.0.0.1']);
  for (const url of ['http://app.test.evil.com', 'http://evil-app.test', 'http://sub.app.test']) {
    const r = await checkTarget(url, { root, lookup: loopback });
    assert.equal(r.ok, false, url);
  }
  assert.equal((await checkTarget('http://app.test', { root, lookup: loopback })).ok, true);
});

test('parseDeclaration keeps bare hostnames (lowercased, de-duplicated) and ignores comments and anything URL-shaped', () => {
  const { hosts, ignored } = parseDeclaration(
    ['# comment', '', 'App.Test', 'app.test', 'http://evil.com', 'user@host', 'host:8080', 'a/b', 'bad_host', '  spaced.test  '].join('\n'),
  );
  assert.deepEqual(hosts, ['app.test', 'spaced.test']);
  assert.deepEqual(ignored, ['http://evil.com', 'user@host', 'host:8080', 'a/b', 'bad_host']);
});

test('a declaration line carrying a URL or userinfo never becomes a declared host', async () => {
  const root = tempRoot();
  declare(root, 'http://evil.com\nlocalhost@evil.com\n');
  const r = await checkTarget('http://evil.com', { root, lookup: lookupReturning(['127.0.0.1']) });
  assert.equal(r.ok, false);
});

test('resolveDeclared keeps only hosts whose every address is loopback', async () => {
  /** @type {Record<string, string[]>} */
  const table = { good: ['127.0.0.1'], mixed: ['127.0.0.1', '1.2.3.4'], remote: ['8.8.8.8'] };
  const kept = await resolveDeclared(['good', 'mixed', 'remote', 'missing'], async (h) => {
    if (!(h in table)) throw new Error('ENOTFOUND');
    return table[h].map((address) => ({ address }));
  });
  assert.deepEqual(kept, ['good']);
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test('isAllowedHost is exact Set membership on the already-parsed hostname', () => {
  assert.equal(isAllowedHost('localhost', new Set(['localhost'])), true);
  assert.equal(isAllowedHost('LocalHost', ['localhost']), true);
  assert.equal(isAllowedHost('localhost.evil.com', new Set(['localhost'])), false);
  assert.equal(isAllowedHost('evil.com', ['localhost', '127.0.0.1']), false);
  assert.equal(isAllowedHost('', new Set(['localhost'])), false);
});

test('isLoopbackAddress accepts only 127/8, ::1 and mapped 127/8', () => {
  for (const a of ['127.0.0.1', '127.255.0.3', '::1', '0:0:0:0:0:0:0:1', '::ffff:127.0.0.1']) {
    assert.equal(isLoopbackAddress(a), true, a);
  }
  for (const a of ['128.0.0.1', '10.0.0.1', '0.0.0.0', '::', '::ffff:10.0.0.1', '127.0.0.256', 'localhost', '']) {
    assert.equal(isLoopbackAddress(a), false, a);
  }
});

// ---------------------------------------------------------------------------
// CLI surface
// ---------------------------------------------------------------------------

test('CLI check exits 0 and names the origin for a local target, and exits 1 with FAILED_NON_LOCAL_TARGET for a remote one', () => {
  const root = tempRoot();
  const ok = cli(['check', '--root', root, '--url', 'http://localhost:3000/x']);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.trim(), 'LOCAL_TARGET_OK: http://localhost:3000');

  const bad = cli(['check', '--root', root, '--url', 'http://localhost@evil.com']);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /^FAILED_NON_LOCAL_TARGET: userinfo/);
  assert.equal(bad.stdout, '');

  const remote = cli(['check', '--root', root, '--url', 'https://example.com']);
  assert.equal(remote.status, 1);
  assert.match(remote.stderr, /FAILED_NON_LOCAL_TARGET: not-declared \(host: example\.com\)/);
});

test('CLI check writes nothing, whatever the verdict', () => {
  const root = tempRoot();
  cli(['check', '--root', root, '--url', 'http://localhost:3000']);
  cli(['check', '--root', root, '--url', 'http://evil.com']);
  assert.deepEqual(readdirSync(root), []);
});

test('CLI rejects the retired --local-host flag, unknown flags, a missing mode and a missing --url with exit 2', () => {
  const root = tempRoot();
  for (const args of [
    ['check', '--root', root, '--url', 'http://evil.com', '--local-host', 'evil.com'],
    ['check', '--root', root, '--url', 'http://localhost', '--bogus'],
    ['--root', root],
    ['check', '--root', root],
    ['check', '--url'],
  ]) {
    const r = cli(args);
    assert.equal(r.status, 2, args.join(' '));
    assert.match(r.stderr, /Usage:/);
  }
  // Control: the retired flag is the only difference from an accepted invocation.
  assert.equal(cli(['check', '--root', root, '--url', 'http://localhost']).status, 0);
});

test('CLI list-declared prints only verified declared hosts', () => {
  const root = tempRoot();
  declare(root, 'localhost\nnonexistent-host.invalid\n');
  const r = cli(['list-declared', '--root', root]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.split('\n').filter(Boolean), ['localhost']);
});

// ---------------------------------------------------------------------------
// Source-level invariants: no per-run flag and no environment source for hosts
// ---------------------------------------------------------------------------

/** @param {string} text */
function sourceFindings(text) {
  /** @type {string[]} */
  const f = [];
  if (text.includes('--local-host')) f.push('RETIRED_FLAG');
  if (/process\.env/.test(text)) f.push('ENV_SOURCE');
  if (/\b(writeFileSync|renameSync|appendFileSync|mkdirSync)\b/.test(text)) f.push('WRITES');
  if (!text.includes('new URL(')) f.push('NO_URL_PARSER');
  if (!/\.hostname\b/.test(text)) f.push('NO_HOSTNAME_DECISION');
  return f;
}

test('guard source has no per-run host flag, no environment source, no write API, and parses with new URL()', () => {
  const text = readFileSync(GUARD, 'utf8');
  assert.deepEqual(sourceFindings(text), []);
});

test('each guard-source invariant is detected when violated', () => {
  const text = readFileSync(GUARD, 'utf8');
  assert.ok(sourceFindings(`${text}\n// --local-host\n`).includes('RETIRED_FLAG'));
  assert.ok(sourceFindings(`${text}\nconst x = process.env.LOCAL_HOSTS;\n`).includes('ENV_SOURCE'));
  assert.ok(sourceFindings(`${text}\nwriteFileSync('x', 'y');\n`).includes('WRITES'));
  assert.ok(sourceFindings(text.split('new URL(').join('parseIt(')).includes('NO_URL_PARSER'));
});
