// @ts-check
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-28 /relay-auth-setup --fresh archives the kit files without touching a session or credential file, and a DRAFT model offers a re-run
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-24 (command side) /relay-auth-scripts --refresh regenerates scripts from the installed template and reports stale ones
// PRPs/prds/manual-qa-runner-auth-kit.prd.md AC-22 / AC-26 (command side) the generator writes a null HTTP probe and a null maxAgeMinutes only where the model says so
/**
 * Content pins for the phase-8 riders of two standalone markdown commands:
 * `/relay-auth-setup` (`--fresh` archive, the DRAFT re-run offer) and
 * `/relay-auth-scripts` (`--refresh`, null probe, null age). Both commands are
 * executed by an agent, not by code, so the observable contract is the text the
 * agent follows; each pin below names a behavior and the sentence that carries it.
 *
 * Source PRD:  PRPs/prds/manual-qa-runner-auth-kit.prd.md (AC-22, AC-24, AC-26, AC-28)
 * Source plan: PRPs/plans/completed/manual-qa-runner-auth-kit-phase-8-probe-and-kit-hardening.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false), in the style of
 * auth-model-pair.test.mjs and auth-scripts-command.test.mjs, whose pins on the
 * same files (precondition order, the written-file set, the single substitution,
 * the secret-path literals) are not repeated here.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SETUP = 'plugins/relay/commands/relay-auth-setup.md';
const SCRIPTS = 'plugins/relay/commands/relay-auth-scripts.md';

/** @param {string} rel */
function read(rel) {
  return readFileSync(resolve(rel), 'utf-8').replace(/\r\n/g, '\n');
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
 * Asserts every literal occurs in the whitespace-collapsed text.
 * @param {string} flat
 * @param {[string, string][]} pins [behavior, literal]
 */
function assertPins(flat, pins) {
  for (const [behavior, literal] of pins) {
    assert.ok(flat.includes(literal), `${behavior}: the command must say "${literal}"`);
  }
}

// ---------------------------------------------------------------------------
// AC-28: /relay-auth-setup --fresh and the DRAFT re-run offer
// ---------------------------------------------------------------------------

test('AC-28: --fresh is an accepted argument (hint, argument list, usage and example), combinable with --base-url', () => {
  const text = read(SETUP);
  assert.match(text, /^argument-hint: \[--base-url <local-url>\] \[--fresh\]$/m);
  const flat = collapse(text);
  assertPins(flat, [
    ['argument list', '`--fresh` — optional and combinable with `--base-url`'],
    ['usage line', 'Usage: `/relay-auth-setup [--base-url <local-url>] [--fresh]`'],
    ['example', 'Example: `/relay-auth-setup --fresh`'],
  ]);
});

test('AC-28: the archive is a UTC-stamped directory under the kit\'s ignored .sessions/ directory, described relative to the kit, created only after the secrecy proof', () => {
  const text = read(SETUP);
  const flat = collapse(text);
  const p5 = collapse(section(text, '### P5', '## Phase A'));
  assertPins(p5, [
    ['UTC stamp command', 'date -u +%Y%m%dT%H%M%SZ'],
    ['archive location', "`archive/<stamp>/` inside the kit's ignored `.sessions/` directory"],
    ['relative to the kit', '(both relative to the kit directory, `PRPs/auth/`)'],
    ['why that directory', 'The P3 `ensure` call has already proven that directory ignored'],
    ['no new ignore rule', 'a new ignore rule could not reach it'],
  ]);
  const order = [flat.indexOf('### P3'), flat.indexOf('### P4'), flat.indexOf('### P5'), flat.indexOf('## Phase A')];
  assert.ok(order.every((v) => v !== -1) && order.every((v, i) => i === 0 || v > order[i - 1]), `P3 (secrecy), P4, P5 and Phase A must appear in that order: ${order}`);
});

test('AC-28: the archive moves the model, its review log, the scripts and the configuration with mv, and never moves, copies, reads or prints a session, credential, storage-state or token file, nor anything outside the kit directory', () => {
  const p5 = collapse(section(read(SETUP), '### P5', '## Phase A'));
  assertPins(p5, [
    ['what moves', 'the model, its review log, every `login-*.mjs` script and `login.config.json`'],
    ['move, not copy', 'Move (with `mv`, never copy-then-keep)'],
    ['only when present', 'each only when it exists'],
    ['secret files untouched', 'Never move, copy, read or print any other file of the ignored directory, any credential file, or any session, storage-state or token file'],
    ['inside the kit only', 'archive nothing outside the kit directory'],
  ]);
  // The only command the archive step runs is the clock capture: no cp, cat, rm or mv is spelled as a command.
  const fenced = [...section(read(SETUP), '### P5', '## Phase A').matchAll(/```bash\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  assert.deepEqual(fenced, ['date -u +%Y%m%dT%H%M%SZ']);
  const constraints = collapse(section(read(SETUP), '## Constraints (hard rules)', '## What you do NOT do'));
  assert.ok(
    constraints.includes('With `--fresh`, existing kit files are relocated into the P5 archive directory, not rewritten.'),
    'the constraints must describe the archive as a relocation',
  );
});

test('AC-28: --fresh is the one exception to the already-APPROVED halt (whose text is unchanged) and the new DRAFT still needs its own explicit approval', () => {
  const text = read(SETUP);
  const p4 = collapse(section(text, '### P4', '### P5'));
  const freshAt = p4.indexOf('If `--fresh` was given, run P5 and then run Phase A as if no model existed.');
  const approvedAt = p4.indexOf('If it ends with `*Status: APPROVED*`, HALT:');
  assert.ok(freshAt !== -1 && approvedAt !== -1 && freshAt < approvedAt, 'the --fresh branch must be evaluated before the APPROVED halt');
  assert.ok(p4.includes('This is the one exception to the halt below.'));
  const p4Unquoted = collapse(section(text, '### P4', '### P5').replace(/^\s*> ?/gm, ''));
  assertPins(p4Unquoted, [
    ['halt text kept', 'FAILED_AUTH_MODEL_ALREADY_APPROVED: `PRPs/auth/auth-model.md` is already APPROVED. To re-author it, hand-edit its trailing `*Status:*` line back to `DRAFT` and re-run `/relay-auth-setup`.'],
  ]);
  const p5 = collapse(section(text, '### P5', '## Phase A'));
  assertPins(p5, [
    ['proceeds from scratch', '`--fresh` then proceeds as if no model existed.'],
    ['fresh approval', 'The new DRAFT still needs its own fresh, explicit approval in Phase B.'],
    ['hand-written script stale', 'A login script that carries no template identity counts as stale; once the new model is approved, `/relay-auth-scripts --refresh` replaces a hand-written script.'],
  ]);
});

test('AC-28: without --fresh, an existing DRAFT model offers a choice (asked once) between reviewing it and re-running the writer, and the re-run archives only the DRAFT and its review log first', () => {
  const p4 = collapse(section(read(SETUP), '### P4', '### P5'));
  assertPins(p4, [
    ['draft branch', 'If it is a DRAFT, skip Phase A and go straight to Phase B. Without `--fresh`, first ask the user once whether to review the existing DRAFT (the default, as before) or to re-run the writer;'],
    ['re-run archives the draft first', 'choosing the re-run archives the DRAFT model and its review log by the P5 move and then runs Phase A instead.'],
  ]);
  const p5 = collapse(section(read(SETUP), '### P5', '## Phase A'));
  assertPins(p5, [['scope of the re-run move', 'for the DRAFT re-run choice above, which moves only the DRAFT model and its review log']]);
});

// ---------------------------------------------------------------------------
// AC-24 / AC-22 / AC-26: /relay-auth-scripts riders
// ---------------------------------------------------------------------------

test('AC-24: /relay-auth-scripts accepts --refresh (hint, argument list, usage, example)', () => {
  const text = read(SCRIPTS);
  assert.match(text, /^argument-hint: .*--refresh.*$/m);
  assertPins(collapse(text), [
    ['argument list', '`--refresh` — optional; regenerates the selected roles\' existing scripts from the installed template'],
    ['usage line', 'Usage: `/relay-auth-scripts [--role <role>]... [--refresh]`'],
    ['example', 'Example: `/relay-auth-scripts --role admin --refresh`'],
  ]);
});

test('AC-24: --refresh regenerates every selected script from the installed template by the single substitution, adds only new fields as null, never changes a set key, and never touches a session, token or credential file; without it a script is skipped and reported stale or not', () => {
  const flat = collapse(read(SCRIPTS));
  assertPins(flat, [
    ['single substitution kept', 'replacing every occurrence of `__RELAY_ROLE__` with the slug — no other substitution and no edit'],
    ['stamp copied', "The template's identity stamp line (`KIT_TEMPLATE_ID`) is copied with it."],
    ['skip and report staleness', 'Without `--refresh`, an existing script is skipped and reported, never overwritten, and the report says, per skipped script, whether its stamp line differs from the installed template\'s or is absent (stale).'],
    ['regenerate and overwrite', "With `--refresh`, every selected role's script is regenerated from the installed template by the same single substitution and overwrites the existing file, each replaced script being reported."],
    ['only new fields, as null', 'adds to the configuration only the fields a newer template introduces (`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them, and `mint`, written as the proposed block described above for a role whose `mechanism` is already `minted` and as `null` for every other role) on roles that lack them'],
    ['no existing key changed', 'no key that already exists, including a `TBD - needs validation` value, is ever changed'],
    ['secrets untouched', 'It never touches a session, a token, `credentials.json` or `credentials.example.json`.'],
    ['overwrite rule', 'Overwrite an existing role entry, or an existing script without `--refresh`.'],
    ['written set unchanged', '**The only files written** are `PRPs/auth/login.config.json`, `PRPs/auth/login-<role>.mjs` and `PRPs/auth/credentials.example.json`.'],
  ]);
});

