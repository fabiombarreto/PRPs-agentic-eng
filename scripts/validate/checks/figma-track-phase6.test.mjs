// @ts-check
/**
 * Content-invariant + real-behavioral tests for Phase 6 ("Visual loop") of
 * the figma-implementation-track feature — the new self-contained
 * `plugins/relay/scripts/visual/` tooling package (`provision.mjs`,
 * `capture.mjs`, `compare.mjs`), the new `visual-verifier` agent
 * (`plugins/relay/agents/visual-verifier.md`), and the new
 * `### Phase A.3.4 — Visual-verification dispatch` sub-phase inserted into
 * `plugins/relay/commands/relay-implement.md`.
 *
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-6-visual-loop.plan.md
 * Diff reviewed: PRPs/reports/figma-implementation-track/phase-6/attempts/3/diff.patch
 *
 * Existing-coverage scan performed before authoring (Step 2.1): read every
 * scripts/validate/checks/*.test.mjs file's header/target-path constants
 * (artifact-naming, bootstrap-parity, dispatch-graph, docs-sync-phase1..4,
 * frontmatter-schema, native-validate, path-existence, registration-parity,
 * version-parity, gating-structure, figma-track-phase1..5). None of them
 * reads plugins/relay/agents/visual-verifier.md,
 * plugins/relay/commands/relay-implement.md's `### Phase A.3.4` body, or any
 * file under plugins/relay/scripts/visual/ — docs-sync-phase2.test.mjs's own
 * header explicitly scopes itself to relay-implement.md's `### Phase A.3.5`
 * body only (confirmed by direct read), and docs-sync-phase{1,3,4}.test.mjs
 * never touch relay-implement.md at all. This phase's five new/changed files
 * are therefore virgin territory — every test below is NEW_TEST_REQUIRED; no
 * EXISTING_TEST_UPDATED, OBSOLETE_TEST_REMOVED, or REDUNDANT_TEST_REMOVED
 * outcome applies to any in-scope AC this session.
 *
 * One property is EXISTING_TEST_COVERS transitively, documented here rather
 * than re-asserted (mirrors figma-track-phase5.test.mjs's identical
 * disclosure for research-design.md): registration-parity.test.mjs's and
 * dispatch-graph.test.mjs's own AC-10 real-wrapper tests only assert a
 * prp-core-SCOPED subset invariant, never a whole-tree zero-findings
 * property — so registration parity is NOT transitively re-proven by THOSE
 * tests. It IS, however, transitively re-proven by
 * figma-track-phase3.test.mjs's two dedicated real-wrapper tests
 * (`runDispatchGraphCheck()` / `runRegistrationParityCheck()`, both
 * `ok:true` with zero findings against the real repo tree, no fixture
 * isolation): since this phase's `visual-verifier` agent file,
 * `subagent_type="visual-verifier"` dispatch, and search-index.json/
 * changelog.html/agents.html registrations are now part of "whatever is
 * currently on disk," those two phase-3 tests already extend to cover this
 * phase's registration/dispatch-resolution properties too. None of this
 * phase's own Acceptance Criteria (AC-A1 through AC-A4 below) concern
 * documentation registration, so no dedicated test is authored for it here
 * either way — this note exists purely for existing-coverage-scan honesty.
 *
 * ENVIRONMENT-DEPENDENCY NOTE (governs the split between real-behavioral and
 * content-invariant tests below for the three new .mjs modules): this
 * phase's Task 1 deliberately keeps `plugins/relay/scripts/visual/` a
 * SEPARATE, self-contained npm package ("kept fully separate from the root
 * package.json ... so a non-Figma project never pays the Playwright/Chromium
 * install cost" — package.json's own description) — its `dependencies`
 * (playwright, pixelmatch, pngjs) are never installed by a root-level
 * `npm install` and are confirmed absent from this repository's own
 * node_modules tree (checked directly: no pngjs or pixelmatch anywhere under
 * node_modules; `playwright` the JS package IS present, but only as an
 * INCIDENTAL transitive dependency of the root devDependency `promptfoo` —
 * relying on that coupling would be fragile, since it has nothing to do with
 * this feature and could vanish if promptfoo's own dependency tree changes).
 * Consequently:
 *   - `provision.mjs` has ZERO external dependencies (only node: builtins) —
 *     safe to import and invoke for real in any environment. Its
 *     `waitForDevServer()` export is exercised with real, deterministic
 *     behavioral tests below (a real ephemeral HTTP server for the
 *     ready:true case; a freed, nothing-listening port for the timeout
 *     case). `provision()` itself shells out to `npx playwright install`
 *     and is out of scope for AC-A1/AC-A4 (which concern the DEV-SERVER
 *     timeout, not the Chromium-provisioning exec path) — it is not
 *     imported or invoked here.
 *   - `capture.mjs` imports `playwright` (present, but only incidentally —
 *     see above) and `./provision.mjs` (present, zero-dep) — importing it
 *     does not crash in THIS environment, but its behavior is asserted via
 *     content-invariant source-text checks below instead of a real
 *     `capture()` invocation, so the suite's legitimacy never depends on the
 *     incidental promptfoo coupling.
 *   - `compare.mjs` imports `pngjs` and `pixelmatch`, neither of which is
 *     reachable from ANY environment that only ran the root `npm install` —
 *     importing it would throw `ERR_MODULE_NOT_FOUND` at module-load time,
 *     which would fail this entire test FILE (not just one test). It is
 *     therefore never imported; its AC-A3 contract is asserted via
 *     content-invariant source-text checks against the real,
 *     already-implemented module, mirroring the established idiom this
 *     feature's own figma-track-phase1.test.mjs documents for prompt/config
 *     files with "no companion production module" — extended here to a
 *     companion production module that exists but cannot be safely
 *     function-invoked in this repository's own dependency-install state.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 6 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-6-visual-loop.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 6 per the plan's own Acceptance Criteria
 * section: AC-1 and AC-5 only, via plan AC-A1/AC-A2/AC-A3/AC-A4, all four of
 * which cite "(PRD AC-5)" and AC-A2 additionally cites "(PRD AC-1)". PRD
 * AC-2, AC-3, AC-4 are OUT_OF_PHASE_SCOPE — AC-2/AC-3 belong to phases
 * 3/4's already-shipped writer/reviewer pairs; AC-4 (design_source
 * declaration) is phase 5's already-shipped scope, not re-touched here):
 *
 *   AC-5 / AC-A1 (Visual loop bounded and non-blocking — outcome always
 *     recorded, pipeline proceeds to A.3.5/A.4 rather than halting) —
 *     Phase A.3.4's strict ordering between Phase A.3 and Phase A.3.5/A.4;
 *     zero HALT directives anywhere inside Phase A.3.4, with every terminal
 *     branch (SKIPPED, APPROVED, a named degraded rung, BUDGET_EXCEEDED,
 *     BUDGET_EXCEEDED_REVERTED) recording `visual_outcome` and proceeding
 *     "WITHOUT halting"; visual-verifier.md's Step 1 mapping every
 *     provision.mjs exit code to a definite branch (never unclassified);
 *     Hard constraint 4/5's "never silently drop the outcome" guarantees.
 *   AC-5 / AC-A2 (PRD AC-1 + AC-5 — inert when off, SKIPPED marker when
 *     opted-in-but-not-figma-sourced) — Phase A.0's non-heuristic
 *     `figma_track_declared`/`visual_verification_enabled` derivation
 *     (reusing existing declarations verbatim); the `--no-visual` flag
 *     extraction; the Final output surface's `Visual:` line PRESENCE (not
 *     just value) gated strictly on `figma_track_declared` in both PRD and
 *     PRD-less mode.
 *   AC-5 / AC-A3 (fidelity-report.json with per-frame PASS/FAIL + diff
 *     score) — the self-contained package.json's validity/dependency
 *     declaration; compare.mjs's per-frame entry shape and PASS/FAIL
 *     derivation against the frame's own diff_threshold; its AA-tolerant
 *     diffing; its never-mutates-a-reference-PNG guarantee;
 *     visual-verifier.md's Step 0 frame-manifest construction directly from
 *     the Design Spec's `## Visual Acceptance Criteria` table; Step 2's
 *     FULL-rung fidelity-report.json write via compare.mjs.
 *   AC-5 / AC-A4 (dev-server boot failure degrades to DEGRADED_STATIC_ONLY,
 *     still verifies token conformance, visible in both fidelity-report.json
 *     and visual_outcome, never blocks) — real behavioral tests of
 *     `waitForDevServer()`'s ready-true and readiness-timeout paths;
 *     capture.mjs's content-invariant wiring of that timeout into an early
 *     DEGRADED_STATIC_ONLY-triggering return strictly BEFORE any browser
 *     launch; visual-verifier.md's Step 1/2 rung routing; Step 3's
 *     degraded-mode stub shape (one entry per frame, `status` mirroring the
 *     rung, `token_conformant` recorded); Step 4's non-escalation of a
 *     degraded rung to VISUAL_MISMATCH.
 *
 * Run: node --test scripts/validate/checks/figma-track-phase6.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';

import { waitForDevServer } from '../../../plugins/relay/scripts/visual/provision.mjs';

const VISUAL_VERIFIER_PATH = 'plugins/relay/agents/visual-verifier.md';
const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';
const VISUAL_PACKAGE_JSON_PATH = 'plugins/relay/scripts/visual/package.json';
const CAPTURE_PATH = 'plugins/relay/scripts/visual/capture.mjs';
const COMPARE_PATH = 'plugins/relay/scripts/visual/compare.mjs';
const ROOT_PACKAGE_JSON_PATH = 'package.json';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses all whitespace runs (including line-wrap newlines) to a single
 * space, so multi-line prose/source assertions do not depend on exactly
 * where the file happens to wrap. Mirrors figma-track-phase1/3/5.test.mjs's
 * helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors figma-track-phase1/3/5.test.mjs's
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

// ---------------------------------------------------------------------------
// AC-5 / AC-A1 — Visual loop bounded and non-blocking: the outcome is always
// recorded (never silently dropped) and the pipeline proceeds to Phase A.3.5
// (docs-sync) and Phase A.4 (D8 mutations) rather than halting, regardless of
// budget exhaustion or a named degradation condition.
// ---------------------------------------------------------------------------

test('AC-A1: Phase A.3.4 (Visual-verification dispatch) sits strictly between Phase A.3 (code-reviewer dispatch) and Phase A.3.5 (docs-sync dispatch), which in turn precedes Phase A.4 (D8 mutations) — so Phase A.3.4 always completes, FULL or degraded or budget-exhausted, before docs-sync and the D8 mutations run', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const iA3 = content.indexOf('### Phase A.3 — Code-reviewer dispatch + verdict branching');
  const iA34 = content.indexOf('### Phase A.3.4 — Visual-verification dispatch');
  const iA35 = content.indexOf('### Phase A.3.5 — Docs-sync dispatch');
  const iA4 = content.indexOf('### Phase A.4 — D8 post-approval mutations (best-effort atomic with rollback note)');

  assert.notEqual(iA3, -1, 'expected a Phase A.3 heading');
  assert.notEqual(iA34, -1, 'expected a Phase A.3.4 heading');
  assert.notEqual(iA35, -1, 'expected a Phase A.3.5 heading');
  assert.notEqual(iA4, -1, 'expected a Phase A.4 heading');
  assert.ok(
    iA3 < iA34 && iA34 < iA35 && iA35 < iA4,
    'expected strict ordering Phase A.3 < Phase A.3.4 < Phase A.3.5 < Phase A.4'
  );
});

test('AC-A1: Phase A.3.4 never issues a HALT — every terminal branch (both SKIPPED reasons, APPROVED, a named degraded rung, BUDGET_EXCEEDED, BUDGET_EXCEEDED_REVERTED) records visual_outcome and proceeds to Phase A.3.5 instead, unlike the genuine HALT-issuing sections elsewhere in this same command', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(
    content,
    '### Phase A.3.4 — Visual-verification dispatch',
    '### Phase A.3.5 — Docs-sync dispatch'
  );
  assert.ok(block, 'expected an extractable Phase A.3.4 block');

  assert.ok(!/\bHALT\b/.test(block), 'Phase A.3.4 must never contain a HALT directive');

  const collapsed = collapseWs(block);
  assert.ok(collapsed.includes('Record `visual_outcome = "SKIPPED (--no-visual)"` when `no_visual_flag == true`'));
  assert.ok(collapsed.includes('otherwise `visual_outcome = "SKIPPED (not figma-sourced)"`'));
  assert.ok(collapsed.includes('**`VISUAL_VERIFIED`** → `visual_outcome = "APPROVED"`; proceed to Phase A.3.5.'));
  assert.ok(
    collapsed.includes(
      '**`VISUAL_DEGRADED`** → record the named rung (e.g. `DEGRADED_STATIC_ONLY`); log a warning; proceed to Phase A.3.5 WITHOUT halting (this is the AC-5 non-blocking guarantee).'
    )
  );
  assert.ok(collapsed.includes('set `visual_outcome = "BUDGET_EXCEEDED_REVERTED"`; proceed to Phase A.3.5 WITHOUT halting.'));
  assert.ok(collapsed.includes('set `visual_outcome = "BUDGET_EXCEEDED"`; proceed to Phase A.3.5 WITHOUT halting.'));
});

test('AC-A1: visual-verifier.md\'s Step 1 maps EVERY provision.mjs outcome (exit 0, 2, 3, or any other/unrecognized code) to a definite branch — proceed FULL or degrade to DEGRADED_PROVISION_FAILED — never an unhandled or unclassified outcome', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 1 — Provision', '### Step 2 — Capture + compare (FULL rung only)');
  assert.ok(block, 'expected an extractable Step 1 block');
  const collapsed = collapseWs(block);

  assert.ok(collapsed.includes('**`0`** — Chromium is ready. Proceed to Step 2 (capture).'));
  assert.ok(
    collapsed.includes(
      '**`2`** (`PROVISION_FAILED_NETWORK`) — network-blocked / restricted environment. Set `rung = "DEGRADED_PROVISION_FAILED"`.'
    )
  );
  assert.ok(
    collapsed.includes('**`3`** (`PROVISION_FAILED_OTHER`) — any other provisioning failure. Set `rung = "DEGRADED_PROVISION_FAILED"`.')
  );
  assert.ok(
    collapsed.includes(
      '**Any other exit code** — treated as `PROVISION_FAILED_OTHER` per Hard constraint 4. Set `rung = "DEGRADED_PROVISION_FAILED"`.'
    )
  );
});

test('AC-A1: visual-verifier.md\'s Hard constraints guarantee the outcome is never silently dropped — an unrecognized provision.mjs exit code still degrades (never silently reports FULL), and fidelity-report.json always gets one entry per in-scope frame, on every rung', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '## Hard constraints (read before anything else)', '## Protocol');
  assert.ok(block, 'expected an extractable Hard constraints block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'An unrecognized exit code from `provision.mjs` is treated as `DEGRADED_PROVISION_FAILED` — fail toward the safer degraded rung, never toward silently reporting `FULL`.'
    )
  );
  assert.ok(
    collapsed.includes(
      'Whether written by `compare.mjs` (FULL rung) or by this agent directly (degraded rungs), every in-scope frame gets an entry — never a partial file, never a silently omitted frame.'
    )
  );
});

// ---------------------------------------------------------------------------
// AC-5 / AC-A2 (PRD AC-1, PRD AC-5) — inert when off; a SKIPPED marker only
// once a project has already opted in at the methodology level.
// ---------------------------------------------------------------------------

test('AC-A2: Phase A.0 derives figma_track_declared and visual_verification_enabled by reusing the existing figma_track/design_source declarations verbatim — never a new methodology.md key — with --no-visual always taking precedence over the derived flag', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(
    content,
    'Also read the same `docs/context/methodology.md` frontmatter for the `figma_track` key,',
    'Soft-fail concurrency diagnostic per source PRD D18'
  );
  assert.ok(block, 'expected an extractable figma_track_declared/visual_verification_enabled derivation block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'recording `figma_track_declared = (figma_track == true)` (boolean; default `false` when the key is absent'
    )
  );
  assert.ok(
    collapsed.includes(
      "derive `visual_verification_enabled = figma_track_declared AND this plan's design_source == \"figma\"`."
    )
  );
  assert.ok(
    collapsed.includes('Both derivations reuse existing declarations verbatim — never a new methodology.md key')
  );
  assert.ok(
    collapsed.includes(
      '`no_visual_flag` (set in `## Parse arguments`) always wins over `visual_verification_enabled` — either one alone is sufficient to skip the visual-verification sub-phase.'
    )
  );
});

test('AC-A2: the Parse arguments preamble extracts --no-visual as a sibling flag to --no-docs, defaulting no_visual_flag to false, consumed by Phase A.3.4\'s gate', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(
    content,
    '## Parse arguments',
    '`$ARGUMENTS` (after flag extraction) MUST be a single non-empty path-like string.'
  );
  assert.ok(block, 'expected an extractable Parse arguments preamble block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'Scan `$ARGUMENTS` for the literal token `--no-visual`; when present, strip it from `$ARGUMENTS` and record `no_visual_flag = true` (default `false`) — sibling extraction to `--no-docs` above, consumed by Phase A.3.4\'s gate (below).'
    )
  );
});

test('AC-A2 (PRD AC-1, PRD AC-5): the Final output surface\'s Visual: line PRESENCE (not just its value) is gated on figma_track_declared in BOTH PRD mode and PRD-less mode — omitted entirely, no line and no SKIPPED marker, when figma_track_declared is false, keeping a non-Figma project\'s output byte-identical to today\'s', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const block = sliceBetween(content, '## Final output surface', '## Constraints (hard rules)');
  assert.ok(block, 'expected an extractable Final output surface section');

  const visualLine =
    '> Visual: `<visual_outcome>` (`APPROVED` / named degraded rung, e.g. `DEGRADED_STATIC_ONLY` / `BUDGET_EXCEEDED` / `BUDGET_EXCEEDED_REVERTED` / `SKIPPED (not figma-sourced)` / `SKIPPED (--no-visual)`) — **this line\'s very presence is gated on `figma_track_declared`** (Phase A.0): shown ONLY when `figma_track_declared == true`; when `figma_track_declared == false` the line is OMITTED ENTIRELY (no line, no `SKIPPED` marker, nothing), so a non-Figma project\'s output stays byte-identical to today\'s (PRD AC-1 of `figma-implementation-track.prd.md`).';

  const occurrences = block.split(visualLine).length - 1;
  assert.equal(occurrences, 2, 'expected the identical Visual: line + gating note to appear once in PRD mode and once in PRD-less mode');
});

// ---------------------------------------------------------------------------
// AC-5 / AC-A3 — a real implementation attempt against an APPROVED Design
// Spec's ## Visual Acceptance Criteria table produces a fidelity-report.json
// with one entry per in-scope frame carrying an explicit PASS/FAIL status
// and diff score.
// ---------------------------------------------------------------------------

test('AC-A3: plugins/relay/scripts/visual/package.json is valid JSON declaring the three self-contained tooling dependencies (playwright, pixelmatch, pngjs), a postinstall Chromium-provisioning script, and stays fully separate from the root package.json (own private package name, never merged in)', () => {
  const pkg = JSON.parse(readRepoFile(VISUAL_PACKAGE_JSON_PATH));

  assert.equal(pkg.name, '@relay/visual-tooling');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.ok(pkg.dependencies && pkg.dependencies.playwright, 'expected a playwright dependency');
  assert.ok(pkg.dependencies && pkg.dependencies.pixelmatch, 'expected a pixelmatch dependency');
  assert.ok(pkg.dependencies && pkg.dependencies.pngjs, 'expected a pngjs dependency');
  assert.equal(pkg.scripts && pkg.scripts.postinstall, 'playwright install --with-deps chromium');

  const rootPkg = JSON.parse(readRepoFile(ROOT_PACKAGE_JSON_PATH));
  const rootDeps = { ...(rootPkg.dependencies || {}), ...(rootPkg.devDependencies || {}) };
  assert.ok(
    !('playwright' in rootDeps) && !('pixelmatch' in rootDeps) && !('pngjs' in rootDeps),
    'the root package.json must not directly declare any of the visual-tooling dependencies — the package stays self-contained'
  );
});

test('AC-A3: compare.mjs\'s compare() writes one fidelity-report.json entry per frame carrying an explicit PASS/FAIL status derived from diff_percent vs. the frame\'s own diff_threshold, plus the diff score itself, and writes exclusively to reportPath (never to the reference PNG)', () => {
  const content = readRepoFile(COMPARE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes("const status = diffPercent <= frame.diff_threshold ? 'PASS' : 'FAIL';"));
  assert.ok(
    collapsed.includes(
      'return { node_id: frame.node_id, route: frame.route, diff_percent: Number(diffPercent.toFixed(4)), threshold: frame.diff_threshold, status, masked_regions: frame.masks ?? [], };'
    )
  );
  // Note: the shape/derivation is asserted at the CODE level above (the
  // `status = ... ? 'PASS' : 'FAIL'` line and the literal `return {...}`
  // object), not against the module's `/** ... */` doc-comment restating the
  // same shape in prose — that comment's shape description spans three
  // `* `-prefixed continuation lines, which collapseWs (whitespace-only
  // collapsing) does not merge into a matchable single-line string here,
  // unlike this feature's markdown-file assertions elsewhere in this suite.

  const writeFileCalls = [...content.matchAll(/writeFile\(([^,]+),/g)].map((m) => m[1].trim());
  assert.deepEqual(writeFileCalls, ['reportPath'], 'expected the ONLY writeFile() call in compare.mjs to target reportPath');
});

test('AC-A3: compare.mjs runs an antialiasing-aware (AA-tolerant) pixelmatch diff — antialiased pixels excluded from the diff count — rather than a naive hard pixel-count threshold', () => {
  const content = readRepoFile(COMPARE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      '{ threshold: 0.1, includeAA: false } // AA-tolerant: antialiased pixels are excluded from the diff count'
    )
  );
});

test('AC-A3 (anti-pattern guard): compare.mjs never mutates a reference PNG — masking operates on in-memory clones only, never on the loaded reference/captured buffers themselves', () => {
  const content = readRepoFile(COMPARE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes('the reference PNG on disk is never mutated'));
  assert.ok(
    collapsed.includes(
      'const maskedCaptured = applyMasks(clonePng(captured), frame.masks); const maskedReference = applyMasks(clonePng(reference), frame.masks);'
    )
  );
});

test('AC-A3: visual-verifier.md\'s Step 0 builds the in-memory frame manifest directly from the APPROVED Design Spec\'s ## Visual Acceptance Criteria table — one manifest entry per table row', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 0 — Ground yourself', '### Step 1 — Provision');
  assert.ok(block, 'expected an extractable Step 0 block');
  const collapsed = collapseWs(block);

  assert.ok(collapsed.includes('`Read` `design_spec_path` and locate the `## Visual Acceptance Criteria` table'));
  assert.ok(
    collapsed.includes(
      'Build the in-memory frame manifest: one entry per Visual Acceptance Criteria row — `{node_id, route, preconditions, auth_mode, viewport: {width, height}, diff_threshold, ref_png, masks}`.'
    )
  );
});

