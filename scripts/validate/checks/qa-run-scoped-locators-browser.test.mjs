// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-6 A locator step grounded only by the report's words is resolved when the case runs (exactly one match passes; none or several end the case needs-human STEP_UNGROUNDED with nothing acted on; neither source is PLAN_ENTRY_INVALID)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-7 within resolves to one element (zero or several is STEP_UNGROUNDED, a scoped absence never passes vacuously), and name_prefix matches the start of an accessible name
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-8 label_text finds the one input of the nearest container of its label and records the plan's locator keys, never the compared value
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-9 index picks the zero-based Nth control of a role inside a within scope
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-10 expect_requests with a method array counts a request whose method is any member
/**
 * Phase 3 (run-time and scoped locators) of qa-runner-ai-executable-steps, the part that needs a real Chromium.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-3-run-time-and-scoped-locators.plan.md
 *              (AC-A1 run-time resolution, AC-A2 within and name_prefix, AC-A3 label_text, AC-A4 index, AC-A5 the method array)
 *
 * Layers, over the REAL runner:
 *   1. The exported helpers on a real page: resolveScopeElement (one, none, several) and the locator it hands to
 *      captureElementPng (a PNG), buildLocator for name_prefix (the start of `Alunos (12)` and not a middle
 *      substring), the label walk (one input, two inputs, a hidden input ignored, a label text that matches several
 *      elements gives a guard count other than 1), a within scope that picks one of two twins, and index.
 *   2. The real `run` mode as ONE child process over one loopback page: nineteen scoped and report-word cases with
 *      the expected [outcome, reason_code] pairs and reasons, two snapshot-grounded control cases that keep their
 *      0.46.0 outcomes, the page's own record of what was clicked (nothing is acted on when a case ends
 *      STEP_UNGROUNDED), the evidence of the scoped expect_value (the plan's locator keys, never the value) and of
 *      the method array (recorded as given), no reason echoing a locator word, and a results.json the contract
 *      check accepts.
 *
 * One Chromium is launched lazily for the helper tests and closed in an after hook; one loopback server; one runner
 * child. No assertion is tighter than the runner's own windows (the 5 s assertion settle, the 10 s attach wait,
 * the 30 s capture bound).
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the runner is spawned with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261022T101010101Z`;
const PAGE_TIMEOUT = { timeout: 120000 };
const SLOW = { timeout: 300000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-ai3-scoped-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** The page of the helper tests and of the end-to-end run: two groups with twin controls, a live-count header, a label with no association. */
const PAGE =
  '<!doctype html><html><head><meta charset="utf-8"><title>Escopo</title><style>.z{opacity:0}</style></head><body><h1>Painel</h1>' +
  '<div role="region" aria-label="Grupo A"><button data-l="a-excluir">Excluir</button><button data-l="a-1"></button><button data-l="a-2"></button><button data-l="a-remover">Remover</button></div>' +
  '<div role="region" aria-label="Grupo B"><button data-l="b-excluir">Excluir</button><button data-l="b-salvar">Salvar</button><button class="z" data-l="b-fantasma">Fantasma</button></div>' +
  '<button aria-expanded="false">Alunos (12)</button><button id="gravar">Gravar</button>' +
  '<div><span>E-mail*</span><input type="text"></div>' +
  '<div><span>Telefone*</span><input type="text"><input type="text"></div>' +
  '<p id="log"></p>' +
  '<script>document.querySelectorAll("button[data-l]").forEach(function(b){b.addEventListener("click",function(){document.getElementById("log").textContent="clicked "+b.dataset.l;fetch("/hit/"+b.dataset.l);});});' +
  'document.getElementById("gravar").addEventListener("click",function(){fetch("/api/perfil",{method:"PATCH"});});</script></body></html>';

// ---------------------------------------------------------------------------
// One loopback server (the page, a PATCH endpoint and a record of the clicks) and one lazy in-process Chromium
// ---------------------------------------------------------------------------

/** @type {import('node:http').Server} */
let server;
let baseUrl = '';
/** @type {Record<string, number>} what the page reported being clicked, by data-l */
const hits = {};

