// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-24 (runner side) A stale or unstamped template-generated login script is a named blocked reason, flagged read-only
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-25 (runner side) FAILED_PROBE_MARKER_ABSENT is a named blocked reason
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-27 (runner side) The static-token halts are still reported as SESSION_UNAVAILABLE
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-29 A browser case against a target that authenticates everyone is blocked, never pass
/**
 * Behavioral tests for the phase-8 changes of plugins/relay/scripts/qa-run.mjs.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md (AC-24, AC-25, AC-27, AC-29)
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-8-probe-and-kit-hardening.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false). Every test runs
 * the REAL runner as an ASYNC child process (a synchronous spawn would block this
 * process's event loop and deadlock the loopback servers) against a temp fixture
 * project and 127.0.0.1 servers. Real Chromium + Playwright drive the browser
 * cases; there are no skip conditions.
 *
 * Login scripts in the fixtures are either stubs (a hand-written script that
 * writes a storage-state file, so the runner never needs a real login) or copies
 * of the REAL template carrying a chosen identity stamp (what the stale
 * pre-flight judges).
 *
 * Timing: the anonymous check of a clean alternative target waits the whole
 * ANONYMOUS_CHECK_MS window (20 s) with no seam, so the single test that needs a
 * clean verdict runs a COPY of the runner (the existing pluginCopy pattern of
 * qa-run.test.mjs) whose constant is shortened by an anchored replacement. Every
 * other gate scenario concludes at once (the marker is visible immediately, the
 * guard refuses, or no check is reachable) and uses the real script and window.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

const PLUGIN = resolve('plugins/relay');
const REAL_SCRIPT = join(PLUGIN, 'scripts', 'qa-run.mjs');
const REAL_GUARD = join(PLUGIN, 'scripts', 'auth-local-guard.mjs');
const REAL_SOURCE = readFileSync(REAL_SCRIPT, 'utf8').replace(/\r\n/g, '\n');
const TEMPLATE = readFileSync(join(PLUGIN, 'resources', 'auth-login.template.mjs'), 'utf8').replace(/\r\n/g, '\n');
const NODE_MODULES = resolve('node_modules');
const STAMP_LINE = /^const KIT_TEMPLATE_ID = '([^']+)';$/m;
const STAMP = /** @type {RegExpExecArray} */ (STAMP_LINE.exec(TEMPLATE))[1];

const FEATURE = 'feat';
const RUN_ID = '20260101T101010101Z';
const RUN_DIR_REL = `PRPs/reports/${FEATURE}/qa-run/${RUN_ID}`;
const REPORT_REL = `PRPs/reports/${FEATURE}/qa-report.md`;

// ---------------------------------------------------------------------------
// Loopback applications: a primary that authenticates everyone, an alternative
// that authenticates only a visitor carrying the session cookie, and a second
// alternative that also authenticates everyone.
// ---------------------------------------------------------------------------

/** Request counts per server, keyed by path. @type {{ primary: Record<string, number>, clean: Record<string, number>, everyone: Record<string, number> }} */
const hits = { primary: {}, clean: {}, everyone: {} };
const resetHits = () => {
  hits.primary = {};
  hits.clean = {};
  hits.everyone = {};
};

const AUTHED = '<!doctype html><html><body><div id="authed">Authenticated area</div></body></html>';
const ANON = '<!doctype html><html><body><p>please sign in</p></body></html>';

/**
 * @param {'primary' | 'clean' | 'everyone'} name
 * @param {(cookie: string) => boolean} sessionOnly whether a visitor with this Cookie header is shown the authenticated-only marker
 */
function appServer(name, sessionOnly) {
  return createServer((req, res) => {
    const p = new URL(req.url ?? '/', 'http://x').pathname;
    const c = hits[name];
    c[p] = (c[p] ?? 0) + 1;
    if (p === '/ok') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"ok":true}');
    }
    if (p === '/dash') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end(sessionOnly(String(req.headers.cookie ?? '')) ? AUTHED : ANON);
    }
    res.writeHead(404);
    res.end('nf');
  });
}

/** @type {import('node:http').Server[]} */ let servers = [];
let primaryUrl = '';
let cleanUrl = '';
let everyoneUrl = '';

