# Feature: Request without a session, input value, absence and state (Phase 4 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the closed step vocabulary of `qa-run.mjs`, the `relay-qa-run.md` planning doc, the `qa-run-contract` validation check); secret and personal-data handling in run evidence (an input value read from a page); a new network-touching request path under the local-only guard (the session-less request); extension of the closed step vocabulary of a standalone command
- Decisions found:
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Absence assertion anchor": `expect_not_visible` is valid only after a passed positive step on the same route and case, because a mistyped name would pass vacuously, which is exactly the false `pass` the metrics forbid
  - Same PRD, Decisions Log "Input values in evidence": `expect_value` records the comparison result and never the value, because input values are personal data and PS14 is a high-severity privacy finding
  - Same PRD, Architecture Notes "New request sites reuse the loaded guard" (no second `// GUARD-SITE`; `qa-run-contract` requires exactly one) and "Absence and state assertions need an anchor" (expectations come from the report's own steps, never from the snapshot)
  - Same PRD, Decisions Log "Validation checks": extend `qa-run-contract`; the count stays 28; "Frozen surfaces": the review-loop files, `capture.mjs` and `/relay-qa-report` stay byte-identical (AC-14)
  - Same PRD, Open Question 3 (the `[expanded]` / `[disabled]` snapshot tokens, and whether `expect_state` reads `aria-expanded` or the token): resolved in this plan (see `## Notes`)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the local-only guard is permanent, the outcome vocabulary is a closed set, secrets never reach reports, the human gate stays open
  - [2026-04-19] "Secret redaction policy for Test Runner reports" and [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`"
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen
  - [2026-07-09] every `## Validation Commands` entry and per-task `VALIDATE` must carry real exit-code semantics; [2026-07-10] R-X strict, the Implementer authors zero test files and test edits go through the test pair's lifecycle ledger (both cited by `docs/context/methodology.md` and the earlier phase plans of this feature)
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": accessibility snapshots, screenshots, input values and registered session values are the leak surfaces; every new reason, evidence field and stdout line carries fixed words, counts and step positions only, never a value
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing assertion is made stale by this design (see `## Notes`); if the test pair finds one this analysis missed it is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the command stays non-interactive
  - Command versus script separation: the planning doc proposes plan entries; the script validates, guards, executes, redacts and reports
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` and is written only through `writeRunFile` (via `writeEvidence`)
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`): the session-less request reuses the already-loaded `checkTarget` guard and adds no site
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, here with the tree object recorded after Phase 3
  - `qa-run-contract` invariants stay true: the exact `OUTCOMES` literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`, one `export const REASON_CATALOGUE`, no static sibling import
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 4: "Request without a session, input value, absence and state" — Goal: the six smaller needs-a-new-driver cases can run to a verdict — Success signal: fixtures shaped like A-2 (401 without a session), S-1 (non-empty input), and case 20's absence and expanded-state checks pass and fail correctly; an absence step with no positive anchor is refused before any side effect.

## Summary

This phase adds exactly the four step additions the six smaller needs-a-new-driver cases need, on the runner side and in the planning doc, with no new reason code and no new outcome. An `http` `request` step may carry `"session": "none"` and is then sent through a fresh request context with no cookie, no storage state and no derived header, behind the same local-only guard (the case's authenticated steps keep the role's context). A browser step `expect_value` compares a grounded input's value (`equals`, `contains` or `not_empty`, with `{{name}}` bindings) and records only which comparison ran and whether it passed, and the final screenshot masks the field. `expect_not_visible` is accepted only after an earlier positive step on the same route in the same case (refused `PLAN_ENTRY_INVALID` before any side effect otherwise) and passes only when its grounded locator is hidden or absent; `expect_state` passes only when `expanded`, `disabled` or `checked` equals the declared boolean, read through Playwright's locator API rather than the snapshot token, and a state the element does not expose is a blocked case, never a pass. The doc gains four marked literal examples and the carry-over fix of the mode list (`ground` was missing), `qa-run-contract` is extended behind a new opt-in flag (no 29th check), and one policy sentence is made precise.

## User Story

As the operator of relay's human validation gate
I want the runner to check "rejected without a token", "this field is not empty", "this item is gone" and "this group is expanded" itself
So that the cases that need exactly those checks run to a verdict with evidence instead of coming back as `PARTIAL_REMAINDER` or `VOCABULARY_GAP`, and the value of a personal field never reaches a file

## Problem Statement

The HTTP driver attaches the role's storage state and token header to one request context for the whole case (`DRIVERS.http`), so only a plan entry with no `role` can send an anonymous request, and even that is refused `API_HEADER_NO_SESSION` for a header-bearing origin. The browser vocabulary is `goto`, `click`, `fill`, `expect_visible`, `expect_text`, `expect_url` and `query`: there is no absence assertion, no state assertion and no input-value assertion, so A-2, S-2, S-1, S-4 and case 20 each turn into `PARTIAL_REMAINDER` or `VOCABULARY_GAP`. Playwright documents `expanded`, `disabled` and `checked` as accessibility-snapshot attributes but has no `toBeExpanded`, and it counts a locator that matches nothing as hidden, so an absence or state assertion written carelessly passes vacuously, which is the false `pass` the metrics forbid.

## Solution Statement

Runner side, planning-doc side and the contract check only. `stepRules` gains a closed `session` rule and three locator rules; `validateSteps` gains the one sequence rule (an absence needs an earlier positive step on the same route since the last `goto`); `precheckGroundedSteps` gains the "expectation comes from the report" rule for `expect_value` literals. A pure `httpContextOptions` helper and a per-step `fetchAnonymously` give the session-less step its own isolated context behind the existing guard calls (`prepareApiStep` and the `executeCase` pre-loop skip header derivation for `session: "none"`). A pure `settleAssertion` helper (the injectable shape of `waitForStableSnapshot`) re-reads a value or state for a bounded window, never returns the value, and maps a read that never succeeds to a blocked case. `relay-qa-run.md` gains the four marked examples and the rules; `qa-run-contract` gains `requireVocabulary`. No test file is touched by the Implementer.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `plugins/relay/resources/redaction-policy.md`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | `Depends` is `1` (complete); shares `lane:qa-run` with phases 1 to 6, so it runs serially after phases 1 to 3 (all `complete`); Phases 5 (`Depends` 2, 4) and 6 (`Depends` 4) build on it |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 108-110 and 115 (AC-8, AC-9, AC-10, AC-15), 114 and 117-118 (AC-14, AC-17, AC-18), 125 (Open Question 3), 201 and 203 (Architecture Notes), 230 (row 4), 255-258 (Phase Details), 295-296 (Decisions Log) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 108-110, 114-115, 117-118, 125, 201, 203, 230, 255-258, 295-296 | AC-8, AC-9, AC-10, AC-15, the frozen-surface, suite and doc criteria, Open Question 3 (resolved here), the two Architecture Notes, row 4, the Phase Details and the two Decisions Log rows |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1071-1101 | the vocabulary constants and `locatorOf` (the role-and-name or text locator form every new step reuses) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1164-1296 | `stepRules`, `stepVariables`, `validateStep` and `validateSteps`: where the `session` rule, the three locator rules and the anchor rule go |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1307-1314 and 1342-1349 | `recordSteps` (generic per-step records; needs no change) and `routeKey` (the route normalizer the anchor rule reuses) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1434-1468 and 1479-1506 | `waitForStableSnapshot` (the injectable-clock shape `settleAssertion` mirrors) and `precheckGroundedSteps` (the "expectation comes from the report" rule) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1921-1953 | `resolveApiOrigin` and `prepareApiStep`: the guard-first path and the header derivation that `session: "none"` skips |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2019-2107 | `sessionAuthHeaders` and `DRIVERS.http`: the single case-level request context and the fetch that gets its per-step anonymous variant |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2119-2260 | `runLocatorStep` (the strict exactly-one resolver with its fall-through to `expect_text`) and `DRIVERS.browser` (the step loop, the per-step evidence map and the final screenshot) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3039-3064 | `executeCase`: `validateSteps` before any side effect, the origin pre-loop with its `API_HEADER_NO_SESSION` rule, and the grounding pre-check |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 28-32, 211-256, 285-321 and 499-522 | the see-list with the missing `ground`, the closed vocabulary and its marked examples, the origin paragraph and the honesty rules being extended |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 41-55, 215-223, 339-358, 385-401 and 503-516 | the import list, the opt-in flag signature, the doc-example loop, the doc-token rules and the real-tree entry point |
| P0 | `plugins/relay/resources/redaction-policy.md` | 218-241 | the snapshots, screenshots and personal-data subsection whose `Input values` bullet is made precise |
| P1 | `scripts/validate/checks/qa-run-case-vocabulary.test.mjs` | 30-91 and 322-370 | read-only: the nested-form, reason-prefix and doc-example pins (the doc examples must stay stateless-valid and the driver set must stay exactly `browser` and `http`) |
| P1 | `scripts/validate/checks/qa-run-ui-grounding.test.mjs` | 85-152 and 719-759 | read-only: the locator-form, legacy-message (`click needs a string selector`) and NO_EXPECTATION pins, and the doc picks of the FIRST role-and-name and FIRST text example |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 452-458, 750-767 and 848-889 | read-only: the HTTP driver tail anchor, the `maxRedirects: 0` anchor and the `request: { method: step.method, path: step.path }` anchor and its `deepEqual` |
| P1 | `scripts/validate/checks/qa-run-api-origins.test.mjs` | 200-277 | read-only: the `prepareApiStep` direct-call shapes (the fixture `ctx`, header equality, `null` headers, `API_HEADER_NO_SESSION`) this plan mirrors in its own VALIDATE |
| P1 | `scripts/validate/checks/qa-run-contract.test.mjs` | 55-124 | read-only: the real-tree baseline and the mutation anchors of the runner text |
| P1 | `scripts/validate/checks/qa-run-stable-grounding.test.mjs` | 386-440 | read-only: the doc slices (`Grounding browser steps.` to `The closed vocabulary.`, `Grounding rules.` to `Personal data.`, `### Record resolution`) the doc edit must leave untouched |
| P1 | `scripts/validate/checks/qa-run-classification.test.mjs` | 548-583 | read-only: the catalogue-table rows and the every-`json`-block rule (a new example must carry no `class` or `reason_code` key) |
| P1 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 65-74 | read-only: the required and forbidden tokens of the two files this plan edits (`--local-host` is forbidden as a substring) |
| P1 | `PRPs/plans/completed/qa-runner-grounding-vocabulary-v2-phase-3-redaction-precision-and-run-evidence-privacy.plan.md` | 835-909 | read-only: the Level 1 to 3 shape, the diff-base idiom and the corpus gating this phase mirrors |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1071-1076
const HTTP_ACTIONS = ['request', 'query'];
const API_ORIGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;
const BROWSER_ACTIONS = ['goto', 'click', 'fill', 'expect_visible', 'expect_text', 'expect_url', 'query'];
const API_HEADER_FORBIDDEN = ['host', 'content-length', 'cookie', 'transfer-encoding'];
const LOCATOR_ACTIONS = ['click', 'fill', 'expect_visible', 'expect_text'];
const LOCATOR_ROLES = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'heading', 'tab', 'menuitem', 'option', 'switch', 'searchbox', 'spinbutton', 'slider', 'dialog', 'alert', 'status', 'row', 'cell', 'columnheader', 'listitem', 'img', 'navigation', 'region', 'table', 'menu', 'tabpanel'];
```
Copied by Task 1 (`BROWSER_ACTIONS` and `LOCATOR_ACTIONS` each gain the three new action names; `HTTP_ACTIONS` and `LOCATOR_ROLES` stay byte-identical, so a browser action is still not an http action and the 27-role pin of the tests holds; the two new exported frozen lists sit directly after `LOCATOR_ROLES`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1189-1194
  if (driver === 'http') {
    if (s.action !== 'request') return bad(`unknown http action ${JSON.stringify(s.action)}`);
    if (!HTTP_METHODS.includes(s.method)) return bad('method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
    if (!isStr(s.path)) return bad('path must be a string');
    if (s.origin !== undefined && !(isStr(s.origin) && API_ORIGIN_NAME.test(s.origin))) return bad('origin must be a declared api_origins name of letters, digits, _ or -');
    if (s.expect_status !== undefined) {
```
Copied by Task 1 (the `session` rule is one line directly after the `origin` rule, with the same `bad('<fixed text>')` shape; no reason names a value, and the unchanged `method must be one of ...` text is pinned by a test).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1206-1214
  } else {
    const loc = LOCATOR_ACTIONS.includes(s.action) ? locatorOf(s) : null;
    if (loc !== null) {
      if (!loc.ok) return bad(`${s.action}: ${loc.why}`);
      if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');
      if (s.action === 'expect_text' && !isStr(s.contains)) return bad('expect_text needs a string contains');
      return { expectations: s.action === 'expect_visible' || s.action === 'expect_text' ? 1 : 0 };
    }
    switch (s.action) {
```
Copied by Task 1 (the three new rule groups sit after the `expect_text` rule and before the `return`; the returned expectation count widens from "`expect_visible` or `expect_text`" to the positive-assertion set plus `expect_not_visible`; the `switch` below gains explicit `case` arms so a new action with no locator key never reaches `unknown browser action` by accident and the legacy `selector` form is never accepted for them).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1282-1296
export function validateSteps(driver, steps, boundNames = []) {
  let expectations = 0;
  for (const [i, s] of steps.entries()) {
    const r = stepRules(driver, s);
    if ('why' in r) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${r.why}` };
    expectations += r.expectations;
    for (const name of stepVariables(s)) {
      if (!boundNames.includes(name)) {
        return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: variable ${name} is not bound by a capture declared for this case` };
      }
    }
  }
  if (expectations === 0) return { code: 'NO_EXPECTATION', reason: 'the plan entry carries no expectation step, so no pass could be earned' };
  return null;
}
```
Copied by Task 1 (the sequence rule is added inside this loop, after the variable-binding loop, so the first refusal still wins in step order and the `step N:` prefix is added here and only here; the `NO_EXPECTATION` tail is unchanged).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1479-1506
export function precheckGroundedSteps(steps, snapshots, manualText, role) {
  const wantRole = role === null ? 'anonymous' : role;
  const collapse = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
  /** @type {string | null} */ let route = null;
  for (const [i, step] of steps.entries()) {
    const n = i + 1;
    if (!isObj(step)) continue;
    if (step.action === 'goto' || step.action === 'expect_url') route = routeKey(step.path);
    if (!LOCATOR_ACTIONS.includes(step.action)) continue;
    const loc = locatorOf(step);
    if (loc === null || !loc.ok) continue;
    const snap = route === null ? undefined : snapshots.find((s) => isObj(s) && s.role === wantRole && s.route === route);
    if (snap === undefined) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step` };
    }
    const entry = (Array.isArray(snap.entries) ? snap.entries : []).find((/** @type {any} */ e) =>
      isObj(e) && (loc.form === 'role' ? e.kind === 'role' && e.role === loc.role && e.name === loc.name : e.kind === 'text' && e.text === loc.text));
    if (entry === undefined) return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator is not a snapshot entry` };
    if (entry.matches !== 1) {
      return { code: 'STEP_UNGROUNDED', reason: `step ${n}: the locator matched ${entry.matches} elements in the snapshot; a locator must match exactly one` };
    }
    if (step.action === 'expect_text') {
      const ok = isStr(manualText) && isStr(step.contains) && collapse(manualText).includes(collapse(step.contains));
      if (!ok) return { code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_text contains must come from the report's own steps, not from the snapshot` };
    }
  }
  return null;
}
```
Copied by Task 1 (every new action is in `LOCATOR_ACTIONS`, so it is grounded to exactly one snapshot entry of its own route and role by this loop with no change; the `expect_value` literal rule is a sibling of the `expect_text` rule and keeps its shape: a reason that names a step position and a key, never a value).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1434-1468
/**
 * Reads the page's accessibility snapshot until two successive reads are equal, within a bound. The
 * reader, the clock and the sleep are injectable, so a test drives the loop with a fake clock and no
 * browser. A rejected or non-string read is unreadable: it resets the pair and never counts as equal.
 * @param {() => Promise<string | null>} read
 * @param {{ boundMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number }} [opts]
 * @returns {Promise<{ status: 'stable', yaml: string, reads: number } | { status: 'unstable', reads: number } | { status: 'unavailable' }>}
 */
export async function waitForStableSnapshot(read, opts = {}) {
  const boundMs = opts.boundMs ?? GROUND_STABLE_BOUND_MS;
  const intervalMs = opts.intervalMs ?? GROUND_POLL_INTERVAL_MS;
  const sleep = opts.sleep ?? ((/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms)));
  const now = opts.now ?? (() => performance.now());
  /** @returns {Promise<string | null>} */
  const take = async () => {
    try {
      const v = await read();
      return isStr(v) ? v : null;
    } catch {
      return null;
    }
  };
  /** @type {string | null} */ let previous = await take();
  if (previous === null) return { status: 'unavailable' };
  const deadline = now() + boundMs;
  let reads = 1;
  while (now() + intervalMs <= deadline) {
    await sleep(intervalMs);
    const current = await take();
    reads++;
    if (current !== null && current === previous) return { status: 'stable', yaml: current, reads };
    previous = current;
  }
  return { status: 'unstable', reads };
}
```
Copied by Task 3 (`settleAssertion` takes the same `{ boundMs, intervalMs, sleep, now }` option bag, the same default sleep and clock, and the same "a throwing read is unreadable, never accepted" rule; unlike it, it returns only a status word and a read count, never the value it read).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1942-1953
export async function prepareApiStep(ctx, step, n, session) {
  const r = await resolveApiOrigin(ctx, step, n);
  if (!r.ok) return r;
  if (r.spec.header === null) return { ok: true, url: r.url, headers: null };
  if (!session || !isStr(session.path)) {
    return { ok: false, result: blocked('API_HEADER_NO_SESSION', `step ${n}: the origin ${r.spec.name} derives a header from the role session, but this case has no session`) };
  }
  const derived = deriveApiHeader(r.spec, readJsonOrNull(session.path), r.host);
  if (!derived.ok) return { ok: false, result: blocked(derived.code, `step ${n}: ${derived.reason}`) };
  addSecretValues(ctx.table, [derived.value, derived.raw]);
  return { ok: true, url: r.url, headers: { [derived.name]: derived.value } };
}
```
Copied by Task 2 (the guard call inside `resolveApiOrigin` still runs first and unchanged; only the "no header to derive" return widens to also cover `step.session === 'none'`, so a session-less step to a header-bearing origin is guarded, resolved and sent with `headers: null`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2027-2060
DRIVERS.http = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ const opts = { baseURL: target.origin };
  if (session && session.path) opts.storageState = session.path;
  if (session && session.token) opts.extraHTTPHeaders = sessionAuthHeaders(session);
  /** @type {string[]} */ const evidence = [];
  /** @type {any} */ let reqCtx = null;
  /** @param {CaseResult} res @param {number} at zero-based index of the step that ended the case @returns {CaseResult} */
  const ended = (res, at) => ({ ...res, steps: recordSteps(plan.steps, at + 1, at, (j) => evidence[j] ?? null) });
  try {
    reqCtx = await ctx.playwright.request.newContext(opts);
    for (const [i, step] of plan.steps.entries()) {
      if (step.action === 'query') {
        const q = await runQueryStep(ctx, kase, step, i + 1);
        if (!q.ok) {
          for (const e of q.result.evidence) evidence.push(e);
          return ended({ ...q.result, evidence }, i);
        }
        evidence.push(q.evidence);
        continue;
      }
      const apiStep = isStr(step.origin) ? await prepareApiStep(ctx, step, i + 1, session) : null;
      if (apiStep !== null && !apiStep.ok) return ended({ ...apiStep.result, evidence }, i);
      const url = apiStep !== null ? apiStep.url : resolveStepUrl(step.path, target);
      if (url === null) return ended(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`, evidence), i);
      /** @type {any} */ let resp;
      try {
        /** @type {any} */ const fo = { method: step.method, maxRedirects: 0, timeout: 10000, failOnStatusCode: false };
        if (step.body !== undefined) fo.data = step.body;
        if (apiStep !== null && apiStep.headers !== null) fo.headers = apiStep.headers;
        resp = await reqCtx.fetch(url, fo);
      } catch (err) {
        return ended(blocked('TARGET_UNREACHABLE', `step ${i + 1}: the request failed or timed out`, evidence), i);
      }
```
Copied by Task 2 (the three `opts` lines become one call to the exported helper; the guard-first order, the single `fo` object (the only `maxRedirects: 0` in the file) and the `ended` plumbing stay; the one changed line is the `resp = ...` assignment, which picks the anonymous path for a `session: "none"` step; the tail `return { outcome: 'pass', ... evidence };`, `} finally {`, `if (reqCtx)` is not touched).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2119-2151
async function runLocatorStep(page, step, loc, n) {
  const target = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });
  // The wait only gives the page time to render; the decision is the count.
  await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await target.count().catch(() => 0);
  if (count > 1) {
    return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on`);
  }
  const expects = step.action === 'expect_visible' || step.action === 'expect_text';
  if (count === 0) {
    if (expects) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not found`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
  }
  if (step.action === 'click' || step.action === 'fill') {
    try {
      if (step.action === 'click') await target.click();
      else await target.fill(step.value);
    } catch {
      return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);
    }
    return null;
  }
  if (step.action === 'expect_visible') {
    const ok = await target.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    if (!ok) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
    return null;
  }
  const text = await target.textContent({ timeout: 10000 }).catch(() => null);
  if (text === null || !text.includes(step.contains)) {
    return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
  }
  return null;
}
```
Copied by Task 3 (the resolver, the count rule, the `STEP_UNGROUNDED` sentence and every reason shape stay; the trailing lines that today treat every other action as `expect_text` become an explicit `expect_text` branch followed by a defensive `blocked` return, so none of the three new actions can fall through into a text comparison against an undefined `contains`; `expects` widens to the positive-assertion set).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2175-2186
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
      const lstep = LOCATOR_ACTIONS.includes(step.action) ? locatorOf(step) : null;
      if (lstep !== null && lstep.ok) {
        const lr = await runLocatorStep(page, step, lstep, n);
        if (lr !== null) {
          verdict = lr;
          break;
        }
        continue;
      }
```
Copied by Task 3 (a step of a new action reaches `runLocatorStep` through this existing dispatch because `LOCATOR_ACTIONS` gained it; the call gains a fifth argument, the comparison recorder, and one line before it registers the mask locator of an `expect_value` field).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2237-2245
    // Evidence after the last step: a screenshot, or redacted text when the page text holds a secret.
    try {
      const bodyText = await page.innerText('body').catch(() => '');
      if (containsSecret(bodyText, ctx.table)) {
        evidence.push(writeEvidence(ctx, `case-${kase.index}.txt`, { kind: 'text', value: bodyText }));
      } else {
        const png = await page.screenshot({ mask: [page.locator('input[type=password]')] });
        evidence.push(writeEvidence(ctx, `case-${kase.index}.png`, { kind: 'binary', value: png }));
      }
```
Copied by Task 3 (the `mask` array keeps its password entry and gains the located field of every `expect_value` step that ran, so a value read by the runner is not left in clear in the screenshot).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:3053-3060
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'request' || s.origin === undefined) continue;
    const r = await resolveApiOrigin(ctx, s, i + 1);
    if (!r.ok) return out(r.result);
    if (r.spec.header !== null && role === null) {
      return out(blocked('API_HEADER_NO_SESSION', `step ${i + 1}: the origin ${r.spec.name} derives a header from the role session, but the plan entry names no role`));
    }
  }
