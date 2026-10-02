// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-5 Ignore rules are proven before any secret is written
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-6 (phase-1 slice) tracked/ignored split is correct
/**
 * Behavior tests for plugins/relay/scripts/auth-kit-secrecy.mjs.
 *
 * Every test spawns the real script against a throwaway git repo and then asks
 * git itself (not the script) whether a path is ignored. Global and system git
 * config are neutralised so a developer's own excludes file cannot make a path
 * look ignored. Each assertion class has a mutation test showing it can fail.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const SCRIPT = resolve('plugins/relay/scripts/auth-kit-secrecy.mjs');
const RESOURCE = resolve('plugins/relay/resources/auth-kit.gitignore');

// os.devNull is `\\.\nul` on Windows, which git cannot open; use a real empty file.
const EMPTY_CONFIG = join(mkdtempSync(join(tmpdir(), 'auth-kit-gitcfg-')), 'empty.gitconfig');
writeFileSync(EMPTY_CONFIG, '');

const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: EMPTY_CONFIG,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CEILING_DIRECTORIES: dirname(tmpdir()),
};

/** @param {string} cwd @param {string[]} args */
function git(cwd, args) {
  return spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env: ENV });
}

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'auth-kit-secrecy-'));
}

function gitRepo() {
  const root = tempDir();
  const r = git(root, ['init', '-q']);
  assert.equal(r.status, 0, r.stderr);
  return root;
}

/** @param {string[]} args @param {string} cwd */
function run(args, cwd) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', env: ENV });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** git's own verdict: true when the path is ignored. @param {string} root @param {string} rel */
function gitIgnores(root, rel) {
  const r = git(root, ['check-ignore', '-q', '--', rel]);
  assert.ok(r.status === 0 || r.status === 1, `git check-ignore errored: ${r.stderr}`);
  return r.status === 0;
}

/** @param {string} root @param {string} content */
function writeAuthIgnore(root, content) {
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', '.gitignore'), content, 'utf8');
}

test('positive control: git reports a path ignored only when a matching rule exists', () => {
  const root = gitRepo();
  assert.equal(gitIgnores(root, 'PRPs/auth/credentials.json'), false);
  writeAuthIgnore(root, 'credentials.*\n');
  assert.equal(gitIgnores(root, 'PRPs/auth/credentials.json'), true);
});

test('ensure in a fresh git repo proves the secret paths and leaves the tracked side trackable', () => {
  const root = gitRepo();
  const r = run(['ensure', '--root', root], root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /IGNORE_PROVEN: 3 path\(s\)/);
  assert.ok(existsSync(join(root, 'PRPs', 'auth', '.gitignore')));
  assert.equal(gitIgnores(root, 'PRPs/auth/credentials.json'), true);
  assert.equal(gitIgnores(root, 'PRPs/auth/credentials.yaml'), true);
  assert.equal(gitIgnores(root, 'PRPs/auth/.sessions/admin.json'), true);
  assert.equal(gitIgnores(root, 'PRPs/auth/admin.storage-state.json'), true);
  assert.equal(gitIgnores(root, 'PRPs/auth/admin.session.json'), true);
  assert.equal(gitIgnores(root, 'PRPs/auth/credentials.example.json'), false);
  assert.equal(gitIgnores(root, 'PRPs/auth/auth-model.md'), false);
  assert.equal(gitIgnores(root, 'PRPs/auth/.gitignore'), false);
});

test('ensure writes only the ignore file, never a secret or session artifact', () => {
  const root = gitRepo();
  run(['ensure', '--root', root], root);
  const auth = readdirSync(join(root, 'PRPs', 'auth'));
  assert.deepEqual(auth, ['.gitignore']);
});

test('scaffold copies the packaged resource verbatim (LF) into PRPs/auth/.gitignore', () => {
  const root = gitRepo();
  const r = run(['scaffold', '--root', root], root);
  assert.equal(r.status, 0, r.stderr);
  const expected = readFileSync(RESOURCE, 'utf8').split('\r\n').join('\n');
  assert.equal(readFileSync(join(root, 'PRPs', 'auth', '.gitignore'), 'utf8'), expected);
});

test('scaffold never overwrites an existing PRPs/auth/.gitignore', () => {
  const root = gitRepo();
  const custom = '# operator-owned\nextra-rule\n';
  writeAuthIgnore(root, custom);
  const r = run(['scaffold', '--root', root], root);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readFileSync(join(root, 'PRPs', 'auth', '.gitignore'), 'utf8'), custom);
});

test('ensure over an operator-owned ignore file preserves it and halts when it does not cover the secrets', () => {
  const root = gitRepo();
  const custom = '# operator-owned, covers nothing\nextra-rule\n';
  writeAuthIgnore(root, custom);
  const r = run(['ensure', '--root', root], root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_IGNORE_UNPROVEN/);
  assert.equal(readFileSync(join(root, 'PRPs', 'auth', '.gitignore'), 'utf8'), custom);
});

test('prove against a neutered .gitignore halts FAILED_IGNORE_UNPROVEN naming each unproven path', () => {
  const root = gitRepo();
  writeAuthIgnore(root, '# nothing ignored\n');
  const r = run(['prove', '--root', root], root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_IGNORE_UNPROVEN: 3 secret path\(s\) not proven ignored/);
  assert.match(r.stderr, /\(not-ignored\)/);
  assert.match(r.stderr, /PRPs\/auth\/credentials\.json/);
  assert.equal(r.stdout, '');
});

