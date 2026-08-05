// @ts-check
/**
 * Content/structure-invariant tests for Phase 5 ("Checkpoint / resume") of
 * the figma-quota-resilience PRD — the single-file, prose-only rewrite of
 * `/relay-design-map` (`plugins/relay/commands/relay-design-map.md`) that
 * makes Phase B resume-aware: step 2 (library search) skips entirely when
 * `--refresh` is absent and the prior bundle's `inventory_truncated` already
 * reads `false`; step 4 (cost declaration) partitions the step 3 candidate
 * set into an already-enriched-excluded set and a delta set using on-disk
 * `metadata/<component-key>.json` files, computing its estimate from the
 * delta set and skipping its own confirmation gate entirely when the delta
 * is empty; step 5 (node-scoped metadata) enriches only that delta set,
 * unconditionally (independent of `--refresh`, unlike steps 2 and 6); step 6
 * (Code Connect) skips `get_code_connect_map` entirely when `--refresh` is
 * absent and a prior `code-connect.json` already exists; step 7 (persist
 * evidence) gains three new fields (`search_skipped`,
 * `candidates_skipped_already_enriched`, `code_connect_skipped`) making
 * every skip decision auditable; and the frontmatter `description`, the
 * `--refresh` Parse-arguments section, and the `FAILED_FIGMA_QUOTA_EXHAUSTED`
 * HALT message's re-run guidance are all updated to describe the cheaper
 * retry story honestly (including the mid-search carve-out: a run
 * interrupted during search itself still re-searches from scratch, since
 * `search_design_system` exposes no resumable cursor).
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md (PRD AC-14)
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-5-checkpoint-resume.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 5 plan — the Implementer authored ZERO
 * test-file changes by design (R-X strict; the plan's own `## NOT Building`
 * names "Any new or edited `*.test.mjs` file" as explicitly out of the
 * Implementer's scope, grounded in the plan's own corpus-impact scan, which
 * `plan-reviewer` independently re-confirmed: zero existing assertions
 * anywhere in the corpus pin any of the seven areas this phase touches).
 *
 * Existing-coverage scan performed before authoring (this session): grepped
 * every scripts/validate/checks/*.test.mjs file (44 files) for
 * `search_skipped`, `candidates_skipped_already_enriched`,
 * `code_connect_skipped`, `delta set` (case-insensitive), `fully cached`,
 * `costs only the delta`, `cost only the delta`,
 * `automatically skip Figma calls`, `AC-14`, and `checkpoint / resume`
 * (case-insensitive) — zero hits anywhere in the corpus for every pattern.
 * The three sibling files (`figma-quota-resilience-phase2/3/4.test.mjs`)
 * cover Phase B's step count/pre-match/budget prose (phase 2), the
 * quota-preflight/cost-declaration-gate/HALT prose (phase 3), and the
 * evidence-merge/checkpoint-exclusion/completeness-flags/downgrade prose
 * (phase 4) respectively — none of them assert on this phase's resume/skip
 * mechanics, which did not exist in the file before this phase landed. Every
 * AC below is therefore NEW_TEST_REQUIRED. Consistent with that: this
 * session's lifecycle ledger is empty (create-only) — the plan's own
 * grounding swept 10 test files and found zero substrings this phase's
 * edits would corrupt, independently confirmed by `plan-reviewer`, and the
 * corpus stayed green (494/494) straight through the Implementer + Code
 * Review rounds with no repair needed.
 *
 * Traceability (plan's own `## Acceptance Criteria` — each plan AC-A<i>
 * names PRD AC-14, the sole PRD AC this phase implements, sliced into three
 * observable scenarios):
 *
 *   AC-A1 (PRD AC-14, resumed run costs only the delta) — a run interrupted
 *     after partial enrichment re-invoked without `--refresh` issues zero
 *     `get_metadata` calls for candidates an existing metadata file already
 *     covers; the step 4 partition and step 5 enrichment both scope to the
 *     delta set only.
 *   AC-A2 (PRD AC-14, fully-cached re-run issues zero Figma calls in total)
 *     — step 2's search skip, step 4's empty-delta confirmation-gate skip,
 *     step 5's resulting zero-call enrichment, and step 6's Code Connect
 *     skip compose into a fully-cached re-run costing nothing, made
 *     auditable via the three new step 7 fields.
 *   AC-A3 (PRD AC-14, `--refresh` costs only the delta, not a full re-scan)
 *     — `--refresh` still re-runs step 2's search and step 6's Code Connect
 *     in full, while step 5's enrichment stays delta-scoped regardless —
 *     documented honestly in both the frontmatter `description` and the
 *     `--refresh` Parse-arguments bullet.
 *
 * Run: node --test scripts/validate/checks/figma-quota-resilience-phase5.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-design-map.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the established helper of the same name/shape used throughout
 * this corpus (e.g. figma-quota-resilience-phase1/2/3/4.test.mjs).
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Returns undefined
 * if `startNeedle` is absent. Mirrors the sibling *.test.mjs files' helper
 * of the same name/shape.
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
 * where a given source file happens to wrap a sentence (this corpus wraps
 * at ~72 columns). Mirrors the sibling *.test.mjs files' helper of the same
 * name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseWs(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Same as collapseWs, but additionally strips leading markdown blockquote
 * `>` markers before collapsing — needed for the FAILED_FIGMA_QUOTA_EXHAUSTED
 * HALT message, which is authored as a multi-line `>` blockquote whose
 * individual sentences wrap across `>`-prefixed lines: a plain collapseWs
 * would leave the next line's "> " marker embedded mid-sentence, which
 * [[:space:]]-style matching can never bridge. Mirrors
 * figma-quota-resilience-phase3.test.mjs's / fix-design-system-config-producer.test.mjs's
 * helper of the same name/shape.
 * @param {string} str
 * @returns {string}
 */
