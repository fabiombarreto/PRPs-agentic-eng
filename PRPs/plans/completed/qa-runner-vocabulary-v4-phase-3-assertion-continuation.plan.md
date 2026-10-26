# Feature: Assertion continuation (Phase 3 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` browser-driver step loop, the per-step records in `results.json`); cross-cutting artifact (`results.json` is read by downstream stages and the dogfood kit); no new network- or store-touching site
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): item 2 (a known product defect is executed and ends `fail`)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` Decisions Log: "Assertion continuation: Narrow: assertions continue, interactions stop (operator, 2026-10-23)"; `uncertain` judgments never count as executed
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the new step reason is one fixed sentence, never a locator, a value or page text
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": tests that encode the first-failure stop are updated only by the test pair
- Applicable architectural rules:
  - Command versus script separation: the script executes, stops and records
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - R-X strict: the Implementer authors zero test files
  - PRP artifact paths: plan under `PRPs/plans/`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 3: "Assertion continuation" — Goal: a failed assertion keeps the rest of the case's evidence — Success signal: AC-6, AC-7 hold; an X-1-shaped case records all its assertions.

## Summary

The browser driver in `plugins/relay/scripts/qa-run.mjs` ends the case at the first failing step (`verdict = ...; break;` at every step branch), so a product defect found by one assertion erases the evidence of every later assertion (X-1 lost 2 steps this way). This phase makes a failed ASSERTION (a step whose result is `fail`) record the failure and let the loop go on: later `expect_*`, `query` and `judge` steps still run and are recorded, while the first INTERACTION after a failure (`goto`, `click`, `fill`, `request`, `read_message`, or any step carrying `effect`) and everything after it is recorded `not-run` with one fixed sentence and nothing touches the page. The first failure stays the case verdict (`fail`, with its reason and cause); later failed assertions are recorded on their own steps only. A `blocked` or `needs-human` result still stops the case. A `judge` after a failed assertion captures its evidence and is recorded `not-judged`, the same as a judge captured before the failure. Everything lives in `plugins/relay/scripts/qa-run.mjs`; the HTTP driver is unchanged (see NOT Building).

## User Story

As the AI session that runs `/relay-qa-run`
I want a failed assertion not to consume the rest of the case's assertions
So that a product defect keeps all the evidence around it, without the runner acting on a page left in an unknown state.

## Problem Statement

`DRIVERS.browser` stops the case at the first failing step, so one failed assertion records no later assertion; X-1's error page cost 2 steps that were objective and executable (PRD Problem Statement, KD-23 context). Continuing everything would act on an unknown page, so continuation is narrow: only assertions go on.

## Solution Statement

A pure, exported `continuesAfterFailure(step)` names the continuing set (`ASSERTION_CONTINUES_ACTIONS`: every `expect_*`, `query`, `judge`, and no step carrying `effect`). A driver-local `settle(res, i, step)` is the single place that assigns the case verdict: it records the step as ended, keeps the FIRST verdict, and returns true only for a `fail` result of a continuing step. A stop check placed after the existing truncation and gap guards ends the loop at the first non-continuing step once a failure exists, with `ranTo = i - 1` so that step and all later ones are `not-run`. Post-loop, `markFailedSteps` marks every ended step `failed`, the cause is attached per step, and `overlayStoppedRecords` writes the fixed reason on the stopped `not-run` records.

## Metadata

| Key | Value |
|-----|-------|
| Type | Enhancement |
| Complexity | Medium |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs` (browser-driver step loop, step-record helpers) |
| Dependencies | Phase 2 (`notPerformable`, `attachStepCause`, closed `cause`), already in the working tree; phase 1 (gaps, truncation) also in the working tree |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 78-79, 160, 182, 201-204 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 78-79, 160, 201-204, 242 | AC-6, AC-7, the continuation rule over action kinds, Phase 3 details, the "Narrow" decision |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3734-3812 | `DRIVERS.browser` setup, the loop head with the truncation and gap guards (3786-3788), the locator-step branch |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3813-3975 | every non-locator branch: each `verdict = ...; break;` site, including `judge` (3919-3954) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3976-4004 | post-loop: final capture, `recordSteps`, `attachStepCause`, `overlayGapRecords`, `gapVerdict`, the `not-judged` mapping, the return |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1898-1950 | `recordSteps`, the fixed gap sentences, `attachStepCause`, `overlayGapRecords`, `gapVerdict` (pure-helper precedent) |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1177-1191 | `BROWSER_ACTIONS`, `GAP_INTERACTION_ACTIONS`, `LOCATOR_ACTIONS`, `POSITIVE_ASSERTION_ACTIONS` (constant style) |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 131, 265-275 | `validateResults` accepts any object step record whose `result` is in the closed list and does not inspect `reason`, so a reason on a `not-run` record is valid |

