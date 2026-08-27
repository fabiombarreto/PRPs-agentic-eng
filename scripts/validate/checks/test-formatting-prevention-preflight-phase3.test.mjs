// @ts-check
/**
 * Content-invariant tests for Phase 3 ("Preflight") of the
 * test-formatting-prevention-preflight feature —
 * plugins/relay/commands/relay-implement.md (the new
 * `### P5 — Test-file formatting preflight` precondition, positioned
 * strictly before the renumbered `### P6 — Base-commit derivable`).
 *
 * Same idiom as test-formatting-prevention-preflight-phase1/2/4.test.mjs:
 * this phase's deliverable is prompt/protocol markdown in a command
 * definition, not a new production .mjs export — there is no runtime code
 * to unit-test directly (the preflight is a sequence of `Bash`/`Write`
 * calls issued autonomously by the command *protocol*, not a script this
 * corpus can import and execute). The meaningful, non-trivial,
 * discriminative assertion is: does the shipped prose actually deliver the
 * mechanism AC-3 depends on — in particular the ORDERING guarantee (P5
 * strictly precedes P6/base_commit capture, which is the entire premise: if
 * this ever regressed, formatting normalization would land inside the
 * window R-X inspects instead of before it), the discovery chain's
 * (a)->(b)->(c) order and reuse (not reinvention) of Phase 2's chain, the
 * glob-free test-pathspec-only scoping bound to code-reviewer.md's own R-X
 * set (not implementer.md's separate, narrower set — the plan's own Risks
 * table names this exact divergence), and the no-commit (Pillar 2)
 * guarantee — not merely that the word "preflight" appears somewhere in
 * the file.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 3 plan
 * (PRPs/plans/completed/test-formatting-prevention-preflight-phase-3-preflight.plan.md).
 * Dispatched out of the PRD's phase order (phases 1, 2, 4 were already
 * `complete`; phase 3 stalled at `implemented` when a prior /relay-execute
 * run's wall-clock budget stopped before its test stage ran) — this suite
 * closes that gap; phase 5 has not started.
 *
 * Existing-coverage scan performed before authoring (Step 2.1): grepped
 * every scripts/validate/checks/*.test.mjs file for "relay-implement.md",
 * "P5", "P6", "Base-commit derivable", "formatting preflight",
 * "preflight-formatting.json", and "base_commit". Zero hits referencing
 * relay-implement.md's precondition structure at all — Phase 3's prose was
 * genuinely uncovered territory. The two PRD ACs the plan's own
 * `## Acceptance Criteria` section also maps to this phase (AC-A2 => PRD
 * AC-4 "R-X byte-identical"; AC-A3 => PRD AC-7 structural half, "Dispute
 * never formatting") are EXISTING_TEST_COVERS, not NEW_TEST_REQUIRED: this
 * phase's plan `## Files to Change` table names only relay-implement.md
 * (code-reviewer.md and implementer.md are never touched), so the exact
 * same properties test-formatting-prevention-preflight-phase4.test.mjs
 * already asserts (code-reviewer.md's `### R-X` section byte-identical to
 * its canonical text: lines 142-179; implementer.md's "Opening
 * TEST_CONTRACT_DISPUTE for formatting" bullet forbidding a formatting
 * dispute channel: lines 245-256) remain true and require no new test —
 * writing a second byte-identical-R-X assertion here would duplicate that
 * existing coverage with no discriminative difference (R-DUPLICATE).
 *
 * Traceability (PRPs/prds/test-formatting-prevention-preflight.prd.md
 * Acceptance Criteria, narrowed by the plan's own AC-A1..AC-A3; AC-1/2/6/8
 * are OUT_OF_PHASE_SCOPE, deferred to Phases 2/1/5 respectively — see
 * PRPs/reports/test-formatting-prevention-preflight/test-suite.diff):
 *   AC-A1 (PRD AC-3, "Preflight cleans the window") — the new `### P5`
 *     precondition: (1) is positioned strictly before `### P6 —
 *     Base-commit derivable` (the ordering that makes the whole mechanism
 *     work); (2) reuses Phase 2's three-branch formatter_cmd discovery
 *     chain verbatim, in strict (a)->(b)->(c) order, never silently
 *     recording the omission; (3) collects the working-tree file set
 *     using the SAME 17-pathspec test-glob set code-reviewer.md's R-X rule
 *     itself inspects (never a glob over the whole repo, never
 *     implementer.md's separate narrower set); (4) invokes the formatter
 *     scoped strictly to that literal file list; (5) records the outcome
 *     to a command-owned `preflight-formatting.json` side-record distinct
 *     from any test-writer lifecycle ledger; (6) never issues a commit
 *     (Pillar 2); (7) never HALTs — every branch is a soft, recorded
 *     outcome. The command's own mission narration and frontmatter
 *     `description:` both name the new step.
 *   AC-A2 (PRD AC-4, "R-X byte-identical") — EXISTING_TEST_COVERS, see
 *     above.
 *   AC-A3 (PRD AC-7, "Dispute never formatting", structural half) —
 *     EXISTING_TEST_COVERS, see above.
 *
 * Run: node --test scripts/validate/checks/test-formatting-prevention-preflight-phase3.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-implement.md';
const CODE_REVIEWER_PATH = 'plugins/relay/agents/code-reviewer.md';
const IMPLEMENTER_PATH = 'plugins/relay/agents/implementer.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`, so
 * `^...$`/`/m` assertions and literal-substring checks behave identically
 * regardless of the checkout's line-ending configuration. Mirrors
 * test-formatting-prevention-preflight-phase1/2/4.test.mjs's readRepoFile.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns
 * undefined if `startNeedle` is absent. Mirrors
 * test-formatting-prevention-preflight-phase4.test.mjs's (and
 * figma-track-ac2-reuse-enforcement.test.mjs's) helper of the same
 * name/shape.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const startIdx = content.indexOf(startNeedle);
  if (startIdx === -1) return undefined;
  const endIdx = content.indexOf(endNeedle, startIdx + startNeedle.length);
  return endIdx === -1 ? content.slice(startIdx) : content.slice(startIdx, endIdx);
}

/**
 * Normalizes a whitespace-separated (possibly multi-line) run of tokens to
 * a single-space-joined string, so a pathspec set that is wrapped across
 * several physical lines in one file compares equal to the same set
 * written on one physical line in another file.
 * @param {string} text
 * @returns {string}
 */
