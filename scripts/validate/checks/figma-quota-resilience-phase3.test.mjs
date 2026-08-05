// @ts-check
/**
 * Content/structure-invariant tests for Phase 3 ("Quota preflight + named
 * failure") of the figma-quota-resilience PRD — the single-file, prose-only
 * rewrite of `/relay-design-map`
 * (`plugins/relay/commands/relay-design-map.md`) that (a) rewrites P1's
 * HALT message from a reachability claim to the discoverability claim the
 * `ToolSearch` check actually performs, (b) inserts a new `whoami`-based
 * cost preflight into Phase B — a new step 1 ("Quota preflight") that reads
 * the operator's seat/tier when exposed, and a new step 4 ("Cost
 * declaration + confirmation") that estimates the run's `get_metadata` cost
 * from the already-computed pre-match candidate set and, only when the
 * estimate exceeds the seat's documented ceiling, requires an explicit,
 * quoted affirmative reply before spending — mirroring the command's own
 * existing Phase E confirm-then-flip discipline, and (c) adds a new,
 * distinct `FAILED_FIGMA_QUOTA_EXHAUSTED` HALT, detected by error
 * class/string match (never HTTP status), whose message names the scoped
 * scan (Phase 2) as the durable fix, promises no reset time, and states
 * both halves of the seat-upgrade fact — no retry, no backoff.
 *
 * Source PRD: PRPs/prds/figma-quota-resilience.prd.md (PRD AC-4, AC-5, AC-6, AC-7)
 * Source plan: PRPs/plans/completed/figma-quota-resilience-phase-3-quota-preflight-named-failure.plan.md
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED phase 3 plan — the Implementer authored ZERO
 * test-file changes by design (R-X strict; the plan's own `## NOT Building`
 * names "Any `*.test.mjs` file" as explicitly out of the Implementer's
 * scope). This phase's own Task 2 restructuring of Phase B (5 steps -> 7)
 * invalidated six pre-existing assertions in the Phase 2 sibling file
 * (`figma-quota-resilience-phase2.test.mjs`), repaired in this same session
 * as EXISTING_TEST_UPDATED entries (see that file's own docblock addendum
 * and this feature's test-suite-phase3.diff lifecycle ledger) — those
 * repairs are a separate concern from this file, which covers only this
 * phase's OWN new AC-A1..AC-A4 surface.
 *
 * Existing-coverage scan performed before authoring (this session): grepped
 * every scripts/validate/checks/*.test.mjs file (39 files) for `whoami`,
 * `FAILED_FIGMA_QUOTA_EXHAUSTED`, `Quota preflight`, `Cost declaration`,
 * `No Figma MCP server is reachable`, `discoverable in this session`,
 * `get_code_connect_map` (in combination with any quota-HALT rule),
 * `never fatal to this command`, `error class/string`, `HTTP status`,
 * `thousandfold`, and the `seat`/`tier`/`metadata_call_estimate`/
 * `metadata_call_ceiling`/`preflight_confirmed` evidence-bundle fields —
 * zero hits anywhere in the corpus for every one of these. The only file
 * that slices/parses Phase B's own content is the Phase 2 sibling (repaired
 * separately, as noted above); neither `fix-design-system-config-producer.
 * test.mjs` nor `figma-track-phase3.test.mjs` (the two files that otherwise
 * reference `relay-design-map.md`) touch Phase B, the HALT-paths list, or
 * any of this phase's new content. Every AC below is therefore
 * NEW_TEST_REQUIRED.
 *
 * Traceability (plan's own `## Acceptance Criteria` — each plan AC-A<i>
 * names exactly one PRD AC-<i>):
 *
 *   AC-A1 (PRD AC-4, P1 message states what it tested) — the HALT message
 *     states no Figma MCP tools are discoverable in this session; the old
 *     reachability wording is absent.
 *   AC-A2 (PRD AC-5, cost declared before spending) — the whoami preflight
 *     (step 1) and cost-declaration/confirmation gate (step 4); explicit
 *     affirmative required, non-answer/ambiguous treated as do-not-proceed;
 *     decline is non-fatal and continues; missing seat/tier degrades to a
 *     recorded gap; the persist-evidence step (step 7) records seat, tier,
 *     metadata_call_estimate, metadata_call_ceiling, preflight_confirmed.
 *   AC-A3 (PRD AC-6, quota failure is distinct and honest) —
 *     FAILED_FIGMA_QUOTA_EXHAUSTED exists, is distinct from
 *     FAILED_FIGMA_MCP_UNAVAILABLE, appears in the 4-item HALT paths list,
 *     names the scoped scan as the durable fix, promises no reset time, and
 *     carries both halves of the seat-upgrade fact.
 *   AC-A4 (PRD AC-7, no sleeping against day/month buckets) — detection is
 *     by error class/string, never HTTP status; no retry, no backoff.
 *
 * Two additional regression-guard tests cover the contradiction risk
 * code-reviewer flagged during this phase's own review: the quota-HALT rule
 * must name only the two load-bearing calls (search_design_system,
 * get_metadata), never get_code_connect_map, and step 6's "A Code Connect
 * failure is never fatal to this command" sentence (line-wrapped in the
 * source as "never\n   fatal to this command") must survive intact.
 *
 * Run: node --test scripts/validate/checks/figma-quota-resilience-phase3.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-design-map.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * Mirrors the established helper of the same name/shape used throughout
 * this corpus (e.g. figma-quota-resilience-phase1/2.test.mjs).
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
 * figma-quota-resilience-phase2.test.mjs's helper of the same name/shape.
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
 * figma-quota-resilience-phase1/2.test.mjs's helper of the same name/shape.
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
 * individual sentences wrap across `>`-prefixed lines. Mirrors
 * fix-design-system-config-producer.test.mjs's helper of the same
 * name/shape (used there for the analogous FAILED_DESIGN_SYSTEM_CONFIG_INCOMPLETE
 * blockquote).
 * @param {string} str
 * @returns {string}
 */
