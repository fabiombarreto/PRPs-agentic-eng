// @ts-check
/**
 * Content-invariant tests for Phase 1 ("formatter_cmd contract") of the
 * test-formatting-prevention-preflight feature —
 * plugins/relay/skills/context-builder/SKILL.md (Step 5's `formatter_cmd`
 * Init/Update-behavior contract), docs/context/methodology.md (this repo's
 * own dogfooded instance of the key), and
 * scripts/validate/checks/gating-structure.mjs (the comment-only
 * SITES-exclusion rationale + structural confirmation that `formatter_cmd`
 * is NOT a registered gating site).
 *
 * Same idiom as docs-sync-phase1.test.mjs / usage-metrics-phase1.test.mjs /
 * figma-track-phase1.test.mjs: this phase's deliverable is prompt/config
 * markdown prose plus one comment-only edit to an existing check module —
 * there is no new production .mjs export to unit-test directly (the
 * frontmatter key itself is inert; nothing consumes it yet — that is Phase 2
 * Prevention / Phase 3 Preflight). The meaningful, non-trivial, discriminative
 * assertion is: does the documented contract actually state what AC-6 and
 * AC-8 (narrowed) require, in the exact non-heuristic emit/preserve/backfill
 * shape already established for `docs_sync`/`tdd_evidence`/`figma_track`?
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 1 plan
 * (PRPs/plans/completed/test-formatting-prevention-preflight-phase-1-formatter-cmd-contract.plan.md).
 *
 * Traceability (PRPs/prds/test-formatting-prevention-preflight.prd.md
 * Acceptance Criteria; only AC-6 and AC-8 are in-scope for Phase 1 per the
 * plan's own Acceptance Criteria section — AC-1/2/3/4/5/7 are
 * OUT_OF_PHASE_SCOPE, deferred to Phases 2-4; see
 * PRPs/reports/test-formatting-prevention-preflight/test-suite.diff):
 *   AC-6 (Non-heuristic key contract) — plan AC-A1 (Init: SKILL.md always
 *     emits `formatter_cmd: null`), AC-A2 (Update: SKILL.md preserves an
 *     already-set value untouched and backfills `null` ONLY when the key is
 *     entirely absent), AC-A3 (this repo's own docs/context/methodology.md
 *     documents the key with a `## Formatter` section mirroring `## Docs
 *     Sync`'s two-subsection shape).
 *   AC-8 (Validation green, narrowed to Phase 1's change surface, plan
 *     AC-A4) — the `gating-structure.mjs` `SITES` registry stays exactly
 *     `{figma_track, visual_first_approval}` (no `formatter_cmd` entry) with
 *     the exclusion rationale documented inline, AND that the existing
 *     `gating-structure` check's pass/fail behavior against real content is
 *     structurally unaffected by formatter_cmd's absence from any
 *     `SITES`-registered markers. The full "`npm run validate` exits 0"
 *     component of AC-8 is deliberately NOT re-encoded here as a spawned
 *     end-to-end command test — the PRD's own Success Metrics table names
 *     "CI-less pre-commit gate + manual run" (not a unit test) as How
 *     Measured for that row, and no precedent test file in this corpus
 *     shells `npm run validate` itself (native-validate.test.mjs shells a
 *     *fixture* `claude` CLI for check A, a materially different target).
 *     The discriminative, silently-regressable sub-properties (registry
 *     membership + rationale prose + structural non-requirement) are what
 *     this file actually tests.
 *   EXISTING_TEST_COVERS (documented, not re-tested here): the "no existing
 *     check — including gating-structure — regresses" component of AC-8 is
 *     already covered by two tests in
 *     scripts/validate/checks/gating-structure.test.mjs:
 *       - :136-142 ("checkGatingStructure: ok:true with zero findings when
 *         every registered site's markers ... are all present") — its
 *         ALL_MARKERS_PRESENT fixture predates formatter_cmd and mentions it
 *         nowhere, so this already proves formatter_cmd's total absence from
 *         a SITES-satisfying document produces zero findings (i.e.
 *         formatter_cmd genuinely adds no new required marker — the same
 *         property a bespoke fixture in this file would otherwise
 *         duplicate with no discriminative difference).
 *       - :291 ("runGatingStructureCheck: ok:true with zero findings
 *         against the real, already-implemented SKILL.md") — re-reads the
 *         real SKILL.md fresh on every run, so it transitively re-confirms
 *         the comment-only gating-structure.mjs edit did not regress the
 *         check's behavior against the real, formatter_cmd-carrying file.
 *
 * Run: node --test scripts/validate/checks/test-formatting-prevention-preflight-phase1.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SKILL_PATH = 'plugins/relay/skills/context-builder/SKILL.md';
const METHODOLOGY_PATH = 'docs/context/methodology.md';
const GATING_STRUCTURE_SOURCE_PATH = 'scripts/validate/checks/gating-structure.mjs';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`, so
 * `^...$`/`/m` assertions behave identically regardless of the checkout's
 * line-ending configuration (this repo carries no repo-wide
 * `.gitattributes`; mirrors usage-metrics-phase1.test.mjs's readText).
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Extracts a `## <heading>` section's body, up to the next `## ` heading at
 * column 0 (or end of file). Mirrors usage-metrics-phase1.test.mjs's
 * relationSection helper.
 * @param {string} content
 * @param {string} heading
 * @returns {string}
 */
