// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-4 Opacity-aware visibility (an element at opacity 0 or visibility hidden fails expect_visible and expect_text and passes expect_not_visible; the decision is Playwright visibility AND checkVisibility)
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-5 Fuller evidence, first clause (the final capture of a browser case is a full-page screenshot with the password and expect_value masks; the judge-step element screenshot is Phase 5)
/**
 * Phase 2 (visibility and evidence) of qa-runner-ai-executable-steps.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-2-visibility-and-evidence.plan.md
 *              (AC-A1 the five wired branches, AC-A2 the decision rule and its re-read, AC-A3 the bounded full-page
 *              capture, AC-A4 the element-capture helper, AC-A5 the documents)
 *
 * Layers, all over the REAL runner, command doc, knowledge base and site pages (read from disk, never edited):
 *   1. The decision rule on a real Chromium page: isVisibleToPerson for a plain element, a faint one, opacity 0,
 *      an ancestor at opacity 0, visibility hidden, display none and a locator that matches nothing; a page that
 *      cannot answer rejects and is never read as hidden. requireVisibleToPerson: null when visible, the fixed
 *      failing sentence when hidden (it echoes no locator word and no page text), the blocked sentence when the
 *      page cannot be read, and a re-read inside the settle window so a fade-in is accepted.
 *   2. The capture helpers: captureFinalPng takes the whole of a tall page, retries once as a viewport capture
 *      with the same masks and the same explicit bound, and rejects when both attempts fail (the caller owns the
 *      classification); captureElementPng returns an element-sized PNG and honours its masks.
 *   3. The runner as an ASYNC child process against a loopback page and a real Chromium: the five visibility
 *      branches (role and text locators and the legacy selector forms of expect_visible and expect_text, and
 *      expect_not_visible) pass and fail both ways, a late fade-in still passes, the failing sentences that
 *      existed before are produced before visibility is considered, and the final capture of tall pages is as
 *      tall as the page, masks a password byte for byte, and adds no evidence file.
 *   4. The documents: the command doc, the knowledge base and the three site places that name the rule and the
 *      capture. Tokens only, no sentence is pinned, and every number is read from the runner.
 *
 * Not repeated here, because they already exist: the settleAssertion unit tests and the absence cases that use
 * the hidden attribute and DOM removal (qa-run-absence-state.test.mjs), the secret page that yields redacted text
 * and no screenshot (qa-run.test.mjs), the masked and unmasked capture of a short page and the rule that a case
 * with no comparison step writes no JSON evidence (qa-run-input-value.test.mjs), which export names the API
 * reference lists (qa-run-release-pages.test.mjs), and the registered check count (validate-registry.test.mjs).
 *
 * Out of this phase: the element screenshot of a judge step with a locator scope (the second clause of PRD AC-5)
 * belongs to Phase 5, so no test here expects a step to call captureElementPng.
 *
 * Every git call the runner makes carries a hermetic environment (core.fsmonitor=false so no daemon is started,
 * an empty global config, discovery stopped at the sandbox's parent); the sandbox is removed afterwards, every
 * server is closed and the one in-process browser is closed.
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

import * as RUNNER from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const { isVisibleToPerson, requireVisibleToPerson, captureFinalPng, captureElementPng, CAPTURE_TIMEOUT_MS } = RUNNER;

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'feat';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261021T101010101Z`;
const SLOW = { timeout: 280000 };
const BROWSER = { timeout: 120000 };

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} text */
const collapse = (text) => text.replace(/\s+/g, ' ');
/** @param {string} html @returns {string} */
const htmlText = (html) => collapse(html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&rsquo;/g, "'")).trim();

/** The failing sentence of a positive step on an element a person cannot see, for the step at one-based position n. */
const HIDDEN = (/** @type {number} */ n) => `step ${n}: the target was present but not visible to a person (opacity or visibility hides it)`;
/** The blocked sentence of a step whose visibility could not be read. */
const UNREADABLE = (/** @type {number} */ n) => `step ${n}: the visibility of the target could not be read; nothing was asserted`;

/** @param {any} png @returns {boolean} */
const isPng = (png) => Buffer.isBuffer(png) && png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
/** The width and the height a PNG states in its IHDR chunk. @param {Buffer} png */
const pngSize = (png) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-ai2-vis-'));
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