function collapseBlockquote(str) {
  return str.replace(/^[ \t]*>[ \t]?/gm, '').replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// AC-4 / AC-A1 — Given no Figma MCP tool can be discovered via ToolSearch,
// when P1 fails, then the message states that no Figma MCP tools are
// discoverable in this session — never that no server is reachable.
// ---------------------------------------------------------------------------

test('AC-4/AC-A1: P1\'s HALT message states no Figma MCP tools are discoverable in this session, and the old reachability-framed wording is entirely absent', () => {
  const content = readRepoFile(COMMAND_PATH);

  assert.ok(
    content.includes('FAILED_FIGMA_MCP_UNAVAILABLE: No Figma MCP tools are discoverable in this session.'),
    'expected the P1 HALT message to open with the discoverability-framed claim'
  );
  assert.ok(
    !content.includes('No Figma MCP server is reachable'),
    'expected the old reachability-framed wording to be entirely absent from the file'
  );
});

// ---------------------------------------------------------------------------
// AC-5 / AC-A2 — Given whoami returns a response exposing seat and tier, and
// the scan's estimated get_metadata call cost exceeds the documented
// ceiling for that seat, when the command reaches the preflight, then it
// declares the estimate and the ceiling and requires an explicit
// affirmative reply before issuing any get_metadata call, treating a
// non-answer or ambiguous reply as do-not-proceed. Given whoami's response
// does not expose seat/tier, then the preflight proceeds without the
// declaration and records the degradation rather than halting. The bundle
// records seat, tier, metadata_call_estimate, and metadata_call_ceiling in
// every case.
// ---------------------------------------------------------------------------

test('AC-5/AC-A2: Phase B has a "Quota preflight (whoami probe)" step at position 1 and a "Cost declaration + confirmation" step at position 4', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');

  assert.ok(
    phaseB.includes('1. **Quota preflight (`whoami` probe).**'),
    'expected step 1\'s exact heading to be "Quota preflight (`whoami` probe)."'
  );
  assert.ok(
    phaseB.includes('4. **Cost declaration + confirmation.**'),
    'expected step 4\'s exact heading to be "Cost declaration + confirmation."'
  );
});

