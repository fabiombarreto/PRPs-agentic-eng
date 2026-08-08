// @ts-check
/**
 * Content-invariant tests for the four documentation-surface corrections
 * introduced by Phase 4 of PRPs/prds/plan-review-materiality.prd.md
 * (PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md):
 * the stale pre-materiality plan-review gating prose ("any rubric failure ->
 * CHANGES_REQUESTED", an unqualified "8-item structural rubric") is
 * corrected to the blocking/advisory materiality contract in
 * docs/api-reference.md, documentation/reference/commands.html, and
 * documentation/concepts/pipeline.html, plus the mandatory
 * documentation/changelog.html Unreleased entry (documentation/AGENTS.md
 * §9).
 *
 * This file covers plan AC-A4 (PRD AC-8's documentation half). Plan AC-A1
 * (scripts/efficiency.mjs), AC-A2 (generate-final-report.mjs), and AC-A3
 * (efficiency-report.md) are covered separately -- see those three files'
 * own header comments for the split rationale.
 *
 * Source plan (PRD mode -- dual `AC-A<i> (PRD AC-<N>)` labelling, per this
 * plan's own `## Acceptance Criteria` section):
 * PRPs/plans/completed/plan-review-materiality-phase-4-measurement-surfaces.plan.md
 * Source PRD: PRPs/prds/plan-review-materiality.prd.md
 *
 * Existing-coverage scan performed before authoring (Step 2.1 -- an
 * Explore-agent sweep of all 53 scripts/validate/checks/*.test.mjs files):
 * three files (docs-sync-phase4.test.mjs, figma-track-phase7.test.mjs,
 * figma-visual-first-track-phase7.test.mjs) read+assert on real
 * docs/api-reference.md / documentation/reference/commands.html content,
 * establishing this corpus' structural precedent for the technique
 * (readFileSync + exact-prose assertion), but none concern
 * `/relay-plan-review`'s gating behavior. documentation/concepts/pipeline.html
 * is read by ZERO existing test anywhere in the corpus. Zero hits anywhere
 * for the new blocking/advisory contract language or this phase's specific
 * changelog entry text. NEW_TEST_REQUIRED throughout.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * IMPLEMENTED plan (see
 * PRPs/reports/plan-review-materiality/phase-4/attempts/1/diff.patch).
 *
 * Traceability (plan's own `## Acceptance Criteria`):
 *   AC-A4 (PRD AC-8) -- "Given the documentation surfaces, when the
 *     plan-review gating is described, then docs/api-reference.md,
 *     documentation/reference/commands.html, and
 *     documentation/concepts/pipeline.html state the blocking/advisory
 *     contract (evaluation still exhaustive; only blocking failures gate),
 *     and documentation/changelog.html carries the corresponding
 *     Unreleased entry."
 *
 * Run: node --test scripts/validate/checks/plan-review-materiality-docs-sync.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const API_REFERENCE_PATH = 'docs/api-reference.md';
const COMMANDS_HTML_PATH = 'documentation/reference/commands.html';
const PIPELINE_HTML_PATH = 'documentation/concepts/pipeline.html';
const CHANGELOG_HTML_PATH = 'documentation/changelog.html';

const read = (path) => readFileSync(path, 'utf-8');

// ---------------------------------------------------------------------------
// AC-A4 -- docs/api-reference.md's /relay-plan-review row.
// ---------------------------------------------------------------------------

test('AC-A4: docs/api-reference.md\'s /relay-plan-review row states the blocking/advisory gating contract and no longer carries the stale unqualified "without short-circuit" clause', () => {
  const content = read(API_REFERENCE_PATH);
  assert.doesNotMatch(content, /without short-circuit\. Every verdict appended/, "expected the stale unqualified gating clause to be gone (the plan's own VALIDATE guard for this task)");

  const rowStart = content.indexOf('`/relay-plan-review <plan-path>`');
  assert.notEqual(rowStart, -1, 'expected the /relay-plan-review row to still exist');
  const row = content.slice(rowStart, content.indexOf('\n', rowStart));

  assert.match(row, /only a BLOCKING-classed failure triggers `CHANGES_REQUESTED`/);
  assert.match(row, /advisory-classed failures listed separately as non-blocking notes/);
  assert.match(row, /Open advisories: <n>/);
  assert.match(row, /every check id statically declared `blocking` or `advisory`/);
  assert.match(row, /`docs\/decisions\.md`/);
});

// ---------------------------------------------------------------------------
// AC-A4 -- documentation/reference/commands.html's /relay-plan-review entry.
// ---------------------------------------------------------------------------

test('AC-A4: documentation/reference/commands.html\'s /relay-plan-review Output states the blocking-gates/advisory-passes contract and the stale unqualified "any failure" phrasing is gone', () => {
  const content = read(COMMANDS_HTML_PATH);
  assert.doesNotMatch(
    content,
    /On any failure: <code>CHANGES_REQUESTED<\/code> with the failing rubric items by ID \+ reason\./,
    'expected the stale unqualified failure clause to be gone',
  );

  assert.match(content, /On rubric pass \(zero BLOCKING-classed failures/);
  assert.match(content, /an advisory-only outcome still passes\)/);
  assert.match(content, /plus an <code>Open advisories: &lt;n&gt;<\/code> summary line when any advisory-classed row failed/);
  assert.match(content, /On a BLOCKING-classed failure: <code>CHANGES_REQUESTED<\/code>/);
  assert.match(content, /advisory-classed failures listed separately as non-blocking notes/);
  assert.match(content, /each carrying a <code>class<\/code> \(<code>blocking<\/code> or <code>advisory<\/code>\) field/);
});

test("AC-A4: documentation/reference/commands.html's /relay-plan-review Agents entry names the materiality partition and the blocking-only gating rule, with the pre-existing rubric-item enumeration preserved", () => {
  const content = read(COMMANDS_HTML_PATH);
  assert.match(content, /every check id statically declared <code>blocking<\/code> or <code>advisory<\/code> in a materiality partition, gating the verdict on blocking-classed failures only/);
  assert.match(content, /\(<code>docs\/decisions\.md<\/code> 2026-08-06\)/);
  // Regression net: the pre-existing rubric-item enumeration this sentence
  // is appended to must survive untouched.
  assert.match(
    content,
    /R1 Decision Gate, R2 mandatory sections, R3 no TBD, R4 ≥3 atomic tasks with VALIDATE, R5 TDD routing, R6 no <code>\.claude\/<\/code> writes, R7 Files-to-Change row, R8 PRD↔plan traceability with R8a\/R8b\/R8c/,
  );
});

// ---------------------------------------------------------------------------
// AC-A4 -- documentation/concepts/pipeline.html's stage-2 Reviewer entry.
// ---------------------------------------------------------------------------

test('AC-A4: documentation/concepts/pipeline.html\'s stage-2 Reviewer entry names the blocking/advisory classes instead of a bare "8-item structural rubric" characterisation', () => {
  const content = read(PIPELINE_HTML_PATH);
  assert.match(content, /each check statically declared <code>blocking<\/code> or <code>advisory<\/code>/);
  assert.match(content, /only a blocking-classed failure gates the verdict, while an advisory-only outcome approves with the open advisories recorded and passed to the Implementer/);
  assert.match(content, /\(<code>docs\/decisions\.md<\/code> 2026-08-06\)/);
  // Regression net: the pre-existing R-COH-* coherence-layer sentence this
  // insertion precedes, and the Loop row, survive untouched.
  assert.match(content, /plus an additive <code>R-COH-\*<\/code> coherence layer<\/strong> that catches intra-plan contradictions/);
  assert.match(content, /loops back up to <code>max_plan_review_retries<\/code>\.<\/dd>/);
});

// ---------------------------------------------------------------------------
// AC-A4 -- documentation/changelog.html's mandatory Unreleased entry.
// ---------------------------------------------------------------------------

test('AC-A4: documentation/changelog.html carries a Changed entry (in whichever release or Unreleased block currently holds it) naming the plan-review materiality threshold and the corrected pages', () => {
  const content = read(CHANGELOG_HTML_PATH);

  // Release-cut-resilient anchor (documentation/AGENTS.md 7.3/7.5 renames
  // Unreleased's content to a dated <h2 id="v..."> and opens a fresh, empty
  // Unreleased block above it on every cut): locate the entry by its OWN
  // distinguishing text, not by the `Unreleased` heading or the
  // `unreleased-changed` id -- both move (or vanish) at the next cut, while
  // the entry text itself is permanent; only its enclosing heading ids change.
  const entryTitleStart = content.indexOf('Plan-review gating documentation corrected for the materiality threshold');
  assert.notEqual(entryTitleStart, -1, 'expected the plan-review materiality changelog entry to exist somewhere in the changelog');
  const entryEnd = content.indexOf('</li>', entryTitleStart);
  assert.notEqual(entryEnd, -1, "expected the entry's enclosing <li> to close");
  const entry = content.slice(entryTitleStart, entryEnd);

  // The entry must still be filed under a "Changed" subsection -- match the
  // nearest preceding <h3>'s TEXT rather than a specific id (the id is
  // "unreleased-changed" pre-cut, "v0-31-0-changed" post-cut, and will keep
  // changing at every future cut).
  const precedingH3Start = content.lastIndexOf('<h3 id="', entryTitleStart);
  assert.notEqual(precedingH3Start, -1, 'expected a preceding <h3> subsection heading');
  const precedingH3 = content.slice(precedingH3Start, content.indexOf('</h3>', precedingH3Start));
  assert.match(precedingH3, /-changed">Changed$/, 'expected the entry to be filed under a "Changed" subsection');

  assert.match(entry, /<code>docs\/api-reference\.md<\/code>/);
  assert.match(entry, /<code>documentation\/reference\/commands\.html<\/code>/);
  assert.match(entry, /<code>documentation\/concepts\/pipeline\.html<\/code>/);
  assert.match(entry, /every rubric check carries a <code>blocking<\/code> or\s+<code>advisory<\/code> class/);

  // Regression net: the pre-existing v0.30.0 entry's own text is unperturbed.
  assert.match(content, /Gives <code>\/relay-design-spec<\/code> a defined outcome when Figma refuses a traversal/);
});
