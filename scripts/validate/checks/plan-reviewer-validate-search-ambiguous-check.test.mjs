// @ts-check
/**
 * Content-invariant tests for the
 * `add-an-8th-fixed-deterministic-check-r-coh-validate-search`
 * description-mode plan: adds an 8th FIXED (unconditional, never
 * zero-emission) deterministic check, `R-COH-VALIDATE-SEARCH-AMBIGUOUS`,
 * to `plugins/relay/agents/plan-reviewer.md`'s R-COH-* coherence layer —
 * positioned immediately after `R-COH-ACTION-VALIDATE-CONTRADICTION`'s
 * Known-limitation paragraph and immediately before
 * `R-COH-DESIGN-SOURCE-MISSING` — that detects a `**VALIDATE**` command
 * whose `indexOf`/`lastIndexOf`-derived index feeds an ORDERING comparison
 * against another same-derived index, when the search string is not
 * provably unique (primary trigger: the plan's own ACTION text repeats
 * the string; secondary, weaker trigger: a bare identifier under 20
 * characters with no disambiguating context), with an explicit
 * `RELAY-FIRST-MATCH-INTENDED` + non-empty-justification escape hatch for
 * the legitimate deliberately-duplicated case. Also updates the
 * cross-cutting `### Logging discipline` rubric[]-length arithmetic
 * paragraph for the 7->8 fixed-check shift, adds a matching
 * `## review.jsonl format` example row, and records the decision
 * (including its explicit numeral supersession of the [2026-07-26] entry)
 * in `docs/decisions.md`.
 *
 * Source plan (description mode — no source PRD; `## Source` holds a
 * verbatim description, not a `.prd.md` path, so there is no `(PRD AC-N)`
 * token on any assertion below, per this repo's shipped `/relay-plan`
 * PRD-less mode contract):
 * PRPs/plans/add-an-8th-fixed-deterministic-check-r-coh-validate-search.plan.md
 * (not yet archived to PRPs/plans/completed/ as of this test-writer
 * session; AC-A11 below reads the plan itself and falls back to the
 * completed/ path so it survives that eventual archival move).
 *
 * Existing-coverage scan performed before authoring (Step 2.1 — read every
 * scripts/validate/checks/*.test.mjs file that already touches
 * plugins/relay/agents/plan-reviewer.md or docs/decisions.md, plus this
 * same session's own Half 1 EXISTING_TEST_UPDATED fixes to the three
 * stale test files, applied immediately before this file was authored):
 *   - No existing test anywhere in the corpus references the new check's
 *     own name, heading text, escape-hatch sentinel, fail triggers, scope
 *     boundary, or Known-limitation paragraph — this content did not
 *     exist before this shipment. NEW_TEST_REQUIRED throughout for those
 *     properties.
 *   - AC-A7 (the ### Logging discipline arithmetic paragraph) is a
 *     PARTIAL exception: this same session's own Half 1 fixes updated
 *     plan-reviewer-action-validate-contradiction-check.test.mjs's AC-A5
 *     test (now a short-token smoke check: `8 (deterministic`,
 *     `16 to 21 rows`, `16 to 24 rows`, `25th row`, the preserved "Each
 *     of the four conditional rows..." sentence),
 *     figma-visual-first-track-phase3.test.mjs's AC-A2 test (now the FULL
 *     verbatim widening + preserved-baseline sentences, covering
 *     `16 to 24 rows`, `25th row`, `16–21`, `16–23`), and
 *     figma-track-phase5.test.mjs's AC-4/AC-A1 test (now `16–21` via
 *     regex) — combined, every PRESENCE-side property AC-A7 requires is
 *     already asserted by these three (freshly updated) tests.
 *     EXISTING_TEST_COVERS for the presence side (see the three
 *     path:line citations on the AC-A7 test below). The missing-property
 *     delta this file supplies instead: a regression guard confirming
 *     the OLD stale numerals (`15 to 20 rows`, `15 to 23 rows`,
 *     `24th row`) are now ABSENT from the live file — mirroring
 *     plan-reviewer-action-validate-contradiction-check.test.mjs's own
 *     AC-A6 "forbidden literal never returns" pattern, which no existing
 *     test in this corpus performs for THESE three specific stale
 *     tokens. NEW_TEST_REQUIRED for that delta only.
 *   - AC-A6 (heading count) has a similar partial overlap:
 *     plan-reviewer-action-validate-contradiction-check.test.mjs's own
 *     AC-A4 test, updated in this same session's Half 1 fixes, now
 *     asserts the exact 12-total/8-fixed-ending-with-
 *     R-COH-VALIDATE-SEARCH-AMBIGUOUS/4-conditional shape.
 *     EXISTING_TEST_COVERS for that specific count/array property (see
 *     the AC-A6 test below, path:line
 *     scripts/validate/checks/plan-reviewer-action-validate-contradiction-check.test.mjs:311).
 *     The missing-property delta this file supplies: the exact ADJACENCY
 *     position (indexOf-based, immediately after
 *     R-COH-ACTION-VALIDATE-CONTRADICTION and immediately before
 *     R-COH-DESIGN-SOURCE-MISSING — a stronger, more specific claim than
 *     "somewhere in an ordered array"), the unconditional/
 *     never-zero-emission framing prose, the explicit absence of a
 *     "Zero-emission branch" clause (unlike its four conditional
 *     siblings), and the differentiation from its nearest sibling. All
 *     NEW_TEST_REQUIRED.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, APPROVED plan:
 * PRPs/plans/add-an-8th-fixed-deterministic-check-r-coh-validate-search.plan.md
 *
 * Traceability (plan's own `## Acceptance Criteria` — description mode,
 * AC-A<i> only, AC-A1 through AC-A11, no PRD AC-N token on any item):
 *
 *   AC-A1 — primary trigger (a): plan-local ACTION-text duplication of the
 *     search string within the same task fails the site; `reason` quotes
 *     the task heading, search string, and ordering comparison verbatim.
 *   AC-A2 — secondary trigger (b): a bare identifier under 20 characters
 *     with no disambiguating context fails the site, even without
 *     ACTION-text duplication; grounded in the bioinformatics Maximal
 *     Unique Match prior art.
 *   AC-A3 — the `RELAY-FIRST-MATCH-INTENDED` escape hatch: a non-empty
 *     justification exempts the site from both triggers; a bare sentinel
 *     with no justification does NOT exempt it.
 *   AC-A4 — the in-scope/out-of-scope boundary: an ordering comparison
 *     against another same-derived index is required for a site to be in
 *     scope; a bare `=== -1`/`!== -1` presence test is never flagged.
 *   AC-A5 — the vacuous-pass / unconditional-emission contract: exactly
 *     one `passed: true` row on every run when no in-scope site exists,
 *     never zero-emission.
 *   AC-A6 — heading presence and exact position (immediately after
 *     R-COH-ACTION-VALIDATE-CONTRADICTION, immediately before
 *     R-COH-DESIGN-SOURCE-MISSING), the unconditional/no-zero-emission
 *     framing, and the differentiation from its nearest sibling — split
 *     EXISTING_TEST_COVERS (12-heading count/array shape) +
 *     NEW_TEST_REQUIRED (exact adjacency position + framing prose) per
 *     the existing-coverage scan above.
 *   AC-A7 — the `### Logging discipline` arithmetic shift — split
 *     EXISTING_TEST_COVERS (presence of the new numerals, combined across
 *     three other files) + NEW_TEST_REQUIRED (absence regression guard
 *     for the old numerals) per the existing-coverage scan above.
 *   AC-A8 — the `## review.jsonl format` example block gains a matching
 *     `R-COH-VALIDATE-SEARCH-AMBIGUOUS` row immediately after the
 *     existing `R-COH-ACTION-VALIDATE-CONTRADICTION` row, and all 8 fixed
 *     checks now have an example row.
 *   AC-A9 — docs/decisions.md records a new `[2026-07-28]` entry that
 *     explicitly supersedes the "15 to 20 rows"/"15 to 23 rows" numerals
 *     recorded in the [2026-07-26] entry, and is positioned as the last
 *     real entry before the template comment.
 *   AC-A10 — the check's own "Known limitation (recorded, not blocking)"
 *     paragraph: no Bash/Grep/Glob, plan-local proxy signals only, can
 *     miss a target-file-non-unique-but-ACTION-unique string, can
 *     false-positive on an incidental repetition or a short-but-unique
 *     identifier.
 *   AC-A11 — this plan's own `## Validation Commands` Level 3 gate: a bash
 *     SUBSET-check over the plan document itself (not plan-reviewer.md or
 *     docs/decisions.md — this AC targets the plan's own gate script).
 *     Asserts the exact three-file known-stale allowlist verbatim, the
 *     UNEXPECTED-file branch's `exit 1`, the terminal `exit 0` reached
 *     only via the subset-check branch (never a bare zero-failures
 *     shortcut), the glob form of `node --test` (never the non-recursing
 *     bare-directory form — the two named prohibitions in the plan's own
 *     Notes), and the absence of a `|| true` escape hatch. Read via a
 *     `PRPs/plans/` -> `PRPs/plans/completed/` fallback (the plan's
 *     eventual D8 archival move, outside this suite's control), hard-
 *     failing (not silently passing) if the plan is at neither location —
 *     see `readSourcePlan()` below.
 *
 *   REVISION NOTE (this session, post test-reviewer CHANGES_REQUESTED):
 *     AC-A11 was originally omitted from this file under an invented
 *     "deliberate scope exclusion" outcome not among the six sanctioned
 *     per-AC outcomes (`NEW_TEST_REQUIRED`, `EXISTING_TEST_COVERS`,
 *     `EXISTING_TEST_UPDATED`, `OBSOLETE_TEST_REMOVED`,
 *     `REDUNDANT_TEST_REMOVED`, `AMBIGUOUS`). `test-reviewer` correctly
 *     rejected that: AC-A11's prose is concrete, well-formed Given/When/
 *     Then (so not `AMBIGUOUS` either), and the closest precedent plan
 *     (`plan-reviewer-action-validate-contradiction-check.plan.md`) has no
 *     analogous allowlist/subset-gate Level 3 pattern and no AC past
 *     AC-A8 — there was no established "a plan's own gate script is out
 *     of scope" convention to lean on. The correct outcome was always
 *     `NEW_TEST_REQUIRED`. See this file's own AC-A11 test below and the
 *     corrected
 *     `PRPs/reports/add-an-8th-fixed-deterministic-check-r-coh-validate-search/test-suite.diff`
 *     manifest.
 *
 * Run: node --test scripts/validate/checks/plan-reviewer-validate-search-ambiguous-check.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLAN_REVIEWER_PATH = 'plugins/relay/agents/plan-reviewer.md';
const DECISIONS_PATH = 'docs/decisions.md';
const PLAN_PRIMARY_PATH = 'PRPs/plans/add-an-8th-fixed-deterministic-check-r-coh-validate-search.plan.md';
const PLAN_COMPLETED_PATH = 'PRPs/plans/completed/add-an-8th-fixed-deterministic-check-r-coh-validate-search.plan.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors plan-reviewer-action-validate-contradiction-check.test.mjs's
 * helper of the same name/shape.
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
 * plan-reviewer-action-validate-contradiction-check.test.mjs's helper of
 * the same name/shape.
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
 * plan-reviewer-action-validate-contradiction-check.test.mjs's helper of
 * the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Reads the source plan's own content, trying its pre-archival path first
 * and falling back to its post-D8-archival `PRPs/plans/completed/` path —
 * the plan is APPROVED but this suite cannot assume it has (or has not)
 * been moved to `completed/` at any given time it runs. Hard-FAILS (throws,
 * which node:test reports as a test failure) when the plan is at NEITHER
 * path, rather than silently skipping or vacuously passing — an absent
 * source plan is a real problem this test must surface, never swallow
 * (the R-TRIVIAL-ASSERT concern: a test that passes when its own subject
 * is missing asserts nothing).
 * @returns {string}
 */
