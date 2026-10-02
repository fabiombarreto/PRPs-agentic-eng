// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-5 / AC-6 (phase-1 slice): the validate check that pins the secrecy split
/**
 * Tests for the auth-secrecy validate check. Baseline is the real repository
 * files; every rule is then pinned by mutating a copy of the baseline so the
 * check must reject it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkAuthSecrecy, runAuthSecrecyCheck } from './auth-secrecy.mjs';

const read = (/** @type {string} */ rel) => readFileSync(resolve(rel), 'utf8');
const IGNORE = read('plugins/relay/resources/auth-kit.gitignore');
const SCRIPT = read('plugins/relay/scripts/auth-kit-secrecy.mjs');
const POLICY = read('plugins/relay/resources/redaction-policy.md');

/** @param {{ ignoreText?: string | null, scriptText?: string | null, policyText?: string | null }} [over] */
function check(over = {}) {
  return checkAuthSecrecy({ ignoreText: IGNORE, scriptText: SCRIPT, policyText: POLICY, ...over });
}

/** @param {string} text @param {string} rule */
function dropRule(text, rule) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== rule)
    .join('\n');
}

/** @param {ReturnType<typeof check>} r @param {RegExp} re */
function assertRejected(r, re) {
  assert.equal(r.ok, false);
  assert.ok(r.findings.some((f) => re.test(f.message)), `expected a finding matching ${re}; got ${JSON.stringify(r.findings)}`);
}

test('baseline: the real repository files pass', () => {
  const r = check();
  assert.equal(r.ok, true, JSON.stringify(r.findings));
  assert.equal(r.name, 'auth-secrecy');
  assert.deepEqual(r.findings, []);
});

test('runAuthSecrecyCheck (zero-arg) passes on the working tree', () => {
  const r = runAuthSecrecyCheck();
  assert.equal(r.ok, true, JSON.stringify(r.findings));
});

test('the check is registered in the validate runner', () => {
  const index = read('scripts/validate/index.mjs');
  assert.match(index, /import \{[^}]*runAuthSecrecyCheck[^}]*\} from '\.\/checks\/auth-secrecy\.mjs'/);
  assert.match(index, /^\s*runAuthSecrecyCheck,\s*$/m);
});

for (const rule of ['credentials.*', '!credentials.example.*', '.sessions/', '*.storage-state.json', '*.session.json']) {
  test(`rejects an ignore resource missing the rule ${rule}`, () => {
    assertRejected(check({ ignoreText: dropRule(IGNORE, rule) }), /missing required rule/);
  });
}

test('rejects a re-include placed before credentials.* (it would be overridden)', () => {
  const swapped = `!credentials.example.*\n${dropRule(IGNORE, '!credentials.example.*')}`;
  assertRejected(check({ ignoreText: swapped }), /must appear after credentials\.\*/);
});

test('rejects an extra re-include that could expose a secret', () => {
  assertRejected(check({ ignoreText: `${IGNORE}\n!*.storage-state.json\n` }), /unexpected re-include/);
});

for (const blanket of ['*', '/*']) {
  test(`rejects the blanket rule ${blanket} that hides the tracked side`, () => {
    assertRejected(check({ ignoreText: `${IGNORE}\n${blanket}\n` }), /blanket rule/);
  });
}

test('a commented-out rule does not count as present', () => {
  const commented = IGNORE.split(/\r?\n/)
    .map((l) => (l.trim() === '.sessions/' ? '# .sessions/' : l))
    .join('\n');
  assertRejected(check({ ignoreText: commented }), /missing required rule: \.sessions\//);
});

test('tolerates CRLF line endings in the ignore resource', () => {
  assert.equal(check({ ignoreText: IGNORE.split('\n').join('\r\n') }).ok, true);
});

for (const token of ['FAILED_IGNORE_UNPROVEN', 'check-ignore']) {
  test(`rejects a secrecy script that loses ${token}`, () => {
    assertRejected(check({ scriptText: SCRIPT.split(token).join('REMOVED') }), new RegExp(`does not contain: ${token}`));
  });
}

for (const token of ['### Credential stores, session files and storage-state paths', 'Set-Cookie', 'PRPs/auth/.sessions/']) {
  test(`rejects a redaction policy that loses ${token}`, () => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assertRejected(check({ policyText: POLICY.split(token).join('REMOVED') }), new RegExp(`does not contain: ${escaped}`));
  });
}

for (const key of ['ignoreText', 'scriptText', 'policyText']) {
  test(`a missing or unreadable input (${key} = null) fails loud rather than passing`, () => {
    assertRejected(check({ [key]: null }), /missing or unreadable file/);
  });
}

test('every finding carries message, file and a numeric line', () => {
  const r = check({ ignoreText: '', scriptText: '', policyText: '' });
  assert.equal(r.ok, false);
  for (const f of r.findings) {
    assert.equal(typeof f.message, 'string');
    assert.equal(typeof f.file, 'string');
    assert.equal(typeof f.line, 'number');
  }
});