function collapseBlockquote(str) {
  return str.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-14 / AC-A2 — Step 2 (Library search): skipped entirely when --refresh
// is ABSENT and the prior bundle's inventory_truncated already reads false;
// the existing component list is reused verbatim; search_skipped is
// recorded for step 7 on both branches.
// ---------------------------------------------------------------------------

test('AC-14/AC-A2: Step 2 (Library search) skips search_design_system entirely when --refresh is absent and the prior bundle\'s inventory_truncated already reads false — reuses the existing component/component-set list verbatim (zero search calls) and records search_skipped: true', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step2 = sliceBetween(phaseB, '2. **Library search', '3. **Pre-match candidates');
  assert.ok(step2, 'expected to isolate step 2 ("Library search") text');
  const collapsed = collapseWs(step2);

  assert.ok(
    collapsed.includes(
      "check whether `--refresh` is ABSENT and a prior evidence bundle exists at `evidence_dir/library-search.json` whose own `inventory_truncated` field reads `false` (a complete prior enumeration)"
    ),
    'expected the skip check to require --refresh ABSENT and a prior complete inventory_truncated: false bundle'
  );
  assert.ok(
    collapsed.includes(
      'SKIP this step\'s `search_design_system` calls entirely — reuse the existing component/component-set list verbatim as this run\'s step 2 result (zero search calls issued, `inventory_truncated` carried forward unchanged) — and record `search_skipped: true` for step 7'
    ),
    'expected the skip branch to reuse the list verbatim, issue zero search calls, and record search_skipped: true'
  );
});

test('AC-14/AC-A2: Step 2 records search_skipped: false and proceeds to the existing search_design_system call when --refresh was passed or no complete prior inventory exists', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step2 = sliceBetween(phaseB, '2. **Library search', '3. **Pre-match candidates');
  assert.ok(step2, 'expected to isolate step 2 text');
  const collapsed = collapseWs(step2);

  assert.ok(
    collapsed.includes(
      "Otherwise (either `--refresh` was passed, or no complete prior inventory exists), record `search_skipped: false` and proceed as follows."
    ),
    'expected the non-skip branch to record search_skipped: false explicitly'
  );
  assert.ok(
    collapsed.includes(
      'Call `search_design_system` against the Figma library file key(s) from `design_system_config`, enumerating the library\'s components.'
    ),
    'expected the pre-existing search_design_system call sentence to survive unchanged immediately after the new skip-check paragraph'
  );
});