function readSourcePlan() {
  for (const relPath of [PLAN_PRIMARY_PATH, PLAN_COMPLETED_PATH]) {
    try {
      return readRepoFile(relPath);
    } catch {
      // try the next candidate path
    }
  }
  throw new Error(`source plan not found at either "${PLAN_PRIMARY_PATH}" or "${PLAN_COMPLETED_PATH}" — cannot verify AC-A11's Level 3 gate shape`);
}

// ---------------------------------------------------------------------------
// AC-A1 — primary trigger (a): plan-local ACTION-text duplication.
// ---------------------------------------------------------------------------

test('AC-A1: plan-reviewer.md\'s primary trigger (a) fires when the plan\'s OWN **ACTION**: text for the SAME task contains the in-scope indexOf/lastIndexOf search string more than once, and reason quotes the offending task heading, search string, and ordering comparison verbatim', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**(a) Primary trigger — plan-local duplication.** FAILS when the plan\'s OWN `**ACTION**:` text for that SAME task contains the search string more than once.'
    ),
    "expected primary trigger (a)'s exact framing"
  );
  assert.ok(
    collapsed.includes(
      'This is the strongest signal available without reading the target file: if the plan\'s own prose already repeats the string, the target file — which the ACTION describes editing — plausibly repeats it too.'
    ),
    'expected the strongest-available-signal rationale'
  );
  assert.ok(
    collapsed.includes(
      'Either trigger firing FAILS the site. `reason` quotes VERBATIM: the offending `### Task <i>:` heading (or the Validation Commands Level name), the search string, and the ordering comparison expression.'
    ),
    'expected the reason-quotes-verbatim clause shared by both triggers'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 — secondary trigger (b): unqualified short identifier heuristic,
// with the stated 20-character threshold.
// ---------------------------------------------------------------------------

test('AC-A2: plan-reviewer.md\'s secondary trigger (b) fires when the search string is a bare identifier under 20 characters with no disambiguating context (no leading "await ", no function/const/###/## anchor, no surrounding punctuation), independent of ACTION-text duplication, grounded in the bioinformatics Maximal Unique Match uniqueness-plus-minimum-length precedent', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      '**(b) Secondary trigger — unqualified short identifier (heuristic, weaker).** FAILS when the search string is a bare identifier (a contiguous run of letters/digits/underscore, no embedded whitespace or punctuation) with NO disambiguating context — no leading `await `, no `function `/`const `/`### `/ `## ` anchor immediately before it, no surrounding punctuation (parens, colons, quotes-within-the-match, etc.) — AND the string is shorter than **20 characters**.'
    ),
    "expected secondary trigger (b)'s exact framing and the 20-character threshold"
  );
  assert.ok(
    collapsed.includes(
      'The 20-character threshold mirrors the closest transferable prior art found during this check\'s own research grounding: the bioinformatics "Maximal Unique Match" concept trusts a substring as a reliable anchor only when it clears BOTH a uniqueness test and a minimum-length floor (default 20 characters) — a short match is not trusted alone, matching this check\'s own two-trigger design.'
    ),
    'expected the Maximal Unique Match grounding rationale'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 — the RELAY-FIRST-MATCH-INTENDED escape hatch: non-empty
// justification exempts; a bare sentinel does not.
// ---------------------------------------------------------------------------

test('AC-A3: plan-reviewer.md\'s escape hatch exempts an in-scope site from both fail triggers ONLY when RELAY-FIRST-MATCH-INTENDED is followed by a non-empty justification in the VALIDATE text or immediately adjacent prose; a bare sentinel with no justification text does NOT satisfy the escape hatch and the fail triggers still apply', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "For each in-scope site, apply the ESCAPE HATCH first: if that site's `**VALIDATE**:` text, or the prose immediately adjacent to it, carries the sentinel token `RELAY-FIRST-MATCH-INTENDED` followed by a non-empty justification, the site PASSES — do not evaluate the two fail triggers below for it."
    ),
    'expected the escape-hatch-applies-first framing'
  );
  assert.ok(
    collapsed.includes(
      'A bare sentinel with no justification text does NOT satisfy the escape hatch; treat it as absent and continue to the fail triggers.'
    ),
    'expected the bare-sentinel-does-not-exempt clause'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 — in-scope/out-of-scope boundary: an ordering comparison against
// another same-derived index is required; a bare presence test is out of
// scope regardless of uniqueness or length.
// ---------------------------------------------------------------------------

test('AC-A4: plan-reviewer.md scopes R-COH-VALIDATE-SEARCH-AMBIGUOUS to every VALIDATE command under Step-by-Step Tasks and every Validation Commands Level 1-3 block, requiring an indexOf/lastIndexOf call feeding an ORDERING comparison against another same-derived index — a bare === -1 / !== -1 presence test is explicitly OUT OF SCOPE because non-uniqueness cannot break a presence test', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'Scope: every `**VALIDATE**:` command under `## Step-by-Step Tasks`, and every command in the `## Validation Commands` Level 1–3 blocks.'
    ),
    'expected the exact scope statement'
  );
  assert.ok(
    collapsed.includes('(a) the command calls `indexOf(...)` or `lastIndexOf(...)` on some source string;'),
    'expected in-scope condition (a)'
  );
  assert.ok(
    collapsed.includes(
      "(b) the resulting index value feeds an ORDERING comparison (`>`, `<`, `>=`, `<=`) against ANOTHER index value derived the same way (via its own `indexOf`/`lastIndexOf` call) — a bare `=== -1` / `!== -1` presence test is OUT OF SCOPE; non-uniqueness cannot break a presence test;"
    ),
    'expected in-scope condition (b), including the explicit presence-test exclusion and its rationale'
  );
  assert.ok(
    collapsed.includes(
      '(c) the search string passed to `indexOf`/`lastIndexOf` is a bare identifier or a short fragment that plausibly recurs — not, for instance, a full sentence or an already-disambiguated call-site fragment.'
    ),
    'expected in-scope condition (c)'
  );
});

