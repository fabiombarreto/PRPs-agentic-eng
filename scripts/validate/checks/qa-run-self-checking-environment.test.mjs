// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-17 A stale kit login script is caught before init (preflight) and ground reports FAILED_KIT_SCRIPT_STALE by name with the refresh line instead of SESSION_UNAVAILABLE
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-18 preflight makes no network request and writes nothing, reports Playwright with its path, the Chromium build, the kit scripts and the session-directory ignore rule, and exits non-zero on any failure
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-19 A record-resolved case whose cited tests import a source changed in git after the record keeps its outcome, adds a RECORD_STALE warning and lists the files in its evidence
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-20 In a cache-shaped plugin directory Playwright either resolves or run, ground and preflight halt FAILED_PLAYWRIGHT_UNAVAILABLE naming the resolved cache path and the one provisioning command
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-22 (for these) The command doc, the knowledge base and the site state the preflight, the halts and the record flag
/**
 * Phase 7 (self-checking environment) of qa-runner-ai-executable-steps.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-7-self-checking-environment.plan.md
 *
 * Layers:
 *   1. Pure helpers over the REAL runner module, against cache-shaped temp directories OUTSIDE the repository:
 *      describePlaywright, playwrightUnavailableText, staleKitRoles, PREFLIGHT_SESSION_PROBES, runPreflight (with an
 *      injected git runner, so it needs no repository), recordStaleSources (against a temp git work tree).
 *   2. The REAL runner, COPIED into cache-shaped temp trees with NODE_PATH removed (no Playwright is reachable unless a
 *      stub is planted in the copy's own scripts/visual directory), as child processes: run, ground and preflight halts,
 *      the by-name stale-kit halt, preflight's exit codes, and the RECORD_STALE warning end to end.
 *   3. The documents (AC-22).
 *
 * Nothing here installs or downloads anything, and nothing touches this repository's git state: every git call runs in a
 * temp repository under a hermetic environment.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, statSync, utimesSync, realpathSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const SCRIPTS = resolve('plugins/relay/scripts');
const REAL_RUNNER = join(SCRIPTS, 'qa-run.mjs');
const REAL_GUARD = join(SCRIPTS, 'auth-local-guard.mjs');
const TEMPLATE = resolve('plugins/relay/resources/auth-login.template.mjs');
const STAMP = /^const KIT_TEMPLATE_ID = '([^']+)';$/m.exec(readFileSync(TEMPLATE, 'utf8'))?.[1] ?? 'missing-stamp';
const RUN_REL = 'PRPs/reports/f/qa-run/r1';
/** The run directory of the record-resolution projects: it must sit under PRPs/reports/<feature>/qa-run/ of the feature passed. */
const REC_RUN_REL = 'PRPs/reports/feat/qa-run/r1';

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v3p7-env-'));
after(() => rmSync(SANDBOX, { recursive: true, force: true }));

/** Hermetic git environment: no host configuration, no climbing above the sandbox's parent, no fsmonitor. */
const GIT_ENV = (() => {
  const globalConfig = join(SANDBOX, 'empty.gitconfig');
  const xdg = join(SANDBOX, 'xdg');
  mkdirSync(xdg, { recursive: true });
  writeFileSync(globalConfig, '');
  return {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'core.fsmonitor',
    GIT_CONFIG_VALUE_0: 'false',
    GIT_CONFIG_GLOBAL: globalConfig,
    GIT_CONFIG_NOSYSTEM: '1',
    XDG_CONFIG_HOME: xdg,
    GIT_CEILING_DIRECTORIES: realpathSync(tmpdir()),
  };
})();

/** The environment of every child: hermetic git, and no NODE_PATH, so only a planted stub can resolve Playwright. */
const CHILD_ENV = (() => {
  const env = { ...process.env, ...GIT_ENV };
  delete env.NODE_PATH;
  return env;
})();

/** @param {string} p */
const fw = (p) => p.split('\\').join('/');
/** @param {string} s */
const low = (s) => s.toLowerCase();
/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} t */
const flat = (t) => t.replace(/\s+/g, ' ').trim();

let counter = 0;
/** @param {string} label */
function fresh(label) {
  const dir = join(SANDBOX, `${label}-${++counter}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * A cache-shaped plugin directory holding a COPY of the real runner: <dir>/relay/9.9.9/{scripts,resources}.
 * stub === null: no Playwright anywhere. 'chromium': a stub whose Chromium file exists. 'missing': one whose file does not.
 * 'launch-fails': a stub whose launch rejects (the Chromium file exists, so preflight is satisfied).
 * @param {string} label
 * @param {null | 'chromium' | 'missing' | 'launch-fails'} stub
 */
function makeCache(label, stub) {
  const cache = join(fresh(label), 'relay', '9.9.9');
  mkdirSync(join(cache, 'scripts', 'visual'), { recursive: true });
  mkdirSync(join(cache, 'resources'), { recursive: true });
  copyFileSync(REAL_RUNNER, join(cache, 'scripts', 'qa-run.mjs'));
  copyFileSync(REAL_GUARD, join(cache, 'scripts', 'auth-local-guard.mjs'));
  copyFileSync(TEMPLATE, join(cache, 'resources', 'auth-login.template.mjs'));
  writeFileSync(join(cache, 'scripts', 'visual', 'package.json'), JSON.stringify({ name: 'cache-visual', private: true }));
  if (stub !== null) {
    const dir = join(cache, 'scripts', 'visual', 'node_modules', 'playwright');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'playwright', version: '9.9.9', main: 'index.js' }));
    const exe = stub === 'missing' ? join(dir, 'missing-chrome.exe') : join(dir, 'index.js');
    const launch = stub === 'launch-fails' ? ", launch: async () => { throw new Error('cannot start'); }" : '';
    writeFileSync(join(dir, 'index.js'), `module.exports = { chromium: { executablePath: () => ${JSON.stringify(exe)}${launch} } };\n`);
  }
  return cache;
}

/** @param {string} id */
const kitScript = (id) => `// Login script for one role of the test-auth kit\nconst KIT_TEMPLATE_ID = '${id}';\n`;

/**
 * A target project: kit config for a local origin, an optional kit script, an optional git work tree and ignore rule.
 * @param {string} label
 * @param {{ kit?: 'stale' | 'current', git?: boolean, ignore?: boolean }} [opts]
 */
function makeTarget(label, opts = {}) {
  const root = join(fresh(label), 'target');
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  mkdirSync(join(root, ...RUN_REL.split('/')), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: 'http://127.0.0.1:9', roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify({ states: {} }));
  if (opts.kit === 'stale') writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), kitScript('auth-login/0'));
  if (opts.kit === 'current') writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), kitScript(STAMP));
  if (opts.git === true) {
    const init = spawnSync('git', ['init', '-q', root], { env: CHILD_ENV, encoding: 'utf8' });
    assert.equal(init.status, 0, `git init: ${init.stderr}`);
  }
  if (opts.ignore === true) writeFileSync(join(root, '.gitignore'), 'PRPs/auth/.sessions/\n');
  return root;
}

