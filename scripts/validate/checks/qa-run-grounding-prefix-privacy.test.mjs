// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-5 Run evidence is ignored and the ignore is proven (a snapshot written after a replayed prefix is under the proven ignored grounding/ directory, and an unproven ignore stops ground before the first interaction)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-11 Grounding after an interaction (a typed value is recorded only as a SHA-256 digest; a prefix locator that names a withheld value is refused before the browser starts)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the QA report is byte-identical before and after every run)
/**
 * Phase 5 (grounding after an interaction), secrecy and privacy of the replay, of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-5-grounding-after-an-interaction.plan.md
 *              (AC-A9 a typed value only as a digest, a withheld locator refused before the browser, the new file
 *              ignored by git and the ignore proven before anything is written)
 *
 * The runner is driven as an ASYNC child process (a copy of it with the real guard in a temp plugin tree, never
 * edited) against a loopback application and a real Chromium.
 *
 * What the redaction policy states, and so what is pinned: the recorded `prefix` holds no typed value, only a
 * SHA-256 digest; `ground` prints the value on no terminal line and writes it to no file other than the snapshot;
 * and the snapshot's ENTRIES are page text read after the interaction, so they can echo a typed value the page
 * renders back (an entry is withheld only for a registered secret, an e-mail address or a regex: match, and a typed
 * value is not registered). The echo is pinned as permitted, and the snapshot file is NOT claimed to be free of
 * the typed value.
 *
 *   1. In a real git work tree: one fill then one click. The prefix holds the digest and no `value` key; the page's
 *      echo is among the entries; the entries that carry an e-mail address, the session value or a declared
 *      pattern are withheld; the typed value is on neither stream and in no file of the project other than the
 *      snapshot; git ignores the new file name (and a control path that is not under grounding/ is not ignored).
 *   2. In the same kind of work tree with a run directory whose ignore does not hold: ground halts
 *      FAILED_IGNORE_UNPROVEN before the replay, so no click was performed and nothing was requested; the same
 *      run directory with the rules in place performs the replay (the control twin).
 *   3. A prefix locator that names a value the redaction rules withhold (an e-mail address, the session value, a
 *      declared pattern, by name or by text) is refused before the browser starts: the application is never
 *      requested; a clean locator in the same project does start it (the control twin).
 *
 * Every run asserts that the QA report is byte-identical before and after. The sandbox is removed afterwards and
 * every server is closed; every git call carries a hermetic environment.
 *
 * QA_V2P5_RUNNER_SRC points the runner copy at another file (a mutation control); unset, the real runner is used.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const NODE_MODULES = resolve('node_modules');
const RUNNER_SRC = process.env.QA_V2P5_RUNNER_SRC ? resolve(process.env.QA_V2P5_RUNNER_SRC) : REAL_RUNNER;
const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p5-privacy-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** An environment under which git reads no host configuration and never climbs above the sandbox's parent. */
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

