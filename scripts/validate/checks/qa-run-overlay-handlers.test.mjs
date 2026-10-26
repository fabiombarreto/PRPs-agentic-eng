// @ts-check
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-12 Overlay handlers declared in the project kit (a declared trigger is dismissed before the action, every dismissal is recorded by id, step and a closed result word, an undeclared overlay is untouched and a click it blocks stays covered, a malformed declaration is refused by name before any request, ground registers the same handlers)
// PRPs/prds/qa-runner-vocabulary-v4.prd.md AC-13 A write-effect handler only for a dedicated role and never off the approved origin (a non-dedicated role skips it and the run says why; a dismissal that leaves the guard-approved origin blocks the case FAILED_NON_LOCAL_TARGET; no forced click)
/**
 * Phase 6 (overlay handlers) of qa-runner-vocabulary-v4.
 *
 * Source PRD:  PRPs/prds/qa-runner-vocabulary-v4.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-vocabulary-v4-phase-6-overlay-handlers.plan.md
 *              (AC-A1 dismissal and record, AC-A2 ground, AC-A3 undeclared overlay stays covered, AC-A4 dedicated-role
 *              gate, AC-A5 off-origin block and no forced click, AC-A6 malformed declaration)
 *
 * Layers:
 *   1. Pure: classifyOverlayHandlers (accept and refuse tables, the dedicated split, fixed sentences that echo no
 *      declared word), overlayUrlApproved, summarizeOverlayWatch (closed keys only).
 *   2. registerOverlayHandlers against a fake page: one registration per handler with only a bounded `times`, a
 *      bounded non-forced dismissal click, a failed dismissal recorded and never thrown or kept, the off-origin
 *      detection, a page without addLocatorHandler refused with null.
 *   3. The REAL runner (`run` and `ground`) against a loopback page with a tour-like and a panel-like overlay and a real
 *      Chromium: what the page itself received is the proof that a write dismissal ran or did not.
 *
 * The runner is spawned from its real path with cwd set to a temp target root; the temp root holds no node_modules
 * link, so cleanup never reaches the repository.
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
// ABSOLUTE: the runner is spawned with cwd set to a temp root.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'f';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/r1`;
const SLOW = { timeout: 300000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v4p6-overlay-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

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
// 1. classifyOverlayHandlers
// ---------------------------------------------------------------------------

const TOUR = { id: 'tour', trigger: { role: 'dialog', name: 'Bem-vindo' }, dismiss: { text: 'Fechar tour' } };
const SAVE = { id: 'save-banner', trigger: { text: 'Salvar?' }, dismiss: { role: 'button', name: 'Salvar e fechar' }, effect: 'write' };
const WORD = 'Zxq-secret-word';
/** @param {any} decl @param {any} [dedicated] */
const classify = (decl, dedicated = false) => /** @type {any} */ (R.classifyOverlayHandlers)(decl, dedicated);

test('AC-12 no declaration, or an empty one, is valid and registers nothing', () => {
  assert.deepEqual(classify(undefined), { ok: true, handlers: [], skipped: [] });
  assert.deepEqual(classify([]), { ok: true, handlers: [], skipped: [] });
});

test('AC-12 AC-13 a valid declaration yields plain copies in declaration order; a write handler is skipped with the fixed sentence unless the role is strictly dedicated', () => {
  const plain = classify([TOUR, SAVE], false);
  assert.deepEqual(plain, {
    ok: true,
    handlers: [{ id: 'tour', trigger: { role: 'dialog', name: 'Bem-vindo' }, dismiss: { text: 'Fechar tour' }, effect: null }],
    skipped: [{ id: 'save-banner', reason: R.OVERLAY_WRITE_SKIP_REASON }],
  });
  assert.equal(R.OVERLAY_WRITE_SKIP_REASON, 'a write-effect handler is not registered: the role is not declared dedicated');
  const ded = classify([TOUR, SAVE], true);
  assert.deepEqual(ded.handlers.map((/** @type {any} */ h) => [h.id, h.effect]), [['tour', null], ['save-banner', 'write']]);
  assert.deepEqual(ded.skipped, []);
  for (const notDedicated of ['true', 1, undefined, null, {}]) {
    assert.deepEqual(classify([TOUR, SAVE], notDedicated).skipped.map((/** @type {any} */ s) => s.id), ['save-banner'], `only the boolean true counts as dedicated: ${String(notDedicated)}`);
  }
  assert.notEqual(ded.handlers[0].trigger, TOUR.trigger, 'plain copies, not the caller objects');
  assert.equal(R.OVERLAY_HANDLERS_MAX, 10);
  const ten = Array.from({ length: 10 }, (_, k) => ({ ...TOUR, id: `h${k}` }));
  assert.equal(classify(ten).ok, true, 'ten entries are allowed');
});

