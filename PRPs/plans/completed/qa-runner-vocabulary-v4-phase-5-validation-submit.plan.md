# Feature: Validation submit (Phase 5 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` plan vocabulary and schema validation, the dedicated-role gate, `results.json` step evidence); new interaction with the local application (a validation submit that issues requests) under the local-only guard and the dedicated-role rule; cross-cutting artifact (`plan.json` and `results.json` are read by downstream stages and the dogfood kit)
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): item 7 (writes only for roles declared `dedicated`), item 6 (report-word locators resolve at run time), item 11 (environment signals stay outside the reason-code catalogue)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent, outward effects from the local backend stay the project's local stand-ins
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` Decisions Log: validation submit kept, with dedicated role and the report's own literal (operator, 2026-10-23); interactions stop after a failed assertion
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons are fixed sentences, never page text or a typed value
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the request evidence keeps method, host and path only (no query string, body or header) and the refusal reasons never carry the typed literal
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": tests that pin the old single-value `effect` are updated only by the test pair
  - "Relying on interactive permission prompts in the autonomous loop": the gate is structural and non-interactive
- Applicable architectural rules:
  - Command versus script separation: the script validates, gates, executes and records
  - The local-only guard is a hard failure at every network- or store-touching site: a non-local request in the submit window blocks the case
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - R-X strict: the Implementer authors zero test files
  - PRP artifact paths: plan under `PRPs/plans/`, run evidence under `PRPs/reports/<feature>/qa-run/<run-id>/`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 5: "Validation submit" — Goal: execute a report's "type an invalid value and submit" steps safely — Success signal: AC-11 holds on fixtures.

## Summary

`effect` gains a second legal value, `"validation"`, valid on a `click` only. A validation click is schema-valid only when an earlier `fill` of the same case carries a value that appears verbatim (whitespace collapsed, case-insensitive) in the case's manual steps; otherwise the whole entry is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested. The entry-level dedicated-role gate that guards `effect: "write"` now guards both values: a role the kit does not declare `dedicated` ends `blocked` `ROLE_NOT_DEDICATED` before any query module, target, seed, session or request. When the role is dedicated the click runs like any click, the case's request log is kept (as for `expect_requests`), and after a fixed settle window the requests the click issued are written to its step evidence as method, host and path only (capped list, same redaction as `expect_requests`); a request to a host the guard does not approve blocks the case `FAILED_NON_LOCAL_TARGET`. `ground --prefix` is untouched and keeps refusing any step carrying an `effect`. `effect: "write"` keeps its exact semantics.

## User Story

As the AI session that plans and runs a QA report's cases
I want to submit a form with the invalid value the report itself gives, on a dedicated role, and have the requests it issues recorded
So that the report's error-message steps (S-4 holds 15 of super-ensino's 63) are executed instead of landing on the human gate.

## Problem Statement

An error message reachable only after a validation submit keeps S-4's 15 steps out of the runner: a click that submits a form is a state-changing action, and v3 has no way to declare one that is safe. Without it, super-ensino is capped at 48/63 and the 90% target is unreachable (PRD Core Capabilities, Decisions Log "Validation submit").

## Solution Statement

Reuse the existing gate and the existing request-observation machinery rather than add a parallel path. `stepRules` accepts the new value on `click` only; a pure `validateValidationSubmits` enforces the report-literal rule from the case's manual steps beside `validateJudgeCriteria`; `firstEffectStep` lets the existing dedicated-role gate cover both values while `firstWriteStep` stays as is; the browser driver's request log opens for a case that carries a validation click and a new `recordValidationSubmit` writes the window to evidence after the click, using the `expect_requests` evidence file name and redaction. Nothing about `continuesAfterFailure`, the gap/truncation rules or `parseGroundPrefix` needs code: a validation click is a `click` carrying an `effect`, so it is already an interaction that stops after a failed assertion (phase 3) and, when ungrounded, a truncating interaction gap (phase 1).

## Metadata

| Key | Value |
|-----|-------|
| Type | Enhancement |
| Complexity | Medium |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs` (schema, report-literal rule, dedicated-role gate, browser driver, request evidence) |
| Dependencies | Phase 1 (per-step gaps, truncation) and phase 4 (assertion vocabulary), both complete in the working tree; phase 3's `continuesAfterFailure` is relied on unchanged |
| Estimated Tasks | 3 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 83, 156-163, 211-214 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 83, 163, 170, 211-214 | AC-11, the Architecture Note (validation submit is a `click` variant gated like a write, requests recorded with the `expect_requests` evidence shape), the Technical Risk row, Phase 5 details |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1425-1441 | `stepRules` head and the `effect` validation to extend |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1617-1637 | `firstWriteStep` and `isDedicatedRole`: the gate helpers (`firstWriteStep` stays unchanged) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1745-1757 | `validateJudgeCriteria`: the report-verbatim rule the new literal rule mirrors |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 5105-5123 | the per-case validation order and the dedicated-role gate |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3911-3952, 3981-3986, 3999-4008 | `watchesRequests`, the request log, `settle`, the locator-step result handling and the selector-form click site |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 4049-4092 | the `expect_requests` branch: the evidence write the validation evidence reuses |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 2335-2450 | the request-observation block (`classifyObservedRequest`, `settleRequestWindow`, `observeRequests`, `EXPECT_REQUESTS_EVIDENCE_MAX`); new code goes after `// REQUEST-OBSERVATION-END`, never inside the markers |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1951-1960 | `ASSERTION_CONTINUES_ACTIONS` and `continuesAfterFailure`: read-only, to confirm the interaction rule |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 5527-5547 | `parseGroundPrefix`: read-only, to confirm `effect` is already refused through the per-action key list |

## Patterns to Mirror

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1436-1441
  // `effect` declares a step that changes state. Its one legal value is "write", and only a click, a fill or an
  // http request can carry it; a reason names the key, never a value.
  if (s.effect !== undefined) {
    if (s.effect !== 'write') return bad('effect must be "write" when present');
    if (s.action !== 'click' && s.action !== 'fill' && s.action !== 'request') return bad('effect applies only to click, fill and request steps');
  }