## Patterns to Mirror

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1907-1919
/** The fixed sentence of a step that could not be grounded and so was not run. Never a locator, a value or page text. */
export const STEP_GAP_REASON = 'the step could not be grounded to exactly one element, so it was not run; a person owes it';
/** The fixed sentence of a step that follows an ungrounded interaction and so was not run. */
export const STEP_TRUNCATED_REASON = 'not run after an ungrounded interaction; a person owes it';
export function attachStepCause(records, failedAt, cause) {
  if (!STEP_FAILURE_CAUSES.includes(cause) || !Number.isInteger(failedAt) || failedAt < 0 || failedAt >= records.length) return records;
  return records.map((rec, j) => (j === failedAt ? { ...rec, cause } : rec));
}
```
Copied by Task 1: fixed exported sentence, and pure record helpers that return the same array when nothing applies and never mutate.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1930-1937
export function overlayGapRecords(records, gaps, truncateAt) {
  const gapAt = new Set(gaps.map((g) => g.at));
  return records.map((rec, j) => {
    if (gapAt.has(j)) return { ...rec, result: 'human', evidence: null, reason_code: 'STEP_UNGROUNDED', reason: STEP_GAP_REASON };
    if (truncateAt !== null && j > truncateAt) return { ...rec, result: 'human', evidence: null, reason_code: null, reason: STEP_TRUNCATED_REASON };
    return rec;
  });
}
```
Copied by Task 1 (`markFailedSteps`, `overlayStoppedRecords` have this shape) and Task 3 (call order).

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3782-3788
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
      // An ungrounded interaction ends the acting here; an ungrounded assertion is skipped without touching the page.
      if (i === truncateAt) break;
      if (assertionGapAt.has(i)) continue;
      executedTo = i;
```
Copied by Task 2: the stop check goes right after these two guards and before `executedTo = i`.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3843-3849
      } else if (step.action === 'expect_visible') {
        const located = page.locator(step.selector).first();
        const ok = await located.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
        if (!ok) {
          verdict = { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected element was not visible`, evidence: [] };
          break;
        }
```
Copied by Task 2: the `verdict = X; break;` shape that becomes `if (settle(X, i, step)) continue; break;` at every site.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3991-4000
    const recordedRaw = recordSteps(plan.steps, ranTo + 1, verdict !== null ? ranTo : -1, (j) => queryEvidence.get(j) ?? (j === executedTo ? evidence[0] ?? null : null));
    const reachedGaps = gapSteps.filter((g) => g.at <= ranTo);
    const causeRecorded = verdict !== null && isStr(verdict.cause) ? attachStepCause(recordedRaw, ranTo, verdict.cause) : recordedRaw;
    const recorded = overlayGapRecords(causeRecorded, reachedGaps, truncateAt !== null && ranTo >= truncateAt ? truncateAt : null);
    verdict = gapVerdict(verdict, gapSteps);
    const stepsOut = recorded.map((rec, j) => (judgeKinds.has(j)
      ? { ...rec, result: verdict === null ? PENDING_JUDGMENT : 'not-judged', kind: judgeKinds.get(j), scope_evidence: judgeScope.get(j) ?? null }
      : rec));
```
Copied by Task 3: the block whose single-failed-step assumption is replaced; the `not-judged` mapping stays exactly as is.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | continuing-action set and classifier, fixed reason, pure record helpers, driver `settle` and stop check, post-loop record assembly (AC-6, AC-7) |