test('AC-A3: visual-verifier.md\'s Step 2 (FULL rung) runs compare.mjs to write fidelity-report.json directly — not the agent itself on this rung — then reads it back to build the Step 4 classification input', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 2 — Capture + compare (FULL rung only)', '### Step 3 — Degraded static check');
  assert.ok(block, 'expected an extractable Step 2 block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'This writes `fidelity-report.json` directly — you do not write it yourself on this rung.'
    )
  );
  assert.ok(
    collapsed.includes(
      '`Read` the just-written `fidelity_report_path` to build the classification input for Step 4. Set `rung = "FULL"`.'
    )
  );
});

// ---------------------------------------------------------------------------
// AC-5 / AC-A4 — a dev-server boot failure within the readiness-probe
// timeout degrades to DEGRADED_STATIC_ONLY (still verifying token
// conformance) rather than crashing or silently skipping; the degradation is
// visible in both fidelity-report.json and visual_outcome; delivery is not
// blocked.
// ---------------------------------------------------------------------------

test('AC-A4: waitForDevServer(url, {timeoutMs}) resolves { ready: true } when the dev server responds to a GET request', async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', () => res(undefined)));
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'expected server.address() to return an AddressInfo object');
  try {
    const result = await waitForDevServer(`http://127.0.0.1:${address.port}`, { timeoutMs: 2000 });
    assert.equal(result.ready, true);
    assert.equal(typeof result.elapsedMs, 'number');
  } finally {
    await new Promise((res) => server.close(() => res(undefined)));
  }
});

