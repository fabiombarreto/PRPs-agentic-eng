// @ts-check
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-15 A read_message step reads the newest mail received after the case started from a declared local Mailpit, extracts a value into a redacted {{var}} that later steps use, and a non-local source is refused
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-16 A read_message step reads the newest entry appended to a declared sms file after the case started, and a path outside the target root is refused
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-21 An extracted code appears in no file the run writes, no terminal stream and no results.json; message-derived files live only under evidence/ and a field filled with the code is masked in the captures
// PRPs/prds/qa-runner-ai-executable-steps.prd.md AC-22 (for read_message) The command doc, the knowledge base and the site state the read_message step and the channel_sources declaration (a marked example that validates against the script, the honesty rule)
/**
 * Phase 6 (local channel sources) of qa-runner-ai-executable-steps.
 *
 * Source PRD:  PRPs/prds/qa-runner-ai-executable-steps.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-6-local-channel-sources.plan.md
 *
 * Layers, all over the REAL runner module (never edited):
 *   1. The read_message step grammar and the bound-name rule of validateSteps (AC-15, AC-16).
 *   2. The pure helpers: classifyChannelSource (declared, undeclared, malformed, escaping and look-alike sources),
 *      newestMailAfter (the case-start boundary), smsEntryAfter, extractMessageValue (the regex, text and value bounds).
 *   3. The real runner as an ASYNC child process, in a real Chromium, against a LOOPBACK page and a LOOPBACK fake
 *      Mailpit (never a real mail service): an undeclared channel is declined, a non-local or malformed source blocks
 *      the case before any request, a mail code is read / filled / verified, a late message is polled for, a stale
 *      message fails, the sms file works the same with its baseline, a redirect is not followed, an unreachable
 *      source blocks, an sms link that leaves the root is refused, and every file of every run plus both terminal
 *      streams are scanned for the code (AC-21).
 *   4. The documents: the marked example, the declaration example, the honesty rule, the API reference row, the
 *      knowledge base and the site (AC-22).
 *
 * Every git call the runner makes carries a hermetic environment; the sandbox is removed afterwards and the single
 * server is closed.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, readdirSync, statSync, existsSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';

import * as R from '../../../plugins/relay/scripts/qa-run.mjs';
import { checkTarget } from '../../../plugins/relay/scripts/auth-local-guard.mjs';
import { validateResults } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const FEATURE = 'chan';
const RUN_REL = `PRPs/reports/${FEATURE}/qa-run/20261021T000000000Z`;
const SLOW = { timeout: 280000 };

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v3p6-chan-'));

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

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} t */
const flat = (t) => t.replace(/\s+/g, ' ').trim();

const ROOT = join(SANDBOX, 'classify-root');
const RM = { action: 'read_message', channel: 'mail', to: '{{email}}', extract: { regex: 'code is (\\d{6})', as: 'code' } };
const GOTO = { action: 'goto', path: '/' };
const SEE = { action: 'expect_visible', text: 'Done' };
const FILL_CODE = { action: 'fill', role: 'textbox', name: 'Code', value: '{{code}}' };

// ---------------------------------------------------------------------------
// 1. The read_message grammar and the bound-name rule (AC-15, AC-16)
// ---------------------------------------------------------------------------

test('AC-15 the channel vocabulary and its limits are exported and the outcome vocabulary is still the four values', () => {
  assert.deepEqual([...R.READ_MESSAGE_CHANNELS], ['mail', 'sms']);
  assert.deepEqual({ ...R.CHANNEL_SOURCE_KINDS }, { mail: 'mailpit', sms: 'file' });
  assert.equal(R.READ_MESSAGE_WAIT_MS, 10000);
  assert.equal(R.READ_MESSAGE_POLL_MS, 500);
  assert.equal(R.MESSAGE_REGEX_MAX, 200);
  assert.equal(R.MESSAGE_TEXT_MAX, 65536);
  assert.equal(R.MESSAGE_VALUE_MAX, 200);
  assert.deepEqual([...R.OUTCOMES], ['pass', 'fail', 'blocked', 'needs-human']);
  assert.equal(R.POSITIVE_ASSERTION_ACTIONS.includes('read_message'), false, 'a read asserts nothing');
});

test('AC-15 AC-16 a browser read_message step takes exactly channel, to and extract{regex, as}', () => {
  const ok = (/** @type {string} */ driver, /** @type {any} */ s) => assert.equal(R.validateStep(driver, s), null, JSON.stringify(s));
  ok('browser', RM);
  ok('browser', { ...RM, channel: 'sms', to: '+5511999990000' });
  ok('browser', { ...RM, to: 'user@example.test' });
  ok('browser', { ...RM, to: 'abc' });
  ok('browser', { ...RM, to: 'a'.repeat(254) });
  ok('browser', { ...RM, extract: { regex: `(${'a'.repeat(R.MESSAGE_REGEX_MAX - 2)})`, as: 'code' } });
});

test('AC-15 AC-16 every malformed read_message step is PLAN_ENTRY_INVALID, the step is refused for http, and no reason echoes a value', () => {
  const no = (/** @type {string} */ driver, /** @type {any} */ s) => assert.equal(R.validateStep(driver, s)?.code, 'PLAN_ENTRY_INVALID', JSON.stringify(s));
  no('http', RM);
  for (const channel of ['fax', 'MAIL', '', undefined, 5, null, ['mail']]) no('browser', { ...RM, channel });
  for (const to of ['two words', 'a@b"c', "a@b'c", 'a<b>c', 'a\\b', 'ab', 'a'.repeat(255), '', undefined, 5, null]) no('browser', { ...RM, to });
  no('browser', { ...RM, extra: 1 });
  no('browser', { ...RM, selector: '#x' });
  no('browser', { ...RM, within: { role: 'region', name: 'x' } });
  no('browser', { ...RM, extract: 'code' });
  no('browser', { ...RM, extract: null });
  no('browser', { ...RM, extract: { regex: 'code is (\\d{6})' } });
  no('browser', { ...RM, extract: { as: 'code' } });
  no('browser', { ...RM, extract: { regex: 'code is (\\d{6})', as: '9x' } });
  no('browser', { ...RM, extract: { regex: 'code is (\\d{6})', as: '' } });
  no('browser', { ...RM, extract: { regex: 'code is (\\d{6})', as: 'code', extra: 1 } });
  no('browser', { ...RM, extract: { regex: 'code is \\d{6}', as: 'code' } });
  no('browser', { ...RM, extract: { regex: '(?:a)', as: 'code' } });
  no('browser', { ...RM, extract: { regex: '(', as: 'code' } });
  no('browser', { ...RM, extract: { regex: '', as: 'code' } });
  no('browser', { ...RM, extract: { regex: 7, as: 'code' } });
  no('browser', { ...RM, extract: { regex: `(${'a'.repeat(R.MESSAGE_REGEX_MAX - 1)})`, as: 'code' } });
  const hostile = R.validateStep('browser', { ...RM, to: 'secret-recipient user@example.test', extract: { regex: 'secret-pattern(', as: 'code' } });
  assert.ok(!JSON.stringify(hostile).includes('secret'), 'a reason must not echo the recipient or the regex');
});