// ---------------------------------------------------------------------------
// One in-process Chromium for the helper tests, launched on first use and closed once
// ---------------------------------------------------------------------------

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

/**
 * A locator whose page is already closed: the browser can no longer answer any question about it.
 * @returns {Promise<any>}
 */
async function locatorOfClosedPage() {
  const browser = await getBrowser();
  const closed = await browser.newPage();
  await closed.setContent('<p id="a">a</p>');
  const target = closed.locator('#a');
  await closed.close();
  return target;
}

// ---------------------------------------------------------------------------
// 1. The decision rule on a real page
// ---------------------------------------------------------------------------

const DECISION_HTML = [
  '<style>.z{opacity:0}.h{visibility:hidden}.n{display:none}</style>',
  '<p id="solid">solid</p>',
  '<p id="faint" style="opacity:0.01">faint</p>',
  '<p id="self" class="z">self</p>',
  '<p id="cloaked" class="h">cloaked</p>',
  '<p id="gone" class="n">gone</p>',
  '<div class="z"><div><p id="inner">inner</p></div></div>',
].join('');

test('AC-4 isVisibleToPerson is true for a plain element and for one at opacity 0.01, and false for opacity 0, an ancestor at opacity 0, visibility hidden, display none and a locator that matches nothing', BROWSER, async () => {
  await withPage(DECISION_HTML, async (page) => {
    // The premise the rule exists for: Playwright alone counts an element at opacity 0, its own or an ancestor's, as visible.
    assert.equal(await page.locator('#self').isVisible(), true, 'premise: Playwright alone counts opacity 0 as visible');
    assert.equal(await page.locator('#inner').isVisible(), true, 'premise: Playwright alone counts an element under an ancestor at opacity 0 as visible');

    const seen = (/** @type {string} */ selector) => isVisibleToPerson(page.locator(selector));
    assert.equal(await seen('#solid'), true, 'a plain element');
    assert.equal(await seen('#faint'), true, 'opacity 0.01 is still visible to a person');
    for (const [selector, why] of /** @type {[string, string][]} */ ([
      ['#self', 'its own opacity is 0'],
      ['#inner', 'an ancestor is at opacity 0'],
      ['#cloaked', 'it is at visibility hidden'],
      ['#gone', 'it is at display none'],
      ['#nowhere', 'the locator matches nothing'],
    ])) {
      assert.equal(await seen(selector), false, `${selector} must not be visible to a person: ${why}`);
    }
  });
});

test('AC-4 isVisibleToPerson follows the live page: an element is hidden once it is set to opacity 0 and visible again once it is restored', BROWSER, async () => {
  await withPage('<p id="t">toggled</p>', async (page) => {
    const seen = () => isVisibleToPerson(page.locator('#t'));
    assert.equal(await seen(), true);
    await page.evaluate(() => {
      document.getElementById('t').style.opacity = '0';
    });
    assert.equal(await seen(), false);
    await page.evaluate(() => {
      document.getElementById('t').style.opacity = '1';
    });
    assert.equal(await seen(), true);
  });
});

test('AC-4 a page that cannot answer is never read as hidden: isVisibleToPerson rejects, so an absence step cannot pass on it', BROWSER, async () => {
  const target = await locatorOfClosedPage();
  await assert.rejects(isVisibleToPerson(target), 'a closed page was answered instead of rejected');
});

test('AC-4 requireVisibleToPerson returns null for a visible element and the fixed failing sentence for a hidden one, with no locator word and no page text in the reason', BROWSER, async () => {
  await withPage(`${DECISION_HTML}<p id="Segredo-xyz" class="z">Segredo xyz</p>`, async (page) => {
    const quick = { boundMs: 300, intervalMs: 50 };
    assert.equal(await requireVisibleToPerson(page.locator('#solid'), 3, quick), null);
    assert.equal(await requireVisibleToPerson(page.locator('#faint'), 3, quick), null, 'opacity 0.01 is visible');
    for (const [selector, n] of /** @type {[string, number][]} */ ([['#self', 4], ['#inner', 5], ['#cloaked', 6]])) {
      const verdict = await requireVisibleToPerson(page.locator(selector), n, quick);
      assert.deepEqual(verdict, { outcome: 'fail', reason_code: null, reason: HIDDEN(n), evidence: [] }, selector);
    }
    const named = await requireVisibleToPerson(page.locator('#Segredo-xyz'), 7, quick);
    assert.equal(named?.outcome, 'fail');
    for (const word of ['Segredo', 'xyz', 'self', 'inner', 'cloaked']) assert.ok(!String(named?.reason).includes(word), `the reason echoes ${word}: ${named?.reason}`);
  });
});

