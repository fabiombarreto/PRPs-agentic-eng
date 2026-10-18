// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-18 The command doc and the usage text match the script (every new step has a literal flat example preceded by the qa-step-example marker and validating against the script; the window follows the exported constant; the re-mint is documented with its cap)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-12 A network-request assertion (the doc and the redaction policy state what is counted, what is recorded and what is never read)
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-13 One bounded re-mint (the doc states the single retry with --force, its cap, and that no other role or halt is retried)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the prose the planner and the operator read,
 * of qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A7 the doc, the runner and the contract match: a marked literal flat example that validates, the
 *              window in seconds the exported constant carries, what is recorded and what is never read, the
 *              re-mint with its cap, one honesty bullet; AC-A4 the policy bullet)
 *
 * Over the REAL command doc and redaction policy (read from disk, never edited), with the runner's own validators:
 *   1. The marked example: flat, directly after the expect_state paragraph and before the grounding rules, valid
 *      as a step and refused as an entry on its own (it needs an interaction), valid after a goto.
 *   2. The paragraph that states the shape and the window: found by its opening words, each pinned phrase matched
 *      on the whitespace-collapsed paragraph (the doc hard-wraps), the three tokens the contract matches with a raw
 *      includes each on ONE physical line, the numbers following the exported constants, and the method list
 *      the doc names accepted by the runner.
 *   3. The paragraph that states the guard, the evidence file and what is never read; the honesty bullet; and the
 *      re-mint paragraph with its cap.
 *   4. The Observed requests bullet of the redaction policy: its label once, inside the snapshots subsection,
 *      after the Post-interaction snapshots bullet and before the rule that closes the section; what it says; and
 *      that it does NOT claim a path is free of identifiers.
 *
 * What these sentences claim is proven by behavior elsewhere: the shape in qa-run-network-grammar.test.mjs, the
 * window, the redirect hop and the workers in qa-run-network-count.test.mjs and qa-run-network-guard.test.mjs, the
 * evidence in qa-run-network-evidence.test.mjs, the re-mint in qa-run-remint-runner.test.mjs.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateStep, validateSteps, EXPECT_REQUESTS_SETTLE_MS, EXPECT_REQUESTS_COUNT_MAX, EXPECT_REQUESTS_EVIDENCE_MAX, LOGIN_REMINT_MAX_RETRIES } from '../../../plugins/relay/scripts/qa-run.mjs';

const COMMAND_FILE = 'plugins/relay/commands/relay-qa-run.md';
const POLICY_FILE = 'plugins/relay/resources/redaction-policy.md';

/** @param {string} rel @returns {string} the file with LF line endings */
const read = (rel) => readFileSync(resolve(rel), 'utf8').replace(/\r\n/g, '\n');
const COMMAND = read(COMMAND_FILE);
const POLICY = read(POLICY_FILE);
const LINES = COMMAND.split('\n');

/** The doc's paragraphs, each flattened to one line. */
const PARAGRAPHS = COMMAND.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim());

/**
 * @param {string} start the opening words of a paragraph, which must identify exactly one paragraph
 * @returns {string}
 */
function paragraphStarting(start) {
  const found = PARAGRAPHS.filter((p) => p.startsWith(start));
  assert.equal(found.length, 1, `exactly one paragraph must start with ${start}, found ${found.length}`);
  return found[0];
}
/** @param {string} start @returns {number} the index of the one paragraph that starts with it */
function paragraphIndex(start) {
  paragraphStarting(start);
  return PARAGRAPHS.findIndex((p) => p.startsWith(start));
}
/** @param {string} paragraph @param {string[]} phrases @param {string} label */
function assertPhrases(paragraph, phrases, label) {
  for (const phrase of phrases) assert.ok(paragraph.includes(phrase), `${label} lacks: ${phrase}`);
}
/** @param {string} token @returns {boolean} whether one physical line of the doc carries it */
const onOneLine = (token) => LINES.some((l) => l.includes(token));