test('AC-5/AC-A2: the cost-declaration gate requires an explicit, quoted affirmative reply before any get_metadata call, treating a non-answer or ambiguous reply as do-not-proceed — never inferred consent', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step4 = sliceBetween(phaseB, '4. **Cost declaration', '5. **Node-scoped metadata');
  assert.ok(step4, 'expected to isolate step 4 ("Cost declaration + confirmation") text');
  const collapsed = collapseWs(step4);

  assert.ok(
    collapsed.includes(
      'ask the user for an explicit, quoted affirmative reply before issuing any `get_metadata` call'
    ),
    'expected the gate to require an explicit, quoted affirmative reply before any get_metadata call'
  );
  assert.ok(
    collapsed.includes(
      'a non-answer, an ambiguous reply, or any non-affirmative reply MUST be treated as do-not-proceed, never inferred consent'
    ),
    'expected a non-answer or ambiguous reply to be treated as do-not-proceed, never inferred consent'
  );
});

test('AC-5/AC-A2: on decline or non-affirmative reply, the gate records metadata_calls_made: 0 and enrichment_truncated: true with a reason, and continues to steps 6-7 rather than halting', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step4 = sliceBetween(phaseB, '4. **Cost declaration', '5. **Node-scoped metadata');
  assert.ok(step4, 'expected to isolate step 4 text');
  const collapsed = collapseWs(step4);

  assert.ok(
    collapsed.includes(
      'do NOT proceed to step 5; record `metadata_calls_made: 0`, `enrichment_truncated: true`, reason `"cost-declaration preflight declined by operator"`'
    ),
    'expected the decline branch to record metadata_calls_made: 0 and enrichment_truncated: true with the documented reason string'
  );
  assert.ok(
    collapsed.includes('then continue to steps 6-7 as normal — this is not a HALT'),
    'expected the decline branch to continue rather than halt'
  );
});

test('AC-5/AC-A2: a whoami call that fails, or a response that omits seat and/or tier, degrades to a recorded gap and never halts', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step1 = sliceBetween(phaseB, '1. **Quota preflight', '2. **Library search');
  assert.ok(step1, 'expected to isolate step 1 ("Quota preflight") text');
  const collapsed = collapseWs(step1);

  assert.ok(
    collapsed.includes(
      'record the gap (`seat: unavailable` and/or `tier: unavailable`) and continue; this step never HALTs regardless of what `whoami` returns'
    ),
    'expected a failed or seat/tier-incomplete whoami response to degrade to a recorded gap, and this step to never HALT'
  );
});

test('AC-5/AC-A2: the persist-evidence step (step 7) defines seat, tier, metadata_call_estimate, metadata_call_ceiling, and preflight_confirmed with their exact recording convention', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step7Start = phaseB.indexOf('7. **Persist evidence');
  assert.notEqual(step7Start, -1, 'expected a step 7 ("Persist evidence") heading in Phase B');
  const collapsed = collapseWs(phaseB.slice(step7Start));

  assert.ok(
    collapsed.includes(
      '`seat` — the value read in step 1, or `"unavailable"` when `whoami` did not expose it'
    ),
    'expected seat to be defined with its unavailable-fallback convention, sourced from step 1'
  );
  assert.ok(
    collapsed.includes('`tier` — same convention'),
    'expected tier to follow the same unavailable-fallback convention as seat'
  );
  assert.ok(
    collapsed.includes('`metadata_call_estimate` — the step 4 estimate'),
    'expected metadata_call_estimate to be defined as the step 4 estimate'
  );
  assert.ok(
    collapsed.includes(
      "`metadata_call_ceiling` — the seat's documented ceiling step 4 compared against, or `\"unavailable\"` when seat/tier was undetermined"
    ),
    'expected metadata_call_ceiling to be defined with its own unavailable-fallback convention'
  );
  assert.ok(
    collapsed.includes(
      '`preflight_confirmed` — `true` when the user gave an explicit affirmative reply, `false` when declined, `null` when the confirmation gate was never triggered'
    ),
    'expected preflight_confirmed to record true/false/null keyed to the confirmation-gate outcome'
  );
});