test('AC-4 requireVisibleToPerson returns the blocked STEP_NOT_PERFORMABLE verdict, never a pass, for a page that cannot be read', BROWSER, async () => {
  const target = await locatorOfClosedPage();
  const verdict = await requireVisibleToPerson(target, 5, { boundMs: 300, intervalMs: 50 });
  assert.deepEqual(verdict, { outcome: 'blocked', reason_code: 'STEP_NOT_PERFORMABLE', reason: UNREADABLE(5), evidence: [] });
});

test('AC-4 requireVisibleToPerson re-reads inside the settle window, so an element that fades in is accepted, and one that never does is rejected', BROWSER, async () => {
  await withPage('<p id="late" style="opacity:0">late</p>', async (page) => {
    // The flip is made by the injected sleep of the first re-read, so the first read is the hidden one and the
    // acceptance can only come from reading again: no wall-clock timing is involved.
    let waits = 0;
    const sleep = async () => {
      waits++;
      if (waits === 1) {
        await page.evaluate(() => {
          document.getElementById('late').style.opacity = '1';
        });
      }
    };
    const faded = await requireVisibleToPerson(page.locator('#late'), 3, { boundMs: 5000, intervalMs: 50, sleep });
    assert.equal(faded, null);
    assert.ok(waits >= 1, 'the element was accepted without a re-read');

    await page.evaluate(() => {
      document.getElementById('late').style.opacity = '0';
    });
    const stuck = await requireVisibleToPerson(page.locator('#late'), 3, { boundMs: 300, intervalMs: 50 });
    assert.deepEqual(stuck, { outcome: 'fail', reason_code: null, reason: HIDDEN(3), evidence: [] });
  });
});

// ---------------------------------------------------------------------------
// 2. The capture helpers
// ---------------------------------------------------------------------------

test('AC-5 the capture bound is an explicit positive integer number of milliseconds', () => {
  assert.ok(Number.isInteger(CAPTURE_TIMEOUT_MS) && CAPTURE_TIMEOUT_MS > 0, String(CAPTURE_TIMEOUT_MS));
});

test('AC-5 captureFinalPng takes the whole of a tall page, not the viewport', BROWSER, async () => {
  await withPage('<body style="margin:0"><h1>Topo</h1><div style="height:3200px;background:#eee"></div><p>Fim</p></body>', async (page) => {
    const viewport = page.viewportSize();
    const png = await captureFinalPng(page, []);
    assert.ok(isPng(png), 'the final capture must be a PNG');
    const { height } = pngSize(png);
    assert.ok(height >= 3200, `the capture is ${height} px high; the page is taller than 3200 px`);
    assert.ok(height > viewport.height, `the capture is no taller than the ${viewport.height} px viewport`);
  });
});

/**
 * A stand-in for the page that records the options of every screenshot call and answers from a script. It is
 * used only where no real page can be made to fail on demand; the assertions are on the bytes returned and on the
 * options of the attempts, never on a call count alone.
 * @param {(options: any) => Promise<Buffer>} answer
 */
function recordingPage(answer) {
  /** @type {any[]} */ const calls = [];
  return { calls, page: { screenshot: async (/** @type {any} */ options) => (calls.push(options), answer(options)) } };
}

