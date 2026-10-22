// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-1 Stable snapshot or a named failure
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-2 Inline text becomes a candidate
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-18 The command doc and the usage text match the script
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-6 Every non-executed case carries a catalogued code (the doc half carried over from phase 1: no case is left without an entry)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-14 Untouched surfaces (the runner keeps no static sibling import)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-15 New request sites stay local (ground keeps its guard call first; the stable wait adds no request site)
/**
 * Phase 2 (stable grounding and text candidates) of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-2-stable-grounding-and-text-candidates.plan.md
 *
 * Layers, all against the REAL runner, contract check and command doc (never edited):
 *   1. waitForStableSnapshot with an injected fake clock: an equal pair ends the wait, an unreadable read resets
 *      the pair, a page that never repeats is bounded, an unreadable first read is unavailable. No browser.
 *   2. parseAriaSnapshot: the three inline line forms, the candidates produced before the change unchanged and
 *      in order, the double-quoted YAML scalar form Playwright emits, and the independent caps.
 *   3. The usage text (--help, no mode, a bare ground) and the command doc the planner reads.
 *   4. The extended qa-run-contract check (requireGround): each rule is proven by mutating the real runner or the
 *      real doc, so none can pass because a fixture never contained the token.
 *   5. The real runner as a child process with a real Chromium, against a loopback page: a page that renders
 *      after load is snapshotted only once settled, a page that never settles ends GROUND_UNSTABLE with nothing
 *      written, and paragraph, list-item and cell text reaches the snapshot file with real match counts.
 *
 * Browser tests resolve Playwright through a junction to the repository node_modules (cwd is a temp root).
 * Exactly one test waits out the whole bound of a never-settling page (about 25 s by design); every other
 * proof of the bound uses the injected clock.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, symlinkSync, unlinkSync, rmdirSync, utimesSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

import {
  waitForStableSnapshot,
  GROUND_POLL_INTERVAL_MS,
  GROUND_STABLE_BOUND_MS,
  parseAriaSnapshot,
  precheckGroundedSteps,
  USAGE,
} from '../../../plugins/relay/scripts/qa-run.mjs';
import { checkQaRunContract } from './qa-run-contract.mjs';

const NODE = process.execPath;
// ABSOLUTE: the fixtures spawn with cwd set to a temp root, so a relative script path would not resolve.
const REAL_RUNNER = resolve('plugins/relay/scripts/qa-run.mjs');
const NODE_MODULES = resolve('node_modules');
const SLOW = { timeout: 170000 };
const RUN_REL = 'PRPs/reports/f/qa-run/r1';

const SCRIPT = readFileSync(REAL_RUNNER, 'utf8').replace(/\r\n/g, '\n');
const COMMAND = readFileSync(resolve('plugins/relay/commands/relay-qa-run.md'), 'utf8').replace(/\r\n/g, '\n');
/** @param {string} text */
const collapse = (text) => text.replace(/\s+/g, ' ');
const FLAT = collapse(COMMAND);
/** @type {string[]} temp directories to remove after the file ran */
const temps = [];

// ---------------------------------------------------------------------------
// 1. waitForStableSnapshot, driven by an injected clock
// ---------------------------------------------------------------------------

/**
 * A reader that yields the given values in order and then repeats the last one. An Error value is thrown.
 * @param {...any} values
 */
function scripted(...values) {
  let calls = 0;
  return {
    read: async () => {
      const v = values[Math.min(calls, values.length - 1)];
      calls++;
      if (v instanceof Error) throw v;
      return v;
    },
    calls: () => calls,
  };
}

/**
 * Runs the wait with a fake clock: a sleep advances time and a read costs nothing.
 * @param {() => Promise<any>} read
 * @param {{ boundMs?: number, intervalMs?: number }} [opts]
 */
async function settle(read, opts = {}) {
  let t = 0;
  /** @type {number[]} */ const sleeps = [];
  const result = await waitForStableSnapshot(read, {
    ...opts,
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
  });
  return { result: /** @type {any} */ (result), elapsed: t, sleeps };
}

test('AC-1 the polling interval and the bound are exported whole milliseconds and the bound leaves room for an equal pair', () => {
  assert.ok(Number.isInteger(GROUND_POLL_INTERVAL_MS) && GROUND_POLL_INTERVAL_MS > 0, String(GROUND_POLL_INTERVAL_MS));
  assert.ok(Number.isInteger(GROUND_STABLE_BOUND_MS), String(GROUND_STABLE_BOUND_MS));
  assert.ok(GROUND_STABLE_BOUND_MS >= 2 * GROUND_POLL_INTERVAL_MS, 'a bound shorter than two intervals can never certify a pair');
});

test('AC-1 two equal first reads end the wait after exactly one interval and return that snapshot', async () => {
  const s = scripted('a', 'a');
  const { result, elapsed, sleeps } = await settle(s.read);
  assert.equal(result.status, 'stable');
  assert.equal(result.yaml, 'a');
  assert.equal(result.reads, 2);
  assert.deepEqual(sleeps, [GROUND_POLL_INTERVAL_MS], 'an equal pair certifies one full interval without a change');
  assert.equal(elapsed, GROUND_POLL_INTERVAL_MS);
  assert.equal(s.calls(), 2);
});

test('AC-1 a page that changes and then holds is returned as the value that repeated, never the first paint', async () => {
  const first = await settle(scripted('a', 'b', 'b').read);
  assert.equal(first.result.status, 'stable');
  assert.equal(first.result.yaml, 'b');
  assert.equal(first.result.reads, 3);
  const staged = await settle(scripted('skeleton', 'half', 'most', 'full', 'full').read);
  assert.equal(staged.result.status, 'stable');
  assert.equal(staged.result.yaml, 'full');
  assert.equal(staged.result.reads, 5);
});

