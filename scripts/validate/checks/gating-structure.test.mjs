// @ts-check
/**
 * Unit tests for the check — gating-structure — the pure
 * `checkGatingStructure` function and the `runGatingStructureCheck` thin
 * wrapper exported by scripts/validate/checks/gating-structure.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module, mirroring
 * scripts/validate/checks/frontmatter-schema.test.mjs's shape: synthetic
 * in-memory fixtures exercise the pure function's marker logic, plus one
 * real-wrapper test against the actual repository tree (mirroring
 * frontmatter-schema.test.mjs's AC-10 real-wrapper test and
 * native-validate.test.mjs's real-invocation precedent).
 *
 * Source PRDs / plans (this file now covers FOUR registered SITES entries,
 * added by four different features):
 *   - figma_track site: PRPs/prds/figma-implementation-track.prd.md
 *     (v1), PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md
 *   - visual_first_approval site: PRPs/prds/figma-visual-first-track.prd.md
 *     (v2), PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md
 *   - lane_runtime_safe site: PRPs/prds/parallel-phase-execution.prd.md,
 *     its Phase 4 plan
 *   - hybrid_code_review site: PRPs/prds/hybrid-code-review.prd.md,
 *     PRPs/plans/hybrid-code-review-phase-1-contract-and-opt-in.plan.md
 *     Task 3
 *
 * Lifecycle update (2026-07-24, EXISTING_TEST_UPDATED): the
 * figma-visual-first-track Phase 1 plan extended gating-structure.mjs's
 * `SITES` registry from 1 entry (`figma_track`) to 2
 * (`figma_track`, `visual_first_approval`) — by design, per the module's own
 * "Extensible by design" docstring. `checkGatingStructure` requires ALL
 * registered sites' markers present in `skillContent` for a globally empty
 * `findings` array; the pre-existing `ALL_MARKERS_PRESENT` fixture (and the
 * five tests built on it) predated that growth and covered `figma_track`
 * markers only, so — confirmed by actually running this file before making
 * any change — 5 of its 8 tests started failing the moment the 2nd site
 * landed (`ok:true`/`findings:[]` assertions found 3 unexpected
 * visual_first_approval findings; the "3 independent findings" test found 6
 * instead of 3). This is NOT a production defect: `npm run validate`'s own
 * `gating-structure` check, and this file's own untouched real-wrapper test
 * below, both still pass — the real, already-implemented SKILL.md correctly
 * documents both sites. The defect was confined to the synthetic fixture's
 * staleness. Fix applied here: `ALL_MARKERS_PRESENT` is extended to also
 * carry all three `visual_first_approval` markers (so "all markers present"
 * again means all markers for every currently-registered site, matching
 * what the fixture's own name always promised); the three
 * "fails naming ... figma_track marker" tests need no further change once
 * the fixture is extended (verified empirically); the
 * "reports all three findings independently" test is rescoped explicitly to
 * figma_track (new input fixture: visual_first_approval fully satisfied,
 * figma_track markers absent) with an added site-scoping assertion — the
 * original figma_track-3-independent-findings property is preserved in
 * full, never weakened, just no longer ambiguous now that a 2nd
 * independently-required site exists. Four new tests mirror the same shape
 * for visual_first_approval's own three markers (previously impossible to
 * write — the site did not exist). Full justification recorded in
 * PRPs/reports/figma-visual-first-track/test-suite.diff's Lifecycle ledger.
 *
 * Lifecycle update (2026-09-02, EXISTING_TEST_UPDATED): the
 * parallel-phase-execution Phase 4 plan extended `SITES` from 2 entries to 3
 * (`lane_runtime_safe`), again by design per the module's "Extensible by
 * design" docstring. Exactly as in 2026-07-24, the synthetic
 * `ALL_MARKERS_PRESENT` fixture predated the growth and covered only the two
 * older sites, so — confirmed by running this file before making any change —
 * 9 of its tests began failing the moment the 3rd site landed. This is NOT a
 * production defect: `npm run validate`'s own `gating-structure` check and this
 * file's untouched real-wrapper test both still pass, because the real SKILL.md
 * documents all three sites correctly. The defect was confined to the fixture's
 * staleness. Fix applied here: `ALL_MARKERS_PRESENT` is extended with
 * `lane_runtime_safe`'s three markers, so "all markers present" again means all
 * markers for every currently-registered site — the same remedy the previous
 * growth used, and the reason no assertion is weakened. Three new tests mirror
 * the established shape for `lane_runtime_safe`'s own markers.
 *
 * Lifecycle update (2026-09-23, EXISTING_TEST_UPDATED, arbitrated): the
 * hybrid-code-review Phase 1 plan (`PRPs/plans/hybrid-code-review-phase-1-contract-and-opt-in.plan.md`
 * Task 3) extended `SITES` from 3 entries to 4 (`hybrid_code_review`), again
 * by design per the module's "Extensible by design" docstring. A
 * TEST_CONTRACT_DISPUTE raised over this exact file was arbitrated
 * `DISPUTE_UPHELD_TEST_WRONG`
 * (`PRPs/plans/hybrid-code-review-phase-1-contract-and-opt-in.code-review.jsonl`,
 * attempt 2, arbitration mode): running this file before making any change
 * gave 13 fail / 3 pass, all fixture-staleness, none a production defect —
 * `npm run validate`'s own `gating-structure` check and this file's untouched
 * real-wrapper test both still pass, because the real SKILL.md already
 * documents all four sites (Task 1 of the same plan). Fix applied here,
 * following the arbitration's preferred remedy: rather than re-hardcoding a
 * 4th literal block (the same manual-edit shape that needed a fixture fix in
 * each of the three prior site-growth events), the per-site marker prose is
 * now factored into a single `SITE_PROSE` map keyed by site name;
 * `ALL_MARKERS_PRESENT` and every "fully satisfied except site X" fixture
 * used by the independently-reported-findings tests are now DERIVED from
 * that map (via `proseExcept`), so the next `SITES` growth needs only one
 * new `SITE_PROSE` entry instead of a hand-edit to N different literal
 * fixture strings. No assertion is weakened: every property the pre-existing
 * tests verified (which site, which marker id, exact finding count) is
 * preserved verbatim; `hybrid_code_review` additionally gains its own
 * four-test block (three single-marker-missing tests + one
 * independently-reported-findings test) mirroring the three prior sites'
 * shape exactly — new coverage, not a removal. Full justification recorded
 * in PRPs/reports/hybrid-code-review/test-suite.diff's Lifecycle ledger.
 *
 * Traceability (plan Acceptance Criteria, phase 1 in-scope subset, all
 * features):
 *   v1 AC-A2 (PRD AC-4 "Non-heuristic declaration always present") — the
 *     gating-structure check verifies all three non-heuristic properties
 *     (default-false emission, preserve-on-update, backfill-only-when-
 *     absent) are documented for the `figma_track` site. Covered by the
 *     pure-function marker tests below.
 *   v1 AC-A1 (PRD AC-1 "Inert when off") — the one check this phase adds to
 *     `npm run validate` passes with zero Figma-related findings against
 *     the real, already-implemented SKILL.md. Covered by the real-wrapper
 *     test below (the complementary "Given absent figma_track" precondition
 *     fact — this repo's own docs/context/methodology.md has no
 *     figma_track key — is asserted separately in
 *     scripts/validate/checks/figma-track-phase1.test.mjs, which also
 *     carries the AC-A3/AC-A4 delta tests).
 *   v2 AC-A7 (PRD AC-4 "Non-heuristic declaration always present", source:
 *     PRPs/prds/figma-visual-first-track.prd.md) — the gating-structure
 *     check verifies the same three non-heuristic properties are documented
 *     for the new `visual_first_approval` site, extending the same
 *     deterministic enforcement figma_track already has. Covered by the new
 *     pure-function marker tests below and by the (untouched)
 *     real-wrapper test, which now transitively covers both sites.
 *   hybrid-code-review AC-A2 (PRD AC-2 "Declared, never inferred") — the
 *     gating-structure check verifies the same three non-heuristic
 *     properties are documented for the new `hybrid_code_review` site,
 *     extending the same deterministic enforcement the three prior sites
 *     already have. Covered by the new pure-function marker tests below and
 *     by the (untouched) real-wrapper test, which now transitively covers
 *     all four sites.
 *
 * Run: node --test scripts/validate/checks/gating-structure.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkGatingStructure, runGatingStructureCheck } from './gating-structure.mjs';

const SKILL_PATH = 'plugins/relay/skills/context-builder/SKILL.md';
const INDEX_PATH = 'scripts/validate/index.mjs';

// ---------------------------------------------------------------------------
// SITE_PROSE — one marker-satisfying prose block per currently-registered
// `SITES` entry in gating-structure.mjs, keyed by site name. Every fixture
// below is DERIVED from this single map (never hand-duplicated per test),
// so the next `SITES` growth (a 5th site, following the established
// "Extensible by design" precedent) needs only one new map entry instead of
// an edit to every "all markers present" / "all OTHER sites satisfied"
// fixture in this file — the exact fix the 2026-09-23 arbitration preferred
// over re-hardcoding a 4th literal block (see the Lifecycle update above).
// Each block's wording is deliberately NOT copied verbatim from the real
// SKILL.md prose — these fixtures exercise the check logic itself,
// independent of the real file's exact wording (that real-content assertion
// lives in the real-wrapper test below and in figma-track-phase1.test.mjs).
// ---------------------------------------------------------------------------
const SITE_PROSE = {
  figma_track: `
- Always emit \`figma_track: false\` on every *init run — deterministic
  default, never heuristically inferred.

**\`figma_track\` preservation**: if the key is already present in the
frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`figma_track: false\` — the ONLY
case where *update adds this key.
`,
  visual_first_approval: `
- Always emit \`visual_first_approval: auto\` on every *init run —
  deterministic default, never heuristically inferred.

**\`visual_first_approval\` preservation**: if the key is already present
in the frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`visual_first_approval: auto\` —
the ONLY case where *update adds this key.
`,
  lane_runtime_safe: `
- Always emit \`lane_runtime_safe: false\` on every *init run —
  deterministic default, never heuristically inferred.

**\`lane_runtime_safe\` preservation**: if the key is already present in
the frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`lane_runtime_safe: false\` —
the ONLY case where *update adds this key.
`,
  hybrid_code_review: `
- Always emit \`hybrid_code_review: false\` on every *init run —
  deterministic default, never heuristically inferred.

**\`hybrid_code_review\` preservation**: if the key is already present in
the frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`hybrid_code_review: false\` —
the ONLY case where *update adds this key.
`,
};

/** Number of currently-registered SITES entries this test file targets. */
const SITE_COUNT = Object.keys(SITE_PROSE).length;

