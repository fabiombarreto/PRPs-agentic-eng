// @ts-check
/**
 * auth-local-guard.mjs — the local-only guard of the test-auth kit.
 *
 * Decides whether a target URL is a local application. The host is taken from
 * the WHATWG URL parser's own hostname component and decided by exact equality
 * against the built-in loopback names or against hostnames declared in the
 * tracked project file PRPs/auth/local-hosts.txt (one bare hostname per line,
 * `#` comments allowed), each of which must resolve with every address
 * loopback before it is honoured. A target carrying userinfo is refused even
 * when its host is local. There is no per-run flag and no environment-variable
 * source for declared hosts. The script never writes any file.
 *
 * Usage:
 *   node <plugin-root>/scripts/auth-local-guard.mjs check --url <url> [--root <dir>]
 *   node <plugin-root>/scripts/auth-local-guard.mjs list-declared [--root <dir>]
 *   node <plugin-root>/scripts/auth-local-guard.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, or no mode
 * exit 2 without writing.
 *
 * Exit codes: 0 allowed, 1 FAILED_NON_LOCAL_TARGET, 2 bad arguments.
 *
 * No npm dependencies. Node >=18, ESM, `node:` builtins only.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import dns from 'node:dns';

export const BUILTIN_LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
export const DECLARATION_PATH = 'PRPs/auth/local-hosts.txt';

const USAGE = `Usage:
  auth-local-guard.mjs check --url <url> [--root <dir>]
  auth-local-guard.mjs list-declared [--root <dir>]
  auth-local-guard.mjs --help
`;

const LABEL = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * @param {string} text
 * @returns {{ hosts: string[], ignored: string[] }}
 */
export function parseDeclaration(text) {
  /** @type {string[]} */ const hosts = [];
  /** @type {string[]} */ const ignored = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const lower = line.toLowerCase();
    const labels = lower.split('.');
    const bare =
      !/[\s@:/\\]/.test(lower) && labels.length > 0 && labels.every((l) => LABEL.test(l));
    if (!bare) {
      ignored.push(line);
      continue;
    }
    if (!hosts.includes(lower)) hosts.push(lower);
  }
  return { hosts, ignored };
}

/**
 * @param {string} address
 * @returns {boolean}
 */
export function isLoopbackAddress(address) {
  const a = String(address).toLowerCase();
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  let m = v4.exec(a);
  if (m) return Number(m[1]) === 127 && m.slice(1).every((n) => Number(n) <= 255);
  if (a === '::1' || a === '0:0:0:0:0:0:0:1') return true;
  m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(a);
  if (m) return isLoopbackAddress(m[1]);
  return false;
}

/**
 * Keep only the hosts whose lookup yields at least one address, all loopback.
 * @param {string[]} hosts
 * @param {(host: string, opts: { all: true }) => Promise<{ address: string }[]>} [lookup]
 * @returns {Promise<string[]>}
 */
export async function resolveDeclared(hosts, lookup = dns.promises.lookup) {
  /** @type {string[]} */ const ok = [];
  for (const h of hosts) {
    try {
      const res = await lookup(h, { all: true });
      if (Array.isArray(res) && res.length > 0 && res.every((r) => isLoopbackAddress(r.address))) {
        ok.push(h);
      }
    } catch {
      // a lookup error means the host is not honoured
    }
  }
  return ok;
}

/**
 * Exact Set membership on an already-parsed hostname.
 * @param {string} hostname
 * @param {Set<string> | string[]} allowedHosts
 * @returns {boolean}
 */
export function isAllowedHost(hostname, allowedHosts) {
  const set = allowedHosts instanceof Set ? allowedHosts : new Set(allowedHosts);
  return set.has(String(hostname).toLowerCase());
}

/**
 * @param {string} root
 * @returns {string[]} declared hostnames (unverified); empty when the file is absent
 */
function readDeclared(root) {
  try {
    return parseDeclaration(readFileSync(join(root, DECLARATION_PATH), 'utf8')).hosts;
  } catch {
    return [];
  }
}

/**
 * @param {string} input
 * @param {{ root?: string, lookup?: any }} [opts]
 * @returns {Promise<{ ok: true, origin: string, host: string, allowedHosts: Set<string> } | { ok: false, reason: string, host: string }>}
 */
export async function checkTarget(input, opts = {}) {
  const root = opts.root ?? process.cwd();
  /** @type {URL} */ let url;
  try {
    url = new URL(String(input));
  } catch {
    return { ok: false, reason: 'unparseable', host: '' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'scheme', host: url.hostname };
  }
  // userinfo: refused even when the host is local (covers http://localhost@evil.com by name)
  if (url.username !== '' || url.password !== '') {
    return { ok: false, reason: 'userinfo', host: url.hostname.toLowerCase() };
  }
  const host = url.hostname.toLowerCase();
  const allowedHosts = new Set(BUILTIN_LOCAL_HOSTS);
  if (BUILTIN_LOCAL_HOSTS.includes(host)) {
    return { ok: true, origin: url.origin, host, allowedHosts };
  }
  const declared = readDeclared(root);
  if (!declared.includes(host)) return { ok: false, reason: 'not-declared', host };
  const verified = await resolveDeclared(declared, opts.lookup);
  if (!verified.includes(host)) return { ok: false, reason: 'declared-not-loopback', host };
  for (const v of verified) allowedHosts.add(v);
  return { ok: true, origin: url.origin, host, allowedHosts };
}

/**
 * @param {string[]} argv
 * @returns {{ help: boolean, mode: string | null, root: string, url: string | null } | null}
 */
function parseArgs(argv) {
  let help = false;
  /** @type {string | null} */ let mode = null;
  let root = process.cwd();
  /** @type {string | null} */ let url = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help') {
      help = true;
    } else if (a === '--root' || a === '--url') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return null;
      i++;
      if (a === '--root') root = resolve(v);
      else url = v;
    } else if (!a.startsWith('--') && mode === null && ['check', 'list-declared'].includes(a)) {
      mode = a;
    } else {
      return null;
    }
  }
  if (!help && mode === null) return null;
  if (!help && mode === 'check' && url === null) return null;
  return { help, mode, root, url };
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>} exit code
 */
async function main(argv) {
  const args = parseArgs(argv);
  if (args === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (args.mode === 'list-declared') {
    const verified = await resolveDeclared(readDeclared(args.root));
    for (const h of verified) process.stdout.write(`${h}\n`);
    return 0;
  }
  const r = await checkTarget(/** @type {string} */ (args.url), { root: args.root });
  if (r.ok) {
    process.stdout.write(`LOCAL_TARGET_OK: ${r.origin}\n`);
    return 0;
  }
  process.stderr.write(`FAILED_NON_LOCAL_TARGET: ${r.reason} (host: ${r.host})\n`);
  return 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