```
Copied by Task 1: the reason names the key and never a value; the `"write"` branch keeps the exact existing second sentence.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1621-1637
export function firstWriteStep(steps) {
  return Array.isArray(steps) ? steps.findIndex((s) => isObj(s) && s.effect === 'write') : -1;
}

export function isDedicatedRole(loginConfig, role) {
  if (!isObj(loginConfig) || !isObj(loginConfig.roles) || !isStr(role) || !Object.hasOwn(loginConfig.roles, role)) return false;
  const entry = loginConfig.roles[role];
  return isObj(entry) && entry.dedicated === true;
}
```
Copied by Task 1: `firstEffectStep` has the same pure, total, zero-based shape; `firstWriteStep` and `isDedicatedRole` are not edited.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1745-1757
export function validateJudgeCriteria(steps, manualText) {
  if (!Array.isArray(steps)) return null;
  const flat = (/** @type {string} */ t) => t.replace(/\s+/g, ' ').trim();
  const report = isStr(manualText) ? flat(manualText) : null;
  for (const [i, s] of steps.entries()) {
    if (!isObj(s) || s.action !== 'judge') continue;
    const criterion = isStr(s.criterion) ? flat(s.criterion) : '';
    if (report === null || criterion === '' || !report.includes(criterion)) {
      return { code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: the judge criterion must appear verbatim in the case's manual steps` };
    }
  }
  return null;
}
```
Copied by Task 1: `validateValidationSubmits` is a pure, total function over `(steps, manualText)` returning the first refusal or null, whose reason names a step position and never the literal.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:5115-5123
  const invalidJudge = validateJudgeCriteria(p.steps, kase.manual_steps_verbatim);
  if (invalidJudge) return out(needsHuman(invalidJudge.code, invalidJudge.reason));
  const writeAt = firstWriteStep(p.steps);
  if (writeAt !== -1) {
    const kitConfig = ctxOrNull ? ctxOrNull.loginConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json'));
    if (!isDedicatedRole(kitConfig, role)) {
      return out(blocked('ROLE_NOT_DEDICATED', `step ${writeAt + 1}: ${REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason}`));
    }
  }
```
Copied by Task 2: the literal rule joins right after the judge rule and before the gate; the gate keeps its exact refusal sentence and `step N: ` prefix.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:3911-3913
  const watchesRequests = plan.steps.some((/** @type {any} */ s) => isObj(s) && s.action === 'expect_requests');
  /** @type {{ method: string, host: string, path: string, local: boolean }[] | null} */ let requestLog = null;
  let windowStart = 0;
```
Copied by Task 3: the request log (and the blocked service workers) open for a case that carries a validation click too; the window already starts at every `goto`, `click` and `fill` (line 3964).

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:4054-4088
        // The wait comes first and the slice after it, so a request a handler issues once the click returned is counted.
        const seen = await settleRequestWindow(requestLog, windowStart);
        const decided = evaluateRequestWindow(seen, step);
        if (decided.status === 'non-local') {
          if (settle(blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a matching request targeted a host the local-only guard does not approve; it was aborted and nothing was asserted`), i, step)) continue;
          break;
        }
        try {
          queryEvidence.set(
            i,
            writeEvidence(ctx, `case-${kase.index}.requests-${n}.json`, {
              kind: 'json',
              value: {
                action: 'expect_requests',
                step: n,
                method: step.method,
                expected: step.count,
                observed: decided.observed,
                truncated: decided.observed > EXPECT_REQUESTS_EVIDENCE_MAX,
                requests: decided.matching.slice(0, EXPECT_REQUESTS_EVIDENCE_MAX).map((m) => ({
                  method: m.method,
                  host: m.host,
                  path: redactText(m.path, ctx.table).slice(0, 200),
                })),
                result: decided.status,
              },
            }),
          );
        } catch {
          if (settle(blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the request evidence could not be written`), i, step)) continue;
          break;
        }
```
Copied by Task 3: settle first, slice after; method, host and redacted-then-cut path only; the same evidence file name, cap and the two fixed blocked sentences' shape.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1958-1960
export function continuesAfterFailure(step) {
  return isObj(step) && ASSERTION_CONTINUES_ACTIONS.includes(step.action) && step.effect === undefined;
}
```
Read by Task 3 (not copied): `click` is not in `ASSERTION_CONTINUES_ACTIONS` and a step with an `effect` never continues, so a validation click needs no change here and stops the case after a failed assertion.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | `STEP_EFFECTS`, the `stepRules` effect rule, `firstEffectStep`, `validateValidationSubmits`, the per-case literal rule and gate, `watchesRequests`, `summarizeValidationWindow`, `recordValidationSubmit` and its two call sites (AC-11) |

## NOT Building (Scope Limits)

- Any edit to a test file. Tests that pin the single legal `effect` value go stale by design (see Notes) and are updated by the test pair.
- `plugins/relay/commands/relay-qa-run.md` (the `effect: "validation"` example with its `<!-- qa-step-example driver=… -->` marker, the vocabulary and gate rules, the catalogue row wording), `documentation/`, the version bump and changelog: Phase 7 (AC-15, AC-17, AC-18).
- Rewording the `ROLE_NOT_DEDICATED` catalogue sentence ("a write step names a role…"). Tests assert that sentence verbatim and the doc table repeats it; a validation submit reuses it unchanged until Phase 7 rewords code and doc together.
- Any change to `parseGroundPrefix`, `GROUND_PREFIX_ACTIONS` or `replayGroundingPrefix`: `ground --prefix` already refuses a key outside each action's fixed list, `effect` among them. This phase asserts it and does not edit it.
- Any change to `continuesAfterFailure`, `ASSERTION_CONTINUES_ACTIONS`, `groundLocators`, the gap kinds or `truncateAt`.
- `effect: "validation"` on `fill`, `request`, `goto` or any assertion; a validation submit on the `http` driver; a second validation literal source (a literal from a snapshot or a capture never qualifies).
- Any change to `effect: "write"` semantics, `firstWriteStep` or `isDedicatedRole`.
- Overlay handlers (Phase 6), the dogfood kit fixes and seeds (Phase 8), the S-4 phone-modal literal (PRD Open Question 1).
- Writing a typed literal, a locator word or a request query/body/header into any reason or evidence.
- The frozen files: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`.
- A new `npm run validate` check (the count stays 28).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — schema: the `validation` effect, `firstEffectStep`, the report-literal rule

- **ACTION**: Satisfies AC-A3, AC-A4 and AC-A5. (a) Beside `firstWriteStep` (`qa-run.mjs:1617`) add `export const STEP_EFFECTS = Object.freeze(['write', 'validation']);` and `export function firstEffectStep(steps)`: pure and total, the zero-based index of the first step that is an object whose `effect` is a member of `STEP_EFFECTS`, or -1 (same shape as `firstWriteStep`, which is NOT edited). (b) In `stepRules` replace the `effect` block (`qa-run.mjs:1438-1441`) so that: an `effect` that is not a member of `STEP_EFFECTS` returns `bad('effect must be "write" or "validation" when present')`; an `effect` of `'validation'` on any action other than `click` returns `bad('effect "validation" applies only to click steps')`; an `effect` of `'write'` keeps its exact existing rule and sentence (`'effect applies only to click, fill and request steps'`). Nothing else in `stepRules` changes (a validation click needs no other key: it is an ordinary `click`, role+name/text/selector forms alike). (c) After `validateJudgeCriteria` (`qa-run.mjs:1745-1757`) add `export function validateValidationSubmits(steps, manualText)`: pure and total, returns the first refusal or null. For each step at index `k` that is an object with `action === 'click'` and `effect === 'validation'` it requires an EARLIER step (index below `k`) that is a `fill` whose `value` is a string that (1) holds no `{{name}}` binding (use `VARIABLE_PATTERN`), (2) once whitespace is collapsed and trimmed has at least `CHOSEN_LITERAL_MIN` characters, and (3) appears inside the case's manual steps once both are whitespace-collapsed and lower-cased (case-insensitive). When `manualText` is not a string, or no earlier fill qualifies, return `{ code: 'PLAN_ENTRY_INVALID', reason: `step ${k + 1}: a validation submit needs an earlier fill step in the same case whose value appears verbatim in the case's manual steps` }`. The reason names a step position and never a value. A `write` click and every other step are ignored by this function. Do NOT edit `parseGroundPrefix`, `continuesAfterFailure`, `ASSERTION_CONTINUES_ACTIONS` or `REASON_CATALOGUE`: `ground --prefix` keeps refusing any step carrying an `effect` through its existing per-action key list (AC-A4), and a validation click, being a `click` with an `effect`, already stops the case after a failed assertion (AC-A5).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1436-1441`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:1621-1637` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1745-1757`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const v = (s) => m.validateStep("browser", s);
  const goto = { action: "goto", path: "/form" };
  const fillOk = { action: "fill", role: "textbox", name: "E-mail", value: "not-an-email" };
  const submit = { action: "click", role: "button", name: "Validar", effect: "validation" };
  const seen = { action: "expect_visible", text: "E-mail inválido" };
  assert.deepEqual([...m.STEP_EFFECTS], ["write", "validation"]);
  assert.ok(Object.isFrozen(m.STEP_EFFECTS));
  // schema: validation is a click-only value; write keeps its rule
  assert.equal(v(submit), null);
  assert.equal(v({ action: "click", selector: "#go", effect: "validation" }), null);
  assert.equal(v({ action: "click", role: "button", name: "Salvar", effect: "write" }), null);
  assert.equal(v({ action: "fill", role: "textbox", name: "E-mail", value: "x", effect: "write" }), null);
  for (const bad of [
    { ...fillOk, effect: "validation" },
    { ...goto, effect: "validation" },
    { ...seen, effect: "validation" },
    { action: "click", role: "button", name: "Validar", effect: "Validation" },
    { action: "click", role: "button", name: "Validar", effect: "delete" },
    { action: "click", role: "button", name: "Validar", effect: true },
  ]) { const r = v(bad); assert.ok(r !== null && r.code === "PLAN_ENTRY_INVALID", JSON.stringify(bad)); }
  assert.equal(m.validateStep("http", { action: "request", method: "POST", path: "/x", effect: "validation" }).code, "PLAN_ENTRY_INVALID");
  assert.equal(m.validateStep("http", { action: "request", method: "POST", path: "/x", effect: "write" }), null);
  assert.equal(m.validateSteps("browser", [goto, fillOk, submit, seen]), null);
  // the gate helpers: the new one sees both values, the old one still sees only write
  assert.equal(m.firstEffectStep([goto, fillOk, submit]), 2);
  assert.equal(m.firstEffectStep([goto, { action: "click", selector: "#s", effect: "write" }, submit]), 1);
  assert.equal(m.firstEffectStep([goto, seen]), -1);
  assert.equal(m.firstEffectStep(null), -1);
  assert.equal(m.firstWriteStep([goto, fillOk, submit]), -1, "firstWriteStep must not see a validation submit");
  // the report-literal rule
  const report = "Open the page,\n  type  Not-An-Email in the E-mail field, then click Validar and see the error";
  assert.equal(m.validateValidationSubmits([goto, fillOk, submit, seen], report), null, "whitespace and case are folded");
  assert.equal(m.validateValidationSubmits([goto, { ...fillOk, value: "the \t E-mail   field" }, submit], report), null, "a run of spaces or tabs between two report words collapses to one space");
  assert.equal(m.validateValidationSubmits([goto, { ...fillOk, value: "Open the page,\n  type" }, submit], report), null, "a literal spanning the report line break collapses the same way");
  assert.equal(m.validateValidationSubmits([goto, { ...fillOk, value: "Not-An-Email" }, { action: "fill", role: "textbox", name: "Other", value: "zz-not-in-report" }, submit], report), null, "any earlier qualifying fill is enough");
  const refused = [
    [[goto, submit], report],
    [[goto, submit, fillOk], report],
    [[goto, { ...fillOk, value: "outro-texto" }, submit], report],
    [[goto, { ...fillOk, value: "{{email}}" }, submit], report + " {{email}}"],
    [[goto, { ...fillOk, value: "no" }, submit], "no " + report],
    [[goto, { ...fillOk, value: "not-an- email" }, submit], report],
    [[goto, { ...fillOk, value: "not-an-\nemail" }, submit], report],
    [[goto, { action: "click", role: "button", name: "Abrir" }, submit], report],
    [[goto, fillOk, submit], null],
    [[goto, fillOk, submit], undefined],
  ];
  for (const [steps, text] of refused) {
    const r = m.validateValidationSubmits(steps, text);
    assert.ok(r !== null && r.code === "PLAN_ENTRY_INVALID", JSON.stringify([steps, text]));
    assert.match(r.reason, /^step \d+: a validation submit needs an earlier fill/);
    assert.ok(!/outro-texto|not-an-email|email/i.test(r.reason), "the reason never carries a value");
  }
  assert.equal(m.validateValidationSubmits([goto, { action: "click", role: "button", name: "Salvar", effect: "write" }], report), null, "a write click needs no literal");
  assert.equal(m.validateValidationSubmits([goto, seen], null), null);
  assert.equal(m.validateValidationSubmits("x", report), null);
  // ground --prefix still refuses any step carrying an effect
  for (const effect of ["validation", "write"]) {
    const g = m.parseGroundPrefix(JSON.stringify([{ action: "goto", path: "/form" }, { action: "click", role: "button", name: "Validar", effect }]));
    assert.equal(g.ok, false, effect);
  }
  '
  ```
  Exits non-zero on the current tree (`STEP_EFFECTS`, `firstEffectStep` and `validateValidationSubmits` do not exist) and whenever `validation` is accepted on a non-click action, an unknown or wrongly cased effect is accepted, `firstWriteStep` starts seeing a validation click, the literal rule accepts a missing, later, unreported, bound or too-short fill (or a non-string report), a reason carries a value, or `ground --prefix` accepts an `effect`.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — per-case order: the literal rule, then the dedicated-role gate for both effects

- **ACTION**: Satisfies AC-A2 and AC-A3. In the per-case function (`qa-run.mjs:5115-5123`): (a) directly after the `validateJudgeCriteria` refusal add `const invalidSubmit = validateValidationSubmits(p.steps, kase.manual_steps_verbatim);` followed by `if (invalidSubmit) return out(needsHuman(invalidSubmit.code, invalidSubmit.reason));`, so a validation click with no report literal is `PLAN_ENTRY_INVALID` for the whole entry before the gate, the query module, the target, any seed, session or request. (b) Replace `const writeAt = firstWriteStep(p.steps);` and its uses in the gate with `const effectAt = firstEffectStep(p.steps);` (`if (effectAt !== -1) {`, and `step ${effectAt + 1}: ${REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason}` in the refusal). The kit-config read, the `isDedicatedRole(kitConfig, role)` test, the `blocked('ROLE_NOT_DEDICATED', …)` result and the catalogue sentence stay byte-identical, so a role that is not dedicated (including an anonymous `null` role) is `blocked` `ROLE_NOT_DEDICATED` before any session for a validation click exactly as for a write. The gate is entry-level and runs before grounding, so it applies even when the click would later be truncated as an ungrounded interaction (conservative, same as a write). Read the file for any other call site of `firstWriteStep` that guards a run (the subagent survey found one); if another guards execution, apply the same replacement there, otherwise leave `firstWriteStep` exported and unused-in-gate.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:5115-5123`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const once = (frag) => { const parts = src.split(frag); assert.equal(parts.length - 1, 1, `${frag} must appear exactly once, found ${parts.length - 1}`); return src.indexOf(frag); };
  const judge = once("validateJudgeCriteria(p.steps, kase.manual_steps_verbatim)");
  const submit = once("validateValidationSubmits(p.steps, kase.manual_steps_verbatim)");
  const effect = once("firstEffectStep(p.steps)");
  const dedicated = once("isDedicatedRole(kitConfig, role)");
  const query = once("hasQuery ? await loadQueryModule()");
  assert.ok(judge < submit && submit < effect && effect < dedicated && dedicated < query, "order: judge, literal rule, effect gate, dedicated test, query module");
  assert.equal(src.split("firstWriteStep(p.steps)").length - 1, 0, "the gate no longer calls firstWriteStep");
  const gate = src.slice(effect, dedicated + 200);
  assert.ok(gate.includes("effectAt + 1"), "the refusal names the position of the first effect step");
  assert.ok(gate.includes("REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason"), "the catalogue sentence is reused unchanged");
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.equal(typeof m.firstWriteStep, "function", "firstWriteStep stays exported");
  assert.ok(m.REASON_CATALOGUE.ROLE_NOT_DEDICATED.reason.startsWith("a write step names a role the kit does not declare dedicated"), "catalogue sentence untouched");
  '
  ```
  Exits non-zero on the current tree (no `validateValidationSubmits` call, no `firstEffectStep` call, `firstWriteStep(p.steps)` still present) and whenever the literal rule runs after the gate or the query module, the gate stops covering a write, a fragment is duplicated, or the catalogue sentence is changed. The behaviour is checked end to end by Level 3.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — run the validation click and record the requests it issues

- **ACTION**: Satisfies AC-A1 and AC-A5. (a) After the `// REQUEST-OBSERVATION-END` marker (`qa-run.mjs:2450`; never inside the BEGIN/END markers) add `export function summarizeValidationWindow(window)`: pure and total. For a non-array input it behaves as an empty window. When any entry of the window is an object whose `local` is not `true` it returns `{ status: 'non-local' }`. Otherwise it returns `{ status: 'recorded', observed, truncated, requests }` where `observed` is the number of entries that are objects with string `method`, `host` and `path`, `truncated` is `observed > EXPECT_REQUESTS_EVIDENCE_MAX`, and `requests` is the first `EXPECT_REQUESTS_EVIDENCE_MAX` of them mapped to `{ method, host, path }` only (no other key is ever copied). (b) Right after it add `async function recordValidationSubmit(ctx, kase, requestLog, windowStart, n)` returning `{ evidence: string } | { result: CaseResult }`: when `requestLog === null` return `{ result: notPerformable(`step ${n}: the request log is not available; the requests of the validation submit were not recorded`) }`; otherwise `const seen = await settleRequestWindow(requestLog, windowStart);` (the wait comes first, the slice after it) then `const summary = summarizeValidationWindow(seen);`; for `non-local` return `{ result: blocked('FAILED_NON_LOCAL_TARGET', `step ${n}: a request of the validation submit targeted a host the local-only guard does not approve; it was aborted`) }`; otherwise write `writeEvidence(ctx, `case-${kase.index}.requests-${n}.json`, { kind: 'json', value: { action: 'click', effect: 'validation', step: n, observed: summary.observed, truncated: summary.truncated, requests: summary.requests.map((m) => ({ method: m.method, host: m.host, path: redactText(m.path, ctx.table).slice(0, 200) })), result: 'recorded' } })` inside a `try` and return `{ evidence }`; a write failure returns `{ result: blocked('EVIDENCE_WRITE_FAILED', `step ${n}: the request evidence could not be written`) }`. The file name and the redact-then-cut path are those of `expect_requests`; no query string, fragment, header, body, locator word or typed value reaches any field or sentence. (c) In the browser driver change the `watchesRequests` line (`qa-run.mjs:3911`) to `const watchesRequests = plan.steps.some((/** @type {any} */ s) => isObj(s) && (s.action === 'expect_requests' || s.effect === 'validation'));` so the request log opens and service workers are blocked for a case that carries a validation click; the existing `windowStart = requestLog.length` at every goto/click/fill (line 3964) already opens the window before the click's own requests. (d) Wire the recording after the click succeeded, at both click sites, with the identical block: in the locator-form branch, after the `if (lr !== null) { … }` block and before its closing `continue;` (`qa-run.mjs:3981-3985`), and in the selector-form branch, after the `try { … } catch { … }` of the `click`/`fill` site and before the `else if (step.action === 'query')` branch (`qa-run.mjs:4004-4009`), insert `if (step.action === 'click' && step.effect === 'validation') { const rec = await recordValidationSubmit(ctx, kase, requestLog, windowStart, n); if ('result' in rec) { if (settle(rec.result, i, step)) continue; break; } queryEvidence.set(i, rec.evidence); }` (in the locator branch the `lr === null` case is the only one that reaches the insertion, because a non-null `lr` already settled and left). A validation click that fails to act (covered, disabled, absent) ends `blocked` `STEP_NOT_PERFORMABLE` with its closed cause (phase 2) and records nothing. Interaction rules, stated and not coded: the validation click is a `click` carrying an `effect`, so after a failed assertion it is recorded `not-run` with the phase-3 fixed sentence and the page is not touched (`continuesAfterFailure` is false); if its locator is ungrounded it is an interaction gap, so it is `human` `STEP_UNGROUNDED` and every later step is truncated (phase 1), and it never runs or records; an ungrounded or failed earlier `fill` that truncates the case likewise stops the click before it runs. After the click the following assertions (the error message) run normally and keep continuing after a failure.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:3911-3913` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:4054-4088`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  const Q = String.fromCharCode(39);
  const e = (method, path, local = true) => ({ method, host: "127.0.0.1:9", path, local, query: "secret=1", body: "b" });
  // the pure summary
  const one = m.summarizeValidationWindow([e("POST", "/api/validate"), e("GET", "/a")]);
  assert.deepEqual(one, { status: "recorded", observed: 2, truncated: false, requests: [{ method: "POST", host: "127.0.0.1:9", path: "/api/validate" }, { method: "GET", host: "127.0.0.1:9", path: "/a" }] });
  assert.deepEqual(Object.keys(one.requests[0]), ["method", "host", "path"], "only method, host and path are ever copied");
  assert.deepEqual(m.summarizeValidationWindow([]), { status: "recorded", observed: 0, truncated: false, requests: [] });
  assert.deepEqual(m.summarizeValidationWindow(null), { status: "recorded", observed: 0, truncated: false, requests: [] });
  assert.deepEqual(m.summarizeValidationWindow([e("POST", "/ok"), e("GET", "/x", false)]), { status: "non-local" });
  const many = Array.from({ length: m.EXPECT_REQUESTS_EVIDENCE_MAX + 10 }, (_, k) => e("GET", `/r${k}`));
  const capped = m.summarizeValidationWindow(many);
  assert.equal(capped.requests.length, m.EXPECT_REQUESTS_EVIDENCE_MAX); assert.equal(capped.observed, many.length); assert.equal(capped.truncated, true);
  // the driver wiring: narrow slices around fragments that appear once, or are counted
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const watch = "(s.action === " + Q + "expect_requests" + Q + " || s.effect === " + Q + "validation" + Q + ")";
  assert.equal(src.split(watch).length - 1, 1, "the request log opens for a validation click");
  assert.equal(src.split("await recordValidationSubmit(").length - 1, 2, "one call per click site");
  const callAt = src.indexOf("await runLocatorStep(page, step, lstep, n,");
  assert.ok(callAt > -1);
  const first = src.indexOf("await recordValidationSubmit(", callAt);
  const gotoAt = src.indexOf("const url = resolveStepUrl(step.path, target);", callAt);
  assert.ok(first > callAt && first < gotoAt, "the locator-form call sits after runLocatorStep and before the goto branch");
  const fillAt = src.indexOf("await page.fill(step.selector, step.value);", callAt);
  const queryAt = src.indexOf("await runQueryStep(ctx, kase, step, n)", fillAt);
  const second = src.indexOf("await recordValidationSubmit(", first + 1);
  assert.ok(fillAt > -1 && second > fillAt && second < queryAt, "the selector-form call sits after the click site and before the query branch");
  // the recorder: its own evidence name, no planner word in any sentence
  const defAt = src.indexOf("async function recordValidationSubmit(");
  const body = src.slice(defAt, src.indexOf("\n}\n", defAt));
  assert.ok(body.includes("case-${kase.index}.requests-${n}.json"), "the expect_requests evidence file name is reused");
  assert.ok(body.includes("await settleRequestWindow(requestLog, windowStart)"), "settle first, slice after");
  assert.ok(body.includes("redactText(m.path, ctx.table).slice(0, 200)"), "redact, then cut");
  assert.ok(!/\$\{[^}]*(step\.|selector|\.name|\.value|\.text|\.role)[^}]*\}/.test(body.replace("${kase.index}", "")), "no sentence interpolates a planner word");
  // the recorder is placed after the observation block, never inside its markers
  assert.ok(defAt > src.indexOf("// REQUEST-OBSERVATION-END"), "new code is outside the observation markers");
  // continuation is untouched: a validation click is an interaction
  assert.equal(m.continuesAfterFailure({ action: "click", role: "button", name: "Validar", effect: "validation" }), false);
  assert.deepEqual([...m.ASSERTION_CONTINUES_ACTIONS], ["expect_visible", "expect_text", "expect_url", "expect_value", "expect_not_visible", "expect_state", "expect_requests", "query", "judge"]);
  '
  ```
  Exits non-zero on the current tree (no `summarizeValidationWindow`, no `recordValidationSubmit`, `watchesRequests` ignores `effect`) and whenever the summary copies a key beyond method/host/path, a non-local request is recorded instead of blocking, the cap is lost, a click site is left without the recording, the recording runs before the click returned, the evidence name or redaction differs from `expect_requests`, or `continuesAfterFailure` starts continuing past a validation click. Browser behaviour is checked by Level 3.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --check plugins/relay/scripts/qa-run.mjs
git diff --check
npm run validate
```
`npm run validate` runs the repo's 28 static consistency checks and must keep passing with the count unchanged. The `qa-run-contract` check passes every marked example of `relay-qa-run.md` through `validateStep`, checks a fixed token list and the reason-code table (`ROLE_NOT_DEDICATED` is already listed), and requires no example per `effect` value; this phase adds vocabulary and leaves the catalogue and the command doc untouched, so no doc edit is needed to stay 28/28. If a check does go red, fix the named invariant in the smallest way and record it in the implementation report; do not defer a red validate.

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
// the new vocabulary exists and write keeps its semantics
assert.deepEqual([...m.STEP_EFFECTS], ["write", "validation"]);
for (const name of ["firstEffectStep", "validateValidationSubmits", "summarizeValidationWindow"]) assert.equal(typeof m[name], "function", name);
assert.equal(m.validateStep("browser", { action: "click", selector: "#s", effect: "write" }), null);
assert.equal(m.validateStep("browser", { action: "expect_visible", selector: "#s", effect: "write" }).code, "PLAN_ENTRY_INVALID");
assert.equal(m.firstWriteStep([{ action: "click", selector: "#s", effect: "write" }]), 0);
assert.equal(m.continuesAfterFailure({ action: "expect_visible", selector: "#s" }), true);
assert.equal(m.continuesAfterFailure({ action: "click", selector: "#s", effect: "validation" }), false);
// the catalogue and the ground prefix are untouched
assert.ok(m.RUNNER_OWNED_REASON_CODES.includes("ROLE_NOT_DEDICATED"));
assert.equal(m.reasonClassOf("ROLE_NOT_DEDICATED"), "gap");
const gp = src.indexOf("export function parseGroundPrefix(");
const gpBody = src.slice(gp, src.indexOf("\n}\n", gp));
assert.ok(!gpBody.includes("effect"), "ground --prefix names no effect: it refuses it through the per-action key list");
assert.equal(m.parseGroundPrefix(JSON.stringify([{ action: "goto", path: "/" }, { action: "click", role: "button", name: "Validar", effect: "validation" }])).ok, false);
// the gate covers both values and sits before the query module
assert.ok(src.indexOf("firstEffectStep(p.steps)") > -1 && src.indexOf("firstEffectStep(p.steps)") < src.indexOf("hasQuery ? await loadQueryModule()"));
'
git diff --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs > "${TMPDIR:-/tmp}/relay-frozen-diff-p5.txt"
if test -s "${TMPDIR:-/tmp}/relay-frozen-diff-p5.txt"; then echo "FAIL: a frozen file changed"; exit 1; else echo "PASS: frozen files untouched"; fi
```

### Level 3 INTEGRATION

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
npm run validate
node --input-type=module -e '
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, symlinkSync, unlinkSync, rmdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const { validateResults } = await import("./scripts/validate/checks/qa-run-contract.mjs");
const RUN = "PRPs/reports/f/qa-run/r1";
const hits = {};
const FORM = `<!doctype html><html><body><h1>Panel</h1><input type="text" aria-label="E-mail"><button onclick="fetch(&quot;/api/validate&quot;,{method:&quot;POST&quot;}).then(()=>document.body.insertAdjacentHTML(&quot;beforeend&quot;,&quot;<div role=alert>E-mail inválido</div>&quot;))">Validar</button></body></html>`;
const server = createServer((req, res) => {
  const p = new URL(String(req.url), "http://x").pathname;
  const key = `${req.method} ${p}`;
  hits[key] = (hits[key] ?? 0) + 1;
  if (p === "/api/validate") { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(p === "/form" ? FORM : "<!doctype html><html><body><h1>Panel</h1></body></html>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const root = mkdtempSync(join(tmpdir(), "relay-p5-"));
const nm = join(root, "node_modules");
symlinkSync(resolve("node_modules"), nm, "junction");
let skip = false;
try {
  mkdirSync(join(root, ...RUN.split("/")), { recursive: true });
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  const manual = "1. Open the page, type not-an-email in the E-mail field, click Validar and see E-mail inválido";
  const block = (i) => [`### Case ${i}`, `**Title:** Case ${i} title`, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", manual, ""].join("\n");
  const goto = { action: "goto", path: "/form" };
  const fill = (value) => ({ action: "fill", role: "textbox", name: "E-mail", value });
  const submit = { action: "click", role: "button", name: "Validar", effect: "validation" };
  const seen = { action: "expect_visible", text: "E-mail inválido" };
  const cases = [
    { role: "admin", steps: [goto, fill("not-an-email"), submit, seen] },
    { role: "viewer", steps: [goto, fill("not-an-email"), submit, seen] },
    { role: "admin", steps: [goto, fill("outro-texto"), submit, seen] },
    { role: "admin", steps: [goto, submit, seen] },
  ];
  writeFileSync(join(root, "PRPs", "reports", "f", "qa-report.md"), `# QA Report\n\n## Test Cases\n\n${cases.map((_, i) => block(i + 1)).join("\n")}\n## Notes\n\nnone\n`);
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: { dedicated: true }, viewer: {} } }));
  for (const role of ["admin", "viewer"]) {
    writeFileSync(join(root, "PRPs", "auth", `login-${role}.mjs`), [
      `import { writeFileSync, mkdirSync } from "node:fs";`,
      `import { join } from "node:path";`,
      `const root = process.argv[process.argv.indexOf("--root") + 1];`,
      `mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });`,
      `writeFileSync(join(root, "PRPs", "auth", ".sessions", "${role}.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "tok-p5-fixture", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
    ].join("\n"));
  }
  writeFileSync(join(root, ...RUN.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: cases.map((c, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: "browser", role: c.role, state: "none", steps: c.steps })) }));
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
  const tag = (k) => JSON.stringify([k.outcome, k.reason_code, k.reason]);
  // AC-A3 and AC-A2 never need a browser: both end before any session, target or request
  assert.equal(c[1].outcome, "blocked", tag(c[1])); assert.equal(c[1].reason_code, "ROLE_NOT_DEDICATED"); assert.match(c[1].reason, /^step 3: /);
  assert.ok(!existsSync(join(root, "PRPs", "auth", ".sessions", "viewer.json")), "no session was obtained for the refused role");
  for (const i of [2, 3]) { assert.equal(c[i].outcome, "needs-human", tag(c[i])); assert.equal(c[i].reason_code, "PLAN_ENTRY_INVALID"); assert.match(c[i].reason, /^step \d+: a validation submit needs an earlier fill/); assert.ok(!c[i].reason.includes("outro-texto")); }
  if (c[0].reason_code === "FAILED_BROWSER_UNAVAILABLE") {
    skip = true;
  } else {
    // AC-A1: the dedicated role clicks, the error shows, the request is recorded
    assert.equal(c[0].outcome, "pass", tag(c[0]));
    assert.equal(hits["POST /api/validate"], 1, "exactly one validation request: only case 1 clicked");
    assert.equal(hits["GET /form"], 1, "the three refused cases never loaded the page");
    const dir = join(root, ...RUN.split("/"));
    const evFile = readdirSync(dir, { recursive: true }).map(String).find((f) => /case-1\.requests-3\.json$/.test(f));
    assert.ok(evFile, "the validation click wrote its request evidence next to the other run evidence");
    const ev = JSON.parse(readFileSync(join(dir, evFile), "utf8"));
    const value = ev.value ?? ev;
    assert.equal(value.action, "click"); assert.equal(value.effect, "validation"); assert.equal(value.step, 3); assert.equal(value.result, "recorded");
    assert.ok(value.requests.some((r) => r.method === "POST" && r.path === "/api/validate" && r.host === `127.0.0.1:${port}`), JSON.stringify(value));
    for (const r of value.requests) { assert.deepEqual(Object.keys(r).sort(), ["host", "method", "path"]); assert.ok(!r.path.includes("?")); }
    assert.ok(c[0].steps[2].evidence, "the click step record points at its evidence");
    assert.deepEqual(validateResults(results), []);
  }
} finally {
  try { unlinkSync(nm); } catch { try { rmdirSync(nm); } catch { } }
  if (!existsSync(nm)) rmSync(root, { recursive: true, force: true });
  server.closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
}
if (skip) console.log("SKIP-BROWSER-UNAVAILABLE: the runner could not launch Chromium here; the real-page validation-submit fixture is left to the test pair (the gate and the report-literal assertions above did run)");
'
```
Case 1 is the only one that clicks, so a correct run issues exactly one `POST /api/validate` and one `GET /form`; the other three cases end before any session or browser load (the viewer case proves it by leaving no `viewer.json` session). A run that prints `SKIP-BROWSER-UNAVAILABLE` did not exercise the real page but did exercise the gate and the report-literal refusals; a run that ends silently after the assertions exercised everything. The evidence file is located by walking the run directory for `case-1.requests-3.json`, so the assertion does not depend on the evidence sub-directory; the saved JSON may be wrapped by `writeEvidence`, which the script tolerates. The corpus `node --test "scripts/validate/**/*.test.mjs"` is NOT a gate for this phase (see Notes). The fixture lives in the OS temp directory, the `node_modules` junction is unlinked before the directory is removed so the repository `node_modules` is never reached, and nothing is written in the repository.

## Acceptance Criteria

- **AC-A1 (PRD AC-11):** Given a `click` with `"effect": "validation"` preceded in the same case by a `fill` whose value appears verbatim in the case's manual steps, when the role is declared `dedicated`, then the click runs and the requests it issues are recorded in its step evidence as method, host and path only (capped list, same file name and redaction as `expect_requests`); a request to a host the guard does not approve blocks the case `FAILED_NON_LOCAL_TARGET`.
- **AC-A2 (PRD AC-11):** When the role is not declared `dedicated` (a plain role, an anonymous role, a missing role), the case is `blocked` `ROLE_NOT_DEDICATED` before any session, seed, query module or request, with the catalogue sentence and the position of the first effect step, exactly as for `effect: "write"`.
- **AC-A3 (PRD AC-11):** When no preceding `fill` of the case carries a literal that appears in the case's manual steps (whitespace-collapsed, case-insensitive; not a `{{name}}` binding), the whole entry is `PLAN_ENTRY_INVALID` before anything is seeded, authenticated or requested; `effect` values outside `write` and `validation`, and `validation` on anything but a `click`, are `PLAN_ENTRY_INVALID`.
- **AC-A4 (PRD AC-11):** `ground --prefix` still refuses any step carrying an `effect`.
- **AC-A5 (PRD AC-11):** `effect: "write"` semantics are unchanged; a validation click is an interaction: it stops the case after a failed assertion (phase 3), and when ungrounded it is a truncating interaction gap (phase 1) that never runs or records.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A validation submit causes a real outward effect from the local backend | L | A real email or SMS from the local stack | Dedicated role only; only a literal the report itself gives; requests recorded; any non-local request is aborted by the guard route and blocks the case; outward effects from the backend stay the project's local stand-ins (decision 2026-09-25) |
| A planner passes a literal that is not the report's (an invented or captured value) | M | An unreported value is submitted | The literal rule is schema-level and verbatim against the case's manual steps; a `{{name}}` binding and values under 3 characters never qualify; Task 1 and Level 3 assert the refusals |
| The gate message says "a write step" for a validation submit | M | A slightly misleading sentence for the operator | Deliberate: the catalogue sentence and its doc row are pinned by tests and by the command doc; Phase 7 rewords code and doc together (Notes) |
| The settle window adds 2 seconds per validation click | M | Slower runs | The window is the existing `EXPECT_REQUESTS_SETTLE_MS`; one click per case is the expected use; recalibrated at the Phase 8 dogfood |
| A request evidence path or host carries a secret | L | A secret in an artifact | The log keeps method, host and pathname only (query and fragment never read); the path goes through `redactText` before the 200-character cut, as for `expect_requests` |
| An existing test pins the single legal `effect` value or its exact refusal sentence | H | Red corpus until the test pair runs | Expected and named in Notes; the corpus is not this phase's gate; a test contradicting AC-11 is a dispute for arbitration, not an Implementer edit |
| Browser behaviour cannot be fully run by the Implementer's validation | M | A driver regression unseen until tests | Per-task pure and source checks gate the structure; Level 3 runs a real page and prints a distinct SKIP line when Chromium cannot launch |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Existing tests likely to go stale by design (for the test pair, `EXISTING_TEST_UPDATED`; the Implementer must not edit any of them):** `scripts/validate/checks/qa-run-chosen-inputs.test.mjs` around 60-96 (effect-key tests: any assertion on the exact sentence `effect must be "write" when present`, or that `effect: "validation"` is refused; `firstWriteStep` at 95 is expected to keep passing), 391-466 (the `ROLE_NOT_DEDICATED` gate cases: expected to keep passing, the catalogue sentence and the `step N: ` prefix are unchanged), 513-514 and 546-550 (doc-example and token checks over `relay-qa-run.md`: unchanged, the doc is Phase 7's); `qa-run-assertion-continuation.test.mjs` 61-68 (effect on a click stops the case, an effect on an `expect_*` or `judge` step is refused: expected to keep passing); `qa-run-step-level-validation.test.mjs` 199 and 435 (invalid effect `'delete'`: still invalid, but the sentence changes); `qa-run-model-judgment.test.mjs:84` (`judge` with an effect: still refused). New coverage for AC-11 (the schema, the literal rule, the gate, the evidence) belongs to the test pair. The corpus is not a gate for this phase; it is the gate of Phase 7 (AC-17).
- **`npm run validate` stays 28/28 without a doc edit.** `qa-run-contract.mjs` checks that each marked example in `plugins/relay/commands/relay-qa-run.md` validates through `validateStep`, a fixed token list, one example per existing action, and that the reason-code table lists the runner-owned codes; it does not compare the set of legal `effect` values. Nothing here changes the catalogue or the doc, so no doc edit is needed. The doc still says (around lines 784-791 and 977) that `effect` has the single value `"write"`; that stale prose, the `effect: "validation"` example with its `<!-- qa-step-example driver=… -->` marker and the gate wording are Phase 7 (AC-15).
- **Decisions stated here.** (1) The gate stays one entry-level check on the first step carrying any effect (`firstEffectStep`), and `firstWriteStep` is kept exported and unchanged, so no existing caller or test changes meaning. (2) The refusal sentence is the existing catalogue sentence: the tests assert it verbatim, and it is reworded with its doc row in Phase 7. (3) The report-literal rule accepts ANY earlier `fill` of the case (not only the last one before the click), per AC-11's "preceded in the same case"; a literal from a snapshot or a capture never qualifies, and the literal is the report's own words, case-insensitive after whitespace collapse like the report-word rule. (4) The recorded window is every request in the click's settle window, not a filtered subset: the evidence says what the submit issued; the file name `case-<n>.requests-<step>.json` and the redact-then-cut path are those of `expect_requests`, so downstream readers (the worksheet kit, `validateResults`) meet a shape they already know, with `action: "click"` and `effect: "validation"` added. (5) Any non-local request in the window blocks the case `FAILED_NON_LOCAL_TARGET` (the guard route has already aborted it): the local-only guard is a hard failure at every network-touching site. (6) Interactions with earlier phases: the validation click carries an `effect`, so `continuesAfterFailure` is false and, after a failed assertion, it and every later step are `not-run` with the phase-3 sentence; ungrounded, it is an interaction gap and truncates the rest (phase 1) without ever running; a click that cannot act ends `blocked` `STEP_NOT_PERFORMABLE` with its closed cause (phase 2) and records nothing; the assertions after it, including the error message, run and continue normally. (7) The S-4 phone-modal half stays a named gap (PRD Open Question 1): the report gives no invalid literal for it, so the literal rule refuses a validation click there by design.
- Run commands from the worktree root. Prefix git invocations with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` on this Windows host (each block exports it); write files with LF line endings.
- Research: `research-codebase`-equivalent reads of `qa-run.mjs` (schema, the dedicated-role gate, the browser driver's step loop, the request-observation block, `parseGroundPrefix`), the `qa-run-contract` check and the existing tests that pin `effect` were performed by direct reads and a read-only survey subagent; `research-web` was not dispatched, because the phase uses only primitives already in the file (`settleRequestWindow`, `observeRequests`, `writeEvidence`) and no new Playwright API.

*Generated: 2026-10-25*
*Approved: 2026-10-25*
*Implemented: 2026-10-25*
*Status: IMPLEMENTED*