```
Copied by Task 2 (this pre-loop is what makes the non-local refusal happen before any seed, session or request; the `API_HEADER_NO_SESSION` condition gains `&& s.session !== 'none'`, because a step that asks for no session needs no role to derive a header from).

````
# SOURCE: plugins/relay/commands/relay-qa-run.md:298-305
One literal `origin` step, a request to a declared second local origin:

<!-- qa-step-example driver=http -->
```json
{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "expect_status": 200 }
```

An `http` `request` step may carry an optional `origin` naming an `api_origins` entry. The `path` must then be relative (an absolute URL to another origin is refused). Without `origin` the step goes to the target origin, unchanged.
````
Copied by Task 4 (the session-less example and its rule paragraph are a sibling placed directly after this paragraph, with the same marker shape: `<!-- qa-step-example driver=http -->`, an LF-only `json` fence, one flat step object).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:250-256
The browser actions `click`, `fill`, `expect_visible` and `expect_text` accept, instead of
`selector`, either `role` plus `name` (matched exactly through the accessible role and name)
or `text` (matched exactly against visible text). The forms are mutually exclusive. `role` is
one of `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `heading`, `tab`,
`menuitem`, `option`, `switch`, `searchbox`, `spinbutton`, `slider`, `dialog`, `alert`,
`status`, `row`, `cell`, `columnheader`, `listitem`, `img`, `navigation`, `region`, `table`,
`menu` or `tabpanel`, and an existing `selector` step is unchanged.
```
Copied by Task 4 (this paragraph is not edited; the three browser steps are a new block placed directly after it and before `Grounding rules.`, which is outside both doc slices the tests cut, and after the existing first role-and-name and first text examples the UI-grounding test picks).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:215-219
/**
 * @param {{ scriptText?: string | null, commandText?: string | null, seedScriptText?: string | null, seedCommandText?: string | null, queryModuleText?: string | null, results?: { file: string, value: any }[], requireStepExamples?: boolean, requireCatalogue?: boolean, requireGround?: boolean, requirePrivacy?: boolean }} input
 * @returns {{ name: string, ok: boolean, findings: Finding[] }}
 */
export function checkQaRunContract({ scriptText, commandText, seedScriptText, seedCommandText, queryModuleText, results, requireStepExamples = false, requireCatalogue = false, requireGround = false, requirePrivacy = false }) {
```
Copied by Task 6 (`requireVocabulary` is added beside `requirePrivacy` in the same destructured signature and JSDoc type, default `false`, exactly like the three earlier flags).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:339-358
    // Each literal step example in the doc must validate against the runner's own per-step validator.
    /** @type {Set<string>} */ const seen = new Set();
    for (const m of commandText.matchAll(STEP_EXAMPLE_PATTERN)) {
      const driver = m[1];
      seen.add(driver);
      /** @type {any} */ let step;
      try {
        step = JSON.parse(m[2]);
      } catch {
        add(`the ${driver} step example in the runner command is not valid JSON`, COMMAND_FILE);
        continue;
      }
      const bad = validateStep(driver, step);
      if (bad) add(`the ${driver} step example in the runner command does not validate: ${bad.reason}`, COMMAND_FILE);
    }
    if (requireStepExamples) {
      for (const driver of STEP_EXAMPLE_DRIVERS) {
        if (!seen.has(driver)) add(`the runner command must carry a literal ${driver} step example marked <!-- qa-step-example driver=${driver} -->`, COMMAND_FILE);
      }
    }
