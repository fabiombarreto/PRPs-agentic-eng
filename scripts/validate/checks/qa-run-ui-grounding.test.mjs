// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-13 UI grounding: role-and-name and text locators, planned from a snapshot, exactly one match
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-16 No secret, e-mail or declared personal pattern reaches a snapshot, a run artifact or the terminal
// PRPs/prds/qa-runner-case-vocabulary.prd.md AC-15 The closed outcome vocabulary (STEP_UNGROUNDED is a reason code, never an outcome)
/**
 * Phase 6 (UI grounding) of qa-runner-case-vocabulary.
 *
 * - locatorOf and the validateStep / validateSteps locator rules (valid and malformed forms).
 * - routeKey, parseAriaSnapshot (the real ariaSnapshot() line format), partitionSnapshotEntries.
 * - precheckGroundedSteps: route tracking, role and anonymous snapshots, ambiguity, absence, the
 *   report-sourced expectation, and reasons that never echo a locator.
 * - The real runner: the plan-time refusals happen before any login or browser; the browser driver
 *   passes a grounded locator, never acts on a locator that matches two elements at run time, and
 *   the `ground` mode writes a snapshot with real match counts while withholding sensitive entries.
 *
 * The browser tests run the real runner as a child process against a loopback-served page, with
 * Playwright and Chromium resolved through a junction to the repository node_modules.
 *
 * Source plan: PRPs/plans/completed/qa-runner-case-vocabulary-phase-6-ui-grounding.plan.md
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, statSync, symlinkSync, unlinkSync, rmdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

import {
  validateStep,
  validateSteps,
  locatorOf,
  routeKey,
  parseAriaSnapshot,
  partitionSnapshotEntries,
  precheckGroundedSteps,
  buildRedactionTable,
  OUTCOMES,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const NODE_MODULES = resolve('node_modules');
const TOKEN = 'tok-Zq83kd01-ground';
const EMAIL = 'ana.souza@example.com';
const PERSON = 'Ana Souza';
const RUN_REL = 'PRPs/reports/f/qa-run/r1';
const SLOW = { timeout: 170000 };

/** @type {string[]} */
const temps = [];
/** @param {boolean} [withBrowser] */
const tmp = (withBrowser = false) => {
  const d = mkdtempSync(join(tmpdir(), 'relay-qaground-'));
  temps.push(d);
  if (withBrowser) symlinkSync(NODE_MODULES, join(d, 'node_modules'), 'junction');
  return d;
};
after(() => {
  for (const t of temps) {
    // Never let a recursive delete reach the repository node_modules through the junction.
    const nm = join(t, 'node_modules');
    try {
      unlinkSync(nm);
    } catch {
      try {
        rmdirSync(nm);
      } catch {
        // not a link, or already gone
      }
    }
    if (existsSync(nm)) continue;
    rmSync(t, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// locatorOf and the validateStep / validateSteps locator rules
// ---------------------------------------------------------------------------

test('AC-13 validateStep accepts the role-and-name and text locator forms on every locator action', () => {
  const ok = [
    { action: 'click', role: 'button', name: 'Save' },
    { action: 'fill', role: 'textbox', name: 'Email', value: 'x' },
    { action: 'expect_visible', role: 'heading', name: 'Panel' },
    { action: 'expect_text', role: 'heading', name: 'Panel', contains: 'Panel' },
    { action: 'click', text: 'Welcome back' },
    { action: 'fill', text: 'Nick', value: 'x' },
    { action: 'expect_visible', text: 'Welcome back' },
    { action: 'expect_text', text: 'Welcome back', contains: 'Welcome' },
  ];
  for (const s of ok) assert.equal(validateStep('browser', s), null, JSON.stringify(s));
});

test('AC-13 validateStep refuses every malformed or mixed locator as PLAN_ENTRY_INVALID', () => {
  const bad = [
    { action: 'click', selector: '#a', role: 'button', name: 'Save' },
    { action: 'click', selector: '#a', text: 'Save' },
    { action: 'click', role: 'button' },
    { action: 'click', name: 'Save' },
    { action: 'click', role: 'banana', name: 'Save' },
    { action: 'click', text: 'Save', role: 'button' },
    { action: 'click', text: 'Save', name: 'Save' },
    { action: 'click', role: 'button', name: '  ' },
    { action: 'click', role: 'button', name: 5 },
    { action: 'click', text: '' },
    { action: 'click', text: '   ' },
    { action: 'click', text: 7 },
    { action: 'fill', role: 'textbox', name: 'Email' },
    { action: 'fill', text: 'Nick' },
    { action: 'expect_text', role: 'heading', name: 'Panel' },
    { action: 'expect_text', text: 'Panel' },
  ];
  for (const s of bad) {
    const r = validateStep('browser', s);
    assert.notEqual(r, null, `a malformed locator step was accepted: ${JSON.stringify(s)}`);
    assert.equal(r?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(s));
  }
});

test('AC-13 the locator keys are not valid on the http driver, and the legacy selector messages are unchanged', () => {
  assert.notEqual(validateStep('http', { action: 'click', role: 'button', name: 'Save' }), null);
  const legacy = validateStep('browser', { action: 'click' });
  assert.equal(legacy?.reason, 'click needs a string selector');
  assert.equal(validateStep('browser', { action: 'expect_visible', selector: '#a' }), null);
  assert.equal(validateStep('browser', { action: 'expect_text', selector: 'h1', contains: 'Dashboard' }), null);
});

test('AC-13 a locator expectation counts as an expectation and a locator click alone does not', () => {
  const goto = { action: 'goto', path: '/' };
  assert.equal(validateSteps('browser', [goto, { action: 'click', role: 'button', name: 'Save' }])?.code, 'NO_EXPECTATION');
  assert.equal(validateSteps('browser', [goto, { action: 'expect_visible', role: 'button', name: 'Save' }]), null);
  assert.equal(validateSteps('browser', [goto, { action: 'expect_visible', text: 'Welcome back' }]), null);
});

test('AC-13 an unbound {{variable}} inside a locator is refused by name', () => {
  const r = validateSteps('browser', [{ action: 'click', role: 'button', name: '{{who}}' }, { action: 'expect_visible', selector: '#a' }]);
  assert.equal(r?.code, 'PLAN_ENTRY_INVALID');
  assert.ok(String(r?.reason).includes('who'), String(r?.reason));
});

test('AC-13 the closed role list accepts every listed role and refuses roles outside it', () => {
  const listed = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'heading', 'tab', 'menuitem', 'option', 'switch', 'searchbox', 'spinbutton', 'slider', 'dialog', 'alert', 'status', 'row', 'cell', 'columnheader', 'listitem', 'img', 'navigation', 'region', 'table', 'menu', 'tabpanel'];
  for (const role of listed) assert.equal(validateStep('browser', { action: 'click', role, name: 'X' }), null, role);
  for (const role of ['banana', 'Button', 'button ', '', 'paragraph', 'generic']) {
    assert.equal(validateStep('browser', { action: 'click', role, name: 'X' })?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(role));
  }
});

test('AC-13 locatorOf returns null for a selector step, the role form, the text form and a refusal otherwise', () => {
  assert.equal(locatorOf({ action: 'click', selector: '#a' }), null);
  assert.equal(locatorOf({ action: 'goto', path: '/' }), null);
  assert.equal(locatorOf(null), null);
  assert.deepEqual(locatorOf({ action: 'click', role: 'button', name: 'Save' }), { ok: true, form: 'role', role: 'button', name: 'Save' });
  assert.deepEqual(locatorOf({ action: 'click', text: ' Welcome back ' }), { ok: true, form: 'text', text: ' Welcome back ' }, 'the text is the step own string, untrimmed');
  const mixed = locatorOf({ action: 'click', selector: '#a', text: 'Save' });
  assert.equal(mixed?.ok, false);
  assert.equal(locatorOf({ action: 'click', role: 'button' })?.ok, false);
});

// ---------------------------------------------------------------------------
// routeKey, parseAriaSnapshot, partitionSnapshotEntries
// ---------------------------------------------------------------------------

test('AC-13 routeKey returns the pathname without the query and null for a non-string', () => {
  assert.equal(routeKey('/a?x=1'), '/a');
  assert.equal(routeKey('/'), '/');
  assert.equal(routeKey('/a/b#frag'), '/a/b');
  assert.equal(routeKey(5), null);
  assert.equal(routeKey(undefined), null);
  assert.equal(routeKey(null), null);
});

// The line format locator.ariaSnapshot() returns on Playwright 1.61.1, including nested children and /url lines.
const ARIA = [
  '- banner:',
  '  - link "ana@example.com":',
  '    - /url: /x',
  '- heading "Panel" [level=1]',
  '- button "Save"',
  '- button "Delete"',
  '- button "Delete"',
  '- textbox "Nick"',
  '- text: Hello there',
  '- paragraph: ignored prose',
  '- banana "Not a role"',
  '- button ""',
  '- button "   "',
  String.raw`- img "Logo \"big\""`,
  '',
].join('\n');

test('AC-13 parseAriaSnapshot extracts role-and-name and text candidates from the real line format', () => {
  const got = parseAriaSnapshot(ARIA);
  const has = (/** @type {Record<string, string>} */ p) => got.some((e) => Object.entries(p).every(([k, v]) => /** @type {any} */ (e)[k] === v));
  assert.ok(has({ kind: 'role', role: 'heading', name: 'Panel' }), JSON.stringify(got));
  assert.ok(has({ kind: 'role', role: 'button', name: 'Save' }));
  assert.ok(has({ kind: 'role', role: 'textbox', name: 'Nick' }));
  assert.ok(has({ kind: 'role', role: 'link', name: 'ana@example.com' }), 'a nested link with a trailing colon is a candidate');
  assert.ok(has({ kind: 'text', text: 'Hello there' }));
});

test('AC-13 parseAriaSnapshot unescapes quotes, drops unsupported roles, prose, blank names and duplicates', () => {
  const got = parseAriaSnapshot(ARIA);
  assert.ok(got.some((e) => /** @type {any} */ (e).name === 'Logo "big"'), 'an escaped quote was not unescaped');
  assert.equal(got.filter((e) => /** @type {any} */ (e).name === 'Delete').length, 1, 'candidates are de-duplicated');
  assert.ok(!got.some((e) => /** @type {any} */ (e).role === 'banana'), 'an unsupported role leaked in');
  assert.ok(!got.some((e) => /** @type {any} */ (e).text === 'ignored prose'), 'a paragraph leaked in');
  assert.ok(!got.some((e) => e.kind === 'role' && e.name.trim() === ''), 'a blank name leaked in');
  assert.ok(!got.some((e) => /** @type {any} */ (e).text !== undefined && /url/.test(/** @type {any} */ (e).text)), 'a /url line leaked in');
});

test('AC-13 parseAriaSnapshot returns [] for a non-string, caps at 300 and drops a text line over 200 characters', () => {
  assert.deepEqual(parseAriaSnapshot(null), []);
  assert.deepEqual(parseAriaSnapshot(undefined), []);
  assert.deepEqual(parseAriaSnapshot(42), []);
  const many = Array.from({ length: 400 }, (_, i) => `- button "B${i}"`).join('\n');
  assert.equal(parseAriaSnapshot(many).length, 300);
  assert.deepEqual(parseAriaSnapshot(`- text: ${'x'.repeat(201)}`), []);
  assert.equal(parseAriaSnapshot(`- text: ${'x'.repeat(200)}`).length, 1);
});

test('AC-16 partitionSnapshotEntries withholds an entry carrying a table secret, an e-mail or a declared pattern and keeps the rest untouched', () => {
  const root = tmp();
  mkdirSync(join(root, 'PRPs'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'redaction-extensions.txt'), `regex:${PERSON}\n`);
  const table = buildRedactionTable({ root, env: {}, secretValues: ['sekret-value-1'] });
  const keptEntry = { kind: 'role', role: 'button', name: 'Save', matches: 1 };
  const part = partitionSnapshotEntries(
    [
      keptEntry,
      { kind: 'role', role: 'link', name: EMAIL, matches: 1 },
      { kind: 'text', text: `Welcome ${PERSON}`, matches: 1 },
      { kind: 'text', text: 'code sekret-value-1', matches: 1 },
    ],
    table,
  );
  assert.equal(part.withheld, 3);
  assert.deepEqual(part.kept, [keptEntry]);
  assert.equal(typeof part.withheld, 'number', 'withheld is a count, never the entries');
});

// ---------------------------------------------------------------------------
// precheckGroundedSteps
// ---------------------------------------------------------------------------

const snap = (/** @type {string} */ route, /** @type {any[]} */ entries, role = 'admin') => ({ schema_version: 1, role, route, entries, withheld: 0 });
const SNAPS = [
  snap('/', [
    { kind: 'role', role: 'button', name: 'Save', matches: 1 },
    { kind: 'role', role: 'button', name: 'Deletexyz', matches: 2 },
    { kind: 'role', role: 'heading', name: 'Panel', matches: 1 },
    { kind: 'text', text: 'Welcome back', matches: 1 },
  ]),
  snap('/other', [
    { kind: 'role', role: 'button', name: 'Go', matches: 1 },
    { kind: 'role', role: 'heading', name: 'Panel', matches: 1 },
  ]),
  snap('/other', [
    { kind: 'role', role: 'button', name: 'Go', matches: 1 },
    { kind: 'role', role: 'heading', name: 'Panel', matches: 1 },
  ], 'anonymous'),
];
const MANUAL = '1. Open the panel and click Save, the  Panel heading stays';
const GOTO = { action: 'goto', path: '/' };
const pre = (/** @type {any[]} */ steps, /** @type {string | null} */ role = 'admin', /** @type {any} */ manual = MANUAL) => precheckGroundedSteps(steps, SNAPS, manual, role);

test('AC-13 precheckGroundedSteps accepts a fully grounded plan and ignores selector steps', () => {
  assert.equal(
    pre([
      GOTO,
      { action: 'click', role: 'button', name: 'Save' },
      { action: 'expect_text', role: 'heading', name: 'Panel', contains: 'panel   HEADING' },
      { action: 'expect_visible', text: 'Welcome back' },
    ]),
    null,
  );
  assert.equal(pre([GOTO, { action: 'click', selector: '#legacy' }]), null, 'a selector step is not checked');
  assert.equal(pre([{ action: 'click', selector: '#legacy' }]), null, 'a selector step needs no route');
});

test('AC-13 precheckGroundedSteps refuses an ambiguous snapshot entry, an unknown entry, a missing goto, a missing route and the wrong role as STEP_UNGROUNDED', () => {
  /** @type {[string, any, string | null][]} */
  const cases = [
    ['an ambiguous entry', pre([GOTO, { action: 'click', role: 'button', name: 'Deletexyz' }]), 'STEP_UNGROUNDED'],
    ['an unknown entry', pre([GOTO, { action: 'click', role: 'button', name: 'Archivexyz' }]), 'STEP_UNGROUNDED'],
    ['a text entry that is not a snapshot entry', pre([GOTO, { action: 'click', text: 'Nopexyz' }]), 'STEP_UNGROUNDED'],
    ['a role entry named as text', pre([GOTO, { action: 'click', text: 'Save' }]), 'STEP_UNGROUNDED'],
    ['no goto before the locator', pre([{ action: 'click', role: 'button', name: 'Save' }]), 'STEP_UNGROUNDED'],
    ['a route with no snapshot', pre([{ action: 'goto', path: '/missing' }, { action: 'click', role: 'button', name: 'Save' }]), 'STEP_UNGROUNDED'],
    ['the wrong role', pre([GOTO, { action: 'click', role: 'button', name: 'Save' }], 'viewer'), 'STEP_UNGROUNDED'],
    ['an anonymous plan on a route only an admin snapshot covers', pre([GOTO, { action: 'click', role: 'button', name: 'Save' }], null), 'STEP_UNGROUNDED'],
  ];
  for (const [label, r, code] of cases) {
    assert.equal(r?.code, code, `${label}: ${JSON.stringify(r)}`);
    assert.ok(!/Save|Deletexyz|Archivexyz|Nopexyz/.test(r.reason), `${label}: the reason echoes a locator: ${r.reason}`);
  }
});

test('AC-13 precheckGroundedSteps reads the anonymous snapshots for a plan with no role and strips the query from the route', () => {
  assert.equal(pre([{ action: 'goto', path: '/other?x=1' }, { action: 'click', role: 'button', name: 'Go' }], null), null);
});

test('AC-13 precheckGroundedSteps moves the tracked route on goto and on expect_url', () => {
  // Save exists only on "/", Go only on "/other" for the admin role: the entry that applies is the one of the tracked route.
  assert.equal(pre([GOTO, { action: 'expect_url', path: '/other' }, { action: 'click', role: 'button', name: 'Go' }]), null, 'Go is grounded once expect_url moved to /other');
  const moved = pre([GOTO, { action: 'click', role: 'button', name: 'Save' }, { action: 'expect_url', path: '/other' }, { action: 'click', role: 'button', name: 'Save' }]);
  assert.equal(moved?.code, 'STEP_UNGROUNDED', 'Save is not an entry of /other');
  assert.match(String(moved?.reason), /^step 4:/);
  const back = pre([{ action: 'goto', path: '/other' }, { action: 'goto', path: '/' }, { action: 'click', role: 'button', name: 'Save' }]);
  assert.equal(back, null, 'a later goto moves the route back');
});

test('AC-13 a precheckGroundedSteps refusal names the offending step by position', () => {
  const r = pre([GOTO, { action: 'click', role: 'button', name: 'Save' }, { action: 'click', role: 'button', name: 'Deletexyz' }]);
  assert.match(String(r?.reason), /^step 3:/);
  assert.match(String(r?.reason), /2 elements/);
});

test('AC-13 precheckGroundedSteps refuses an expect_text whose contains is not in the report as PLAN_ENTRY_INVALID', () => {
  const step = (/** @type {string} */ contains) => ({ action: 'expect_text', role: 'heading', name: 'Panel', contains });
  const outsider = pre([GOTO, step('Welcome')]);
  assert.equal(outsider?.code, 'PLAN_ENTRY_INVALID');
  assert.ok(!/Panel|Welcome/.test(outsider?.reason.replace(/expect_text contains must come from the report's own steps, not from the snapshot/, '')), outsider?.reason);
  assert.equal(pre([GOTO, step('Panel')], 'admin', null)?.code, 'PLAN_ENTRY_INVALID', 'a missing manual text fails the expectation');
  assert.equal(pre([GOTO, step('Panel')], 'admin', 42)?.code, 'PLAN_ENTRY_INVALID', 'a non-string manual text fails the expectation');
  assert.equal(pre([GOTO, step('click   SAVE')]), null, 'the substring test is whitespace and case insensitive');
});

test('AC-13 precheckGroundedSteps does not demand a report-sourced expectation of expect_visible', () => {
  assert.equal(pre([GOTO, { action: 'expect_visible', role: 'heading', name: 'Panel' }], 'admin', null), null);
});

// ---------------------------------------------------------------------------
// The real runner: fixtures
// ---------------------------------------------------------------------------

/**
 * @param {string[]} manuals one manual-steps text per case
 */
function reportOf(manuals) {
  const blocks = manuals.map((m, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** Case ${i + 1} title`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      `1. ${m}`,
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

/** A login stub that writes a storage state carrying a session cookie. */
const LOGIN_STUB = [
  'import { writeFileSync, mkdirSync } from "node:fs";',
  'import { join } from "node:path";',
  'const root = process.argv[process.argv.indexOf("--root") + 1];',
  'mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });',
  `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "${TOKEN}", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
].join('\n');

/** @type {import('node:http').Server} */
let pageServer;
let pageUrl = '';
/** @type {Record<string, number>} */
const hits = {};
/** @type {string[]} */
const typed = [];

const PAGE = [
  '<!doctype html><html><body>',
  `<header><a href="/x">${EMAIL}</a></header>`,
  '<h1>Panel</h1>',
  // Adjacent text is merged by the accessibility tree into one line, so a button separates each sensitive text.
  `<div><span>Signed in as ${EMAIL}</span></div><button>Sep</button>`,
  `<div><span>Hello ${PERSON}</span></div><button>Sep</button>`,
  `<div><span>Session ${TOKEN}</span></div><button>Sep</button>`,
  '<button onclick="fetch(\'/saved\')">Save</button>',
  '<button onclick="fetch(\'/deleted\')">Delete</button>',
  '<button onclick="fetch(\'/deleted\')">Delete</button>',
  '<input aria-label="Nick" oninput="fetch(\'/typed?v=\' + encodeURIComponent(this.value))">',
  '<div><span>Welcome back</span></div>',
  '</body></html>',
].join('');

before(async () => {
  pageServer = createServer((req, res) => {
    const u = new URL(String(req.url), 'http://x');
    hits[u.pathname] = (hits[u.pathname] ?? 0) + 1;
    if (u.pathname === '/typed') typed.push(u.searchParams.get('v') ?? '');
    if (u.pathname === '/boom') {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('boom');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  });
  await new Promise((r) => pageServer.listen(0, '127.0.0.1', () => r(null)));
  pageUrl = `http://127.0.0.1:${/** @type {any} */ (pageServer.address()).port}`;
});
after(async () => {
  /** @type {any} */ (pageServer).closeAllConnections?.();
  await new Promise((r) => pageServer.close(() => r(null)));
});
const resetHits = () => {
  for (const k of Object.keys(hits)) delete hits[k];
  typed.length = 0;
};

/**
 * @param {{ baseUrl: string, manuals: string[], browser: boolean, roles?: Record<string, any>, extensions?: string }} o
 */
function fixture(o) {
  const root = tmp(o.browser);
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'reports', 'f', 'qa-report.md'), reportOf(o.manuals));
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: o.baseUrl, roles: o.roles ?? { admin: {} } }));
  writeFileSync(join(root, 'PRPs', 'auth', 'login-admin.mjs'), LOGIN_STUB);
  if (o.extensions !== undefined) writeFileSync(join(root, 'PRPs', 'redaction-extensions.txt'), o.extensions);
  return { root, runDir, sessionsDir: join(root, 'PRPs', 'auth', '.sessions') };
}

/** @param {{ runDir: string }} fx @param {any[][]} stepLists */
function writePlan(fx, stepLists) {
  writeFileSync(
    join(fx.runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: stepLists.map((steps, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: 'browser', role: 'admin', state: 'none', steps })),
    }),
  );
}

/** @param {{ runDir: string }} fx @param {string} name @param {any} doc */
function writeSnapshot(fx, name, doc) {
  mkdirSync(join(fx.runDir, 'grounding'), { recursive: true });
  writeFileSync(join(fx.runDir, 'grounding', name), JSON.stringify(doc));
}

/**
 * @param {string[]} args
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runNode(args, cwd) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, ...args], { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
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

/** @param {string} root */
async function runRunner(root) {
  const r = await runNode(['run', '--root', root, '--feature', 'f', '--run-dir', RUN_REL], root);
  const file = join(root, ...RUN_REL.split('/'), 'results.json');
  return { ...r, results: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null };
}

/** @param {string} root @param {string[]} extra */
const runGround = (root, extra) => runNode(['ground', '--root', root, '--feature', 'f', '--run-dir', RUN_REL, ...extra], root);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

// ---------------------------------------------------------------------------
// The plan-time refusals: before any login and with no browser
// ---------------------------------------------------------------------------

test('AC-13 end to end: an ungrounded, ambiguous, absent or report-foreign locator ends the case needs-human before any login', SLOW, async () => {
  const fx = fixture({
    baseUrl: 'http://127.0.0.1:9',
    browser: false,
    manuals: ['Click Deletexyz and see the Panel heading', 'See the Panel heading', 'Click Archivexyz'],
  });
  writePlan(fx, [
    [{ action: 'goto', path: '/' }, { action: 'click', role: 'button', name: 'Deletexyz' }, { action: 'expect_visible', role: 'heading', name: 'Panel' }],
    [{ action: 'goto', path: '/' }, { action: 'expect_text', role: 'heading', name: 'Panel', contains: 'Welcome' }],
    [{ action: 'goto', path: '/' }, { action: 'click', role: 'button', name: 'Archivexyz' }, { action: 'expect_visible', role: 'heading', name: 'Panel' }],
  ]);

  // First run: there is no grounding directory at all, so no locator step has a snapshot.
  let r = await runRunner(fx.root);
  assert.ok(r.results, `no results.json: ${r.stderr}`);
  for (const [i, c] of r.results.cases.entries()) {
    if (i === 1) continue;
    assert.equal(c.outcome, 'needs-human', `case ${i + 1}: ${JSON.stringify(c)}`);
    assert.equal(c.reason_code, 'STEP_UNGROUNDED', `case ${i + 1}: ${c.reason}`);
    assert.match(c.reason, /step 2/, 'the refusal names the step');
  }
  assert.equal(existsSync(fx.sessionsDir), false, 'a login ran before the grounding refusals');

  // Second run: one snapshot of "/" where Deletexyz matches twice, Panel and Welcome once, Archivexyz is absent.
  writeSnapshot(fx, 'admin--root.snapshot.json', snap('/', [
    { kind: 'role', role: 'button', name: 'Deletexyz', matches: 2 },
    { kind: 'role', role: 'heading', name: 'Panel', matches: 1 },
  ]));
  r = await runRunner(fx.root);
  const [c1, c2, c3] = r.results.cases;
  assert.equal(c1.outcome, 'needs-human');
  assert.equal(c1.reason_code, 'STEP_UNGROUNDED');
  assert.match(c1.reason, /2 elements/);
  assert.equal(c2.outcome, 'needs-human');
  assert.equal(c2.reason_code, 'PLAN_ENTRY_INVALID', 'an expectation that is not in the report is a plan defect');
  assert.equal(c3.outcome, 'needs-human');
  assert.equal(c3.reason_code, 'STEP_UNGROUNDED');
  assert.match(c3.reason, /not a snapshot entry/);
  assert.equal(existsSync(fx.sessionsDir), false, 'a login ran although every case was refused');
  assert.deepEqual(validateResults(r.results), []);
  for (const c of r.results.cases) assert.ok(OUTCOMES.includes(c.outcome), c.outcome);
  for (const c of r.results.cases) assert.ok(!/Deletexyz|Archivexyz/.test(c.reason), `a reason echoes a locator: ${c.reason}`);
});

test('AC-13 end to end: ground refuses bad arguments with the usage text and exit 2', SLOW, async () => {
  const fx = fixture({ baseUrl: 'http://127.0.0.1:9', browser: false, manuals: ['x'] });
  const variants = [
    ['ground'],
    ['ground', '--bogus'],
    ['ground', '--root', fx.root, '--feature', 'f', '--run-dir', RUN_REL],
    ['ground', '--root', fx.root, '--feature', 'f', '--run-dir', RUN_REL, '--route', '//evil.example.com/x'],
    ['ground', '--root', fx.root, '--feature', 'f', '--run-dir', RUN_REL, '--route', 'relative'],
    ['ground', '--root', fx.root, '--feature', 'f', '--run-dir', RUN_REL, '--route', '/', '--role', 'bad role!'],
    ['ground', '--root', fx.root, '--feature', 'f', '--run-dir', 'PRPs/reports/f/qa-run/missing', '--route', '/'],
    ['ground', '--root', fx.root, '--feature', 'f', '--run-dir', 'PRPs/reports/f', '--route', '/'],
  ];
  for (const args of variants) {
    const r = await runNode(args, fx.root);
    assert.equal(r.code, 2, JSON.stringify([args, r.code, r.stderr]));
    assert.ok(r.stderr.includes('Usage:'), JSON.stringify([args, r.stderr]));
  }
  assert.equal(existsSync(join(fx.runDir, 'grounding')), false, 'a refused ground wrote a snapshot');
});

// ---------------------------------------------------------------------------
// The browser: ground, grounded passes, run-time ambiguity
// ---------------------------------------------------------------------------

test('AC-13 AC-16 end to end: ground writes real match counts, withholds sensitive entries and leaks nothing to a file or the terminal', SLOW, async () => {
  const fx = fixture({ baseUrl: pageUrl, browser: true, manuals: ['x'], extensions: `regex:${PERSON}\n` });
  const g = await runGround(fx.root, ['--route', '/', '--role', 'admin']);
  assert.equal(g.code, 0, g.stderr);
  assert.match(g.stdout, /^GROUNDED: grounding\/admin--root\.snapshot\.json entries=\d+ withheld=\d+$/m);
  const file = join(fx.runDir, 'grounding', 'admin--root.snapshot.json');
  const text = readFileSync(file, 'utf8');
  const doc = JSON.parse(text);
  assert.deepEqual(Object.keys(doc).sort(), ['entries', 'role', 'route', 'schema_version', 'withheld'], 'only the declared fields are persisted');
  assert.equal(doc.schema_version, 1);
  assert.equal(doc.role, 'admin');
  assert.equal(doc.route, '/');
  const find = (/** @type {Record<string, string>} */ p) => doc.entries.find((/** @type {any} */ e) => Object.entries(p).every(([k, v]) => e[k] === v));
  assert.equal(find({ kind: 'role', role: 'button', name: 'Save' })?.matches, 1, JSON.stringify(doc.entries));
  assert.equal(find({ kind: 'role', role: 'button', name: 'Delete' })?.matches, 2, 'two identical buttons are counted twice');
  assert.equal(find({ kind: 'role', role: 'heading', name: 'Panel' })?.matches, 1);
  assert.equal(find({ kind: 'role', role: 'textbox', name: 'Nick' })?.matches, 1);
  assert.equal(find({ kind: 'text', text: 'Welcome back' })?.matches, 1);
  assert.ok(doc.withheld >= 4, `the e-mail link, the e-mail text, the person and the session value must be withheld, got ${doc.withheld}`);
  assert.ok(doc.entries.every((/** @type {any} */ e) => typeof e.matches === 'number' && e.matches >= 1), 'every kept entry carries a real count');
  assert.match(g.stdout, new RegExp(`entries=${doc.entries.length} withheld=${doc.withheld}`));
  for (const [label, t] of [['the snapshot', text], ['stdout', g.stdout], ['stderr', g.stderr]]) {
    for (const secret of [EMAIL, 'ana.souza', PERSON, TOKEN]) assert.ok(!t.includes(secret), `${label} carries a sensitive value: ${secret}`);
    assert.ok(!/banner|\/url:/.test(t), `${label} carries raw accessibility text`);
  }
  for (const f of walk(fx.runDir)) {
    assert.ok(!readFileSync(f, 'latin1').includes(TOKEN), `the session value leaked into ${f}`);
  }
  assert.equal(existsSync(join(fx.runDir, 'results.json')), false, 'ground writes no results.json');
  assert.equal(readFileSync(join(fx.root, 'PRPs', 'reports', 'f', 'qa-report.md'), 'utf8'), reportOf(['x']), 'the report is untouched');
});

test('AC-13 end to end: ground without a role writes an anonymous snapshot named by the route slug', SLOW, async () => {
  const fx = fixture({ baseUrl: pageUrl, browser: true, manuals: ['x'] });
  const g = await runGround(fx.root, ['--route', '/some/other?x=1']);
  assert.equal(g.code, 0, g.stderr);
  const file = join(fx.runDir, 'grounding', 'anonymous--some-other.snapshot.json');
  assert.ok(existsSync(file), g.stdout);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(doc.role, 'anonymous');
  assert.equal(doc.route, '/some/other', 'the query is not part of the route');
  assert.ok(doc.entries.length > 0);
  assert.equal(existsSync(fx.sessionsDir), false, 'an anonymous ground must not log in');
});

test('AC-13 end to end: ground halts by name, writes nothing, for an unloadable route, an undeclared role and a role with no session', SLOW, async () => {
  const fx = fixture({ baseUrl: pageUrl, browser: true, manuals: ['x'], roles: { admin: {}, broken: {} } });
  const boom = await runGround(fx.root, ['--route', '/boom']);
  assert.equal(boom.code, 1, boom.stderr);
  assert.match(boom.stderr, /could not be loaded/);
  const ghost = await runGround(fx.root, ['--route', '/', '--role', 'ghost']);
  assert.equal(ghost.code, 1, ghost.stderr);
  assert.match(ghost.stderr, /ghost/);
  const broken = await runGround(fx.root, ['--route', '/', '--role', 'broken']);
  assert.equal(broken.code, 1, broken.stderr);
  assert.match(broken.stderr, /did not produce a session/);
  assert.equal(existsSync(join(fx.runDir, 'grounding')), false, 'a halted ground wrote a snapshot');
  for (const r of [boom, ghost, broken]) assert.equal(r.stdout.includes('GROUNDED:'), false);
});

test('AC-13 end to end: a grounded role, text and fill locator passes and acts exactly once, with a snapshot produced by ground', SLOW, async () => {
  resetHits();
  const fx = fixture({
    baseUrl: pageUrl,
    browser: true,
    manuals: ['Click Save, type into Nick and see Panel and Welcome back', 'Click Delete'],
  });
  const g = await runGround(fx.root, ['--route', '/', '--role', 'admin']);
  assert.equal(g.code, 0, g.stderr);
  resetHits();
  writePlan(fx, [
    [
      { action: 'goto', path: '/' },
      { action: 'click', role: 'button', name: 'Save' },
      { action: 'fill', role: 'textbox', name: 'Nick', value: 'abc' },
      { action: 'expect_text', role: 'heading', name: 'Panel', contains: 'Panel' },
      { action: 'expect_visible', text: 'Welcome back' },
    ],
    [{ action: 'goto', path: '/' }, { action: 'click', role: 'button', name: 'Delete' }, { action: 'expect_visible', role: 'heading', name: 'Panel' }],
  ]);
  const r = await runRunner(fx.root);
  await new Promise((res) => setTimeout(res, 500));
  const [c1, c2] = r.results.cases;
  assert.equal(c1.outcome, 'pass', JSON.stringify([c1.outcome, c1.reason_code, c1.reason]));
  assert.equal(hits['/saved'], 1, 'the Save click must be performed exactly once');
  assert.deepEqual(typed, ['abc'], 'the fill must reach the page');
  assert.equal(c2.outcome, 'needs-human', 'a locator the snapshot counted twice is refused at plan time');
  assert.equal(c2.reason_code, 'STEP_UNGROUNDED');
  assert.equal(hits['/deleted'] ?? 0, 0, 'an ambiguous locator was acted on');
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-13 end to end: a locator a lying snapshot calls unique but the page renders twice is never acted on at run time', SLOW, async () => {
  resetHits();
  const fx = fixture({ baseUrl: pageUrl, browser: true, manuals: ['Click Delete and see the Panel heading'] });
  // Hand-written: it claims Delete matches once, so only the run-time count can stop the click.
  writeSnapshot(fx, 'admin--other.snapshot.json', snap('/other', [
    { kind: 'role', role: 'button', name: 'Delete', matches: 1 },
    { kind: 'role', role: 'heading', name: 'Panel', matches: 1 },
  ]));
  writePlan(fx, [[{ action: 'goto', path: '/other' }, { action: 'click', role: 'button', name: 'Delete' }, { action: 'expect_visible', role: 'heading', name: 'Panel' }]]);
  const r = await runRunner(fx.root);
  await new Promise((res) => setTimeout(res, 500));
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'needs-human', JSON.stringify([c.outcome, c.reason_code, c.reason]));
  assert.equal(c.reason_code, 'STEP_UNGROUNDED');
  assert.match(c.reason, /2 elements/);
  assert.match(c.reason, /^step 2:/);
  assert.equal(hits['/deleted'] ?? 0, 0, 'an ambiguous locator was acted on');
  assert.equal(c.steps[1].result, 'failed', JSON.stringify(c.steps));
  assert.equal(c.steps[2].result, 'not-run', JSON.stringify(c.steps));
  assert.deepEqual(validateResults(r.results), []);
});

test('AC-13 end to end: zero run-time matches fail an expectation and block a click, an unmet text expectation fails, and a selector step still passes', SLOW, async () => {
  resetHits();
  const fx = fixture({
    baseUrl: pageUrl,
    browser: true,
    manuals: ['See Nothing here', 'Click Nothing here', 'See that the Panel heading says Different', 'See the Panel heading'],
  });
  writeSnapshot(fx, 'admin--zero.snapshot.json', snap('/zero', [
    { kind: 'role', role: 'button', name: 'Nothing here', matches: 1 },
    { kind: 'role', role: 'heading', name: 'Panel', matches: 1 },
  ]));
  const zero = { action: 'goto', path: '/zero' };
  writePlan(fx, [
    [zero, { action: 'expect_visible', role: 'button', name: 'Nothing here' }],
    [zero, { action: 'click', role: 'button', name: 'Nothing here' }, { action: 'expect_visible', role: 'heading', name: 'Panel' }],
    [zero, { action: 'expect_text', role: 'heading', name: 'Panel', contains: 'Different' }],
    [{ action: 'goto', path: '/' }, { action: 'expect_visible', selector: 'h1' }, { action: 'expect_text', selector: 'h1', contains: 'Panel' }],
  ]);
  const r = await runRunner(fx.root);
  const [c1, c2, c3, c4] = r.results.cases;
  assert.equal(c1.outcome, 'fail', JSON.stringify([c1.outcome, c1.reason_code, c1.reason]));
  assert.equal(c2.outcome, 'blocked', JSON.stringify([c2.outcome, c2.reason_code, c2.reason]));
  assert.equal(c2.reason_code, 'STEP_NOT_PERFORMABLE');
  assert.equal(c3.outcome, 'fail', JSON.stringify([c3.outcome, c3.reason_code, c3.reason]));
  assert.equal(c4.outcome, 'pass', JSON.stringify([c4.outcome, c4.reason_code, c4.reason]));
  for (const c of [c1, c2, c3]) assert.ok(!/Nothing here|Different/.test(c.reason), `a reason carries a locator or an expected value: ${c.reason}`);
  assert.deepEqual(validateResults(r.results), []);
});

// ---------------------------------------------------------------------------
// The planning document and the frozen surfaces
// ---------------------------------------------------------------------------

const COMMAND_DOC = readFileSync(resolve('plugins/relay/commands/relay-qa-run.md'), 'utf8').replace(/\r\n/g, '\n');
const EXAMPLE_BLOCK = /<!-- qa-step-example driver=(\w+) -->[ \t]*\n```json\n([\s\S]*?)\n```/g;
/** @type {{ driver: string, step: any }[]} */
const DOC_EXAMPLES = [...COMMAND_DOC.matchAll(EXAMPLE_BLOCK)].map((m) => ({ driver: m[1], step: JSON.parse(m[2]) }));

test('AC-1 the planning doc carries a marked browser role-and-name example and a marked browser text example, both valid steps', () => {
  const browser = DOC_EXAMPLES.filter((e) => e.driver === 'browser');
  const roleEx = browser.find((e) => typeof e.step.role === 'string' && typeof e.step.name === 'string' && e.step.selector === undefined);
  const textEx = browser.find((e) => typeof e.step.text === 'string' && e.step.selector === undefined && e.step.role === undefined);
  assert.ok(roleEx, 'no marked browser role+name example in relay-qa-run.md');
  assert.ok(textEx, 'no marked browser text example in relay-qa-run.md');
  for (const e of [roleEx, textEx]) assert.equal(validateStep('browser', e?.step), null, JSON.stringify(e?.step));
  assert.ok(locatorOf(roleEx?.step)?.ok === true && locatorOf(textEx?.step)?.ok === true);
});

test('AC-1 the planning doc names the ground command, STEP_UNGROUNDED, the exactly-one rule and the redaction-extensions file', () => {
  assert.ok(COMMAND_DOC.includes('qa-run.mjs" ground --root'), 'the ground command is missing');
  assert.ok(COMMAND_DOC.includes('STEP_UNGROUNDED'), 'STEP_UNGROUNDED is missing');
  assert.ok(COMMAND_DOC.includes('PRPs/redaction-extensions.txt'), 'the personal-data extension file is not named');
  assert.match(COMMAND_DOC, /`matches` is exactly `1`/, 'the exactly-one grounding rule is missing');
  assert.ok(!/Until seeds|not yet read by the runner/.test(COMMAND_DOC), 'a retired stop-gap phrase is back');
});

test('AC-15 the outcome vocabulary is exactly the four closed values', () => {
  assert.deepEqual(OUTCOMES, ['pass', 'fail', 'blocked', 'needs-human']);
});

const FROZEN = [
  'plugins/relay/agents/code-reviewer.md',
  'plugins/relay/agents/code-reviewer-semantic.md',
  'plugins/relay/commands/relay-implement.md',
  'plugins/relay/scripts/visual/capture.mjs',
];
const gitProbe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: resolve('.'), encoding: 'utf8' });
const GIT_SKIP = gitProbe.error || gitProbe.status !== 0 ? 'git is unavailable or the cwd is not a work tree' : false;

test('AC-15 the four frozen surfaces are byte-identical to HEAD', { skip: GIT_SKIP }, () => {
  for (const f of FROZEN) assert.ok(existsSync(resolve(f)), `${f} is missing`);
  const r = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', ...FROZEN], { cwd: resolve('.'), encoding: 'utf8' });
  assert.equal(r.status, 0, `a frozen surface differs from HEAD: ${r.stdout}${r.stderr}`);
});