// ---------------------------------------------------------------------------
// AC-A5 — vacuous-pass / unconditional-emission contract: exactly one
// passed:true row on every run when no in-scope site exists, never
// zero-emission.
// ---------------------------------------------------------------------------

test('AC-A5: plan-reviewer.md emits exactly one { "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true } row vacuously when no in-scope site is found at all — including a plan with zero indexOf/lastIndexOf-based ordering comparisons, or where every in-scope site passes both triggers or carries a justified escape hatch — never zero-emission', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      'Otherwise (no in-scope site found at all — including vacuously, on a plan with zero `indexOf`/`lastIndexOf`-based ordering comparisons — or every in-scope site either passes both triggers or carries a justified `RELAY-FIRST-MATCH-INTENDED` sentinel) → `{ "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }`.'
    ),
    'expected the exact vacuous-pass otherwise-branch sentence'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 — heading presence, exact adjacency position, and the unconditional
// / non-zero-emission framing that distinguishes this check from its four
// figma_track/phase_scope-gated conditional siblings. The 12-total-heading
// count/array-shape property is EXISTING_TEST_COVERS
// (plan-reviewer-action-validate-contradiction-check.test.mjs:311's own
// AC-A4 test, updated in this same session's Half 1 fixes) — not
// re-asserted here; see the header comment above.
// ---------------------------------------------------------------------------

