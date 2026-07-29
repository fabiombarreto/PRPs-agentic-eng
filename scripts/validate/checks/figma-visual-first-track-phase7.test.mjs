// @ts-check
/**
 * Real-behavioral + content-invariant tests for Phase 7 ("Surface
 * integration + dogfood", the FINAL phase) of the figma-visual-first-track
 * feature (v2 of relay's Figma Implementation Track) — the new
 * `loadPhaseScopes()`/`loadVisualApprovalLine()` pure functions and the
 * conditional Scope-column/approval-line render path added to
 * `scripts/generate-final-report.mjs`; the matching prose extension in
 * `plugins/relay/commands/relay-qa-report.md`'s "## Visual Fidelity section
 * (figma_track-gated)"; the one appended sentence in
 * `plugins/relay/commands/relay-pr.md`; the `docs/api-reference.md` +
 * `documentation/` three-file registration of `/relay-visual-approve` (plus
 * the stale Fifteen/18-commands count correction to Nineteen/19); and the
 * new `docs/design/visual-first-dogfood-runbook.md` checklist artifact.
 *
 * Source PRD: PRPs/prds/figma-visual-first-track.prd.md
 * Source plan: PRPs/plans/completed/figma-visual-first-track-phase-7-surface-integration-dogfood.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed (15/15 on attempt 1), IMPLEMENTED phase 7 plan — the FINAL
 * phase of this track.
 *
 * Existing-coverage scan performed before authoring (Step 2.1): a
 * dispatched Explore-agent sweep grepped every scripts/validate/checks/*
 * .test.mjs file (29 files) for loadPhaseScopes, loadVisualApprovalLine,
 * generate-final-report, relay-visual-approve (case-insensitive), "Nineteen
 * commands", phase_scope-aware, visual-first-dogfood-runbook,
 * figma-visual-first-track-phase-7, GENERATE_FINAL_REPORT, and
 * runGenerateFinalReport. Result: `loadPhaseScopes`, `loadVisualApprovalLine`,
 * "Nineteen commands", `phase_scope-aware`, and `visual-first-dogfood-runbook`
 * are ZERO-HIT anywhere in the existing corpus — genuinely virgin territory;
 * NEW_TEST_REQUIRED throughout for those properties. `relay-visual-approve`
 * hits are all incidental (a `LEGITIMATE_REFERENCE_FILES` allowlist entry in
 * figma-track-phase3/4.test.mjs; a halt.json message string quoted verbatim
 * in figma-visual-first-track-phase5.test.mjs; figma-visual-first-track-
 * phase6.test.mjs's OWN Phase 6 coverage of relay-visual-approve.md itself)
 * — none overlaps this phase's own new surfaces (generate-final-report.mjs's
 * dual-mode render, the docs/api-reference.md + documentation/ registration,
 * the dogfood runbook). One genuine partial-coverage carve-out:
 * `scripts/generate-final-report.mjs` is ALREADY under real CLI-invocation
 * test by `figma-track-phase7.test.mjs` (the SIBLING base-track's own Phase
 * 7 file, same script) via its own `GENERATE_FINAL_REPORT`/
 * `runGenerateFinalReport()` helpers — its two AC-A1 tests (lines 255-275:
 * the section-omitted-entirely-across-3-empty-evidence-variants property;
 * lines 277-311: bare-array + `{frames:[...]}`-wrapped aggregation into the
 * ORIGINAL five-column table) pin the PRE-this-phase rendering shape.
 * EXISTING_TEST_COVERS, not re-asserted here — this file's own CLI-invocation
 * tests below assert only the missing-property delta this phase's diff adds
 * (the Scope column, the approval lines, and their conditional-omission
 * rules), never re-testing the base five-column shape or the zero-fidelity-
 * report omission property those two existing tests already own. The same
 * partial-coverage pattern applies to `relay-qa-report.md`'s "## Visual
 * Fidelity section (figma_track-gated)" block and `relay-pr.md`'s "Full
 * body path" prose — figma-track-phase7.test.mjs's own tests (lines 313-328
 * and 358-368 respectively) already pin the pre-this-phase sentences in
 * both files (unchanged by this phase's diff, confirmed by direct re-read);
 * this file's own tests below assert only the NEW sentences/paragraphs Task
 * 2/Task 3 of this phase's plan appended. Likewise `docs/api-reference.md`'s
 * existing "Design system (Figma track)" framing and its
 * `/relay-visual-review` row are already pinned by figma-track-phase7
 * .test.mjs's own AC-A4 test (lines 525-541, confirmed still verbatim-present
 * post-diff); this file's tests cover only the count correction and the new
 * "Figma Visual-First Track" subsection Task 4 appended.
 *
 * ENVIRONMENT-DEPENDENCY NOTE (governs why generate-final-report.mjs is
 * exercised via a real child-process CLI invocation, mirroring
 * figma-track-phase7.test.mjs's own established, sanctioned approach, never
 * a direct `import`): every function in that module is unexported, and
 * `main()` runs UNCONDITIONALLY at module load (no
 * `import.meta.url === pathToFileURL(process.argv[1])` guard) — importing it
 * directly would execute `main()` against the test runner's own
 * `process.argv` and call `process.exit()` inside the shared test process.
 * `execFileSync` against a throwaway fixture directory is the safe,
 * real-behavioral path — the same one this feature's own plan Level 3
 * DRY-RUN validation already established as sanctioned, and the one
 * figma-track-phase7.test.mjs already proved works in this exact repo/
 * environment. Unlike that sibling file's `withTempReportsDir` (which hands
 * the bare temp dir straight to the script as `reportsDir`), every fixture
 * below nests a full `<tmp>/PRPs/reports/<feature>/` + `<tmp>/PRPs/plans/`
 * (or `<tmp>/PRPs/plans/completed/`) tree — `loadPhaseScopes`'s own
 * `resolve(reportsDir, '..', '..')` plans-root computation requires that
 * exact two-level nesting to find (or deterministically NOT find) a
 * `plans/` directory; relying on the ambient OS temp-dir's own two-levels-up
 * shape (as a bare `withTempReportsDir` fixture would) is not deterministic
 * for this specific code path, so every fixture below constructs its own
 * `PRPs/` tree explicitly instead.
 *
 * Traceability (PRPs/prds/figma-visual-first-track.prd.md Acceptance
 * Criteria, filtered to phase 7's in-scope subset per the plan's own
 * ## Acceptance Criteria section AC-A1 through AC-A5; PRD AC-2, AC-3, AC-5
 * are OUT_OF_PHASE_SCOPE — AC-2 (strict phase pairing, phase 2's own
 * writer/reviewer changes), AC-3 (zero side effects in the visual phase,
 * phase 3's own plan-writer/reviewer changes), and AC-5 (sentinel ledger
 * resolution, phase 4's own ledger-derivation changes) are already shipped
 * by earlier phases and not re-touched here — no test for any of them in
 * this file):
 *
 *   AC-A1 (PRD AC-1, "inert when off") — generate-final-report.mjs's Scope
 *     column / approval lines stay OMITTED (never an empty placeholder)
 *     across four distinct zero-or-ambiguous-evidence shapes: no plan tree
 *     discoverable at all, a plan found but carrying no phase_scope row (the
 *     real base-track scenario), a phase_scope value outside visual|logic,
 *     and two plan files ambiguously matching the same phase.
 *   AC-A2 (PRD AC-6, "recorded and surfaced, never silently dropped") — the
 *     mixed-scenario test pins the literal em-dash fallback for a phase with
 *     no discoverable scope, alongside a sibling phase's real value,
 *     matching the row template's four existing `?? '—'` usages; plus the
 *     relay-qa-report.md / relay-pr.md missing-property-delta prose tests.
 *   AC-A3 (PRD AC-4, human-review visibility) — an approved decision's exact
 *     rendered line; a rejected decision plus the documented LAST-line-wins
 *     contract over a multi-line visual-approval.jsonl; a truncated/
 *     malformed last line degrading gracefully (no throw, Scope column
 *     unaffected, approval line silently omitted — the known low-severity
 *     advisory already filed as a follow-up task; NOT pinned as correct that
 *     no warning is emitted, only that nothing throws or corrupts the Scope
 *     column).
 *   AC-A4 (PRD AC-1, documentation registration) — docs/api-reference.md's
 *     count correction (19, not 18) plus its new "Figma Visual-First Track"
 *     subsection; documentation/reference/commands.html's count correction
 *     (Nineteen, not Fifteen) plus its new h2/h3 section; documentation/
 *     assets/data/search-index.json's dedicated entry plus the Commands
 *     entry's corrected excerpt (validated via a real JSON.parse, not a
 *     grep); documentation/changelog.html's Phase 7 bullet and its ordering.
 *   AC-A5 (PRD AC-4, dogfood scope item) — docs/design/visual-first-dogfood-
 *     runbook.md exists and enumerates concrete checkpoints for BOTH the
 *     auto-mode and human-mode (plus rejection) approval paths, not just a
 *     keyword mention of each.
 *   (regression safety net, not itself AC-A1..AC-A5) — runPathExistenceCheck()
 *     stays clean after this phase's seven changed/created files.
 *
 * Run: node --test scripts/validate/checks/figma-visual-first-track-phase7.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runPathExistenceCheck } from './path-existence.mjs';
import { withScanRootLock } from './scan-root-lock.mjs';

const RELAY_QA_REPORT_PATH = 'plugins/relay/commands/relay-qa-report.md';
const RELAY_PR_PATH = 'plugins/relay/commands/relay-pr.md';
const API_REFERENCE_PATH = 'docs/api-reference.md';
const COMMANDS_HTML_PATH = 'documentation/reference/commands.html';
const SEARCH_INDEX_PATH = 'documentation/assets/data/search-index.json';
const CHANGELOG_PATH = 'documentation/changelog.html';
const DOGFOOD_RUNBOOK_PATH = 'docs/design/visual-first-dogfood-runbook.md';

// Retargeted 2026-07-29: generate-final-report.mjs moved from scripts/ into
// plugins/relay/scripts/ ("move relay's three helper scripts into the
// plugin" plan) so ${CLAUDE_PLUGIN_ROOT}/scripts/... resolves in a real
// packaged install. The relative specifier below now points at the script's
// new home; the CLI-invocation contract this file exercises is unchanged.
const GENERATE_FINAL_REPORT = fileURLToPath(new URL('../../../plugins/relay/scripts/generate-final-report.mjs', import.meta.url));

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors figma-visual-first-track-phase1-6.test.mjs's helper of the same
 * name/shape.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-visual-first-track-phase1-6
 * .test.mjs's helper of the same name/shape.
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
 * figma-visual-first-track-phase1-6.test.mjs's helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
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

/**
 * Creates a throwaway temp root, hands it to `fn`, and always cleans up
 * afterward (even on assertion failure). Deliberately named/shaped
 * differently from figma-track-phase7.test.mjs's own `withTempReportsDir`
 * (which hands the bare dir straight to the script as `reportsDir`): every
 * fixture in THIS file needs a full `PRPs/reports/<feature>/` +
 * `PRPs/plans/` tree nested under one root, per the ENVIRONMENT-DEPENDENCY
 * NOTE above.
 * @template T
 * @param {(root: string) => T} fn
 * @returns {T}
 */
