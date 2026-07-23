// @ts-check
/**
 * Real-behavioral + content-invariant tests for Phase 7 ("Surface
 * integration + self-improvement", the FINAL phase) of the
 * figma-implementation-track feature — the new standalone
 * `/relay-visual-review` command, `docs-updater.md`'s self-improvement
 * write-scope extension (Step 3.5), `scripts/generate-final-report.mjs`'s
 * new Visual Fidelity aggregation, the `figma_track`-gated wiring added to
 * `relay-qa-report.md`/`relay-execute.md`/`relay-pr.md`, and the three-site
 * documentation registration (`docs/api-reference.md`,
 * `docs/context/architecture.md`, `documentation/reference/commands.html` +
 * `agents.html`) plus `docs/design/dogfood-runbook.md`.
 *
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-7-surface-integration.plan.md
 * Diff reviewed: PRPs/reports/figma-implementation-track/phase-7/attempts/2/diff.patch
 *
 * Existing-coverage scan performed before authoring (Step 2.1): read every
 * scripts/validate/checks/*.test.mjs file's header/target-path constants
 * (artifact-naming, bootstrap-parity, dispatch-graph, docs-sync-phase1..4,
 * frontmatter-schema, native-validate, path-existence, registration-parity,
 * version-parity, gating-structure, figma-track-phase1..6). None of them
 * reads plugins/relay/commands/relay-visual-review.md (does not exist before
 * this phase), plugins/relay/commands/relay-qa-report.md,
 * plugins/relay/commands/relay-execute.md, plugins/relay/commands/relay-pr.md,
 * plugins/relay/agents/docs-updater.md, scripts/generate-final-report.mjs,
 * docs/api-reference.md, docs/context/architecture.md,
 * documentation/reference/commands.html, documentation/reference/agents.html,
 * or docs/design/dogfood-runbook.md (does not exist before this phase) — a
 * direct Glob for `**\/*generate-final-report*` and `**\/*qa-report*test*` /
 * `**\/*docs-updater*test*` / `**\/*relay-pr*test*` confirmed zero existing
 * test files touch any of this phase's seven changed/created files. Every
 * test below is therefore NEW_TEST_REQUIRED; no EXISTING_TEST_UPDATED,
 * OBSOLETE_TEST_REMOVED, or REDUNDANT_TEST_REMOVED outcome applies to any
 * in-scope AC this session.
 *
 * Two properties are EXISTING_TEST_COVERS transitively, documented here
 * rather than re-asserted (mirrors figma-track-phase3/5/6.test.mjs's
 * identical disclosure idiom): figma-track-phase3.test.mjs's two dedicated
 * real-wrapper tests (`runDispatchGraphCheck()` / `runRegistrationParityCheck()`,
 * both asserting `ok:true` with zero findings against the real repo tree, no
 * fixture isolation) already extend to cover (a) relay-visual-review.md's
 * `subagent_type="visual-verifier"` dispatch resolving to a real agent file,
 * and (b) relay-visual-review's presence in search-index.json + changelog.html
 * (registration-parity.mjs's full command-diff scan) plus the page-level NAV
 * check — since those two calls run against "whatever is currently on disk"
 * and this phase's new command/registration are now part of that disk state.
 * Re-asserting either property here would be a same-input, same-assertion
 * duplicate (R-DUPLICATE) of an already-green test. This is a NARROW
 * transitive cover, though: registration-parity.mjs never reads
 * docs/api-reference.md, docs/context/architecture.md,
 * documentation/reference/commands.html, or documentation/reference/agents.html
 * — those four surfaces (plus the `figma_track` gate being documented
 * EXPLICITLY, which registration-parity.mjs has no notion of) are the
 * missing-property delta AC-A4's own tests below cover.
 *
 * CORRECTION (post-authoring, same session, pre-review): this phase's diff
 * (attempts/2/diff.patch, confirmed against attempts/1/record.json vs.
 * attempts/2/record.json's own `files_changed` lists — attempt 1 does NOT
 * list plugins/relay/agents/visual-verifier.md, attempt 2 DOES) shows
 * visual-verifier.md was genuinely re-edited in attempt 2 to fix a
 * code-reviewer R-SEM finding: its frontmatter `description:`, opening
 * prose (~line 21), and `## Out of scope` section now document BOTH
 * callers (/relay-implement Phase A.3.4 and the new standalone
 * /relay-visual-review command) instead of a stale single-caller
 * assumption. figma-track-phase6.test.mjs's own visual-verifier.md
 * coverage is scoped to Steps 0-4 (the classification/degradation logic)
 * only — it never slices or asserts the frontmatter/opening-prose/Out-of-
 * scope sections. That is a real missing-property delta, not
 * EXISTING_TEST_COVERS: a dedicated AC-A2 test below closes it.
 *
 * ENVIRONMENT-DEPENDENCY NOTE: unlike Phase 6's capture.mjs/compare.mjs
 * (which import playwright/pngjs/pixelmatch — external, uninstalled
 * dependencies in this repo's own node_modules tree — and are therefore
 * asserted via content-invariant source-text checks only),
 * `scripts/generate-final-report.mjs` has ZERO external dependencies (only
 * `node:fs`/`node:path` builtins) and is a real, invokable CLI script. It is
 * NOT safe to `import` its internals directly, though: every function in the
 * module is unexported, and `main()` runs UNCONDITIONALLY at module load
 * (no `import.meta.url === pathToFileURL(process.argv[1])` guard, unlike
 * scripts/normalize-test-output.mjs) — importing it would execute `main()`
 * against the test runner's own `process.argv` and call `process.exit()`
 * inside the shared test process. The safe, real-behavioral invocation path
 * — and the one this feature's own Level 3 DRY-RUN validation command
 * already establishes as the sanctioned way to exercise this script — is a
 * real child-process CLI invocation (`execFileSync`) against a throwaway
 * fixture directory, mirroring normalize-test-output.test.mjs's own CLI
 * contract tests. The two AC-A1 tests below use exactly that approach and go
 * beyond the plan's own Level 3 smoke-fixture (which only greps for the
 * heading) by asserting exact per-frame row content, the omission idiom
 * across three distinct empty-evidence shapes, and both of
 * loadVisualFidelityFrames' two supported JSON shapes (compare.mjs's real
 * bare-array write vs. the degraded-stub's `{ frames: [...] }` wrap).
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 7 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-7-surface-integration.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 7 per the plan's own Acceptance Criteria
 * section: AC-1, AC-2, AC-5, via plan AC-A1 (PRD AC-1), AC-A2 (PRD AC-5),
 * AC-A3 (PRD AC-2), AC-A4 (PRD AC-1), AC-A5 (PRD AC-5). PRD AC-3, AC-4 are
 * OUT_OF_PHASE_SCOPE — AC-3 (explicit human approval) and AC-4 (design_source
 * declaration) belong to phases 4/5's already-shipped writer/reviewer pairs
 * and template registration, not re-touched here):
 *
 *   AC-1 / AC-A1 (Inert when off — every new surface this phase adds is
 *     gated byte-for-byte identically to /relay-implement's existing
 *     Visual: line gate) — generate-final-report.mjs's Visual Fidelity
 *     section omission/rendering (real CLI behavior); relay-qa-report.md's
 *     figma_track-gated section prose; relay-execute.md's visual_outcome
 *     per-phase key omission + the gated terminal rollup line;
 *     relay-pr.md's documentation of the inherited (not newly-invoked)
 *     Visual Fidelity section.
 *   AC-5 / AC-A2 (Visual loop bounded and non-blocking, standalone re-check
 *     surface) — relay-visual-review.md's single Task dispatch (attempt: 1
 *     sentinel, no internal loop, zero D8 mutations) and its P3/P4/P5
 *     precondition HALTs (figma_track not true; design_source missing;
 *     Design Spec not APPROVED); visual-verifier.md's own frontmatter
 *     description, opening prose, and Out of scope section correctly
 *     documenting BOTH callers now that this phase adds the second one
 *     (missing-property delta over figma-track-phase6.test.mjs — see the
 *     Existing-coverage scan note above).
 *   AC-2 / AC-A3 (Reuse enforced — self-improvement loop strengthens, never
 *     invents, the REUSE evidence trail) — docs-updater.md's Explicit Write
 *     Scope row for component-map.md; Step 3.5's figma_track gate; Step
 *     3.5's REUSE-only/PASS-only eligibility and its narrow, idempotent,
 *     never-clobber row upgrade.
 *   AC-1 / AC-A4 (Three-site documentation registration, gate documented
 *     explicitly) — docs/api-reference.md's Design system (Figma track)
 *     section; docs/context/architecture.md's standalone-command bullet;
 *     documentation/reference/commands.html's #relay-visual-review entry
 *     plus agents.html's visual-verifier second-caller registration.
 *   AC-5 / AC-A5 (Non-executable dogfood scope item resolved as a
 *     documentation deliverable) — docs/design/dogfood-runbook.md's
 *     existence and required checkpoints.
 *
 * Run: node --test scripts/validate/checks/figma-track-phase7.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RELAY_VISUAL_REVIEW_PATH = 'plugins/relay/commands/relay-visual-review.md';
const RELAY_QA_REPORT_PATH = 'plugins/relay/commands/relay-qa-report.md';
const RELAY_EXECUTE_PATH = 'plugins/relay/commands/relay-execute.md';
const RELAY_PR_PATH = 'plugins/relay/commands/relay-pr.md';
const VISUAL_VERIFIER_PATH = 'plugins/relay/agents/visual-verifier.md';
const DOCS_UPDATER_PATH = 'plugins/relay/agents/docs-updater.md';
const API_REFERENCE_PATH = 'docs/api-reference.md';
const ARCHITECTURE_PATH = 'docs/context/architecture.md';
const COMMANDS_HTML_PATH = 'documentation/reference/commands.html';
const AGENTS_HTML_PATH = 'documentation/reference/agents.html';
const DOGFOOD_RUNBOOK_PATH = 'docs/design/dogfood-runbook.md';

const GENERATE_FINAL_REPORT = fileURLToPath(new URL('../../generate-final-report.mjs', import.meta.url));

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
 * where a given source file happens to wrap a sentence. BEFORE collapsing,
 * strips any Markdown blockquote continuation marker (a leading run of
 * `>` characters, with or without one following space) from the start of
 * each line — otherwise a stray literal "> " gets inserted mid-sentence
 * wherever a blockquote line wraps in the source prose being asserted
 * against (e.g. relay-execute.md's "Visual fidelity: ..." rollup line,
 * relay-visual-review.md's P3 `figma_track` HALT block — both wrap across
 * multiple `>`-prefixed lines). The per-line strip only touches a line's
 * leading `>` run (never an inline `>` mid-sentence), so non-blockquote
 * content is unaffected. Mirrors figma-track-phase5.test.mjs's helper of
 * the same name/shape (the fixed version — figma-track-phase3/6.test.mjs
 * still carry the pre-fix, non-stripping shape; unaffected by that here,
 * out of scope for this fix).
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  const withoutBlockquoteMarkers = str
    .split('\n')
    .map((line) => line.replace(/^\s*>+\s?/, ''))
    .join('\n');
  return withoutBlockquoteMarkers.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1/3/5/6.test.mjs's
 * helper of the same name/shape.
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
 * Creates a throwaway temp directory, hands it to `fn`, and always cleans up
 * afterward (even on assertion failure).
 * @template T
 * @param {(dir: string) => T} fn
 * @returns {T}
 */
function withTempReportsDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-figma-p7-'));
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
 * malformed, so a throw here signals a genuine regression, not an
 * expected-failure path.
 * @param {string} reportsDir
 * @returns {string}
 */
function runGenerateFinalReport(reportsDir) {
  const outPath = join(reportsDir, 'final-report.md');
  execFileSync(process.execPath, [GENERATE_FINAL_REPORT, reportsDir, '--out', outPath], { encoding: 'utf-8' });
  return readFileSync(outPath, 'utf-8');
}

// ---------------------------------------------------------------------------
// AC-1 / AC-A1 — Inert when off. generate-final-report.mjs's real,
// zero-dependency Visual Fidelity aggregation, exercised via real CLI
// invocation rather than content-invariant source-text checks.
// ---------------------------------------------------------------------------

test('AC-A1 (real CLI invocation): generate-final-report.mjs omits the "## Visual Fidelity" section entirely (no heading, no placeholder) when zero fidelity-report.json artifacts exist anywhere under the reports dir — across three distinct empty-evidence shapes: no phase-* directory at all, a phase-* directory with no visual/ subdirectory, and a visual/ subdirectory with no attempt subdirectories', () => {
  withTempReportsDir((dir) => {
    writeFileSync(join(dir, 'run.json'), JSON.stringify({ feature: 'figma-p7-fixture', run_id: 'fixture-run', outcome: 'GREEN' }));

    // Variant 1: no phase-* directory at all — the common non-Figma-project case.
    let report = runGenerateFinalReport(dir);
    assert.doesNotMatch(report, /## Visual Fidelity/);

    // Variant 2: a phase-* directory exists (e.g. from a non-Figma-sourced
    // phase) but carries no visual/ subdirectory at all.
    mkdirSync(join(dir, 'phase-9', 'attempts', '1'), { recursive: true });
    report = runGenerateFinalReport(dir);
    assert.doesNotMatch(report, /## Visual Fidelity/);

    // Variant 3: phase-*/visual/ exists but has no attempt subdirectories yet
    // (e.g. figma_track_declared was true but the visual loop never ran).
    mkdirSync(join(dir, 'phase-9', 'visual'), { recursive: true });
    report = runGenerateFinalReport(dir);
    assert.doesNotMatch(report, /## Visual Fidelity/);
  });
});

test('AC-A1 (real CLI invocation): generate-final-report.mjs discovers every phase-*/visual/*/fidelity-report.json, aggregates BOTH compare.mjs\'s real bare-array write shape and the degraded-stub\'s { frames: [...] } wrapped shape across multiple phases, and renders one correctly-populated row per frame — including a null diff_percent (the degraded-rung shape) rendered as "—"', () => {
  withTempReportsDir((dir) => {
    writeFileSync(join(dir, 'run.json'), JSON.stringify({ feature: 'figma-p7-fixture', run_id: 'fixture-run', outcome: 'GREEN' }));

    // phase-6: the FULL-rung shape compare.mjs actually writes — a bare JSON array.
    mkdirSync(join(dir, 'phase-6', 'visual', '1'), { recursive: true });
    writeFileSync(
      join(dir, 'phase-6', 'visual', '1', 'fidelity-report.json'),
      JSON.stringify([
        { node_id: '10:20', route: '/', diff_percent: 0.42, threshold: 2, status: 'PASS' },
        { node_id: '10:21', route: '/login', diff_percent: 5.7, threshold: 2, status: 'FAIL' },
      ])
    );

    // phase-7: the degraded-rung stub shape visual-verifier.md's Step 3
    // writes directly — wrapped as { frames: [...] }, diff_percent explicitly null.
    mkdirSync(join(dir, 'phase-7', 'visual', '2'), { recursive: true });
    writeFileSync(
      join(dir, 'phase-7', 'visual', '2', 'fidelity-report.json'),
      JSON.stringify({
        frames: [
          { node_id: '30:1', route: '/dashboard', diff_percent: null, threshold: 2, status: 'DEGRADED_STATIC_ONLY', token_conformant: true },
        ],
      })
    );

    const report = runGenerateFinalReport(dir);

    assert.equal((report.match(/## Visual Fidelity/g) || []).length, 1, 'expected exactly one Visual Fidelity heading');
    assert.match(report, /\| Phase \| Node ID \| Route \| Diff % \| Threshold \| Status \|/);
    assert.match(report, /\| phase-6 \| 10:20 \| \/ \| 0\.42 \| 2 \| PASS \|/);
    assert.match(report, /\| phase-6 \| 10:21 \| \/login \| 5\.7 \| 2 \| FAIL \|/);
    assert.match(report, /\| phase-7 \| 30:1 \| \/dashboard \| — \| 2 \| DEGRADED_STATIC_ONLY \|/);
  });
});

test('AC-A1: relay-qa-report.md\'s "## Visual Fidelity" section is present ONLY when BOTH figma_track: true AND at least one fidelity-report.json artifact exist, and is documented as absent entirely (no heading, no "N/A" placeholder) otherwise — aggregating the same bare-array/wrapped shapes generate-final-report.mjs supports', () => {
  const content = readRepoFile(RELAY_QA_REPORT_PATH);
  const block = sliceBetween(content, '## Visual Fidelity section (figma_track-gated)', '## Phase 2 — Preconditions (HALTs)');
  assert.ok(block, 'expected an extractable Visual Fidelity section block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      "present ONLY when BOTH conditions hold: (1) the target project's `docs/context/methodology.md` declares `figma_track: true`, and (2) at least one `phase-*/visual/*/fidelity-report.json` artifact is found under the resolved `<feature>`'s `PRPs/reports/<feature>/` directory"
    )
  );
  assert.ok(
    collapsed.includes('Absent entirely — no heading, no "N/A" placeholder — for a non-Figma project or when no fidelity artifact exists yet')
  );
  assert.ok(collapsed.includes("support both `compare.mjs`'s bare-array shape and a `{ frames: [...] }`-wrapped shape"));
});

test('AC-A1: relay-execute.md\'s per-phase completion record carries a visual_outcome key ONLY when that phase\'s own figma_track_declared == true; when the Visual: line was absent for a phase, the key is OMITTED from the record entirely — not null — keeping a non-Figma project\'s orchestrator-run.json byte-identical to today\'s', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const block = sliceBetween(
    content,
    '**`visual_outcome` field (Figma Implementation Track Phase 7',
    'Write / overwrite `PRPs/reports/<feature>/orchestrator-run.json`'
  );
  assert.ok(block, 'expected an extractable visual_outcome field block');
  const collapsed = collapseWs(block);

  assert.ok(collapsed.includes("present only when that phase's own `figma_track_declared == true`"));
  assert.ok(collapsed.includes('the `visual_outcome` key is OMITTED from the completion record entirely — not `null`, a genuinely absent key'));
});

test('AC-A1: relay-execute.md\'s terminal "Visual fidelity: ..." rollup line is present ONLY when at least one completion record carries a visual_outcome key, OMITTED ENTIRELY (no line, no SKIPPED marker) otherwise, and tallies APPROVED / degraded / mismatch counts strictly from completion records that carry the key', () => {
  const content = readRepoFile(RELAY_EXECUTE_PATH);
  const block = sliceBetween(content, '**Gated visual-fidelity rollup line (Figma Implementation Track Phase', '### HALT paths');
  assert.ok(block, 'expected an extractable gated rollup line block');
  const collapsed = collapseWs(block);

  assert.ok(collapsed.includes("present ONLY when at least one completion record in `orchestrator_run_log` carries a `visual_outcome` key"));
  assert.ok(collapsed.includes('OMITTED ENTIRELY (no line, no `SKIPPED` marker, nothing) when zero completion records carry the key'));
  assert.ok(
    collapsed.includes('Visual fidelity: <N> phase(s) APPROVED, <M> degraded, <K> mismatch/budget-exceeded (see PRPs/reports/<feature>/orchestrator-run.json).')
  );
  assert.ok(collapsed.includes('`<N>` counts `APPROVED`; `<M>` counts any named degraded rung'));
});

test('AC-A1: relay-pr.md documents that generate-final-report.mjs already emits the Visual Fidelity section automatically when applicable — no new script invocation or flag is added by this command', () => {
  const content = readRepoFile(RELAY_PR_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      'Since Figma Implementation Track Phase 7, `generate-final-report.mjs` also discovers any `phase-*/visual/*/fidelity-report.json` artifacts under `PRPs/reports/<feature>/` and appends a "## Visual Fidelity" section automatically when at least one is found — omitted entirely (no heading, no placeholder) for a non-Figma project or when no visual-verification evidence exists yet.'
    )
  );
  assert.ok(collapsed.includes('This command performs no new script invocation and takes no new flag to get this behavior'));
});

// ---------------------------------------------------------------------------
// AC-5 / AC-A2 — relay-visual-review.md: single-shot, non-mutating standalone
// re-check surface mirroring /relay-code-review's shape exactly.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-5): relay-visual-review.md dispatches visual-verifier via Task exactly once with an attempt: 1 sentinel, runs no internal retry loop, and performs zero D8 mutations — mirroring /relay-code-review\'s single-shot, non-mutating shape', () => {
  const content = readRepoFile(RELAY_VISUAL_REVIEW_PATH);

  const phaseAHeaderBlock = sliceBetween(content, '## Phase A — Adopt the visual-verifier dispatch', '### A.1 — Capture the diff');
  assert.ok(phaseAHeaderBlock, 'expected an extractable Phase A header block');
  assert.ok(collapseWs(phaseAHeaderBlock).includes('Single-shot. No internal loop. No retries. No D8 mutations.'));

  const dispatchBlock = sliceBetween(content, '### A.2 — Dispatch the visual-verifier agent', '### A.3 — Read the returned verdict');
  assert.ok(dispatchBlock, 'expected an extractable dispatch block');
  assert.ok(dispatchBlock.includes('Task(subagent_type="visual-verifier",'));
  assert.ok(dispatchBlock.includes('attempt: 1,'));
  assert.ok(
    collapseWs(dispatchBlock).includes(
      "The `attempt: 1` value is the standalone-invocation sentinel — first-and-only, mirroring `/relay-code-review`'s own `attempt: 1` dispatch to `code-reviewer`."
    )
  );

  const noPhaseBBlock = sliceBetween(content, '### There is no Phase B', '## Final output surface');
  assert.ok(noPhaseBBlock, 'expected an extractable "There is no Phase B" block');
  assert.ok(collapseWs(noPhaseBBlock).includes("This command never re-runs `visual-verifier` in a loop."));

  const constraintsBlock = sliceBetween(content, '## Constraints (hard rules)', '## What you do NOT do');
  assert.ok(constraintsBlock, 'expected an extractable Constraints block');
  const collapsedConstraints = collapseWs(constraintsBlock);
  assert.ok(
    collapsedConstraints.includes(
      "**Never perform any D8 mutation.** No plan trailing-block edit. No plan move to `PRPs/plans/completed/`. No source PRD row edit. D8 mutations are exclusively `/relay-implement`'s responsibility."
    )
  );
  assert.ok(collapsedConstraints.includes("**Never re-run `visual-verifier` in a loop.** Single `Task` dispatch per command invocation."));
});

test('AC-A2: relay-visual-review.md HALTs with a named, actionable message when figma_track is not true (P3), when the plan\'s Metadata lacks design_source: figma (P4), or when the referenced Design Spec is missing or not APPROVED (P5) — never silently defaulting or degrading', () => {
  const content = readRepoFile(RELAY_VISUAL_REVIEW_PATH);

  const p3Block = sliceBetween(content, '### P3 — Target project declares `figma_track: true`', '### P4 —');
  assert.ok(p3Block, 'expected an extractable P3 block');
  assert.ok(
    collapseWs(p3Block).includes(
      "/relay-visual-review requires `figma_track: true` in `docs/context/methodology.md`, but this target project has it absent or `false`."
    )
  );

  const p4Block = sliceBetween(content, "### P4 — Plan's `## Metadata` table carries `design_source: figma`", '### P5 —');
  assert.ok(p4Block, 'expected an extractable P4 block');
  assert.ok(
    collapseWs(p4Block).includes(
      'The plan at `<plan_path>` does not carry `design_source: figma` in its `## Metadata` table (row absent or `none`).'
    )
  );

  const p5Block = sliceBetween(content, '### P5 — Referenced Design Spec resolves and is `*Status: APPROVED*`', '### P6 —');
  assert.ok(p5Block, 'expected an extractable P5 block');
  assert.ok(collapseWs(p5Block).includes('The Design Spec at `<design_spec_path>` is not APPROVED (current status: `<status>`).'));
});

test("AC-A2: visual-verifier.md's frontmatter description, opening prose, and Out of scope section all document BOTH callers (/relay-implement's Phase A.3.4 and the standalone /relay-visual-review command) now that this phase ships the second one — closing the missing-property delta over figma-track-phase6.test.mjs's Steps-0-4-only coverage of this same file", () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);

  // Frontmatter description: field names both callers explicitly.
  const descriptionBlock = sliceBetween(content, 'description:', '\nmodel: sonnet');
  assert.ok(descriptionBlock, 'expected an extractable frontmatter description: field');
  assert.ok(
    collapseWs(descriptionBlock).includes(
      "Dispatched non-interactively, exactly once per dispatch, by two callers: /relay-implement's Phase A.3.4 (the gated, autonomous, budgeted-loop path) and the standalone /relay-visual-review command (a single-shot, hand-invoked re-check, Figma Implementation Track Phase 7)."
    )
  );

  // Opening prose (~line 21) names both callers with the same detail.
  const openingProseBlock = sliceBetween(content, 'You have two callers,', '> **Never touches application source.**');
  assert.ok(openingProseBlock, 'expected an extractable opening-prose "two callers" block');
  assert.ok(
    collapseWs(openingProseBlock).includes(
      "`Task` exactly once per dispatch: `/relay-implement`'s Phase A.3.4 — immediately after Phase A.3 standard-mode returns `APPROVED` (never on an arbitration-mode verdict) — the gated, autonomous path inside the budgeted implement loop; and the standalone `/relay-visual-review` command (Figma Implementation Track Phase 7)"
    )
  );

  // Out of scope section acknowledges two callers and no longer carries the
  // stale "deferred to Phase 7" placeholder that predated /relay-visual-review
  // actually shipping.
  const outOfScopeBlock = sliceBetween(content, '## Out of scope (explicit deferrals)', '￿');
  assert.ok(outOfScopeBlock, 'expected an extractable Out of scope section');
  const collapsedOutOfScope = collapseWs(outOfScopeBlock);
  assert.ok(
    collapsedOutOfScope.includes(
      "**The retry budget, post-visual re-review round, and deterministic revert.** All live in `/relay-implement`'s Phase A.3.4 — this agent is single-attempt per dispatch, regardless of which of its two callers dispatched it."
    )
  );
  assert.doesNotMatch(
    collapsedOutOfScope,
    /deferred to Phase 7/i,
    'Out of scope section must not retain a stale "deferred to Phase 7" placeholder for /relay-visual-review now that the command is shipped'
  );
});

