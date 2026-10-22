# Feature: Run-time and scoped locators (Phase 3 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the plan vocabulary of `qa-run.mjs`: four new optional locator-step keys `within`, `name_prefix`, `label_text` and `index`, an array form of the `expect_requests` `method`, and a second provenance source for a locator, the report's own words; the plan-time refusal of a locator that has neither source changes code from `STEP_UNGROUNDED` to `PLAN_ENTRY_INVALID`; `OUTCOMES`, `REASON_CATALOGUE`, `USAGE`, `results.json` and `plan.json` shapes are unchanged); a false-pass hazard (a locator resolved at run time from the report's words, and a group-scoped absence, must never assert more than the page shows); an existing command doc, a knowledge-base page and site pages amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the script and the command doc (`documentation/AGENTS.md` applies); existing tests that assert the old grounding-snapshot-only rule go stale and are routed to the test pair; no new network- or store-touching site (the `auth-local-guard-sites` call sites are untouched); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` Architecture Notes "Run-time grounding keeps the provenance rule": a locator is valid when its words come from the report or from a snapshot entry with `matches` 1; run-time resolution still demands exactly one match; scope is a chained locator, never `locator.within()` (which needs Playwright 1.64)
  - Same PRD, Architecture Notes "Label-text locator is a deterministic algorithm": from the single element whose visible text equals the label, walk up to the nearest ancestor that contains exactly one `input`, `textarea` or `select`; that control is the target, else `STEP_UNGROUNDED`; no layout pseudo-classes
  - Same PRD, Decisions Log "Group scope" (chained locators, because the dogfood resolved Playwright 1.61.1), "Unlabeled inputs" (text-anchored nearest-container algorithm, not layout pseudo-classes or planner-written CSS) and "Reports" (byte-identical, so the new rule changes how the runner reads a page, never what the report says)
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the plan-side-only boundary, the single write helper, and `/relay-qa-report` unchanged
  - `docs/decisions.md` [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is a closed set, a runner pass is evidence and not approval, secrets never reach reports, the local-only guard is permanent
  - `docs/decisions.md` [2026-04-19] "Secret redaction policy for Test Runner reports": unchanged; every new reason is a fixed sentence that carries no locator word, and the comparison evidence of a scoped `expect_value` holds plan words only, never the value
  - `docs/decisions.md` [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`": no new resource file is added
  - `docs/decisions.md` [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the auto-correction loop turn green": eighteen existing tests assert the old rule and go stale by design (see `## Notes`); they are routed to the test pair as `EXISTING_TEST_UPDATED`, never edited by the Implementer, and the corpus gate allowlists exactly those
  - "Emitting secret values in run reports or logs": a scoped locator never echoes its words in a reason, the `expect_value` evidence record holds the plan's own locator words and never the compared value, and the label walk reads structure, not typed values
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays non-interactive and standalone
- Applicable architectural rules:
  - Interactivity boundary: no new extension; `/relay-qa-run` stays non-interactive and standalone
  - Command versus script separation: the command doc teaches the planner the new keys and the script validates, resolves and records them; `writeEvidence` and `writeRunFile` are not edited and no second writer is added
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`); this phase adds no such site
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`, and `evidence/` is ignored there
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD`; this phase's base is the phase-2 end-state tree object
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased` (sections 7.3, 7.4 and 9); NAV and the search index change only when a page is added, renamed or removed, and no page is added here; the version bump and the release heading belong to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks: `qa-run-contract` is not extended in this phase (its generic marked-example rule already validates every new example against the script), and none is added
  - `qa-run-contract` source-text invariants stay true: `writeFileSync(` and `renameSync(` exactly once each, `// GUARD-SITE` and `// WRITE-SITE` exactly once each, no outcome literal outside the four values, `spawnSync(process.execPath` exactly once, the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` and `export function mintExpiryDue(` each exactly once, the literals `'expect_value'`, `'expect_not_visible'` and `'expect_state'` inside the locator step, and `interactionHistory(` and `isPostInteractionSnapshot(` inside the section that runs from `export function precheckGroundedSteps(` to `export function summarizeEntries(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 3: "Run-time and scoped locators" — Goal: recover the steps lost to unnamed inputs, unnamed repeated controls, post-save states, group scope and live counts — Success signal: fixtures for each form pass and their ambiguous variants end `STEP_UNGROUNDED`.

## Summary

This phase lets `/relay-qa-run` plan and execute the locator steps that the grounding snapshot cannot list, without weakening "no false pass". Four things change in `plugins/relay/scripts/qa-run.mjs`. (1) A locator step is now valid on either of two sources: a snapshot entry with `matches` exactly 1 (as before) or the report's own words (its `name` or `text` appears in the case's manual steps, compared after whitespace collapse and ignoring case); a locator with neither is refused `PLAN_ENTRY_INVALID`, and a step valid only through the report's words is resolved when the case runs, ending the case `needs-human` `STEP_UNGROUNDED` on zero or several matches (a step grounded by a snapshot entry keeps today's outcomes). The plan-time check becomes `groundLocators`, which also returns which steps are left to run time, and `precheckGroundedSteps` stays as a thin wrapper with its signature and result shape. (2) Four optional keys reshape a locator and are always resolved when the case runs: `within` (a `role` plus `name` or `name_prefix` scope, chained, never `locator.within()`), `name_prefix` (an accessible name matched by its start, for a header whose name embeds a live count), `label_text` (an input whose label is not associated with it, found from the one element whose visible text equals the label by walking up to the nearest ancestor that holds exactly one `input`, `textarea` or `select`) and `index` (the zero-based Nth element of a `role` inside a `within` scope, so unnamed repeated controls can be reached). `locatorOf` returns an extended `scoped` descriptor for a step that carries any of them and exactly what it returned before for every other step; `buildLocator` builds the Playwright locator and `runLocatorStep` resolves it, applying the exactly-one rule to the scope and the label element too, and refusing a group-scoped absence whose scope is missing or hidden (such an absence would assert nothing). (3) `expect_requests` accepts `method` as an array of distinct method names and counts a request whose method is any member. (4) The command doc gains the paragraphs and four marked literal examples (`within`, `name_prefix`, `label_text`, `index`) that PRD AC-22 requires for the keys this phase adds, and the knowledge-base and site pages that state the old snapshot-only rule move with it, with an `Unreleased` changelog entry. **Hand-off to Phase 5:** the clause of PRD AC-5 that a `judge` step with a locator scope also writes an element screenshot was deferred by Phase 2 because `within` did not exist; this phase supplies `within` and exports `scopeOf` (validates a `within` object), `scopeLocator` and `resolveScopeElement` (resolve a scope to its one element), so Phase 5 can hand that element to the existing `captureElementPng` without re-implementing scope resolution. This phase adds no `judge` step and wires `captureElementPng` to no step. The change makes eighteen existing tests stale (they assert the old rule); they are listed in `## Notes`, allowlisted in the corpus gate and routed to the test pair, and no task touches a test file.

## User Story

As the operator of relay's human validation gate
I want the runner to execute a report step whose element the snapshot cannot list (an unlabeled input, an unnamed repeated button, a name with a live count, an element inside one group) and to end the case with a named gap when it cannot resolve that element to exactly one
So that fewer steps land on me at the gate, and a locator that matches the wrong control or nothing never earns a pass

## Problem Statement

`/relay-qa-run` 0.46.0 plans a locator step only from a snapshot entry that matches exactly one element, so every element the accessibility snapshot cannot name uniquely costs its steps: inputs with no accessible name (`InputIcon`, KD-8) 6 steps, unnamed avatar buttons and an unstated HTTP method (KD-11) 5 steps, a post-save state that cannot be grounded without saving at plan time (KD-12) 8 steps, and a group-scoped absence and a collapse state behind a live-count name (KD-17) 3 steps, plus case 20's search half. Most of those elements are perfectly addressable from what the report already says (its own words), from the structure of the page (a group, a label, a position), or from a prefix of a name, and an `expect_requests` step whose HTTP method the report leaves open (a save that is a POST, a PATCH or a PUT) cannot be written at all.

## Solution Statement

Runner, doc and documentation only; the outcome vocabulary, the reason-code catalogue, `results.json` and the validate checks are untouched. (1) Parsing: `locatorOf` delegates a step that carries `within`, `name_prefix`, `label_text` or `index` to `scopedLocatorOf`, a pure and total parser whose refusals name keys, never values; `stepRules` accepts the valid combinations (control forms only for `expect_value` and `expect_state`, no `label_text` for `expect_text` or `expect_not_visible`) and `expect_requests` accepts a method array. (2) Provenance: `groundLocators` accepts a locator when its snapshot entry matches exactly one element or its words are in the report, refuses the rest `PLAN_ENTRY_INVALID` with the sentences it always had, and returns the indexes of the steps resolved at run time; `executeCase` hands them to the browser driver as `runtime_steps`. (3) Resolution: `buildLocator` builds the target and the guard locators (scope, label element) and `runLocatorStep` requires each guard to match exactly one element, checks an `index` against the number of matches in its scope, ends a run-time-resolved step with zero matches `needs-human` `STEP_UNGROUNDED`, and keeps every earlier outcome for a snapshot-grounded step. (4) Doc: a block of paragraphs with four marked examples before "Grounding rules.", the old-rule sentences reworded, and the same facts in the knowledge base, the two site pages and the changelog.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/domain/flows.md`; `documentation/reference/commands.html`; `documentation/reference/scripts.html`; `documentation/changelog.html` |
| Dependencies | none new (row 3 of 9; `Depends` is `1, 2`, both `complete`; shares `lane:qa-run` with phases 1 to 7, so it runs serially after phase 2); Node built-ins and the Playwright 1.61.1 already resolved from the repository, no new package, no sibling import |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 90-94 (AC-6 to AC-10), 106 (AC-22), 108 (AC-24), 181-182 (run-time grounding and the label algorithm), 207 (row 3), 227-230 (Phase 3 details), 274-275 (unlabeled inputs, group scope) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 90-94, 106, 108, 181-182, 207, 227-230, 274-275 | AC-6 to AC-10, AC-22 and AC-24, the provenance rule, the label algorithm, the row and the Phase 3 scope this plan implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1096-1133 | `LOCATOR_ACTIONS`, `LOCATOR_ROLES` and `locatorOf`: the parser Task 1 extends and whose output for every plain step must not change |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1190-1308, 1337-1392 | `stepRules` (the per-step rules Task 1 edits, including the `expect_requests` method check), `validateStep` and `validateSteps` (the anchor rule that scoped steps inherit unchanged) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1756-1775 | `evaluateRequestWindow`: the method comparison Task 1 widens |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1812-1877 | `precheckGroundedSteps`: the snapshot-only provenance rule Task 2 replaces; keep its sentences and its section tokens |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2333-2337, 2363-2372 | `writeEvidence` (READ-ONLY, its first body line is a test mutation anchor) and `captureElementPng`, after which Task 3 inserts the resolution helpers |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2623-2720 | `runLocatorStep`: the guards, the zero-match rule and the literals Task 3 edits around |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2722-2779, 2840-2883, 2891-2904 | the browser driver: the locator branch, the value masks and comparison evidence, the `expect_requests` evidence and the final capture that stay as they are |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3757-3760, 3821 | `executeCase`: the plan-time call Task 2 replaces and the driver call that receives `runtime_steps` |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1613-1650, 4163-4181, 4207-4216 | `isVisibleToPerson` and `requireVisibleToPerson` (reached by every positive branch, READ-ONLY), `groundingStepKey` (Task 1 returns null for a scoped step) and `interactionHistory` |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 237-261, 279-295, 337-387, 563-585, 742-752 | the role-and-name paragraphs, the `expect_not_visible` paragraph, the `expect_requests` and grounding paragraphs, the reason-code table and the two honesty bullets Task 4 edits |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 421-437, 470-476, 512-519, 665-676, 749-762 | READ-ONLY: the section pins and the behaviour pins (`precheckGroundedSteps` called with an empty report) that the edits must keep true, and the rule that validates each marked example alone |
| P1 | `scripts/validate/checks/qa-run-vocabulary-pins.test.mjs` | 307-343 | READ-ONLY (R-X): the first-match example picks, the paragraph starts and the pinned phrases of the `expect_not_visible` paragraph and the honesty bullets |
| P1 | `scripts/validate/checks/qa-run-network-docs.test.mjs` | 84-149, 170-196 | READ-ONLY (R-X): exactly one marked `expect_requests` example, the shape paragraph phrases and its first parenthesis, paragraph order and the honesty-bullet adjacency |
| P1 | `scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs` | 341-343, 364-388 | READ-ONLY (R-X): the "Elements that only appear after an interaction" sentence that must stay verbatim, and the pinned last sentence of the `expect_not_visible` paragraph that Task 4 rewords (the one doc-pin test that goes stale) |
| P1 | `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | 273-340, 504-546, 719-739 | READ-ONLY (R-X): `MANUAL` and the refusal table whose expectations go stale, and the first-example picks and the `matches` regex of the doc tests |
| P1 | `scripts/validate/checks/qa-run-release-pages.test.mjs` | 85-100, 387-408, 445-497, 526-541 | READ-ONLY (R-X): `htmlText`, the sentence splitter and the pinned phrases of the `commands.html`, `scripts.html` and API-reference rows |
| P0 | `docs/api-reference.md` | 129 | the single-line `/relay-qa-run` row (the old-rule sentence and the `expect_requests` sentence) |
| P0 | `docs/domain/glossary.md` | 306-339, 395-413, 450-469 | the "QA assertion actions", "QA grounding snapshot" and "QA observed-request window" paragraphs |
| P0 | `docs/domain/flows.md` | 196-215, 246-269 | the numbered item that states the old grounding rule and the `expect_requests` rule |
| P0 | `documentation/reference/commands.html` | 349, 355 | the `Notes` row sentence on UI grounding and the `Step vocabulary` row |
| P0 | `documentation/reference/scripts.html` | 217, 222 | the `UI grounding` and `Assertions and request count` rows |
| P0 | `documentation/changelog.html` | 31-73 | the `Unreleased` block that Task 7 extends |
| P0 | `documentation/AGENTS.md` | 239-284, 318-330, 400-406 | the registration rule (NAV and the search index change only when a page is added or renamed), the `Unreleased` entry rule (7.3, 7.4) and the modify-an-existing-page checklist (section 9) that Tasks 6 and 7 follow |
| P2 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-2-visibility-and-evidence.plan.md` | 499-575, 843-896 | READ-ONLY: the real-runner loopback gate shape and the TAP corpus-gate parser this plan adapts |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1116-1133
export function locatorOf(step) {
  if (!isObj(step)) return null;
  const hasRole = step.role !== undefined;
  const hasName = step.name !== undefined;
  const hasText = step.text !== undefined;
  if (!hasRole && !hasName && !hasText) return null;
  if (step.selector !== undefined || (hasText && (hasRole || hasName))) {
    return { ok: false, why: 'a step names one locator form: selector, role and name, or text' };
  }
  if (hasText) {
    if (!isStr(step.text) || step.text.trim() === '') return { ok: false, why: 'text must be a non-empty string' };
    return { ok: true, form: 'text', text: step.text };
  }
  if (hasRole !== hasName) return { ok: false, why: 'role and name go together' };
  if (!isStr(step.role) || !LOCATOR_ROLES.includes(step.role)) return { ok: false, why: 'role must be one of the supported roles' };
  if (!isStr(step.name) || step.name.trim() === '') return { ok: false, why: 'name must be a non-empty string' };
  return { ok: true, form: 'role', role: step.role, name: step.name };
}
```
Copied by Task 1 (the shape of a pure, total parser that returns `{ ok: false, why }` with a fixed sentence and never throws; `scopedLocatorOf` follows it, and `locatorOf` keeps these lines byte-identical below one new early-return line).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1242-1261
    const loc = LOCATOR_ACTIONS.includes(s.action) ? locatorOf(s) : null;
    if (loc !== null) {
      if (!loc.ok) return bad(`${s.action}: ${loc.why}`);
      if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');
      if (s.action === 'expect_text' && !isStr(s.contains)) return bad('expect_text needs a string contains');
      if (s.action === 'expect_value') {
        if (loc.form !== 'role') return bad('expect_value needs a role and a name');
        const comparisons = [s.equals, s.contains, s.not_empty].filter((v) => v !== undefined).length;
        if (comparisons !== 1) return bad('expect_value needs exactly one of equals, contains or not_empty');
        if (s.equals !== undefined && !isStr(s.equals)) return bad('expect_value equals must be a string');
        if (s.contains !== undefined && !(isStr(s.contains) && s.contains !== '')) return bad('expect_value contains must be a non-empty string');
        if (s.not_empty !== undefined && s.not_empty !== true) return bad('expect_value not_empty must be true');
      }
      if (s.action === 'expect_state') {
        if (loc.form !== 'role') return bad('expect_state needs a role and a name');
        if (!EXPECT_STATES.includes(s.state)) return bad('expect_state state must be one of expanded, disabled, checked');
        if (typeof s.equals !== 'boolean') return bad('expect_state needs a boolean equals');
      }
      return { expectations: POSITIVE_ASSERTION_ACTIONS.includes(s.action) || s.action === 'expect_not_visible' ? 1 : 0 };
    }
```
Copied by Task 1 (the two `loc.form !== 'role'` checks become `!isControlLocator(loc)`, one early refusal is added after the `!loc.ok` line, and everything else stays byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1289-1293
      case 'expect_requests': {
        if (Object.keys(s).some((k) => !['action', 'method', 'url_contains', 'count'].includes(k))) {
          return bad('expect_requests takes only method, url_contains and count');
        }
        if (!HTTP_METHODS.includes(s.method)) return bad('expect_requests method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
```
Copied by Task 1 (the closed key set stays; only the method check changes, and it must stay total on hostile values).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1766-1767
  const method = isObj(step) ? step.method : undefined;
  const matching = needle === null ? [] : entries.filter((e) => isObj(e) && e.method === method && isStr(e.path) && e.path.includes(needle));
```
Copied by Task 1 (the comparison becomes a membership test over a one-element list for a string method and over the array for an array method).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1832-1853
    // The snapshot is the one taken after exactly the case's own goto, click and fill steps before this
    // step when such a post-interaction snapshot exists; otherwise the first plain snapshot of the role
    // and route (a plain lookup never returns a post-interaction file, whatever the file order).
    const candidates = route === null ? [] : snapshots.filter((s) => isObj(s) && s.role === wantRole && s.route === route);
    const hist = interactionHistory(steps, i);
    const histKey = hist.some((h) => h.step.action !== 'goto') ? groundingPrefixKey(hist.map((h) => h.norm)) : null;
    const after = histKey === null ? undefined : candidates.find((s) => isPostInteractionSnapshot(s) && groundingPrefixKey(s.prefix) === histKey);
    const snap = after ?? candidates.find((s) => !isPostInteractionSnapshot(s));
    if (snap === undefined) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step` };
    }
    const entry = (Array.isArray(snap.entries) ? snap.entries : []).find((/** @type {any} */ e) =>
      isObj(e) && (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
    if (entry === undefined) {
      const hint = after === undefined && candidates.some((s) => isPostInteractionSnapshot(s))
        ? '; a post-interaction snapshot exists for this role and route, but the steps of this case before this one are not exactly its prefix'
        : '';
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator is not a snapshot entry${hint}` };
    }
    if (entry.matches !== 1) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator matched ${entry.matches} elements in the snapshot; a locator must match exactly one` };
    }
```
Copied by Task 2 (the snapshot selection and the three refusal sentences move into `groundLocators` byte-identical; only the code of the refusal becomes `PLAN_ENTRY_INVALID`, and a refusal now applies only when the report's words do not ground the step).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2635-2659
async function runLocatorStep(page, step, loc, n, recordComparison) {
  const target = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });
  if (step.action === 'expect_not_visible') {
    // An absence is decided on the live page, with no wait for the element to attach: a locator that
    // matches nothing is hidden. The anchor rule of validateSteps is what keeps that from being vacuous.
    const present = await target.count().catch(() => 0);
    if (present > 1) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${present} elements at run time; a locator must match exactly one, so nothing was asserted`);
    }
    const hidden = await settleAssertion(async () => !(await isVisibleToPerson(target)), (isHidden) => isHidden === true);
    if (hidden.status === 'accepted') return null;
    if (hidden.status === 'rejected') return { outcome: 'fail', reason_code: null, reason: `step ${n}: the element was still visible`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the visibility of the target could not be read; nothing was asserted`);
  }
  // The wait only gives the page time to render; the decision is the count.
  await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await target.count().catch(() => 0);
  if (count > 1) {
    return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on`);
  }
  const expects = POSITIVE_ASSERTION_ACTIONS.includes(step.action);
  if (count === 0) {
    if (expects) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not found`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
  }
```
Copied by Task 3 (the first line becomes `buildLocator`, guards and the index check go before the absence branch, and the `count === 0` branch gains one early return for a run-time-resolved step; every other line stays byte-identical, including the three quoted action literals the contract check requires).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2759-2779
      const lstep = LOCATOR_ACTIONS.includes(step.action) ? locatorOf(step) : null;
      if (lstep !== null && lstep.ok) {
        if (step.action === 'expect_value' && lstep.form === 'role') valueMasks.push(page.getByRole(lstep.role, { name: lstep.name, exact: true }));
        // The comparison evidence holds the action, the step position, the locator already in the plan, the
        // closed comparison word and passed or failed: never the value, its length or the expected string.
        const lr = await runLocatorStep(page, step, lstep, n, (kind, passed) => {
          if (lstep.form !== 'role') return;
          queryEvidence.set(
            i,
            writeEvidence(ctx, `case-${kase.index}.value-${n}.json`, {
              kind: 'json',
              value: { action: 'expect_value', step: n, locator: { role: lstep.role, name: lstep.name }, comparison: kind, result: passed ? 'passed' : 'failed' },
            }),
          );
        });
        if (lr !== null) {
          verdict = lr;
          break;
        }
        continue;
      }
```
Copied by Task 3 (the mask comes from `buildLocator(...).target` for any control locator, the evidence `locator` of a scoped step is the plan's own locator keys, and the call passes whether the step is resolved at run time).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3757-3760
  if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null)) {
    const grounded = precheckGroundedSteps(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role);
    if (grounded !== null) return out(needsHuman(grounded.code, grounded.reason));
  }
```
Copied by Task 2 (the call becomes `groundLocators`, its `refusal` is returned as before and its `runtime` list is kept for the driver call).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2363-2372
/**
 * A screenshot of one located element with the given masks. Reusable by a step that scopes its evidence to a
 * locator; no step uses it yet. Like the final capture it returns bytes and writes nothing.
 * @param {any} target a Playwright locator
 * @param {any[]} masks
 * @returns {Promise<Buffer>}
 */
export function captureElementPng(target, masks) {
  return target.screenshot({ mask: masks, timeout: CAPTURE_TIMEOUT_MS });
}
```
Read by Task 3 and NOT edited: the resolution helpers are inserted directly after this function, they return locators and never write, and `resolveScopeElement(...).locator` is exactly what Phase 5 passes to it.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:4163-4175
export function groundingStepKey(step) {
  if (!isObj(step)) return null;
  if (step.action === 'goto') return isStr(step.path) ? { action: 'goto', path: step.path } : null;
  if (step.action !== 'click' && step.action !== 'fill') return null;
  const loc = locatorOf(step);
  if (loc === null || !loc.ok) return null;
  /** @type {any} */ const norm = { action: step.action };
  if (loc.form === 'role') {
    norm.role = loc.role;
    norm.name = loc.name;
  } else {
    norm.text = loc.text;
  }
```
Copied by Task 1 (one line is added after the `!loc.ok` check: a scoped step is not keyable, exactly like a `selector` step, because a post-interaction snapshot cannot have recorded it and its key would otherwise collapse into the plain key of another step).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:237-249
A literal `browser` step that names its target by role and name instead of a selector:

<!-- qa-step-example driver=browser -->
```json
{ "action": "click", "role": "button", "name": "Save" }
```

A literal `browser` step that names its target by visible text:

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_visible", "text": "Welcome back" }
```
```
Copied by Task 4 (the register of a marked example: one introducing line ending in a colon, the marker with no trailing space, a `json` fence and a flat one-line object; the four new examples follow it, and they are placed after the existing ones so that the tests that pick the first matching example keep picking the old ones).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:286-295
`expect_not_visible` takes `role` and `name`, or `text`. It passes only when the grounded
locator is hidden or absent, re-checked for up to 5 seconds. It is valid only after a
positive step on the same route in the same case: an `expect_visible`, `expect_text`,
`expect_value` or `expect_state` step since the last `goto`. Otherwise the entry is
`PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, because an
absence step alone would pass on a page that never rendered. A `click` that navigates to
another page does not reset that anchor, so follow a navigating `click` with an `expect_url`
of the new path and a positive step on the page it lands on before any `expect_not_visible`.
The element must be one the snapshot of that page state already lists: the plain snapshot,
or the one a `--prefix` ground wrote after the interactions of the case.
```
Copied by Task 4 (only the last sentence is reworded; the two phrases pinned in this paragraph, `positive step on the same route in the same case` and `before anything is seeded, authenticated or requested`, stay).

```
# SOURCE: docs/domain/glossary.md:311-314
grounded locator form (`role` plus `name`, and for `expect_not_visible` also
`text`; never a `selector`), counts as one expectation and is planned only from
a `ground` snapshot entry whose `matches` is exactly 1, with the expected value
or state taken from the report's own steps and never from the snapshot.
```
Copied by Task 5 (the glossary register: backticked identifiers, wrapped near 80 columns; the clause "is planned only from a `ground` snapshot entry" is the one reworded).

```
# SOURCE: docs/domain/flows.md:196-198
   keeps the role's session. Three browser steps take a grounded `role` plus
   `name`, are planned only from a snapshot entry that matches exactly one
   element, and take the expected value or state from the report's own steps:
```
Copied by Task 5 (the numbered-list item keeps its 3-space indent on every line; the clause "are planned only from a snapshot entry that matches exactly one element" is the one reworded).

```
# SOURCE: documentation/reference/commands.html:355 (excerpt of the single-line <dd> of the Step vocabulary row)
retried once as a viewport-only capture if the full-page capture fails. <code>expect_requests</code> counts the requests the page issues: a <code>method</code>, a <code>url_contains</code> path of at most 200 characters and a <code>count</code> from 0 to 100
```
Copied by Task 6 (a new sentence goes between `fails.` and `<code>expect_requests</code>`, and the text after `a <code>method</code>` gains the array clause; the pinned contiguous phrase `a url_contains path of at most 200 characters and a count from 0 to 100` and the closing parenthesis `(5 seconds, 2 seconds, 100, 50 and 200) are chosen, not measured` are untouched).

```
# SOURCE: documentation/reference/scripts.html:222 (excerpt of the single-line <dd> of the Assertions and request count row)
and no step uses it yet. <code>expect_requests</code> waits <code>EXPECT_REQUESTS_SETTLE_MS</code> (2000), accepts a <code>count</code> of at most
```
Copied by Task 6 (the new sentence goes after `no step uses it yet.`, and the clause `takes a <code>method</code> or an array of methods,` goes between `(2000),` and `accepts`; every constant the row names keeps its stated value).

```
# SOURCE: documentation/changelog.html:61-73
        <li><strong>Reference pages</strong> &mdash; the <code>/relay-qa-run</code> entry of the commands reference and
          the <code>qa-run-contract</code> section of the validation checks reference state the twelve codes, the two
          classes and the counters.</li>
        <li><strong>Visibility means visible to a person</strong> &mdash; <code>expect_visible</code> and
          <code>expect_text</code> now fail, and <code>expect_not_visible</code> passes, on an element at
          <code>opacity: 0</code>, under an ancestor at <code>opacity: 0</code> or at <code>visibility: hidden</code>:
          the runner combines Playwright&rsquo;s visibility check, which counts such an element as visible, with the
          browser&rsquo;s <code>checkVisibility</code>. A closed modal that stays in the page can no longer pass a
          positive step.</li>
        <li><strong>Full-page final capture</strong> &mdash; the final screenshot of a browser case now covers the whole
          page, with the same password and <code>expect_value</code> masks, so content below the fold is part of the
          evidence; if the full-page capture fails the runner takes the viewport capture once instead.</li>
      </ul>
```
Copied by Task 7 (the shape of a `Changed` entry and of the closing list tag; an `Added` entry follows the shape of lines 43-46; no id is added).

```
# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:312-319
function runRunner(root) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(NODE, [REAL_RUNNER, 'run', '--root', root, '--feature', FEATURE, '--run-dir', RUN_REL], {
      cwd: root,
      env: { ...process.env, ...GIT_ENV },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
```
Copied by Task 3 (the end-to-end gate spawns the REAL runner by absolute path with a temp root as `cwd` and a hermetic git environment; Playwright resolves by directory walk from the runner's own folder, so no `NODE_PATH` is needed).

```
# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:438-447
  const block = (/** @type {number} */ n, /** @type {typeof defs[number]} */ d) =>
    [`### Case ${n}`, `**Title:** ${d.title}`, '**Risk level:** low', `**Required state:** ${d.state ?? 'None'}`, '**Coverage:** none', '**Automated test path:** n/a', '**Manual status:** pending', '**Manual step-by-step:**', ...d.manual, ''].join('\n');
  writeFileSync(join(root, 'PRPs', 'reports', FEATURE, 'qa-report.md'), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join('\n')}\n## Notes\n\nnone\n`);
  writeFileSync(
    join(runDir, 'plan.json'),
    JSON.stringify({
      schema_version: 1,
      cases: defs.map((d, i) => ({ index: i + 1, title: d.title, driver: 'browser', role: null, state: d.state === undefined ? 'none' : 'declared', steps: d.steps })),
    }),
  );
```
Copied by Task 3 (the report and plan shapes of an anonymous browser case; a locator word is valid when it appears in these manual lines, which is exactly what the gate exercises).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the vocabulary (`SCOPED_LOCATOR_KEYS`, `scopeOf`, `scopedLocatorOf`, `isControlLocator`, the `stepRules` and `expect_requests` edits), the provenance (`groundLocators`, the `precheckGroundedSteps` wrapper, the `executeCase` plumbing), the resolution (`LABEL_CONTAINER_XPATH`, `scopeLocator`, `buildLocator`, `resolveScopeElement`, the `runLocatorStep` and browser-driver edits) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the block of paragraphs and four marked examples before "Grounding rules.", the reworded old-rule sentences, the method-array paragraph, the reason-table row and two honesty bullets |
| `docs/api-reference.md` | UPDATE | the `/relay-qa-run` row: the locator-validity sentence and the `expect_requests` sentence |
| `docs/domain/glossary.md` | UPDATE | one reworded clause and one new paragraph in "QA assertion actions", one clause in "QA grounding snapshot", one clause in "QA observed-request window" |
| `docs/domain/flows.md` | UPDATE | the numbered item that states the grounding rule: one reworded clause, one added passage and the `expect_requests` method clause |
| `documentation/reference/commands.html` | UPDATE | the `Notes` row sentence on UI grounding and the `Step vocabulary` row (existing site tests read these rows against the script and the command doc) |
| `documentation/reference/scripts.html` | UPDATE | the `UI grounding` row sentence and the `Assertions and request count` row (new helper names, the method array) |
| `documentation/changelog.html` | UPDATE | one `Added` and one `Changed` entry under `Unreleased`, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- The `judge` step, its element screenshot, the `judge` mode and the pending state (Phase 5); this phase exports the scope helpers Phase 5 reuses and wires `captureElementPng` to no step, introduces no evidence file name for an element capture and adds no `judge` handling.
- `chosen_inputs`, `effect: write` and dedicated roles, and the seed-capture guidance (Phase 4); channel sources and `read_message` (Phase 6); `preflight`, kit staleness, the record flag and fresh-cache dependencies (Phase 7); the release cut (Phase 8) and the dogfood (Phase 9).
- Any change to `parseGroundPrefix`, `replayGroundingPrefix`, the `ground` mode or the snapshot file shape: a snapshot still lists page-wide candidates only, a prefix step still refuses the new keys, and a scoped step is never a snapshot entry.
- `locator.within()` (needs Playwright 1.64; the repository resolves 1.61.1), the deprecated layout selectors (`:right-of`, `:near`) and any planner-written CSS or XPath. The two selector strings the runner builds itself (the label container XPath and the control CSS) are fixed constants, never planner text.
- A new step, a new reason code, a new outcome, a `results.json` field or a change to `OUTCOMES`, `REASON_CATALOGUE`, the catalogue `reason` of `STEP_UNGROUNDED` or `USAGE`. The `judge` and `preflight` clauses of PRD AC-22 belong to Phases 5 and 7.
- Any change to `settleAssertion`, `isVisibleToPerson`, `requireVisibleToPerson`, `writeEvidence`, `writeRunFile`, `captureFinalPng`, `captureElementPng`, `ASSERT_SETTLE_MS`, `ASSERT_POLL_INTERVAL_MS` or `POSITIVE_ASSERTION_ACTIONS`, and any new static or dynamic `import`.
- A new source-text pin or any edit of `scripts/validate/checks/qa-run-contract.mjs` or of `documentation/reference/validation-checks.html`: the generic rule already validates every marked example against `validateStep`, and the existence of one marked example per new key is covered by a test the test pair authors. No validate check is added or extended; the count stays 28.
- The "Grounding browser steps." section of the command doc, the honesty bullets other than the two named in Task 4, the `qa-run.mjs` row of `docs/api-reference.md` (a release test requires every backticked name between `REASON_CATALOGUE` and `USAGE` to be an export; the Phase 8 release cut refreshes that row), `docs/decisions.md`, NAV (`assets/js/app.js`), the search index and the plugin version.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; the new tests and every update to a stale existing test are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the vocabulary: scoped locator keys, control locators and method sets (parsing and validation only)

- **ACTION**: Delivers the validation half of AC-A2, AC-A3 and AC-A4, and all of AC-A5. Make exactly these edits in `plugins/relay/scripts/qa-run.mjs`; nothing in the runner resolves or runs a scoped step yet.
  1. Directly above the JSDoc of `locatorOf` (line 1110) add the constant, the scope parser, the scoped parser and the control predicate. `locatorOf` itself is edited in item 2; keep its other lines byte-identical.
     ```js
     /** The optional step keys that scope or reshape a locator; a step that carries any of them is a scoped locator step. */
     export const SCOPED_LOCATOR_KEYS = Object.freeze(['within', 'name_prefix', 'label_text', 'index']);

     /**
      * Validates the `within` object of a step: a supported `role` and exactly one of `name` or `name_prefix`, both
      * non-empty strings. Pure and total: it never throws and a reason names keys, never a value.
      * @param {any} within
      * @returns {{ ok: true, scope: { role: string, name?: string, namePrefix?: string } } | { ok: false, why: string }}
      */
     export function scopeOf(within) {
       if (!isObj(within) || Object.keys(within).some((k) => !['role', 'name', 'name_prefix'].includes(k))) {
         return { ok: false, why: 'within takes only a role and a name or name_prefix' };
       }
       if (!isStr(within.role) || !LOCATOR_ROLES.includes(within.role)) return { ok: false, why: 'within role must be one of the supported roles' };
       if ((within.name === undefined) === (within.name_prefix === undefined)) return { ok: false, why: 'within takes exactly one of name or name_prefix' };
       const label = within.name !== undefined ? within.name : within.name_prefix;
       if (!isStr(label) || label.trim() === '') return { ok: false, why: 'within name must be a non-empty string' };
       return { ok: true, scope: within.name !== undefined ? { role: within.role, name: within.name } : { role: within.role, namePrefix: within.name_prefix } };
     }

     /**
      * The locator form of a step that carries `within`, `name_prefix`, `label_text` or `index`. Pure and total.
      * @param {any} step an object that carries at least one of SCOPED_LOCATOR_KEYS
      * @returns {{ ok: false, why: string } | { ok: true, form: 'scoped', scope: null | { role: string, name?: string, namePrefix?: string }, target: { kind: 'role', role: string, name: string } | { kind: 'role-prefix', role: string, namePrefix: string } | { kind: 'text', text: string } | { kind: 'label', labelText: string } | { kind: 'nth', role: string, index: number } }}
      */
     function scopedLocatorOf(step) {
       /** @param {string} why @returns {{ ok: false, why: string }} */
       const bad = (why) => ({ ok: false, why });
       const named = (/** @type {any} */ v) => isStr(v) && v.trim() !== '';
       if (step.selector !== undefined) return bad('a step names one locator form: selector, role and name, or text');
       /** @type {null | { role: string, name?: string, namePrefix?: string }} */ let scope = null;
       if (step.within !== undefined) {
         const s = scopeOf(step.within);
         if (!s.ok) return bad(s.why);
         scope = s.scope;
       }
       const hasRole = step.role !== undefined;
       const hasName = step.name !== undefined;
       const hasPrefix = step.name_prefix !== undefined;
       const hasText = step.text !== undefined;
       const hasLabel = step.label_text !== undefined;
       const hasIndex = step.index !== undefined;
       if (hasText) {
         if (hasRole || hasName || hasPrefix || hasLabel || hasIndex) return bad('a step names one locator form: role with name, name_prefix or index; text; or label_text');
         if (!named(step.text)) return bad('text must be a non-empty string');
         return { ok: true, form: 'scoped', scope, target: { kind: 'text', text: step.text } };
       }
       if (hasLabel) {
         if (hasRole || hasName || hasPrefix || hasIndex) return bad('label_text names the whole locator: it takes no role, name, name_prefix or index');
         if (!named(step.label_text)) return bad('label_text must be a non-empty string');
         return { ok: true, form: 'scoped', scope, target: { kind: 'label', labelText: step.label_text } };
       }
       if (!hasRole) return bad('a step with within, name_prefix or index needs a role, a text or a label_text');
       if (!isStr(step.role) || !LOCATOR_ROLES.includes(step.role)) return bad('role must be one of the supported roles');
       if ([hasName, hasPrefix, hasIndex].filter(Boolean).length !== 1) return bad('role takes exactly one of name, name_prefix or index');
       if (hasName) {
         if (!named(step.name)) return bad('name must be a non-empty string');
         return { ok: true, form: 'scoped', scope, target: { kind: 'role', role: step.role, name: step.name } };
       }
       if (hasPrefix) {
         if (!named(step.name_prefix)) return bad('name_prefix must be a non-empty string');
         return { ok: true, form: 'scoped', scope, target: { kind: 'role-prefix', role: step.role, namePrefix: step.name_prefix } };
       }
       if (scope === null) return bad('index needs a within scope');
       if (!Number.isSafeInteger(step.index) || step.index < 0) return bad('index must be a non-negative integer');
       return { ok: true, form: 'scoped', scope, target: { kind: 'nth', role: step.role, index: step.index } };
     }

     /**
      * Whether a locator descriptor names a control whose value or state can be read: the role form, or a scoped form
      * that is not a bare text. Pure.
      * @param {any} loc
      * @returns {boolean}
      */
     export function isControlLocator(loc) {
       return isObj(loc) && loc.ok === true && (loc.form === 'role' || (loc.form === 'scoped' && loc.target.kind !== 'text'));
     }
     ```
  2. In `locatorOf`, add one line directly after `if (!isObj(step)) return null;`: `if (SCOPED_LOCATOR_KEYS.some((k) => step[k] !== undefined)) return scopedLocatorOf(step);`. Widen the `@returns` union of its JSDoc with `| ReturnType<typeof scopedLocatorOf>`-equivalent text (a `{ ok: true, form: 'scoped', ... }` member). Every other line of `locatorOf` stays, so a step without the four keys returns exactly what it returned before.
  3. In `stepRules`: (a) directly after the line `if (!loc.ok) return bad(`${s.action}: ${loc.why}`);` add `if (loc.form === 'scoped' && loc.target.kind === 'label' && (s.action === 'expect_text' || s.action === 'expect_not_visible')) return bad(`${s.action} does not take label_text: it names an input`);`; (b) replace `if (loc.form !== 'role') return bad('expect_value needs a role and a name');` with `if (!isControlLocator(loc)) return bad('expect_value needs a role and a name');` and `if (loc.form !== 'role') return bad('expect_state needs a role and a name');` with `if (!isControlLocator(loc)) return bad('expect_state needs a role and a name');`. The `session` refusal that precedes the locator parse stays first.
  4. Directly above the JSDoc of `stepRules` add the total method check, and in the `expect_requests` case replace `if (!HTTP_METHODS.includes(s.method)) return bad('expect_requests method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');` with `if (!validRequestMethods(s.method)) return bad('expect_requests method must be one of GET, HEAD, POST, PUT, PATCH, DELETE, or a non-empty array of distinct ones');`. Do not touch the `http` driver's `HTTP_METHODS.includes(s.method)` check (a test pins its exact reason).
     ```js
     /**
      * Whether an `expect_requests` method is one of the six method names or a non-empty array of distinct ones. Pure and
      * total: every member is tested by type before anything is compared, so a hostile value (an object with a
      * `toString` key, a nested array, an array-like) is refused and never coerced.
      * @param {any} method
      * @returns {boolean}
      */
     function validRequestMethods(method) {
       const one = (/** @type {any} */ m) => typeof m === 'string' && HTTP_METHODS.includes(m);
       if (Array.isArray(method)) return method.length >= 1 && method.length <= HTTP_METHODS.length && method.every(one) && new Set(method).size === method.length;
       return one(method);
     }
     ```
  5. In `evaluateRequestWindow` replace the two lines quoted in `# SOURCE: plugins/relay/scripts/qa-run.mjs:1766-1767` with:
     ```js
       const method = isObj(step) ? step.method : undefined;
       const wanted = Array.isArray(method) ? method : [method];
       const matching = needle === null ? [] : entries.filter((e) => isObj(e) && wanted.includes(e.method) && isStr(e.path) && e.path.includes(needle));
     ```
  6. In `groundingStepKey`, directly after `if (loc === null || !loc.ok) return null;` add `if (loc.form === 'scoped') return null;`.
  Constraints that the contract check and the existing tests pin, all of which this task must keep true: no `import` (static or dynamic), no `// GUARD-SITE` or `// WRITE-SITE` comment, no `writeFileSync(`, `renameSync(` or `spawnSync(process.execPath` text anywhere, comments included; no `outcome: '...'` or `outcome = '...'` literal other than the four vocabulary values; no quoting of the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` or `export function mintExpiryDue(` in a comment; do not add a second line `const abs = join(ctx.runDirAbs, 'evidence', name);`; keep the `REQUEST-OBSERVATION` cluster unchanged apart from the `evaluateRequestWindow` edit above (which sits outside the cluster's forbidden-read list). Every new function is total: `Object.keys`, `Array.isArray`, `typeof` and strict comparisons only, no template interpolation or coercion of a plan value.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1116-1133` (the parser shape), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1242-1261` (the two checks and the early refusal), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1289-1293` (the method check), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1766-1767` (the comparison) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:4163-4175` (the key).
- **VALIDATE**: gate on the exported surface and the validators; it fails on the unmodified tree (`SCOPED_LOCATOR_KEYS` is not exported, so the first assertion throws) and passes once the task is done. The closing block runs the real-tree contract check as a regression guard for the source-text pins.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  assert.deepEqual([...m.SCOPED_LOCATOR_KEYS], ["within", "name_prefix", "label_text", "index"]);
  for (const name of ["scopeOf", "isControlLocator"]) assert.equal(typeof m[name], "function", name + " is not exported");
  const ok = (s) => assert.equal(m.validateStep("browser", s), null, JSON.stringify(s));
  const no = (s, label) => assert.equal(m.validateStep("browser", s)?.code, "PLAN_ENTRY_INVALID", label ?? JSON.stringify(s));
  const B = { role: "region", name: "Grupo B" };
  ok({ action: "click", within: B, role: "button", name: "Excluir" });
  ok({ action: "expect_visible", within: B, text: "Salvar" });
  ok({ action: "click", role: "button", name_prefix: "Alunos" });
  ok({ action: "expect_state", role: "button", name_prefix: "Alunos", state: "expanded", equals: false });
  ok({ action: "fill", label_text: "E-mail*", value: "ana" });
  ok({ action: "expect_value", label_text: "E-mail*", equals: "ana" });
  ok({ action: "click", within: B, role: "button", index: 0 });
  ok({ action: "click", within: { role: "region", name_prefix: "Grupo" }, role: "button", index: 2 });
  ok({ action: "expect_not_visible", within: B, role: "button", name: "Remover" });
  no({ action: "click", role: "button", index: 0 }, "index needs within");
  no({ action: "click", within: B, role: "button", index: -1 });
  no({ action: "click", within: B, role: "button", index: 1.5 });
  no({ action: "click", within: B, role: "button", name: "x", index: 0 });
  no({ action: "click", role: "button", name: "a", name_prefix: "b" });
  no({ action: "click", label_text: "x", role: "textbox" });
  no({ action: "expect_text", label_text: "x", contains: "y" });
  no({ action: "expect_not_visible", label_text: "x" });
  no({ action: "click", within: { role: "region" }, text: "x" });
  no({ action: "click", within: { role: "region", name: "a", name_prefix: "b" }, text: "x" });
  no({ action: "click", within: { role: "nope", name: "a" }, text: "x" });
  no({ action: "click", within: [], text: "x" });
  no({ action: "click", within: B, selector: "#a" });
  no({ action: "expect_value", within: B, text: "x", not_empty: true }, "a bare text is not a control");
  no({ action: "click", within: B, role: "button", name: "x", session: "none" }, "session is refused");
  for (const key of m.SCOPED_LOCATOR_KEYS) {
    for (const hostile of [{ toString: 1 }, [{ toString: 1 }], null, 7, "", { valueOf: 1, length: 3 }]) {
      const step = { action: "click", role: "button", name: "x", [key]: hostile };
      assert.doesNotThrow(() => m.validateStep("browser", step), key);
      assert.equal(m.validateStep("browser", step)?.code, "PLAN_ENTRY_INVALID", key + " " + JSON.stringify(hostile));
    }
  }
  assert.equal(m.validateSteps("browser", [{ action: "goto", path: "/p" }, { action: "click", within: { toString: 1 }, role: "button", index: 0 }], [])?.code, "PLAN_ENTRY_INVALID");
  // A step without the four keys is parsed exactly as before.
  assert.deepEqual(m.locatorOf({ role: "button", name: "Save" }), { ok: true, form: "role", role: "button", name: "Save" });
  assert.deepEqual(m.locatorOf({ text: "Welcome" }), { ok: true, form: "text", text: "Welcome" });
  assert.equal(m.locatorOf({ selector: "#a" }), null);
  assert.deepEqual(m.locatorOf({ role: "button" }), { ok: false, why: "role and name go together" });
  assert.deepEqual(m.locatorOf({ within: B, role: "button", index: 1 }), { ok: true, form: "scoped", scope: { role: "region", name: "Grupo B" }, target: { kind: "nth", role: "button", index: 1 } });
  assert.equal(m.isControlLocator(m.locatorOf({ role: "textbox", name: "x" })), true);
  assert.equal(m.isControlLocator(m.locatorOf({ label_text: "x" })), true);
  assert.equal(m.isControlLocator(m.locatorOf({ text: "x", within: B })), false);
  assert.equal(m.groundingStepKey({ action: "click", within: B, role: "button", index: 0 }), null);
  assert.deepEqual(m.groundingStepKey({ action: "click", role: "button", name: "Group" }), { action: "click", role: "button", name: "Group" });
  // expect_requests: a string or a non-empty array of distinct names.
  const req = (method) => ({ action: "expect_requests", method, url_contains: "/a", count: 1 });
  ok(req("POST")); ok(req(["POST", "PATCH", "PUT"])); ok(req(["GET"]));
  for (const bad of [[], ["POST", "POST"], ["POST", 7], ["TRACE"], [["POST"]], {}, "post", 7, null, [{ toString: 1 }], { valueOf: 1, length: 3 }, ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "GET"]]) no(req(bad));
  const hit = (method) => ({ method, host: "127.0.0.1:3000", path: "/api/profile", local: true });
  const step = { ...req(["POST", "PATCH", "PUT"]), url_contains: "/api/profile" };
  assert.equal(m.evaluateRequestWindow([hit("PATCH")], step).status, "passed");
  assert.equal(m.evaluateRequestWindow([hit("PATCH"), hit("GET")], step).observed, 1);
  assert.equal(m.evaluateRequestWindow([hit("PATCH"), hit("PUT")], step).status, "failed");
  assert.equal(m.evaluateRequestWindow([hit("PATCH")], { ...step, method: "POST" }).observed, 0);
  assert.equal(m.evaluateRequestWindow([hit("POST")], { ...step, method: "POST" }).status, "passed");
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the provenance: a locator is grounded by a snapshot entry or by the report's own words

- **ACTION**: Delivers AC-A1 (plan-time half). In `plugins/relay/scripts/qa-run.mjs`:
  1. Replace the whole of `precheckGroundedSteps` (JSDoc at line 1812, function at 1821-1877) by the two functions below, in this order and both before the JSDoc of `summarizeEntries` (the contract pins that the text between `export function precheckGroundedSteps(` and `export function summarizeEntries(` contains `interactionHistory(` and `isPostInteractionSnapshot(`, so `groundLocators` must follow the wrapper, not precede it). The body of `groundLocators` is the old body with three changes marked in comments: the report's words are a second source, a refusal is `PLAN_ENTRY_INVALID`, and the indexes of the steps left to run time are collected. The three refusal sentences, the snapshot selection, the post-interaction fill rule and the two expectation checks are copied byte-identical from the old body (the quoted ones in `# SOURCE: plugins/relay/scripts/qa-run.mjs:1832-1853` and lines 1854-1874).
     ```js
     /**
      * Plan-time grounding pre-check. Returns null when every locator step is acceptable, else the first
      * refusal. A reason names a step position, never a locator value. See `groundLocators`.
      * @param {any[]} steps
      * @param {any[]} snapshots
      * @param {any} manualText
      * @param {string | null} role
      * @returns {{ code: string, reason: string } | null}
      */
     export function precheckGroundedSteps(steps, snapshots, manualText, role) {
       return groundLocators(steps, snapshots, manualText, role).refusal;
     }

     /**
      * Plan-time grounding of every locator step, and which of them the browser resolves when the case runs. A
      * locator is grounded by a snapshot entry of the step's role and route with `matches` exactly 1 (as before) or by
      * the report's own words: its `name`, `text` or label appears in `manualText` once whitespace is collapsed and
      * case is ignored. A locator with neither source is refused `PLAN_ENTRY_INVALID`. `runtime` lists the zero-based
      * indexes of the steps with no snapshot entry behind them (grounded only by the report's words) and of every
      * step that carries a scoped key, because a snapshot lists page-wide candidates only. A scoped step needs each
      * word it carries (scope, name, prefix, text or label) grounded the same way; `index` carries none. Pure.
      * @param {any[]} steps
      * @param {any[]} snapshots
      * @param {any} manualText
      * @param {string | null} role
      * @returns {{ refusal: { code: string, reason: string } | null, runtime: number[] }}
      */
     export function groundLocators(steps, snapshots, manualText, role) {
       const wantRole = role === null ? 'anonymous' : role;
       const collapse = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
       const report = isStr(manualText) ? collapse(manualText) : null;
       // A word is the report's own only when it is a non-blank string that the case's manual steps contain.
       const inReport = (/** @type {any} */ word) => report !== null && isStr(word) && word.trim() !== '' && report.includes(collapse(word));
       /** @type {number[]} */ const runtime = [];
       /** @param {string} reason */
       const refuse = (reason) => ({ refusal: { code: 'PLAN_ENTRY_INVALID', reason }, runtime });
       /** @type {string | null} */ let route = null;
       for (const [i, step] of steps.entries()) {
         const n = i + 1;
         if (!isObj(step)) continue;
         if (step.action === 'goto' || step.action === 'expect_url') route = routeKey(step.path);
         if (!LOCATOR_ACTIONS.includes(step.action)) continue;
         const loc = locatorOf(step);
         if (loc === null || !loc.ok) continue;
         // (the comment and the five statements of lines 1832-1839 are copied unchanged: candidates, hist, histKey, after, snap)
         /** @type {any[]} */ const entries = snap !== undefined && Array.isArray(snap.entries) ? snap.entries.filter(isObj) : [];
         const hint = after === undefined && candidates.some((s) => isPostInteractionSnapshot(s))
           ? '; a post-interaction snapshot exists for this role and route, but the steps of this case before this one are not exactly its prefix'
           : '';
         if (loc.form === 'scoped') {
           /** @type {{ word: string, listed: (e: any) => boolean }[]} */ const words = [];
           const sc = loc.scope;
           if (sc !== null) {
             words.push(sc.name !== undefined
               ? { word: sc.name, listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === sc.role && e.name === sc.name }
               : { word: /** @type {string} */ (sc.namePrefix), listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === sc.role && isStr(e.name) && e.name.startsWith(/** @type {string} */ (sc.namePrefix)) });
           }
           const t = loc.target;
           if (t.kind === 'role') words.push({ word: t.name, listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === t.role && e.name === t.name });
           else if (t.kind === 'role-prefix') words.push({ word: t.namePrefix, listed: (/** @type {any} */ e) => e.kind === 'role' && e.role === t.role && isStr(e.name) && e.name.startsWith(t.namePrefix) });
           else if (t.kind === 'text') words.push({ word: t.text, listed: (/** @type {any} */ e) => e.kind === 'text' && e.text === t.text });
           else if (t.kind === 'label') words.push({ word: t.labelText, listed: (/** @type {any} */ e) => e.kind === 'text' && e.text === t.labelText });
           for (const w of words) {
             if (inReport(w.word) || entries.some((e) => e.matches === 1 && w.listed(e))) continue;
             return refuse(`step ${n}: the scoped locator is neither a snapshot entry that matches exactly one element nor a word of the report's own steps${hint}`);
           }
           runtime.push(i);
         } else {
           const entry = entries.find((e) => (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
           const listed = entry !== undefined && entry.matches === 1;
           if (!listed && !inReport(loc.form === 'role' ? loc.name : loc.text)) {
             if (snap === undefined) {
               return refuse(`step ${n}: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step`);
             }
             if (entry === undefined) return refuse(`step ${n}: the locator is not a snapshot entry${hint}`);
             return refuse(`step ${n}: the locator matched ${entry.matches} elements in the snapshot; a locator must match exactly one`);
           }
           if (!listed) {
             runtime.push(i);
           } else if (after !== undefined) {
             // (the old loop over `hist`: a fill value that a consumed prefix replays must come from the report, PLAN_ENTRY_INVALID at `h.at`, via `refuse`)
           }
         }
         // (the `expect_text` contains check and the `expect_value` literal check follow unchanged, each returning a PLAN_ENTRY_INVALID refusal through `refuse`)
       }
       return { refusal: null, runtime };
     }
     ```
     The two parenthesized comments above stand for code to copy verbatim from the old function, not to leave as comments: the comment and the five statements at 1832-1839 (the old `if (snap === undefined)` refusal at 1840-1842 is replaced by the new branches) and the two expectation checks at 1862-1874 are carried over unchanged (they read `manualText` through the old `collapse`, which this function still defines), and the fill loop of lines 1854-1861 is the body of the `else if (after !== undefined)` branch with its `return { code: 'PLAN_ENTRY_INVALID', reason: ... }` rewritten as `return refuse(...)` with the same sentence. The helper `routeKey` is the existing one.
  2. In `executeCase` (lines 3757-3760) replace the call with the `groundLocators` form below, and pass the list on in the driver call at line 3821 (`const ran = await fn(runCtx, kase, { ...p, steps, runtime_steps: runtimeSteps }, session);`; the spread order puts the runner's field last so a plan cannot set it). Declare `let runtimeSteps = [];` (with the JSDoc type `number[]`) immediately before the `if`.
     ```js
       /** @type {number[]} */ let runtimeSteps = [];
       if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null)) {
         const grounded = groundLocators(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role);
         if (grounded.refusal !== null) return out(needsHuman(grounded.refusal.code, grounded.refusal.reason));
         runtimeSteps = grounded.runtime;
       }
     ```
  Constraints: `precheckGroundedSteps` keeps its signature and its result shape (`null` or `{ code, reason }`); the three refusal sentences stay byte-identical (existing tests assert them by regex and by `deepEqual`, and only their `code` changes); an empty or non-string report grounds nothing (the contract's behaviour pins call it with `''`); no second occurrence of the anchor lines listed in `## Notes`; the section markers `function loadGroundingSnapshots(` and `async function executeCase(` each stay unique.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1832-1853` (the snapshot selection and the refusal sentences) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3757-3760` (the call site).
