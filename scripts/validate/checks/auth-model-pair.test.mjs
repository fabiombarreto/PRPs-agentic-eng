// @ts-check
/**
 * Content regression tests for Phase 2 ("Auth model pair") of the
 * manual-qa-runner-auth-kit feature: the standalone `/relay-auth-setup`
 * command, the `auth-model-writer` / `auth-model-reviewer` agent pair and the
 * `auth-model-template.md` resource.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-2-auth-model-pair.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed phase. Authored by the test pair under R-X strict.
 *
 * Shape: each assertion class is a small pure checker over file text that
 * returns a list of finding ids. Every class is pinned twice: the real file
 * yields zero findings of that class, AND a minimal mutation of the real text
 * (removing or corrupting exactly the pinned literal) yields exactly that
 * finding id, so a guard that silently stopped firing is caught.
 *
 * Traceability:
 *   PRD AC-9 (plan AC-A3, AC-A6, AC-A7) - the human confirms the auth model
 *     before any script or credential exists: the flip is reachable only in
 *     main mode after the rubric AND the user's own reply; subagent is the
 *     fail-safe default and never flips; relayed consent is never accepted;
 *     the command writes no login script and no credential file; the
 *     template fixes the nine required sections.
 *   PRD AC-1 (plan AC-A1, phase-2 slice) - the local-only guard is a named
 *     hard failure evaluated before any read of the project.
 *   PRD AC-5 (plan AC-A2, phase-2 slice) - the secrecy `ensure` call is a
 *     named HALT that precedes the writer.
 *   PRD AC-6 (plan AC-A4) - writer/reviewer/command reference secrets by path
 *     only; the writer has no Bash and never reads .env or secret paths.
 *   PRD AC-2..4, AC-7, AC-8, AC-10..15 - OUT_OF_PHASE_SCOPE (phases 3-5).
 *   PRD AC-16 - cross-cutting byte-identity over the feature diff; not a
 *     phase-2 unit test (enforced by the plan's Level 2 git diff command).
 *
 * Run: node --test scripts/validate/checks/auth-model-pair.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { WATCHED_FILES } from './timestamp-contract.mjs';

const COMMAND = 'plugins/relay/commands/relay-auth-setup.md';
const REVIEWER = 'plugins/relay/agents/auth-model-reviewer.md';
const WRITER = 'plugins/relay/agents/auth-model-writer.md';
const TEMPLATE = 'plugins/relay/resources/auth-model-template.md';
const COMMANDS_DIR = 'plugins/relay/commands';

/** @param {string} rel */
function read(rel) {
  return readFileSync(resolve(rel), 'utf-8').replace(/\r\n/g, '\n');
}