// ---------------------------------------------------------------------------
// AC-14 / AC-A1 / AC-A2 — Step 4 (Cost declaration): the estimate is
// computed from the delta set (step 3 candidates lacking an on-disk
// metadata/<component-key>.json), not the full candidate set; the
// confirmation gate is skipped entirely when the delta is empty; that
// branch continues to steps 6-7 rather than halting.
// ---------------------------------------------------------------------------

test('AC-14/AC-A1: Step 4 partitions the step 3 candidate set using on-disk metadata/<component-key>.json files — a candidate with an existing file is excluded (already enriched) — and this partition applies regardless of --refresh', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step4 = sliceBetween(phaseB, '4. **Cost declaration', '5. **Node-scoped metadata');
  assert.ok(step4, 'expected to isolate step 4 ("Cost declaration + confirmation") text');
  const collapsed = collapseWs(step4);

  assert.ok(
    collapsed.includes(
      "partition the step 3 candidate set using `evidence_dir`'s existing `metadata/<component-key>.json` files — a candidate with an existing file is already enriched from a prior run (excluded"
    ),
    'expected the partition to exclude candidates with an existing on-disk metadata file'
  );
  assert.ok(
    collapsed.includes(
      "the remainder is the delta set step 5 will actually call `get_metadata` for. This partition applies regardless of `--refresh`."
    ),
    'expected the delta set to be defined as the remainder, and the partition to apply regardless of --refresh'
  );
});

test('AC-14/AC-A1: Step 4 computes the get_metadata cost estimate from the delta set\'s size — never the full step 3 candidate-set size — when the delta set is non-empty', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step4 = sliceBetween(phaseB, '4. **Cost declaration', '5. **Node-scoped metadata');
  assert.ok(step4, 'expected to isolate step 4 text');
  const collapsed = collapseWs(step4);

  assert.ok(
    collapsed.includes(
      "Otherwise, continue below using the delta set's size — never the full step 3 candidate-set size — as the estimate."
    ),
    'expected the non-empty-delta path to use the delta set\'s size, never the full candidate-set size, as the estimate'
  );
  assert.ok(
    collapsed.includes(
      "Using the step 1 `whoami` result and the delta set (defined above) size, estimate the number of `get_metadata` calls step 5 will issue"
    ),
    'expected the estimate to be computed from the delta set size, not the full candidate set'
  );
});

test('AC-14/AC-A2: Step 4 skips the confirmation gate entirely when the delta set is empty — records metadata_calls_made: 0 and the fully-cached reason string, then continues to steps 6-7 as normal rather than halting', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step4 = sliceBetween(phaseB, '4. **Cost declaration', '5. **Node-scoped metadata');
  assert.ok(step4, 'expected to isolate step 4 text');
  const collapsed = collapseWs(step4);

  assert.ok(
    collapsed.includes(
      'When the delta set is empty, do NOT proceed with the declaration/confirmation below: record `metadata_calls_made: 0`'
    ),
    'expected an empty delta set to skip the declaration/confirmation gate entirely, recording metadata_calls_made: 0'
  );
  assert.ok(
    collapsed.includes('reason `"fully cached — no candidates pending enrichment"`'),
    'expected the empty-delta branch to record the documented fully-cached reason string'
  );
  assert.ok(
    collapsed.includes(
      'then continue to steps 6-7 as normal — this is not a HALT (mirroring the existing decline branch below)'
    ),
    'expected the empty-delta branch to continue to steps 6-7 rather than halting, explicitly mirroring the decline branch'
  );
});

