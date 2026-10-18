// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-5 Run evidence is ignored and the ignore is proven (init writes the run directory .gitignore through the single write helper, git check-ignore -q exits 0 for each evidence kind, an unproven ignore halts FAILED_IGNORE_UNPROVEN before anything is written)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (the ignore proof runs after the local-only guard in every mode and adds no request site)
/**
 * Phase 3 (redaction precision and run-evidence privacy), privacy half, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-3-redaction-precision-and-run-evidence-privacy.plan.md
 *
 * A DOCUMENTED NARROWING of the PRD wording, pinned here as the plan decided it and flagged for the operator to
 * review: AC-5 says the proof failing halts `init` and `ground`. The plan halts only when git is present AND the
 * run directory is inside a work tree; outside a work tree (or with git absent) nothing there can be committed,
 * the proof is recorded `not-applicable` and nothing halts, so every run directory outside a work tree behaves as
 * before. It also extends the halt to `run`, the mode that takes the screenshots.
 *
 * Layers, all against the REAL runner (never edited):
 *   1. The ignore rules and probes, and the proof with an injected process runner: call shape, exit-code meaning,
 *      environment scrubbing, and when the ignore file is written (no git involved).
 *   2. The same functions against real git in a hermetic fixture repository.
 *   3. The runner as an ASYNC child process: init, ground and run in a work tree and outside one, a tampered and a
 *      missing ignore file, a non-local target with a tampered ignore (the guard comes first), and a copy of the
 *      runner without the run-mode proof as the control that proves the halt is what stopped the run.
 *
 * The ground tests name an undeclared role so the run ends in a ROLE_UNDECLARED halt right after the proof:
 * nothing launches a browser. Run directories live under a fresh sandbox; every git call, in this process and in
 * the child, carries a hermetic environment (core.fsmonitor=false so no daemon is started, an empty global
 * config, no global ignore file, discovery stopped at the sandbox's parent) and the sandbox is removed afterwards.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, copyFileSync, realpathSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

import { proveRunIgnored, ensureRunIgnore, RUN_IGNORE_RULES, RUN_IGNORE_PROBES } from '../../../plugins/relay/scripts/qa-run.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const REAL_SOURCE = readFileSync(REAL_RUNNER, 'utf8').replace(/\r\n/g, '\n');
const FEATURE = 'feat';
const BASE = `PRPs/reports/${FEATURE}/qa-run`;
const SLOW = { timeout: 170000 };
const TAMPERED = '# nothing is ignored here\n';
const RULES_TEXT = `${RUN_IGNORE_RULES.join('\n')}\n`;

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-privacy-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** An environment under which git reads no host configuration, no global ignore file and never climbs above the sandbox's parent. */
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The real process runner with the hermetic git environment merged in (the runner under test calls it as `run`). */
const hermeticRun = (/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {any} */ opts) =>
  spawnSync(cmd, args, { ...opts, env: { ...opts.env, ...GIT_ENV } });

/**
 * @param {string[]} args
 * @param {string} cwd
 */
function git(args, cwd) {
  return spawnSync('git', args, { cwd, env: { ...process.env, ...GIT_ENV }, encoding: 'utf8', windowsHide: true });
}

let counter = 0;
/** @returns {string} a fresh git work tree inside the sandbox */
function freshRepo() {
  const dir = join(SANDBOX, `repo-${++counter}`);
  mkdirSync(dir, { recursive: true });
  const r = git(['init', '-q'], dir);
  assert.equal(r.status, 0, `git init failed: ${r.stderr}`);
  return dir;
}

/** @returns {string} a fresh directory inside the sandbox that is not inside any work tree */
function plainDir() {
  const dir = join(SANDBOX, `plain-${++counter}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** @param {string} root @param {string} rel @returns {string} */
function mkdirp(root, rel) {
  const dir = join(root, ...rel.split('/'));
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** @param {string} dir @returns {string[]} */
const listDir = (dir) => readdirSync(dir).sort();

/** @param {string} dir @param {string} rel @returns {number | null} the exit status of `git check-ignore -q` */
function checkIgnore(dir, rel) {
  return git(['-C', dir, 'check-ignore', '-q', '--', rel], dir).status;
}

/** @param {string[]} titles */
function reportText(titles) {
  const blocks = titles.map((title, i) =>
    [`### Case ${i + 1}`, `**Title:** ${title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the page.', '2. Check the result.', ''].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/**
 * The project files every mode reads: the declared target and the one-case report.
 * @param {string} root
 * @param {string} [baseUrl]
 * @returns {string} root
 */
function project(root, baseUrl = 'http://127.0.0.1:1') {
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), reportText(['Health']));
  return root;
}