/** The runner and the guard, and only those two files, in a temp plugin tree. */
const COPY = (() => {
  const dir = mkdtempSync(join(SANDBOX, 'plugin-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  copyFileSync(RUNNER_SRC, join(dir, 'scripts', 'qa-run.mjs'));
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return join(dir, 'scripts', 'qa-run.mjs');
})();

/** @param {string} s */
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
/** @param {string} path */
const sha256File = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

// ---------------------------------------------------------------------------
// The loopback application
// ---------------------------------------------------------------------------

const TOKEN = 'tok-Zq83kd01-ground';
const TYPED = 'abc-typed-4417';
const EMAIL = 'ana.souza@example.com';
const PERSON = 'Maria Souza';

/** Requests by pathname, and the values the filter reported. @type {Record<string, number>} */
const hits = {};
/** @type {string[]} */
const typed = [];
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

const resetObservations = () => {
  for (const k of Object.keys(hits)) delete hits[k];
  typed.length = 0;
};

const PAGE_HEAD = '<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>t</title></head><body>';
const LOGIN_PAGE = `${PAGE_HEAD}<h1>Entrar</h1></body></html>`;
const TASKS_PAGE = [
  PAGE_HEAD,
  '<h1>Tarefas</h1>',
  '<label for="f">Filtro</label><input id="f" type="text">',
  '<button id="a" type="button">Aplicar</button>',
  // The page renders what was typed back, as a results header would.
  '<p id="o"></p>',
  // Page text the withholding rules must catch after the interaction exactly as before it.
  `<p>Conta ${EMAIL}</p>`,
  `<p>Sessao ${TOKEN}</p>`,
  `<p>Bem-vinda ${PERSON}</p>`,
  '<button id="p" type="button">Registrar</button>',
  '<script>',
  'document.getElementById("a").onclick = function () { var v = document.getElementById("f").value; fetch("/act/apply?v=" + encodeURIComponent(v)); document.getElementById("o").textContent = "Resultado para " + v; };',
  'document.getElementById("p").onclick = function () { fetch("/act/ping"); };',
  '</script></body></html>',
].join('');

before(async () => {
  server = createServer((req, res) => {
    const u = new URL(String(req.url), 'http://x');
    hits[u.pathname] = (hits[u.pathname] ?? 0) + 1;
    if (u.pathname === '/act/apply') typed.push(u.searchParams.get('v') ?? '');
    if (u.pathname.startsWith('/act/')) {
      res.writeHead(204);
      res.end();
      return;
    }
    const authed = String(req.headers.cookie ?? '').includes(`access-token=${TOKEN}`);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(authed ? TASKS_PAGE : LOGIN_PAGE);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

// ---------------------------------------------------------------------------
// The fixture and the runner
// ---------------------------------------------------------------------------

/** A login stub that writes a storage state carrying the session cookie the application asks for. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "${TOKEN}", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
].join('\n');

/** @param {string[]} args @param {string} cwd */
function git(args, cwd) {
  return spawnSync('git', args, { cwd, env: { ...process.env, ...GIT_ENV }, encoding: 'utf8', windowsHide: true });
}

/**
 * A project: the declared target, a role with a login stub and a one-case report that does not state the typed value.
 * @param {{ workTree?: boolean, extensions?: string }} [o]
 */
function fixture(o = {}) {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  if (o.workTree === true) {
    const init = git(['init', '-q'], root);
    assert.equal(init.status, 0, `git init failed: ${init.stderr}`);
  }
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  if (o.extensions !== undefined) writeFileSync(join(root, 'PRPs', 'redaction-extensions.txt'), o.extensions);
  const report = join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md');
  const block = ['### Case 1', '**Title:** Filter', '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', '1. Open the tasks.', '2. Filter the list and apply it.', ''].join('\n');
  writeFileSync(report, `# QA Report\n\n## Test Cases\n\n${block}\n## Notes\n\nnone\n`);
  return { root, runDir, grounding: join(runDir, 'grounding'), report };
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function spawnRunner(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    // NODE_PATH lets the copied runner resolve Playwright from the repository node_modules, with no junction to clean up.
    const env = { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES };
    const child = spawn(NODE, [COPY, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    // Below the test timeout, so a hang ends the child (and the sandbox cleanup can run) before the test is abandoned.
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

/**
 * One ground run, with the QA report asserted byte-identical around it.
 * @param {{ root: string, report: string }} fx
 * @param {any[]} steps the prefix
 */
async function groundWith(fx, steps) {
  const before = sha256File(fx.report);
  const r = await spawnRunner(
    ['ground', '--root', fx.root, '--feature', FEATURE, '--run-dir', RUN_REL, '--route', '/tasks', '--role', 'admin', '--prefix', JSON.stringify(steps)],
    fx.root,
  );
  assert.equal(sha256File(fx.report), before, 'the QA report changed during the run');
  return r;
}

/** @param {string} dir @param {string[]} [skipNames] @returns {string[]} */
function walk(dir, skipNames = []) {
  return readdirSync(dir).flatMap((n) => {
    if (skipNames.includes(n)) return [];
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, skipNames) : [p];
  });
}

const FILL = { action: 'fill', role: 'textbox', name: 'Filtro', value: TYPED };
const APPLY = { action: 'click', role: 'button', name: 'Aplicar' };
const REGISTER = { action: 'click', role: 'button', name: 'Registrar' };

// ---------------------------------------------------------------------------
// 1. A typed value in a git work tree
// ---------------------------------------------------------------------------

test('AC-11 AC-5 end to end in a git work tree: the typed value is recorded as a SHA-256 digest only and appears on no stream and in no file but the snapshot, whose entries may echo it; sensitive page text is withheld; git ignores the new file name', SLOW, async () => {
  resetObservations();
  const fx = fixture({ workTree: true, extensions: `regex:${PERSON}\n` });

  const r = await groundWith(fx, [FILL, APPLY]);
  assert.equal(r.code, 0, r.stderr);
  const m = /^GROUNDED: grounding\/(admin--tasks--after-[0-9a-f]{8}\.snapshot\.json) entries=\d+ withheld=\d+$/m.exec(r.stdout);
  assert.ok(m !== null, r.stdout);
  const name = /** @type {RegExpExecArray} */ (m)[1];
  const snapshotPath = join(fx.grounding, name);
  const text = readFileSync(snapshotPath, 'utf8');
  const doc = JSON.parse(text);
  // The replay did type the value, once, and the click came after it.
  assert.deepEqual(typed, [TYPED]);

  // 1. The recorded prefix: a digest, never the value.
  assert.deepEqual(doc.prefix, [
    { action: 'goto', path: '/tasks' },
    { action: 'fill', role: 'textbox', name: 'Filtro', value_sha256: sha(TYPED) },
    { action: 'click', role: 'button', name: 'Aplicar' },
  ]);
  assert.equal(doc.prefix.some((/** @type {any} */ s) => 'value' in s), false, 'a prefix step carries a value key');
  assert.equal(JSON.stringify(doc.prefix).includes(TYPED), false, 'the typed value is in the recorded prefix');

  // 2. The entries are page text read after the interaction: the echo is permitted and is the only way the value
  //    reaches the snapshot. The policy says so, and this pins that it is stated truthfully.
  const echo = doc.entries.find((/** @type {any} */ e) => e.kind === 'text' && e.text === `Resultado para ${TYPED}`);
  assert.equal(echo?.matches, 1, 'the page echoes the typed value and the entry is not there');

  // 3. The same withholding as for any snapshot, after the interaction: an e-mail address, the session value and a declared pattern.
  assert.ok(doc.withheld >= 3, `the e-mail line, the session line and the person line must be withheld, got ${doc.withheld}`);
  for (const secret of [EMAIL, 'ana.souza', TOKEN, PERSON]) {
    assert.equal(text.includes(secret), false, `the snapshot carries a withheld value: ${secret}`);
    assert.equal(r.stdout.includes(secret) || r.stderr.includes(secret), false, `a stream carries a withheld value: ${secret}`);
  }

  // 4. The typed value is on neither stream and in no file of the project other than the snapshot.
  assert.equal(r.stdout.includes(TYPED) || r.stderr.includes(TYPED), false, 'the typed value reached a terminal stream');
  for (const f of walk(fx.root, ['.git'])) {
    if (f === snapshotPath) continue;
    assert.equal(readFileSync(f).toString('latin1').includes(TYPED), false, `the typed value reached ${f}`);
  }
  for (const f of walk(fx.runDir)) {
    assert.equal(readFileSync(f).toString('latin1').includes(TOKEN), false, `the session value reached ${f}`);
  }

  // 5. Git: the ignore file ground proved is there, and git ignores the new name; a path of the tracked side is not ignored.
  const ignoreFile = join(fx.runDir, '.gitignore');
  assert.ok(existsSync(ignoreFile), 'the proof left no ignore file in the run directory');
  assert.ok(readFileSync(ignoreFile, 'utf8').split('\n').includes('grounding/'), 'the ignore file does not cover grounding/');
  const rel = `${RUN_REL}/grounding/${name}`;
  assert.equal(git(['check-ignore', '-q', '--', rel], fx.root).status, 0, 'git does not ignore the post-interaction snapshot');
  assert.equal(git(['check-ignore', '-q', '--', `${RUN_REL}/results.json`], fx.root).status, 1, 'the control path is ignored: the check proves nothing');
  const untracked = git(['ls-files', '--others', '--exclude-standard'], fx.root);
  assert.equal(untracked.status, 0, untracked.stderr);
  assert.equal(untracked.stdout.split('\n').some((l) => l.includes('/grounding/')), false, `git would add the snapshot: ${untracked.stdout}`);
});

// ---------------------------------------------------------------------------
// 2. The proof comes before the first interaction
// ---------------------------------------------------------------------------

test('AC-5 end to end: with a run directory whose ignore does not hold, ground halts FAILED_IGNORE_UNPROVEN before the replay, so no click is performed and nothing is requested; with the rules in place the same run performs it', SLOW, async () => {
  resetObservations();
  const fx = fixture({ workTree: true });
  const ignoreFile = join(fx.runDir, '.gitignore');
  const tampered = '# the operator wrote this and it covers nothing\n';
  writeFileSync(ignoreFile, tampered);

  const refused = await groundWith(fx, [REGISTER]);
  assert.equal(refused.code, 1, `${refused.stdout}${refused.stderr}`);
  assert.match(refused.stderr, /^FAILED_IGNORE_UNPROVEN: /);
  assert.equal(refused.stdout, '');
  assert.deepEqual(hits, {}, 'the application was requested although the ignore was not proven');
  assert.equal(existsSync(fx.grounding), false, 'a snapshot directory was created although the ignore was not proven');
  assert.equal(readFileSync(ignoreFile, 'utf8'), tampered, 'the operator ignore file was rewritten');

  // Control twin: the same project and the same prefix with the rules in place performs the replay.
  writeFileSync(ignoreFile, '# Written by hand for the control.\ngrounding/\nevidence/\n');
  const proven = await groundWith(fx, [REGISTER]);
  assert.equal(proven.code, 0, proven.stderr);
  assert.equal(hits['/act/ping'], 1, 'the control did not perform the click');
  assert.equal(existsSync(fx.grounding), true);
});

// ---------------------------------------------------------------------------
// 3. A locator that names a withheld value
// ---------------------------------------------------------------------------

test('AC-11 end to end: a prefix locator that names an e-mail address, the session value or a declared pattern is refused before the browser starts, by position, with the application never requested; a clean locator starts it', SLOW, async () => {
  resetObservations();
  const fx = fixture({ extensions: `regex:${PERSON}\n` });
  /** @type {[string, any[], number, string[]][]} label, prefix, the position named, the values the refusal must not carry */
  const refused = [
    ['an e-mail address as the name', [{ action: 'click', role: 'link', name: EMAIL }], 1, [EMAIL, 'ana.souza']],
    ['the session value as the name, after a clean step', [REGISTER, { action: 'click', role: 'button', name: TOKEN }], 2, [TOKEN]],
    ['a declared pattern as the text of a fill', [{ action: 'fill', text: PERSON, value: 'x' }], 1, [PERSON]],
  ];
  for (const [label, steps, at, never] of refused) {
    const r = await groundWith(fx, steps);
    assert.equal(r.code, 1, `${label}: ${r.stdout}${r.stderr}`);
    assert.equal(r.stderr, `GROUND_PREFIX_FAILED: prefix step ${at}: its locator names a value the redaction rules withhold; nothing was replayed\n`, label);
    assert.equal(r.stdout, '', label);
    for (const value of never) assert.equal(r.stderr.includes(value), false, `${label}: the refusal carries a withheld value`);
    // Refused before the browser starts: not a page, not a click, not even the step before the offender.
    assert.deepEqual(hits, {}, `${label}: the application was requested`);
    assert.deepEqual(readdirSync(fx.runDir), [], `${label}: a refused prefix wrote something`);
  }

  // Control twin: a clean locator in the same project starts the browser, requests the page and performs the click.
  const clean = await groundWith(fx, [REGISTER]);
  assert.equal(clean.code, 0, clean.stderr);
  assert.ok((hits['/tasks'] ?? 0) >= 1, 'the control did not request the page: "never requested" above proves nothing');
  assert.equal(hits['/act/ping'], 1);
});