test('AC-1 an unreadable read between two equal values resets the pair: a rejection, null or a non-string never counts as equal', async () => {
  for (const unreadable of [null, undefined, 42, new Error('boom')]) {
    const label = unreadable instanceof Error ? 'a rejection' : String(unreadable);
    const { result } = await settle(scripted('a', unreadable, 'a', 'a').read);
    assert.equal(result.status, 'stable', label);
    assert.equal(result.yaml, 'a', label);
    assert.equal(result.reads, 4, `${label}: the two a reads around the unreadable one are not consecutive`);
  }
});

test('AC-1 two consecutive unreadable reads are not an equal pair', async () => {
  const { result } = await settle(scripted('a', null).read);
  assert.equal(result.status, 'unstable');
  assert.equal(Object.hasOwn(result, 'yaml'), false, 'an unstable result carries no snapshot to plan from');
});

test('AC-1 a page that never repeats ends unstable within the bound, carries no snapshot and names the number of reads', async () => {
  let n = 0;
  const { result, elapsed, sleeps } = await settle(async () => `v${n++}`);
  assert.equal(result.status, 'unstable');
  assert.equal(Object.hasOwn(result, 'yaml'), false);
  assert.ok(elapsed <= GROUND_STABLE_BOUND_MS, `the wait ran ${elapsed} ms against a bound of ${GROUND_STABLE_BOUND_MS}`);
  assert.ok(sleeps.every((ms) => ms === GROUND_POLL_INTERVAL_MS));
  const mostReads = Math.floor(GROUND_STABLE_BOUND_MS / GROUND_POLL_INTERVAL_MS) + 1;
  assert.ok(result.reads >= 2 && result.reads <= mostReads, `${result.reads} reads against at most ${mostReads}`);
  assert.equal(result.reads, n, 'the reported number of reads is the number of reads taken');
});

test('AC-1 an equal pair completing on the last read the bound allows is accepted, and one that needs a later read is not', async () => {
  const lastRead = Math.floor(GROUND_STABLE_BOUND_MS / GROUND_POLL_INTERVAL_MS) + 1;
  const distinct = Array.from({ length: lastRead - 1 }, (_, i) => `v${i}`);

  const onTime = await settle(scripted(...distinct, distinct[distinct.length - 1]).read);
  assert.equal(onTime.result.status, 'stable', 'the pair completes within the bound');
  assert.equal(onTime.result.reads, lastRead);
  assert.ok(onTime.elapsed <= GROUND_STABLE_BOUND_MS);

  const tooLate = await settle(scripted(...distinct, `v${lastRead - 1}`, `v${lastRead}`, `v${lastRead}`).read);
  assert.equal(tooLate.result.status, 'unstable', 'a pair that would complete after the bound is a named failure, not a late success');
  assert.ok(tooLate.elapsed <= GROUND_STABLE_BOUND_MS);
});

test('AC-1 an unreadable first read ends at once as unavailable, with no sleep, and a rejecting first read never throws out of the wait', async () => {
  for (const first of [null, undefined, 42, {}, new Error('boom')]) {
    const s = scripted(first, 'a', 'a');
    const { result, elapsed, sleeps } = await settle(s.read);
    assert.equal(result.status, 'unavailable', String(first));
    assert.equal(Object.hasOwn(result, 'yaml'), false);
    assert.equal(elapsed, 0, 'an unavailable snapshot does not wait');
    assert.deepEqual(sleeps, []);
    assert.equal(s.calls(), 1);
  }
});

test('AC-1 the interval and the bound can be narrowed: the wait never sleeps past the bound it was given', async () => {
  let n = 0;
  const narrow = await settle(async () => `v${n++}`, { boundMs: 3000, intervalMs: 500 });
  assert.equal(narrow.result.status, 'unstable');
  assert.ok(narrow.elapsed <= 3000);
  assert.ok(narrow.sleeps.length > 0 && narrow.sleeps.every((ms) => ms === 500));

  const pairs = await settle(scripted('a', 'a').read, { boundMs: 3000, intervalMs: 500 });
  assert.equal(pairs.result.status, 'stable');
  assert.deepEqual(pairs.sleeps, [500]);

  // A bound shorter than one interval leaves no time for a second read: no pair can appear, so it is unstable.
  const tiny = await settle(scripted('a', 'a').read, { boundMs: 400, intervalMs: 1000 });
  assert.equal(tiny.result.status, 'unstable');
  assert.ok(tiny.elapsed <= 400);
});

test('AC-1 with no injected clock the wait uses real timers and still settles or gives up within the bound', async () => {
  const t0 = performance.now();
  const settled = await waitForStableSnapshot(scripted('a', 'a').read, { intervalMs: 5, boundMs: 2000 });
  assert.equal(settled.status, 'stable');
  let n = 0;
  const unstable = await waitForStableSnapshot(async () => `v${n++}`, { intervalMs: 5, boundMs: 60 });
  assert.equal(unstable.status, 'unstable');
  assert.equal(Object.hasOwn(unstable, 'yaml'), false);
  assert.ok(performance.now() - t0 < 5000, 'a 60 ms bound must not run for seconds');
});

// ---------------------------------------------------------------------------
// 2. parseAriaSnapshot: inline text candidates
// ---------------------------------------------------------------------------

