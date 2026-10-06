# Feature: UI grounding (Phase 6 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: network-touching site (a plan-time browser navigation with a role session); secret and personal-data handling (an accessibility snapshot is a new leak surface); impact on shared contracts (`qa-run.mjs` plan vocabulary, `relay-qa-run.md`); cross-cutting artifact (a plan downstream stages consume)
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Plan side only" — `/relay-qa-report` and the reports are untouched; every change lives in the planning instructions, the runner and tracked declarations
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; phases 1-5 are `complete`, this phase runs sixth on the same files
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15); the snapshot is therefore produced inside the runner, never through `capture.mjs`
  - Same PRD, Decisions Log "Partial plans and the outcome vocabulary" — no fifth outcome; `STEP_UNGROUNDED` is a reason code on `needs-human`
  - Same PRD, Technical Risks row 1 — grounding that matches loosely produces a false `pass`; mitigation is strict locators, exactly one match at plan and run time, expectations only from the report
  - Phase 4 plan Notes (amendment 2026-10-06) and phase 5 plan Notes — a new static sibling import of `qa-run.mjs` breaks the existing tests that copy it alone; this phase keeps all code inside `qa-run.mjs`
  - `docs/decisions.md` [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; tests are routed through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — a snapshot can carry account names, e-mails and field values; it is redacted and sensitive entries are withheld before anything is written
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no existing test is edited by the Implementer; any test this phase disturbs is routed to the test pair (see Notes)
  - "Relying on interactive permission prompts in the autonomous loop" — `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - The local-only guard (parent PRD AC-1) is a hard failure at every network-touching site; the new `ground` mode resolves its route through the existing guard-approved target, and `qa-run.mjs` is already a registered guard site
  - Command versus agent separation — the planning agent selects locators from a script-produced snapshot; the script owns the navigation, the counting and every refusal
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - `qa-run-contract` invariants stay true for `qa-run.mjs`: exact four-value `OUTCOMES`, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
  - Interactivity boundary — no new extension; no operator dialogue
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 6: "UI grounding" — Goal: browser steps that name no selector become runnable, or honestly unrunnable — Success signal: against a fixture page, a step naming a visible button by text is planned and executed through a role locator; a step whose text matches two elements, or none, is `STEP_UNGROUNDED`.

## Summary

This phase makes browser steps that name no selector runnable or honestly unrunnable. The browser vocabulary gains two strict locator forms beside the existing `selector`: a role-and-name locator (`role` plus `name`, executed as `getByRole(role, { name, exact: true })`) and a visible-text locator (`text`, executed as `getByText(text, { exact: true })`), valid on `click`, `fill`, `expect_visible` and `expect_text`. A new runner mode, `qa-run.mjs ground`, takes a redacted accessibility snapshot of one route with one role's saved session and writes `<run-dir>/grounding/<role>--<slug>.snapshot.json`: the role-and-name and text candidates of the page, each with the number of elements it matches, with every entry whose text carries a secret, an e-mail or a declared pattern withheld. Before anything is seeded, authenticated or requested, `executeCase` checks every locator step against those snapshots (the route is tracked from `goto` and `expect_url`): a locator that is not a snapshot entry with exactly one match, or an `expect_text` whose `contains` is not in the report's own steps, ends the case `needs-human` (`STEP_UNGROUNDED`, or `PLAN_ENTRY_INVALID` for the expectation). At run time the browser driver refuses to act on any locator that matches more than one element. All code lives inside `qa-run.mjs`; `parseArgs`, `USAGE`, the existing browser branches and every existing test anchor stay byte-identical, and `relay-qa-run.md` gains the grounding step, literal locator examples and the new rules.

## User Story

As the operator of relay's human validation gate
I want browser steps that name no selector to be planned from the page as it renders, with locators that must match exactly one element
So that cases whose report steps use labels that are wrong on screen (`super-ensino` X-1, T-2, S-4, S-6) are driver-executed with evidence or honestly handed back, never passed on a loose match

## Problem Statement

`/relay-qa-report` writes steps grounded in code labels, which are wrong on screen (finding F9). The browser driver only accepts a CSS `selector`, and the planning agent is told never to invent one, so those cases come back `needs-human`. The existing `expect_visible` and `expect_text` branches also call `.first()` on the locator, which hides ambiguity: a selector matching two elements silently targets the first, the exact failure mode that would turn a grounding step into a false `pass`.

## Solution Statement

Plan side and runner side only. Add the two locator forms to `stepRules` as an additive block ahead of the existing browser `switch` (existing messages stay byte-identical). Add pure, exported helpers (`locatorOf`, `parseAriaSnapshot`, `partitionSnapshotEntries`, `routeKey`, `precheckGroundedSteps`) and an internal `runLocatorStep` for the driver. Add the `ground` mode, dispatched from `main` before `parseArgs`, so `parseArgs`, `USAGE` and the `parse`/`init`/`run` behavior are untouched. Resolve PRD Open Question 2 in the design: the redaction-policy patterns are credential-oriented and do not cover personal data, so snapshot entries are withheld, not redacted in place, when they match the redaction table, a built-in e-mail pattern or a project `regex:` line of `PRPs/redaction-extensions.txt` (an existing per-project extension file already applied by `buildRedactionTable`); no new declaration schema is introduced.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md` |
| Dependencies | Phase 1 (`complete`): `validateStep`/`validateSteps`, per-step results, `recordSteps`. Phases 2-5 (`complete`) share the same files. Playwright 1.61.1 (`locator.ariaSnapshot()`) and Chromium for the browser VALIDATE blocks. |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 231 (row 6), 271-274 (Phase Details), 114 (AC-13), 116-122 (AC-15), 123 (AC-16), 128 (Open Question 2) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 114, 128, 271-274 | AC-13, Open Question 2 and the Phase 6 scope and success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 791-794, 857-927 | `HTTP_ACTIONS`/`BROWSER_ACTIONS` constants and `stepRules` — the browser `switch` the locator block is inserted ahead of |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 956-982 | `validateStep`/`validateSteps` — expectation counting and the `{{name}}` walk the locator keys flow through |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1420-1518 | `DRIVERS.browser` — the step loop the locator branch is inserted into; the existing `.first()` branches and the route-guard anchor stay untouched |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1554-1598 | `obtainSession` — how the role's storage-state path is produced (reused by `ground`) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1900-1935 | `anonymousCheck` — an existing in-runner browser navigation with a guarded route handler (its handler uses `alt`, not the once-only anchor) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1980-2093 | `executeCase` — the pre-side-effect refusal order; the grounding pre-check goes after the api-origin loop and before the Playwright gate |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2351-2373 | `main` — the dispatcher the `ground` mode is routed from |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 485-696 | the redaction layer and the single write helper (`writeRunFile`) every snapshot byte goes through |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 135-230, 301-314 | Phase A planning instructions, the marked step examples and the honesty rules being extended |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 29-31, 162-181 | the doc-example validation: every marked example must pass `validateStep` |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 321-344, 397, 454-457, 535-537, 764, 836-838, 862-863, 973, 1035-1036, 1171-1180 | the once-only mutation anchors and the CLI-exit assertions this phase must leave intact |
| P1 | `PRPs/plans/completed/qa-runner-case-vocabulary-phase-5-declared-api-origins.plan.md` | 246-368, 568-579 | the fixture shapes (parse output, login stub, junctioned `node_modules`) and the Notes conventions this plan follows |
| P1 | `docs/anti-patterns.md` | 34-39 | secret-leak rule governing evidence |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:899-912
  } else {
    switch (s.action) {
      case 'goto':
        if (!isStr(s.path)) return bad('goto needs a string path');
        break;
      case 'click':
        if (!isStr(s.selector)) return bad('click needs a string selector');
        break;
      case 'fill':
        if (!isStr(s.selector) || !isStr(s.value)) return bad('fill needs a string selector and value');
        break;
      case 'expect_visible':
        if (!isStr(s.selector)) return bad('expect_visible needs a string selector');
        expectations++;
        break;
```
Copied by Task 1 (the locator block is inserted at the top of this `else` branch, ahead of the `switch`; the `switch` and every message in it stay byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:803-810
export function classifyApiOrigin(apiOrigins, name) {
  const entry = isObj(apiOrigins) && isStr(name) && Object.hasOwn(apiOrigins, name) ? apiOrigins[name] : undefined;
  if (!isObj(entry)) {
    return { ok: false, code: 'FAILED_NON_LOCAL_TARGET', reason: `the origin ${String(name)} is not declared in api_origins; nothing was requested` };
  }
  /** @param {string} why */
  const bad = (why) => ({ ok: false, code: 'API_ORIGIN_INVALID', reason: `api_origins[${name}] is malformed: ${why}` });
  if (!isStr(entry.url) || entry.url === '' || /\s/.test(entry.url)) return bad('url must be a non-empty string without whitespace');
```
Copied by Tasks 1 and 2 (`locatorOf` and `precheckGroundedSteps` are pure, ordered-refusal functions of the same shape: `{ ok: false, ... }` or a refusal record, reasons that name the step and never a value).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2022-2029
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'request' || s.origin === undefined) continue;
    const r = await resolveApiOrigin(ctx, s, i + 1);
    if (!r.ok) return out(r.result);
    if (r.spec.header !== null && role === null) {
      return out(blocked('API_HEADER_NO_SESSION', `step ${i + 1}: the origin ${r.spec.name} derives a header from the role session, but the plan entry names no role`));
    }
  }
```
Copied by Task 3 (the grounding pre-check is one more refusal block in the same pre-side-effect zone, directly after this loop and before the `ctx.playwright === null` gate; the existing loops are not edited).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1442-1446
    for (const [i, step] of plan.steps.entries()) {
      const n = i + 1;
      ranTo = i;
      if (step.action === 'goto') {
        const url = resolveStepUrl(step.path, target);
```
Copied by Task 4 (the locator branch is inserted between `ranTo = i;` and `if (step.action === 'goto') {`; every existing branch, including the `.first()` ones and the route-guard line, is untouched).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1908-1914
        const context = await browser.newContext();
        await context.route('**/*', (/** @type {any} */ route) => {
          const u = new URL(route.request().url());
          if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
          return alt.guard.isAllowedHost(u.hostname, alt.allowedHosts) ? route.continue() : route.abort();
        });
        const page = await context.newPage();