test('AC-12 a malformed declaration is refused with OVERLAY_HANDLER_INVALID and a fixed sentence that never echoes a declared word, for a dedicated and a plain role alike', () => {
  const many = Array.from({ length: 11 }, (_, k) => ({ ...TOUR, id: `h${k}` }));
  /** @type {[string, any][]} */
  const bad = [
    ['not an array (string)', 'x'],
    ['not an array (object)', {}],
    ['null', null],
    ['eleven entries', many],
    ['null entry', [null]],
    ['array entry', [[]]],
    ['extra key', [{ ...TOUR, extra: 1 }]],
    ['id missing', [{ trigger: TOUR.trigger, dismiss: TOUR.dismiss }]],
    ['trigger missing', [{ id: TOUR.id, dismiss: TOUR.dismiss }]],
    ['dismiss missing', [{ id: TOUR.id, trigger: TOUR.trigger }]],
    ['id with a space', [{ ...TOUR, id: `bad ${WORD}` }]],
    ['empty id', [{ ...TOUR, id: '' }]],
    ['numeric id', [{ ...TOUR, id: 7 }]],
    ['id starting with a hyphen', [{ ...TOUR, id: `-${WORD}` }]],
    ['id of 41 characters', [{ ...TOUR, id: 'a'.repeat(41) }]],
    ['repeated id', [TOUR, { ...TOUR }]],
    ['role without a name', [{ ...TOUR, trigger: { role: 'dialog' } }]],
    ['scoped trigger (within)', [{ ...TOUR, trigger: { role: 'dialog', name: WORD, within: { role: 'dialog', name: 'B' } } }]],
    ['unsupported role', [{ ...TOUR, trigger: { role: 'nonsense', name: WORD } }]],
    ['text with a name', [{ ...TOUR, trigger: { text: WORD, name: 'B' } }]],
    ['blank text', [{ ...TOUR, trigger: { text: '   ' } }]],
    ['index on a trigger', [{ ...TOUR, trigger: { role: 'dialog', name: WORD, index: 0 } }]],
    ['selector dismiss', [{ ...TOUR, dismiss: { selector: `#${WORD}` } }]],
    ['empty dismiss', [{ ...TOUR, dismiss: {} }]],
    ['string dismiss', [{ ...TOUR, dismiss: 'Fechar' }]],
    ['name_prefix dismiss', [{ ...TOUR, dismiss: { role: 'button', name: WORD, name_prefix: 'F' } }]],
    ['label_text dismiss', [{ ...TOUR, dismiss: { label_text: WORD } }]],
    ['effect validation', [{ ...TOUR, effect: 'validation' }]],
    ['effect true', [{ ...TOUR, effect: true }]],
    ['effect with a word', [{ ...TOUR, effect: `Write ${WORD}` }]],
  ];
  for (const [label, decl] of bad) {
    for (const dedicated of [false, true]) {
      const r = classify(decl, dedicated);
      assert.equal(r.ok, false, label);
      assert.equal(r.code, 'OVERLAY_HANDLER_INVALID', label);
      assert.match(r.reason, /^overlay_handlers /, `${label}: ${r.reason}`);
      assert.ok(!r.reason.includes(WORD) && !r.reason.includes('Bem-vindo') && !r.reason.includes('Fechar'), `${label}: a reason echoes a declared word: ${r.reason}`);
    }
  }
  assert.equal(classify(many).reason, 'overlay_handlers allows at most 10 entries');
  assert.match(classify([TOUR, { ...TOUR, id: 'second', dismiss: {} }]).reason, /^overlay_handlers entry 2: /, 'the reason names the one-based position');
  assert.match(classify([TOUR, { ...TOUR }]).reason, /entry 2: id repeats an earlier entry/);
  assert.match(classify([{ ...SAVE, trigger: { role: 'dialog' } }], false).reason, /entry 1: /, 'a write handler that will be skipped is still validated');
});