function withTempRoot(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-figvfp7-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Runs the real generate-final-report.mjs script as a child process against
 * `reportsDir` (which must already carry a run.json), writes
 * <reportsDir>/final-report.md, and returns its contents. A non-zero exit
 * throws (execFileSync's own behavior) — none of the fixtures below are
 * malformed in a way the script itself rejects, so a throw here signals a
 * genuine regression, not an expected-failure path. Mirrors
 * figma-track-phase7.test.mjs's helper of the same name/shape.
 * @param {string} reportsDir
 * @returns {string}
 */
function runGenerateFinalReport(reportsDir) {
  const outPath = join(reportsDir, 'final-report.md');
  execFileSync(process.execPath, [GENERATE_FINAL_REPORT, reportsDir, '--out', outPath], { encoding: 'utf-8' });
  return readFileSync(outPath, 'utf-8');
}

/** @param {string} scope */
function planMetadataWithScope(scope) {
  return `## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_scope | ${scope} |\n`;
}

const PLAN_METADATA_NO_SCOPE_ROW = '## Metadata\n\n| Key | Value |\n|-----|-------|\n| phase_type | feature |\n';

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1) — Inert when off: generate-final-report.mjs's Scope
// column / approval lines stay omitted (never an empty placeholder) across
// four distinct zero-or-ambiguous phase_scope-evidence shapes.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-1, real CLI invocation): given real frames to render but ZERO plan tree discoverable at all under the resolved plans root, the table stays byte-identical to the base-track five-column shape — no Scope column, no approval lines', () => {
  withTempRoot((root) => {
    const reportsDir = join(root, 'PRPs', 'reports', 'figvfp7-omit-fixture');
    mkdirSync(join(reportsDir, 'phase-30', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature: 'figvfp7-omit-fixture', run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-30', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0.3, threshold: 2, status: 'PASS' }])
    );
    // Deliberately no PRPs/plans/ directory anywhere under `root` — the
    // resolved plansRoot (`root/PRPs`) exists, but its own `plans`
    // subdirectory does not.

    const report = runGenerateFinalReport(reportsDir);
    assert.match(report, /## Visual Fidelity/);
    assert.doesNotMatch(report, /\| Scope \|/);
    assert.doesNotMatch(report, /human visual approval/);
    assert.match(
      report,
      /\| Phase \| Node ID \| Route \| Diff % \| Threshold \| Status \|\n\|-------\|---------\|-------\|--------\|-----------\|--------\|\n\| phase-30 \| 1:1 \| \/ \| 0\.3 \| 2 \| PASS \|\n/
    );
  });
});

test('AC-A1 (PRD AC-1, real CLI invocation): given a plan file IS found for the contributing phase but its own ## Metadata table carries no phase_scope row at all (the real base-track scenario, distinct from zero plans discoverable) — same omission, never a throw', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-norow-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-31-widget.plan.md`), PLAN_METADATA_NO_SCOPE_ROW);
    mkdirSync(join(reportsDir, 'phase-31', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-31', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '2:2', route: '/x', diff_percent: 0.1, threshold: 2, status: 'PASS' }])
    );

    const report = runGenerateFinalReport(reportsDir);
    assert.doesNotMatch(report, /\| Scope \|/);
    assert.doesNotMatch(report, /human visual approval/);
    assert.match(report, /\| phase-31 \| 2:2 \| \/x \| 0\.1 \| 2 \| PASS \|\n/);
  });
});

test('AC-A1 (PRD AC-1, real CLI invocation): given a plan\'s phase_scope cell carries a value outside the visual|logic vocabulary, it is treated identically to an absent row — same omission, never a throw', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-invalid-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-32-widget.plan.md`), planMetadataWithScope('frontend'));
    mkdirSync(join(reportsDir, 'phase-32', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-32', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '3:3', route: '/y', diff_percent: 0.2, threshold: 2, status: 'PASS' }])
    );

    const report = runGenerateFinalReport(reportsDir);
    assert.doesNotMatch(report, /\| Scope \|/);
    assert.doesNotMatch(report, /human visual approval/);
  });
});