before(async () => {
  const primary = appServer('primary', () => true);
  const clean = appServer('clean', (cookie) => /(?:^|; )qa=1(?:;|$)/.test(cookie));
  const everyone = appServer('everyone', () => true);
  servers = [primary, clean, everyone];
  for (const s of servers) await new Promise((r) => s.listen(0, '127.0.0.1', () => r(null)));
  const url = (/** @type {import('node:http').Server} */ s) => `http://127.0.0.1:${/** @type {any} */ (s.address()).port}`;
  primaryUrl = url(primary);
  cleanUrl = url(clean);
  everyoneUrl = url(everyone);
});

/** @type {string[]} */
const temps = [];
after(async () => {
  for (const s of servers) {
    /** @type {any} */ (s).closeAllConnections?.();
    await new Promise((r) => s.close(() => r(null)));
  }
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Helpers (the shapes of qa-run.test.mjs, restated: that file registers its own tests on import)
// ---------------------------------------------------------------------------

/**
 * @param {string} scriptPath
 * @param {string[]} args
 * @param {{ cwd?: string, env?: Record<string, string> }} [opts]
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runScript(scriptPath, args, opts = {}) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
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

/** @param {{ title: string }[]} cases */
function reportText(cases) {
  const blocks = cases.map((c, i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${c.title}`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** none',
      '**Automated test path:** n/a',
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      '1. Open the page.',
      '2. Check the result.',
      '',
    ].join('\n'),
  );
  return `# QA Report\n\n## Test Cases\n\n${blocks.join('\n')}\n## Notes\n\nnone\n`;
}

const STUB_STATE = JSON.stringify({
  cookies: [{ name: 'qa', value: '1', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }],
  origins: [],
});

/** A hand-written login script: writes the storage-state file for its role and exits 0. @param {string} role */
const sessionStub = (role) =>
  `import { mkdirSync, writeFileSync } from 'node:fs';\nimport { join } from 'node:path';\nconst root = process.argv[process.argv.indexOf('--root') + 1];\nmkdirSync(join(root, 'PRPs', 'auth', '.sessions'), { recursive: true });\nwriteFileSync(join(root, 'PRPs', 'auth', '.sessions', ${JSON.stringify(`${role}.json`)}), ${JSON.stringify(STUB_STATE)});\n`;

/** A hand-written login script that halts with the given stderr line. @param {string} line */
const haltStub = (line) => `process.stderr.write(${JSON.stringify(`${line}\n`)});\nprocess.exit(1);\n`;

/**
 * @typedef {{ role: string, driver: 'http' | 'browser', title: string, config: Record<string, any>, script?: string | null }} CaseSpec
 */

/**
 * A fixture project: one report case per spec, one login script per role.
 * @param {CaseSpec[]} specs
 */
function makeFixture(specs) {
  const root = mkdtempSync(join(tmpdir(), 'relay-qakit-'));
  temps.push(root);
  mkdirSync(join(root, ...RUN_DIR_REL.split('/')), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, ...REPORT_REL.split('/')), reportText(specs));
  /** @type {Record<string, any>} */ const roles = {};
  for (const s of specs) {
    roles[s.role] = s.config;
    if (s.script !== null && s.script !== undefined) writeFileSync(join(root, 'PRPs', 'auth', `login-${s.role}.mjs`), s.script);
  }
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: primaryUrl, roles }));
  const plan = specs.map((s, i) => ({
    index: i + 1,
    title: s.title,
    driver: s.driver,
    role: s.role,
    state: 'none',
    steps:
      s.driver === 'http'
        ? [{ action: 'request', method: 'GET', path: '/ok', expect_status: 200 }]
        : [
            { action: 'goto', path: '/dash' },
            { action: 'expect_visible', selector: '#authed' },
          ],
  }));
  writeFileSync(join(root, ...RUN_DIR_REL.split('/'), 'plan.json'), JSON.stringify({ schema_version: 1, cases: plan }));
  return {
    root,
    /** @returns {any} */
    results() {
      return JSON.parse(readFileSync(join(root, ...RUN_DIR_REL.split('/'), 'results.json'), 'utf8'));
    },
    sessionOf: (/** @type {string} */ role) => join(root, 'PRPs', 'auth', '.sessions', `${role}.json`),
    scriptOf: (/** @type {string} */ role) => join(root, 'PRPs', 'auth', `login-${role}.mjs`),
  };
}