// Lines the parser already turned into candidates (or refused) before this phase.
const LEGACY = [
  '- banner:',
  '  - link "home":',
  '    - /url: /x',
  '- heading "Panel" [level=1]',
  '- button "Save"',
  '- textbox "Nick"',
  '- text: Hello there',
  '- text: "Quoted: value"',
  '- banana "Not a role"',
  '- button ""',
  '- cell "Named cell"',
  String.raw`- img "Logo \"big\""`,
];
// The forms of this phase, as Playwright serializes them, then the three that must yield nothing.
const ADDED_WANTED = [
  ['- paragraph: Registration details', 'Registration details'],
  ['- listitem: Full name', 'Full name'],
  ['- cell: 2026-10-01', '2026-10-01'],
  ['- paragraph: "Name: Ana"', 'Name: Ana'],
  ['- cell: "42"', '42'],
  [String.raw`- paragraph: "Say: \"hi\""`, 'Say: "hi"'],
  [String.raw`- cell: C:\dir "x"`, 'C:\\dir "x"'],
];
const ADDED_REFUSED = [
  String.raw`- cell: "a\nb"`, // an escape the exact matcher cannot reproduce
  '- paragraph:', // no value
  '- paragraph:   ', // a blank value
  '- cell: ""', // an empty quoted value
  '- cell: "unterminated', // an unterminated quote
];

test('AC-2 the PRD lines each yield one text candidate with exactly that content', () => {
  assert.deepEqual(parseAriaSnapshot('- paragraph: Informações cadastrais'), [{ kind: 'text', text: 'Informações cadastrais' }]);
  assert.deepEqual(parseAriaSnapshot('- listitem: Nome completo'), [{ kind: 'text', text: 'Nome completo' }]);
  assert.deepEqual(parseAriaSnapshot('- cell: 2026-10-01'), [{ kind: 'text', text: '2026-10-01' }]);
});

test('AC-2 every candidate the parser produced before this phase is unchanged and keeps its relative order, and exactly the new text candidates are added', () => {
  const base = parseAriaSnapshot(LEGACY.join('\n'));
  assert.ok(base.length >= 7, `the legacy fixture should yield candidates: ${JSON.stringify(base)}`);
  assert.ok(base.some((c) => c.kind === 'text' && c.text === '"Quoted: value"'), 'a quoted `- text:` value stays verbatim, quotes included');

  const mixedLines = [...LEGACY.slice(0, 4), ...ADDED_WANTED.map(([line]) => line), ...ADDED_REFUSED, ...LEGACY.slice(4)];
  const mixed = parseAriaSnapshot(mixedLines.join('\n'));

  let at = -1;
  for (const c of base) {
    const i = mixed.findIndex((m) => JSON.stringify(m) === JSON.stringify(c));
    assert.ok(i !== -1, `a candidate produced before this phase was lost: ${JSON.stringify(c)}`);
    assert.ok(i > at, `a candidate produced before this phase was reordered: ${JSON.stringify(c)}`);
    at = i;
  }
  const baseKeys = new Set(base.map((c) => JSON.stringify(c)));
  const added = mixed.filter((c) => !baseKeys.has(JSON.stringify(c)));
  assert.deepEqual(
    added,
    ADDED_WANTED.map(([, text]) => ({ kind: 'text', text })),
  );
});

test('AC-2 the inline forms read indented and CRLF snapshots, trim the value and yield nothing for a blank, unsupported-escape or unterminated one', () => {
  assert.deepEqual(parseAriaSnapshot('- main:\r\n  - paragraph: Deep text\r\n'), [{ kind: 'text', text: 'Deep text' }]);
  assert.deepEqual(parseAriaSnapshot('- cell: 2026-10-01   '), [{ kind: 'text', text: '2026-10-01' }]);
  for (const line of ADDED_REFUSED) assert.deepEqual(parseAriaSnapshot(line), [], line);
});

test('AC-2 a plain inline value that carries a backslash or quotes after its first character is kept verbatim, and only a leading quote is unquoted', () => {
  assert.deepEqual(parseAriaSnapshot(String.raw`- paragraph: C:\temp\file`), [{ kind: 'text', text: String.raw`C:\temp\file` }]);
  assert.deepEqual(parseAriaSnapshot('- paragraph: Say "hi" twice'), [{ kind: 'text', text: 'Say "hi" twice' }]);
  assert.deepEqual(parseAriaSnapshot(String.raw`- paragraph: "back\\slash"`), [{ kind: 'text', text: String.raw`back\slash` }]);
});

test('AC-2 an inline value of 200 characters is kept and one of 201 is dropped, as for a `- text:` line', () => {
  assert.deepEqual(parseAriaSnapshot(`- paragraph: ${'x'.repeat(201)}`), []);
  assert.equal(parseAriaSnapshot(`- paragraph: ${'x'.repeat(200)}`).length, 1);
  assert.deepEqual(parseAriaSnapshot(`- text: ${'x'.repeat(201)}`), [], 'the legacy limit is unchanged');
});

test('AC-2 equal text is one candidate whichever line form carried it', () => {
  assert.equal(parseAriaSnapshot('- cell: 2026-10-01\n- cell: 2026-10-01').length, 1);
  assert.deepEqual(parseAriaSnapshot('- text: Same words\n- paragraph: Same words\n- listitem: Same words'), [{ kind: 'text', text: 'Same words' }]);
});