test('AC-A4: waitForDevServer(url, {timeoutMs}) resolves { ready: false, reason: "DEV_SERVER_TIMEOUT" } — never throws, never hangs past the bound — when the dev server never becomes reachable, which is the exact readiness-probe timeout capture.mjs relies on to trigger the DEGRADED_STATIC_ONLY rung', async () => {
  const server = createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', () => res(undefined)));
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'expected server.address() to return an AddressInfo object');
  const freedPort = address.port;
  await new Promise((res) => server.close(() => res(undefined)));
  // freedPort is now closed — nothing listens on it, so connections refuse immediately.

  const result = await waitForDevServer(`http://127.0.0.1:${freedPort}`, { timeoutMs: 300 });
  assert.equal(result.ready, false);
  assert.equal(result.reason, 'DEV_SERVER_TIMEOUT');
});

test('AC-A4: capture.mjs wires waitForDevServer\'s readiness-probe timeout into an early DEGRADED_STATIC_ONLY-triggering return — logging CAPTURE_FAILED_DEV_SERVER_TIMEOUT and returning BEFORE ever launching the browser — so a boot failure degrades gracefully rather than crashing or silently skipping', () => {
  const content = readRepoFile(CAPTURE_PATH);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes("import { waitForDevServer } from './provision.mjs';"));
  assert.ok(
    collapsed.includes(
      "const readiness = await waitForDevServer(devServerUrl, { timeoutMs: DEV_SERVER_TIMEOUT_MS }); if (!readiness.ready) { console.error('CAPTURE_FAILED_DEV_SERVER_TIMEOUT'); return { ok: false, reason: 'DEV_SERVER_TIMEOUT', results: [] }; }"
    )
  );

  const readinessCheckIdx = content.indexOf("console.error('CAPTURE_FAILED_DEV_SERVER_TIMEOUT')");
  const browserLaunchIdx = content.indexOf('chromium.launch(');
  assert.notEqual(readinessCheckIdx, -1, 'expected the dev-server readiness-timeout branch to be present');
  assert.notEqual(browserLaunchIdx, -1, 'expected a chromium.launch( call to be present');
  assert.ok(
    readinessCheckIdx < browserLaunchIdx,
    'the dev-server readiness check (and its early return) must appear BEFORE the browser is ever launched, so a boot failure never reaches chromium.launch'
  );
});

