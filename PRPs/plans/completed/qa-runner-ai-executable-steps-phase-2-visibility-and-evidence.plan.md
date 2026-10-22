# Feature: Visibility and evidence (Phase 2 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); impact on shared contracts (the verdict semantics of the `qa-run.mjs` steps `expect_visible`, `expect_text` and `expect_not_visible`, and the shape of the final evidence capture; `results.json`, `plan.json`, the reason-code catalogue and the step vocabulary are unchanged); a false-pass hazard (PRD evidence KD-9: a closed modal that stays in the page at `opacity: 0` passes a positive step); evidence and privacy surface (a full-page screenshot shows more of the page than a viewport one); an existing command doc (`relay-qa-run.md`) amended around a script-validated vocabulary; knowledge-base edit under `docs/` with `docs_sync: true`; site-page edits under `documentation/` that existing tests bind to the script and the command doc (`documentation/AGENTS.md` applies); no new network- or store-touching site (the `auth-local-guard-sites` call sites are untouched); frozen-surface constraint (five files byte-identical); no new validate check (the count stays 28)
- Decisions found:
  - `PRPs/prds/qa-runner-ai-executable-steps.prd.md` Decisions Log "Reports": the reference reports stay byte-identical, so the new visibility rule changes how the runner reads a page and never what the report says
  - Same PRD, Architecture Notes "Visibility is a conjunction": Playwright's visibility check AND `checkVisibility({ opacityProperty: true, visibilityProperty: true })` evaluated on the resolved element; absence is its negation, re-read for the existing 5-second settle
  - Same PRD, Evidence KD-9 and OBS-4: Playwright documents that `opacity: 0` elements are visible, and the final evidence is one viewport screenshot that cut off the expanded rows of case 20
  - `docs/decisions.md` [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the outcome vocabulary is a closed set, a runner pass is evidence and not approval, secrets never reach reports, the local-only guard is permanent
  - `docs/decisions.md` [2026-04-19] "Secret redaction policy for Test Runner reports": unchanged; the final capture keeps its masks and its redacted-text branch, and the new reason is a fixed sentence that carries no locator word
  - `docs/decisions.md` [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`": no new resource file is added
  - `docs/decisions.md` [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen; `hybrid_code_review` is `false`
  - `docs/decisions.md` [2026-04-19] "PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`"
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the plan-side-only boundary, the frozen pre-run classification, the single write helper, and `/relay-qa-report` unchanged
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a full-page capture widens what a screenshot shows, so the password and `expect_value` masks stay applied, the redacted-text branch for a page whose text holds a registered secret stays, and `evidence/` stays in the ignored run directory
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is predicted to go stale; if the corpus gate names one, it is routed to the test pair (`EXISTING_TEST_UPDATED`), never edited by the Implementer
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary: no new extension; `/relay-qa-run` stays non-interactive and standalone
  - Command versus script separation: the command owns the plan, the script validates, executes and writes every result through its single write helper (`writeEvidence` and `writeRunFile` are not edited and no second writer is added)
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`); this phase adds no such site
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - PRP artifact paths: run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/`, and `evidence/` is ignored there
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, never `<base>..HEAD`; this phase's base is the phase-1 end-state tree object
  - `documentation/AGENTS.md`: a change under `documentation/` carries a changelog entry under `Unreleased` (sections 7.3, 7.4 and 9); NAV and the search index change only when a page is added, renamed or removed, and no page is added here; the version bump and the release heading belong to the release cut (Phase 8)
  - `npm run validate` keeps its 28 checks: `qa-run-contract` is not even extended in this phase, and none is added
  - `qa-run-contract` source-text invariants stay true: `writeFileSync(` and `renameSync(` exactly once each, `// GUARD-SITE` and `// WRITE-SITE` exactly once each, no outcome literal outside the four values, `spawnSync(process.execPath` exactly once, and the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` and `export function mintExpiryDue(` each exactly once
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 2: "Visibility and evidence" — Goal: no step passes on content a person cannot see, and the evidence shows every executed step — Success signal: the opacity and visibility fixtures of AC-4 pass both ways; a tall fixture page's final capture includes content below the fold.

## Summary

This phase makes `/relay-qa-run` read visibility the way a person does and makes its final evidence show the whole page. `qa-run.mjs` gains one decision rule, `isVisibleToPerson(target)`: an element is visible only when Playwright reports it visible AND the browser's own `checkVisibility({ opacityProperty: true, visibilityProperty: true })`, evaluated on the same element, agrees. `expect_visible` and `expect_text` end the case `fail` with a fixed reason when the located element is present but hidden by `opacity: 0` (its own or an ancestor's) or by `visibility: hidden`, and `expect_not_visible` passes on such an element; the positive half is re-read for the existing 5-second settle so a fade-in can finish, and a browser that cannot answer blocks the case `STEP_NOT_PERFORMABLE` instead of passing. The rule is applied to all five browser branches that decide visibility: the three role/text branches of `runLocatorStep` and the two legacy `selector` branches (`expect_visible`, `expect_text`) inside the browser driver. The final capture of every browser case becomes a full-page screenshot with the existing password and `expect_value` masks, taken through one helper, `captureFinalPng`, that carries an explicit `CAPTURE_TIMEOUT_MS` (30 seconds) and retries once as the old viewport-only capture if the full-page capture throws, so no page that produced evidence in 0.46.0 can lose it; the capture is still written through the single `writeEvidence` helper and a capture that fails both ways keeps today's classification. A reusable element-capture helper, `captureElementPng`, lands beside it. **Cross-phase decision for AC-5:** its clause "a `judge` step with a locator scope also writes an element screenshot of that scope" cannot be exercised here, because the `judge` step lands in Phase 5 and scoped locators (`within`) in Phase 3; this phase delivers the full-page capture and the helper, wires the helper to no step, and leaves that clause to Phase 5 (which owns the evidence file name) so that neither the reviewer nor the Implementer chases an unreachable clause. The command doc, the `docs/` knowledge base and the three `documentation/` places that name the visibility and capture behaviour are brought in line in the same phase, and the corpus is expected to stay green with no allowlisted failure.

## User Story

As the operator of relay's human validation gate
I want a QA step that asserts something is visible to fail when a person could not see it, and the evidence of a run to show the whole page
So that a closed modal or a hidden field never earns a false pass, and I can audit what the runner saw below the fold

## Problem Statement

`/relay-qa-run` 0.46.0 decides visibility with Playwright alone, and Playwright documents that an element at `opacity: 0` is visible ("Elements with opacity:0 are considered visible", https://playwright.dev/docs/actionability). A closed modal that stays in the DOM at `opacity: 0` therefore passes a positive `expect_visible` step, and `expect_text` reads `textContent` with no visibility check at all, so text a person cannot see passes too: this is KD-9 of the PRD, a false-pass hazard in a runner whose first rule is no false pass. And the final evidence is one viewport screenshot (`page.screenshot` with masks only, no `fullPage`): in case 20 of the reference reports it cut off the expanded rows, and the grounding snapshots had to serve as the independent evidence of steps that had in fact executed.

## Solution Statement

Runner, doc and documentation only; the step vocabulary, the reason-code catalogue, `results.json` and the validate checks are untouched. (1) Two exported readers in `qa-run.mjs`, beside `settleAssertion`: `isVisibleToPerson(target)` (the conjunction; a locator that matches nothing is not visible; a browser that cannot answer throws, which `settleAssertion` reads as unreadable and never as a pass) and `requireVisibleToPerson(target, n, opts)` (the positive half: null when the element is visible within the settle window, else the case verdict, either the fixed failing sentence or the existing blocked sentence for an unreadable page). (2) `runLocatorStep` and the legacy selector branches call them: `expect_not_visible` becomes "not `isVisibleToPerson`" inside its existing `settleAssertion`; `expect_visible` keeps its 10-second `waitFor({ state: 'visible' })` first and then calls `requireVisibleToPerson`; `expect_text` keeps its `textContent` read and its "text not present" failure first and calls `requireVisibleToPerson` only for text that matched, so every case that failed before fails exactly as before and only cases that passed on hidden content change. (3) `CAPTURE_TIMEOUT_MS`, `captureFinalPng(page, masks)` and `captureElementPng(target, masks)` beside `writeEvidence`; the final capture block calls `captureFinalPng` and nothing else in it changes. (4) The command doc gains two paragraphs (visibility, final capture) placed after the `expect_not_visible` paragraph without touching any pinned paragraph; `docs/api-reference.md`, `docs/domain/glossary.md` and `docs/domain/flows.md` gain one passage each; `documentation/reference/commands.html`, `documentation/reference/scripts.html` and an `Unreleased` entry in `documentation/changelog.html` are updated in a way the existing site tests keep accepting.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `docs/api-reference.md`; `docs/domain/glossary.md`; `docs/domain/flows.md`; `documentation/reference/commands.html`; `documentation/reference/scripts.html`; `documentation/changelog.html` |
| Dependencies | none (row 2 of 9; `Depends` is `-`; row 1 is `complete`; shares `lane:qa-run` with phases 1 to 7, so it runs serially after phase 1); Node built-ins and the Playwright already resolved from the repository, no new package |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 40-41 (KD-9, OBS-4), 88-89 (AC-4, AC-5), 108 (AC-24), 183 (visibility is a conjunction), 206 (row 2), 222-225 (Phase 2 details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 40-41, 88-89, 108, 183, 206, 222-225 | the evidence (KD-9, OBS-4), AC-4, AC-5 and AC-24, the conjunction rule, the row and the Phase 2 scope this plan implements |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1083-1086, 1586-1611 | `blocked`, `needsHuman` and `settleAssertion` (signature, status words, options): everything Task 1 builds on and must not change |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2294-2298 | `writeEvidence`, the single evidence writer; READ-ONLY for this phase (its first body line is a test mutation anchor) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2561-2646 | `runLocatorStep`: the `expect_not_visible`, `expect_visible` and `expect_text` branches Task 2 changes |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2648-2704, 2734-2745 | the top of the browser driver (note `const target = ctx.target;`) and the legacy selector branches Task 2 changes |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2805-2828 | the final capture block and its catch-all that Task 3 changes |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 336-350, 429-437, 512-519 | the source-text pins a new helper or comment can trip: single write site, outcome literals, the locator section literals, the browser-driver section tokens |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 769-785, 983-1021, 1035-1036 | READ-ONLY (R-X): the WRITE-SITE mutation anchor `const abs = join(ctx.runDirAbs, 'evidence', name);` (must stay unique), the legacy-selector browser tests, and the secret-page test (no `.png` there) |
| P1 | `scripts/validate/checks/qa-run-absence-state.test.mjs` | 299-395, 427-451, 588-699 | READ-ONLY (R-X): the `settleAssertion` unit tests (signature frozen), the only hidden fixtures (`hidden` attribute, DOM removal) and the absence cases whose outcomes must not change |
| P1 | `scripts/validate/checks/qa-run-input-value.test.mjs` | 312-336, 359-374, 438-447, 498-503, 529-536 | READ-ONLY (R-X): the harness shape Tasks 2 and 3 mirror (spawn, snapshot, report, plan), the "no extra JSON evidence" rule and the byte-compare of masked captures |
| P1 | `scripts/validate/checks/qa-run-vocabulary-pins.test.mjs` | 331-343 | READ-ONLY (R-X): the command-doc phrases pinned around `expect_not_visible` and `expect_value` that Task 4 must not disturb |
| P1 | `scripts/validate/checks/qa-run-release-pages.test.mjs` | 387-408, 454-480, 526-542 | READ-ONLY (R-X): the phrases and sentence rules the `commands.html` and `scripts.html` rows and the API-reference span must keep |
| P1 | `scripts/validate/checks/qa-run-release-cut.test.mjs` | 112-134 | READ-ONLY (R-X): the well-formedness rules of the `Unreleased` block |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 259-297 | the `expect_value` and `expect_not_visible` paragraphs and the marker line Task 4 inserts before |
| P1 | `docs/api-reference.md` | 129 | the `/relay-qa-run` row Task 5 amends (one very long line) |
| P1 | `docs/domain/glossary.md` | 306-355 | the "QA assertion actions" paragraphs Task 5 amends |
| P1 | `docs/domain/flows.md` | 195-219 | the numbered item that describes the three assertion steps, amended by Task 5 |
| P0 | `documentation/reference/commands.html` | 355 | the `Step vocabulary` row Task 6 amends |
| P0 | `documentation/reference/scripts.html` | 222 | the `Assertions and request count` row Task 6 amends |
| P0 | `documentation/changelog.html` | 31-66 | the `Unreleased` block and its `Changed` list that Task 7 extends |
| P0 | `documentation/AGENTS.md` | 239-284, 318-330, 400-406 | the registration rule (NAV and the search index change only when a page is added or renamed), the `Unreleased` entry rule (7.3, 7.4) and the modify-an-existing-page checklist (section 9) that Tasks 6 and 7 follow |
| P2 | `PRPs/plans/completed/qa-runner-ai-executable-steps-phase-1-impossible-catalogue-and-counting-convention.plan.md` | 740-762, 861-917 | READ-ONLY: the changed-file check (a single-argument `git diff` plus the untracked files) and the TAP corpus-gate parser this plan adapts |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1083-1086
/** @param {string} code @param {string} reason @param {string[]} [evidence] @returns {CaseResult} */
const blocked = (code, reason, evidence = []) => ({ outcome: 'blocked', reason_code: code, reason, evidence });
/** @param {string} code @param {string} reason @returns {CaseResult} */
const needsHuman = (code, reason) => ({ outcome: 'needs-human', reason_code: code, reason, evidence: [] });
```
Copied by Task 1 (`requireVisibleToPerson` returns a `CaseResult` built the same way: `blocked('STEP_NOT_PERFORMABLE', ...)` for an unreadable page and a literal `{ outcome: 'fail', reason_code: null, reason, evidence: [] }` for a hidden target; `outcome:` is written only with the four vocabulary values).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1586-1611
export async function settleAssertion(read, accept, opts = {}) {
  const boundMs = opts.boundMs ?? ASSERT_SETTLE_MS;
  const intervalMs = opts.intervalMs ?? ASSERT_POLL_INTERVAL_MS;
  const sleep = opts.sleep ?? ((/** @type {number} */ ms) => new Promise((done) => setTimeout(done, ms)));
  const now = opts.now ?? (() => performance.now());
  let reads = 0;
  let readable = 0;
  /** @returns {Promise<boolean>} */
  const take = async () => {
    reads++;
    try {
      const value = await read();
      readable++;
      return accept(value) === true;
    } catch {
      return false;
    }
  };
  if (await take()) return { status: 'accepted', reads };
  const deadline = now() + boundMs;
  while (now() + intervalMs <= deadline) {
    await sleep(intervalMs);
    if (await take()) return { status: 'accepted', reads };
  }
  return { status: readable > 0 ? 'rejected' : 'unreadable', reads };
}
```
Copied by Task 1 (the reader is passed as `read`, the acceptance test as `accept`, the options pass straight through; a read that throws is unreadable for that round; the function and its keys `status` and `reads` are NOT edited, because `qa-run-absence-state.test.mjs` imports it and pins both).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2563-2574
  if (step.action === 'expect_not_visible') {
    // An absence is decided on the live page, with no wait for the element to attach: a locator that
    // matches nothing is hidden. The anchor rule of validateSteps is what keeps that from being vacuous.
    const present = await target.count().catch(() => 0);
    if (present > 1) {
      return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched ${present} elements at run time; a locator must match exactly one, so nothing was asserted`);
    }
    const hidden = await settleAssertion(() => target.isHidden(), (isHidden) => isHidden === true);
    if (hidden.status === 'accepted') return null;
    if (hidden.status === 'rejected') return { outcome: 'fail', reason_code: null, reason: `step ${n}: the element was still visible`, evidence: [] };
    return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the visibility of the target could not be read; nothing was asserted`);
  }
```
Copied by Task 2 (only the `settleAssertion(() => target.isHidden(), ...)` line changes; the count guard, the comment, the `still visible` sentence and the blocked sentence stay byte-identical, and the blocked sentence is the one `requireVisibleToPerson` reuses).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2595-2599
  if (step.action === 'expect_visible') {
    const ok = await target.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    if (!ok) return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
    return null;
  }
```
Copied by Task 2 (the wait and its failing sentence stay; the final `return null;` becomes `return requireVisibleToPerson(target, n);`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2638-2644
  if (step.action === 'expect_text') {
    const text = await target.textContent({ timeout: 10000 }).catch(() => null);
    if (text === null || !text.includes(step.contains)) {
      return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
    }
    return null;
  }
```
Copied by Task 2 (the read and its failing sentence stay first; the final `return null;` becomes `return requireVisibleToPerson(target, n);`, so visibility is checked only for text that matched).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2734-2745
      } else if (step.action === 'expect_visible') {
        const ok = await page.locator(step.selector).first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
        if (!ok) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
          break;
        }
      } else if (step.action === 'expect_text') {
        const text = await page.locator(step.selector).first().textContent({ timeout: 10000 }).catch(() => null);
        if (text === null || !text.includes(step.contains)) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
          break;
        }
