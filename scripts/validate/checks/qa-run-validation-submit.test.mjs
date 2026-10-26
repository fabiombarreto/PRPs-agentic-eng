// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-11 Validation submit (a click with effect validation, preceded in the same case by a fill whose value is the report's own literal, runs only for a dedicated role and records the requests it issues as method, host and path only; no report literal is PLAN_ENTRY_INVALID before anything is requested; a role that is not dedicated is blocked ROLE_NOT_DEDICATED before any session; a non-local request blocks the case FAILED_NON_LOCAL_TARGET; ground --prefix still refuses an effect)
/**
 * Phase 5 (validation submit) of qa-runner-vocabulary-v4.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-5-validation-submit.plan.md
 *              (AC-A1 run and record, AC-A2 dedicated-role gate, AC-A3 report-literal rule and schema, AC-A4 ground --prefix,
 *              AC-A5 interaction rules)
 *
 * Layers, over the REAL runner module and the REAL runner as a child process (never edited):
 *   1. The pure pieces: STEP_EFFECTS, firstEffectStep, the effect schema table, the report-literal rule, the window summary.
 *   2. The real `run` mode over a loopback page that counts what was requested of it, with a temp target root that carries
 *      its own kit config (one dedicated role, one not): the run-and-record case, the two refusals that need no browser,
 *      the stop after a failed assertion, an ungrounded submit, and a request to a host the guard does not approve.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const NODE_MODULES = resolve('node_modules');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261025T121212121Z`;
const SLOW = { timeout: 290000 };

/** @param {any} step @param {string} [driver] */
const verdict = (step, driver = 'browser') => R.validateStep(driver, step);

const GOTO = { action: 'goto', path: '/form' };
const FILL_OK = { action: 'fill', role: 'textbox', name: 'E-mail', value: 'not-an-email' };
const SUBMIT = { action: 'click', role: 'button', name: 'Validar', effect: 'validation' };
const SEEN = { action: 'expect_visible', text: 'E-mail inválido' };
const REPORT = 'Open the page,\n  type  Not-An-Email in the E-mail field, then click Validar and see the error';

// ---------------------------------------------------------------------------
// 1. The pure pieces (AC-A3, AC-A4, AC-A5)
// ---------------------------------------------------------------------------

test('AC-11 the effect vocabulary is exactly write and validation, frozen', () => {
  assert.deepEqual([...R.STEP_EFFECTS], ['write', 'validation']);
  assert.ok(Object.isFrozen(R.STEP_EFFECTS));
});

test('AC-11 firstEffectStep sees both effect values, firstWriteStep still sees only write, and both are total', () => {
  assert.equal(R.firstEffectStep([GOTO, FILL_OK, SUBMIT]), 2);
  assert.equal(R.firstEffectStep([GOTO, { action: 'click', selector: '#s', effect: 'write' }, SUBMIT]), 1);
  assert.equal(R.firstEffectStep([GOTO, SEEN]), -1);
  assert.equal(R.firstWriteStep([GOTO, FILL_OK, SUBMIT]), -1, 'firstWriteStep must not see a validation submit');
  assert.equal(R.firstWriteStep([{ action: 'click', selector: '#s', effect: 'write' }]), 0);
  for (const notSteps of [null, undefined, 'x', 7, {}]) {
    assert.equal(R.firstEffectStep(notSteps), -1, JSON.stringify(notSteps));
  }
  assert.equal(R.firstEffectStep([null, 3, { action: 'click', effect: 'delete' }]), -1, 'an unknown effect is not an effect step');
});

test('AC-11 the effect validation is legal on a click only, in every locator form', () => {
  assert.equal(verdict(SUBMIT), null);
  assert.equal(verdict({ action: 'click', selector: '#go', effect: 'validation' }), null);
  assert.equal(verdict({ action: 'click', text: 'Validar', effect: 'validation' }), null);
  for (const step of [
    { ...FILL_OK, effect: 'validation' },
    { ...GOTO, effect: 'validation' },
    { ...SEEN, effect: 'validation' },
    { action: 'expect_text', selector: 'h1', contains: 'x', effect: 'validation' },
  ]) assert.equal(verdict(step)?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(step));
  assert.equal(verdict({ action: 'request', method: 'POST', path: '/x', effect: 'validation' }, 'http')?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-11 an effect outside the two legal values, in another case or of another type, is PLAN_ENTRY_INVALID and its reason carries no value', () => {
  for (const effect of ['Validation', 'delete', 'WRITE', '', true, 1, null, ['validation'], {}]) {
    const r = verdict({ action: 'click', role: 'button', name: 'Validar', effect });
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(effect));
    assert.ok(!/delete|WRITE|Validation/.test(r?.reason ?? ''), `the reason echoes the value: ${r?.reason}`);
  }
});

