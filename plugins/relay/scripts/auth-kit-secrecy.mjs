// @ts-check
/**
 * auth-kit-secrecy.mjs — make it impossible to write a secret before the
 * ignore rules are proven.
 *
 * Copies the packaged ignore resource ${CLAUDE_PLUGIN_ROOT}/resources/auth-kit.gitignore
 * into <root>/PRPs/auth/.gitignore and proves, with `git check-ignore`, that
 * every secret path is ignored. The only file this script ever writes is that
 * tracked ignore file; it never reads, prints or writes a credential value.
 *
 * Usage:
 *   node <plugin-root>/scripts/auth-kit-secrecy.mjs scaffold [--root <dir>]
 *   node <plugin-root>/scripts/auth-kit-secrecy.mjs prove    [--root <dir>] [--path <relative-path>]...
 *   node <plugin-root>/scripts/auth-kit-secrecy.mjs ensure   [--root <dir>] [--path <relative-path>]...
 *   node <plugin-root>/scripts/auth-kit-secrecy.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, no mode, an
 * absolute --path, or a --path containing a `..` segment exit 2 without writing.
 *
 * Exit codes: 0 proven / done, 1 FAILED_IGNORE_UNPROVEN, 2 bad arguments.
 * `ensure` is the gate later phases call before any secret write.
 *
 * No npm dependencies. Node >=18, ESM, synchronous node: builtins only.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { resolve, join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const SECRET_PATHS = [
  'PRPs/auth/credentials.json',
  'PRPs/auth/.sessions/_probe.json',
  'PRPs/auth/_probe.storage-state.json',
];

const USAGE = `Usage:
  auth-kit-secrecy.mjs scaffold [--root <dir>]
  auth-kit-secrecy.mjs prove    [--root <dir>] [--path <relative-path>]...
  auth-kit-secrecy.mjs ensure   [--root <dir>] [--path <relative-path>]...
  auth-kit-secrecy.mjs --help
`;

/**
 * Tmp-then-rename write.
 * @param {string} path
 * @param {string} content
 */
function writeAtomic(path, content) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

/**
 * Create <root>/PRPs/auth/ and copy the packaged ignore resource to its
 * .gitignore when absent. An existing file is never overwritten.
 * @param {string} root
 * @returns {string[]} names written
 */
export function scaffoldAuthDir(root) {
  const dir = join(root, 'PRPs', 'auth');
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, '.gitignore');
  if (existsSync(dest)) return [];
  const src = new URL('../resources/auth-kit.gitignore', import.meta.url);
  writeAtomic(dest, readFileSync(src, 'utf8').split('\r\n').join('\n'));
  return ['.gitignore'];
}

/**
 * Prove each path ignored via `git check-ignore -q`. Exit 0 is ignored, 1 is
 * not-ignored (including already-tracked: --no-index is deliberately not
 * passed), anything else is a git error. Writes nothing.
 * @param {string} root
 * @param {string[]} paths
 * @returns {{ ok: boolean, results: { path: string, status: 'ignored' | 'not-ignored' | 'git-error' }[] }}
 */
export function proveIgnored(root, paths) {
  /** @type {{ path: string, status: 'ignored' | 'not-ignored' | 'git-error' }[]} */
  const results = [];
  for (const path of paths) {
    const r = spawnSync('git', ['-C', root, 'check-ignore', '-q', '--', path], { encoding: 'utf8' });
    /** @type {'ignored' | 'not-ignored' | 'git-error'} */
    let status = 'git-error';
    if (!r.error && r.status === 0) status = 'ignored';
    else if (!r.error && r.status === 1) status = 'not-ignored';
    results.push({ path, status });
  }
  return { ok: results.every((x) => x.status === 'ignored'), results };
}

/**
 * @param {string} root
 * @returns {boolean}
 */
function isWorkTree(root) {
  const r = spawnSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' });
  return !r.error && r.status === 0 && String(r.stdout).trim() === 'true';
}

/**
 * Gate before any secret write: work tree check, scaffold, then prove.
 * @param {string} root
 * @param {string[]} paths
 * @returns {{ ok: boolean, results: { path: string, status: string }[] }}
 */
export function ensureSecrecy(root, paths) {
  if (!isWorkTree(root)) {
    return { ok: false, results: paths.map((path) => ({ path, status: 'git-error' })) };
  }
  scaffoldAuthDir(root);
  return proveIgnored(root, paths);
}

/**
 * @param {{ ok: boolean, results: { path: string, status: string }[] }} outcome
 * @returns {number} exit code
 */
function report(outcome) {
  if (outcome.ok) {
    process.stdout.write(`IGNORE_PROVEN: ${outcome.results.length} path(s)\n`);
    return 0;
  }
  const bad = outcome.results.filter((x) => x.status !== 'ignored');
  process.stderr.write(
    `FAILED_IGNORE_UNPROVEN: ${bad.length} secret path(s) not proven ignored: ` +
      `${bad.map((x) => `${x.path} (${x.status})`).join(', ')}\n`,
  );
  return 1;
}

/**
 * @param {string[]} argv
 * @returns {{ help: boolean, mode: string | null, root: string, paths: string[] } | null} null on bad arguments
 */
function parseArgs(argv) {
  let help = false;
  /** @type {string | null} */ let mode = null;
  let root = process.cwd();
  /** @type {string[]} */ const paths = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') {
      help = true;
    } else if (a === '--root' || a === '--path') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      i++;
      if (a === '--root') {
        root = resolve(v);
      } else {
        const p = v.split('\\').join('/');
        if (isAbsolute(p) || /^[A-Za-z]:/.test(p) || p.split('/').includes('..')) return null;
        paths.push(p);
      }
    } else if (!a.startsWith('--') && mode === null && ['scaffold', 'prove', 'ensure'].includes(a)) {
      mode = a;
    } else {
      return null;
    }
  }
  if (!help && mode === null) return null;
  return { help, mode, root, paths };
}

/**
 * @param {string[]} argv
 * @returns {number} exit code
 */
function main(argv) {
  const args = parseArgs(argv);
  if (args === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const paths = args.paths.length > 0 ? args.paths : SECRET_PATHS;
  if (args.mode === 'scaffold') {
    const written = scaffoldAuthDir(args.root);
    process.stdout.write(`SCAFFOLD: ${written.length} file(s) written\n`);
    return 0;
  }
  if (args.mode === 'prove') return report(proveIgnored(args.root, paths));
  return report(ensureSecrecy(args.root, paths));
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main(process.argv.slice(2));
}