test('AC-5 captureFinalPng retries once as a viewport capture with the same masks and the same explicit bound when the full-page capture throws', async () => {
  const masks = [{ id: 'password' }, { id: 'value' }];
  const { calls, page } = recordingPage(async (options) => {
    if (options.fullPage) throw new Error('the page is too tall');
    return Buffer.from('viewport-bytes');
  });
  const png = await captureFinalPng(page, masks);
  assert.equal(png.toString(), 'viewport-bytes', 'the bytes of the viewport capture are what the caller gets');
  assert.equal(calls.length, 2, 'one full-page attempt and one viewport retry');
  assert.equal(calls[0].fullPage, true, 'the first attempt is full-page');
  assert.ok(!calls[1].fullPage, 'the retry is viewport-only');
  assert.deepEqual(calls[0].mask, masks);
  assert.deepEqual(calls[1].mask, masks, 'the retry keeps the masks');
  assert.equal(calls[0].timeout, CAPTURE_TIMEOUT_MS);
  assert.equal(calls[1].timeout, CAPTURE_TIMEOUT_MS, 'the retry keeps the bound');
});

test('AC-5 captureFinalPng asks for one full-page capture with the masks and the bound, and does not retry when it succeeds', async () => {
  const masks = [{ id: 'password' }];
  const { calls, page } = recordingPage(async () => Buffer.from('full-page-bytes'));
  const png = await captureFinalPng(page, masks);
  assert.equal(png.toString(), 'full-page-bytes');
  assert.equal(calls.length, 1, 'a successful full-page capture is not repeated');
  assert.equal(calls[0].fullPage, true);
  assert.deepEqual(calls[0].mask, masks);
  assert.equal(calls[0].timeout, CAPTURE_TIMEOUT_MS);
});

test('AC-5 captureFinalPng rejects when the full-page capture and the viewport retry both fail, so the caller can classify the case', async () => {
  const { calls, page } = recordingPage(async () => {
    throw new Error('the page is gone');
  });
  await assert.rejects(captureFinalPng(page, []), /the page is gone/);
  assert.equal(calls.length, 2, 'no third attempt');
});

test('AC-5 captureElementPng returns a PNG of the located element alone', BROWSER, async () => {
  await withPage('<body style="margin:0"><div id="box" style="width:120px;height:80px;background:#08f"></div><div style="height:2000px"></div></body>', async (page) => {
    const png = await captureElementPng(page.locator('#box'), []);
    assert.ok(isPng(png));
    assert.deepEqual(pngSize(png), { width: 120, height: 80 });
  });
});

test('AC-5 captureElementPng applies its masks: two passwords of different lengths give identical bytes under the mask and different bytes without it', BROWSER, async () => {
  await withPage('<div id="card" style="width:260px;padding:10px"><input id="f" type="password" value="aaaa"></div>', async (page) => {
    const setValue = (/** @type {string} */ v) =>
      page.evaluate((/** @type {string} */ value) => {
        document.getElementById('f').value = value;
      }, v);
    const card = page.locator('#card');
    const short = 'aaaa';
    const long = 'bbbbbbbbbbbbbbbbbbbb';

    // A password renders one bullet per character, so values of different lengths differ on screen unless they are masked.
    const masked = [page.locator('#f')];
    await setValue(short);
    const maskedShort = await captureElementPng(card, masked);
    await setValue(long);
    const maskedLong = await captureElementPng(card, masked);
    assert.equal(Buffer.compare(maskedShort, maskedLong), 0, 'the masked captures differ: the password is visible in the element capture');

    // The control: the same two values with no mask must give different bytes, or the comparison above proves nothing.
    await setValue(short);
    const bareShort = await captureElementPng(card, []);
    await setValue(long);
    const bareLong = await captureElementPng(card, []);
    assert.notEqual(Buffer.compare(bareShort, bareLong), 0, 'the control captures are identical: the comparison cannot see a visible password');
  });
});

// ---------------------------------------------------------------------------
// 3. The real runner as a child process
// ---------------------------------------------------------------------------

const VIS_PAGE = [
  '<!doctype html><html><head><meta charset="utf-8"><title>Vis</title>',
  '<style>.z{opacity:0}.h{visibility:hidden}.n{display:none}</style></head><body>',
  '<h1>Painel</h1>',
  '<p id="solid">Texto solido</p>',
  '<p id="ghost" class="z">Texto fantasma</p>',
  '<p id="cloaked" class="h">Texto invisivel</p>',
  '<p id="removed" class="n">Texto removido</p>',
  '<div class="z"><div><p id="inner">Corpo da janela</p></div></div>',
  '<p id="late" style="opacity:0">Texto tardio</p>',
  '<script>setTimeout(function(){document.getElementById("late").style.opacity="1";},1500);</script>',
  '</body></html>',
].join('');