const SECONDS = EXPECT_REQUESTS_SETTLE_MS / 1000;
const WINDOW_PHRASE = `${SECONDS} seconds after the step starts`;
const CAP_PHRASE = LOGIN_REMINT_MAX_RETRIES === 1 ? 'at most once per role per run' : `at most ${LOGIN_REMINT_MAX_RETRIES} times per role per run`;
const SHAPE_START = '`expect_requests` takes a `method`';

// ---------------------------------------------------------------------------
// 1. The marked example
// ---------------------------------------------------------------------------

test('AC-18 the doc carries one marked literal flat example of expect_requests, between the expect_state paragraph and the grounding rules, valid as a step and refused as an entry that has no interaction', () => {
  const marked = [...COMMAND.matchAll(/<!-- qa-step-example driver=(\w+) -->\n```json\n([\s\S]*?)\n```/g)];
  const mine = marked.filter((m) => {
    try {
      return JSON.parse(m[2]).action === 'expect_requests';
    } catch {
      return false;
    }
  });
  assert.equal(mine.length, 1, `exactly one marked example of expect_requests, found ${mine.length}`);
  assert.equal(mine[0][1], 'browser');
  const step = JSON.parse(mine[0][2]);
  assert.deepEqual(Object.keys(step), ['action', 'method', 'url_contains', 'count'], 'the example is not the flat shape');
  assert.equal(mine[0][2], '{ "action": "expect_requests", "method": "POST", "url_contains": "/avatar", "count": 1 }');

  // It validates as a step, and as an entry only after an interaction: the doc says so, and so does the runner.
  assert.equal(validateStep('browser', step), null);
  assert.equal(validateSteps('browser', [step], [])?.code, 'PLAN_ENTRY_INVALID');
  assert.equal(validateSteps('browser', [{ action: 'goto', path: '/p' }, { action: 'click', selector: '#save' }, step], []), null);

  const lead = paragraphIndex('A literal `browser` step that counts the requests the page issues:');
  assert.ok(paragraphIndex('`expect_state` takes `role` and `name`') < lead, 'the example must follow the expect_state paragraph');
  assert.ok(lead < paragraphIndex(SHAPE_START), 'the example must come before its paragraph');
  assert.ok(paragraphIndex(SHAPE_START) < paragraphIndex('Grounding rules.'), 'the paragraphs must come before the grounding rules');
});

// ---------------------------------------------------------------------------
// 2. The shape and the window
// ---------------------------------------------------------------------------

test('AC-18 the paragraph of the step states its shape, its window in seconds, the redirect and worker rules and the two sequence rules, with the numbers the exported constants carry', () => {
  const p = paragraphStarting(SHAPE_START);
  assertPhrases(
    p,
    [
      'takes a `method` (`GET`, `HEAD`, `POST`, `PUT`, `PATCH` or `DELETE`)',
      `an integer \`count\` from 0 to ${EXPECT_REQUESTS_COUNT_MAX}`,
      'takes no locator, no `selector` and no `session`.',
      '`url_contains` starts with a single `/` and carries no query string, fragment or whitespace; a character the URL parser encodes is matched in its encoded form.',
      "The step counts the requests of the page whose method equals `method` and whose path contains `url_contains`, from the start of the case's last `goto`, `click` or `fill` step until " +
        `${WINDOW_PHRASE}, and it passes only when that number equals \`count\`.`,
      'Each redirect hop is a request of its own, a popup, a worker and a WebSocket are not observed, and a case that carries this step runs with service workers blocked, so none can answer a request out of sight.',
      'The step is valid only after a `goto`, `click` or `fill` step of the same case, and a `count` of 0 also needs a positive step on the same route since the last `goto`, as `expect_not_visible` does; otherwise the entry is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.',
    ],
    'the shape paragraph',
  );
  // The contract matches these with a raw includes on the whole doc: each must sit on one physical line.
  for (const token of [SHAPE_START, '`url_contains`', WINDOW_PHRASE, CAP_PHRASE, 'A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT`', '`--force`']) {
    assert.ok(onOneLine(token), `no physical line of the doc carries ${token}`);
  }
});