// ---------------------------------------------------------------------------
// 2. overlayUrlApproved and summarizeOverlayWatch
// ---------------------------------------------------------------------------

const TARGET = { origin: 'http://127.0.0.1:9', allowedHosts: new Set(['127.0.0.1']), guard: { isAllowedHost: (/** @type {string} */ h, /** @type {Set<string>} */ s) => s.has(h) } };

test('AC-13 overlayUrlApproved approves only inline schemes and the approved origin on an allowed host', () => {
  const approved = /** @type {any} */ (R.overlayUrlApproved);
  for (const ok of ['http://127.0.0.1:9/p?q=1', 'about:blank', 'data:text/html,x', 'blob:http://127.0.0.1:9/abc']) assert.equal(approved(ok, TARGET), true, ok);
  for (const no of ['http://localhost:9/away', 'http://127.0.0.1:10/p', 'https://127.0.0.1:9/p', 'http://evil.test/', 'not a url', '', null, undefined, 7]) {
    assert.equal(approved(no, TARGET), false, String(no));
  }
});

test('AC-12 summarizeOverlayWatch copies closed keys only and treats non-arrays as empty', () => {
  const summarize = /** @type {any} */ (R.summarizeOverlayWatch);
  assert.deepEqual(
    summarize(['tour'], [{ id: 's', reason: 'r', extra: 1 }], [{ handler: 'tour', step: 2, result: 'dismissed', text: 'page text' }]),
    { action: 'overlay_handlers', registered: ['tour'], skipped: [{ handler: 's', reason: 'r' }], firings: [{ handler: 'tour', step: 2, result: 'dismissed' }] },
  );
  assert.deepEqual(summarize(null, undefined, 'x'), { action: 'overlay_handlers', registered: [], skipped: [], firings: [] });
});

// ---------------------------------------------------------------------------
// 3. registerOverlayHandlers with a fake page
// ---------------------------------------------------------------------------

const HANDLERS = [
  { id: 'tour', trigger: { role: 'dialog', name: 'Bem-vindo' }, dismiss: { text: 'Fechar tour' }, effect: null },
  { id: 'panel', trigger: { text: 'Painel dev' }, dismiss: { role: 'button', name: 'Fechar painel' }, effect: null },
];

const freshPage = () => {
  /** @type {any} */
  const st = { reg: [], clicks: [], listeners: {}, url: 'http://127.0.0.1:9/p', fail: false, onClick: null };
  const loc = (/** @type {string} */ kind, /** @type {any} */ a, /** @type {any} */ b) => ({
    kind, a, b,
    click: async (/** @type {any} */ o) => {
      st.clicks.push({ kind, a, b, o });
      if (st.fail) throw new Error('boom page text');
      if (st.onClick) st.onClick();
    },
  });
  st.page = {
    getByRole: (/** @type {string} */ role, /** @type {any} */ o) => loc('role', role, o),
    getByText: (/** @type {string} */ t, /** @type {any} */ o) => loc('text', t, o),
    addLocatorHandler: async (/** @type {any} */ l, /** @type {any} */ fn, /** @type {any} */ opts) => { st.reg.push({ l, fn, opts }); },
    on: (/** @type {string} */ ev, /** @type {any} */ fn) => { st.listeners[ev] = fn; },
    url: () => st.url,
    mainFrame: () => 'MAIN',
  };
  return st;
};
const register = (/** @type {any} */ page) => /** @type {any} */ (R.registerOverlayHandlers)(page, HANDLERS, TARGET);

