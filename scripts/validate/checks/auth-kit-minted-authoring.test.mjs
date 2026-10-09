// @ts-check
// PRPs/prds/test-auth-minted-session.prd.md AC-11 The auth-model template, writer and reviewer recognize a minted mechanism; /relay-auth-scripts writes its mint block as "proposed" and never "confirmed"
// PRPs/prds/test-auth-minted-session.prd.md AC-12 (refresh half) --refresh adds mint without changing a set value; a refreshed auth-login/1 kit runs as before and a generated proposed block halts at the trust gate
/**
 * Contract tests for phase 2 ("Kit authoring") of test-auth-minted-session.
 *
 * The authoring side is prose executed by an agent (the auth-model template, the
 * writer and reviewer agents, the `/relay-auth-scripts` command), so the observable
 * contract is the text the agent follows; those pins are placed per behavior, in the
 * style of auth-model-pair.test.mjs and auth-kit-commands-hardening.test.mjs. The one
 * behavioral claim code can verify (a kit regenerated from the installed template runs
 * against its unchanged auth-login/1-era configuration, and a generated `proposed`
 * `mint` block validates and halts at the trust gate with nothing run) is exercised
 * against the REAL template in a temp git project, as an ASYNC child process beside an
 * in-process loopback server (a synchronous spawn would block that server).
 *
 * Not repeated here: the stale-stamp halt and the byte-identity of the code-review loop
 * files (PRD AC-13), both pinned in auth-minted-session.test.mjs; the nine skeleton
 * headings, the seven R-AM ids and the writer/reviewer tool lines, pinned in
 * auth-model-pair.test.mjs; the written-file set and forbidden tokens of the command,
 * pinned in auth-scripts-command.test.mjs.
 *
 * Source PRD:  PRPs/prds/test-auth-minted-session.prd.md (AC-11, AC-12, AC-13)
 * Source plan: PRPs/plans/completed/test-auth-minted-session-phase-2-kit-authoring.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false).
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PLUGIN = join(REPO, 'plugins', 'relay');

const TEMPLATE_MD = 'plugins/relay/resources/auth-model-template.md';
const REVIEWER = 'plugins/relay/agents/auth-model-reviewer.md';
const WRITER = 'plugins/relay/agents/auth-model-writer.md';
const SCRIPTS = 'plugins/relay/commands/relay-auth-scripts.md';
const API_REF = 'docs/api-reference.md';
const COMMANDS_HTML = 'documentation/reference/commands.html';
const AGENTS_HTML = 'documentation/reference/agents.html';
const CHANGELOG_HTML = 'documentation/changelog.html';

/** @param {string} rel */
function read(rel) {
  return readFileSync(resolve(REPO, rel), 'utf-8').replace(/\r\n/g, '\n');
}

/** @param {string} s */
function collapse(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} content
 * @param {string} start
 * @param {string} end
 * @returns {string}
 */
function section(content, start, end) {
  const i = content.indexOf(start);
  assert.notEqual(i, -1, `section start not found: ${start}`);
  const j = content.indexOf(end, i + start.length);
  assert.notEqual(j, -1, `section end not found: ${end}`);
  return content.slice(i, j);
}

/**
 * @param {string} flat
 * @param {[string, string][]} pins [behavior, literal]
 */
function assertPins(flat, pins) {
  for (const [behavior, literal] of pins) {
    assert.ok(flat.includes(literal), `${behavior}: must say "${literal}"`);
  }
}

/**
 * The text of one rubric bullet: from its `- **R-AMn**` line to the next rubric bullet or the section rule.
 * @param {string} text
 * @param {number} n
 */
function rubricBullet(text, n) {
  const start = text.indexOf(`- **R-AM${n}**`);
  assert.notEqual(start, -1, `R-AM${n} bullet not found`);
  const rest = text.slice(start + 1);
  const next = rest.search(/\n- \*\*R-AM\d\*\*|\n---/);
  return collapse(next === -1 ? text.slice(start) : text.slice(start, start + 1 + next));
}