/**
 * Builds a prose fixture carrying every registered site's markers EXCEPT
 * the ones named in `excludedKeys` — the "every OTHER registered site fully
 * satisfied" shape the independently-reported-findings tests need, without
 * hand-listing every non-excluded site inline.
 * @param {...string} excludedKeys
 * @returns {string}
 */
function proseExcept(...excludedKeys) {
  return Object.entries(SITE_PROSE)
    .filter(([key]) => !excludedKeys.includes(key))
    .map(([, prose]) => prose)
    .join('\n');
}

// Minimal synthetic prose carrying all markers EVERY currently-registered
// SITES entry requires — derived from SITE_PROSE above (see the block
// comment there for why this is no longer a hand-maintained literal).
const ALL_MARKERS_PRESENT = `\n## Methodology\n` + Object.values(SITE_PROSE).join('\n');

function withoutLine(content, needle) {
  return content
    .split('\n')
    .filter((line) => !line.includes(needle))
    .join('\n');
}

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) — checkGatingStructure verifies all three non-heuristic
// markers for the registered `figma_track` site.
// ---------------------------------------------------------------------------

test(`checkGatingStructure: ok:true with zero findings when every registered site's markers (${SITE_COUNT} sites: ${Object.keys(SITE_PROSE).join(', ')}) are all present`, () => {
  const result = checkGatingStructure({ skillContent: ALL_MARKERS_PRESENT });

  assert.equal(result.name, 'gating-structure');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkGatingStructure: fails naming "default-false-emission" when the "Always emit `figma_track: false`" marker is missing', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'Always emit `figma_track: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "figma_track"/);
  assert.match(result.findings[0].message, /"default-false-emission"/);
  assert.equal(result.findings[0].file, SKILL_PATH);
});

test('checkGatingStructure: fails naming "preserve-on-update" when the "`figma_track` preservation" marker is missing', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, '`figma_track` preservation');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /"preserve-on-update"/);
});

test('checkGatingStructure: fails naming "backfill-only-when-absent" when the "backfill `figma_track: false`" marker is missing', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'backfill `figma_track: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /"backfill-only-when-absent"/);
});