/** @param {string} root a browser-case report and plan */
function writeBrowserCase(root) {
  const block = ['### Case 1', '**Title:** Opens the page', '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', '2. See Welcome.', ''].join('\n');
  mkdirSync(join(root, 'PRPs', 'reports', 'f'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', 'f', 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${block}\n## Notes\n\nnone\n`);
  writeFileSync(join(root, ...RUN_REL.split('/'), 'plan.json'), JSON.stringify({ schema_version: 1, cases: [{ index: 1, title: 'Opens the page', driver: 'browser', role: null, state: 'none', steps: [{ action: 'goto', path: '/' }, { action: 'expect_visible', text: 'Welcome' }] }] }));
}

/**
 * Runs the COPY of the runner that sits in the cache, so its plugin root is the cache.
 * @param {string} cache
 * @param {string[]} args
 * @param {string} cwd
 * @param {string} [script]
 */
function qa(cache, args, cwd, script = join(cache, 'scripts', 'qa-run.mjs')) {
  return spawnSync(process.execPath, [script, ...args], { cwd, env: CHILD_ENV, encoding: 'utf8', windowsHide: true, timeout: 120000 });
}
/** @param {string} root @param {string} [role] */
const groundArgs = (root, role) => ['ground', '--root', root, '--feature', 'f', '--run-dir', RUN_REL, '--route', '/', ...(role ? ['--role', role] : [])];
/** @param {string} cache */
const visualOf = (cache) => fw(join(cache, 'scripts', 'visual'));
/** @param {string} text @param {string} cache */
const hasCommand = (text, cache) => low(text).includes(`npm --prefix "${low(visualOf(cache))}" install`);
/** @param {{ status: number | null, stdout: string, stderr: string }} r */
const describe = (r) => `status ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`;

/** @param {string} dir the file names under a tree, relative and sorted */
function listTree(dir) {
  /** @type {string[]} */ const out = [];
  /** @param {string} d */
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const abs = join(d, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else out.push(`${fw(abs.slice(dir.length))}:${statSync(abs).size}`);
    }
  };
  walk(dir);
  return out;
}

// ---------------------------------------------------------------------------
// 1. Pure helpers (AC-20, AC-17, AC-18)
// ---------------------------------------------------------------------------

test('AC-20: the six new exports exist with the documented kinds', () => {
  for (const name of ['describePlaywright', 'playwrightUnavailableText', 'staleKitRoles', 'recordStaleSources', 'runPreflight']) {
    assert.equal(typeof (/** @type {any} */ (R))[name], 'function', `${name} must be an exported function`);
  }
  assert.ok(Array.isArray(R.PREFLIGHT_SESSION_PROBES) && R.PREFLIGHT_SESSION_PROBES.length > 0, 'the session probes are a non-empty list');
  assert.ok(Object.isFrozen(R.PREFLIGHT_SESSION_PROBES), 'the session probes are frozen');
  for (const probe of R.PREFLIGHT_SESSION_PROBES) assert.ok(probe.startsWith('PRPs/auth/.sessions/'), `probe ${probe} must sit under the session directory`);
});

test('AC-20: the halt text names the resolved plugin directory and the one provisioning command, never the repository path', () => {
  const cache = join(fresh('text'), 'relay', '9.9.9');
  const text = R.playwrightUnavailableText(cache);
  assert.ok(text.includes(visualOf(cache)), `the text must name the resolved plugin directory: ${text}`);
  assert.ok(text.includes(`npm --prefix "${visualOf(cache)}" install`), `the text must name the one command: ${text}`);
  assert.ok(!text.includes('plugins/relay/scripts/visual'), 'the text must not name the repository path');
  assert.ok(!text.includes('\\'), 'the path is printed with forward slashes');
});

test('AC-20: describePlaywright reports unresolved for an empty cache and the package directory and version for a provisioned one', () => {
  const target = makeTarget('describe');
  const bare = makeCache('describe-bare', null);
  const none = R.describePlaywright(target, bare);
  assert.equal(none.playwright, null);
  assert.equal(none.path, null);
  assert.equal(none.version, null);
  assert.equal(none.visualDir, visualOf(bare));
  const ready = makeCache('describe-ready', 'chromium');
  const found = R.describePlaywright(target, ready);
  assert.ok(found.playwright !== null && typeof found.playwright === 'object', 'the stub package is loaded');
  assert.equal(found.version, '9.9.9');
  assert.ok(/node_modules\/playwright$/.test(found.path ?? ''), `the path is the package directory: ${found.path}`);
  assert.ok((found.path ?? '').startsWith(visualOf(ready)), 'the package came from the cache directory');
});

test('AC-20: a Playwright installed in the target wins over an empty plugin directory and its path is the target package', () => {
  const target = makeTarget('describe-target');
  const dir = join(target, 'node_modules', 'playwright');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'playwright', version: '1.2.3', main: 'index.js' }));
  writeFileSync(join(dir, 'index.js'), 'module.exports = { chromium: {} };\n');
  const got = R.describePlaywright(target, join(fresh('describe-empty-plugin'), 'relay', '9.9.9'));
  assert.equal(got.version, '1.2.3');
  assert.ok((got.path ?? '').startsWith(fw(target)), `the path is under the target: ${got.path}`);
});

