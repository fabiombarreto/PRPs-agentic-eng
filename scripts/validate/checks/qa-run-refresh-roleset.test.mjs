// @ts-check
// PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md AC-19 --refresh states its role set (given plugins/relay/commands/relay-auth-scripts.md, when its --refresh behavior is read, then it states whether a refresh covers the roles of the approved model's matrix or the roles the kit holds, and a kit narrower than the matrix is refreshed for its own roles only)
/**
 * Phase 6 (network assertion, bounded re-mint and refresh role set), the role set of `--refresh`, of
 * qa-runner-grounding-vocabulary-v2.
 *
 * Source PRD:  PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md
 * Source plan: PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-6-network-assertion-bounded-re-mint-and-refresh-role-set.plan.md
 *              (AC-A8 the doc states which roles a run selects and which scripts --refresh regenerates, documenting
 *              the behavior the command already has and changing no other sentence)
 *
 * DOCUMENTATION ONLY, and no behavior twin exists: /relay-auth-scripts is a prompt command the agent that adopts
 * it executes, there is no generator script whose role narrowing a test could drive, so the claim is pinned
 * against the sentences of the same doc that define the behavior it describes. What those sentences say about
 * the arguments, the flag and the templates is pinned by auth-kit-commands-hardening.test.mjs (the --refresh
 * argument and the regeneration sentences), auth-kit-minted-authoring.test.mjs (the fields --refresh adds) and
 * auth-scripts-command.test.mjs (the whole-file bans); this file pins the new paragraph, its place, and that
 * each thing it claims is stated by the doc's own earlier text.
 *
 * KNOWN, DOCUMENTED-AS-OPEN (DQ33 of the invoking command): a role the kit holds that the model's matrix does
 * not list is not selected, so `--refresh` cannot reach it. The paragraph says so plainly; this file pins that
 * statement and does not claim it is desirable.
 *
 * Run: node --test "scripts/validate/**\/*.test.mjs"
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DOC_FILE = 'plugins/relay/commands/relay-auth-scripts.md';
/** @type {string} the doc with LF line endings */
const DOC = readFileSync(resolve(DOC_FILE), 'utf8').replace(/\r\n/g, '\n');
/** The doc whitespace-collapsed: the doc hard-wraps its prose. */
const FLAT = DOC.replace(/\s+/g, ' ');
const LINES = DOC.split('\n');
const PARAGRAPHS = DOC.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim());

const OPENING = 'Which roles `--refresh` covers.';

/** @returns {string} the one paragraph that starts with the opening words */
function theParagraph() {
  const found = PARAGRAPHS.filter((p) => p.startsWith(OPENING));
  assert.equal(found.length, 1, `exactly one paragraph must start with ${OPENING}, found ${found.length}`);
  return found[0];
}

test('AC-19 the doc states which roles a run selects and which scripts --refresh regenerates, so that a kit narrower than the matrix is refreshed for its own roles only', () => {
  const p = theParagraph();
  const phrases = [
    "A run selects the roles of the model's matrix, narrowed by `--role`, and `--refresh` regenerates only the scripts of those roles that already exist:",
    'a selected role with no `PRPs/auth/login-<role>.mjs` script is generated exactly as without `--refresh` and is not reported as refreshed',
    'so a kit narrower than the matrix is refreshed for its own roles only.',
    "A role the kit holds that the model's matrix does not list is not selected, and its script is left as it is.",
  ];
  for (const phrase of phrases) assert.ok(p.includes(phrase), `the paragraph lacks: ${phrase}`);
  // The opening words start a line of their own: a paragraph, not the tail of another one.
  assert.ok(LINES.some((l) => l.startsWith(OPENING)), 'the paragraph does not start on its own line');
});

test('AC-19 the paragraph sits after the sentences that define a refresh and before the example-file paragraph, so no earlier sentence moved', () => {
  const index = PARAGRAPHS.findIndex((p) => p.startsWith(OPENING));
  assert.ok(index > 0);
  assert.ok(
    PARAGRAPHS[index - 1].endsWith('It never touches a session, a token, `credentials.json` or `credentials.example.json`.'),
    `the paragraph before it is not the --refresh paragraph: ${PARAGRAPHS[index - 1].slice(-80)}`,
  );
  assert.ok(
    PARAGRAPHS[index + 1].startsWith('Write `PRPs/auth/credentials.example.json` with placeholder values only when absent:'),
    `the paragraph after it is not the example-file paragraph: ${PARAGRAPHS[index + 1].slice(0, 80)}`,
  );
});

test('AC-19 every claim of the paragraph rests on a sentence the doc already carried: the matrix and the --role filter, the regeneration of the selected roles, and the report of each replaced script', () => {
  const at = FLAT.indexOf(OPENING);
  assert.notEqual(at, -1);
  const before = FLAT.slice(0, at);
  // Where the arguments are listed: --role restricts generation, --refresh regenerates the selected roles' existing scripts.
  for (const sentence of [
    '`--role <role>` — optional and repeatable; restricts generation to the named roles (kebab-case slugs).',
    "`--refresh` — optional; regenerates the selected roles' existing scripts from the installed template (see Phase A). Without it an existing script is skipped.",
    // Phase A: the roles come from the model's matrix, and --role filters them.
    "For each role in the model's `## Role and Permission Matrix`",
    '`--role` filters',
    // Phase A: what a refresh does to a selected role, and that a replaced script is reported.
    'Without `--refresh`, an existing script is skipped and reported, never overwritten',
    "With `--refresh`, every selected role's script is regenerated from the installed template by the same single substitution and overwrites the existing file, each replaced script being reported.",
    // Phase A: a script is written for each selected role.
    'For each role write `PRPs/auth/login-<role>.mjs`',
  ]) {
    assert.ok(before.includes(sentence), `the doc does not state, before the paragraph: ${sentence}`);
  }
});