- **VALIDATE**: gate on the new pure function through the runner's own exports; it fails on the unmodified tree (`groundLocators` is not exported, so the first call throws) and passes once the task is done. It also runs the real-tree contract, whose behaviour pins call `precheckGroundedSteps` with an empty report and whose section pin needs `interactionHistory(` between the two anchors.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const entry = (kind, o) => ({ kind, matches: 1, ...o });
  const snapshots = [{ schema_version: 1, role: "anonymous", route: "/p", withheld: 0, entries: [
    entry("role", { role: "button", name: "Listed" }),
    entry("role", { role: "button", name: "Twin", matches: 2 }),
    entry("role", { role: "region", name: "Grupo S" }),
    entry("text", { text: "Linha listada" }),
  ] }];
  const G = { action: "goto", path: "/p" };
  const click = (name, extra = {}) => ({ action: "click", role: "button", name, ...extra });
  const ground = (steps, manual = "", snaps = snapshots, role = null) => m.groundLocators(steps, snaps, manual, role);
  let r = ground([G, click("Listed")]);
  assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [], "a snapshot entry grounds the step; nothing is left for run time");
  r = ground([G, click("Palavra")], "Click PALAVRA now");
  assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1], "the report words ground it and the browser resolves it");
  r = ground([G, click("Palavra Dupla")], "click   palavra\ndupla");
  assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1], "whitespace and case are ignored");
  assert.deepEqual(ground([G, click("Fantasma")], "Click Palavra").refusal, { code: "PLAN_ENTRY_INVALID", reason: "step 2: the locator is not a snapshot entry" });
  assert.deepEqual(ground([G, click("Twin")], "").refusal, { code: "PLAN_ENTRY_INVALID", reason: "step 2: the locator matched 2 elements in the snapshot; a locator must match exactly one" });
  r = ground([G, click("Twin")], "Click Twin");
  assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1], "an ambiguous entry whose words are the report is resolved at run time");
  assert.deepEqual(ground([{ action: "goto", path: "/other" }, click("Listed")], "").refusal, { code: "PLAN_ENTRY_INVALID", reason: "step 2: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step" });
  r = ground([{ action: "goto", path: "/other" }, click("Palavra")], "Click Palavra");
  assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1]);
  for (const manual of [null, undefined, 42, "", "   "]) assert.equal(ground([G, click("Palavra")], manual).refusal?.code, "PLAN_ENTRY_INVALID", "an empty or non-string report grounded a step: " + JSON.stringify(manual));
  r = ground([G, { action: "expect_visible", text: "Linha listada" }]); assert.equal(r.refusal, null); assert.deepEqual(r.runtime, []);
  r = ground([G, { action: "expect_visible", text: "Texto livre" }], "see Texto livre"); assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1]);
  const inScope = (extra) => ({ action: "click", within: { role: "region", name: "Grupo S" }, ...extra });
  r = ground([G, inScope({ role: "button", name: "Excluir" })], "Click Excluir");
  assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1], "a snapshot-listed scope and a report-word target");
  assert.equal(ground([G, inScope({ role: "button", name: "Excluir" })], "").refusal?.code, "PLAN_ENTRY_INVALID");
  const idx = { action: "click", within: { role: "region", name: "Grupo Q" }, role: "button", index: 0 };
  r = ground([G, idx], "in Grupo Q"); assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1], "an index step carries no target word");
  assert.match(ground([G, idx], "").refusal?.reason ?? "", /^step 2:/);
  r = ground([G, { action: "fill", label_text: "Linha listada", value: "x" }]); assert.equal(r.refusal, null); assert.deepEqual(r.runtime, [1]);
  r = ground([G, { action: "fill", label_text: "Outro", value: "x" }], "Fill Outro"); assert.equal(r.refusal, null);
  r = ground([G, { action: "click", role: "button", name_prefix: "Lis" }]); assert.equal(r.refusal, null, "a prefix of a snapshot entry that matches once is grounded");
  r = ground([G, { action: "expect_text", role: "button", name: "Listed", contains: "zzz" }], "no");
  assert.equal(r.refusal?.code, "PLAN_ENTRY_INVALID"); assert.match(r.refusal.reason, /^step 2: expect_text contains must come from the report/);
  assert.deepEqual(m.precheckGroundedSteps([G, click("Fantasma")], snapshots, "", null), ground([G, click("Fantasma")], "").refusal);
  assert.equal(m.precheckGroundedSteps([G, click("Listed")], snapshots, "", null), null);
  const c = runQaRunContractCheck();
  if (!c.ok) { console.error(JSON.stringify(c.findings, null, 2)); process.exit(1); }
  '
  ```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the resolution: build the scoped locators and resolve them when the case runs

- **ACTION**: Delivers the run-time half of AC-A1 and AC-A2, AC-A3, AC-A4 and AC-A5 end to end. In `plugins/relay/scripts/qa-run.mjs`:
  1. Directly after the closing brace of `captureElementPng` (line 2372) and before the JSDoc of `queryArgvIsLocal`, add the resolution helpers. They build and resolve locators and never write; `resolveScopeElement` and `scopeOf` are the entry Phase 5 reuses.
     ```js
     /**
      * The XPath, relative to the element that holds the label text, of the nearest container (the element itself
      * included) that holds exactly one `input`, `textarea` or `select`; a hidden input is not counted. Counts only
      * ever grow going up, so the first container that holds any control either holds exactly one (the target) or
      * more (nothing matches, and the case ends `STEP_UNGROUNDED`). A fixed constant, never planner text.
      */
     export const LABEL_CONTAINER_XPATH = "xpath=ancestor-or-self::*[count(.//input[not(@type='hidden')] | .//textarea | .//select) = 1][1]";

     /** The control inside the container that `LABEL_CONTAINER_XPATH` selects. */
     const LABEL_CONTROL_CSS = "input:not([type='hidden']), textarea, select";

     /** @param {string} s @returns {string} the text with every regular-expression metacharacter escaped */
     const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

     /**
      * The `getByRole` options for an exact accessible name, or for a name matched by its start: an anchored,
      * case-sensitive regular expression whose whitespace runs match any whitespace run.
      * @param {{ name?: string, namePrefix?: string }} spec
      * @returns {{ name: string | RegExp, exact?: boolean }}
      */
     function nameOption(spec) {
       if (spec.name !== undefined) return { name: spec.name, exact: true };
       return { name: new RegExp(`^${/** @type {string} */ (spec.namePrefix).trim().split(/\s+/).map(escapeRegExp).join('\\s+')}`) };
     }

     /**
      * The locator of a `within` scope: every element of the scope's role whose accessible name is the scope's name
      * (exact) or starts with its name prefix. It may match any number of elements; the caller requires exactly one.
      * @param {any} page a Playwright page
      * @param {{ role: string, name?: string, namePrefix?: string }} scope
      * @returns {any}
      */
     export function scopeLocator(page, scope) {
       return page.getByRole(scope.role, nameOption(scope));
     }

     /**
      * Resolves a scope to its single element: waits up to 10 seconds for the first match to attach, then counts.
      * Exported so that a later step (the `judge` step's element capture) resolves the same scope the same way and
      * hands `locator` to `captureElementPng`, with no second implementation of scope resolution.
      * @param {any} page
      * @param {{ role: string, name?: string, namePrefix?: string }} scope
      * @returns {Promise<{ ok: true, locator: any } | { ok: false, count: number }>}
      */
     export async function resolveScopeElement(page, scope) {
       const locator = scopeLocator(page, scope);
       await locator.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
       const count = await locator.count().catch(() => 0);
       return count === 1 ? { ok: true, locator } : { ok: false, count };
     }

     /**
      * Builds the Playwright locator of an `ok` descriptor of `locatorOf`, with the locators that must each match
      * exactly one element before the target can be trusted (the scope, and the label element of `label_text`) and,
      * for an `index`, the list the index selects from. It builds locators and resolves nothing. The chain is
      * `scope.getByRole(...)`, never `locator.within()`, which needs Playwright 1.64.
      * @param {any} page
      * @param {any} loc
      * @returns {{ target: any, guards: { what: 'scope' | 'label', locator: any }[], indexed: null | { all: any, index: number } }}
      */
     export function buildLocator(page, loc) {
       if (loc.form === 'role') return { target: page.getByRole(loc.role, { name: loc.name, exact: true }), guards: [], indexed: null };
       if (loc.form === 'text') return { target: page.getByText(loc.text, { exact: true }), guards: [], indexed: null };
       /** @type {{ what: 'scope' | 'label', locator: any }[]} */ const guards = [];
       /** @type {any} */ let base = page;
       if (loc.scope !== null) {
         base = scopeLocator(page, loc.scope);
         guards.push({ what: 'scope', locator: base });
       }
       const t = loc.target;
       if (t.kind === 'role') return { target: base.getByRole(t.role, { name: t.name, exact: true }), guards, indexed: null };
       if (t.kind === 'role-prefix') return { target: base.getByRole(t.role, nameOption({ namePrefix: t.namePrefix })), guards, indexed: null };
       if (t.kind === 'text') return { target: base.getByText(t.text, { exact: true }), guards, indexed: null };
       if (t.kind === 'label') {
         const labelElement = base.getByText(t.labelText, { exact: true });
         guards.push({ what: 'label', locator: labelElement });
         return { target: labelElement.locator(LABEL_CONTAINER_XPATH).locator(LABEL_CONTROL_CSS), guards, indexed: null };
       }
       const all = base.getByRole(t.role);
       return { target: all.nth(t.index), guards, indexed: { all, index: t.index } };
     }

     /**
      * The locator keys of a scoped step as the comparison evidence records them: the words already in the plan,
      * never a typed or compared value.
      * @param {any} step
      * @returns {Record<string, any>}
      */
     function scopedLocatorRecord(step) {
       /** @type {Record<string, any>} */ const record = {};
       for (const k of ['within', 'role', 'name', 'name_prefix', 'label_text', 'index', 'text']) if (step[k] !== undefined) record[k] = step[k];
       return record;
     }
     ```
  2. In `runLocatorStep`: add a sixth parameter `runtime = false` (JSDoc: `@param {boolean} [runtime]` true when no snapshot entry grounds the step, so the report's words do); change the `@param loc` type to `any` and amend the doc comment's sentence about `first()`, `nth()` and `last()` to say the decision never passes through them except the indexed form, whose index is checked against the number of matches in its scope first. Replace the first line of the body (the `const target = ...` line) with the prelude below, which runs before the `expect_not_visible` branch; leave the absence branch's own lines as they are except for the scoped guard shown after the prelude, and leave every later branch (`click`/`fill`, `expect_visible`, `expect_value`, `expect_state`, `expect_text`) untouched. A plain step has no guards and no index, so the prelude adds no wait and no call for it.
     ```js
       const built = buildLocator(page, loc);
       const target = built.target;
       // A scoped locator is never a snapshot entry, and a plain one that no entry grounds (`runtime`) is the report's
       // word. Both are resolved here: zero matches end the case needs-human instead of failing it.
       const atRunTime = runtime || loc.form === 'scoped';
       for (const guard of built.guards) {
         await guard.locator.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
         const found = await guard.locator.count().catch(() => 0);
         if (found !== 1) {
           return needsHuman('STEP_UNGROUNDED', `step ${n}: the ${guard.what} matched ${found} elements at run time; a ${guard.what} must match exactly one, so nothing was asserted or acted on`);
         }
       }
       if (built.indexed !== null) {
         await built.indexed.all.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
         const total = await built.indexed.all.count().catch(() => 0);
         if (built.indexed.index >= total) {
           return needsHuman('STEP_UNGROUNDED', `step ${n}: the index is past the last matching element of the scope (${total} found), so nothing was asserted or acted on`);
         }
       }
     ```
     Inside the `expect_not_visible` branch, directly before the `const present = ...` line, add the guard that keeps a scoped absence from being vacuous (the scope exists exactly once, so only its visibility is left to check):
     ```js
         if (built.guards.length > 0 && built.guards[0].what === 'scope') {
           const shown = await settleAssertion(() => isVisibleToPerson(built.guards[0].locator), (visible) => visible === true);
           if (shown.status === 'rejected') return needsHuman('STEP_UNGROUNDED', `step ${n}: the scope is not visible to a person, so an absence inside it asserts nothing`);
           if (shown.status === 'unreadable') return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the visibility of the target could not be read; nothing was asserted`);
         }
     ```
     In the `count === 0` branch insert, as its first line, `if (atRunTime) return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched no element at run time, so nothing was asserted or acted on`);` so the `expects`-fails and `blocked` lines below it now serve only a step that a snapshot entry grounds.
  3. In `DRIVERS.browser`: declare `const runtimeSteps = Array.isArray(plan.runtime_steps) ? plan.runtime_steps : [];` as the first statement after `const target = ctx.target;`; replace the mask line with `if (step.action === 'expect_value' && isControlLocator(lstep)) valueMasks.push(buildLocator(page, lstep).target);`; in the comparison-evidence callback replace `if (lstep.form !== 'role') return;` with `if (!isControlLocator(lstep)) return;` and the record's `locator: { role: lstep.role, name: lstep.name }` with `locator: lstep.form === 'role' ? { role: lstep.role, name: lstep.name } : scopedLocatorRecord(step)`; and pass `runtimeSteps.includes(i)` as the sixth argument of the `runLocatorStep` call. Nothing else in the driver changes: not the `expect_requests` branch (its evidence already records `method: step.method`, a string or an array), not the final capture.
  Constraints: keep the three quoted literals `'expect_value'`, `'expect_not_visible'` and `'expect_state'` inside `runLocatorStep` (the contract requires them in that section) and keep `'expect_requests'`, `observeRequests(`, `settleRequestWindow(`, `evaluateRequestWindow(` and `serviceWorkers: 'block'` in the browser driver; the new helpers sit before `DRIVERS.http`, outside both pinned sections; no `locator.within(`, no new reason code, no `outcome:` literal outside the four values, no `import`, and the new comments quote none of the forbidden strings listed in Task 1. If this Chromium rejects the chained `xpath=` form or matches the regular-expression name differently from the gate below, adjust only the two fixed selector constants and the prefix regular expression, and report the exact failing case; never substitute a layout selector or any planner-written CSS or XPath.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2635-2659` (the function head, the absence branch and the zero-match branch being edited), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2759-2779` (the driver branch), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2363-2372` (the capture helper whose input `resolveScopeElement` supplies); the harness follows `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:312-319` and `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:438-447`.
- **VALIDATE**: gate through the real `run` mode on a loopback page and a real Chromium, after a direct probe of the exported helpers on the same page; it fails on the unmodified tree (the helpers are not exported, so the first probe throws) and passes once the task is done. Nineteen cases and the expected pairs are listed in the script: a report-word locator with no snapshot at all passes; zero matches, a twin and a missing scope end `needs-human` `STEP_UNGROUNDED` with nothing acted on; a locator that is neither is `PLAN_ENTRY_INVALID`; a `within` scope picks the one control among twins; a scoped absence passes when the element exists only elsewhere, fails when it is visible there and asserts nothing when the scope is missing; `name_prefix` matches the start of `Alunos (12)` and not a middle substring; `label_text` finds the one input of its container and refuses a container with two; `index` picks the second of four buttons and refuses an index past the last; a scoped hidden target fails with the visibility sentence; and an `expect_requests` method array counts one `PATCH`. The command takes about two minutes (four zero-match cases wait out the 10-second attach, three failing cases wait out the 5-second settle).
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { createServer } from "node:http";
  import { spawn } from "node:child_process";
  import { chromium } from "playwright";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  import { validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
  const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Escopo</title><style>.z{opacity:0}</style></head><body><h1>Painel</h1><div role="region" aria-label="Grupo A"><button data-l="a-excluir">Excluir</button><button data-l="a-1"></button><button data-l="a-2"></button><button data-l="a-remover">Remover</button></div><div role="region" aria-label="Grupo B"><button data-l="b-excluir">Excluir</button><button data-l="b-salvar">Salvar</button><button class="z" data-l="b-fantasma">Fantasma</button></div><button aria-expanded="false">Alunos (12)</button><button id="gravar">Gravar</button><div><span>E-mail*</span><input type="text"></div><div><span>Telefone*</span><input type="text"><input type="text"></div><p id="log"></p><script>document.querySelectorAll("button[data-l]").forEach(function(b){b.addEventListener("click",function(){document.getElementById("log").textContent="clicked "+b.dataset.l;});});document.getElementById("gravar").addEventListener("click",function(){fetch("/api/perfil",{method:"PATCH"});});</script></body></html>`;
  // 1. The exported helpers on a real page (the Phase 5 hand-off: a scope resolves to one element that captureElementPng accepts).
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(PAGE);
    const one = await m.resolveScopeElement(page, { role: "region", name: "Grupo A" });
    assert.equal(one.ok, true);
    const png = await m.captureElementPng(one.locator, []);
    assert.deepEqual([...png.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], "the element capture of a resolved scope must be a PNG");
    assert.deepEqual(await m.resolveScopeElement(page, { role: "region", name: "Grupo Z" }), { ok: false, count: 0 });
    assert.deepEqual(await m.resolveScopeElement(page, { role: "region", namePrefix: "Grupo" }), { ok: false, count: 2 });
    const built = (step) => m.buildLocator(page, m.locatorOf(step));
    assert.equal(await built({ action: "click", role: "button", name_prefix: "Alunos" }).target.count(), 1, "a name prefix matches the start of Alunos (12)");
    assert.equal(await built({ action: "click", role: "button", name_prefix: "unos" }).target.count(), 0, "a name prefix is not a substring match");
    assert.equal(await built({ action: "fill", label_text: "E-mail*", value: "x" }).target.count(), 1, "the nearest container of the label holds one input");
    assert.equal(await built({ action: "fill", label_text: "Telefone*", value: "x" }).target.count(), 0, "a container with two inputs matches nothing");
    assert.equal(await built({ action: "click", within: { role: "region", name: "Grupo B" }, role: "button", name: "Excluir" }).target.count(), 1, "the scope picks one of two twins");
  } finally {
    await browser.close();
  }
  // 2. The real run mode over the same page.
  const server = createServer((req, res) => {
    const path = String(req.url).split("?")[0];
    if (path === "/api/perfil") { res.writeHead(204); res.end(); return; }
    if (path !== "/scoped") { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const root = realpathSync(mkdtempSync(join(tmpdir(), "relay-p3t3-")));
  try {
    const runRel = "PRPs/reports/feat/qa-run/20261022T101010101Z";
    const runDir = join(root, ...runRel.split("/"));
    mkdirSync(join(runDir, "grounding"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl, roles: {} }));
    const G = { action: "goto", path: "/scoped" };
    const H = { action: "expect_visible", role: "heading", name: "Painel" };
    const A = { role: "region", name: "Grupo A" };
    const B = { role: "region", name: "Grupo B" };
    const C = (title, line, steps) => ({ title, manual: ["1. Open the page Painel.", "2. " + line], steps: [G, H, ...steps] });
    const logIs = (w) => ({ action: "expect_text", text: "clicked " + w, contains: w });
    const req = (method) => ({ action: "expect_requests", method, url_contains: "/api/perfil", count: 1 });
    const defs = [
      C("Report word, no snapshot", "Click Salvar and see clicked b-salvar.", [{ action: "click", role: "button", name: "Salvar" }, logIs("b-salvar")]),
      C("Report word, zero matches", "Click Inexistente.", [{ action: "click", role: "button", name: "Inexistente" }]),
      C("Neither report nor snapshot", "Open the group.", [{ action: "click", role: "button", name: "Fantasma3" }]),
      C("Within picks the group", "In Grupo B click Excluir and see clicked b-excluir.", [{ action: "click", within: B, role: "button", name: "Excluir" }, logIs("b-excluir")]),
      C("Unscoped twin is not acted on", "Click Excluir.", [{ action: "click", role: "button", name: "Excluir" }]),
      C("Scoped absence passes", "In Grupo B the button Remover is not shown.", [{ action: "expect_not_visible", within: B, role: "button", name: "Remover" }]),
      C("Scoped absence fails when visible", "In Grupo A the button Remover is not shown.", [{ action: "expect_not_visible", within: A, role: "button", name: "Remover" }]),
      C("Scoped absence, missing scope", "In Grupo Z the button Remover is not shown.", [{ action: "expect_not_visible", within: { role: "region", name: "Grupo Z" }, role: "button", name: "Remover" }]),
      C("Prefix matches the live count", "The Alunos header is collapsed.", [{ action: "expect_state", role: "button", name_prefix: "Alunos", state: "expanded", equals: false }]),
      C("Prefix, wrong state fails", "The Alunos header is expanded.", [{ action: "expect_state", role: "button", name_prefix: "Alunos", state: "expanded", equals: true }]),
      C("Prefix is not a substring", "The header unos is collapsed.", [{ action: "expect_state", role: "button", name_prefix: "unos", state: "expanded", equals: false }]),
      C("Label text, one input", "Type ana in E-mail* and see it holds ana.", [{ action: "fill", label_text: "E-mail*", value: "ana" }, { action: "expect_value", label_text: "E-mail*", equals: "ana" }]),
      C("Label text, two inputs", "Type 1199 in Telefone*.", [{ action: "fill", label_text: "Telefone*", value: "1199" }]),
      C("Index picks the Nth", "In Grupo A click the second button and see clicked a-1.", [{ action: "click", within: A, role: "button", index: 1 }, logIs("a-1")]),
      C("Index past the last", "In Grupo A click the ninth button.", [{ action: "click", within: A, role: "button", index: 8 }]),
      C("Scope word not from the report", "Click Salvar.", [{ action: "click", within: { role: "region", name: "Grupo Q" }, role: "button", name: "Salvar" }]),
      C("Scoped hidden target fails", "In Grupo B see Fantasma.", [{ action: "expect_visible", within: B, role: "button", name: "Fantasma" }]),
      C("Method set counts a PATCH", "Click Gravar and see one PATCH to /api/perfil.", [{ action: "click", role: "button", name: "Gravar" }, req(["POST", "PATCH", "PUT"])]),
      C("Method set without the method fails", "Click Gravar and see no POST to /api/perfil.", [{ action: "click", role: "button", name: "Gravar" }, req(["POST", "PUT"])]),
    ];
    const block = (n, d) => [`### Case ${n}`, `**Title:** ${d.title}`, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", ...d.manual, ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", "feat", "qa-report.md"), `# QA Report\n\n## Test Cases\n\n${defs.map((d, i) => block(i + 1, d)).join("\n")}\n## Notes\n\nnone\n`);
    writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d.title, class: "automatable", driver: "browser", role: null, state: "none", steps: d.steps })) }));
    const env = { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.fsmonitor", GIT_CONFIG_VALUE_0: "false", GIT_CEILING_DIRECTORIES: realpathSync(tmpdir()) };
    const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", "feat", "--run-dir", runRel], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    child.stdout.on("data", () => {});
    const timer = setTimeout(() => child.kill(), 270000);
    const code = await new Promise((r) => child.on("close", r));
    clearTimeout(timer);
    assert.equal(code, 0, "the runner exited " + code + ": " + err);
    const res = JSON.parse(readFileSync(join(runDir, "results.json"), "utf8"));
    const c = res.cases;
    const want = [
      ["pass", null], ["needs-human", "STEP_UNGROUNDED"], ["needs-human", "PLAN_ENTRY_INVALID"], ["pass", null], ["needs-human", "STEP_UNGROUNDED"],
      ["pass", null], ["fail", null], ["needs-human", "STEP_UNGROUNDED"], ["pass", null], ["fail", null],
      ["needs-human", "STEP_UNGROUNDED"], ["pass", null], ["needs-human", "STEP_UNGROUNDED"], ["pass", null], ["needs-human", "STEP_UNGROUNDED"],
      ["needs-human", "PLAN_ENTRY_INVALID"], ["fail", null], ["pass", null], ["fail", null],
    ];
    assert.equal(c.length, want.length);
    c.forEach((x, i) => assert.deepEqual([x.outcome, x.reason_code], want[i], "case " + (i + 1) + " (" + defs[i].title + "): " + JSON.stringify([x.outcome, x.reason_code, x.reason])));
    assert.match(c[1].reason, /^step 3: the locator matched no element at run time/);
    assert.match(c[2].reason, /^step 3:/);
    assert.match(c[4].reason, /^step 3: the locator matched 2 elements at run time/);
    assert.equal(c[6].reason, "step 3: the element was still visible");
    assert.match(c[7].reason, /^step 3: the scope matched 0 elements at run time/);
    assert.equal(c[9].reason, "step 3: the expanded state did not equal the declared value");
    assert.match(c[10].reason, /^step 3: the locator matched no element at run time/);
    assert.match(c[12].reason, /^step 3: the locator matched no element at run time/);
    assert.match(c[14].reason, /^step 3: the index is past the last matching element of the scope \(4 found\)/);
    assert.match(c[15].reason, /^step 3:/);
    assert.equal(c[16].reason, "step 3: the target was present but not visible to a person (opacity or visibility hides it)");
    assert.equal(c[18].reason, "step 4: the page issued 0 matching request(s); 1 were expected");
    for (const x of c) if (typeof x.reason === "string") assert.ok(!/Inexistente|Fantasma|Grupo|Remover|Alunos|Telefone|Excluir|Salvar|Gravar/.test(x.reason), "a reason echoes a locator word: " + x.reason);
    // The comparison evidence of the scoped expect_value holds the locator keys of the plan and never the value.
    const valueEvidence = c[11].evidence.find((e) => String(e).endsWith(".value-4.json"));
    assert.ok(valueEvidence, JSON.stringify(c[11].evidence));
    const record = readFileSync(join(root, ...String(valueEvidence).split("/")), "utf8");
    assert.deepEqual(JSON.parse(record).locator, { label_text: "E-mail*" });
    assert.ok(!record.includes("ana"), "the compared value reached the evidence file");
    // The method array is recorded as given.
    const requestEvidence = c[17].evidence.find((e) => String(e).endsWith(".requests-4.json"));
    assert.ok(requestEvidence, JSON.stringify(c[17].evidence));
    const requests = JSON.parse(readFileSync(join(root, ...String(requestEvidence).split("/")), "utf8"));
    assert.deepEqual([requests.method, requests.observed], [["POST", "PATCH", "PUT"], 1]);
    assert.deepEqual(validateResults(res), []);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  '
  ```

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — teach the planner the two sources and the four keys, with marked examples

- **ACTION**: Delivers AC-A6 (the command doc). Six narrow `Edit` calls; every `old_string` is copied from the file (shown in `# SOURCE: plugins/relay/commands/relay-qa-run.md:286-295` and the reads cited in `## Mandatory Reading`), and every new first line below is a literal the validation greps for. Do not write the exact text `Grounding rules.` or `Personal data.` anywhere except where shown (the tests locate paragraphs by the first occurrence), do not write `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`, and use LF line endings.
  1. The paragraph that starts `Three further `browser` actions assert more than presence.`: `old_string` = its last two lines, `grounded locator forms (never a `selector`), counts as one expectation and is planned only` and `from a snapshot entry whose `matches` is exactly `1`.`, joined by their newline; `new_string` =
     ```
     grounded locator forms (never a `selector`), counts as one expectation and is grounded like
     any other locator step (see Grounding rules and Run-time and scoped locators below).
     ```
  2. The last two lines of the `expect_not_visible` paragraph (`The element must be one the snapshot of that page state already lists: the plain snapshot,` and `or the one a `--prefix` ground wrote after the interactions of the case.`) become, with nothing else in that paragraph touched:
     ```
     The element is grounded like any other locator step: by the plain snapshot, by the one a
     `--prefix` ground wrote after the interactions of the case, or by the report's own words
     (see Grounding rules below).
     ```
  3. Directly after the paragraph that ends `...authenticated or requested.` and before the paragraph that starts `A matching request to a host the local-only guard does not approve` (use the two lines `` `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested. `` + a blank line + `A matching request to a host the local-only guard does not approve` as the `old_string`, so it is unique), add this paragraph (it must not start with `` `expect_requests` takes a `method` ``):
     ```
     `method` may also be an array of distinct method names, for example
     `["POST", "PATCH", "PUT"]`: the step then counts the requests whose method is any member
     of the array, from the same window. An empty array, a repeated name or a name outside the
     six is `PLAN_ENTRY_INVALID`, and a single string behaves as before.
     ```
  4. Replace the ten lines of the `Grounding rules.` paragraph that run from `Grounding rules. Write a locator step only for an entry of the snapshot of the step's own` to `one element is never acted on and also ends the case `needs-human` `STEP_UNGROUNDED`.` (lines 369-378 of the file as read) with the following, which inserts the new block before the rewritten opening. Everything after those ten lines (`Elements that only appear after an interaction ...`, `A text entry may come from ...`, `The expectations always come from ...`) stays byte-identical; the sentence `Elements that only appear after an interaction are not in the plain snapshot: ground them with a prefix (see Grounding after an interaction below), and decline a case that still needs one with `UNGROUNDABLE_AFTER_INTERACTION`.` and the phrases `text entry may come from a paragraph, list-item or cell line of the snapshot` and `exactly one element` are pinned.
     ```
     Run-time and scoped locators. A locator step is valid when its `name` or `text` is an entry
     of the snapshot of its route and role whose `matches` is exactly `1`, or when that word
     appears in the case's manual steps (compared after collapsing whitespace and ignoring case).
     A step that only the report's words ground has no snapshot entry, so the runner resolves it
     when the case runs: exactly one match passes, and no match or several end the case
     `needs-human` `STEP_UNGROUNDED` with nothing acted on. A step grounded by a snapshot entry
     keeps its earlier outcomes, so a missing element still fails a positive step. A locator taken
     from neither source is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or
     requested. Four optional keys reshape a locator and are always resolved when the case runs;
     every word they carry follows the same rule, so it comes from the report's own steps or from
     a snapshot entry with `matches` exactly `1`. They are valid on `click`, `fill`,
     `expect_visible`, `expect_text`, `expect_value`, `expect_state` and `expect_not_visible`,
     except that `label_text` is not taken by `expect_text` or `expect_not_visible`, and
     `expect_value` and `expect_state` need a locator that names a control, never a bare `text`.

     A literal `browser` step that scopes a locator to one group with `within`:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "expect_visible", "within": { "role": "region", "name": "Concluídas" }, "role": "listitem", "name": "Comprar leite" }
     ```

     `within` is `{ "role": ..., "name": ... }` or `{ "role": ..., "name_prefix": ... }` and scopes
     the step with chained locators: the locator matches only inside the one element the scope
     resolves to, so an `expect_not_visible` inside a group passes when the element exists only
     elsewhere. The scope must resolve to exactly one element when the step runs, otherwise the
     case ends `needs-human` `STEP_UNGROUNDED` before anything is acted on, and an
     `expect_not_visible` also needs the scope to be visible to a person, because an absence
     inside a group that is missing or hidden would assert nothing. `within` combines with `role`
     plus `name`, `role` plus `name_prefix`, `text`, or `role` plus `index`.

     A literal `browser` step that matches an accessible name by its start:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "click", "role": "button", "name_prefix": "Participantes" }
     ```

     `name_prefix` replaces `name` and matches the start of the accessible name (case-sensitive,
     whitespace collapsed), so a header whose name embeds a live count, such as
     `Participantes (12)`, resolves without copying the count. It needs a `role` and takes no
     `name`.

     A literal `browser` step that names an input by the text of its label:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "fill", "label_text": "Nome*", "value": "Ana" }
     ```

     `label_text` is for an input whose label is not associated with it (no `for`, no
     `aria-label`) and is used instead of `role`, `name` and `text`. The runner finds the one
     element whose visible text equals `label_text`, walks up to the nearest ancestor that holds
     exactly one `input`, `textarea` or `select` (a hidden input is ignored) and acts on that
     control. If the text matches no element or several, or that container holds more than one
     control, the case ends `needs-human` `STEP_UNGROUNDED`. `click`, `fill`, `expect_visible`,
     `expect_value` and `expect_state` take it.

     A literal `browser` step that picks one of several controls inside a group by position:

     <!-- qa-step-example driver=browser -->
     ```json
     { "action": "click", "within": { "role": "navigation", "name": "Principal" }, "role": "button", "index": 0 }
     ```

     `index` is the zero-based position, in document order, among the elements of `role` inside the
     `within` scope, named or not, and needs both `role` and `within`. An `index` past the last
     element ends the case `needs-human` `STEP_UNGROUNDED`. Plan it only from what the report or the
     snapshot states about the order of the controls: a re-layout changes the control it picks.

     Grounding rules. Write a locator step for an entry of the snapshot of the step's own
     route and role whose `matches` is exactly `1`, copying its `role` and `name` or its `text`
     verbatim; the route of a step is the last `goto` or `expect_url` path before it. The
     report's own words are the second source (see Run-time and scoped locators above): a `name`
     or `text` that the case's manual steps state needs no snapshot entry. A step whose element is
     neither in the snapshot nor in the report's words is not planned: decline the case with
     `STEP_UNGROUNDED` before anything is seeded, authenticated or requested, because the script
     refuses such a step as `PLAN_ENTRY_INVALID`. The declining entry names no step and carries no
     free text: the runner writes the fixed catalogue sentence for the code and reproduces the
     manual steps verbatim, so which step could not be grounded belongs in your own working notes
     or in the run summary you relay to the operator, never in the plan entry. At run time a
     locator that matches more than one element is never acted on and also ends the case
     `needs-human` `STEP_UNGROUNDED`, and so does a locator that only the report's words ground
     when it matches none.
     ```
     The new examples use only `expect_visible`, `click` and `fill` (a test fails if a second marked `expect_value`, `expect_not_visible` or `expect_state` example appears) and no marked `expect_requests` example (a test requires exactly one); each validates alone against the script. Do not add a top-level `states`, `cases`, `class` or `reason_code` key to any block.
  5. The `STEP_UNGROUNDED` row of the reason-code table, one physical line, only its last column changes:
     ``| `STEP_UNGROUNDED` | `needs-human` | `gap` | a step's element is neither in the snapshot nor in the report's words, or does not match exactly one element when the step is resolved |``
  6. The two honesty bullets (2-space continuation lines): replace the bullet that starts `- Plan a browser step by a role-and-name or text locator only from an entry of a` (four lines, through `expectation from the snapshot.`) with
     ```
     - Plan a browser step by a role-and-name or text locator from an entry of a snapshot
       written by the `ground` mode with `matches` exactly 1, or from a name or text that the
       report's own steps state; never write a locator from the code, and never take an
       expectation from the snapshot.
     ```
     and the bullet that starts `- Plan `expect_not_visible` only after a positive step of the same route, and` with
     ```
     - Plan `expect_not_visible` only after a positive step of the same route, and
       `expect_value` and `expect_state` only on a grounded locator (a snapshot entry whose
       `matches` is exactly `1`, or the report's own words), with the expected value or state
       taken from the report's own steps, never from the snapshot.
     ```
  Constraints from the pins (do not disturb): the opening words of every paragraph the tests locate (`` `expect_value` takes `role` and `name` ``, `` `expect_not_visible` takes `role` and `name` ``, `` `expect_state` takes `role` and `name` ``, `` `expect_requests` takes a `method` ``, the lead line of the request-count example, `A matching request to a host the local-only guard does not approve`, `Personal data.`, `Grounding after an interaction.`, `The optional `session` key`) each stay unique, and in the same order; the pinned phrases `positive step on the same route in the same case` and `before anything is seeded, authenticated or requested` stay in the `expect_not_visible` paragraph; the first parenthesis group of the `expect_requests` shape paragraph stays the six method names; the honesty bullet `Plan `expect_requests` only when` stays directly after `Plan a `ground` prefix only from`; the existing marked examples stay first in the file; the table row stays one line and begins exactly ``| `STEP_UNGROUNDED` | `needs-human` | `gap` |``.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:237-249` (the register of a marked example) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:286-295` (the prose register and the paragraph whose last sentence is reworded).
- **VALIDATE**: gate on the authored first lines (copied byte-for-byte from the ACTION above; each is wholly inside one physical line of the new text), then the real-tree contract check and the tests that pin this document. The greps fail on the unmodified tree; the contract and the tests pass before and after, and catch a broken pin. The one doc-pin test that asserts the sentence reworded in item 2 is skipped by name; it is on the corpus-gate allowlist and the test pair updates it. The `planning doc` tests are selected by name so the command runs no browser.
  ```bash
  set -euo pipefail
  grep -qF 'Run-time and scoped locators. A locator step is valid when its `name` or `text` is an entry' plugins/relay/commands/relay-qa-run.md
  grep -qF 'A literal `browser` step that scopes a locator to one group with `within`:' plugins/relay/commands/relay-qa-run.md
  grep -qF '`name_prefix` replaces `name` and matches the start of the accessible name' plugins/relay/commands/relay-qa-run.md
  grep -qF '`label_text` is for an input whose label is not associated with it' plugins/relay/commands/relay-qa-run.md
  grep -qF '`index` is the zero-based position, in document order, among the elements' plugins/relay/commands/relay-qa-run.md
  grep -qF '`method` may also be an array of distinct method names' plugins/relay/commands/relay-qa-run.md
  grep -qF 'The element is grounded like any other locator step: by the plain snapshot' plugins/relay/commands/relay-qa-run.md
  grep -qF "Grounding rules. Write a locator step for an entry of the snapshot of the step's own" plugins/relay/commands/relay-qa-run.md
  grep -qF '- Plan a browser step by a role-and-name or text locator from an entry of a snapshot' plugins/relay/commands/relay-qa-run.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="carry-over DQ18" scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
  ```

### Task 5: UPDATE docs/api-reference.md, docs/domain/glossary.md and docs/domain/flows.md — state the two sources, the four keys and the method array

- **ACTION**: Delivers AC-A6 (the knowledge base). Narrow `Edit` calls, each `old_string` copied from the file (the text shown in `## Mandatory Reading` reads). Do not edit `docs/decisions.md` (so no `documentation/governance/decisions.html` mirror is involved), do not touch the `qa-run.mjs` row of the API reference, and do not backtick a camelCase or UPPER_SNAKE name in the `/relay-qa-run` row (a release test reads such names only in the `qa-run.mjs` row).
  1. `docs/api-reference.md`, the single-line `/relay-qa-run` row (line 129), two edits.
     (a) `old_string` = ``the forms are mutually exclusive, and such a step is planned only from an entry of a `ground`-mode snapshot of its own role and route whose `matches` is exactly `1`, else the case is `needs-human` `STEP_UNGROUNDED` before anything is seeded, authenticated or requested (a locator matching more than one element at run time is also never acted on and ends `needs-human` `STEP_UNGROUNDED`).`` and `new_string` = ``the forms are mutually exclusive, and such a step is valid when it names an entry of a `ground`-mode snapshot of its own role and route whose `matches` is exactly `1` or when its name or text appears in the case's manual steps (a locator that is neither is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, and one valid only through the report's words is resolved at run time, where a locator matching none or more than one element ends the case `needs-human` `STEP_UNGROUNDED` and is never acted on). A locator step may also carry `within` (a `role` plus `name` or `name_prefix` scope), `name_prefix` instead of `name`, `label_text` (an input whose label is not associated with it) or `index` (the Nth element of a `role` inside a scope), all resolved at run time.``
     (b) `old_string` = ``and `expect_requests` (`method`, `url_contains` and a `count` from 0 to 100, counted from the last `goto``  and `new_string` = ``and `expect_requests` (a `method`, or an array of distinct methods, `url_contains` and a `count` from 0 to 100, counted from the last `goto``.
  2. `docs/domain/glossary.md`, four edits (the first paragraph that contains the backticked token `REASON_CATALOGUE` is the catalogue paragraph and the first that contains `Visibility is judged as a person would` is the visibility paragraph, so write neither in a new passage):
     (a) in "QA assertion actions", `old_string` = the three lines ``counts as one expectation and is planned only from`` / ``a `ground` snapshot entry whose `matches` is exactly 1, with the expected value`` / ``or state taken from the report's own steps and never from the snapshot.`` and `new_string` = ``counts as one expectation and is grounded like any`` / ``locator step (a `ground` snapshot entry whose `matches` is exactly 1, or a name or text the`` / ``report's own steps state), with the expected value or state taken from the report's own steps`` / ``and never from the snapshot.``;
     (b) before the paragraph that starts ``A browser step that is none of these three, `expect_requests`,`` insert the paragraph below and a blank line:
     ```
     A locator step is also valid when its `name` or `text` appears in the case's manual
     steps: it then has no snapshot entry, and the runner resolves it when the case runs,
     passing on exactly one match and ending the case `needs-human` `STEP_UNGROUNDED` on none
     or several; a locator that is neither a snapshot entry nor a word of the report is
     `PLAN_ENTRY_INVALID`. Four optional keys reshape a locator and are always resolved when
     the case runs: `within` (a `role` plus `name` or `name_prefix` scope that must resolve to
     exactly one element, chained so the locator matches only inside it), `name_prefix`
     (a name matched by its start, for a name that embeds a live count), `label_text` (an input
     whose label is not associated with it: from the one element whose visible text equals the
     label, the runner walks up to the nearest ancestor that holds exactly one `input`,
     `textarea` or `select`) and `index` (the zero-based position among the elements of a
     `role` inside a `within` scope). See `plugins/relay/commands/relay-qa-run.md`.
     ```
     (c) in "QA grounding snapshot", `old_string` = ``(a step is planned only from an entry`` / ``that matches exactly one element).`` and `new_string` = ``(a step is planned from an entry`` / ``that matches exactly one element, or from a word of the report's own steps).``;
     (d) in "QA observed-request window", `old_string` = ``` `DELETE`; `url_contains` is a path that starts with a single `/`, carries no ``` and `new_string` = ``` `DELETE`, or an array of distinct ones (the step then counts the requests of any of them); `url_contains` is a path that starts with a single `/`, carries no ```.
  3. `docs/domain/flows.md`, three edits in the numbered item that describes the assertion steps (keep the 3-space indent on every continuation line):
     (a) `old_string` = the three lines ``keeps the role's session. Three browser steps take a grounded `role` plus`` / ``   `name`, are planned only from a snapshot entry that matches exactly one`` / ``   element, and take the expected value or state from the report's own steps:`` and `new_string` = ``keeps the role's session. Three browser steps take a grounded `role` plus`` / ``   `name`, are grounded like any locator step (a snapshot entry that matches exactly`` / ``   one element, or a name that the report's own steps state), and take the expected`` / ``   value or state from the report's own steps:``;
     (b) `old_string` = ``An element that exists only after a click or a fill is grounded in a second`` and `new_string` = the passage below, whose last line repeats that text:
     ```
     A locator step is also valid when its name or text appears in the report's own
        steps: it has no snapshot entry, the runner resolves it when the case runs, and
        none or several matches end the case `needs-human` `STEP_UNGROUNDED`; a locator
        that is neither is `PLAN_ENTRY_INVALID`. The optional keys `within`, `name_prefix`,
        `label_text` and `index` scope or reshape a locator (a group scope, a name matched
        by its start, an input found from its label text, the Nth element of a role in a
        scope) and are always resolved when the case runs.
        An element that exists only after a click or a fill is grounded in a second
     ```
     (c) `old_string` = ``takes a `method`, a `url_contains` path (one leading `/`, no query string,`` and `new_string` = ``takes a `method` (or an array of distinct methods, any of which counts), a `url_contains` path (one leading `/`, no query string,``.
- **MIRROR**: `# SOURCE: docs/domain/glossary.md:311-314` and `# SOURCE: docs/domain/flows.md:196-198` (the registers and the clauses being reworded); the `docs/api-reference.md` row is one physical line and stays one.
- **VALIDATE**: gate on the authored literal in each file (copied byte-for-byte from the ACTION; each sits inside one physical line), then the tests that read these documents. The greps fail on the unmodified tree; the tests pass before and after. The end-to-end tests of the visibility file are skipped by name (they run a browser and read none of these pages).
  ```bash
  set -euo pipefail
  grep -qF 'such a step is valid when it names an entry of a `ground`-mode snapshot' docs/api-reference.md
  grep -qF 'or an array of distinct methods, `url_contains` and a `count` from 0 to 100' docs/api-reference.md
  grep -qF 'A locator step is also valid when its `name` or `text` appears in the case' docs/domain/glossary.md
  grep -qF 'or an array of distinct ones (the step then counts the requests of any of them)' docs/domain/glossary.md
  grep -qF 'that matches exactly one element, or from a word of the report' docs/domain/glossary.md
  grep -qF 'A locator step is also valid when its name or text appears in the report' docs/domain/flows.md
  grep -qF 'or an array of distinct methods, any of which counts' docs/domain/flows.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs
  ```

### Task 6: UPDATE documentation/reference/commands.html and documentation/reference/scripts.html — state the two sources, the four keys and the method array

- **ACTION**: Delivers AC-A6 (the site pages). Read `documentation/AGENTS.md` sections 2, 9 and 12 first (no emojis, no inline style, American English, keep structure and ids). Five narrow `Edit` calls, no page added, no `<h3>`/`<h2>` added inside the entries, no sentence containing `e.g.` or `i.e.` (the release tests split sentences at `. `), and no new number (the parenthesis `(5 seconds, 2 seconds, 100, 50 and 200) are chosen, not measured` stays exact).
  1. `documentation/reference/commands.html`, the `Notes` row (line 349): `old_string` = `and role-and-name or text locators must match exactly one element at plan time and run time, otherwise <code>STEP_UNGROUNDED</code>)` and `new_string` = `and a role-and-name or text locator is valid when the snapshot lists it as one element or the report&rsquo;s own steps state its name or text, and must match exactly one element when the case runs, otherwise <code>STEP_UNGROUNDED</code>)`.
  2. `documentation/reference/commands.html`, the `Step vocabulary` row (line 355): `old_string` = `retried once as a viewport-only capture if the full-page capture fails. <code>expect_requests</code> counts the requests the page issues: a <code>method</code>, a <code>url_contains</code> path of at most 200 characters` and `new_string` = `retried once as a viewport-only capture if the full-page capture fails. Locator steps are valid when the snapshot lists them as one element or the report&rsquo;s own steps state their name or text; <code>within</code>, <code>name_prefix</code>, <code>label_text</code> and <code>index</code> scope or reshape a locator and are resolved when the case runs, and a locator that is neither is <code>PLAN_ENTRY_INVALID</code>. <code>expect_requests</code> counts the requests the page issues: a <code>method</code> (or an array of distinct methods), a <code>url_contains</code> path of at most 200 characters`.
  3. `documentation/reference/scripts.html`, the `UI grounding` row (line 217): `old_string` = `Browser steps may use role-and-name and visible-text locators, which must match exactly one element at plan time and at run time, otherwise <code>STEP_UNGROUNDED</code>.` and `new_string` = `Browser steps may use role-and-name and visible-text locators, valid when the snapshot lists them as one element or the report&rsquo;s own steps state their name or text, which must match exactly one element when the case runs, otherwise <code>STEP_UNGROUNDED</code>; <code>within</code>, <code>name_prefix</code>, <code>label_text</code> and <code>index</code> scope or reshape a locator and are always resolved when the case runs.`
  4. `documentation/reference/scripts.html`, the `Assertions and request count` row (line 222), one edit with the old text `and no step uses it yet. <code>expect_requests</code> waits <code>EXPECT_REQUESTS_SETTLE_MS</code> (2000), accepts a <code>count</code> of at most` and the new text:
     `and no step uses it yet. Locator steps are grounded by <code>groundLocators</code> (a snapshot entry that matches exactly one element, or a name or text the report&rsquo;s own steps state) and built by <code>buildLocator</code>, which resolves the scoped forms <code>within</code>, <code>name_prefix</code>, <code>label_text</code> and <code>index</code> when the case runs; <code>resolveScopeElement</code> resolves a <code>within</code> scope to its one element, the entry a later element capture uses. <code>expect_requests</code> waits <code>EXPECT_REQUESTS_SETTLE_MS</code> (2000), takes a <code>method</code> or an array of methods, accepts a <code>count</code> of at most`.
     Every name written in `<code>` here (`groundLocators`, `buildLocator`, `resolveScopeElement`) must be a real export of `qa-run.mjs` after Tasks 2 and 3; the constants the row already names keep their stated values; the sentence about the path, the identifier and the e-mail address stays one untouched sentence.
- **MIRROR**: `# SOURCE: documentation/reference/commands.html:355 (excerpt of the single-line <dd> of the Step vocabulary row)` and `# SOURCE: documentation/reference/scripts.html:222 (excerpt of the single-line <dd> of the Assertions and request count row)`.
- **VALIDATE**: gate on the authored literals (copied byte-for-byte from the ACTION; each sits inside the one physical line of its row), then the site tests that read these rows. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF 'and a role-and-name or text locator is valid when the snapshot lists it as one element' documentation/reference/commands.html
  grep -qF 'Locator steps are valid when the snapshot lists them as one element or the report&rsquo;s own steps state their name or text' documentation/reference/commands.html
  grep -qF 'a <code>method</code> (or an array of distinct methods), a <code>url_contains</code> path of at most 200 characters' documentation/reference/commands.html
  grep -qF 'valid when the snapshot lists them as one element or the report&rsquo;s own steps state their name or text, which must match exactly one element when the case runs' documentation/reference/scripts.html
  grep -qF 'Locator steps are grounded by <code>groundLocators</code>' documentation/reference/scripts.html
  grep -qF 'takes a <code>method</code> or an array of methods, accepts a <code>count</code> of at most' documentation/reference/scripts.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const name of ["groundLocators", "buildLocator", "resolveScopeElement"]) assert.equal(typeof m[name], "function", name + " is named on the scripts page but is not an export");
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="end to end" scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-visibility-evidence.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs
  ```

### Task 7: UPDATE documentation/changelog.html — record the change under Unreleased

- **ACTION**: Delivers AC-A6 (the changelog entry that `documentation/AGENTS.md` sections 7.3, 7.4 and 9 require for any change under `documentation/`). Two `Edit` calls in the `Unreleased` block. Add no `id` attribute (every id inside the block must start with `unreleased`), no `<h2`, and no `<li>` whose visible text equals an entry of the 0.46.0 release; do not touch NAV, the search index, the page subtitle, any heading id or the released sections, and do not bump `plugins/relay/.claude-plugin/plugin.json` or rename `Unreleased` (Phase 8).
  1. `Added` list: `old_string` = `          and requires a pre-run table to be frozen under this convention before any counted run.</li>` (line 49) and `new_string` = that line followed by:
     ```
             <li><strong>Run-time and scoped locators</strong> &mdash; a locator step whose name or text the report&rsquo;s own
               steps state no longer needs a snapshot entry: the runner resolves it when the case runs, passing on exactly one
               match and ending the case <code>needs-human</code> <code>STEP_UNGROUNDED</code> on none or several. Locator
               steps also take <code>within</code> (a group scope), <code>name_prefix</code> (a name that embeds a live count),
               <code>label_text</code> (an input whose label is not associated with it) and <code>index</code> (the Nth
               element of a role inside a scope), and <code>expect_requests</code> accepts an array of methods.</li>
     ```
  2. `Changed` list: `old_string` = `          evidence; if the full-page capture fails the runner takes the viewport capture once instead.</li>` (line 72) and `new_string` = that line followed by:
     ```
             <li><strong>Plan-time grounding</strong> &mdash; a locator that is neither a snapshot entry nor a word of the
               report is now refused <code>PLAN_ENTRY_INVALID</code> (it was <code>STEP_UNGROUNDED</code>), and an
               <code>expect_not_visible</code> inside a <code>within</code> scope asserts nothing, and ends the case
               <code>STEP_UNGROUNDED</code>, when the scope is missing or hidden.</li>
     ```
     Indent the inserted `<li>` lines to match the neighbouring entries (8 spaces before `<li>`, 10 before the continuation lines).
- **MIRROR**: `# SOURCE: documentation/changelog.html:61-73` (the shape of an entry and of the closing list tag).
- **VALIDATE**: gate on the two authored `<strong>` literals (copied byte-for-byte from the ACTION), then the two site tests that read the `Unreleased` block. The greps fail on the unmodified tree; the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF '<strong>Run-time and scoped locators</strong>' documentation/changelog.html
  grep -qF '<strong>Plan-time grounding</strong>' documentation/changelog.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs
  ```

## Validation Commands

Diff base: the tree object `82276fc86adcfddba9e3544db74e8e51a993cc70` (the phase-2 end state). Every "files changed" derivation below uses the single-argument form `git diff <tree> --name-only` plus `git ls-files --others --exclude-standard` for new files, and ignores `PRPs/` (pipeline artifacts: this plan, its review logs, the PRD row). Every git and node command carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. The plan writer has no shell, so none of these was executed: the Implementer runs each against the pre-change tree first and expects the stated result.

### Level 1 STATIC_ANALYSIS

Gate on syntax, the frozen surfaces and the changed-file allowlist. `node --check` fails on a syntax error. The frozen-surface and changed-file checks pass on the unmodified tree (nothing changed yet) by design, as regression guards: they fail as soon as a frozen file, a test file, the contract check or any file outside the eight planned ones changes.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
# The five frozen surfaces are byte-identical to the phase-2 end state.
frozen="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 82276fc86adcfddba9e3544db74e8e51a993cc70 --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces unchanged"
fi
# Only the eight planned files changed: no test file, no new file, no contract edit, no version bump, no NAV or search-index edit (PRPs/ artifacts are ignored).
changed="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff 82276fc86adcfddba9e3544db74e8e51a993cc70 --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -v '^PRPs/' | sort -u || true )"
unexpected="$(printf '%s\n' "$changed" | grep -v '^$' | grep -vxF -e plugins/relay/scripts/qa-run.mjs -e plugins/relay/commands/relay-qa-run.md -e docs/api-reference.md -e docs/domain/glossary.md -e docs/domain/flows.md -e documentation/reference/commands.html -e documentation/reference/scripts.html -e documentation/changelog.html || true)"
if [ -n "$unexpected" ]; then
  echo "FAIL: a file outside the eight planned files changed (a test file would be an R-X violation):"; printf '%s\n' "$unexpected"; exit 1
else
  echo "PASS: only the planned files changed"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the exported surface and the real-tree contract; the first command fails on the unmodified tree (the new names are not exported) and passes once Tasks 1 to 3 are done, and it also pins that the constants and vocabularies this phase must not change kept their values and that the evidence-writer anchor line is still unique. The remaining checks are regression guards that pass before and after: no static sibling import, no introduced forbidden path reference, and the non-browser tests that pin the documents this phase edits (the one pinned sentence that Task 4 rewords is skipped by name and is on the corpus-gate allowlist).

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as m from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
for (const name of ["scopeOf", "isControlLocator", "groundLocators", "scopeLocator", "buildLocator", "resolveScopeElement"]) assert.equal(typeof m[name], "function", name + " is not exported");
assert.deepEqual([...m.SCOPED_LOCATOR_KEYS], ["within", "name_prefix", "label_text", "index"]);
assert.ok(m.LABEL_CONTAINER_XPATH.startsWith("xpath="));
assert.equal(m.ASSERT_SETTLE_MS, 5000);
assert.equal(m.ASSERT_POLL_INTERVAL_MS, 100);
assert.equal(m.CAPTURE_TIMEOUT_MS, 30000);
assert.deepEqual([...m.POSITIVE_ASSERTION_ACTIONS], ["expect_visible", "expect_text", "expect_value", "expect_state"]);
assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
assert.equal(Object.keys(m.REASON_CATALOGUE).length, 12, "the reason-code catalogue changed");
const source = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const anchor = "const abs = join(ctx.runDirAbs, \x27evidence\x27, name);";
assert.equal(source.split(anchor).length - 1, 1, "the evidence-writer anchor line must occur exactly once");
assert.equal(source.split("locator.within(").length - 1, 0, "locator.within() needs Playwright 1.64");
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# No static sibling import was added to the runner (the copy-helper tests copy only qa-run.mjs).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# No forbidden .claude/PRPs reference introduced by this phase's files outside the quoted-prohibition idiom.
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 82276fc86adcfddba9e3544db74e8e51a993cc70 -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md docs/api-reference.md docs/domain/glossary.md docs/domain/flows.md documentation/reference/commands.html documentation/reference/scripts.html documentation/changelog.html | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
# The non-browser tests that pin the documents this phase edits (they run no Chromium); the reworded pinned sentence is skipped by name.
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-skip-pattern="carry-over DQ18" scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-network-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-impossible-catalogue.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test --test-name-pattern="planning doc" scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs
```

### Level 3 DRY-RUN END-TO-END

The end-to-end behaviour (the real `run` mode on a real Chromium page over a loopback server) is gated by the Task 3 command above, which fails before the work and passes after; run it again here as the integration gate, alone and never overlapped with another browser command. Then the static suite and the corpus gate. `npm run validate` prints `28 passed, 0 failed (28 checks run)` (`scripts/validate/index.mjs` line 130); the grep fails if the count changes. The corpus gate runs last and alone (about five minutes) and runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter.

```bash
set -euo pipefail
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
```

Corpus gate. The baseline is green (phase 2 closed with no allowlisted failure). This phase deliberately changes the plan-time rule that eighteen existing tests assert, so the allowlist below is not empty: research examined all 43 `qa-run*.test.mjs` files (thirty-one of them in full, the rest at their runner- and document-coupled sections) and simulated each assertion against the new rule (the table names the file, the exact title prefix, the deciding assertion and the cause). The rest of the 43 either use no locator step through the real runner, or ground every locator by a snapshot entry that matches once, or run a rule this phase leaves untouched; the command-doc pin tests keep passing because Task 4 keeps every pinned phrase except the one sentence in the `DQ18` row. Two browser tests are known to go intermittently `blocked` `EVIDENCE_WRITE_FAILED` under the full concurrent corpus (cause not established), so the gate does not claim a bare zero outside the allowlist: it tolerates at most two further failing tests in the concurrent run (`FLAKE_BUDGET`, the count observed), and each failing test file outside the allowlist must then pass when run alone, which separates load sensitivity from a regression. More than two further failures fails the gate; a file that also fails alone fails the gate and is a candidate for the test pair (`EXISTING_TEST_UPDATED`), never an Implementer edit. The gate exits 1 on any failure outside that rule, on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree. The TAP shape was observed on this host (Node v24.15.0): flat output, a failing test names its file only in the `location:` line of its YAML block, and an import-time crash is one `not ok` whose title is the file path. An allowlisted test that still PASSES is not an error (the gate only tolerates, it does not require, the failures).

Allowlist (stale by design; each is `EXISTING_TEST_UPDATED` for the test pair, never an Implementer edit):

| File | Test (title prefix) | Exact assertion | Why this phase makes it stale |
|------|---------------------|-----------------|-------------------------------|
| `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | `AC-13 precheckGroundedSteps refuses an ambiguous snapshot entry, an unknown entry, a missing goto, a missing route and the wrong role as STEP_UNGROUNDED` | line 304 `assert.equal(r?.code, code, ...)` over the table at 294-301 | rows 1-3 (`Deletexyz`, `Archivexyz`, `Nopexyz`) are not in `MANUAL`, so the code is `PLAN_ENTRY_INVALID`; rows 4-8 name `Save`, which `MANUAL` contains, so each step is valid and returns `null` (line 305 would then throw) |
| `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | `AC-13 precheckGroundedSteps moves the tracked route on goto and on expect_url` | lines 317-318 `moved?.code === 'STEP_UNGROUNDED'` and `/^step 4:/` | `Save` is in `MANUAL`, so step 4 is valid and `moved` is `null` |
| `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | `AC-13 end to end: an ungrounded, ambiguous, absent or report-foreign locator ends the case needs-human before any login` | lines 521-523, 534-536 and 539-541 (codes, `/step 2/`, `/2 elements/`, `/not a snapshot entry/`) | the manuals name the locators (`Deletexyz`, `Archivexyz`, `Panel`), so those steps are now valid and run, or are refused at another step |
| `scripts/validate/checks/qa-run-absence-state.test.mjs` | `AC-10 a state or absence step on an unknown, ambiguous, mis-kinded, wrong-role or route-less locator is STEP_UNGROUNDED and the refusal echoes no locator` | line 270 `assert.equal(r?.code, 'STEP_UNGROUNDED', ...)` | no locator word is in the manual text, so every row is `PLAN_ENTRY_INVALID` |
| `scripts/validate/checks/qa-run-input-value.test.mjs` | `AC-9 an expect_value on a locator the snapshot lacks, or lists twice, is STEP_UNGROUNDED and names no locator` | lines 201, 203 and 206 | `Inexistente`, `Gemeo` and `Telefone` are not in `MANUAL`: the code is `PLAN_ENTRY_INVALID` |
| `scripts/validate/checks/qa-run-stable-grounding.test.mjs` | `AC-2 a step is planned from an inline candidate only when the snapshot counted exactly one element: zero or several is STEP_UNGROUNDED` | line 334 | the report text passed is empty, so the refusal of a 0- or 2-match entry is `PLAN_ENTRY_INVALID` |
| `scripts/validate/checks/qa-run-stable-grounding.test.mjs` | `AC-2 end to end: paragraph, list-item and quoted-colon text reaches the snapshot file with real match counts` | line 704 `assert.equal(repeated?.code, 'STEP_UNGROUNDED')` | `Repeated line` matches twice and the report text is empty: `PLAN_ENTRY_INVALID` |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 a locator step after the case own interactions is grounded against the post-interaction snapshot` | line 152 | `Duplicada` matches twice and is not in `MANUAL` |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 a step before the interaction, and the interaction itself, are grounded against the plain snapshot` | lines 163 and 168 | `Comprar leite` is not in the plain snapshot nor in `MANUAL` |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 only the goto, click and fill steps of the case count` | line 179 | an unkeyable selector click selects the plain snapshot, which lacks the row, and `MANUAL` lacks it |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 a post-interaction snapshot is not consumed when the history of the case is not exactly its prefix` | lines 195, 202, 204 and 205 | each refusal is of a locator whose words are not in the manual text |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 two post-interaction snapshots of one role and route are told apart by the history of the case` | lines 213, 214 and 221 | the refused row or result text is not in the manual text |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 a plan with plain snapshots only refuses with the sentences it always had, byte for byte` | `deepEqual` at lines 228, 231 and 235 and line 242 | only the `code` changes (`PLAN_ENTRY_INVALID`); the three reason sentences stay byte-identical |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 the report-sourced rule applies only to a consumed prefix` | line 275 | `Filtro com 3 caracteres` is not in the manual text |
| `scripts/validate/checks/qa-run-grounding-prefix-consumption.test.mjs` | `AC-11 end to end through the real runner: a post-interaction file is loaded and consumed at plan time` | lines 365, 371 and 377 (the codes of the control, the schema-2 and schema-3 rows and `another`) | the refused locator texts (`Filtro com 3 caracteres`, `Linha`) are not in the manuals |
| `scripts/validate/checks/qa-run-grounding-prefix-loop.test.mjs` | `AC-11 end to end: ground writes the files and one run consumes them` | line 409 (the three control cases) | `Comprar leite` and `Filtro com 14 caracteres` are not in the manuals |
| `scripts/validate/checks/qa-run-network-grammar.test.mjs` | `AC-12 validateStep refuses every shape outside the closed step as PLAN_ENTRY_INVALID with a reason` | table row 120 (`method: ['POST']`) and lines 159 and 166 | a one-member array of a valid name is now accepted |
| `scripts/validate/checks/qa-run-grounding-prefix-contract.test.mjs` | `AC-10 carry-over DQ18: the doc says a navigating click does not reset the absence anchor` | lines 372-373, the verbatim sentence `The element must be one the snapshot of that page state already lists: ...` | Task 4 rewords that sentence (the absence step is now grounded by the report's words too) |

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";
const C = "scripts/validate/checks/";
const ALLOWED = [
  { file: C + "qa-run-ui-grounding.test.mjs", title: "AC-13 precheckGroundedSteps refuses an ambiguous snapshot entry, an unknown entry, a missing goto, a missing route and the wrong role as STEP_UNGROUNDED" },
  { file: C + "qa-run-ui-grounding.test.mjs", title: "AC-13 precheckGroundedSteps moves the tracked route on goto and on expect_url" },
  { file: C + "qa-run-ui-grounding.test.mjs", title: "AC-13 end to end: an ungrounded, ambiguous, absent or report-foreign locator ends the case needs-human before any login" },
  { file: C + "qa-run-absence-state.test.mjs", title: "AC-10 a state or absence step on an unknown, ambiguous, mis-kinded, wrong-role or route-less locator is STEP_UNGROUNDED" },
  { file: C + "qa-run-input-value.test.mjs", title: "AC-9 an expect_value on a locator the snapshot lacks, or lists twice, is STEP_UNGROUNDED" },
  { file: C + "qa-run-stable-grounding.test.mjs", title: "AC-2 a step is planned from an inline candidate only when the snapshot counted exactly one element: zero or several is STEP_UNGROUNDED" },
  { file: C + "qa-run-stable-grounding.test.mjs", title: "AC-2 end to end: paragraph, list-item and quoted-colon text reaches the snapshot file with real match counts" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 a locator step after the case own interactions is grounded against the post-interaction snapshot" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 a step before the interaction, and the interaction itself, are grounded against the plain snapshot" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 only the goto, click and fill steps of the case count" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 a post-interaction snapshot is not consumed when the history of the case is not exactly its prefix" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 two post-interaction snapshots of one role and route are told apart by the history of the case" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 a plan with plain snapshots only refuses with the sentences it always had, byte for byte" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 the report-sourced rule applies only to a consumed prefix" },
  { file: C + "qa-run-grounding-prefix-consumption.test.mjs", title: "AC-11 end to end through the real runner: a post-interaction file is loaded and consumed at plan time" },
  { file: C + "qa-run-grounding-prefix-loop.test.mjs", title: "AC-11 end to end: ground writes the files and one run consumes them" },
  { file: C + "qa-run-network-grammar.test.mjs", title: "AC-12 validateStep refuses every shape outside the closed step as PLAN_ENTRY_INVALID with a reason" },
  { file: C + "qa-run-grounding-prefix-contract.test.mjs", title: "AC-10 carry-over DQ18: the doc says a navigating click does not reset the absence anchor" },
];
const FLAKE_BUDGET = 2;
const fail = (m) => { console.error("FAIL: " + m); process.exit(1); };
if (!existsSync("node_modules/playwright/package.json")) fail("node_modules/playwright is not resolvable from the worktree root; the qa-run test files resolve it from here, so provision it first (npm install, or a directory junction to the main checkout node_modules)");
const run = spawnSync(process.execPath, ["--test", "--test-reporter=tap", "scripts/validate/**/*.test.mjs"], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, timeout: 20 * 60 * 1000 });
if (run.error) fail("the corpus run did not complete: " + run.error.message);
const lines = run.stdout.replace(/\r\n/g, "\n").split("\n");
const problems = [];
const counters = {};
for (const l of lines) { const m = /^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(l); if (m) counters[m[1]] = Number(m[2]); }
for (const k of ["tests", "pass", "fail", "cancelled", "skipped", "todo"]) if (!Number.isInteger(counters[k])) problems.push("missing summary counter: " + k);
const plan = lines.find((l) => /^1\.\.\d+$/.test(l));
if (!plan) problems.push("missing plan line");
if (!/^TAP version \d+$/.test(lines[0] ?? "")) problems.push("missing TAP version header");
const okCount = lines.filter((l) => /^ok \d+ - /.test(l)).length;
const failures = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^not ok (\d+) - (.*)$/.exec(lines[i]);
  if (!m) continue;
  const block = [];
  for (let j = i + 1; j < lines.length && lines[j].startsWith("  "); j++) { block.push(lines[j]); if (lines[j] === "  ...") break; }
  const loc = /^ {2}location: \x27(.*?)(?::(\d+):(\d+))?\x27$/m.exec(block.join("\n"));
  let file = loc ? loc[1] : null;
  if (file === null && /\.test\.mjs$/.test(m[2])) file = m[2];
  failures.push({ title: m[2], file: file === null ? null : relative(process.cwd(), resolve(file.replace(/\\+/g, "/"))).split(sep).join("/") });
}
if (counters.fail !== failures.length) problems.push("# fail " + counters.fail + " but " + failures.length + " not ok lines");
if (counters.pass !== okCount) problems.push("# pass " + counters.pass + " but " + okCount + " ok lines");
if (counters.tests !== okCount + failures.length) problems.push("# tests " + counters.tests + " but " + (okCount + failures.length) + " result lines");
if (plan && Number(plan.slice(3)) !== counters.tests) problems.push("plan " + plan + " disagrees with # tests " + counters.tests);
if ((counters.cancelled ?? 0) > 0) problems.push(counters.cancelled + " cancelled test(s)");
if (run.status === 0 && failures.length > 0) problems.push("exit 0 with failures in the report");
if (run.status !== 0 && failures.length === 0) problems.push("exit " + run.status + " with no failing test in the report (runner crash or kill)");
const unattributed = failures.filter((f) => f.file === null);
if (unattributed.length > 0) problems.push(unattributed.length + " failing test(s) carry no location");
if (problems.length > 0) fail("unparseable or inconsistent corpus output: " + problems.join("; "));
const allowed = (f) => ALLOWED.some((a) => a.file === f.file && f.title.startsWith(a.title));
const other = failures.filter((f) => !allowed(f));
if (other.length > FLAKE_BUDGET) fail(other.length + " failing test(s) outside the allowlist exceed the load-sensitivity budget of " + FLAKE_BUDGET + ", in " + [...new Set(other.map((f) => f.file))].join(", ") + ": " + other.slice(0, 5).map((f) => f.title).join(" | "));
const real = [];
for (const file of [...new Set(other.map((f) => f.file))]) {
  const again = spawnSync(process.execPath, ["--test", file], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  if (again.error || again.status !== 0) real.push(file);
}
if (real.length > 0) fail("test file(s) outside the allowlist that also fail when run alone, so not load-sensitive: " + real.join(", "));
console.log("PASS: " + counters.pass + " passed, " + (failures.length - other.length) + " allowlisted stale failure(s), " + other.length + " load-sensitive failure(s) that pass alone" + (other.length > 0 ? " (" + [...new Set(other.map((f) => f.file))].join(", ") + ")" : ""));
'
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given a locator step whose `role` plus `name` or `text` appears in the case's manual steps (whitespace collapsed, case ignored) and that no grounding snapshot lists with `matches` 1, when the plan is validated, then it is valid and the runner resolves it when the case runs: exactly one match passes, and no match or several end the case `needs-human` `STEP_UNGROUNDED` with nothing acted on (a step grounded by a snapshot entry keeps its 0.46.0 outcomes: a missing element fails a positive step and blocks a click). A locator taken neither from the report's words nor from a snapshot entry with `matches` 1 is refused `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, with the three refusal sentences it always had and no locator word; an empty or non-string report grounds nothing. `precheckGroundedSteps` keeps its signature and result shape and is the `refusal` of the new `groundLocators`, which also returns the indexes of the steps resolved at run time.
- **AC-A2 (PRD AC-7):** Given a step with `within: { role, name }` (or `{ role, name_prefix }`), when it runs, then its locator matches only inside the single element the scope resolves to, through chained locators and never `locator.within()`, so an `expect_not_visible` inside a group passes when the element exists only elsewhere; a scope that matches zero or several elements ends the case `needs-human` `STEP_UNGROUNDED` before anything is acted on, and an `expect_not_visible` whose scope is missing or not visible to a person asserts nothing instead of passing. Given `name_prefix` in place of `name`, then the accessible name matches by its start (case-sensitive), so a header named `Alunos (12)` resolves from `Alunos` and not from a middle substring.
- **AC-A3 (PRD AC-8):** Given an input whose label text shares its nearest container with it and has no `for` or `aria-label`, when an `expect_value` or `fill` step names `{ "label_text": "E-mail*" }`, then it acts on that input (the label element must match exactly one, the nearest ancestor of it that holds exactly one `input`, `textarea` or `select`, a hidden input ignored, supplies the control), and the comparison evidence of the `expect_value` step records the plan's locator keys and never the compared value; given two inputs in that container, then the case ends `needs-human` `STEP_UNGROUNDED`. `label_text` is refused for `expect_text` and `expect_not_visible`, and `expect_value` and `expect_state` accept only a control locator.
- **AC-A4 (PRD AC-9):** Given unnamed buttons inside a grounded container, when a `click` step names `{ "within": {…}, "role": "button", "index": 0 }`, then it clicks the first of the container's buttons in document order, named or not; an `index` past the last element ends the case `needs-human` `STEP_UNGROUNDED`, and an `index` without `within` or `role`, with a `name` or `name_prefix`, or that is negative or not an integer is `PLAN_ENTRY_INVALID`.
- **AC-A5 (PRD AC-10):** Given `expect_requests` with `"method": ["POST", "PATCH", "PUT"]`, when the page issues one PATCH to the matching path, then the step counts 1 and passes, and the evidence file records the array as given; a single-string `method` behaves as in 0.46.0; an empty array, a repeated name, a name outside the six, a non-string member or any other type is `PLAN_ENTRY_INVALID`, and the validator never throws on a hostile value.
- **AC-A6 (PRD AC-22):** Given `plugins/relay/commands/relay-qa-run.md`, when it is read, then each new key (`within`, `name_prefix`, `label_text`, `index`) has a literal flat example preceded by its `<!-- qa-step-example driver=browser -->` marker that validates alone against the script, the two locator sources and the method array are stated, the sentences that stated the snapshot-only rule are reworded, and `docs/api-reference.md`, `docs/domain/glossary.md`, `docs/domain/flows.md`, `documentation/reference/commands.html`, `documentation/reference/scripts.html` and `documentation/changelog.html` state the same; the changelog carries one `Added` and one `Changed` entry under `Unreleased`; every phrase and paragraph start that an existing doc-pin test reads is intact except the one sentence listed in `## Notes`; no page is added and NAV, the search index and the plugin version are unchanged. The `judge` and `preflight` clauses of PRD AC-22 and the usage text belong to Phases 5 and 7 and are untouched.
- **AC-A7 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (none added or extended), the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, passes the corpus gate of `## Validation Commands` (an allowlist of exactly the eighteen stale tests and the load-sensitivity rule), and the five frozen surfaces and every test file are byte-identical to the phase-2 end state. This criterion is verified by Levels 1 to 3 and delivered by every task keeping its constraints; it has no dedicated task.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A locator resolved at run time from the report's words matches the wrong control after a re-layout, or an unscoped `expect_not_visible` of a report word passes because nothing matches (a typo or a different phrasing in the product) | M | H | The exactly-one rule at run time (zero or several end the case `needs-human` `STEP_UNGROUNDED`, never a pass); the absence anchor still demands a positive step on the same route; a scoped absence also demands its scope to exist once and be visible; evidence (the full-page capture) shows the page; the Phase 9 dogfood reads every pass and runs a negative control per new step kind. The residual (an absence by a word the product never renders) is the same one a snapshot-listed entry has once its element disappears, and is recorded here rather than closed |
| Playwright 1.61.1 / Chromium 149 semantics the plan relies on are not confirmed from a primary source: a `RegExp` accessible name anchored with `^` as a start match, the chained `xpath=ancestor-or-self::...` form, and `nth()` in a chain (research-web found only the generic docs and the injected engine source; the whitespace/NBSP rule was summarized, not verified) | M | M | The Task 3 gate probes each on a real page before the end-to-end run (`Alunos (12)` matched by `Alunos` and not by `unos`, the label walk with one and two inputs, the scope picking one twin) and fails if any differs; the label walk and the prefix are fixed constants in one place, so a correction touches one function; the prefix regex joins words with `\s+` so a non-breaking space in the name still matches |
| Eighteen existing tests assert the old rule and go stale (most need only a code literal changed; the largest rewrites are the `qa-run-ui-grounding` end-to-end test, whose manuals name the locators it wants refused, and the refusal table of its `precheckGroundedSteps` test) | H | M | Listed by title, assertion and cause in the corpus-gate allowlist and in `## Notes`; the refusal sentences are kept byte-identical so reason assertions still hold and only codes change; the gate tolerates exactly those and fails on anything else; the Implementer edits no test (R-X) |
| A doc edit breaks a pinned sentence, paragraph start, ordering rule, sentence-splitting rule or example-count rule | M | M | Task 4 lists every pin it must keep and the one it rewords (`DQ18`, allowlisted); the new examples avoid the three actions and the one `expect_requests` example that tests count; Tasks 4 to 7 run the test that pins the page they edit |
| New runner code or comments disturb a source-text pin or a test mutation anchor (a second `writeFileSync(`, `// WRITE-SITE`, `outcome:` literal, a repeat of the `const abs = ...` line, a quoted section marker, helpers placed before `precheckGroundedSteps` so the section loses `interactionHistory(`) | M | H | Tasks 1 to 3 list the forbidden strings and the placement rule; Level 2 runs the real-tree contract and asserts the anchor line occurs once |
| A hostile plan value (an object with a `toString` key, a nested array, an array-like) makes a new validator throw or coerce | M | M | Every new parser is total by construction (`Object.keys`, `Array.isArray`, `typeof` and strict comparisons only, no interpolation of a plan value); Task 1's gate feeds six hostile values to each of the four new keys and to the method check |
| `index` selects the Nth element of a role among named and unnamed ones, which surprises a planner who counts only the unnamed | M | L | Stated in the command doc and in AC-A4; the planner is told to plan it only from what the report or the snapshot says about the order; a wrong pick is visible in the evidence and caught by the dogfood |
| The gate takes about two minutes (four 10-second zero-match waits, three 5-second settles, nineteen browser launches) and the full corpus gate about five more | H | L | The gate states its duration; it runs alone and never overlapped; the 270-second kill timer is generous |
| The validation commands were derived by reading the tree, not executed (the plan writer has no shell) | M | L | They reuse the fixture shape of the shipped input-value tests and of the phase-2 plan; the Implementer runs each against the pre-change tree first and expects the stated failure |
| The `Grounding browser steps.` section still tells the planner to plan no locator step for a route whose `ground` halted, although the report's words now ground some | M | L | Deliberately untouched: that section is pinned by the stable-grounding tests and the conservative instruction stays correct; a later phase may relax it |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, adds no step, mode or reason code, and keeps every phase-1 and phase-2 contract |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. (Levels 2 and 3 and the doc tasks run the existing test files only as regression guards; running a test is not touching it.)
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A6).** `groundLocators` and `precheckGroundedSteps` (a snapshot entry grounds and leaves `runtime` empty; the report's words ground and put the index in `runtime`; the report text compared whitespace- and case-insensitively; an empty, blank or non-string report grounds nothing; a neither-source locator and a 2-match entry not in the report are `PLAN_ENTRY_INVALID` with the old sentences; scoped steps with a snapshot-listed scope and a report-word target, with `index`, with `label_text` against a text entry; the post-interaction fill rule still applies only when the snapshot grounded the step); `locatorOf`, `scopeOf`, `validateStep` and `validateSteps` for every valid and refused combination of the four keys, `isControlLocator`, the `label_text` refusals for `expect_text` and `expect_not_visible`, `groundingStepKey` null for a scoped step, hostile values never throwing; `expect_requests` method arrays (accepted forms, the six refusals, `evaluateRequestWindow` counting any member, the evidence recording the array); `buildLocator`, `scopeLocator`, `resolveScopeElement` (one, none, several) and the label walk on a real page (one input, two inputs, a hidden input ignored, the label text matching several elements); the end-to-end `run` cases of the Task 3 gate (the report-word pass, the zero-match and twin `STEP_UNGROUNDED`, the scoped absence in its three forms, the prefix, the label, the index, the hidden scoped target, the method array); the doc: a marked example per new key that validates alone, and the paragraph starts and order the new block must respect.
- **Test-pair follow-up, existing tests to update (`EXISTING_TEST_UPDATED`).** The eighteen tests of the corpus-gate allowlist, each by editing the expectation the table names: mostly the code literal `'STEP_UNGROUNDED'` → `'PLAN_ENTRY_INVALID'` for a locator that is neither a snapshot entry nor a report word (the reason sentences are byte-identical, so every regex and `step N:` assertion still holds); in `qa-run-ui-grounding` the table rows 4-8 and `moved` need a manual text without `save` so they stay refused, and the end-to-end test needs manuals that do not name the locators; `qa-run-network-grammar` moves the `['POST']` row to an accepted case and adds the array refusals; `qa-run-grounding-prefix-contract` `DQ18` pins the new wording `The element is grounded like any other locator step: by the plain snapshot, by the one a `--prefix` ground wrote after the interactions of the case, or by the report's own words (see Grounding rules below).` Tests that still pass but whose message now misleads and may be cleaned: `qa-run-ui-grounding` `AC-13 end to end: a grounded role, text and fill locator passes and acts exactly once` (case 2 is now valid at plan time and ends `needs-human` `STEP_UNGROUNDED` at run time, "refused at plan time" is stale text) and `AC-13 precheckGroundedSteps refuses...` neighbours. Files the research confirmed unaffected: every other `qa-run*.test.mjs` (they use `selector` steps, ground every locator by a snapshot entry that matches once, or test rules this phase does not touch); `qa-run-network-contract` `:92` and the contract baselines hold if the section pins and the `precheckGroundedSteps` behaviour pins (called with an empty report) hold.
- **Cross-phase hand-off (AC-5, second clause, Phase 5).** Phase 2 deferred "a `judge` step with a locator scope also writes an element screenshot of that scope" because `within` did not exist. This phase delivers `within`, and exports the pieces Phase 5 composes: `scopeOf(within)` validates the `within` object of a `judge` step with the same rules, `resolveScopeElement(page, scope)` returns `{ ok: true, locator }` for a scope that matches exactly once (waiting up to 10 seconds for it to attach), and the existing `captureElementPng(locator, masks)` takes that locator. Phase 5 owns the evidence file name (`case-<k>.element-<n>.png` is the natural choice by the existing per-step convention), must route the write through `writeEvidence`, and must withhold the capture on a page that holds a secret exactly as the final capture does. This phase wires `captureElementPng` to no step.
- **Design decisions made here.** (1) Precedence: a snapshot entry with `matches` 1 beats the report's words, so every step that was valid in 0.46.0 behaves exactly as before at run time (zero matches still fail a positive step and block a click); only a step valid through the report's words alone, or any scoped step, is resolved with the new zero-match rule. (2) The report-word comparison reuses the existing `collapse` (whitespace collapsed, lowercased, substring) that the `expect_text` rule already uses, so "verbatim" means the same thing everywhere; the run-time match itself stays exact and case-sensitive. (3) The refusal sentences are kept byte-identical and only the code changes, which keeps the diff to the existing tests to a code literal; the cost is that "the locator is not a snapshot entry" no longer names the second source, which the command doc does. (4) Scoped steps are always resolved at run time because a snapshot lists page-wide candidates only; every word a scoped step carries must still come from the report or from a snapshot entry with `matches` 1 (a scope may be a `name_prefix` too, and a prefix word is grounded by a snapshot role entry whose name starts with it). (5) A group-scoped `expect_not_visible` additionally requires its scope to exist once and be visible, so the group-scoped absence of KD-17 cannot pass vacuously; the anchor rule (a positive step on the route) is unchanged. (6) `name_prefix` is an anchored, case-sensitive regular expression built from the words of the prefix joined by `\s+`; Playwright documents that a string name is a case-insensitive substring unless `exact` is set and that `exact` is ignored for a regular expression, so the regular expression is the only form that gives a start match (https://playwright.dev/docs/api/class-page#page-get-by-role). (7) The label walk is an XPath (`ancestor-or-self::*[count(...) = 1][1]`) followed by a fixed CSS for the control: counts only grow going up, so the nearest container with any control has exactly one (the target) or more (nothing matches); Playwright derives an input's label from the browser's `labels` collection, and the HTML spec labels only the first labelable descendant when `for` is absent, so a sibling label has no control and the walk is custom behaviour (no primary source documents it). (8) `index` counts the elements of the role in the scope in document order, named or not; Playwright documents `nth()` as zero-based and as a strictness opt-out, which is why the index is checked against the count first. (9) `runtime_steps` is an in-memory field of the plan object handed to the driver, set after the spread of the plan entry so a plan cannot supply it; it is never written to `plan.json`. (10) The scoped locator evidence of a comparison step records the plan's own locator keys; the plan already holds those words, and the value, its length and the expected string are never written.
- **Research.** `research-codebase` located `locatorOf` / `stepRules` / `validateSteps` (no allow-list exists for a locator step, so `within` and `index` are silently ignored today), `precheckGroundedSteps` (it already receives the manual text; its old refusals were `STEP_UNGROUNDED`, not `PLAN_ENTRY_INVALID`), every site that rebuilds a locator (the mask at `:2761`, `groundingStepKey`, `parseGroundPrefix`'s closed key list), the `expect_requests` validation and evidence, the command-doc marker convention and the contract pins. Four follow-up read-only passes simulated every `qa-run*.test.mjs` assertion against the new rule and listed the doc pins of each page this phase edits; the allowlist and the pin constraints above are their result (a pass that read only part of a file is noted there as unsettled and was resolved by keeping the pinned phrase). `research-web` found, with sources: `getByRole` `name` is a case-insensitive substring unless `exact` is set, and `exact` is ignored for a regular expression (https://playwright.dev/docs/api/class-page#page-get-by-role); the role engine whitespace-normalizes the accessible name and passes a regular expression through unchanged (https://raw.githubusercontent.com/microsoft/playwright/main/packages/injected/src/roleSelectorEngine.ts); locators are strict and `first()`, `last()` and `nth()` are the documented opt-outs (https://playwright.dev/docs/locators); `locator.locator()` and `locator.getByRole()` search the locator's subtree, `nth()` is zero-based (https://playwright.dev/docs/api/class-locator); `locator.within()` arrives in v1.64 and resolves `nth()` per parent (https://playwright.dev/docs/release-notes), which is why scope is a chain here; an input's label comes from the browser's `labels` collection (https://raw.githubusercontent.com/microsoft/playwright/main/packages/injected/src/roleUtils.ts) and a label without `for` labels only its first labelable descendant (https://html.spec.whatwg.org/multipage/forms.html#the-label-element). Gaps recorded by the research: the docs and source read were of the current tree, not the v1.61 tag; the interplay of the case-insensitive uppercasing with a regular expression name, the NBSP rule and `nth()` on a multi-parent chain were not confirmed, and no source documents the nearest-container label walk (it is the PRD's own algorithm). The Task 3 gate probes each on the pinned Chromium. All line anchors in this plan were checked against the worktree files.
- **Anchor lines and pins to keep (collected for the Implementer).** The line `const abs = join(ctx.runDirAbs, 'evidence', name);` must occur exactly once. Do not add a second occurrence of any of: `if (isObj(record)) {`, `const ANONYMOUS_CHECK_MS = 20000;`, `maxRedirects: 0`, `if (!a.includes('://')) continue;`, `if (u.origin !== target.origin) return null;`, `return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();`, `const keepSteps = result.outcome === 'blocked' || result.outcome === 'needs-human';`, `loadPlaywright(root, PLUGIN_ROOT);`. The text between `export function precheckGroundedSteps(` and `export function summarizeEntries(` must contain `interactionHistory(` and `isPostInteractionSnapshot(`; the text between `async function runLocatorStep(` and `DRIVERS.browser = async (` must contain `'expect_value'`, `'expect_not_visible'` and `'expect_state'`; the text between `DRIVERS.browser = async (` and `export function mintExpiryDue(` must keep its five network tokens. The copy-helper tests copy only `qa-run.mjs` and `auth-local-guard.mjs`, so no new sibling import, static or dynamic.
- **Docs sync and scope.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). The `qa-run.mjs` row of `docs/api-reference.md` is not edited either (see `## NOT Building`). Under `documentation/` only `reference/commands.html`, `reference/scripts.html` and `changelog.html` change, following `documentation/AGENTS.md`: no page is added, so NAV and the search index are untouched, and `plugin.json` keeps its version. The `docs_sync` pass at implement time finds Task 5 already done. `documentation/reference/validation-checks.html` is untouched because `qa-run-contract` is untouched. `plugins/relay/resources/redaction-policy.md` is not edited: nothing it states about evidence changes.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). `node_modules` in the worktree is a directory junction to the main checkout's (Playwright 1.61.1, Chromium 149): do not modify it; the end-to-end commands spawn the real runner by absolute path, so Playwright resolves by directory walk from `plugins/relay/scripts/visual/`, and `import { chromium } from "playwright"` in the Task 3 command resolves from the working directory.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 3 are gates that fail before the work (the new names are not exported; the report-word case is refused at plan time). Tasks 4 to 7 are gates that fail before the work (the authored literals are absent) and then run the existing tests that pin the page they edit, which pass before and after. The Level 1 frozen-surface and changed-file checks pass on the unmodified tree by design; the Level 2 export check fails on it. The inline corpus-gate parser is adapted from the one in the shipped phase-2 plan, which an agent validated against the real baseline TAP output; this version adds an allowlist of title prefixes, which has not been run.

*Generated: 2026-10-21*
*Approved: 2026-10-21*
*Implemented: 2026-10-21*
*Status: IMPLEMENTED*
