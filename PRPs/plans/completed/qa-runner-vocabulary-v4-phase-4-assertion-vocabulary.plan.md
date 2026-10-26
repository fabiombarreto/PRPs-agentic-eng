# Feature: Assertion vocabulary (Phase 4 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` plan vocabulary, schema validation, plan-time grounding, run-time locator resolution); cross-cutting artifact (`plan.json` and `results.json` are read by downstream stages and the dogfood kit); no new network- or store-touching site; no new `effect`
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): item 2 (a product that lacks what the report names is executed and ends `fail`), item 6 (report-word locators resolve at run time)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` Decisions Log: no planner-written selectors (locators come from the report's words or a snapshot entry), `uncertain` judgments never count as executed
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the new step reasons are fixed sentences, never an anchor text, a locator word or page text
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": tests that pin the old vocabulary are updated only by the test pair
- Applicable architectural rules:
  - Command versus script separation: the script validates, resolves, executes and records
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - R-X strict: the Implementer authors zero test files
  - PRP artifact paths: plan under `PRPs/plans/`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 4: "Assertion vocabulary" — Goal: reach the steps the reports describe without literal text or names — Success signal: AC-8..AC-10 hold on fixtures, including the opacity case for role-only presence.

## Summary

Three vocabulary additions in `plugins/relay/scripts/qa-run.mjs`, each carried through schema validation, plan-time grounding, run-time resolution and the step record. (1) Role-only presence: an `expect_visible` with a `within` scope and a `role` but no `name`/`name_prefix`/`index` passes when the scope holds at least one element of that role that is visible to a person (the v3 opacity/visibility conjunction applies to each candidate); nothing found is a `fail` with cause `absent` (phase 2 rule), and the same step without `within` stays `PLAN_ENTRY_INVALID`. (2) `pattern: "number"` on `expect_text`, from a closed list of pattern names, mutually exclusive with `contains`. (3) `within: { anchor_text }`, a scope that resolves to the nearest ancestor of the one visible element whose text equals the anchor and that holds at least one element of the step's role; zero or several anchors, a hidden anchor, or no such container end `needs-human` `STEP_UNGROUNDED`; `anchor_text` is grounded like any other word (report words or a snapshot entry with `matches` 1). The new steps stay assertions, so phase 1 (gaps) and phase 3 (continuation) apply to them unchanged.

## User Story

As the AI session that plans and runs a QA report's cases
I want to assert a presence, a stated-but-unquoted number and an unnamed control through the report's own words
So that steps with no literal text or accessible name are executed instead of landing on the human gate.

## Problem Statement

The reports describe steps that 0.47.0 cannot express: an error alert whose text the report does not quote (S-4, 15 steps), a count the report says is shown but does not state (T-2), and unnamed avatar buttons under a labelled-by-text container (S-6, 7 steps). With no way to name them, those steps are not executed. The 90% target is unreachable without them (PRD Problem Statement, Core Capabilities).

## Solution Statement

Extend the existing scoped-locator machinery rather than add a parallel one. `scopeOf` gains an opt-in `anchor_text` form; `scopedLocatorOf` gains a `role-any` target kind (role in a name-or-prefix scope, no name) and refuses the combinations that would be unsafe; `stepRules` gains the `pattern` rules and the per-action restrictions; `groundLocators` grounds the anchor word and the pattern step; `buildLocator` takes a resolved anchor container; `runLocatorStep` resolves the anchor first, runs the role-only any-visible check, and evaluates the pattern on the element's visible text through the existing `settleAssertion`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Enhancement |
| Complexity | Medium |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs` (schema, grounding, locator resolution, step loop callee) |
| Dependencies | Phase 1 (`groundLocators` per-step gaps), phase 2 (absent-element `fail`, `absentElementReason`), phase 3 (`settle`, `continuesAfterFailure`), all already in the working tree |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 80-82, 156-163, 206-209 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 80-82, 156-163, 206-209 | AC-8, AC-9, AC-10, the Architecture Notes (`anchor_text` reuses the nearest-container walk), Phase 4 details |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1196-1320 | `SCOPED_LOCATOR_KEYS`, `scopeOf`, `scopedLocatorOf`, `locatorOf`: the locator descriptors to extend |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1396-1470 | `stepRules`: the browser locator branch where the new per-action rules go |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2418-2548 | `groundLocators`: the scoped-form `words` list and the `expect_text` `contains` check |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3161-3254 | `LABEL_CONTAINER_XPATH`, `scopeLocator`, `resolveScopeElement`, `buildLocator`, `scopedLocatorRecord` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3654-3764 | `runLocatorStep`: guards, `expect_not_visible`, the count rules, the `expect_text` branch |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 2140-2222 | `settleAssertion`, `isVisibleToPerson`, `requireVisibleToPerson` |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 3835-3855 | the two `buildLocator` call sites in the driver (`fill`, `expect_value` masks) and the `runLocatorStep` call |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 132-133, 744-768 | the command-doc example check: each marked example is passed to `validateStep`; loosening validation cannot break it |

