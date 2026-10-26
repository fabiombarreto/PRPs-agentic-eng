# Feature: Failure causes (Phase 2 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` run-time reason codes, the per-case and per-step records in `results.json`, the reason-code catalogue); cross-cutting artifact (`results.json` downstream stages and the dogfood kit read); no new network- or store-touching site
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): item 2 (a known product defect is executed and ends `fail`), item 6 (report-word locators resolve at run time), item 11 (environment signals stay outside the reason-code catalogue)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` Decisions Log: failure cause is a closed list derived by pre-checks, never an error text; an absent report-named element is `fail`
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text or a Playwright error
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a cause is one word of a closed list and a reason is a fixed sentence; the thrown Playwright error is never read, stored or written
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": tests that encode the old behaviour are updated only by the test pair
- Applicable architectural rules:
  - Command versus script separation: the script classifies, executes and records
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - R-X strict: the Implementer authors zero test files
  - PRP artifact paths: plan under `PRPs/plans/`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 2: "Failure causes" — Goal: every blocked action says why, and a missing report-named element is a QA result — Success signal: AC-4, AC-5, AC-14 hold on fixtures for each cause.

## Summary

Today a `click` or `fill` that throws is swallowed by a bare `catch {}` in `runLocatorStep` and reported as one fixed `STEP_NOT_PERFORMABLE` sentence, identical for a covered, a disabled and a missing target (KD-21). A report-named element that matches nothing after the wait ends `needs-human` `STEP_UNGROUNDED` when its locator is grounded by the report's words, so a product defect reads as a planning gap (KD-23). This phase adds a closed cause list (`covered`, `disabled`, `not_editable`, `absent`, `detached`, `other`) derived by pre-checks run after the action fails (count, `isEnabled`, `isEditable`, a hit-test at the action point), turns the fixed sentence into a per-cause fixed sentence, records the cause on the case and on the failed step, makes a zero-match positive assertion a `fail` with cause `absent`, and adds a run-time catalogue that gives `STEP_NOT_PERFORMABLE` the class `gap` with its cause list and documents `PLAN_ENTRY_INVALID` as a plan defect. All code changes live in `plugins/relay/scripts/qa-run.mjs`; the command doc is Phase 7's.

## User Story

As the AI session that runs `/relay-qa-run`
I want every blocked action to name a closed cause and every element the report names but the product lacks to be a `fail`
So that a retry changes the right thing and a product defect is reported as a QA result instead of a planning gap.

## Problem Statement

`plugins/relay/scripts/qa-run.mjs` swallows the Playwright error of a failed click or fill in a bare `catch {}` and returns one fixed sentence, so NC-6 needed three attempts (KD-21). A report-word locator that matches nothing is returned as `needs-human` `STEP_UNGROUNDED`, so X-1's product defect (an error page where the report expects the login page) read as a planning gap (KD-23). Both land on the operator at the human gate.

## Solution Statement

A pure, exported classifier `causeOf` maps pre-check facts to the closed list; an exported `probeActionFailure(target, action, attached)` gathers those facts from a Playwright locator without ever reading the thrown error; an exported `isCoveredAtActionPoint(el)` is the self-contained in-page hit-test. A `notPerformable(reason, cause)` helper becomes the only place that writes `blocked('STEP_NOT_PERFORMABLE', ...)`, so every site carries a cause. The cause rides the case result (`cause`) and the failed step record (`cause`) and is persisted only when it is in the closed list. The zero-match rule changes only for positive assertions. A new exported `RUNTIME_REASON_CATALOGUE` holds the class and cause list of `STEP_NOT_PERFORMABLE` and the plan-defect documentation of `PLAN_ENTRY_INVALID`; `REASON_CATALOGUE` itself is not changed in this phase (see Notes).

## Metadata

| Key | Value |
|-----|-------|
| Type | Enhancement |
| Complexity | Medium |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs` (run-time reason helpers, `runLocatorStep`, browser driver, results writer) |
| Dependencies | none (row 2 has no `Depends`; phase 1 already in the working tree) |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 76-77, 86, 181-182, 196-199 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 76-77, 86, 156-162, 196-199 | AC-4, AC-5, AC-14, the cause-by-pre-checks architecture note, Phase 2 details |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3526-3649 | `runLocatorStep`: the zero-match block (3584-3588), the click/fill catch (3589-3596), every `STEP_NOT_PERFORMABLE` return |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3696-3750, 3907-3919 | browser driver: the raw-selector click/fill catch (3742-3750), `recordSteps` use, gap overlay, the returned case result |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 5116-5134 | the results writer: a case-level field whitelist that drops an unlisted `cause` |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1085-1098, 1825-1855 | `StepRecord`/`CaseResult` typedefs, `blocked`/`needsHuman`, `recordSteps`, `overlayGapRecords` (pure-helper precedent) |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 2484-2568 | `REASON_CATALOGUE` (12 codes, fields `disposition`/`class`/`reason`) and `reasonClassOf`: not changed here |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 680-706, 769-806 | why `REASON_CATALOGUE` must not gain a code in this phase: every catalogue code needs a row in the command doc's table (Phase 7), and non-impossible codes must be `gap` |