test('AC-2 the inline candidates have their own cap: a long table never displaces a button before or after it, and the legacy cap of 300 is unchanged', () => {
  const buttons = Array.from({ length: 400 }, (_, i) => `- button "B${i}"`);
  const cells = Array.from({ length: 400 }, (_, i) => `- cell: c${i}`);
  assert.equal(parseAriaSnapshot(buttons.join('\n')).length, 300, 'the legacy cap changed');
  assert.equal(parseAriaSnapshot(cells.join('\n')).length, 300, 'the inline cap is not 300');
  const firstThreeHundred = buttons.slice(0, 300).map((_, i) => `B${i}`);
  for (const [label, lines] of /** @type {[string, string[]][]} */ ([
    ['cells before buttons', [...cells, ...buttons]],
    ['buttons before cells', [...buttons, ...cells]],
  ])) {
    const got = parseAriaSnapshot(lines.join('\n'));
    assert.equal(got.length, 600, label);
    const roleNames = got.flatMap((c) => (c.kind === 'role' ? [c.name] : []));
    assert.deepEqual(roleNames, firstThreeHundred, `${label}: inline candidates displaced a role-and-name candidate`);
    assert.equal(got.filter((c) => c.kind === 'text').length, 300, label);
  }
});

// PRD AC-6: an empty report grounds nothing, so a 0- or 2-match entry is PLAN_ENTRY_INVALID.
test('AC-2 a step is planned from an inline candidate only when the snapshot counted exactly one element: zero or several is PLAN_ENTRY_INVALID', () => {
  const [candidate] = parseAriaSnapshot('- paragraph: Informações cadastrais');
  assert.ok(candidate && candidate.kind === 'text');
  const snapshotWith = (/** @type {number} */ matches) => ({ schema_version: 1, role: 'admin', route: '/perfil', entries: [{ ...candidate, matches }], withheld: 0 });
  const steps = [
    { action: 'goto', path: '/perfil' },
    { action: 'expect_visible', text: 'Informações cadastrais' },
  ];
  assert.equal(precheckGroundedSteps(steps, [snapshotWith(1)], '', 'admin'), null);
  for (const matches of [0, 2]) {
    const refusal = precheckGroundedSteps(steps, [snapshotWith(matches)], '', 'admin');
    assert.equal(refusal?.code, 'PLAN_ENTRY_INVALID', `matches ${matches}`);
    assert.match(String(refusal?.reason), new RegExp(`${matches} elements`));
    assert.equal(String(refusal?.reason).includes('Informações'), false, 'a reason never echoes the locator text');
  }
});

// ---------------------------------------------------------------------------
// 3. The usage text and the command doc (AC-18)
// ---------------------------------------------------------------------------

const GROUND_FLAGS = ['--root <dir>', '--feature <slug>', '--run-dir <rel-dir>', '--route </path>', '[--role <slug>]', '[--env-handle <path>]'];

test('AC-18 the exported usage text lists the ground mode with its six flags and keeps the four lines it had', () => {
  const groundLine = USAGE.split('\n').find((l) => l.includes('qa-run.mjs ground'));
  assert.ok(groundLine, 'USAGE does not list the ground mode');
  for (const flag of GROUND_FLAGS) assert.ok(groundLine.includes(flag), `the ground usage line lacks ${flag}`);
  for (const kept of ['qa-run.mjs parse --report <path>', 'qa-run.mjs init ', 'qa-run.mjs run ', 'qa-run.mjs --help']) {
    assert.ok(USAGE.includes(kept), `USAGE lost the line of ${kept.trim()}`);
  }
});

test('AC-18 --help prints that usage text and exits 0, and a run with no mode prints it and exits 2', () => {
  const help = spawnSync(NODE, [REAL_RUNNER, '--help'], { encoding: 'utf8', windowsHide: true });
  assert.equal(help.status, 0, help.stderr);
  assert.equal(help.stdout, USAGE);
  for (const flag of GROUND_FLAGS) assert.ok(help.stdout.includes(flag), `--help lacks ${flag}`);

  const bare = spawnSync(NODE, [REAL_RUNNER], { encoding: 'utf8', windowsHide: true });
  assert.equal(bare.status, 2);
  assert.equal(bare.stderr, USAGE);
});