function normalizeTokens(text) {
  return text.split(/\s+/).filter(Boolean).join(' ');
}

const P5_HEADING = '### P5 — Test-file formatting preflight';
const P6_HEADING = '### P6 — Base-commit derivable';

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — the ORDERING guarantee. This is the entire mechanism:
// if P5 ever regressed to sit at or after P6, formatting normalization
// would land inside the window base_commit/diff_target captures instead of
// before it, and AC-3 would silently fail. A positional index comparison
// is the discriminative assertion here, not mere substring existence.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): both "### P5 — Test-file formatting preflight" and "### P6 — Base-commit derivable" headings exist in relay-implement.md', () => {
  const content = readRepoFile(COMMAND_PATH);

  assert.notEqual(content.indexOf(P5_HEADING), -1, 'expected a "### P5 — Test-file formatting preflight" heading');
  assert.notEqual(content.indexOf(P6_HEADING), -1, 'expected a "### P6 — Base-commit derivable" heading');
});

test('AC-A1 (PRD AC-3): P5 (formatting preflight) is positioned strictly BEFORE P6 (base-commit derivation) — the ordering the whole preflight mechanism depends on', () => {
  const content = readRepoFile(COMMAND_PATH);

  const p5Idx = content.indexOf(P5_HEADING);
  const p6Idx = content.indexOf(P6_HEADING);
  assert.notEqual(p5Idx, -1, 'expected a "### P5" heading');
  assert.notEqual(p6Idx, -1, 'expected a "### P6" heading');

  assert.ok(
    p5Idx < p6Idx,
    'P5 (formatting preflight) must precede P6 (base_commit derivation) — a regression here means the R-X inspection window is no longer born clean by construction'
  );
});