```
Copied by Task 2 (the legacy selector branches: each keeps its read and failing sentence, binds the locator to a local named `located` because `target` is already `ctx.target` in this function, and adds the `requireVisibleToPerson` call that assigns `verdict` and breaks).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2805-2818
    // Evidence after the last step: a screenshot, or redacted text when the page text holds a secret.
    try {
      const bodyText = await page.innerText('body').catch(() => '');
      if (containsSecret(bodyText, ctx.table)) {
        evidence.push(writeEvidence(ctx, `case-${kase.index}.txt`, { kind: 'text', value: bodyText }));
      } else {
        const png = await page.screenshot({ mask: [page.locator('input[type=password]'), ...valueMasks] });
        evidence.push(writeEvidence(ctx, `case-${kase.index}.png`, { kind: 'binary', value: png }));
      }
    } catch {
      if (verdict === null || verdict.outcome !== 'blocked') {
        return blocked('EVIDENCE_WRITE_FAILED', 'the browser evidence could not be captured or written', evidence);
      }
    }
```
Copied by Task 3 (only the `page.screenshot(...)` call becomes `captureFinalPng(page, [...])`; the try, the secret branch, the single `writeEvidence` call and the catch-all with its classification stay as they are).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2294-2298
function writeEvidence(ctx, name, payload) {
  const abs = join(ctx.runDirAbs, 'evidence', name);
  writeRunFile(ctx, abs, payload);
  return `${ctx.runDirRel}/evidence/${name}`;
}
```
Read by Task 3 and NOT edited (the single evidence writer; its first body line is the mutation anchor of the WRITE-SITE test in `qa-run.test.mjs`, so that exact line must not be repeated anywhere else in the file: the new capture helper returns bytes and never writes).

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
Copied by Task 4 (the prose register of the command doc: wrapped near 90 columns, backticked identifiers; this paragraph is pinned by `qa-run-vocabulary-pins.test.mjs` and stays intact, the two new paragraphs are separate paragraphs placed after it).

```
# SOURCE: docs/domain/glossary.md:328-331
unchecked. `expect_not_visible` passes only when the grounded locator is hidden
or absent. A value, a state and an absence are each re-read for up to 5 seconds
(`ASSERT_SETTLE_MS`, every 100 ms, both chosen and not measured) before the step
is decided. The absence anchor: an `expect_not_visible` step is valid only after
```
Copied by Task 5 (the glossary register; a new paragraph is added before the paragraph that starts `Two planner rules the command doc states for these actions.`).

```
# SOURCE: docs/domain/flows.md:205-210
   `expect_not_visible` asserts that an element is hidden or absent. Each is
   re-read for up to 5 seconds before it is decided. An absence step is valid
   only after a positive step (`expect_visible`, `expect_text`, `expect_value` or
   `expect_state`) on the same route since the last `goto`, because an absence
   alone would pass on a page that never rendered; without that anchor the entry
   is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested.
```
Copied by Task 5 (the numbered-list item keeps its 3-space indent; the new sentences are added before the line that starts `An element that exists only after a click or a fill is grounded in a second`).

```
# SOURCE: docs/api-reference.md:129 (excerpt of the single-line table row)
The numbers are chosen, not measured. Calls `auth-local-guard.mjs` and the kit login scripts rather than reimplementing them. See `PRPs/prds/manual-qa-runner-auth-kit.prd.md`. |
```
Copied by Task 5 (the new sentence is inserted immediately before `The numbers are chosen, not measured.`; the row also keeps `expect_not_visible` (valid only after a positive step on the same route since the last `goto`), which a release test pins, so nothing inside that parenthesis changes).

```
# SOURCE: documentation/reference/commands.html:355 (excerpt of the single-line <dd> of the Step vocabulary row)
A value, a state and an absence are re-read for up to 5 seconds. <code>expect_requests</code> counts the requests the page issues: a <code>method</code>, a <code>url_contains</code> path of at most 200 characters
```
Copied by Task 6 (the two new sentences go between `re-read for up to 5 seconds.` and `<code>expect_requests</code> counts`; the row's pinned phrases, its sentence-splitting rules and the parenthesis `(5 seconds, 2 seconds, 100, 50 and 200) are chosen, not measured` are untouched).

```
# SOURCE: documentation/reference/scripts.html:222 (excerpt of the single-line <dd> of the Assertions and request count row)
an absence is valid only after a positive step (<code>POSITIVE_ASSERTION_ACTIONS</code>) on the same route since the last <code>goto</code>. <code>expect_requests</code> waits <code>EXPECT_REQUESTS_SETTLE_MS</code> (2000)
```
Copied by Task 6 (the new sentences go between `since the last <code>goto</code>.` and `<code>expect_requests</code> waits`; the constants already named in the row keep their stated values).

```
# SOURCE: documentation/changelog.html:61-64
        <li><strong>Reference pages</strong> &mdash; the <code>/relay-qa-run</code> entry of the commands reference and
          the <code>qa-run-contract</code> section of the validation checks reference state the twelve codes, the two
          classes and the counters.</li>
      </ul>