test('AC-17: staleKitRoles lists exactly the stale template-generated scripts, by role, with the identities', () => {
  const tmp = fresh('stale-roles');
  assert.deepEqual(R.staleKitRoles(tmp), [], 'a root with no kit has no stale role');
  const dir = join(tmp, 'PRPs', 'auth');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'login-zeta.mjs'), kitScript('auth-login/0'));
  writeFileSync(join(dir, 'login-alpha.mjs'), kitScript(STAMP));
  writeFileSync(join(dir, 'login-beta.mjs'), '// Login script for one role of the test-auth kit\nconsole.log(1);\n');
  writeFileSync(join(dir, 'login-hand-written.mjs'), 'console.log("no marker sentence");\n');
  writeFileSync(join(dir, 'login.config.json'), '{}');
  writeFileSync(join(dir, 'login-Bad_Role.mjs'), kitScript('auth-login/0'));
  const got = R.staleKitRoles(tmp);
  assert.deepEqual(got.map((x) => x.role), ['beta', 'zeta'], JSON.stringify(got));
  assert.equal(got[1].detail, `auth-login/0 vs ${STAMP}`);
  assert.equal(got[0].detail, `unstamped vs ${STAMP}`);
});

/**
 * An injected git runner: answers rev-parse and check-ignore, records every call.
 * @param {{ inside: boolean, ignored: boolean }} answers
 */
function fakeGit(answers) {
  /** @type {{ cmd: string, args: string[] }[]} */ const calls = [];
  /** @type {any} */
  const run = (/** @type {string} */ cmd, /** @type {string[]} */ args) => {
    calls.push({ cmd, args });
    if (args.includes('rev-parse')) return { status: 0, stdout: answers.inside ? 'true\n' : 'false\n', stderr: '' };
    if (args.includes('check-ignore')) return { status: answers.ignored ? 0 : 1, stdout: '', stderr: '' };
    return { status: 1, stdout: '', stderr: '' };
  };
  return { run, calls };
}

