# Feature: Step-level validation (Phase 1 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` plan validation, the per-step record in `results.json`, the `STEP_UNGROUNDED` catalogue code); cross-cutting artifact (`results.json` step records downstream stages and the dogfood kit read); no new network- or store-touching site
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): report-word locators resolve at run time; environment signals stay outside the reason-code catalogue
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` Decisions Log: grounding refusal is per step, schema errors stay per entry; an ungrounded interaction truncates the rest of the case
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text or locator values
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a step gap reason is a fixed sentence, never a locator value or page text
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": existing tests that go stale by design are updated only by the test pair
- Applicable architectural rules:
  - Command versus script separation: the script validates, executes and records
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - R-X strict: the Implementer authors zero test files
  - PRP artifact paths: plan under `PRPs/plans/`
- Result: PROCEED
```

## Source

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 1: "Step-level validation" — Goal: one bad step never forfeits the valid part of an entry — Success signal: AC-1..AC-3 hold on fixtures; a case-20-shaped entry with one mis-grounded search step runs its *Hoje* half.

## Summary

Today `groundLocators` (`plugins/relay/scripts/qa-run.mjs`) returns the first grounding refusal and the case evaluator turns it into `PLAN_ENTRY_INVALID` for the whole entry, so one mis-grounded step forfeits every step of the case (case 20 lost 21 steps). This phase makes grounding per step: an ungrounded assertion (`expect_*` or a scoped `judge`) becomes a step gap that is skipped and recorded `human` with `STEP_UNGROUNDED` and a fixed reason; an ungrounded interaction (`click`, `fill`) truncates the case at that step, which and every later step are recorded `human`. The case ends `fail` if an executed step failed, otherwise `needs-human` `STEP_UNGROUNDED`. Schema validation (`validateSteps`) is untouched and still refuses the whole entry before anything is seeded, authenticated or requested. All changes live in `qa-run.mjs`; the command doc is Phase 7's.

## User Story

As the AI session that runs `/relay-qa-run`
I want one ungrounded step to cost only itself (or, for an interaction, the rest of its case)
So that the valid steps of an entry still run and the human gate receives only what could not be grounded.

## Problem Statement

One mis-grounded step refused case 20's whole entry (21 steps) in the phase-9 dogfood of `qa-runner-ai-executable-steps`. `plugins/relay/scripts/qa-run.mjs:2299-2348` returns the first grounding refusal as `PLAN_ENTRY_INVALID` for the entire entry, and the evaluator at `qa-run.mjs:4805-4809` ends the case before the browser starts. Every such step lands on the operator at the human gate.

## Solution Statement

Grounding marks each refused step instead of returning. `groundLocators` returns `{ gaps, truncateAt, runtime }`; the evaluator no longer returns on grounding, it hands the gaps to the browser driver as plan keys. The driver skips assertion gaps, stops acting at a truncating interaction gap, and the case result and per-step records are derived by two small pure exported helpers. Schema validation is unchanged, so AC-3 holds by construction.

## Metadata

| Key | Value |
|-----|-------|
| Type | Enhancement |
| Complexity | Medium |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs` (grounding, step records, browser driver, case evaluator) |
| Dependencies | none (row 1 has no `Depends`) |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 180, 191-194 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 73-75, 156-162, 191-194 | AC-1..AC-3, the step-level validation architecture note, Phase 1 details |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2243-2364 | `precheckGroundedSteps` and `groundLocators`: every `refuse(...)` site becomes a gap |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4755-4886 | the case evaluator: `validateSteps` at 4765 (unchanged), the grounding branch at 4805-4809, the driver call at 4880 |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3581-3647, 3815-3837 | the browser driver loop, `ranTo`, `recordSteps` use and the judge-record overlay |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1760-1813, 1824-1831 | `validateSteps` (anchor rules the gap pass must not weaken) and `recordSteps` |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 2460-2464, 2508-2521 | `STEP_UNGROUNDED` catalogue entry; `summarizeNeedsHuman` already counts `human` steps as owed |
| P1 | `plugins/relay/commands/relay-qa-run.md` | 400-408, 470-483 | the vocabulary text that describes today's refusal; READ ONLY here, rewritten in Phase 7 |

## Patterns to Mirror

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:2273-2274
  /** @param {string} reason */
  const refuse = (reason) => ({ refusal: { code: 'PLAN_ENTRY_INVALID', reason }, runtime });
```
Copied by Task 1: the closure that every grounding site calls today; Task 1 replaces it with a gap-recording closure used at the same sites.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:2460-2464
  STEP_UNGROUNDED: Object.freeze({
    disposition: 'needs-human',
    class: 'gap',
    reason: 'a step of the case could not be grounded to exactly one element; the manual steps are reproduced verbatim',
  }),