// ---------------------------------------------------------------------------
// AC-6 / AC-A3 — Given a Figma MCP data call fails with a rate-limit error
// class, when the command halts, then the code is
// FAILED_FIGMA_QUOTA_EXHAUSTED, distinct from FAILED_FIGMA_MCP_UNAVAILABLE;
// the message names the scoped scan as the durable fix; it promises no
// reset time; and it carries both halves of the seat-upgrade fact.
// ---------------------------------------------------------------------------

test('AC-6/AC-A3: FAILED_FIGMA_QUOTA_EXHAUSTED exists, is distinct from FAILED_FIGMA_MCP_UNAVAILABLE, and the "HALT paths" list now enumerates exactly 4 named codes including it', () => {
  const content = readRepoFile(COMMAND_PATH);

  assert.ok(content.includes('FAILED_FIGMA_QUOTA_EXHAUSTED'), 'expected FAILED_FIGMA_QUOTA_EXHAUSTED to exist in the file');
  assert.ok(
    content.includes('distinct from `FAILED_FIGMA_MCP_UNAVAILABLE`'),
    'expected FAILED_FIGMA_QUOTA_EXHAUSTED to be stated as explicitly distinct from FAILED_FIGMA_MCP_UNAVAILABLE'
  );

  const haltList = sliceBetween(content, '### HALT paths', 'No artifact is written');
  assert.ok(haltList, 'expected a "### HALT paths" section');
  const bullets = [...haltList.matchAll(/^- `(FAILED_[A-Z_]+)`/gm)].map((m) => m[1]);
  assert.equal(
    bullets.length,
    4,
    `expected exactly 4 named HALT codes in the "HALT paths" list, found ${bullets.length}: ${JSON.stringify(bullets)}`
  );
  assert.ok(
    bullets.includes('FAILED_FIGMA_QUOTA_EXHAUSTED'),
    'expected FAILED_FIGMA_QUOTA_EXHAUSTED to be one of the 4 named HALT codes'
  );
});

test('AC-6/AC-A3: the FAILED_FIGMA_QUOTA_EXHAUSTED HALT message names the scoped scan as the durable fix and promises no reset time', () => {
  const content = readRepoFile(COMMAND_PATH);
  const haltMsg = sliceBetween(content, '> FAILED_FIGMA_QUOTA_EXHAUSTED:', '1. **Quota preflight');
  assert.ok(haltMsg, 'expected to isolate the FAILED_FIGMA_QUOTA_EXHAUSTED blockquote HALT message');
  const collapsed = collapseBlockquote(haltMsg);

  assert.ok(
    collapsed.includes('This message promises no reset time.'),
    'expected the message to explicitly promise no reset time'
  );
  assert.ok(
    collapsed.includes(
      'The scoped scan this command already performs (enumerate -> pre-match -> enrich only candidates, bounded by `max_metadata_calls`) is the durable fix for this failure class.'
    ),
    'expected the message to name the scoped scan (enumerate -> pre-match -> enrich only candidates) as the durable fix'
  );
});

test('AC-6/AC-A3: the FAILED_FIGMA_QUOTA_EXHAUSTED message carries both halves of the seat-upgrade fact — the upgrade multiplies quota roughly a thousandfold, and no Figma seat makes whole-library enrichment viable', () => {
  const content = readRepoFile(COMMAND_PATH);
  const haltMsg = sliceBetween(content, '> FAILED_FIGMA_QUOTA_EXHAUSTED:', '1. **Quota preflight');
  assert.ok(haltMsg, 'expected to isolate the FAILED_FIGMA_QUOTA_EXHAUSTED blockquote HALT message');
  const collapsed = collapseBlockquote(haltMsg);

  assert.ok(
    collapsed.includes(
      'Upgrading from a View/Collab seat to Dev/Full multiplies your MCP call quota roughly a thousandfold (6/month vs. 200-600/day).'
    ),
    'expected the message to state the thousandfold-multiplier half of the seat-upgrade fact'
  );
  assert.ok(
    collapsed.includes('But no Figma seat makes whole-library enrichment viable.'),
    'expected the message to state the no-seat-makes-whole-library-enrichment-viable half of the seat-upgrade fact'
  );
});