## NOT Building (Scope Limits)

- Any edit to a test file. Tests that encode the first-failure stop go stale by design (see Notes) and are updated by the test pair.
- The HTTP driver (`DRIVERS.http`, `qa-run.mjs:3527-3606`): it keeps its stop at the first failure. Every HTTP assertion is inline on a `request` step (an interaction), and its only other step, `query`, is reachable only when every earlier step passed, so no assertion can follow a failed assertion there. Left as is.
- `plugins/relay/commands/relay-qa-run.md` (the continuation rule text), the `qa-run-contract` check, `documentation/`, the version bump and changelog: Phase 7 (AC-15, AC-17, AC-18).
- A change to `recordSteps`, `overlayGapRecords`, `gapVerdict` or `attachStepCause` signatures or behaviour, to the counting rules of `summarizeNeedsHuman`, or to the closed list of step results (no new `result` value; the stopped steps are `not-run`).
- A change to the case outcome rule: the first failing verdict stays the case verdict; a later failed assertion never changes it, and a later `blocked` or `needs-human` result ends the loop without replacing it.
- Overlay handlers (Phase 6), `force: true` or any forced action.
- Writing a locator, a value or page text into any reason.
- The frozen files: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`.
- A new `npm run validate` check (the count stays 28).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — continuing set, classifier, fixed reason, pure record helpers

- **ACTION**: Satisfies AC-A1, AC-A2 and AC-A3. Beside `STEP_TRUNCATED_REASON` and `attachStepCause` (`qa-run.mjs:1907-1919`) add, all exported: (1) `export const ASSERTION_CONTINUES_ACTIONS = Object.freeze(['expect_visible', 'expect_text', 'expect_url', 'expect_value', 'expect_not_visible', 'expect_state', 'expect_requests', 'query', 'judge'])`; (2) `export function continuesAfterFailure(step)`: pure, returns true only when `isObj(step)`, `ASSERTION_CONTINUES_ACTIONS.includes(step.action)` and `step.effect === undefined`; every other action (`goto`, `click`, `fill`, `request`, `read_message`, an unknown action) and any step carrying an `effect` is an interaction and returns false; (3) `export const STEP_NOT_RUN_AFTER_FAILURE_REASON = 'not run after a failed assertion; an interaction after a failure would act on a page in an unknown state'` (a fixed sentence, no step data); (4) `export function markFailedSteps(records, failedIdx)`: pure, returns a new array in which every record whose index is in `failedIdx` and whose `result` is `'passed'` becomes `{ ...rec, result: 'failed' }`; non-integer or out-of-range indexes are ignored; returns the same array when nothing applies; never mutates; (5) `export function overlayStoppedRecords(records, stoppedAt)`: pure, for every `j >= stoppedAt` whose `result` is `'not-run'` returns `{ ...rec, reason_code: null, reason: STEP_NOT_RUN_AFTER_FAILURE_REASON }` (the result stays `not-run`), leaves every other record unchanged, and returns the same array when `stoppedAt` is not a non-negative integer. Do not change `recordSteps`, `overlayGapRecords`, `gapVerdict`, `attachStepCause`, `BROWSER_ACTIONS` or any catalogue.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1907-1919` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1930-1937`
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.deepEqual([...m.ASSERTION_CONTINUES_ACTIONS].sort(), ["expect_not_visible", "expect_requests", "expect_state", "expect_text", "expect_url", "expect_value", "expect_visible", "judge", "query"]);
  assert.ok(Object.isFrozen(m.ASSERTION_CONTINUES_ACTIONS));
  for (const a of m.ASSERTION_CONTINUES_ACTIONS) assert.equal(m.continuesAfterFailure({ action: a }), true, a);
  for (const a of ["goto", "click", "fill", "request", "read_message", "bogus"]) assert.equal(m.continuesAfterFailure({ action: a }), false, a);
  assert.equal(m.continuesAfterFailure({ action: "expect_visible", effect: "write" }), false);
  assert.equal(m.continuesAfterFailure(null), false);
  assert.equal(m.continuesAfterFailure("expect_visible"), false);
  assert.match(m.STEP_NOT_RUN_AFTER_FAILURE_REASON, /^not run after a failed assertion; [a-z ]+$/);
  const recs = [0, 1, 2, 3].map((i) => ({ index: i + 1, action: "x", result: i < 3 ? "passed" : "not-run", evidence: null }));
  const failed = m.markFailedSteps(recs, [1, 2, 9, -1, 1.5]);
  assert.deepEqual(failed.map((r) => r.result), ["passed", "failed", "failed", "not-run"]);
  assert.equal(recs[1].result, "passed", "input is not mutated");
  assert.equal(m.markFailedSteps(recs, []), recs);
  assert.equal(m.markFailedSteps(recs, [3]), recs, "a not-run record is never marked failed");
  const stopped = m.overlayStoppedRecords(recs, 3);
  assert.equal(stopped[3].result, "not-run");
  assert.equal(stopped[3].reason, m.STEP_NOT_RUN_AFTER_FAILURE_REASON);
  assert.equal(stopped[3].reason_code, null);
  assert.equal(stopped[0], recs[0]);
  assert.equal(recs[3].reason, undefined, "input is not mutated");
  assert.equal(m.overlayStoppedRecords(recs, null), recs);
  assert.equal(m.overlayStoppedRecords(recs, -1), recs);
  const human = [{ index: 1, action: "x", result: "human", evidence: null }];
  assert.equal(m.overlayStoppedRecords(human, 0)[0], human[0], "only not-run records are rewritten");
  '
  ```
  Exits non-zero on the current tree (none of these exports exist) and whenever a verb is misclassified, a helper mutates its input, or a non-`not-run` record is rewritten.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — `settle` and the stop check in the browser step loop