```
Copied by Task 2: fixed sentences are frozen constants, never planner text, never a locator value.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3829-3833
    const recorded = recordSteps(plan.steps, ranTo + 1, verdict !== null ? ranTo : -1, (j) => queryEvidence.get(j) ?? (j === ranTo ? evidence[0] ?? null : null));
    // A captured judge step waits for a verdict only when no other step ended the case; otherwise it is moot.
    const stepsOut = recorded.map((rec, j) => (judgeKinds.has(j)
      ? { ...rec, result: verdict === null ? PENDING_JUDGMENT : 'not-judged', kind: judgeKinds.get(j), scope_evidence: judgeScope.get(j) ?? null }
      : rec));
```
Copied by Task 3: per-step record overlay precedent (a record is rewritten after `recordSteps`), where the gap overlay slots in.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:4805-4809
  if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && (LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null || s.action === 'judge' && s.within !== undefined))) {
    const grounded = groundLocators(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role, p.chosen_inputs);
    if (grounded.refusal !== null) return out(needsHuman(grounded.refusal.code, grounded.refusal.reason));
    runtimeSteps = grounded.runtime;
  }
```
Copied by Task 3: the single production call site whose refusal branch is replaced by gap hand-off.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | per-step grounding, fixed gap sentences, pure result helpers, driver loop and evaluator wiring (AC-1, AC-2, AC-3) |

## NOT Building (Scope Limits)

- Any edit to a test file. Tests that encode the old whole-entry refusal go stale by design (see Notes) and are updated by the test pair.
- `plugins/relay/commands/relay-qa-run.md` and `documentation/`: the vocabulary/rule text and release mechanics belong to Phase 7 (AC-15, AC-18). The doc describes the old refusal until then.
- Closed failure causes, absent-element `fail`, and the run-time `STEP_UNGROUNDED` sites in `runLocatorStep` (`qa-run.mjs:3470-3518`): Phase 2.
- Assertion continuation after a failed assertion: Phase 3. In this phase the driver still stops at the first failed or non-passing step.
- Any change to `validateSteps`/`stepRules` (schema errors keep refusing the entry), to the `ground` command, or to `ground --prefix`.
- The frozen files: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`.
- A new `npm run validate` check (the count stays 28), the version bump and the changelog.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — per-step grounding in `groundLocators`