test('AC-A6: plan-reviewer.md registers #### R-COH-VALIDATE-SEARCH-AMBIGUOUS positioned immediately after R-COH-ACTION-VALIDATE-CONTRADICTION and immediately before R-COH-DESIGN-SOURCE-MISSING, framed as unconditional/always-emitted (never zero-emission) with no "Zero-emission branch" clause of its own, cross-referencing R-COH-ACTION-VALIDATE-CONTRADICTION as its nearest (complementary, not overlapping) sibling', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const contradictionIdx = content.indexOf('#### R-COH-ACTION-VALIDATE-CONTRADICTION');
  const searchAmbiguousIdx = content.indexOf('#### R-COH-VALIDATE-SEARCH-AMBIGUOUS');
  const designSourceIdx = content.indexOf('#### R-COH-DESIGN-SOURCE-MISSING');
  assert.notEqual(contradictionIdx, -1, 'expected the existing R-COH-ACTION-VALIDATE-CONTRADICTION heading');
  assert.notEqual(searchAmbiguousIdx, -1, 'expected the new R-COH-VALIDATE-SEARCH-AMBIGUOUS heading');
  assert.notEqual(designSourceIdx, -1, 'expected the existing R-COH-DESIGN-SOURCE-MISSING heading');
  assert.ok(contradictionIdx < searchAmbiguousIdx, 'R-COH-VALIDATE-SEARCH-AMBIGUOUS must be positioned after R-COH-ACTION-VALIDATE-CONTRADICTION');
  assert.ok(searchAmbiguousIdx < designSourceIdx, 'R-COH-VALIDATE-SEARCH-AMBIGUOUS must be positioned before R-COH-DESIGN-SOURCE-MISSING');

  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "**Unconditional — always emitted, never zero-emission.** Like `R-COH-VALIDATE-ALWAYS-PASS` and `R-COH-ACTION-VALIDATE-CONTRADICTION`, this check has no project- or plan-level declaration to gate on"
    ),
    'expected the unconditional/always-emitted framing sentence'
  );
  assert.ok(collapsed.includes('so it always contributes exactly one row to `rubric[]`.'), 'expected the always-contributes-exactly-one-row clause');
  assert.ok(
    collapsed.includes(
      "Its nearest sibling in this respect is `R-COH-ACTION-VALIDATE-CONTRADICTION`: that check catches ACTION and VALIDATE DISAGREEING on a literal"
    ),
    'expected the nearest-sibling cross-reference to R-COH-ACTION-VALIDATE-CONTRADICTION'
  );
  assert.ok(
    collapsed.includes(
      'This check catches a different class: ACTION and VALIDATE AGREE on the literal, but the literal is not proven unique in the file the VALIDATE searches. The two checks are complementary, not overlapping — a task can trip one, both, or neither.'
    ),
    'expected the complementary-not-overlapping differentiation statement'
  );
  assert.equal(
    block.includes('Zero-emission branch'),
    false,
    'expected NO "Zero-emission branch" clause — unlike its four conditional siblings, this check has no declaration to gate on'
  );
});