```
Copied by Task 7 (the shape of a `Changed` entry; two entries are appended inside the same list, no id is added, the heading ids stay `unreleased...`).

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
Copied by Tasks 2 and 3 (the end-to-end validation spawns the REAL runner by absolute path with a temp root as `cwd` and a hermetic git environment; Playwright resolves by directory walk from the runner's own folder, so no `NODE_PATH` is needed).

```
# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:359-363
  const role = (/** @type {string} */ r, /** @type {string} */ name) => ({ kind: 'role', role: r, name, matches: 1 });
  const snapshot = (/** @type {string} */ route, /** @type {any[]} */ entries) => JSON.stringify({ schema_version: 1, role: 'anonymous', route, entries, withheld: 0 });
  writeFileSync(
    join(runDir, 'grounding', 'anonymous--profile.snapshot.json'),
    snapshot('/profile', [
```
Copied by Task 2 (a role or text locator step is valid only against a snapshot entry with `matches` 1 for its own route; the text entry shape `{ kind: 'text', text, matches: 1 }` is the one `precheckGroundedSteps` reads).

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
Copied by Tasks 2 and 3 (the report and plan shapes of an anonymous browser case; an `expect_text` `contains` must appear in the case's manual steps).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | the visibility conjunction (`isVisibleToPerson`, `requireVisibleToPerson`) wired into the five visibility branches, and the bounded full-page final capture (`CAPTURE_TIMEOUT_MS`, `captureFinalPng`, `captureElementPng`) wired into the final capture block |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | two new paragraphs (visibility means visible to a person; the final capture is a full-page screenshot) placed after the `expect_not_visible` paragraph |
| `docs/api-reference.md` | UPDATE | one sentence in the `/relay-qa-run` row stating the visibility rule and the full-page capture |
| `docs/domain/glossary.md` | UPDATE | one paragraph in "QA assertion actions" stating the visibility rule, the capture and its bound |
| `docs/domain/flows.md` | UPDATE | two sentences in the numbered item that describes the three assertion steps |
| `documentation/reference/commands.html` | UPDATE | two sentences in the `Step vocabulary` row (an existing site test reads this row against the command doc) |
| `documentation/reference/scripts.html` | UPDATE | two sentences in the `Assertions and request count` row naming the new readers, the capture helper and the bound |
| `documentation/changelog.html` | UPDATE | two `Changed` entries under `Unreleased`, as `documentation/AGENTS.md` requires for any change under `documentation/` |

## NOT Building (Scope Limits)

- The element screenshot of a `judge` step with a locator scope (the second clause of PRD AC-5). The `judge` step lands in Phase 5 and `within`/scoped locators in Phase 3; this phase builds only `captureElementPng` and wires it to no step, introduces no evidence file name for it and adds no `judge`, `within`, `label_text` or `index` handling.
- Any new step, step key, locator form, reason code, `results.json` field or `USAGE` text. The vocabulary, the catalogue and the result shape are unchanged, so `OUTCOMES`, `REASON_CATALOGUE` and `validateStep` are not edited.
- Run-time grounding from report words, group scope, `name_prefix`, `label_text`, indexed items and method sets (Phase 3); `chosen_inputs` and dedicated writes (Phase 4); the `judge` mode (Phase 5); channel sources (Phase 6); `preflight`, kit staleness and fresh-cache dependencies (Phase 7).
- Reading the visibility of a descendant: `expect_text` checks the visibility of the located element only and still reads its `textContent`; changing the read to `innerText` would change case and whitespace semantics for every existing plan. A visible container that holds the matching text in a hidden descendant is a known residual (see Risks).
- A new source-text pin in `qa-run-contract` for `checkVisibility` or `fullPage`: the behaviour is covered end to end by the new tests the test pair authors, and a spelling pin would be brittle. No validate check is added or extended; the count stays 28.
- Any edit to `writeEvidence`, `writeRunFile`, `settleAssertion`, `ASSERT_SETTLE_MS`, `ASSERT_POLL_INTERVAL_MS`, `POSITIVE_ASSERTION_ACTIONS`, the secret-page branch of the final capture, or the browser launch and context options (no viewport option is added).
- The release cut: the version bump (`plugins/relay/.claude-plugin/plugin.json`), turning `Unreleased` into a release heading, NAV (`assets/js/app.js`), the search index (`assets/data/search-index.json`), `docs/decisions.md` and the other release pages are Phase 8 or untouched; no page is added.
- Any new network- or store-touching site, so `auth-local-guard-sites` and `auth-secrecy` are not touched; any static sibling import in `qa-run.mjs` (the copy-helper tests copy only the runner file).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md` or `plugins/relay/scripts/visual/capture.mjs`, and any change to a reference report.
- Any test file. R-X strict: the Implementer authors zero test files; new tests and every update to a stale existing test are routed through the test pair (see `## Notes`).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the visibility conjunction and the capture helpers (no wiring yet)

- **ACTION**: Delivers AC-A2 (the decision rule), AC-A4 (the element-capture helper) and the helper half of AC-A3 (the bounded full-page capture). Add five exported names to `plugins/relay/scripts/qa-run.mjs` and wire none of them yet:
  1. Directly after the closing brace of `settleAssertion` (line 1611) and before the JSDoc of `comparisonKindOf`, add `isVisibleToPerson` and `requireVisibleToPerson`:
     ```js
     /**
      * Whether the located element is visible to a person. Playwright counts an element at `opacity: 0` as
      * visible, so its own check is joined (AND) with the browser's `checkVisibility`, read with its opacity and
      * visibility options on the same element: an element at `opacity: 0`, under an ancestor at `opacity: 0`, or
      * at `visibility: hidden` is not visible. A locator that matches nothing is not visible. A browser that
      * cannot answer throws, which `settleAssertion` reads as unreadable and never as a pass.
      * @param {any} target a Playwright locator that matches at most one element
      * @returns {Promise<boolean>}
      */
     export async function isVisibleToPerson(target) {
       if (!(await target.isVisible())) return false;
       return target.evaluate(
         (/** @type {any} */ el) => {
           if (typeof el.checkVisibility !== 'function') throw new Error('checkVisibility is unavailable');
           return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) === true;
         },
         undefined,
         { timeout: 1000 },
       );
     }

     /**
      * The positive half of the visibility rule for one step: null when the located element is visible to a
      * person within the settle window (so a fade-in has time to finish), else the case verdict. The reasons are
      * fixed sentences that carry no locator word and no page text.
      * @param {any} target
      * @param {number} n the 1-based step position
      * @param {{ boundMs?: number, intervalMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number }} [opts] forwarded to `settleAssertion`
      * @returns {Promise<CaseResult | null>}
      */
     export async function requireVisibleToPerson(target, n, opts = {}) {
       const seen = await settleAssertion(() => isVisibleToPerson(target), (visible) => visible === true, opts);
       if (seen.status === 'accepted') return null;
       if (seen.status === 'rejected') {
         return { outcome: 'fail', reason_code: null, reason: `step ${n}: the target was present but not visible to a person (opacity or visibility hides it)`, evidence: [] };
       }
       return blocked('STEP_NOT_PERFORMABLE', `step ${n}: the visibility of the target could not be read; nothing was asserted`);
     }
     ```
  2. Directly after the closing brace of `writeEvidence` (line 2298) and before the JSDoc of `queryArgvIsLocal`, add:
     ```js
     /**
      * The bound of one final-capture attempt, in milliseconds. It is explicit because the capture used to run under
      * the page default of 10 seconds, and a full-page capture is heavier than a viewport one; a larger bound costs
      * nothing on the success path and only delays a capture that is stuck. Chosen, not measured.
      */
     export const CAPTURE_TIMEOUT_MS = 30000;

     /**
      * The final screenshot of a browser case: the full page with the given masks applied. If the full-page capture
      * throws (a very tall page, a page that closed), the viewport is captured once with the same masks, so a case
      * keeps the evidence it had before the capture grew. The caller writes the bytes through the single evidence
      * writer; a page that cannot be captured either way throws and the caller classifies that.
      * @param {any} page
      * @param {any[]} masks
      * @returns {Promise<Buffer>}
      */
     export async function captureFinalPng(page, masks) {
       try {
         return await page.screenshot({ mask: masks, fullPage: true, timeout: CAPTURE_TIMEOUT_MS });
       } catch {
         return page.screenshot({ mask: masks, timeout: CAPTURE_TIMEOUT_MS });
       }
     }

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
  Constraints that the existing tests and the contract check pin, all of which this task must keep true: do NOT edit `settleAssertion` (its keys `status` and `reads` and its option names are imported and pinned), `ASSERT_SETTLE_MS`, `ASSERT_POLL_INTERVAL_MS`, or lines 2294-2298 (`writeEvidence`), and do NOT write the line `const abs = join(ctx.runDirAbs, 'evidence', name);` anywhere else (a test mutates the runner by that exact text and requires exactly one occurrence). Do NOT add an `import` (static or otherwise), a `// GUARD-SITE` or `// WRITE-SITE` comment, or the text `writeFileSync(`, `renameSync(` or `spawnSync(process.execPath` anywhere, comments included; do NOT write an `outcome: '...'` or `outcome = '...'` literal other than the four vocabulary values; do NOT quote the section markers `DRIVERS.http = async (`, `async function runLocatorStep(`, `DRIVERS.browser = async (` or `export function mintExpiryDue(` in a comment (each must occur exactly once); do NOT add the text `if (isObj(record)) {`. Contingency: if the validation below shows that this Chromium's `checkVisibility` does not report an element under an ancestor at `opacity: 0` as not visible (MDN does not document ancestors; the PRD requires the conjunction, so any addition is additive), extend the in-page function with an explicit ancestor walk (`for (let node = el; node; node = node.parentElement) if (getComputedStyle(node).opacity === '0') return false;`) before the `checkVisibility` call, and record that in the plan's `## Notes` follow-up for the test pair.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1083-1086` (the `blocked` helper and the `CaseResult` literal shape), `# SOURCE: plugins/relay/scripts/qa-run.mjs:1586-1611` (the reader and acceptance callbacks and the pass-through options of `settleAssertion`), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2294-2298` (the writer these helpers must not duplicate).
- **VALIDATE**: gate on the helpers against a real Chromium page; it fails on the unmodified tree (the four functions are not exported, so the first assertion throws) and passes once the task is done. The fake page and the fake locator are inline doubles for the fallback and the unreadable branch only. The two `requireVisibleToPerson` calls use a 400 ms window so the command stays quick.
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { chromium } from "playwright";
  import * as m from "./plugins/relay/scripts/qa-run.mjs";
  for (const name of ["isVisibleToPerson", "requireVisibleToPerson", "captureFinalPng", "captureElementPng"]) assert.equal(typeof m[name], "function", name + " is not exported");
  assert.ok(Number.isInteger(m.CAPTURE_TIMEOUT_MS) && m.CAPTURE_TIMEOUT_MS > 0, "CAPTURE_TIMEOUT_MS must be a positive integer");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>.z{opacity:0}.h{visibility:hidden}.n{display:none}</style>
      <div id="box" style="width:120px;height:80px;background:#08f"></div>
      <p id="a">solid</p><p id="b" class="z">zero</p><p id="c" class="h">hidden</p><p id="d" class="n">none</p>
      <div class="z"><p id="e">inside</p></div><p id="f" style="opacity:0.01">faint</p>
      <input id="pw" type="password" value="hunter2hunter2">
      <div style="height:3000px;background:#eee"></div>`);
    const vis = (sel) => m.isVisibleToPerson(page.locator(sel));
    assert.equal(await vis("#a"), true, "a plain element is visible");
    assert.equal(await vis("#f"), true, "opacity 0.01 is still visible");
    for (const sel of ["#b", "#c", "#d", "#e", "#nope"]) assert.equal(await vis(sel), false, sel + " must not be visible to a person");
    const opts = { boundMs: 400, intervalMs: 50 };
    assert.equal(await m.requireVisibleToPerson(page.locator("#a"), 3, opts), null);
    const hidden = await m.requireVisibleToPerson(page.locator("#b"), 4, opts);
    assert.equal(hidden.outcome, "fail");
    assert.equal(hidden.reason_code, null);
    assert.equal(hidden.reason, "step 4: the target was present but not visible to a person (opacity or visibility hides it)");
    const unreadable = await m.requireVisibleToPerson({ isVisible: async () => { throw new Error("x"); } }, 5, opts);
    assert.equal(unreadable.outcome, "blocked");
    assert.equal(unreadable.reason_code, "STEP_NOT_PERFORMABLE");
    const full = await m.captureFinalPng(page, [page.locator("input[type=password]")]);
    assert.deepEqual([...full.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], "the final capture must be a PNG");
    assert.ok(full.readUInt32BE(20) >= 3000, "the final capture must cover the whole page, not the 720 px viewport");
    const el = await m.captureElementPng(page.locator("#box"), []);
    assert.equal(el.readUInt32BE(16), 120);
    assert.equal(el.readUInt32BE(20), 80);
    const calls = [];
    const fake = { screenshot: async (o) => { calls.push(o); if (o.fullPage) throw new Error("tall"); return Buffer.from("vp"); } };
    const fell = await m.captureFinalPng(fake, ["M"]);
    assert.equal(fell.toString(), "vp");
    assert.equal(calls.length, 2, "one full-page attempt and one viewport retry");
    assert.equal(calls[0].fullPage, true);
    assert.ok(!calls[1].fullPage, "the retry is viewport-only");
    assert.deepEqual([calls[0].mask, calls[1].mask], [["M"], ["M"]]);
    assert.equal(calls[0].timeout, m.CAPTURE_TIMEOUT_MS);
    assert.equal(calls[1].timeout, m.CAPTURE_TIMEOUT_MS);
    await assert.rejects(m.captureFinalPng({ screenshot: async () => { throw new Error("x"); } }, []));
  } finally {
    await browser.close();
  }
  '
  ```

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — apply the conjunction in the five visibility branches

- **ACTION**: Delivers AC-A1 and AC-A2 (wiring). In `plugins/relay/scripts/qa-run.mjs` make exactly these edits, each preserving every existing failing sentence so that a case that failed before fails exactly as before:
  1. `runLocatorStep`, `expect_not_visible` branch: replace `const hidden = await settleAssertion(() => target.isHidden(), (isHidden) => isHidden === true);` with `const hidden = await settleAssertion(async () => !(await isVisibleToPerson(target)), (isHidden) => isHidden === true);`. The count guard, the comment, the `the element was still visible` sentence and the blocked sentence stay byte-identical.
  2. `runLocatorStep`, `expect_visible` branch: after the `if (!ok) return {...}` line, replace the final `return null;` with `return requireVisibleToPerson(target, n);`.
  3. `runLocatorStep`, `expect_text` branch: after the `if (text === null || !text.includes(step.contains)) {...}` block, replace the final `return null;` with `return requireVisibleToPerson(target, n);`. Visibility is therefore checked only for text that matched.
  4. Browser driver, legacy selector `expect_visible` branch: bind `const located = page.locator(step.selector).first();` (not `target`: `const target = ctx.target;` is already declared in this function), keep the `waitFor({ state: 'visible', timeout: 10000 })` and its failing sentence on `located`, and after it add `const seen = await requireVisibleToPerson(located, n); if (seen !== null) { verdict = seen; break; }`.
  5. Browser driver, legacy selector `expect_text` branch: bind `const located = page.locator(step.selector).first();`, keep the `textContent({ timeout: 10000 })` read and its `the expected text was not present` failure on `located`, and after the failure block add the same `requireVisibleToPerson(located, n)` lines.
  There is no legacy selector form of `expect_not_visible` (`validateStep` refuses it), so the absence branch has one site. Do NOT change `settleAssertion`, the 10-second waits, the `count()` guards, `POSITIVE_ASSERTION_ACTIONS`, `recordSteps`, the final capture block, or any `outcome:` literal; do NOT add a new reason code; keep the single-quoted literals `'expect_value'`, `'expect_not_visible'` and `'expect_state'` inside `runLocatorStep` (the contract check requires them in that section).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2563-2574`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:2595-2599`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:2638-2644` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2734-2745` (the four branches being edited); the harness follows `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:312-319`, `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:359-363` and `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:438-447`.
- **VALIDATE**: gate through the real `run` mode on a loopback page and a real Chromium; it fails on the unmodified tree (case 2 passes there because Playwright counts `opacity: 0` as visible, so the first outcome assertion throws) and passes once the task is done. Twelve cases, expected `pass, fail, fail, fail, pass, pass, fail, pass, fail, fail, fail, pass`: the hidden-by-opacity and hidden-by-visibility targets fail positive steps with the fixed sentence in the role/text and the legacy selector forms, the same targets pass `expect_not_visible`, a visible target still fails `expect_not_visible` with the old sentence, and a late fade-in (opacity set to 1 after 1.5 seconds) still passes within the settle window. The command takes about a minute (each failing positive case waits out the 5-second settle).
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { createServer } from "node:http";
  import { spawn } from "node:child_process";
  import { validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
  const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>Vis</title><style>.z{opacity:0}.h{visibility:hidden}</style></head><body><h1>Painel</h1><p id="solid">Texto solido</p><p id="ghost" class="z">Texto fantasma</p><p id="cloaked" class="h">Texto invisivel</p><div class="z"><div><p id="inner">Corpo da janela</p></div></div><p id="late" style="opacity:0">Texto tardio</p><script>setTimeout(function(){document.getElementById("late").style.opacity="1";},1500);</script></body></html>`;
  const server = createServer((req, res) => {
    if (String(req.url).split("?")[0] !== "/vis") { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const root = realpathSync(mkdtempSync(join(tmpdir(), "relay-p2t2-")));
  try {
    const runRel = "PRPs/reports/feat/qa-run/20261021T101010101Z";
    const runDir = join(root, ...runRel.split("/"));
    mkdirSync(join(runDir, "grounding"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl, roles: {} }));
    const entry = (e) => ({ matches: 1, ...e });
    const entries = [entry({ kind: "role", role: "heading", name: "Painel" }), ...["Texto solido", "Texto fantasma", "Corpo da janela", "Texto tardio"].map((text) => entry({ kind: "text", text }))];
    writeFileSync(join(runDir, "grounding", "anonymous--vis.snapshot.json"), JSON.stringify({ schema_version: 1, role: "anonymous", route: "/vis", entries, withheld: 0 }));
    const G = { action: "goto", path: "/vis" };
    const H = { action: "expect_visible", role: "heading", name: "Painel" };
    const C = (title, manual, steps) => ({ title, manual, steps });
    const defs = [
      C("Solid text passes", ["1. Open the panel.", "2. The text Texto solido is shown."], [G, H, { action: "expect_text", text: "Texto solido", contains: "Texto solido" }]),
      C("Opacity zero expect_visible", ["1. Open the panel.", "2. The text Texto fantasma is shown."], [G, { action: "expect_visible", text: "Texto fantasma" }]),
      C("Opacity zero expect_text", ["1. Open the panel.", "2. The text Texto fantasma is shown."], [G, { action: "expect_text", text: "Texto fantasma", contains: "Texto fantasma" }]),
      C("Ancestor opacity zero expect_visible", ["1. Open the panel.", "2. The text Corpo da janela is shown."], [G, { action: "expect_visible", text: "Corpo da janela" }]),
      C("Absence of opacity zero passes", ["1. Open the panel.", "2. The text Texto fantasma is gone."], [G, H, { action: "expect_not_visible", text: "Texto fantasma" }]),
      C("Absence under ancestor opacity zero passes", ["1. Open the panel.", "2. The text Corpo da janela is gone."], [G, H, { action: "expect_not_visible", text: "Corpo da janela" }]),
      C("Absence of visible text still fails", ["1. Open the panel.", "2. The text Texto solido is gone."], [G, H, { action: "expect_not_visible", text: "Texto solido" }]),
      C("Late fade-in passes", ["1. Open the panel.", "2. The text Texto tardio is shown."], [G, { action: "expect_visible", text: "Texto tardio" }]),
      C("Selector opacity zero expect_visible", ["1. Open the panel.", "2. The ghost text is shown."], [G, { action: "expect_visible", selector: "#ghost" }]),
      C("Selector opacity zero expect_text", ["1. Open the panel.", "2. The ghost text says fantasma."], [G, { action: "expect_text", selector: "#ghost", contains: "fantasma" }]),
      C("Selector visibility hidden expect_text", ["1. Open the panel.", "2. The cloaked text says invisivel."], [G, { action: "expect_text", selector: "#cloaked", contains: "invisivel" }]),
      C("Selector solid passes", ["1. Open the panel.", "2. The solid text says solido."], [G, { action: "expect_visible", selector: "#solid" }, { action: "expect_text", selector: "#solid", contains: "solido" }]),
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
    const want = ["pass", "fail", "fail", "fail", "pass", "pass", "fail", "pass", "fail", "fail", "fail", "pass"];
    assert.equal(c.length, want.length);
    c.forEach((x, i) => assert.equal(x.outcome, want[i], "case " + (i + 1) + " (" + defs[i].title + "): " + JSON.stringify([x.outcome, x.reason_code, x.reason])));
    const hiddenSentence = /^step \d+: the target was present but not visible to a person \(opacity or visibility hides it\)$/;
    for (const i of [1, 2, 3, 8, 9, 10]) {
      assert.match(c[i].reason, hiddenSentence, "case " + (i + 1));
      assert.equal(c[i].reason_code, null);
      assert.equal(c[i].evidence.length, 1, "a failing browser case carries exactly its final capture");
      assert.ok(String(c[i].evidence[0]).endsWith(".png"));
    }
    assert.equal(c[6].reason, "step 3: the element was still visible");
    assert.deepEqual(validateResults(res), []);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  '
  ```

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the final capture becomes the bounded full-page capture

- **ACTION**: Delivers AC-A3. In the final capture block of the browser driver (the `try` that starts at the comment `// Evidence after the last step:`), replace the single line `const png = await page.screenshot({ mask: [page.locator('input[type=password]'), ...valueMasks] });` with `const png = await captureFinalPng(page, [page.locator('input[type=password]'), ...valueMasks]);`. You may widen the comment above the `try` to say a full-page screenshot. Nothing else in the block changes: the `page.innerText('body')` read, the `containsSecret` branch that writes redacted text and takes no screenshot, the single `writeEvidence(ctx, `case-${kase.index}.png`, { kind: 'binary', value: png })` call, and the catch-all that returns `blocked('EVIDENCE_WRITE_FAILED', ...)` unless the verdict is already blocked all stay byte-identical. The classification of a capture that fails both ways is therefore the same as in 0.46.0, while a page whose full-page capture alone fails is now captured as a viewport screenshot instead of blocking the case. Do NOT add `page.setDefaultTimeout` calls, a second `writeEvidence` call, any extra evidence file (a failing browser case must still carry exactly one evidence entry, and a case with no comparison step no JSON evidence), or a viewport option to `browser.newContext`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2805-2818` (the block being edited) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2294-2298` (the single writer that stays the only writer); the harness follows `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:312-319` and `# SOURCE: scripts/validate/checks/qa-run-input-value.test.mjs:438-447`.
- **VALIDATE**: gate through the real `run` mode; it fails on the unmodified tree (the viewport capture of a tall page is 720 pixels high, so the height assertion throws) and passes once the task is done. Four cases on loopback pages of about 3100 pixels: two pages that differ only in the value of a password input must give byte-identical captures (the mask is applied in the full-page capture, mirroring the existing test), two pages that differ only in the value of a plain text input must give different captures (the control that proves the comparison can see a difference), and every capture must be at least 3000 pixels high. The PNG height is read from the IHDR chunk (bytes 20 to 23).
  ```bash
  set -euo pipefail
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import assert from "node:assert/strict";
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { createServer } from "node:http";
  import { spawn } from "node:child_process";
  import { validateResults } from "./scripts/validate/checks/qa-run-contract.mjs";
  const tall = (kind, v) => `<!doctype html><html><head><meta charset="utf-8"><title>T</title></head><body style="margin:0"><h1>Topo</h1><label>Campo <input type="${kind}" value="${v}"></label><div style="height:3000px;background:#eee"></div><p>Fim</p></body></html>`;
  const server = createServer((req, res) => {
    const u = new URL(String(req.url), "http://127.0.0.1");
    const kind = u.pathname === "/tallp" ? "password" : u.pathname === "/tallt" ? "text" : null;
    if (kind === null) { res.writeHead(404, { "content-type": "text/plain" }); res.end("not found"); return; }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(tall(kind, u.searchParams.get("v") ?? ""));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const root = realpathSync(mkdtempSync(join(tmpdir(), "relay-p2t3-")));
  try {
    const runRel = "PRPs/reports/feat/qa-run/20261021T111111111Z";
    const runDir = join(root, ...runRel.split("/"));
    mkdirSync(join(runDir, "grounding"), { recursive: true });
    mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
    writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl, roles: {} }));
    const page = (route, v) => ({ title: "Tall " + route.slice(1) + " " + v[0], manual: ["1. Open the page.", "2. The title shows."], steps: [{ action: "goto", path: route + "?v=" + v }, { action: "expect_visible", selector: "h1" }] });
    const defs = [page("/tallp", "aaaaaaaaaaaa"), page("/tallp", "bbbbbbbbbbbb"), page("/tallt", "aaaaaaaaaaaa"), page("/tallt", "bbbbbbbbbbbb")];
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
    c.forEach((x, i) => assert.equal(x.outcome, "pass", "case " + (i + 1) + ": " + JSON.stringify([x.outcome, x.reason_code, x.reason])));
    const png = (i) => {
      const p = c[i].evidence.find((e) => String(e).endsWith(".png"));
      assert.ok(p, "case " + (i + 1) + " has no screenshot");
      return readFileSync(join(root, ...String(p).split("/")));
    };
    for (let i = 0; i < 4; i++) assert.ok(png(i).readUInt32BE(20) >= 3000, "case " + (i + 1) + " capture is " + png(i).readUInt32BE(20) + " px high; the final capture must cover the whole page");
    assert.equal(Buffer.compare(png(0), png(1)), 0, "the masked captures differ: a password value is visible in the full-page capture");
    assert.notEqual(Buffer.compare(png(2), png(3)), 0, "the control captures are identical: the comparison cannot see a visible value");
    assert.deepEqual(validateResults(res), []);
  } finally {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(() => r(null)));
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  '
  ```

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — state the visibility rule and the full-page final capture

- **ACTION**: Delivers AC-A5 (the command doc). In `plugins/relay/commands/relay-qa-run.md` insert two new paragraphs immediately BEFORE the line `A literal `browser` step that asserts a state:` (so they follow the `expect_not_visible` paragraph and its blank line, and the marker-and-JSON example of `expect_state` still directly follows its own introducing line). Use `Edit` with `old_string` equal to that one line and `new_string` equal to the two paragraphs, each followed by a blank line, then that line again. Write the paragraphs exactly as below, line breaks included (the first line of each is a literal that the validation greps for):
  ```
  Visibility means visible to a person. A positive step (`expect_visible`, `expect_text`)
  and an absence step (`expect_not_visible`) decide it with Playwright's own visibility check
  and with the browser's `checkVisibility`, read with its opacity and visibility options, on
  the same element. Playwright alone counts an element at `opacity: 0` as visible, so a modal
  that is closed but still in the page would pass a positive step. An element at `opacity: 0`,
  under an ancestor at `opacity: 0`, or at `visibility: hidden` is therefore not visible:
  `expect_visible` and `expect_text` fail on it with a fixed reason that the target was
  present but not visible to a person, and `expect_not_visible` passes on it. A positive step
  is re-read for up to 5 seconds, so a fade-in has time to finish. `expect_text` still reads
  the text of the located element and checks the visibility of that element only, and a
  missing element or absent text keeps its earlier reason. A browser that cannot answer
  blocks the case with `STEP_NOT_PERFORMABLE` and asserts nothing.

  The final capture of a browser case is a full-page screenshot, taken after the last step
  that ran, with every `input[type=password]` and every field an `expect_value` step located
  masked, so content below the fold is part of the evidence. It is bounded to 30 seconds. If
  the full-page capture fails inside that bound, the runner takes the viewport-only capture
  once instead, so a very tall page never costs the case its evidence; if that fails too,
  the case ends `blocked` with `EVIDENCE_WRITE_FAILED` as before (an earlier blocked verdict
  keeps its own reason). A page whose text holds a registered secret still gets redacted
  text and no screenshot. The 30 seconds are chosen, not measured.
  ```
  Constraints from the pins: do not insert a blank line inside the `expect_not_visible` paragraph or the `expect_value` paragraph, do not reword `the final screenshot masks the field` or `blocks the case `STEP_NOT_PERFORMABLE` and nothing is asserted` (the new text uses a different sentence for the blocked case on purpose), keep `for up to 5 seconds` on one physical line, and do not use the banned substrings `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`. No new step or key is introduced, so no new `<!-- qa-step-example -->` block is added.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:286-295` (the prose register and the neighbouring paragraph that stays intact).
- **VALIDATE**: gate on the two authored first lines (copied byte-for-byte from the ACTION above), then the real-tree contract check and the three tests that pin this document; the greps fail on the unmodified tree, the contract and the tests pass before and after (regression guards that catch a broken pin).
  ```bash
  set -euo pipefail
  grep -qF "Visibility means visible to a person." plugins/relay/commands/relay-qa-run.md
  grep -qF "The final capture of a browser case is a full-page screenshot" plugins/relay/commands/relay-qa-run.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs
  ```

### Task 5: UPDATE docs/api-reference.md, docs/domain/glossary.md and docs/domain/flows.md — state the visibility rule and the capture

- **ACTION**: Delivers AC-A5 (the knowledge base). Three additive edits, each with a narrow `Edit`:
  1. `docs/api-reference.md` (the single-line `/relay-qa-run` row, line 129): `old_string` = ``The numbers are chosen, not measured. Calls `auth-local-guard.mjs` `` (copy it from the file; if it is not unique, widen it with the words that follow it). `new_string` = the new sentence followed by that same text. The new sentence is one line with no pipe character: ``Visibility is judged as a person would: `expect_visible` and `expect_text` pass only on an element that Playwright reports visible and whose checkVisibility, read with its opacity and visibility options, is true, `expect_not_visible` passes on an element either check hides, so an element at `opacity: 0` or `visibility: hidden` is not visible, and the final capture of a browser case is a full-page screenshot with the password and `expect_value` masks (one viewport-only retry if the full-page capture fails). `` Do not backtick a camelCase or UPPER_SNAKE name here (a release test reads such names only in the `qa-run.mjs` row, and this sentence names no export).
  2. `docs/domain/glossary.md`: insert a paragraph before the paragraph that starts `Two planner rules the command doc states for these actions.` (`old_string` = that sentence; `new_string` = the paragraph, a blank line, then that sentence), written with these line breaks:
     ```
     Visibility is judged as a person would in `expect_visible`, `expect_text` and
     `expect_not_visible`: an element counts as visible only when Playwright reports it
     visible and the browser's `checkVisibility`, read with its opacity and visibility
     options, agrees, so an element at `opacity: 0`, under an ancestor at `opacity: 0` or
     at `visibility: hidden` is not visible (`expect_visible` and `expect_text` fail on
     it with a fixed reason, `expect_not_visible` passes). Playwright alone counts an
     `opacity: 0` element as visible. A positive step is re-read for up to
     `ASSERT_SETTLE_MS`, so a fade-in has time to finish. The final capture of a browser
     case is a full-page screenshot with the password and `expect_value` masks, bounded
     by `CAPTURE_TIMEOUT_MS` (30 seconds, chosen and not measured) and retried once as a
     viewport-only capture if the full-page capture fails.
     ```
  3. `docs/domain/flows.md`: in the numbered item that describes `expect_value`, `expect_state` and `expect_not_visible`, insert two sentences before the line that starts `An element that exists only after a click or a fill is grounded in a second`. `old_string` = ``An element that exists only after a click or a fill is grounded in a second`` (it follows a 3-space indent that stays); `new_string` = the sentences on lines that each start with 3 spaces after the first, then that text:
     ```
     Visibility is judged as a person would: an element at `opacity: 0` or
        `visibility: hidden` is not visible, so `expect_visible` and `expect_text` fail on
        it and `expect_not_visible` passes. The final capture of a browser case is a
        full-page screenshot with the same masks.
        An element that exists only after a click or a fill is grounded in a second
     ```
  Do not edit `docs/decisions.md` (so no `documentation/governance/decisions.html` mirror is involved), and do not add exports to the `qa-run.mjs` row of the API reference (the release test requires every name there to be an export; the Phase 8 release cut refreshes that row).
- **MIRROR**: `# SOURCE: docs/api-reference.md:129 (excerpt of the single-line table row)`, `# SOURCE: docs/domain/glossary.md:328-331`, `# SOURCE: docs/domain/flows.md:205-210`.
- **VALIDATE**: gate on the authored literal in each file (the same first words in all three, copied byte-for-byte from the ACTION), then the release test that reads the API-reference row; the greps fail on the unmodified tree and the test passes before and after.
  ```bash
  set -euo pipefail
  grep -qF "Visibility is judged as a person would" docs/api-reference.md
  grep -qF "Visibility is judged as a person would" docs/domain/glossary.md
  grep -qF "Visibility is judged as a person would" docs/domain/flows.md
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-release-pages.test.mjs
  ```

### Task 6: UPDATE documentation/reference/commands.html and documentation/reference/scripts.html — name the visibility rule and the capture

- **ACTION**: Delivers AC-A5 (the site pages). Read `documentation/AGENTS.md` sections 2, 9 and 12 first (no emojis, no inline style, American English, keep structure and ids). Two narrow `Edit` calls, no page added:
  1. `documentation/reference/commands.html`, the `Step vocabulary` row (line 355): `old_string` = ``A value, a state and an absence are re-read for up to 5 seconds. <code>expect_requests</code> counts the requests the page issues`` ; `new_string` = ``A value, a state and an absence are re-read for up to 5 seconds. Visibility means visible to a person: <code>expect_visible</code> and <code>expect_text</code> pass only on an element that Playwright reports visible and whose <code>checkVisibility</code>, read with its opacity and visibility options, is true, and <code>expect_not_visible</code> passes on an element that either check hides, so an element at <code>opacity: 0</code> or <code>visibility: hidden</code> is not visible. The final capture of a browser case is a full-page screenshot with the password and <code>expect_value</code> masks, retried once as a viewport-only capture if the full-page capture fails. <code>expect_requests</code> counts the requests the page issues``. The new text states no number, so the row's closing parenthesis `(5 seconds, 2 seconds, 100, 50 and 200) are chosen, not measured` stays exact, and it adds no sentence that mentions a `path` together with an `identifier`, an `e-mail`, `ignored` or `evidence/` (the three caveat sentences are matched by those words).
  2. `documentation/reference/scripts.html`, the `Assertions and request count` row (line 222): `old_string` = ``since the last <code>goto</code>. <code>expect_requests</code> waits`` ; `new_string` = ``since the last <code>goto</code>. Visibility is decided by <code>isVisibleToPerson</code>: Playwright&rsquo;s visibility check and the browser&rsquo;s <code>checkVisibility</code>, read with its opacity and visibility options, must both hold, so an element at <code>opacity: 0</code> or <code>visibility: hidden</code> is not visible, and <code>requireVisibleToPerson</code> re-reads it for up to <code>ASSERT_SETTLE_MS</code> for a positive step. The final capture of a browser case is <code>captureFinalPng</code>: a full-page screenshot with the password and <code>expect_value</code> masks, bounded by <code>CAPTURE_TIMEOUT_MS</code> (30000) and retried once as a viewport-only capture if the full-page capture fails; <code>captureElementPng</code> captures one located element with the same masks and bound, and no step uses it yet. <code>expect_requests</code> waits``. Every constant the row already names keeps its stated value; the three names added are exports of `qa-run.mjs` after Task 1.
- **MIRROR**: `# SOURCE: documentation/reference/commands.html:355 (excerpt of the single-line <dd> of the Step vocabulary row)` and `# SOURCE: documentation/reference/scripts.html:222 (excerpt of the single-line <dd> of the Assertions and request count row)`.
- **VALIDATE**: gate on the two authored literals (copied byte-for-byte from the ACTION), then the two site tests that read these rows; the greps fail on the unmodified tree and the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF "Visibility means visible to a person: <code>expect_visible</code>" documentation/reference/commands.html
  grep -qF "Visibility is decided by <code>isVisibleToPerson</code>" documentation/reference/scripts.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs
  ```

### Task 7: UPDATE documentation/changelog.html — record the change under Unreleased

- **ACTION**: Delivers AC-A5 (the changelog entry that `documentation/AGENTS.md` sections 7.3, 7.4 and 9 require for any change under `documentation/`). In the `Unreleased` block, inside the `<h3 id="unreleased-changed">Changed</h3>` list, append two `<li>` entries after the `Reference pages` entry. Use `Edit` with `old_string` = `          classes and the counters.</li>` (the last line of that entry; widen it with the following `      </ul>` line if it is not unique) and `new_string` = that line followed by the two entries:
  ```
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
  ```
  Add no `id` attribute (every id inside the block must start with `unreleased`), no `<h2`, and no text identical to an entry of the 0.46.0 release; do not touch NAV, the search index, the page subtitle or any heading id. Do not bump `plugins/relay/.claude-plugin/plugin.json` or rename `Unreleased` (Phase 8).
- **MIRROR**: `# SOURCE: documentation/changelog.html:61-64` (the shape of a `Changed` entry and of the closing list tag).
- **VALIDATE**: gate on the two authored `<strong>` literals (copied byte-for-byte from the ACTION), then the two site tests that read the `Unreleased` block; the greps fail on the unmodified tree and the tests pass before and after.
  ```bash
  set -euo pipefail
  grep -qF "<strong>Visibility means visible to a person</strong>" documentation/changelog.html
  grep -qF "<strong>Full-page final capture</strong>" documentation/changelog.html
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-release-cut.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs
  ```

## Validation Commands

Diff base: the tree object `eb081922cbe0a4b89c3b78da565fb38ff0d23bfc` (the phase-1 end state). Every "files changed" derivation below uses the single-argument form `git diff <tree> --name-only` plus `git ls-files --others --exclude-standard` for new files, and ignores `PRPs/` (pipeline artifacts: this plan, its review log, the PRD row). Every git and node command carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. The plan writer has no shell, so none of these was executed: the Implementer runs each against the pre-change tree first and expects the stated result.

### Level 1 STATIC_ANALYSIS

Gate on syntax, the frozen surfaces and the changed-file allowlist. `node --check` fails on a syntax error. The frozen-surface and changed-file checks pass on the unmodified tree (nothing changed yet) by design, as regression guards: they fail as soon as a frozen file, a test file or any file outside the eight planned ones changes.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --check plugins/relay/scripts/qa-run.mjs
# The five frozen surfaces are byte-identical to the phase-1 end state.
frozen="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff eb081922cbe0a4b89c3b78da565fb38ff0d23bfc --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs)"
if [ -n "$frozen" ]; then
  echo "FAIL: a frozen surface changed:"; printf '%s\n' "$frozen"; exit 1
else
  echo "PASS: frozen surfaces unchanged"
fi
# Only the eight planned files changed: no test file, no new file, no version bump, no NAV or search-index edit (PRPs/ artifacts are ignored).
changed="$( { GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff eb081922cbe0a4b89c3b78da565fb38ff0d23bfc --name-only; GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git ls-files --others --exclude-standard; } | grep -v '^PRPs/' | sort -u || true )"
unexpected="$(printf '%s\n' "$changed" | grep -v '^$' | grep -vxF -e plugins/relay/scripts/qa-run.mjs -e plugins/relay/commands/relay-qa-run.md -e docs/api-reference.md -e docs/domain/glossary.md -e docs/domain/flows.md -e documentation/reference/commands.html -e documentation/reference/scripts.html -e documentation/changelog.html || true)"
if [ -n "$unexpected" ]; then
  echo "FAIL: a file outside the eight planned files changed (a test file would be an R-X violation):"; printf '%s\n' "$unexpected"; exit 1
else
  echo "PASS: only the planned files changed"
fi
```

### Level 2 CONTENT_INVARIANTS

Gate on the exported surface and the real-tree contract; the first command fails on the unmodified tree (the four functions are not exported) and passes once Task 1 is done, and it also pins that the existing constants kept their values. The remaining checks are regression guards that pass before and after: no static sibling import, no introduced forbidden path reference, and the non-browser tests that pin the command doc, the API reference and the site pages.

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import assert from "node:assert/strict";
import * as m from "./plugins/relay/scripts/qa-run.mjs";
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
for (const name of ["isVisibleToPerson", "requireVisibleToPerson", "captureFinalPng", "captureElementPng"]) assert.equal(typeof m[name], "function", name + " is not exported");
assert.equal(typeof m.CAPTURE_TIMEOUT_MS, "number");
assert.equal(m.ASSERT_SETTLE_MS, 5000);
assert.equal(m.ASSERT_POLL_INTERVAL_MS, 100);
assert.deepEqual([...m.POSITIVE_ASSERTION_ACTIONS], ["expect_visible", "expect_text", "expect_value", "expect_state"]);
assert.equal(m.OUTCOMES.join(","), "pass,fail,blocked,needs-human", "the outcome vocabulary changed");
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
if GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --unified=0 eb081922cbe0a4b89c3b78da565fb38ff0d23bfc -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md docs/api-reference.md docs/domain/glossary.md docs/domain/flows.md documentation/reference/commands.html documentation/reference/scripts.html documentation/changelog.html | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
# The non-browser tests that pin the documents this phase edits (they run no Chromium).
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --test scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-vocabulary-pins.test.mjs scripts/validate/checks/qa-run-network-docs.test.mjs scripts/validate/checks/qa-run-privacy-pins.test.mjs scripts/validate/checks/qa-run-release-pages.test.mjs scripts/validate/checks/qa-run-release-site.test.mjs scripts/validate/checks/qa-run-release-cut.test.mjs
```

### Level 3 DRY-RUN END-TO-END

The end-to-end behaviour (the real `run` mode on a real Chromium page) is gated by the Task 2 and Task 3 commands above, which fail before the work and pass after; run them again here as the integration gate, one after the other, never overlapped. Then the static suite and the corpus gate. `npm run validate` prints `28 passed, 0 failed (28 checks run)` (`scripts/validate/index.mjs` line 130); the grep fails if the count changes. The corpus gate runs last and alone (about five minutes) and runs the corpus exactly as `node --test "scripts/validate/**/*.test.mjs"` (the glob is passed to `node` unexpanded, never narrowed) with the TAP reporter.

```bash
set -euo pipefail
out="$(GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false npm run validate 2>&1)"
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -qF "28 passed, 0 failed (28 checks run)"
```

Corpus gate. The baseline is green (phase 1 closed with its one stale assertion already updated by the test pair), and no existing test is predicted to go stale in this phase, so the allowlist is empty. Research found no assertion on any sentence this phase changes, no fixture element hidden by `opacity`, `visibility`, `content-visibility`, `aria-hidden` or an opacity transition, and no test that reads PNG dimensions or compares a screenshot with stored bytes; the byte comparisons of masked captures (`qa-run-input-value.test.mjs:529-536`) compare two captures of one run through one code path. Two browser tests are known to go intermittently `blocked` `EVIDENCE_WRITE_FAILED` under the full concurrent corpus (cause not established), so the gate does not claim a bare zero: it tolerates at most two failing tests in the concurrent run (`FLAKE_BUDGET`, the count observed), and each failing test file must then pass when run alone, which separates load sensitivity from a regression. More than two concurrent failures fails the gate, because that is the signal that this phase made the capture slower or more fragile under load; a file that also fails alone fails the gate and is a candidate for the test pair (`EXISTING_TEST_UPDATED`), never an Implementer edit. The gate exits 1 on any failure outside that rule, on a runner crash, on a cancelled test, on output it cannot parse or whose counters disagree with its result lines, and when `node_modules/playwright` is missing from the worktree. The TAP shape was observed on this host (Node v24.15.0): flat output, a failing test names its file only in the `location:` line of its YAML block, and an import-time crash is one `not ok` whose title is the file path.

Allowlist (empty: no existing test is predicted to go stale):

| File | Test (title prefix) | Exact assertion | Why this phase makes it stale |
|------|---------------------|-----------------|-------------------------------|
| (none) | (none) | (none) | (none) |

```bash
set -euo pipefail
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false node --input-type=module -e '
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative, sep } from "node:path";
const ALLOWED = [];
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
if (other.length > FLAKE_BUDGET) fail(other.length + " failing test(s) in the concurrent run exceed the load-sensitivity budget of " + FLAKE_BUDGET + ", in " + [...new Set(other.map((f) => f.file))].join(", ") + ": " + other.slice(0, 5).map((f) => f.title).join(" | "));
const real = [];
for (const file of [...new Set(other.map((f) => f.file))]) {
  const again = spawnSync(process.execPath, ["--test", file], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  if (again.error || again.status !== 0) real.push(file);
}
if (real.length > 0) fail("test file(s) that also fail when run alone, so not load-sensitive: " + real.join(", "));
console.log("PASS: " + counters.pass + " passed, " + failures.length + " load-sensitive failure(s) that pass alone, none outside the rule" + (other.length > 0 ? " (" + [...new Set(other.map((f) => f.file))].join(", ") + ")" : ""));
'
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given a page with an element at `opacity: 0`, under an ancestor at `opacity: 0`, or at `visibility: hidden`, when an `expect_visible` or `expect_text` step targets it (role/name, text or the legacy `selector` form), then the case ends `fail` with the fixed reason `step <n>: the target was present but not visible to a person (opacity or visibility hides it)`, one final capture as its only evidence and no locator word or page text in the reason; and when an `expect_not_visible` step targets such an element, then the step passes. A visible element still fails `expect_not_visible` with the unchanged sentence `the element was still visible`.
- **AC-A2 (PRD AC-4):** The decision is Playwright visibility AND `Element.checkVisibility({ opacityProperty: true, visibilityProperty: true })` evaluated on the resolved element, exposed as `isVisibleToPerson` and applied through `requireVisibleToPerson`; a positive step is re-read for the existing 5-second settle so a late fade-in still passes; a browser that cannot answer blocks the case `STEP_NOT_PERFORMABLE` and never passes; every failing sentence that existed before (`the expected element was not visible`, `the expected text was not present`, `the expected element was not found`) is unchanged and is produced before visibility is considered.
- **AC-A3 (PRD AC-5):** Given any browser case, its final capture is a full-page screenshot with the password and `expect_value` masks applied (a tall fixture page's capture is as tall as the page, and two pages that differ only in a masked field give byte-identical captures), bounded by an explicit `CAPTURE_TIMEOUT_MS`, retried once as a viewport-only capture when the full-page capture throws, and written through the single `writeEvidence` helper; a capture that fails both ways keeps the 0.46.0 classification (`blocked` `EVIDENCE_WRITE_FAILED` unless the verdict was already blocked); a page whose text holds a registered secret still gets redacted text and no screenshot; no extra evidence file is added.
- **AC-A4 (PRD AC-5):** A reusable element-capture helper, `captureElementPng(locator, masks)`, returns an element-only PNG with the same masks and bound. The clause "a `judge` step with a locator scope also writes an element screenshot of that scope" is explicitly NOT delivered in this phase: the `judge` step lands in Phase 5 and scoped locators in Phase 3, so no step uses the helper and no evidence file name is introduced for it; Phase 5 wires it and owns that clause.
- **AC-A5 (PRD AC-4, AC-5):** Given `plugins/relay/commands/relay-qa-run.md`, `docs/api-reference.md`, `docs/domain/glossary.md`, `docs/domain/flows.md`, `documentation/reference/commands.html`, `documentation/reference/scripts.html` and `documentation/changelog.html`, when they are read, they state that visibility means visible to a person (opacity and visibility honoured) and that the final capture of a browser case is a full-page screenshot; the changelog carries the two entries under `Unreleased`; the existing tests that pin these documents (`qa-run-vocabulary-pins`, `qa-run-network-docs`, `qa-run-privacy-pins`, `qa-run-release-pages`, `qa-run-release-site`, `qa-run-release-cut`) pass unedited; no page is added and NAV, the search index and the plugin version are unchanged.
- **AC-A6 (PRD AC-24):** `npm run validate` passes with exactly 28 checks (none added or extended), the corpus `node --test "scripts/validate/**/*.test.mjs"`, run in a worktree that has `node_modules`, passes the corpus gate of `## Validation Commands` (an empty allowlist and the load-sensitivity rule), and the five frozen surfaces and every test file are byte-identical to the phase-1 end state. This criterion is verified by Levels 1 to 3 and delivered by every task keeping its constraints; it has no dedicated task.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An `expect_text` that passed on text in a non-rendered element (an `<option>` of a closed select, text in a collapsed `details`, a `display: none` node) now fails | M | M | It fails and never falsely passes, which is the point of AC-4 and the runner's first rule; the fixed reason names the cause, the 5-second re-read gives late renders time, and a plan can target the rendered element. The Phase 9 dogfood reads every `fail`. No existing fixture is affected (research found none hidden by CSS) |
| A visible container whose matching text sits in a hidden descendant still passes `expect_text` (the check covers the located element only, and `textContent` is still read) | M | L | A deliberate scope limit: switching to `innerText` would change case and whitespace semantics for every existing plan. Recorded under NOT Building and in the command doc; Phase 3's scoped locators let a plan target the descendant |
| This Chromium's `checkVisibility` may not treat an ancestor at `opacity: 0` as hiding (MDN does not document ancestors) | L | H | Task 1's validation asserts it on the pinned Chromium (`#e` inside a `.z` ancestor) and fails otherwise; the task states the additive fix (an explicit ancestor walk before the `checkVisibility` call) |
| The full-page capture is heavier, so it can time out under load and turn a case `blocked` `EVIDENCE_WRITE_FAILED` (two browser tests already do so intermittently under the full corpus; the cause is not established and this plan does not claim to fix it) | M | M | An explicit 30-second bound, no longer than needed on the success path; one viewport-only retry restores exactly the 0.46.0 capture, so no page that produced evidence before can lose it; the classification and the single write helper are unchanged; the corpus gate caps concurrent failures at the observed two and requires each to pass alone |
| A full-page screenshot shows more of the page (personal data below the fold) | M | M | The posture is unchanged rather than weaker: `containsSecret` already reads the whole `page.innerText('body')`, so a page whose text holds a registered secret is withheld as before; the password and `expect_value` masks are applied to the full-page capture (Task 3's validation proves the password mask byte for byte); `evidence/` stays in the ignored run directory; the Phase 9 secrecy and privacy scans cover judged and captured files |
| A page taller than the browser's capture limit may be truncated by the browser without an error (secondary sources report about 16384 px; no primary source found) | L | L | The capture then shows the top of the page, which is no worse than the 0.46.0 viewport capture; a thrown error takes the viewport-retry path. Recorded as a known limit |
| New runner code or comments disturb a source-text pin or a test mutation anchor (a second `writeFileSync(`, `// WRITE-SITE` or `outcome:` literal, a repeat of the `const abs = join(ctx.runDirAbs, 'evidence', name);` line, a quoted section marker, `if (isObj(record)) {`) | M | H | Task 1 lists every forbidden string; the helpers only return bytes and never write; Level 2 runs the real-tree contract and Level 3 the corpus gate |
| The doc edits break a pinned sentence or a sentence-splitting rule (the `expect_not_visible` and `expect_value` paragraphs, the `(5 seconds, 2 seconds, 100, 50 and 200) are chosen, not measured` parenthesis, the three caveat sentences, the `Unreleased` id rules) | M | M | Tasks 4 to 7 add separate paragraphs or sentences, state each constraint, and run the test that pins the page they edit |
| The validation commands were derived by reading the tree, not executed (the plan writer has no shell) | M | L | They reuse the fixture shape of the shipped `qa-run-input-value.test.mjs` and of the phase-1 plan; the Implementer runs each against the pre-change tree first and expects the stated failure |
| AC-5's second clause is unreachable here and may be chased by a reader | M | L | Stated in the Summary, `## NOT Building`, AC-A4 and `## Notes`: deferred to Phase 5 (and Phase 3 for `within`); this phase delivers the helper only |
| `captureElementPng` ships unused until Phase 5 | L | L | It is exercised directly by Task 1's validation (a real element capture of known size); Phase 5 wires it or removes it |
| Scope size across nine phases (PRD risk) | H | M | This phase is one lane on `qa-run.mjs`, independently testable, adds no new step or mode and no reason code |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework. (Levels 2 and 3 run the existing test files only as regression guards; running a test is not touching it.)
- **Test-pair follow-up.** New tests required (`NEW_TEST_REQUIRED`, from AC-A1 to AC-A4): `isVisibleToPerson` on a real page (plain, `opacity: 0`, ancestor at `opacity: 0`, `visibility: hidden`, `display: none`, absent, `opacity: 0.01`); `requireVisibleToPerson` (null when visible, the fixed failing sentence, the blocked sentence for a reader that throws, a late fade-in accepted inside the window, driven with the injectable `opts` so no test waits five seconds); the five wired branches end to end through the real `run` (role/text and legacy selector forms of `expect_visible` and `expect_text`, and `expect_not_visible` on a hidden-by-opacity element passing and on a visible one failing with the unchanged sentence); `captureFinalPng` (a tall page is captured whole, the masks are applied, the viewport retry on a throwing full-page capture with the same mask and bound, a rejection when both throw); `captureElementPng` (an element-sized PNG). **No `EXISTING_TEST_UPDATED` is predicted.** Existing assertions this design keeps true, which the pair should re-read in the Implementer's diff for anything this analysis missed: `qa-run.test.mjs:1002-1005` (the missing-text case fails with exactly one evidence entry and the passing case starts with the PNG signature), `qa-run.test.mjs:1017-1020` (a page that holds a secret yields `.txt` and no `.png`), `qa-run.test.mjs:769-785` (the WRITE-SITE mutation anchor stays unique), `qa-run-absence-state.test.mjs:299-395` (the `settleAssertion` unit tests; the function is untouched) and `:588-699` (absence outcomes: only the `hidden` attribute and DOM removal are used, and both stay hidden under the new rule), `qa-run-input-value.test.mjs:499-503` (no extra JSON evidence) and `:529-536` (masked captures identical, unmasked ones different, now over a full-page capture of short pages), `qa-run-network-count.test.mjs:343-348` (`case-14.png` exists), and the reason-echo bans (`absence-state:643,681`, `input-value:478-480`), which the new sentence respects because it carries no locator word. Files the research did not fully open and the pair should check for real-Chromium expectations: `qa-run-network-evidence`, `qa-run-network-guard`, `qa-run-ui-grounding` and `qa-run-stable-grounding`.
- **Cross-phase sequencing decision (AC-5).** PRD AC-5 has two clauses. The first (the final capture is a full-page screenshot with the password and `expect_value` masks) is delivered here. The second (a `judge` step with a locator scope also writes an element screenshot of that scope) depends on the `judge` step (Phase 5) and on scoped locators (`within`, Phase 3), neither of which exists. This phase therefore delivers only the reusable helper `captureElementPng(target, masks)` (same masks, same bound, bytes returned, nothing written) and wires it to no step: wiring it to every locator step would multiply evidence files, shift `evidence[0]` that existing tests read, and add a capture to pages that hold a secret. Phase 5 owns the evidence file name (the existing per-step convention is `case-<k>.value-<n>.json` and `case-<k>.requests-<n>.json`, so `case-<k>.element-<n>.png` is the natural choice) and must route the write through `writeEvidence`, withhold it on a page that holds a secret exactly as the final capture does, and attribute it to its step.
- **Phase 3 inherits the rule by construction.** Every positive locator step ends in `requireVisibleToPerson` inside `runLocatorStep`, so the new locator forms of Phase 3 (`within`, `name_prefix`, `label_text`, `index`) are checked for visibility without further work as long as they resolve to a locator and then reach the same branches.
- **Design decisions made here.** (1) The conjunction is Playwright's `isVisible()` AND `checkVisibility({ opacityProperty: true, visibilityProperty: true })` on the same element, exactly as PRD AC-4 words it; it is applied to the legacy `selector` forms too, because the goal is that no step passes on content a person cannot see and the legacy forms are still valid plans. (2) For `expect_visible` and `expect_text` the earlier failing sentence is produced first and visibility is checked only afterwards, so every case that failed before fails with the same sentence and the same timing (a 10-second wait for a missing element), and the only cases whose verdict changes are cases that passed on hidden content; the legacy `expect_visible` keeps its 10-second `waitFor` first, which a network-count test relies on for a page element that appears after 4.5 seconds. (3) The new failing sentence is fixed text with no locator word, because tests ban echoing a locator name or page text in a reason. (4) `CAPTURE_TIMEOUT_MS` is 30000, Playwright's own default for an operation, replacing the effective 10 seconds of `page.setDefaultTimeout(10000)` for this one call: it is longer on purpose because a full-page capture is heavier and the screenshot is the slowest call of a case when many Chromium instances compete, and it costs nothing when the capture succeeds. It is chosen, not measured, and the Phase 9 dogfood recalibrates it. (5) The viewport retry guarantees this phase is never worse than 0.46.0 for evidence, and it is documented in the command doc rather than recorded in a new result field. (6) `requireVisibleToPerson` forwards `opts` to `settleAssertion` only so the test pair can drive it with a small window; callers pass none.
- **Known flakiness (orchestrator fact 6).** Two browser tests have intermittently gone `blocked` `EVIDENCE_WRITE_FAILED` in the final-capture catch-all around `page.innerText`, `page.screenshot` and `writeEvidence` under the full concurrent corpus. Their cause is not established and this plan neither claims nor needs a fix for it. What it does: it keeps a single write helper, changes only the screenshot call, makes the bound explicit and longer, and adds a viewport retry that restores the old capture, so the path is not made slower on the success path or more fragile than before. The corpus gate caps concurrent failures at the observed two and requires each failing file to pass alone, which makes a regression caused by this phase visible instead of absorbing it.
- **Corpus gate, allowlist and documentation sync (orchestrator decision).** `qa-run-release-pages.test.mjs` (lines 387-408, 454-480, 526-542) compares `reference/commands.html`, `reference/scripts.html` and `docs/api-reference.md` with the script and the command doc, and `qa-run-release-cut.test.mjs` (lines 112-134) reads the `Unreleased` block, so the documents that name the changed behaviour move with it in this phase (Tasks 4 to 7) and each phase can close with a green corpus; only the version bump, the release heading, NAV, the search index and the other release pages stay in Phase 8. The allowlist is empty (see Level 3); the gate runs last and alone, after `npm run validate`, never overlapped.
- **Scope of docs.** `docs/decisions.md` is not edited (so no `documentation/governance/decisions.html` mirror is involved). The `qa-run.mjs` row of `docs/api-reference.md` is not edited either: a release test requires every backticked name between `REASON_CATALOGUE` and `USAGE` to be an export and a fixed list of sixteen names to stay listed, and the Phase 8 release cut refreshes it. Under `documentation/` only `reference/commands.html`, `reference/scripts.html` and `changelog.html` change, following `documentation/AGENTS.md`: no page is added, so NAV and the search index are untouched, and `plugin.json` keeps its version. The `docs_sync` pass at implement time finds Task 5 already done. `plugins/relay/resources/redaction-policy.md` is not edited: its bullets keep saying that the final screenshot masks the located field, which stays true.
- **Environment.** The host is Windows with Git Bash. Every command that runs git, node or npm carries `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`. Keep LF line endings in every edited file (the `line-endings` check). `node_modules` in the worktree is a directory junction to the main checkout's (Playwright 1.61.1): do not modify it; the end-to-end commands spawn the real runner by absolute path, so Playwright resolves by directory walk from `plugins/relay/scripts/visual/`, and `import { chromium } from "playwright"` in the Task 1 command resolves from the working directory.
- **Research.** `research-codebase` located the visibility branches (`qa-run.mjs:2561-2646`, `:2734-2745`), the final capture (`:2805-2818`), the single writer (`:2294-2298`), the absence of any `checkVisibility`, `fullPage`, element-screenshot or `within` code, the contract pins (`qa-run-contract.mjs:336-350, 429-437, 512-519`) and the doc rows; two follow-up passes enumerated the tests that read the changed text and every exact-text mutation anchor (only `const abs = join(ctx.runDirAbs, 'evidence', name);` lies near the edit regions) and the documents with sentence-splitting pins, and each hit its scope cap with the unopened files listed in the Test-pair follow-up above. All line anchors cited in this plan were checked against the worktree files. `research-web` found, with sources: MDN documents `Element.checkVisibility` with `opacityProperty` and `visibilityProperty` (baseline since March 2024, https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility) but does not document ancestors or detached nodes, so Task 1 asserts the ancestor case empirically; Playwright documents that `opacity: 0` is visible (https://playwright.dev/docs/actionability); `page.screenshot` has `fullPage` (default false), `mask`, `animations` and a `timeout` whose library default is not confirmed (https://playwright.dev/docs/api/class-page), hence the explicit bound; `locator.screenshot` scrolls into view, waits for actionability and takes the same options (https://playwright.dev/docs/api/class-locator); v1.61.1 sizes a full-page capture from the larger of the scroll, offset and client sizes of `body` and `documentElement`, sets no maximum and applies masks before the capture (`packages/playwright-core/src/server/screenshotter.ts` at tag v1.61.1); a practitioner report shows headless Chromium crashing on a 50,000 px full-page capture through memory exhaustion (https://dev.to/allscreenshots/debugging-chromium-crashes-when-taking-full-page-screenshots-with-playwright-43k1). Gaps recorded: no primary source for a hard full-page height limit, none for the cost of `mask` with `fullPage` on very tall pages, and `locator.evaluate` detach semantics were not retrieved.
- The plan writer has no shell tool: every VALIDATE command was derived by reading the current tree, not executed. Tasks 1 to 3 are gates that fail before the work (the four functions are not exported; an `opacity: 0` target passes a positive step; a tall page is captured 720 px high). Tasks 4 to 7 are gates that fail before the work (the authored literals are absent) and then run the existing tests that pin the page they edit, which pass before and after. The Level 1 frozen-surface and changed-file checks and the Level 2 regression guards pass on the unmodified tree by design; the Level 2 export check fails on it. The inline corpus-gate parser is adapted from the one in the shipped phase-1 plan, which an agent validated against the real baseline TAP output and a deliberate failing-test experiment; this version, with its load-sensitivity rule, has not been run.

*Generated: 2026-10-21*
*Approved: 2026-10-21*
*Implemented: 2026-10-21*
*Status: IMPLEMENTED*