/** @param {ReturnType<typeof makeFixture>} f @param {string} [script] @param {Record<string, string>} [env] */
async function run(f, script = REAL_SCRIPT, env) {
  const proc = await runScript(script, ['run', '--root', f.root, '--feature', FEATURE, '--run-dir', RUN_DIR_REL], { cwd: f.root, env });
  assert.equal(proc.code, 0, `${proc.stdout}\n${proc.stderr}`);
  return { ...proc, results: f.results() };
}

/**
 * Copies the runner (optionally mutated) and the guard into a temp plugin tree.
 * @param {{ mutations?: [string, string][], installedTemplate?: string }} [o]
 * @returns {string} the copied script path
 */
function pluginCopy(o = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-qakit-plugin-'));
  temps.push(dir);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  let src = REAL_SOURCE;
  for (const [from, to] of o.mutations ?? []) {
    assert.equal(src.split(from).length - 1, 1, `mutation anchor must occur exactly once: ${from}`);
    src = src.replace(from, () => to);
  }
  const script = join(dir, 'scripts', 'qa-run.mjs');
  writeFileSync(script, src);
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  if (o.installedTemplate !== undefined) {
    mkdirSync(join(dir, 'resources'), { recursive: true });
    writeFileSync(join(dir, 'resources', 'auth-login.template.mjs'), o.installedTemplate);
  }
  return script;
}
/** Playwright resolves from the repo's node_modules for copied runners. */
const COPY_ENV = { NODE_PATH: NODE_MODULES };

const SLOW = { timeout: 150000 };
const MEDIUM = { timeout: 90000 };

/** @param {string} role @param {string | null} [text] */
const generatedScript = (role, text = null) => (text ?? TEMPLATE).replaceAll('__RELAY_ROLE__', role);

// ---------------------------------------------------------------------------
// AC-29: a browser case against a target that authenticates everyone
// ---------------------------------------------------------------------------

const RECORD = { evidence: 'server/dev-proxy.js:12', alternativeBaseUrl: null };
/** @param {Record<string, any>} [over] */
const browserRole = (over = {}) => ({
  mechanism: 'api',
  browserProbe: { route: '/dash', marker: { kind: 'selector', value: '#authed' }, roleMarker: null },
  ...over,
});

test('AC-29: a browser case for a role recorded as authenticated-for-everyone is blocked FAILED_TARGET_PRE_AUTHENTICATED (never pass) with nothing requested, seeded or logged in; an alternative that also authenticates everyone stays blocked; a non-local alternative is refused by the guard; a role with no browser probe cannot be confirmed; HTTP cases and unrecorded roles are not gated', MEDIUM, async () => {
  resetHits();
  const f = makeFixture([
    { role: 'gated', driver: 'browser', title: 'Gated browser case', script: sessionStub('gated'), config: browserRole({ authenticatesAnonymous: RECORD }) },
    { role: 'plain', driver: 'browser', title: 'Unrecorded browser case', script: sessionStub('plain'), config: browserRole() },
    { role: 'nobp', driver: 'browser', title: 'No browser probe case', script: sessionStub('nobp'), config: { mechanism: 'api', authenticatesAnonymous: { ...RECORD, alternativeBaseUrl: cleanUrl } } },
    { role: 'remote', driver: 'browser', title: 'Non-local alternative case', script: sessionStub('remote'), config: browserRole({ authenticatesAnonymous: { ...RECORD, alternativeBaseUrl: 'http://example.com' } }) },
    { role: 'httpgated', driver: 'http', title: 'Gated role over HTTP', script: sessionStub('httpgated'), config: browserRole({ authenticatesAnonymous: RECORD }) },
    { role: 'everyone', driver: 'browser', title: 'Alternative that authenticates everyone', script: sessionStub('everyone'), config: browserRole({ authenticatesAnonymous: { ...RECORD, alternativeBaseUrl: everyoneUrl } }) },
  ]);
  const r = await run(f);
  const [gated, plain, nobp, remote, httpgated, everyone] = r.results.cases;

  assert.equal(gated.outcome, 'blocked', JSON.stringify(gated));
  assert.equal(gated.reason_code, 'FAILED_TARGET_PRE_AUTHENTICATED');
  assert.match(gated.reason, /server\/dev-proxy\.js:12/, 'the block must cite the recorded evidence');
  assert.match(gated.reason, /gated/, 'the block must name the role');
  assert.ok(!existsSync(f.sessionOf('gated')), 'a blocked case must not log in');

  assert.equal(plain.outcome, 'pass', JSON.stringify(plain));
  assert.ok(existsSync(f.sessionOf('plain')));

  assert.equal(nobp.outcome, 'blocked', JSON.stringify(nobp));
  assert.equal(nobp.reason_code, 'FAILED_TARGET_PRE_AUTHENTICATED');
  assert.match(nobp.reason, /no browser probe/);
  assert.ok(!existsSync(f.sessionOf('nobp')));

  assert.equal(remote.outcome, 'blocked', JSON.stringify(remote));
  assert.equal(remote.reason_code, 'FAILED_NON_LOCAL_TARGET');
  assert.ok(!existsSync(f.sessionOf('remote')));

  assert.equal(httpgated.outcome, 'pass', `HTTP cases are never gated: ${JSON.stringify(httpgated)}`);
  assert.ok(existsSync(f.sessionOf('httpgated')));

  assert.equal(everyone.outcome, 'blocked', JSON.stringify(everyone));
  assert.equal(everyone.reason_code, 'FAILED_TARGET_PRE_AUTHENTICATED');
  assert.match(everyone.reason, /still showed the authenticated-only marker/);
  assert.ok((hits.everyone['/dash'] ?? 0) >= 1, 'the anonymous check must have loaded the alternative');
  assert.ok(!existsSync(f.sessionOf('everyone')));

  // Only the unrecorded role's browser case ever reached the primary page.
  assert.equal(hits.primary['/dash'], 1, `the gated browser cases reached the primary target: ${JSON.stringify(hits.primary)}`);
});

