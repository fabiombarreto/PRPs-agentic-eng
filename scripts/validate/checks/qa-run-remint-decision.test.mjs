// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-13 One bounded re-mint (given a minted role whose login script halts FAILED_PROBE_MARKER_ABSENT right after the mint, the runner re-runs the login script exactly once with --force; the login template and its KIT_TEMPLATE_ID are byte-identical to before)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (the second login run is the one existing spawn, behind the same guard sites)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the decision to re-mint, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A5 a minted role that halted FAILED_PROBE_MARKER_ABSENT is run once more, capped by an exported
 *              number, AC-A6 no other role or halt is retried, the second run is the one existing spawn, and the
 *              login template and its stamp are byte-identical to before)
 *
 * Layers, with no browser, no server and no child process:
 *   1. The cap: one retry, which is the "exactly once" of the criterion, and the pure decision as a table: true
 *      only for a minted role, a non-zero status, the named halt and fewer retries than the cap; every other
 *      combination is false.
 *   2. The runner text the decision lives in: the login script is spawned from exactly one site, in a function of
 *      its own, and the retry is a bounded loop decided by the pure helper with no open-ended loop and no wait.
 *   3. The login template and its identity stamp are byte-identical to the tree recorded after phase 5 (a template
 *      change would bump the stamp and make every project's scripts stale until --refresh). The pin is the SHA-256
 *      of that tree's blob (CRLF read as LF), so it holds without that tree object being present.
 *
 * The scenarios that run the real runner against stub login scripts are in qa-run-remint-runner.test.mjs.
 *
 * QA_V2P6_RUNNER_SRC points the runner copy and the runner text at another file (a mutation control); unset, the
 * real runner is used.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, copyFileSync, rmSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const REAL_GUARD = resolve('plugins/relay/scripts/auth-local-guard.mjs');
const RUNNER_SRC = process.env.QA_V2P6_RUNNER_SRC ? resolve(process.env.QA_V2P6_RUNNER_SRC) : REAL_RUNNER;
const TEMPLATE_FILE = 'plugins/relay/resources/auth-login.template.mjs';

/** The SHA-256 of the template blob of the tree recorded after phase 5, read with LF line endings. */
const TEMPLATE_SHA256 = 'a332ca8518a63fec20cd07a9806f70cf539c3983b4ee88feb81407d62fbbbc80';

const SANDBOX = mkdtempSync(join(realpathSync(tmpdir()), 'relay-qa-v2p6-remint-decision-'));
after(() => {
  rmSync(SANDBOX, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

/** The runner and the guard, and only those two files, in a temp plugin tree. */
const COPY = (() => {
  const dir = mkdtempSync(join(SANDBOX, 'plugin-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  copyFileSync(RUNNER_SRC, join(dir, 'scripts', 'qa-run.mjs'));
  copyFileSync(REAL_GUARD, join(dir, 'scripts', 'auth-local-guard.mjs'));
  return join(dir, 'scripts', 'qa-run.mjs');
})();

/** @type {any} */
let R;
before(async () => {
  R = await import(pathToFileURL(COPY).href);
});

/** @param {string} file @returns {string} the file with LF line endings */
const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const RUNNER_TEXT = read(RUNNER_SRC);
/** @param {string} text @param {string} needle */
const occurrences = (text, needle) => text.split(needle).length - 1;
/**
 * @param {string} src @param {string} from @param {string} to
 * @returns {string} the text from the first `from` up to the first `to` after it, each asserted to exist
 */
function section(src, from, to) {
  const a = src.indexOf(from);
  assert.notEqual(a, -1, `the runner text has no ${from}`);
  const b = src.indexOf(to, a + from.length);
  assert.notEqual(b, -1, `the runner text has no ${to} after ${from}`);
  return src.slice(a, b);
}

const HALT = 'FAILED_PROBE_MARKER_ABSENT';

// ---------------------------------------------------------------------------
// 1. The cap and the decision
// ---------------------------------------------------------------------------

test('AC-13 the runner runs the login script again at most once: the exported cap is one', () => {
  assert.equal(R.LOGIN_REMINT_MAX_RETRIES, 1);
});

test('AC-13 the decision is true only for a minted role, a failed run, the one halt that follows a fresh mint and fewer retries than the cap', () => {
  const cap = R.LOGIN_REMINT_MAX_RETRIES;
  for (let retries = 0; retries < cap; retries++) {
    for (const status of [1, 2, 137]) {
      assert.equal(R.shouldRemintLogin(true, status, HALT, retries), true, `status ${status}, ${retries} retries`);
    }
  }
  assert.equal(R.shouldRemintLogin(true, 1, HALT, cap), false, 'the cap is reached');
  assert.equal(R.shouldRemintLogin(true, 1, HALT, cap + 3), false, 'the cap is passed');
});

test('AC-13 every other combination is false: a role that is not minted, a success, any other halt or none, a retry count that is not a count', () => {
  /** @type {[string, any[]][]} */
  const rows = [
    ['a role declared false', [false, 1, HALT, 0]],
    ['a role that is only truthy', [1, 1, HALT, 0]],
    ['a role named by its mechanism', ['minted', 1, HALT, 0]],
    ['a role of undefined', [undefined, 1, HALT, 0]],
    ['a successful run that left the code on its stream', [true, 0, HALT, 0]],
    ['a run that named no halt', [true, 1, null, 0]],
    ['a run that named an empty code', [true, 1, '', 0]],
    ['a run that was killed with no code', [true, null, null, 0]],
    ['a code in the wrong case', [true, 1, HALT.toLowerCase(), 0]],
    ['a code that only starts with it', [true, 1, `${HALT}_AGAIN`, 0]],
    ['a fractional retry count', [true, 1, HALT, 0.5]],
    ['a missing retry count', [true, 1, HALT, undefined]],
    ['a retry count that is not a number', [true, 1, HALT, '0']],
    ['a retry count that is NaN', [true, 1, HALT, Number.NaN]],
  ];
  for (const [label, args] of rows) assert.equal(R.shouldRemintLogin(...args), false, label);
  // Every other halt the login script or the runner names is never retried.
  for (const code of [
    'FAILED_PROBE_NOT_PROTECTED',
    'FAILED_PROBE_WRONG_ACCOUNT',
    'FAILED_PROBE_PAGE_UNLOADABLE',
    'FAILED_KIT_SCRIPT_STALE',
    'FAILED_MINT_UNCONFIRMED',
    'FAILED_MINT_COMMAND_MISSING',
    'FAILED_NON_LOCAL_TARGET',
    'FAILED_MINT_COMMAND',
    'FAILED_MINT_OUTPUT',
    'FAILED_LOGIN_UNKNOWN',
    'FAILED_LOGIN_SCRIPT_MISSING',
    'FAILED_SESSION_UNREADABLE',
  ]) {
    assert.equal(R.shouldRemintLogin(true, 1, code, 0), false, code);
  }
});

// ---------------------------------------------------------------------------
// 2. The runner text
// ---------------------------------------------------------------------------

test('AC-13 and AC-15 the login script is spawned from exactly one site, in a function of its own, with no shell', () => {
  assert.equal(occurrences(RUNNER_TEXT, 'spawnSync(process.execPath'), 1, 'a second site that runs a kit login script');
  const spawner = section(RUNNER_TEXT, 'function runLoginScript(', '\n}\n');
  assert.ok(spawner.includes('spawnSync(process.execPath'), 'the one spawn is not inside the function that names it');
  assert.ok(spawner.includes('shell: false'), 'the login script is spawned through a shell');
  assert.equal(occurrences(RUNNER_TEXT, 'function runLoginScript('), 1);
});

test('AC-13 the retry is a bounded loop decided by the pure helper: no open-ended loop, no wait and no back-off between the attempts', () => {
  const session = section(RUNNER_TEXT, 'function obtainSession(', 'async function prepareState(');
  assert.ok(session.includes('shouldRemintLogin('), 'the retry is not decided by the pure helper');
  assert.ok(/for \(let retries = 0;/.test(session), 'the retry is not a counted loop');
  assert.ok(occurrences(session, 'runLoginScript(') >= 2, 'the session section runs the login script from fewer than two places: the first run and the retry');
  for (const open of ['while (', 'do {', 'setTimeout(', 'setInterval(', 'Atomics.wait(', 'sleep(']) {
    assert.equal(session.includes(open), false, `the session section contains ${open}`);
  }
});

// ---------------------------------------------------------------------------
// 3. The login template and its stamp
// ---------------------------------------------------------------------------

test('AC-13 the login template and its identity stamp are byte-identical to the tree recorded after phase 5, so no project script becomes stale', () => {
  const template = read(TEMPLATE_FILE);
  assert.equal(createHash('sha256').update(template, 'utf8').digest('hex'), TEMPLATE_SHA256, 'the login template changed: the retry must live in the runner');
  const stamp = template.match(/^const KIT_TEMPLATE_ID = '[^']+';$/gm);
  assert.deepEqual(stamp, ["const KIT_TEMPLATE_ID = 'auth-login/2';"]);
  // The runner decides staleness from that same stamp line: the pattern it reads is unchanged.
  assert.ok(RUNNER_TEXT.includes("const KIT_STAMP_PATTERN = /^const KIT_TEMPLATE_ID = '([^']+)';$/m;"));
});