/** A tall page of about 3100 px whose only variable part is the value of one input. @param {string} kind @param {string} value */
const tallPage = (kind, value) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>T</title></head><body style="margin:0"><h1>Topo</h1><label>Campo <input type="${kind}" value="${value}"></label><div style="height:3000px;background:#eee"></div><p>Fim</p></body></html>`;

/** @type {import('node:http').Server} */
let server;
let baseUrl = '';

before(async () => {
  server = createServer((req, res) => {
    const u = new URL(String(req.url), 'http://127.0.0.1');
    /** @type {string | null} */ let html = null;
    if (u.pathname === '/vis') html = VIS_PAGE;
    else if (u.pathname === '/tallp') html = tallPage('password', u.searchParams.get('v') ?? '');
    else if (u.pathname === '/tallt') html = tallPage('text', u.searchParams.get('v') ?? '');
    if (html === null) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  baseUrl = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
});

/**
 * Builds a temp root with a declared target, grounding snapshots, a report and a plan of anonymous browser cases.
 * @param {{ title: string, manual: string[], steps: any[] }[]} defs
 * @param {{ file: string, route: string, entries: any[] }[]} snapshots
 */
function buildFixture(defs, snapshots) {
  const root = mkdtempSync(join(SANDBOX, 'run-'));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(runDir, 'grounding'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  for (const s of snapshots) {
    writeFileSync(join(runDir, 'grounding', s.file), JSON.stringify({ schema_version: 1, role: 'anonymous', route: s.route, entries: s.entries, withheld: 0 }));
  }
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: defs.map((d, i) => ({ index: i + 1, title: d.title, class: 'automatable', driver: 'browser', role: null, state: 'none', steps: d.steps })),
    }),
  );
  return { root, runDir };
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string, results: any }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    // Below the test timeout, so a hang ends the child (and the sandbox cleanup can run) before the test is abandoned.
    const timer = setTimeout(() => child.kill(), 260000);
    child.on('error', (e) => {
      clearTimeout(timer);
      rejectP(e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const file = join(root, ...RUN_REL.split('/'), 'results.json');
      resolveP({ code, stdout, stderr, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null });
    });
  });
}

test('AC-4 end to end: positive steps fail and absence steps pass on an element a person cannot see, in the role and text forms and in the legacy selector forms; a visible element still fails an absence; a late fade-in still passes; earlier failing sentences are unchanged', SLOW, async () => {
  const G = { action: 'goto', path: '/vis' };
  const H = { action: 'expect_visible', role: 'heading', name: 'Painel' };
  /**
   * @param {string} title
   * @param {string} says what the manual steps state, which is where an expect_text literal must come from
   * @param {any[]} steps
   * @param {'pass' | 'fail'} outcome
   * @param {string | null} reason the reason of a case that does not pass
   */
  const C = (title, says, steps, outcome, reason) => ({ title, manual: ['1. Open the panel.', `2. ${says}`], steps, outcome, reason });
  const defs = [
    C('Solid text passes', 'The text Texto solido is shown.', [G, H, { action: 'expect_text', text: 'Texto solido', contains: 'Texto solido' }], 'pass', null),
    C('Opacity zero expect_visible', 'The text Texto fantasma is shown.', [G, { action: 'expect_visible', text: 'Texto fantasma' }], 'fail', HIDDEN(2)),
    C('Opacity zero expect_text', 'The text Texto fantasma is shown.', [G, { action: 'expect_text', text: 'Texto fantasma', contains: 'Texto fantasma' }], 'fail', HIDDEN(2)),
    C('Ancestor opacity zero expect_visible', 'The text Corpo da janela is shown.', [G, { action: 'expect_visible', text: 'Corpo da janela' }], 'fail', HIDDEN(2)),
    C('Visibility hidden expect_text', 'The text Texto invisivel is shown.', [G, { action: 'expect_text', text: 'Texto invisivel', contains: 'Texto invisivel' }], 'fail', HIDDEN(2)),
    C('Display none keeps the earlier sentence', 'The text Texto removido is shown.', [G, { action: 'expect_visible', text: 'Texto removido' }], 'fail', 'step 2: the expected element was not visible'),
    C('Missing text on a hidden element keeps the earlier sentence', 'The text says Palavra ausente.', [G, { action: 'expect_text', text: 'Texto fantasma', contains: 'Palavra ausente' }], 'fail', 'step 2: the expected text was not present'),
    C('Absence of opacity zero passes', 'The text Texto fantasma is gone.', [G, H, { action: 'expect_not_visible', text: 'Texto fantasma' }], 'pass', null),
    C('Absence under an ancestor at opacity zero passes', 'The text Corpo da janela is gone.', [G, H, { action: 'expect_not_visible', text: 'Corpo da janela' }], 'pass', null),
    C('Absence of visibility hidden passes', 'The text Texto invisivel is gone.', [G, H, { action: 'expect_not_visible', text: 'Texto invisivel' }], 'pass', null),
    C('Absence of visible text still fails', 'The text Texto solido is gone.', [G, H, { action: 'expect_not_visible', text: 'Texto solido' }], 'fail', 'step 3: the element was still visible'),
    C('Late fade-in passes', 'The text Texto tardio is shown.', [G, { action: 'expect_visible', text: 'Texto tardio' }], 'pass', null),
    C('Selector opacity zero expect_visible', 'The ghost text is shown.', [G, { action: 'expect_visible', selector: '#ghost' }], 'fail', HIDDEN(2)),
    C('Selector opacity zero expect_text', 'The ghost text says fantasma.', [G, { action: 'expect_text', selector: '#ghost', contains: 'fantasma' }], 'fail', HIDDEN(2)),
    C('Selector solid passes', 'The solid text says solido.', [G, { action: 'expect_visible', selector: '#solid' }, { action: 'expect_text', selector: '#solid', contains: 'solido' }], 'pass', null),
  ];
  const text = (/** @type {string} */ t) => ({ kind: 'text', text: t, matches: 1 });
  const fx = buildFixture(defs, [
    {
      file: 'anonymous--vis.snapshot.json',
      route: '/vis',
      entries: [{ kind: 'role', role: 'heading', name: 'Painel', matches: 1 }, ...['Texto solido', 'Texto fantasma', 'Texto invisivel', 'Texto removido', 'Corpo da janela', 'Texto tardio'].map(text)],
    },
  ]);

  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const c = r.results.cases;
  assert.equal(c.length, defs.length);
  for (const [i, d] of defs.entries()) {
    const got = JSON.stringify([c[i].outcome, c[i].reason_code, c[i].reason]);
    assert.deepEqual([c[i].outcome, c[i].reason_code], [d.outcome, null], `case ${i + 1} (${d.title}): ${got}`);
    if (d.outcome !== 'pass') assert.equal(c[i].reason, d.reason, `case ${i + 1} (${d.title}): ${got}`);
    // Every browser case, passed or failed, carries exactly its one final capture.
    assert.equal(c[i].evidence.length, 1, `case ${i + 1} (${d.title}): ${JSON.stringify(c[i].evidence)}`);
    assert.ok(String(c[i].evidence[0]).endsWith('.png'), `case ${i + 1} (${d.title}): ${c[i].evidence[0]}`);
  }

  // No reason carries a locator word or a piece of the page text.
  for (const x of c) {
    for (const word of ['Painel', 'solido', 'fantasma', 'invisivel', 'removido', 'janela', 'tardio', '#ghost', '#solid']) {
      assert.ok(!String(x.reason ?? '').includes(word), `a reason echoes ${word}: ${x.reason}`);
    }
  }

  // A failing positive step is recorded as the failed step, after the steps that passed.
  assert.deepEqual(c[1].steps.map((/** @type {any} */ s) => s.result), ['passed', 'failed']);
  assert.deepEqual(c[7].steps.map((/** @type {any} */ s) => s.result), ['passed', 'passed', 'passed']);
  assert.deepEqual(validateResults(r.results), []);

  // The only evidence the cases wrote is their final captures: no extra file for the new rule.
  assert.deepEqual(
    readdirSync(join(fx.runDir, 'evidence')).filter((n) => n.startsWith('case-')).sort(),
    defs.map((_, i) => `case-${i + 1}.png`).sort(),
  );
});

test('AC-5 end to end: the final capture of a browser case covers the whole page, keeps the password mask on a tall page, and adds no evidence file', SLOW, async () => {
  const short = 'aaaa';
  const long = 'bbbbbbbbbbbbbbbbbbbb';
  /** @param {string} route @param {string} v */
  const entry = (route, v) => ({
    title: `Tall ${route.slice(1)} ${v.length}`,
    manual: ['1. Open the page.', '2. The title shows.'],
    steps: [{ action: 'goto', path: `${route}?v=${v}` }, { action: 'expect_visible', selector: 'h1' }],
  });
  const defs = [entry('/tallp', short), entry('/tallp', long), entry('/tallt', short), entry('/tallt', long)];
  const fx = buildFixture(defs, []);

  const r = await runRunner(fx.root);
  assert.equal(r.code, 0, `the runner exited ${r.code}: ${r.stderr}`);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  const c = r.results.cases;
  assert.equal(c.length, 4);
  for (const [i, x] of c.entries()) assert.equal(x.outcome, 'pass', `case ${i + 1}: ${JSON.stringify([x.outcome, x.reason_code, x.reason])}`);

  const png = (/** @type {number} */ i) => {
    const p = c[i].evidence.find((/** @type {any} */ e) => String(e).endsWith('.png'));
    assert.ok(p, `case ${i + 1} has no screenshot`);
    return readFileSync(join(fx.root, ...String(p).split('/')));
  };
  for (let i = 0; i < 4; i++) {
    assert.ok(isPng(png(i)), `case ${i + 1} capture is not a PNG`);
    const { height } = pngSize(png(i));
    assert.ok(height >= 3000, `case ${i + 1} capture is ${height} px high; the final capture must cover the whole page`);
  }
  // The password mask holds on the full-page capture, even against a value of another length.
  assert.equal(Buffer.compare(png(0), png(1)), 0, 'the masked captures differ: a password is visible in the full-page capture');
  // The control: a visible field with the same two values must give different captures.
  assert.notEqual(Buffer.compare(png(2), png(3)), 0, 'the control captures are identical: the comparison cannot see a visible value');
  assert.deepEqual(validateResults(r.results), []);

  // One capture per case and nothing else: no element capture, no JSON, no second file for the full-page one.
  assert.deepEqual(readdirSync(join(fx.runDir, 'evidence')).filter((n) => n.startsWith('case-')).sort(), ['case-1.png', 'case-2.png', 'case-3.png', 'case-4.png']);
  for (const x of c) assert.equal(x.evidence.length, 1, JSON.stringify(x.evidence));
});

// ---------------------------------------------------------------------------
// 4. The documents
// ---------------------------------------------------------------------------

const BOUND_SECONDS = `${CAPTURE_TIMEOUT_MS / 1000} seconds`;
const NEW_EXPORTS = ['isVisibleToPerson', 'requireVisibleToPerson', 'captureFinalPng', 'captureElementPng', 'CAPTURE_TIMEOUT_MS'];

test('AC-4 AC-5 the command doc states the visibility rule, the full-page final capture, its bound and the viewport retry', () => {
  const text = collapse(read('plugins/relay/commands/relay-qa-run.md'));
  for (const part of [
    'Visibility means visible to a person',
    'checkVisibility',
    '`opacity: 0`',
    '`visibility: hidden`',
    'under an ancestor at `opacity: 0`',
    'present but not visible to a person',
    'The final capture of a browser case is a full-page screenshot',
    '`input[type=password]`',
    'viewport-only capture',
    '`EVIDENCE_WRITE_FAILED`',
    'redacted text and no screenshot',
  ]) {
    assert.ok(text.includes(part), `the command doc does not state: ${part}`);
  }
  assert.ok(text.includes(`bounded to ${BOUND_SECONDS}`), `the command doc does not state the ${BOUND_SECONDS} bound of the runner`);
});

test('AC-4 AC-5 the knowledge base states the rule and the full-page capture in the API reference row, the glossary and the flows', () => {
  const rule = 'Visibility is judged as a person would';
  const qa = read('docs/api-reference.md')
    .split('\n')
    .find((l) => l.startsWith('| `/relay-qa-run '));
  assert.ok(qa, 'the /relay-qa-run row was not found');
  assert.ok(qa.includes(rule), 'the /relay-qa-run row does not state the visibility rule');
  assert.ok(qa.includes('full-page screenshot'), 'the /relay-qa-run row does not state the full-page capture');
  assert.ok(qa.includes('`opacity: 0`') && qa.includes('`visibility: hidden`'), 'the /relay-qa-run row does not name the two hiding properties');

  const paragraph = read('docs/domain/glossary.md')
    .split(/\n\n/)
    .find((p) => p.includes(rule));
  assert.ok(paragraph, 'the glossary paragraph on visibility was not found');
  const glossary = collapse(paragraph);
  for (const part of ['checkVisibility', '`opacity: 0`', '`visibility: hidden`', '`ASSERT_SETTLE_MS`', '`CAPTURE_TIMEOUT_MS`', 'full-page screenshot', 'viewport-only']) {
    assert.ok(glossary.includes(part), `the glossary paragraph does not state: ${part}`);
  }
  assert.ok(glossary.includes(BOUND_SECONDS), `the glossary does not state the ${BOUND_SECONDS} bound of the runner`);

  const flows = collapse(read('docs/domain/flows.md'));
  assert.ok(flows.includes(rule), 'the flows do not state the visibility rule');
  assert.ok(flows.includes('full-page screenshot'), 'the flows do not state the full-page capture');
});