test('AC-A1 (PRD AC-3): the P5 section extraction is non-empty (guards against a vacuous empty-vs-empty comparison in later assertions)', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);

  assert.ok(section, 'expected an extractable "### P5" section between its own heading and the "### P6" heading');
  assert.ok(section.length > 0, 'extracted "### P5" section must be non-empty');
});

test('AC-A1 (PRD AC-3): P5 states it runs BEFORE base_commit is computed, and that it never HALTs — every branch is a soft, recorded outcome', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(
    section.includes('Runs once per `/relay-implement` invocation, BEFORE `base_commit` is'),
    'expected the explicit "runs BEFORE base_commit" framing sentence'
  );
  assert.ok(
    section.includes('computed (P6 below)'),
    'expected P5 to name P6 explicitly as the step it precedes'
  );
  assert.ok(
    section.includes('Never HALTs: every branch below') && section.includes('is a soft, recorded outcome.'),
    'expected the explicit never-HALTs / soft-recorded-outcome guarantee'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — the discovery chain is REUSED (not reinvented) from
// Phase 2's own three-branch chain, in strict (a)->(b)->(c) order.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): P5 step 1 explicitly reuses (does not reimplement) relay-write-test.md\'s Phase A.4.2 discovery chain', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(
    section.includes("Reuse the identical three-branch"),
    'expected P5 step 1 to name reuse of the identical three-branch chain'
  );
  assert.ok(
    section.includes('discovery chain `/relay-write-test`\'s Phase A.4.2 already ships'),
    'expected an explicit pointer to relay-write-test.md Phase A.4.2 as the source of the chain'
  );
  assert.ok(
    section.includes('do not\n   reimplement it:') || section.includes('do not reimplement it:'),
    'expected an explicit "do not reimplement it" instruction'
  );
});

test('AC-A1 (PRD AC-3): P5\'s discovery chain runs its three branches strictly in order (a) methodology.md formatter_cmd -> (b) package.json scripts.format -> (c) omission', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  const branchAIdx = section.indexOf('(a) Read `<target_root>/docs/context/methodology.md`');
  const branchBIdx = section.indexOf('(b) Else read `<target_root>/package.json`');
  const branchCIdx = section.indexOf('(c) Else `formatter_cmd = null`');

  assert.notEqual(branchAIdx, -1, 'expected discovery-chain branch (a)');
  assert.notEqual(branchBIdx, -1, 'expected discovery-chain branch (b)');
  assert.notEqual(branchCIdx, -1, 'expected discovery-chain branch (c)');

  assert.ok(branchAIdx < branchBIdx, 'branch (a) must precede branch (b)');
  assert.ok(branchBIdx < branchCIdx, 'branch (b) must precede branch (c)');
});

test('AC-A1 (PRD AC-3): branch (a)/(b) content is byte-identical in substance to Phase 2\'s own chain wording — genuine reuse, not a parallel reinvention', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(section.includes('formatter_cmd = <value>`, `discovery_source ='));
  assert.ok(section.includes('"methodology.md formatter_cmd"`. Proceed to step 2.'));
  assert.ok(section.includes('formatter_cmd = "npm run format --"`,'));
  assert.ok(section.includes('`discovery_source = "package.json scripts.format"`. Proceed to'));
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — omission is never silent: branch (c) records the
// discovery-chain-attempted result explicitly, every time.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): branch (c) (no discoverable formatter) records the omission explicitly and states this is never silent, never a HALT', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(
    section.includes('formatter_cmd in methodology.md frontmatter and no package.json'),
    'expected the omission detail naming both discovery-chain branches attempted'
  );
  assert.ok(
    section.includes('Record the omission at step 4 and skip to'),
    'expected an explicit instruction to record the omission'
  );
  assert.ok(
    section.includes('never silently, never a HALT.'),
    'expected the explicit never-silently / never-a-HALT guarantee on the omission branch'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — glob-free, test-pathspec-only scoping (PRD Risk R1):
// P5 step 2 binds to the SAME 17-pattern pathspec set code-reviewer.md's
// R-X rule itself inspects, never a glob over the whole repo, and never
// implementer.md's separate, narrower, differently-shaped Step 2.3 set —
// the plan's own Risks table names this exact divergence as a live risk.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): P5 step 2 collects the working tree via git ls-files scoped to literal pathspecs — never a bare glob, never the whole repo', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(
    section.includes('git ls-files --cached --others --exclude-standard --'),
    'expected the git ls-files invocation scoped with --exclude-standard and an explicit pathspec separator'
  );
});

