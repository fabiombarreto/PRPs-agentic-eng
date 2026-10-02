// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-1 (phase-3 slice) the guard is a named hard failure before any write
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-6 (phase-3 slice) no credential value in the conversation or written files
/**
 * Content regression tests for plugins/relay/commands/relay-auth-scripts.md.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-3-login-scripts.plan.md
 *
 * Authored test-after by the test pair. Same shape as auth-model-pair.test.mjs:
 * each assertion class is a pure checker over file text returning finding ids,
 * and every class is pinned by a mutation of the real text that must yield
 * exactly that id.
 *
 * Run: node --test scripts/validate/checks/auth-scripts-command.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND = 'plugins/relay/commands/relay-auth-scripts.md';
const SECRECY_LINE = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"';
const GUARD_LINE =
  'node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-local-guard.mjs" check --root "<target_root>" --url "<base-url>"';
const ALLOWED_WRITES = [
  'PRPs/auth/credentials.example.json',
  'PRPs/auth/login-<role>.mjs',
  'PRPs/auth/login.config.json',
];

/** @param {string} rel */
function read(rel) {
  return readFileSync(resolve(rel), 'utf-8').replace(/\r\n/g, '\n');
}

/** @param {string} s */
function collapse(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Whitespace-flexible single replacement; fails if the anchor is absent so a
 * mutation can never be a silent no-op.
 * @param {string} text
 * @param {string} from
 * @param {string} to
 */
function mutate(text, from, to) {
  const pattern = from
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  const re = new RegExp(pattern);
  assert.ok(re.test(text), `mutation anchor not found: ${from}`);
  return text.replace(re, () => to);
}

/**
 * @param {string} content
 * @param {string} start
 * @param {string} end
 */
function sliceBetween(content, start, end) {
  const i = content.indexOf(start);
  if (i === -1) return undefined;
  const j = content.indexOf(end, i + start.length);
  return j === -1 ? content.slice(i) : content.slice(i, j);
}

/** @param {string} text */
function check(text) {
  /** @type {string[]} */
  const f = [];

  // Precondition order: sources, approval, guard, secrecy, then generation.
  const order = [
    '> I cannot emit the Decision Gate evidence block without reading',
    '> FAILED_AUTH_MODEL_NOT_APPROVED:',
    GUARD_LINE,
    '> FAILED_NON_LOCAL_TARGET:',
    SECRECY_LINE,
    '> FAILED_IGNORE_UNPROVEN:',
    '## Phase A',
  ].map((n) => text.indexOf(n));
  if (order.some((v) => v === -1) || order.some((v, i) => i > 0 && v <= order[i - 1])) f.push('ORDER');

  if (text.includes('design-spec')) f.push('DESIGN_SPEC_TOKEN');
  if (text.includes('/relay-qa-run')) f.push('QA_RUN_MENTION');
  if (text.includes('relay-auth-setup')) f.push('AUTH_SETUP_MENTION');
  if (text.includes('.claude/PRPs')) f.push('CLAUDE_PRPS_PATH');
  if (text.includes('--local-host')) f.push('RETIRED_FLAG');

  const flat = collapse(text).replace(/ > /g, ' ');
  if (!flat.includes('The guard is a hard failure, never a warning.')) f.push('HARD_FAILURE');
  if (!flat.includes('There is no flag for them.')) f.push('NO_HOST_FLAG');
  if (!flat.includes('Never ask the user a question.')) f.push('NEVER_ASK');
  if (!flat.includes('Never `Task`-dispatch anything.')) f.push('NO_TASK_DISPATCH');
  if (!flat.includes('Never invoked by `/relay-execute`.')) f.push('NOT_IN_EXECUTE');
  if (!flat.includes('Edit the script template while copying it.')) f.push('NO_TEMPLATE_EDIT');
  if (!flat.includes('Nothing is written before the approval check (P2), the guard (P3) and the secrecy proof (P4) have passed.')) {
    f.push('NOTHING_BEFORE_GATES');
  }
  if (!flat.includes('replacing every occurrence of `__RELAY_ROLE__` with the slug — no other substitution and no edit')) {
    f.push('ONE_SUBSTITUTION');
  }
  if (!flat.includes('*Status: APPROVED*')) f.push('APPROVED_GATE');
  if (!flat.includes('`PRPs/auth/credentials.json`, anything under `PRPs/auth/.sessions/`')) f.push('SECRET_WRITE_FORBIDDEN');

  const bullet = sliceBetween(collapse(text), '**The only files written**', '- **Never write**');
  const written = bullet ? [...new Set(bullet.match(/PRPs\/auth\/[\w.<>\-]+/g) ?? [])].sort() : [];
  if (JSON.stringify(written) !== JSON.stringify(ALLOWED_WRITES)) f.push('WRITTEN_SET');

  return f;
}

test('baseline: the real command satisfies every pinned class', () => {
  assert.deepEqual(check(read(COMMAND)), []);
});

test('the preconditions run in order: sources, approval, guard, secrecy, generation', () => {
  const t = read(COMMAND);
  const p2 = sliceBetween(t, '### P2 —', '### P3 —');
  assert.ok(p2);
  // The approval check moved after the guard.
  const approvalLate = t.replace(p2, () => '').replace('### P4 —', () => `${p2}### P4 —`);
  assert.deepEqual(check(approvalLate), ['ORDER']);

  const p3 = sliceBetween(t, '### P3 —', '### P4 —');
  assert.ok(p3);
  // The guard moved after the secrecy step: the file stays well-formed but the order breaks.
  const guardLate = t.replace(p3, () => '').replace('## Phase A', () => `${p3}## Phase A`);
  assert.deepEqual(check(guardLate), ['ORDER']);
});

test('dropping a named HALT is detected', () => {
  const t = read(COMMAND);
  assert.ok(check(mutate(t, '> FAILED_NON_LOCAL_TARGET:', '> WARNING:')).includes('ORDER'));
  assert.ok(check(mutate(t, '> FAILED_AUTH_MODEL_NOT_APPROVED:', '> NOTE:')).includes('ORDER'));
  assert.ok(check(mutate(t, '> FAILED_IGNORE_UNPROVEN:', '> NOTE:')).includes('ORDER'));
});

test('altering the guard or secrecy invocation is detected', () => {
  const t = read(COMMAND);
  assert.ok(t.split('\n').includes(GUARD_LINE));
  assert.ok(t.split('\n').includes(SECRECY_LINE));
  assert.ok(check(mutate(t, ' check --root "<target_root>" --url', ' check --url')).includes('ORDER'));
  assert.ok(check(mutate(t, ' ensure --root ', ' prove --root ')).includes('ORDER'));
});

test('the guard is a hard failure with no host flag; a reappearing --local-host or a softened guard is detected', () => {
  const t = read(COMMAND);
  assert.ok(!t.includes('--local-host'));
  assert.ok(check(mutate(t, 'There is no flag for them.', 'Pass --local-host for them.')).includes('RETIRED_FLAG'));
  assert.ok(check(mutate(t, 'There is no flag for them.', 'Use a flag for them.')).includes('NO_HOST_FLAG'));
  assert.ok(check(mutate(t, 'The guard is a hard failure, never a warning.', 'The guard is advisory.')).includes('HARD_FAILURE'));
});

test('generation is gated on an APPROVED model and nothing is written before the gates', () => {
  const t = read(COMMAND);
  assert.ok(check(mutate(t, '`*Status: APPROVED*`', '`*Status: DRAFT*`')).includes('APPROVED_GATE'));
  assert.ok(
    check(mutate(t, 'Nothing is written before the approval check (P2)', 'Files may be written before the approval check (P2)')).includes(
      'NOTHING_BEFORE_GATES',
    ),
  );
});

test('the written-file set is exactly the config, the per-role scripts and the placeholder example', () => {
  const t = read(COMMAND);
  assert.ok(!check(t).includes('WRITTEN_SET'));
  const widened = mutate(t, '`PRPs/auth/credentials.example.json`.\n- **Never write**', '`PRPs/auth/credentials.example.json` and `PRPs/auth/credentials.json`.\n- **Never write**');
  assert.ok(check(widened).includes('WRITTEN_SET'));
});

test('writing a credential store, session or storage-state file stays forbidden; dropping that rule is detected', () => {
  const t = read(COMMAND);
  assert.ok(collapse(t).includes('any `*.storage-state.json` or `*.session.json`'));
  assert.ok(check(mutate(t, '`PRPs/auth/credentials.json`, anything under', 'nothing under')).includes('SECRET_WRITE_FORBIDDEN'));
});

test('the template is copied with one substitution and never edited; the command never asks, never dispatches, is never run by /relay-execute', () => {
  const t = read(COMMAND);
  assert.ok(
    check(mutate(t, 'with the slug — no other substitution and no edit', 'with the slug and adjusting as needed')).includes('ONE_SUBSTITUTION'),
  );
  assert.ok(check(mutate(t, 'Edit the script template while copying it.', 'Tune the template.')).includes('NO_TEMPLATE_EDIT'));
  assert.ok(check(mutate(t, 'Never ask the user a question.', 'Ask when unsure.')).includes('NEVER_ASK'));
  assert.ok(check(mutate(t, 'Never `Task`-dispatch anything.', 'Dispatch freely.')).includes('NO_TASK_DISPATCH'));
  assert.ok(check(mutate(t, 'Never invoked by `/relay-execute`.', 'Invoked by anything.')).includes('NOT_IN_EXECUTE'));
});

test('command surface hygiene: no design-spec, no /relay-qa-run, no /relay-auth-setup mention, no .claude/PRPs', () => {
  const t = read(COMMAND);
  assert.equal(t.split('design-spec').length - 1, 0);
  assert.ok(!t.includes('/relay-qa-run'));
  assert.ok(!t.includes('relay-auth-setup'));
  assert.ok(!t.includes('.claude/PRPs'));
  assert.ok(check(mutate(t, '## Phase A', 'See design-spec-writer.\n\n## Phase A')).includes('DESIGN_SPEC_TOKEN'));
  assert.ok(check(mutate(t, '## Phase A', 'Next: /relay-qa-run\n\n## Phase A')).includes('QA_RUN_MENTION'));
  assert.ok(check(mutate(t, '## Phase A', 'Run /relay-auth-setup\n\n## Phase A')).includes('AUTH_SETUP_MENTION'));
  assert.ok(check(mutate(t, '## Phase A', 'Write .claude/PRPs/x\n\n## Phase A')).includes('CLAUDE_PRPS_PATH'));
});