```
Copied by Task 6 (the new rules collect the parsed examples in the same loop, add no finding of their own inside it, and judge the collection afterwards behind `requireVocabulary`; their messages must not contain the phrases `step example` or `is outside the closed vocabulary`, which existing tests count).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:385-392
    if (requireGround) {
      // The halt, the Git Bash note and the wait's numbers follow the exported constants.
      const interval = `${GROUND_POLL_INTERVAL_MS / 1000} second apart`;
      const bound = `${GROUND_STABLE_BOUND_MS / 1000} seconds`;
      for (const token of ['GROUND_UNSTABLE', 'MSYS_NO_PATHCONV=1', interval, bound]) {
        if (!commandText.includes(token)) add(`the runner command must document the ground wait: it must contain ${token}`, COMMAND_FILE);
      }
    }
```
Copied by Task 6 (the doc tokens and the window in seconds follow the exported constants exactly as the ground wait's numbers follow theirs; `requireGround` itself is not edited, because a test pins exactly four findings from it on a bare doc).

```
# SOURCE: plugins/relay/resources/redaction-policy.md:240-241
- **Input values.** An input value asserted by the runner is never written,
  only the result of the comparison.
```
Copied by Task 5 (the bullet keeps its label and its first clause; it gains the evidence shape and the screenshot mask; the section and subsection headings that `auth-secrecy` pins are not touched).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the vocabulary constants and rules, the anchor rule, the literal rule of the grounding pre-check, the per-step anonymous request context and its guard-skipping header rules, the three assertion branches and their bounded re-read, the comparison evidence and the screenshot mask |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the carry-over fix of the mode list (`ground`), four marked literal examples, the rules of the four steps and two honesty bullets |
| `plugins/relay/resources/redaction-policy.md` | UPDATE | the `Input values` bullet states the evidence shape and the screenshot mask |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | an opt-in `requireVocabulary` rule set pinning the helper and the branch wiring, the behavior of the new validators, the mode list and the marked examples; no new check is registered (the count stays 28) |

## NOT Building (Scope Limits)

- A grounding prefix for `ground`, any change to `runGround`, `waitForStableSnapshot`, `parseAriaSnapshot`, `GROUND_*` or the `ground` usage text (Phase 5), `expect_requests`, the bounded re-mint and the `--refresh` statement (Phase 6), the release cut and every `documentation/` page (Phase 7), and the dogfood and its scans (Phase 8).
- A new reason code, a new outcome, a change to `OUTCOMES`, `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, `summarizeEntries`, `summarizeClassification` or `recordSteps`: every refusal and every halt of the four steps reuses a code that already exists (`PLAN_ENTRY_INVALID`, `STEP_UNGROUNDED`, `STEP_NOT_PERFORMABLE`, `EVIDENCE_WRITE_FAILED`, `FAILED_NON_LOCAL_TARGET`, `API_HEADER_NO_SESSION`), and none of them belongs in the plan-facing catalogue (they are runner halts, not causes a planner declares).
- A second guard site, a new `checkTarget` call, a registration in `auth-local-guard-sites`, a second write site or a static sibling import: the session-less request reuses the guard calls already in `resolveApiOrigin`, `executeCase` and `guardTarget`.
- A session-less BROWSER step. `session` is refused on a browser step; an anonymous browser case is a plan entry with no `role`, which already exists.
- Skipping the role-session acquisition for an entry whose every request carries `"session": "none"`. The runner still obtains the session of a role the entry names; the planner declares `role: null` for a purely anonymous entry (the doc says so).
- Reading the accessibility-snapshot token for a state, a state beyond `expanded`, `disabled` and `checked` (`pressed`, `selected`, `invalid`), `expect_value` on content-editable or custom (non-input) elements, a `selector` form for any of the three new browser steps, and a per-step timeout override.
- Withholding or recognizing personal data by pattern, any change to the redaction table, the ignore rules or the `.gitignore` proof, and any change to `redactJson`, `writeRunFile` or `partitionSnapshotEntries`.
- Any edit under `documentation/`, any edit of `docs/decisions.md` or `docs/anti-patterns.md`, and any hand edit of `docs/` (the `docs_sync` pass owns `docs/` at implement time).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-14), and any change to a report.
- Any test file. R-X strict: the Implementer authors zero test files; new tests and any edit of an existing test are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the closed vocabulary: `session`, `expect_value`, `expect_not_visible`, `expect_state` and the absence-anchor rule

- **ACTION**: Delivers AC-A2 (`session` is a closed value set, legal only on an `http` `request` step), AC-A3 (the `expect_value` rules and its `{{name}}` bindings are validated before any side effect), AC-A5 (an `expect_not_visible` with no earlier positive step on its route is `PLAN_ENTRY_INVALID` before any side effect) and AC-A6 (the `expect_state` rules). Pure code, no I/O, in `plugins/relay/scripts/qa-run.mjs`:
  1. Constants. Append `'expect_value'`, `'expect_not_visible'` and `'expect_state'` to `BROWSER_ACTIONS` and to `LOCATOR_ACTIONS` (after the existing entries; `'query'` stays where it is). Do NOT edit `HTTP_ACTIONS` or `LOCATOR_ROLES`. Directly after `LOCATOR_ROLES` add two exports, each with a doc comment: `export const POSITIVE_ASSERTION_ACTIONS = Object.freeze(['expect_visible', 'expect_text', 'expect_value', 'expect_state']);` (the steps that assert something is present, so each fails the case when its element is missing and can anchor an absence; `expect_url` is deliberately absent because it asserts a path, not that anything rendered; `goto` is absent because `page.goto` resolves for an error page; `click` and `fill` are absent because they are actions, not assertions) and `export const EXPECT_STATES = Object.freeze(['expanded', 'disabled', 'checked']);`.
  2. `stepRules`, in this order. (a) In the `query` branch, immediately after `if (s.action === 'query') {`: `if (s.session !== undefined) return bad('query takes no session key');`. (b) In the `driver === 'http'` branch, directly after the `origin` rule: `if (s.session !== undefined && s.session !== 'none') return bad('session must be the string "none" when present');`. (c) At the top of the browser branch, before `const loc = ...`: `if (s.session !== undefined) return bad(`${s.action} takes no session key; a request without the role's session is an http request step`);`. (d) In the locator branch, after the `expect_text` rule and before the `return`, add: for `expect_value`, `loc.form` must be `'role'` (else `bad('expect_value needs a role and a name')`), exactly one of `equals`, `contains` and `not_empty` must be present, counting keys whose value is not `undefined` (else `bad('expect_value needs exactly one of equals, contains or not_empty')`), `equals` must be a string (`bad('expect_value equals must be a string')`), `contains` must be a non-empty string (`bad('expect_value contains must be a non-empty string')`) and `not_empty` must be exactly `true` (`bad('expect_value not_empty must be true')`); for `expect_state`, `loc.form` must be `'role'` (`bad('expect_state needs a role and a name')`), `s.state` must be a member of `EXPECT_STATES` (`bad('expect_state state must be one of expanded, disabled, checked')`) and `typeof s.equals` must be `'boolean'` (`bad('expect_state needs a boolean equals')`); `expect_not_visible` accepts the role-and-name or the text form and needs nothing more. Replace the returned count with `1` when `POSITIVE_ASSERTION_ACTIONS.includes(s.action) || s.action === 'expect_not_visible'`, else `0`. (e) In the `switch (s.action)`, before `default:`, add `case 'expect_value': case 'expect_state': return bad(`${s.action} needs a role and a name`);` and `case 'expect_not_visible': return bad('expect_not_visible needs a role and a name, or a text');` (reached only when no locator key was given, which also refuses a bare `selector`).
  3. `validateSteps`: add the one sequence rule inside the existing loop, after the variable-binding loop of the step, so the first refusal still wins in step order. Keep `route` (a `goto` or an `expect_url` step sets it to `routeKey(s.path)`, initially `null`) and `anchored` (initially `undefined`): a step whose action is in `POSITIVE_ASSERTION_ACTIONS` sets `anchored = route`; a `goto` step sets `anchored = undefined`, even to the same path, because the page was reloaded; an `expect_not_visible` step with `anchored === undefined || anchored !== route` returns `{ code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: expect_not_visible needs an earlier expect_visible, expect_text, expect_value or expect_state step on the same route since the last goto` }`. The rule lives ONLY here: `stepRules` and `validateStep` stay stateless, because the doc examples are validated one step at a time. At run time the anchor has passed by construction (a failed step ends the case).
  4. `precheckGroundedSteps`: directly after the `expect_text` rule add the literal rule for `expect_value`: for each of `equals` and `contains` that is a string with no `{{name}}` binding, require `collapse(manualText).includes(collapse(literal))` (the existing `collapse`), else return `{ code: 'PLAN_ENTRY_INVALID', reason: `step ${n}: expect_value ${key} must come from the report's own steps or be bound by a declared capture` }` with `key` the literal word `equals` or `contains`. Detect a binding with `matchAll` over `VARIABLE_PATTERN` (or the existing `stepVariables`), never `.test()` on that shared global regex, whose `lastIndex` is stateful.
  The validators are total (a test pins that hostile JSON yields `PLAN_ENTRY_INVALID`, never a throw): use `isStr`, `typeof` and `Array.isArray` guards, and never put a planner-supplied non-string value inside a template literal (an object whose `toString` is not callable throws). Do NOT touch `recordSteps`, `locatorOf`, `routeKey`, `REASON_CATALOGUE` or any driver in this task. Do NOT add any `import`, the text `writeFileSync(`, `renameSync(`, `// GUARD-SITE` or `// WRITE-SITE` anywhere (comments included), or a quoted `outcome:` literal that is not one of the four outcomes. No reason may carry a locator name, an expected value, a literal or a selector.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1071-1076` (the constants), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1189-1194` (the `session` rule beside the `origin` rule), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1206-1214` (the locator branch and the `switch`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1282-1296` (the loop that gets the sequence rule) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1479-1506` (the literal rule next to the `expect_text` rule).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { validateStep, validateSteps, precheckGroundedSteps, POSITIVE_ASSERTION_ACTIONS, EXPECT_STATES } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const code = (r) => (r === null ? null : r.code);
  const goto = { action: "goto", path: "/form" };
  const pos = { action: "expect_visible", role: "heading", name: "Perfil" };
  const value = (extra) => ({ action: "expect_value", role: "textbox", name: "Telefone", ...extra });
  const state = (extra) => ({ action: "expect_state", role: "button", name: "Group", state: "expanded", equals: false, ...extra });
  const absent = { action: "expect_not_visible", text: "Gone" };

  check(POSITIVE_ASSERTION_ACTIONS.join(",") === "expect_visible,expect_text,expect_value,expect_state", "anchor set: " + POSITIVE_ASSERTION_ACTIONS.join(","));
  check(EXPECT_STATES.join(",") === "expanded,disabled,checked", "states: " + EXPECT_STATES.join(","));

  // session: a closed set, http request steps only.
  const req = (extra) => ({ action: "request", method: "GET", path: "/api/me", expect_status: 401, ...extra });
  check(validateStep("http", req({ session: "none" })) === null, "session none refused");
  check(validateStep("http", req({ origin: "api", session: "none" })) === null, "session none with an origin refused");
  check(validateStep("http", req({})) === null, "a step without the key changed");
  for (const bad of ["cookie", "NONE", "", null, 0, true, {}, ["none"]]) {
    check(code(validateStep("http", req({ session: bad }))) === "PLAN_ENTRY_INVALID", "session " + JSON.stringify(bad) + " was accepted");
  }
  check(code(validateStep("browser", { action: "goto", path: "/x", session: "none" })) === "PLAN_ENTRY_INVALID", "a browser step accepted session");
  check(code(validateStep("browser", { action: "expect_visible", selector: "h1", session: "none" })) === "PLAN_ENTRY_INVALID", "a selector browser step accepted session");
  check(code(validateStep("http", { action: "query", source: "d1-local", sql: "SELECT 1", expect_rows: 1, session: "none" })) === "PLAN_ENTRY_INVALID", "a query step accepted session");
  check(validateStep("http", { action: "query", source: "d1-local", sql: "SELECT 1", expect_rows: 1 }) === null, "the query control changed");

  // expect_value
  check(validateStep("browser", value({ not_empty: true })) === null, "not_empty refused");
  check(validateStep("browser", value({ equals: "x" })) === null, "equals refused");
  check(validateStep("browser", value({ contains: "x" })) === null, "contains refused");
  for (const bad of [value({}), value({ equals: "a", contains: "b" }), value({ not_empty: false }), value({ not_empty: "true" }), value({ contains: "" }), value({ equals: 5 }),
    { action: "expect_value", text: "Telefone", not_empty: true }, { action: "expect_value", selector: "#tel", not_empty: true }, { action: "expect_value", role: "textbox", not_empty: true }]) {
    check(code(validateStep("browser", bad)) === "PLAN_ENTRY_INVALID", "a malformed expect_value was accepted: " + JSON.stringify(bad));
  }
  check(validateStep("browser", value({ equals: "" })) === null, "equals with an empty string asserts an empty field and must be accepted");
  const unbound = validateSteps("browser", [goto, pos, value({ equals: "{{phone}}" })], []);
  check(code(unbound) === "PLAN_ENTRY_INVALID" && /phone/.test(unbound.reason) && /^step 3:/.test(unbound.reason), "an unbound binding in equals: " + JSON.stringify(unbound));
  check(validateSteps("browser", [goto, pos, value({ contains: "{{phone}}" })], ["phone"]) === null, "a bound binding in contains was refused");
  check(code(validateSteps("http", [value({ not_empty: true })], [])) === "PLAN_ENTRY_INVALID", "expect_value is not an http action");

  // expect_state
  for (const s of ["expanded", "disabled", "checked"]) check(validateStep("browser", state({ state: s, equals: true })) === null, "state " + s + " refused");
  for (const bad of [state({ state: "pressed" }), state({ state: undefined }), state({ equals: "true" }), state({ equals: undefined }), { action: "expect_state", text: "Group", state: "expanded", equals: true }, { action: "expect_state", selector: "#g", state: "expanded", equals: true }]) {
    check(code(validateStep("browser", bad)) === "PLAN_ENTRY_INVALID", "a malformed expect_state was accepted: " + JSON.stringify(bad));
  }

  // expect_not_visible: a locator form is required, and the anchor rule is sequence-aware.
  check(validateStep("browser", absent) === null && validateStep("browser", { action: "expect_not_visible", role: "listitem", name: "Buy milk" }) === null, "expect_not_visible forms refused");
  check(code(validateStep("browser", { action: "expect_not_visible", selector: ".x" })) === "PLAN_ENTRY_INVALID", "expect_not_visible accepted a bare selector");
  const refuse = (label, steps) => {
    const r = validateSteps("browser", steps, []);
    check(code(r) === "PLAN_ENTRY_INVALID" && /expect_not_visible needs an earlier/.test(r.reason), label + ": " + JSON.stringify(r));
    return r;
  };
  const r0 = refuse("no anchor at all", [goto, absent]);
  check(/^step 2:/.test(r0.reason) && !/Gone/.test(r0.reason), "the anchor refusal prefix or value echo: " + r0.reason);
  refuse("anchor after the absence", [goto, absent, pos]);
  refuse("anchor on another route", [goto, pos, { action: "goto", path: "/other" }, absent]);
  refuse("a goto to the same path resets the anchor", [goto, pos, { action: "goto", path: "/form" }, absent]);
  refuse("expect_url is not a positive assertion", [goto, { action: "expect_url", path: "/form" }, absent]);
  refuse("a click is not a positive assertion", [goto, { action: "click", role: "button", name: "Save" }, absent]);
  refuse("an expect_url to another route drops the anchor", [goto, pos, { action: "expect_url", path: "/elsewhere" }, absent]);
  check(validateSteps("browser", [goto, pos, absent], []) === null, "a positive step on the same route must anchor");
  check(validateSteps("browser", [goto, pos, absent, absent], []) === null, "the anchor persists across a chain of absences");
  check(validateSteps("browser", [goto, { action: "expect_text", selector: "h1", contains: "x" }, absent], []) === null, "a legacy selector expect_text must anchor");
  check(validateSteps("browser", [goto, pos, { action: "expect_url", path: "/form" }, absent], []) === null, "an expect_url to the same route keeps the anchor");
  check(validateSteps("browser", [goto, { action: "click", role: "button", name: "Save" }], [])?.code === "NO_EXPECTATION", "click alone must stay NO_EXPECTATION");

  // precheckGroundedSteps: grounded locators and the literal rule.
  const snap = [{ schema_version: 1, role: "anonymous", route: "/form", entries: [
    { kind: "role", role: "textbox", name: "Telefone", matches: 1 }, { kind: "role", role: "button", name: "Group", matches: 1 },
    { kind: "role", role: "button", name: "Twin", matches: 2 }, { kind: "text", text: "Gone", matches: 1 }] }];
  const manual = "1. Open the form.\n2. The phone equals 55  1199.";
  const pre = (steps) => precheckGroundedSteps(steps, snap, manual, null);
  const lit = pre([goto, value({ equals: "999 absent" })]);
  check(code(lit) === "PLAN_ENTRY_INVALID" && !/999 absent/.test(lit.reason) && /equals/.test(lit.reason), "an ungrounded literal: " + JSON.stringify(lit));
  check(pre([goto, value({ equals: "55 1199" })]) === null, "a literal from the report must pass, whitespace-insensitively");
  check(pre([goto, value({ contains: "{{phone}}" })]) === null, "a binding needs no literal in the report");
  check(pre([goto, value({ not_empty: true })]) === null, "not_empty needs no literal");
  check(code(pre([goto, { action: "expect_state", role: "button", name: "Missing", state: "disabled", equals: true }])) === "STEP_UNGROUNDED", "an ungrounded state step");
  check(code(pre([goto, { action: "expect_state", role: "button", name: "Twin", state: "disabled", equals: true }])) === "STEP_UNGROUNDED", "a two-match state step");
  check(pre([goto, absent]) === null, "a grounded text absence step");

  // Unchanged behavior.
  check(validateStep("browser", { action: "click" })?.reason === "click needs a string selector", "the legacy click message changed");
  check(code(validateStep("http", { action: "goto", path: "/a" })) === "PLAN_ENTRY_INVALID", "a browser action became an http action");
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  node --test scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-plan-value-totality.test.mjs
  ```
  Before this task the new exports do not exist, so the import fails and the command exits non-zero. Every assertion calls the real validators; the `refuse` helper pins both the code and the anchor wording. The two existing test files run unchanged (they cover the nested-form, prefix and totality pins this task must not disturb).

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the request without the role's session, behind the existing guard

- **ACTION**: Delivers AC-A1 (a `"session": "none"` step carries no cookie, no storage state and no derived header; a plan without the key behaves exactly as before) and AC-A7 (a non-local origin or path halts `FAILED_NON_LOCAL_TARGET` before any request, with no second guard site). In `plugins/relay/scripts/qa-run.mjs`:
  1. Directly after `sessionAuthHeaders` add `export function httpContextOptions(baseURL, session, anonymous)`: pure. It returns `{ baseURL }` and, only when `anonymous` is not `true`, adds `storageState` (when `session` has a `path`) and `extraHTTPHeaders: sessionAuthHeaders(session)` (when `session` has a `token`), exactly the three lines `DRIVERS.http` builds today. An anonymous call therefore returns an object whose only key is `baseURL`.
  2. Directly before `DRIVERS.http = async (` add the module-private `async function fetchAnonymously(playwright, baseURL, url, fetchOptions)`: it creates a FRESH context with `playwright.request.newContext(httpContextOptions(baseURL, null, true))`, calls `.fetch(url, fetchOptions)`, reads the status, the headers and the body text (the text read keeps the existing `.catch(() => '')`) BEFORE disposing the context (disposal discards the stored responses), disposes it in a `finally` with `.catch(() => {})`, and returns a detached object `{ status: () => <status>, headers: () => <headers>, text: async () => <text> }` so the code below the fetch is unchanged. A fresh context per call is deliberate: a `Set-Cookie` from one session-less step must never reach the next. It receives the already-built `fetchOptions`; it must not contain the text `maxRedirects`.
  3. `DRIVERS.http`: replace the three `opts` lines with `/** @type {any} */ const opts = httpContextOptions(target.origin, session, false);`. After the `url === null` return add `const anonymous = step.session === 'none';` and change only the fetch assignment to `resp = anonymous ? await fetchAnonymously(ctx.playwright, target.origin, url, fo) : await reqCtx.fetch(url, fo);`. In the evidence value, append `...(anonymous ? { session: 'none' } : {})` after the existing `origin` spread (a top-level key beside `origin`), leaving `request: { method: step.method, path: step.path }` byte-identical. The guard order is unchanged: `prepareApiStep` (the origin guard) and `resolveStepUrl` (the path guard) both run before the context is created, so no context and no request exist for a refused step.
  4. `prepareApiStep`: widen the "no header to derive" return to `if (r.spec.header === null || step.session === 'none') return { ok: true, url: r.url, headers: null };`. `resolveApiOrigin` (and its `checkTarget`) still runs first.
  5. `executeCase`, origin pre-loop: change the condition to `if (r.spec.header !== null && role === null && s.session !== 'none') {`. Do not reuse the text `if (isObj(record)) {`, which a test anchors and which must stay the only such line.
  Single-occurrence anchors the existing tests mutate and that must stay byte-identical and unique (do not duplicate, move or reword them, comments included): `return { outcome: 'pass', reason_code: null, reason: null, evidence };` followed by `  } finally {` and `    if (reqCtx)`; `maxRedirects: 0`; `request: { method: step.method, path: step.path }`; `const EVIDENCE_HEADERS = ['content-type', 'content-length', 'location', 'cache-control'];`; `if (isObj(record)) {`; `writeFileSync(tmp, data);`; the one `// GUARD-SITE` and the one `// WRITE-SITE`. Add no `import`, no new `checkTarget` call, no `writeFileSync(` or `renameSync(` and no new reason code.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2027-2060` (the driver head, the single case context and the fetch that is rerouted), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1942-1953` (the guard-first header derivation that `session: "none"` skips) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3053-3060` (the pre-loop condition).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve, dirname } from "node:path";
  import { spawn } from "node:child_process";
  import { httpContextOptions, prepareApiStep, buildRedactionTable } from "./plugins/relay/scripts/qa-run.mjs";
  import * as guard from "./plugins/relay/scripts/auth-local-guard.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };

  // A. The request-context options: an anonymous context carries only the base URL.
  const sess = { path: "/tmp/state.json", token: "TOKENVALUE" };
  const authed = httpContextOptions("http://127.0.0.1:1", sess, false);
  check(authed.baseURL === "http://127.0.0.1:1" && authed.storageState === "/tmp/state.json" && authed.extraHTTPHeaders && authed.extraHTTPHeaders.Authorization === "Bearer TOKENVALUE", "an authenticated context lost its storage state or header: " + JSON.stringify(authed));
  const anon = httpContextOptions("http://127.0.0.1:1", sess, true);
  check(Object.keys(anon).join(",") === "baseURL", "an anonymous context carries more than the base URL: " + JSON.stringify(anon));
  check(JSON.stringify(httpContextOptions("http://127.0.0.1:1", null, false)) === JSON.stringify({ baseURL: "http://127.0.0.1:1" }), "a role-less context carries more than the base URL");

  // B. prepareApiStep called directly (the fixture shape of the api-origins tests).
  const stateDir = mkdtempSync(join(tmpdir(), "relay-qa-sess-"));
  const statePath = join(stateDir, "admin.json");
  const TOK = "tok-Zq83kd01-apiorigin";
  writeFileSync(statePath, JSON.stringify({ cookies: [{ name: "access-token", value: TOK, domain: "localhost" }], origins: [] }));
  const API = { api: { url: "http://localhost:8000", header: "Authorization", cookie: "access-token", value_prefix: "Bearer " }, remote: { url: "http://example.com:8000", header: "Authorization", cookie: "access-token" } };
  const ctx = { root: stateDir, table: buildRedactionTable({ root: stateDir, env: {} }), target: { guard, origin: "http://localhost:3000", allowedHosts: new Set(["localhost", "127.0.0.1"]) }, loginConfig: { baseUrl: "http://localhost:3000", roles: { admin: {} }, api_origins: API } };
  const step = (origin, extra = {}) => ({ action: "request", origin, method: "GET", path: "/api/me", expect_status: 401, ...extra });
  const withKey = await prepareApiStep(ctx, step("api", { session: "none" }), 1, { path: statePath, token: null });
  check(withKey.ok === true && withKey.headers === null && withKey.url === "http://localhost:8000/api/me", "session none must give a guarded URL and no derived header: " + JSON.stringify(withKey));
  const noRole = await prepareApiStep(ctx, step("api", { session: "none" }), 1, null);
  check(noRole.ok === true && noRole.headers === null, "session none needs no role session: " + JSON.stringify(noRole));
  const remote = await prepareApiStep(ctx, step("remote", { session: "none" }), 2, null);
  check(remote.ok === false && remote.result.reason_code === "FAILED_NON_LOCAL_TARGET" && remote.result.reason.startsWith("step 2:"), "a non-local origin must be refused before any request even with session none: " + JSON.stringify(remote));
  const control = await prepareApiStep(ctx, step("api"), 3, null);
  check(control.ok === false && control.result.reason_code === "API_HEADER_NO_SESSION", "without the key a header-bearing origin with no session keeps its refusal: " + JSON.stringify(control));
  const kept = await prepareApiStep(ctx, step("api"), 4, { path: statePath, token: null });
  check(kept.ok === true && kept.headers && kept.headers.Authorization === "Bearer " + TOK, "without the key the derived header is unchanged: " + JSON.stringify(kept));

  // C. End to end through the real runner against a loopback server that records what it receives.
  const SID = "sidvalue-Zq83kd01-Hh2k9X7";
  const seen = [];
  const server = createServer((req, res) => {
    const cookie = String(req.headers.cookie || "");
    const auth = String(req.headers.authorization || "");
    seen.push({ path: String(req.url).split("?")[0], cookie, auth });
    const ok = cookie !== "" || auth !== "";
    res.writeHead(ok ? 200 : 401, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok }));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const FEATURE = "feat";
  const RUN_REL = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const root = mkdtempSync(join(tmpdir(), "relay-qa-anon-"));
  try {
    const runAbs = join(root, ...RUN_REL.split("/"));
    mkdirSync(runAbs, { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    const titles = ["Authenticated then anonymous", "Anonymous on a header origin", "Header origin without the key", "Non-local origin"];
    const block = (n, t) => ["### Case " + n, "**Title:** " + t, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page.", "2. Check the result.", ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + titles.map((t, i) => block(i + 1, t)).join("\n") + "\n## Notes\n\nnone\n");
    const cfg = { baseUrl: base, roles: { admin: {} }, api_origins: { api: { url: base, header: "Authorization", cookie: "sid", value_prefix: "Bearer " }, far: { url: "http://example.com:8000" } } };
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify(cfg));
    const state = { cookies: [{ name: "sid", value: SID, domain: "127.0.0.1", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" }], origins: [] };
    const login = `import {writeFileSync,mkdirSync} from "node:fs";import {join} from "node:path";
  const root=process.argv[process.argv.indexOf("--root")+1];
  mkdirSync(join(root,"PRPs","auth",".sessions"),{recursive:true});
  writeFileSync(join(root,"PRPs","auth",".sessions","admin.json"),${JSON.stringify(JSON.stringify(state))});
  `;
    writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), login);
    const call = (extra) => ({ action: "request", method: "GET", path: "/api/me", ...extra });
    const plan = [
      { index: 1, title: titles[0], driver: "http", role: "admin", state: "none", steps: [call({ origin: "api", expect_status: 200 }), call({ origin: "api", session: "none", expect_status: 401 }), call({ session: "none", expect_status: 401 }), call({ expect_status: 200 })] },
      { index: 2, title: titles[1], driver: "http", role: null, state: "none", steps: [call({ origin: "api", session: "none", expect_status: 401 })] },
      { index: 3, title: titles[2], driver: "http", role: null, state: "none", steps: [call({ origin: "api", expect_status: 401 })] },
      { index: 4, title: titles[3], driver: "http", role: null, state: "none", steps: [call({ origin: "far", session: "none", expect_status: 401 })] },
    ];
    writeFileSync(join(runAbs, "plan.json"), JSON.stringify({ schema_version: 1, cases: plan }));
    const out = await new Promise((resolveP, rejectP) => {
      const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL], { cwd: root, env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let so = "";
      let se = "";
      child.stdout.on("data", (d) => (so += d));
      child.stderr.on("data", (d) => (se += d));
      const timer = setTimeout(() => child.kill(), 120000);
      child.on("error", (e) => { clearTimeout(timer); rejectP(e); });
      child.on("close", (code) => { clearTimeout(timer); resolveP({ code, so, se }); });
    });
    check(out.code === 0, "the runner exited " + out.code + ": " + out.se);
    const res = JSON.parse(readFileSync(join(runAbs, "results.json"), "utf8"));
    const [c1, c2, c3, c4] = res.cases;
    check(c1.outcome === "pass", "case 1: " + JSON.stringify([c1.outcome, c1.reason_code, c1.reason]));
    check(c2.outcome === "pass", "case 2: " + JSON.stringify([c2.outcome, c2.reason_code, c2.reason]));
    check(c3.outcome === "blocked" && c3.reason_code === "API_HEADER_NO_SESSION", "case 3: " + JSON.stringify([c3.outcome, c3.reason_code]));
    check(c4.outcome === "blocked" && c4.reason_code === "FAILED_NON_LOCAL_TARGET", "case 4: " + JSON.stringify([c4.outcome, c4.reason_code]));
    check(seen.length === 5, "expected 5 requests in total (4 + 1, none for the refused cases), saw " + seen.length);
    const [s0, s1, s2, s3, s4] = seen;
    check(s0 && s0.cookie.includes("sid=" + SID) && s0.auth === "Bearer " + SID, "step 1 must carry the cookie and the derived header");
    check(s1 && s1.cookie === "" && s1.auth === "", "the anonymous origin step carried a credential: " + JSON.stringify(s1));
    check(s2 && s2.cookie === "" && s2.auth === "", "the anonymous path step carried a credential: " + JSON.stringify(s2));
    check(s3 && s3.cookie.includes("sid=" + SID), "the next authenticated step lost the role session");
    check(s4 && s4.cookie === "" && s4.auth === "", "the role-less anonymous step carried a credential: " + JSON.stringify(s4));
    const ev = JSON.parse(readFileSync(join(root, ...c1.evidence[1].split("/")), "utf8"));
    check(ev.session === "none" && ev.response.status === 401 && JSON.stringify(ev.request) === JSON.stringify({ method: "GET", path: "/api/me" }), "evidence of the anonymous step: " + JSON.stringify(ev));
    const walk = (d, acc) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
    for (const f of walk(runAbs, []).filter((p) => !p.endsWith("plan.json"))) {
      if (readFileSync(f).toString("latin1").includes(SID)) check(false, "the session value reached " + f);
    }
    check(!(out.so + out.se).includes(SID), "the session value reached the terminal");
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true });
    rmSync(stateDir, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  node --test scripts/validate/checks/qa-run-api-origins.test.mjs scripts/validate/checks/qa-run-contract.test.mjs
  ```
  Before this task `httpContextOptions` does not exist, so the import fails; with only the validators of Task 1 in place the anonymous steps would reach the server with the case cookie, so the `s1`, `s2` and `s4` assertions fail. The server logs what it actually received, so the check does not trust the runner's own evidence. The runner is driven with an async `spawn`, because a synchronous spawn would block the event loop the in-process server needs. The two existing test files run unchanged (the second includes the real-tree contract and the exact driver-tail anchor).

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the browser assertions: `expect_value`, `expect_not_visible`, `expect_state`, the bounded re-read, the comparison evidence and the screenshot mask

- **ACTION**: Delivers AC-A3 (`expect_value` passes or fails on the comparison with `equals`, `contains` or `not_empty`), AC-A4 (the input value is never written: the evidence records the comparison result only, no reason carries it and the final screenshot masks the field), AC-A5 (`expect_not_visible` passes only when the grounded locator is hidden or absent) and AC-A6 (`expect_state` passes only when the element's state equals the declared value, and a state the element does not expose is a blocked case, never a pass). First run the live probe of `## Notes` ("Live probe") against the installed Playwright and record its output in the implementation report; the branches below are written for the documented semantics and fail safe (blocked, never pass) where the probe shows otherwise. Then, in `plugins/relay/scripts/qa-run.mjs`:
  1. Directly after `waitForStableSnapshot` add, each with a doc comment: `export const ASSERT_SETTLE_MS = 5000;` (the window a value or state is re-read; it mirrors the 5-second default timeout of Playwright's web-first assertions that the PRD cites; chosen, not measured, and the Phase 8 dogfood recalibrates it) and `export const ASSERT_POLL_INTERVAL_MS = 100;` (the first step of Playwright's own retry schedule; chosen); `export async function settleAssertion(read, accept, opts = {})` with the option bag `{ boundMs, intervalMs, sleep, now }` of `waitForStableSnapshot` and the same defaults (`ASSERT_SETTLE_MS`, `ASSERT_POLL_INTERVAL_MS`, a `setTimeout` sleep, `performance.now`): it reads immediately; a read that returns a value for which `accept(value)` is true ends it `{ status: 'accepted', reads }`; a read that throws counts as unreadable for that round and never as accepted; it re-reads every `intervalMs` while another interval still fits in the bound; at the bound it returns `{ status: 'rejected', reads }` when at least one read succeeded and `{ status: 'unreadable', reads }` when none did. `reads` counts every read made, the accepted one included. The returned object has exactly the keys `status` and `reads` and never carries the value; `export function comparisonKindOf(step)` returns `'not_empty'` when `step.not_empty === true`, else `'equals'` when `step.equals` is a string, else `'contains'` when `step.contains` is a non-empty string, else `null`; `export function compareInputValue(step, value)` returns `null` when `value` is not a string or the step names no comparison, else `{ kind, passed }` with `not_empty` passing when `value.trim() !== ''`, `equals` when `value === step.equals` (exact, no trimming, no case folding) and `contains` when `value.includes(step.contains)`; `export function ariaExpandedOf(attribute)` returns `true` for `'true'`, `false` for `'false'` and `null` for anything else (including `null`, `''` and `'mixed'`).
  2. `runLocatorStep(page, step, loc, n, recordComparison)`: add the optional fifth parameter. (a) Directly after `target` is built and BEFORE the `attached` wait, handle `expect_not_visible`: `count = await target.count().catch(() => 0)`; a count above 1 returns the existing `STEP_UNGROUNDED` needs-human sentence with `nothing was asserted` in place of `nothing was acted on`; then `settleAssertion(() => target.isHidden(), (hidden) => hidden === true)`; `accepted` returns `null`, `rejected` returns `{ outcome: 'fail', reason_code: null, reason: `step ${n}: the element was still visible`, evidence: [] }`, `unreadable` returns `blocked('STEP_NOT_PERFORMABLE', `step ${n}: the visibility of the target could not be read; nothing was asserted`)`. A locator that matches nothing is therefore hidden and passes; the anchor rule (Task 1) is what keeps that from being vacuous. (b) Widen `expects` to `POSITIVE_ASSERTION_ACTIONS.includes(step.action)`, so a zero-match `expect_value` or `expect_state` is a `fail` (`the expected element was not found`). (c) After the `expect_visible` branch add: `expect_value` reads with `settleAssertion(() => target.inputValue({ timeout: 1000 }), (v) => compareInputValue(step, v)?.passed === true)`; `unreadable` returns `blocked('STEP_NOT_PERFORMABLE', `step ${n}: the expect_value target holds no readable value; nothing was asserted`)` (an element that is not an input, a textarea or a select makes `inputValue` throw, and the runner never falls back to text content); otherwise it calls `recordComparison(comparisonKindOf(step), settled.status === 'accepted')` inside a `try` (a throw returns `blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the comparison evidence could not be written`)`), then returns `null` when accepted and `{ outcome: 'fail', reason_code: null, reason: `step ${n}: the field value did not satisfy the declared ${kind} comparison`, evidence: [] }` when rejected, `kind` being the closed word. `expect_state` reads `expanded` with `ariaExpandedOf(await target.getAttribute('aria-expanded', { timeout: 1000 }))` and throws when that is `null` (no state exposed is unreadable), `disabled` with `target.isDisabled({ timeout: 1000 })` and `checked` with `target.isChecked({ timeout: 1000 })`, accepts when the read equals `step.equals`, and returns `null`, `{ outcome: 'fail', ..., reason: `step ${n}: the ${step.state} state did not equal the declared value` }` or `blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.state} state of the target could not be read; nothing was asserted`)`. (d) Replace the trailing lines that treat every other action as `expect_text` with an explicit `if (step.action === 'expect_text') { ...the existing text comparison... }` followed by `return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the ${step.action} target could not be found or acted on`);`.
  3. `DRIVERS.browser`: declare `/** @type {any[]} */ const valueMasks = [];` beside `queryEvidence`. In the locator dispatch, before the `runLocatorStep` call, `if (step.action === 'expect_value' && lstep.form === 'role') valueMasks.push(page.getByRole(lstep.role, { name: lstep.name, exact: true }));`, and pass a fifth argument `(kind, passed) => { queryEvidence.set(i, writeEvidence(ctx, `case-${kase.index}.value-${n}.json`, { kind: 'json', value: { action: 'expect_value', step: n, locator: { role: lstep.role, name: lstep.name }, comparison: kind, result: passed ? 'passed' : 'failed' } })); }`. The evidence holds the action, the step position, the locator (a role and a name already in the tracked plan), the comparison kind and `passed` or `failed`: never the value, never its length, never the expected string. Keep the existing local name `queryEvidence`: it is the per-step evidence map `recordSteps` already reads, so the file is attributed to its step with no further change. In the final capture change the `mask` array to `[page.locator('input[type=password]'), ...valueMasks]`.
  Write each action test in `runLocatorStep` with the single-quoted literal (`step.action === 'expect_not_visible'`, `step.action === 'expect_value'`, `step.action === 'expect_state'` and `step.action === 'expect_text'`): Task 6 pins those three quoted literals inside this function so that no new action can fall through into the text comparison. Do not add `writeFileSync(`, `renameSync(`, `// GUARD-SITE`, `// WRITE-SITE`, an `import`, a new reason code or a `console.` call. Do not duplicate or move the anchors listed in Task 2.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1434-1468` (the injectable re-read loop `settleAssertion` mirrors), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2119-2151` (the resolver and the branches being extended), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2175-2186` (the dispatch that gets the recorder and the mask registration) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2237-2245` (the screenshot whose mask array is extended).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --input-type=module -e '
  import { createServer } from "node:http";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve, dirname } from "node:path";
  import { spawn } from "node:child_process";
  import { settleAssertion, compareInputValue, comparisonKindOf, ariaExpandedOf, ASSERT_SETTLE_MS, ASSERT_POLL_INTERVAL_MS } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v);
  const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

  // 1. The pure helpers.
  check(ASSERT_SETTLE_MS === 5000 && ASSERT_POLL_INTERVAL_MS === 100, "the settle constants changed");
  check(ariaExpandedOf("true") === true && ariaExpandedOf("false") === false && ariaExpandedOf(null) === null && ariaExpandedOf("") === null && ariaExpandedOf("mixed") === null, "ariaExpandedOf");
  check(comparisonKindOf({ not_empty: true }) === "not_empty" && comparisonKindOf({ equals: "a" }) === "equals" && comparisonKindOf({ contains: "a" }) === "contains" && comparisonKindOf({}) === null, "comparisonKindOf");
  check(compareInputValue({ not_empty: true }, "").passed === false && compareInputValue({ not_empty: true }, "   ").passed === false && compareInputValue({ not_empty: true }, " x ").passed === true, "not_empty");
  check(compareInputValue({ equals: "abc" }, "abc").passed === true && compareInputValue({ equals: "abc" }, "ABC").passed === false && compareInputValue({ equals: "abc" }, " abc").passed === false && compareInputValue({ equals: "" }, "").passed === true, "equals is exact");
  check(compareInputValue({ contains: "cde" }, "abcdef").passed === true && compareInputValue({ contains: "xyz" }, "abcdef").passed === false, "contains");
  check(compareInputValue({ equals: "a" }, 5) === null && compareInputValue({}, "a") === null, "a non-string value or no comparison must give null");
  let t = 0;
  const now = () => t;
  const sleep = async (ms) => { t += ms; };
  const a1 = await settleAssertion(async () => 5, (v) => v === 5, { now, sleep });
  check(a1.status === "accepted" && a1.reads === 1, "first-read acceptance: " + JSON.stringify(a1));
  check(Object.keys(a1).sort().join(",") === "reads,status", "the settle result must carry no value: " + JSON.stringify(a1));
  let n = 0;
  const a2 = await settleAssertion(async () => (++n < 3 ? 0 : 5), (v) => v === 5, { now, sleep });
  check(a2.status === "accepted" && a2.reads === 3, "third-read acceptance: " + JSON.stringify(a2));
  t = 0;
  const a3 = await settleAssertion(async () => 0, (v) => v === 5, { now, sleep });
  check(a3.status === "rejected" && a3.reads >= 2 && t <= ASSERT_SETTLE_MS, "rejection must stop at the bound: " + JSON.stringify(a3) + " t=" + t);
  t = 0;
  const a4 = await settleAssertion(async () => { throw new Error("no value"); }, () => true, { now, sleep });
  check(a4.status === "unreadable", "a read that always throws must be unreadable and never accepted: " + JSON.stringify(a4));

  // 2. End to end through the real runner and a real Chromium, against a fixture page.
  const FEATURE = "feat";
  const RUN_REL = "PRPs/reports/feat/qa-run/20260101T101010101Z";
  const hits = {};
  const page = (v) => `<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body>
  <h1>Perfil</h1>
  <label for="tel">Telefone</label><input id="tel" type="text" value="${v}">
  <label for="nick">Apelido</label><input id="nick" type="text" value="">
  <button id="tgl" type="button" aria-expanded="false">Nao concluidas</button>
  <div id="panel" hidden><p>Item um</p></div>
  <button id="dis" type="button" disabled>Salvar</button>
  <input id="chk" type="checkbox" checked><label for="chk">Aceito</label>
  <p id="msg">Mensagem visivel</p>
  <button id="gone" type="button">Esconder</button>
  <script>
  document.getElementById("tgl").onclick = function () { var open = this.getAttribute("aria-expanded") === "true"; this.setAttribute("aria-expanded", String(!open)); document.getElementById("panel").hidden = open; };
  document.getElementById("gone").onclick = function () { document.getElementById("msg").remove(); };
  </script></body></html>`;
  const VALUE_A = "11999990000";
  const VALUE_B = "22888880000";
  const server = createServer((req, res) => {
    const path = String(req.url).split("?")[0];
    hits[path] = (hits[path] || 0) + 1;
    const html = path === "/form" || path === "/formA" ? page(VALUE_A) : path === "/formB" ? page(VALUE_B) : null;
    if (html === null) { res.writeHead(404, { "content-type": "text/plain" }); res.end("nf"); return; }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
  const base = "http://127.0.0.1:" + server.address().port;
  const root = mkdtempSync(join(tmpdir(), "relay-qa-v2p4-"));
  try {
    const runAbs = join(root, ...RUN_REL.split("/"));
    mkdirSync(join(runAbs, "grounding"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: {} }));
    const role = (r, name) => ({ kind: "role", role: r, name, matches: 1 });
    const formEntries = [role("heading", "Perfil"), role("textbox", "Telefone"), role("textbox", "Apelido"), role("button", "Nao concluidas"), role("button", "Salvar"), role("checkbox", "Aceito"), role("button", "Esconder"), { kind: "text", text: "Mensagem visivel", matches: 1 }];
    const miniEntries = [role("heading", "Perfil"), role("textbox", "Telefone")];
    const snapshot = (route, entries) => JSON.stringify({ schema_version: 1, role: "anonymous", route, entries });
    writeFileSync(join(runAbs, "grounding", "anonymous--form.snapshot.json"), snapshot("/form", formEntries));
    writeFileSync(join(runAbs, "grounding", "anonymous--forma.snapshot.json"), snapshot("/formA", miniEntries));
    writeFileSync(join(runAbs, "grounding", "anonymous--formb.snapshot.json"), snapshot("/formB", miniEntries));
    const goto = (path) => ({ action: "goto", path });
    const head = { action: "expect_visible", role: "heading", name: "Perfil" };
    const tel = { role: "textbox", name: "Telefone" };
    const grp = { role: "button", name: "Nao concluidas" };
    const gone = { action: "expect_not_visible", text: "Mensagem visivel" };
    const defs = [
      ["Passes every new step", ["1. Open the profile.", "2. The phone holds a number containing 9999.", "3. Toggle the group, then hide the message."],
        [goto("/form"), head, { action: "expect_value", ...tel, not_empty: true }, { action: "expect_value", ...tel, contains: "9999" },
          { action: "expect_state", ...grp, state: "expanded", equals: false }, { action: "click", ...grp }, { action: "expect_state", ...grp, state: "expanded", equals: true },
          { action: "expect_state", role: "button", name: "Salvar", state: "disabled", equals: true }, { action: "expect_state", role: "checkbox", name: "Aceito", state: "checked", equals: true },
          { action: "click", role: "button", name: "Esconder" }, gone]],
      ["Empty field", ["1. Open the profile.", "2. The nickname is filled."], [goto("/form"), head, { action: "expect_value", role: "textbox", name: "Apelido", not_empty: true }]],
      ["Wrong equals", ["1. Open the profile.", "2. The phone equals 000."], [goto("/form"), head, { action: "expect_value", ...tel, equals: "000" }]],
      ["Still visible", ["1. Open the profile.", "2. The message is gone."], [goto("/form"), head, gone]],
      ["Collapsed", ["1. Open the profile.", "2. The group is expanded."], [goto("/form"), head, { action: "expect_state", ...grp, state: "expanded", equals: true }]],
      ["No state exposed", ["1. Open the profile.", "2. Save is collapsed."], [goto("/form"), head, { action: "expect_state", role: "button", name: "Salvar", state: "expanded", equals: false }]],
      ["No value exposed", ["1. Open the profile.", "2. Save holds a value."], [goto("/form"), head, { action: "expect_value", role: "button", name: "Salvar", not_empty: true }]],
      ["No anchor", ["1. Open the profile.", "2. The message is gone."], [goto("/form"), gone]],
      ["Masked A", ["1. Open the profile.", "2. The phone is filled."], [goto("/formA"), { action: "expect_value", ...tel, not_empty: true }]],
      ["Masked B", ["1. Open the profile.", "2. The phone is filled."], [goto("/formB"), { action: "expect_value", ...tel, not_empty: true }]],
      ["Unmasked A", ["1. Open the profile.", "2. The title shows."], [goto("/formA"), head]],
      ["Unmasked B", ["1. Open the profile.", "2. The title shows."], [goto("/formB"), head]],
    ];
    const block = (n, d) => ["### Case " + n, "**Title:** " + d[0], "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", ...d[1], ""].join("\n");
    writeFileSync(join(root, "PRPs", "reports", FEATURE, "qa-report.md"), "# QA Report\n\n## Test Cases\n\n" + defs.map((d, i) => block(i + 1, d)).join("\n") + "\n## Notes\n\nnone\n");
    writeFileSync(join(runAbs, "plan.json"), JSON.stringify({ schema_version: 1, cases: defs.map((d, i) => ({ index: i + 1, title: d[0], driver: "browser", role: null, state: "none", steps: d[2] })) }));
    const out = await new Promise((resolveP, rejectP) => {
      const child = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", FEATURE, "--run-dir", RUN_REL], { cwd: root, env: { ...process.env, GIT_CEILING_DIRECTORIES: dirname(root) }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
      let so = "";
      let se = "";
      child.stdout.on("data", (d) => (so += d));
      child.stderr.on("data", (d) => (se += d));
      const timer = setTimeout(() => child.kill(), 240000);
      child.on("error", (e) => { clearTimeout(timer); rejectP(e); });
      child.on("close", (code) => { clearTimeout(timer); resolveP({ code, so, se }); });
    });
    check(out.code === 0, "the runner exited " + out.code + ": " + out.se);
    const res = JSON.parse(readFileSync(join(runAbs, "results.json"), "utf8"));
    const c = res.cases;
    const want = [["pass", null], ["fail", null], ["fail", null], ["fail", null], ["fail", null], ["blocked", "STEP_NOT_PERFORMABLE"], ["blocked", "STEP_NOT_PERFORMABLE"], ["needs-human", "PLAN_ENTRY_INVALID"], ["pass", null], ["pass", null], ["pass", null], ["pass", null]];
    want.forEach(([o, rc], i) => check(c[i] && c[i].outcome === o && c[i].reason_code === rc, "case " + (i + 1) + " (" + defs[i][0] + "): " + JSON.stringify(c[i] && [c[i].outcome, c[i].reason_code, c[i].reason])));
    check(hits["/form"] === 7, "case 8 must be refused before any side effect: /form was requested " + hits["/form"] + " times, expected 7");
    for (const x of c) for (const word of ["Telefone", "Apelido", "Salvar", VALUE_A, VALUE_B, "9999"]) check(!String(x.reason || "").includes(word), "a reason echoes " + word + ": " + x.reason);
    const read = (rel) => JSON.parse(readFileSync(join(root, ...rel.split("/")), "utf8"));
    const ev1 = read(RUN_REL + "/evidence/case-1.value-3.json");
    check(same(ev1, { action: "expect_value", step: 3, locator: { role: "textbox", name: "Telefone" }, comparison: "not_empty", result: "passed" }), "the passing comparison evidence: " + JSON.stringify(ev1));
    const ev2 = read(RUN_REL + "/evidence/case-2.value-3.json");
    check(same(ev2, { action: "expect_value", step: 3, locator: { role: "textbox", name: "Apelido" }, comparison: "not_empty", result: "failed" }), "the failing comparison evidence: " + JSON.stringify(ev2));
    const stepRec = c[0].steps[2];
    check(stepRec && stepRec.action === "expect_value" && String(stepRec.evidence).endsWith("/evidence/case-1.value-3.json"), "the comparison evidence is not attributed to its step: " + JSON.stringify(stepRec));
    const walk = (d, acc) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, acc); else acc.push(p); } return acc; };
    for (const f of walk(runAbs, []).filter((p) => !p.endsWith("plan.json"))) {
      const txt = readFileSync(f).toString("latin1");
      for (const v of [VALUE_A, VALUE_B]) if (txt.includes(v)) check(false, "an input value reached " + f);
    }
    for (const v of [VALUE_A, VALUE_B]) check(!(out.so + out.se).includes(v), "an input value reached the terminal");
    const png = (i) => { const p = (c[i].evidence || []).find((e) => String(e).endsWith(".png")); if (!p) { check(false, "case " + (i + 1) + " has no screenshot"); return Buffer.alloc(0); } return readFileSync(join(root, ...p.split("/"))); };
    check(Buffer.compare(png(8), png(9)) === 0, "the two masked screenshots differ: the input value is visible in the final capture");
    check(Buffer.compare(png(10), png(11)) !== 0, "the control screenshots are identical: the mask check cannot detect a visible value");
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true });
  }
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  node --test scripts/validate/checks/qa-run-ui-grounding.test.mjs
  ```
  Before this task the new exports do not exist, so the import fails. The end-to-end half drives the real runner with an async `spawn` against a loopback page and a real Chromium (no junction is needed: the real script resolves Playwright through the worktree `node_modules`). It asserts the verdict and reason code of eleven cases and the refusal of the twelfth before any request (`/form` is requested exactly seven times), that the comparison evidence is the closed shape and is attributed to its step, that neither value reaches any run file or terminal stream, and, by comparing the final screenshots of two pages that differ only in the field value, that the mask hides it (the control pair proves that the comparison can see a visible value). The existing UI-grounding test file runs unchanged and covers the locator forms, the legacy messages and the browser end to end.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — the mode list, four marked literal examples and the rules of the four steps

- **ACTION**: Delivers AC-A8 (every new step has a flat literal example preceded by the `<!-- qa-step-example driver=... -->` marker that validates against the script, and the doc matches the script). In `plugins/relay/commands/relay-qa-run.md`, with LF line endings and one physical line per pinned token (the contract and the VALIDATE use raw `includes` on lines, while the doc hard-wraps its prose):
  1. Line 29: the see-list line becomes ``- `${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs` — the runner script (`parse`, `init`, `run`, `ground`) this command calls.`` (the carry-over fix: `ground` was missing).
  2. Directly after the paragraph that ends ``and an existing `selector` step is unchanged.`` (the role-list paragraph) and before the paragraph that starts `Grounding rules.`, insert the browser block below. It sits after the first role-and-name example and the first text example that the UI-grounding test picks, and outside both doc slices the stable-grounding tests cut. Keep each of `expect_value`, `expect_not_visible`, `expect_state`, `not_empty` and the phrase `for up to 5 seconds` unbroken on one physical line, and write no sentence that begins `Grounding rules.`, `Personal data.` or `The closed vocabulary.`:
     - an introductory paragraph: three further `browser` actions assert more than presence; each is flat, takes only the grounded locator forms (never a `selector`), counts as one expectation and is planned only from a snapshot entry whose `matches` is exactly `1`;
     - the literal `browser` example of `expect_value`, preceded by the marker line: ``{ "action": "expect_value", "role": "textbox", "name": "Telefone", "not_empty": true }``, then a paragraph: it takes `role` and `name` and exactly one of `equals` (a string), `contains` (a non-empty string) or `not_empty` (always `true`); `{{name}}` bindings are allowed in `equals` and `contains`; a literal `equals` or `contains` must come from the report's own steps; the comparison is exact, `not_empty` ignores surrounding whitespace; the evidence records which comparison ran and whether it passed, never the value, and the final screenshot masks the field; an element that holds no value (it is not an input, a textarea or a select) blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted;
     - the literal `browser` example of `expect_not_visible`: ``{ "action": "expect_not_visible", "role": "listitem", "name": "Buy milk" }``, then a paragraph: it takes `role` and `name`, or `text`; it passes only when the grounded locator is hidden or absent, re-checked for up to 5 seconds (keep `for up to 5 seconds` on one line); it is valid only after a positive step on the same route in the same case, an `expect_visible`, `expect_text`, `expect_value` or `expect_state` step since the last `goto`; otherwise the entry is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested, because an absence step alone would pass on a page that never rendered; the element must be one the snapshot already lists (an element that only appears after an interaction is still `UNGROUNDABLE_AFTER_INTERACTION`);
     - the literal `browser` example of `expect_state`: ``{ "action": "expect_state", "role": "button", "name": "Não concluídas", "state": "expanded", "equals": false }``, then a paragraph: it takes `role` and `name`, a `state` of `expanded`, `disabled` or `checked` and a boolean `equals` that is always written; it passes only when the element's state equals `equals`, re-read for up to 5 seconds (again `for up to 5 seconds` unbroken); `expanded` reads `aria-expanded`, `disabled` follows Playwright's definition of a disabled element and `checked` reads the checked state of a checkbox or radio; an element that exposes no such state (a button with no `aria-expanded`, a `details` disclosure, a non-checkbox) blocks the case `STEP_NOT_PERFORMABLE` and never passes as collapsed or unchecked.
  3. Directly after the paragraph that starts ``An `http` `request` step may carry an optional `origin` `` (before `Statement rule:`), insert: a line `A literal `origin` step sent without the role's session:`, the marker ``<!-- qa-step-example driver=http -->`` and an LF `json` fence holding ``{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "session": "none", "expect_status": 401 }``, then a paragraph: the optional `session` key has one legal value, `"none"`, and only an `http` `request` step may carry it, with or without `origin` (any other value, and the key on a `query` or a `browser` step, is `PLAN_ENTRY_INVALID`); the step is sent with no cookie, no storage state and no derived header, through the same local-only guard, so a non-local origin still blocks the case `FAILED_NON_LOCAL_TARGET` before any request; every other step of the case keeps the role's session and a step without `session` behaves exactly as before; a `"session": "none"` step to a header-bearing origin needs no role, and an entry whose every request carries it names no role, because the runner still obtains the session of a role the entry names.
  4. In the honesty rules, directly after the bullet that starts `- Plan a browser step by a role-and-name or text locator only from an entry of a`, add two bullets: plan `"session": "none"` only when the report's own step asks for a request made without the session (a rejection such as 401 or 403, or a public endpoint) and never to avoid a login; and plan `expect_not_visible` only after a positive step of the same route, `expect_value` and `expect_state` only on an entry whose `matches` is exactly `1`, with the expected value or state taken from the report's own steps, never from the snapshot.
  Do not write any of these phrases anywhere (tests ban them): `Until seeds`, `not yet read by the runner`, `a CLI, a database query`, `leave the case to the script`, `You write no plan entry for this`, `are all registered for redaction`, `Write ONLY the cases`, `omit the case`, a bullet that starts `- Omit any case`; and none of `design-spec`, `relay-auth-setup`, `subagent_type`, `.claude/PRPs`, or the substring `--local-host`. Leave the classification table, the catalogue table, every `json` block that carries `class` or `reason_code`, the `Grounding browser steps.` to `The closed vocabulary.` slice, the `Grounding rules.` to `Personal data.` slice and the `### Record resolution` section byte-identical.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:250-256` (the locator-forms paragraph the new block follows) and `# SOURCE: plugins/relay/commands/relay-qa-run.md:298-305` (the origin example and paragraph the session-less example follows).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  BASE=01627ecf0f19558989a709a5c731f7d19d26d8d7
  git cat-file -e "${BASE}^{tree}"
  BASE_TREE="$BASE" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { execFileSync } from "node:child_process";
  import { validateStep, validateSteps, EXPECT_STATES } from "./plugins/relay/scripts/qa-run.mjs";
  const problems = [];
  const check = (cond, msg) => { if (!cond) problems.push(msg); };
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const base = execFileSync("git", ["show", process.env.BASE_TREE + ":plugins/relay/commands/relay-qa-run.md"], { encoding: "utf8", maxBuffer: 16777216 }).replace(/\r\n/g, "\n");
  const lines = doc.split("\n");
  const onOneLine = (token) => lines.some((l) => l.includes(token));

  // The mode list line names every mode of the script.
  const seeLine = lines.find((l) => l.includes("scripts/qa-run.mjs") && l.includes("the runner script ("));
  check(seeLine !== undefined && ["parse", "init", "run", "ground"].every((m) => seeLine.includes("`" + m + "`")), "the see-list line does not list parse, init, run and ground: " + seeLine);

  // The marked literal examples validate against the script and cover every new step.
  const fence = /<!-- qa-step-example driver=(\w+) -->[ \t]*\n\x60\x60\x60json\n([\s\S]*?)\n\x60\x60\x60/g;
  const ex = [...doc.matchAll(fence)].map((m) => ({ driver: m[1], step: JSON.parse(m[2]) }));
  for (const e of ex) check(validateStep(e.driver, e.step) === null, "a marked example does not validate: " + e.driver + " " + JSON.stringify(e.step));
  const has = (driver, pred) => ex.some((e) => e.driver === driver && pred(e.step));
  check(has("http", (s) => s.action === "request" && s.origin === "api" && s.session === "none" && s.expect_status === 401), "no marked http example with session none");
  check(has("browser", (s) => s.action === "expect_value" && s.role === "textbox" && s.not_empty === true), "no marked expect_value example");
  check(has("browser", (s) => s.action === "expect_not_visible" && typeof s.role === "string"), "no marked expect_not_visible example");
  check(has("browser", (s) => s.action === "expect_state" && EXPECT_STATES.includes(s.state) && typeof s.equals === "boolean"), "no marked expect_state example");
  const absence = ex.find((e) => e.step.action === "expect_not_visible");
  const anchor = { action: "expect_visible", role: "heading", name: "Perfil" };
  if (absence) {
    check(validateSteps("browser", [{ action: "goto", path: "/p" }, anchor, absence.step], []) === null, "the absence example with an anchor must validate as a sequence");
    check(validateSteps("browser", [{ action: "goto", path: "/p" }, absence.step], [])?.code === "PLAN_ENTRY_INVALID", "the absence example alone must be refused as a sequence");
  }
  check(ex.filter((e) => e.driver === "browser").length >= 6 && [...new Set(ex.map((e) => e.driver))].sort().join(",") === "browser,http", "the example drivers must stay exactly browser and http");
  // The first role-and-name and the first text browser example are still the ones the UI-grounding test picks.
  const firstRole = ex.find((e) => e.driver === "browser" && typeof e.step.role === "string" && typeof e.step.name === "string" && e.step.selector === undefined);
  const firstText = ex.find((e) => e.driver === "browser" && typeof e.step.text === "string" && e.step.selector === undefined && e.step.role === undefined);
  check(firstRole && firstRole.step.action === "click" && firstText && firstText.step.action === "expect_visible", "a new example displaced the first role-and-name or the first text example");

  // Pinned tokens, each on one physical line.
  for (const token of ["expect_value", "expect_not_visible", "expect_state", "not_empty", "\"session\": \"none\"", "for up to 5 seconds", ...EXPECT_STATES]) check(onOneLine(token), "no physical line carries " + token);
  // The honesty and the rule paragraphs are present.
  const flat = doc.replace(/\s+/g, " ");
  check(/only an `http` `request` step may carry it/.test(flat), "the session rule sentence is missing");
  check(/positive step on the same route in the same case/.test(flat), "the anchor rule sentence is missing");

  // The slices the tests cut, and the record-resolution section, are byte-identical to the base.
  // RELAY-FIRST-MATCH-INTENDED: every anchor below is the first (and only) occurrence in both texts, which is exactly what the doc-reading tests slice on.
  const slice = (t, a, b) => t.slice(t.indexOf(a), t.indexOf(b));
  for (const [a, b] of [["Grounding browser steps.", "The closed vocabulary."], ["Grounding rules.", "Personal data."], ["### Record resolution", "- The outcome comes from the JUnit testcases"]]) {
    const was = slice(base, a, b);
    check(was.length > 100 && was === slice(doc, a, b), "the slice from " + a + " to " + b + " changed");
  }
  for (const phrase of ["Until seeds", "not yet read by the runner", "a CLI, a database query", "leave the case to the script", "You write no plan entry for this", "are all registered for redaction", "Write ONLY the cases", "design-spec", "relay-auth-setup", "subagent_type", "--local-host"]) check(!doc.includes(phrase), "a banned phrase is present: " + phrase);
  check(!/omit the case/i.test(doc) && !lines.some((l) => l.startsWith("- Omit any case")), "an omit-the-case phrase is present");
  if (problems.length > 0) { console.error(problems.join("\n")); process.exit(1); }
  '
  node --test scripts/validate/checks/qa-run-classification.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs scripts/validate/checks/qa-run-stable-grounding.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-per-test-resolution.test.mjs scripts/validate/checks/qa-run-query.test.mjs
  ```
  Before this task the doc lacks the examples and the mode, so the first script exits non-zero. The mutation-free checks read the real doc and the base tree's doc (`git show <tree>:<path>` works for a tree object); the slice-equality checks prove that the three regions the existing doc-reading tests cut are untouched. The six test files are the existing doc-reading and example-validating tests; the stable-grounding file includes browser runs and takes about three minutes.

### Task 5: UPDATE plugins/relay/resources/redaction-policy.md — the `Input values` bullet states the evidence shape and the screenshot mask

- **ACTION**: Delivers AC-A4 (the policy that the runner's behavior is documented against states that an asserted input value reaches no evidence file, no result, no reason and no terminal line, and that the final screenshot masks the field). Replace the two-line bullet at the end of the `### Snapshots, screenshots and personal data` subsection with:
  ```
  - **Input values.** An input value asserted by the runner is never written,
    only the result of the comparison: the evidence names which comparison ran
    and whether it passed, and the final screenshot masks the located field, so
    the value reaches no evidence file, no result, no reason and no terminal line.
  ```
  Keep the bullet label, the section and subsection headings (`auth-secrecy` pins `## QA runner evidence: session values, snapshots, screenshots and personal data`, `### Session values are registered source-first` and `### Snapshots, screenshots and personal data`), the `git check-ignore`, `FAILED_IGNORE_UNPROVEN`, `not-applicable`, `grounding/`, `evidence/`, `.gitignore`, `PRPs/redaction-extensions.txt` tokens and the two floor numbers (`12 characters`, `3.0 bits per character`) untouched. Do not name any resource file by basename (the resource-basename rule of `plugin-root-resolvable`).
- **MIRROR**: `# SOURCE: plugins/relay/resources/redaction-policy.md:240-241` (the bullet being made precise).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const policy = readFileSync("plugins/relay/resources/redaction-policy.md", "utf8").replace(/\r\n/g, "\n");
  const bullet = /- \*\*Input values\.\*\*[\s\S]*?\n(?:\n|$)/.exec(policy);
  if (bullet === null) fail("the Input values bullet is missing");
  const flat = bullet[0].replace(/\s+/g, " ");
  for (const needle of ["never written", "which comparison ran", "masks the located field", "no terminal line"]) {
    if (!flat.includes(needle)) fail("the Input values bullet lacks: " + needle + " | " + flat);
  }
  const r = runAuthSecrecyCheck();
  if (!r.ok) fail("auth-secrecy failed: " + JSON.stringify(r.findings, null, 2));
  '
  node --test scripts/validate/checks/auth-secrecy.test.mjs
  ```
  The prose is the whole deliverable of this task, so a text match on the four phrases is the effect check; the real-tree `auth-secrecy` run and its existing test file prove that no pinned heading or token moved.

### Task 6: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin the helper wiring, the validator behavior, the mode list and the marked examples behind an opt-in flag

- **ACTION**: Delivers AC-A8 (the contract check is extended, not duplicated; the registered count stays 28) and AC-A9 (the wiring that keeps the session-less request on the existing guard, and the doc that names every new step with a validating example, cannot silently drift). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Widen the import from `../../../plugins/relay/scripts/qa-run.mjs` to also import `validateSteps`, `EXPECT_STATES` and `ASSERT_SETTLE_MS`.
  2. Add the input `requireVocabulary` (default `false`, exactly like `requirePrivacy`) to the destructured signature of `checkQaRunContract` and to its JSDoc type, and extend the file's header comment to list the new rules. Do NOT edit the `requireGround`, `requireCatalogue` or `requirePrivacy` blocks (tests pin exactly four findings from `requireGround` on a bare doc).
  3. In the existing example loop only collect each parsed example (`{ driver, step }`) into an array declared before it; add no finding of its own there.
  4. When `requireVocabulary` is true, every finding message starts with the word `vocabulary:` and contains neither `step example` nor `is outside the closed vocabulary` nor a catalogue code. In the script text: `export function httpContextOptions(` must occur exactly once; the text from `DRIVERS.http = async (` to `async function runLocatorStep(` must contain `httpContextOptions(` and `fetchAnonymously(`; the text from `async function runLocatorStep(` to `DRIVERS.browser = async (` must contain each of `'expect_value'`, `'expect_not_visible'` and `'expect_state'` (so no new action can fall through into the text comparison); a section that cannot be located is itself a finding. Behavior pins through the imported validators: `validateStep('http', { action: 'request', method: 'GET', path: '/x', session: 'none', expect_status: 401 })` must be `null`; the same step with `session: 'cookie'`, and a browser `goto` carrying `session`, must be refused; `validateStep('browser', { action: 'expect_value', selector: '#a', not_empty: true })` must be refused (the three new steps accept grounded locators only); `validateSteps('browser', [goto, expect_not_visible])` must be refused and `[goto, expect_visible, expect_not_visible]` must pass. In the command text: the see-list must name `parse`, `init`, `run` and `ground` (match the parenthesis after `the runner script (`); the doc must contain `expect_value`, `expect_not_visible`, `expect_state`, `not_empty`, `"session": "none"`, every entry of `EXPECT_STATES` and `for up to ${ASSERT_SETTLE_MS / 1000} seconds`; and the collected examples must include an `http` `request` step with `session: 'none'` and a `browser` step of each of the three new actions.
  5. `runQaRunContractCheck` passes `requireVocabulary: true` beside the three existing flags. No other caller changes. Add no write call and no new registered check.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:215-219` (the flag beside `requirePrivacy` in the signature and the JSDoc type), `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:339-358` (the example loop that collects) and `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:385-392` (the doc tokens and numbers that follow exported constants).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  import { checkQaRunContract, runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const script = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8").replace(/\r\n/g, "\n");
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const input = (o = {}) => ({ scriptText: script, commandText: doc, results: [], requireVocabulary: true, ...o });
  const clean = checkQaRunContract(input());
  if (!clean.ok) fail("the real runner and doc must satisfy the vocabulary rules: " + JSON.stringify(clean.findings));
  const flagged = (label, r, token) => { if (r.ok || !r.findings.some((f) => f.message.startsWith("vocabulary:") && f.message.includes(token))) fail(label + " was not flagged naming " + token + ": " + JSON.stringify(r.findings)); };
  const without = (src, token) => { if (!src.includes(token)) fail("the mutation token is absent from the real text: " + token); return src.split(token).join("ZZ_REMOVED"); };
  const once = (src, anchor) => { const n = src.split(anchor).length - 1; if (n !== 1) fail("a section marker must occur exactly once, found " + n + ": " + anchor); return anchor; };

  flagged("a doc without the session example", checkQaRunContract(input({ commandText: without(doc, "\"session\": \"none\"") })), "session");
  flagged("a doc without expect_value", checkQaRunContract(input({ commandText: without(doc, "expect_value") })), "expect_value");
  flagged("a doc without expect_not_visible", checkQaRunContract(input({ commandText: without(doc, "expect_not_visible") })), "expect_not_visible");
  flagged("a doc without expect_state", checkQaRunContract(input({ commandText: without(doc, "expect_state") })), "expect_state");
  flagged("a doc without not_empty", checkQaRunContract(input({ commandText: without(doc, "not_empty") })), "not_empty");
  flagged("a doc that lost ground in the see-list", checkQaRunContract(input({ commandText: without(doc, "`run`, `ground`)").replace("ZZ_REMOVED", "`run`)") })), "ground");
  flagged("a doc whose re-read window disagrees", checkQaRunContract(input({ commandText: without(doc, "for up to 5 seconds") })), "seconds");
  flagged("a script without the options helper", checkQaRunContract(input({ scriptText: without(script, "export function httpContextOptions(") })), "httpContextOptions");

  // Section-limited mutations, built from the real text (each marker is asserted to occur exactly once).
  // RELAY-FIRST-MATCH-INTENDED: every marker below is asserted unique by once(), so indexOf and the slices are unambiguous.
  const httpAt = script.indexOf(once(script, "DRIVERS.http = async ("));
  const locAt = script.indexOf(once(script, "async function runLocatorStep("));
  const browserAt = script.indexOf(once(script, "DRIVERS.browser = async ("));
  if (!(httpAt < locAt && locAt < browserAt)) fail("the three sections are not in the expected order");
  const httpSection = script.slice(httpAt, locAt);
  const locSection = script.slice(locAt, browserAt);
  const noAnon = httpSection.split("fetchAnonymously(").join("renamedFetch(");
  flagged("an http driver that no longer reroutes through the anonymous fetch", checkQaRunContract(input({ scriptText: script.slice(0, httpAt) + noAnon + script.slice(locAt) })), "fetchAnonymously");
  const noState = locSection.split("'expect_state'").join("'x_state'");
  if (noState === locSection) fail("the locator section does not contain the quoted expect_state literal");
  flagged("a locator step without an expect_state branch", checkQaRunContract(input({ scriptText: script.slice(0, locAt) + noState + script.slice(browserAt) })), "expect_state");

  // A caller that does not opt in sees none of the new rules.
  const quiet = checkQaRunContract(input({ requireVocabulary: false, commandText: without(doc, "expect_value"), scriptText: without(script, "export function httpContextOptions(") }));
  if (quiet.findings.some((f) => f.message.startsWith("vocabulary:"))) fail("the vocabulary rules leaked into a caller that did not opt in: " + JSON.stringify(quiet.findings));
  const real = runQaRunContractCheck();
  if (!real.ok) fail("the real-tree contract failed: " + JSON.stringify(real.findings, null, 2));
  '
  node --test scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-case-vocabulary.test.mjs
  ```
  Before this task the new flag is ignored, so every `flagged(...)` assertion exits non-zero. Every mutation is built from the real script or doc text with a token asserted to be present, and the section markers are asserted unique. The quoted `expect_state` literal is written with `'` because the command lives in a single-quoted shell string; the resulting text is the single-quoted JavaScript literal the runner contains, so the Implementer must write the action names with single quotes in the locator branches, as the Task 3 ACTION states. The two existing test files run unchanged and prove the `false` default.

## Validation Commands

The plan writer has no shell tool: every command below, and every per-task `VALIDATE` above, was derived by reading the current tree, not executed.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
node --check scripts/validate/checks/auth-secrecy.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
# The diff base for this phase is the tree recorded after Phase 3 (single-argument form: working tree against the tree object).
BASE=01627ecf0f19558989a709a5c731f7d19d26d8d7
git cat-file -e "${BASE}^{tree}"
# The runner keeps the exact outcome vocabulary and the same eight plan-facing codes, and both extended checks hold on the real tree.
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { runAuthSecrecyCheck } from "./scripts/validate/checks/auth-secrecy.mjs";
import { OUTCOMES, REASON_CATALOGUE } from "./plugins/relay/scripts/qa-run.mjs";
const fail = (m) => { console.error(m); process.exit(1); };
if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
const want = ["EXTERNAL_CHANNEL", "PARTIAL_REMAINDER", "PRODUCT_DEFECT", "STATE_UNCONFIRMED", "STEP_UNGROUNDED", "UNGROUNDABLE_AFTER_INTERACTION", "VISUAL_JUDGEMENT", "VOCABULARY_GAP"];
if (Object.keys(REASON_CATALOGUE).sort().join(",") !== want.join(",")) fail("the plan-facing catalogue changed: " + Object.keys(REASON_CATALOGUE).sort().join(","));
for (const r of [runQaRunContractCheck(), runAuthSecrecyCheck()]) if (!r.ok) fail(r.name + ": " + JSON.stringify(r.findings, null, 2));
'
# No static import of a sibling file was added to the runner (the copy-helper tests copy only the runner and the guard).
if grep -nE "^import .* from '\.\.?/" plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: qa-run.mjs gained a static sibling import"; exit 1
else
  echo "PASS: no static sibling import"
fi
# AC-14: the five frozen surfaces are byte-identical to the base tree.
frozen="$(git diff --name-only "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# Scope: apart from the PRPs/ pipeline artifacts and docs/ (the implement-time docs-sync pass owns docs/), only this phase's four files may differ from the base tree.
allowed="plugins/relay/commands/relay-qa-run.md
plugins/relay/resources/redaction-policy.md
plugins/relay/scripts/qa-run.mjs
scripts/validate/checks/qa-run-contract.mjs"
changed="$(git diff --name-only "$BASE" -- . ':(exclude)PRPs' ':(exclude)docs' | sort)"
extra="$(comm -13 <(printf '%s\n' "$allowed" | sort) <(printf '%s\n' "$changed") | sed '/^$/d')"
if [ -n "$extra" ]; then
  echo "FAIL: a file outside this phase's scope changed:"; printf '%s\n' "$extra"; exit 1
else
  echo "PASS: only the four planned files changed"
fi
# The documentation site and the two mirrored governance files are out of scope for this phase.
mirrored="$(git diff --name-only "$BASE" -- documentation docs/decisions.md docs/anti-patterns.md)"
if [ -n "$mirrored" ]; then
  echo "FAIL: documentation or a mirrored governance file changed:"; printf '%s\n' "$mirrored"; exit 1
else
  echo "PASS: documentation and mirrored governance files untouched"
fi
# The retired per-run host flag must not reappear in the two files the guard-site check lists.
if grep -nF -e "--local-host" plugins/relay/commands/relay-qa-run.md plugins/relay/scripts/qa-run.mjs; then
  echo "FAIL: --local-host appeared (forbidden by the auth-local-guard-sites check)"; exit 1
else
  echo "PASS: no --local-host"
fi
# No forbidden .claude/PRPs reference introduced by this phase's four files outside the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- plugins/relay/scripts/qa-run.mjs plugins/relay/resources/redaction-policy.md plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# This host has orphaned git fsmonitor daemons that stall git-backed tests; keep the environment below on every corpus run.
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
# The full static suite must still register and pass 28 checks (the summary line is printed by scripts/validate/index.mjs).
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out"; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
# The whole corpus, glob quoted (about 280 s on the baseline of 1933 tests). This design makes no existing assertion stale (see Notes), so nothing is excluded.
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** given a role case and an `http` `request` step `{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "session": "none", "expect_status": 401 }`, the step is sent through its own fresh request context with no cookie, no storage state and no derived header, after the local-only guard, and passes when the status is 401; the other steps of the same case keep the role's context; a plan without the `session` key behaves exactly as before (the derived header, the case cookie, `API_HEADER_NO_SESSION` for a header-bearing origin with no session).
- **AC-A2 (PRD AC-8):** `session` has one legal value, `"none"`, and only an `http` `request` step may carry it, with or without `origin`; any other value, and the key on a `query` step or a `browser` step, is `PLAN_ENTRY_INVALID`, so a step that claims to be anonymous can never silently run with the role's session; `stepRules`, `validateStep`, `validateSteps` and the `NO_EXPECTATION` rule agree (the key adds no expectation).
- **AC-A3 (PRD AC-9):** `{ "action": "expect_value", "role": "textbox", "name": "Telefone", "not_empty": true }` on a grounded locator passes or fails on the comparison; exactly one of `equals`, `contains` and `not_empty` is accepted, `{{name}}` bindings in `equals` and `contains` are validated before any side effect, and a literal comes from the report's own steps; an element that holds no value blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted.
- **AC-A4 (PRD AC-9):** the input value is never written: the evidence records the comparison kind and `passed` or `failed` (and nothing about the value or its length), no reason carries a value, and the final screenshot masks the field, so the value reaches no evidence file, result or terminal stream; `redaction-policy.md` states the same.
- **AC-A5 (PRD AC-10):** an `expect_not_visible` step with no earlier `expect_visible`, `expect_text`, `expect_value` or `expect_state` step on the same route (since the last `goto`) in the same case is `PLAN_ENTRY_INVALID` before any side effect; with an anchor it passes only when the grounded locator is hidden or absent (a locator that matches more than one element is `STEP_UNGROUNDED` and nothing is asserted).
- **AC-A6 (PRD AC-10):** `expect_state` with `expanded`, `disabled` or `checked` and a boolean `equals` on a grounded locator passes only when the element's state equals the declared value; a state the element does not expose (no `aria-expanded`, not a checkbox or radio) blocks the case `STEP_NOT_PERFORMABLE` and never passes.
- **AC-A7 (PRD AC-15):** a session-less request to an origin that is not loopback or a declared local origin halts `FAILED_NON_LOCAL_TARGET` before any request is sent; `qa-run.mjs` keeps exactly one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(` and no static sibling import, and `auth-local-guard-sites` still passes with no new entry (the existing guard calls cover the new path).
- **AC-A8 (PRD AC-17, AC-18):** every new step has a flat literal example preceded by the `<!-- qa-step-example driver=... -->` marker that validates against the script, the doc's mode list names `ground`, `qa-run-contract` is extended behind an opt-in flag (the registered count stays 28), `npm run validate` passes all 28 checks and the corpus is green with no existing assertion edited by the Implementer.
- **AC-A9 (PRD AC-14):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-phase content, `OUTCOMES` is still exactly the four values, and the plan-facing reason-code catalogue is unchanged.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An absence step passes after a click navigated the page away: the anchor proves that the route rendered earlier in the case, not at the instant of the absence check (a locator that matches nothing is hidden) | M | H | The locator must be one the snapshot of that route already lists with `matches` exactly 1; a `goto` resets the anchor; the positive assertion set excludes `click`, `fill`, `goto` and `expect_url`; the doc tells the planner to follow a navigation with a positive step; the dogfood reads every `pass` against its evidence and the end-of-case screenshot (Phase 8) |
| A state or value is read once and the page has not settled, so a correct case fails (a false `fail`, which sends a good build back) | M | M | `settleAssertion` re-reads every 100 ms for up to 5 seconds and accepts on the first matching read; a rejection needs a successful read that did not match; the constants are exported and the Phase 8 dogfood recalibrates them |
| The re-read converts a transient state into a `pass` | L | M | A pass needs one read equal to the declared value, the same semantics as Playwright's own retrying assertions; the step is re-checked only inside its own window; the limitation is stated in `## Notes` |
| The installed Playwright differs from the documented semantics (a zero-match `isHidden`, `isChecked` on an ARIA widget, `isDisabled` on an `aria-disabled` element, a strict-mode throw) | M | M | Every read that throws is unreadable and ends the case blocked, never passed; the live probe in `## Notes` records the real behavior before the branches are written and states what to do when it differs; the research found these zero-match and strict-mode behaviors undocumented in the API reference, so they are verified live, not assumed |
| An existing source-text anchor is disturbed (the HTTP driver tail, `maxRedirects: 0`, `request: { method: step.method, path: step.path }`, `if (isObj(record)) {`, a second `writeFileSync(` or `// GUARD-SITE`) and an existing mutation test stops proving what it proves | M | H | Task 2 lists every anchor; the fetch options object is reused, not rebuilt; the evidence addition is an appended spread; Level 2 runs the real-tree contract and Level 3 the whole corpus, including the mutation tests |
| A doc edit breaks a doc-reading test (the two cut slices, the first-example picks, the catalogue-table rows, a banned phrase, a pinned token split across a hard-wrapped line) | M | M | Task 4 names every pin and the safe placement; its `VALIDATE` compares the three cut regions with the base tree byte for byte and re-derives the example picks, then runs the six doc-reading test files |
| An input value is visible in the final screenshot (a viewport capture shows the field) | M | H | The located field of every `expect_value` step is masked in the final capture; the `VALIDATE` compares the screenshots of two pages that differ only in the value; the run directory's evidence is ignored and proven by Phase 3; a field outside the viewport is not in the image |
| A role case that carries only `"session": "none"` steps still obtains the role session (a login or a mint, possibly rotating a shared account's session) | L | M | Recorded as a non-goal; the doc tells the planner to name no role for a purely anonymous entry; the runner's session acquisition is unchanged so no existing behavior moves |
| `session: "none"` relaxes `API_HEADER_NO_SESSION` for a role-less entry that targets a header-bearing origin | L | M | The relaxation is per step and only for the explicit key; the request is sent with no header at all, so nothing is derived or leaked; the evidence of that step records `session: "none"` so a reader can see the request was anonymous |
| `research-web` reached its scope cap and found no primary source for zero-match, strict-mode and ARIA `isChecked` behavior, and the snapshot-token spellings come from main-branch source, not the installed version | M | L | None of the implementation depends on a snapshot token; the live probe verifies the locator APIs on the installed version; the decision and its evidence are recorded in `## Notes` |
| The `VALIDATE` scripts were derived by reading, not executed | M | M | Each fails before the work for a stated reason, each drives the real code, and Level 3 runs the whole corpus; a defect found at implement time is a plan defect to record, not a reason to weaken the check |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework (several additionally run `node --test` over existing test files that this plan does not edit).
- **Derived by reading.** The plan writer has no shell tool: every `VALIDATE` command and every Level command was derived by reading the current tree, not executed. Tasks 1 to 3 fail before the work (the new exports do not exist, so the import fails), Task 4 fails before the work (the doc lacks the examples and the mode), Task 5 fails before the work (the bullet lacks the new phrases) and Task 6 fails before the work (the flag is ignored, so every mutation goes unflagged). The Level 2 invariants pass on the unmodified tree by design, as regression guards.
- **Open Question 3, resolved with evidence.** `expect_state` reads the element's live state through Playwright's locator API (`getAttribute('aria-expanded')`, `isDisabled()`, `isChecked()`), not the accessibility-snapshot token. Verified by reading (the `research-web` findings, citing the main branch of `microsoft/playwright`, which is not pinned to the installed version): the snapshot renderer appends ` [checked]`, ` [checked=mixed]`, ` [disabled]`, ` [expanded]`, ` [pressed]`, ` [selected]`, ` [level=N]` and ` [invalid]` only for truthy values, each computed only for roles that support the state, and there is no `[expanded=false]`, `[disabled=false]` or `[checked=false]` token (`https://raw.githubusercontent.com/microsoft/playwright/main/packages/isomorphic/ariaSnapshotRenderer.ts` and `.../packages/injected/src/ariaSnapshot.ts`); the API reference lists `isChecked`, `isDisabled`, `isHidden`, `isVisible` and `inputValue` since v1.14, says `isChecked` throws for a non-checkbox and non-radio input and `inputValue` throws for anything but an input, a textarea or a select (`https://playwright.dev/docs/api/class-locator`), has `toBeHidden` count a locator that resolves to nothing as hidden and has no `toBeExpanded` (`https://playwright.dev/docs/api/class-locatorassertions`), and documents `locator.ariaSnapshot()` since v1.49. The decision follows from the first fact: a missing token cannot distinguish "collapsed" from "has no expanded state", so an `equals: false` read from the snapshot would pass on any non-expandable element, exactly the false `pass` AC-10 forbids, while `aria-expanded` is either `'true'`, `'false'` or absent, and absent is a blocked case. No code in this phase depends on a token spelling (the grounding parser keeps ignoring bracket attributes).
- **Not verifiable by reading, verified live (the procedure the Implementer must run before Task 3, and record in the implementation report).** The reference does not state the zero-match or strict-mode behavior of the state readers, and ARIA `isChecked` support has varied by version. **Live probe**: run the following from the worktree root (it opens a headless Chromium on an in-page document; it writes nothing and needs no server), then compare with the expected column:

  ```bash
  node --input-type=module -e '
  import { createRequire } from "node:module";
  import { resolve } from "node:path";
  const req = createRequire(resolve("plugins/relay/scripts/visual/package.json"));
  const pw = req("playwright");
  console.log("playwright", req("playwright/package.json").version);
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(`<button>Closed</button><button aria-expanded="false" id="c">ClosedAttr</button><button aria-expanded="true">OpenAttr</button><button disabled>Off</button><button aria-disabled="true">AriaOff</button><input type="checkbox" checked aria-label="Native"><div role="checkbox" aria-checked="true" aria-label="AriaOn" tabindex="0"></div><div role="switch" aria-checked="false" aria-label="Sw" tabindex="0"></div><div role="checkbox" aria-checked="mixed" aria-label="Mixed" tabindex="0"></div><input aria-label="Field" value="x"><div role="textbox" aria-label="Fake" contenteditable="true">y</div><details><summary>Det</summary><p>body</p></details>`);
  const probe = async (label, fn) => { try { console.log(label, "=>", JSON.stringify(await fn())); } catch (e) { console.log(label, "THROWS", String(e.message).split("\n")[0]); } };
  const b = (name) => page.getByRole("button", { name, exact: true });
  const cb = (name) => page.getByRole("checkbox", { name, exact: true });
  await probe("getAttribute ClosedAttr", () => b("ClosedAttr").getAttribute("aria-expanded", { timeout: 1000 }));
  await probe("getAttribute OpenAttr", () => b("OpenAttr").getAttribute("aria-expanded", { timeout: 1000 }));
  await probe("getAttribute Closed (no attribute)", () => b("Closed").getAttribute("aria-expanded", { timeout: 1000 }));
  await probe("isDisabled Off", () => b("Off").isDisabled({ timeout: 1000 }));
  await probe("isDisabled AriaOff", () => b("AriaOff").isDisabled({ timeout: 1000 }));
  await probe("isDisabled Closed", () => b("Closed").isDisabled({ timeout: 1000 }));
  await probe("isChecked Native", () => cb("Native").isChecked({ timeout: 1000 }));
  await probe("isChecked AriaOn", () => cb("AriaOn").isChecked({ timeout: 1000 }));
  await probe("isChecked Sw", () => page.getByRole("switch", { name: "Sw", exact: true }).isChecked({ timeout: 1000 }));
  await probe("isChecked Mixed", () => cb("Mixed").isChecked({ timeout: 1000 }));
  await probe("isChecked a plain button", () => b("Closed").isChecked({ timeout: 1000 }));
  await probe("inputValue Field", () => page.getByRole("textbox", { name: "Field", exact: true }).inputValue({ timeout: 1000 }));
  await probe("inputValue Fake (contenteditable)", () => page.getByRole("textbox", { name: "Fake", exact: true }).inputValue({ timeout: 1000 }));
  await probe("inputValue a button", () => b("Closed").inputValue({ timeout: 1000 }));
  await probe("count of a missing name", () => page.getByRole("button", { name: "Nope", exact: true }).count());
  await probe("isHidden of a missing name", () => page.getByRole("button", { name: "Nope", exact: true }).isHidden());
  await probe("isVisible of a missing name", () => page.getByRole("button", { name: "Nope", exact: true }).isVisible());
  await probe("isHidden of a two-match locator", () => page.getByRole("checkbox").isHidden());
  await probe("ariaSnapshot of the body", () => page.locator("body").ariaSnapshot());
  await browser.close();
  '
  ```

  Expected: `getAttribute` gives `"false"`, `"true"` and `null`; `isDisabled` gives `true` for `Off`, `true` for `AriaOff` and `false` for `Closed`; `isChecked` gives `true` for `Native` and `AriaOn` (if it THROWS for `AriaOn`, `Sw` or `Mixed`, the `checked` state on an ARIA widget is a blocked case, which is safe and already documented as "a checkbox or radio"); `isChecked` THROWS for a plain button; `inputValue` gives `"x"` for `Field` and THROWS for `Fake` and for a button; `count` of a missing name is `0`, `isHidden` is `true`, `isVisible` is `false`; `isHidden` of a two-match locator THROWS (a strict-mode violation, mapped to unreadable). The snapshot is informational: it should show `[expanded]` on `OpenAttr` only and `[disabled]` on `Off`, and an explicit `[checked]` on the checked ones. If `isDisabled` is `false` for `AriaOff`, then `disabled: false` would pass on an `aria-disabled` element: in that case read `aria-disabled` as well in the `disabled` branch (`'true'` from `getAttribute('aria-disabled')` counts as disabled) and say so in the doc sentence; if any zero-match read does not behave as listed, keep the fail-safe mapping (unreadable, blocked) and record the difference. Nothing here may be "fixed" by turning a throw into a pass.
- **Design decisions, recorded.**
  - `session` is validated in `stepRules` (so `validateStep`, `validateSteps` and the doc examples agree), as a closed set of one value, `"none"`; it is legal on an `http` `request` step with or without `origin`, and refused on `query` and browser steps because a browser case's anonymity is a role-less plan entry and a silently ignored `session` would let a step claim anonymity it does not have. It adds no expectation. The key is honored in three places that must agree: the `executeCase` pre-loop (a header-bearing origin needs no role when the step asks for no session), `prepareApiStep` (no derived header, guard still first) and the driver (a fresh isolated context; one per step so a `Set-Cookie` of one step cannot reach the next).
  - The anchor set is `expect_visible`, `expect_text`, `expect_value` and `expect_state`: each is an assertion that fails the case when its element is missing, so passing it proves the page rendered something on that route. `goto` is excluded because `page.goto` resolves for an error page; `click` and `fill` because they are actions and may precede a navigation; `expect_url` because it asserts a path, not content; `expect_not_visible` itself because a chain of absences must not anchor itself. A `goto` resets the anchor even to the same path, because the page was reloaded. The rule is in `validateSteps` only; at run time the anchor has passed by construction, since a failed step ends the case.
  - `expect_value` reads `locator.inputValue()` (the documented reader for an input, a textarea or a select), never text content (an input's text content is empty and the page text may hold other data) and never `evaluate`. A locator that matches an element with no value is a blocked case (`STEP_NOT_PERFORMABLE`), not a fail: the runner cannot compare, so it must not claim the product is wrong. The failure sentence names the closed comparison word (`equals`, `contains`, `not_empty`) and nothing else. `equals` is exact (no trimming, no case folding), `contains` is a non-empty substring, `not_empty` ignores surrounding whitespace; exactly one comparison per step.
  - A literal `equals` or `contains` of `expect_value` must appear in the report's own steps unless it carries a `{{name}}` binding, mirroring the `expect_text` rule and the PRD Architecture Note ("expectations still come from the report's own steps, never from the snapshot"). A bound value is validated against the declared captures by `validateSteps`, before any side effect, like every other value-bearing step.
  - The bounded re-read (5 seconds, every 100 ms) applies to the three new assertions because a value or a state is often populated by a request after the element renders; `expect_visible` already waits up to 10 seconds, and `expect_text` reads once (an existing behavior this phase does not change). The helper never returns the value it read, so a caller cannot leak it by accident.
  - No new reason code. `STEP_NOT_PERFORMABLE`, `STEP_UNGROUNDED`, `PLAN_ENTRY_INVALID`, `EVIDENCE_WRITE_FAILED`, `FAILED_NON_LOCAL_TARGET` and `API_HEADER_NO_SESSION` already exist and are runner outcomes, not causes a planner declares, so none belongs in the plan-facing `REASON_CATALOGUE`. `recordSteps` and `summarizeClassification` need no change: they carry the action name and count `passed` and `failed` steps generically, so each new action is one objective step with no counter edit (verified by reading lines 1307-1314 and 1686-1691).
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A9).** AC-A1: `httpContextOptions` (authenticated keys; the anonymous object has only `baseURL`); an end-to-end `run` on a loopback server that records `Cookie` and `Authorization` (the shape of this plan's Task 2 VALIDATE): the anonymous steps carry neither and the next authenticated step still carries both, a role-less entry with a header-bearing origin passes with `session: "none"` and keeps `API_HEADER_NO_SESSION` without it, the evidence of the step records `session: "none"`; `prepareApiStep` direct calls (guarded URL, `headers === null`, non-local origin refused, unchanged derivation without the key). AC-A2: the closed value set (`"none"` accepted; `"cookie"`, `""`, `null`, `0`, `true`, `{}`, `["none"]` refused), the key refused on `query` and browser steps, `validateStep` and `validateSteps` agreeing, `NO_EXPECTATION` unchanged. AC-A3: `validateStep` forms (exactly one comparison; `contains: ""`, `not_empty: false`, a text locator and a selector refused), an unbound and a bound `{{name}}` through `validateSteps`, the literal rule of `precheckGroundedSteps`, `compareInputValue` (exact, whitespace, empty equals), a browser run passing and failing each comparison, and a button (no value) blocking `STEP_NOT_PERFORMABLE`. AC-A4: the comparison evidence file (exact shape, attributed to its step, no value and no length), no reason echoing a value, an input value in no run file and no stream, and a pixel assertion that the field is masked in the final screenshot (decode the PNG with the visual tooling's own PNG library, or compare two pages that differ only in the value as this plan's Task 3 VALIDATE does). AC-A5: the sequence rule table (no anchor; anchor after; anchor on another route; `goto` to the same path; `expect_url`; `click`; legacy selector `expect_text` anchors; chains), refusal before any request (a counting server sees no hit), absent and present locators at run time, a two-match locator `STEP_UNGROUNDED`. AC-A6: each state true and false, an element with no `aria-expanded` blocked, a non-checkbox `checked` blocked, the re-read window with a fake clock for `settleAssertion` (accepted, rejected at the bound, unreadable). AC-A7: a non-local origin and an absolute path refused with zero requests. AC-A8 and AC-A9: the `requireVocabulary` rules (one finding per missing token, behavior pin, section and example; silent without the flag; null inputs), the real runner and doc clean, and the frozen-surface byte-identity.
- **Test-pair follow-up, existing assertions: none stale.** The design was chosen so that no existing assertion goes stale, after reading the corpus (`research-codebase` surveyed every `qa-run*`, `auth-local-guard*` and `auth-secrecy` test, every check that scans the command doc or the runner, and the documentation pages): `qa-run-case-vocabulary.test.mjs` 46-51 (nested forms of the six old actions still name the flat shape), 55-59 (`HTTP_ACTIONS` is unchanged, so a browser action under http is still "not an object with a string action"), 69-78 (the reason prefix contract: the anchor reason is produced in `validateSteps` with its own `step N:` and no new reason is reachable through `validateStep` unprefixed) and 86-91 and 327-370 (the doc examples are exactly the drivers `browser` and `http`, each validates statelessly); `qa-run-ui-grounding.test.mjs` 85-152 (the legacy message `click needs a string selector` is produced exactly as before; `click` alone is still `NO_EXPECTATION`; the 27 roles are unchanged) and 724-732 (the doc's FIRST role-and-name and FIRST text examples are still the existing `click` and `expect_visible` ones, because the new examples come after them); `qa-run.test.mjs` 452-458 (the HTTP driver tail anchor, kept), 762-767 (`maxRedirects: 0` stays unique: the anonymous helper receives the options object), 858-865 (the `request` evidence object and its `deepEqual` are unchanged for a step without the key); `qa-run-api-origins.test.mjs` 221-277 (`prepareApiStep` is unchanged for a step without `session`); `qa-run-contract.test.mjs` 67-124 (all anchors and counts); `qa-run-stable-grounding.test.mjs` 386-440 (the three cut doc regions are untouched, which the Task 4 `VALIDATE` proves byte for byte) and its "exactly four findings from `requireGround`" pin (a new flag, not an edit of that block); `qa-run-classification.test.mjs` 548-583 (no new `json` block carries `class` or `reason_code`; the catalogue table is untouched); `auth-local-guard-sites.test.mjs` (no site is added, so the ten-site baseline holds). If the Implementer or the test pair finds an assertion this analysis missed, it is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer, and the Level 3 command then excludes exactly those tests with `--test-skip-pattern` (never `--test-name-pattern` with a negative lookahead).
- **Ordering.** Task 1 is pure and independent. Task 2 and Task 3 edit disjoint regions of `qa-run.mjs` (the HTTP driver and `prepareApiStep` and `executeCase`; the browser driver, `runLocatorStep` and the helpers after `waitForStableSnapshot`) and need only the constants of Task 1 (`POSITIVE_ASSERTION_ACTIONS`, `EXPECT_STATES`); Task 4 (doc) depends on the names and semantics of Tasks 1 to 3; Task 5 is independent prose; Task 6 reads the runner and the doc (Tasks 1 to 4).
- **Research.** `research-codebase` ran three rounds: the vocabulary, the validators, the drivers and the contract; the full assertion-impact survey of the corpus and of every check that reads the doc or the runner (eight items, with the single-occurrence mutation anchors listed verbatim); and a direct read of the runner, the doc, the contract, the two earlier phase plans' shape and the doc-reading tests by the plan writer. `research-web` ran one round on the Playwright state, absence and request-context semantics (the findings above; its scope cap was reached, so the zero-match behaviors are verified live). Not read by any round: the `documentation/` pages (Phase 7 owns them) and `docs/api-reference.md` (the `docs_sync` pass owns `docs/`).
- **Scope of docs.** `docs/api-reference.md`, `docs/domain/flows.md`, `docs/domain/glossary.md` and the `documentation/` pages (`reference/commands.html`, `reference/scripts.html`, `reference/redaction-policy.html`, `changelog.html`) are not edited here: the `docs_sync` pass owns `docs/` at implement time and the site pages belong to Phase 7 per `documentation/AGENTS.md`.

*Generated: 2026-10-11*
*Approved: 2026-10-11*
*Implemented: 2026-10-11*
*Status: IMPLEMENTED*