const HEALTH_PLAN = {
  schema_version: 1,
  cases: [{ index: 1, title: 'Health', driver: 'http', role: null, state: 'none', steps: [{ action: 'request', method: 'GET', path: '/ok', expect_status: 200 }] }],
};
const DECLINED_PLAN = { schema_version: 1, cases: [{ index: 1, title: 'Health', class: 'human-by-nature', reason_code: 'VISUAL_JUDGEMENT' }] };

/**
 * A run directory under the project, optionally with a plan and a .gitignore.
 * @param {string} root
 * @param {string} name
 * @param {{ gitignore?: string, plan?: any }} [o]
 * @returns {{ rel: string, abs: string }}
 */
function runDirIn(root, name, o = {}) {
  const rel = `${BASE}/${name}`;
  const abs = mkdirp(root, rel);
  if (o.gitignore !== undefined) writeFileSync(join(abs, '.gitignore'), o.gitignore);
  if (o.plan !== undefined) writeFileSync(join(abs, 'plan.json'), JSON.stringify(o.plan));
  return { rel, abs };
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @param {string} [script]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runNode(args, cwd, script = REAL_RUNNER) {
  return new Promise((resolveP, rejectP) => {
    // NODE_PATH lets a copied runner resolve Playwright from the repository node_modules, as the other copy tests do.
    const env = { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES };
    const child = spawn(NODE, [script, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const timer = setTimeout(() => child.kill(), 150000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stdout, stderr });
    });
  });
}

/** @param {string} root @param {string} rel @param {...string} extra */
const groundArgs = (root, rel, ...extra) => ['ground', '--root', root, '--feature', FEATURE, '--run-dir', rel, '--route', '/x', ...extra];
/** @param {string} root @param {string} rel */
const runArgs = (root, rel) => ['run', '--root', root, '--feature', FEATURE, '--run-dir', rel];
/** @param {string} root */
const initArgs = (root) => ['init', '--root', root, '--feature', FEATURE];

/**
 * A copy of the runner (optionally mutated by anchored replacements) and the guard in a temp plugin tree.
 * @param {[string, string][]} mutations
 * @returns {string} the copied script path
 */
