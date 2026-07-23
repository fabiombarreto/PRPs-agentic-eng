// @ts-check
/**
 * Content-invariant tests for Phase 1 ("Foundations") of the
 * figma-implementation-track feature — the `figma_track` opt-in key's
 * emission/preservation/backfill contract in
 * plugins/relay/skills/context-builder/SKILL.md, the four
 * `docs/design-system.md` conditional-registration sites SKILL.md gains,
 * and the `documentation/changelog.html` Unreleased entry recording the
 * phase.
 *
 * Companion to scripts/validate/checks/gating-structure.test.mjs, NOT a
 * duplicate of it: gating-structure.test.mjs owns the pure
 * `checkGatingStructure`/`runGatingStructureCheck` unit tests (AC-A2) and
 * the real-wrapper zero-findings confirmation (AC-A1). THIS file owns the
 * AC-A1 "Given absent" precondition fact, the AC-A3 concrete-state delta
 * over the already-existing generic version-parity test, and the AC-A4
 * `docs/design-system.md` registration-site content invariants — none of
 * which gating-structure.mjs's own module touches (it only reads SKILL.md's
 * `figma_track` prose block, never the design-system.md registration sites
 * or documentation/changelog.html).
 *
 * Same idiom as scripts/validate/checks/docs-sync-phase2.test.mjs: SKILL.md
 * is a prompt/skill markdown file with no companion production module for
 * its prose sections, so these are readFileSync-based content assertions
 * against the real, already-implemented file — not fixture-driven unit
 * tests. The AC-A3 version-parity test is the one exception: it imports and
 * calls the real, already-tested `runVersionParityCheck()` wrapper (no
 * modification to that module) against the real repository files.
 *
 * Existing-coverage scan performed before authoring: no prior test file
 * reads plugins/relay/skills/context-builder/SKILL.md's figma_track or
 * design-system.md content, or documentation/changelog.html's Unreleased
 * section content (confirmed by scanning every scripts/validate/checks/*.test.mjs
 * file's target-path constants). The ONE existing test whose covered
 * property overlaps this phase's AC-A3 is
 * scripts/validate/checks/version-parity.test.mjs:85 ("skips the
 * id=\"unreleased\" heading even when its text looks like a version") —
 * EXISTING_TEST_COVERS the general "Unreleased-skip" mechanism generically
 * (any Unreleased content, real or synthetic, never affects version
 * parity). This file's AC-A3 test is the missing-property delta: it proves
 * the mechanism holds against the REAL, concrete plugin.json +
 * changelog.html state shipped by this phase, not a synthetic fixture.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 1 plan:
 * PRPs/plans/completed/figma-implementation-track-phase-1-foundations.plan.md
 *
 * Traceability (PRPs/prds/figma-implementation-track.prd.md Acceptance
 * Criteria — in-scope for phase 1 per the plan's own Acceptance Criteria
 * section: AC-1 and AC-4 only. AC-2, AC-3, AC-5 are OUT_OF_PHASE_SCOPE,
 * deferred to later phases of the Implementation Phases table):
 *
 *   AC-1 / AC-A1 (Inert when off) — this repository's own
 *     docs/context/methodology.md still has no figma_track key (the
 *     absent-state precondition); combined with
 *     gating-structure.test.mjs's real-wrapper zero-findings test, this
 *     demonstrates the groundwork introduces no behavioral difference.
 *   AC-1 / AC-A3 (changelog entry does not require a plugin.json bump) —
 *     the Unreleased → Added entry exists and sits before any versioned
 *     release heading; runVersionParityCheck() still passes against the
 *     real files.
 *   AC-4 / AC-A4 (docs/design-system.md registered but not generated) —
 *     all four registration sites (decision-gate DYNAMIC block,
 *     KNOWLEDGE_BASE.md required entries, CLAUDE.md Context & Domain
 *     pointer, Content Placement table) gate the doc strictly on
 *     `figma_track: true` and document the "at most one line, never the
 *     full doc" degradation when off/absent.
 *
 * Run: node --test scripts/validate/checks/figma-track-phase1.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { runVersionParityCheck } from './version-parity.mjs';

const SKILL_PATH = 'plugins/relay/skills/context-builder/SKILL.md';
const CHANGELOG_PATH = 'documentation/changelog.html';
const METHODOLOGY_PATH = 'docs/context/methodology.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors
 * scripts/validate/checks/docs-sync-phase2.test.mjs's helper of the same
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

// ---------------------------------------------------------------------------
// AC-1 / AC-A1 — "Given a project where figma_track is absent" precondition
// fact: this repository's own docs/context/methodology.md has not (yet)
// had figma_track flipped on (that happens in Phase 3, per the PRD's
// Implementation Phases table). This is the "Given" half of AC-A1; the
// "Then" half (npm run validate's new check passes with zero Figma-related
// findings regardless) is covered by
// gating-structure.test.mjs's real-wrapper test.
// ---------------------------------------------------------------------------

test('AC-1/AC-A1: this repository\'s own docs/context/methodology.md has no figma_track key yet (absent-state precondition; groundwork-only phase)', () => {
  const content = readRepoFile(METHODOLOGY_PATH);
  assert.ok(!/figma_track/.test(content), 'expected no figma_track mention in this repo\'s own methodology.md at Phase 1 (flips on in Phase 3)');
});

// ---------------------------------------------------------------------------
// AC-1 / AC-A3 — documentation/changelog.html's Unreleased → Added section
// gains this phase's entry, positioned before any versioned release
// heading, and version-parity still passes against the real files.
// ---------------------------------------------------------------------------

test('AC-1/AC-A3: changelog.html\'s Unreleased → Added section records this phase\'s figma_track/design-system.md/gating-structure entry, before any versioned release heading', () => {
  const content = readRepoFile(CHANGELOG_PATH);

  const unreleasedIdx = content.indexOf('<h2 id="unreleased">Unreleased</h2>');
  assert.notEqual(unreleasedIdx, -1, 'expected an id="unreleased" heading');

  assert.match(
    content,
    /<code>figma_track<\/code> opt-in key added to <code>methodology\.md<\/code> \(default off\)/
  );
  assert.match(
    content,
    /<code>docs\/design-system\.md<\/code> registered as a future conditionally-generated doc/
  );
  assert.match(
    content,
    /new <code>gating-structure<\/code> deterministic check in <code>npm run validate<\/code>/
  );
  assert.match(
    content,
    /Phase 1 of <code>PRPs\/prds\/figma-implementation-track\.prd\.md<\/code>/
  );

  const entryIdx = content.indexOf('<code>figma_track</code> opt-in key added to');
  assert.ok(entryIdx > unreleasedIdx, 'the figma_track entry must be positioned after the Unreleased heading');

  const nextReleaseMatch = content.slice(unreleasedIdx).match(/<h2 id="v[0-9][^"]*"/);
  if (nextReleaseMatch) {
    const nextReleaseIdx = unreleasedIdx + /** @type {number} */ (nextReleaseMatch.index);
    assert.ok(entryIdx < nextReleaseIdx, 'the figma_track entry must be positioned before the first versioned release heading (still Unreleased, not yet cut)');
  }
});