/** @param {string} s */
function collapse(s) {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Replaces `from` with `to`; fails the test if `from` is absent so a mutation
 * can never be a silent no-op.
 * @param {string} text
 * @param {string} from
 * @param {string} to
 */
function mutate(text, from, to) {
  // Whitespace-flexible anchor: prose may wrap differently from the literal.
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
 * Like `mutate`, but replaces every occurrence.
 * @param {string} text
 * @param {string} from
 * @param {string} to
 */
function mutateAll(text, from, to) {
  assert.ok(text.includes(from), `mutation anchor not found: ${from}`);
  return text.split(from).join(to);
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
function toolsOf(text) {
  const m = text.match(/^tools:\s*(.*)$/m);
  return m ? m[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Command checker
// ---------------------------------------------------------------------------

const ALLOWED_WRITES = [
  'PRPs/auth/.gitignore',
  'PRPs/auth/auth-model-review.jsonl',
  'PRPs/auth/auth-model.md',
];

const SECRECY_LINE = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"';

/** @param {string} text */
function checkCommand(text) {
  /** @type {string[]} */
  const f = [];

  // Precondition order: local-only guard, Decision Gate sources, secrecy
  // proof, collision, then Phase A, then Phase B.
  const order = [
    '> FAILED_NON_LOCAL_TARGET:',
    '> I cannot emit the Decision Gate evidence block without reading',
    SECRECY_LINE,
    '> FAILED_IGNORE_UNPROVEN:',
    '> FAILED_AUTH_MODEL_ALREADY_APPROVED:',
    '## Phase A',
    '## Phase B',
  ].map((n) => text.indexOf(n));
  if (order.some((v) => v === -1) || order.some((v, i) => i > 0 && v <= order[i - 1])) {
    f.push('ORDER');
  }

  if (text.includes('design-spec')) f.push('DESIGN_SPEC_TOKEN');
  if (text.includes('/relay-qa-run')) f.push('QA_RUN_MENTION');
  if (text.includes('.claude/PRPs')) f.push('CLAUDE_PRPS_PATH');
  if (/PRPs\/auth\/(credentials|\.sessions)/.test(text)) f.push('SECRET_PATH_TARGET');
  if (!text.includes('This command writes no login script and no credential file.')) f.push('NO_SCRIPT_STATEMENT');
  if (!text.includes("Never flip without the user's own explicit affirmative reply.")) f.push('USER_REPLY_RULE');
  if (!text.includes('Never `Task`-dispatch either role.')) f.push('NO_TASK_DISPATCH');
  if (!text.includes('invocation_context: main')) f.push('MAIN_CONTEXT');
  if (!text.includes('Never invoked by `/relay-execute`')) f.push('NOT_IN_EXECUTE');
  if (!text.includes('date -u +%Y-%m-%dT%H:%M:%SZ')) f.push('CLOCK_CAPTURE');

  const bullet = sliceBetween(collapse(text), '**The only files written**', '- **Never flip');
  const written = bullet ? [...new Set(bullet.match(/PRPs\/auth\/[\w.\-]+/g) ?? [])].sort() : [];
  if (JSON.stringify(written) !== JSON.stringify(ALLOWED_WRITES)) f.push('WRITTEN_SET');

  return f;
}

// ---------------------------------------------------------------------------
// Reviewer checker
// ---------------------------------------------------------------------------

/** @param {string} text */
function checkReviewer(text) {
  /** @type {string[]} */
  const f = [];
  const flat = collapse(text);

  if (toolsOf(text) !== 'Read, Edit, Write') f.push('TOOLS');
  if (!flat.includes('**Default context is `subagent`**')) f.push('DEFAULT_SUBAGENT_BULLET');
  if (!flat.includes('Absent or unrecognized means `subagent`')) f.push('DEFAULT_SUBAGENT_INPUT');
  if (!flat.includes('you NEVER flip')) f.push('SUBAGENT_NEVER_FLIPS');
  if (!flat.includes('In `subagent` mode you MUST NOT flip under any circumstance.')) f.push('SUBAGENT_MUST_NOT');
  if (!flat.includes("relayed consent is not the user's consent")) f.push('RELAYED_CONSENT');
  if (!flat.includes("BOTH the rubric passing AND the user's own explicit affirmative reply")) f.push('TWO_CONDITIONS');
  if (text.includes('date -u')) f.push('DATE_U');

  const ids = [...text.matchAll(/^- \*\*(R-AM\d+)\*\*/gm)].map((m) => m[1]);
  if (ids.join(',') !== 'R-AM1,R-AM2,R-AM3,R-AM4,R-AM5,R-AM6,R-AM7') f.push('RUBRIC_IDS');

  const step4 = sliceBetween(text, '### Step 4', '### Step 5');
  if (!step4 || !step4.startsWith('### Step 4 — Final flip (`main` mode only)')) f.push('STEP4_MAIN_ONLY');
  else {
    const edit = step4.indexOf('`Edit`: `old_string`');
    const append = step4.indexOf('Append an `APPROVED`');
    if (edit === -1 || append === -1 || edit > append) f.push('FLIP_BEFORE_APPEND');
    if (!step4.includes('Re-run R-AM1 through R-AM7')) f.push('REVALIDATE');
  }

  const ts = sliceBetween(text, '### Timestamp discipline (mandatory)', '\n---');
  if (!ts || !ts.includes('2026-07-31T00:00:00Z') || !ts.includes('"timestamp_degraded": true')) f.push('TIMESTAMP_SECTION');

  if (!flat.includes('Never read a secret path.')) f.push('NO_SECRET_READ');
  return f;
}

// ---------------------------------------------------------------------------
// Writer checker
// ---------------------------------------------------------------------------

/** @param {string} text */
function checkWriter(text) {
  /** @type {string[]} */
  const f = [];
  const flat = collapse(text);
  const tools = toolsOf(text);
  if (tools !== 'Read, Write, Edit, Glob, Grep') f.push('TOOLS');
  if (/\bBash\b/.test(tools)) f.push('HAS_BASH');
  const secrets = [
    'PRPs/auth/credentials.*',
    'PRPs/auth/.sessions/',
    '*.storage-state.json',
    '*.session.json',
    '`.env.example`, `.env.sample` or `.env.template`',
  ];
  for (const s of secrets) if (!flat.includes(s)) f.push(`SECRET_LIST:${s}`);
  if (!flat.includes('Record an environment variable by NAME only')) f.push('ENV_BY_NAME');
  if (!flat.includes('Never `Read`')) f.push('NEVER_READ');
  if (!flat.includes('FAILED_TEMPLATE_UNREADABLE')) f.push('TEMPLATE_HALT');
  if (!flat.includes('Never write the `*Approved:` line')) f.push('NO_APPROVED_LINE');
  if (!flat.includes('Write only `auth_model_path`.')) f.push('WRITE_ONLY_TARGET');
  return f;
}

// ---------------------------------------------------------------------------
// Template checker
// ---------------------------------------------------------------------------

const NINE = [
  'Authentication Mechanisms',
  'Login Flow',
  'Session and Token Model',
  'Role and Permission Matrix',
  'Tenant Scoping',
  'Local User Creation',
  'Non-Automatable Items',
  'Local Targets',
  'Open Questions and Assumptions',
];

/** @param {string} text */
function checkTemplate(text) {
  /** @type {string[]} */
  const f = [];
  const skeleton = text.slice(text.indexOf('## Skeleton'));
  const headings = [...skeleton.matchAll(/^## (.+)$/gm)].map((m) => m[1]).filter((h) => h !== 'Skeleton');
  if (headings.join('|') !== NINE.join('|')) f.push('SECTIONS');
  if (!/\*Generated: <YYYY-MM-DD>\*\n\*Status: DRAFT\*\n```/.test(skeleton)) f.push('STATUS_LINES');
  if (/\*Approved:/.test(skeleton)) f.push('APPROVED_IN_SKELETON');
  if (!text.includes('`PRPs/auth/auth-model.md`')) f.push('OUTPUT_PATH');
  return f;
}

// ===========================================================================
// Baselines: the real files are clean
// ===========================================================================

test('baseline: the command, reviewer, writer and template each satisfy every pinned class', () => {
  assert.deepEqual(checkCommand(read(COMMAND)), []);
  assert.deepEqual(checkReviewer(read(REVIEWER)), []);
  assert.deepEqual(checkWriter(read(WRITER)), []);
  assert.deepEqual(checkTemplate(read(TEMPLATE)), []);
});

// ===========================================================================
// AC-1 (phase-2 slice): the local-only guard is first
// ===========================================================================

// Lifecycle update (2026-09-30, EXISTING_TEST_UPDATED): manual-qa-runner-auth-kit
// Phase 3 moved the guard out of inline prose into
// plugins/relay/scripts/auth-local-guard.mjs and retired the per-run
// `--local-host` flag (it allowlisted an arbitrary host per run). The ordering
// assertion is preserved and strengthened (the script invocation itself, its
// HALT, then the Decision Gate source read); the no-read sentence now names the
// one permitted read, the tracked hostname declaration.
test('command: the local-only guard HALT precedes the Decision Gate source read', () => {
  const t = read(COMMAND);
  const call = t.indexOf('auth-local-guard.mjs" check --root');
  const halt = t.indexOf('> FAILED_NON_LOCAL_TARGET:');
  const gateRead = t.indexOf('> I cannot emit the Decision Gate evidence block');
  assert.ok(call !== -1 && halt !== -1 && gateRead !== -1, 'guard call, guard HALT and Decision Gate HALT must all be present');
  assert.ok(call < halt, 'the guard script is invoked before its HALT is specified');
  assert.ok(halt < gateRead, 'the guard HALT precedes the Decision Gate source read');
  assert.ok(
    collapse(t).includes(
      'It performs no write, no network request and no read of the project other than the hostname declaration `PRPs/auth/local-hosts.txt`.',
    ),
  );
});

test('command: moving the guard after the Decision Gate source precondition is detected as an ORDER violation', () => {
  const t = read(COMMAND);
  const guard = sliceBetween(t, '### P1 — Local-only guard', '### P2 —');
  assert.ok(guard);
  const moved = t.replace(guard, '').replace('### P3 —', guard + '### P3 —');
  assert.deepEqual(checkCommand(moved), ['ORDER']);
});

test('command: moving the secrecy call after Phase A is detected as an ORDER violation', () => {
  const t = read(COMMAND);
  const p3 = sliceBetween(t, '### P3 —', '### P4 —');
  assert.ok(p3);
  const moved = t.replace(p3, '').replace('## Phase B', p3 + '## Phase B');
  assert.ok(checkCommand(moved).includes('ORDER'));
});

test('command: dropping the named local-only HALT is detected', () => {
  const t = mutate(read(COMMAND), '> FAILED_NON_LOCAL_TARGET:', '> WARNING:');
  assert.ok(checkCommand(t).includes('ORDER'));
});

/** @param {string} text */
function guardContractFindings(text) {
  /** @type {string[]} */
  const f = [];
  const flat = collapse(text).replace(/ > /g, ' ');
  for (const host of ['`localhost`', '`127.0.0.1`', '`::1`']) {
    if (!flat.includes(host)) f.push(`LOOPBACK_NAME:${host}`);
  }
  if (!flat.includes('a hostname declared in `PRPs/auth/local-hosts.txt` that resolves to loopback')) f.push('DECLARED_FILE');
  if (!flat.includes('A per-run flag can never add a host.')) f.push('NO_PER_RUN_FLAG_STATEMENT');
  if (!flat.includes('This guard is a hard failure, never a warning.')) f.push('HARD_FAILURE');
  if (text.includes('--local-host')) f.push('RETIRED_FLAG');
  return f;
}

// Lifecycle update (2026-09-30, EXISTING_TEST_UPDATED): the pinned contract
// moved from "exactly a `--local-host` name" to "a hostname declared in the
// tracked PRPs/auth/local-hosts.txt that resolves to loopback". The hard-failure
// assertion is kept verbatim; a negative assertion now pins that the retired
// per-run flag has not returned.
test('command: the local-only guard covers loopback names and file-declared hosts, is never a warning, and --local-host has not returned', () => {
  const t = read(COMMAND);
  assert.deepEqual(guardContractFindings(t), []);
  assert.ok(!t.includes('--local-host'), 'the retired per-run --local-host flag must not reappear');
});

test('command: each guard-contract literal is pinned by its own finding', () => {
  const t = read(COMMAND);
  assert.ok(guardContractFindings(mutate(t, 'This guard is a hard failure, never a warning.', 'This guard is a warning.')).includes('HARD_FAILURE'));
  assert.ok(guardContractFindings(mutate(t, 'A per-run flag can never add a host.', 'Hosts may be added.')).includes('NO_PER_RUN_FLAG_STATEMENT'));
  assert.ok(
    guardContractFindings(mutate(t, 'declared in\n> `PRPs/auth/local-hosts.txt` that resolves to loopback', 'declared anywhere')).includes('DECLARED_FILE'),
  );
  assert.ok(guardContractFindings(mutate(t, '`127.0.0.1`,', '')).includes('LOOPBACK_NAME:`127.0.0.1`'));
});

test('command: a reappearing --local-host flag is detected', () => {
  const t = mutate(read(COMMAND), 'A per-run flag can never add a host.', 'Pass --local-host <name> to add a host.');
  assert.deepEqual(guardContractFindings(t), ['NO_PER_RUN_FLAG_STATEMENT', 'RETIRED_FLAG']);
});

// ===========================================================================
// AC-5 (phase-2 slice): secrecy proven before anything is written
// ===========================================================================

test('command: the secrecy call is the exact ensure line and its failure HALT is named', () => {
  const t = read(COMMAND);
  assert.ok(t.split('\n').includes(SECRECY_LINE));
  assert.ok(collapse(t).replace(/ > /g, ' ').includes('Nothing further was written.'));
});

test('command: altering the ensure invocation or dropping its HALT is detected', () => {
  assert.ok(checkCommand(mutate(read(COMMAND), ' ensure --root ', ' prove --root ')).includes('ORDER'));
  assert.ok(checkCommand(mutate(read(COMMAND), '> FAILED_IGNORE_UNPROVEN:', '> NOTE:')).includes('ORDER'));
});

test('command: an already-APPROVED auth model halts and an existing DRAFT skips the writer', () => {
  const flat = collapse(read(COMMAND));
  assert.ok(flat.includes('If it ends with `*Status: APPROVED*`, HALT'));
  assert.ok(flat.includes('If it is a DRAFT, skip Phase A and go straight to Phase B.'));
  assert.ok(checkCommand(mutate(read(COMMAND), '> FAILED_AUTH_MODEL_ALREADY_APPROVED:', '> NOTE:')).includes('ORDER'));
});

// ===========================================================================
// AC-9: no script, no credential; flip needs the user's own reply
// ===========================================================================

test('command: states it writes no login script or credential file, and the written-file set is exactly three paths', () => {
  const t = read(COMMAND);
  assert.ok(!checkCommand(t).includes('NO_SCRIPT_STATEMENT'));
  assert.ok(!checkCommand(t).includes('WRITTEN_SET'));
});

test('command: adding a credential or session path to the written-file set is detected', () => {
  const t = mutate(read(COMMAND), '`PRPs/auth/auth-model.md` and', '`PRPs/auth/auth-model.md`, `PRPs/auth/credentials.json` and');
  const found = checkCommand(t);
  assert.ok(found.includes('WRITTEN_SET'));
  assert.ok(found.includes('SECRET_PATH_TARGET'));
});

test('command: dropping the no-script statement is detected', () => {
  const t = mutate(read(COMMAND), 'This command writes no login script and no credential file.', 'This command writes files.');
  assert.ok(checkCommand(t).includes('NO_SCRIPT_STATEMENT'));
});

test('command: the reviewer is adopted inline in main mode and never Task-dispatched; the user-reply rule is stated', () => {
  const t = read(COMMAND);
  assert.deepEqual(
    checkCommand(t).filter((x) => ['MAIN_CONTEXT', 'NO_TASK_DISPATCH', 'USER_REPLY_RULE', 'NOT_IN_EXECUTE'].includes(x)),
    [],
  );
  assert.ok(!/subagent_type/.test(t));
});

test('command: each dropped consent or dispatch rule is detected by its own finding', () => {
  const t = read(COMMAND);
  assert.ok(checkCommand(mutate(t, "Never flip without the user's own explicit affirmative reply.", 'Flip when ready.')).includes('USER_REPLY_RULE'));
  assert.ok(checkCommand(mutate(t, 'Never `Task`-dispatch either role.', 'Dispatch freely.')).includes('NO_TASK_DISPATCH'));
  assert.ok(checkCommand(mutateAll(t, 'invocation_context: main', 'invocation_context: subagent')).includes('MAIN_CONTEXT'));
});

test('reviewer: defaults invocation_context to subagent and never flips in subagent mode', () => {
  assert.deepEqual(
    checkReviewer(read(REVIEWER)).filter((x) => /SUBAGENT|RELAYED|TWO_CONDITIONS/.test(x)),
    [],
  );
});

test('reviewer: flipping the fail-safe default to main is detected', () => {
  const t = mutate(read(REVIEWER), 'Absent or unrecognized means\n  `subagent`', 'Absent or unrecognized means\n  `main`');
  assert.ok(checkReviewer(t).includes('DEFAULT_SUBAGENT_INPUT'));
});

test('reviewer: removing the default-subagent bullet, the never-flip rule or the relayed-consent rule is detected', () => {
  const t = read(REVIEWER);
  assert.ok(checkReviewer(mutate(t, '**Default context is `subagent`**', '**Default context is `main`**')).includes('DEFAULT_SUBAGENT_BULLET'));
  assert.ok(checkReviewer(mutate(t, 'you NEVER flip', 'you may flip')).includes('SUBAGENT_NEVER_FLIPS'));
  assert.ok(checkReviewer(mutate(t, 'In `subagent` mode you MUST NOT flip under any circumstance.', 'In `subagent` mode you may flip.')).includes('SUBAGENT_MUST_NOT'));
  assert.ok(checkReviewer(mutate(t, "relayed consent is not the user's consent", 'relayed consent is fine')).includes('RELAYED_CONSENT'));
});

test('reviewer: weakening the two-condition main-mode gate is detected', () => {
  const t = mutate(read(REVIEWER), "BOTH the rubric passing AND the user's own explicit affirmative reply", 'the rubric passing');
  assert.ok(checkReviewer(t).includes('TWO_CONDITIONS'));
});

test('reviewer: the flip is confined to a main-mode-only step, re-validates, and edits before the jsonl append', () => {
  const t = read(REVIEWER);
  const findings = checkReviewer(t);
  for (const id of ['STEP4_MAIN_ONLY', 'FLIP_BEFORE_APPEND', 'REVALIDATE']) assert.ok(!findings.includes(id), id);
  // The subagent branch hands the flip to the invoker instead of performing it.
  assert.ok(collapse(t).includes('Do NOT flip, do NOT prompt.'));
});

test('reviewer: reversing flip ordering, dropping re-validation or removing the main-only scope is detected', () => {
  const t = read(REVIEWER);
  const step4 = sliceBetween(t, '### Step 4', '### Step 5');
  assert.ok(step4);
  const edit = sliceBetween(step4, '2. `Edit`', '3. Append');
  const append = sliceBetween(step4, '3. Append', '4. Emit');
  assert.ok(edit && append);
  const swapped = t.replace(edit + append, append + edit);
  assert.ok(checkReviewer(swapped).includes('FLIP_BEFORE_APPEND'));
  assert.ok(checkReviewer(mutate(t, 'Re-run R-AM1 through R-AM7', 'Skim')).includes('REVALIDATE'));
  assert.ok(checkReviewer(mutate(t, '### Step 4 — Final flip (`main` mode only)', '### Step 4 — Final flip')).includes('STEP4_MAIN_ONLY'));
});

test('reviewer: the rubric is exactly R-AM1..R-AM7, once each and in order', () => {
  const t = read(REVIEWER);
  assert.ok(!checkReviewer(t).includes('RUBRIC_IDS'));
  assert.ok(checkReviewer(mutate(t, '- **R-AM7**', '- **R-AM8**')).includes('RUBRIC_IDS'));
  assert.ok(checkReviewer(mutate(t, '- **R-AM4**', '- **R-AM3**')).includes('RUBRIC_IDS'));
});

// ===========================================================================
// AC-6: path-only secrets, no Bash in the writer, no date -u in the reviewer
// ===========================================================================

test('writer: the tools line has no Bash and is exactly Read, Write, Edit, Glob, Grep', () => {
  const t = read(WRITER);
  assert.equal(toolsOf(t), 'Read, Write, Edit, Glob, Grep');
  assert.ok(!/\bBash\b/.test(toolsOf(t)));
});

test('writer: adding Bash to its tools is detected', () => {
  const t = mutate(read(WRITER), 'tools: Read, Write, Edit, Glob, Grep', 'tools: Read, Write, Edit, Glob, Grep, Bash');
  const found = checkWriter(t);
  assert.ok(found.includes('HAS_BASH'));
  assert.ok(found.includes('TOOLS'));
});

test('writer: forbids reading credential stores, session files, storage state and non-example .env files', () => {
  assert.deepEqual(checkWriter(read(WRITER)).filter((x) => x.startsWith('SECRET_LIST') || x === 'NEVER_READ' || x === 'ENV_BY_NAME'), []);
});

test('writer: dropping any forbidden-read entry or the env-var-by-name rule is detected', () => {
  const t = read(WRITER);
  assert.ok(checkWriter(mutate(t, '*.storage-state.json', '*.state.json')).includes('SECRET_LIST:*.storage-state.json'));
  assert.ok(checkWriter(mutate(t, 'PRPs/auth/.sessions/', 'PRPs/auth/tmp/')).includes('SECRET_LIST:PRPs/auth/.sessions/'));
  assert.ok(checkWriter(mutate(t, '`.env.example`, `.env.sample` or `.env.template`', 'any `.env` file')).some((x) => x.startsWith('SECRET_LIST:`.env.example`')));
  assert.ok(checkWriter(mutate(t, 'Record an environment variable by NAME only', 'Record environment variables')).includes('ENV_BY_NAME'));
});

test('writer: never approves its own output and writes only the target path', () => {
  const t = read(WRITER);
  assert.deepEqual(checkWriter(t).filter((x) => ['NO_APPROVED_LINE', 'WRITE_ONLY_TARGET', 'TEMPLATE_HALT'].includes(x)), []);
  assert.ok(checkWriter(mutate(t, 'Never write the `*Approved:` line', 'Write the `*Approved:` line')).includes('NO_APPROVED_LINE'));
  assert.ok(checkWriter(mutate(t, 'Write only `auth_model_path`.', 'Write anywhere.')).includes('WRITE_ONLY_TARGET'));
});

test('reviewer: its tools are clockless (Read, Edit, Write) and the file contains no date -u anywhere', () => {
  const t = read(REVIEWER);
  assert.equal(toolsOf(t), 'Read, Edit, Write');
  assert.ok(!t.includes('date -u'));
});

test('reviewer: a date -u instruction or a Bash tool is detected', () => {
  const t = read(REVIEWER);
  const inSection = mutate(t, 'If `review_started_at` was not supplied', 'Run date -u if `review_started_at` was not supplied');
  assert.ok(checkReviewer(inSection).includes('DATE_U'));
  const inBody = mutate(t, '## Protocol', 'Use `date -u` here.\n\n## Protocol');
  assert.ok(checkReviewer(inBody).includes('DATE_U'));
  assert.ok(checkReviewer(mutate(t, 'tools: Read, Edit, Write', 'tools: Read, Edit, Write, Bash')).includes('TOOLS'));
});

test('reviewer: the clockless timestamp section names T00:00:00 and the degraded flag; dropping either is detected', () => {
  const t = read(REVIEWER);
  assert.ok(!checkReviewer(t).includes('TIMESTAMP_SECTION'));
  assert.ok(checkReviewer(mutate(t, '`2026-07-31T00:00:00Z`', '`a fabricated value`')).includes('TIMESTAMP_SECTION'));
  assert.ok(checkReviewer(mutate(t, '"timestamp_degraded": true', '"degraded": 1')).includes('TIMESTAMP_SECTION'));
});

test('reviewer: dropping the never-read-a-secret-path rule is detected', () => {
  assert.ok(checkReviewer(mutate(read(REVIEWER), 'Never read a secret path.', 'Read what you need.')).includes('NO_SECRET_READ'));
});

// ===========================================================================
// Command surface hygiene
// ===========================================================================

test('command: contains zero occurrences of design-spec, and no mention of the not-yet-existing /relay-qa-run', () => {
  const t = read(COMMAND);
  assert.equal(t.split('design-spec').length - 1, 0);
  assert.ok(!t.includes('/relay-qa-run'));
});

test('command: a design-spec token or a qa-run mention is detected', () => {
  const t = read(COMMAND);
  assert.ok(checkCommand(mutate(t, '## Phase A', 'See design-spec-writer.\n\n## Phase A')).includes('DESIGN_SPEC_TOKEN'));
  assert.ok(checkCommand(mutate(t, '## Phase A', 'Next: /relay-qa-run\n\n## Phase A')).includes('QA_RUN_MENTION'));
});

test('no pair file writes under .claude/PRPs', () => {
  for (const p of [COMMAND, REVIEWER, WRITER, TEMPLATE]) assert.ok(!read(p).includes('.claude/PRPs'), p);
  assert.ok(checkCommand(mutate(read(COMMAND), '## Phase A', 'Write .claude/PRPs/x\n\n## Phase A')).includes('CLAUDE_PRPS_PATH'));
});

test('the command is inert: no other command file references /relay-auth-setup, and the orchestrator never mentions the auth model', () => {
  const others = readdirSync(resolve(COMMANDS_DIR)).filter((n) => n.endsWith('.md') && n !== 'relay-auth-setup.md');
  assert.ok(others.length > 0);
  for (const n of others) {
    assert.ok(!read(`${COMMANDS_DIR}/${n}`).includes('relay-auth-setup'), n);
  }
  const exec = read(`${COMMANDS_DIR}/relay-execute.md`);
  assert.ok(!exec.includes('auth-model') && !exec.includes('auth-setup'));
});

// ===========================================================================
// AC-A6: the template fixes the nine required sections
// ===========================================================================

test('template: the skeleton has exactly the nine required sections in order and ends with the DRAFT status lines', () => {
  const t = read(TEMPLATE);
  assert.deepEqual(checkTemplate(t), []);
});

test('template: a missing, reordered or renamed section, an approved skeleton or a lost output path is detected', () => {
  const t = read(TEMPLATE);
  assert.ok(checkTemplate(mutate(t, '## Tenant Scoping\n', '')).includes('SECTIONS'));
  assert.ok(checkTemplate(mutate(t, '## Local Targets', '## Targets')).includes('SECTIONS'));
  const swapped = mutate(mutate(t, '## Login Flow', '## @@'), '## Session and Token Model', '## Login Flow').replace('## @@', '## Session and Token Model');
  assert.ok(checkTemplate(swapped).includes('SECTIONS'));
  assert.ok(checkTemplate(mutate(t, '*Status: DRAFT*\n```', '*Status: APPROVED*\n```')).includes('STATUS_LINES'));
  assert.ok(checkTemplate(mutate(t, '*Generated: <YYYY-MM-DD>*\n*Status: DRAFT*', '*Generated: <YYYY-MM-DD>*\n*Approved: <YYYY-MM-DD>*\n*Status: DRAFT*')).includes('APPROVED_IN_SKELETON'));
  assert.ok(mutate(t, '`PRPs/auth/auth-model.md`', 'x').includes('`PRPs/auth/auth-model.md`'), 'path occurs more than once');
  assert.ok(checkTemplate(t.split('`PRPs/auth/auth-model.md`').join('`auth-model.md`')).includes('OUTPUT_PATH'));
});

test('template: the writer and reviewer both cite the template by its full plugin-root path', () => {
  assert.ok(read(WRITER).includes('${CLAUDE_PLUGIN_ROOT}/resources/auth-model-template.md'));
  assert.ok(read(COMMAND).includes('${CLAUDE_PLUGIN_ROOT}/resources/auth-model-template.md'));
});

// ===========================================================================
// Registration in the timestamp contract
// ===========================================================================

test('timestamp-contract registers the new reviewer and the new command', () => {
  assert.ok(WATCHED_FILES.includes(REVIEWER));
  assert.ok(WATCHED_FILES.includes(COMMAND));
});