test('AC-12 a page that cannot register locator handlers is refused with null, never silently accepted', async () => {
  assert.equal(await register({ getByRole() {}, getByText() {} }), null);
});

test('AC-12 AC-13 each handler is registered once with only a bounded times, and a dismissal is one bounded, non-forced click recorded by id, step and result word', async () => {
  const A = freshPage();
  const w = await register(A.page);
  assert.deepEqual(w.registered, ['tour', 'panel']);
  assert.equal(A.reg.length, 2, 'one registration per handler');
  assert.deepEqual(A.reg[0].opts, { times: R.OVERLAY_HANDLER_TIMES }, 'no option beyond the bounded times');
  assert.equal(R.OVERLAY_HANDLER_TIMES, 25);
  assert.deepEqual([A.reg[0].l.kind, A.reg[0].l.a, A.reg[0].l.b], ['role', 'dialog', { name: 'Bem-vindo', exact: true }]);
  assert.deepEqual([A.reg[1].l.kind, A.reg[1].l.a, A.reg[1].l.b], ['text', 'Painel dev', { exact: true }]);
  assert.equal(Object.keys(A.listeners).join(), 'request', 'one request listener for the whole page');
  assert.equal(w.offOriginAt(), null);
  assert.deepEqual(w.firings(), []);
  w.setStep(3);
  await A.reg[0].fn();
  assert.deepEqual(w.firings(), [{ handler: 'tour', step: 3, result: 'dismissed' }]);
  assert.equal(A.clicks.length, 1);
  assert.deepEqual([A.clicks[0].kind, A.clicks[0].a, A.clicks[0].o], ['text', 'Fechar tour', { timeout: R.OVERLAY_DISMISS_TIMEOUT_MS }]);
  assert.equal(R.OVERLAY_DISMISS_TIMEOUT_MS, 3000);
  assert.ok(!('force' in A.clicks[0].o), 'a dismissal is never forced');
  // The firings view is a copy.
  w.firings().push({ handler: 'x', step: 9, result: 'dismissed' });
  assert.equal(w.firings().length, 1);
});

test('AC-12 a dismissal that throws is recorded as dismiss_failed, never rethrown, and its error text is not kept', async () => {
  const B = freshPage();
  const wb = await register(B.page);
  B.fail = true;
  wb.setStep(4);
  await B.reg[1].fn();
  assert.deepEqual(wb.firings(), [{ handler: 'panel', step: 4, result: 'dismiss_failed' }]);
  assert.ok(!JSON.stringify(wb.firings()).includes('page text'));
});

test('AC-13 a dismissal that leaves the approved origin is noted at its step, by the page URL or by a main-frame navigation request issued while a handler runs; the first step is kept', async () => {
  const C = freshPage();
  const wc = await register(C.page);
  C.onClick = () => { C.url = 'http://localhost:9/away'; };
  wc.setStep(5);
  await C.reg[0].fn();
  assert.equal(wc.offOriginAt(), 5);

  const D = freshPage();
  const wd = await register(D.page);
  const nav = (/** @type {string} */ url, isNav = true, frame = 'MAIN') => ({ isNavigationRequest: () => isNav, frame: () => frame, url: () => url });
  D.listeners.request(nav('http://evil.test/'));
  assert.equal(wd.offOriginAt(), null, 'a request outside a handler run is not a dismissal');
  D.onClick = () => {
    D.listeners.request(nav('http://127.0.0.1:9/ok'));
    D.listeners.request(nav('http://evil.test/x', false));
    D.listeners.request(nav('http://evil.test/x', true, 'SUB'));
  };
  wd.setStep(2);
  await D.reg[0].fn();
  assert.equal(wd.offOriginAt(), null, 'same-origin, non-navigation and sub-frame requests are not off-origin');
  D.onClick = () => { D.listeners.request(nav('http://evil.test/x')); };
  wd.setStep(6);
  await D.reg[0].fn();
  assert.equal(wd.offOriginAt(), 6);
  wd.setStep(7);
  await D.reg[1].fn();
  assert.equal(wd.offOriginAt(), 6, 'the first off-origin step is kept');
});