## Patterns to Mirror

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1226-1235
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
```
Copied by Task 1: the pure, total, reason-names-keys-never-values shape; the default behaviour stays byte-identical.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1269-1282
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
```
Copied by Task 1: where the `role-any` target kind joins the descriptors.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1448-1453
    const loc = LOCATOR_ACTIONS.includes(s.action) ? locatorOf(s) : null;
    if (loc !== null) {
      if (!loc.ok) return bad(`${s.action}: ${loc.why}`);
      if (loc.form === 'scoped' && loc.target.kind === 'label' && (s.action === 'expect_text' || s.action === 'expect_not_visible')) return bad(`${s.action} does not take label_text: it names an input`);
      if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');
      if (s.action === 'expect_text' && !isStr(s.contains)) return bad('expect_text needs a string contains');
```
Copied by Task 1: the per-action refusal shape (`bad(...)` naming the action, never a value).

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:2486-2503
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
        miss(i, step);
        continue stepLoop;
      }
```
Copied by Task 2: one `{ word, listed }` per word the step carries; the anchor is a `kind: 'text'` word exactly like `text` and `label_text`.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3167-3170
export const LABEL_CONTAINER_XPATH = "xpath=ancestor-or-self::*[count(.//input[not(@type='hidden')] | .//textarea | .//select) = 1][1]";

/** The control inside the container that `LABEL_CONTAINER_XPATH` selects. */
const LABEL_CONTROL_CSS = "input:not([type='hidden']), textarea, select";
```
Copied by Task 3: a fixed constant xpath, never planner text; the anchor walk is the same nearest-ancestor-or-self idea with a different stop condition.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3205-3210
export async function resolveScopeElement(page, scope) {
  const locator = scopeLocator(page, scope);
  await locator.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  const count = await locator.count().catch(() => 0);
  return count === 1 ? { ok: true, locator } : { ok: false, count };
}
```
Copied by Task 3: wait for attach up to 10 seconds, then decide by count; every failure is a value, never a throw.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3235-3241
  if (t.kind === 'label') {
    const labelElement = base.getByText(t.labelText, { exact: true });
    guards.push({ what: 'label', locator: labelElement });
    return { target: labelElement.locator(LABEL_CONTAINER_XPATH).locator(LABEL_CONTROL_CSS), guards, indexed: null };
  }
  const all = base.getByRole(t.role);
  return { target: all.nth(t.index), guards, indexed: { all, index: t.index } };
```
Copied by Tasks 3 and 4: `buildLocator` builds locators and resolves nothing; the new `role-any` target joins before the final `nth` line.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:2194-2204
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
```
Copied by Task 4: `isAnyVisibleToPerson` calls this per candidate, so the v3 opacity/visibility conjunction applies to each one.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:2215-2222
export async function requireVisibleToPerson(target, n, opts = {}) {
  const seen = await settleAssertion(() => isVisibleToPerson(target), (visible) => visible === true, opts);
  if (seen.status === 'accepted') return null;
  if (seen.status === 'rejected') {
    return { outcome: 'fail', reason_code: null, reason: `step ${n}: the target was present but not visible to a person (opacity or visibility hides it)`, evidence: [] };
  }
  return notPerformable(`step ${n}: the visibility of the target could not be read; nothing was asserted`);
}
```
Copied by Task 4: `requireAnyVisibleToPerson` has this exact shape and the same two fixed sentences.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3756-3762
  if (step.action === 'expect_text') {
    const text = await target.textContent({ timeout: 10000 }).catch(() => null);
    if (text === null || !text.includes(step.contains)) {
      return { outcome: 'fail', reason_code: null, reason: `step ${n}: the expected text was not present`, evidence: [] };
    }
    return requireVisibleToPerson(target, n);
  }
```
Copied by Task 4: the `expect_text` branch the `pattern` variant sits beside; its `contains` path stays byte-identical.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | `TEXT_PATTERN_NAMES`/`textMatchesPattern`, `scopeOf` anchor form, `role-any` and anchor descriptors, `stepRules` rules, `groundLocators` words, `resolveAnchorScope`, `buildLocator`, `isAnyVisibleToPerson`/`requireAnyVisibleToPerson`, `runLocatorStep` (AC-8, AC-9, AC-10) |

## NOT Building (Scope Limits)

- Any edit to a test file. Tests that pin the old vocabulary go stale by design (see Notes) and are updated by the test pair.
- `plugins/relay/commands/relay-qa-run.md` (examples, vocabulary rules), `documentation/`, the version bump and changelog: Phase 7 (AC-15, AC-17, AC-18). The `qa-run-contract` check does not require an example per schema key, so `npm run validate` stays 28/28 green without a doc edit (see Notes).
- `anchor_text` on `fill` and `expect_value`: both call `buildLocator` in the driver (`qa-run.mjs:3837-3838`) to mask the control's value from captures before the step runs; an anchor needs async resolution, and a mask built on an unresolved scope would mask nothing. The schema refuses the combination. Not in the PRD's examples (click/index).
- Role-only presence for any action other than `expect_visible`, and role-only combined with `anchor_text` (the anchor walk already requires the container to hold the role, so the combination would be circular).
- `pattern` names other than `number`; `pattern` on the legacy selector form; `pattern` with `contains`.
- Changing `SCOPED_LOCATOR_KEYS`, the `judge` step's `within` (it keeps the 0.47.0 shape: `scopeOf` without the opt-in), `groundingStepKey`, `parseGroundPrefix` or `replayGroundingPrefix` (`ground --prefix` still accepts only role+name and text).
- Planner-written selectors, forced actions, overlay handling (Phase 6), the validation submit (Phase 5).
- Writing an anchor text, a locator word or page text into any reason.
- The frozen files: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`.
- A new `npm run validate` check (the count stays 28).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — schema: pattern names, anchor scope, role-only target, per-action rules

- **ACTION**: Satisfies AC-A2, AC-A3 and AC-A4. (a) Beside `SCOPED_LOCATOR_KEYS` (`qa-run.mjs:1197`) add `export const TEXT_PATTERN_NAMES = Object.freeze(['number']);` and `export function textMatchesPattern(name, text)`: pure and total, true only when `name` is a member of `TEXT_PATTERN_NAMES`, `text` is a string and (for `number`) `/[0-9]+/.test(text)`; false for anything else, never throws. (b) `scopeOf(within, opts = {})`: when `opts.allowAnchor === true` and `within` is an object carrying `anchor_text`, it is valid only when `anchor_text` is the single key and a non-empty string (after trim), returning `{ ok: true, scope: { anchorText: within.anchor_text } }`; any other combination with `anchor_text` returns `{ ok: false, why: 'within takes anchor_text alone, or a role and a name or name_prefix' }`. Without `opts.allowAnchor` the function behaves byte-identically to today (an `anchor_text` key still hits the first `Object.keys` refusal), so the `judge` call at the `within` check keeps refusing it. (c) `scopedLocatorOf`: call `scopeOf(step.within, { allowAnchor: true })`; in the `text` and `label_text` branches refuse a scope carrying `anchorText` with `'within anchor_text needs a role'`; in the role path, when none of `name`, `name_prefix`, `index` is present and `scope !== null`, return `{ ok: true, form: 'scoped', scope, target: { kind: 'role-any', role: step.role } }` — except that a scope carrying `anchorText` returns `bad('a role without a name needs a role and name scope, not anchor_text')`; the existing message `'role takes exactly one of name, name_prefix or index'` stays for the no-scope and the more-than-one cases. Update the JSDoc typedefs of `scopeOf` and `scopedLocatorOf` (scope may carry `anchorText`; target may be `{ kind: 'role-any', role }`). `locatorOf`'s plain path (no scoped key) is NOT touched: a role-only step without `within` still returns `{ ok: false, why: 'role and name go together' }`, which `validateStep` reports as `PLAN_ENTRY_INVALID`. (d) `stepRules`, in the browser `else` branch right before `const loc = ...` (`qa-run.mjs:1448`) add: a `pattern` on any action other than `expect_text` is refused (`'pattern is only for expect_text'`); a `pattern` together with `contains` is refused (`'expect_text takes contains or pattern, not both'`); a `pattern` not in `TEXT_PATTERN_NAMES` is refused (`'pattern must be one of the supported patterns'`, naming no value); an `expect_text` with a `pattern` and no locator (`locatorOf(s) === null`) is refused (`'pattern needs a role and name, or a text, locator'`). Inside the locator branch, after the `label` refusal: `role-any` is refused for every action except `expect_visible` (`${s.action} does not take a role without a name; only expect_visible does`); a scope carrying `anchorText` is refused for `fill` and `expect_value` (`${s.action} does not take anchor_text`); and the `expect_text` line becomes `if (s.action === 'expect_text' && s.pattern === undefined && !isStr(s.contains)) return bad('expect_text needs a string contains or a pattern');`. Do not change the legacy selector cases, `expectations` counting, `SCOPED_LOCATOR_KEYS`, or any other function.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1226-1235`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:1269-1282` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1448-1453`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const v = (s) => m.validateStep("browser", s);
  const dlg = { role: "dialog", name: "Validar e-mail" };
  // closed pattern list
  assert.deepEqual([...m.TEXT_PATTERN_NAMES], ["number"]);
  assert.ok(Object.isFrozen(m.TEXT_PATTERN_NAMES));
  assert.equal(m.textMatchesPattern("number", "Nao concluidas 12"), true);
  assert.equal(m.textMatchesPattern("number", "Nao concluidas"), false);
  assert.equal(m.textMatchesPattern("email", "12"), false);
  assert.equal(m.textMatchesPattern("number", null), false);
  // scopeOf: the anchor form is opt-in and alone
  assert.deepEqual(m.scopeOf({ anchor_text: "Escolha seu avatar" }, { allowAnchor: true }), { ok: true, scope: { anchorText: "Escolha seu avatar" } });
  assert.equal(m.scopeOf({ anchor_text: "x" }).ok, false, "judge-style scopeOf must still refuse anchor_text");
  for (const bad of [{ anchor_text: "x", role: "dialog" }, { anchor_text: "x", name: "y" }, { anchor_text: "  " }, { anchor_text: 3 }]) assert.equal(m.scopeOf(bad, { allowAnchor: true }).ok, false, JSON.stringify(bad));
  assert.equal(m.scopeOf({ role: "region", name: "a", extra: 1 }, { allowAnchor: true }).ok, false);
  // locator descriptors
  const ro = m.locatorOf({ within: dlg, role: "alert" });
  assert.equal(ro.ok, true); assert.deepEqual(ro.target, { kind: "role-any", role: "alert" });
  const an = m.locatorOf({ within: { anchor_text: "A" }, role: "button", index: 0 });
  assert.equal(an.ok, true); assert.deepEqual(an.scope, { anchorText: "A" }); assert.deepEqual(an.target, { kind: "nth", role: "button", index: 0 });
  assert.equal(m.locatorOf({ within: { anchor_text: "A" }, role: "alert" }).ok, false, "anchor + role-only is refused");
  assert.equal(m.locatorOf({ within: { anchor_text: "A" }, text: "x" }).ok, false);
  assert.equal(m.locatorOf({ within: { anchor_text: "A" }, label_text: "x" }).ok, false);
  assert.deepEqual(m.locatorOf({ role: "button" }), { ok: false, why: "role and name go together" }, "role-only without within is still refused");
  // schema: valid steps
  for (const ok of [
    { action: "expect_visible", within: dlg, role: "alert" },
    { action: "expect_text", role: "button", name_prefix: "Nao concluidas", pattern: "number" },
    { action: "click", within: { anchor_text: "Escolha seu avatar" }, role: "button", index: 0 },
    { action: "expect_visible", within: { anchor_text: "A" }, role: "button", index: 0 },
    { action: "expect_text", text: "Total", pattern: "number" },
  ]) assert.equal(v(ok), null, JSON.stringify(ok));
  // schema: PLAN_ENTRY_INVALID
  for (const bad of [
    { action: "expect_visible", role: "alert" },
    { action: "click", within: dlg, role: "button" },
    { action: "fill", within: dlg, role: "textbox", value: "x" },
    { action: "expect_not_visible", within: dlg, role: "alert" },
    { action: "expect_text", within: dlg, role: "alert", contains: "x" },
    { action: "expect_text", role: "button", name: "B", pattern: "email" },
    { action: "expect_text", role: "button", name: "B", pattern: "" },
    { action: "expect_text", role: "button", name: "B", pattern: "number", contains: "1" },
    { action: "expect_visible", role: "button", name: "B", pattern: "number" },
    { action: "expect_text", selector: "#a", pattern: "number" },
    { action: "expect_text", role: "button", name: "B" },
    { action: "fill", within: { anchor_text: "A" }, role: "textbox", index: 0, value: "x" },
    { action: "expect_value", within: { anchor_text: "A" }, role: "textbox", index: 0, not_empty: true },
    { action: "click", within: { anchor_text: "A", role: "dialog" }, role: "button", index: 0 },
  ]) { const r = v(bad); assert.ok(r !== null && r.code === "PLAN_ENTRY_INVALID", JSON.stringify(bad)); }
  assert.equal(v({ action: "expect_state", within: { anchor_text: "A" }, role: "checkbox", index: 0, state: "checked", equals: true }), null);
  '
  ```
  Exits non-zero on the current tree (none of these exports or forms exist) and whenever a role-only step without `within` is accepted, `pattern` escapes its closed list or meets `contains`, `anchor_text` leaks into the default `scopeOf`, or a refused combination is accepted.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — plan-time grounding of the anchor word, the role-only scope and the pattern step

- **ACTION**: Satisfies AC-A4 and AC-A5. In `groundLocators` (`qa-run.mjs:2418`): (a) in the scoped-form `words` block (2486-2492), when `sc !== null && sc.anchorText !== undefined` push `{ word: sc.anchorText, listed: (e) => e.kind === 'text' && e.text === sc.anchorText }`, else keep the existing `if (sc !== null)` body unchanged; (b) the `role-any` target kind pushes no word (it has none; the scope's word is already grounded by the scope entry), so add no branch for it beyond keeping the chain total; (c) the `expect_text` block (2525-2531) is skipped when the step carries a `pattern`: change its condition to `step.action === 'expect_text' && step.pattern === undefined`, because a pattern step states no literal to find in the report. Everything else, including `runtime.push(i)` for scoped steps, the gap kinds, `truncateAt` and the `precheckGroundedSteps` caller, is untouched: an ungrounded anchor or scope word is an assertion gap (`human` `STEP_UNGROUNDED`) via the phase-1 `miss`, never an entry refusal, and the role-only step is a positive assertion so it keeps anchoring absence steps.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2486-2503`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const goto = { action: "goto", path: "/" };
  const anchorStep = { action: "click", within: { anchor_text: "Escolha seu avatar" }, role: "button", index: 0 };
  const onPage = m.groundLocators([goto, anchorStep], [], "Open the page and see Escolha seu avatar", null);
  assert.deepEqual(onPage.gaps, [], "an anchor word that is the report own is grounded");
  assert.deepEqual(onPage.runtime, [1], "a scoped step is resolved when the case runs");
  const offPage = m.groundLocators([goto, anchorStep], [], "Open the page and see nothing relevant", null);
  assert.deepEqual(offPage.gaps, [{ at: 1, kind: "interaction" }], "an anchor word no source grounds is a gap on the click");
  assert.equal(offPage.truncateAt, 1);
  const snap = [{ role: "anonymous", route: "/", entries: [{ kind: "text", text: "Escolha seu avatar", matches: 1 }] }];
  assert.deepEqual(m.groundLocators([goto, anchorStep], snap, "nothing", null).gaps, [], "a snapshot entry with matches 1 grounds the anchor");
  const twice = [{ role: "anonymous", route: "/", entries: [{ kind: "text", text: "Escolha seu avatar", matches: 2 }] }];
  assert.equal(m.groundLocators([goto, anchorStep], twice, "nothing", null).gaps.length, 1, "matches 2 does not ground the anchor");
  const roleOnly = { action: "expect_visible", within: { role: "dialog", name: "Validar e-mail" }, role: "alert" };
  const ro = m.groundLocators([goto, roleOnly], [], "see the Validar e-mail dialog", null);
  assert.deepEqual(ro.gaps, []); assert.deepEqual(ro.runtime, [1], "the role-only step is a runtime-resolved scoped step");
  assert.deepEqual(m.groundLocators([goto, roleOnly], [], "nothing relevant", null).gaps, [{ at: 1, kind: "assertion" }], "an ungrounded scope word is an assertion gap");
  const pat = { action: "expect_text", role: "button", name_prefix: "Nao concluidas", pattern: "number" };
  assert.deepEqual(m.groundLocators([goto, pat], [], "the Nao concluidas button shows a count", null).gaps, [], "a pattern step needs no literal in the report");
  assert.equal(m.groundLocators([goto, pat], [], "nothing relevant", null).gaps.length, 1, "its name_prefix word is still grounded");
  const contains = { action: "expect_text", role: "button", name_prefix: "Nao concluidas", contains: "99" };
  assert.equal(m.groundLocators([goto, contains], [], "the Nao concluidas button", null).gaps.length, 1, "a contains literal is still required in the report");
  '
  ```
  Exits non-zero on the current tree (the anchor scope is not a descriptor, the pattern step has no `contains`, the role-only step is skipped instead of grounded) and whenever a word is grounded by `matches` 2, the pattern step is made a gap by its missing literal, or the `contains` rule is relaxed.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — run-time resolution of the anchor scope

- **ACTION**: Satisfies AC-A4. (a) Beside `LABEL_CONTAINER_XPATH` (`qa-run.mjs:3167`) add `export const ANCHOR_ANCESTORS_XPATH = 'xpath=ancestor-or-self::*';` (a fixed constant, never planner text). (b) Add `export async function resolveAnchorScope(page, scope, role)` after `resolveScopeElement`: `const anchor = page.getByText(scope.anchorText, { exact: true });` wait for the first to attach (10000 ms, `.catch(() => {})`), `found = await anchor.count().catch(() => 0)`; if `found !== 1` return `{ ok: false, why: 'count', count: found }`; if `!(await isVisibleToPerson(anchor).catch(() => false))` return `{ ok: false, why: 'hidden', count: 1 }`; then `const chain = anchor.locator(ANCHOR_ANCESTORS_XPATH); const depth = await chain.count().catch(() => 0);` and walk from the nearest ancestor outward (`for (let k = depth - 1; k >= 0; k--)`, the xpath list is in document order so the last is nearest), returning `{ ok: true, locator: chain.nth(k) }` for the first container whose `container.getByRole(role).count()` (`.catch(() => 0)`) is above zero; when none holds the role return `{ ok: false, why: 'container', count: 1 }`. (c) `buildLocator(page, loc, anchorBase = null)`: when `loc.scope !== null && loc.scope.anchorText !== undefined`, use `anchorBase` as `base` (pushed as the `scope` guard) and throw `new Error('an anchor_text scope is resolved before the locator is built')` when `anchorBase` is null; otherwise the scope path is unchanged. (d) `runLocatorStep` (`qa-run.mjs:3654`): replace `const built = buildLocator(page, loc);` with `let anchorBase = null;` followed by the anchor resolution, then `const built = buildLocator(page, loc, anchorBase);`. The resolution runs when `loc.form === 'scoped' && loc.scope !== null && loc.scope.anchorText !== undefined`: `const resolved = await resolveAnchorScope(page, loc.scope, loc.target.role);` then on `resolved.ok === false` and `resolved.why === 'count'` return `needsHuman('STEP_UNGROUNDED', ``step ${n}: the anchor text matched ${resolved.count} elements at run time; an anchor must match exactly one, so nothing was asserted or acted on``)`; on `'hidden'` return `needsHuman('STEP_UNGROUNDED', ``step ${n}: the anchor text is not visible to a person, so nothing was asserted or acted on``)`; on `'container'` return `needsHuman('STEP_UNGROUNDED', ``step ${n}: no container of the anchor text holds an element of the role, so nothing was asserted or acted on``)`; on success set `anchorBase = resolved.locator`. The result is named `resolved` throughout. No sentence carries the anchor text. The two other `buildLocator` call sites (`qa-run.mjs:3837-3838`) belong to `expect_value` and `fill`, which Task 1 refuses with an anchor scope; leave them unchanged and confirm by reading that no other caller passes an anchor descriptor. The index guard, the `expect_not_visible` scope-visibility rule and the count rules then apply to the resolved container with no change.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3167-3170`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:3205-3210` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3235-3241`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.equal(m.ANCHOR_ANCESTORS_XPATH, "xpath=ancestor-or-self::*");
  // a fake page: the anchor, its ancestor chain (document order) and what each container holds
  const fake = (anchorCount, holds, visible = true) => {
    const containers = holds.map((n) => ({ getByRole: () => ({ count: async () => n }) }));
    const chain = { count: async () => containers.length, nth: (k) => containers[k] };
    const anchor = { first: () => ({ waitFor: async () => {} }), count: async () => anchorCount, isVisible: async () => visible, evaluate: async () => true, locator: (x) => { assert.equal(x, m.ANCHOR_ANCESTORS_XPATH); return chain; } };
    return { page: { getByText: (t, o) => { assert.equal(o.exact, true); return anchor; } }, containers };
  };
  const scope = { anchorText: "Escolha seu avatar" };
  { const f = fake(1, [0, 3, 0]); const r = await m.resolveAnchorScope(f.page, scope, "button"); assert.equal(r.ok, true); assert.equal(r.locator, f.containers[1], "the nearest ancestor that holds the role"); }
  { const f = fake(1, [2, 3, 5]); const r = await m.resolveAnchorScope(f.page, scope, "button"); assert.equal(r.locator, f.containers[2], "the nearest of several holders wins"); }
  assert.deepEqual(await m.resolveAnchorScope(fake(0, [1]).page, scope, "button"), { ok: false, why: "count", count: 0 });
  assert.deepEqual(await m.resolveAnchorScope(fake(2, [1]).page, scope, "button"), { ok: false, why: "count", count: 2 });
  assert.deepEqual(await m.resolveAnchorScope(fake(1, [1], false).page, scope, "button"), { ok: false, why: "hidden", count: 1 });
  assert.deepEqual(await m.resolveAnchorScope(fake(1, [0, 0]).page, scope, "button"), { ok: false, why: "container", count: 1 });
  // buildLocator uses the resolved container and never the page role lookup
  const loc = m.locatorOf({ within: scope, role: "button", index: 0 });
  const base = { getByRole: (r) => ({ nth: (k) => ({ r, k }) }) };
  const pageNoRole = { getByRole: () => { throw new Error("must not look the scope up by role"); } };
  const built = m.buildLocator(pageNoRole, loc, base);
  assert.deepEqual(built.target, { r: "button", k: 0 });
  assert.equal(built.guards.length, 1); assert.equal(built.guards[0].what, "scope"); assert.equal(built.guards[0].locator, base);
  assert.throws(() => m.buildLocator(pageNoRole, loc), /anchor_text scope is resolved before/);
  // the step runner resolves the anchor first and maps every failure to a fixed sentence
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const a = src.indexOf("async function runLocatorStep(");
  const b = src.indexOf("DRIVERS.browser = async", a);
  assert.ok(a > 0 && b > a);
  const body = src.slice(a, b);
  const resolveAt = body.indexOf("await resolveAnchorScope(page, loc.scope");
  const buildAt = body.indexOf("const built = buildLocator(page, loc, anchorBase)");
  assert.ok(resolveAt > -1 && buildAt > -1 && resolveAt < buildAt, "the anchor resolves before the locator is built");
  assert.ok((body.match(/needsHuman\(.STEP_UNGROUNDED., `step \$\{n\}: (the anchor text|no container of the anchor text)/g) ?? []).length >= 3, "three fixed STEP_UNGROUNDED sentences");
  assert.ok(!/anchorText\}/.test(body.slice(resolveAt, buildAt)), "no sentence interpolates the anchor text");
  '
  ```
  Exits non-zero on the current tree (no `resolveAnchorScope`, no third parameter) and whenever the nearest-container walk picks the wrong ancestor, a zero/several/hidden anchor resolves, the page role lookup is used for an anchor scope, or a reason carries the anchor text. Browser behaviour is checked by Level 3.

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — run-time role-only presence and the number pattern

- **ACTION**: Satisfies AC-A1 and AC-A3. (a) After `requireVisibleToPerson` (`qa-run.mjs:2215-2222`) add `export async function isAnyVisibleToPerson(locator)`: `const count = await locator.count();` then for `k` in `0..count-1` return `true` at the first `await isVisibleToPerson(locator.nth(k))`, else `false` (zero candidates are `false`; a read that throws propagates, as in `isVisibleToPerson`, so `settleAssertion` reads it as unreadable), and `export async function requireAnyVisibleToPerson(locator, n, opts = {})` with the exact shape and the same two fixed sentences as `requireVisibleToPerson`, reading through `isAnyVisibleToPerson(locator)`. (b) `buildLocator`: before the final `const all = base.getByRole(t.role);` add `if (t.kind === 'role-any') return { target: base.getByRole(t.role), guards, indexed: null };`. (c) `runLocatorStep`: after the `expect_not_visible` block and before the `// The wait only gives the page time to render` wait, add the role-only branch: `if (loc.form === 'scoped' && loc.target.kind === 'role-any')` — wait for the first candidate to attach (10000 ms, `.catch(() => {})`), `present = await target.count().catch(() => 0)`; when `present === 0` return `{ outcome: 'fail', reason_code: null, reason: absentElementReason(n), evidence: [], cause: 'absent' }` (the phase-2 rule: a role-only presence that finds nothing is a `fail`, never a gap); otherwise `return requireAnyVisibleToPerson(target, n);`. This branch sits before the `count > 1` rule on purpose: several candidates are the normal case here. The scope guard (exactly one scope element) still runs first and is unchanged. (d) The `expect_text` branch: when `isStr(step.pattern)`, read `settleAssertion(() => target.innerText({ timeout: 1000 }), (t) => textMatchesPattern(step.pattern, t))` (the element's visible text, not `textContent`); `unreadable` returns `notPerformable(``step ${n}: the text of the target could not be read; nothing was asserted``)`, `rejected` returns `{ outcome: 'fail', reason_code: null, reason: ``step ${n}: the text did not match the declared pattern``, evidence: [] }`, `accepted` falls to `return requireVisibleToPerson(target, n);`. The existing `contains` path stays byte-identical, and neither the text read nor the pattern name is written to any reason or evidence. Both new step kinds are assertions, so `settle` and `continuesAfterFailure` (phase 3) already continue after their failure; no loop change.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2194-2204`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:2215-2222` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:3756-3762`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const cand = (visibleAt, evaluates = true) => ({ count: async () => visibleAt.length, nth: (k) => ({ isVisible: async () => visibleAt[k], evaluate: async () => evaluates }) });
  const quick = { boundMs: 0, intervalMs: 1, sleep: async () => {}, now: () => 0 };
  assert.equal(await m.isAnyVisibleToPerson(cand([false, true])), true);
  assert.equal(await m.isAnyVisibleToPerson(cand([false, false])), false);
  assert.equal(await m.isAnyVisibleToPerson(cand([])), false, "no candidate is not visible");
  assert.equal(await m.isAnyVisibleToPerson(cand([true], false)), false, "an element at opacity 0 (checkVisibility false) does not count");
  assert.equal(await m.requireAnyVisibleToPerson(cand([false, true]), 3, quick), null);
  const hidden = await m.requireAnyVisibleToPerson(cand([true], false), 3, quick);
  assert.equal(hidden.outcome, "fail"); assert.match(hidden.reason, /^step 3: .*not visible to a person/); assert.deepEqual(hidden.evidence, []);
  const none = await m.requireAnyVisibleToPerson(cand([]), 4, quick);
  assert.equal(none.outcome, "fail");
  // buildLocator: role-any selects every candidate of the role inside the scope
  const loc = m.locatorOf({ within: { role: "dialog", name: "V" }, role: "alert" });
  const scopeEl = { getByRole: (r) => ({ all: r }) };
  const page = { getByRole: (r, o) => { assert.equal(r, "dialog"); return scopeEl; } };
  const built = m.buildLocator(page, loc);
  assert.deepEqual(built.target, { all: "alert" }); assert.equal(built.indexed, null); assert.equal(built.guards[0].what, "scope");
  // the step runner: branch placement and the pattern variant, narrow slices
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const a = src.indexOf("async function runLocatorStep(");
  const b = src.indexOf("DRIVERS.browser = async", a);
  const body = src.slice(a, b);
  const anyAt = body.indexOf("return requireAnyVisibleToPerson(target, n)");
  assert.ok(anyAt > -1 && body.indexOf("loc.target.kind === " + String.fromCharCode(39) + "role-any" + String.fromCharCode(39)) > -1, "the role-only branch exists");
  assert.ok(anyAt < body.indexOf("if (count > 1)"), "the role-only branch precedes the exactly-one rule");
  assert.match(body.slice(body.indexOf("loc.target.kind === " + String.fromCharCode(39) + "role-any"), anyAt), /absentElementReason\(n\)[^\n]*cause: .absent./);
  const et = body.indexOf("if (step.action === " + String.fromCharCode(39) + "expect_text" + String.fromCharCode(39) + ") {");
  assert.ok(et > -1);
  const etBody = body.slice(et);
  assert.match(etBody, /innerText\(/); assert.match(etBody, /textMatchesPattern\(step\.pattern/);
  assert.ok(etBody.includes("!text.includes(step.contains)"), "the contains path is unchanged");
  assert.ok(!/`[^`]*\$\{[^}]*pattern[^}]*\}[^`]*`/.test(etBody), "no reason interpolates the pattern");
  '
  ```
  Exits non-zero on the current tree (no `isAnyVisibleToPerson`, no `role-any` branch) and whenever a hidden or opacity-0 candidate counts, an absent role-only presence is not a `fail` with cause `absent`, the branch sits after the exactly-one rule, or the pattern is read with `textContent` or interpolated into a reason. Browser behaviour is checked by Level 3.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --check plugins/relay/scripts/qa-run.mjs
git diff --check
npm run validate
```
`npm run validate` runs the repo's 28 static consistency checks and must keep passing with the count unchanged. The `qa-run-contract` check passes every marked example of `relay-qa-run.md` through `validateStep`; this phase only loosens or adds vocabulary, so the existing examples keep validating and no doc edit is needed to stay green. If a check does go red, fix the named invariant in the smallest way and record it in the implementation report; do not defer a red validate.

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
// 0.47.0 vocabulary is untouched
assert.deepEqual([...m.SCOPED_LOCATOR_KEYS], ["within", "name_prefix", "label_text", "index"]);
assert.deepEqual(m.locatorOf({ role: "button" }), { ok: false, why: "role and name go together" });
assert.equal(m.validateStep("browser", { action: "expect_visible", role: "button", name: "Salvar" }), null);
assert.equal(m.validateStep("browser", { action: "expect_text", role: "button", name: "Salvar", contains: "x" }), null);
assert.equal(m.validateStep("browser", { action: "click", within: { role: "dialog", name: "D" }, role: "button", name_prefix: "Sal" }), null);
assert.equal(m.scopeOf({ role: "region", name: "a", extra: 1 }).ok, false);
// the new steps stay assertions: they continue after a failure
assert.equal(m.continuesAfterFailure({ action: "expect_visible", within: { role: "dialog", name: "D" }, role: "alert" }), true);
assert.equal(m.continuesAfterFailure({ action: "expect_text", role: "button", name: "B", pattern: "number" }), true);
assert.equal(m.continuesAfterFailure({ action: "click", within: { anchor_text: "A" }, role: "button", index: 0 }), false);
// no new reason mentions a locator word, a text or a pattern name
const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const a = src.indexOf("async function runLocatorStep(");
const body = src.slice(a, src.indexOf("DRIVERS.browser = async", a));
assert.ok(!/\$\{[^}]*(anchorText|\.pattern|step\.contains|loc\.scope\.name)[^}]*\}/.test(body), "no reason interpolates a planner word");
'
git diff --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs > "${TMPDIR:-/tmp}/relay-frozen-diff-p4.txt"
if test -s "${TMPDIR:-/tmp}/relay-frozen-diff-p4.txt"; then echo "FAIL: a frozen file changed"; exit 1; else echo "PASS: frozen files untouched"; fi
```
The `judge` step keeps the 0.47.0 `within` shape: Task 1's check that `scopeOf` without the opt-in refuses `anchor_text` gates it.

### Level 3 INTEGRATION

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
npm run validate
node --input-type=module -e '
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, unlinkSync, rmdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const { validateResults } = await import("./scripts/validate/checks/qa-run-contract.mjs");
const RUN = "PRPs/reports/f/qa-run/r1";
const NC = "Não concluídas";
const hits = {};
const page = (body) => `<!doctype html><html><body><h1>Panel</h1>${body}</body></html>`;
const dlg = (inner) => `<div role="dialog" aria-label="Validar e-mail">${inner}</div>`;
const btn = (p) => `<button style="width:24px;height:24px" onclick="fetch(&quot;${p}&quot;)"></button>`;
const PAGES = {
  "/ro-ok": page(dlg(`<div role="alert">Erro</div>`)),
  "/ro-hidden": page(dlg(`<div role="alert" style="opacity:0">Erro</div>`)),
  "/ro-outside": page(dlg(`<p>vazio</p>`) + `<div role="alert">Erro fora</div>`),
  "/ro-none": page(dlg(`<p>vazio</p>`)),
  "/pat-ok": page(`<button>${NC} 3</button>`),
  "/pat-none": page(`<button>${NC}</button>`),
  "/anchor": page(`<div><p>Escolha seu avatar</p><div>${btn("/picked0")}${btn("/picked1")}</div></div>`),
  "/anchor-two": page(`<div><p>Escolha seu avatar</p>${btn("/picked0")}</div><div><p>Escolha seu avatar</p>${btn("/picked1")}</div>`),
  "/anchor-none": page(`<p>outra coisa</p>`),
};
const server = createServer((req, res) => {
  const p = new URL(String(req.url), "http://x").pathname;
  hits[p] = (hits[p] ?? 0) + 1;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGES[p] ?? page(""));
});
await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
const base = `http://127.0.0.1:${server.address().port}`;
const root = mkdtempSync(join(tmpdir(), "relay-p4-"));
const nm = join(root, "node_modules");
symlinkSync(resolve("node_modules"), nm, "junction");
let skip = false;
try {
  mkdirSync(join(root, ...RUN.split("/")), { recursive: true });
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  const block = (i) => [`### Case ${i}`, `**Title:** Case ${i} title`, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", `1. Open the page and see Panel, Validar e-mail, Escolha seu avatar and ${NC}`, ""].join("\n");
  const steps = [
    [{ action: "goto", path: "/ro-ok" }, { action: "expect_visible", within: { role: "dialog", name: "Validar e-mail" }, role: "alert" }],
    [{ action: "goto", path: "/ro-hidden" }, { action: "expect_visible", within: { role: "dialog", name: "Validar e-mail" }, role: "alert" }],
    [{ action: "goto", path: "/ro-outside" }, { action: "expect_visible", within: { role: "dialog", name: "Validar e-mail" }, role: "alert" }],
    [{ action: "goto", path: "/ro-none" }, { action: "expect_visible", within: { role: "dialog", name: "Validar e-mail" }, role: "alert" }],
    [{ action: "goto", path: "/pat-ok" }, { action: "expect_text", role: "button", name_prefix: NC, pattern: "number" }],
    [{ action: "goto", path: "/pat-none" }, { action: "expect_text", role: "button", name_prefix: NC, pattern: "number" }],
    [{ action: "goto", path: "/anchor" }, { action: "click", within: { anchor_text: "Escolha seu avatar" }, role: "button", index: 0 }, { action: "expect_visible", role: "heading", name: "Panel" }],
    [{ action: "goto", path: "/anchor-two" }, { action: "click", within: { anchor_text: "Escolha seu avatar" }, role: "button", index: 0 }, { action: "expect_visible", role: "heading", name: "Panel" }],
    [{ action: "goto", path: "/anchor-none" }, { action: "click", within: { anchor_text: "Escolha seu avatar" }, role: "button", index: 0 }, { action: "expect_visible", role: "heading", name: "Panel" }],
  ];
  writeFileSync(join(root, "PRPs", "reports", "f", "qa-report.md"), `# QA Report\n\n## Test Cases\n\n${steps.map((_, i) => block(i + 1)).join("\n")}\n## Notes\n\nnone\n`);
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: {} } }));
  writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), [
    `import { writeFileSync, mkdirSync } from "node:fs";`,
    `import { join } from "node:path";`,
    `const root = process.argv[process.argv.indexOf("--root") + 1];`,
    `mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });`,
    `writeFileSync(join(root, "PRPs", "auth", ".sessions", "admin.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "tok-p4-fixture", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
  ].join("\n"));
  writeFileSync(join(root, ...RUN.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: steps.map((s, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: "browser", role: "admin", state: "none", steps: s })) }));
  const code = await new Promise((res, rej) => {
    const c = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), "run", "--root", root, "--feature", "f", "--run-dir", RUN], { cwd: root, stdio: "ignore", windowsHide: true });
    const t = setTimeout(() => c.kill(), 270000);
    c.on("error", rej);
    c.on("close", (x) => { clearTimeout(t); res(x); });
  });
  await new Promise((r) => setTimeout(r, 700));
  const file = join(root, ...RUN.split("/"), "results.json");
  assert.ok(existsSync(file), `no results.json, runner exit ${code}`);
  const results = JSON.parse(readFileSync(file, "utf8"));
  const c = results.cases;
  if (c[0].reason_code === "FAILED_BROWSER_UNAVAILABLE") {
    skip = true;
  } else {
    const tag = (k) => JSON.stringify([k.outcome, k.reason_code, k.reason]);
    // AC-A1 (AC-8): role-only presence
    assert.equal(c[0].outcome, "pass", tag(c[0]));
    for (const i of [1, 2, 3]) { assert.equal(c[i].outcome, "fail", `case ${i + 1} ${tag(c[i])}`); assert.equal(c[i].steps[1].result, "failed"); }
    assert.equal(c[3].steps[1].cause, "absent", "an absent role-only presence is a fail with cause absent, never a gap");
    // AC-A3 (AC-9): number pattern
    assert.equal(c[4].outcome, "pass", tag(c[4]));
    assert.equal(c[5].outcome, "fail", tag(c[5]));
    assert.ok(!JSON.stringify(c[5]).includes(NC), "no page text in the case record");
    // AC-A4 (AC-10): anchor_text
    assert.equal(c[6].outcome, "pass", tag(c[6]));
    assert.equal(hits["/picked0"], 1, "the first button of the anchored container was clicked once");
    assert.equal(hits["/picked1"] ?? 0, 0, "the second button was never acted on");
    for (const i of [7, 8]) { assert.equal(c[i].outcome, "needs-human", `case ${i + 1} ${tag(c[i])}`); assert.equal(c[i].reason_code, "STEP_UNGROUNDED"); assert.ok(!c[i].reason.includes("Escolha"), "the anchor text is not in the reason"); }
    assert.deepEqual(validateResults(results), []);
  }
} finally {
  try { unlinkSync(nm); } catch { try { rmdirSync(nm); } catch { } }
  if (!existsSync(nm)) rmSync(root, { recursive: true, force: true });
  server.closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
}
if (skip) console.log("SKIP-BROWSER-UNAVAILABLE: the runner could not launch Chromium here; the real-page vocabulary fixtures are left to the test pair (Levels 1 and 2 and the per-task checks still gate the structure)");
'
```
Case 7 is the only one that clicks (cases 8 and 9 end before any action), so a correct run requests `/picked0` once and `/picked1` never; a `/picked1` hit means the wrong button was acted on. A run that prints `SKIP-BROWSER-UNAVAILABLE` did not exercise the real page; a run that ends silently after the assertions did. The corpus `node --test "scripts/validate/**/*.test.mjs"` is NOT a gate for this phase (see Notes). The fixture lives in the OS temp directory, the `node_modules` junction is unlinked before the directory is removed so the repository `node_modules` is never reached, and nothing is written in the repository.

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** Given `{ "action": "expect_visible", "within": { "role": "dialog", "name": "Validar e-mail" }, "role": "alert" }` with no `name`, when the dialog holds one alert visible to a person, then the step passes; when the only alert is at `opacity: 0`, sits outside the scope, or is absent, then it fails (the absent case with cause `absent`).
- **AC-A2 (PRD AC-8):** A role-only step without `within` is `PLAN_ENTRY_INVALID`; role-only is accepted for `expect_visible` only, and not together with `anchor_text`.
- **AC-A3 (PRD AC-9):** Given `{ "action": "expect_text", "role": "button", "name_prefix": "Não concluídas", "pattern": "number" }`, when the element's visible text contains a run of digits the step passes and when it contains none it fails; any `pattern` outside the closed list, a `pattern` on another action and a `pattern` together with `contains` are `PLAN_ENTRY_INVALID`.
- **AC-A4 (PRD AC-10):** Given `{ "within": { "anchor_text": "Escolha seu avatar" }, "role": "button", "index": 0 }`, the runner resolves the nearest ancestor of the one visible element carrying that text that holds at least one element of the role and acts on the first; zero or several anchors (or a hidden anchor, or no container holding the role) end `needs-human` `STEP_UNGROUNDED` with a fixed reason that carries no anchor text; `anchor_text` is grounded by the report's words or a snapshot entry with `matches` 1, otherwise the step is a phase-1 gap.
- **AC-A5 (PRD AC-8, AC-9, AC-10):** The new steps keep the surrounding rules: an ungrounded scope, anchor or name word is a step gap and not an entry refusal; they are assertions that continue after a failure (phase 3) except `click` with an anchor, which stops; the 0.47.0 vocabulary, `SCOPED_LOCATOR_KEYS` and the `judge` step's `within` are unchanged.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A role-only presence passes on a stale or hidden element (a false pass) | M | A product defect read as green | Every candidate goes through `isVisibleToPerson` (the v3 opacity/visibility conjunction); Level 3 has the opacity-0, outside-scope and absent negatives; zero candidates is a `fail`, never a pass |
| `anchor_text` resolves to a wrong container, so the click lands on a wrong control | M | A wrong action on the page | Exactly one visible anchor; nearest ancestor that holds the role; every failure is `needs-human` `STEP_UNGROUNDED` before any action; Level 3 checks which button was clicked |
| An anchor mask gap: a `fill` or `expect_value` with an anchor scope would leave a value unmasked in captures | L | A secret in an artifact | The schema refuses `anchor_text` on both (Task 1); Level 2/Task 1 assert it |
| `innerText` differs from `textContent` for hidden descendants, so a pattern step reads differently from a `contains` step | L | A surprise at the dogfood | Intended: the PRD says "visible text"; `contains` keeps `textContent` byte-identical |
| Role-only absent inside a missing scope reads `needs-human` (scope guard) rather than `fail` | L | A defect labelled a planning gap | Unchanged v3 scope-guard rule (a scope must match one element); only the target is "absent is a `fail`" (phase 2); recorded in Notes |
| An existing test pins the old vocabulary and fails | H | Red corpus until the test pair runs | Expected and named in Notes; the corpus is not this phase's gate; a test contradicting AC-8..AC-10 is a dispute for arbitration, not an Implementer edit |
| Browser behaviour cannot be fully run by the Implementer's validation | M | A driver regression unseen until tests | Per-task pure checks gate structure with fake pages; Level 3 runs a real page when Chromium launches and prints a distinct SKIP line otherwise |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Existing tests likely to go stale by design (for the test pair, `EXISTING_TEST_UPDATED`; the Implementer must not edit any of them):** `scripts/validate/checks/qa-run-scoped-locators.test.mjs` around 299-336 (the refused-combination table, if it lists `within` + `role` with no name/prefix/index as refused), 378-391 (`scopeOf` hostile inputs, only if one passes the opt-in `allowAnchor`; the default path is unchanged) and 406 (`locatorOf({ role: 'button' })` — expected to KEEP passing, this plan leaves the plain path alone); `qa-run-absence-state.test.mjs` 142-155 (`expect_not_visible` with a role and no name: still refused, expected to keep passing); `qa-run-model-judgment.test.mjs` 76-86 (`judge` `within` shape, unchanged); `qa-run-vocabulary-pins.test.mjs` and `qa-run.test.mjs` if they pin the exact error sentence of `expect_text needs a string contains` (it becomes `expect_text needs a string contains or a pattern`). The corpus is not a gate for this phase; it is the gate of Phase 7 (AC-17).
- **`npm run validate` stays 28/28 without a doc edit.** `qa-run-contract.mjs` (132-133, 744-768) checks that each marked example in `plugins/relay/commands/relay-qa-run.md` validates through `validateStep`, plus a fixed token list and one example per existing action; it does not require an example per schema key. This phase only adds or loosens vocabulary, so every existing example still validates. The command-doc examples and the rule text for the new keys are Phase 7 (AC-15).
- **Decisions stated here.** (1) The role-only target is a new `role-any` kind inside the scoped form, so `locatorOf`'s plain path (and its pinned `role and name go together`) is untouched and a role-only step without `within` is refused by the existing rule. (2) `scopeOf` takes an opt-in second argument so the `judge` step keeps its 0.47.0 `within` shape. (3) `anchor_text` is refused on `fill` and `expect_value` (value masks are built before the step runs, `qa-run.mjs:3837-3838`) and with a role-only target. (4) The anchor must be one visible element (`getByText(..., { exact: true })`, `isVisibleToPerson`); the container walk uses a fixed xpath constant and `getByRole(role).count()`, so no planner text reaches a selector. (5) A role-only presence whose scope matches nothing is the v3 scope-guard `needs-human` `STEP_UNGROUNDED`; only an absent target inside a resolved scope is the phase-2 `fail`. (6) `pattern` reads `innerText` (visible text) through `settleAssertion`; no read text, pattern name or anchor text is written to any reason or evidence, and the step record keeps only its result and fixed reason.
- Run commands from the worktree root. Prefix git invocations with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` on this Windows host (each block exports it); write files with LF line endings.
- Research: `research-codebase`-equivalent reads of `qa-run.mjs` (schema, grounding, locator resolution, step runner) and `qa-run-contract.mjs` were performed by a read-only subagent; `research-web` was not dispatched, because Playwright's `getByRole`/`getByText` and `addLocatorHandler` semantics are already in the PRD's Research Summary and this phase uses only `getByRole`, `getByText`, `innerText` and `count`.

*Generated: 2026-10-25*
*Approved: 2026-10-25*
*Implemented: 2026-10-25*
*Status: IMPLEMENTED*