- **ACTION**: Satisfies AC-A1 and AC-A2. Change `groundLocators` (`qa-run.mjs:2262-2364`) so that no grounding miss returns a whole-entry refusal. Replace the `refuse` closure with a recorder: for the step at index `i`, a miss pushes `{ at: i, kind }` onto a `gaps` array, where `kind` is `'interaction'` when `step.action` is `click` or `fill` (define a frozen constant `GAP_INTERACTION_ACTIONS = ['click', 'fill']` beside `LOCATOR_ACTIONS`) and `'assertion'` otherwise (every `expect_*` step and a scoped `judge`). A gap carries no reason text, so no locator value can leak. Apply this at every existing refusal site: the judge scope (2289), the scoped-locator words (2325), no snapshot / not a snapshot entry / `matches` other than 1 (2333-2336), the `expect_text contains` and `expect_value` report-literal checks (2351, 2359) and the grounded-prefix fill value (2345, which makes the dependent current step the gap). After a step becomes an `'interaction'` gap, stop walking the steps and set `truncateAt = i`; the steps after it need no grounding because the driver will not run them. An `'assertion'` gap does not stop the walk and does not add the step to `runtime`. Anchor safety: `validateSteps` (1778-1798) lets `expect_not_visible` and `expect_requests` with `count: 0` rely on an earlier positive assertion on the same route since the last `goto`; track that anchor inside `groundLocators` the same way (`goto` resets it, a non-gap `POSITIVE_ASSERTION_ACTIONS` step sets it) and turn an `expect_not_visible` or a count-0 `expect_requests` whose anchor exists only through gap steps into an `'assertion'` gap too, so an absence is never asserted on a page whose anchor was skipped. The new return shape is `{ gaps, truncateAt, runtime }` with `truncateAt` a zero-based index or `null`; remove the `refusal` field. Keep `precheckGroundedSteps` exported: it returns `null` when `gaps` is empty, else `{ code: 'STEP_UNGROUNDED', reason: 'step <n>: ...' }` for the first gap, naming the step position only. Update the JSDoc of both functions to say a miss is a step gap, not an entry refusal. Do not touch `validateSteps`, `stepRules` or `chosenSnapshotRefusal`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2273-2274` (the `refuse` closure that is replaced by a gap recorder at the same sites)
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const report = "Clique em Salvar";
  const ok = { action: "expect_visible", role: "button", name: "Salvar" };
  const bad = { action: "expect_visible", role: "button", name: "Inexistente" };
  const a = m.groundLocators([{ action: "goto", path: "/x" }, ok, bad, ok], [], report, null);
  assert.deepEqual(a.gaps, [{ at: 2, kind: "assertion" }]);
  assert.equal(a.truncateAt, null);
  assert.deepEqual(a.runtime, [1, 3]);
  const c = m.groundLocators([{ action: "goto", path: "/x" }, { action: "click", role: "button", name: "Salvar" }, { action: "click", role: "button", name: "Inexistente" }, ok], [], report, null);
  assert.deepEqual(c.gaps, [{ at: 2, kind: "interaction" }]);
  assert.equal(c.truncateAt, 2);
  const none = m.groundLocators([{ action: "goto", path: "/x" }, ok], [], report, null);
  assert.deepEqual(none.gaps, []);
  assert.equal(m.precheckGroundedSteps([{ action: "goto", path: "/x" }, ok], [], report, null), null);
  const first = m.precheckGroundedSteps([{ action: "goto", path: "/x" }, bad], [], report, null);
  assert.equal(first.code, "STEP_UNGROUNDED");
  assert.ok(!first.reason.includes("Inexistente"));
  '
  ```
  Exits non-zero (assert throws) when grounding still refuses whole or the gap shape is wrong.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — fixed gap sentences, step-record overlay and gap verdict helpers