// ---------------------------------------------------------------------------
// 4. The real runner against a loopback page and a real Chromium
// ---------------------------------------------------------------------------

/** @type {Record<string, number>} */
const hits = {};
const total = () => Object.values(hits).reduce((a, b) => a + b, 0);
/** @type {import('node:http').Server} */
let server;
let port = 0;
let base = '';

const dialog = (/** @type {string} */ label, /** @type {string} */ button, /** @type {string} */ js) =>
  `<div role="dialog" aria-label="${label}" style="position:fixed;inset:0;background:#fffe;z-index:10"><button onclick="${js}this.parentNode.remove()">${button}</button></div>`;
const pageWith = (/** @type {string} */ overlay) =>
  `<!doctype html><html><body><h1>Panel</h1><button onclick="document.body.insertAdjacentHTML(&quot;beforeend&quot;,&quot;<p role=status>Continuado</p>&quot;)">Continuar</button>${overlay}</body></html>`;
const pageFor = (/** @type {string} */ p) =>
  /** @type {Record<string, string>} */ ({
    '/tour': pageWith(dialog('Bem-vindo', 'Fechar tour', '')),
    '/undeclared': pageWith(dialog('Painel dev', 'Fechar painel', '')),
    '/prefs': pageWith(dialog('Salvar preferências?', 'Salvar e fechar', 'fetch(&quot;/api/prefs&quot;,{method:&quot;POST&quot;});')),
    '/leave': pageWith(dialog('Saída', 'Sair agora', `location.href=&quot;http://localhost:${port}/away&quot;;`)),
    '/away': '<!doctype html><html><body><h1>Away</h1></body></html>',
  })[p];