/**
 * True when the command text documents the generator writing a `confirmed` status.
 * @param {string} text
 */
function documentsWritingConfirmed(text) {
  return /"status"\s*:\s*"confirmed"/.test(text) || /`status` is the literal `"confirmed"`/.test(collapse(text));
}

// ---------------------------------------------------------------------------
// AC-11: the auth-model template
// ---------------------------------------------------------------------------

test('AC-11: the auth-model template records a minted mechanism (issuing code file:line, declared command or none declared, store; no value) and a login-less minted flow, as notes and not as new sections', () => {
  const text = read(TEMPLATE_MD);
  const skeleton = text.slice(text.indexOf('## Skeleton'));
  const flat = collapse(skeleton);
  assertPins(flat, [
    ['mechanism note', 'is the `minted` mechanism: record the file:line of the code that issues the session or its tokens'],
    ['declared command', 'the command the project declares for it as an argv list or "none declared"'],
    ['store', 'and the local store it touches'],
    ['no value', 'never a token, cookie or credential value'],
    ['flow note', 'a `minted` flow has no login step: state that the session is issued by the declared command, mark it scriptable, and cite the issuing code\'s file:line'],
  ]);
  // The notes are prose inside the skeleton fence: no second-level heading mentions the mechanism,
  // and the mechanism note sits under Authentication Mechanisms, the flow note under Login Flow.
  const headings = [...skeleton.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.ok(headings.every((h) => !h.includes('minted')), `no heading may name minted: ${headings.join('|')}`);
  const mech = collapse(section(skeleton, '## Authentication Mechanisms', '## Login Flow'));
  const flow = collapse(section(skeleton, '## Login Flow', '## Session and Token Model'));
  assert.ok(mech.includes('is the `minted` mechanism'), 'the mechanism note must sit under ## Authentication Mechanisms');
  assert.ok(flow.includes('a `minted` flow has no login step'), 'the flow note must sit under ## Login Flow');
});

// ---------------------------------------------------------------------------
// AC-11: the reviewer
// ---------------------------------------------------------------------------

test('AC-11: the reviewer accepts a minted mechanism with file:line evidence (R-AM1), a login-less scriptable minted flow (R-AM2), and fails a recorded minted value (R-AM6), inside the existing seven rows', () => {
  const text = read(REVIEWER);
  const r1 = rubricBullet(text, 1);
  assertPins(r1, [
    ['R-AM1 accepts minted', 'A `minted` mechanism satisfies this row when it names the code that issues the session or its tokens with `file:line` evidence (verify by `Read`)'],
    ['R-AM1 command and store', 'the declared command or an explicit "none declared", and the local store it touches'],
  ]);
  const r2 = rubricBullet(text, 2);
  assert.ok(
    r2.includes('A `minted` flow states that no login request exists and marks the flow scriptable.'),
    'R-AM2 must carry the minted flow rule',
  );
  const r6 = rubricBullet(text, 6);
  assert.ok(
    r6.includes('A model that names a `minted` token, cookie or localStorage VALUE (rather than the issuing code and store) fails this row.'),
    'R-AM6 must fail a recorded minted value',
  );
  // The rule extends rows; it does not add one, and the minted sentences do not leak into other rows.
  for (const n of [3, 4, 5, 7]) assert.ok(!rubricBullet(text, n).includes('minted'), `R-AM${n} must not carry the minted rule`);
  assert.equal(text.match(/^- \*\*R-AM\d+\*\*/gm)?.length, 7);
});

// ---------------------------------------------------------------------------
// AC-11: the writer
// ---------------------------------------------------------------------------

test('AC-11: the writer discovers a minted mechanism from the code that issues sessions or tokens, cites file:line, never records a value or a secret file, and logs a missing command as an open question', () => {
  const discovery = collapse(section(read(WRITER), '## Discovery protocol', '## Protocol'));
  assertPins(discovery, [
    ['bullet', 'A `minted` mechanism: code that issues a session or its tokens for an existing user without a login request'],
    ['evidence', 'record it with `file:line` evidence'],
    ['declared command', 'the command the project declares for it as an argv list when one is documented (else "none declared" with a matching row under `## Open Questions and Assumptions`)'],
    ['store', 'and the local store it touches'],
    ['no value, no secret file', 'never a token, cookie or credential value, and never a secret file'],
  ]);
});

// ---------------------------------------------------------------------------
// AC-11: the generator command
// ---------------------------------------------------------------------------

test('AC-11: /relay-auth-scripts derives mechanism minted from the model, ahead of the four existing rules', () => {
  const phaseA = collapse(section(read(SCRIPTS), '## Phase A', '## Final output surface'));
  const minted = phaseA.indexOf('`mechanism` is `minted` when `## Authentication Mechanisms` records a `minted` mechanism for the role');
  assert.notEqual(minted, -1, 'the mechanism rule must name the minted derivation');
  for (const rest of ['`headed` when the role is named under `## Non-Automatable Items`', '`static-token` when', '`api` when', 'otherwise `form`']) {
    const at = phaseA.indexOf(rest);
    assert.ok(at > minted, `the existing rule "${rest}" must be kept after the minted rule`);
  }
});

test('AC-11: the generated mint block carries status "proposed" (never "confirmed"), the model\'s argv or JSON null, and the store; unstated fields are never guessed', () => {
  const text = read(SCRIPTS);
  const block = collapse(section(text, '- For a `minted` role the `mint` block', '- `browserProbe` is filled'));
  assertPins(block, [
    ['shape', 'the `mint` block is `{ "command", "store", "status" }`, filled only from the model\'s evidence'],
    ['status proposed', '`status` is the literal `"proposed"` and is never `"confirmed"`'],
    ['command from model else null', '`command` is the argv array the model\'s `## Authentication Mechanisms` or `## Local User Creation` records for issuing the session, else the JSON value `null`'],
    ['store else TBD', '`store` is the local store the model records (a local host:port or URL), else `TBD - needs validation`'],
    ['optional header', '`header` and `valuePrefix` are written only when the model states where the API expects the token'],
    ['evidence is reported not persisted', 'is reported in the final output surface beside any role whose `command` is `null`, and is never written into the configuration'],
  ]);
  for (const halt of ['FAILED_MINT_UNCONFIRMED', 'FAILED_MINT_COMMAND_MISSING', 'FAILED_NON_LOCAL_TARGET', 'FAILED_MINT_COMMAND', 'FAILED_MINT_OUTPUT']) {
    assert.ok(block.includes(halt), `${halt} must be named beside the mint block`);
  }
});

test('AC-11: no relay command text documents writing a confirmed status (the check itself detects one when present)', () => {
  const text = read(SCRIPTS);
  assert.equal(documentsWritingConfirmed(text), false, '/relay-auth-scripts must not document writing confirmed');
  // negative control: the detector fires on a mutated text, so a silent no-op detector is caught.
  assert.equal(documentsWritingConfirmed(`${text}\n{ "status": "confirmed" }\n`), true);
  assert.equal(documentsWritingConfirmed(`${text}\n\`status\` is the literal \`"confirmed"\`\n`), true);
  // the other relay commands of the kit never author the block either
  for (const rel of ['plugins/relay/commands/relay-auth-setup.md', 'plugins/relay/agents/auth-model-writer.md', 'plugins/relay/agents/auth-model-reviewer.md']) {
    assert.equal(documentsWritingConfirmed(read(rel)), false, `${rel} must not document writing confirmed`);
  }
});

test('AC-11: the operator, not the generator, confirms: the output surface says so per minted role, and the constraints forbid writing confirmed and running or composing a mint command', () => {
  const text = read(SCRIPTS);
  const output = collapse(section(text, '## Final output surface', '## Constraints (hard rules)'));
  assertPins(output, [
    ['status reported', 'for each `minted` role, that `mint.status` is `proposed`'],
    ['operator edits tracked file', 'the operator must write or review `mint.command` and set `mint.status` to `confirmed` in the tracked file before the script runs anything'],
    ['evidence beside null command', "and the issuing code's `file:line` evidence when `command` is `null`"],
  ]);
  const constraints = section(text, '## Constraints (hard rules)', '## What you do NOT do');
  const flatC = collapse(constraints);
  assert.ok(
    flatC.includes('**Never write `confirmed`.** The generator writes `mint.status` as `proposed` only; confirming a mint command is the operator\'s edit of a tracked file.'),
    'the constraint must forbid writing confirmed',
  );
  // placed after the credential bullet, and outside the written-files and never-write bullets
  assert.ok(flatC.indexOf('**No credential value enters the conversation.**') < flatC.indexOf('**Never write `confirmed`.**'));
  const written = collapse(section(constraints, '**The only files written**', '- **Never write**'));
  assert.ok(!written.includes('mint') && !written.includes('confirmed'), 'the written-files bullet must not be extended');
  assert.ok(collapse(section(text, '## What you do NOT do', '**Run the application')).includes('**Run, confirm or compose a mint command.**'));
});

// ---------------------------------------------------------------------------
// AC-12: --refresh (prose half)
// ---------------------------------------------------------------------------

test('AC-12: --refresh also adds mint (the proposed block for a role already minted, null for every other role), never changes a set mechanism or value, and leaves sessions and credentials untouched', () => {
  const flat = collapse(read(SCRIPTS));
  assertPins(flat, [
    ['mint is a newly introduced field', '(`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them, and `mint`, written as the proposed block described above for a role whose `mechanism` is already `minted` and as `null` for every other role) on roles that lack them'],
    ['mechanism is an operator edit', '`--refresh` never changes a set `mechanism`, so moving a role to `minted` on an existing kit is an operator edit of that tracked value followed by `--refresh`'],
    ['no key changed', 'no key that already exists, including a `TBD - needs validation` value, is ever changed'],
    ['secrets untouched', 'It never touches a session, a token, `credentials.json` or `credentials.example.json`.'],
    ['regenerates scripts', 'every selected role\'s script is regenerated from the installed template by the same single substitution'],
  ]);
});

// ---------------------------------------------------------------------------
// AC-12: a refreshed kit and a generated proposed block (behavior, real template)
// ---------------------------------------------------------------------------

const FIXTURE_TOKEN = 'FIXTURE-TOKEN-91c3';
const ROLE = 'ops';
const TEMPLATE = readFileSync(join(PLUGIN, 'resources', 'auth-login.template.mjs'), 'utf8').replace(/\r\n/g, '\n');

/** @type {import('node:http').Server} */
let server;
let port = 0;
let baseUrl = '';
/** @type {string[]} */
const temps = [];
let countTouch = '';
/** @type {NodeJS.ProcessEnv} */
let baseEnv = {};

before(async () => {
  server = createServer((req, res) => {
    const ok = req.url === '/api/me' && req.headers.authorization === `Bearer ${FIXTURE_TOKEN}`;
    res.writeHead(ok ? 200 : 401);
    res.end(ok ? 'ok' : 'no');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {any} */ (server.address()).port;
  baseUrl = `http://127.0.0.1:${port}`;
  const d = mkdtempSync(join(tmpdir(), 'relay-kitauth-'));
  temps.push(d);
  const emptyGitConfig = join(d, 'empty.gitconfig');
  writeFileSync(emptyGitConfig, '');
  countTouch = join(d, 'count-touch.mjs');
  writeFileSync(
    countTouch,
    "import { appendFileSync } from 'node:fs';\nconst i = process.argv.indexOf('--count-file');\nif (i >= 0) appendFileSync(process.argv[i + 1], 'run\\n');\n",
  );
  baseEnv = { ...process.env, GIT_CONFIG_GLOBAL: emptyGitConfig, GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: dirname(tmpdir()) };
  delete baseEnv.CLAUDE_PLUGIN_ROOT;
  delete baseEnv.FIXTURE_TOKEN_ENV;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

/** @param {Record<string, any>} over */
function role(over) {
  return {
    mechanism: 'static-token',
    loginPath: null,
    form: null,
    api: null,
    probe: { path: '/api/me', method: 'GET' },
    sessionCookie: null,
    maxAgeMinutes: null,
    credentials: { usernameEnv: null, passwordEnv: null },
    userCreation: { command: null },
    ...over,
  };
}

/**
 * A temp git project holding the single-substitution copy of the installed template and a config.
 * @param {Record<string, any>} roleCfg
 */
async function project(roleCfg) {
  const root = mkdtempSync(join(tmpdir(), 'relay-kitauth-proj-'));
  temps.push(root);
  await execFileP('git', ['-C', root, 'init', '-q'], { env: baseEnv });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  const cfgPath = join(root, 'PRPs', 'auth', 'login.config.json');
  writeFileSync(cfgPath, JSON.stringify({ baseUrl, roles: { [ROLE]: roleCfg } }), 'utf8');
  const script = join(root, 'PRPs', 'auth', `login-${ROLE}.mjs`);
  writeFileSync(script, TEMPLATE.split('__RELAY_ROLE__').join(ROLE), 'utf8');
  return { root, script, cfgPath };
}

/**
 * @param {{ root: string, script: string }} p
 * @param {Record<string, string>} [env]
 * @returns {Promise<{ status: number | null, all: string }>}
 */
function run(p, env = {}) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [p.script, '--plugin-root', PLUGIN, '--root', p.root], {
      cwd: p.root,
      env: { ...baseEnv, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let all = '';
    child.stdout.on('data', (d) => (all += d));
    child.stderr.on('data', (d) => (all += d));
    const timer = setTimeout(() => child.kill(), 120000);
    child.on('error', fail);
    child.on('close', (status) => {
      clearTimeout(timer);
      done({ status, all });
    });
  });
}

/** @param {string} p */
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

const STATIC_TOKEN = { tokenEnv: 'FIXTURE_TOKEN_ENV', header: 'Authorization', valuePrefix: 'Bearer ', browser: null };

test('AC-12: a script regenerated from the installed template runs a non-minted role against its unchanged auth-login/1-era configuration (no mint key) exactly as before, leaving the configuration byte-identical and leaking no token', async () => {
  const p = await project(role({ staticToken: STATIC_TOKEN, browserProbe: null, authenticatesAnonymous: null }));
  const before = sha(p.cfgPath);
  const r = await run(p, { FIXTURE_TOKEN_ENV: FIXTURE_TOKEN });
  assert.equal(r.status, 0, r.all.slice(0, 400));
  assert.match(r.all, /SESSION_CREATED/);
  assert.equal(sha(p.cfgPath), before, 'login.config.json is not modified by a run');
  assert.ok(!r.all.includes(FIXTURE_TOKEN), 'the token value must not reach the output');
});

test('AC-12: the mint: null that --refresh adds to a non-minted role is ignored by the template (the role runs unchanged)', async () => {
  const p = await project(role({ staticToken: STATIC_TOKEN, browserProbe: null, authenticatesAnonymous: null, mint: null }));
  const r = await run(p, { FIXTURE_TOKEN_ENV: FIXTURE_TOKEN });
  assert.equal(r.status, 0, r.all.slice(0, 400));
  assert.match(r.all, /SESSION_CREATED/);
  assert.ok(!/FAILED_/.test(r.all), r.all.slice(0, 400));
});

test('AC-11 / AC-12: a generated proposed mint block validates and halts FAILED_MINT_UNCONFIRMED naming the role and the config file, with the command not run and no session saved', async () => {
  const countFile = join(mkdtempSync(join(tmpdir(), 'relay-kitauth-count-')), 'count.txt');
  temps.push(dirname(countFile));
  const p = await project(
    role({
      mechanism: 'minted',
      maxAgeMinutes: 60,
      browserProbe: null,
      authenticatesAnonymous: null,
      mint: { command: [process.execPath, countTouch, '--count-file', countFile], store: `127.0.0.1:${port}`, status: 'proposed' },
    }),
  );
  const r = await run(p);
  assert.equal(r.status, 1, r.all.slice(0, 400));
  assert.match(r.all, /FAILED_MINT_UNCONFIRMED/);
  assert.ok(r.all.includes(ROLE) && r.all.includes('PRPs/auth/login.config.json'), 'the halt names the role and the config file');
  assert.ok(!/FAILED_LOGIN_CONFIG_INCOMPLETE/.test(r.all), 'the generated shape passes field validation');
  assert.equal(existsSync(countFile), false, 'the mint command did not run');
  assert.equal(existsSync(join(p.root, 'PRPs', 'auth', '.sessions', `${ROLE}.json`)), false, 'no session was saved');
});

test('AC-11: the shape written when the model declares no command (proposed, command null) passes field validation and halts at a mint gate, not at config validation', async () => {
  const p = await project(
    role({
      mechanism: 'minted',
      maxAgeMinutes: 60,
      browserProbe: null,
      authenticatesAnonymous: null,
      mint: { command: null, store: `127.0.0.1:${port}`, status: 'proposed' },
    }),
  );
  const r = await run(p);
  assert.equal(r.status, 1, r.all.slice(0, 400));
  assert.match(r.all, /FAILED_MINT_/);
  assert.ok(!/FAILED_LOGIN_CONFIG_INCOMPLETE/.test(r.all), r.all.slice(0, 400));
});

// ---------------------------------------------------------------------------
// AC-11 / AC-12: the documentation surfaces
// ---------------------------------------------------------------------------

test('AC-11 / AC-12: docs/api-reference.md describes the minted authoring rule and the extended --refresh', () => {
  const flat = collapse(read(API_REF));
  assertPins(flat, [
    ['refresh adds mint', 'and `mint`, written as the proposed block for a `minted` role and as `null` otherwise) are added to roles lacking them'],
    ['derivation and status', 'The generator derives `mechanism: minted` from a model that records one and writes `mint.status` as `proposed` only, never `confirmed`.'],
  ]);
});

test('AC-11 / AC-12: the command and agent reference pages describe the minted authoring behavior', () => {
  const commands = collapse(read(COMMANDS_HTML));
  assertPins(commands, [
    ['proposed mint block', 'makes the generator write that role\'s <code>mint</code> block with <code>status</code> <code>proposed</code>, the declared command or <code>null</code>, and the store'],
    ['never confirmed', 'the generator never writes <code>confirmed</code>'],
    ['refresh adds mint', '<code>--refresh</code> adds <code>mint</code> to roles lacking it without changing a set value'],
  ]);
  const agents = collapse(read(AGENTS_HTML));
  assertPins(agents, [
    ['writer entry', 'as the <code>minted</code> mechanism'],
    ['reviewer entry', 'A <code>minted</code> mechanism with the issuing code'],
  ]);
});

test('AC-11 / AC-12: the changelog records the kit authoring under Unreleased, not under a released version', () => {
  const html = read(CHANGELOG_HTML);
  const a = html.indexOf('id="unreleased"');
  assert.notEqual(a, -1, 'an Unreleased block must exist');
  const next = html.indexOf('<h2 id=', a + 1);
  assert.notEqual(next, -1, 'a released section must follow Unreleased');
  const marker = 'Kit authoring for the <code>minted</code> mechanism';
  assert.ok(collapse(html.slice(a, next)).includes(marker), 'the entry must sit inside the Unreleased block');
  assert.ok(!collapse(html.slice(next)).includes(marker), 'the entry must not also appear in a released section');
});