- **ACTION**: Satisfies AC-A1 and AC-A2. Add, near the other frozen constants and exported pure helpers: (1) two exported frozen sentences, `STEP_GAP_REASON` ('the step could not be grounded to exactly one element, so it was not run; a person owes it') and `STEP_TRUNCATED_REASON` ('not run after an ungrounded interaction; a person owes it'), neither containing a locator, a value or page text; (2) extend the `StepRecord` typedef (`qa-run.mjs:1086`) with optional `reason_code` and `reason`; (3) export `overlayGapRecords(records, gaps, truncateAt)`: a pure function that returns a new array in which each record at a gap index becomes `{ ...rec, result: 'human', evidence: null, reason_code: 'STEP_UNGROUNDED', reason: STEP_GAP_REASON }`, and, when `truncateAt` is not `null`, each record after `truncateAt` becomes `{ ...rec, result: 'human', evidence: null, reason_code: null, reason: STEP_TRUNCATED_REASON }` (the truncating step itself is covered by its gap entry); records not touched are returned unchanged; (4) export `gapVerdict(verdict, gaps)`: returns `verdict` unchanged when it is not `null` (a failed or blocked step keeps the case as it was, so a failure makes the case `fail`), else `null` when `gaps` is empty, else `needsHuman('STEP_UNGROUNDED', REASON_CATALOGUE.STEP_UNGROUNDED.reason)`. Do not change `recordSteps` or `REASON_CATALOGUE`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2460-2464` (fixed frozen sentence, reused catalogue code) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3829-3833` (rewrite of a record after `recordSteps`)
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const recs = [1, 2, 3, 4].map((i) => ({ index: i, action: "expect_visible", result: "passed", evidence: null }));
  const one = m.overlayGapRecords(recs, [{ at: 1, kind: "assertion" }], null);
  assert.equal(one[1].result, "human");
  assert.equal(one[1].reason_code, "STEP_UNGROUNDED");
  assert.equal(one[1].reason, m.STEP_GAP_REASON);
  assert.equal(one[0].result, "passed");
  assert.equal(one[2].result, "passed");
  assert.equal(one[3].result, "passed");
  const cut = m.overlayGapRecords(recs, [{ at: 2, kind: "interaction" }], 2);
  assert.deepEqual(cut.map((r) => r.result), ["passed", "passed", "human", "human"]);
  assert.equal(cut[2].reason_code, "STEP_UNGROUNDED");
  assert.equal(cut[3].reason, m.STEP_TRUNCATED_REASON);
  assert.equal(cut[3].reason_code, null);
  assert.notEqual(m.STEP_GAP_REASON, m.STEP_TRUNCATED_REASON);
  const failed = { outcome: "fail", reason_code: null, reason: "x", evidence: [] };
  assert.equal(m.gapVerdict(failed, [{ at: 1, kind: "assertion" }]), failed);
  assert.equal(m.gapVerdict(null, []), null);
  const nh = m.gapVerdict(null, [{ at: 1, kind: "assertion" }]);
  assert.equal(nh.outcome, "needs-human");
  assert.equal(nh.reason_code, "STEP_UNGROUNDED");
  assert.equal(m.summarizeNeedsHuman([{ outcome: "needs-human", reason_code: "STEP_UNGROUNDED", steps: cut }]).needs_human_gap, 2);
  '
  ```
  Exits non-zero when a gap step is not recorded `human`, the truncation does not reach later steps, a failure is overridden, or `summarizeNeedsHuman` does not count the new records as owed.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — wire gaps through the evaluator and the browser driver

- **ACTION**: Satisfies AC-A1, AC-A2 and AC-A3. In the case evaluator (`qa-run.mjs:4805-4809`) delete the `if (grounded.refusal !== null) return out(needsHuman(...))` branch; keep `runtimeSteps = grounded.runtime` and also keep `grounded.gaps` and `grounded.truncateAt`, passing them to the driver call at line 4880 as the plan keys `gap_steps` and `truncate_at` beside `runtime_steps`. Every check before grounding stays exactly where it is, so a schema error (unknown action, missing required key, invalid `effect`, unbound `{{name}}`, via `validateSteps` at 4765) still returns `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested; nothing before 4805 may be edited. In `DRIVERS.browser` (`qa-run.mjs:3581`), read `gap_steps` and `truncate_at` from the plan beside `runtime_steps`. In the step loop: at the top of each iteration, when `i` is a `truncate_at` index, break out of the loop without acting; when `i` is an `'assertion'` gap, skip the step (no locator built, no request window change) and `continue`. Keep a separate `executedTo` (index of the last step that actually ran) for the `ranTo`-based evidence attribution so the final capture is attributed to the last step that acted, not to a skipped or truncated one. After `recordSteps`, apply `overlayGapRecords(recorded, gaps, truncateAt)` before the judge overlay at 3831-3833, with the guard that gap overlay is applied only to indexes the loop reached (a verdict that ended the case before a gap leaves later steps `not-run`). Replace the final verdict resolution at 3835-3837 so `verdict = gapVerdict(verdict, gaps)` is taken before the pending-judgment branch: a case with gaps and no failed step returns `needs-human` `STEP_UNGROUNDED` with its steps, and its judge steps are recorded `not-judged` (the existing non-null verdict mapping); a case with no gaps behaves exactly as before. Do not change `runLocatorStep`, the run-time `STEP_UNGROUNDED` returns or the first-failure stop (Phases 2 and 3 own those). Never write a locator value, page text or a Playwright error into any reason.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:4805-4809` (the call site whose refusal branch is replaced) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3829-3833` (record overlay order)
- **VALIDATE**:
  ```
  set -euo pipefail
  node --check plugins/relay/scripts/qa-run.mjs
  if grep -q "grounded.refusal" plugins/relay/scripts/qa-run.mjs; then
    echo "FAIL: the evaluator still reads grounded.refusal"; exit 1
  else
    echo "PASS: no whole-entry grounding refusal left"
  fi
  test "$(grep -c "gap_steps" plugins/relay/scripts/qa-run.mjs)" -ge 2
  test "$(grep -c "overlayGapRecords" plugins/relay/scripts/qa-run.mjs)" -ge 2
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  for (const bad of [
    [{ action: "teleport" }],
    [{ action: "click", role: "button", name: "Salvar", effect: "delete" }],
    [{ action: "fill", role: "textbox", name: "Nome", value: "{{who}}" }, { action: "expect_visible", role: "button", name: "Salvar" }],
  ]) {
    const r = m.validateSteps("browser", bad, []);
    assert.equal(r.code, "PLAN_ENTRY_INVALID");
  }
  '
  ```
  The `gap_steps`/`overlayGapRecords` counts are a wiring text match (the browser driver cannot be run here without a browser); the behavioral guarantee of the helpers is Task 2's script, and the driver end-to-end is exercised by the test pair against the AC-1/AC-2 fixtures. The last block proves schema errors still refuse the entry whole.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false git diff --check