test('AC-A1 (PRD AC-1, real CLI invocation): given two plan files ambiguously match the same phase-<N> filename pattern in the same directory, the phase is treated as undiscoverable (never a lucky pick of either candidate), never a throw', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-ambiguous-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(root, 'PRPs', 'plans'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-33-a.plan.md`), planMetadataWithScope('visual'));
    writeFileSync(join(root, 'PRPs', 'plans', `${feature}-phase-33-b.plan.md`), planMetadataWithScope('visual'));
    mkdirSync(join(reportsDir, 'phase-33', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-33', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '4:4', route: '/z', diff_percent: 0.4, threshold: 2, status: 'PASS' }])
    );

    const report = runGenerateFinalReport(reportsDir);
    assert.doesNotMatch(report, /\| Scope \|/);
    assert.doesNotMatch(report, /human visual approval/);
  });
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-6) — recorded and surfaced, never silently dropped: the
// mixed-scenario pins the literal em-dash fallback alongside a sibling
// phase's real recorded value.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-6, real CLI invocation): given exactly one contributing phase declares phase_scope (discovered via the documented PRPs/plans/completed/ fallback), the Scope column activates for every row; a sibling phase with no discoverable scope renders the literal em-dash "—" — matching the row template\'s four existing `?? \'—\'` fallbacks — and a non-null phase_scope alone does not force an approval line without a real visual-approval.jsonl file', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-mixed-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    // Deliberately placed under plans/completed/ ONLY (not plans/) —
    // exercises the documented "search plans/ first, fall back to
    // plans/completed/" fallback path, the same path this feature's own
    // now-IMPLEMENTED plan lives under.
    mkdirSync(join(root, 'PRPs', 'plans', 'completed'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', 'completed', `${feature}-phase-34-widget.plan.md`), planMetadataWithScope('visual'));
    mkdirSync(join(reportsDir, 'phase-34', 'visual', '1'), { recursive: true });
    mkdirSync(join(reportsDir, 'phase-35', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-34', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '1:1', route: '/', diff_percent: 0.1, threshold: 2, status: 'PASS' }])
    );
    writeFileSync(
      join(reportsDir, 'phase-35', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '2:2', route: '/other', diff_percent: 0.2, threshold: 2, status: 'PASS' }])
    );
    // No visual-approval.jsonl anywhere — proves a declared phase_scope
    // alone never fabricates an approval line.

    const report = runGenerateFinalReport(reportsDir);
    assert.ok(report.includes('| Phase | Node ID | Route | Diff % | Threshold | Status | Scope |'), 'expected the six-column header with Scope appended');
    assert.ok(report.includes('|-------|---------|-------|--------|-----------|--------|-------|'), 'expected the six-column separator row');
    assert.ok(report.includes('| phase-34 | 1:1 | / | 0.1 | 2 | PASS | visual |'), 'expected phase-34\'s row to carry its real declared scope');
    assert.ok(report.includes('| phase-35 | 2:2 | /other | 0.2 | 2 | PASS | — |'), 'expected phase-35\'s row (no discoverable scope) to render the literal em-dash, not blank or "N/A"');
    assert.doesNotMatch(report, /human visual approval/, 'expected no approval line for either phase — neither has a visual-approval.jsonl file');
  });
});