function pluginCopy(mutations) {
  const dir = mkdtempSync(join(SANDBOX, 'plugin-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  let src = REAL_SOURCE;
  for (const [from, to] of mutations) {
    const n = src.split(from).length - 1;
    assert.equal(n, 1, `mutation anchor must occur exactly once, found ${n}: ${from.slice(0, 70)}`);
    src = src.replace(from, () => to);
  }
  const script = join(dir, 'scripts', 'qa-run.mjs');
  writeFileSync(script, src);
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return script;
}

/**
 * A fake process runner standing for git: `inside` answers the work-tree question, `status` the per-probe exit.
 * @param {{ inside?: number | 'error' | 'false', status?: (probe: string) => number | { error: Error } }} [o]
 */
function fakeGit(o = {}) {
  const inside = o.inside ?? 0;
  /** @type {{ cmd: string, args: string[], opts: any }[]} */ const calls = [];
  const run = (/** @type {string} */ cmd, /** @type {string[]} */ args, /** @type {any} */ opts) => {
    calls.push({ cmd, args: [...args], opts });
    if (args.includes('rev-parse')) {
      if (inside === 'error') return { error: new Error('spawn git ENOENT'), status: null, stdout: '' };
      if (inside === 'false') return { status: 0, stdout: 'false\n' };
      return { status: inside, stdout: inside === 0 ? 'true\n' : '' };
    }
    const verdict = o.status ? o.status(args[args.length - 1]) : 0;
    return typeof verdict === 'number' ? { status: verdict, stdout: '' } : { error: verdict.error, status: null, stdout: '' };
  };
  return { run, calls };
}

// ---------------------------------------------------------------------------
// 1. The rules, the probes and the proof with an injected process runner
// ---------------------------------------------------------------------------

test('AC-5 the ignore rules cover grounding/ and evidence/ and never name or re-include the tracked side; the probes name one path per kind of file the runner writes', () => {
  for (const rule of ['grounding/', 'evidence/']) assert.ok(RUN_IGNORE_RULES.includes(rule), `the rules lack ${rule}`);
  for (const rule of RUN_IGNORE_RULES) {
    assert.equal(rule.startsWith('!'), false, `a re-include: ${rule}`);
    assert.equal(['*', '/*'].includes(rule), false, `a blanket rule: ${rule}`);
    for (const tracked of ['results.json', 'plan.json', '.gitignore']) assert.equal(rule.includes(tracked), false, `${rule} hides ${tracked}`);
  }
  assert.equal(Object.isFrozen(RUN_IGNORE_RULES), true, 'the rules must not be widenable at run time');
  assert.equal(Object.isFrozen(RUN_IGNORE_PROBES), true, 'the probes must not be narrowable at run time');
  for (const probe of RUN_IGNORE_PROBES) {
    assert.equal(isAbsolute(probe), false, `${probe} is absolute`);
    assert.ok(RUN_IGNORE_RULES.some((r) => probe.startsWith(r)), `${probe} is not under an ignored directory`);
  }
  for (const kind of ['.png', '.txt', '.snapshot.json']) assert.ok(RUN_IGNORE_PROBES.some((p) => p.endsWith(kind)), `no probe of the kind ${kind}`);
  assert.ok(RUN_IGNORE_PROBES.some((p) => p.startsWith('evidence/') && p.endsWith('.json') && !p.endsWith('.snapshot.json')), 'no probe of an evidence body');
});

test('AC-5 proveRunIgnored asks git for the work tree, then makes one quiet check-ignore call per probe, each relative to the run directory and rooted at it', () => {
  const D = join(SANDBOX, 'fake-run-dir');
  const { run, calls } = fakeGit();
  const proof = proveRunIgnored(D, run);
  assert.deepEqual(proof, { status: 'proven', unproven: [] });
  assert.equal(calls.length, 1 + RUN_IGNORE_PROBES.length);
  for (const c of calls) {
    assert.equal(c.cmd, 'git');
    assert.equal(c.args[0], '-C', 'every git call must be rooted at the run directory, never at the working directory');
    assert.equal(c.args[1], D);
  }
  assert.ok(calls[0].args.includes('rev-parse') && calls[0].args.includes('--is-inside-work-tree'));
  const probed = [];
  for (const c of calls.slice(1)) {
    assert.ok(c.args.includes('check-ignore') && c.args.includes('-q'), JSON.stringify(c.args));
    assert.equal(c.args[c.args.length - 2], '--', 'a probe follows the -- separator');
    const probe = c.args[c.args.length - 1];
    assert.equal(isAbsolute(probe), false, `${probe} must be relative`);
    probed.push(probe);
  }
  assert.deepEqual([...probed].sort(), [...RUN_IGNORE_PROBES].sort(), 'every probe exactly once');
});

test('AC-5 proveRunIgnored: exit 1 is not ignored and exit 128 or a spawn error is a git failure, and none of them counts as ignored', () => {
  const D = join(SANDBOX, 'fake-run-dir');
  const one = RUN_IGNORE_PROBES[1];
  const notIgnored = proveRunIgnored(D, fakeGit({ status: (p) => (p === one ? 1 : 0) }).run);
  assert.deepEqual(notIgnored, { status: 'unproven', unproven: [one] });
  const fatal = proveRunIgnored(D, fakeGit({ status: () => 128 }).run);
  assert.equal(fatal.status, 'unproven');
  assert.deepEqual([...fatal.unproven].sort(), [...RUN_IGNORE_PROBES].sort(), 'a git error on every probe is unproven, never ignored');
  const errored = proveRunIgnored(D, fakeGit({ status: (p) => (p === one ? { error: new Error('ETIMEDOUT') } : 0) }).run);
  assert.deepEqual(errored, { status: 'unproven', unproven: [one] });
});

test('AC-5 proveRunIgnored outside a work tree (exit 128, an answer other than true, or git absent) is not-applicable after a single call', () => {
  const D = join(SANDBOX, 'fake-run-dir');
  for (const inside of /** @type {const} */ ([128, 'false', 'error'])) {
    const { run, calls } = fakeGit({ inside });
    assert.deepEqual(proveRunIgnored(D, run), { status: 'not-applicable', unproven: [] }, String(inside));
    assert.equal(calls.length, 1, `no check-ignore call may follow a negative work-tree answer (${inside})`);
  }
});

test('AC-5 the proof cannot be redirected: GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, GIT_PREFIX and GIT_COMMON_DIR are not passed to any git call, the rest of the environment is', () => {
  const names = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR'];
  /** @type {Record<string, string | undefined>} */ const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  for (const n of names) process.env[n] = join(SANDBOX, 'elsewhere');
  process.env.RELAY_QA_PROBE_MARKER = 'kept';
  try {
    const { run, calls } = fakeGit();
    proveRunIgnored(join(SANDBOX, 'fake-run-dir'), run);
    assert.ok(calls.length > 1);
    for (const c of calls) {
      for (const n of names) assert.equal(Object.hasOwn(c.opts.env, n), false, `${n} reached a git call`);
      assert.equal(c.opts.env.RELAY_QA_PROBE_MARKER, 'kept', 'the rest of the environment must still be passed on');
    }
  } finally {
    for (const n of names) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
    delete process.env.RELAY_QA_PROBE_MARKER;
  }
});

test('AC-5 ensureRunIgnore writes the ignore file only inside a work tree or for init, lists exactly the rules, and never overwrites an existing file', () => {
  const mk = (/** @type {string} */ name) => mkdirp(SANDBOX, `ensure-${name}`);

  const inside = mk('inside');
  assert.deepEqual(ensureRunIgnore(inside, { run: fakeGit().run }), { status: 'proven', unproven: [] });
  const text = readFileSync(join(inside, '.gitignore'), 'utf8');
  assert.equal(text.includes('\r'), false, 'the file must use LF line endings');
  assert.equal(text.endsWith('\n'), true);
  assert.deepEqual(
    text.split('\n').filter((l) => l !== '' && !l.startsWith('#')),
    [...RUN_IGNORE_RULES],
    'the file lists exactly the exported rules',
  );
  assert.ok(text.split('\n').some((l) => l.startsWith('#')), 'the file says what it is');

  const outside = mk('outside');
  assert.deepEqual(ensureRunIgnore(outside, { run: fakeGit({ inside: 128 }).run }), { status: 'not-applicable', unproven: [] });
  assert.deepEqual(listDir(outside), [], 'ground and run write nothing outside a work tree');

  const initOutside = mk('init-outside');
  assert.deepEqual(ensureRunIgnore(initOutside, { run: fakeGit({ inside: 128 }).run, alwaysWrite: true }), { status: 'not-applicable', unproven: [] });
  assert.deepEqual(listDir(initOutside), ['.gitignore'], 'init always writes the file, because it is the run directory creator');

  const edited = mk('edited');
  writeFileSync(join(edited, '.gitignore'), TAMPERED);
  const judged = ensureRunIgnore(edited, { run: fakeGit({ status: () => 1 }).run, alwaysWrite: true });
  assert.equal(judged.status, 'unproven');
  assert.equal(judged.unproven.length, RUN_IGNORE_PROBES.length);
  assert.equal(readFileSync(join(edited, '.gitignore'), 'utf8'), TAMPERED, 'an operator edit was overwritten');
});

// ---------------------------------------------------------------------------
// 2. Real git
// ---------------------------------------------------------------------------

test('AC-5 real git: a run directory without an ignore file is repaired and proven; git ignores a path of each evidence kind and not results.json, plan.json or the ignore file', () => {
  const repo = freshRepo();
  const dir = mkdirp(repo, `${BASE}/r1`);
  assert.deepEqual(ensureRunIgnore(dir, { run: hermeticRun }), { status: 'proven', unproven: [] });
  assert.deepEqual(proveRunIgnored(dir, hermeticRun), { status: 'proven', unproven: [] });
  const rules = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
  for (const rule of RUN_IGNORE_RULES) assert.ok(rules.includes(rule), `the written file lacks ${rule}`);
  for (const rel of ['grounding/anonymous--perfil.snapshot.json', 'evidence/case-1.png', 'evidence/case-1.txt', 'evidence/case-1.http.json', 'evidence/case-1.query-2.json']) {
    assert.equal(checkIgnore(dir, rel), 0, `${rel} is not ignored`);
  }
  for (const rel of ['results.json', 'plan.json', '.gitignore']) assert.equal(checkIgnore(dir, rel), 1, `${rel} must stay tracked`);
});

test('AC-5 real git: an ignore file without the rules is unproven on every probe and is left exactly as the operator wrote it', () => {
  const repo = freshRepo();
  const dir = mkdirp(repo, `${BASE}/r2`);
  writeFileSync(join(dir, '.gitignore'), TAMPERED);
  const proof = ensureRunIgnore(dir, { run: hermeticRun, alwaysWrite: true });
  assert.equal(proof.status, 'unproven');
  assert.deepEqual([...proof.unproven].sort(), [...RUN_IGNORE_PROBES].sort());
  assert.equal(readFileSync(join(dir, '.gitignore'), 'utf8'), TAMPERED);
  assert.equal(proveRunIgnored(dir, hermeticRun).status, 'unproven');
});

test('AC-5 real git: outside a work tree the proof is not-applicable, ground and run write nothing there and init writes only the ignore file', () => {
  const dir = mkdirp(plainDir(), `${BASE}/r3`);
  assert.deepEqual(proveRunIgnored(dir, hermeticRun), { status: 'not-applicable', unproven: [] });
  assert.deepEqual(ensureRunIgnore(dir, { run: hermeticRun }), { status: 'not-applicable', unproven: [] });
  assert.deepEqual(listDir(dir), []);
  assert.deepEqual(ensureRunIgnore(dir, { run: hermeticRun, alwaysWrite: true }), { status: 'not-applicable', unproven: [] });
  assert.deepEqual(listDir(dir), ['.gitignore']);
});

// ---------------------------------------------------------------------------
// 3. The runner as a child process
// ---------------------------------------------------------------------------

/** @type {import('node:http').Server} */
let server;
let origin = '';
let hits = 0;

before(async () => {
  server = createServer((req, res) => {
    hits++;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  origin = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

test('AC-5 init in a git work tree writes the run directory ignore file, proves it and prints the three unchanged lines then IGNORE_PROOF: proven; git lists the tracked side only', SLOW, async () => {
  const repo = project(freshRepo());
  const r = await runNode(initArgs(repo), repo);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  const lines = r.stdout.trim().split(/\r?\n/);
  assert.equal(lines.length, 4, r.stdout);
  assert.match(lines[0], /^RUN_ID: \d{8}T\d{9}Z$/);
  assert.match(lines[1], /^RUN_DIR: PRPs\/reports\/feat\/qa-run\/\d{8}T\d{9}Z$/);
  assert.equal(lines[2], 'BASE_URL_ORIGIN: http://127.0.0.1:1');
  assert.equal(lines[3], 'IGNORE_PROOF: proven');
  const runRel = lines[1].slice('RUN_DIR: '.length);
  const runAbs = join(repo, ...runRel.split('/'));
  assert.deepEqual(listDir(runAbs), ['.gitignore', 'evidence']);
  assert.deepEqual(
    readFileSync(join(runAbs, '.gitignore'), 'utf8').split('\n').filter((l) => l !== '' && !l.startsWith('#')),
    [...RUN_IGNORE_RULES],
  );

  // What the runner writes later: one file of each kind, and the tracked side.
  mkdirp(runAbs, 'grounding');
  for (const rel of ['grounding/anonymous--perfil.snapshot.json', 'evidence/case-1.png', 'evidence/case-1.txt', 'evidence/case-1.http.json', 'evidence/case-1.query-2.json', 'results.json', 'plan.json']) {
    writeFileSync(join(runAbs, ...rel.split('/')), '{}');
  }
  const status = git(['status', '--porcelain', '--untracked-files=all'], repo);
  assert.equal(status.status, 0, status.stderr);
  const listed = status.stdout.split(/\r?\n/).filter((l) => l !== '');
  assert.equal(listed.some((l) => /grounding\/|evidence\//.test(l)), false, `git status lists run evidence: ${status.stdout}`);
  for (const tracked of ['results.json', 'plan.json', '.gitignore']) {
    assert.ok(listed.some((l) => l.endsWith(`${runRel}/${tracked}`)), `the tracked side must stay visible (${tracked}): ${status.stdout}`);
  }
  for (const rel of ['grounding/anonymous--perfil.snapshot.json', 'evidence/case-1.png', 'evidence/case-1.txt', 'evidence/case-1.http.json', 'evidence/case-1.query-2.json']) {
    assert.equal(checkIgnore(runAbs, rel), 0, `${rel} is not ignored`);
  }
});

test('AC-5 init outside a git work tree (the documented narrowing) exits 0, writes the ignore file and prints IGNORE_PROOF: not-applicable', SLOW, async () => {
  const root = project(plainDir());
  const r = await runNode(initArgs(root), root);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  const lines = r.stdout.trim().split(/\r?\n/);
  assert.equal(lines.length, 4, r.stdout);
  assert.equal(lines[3], 'IGNORE_PROOF: not-applicable');
  const runAbs = join(root, ...lines[1].slice('RUN_DIR: '.length).split('/'));
  assert.deepEqual(listDir(runAbs), ['.gitignore', 'evidence']);
});

test('AC-5 ground and run halt FAILED_IGNORE_UNPROVEN on a run directory whose ignore does not hold, naming the probe paths, and write no snapshot, no evidence and no results.json', SLOW, async () => {
  const repo = project(freshRepo(), origin);
  const { rel, abs } = runDirIn(repo, 'tampered', { gitignore: TAMPERED, plan: HEALTH_PLAN });
  const before = listDir(abs);
  hits = 0;

  const g = await runNode(groundArgs(repo, rel), repo);
  assert.equal(g.code, 1, `${g.stdout}\n${g.stderr}`);
  assert.ok(g.stderr.includes('FAILED_IGNORE_UNPROVEN'), g.stderr);
  for (const probe of RUN_IGNORE_PROBES) assert.ok(g.stderr.includes(probe), `the halt does not name ${probe}: ${g.stderr}`);
  assert.equal(g.stdout.includes('GROUNDED:'), false);
  assert.equal(existsSync(join(abs, 'grounding')), false, 'a snapshot directory was created');
  assert.deepEqual(listDir(abs), before, 'ground wrote into the run directory');

  const n = await runNode(runArgs(repo, rel), repo);
  assert.equal(n.code, 1, `${n.stdout}\n${n.stderr}`);
  assert.ok(n.stderr.includes('FAILED_IGNORE_UNPROVEN'), n.stderr);
  assert.equal(existsSync(join(abs, 'results.json')), false, 'a results.json was written');
  assert.equal(n.stdout.includes('HUMAN GATE STILL OPEN'), false, 'a halted run printed a summary');
  assert.deepEqual(listDir(abs), before, 'run wrote into the run directory');
  assert.equal(hits, 0, 'a case was executed before the halt');
  assert.equal(readFileSync(join(abs, '.gitignore'), 'utf8'), TAMPERED, 'the operator ignore file was overwritten');
});

test('AC-5 control: the same work-tree run directory with the rules in place, or with no ignore file at all, runs and passes; ground restores a missing file before it goes on', SLOW, async () => {
  const repo = project(freshRepo(), origin);

  const fine = runDirIn(repo, 'fine', { gitignore: RULES_TEXT, plan: HEALTH_PLAN });
  hits = 0;
  const a = await runNode(runArgs(repo, fine.rel), repo);
  assert.equal(a.code, 0, `${a.stdout}\n${a.stderr}`);
  assert.ok(existsSync(join(fine.abs, 'results.json')));
  assert.ok(hits >= 1, 'the case never reached the server');

  const missing = runDirIn(repo, 'missing', { plan: HEALTH_PLAN });
  const b = await runNode(runArgs(repo, missing.rel), repo);
  assert.equal(b.code, 0, `${b.stdout}\n${b.stderr}`);
  assert.deepEqual(
    readFileSync(join(missing.abs, '.gitignore'), 'utf8').split('\n').filter((l) => l !== '' && !l.startsWith('#')),
    [...RUN_IGNORE_RULES],
    'run did not restore the missing ignore file',
  );
  const evidence = JSON.parse(readFileSync(join(missing.abs, 'results.json'), 'utf8')).cases[0].evidence[0];
  assert.equal(checkIgnore(missing.abs, evidence.slice(`${missing.rel}/`.length)), 0, 'the evidence the run wrote is not ignored');

  const bare = runDirIn(repo, 'bare', {});
  const g = await runNode(groundArgs(repo, bare.rel, '--role', 'ghost'), repo);
  assert.equal(g.code, 1, `${g.stdout}\n${g.stderr}`);
  assert.equal(g.stderr.includes('FAILED_IGNORE_UNPROVEN'), false, g.stderr);
  assert.ok(g.stderr.includes('ROLE_UNDECLARED'), `ground did not get past the proof: ${g.stderr}`);
  assert.equal(proveRunIgnored(bare.abs, hermeticRun).status, 'proven', 'ground did not restore the missing ignore file');
});

test('AC-5 outside a work tree ground and run neither halt nor write an ignore file, even when the process working directory is itself a git work tree', SLOW, async () => {
  const cwd = freshRepo();
  const root = project(plainDir());
  const { rel, abs } = runDirIn(root, 'manual', { plan: DECLINED_PLAN });

  const n = await runNode(runArgs(root, rel), cwd);
  assert.equal(n.code, 0, `${n.stdout}\n${n.stderr}`);
  assert.ok(existsSync(join(abs, 'results.json')), 'run outside a work tree must still write results.json');
  assert.equal(existsSync(join(abs, '.gitignore')), false, 'the detection followed the working directory instead of the run directory');

  const g = await runNode(groundArgs(root, rel, '--role', 'ghost'), cwd);
  assert.equal(g.code, 1, `${g.stdout}\n${g.stderr}`);
  assert.equal(g.stderr.includes('FAILED_IGNORE_UNPROVEN'), false, g.stderr);
  assert.ok(g.stderr.includes('ROLE_UNDECLARED'), `ground did not get past the proof: ${g.stderr}`);
  assert.equal(existsSync(join(abs, '.gitignore')), false);
  assert.deepEqual(listDir(abs), ['plan.json', 'results.json']);
});

test('AC-15 the proof runs after the local-only guard: a non-local target halts FAILED_NON_LOCAL_TARGET in ground, run and init even when the ignore is tampered, and nothing changes', SLOW, async () => {
  const repo = project(freshRepo(), 'http://example.com');
  const { rel, abs } = runDirIn(repo, 'tampered', { gitignore: TAMPERED, plan: DECLINED_PLAN });
  const before = listDir(abs);
  const runsBefore = listDir(join(repo, ...BASE.split('/')));
  for (const [mode, args] of /** @type {[string, string[]][]} */ ([
    ['ground', groundArgs(repo, rel)],
    ['run', runArgs(repo, rel)],
    ['init', initArgs(repo)],
  ])) {
    const r = await runNode(args, repo);
    assert.equal(r.code, 1, `${mode}: ${r.stdout}\n${r.stderr}`);
    assert.ok(r.stderr.includes('FAILED_NON_LOCAL_TARGET'), `${mode}: ${r.stderr}`);
    assert.equal(r.stderr.includes('FAILED_IGNORE_UNPROVEN'), false, `${mode}: the proof ran before the guard`);
  }
  assert.deepEqual(listDir(abs), before);
  assert.deepEqual(listDir(join(repo, ...BASE.split('/'))), runsBefore, 'a refused init created a run directory');
  assert.equal(readFileSync(join(abs, '.gitignore'), 'utf8'), TAMPERED);
});

test('AC-5 sensitivity: with the run-mode proof removed from a copy of the runner the tampered run directory is run and results.json is written; the unmutated copy halts', SLOW, async () => {
  const anchor = '  requireRunIgnore(runDirAbs);\n\n  /** @type {Map<number, any>} */ const planByIndex = new Map();';
  const repo = project(freshRepo(), origin);
  const { rel, abs } = runDirIn(repo, 'tampered', { gitignore: TAMPERED, plan: HEALTH_PLAN });

  hits = 0;
  const control = await runNode(runArgs(repo, rel), repo, pluginCopy([]));
  assert.equal(control.code, 1, `${control.stdout}\n${control.stderr}`);
  assert.ok(control.stderr.includes('FAILED_IGNORE_UNPROVEN'), 'a copy holding only the runner and the guard must still prove the ignore');
  assert.equal(existsSync(join(abs, 'results.json')), false);
  assert.equal(hits, 0);

  const mutated = pluginCopy([[anchor, '\n\n  /** @type {Map<number, any>} */ const planByIndex = new Map();']]);
  const r = await runNode(runArgs(repo, rel), repo, mutated);
  assert.equal(r.code, 0, `${r.stdout}\n${r.stderr}`);
  assert.ok(existsSync(join(abs, 'results.json')), 'without the proof the run must have gone on and written its results');
  assert.ok(hits >= 1, 'without the proof the case must have reached the server');
});