before(async () => {
  server = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    if (path === '/api/perfil') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (path.startsWith('/hit/')) {
      const id = path.slice('/hit/'.length);
      hits[id] = (hits[id] ?? 0) + 1;
      res.writeHead(204);
      res.end();
      return;
    }
    if (path !== '/scoped' && path !== '/plain') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

/** @type {Promise<any> | null} */
let browserPromise = null;
/** @returns {Promise<any>} */
function getBrowser() {
  browserPromise ??= import('playwright').then((pw) => pw.chromium.launch({ headless: true }));
  return browserPromise;
}
after(async () => {
  if (browserPromise === null) return;
  try {
    await (await browserPromise).close();
  } catch {
    // The launch itself failed (the tests that needed it already failed) or the browser is gone.
  }
});

/**
 * Runs fn on a fresh page holding the given markup and closes the page afterwards.
 * @template T
 * @param {string} html
 * @param {(page: any) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withPage(html, fn) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html);
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

/** @param {any} page @param {any} step @returns {ReturnType<typeof R.buildLocator>} */
const built = (page, step) => {
  const loc = R.locatorOf(step);
  assert.ok(loc && loc.ok, `the step is not a locator: ${JSON.stringify(step)}`);
  return R.buildLocator(page, loc);
};

// ---------------------------------------------------------------------------
// 1. The helpers on a real page
// ---------------------------------------------------------------------------

test('AC-7 resolveScopeElement resolves a scope that matches once, reports none and several by count, and hands a locator that captureElementPng turns into a PNG', PAGE_TIMEOUT, async () => {
  await withPage(PAGE, async (page) => {
    const one = await R.resolveScopeElement(page, { role: 'region', name: 'Grupo A' });
    assert.equal(one.ok, true);
    const png = await R.captureElementPng(/** @type {any} */ (one).locator, []);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'the element capture of a resolved scope must be a PNG');
    assert.deepEqual(await R.resolveScopeElement(page, { role: 'region', name: 'Grupo Z' }), { ok: false, count: 0 });
    assert.deepEqual(await R.resolveScopeElement(page, { role: 'region', namePrefix: 'Grupo' }), { ok: false, count: 2 });
    assert.equal((await R.resolveScopeElement(page, { role: 'region', namePrefix: 'Grupo B' })).ok, true, 'a prefix scope resolves to its one element');
    // The same scope through the validated shape of a within object.
    const scope = R.scopeOf({ role: 'region', name: 'Grupo B' });
    assert.ok(scope.ok);
    assert.equal((await R.resolveScopeElement(page, /** @type {any} */ (scope).scope)).ok, true);
  });
});

test('AC-7 name_prefix matches the start of an accessible name, case-sensitively, and never a middle substring', PAGE_TIMEOUT, async () => {
  await withPage(PAGE, async (page) => {
    const count = (/** @type {string} */ prefix) => built(page, { action: 'click', role: 'button', name_prefix: prefix }).target.count();
    assert.equal(await count('Alunos'), 1, 'a name prefix matches the start of Alunos (12)');
    assert.equal(await count('Alunos ('), 1);
    assert.equal(await count('unos'), 0, 'a name prefix is not a substring match');
    assert.equal(await count('alunos'), 0, 'a name prefix is case-sensitive');
    assert.equal(await count('Alunos (1.)'), 0, 'a prefix is literal text, not a pattern');
    assert.equal(await count('E'), 2, 'Excluir of both groups starts with E: the prefix is a start match, counted page-wide when unscoped');
  });
});

test('AC-8 the label walk finds the one input of the nearest container; two inputs match nothing; a hidden input is ignored; a label text matching several elements gives a guard count other than 1', PAGE_TIMEOUT, async () => {
  const labelPage =
    '<!doctype html><html><body>' +
    '<div><span>Um</span><input type="text"></div>' +
    '<div><span>Dois</span><input type="text"><input type="text"></div>' +
    '<div><span>Oculto</span><input type="hidden" value="x"><input type="text"></div>' +
    '<div><span>Area</span><textarea></textarea></div>' +
    '<div><span>Escolha</span><select><option>a</option></select></div>' +
    '<div><span>Dup</span><input type="text"></div><div><span>Dup</span><input type="text"></div>' +
    '<div><p>Fora</p></div>' +
    '</body></html>';
  await withPage(labelPage, async (page) => {
    const label = (/** @type {string} */ text) => built(page, { action: 'fill', label_text: text, value: 'x' });
    assert.equal(await label('Um').target.count(), 1, 'the container of the label holds one input');
    assert.equal(await label('Dois').target.count(), 0, 'a container with two inputs matches nothing');
    assert.equal(await label('Oculto').target.count(), 1, 'a hidden input is not counted as a control');
    assert.equal(await label('Area').target.count(), 1, 'a textarea is a control');
    assert.equal(await label('Escolha').target.count(), 1, 'a select is a control');
    assert.equal(await label('Fora').target.count(), 0, 'a label with no control in reach matches nothing');
    // The label element is a guard of its own: the runner requires it to match exactly one element.
    const um = label('Um');
    assert.equal(um.guards.length, 1);
    assert.equal(um.guards[0].what, 'label');
    assert.equal(await um.guards[0].locator.count(), 1);
    const dup = label('Dup');
    assert.notEqual(await dup.guards[0].locator.count(), 1, 'a label text on two elements must not pass the guard');
    // What the walk found really is the input beside the label.
    await label('Um').target.fill('ana');
    assert.equal(await page.locator('input[type=text]').first().inputValue(), 'ana');
  });
});

test('AC-7 a within scope picks the one control among twins, and its guard is the scope', PAGE_TIMEOUT, async () => {
  await withPage(PAGE, async (page) => {
    assert.equal(await page.getByRole('button', { name: 'Excluir', exact: true }).count(), 2, 'the premise: the twins exist page-wide');
    const inB = built(page, { action: 'click', within: { role: 'region', name: 'Grupo B' }, role: 'button', name: 'Excluir' });
    assert.equal(await inB.target.count(), 1, 'the scope picks one of two twins');
    assert.equal(inB.guards.length, 1);
    assert.equal(inB.guards[0].what, 'scope');
    assert.equal(await inB.guards[0].locator.count(), 1);
    assert.equal(await built(page, { action: 'click', within: { role: 'region', name: 'Grupo A' }, role: 'button', name: 'Salvar' }).target.count(), 0, 'Salvar exists in the other group only');
    assert.equal(await built(page, { action: 'expect_visible', within: { role: 'region', name_prefix: 'Grupo B' }, text: 'Salvar' }).target.count(), 1);
    const everywhere = built(page, { action: 'click', within: { role: 'region', name_prefix: 'Grupo' }, role: 'button', name: 'Excluir' });
    assert.equal(await everywhere.guards[0].locator.count(), 2, 'a prefix that two groups share fails the scope guard');
  });
});

test('AC-9 index picks the zero-based Nth control of a role inside a scope, named or not, and reports the list it indexes', PAGE_TIMEOUT, async () => {
  await withPage(PAGE, async (page) => {
    const nth = (/** @type {number} */ index) => built(page, { action: 'click', within: { role: 'region', name: 'Grupo A' }, role: 'button', index });
    assert.equal(await nth(0).target.getAttribute('data-l'), 'a-excluir');
    assert.equal(await nth(1).target.getAttribute('data-l'), 'a-1', 'an unnamed button is reachable by position');
    assert.equal(await nth(3).target.getAttribute('data-l'), 'a-remover');
    const past = nth(8);
    assert.equal(await past.target.count(), 0);
    assert.ok(past.indexed, 'an index step carries the list it indexes');
    assert.equal(await /** @type {any} */ (past.indexed).all.count(), 4, 'the four buttons of the scope are the list');
    assert.equal(/** @type {any} */ (past.indexed).index, 8);
    assert.equal(built(page, { action: 'click', role: 'button', name: 'Salvar' }).indexed, null);
  });
});

// ---------------------------------------------------------------------------
// 2. The real run mode, one child process
// ---------------------------------------------------------------------------

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

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stderr: string }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    child.stdout.on('data', () => {});
    // Below the test timeout, so a hang ends the child (and the sandbox cleanup can run) before the test is abandoned.
    const timer = setTimeout(() => child.kill(), 270000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stderr });
    });
  });
}