test('AC-14/AC-A1/AC-A2: candidates_skipped_already_enriched is established once at step 4\'s partition ("on every path below") and is explicitly carried forward on BOTH the empty-delta branch and the pre-existing preflight-decline branch', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step4 = sliceBetween(phaseB, '4. **Cost declaration', '5. **Node-scoped metadata');
  assert.ok(step4, 'expected to isolate step 4 text');
  const collapsed = collapseWs(step4);

  assert.ok(
    collapsed.includes(
      'hold this excluded count as `candidates_skipped_already_enriched` for step 7, on every path below, since it is fully knowable here regardless of which branch follows'
    ),
    'expected candidates_skipped_already_enriched to be established once at the partition, explicitly framed as computable on every path'
  );
  assert.ok(
    collapsed.includes(
      '`candidates_skipped_already_enriched` (the full step 3 candidate-set size, since every candidate was already enriched)'
    ),
    'expected the empty-delta branch to record candidates_skipped_already_enriched as the full candidate-set size'
  );
  assert.ok(
    collapsed.includes(
      "and `candidates_skipped_already_enriched` (per the step 4 partition above) (fed forward to step 7), then continue to steps 6-7 as normal"
    ),
    'expected the pre-existing preflight-decline branch to also carry forward candidates_skipped_already_enriched to step 7'
  );
});

// ---------------------------------------------------------------------------
// AC-14 / AC-A1 / AC-A3 — Step 5 (Node-scoped metadata): only the delta set
// is enriched, unconditionally — this is deliberately independent of
// --refresh, unlike steps 2 and 6.
// ---------------------------------------------------------------------------

test('AC-14/AC-A1: Step 5 enriches only step 4\'s delta set — a candidate excluded from the delta set (an existing metadata/<component-key>.json file already covers it) issues zero get_metadata calls, reusing the on-disk file as this run\'s evidence for it', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step5 = sliceBetween(phaseB, '5. **Node-scoped metadata', '6. **Code Connect');
  assert.ok(step5, 'expected to isolate step 5 ("Node-scoped metadata") text');
  const collapsed = collapseWs(step5);

  assert.ok(
    collapsed.includes(
      "call node-scoped `get_metadata`, scoped to step 4's delta set only — a candidate excluded from the delta set (an existing `metadata/<component-key>.json` file already covers it) issues zero calls here, reusing the on-disk file as this run's evidence for it"
    ),
    'expected step 5 to scope enrichment to the delta set only, excluding already-covered candidates with zero calls'
  );
});

test('AC-14/AC-A3: Step 5\'s delta-scoping is deliberately unconditional on --refresh — its own prose carries no `--refresh` gate at all, unlike step 2 and step 6, which both explicitly check "`--refresh` is ABSENT" before skipping', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');

  const step2 = sliceBetween(phaseB, '2. **Library search', '3. **Pre-match candidates');
  const step5 = sliceBetween(phaseB, '5. **Node-scoped metadata', '6. **Code Connect');
  const step6 = sliceBetween(phaseB, '6. **Code Connect', '7. **Persist evidence');
  assert.ok(step2, 'expected to isolate step 2 text');
  assert.ok(step5, 'expected to isolate step 5 text');
  assert.ok(step6, 'expected to isolate step 6 text');

  assert.ok(
    step2.includes('--refresh'),
    'sanity check: expected step 2 to name --refresh at all, as the contrast baseline'
  );
  assert.ok(
    step6.includes('--refresh'),
    'sanity check: expected step 6 to name --refresh at all, as the contrast baseline'
  );
  assert.ok(
    !step5.includes('--refresh'),
    'expected step 5\'s own prose to name --refresh nowhere at all — its delta-only enrichment is unconditional, unlike steps 2 and 6, which both gate their skip on --refresh being ABSENT'
  );
});

// ---------------------------------------------------------------------------
// AC-14 / AC-A2 / AC-A3 — Step 6 (Code Connect): skipped when --refresh is
// absent and a prior code-connect.json exists; the protected non-fatal
// sentences survive byte-identical.
// ---------------------------------------------------------------------------