function sectionBody(content, heading) {
  const marker = `## ${heading}\n`;
  const start = content.indexOf(marker);
  assert.notEqual(start, -1, `expected a "## ${heading}" section`);
  const rest = content.slice(start + 1);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, plan AC-A1) — context-builder SKILL.md Step 5: `*init`
// always emits `formatter_cmd: null` deterministically, never heuristically
// inferred, mirroring the `tdd_evidence: null` default-emission precedent.
// ---------------------------------------------------------------------------

test('AC-6/AC-A1: SKILL.md Step 5 frontmatter template declares formatter_cmd: null with its documented meaning', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(
    content,
    /formatter_cmd: null\s+# null \| "<command string>" — project formatter command; null means undeclared; never heuristically inferred/,
    'expected the fenced frontmatter template to carry the formatter_cmd key with its inline contract comment'
  );
});

test('AC-6/AC-A1: SKILL.md Init behavior always emits formatter_cmd: null, mirroring the tdd_evidence: null precedent verbatim', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(content, /Always emit `formatter_cmd: null` — the per-project declared formatter/);
  assert.match(content, /command defaults to undeclared, mirroring the `tdd_evidence: null`/);
  assert.match(content, /default-emission precedent verbatim\. Never heuristically inferred from/);
});

test('AC-6/AC-A1: SKILL.md Init behavior states formatter_cmd is NEVER inferred from package.json scripts.format, devDependencies, or config files', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(content, /`package\.json` `scripts\.format`, installed devDependencies, or config/);
  assert.match(content, /files — that fallback is a later phase's own runtime discovery at/);
  assert.match(content, /formatting time, never a value written back into this file/);
});

test('AC-6/AC-A1: SKILL.md Init behavior states formatter_cmd flips away from null only via a human edit', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(content, /emitted deterministically on every `\*init` run\. Flips away from `null`/);
  assert.match(content, /only via a human edit to this file\./);
});

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, plan AC-A2) — context-builder SKILL.md Step 5: `*update`
// preserves an already-set formatter_cmd value (including explicit null)
// untouched; backfills formatter_cmd: null ONLY when the key is entirely
// absent — the ONLY case *update adds the key.
// ---------------------------------------------------------------------------

test('AC-6/AC-A2: SKILL.md Update behavior declares a dedicated formatter_cmd preservation bullet naming the tdd/docs_sync precedent', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(content, /\*\*`formatter_cmd` preservation\*\*: if `formatter_cmd` is already/);
  assert.match(content, /present in the frontmatter \(including an explicit `null`\), preserve/);
  assert.match(content, /its value untouched — same treatment as `tdd`\/`docs_sync`\. If the/);
});

test('AC-6/AC-A2: SKILL.md Update behavior backfills formatter_cmd: null ONLY when the key is entirely absent, and never flips an existing non-null value', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(content, /key is entirely absent, backfill `formatter_cmd: null` — the ONLY/);
  assert.match(content, /case `\*update` adds this key; never remove or flip an existing/);
  assert.match(content, /non-null value, and never infer one from `package\.json`/);
  assert.match(content, /`scripts\.format` or any other project file\./);
});

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, Phase 1 Scope, plan AC-A3) — this repo's own
// docs/context/methodology.md is backfilled with formatter_cmd: null in the
// frontmatter and documents it with a "## Formatter" body section mirroring
// the "## Docs Sync" section's two-subsection shape (Current state / How to
// override).
// ---------------------------------------------------------------------------