test('AC-18: runPreflight of a provisioned cache is ok, reads and asks git only, writes nothing and launches no browser', () => {
  const cache = makeCache('pf-pure', 'launch-fails');
  const root = makeTarget('pf-pure', { kit: 'current' });
  const before = listTree(root);
  const git = fakeGit({ inside: true, ignored: true });
  const realFetch = globalThis.fetch;
  globalThis.fetch = /** @type {any} */ (() => {
    throw new Error('preflight must make no network request');
  });
  /** @type {ReturnType<typeof R.runPreflight>} */ let result;
  try {
    result = R.runPreflight(root, { pluginRoot: cache, run: git.run });
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(result.ok, true, result.lines.join('\n'));
  assert.equal(result.failures, 0);
  assert.ok(/^PREFLIGHT playwright: ok .*node_modules\/playwright \(version 9\.9\.9\)$/m.test(result.lines.join('\n')), result.lines.join('\n'));
  assert.ok(result.lines.includes('PREFLIGHT chromium: ok'));
  assert.ok(result.lines.some((l) => l.startsWith('PREFLIGHT kit: ok')));
  assert.ok(result.lines.includes('PREFLIGHT sessions: ok (PRPs/auth/.sessions/ is ignored)'));
  assert.equal(result.lines.at(-1), 'PREFLIGHT: ok');
  assert.ok(git.calls.length > 0 && git.calls.every((c) => c.cmd === 'git'), 'only git is spawned');
  const probe = git.calls.find((c) => c.args.includes('check-ignore'));
  assert.ok(probe && probe.args.includes(R.PREFLIGHT_SESSION_PROBES[0]), 'the ignore rule is asked about the session probe path');
  assert.deepEqual(listTree(root), before, 'preflight must write nothing in the target');
});

test('AC-18: runPreflight fails, with its own line, for each of an unresolvable Playwright (isolated), a missing Chromium, a stale script and an unproven ignore rule', () => {
  const root = makeTarget('pf-fail', { kit: 'stale' });
  const missing = makeCache('pf-fail-missing', 'missing');
  const r = R.runPreflight(root, { pluginRoot: missing, run: fakeGit({ inside: true, ignored: false }).run });
  assert.equal(r.ok, false);
  assert.equal(r.failures, 3, r.lines.join('\n'));
  const text = r.lines.join('\n');
  assert.ok(text.includes('PREFLIGHT FAILED_BROWSER_UNAVAILABLE:') && hasCommand(text, missing), text);
  assert.ok(text.includes(`PREFLIGHT FAILED_KIT_SCRIPT_STALE: role admin (auth-login/0 vs ${STAMP}); run /relay-auth-scripts --role admin --refresh`), text);
  assert.ok(text.includes('PREFLIGHT FAILED_IGNORE_UNPROVEN:'), text);
  assert.equal(r.lines.at(-1), 'PREFLIGHT: FAILED (3 check(s))');
  // outside a git work tree there is nothing to commit, so the ignore check passes
  const outside = R.runPreflight(makeTarget('pf-outside', { kit: 'current' }), { pluginRoot: makeCache('pf-outside', 'chromium'), run: fakeGit({ inside: false, ignored: false }).run });
  assert.equal(outside.ok, true, outside.lines.join('\n'));
  assert.ok(outside.lines.some((l) => l.startsWith('PREFLIGHT sessions: ok (not inside a git work tree')));
});

// ---------------------------------------------------------------------------
// 2. The real runner, copied into cache-shaped trees (AC-20, AC-17, AC-18)
// ---------------------------------------------------------------------------

test('AC-20 end to end: ground in a cache with no Playwright exits 1 naming the resolved cache path and the one command', () => {
  const cache = makeCache('e2e-ground', null);
  const root = makeTarget('e2e-ground');
  const g = qa(cache, groundArgs(root), root);
  assert.equal(g.status, 1, describe(g));
  assert.ok(g.stderr.startsWith('FAILED_PLAYWRIGHT_UNAVAILABLE:'), describe(g));
  assert.ok(low(g.stderr).includes(low(visualOf(cache))), `ground must name the resolved cache path\n${describe(g)}`);
  assert.ok(hasCommand(g.stderr, cache), `ground must name the one command\n${describe(g)}`);
  assert.ok(!g.stderr.includes('plugins/relay/scripts/visual'), 'no text may name the repository path');
});

test('AC-20 end to end: run in a cache with no Playwright exits 1, prints the path and command on stderr, and persists a path-free reason', () => {
  const cache = makeCache('e2e-run', null);
  const root = makeTarget('e2e-run');
  writeBrowserCase(root);
  const r = qa(cache, ['run', '--root', root, '--feature', 'f', '--run-dir', RUN_REL], root);
  assert.equal(r.status, 1, `run must exit 1 when Playwright is unavailable\n${describe(r)}`);
  assert.ok(r.stderr.includes('FAILED_PLAYWRIGHT_UNAVAILABLE'), describe(r));
  assert.ok(low(r.stderr).includes(low(visualOf(cache))) && hasCommand(r.stderr, cache), `run must print the path and the command\n${describe(r)}`);
  const raw = readFileSync(join(root, ...RUN_REL.split('/'), 'results.json'), 'utf8');
  const doc = JSON.parse(raw);
  assert.deepEqual([doc.cases[0].outcome, doc.cases[0].reason_code], ['blocked', 'FAILED_PLAYWRIGHT_UNAVAILABLE'], raw);
  assert.ok(doc.cases[0].reason.length > 0, 'the persisted case keeps a reason');
  assert.ok(!low(raw).includes(low(visualOf(cache))), 'results.json must not carry the cache path');
  assert.ok(!low(raw).includes(low(fw(homedir()))) && !low(raw).includes(low(fw(SANDBOX))), 'results.json must not carry the home directory');
  assert.ok(!raw.includes('npm --prefix') && !raw.includes('plugins/relay/scripts/visual'), 'results.json carries neither the command nor the repository path');
  assert.deepEqual(validateResults(doc), []);
});

test('AC-20 end to end: a Chromium that cannot start blocks the case with a fixed reason that carries no path', () => {
  const cache = makeCache('e2e-launch', 'launch-fails');
  const root = makeTarget('e2e-launch');
  writeBrowserCase(root);
  const r = qa(cache, ['run', '--root', root, '--feature', 'f', '--run-dir', RUN_REL], root);
  const raw = readFileSync(join(root, ...RUN_REL.split('/'), 'results.json'), 'utf8');
  const doc = JSON.parse(raw);
  assert.deepEqual([doc.cases[0].outcome, doc.cases[0].reason_code], ['blocked', 'FAILED_BROWSER_UNAVAILABLE'], `${raw}\n${describe(r)}`);
  assert.ok(!low(raw).includes(low(visualOf(cache))) && !raw.includes('npm --prefix') && !low(raw).includes(low(fw(SANDBOX))), 'the persisted reason carries no path and no command');
  assert.ok(!raw.includes('cannot start'), 'the launch error text is not copied into results.json');
});

test('AC-17 end to end: ground reports a stale kit script by name with the refresh line, and a current script keeps the old SESSION_UNAVAILABLE halt', () => {
  const cache = makeCache('e2e-stale', 'chromium');
  const stale = makeTarget('e2e-stale', { kit: 'stale' });
  const s = qa(cache, groundArgs(stale, 'admin'), stale);
  assert.equal(s.status, 1, describe(s));
  assert.ok(s.stderr.startsWith('FAILED_KIT_SCRIPT_STALE:'), describe(s));
  assert.ok(s.stderr.includes('/relay-auth-scripts --role admin --refresh') && s.stderr.includes(`auth-login/0 vs ${STAMP}`), describe(s));
  assert.ok(!s.stderr.includes('SESSION_UNAVAILABLE'), `the stale code must replace SESSION_UNAVAILABLE\n${describe(s)}`);
  const current = makeTarget('e2e-current', { kit: 'current' });
  const c = qa(cache, groundArgs(current, 'admin'), current);
  assert.equal(c.status, 1, describe(c));
  assert.ok(c.stderr.startsWith('SESSION_UNAVAILABLE:') && !c.stderr.includes('FAILED_KIT_SCRIPT_STALE:'), `a current script keeps the old halt\n${describe(c)}`);
});

test('AC-18 end to end: preflight usage, argument errors and the halt of a cache with no Playwright', () => {
  const cache = makeCache('e2e-pf-usage', null);
  const root = makeTarget('e2e-pf-usage');
  const none = qa(cache, ['preflight'], root);
  assert.equal(none.status, 2, describe(none));
  assert.ok(none.stderr.includes('qa-run.mjs preflight --root <dir>'), describe(none));
  const extra = qa(cache, ['preflight', '--root', root, '--feature', 'f'], root);
  assert.equal(extra.status, 2, describe(extra));
  const missingDir = qa(cache, ['preflight', '--root', join(root, 'does-not-exist')], root);
  assert.equal(missingDir.status, 2, describe(missingDir));
  const help = qa(cache, ['--help'], root);
  assert.equal(help.status, 0, describe(help));
  assert.ok(help.stdout.includes('  qa-run.mjs preflight --root <dir>'), describe(help));
  const p = qa(cache, ['preflight', '--root', root], root);
  assert.equal(p.status, 1, describe(p));
  assert.ok(p.stdout.includes('PREFLIGHT FAILED_PLAYWRIGHT_UNAVAILABLE:') && low(p.stdout).includes(low(visualOf(cache))) && hasCommand(p.stdout, cache), describe(p));
  assert.ok(p.stdout.includes('PREFLIGHT chromium: skipped'), describe(p));
  assert.ok(p.stdout.trimEnd().endsWith('PREFLIGHT: FAILED (1 check(s))'), describe(p));
});

test('AC-18 end to end: preflight exit code and lines for a missing Chromium, a stale script, an exposed session directory and a fully ready tree', () => {
  const missing = makeCache('e2e-pf-missing', 'missing');
  const plain = makeTarget('e2e-pf-missing');
  const p2 = qa(missing, ['preflight', '--root', plain], plain);
  assert.equal(p2.status, 1, describe(p2));
  assert.ok(/PREFLIGHT playwright: ok .*node_modules\/playwright \(version 9\.9\.9\)/i.test(p2.stdout), describe(p2));
  assert.ok(p2.stdout.includes('PREFLIGHT FAILED_BROWSER_UNAVAILABLE:') && hasCommand(p2.stdout, missing), describe(p2));

  const ready = makeCache('e2e-pf-ready', 'chromium');
  const okRoot = makeTarget('e2e-pf-ok', { kit: 'current' });
  const p3 = qa(ready, ['preflight', '--root', okRoot], okRoot);
  assert.equal(p3.status, 0, describe(p3));
  assert.ok(p3.stdout.includes('PREFLIGHT chromium: ok') && p3.stdout.includes('PREFLIGHT kit: ok') && p3.stdout.trimEnd().endsWith('PREFLIGHT: ok'), describe(p3));

  const staleRoot = makeTarget('e2e-pf-stale', { kit: 'stale' });
  const p4 = qa(ready, ['preflight', '--root', staleRoot], staleRoot);
  assert.equal(p4.status, 1, describe(p4));
  assert.ok(p4.stdout.includes(`PREFLIGHT FAILED_KIT_SCRIPT_STALE: role admin (auth-login/0 vs ${STAMP}); run /relay-auth-scripts --role admin --refresh`), describe(p4));

  const exposed = makeTarget('e2e-pf-open', { kit: 'current', git: true });
  const p5 = qa(ready, ['preflight', '--root', exposed], exposed);
  assert.equal(p5.status, 1, describe(p5));
  assert.ok(p5.stdout.includes('PREFLIGHT FAILED_IGNORE_UNPROVEN:'), describe(p5));
  const covered = makeTarget('e2e-pf-ignored', { kit: 'current', git: true, ignore: true });
  const p6 = qa(ready, ['preflight', '--root', covered], covered);
  assert.equal(p6.status, 0, describe(p6));
  assert.ok(p6.stdout.includes('PREFLIGHT sessions: ok (PRPs/auth/.sessions/ is ignored)'), describe(p6));
});

test('AC-18 end to end: preflight writes nothing into the target, even on failure', () => {
  const cache = makeCache('e2e-pf-pure', null);
  const root = makeTarget('e2e-pf-pure', { kit: 'stale', git: true });
  const before = listTree(root).filter((l) => !l.startsWith('/.git/'));
  const p = qa(cache, ['preflight', '--root', root], root);
  assert.equal(p.status, 1, describe(p));
  assert.deepEqual(listTree(root).filter((l) => !l.startsWith('/.git/')), before, 'no file was created or changed in the target');
  assert.ok(!listTree(root).some((l) => l.includes('.sessions')), 'the session directory was not created');
});

// ---------------------------------------------------------------------------
// 3. The record staleness flag (AC-19)
// ---------------------------------------------------------------------------

/**
 * Runs a git command in a temp repository under the hermetic environment.
 * @param {string} cwd
 * @param {string[]} args
 * @param {Record<string, string>} [extra]
 */
function git(cwd, args, extra = {}) {
  const r = spawnSync('git', ['-C', cwd, '-c', 'user.name=t', '-c', 'user.email=t@example.test', ...args], { encoding: 'utf8', env: { ...CHILD_ENV, ...extra } });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r;
}
/** A git runner for the in-process helper that merges the hermetic environment into the call. */
const hermeticRun = /** @type {any} */ ((/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {any} */ opts) => spawnSync(cmd, args, { ...opts, env: { ...opts.env, ...GIT_ENV } }));

/** A repository with two cited test files that import sources in the static forms and in a dynamic form; committed in 2001. */
function makeRepo() {
  const repo = join(fresh('record'), 'repo');
  mkdirSync(join(repo, 'src'), { recursive: true });
  mkdirSync(join(repo, 'test'), { recursive: true });
  git(dirOf(repo), ['init', '-q', repo]);
  writeFileSync(join(repo, 'src', 'a.mjs'), 'export const a = 1;\n');
  writeFileSync(join(repo, 'src', 'b.cjs'), 'module.exports = 2;\n');
  writeFileSync(join(repo, 'src', 'c.mjs'), 'export const c = 3;\n');
  writeFileSync(join(repo, 'src', 'd.mjs'), 'export const d = 4;\n');
  writeFileSync(join(repo, 'test', 'a.test.mjs'), 'import { a } from "../src/a.mjs";\nimport "../src/c.mjs";\nimport fs from "node:fs";\nimport x from "./missing.mjs";\nconst later = () => import("../src/d.mjs");\n');
  writeFileSync(join(repo, 'test', 'b.test.cjs'), 'const b = require("../src/b.cjs");\n');
  git(repo, ['add', '-A']);
  const old = '2001-01-01T00:00:00Z';
  git(repo, ['commit', '-q', '-m', 'init'], { GIT_AUTHOR_DATE: old, GIT_COMMITTER_DATE: old });
  return repo;
}
/** @param {string} p */
const dirOf = (p) => resolve(p, '..');

test('AC-19: recordStaleSources lists the statically imported sources git reports changed after the record, and only those', () => {
  const repo = makeRepo();
  const tests = ['test/a.test.mjs', 'test/b.test.cjs'];
  assert.deepEqual(R.recordStaleSources(repo, tests, '2000-01-01T00:00:00.000Z', hermeticRun), ['src/a.mjs', 'src/b.cjs', 'src/c.mjs'], 'committed after the record: the static forms, not the dynamic one, not a bare module, not a missing file');
  assert.deepEqual(R.recordStaleSources(repo, tests, '2010-01-01T00:00:00.000Z', hermeticRun), [], 'a record generated after the last commit is not stale');
  assert.deepEqual(R.recordStaleSources(repo, tests, '2999-01-01T00:00:00.000Z', hermeticRun), [], 'a record from the future is never stale');
  writeFileSync(join(repo, 'src', 'a.mjs'), 'export const a = 1;\nexport const a2 = 2;\n');
  assert.deepEqual(R.recordStaleSources(repo, tests, '2010-01-01T00:00:00.000Z', hermeticRun), ['src/a.mjs'], 'an uncommitted change newer than the record is stale');
  const long = new Date(Date.parse('2005-01-01T00:00:00Z'));
  utimesSync(join(repo, 'src', 'a.mjs'), long, long);
  assert.deepEqual(R.recordStaleSources(repo, tests, '2010-01-01T00:00:00.000Z', hermeticRun), [], 'an uncommitted change older than the record is not stale');
});

test('AC-19: recordStaleSources is silent outside a git work tree, on hostile input and when git fails', () => {
  const repo = makeRepo();
  const tests = ['test/a.test.mjs', 'test/b.test.cjs'];
  assert.deepEqual(R.recordStaleSources(repo, ['../outside.test.mjs', '/etc/passwd', /** @type {any} */ (5), /** @type {any} */ (null), 'test/none.test.mjs'], '2000-01-01T00:00:00.000Z', hermeticRun), []);
  assert.deepEqual(R.recordStaleSources(repo, tests, 'not a date', hermeticRun), []);
  assert.deepEqual(R.recordStaleSources(repo, /** @type {any} */ ('x'), '2000-01-01T00:00:00.000Z', hermeticRun), []);
  assert.deepEqual(R.recordStaleSources(repo, tests, '2000-01-01T00:00:00.000Z', /** @type {any} */ (() => ({ error: new Error('no git') }))), [], 'git failing is never stale');
  const plain = join(fresh('record-plain'), 'plain');
  mkdirSync(join(plain, 'src'), { recursive: true });
  mkdirSync(join(plain, 'test'), { recursive: true });
  writeFileSync(join(plain, 'src', 'a.mjs'), 'export const a = 1;\n');
  writeFileSync(join(plain, 'test', 'a.test.mjs'), 'import { a } from "../src/a.mjs";\n');
  assert.deepEqual(R.recordStaleSources(plain, ['test/a.test.mjs'], '2000-01-01T00:00:00.000Z', hermeticRun), [], 'outside a git work tree the flag stays silent');
});

/**
 * A project whose case 1 cites test/a.test.mjs, resolved from a schema-v1 record. `git` makes it a work tree in which
 * src/a.mjs (imported by the cited test) is committed now; `generatedAt` is the record's instant.
 * @param {string} label
 * @param {{ git: boolean, generatedAt: string }} spec
 */
function recordProject(label, spec) {
  const root = join(fresh(label), 'proj');
  const rd = join(root, 'PRPs', 'reports', 'feat');
  mkdirSync(rd, { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'test'), { recursive: true });
  writeFileSync(join(root, 'src', 'a.mjs'), 'export const a = 1;\n');
  writeFileSync(join(root, 'test', 'a.test.mjs'), 'import { a } from "../src/a.mjs";\n');
  const junit = join(rd, 'junit.xml');
  const tc = (/** @type {string} */ file, /** @type {string} */ name, /** @type {boolean} */ failed) => `<testcase name="${name}" classname="suite" file="${file}" time="0.1">${failed ? '<failure type="AssertionError" message="boom"/>' : ''}</testcase>`;
  writeFileSync(junit, `<?xml version="1.0"?><testsuites>${[tc('/proj/test/a.test.mjs', 't1', false), tc('/proj/test/a.test.mjs', 't2', false), tc('/proj/test/b.test.mjs', 't3', true)].join('')}</testsuites>`);
  const generated = Date.parse(spec.generatedAt);
  const when = new Date(generated - 60000);
  utimesSync(junit, when, when);
  writeFileSync(join(rd, 'record.json'), JSON.stringify({ run_id: 'r-1', attempt: 1, tier: 'unit', framework: 'node:test', outcome: 'FAILED', duration_ms: 5, counts: { passed: 2, failed: 1, skipped: 0, total: 3 }, failures: [], artifacts: { junit_xml: junit }, generated_at: spec.generatedAt }));
  writeFileSync(join(rd, 'qa-report.md'), '# QA Report\n\n### 1 — Case 1\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** automated\n- **Automated test path:** `test/a.test.mjs`\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n');
  mkdirSync(join(root, ...REC_RUN_REL.split('/'), 'evidence'), { recursive: true });
  if (spec.git) {
    git(dirOf(root), ['init', '-q', root]);
    writeFileSync(join(root, '.gitignore'), 'PRPs/reports/\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-q', '-m', 'init']);
  }
  return root;
}
/** @param {string} root */
function runRecord(root) {
  const r = qa(makeCache('record-cache', null), ['run', '--root', root, '--feature', 'feat', '--run-dir', REC_RUN_REL], root, REAL_RUNNER);
  const results = JSON.parse(readFileSync(join(root, ...REC_RUN_REL.split('/'), 'results.json'), 'utf8'));
  return { ...r, results };
}