## Patterns to Mirror

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1095-1098
/** @param {string} code @param {string} reason @param {string[]} [evidence] @returns {CaseResult} */
const blocked = (code, reason, evidence = []) => ({ outcome: 'blocked', reason_code: code, reason, evidence });
/** @param {string} code @param {string} reason @returns {CaseResult} */
const needsHuman = (code, reason) => ({ outcome: 'needs-human', reason_code: code, reason, evidence: [] });
```
Copied by Task 1: `notPerformable` is a sibling one-line helper placed right after these two.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3584-3596
  if (count === 0) {
    if (atRunTime) return needsHuman('STEP_UNGROUNDED', `step ${n}: the locator matched no element at run time, so nothing was asserted or acted on`);
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
```
Copied by Task 2: the exact block whose zero-match order and bare catch are rewritten.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1834-1855
/** The fixed sentence of a step that could not be grounded and so was not run. Never a locator, a value or page text. */
export const STEP_GAP_REASON = 'the step could not be grounded to exactly one element, so it was not run; a person owes it';
export function overlayGapRecords(records, gaps, truncateAt) {
  const gapAt = new Set(gaps.map((g) => g.at));
  return records.map((rec, j) => {
    if (gapAt.has(j)) return { ...rec, result: 'human', evidence: null, reason_code: 'STEP_UNGROUNDED', reason: STEP_GAP_REASON };
    ...
    return rec;
  });
}
```
Copied by Tasks 1 and 3: fixed exported sentences, and a pure exported record-rewriting helper (`attachStepCause`) that returns new records and leaves untouched ones unchanged.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:5118-5134
      entries.push({
        index: c.index,
        title: c.title,
        risk: c.risk,
        outcome: pending ? null : result.outcome,
        reason_code: result.reason_code,
        reason: result.reason,
        ...
        steps: Array.isArray(result.steps) ? result.steps : [],
        manual_steps_verbatim: keepSteps || pending ? c.manual_steps_verbatim : null,
        ...(pending ? { pending_judgment: result.pending_judgment } : {}),
      });
```
Copied by Task 3: the whitelist where an optional key is added with a conditional spread, like `pending_judgment`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | closed cause list, classifier, probe, hit-test, `notPerformable`, run-time catalogue, `runLocatorStep` and driver wiring, step-record and results persistence (AC-4, AC-5, AC-14) |

## NOT Building (Scope Limits)

