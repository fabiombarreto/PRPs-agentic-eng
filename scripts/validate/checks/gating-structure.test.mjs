// @ts-check
/**
 * Unit tests for the new check — gating-structure — the pure
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
 * Source PRD: PRPs/prds/figma-implementation-track.prd.md
 * Source plan: PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md
 * Existing-coverage scan: no prior test file exercises gating-structure.mjs
 * (it is a brand-new production module introduced by this phase — confirmed
 * via directory scan of scripts/validate/checks/*.test.mjs before authoring).
 *
 * Traceability (plan Acceptance Criteria, phase 1 in-scope subset):
 *   AC-A2 (PRD AC-4 "Non-heuristic declaration always present") — the
 *     gating-structure check verifies all three non-heuristic properties
 *     (default-false emission, preserve-on-update, backfill-only-when-
 *     absent) are documented for the `figma_track` site. Covered by the
 *     pure-function marker tests below.
 *   AC-A1 (PRD AC-1 "Inert when off") — the one check this phase adds to
 *     `npm run validate` passes with zero Figma-related findings against
 *     the real, already-implemented SKILL.md. Covered by the real-wrapper
 *     test below (the complementary "Given absent figma_track" precondition
 *     fact — this repo's own docs/context/methodology.md has no
 *     figma_track key — is asserted separately in
 *     scripts/validate/checks/figma-track-phase1.test.mjs, which also
 *     carries the AC-A3/AC-A4 delta tests).
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

// Minimal synthetic prose carrying all three markers the real `figma_track`
// site config in gating-structure.mjs requires. Deliberately NOT copied
// verbatim from the real SKILL.md prose — these fixtures exercise the check
// logic itself, independent of the real file's exact wording (that
// real-content assertion lives in the real-wrapper test below and in
// figma-track-phase1.test.mjs).
const ALL_MARKERS_PRESENT = `
## Methodology

- Always emit \`figma_track: false\` on every *init run — deterministic
  default, never heuristically inferred.

**\`figma_track\` preservation**: if the key is already present in the
frontmatter, preserve its value untouched on *update.

If the key is entirely absent, backfill \`figma_track: false\` — the ONLY
case where *update adds this key.
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

test('checkGatingStructure: ok:true with zero findings when all three figma_track markers are present', () => {
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

test('checkGatingStructure: reports all three findings independently when all three markers are missing', () => {
  const result = checkGatingStructure({ skillContent: '## Methodology\n\nNothing about figma_track here.\n' });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3);
  const ids = result.findings.map((f) => f.message);
  assert.ok(ids.some((m) => /"default-false-emission"/.test(m)));
  assert.ok(ids.some((m) => /"preserve-on-update"/.test(m)));
  assert.ok(ids.some((m) => /"backfill-only-when-absent"/.test(m)));
});

// ---------------------------------------------------------------------------
// Robustness — missing/empty skillContent is a loud-failure finding, never a
// throw and never a silent pass (mirrors frontmatter-schema.test.mjs's and
// version-parity.test.mjs's established robustness-test convention).
// ---------------------------------------------------------------------------

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
// AC-A1 (PRD AC-1) + AC-A2 (PRD AC-4) real-state confirmation — the real,
// already-implemented SKILL.md documents the figma_track site completely, so
// the one check this phase adds to `npm run validate` passes with zero
// Figma-related findings (not just on synthetic fixtures).
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