test('prove halts when only one of the secret paths is left unignored (mutation: drop .sessions/)', () => {
  const root = gitRepo();
  const mutated = readFileSync(RESOURCE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '.sessions/')
    .join('\n');
  writeAuthIgnore(root, mutated);
  const r = run(['prove', '--root', root], root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /1 secret path\(s\) not proven ignored/);
  assert.match(r.stderr, /\.sessions\/_probe\.json \(not-ignored\)/);
});

test('prove succeeds against the unmodified resource (baseline for the mutations above)', () => {
  const root = gitRepo();
  run(['scaffold', '--root', root], root);
  const r = run(['prove', '--root', root], root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /IGNORE_PROVEN: 3 path\(s\)/);
});

test('prove writes nothing, even when it halts', () => {
  const root = gitRepo();
  const r = run(['prove', '--root', root], root);
  assert.equal(r.status, 1);
  assert.equal(existsSync(join(root, 'PRPs')), false);
});

test('an already-tracked secret path is not proven ignored', () => {
  const root = gitRepo();
  run(['scaffold', '--root', root], root);
  writeFileSync(join(root, 'PRPs', 'auth', 'credentials.json'), '{"placeholder":true}\n');
  const add = git(root, ['add', '-f', 'PRPs/auth/credentials.json']);
  assert.equal(add.status, 0, add.stderr);
  const r = run(['prove', '--root', root, '--path', 'PRPs/auth/credentials.json'], root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_IGNORE_UNPROVEN: 1 secret path\(s\)/);
  assert.match(r.stderr, /credentials\.json \(not-ignored\)/);
});

test('--path overrides the default secret set', () => {
  const root = gitRepo();
  run(['scaffold', '--root', root], root);
  const ok = run(['prove', '--root', root, '--path', 'PRPs/auth/credentials.json'], root);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /IGNORE_PROVEN: 1 path\(s\)/);
  const bad = run(['prove', '--root', root, '--path', 'PRPs/auth/credentials.example.json'], root);
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /credentials\.example\.json \(not-ignored\)/);
});

test('ensure outside a git work tree halts with git-error and writes nothing', () => {
  const root = tempDir();
  const r = run(['ensure', '--root', root], root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /FAILED_IGNORE_UNPROVEN/);
  assert.match(r.stderr, /\(git-error\)/);
  assert.deepEqual(readdirSync(root), []);
});

test('prove outside a git work tree is git-error, not a silent pass', () => {
  const root = tempDir();
  const r = run(['prove', '--root', root], root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\(git-error\)/);
});

test('root defaults to the working directory', () => {
  const root = gitRepo();
  const r = run(['ensure'], root);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(root, 'PRPs', 'auth', '.gitignore')));
});

const BAD_ARGS = [
  ['unknown argument', ['ensure', '--bogus']],
  ['unknown positional', ['ensure', 'extra']],
  ['no mode', []],
  ['--root without a value', ['ensure', '--root']],
  ['--path without a value', ['ensure', '--path']],
  ['absolute --path', ['ensure', '--path', '/etc/passwd']],
  ['drive-letter --path', ['ensure', '--path', 'C:/secrets.json']],
  ['--path with a .. segment', ['ensure', '--path', 'PRPs/../../outside.json']],
  ['backslash .. --path', ['ensure', '--path', 'PRPs\\..\\outside.json']],
  ['second mode', ['ensure', 'scaffold']],
];

for (const [label, args] of BAD_ARGS) {
  test(`usage error exits 2 and writes nothing: ${label}`, () => {
    const root = gitRepo();
    const before = readdirSync(root).sort();
    const r = run(/** @type {string[]} */ (args), root);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /Usage:/);
    assert.deepEqual(readdirSync(root).sort(), before);
  });
}

test('--help prints usage, exits 0 and writes nothing', () => {
  const root = gitRepo();
  const before = readdirSync(root).sort();
  const r = run(['--help'], root);
  assert.equal(r.status, 0, r.stderr);
  for (const token of ['scaffold', 'prove', 'ensure']) assert.ok(r.stdout.includes(token));
  assert.deepEqual(readdirSync(root).sort(), before);
});

test('the script never echoes a credential value found in a secret file', () => {
  const root = gitRepo();
  run(['scaffold', '--root', root], root);
  const secret = 'hunter2-SENTINEL-VALUE';
  writeFileSync(join(root, 'PRPs', 'auth', 'credentials.json'), JSON.stringify({ password: secret }));
  const r = run(['ensure', '--root', root], root);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!r.stdout.includes(secret) && !r.stderr.includes(secret));
});

test('the packaged resource keeps credentials.example.* trackable (mutation: re-include removed makes it ignored)', () => {
  const repo = gitRepo();
  writeAuthIgnore(repo, readFileSync(RESOURCE, 'utf8'));
  assert.equal(gitIgnores(repo, 'PRPs/auth/credentials.example.json'), false);

  const mutated = gitRepo();
  const without = readFileSync(RESOURCE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '!credentials.example.*')
    .join('\n');
  writeAuthIgnore(mutated, without);
  assert.equal(gitIgnores(mutated, 'PRPs/auth/credentials.example.json'), true);
});