test('AC-A1, AC-A2 (PRD AC-1, AC-6): relay-qa-report.md\'s "## Visual Fidelity section (figma_track-gated)" prose gains the phase_scope-/approval-aware extension — the missing-property delta over figma-track-phase7.test.mjs\'s own qa-report test (lines 313-328), which already pins the unchanged original figma_track-gated sentences and is not re-asserted here', () => {
  const content = readRepoFile(RELAY_QA_REPORT_PATH);
  const block = sliceBetween(content, '## Visual Fidelity section (figma_track-gated)', '## Phase 2 — Preconditions (HALTs)');
  assert.ok(block, 'expected an extractable Visual Fidelity section block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes("Since the Figma Visual-First Track's own Phase 7, this section is additionally `phase_scope`- and human-approval-aware."),
    'expected the new phase_scope-/approval-aware framing sentence'
  );
  assert.ok(
    collapsed.includes(
      'When at least one discovered phase declares a `phase_scope` value, add a sixth "Scope" column to the per-frame table — omitted entirely, five columns unchanged, when no phase declares one, the same conditional-column rule `plugins/relay/scripts/generate-final-report.mjs`\'s own extension applies, so both surfaces stay consistent with each other.'
    ),
    'expected the conditional Scope-column rule, cross-referenced to generate-final-report.mjs'
  );
  assert.ok(
    collapsed.includes(
      "For every phase that both declares `phase_scope` AND has a `PRPs/reports/<feature>/phase-<N>/visual-approval.jsonl` file, append one line below the table per such phase summarizing the recorded human decision (approved/rejected, with the verbatim confirmation or rejection-feedback text) parsed from that file's last line."
    ),
    'expected the per-phase approval-line append rule'
  );
  assert.ok(
    collapsed.includes(
      'This extension never infers a `phase_scope` or approval decision — both are sourced only from real, on-disk evidence, mirroring this section\'s own "sourced entirely from already-persisted evidence on disk" sentence above.'
    ),
    'expected the never-infers, real-evidence-only closing sentence'
  );
});