test('AC-29: an alternative local target that passes the anonymous check is used: the case runs there (and passes), not on the primary target', SLOW, async () => {
  resetHits();
  const script = pluginCopy({ mutations: [['const ANONYMOUS_CHECK_MS = 20000;', 'const ANONYMOUS_CHECK_MS = 2500;']] });
  const f = makeFixture([
    { role: 'alt', driver: 'browser', title: 'Case on the alternative target', script: sessionStub('alt'), config: browserRole({ authenticatesAnonymous: { ...RECORD, alternativeBaseUrl: cleanUrl } }) },
  ]);
  const r = await run(f, script, COPY_ENV);
  const c = r.results.cases[0];
  assert.equal(c.outcome, 'pass', JSON.stringify(c));
  assert.equal(c.reason_code, null);
  assert.ok((hits.clean['/dash'] ?? 0) >= 2, `the anonymous check and the case itself must both load the alternative: ${JSON.stringify(hits.clean)}`);
  assert.equal(hits.primary['/dash'], undefined, 'the case must not run on the primary target');
  assert.ok(existsSync(f.sessionOf('alt')), 'the role is logged in only after the gate passed');
});

test('mutation: removing the gate lets the browser case pass against the target that authenticates everyone (the AC-29 blocked test is what catches it)', MEDIUM, async () => {
  resetHits();
  const script = pluginCopy({ mutations: [['if (isObj(record)) {', 'if (false) {']] });
  const f = makeFixture([
    { role: 'gated', driver: 'browser', title: 'Gated browser case', script: sessionStub('gated'), config: browserRole({ authenticatesAnonymous: RECORD }) },
  ]);
  const r = await run(f, script, COPY_ENV);
  assert.equal(r.results.cases[0].outcome, 'pass', 'the mutated copy must produce the false pass the gate exists to prevent');
  assert.equal(hits.primary['/dash'], 1);
});

// ---------------------------------------------------------------------------
// AC-24 / AC-25 / AC-27: named blocked reasons and the stale pre-flight
// ---------------------------------------------------------------------------