test('AC-15 a name a read_message step binds is usable only in the steps after it, and a read needs an earlier interaction', () => {
  const V = (/** @type {any[]} */ steps, /** @type {string[]} */ names = ['email']) => R.validateSteps('browser', steps, names);
  assert.equal(V([GOTO, RM, FILL_CODE, SEE]), null);
  assert.equal(V([GOTO, FILL_CODE, SEE])?.code, 'PLAN_ENTRY_INVALID', 'a name no step has bound');
  assert.equal(V([GOTO, FILL_CODE, RM, SEE])?.code, 'PLAN_ENTRY_INVALID', 'a name used before the step that binds it');
  assert.equal(V([RM, GOTO, SEE])?.code, 'PLAN_ENTRY_INVALID', 'a read with no earlier goto, click or fill');
  assert.equal(V([{ action: 'expect_visible', text: 'x' }, RM, SEE])?.code, 'PLAN_ENTRY_INVALID', 'an expectation is not an interaction');
  assert.equal(V([{ action: 'click', role: 'button', name: 'Send' }, RM, SEE]), null, 'a click is an interaction');
  assert.equal(V([{ action: 'fill', role: 'textbox', name: 'Email', value: 'x@y.test' }, RM, SEE]), null, 'a fill is an interaction');
  assert.equal(V([GOTO, RM, SEE], [])?.code, 'PLAN_ENTRY_INVALID', 'the recipient capture is unbound');
  assert.equal(V([GOTO, RM, RM, SEE])?.code, 'PLAN_ENTRY_INVALID', 'a repeated binding');
  assert.equal(V([GOTO, { ...RM, extract: { regex: 'code is (\\d{6})', as: 'email' } }, SEE])?.code, 'PLAN_ENTRY_INVALID', 'a name that repeats a declared capture');
  assert.equal(V([GOTO, RM, { ...RM, extract: { regex: 'other (\\d{4})', as: 'second' } }, SEE]), null, 'two reads that bind different names');
  assert.equal(V([GOTO, RM])?.code, 'NO_EXPECTATION', 'a read is not an expectation');
  // The refusal for an unbound name keeps its sentence.
  assert.match(String(V([GOTO, FILL_CODE, SEE])?.reason), /^step 2: variable code is not bound by a capture declared for this case$/);
});

// ---------------------------------------------------------------------------
// 2. The pure helpers (AC-15, AC-16)
// ---------------------------------------------------------------------------

test('AC-15 AC-16 a channel with no declared source is EXTERNAL_CHANNEL with the catalogue sentence, and an unknown channel is invalid', () => {
  const cls = (/** @type {any} */ src, /** @type {any} */ ch) => R.classifyChannelSource(src, ch, ROOT);
  for (const sources of [undefined, null, {}, 'x', 5, [], { sms: { kind: 'file', path: 'a.txt' } }]) {
    const r = /** @type {any} */ (cls(sources, 'mail'));
    assert.deepEqual([r.ok, r.code], [false, 'EXTERNAL_CHANNEL'], JSON.stringify(sources));
    assert.equal(r.reason, R.REASON_CATALOGUE.EXTERNAL_CHANNEL.reason);
  }
  assert.equal(/** @type {any} */ (cls({}, 'sms')).code, 'EXTERNAL_CHANNEL');
  // An inherited key is not a declaration.
  assert.equal(/** @type {any} */ (cls(Object.create({ mail: { kind: 'mailpit', url: 'http://localhost:8025' } }), 'mail')).code, 'EXTERNAL_CHANNEL');
  for (const channel of ['fax', 'MAIL', '', undefined, null, 5, ['mail']]) assert.equal(/** @type {any} */ (cls({ mail: { kind: 'mailpit', url: 'http://localhost:8025' } }, channel)).code, 'CHANNEL_SOURCE_INVALID', JSON.stringify(channel));
});

test('AC-15 a declared mail source yields its normalized origin, and every malformed declaration is CHANNEL_SOURCE_INVALID without echoing the declared value', () => {
  const cls = (/** @type {any} */ entry) => /** @type {any} */ (R.classifyChannelSource({ mail: entry }, 'mail', ROOT));
  const good = cls({ kind: 'mailpit', url: 'http://localhost:8025/' });
  assert.deepEqual([good.ok, good.channel, good.kind, good.url], [true, 'mail', 'mailpit', 'http://localhost:8025']);
  assert.equal(cls({ kind: 'mailpit', url: 'https://mail.test:8025/box/' }).url, 'https://mail.test:8025/box');
  assert.equal(cls({ kind: 'mailpit', url: 'http://localhost:8025/mail//?x=1#f' }).url, 'http://localhost:8025/mail');
  assert.equal(cls({ kind: 'mailpit', url: 'http://127.0.0.1:8025' }).url, 'http://127.0.0.1:8025');
  const bad = [
    { kind: 'file', url: 'http://localhost:8025' }, { kind: 'mailpit' }, { kind: 'mailpit', url: 5 }, { kind: 'mailpit', url: '' },
    { kind: 'mailpit', url: 'ftp://localhost' }, { kind: 'mailpit', url: 'not a url' }, { kind: 'mailpit', url: 'file:///etc/hosts' },
    { kind: 'mailpit', url: 'http://user:pw-secret@localhost:8025' }, { kind: 'mailpit', url: 'http://user@localhost:8025' },
    { kind: 'mailpit', url: 'http://localhost:8025', extra: 1 }, { kind: 'mailpit', url: 'http://localhost:8025', path: 'a.txt' },
    { url: 'http://localhost:8025' }, 'x', 5, null, [], true,
  ];
  for (const entry of bad) {
    const r = cls(entry);
    assert.deepEqual([r.ok, r.code], [false, 'CHANNEL_SOURCE_INVALID'], JSON.stringify(entry));
    assert.ok(!JSON.stringify(r).includes('pw-secret') && !JSON.stringify(r).includes('localhost'), `a reason echoed the declared url: ${r.reason}`);
  }
});