test('AC-A1, AC-A2 (PRD AC-1, AC-6): relay-pr.md gains exactly one new sentence, positioned immediately after the existing "...omitted entirely (no heading, no placeholder) for a non-Figma project or when no visual-verification evidence exists yet." sentence — the missing-property delta over figma-track-phase7.test.mjs\'s own relay-pr.md test (lines 358-368), which already pins the unchanged surrounding sentences and is not re-asserted here', () => {
  const content = readRepoFile(RELAY_PR_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "omitted entirely (no heading, no placeholder) for a non-Figma project or when no visual-verification evidence exists yet. Since the Figma Visual-First Track's own Phase 7, this same `generate-final-report.mjs` call additionally renders the section as phase_scope-aware (an added Scope column, present only when a phase's own plan declares `phase_scope`) and surfaces any recorded `/relay-visual-approve` human decision (approved/rejected) from a discovered `phase-<N>/visual-approval.jsonl` file — again inherited automatically from the one existing script invocation this step already makes, with no new flag or invocation."
    ),
    'expected the new phase_scope-aware sentence positioned immediately after the existing omission sentence, proving adjacency in one assertion'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-4) — a recorded human decision (approved or rejected)
// becomes visible; the documented LAST-line-wins contract; graceful
// degradation on a malformed jsonl.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-4, real CLI invocation): an approved human decision\'s confirmation_text and timestamp render as the exact documented markdown line', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-approved-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(root, 'PRPs', 'plans', 'completed'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', 'completed', `${feature}-phase-40-widget.plan.md`), planMetadataWithScope('visual'));
    mkdirSync(join(reportsDir, 'phase-40', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-40', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '5:5', route: '/a', diff_percent: 0.1, threshold: 2, status: 'PASS' }])
    );
    writeFileSync(
      join(reportsDir, 'phase-40', 'visual-approval.jsonl'),
      JSON.stringify({
        timestamp: '2026-07-27T00:00:00Z',
        feature,
        phase_N: 40,
        decision: 'approved',
        confirmation_text: 'Looks correct',
        fidelity_report_path: `PRPs/reports/${feature}/phase-40/visual/1/fidelity-report.json`,
      }) + '\n'
    );

    const report = runGenerateFinalReport(reportsDir);
    assert.ok(
      report.includes('- **phase-40** human visual approval: **approved**: "Looks correct" (2026-07-27T00:00:00Z)'),
      'expected the exact approved-decision markdown line'
    );
  });
});

test('AC-A3 (PRD AC-4, real CLI invocation): a rejected decision\'s rejection_feedback renders, and loadVisualApprovalLine uses only the LAST non-empty line of a multi-line visual-approval.jsonl — an earlier superseded entry, and a trailing blank line, never leak into the rendered output', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-lastline-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(root, 'PRPs', 'plans', 'completed'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', 'completed', `${feature}-phase-41-widget.plan.md`), planMetadataWithScope('visual'));
    mkdirSync(join(reportsDir, 'phase-41', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-41', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '6:6', route: '/b', diff_percent: 0.1, threshold: 2, status: 'PASS' }])
    );
    const firstLine = JSON.stringify({
      timestamp: '2026-07-27T01:00:00Z',
      feature,
      phase_N: 41,
      decision: 'rejected',
      rejection_feedback: 'contrast too low',
      fidelity_report_path: 'x',
    });
    const secondLine = JSON.stringify({
      timestamp: '2026-07-27T02:00:00Z',
      feature,
      phase_N: 41,
      decision: 'approved',
      confirmation_text: 'now correct',
      fidelity_report_path: 'x',
    });
    // Trailing blank line deliberately included — proves the non-empty-line
    // filter correctly skips it and still finds the real last JSON line.
    writeFileSync(join(reportsDir, 'phase-41', 'visual-approval.jsonl'), `${firstLine}\n${secondLine}\n\n`);

    const report = runGenerateFinalReport(reportsDir);
    assert.ok(
      report.includes('- **phase-41** human visual approval: **approved**: "now correct" (2026-07-27T02:00:00Z)'),
      'expected only the LAST line\'s decision to render'
    );
    assert.ok(!report.includes('contrast too low'), 'expected the earlier, superseded rejected entry to never appear');
    assert.ok(!report.includes('rejected'), 'expected no trace of the superseded "rejected" decision anywhere in the output');
  });
});