test('AC-14/AC-A2: Step 6 skips get_code_connect_map entirely when --refresh is absent and a prior evidence bundle already contains code-connect.json (any recorded outcome, including unavailable(...)) — records code_connect_skipped: true and reuses the file verbatim', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step6 = sliceBetween(phaseB, '6. **Code Connect', '7. **Persist evidence');
  assert.ok(step6, 'expected to isolate step 6 ("Code Connect") text');
  const collapsed = collapseWs(step6);

  assert.ok(
    collapsed.includes(
      "check whether `--refresh` is ABSENT and a prior evidence bundle already contains `evidence_dir/code-connect.json` — any prior recorded outcome, including a `code_connect: unavailable(<error class>)` marker, counts as already-recorded"
    ),
    'expected the skip check to require --refresh ABSENT and any prior recorded code-connect.json outcome, including unavailable(...)'
  );
  assert.ok(
    collapsed.includes(
      "SKIP this call entirely: reuse the existing `code-connect.json` verbatim as this run's step 6 result (zero calls issued), and record `code_connect_skipped: true` for step 7"
    ),
    'expected the skip branch to reuse the file verbatim, issue zero calls, and record code_connect_skipped: true'
  );
  assert.ok(
    collapsed.includes('record `code_connect_skipped: false` and proceed as follows'),
    'expected the non-skip branch (refresh passed, or no prior file) to record code_connect_skipped: false'
  );
});

test('regression guard (AC-14/AC-A2 adjacency): step 6\'s protected opportunistic/non-fatal sentences survive byte-identical alongside the new skip paragraph — "This call is opportunistic..." through "A Code Connect failure is never fatal to this command."', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step6 = sliceBetween(phaseB, '6. **Code Connect', '7. **Persist evidence');
  assert.ok(step6, 'expected to isolate step 6 text');
  const collapsed = collapseWs(step6);

  assert.ok(
    collapsed.includes(
      "This call is opportunistic — any error (missing Code Connect configuration, permission error, timeout) is recorded as `code_connect: unavailable(<error class>)` in the evidence bundle's header and the run CONTINUES. A Code Connect failure is never fatal to this command."
    ),
    'expected the pre-existing opportunistic/non-fatal sentence pair to survive intact, byte-identical to the base commit, immediately after step 6\'s new skip paragraph'
  );
});

// ---------------------------------------------------------------------------
// AC-14 / AC-A1 / AC-A2 / AC-A3 — Step 7 (Persist evidence): search_skipped,
// candidates_skipped_already_enriched, and code_connect_skipped are all
// recorded with their exact definitions.
// ---------------------------------------------------------------------------

test('AC-14/AC-A1/AC-A2/AC-A3: Step 7 defines search_skipped, candidates_skipped_already_enriched, and code_connect_skipped with their exact recording convention', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7Start = phaseB.indexOf('7. **Persist evidence');
  assert.notEqual(step7Start, -1, 'expected a step 7 ("Persist evidence") heading in Phase B');
  const collapsed = collapseWs(phaseB.slice(step7Start));

  assert.ok(
    collapsed.includes(
      "`search_skipped` — `true` when step 2 reused a prior run's complete library enumeration verbatim (zero `search_design_system` calls issued this run), `false` otherwise"
    ),
    'expected search_skipped to be defined with its true/false recording convention, sourced from step 2'
  );
  assert.ok(
    collapsed.includes(
      "`candidates_skipped_already_enriched` — the count of step 3 candidates step 5 excluded from its delta set because an existing `metadata/<component-key>.json` file from a prior run was reused instead of a fresh `get_metadata` call"
    ),
    'expected candidates_skipped_already_enriched to be defined as the count of step 3 candidates excluded from step 5\'s delta set'
  );
  assert.ok(
    collapsed.includes(
      "`code_connect_skipped` — `true` when step 6 reused a prior run's `code-connect.json` verbatim (zero `get_code_connect_map` calls issued this run), `false` otherwise"
    ),
    'expected code_connect_skipped to be defined with its true/false recording convention, sourced from step 6'
  );
});

// ---------------------------------------------------------------------------
// AC-14 / AC-A3 — The --refresh documentation's accuracy: a plain
// re-invocation skips steps 2, 5 and 6; --refresh re-runs search and Code
// Connect in full while enrichment stays delta-scoped.
// ---------------------------------------------------------------------------