test('checkGatingStructure: reports all three figma_track findings independently when all three figma_track markers are missing (every OTHER registered site fully satisfied)', () => {
  // Every other registered site must be fully satisfied, or its own findings
  // inflate the count and the test stops measuring figma_track's independence.
  // Built from proseExcept('figma_track') so this fixture never needs a manual
  // edit when SITES grows again — see the SITE_PROSE block comment above.
  const content = `
## Methodology

Nothing about figma_track here.

` + proseExcept('figma_track');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
  const messages = result.findings.map((f) => f.message);
  assert.ok(messages.every((m) => /site "figma_track"/.test(m)));
  assert.ok(messages.some((m) => /"default-false-emission"/.test(m)));
  assert.ok(messages.some((m) => /"preserve-on-update"/.test(m)));
  assert.ok(messages.some((m) => /"backfill-only-when-absent"/.test(m)));
});

// ---------------------------------------------------------------------------
// AC-A7 (PRD AC-4, source: PRPs/prds/figma-visual-first-track.prd.md) — the
// gating-structure check's 2nd registered site, visual_first_approval:
// checkGatingStructure verifies all three non-heuristic markers
// (default-auto-emission, preserve-on-update, backfill-only-when-absent)
// independently, extending the same deterministic enforcement figma_track
// already has. Mirrors the figma_track marker tests above exactly; new
// this session.
// ---------------------------------------------------------------------------