test('AC-A1 (PRD AC-3): P5 step 2\'s pathspec set is exactly the SAME 17-pattern set as code-reviewer.md\'s ### R-X rule (normalized for line-wrapping) — not a reinvented or divergent set', () => {
  const implementContent = readRepoFile(COMMAND_PATH);
  const p5Section = sliceBetween(implementContent, P5_HEADING, P6_HEADING);
  assert.ok(p5Section, 'expected an extractable "### P5" section');

  const lsFilesLine = p5Section
    .split('\n')
    .find((line) => line.includes('git ls-files --cached --others --exclude-standard --'));
  assert.ok(lsFilesLine, 'expected a single line carrying the git ls-files command');

  const p5PathspecRaw = lsFilesLine.slice(lsFilesLine.indexOf('--exclude-standard --') + '--exclude-standard --'.length);
  const p5Pathspec = normalizeTokens(p5PathspecRaw.replace(/`\s*$/, ''));

  const reviewerContent = readRepoFile(CODE_REVIEWER_PATH);
  const reviewerLabel = 'Using the canonical test-glob pathspec set:\n\n```\n';
  const reviewerLabelIdx = reviewerContent.indexOf(reviewerLabel);
  assert.notEqual(reviewerLabelIdx, -1, 'expected code-reviewer.md\'s canonical-pathspec-set lead-in label');
  const reviewerBlockStart = reviewerLabelIdx + reviewerLabel.length;
  const reviewerBlockEnd = reviewerContent.indexOf('\n```\n\nRun via `Bash`:', reviewerBlockStart);
  assert.notEqual(reviewerBlockEnd, -1, 'expected the closing fence before "Run via `Bash`:"');
  const reviewerBlock = reviewerContent.slice(reviewerBlockStart, reviewerBlockEnd);
  assert.ok(reviewerBlock, 'expected code-reviewer.md\'s fenced canonical pathspec block, excluding the lead-in label');
  const reviewerPathspec = normalizeTokens(reviewerBlock);

  assert.equal(
    p5Pathspec,
    reviewerPathspec,
    'P5\'s collected pathspec set must be exactly code-reviewer.md\'s own R-X pathspec set, whitespace-normalized — this is what makes the preflight normalize exactly the files that could later trip R-X'
  );
});

test('AC-A1 (PRD AC-3): P5\'s pathspec set is NOT implementer.md\'s separate, narrower Step 2.3 set (brace-expansion shape, no .rb patterns) — the two sets are documented to diverge', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(
    !section.includes('**/*.test.{js,ts'),
    'P5 must not use implementer.md\'s brace-expansion pathspec shape (e.g. **/*.test.{js,ts,jsx,tsx,mjs,cjs}) — that is the separate, narrower Step 2.3 set, not R-X\'s own set'
  );

  const implementerContent = readRepoFile(IMPLEMENTER_PATH);
  assert.ok(
    implementerContent.includes('**/*.test.{js,ts,jsx,tsx,mjs,cjs}'),
    'sanity check: implementer.md\'s own Step 2.3 set must still use the brace-expansion shape, confirming the two sets really do diverge in the live corpus'
  );
});

test('AC-A1 (PRD AC-3): P5 step 3 invokes the formatter scoped strictly to the collected file list — never a glob, never the whole repo', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(
    section.includes('`Bash("<formatter_cmd> <file_1> <file_2> ...")`'),
    'expected the scoped Bash invocation built from literal file paths'
  );
  assert.ok(
    section.includes('the literal\n   paths from step 2 appended as trailing arguments, never a glob and\n   never the whole repo') ||
      section.includes('never a glob and') && section.includes('never\n   the whole repo'),
    'expected the explicit never-a-glob / never-the-whole-repo scoping guarantee'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — the outcome is recorded to a command-owned side-record,
// distinct from any test-writer lifecycle ledger.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): P5 step 4 records the outcome to a command-owned preflight-formatting.json side-record with the required fields, distinct from a test-writer lifecycle-ledger entry', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(section.includes('preflight-formatting.json'), 'expected the side-record filename');
  assert.ok(
    section.includes('{formatter_cmd, discovery_source,\n   files_scoped: [...], outcome, exit_code_or_null}') ||
      (section.includes('formatter_cmd') && section.includes('discovery_source') && section.includes('files_scoped') && section.includes('exit_code_or_null')),
    'expected the required side-record fields'
  );
  assert.ok(
    section.includes('This is a\n   command-owned record — distinct from any test-suite manifest, and\n   it never masquerades as a `test-writer` lifecycle-ledger entry.') ||
      (section.includes('command-owned record') && section.includes('never masquerades as a `test-writer` lifecycle-ledger entry')),
    'expected the explicit command-owned / never-masquerades-as-lifecycle-ledger disclaimer'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — the Pillar 2 "never commit" invariant: all preflight
// edits land directly and uncommitted in the working tree.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): P5 step 5 states no commit is ever issued — all edits land directly, uncommitted, in the working tree, per the Pillar 2 invariant', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sliceBetween(content, P5_HEADING, P6_HEADING);
  assert.ok(section, 'expected an extractable "### P5" section');

  assert.ok(section.includes('5. **No commit issued, ever.**'), 'expected the explicit "No commit issued, ever" step heading');
  assert.ok(
    section.includes('All edits from step 3 land directly in\n   the working tree, uncommitted'),
    'expected the explicit uncommitted-working-tree placement statement'
  );
  assert.ok(
    section.includes("relay's Pillar 2 \"never commit\" invariant"),
    'expected an explicit citation of the Pillar 2 "never commit" invariant'
  );
  assert.ok(
    section.includes('it would be the first commit `/relay-implement` ever\n   makes.') ||
      section.includes('it would be the first commit `/relay-implement` ever'),
    'expected the explicit reasoning that a dedicated normalization commit would be the first commit /relay-implement ever makes'
  );
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-3) — the command's own self-description (mission narration +
// frontmatter description:) names the new P5 step, so an operator reading
// either surface learns the preflight exists ahead of base_commit (P6).
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-3): the command\'s "## Your mission" narration names the P5 formatting preflight ahead of base_commit (P6)', () => {
  const content = readRepoFile(COMMAND_PATH);

  assert.ok(
    content.includes(
      'run the preconditions check — including a P5 test-file formatting preflight that normalizes any not-yet-formatter-clean test files in the working tree before base_commit (P6) is computed — then run an internal writer↔reviewer loop'
    ),
    'expected the mission narration to name the P5 preflight step explicitly, ahead of base_commit (P6)'
  );
});

test('AC-A1 (PRD AC-3): the command\'s frontmatter description: field names the P5 formatting-preflight precondition ahead of base_commit (P6)', () => {
  const content = readRepoFile(COMMAND_PATH);
  const frontmatter = sliceBetween(content, '---\n', '\n---');
  assert.ok(frontmatter, 'expected an extractable YAML frontmatter block');

  assert.ok(
    frontmatter.includes('including a P5 formatting-preflight precondition ahead of base_commit (P6)'),
    'expected the frontmatter description to name the P5 preflight step explicitly, ahead of base_commit (P6)'
  );
});