test('AC-A3 (PRD AC-4, real CLI invocation): a truncated/malformed last line in visual-approval.jsonl degrades gracefully — no throw, the Scope column still renders correctly from the (valid) paired plan, and only the approval line is silently omitted', () => {
  withTempRoot((root) => {
    const feature = 'figvfp7-malformed-fixture';
    const reportsDir = join(root, 'PRPs', 'reports', feature);
    mkdirSync(join(root, 'PRPs', 'plans', 'completed'), { recursive: true });
    writeFileSync(join(root, 'PRPs', 'plans', 'completed', `${feature}-phase-42-widget.plan.md`), planMetadataWithScope('logic'));
    mkdirSync(join(reportsDir, 'phase-42', 'visual', '1'), { recursive: true });
    writeFileSync(join(reportsDir, 'run.json'), JSON.stringify({ feature, run_id: 'r1', outcome: 'GREEN' }));
    writeFileSync(
      join(reportsDir, 'phase-42', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([{ node_id: '7:7', route: '/c', diff_percent: 0.1, threshold: 2, status: 'PASS' }])
    );
    // Deliberately truncated mid-object — invalid JSON on its own line.
    writeFileSync(join(reportsDir, 'phase-42', 'visual-approval.jsonl'), '{"timestamp": "2026-07-27T00:00');

    // Known low-severity advisory (follow-up task already filed): this path
    // currently swallows the parse failure with no stderr warning, unlike
    // the script's own readJsonIfExists helper. Deliberately NOT asserting
    // anything about stderr/warning presence or absence here, so a future
    // fix adding a warning does not have to fight this test — only the two
    // externally observable properties (no throw; Scope column unaffected;
    // approval line omitted) are pinned.
    let report = '';
    assert.doesNotThrow(() => {
      report = runGenerateFinalReport(reportsDir);
    });
    assert.ok(report.includes('| phase-42 | 7:7 | /c | 0.1 | 2 | PASS | logic |'), 'expected the Scope column to render correctly from the valid plan despite the broken jsonl');
    assert.doesNotMatch(report, /human visual approval/, 'expected the approval line to be silently omitted, never a placeholder or a throw');
  });
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1) — three-site + api-reference documentation registration
// of /relay-visual-approve, plus the stale Fifteen/18-commands count
// correction to Nineteen/19 in the same edit.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-1): docs/api-reference.md\'s command count is corrected to "19 commands" (both occurrences) with "18 commands" entirely absent, and the opening paragraph names /relay-visual-approve as the fourth standalone command, gated by visual_first_approval: human rather than figma_track directly', () => {
  const content = readRepoFile(API_REFERENCE_PATH);

  const nineteenOccurrences = (content.match(/19 commands/g) || []).length;
  assert.equal(nineteenOccurrences, 2, 'expected exactly two occurrences of "19 commands" (re-derived count, guarding the repo\'s own persistent count-drift defect class)');
  assert.doesNotMatch(content, /18 commands/, 'expected the stale "18 commands" count to be entirely absent');

  const collapsed = collapseWs(content);
  assert.ok(
    collapsed.includes(
      "plus a fourth standalone command, `/relay-visual-approve`, belonging to the sibling Figma Visual-First Track and gated by `visual_first_approval: human` (itself only reachable when `figma_track: true` AND `visual_first: true`) rather than `figma_track` directly — also never invoked by `/relay-execute`."
    ),
    'expected the fourth-standalone-command clause naming its gate precisely'
  );
});

test('AC-A4 (PRD AC-1): docs/api-reference.md gains a new "#### Figma Visual-First Track" subsection immediately after the existing "Design system (Figma track)" table, registering /relay-visual-approve with its three HALT codes', () => {
  const content = readRepoFile(API_REFERENCE_PATH);
  const block = sliceBetween(content, '#### Figma Visual-First Track', '#### Pillar 3 (commit + PR + approval cycle)');
  assert.ok(block, 'expected an extractable Figma Visual-First Track subsection');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "A sibling, dependent track to the Design system (Figma track) commands above — reachable only once `figma_track: true` AND `visual_first: true` are both declared. Never invoked by `/relay-execute`."
    ),
    'expected the sibling/dependent-track framing sentence'
  );
  assert.ok(
    collapsed.includes('`/relay-visual-approve <feature>` ✅ **implemented** (`visual_first_approval: human` gate)'),
    'expected the registered command row naming its own gate'
  );
  assert.ok(
    collapsed.includes('Three HALT codes: `FAILED_NOTHING_TO_APPROVE`, `FAILED_MULTIPLE_PENDING_APPROVALS`, `FAILED_PLAN_AMBIGUOUS`.'),
    'expected all three HALT codes named'
  );
});