test('checkGatingStructure: fails naming site "visual_first_approval" and marker "default-auto-emission" when the "Always emit `visual_first_approval: auto`" marker is missing (figma_track otherwise fully satisfied)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'Always emit `visual_first_approval: auto`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "visual_first_approval"/);
  assert.match(result.findings[0].message, /"default-auto-emission"/);
  assert.equal(result.findings[0].file, SKILL_PATH);
});

test('checkGatingStructure: fails naming site "visual_first_approval" and marker "preserve-on-update" when the "`visual_first_approval` preservation" marker is missing (figma_track otherwise fully satisfied; site name asserted explicitly since the marker id "preserve-on-update" is shared with figma_track\'s own marker)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, '`visual_first_approval` preservation');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "visual_first_approval"/);
  assert.match(result.findings[0].message, /"preserve-on-update"/);
});

test('checkGatingStructure: fails naming site "visual_first_approval" and marker "backfill-only-when-absent" when the "backfill `visual_first_approval: auto`" marker is missing (figma_track otherwise fully satisfied)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'backfill `visual_first_approval: auto`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "visual_first_approval"/);
  assert.match(result.findings[0].message, /"backfill-only-when-absent"/);
});

test('checkGatingStructure: reports all three visual_first_approval findings independently when all three visual_first_approval markers are missing (every OTHER registered site fully satisfied)', () => {
  const content = `
## Methodology

Nothing about visual_first_approval here.

` + proseExcept('visual_first_approval');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
  const messages = result.findings.map((f) => f.message);
  assert.ok(messages.every((m) => /site "visual_first_approval"/.test(m)));
  assert.ok(messages.some((m) => /"default-auto-emission"/.test(m)));
  assert.ok(messages.some((m) => /"preserve-on-update"/.test(m)));
  assert.ok(messages.some((m) => /"backfill-only-when-absent"/.test(m)));
});