test('AC-A4: visual-verifier.md\'s Step 2 routes a capture-reported dev-server readiness-probe timeout to rung = DEGRADED_STATIC_ONLY and skips compare.mjs entirely, never crashing or silently skipping verification', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 2 — Capture + compare (FULL rung only)', '### Step 3 — Degraded static check');
  assert.ok(block, 'expected an extractable Step 2 block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'If capture reports a dev-server readiness-probe timeout (non-zero exit, `CAPTURE_FAILED_DEV_SERVER_TIMEOUT` on stderr) — the dev server never became ready. Set `rung = "DEGRADED_STATIC_ONLY"`. Skip `compare.mjs`; go to Step 3.'
    )
  );
});

test('AC-A4: visual-verifier.md\'s Step 3 writes a degraded-mode stub directly into fidelity-report.json (one entry per in-scope frame, status mirroring the rung, token_conformant recorded) whenever compare.mjs was skipped — so the degradation is visible in the artifact itself, not only in visual_outcome', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 3 — Degraded static check (either degraded rung)', '### Step 4 — Classify');
  assert.ok(block, 'expected an extractable Step 3 block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      'this agent writes the degraded-mode stub itself, one entry per in-scope frame. This is what makes degradation still verify *something*, never nothing (AC-A4):'
    )
  );
  assert.ok(collapsed.includes('"diff_percent": null,'));
  assert.ok(collapsed.includes('"status": "DEGRADED_STATIC_ONLY | DEGRADED_PROVISION_FAILED",'));
  assert.ok(collapsed.includes('"token_conformant": true'));
  assert.ok(
    collapsed.includes(
      "`status` on every entry matches `rung` from Step 1/2 verbatim. This is what makes the degradation visible in the artifact itself (AC-A4), not only in `/relay-implement`'s own `visual_outcome`."
    )
  );
});

test('AC-A4: visual-verifier.md\'s Step 4 classifies any degradation rung as VISUAL_DEGRADED — always non-blocking — and never escalates it to VISUAL_MISMATCH regardless of per-frame token conformance', () => {
  const content = readRepoFile(VISUAL_VERIFIER_PATH);
  const block = sliceBetween(content, '### Step 4 — Classify', '## Outputs');
  assert.ok(block, 'expected an extractable Step 4 block');
  const collapsed = collapseWs(block);

  assert.ok(
    collapsed.includes(
      '**A degradation rung was hit** (`rung != "FULL"`) → `VISUAL_DEGRADED`. Always non-blocking (AC-A1/AC-A4)'
    )
  );
  assert.ok(collapsed.includes('it never escalates a degraded rung to `VISUAL_MISMATCH`'));
});