test('AC-16 a declared sms source must be a relative path that stays inside the target root, however it is spelled', () => {
  const cls = (/** @type {any} */ entry) => /** @type {any} */ (R.classifyChannelSource({ sms: entry }, 'sms', ROOT));
  const good = cls({ kind: 'file', path: 'PRPs/auth/.sms/inbox.txt' });
  assert.deepEqual([good.ok, good.channel, good.kind, good.abs], [true, 'sms', 'file', resolve(ROOT, 'PRPs/auth/.sms/inbox.txt')]);
  assert.equal(cls({ kind: 'file', path: 'inbox.txt' }).abs, resolve(ROOT, 'inbox.txt'), 'a file directly under the root');
  assert.equal(cls({ kind: 'file', path: 'PRPs/../PRPs/auth/inbox.txt' }).abs, resolve(ROOT, 'PRPs/auth/inbox.txt'), 'a spelling that normalizes to a path inside the root');
  const escapes = ['../outside.txt', 'a/../../outside.txt', 'PRPs/auth/../../../outside.txt', '..', 'a/b/../../..', resolve(ROOT, 'x.txt'), resolve(ROOT, '..', 'x.txt'), '', '.', 'a/..', 5, null, undefined, ['a.txt']];
  if (process.platform === 'win32') escapes.push('..\\outside.txt', 'a\\..\\..\\outside.txt', 'C:\\Windows\\win.ini');
  for (const path of escapes) {
    const r = cls({ kind: 'file', path });
    assert.deepEqual([r.ok, r.code], [false, 'CHANNEL_SOURCE_INVALID'], JSON.stringify(path));
    assert.ok(!String(r.reason).includes('outside.txt') && !String(r.reason).includes('win.ini'), 'a reason echoed the declared path');
  }
  for (const entry of [{ kind: 'mailpit', url: 'http://localhost:8025' }, { kind: 'file', path: 'a.txt', extra: 1 }, { kind: 'file', path: 'a.txt', url: 'http://localhost:8025' }, { path: 'a.txt' }, 'x', null]) {
    assert.equal(cls(entry).code, 'CHANNEL_SOURCE_INVALID', JSON.stringify(entry));
  }
});

test('AC-15 a mail origin that is not local, including a look-alike host, is refused by the same guard the runner calls', async () => {
  const classify = (/** @type {string} */ url) => /** @type {any} */ (R.classifyChannelSource({ mail: { kind: 'mailpit', url } }, 'mail', ROOT));
  for (const url of ['http://localhost:8025', 'http://127.0.0.1:8025', 'https://127.0.0.1:8025/box', 'http://[::1]:8025']) {
    const c = classify(url);
    assert.equal(c.ok, true, url);
    assert.equal((await checkTarget(c.url, { root: SANDBOX })).ok, true, `a local origin must pass the guard: ${url}`);
  }
  const lookAlikes = [
    'http://localhost.evil.test:8025', 'http://127.0.0.1.evil.test:8025', 'http://evil-localhost:8025',
    'http://localhost.:8025', 'http://127.0.0.2:8025', 'http://[::ffff:127.0.0.1]:8025', 'http://0.0.0.0:8025', 'https://mail.example.com:8025',
    'http://10.0.0.5:8025', 'http://192.168.1.10:8025',
  ];
  for (const url of lookAlikes) {
    const c = classify(url);
    assert.equal(c.ok, true, `${url} is a well-formed declaration; the guard decides locality`);
    assert.equal((await checkTarget(c.url, { root: SANDBOX })).ok, false, `a non-local origin must be refused by the guard: ${url}`);
  }
  // Credentials never reach the guard: the declaration itself is invalid.
  for (const url of ['http://localhost@evil.test:8025', 'http://localhost:8025@evil.test']) assert.equal(classify(url).code, 'CHANNEL_SOURCE_INVALID', url);
});

test('AC-15 the newest message is chosen among those received at or after the case start, and a hostile listing never throws', () => {
  const t = (/** @type {string} */ iso) => Date.parse(iso);
  const listing = { messages: [
    { ID: 'a', Created: '2026-10-21T10:00:00.000Z' }, { ID: 'b', Created: '2026-10-21T10:00:05.000Z' }, { ID: 'c', Created: '2026-10-21T09:59:00.000Z' },
    { ID: 7, Created: 'x' }, null, { ID: 'bad id', Created: '2026-10-21T10:00:09.000Z' }, { ID: 'a/b', Created: '2026-10-21T10:00:09.000Z' },
    { ID: 'd', Created: 'not a date' }, { ID: 'e', Created: 1789984809000 }, { ID: 'x'.repeat(65), Created: '2026-10-21T10:00:09.000Z' }, { Created: '2026-10-21T10:00:09.000Z' },
  ] };
  assert.deepEqual(R.newestMailAfter(listing, t('2026-10-21T10:00:01.000Z')), { id: 'b', createdMs: t('2026-10-21T10:00:05.000Z') }, 'the newest wins, not the first listed');
  assert.deepEqual(R.newestMailAfter(listing, t('2026-10-21T09:00:00.000Z')), { id: 'b', createdMs: t('2026-10-21T10:00:05.000Z') });
  assert.deepEqual(R.newestMailAfter(listing, t('2026-10-21T10:00:05.000Z')), { id: 'b', createdMs: t('2026-10-21T10:00:05.000Z') }, 'a message created exactly at the case start counts');
  assert.equal(R.newestMailAfter(listing, t('2026-10-21T10:00:05.001Z')), null, 'one millisecond before the start is stale');
  assert.equal(R.newestMailAfter(listing, t('2026-10-21T10:00:06.000Z')), null);
  assert.deepEqual(R.newestMailAfter({ messages: [{ ID: 'x'.repeat(64), Created: '2026-10-21T10:00:00.000Z' }] }, 0), { id: 'x'.repeat(64), createdMs: t('2026-10-21T10:00:00.000Z') }, 'a 64 character id is accepted');
  for (const hostile of [null, undefined, 'x', 5, [], {}, { messages: 'x' }, { messages: {} }, { messages: [] }, { messages: [null, 5, 'x', []] }]) {
    assert.doesNotThrow(() => R.newestMailAfter(hostile, 0), JSON.stringify(hostile));
    assert.equal(R.newestMailAfter(hostile, 0), null, JSON.stringify(hostile));
  }
});

test('AC-16 the sms entry is the last non-blank line that holds the recipient, and hostile input never throws', () => {
  assert.equal(R.smsEntryAfter('old 111\r\nto +55 code 222\nto +55 code 333\n\n', '+55'), 'to +55 code 333');
  assert.equal(R.smsEntryAfter('to +55 code 222\nto +66 code 333\n', '+55'), 'to +55 code 222', 'a later line for another recipient is not chosen');
  assert.equal(R.smsEntryAfter('to +55 code 222\n   \n\t\n', '+55'), 'to +55 code 222', 'blank lines are skipped');
  assert.equal(R.smsEntryAfter('a\nb', 'zz'), null);
  assert.equal(R.smsEntryAfter('', '+55'), null);
  assert.equal(R.smsEntryAfter('anything', ''), null, 'an empty recipient matches nothing');
  for (const [text, to] of [[5, 'x'], ['a', 5], [null, 'x'], ['a', null], [undefined, undefined], [{}, []]]) {
    assert.doesNotThrow(() => R.smsEntryAfter(text, to));
    assert.equal(R.smsEntryAfter(text, to), null);
  }
});