// ---------------------------------------------------------------------------
// AC-A7 — the ### Logging discipline rubric[]-length arithmetic shift.
// PRESENCE of the new numerals is EXISTING_TEST_COVERS, combined across
// plan-reviewer-action-validate-contradiction-check.test.mjs's AC-A5,
// figma-visual-first-track-phase3.test.mjs's AC-A2, and
// figma-track-phase5.test.mjs's AC-4/AC-A1 (all three updated this same
// session) — see the header comment above. This test supplies only the
// missing-property delta: a regression guard confirming the OLD stale
// numerals are now ABSENT from the live file, mirroring
// plan-reviewer-action-validate-contradiction-check.test.mjs's own AC-A6
// "forbidden literal never returns" pattern for the analogous prior shift.
// ---------------------------------------------------------------------------

test('AC-A7 (regression guard — the missing-property delta over EXISTING_TEST_COVERS; see header comment): the forbidden literals "15 to 20 rows", "15 to 23 rows", and "24th row" are all absent (count 0) from plugins/relay/agents/plan-reviewer.md — the pre-shift numerals this 8th-check shipment superseded', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  const staleBaseline = content.split('15 to 20 rows').length - 1;
  const staleMaximal = content.split('15 to 23 rows').length - 1;
  const staleOrdinal = content.split('24th row').length - 1;

  assert.equal(staleBaseline, 0, `expected zero occurrences of the forbidden literal "15 to 20 rows", found ${staleBaseline}`);
  assert.equal(staleMaximal, 0, `expected zero occurrences of the forbidden literal "15 to 23 rows", found ${staleMaximal}`);
  assert.equal(staleOrdinal, 0, `expected zero occurrences of the forbidden literal "24th row", found ${staleOrdinal}`);
});