test('AC-19 end to end: a stale source adds a RECORD_STALE warning and a stale_sources evidence list while the outcome stays a record-resolved pass', () => {
  const stale = runRecord(recordProject('rec-stale', { git: true, generatedAt: '2000-01-01T00:00:00+00:00' }));
  assert.equal(stale.status, 0, describe(stale));
  assert.deepEqual([stale.results.cases[0].outcome, stale.results.cases[0].reason_code], ['pass', 'AUTOMATED_EVIDENCE'], 'the outcome is unchanged');
  const warning = (stale.results.warnings ?? []).find((/** @type {any} */ w) => w.code === 'RECORD_STALE');
  assert.ok(warning, `a RECORD_STALE warning is expected: ${JSON.stringify(stale.results.warnings)}`);
  assert.equal(warning.case, 1);
  assert.deepEqual(warning.files, ['src/a.mjs']);
  assert.ok(stale.stdout.includes('WARNING RECORD_STALE:'), stale.stdout);
  assert.deepEqual(validateResults(stale.results), []);
});

test('AC-19 end to end: the evidence file lists the stale files, and a record newer than every change leaves no warning and no key', () => {
  const staleRoot = recordProject('rec-evidence', { git: true, generatedAt: '2000-01-01T00:00:00+00:00' });
  const stale = runRecord(staleRoot);
  const ev = JSON.parse(readFileSync(join(staleRoot, ...stale.results.cases[0].evidence[0].split('/')), 'utf8'));
  assert.deepEqual(ev.stale_sources, ['src/a.mjs']);
  assert.equal(ev.resolved_from, 'test-runner-record', 'the existing evidence keys are kept');

  const freshRoot = recordProject('rec-fresh', { git: true, generatedAt: '2100-01-01T00:00:00+00:00' });
  const ok = runRecord(freshRoot);
  assert.deepEqual([ok.results.cases[0].outcome, ok.results.cases[0].reason_code], ['pass', 'AUTOMATED_EVIDENCE']);
  assert.ok(!(ok.results.warnings ?? []).some((/** @type {any} */ w) => w.code === 'RECORD_STALE'), 'no warning for a fresh record');
  assert.ok(!ok.stdout.includes('RECORD_STALE'), ok.stdout);
  const okEv = JSON.parse(readFileSync(join(freshRoot, ...ok.results.cases[0].evidence[0].split('/')), 'utf8'));
  assert.ok(!('stale_sources' in okEv), 'the evidence gains the key only when it finds something');
});