test('AC-4 AC-5 the API reference lists the five new exports in the qa-run.mjs row, and each is a real export', () => {
  const runner = read('docs/api-reference.md')
    .split('\n')
    .find((l) => l.startsWith('| `qa-run.mjs` '));
  assert.ok(runner, 'the qa-run.mjs row was not found');
  for (const name of NEW_EXPORTS) {
    assert.ok(runner.includes(`\`${name}\``), `the qa-run.mjs row does not name ${name}`);
    assert.ok(name in RUNNER, `${name} is not an export of the runner`);
  }
});

test('AC-4 AC-5 the commands reference states the rule and the capture in the Step vocabulary row of /relay-qa-run', () => {
  const page = read('documentation/reference/commands.html');
  const start = page.indexOf('<h3 id="relay-qa-run"');
  assert.ok(start !== -1, 'the /relay-qa-run entry was not found');
  const row = /<dt>Step vocabulary<\/dt>\s*<dd>([\s\S]*?)<\/dd>/.exec(page.slice(start));
  assert.ok(row, 'the Step vocabulary row of the /relay-qa-run entry was not found');
  const text = htmlText(row[1]);
  for (const part of ['Visibility means visible to a person', 'checkVisibility', 'opacity: 0', 'visibility: hidden', 'full-page screenshot', 'viewport-only capture']) {
    assert.ok(text.includes(part), `the Step vocabulary row does not state: ${part}`);
  }
});