// ---------------------------------------------------------------------------
// AC-A8 — the ## review.jsonl format worked example gains a matching row.
// ---------------------------------------------------------------------------

test('AC-A8: plan-reviewer.md\'s ## review.jsonl format example JSON block includes a new R-COH-VALIDATE-SEARCH-AMBIGUOUS passed:true row immediately after the existing R-COH-ACTION-VALIDATE-CONTRADICTION row, so all 8 fixed deterministic checks each have an example row', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);

  assert.ok(content.includes('{ "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }'), 'expected the new JSONL example row');
  assert.ok(
    content.includes(
      '{ "id": "R-COH-ACTION-VALIDATE-CONTRADICTION", "passed": true },\n    { "id": "R-COH-VALIDATE-SEARCH-AMBIGUOUS", "passed": true }'
    ),
    'expected the new row positioned immediately after the existing R-COH-ACTION-VALIDATE-CONTRADICTION row, with no other row between them'
  );

  const jsonlBlock = sliceBetween(content, '"rubric": [', '"action": "final_flip"');
  assert.ok(jsonlBlock, 'expected an extractable worked-example rubric[] JSON block');
  const fixedRowIds = [...(/** @type {string} */ (jsonlBlock)).matchAll(/"id": "(R-COH-[A-Z-]+)"/g)].map((m) => m[1]);
  assert.equal(
    fixedRowIds.length,
    8,
    `expected exactly 8 R-COH-* example rows (one per fixed deterministic check), found ${fixedRowIds.length}: ${fixedRowIds.join(', ')}`
  );
  assert.equal(
    fixedRowIds[fixedRowIds.length - 1],
    'R-COH-VALIDATE-SEARCH-AMBIGUOUS',
    'expected the new check to be the LAST R-COH-* row in the worked example, matching its position as the last of the 8 fixed checks'
  );
});

// ---------------------------------------------------------------------------
// AC-A9 — docs/decisions.md records the decision, including its explicit
// numeral supersession of the [2026-07-26] entry, and is positioned as the
// last real entry before the template comment.
// ---------------------------------------------------------------------------