test('AC-19 end to end: outside a git work tree the flag stays silent and the outcome is the same record-resolved pass', () => {
  const plain = runRecord(recordProject('rec-plain', { git: false, generatedAt: '2000-01-01T00:00:00+00:00' }));
  assert.equal(plain.status, 0, describe(plain));
  assert.deepEqual([plain.results.cases[0].outcome, plain.results.cases[0].reason_code], ['pass', 'AUTOMATED_EVIDENCE']);
  assert.ok(!(plain.results.warnings ?? []).some((/** @type {any} */ w) => w.code === 'RECORD_STALE'));
  assert.ok(!plain.stdout.includes('RECORD_STALE'), plain.stdout);
});

// ---------------------------------------------------------------------------
// 4. The documents (AC-22 for these)
// ---------------------------------------------------------------------------

test('AC-22: the command doc states precondition P2b between P2 and P3, with the preflight line, the one command and the record flag', () => {
  const doc = read('plugins/relay/commands/relay-qa-run.md');
  const p2b = doc.slice(doc.indexOf('### P2b'), doc.indexOf('### P3 '));
  assert.ok(doc.indexOf('### P2 ') < doc.indexOf('### P2b') && p2b.length > 0, 'P2b must sit between P2 and P3');
  assert.ok(doc.includes('### P2b — Environment preflight'));
  assert.ok(p2b.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" preflight --root "<target_root>"'), 'the preflight line');
  assert.ok(flat(p2b).includes('npm --prefix "${CLAUDE_PLUGIN_ROOT}/scripts/visual" install'), 'the one provisioning command, plugin-root relative');
  assert.ok(!p2b.includes('plugins/relay/scripts/visual'), 'no repository path in the shipped text');
  assert.ok(/relay it and\s+never run it yourself/.test(p2b), 'the session relays the command and never runs it');
  assert.ok(p2b.includes('/relay-auth-scripts --role <role> --refresh') && p2b.includes('FAILED_IGNORE_UNPROVEN'));
  assert.ok(flat(doc).includes('keeps its outcome, but its evidence file lists those files under `stale_sources`'), 'the record-resolution bullet');
  assert.ok(doc.includes('WARNING RECORD_STALE'));
  assert.ok(doc.includes('Nothing is written before P3 passes.') && doc.includes('SESSION_UNAVAILABLE'));
  assert.ok(flat(doc).includes('a stale kit login script is reported by that same code, `FAILED_KIT_SCRIPT_STALE`'), 'the final output surface');
  assert.equal(doc.split('the runner script (').length - 1, 1, 'the pinned mode-list opener occurs once');
});

test('AC-22: the auth-scripts command doc points the roles of --role at the runner preflight without naming the QA command', () => {
  const auth = read('plugins/relay/commands/relay-auth-scripts.md');
  assert.ok(flat(auth).includes("The runner's preflight mode lists every script of the kit whose stamp line differs from the installed template's"));
  assert.ok(!auth.includes('/relay-qa-run'), 'relay-auth-scripts.md must not name /relay-qa-run');
});

test('AC-22: the usage text carries the preflight line and the knowledge base states the check, the halts and the flag', () => {
  assert.ok(R.USAGE.includes('  qa-run.mjs preflight --root <dir>\n'), 'USAGE carries the preflight line');
  assert.ok(R.USAGE.indexOf('qa-run.mjs judge') < R.USAGE.indexOf('qa-run.mjs preflight') && R.USAGE.indexOf('qa-run.mjs preflight') < R.USAGE.indexOf('qa-run.mjs --help'));
  const api = read('docs/api-reference.md').split('\n');
  const row = api.filter((l) => l.startsWith('| `qa-run.mjs` '));
  assert.equal(row.length, 1);
  const usageAt = row[0].indexOf('`USAGE`', row[0].indexOf('`REASON_CATALOGUE`'));
  for (const name of ['describePlaywright', 'playwrightUnavailableText', 'staleKitRoles', 'recordStaleSources', 'runPreflight', 'PREFLIGHT_SESSION_PROBES']) {
    assert.ok(Object.hasOwn(R, name), `${name} is named in the API reference but is not an export`);
    assert.ok(row[0].indexOf(`\`${name}\``) > usageAt, `${name} must be named after USAGE in the qa-run.mjs row`);
  }
  assert.ok(row[0].includes('`ground`, `judge` and `preflight`'));
  const qaRun = api.find((l) => l.startsWith('| `/relay-qa-run '));
  assert.ok(qaRun && qaRun.includes('`qa-run.mjs preflight`') && qaRun.includes('FAILED_PLAYWRIGHT_UNAVAILABLE') && qaRun.includes('FAILED_KIT_SCRIPT_STALE') && qaRun.includes('`RECORD_STALE`'));
  const glossary = flat(read('docs/domain/glossary.md'));
  assert.ok(glossary.includes('The preflight of `/relay-qa-run` is a read-only mode of `qa-run.mjs` that checks the environment before a run starts, with no network request'));
  const flows = flat(read('docs/domain/flows.md'));
  assert.ok(flows.includes('Before `init`, the `preflight` mode checks the environment without a network request'));
  assert.ok(flows.includes('adds a `RECORD_STALE` warning to the results'));
});

test('AC-22: the integrations note names the provisioning command and states that the runner never downloads', () => {
  const integrations = flat(read('docs/context/integrations.md'));
  assert.ok(integrations.includes('**Also used by:** `qa-run.mjs`'));
  assert.ok(integrations.includes('npm --prefix "${CLAUDE_PLUGIN_ROOT}/scripts/visual" install'));
  assert.ok(integrations.includes('The runner never downloads anything itself.'));
});

test('AC-22: both site pages carry one Environment preflight row, the usage block lists the preflight line, and the changelog has the Unreleased entry', () => {
  const count = (/** @type {string} */ text, /** @type {string} */ needle) => text.split(needle).length - 1;
  const cmdText = read('documentation/reference/commands.html');
  const scrText = read('documentation/reference/scripts.html');
  assert.equal(count(cmdText, '<dt>Environment preflight</dt>'), 1);
  assert.equal(count(scrText, '<dt>Environment preflight</dt>'), 1);
  const cmd = cmdText.split('\n');
  const scr = scrText.split('\n');
  const cmdAt = cmd.findIndex((l) => l.includes('<dt>Environment preflight</dt>'));
  const scrAt = scr.findIndex((l) => l.includes('<dt>Environment preflight</dt>'));
  assert.ok(cmd[cmdAt + 1].trimStart().startsWith('<dd>') && cmd[cmdAt + 1].trimEnd().endsWith('</dd>'), 'a one-line dd on the commands page');
  assert.ok(scr[scrAt + 1].trimStart().startsWith('<dd>') && scr[scrAt + 1].trimEnd().endsWith('</dd>'), 'a one-line dd on the scripts page');
  assert.ok(cmd[cmdAt + 1].includes('<code>RECORD_STALE</code>') && cmd[cmdAt + 1].includes('<code>FAILED_KIT_SCRIPT_STALE</code>'));
  for (const name of ['describePlaywright', 'playwrightUnavailableText', 'recordStaleSources']) {
    assert.ok(Object.hasOwn(R, name) && scr[scrAt + 1].includes(`<code>${name}</code>`), name);
  }
  assert.ok(scrText.includes('qa-run.mjs preflight --root &lt;dir&gt;</code></pre>'), 'the usage block ends with the preflight line');
  const log = read('documentation/changelog.html');
  const at = log.indexOf('<strong>Self-checking environment</strong>');
  assert.ok(at > 0, 'the changelog entry exists');
  assert.ok(log.indexOf('id="v0-46-0"') > at, 'the entry sits in Unreleased, above the 0.46.0 release');
  assert.ok(log.indexOf('<strong>Local channel sources</strong>') < at, 'the previous entry stays above the new one');
  const entry = log.slice(at, log.indexOf('</li>', at));
  assert.ok(entry.includes('<code>qa-run.mjs preflight</code>') && entry.includes('<code>RECORD_STALE</code>'));
});
