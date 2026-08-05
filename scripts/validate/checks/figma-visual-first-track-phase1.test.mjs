// @ts-check
/**
 * Content-invariant tests for Phase 1 ("Foundations") of the
 * figma-visual-first-track feature (v2 of relay's Figma Implementation
 * Track) — the zero-behavior-change declaration surfaces: the PRD
 * template's new conditional `## Visual-First Mode` section, the plan
 * template's new conditional `phase_scope` Metadata row, the Design Spec
 * template's new optional `Interaction` column, the new
 * `docs/context/mock-sentinels.md` convention doc, its
 * `docs/KNOWLEDGE_BASE.md` registration, and the
 * `documentation/changelog.html` Unreleased entry recording the phase.
 *
 * Companion to scripts/validate/checks/gating-structure.test.mjs, NOT a
 * duplicate of it: gating-structure.test.mjs owns the `visual_first_approval`
 * SITES-registry pure-function/wrapper unit tests (AC-A7) — this file does
 * NOT re-assert plugins/relay/skills/context-builder/SKILL.md's
 * `visual_first_approval` emission/preservation/backfill prose directly,
 * since gating-structure.mjs's own regex-marker checks already verify that
 * prose more rigorously (discriminative per-marker failures) than a
 * substring content-invariant assertion could. THIS file owns AC-A1's
 * suite-level "stays green" delta, AC-A2/AC-A3's template dual-branch
 * registrations (plus each one's own real dogfood absence-confirmation),
 * AC-A4/AC-A5's mock-sentinels.md content, AC-A6's Interaction-column
 * registration, and the KNOWLEDGE_BASE.md/changelog.html documentation of
 * record — mirroring exactly how scripts/validate/checks/figma-track-phase1.test.mjs
 * divided responsibility with gating-structure.test.mjs for v1's identically
 * shaped Phase 1.
 *
 * Same idiom as figma-track-phase1.test.mjs / docs-sync-phase2.test.mjs:
 * every touched file here is prompt/template/prose markdown (or HTML) with
 * no companion production module for its content, so these are
 * readFileSync-based content assertions against the real, already-
 * implemented files — not fixture-driven unit tests. The ONE exception is
 * AC-A1's full-suite test, which shells out to the real
 * `node scripts/validate/index.mjs` entry point (mirroring
 * native-validate.test.mjs's real-subprocess-invocation precedent) rather
 * than importing scripts/validate/index.mjs directly — that module runs
 * `main()` (mutating `process.exitCode`, writing to stdout) as an
 * import-time side effect with no exported function, so a direct import
 * would pollute this test process; a subprocess is the only clean seam.
 *
 * Existing-coverage scan performed before authoring (grepped every
 * scripts/validate/checks/*.test.mjs for "Visual-First Mode", "phase_scope",
 * "mock-sentinels", "RELAY-MOCK-DATA", and the design-spec Interaction
 * column; also globbed for any pre-existing figma-visual-first-track*.test.mjs
 * — none exists): zero hits anywhere outside this new file — this phase's
 * PRD template / plan template / design-spec template / mock-sentinels.md
 * artifacts are brand new with zero prior coverage. Two partial-coverage
 * exceptions, both left untouched and cited here rather than duplicated:
 *   - figma-track-phase1.test.mjs:161 ("AC-1/AC-A1: this repository's own
 *     docs/context/methodology.md has no figma_track key yet") already
 *     covers this feature's AC-A1's "Given" precondition half (figma_track
 *     absence, a precondition both v1 and v2's AC-A1 share verbatim); this
 *     file's AC-A1 test below covers only the "Then" delta (the full
 *     `npm run validate` suite stays green after this phase's changes).
 *   - figma-track-phase1.test.mjs:205 (runVersionParityCheck() against the
 *     real, current changelog.html) already re-reads the live file on every
 *     run, so it transparently continues to cover "version-parity still
 *     holds" after this phase's new Unreleased entry — not re-asserted here.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 1 plan:
 * PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 1's in-scope subset per the plan's own
 * `## Acceptance Criteria` AC-A1 through AC-A7; PRD AC-6 is
 * OUT_OF_PHASE_SCOPE, deferred to Phase 5 per the Implementation Phases
 * table — no test for it in this file or gating-structure.test.mjs):
 *
 *   AC-A1 (PRD AC-1, delta only) — `npm run validate` stays green with
 *     zero failing checks after this phase's changes land.
 *   AC-A2 (PRD AC-1, AC-2) — prd-template.md's new `## Visual-First Mode`
 *     section is dual-branch conditional (gated on figma_track: true) and
 *     absent, not empty, from a PRD whose project doesn't declare it — this
 *     feature's own source PRD is the real dogfood proof.
 *   AC-A3 (PRD AC-2) — plan-template.md's new `phase_scope` row mirrors
 *     `design_source`'s non-heuristic lineage and is absent from a plan
 *     whose source PRD doesn't declare `visual_first: true` — this
 *     feature's own phase 1 plan is the real dogfood proof.
 *   AC-A4 (PRD AC-3) — mock-sentinels.md documents both sentinel classes,
 *     the zero-side-effects rule, and swap semantics; registered in
 *     KNOWLEDGE_BASE.md.
 *   AC-A5 (PRD AC-5) — mock-sentinels.md documents the zero-remaining,
 *     no-deferral-path rule.
 *   AC-A6 (PRD AC-4) — design-spec-template.md's Visual Acceptance Criteria
 *     table gains an optional, additive 9th `Interaction` column; the
 *     original 8 fields stay the mandatory completeness scope.
 *   AC-A7 (documentation-of-record half only; the SITES-registry half is
 *     gating-structure.test.mjs's) — documentation/changelog.html records
 *     this phase's declaration surfaces under Unreleased -> Added.
 *
 * Lifecycle update (2026-07-25, EXISTING_TEST_UPDATED, performed by the
 * Phase 2 test-writer session): the AC-A2 test asserting prd-template.md's
 * `## Visual-First Mode` closing sentence originally matched the literal
 * phrase "not implemented by this template registration alone" — a
 * forward-reference stub pointing at Phase 2, which had not been built yet
 * when Phase 1 was authored. Phase 2 (`figma-visual-first-track-phase-2-prd-authoring.plan.md`,
 * Task 1) legitimately replaced that exact sentence with a new
 * `### Phase-pairing mechanism` subsection — confirmed by actually running
 * this test file after Phase 2's diff landed (it failed) rather than
 * assuming continued coverage. The underlying property the test verifies
 * (the template correctly states where phase-pairing enforcement lives) is
 * still fully live — it just went from a forward-reference to a real,
 * concrete mechanism statement — so the test is UPDATED to assert the new
 * content (`### Phase-pairing mechanism` heading present +
 * `prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` enforcement sentence),
 * not weakened: no assertion was dropped, one stale assertion was replaced
 * with a stronger, now-true one covering the same claim more concretely.
 * Full justification recorded in
 * PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle ledger
 * (phase 2 revision).
 *
 * Lifecycle update (2026-07-25, EXISTING_TEST_UPDATED, performed by the
 * Phase 3 test-writer session): the AC-A5 test asserting mock-sentinels.md's
 * "## What this convention is NOT" bullet originally matched the literal
 * phrase "**Not enforced by any agent or check yet.**" plus "Zero-side-
 * effects enforcement at plan-review time is Phase 3's job; the
 * zero-remaining sentinel-ledger check is Phase 4's job. Neither exists yet
 * as of this file's creation." — a not-yet-shipped framing that was accurate
 * when Phase 1 authored this file, before Phase 3 existed. Confirmed by
 * actually running this test file during Phase 3's own test-writer session
 * (it failed) rather than assuming continued coverage: the file's own
 * "## What this convention is NOT" bullet was independently updated (outside
 * Phase 3's own 4-file plan diff, most likely by this feature's docs-sync
 * cycle, per PRPs/reports/figma-visual-first-track/docs-update.md) to read
 * "**Enforcement layers, starting in Phase 3.**" plus "...shipped in Phase
 * 3; the zero-remaining sentinel-ledger check remains Phase 4's job." The
 * underlying property the test verifies (mock-sentinels.md correctly states
 * where enforcement lives, and by when) is still fully live; it just moved
 * from "not shipped yet" to "Phase 3 shipped it, Phase 4 remains" — which is
 * precisely this session's own AC-A2 subject matter (plan-reviewer.md's
 * R-COH-VISUAL-SCOPE-PURITY check, tested in
 * figma-visual-first-track-phase3.test.mjs). The test is UPDATED to assert
 * the new content, not weakened: no assertion was dropped, both stale
 * assertions were replaced with stronger, now-true ones covering the same
 * claim. Full justification recorded in
 * PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle ledger
 * (phase 3 revision).
 *
 * Lifecycle update (2026-07-26, EXISTING_TEST_UPDATED, performed by the
 * Phase 4 test-writer session): the SAME AC-A5 test touched by the Phase 3
 * revision above asserted mock-sentinels.md's "## What this convention is
 * NOT" bullet's second sentence as "...shipped in Phase 3; the
 * zero-remaining sentinel-ledger check remains Phase 4's job." — accurate
 * when Phase 3 authored that fix, before Phase 4 existed. Discovered by
 * actually running the full pre-existing test corpus against the current
 * on-disk state after authoring this session's new suite (per protocol —
 * not assumed continued coverage; confirmed via a live `node --test` run,
 * not merely inferred): the file's own bullet was independently updated
 * (outside this phase's own 4-file plan diff, most likely by this feature's
 * docs-sync cycle, per PRPs/reports/figma-visual-first-track/docs-update.md)
 * to read "...shipped in Phase 3; the zero-remaining sentinel-ledger check
 * (`plan-reviewer`'s `R-COH-SENTINEL-RESOLUTION-MISSING` check, requiring
 * both a sentinel-resolution task and a VALIDATE command targeting zero
 * remaining sentinels) shipped in Phase 4." The underlying property the test
 * verifies (mock-sentinels.md correctly states where enforcement lives, and
 * by when) is still fully live; it just moved from "Phase 3 shipped it,
 * Phase 4 remains" to "Phase 3 AND Phase 4 both shipped it" — precisely this
 * session's own AC-A3 subject matter (plan-reviewer.md's
 * R-COH-SENTINEL-RESOLUTION-MISSING check, tested in
 * figma-visual-first-track-phase4.test.mjs). The test title and its second
 * regex are UPDATED to assert the new content; the first regex (the opening
 * "Enforcement layers, starting in Phase 3." sentence) is untouched — it
 * still matches verbatim. No assertion is dropped, no scope is narrowed.
 * Full justification recorded in
 * PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle ledger
 * (phase 4 revision).
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase1.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { execPath } from 'node:process';

const PRD_TEMPLATE_PATH = 'plugins/relay/resources/prd-template.md';
const PLAN_TEMPLATE_PATH = 'plugins/relay/resources/plan-template.md';
const DESIGN_SPEC_TEMPLATE_PATH = 'plugins/relay/resources/design-spec-template.md';
const MOCK_SENTINELS_PATH = 'plugins/relay/resources/mock-sentinels.md';
const KNOWLEDGE_BASE_PATH = 'docs/KNOWLEDGE_BASE.md';
const CHANGELOG_PATH = 'documentation/changelog.html';
const THIS_PRD_PATH = 'PRPs/prds/figma-visual-first-track.prd.md';
const THIS_PLAN_PATH = 'PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md';
const VALIDATE_INDEX_PATH = 'scripts/validate/index.mjs';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-track-phase1.test.mjs's helper of the same name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1.test.mjs's helper
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

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence. Mirrors
 * figma-track-phase1.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Same as collapseWs, but additionally strips leading markdown blockquote
 * `>` markers before collapsing — needed for mock-sentinels.md's verbatim
 * AC-3/AC-5/Decisions-Log quotes, which are authored as multi-line `>`
 * blockquotes. Mirrors fix-design-system-config-producer.test.mjs's helper
 * of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseBlockquote(str) {
  return str.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ').trim();
}

/**
 * Mirrors figma-track-phase1.test.mjs's helper of the same name/shape.
 * Locates the nearest `<h2 id="unreleased">` or `<h2 id="v...">` release
 * heading at or before `needleIdx`, and the position where that release
 * section ends (the next such heading, or end of file). A changelog entry
 * recorded under `Unreleased` moves, verbatim and in the same relative order
 * among its siblings, into a versioned heading exactly once — when a release
 * is cut (`documentation/AGENTS.md` §7.3: `Unreleased` is renamed to the new
 * version, and a fresh empty `Unreleased` block is created above it). This
 * helper lets a content-invariant test confirm an entry is recorded inside a
 * well-formed release section without pinning it to the transient
 * pre-release `Unreleased` position, which a release cut always invalidates.
 * @param {string} content
 * @param {number} needleIdx
 * @returns {{ id: string, start: number, end: number } | undefined}
 */