test('AC-18 every method the doc names is a method the runner accepts, and the cap and the window of the doc are the ones the exported constants carry', () => {
  const p = paragraphStarting(SHAPE_START);
  const listed = /\(([^)]*)\)/.exec(p)?.[1] ?? '';
  const methods = [...listed.matchAll(/`([A-Z]+)`/g)].map((m) => m[1]);
  assert.deepEqual(methods, ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
  for (const method of methods) {
    assert.equal(validateStep('browser', { action: 'expect_requests', method, url_contains: '/a', count: 1 }), null, method);
  }
  assert.equal(validateStep('browser', { action: 'expect_requests', method: 'POST', url_contains: '/a', count: EXPECT_REQUESTS_COUNT_MAX }), null);
  assert.equal(validateStep('browser', { action: 'expect_requests', method: 'POST', url_contains: '/a', count: EXPECT_REQUESTS_COUNT_MAX + 1 })?.code, 'PLAN_ENTRY_INVALID');
  // The window the doc states is whole seconds of the constant (a fraction would not read as a number of seconds).
  assert.equal(EXPECT_REQUESTS_SETTLE_MS % 1000, 0);
  assert.ok(p.includes(`until ${WINDOW_PHRASE}`));
});

// ---------------------------------------------------------------------------
// 3. The guard, the evidence, the honesty bullet and the re-mint
// ---------------------------------------------------------------------------

test('AC-12 the paragraph of the evidence states the guard, what is recorded, what is never read, and that a path can still carry an identifier no table recognizes', () => {
  const p = paragraphStarting('A matching request to a host the local-only guard does not approve');
  assertPhrases(
    p,
    [
      'was aborted before it left the machine and blocks the case `FAILED_NON_LOCAL_TARGET` with nothing asserted, and a request to such a host that does not match the step is ignored.',
      'The evidence file `evidence/case-<index>.requests-<step>.json` records the method, the expected count, the observed count and, for each matching request, only its method, host and path',
      `(at most ${EXPECT_REQUESTS_EVIDENCE_MAX} are listed, with \`truncated\` set past that, and the observed count stays exact)`,
      'the query string and the fragment are dropped, and no header, cookie, token or body is ever read.',
      'A path can still carry an identifier the redaction table does not recognize, so the file sits in the ignored `evidence/` directory, and for the step `results.json` carries only the result, the counts of a failing reason and the path of that file.',
    ],
    'the evidence paragraph',
  );
});

test('AC-12 the honesty rules tell the planner to count requests only when the report asks how many an action issues, never to confirm that a page rendered, after the ground prefix bullet', () => {
  const at = LINES.findIndex((l) => l.startsWith('Honesty rules:'));
  assert.ok(at !== -1, 'the honesty rules section is missing');
  /** @type {string[]} */ const bullets = [];
  for (const l of LINES.slice(at + 1)) {
    if (l.startsWith('#')) break;
    if (l.startsWith('- ')) bullets.push(l.slice(2).trim());
    else if (l.startsWith('  ') && bullets.length > 0) bullets[bullets.length - 1] += ` ${l.trim()}`;
  }
  const mine = bullets.filter((b) => b.startsWith('Plan `expect_requests` only when'));
  assert.equal(mine.length, 1, `exactly one honesty bullet must start with Plan \`expect_requests\`, found ${mine.length}`);
  assertPhrases(
    mine[0],
    [
      "only when the report's own step asks how many requests an action issues",
      "with `method`, `url_contains` and `count` taken from the report's own steps",
      'after the `goto`, `click` or `fill` step that triggers them',
      'never to confirm that a page rendered',
    ],
    'the honesty bullet',
  );
  const ground = bullets.findIndex((b) => b.startsWith('Plan a `ground` prefix only from'));
  assert.ok(ground !== -1 && ground + 1 === bullets.indexOf(mine[0]), 'the bullet must directly follow the ground prefix bullet');
  // Two-space continuation lines, as every other bullet of the list.
  const first = LINES.findIndex((l) => l.startsWith('- Plan `expect_requests`'));
  assert.ok(first !== -1 && LINES[first + 1].startsWith('  ') && LINES[first + 2].startsWith('  ') && LINES[first + 3].startsWith('  '), 'the continuation lines are not indented by two spaces');
});