// ---------------------------------------------------------------------------
// PRD AC-2 / AC-A3 — docs-updater.md's Step 3.5 self-improvement loop:
// strengthens REUSE evidence, never invents a row, never clobbers without
// fresh corroborating evidence.
// ---------------------------------------------------------------------------

test("AC-A3 (PRD AC-2): docs-updater.md's Explicit Write Scope grants component-map.md ONLY a surgical, upgrade-only edit — never create or reorder rows", () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);
  const block = sliceBetween(content, '## Explicit Write Scope', '### Step 1 — Read inputs and ground yourself');
  assert.ok(block, 'expected an extractable Explicit Write Scope block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      "`<target_root>/docs/design/component-map.md` | Surgical additive edit only — upgrade an existing REUSE-mapped row's `Confidence` to `verified:auto` + `verified_at` when corroborated by a fresh `VISUAL_VERIFIED` `fidelity-report.json` entry; never create or reorder rows"
    )
  );
});

test("AC-A3: docs-updater.md's Step 3.5 self-improvement loop skips entirely — records nothing in the manifest — when the target project's figma_track is absent or false, reproducing the identical figma_track_declared-gated omission idiom", () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);
  const block = sliceBetween(content, '### Step 3.5 — Component-map `verified:auto` upgrade', '### Step 4 — Apply surgical edits');
  assert.ok(block, 'expected an extractable Step 3.5 block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      "If `figma_track` is absent or `false`, skip this step entirely — record nothing in the manifest (this is the identical `figma_track_declared`-gated omission idiom `/relay-implement`'s own `Visual:` line already established: no line, no `SKIPPED` marker, nothing)."
    )
  );
  assert.ok(collapsed.includes('never invents a row, and never runs when the target project has not opted into the Figma track.'));
});