test('AC-14/AC-A3: the --refresh Parse-arguments bullet accurately states a plain re-invocation automatically skips Phase B steps 2, 5, and 6, while --refresh re-runs step 2\'s search and step 6\'s Code Connect in full and step 5\'s enrichment still costs only the delta', () => {
  const content = readRepoFile(COMMAND_PATH);
  const refreshBullet = sliceBetween(content, '- **`--refresh`**', 'No other arguments are accepted.');
  assert.ok(refreshBullet, 'expected to isolate the --refresh Parse-arguments bullet');
  const collapsed = collapseWs(refreshBullet);

  assert.ok(
    collapsed.includes(
      "A plain re-invocation (no `--refresh`) resumes at no extra Figma cost: Phase B steps 2, 5, and 6 all automatically skip Figma calls for work already recorded on disk from a prior run, so retries cost only the delta."
    ),
    'expected the --refresh bullet to state a plain re-invocation automatically skips steps 2, 5, and 6, costing only the delta'
  );
  assert.ok(
    collapsed.includes(
      "`--refresh` deliberately re-runs step 2's search in full (to catch newly-added or newly-removed Figma components) and re-attempts step 6's Code Connect in full (to catch a configuration added or fixed since the last recorded outcome); step 5's enrichment still costs only the delta, enriching only candidates not already covered by an existing metadata file — so `--refresh` costs the full search plus the enrichment delta, never a full re-enrichment."
    ),
    'expected the --refresh bullet to state search and Code Connect re-run in full, while enrichment stays delta-scoped regardless — never claiming --refresh itself "costs only the delta" (a false claim an earlier draft made and code-review caught)'
  );
});

test('AC-14/AC-A3: the frontmatter description states the resume/delta-cost guarantee with the literal phrase "cost only the delta", naming steps 2, 5, and 6 and --refresh\'s full-search-plus-Code-Connect, delta-scoped-enrichment behavior — matching the --refresh Parse-arguments section', () => {
  const content = readRepoFile(COMMAND_PATH);
  const frontmatterEnd = content.indexOf('\n---', 4);
  assert.notEqual(frontmatterEnd, -1, 'expected a closing frontmatter --- delimiter');
  const frontmatter = content.slice(0, frontmatterEnd);

  assert.ok(
    frontmatter.includes(
      'a re-invocation skips already-recorded work in steps 2, 5, and 6 so a retry can cost only the delta, while --refresh re-runs library search and Code Connect in full and still limits get_metadata enrichment to the delta'
    ),
    'expected the frontmatter description to state the resume guarantee accurately, matching the --refresh Parse-arguments section'
  );
});

// ---------------------------------------------------------------------------
// AC-14 / AC-A1 / AC-A2 — The FAILED_FIGMA_QUOTA_EXHAUSTED re-run guidance
// carries the delta-cost promise scoped to a post-search interruption, with
// the mid-search carve-out.
// ---------------------------------------------------------------------------

test('AC-14/AC-A1/AC-A2: the FAILED_FIGMA_QUOTA_EXHAUSTED HALT message scopes its delta-cost re-run promise to an interruption AFTER library search completed, naming steps 2, 5, and 6\'s automatic skip — and carves out a mid-search interruption, which re-searches from the start since search_design_system exposes no resumable cursor', () => {
  const content = readRepoFile(COMMAND_PATH);
  const haltMsg = sliceBetween(content, '> FAILED_FIGMA_QUOTA_EXHAUSTED:', '1. **Quota preflight');
  assert.ok(haltMsg, 'expected to isolate the FAILED_FIGMA_QUOTA_EXHAUSTED blockquote HALT message');
  const collapsed = collapseBlockquote(haltMsg);

  assert.ok(
    collapsed.includes(
      "When the interruption happened after library search completed, re-running `/relay-design-map` once your quota has recovered costs only the delta — Phase B steps 2, 5, and 6 automatically skip work already recorded on disk."
    ),
    'expected the message to scope the delta-cost promise to a post-search interruption, naming steps 2, 5, and 6\'s automatic skip'
  );
  assert.ok(
    collapsed.includes(
      "When the interruption happened during search itself, search re-runs from the start on retry, because `search_design_system` exposes no resumable cursor; `--refresh` is only needed when deliberately re-scanning for new or removed Figma components."
    ),
    'expected the message to carve out a mid-search interruption honestly — search re-runs from the start, since search_design_system exposes no resumable cursor'
  );
});
