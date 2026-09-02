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
 * Source PRDs / plans (this file now covers TWO registered SITES entries,
 * added by two different features):
 *   - figma_track site: PRPs/prds/figma-implementation-track.prd.md
 *     (v1), PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md
 *   - visual_first_approval site: PRPs/prds/figma-visual-first-track.prd.md
 *     (v2), PRPs/plans/completed/figma-visual-first-track-phase-1-foundations.plan.md
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
 * Traceability (plan Acceptance Criteria, phase 1 in-scope subset, both
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

// Minimal synthetic prose carrying all three markers EVERY currently-
// registered SITES entry requires (figma_track + visual_first_approval).
// Deliberately NOT copied verbatim from the real SKILL.md prose — these
// fixtures exercise the check logic itself, independent of the real file's
// exact wording (that real-content assertion lives in the real-wrapper test
// below and in figma-track-phase1.test.mjs). Extended 2026-07-24 (see the
// header comment's Lifecycle update) to also carry visual_first_approval's
// three markers — a fixture named "ALL_MARKERS_PRESENT" must mean all
// markers for every registered site, not just the site that existed when
// the fixture was first written; keeping it single-source avoids the two
// site's "present" fixtures silently drifting apart.
const ALL_MARKERS_PRESENT = `
## Methodology

- Always emit \`figma_track: false\` on every *init run — deterministic
  default, never heuristically inferred.

**\`figma_track\` preservation**: if the key is already present in the
frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`figma_track: false\` — the ONLY
case where *update adds this key.

- Always emit \`visual_first_approval: auto\` on every *init run —
  deterministic default, never heuristically inferred.

**\`visual_first_approval\` preservation**: if the key is already present
in the frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`visual_first_approval: auto\` —
the ONLY case where *update adds this key.

- Always emit \`lane_runtime_safe: false\` on every *init run —
  deterministic default, never heuristically inferred.

**\`lane_runtime_safe\` preservation**: if the key is already present in
the frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`lane_runtime_safe: false\` —
the ONLY case where *update adds this key.
`;

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

test('checkGatingStructure: ok:true with zero findings when every registered site\'s markers (figma_track, visual_first_approval) are all present', () => {
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
  // This fixture is extended each time SITES grows — 2026-07-24 for
  // visual_first_approval, 2026-09-02 for lane_runtime_safe.
  const content = `
## Methodology

Nothing about figma_track here.

- Always emit \`visual_first_approval: auto\` on every *init run.

\`visual_first_approval\` preservation: preserve on update.

If absent, backfill \`visual_first_approval: auto\`.

- Always emit \`lane_runtime_safe: false\` on every *init run.

\`lane_runtime_safe\` preservation: preserve on update.

If absent, backfill \`lane_runtime_safe: false\`.
`;
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
// this session (the site did not exist before this phase).
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

test('checkGatingStructure: reports all three visual_first_approval findings independently when all three visual_first_approval markers are missing (figma_track otherwise fully satisfied)', () => {
  const content = `
## Methodology

- Always emit \`figma_track: false\` on every *init run — deterministic
  default, never heuristically inferred.

**\`figma_track\` preservation**: if the key is already present in the
frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`figma_track: false\` — the ONLY
case where *update adds this key.

Nothing about visual_first_approval here.

- Always emit \`lane_runtime_safe: false\` on every *init run.

\`lane_runtime_safe\` preservation: preserve on update.

If absent, backfill \`lane_runtime_safe: false\`.
`;
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

test('checkGatingStructure: fails naming site "lane_runtime_safe" and marker "preserve-on-update" when the "`lane_runtime_safe` preservation" marker is missing (other sites otherwise fully satisfied; site name asserted explicitly since the marker id is shared across all three sites)', () => {
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

- Always emit \`figma_track: false\` on every *init run.

\`figma_track\` preservation: preserve on update.

If absent, backfill \`figma_track: false\`.

- Always emit \`visual_first_approval: auto\` on every *init run.

\`visual_first_approval\` preservation: preserve on update.

If absent, backfill \`visual_first_approval: auto\`.

Nothing about the lane runtime gate here.
`;
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
  const messages = result.findings.map((f) => f.message);
  assert.ok(messages.every((m) => /site "lane_runtime_safe"/.test(m)));
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
// PRPs/prds/figma-visual-first-track.prd.md) real-state confirmation — the
// real, already-implemented SKILL.md documents BOTH registered sites
// (figma_track, visual_first_approval) completely, so this check passes
// with zero findings against the real file (not just on synthetic
// fixtures). Untouched by the 2026-07-24 SITES-growth fixture fix above —
// this test re-reads the real file fresh on every run, so it transparently
// already covered visual_first_approval the moment that site's SKILL.md
// prose landed; no update was needed here.
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