test('AC-18 a bare ground and a route the shell rewrote exit 2 with the ground usage line and the Git Bash cause, and write nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'relay-qastable-args-'));
  temps.push(root);
  const variants = [
    ['ground'],
    // What Git Bash hands the script for `--route "/perfil"` without MSYS_NO_PATHCONV=1: a Windows path.
    ['ground', '--root', root, '--feature', 'f', '--run-dir', RUN_REL, '--route', 'C:/Program Files/Git/perfil'],
  ];
  for (const args of variants) {
    const r = spawnSync(NODE, [REAL_RUNNER, ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
    const where = JSON.stringify([args.slice(0, 1), r.status, r.stderr]);
    assert.equal(r.status, 2, where);
    assert.equal(r.stdout, '', where);
    assert.ok(r.stderr.includes('Usage:'), where);
    for (const flag of GROUND_FLAGS) assert.ok(r.stderr.includes(flag), `${where}: lacks ${flag}`);
    assert.ok(r.stderr.includes('MSYS_NO_PATHCONV=1'), `the usage text does not name the Git Bash cause: ${where}`);
  }
  assert.deepEqual(readdirSync(root), [], 'a refused ground wrote something');
});

test('AC-18 the planning doc documents the Git Bash path conversion next to the ground command: the variable, the leading-slash route and the shells that need nothing', () => {
  const at = COMMAND.indexOf('qa-run.mjs" ground --root');
  assert.ok(at !== -1, 'the ground command line is missing');
  const note = COMMAND.indexOf('`MSYS_NO_PATHCONV=1`');
  assert.ok(note > at, 'the Git Bash note must follow the ground command');
  assert.ok(note - at < 1500, 'the Git Bash note must sit with the ground command, not elsewhere in the doc');
  const near = collapse(COMMAND.slice(at, note + 400));
  assert.match(near, /Git Bash/);
  assert.match(near, /leading-slash/);
  assert.match(near, /--route "\/perfil"/);
  assert.match(near, /PowerShell/);
  assert.match(near, /POSIX/);
});

test('AC-1 AC-18 the planning doc states the stability contract the script implements: two equal successive snapshots, the constants in seconds, the named halt and no snapshot file', () => {
  const section = collapse(COMMAND.slice(COMMAND.indexOf('Grounding browser steps.'), COMMAND.indexOf('The closed vocabulary.')));
  assert.ok(section.length > 100, 'the ground section was not found');
  assert.ok(section.includes('two successive accessibility snapshots'));
  assert.ok(section.includes(`${GROUND_POLL_INTERVAL_MS / 1000} second apart`), 'the interval in the doc does not follow GROUND_POLL_INTERVAL_MS');
  assert.ok(section.includes(`${GROUND_STABLE_BOUND_MS / 1000} seconds`), 'the bound in the doc does not follow GROUND_STABLE_BOUND_MS');
  assert.match(section, /never settles/);
  assert.match(section, /`GROUND_UNSTABLE`, a non-zero exit and no snapshot file/);
  assert.match(section, /for example `FAILED_PLAYWRIGHT_UNAVAILABLE`.*`GROUND_UNSTABLE`/, 'the halt is not listed among the halts the planner relays');
});

test('AC-2 the planning doc tells the planner that paragraph, list-item and cell text is a text entry that must still match exactly one element', () => {
  const groundSection = collapse(COMMAND.slice(COMMAND.indexOf('Grounding browser steps.'), COMMAND.indexOf('The closed vocabulary.')));
  const rules = collapse(COMMAND.slice(COMMAND.indexOf('Grounding rules.'), COMMAND.indexOf('Personal data.')));
  assert.ok(groundSection.length > 100, 'the ground section was not found');
  assert.ok(rules.length > 100, 'the grounding rules were not found');
  assert.match(groundSection, /visible-text entries include the text of paragraph, list-item,? (?:and|or) cell lines/);
  assert.match(rules, /text entry may come from a paragraph, list-item,? (?:and|or) cell line of the snapshot/);
  assert.match(rules, /exactly one element/);
});

test('AC-6 the planning doc no longer tells the planner to leave a halted route to the script: every case still gets a declining entry with a catalogued code', () => {
  assert.equal(FLAT.includes('leave the case to the script'), false);
  const section = collapse(COMMAND.slice(COMMAND.indexOf('Grounding browser steps.'), COMMAND.indexOf('The closed vocabulary.')));
  assert.match(section, /declining entry/);
  assert.match(section, /never leaves a case without an entry/);
  assert.ok(section.includes('`STEP_UNGROUNDED`'));
  assert.ok(section.includes('`UNGROUNDABLE_AFTER_INTERACTION`'));
});

test('AC-6 the record-resolution section states the one-entry-per-case rule and no longer says a plan entry is not written for such a case', () => {
  const start = COMMAND.indexOf('### Record resolution');
  const end = COMMAND.indexOf('- The outcome comes from the JUnit testcases');
  assert.ok(start !== -1 && end > start, 'the record-resolution section was not found');
  const section = collapse(COMMAND.slice(start, end));
  assert.equal(section.includes('You write no plan entry for this'), false);
  assert.equal(FLAT.includes('You write no plan entry for this'), false);
  assert.match(section, /still write the one entry per case/);
  assert.match(section, /the entry decides nothing about the outcome/);
  assert.match(section, /only its `class` and `objective_steps` are still read/);
});

// ---------------------------------------------------------------------------
// 4. The extended qa-run-contract check (requireGround)
// ---------------------------------------------------------------------------

/**
 * @param {string} src the real text
 * @param {string} token the token to replace everywhere (it must occur at least once, so a mutation is never a no-op)
 * @param {string} replacement
 */
function replaceAll(src, token, replacement) {
  assert.ok(src.includes(token), `mutation token not present: ${token}`);
  return src.split(token).join(replacement);
}
/** @param {Record<string, any>} [over] */
const ground = (over = {}) => checkQaRunContract({ scriptText: SCRIPT, commandText: COMMAND, results: [], requireGround: true, ...over });
/** @param {{ findings: { message: string }[] }} r @param {string} part */
const named = (r, part) => r.findings.filter((f) => f.message.includes(part));

test('AC-18 with the ground rules required, the real runner and the real command doc produce no finding', () => {
  const r = ground();
  assert.deepEqual(r.findings, []);
  assert.equal(r.ok, true);
});

test('AC-18 a runner header that lost the ground usage line is flagged once', () => {
  const r = ground({ scriptText: replaceAll(SCRIPT, 'qa-run.mjs ground --root', 'qa-run.mjs gone --root') });
  assert.equal(r.ok, false);
  assert.equal(named(r, 'header must list the ground mode usage line').length, 1, JSON.stringify(r.findings));
});

test('AC-1 a runner script that lost the named halt GROUND_UNSTABLE is flagged once naming it', () => {
  const r = ground({ scriptText: replaceAll(SCRIPT, 'GROUND_UNSTABLE', 'GROUND_STABLE_X') });
  assert.equal(r.ok, false);
  assert.equal(named(r, 'GROUND_UNSTABLE').length, 1, JSON.stringify(r.findings));
});

test('AC-1 a ground mode that waits on a load state again is flagged, while the same call elsewhere in the file is not', () => {
  const inGround = ground({ scriptText: replaceAll(SCRIPT, 'async function runGroundGuarded(', '// await page.waitForLoadState("networkidle")\nasync function runGroundGuarded(') });
  assert.equal(inGround.ok, false);
  assert.equal(named(inGround, 'waitForLoadState(').length, 1, JSON.stringify(inGround.findings));
  const elsewhere = ground({ scriptText: `${SCRIPT}\nawait page.waitForLoadState('load');\n` });
  assert.deepEqual(elsewhere.findings, [], 'the anonymous check keeps its own settle aid: only the ground mode is pinned');
});

test('AC-18 a doc that lost the Git Bash note, the halt, the interval or the bound is flagged once per missing token, naming it', () => {
  const interval = `${GROUND_POLL_INTERVAL_MS / 1000} second apart`;
  const bound = `${GROUND_STABLE_BOUND_MS / 1000} seconds`;
  for (const token of ['MSYS_NO_PATHCONV=1', 'GROUND_UNSTABLE', interval, bound]) {
    const r = ground({ commandText: replaceAll(COMMAND, token, 'REMOVED_TOKEN') });
    assert.equal(r.ok, false, token);
    assert.equal(named(r, token).length, 1, `${token}: ${JSON.stringify(r.findings)}`);
  }
  // A doc whose numbers disagree with the exported constants is the drift the pin exists for.
  const drift = ground({ commandText: replaceAll(COMMAND, bound, '5 minutes') });
  assert.equal(drift.ok, false);
  assert.equal(named(drift, bound).length, 1);
});

test('AC-18 a doc with none of the ground tokens yields one finding per token and no finding that borrows another rule\'s wording', () => {
  const r = ground({ commandText: 'HUMAN GATE STILL OPEN FAILED_NON_LOCAL_TARGET qa-run.mjs' });
  const interval = `${GROUND_POLL_INTERVAL_MS / 1000} second apart`;
  const bound = `${GROUND_STABLE_BOUND_MS / 1000} seconds`;
  assert.equal(r.findings.length, 4, JSON.stringify(r.findings));
  for (const token of ['GROUND_UNSTABLE', 'MSYS_NO_PATHCONV=1', interval, bound]) assert.equal(named(r, token).length, 1, token);
  for (const f of r.findings) {
    assert.equal(f.message.includes('is outside the closed vocabulary'), false, f.message);
    assert.equal(f.message.includes('step example'), false, f.message);
  }
});

test('AC-18 the ground rules fire only for a caller that opts in: the same mutated runner and doc are silent without the flag', () => {
  const quiet = checkQaRunContract({
    scriptText: replaceAll(SCRIPT, 'GROUND_UNSTABLE', 'GROUND_STABLE_X'),
    commandText: replaceAll(COMMAND, 'MSYS_NO_PATHCONV=1', 'MSYS_GONE'),
    results: [],
  });
  assert.deepEqual(quiet.findings, []);
});

// ---------------------------------------------------------------------------
// 5. The plan's invariants this phase must not disturb
// ---------------------------------------------------------------------------

test('AC-14 the runner keeps no static import of a sibling file: the copy-helper tests copy only the runner and the guard', () => {
  assert.equal(/^import\s[^;]*from\s+['"]\.\.?\//m.test(SCRIPT), false, 'qa-run.mjs gained a static relative import');
  assert.equal(/^export\s[^;]*from\s+['"]\.\.?\//m.test(SCRIPT), false, 'qa-run.mjs gained a relative re-export');
});

// ---------------------------------------------------------------------------
// 6. The real runner with a real browser
// ---------------------------------------------------------------------------

/**
 * A temp project root with a declared local target; `withBrowser` links the repository node_modules so the
 * runner can resolve Playwright, exactly as the existing grounding tests do.
 * @param {string} baseUrl
 * @param {boolean} [withBrowser]
 */
function groundRoot(baseUrl, withBrowser = true) {
  const root = mkdtempSync(join(tmpdir(), 'relay-qastable-'));
  temps.push(root);
  if (withBrowser) symlinkSync(NODE_MODULES, join(root, 'node_modules'), 'junction');
  const runDir = join(root, ...RUN_REL.split('/'));
  mkdirSync(runDir, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ baseUrl, roles: {} }));
  return { root, runDir };
}
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
/** @param {string} root @param {string[]} extra */
const runGround = (root, extra) => runNode(['ground', '--root', root, '--feature', 'f', '--run-dir', RUN_REL, ...extra], root);

// A page that renders its content a little after `load`, but within one polling interval, so the first read
// sees a heading only and the settled page holds the heading and sixty buttons.
const SETTLE_DELAY_MS = Math.round(GROUND_POLL_INTERVAL_MS * 0.8);
const HEAD = '<!doctype html><html><head><meta charset="utf-8"></head><body>';
const SETTLES = `${HEAD}<h1>Panel</h1><div id="app"></div><script>setTimeout(function () { var h = ""; for (var i = 0; i < 60; i++) h += "<button>B" + i + "</button>"; document.getElementById("app").innerHTML = h; }, ${SETTLE_DELAY_MS});</script></body></html>`;
// A page that changes forever: every hundred milliseconds a new button with a new name appears.
const NEVER = `${HEAD}<h1>Panel</h1><script>setInterval(function () { var b = document.createElement("button"); b.textContent = "T" + Math.random(); document.body.appendChild(b); }, 100);</script></body></html>`;
// A static page with paragraph, list-item and cell text, a colon in a paragraph, a repeated paragraph and one legacy text node.
const INLINE = [
  HEAD,
  '<h1>Panel</h1>',
  '<p>Registration details</p>',
  '<p>Name: Ana</p>',
  '<p>Repeated line</p><p>Repeated line</p>',
  '<ul><li>Full name</li></ul>',
  '<table><tbody><tr><td>2026-10-01</td></tr></tbody></table>',
  '<button>Save</button>',
  '<div><span>Welcome back</span></div>',
  '</body></html>',
].join('');

/** @type {import('node:http').Server} */
let pageServer;
let pageUrl = '';
before(async () => {
  pageServer = createServer((req, res) => {
    const path = String(req.url).split('?')[0];
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(path === '/never' ? NEVER : path === '/inline' ? INLINE : SETTLES);
  });
  await new Promise((r) => pageServer.listen(0, '127.0.0.1', () => r(null)));
  pageUrl = `http://127.0.0.1:${/** @type {any} */ (pageServer.address()).port}`;
});
after(async () => {
  /** @type {any} */ (pageServer).closeAllConnections?.();
  await new Promise((r) => pageServer.close(() => r(null)));
});

test('AC-1 end to end: a page that renders after load is snapshotted only once settled, so the entry count equals the settled count', SLOW, async () => {
  const fx = groundRoot(pageUrl);
  const g = await runGround(fx.root, ['--route', '/settles']);
  assert.equal(g.code, 0, g.stderr);
  const file = join(fx.runDir, 'grounding', 'anonymous--settles.snapshot.json');
  assert.ok(existsSync(file), `no snapshot was written: ${g.stdout}`);
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const button = (/** @type {string} */ name) => doc.entries.find((/** @type {any} */ e) => e.kind === 'role' && e.role === 'button' && e.name === name);
  // The first paint holds the heading only; the settled page holds the heading and the sixty buttons.
  assert.equal(doc.entries.length, 61, `the snapshot was taken before the page settled: ${doc.entries.length} entries`);
  assert.equal(button('B0')?.matches, 1);
  assert.equal(button('B59')?.matches, 1);
  assert.match(g.stdout, new RegExp(`^GROUNDED: grounding/anonymous--settles\\.snapshot\\.json entries=${doc.entries.length} withheld=0$`, 'm'));
});

test('AC-1 end to end: a page that never settles exits 1 with GROUND_UNSTABLE after waiting out the bound, writes nothing, and names no page text', SLOW, async () => {
  const fx = groundRoot(pageUrl);
  const started = Date.now();
  const g = await runGround(fx.root, ['--route', '/never']);
  const elapsed = Date.now() - started;
  assert.equal(g.code, 1, `${g.code} ${g.stderr}`);
  assert.ok(g.stderr.includes('GROUND_UNSTABLE'), g.stderr);
  assert.equal(g.stdout.includes('GROUNDED:'), false, 'an unstable page printed a GROUNDED line');
  assert.equal(existsSync(join(fx.runDir, 'grounding')), false, 'an unstable page left a grounding directory behind');
  assert.deepEqual(readdirSync(fx.runDir), [], 'an unstable page wrote something into the run directory');
  assert.equal(/Panel|T0\./.test(g.stderr), false, `the halt message carries page text: ${g.stderr}`);
  assert.ok(elapsed >= GROUND_STABLE_BOUND_MS - 2 * GROUND_POLL_INTERVAL_MS, `gave up after ${elapsed} ms, before the bound of ${GROUND_STABLE_BOUND_MS} ms`);
  assert.ok(elapsed < GROUND_STABLE_BOUND_MS + 90000, `the wait was not bounded: ${elapsed} ms`);
});

test('AC-1 AC-15 end to end: ground still passes the target through the local-only guard first, so a non-local target halts FAILED_NON_LOCAL_TARGET before any browser or request', SLOW, async () => {
  // No node_modules link: had the guard not come first the halt would be FAILED_PLAYWRIGHT_UNAVAILABLE or a browser launch.
  const fx = groundRoot('http://example.com', false);
  const g = await runGround(fx.root, ['--route', '/']);
  assert.equal(g.code, 1, `${g.code} ${g.stderr}`);
  assert.ok(g.stderr.includes('FAILED_NON_LOCAL_TARGET'), g.stderr);
  assert.equal(g.stdout, '');
  assert.deepEqual(readdirSync(fx.runDir), [], 'a refused target wrote something');
});

test('AC-2 end to end: paragraph, list-item and quoted-colon text reaches the snapshot file with real match counts, and the entries that existed before are still there', SLOW, async () => {
  const fx = groundRoot(pageUrl);
  const g = await runGround(fx.root, ['--route', '/inline']);
  assert.equal(g.code, 0, g.stderr);
  const doc = JSON.parse(readFileSync(join(fx.runDir, 'grounding', 'anonymous--inline.snapshot.json'), 'utf8'));
  const dump = JSON.stringify(doc.entries);
  const text = (/** @type {string} */ t) => doc.entries.find((/** @type {any} */ e) => e.kind === 'text' && e.text === t);
  const role = (/** @type {string} */ r, /** @type {string} */ n) => doc.entries.find((/** @type {any} */ e) => e.kind === 'role' && e.role === r && e.name === n);

  // New: the text of a paragraph, a double-quoted paragraph value (unquoted before it is counted) and a repeated paragraph.
  assert.equal(text('Registration details')?.matches, 1, dump);
  assert.equal(text('Name: Ana')?.matches, 1, dump);
  assert.equal(text('Repeated line')?.matches, 2, `the real count of a repeated paragraph is recorded, not assumed to be one: ${dump}`);
  // A list item and a table cell arrive as a text entry (the inline form) or as the role entry Playwright emits for a named cell.
  assert.equal((text('Full name') ?? role('listitem', 'Full name'))?.matches, 1, dump);
  assert.equal((text('2026-10-01') ?? role('cell', '2026-10-01'))?.matches, 1, dump);
  // Unchanged: the role-and-name entries and the plain text node of the page.
  assert.equal(role('heading', 'Panel')?.matches, 1, dump);
  assert.equal(role('button', 'Save')?.matches, 1, dump);
  assert.equal(text('Welcome back')?.matches, 1, dump);
  // No entry keeps the YAML quotes, which would count zero elements.
  assert.equal(doc.entries.some((/** @type {any} */ e) => e.kind === 'text' && /^"/.test(e.text)), false, dump);
  assert.ok(doc.entries.every((/** @type {any} */ e) => Number.isInteger(e.matches) && e.matches >= 1), 'every kept entry carries a real count');

  // The file the planner reads is what the plan-time check consumes: one match is plannable, two is not.
  const stepsFor = (/** @type {string} */ t) => [
    { action: 'goto', path: '/inline' },
    { action: 'expect_visible', text: t },
  ];
  assert.equal(precheckGroundedSteps(stepsFor('Registration details'), [doc], '', null), null);
  assert.equal(precheckGroundedSteps(stepsFor('Name: Ana'), [doc], '', null), null);
  const repeated = precheckGroundedSteps(stepsFor('Repeated line'), [doc], '', null);
  assert.equal(repeated?.code, 'PLAN_ENTRY_INVALID');
  assert.match(String(repeated?.reason), /2 elements/);
});

// ---------------------------------------------------------------------------
// 7. The record-resolution sentence of the doc, against the real runner
// ---------------------------------------------------------------------------

test('AC-6 the record-resolution paragraph matches the runner: a resolving record ignores the entry outcome but still reads its class and objective_steps, an unresolved case routes on its entry', async () => {
  const generatedAt = '2026-10-01T10:00:00+00:00';
  const feature = 'feat';
  const runRel = `PRPs/reports/${feature}/qa-run/20261010T101010101Z`;
  const root = mkdtempSync(join(tmpdir(), 'relay-qastable-record-'));
  temps.push(root);
  const reportDir = join(root, 'PRPs', 'reports', feature);
  const runDirAbs = join(root, ...runRel.split('/'));
  mkdirSync(runDirAbs, { recursive: true });
  mkdirSync(join(root, 'PRPs', 'auth'), { recursive: true });
  writeFileSync(join(root, 'PRPs', 'auth', 'login.config.json'), JSON.stringify({ roles: {} }));

  const junitPath = join(reportDir, 'junit.xml');
  writeFileSync(junitPath, '<?xml version="1.0"?><testsuites><testcase name="t1" classname="suite" file="/proj/test/a.test.mjs" time="0.1"></testcase></testsuites>');
  const writtenBeforeRecord = new Date(Date.parse(generatedAt) - 60000);
  utimesSync(junitPath, writtenBeforeRecord, writtenBeforeRecord);
  writeFileSync(
    join(reportDir, 'record.json'),
    JSON.stringify({
      run_id: 'r-1',
      attempt: 1,
      tier: 'unit',
      framework: 'node:test',
      outcome: 'PASSED',
      duration_ms: 5,
      counts: { passed: 1, failed: 0, skipped: 0, total: 1 },
      failures: [],
      artifacts: { junit_xml: junitPath },
      generated_at: generatedAt,
    }),
  );

  const titles = ['Resolved from the record', 'Not in the record'];
  const paths = ['`test/a.test.mjs`', '`test/missing.test.mjs`'];
  const block = (/** @type {string} */ title, /** @type {number} */ i) =>
    [
      `### Case ${i + 1}`,
      `**Title:** ${title}`,
      '**Risk level:** low',
      '**Required state:** None',
      '**Coverage:** automated',
      `**Automated test path:** ${paths[i]}`,
      '**Manual status:** pending',
      '**Manual step-by-step:**',
      '1. Open the page.',
      '',
    ].join('\n');
  writeFileSync(join(reportDir, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${titles.map(block).join('\n')}\n## Notes\n\nnone\n`);
  // Both entries decline their case. The first case resolves from the record, so its entry decides no outcome.
  writeFileSync(
    join(runDirAbs, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: [
        { index: 1, title: titles[0], class: 'automatable', reason_code: 'EXTERNAL_CHANNEL', objective_steps: 2 },
        { index: 2, title: titles[1], class: 'human-by-nature', reason_code: 'EXTERNAL_CHANNEL' },
      ],
    }),
  );

  const r = await runNode(['run', '--root', root, '--feature', feature, '--run-dir', runRel], root);
  assert.equal(r.code, 0, r.stderr);
  const res = JSON.parse(readFileSync(join(runDirAbs, 'results.json'), 'utf8'));
  const [resolved, routed] = res.cases;

  assert.deepEqual([resolved.outcome, resolved.reason_code], ['pass', 'AUTOMATED_EVIDENCE'], 'the entry declined the case, yet the record resolved it');
  assert.deepEqual([resolved.class, resolved.objective_steps], ['automatable', 2], 'the entry class and objective_steps are still read for a record-resolved case');
  assert.deepEqual([routed.outcome, routed.reason_code, routed.class], ['needs-human', 'EXTERNAL_CHANNEL', 'human-by-nature'], 'an unresolved case routes on its entry like any other');
  assert.equal(res.record_resolved, 1);
  assert.equal(res.classification.driver_executed, 0, 'a record-resolved case is never driver-executed');
  assert.equal(res.classification.per_class.automatable, 1);
});