// ---------------------------------------------------------------------------
// Robustness — missing/empty skillContent is a loud-failure finding, never a
// throw and never a silent pass (mirrors frontmatter-schema.test.mjs's and
// version-parity.test.mjs's established robustness-test convention).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-7, source: PRPs/prds/parallel-phase-execution.prd.md) — the
// gating-structure check's 3rd registered site, lane_runtime_safe: the
// declared runtime-safety gate for concurrent lanes. The gate exists BECAUSE
// the capability that would make concurrent test stages genuinely safe is
// registered and BLOCKED, so the three non-heuristic markers are what keep a
// future edit from quietly inferring it from a port scan or a compose file.
// Mirrors the two sites above exactly; new this session.
// ---------------------------------------------------------------------------

test('checkGatingStructure: fails naming site "lane_runtime_safe" and marker "default-false-emission" when the "Always emit `lane_runtime_safe: false`" marker is missing (other sites otherwise fully satisfied)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'Always emit `lane_runtime_safe: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "lane_runtime_safe"/);
  assert.match(result.findings[0].message, /"default-false-emission"/);
  assert.equal(result.findings[0].file, SKILL_PATH);
});

test('checkGatingStructure: fails naming site "lane_runtime_safe" and marker "preserve-on-update" when the "`lane_runtime_safe` preservation" marker is missing (other sites otherwise fully satisfied; site name asserted explicitly since the marker id is shared across all four sites)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, '`lane_runtime_safe` preservation');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "lane_runtime_safe"/);
  assert.match(result.findings[0].message, /"preserve-on-update"/);
});

test('checkGatingStructure: fails naming site "lane_runtime_safe" and marker "backfill-only-when-absent" when the "backfill `lane_runtime_safe: false`" marker is missing (other sites otherwise fully satisfied)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'backfill `lane_runtime_safe: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "lane_runtime_safe"/);
  assert.match(result.findings[0].message, /"backfill-only-when-absent"/);
});

test('checkGatingStructure: reports all three lane_runtime_safe findings independently when all three of its markers are missing (every OTHER registered site fully satisfied)', () => {
  const content = `
## Methodology

Nothing about the lane runtime gate here.

` + proseExcept('lane_runtime_safe');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
  const messages = result.findings.map((f) => f.message);
  assert.ok(messages.every((m) => /site "lane_runtime_safe"/.test(m)));
  assert.ok(messages.some((m) => /"default-false-emission"/.test(m)));
  assert.ok(messages.some((m) => /"preserve-on-update"/.test(m)));
  assert.ok(messages.some((m) => /"backfill-only-when-absent"/.test(m)));
});

// ---------------------------------------------------------------------------
// hybrid-code-review AC-A2 (PRD AC-2, source: PRPs/prds/hybrid-code-review.prd.md)
// — the gating-structure check's 4th registered site, hybrid_code_review:
// the declared, never-inferred opt-in switch for the hybrid /code-review
// evidence pass. Mirrors the three sites above exactly; new this session
// (Task 3 of PRPs/plans/hybrid-code-review-phase-1-contract-and-opt-in.plan.md).
// ---------------------------------------------------------------------------