test('AC-24: a template-generated script whose stamp differs from the installed template, or that carries none, is blocked FAILED_KIT_SCRIPT_STALE naming both identities and /relay-auth-scripts --refresh, without being run or modified; a hand-written script and a matching stamp are not judged', MEDIUM, async () => {
  const older = `${STAMP}-older`;
  const oldText = generatedScript('old', TEMPLATE.replace(STAMP_LINE, (line) => line.replace(STAMP, older)));
  const unstampedText = generatedScript('unstamped', TEMPLATE.replace(STAMP_LINE, ''));
  assert.ok(!STAMP_LINE.test(unstampedText), 'the fixture script must really carry no stamp');
  const f = makeFixture([
    { role: 'old', driver: 'http', title: 'Old stamp', script: oldText, config: { mechanism: 'api' } },
    { role: 'unstamped', driver: 'http', title: 'No stamp', script: unstampedText, config: { mechanism: 'api' } },
    { role: 'current', driver: 'http', title: 'Current stamp', script: generatedScript('current'), config: { mechanism: 'api' } },
    { role: 'hand', driver: 'http', title: 'Hand written', script: sessionStub('hand'), config: { mechanism: 'api' } },
  ]);
  const r = await run(f);
  const [old, unstamped, current, hand] = r.results.cases;

  assert.equal(old.outcome, 'blocked', JSON.stringify(old));
  assert.equal(old.reason_code, 'FAILED_KIT_SCRIPT_STALE');
  assert.ok(old.reason.includes(`${older} vs ${STAMP}`), `the reason must name both identities: ${old.reason}`);
  assert.match(old.reason, /\/relay-auth-scripts --refresh/);

  assert.equal(unstamped.outcome, 'blocked', JSON.stringify(unstamped));
  assert.equal(unstamped.reason_code, 'FAILED_KIT_SCRIPT_STALE');
  assert.ok(unstamped.reason.includes(`unstamped vs ${STAMP}`), unstamped.reason);

  // Read-only: neither script was run (no secrecy file, no session) and neither was rewritten.
  assert.ok(!existsSync(f.sessionOf('old')) && !existsSync(f.sessionOf('unstamped')));
  assert.equal(readFileSync(f.scriptOf('old'), 'utf8'), oldText);
  assert.equal(readFileSync(f.scriptOf('unstamped'), 'utf8'), unstampedText);

  // Controls: the pre-flight is specific to a stamp mismatch on a generated script.
  assert.notEqual(current.reason_code, 'FAILED_KIT_SCRIPT_STALE', `a matching stamp must run the script: ${JSON.stringify(current)}`);
  assert.equal(current.reason_code, 'SESSION_UNAVAILABLE');
  assert.equal(hand.outcome, 'pass', `a hand-written script is not judged: ${JSON.stringify(hand)}`);
});

test('AC-24: the pre-flight fails open when the installed template is unreadable or carries no stamp (an unstamped generated script is then run, not flagged)', MEDIUM, async () => {
  for (const [label, installedTemplate] of /** @type {[string, string | undefined][]} */ ([
    ['no installed template at all', undefined],
    ['an installed template with no stamp line', '// no identity stamp here\n'],
  ])) {
    const f = makeFixture([{ role: 'unstamped', driver: 'http', title: 'No stamp', script: generatedScript('unstamped', TEMPLATE.replace(STAMP_LINE, '')), config: { mechanism: 'api' } }]);
    const r = await run(f, pluginCopy({ installedTemplate }), COPY_ENV);
    const c = r.results.cases[0];
    assert.equal(c.outcome, 'blocked', `${label}: ${JSON.stringify(c)}`);
    assert.notEqual(c.reason_code, 'FAILED_KIT_SCRIPT_STALE', label);
    assert.equal(c.reason_code, 'SESSION_UNAVAILABLE', label);
  }
});

test('AC-24 / AC-25 / AC-27: a script that halts FAILED_PROBE_MARKER_ABSENT or FAILED_KIT_SCRIPT_STALE is a blocked case with that reason code; the three static-token halts stay SESSION_UNAVAILABLE and still carry their code', MEDIUM, async () => {
  /** @type {[string, string][]} */
  const rows = [
    ['marker', 'FAILED_PROBE_MARKER_ABSENT'],
    ['stale', 'FAILED_KIT_SCRIPT_STALE'],
    ['rejected', 'FAILED_TOKEN_REJECTED'],
    ['transport', 'FAILED_TOKEN_TRANSPORT'],
    ['placement', 'FAILED_TOKEN_PLACEMENT'],
  ];
  const f = makeFixture(rows.map(([role, code]) => ({ role, driver: 'http', title: `Halt ${code}`, script: haltStub(`${code}: from the script`), config: { mechanism: 'api' } })));
  const r = await run(f);
  rows.forEach(([role, code], i) => {
    const c = r.results.cases[i];
    assert.equal(c.outcome, 'blocked', `${role}: ${JSON.stringify(c)}`);
    if (role === 'marker' || role === 'stale') {
      assert.equal(c.reason_code, code, `${role}: ${JSON.stringify(c)}`);
    } else {
      assert.equal(c.reason_code, 'SESSION_UNAVAILABLE', `${role}: ${JSON.stringify(c)}`);
      assert.ok(JSON.stringify(c).includes(code), `the blocked reason must still carry ${code}`);
    }
  });
});