npm run validate
```
`npm run validate` runs the repo's 28 static consistency checks and must keep passing with the count unchanged.

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
node --input-type=module -e '
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
const report = "Clique em Salvar";
const ok = { action: "expect_visible", role: "button", name: "Salvar" };
const bad = { action: "expect_visible", role: "button", name: "Inexistente" };
const g = m.groundLocators([{ action: "goto", path: "/x" }, ok, bad, ok, { action: "expect_not_visible", role: "button", name: "Salvar" }], [], report, null);
assert.deepEqual(g.gaps, [{ at: 2, kind: "assertion" }]);
const t = m.groundLocators([{ action: "goto", path: "/x" }, { action: "click", role: "button", name: "Inexistente" }, ok], [], report, null);
assert.equal(t.truncateAt, 1);
assert.deepEqual(t.gaps, [{ at: 1, kind: "interaction" }]);
assert.equal(m.validateSteps("browser", [{ action: "teleport" }], []).code, "PLAN_ENTRY_INVALID");
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
const m = await import("./plugins/relay/scripts/qa-run.mjs");
const recs = [1, 2, 3].map((i) => ({ index: i, action: "expect_visible", result: "passed", evidence: null }));
const steps = m.overlayGapRecords(recs, [{ at: 1, kind: "assertion" }], null);
assert.equal(m.gapVerdict(null, [{ at: 1, kind: "assertion" }]).reason_code, "STEP_UNGROUNDED");
assert.equal(m.summarizeNeedsHuman([{ outcome: "needs-human", reason_code: "STEP_UNGROUNDED", steps }]).needs_human_gap, 1);
'
```
The corpus `node --test "scripts/validate/**/*.test.mjs"` is NOT a gate for this phase: tests that encode the whole-entry refusal fail by design until the test pair updates them (see Notes). It is the gate of Phase 7 (AC-17).

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** An `expect_*` step whose locator is neither a snapshot entry with `matches` 1 nor a word of the case's manual steps is a step gap: the other steps still run, the gap step is recorded `human` with `STEP_UNGROUNDED` and the fixed reason, and the case ends `needs-human` `STEP_UNGROUNDED` only if no executed step failed (a failed step makes it `fail`).
- **AC-A2 (PRD AC-2):** An ungrounded `click` or `fill` (and, as steps after the truncation point, any `goto`) truncates the case: earlier steps run and count, the ungrounded step is recorded `human` with `STEP_UNGROUNDED`, every later step is recorded `human` with the fixed "not run after an ungrounded interaction" reason, and nothing after the step before it acts on the page.
- **AC-A3 (PRD AC-3):** An entry with a schema error (unknown action, missing required key, invalid `effect`, unbound `{{name}}`) is still `PLAN_ENTRY_INVALID` for the whole entry before anything is seeded, authenticated or requested.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A skipped positive assertion lets a later `expect_not_visible` / count-0 `expect_requests` pass vacuously | M | A false pass | Task 1 tracks the anchor inside `groundLocators` and turns an absence whose anchor was only a gap into a gap itself |
| A gap reason leaks a locator value or page text | L | Redaction policy breach | Gaps carry no text; reasons are the two frozen sentences; Task 2's script asserts the reason is the constant and the precheck reason omits the locator |
| `human` step results or the new `reason_code`/`reason` step keys trip a consumer that enumerates step results | L | A check or the report renderer rejects the file | `summarizeNeedsHuman` already counts `human`; `npm run validate` runs at Levels 1 and 3; the implementer reports any consumer it finds that needs the test pair |
| A case with gaps loses its judge captures (judge steps recorded `not-judged`) | M | Fewer judged steps in a gap case | Accepted for this phase: a case that cannot pass is `needs-human`; recorded in Notes for the dogfood reading |
| End-to-end driver behavior (browser) cannot be run by the Implementer's validation | M | Driver regression unseen until tests | The pure helpers carry the decisions and are executed in Levels 2 and 3; the test pair authors the AC-1/AC-2 fixtures test-after |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Existing tests that go stale by design (for the test pair, `EXISTING_TEST_UPDATED`):** tests that assert the whole-entry `PLAN_ENTRY_INVALID` refusal from grounding or from `precheckGroundedSteps` / `groundLocators` (`refusal` field, e.g. in `scripts/validate/checks/qa-run-ui-grounding.test.mjs`: the `precheckGroundedSteps` refusal tests around lines 294, 326, 332 and the end-to-end test around line 507; others in `qa-run-scoped-locators.test.mjs`, `qa-run-chosen-inputs.test.mjs`, `qa-run-grounding-prefix-consumption.test.mjs`, `qa-run-model-judgment.test.mjs`, `qa-run-input-value.test.mjs`, `qa-run-absence-state.test.mjs` may read `refusal`). The Implementer must not edit them; if the implementation exposes a test that contradicts AC-1..AC-3 it is a dispute for the arbitration path, not an edit.
- `relay-qa-run.md` lines 405-408 and 475-477 describe the old refusal (planner declines with `STEP_UNGROUNDED` because the script refuses as `PLAN_ENTRY_INVALID`). They stay until Phase 7 rewrites them; a `qa-run-contract` check pinning that text, if one fails at Level 1, is to be reported rather than worked around by editing the doc here.
- Grounding of `goto` has no source today (only locator actions are grounded), so the `goto` in AC-2 is covered as a step after a truncation point; a `goto` is never itself a gap in this phase.
- Run commands from the worktree root. Prefix git/node invocations with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` on this Windows host where git is involved; write files with LF line endings.
- Research: `research-web` found no primary-source convention for running only the valid steps of a partly unresolvable script (Cucumber/Robot Framework stop or skip after the first non-pass), so the design follows the PRD's own Decisions Log.

*Generated: 2026-10-23*
*Approved: 2026-10-23*
*Implemented: 2026-10-23*
*Status: IMPLEMENTED*