before(async () => {
  server = createServer((req, res) => {
    const p = new URL(String(req.url), 'http://x').pathname;
    const key = `${req.method} ${p}`;
    hits[key] = (hits[key] ?? 0) + 1;
    if (p === '/api/prefs') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(pageFor(p) ?? '<!doctype html><html><body><h1>x</h1></body></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {any} */ (server.address()).port;
  base = `http://127.0.0.1:${port}`;
});
after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

const HANDLERS_DECL = [
  { id: 'tour', trigger: { role: 'dialog', name: 'Bem-vindo' }, dismiss: { role: 'button', name: 'Fechar tour' } },
  { id: 'save-banner', trigger: { role: 'dialog', name: 'Salvar preferências?' }, dismiss: { role: 'button', name: 'Salvar e fechar' }, effect: 'write' },
  { id: 'leave', trigger: { role: 'dialog', name: 'Saída' }, dismiss: { role: 'button', name: 'Sair agora' } },
];
const OVERLAY_WORDS = /Bem-vindo|Fechar tour|Salvar e fechar|Sair agora|Saída|Salvar preferências/;

/** @param {any} seed @returns {string} the target root */
function makeRoot(seed) {
  const root = realpathSync(mkdtempSync(join(SANDBOX, 'root-')));
  mkdirSync(join(root, ...RUN_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-run', 'g1'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: base, roles: { admin: { dedicated: true }, viewer: {} } }));
  for (const role of ['admin', 'viewer']) {
    writeFileSync(join(root, 'PRPs', 'auth', `login-${role}.mjs`), [
      'import { writeFileSync, mkdirSync } from "node:fs";',
      'import { join } from "node:path";',
      'const root = process.argv[process.argv.indexOf("--root") + 1];',
      'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
      `writeFileSync(join(root, "PRPs", "auth", ".sessions", "${role}.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "tok-p6-fixture", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
    ].join('\n'));
  }
  writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify(seed));
  return root;
}

/** @param {string} root @param {string[]} args @returns {Promise<{ code: number | null, out: string }>} */
function go(root, args) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, ...args], { cwd: root, env: { ...process.env, ...GIT_ENV }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => child.kill(), 270000);
    child.on('error', (e) => { clearTimeout(timer); rejectP(e); });
    child.on('close', (code) => { clearTimeout(timer); resolveP({ code, out }); });
  });
}

/** @param {string} root @param {any[]} cases */
function writeCases(root, cases) {
  const manual = '1. Open the page, click Continuar and see Continuado';
  const block = (/** @type {number} */ i) => [`### Case ${i}`, `**Title:** Case ${i} title`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', manual, ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${cases.map((_, i) => block(i + 1)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(root, ...RUN_REL.split('/'), 'plan.json'), JSON.stringify({
    schema_version: 1,
    cases: cases.map((c, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: 'browser', role: c.role, state: 'none', steps: c.steps })),
  }));
}

const flow = (/** @type {string} */ path) => [{ action: 'goto', path }, { action: 'click', role: 'button', name: 'Continuar' }, { action: 'expect_visible', text: 'Continuado' }];
const brief = (/** @type {any} */ k) => JSON.stringify([k.outcome, k.reason_code, k.reason]);

/** @param {string} root @param {RegExp} re @returns {any} */
function evidenceOf(root, re) {
  const dir = join(root, ...RUN_REL.split('/'));
  const f = readdirSync(dir, { recursive: true }).map(String).find((x) => re.test(x.split('\\').join('/')));
  if (!f) return null;
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  return j.value ?? j;
}

/** @type {Promise<{ root: string, results: any, code: number | null, hitsAfter: Record<string, number> }> | null} */
let mainRun = null;
function runMain() {
  mainRun ??= (async () => {
    const root = makeRoot({ overlay_handlers: HANDLERS_DECL });
    writeCases(root, [
      { role: 'admin', steps: flow('/tour') },
      { role: 'admin', steps: flow('/undeclared') },
      { role: 'admin', steps: flow('/prefs') },
      { role: 'viewer', steps: flow('/prefs') },
      // The trailing goto would reach the server if anything acted after the dismissal left the origin.
      { role: 'admin', steps: [...flow('/leave'), { action: 'goto', path: '/after-leave' }] },
    ]);
    const ran = await go(root, ['run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL]);
    await new Promise((r) => setTimeout(r, 700));
    const file = join(root, ...RUN_REL.split('/'), 'results.json');
    assert.ok(existsSync(file), `no results.json, runner exit ${ran.code}: ${ran.out}`);
    return { root, results: JSON.parse(readFileSync(file, 'utf8')), code: ran.code, hitsAfter: { ...hits } };
  })();
  return mainRun;
}

test('AC-12 a declared tour is dismissed before the click, the case passes, and the dismissal is recorded by handler id, step position and a closed result word with no locator word', SLOW, async () => {
  const { root, results } = await runMain();
  const c = results.cases;
  assert.notEqual(c[0].reason_code, 'FAILED_BROWSER_UNAVAILABLE', 'Chromium must launch for this suite');
  assert.equal(c[0].outcome, 'pass', brief(c[0]));
  const e1 = evidenceOf(root, /case-1\.overlay\.json$/);
  assert.ok(e1, 'case 1 wrote its overlay evidence');
  assert.deepEqual(e1.firings, [{ handler: 'tour', step: 2, result: 'dismissed' }]);
  assert.deepEqual(e1.registered, ['tour', 'save-banner', 'leave']);
  assert.deepEqual(e1.skipped, []);
  assert.deepEqual(Object.keys(e1).sort(), ['action', 'firings', 'registered', 'skipped']);
  assert.ok(!OVERLAY_WORDS.test(JSON.stringify(e1)), 'no locator word or page text in the overlay evidence');
  assert.ok((c[0].evidence ?? []).some((/** @type {any} */ p) => String(p).endsWith('case-1.overlay.json')), 'the overlay file is part of the case evidence');
  assert.deepEqual(validateResults(results), []);
});

test('AC-12 an overlay with no declared handler is left alone: the click it blocks ends blocked STEP_NOT_PERFORMABLE with cause covered, and no overlay file is written', SLOW, async () => {
  const { root, results } = await runMain();
  const k = results.cases[1];
  assert.equal(k.outcome, 'blocked', brief(k));
  assert.equal(k.reason_code, 'STEP_NOT_PERFORMABLE');
  assert.match(k.reason, /another element covered it at the action point/);
  assert.equal(evidenceOf(root, /case-2\.overlay\.json$/), null, 'nothing fired and nothing was skipped: no overlay file');
});

test('AC-13 a write-effect handler fires for the dedicated role (the page received the write) and is skipped for a non-dedicated role, which records why and ends covered', SLOW, async () => {
  const { root, results, hitsAfter } = await runMain();
  const c = results.cases;
  assert.equal(c[2].outcome, 'pass', brief(c[2]));
  assert.deepEqual(evidenceOf(root, /case-3\.overlay\.json$/).firings, [{ handler: 'save-banner', step: 2, result: 'dismissed' }]);
  assert.equal(hitsAfter['POST /api/prefs'], 1, 'only the dedicated role persisted the preference, exactly once');
  assert.equal(c[3].outcome, 'blocked', brief(c[3]));
  assert.equal(c[3].reason_code, 'STEP_NOT_PERFORMABLE');
  assert.match(c[3].reason, /another element covered it at the action point/);
  const e4 = evidenceOf(root, /case-4\.overlay\.json$/);
  assert.deepEqual(e4.registered, ['tour', 'leave']);
  assert.deepEqual(e4.skipped, [{ handler: 'save-banner', reason: R.OVERLAY_WRITE_SKIP_REASON }]);
  assert.deepEqual(e4.firings, []);
});

test('AC-13 a dismissal that navigates off the approved origin ends the case blocked FAILED_NON_LOCAL_TARGET at its step, nothing further acts, and the firing is recorded', SLOW, async () => {
  const { root, results, hitsAfter } = await runMain();
  const k = results.cases[4];
  assert.equal(k.outcome, 'blocked', brief(k));
  assert.equal(k.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.match(k.reason, /^step 2: an overlay dismissal left the guard-approved origin/);
  assert.deepEqual(evidenceOf(root, /case-5\.overlay\.json$/).firings.map((/** @type {any} */ f) => [f.handler, f.step]), [['leave', 2]]);
  assert.equal(hitsAfter['GET /after-leave'], undefined, 'nothing further acted: the step after the dismissal never reached the server');
  assert.ok(!k.steps.some((/** @type {any} */ s, /** @type {number} */ i) => i >= 2 && s.result === 'passed'), 'no step after the dismissal passed');
});

test('AC-12 no case reason in the run names a declared locator word or page text', SLOW, async () => {
  const { results } = await runMain();
  for (const k of results.cases) {
    if (typeof k.reason === 'string') assert.ok(!OVERLAY_WORDS.test(k.reason), `a reason echoes an overlay word: ${k.reason}`);
  }
});

/** @param {string} root @param {RegExp} re @returns {any[]} */
function snapshotEntries(root, re) {
  const d = join(root, 'PRPs', 'reports', FEATURE, 'qa-run', 'g1', 'grounding');
  const f = readdirSync(d).find((x) => re.test(x));
  assert.ok(f, `no snapshot matching ${re}`);
  return JSON.parse(readFileSync(join(d, f), 'utf8')).entries;
}
const GROUND_BASE = (/** @type {string} */ root) => ['ground', '--root', root, '--feature', FEATURE, '--run-dir', 'PRPs/reports/f/qa-run/g1'];

test('AC-12 ground on a plain route dismisses a declared load-time overlay before the snapshot, prints one fixed line per firing and per skipped handler before GROUNDED, and leaves an undeclared overlay in the snapshot', SLOW, async () => {
  const root = makeRoot({ overlay_handlers: HANDLERS_DECL });
  const g1 = await go(root, [...GROUND_BASE(root), '--route', '/tour']);
  assert.equal(g1.code, 0, g1.out);
  assert.match(g1.out, /OVERLAY_DISMISSED: tour step 0 dismissed\n/);
  assert.match(g1.out, /OVERLAY_HANDLER_SKIPPED: save-banner\n/);
  assert.ok(g1.out.indexOf('OVERLAY_DISMISSED') < g1.out.indexOf('GROUNDED:'), 'the lines precede GROUNDED');
  assert.ok(g1.out.indexOf('OVERLAY_HANDLER_SKIPPED') < g1.out.indexOf('GROUNDED:'));
  assert.ok(!OVERLAY_WORDS.test(g1.out), `ground output names a locator word or page text: ${g1.out}`);
  const entries = snapshotEntries(root, /tour/);
  assert.ok(entries.some((e) => e.name === 'Continuar'), 'the page content is grounded');
  assert.ok(!entries.some((e) => e.name === 'Fechar tour'), 'the declared tour was dismissed before the snapshot');

  const g2 = await go(root, [...GROUND_BASE(root), '--route', '/undeclared']);
  assert.equal(g2.code, 0, g2.out);
  assert.ok(!g2.out.includes('OVERLAY_DISMISSED'), 'nothing declared matched, nothing is reported');
  assert.ok(snapshotEntries(root, /undeclared/).some((e) => e.name === 'Fechar painel'), 'an undeclared overlay is left alone');
});

test('AC-12 ground --prefix records the dismissal at the replay step whose click triggered it', SLOW, async () => {
  const root = makeRoot({ overlay_handlers: HANDLERS_DECL });
  const g3 = await go(root, [...GROUND_BASE(root), '--route', '/tour', '--prefix', JSON.stringify([{ action: 'click', role: 'button', name: 'Continuar' }])]);
  assert.equal(g3.code, 0, g3.out);
  assert.match(g3.out, /OVERLAY_DISMISSED: tour step 1 dismissed\n/);
  assert.ok(g3.out.indexOf('OVERLAY_DISMISSED') < g3.out.indexOf('GROUNDED:'));
});

test('AC-12 with no declaration, ground prints no overlay line', SLOW, async () => {
  const root = makeRoot({});
  const g = await go(root, [...GROUND_BASE(root), '--route', '/tour']);
  assert.equal(g.code, 0, g.out);
  assert.ok(!g.out.includes('OVERLAY_'), g.out);
  assert.match(g.out, /GROUNDED:/);
});

test('AC-12 a malformed declaration ends a browser case blocked OVERLAY_HANDLER_INVALID before any request, and makes ground exit non-zero with the same code and no declared word', SLOW, async () => {
  const bad = [{ id: 'x', trigger: { role: 'dialog' }, dismiss: { role: 'button', name: 'Zxq-secret' } }];
  const root = makeRoot({ overlay_handlers: bad });
  writeCases(root, [{ role: 'admin', steps: flow('/tour') }]);
  const before = total();
  const ran = await go(root, ['run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL]);
  await new Promise((r) => setTimeout(r, 700));
  const k = JSON.parse(readFileSync(join(root, ...RUN_REL.split('/'), 'results.json'), 'utf8')).cases[0];
  assert.equal(k.outcome, 'blocked', brief(k));
  assert.equal(k.reason_code, 'OVERLAY_HANDLER_INVALID');
  assert.match(k.reason, /^overlay_handlers entry 1: /);
  assert.ok(!k.reason.includes('Zxq-secret'));
  assert.equal(total(), before, `the page was never requested, runner exit ${ran.code}`);
  assert.equal(evidenceOf(root, /case-1\.overlay\.json$/), null);

  const g = await go(root, [...GROUND_BASE(root), '--route', '/tour']);
  assert.notEqual(g.code, 0);
  assert.match(g.out, /OVERLAY_HANDLER_INVALID|overlay_handlers entry 1: /);
  assert.match(g.out, /overlay_handlers entry 1: /);
  assert.ok(!g.out.includes('Zxq-secret'));
  assert.ok(!g.out.includes('GROUNDED:'));
  assert.equal(total(), before, 'ground made no page request either');
});