test('AC-6 AC-7 AC-8 AC-9 AC-10 end to end through the real runner: report-word locators resolve at run time, zero and several matches end STEP_UNGROUNDED with nothing acted on, neither source is PLAN_ENTRY_INVALID, and within, name_prefix, label_text, index and a method array behave on a real page', SLOW, async () => {
  const root = realpathSync(mkdtempSync(join(SANDBOX, 'run-')));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  // A snapshot of /plain only: the two control cases are grounded by it; the scoped cases use /scoped, which has none.
  writeFileSync(
    join(runDir, 'grounding', 'anonymous--plain.snapshot.json'),
    JSON.stringify({
      schema_version: 1,
      role: 'anonymous',
      route: '/plain',
      entries: [
        { kind: 'role', role: 'heading', name: 'Painel', matches: 1 },
        { kind: 'role', role: 'button', name: 'Fantasma9', matches: 1 },
        { kind: 'role', role: 'button', name: 'Ausente9', matches: 1 },
      ],
      withheld: 0,
    }),
  );

  const G = { action: 'goto', path: '/scoped' };
  const H = { action: 'expect_visible', role: 'heading', name: 'Painel' };
  const A = { role: 'region', name: 'Grupo A' };
  const B = { role: 'region', name: 'Grupo B' };
  /** @param {string} title @param {string} line @param {any[]} steps */
  const C = (title, line, steps) => ({ title, manual: ['1. Open the page Painel.', `2. ${line}`], steps: [G, H, ...steps] });
  /** @param {string} who */
  const logIs = (who) => ({ action: 'expect_text', text: `clicked ${who}`, contains: who });
  /** @param {any} method */
  const req = (method) => ({ action: 'expect_requests', method, url_contains: '/api/perfil', count: 1 });
  const defs = [
    C('Report word, no snapshot', 'Click Salvar and see clicked b-salvar.', [{ action: 'click', role: 'button', name: 'Salvar' }, logIs('b-salvar')]),
    C('Report word, zero matches', 'Click Inexistente.', [{ action: 'click', role: 'button', name: 'Inexistente' }]),
    C('Neither report nor snapshot', 'Open the group.', [{ action: 'click', role: 'button', name: 'Fantasma3' }]),
    C('Within picks the group', 'In Grupo B click Excluir and see clicked b-excluir.', [{ action: 'click', within: B, role: 'button', name: 'Excluir' }, logIs('b-excluir')]),
    C('Unscoped twin is not acted on', 'Click Excluir.', [{ action: 'click', role: 'button', name: 'Excluir' }]),
    C('Scoped absence passes', 'In Grupo B the button Remover is not shown.', [{ action: 'expect_not_visible', within: B, role: 'button', name: 'Remover' }]),
    C('Scoped absence fails when visible', 'In Grupo A the button Remover is not shown.', [{ action: 'expect_not_visible', within: A, role: 'button', name: 'Remover' }]),
    C('Scoped absence, missing scope', 'In Grupo Z the button Remover is not shown.', [{ action: 'expect_not_visible', within: { role: 'region', name: 'Grupo Z' }, role: 'button', name: 'Remover' }]),
    C('Prefix matches the live count', 'The Alunos header is collapsed.', [{ action: 'expect_state', role: 'button', name_prefix: 'Alunos', state: 'expanded', equals: false }]),
    C('Prefix, wrong state fails', 'The Alunos header is expanded.', [{ action: 'expect_state', role: 'button', name_prefix: 'Alunos', state: 'expanded', equals: true }]),
    C('Prefix is not a substring', 'The header unos is collapsed.', [{ action: 'expect_state', role: 'button', name_prefix: 'unos', state: 'expanded', equals: false }]),
    C('Label text, one input', 'Type ana in E-mail* and see it holds ana.', [{ action: 'fill', label_text: 'E-mail*', value: 'ana' }, { action: 'expect_value', label_text: 'E-mail*', equals: 'ana' }]),
    C('Label text, two inputs', 'Type 1199 in Telefone*.', [{ action: 'fill', label_text: 'Telefone*', value: '1199' }]),
    C('Index picks the Nth', 'In Grupo A click the second button and see clicked a-1.', [{ action: 'click', within: A, role: 'button', index: 1 }, logIs('a-1')]),
    C('Index past the last', 'In Grupo A click the ninth button.', [{ action: 'click', within: A, role: 'button', index: 8 }]),
    C('Scope word not from the report', 'Click Salvar.', [{ action: 'click', within: { role: 'region', name: 'Grupo Q' }, role: 'button', name: 'Salvar' }]),
    C('Scoped hidden target fails', 'In Grupo B see Fantasma.', [{ action: 'expect_visible', within: B, role: 'button', name: 'Fantasma' }]),
    C('Method set counts a PATCH', 'Click Gravar and see one PATCH to /api/perfil.', [{ action: 'click', role: 'button', name: 'Gravar' }, req(['POST', 'PATCH', 'PUT'])]),
    C('Method set without the method fails', 'Click Gravar and see no POST to /api/perfil.', [{ action: 'click', role: 'button', name: 'Gravar' }, req(['POST', 'PUT'])]),
    // Controls: the element is a snapshot entry with matches 1, so the 0.46.0 outcomes hold (no run-time re-resolution).
    {
      title: 'Control, snapshot-grounded positive step on a missing element',
      manual: ['1. Open the page.', '2. Check the page.'],
      steps: [{ action: 'goto', path: '/plain' }, H, { action: 'expect_visible', role: 'button', name: 'Fantasma9' }],
    },
    {
      title: 'Control, snapshot-grounded click on a missing element',
      manual: ['1. Open the page.', '2. Check the page.'],
      steps: [{ action: 'goto', path: '/plain' }, H, { action: 'click', role: 'button', name: 'Ausente9' }],
    },
  ];
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, class: 'automatable', driver: 'browser', role: null, state: 'none', steps: d.steps })) }));

  const run = await runRunner(root);
  assert.equal(run.code, 0, `the runner exited ${run.code}: ${run.stderr}`);
  const res = JSON.parse(readFileSync(join(runDir, 'results.json'), 'utf8'));
  const c = res.cases;
  const brief = (/** @type {any} */ x) => JSON.stringify([x.outcome, x.reason_code, x.reason]);

  /** @type {[string, string | null][]} */
  const want = [
    ['pass', null], ['needs-human', 'STEP_UNGROUNDED'], ['needs-human', 'PLAN_ENTRY_INVALID'], ['pass', null], ['needs-human', 'STEP_UNGROUNDED'],
    ['pass', null], ['fail', null], ['needs-human', 'STEP_UNGROUNDED'], ['pass', null], ['fail', null],
    ['needs-human', 'STEP_UNGROUNDED'], ['pass', null], ['needs-human', 'STEP_UNGROUNDED'], ['pass', null], ['needs-human', 'STEP_UNGROUNDED'],
    ['needs-human', 'PLAN_ENTRY_INVALID'], ['fail', null], ['pass', null], ['fail', null],
    ['fail', null], ['blocked', 'STEP_NOT_PERFORMABLE'],
  ];
  assert.equal(c.length, want.length);
  c.forEach((/** @type {any} */ x, /** @type {number} */ i) => {
    assert.equal(x.outcome === want[i][0] && (x.reason_code ?? null) === want[i][1], true, `case ${i + 1} (${defs[i].title}): ${brief(x)}`);
  });
  assert.deepEqual(validateResults(res), []);

  // The reasons: fixed sentences that name a position and never a locator word.
  assert.match(c[1].reason, /^step 3: the locator matched no element at run time/);
  assert.match(c[2].reason, /^step 3:/);
  assert.match(c[4].reason, /^step 3: the locator matched 2 elements at run time/);
  assert.equal(c[6].reason, 'step 3: the element was still visible');
  assert.match(c[7].reason, /^step 3: the scope matched 0 elements at run time/);
  assert.equal(c[9].reason, 'step 3: the expanded state did not equal the declared value');
  assert.match(c[10].reason, /^step 3: the locator matched no element at run time/, 'a middle-substring prefix matches nothing');
  assert.match(c[12].reason, /^step 3: the locator matched no element at run time/, 'a container with two inputs matches nothing');
  assert.match(c[14].reason, /^step 3: the index is past the last matching element of the scope \(4 found\)/);
  assert.match(c[15].reason, /^step 3:/);
  assert.equal(c[16].reason, 'step 3: the target was present but not visible to a person (opacity or visibility hides it)');
  assert.equal(c[18].reason, 'step 4: the page issued 0 matching request(s); 1 were expected');
  assert.match(c[19].reason, /^step 3:/, 'a snapshot-grounded positive step on a missing element fails at that step, as in 0.46.0');
  assert.match(c[20].reason, /^step 3:/);
  for (const x of c) {
    if (typeof x.reason === 'string') {
      assert.ok(!/Inexistente|Fantasma|Grupo|Remover|Alunos|Telefone|Excluir|Salvar|Gravar|Ausente/.test(x.reason), `a reason echoes a locator word: ${x.reason}`);
    }
  }
  // A case that ended STEP_UNGROUNDED or PLAN_ENTRY_INVALID did nothing to the page after the failing step, and the two controls are not ungrounded.
  assert.notEqual(c[19].reason_code, 'STEP_UNGROUNDED');
  assert.equal(c[19].steps[2].result, 'failed');
  assert.equal(c[1].steps[2].result, 'failed');
  assert.equal((c[2].steps ?? []).some((/** @type {any} */ st) => st.result === 'passed'), false, 'a plan defect is refused before any step ran');

  // The page's own record of what was clicked: exactly the passing cases acted, once each; the ungrounded ones acted not at all.
  await new Promise((r) => setTimeout(r, 300));
  assert.deepEqual(hits, { 'b-salvar': 1, 'b-excluir': 1, 'a-1': 1 }, `the page saw clicks other than the three scoped passes: ${JSON.stringify(hits)}`);

  // The comparison evidence of the scoped expect_value holds the locator keys of the plan and never the compared value.
  const valueEvidence = c[11].evidence.find((/** @type {any} */ e) => String(e).endsWith('.value-4.json'));
  assert.ok(valueEvidence, JSON.stringify(c[11].evidence));
  const record = readFileSync(join(root, ...String(valueEvidence).split('/')), 'utf8');
  assert.deepEqual(JSON.parse(record).locator, { label_text: 'E-mail*' });
  assert.ok(!record.includes('ana'), 'the compared value reached the evidence file');

  // The method array is recorded as given.
  const requestEvidence = c[17].evidence.find((/** @type {any} */ e) => String(e).endsWith('.requests-4.json'));
  assert.ok(requestEvidence, JSON.stringify(c[17].evidence));
  const requests = JSON.parse(readFileSync(join(root, ...String(requestEvidence).split('/')), 'utf8'));
  assert.deepEqual([requests.method, requests.observed], [['POST', 'PATCH', 'PUT'], 1]);
  assert.ok(existsSync(join(root, ...String(requestEvidence).split('/'))));
  // The failing method-set case records the same array and zero observed requests.
  const failedRequests = c[18].evidence.find((/** @type {any} */ e) => String(e).endsWith('.requests-4.json'));
  assert.ok(failedRequests, JSON.stringify(c[18].evidence));
  const failed = JSON.parse(readFileSync(join(root, ...String(failedRequests).split('/')), 'utf8'));
  assert.deepEqual([failed.method, failed.observed], [['POST', 'PUT'], 0]);
});