test("AC-A3: docs-updater.md's Step 3.5 upgrades ONLY a REUSE-classified CM-<n> row with a fresh PASS frame — never invents a row for an untraceable frame — and the row edit itself is narrow, idempotent on an already-verified:auto row, and never touches a row lacking fresh corroborating evidence", () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);
  const block = sliceBetween(content, '### Step 3.5 — Component-map `verified:auto` upgrade', '### Step 4 — Apply surgical edits');
  assert.ok(block, 'expected an extractable Step 3.5 block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'only a row classified `REUSE` (never `NEW` or `ASSUMPTION`) citing a real `CM-<n>` id is eligible. A `PASS` frame that does not trace to a real `REUSE` `CM-<n>` row is NOT upgraded and is NOT recorded as an error'
    )
  );
  assert.ok(collapsed.includes("If the row's current `Confidence` cell already reads `verified:auto`, skip it (already upgraded — idempotent)."));
  assert.ok(
    collapsed.includes('Never touch a row lacking fresh corroborating evidence (step 3/4 above); never create a new `CM-<n>` row from this step; never reorder existing rows.')
  );
});

// ---------------------------------------------------------------------------
// PRD AC-1 / AC-A4 — three-site documentation registration, figma_track gate
// documented explicitly so a reader never concludes the track is always-on.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-1): docs/api-reference.md registers /relay-visual-review (plus /relay-design-map and /relay-design-spec) as figma_track: true-gated commands never invoked by /relay-execute', () => {
  const content = readRepoFile(API_REFERENCE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "plus three standalone, `figma_track: true`-gated Figma Implementation Track commands — `/relay-design-map` (Phase 3), `/relay-design-spec` (Phase 4), and `/relay-visual-review` (Phase 7) — none of which is ever invoked by `/relay-execute`"
    )
  );

  const designSystemBlock = sliceBetween(content, '#### Design system (Figma track)', '#### Pillar 3 (commit + PR + approval cycle)');
  assert.ok(designSystemBlock, 'expected an extractable Design system (Figma track) section');
  const collapsedDS = collapseWs(designSystemBlock);
  assert.ok(collapsedDS.includes('All three are gated behind `figma_track: true`'));
  assert.ok(collapsedDS.includes('`/relay-visual-review <plan-path>` ✅ **implemented** (`figma_track: true` gate)'));
  assert.ok(collapsedDS.includes('Performs zero D8 mutations and never edits application source'));
});