test('checkGatingStructure: fails naming site "hybrid_code_review" and marker "default-false-emission" when the "Always emit `hybrid_code_review: false`" marker is missing (other sites otherwise fully satisfied)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'Always emit `hybrid_code_review: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "hybrid_code_review"/);
  assert.match(result.findings[0].message, /"default-false-emission"/);
  assert.equal(result.findings[0].file, SKILL_PATH);
});

test('checkGatingStructure: fails naming site "hybrid_code_review" and marker "preserve-on-update" when the "`hybrid_code_review` preservation" marker is missing (other sites otherwise fully satisfied; site name asserted explicitly since the marker id is shared across all four sites)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, '`hybrid_code_review` preservation');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "hybrid_code_review"/);
  assert.match(result.findings[0].message, /"preserve-on-update"/);
});

test('checkGatingStructure: fails naming site "hybrid_code_review" and marker "backfill-only-when-absent" when the "backfill `hybrid_code_review: false`" marker is missing (other sites otherwise fully satisfied)', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'backfill `hybrid_code_review: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "hybrid_code_review"/);
  assert.match(result.findings[0].message, /"backfill-only-when-absent"/);
});

test('checkGatingStructure: reports all three hybrid_code_review findings independently when all three of its markers are missing (every OTHER registered site fully satisfied)', () => {
  const content = `
## Methodology

Nothing about the hybrid code review gate here.

` + proseExcept('hybrid_code_review');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
  const messages = result.findings.map((f) => f.message);
  assert.ok(messages.every((m) => /site "hybrid_code_review"/.test(m)));
  assert.ok(messages.some((m) => /"default-false-emission"/.test(m)));
  assert.ok(messages.some((m) => /"preserve-on-update"/.test(m)));
  assert.ok(messages.some((m) => /"backfill-only-when-absent"/.test(m)));
});

test('checkGatingStructure: reports a loud failing finding (not a throw) when skillContent is missing', () => {
  for (const skillContent of [null, undefined, '']) {
    const result = checkGatingStructure({ skillContent });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].message, `could not read ${SKILL_PATH}`);
    assert.equal(result.findings[0].file, SKILL_PATH);
  }
});

// ---------------------------------------------------------------------------
// v1 AC-A1 (PRD AC-1) + v1 AC-A2 (PRD AC-4) + v2 AC-A7 (PRD AC-4, source:
// PRPs/prds/figma-visual-first-track.prd.md) + hybrid-code-review AC-A2
// (PRD AC-2) real-state confirmation — the real, already-implemented
// SKILL.md documents ALL FOUR registered sites (figma_track,
// visual_first_approval, lane_runtime_safe, hybrid_code_review) completely,
// so this check passes with zero findings against the real file (not just
// on synthetic fixtures). Untouched by any prior SITES-growth fixture fix
// above — this test re-reads the real file fresh on every run, so it
// transparently already covers a newly-registered site the moment that
// site's SKILL.md prose lands; no update was needed here for
// hybrid_code_review either (Task 1 of the same plan already landed the
// real prose before this test file's own update).
// ---------------------------------------------------------------------------

test('runGatingStructureCheck: ok:true with zero findings against the real, already-implemented SKILL.md', () => {
  const result = runGatingStructureCheck();

  assert.equal(result.name, 'gating-structure');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-4) registration — Task 3's own VALIDATE command asserts
// `runGatingStructureCheck` is registered in scripts/validate/index.mjs's
// CHECKS array (the wiring that makes `npm run validate` actually invoke the
// check tested above). Asserted here as a content invariant against the
// real index.mjs source.
// ---------------------------------------------------------------------------

test('scripts/validate/index.mjs imports runGatingStructureCheck and registers it in the CHECKS array', () => {
  const content = readFileSync(resolve(INDEX_PATH), 'utf-8');

  assert.match(content, /import\s*\{\s*runGatingStructureCheck\s*\}\s*from\s*'\.\/checks\/gating-structure\.mjs'/);

  const checksBlock = content.slice(content.indexOf('const CHECKS'), content.indexOf('];', content.indexOf('const CHECKS')) + 2);
  assert.match(checksBlock, /runGatingStructureCheck/);
});