test('AC-A4 (PRD AC-1): documentation/reference/commands.html\'s page-subtitle count is corrected to "Nineteen commands" with the stale "Fifteen commands" entirely absent', () => {
  const content = readRepoFile(COMMANDS_HTML_PATH);
  assert.match(content, /Nineteen commands/);
  assert.doesNotMatch(content, /Fifteen commands/);
});

test('AC-A4 (PRD AC-1): documentation/reference/commands.html gains a new "Figma Visual-First Track" h2 section with an #relay-visual-approve h3 block mirroring the sibling #relay-visual-review block\'s .kv dt/dd shape (Input/Output/Mode/Notes)', () => {
  const content = readRepoFile(COMMANDS_HTML_PATH);
  const block = sliceBetween(content, '<h2 id="figma-visual-first-track">', '<h2 id="pillar3">');
  assert.ok(block, 'expected an extractable #figma-visual-first-track section');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'A sibling, dependent standalone command for the Figma Visual-First Track &mdash; reachable only once both <code>figma_track: true</code> and <code>visual_first: true</code> are declared. It is never invoked by <code>/relay-execute</code> and never runs as part of the autonomous Pillar 2 loop.'
    ),
    'expected the framing paragraph'
  );
  assert.ok(
    collapsed.includes('<h3 id="relay-visual-approve"><code>/relay-visual-approve &lt;feature-name&gt;</code> <span class="badge badge--done">implemented</span></h3>'),
    'expected the h3 heading with the implemented badge'
  );
  for (const dt of ['<dt>Input</dt>', '<dt>Output</dt>', '<dt>Mode</dt>', '<dt>Notes</dt>']) {
    assert.ok(collapsed.includes(dt), `expected the .kv block to carry a ${dt} term, mirroring #relay-visual-review's own shape`);
  }
  assert.ok(
    collapsed.includes('Three HALT codes: <code>FAILED_NOTHING_TO_APPROVE</code>, <code>FAILED_MULTIPLE_PENDING_APPROVALS</code>, <code>FAILED_PLAN_AMBIGUOUS</code>. Figma Visual-First Track Phase 6.'),
    'expected the Notes dd to name all three HALT codes and the phase attribution'
  );
});

test('AC-A4 (PRD AC-1, real JSON.parse): documentation/assets/data/search-index.json parses as valid JSON and carries a dedicated /relay-visual-approve entry plus a Nineteen-commands-corrected top-level Commands entry', () => {
  const entries = JSON.parse(readRepoFile(SEARCH_INDEX_PATH));
  assert.ok(Array.isArray(entries), 'expected the search index to parse as a JSON array');

  const dedicated = entries.find((/** @type {any} */ e) => e.path === 'reference/commands.html#relay-visual-approve');
  assert.ok(dedicated, 'expected a dedicated /relay-visual-approve search-index entry');
  assert.equal(dedicated.title, '/relay-visual-approve');
  assert.equal(dedicated.category, 'Reference');
  assert.ok(dedicated.excerpt.includes('AWAITING_VISUAL_APPROVAL'), 'expected the excerpt to name the halt it resolves');
  assert.ok(dedicated.excerpt.includes('Never invoked by /relay-execute'), 'expected the excerpt to name the never-invoked-by-/relay-execute guarantee');

  const commandsEntry = entries.find((/** @type {any} */ e) => e.title === 'Commands' && e.path === 'reference/commands.html');
  assert.ok(commandsEntry, 'expected the top-level Commands search-index entry');
  assert.match(commandsEntry.excerpt, /^Nineteen commands/);
  assert.doesNotMatch(commandsEntry.excerpt, /Fifteen commands/);
});