test('AC-11 effect write keeps its semantics: legal on click, fill and request, refused elsewhere', () => {
  assert.equal(verdict({ action: 'click', role: 'button', name: 'Salvar', effect: 'write' }), null);
  assert.equal(verdict({ ...FILL_OK, effect: 'write' }), null);
  assert.equal(verdict({ action: 'request', method: 'POST', path: '/x', effect: 'write' }, 'http'), null);
  assert.equal(verdict({ ...SEEN, effect: 'write' })?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(verdict({ ...GOTO, effect: 'write' })?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-11 a whole plan carrying a validation submit is schema-valid', () => {
  assert.equal(R.validateSteps('browser', [GOTO, FILL_OK, SUBMIT, SEEN]), null);
});

test('AC-11 the report-literal rule accepts an earlier fill whose value is verbatim in the manual steps once whitespace is collapsed and case is folded', () => {
  assert.equal(R.validateValidationSubmits([GOTO, FILL_OK, SUBMIT, SEEN], REPORT), null, 'case is folded');
  assert.equal(R.validateValidationSubmits([GOTO, { ...FILL_OK, value: '  NOT-AN-EMAIL  ' }, SUBMIT], REPORT), null, 'outer whitespace and case do not matter');
  assert.equal(R.validateValidationSubmits([GOTO, { ...FILL_OK, value: 'the \t E-mail   field' }, SUBMIT], REPORT), null, 'a run of spaces or tabs between two report words collapses to one space');
  assert.equal(R.validateValidationSubmits([GOTO, { ...FILL_OK, value: 'Open the page,\n  type' }, SUBMIT], REPORT), null, 'a literal spanning the report line break collapses the same way');
  assert.equal(
    R.validateValidationSubmits([GOTO, FILL_OK, { action: 'fill', role: 'textbox', name: 'Other', value: 'zz-not-in-report' }, SUBMIT], REPORT),
    null,
    'any earlier qualifying fill is enough, not only the last one before the click',
  );
});

test('AC-11 the report-literal rule refuses every unqualified submit with PLAN_ENTRY_INVALID and a reason that names a step position and no value', () => {
  /** @type {[string, any[], any][]} */
  const refused = [
    ['no fill at all', [GOTO, SUBMIT], REPORT],
    ['the fill comes after the click', [GOTO, SUBMIT, FILL_OK], REPORT],
    ['the fill value is not in the report', [GOTO, { ...FILL_OK, value: 'outro-texto' }, SUBMIT], REPORT],
    ['a binding never qualifies, even when the report holds the text', [GOTO, { ...FILL_OK, value: '{{email}}' }, SUBMIT], `${REPORT} {{email}}`],
    ['a value under three characters never qualifies', [GOTO, { ...FILL_OK, value: 'no' }, SUBMIT], `no ${REPORT}`],
    ['a space inside a word is not a collapse', [GOTO, { ...FILL_OK, value: 'not-an- email' }, SUBMIT], REPORT],
    ['a line break inside a word is not a collapse', [GOTO, { ...FILL_OK, value: 'not-an-\nemail' }, SUBMIT], REPORT],
    ['an earlier click is not a fill', [GOTO, { action: 'click', role: 'button', name: 'Abrir' }, SUBMIT], REPORT],
    ['an earlier fill with no string value', [GOTO, { ...FILL_OK, value: 12345 }, SUBMIT], REPORT],
    ['the manual steps are null', [GOTO, FILL_OK, SUBMIT], null],
    ['the manual steps are undefined', [GOTO, FILL_OK, SUBMIT], undefined],
    ['the manual steps are not a string', [GOTO, FILL_OK, SUBMIT], ['not-an-email']],
    ['the manual steps are empty', [GOTO, FILL_OK, SUBMIT], ''],
  ];
  for (const [why, steps, text] of refused) {
    const r = R.validateValidationSubmits(steps, text);
    assert.ok(r !== null && r.code === 'PLAN_ENTRY_INVALID', why);
    assert.match(r.reason, /^step \d+: a validation submit needs an earlier fill/, why);
    assert.ok(!/outro-texto|not-an|email|\{\{/i.test(r.reason), `${why}: the reason carries a value`);
  }
});

test('AC-11 the report-literal rule names the position of the offending submit, not of the first step', () => {
  const r = R.validateValidationSubmits([GOTO, FILL_OK, SUBMIT, { ...SUBMIT, name: 'Outro' }, SEEN], REPORT);
  assert.equal(r, null, 'the same earlier fill covers both submits');
  const second = R.validateValidationSubmits([GOTO, FILL_OK, SUBMIT, { action: 'click', role: 'button', name: 'Abrir' }], REPORT);
  assert.equal(second, null);
  const bad = R.validateValidationSubmits([GOTO, SUBMIT], REPORT);
  assert.match(bad?.reason ?? '', /^step 2: /);
});

test('AC-11 the report-literal rule ignores a write click and every other step, and is total', () => {
  assert.equal(R.validateValidationSubmits([GOTO, { action: 'click', role: 'button', name: 'Salvar', effect: 'write' }], REPORT), null, 'a write click needs no literal');
  assert.equal(R.validateValidationSubmits([GOTO, { action: 'click', role: 'button', name: 'Validar' }], REPORT), null, 'a plain click needs no literal');
  assert.equal(R.validateValidationSubmits([GOTO, SEEN], null), null);
  assert.equal(R.validateValidationSubmits('x', REPORT), null);
  assert.equal(R.validateValidationSubmits(null, REPORT), null);
  assert.equal(R.validateValidationSubmits([null, 7, 'x', SUBMIT], REPORT)?.code, 'PLAN_ENTRY_INVALID');
});

test('AC-11 ground --prefix still refuses any step carrying an effect, validation and write alike', () => {
  for (const effect of ['validation', 'write']) {
    const g = R.parseGroundPrefix(JSON.stringify([GOTO, { action: 'click', role: 'button', name: 'Validar', effect }]));
    assert.equal(g.ok, false, effect);
  }
  assert.equal(R.parseGroundPrefix(JSON.stringify([GOTO, { action: 'click', role: 'button', name: 'Validar' }])).ok, true, 'the same prefix without an effect is legal');
});

test('AC-11 a validation click is an interaction: it never continues after a failed assertion, and the assertions still do', () => {
  assert.equal(R.continuesAfterFailure(SUBMIT), false);
  assert.equal(R.continuesAfterFailure({ action: 'click', selector: '#go', effect: 'validation' }), false);
  assert.equal(R.continuesAfterFailure(SEEN), true);
});

test('AC-11 an ungrounded validation click is an interaction gap that truncates the case at its position', () => {
  const noValidar = 'Open the page, type not-an-email in the E-mail field and see the error';
  const grounded = R.groundLocators([GOTO, FILL_OK, SUBMIT], [], REPORT, null);
  assert.deepEqual(grounded.gaps, []);
  const gap = R.groundLocators([GOTO, FILL_OK, SUBMIT, SEEN], [], noValidar, null);
  assert.deepEqual(gap.gaps.filter((g) => g.at === 2), [{ at: 2, kind: 'interaction' }]);
  assert.equal(gap.truncateAt, 2);
});

test('AC-11 summarizeValidationWindow keeps method, host and path only, whatever else an entry carries', () => {
  const e = (/** @type {string} */ method, /** @type {string} */ path) => ({ method, host: '127.0.0.1:9', path, local: true, query: 'secret=1', body: 'b', headers: { a: 'b' } });
  const out = R.summarizeValidationWindow([e('POST', '/api/validate'), e('GET', '/a')]);
  assert.deepEqual(out, {
    status: 'recorded',
    observed: 2,
    truncated: false,
    requests: [
      { method: 'POST', host: '127.0.0.1:9', path: '/api/validate' },
      { method: 'GET', host: '127.0.0.1:9', path: '/a' },
    ],
  });
  assert.ok('requests' in out);
  for (const r of /** @type {any} */ (out).requests) assert.deepEqual(Object.keys(r), ['method', 'host', 'path']);
});

test('AC-11 summarizeValidationWindow treats a missing window as empty and skips an entry that is not a request', () => {
  const empty = { status: 'recorded', observed: 0, truncated: false, requests: [] };
  assert.deepEqual(R.summarizeValidationWindow([]), empty);
  for (const notWindow of [null, undefined, 'x', 7, {}]) assert.deepEqual(R.summarizeValidationWindow(notWindow), empty, JSON.stringify(notWindow));
  const mixed = R.summarizeValidationWindow([{ method: 'GET', host: 'h', path: '/ok', local: true }, null, 'x', { method: 'GET', local: true }]);
  assert.equal(/** @type {any} */ (mixed).observed, 1);
});

test('AC-11 summarizeValidationWindow caps the listing at the evidence maximum and says so, while still counting every request', () => {
  const many = Array.from({ length: R.EXPECT_REQUESTS_EVIDENCE_MAX + 10 }, (_, k) => ({ method: 'GET', host: 'h', path: `/r${k}`, local: true }));
  const out = /** @type {any} */ (R.summarizeValidationWindow(many));
  assert.equal(out.requests.length, R.EXPECT_REQUESTS_EVIDENCE_MAX);
  assert.equal(out.observed, many.length);
  assert.equal(out.truncated, true);
  const exact = /** @type {any} */ (R.summarizeValidationWindow(many.slice(0, R.EXPECT_REQUESTS_EVIDENCE_MAX)));
  assert.equal(exact.truncated, false);
});

test('AC-11 summarizeValidationWindow makes the whole window non-local when any request targeted a host the guard does not approve', () => {
  const local = { method: 'POST', host: '127.0.0.1:9', path: '/ok', local: true };
  const outside = { method: 'GET', host: 'example.invalid', path: '/x', local: false };
  assert.deepEqual(R.summarizeValidationWindow([local, outside]), { status: 'non-local' });
  assert.deepEqual(R.summarizeValidationWindow([outside]), { status: 'non-local' });
  assert.deepEqual(R.summarizeValidationWindow([local, { method: 'GET', host: 'h', path: '/y' }]), { status: 'non-local' }, 'an entry with no local flag is not approved');
});

// ---------------------------------------------------------------------------
// 2. The real runner against a loopback page that counts what is requested of it
// ---------------------------------------------------------------------------

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v4p5-submit-'));
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

/** What the page was asked for, by "METHOD pathname". @type {Record<string, number>} */
const hits = {};
// The submit carries a query string and a body, so the evidence has something to leave out.
const SUBMIT_JS = `fetch('/api/validate?probe=zq41',{method:'POST',body:'payload-zq41'}).then(()=>document.body.insertAdjacentHTML('beforeend','<div role=alert>E-mail inválido</div>'))`;
// 203.0.113.0/24 is a documentation range: the guard does not approve it, and nothing can answer there.
const OUTSIDE_JS = `fetch('http://203.0.113.9:9/outside',{method:'POST'}).catch(()=>{})`;
/** @param {string} js */
const form = (js) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><h1>Panel</h1><input type="text" aria-label="E-mail"><button type="button" onclick="${js.replace(/"/g, '&quot;')}">Validar</button></body></html>`;
/** @type {Record<string, string>} */
const PAGES = {
  '/form': form(SUBMIT_JS),
  '/form2': form(SUBMIT_JS),
  '/form3': form(SUBMIT_JS),
  '/refused': form(SUBMIT_JS),
  '/nonlocal': form(OUTSIDE_JS),
};
/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
let port = 0;
before(async () => {
  server = createServer((req, res) => {
    const path = new URL(String(req.url), 'http://x').pathname;
    const key = `${req.method} ${path}`;
    hits[key] = (hits[key] ?? 0) + 1;
    if (path === '/api/validate') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGES[path] ?? '<!doctype html><html><body><h1>Panel</h1></body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {any} */ (server.address()).port;
  baseUrl = `http://127.0.0.1:${port}`;
});
after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

/**
 * A project that is not a git work tree, with its report, its plan and its own kit: `admin` is declared dedicated,
 * `viewer` is not. Each role's login script writes a session file the runner would read.
 * @param {{ title: string, role: string, manual: string[], steps: any[] }[]} defs
 */
function project(defs) {
  const root = realpathSync(mkdtempSync(join(SANDBOX, 'run-')));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: { admin: { dedicated: true }, viewer: {} } }));
  for (const role of ['admin', 'viewer']) {
    writeFileSync(
      join(root, 'PRPs', 'auth', `login-${role}.mjs`),
      [
        `import { writeFileSync, mkdirSync } from "node:fs";`,
        `import { join } from "node:path";`,
        `const root = process.argv[process.argv.indexOf("--root") + 1];`,
        `mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });`,
        `writeFileSync(join(root, "PRPs", "auth", ".sessions", "${role}.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "fixture-session-zz", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
      ].join('\n'),
    );
  }
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: d.role, state: 'none', steps: d.steps })) }));
  return { root, runDir };
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stderr: string, results: any }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    // NODE_PATH keeps Playwright resolvable whatever the target root holds.
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV, NODE_PATH: NODE_MODULES },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    child.stdout.on('data', () => {});
    const timer = setTimeout(() => child.kill(), 270000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      resolveP({ code, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

/** @param {any} c @returns {string[]} */
const stepResults = (c) => c.steps.map((/** @type {any} */ s) => s.result);
/** @param {any} c */
const brief = (c) => JSON.stringify([c.outcome, c.reason_code, c.reason, stepResults(c)]);
/** @param {string} dir @param {string} name */
const findFile = (dir, name) => readdirSync(dir, { recursive: true }).map(String).find((f) => f.endsWith(name));

const MANUAL = ['1. Open the page, type not-an-email in the E-mail field, click Validar and see E-mail inválido'];
const MANUAL_NO_LITERAL = ['1. Open the page, type something in the E-mail field, click Validar and see E-mail inválido'];
const MANUAL_NO_SUBMIT_WORD = ['1. Open the page, type not-an-email in the E-mail field and see E-mail inválido'];
const MANUAL_MISSING_HEADING = ['1. Open the page, see Painel ausente, type not-an-email in the E-mail field, click Validar and see E-mail inválido'];
const at = (/** @type {string} */ path) => ({ action: 'goto', path });
const fill = (/** @type {string} */ value) => ({ action: 'fill', role: 'textbox', name: 'E-mail', value });

test('AC-11 end to end: a dedicated role submits and the request is recorded; a role that is not dedicated and an entry with no report literal end before any session or request', SLOW, async () => {
  for (const k of Object.keys(hits)) delete hits[k];
  /** @type {{ title: string, role: string, manual: string[], steps: any[] }[]} */
  const defs = [
    /* 1 */ { title: 'Dedicated role submits', role: 'admin', manual: MANUAL, steps: [at('/form'), fill('not-an-email'), SUBMIT, SEEN] },
    /* 2 */ { title: 'Role not dedicated', role: 'viewer', manual: MANUAL, steps: [at('/refused'), fill('not-an-email'), SUBMIT, SEEN] },
    /* 3 */ { title: 'Fill value not in the report', role: 'admin', manual: MANUAL, steps: [at('/refused'), fill('outro-texto'), SUBMIT, SEEN] },
    /* 4 */ { title: 'No fill before the submit', role: 'admin', manual: MANUAL, steps: [at('/refused'), SUBMIT, SEEN] },
    /* 5 */ { title: 'Not dedicated and no literal', role: 'viewer', manual: MANUAL_NO_LITERAL, steps: [at('/refused'), fill('something-else'), SUBMIT, SEEN] },
    /* 6 */ { title: 'Submit after a failed assertion', role: 'admin', manual: MANUAL_MISSING_HEADING, steps: [at('/form2'), { action: 'expect_visible', role: 'heading', name: 'Painel ausente' }, fill('not-an-email'), SUBMIT, SEEN] },
    /* 7 */ { title: 'Request to a host the guard does not approve', role: 'admin', manual: MANUAL, steps: [at('/nonlocal'), fill('not-an-email'), SUBMIT, SEEN] },
    /* 8 */ { title: 'Submit word the report never states', role: 'admin', manual: MANUAL_NO_SUBMIT_WORD, steps: [at('/form3'), fill('not-an-email'), SUBMIT, SEEN] },
  ];
  const fx = project(defs);
  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const c = r.results.cases;
  assert.equal(c.length, defs.length);
  const label = (/** @type {number} */ i) => `case ${i + 1}: ${brief(c[i])}`;

  // The two refusals that never need a browser: both end before any session, target or request.
  assert.equal(c[1].outcome, 'blocked', label(1));
  assert.equal(c[1].reason_code, 'ROLE_NOT_DEDICATED', label(1));
  assert.match(c[1].reason, /^step 3: /, 'the refusal names the position of the first effect step');
  assert.equal(c[1].reason, `step 3: ${R.REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason}`, 'the catalogue sentence is reused unchanged');
  for (const i of [2, 3]) {
    assert.equal(c[i].outcome, 'needs-human', label(i));
    assert.equal(c[i].reason_code, 'PLAN_ENTRY_INVALID', label(i));
    assert.match(c[i].reason, /^step \d+: a validation submit needs an earlier fill/, label(i));
    assert.ok(!c[i].reason.includes('outro-texto'), 'the reason carries no value');
  }
  // The literal rule runs before the dedicated-role gate: a plain role with no report literal is an invalid entry.
  assert.equal(c[4].outcome, 'needs-human', label(4));
  assert.equal(c[4].reason_code, 'PLAN_ENTRY_INVALID', label(4));
  assert.ok(!existsSync(join(fx.root, 'PRPs', 'auth', '.sessions', 'viewer.json')), 'no session was obtained for a role that was refused');

  if (c[0].reason_code === 'FAILED_BROWSER_UNAVAILABLE') {
    // Not an assertion about the vocabulary: the host cannot launch Chromium.
    console.log('SKIP-BROWSER-UNAVAILABLE: the runner could not launch Chromium here');
    assert.equal(hits['GET /refused'], undefined, 'the refused cases never loaded the page');
    return;
  }

  // AC-A1: the dedicated role clicks, the error shows, the request is recorded and the case goes on to its assertion.
  assert.equal(c[0].outcome, 'pass', label(0));
  assert.deepEqual(stepResults(c[0]), ['passed', 'passed', 'passed', 'passed'], 'the assertion after the submit ran');
  assert.equal(hits['GET /refused'], undefined, 'the refused cases never loaded the page');
  assert.equal(hits['POST /api/validate'], 1, 'exactly one validation request: only case 1 clicked');
  const evFile = findFile(fx.runDir, 'case-1.requests-3.json');
  assert.ok(evFile, 'the validation click wrote its request evidence under the expect_requests file name');
  const raw = readFileSync(join(fx.runDir, evFile), 'utf8');
  const ev = JSON.parse(raw);
  const value = ev.value ?? ev;
  assert.equal(value.action, 'click');
  assert.equal(value.effect, 'validation');
  assert.equal(value.step, 3);
  assert.equal(value.result, 'recorded');
  const posts = value.requests.filter((/** @type {any} */ q) => q.method === 'POST');
  assert.equal(posts.length, 1, 'one POST in the evidence');
  assert.deepEqual(posts[0], { method: 'POST', host: `127.0.0.1:${port}`, path: '/api/validate' });
  for (const q of value.requests) assert.deepEqual(Object.keys(q).sort(), ['host', 'method', 'path']);
  assert.ok(!raw.includes('zq41') && !raw.includes('probe'), 'no query string and no body in the evidence');
  assert.ok(!raw.includes('not-an-email'), 'the typed literal is not in the evidence');
  assert.ok(c[0].steps[2].evidence, 'the click step record points at its evidence');
  assert.ok(!JSON.stringify(c[0]).includes('zq41'), 'no query or body in the case record');

  // AC-A5: a failed assertion stops the case; the fill and the validation click are not run and nothing is recorded.
  assert.equal(c[5].outcome, 'fail', label(5));
  assert.equal(c[5].steps[1].result, 'failed', label(5));
  assert.equal(c[5].steps[2].result, 'not-run', label(5));
  assert.equal(c[5].steps[3].result, 'not-run', label(5));
  assert.equal(hits['GET /form2'], 1, 'the page of the failing case was loaded once');
  assert.equal(findFile(fx.runDir, 'case-6.requests-4.json'), undefined, 'a validation click that did not run records nothing');

  // AC-A1: a request to a host the guard does not approve blocks the case.
  assert.equal(c[6].outcome, 'blocked', label(6));
  assert.equal(c[6].reason_code, 'FAILED_NON_LOCAL_TARGET', label(6));
  assert.ok(!c[6].reason.includes('203.0.113'), 'the outside host is not in the reason');
  assert.ok(!hits['POST /outside'], 'nothing reached the outside host');

  // AC-A5: an ungrounded submit is a human gap, never run and never recorded.
  assert.equal(c[7].outcome, 'needs-human', label(7));
  assert.equal(c[7].reason_code, 'STEP_UNGROUNDED', label(7));
  assert.equal(findFile(fx.runDir, 'case-8.requests-3.json'), undefined, 'an ungrounded submit records nothing');
  assert.equal(hits['POST /api/validate'], 1, 'still only the one validation request after every case ran');

  assert.deepEqual(validateResults(r.results), []);
});