test("AC-A4: docs/context/architecture.md registers /relay-visual-review among the standalone, human-triggered commands, describing its single-shot, non-mutating relationship to /relay-implement's Phase A.3.4 dispatch", () => {
  const content = readRepoFile(ARCHITECTURE_PATH);
  const block = sliceBetween(content, '## Command surface', 'Happy path for day-to-day use:');
  assert.ok(block, 'expected an extractable Command surface section');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      "**A third standalone, human-triggered command mirrors `/relay-implement`'s own visual-verification dispatch, read-only.** `/relay-visual-review` (Figma Implementation Track, Phase 7) is a single-shot, non-mutating standalone re-check of visual fidelity"
    )
  );
  assert.ok(collapsed.includes('performs zero D8 mutations, and is never called by `/relay-execute`.'));
});

test("AC-A4: the documentation/ site registers /relay-visual-review's own commands.html entry (figma_track gate, zero D8 mutations) AND records it as visual-verifier's second caller in agents.html — the site-3 leg of the three-file registration rule, beyond what registration-parity.mjs's search-index.json/changelog.html scan already covers", () => {
  const commandsHtml = readRepoFile(COMMANDS_HTML_PATH);
  const commandsBlock = sliceBetween(commandsHtml, '<h3 id="relay-visual-review">', '<h2 id="pillar3">');
  assert.ok(commandsBlock, 'expected an extractable #relay-visual-review section in commands.html');
  const collapsedCommands = collapseWs(commandsBlock);
  assert.ok(collapsedCommands.includes('Performs zero D8 mutations and never edits the plan or any PRD'));
  assert.ok(
    collapsedCommands.includes(
      'Preconditions HALT when <code>figma_track</code> is not declared in <code>docs/context/methodology.md</code>, when the plan lacks <code>design_source: figma</code>, or when the referenced Design Spec is missing or not <code>APPROVED</code>.'
    )
  );

  const agentsHtml = readRepoFile(AGENTS_HTML_PATH);
  const visualVerifierBlock = sliceBetween(agentsHtml, '<h3 id="visual-verifier">', '<h4 id="visual-verifier-verdicts">');
  assert.ok(visualVerifierBlock, 'expected an extractable #visual-verifier section in agents.html');
  assert.ok(
    collapseWs(visualVerifierBlock).includes(
      'AND the standalone <a href="commands.html#relay-visual-review"><code>/relay-visual-review</code></a> command (single-shot, <code>attempt: 1</code> sentinel, Figma Implementation Track Phase 7).'
    )
  );
});

// ---------------------------------------------------------------------------
// PRD AC-5 / AC-A5 — the non-executable "end-to-end dogfood on a real
// project" scope item, resolved as a documentation/checklist deliverable.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-5): docs/design/dogfood-runbook.md exists and enumerates the concrete checkpoints for the "end-to-end dogfood on a real project" success signal — figma_track: true, a multi-phase PRD with an auth-gated route, and a verified:auto component-map row gained without human intervention', () => {
  const content = readRepoFile(DOGFOOD_RUNBOOK_PATH);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes('figma_track: true'));
  assert.ok(collapsed.includes('verified:auto'));
  assert.ok(collapsed.includes('more than one Implementation Phase'));
  assert.ok(collapsed.includes('at least one auth-gated route'));
  assert.ok(
    collapsed.includes(
      "without any manual edit, at least one `REUSE`-mapped row in `docs/design/component-map.md` shows `Confidence: verified:auto`"
    )
  );
});