test('AC-4 AC-5 the scripts reference names the new readers and capture helpers, each a real export, and states the bound the runner has', () => {
  const page = read('documentation/reference/scripts.html');
  const row = /<dt>Assertions and request count<\/dt>\s*<dd>([\s\S]*?)<\/dd>/.exec(page);
  assert.ok(row, 'the Assertions and request count row was not found');
  for (const name of NEW_EXPORTS) {
    assert.ok(row[1].includes(`<code>${name}</code>`), `the Assertions and request count row does not name ${name}`);
    assert.ok(name in RUNNER, `${name} is not an export of the runner`);
  }
  assert.ok(row[1].includes(`<code>CAPTURE_TIMEOUT_MS</code> (${CAPTURE_TIMEOUT_MS})`), `the row does not state the value ${CAPTURE_TIMEOUT_MS} of CAPTURE_TIMEOUT_MS`);
  const text = htmlText(row[1]);
  for (const part of ['opacity: 0', 'visibility: hidden', 'full-page screenshot', 'viewport-only capture']) {
    assert.ok(text.includes(part), `the Assertions and request count row does not state: ${part}`);
  }
});

test('AC-4 AC-5 the changelog records the visibility rule and the full-page final capture', () => {
  const text = htmlText(read('documentation/changelog.html'));
  for (const part of ['Visibility means visible to a person', 'Full-page final capture', 'checkVisibility', 'content below the fold']) {
    assert.ok(text.includes(part), `the changelog does not mention: ${part}`);
  }
});