test('(documentation of record, AC-A1..AC-A5): documentation/changelog.html\'s Unreleased -> Added section records this phase\'s dual-mode-render + registration + dogfood-runbook entry, positioned after this same track\'s own Phase 6 entry, inside a well-formed release section (still Unreleased, or the versioned release Unreleased was later cut into — see documentation/AGENTS.md §7.3)', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  assert.notEqual(content.indexOf('<h2 id="unreleased">Unreleased</h2>'), -1, 'expected an id="unreleased" heading');

  const phase6EntryIdx = content.indexOf('New infra command <code>/relay-visual-approve &lt;feature&gt;</code> locates the paused phase');
  assert.notEqual(phase6EntryIdx, -1, "expected this track's own Phase 6 changelog entry to still be present");

  const phase7EntryIdx = content.indexOf(
    "The QA report's and the PR body's Visual Fidelity sections are now <code>phase_scope-aware</code> (an added Scope column) and surface the recorded <code>/relay-visual-approve</code> human decision (approved/rejected) when available"
  );
  assert.notEqual(phase7EntryIdx, -1, 'expected the Phase 7 changelog entry opening clause');

  assert.ok(
    content.includes(
      "<code>docs/api-reference.md</code> and this documentation site now register <code>/relay-visual-approve</code> under a new Figma Visual-First Track section, closing the registration gap Phase 6 mistakenly deferred to an agent structurally forbidden from performing it; both sites' stale command counts are corrected to nineteen in the same edit."
    ),
    'expected the registration-gap-closed + count-correction clause'
  );
  assert.ok(
    content.includes(
      'New <code>docs/design/visual-first-dogfood-runbook.md</code> checklist artifact covers the end-to-end dogfood scope item for both approval modes.'
    ),
    'expected the dogfood-runbook clause'
  );
  assert.ok(
    content.includes('Part of the Figma Visual-First Track, Phase 7 of <code>PRPs/prds/figma-visual-first-track.prd.md</code>.'),
    'expected the Phase 7 attribution sentence'
  );

  assert.ok(phase7EntryIdx > phase6EntryIdx, "the Phase 7 entry must be positioned after this same track's own Phase 6 entry");

  const section = findEnclosingReleaseSection(content, phase7EntryIdx);
  assert.ok(section, 'expected the Phase 7 entry to sit within a well-formed release section (an id="unreleased" or id="v..." heading)');
  assert.ok(
    phase7EntryIdx < /** @type {{ end: number }} */ (section).end,
    'expected the Phase 7 entry to sit fully within its enclosing release section, not spill past the next one'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-4) — the non-executable "end-to-end dogfood on a real
// visual-first feature" scope item, resolved as a documentation/checklist
// deliverable enumerating concrete checkpoints for BOTH approval modes.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-4): docs/design/visual-first-dogfood-runbook.md exists, admits its own scope limits, and enumerates concrete checkpoints for BOTH the auto-mode and human-mode (plus rejection) approval paths — not just a keyword mention of each', () => {
  const content = readRepoFile(DOGFOOD_RUNBOOK_PATH);

  assert.ok(content.includes('## Why this file exists (scope note)'), 'expected the scope-note admission heading, mirroring the sibling dogfood-runbook.md\'s own honesty discipline');

  const checklist = sliceBetween(content, '## Checklist', '## What "done" looks like');
  assert.ok(checklist, 'expected an extractable ## Checklist section');
  const collapsed = collapseWs(/** @type {string} */ (checklist));

  // Auto-mode checkpoint (step 2).
  assert.ok(
    collapsed.includes(
      "Run `/relay-execute` through one visual/logic pair under `visual_first_approval: auto`, confirming a genuine `VISUAL_VERIFIED` unblocks the paired logic phase automatically with no halt."
    ),
    'expected a concrete auto-mode checkpoint, not just a keyword mention'
  );
  assert.ok(
    collapsed.includes("the visual phase reaches `complete` with no `VISUAL_GATE_BLOCKED` halt in its history, and the paired logic phase starts automatically"),
    'expected the auto-mode step\'s own explicit Checkpoint text'
  );

  // Human-mode checkpoint (step 3).
  assert.ok(
    collapsed.includes(
      "For a second visual/logic pair, set `visual_first_approval: human`, run `/relay-execute`, confirm it HALTs with `AWAITING_VISUAL_APPROVAL`, then run `/relay-visual-approve` and approve."
    ),
    'expected a concrete human-mode checkpoint naming the exact HALT code and the approval command'
  );
  assert.ok(
    collapsed.includes(
      'a `visual-approval.jsonl` line is appended with `"decision": "approved"`; a subsequent `/relay-execute` re-invocation resumes via Phase A.2.5\'s resume short-circuit and completes the paused phase WITHOUT re-running the implementer, code-reviewer, or visual-verifier for that phase.'
    ),
    'expected the human-mode step\'s own explicit resume-without-re-running Checkpoint text'
  );

  // Rejection path (step 4) — the human tier's other half.
  assert.ok(
    collapsed.includes('the `visual-approval.jsonl` line carries `"decision": "rejected"` and a `"rejection_feedback"` field')
      && collapsed.includes("seeds that exact feedback text as the implementer's first `prior_feedback`"),
    'expected the rejection-path checkpoint distinct from the approval-path checkpoint'
  );

  // Ties back to this SAME phase's own Tasks 1-3 deliverables (step 6).
  assert.ok(
    collapsed.includes('a "## Visual Fidelity" table with a Scope column populated `visual`/`logic` per phase, plus a recorded human-approval line for each phase that went through step 3 or step 4 above'),
    'expected the runbook to close the loop back onto this same phase\'s own generate-final-report.mjs / relay-qa-report.md deliverables'
  );
});

// Regression-safety net (not itself one of the plan's numbered AC-A1..AC-A5,
// mirrors figma-visual-first-track-phase2/3/4/5.test.mjs's identical
// precedent for an analogous docs-touching phase sharing the same scan
// roots). Uses withScanRootLock since node:test runs files concurrently by
// default and path-existence.test.mjs's own AC-5 test transiently mutates
// the same SCAN_ROOTS with a synthetic fixture.
test(
  'AC-A1..AC-A5 (regression safety net): runPathExistenceCheck() returns ok:true with zero findings against the real repo tree after this phase\'s seven changed/created files — confirms no dangling path/script reference was introduced',
  async () => {
    const result = await withScanRootLock(() => runPathExistenceCheck());

    assert.equal(result.name, 'path-existence');
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
  }
);