test('AC-13 the re-mint paragraph follows the minted paragraph of Phase B and states the single retry with --force, its cap, that only the login script is run, and what is never retried', () => {
  const minted = paragraphIndex('For a role whose mechanism is `minted`, the runner reads the expiry');
  const remint = paragraphIndex('A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT`');
  assert.equal(remint, minted + 1, 'the re-mint paragraph must directly follow the minted paragraph');
  assertPhrases(
    PARAGRAPHS[remint],
    [
      'right after it minted',
      'is run once more by the runner with `--force`,',
      `${CAP_PHRASE} (each \`ground\` command is a run of its own)`,
      'the runner runs only the kit login script again, with the same arguments plus that flag and never the mint command, and the script runs its own local-only guard before its mint command.',
      'A proven second attempt yields the session, and a second halt leaves the role blocked with the code of that halt, which is `FAILED_PROBE_MARKER_ABSENT` again when the proof fails again.',
      'A role whose mechanism is not `minted`, and every other halt, is never retried, and the login template and its stamp are unchanged.',
    ],
    'the re-mint paragraph',
  );
  // The minted paragraph it follows is not edited: the pre-run margin and the registration rule are still its own.
  assertPhrases(PARAGRAPHS[minted], ['240 seconds', '`--force`', 'IndexedDB', 'registered for redaction source-first', 'not masked by value'], 'the minted paragraph');
});

// ---------------------------------------------------------------------------
// 4. The redaction policy
// ---------------------------------------------------------------------------

test('AC-12 the Observed requests bullet of the redaction policy states what a request records and what is never read, and does not claim a path is free of identifiers', () => {
  const lines = POLICY.split('\n');
  const heading = lines.indexOf('### Snapshots, screenshots and personal data');
  const closing = lines.indexOf('## What this policy is NOT');
  assert.ok(heading !== -1 && closing > heading, `section order: ${heading} ${closing}`);
  const section = lines.slice(heading, closing);
  const starts = section.map((l, i) => (l.startsWith('- **Observed requests.**') ? i : -1)).filter((i) => i !== -1);
  assert.equal(starts.length, 1, 'the Observed requests bullet must occur once, inside the snapshots subsection');
  const post = section.findIndex((l) => l.startsWith('- **Post-interaction snapshots.**'));
  assert.ok(post !== -1 && post < starts[0], 'the bullet must follow the Post-interaction snapshots bullet');
  let end = starts[0] + 1;
  while (end < section.length && section[end].startsWith('  ')) end++;
  // No blank line inside the bullet, and the rule that closes the section comes right after it.
  assert.equal(section[end], '', 'the bullet must be followed by a blank line');
  assert.equal(section[end + 1], '---', 'the bullet must be the last item before the rule');
  const bullet = section.slice(starts[0], end).join(' ').replace(/\s+/g, ' ');
  assertPhrases(
    bullet,
    [
      'An `expect_requests` step watches the requests the page issues, and the runner reads nothing from a request but its method and its URL: never a header, a cookie, a token or a body.',
      `records the method, the host and the path (at most ${EXPECT_REQUESTS_EVIDENCE_MAX} are listed, the observed count staying exact), with the query string and the fragment dropped in memory, and the expected and observed counts.`,
      'A registered secret that appears in a path is masked like any evidence string, but a path can still carry an identifier or a name the table does not recognize',
      "so the file lives under the run directory's ignored `evidence/`, whose ignore rule is proven before anything is written",
      'for the step `results.json` carries only the result, the counts of a failing reason and the path of that file.',
    ],
    'the Observed requests bullet',
  );
  assert.equal(/free of (any )?identifier/i.test(bullet), false, 'the bullet claims a path holds no identifier, which is not what is recorded');
});
