// @ts-check
/**
 * Content/structure-invariant tests for Phase 2 ("Scoped scan + metadata
 * budget") of the figma-quota-resilience PRD — the single-file, prose-only
 * rewrite of `/relay-design-map`'s Phase B
 * (`plugins/relay/commands/relay-design-map.md`) from "enumerate then call
 * get_metadata for EVERY discovered component" to "enumerate -> pre-match
 * against the local design-system clone -> enrich only candidates", bounded
 * by a new `max_metadata_calls = 150` budget dual-declared in both the
 * frontmatter `description` and the command body (mirroring the existing
 * `max_library_search_calls` convention), with non-fatal budget exhaustion
 * recorded as `enrichment_truncated: true` plus a reason, and two new
 * evidence-bundle header counters (`candidates_prematched`,
 * `metadata_calls_made`). The pre-match is documented as recall-oriented
 * (over-includes by design, never under-includes) and explicitly
 * non-authoritative — `design-map-writer` keeps sole classification
 * authority and remains free to map anything in the evidence bundle
 * regardless of candidate-set membership. Zero agent files are touched by
 * this phase.
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md (PRD AC-1, AC-2, AC-3)
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-2-scoped-scan-metadata-budget.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 2 plan — the Implementer authored ZERO
 * test-file changes by design (R-X strict; the plan's own `## NOT Building`
 * names "Any `*.test.mjs` file" as explicitly out of the Implementer's
 * scope, confirmed by the plan's own grounding: zero existing assertions
 * anywhere in the corpus depend on Phase B's specific prose).
 *
 * Existing-coverage scan performed before authoring (this session): grepped
 * every scripts/validate/checks/*.test.mjs file for `max_metadata_calls`,
 * `candidates_prematched`, `metadata_calls_made`, `enrichment_truncated`,
 * `recall-oriented`, and `classification authority` — zero hits anywhere in
 * the corpus. A broader scan for `relay-design-map` found 65 hits across 7
 * files, none of which cover Phase B's pre-match/budget/evidence-header
 * content specifically: `figma-track-phase3.test.mjs` (25 hits) covers only
 * dispatch-graph/registration-parity and inertness;
 * `fix-design-system-config-producer.test.mjs` (22 hits) covers only P2
 * scaffolding, HALT-code wording, and the (unrelated, pre-existing-failure)
 * Phase D preflight `scripts/visual/`-shipped-status wording; the remaining
 * 5 files use `relay-design-map` only as an unrelated cross-reference or a
 * generic fixture-path constant. Every AC below is therefore
 * NEW_TEST_REQUIRED.
 *
 * Traceability (plan's own `## Acceptance Criteria` — each plan AC-A<i>
 * names exactly one PRD AC-<i>, a 1:1 mapping for this phase):
 *
 *   AC-A1 (PRD AC-1, scoped enrichment) — Phase B's now-5-step pipeline
 *     scopes `get_metadata` to the step 2 candidate set (never the full
 *     step 1 enumeration), bounded by `max_metadata_calls`, with
 *     `candidates_prematched`/`metadata_calls_made` recorded in the
 *     evidence bundle header.
 *   AC-A2 (PRD AC-2, budget declared in both places) — `max_metadata_calls`
 *     appears in both the frontmatter `description` (no-space form,
 *     mirroring `max_library_search_calls`) and the command body (spaced
 *     form), and its exhaustion is explicitly non-fatal.
 *   AC-A3 (PRD AC-3, pre-match is recall-oriented and non-authoritative) —
 *     the pre-match step's own prose states over-inclusion and
 *     no-classification-authority explicitly, names the
 *     design-map-writer.md Step 2 duplication/drift risk, and
 *     design-map-writer.md itself is unaffected (zero agent files touched).
 *
 * Run: node --test scripts/validate/checks/figma-quota-resilience-phase2.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-design-map.md';
const DESIGN_MAP_WRITER_PATH = 'plugins/relay/agents/design-map-writer.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the established helper of the same name/shape used throughout
 * this corpus (e.g. figma-quota-resilience-phase1.test.mjs,
 * fix-design-system-config-producer.test.mjs).
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
 * fix-design-system-config-producer.test.mjs's helper of the same
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

/**
 * Collapses all whitespace runs (including markdown line-wrap newlines) to
 * a single space, so multi-line prose assertions do not depend on exactly
 * where a given source file happens to wrap a sentence. Mirrors
 * figma-quota-resilience-phase1.test.mjs's helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-1 / AC-A1 — Given a Figma library enumerating far more components than
// a design-system clone will locally match, when Phase B runs, then
// get_metadata calls are bounded by max_metadata_calls and proportional to
// the pre-matched candidate set (never the full enumeration), and the
// evidence bundle header records both candidates_prematched and
// metadata_calls_made.
// ---------------------------------------------------------------------------

test('AC-1/AC-A1: Phase B enumerates exactly 5 sequential numbered steps, in strict pipeline order (library search -> pre-match candidates -> node-scoped metadata -> code connect -> persist evidence) — the enumerate-then-pre-match-then-enrich-candidates-only inversion replacing the pre-Phase-2 4-step enumerate-then-enrich-everything shape', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section delimited by the "## Phase C" heading');

  const stepLabels = [...phaseB.matchAll(/^\d+\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].toLowerCase());
  assert.equal(
    stepLabels.length,
    5,
    `expected exactly 5 top-level numbered steps in Phase B, found ${stepLabels.length}: ${JSON.stringify(stepLabels)}`
  );
  assert.match(stepLabels[0], /library search/);
  assert.match(stepLabels[1], /pre-match candidates/);
  assert.match(stepLabels[2], /node-scoped metadata/);
  assert.match(stepLabels[3], /code connect/);
  assert.match(stepLabels[4], /persist evidence/);
});

test('AC-1/AC-A1: Phase B step 3 (metadata enrichment) scopes get_metadata calls to the step 2 pre-matched candidate set — never the full step 1 library enumeration — and stops issuing further calls once max_metadata_calls is reached', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  const collapsed = collapseWs(phaseB);

  assert.ok(
    collapsed.includes(
      'in the step 2 candidate set — never the full step 1 enumeration — call node-scoped `get_metadata`'
    ),
    'expected step 3 to scope enrichment explicitly to the step 2 candidate set, excluding the full step 1 enumeration'
  );
  assert.ok(
    collapsed.includes(
      'Budget: `max_metadata_calls = 150` — stop issuing further `get_metadata` calls once this budget is reached'
    ),
    'expected a numeric max_metadata_calls budget with stop-issuing-further-calls language'
  );
});

test('AC-1/AC-A1: the persist-evidence step records candidates_prematched (defined as the size of the step 2 candidate set) and metadata_calls_made (defined as the count of get_metadata calls actually issued this run) as library-search.json header fields', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step5Start = phaseB.indexOf('5. **Persist evidence');
  assert.notEqual(step5Start, -1, 'expected a step 5 ("Persist evidence") heading in Phase B');
  const collapsed = collapseWs(phaseB.slice(step5Start));

  assert.ok(
    collapsed.includes('`candidates_prematched`, the size of the step 2 candidate set'),
    'expected candidates_prematched to be defined as the size of the step 2 candidate set'
  );
  assert.ok(
    collapsed.includes(
      '`metadata_calls_made`, the count of step 3 `get_metadata` calls actually issued this run'
    ),
    'expected metadata_calls_made to be defined as the count of get_metadata calls actually issued this run'
  );
});

// ---------------------------------------------------------------------------
// AC-2 / AC-A2 — Given relay-design-map.md, when max_metadata_calls is
// introduced, then it appears both in the frontmatter description and in
// the command body, matching the max_library_search_calls dual-declaration
// convention already used in that same file; and its exhaustion is
// non-fatal, recording enrichment_truncated: true with a reason.
// ---------------------------------------------------------------------------

test('AC-2/AC-A2: max_metadata_calls=150 is declared in the frontmatter description (no-space form), alongside the pre-existing max_library_search_calls=40 frontmatter declaration', () => {
  const content = readRepoFile(COMMAND_PATH);
  const frontmatterEnd = content.indexOf('\n---', 4);
  assert.notEqual(frontmatterEnd, -1, 'expected a closing frontmatter --- delimiter');
  const frontmatter = content.slice(0, frontmatterEnd);

  assert.ok(
    frontmatter.includes('max_library_search_calls=40'),
    'expected the existing max_library_search_calls=40 frontmatter declaration to still be present'
  );
  assert.ok(
    frontmatter.includes('max_metadata_calls=150'),
    'expected a new max_metadata_calls=150 frontmatter declaration, mirroring the existing budget convention'
  );
});

test('AC-2/AC-A2: max_metadata_calls = 150 is declared again in the command body (Phase B step 3), matching the spaced-around-= style the pre-existing body-level max_library_search_calls = 40 declaration already uses', () => {
  const content = readRepoFile(COMMAND_PATH);
  const frontmatterEnd = content.indexOf('\n---', 4);
  const body = content.slice(frontmatterEnd);

  assert.ok(
    body.includes('max_library_search_calls = 40'),
    'expected the existing body-level max_library_search_calls = 40 declaration'
  );
  assert.ok(
    body.includes('max_metadata_calls = 150'),
    'expected a body-level max_metadata_calls = 150 declaration, matching the spaced-around-= convention'
  );
});

test('AC-2/AC-A2: max_metadata_calls exhaustion is stated explicitly as never fatal, recording enrichment_truncated: true with a reason and continuing to the next step rather than halting', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  const collapsed = collapseWs(phaseB);

  assert.ok(
    collapsed.includes('Exhaustion is never fatal: record `enrichment_truncated: true` with a reason'),
    'expected exhaustion to be framed explicitly as never fatal, recording enrichment_truncated: true with a reason'
  );
  assert.ok(
    collapsed.includes('continue to the next step'),
    'expected the run to explicitly continue past budget exhaustion rather than halting'
  );
});

// ---------------------------------------------------------------------------
// AC-3 / AC-A3 — Given the command's pre-match selects candidate set C, when
// design-map-writer runs, then it remains free to map any component present
// in the evidence bundle regardless of membership in C (unchanged agent
// behavior — zero agent files touched by this phase), and the command's own
// prose states explicitly that the pre-match over-includes by design and
// carries no classification authority.
// ---------------------------------------------------------------------------

test('AC-3/AC-A3: the pre-match step (step 2) states explicitly, in its own prose, that it is recall-oriented — it over-includes and never under-includes, naming concrete over-inclusion triggers', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  // Scoped to step 2 specifically so the assertion is about THIS step's own
  // framing, not an incidental match anywhere else in the ~260-line block.
  const step2 = sliceBetween(phaseB, '2. **Pre-match candidates', '3. **Node-scoped metadata');
  assert.ok(step2, 'expected to isolate step 2 ("Pre-match candidates") text');
  const collapsed = collapseWs(step2);

  assert.match(collapsed, /recall-oriented/i);
  assert.ok(
    collapsed.includes('over-includes and never under-includes'),
    'expected the recall-oriented property to state over-inclusion / never-under-inclusion explicitly'
  );
  assert.ok(
    collapsed.includes(
      'any plausible partial match, pluralization difference, or ambiguous multi-candidate name is always included, never excluded'
    ),
    'expected the recall-oriented property to name concrete over-inclusion triggers'
  );
});

test('AC-3/AC-A3: the pre-match step (step 2) states explicitly, in its own prose, that it carries no classification authority and that design-map-writer remains free to map anything in the evidence bundle regardless of candidate-set membership', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step2 = sliceBetween(phaseB, '2. **Pre-match candidates', '3. **Node-scoped metadata');
  assert.ok(step2, 'expected to isolate step 2 ("Pre-match candidates") text');
  const collapsed = collapseWs(step2);

  assert.match(collapsed, /no classification authority/i);
  assert.ok(
    collapsed.includes('never decides `CONFIRMED` vs. `INFERRED` vs. `UNMAPPED`'),
    'expected the no-classification-authority property to name the three classification outcomes it does not decide'
  );
  assert.ok(
    collapsed.includes(
      'the writer may map any component present in the evidence bundle regardless of membership in this candidate set'
    ),
    'expected the prose to state design-map-writer remains free to map anything in the bundle regardless of candidate-set membership'
  );
});

test('AC-3/AC-A3: the pre-match step (step 2) names, as prose, that it duplicates part of design-map-writer.md Step 2\'s own name/prop matching heuristic and that neither heuristic is authoritative over the other', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step2 = sliceBetween(phaseB, '2. **Pre-match candidates', '3. **Node-scoped metadata');
  assert.ok(step2, 'expected to isolate step 2 ("Pre-match candidates") text');
  const collapsed = collapseWs(step2);

  assert.ok(
    collapsed.includes('duplicates part of `design-map-writer.md` Step 2\'s own'),
    'expected the drift-risk framing to name design-map-writer.md Step 2 explicitly as the duplicated heuristic'
  );
  assert.match(
    collapsed,
    /neither is authoritative over the other/i,
    'expected the prose to state neither heuristic is authoritative over the other'
  );
});

test('AC-3/AC-A3: design-map-writer.md is unaffected by this phase — Step 2 still iterates unconditionally "For each Figma component present in the evidence bundle", unfiltered by any candidate-set concept, and carries no reference to the command\'s new candidate-set mechanism', () => {
  const content = readRepoFile(DESIGN_MAP_WRITER_PATH);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes(
      "Search the design-system clone (via `Glob` for filenames, `Grep` for exported symbol names) for a component whose name is similar to the Figma component's name and whose prop shape is plausible given the Figma node's variant/property data in the evidence."
    ),
    'expected design-map-writer.md Step 2\'s own clone-search heuristic to remain present and unchanged (this phase edits zero agent files)'
  );
  assert.ok(
    collapsed.includes('For each Figma component present in the evidence bundle:'),
    'expected Step 2 to keep iterating unconditionally over the full evidence bundle, not a candidate-set-filtered subset — this is what makes the writer free to map any component regardless of the command\'s pre-match candidate-set membership'
  );
  assert.ok(
    !collapsed.includes('candidate set'),
    'expected design-map-writer.md to carry no reference to the command\'s new "candidate set" pre-match concept — that mechanism lives entirely in relay-design-map.md, and this phase must not have leaked it into the writer agent'
  );
});