test('AC-A9: docs/decisions.md records a new [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS entry with the updated 16-to-21/16-to-24 arithmetic and the RELAY-FIRST-MATCH-INTENDED escape hatch, explicitly stating it supersedes the "15 to 20 rows"/"15 to 23 rows" numerals recorded in the [2026-07-26] entry, positioned as the file\'s last real entry immediately before the template comment', () => {
  const content = readRepoFile(DECISIONS_PATH);

  assert.ok(content.includes('## [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS'), 'expected the new [2026-07-28] decision heading');

  const block = sliceBetween(content, '## [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS', '<!-- Template for future entries:');
  assert.ok(block, 'expected an extractable [2026-07-28] entry block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(collapsed.includes('16 to 21'), 'expected the updated baseline numeral');
  assert.ok(collapsed.includes('16 to 24'), 'expected the updated maximal numeral');
  assert.ok(collapsed.includes('RELAY-FIRST-MATCH-INTENDED'), 'expected the escape-hatch sentinel token named in the entry');
  assert.ok(
    collapsed.includes('This entry\'s numerals supersede the "15 to 20 rows"/"15 to 23 rows" numerals recorded in the [2026-07-26] entry above'),
    'expected the explicit supersession statement naming the 2026-07-26 entry and its stale numerals'
  );

  // Positioning: the new entry must be the file's LAST real entry — after
  // the [2026-07-27] Orchestrator resumability entry (itself the file's
  // previous last real entry) and before the template comment.
  const orchestratorIdx = content.indexOf('## [2026-07-27] Orchestrator resumability');
  const newEntryIdx = content.indexOf('## [2026-07-28] R-COH-VALIDATE-SEARCH-AMBIGUOUS');
  const templateIdx = content.indexOf('<!-- Template for future entries:');
  assert.notEqual(orchestratorIdx, -1, 'expected the existing [2026-07-27] Orchestrator resumability entry');
  assert.notEqual(templateIdx, -1, 'expected the template-for-future-entries comment');
  assert.ok(orchestratorIdx < newEntryIdx, 'the new entry must be positioned after the [2026-07-27] Orchestrator resumability entry');
  assert.ok(newEntryIdx < templateIdx, "the new entry must be positioned before the template comment, as the file's last real entry");
});

// ---------------------------------------------------------------------------
// AC-A10 — the check's own "Known limitation (recorded, not blocking)"
// paragraph.
// ---------------------------------------------------------------------------

test('AC-A10: plan-reviewer.md\'s R-COH-VALIDATE-SEARCH-AMBIGUOUS closes with a "Known limitation (recorded, not blocking)" paragraph stating plan-reviewer cannot verify true target-file uniqueness (no Bash/Grep/Glob), detects only the plan-local proxy signals, can miss a search string non-unique in the target file while appearing once in the plan\'s own ACTION text, can false-positive on an incidental repetition or a short-but-actually-unique identifier, and is a plan-authoring-time gate, not the final safety net', () => {
  const content = readRepoFile(PLAN_REVIEWER_PATH);
  const block = sliceBetween(content, '#### R-COH-VALIDATE-SEARCH-AMBIGUOUS', '#### R-COH-DESIGN-SOURCE-MISSING');
  assert.ok(block, 'expected an extractable R-COH-VALIDATE-SEARCH-AMBIGUOUS block');
  const collapsed = collapseWs(/** @type {string} */ (block));

  assert.ok(
    collapsed.includes(
      "**Known limitation (recorded, not blocking):** `plan-reviewer`'s tool grant is `Read, Edit, Write` — no `Bash`, no `Grep`, no `Glob` — so this check cannot execute a VALIDATE command and cannot scan the target file to count real occurrences of the search string; verifying true uniqueness would require reading the target file and counting matches, outside this agent's tool surface."
    ),
    'expected the known-limitation opening: no Bash/Grep/Glob, cannot verify true target-file uniqueness'
  );
  assert.ok(
    collapsed.includes(
      "The check therefore detects the plan-local proxy signals only (same-task ACTION duplication; unqualified short identifiers): it can miss a search string that is genuinely non-unique in the target file while appearing only once in the plan's own ACTION text, and it can false-positive on an incidental, harmless repetition or on a short identifier that happens to be unique in the target file."
    ),
    'expected the plan-local-proxy-signals-only clause, the miss case, and the false-positive case'
  );
  assert.ok(
    collapsed.includes(
      "It is a plan-authoring-time gate, not the final safety net; the real enforcement remains the Implementer actually running the task's own VALIDATE command and observing whether it passes against the real file."
    ),
    'expected the plan-authoring-time-gate-not-final-safety-net closing clause'
  );
});

// ---------------------------------------------------------------------------
// AC-A11 — this plan's own ## Validation Commands Level 3 gate: a SUBSET
// check (never a bare zero-failures shortcut) over the PLAN document
// itself, not plan-reviewer.md/docs/decisions.md. Read via
// readSourcePlan() above, which hard-fails rather than silently passing
// if the plan is absent at both its pre- and post-archival paths.
// ---------------------------------------------------------------------------

test('AC-A11: the source plan\'s own ## Validation Commands Level 3 block names the exact three-file known-stale allowlist verbatim, exit 1s on any unexpected failing file, exit 0s only via the subset-check branch (never a bare zero-failures shortcut), uses the glob form of node --test (not the non-recursing bare-directory form), and contains no || true escape hatch', () => {
  const content = readSourcePlan();
  const block = sliceBetween(content, '**Level 3 — DRY-RUN END-TO-END**', 'Every command above exits non-zero');
  assert.ok(block, 'expected an extractable Level 3 — DRY-RUN END-TO-END block');
  const raw = /** @type {string} */ (block);

  // (1) The exact three-file known-stale allowlist, verbatim.
  assert.ok(
    raw.includes(
      'ALLOWLIST="plan-reviewer-action-validate-contradiction-check.test.mjs figma-visual-first-track-phase3.test.mjs figma-track-phase5.test.mjs"'
    ),
    'expected the exact three-file known-stale allowlist string verbatim'
  );

  // (2) The UNEXPECTED-file branch exit 1s.
  const unexpectedBlock = sliceBetween(raw, 'if [ -n "$UNEXPECTED" ]; then', 'echo "PASS: only known-stale');
  assert.ok(unexpectedBlock, 'expected an extractable UNEXPECTED-file-handling if-block');
  assert.ok(
    /** @type {string} */ (unexpectedBlock).includes('exit 1'),
    'expected the UNEXPECTED-file branch to exit 1 on any unexpected failing file'
  );

  // (3) The terminal exit 0 is reached ONLY via the subset-check branch —
  // never a bare zero-failures shortcut. Exactly two "exit 0" occurrences
  // are expected: the RUNNER_EXIT -eq 0 fast-path (a genuine all-green
  // run — the one legitimate bare-zero-failures case, since there is
  // nothing to subset-check when nothing failed), and the terminal one,
  // reachable only after the UNEXPECTED check has already passed.
  const runnerExitZeroIdx = raw.indexOf('if [ "$RUNNER_EXIT" -eq 0 ]; then');
  const unexpectedCheckIdx = raw.indexOf('if [ -n "$UNEXPECTED" ]; then');
  const terminalPassEchoIdx = raw.indexOf('echo "PASS: only known-stale, allowlisted file(s) failing, pending test-pair follow-up:$ALLOWED_HIT"');
  const exitZeroMatches = [...raw.matchAll(/exit 0/g)];
  assert.equal(
    exitZeroMatches.length,
    2,
    `expected exactly 2 "exit 0" occurrences (the all-green fast-path and the terminal subset-check-passed branch), found ${exitZeroMatches.length}`
  );
  assert.notEqual(runnerExitZeroIdx, -1, 'expected the RUNNER_EXIT -eq 0 fast-path guard');
  assert.notEqual(unexpectedCheckIdx, -1, 'expected the UNEXPECTED-file check guard');
  assert.notEqual(terminalPassEchoIdx, -1, 'expected the terminal subset-check-passed PASS echo');
  assert.ok(
    /** @type {number} */ (exitZeroMatches[0].index) > runnerExitZeroIdx && /** @type {number} */ (exitZeroMatches[0].index) < unexpectedCheckIdx,
    'expected the first exit 0 to be the fast-path inside the RUNNER_EXIT -eq 0 branch, before the subset-check logic begins'
  );
  assert.ok(
    terminalPassEchoIdx > unexpectedCheckIdx,
    'expected the terminal PASS echo to be positioned after (i.e. gated behind) the UNEXPECTED-file subset check'
  );
  assert.ok(
    /** @type {number} */ (exitZeroMatches[1].index) > terminalPassEchoIdx,
    'expected the terminal exit 0 to immediately follow the subset-check-passed PASS echo, never reachable independently of it'
  );

  // (4) The glob form of node --test is used — never the non-recursing
  // bare-directory form (Node v24 Windows does not recurse a bare dir).
  // Scoped to the literal invocation path shape, not a bare "node --test"
  // token search, so a PROSE mention elsewhere in the block — e.g. the
  // echo string "FAIL: node --test exited non-zero (code $RUNNER_EXIT)
  // but no 'test at <path>.test.mjs' entries could be parsed..." — is
  // never mistaken for a second invocation.
  assert.ok(
    raw.includes('node --test scripts/validate/checks/*.test.mjs'),
    'expected the glob-form invocation node --test scripts/validate/checks/*.test.mjs to be present'
  );
  assert.equal(
    /node --test scripts\/validate\/checks\/(?!\*\.test\.mjs)/.test(raw),
    false,
    'expected no non-recursing bare-directory node --test scripts/validate/checks/ invocation (missing the *.test.mjs glob suffix) anywhere in the block'
  );

  // (5) No || true escape hatch anywhere in the block.
  assert.equal(raw.includes('|| true'), false, 'expected no || true escape hatch anywhere in the Level 3 block');
});
