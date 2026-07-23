// @ts-check
/**
 * Content/real-wrapper regression tests for Phase 4 ("Design Spec") of the
 * figma-implementation-track feature — the new `/relay-design-spec`
 * command, the `design-spec-writer`/`design-spec-reviewer` agent pair
 * (inline-adopted, unlike Phase 3's Task-dispatched design-map pair), and
 * their `docs/context/design-spec-template.md` canonical shape.
 *
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-4-design-spec.plan.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1): cross-checked
 * every registered check module's own test file, AND this same feature's
 * three prior phase test files (figma-track-phase1/2/3.test.mjs), for
 * coverage that would already extend to this phase's new files.
 *
 *   - figma-track-phase3.test.mjs's two real-wrapper tests
 *     (`runDispatchGraphCheck()` / `runRegistrationParityCheck()` both
 *     `ok:true` with zero findings) call the SAME thin wrappers this phase
 *     would call, with NO fixture isolation — they run against whatever is
 *     currently on disk. Since this phase's four new files
 *     (relay-design-spec.md, design-spec-writer.md, design-spec-reviewer.md,
 *     and the doc-site registrations) are now part of that "currently on
 *     disk" state, those two existing tests already exercise (and, per
 *     `record.json`'s `validation.level_1: PASS`, already pass against) the
 *     AC-1 "npm run validate passes with zero new gated-emission findings"
 *     clause for this phase too. EXISTING_TEST_COVERS applies to that
 *     specific property — re-asserting it here would be a same-input,
 *     same-assertion duplicate (R-DUPLICATE) of an already-green test, not a
 *     new discriminative check. Left untouched this session.
 *   - Neither of those two real-wrapper tests, nor any other existing test,
 *     asserts the command-scoped "no OTHER command file mentions
 *     design-spec" inertness property — dispatch-graph only verifies that a
 *     `subagent_type`/`Next:` reference RESOLVES, never that a given
 *     command/agent is referenced by exactly the one command that
 *     legitimately dispatches it. This is the same missing-property-delta
 *     class figma-track-phase3.test.mjs already established for
 *     design-map — this file supplies the phase-4 instance for
 *     design-spec, over the phase-4-specific file set.
 *   - No existing test anywhere in the repo reads `design-spec-reviewer.md`
 *     or `design-spec-writer.md` at all (confirmed by direct read of both
 *     files in full, plus a directory listing of `scripts/validate/checks/`
 *     — only figma-track-phase1/2/3.test.mjs and the generic per-check test
 *     files exist, none of which mention "design-spec"). AC-A2/AC-3 and
 *     AC-A3/AC-2 are therefore both NEW_TEST_REQUIRED with no partial
 *     coverage to delta against.
 *   - Manually confirmed (direct read of `plugins/relay/commands/relay-execute.md`
 *     in full — the primary cross-command orchestrator most likely to
 *     accidentally wire a new command into the autonomous loop) that it
 *     contains zero mentions of "design-spec" anywhere, consistent with the
 *     plan's own explicit "Being invoked by /relay-execute" NOT-doing
 *     constraint and with `record.json`'s `files_changed` list (no command
 *     file other than `relay-design-spec.md` itself was touched).
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 4 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-4-design-spec.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 4 per the plan's own Acceptance Criteria
 * section: AC-1, AC-3, AC-2 only, via plan AC-A1/AC-A2/AC-A3. PRD AC-4 and
 * AC-5 are OUT_OF_PHASE_SCOPE, deferred to phases 5 and 6 respectively):
 *
 *   AC-1 / AC-A1 (Inert when off) — none of this phase's three new files
 *     (plugins/relay/commands/relay-design-spec.md,
 *     plugins/relay/agents/design-spec-writer.md,
 *     plugins/relay/agents/design-spec-reviewer.md) are ever dispatched or
 *     invoked by any OTHER command; npm run validate's dispatch-graph and
 *     registration-parity checks both still return ok:true with zero
 *     findings against the real repository tree after this phase's
 *     additions (EXISTING_TEST_COVERS via figma-track-phase3.test.mjs — see
 *     above) — the phase stays fully inert until a human explicitly runs
 *     /relay-design-spec.
 *
 *   Lifecycle update (2026-07-23, EXISTING_TEST_UPDATED): the AC-1/AC-A1
 *     "no OTHER command file mentions design-spec" test below originally
 *     scanned every other command file in plugins/relay/commands/. Phase 5
 *     (figma-implementation-track-phase-5-plan-integration.plan.md)
 *     legitimately and intentionally added a `--design-spec <value>` flag /
 *     `design_spec_path` wiring to plugins/relay/commands/relay-plan.md
 *     (design_source: figma routing, conditional research-design grounding
 *     dispatch, per that phase's APPROVED, code-reviewed implementation) —
 *     this is now a real, intended cross-reference, not a regression.
 *     Minimal exclusion applied (mirrors figma-track-phase3.test.mjs's own
 *     design-map precedent — see that file's own lifecycle-update comment):
 *     the scan still covers EVERY file under plugins/relay/commands/,
 *     exactly as originally, with exactly two names excluded —
 *     relay-design-spec.md itself (self-reference) and relay-plan.md (the
 *     one file that legitimately references "design-spec", confirmed by
 *     direct read of all 16 other command files in full — including
 *     relay-execute.md and every command file it inline-adopts, all
 *     re-confirmed to contain zero mentions of "design-spec"). Full
 *     justification recorded in
 *     PRPs/reports/figma-implementation-track/test-suite.diff's Lifecycle
 *     ledger.
 *
 *   Second lifecycle update (2026-07-23, EXISTING_TEST_UPDATED — same day,
 *     third recurrence of this exact pattern): Phase 7
 *     (figma-implementation-track-phase-7-surface-integration.plan.md,
 *     Task 1) added plugins/relay/commands/relay-visual-review.md, which
 *     legitimately and intentionally references "design-spec" multiple
 *     times — its Mandatory Reading pointer to
 *     `docs/context/design-spec-template.md`, its derivation of
 *     `design_spec_path = PRPs/designs/<feature>/design-spec.md`, and its
 *     P5 precondition HALT message pointing the user at
 *     `/relay-design-spec` when the referenced Design Spec is missing or
 *     not APPROVED. This is the new standalone visual-review command's own
 *     read of the Design Spec artifact this whole track is built around —
 *     an already-APPROVED, correct cross-reference, not a regression.
 *     Applying the same MINIMAL-exclusion discipline established above
 *     (never narrowing the scan itself — only adding one more excluded
 *     filename to the existing set): relay-visual-review.md is added as a
 *     third excluded name alongside relay-design-spec.md (self) and
 *     relay-plan.md. Confirmed by direct read of relay-visual-review.md in
 *     full (multiple legitimate "design-spec" mentions), and by direct
 *     read of every other command file under plugins/relay/commands/ — all
 *     15 remaining files, including relay-execute.md, relay-qa-report.md,
 *     and relay-pr.md (the three other command files Phase 7 also
 *     touched), plus relay-design-map.md — to confirm zero mentions of
 *     "design-spec" in any of them. Full justification recorded in
 *     PRPs/reports/figma-implementation-track/test-suite.diff's Lifecycle
 *     ledger.
 *   AC-3 / AC-A2 (Explicit human approval required) — a Design Spec that has
 *     passed design-spec-reviewer's full R-DS1-R-DS7 rubric stays DRAFT
 *     until the user's own explicit affirmative reply: the DRAFT->APPROVED
 *     flip is structurally reachable ONLY from the main-mode Step 3 dialogue
 *     gate (BOTH rubric pass AND explicit approval required), never
 *     automatically, and the subagent-mode branch never reaches Step 4 at
 *     all (default context is subagent, fail-safe).
 *   AC-2 / AC-A3 (Reuse enforced — structural foundation) — design-spec-writer's
 *     REUSE classification requires citing a real CM-<n> id verified present
 *     in the component map, and a NEW verdict requires persisted
 *     failed-search evidence — a subtree can never be silently
 *     re-classified NEW without that evidence trail.
 *
 * Run: node --test scripts/validate/checks/figma-track-phase4.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMANDS_DIR = 'plugins/relay/commands';
const NEW_COMMAND_FILE = 'relay-design-spec.md';
const REVIEWER_PATH = 'plugins/relay/agents/design-spec-reviewer.md';
const WRITER_PATH = 'plugins/relay/agents/design-spec-writer.md';
// The other command files that legitimately mention "design-spec" — Phase 5
// (plan-integration) added a `--design-spec <value>` flag / design_spec_path
// wiring to relay-plan.md (design_source: figma routing, conditional
// research-design grounding dispatch; confirmed by direct read, Phase 5
// plan, already-APPROVED), and Phase 7 (surface-integration) added
// relay-visual-review.md, whose Mandatory Reading, path derivation, and P5
// precondition HALT message all legitimately reference the Design Spec
// artifact and `/relay-design-spec` (confirmed by direct read, Phase 7
// plan Task 1, already-APPROVED). Every other file under COMMANDS_DIR
// remains scanned.
const LEGITIMATE_REFERENCE_FILES = ['relay-plan.md', 'relay-visual-review.md'];

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence. Mirrors
 * figma-track-phase3.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase3.test.mjs's helper
 * of the same name/shape.
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

// ---------------------------------------------------------------------------
// AC-1 / AC-A1 — none of this phase's three new files are dispatched or
// invoked by any OTHER command file (the two real-wrapper "ok:true, zero
// findings against the real tree" checks are EXISTING_TEST_COVERS via
// figma-track-phase3.test.mjs — see header comment).
// ---------------------------------------------------------------------------

// Lifecycle update (2026-07-23, EXISTING_TEST_UPDATED): minimal exclusion
// added for relay-plan.md, then a second time same day for
// relay-visual-review.md (Phase 7) — see this file's header comment
// (AC-1/AC-A1 lifecycle notes) and
// PRPs/reports/figma-implementation-track/test-suite.diff's Lifecycle
// ledger for the full justification. scannedFiles' overall scope is
// unchanged (every command file under COMMANDS_DIR is still enumerated);
// only three names are excluded from the assertion loop.
test('AC-1/AC-A1: every OTHER command file under plugins/relay/commands/ (all files except relay-design-spec.md itself and the documented "design-spec" pointers in relay-plan.md and relay-visual-review.md) never mentions "design-spec" in any form — the phase stays fully inert until a human explicitly runs /relay-design-spec', () => {
  const commandsDirPath = resolve(COMMANDS_DIR);
  const allCommandFiles = readdirSync(commandsDirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);
  const scannedFiles = allCommandFiles.filter(
    (name) => name !== NEW_COMMAND_FILE && !LEGITIMATE_REFERENCE_FILES.includes(name)
  );

  // Guard against a silently-empty (or suspiciously small) scan set — e.g. a
  // directory-listing regression that would make the rest of this test a
  // vacuous pass.
  assert.ok(
    scannedFiles.length >= 10,
    `expected at least 10 other command files to scan under ${COMMANDS_DIR}, found ${scannedFiles.length} — directory listing may be broken`
  );

  for (const fileName of scannedFiles) {
    const content = readRepoFile(`${COMMANDS_DIR}/${fileName}`);
    assert.ok(
      !/design-spec/i.test(content),
      `${fileName} must not mention "design-spec" in any form — only relay-design-spec.md (itself) and the documented pointers in relay-plan.md (--design-spec flag wiring) and relay-visual-review.md (Design Spec artifact reads) may legitimately reference it`
    );
  }
});

// ---------------------------------------------------------------------------
// AC-3 / AC-A2 — the DRAFT->APPROVED flip is structurally reachable ONLY
// from the main-mode Step 3 dialogue gate (rubric pass AND explicit user
// approval), never automatically, and never from subagent mode.
// ---------------------------------------------------------------------------

test('AC-3/AC-A2: design-spec-reviewer.md structurally forbids flipping in subagent mode — the user is unreachable there, so the flip is impossible by construction — and the default context is subagent (fail-safe)', () => {
  const content = readRepoFile(REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '**The flip is an interactivity-boundary action**',
    'You do NOT write Design Specs from scratch.'
  );
  assert.ok(block, 'expected an extractable mode/default-context block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /you were dispatched via `Task`\. The user's messages reach only the main conversation, never a subagent: every message you receive is your caller's\. You can never receive the user's approval, so you run the full rubric and return `RUBRIC_PASSED` \(or `CHANGES_REQUESTED`\) — you NEVER flip\./
  );
  assert.match(
    collapsed,
    /\*\*Default context is `subagent`\*\* \(fail-safe: never auto-flip unless an invoker with genuine user contact explicitly declares `main`\)\./
  );
});

test('AC-3/AC-A2: Hard Constraint 1 requires BOTH rubric pass AND the user\'s explicit in-dialogue approval before the main-mode flip, and forbids flipping under any circumstance in subagent mode', () => {
  const content = readRepoFile(REVIEWER_PATH);
  const block = sliceBetween(
    content,
    '1. **The flip is gated by context + two conditions',
    '2. **Re-validate the rubric immediately before flipping.**'
  );
  assert.ok(block, 'expected an extractable Hard Constraint 1 block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /the flip requires BOTH the rubric passing AND the user's explicit in-dialogue approval\. Either alone is insufficient\./
  );
  assert.match(
    collapsed,
    /In \*\*`subagent` mode\*\* you MUST NOT flip under any circumstance\./
  );
});

test('AC-3/AC-A2: the Step 3 subagent branch never proceeds to Step 4, and Step 4 (the only place the DRAFT->APPROVED Edit happens) is reachable only in main mode after the user\'s explicit Step 3 approval', () => {
  const content = readRepoFile(REVIEWER_PATH);

  const subagentBranch = sliceBetween(
    content,
    '**`subagent` mode** — return `RUBRIC_PASSED` and stop.',
    '**`main` mode** — summarize to the user'
  );
  assert.ok(subagentBranch, 'expected an extractable Step 3 subagent-mode branch');
  assert.match(
    collapseWs(subagentBranch),
    /do NOT flip, do NOT prompt, do NOT proceed to Step 4\./
  );

  const step4Block = sliceBetween(
    content,
    '### Step 4 — Final flip (happy path, `main` mode only)',
    '### Step 5 — Dialogue loop'
  );
  assert.ok(step4Block, 'expected an extractable Step 4 block');
  assert.match(
    collapseWs(step4Block),
    /Reached only in `main` mode after the user's explicit approval in Step 3\./
  );
});

// ---------------------------------------------------------------------------
// AC-2 / AC-A3 — REUSE cites a real CM-<n> id verified present in the
// component map; a NEW verdict requires persisted failed-search evidence —
// never a silent re-classification.
// ---------------------------------------------------------------------------

test('AC-2/AC-A3: design-spec-writer.md\'s Phase 3 classification requires REUSE to cite a real CM-<n> id verified present in the map, and forbids a NEW verdict without persisted failed-search evidence', () => {
  const content = readRepoFile(WRITER_PATH);
  const block = sliceBetween(content, '3. **Classify every subtree.**', '## Phase 4 — Batched Q&A');
  assert.ok(block, 'expected an extractable Phase 3 classification block');
  const collapsed = collapseWs(block);

  assert.match(
    collapsed,
    /cites a real `CM-<n>` id from `component_map_path` whose Figma reference matches this subtree\. Never assign a `CM-<n>` id you have not verified is present in the map\./
  );
  assert.match(
    collapsed,
    /A `NEW` verdict with no failed-search evidence is a fabrication — never emit one\./
  );
});

test('AC-2/AC-A3: design-spec-writer.md\'s Hard Constraint 3 and Anti-patterns sections reinforce that a REUSE row must cite verified evidence and can never be silently downgraded to an unsupported NEW verdict', () => {
  const content = readRepoFile(WRITER_PATH);

  const hcBlock = sliceBetween(content, '3. **No fabrication.**', '4. **No silent AMBIGUOUS drops.**');
  assert.ok(hcBlock, 'expected an extractable Hard Constraint 3 block');
  assert.match(
    collapseWs(hcBlock),
    /Every `REUSE` row cites a real `CM-<n>` id from `component_map_path`\. Every `NEW` verdict cites a persisted failed-search record/
  );

  const apBlock = sliceBetween(
    content,
    '- **Inventing a REUSE or NEW verdict without persisted evidence.**',
    '- **Silently dropping an AMBIGUOUS item.**'
  );
  assert.ok(apBlock, 'expected an extractable Anti-patterns block');
  assert.match(
    collapseWs(apBlock),
    /Every `REUSE` row cites a real `CM-<n>`; every `NEW` verdict cites a persisted failed-search record\./
  );
});