// ---------------------------------------------------------------------------
// AC-7 / AC-A4 — Given a quota-class Figma error, when the command
// responds, then it aborts and records; it does not sleep-and-retry.
// Detection is by error class/string, never by HTTP status, because the MCP
// documents neither 429 nor Retry-After.
// ---------------------------------------------------------------------------

test('AC-7/AC-A4: quota-exhaustion detection is stated as error class/string match only — never HTTP status — and no retry/backoff is performed', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const collapsed = collapseWs(phaseB);

  assert.ok(
    collapsed.includes(
      "detection is by error class/string match, never by HTTP status, since Figma's MCP documentation defines neither `429` nor `Retry-After`"
    ),
    'expected the Phase B intro paragraph to state error-class/string detection, never HTTP status, with the documented reason'
  );
  assert.ok(
    collapsed.includes('No retry, no backoff: sleeping is useless against a per-day or per-month bucket.'),
    'expected an explicit no-retry, no-backoff statement with its rationale'
  );
});

// ---------------------------------------------------------------------------
// Regression guards — the contradiction risk code-reviewer flagged during
// this phase's own review: the quota-HALT rule must never widen to cover
// the deliberately opportunistic, never-fatal Code Connect call, and the
// existing Code Connect non-fatal sentence (Phase 2's own guarantee) must
// survive Phase 3's edits intact despite its source line-wrap.
// ---------------------------------------------------------------------------

test('regression guard (AC-A3 boundary): the quota-HALT rule names only the two load-bearing Figma calls (search_design_system, get_metadata) — never get_code_connect_map — and explicitly states the rule does not apply to it', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const collapsed = collapseWs(phaseB);

  const ruleClause = sliceBetween(
    collapsed,
    "Any of this phase's two load-bearing Figma MCP data calls",
    'HALTs immediately'
  );
  assert.ok(ruleClause, 'expected to isolate the load-bearing-calls parenthetical introducing the quota-HALT rule');
  assert.ok(
    ruleClause.includes('(`search_design_system`, `get_metadata`)'),
    'expected the load-bearing-calls parenthetical to name exactly search_design_system and get_metadata'
  );
  assert.ok(
    !ruleClause.includes('get_code_connect_map'),
    'expected the load-bearing-calls parenthetical to never name get_code_connect_map — a load-bearing HALT rule silently absorbing the opportunistic Code Connect call would be a real regression'
  );
  assert.ok(
    collapsed.includes('This rule does NOT apply to `get_code_connect_map` (step 6)'),
    'expected the rule to explicitly state it does not apply to get_code_connect_map (step 6)'
  );
});

test('regression guard (Phase 2 non-fatal guarantee): step 6 (Code Connect) still states "A Code Connect failure is never fatal to this command" — this sentence is line-wrapped in the source and must survive Phase 3\'s edits intact', () => {
  const content = readRepoFile(COMMAND_PATH);
  const phaseB = sliceBetween(content, '## Phase B — Query the Figma library', '## Phase C');
  assert.ok(phaseB, 'expected a Phase B section');
  const step6 = sliceBetween(phaseB, '6. **Code Connect', '7. **Persist evidence');
  assert.ok(step6, 'expected to isolate step 6 ("Code Connect") text');
  const collapsed = collapseWs(step6);

  assert.ok(
    collapsed.includes('A Code Connect failure is never fatal to this command.'),
    'expected step 6 to state the Code Connect non-fatal sentence intact, with its source line-wrap normalized'
  );
});
