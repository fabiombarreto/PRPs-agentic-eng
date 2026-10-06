# Feature: Plan contract and partial plans (Phase 1 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a plan downstream stages consume); impact on shared contracts (`qa-run.mjs` plan vocabulary, `results.json`, the `qa-run-contract` validation check); an existing command doc (`relay-qa-run.md`) rewritten around a script-validated vocabulary
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Partial plans and the outcome vocabulary" — a mixed case stays `needs-human` with `PARTIAL_REMAINDER`; a failed objective step makes it `fail`; `partially_executed` is reported apart from the driver-executed rate; no fifth outcome
  - Same PRD, Decisions Log "Plan side only" — `/relay-qa-report` and the reports are untouched; every change lives in the planning instructions, the runner and tracked declarations
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; this phase edits `qa-run.mjs` and `relay-qa-run.md` and runs first
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15)
  - [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; tests for this phase are routed through the test pair
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`"
  - "Emitting secret values in run reports or logs" — per-step results and captured-variable names must never carry a value
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no existing test is edited; message text of today's validation reasons is preserved byte-for-byte instead
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary — `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - Command versus agent separation — the planning agent proposes plan entries; the script validates and executes
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The `qa-run-contract` invariants stay true: `OUTCOMES` is the exact four-value literal, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 1: "Plan contract and partial plans" — Goal: a plan vocabulary that later phases can extend without ambiguity, and in which a mixed case can run its objective half — Success signal: a fixture plan with a partial case yields `needs-human`/`PARTIAL_REMAINDER` when its objective steps pass and `fail` when one fails; an unbound variable is refused before any seed runs; the doc's literal objects validate.

## Summary

This phase makes the QA runner's plan vocabulary a verifiable contract and lets a mixed case run its objective half. It extracts a per-step validator from `qa-run.mjs` and exports it; teaches it to reject the nested `{ "request": { ... } }` form with a reason that names the flat shape; adds `{{name}}` variable references that are checked before any side effect (and, because no capture mechanism exists until Phase 2, are always refused in this phase rather than ever reaching a driver). It adds partial plans (a `human_remainder` marker on a plan entry), per-step results on every executed case in `results.json`, and a `partially_executed` counter reported beside `record_resolved`. It extends the `qa-run-contract` validation check so the vocabulary, the new counters and the command doc's literal step objects are pinned, and it rewrites the plan-vocabulary section of `relay-qa-run.md` with one literal flat step object per driver, the variable rule, the partial-plan rule, and the declaration schema that later phases add (resolving PRD Open Question 3). The approach is additive: today's validation messages stay byte-identical and the four-outcome partition does not change.

## User Story

As the operator of relay's human validation gate
I want the runner's plan vocabulary to be unambiguous and to let a mixed case run its objective steps
So that `/relay-qa-run` executes and evidences what it can and hands back only the genuinely human remainder

## Problem Statement

`/relay-qa-run` executes almost nothing. In this phase's slice of the problem, the command doc abbreviates the HTTP step as `request {method, path, ...}`, which reads as nested; a real plan written in that shape was rejected `PLAN_ENTRY_INVALID: unknown http action` (PS9) because the script requires the flat `{ "action": "request", ... }`. Outcomes are per case only and the first failing step ends the case with no per-step record, so a case that mixes objective and subjective steps (`praesto-sum` case 20) cannot run at all. There is no way for a step to reference a named value, and nothing guarantees the doc's examples keep validating against the script.

## Solution Statement

Plan side only. Export a per-step validator and an aggregate validator from `qa-run.mjs`; reject the nested form naming the flat shape; scan every step for `{{name}}` references and refuse the entry (`PLAN_ENTRY_INVALID`, naming the variable) before any state is seeded, session obtained or request sent. Add an exported pure `applyPartialRemainder` that turns an all-pass partial case into `needs-human`/`PARTIAL_REMAINDER` and leaves a failed one `fail`, and an exported pure `summarizeEntries` that computes `counts`, `record_resolved` and `partially_executed`. Record per-step results (`passed`, `failed`, `not-run`, `human`) on each executed case. Extend `qa-run-contract` (new `validateResults` rules; doc-example validation against the script's own validator) rather than adding a parallel check, and rewrite the doc's vocabulary section around literal flat step objects.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `scripts/validate/checks/qa-run-contract.mjs` |
| Dependencies | none (Phase 1 of 8; no `Depends`) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 226 (row 1), 239-249 (Phase Details), 92-123 (Acceptance Criteria) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 92-123, 239-249 | AC-1, AC-2, AC-4, AC-5, AC-6, AC-15 and the Phase 1 scope/success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 780-836 | `validateSteps` — the closed vocabulary and the `NO_EXPECTATION` rule being extracted and exported |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 912-978 | `DRIVERS.http` — where per-step results must be recorded; each early `return` is a case end |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 980-1100 | `DRIVERS.browser` — same per-step recording; read to the end of the driver before editing |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1497-1568 | `executeCase` — the pre-side-effect validation site and the driver dispatch |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1699-1716 and 1731-1794 | entry assembly, `counts`, `record_resolved`, `results` object and the summary line |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 135-203 | Phase A plan vocabulary section being rewritten |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 1-142 | `validateResults` and `checkQaRunContract`, the contract pinned by `npm run validate` |
| P1 | `docs/anti-patterns.md` | 34-39 | secret-leak rule governing evidence and per-step results |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1153-1193 | `prepareState` / `runSeed` — confirms captures do not exist yet (stdout discarded), which is why Phase 1 binds no variable |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:785-805
function validateSteps(driver, steps) {
  let expectations = 0;
  for (const [i, s] of steps.entries()) {
    const bad = (/** @type {string} */ why) => ({ code: 'PLAN_ENTRY_INVALID', reason: `step ${i + 1}: ${why}` });
    if (!isObj(s) || !isStr(s.action)) return bad('not an object with a string action');
    if (driver === 'http') {
      if (s.action !== 'request') return bad(`unknown http action ${JSON.stringify(s.action)}`);
      if (!HTTP_METHODS.includes(s.method)) return bad('method must be one of GET, HEAD, POST, PUT, PATCH, DELETE');
      if (!isStr(s.path)) return bad('path must be a string');
      if (s.expect_status !== undefined) {
        if (!Number.isInteger(s.expect_status)) return bad('expect_status must be an integer');
        expectations++;
      }
```
Copied by Task 1 (per-step rules move into an exported `validateStep` with unchanged reason text; `validateSteps` keeps the `step N: ` prefix and the `NO_EXPECTATION` tail at 834).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1515-1534
  if (p.title !== kase.title) return out(needsHuman('PLAN_ENTRY_INVALID', "the plan entry's title does not match the report's title"));
  if (driver === null) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry names no driver'));
  if (driver !== 'http' && driver !== 'browser') {
    return out(needsHuman('NO_ACTIVE_DRIVER', `no active driver handles ${JSON.stringify(driver)}; the manual steps are reproduced verbatim`));
  }
  if (!Array.isArray(p.steps) || p.steps.length === 0) return out(needsHuman('PLAN_ENTRY_INVALID', 'the plan entry carries no steps'));
  const invalid = validateSteps(driver, p.steps);
  if (invalid) return out(needsHuman(invalid.code, invalid.reason));
  if (target === null) {
    return out(blocked('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>'));
  }
```
Copied by Task 1 (the `validateSteps` call at 1521 is the "before any side effect" site: it precedes `prepareState`, `obtainSession` and every driver call; `human_remainder` shape validation in Task 2 goes immediately after it).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1731-1738
    /** @type {Record<string, number>} */ const counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 };
    for (const e of entries) counts[e.outcome]++;
    // Record-resolved cases are INSIDE counts.pass/fail (the four-key partition is unchanged) but were
    // not executed by a driver: they are reported beside the driver-executed numbers, never added to them.
    const recordEntries = entries.filter((e) => e.reason_code === 'AUTOMATED_EVIDENCE');
    const recordResolved = recordEntries.length;
    const recordPass = recordEntries.filter((e) => e.outcome === 'pass').length;
    const recordFail = recordEntries.filter((e) => e.outcome === 'fail').length;
```
Copied by Task 2 (`partially_executed` is reported beside `record_resolved` in exactly this style: inside the four-key partition, counted separately, never added to the driver-executed numbers).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:58-72
  if (cases !== null) {
    const counts = obj.counts && typeof obj.counts === 'object' ? obj.counts : {};
    const sum = OUTCOME_VALUES.reduce((n, k) => n + (Number.isInteger(counts[k]) ? counts[k] : 0), 0);
    if (sum !== cases.length) msgs.push(`cases.length (${cases.length}) does not equal the sum of counts (${sum})`);
    const resolvedCases = cases.filter((c) => c !== null && typeof c === 'object' && c.reason_code === 'AUTOMATED_EVIDENCE');
    if (obj.record_resolved !== undefined) {
      if (!Number.isInteger(obj.record_resolved) || obj.record_resolved < 0 || obj.record_resolved !== resolvedCases.length) {
        msgs.push(`record_resolved (${JSON.stringify(obj.record_resolved)}) does not equal the number of AUTOMATED_EVIDENCE cases (${resolvedCases.length})`);
      }
```
Copied by Task 3 (the `partially_executed` rule is written in the same shape: optional key, integer, equals the number of cases carrying the reason code).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:155-158
The closed vocabulary:

- `http` steps: `request {method, path, body?, expect_status?, expect_body_contains?, expect_json?: {path, equals}}`
- `browser` steps: `goto {path}`, `click {selector}`, `fill {selector, value}`, `expect_visible {selector}`, `expect_text {selector, contains}`, `expect_url {path}`
```
Copied by Task 4 (this abbreviated form is the PS9 defect; it is replaced by literal flat step objects, one per driver).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | export `validateStep`/`validateSteps`; nested-form rejection; `{{name}}` validation; `human_remainder`; per-step results; `applyPartialRemainder`; `summarizeEntries`; `partially_executed` in `results.json` and the summary line |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | extend `validateResults` (per-step results, `partially_executed`, `PARTIAL_REMAINDER` must be `needs-human`); validate the command doc's literal step objects against the script's own validator |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | literal flat step object per driver, variable rule, partial-plan rule, per-step results description, declaration schema for later phases |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or the reports themselves; every change is plan-side and runner-side.
- A fifth outcome. Vocabulary stays `pass`, `fail`, `blocked`, `needs-human`; new behavior is reason codes (`PARTIAL_REMAINDER`) and counters (`partially_executed`).
- Capturing seed output into variables, a seed `status`, `STATE_UNCONFIRMED` and the declared store — Phases 2 and 3. This phase only fixes the schema in the doc; the runner reads none of the later-phase declarations.
- The read-only DB driver, declared API origins, UI grounding and per-test record resolution — Phases 4-7.
- Capture from an earlier HTTP step (Should-item) — not in this phase; `{{name}}` has no binding source here, so every reference is refused.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any test file. R-X strict: the Implementer authors zero test files; the test pair authors the corpus for this phase after code review.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`; only the source tree under `plugins/relay/` changes.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — exported step validators, nested-form rejection, `{{name}}` validation

- **ACTION**: Delivers AC-A1 (nested-form rejection) and AC-A2 (variables resolve or the case never starts). In `plugins/relay/scripts/qa-run.mjs`:
  1. Extract the per-step rules of `validateSteps` into an exported `validateStep(driver, step)` returning `{ code, reason }` or `null`. Its `reason` text is exactly today's text without the `step N: ` prefix. Export `validateSteps(driver, steps, boundNames = [])`, which calls the per-step logic, prefixes `step ${i + 1}: `, and keeps the `NO_EXPECTATION` tail unchanged. Every message the function produces today must stay byte-for-byte identical (existing tests pin them).
  2. Nested form: a step that is an object with no string `action` but exactly one own key equal to a known action name for the driver (`request` for `http`; `goto`, `click`, `fill`, `expect_visible`, `expect_text`, `expect_url` for `browser`) whose value is an object is rejected with code `PLAN_ENTRY_INVALID` and the reason `nested step form is not accepted; use the flat shape {"action": "<name>", ...}`. Any other shape without a string `action` keeps today's `not an object with a string action`.
  3. Variables: collect every `{{name}}` reference (pattern `\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}`) found in any string leaf of a step object, at any depth, in every key except `action`. A name not in `boundNames` yields `PLAN_ENTRY_INVALID` with the reason `step N: variable <name> is not bound by a capture declared for this case` (naming the variable).
  4. In `executeCase`, call `validateSteps(driver, p.steps, [])` at the existing call site (line 1521), so the refusal happens before `prepareState`, `obtainSession`, the guard pre-check and every driver call. Pass an empty bound set with a short comment that captures do not exist until Phase 2 (`runSeed` discards stdout), so a literal `{{name}}` can never reach a driver. Do not add any `writeFileSync(` or `renameSync(` call and do not introduce an `outcome:` literal outside the four values.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:785-805` (per-step rules and the `bad()` reason shape) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1515-1534` (the pre-side-effect call site).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { validateStep, validateSteps } from "./plugins/relay/scripts/qa-run.mjs";
  const flat = validateStep("http", { action: "request", method: "GET", path: "/api/x" });
  if (flat !== null) { console.error("flat step rejected: " + JSON.stringify(flat)); process.exit(1); }
  const nested = validateStep("http", { request: { method: "GET", path: "/api/x" } });
  if (!nested || nested.code !== "PLAN_ENTRY_INVALID" || !nested.reason.includes("flat shape")) { console.error("nested form not rejected naming the flat shape: " + JSON.stringify(nested)); process.exit(1); }
  const step = { action: "request", method: "GET", path: "/api/items/{{item_id}}", expect_status: 200 };
  const unbound = validateSteps("http", [step], []);
  if (!unbound || unbound.code !== "PLAN_ENTRY_INVALID" || !unbound.reason.includes("item_id")) { console.error("unbound variable not refused by name: " + JSON.stringify(unbound)); process.exit(1); }
  if (validateSteps("http", [step], ["item_id"]) !== null) { console.error("a bound variable was refused"); process.exit(1); }
  const legacy = validateSteps("http", [{ action: "request", method: "GET", path: "/a" }], []);
  if (!legacy || legacy.code !== "NO_EXPECTATION") { console.error("NO_EXPECTATION tail changed"); process.exit(1); }
  '
  ```
  Before this task, the import fails (`validateStep` is not exported) and the command exits non-zero.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — per-step results, partial plans, `partially_executed`

- **ACTION**: Delivers AC-A3 (a partial plan never passes), AC-A4 (a failed objective step is a real failure) and AC-A5 (per-step results and counters). In `plugins/relay/scripts/qa-run.mjs`:
  1. Plan entry field `human_remainder`: an optional object `{ "reason": "<non-empty string>" }` marking that the report's remaining manual steps are human work. Validate its shape in `executeCase` immediately after the `validateSteps` call; a malformed value is `needsHuman('PLAN_ENTRY_INVALID', ...)` naming `human_remainder`. The entry must still pass `validateSteps`, so a partial plan still needs at least one expectation.
  2. Per-step results: make `DRIVERS.http` and `DRIVERS.browser` return, beside `outcome`/`reason_code`/`reason`/`evidence`, a `steps` array with one item per plan step `{ index, action, result, evidence }`, where `index` is 1-based, `result` is one of `passed`, `failed`, `not-run`, and `evidence` is the evidence path for that step or `null`. A step that has not run because an earlier step ended the case is `not-run`. Cases not executed by a driver carry `steps: []`. Record only the action name, the step index and an evidence path — never a request body, a header or a value.
  3. Export a pure `applyPartialRemainder(result, entry)`: when `entry.human_remainder` is an object and `result.outcome === 'pass'`, return the result with `outcome: 'needs-human'`, `reason_code: 'PARTIAL_REMAINDER'`, a reason stating that the objective steps passed and the remainder is human work, the same `evidence`, and `steps` extended with one trailing item `{ index: <last index + 1>, action: 'human_remainder', result: 'human', evidence: null }`. When the result is `fail` (or anything other than `pass`), return it unchanged — a failed objective step is `fail`, and the remainder is not presented as pending human work. Without `human_remainder` the result is returned unchanged. Call it in `executeCase` on the value the driver returns.
  4. Export a pure `summarizeEntries(entries)` returning `{ counts, record_resolved, partially_executed }`, where `counts` is the unchanged four-key partition, `record_resolved` is the number of `AUTOMATED_EVIDENCE` entries, and `partially_executed` is the number of `PARTIAL_REMAINDER` entries. Use it in `runRun` in place of the inline counting at lines 1731-1738, and add `partially_executed` to the `results` object beside `record_resolved`.
  5. Carry `steps` into each entry assembled at lines 1702-1716. Add `Partially executed (not in the driver-executed rate): partially-executed=<n>` to the summary lines next to the existing record-resolved line; the driver-executed `pass=`/`fail=` numbers exclude `PARTIAL_REMAINDER` cases automatically because they are `needs-human`. A `needs-human` PARTIAL_REMAINDER entry keeps `manual_steps_verbatim` (the existing `keepSteps` rule), so the remainder is reproduced verbatim; a `fail` entry keeps `null`.
  6. Do not touch the `OUTCOMES` literal, add any `writeFileSync(` or `renameSync(` call, or introduce an `outcome:` literal outside the four values.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1731-1738` (record-resolved reported inside the partition, counted apart) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1515-1534` (entry validation order in `executeCase`).
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { applyPartialRemainder, summarizeEntries, OUTCOMES } from "./plugins/relay/scripts/qa-run.mjs";
  if (OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") { console.error("OUTCOMES changed"); process.exit(1); }
  const entry = { human_remainder: { reason: "steps 7-8 are a subjective judgment" } };
  const steps = [{ index: 1, action: "request", result: "passed", evidence: "e/1.json" }];
  const passed = applyPartialRemainder({ outcome: "pass", reason_code: null, reason: null, evidence: ["e/1.json"], steps }, entry);
  if (passed.outcome !== "needs-human" || passed.reason_code !== "PARTIAL_REMAINDER") { console.error("all-pass partial plan did not become PARTIAL_REMAINDER: " + JSON.stringify(passed)); process.exit(1); }
  if (!passed.steps.some((s) => s.result === "human")) { console.error("no human remainder step recorded"); process.exit(1); }
  const failed = applyPartialRemainder({ outcome: "fail", reason_code: null, reason: "x", evidence: ["e/1.json"], steps: [{ index: 1, action: "request", result: "failed", evidence: "e/1.json" }] }, entry);
  if (failed.outcome !== "fail" || failed.reason_code === "PARTIAL_REMAINDER") { console.error("a failed objective step was masked: " + JSON.stringify(failed)); process.exit(1); }
  const plain = applyPartialRemainder({ outcome: "pass", reason_code: null, reason: null, evidence: ["e/1.json"], steps }, {});
  if (plain.outcome !== "pass") { console.error("a plan with no remainder was altered"); process.exit(1); }
  const s = summarizeEntries([
    { outcome: "needs-human", reason_code: "PARTIAL_REMAINDER" },
    { outcome: "pass", reason_code: "AUTOMATED_EVIDENCE" },
    { outcome: "pass", reason_code: null },
    { outcome: "blocked", reason_code: "NO_PLAN_ENTRY" },
  ]);
  if (s.partially_executed !== 1 || s.record_resolved !== 1) { console.error("summary counters wrong: " + JSON.stringify(s)); process.exit(1); }
  const sum = Object.values(s.counts).reduce((a, b) => a + b, 0);
  if (sum !== 4 || s.counts.pass !== 2 || s.counts["needs-human"] !== 1 || s.counts.blocked !== 1 || s.counts.fail !== 0) { console.error("the four-key partition broke: " + JSON.stringify(s.counts)); process.exit(1); }
  '
  ```
  Before this task, the import fails (`applyPartialRemainder` is not exported) and the command exits non-zero.

### Task 3: UPDATE scripts/validate/checks/qa-run-contract.mjs — pin per-step results, `partially_executed` and the doc's step examples

- **ACTION**: Delivers AC-A5 (per-step results and counters hold under the contract) and AC-A1 (a validation check fails if the doc's example objects stop validating). In `scripts/validate/checks/qa-run-contract.mjs`:
  1. Extend `validateResults`: when `obj.partially_executed` is present it must be a non-negative integer equal to the number of cases whose `reason_code` is `PARTIAL_REMAINDER`, else push a message in the style of the existing `record_resolved` rule; every case carrying `PARTIAL_REMAINDER` must have `outcome` `needs-human`; when a case carries a `steps` key it must be an array whose every item has a `result` in `passed`, `failed`, `not-run`, `human`. The existing partition, stamp, evidence and human-gate rules are unchanged, and a results object without the new keys still validates (older tracked `results.json` files stay valid).
  2. Doc-example validation: statically import `validateStep` from the runner script (`../../../plugins/relay/scripts/qa-run.mjs`; the script has no import-time side effects because of its entry-point guard). The command doc marks each literal step example with the comment line `<!-- qa-step-example driver=http -->` or `<!-- qa-step-example driver=browser -->` immediately followed by a fenced `json` block holding one step object. In `checkQaRunContract`, extract every such block from `commandText`; a block that is not valid JSON, or for which `validateStep(driver, step)` returns anything but `null`, is a finding naming the driver. Add an option `requireStepExamples` (default `false`): when true, a missing example for either driver (`http`, `browser`) is a finding. `runQaRunContractCheck` passes `requireStepExamples: true`; direct callers that omit it (existing unit tests with minimal fixture text) are unaffected.
  3. Keep the check's existing findings and exports; add no write call. The new test cases for these rules belong to the test pair, not this task.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run-contract.mjs:58-72` (optional-key rule written in the same message style) and the `checkQaRunContract` required-token loop at `scripts/validate/checks/qa-run-contract.mjs:126-135`.
- **VALIDATE**:
  ```bash
  node --input-type=module -e '
  import { validateResults, checkQaRunContract } from "./scripts/validate/checks/qa-run-contract.mjs";
  const t = "2026-10-05T10:00:00.000Z";
  const mk = (extra, caseExtra) => ({ started_at: t, finished_at: t, human_gate: { status: "open" }, counts: { pass: 0, fail: 0, blocked: 0, "needs-human": 1 }, cases: [{ outcome: "needs-human", reason_code: "PARTIAL_REMAINDER", started_at: t, finished_at: t, evidence: ["e/1.json"], ...caseExtra }], ...extra });
  if (validateResults(mk({ partially_executed: 1 }, { steps: [{ index: 1, action: "request", result: "passed", evidence: "e/1.json" }] })).length !== 0) { console.error("a consistent partial result was rejected"); process.exit(1); }
  if (validateResults(mk({ partially_executed: 0 }, {})).length === 0) { console.error("a wrong partially_executed was accepted"); process.exit(1); }
  if (validateResults(mk({ partially_executed: 1 }, { steps: [{ index: 1, action: "request", result: "maybe", evidence: null }] })).length === 0) { console.error("an unknown step result was accepted"); process.exit(1); }
  const base = "HUMAN GATE STILL OPEN FAILED_NON_LOCAL_TARGET qa-run.mjs";
  const bad = checkQaRunContract({ scriptText: null, commandText: base + "\n<!-- qa-step-example driver=http -->\n```json\n{ \"request\": { \"method\": \"GET\", \"path\": \"/x\" } }\n```\n", results: [], requireStepExamples: true });
  if (!bad.findings.some((f) => /http/.test(f.message) && f.file.endsWith("relay-qa-run.md"))) { console.error("a nested example in the doc was not flagged: " + JSON.stringify(bad.findings)); process.exit(1); }
  const missing = checkQaRunContract({ scriptText: null, commandText: base, results: [], requireStepExamples: true });
  if (!missing.findings.some((f) => /example/i.test(f.message))) { console.error("missing step examples were not flagged"); process.exit(1); }
  '
  ```
  Before this task, a result with a wrong `partially_executed` produces no message, so the second assertion exits non-zero.

### Task 4: UPDATE plugins/relay/commands/relay-qa-run.md — literal step objects, variables, partial plans, declaration schema

- **ACTION**: Delivers AC-A1 (literal step object per driver in the exact flat shape), AC-A2 (the variable rule stated), AC-A3 (partial-plan rule stated) and AC-A6 (the file stays within its own scope; no frozen surface is touched). In `plugins/relay/commands/relay-qa-run.md`, rewrite the "closed vocabulary" part of Phase A (lines 155-158) and extend the honesty rules, keeping every other section, the required tokens (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`) and the banned-token rule (the command must not contain `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`) intact:
  1. State that every step is a flat JSON object with a string `action`, and that the nested form `{ "request": { ... } }` is rejected `PLAN_ENTRY_INVALID` with a reason naming the flat shape.
  2. Give one literal example per driver, each preceded by the exact marker line `<!-- qa-step-example driver=http -->` or `<!-- qa-step-example driver=browser -->` and followed by a fenced `json` block with exactly one step object that already passes `validateStep`. The HTTP example is `{ "action": "request", "method": "GET", "path": "/api/x", "expect_status": 200 }`; the browser example is `{ "action": "expect_text", "selector": "h1", "contains": "Dashboard" }`. List the remaining browser actions (`goto`, `click`, `fill`, `expect_visible`, `expect_url`) and the optional HTTP keys (`body`, `expect_body_contains`, `expect_json: { "path", "equals" }`) as prose beside the examples, each in its flat `action` form.
  3. Variables: `{{name}}` may appear in a path, body, fill value or expectation; every reference must be bound by a capture declared for the case's seed; an unbound reference makes the case `needs-human` with `PLAN_ENTRY_INVALID` naming the variable before anything is seeded, authenticated or requested. State plainly that, until seeds capture their output (a later phase), every reference is unbound, so the planning agent must not write `{{name}}` references yet.
  4. Partial plans: a plan entry may carry `"human_remainder": { "reason": "<why the rest is human>" }` when the report's objective steps are separable from subjective or outward-effect ones; the objective steps still need at least one expectation. When all planned steps pass the case is `needs-human` with `PARTIAL_REMAINDER` and its objective evidence; when an objective step fails the case is `fail`. Partially executed cases are counted in `partially_executed`, reported beside `record_resolved`, and never in the driver-executed rate.
  5. Per-step results: describe the `steps` array of each executed case in `results.json` (`index`, `action`, `result` in `passed`, `failed`, `not-run`, `human`, `evidence`).
  6. Declaration schema for later phases (resolves PRD Open Question 3), marked as reserved and not yet read by the runner: seed entries, captured-variable maps and declared stores stay in `PRPs/auth/qa-seed.json` under `states`; read-only query sources are a top-level `query_sources` map in the same file; additional local API origins and their session-derived header are an `api_origins` map in `PRPs/auth/login.config.json`, next to the roles that supply the session. State that these files hold declarations only, never captured values or credentials.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:155-158` (the vocabulary block being replaced).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  grep -q 'qa-step-example driver=http' plugins/relay/commands/relay-qa-run.md
  grep -q 'qa-step-example driver=browser' plugins/relay/commands/relay-qa-run.md
  grep -q 'human_remainder' plugins/relay/commands/relay-qa-run.md
  grep -q 'partially_executed' plugins/relay/commands/relay-qa-run.md
  ```
  `runQaRunContractCheck` runs with `requireStepExamples: true`, so it fails before this task (no examples in the doc) and fails afterwards if either example stops validating against the script. The `grep` lines assert prose the task itself authors (markers copied byte-for-byte from the ACTION above) and are acceptable because the deliverable is the doc text.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The runner's vocabulary and the contract hold, and the doc's examples validate (exit 1 on any finding).
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { OUTCOMES, validateStep } from "./plugins/relay/scripts/qa-run.mjs";
if (OUTCOMES.length !== 4) { console.error("OUTCOMES is not the four-value vocabulary"); process.exit(1); }
if (validateStep("http", { action: "request", method: "GET", path: "/api/x" }) !== null) { console.error("the flat HTTP step no longer validates"); process.exit(1); }
const r = runQaRunContractCheck();
if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
'
# AC-15: the four frozen surfaces are byte-identical to HEAD (single-argument diff, working tree vs HEAD).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# No forbidden .claude/PRPs reference introduced outside the quoted prohibition idiom.
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md scripts/validate/checks/qa-run-contract.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite (28 checks today) must still pass; its exit code propagates.
npm run validate
# The whole corpus, glob quoted: every existing qa-run test still passes against the extended script
# (today's validation messages are preserved byte-for-byte; the new behavior is additive).
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** `relay-qa-run.md`'s plan vocabulary contains one literal flat JSON step object per driver (marked `qa-step-example`); the nested `{ "request": { ... } }` form is rejected `PLAN_ENTRY_INVALID` with a reason that names the flat shape; and `npm run validate` (the extended `qa-run-contract` check) fails if a doc example stops validating against the script's `validateStep`.
- **AC-A2 (PRD AC-2):** a plan step referencing `{{name}}` in a path, body, fill value or expectation makes the entry `needs-human` with `PLAN_ENTRY_INVALID`, naming the variable, before any state is seeded, any session is obtained or any request is sent; in this phase no variable can be bound, so no literal `{{name}}` ever reaches a driver.
- **AC-A3 (PRD AC-4):** a plan entry with `human_remainder` whose objective steps all pass yields `needs-human` with `PARTIAL_REMAINDER`; the objective steps' per-step results are recorded as evidence, the manual steps are reproduced verbatim, and the case is counted in `partially_executed`, never in the driver-executed rate.
- **AC-A4 (PRD AC-5):** when an objective step of a partial plan fails its expectation, the case outcome is `fail` with that step's evidence and the remainder is not presented as pending human work.
- **AC-A5 (PRD AC-6):** every executed case lists its steps in `results.json` with index, action, result (`passed`, `failed`, `not-run`, `human`) and evidence path; the four-outcome partition of `counts` and the `qa-run-contract` check still hold; `partially_executed` is reported beside `record_resolved`.
- **AC-A6 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, the report is never written, and `OUTCOMES` is still exactly the four values.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A literal `{{name}}` reaches a driver and is sent as text | M | H | Phase 1 passes an empty bound set, so every reference is refused before any side effect; Task 1's VALIDATE asserts the refusal |
| Refactoring `validateSteps` changes a message an existing test pins | M | M | Per-step reasons move unchanged and the `step N: ` prefix is re-applied by `validateSteps`; Level 3 runs the whole existing corpus |
| New driver return shape breaks the single-write-helper or outcome-literal contract | L | H | No new `writeFileSync(`/`renameSync(` and no new `outcome:` literal; `runQaRunContractCheck` runs in Task 4 and Level 2 |
| Doc examples drift from the script | M | M | Examples are marker-delimited and validated by the extended `qa-run-contract` check against the script's own `validateStep` |
| A partial case inflates the driver-executed rate | L | H | `PARTIAL_REMAINDER` is `needs-human`, so it is outside `pass`/`fail`; `partially_executed` is reported apart and `validateResults` pins the relation |
| Existing `checkQaRunContract` unit tests with minimal fixture text start failing | M | M | `requireStepExamples` defaults to `false`; only `runQaRunContractCheck` sets it, so direct callers are unaffected |
| research-codebase / research-web grounding was not consumed beyond direct reads | L | L | Every `# SOURCE:` anchor was read from the working tree by the plan writer; no snippet is unsourced |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- The test pair will need new cases for: the nested-form rejection, unbound-variable refusal before any seed, `applyPartialRemainder`, `summarizeEntries`, the new `validateResults` rules, and doc-example validation. Existing `qa-run*.test.mjs` files should need no edit; if one does, it goes through `EXISTING_TEST_UPDATED`, never an Implementer edit.
- Open Question 3 (where declarations live) is resolved in Task 4: seeds and query sources in `PRPs/auth/qa-seed.json`, API origins in `PRPs/auth/login.config.json`. Phases 2-5 implement their readers.
- The plan writer has no shell tool: the VALIDATE commands were derived by reading the current tree (for example, `validateStep`, `applyPartialRemainder`, `summarizeEntries` are not exported today, so Tasks 1-3's checks exit non-zero before the work) and were not executed. The Level 2 frozen-surface and forbidden-reference checks and Level 3 pass on the unmodified tree by design, as regression guards.

*Generated: 2026-10-05*
*Approved: 2026-10-05*
*Implemented: 2026-10-05*
*Status: IMPLEMENTED*