function findEnclosingReleaseSection(content, needleIdx) {
  const h2Re = /<h2 id="(unreleased|v[0-9][^"]*)">/g;
  let match;
  let enclosing;
  while ((match = h2Re.exec(content))) {
    if (match.index > needleIdx) break;
    enclosing = { id: match[1], start: match.index };
  }
  if (!enclosing) return undefined;
  h2Re.lastIndex = enclosing.start + 1;
  const next = h2Re.exec(content);
  return { id: enclosing.id, start: enclosing.start, end: next ? next.index : content.length };
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1) delta — `npm run validate`'s full check suite stays green
// (exit 0, zero [FAIL] lines) after this phase's changes land. The
// complementary "Given figma_track absent" precondition fact is
// EXISTING_TEST_COVERS via figma-track-phase1.test.mjs:161 (not duplicated
// here).
// ---------------------------------------------------------------------------

test('AC-A1: `node scripts/validate/index.mjs` (the real npm run validate entry point) exits 0 with zero [FAIL] lines after this phase\'s declaration-surface changes land', () => {
  assert.ok(existsSync(resolve(VALIDATE_INDEX_PATH)), 'expected scripts/validate/index.mjs to exist');

  let stdout = '';
  let status = 0;
  try {
    stdout = execFileSync(execPath, [VALIDATE_INDEX_PATH], { encoding: 'utf-8' });
  } catch (err) {
    // execFileSync throws on non-zero exit; capture what we can so a real
    // failure here produces a useful message instead of an opaque throw.
    const e = /** @type {{status?: number, stdout?: string}} */ (err);
    status = e.status ?? 1;
    stdout = e.stdout || '';
  }

  assert.equal(status, 0, `expected npm run validate to exit 0, got ${status}. Output:\n${stdout}`);
  assert.ok(!/\[FAIL\]/.test(stdout), `expected zero [FAIL] lines in npm run validate output:\n${stdout}`);
  assert.match(stdout, /\n\d+ passed, 0 failed \(\d+ checks run\)\n/);
  assert.match(stdout, /\[PASS\] gating-structure/, 'expected the gating-structure check (the one check this phase\'s diff adds a registry entry to) to report PASS');
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-1, AC-2) — prd-template.md's new `## Visual-First Mode`
// section: dual-branch conditional shape (gated on figma_track: true,
// non-heuristic), immediately preceding the existing `## Design Source`
// section; absent (not empty) from a PRD whose project hasn't opted in —
// this feature's own source PRD is the real dogfood proof.
// ---------------------------------------------------------------------------

test('AC-A2: prd-template.md registers `## Visual-First Mode` as a dual-branch conditional section, gated on figma_track: true, immediately before `## Design Source`', () => {
  const content = readRepoFile(PRD_TEMPLATE_PATH);

  const visualFirstIdx = content.indexOf('## Visual-First Mode');
  const designSourceIdx = content.indexOf('## Design Source');
  assert.notEqual(visualFirstIdx, -1, 'expected a ## Visual-First Mode heading');
  assert.notEqual(designSourceIdx, -1, 'expected the existing ## Design Source heading');
  assert.ok(visualFirstIdx < designSourceIdx, '## Visual-First Mode must precede ## Design Source');

  const block = sliceBetween(content, '## Visual-First Mode', '## Design Source');
  assert.ok(block, 'expected an extractable ## Visual-First Mode block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.match(collapsed, /Conditional — present ONLY when the target project's `docs\/context\/methodology\.md` declares `figma_track: true`; absent entirely, not an empty section, when `figma_track` is `false` or absent\./);
  assert.match(collapsed, /\*\*visual_first:\*\* `true` \| `false`/);
  assert.match(collapsed, /Never inferred from PRD content/);
});

test('AC-A2: prd-template.md states visual_first: true requires strict scope-pure visual/logic phase pairing via the Depends column, and (now that Phase 2 is implemented) registers the real Phase-pairing mechanism subsection delegating enforcement to prd-reviewer\'s R-COH-VISUAL-PAIRING-INCOMPLETE check', () => {
  const content = readRepoFile(PRD_TEMPLATE_PATH);
  const block = sliceBetween(content, '## Visual-First Mode', '## Design Source');
  assert.ok(block, 'expected an extractable ## Visual-First Mode block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.match(collapsed, /strictly scope-pure — either wholly visual or wholly logic, never mixed — paired 1:1 via the existing `Depends` column/);
  assert.match(collapsed, /Phase 2 of `PRPs\/prds\/figma-visual-first-track\.prd\.md`/);
  assert.match(collapsed, /### Phase-pairing mechanism/);
  assert.match(collapsed, /`prd-reviewer`'s `R-COH-VISUAL-PAIRING-INCOMPLETE` check enforces all of the above structurally, failing `CHANGES_REQUESTED` otherwise\./);
});

test('AC-A2 (real dogfood proof): this feature\'s own source PRD (figma-visual-first-track.prd.md) contains no ## Visual-First Mode section and no ## Design Source section — this repo\'s methodology.md does not declare figma_track: true, so the dual-branch template correctly produced neither', () => {
  const content = readRepoFile(THIS_PRD_PATH);
  assert.ok(!content.includes('## Visual-First Mode'), 'expected the source PRD itself to carry no ## Visual-First Mode section (figma_track is not declared true in this repo)');
  assert.ok(!content.includes('## Design Source'), 'expected the source PRD to also carry no ## Design Source section, for the same reason (sanity cross-check on the same dual-branch gate)');
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-2) — plan-template.md's new `phase_scope` conditional
// Metadata row: mirrors design_source's non-heuristic lineage (NOT
// phase_type's self-healing one), no companion section; absent from a plan
// whose source PRD doesn't declare visual_first: true — this feature's own
// phase 1 plan is the real dogfood proof.
// ---------------------------------------------------------------------------

test('AC-A3: plan-template.md registers `phase_scope` as a conditional Metadata row (visual | logic), gated on the source PRD\'s visual_first: true, immediately after the design_source paragraph', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);
  const block = sliceBetween(content, '**`design_source` (conditional).**', '**Conditional `## Design Source` section');
  assert.ok(block, 'expected an extractable design_source-then-phase_scope block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.match(collapsed, /\*\*`phase_scope` \(conditional\)\.\*\* Present \(`visual \| logic`\) only when the plan's source PRD declares `visual_first: true`; absent entirely otherwise\./);
});

test('AC-A3: plan-template.md states phase_scope is never inferred and explicitly contrasts design_source\'s lineage against phase_type\'s self-healing one', () => {
  const content = readRepoFile(PLAN_TEMPLATE_PATH);
  const block = sliceBetween(content, '**`phase_scope` (conditional).**', '**Conditional `## Design Source` section');
  assert.ok(block, 'expected an extractable phase_scope paragraph');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.match(collapsed, /Never inferred — mirrors `design_source`'s lineage exactly, NOT `phase_type`'s self-healing lineage\./);
  assert.match(collapsed, /is a business\/authoring decision, never something a reviewer manufactures on the plan-writer's behalf/);
  assert.match(collapsed, /Unlike `design_source`, `phase_scope` has no companion conditional section/);
});

test('AC-A3 (real dogfood proof): this feature\'s own phase 1 plan\'s ## Metadata TABLE carries no phase_scope or design_source row (only a prose paragraph explaining their absence) — its source PRD does not declare visual_first: true and this repo does not declare figma_track: true', () => {
  const content = readRepoFile(THIS_PLAN_PATH);
  const metadataBlock = /** @type {string} */ (sliceBetween(content, '## Metadata', '## Mandatory Reading'));
  assert.ok(metadataBlock, 'expected an extractable ## Metadata block');
  const tableRows = metadataBlock.split('\n').filter((line) => line.trim().startsWith('|'));

  assert.ok(!tableRows.some((row) => /\|\s*phase_scope\s*\|/i.test(row)), 'expected no phase_scope table row in this plan\'s own Metadata table');
  assert.ok(!tableRows.some((row) => /\|\s*design_source\s*\|/i.test(row)), 'expected no design_source table row in this plan\'s own Metadata table (same absence, for the same reason)');
  assert.match(content, /this table also carries no `phase_scope` row/, 'expected the plan\'s own prose to explain the phase_scope absence explicitly');
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-3) — docs/context/mock-sentinels.md documents both sentinel
// classes, the zero-side-effects rule (quoting source PRD AC-3 verbatim),
// and the paired logic phase's swap semantics; registered in
// docs/KNOWLEDGE_BASE.md.
// ---------------------------------------------------------------------------

test('AC-A4: mock-sentinels.md exists at its packaged plugins/relay/resources/ location (and no stub remains at the old docs/context/ location), and documents both sentinel classes with a language-agnostic inline-comment example each', () => {
  assert.ok(existsSync(resolve(MOCK_SENTINELS_PATH)), 'expected plugins/relay/resources/mock-sentinels.md to exist');
  assert.ok(
    !existsSync(resolve('docs/context/mock-sentinels.md')),
    'expected no stub left behind at the old docs/context/mock-sentinels.md location (figma-quota-resilience Phase 1 resource-packaging move)'
  );
  const content = readRepoFile(MOCK_SENTINELS_PATH);

  assert.match(content, /### `\[RELAY-MOCK-DATA\]`/);
  assert.match(content, /Wraps a literal displayed value standing in for real data/);
  assert.match(content, /### `\[RELAY-MOCK-BEHAVIOR\]`/);
  assert.match(content, /Wraps a handler or interaction standing in for real business logic/);
  // At least one inline-comment example of each class (deliberately
  // language-agnostic per the plan's Task 6 ACTION).
  assert.match(content, /\[RELAY-MOCK-DATA\] user's display name/);
  assert.match(content, /\[RELAY-MOCK-BEHAVIOR\] submit handler/);
});

test('AC-A4: mock-sentinels.md states the zero-side-effects rule binding on every phase_scope: visual plan, quoting source PRD AC-3 verbatim', () => {
  const content = readRepoFile(MOCK_SENTINELS_PATH);
  const block = sliceBetween(content, '## Zero side effects in the visual phase (binding)', '## Swap semantics');
  assert.ok(block, 'expected an extractable zero-side-effects section');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.match(collapsed, /Given a plan with `phase_scope: visual`, when the Implementer executes its tasks, then no task performs a network call, persists data, or mutates real application state — every displayed datum and interactive action is wrapped in a `\[RELAY-MOCK-DATA\]` or `\[RELAY-MOCK-BEHAVIOR\]` sentinel; `code-reviewer` fails the diff otherwise\./);
});

test('AC-A4: mock-sentinels.md documents swap semantics for the paired logic phase — resolving [RELAY-MOCK-DATA] replaces the value at the sentinel site, resolving [RELAY-MOCK-BEHAVIOR] preserves the approved choreography', () => {
  const content = readRepoFile(MOCK_SENTINELS_PATH);
  const block = sliceBetween(content, '## Swap semantics', '## Zero remaining sentinels');
  assert.ok(block, 'expected an extractable swap-semantics section');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.match(collapsed, /\*\*Resolving `\[RELAY-MOCK-DATA\]`:\*\* replace the literal mock value with the real data source/);
  assert.match(collapsed, /\*\*Resolving `\[RELAY-MOCK-BEHAVIOR\]`:\*\* fill in the real handler\/business logic in the "middle" of the already-approved choreography/);
  assert.match(collapsed, /The visual phase's approved choreography is a contract the logic phase must honor, not a scaffold it is free to redesign\./);
});

test('AC-A4: docs/KNOWLEDGE_BASE.md registers plugins/relay/resources/mock-sentinels.md in the Project Context section', () => {
  const content = readRepoFile(KNOWLEDGE_BASE_PATH);
  assert.match(content, /→ plugins\/relay\/resources\/mock-sentinels\.md — the \[RELAY-MOCK-DATA\]\/\[RELAY-MOCK-BEHAVIOR\] inline sentinel convention for phase_scope: visual plans \(Figma Visual-First Track\)/);
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-5) — mock-sentinels.md documents the "zero remaining
// sentinels, no deferral path" rule, quoting source PRD AC-5 and its
// Decisions Log "Sentinel deferral policy" row verbatim.
// ---------------------------------------------------------------------------

test('AC-A5: mock-sentinels.md states the zero-remaining-sentinels rule with no deferral path, quoting source PRD AC-5 verbatim', () => {
  const content = readRepoFile(MOCK_SENTINELS_PATH);
  const block = sliceBetween(content, '## Zero remaining sentinels — no deferral path (binding)', '## Cross-references');
  assert.ok(block, 'expected an extractable zero-remaining-sentinels section');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.match(collapsed, /Given a `phase_scope: logic` plan paired with an already-complete visual phase, when the Implementer completes its tasks, then zero `\[RELAY-MOCK-DATA\]`\/`\[RELAY-MOCK-BEHAVIOR\]` sentinels remain in the feature's visual-phase files — validation fails otherwise, with no deferral path\./);
  assert.match(collapsed, /There is no recorded-justification escape hatch\./);
});

test('AC-A5: mock-sentinels.md quotes the source PRD\'s Decisions Log "Sentinel deferral policy" row verbatim (never allowed, no recorded-justification alternative)', () => {
  const content = readRepoFile(MOCK_SENTINELS_PATH);
  const block = sliceBetween(content, '## Zero remaining sentinels — no deferral path (binding)', '## Cross-references');
  assert.ok(block, 'expected an extractable zero-remaining-sentinels section');
  const collapsed = collapseBlockquote(/** @type {string} */ (block));

  assert.match(collapsed, /\*\*Choice:\*\* Never allowed — logic-phase validation requires zero remaining sentinels/);
  assert.match(collapsed, /\*\*Alternatives considered:\*\* Allowed with a recorded justification \(e\.g\. a feature flag still off\)/);
});

test('AC-A5: mock-sentinels.md explicitly states that BOTH Phase 3 (zero-side-effects enforcement, plan-reviewer\'s R-COH-VISUAL-SCOPE-PURITY check) AND Phase 4 (the zero-remaining sentinel-ledger check, plan-reviewer\'s R-COH-SENTINEL-RESOLUTION-MISSING check) have shipped', () => {
  const content = readRepoFile(MOCK_SENTINELS_PATH);
  const collapsed = collapseWs(content);

  assert.match(collapsed, /\*\*Enforcement layers, starting in Phase 3\.\*\* This file \(`figma-visual-first-track` Phase 1, Foundations\) documents the convention only\./);
  assert.match(
    collapsed,
    /Zero-side-effects enforcement at plan-review time \(`plan-reviewer`'s `R-COH-VISUAL-SCOPE-PURITY` check\) shipped in Phase 3; the zero-remaining sentinel-ledger check \(`plan-reviewer`'s `R-COH-SENTINEL-RESOLUTION-MISSING` check, requiring both a sentinel-resolution task and a VALIDATE command targeting zero remaining sentinels\) shipped in Phase 4\./
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-4) — design-spec-template.md's Visual Acceptance Criteria
// table gains an optional, additive 9th `Interaction` column; the original
// 8 fields remain the mandatory completeness scope, unchanged, so an
// already-APPROVED spec authored before this phase stays fully valid.
// ---------------------------------------------------------------------------

test('AC-A6: design-spec-template.md\'s Visual Acceptance Criteria table header gains a 9th `Interaction` column after the existing 8 (Frame, Route, Preconditions, Auth mode, Viewport, Diff threshold, Ref PNG, Masks)', () => {
  const content = readRepoFile(DESIGN_SPEC_TEMPLATE_PATH);
  assert.match(
    content,
    /\| Frame \(node-id\) \| Route \| Preconditions \| Auth mode \| Viewport \| Diff threshold \| Ref PNG \(path \+ dims\) \| Masks \| Interaction \|/
  );
});

test('AC-A6: design-spec-template.md\'s Interaction column cell describes the bounded click/fill/wait vocabulary, executed in order before capture, defaulting to "none"', () => {
  const content = readRepoFile(DESIGN_SPEC_TEMPLATE_PATH);
  assert.match(
    content,
    /optional ordered interaction script — semicolon-separated steps from the bounded vocabulary click\(<selector>\), fill\(<selector>, <value>\), wait\(<ms> \\\| <selector>\), executed in order before capture; or "none"/
  );
});

test('AC-A6: design-spec-template.md\'s Section reference states the original 8 fields stay the mandatory, unchanged R-DS7 completeness scope, with Interaction optional/additive and never retroactively required', () => {
  const content = readRepoFile(DESIGN_SPEC_TEMPLATE_PATH);
  const block = sliceBetween(content, '- **`## Visual Acceptance Criteria`**', 'The spec ends with');
  assert.ok(block, 'expected an extractable Visual Acceptance Criteria section-reference bullet');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.match(collapsed, /all eight original fields present and non-empty/);
  assert.match(collapsed, /this completeness scope is UNCHANGED by the 9th, optional `Interaction` column below/);
  assert.match(collapsed, /`design-spec-reviewer`'s R-DS7 continues to enforce exactly the same eight-field scope, never the 9th\./);
  assert.match(collapsed, /`Interaction` is optional and additive, never retroactively required on an already-APPROVED spec/);
  assert.match(collapsed, /frames without an `Interaction` entry behave byte-identically to today\./);
  assert.match(collapsed, /This phase registers only the column's shape and bounded vocabulary syntax — it does NOT wire `design-spec-writer`, `design-spec-reviewer`, or `capture\.mjs` to author, validate, or execute the column/);
});

// ---------------------------------------------------------------------------
// AC-A1..AC-A7 (documentation of record, per Task 8's own ADDRESSES tag) —
// documentation/changelog.html's Unreleased -> Added section records this
// phase's three declaration surfaces, positioned before any versioned
// release heading. (version-parity re-validation against this same file
// addition is EXISTING_TEST_COVERS via figma-track-phase1.test.mjs:205,
// which re-reads the live file on every run — not duplicated here.)
// ---------------------------------------------------------------------------

test('AC-A1..AC-A7 (documentation of record): changelog.html\'s Unreleased -> Added section records visual_first/phase_scope/visual_first_approval, mock-sentinels.md, the Interaction column, and the gating-structure SITES extension, inside a well-formed release section (still Unreleased, or the versioned release Unreleased was later cut into — see documentation/AGENTS.md §7.3)', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  assert.notEqual(content.indexOf('<h2 id="unreleased">Unreleased</h2>'), -1, 'expected an id="unreleased" heading');

  assert.match(
    content,
    /<code>visual_first<\/code> \(PRD-level\), <code>phase_scope<\/code> \(plan Metadata\), and <code>visual_first_approval<\/code> \(methodology, default <code>auto<\/code>\) declaration surfaces added/
  );
  assert.match(content, /New <code>docs\/context\/mock-sentinels\.md<\/code> documents the <code>\[RELAY-MOCK-DATA\]<\/code>\/<code>\[RELAY-MOCK-BEHAVIOR\]<\/code> convention/);
  assert.match(content, /the Design Spec's Visual Acceptance Criteria table gains an optional <code>Interaction<\/code> column/);
  assert.match(content, /<code>gating-structure<\/code>'s <code>SITES<\/code> registry extended with <code>visual_first_approval<\/code>/);
  assert.match(content, /Part of the Figma Visual-First Track, Phase 1 of <code>PRPs\/prds\/figma-visual-first-track\.prd\.md<\/code>\./);

  const entryIdx = content.indexOf('<code>visual_first</code> (PRD-level)');
  assert.notEqual(entryIdx, -1, 'expected the Phase 1 entry text to be present');

  const section = findEnclosingReleaseSection(content, entryIdx);
  assert.ok(section, 'expected the entry to sit within a well-formed release section (an id="unreleased" or id="v..." heading)');
  assert.ok(
    entryIdx < /** @type {{ end: number }} */ (section).end,
    'expected the entry to sit fully within its enclosing release section, not spill past the next one'
  );
});