test('AC-22 / AC-26: the generator writes the HTTP probe as JSON null only when a browser probe is filled and no same-origin endpoint is stated, and maxAgeMinutes null only when the model says the token does not expire', () => {
  const flat = collapse(read(SCRIPTS));
  assertPins(flat, [
    ['null probe', 'When a browser probe is filled and the model states no protected endpoint on the application\'s own origin, the HTTP `probe` is written as the JSON value `null`, never `TBD - needs validation`;'],
    ['TBD otherwise', 'when neither a probe nor an endpoint is stated it stays `TBD - needs validation`.'],
    ['null age', 'When the model states the token does not expire, `maxAgeMinutes: null` is written'],
    ['re-proven', '(the script then re-proves the token on every reuse)'],
    ['other roles', 'any other role requires a positive `maxAgeMinutes`, and an unstated value stays `TBD - needs validation`'],
  ]);
});

test('AC-24 / AC-25 / AC-27 / AC-29: /relay-auth-scripts names the new halts and writes authenticatesAnonymous only with file:line evidence', () => {
  const flat = collapse(read(SCRIPTS));
  for (const code of ['FAILED_PROBE_MARKER_ABSENT', 'FAILED_KIT_SCRIPT_STALE', 'FAILED_TOKEN_REJECTED', 'FAILED_TOKEN_TRANSPORT', 'FAILED_TOKEN_PLACEMENT']) {
    assert.ok(flat.includes(code), `${code} must be documented beside the generated script's halts`);
  }
  assertPins(flat, [
    ['record shape', '`authenticatesAnonymous` is written only when `## Login Flow` records a pre-authenticated target for the role'],
    ['evidence mandatory', 'the evidence being mandatory (a record with no `file:line` is written as `TBD - needs validation`). Otherwise it is `null`.'],
  ]);
});