test('AC-15 AC-16 the extracted value is the first group, within the text and value bounds, and a reason never echoes the text, the regex or the group', () => {
  assert.deepEqual(R.extractMessageValue('Your code is 123456.', 'code is (\\d{6})'), { ok: true, value: '123456' });
  assert.deepEqual(R.extractMessageValue('a 111 b 222', '(\\d+)'), { ok: true, value: '111' }, 'the first match');
  assert.deepEqual(R.extractMessageValue('x-9-y', '(\\d)-(\\w)'), { ok: true, value: '9' }, 'the first group of several');
  // The value bound is inclusive at MESSAGE_VALUE_MAX.
  assert.equal(R.extractMessageValue('x'.repeat(R.MESSAGE_VALUE_MAX), '(x+)').ok, true);
  assert.equal(R.extractMessageValue('x'.repeat(R.MESSAGE_VALUE_MAX + 1), '(x+)').ok, false);
  // The text bound: only the first MESSAGE_TEXT_MAX characters are searched.
  const room = 'x'.repeat(R.MESSAGE_TEXT_MAX - 6);
  assert.deepEqual(R.extractMessageValue(`${room}123456`, '(\\d{6})'), { ok: true, value: '123456' }, 'a value ending exactly at the bound is found');
  assert.equal(R.extractMessageValue(`${room}x123456`, '(\\d{6})').ok, false, 'a value that straddles the bound is cut');
  assert.equal(R.extractMessageValue(`${'x'.repeat(R.MESSAGE_TEXT_MAX)}123456`, '(\\d{6})').ok, false, 'a value after the bound is never seen');
  const canary = 'secret-canary-77';
  /** @type {[any, any][]} */
  const failing = [['no digits here', 'code is (\\d{6})'], ['code is ', 'code is ()'], [`${canary}999`, '(zzz)'], ['abc', '(q)?b'],[`${canary}`, '('], [5, '(a)'], ['abc', 6], [null, null], [undefined, '(a)'], [`${canary}`, `(${canary}`]];
  for (const [text, rx] of failing) {
    const r = /** @type {any} */ (R.extractMessageValue(text, rx));
    assert.equal(r.ok, false, JSON.stringify([text, rx]));
    assert.ok(!JSON.stringify(r).includes(canary) && !JSON.stringify(r).includes('999'), 'a reason echoed the text or the regex');
  }
  assert.equal(R.extractMessageValue('b', '(a)?b').ok, false, 'an unmatched optional group has no value');
});

// ---------------------------------------------------------------------------
// 3. The real runner against a loopback page and a loopback fake Mailpit (AC-15, AC-16, AC-21)
// ---------------------------------------------------------------------------

const CODE = '483920';
const DECOY = '777777';
const CODE_A = '615273';
const CODE_B = '902846';
const LATE_CODE = '257913';
const SHORT_CODE = '731';
const PHONE = '+5511999990000';
const PHONE_SHORT = '+5511888880000';
const USER = 'user@example.test';
const ALL_CODES = [CODE, CODE_A, CODE_B, LATE_CODE];

/** @param {{ echo: boolean, send: string }} o */
const pageOf = ({ echo, send }) => `<!doctype html><html><body>
<button onclick="send()">Send code</button>
<label>Code <input aria-label="Code" id="c"></label>
<button onclick="verify()">Verify</button>
<p id="out"></p><p id="echo"></p>
<script>
function send() { fetch(${JSON.stringify(send)}, { method: "POST" }); }
async function verify() {
  const v = document.getElementById("c").value;
  const t = await (await fetch("/check?v=" + encodeURIComponent(v))).text();
  document.getElementById("out").textContent = t === "ok" ? "Verified" : "Wrong";
  ${echo ? 'document.getElementById("echo").textContent = t === "ok" ? "Received " + v : "";' : ''}
}
</script></body></html>`;

const state = {
  /** @type {any[]} */ mails: [],
  apiHits: 0,
  redirSearches: 0,
  redirectedHits: 0,
  /** @type {string | null} */ smsFile: null,
  sends: 0,
};
const resetState = () => {
  state.mails = [];
  state.apiHits = 0;
  state.redirSearches = 0;
  state.redirectedHits = 0;
  state.smsFile = null;
  state.sends = 0;
};

/** @type {import('node:http').Server} */ let server;
let port = 0;