- Any edit to a test file. Tests that encode the old behaviour go stale by design (see Notes) and are updated by the test pair.
- `plugins/relay/commands/relay-qa-run.md`, the `qa-run-contract` check, `documentation/`, the version bump and changelog: Phase 7 (AC-15, AC-17, AC-18). `REASON_CATALOGUE` gains no code here, so the contract check and the command doc's code table stay consistent without edits.
- Folding `STEP_NOT_PERFORMABLE` into `REASON_CATALOGUE` and its doc table row: Phase 7 (it needs the doc row and a decision on the contract check's `gap`-only rule).
- A change to the run-time-grounded (report-word) zero-match of a `click`, `fill` or other non-assertion step, or of a scope/index guard: they stay `needs-human` `STEP_UNGROUNDED`. AC-5 changes positive assertions only. A locator matching more than one element stays `needs-human` `STEP_UNGROUNDED`.
- Assertion continuation after a failed assertion (Phase 3), overlay handlers and dismissal (Phase 6; this phase's `covered` cause is what an undeclared overlay reports), `force: true` or any forced action.
- Writing a Playwright error, page text, a locator value or a fill value anywhere.
- The frozen files: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`.
- A new `npm run validate` check (the count stays 28).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — closed causes, classifier, probe, hit-test, `notPerformable`, run-time catalogue

- **ACTION**: Satisfies AC-A1 and AC-A3. Add, beside `blocked`/`needsHuman` (`qa-run.mjs:1095-1098`) and the exported pure helpers: (1) `export const STEP_FAILURE_CAUSES = Object.freeze(['covered', 'disabled', 'not_editable', 'absent', 'detached', 'other'])`; (2) `export const STEP_CAUSE_PHRASES`, a frozen map from each cause to a fixed lower-case phrase made only of letters and spaces: covered `another element covered it at the action point`, disabled `it was disabled`, not_editable `it was not editable`, absent `it was not found on the page`, detached `it was detached from the page during the action`, other `no closed cause applies`; (3) `export function actionFailureReason(n, action, cause)` returning `` `step ${n}: the ${action} target could not be acted on: ${phrase}` `` (an `action` other than `click` or `fill`, or a cause outside the list, falls back to `step` and `other`; nothing from a caller string reaches the sentence); (4) `export function absentElementReason(n)` returning `` `step ${n}: the element the report names was not found on the page after the wait` ``; (5) `export function causeOf(facts)` with `facts = { action, count, attached, enabled, editable, covered }`, pure, first match wins: `count === 0` gives `detached` when `attached === true` (the element was located before the action and is gone) else `absent`; `count > 1` gives `other`; `enabled === false` gives `disabled`; `action === 'fill'` and `editable === false` gives `not_editable`; `action === 'click'` and `covered === true` gives `covered`; anything else, including `null` for an unknown fact, gives `other` (a covered fact never classifies a `fill`, which Playwright does not hit-test); (6) `export function isCoveredAtActionPoint(el)`, a self-contained function (no closure over module scope, because Playwright serializes it into the page): scroll the element to the center when `el.scrollIntoView` is a function, read `el.getBoundingClientRect()`, return `null` when width or height is not positive, take `hit = document.elementFromPoint(center x, center y)`, return `null` when `hit` is `null`, else return `!(hit === el || el.contains(hit))`; (7) `export async function probeActionFailure(target, action, attached)`: reads `count()`, `isEnabled({ timeout: 1000 })`, for `fill` `isEditable({ timeout: 1000 })`, and for `click` `target.evaluate(isCoveredAtActionPoint)`, each wrapped so a throw becomes `null`/`0` and the error is never inspected, stored or returned, then returns `causeOf(...)`; it never calls an action method and never uses `force`; (8) the run-time helper `const notPerformable = (reason, cause = 'other') => ({ ...blocked('STEP_NOT_PERFORMABLE', reason), cause: STEP_FAILURE_CAUSES.includes(cause) ? cause : 'other' })`, exported, written with the literal `blocked('STEP_NOT_PERFORMABLE', reason)` exactly once in the file; (9) `export const RUNTIME_REASON_CATALOGUE` (frozen, with frozen entries): `STEP_NOT_PERFORMABLE` is `{ disposition: 'blocked', class: 'gap', causes: STEP_FAILURE_CAUSES, reason: 'a step\'s target could not be acted on; the cause is one word of the closed list' }` and `PLAN_ENTRY_INVALID` is `{ disposition: 'needs-human', class: 'plan-defect', decline: false, reason: 'the plan entry is malformed (a schema error); it is a defect of the plan, not a decline of the case' }`, each preceded by a comment saying why these two codes sit outside `REASON_CATALOGUE` (runtime codes; Phase 7 folds them into the doc table); (10) `export function runtimeReasonClassOf(code)` returning the entry's `class` for an own key of `RUNTIME_REASON_CATALOGUE`, else `null`. Extend the `CaseResult` typedef (`qa-run.mjs:1087`) with optional `cause?: string`. Do not change `REASON_CATALOGUE`, `reasonClassOf`, `summarizeNeedsHuman` or `RUNNER_OWNED_REASON_CODES`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1095-1098` (sibling one-line helper) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1834-1855` (fixed exported sentences, pure helpers)
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.deepEqual([...m.STEP_FAILURE_CAUSES], ["covered", "disabled", "not_editable", "absent", "detached", "other"]);
  assert.ok(Object.isFrozen(m.STEP_FAILURE_CAUSES));
  const c = m.causeOf;
  assert.equal(c({ action: "click", count: 0, attached: false }), "absent");
  assert.equal(c({ action: "click", count: 0, attached: true }), "detached");
  assert.equal(c({ action: "click", count: 2, attached: true }), "other");
  assert.equal(c({ action: "click", count: 1, attached: true, enabled: false, covered: true }), "disabled");
  assert.equal(c({ action: "fill", count: 1, attached: true, enabled: false, editable: false }), "disabled");
  assert.equal(c({ action: "fill", count: 1, attached: true, enabled: true, editable: false }), "not_editable");
  assert.equal(c({ action: "click", count: 1, attached: true, enabled: true, covered: true }), "covered");
  assert.equal(c({ action: "fill", count: 1, attached: true, enabled: true, editable: true, covered: true }), "other");
  assert.equal(c({ action: "click", count: 1, attached: true, enabled: null, covered: null }), "other");
  const phrases = new Set();
  for (const cause of m.STEP_FAILURE_CAUSES) {
    const s = m.actionFailureReason(3, "click", cause);
    assert.match(s, /^step 3: the click target could not be acted on: [a-z ]+$/);
    phrases.add(s);
  }
  assert.equal(phrases.size, 6);
  assert.equal(m.actionFailureReason(3, "SECRET value", "bogus"), m.actionFailureReason(3, "step", "other"));
  assert.match(m.absentElementReason(4), /^step 4: the element the report names was not found on the page after the wait$/);
  const np = m.notPerformable("step 2: fixed", "absent");
  assert.deepEqual(np, { outcome: "blocked", reason_code: "STEP_NOT_PERFORMABLE", reason: "step 2: fixed", evidence: [], cause: "absent" });
  assert.equal(m.notPerformable("step 2: fixed").cause, "other");
  assert.equal(m.notPerformable("step 2: fixed", "SECRET").cause, "other");
  const r = m.RUNTIME_REASON_CATALOGUE;
  assert.equal(r.STEP_NOT_PERFORMABLE.class, "gap");
  assert.equal(r.STEP_NOT_PERFORMABLE.disposition, "blocked");
  assert.deepEqual([...r.STEP_NOT_PERFORMABLE.causes], [...m.STEP_FAILURE_CAUSES]);
  assert.equal(r.PLAN_ENTRY_INVALID.class, "plan-defect");
  assert.equal(r.PLAN_ENTRY_INVALID.decline, false);
  assert.equal(m.runtimeReasonClassOf("STEP_NOT_PERFORMABLE"), "gap");
  assert.equal(m.runtimeReasonClassOf("PLAN_ENTRY_INVALID"), "plan-defect");
  assert.equal(m.runtimeReasonClassOf("NOPE"), null);
  assert.ok(!Object.hasOwn(m.REASON_CATALOGUE, "STEP_NOT_PERFORMABLE"));
  const el = { scrollIntoView() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }), contains: (x) => x === el };
  globalThis.document = { elementFromPoint: () => ({}) };
  assert.equal(m.isCoveredAtActionPoint(el), true);
  globalThis.document = { elementFromPoint: () => el };
  assert.equal(m.isCoveredAtActionPoint(el), false);
  globalThis.document = { elementFromPoint: () => null };
  assert.equal(m.isCoveredAtActionPoint(el), null);
  const flat = { ...el, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
  assert.equal(m.isCoveredAtActionPoint(flat), null);
  const fake = (o) => ({
    count: async () => o.count,
    isEnabled: async () => { if (o.enabled === "throw") throw new Error("SECRET page text"); return o.enabled; },
    isEditable: async () => o.editable,
    evaluate: async () => o.covered,
  });
  assert.equal(await m.probeActionFailure(fake({ count: 1, enabled: true, editable: true, covered: true }), "click", true), "covered");
  assert.equal(await m.probeActionFailure(fake({ count: 1, enabled: false, covered: true }), "click", true), "disabled");
  assert.equal(await m.probeActionFailure(fake({ count: 1, enabled: true, editable: false }), "fill", true), "not_editable");
  assert.equal(await m.probeActionFailure(fake({ count: 0 }), "click", false), "absent");
  assert.equal(await m.probeActionFailure(fake({ count: 0 }), "click", true), "detached");
  assert.equal(await m.probeActionFailure(fake({ count: 1, enabled: "throw", covered: null }), "click", true), "other");
  '
  ```
  Exits non-zero on the current tree (none of these exports exist) and whenever a cause is misclassified, a sentence is not fixed, the hit-test misreads a fake page, a probe throw leaks, or `STEP_NOT_PERFORMABLE` leaks into `REASON_CATALOGUE`.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — use the causes at every `STEP_NOT_PERFORMABLE` site and make an absent report-named element a `fail`

- **ACTION**: Satisfies AC-A1 and AC-A2. In `runLocatorStep` (`qa-run.mjs:3540-3649`): (a) replace the bare `catch {}` around the click/fill (3589-3596) with `catch { const cause = await probeActionFailure(target, step.action, true); return notPerformable(actionFailureReason(n, step.action, cause), cause); }`; `attached` is `true` because the element was counted before the action, so a count of zero now is `detached`; do not name or read the caught error; (b) rewrite the zero-match block (3584-3588) so the order is: `if (expects)` first, returning `{ outcome: 'fail', reason_code: null, reason: absentElementReason(n), evidence: [], cause: 'absent' }` written with the literal `cause: 'absent'`, for BOTH the snapshot-grounded and the run-time-grounded (report-word, `atRunTime`) cases, because a positive assertion on an element the report names that the product does not show is a QA result; then `if (atRunTime)` keeps `needsHuman('STEP_UNGROUNDED', ...)` unchanged (a report-word click, fill or other non-assertion step that matches nothing is still a planning gap); then, for a snapshot-grounded non-assertion step, `return notPerformable(actionFailureReason(n, step.action, 'absent'), 'absent')`. The `count > 1` return (3580-3582), the scope and index guards (3546-3559) and the `expect_not_visible` path stay exactly as they are; (c) convert every other `blocked('STEP_NOT_PERFORMABLE', ...)` in the file to `notPerformable(<same fixed sentence>)` with the default cause `other`: in `runLocatorStep` the unreadable-visibility returns (3564, 3575), `expect_value` not declared / no readable value (3607, 3610), the unreadable `expect_state` (3639) and the final fallback (3648, which now uses `actionFailureReason(n, step.action, 'other')`), plus the sites outside it: `requireVisibleToPerson` (about 2107), the non-plain recipient (about 3419), the request log unavailable (about 3793) and the no-runtime-handler branch (about 3888). Their existing fixed sentences are kept (they name no cause beyond `other`); (d) the raw-selector click/fill catch in `DRIVERS.browser` (about 3744-3750): in the catch, `const cause = await probeActionFailure(page.locator(step.selector), step.action, false); verdict = notPerformable(actionFailureReason(n, step.action, cause), cause); break;`. After this task the literal `blocked('STEP_NOT_PERFORMABLE'` occurs only inside the `notPerformable` helper and the sentence `could not be found or acted on` no longer occurs. No reason, cause or log line may contain the caught error, a locator value, a fill value or page text.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3584-3596` (the block rewritten)
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  assert.equal((src.match(/blocked\(.STEP_NOT_PERFORMABLE./g) ?? []).length, 1, "only the notPerformable helper may write STEP_NOT_PERFORMABLE");
  assert.ok(!src.includes("could not be found or acted on"), "the old undifferentiated sentence is gone");
  assert.ok((src.match(/probeActionFailure\(/g) ?? []).length >= 3, "definition plus the two catch sites");
  const a = src.indexOf("async function runLocatorStep");
  const b = src.indexOf("DRIVERS.browser = async");
  assert.ok(a > 0 && b > a);
  const body = src.slice(a, b);
  assert.match(body, /cause: .absent./);
  const absentAt = body.indexOf("absentElementReason(");
  const runtimeAt = body.indexOf("matched no element at run time");
  assert.ok(absentAt > -1 && runtimeAt > -1 && absentAt < runtimeAt, "the absent fail must be decided before the run-time STEP_UNGROUNDED return");
  assert.ok(body.includes("matched ${count} elements at run time"), "the more-than-one-match return is kept");
  assert.ok(!/\} catch \{\s*return blocked/.test(body), "no bare catch returns a fixed block");
  '
  ```
  Exits non-zero on the current tree (thirteen direct `STEP_NOT_PERFORMABLE` sites, the old sentence present) and whenever a site is missed, the absent `fail` is decided after the run-time `STEP_UNGROUNDED` return, or the more-than-one-match rule is lost. The browser-level behaviour is checked by Level 3 and by the test pair's fixtures (`runLocatorStep` is module-private and is exercised end to end).

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — carry the cause on the failed step record and persist it

- **ACTION**: Satisfies AC-A1, AC-A2 and AC-A3. (1) Extend the `StepRecord` typedef (`qa-run.mjs:1086`) with optional `cause?: string`. (2) Add `export function attachStepCause(records, failedAt, cause)` beside `overlayGapRecords`: pure, returns a new array in which the record at index `failedAt` is `{ ...rec, cause }` when `cause` is in `STEP_FAILURE_CAUSES` and `failedAt` is a valid index, and returns the records unchanged (same array) otherwise; it never mutates its input. (3) In `DRIVERS.browser`, right after `recordedRaw` is computed (about 3907) and before the gap overlay, set `const causeRecorded = verdict !== null && isStr(verdict.cause) ? attachStepCause(recordedRaw, ranTo, verdict.cause) : recordedRaw;` and feed `causeRecorded` (not `recordedRaw`) to `overlayGapRecords`. The failed step is `ranTo` by the existing `recordSteps` contract; the case result already carries `cause` through the `{ ...verdict, evidence, steps }` spread at the end of the driver. (4) In the results writer (`entries.push`, `qa-run.mjs:5118-5134`) add `...(STEP_FAILURE_CAUSES.includes(result.cause) ? { cause: result.cause } : {})` beside the `pending_judgment` spread, so a cause outside the closed list is never written and a case without a cause keeps today's exact shape. Trace `result` from the browser driver to that line (the case evaluator and any wrapper such as the partial-remainder or judged-case settlement) and confirm `cause` survives every wrapper that returns a failed or blocked result; if a wrapper rebuilds the object, pass `cause` through it. Outcome, `reason_code` and counters are unchanged: an absent report-named element is `outcome: 'fail'` with `reason_code: null` and the final-capture evidence the driver already attaches; an action failure is `blocked` `STEP_NOT_PERFORMABLE`. The plan-defect documentation of `PLAN_ENTRY_INVALID` is the `RUNTIME_REASON_CATALOGUE` entry from Task 1; no other site changes for it.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1834-1855` (pure record helper) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:5118-5134` (conditional optional key in the writer)
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const recs = [1, 2, 3].map((i) => ({ index: i, action: "click", result: "passed", evidence: null }));
  const out = m.attachStepCause(recs, 1, "covered");
  assert.equal(out[1].cause, "covered");
  assert.equal(out[0].cause, undefined);
  assert.equal(out[2].cause, undefined);
  assert.equal(recs[1].cause, undefined, "input is not mutated");
  assert.equal(m.attachStepCause(recs, 1, "SECRET"), recs);
  assert.equal(m.attachStepCause(recs, -1, "covered"), recs);
  assert.equal(m.attachStepCause(recs, 9, "covered"), recs);
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const w = src.indexOf("entries.push({");
  assert.ok(w > -1);
  const block = src.slice(w, src.indexOf("});", w));
  assert.match(block, /STEP_FAILURE_CAUSES\.includes\(result\.cause\)/);
  assert.match(src, /attachStepCause\(recordedRaw, ranTo, verdict\.cause\)/);
  assert.match(src, /overlayGapRecords\(causeRecorded,/);
  '
  ```
  Exits non-zero on the current tree and whenever the cause is not attached to exactly the failed step, an out-of-list cause is accepted, the input is mutated, or the writer does not whitelist the cause.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --check
npm run validate
```
`npm run validate` runs the repo's 28 static consistency checks and must keep passing with the count unchanged (`REASON_CATALOGUE` and the command doc are untouched, so the `qa-run-contract` catalogue-to-doc agreement holds).

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
assert.deepEqual([...m.STEP_FAILURE_CAUSES], ["covered", "disabled", "not_editable", "absent", "detached", "other"]);
assert.equal(m.causeOf({ action: "click", count: 1, attached: true, enabled: true, covered: true }), "covered");
assert.equal(m.RUNTIME_REASON_CATALOGUE.STEP_NOT_PERFORMABLE.class, "gap");
assert.equal(m.RUNTIME_REASON_CATALOGUE.PLAN_ENTRY_INVALID.class, "plan-defect");
const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
assert.equal((src.match(/blocked\(.STEP_NOT_PERFORMABLE./g) ?? []).length, 1);
assert.ok(!src.includes("could not be found or acted on"));
assert.match(src, /STEP_FAILURE_CAUSES\.includes\(result\.cause\)/);
'
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs > "${TMPDIR:-/tmp}/relay-frozen-diff.txt"
if test -s "${TMPDIR:-/tmp}/relay-frozen-diff.txt"; then echo "FAIL: a frozen file changed"; exit 1; else echo "PASS: frozen files untouched"; fi
```

### Level 3 INTEGRATION

```
set -euo pipefail
npm run validate
node --input-type=module -e '
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
let pw = null;
try { pw = createRequire(import.meta.url)("playwright"); } catch { pw = null; }
let browser = null;
if (pw !== null) { try { browser = await pw.chromium.launch({ headless: true }); } catch { browser = null; } }
if (browser === null) { console.log("SKIP: a Playwright browser is not available here; the hit-test fixtures are left to the test pair (Levels 1 and 2 still gate the pure behaviour)"); process.exit(0); }
try {
  const page = await browser.newPage();
  await page.setContent(`<button id="cov" style="position:absolute;left:10px;top:10px;width:100px;height:40px">Covered</button><div style="position:absolute;left:0;top:0;width:300px;height:200px;background:#fff"></div><button id="dis" disabled style="position:absolute;left:10px;top:300px">Dis</button><input id="ro" readonly style="position:absolute;left:10px;top:350px"><button id="ok" style="position:absolute;left:10px;top:400px">Fine</button>`);
  assert.equal(await m.probeActionFailure(page.locator("#cov"), "click", true), "covered");
  assert.equal(await m.probeActionFailure(page.locator("#dis"), "click", true), "disabled");
  assert.equal(await m.probeActionFailure(page.locator("#ro"), "fill", true), "not_editable");
  assert.equal(await m.probeActionFailure(page.locator("#nope"), "click", false), "absent");
  assert.equal(await m.probeActionFailure(page.locator("#nope"), "click", true), "detached");
  assert.equal(await m.probeActionFailure(page.locator("#ok"), "click", true), "other");
} finally {
  await browser.close();
}
'
```
The corpus `node --test "scripts/validate/**/*.test.mjs"` is NOT a gate for this phase: tests that encode the old zero-match and fixed-sentence behaviour fail by design until the test pair updates them (see Notes). It is the gate of Phase 7 (AC-17). The `SKIP` branch exists only because a browser binary may be absent on the host; the real-page cause classification is then covered by the test pair's fixtures.

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** When a `click` or `fill` step fails on a target that is (a) covered by another element, (b) disabled, (c) a non-editable target of a `fill`, (d) absent, (e) detached during the action, the case is `blocked` `STEP_NOT_PERFORMABLE` with a `cause` of `covered`, `disabled`, `not_editable`, `absent` or `detached` respectively (`other` for anything else); the reason sentence names the cause from the fixed list; the cause is recorded on the case and on the failed step; and no Playwright error text or page text appears in `results.json`.
- **AC-A2 (PRD AC-5):** An `expect_*` step whose locator is grounded only by the case's manual steps and matches no element after the wait is `failed` with cause `absent` and the case ends `fail` with evidence; a locator that matches more than one element still ends `needs-human` `STEP_UNGROUNDED`.
- **AC-A3 (PRD AC-14):** The run-time catalogue gives `STEP_NOT_PERFORMABLE` the class `gap` with the closed cause list, and documents `PLAN_ENTRY_INVALID` as a plan defect rather than a decline.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An absent-element `fail` is a timing flake, not a defect | L | A wrong `fail` (never a false pass) | Same 10-second attach wait as today before counting; the final capture is attached as evidence |
| The hit-test mislabels a cause (an ancestor overlay, a pointer-events:none layer, shadow DOM) | M | A retry targets the wrong fix | An unknown hit (`null`) falls through to `other`; `covered` is claimed only on a positive hit by a non-descendant element; the Level 3 fixture covers the plain overlay |
| The pre-check calls scroll the page or change state | L | Side effect before the failure is reported | Only `count`, `isEnabled`, `isEditable` and a scroll-into-view plus `elementFromPoint` read; no action method and no `force` is ever called |
| A cause or step key breaks a consumer of `results.json` | L | A check or the report renderer rejects the file | The `qa-run-contract` results validator checks values of known keys only; the writer adds `cause` only when it is in the closed list; `npm run validate` runs at Levels 1 and 3 |
| `cause` is dropped by a wrapper between the driver and the writer | M | The cause never reaches `results.json` | Task 3 requires tracing `result` through every wrapper and passing `cause` through; the writer check in Task 3's script pins the whitelist |
| Browser behaviour cannot be fully run by the Implementer's validation | M | Driver regression unseen until tests | Pure helpers carry the decisions and run at Levels 1-3; Level 3 runs a real page when a browser exists; the test pair authors the AC-4/AC-5 fixtures test-after |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Existing tests likely to go stale by design (for the test pair, `EXISTING_TEST_UPDATED`):** tests that expect a report-word locator matching nothing to end `needs-human` `STEP_UNGROUNDED` for a positive assertion (now `fail`, cause `absent`; search `scripts/validate/checks/qa-run-scoped-locators.test.mjs`, `qa-run-ui-grounding.test.mjs`, `qa-run-input-value.test.mjs`, `qa-run-absence-state.test.mjs` around the run-time zero-match cases, e.g. `qa-run-input-value.test.mjs:469`); tests asserting the fixed `STEP_NOT_PERFORMABLE` sentence `the <action> target could not be found or acted on`, if any (a first search found none, to be re-checked); tests that deep-equal a whole `results.json` entry or step record for a failed/blocked case and so see the new optional `cause` key. `qa-run-absence-state.test.mjs:641-657` (`/^step 3:/` on STEP_NOT_PERFORMABLE reasons) should keep passing. `qa-run-classification.test.mjs:116-118` and `qa-run-impossible-catalogue.test.mjs` pin the key set of `REASON_CATALOGUE`, which this phase leaves unchanged. The Implementer must not edit any of them; a test that contradicts AC-4/AC-5/AC-14 is a dispute for the arbitration path, not an edit.
- **Catalogue placement (AC-14):** `STEP_NOT_PERFORMABLE` and `PLAN_ENTRY_INVALID` are run-time codes outside `REASON_CATALOGUE`. Adding either to `REASON_CATALOGUE` now would make `qa-run-contract` (lines 771-803) demand a row in `relay-qa-run.md`'s code table, which is Phase 7's file, and would extend the pinned key-set tests. `RUNTIME_REASON_CATALOGUE` carries the class and cause list now; Phase 7 documents it in the command doc table and decides whether to merge it into `REASON_CATALOGUE` (extending the contract check only then).
- The zero-match change is deliberately narrow: only positive assertions (`POSITIVE_ASSERTION_ACTIONS`) become `fail`/`absent`. A report-word `click`, `fill` or scope/index guard that matches nothing keeps `needs-human` `STEP_UNGROUNDED`, as the PRD limits AC-5 to `expect_*` steps.
- `covered` is what an overlay with no declared handler reports; handlers and dismissal are Phase 6.
- Run commands from the worktree root. Prefix git invocations with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` on this Windows host; write files with LF line endings.
- Research: `research-web` was not dispatched; Playwright's actionability and the lack of a per-reason error are already recorded in the PRD's Research Summary, so the cause is derived by the runner as the PRD decides.

*Generated: 2026-10-23*
*Approved: 2026-10-23*
*Implemented: 2026-10-23*
*Status: IMPLEMENTED*