test('AC-1/AC-A3: runVersionParityCheck() still returns ok:true with zero findings against the REAL plugin.json + changelog.html after this phase\'s Unreleased entry addition (no plugin.json bump required; delta over the existing generic version-parity.test.mjs:85 Unreleased-skip test)', () => {
  const result = runVersionParityCheck();

  assert.equal(result.name, 'version-parity');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-4 / AC-A4 — docs/design-system.md is registered across all four sites
// research identified, strictly gated on `figma_track: true`, with an
// explicit "at most one line, never the full doc" degradation when off.
// ---------------------------------------------------------------------------

test('AC-4/AC-A4: SKILL.md\'s decision-gate [DYNAMIC] mandatory-sources block registers docs/design-system.md conditionally on figma_track: true, with a "not generated" degradation note when off', () => {
  const content = readRepoFile(SKILL_PATH);
  const block = sliceBetween(
    content,
    '<!-- [DYNAMIC] When `figma_track: true` in docs/context/methodology.md, add:',
    '-->'
  );
  assert.ok(block, 'expected an extractable [DYNAMIC] figma_track block in the decision-gate mandatory-sources table');

  assert.match(block, /\| `docs\/design-system\.md` \| Figma design-system source of truth \(component tokens, library file keys, dev server config\) — generated in Phase 3 of the Figma implementation track \|/);
  assert.match(block, /Detection alone \(figma_track: false\) does NOT add this row or generate the/);
  assert.match(block, /observed signal, not generated/);
});

test('AC-4/AC-A4: SKILL.md\'s KNOWLEDGE_BASE.md required-entries section (Phase 6) registers the same conditional docs/design-system.md entry, omitted entirely when figma_track is false/absent', () => {
  const content = readRepoFile(SKILL_PATH);
  const block = sliceBetween(
    content,
    '- `docs/design-system.md` — conditionally-generated entry, added ONLY',
    '- Root `README.md` pointer'
  );
  assert.ok(block, 'expected an extractable docs/design-system.md required-entries bullet');

  assert.match(block, /when `figma_track: true` in `docs\/context\/methodology\.md`\. When/);
  assert.match(block, /`figma_track` is `false` or absent, do NOT add a KB entry for it —/);
  assert.match(block, /the file does not exist yet \(generated in Phase 3 of the Figma/);
  assert.match(block, /emit at most a one-line "observed signal, not/);
});

test('AC-4/AC-A4: SKILL.md\'s CLAUDE.md Phase 7 section registers a conditional docs/design-system.md Context & Domain pointer bullet, omitted entirely when figma_track is false/absent', () => {
  const content = readRepoFile(SKILL_PATH);
  const block = sliceBetween(
    content,
    '- **Conditional `docs/design-system.md` pointer:**',
    '- **Required `Test Guardrail` section**'
  );
  assert.ok(block, 'expected an extractable Conditional docs/design-system.md pointer bullet');

  assert.match(block, /ONLY when\s+`figma_track: true` in `docs\/context\/methodology\.md`, add one more/);
  assert.match(block, /docs\/design-system\.md — Figma design-system source of truth \(see/);
  assert.match(block, /Omit this bullet entirely/);
  assert.match(block, /the file does not exist yet/);
});

test('AC-4/AC-A4: SKILL.md\'s Content Placement table carries a Design-system row explicitly scoped to figma_track: true only', () => {
  const content = readRepoFile(SKILL_PATH);

  assert.match(
    content,
    /\| Design system \(Figma, `figma_track: true` only\) \| ❌ \| 1-line summary \(conditional\) \| ❌ \| Full in design-system\.md \(Phase 3, conditional\) \| ❌ \|/
  );
});