before(async () => {
  server = createServer((req, res) => {
    const u = new URL(String(req.url), 'http://x');
    const json = (/** @type {number} */ code, /** @type {any} */ body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const mail = (/** @type {string} */ id, /** @type {number} */ at, /** @type {string} */ to, /** @type {string} */ code) => ({ ID: id, Created: new Date(at).toISOString(), To: [{ Address: to }], Text: `Your code is ${code}` });
    if (u.pathname.startsWith('/redir/')) {
      state.redirSearches++;
      res.writeHead(302, { location: '/redirected-target' });
      return res.end();
    }
    if (u.pathname === '/redirected-target') {
      state.redirectedHits++;
      return json(200, { messages: [] });
    }
    if (u.pathname === '/api/v1/search') {
      state.apiHits++;
      const q = u.searchParams.get('query') ?? '';
      const messages = state.mails.filter((m) => q === `to:${m.To[0].Address}`).map((m) => ({ ID: m.ID, Created: m.Created, To: m.To, Snippet: '' }));
      return json(200, { messages, total: state.mails.length, messages_count: messages.length });
    }
    if (u.pathname.startsWith('/api/v1/message/')) {
      state.apiHits++;
      const found = state.mails.find((m) => m.ID === decodeURIComponent(u.pathname.split('/').pop() ?? ''));
      return json(found ? 200 : 404, found ?? {});
    }
    if (u.pathname === '/send') {
      const now = Date.now();
      const k = state.sends++;
      // The decoy is listed FIRST and is two milliseconds older: only "the newest by time" reads the right one.
      state.mails.push(mail(`d${k}`, now - 2, USER, DECOY), mail(`r${k}`, now, USER, CODE), mail(`a${k}`, now, 'ma@example.test', CODE_A), mail(`b${k}`, now, 'mb@example.test', CODE_B));
      if (state.smsFile !== null) {
        appendFileSync(state.smsFile, `to:${PHONE} code is ${DECOY}\nto:${PHONE} code is ${CODE}\nto:${PHONE_SHORT} code is ${SHORT_CODE}\n`);
      }
      res.writeHead(204);
      return res.end();
    }
    if (u.pathname === '/send-late') {
      const k = state.sends++;
      setTimeout(() => state.mails.push(mail(`l${k}`, Date.now(), 'late@example.test', LATE_CODE)), 1500);
      res.writeHead(204);
      return res.end();
    }
    if (u.pathname === '/check') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end(ALL_CODES.includes(u.searchParams.get('v') ?? '') ? 'ok' : 'no');
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(u.pathname === '/plain' ? pageOf({ echo: false, send: '/send' }) : u.pathname === '/late' ? pageOf({ echo: false, send: '/send-late' }) : pageOf({ echo: true, send: '/send' }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', () => r(null)));
  port = /** @type {import('node:net').AddressInfo} */ (server.address()).port;
});

after(async () => {
  /** @type {any} */ (server).closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/**
 * @param {string} root
 * @returns {Promise<{ code: number | null, stdout: string, stderr: string }>}
 */
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], { cwd: root, env: { ...process.env, ...GIT_ENV }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    // Below the test timeout, so a hang ends the child before the test is abandoned.
    const timer = setTimeout(() => child.kill(), 260000);
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

const MANUAL = ['1. Click Send code.', '2. Type the Code you received.', '3. Click Verify and see Verified.'];
const SEND = { action: 'click', role: 'button', name: 'Send code' };
const VERIFY = { action: 'click', role: 'button', name: 'Verify' };
const VERIFIED = { action: 'expect_visible', text: 'Verified' };
const READ = (/** @type {string} */ channel, /** @type {string} */ to, regex = 'code is (\\d{6})') => ({ action: 'read_message', channel, to, extract: { regex, as: 'code' } });
const FULL = (/** @type {string} */ channel, /** @type {string} */ to, path = '/') => [{ action: 'goto', path }, SEND, READ(channel, to), FILL_CODE, VERIFY, VERIFIED];
const SHORT = (/** @type {string} */ channel, /** @type {string} */ to) => [{ action: 'goto', path: '/' }, READ(channel, to), VERIFIED];

/**
 * Runs the real runner on a fresh sandbox root holding the given seed and plan.
 * @param {string} name
 * @param {{ seed: any, defs: { title: string, manual?: string[], steps: any[] }[], pre?: (root: string) => void }} o
 * @returns {Promise<{ doc: any, raw: string, run: { code: number | null, stdout: string, stderr: string }, runDir: string, root: string }>}
 */
async function scenario(name, { seed, defs, pre }) {
  resetState();
  const root = mkdtempSync(join(SANDBOX, `${name}-`));
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  mkdirSync(join(root, 'PRPs', 'reports', FEATURE), { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl: `http://127.0.0.1:${port}`, roles: {} }));
  if (pre) pre(root);
  writeFileSync(join(root, 'PRPs', 'auth', 'qa-seed.json'), JSON.stringify(seed));
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', '**Required state:** None', '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...(d.manual ?? MANUAL), ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(join(runDir, 'plan.json'), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: 'none', steps: d.steps })) }));
  const run = await runRunner(root);
  const resultsPath = join(runDir, 'results.json');
  assert.ok(existsSync(resultsPath), `${name}: no results.json: ${run.stdout}${run.stderr}`);
  const raw = readFileSync(resultsPath, 'utf8');
  return { doc: JSON.parse(raw), raw, run, runDir, root };
}

const outcomes = (/** @type {any} */ doc) => doc.cases.map((/** @type {any} */ c) => [c.outcome, c.reason_code]);
const summary = (/** @type {any} */ doc) => JSON.stringify(doc.cases.map((/** @type {any} */ c) => [c.outcome, c.reason_code, c.reason]));

/** No run file, no results.json and no terminal stream holds any of the codes (AC-21). */
function assertNoSecret(/** @type {{ run: any, runDir: string, raw: string }} */ ctx, codes = ALL_CODES) {
  const files = walk(ctx.runDir);
  assert.ok(files.length > 0);
  for (const code of codes) {
    for (const f of files) assert.ok(!readFileSync(f).toString('latin1').includes(code), `a code is in ${f}`);
    assert.ok(!ctx.raw.includes(code), 'results.json carries a code');
    assert.ok(!ctx.run.stdout.includes(code) && !ctx.run.stderr.includes(code), 'a code reached the terminal');
  }
}

test('AC-15 AC-16 a channel with no declared source is declined needs-human EXTERNAL_CHANNEL before any request', SLOW, async () => {
  const ctx = await scenario('undeclared', {
    seed: { states: {} },
    defs: [{ title: 'Mail with no source', steps: FULL('mail', USER) }, { title: 'Sms with no source', steps: FULL('sms', PHONE) }],
  });
  assert.deepEqual(outcomes(ctx.doc), [['needs-human', 'EXTERNAL_CHANNEL'], ['needs-human', 'EXTERNAL_CHANNEL']], summary(ctx.doc));
  assert.deepEqual(ctx.doc.counts, { pass: 0, fail: 0, blocked: 0, 'needs-human': 2 });
  for (const c of ctx.doc.cases) assert.equal(c.reason, `step 3: ${R.REASON_CATALOGUE.EXTERNAL_CHANNEL.reason}`);
  assert.equal(state.apiHits, 0, 'nothing may be requested from a mail endpoint');
  assert.deepEqual(validateResults(ctx.doc), []);
});

test('AC-15 AC-16 a non-local mail origin blocks FAILED_NON_LOCAL_TARGET with nothing requested, and a path outside the root blocks CHANNEL_SOURCE_INVALID', SLOW, async () => {
  // `localhost.` is a look-alike of a local host that resolves to the loopback fake: had the runner asked it, the fake would count the hit.
  const ctx = await scenario('refused', {
    seed: { states: {}, channel_sources: { mail: { kind: 'mailpit', url: `http://localhost.:${port}` }, sms: { kind: 'file', path: '../outside.txt' } } },
    defs: [{ title: 'Mail from a look-alike origin', steps: FULL('mail', USER) }, { title: 'Sms from outside the root', steps: FULL('sms', PHONE) }],
  });
  assert.deepEqual(outcomes(ctx.doc), [['blocked', 'FAILED_NON_LOCAL_TARGET'], ['blocked', 'CHANNEL_SOURCE_INVALID']], summary(ctx.doc));
  assert.deepEqual(ctx.doc.counts, { pass: 0, fail: 0, blocked: 2, 'needs-human': 0 });
  assert.match(ctx.doc.cases[0].reason, /^step 3: .*nothing was requested$/);
  assert.equal(state.apiHits, 0, 'no request may reach a mail endpoint');
  for (const c of ctx.doc.cases) assert.ok(!String(c.reason).includes('localhost.') && !String(c.reason).includes('outside.txt'), `a reason echoed the declared source: ${c.reason}`);
  assert.ok(!existsSync(join(ctx.runDir, 'evidence')) || readdirSync(join(ctx.runDir, 'evidence')).every((n) => !n.includes('message')), 'a refused source left message evidence');
});

test('AC-15 AC-16 a malformed or absolute declaration blocks CHANNEL_SOURCE_INVALID before any request', SLOW, async () => {
  const ctx = await scenario('invalid', {
    seed: { states: {}, channel_sources: { mail: { kind: 'mailpit', url: `http://127.0.0.1:${port}`, extra: 1 }, sms: { kind: 'file', path: resolve(SANDBOX, 'absolute-inbox.txt') } } },
    defs: [{ title: 'Mail with an unknown key', steps: FULL('mail', USER) }, { title: 'Sms with an absolute path', steps: FULL('sms', PHONE) }],
  });
  assert.deepEqual(outcomes(ctx.doc), [['blocked', 'CHANNEL_SOURCE_INVALID'], ['blocked', 'CHANNEL_SOURCE_INVALID']], summary(ctx.doc));
  assert.equal(state.apiHits, 0);
  for (const c of ctx.doc.cases) assert.ok(!String(c.reason).includes('absolute-inbox'), `a reason echoed the declared path: ${c.reason}`);
});

test('AC-15 AC-21 mail: the newest message after the case start is read, its code is filled and verified, a late message is polled for, a stale one fails, and the code is written nowhere', SLOW, async () => {
  const cases = [
    { title: 'Mail code', steps: FULL('mail', USER) },
    { title: 'Late mail', steps: FULL('mail', 'late@example.test', '/late') },
    { title: 'Mask A', steps: FULL('mail', 'ma@example.test', '/plain') },
    { title: 'Mask B', steps: FULL('mail', 'mb@example.test', '/plain') },
    { title: 'Unmasked literal A', manual: ['1. Type aaaaaa in the Code field.', '2. Click Verify and see Wrong.'], steps: [{ action: 'goto', path: '/plain' }, { action: 'fill', role: 'textbox', name: 'Code', value: 'aaaaaa' }, VERIFY, { action: 'expect_visible', text: 'Wrong' }] },
    { title: 'Unmasked literal B', manual: ['1. Type bbbbbb in the Code field.', '2. Click Verify and see Wrong.'], steps: [{ action: 'goto', path: '/plain' }, { action: 'fill', role: 'textbox', name: 'Code', value: 'bbbbbb' }, VERIFY, { action: 'expect_visible', text: 'Wrong' }] },
    { title: 'Sms with no source in a mail run', steps: FULL('sms', PHONE) },
    { title: 'Stale mail', steps: SHORT('mail', USER) },
  ];
  const ctx = await scenario('mail', { seed: { states: {}, channel_sources: { mail: { kind: 'mailpit', url: `http://127.0.0.1:${port}/` } } }, defs: cases });
  const { doc, runDir } = ctx;
  assert.deepEqual(outcomes(doc), [['pass', null], ['pass', null], ['pass', null], ['pass', null], ['pass', null], ['pass', null], ['needs-human', 'EXTERNAL_CHANNEL'], ['fail', null]], summary(doc));
  assert.deepEqual(doc.counts, { pass: 6, fail: 1, blocked: 0, 'needs-human': 1 });
  assert.ok(state.apiHits > 0, 'the fake Mailpit was never called');
  // Every step of the reading case ran, the read step included.
  assert.deepEqual(doc.cases[0].steps.map((/** @type {any} */ s) => [s.action, s.result]), [['goto', 'passed'], ['click', 'passed'], ['read_message', 'passed'], ['fill', 'passed'], ['click', 'passed'], ['expect_visible', 'passed']]);
  assert.ok(String(doc.cases[0].steps[2].evidence).endsWith('/evidence/case-1.message-3.json'), String(doc.cases[0].steps[2].evidence));
  // The stale message (received before this case began) is never used, and the reason is a fixed sentence.
  assert.equal(doc.cases[7].reason, 'step 2: no message from the declared mail source matched within 10 seconds');
  assert.deepEqual(doc.cases[7].steps.map((/** @type {any} */ s) => s.result), ['passed', 'failed', 'not-run']);
  assert.equal(doc.cases[6].reason, `step 3: ${R.REASON_CATALOGUE.EXTERNAL_CHANNEL.reason}`);
  // Metadata only: the channel, the step position and the time of the message that was chosen, never the message.
  const evDir = join(runDir, 'evidence');
  assert.deepEqual(readdirSync(evDir).filter((n) => n.includes('.message-')).sort(), ['case-1.message-3.json', 'case-2.message-3.json', 'case-3.message-3.json', 'case-4.message-3.json']);
  const meta = JSON.parse(readFileSync(join(evDir, 'case-1.message-3.json'), 'utf8'));
  assert.deepEqual(Object.keys(meta).sort(), ['action', 'channel', 'received_at', 'result', 'step']);
  assert.deepEqual([meta.action, meta.step, meta.channel, meta.result], ['read_message', 3, 'mail', 'passed']);
  const chosen = state.mails.find((m) => m.To[0].Address === USER && m.Text.includes(CODE));
  assert.equal(meta.received_at, chosen.Created, 'the metadata names the time of the newest message, not of the decoy');
  for (const f of walk(runDir).filter((p) => p.includes('.message-'))) assert.ok(f.startsWith(evDir), `a message-derived file is outside evidence/: ${f}`);
  for (const f of walk(evDir).filter((p) => p.includes('.message-'))) {
    const text = readFileSync(f, 'utf8');
    assert.ok(!text.includes('example.test') && !text.includes('Your code') && !text.includes('code is'), `${f} holds the recipient or the message`);
  }
  // The page echoes the code, so the final capture is redacted text and no screenshot of the code is kept.
  const txt = join(evDir, 'case-1.txt');
  assert.ok(existsSync(txt), 'the page text holds the code, so the final capture must be redacted text');
  assert.ok(/redacted/i.test(readFileSync(txt, 'utf8')), 'the text capture is not redacted');
  assert.ok(!existsSync(join(evDir, 'case-1.png')));
  // A field filled with the code is masked in the capture: two cases that differ only in the code give the same screenshot,
  // and two cases that differ only in a literal typed into the field do not (so the field is visible when it is not masked).
  const png = (/** @type {number} */ k) => readFileSync(join(evDir, `case-${k}.png`));
  assert.ok(png(3).equals(png(4)), 'the filled code is visible in the final capture');
  assert.ok(!png(5).equals(png(6)), 'the control cannot see a typed value, so the equality above proves nothing');
  assertNoSecret(ctx);
  assert.deepEqual(validateResults(doc), [], 'the contract rejects the results');
});

test('AC-16 AC-21 sms: only the lines appended after the case start are read, the last line for the recipient wins, a stale line fails, and a short value blocks', SLOW, async () => {
  const smsDir = (/** @type {string} */ root) => join(root, 'PRPs', 'auth', '.sms');
  const ctx = await scenario('sms', {
    seed: { states: {}, channel_sources: { sms: { kind: 'file', path: 'PRPs/auth/.sms/inbox.txt' } } },
    pre: (root) => {
      mkdirSync(smsDir(root), { recursive: true });
      state.smsFile = join(smsDir(root), 'inbox.txt');
      writeFileSync(state.smsFile, `to:${PHONE} code is 111111\n`);
    },
    defs: [
      { title: 'Sms code', steps: FULL('sms', PHONE) },
      { title: 'Stale sms', steps: SHORT('sms', PHONE) },
      { title: 'Short sms value', steps: [{ action: 'goto', path: '/' }, SEND, READ('sms', PHONE_SHORT, 'code is (\\d+)'), VERIFIED] },
      { title: 'Mail with no source in an sms run', steps: FULL('mail', USER) },
    ],
  });
  const { doc, runDir } = ctx;
  assert.deepEqual(outcomes(doc), [['pass', null], ['fail', null], ['blocked', 'CAPTURE_UNREDACTABLE'], ['needs-human', 'EXTERNAL_CHANNEL']], summary(doc));
  assert.deepEqual(doc.counts, { pass: 1, fail: 1, blocked: 1, 'needs-human': 1 });
  assert.equal(doc.cases[1].reason, 'step 2: no message from the declared sms source matched within 10 seconds');
  assert.match(doc.cases[2].reason, /^step 3: .*too short to redact/);
  assert.ok(!doc.cases[2].reason.includes(SHORT_CODE), 'a reason echoed the short value');
  const meta = JSON.parse(readFileSync(join(runDir, 'evidence', 'case-1.message-3.json'), 'utf8'));
  assert.deepEqual(Object.keys(meta).sort(), ['action', 'channel', 'received_at', 'result', 'step']);
  assert.deepEqual([meta.channel, meta.step, meta.received_at, meta.result], ['sms', 3, null, 'passed']);
  assert.ok(!existsSync(join(runDir, 'evidence', 'case-2.message-2.json')), 'a read that found nothing left metadata');
  assert.ok(readFileSync(state.smsFile ?? '', 'utf8').includes(CODE), 'the fixture file did receive the code');
  assertNoSecret(ctx, [CODE, DECOY, '111111']);
  assert.deepEqual(validateResults(doc), []);
});

test('AC-15 a redirect from the catcher is not followed and an unreachable catcher blocks CHANNEL_UNREACHABLE', SLOW, async () => {
  const redirected = await scenario('redirect', {
    seed: { states: {}, channel_sources: { mail: { kind: 'mailpit', url: `http://127.0.0.1:${port}/redir` } } },
    defs: [{ title: 'Mail answered by a redirect', steps: SHORT('mail', USER) }],
  });
  assert.deepEqual(outcomes(redirected.doc), [['blocked', 'CHANNEL_UNREACHABLE']], summary(redirected.doc));
  assert.ok(state.redirSearches >= 1, 'the fake never answered the search with a redirect');
  assert.equal(state.redirectedHits, 0, 'the redirect target was requested: a redirect must not be followed');
  assert.equal(redirected.doc.cases[0].reason, 'step 2: the declared mail source could not be read');
  assert.deepEqual(validateResults(redirected.doc), []);

  // A port nobody listens on: the catcher is down.
  const free = await new Promise((r) => {
    const s = createNetServer();
    s.listen(0, '127.0.0.1', () => {
      const p = /** @type {import('node:net').AddressInfo} */ (s.address()).port;
      s.close(() => r(p));
    });
  });
  const down = await scenario('unreachable', {
    seed: { states: {}, channel_sources: { mail: { kind: 'mailpit', url: `http://127.0.0.1:${free}` } } },
    defs: [{ title: 'Mail from a catcher that is down', steps: SHORT('mail', USER) }],
  });
  assert.deepEqual(outcomes(down.doc), [['blocked', 'CHANNEL_UNREACHABLE']], summary(down.doc));
  assert.deepEqual(down.doc.counts, { pass: 0, fail: 0, blocked: 1, 'needs-human': 0 });
  assert.ok(!String(down.doc.cases[0].reason).includes(String(free)), 'a reason echoed the declared origin');
});

test('AC-16 AC-21 an sms path that reaches outside the target root through a link is refused at read time and nothing outside is kept', SLOW, async (t) => {
  const outside = mkdtempSync(join(SANDBOX, 'outside-'));
  const outsideFile = join(outside, 'inbox.txt');
  writeFileSync(outsideFile, `to:${PHONE} code is 111111\n`);
  // Only this sub-case depends on the OS: a directory link is a junction on Windows (no privilege needed), a symbolic link elsewhere.
  try {
    symlinkSync(outside, join(SANDBOX, 'link-probe'), 'junction');
  } catch {
    t.skip('this OS could not create a directory link; the lexical path rules are covered above');
    return;
  }
  const ctx = await scenario('symlink', {
    seed: { states: {}, channel_sources: { sms: { kind: 'file', path: 'PRPs/auth/.sms/inbox.txt' } } },
    pre: (root) => {
      symlinkSync(outside, join(root, 'PRPs', 'auth', '.sms'), 'junction');
      state.smsFile = outsideFile;
    },
    defs: [{ title: 'Sms behind a link', steps: FULL('sms', PHONE) }],
  });
  assert.deepEqual(outcomes(ctx.doc), [['blocked', 'CHANNEL_SOURCE_INVALID']], summary(ctx.doc));
  assert.match(ctx.doc.cases[0].reason, /^step 3: .*outside the target root; nothing was read$/);
  assert.ok(readFileSync(outsideFile, 'utf8').includes(CODE), 'the fixture outside the root did receive the code');
  assertNoSecret(ctx, [CODE, DECOY]);
});

// ---------------------------------------------------------------------------
// 4. The documents (AC-22)
// ---------------------------------------------------------------------------

const COMMAND_DOC = read('plugins/relay/commands/relay-qa-run.md');

test('AC-22 the command doc carries exactly one marked read_message example, for the browser driver, and it validates against the script', () => {
  const found = [...COMMAND_DOC.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([\s\S]*?)\n```/g)].map((m) => ({ driver: m[1], step: JSON.parse(m[2]) }));
  const reads = found.filter((e) => e.step.action === 'read_message');
  assert.equal(reads.length, 1);
  assert.equal(reads[0].driver, 'browser');
  assert.equal(R.validateStep('browser', reads[0].step), null);
  assert.equal(R.validateStep('http', reads[0].step)?.code, 'PLAN_ENTRY_INVALID', 'the doc says the step is for browser entries only');
  for (const k of ['within', 'name_prefix', 'label_text', 'index', 'effect', 'selector']) assert.ok(!(k in reads[0].step), `the example carries ${k}`);
  // The example binds a name a later fill uses, from the declared capture it reads the recipient from.
  assert.equal(R.validateSteps('browser', [GOTO, reads[0].step, { action: 'fill', role: 'textbox', name: 'Code', value: `{{${reads[0].step.extract.as}}}` }, SEE], ['email']), null);
  for (const e of found) assert.equal(R.validateStep(e.driver, e.step), null, JSON.stringify(e.step));
});

test('AC-22 the channel sources paragraph states the declaration, the guard, the refusals and the decline, and its example declares a source the script accepts', () => {
  const start = COMMAND_DOC.indexOf('Channel sources. `channel_sources` is a top-level map in `PRPs/auth/qa-seed.json`');
  assert.ok(start >= 0, 'the Channel sources paragraph is missing');
  assert.equal(COMMAND_DOC.indexOf('Channel sources. `channel_sources`', start + 1), -1, 'the paragraph appears once');
  const end = COMMAND_DOC.indexOf('A literal `browser` step that reads a verification code from a declared source:', start);
  assert.ok(end > start, 'the marked example follows the paragraph');
  const para = flat(COMMAND_DOC.slice(start, end));
  for (const token of ['"kind": "mailpit"', '"kind": "file"', 'local-only guard', '`FAILED_NON_LOCAL_TARGET`', '`CHANNEL_SOURCE_INVALID`', '`EXTERNAL_CHANNEL`', 'never sends a message', 'never write a URL or a path in `plan.json`']) {
    assert.ok(para.includes(token), `the channel sources paragraph does not state ${token}`);
  }
  const fence = /```json\n([\s\S]*?)\n```/.exec(COMMAND_DOC.slice(start, end));
  assert.ok(fence, 'the declaration example is missing');
  const declared = JSON.parse(fence[1]);
  const mail = /** @type {any} */ (R.classifyChannelSource(declared.channel_sources, 'mail', ROOT));
  assert.deepEqual([mail.ok, mail.kind, mail.url], [true, 'mailpit', 'http://localhost:8025']);
  assert.equal(/** @type {any} */ (R.classifyChannelSource(declared.channel_sources, 'sms', ROOT)).code, 'EXTERNAL_CHANNEL', 'the example declares mail only');
});

test('AC-22 the read_message rules state the limits, the binding scope, the wait, the failure modes and the secrecy of the value', () => {
  const start = COMMAND_DOC.indexOf('A `read_message` step reads a verification code from a source declared in');
  assert.ok(start >= 0, 'the read_message rules are missing');
  const rules = flat(COMMAND_DOC.slice(start, COMMAND_DOC.indexOf('`role` is a role slug', start)));
  for (const token of ['`mail` or `sms`', '200 characters', 'capturing group', 'asserts nothing', 'earlier `goto`', 'nowhere else', 'ten seconds', '`fail`', '`CHANNEL_UNREACHABLE`', 'registered for redaction', 'masked in the captures', '`CAPTURE_UNREDACTABLE`', 'never the message', '`browser` entries only']) {
    assert.ok(rules.includes(token), `the read_message rules do not state ${token}`);
  }
});

test('AC-22 the honesty rules plan a read_message step only for a declared channel and decline the rest with EXTERNAL_CHANNEL', () => {
  const at = COMMAND_DOC.indexOf('- Plan a `read_message` step only for a channel that `channel_sources` in');
  assert.ok(at >= 0, 'the honesty bullet is missing');
  assert.ok(at > COMMAND_DOC.indexOf('Honesty rules:'), 'the bullet belongs to the honesty rules');
  const bullet = flat(COMMAND_DOC.slice(at, COMMAND_DOC.indexOf('\n- ', at + 3)));
  for (const token of ['`PRPs/auth/qa-seed.json`', 'after the step that makes the product send the message', 'never write a code', 'decline with `EXTERNAL_CHANNEL`']) {
    assert.ok(bullet.includes(token), `the honesty bullet does not state ${token}`);
  }
});

test('AC-22 the API reference row names the eleven new exports and each is real, and the knowledge base and the site state the step and the declaration', () => {
  const names = ['READ_MESSAGE_CHANNELS', 'CHANNEL_SOURCE_KINDS', 'READ_MESSAGE_WAIT_MS', 'READ_MESSAGE_POLL_MS', 'MESSAGE_REGEX_MAX', 'MESSAGE_TEXT_MAX', 'MESSAGE_VALUE_MAX', 'classifyChannelSource', 'newestMailAfter', 'smsEntryAfter', 'extractMessageValue'];
  const rows = read('docs/api-reference.md').split('\n').filter((l) => l.startsWith('| `qa-run.mjs` '));
  assert.equal(rows.length, 1);
  for (const n of names) {
    assert.ok(Object.hasOwn(R, n), `${n} is not an export`);
    assert.ok(rows[0].includes(`\`${n}\``), `${n} is missing from the qa-run.mjs row`);
  }
  const commandRow = read('docs/api-reference.md').split('\n').find((l) => l.startsWith('| `/relay-qa-run '));
  assert.ok(commandRow && commandRow.includes('`read_message`') && commandRow.includes('`channel_sources`'), 'the /relay-qa-run row does not state the step and the declaration');
  assert.ok(read('docs/domain/glossary.md').includes('`read_message` step') && read('docs/domain/glossary.md').includes('`channel_sources`'), 'the glossary does not state the step');
  assert.ok(read('docs/domain/flows.md').includes('A `read_message` step reads a verification code from a local source that'), 'the flows do not state the step');
  const commands = read('documentation/reference/commands.html');
  assert.ok(commands.includes('<code>read_message</code>') && commands.includes('<code>channel_sources</code>'), 'commands.html does not describe the step');
  const scripts = read('documentation/reference/scripts.html');
  for (const n of ['classifyChannelSource', 'extractMessageValue', 'newestMailAfter', 'smsEntryAfter']) assert.ok(scripts.includes(`<code>${n}</code>`), `scripts.html does not name ${n}`);
  const changelog = read('documentation/changelog.html');
  const entry = changelog.indexOf('<strong>Local channel sources</strong>');
  assert.ok(entry >= 0, 'the changelog has no entry');
  assert.ok(entry < changelog.indexOf('id="v0-46-0"'), 'the entry belongs to Unreleased');
});