```
Copied by Task 5 (`runGround` builds the same guarded context; it must NOT contain the driver's once-only route-guard line `return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();`, which an existing test uses as an exactly-once mutation anchor, so it is written as an `if (!...) return route.abort();` statement instead).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2351-2358
async function main(argv) {
  const args = parseArgs(argv);
  if (args === null) {
    process.stderr.write(USAGE);
    return 2;
  }
  if (args.help) {
    process.stdout.write(USAGE);
```
Copied by Task 5 (one line is inserted above `const args = parseArgs(argv);` to route `ground` before the argument parser, leaving `parseArgs`, `USAGE` and these lines byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:682-696
function writeRunFile(ctx, destAbs, payload) {
  const rel = relative(ctx.runDirAbs, resolve(destAbs));
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('write refused: destination is outside the run directory');
  }
  /** @type {string | Buffer} */ let data;
  if (payload.kind === 'json') data = `${JSON.stringify(redactJson(payload.value, ctx.table), null, 2)}\n`;
  else if (payload.kind === 'text') data = redactText(payload.value, ctx.table);
  else data = payload.value;
  const dest = resolve(destAbs);
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, dest);
}
```
Copied by Task 5 (the snapshot is written ONLY through this helper, so the runner keeps its single `writeFileSync(` and `renameSync(`; the helper is called, not edited).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:169-174
One literal `browser` step (action `expect_text`):

<!-- qa-step-example driver=browser -->
```json
{ "action": "expect_text", "selector": "h1", "contains": "Dashboard" }
```
```
Copied by Task 6 (the new locator examples use the same marker line and one-object fenced `json` block, which `qa-run-contract` validates against `validateStep`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | `role`/`name`/`text` locator forms in `stepRules`; exported `locatorOf`, `parseAriaSnapshot`, `partitionSnapshotEntries`, `routeKey`, `precheckGroundedSteps`; plan-time grounding pre-check in `executeCase`; locator branch and `STEP_UNGROUNDED` in `DRIVERS.browser`; the `ground` mode (`runGround`, dispatched from `main`) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | the grounding step in Phase A, literal marked locator examples, the grounding rules, `STEP_UNGROUNDED` and the PII handling (Open Question 2), one honesty rule |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or the reports themselves; every change is plan-side and runner-side.
- A fifth outcome. `STEP_UNGROUNDED` is a reason code on `needs-human`; the plan-shape defect for an expectation not drawn from the report is `PLAN_ENTRY_INVALID`, also `needs-human`.
- A new sibling module or any static import of one; any edit of `parseArgs`, `USAGE`, the file header comment, the existing browser `selector` branches, `DRIVERS.http` or the once-only anchors of existing tests (see Notes). The `ground` mode is routed from `main` before `parseArgs` on purpose.
- Any use of `plugins/relay/scripts/visual/capture.mjs` (frozen) or any change to it.
- Free-form or loose matching: no `exact: false`, no `.first()`/`.nth()` on a locator step, no regex names, no CSS or XPath inside a locator form, no role outside the closed list in Task 1.
- Grounding of elements that only appear after an interaction (the snapshot is of a route as first loaded); such steps are `STEP_UNGROUNDED`, never guessed.
- A declared `redact` list or any new tracked declaration file: personal-data patterns beyond the built-in e-mail pattern use the existing `regex:` lines of `PRPs/redaction-extensions.txt`.
- Redacting the final browser screenshot or page-text evidence of an executed case (existing behavior of the parent PRD, unchanged here).
- Browser upload of a fixture file, session caching, capture from an earlier HTTP step, per-test record resolution (Should/Could items and phase 7).
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any test file and any change to `scripts/validate/checks/*` by this phase (R-X strict; no guard site is added because `qa-run.mjs` is already registered, so `GUARD_SITES` is untouched). Phases 1-5 already left check files modified and uncommitted; this phase adds nothing to them.
- Any `documentation/` or `docs/` edit, a release or version bump. The release is cut after the phase 8 dogfood.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the locator forms in the browser vocabulary

- **ACTION**: Delivers AC-A1 (the role-and-name and visible-text forms validate, flat, with a closed role list, and selector steps are unchanged). In `plugins/relay/scripts/qa-run.mjs`, add code only, plus one inserted block in `stepRules`; do not edit `BROWSER_ACTIONS`, any existing `case` of the `switch`, any existing message, `validateStep` or `validateSteps`. Do NOT add any `import` statement of a sibling file.
  1. Directly after the line `const API_HEADER_FORBIDDEN = ['host', 'content-length', 'cookie', 'transfer-encoding'];`, add `const LOCATOR_ACTIONS = ['click', 'fill', 'expect_visible', 'expect_text'];` and `const LOCATOR_ROLES = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'heading', 'tab', 'menuitem', 'option', 'switch', 'searchbox', 'spinbutton', 'slider', 'dialog', 'alert', 'status', 'row', 'cell', 'columnheader', 'listitem', 'img', 'navigation', 'region', 'table', 'menu', 'tabpanel'];`.
  2. Export `locatorOf(step)`, pure. It returns `null` when the step carries none of the keys `role`, `name`, `text`; otherwise `{ ok: false, why }` or `{ ok: true, form: 'role', role, name }` or `{ ok: true, form: 'text', text }`. Ordered refusals (`why` texts exactly): when `step.selector !== undefined` together with any of the three keys, or `text` together with `role` or `name`: `a step names one locator form: selector, role and name, or text`; when exactly one of `role` and `name` is present: `role and name go together`; when `role` is not a string in `LOCATOR_ROLES`: `role must be one of the supported roles`; when `name` is not a string with a non-blank trim: `name must be a non-empty string`; when `text` is not a string with a non-blank trim: `text must be a non-empty string`. The returned `name`/`text` are the step's own strings, untrimmed.
  3. In `stepRules`, replace nothing: insert, as the first statements of the `else {` branch that currently begins `switch (s.action) {` (the branch for a non-http driver), this block: `const loc = LOCATOR_ACTIONS.includes(s.action) ? locatorOf(s) : null;` then `if (loc !== null) {` `if (!loc.ok) return bad(\`${s.action}: ${loc.why}\`);` `if (s.action === 'fill' && !isStr(s.value)) return bad('fill needs a string value');` `if (s.action === 'expect_text' && !isStr(s.contains)) return bad('expect_text needs a string contains');` `return { expectations: s.action === 'expect_visible' || s.action === 'expect_text' ? 1 : 0 };` `}`. A step with none of the three keys gets `loc === null` and falls through to the unchanged `switch`; the locator keys are not valid on the `http` driver and are not read there.
  4. Do not add a `writeFileSync(` or `renameSync(` call or an `outcome:` literal. Do not change `OUTCOMES`.
  Delivers AC-A1 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:899-912` (the browser `switch` the block is inserted ahead of) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:803-810` (the ordered-refusal shape of `locatorOf`).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { validateStep, validateSteps, locatorOf } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const okSteps = [
    { action: "click", role: "button", name: "Save" },
    { action: "fill", role: "textbox", name: "Email", value: "x" },
    { action: "expect_visible", role: "heading", name: "Panel" },
    { action: "expect_text", role: "heading", name: "Panel", contains: "Panel" },
    { action: "click", text: "Welcome back" },
    { action: "expect_visible", text: "Welcome back" },
  ];
  for (const s of okSteps) if (validateStep("browser", s) !== null) fail("a valid locator step was rejected: " + JSON.stringify(s) + " " + JSON.stringify(validateStep("browser", s)));
  const badSteps = [
    { action: "click", selector: "#a", role: "button", name: "Save" },
    { action: "click", selector: "#a", text: "Save" },
    { action: "click", role: "button" },
    { action: "click", name: "Save" },
    { action: "click", role: "banana", name: "Save" },
    { action: "click", text: "Save", role: "button" },
    { action: "click", role: "button", name: "  " },
    { action: "click", text: "" },
    { action: "fill", role: "textbox", name: "Email" },
    { action: "expect_text", role: "heading", name: "Panel" },
    { action: "click", role: "button", name: 5 },
  ];
  for (const s of badSteps) {
    const r = validateStep("browser", s);
    if (r === null || r.code !== "PLAN_ENTRY_INVALID") fail("a malformed locator step was accepted: " + JSON.stringify(s));
  }
  if (validateStep("http", { action: "click", role: "button", name: "Save" }) === null) fail("a locator step was accepted by the http driver");
  const legacy = validateStep("browser", { action: "click" });
  if (legacy === null || legacy.reason !== "click needs a string selector") fail("the legacy click message changed: " + JSON.stringify(legacy));
  if (validateStep("browser", { action: "expect_visible", selector: "#a" }) !== null) fail("a selector step stopped validating");
  if (validateSteps("browser", [{ action: "goto", path: "/" }, { action: "click", role: "button", name: "Save" }]).code !== "NO_EXPECTATION") fail("a locator click alone must not count as an expectation");
  if (validateSteps("browser", [{ action: "goto", path: "/" }, { action: "expect_visible", role: "button", name: "Save" }]) !== null) fail("a locator expectation was not counted");
  const unbound = validateSteps("browser", [{ action: "click", role: "button", name: "{{who}}" }, { action: "expect_visible", selector: "#a" }]);
  if (unbound === null || unbound.code !== "PLAN_ENTRY_INVALID" || !unbound.reason.includes("who")) fail("an unbound variable in a locator was not refused: " + JSON.stringify(unbound));
  if (locatorOf({ action: "click", selector: "#a" }) !== null) fail("a selector step must have no locator form");
  const l = locatorOf({ action: "click", role: "button", name: "Save" });
  if (!l || !l.ok || l.form !== "role" || l.role !== "button" || l.name !== "Save") fail("locatorOf did not return the role form: " + JSON.stringify(l));
  '
  ```
  Before this task `locatorOf` is not exported, so the import fails and the block exits non-zero.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the pure grounding helpers and the plan-time pre-check

- **ACTION**: Delivers AC-A3 (a locator not grounded with exactly one match is refused `STEP_UNGROUNDED` before anything runs), AC-A5 (an `expect_text` expectation must come from the report) and the pure half of AC-A6 (an entry carrying a secret, an e-mail or a declared pattern is withheld). In `plugins/relay/scripts/qa-run.mjs`, next to `applyPartialRemainder`, add only exported pure functions (no I/O, no `console.*`, no `writeFileSync(`/`renameSync(`):
  1. `routeKey(path)`: returns the URL pathname of `path` resolved against `http://route.invalid`, or `null` when `path` is not a string or does not parse. `routeKey('/a?x=1')` is `'/a'`.
  2. `parseAriaSnapshot(yaml)`: parses the text `locator.ariaSnapshot()` returns (`- role "name" [attrs]` and `- text: content` lines). Returns an array of candidates, de-duplicated, capped at 300: `{ kind: 'role', role, name }` for a line matching `^\s*-\s+([a-z]+)\s+"((?:[^"\\]|\\.)*)"` whose role is in `LOCATOR_ROLES` and whose name, after replacing `\"` and `\\` by their characters, is non-blank; and `{ kind: 'text', text }` for a line matching `^\s*-\s+text:\s*(.+?)\s*$` whose content is non-blank and at most 200 characters. Any other line is ignored; a non-string input returns `[]`.
  3. `partitionSnapshotEntries(entries, table)`: splits the entries into `{ kept, withheld }` where `withheld` is a number. An entry (its `name` or `text`) is withheld when `containsSecret(value, table)` is true or the value matches the built-in e-mail pattern `/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/`. `kept` holds the untouched entries; a withheld entry is NEVER written in a redacted form, because a redacted name could not match at run time and would look like a grounded element.
  4. `precheckGroundedSteps(steps, snapshots, manualText, role)`: `steps` is a plan entry's steps, `snapshots` an array of parsed snapshot documents (`{ schema_version: 1, role, route, entries: [{ kind, role?, name?, text?, matches }], withheld }`), `manualText` the case's `manual_steps_verbatim` (string or null) and `role` the plan entry's role slug or null (null reads the snapshots whose `role` is `'anonymous'`). Returns `null` when every locator step is acceptable, else the first refusal `{ code, reason }`. Walk the steps in order, tracking `route` (initially `null`): a `goto` or `expect_url` step sets `route = routeKey(step.path)`. For every step whose action is in `LOCATOR_ACTIONS` and for which `locatorOf(step)` is an ok result: find the snapshot whose `role` equals the plan role (or `'anonymous'`) and whose `route` equals the tracked route; refuse `{ code: 'STEP_UNGROUNDED', reason: 'step <n>: no plan-time snapshot covers this role and route; run the ground mode for the route before planning this step' }` when there is none (including `route === null`); find the entry whose `kind`, `role`+`name` or `text` equal the step's exactly; refuse `{ code: 'STEP_UNGROUNDED', reason: 'step <n>: the locator is not a snapshot entry' }` when there is none and `{ code: 'STEP_UNGROUNDED', reason: 'step <n>: the locator matched <matches> elements in the snapshot; a locator must match exactly one' }` when `matches !== 1`. Then, for an `expect_text` locator step, refuse `{ code: 'PLAN_ENTRY_INVALID', reason: 'step <n>: expect_text contains must come from the report\'s own steps, not from the snapshot' }` unless the whitespace-collapsed, lower-cased `contains` is a substring of the whitespace-collapsed, lower-cased `manualText` (a non-string `manualText` fails this). A reason never contains the locator's `name` or `text`.
  Delivers AC-A3, AC-A5 and AC-A6 (this task, the pure half).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:803-810` (a pure function of ordered refusals whose reasons name a position, never a value).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { routeKey, parseAriaSnapshot, partitionSnapshotEntries, precheckGroundedSteps, buildRedactionTable } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  if (routeKey("/a?x=1") !== "/a" || routeKey("/") !== "/" || routeKey(5) !== null) fail("routeKey is wrong");
  const yaml = [
    "- banner:",
    "  - link \"ana@example.com\"",
    "- heading \"Panel\" [level=1]",
    "- button \"Save\"",
    "- button \"Delete\"",
    "- button \"Delete\"",
    "- text: Hello there",
    "- paragraph: ignored prose",
    "- banana \"Not a role\"",
  ].join("\n") + "\n" + String.raw`- img "Logo \"big\""` + "\n";
  const got = parseAriaSnapshot(yaml);
  const has = (p) => got.some((e) => Object.entries(p).every(([k, v]) => e[k] === v));
  if (!has({ kind: "role", role: "heading", name: "Panel" }) || !has({ kind: "role", role: "button", name: "Save" }) || !has({ kind: "role", role: "link", name: "ana@example.com" })) fail("role candidates are missing: " + JSON.stringify(got));
  if (!has({ kind: "role", role: "img", name: "Logo \"big\"" })) fail("an escaped quote was not unescaped: " + JSON.stringify(got));
  if (!has({ kind: "text", text: "Hello there" })) fail("the text candidate is missing");
  if (got.filter((e) => e.name === "Delete").length !== 1) fail("candidates must be de-duplicated");
  if (got.some((e) => e.role === "banana" || e.text === "ignored prose")) fail("an unsupported role or a paragraph leaked in");
  if (parseAriaSnapshot(null).length !== 0) fail("a non-string input must return []");
  if (parseAriaSnapshot(Array.from({ length: 400 }, (_, i) => "- button \"B" + i + "\"").join("\n")).length !== 300) fail("the cap of 300 is not applied");
  const root = mkdtempSync(join(tmpdir(), "qa-ground-pure-"));
  mkdirSync(join(root, "PRPs"), { recursive: true });
  writeFileSync(join(root, "PRPs", "redaction-extensions.txt"), "regex:Ana Souza\n");
  const table = buildRedactionTable({ root, env: {}, secretValues: ["sekret-value-1"] });
  const part = partitionSnapshotEntries([
    { kind: "role", role: "button", name: "Save", matches: 1 },
    { kind: "role", role: "link", name: "ana@example.com", matches: 1 },
    { kind: "text", text: "Welcome Ana Souza", matches: 1 },
    { kind: "text", text: "code sekret-value-1", matches: 1 },
  ], table);
  if (part.kept.length !== 1 || part.kept[0].name !== "Save" || part.withheld !== 3) fail("sensitive entries were not withheld: " + JSON.stringify(part));
  const snap = (route, entries, role = "admin") => ({ schema_version: 1, role, route, entries, withheld: 0 });
  const snaps = [snap("/", [
    { kind: "role", role: "button", name: "Save", matches: 1 },
    { kind: "role", role: "button", name: "Delete", matches: 2 },
    { kind: "role", role: "heading", name: "Panel", matches: 1 },
    { kind: "text", text: "Welcome back", matches: 1 },
  ]), snap("/other", [{ kind: "role", role: "button", name: "Go", matches: 1 }], "anonymous")];
  const manual = "1. Open the panel and click Save, the  Panel heading stays";
  const run = (steps, role = "admin", text = manual) => precheckGroundedSteps(steps, snaps, text, role);
  const goto = { action: "goto", path: "/" };
  if (run([goto, { action: "click", role: "button", name: "Save" }, { action: "expect_text", role: "heading", name: "Panel", contains: "panel   HEADING" }, { action: "expect_visible", text: "Welcome back" }]) !== null) fail("a fully grounded plan was refused");
  if (run([goto, { action: "click", selector: "#legacy" }]) !== null) fail("a selector step must not be checked by the grounding pre-check");
  const refused = (label, r, code) => { if (r === null || r.code !== code) fail(label + " was not " + code + ": " + JSON.stringify(r)); if (/Save|Delete|Panel|Welcome/.test(r.reason.replace(/the panel/g, ""))) fail(label + " reason echoes a locator: " + r.reason); };
  refused("an ambiguous locator", run([goto, { action: "click", role: "button", name: "Delete" }]), "STEP_UNGROUNDED");
  refused("an unknown locator", run([goto, { action: "click", role: "button", name: "Archive" }]), "STEP_UNGROUNDED");
  refused("no goto before the locator", run([{ action: "click", role: "button", name: "Save" }]), "STEP_UNGROUNDED");
  refused("a route with no snapshot", run([{ action: "goto", path: "/missing" }, { action: "click", role: "button", name: "Save" }]), "STEP_UNGROUNDED");
  refused("the wrong role", run([goto, { action: "click", role: "button", name: "Save" }], "viewer"), "STEP_UNGROUNDED");
  refused("an anonymous plan on another role snapshot", run([goto, { action: "click", role: "button", name: "Save" }], null), "STEP_UNGROUNDED");
  if (run([{ action: "goto", path: "/other?x=1" }, { action: "click", role: "button", name: "Go" }], null) !== null) fail("the anonymous snapshot and the query-less route key were not used");
  if (run([goto, { action: "click", role: "button", name: "Go" }, { action: "expect_url", path: "/other" }, { action: "click", role: "button", name: "Save" }], "admin") === null) fail("expect_url must move the tracked route");
  const r1 = run([goto, { action: "expect_text", role: "heading", name: "Panel", contains: "Welcome" }]);
  refused("an expectation not in the report", r1, "PLAN_ENTRY_INVALID");
  refused("a missing manual text", run([goto, { action: "expect_text", role: "heading", name: "Panel", contains: "Panel" }], "admin", null), "PLAN_ENTRY_INVALID");
  const nth = run([goto, { action: "click", role: "button", name: "Save" }, { action: "click", role: "button", name: "Delete" }]);
  if (!nth || !/^step 3:/.test(nth.reason)) fail("the refusal must name the step: " + JSON.stringify(nth));
  '
  ```
  Before this task none of the five names is exported, so the import fails and the block exits non-zero.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — refuse ungrounded locator steps before any side effect

- **ACTION**: Delivers AC-A3 (the case ends `needs-human` `STEP_UNGROUNDED`, naming the step, before anything is seeded, authenticated or requested) and AC-A5 (an expectation not in the report is `PLAN_ENTRY_INVALID`). In `plugins/relay/scripts/qa-run.mjs`:
  1. Add an internal `function loadGroundingSnapshots(runDirAbs)` that lists `<runDirAbs>/grounding` with `readdirSync` (a missing or unreadable directory yields `[]`), parses every `*.snapshot.json` file with `readJsonOrNull`, and returns the parsed documents that are objects with `schema_version === 1`, string `role` and `route`, and an array `entries`.
  2. In `executeCase`, insert one block immediately after the closing brace of the existing api-origin loop (the loop whose body calls `resolveApiOrigin`) and before the line `if (ctx.playwright === null) {`: `if (driver === 'browser' && p.steps.some((/** @type {any} */ s) => isObj(s) && LOCATOR_ACTIONS.includes(s.action) && locatorOf(s) !== null)) {` `const grounded = precheckGroundedSteps(p.steps, loadGroundingSnapshots(ctx.runDirAbs), kase.manual_steps_verbatim, role);` `if (grounded !== null) return out(needsHuman(grounded.code, grounded.reason));` `}`. The pre-check reads the unsubstituted plan steps, so a `{{variable}}` inside a locator can never match a snapshot entry. Leave every existing line of `executeCase` byte-identical; a plan with no locator step is not affected at all.
  3. Do not add a `writeFileSync(` or `renameSync(` call, a second `// GUARD-SITE` marker or an `outcome:` literal.
  Delivers AC-A3 and AC-A5 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2022-2029` (the pre-side-effect refusal block shape and its position before the Playwright gate).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = resolve("plugins/relay/scripts/qa-run.mjs");
  const root = mkdtempSync(join(tmpdir(), "qa-ground-pre-"));
  const runRel = "PRPs/reports/f/qa-run/r1";
  const runDir = join(root, ...runRel.split("/"));
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:9", roles: { admin: {} } }));
  const block = (n, step) => "### " + n + ". Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. " + step + "\n\n";
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + [1, 2, 3, 4].map((n) => block(n, "Open the page and click Save, then see the Panel heading")).join(""));
  const run = (args) => new Promise((res) => { const c = spawn(process.execPath, args, { cwd: root }); let o = "", e = ""; c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => res({ code, o, e })); });
  const parsed = await run([SCRIPT, "parse", "--report", report]);
  if (parsed.code !== 0) fail("parse exited " + parsed.code + ": " + parsed.e);
  const doc = JSON.parse(parsed.o);
  const cases = Array.isArray(doc) ? doc : doc.cases;
  const entry = (i, steps) => ({ index: cases[i].index, title: cases[i].title, driver: "browser", role: null, state: "none", steps });
  const goto = { action: "goto", path: "/" };
  writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: [
    entry(0, [goto, { action: "click", role: "button", name: "Save" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
    entry(1, [goto, { action: "click", role: "button", name: "Delete" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
    entry(2, [goto, { action: "expect_text", role: "heading", name: "Panel", contains: "Welcome" }]),
    entry(3, [goto, { action: "click", role: "button", name: "Save" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
  ] }));
  const snap = (matches) => JSON.stringify({ schema_version: 1, role: "anonymous", route: "/", withheld: 0, entries: [
    { kind: "role", role: "button", name: "Save", matches: 1 },
    { kind: "role", role: "button", name: "Delete", matches },
    { kind: "role", role: "heading", name: "Panel", matches: 1 },
  ] });
  // First run: no grounding directory at all.
  await run([SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel]);
  const read = () => JSON.parse(readFileSync(join(runDir, "results.json"), "utf8"));
  let res = read();
  for (const i of [0, 1, 3]) if (res.cases[i].outcome !== "needs-human" || res.cases[i].reason_code !== "STEP_UNGROUNDED") fail("case " + (i + 1) + " with no snapshot was not STEP_UNGROUNDED: " + JSON.stringify([res.cases[i].outcome, res.cases[i].reason_code]));
  if (!/step 2/.test(res.cases[0].reason)) fail("the refusal does not name the step: " + res.cases[0].reason);
  if (existsSync(join(root, "PRPs", "auth", ".sessions"))) fail("a login ran before the grounding refusals");
  // Second run: a snapshot where Delete matches 2 and everything else matches once.
  mkdirSync(join(runDir, "grounding"), { recursive: true });
  writeFileSync(join(runDir, "grounding", "anonymous--root.snapshot.json"), snap(2));
  await run([SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel]);
  res = read();
  if (res.cases[1].reason_code !== "STEP_UNGROUNDED" || !/2 elements/.test(res.cases[1].reason)) fail("the ambiguous locator was not refused: " + JSON.stringify([res.cases[1].reason_code, res.cases[1].reason]));
  if (res.cases[2].outcome !== "needs-human" || res.cases[2].reason_code !== "PLAN_ENTRY_INVALID") fail("an expectation not in the report was not PLAN_ENTRY_INVALID: " + JSON.stringify([res.cases[2].outcome, res.cases[2].reason_code]));
  for (const i of [0, 3]) if (res.cases[i].reason_code === "STEP_UNGROUNDED" || res.cases[i].reason_code === "PLAN_ENTRY_INVALID") fail("a grounded case " + (i + 1) + " was refused by the pre-check: " + JSON.stringify([res.cases[i].outcome, res.cases[i].reason_code, res.cases[i].reason]));
  '
  ```
  Before this task cases 1-3 are not refused by name (the first run has no pre-check, so none is `STEP_UNGROUNDED`), so the code assertions exit non-zero. The refusals precede the Playwright, state and session gates, so cases 1-3 need neither Playwright nor a login script; the grounded cases (1 and 4 in the second run) go on to the later gates, whose own code (for example `TARGET_UNREACHABLE` for the closed port) is not asserted.

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — the browser driver acts only on a locator that matches exactly one element

- **ACTION**: Delivers AC-A4 (at run time a locator that matches more than one element is never acted on and the case is `needs-human` `STEP_UNGROUNDED`) and the run-time half of AC-A1 (the role-and-name and text forms execute through `getByRole(..., { exact: true })` and `getByText(..., { exact: true })`). In `plugins/relay/scripts/qa-run.mjs`:
  1. Add an internal `async function runLocatorStep(page, step, loc, n)` returning a `CaseResult` that ends the case, or `null` when the step passed. Build `const target = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });` — never `.first()`, `.nth()` or `.last()` on it. Wait for the element with `await target.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});` (the wait only gives the page time; the decision is the count), then `const count = await target.count().catch(() => 0);`. When `count > 1` return `needsHuman('STEP_UNGROUNDED', \`step ${n}: the locator matched ${count} elements at run time; a locator must match exactly one, so nothing was acted on\`)`. When `count === 0`: for `expect_visible` and `expect_text` return `{ outcome: 'fail', reason_code: null, reason: \`step ${n}: the expected element was not found\`, evidence: [] }`; for `click` and `fill` return `blocked('STEP_NOT_PERFORMABLE', \`step ${n}: the ${step.action} target could not be found or acted on\`)`. When `count === 1`: `click` calls `target.click()`, `fill` calls `target.fill(step.value)` (both inside a `try`; a throw returns the same `STEP_NOT_PERFORMABLE` blocked result), `expect_visible` waits `target.waitFor({ state: 'visible', timeout: 10000 })` and returns the `fail` result `step ${n}: the expected element was not visible` when it times out, and `expect_text` reads `target.textContent({ timeout: 10000 }).catch(() => null)` and returns the `fail` result `step ${n}: the expected text was not present` when the text is null or does not include `step.contains`. A reason never contains the locator's name or text, a fill value or a page value.
  2. In `DRIVERS.browser`, insert, between the line `ranTo = i;` and the line `if (step.action === 'goto') {`, exactly: `const lstep = LOCATOR_ACTIONS.includes(step.action) ? locatorOf(step) : null;` then `if (lstep !== null && lstep.ok) {` `const lr = await runLocatorStep(page, step, lstep, n);` `if (lr !== null) {` `verdict = lr;` `break;` `}` `continue;` `}`. Every existing branch of the loop (`goto`, `click`/`fill` via `page.click`/`page.fill`, `query`, the `.first()` expectation branches, `expect_url`) stays byte-identical, so a `selector` step behaves exactly as before; the route-guard line `return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();` and the `keepSteps` line stay byte-identical and occur exactly once.
  3. The final evidence capture and the per-step records are unchanged: a `needs-human` verdict from a locator step flows through the existing `verdict !== null` return, so its `steps` array records the step as `failed` and the later ones `not-run`.
  4. Do not add a `writeFileSync(` or `renameSync(` call or an `outcome:` literal outside the four values.
  Delivers AC-A1 (run time) and AC-A4 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1442-1446` (the step-loop head the locator branch is inserted into).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  import { createServer } from "node:http";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = resolve("plugins/relay/scripts/qa-run.mjs");
  const hits = { saved: 0, deleted: 0 };
  const PAGE = `<!doctype html><html><body><h1>Panel</h1><button onclick="fetch(&quot;/saved&quot;)">Save</button><button onclick="fetch(&quot;/deleted&quot;)">Delete</button><button onclick="fetch(&quot;/deleted&quot;)">Delete</button><span>Welcome back</span></body></html>`;
  const srv = await new Promise((res) => { const s = createServer((q, r) => { if (q.url === "/saved") hits.saved++; if (q.url === "/deleted") hits.deleted++; r.writeHead(200, { "content-type": "text/html" }); r.end(PAGE); }); s.listen(0, "127.0.0.1", () => res(s)); });
  const root = mkdtempSync(join(tmpdir(), "qa-loc-run-"));
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), "junction");
  const runRel = "PRPs/reports/f/qa-run/r1";
  const runDir = join(root, ...runRel.split("/"));
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(join(runDir, "grounding"), { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:" + srv.address().port, roles: { admin: {} } }));
  const block = (n) => "### " + n + ". Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. Click Save and the Panel heading stays\n\n";
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + [1, 2, 3, 4].map(block).join(""));
  const run = (args) => new Promise((res) => { const c = spawn(process.execPath, args, { cwd: root }); let o = "", e = ""; c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => res({ code, o, e })); });
  const parsed = await run([SCRIPT, "parse", "--report", report]);
  if (parsed.code !== 0) fail("parse exited " + parsed.code + ": " + parsed.e);
  const doc = JSON.parse(parsed.o);
  const cases = Array.isArray(doc) ? doc : doc.cases;
  const entry = (i, steps) => ({ index: cases[i].index, title: cases[i].title, driver: "browser", role: null, state: "none", steps });
  const goto = { action: "goto", path: "/" };
  writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: [
    entry(0, [goto, { action: "click", role: "button", name: "Save" }, { action: "expect_text", role: "heading", name: "Panel", contains: "Panel" }, { action: "expect_visible", text: "Welcome back" }]),
    entry(1, [goto, { action: "click", role: "button", name: "Delete" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
    entry(2, [goto, { action: "expect_visible", role: "button", name: "Nothing here" }]),
    entry(3, [goto, { action: "expect_visible", selector: "h1" }, { action: "expect_text", selector: "h1", contains: "Panel" }]),
  ] }));
  // Hand-written snapshot: every locator below is claimed to match exactly once, even Delete (which the page renders twice).
  writeFileSync(join(runDir, "grounding", "anonymous--root.snapshot.json"), JSON.stringify({ schema_version: 1, role: "anonymous", route: "/", withheld: 0, entries: [
    { kind: "role", role: "button", name: "Save", matches: 1 },
    { kind: "role", role: "button", name: "Delete", matches: 1 },
    { kind: "role", role: "button", name: "Nothing here", matches: 1 },
    { kind: "role", role: "heading", name: "Panel", matches: 1 },
    { kind: "text", text: "Welcome back", matches: 1 },
  ] }));
  await run([SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel]);
  await new Promise((r) => setTimeout(r, 500));
  const res = JSON.parse(readFileSync(join(runDir, "results.json"), "utf8"));
  const c = res.cases;
  if (c[0].outcome !== "pass") fail("the grounded role and text locators did not pass: " + JSON.stringify([c[0].outcome, c[0].reason_code, c[0].reason]));
  if (hits.saved !== 1) fail("the Save click was not performed exactly once: " + hits.saved);
  if (c[1].outcome !== "needs-human" || c[1].reason_code !== "STEP_UNGROUNDED" || !/2 elements/.test(c[1].reason)) fail("the run-time ambiguity was not STEP_UNGROUNDED: " + JSON.stringify([c[1].outcome, c[1].reason_code, c[1].reason]));
  if (hits.deleted !== 0) fail("an ambiguous locator was acted on: " + hits.deleted + " delete request(s)");
  if (!c[1].steps || c[1].steps[1].result !== "failed") fail("the ambiguous step was not recorded failed: " + JSON.stringify(c[1].steps));
  if (c[2].outcome !== "fail") fail("an absent expected element was not a fail: " + JSON.stringify([c[2].outcome, c[2].reason_code]));
  if (c[3].outcome !== "pass") fail("a legacy selector case stopped passing: " + JSON.stringify([c[3].outcome, c[3].reason_code, c[3].reason]));
  srv.close();
  process.exit(0);
  '
  ```
  Needs Playwright and an installed Chromium; the fixture links the repository `node_modules` as a junction (the form `qa-run.test.mjs` uses on Windows). Before this task the locator steps fall through the driver loop unhandled, so case 1 does not pass and case 2 is not `STEP_UNGROUNDED`. The snapshot is hand-written so this block exercises the run-time rule independently of the `ground` mode.

### Task 5: UPDATE plugins/relay/scripts/qa-run.mjs — the `ground` mode: a redacted plan-time snapshot with the role's session

- **ACTION**: Delivers AC-A2 (a plan-time accessibility snapshot of one route, taken with the role's session through the runner and never through `capture.mjs`) and AC-A6 (no secret, e-mail or declared personal pattern reaches the snapshot or the terminal; resolves PRD Open Question 2). In `plugins/relay/scripts/qa-run.mjs`:
  1. Add `const GROUND_USAGE = \`Usage:\n  qa-run.mjs ground --root <dir> --feature <slug> --run-dir <rel-dir> --route </path> [--role <slug>] [--env-handle <path>]\n\`;`, an internal `parseGroundArgs(argv)` and an internal `async function runGround(argv)`. `parseGroundArgs` accepts exactly the flags `--root` (resolved, default `process.cwd()`), `--feature` (must match `FEATURE_PATTERN`), `--run-dir`, `--route` (must start with a single `/`), `--role` (optional, must match `ROLE_PATTERN`) and `--env-handle`, each with a value that does not start with `--`; it returns `null` for any other argument, a missing required flag or a bad value.
  2. `runGround`, in this order: on `null` arguments write `GROUND_USAGE` to stderr and return 2; resolve `--run-dir` and require it to be an existing directory inside `PRPs/reports/<feature>/qa-run/` exactly as `runRun` does (otherwise write a message and `GROUND_USAGE` to stderr and return 2); `const target = await guardTarget(resolveTarget(root, envHandle), root);` (the existing guard site; `null` throws `new Halt('TARGET_UNDECLARED', 'no target is declared: set baseUrl in PRPs/auth/login.config.json or pass --env-handle <path>')`); `resolveStepUrl(route, target)` equal to `null` throws `new Halt('FAILED_NON_LOCAL_TARGET', 'the route leaves the guard-approved origin; nothing was requested')`; `loadPlaywright(root, PLUGIN_ROOT)` equal to `null` throws `new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', ...)`; build `table = buildRedactionTable({ root, env: process.env, secretValues: [] })` and a `RunCtx` with the same fields `runRun`'s `makeCtx` builds (`seedConfig: null`); when `--role` is given, require it declared in `loginConfig.roles` (else `Halt('ROLE_UNDECLARED', ...)`), call `obtainSession(ctx, role)` and on a failure throw `Halt('SESSION_UNAVAILABLE', \`the kit login script for role ${role} did not produce a session (${s.code})\`)` (a session registers its cookie and storage values with the redaction table), and open the context with `{ storageState: <session path> }`; without `--role` open it with no storage state and record the role as `'anonymous'`.
  3. Launch headless Chromium (a failure throws `Halt('FAILED_BROWSER_UNAVAILABLE', 'a headless Chromium could not be launched; run `npx playwright install chromium` in plugins/relay/scripts/visual/')`), install a guarded route handler on the context: for a `data:`/`about:`/`blob:` URL continue; for any other URL `if (!target.guard.isAllowedHost(u.hostname, target.allowedHosts)) return route.abort();` followed by `return route.continue();` — two statements, NOT the one-line ternary that `DRIVERS.browser` already contains (that line is an exactly-once anchor of an existing test). Navigate with `page.goto(url, { waitUntil: 'load', timeout: 15000 })` (a failure or a status >= 500 throws `Halt('TARGET_UNREACHABLE', 'the route could not be loaded')`), settle with `await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});`, then `const yaml = await page.locator('body').ariaSnapshot().catch(() => null);` (a non-string result throws `Halt('GROUND_SNAPSHOT_UNAVAILABLE', 'the installed Playwright cannot produce an accessibility snapshot')`). Always close the browser in a `finally`.
  4. Candidates are `parseAriaSnapshot(yaml)`. For each, count the matches with a REAL locator, `page.getByRole(role, { name, exact: true }).count()` or `page.getByText(text, { exact: true }).count()`, each inside a `try` whose failure drops the candidate; the entry is `{ kind: 'role', role, name, matches }` or `{ kind: 'text', text, matches }`. Counting happens BEFORE the partition, on the raw text. Then `const { kept, withheld } = partitionSnapshotEntries(entries, table);`.
  5. Write the document ONLY through `writeRunFile({ runDirAbs, table }, join(runDirAbs, 'grounding', \`${role ?? 'anonymous'}--${slug}.snapshot.json\`), { kind: 'json', value: { schema_version: 1, role: role ?? 'anonymous', route: routeKey(route), entries: kept, withheld } })`, where `slug` is `routeKey(route)` with every run of characters outside `[A-Za-z0-9]` replaced by `-`, leading and trailing `-` removed, and `root` when the result is empty (so `/` is `root` and `/other` is `other`). The raw YAML is never persisted and never printed. A write failure throws `Halt('EVIDENCE_WRITE_FAILED', 'the snapshot could not be written')`. Print exactly one stdout line, `GROUNDED: <run-dir-relative path of the file> entries=<kept count> withheld=<withheld count>`, and return 0.
  6. Add `async function runGroundGuarded(argv)` that calls `runGround(argv)` in a `try` and, in the `catch`, mirrors `main`'s handling: a `Halt` writes `err.message` plus a newline to stderr and returns 1, anything else writes `FAILED_RUNNER_ERROR: the runner stopped on an unexpected error` and returns 1. Insert one line as the first statement of `main`, above `const args = parseArgs(argv);`: `if (argv[0] === 'ground') return await runGroundGuarded(argv.slice(1));`. `parseArgs`, `USAGE`, the header comment and every other line of `main` stay byte-identical, so the existing exit-2 and `Usage:` behavior of `parse`/`init`/`run` is unchanged; add a short `//` comment above `runGround` that documents the mode.
  7. Do not add a second `// GUARD-SITE` marker, a second `writeFileSync(` or `renameSync(`, a sibling `import`, any use of `capture.mjs`, or an `outcome:` literal outside the four values. `ground` writes no `results.json` and never touches the report.
  Open Question 2, resolved here: the parent PRD's `redaction-policy.md` patterns are credential-oriented (env-named values, secret regexes, session values) and do not cover personal data in rendered text, so the snapshot adds the built-in e-mail pattern and the project's own `regex:` lines of `PRPs/redaction-extensions.txt` (already part of `buildRedactionTable`) and WITHHOLDS an entry instead of redacting it in place.
  Delivers AC-A2 and AC-A6 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1908-1914` (a guarded in-runner browser context; note the explicit exception above), `# SOURCE: plugins/relay/scripts/qa-run.mjs:2351-2358` (the `main` dispatcher the mode is routed from) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:682-696` (the single write helper).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, symlinkSync, existsSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  import { createServer } from "node:http";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = resolve("plugins/relay/scripts/qa-run.mjs");
  const TOK = "tok-Zq83kd01-ground";
  const EMAIL = "ana.souza@example.com";
  const hits = { saved: 0, deleted: 0 };
  const PAGE = `<!doctype html><html><body><header><a href="/x">${EMAIL}</a></header><h1>Panel</h1><p>Signed in as ${EMAIL}</p><button onclick="fetch(&quot;/saved&quot;)">Save</button><button onclick="fetch(&quot;/deleted&quot;)">Delete</button><button onclick="fetch(&quot;/deleted&quot;)">Delete</button><span>Welcome back</span></body></html>`;
  const srv = await new Promise((res) => { const s = createServer((q, r) => { if (q.url === "/saved") hits.saved++; if (q.url === "/deleted") hits.deleted++; r.writeHead(200, { "content-type": "text/html" }); r.end(PAGE); }); s.listen(0, "127.0.0.1", () => res(s)); });
  const port = srv.address().port;
  const root = mkdtempSync(join(tmpdir(), "qa-ground-e2e-"));
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), "junction");
  const runRel = "PRPs/reports/f/qa-run/r1";
  const runDir = join(root, ...runRel.split("/"));
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:" + port, roles: { admin: {} } }));
  const stub = [
    "import { writeFileSync, mkdirSync } from \"node:fs\";",
    "import { join } from \"node:path\";",
    "const root = process.argv[process.argv.indexOf(\"--root\") + 1];",
    "mkdirSync(join(root, \"PRPs\", \"auth\", \".sessions\"), { recursive: true });",
    "writeFileSync(join(root, \"PRPs\", \"auth\", \".sessions\", \"admin.json\"), JSON.stringify({ cookies: [{ name: \"access-token\", value: \"" + TOK + "\", domain: \"127.0.0.1\", path: \"/\", expires: -1, httpOnly: false, secure: false, sameSite: \"Lax\" }], origins: [] }));",
  ].join("\n");
  writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), stub);
  const manual = [
    "Click Save and the Panel heading stays",
    "Click Delete",
    "Click Archive",
    "Click Delete on the other page",
    "Check the Panel heading says Welcome",
    "See the Welcome back message",
  ];
  const block = (n) => "### " + n + ". Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. " + manual[n - 1] + "\n\n";
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + [1, 2, 3, 4, 5, 6].map(block).join(""));
  const run = (args) => new Promise((res) => { const c = spawn(process.execPath, args, { cwd: root }); let o = "", e = ""; c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => res({ code, o, e })); });
  // Bad arguments are a usage error, like the other modes.
  for (const args of [["ground"], ["ground", "--root", root, "--feature", "f", "--run-dir", runRel], ["ground", "--bogus"]]) {
    const r = await run([SCRIPT, ...args]);
    if (r.code !== 2 || !r.e.includes("Usage:")) fail("ground with bad arguments did not exit 2 with usage: " + JSON.stringify([args, r.code, r.e]));
  }
  const g = await run([SCRIPT, "ground", "--root", root, "--feature", "f", "--run-dir", runRel, "--route", "/", "--role", "admin"]);
  if (g.code !== 0) fail("ground exited " + g.code + ": " + g.e);
  if (!/^GROUNDED: .*grounding\/admin--root\.snapshot\.json entries=\d+ withheld=\d+/m.test(g.o)) fail("unexpected ground output: " + g.o);
  const snapPath = join(runDir, "grounding", "admin--root.snapshot.json");
  const snapText = readFileSync(snapPath, "utf8");
  const snap = JSON.parse(snapText);
  const find = (p) => snap.entries.find((e) => Object.entries(p).every(([k, v]) => e[k] === v));
  if (snap.schema_version !== 1 || snap.role !== "admin" || snap.route !== "/") fail("snapshot header is wrong: " + JSON.stringify([snap.schema_version, snap.role, snap.route]));
  const save = find({ kind: "role", role: "button", name: "Save" });
  const del = find({ kind: "role", role: "button", name: "Delete" });
  const head = find({ kind: "role", role: "heading", name: "Panel" });
  const welcome = find({ kind: "text", text: "Welcome back" });
  if (!save || save.matches !== 1) fail("Save was not grounded with one match: " + JSON.stringify(snap.entries));
  if (!del || del.matches !== 2) fail("Delete was not counted twice: " + JSON.stringify(snap.entries));
  if (!head || head.matches !== 1) fail("the heading was not grounded: " + JSON.stringify(snap.entries));
  if (!welcome || welcome.matches !== 1) fail("the text entry was not grounded: " + JSON.stringify(snap.entries));
  if (snap.withheld < 1) fail("the e-mail entries were not withheld: " + snap.withheld);
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const text of [snapText, g.o, g.e]) if (text.includes("ana.souza") || text.includes(TOK) || /aria|banner/i.test(text.replace(/ariaSnapshot/g, ""))) fail("the snapshot or the terminal carries a sensitive or raw value");
  // A hand-written snapshot for a second route, so the run-time ambiguity rule is reached past the pre-check.
  writeFileSync(join(runDir, "grounding", "admin--other.snapshot.json"), JSON.stringify({ schema_version: 1, role: "admin", route: "/other", withheld: 0, entries: [{ kind: "role", role: "button", name: "Delete", matches: 1 }] }));
  const parsed = await run([SCRIPT, "parse", "--report", report]);
  if (parsed.code !== 0) fail("parse exited " + parsed.code + ": " + parsed.e);
  const doc = JSON.parse(parsed.o);
  const cases = Array.isArray(doc) ? doc : doc.cases;
  const entry = (i, steps) => ({ index: cases[i].index, title: cases[i].title, driver: "browser", role: "admin", state: "none", steps });
  const goto = { action: "goto", path: "/" };
  writeFileSync(join(runDir, "plan.json"), JSON.stringify({ schema_version: 1, cases: [
    entry(0, [goto, { action: "click", role: "button", name: "Save" }, { action: "expect_text", role: "heading", name: "Panel", contains: "Panel" }]),
    entry(1, [goto, { action: "click", role: "button", name: "Delete" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
    entry(2, [goto, { action: "click", role: "button", name: "Archive" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
    entry(3, [{ action: "goto", path: "/other" }, { action: "click", role: "button", name: "Delete" }, { action: "expect_visible", role: "heading", name: "Panel" }]),
    entry(4, [goto, { action: "expect_text", role: "heading", name: "Panel", contains: "Bem-vindo" }]),
    entry(5, [goto, { action: "expect_visible", text: "Welcome back" }]),
  ] }));
  const done = await run([SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel]);
  await new Promise((r) => setTimeout(r, 500));
  const c = JSON.parse(readFileSync(join(runDir, "results.json"), "utf8")).cases;
  if (c[0].outcome !== "pass" || hits.saved !== 1) fail("the grounded role locators did not pass with one Save click: " + JSON.stringify([c[0].outcome, c[0].reason_code, c[0].reason, hits.saved]));
  for (const [i, why] of [[1, "an ambiguous plan-time locator"], [2, "a locator absent from the snapshot"]]) if (c[i].outcome !== "needs-human" || c[i].reason_code !== "STEP_UNGROUNDED") fail(why + " was not STEP_UNGROUNDED: " + JSON.stringify([c[i].outcome, c[i].reason_code]));
  if (c[3].outcome !== "needs-human" || c[3].reason_code !== "STEP_UNGROUNDED" || !/2 elements/.test(c[3].reason)) fail("the run-time ambiguity was not STEP_UNGROUNDED: " + JSON.stringify([c[3].outcome, c[3].reason_code, c[3].reason]));
  if (c[4].outcome !== "needs-human" || c[4].reason_code !== "PLAN_ENTRY_INVALID") fail("an expectation not in the report was not PLAN_ENTRY_INVALID: " + JSON.stringify([c[4].outcome, c[4].reason_code]));
  if (c[5].outcome !== "pass") fail("the grounded text locator did not pass: " + JSON.stringify([c[5].outcome, c[5].reason_code, c[5].reason]));
  if (hits.deleted !== 0) fail("an ungrounded or ambiguous locator was acted on: " + hits.deleted);
  for (const f of walk(runDir)) { const t = readFileSync(f, "latin1"); if (t.includes(TOK) || t.includes("ana.souza")) fail("a token or an e-mail leaked into " + f); }
  if (done.o.includes(TOK) || done.e.includes(TOK)) fail("the token reached the terminal");
  srv.close();
  process.exit(0);
  '
  ```
  Needs Playwright 1.61 (`locator.ariaSnapshot()`) and an installed Chromium. Before this task `ground` is an unknown mode (exit 2 with usage for the first loop, but the `ground` run with valid flags exits 2 as well), so the `ground exited` assertion exits non-zero. The e-mail appears both as a link name (a role candidate) and as paragraph text; both must be withheld. The `/other` snapshot is hand-written: its Delete entry claims one match, so case 4 can only be stopped by the run-time count.

### Task 6: UPDATE plugins/relay/commands/relay-qa-run.md — the grounding step, literal locator examples and the new rules

- **ACTION**: Delivers AC-A7 (the doc's plan vocabulary carries literal, marked locator examples that validate against `validateStep`, and the grounding rules). In `plugins/relay/commands/relay-qa-run.md`, keep every other section, the required tokens (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`) and the banned-token rule (`design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`) intact; add no fenced `json` block other than the marked step examples (existing doc tests locate the declaration example by its `states` key), and keep the phrases `Until seeds` and `not yet read by the runner` absent:
  1. Immediately before the paragraph that begins `The closed vocabulary.`, add a paragraph "Grounding browser steps". For a case whose browser steps name no selector (or whose labels you cannot trust), run, from a fenced bash block, once per role and route and BEFORE writing the plan entry: `node "${CLAUDE_PLUGIN_ROOT}/scripts/qa-run.mjs" ground --root "<target_root>" --feature "<feature>" --run-dir "<RUN_DIR>" --route "<route>"` (append ` --role "<role>"` when the plan entry names a role and ` --env-handle "<path>"` when the argument was given). It prints `GROUNDED: <path> entries=<n> withheld=<m>`; `Read` the written snapshot file under `<RUN_DIR>/grounding/`. It lists role-and-name and visible-text entries, each with the number of elements it `matches`. A non-zero exit is a named halt (for example `FAILED_PLAYWRIGHT_UNAVAILABLE`, `SESSION_UNAVAILABLE`, `TARGET_UNREACHABLE`): relay it, plan no locator step for that route, and leave the case to the script.
  2. After the sentence listing the other browser actions (the one ending with the `expect_url` object and a full stop), add two literal marked examples and their prose. First, exactly: a marker line `<!-- qa-step-example driver=browser -->` followed by a fenced `json` block containing exactly `{ "action": "click", "role": "button", "name": "Save" }`. Second, exactly: a marker line `<!-- qa-step-example driver=browser -->` followed by a fenced `json` block containing exactly `{ "action": "expect_visible", "text": "Welcome back" }`. Prose: the browser actions `click`, `fill`, `expect_visible` and `expect_text` accept, instead of `selector`, either `role` plus `name` (matched exactly through the accessible role and name) or `text` (matched exactly against visible text); the forms are mutually exclusive, `role` is one of `button`, `link`, `textbox`, `checkbox`, `radio`, `combobox`, `heading`, `tab`, `menuitem`, `option`, `switch`, `searchbox`, `spinbutton`, `slider`, `dialog`, `alert`, `status`, `row`, `cell`, `columnheader`, `listitem`, `img`, `navigation`, `region`, `table`, `menu` or `tabpanel`, and an existing `selector` step is unchanged.
  3. Add the grounding rules, in prose: write a locator step only for an entry of the snapshot of the step's own route and role whose `matches` is exactly `1`, copying its `role` and `name` or its `text` verbatim; the route of a step is the last `goto` or `expect_url` path before it. A step whose element is not in the snapshot, matches 0 or matches more than one element is not planned: omit the case, or the case is `needs-human` `STEP_UNGROUNDED` naming the step, before anything is seeded, authenticated or requested; at run time a locator that matches more than one element is never acted on and also ends the case `needs-human` `STEP_UNGROUNDED`. Elements that only appear after an interaction are not in the snapshot and cannot be grounded. The expectations always come from the report's own steps: an `expect_text` `contains` must appear in the case's manual steps (otherwise `PLAN_ENTRY_INVALID`), and the snapshot only supplies how to find an element, never what to expect.
  4. Add the personal-data rule (PRD Open Question 2): the snapshot never stores raw page text; an entry whose text carries a secret known to the redaction table, an e-mail address or a match of a `regex:` line of `PRPs/redaction-extensions.txt` is withheld (counted in `withheld`) and cannot be used as a locator, so an operator whose pages show account names adds a `regex:` line for them to that file before grounding.
  5. In the Honesty rules list, after the existing bullet that begins `Never invent a selector`, add one bullet: plan a browser step by a role-and-name or text locator only from an entry of a snapshot written by the `ground` mode with `matches` exactly 1; never write a locator from the report's own wording or from the code, and never take an expectation from the snapshot.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:169-174` (marker line plus one-object fenced `json` block for a literal step example).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  grep -qF '{ "action": "click", "role": "button", "name": "Save" }' plugins/relay/commands/relay-qa-run.md
  grep -qF '{ "action": "expect_visible", "text": "Welcome back" }' plugins/relay/commands/relay-qa-run.md
  grep -qF 'qa-run.mjs" ground --root' plugins/relay/commands/relay-qa-run.md
  grep -q 'STEP_UNGROUNDED' plugins/relay/commands/relay-qa-run.md
  grep -qF 'PRPs/redaction-extensions.txt' plugins/relay/commands/relay-qa-run.md
  if grep -qE 'Until seeds|not yet read by the runner' plugins/relay/commands/relay-qa-run.md; then echo "FAIL: a retired stop-gap phrase is back"; exit 1; else echo "PASS: no retired phrase"; fi
  ```
  `runQaRunContractCheck` validates every marked example against the script's own `validateStep`, so it fails if either new example stops validating. The `grep` lines assert prose and objects this task authors (copied byte-for-byte from the ACTION above) and are acceptable because the deliverable is the doc text.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The runner's vocabulary, the contract and the guard-site registry hold, and the new exports exist (exit 1 on any miss).
node --input-type=module -e '
import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
import { runAuthLocalGuardSitesCheck } from "./scripts/validate/checks/auth-local-guard-sites.mjs";
import * as qa from "./plugins/relay/scripts/qa-run.mjs";
const fail = (m) => { console.error(m); process.exit(1); };
if (qa.OUTCOMES.join(",") !== "pass,fail,blocked,needs-human") fail("OUTCOMES changed");
for (const n of ["locatorOf", "routeKey", "parseAriaSnapshot", "partitionSnapshotEntries", "precheckGroundedSteps"]) if (typeof qa[n] !== "function") fail("missing export: " + n);
if (qa.validateStep("browser", { action: "expect_text", selector: "h1", contains: "Dashboard" }) !== null) fail("the legacy browser step no longer validates");
if (qa.validateStep("http", { action: "request", method: "GET", path: "/api/x" }) !== null) fail("the flat http step no longer validates");
for (const r of [runQaRunContractCheck(), runAuthLocalGuardSitesCheck()]) if (!r.ok) fail(JSON.stringify(r.findings, null, 2));
'
# The once-only anchors of the existing tests stay present exactly once in the runner, byte-identical.
node --input-type=module -e '
import { readFileSync } from "node:fs";
const src = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
const anchors = [
  "return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();",
  "const keepSteps = result.outcome === \x27blocked\x27 || result.outcome === \x27needs-human\x27;",
  "const EVIDENCE_HEADERS = [\x27content-type\x27, \x27content-length\x27, \x27location\x27, \x27cache-control\x27];",
  "request: { method: step.method, path: step.path }",
  "maxRedirects: 0",
  "if (!a.includes(\x27://\x27)) continue;",
  "HUMAN GATE STILL OPEN: a runner pass",
  "const ANONYMOUS_CHECK_MS = 20000;",
  "if (isObj(record)) {",
  "return { outcome: \x27pass\x27, reason_code: null, reason: null, evidence };\n  } finally {\n    if (reqCtx)",
  "// GUARD-SITE",
  "// WRITE-SITE",
  "writeFileSync(",
  "renameSync(",
];
let bad = 0;
for (const a of anchors) { const n = src.split(a).length - 1; if (n !== 1) { console.error("anchor occurs " + n + " times, expected 1: " + JSON.stringify(a)); bad++; } }
if (bad > 0) process.exit(1);
'
# The argument parser and usage text are untouched: the old modes still exit 2 with usage, and --help still names the run mode.
node --input-type=module -e '
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const S = resolve("plugins/relay/scripts/qa-run.mjs");
for (const args of [[], ["run", "--bogus"], ["init"]]) {
  const r = spawnSync(process.execPath, [S, ...args], { encoding: "utf8" });
  if (r.status !== 2 || !r.stderr.includes("Usage:")) { console.error("bad exit for " + JSON.stringify(args) + ": " + r.status); process.exit(1); }
}
const h = spawnSync(process.execPath, [S, "--help"], { encoding: "utf8" });
if (h.status !== 0 || !h.stdout.includes("qa-run.mjs run")) { console.error("--help changed"); process.exit(1); }
'
# A runner copied ALONE into a temp plugin dir (as existing tests do) still starts: no new static sibling import.
node --input-type=module -e '
import { mkdtempSync, copyFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "qa-alone-"));
mkdirSync(join(dir, "scripts"), { recursive: true });
copyFileSync("plugins/relay/scripts/qa-run.mjs", join(dir, "scripts", "qa-run.mjs"));
const r = spawnSync(process.execPath, [join(dir, "scripts", "qa-run.mjs"), "--help"], { encoding: "utf8" });
if (r.status !== 0) { console.error("a lone copy of qa-run.mjs does not start: " + r.stderr); process.exit(1); }
'
# AC-15: the four frozen surfaces are byte-identical to HEAD (single-argument diff, working tree vs HEAD).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# The report-producing command is untouched (plan side only). Only files clean at HEAD are asserted here:
# phases 1-5 already modified qa-run.mjs, relay-qa-run.md, the check files and docs/api-reference.md uncommitted,
# so a diff against HEAD cannot isolate this phase for them.
if [ -n "$(git diff --name-only HEAD -- plugins/relay/commands/relay-qa-report.md)" ]; then
  echo "FAIL: relay-qa-report.md changed"; exit 1
else
  echo "PASS: relay-qa-report.md untouched"
fi
# No forbidden .claude/PRPs reference introduced outside the quoted prohibition idiom.
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite (28 checks, no new check file) must pass; its exit code propagates.
npm run validate
# The whole corpus, glob quoted: every existing qa-run test still passes against the extended script
# (the change is additive: existing messages, anchors, the argument parser and the evidence shape of non-locator steps are unchanged).
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-13):** Given a browser step that names no selector, when the plan is validated, then the step may name its target by `role` plus `name` or by `text` (flat, mutually exclusive with `selector`, role from a closed list), on `click`, `fill`, `expect_visible` and `expect_text`; a malformed or mixed locator is `PLAN_ENTRY_INVALID`, every existing `selector` step validates and behaves exactly as before, and at run time the forms execute through `getByRole(role, { name, exact: true })` and `getByText(text, { exact: true })`.
- **AC-A2 (PRD AC-13):** Given a route and a role, when `qa-run.mjs ground` runs, then it reads a redacted accessibility snapshot of that route with the role's saved session (through the runner, never `capture.mjs`), behind the local-only guard, and writes only the role-and-name and text entries of the page, each with its real match count, to `<run-dir>/grounding/<role>--<slug>.snapshot.json` through the runner's single write helper.
- **AC-A3 (PRD AC-13):** Given a browser plan entry with locator steps, when the runner validates it, then every locator must be a snapshot entry of the step's own role and route with exactly one match; a step that matches zero or several elements, has no snapshot, or whose entry is absent is not planned and the case is `needs-human` with `STEP_UNGROUNDED`, naming the step, before anything is seeded, authenticated or requested.
- **AC-A4 (PRD AC-13):** Given a locator that is grounded at plan time, when the browser driver runs it and the page now matches more than one element, then nothing is acted on and the case is `needs-human` with `STEP_UNGROUNDED`; zero matches is a `fail` for an expectation and `STEP_NOT_PERFORMABLE` for a `click` or `fill`, and a locator never passes through `.first()`.
- **AC-A5 (PRD AC-13):** The expectations always come from the report's own steps: an `expect_text` locator step whose `contains` does not appear in the case's manual steps is `PLAN_ENTRY_INVALID`, and the snapshot supplies only how to find an element.
- **AC-A6 (PRD AC-16):** No secret, session value, e-mail address or `regex:` pattern of `PRPs/redaction-extensions.txt` appears in a snapshot, a run artifact or the terminal: sensitive entries are withheld (counted, never written, never redacted in place), the raw accessibility text is never persisted, and PRD Open Question 2 is resolved as "the redaction-policy patterns are not enough for personal data; add the e-mail pattern and the existing per-project `regex:` extensions, and withhold".
- **AC-A7 (PRD AC-1):** `relay-qa-run.md` carries literal, marked locator examples that validate against `validateStep`, the `ground` command, the grounding and personal-data rules and the `STEP_UNGROUNDED` code; `npm run validate` still passes.
- **AC-A8 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, the report is never written, and `OUTCOMES` is still exactly the four values.

R8b (PRD AC-N token check) is satisfied here by the `(PRD AC-N)` tokens above; the criteria are phase-scoped slices of PRD AC-13, AC-16, AC-1 and AC-15. Task bodies cite them as: Task 1 delivers AC-A1; Task 2 delivers AC-A3, AC-A5 and AC-A6 (pure half); Task 3 delivers AC-A3 and AC-A5; Task 4 delivers AC-A1 (run time) and AC-A4; Task 5 delivers AC-A2 and AC-A6; Task 6 delivers AC-A7; AC-A8 is held by the Level 2 frozen-surface check across all tasks.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Grounding matches loosely and produces a false `pass` | H | H | Exact (`exact: true`) role-and-name and text matching, a closed role list, no `.first()` on a locator step, the match count checked at plan time (snapshot `matches === 1`) and again at run time (`count()` must be 1), `expect_text` expectations required to come from the report, and `STEP_UNGROUNDED` whenever in doubt; Tasks 2-5 VALIDATE each rule, including the run-time ambiguity with a snapshot that lies |
| A snapshot leaks an account name, e-mail or field value (PRD NF7) | M | H | Raw accessibility text is never persisted; only role-and-name/text entries are written, and any entry matching the redaction table, the built-in e-mail pattern or a `regex:` extension is withheld rather than redacted in place; Task 5's end-to-end VALIDATE plants an e-mail in a link and in a paragraph and scans the snapshot, the run directory and the terminal. Account names with no declared pattern are NOT caught; the doc tells the operator to add a `regex:` line, and the phase 8 dogfood re-checks both projects (`TBD - needs validation`) |
| The screenshot or page-text evidence of an executed case still shows personal data | M | M | Out of scope and unchanged (parent PRD behavior; the final capture is only withheld for secrets known to the table); recorded for the phase 8 secrecy scan |
| A new static sibling import or a changed once-only anchor breaks the existing tests that copy or mutate `qa-run.mjs` | M | H | All code stays inside `qa-run.mjs`; the `ground` mode is routed from `main` before `parseArgs` so `parseArgs`/`USAGE` are untouched; the driver's route-guard line is not duplicated; Level 2 counts every known anchor exactly once, starts a lone copy of the script and re-checks the CLI exit codes; Level 3 runs the whole corpus |
| `locator.ariaSnapshot()` output differs from the parser's expectation (format, role vocabulary, `[ref=...]` suffixes) | M | M | `parseAriaSnapshot` ignores every line it does not recognize, the match counts come from real locators, and a candidate whose count throws is dropped; a page that yields no usable entries simply grounds nothing (every locator step is then `STEP_UNGROUNDED`, never a pass). The format was not executed while planning (`TBD - needs validation`): Task 5's VALIDATE is the first real run and its fixture assertions are the thing to adjust if Playwright 1.61 formats a line differently |
| Elements that only appear after an interaction cannot be grounded, so some report steps stay `needs-human` | H | L | Accepted and honest: the snapshot is of a route as first loaded; such steps are `STEP_UNGROUNDED` or left to the operator, which the success metric tolerates (it counts named reasons, not coverage of every step) |
| A grounding pre-check false-rejects a legitimate expectation whose wording differs from the report | M | L | The substring test is whitespace- and case-insensitive; a paraphrase makes the case `needs-human` `PLAN_ENTRY_INVALID`, never a false pass; the doc tells the planning agent to copy the report's own words |
| Chromium or the junctioned `node_modules` is unavailable when a browser VALIDATE runs | M | M | A missing `playwright` surfaces as the named `FAILED_PLAYWRIGHT_UNAVAILABLE`, a missing browser as `FAILED_BROWSER_UNAVAILABLE`, and the assertion on the expected outcome fails by name; the fixture uses `symlinkSync(..., "junction")` like `qa-run.test.mjs` on Windows |
| A doc test pins wording this phase changes | L | M | The doc edit is additive (no sentence is removed); any failing doc-parsing test is routed to the test pair as `EXISTING_TEST_UPDATED` (Notes), never edited by the Implementer, and excluded by name from Level 3 only if it fails for exactly that reason |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Decision recorded: the snapshot helper is a `ground` mode of `qa-run.mjs`, not a sibling module and not `capture.mjs`.** A new sibling would be a registered guard site and a static or lazy import the copy-alone tests do not copy (phase 4's amendment); `capture.mjs` is frozen (AC-15). `ground` is dispatched from `main` before `parseArgs`, so `parseArgs`, `USAGE` and the header comment stay byte-identical (the existing CLI test asserts exit 2 plus `Usage:` for bad `parse`/`init`/`run` arguments and `qa-run.mjs run` in `--help`). `qa-run.mjs` is already the registered guard site and keeps its single `// GUARD-SITE`, `// WRITE-SITE`, `writeFileSync(` and `renameSync(`, so `GUARD_SITES` is untouched and no guard-sites test is disturbed.
- **Decision recorded: PRD Open Question 2 (are `redaction-policy.md` patterns enough for personal data in snapshots?) is resolved as "no".** The policy's patterns are credential-oriented (environment-variable-named values, secret-shaped regexes, session cookie and storage values), and web research found no built-in Playwright option that redacts e-mails or account names in `ariaSnapshot()` output (the Playwright MCP's own secret masking is exact-text and console-only). Resolution: (1) never persist the raw snapshot, only role-and-name/text entries; (2) withhold, not redact in place, any entry matching the redaction table, the built-in e-mail pattern or a `regex:` line of `PRPs/redaction-extensions.txt`; (3) account names with no declared pattern are not caught, so the operator declares them in that existing file (no new schema); (4) the phase 8 dogfood re-checks `super-ensino` NF7. Withholding instead of redacting is deliberate: a redacted name could not match at run time and would look like a grounded element.
- **Decision recorded: the plan-time exactly-one rule is enforced by the script, not by the planning agent's honesty.** The `ground` mode records the real `count()` of each candidate; `executeCase` refuses, before any side effect, a locator that is not an entry with `matches === 1` for the step's own role and route. The route of a step is the last `goto` or `expect_url` path before it. At run time the driver independently requires `count() === 1` and never calls `.first()` on a locator step.
- **Decision recorded: run-time zero matches.** More than one match is `needs-human` `STEP_UNGROUNDED` for every action. Zero matches is a `fail` for `expect_visible`/`expect_text` (the expectation is unmet, as with the existing selector branches) and `STEP_NOT_PERFORMABLE` (`blocked`) for `click`/`fill`, the existing code for an unreachable action target.
- **Decision recorded: no new tracked declaration and no `redact` list.** Open Question 2 is answered with the existing `PRPs/redaction-extensions.txt` mechanism; `qa-seed.json` and `login.config.json` are untouched by this phase.
- **Reason codes:** `STEP_UNGROUNDED` (`needs-human`, plan time and run time). `PLAN_ENTRY_INVALID` is reused for an `expect_text` expectation not in the report. The `ground` mode's own halts (stderr plus exit 1, no `results.json`): `TARGET_UNDECLARED`, `FAILED_NON_LOCAL_TARGET`, `FAILED_PLAYWRIGHT_UNAVAILABLE`, `ROLE_UNDECLARED`, `SESSION_UNAVAILABLE`, `FAILED_BROWSER_UNAVAILABLE`, `TARGET_UNREACHABLE`, `GROUND_SNAPSHOT_UNAVAILABLE`, `EVIDENCE_WRITE_FAILED`. None is an outcome; `OUTCOMES` is unchanged.
- **Anchors this phase must not disturb (found by grep of `scripts/validate/checks/*.test.mjs`).** `qa-run.test.mjs` uses `mutate` with exactly-once literals including the driver's route-guard line, `keepSteps`, `EVIDENCE_HEADERS`, `request: { method: step.method, path: step.path }`, `maxRedirects: 0`, the `://` seed scan and the pass-return/`finally { if (reqCtx)` pair; `qa-run-kit-hardening.test.mjs` uses `const ANONYMOUS_CHECK_MS = 20000;` and `if (isObj(record)) {`. Level 2 counts all of them. The browser driver is tested behaviourally (`expect_text` on a missing element must stay `fail` with one evidence file), which the selector branches, untouched, preserve.
- **Existing tests this phase is expected to disturb: none.** The change is additive. If a test nevertheless fails (for example a doc test pinning wording near the browser examples), list it as `EXISTING_TEST_UPDATED` work for the test pair, never as an Implementer edit.
- **Recorded for the test pair.** New cases for: `locatorOf` and the `stepRules` locator block (valid and malformed forms, mixing with `selector`, the http driver rejecting them, the legacy messages unchanged); `parseAriaSnapshot` (escaped quotes, unsupported roles, de-duplication, the 300 cap); `partitionSnapshotEntries` (the table, the e-mail pattern, a `regex:` extension line); `precheckGroundedSteps` (route tracking through `goto` and `expect_url`, role and anonymous snapshots, ambiguity, absence, the report-sourced expectation, no value in a reason); `executeCase` refusals before the Playwright gate (the Task 3 fixture shape, which needs no browser); `runLocatorStep` end to end (the Task 4 fixture: one click, a lying snapshot stopped by the run-time count, zero matches as `fail`); the `ground` mode end to end (the Task 5 fixture: bad arguments exit 2 with usage, match counts, withheld e-mails, no leak into any file or stream); and the extended `qa-run-contract` doc example check for the two new locator examples. The full corpus must be run with the quoted glob `node --test "scripts/validate/**/*.test.mjs"` after the ledger updates.
- **Where the snapshots are read.** `<run-dir>/grounding/*.snapshot.json`, one per role and route, written only by `ground`. A run directory with no `grounding` folder simply has no snapshots, so every locator step is `STEP_UNGROUNDED`.
- The plan writer has no shell tool in this session: the VALIDATE commands were derived by reading the current working tree (for example `locatorOf`, `routeKey`, `parseAriaSnapshot`, `partitionSnapshotEntries`, `precheckGroundedSteps` and the `ground` mode do not exist, so Tasks 1-5 exit non-zero before the work) and were not executed. Tasks 3-5 reuse the report-fixture shape and the `parse` output handling of phase 5 (an array or `{ cases }`, both handled) and its login stub; if the shared parser needs a different heading shape, adjust the fixture, not the assertions. The exact `ariaSnapshot()` line format for the fixture page (a link named by an e-mail, a `- text:` line for the span, `- heading "Panel" [level=1]`) is the least certain input: if Playwright 1.61 renders it differently, fix the parser to the observed format, not the assertions. The Level 2 anchor, frozen-surface, CLI and forbidden-reference checks and Level 3 pass on the unmodified tree by design (apart from the new-export assertion), as regression guards.
- Release is out of scope: the cut follows the phase 8 dogfood.

*Generated: 2026-10-06*
*Approved: 2026-10-06*
*Implemented: 2026-10-06*
*Status: IMPLEMENTED*