test('AC-6/AC-A3: docs/context/methodology.md frontmatter declares formatter_cmd: null', () => {
  const content = readRepoFile(METHODOLOGY_PATH);

  assert.match(content, /^formatter_cmd: null$/m);
});

test('AC-6/AC-A3: docs/context/methodology.md has a "## Formatter" section documenting the not-declared default and how to override it', () => {
  const content = readRepoFile(METHODOLOGY_PATH);

  assert.match(content, /^## Formatter$/m, 'expected a "## Formatter" body section heading');

  const formatterSection = sectionBody(content, 'Formatter');
  assert.match(
    formatterSection,
    /Current state: \*\*not declared\*\* \(default\) — `formatter_cmd: null` in the/,
    'expected the Current state subsection stating the not-declared default'
  );
  assert.match(formatterSection, /### How to override/, 'expected a "### How to override" subsection');
});

test('AC-6/AC-A3: the "## Formatter" section mirrors "## Docs Sync"\'s two-subsection shape (both carry Current state + How to override)', () => {
  const content = readRepoFile(METHODOLOGY_PATH);

  const docsSyncSection = sectionBody(content, 'Docs Sync');
  const formatterSection = sectionBody(content, 'Formatter');

  for (const section of [docsSyncSection, formatterSection]) {
    assert.match(section, /Current state:/);
    assert.match(section, /### How to override/);
  }
});

test('AC-6/AC-A3: "## Formatter"\'s How-to-override subsection states the non-heuristic emit/preserve/backfill contract (never inferred from scripts.format, never flipping a set value)', () => {
  const content = readRepoFile(METHODOLOGY_PATH);
  const formatterSection = sectionBody(content, 'Formatter');

  assert.match(formatterSection, /Heuristics MUST NOT flip this value — only a human edit can\./);
  assert.match(formatterSection, /`context-builder` `\*init` always emits the deterministic default/);
  assert.match(formatterSection, /`formatter_cmd: null` \(never heuristically inferred from/);
  assert.match(formatterSection, /`package\.json` `scripts\.format`, installed devDependencies, or config/);
  assert.match(formatterSection, /files\); `\*update` preserves an existing value untouched and backfills/);
  assert.match(formatterSection, /`formatter_cmd: null` only when the key is entirely absent — never/);
  assert.match(formatterSection, /flipping a set value\./);
});

// ---------------------------------------------------------------------------
// AC-8 (PRD AC-8, narrowed to Phase 1's change surface, plan AC-A4) —
// gating-structure.mjs's SITES registry stays exactly {figma_track,
// visual_first_approval}: no `formatter_cmd` entry was added, and the
// exclusion rationale is documented inline in the module's docstring.
// ---------------------------------------------------------------------------

test('AC-8/AC-A4: gating-structure.mjs documents the formatter_cmd SITES-exclusion rationale inline', () => {
  const content = readRepoFile(GATING_STRUCTURE_SOURCE_PATH);

  assert.match(content, /`formatter_cmd` \(introduced by `test-formatting-prevention-preflight`/);
  assert.match(content, /Phase 1\) was evaluated against this registry and intentionally/);
  assert.match(content, /excluded — it is a declared command-STRING value key \(default `null`\),/);
  assert.match(content, /not a boolean opt-in track-gate like `figma_track`\//);
  assert.match(content, /emit\/preserve\/backfill discipline via `docs_sync`\/`tdd_evidence`'s/);
  assert.match(content, /precedent, neither of which is a `SITES` entry either\./);
});

test('AC-8/AC-A4: gating-structure.mjs\'s SITES registry gained NO formatter_cmd entry (mirrors the plan\'s own Task 4 VALIDATE command)', () => {
  const content = readRepoFile(GATING_STRUCTURE_SOURCE_PATH);

  assert.doesNotMatch(
    content,
    /key:\s*'formatter_cmd'/,
    'formatter_cmd must not be registered as a SITES entry — it is a declared value key, not a boolean opt-in track-gate'
  );
});