- **ACTION**: Satisfies AC-A1, AC-A2 and AC-A3. In `DRIVERS.browser` (`qa-run.mjs:3734`), before `for (const [i, step] of plan.steps.entries())` (3782): (a) declare `/** @type {number[]} */ const failedIdx = [];`, `/** @type {Map<number, string>} */ const causeAt = new Map();` and `let stoppedAt = null;`; (b) declare the driver-local `const settle = (/** @type {CaseResult} */ res, /** @type {number} */ at, /** @type {any} */ stepAt) => { failedIdx.push(at); if (isStr(res.cause)) causeAt.set(at, res.cause); if (verdict === null) verdict = res; return res.outcome === 'fail' && continuesAfterFailure(stepAt); };` — it is the ONLY place in the loop that assigns `verdict`, the first verdict is kept, and only a `fail` result of a continuing step returns true. A later `blocked` or `needs-human` result is recorded on its own step (and its cause on that step) but never replaces the first verdict. (c) Rewrite EVERY `verdict = <result>; break;` pair inside the loop, in all branches (the locator-step result at 3807-3810; `goto` 3815-3824; selector `click`/`fill` 3830-3834; `query` 3837-3841; `expect_visible` 3846-3854; `expect_text` 3858-3866; `expect_url` 3871-3874; `expect_requests` 3876-3917; `judge` 3926-3952; `read_message` 3957-3960; the no-handler fallback 3972-3973), to `if (settle(<result>, i, step)) continue; break;` keeping each result expression and each fixed sentence exactly as it is. For the sites that cannot continue (blocked, needs-human, every interaction) `settle` returns false and the loop breaks exactly as today. (d) Immediately after `if (assertionGapAt.has(i)) continue;` and before `executedTo = i;` (3787-3788) add the stop check: `if (verdict !== null && !continuesAfterFailure(step)) { stoppedAt = i; ranTo = i - 1; break; }` with a comment saying that once an assertion has failed, an interaction would act on a page left in an unknown state. The truncation guard (`i === truncateAt`) and the assertion-gap guard stay ABOVE it, unchanged: an ungrounded interaction after a failure keeps its phase-1 records (`human` gap plus truncation). A `judge` step reached after a failed assertion is NOT stopped: it captures as today, and the existing post-loop mapping records it `not-judged` because a verdict exists (an `uncertain`/captured judgment never counts as executed). Do not touch `DRIVERS.http`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3782-3788` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3843-3849`
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const a = src.indexOf("DRIVERS.browser = async");
  const loop = src.indexOf("for (const [i, step] of plan.steps.entries())", a);
  const end = src.indexOf("// Evidence after the last step", loop);
  assert.ok(a > 0 && loop > a && end > loop);
  const head = src.slice(a, loop);
  const body = src.slice(loop, end);
  const settleAt = head.indexOf("const settle = ");
  assert.ok(settleAt > -1, "settle must be declared before the loop");
  const settleBody = head.slice(settleAt);
  assert.match(settleBody, /outcome === .fail./);
  assert.match(settleBody, /continuesAfterFailure\(/);
  assert.match(settleBody, /if \(verdict === null\) verdict = res/);
  assert.ok(!/\bverdict = [^=]/.test(body), "inside the loop only settle may assign the verdict");
  assert.ok(/if \(settle\(/.test(body), "the loop settles its results");
  const gap = body.indexOf("if (assertionGapAt.has(i)) continue;");
  const trunc = body.indexOf("if (i === truncateAt) break;");
  const stop = body.indexOf("!continuesAfterFailure(step)");
  const exec = body.indexOf("executedTo = i;");
  assert.ok(trunc > -1 && gap > trunc && stop > gap && exec > stop, "the stop check sits after the truncation and gap guards and before executedTo");
  assert.match(body, /stoppedAt = i;/);
  assert.match(body, /ranTo = i - 1;/);
  assert.ok(!/continuesAfterFailure/.test(src.slice(src.indexOf("DRIVERS.http = async"), a)), "the HTTP driver is unchanged");
  '
  ```
  Exits non-zero on the current tree (no `settle`, raw `verdict =` assignments throughout the loop) and whenever a raw assignment is left in the loop, the stop check is misplaced, or `settle` loses first-verdict-wins. The runtime behaviour is checked by Level 3.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — assemble the step records for several ended steps and a stopped tail

- **ACTION**: Satisfies AC-A1, AC-A2 and AC-A3. Replace the single-failed-step assumption in the post-loop block (`qa-run.mjs:3991-3996`): (a) `const recordedRaw = markFailedSteps(recordSteps(plan.steps, ranTo + 1, -1, <the same evidenceFor callback>), failedIdx);` — `recordSteps` is called with `failedAt = -1` and every step that ended (the first failure, later failed assertions, and a final blocked or needs-human step) is marked through `failedIdx`; with a single failure at `ranTo` this is byte-identical to today's records; (b) attach causes per step: `const causeRecorded = [...causeAt].reduce((recs, [at, cause]) => attachStepCause(recs, at, cause), recordedRaw);` (replacing the `verdict.cause` / `ranTo` line); (c) keep `reachedGaps`, `overlayGapRecords(causeRecorded, ...)` and `gapVerdict` exactly as they are, then wrap the overlay result: `const recorded = overlayStoppedRecords(overlayGapRecords(causeRecorded, reachedGaps, <same truncate argument>), stoppedAt);`; (d) leave the `stepsOut` mapping (the `PENDING_JUDGMENT` / `'not-judged'` rule), `allEvidence` and the three returns untouched. Because the loop sets `ranTo = i - 1` at a stop, `recordSteps` already leaves the stopped step and every later step `not-run`, `reachedGaps` excludes gaps at or after it, and the case verdict is the first failure (`outcome: 'fail'`, `reason_code: null`) with its own reason and cause, unchanged. Do not change `recordSteps`, the results writer, or any counter.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3991-4000`
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const a = src.indexOf("// Evidence after the last step");
  const b = src.indexOf("} finally {", a);
  assert.ok(a > 0 && b > a);
  const post = src.slice(a, b);
  assert.match(post, /markFailedSteps\(recordSteps\(plan\.steps, ranTo \+ 1, -1,/);
  assert.ok(!post.includes("verdict !== null ? ranTo : -1"), "the single failed step assumption is gone");
  assert.match(post, /causeAt/);
  assert.ok(!post.includes("attachStepCause(recordedRaw, ranTo"), "the cause is attached per step");
  const gapAt = post.indexOf("overlayGapRecords(");
  const stopAt = post.indexOf("overlayStoppedRecords(");
  assert.ok(gapAt > -1 && stopAt > -1 && stopAt < gapAt, "the stopped overlay wraps the gap overlay");
  assert.match(post, /verdict === null \? PENDING_JUDGMENT : .not-judged./);
  '
  ```
  Exits non-zero on the current tree and whenever the old single-failure assumption survives, the cause is still tied to `ranTo`, the stopped overlay is not applied after the gap overlay, or the `not-judged` mapping is lost.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --check
npm run validate
```
`npm run validate` runs the repo's 28 static consistency checks and must keep passing with the count unchanged (`REASON_CATALOGUE` and the command doc are untouched).

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
assert.equal(m.continuesAfterFailure({ action: "judge" }), true);
assert.equal(m.continuesAfterFailure({ action: "click" }), false);
assert.equal(m.continuesAfterFailure({ action: "expect_visible", effect: "write" }), false);
const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const a = src.indexOf("DRIVERS.browser = async");
const loop = src.indexOf("for (const [i, step] of plan.steps.entries())", a);
const end = src.indexOf("// Evidence after the last step", loop);
assert.ok(!/\bverdict = [^=]/.test(src.slice(loop, end)), "only settle assigns the verdict inside the loop");
assert.match(src.slice(end, src.indexOf("} finally {", end)), /overlayStoppedRecords\(/);
'
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs > "${TMPDIR:-/tmp}/relay-frozen-diff.txt"
if test -s "${TMPDIR:-/tmp}/relay-frozen-diff.txt"; then echo "FAIL: a frozen file changed"; exit 1; else echo "PASS: frozen files untouched"; fi
```

### Level 3 INTEGRATION

```
set -euo pipefail
npm run validate
node --input-type=module -e '
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, unlinkSync, rmdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
const { validateResults } = await import("./scripts/validate/checks/qa-run-contract.mjs");
const RUN = "PRPs/reports/f/qa-run/r1";
const hits = {};
const PAGE = `<!doctype html><html><body><h1>Panel</h1><button id="save" onclick="fetch(&quot;/saved&quot;)">Save</button></body></html>`;
const server = createServer((req, res) => {
  const p = new URL(String(req.url), "http://x").pathname;
  hits[p] = (hits[p] ?? 0) + 1;
  res.writeHead(200, { "content-type": "text/html" });
  res.end(PAGE);
});
await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
const base = `http://127.0.0.1:${server.address().port}`;
const root = mkdtempSync(join(tmpdir(), "relay-p3-"));
const nm = join(root, "node_modules");
symlinkSync(resolve("node_modules"), nm, "junction");
let skip = false;
try {
  mkdirSync(join(root, ...RUN.split("/")), { recursive: true });
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  const block = (i) => [`### Case ${i}`, `**Title:** Case ${i} title`, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", "1. Open the page and see the Panel heading", ""].join("\n");
  writeFileSync(join(root, "PRPs", "reports", "f", "qa-report.md"), `# QA Report\n\n## Test Cases\n\n${block(1)}\n${block(2)}\n## Notes\n\nnone\n`);
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: {} } }));
  writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), [
    `import { writeFileSync, mkdirSync } from "node:fs";`,
    `import { join } from "node:path";`,
    `const root = process.argv[process.argv.indexOf("--root") + 1];`,
    `mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });`,
    `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "tok-p3-fixture", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
  ].join("\n"));
  const steps1 = [
    { action: "goto", path: "/" },
    { action: "expect_visible", selector: "#absent" },
    { action: "expect_text", selector: "h1", contains: "Panel" },
    { action: "expect_text", selector: "h1", contains: "Nope" },
    { action: "click", selector: "#save" },
    { action: "expect_visible", selector: "h1" },
  ];
  const steps2 = [
    { action: "goto", path: "/" },
    { action: "expect_visible", selector: "#absent" },
    { action: "expect_visible", selector: "h1" },
    { action: "expect_text", selector: "h1", contains: "Panel" },
  ];
  writeFileSync(join(root, ...RUN.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: [steps1, steps2].map((steps, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: "browser", role: "admin", state: "none", steps })) }));
  const code = await new Promise((res, rej) => {
    const c = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", "f", "--run-dir", RUN], { cwd: root, stdio: "ignore", windowsHide: true });
    const t = setTimeout(() => c.kill(), 150000);
    c.on("error", rej);
    c.on("close", (x) => { clearTimeout(t); res(x); });
  });
  await new Promise((r) => setTimeout(r, 500));
  const file = join(root, ...RUN.split("/"), "results.json");
  assert.ok(existsSync(file), `no results.json, runner exit ${code}`);
  const results = JSON.parse(readFileSync(file, "utf8"));
  const [c1, c2] = results.cases;
  if (c1.reason_code === "FAILED_BROWSER_UNAVAILABLE") {
    skip = true;
  } else {
    // AC-7: goto, expect A (fails), expect B (passes), expect C (fails), click, expect E.
    assert.equal(c1.outcome, "fail", JSON.stringify([c1.outcome, c1.reason_code, c1.reason]));
    assert.match(c1.reason, /^step 2:/, "the case verdict is the first failure");
    assert.deepEqual(c1.steps.map((s) => s.result), ["passed", "failed", "passed", "failed", "not-run", "not-run"]);
    assert.equal(c1.steps[4].reason, m.STEP_NOT_RUN_AFTER_FAILURE_REASON);
    assert.equal(c1.steps[5].reason, m.STEP_NOT_RUN_AFTER_FAILURE_REASON);
    assert.equal(hits["/saved"] ?? 0, 0, "the click after the failed assertion must not reach the page");
    // AC-6: goto, expect A (fails), expect B, expect C: B and C still run and are recorded.
    assert.equal(c2.outcome, "fail");
    assert.deepEqual(c2.steps.map((s) => s.result), ["passed", "failed", "passed", "passed"]);
    assert.deepEqual(validateResults(results), []);
  }
} finally {
  try { unlinkSync(nm); } catch { try { rmdirSync(nm); } catch { } }
  if (!existsSync(nm)) rmSync(root, { recursive: true, force: true });
  server.closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
}
if (skip) console.log("SKIP-BROWSER-UNAVAILABLE: the runner could not launch Chromium here; the real-page continuation fixtures are left to the test pair (Levels 1 and 2 still gate the structure)");
'
```
The corpus `node --test "scripts/validate/**/*.test.mjs"` is NOT a gate for this phase: tests that encode the first-failure stop fail by design until the test pair updates them (see Notes). It is the gate of Phase 7 (AC-17). A run that prints `SKIP-BROWSER-UNAVAILABLE` did not exercise the real page; a run that ends silently after the assertions did. The fixture is created in the OS temp directory, the `node_modules` junction is unlinked before the directory is removed so the repository `node_modules` is never reached, and it writes no file in the repository.

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given an entry `goto, expect_visible A (fails), expect_visible B, expect_value C`, when it runs, then B and C still run and are recorded (each `passed` or `failed` on its own result), the first failure is the case's reason, and the case ends `fail`.
- **AC-A2 (PRD AC-7):** Given an entry `goto, expect_visible A (fails), click D, expect_visible E`, when it runs, then `click D` and E are recorded `not-run` with one fixed reason sentence, the page is not touched after the failure, and the case ends `fail`.
- **AC-A3 (PRD AC-6):** The continuing set is exactly every `expect_*` step, `query` and `judge` without an `effect`; `goto`, `click`, `fill`, `request`, `read_message` and any step carrying `effect` stop the case after a failure; a `blocked` or `needs-human` result stops the case and never replaces the first failure; a `judge` after a failed assertion captures its evidence and is recorded `not-judged`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Continued assertions after a failure cascade into noise | M | More failed step records on one defect | Only assertions continue; the first interaction after a failure stops the case; the case outcome and reason stay the first failure's |
| A site that assigns `verdict` is missed and still stops the case | M | A failed assertion silently consumes the rest | Task 2's check forbids any raw `verdict =` assignment inside the loop slice, so every site must go through `settle` |
| The step-counter recompute in `validateResults` (`qa-run-contract.mjs:247-253`) disagrees with several failed steps | L | A valid results file reads as invalid | Level 3 runs `validateResults` on a real run with two failed steps; a disagreement is reported to the orchestrator, not fixed by editing a check file or a test in this phase |
| A `blocked` step after a failed assertion hides that block behind the first `fail` | L | The block is visible only on its step record | Its step is recorded `failed` with its own `cause`; the case outcome stays `fail`, which is the stronger statement |
| A continued judge capture is mistaken for an executed judgment | L | A false pass | It is recorded `not-judged` (the existing post-loop rule for any captured judge when a verdict exists) and `summarizeNeedsHuman` counts only `passed` and `failed` steps as executed |
| Browser behaviour cannot be fully run by the Implementer's validation | M | Driver regression unseen until tests | Task 1 pure helpers and the Task 2/3 source checks gate structure; Level 3 runs a real page when Chromium launches and prints a distinct SKIP line otherwise |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Decisions stated here.** (1) `judge` after a failed assertion captures and is recorded `not-judged` (the PRD lists `judge` among the continuing steps; the evidence a person would look at is kept, the page is untouched, and an uncertain or unjudged capture never counts as executed). (2) `read_message` is treated as an interaction, because the PRD's continuing list is `expect_*`, `query`, `judge` only and it reads a channel the case's earlier steps may have provoked. (3) An ungrounded interaction (phase 1 `truncate_at`) reached after a failure keeps its phase-1 records (`human` gap plus truncation), because the truncation guard sits above the stop check. (4) The HTTP driver is unchanged (see NOT Building).
- **Existing tests likely to go stale by design (for the test pair, `EXISTING_TEST_UPDATED`; the Implementer must not edit any of them):** `scripts/validate/checks/qa-run-model-judgment.test.mjs:625-632` (a judge step after a failed `expect_*` step is asserted `not-run`; it now captures and is `not-judged`, and the neighbouring counts at 632 change); `scripts/validate/checks/qa-run-local-channel-sources.test.mjs:533` (`['passed', 'failed', 'not-run']` goes stale only if the third step is an assertion); any test that deep-equals the step results of a case with a failed assertion followed by another `expect_*` step (candidates to re-check: `qa-run-absence-state.test.mjs`, `qa-run-scoped-locators.test.mjs`, `qa-run-input-value.test.mjs`, `qa-run-failure-causes.test.mjs`, the `qa-run-grounding-prefix-*.test.mjs` files). Expected to keep passing: `qa-run-ui-grounding.test.mjs:686-706` (the failing step there is an interaction, which stops as before), the pure `summarizeNeedsHuman` tests in `qa-run-classification.test.mjs` and `qa-run-impossible-catalogue.test.mjs`. A test that contradicts AC-6/AC-7 is a dispute for the arbitration path, not an edit.
- The case-level `cause` and `reason` still come from the first failing verdict; per-step `cause` is attached to each ended step through `causeAt`.
- Run commands from the worktree root. Prefix git invocations with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` on this Windows host; write files with LF line endings.
- Research: `research-codebase` was dispatched (twice, narrowly) for the loop, record and test-fixture anchors; `research-web` was not dispatched, because Playwright's actionability is already recorded in the PRD's Research Summary and this phase is a pure runner-loop rule.

*Generated: 2026-10-23*
*Approved: 2026-10-23*
*Implemented: 2026-10-24*
*Status: IMPLEMENTED*
