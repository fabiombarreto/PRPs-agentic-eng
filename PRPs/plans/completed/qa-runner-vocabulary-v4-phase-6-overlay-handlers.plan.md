# Feature: Overlay handlers (Phase 6 of qa-runner-vocabulary-v4)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` seed declarations beside `channel_sources`, `results.json` case evidence, the `ground` mode output); new interaction with the local application (declared overlay dismissals that may persist state) under the local-only guard and the dedicated-role rule; cross-cutting artifact (`PRPs/auth/qa-seed.json` is a project kit file the runner reads)
- Decisions found:
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3): item 7 (writes only for roles declared `dedicated`), item 11 (environment signals stay outside the reason-code catalogue)
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`": closed outcome vocabulary, the local-only guard is permanent, a runner pass is evidence and not approval
  - `PRPs/prds/qa-runner-vocabulary-v4.prd.md` Decisions Log: "Overlay handling: project-declared handlers on `page.addLocatorHandler`" (not a per-plan dismiss step, not forced clicks); "Where handlers are declared: `PRPs/auth/qa-seed.json` beside `channel_sources`"
  - [2026-04-19] "Secret redaction policy for Test Runner reports": reasons and evidence are fixed words and ids, never page text
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a dismissal is recorded as handler id, step position and a closed result word, never the locator words or page text
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic": handlers are declared by the project, never inferred from the page
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": tests that pin the old `ground` stdout or `replayGroundingPrefix` arity are updated only by the test pair
  - "Relying on interactive permission prompts in the autonomous loop": registration and the write gate are structural and non-interactive
- Applicable architectural rules:
  - Command versus script separation: the script validates, gates, executes and records
  - The local-only guard is a hard failure at every network- or store-touching site (`auth-local-guard-sites`): a dismissal that leaves the approved origin blocks the case
  - `npm run validate` keeps its 28 checks: existing checks are extended, none is added
  - R-X strict: the Implementer authors zero test files
  - PRP artifact paths: plan under `PRPs/plans/`, run evidence under `PRPs/reports/<feature>/qa-run/<run-id>/`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-vocabulary-v4.prd.md` — Implementation Phases row 6: "Overlay handlers" — Goal: known overlays never cost a step — Success signal: AC-12, AC-13 hold on fixtures with a tour-like and a panel-like overlay.

## Summary

`PRPs/auth/qa-seed.json` gains an optional `overlay_handlers` array beside `channel_sources`. Each entry declares an `id`, a `trigger` locator, a `dismiss` locator (both the plain v3 forms only: role+name or text, exact match) and, when dismissing persists state, `"effect": "write"`. A pure `classifyOverlayHandlers` validates the array and splits it into handlers to register and write-effect handlers to skip (role not declared `dedicated`); a malformed declaration ends a browser case `blocked` `OVERLAY_HANDLER_INVALID` before any seed, session or request, and halts `ground` with the same code, the treatment `channel_sources` already gets. A runtime `registerOverlayHandlers` registers each handler once per page with `page.addLocatorHandler` (bounded `times`, default post-handler wait, a non-forced dismissal click with its own short timeout), tracks the current step position, records every firing as handler id, step and a closed result word, and notes any dismissal that navigates off the guard-approved origin. The browser driver registers right after `newPage()`, writes one `case-<n>.overlay.json` evidence file when a handler fired or was skipped, and ends the case `blocked` `FAILED_NON_LOCAL_TARGET` when a dismissal left the origin. `ground` (plain route and `--prefix` replay) registers the same handlers, probes once before the snapshot so a load-time overlay is dismissed, and prints one fixed line per firing or skipped handler. An overlay with no declared handler is untouched, so a click it blocks keeps reporting phase 2's cause `covered`.

## User Story

As the AI session that plans and runs a QA report's cases
I want the overlays my project knows about (a dev tools panel, an onboarding tour) dismissed by handlers the project declares, with every dismissal recorded
So that an overlay no longer costs a step (S-5 and S-6 and every student page) and the human gate receives only what truly needs a person.

## Problem Statement

A dev tools panel and an onboarding overlay left by the application kept S-5's and S-6's steps out of the 0.47.0 dogfood (KD-19, KD-20): the click is blocked by an element a person would simply close. The v3 rules forbid forced clicks and planner-written selectors, so the only legitimate answer is a dismissal the project itself declares, bounded and visible in the evidence.

## Solution Statement

Reuse Playwright's documented mechanism instead of a parallel dismissal path, and keep every existing rule: declared in the kit (never inferred), the locator forms of v3 only, the dedicated-role rule applied to a write-effect handler as to a write step, the local-only guard as a hard block, no forced click, no page text in any artifact. The pure classifier mirrors `classifyChannelSource` (fixed sentences, no echo of declared words); the runtime helper is a small exported unit so it can be exercised with a fake page; the two call sites (run driver, ground) add one registration each and change nothing else when no handler is declared.

## Metadata

| Key | Value |
|-----|-------|
| Type | Enhancement |
| Complexity | Medium |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs` (seed declaration validation, per-case precheck, browser driver, case evidence, `ground` mode, `replayGroundingPrefix`) |
| Dependencies | Phase 2 (`covered` cause, `probeActionFailure`), phase 3 (assertion continuation) and phase 5 (`isDedicatedRole` gate shape), all complete in the working tree; Playwright 1.64.1 resolves here (`addLocatorHandler` since 1.44) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` lines 84-85, 161, 216-219 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-vocabulary-v4.prd.md` | 84-85, 161, 169, 216-219 | AC-12, AC-13, the Architecture Note on handlers, the Technical Risk row, Phase 6 details |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1804-1844 | `classifyChannelSource`: the pure, fixed-sentence declaration reader the new classifier mirrors (new code goes right after it) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1320-1349, 1178 | `isControlLocator`, `locatorOf` (the v3 plain forms the handler locators reuse) and `API_ORIGIN_NAME` (the id shape) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1648-1652 | `isDedicatedRole`: read-only, the write-handler gate |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 3996-4062, 4266-4294 | the browser driver: context and page creation, the step loop head, the final capture and the evidence assembly |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 5233-5296, 5340-5342 | the per-case validation order, the `channel_sources` precheck pattern and the driver call that passes the plan |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 5853-5884, 5951-6050 | `replayGroundingPrefix` and the `ground` body (page creation, replay, snapshot, output) |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 1154-1162 | `probeActionFailure` and `notPerformable`: read-only, to confirm a still-blocking overlay ends `covered` |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 457-467 | the ground-section order pins (`requireRunIgnore(` before `replayGroundingPrefix(` before `waitForStableSnapshot(`) that Task 4 must keep |
| P1 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 65-69 | the substring pins for `qa-run.mjs` (`// GUARD-SITE`, `checkTarget`, `FAILED_NON_LOCAL_TARGET`; `--local-host` forbidden): keep intact |

## Patterns to Mirror

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1812-1823
export function classifyChannelSource(sources, channel, root) {
  const invalid = (/** @type {string} */ reason) => ({ ok: /** @type {const} */ (false), code: 'CHANNEL_SOURCE_INVALID', reason });
  if (!isStr(channel) || !READ_MESSAGE_CHANNELS.includes(channel)) return invalid('the channel must be mail or sms');
  if (!isObj(sources) || !Object.hasOwn(sources, channel)) {
    return { ok: false, code: 'EXTERNAL_CHANNEL', reason: REASON_CATALOGUE.EXTERNAL_CHANNEL.reason };
  }
  const entry = sources[channel];
  if (!isObj(entry) || Object.keys(entry).some((k) => !['kind', 'url', 'path'].includes(k))) {
    return invalid(`the ${channel} channel source must be an object with kind and ${channel === 'mail' ? 'url' : 'path'} only`);
  }
  const kind = /** @type {Record<string, string>} */ (CHANNEL_SOURCE_KINDS)[channel];
  if (entry.kind !== kind) return invalid(`the ${channel} channel source kind must be ${kind}`);
```
Copied by Task 1: a pure, total declaration reader returning `{ ok: false, code, reason }` with fixed sentences that never echo a declared word; the new code is `OVERLAY_HANDLER_INVALID`.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:5867-5875
    const loc = locatorOf(step);
    if (loc === null || !loc.ok) return { ok: false, reason: `prefix step ${n}: the step does not name its element by role and name, or by text` };
    const located = loc.form === 'role' ? page.getByRole(loc.role, { name: loc.name, exact: true }) : page.getByText(loc.text, { exact: true });
    // The wait only gives the page time to render; the decision is the count.
    await located.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const count = await located.count().catch(() => 0);
    if (count !== 1) {
      return { ok: false, reason: `prefix step ${n}: the locator matched ${count} elements; a prefix step must match exactly one, so nothing was acted on` };
    }
```
Copied by Task 2: the plain-form locator build (`getByRole(role, { name, exact: true })` / `getByText(text, { exact: true })`) is the only form a handler locator takes; the count-must-be-one idea is not copied (a handler dismiss click lets Playwright's strict mode refuse an ambiguous locator, recorded as `dismiss_failed`).

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:4033-4040
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    if (watchesRequests) requestLog = observeRequests(page, target);
```
Copied by Task 2 (the protocol exemption and the host test become `overlayUrlApproved`) and Task 3 (the registration goes right after `setDefaultTimeout`, before `observeRequests`).

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:5287-5291
  const channelSources = seedConfig && isObj(seedConfig) ? seedConfig.channel_sources : undefined;
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'read_message') continue;
    const src = classifyChannelSource(channelSources, s.channel, root);
    if (!src.ok) return out(src.code === 'EXTERNAL_CHANNEL' ? needsHuman(src.code, `step ${i + 1}: ${src.reason}`) : blocked(src.code, `step ${i + 1}: ${src.reason}`));
```
Copied by Task 3: the declaration is read from the already-loaded `seedConfig`, and a malformed one is `blocked` with the classifier's own code and reason, before any seed, session or request.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:5995-6006
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      if (resp !== null && resp.status() >= 500) throw new Error('server error');
    } catch {
      throw new Halt('TARGET_UNREACHABLE', 'the route could not be loaded');
    }
    if (prefix !== null) {
      const replayed = await replayGroundingPrefix(page, prefix, target);
      if (!replayed.ok) throw new Halt('GROUND_PREFIX_FAILED', replayed.reason);
    }
```
Copied by Task 4: registration goes between `setDefaultTimeout` and the `goto`, so it covers the plain route, the prefix replay and the probe; a malformed declaration is a `Halt` like every other ground refusal.

```js
# SOURCE: plugins/relay/scripts/qa-run.mjs:1648-1652
export function isDedicatedRole(loginConfig, role) {
  if (!isObj(loginConfig) || !isObj(loginConfig.roles) || !isStr(role) || !Object.hasOwn(loginConfig.roles, role)) return false;
  const entry = loginConfig.roles[role];
  return isObj(entry) && entry.dedicated === true;
}
```
Read by Tasks 3 and 4 (not copied, not edited): its boolean feeds `classifyOverlayHandlers`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | `classifyOverlayHandlers` and its constants, `overlayUrlApproved`, `summarizeOverlayWatch`, `registerOverlayHandlers`, the per-case precheck and driver registration, the off-origin block and the overlay evidence file, the `ground` registration, probe and output, and the optional fourth argument of `replayGroundingPrefix` (AC-12, AC-13) |

## NOT Building (Scope Limits)

- Any edit to a test file. Tests that pin the `ground` stdout or the `replayGroundingPrefix` arity go stale only if they assert on something this phase changes (see Notes) and are updated by the test pair.
- `plugins/relay/commands/relay-qa-run.md`, `plugins/relay/commands/relay-qa-seed.md` (the `overlay_handlers` example with its `<!-- qa-step-example driver=… -->` marker, the declaration rules, the new code in the code table), `documentation/`, the version bump and changelog: Phase 7 (AC-15, AC-17, AC-18).
- Scoped locator forms for `trigger` or `dismiss` (`within`, `name_prefix`, `label_text`, `index`, `anchor_text`): the plain role+name and text forms are enough for a tour or a panel, and the minimum keeps the declaration reviewable. Phase 8 can request more from the dogfood evidence.
- Forced clicks (`force: true`), `noWaitAfter: true`, planner-written selectors, handlers inferred from the page, handlers declared in `login.config.json` or in a plan entry.
- Dismissal in the `http` driver, in `anonymousCheck`, or on the `request` steps: only browser pages register handlers.
- Registering a handler in a context other than the case's single page (popups and new tabs are not covered).
- Any change to `isCoveredAtActionPoint`, `probeActionFailure`, `continuesAfterFailure`, `groundLocators` or the gap and truncation rules.
- Adding the new code to `REASON_CATALOGUE` or `RUNTIME_REASON_CATALOGUE`: like `CHANNEL_SOURCE_INVALID` and `API_ORIGIN_INVALID`, `OVERLAY_HANDLER_INVALID` is a runner-written blocked code outside the catalogue; the command doc's code table is Phase 7's.
- Per-case dismissal counts in the final report summary (a Could row of the PRD), the dogfood kit changes and the project declarations (Phase 8).
- The frozen files: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`.
- A new `npm run validate` check (the count stays 28).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the declaration: `classifyOverlayHandlers`

- **ACTION**: Satisfies AC-A6 (and the declaration half of AC-A4). Directly after `classifyChannelSource` (`qa-run.mjs:1844`) add: `export const OVERLAY_HANDLERS_MAX = 10;`, `export const OVERLAY_HANDLER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;` and `export const OVERLAY_WRITE_SKIP_REASON = 'a write-effect handler is not registered: the role is not declared dedicated';`, then `export function classifyOverlayHandlers(declared, dedicated)`: pure and total, no file or network access. `declared === undefined` is valid and yields `{ ok: true, handlers: [], skipped: [] }`. Otherwise it returns `{ ok: false, code: 'OVERLAY_HANDLER_INVALID', reason }` for the first refusal, in this order, each reason a fixed sentence that names a one-based entry position or a key and NEVER echoes a declared id, locator word or value: not an array (`overlay_handlers must be an array`); more than `OVERLAY_HANDLERS_MAX` entries (`overlay_handlers allows at most 10 entries`); per entry, `overlay_handlers entry N: ` followed by one of `must be an object with id, trigger, dismiss and optionally effect` (not an object, or a key outside `id`, `trigger`, `dismiss`, `effect`, or `id`/`trigger`/`dismiss` missing), `id must be 1 to 40 letters, digits, hyphens or underscores, starting with a letter or digit` (not a string matching `OVERLAY_HANDLER_ID`), `id repeats an earlier entry`, `trigger must name an element by role and name, or by text, and nothing else`, `dismiss must name an element by role and name, or by text, and nothing else`, `effect must be "write" when present`. A locator is valid only when it is an object whose keys are exactly `role` and `name`, or exactly `text`, and `locatorOf(locator)` (`qa-run.mjs:1331`, read it first) returns `ok: true` with form `role` or `text`; this rules out `within`, `name_prefix`, `label_text`, `index`, `anchor_text`, `selector`, an unsupported role and a blank string. On success: `dedicated === true` (strictly the boolean) decides the split. Every entry without an `effect` is a handler to register; an entry with `effect: "write"` is a handler to register only when `dedicated === true`, else it goes to `skipped` as `{ id, reason: OVERLAY_WRITE_SKIP_REASON }`. `handlers` holds plain copies `{ id, trigger, dismiss, effect }` (`effect` is `'write'` or `null`; each locator copied as `{ role, name }` or `{ text }` only) in declaration order, so no caller-owned object leaks. Every entry is validated even when it will be skipped. Do NOT touch `classifyChannelSource`, `REASON_CATALOGUE` or `RUNTIME_REASON_CATALOGUE`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1812-1823`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.equal(typeof m.classifyOverlayHandlers, "function");
  assert.equal(m.OVERLAY_HANDLERS_MAX, 10);
  assert.ok(m.OVERLAY_HANDLER_ID instanceof RegExp);
  const c = m.classifyOverlayHandlers;
  const tour = { id: "tour", trigger: { role: "dialog", name: "Bem-vindo" }, dismiss: { text: "Fechar tour" } };
  const save = { id: "save-banner", trigger: { text: "Salvar?" }, dismiss: { role: "button", name: "Salvar e fechar" }, effect: "write" };
  assert.deepEqual(c(undefined, false), { ok: true, handlers: [], skipped: [] });
  assert.deepEqual(c([], false), { ok: true, handlers: [], skipped: [] });
  const plain = c([tour, save], false);
  assert.deepEqual(plain, { ok: true, handlers: [{ id: "tour", trigger: { role: "dialog", name: "Bem-vindo" }, dismiss: { text: "Fechar tour" }, effect: null }], skipped: [{ id: "save-banner", reason: m.OVERLAY_WRITE_SKIP_REASON }] });
  const ded = c([tour, save], true);
  assert.deepEqual(ded.handlers.map((h) => [h.id, h.effect]), [["tour", null], ["save-banner", "write"]]);
  assert.deepEqual(ded.skipped, []);
  assert.deepEqual(c([tour, save], "true").skipped.map((s) => s.id), ["save-banner"], "only the boolean true counts as dedicated");
  assert.deepEqual(c([tour, save], undefined).skipped.map((s) => s.id), ["save-banner"]);
  assert.notEqual(ded.handlers[0].trigger, tour.trigger, "plain copies, not the caller objects");
  const Z = "Zxq-secret-word";
  const many = Array.from({ length: 11 }, (_, k) => ({ ...tour, id: `h${k}` }));
  const bad = [
    "x", {}, null, many, [null], [[]], [{ ...tour, extra: 1 }],
    [{ trigger: tour.trigger, dismiss: tour.dismiss }],
    [{ id: tour.id, dismiss: tour.dismiss }],
    [{ id: tour.id, trigger: tour.trigger }],
    [{ ...tour, id: `bad ${Z}` }], [{ ...tour, id: "" }], [{ ...tour, id: 7 }], [{ ...tour, id: `-${Z}` }],
    [tour, { ...tour }],
    [{ ...tour, trigger: { role: "dialog" } }],
    [{ ...tour, trigger: { role: "dialog", name: Z, within: { role: "dialog", name: "B" } } }],
    [{ ...tour, trigger: { role: "nonsense", name: Z } }],
    [{ ...tour, trigger: { text: Z, name: "B" } }],
    [{ ...tour, trigger: { text: "   " } }],
    [{ ...tour, trigger: { role: "dialog", name: Z, index: 0 } }],
    [{ ...tour, dismiss: { selector: `#${Z}` } }],
    [{ ...tour, dismiss: {} }], [{ ...tour, dismiss: "Fechar" }],
    [{ ...tour, dismiss: { role: "button", name: Z, name_prefix: "F" } }],
    [{ ...tour, dismiss: { label_text: Z } }],
    [{ ...tour, effect: "validation" }], [{ ...tour, effect: true }], [{ ...tour, effect: `Write ${Z}` }],
  ];
  for (const decl of bad) {
    for (const dedicated of [false, true]) {
      const r = c(decl, dedicated);
      assert.equal(r.ok, false, JSON.stringify(decl));
      assert.equal(r.code, "OVERLAY_HANDLER_INVALID");
      assert.match(r.reason, /^overlay_handlers /, r.reason);
      assert.ok(!r.reason.includes(Z) && !r.reason.includes("Bem-vindo"), "a reason never echoes a declared word");
    }
  }
  assert.match(c([tour, { ...tour, id: "second", dismiss: {} }], false).reason, /^overlay_handlers entry 2: /);
  assert.match(c([tour, { ...tour }], false).reason, /entry 2: id repeats an earlier entry/);
  assert.match(c([{ ...save, trigger: { role: "dialog" } }], false).reason, /entry 1: /, "a skipped write handler is validated too");
  assert.equal(c(many, false).reason, "overlay_handlers allows at most 10 entries");
  '
  ```
  Exits non-zero on the current tree (`classifyOverlayHandlers` does not exist) and whenever a scoped or selector locator is accepted, a non-boolean `dedicated` registers a write handler, a write handler is dropped instead of reported as skipped, a skipped entry escapes validation, a reason echoes a declared word, or a duplicate id, an eleventh entry or an effect other than `write` is accepted.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — the runtime unit: `registerOverlayHandlers` and its helpers

- **ACTION**: Satisfies AC-A1 and AC-A5. Directly after `classifyOverlayHandlers` add: `export const OVERLAY_DISMISS_TIMEOUT_MS = 3000;` and `export const OVERLAY_HANDLER_TIMES = 25;` (chosen, not measured; the phase 8 dogfood recalibrates them: the dismissal runtime counts against the timeout of the action that triggered the handler, which is the 10-second page default, so the dismissal click is bounded well below it). Add `export function overlayUrlApproved(rawUrl, target)`: pure and total; `about:`, `data:` and `blob:` URLs are approved (the same exemption as the context route); otherwise `new URL(rawUrl)` inside a `try` (a parse failure is `false`) is approved only when `u.origin === target.origin` AND `target.guard.isAllowedHost(u.hostname, target.allowedHosts)` is true; a non-string input is `false`. Add `export function summarizeOverlayWatch(registeredIds, skipped, firings)`: pure and total, returns exactly `{ action: 'overlay_handlers', registered: [ids], skipped: [{ handler, reason }], firings: [{ handler, step, result }] }` built key by key (no other key of any input is ever copied; a non-array input behaves as empty). Add `export async function registerOverlayHandlers(page, handlers, target)`: returns `null` when `typeof page.addLocatorHandler !== 'function'`; otherwise, for each handler in order, builds the trigger and dismiss locators with the plain forms of the pattern (`page.getByRole(role, { name, exact: true })` or `page.getByText(text, { exact: true })`) and calls `await page.addLocatorHandler(triggerLocator, handlerFn, { times: OVERLAY_HANDLER_TIMES })` with NO other option (the default wait for the trigger to hide stays, so a dismissal that does not remove the overlay leaves the action to time out and phase 2 reads `covered`). `handlerFn` records the current step into a local, sets an `inHandler` flag, then `try { await dismissLocator.click({ timeout: OVERLAY_DISMISS_TIMEOUT_MS }); result = 'dismissed' } catch { result = 'dismiss_failed' }` (the thrown error is never read, stored or rethrown; no `force` option anywhere), pushes `{ handler: id, step, result }`, then checks `overlayUrlApproved(page.url(), target)` and, when false, records the step as the off-origin step if none is recorded yet, and clears `inHandler` in a `finally`. One `page.on('request', …)` listener is registered once (not per handler): while `inHandler` is set, a request for which `req.isNavigationRequest()` is true and `req.frame() === page.mainFrame()` and `overlayUrlApproved(req.url(), target)` is false records the current step as the off-origin step (this catches a navigation the context route aborted). The function returns a watch object with exactly: `setStep(n)` (the one-based step position, `0` before the first step), `firings()` (a fresh array of `{ handler, step, result }` copies), `offOriginAt()` (the recorded step number, or `null`) and `registered` (the ids, in order). The unit reads no page text, no locator word and no error text; it adds no launch, no route and no request. Interplay stated in a comment above the function, kept short: the handler only runs before an action that does an actionability check (a `click` or `fill`), never on `goto` or the runner's own waits; its runtime counts against that action's timeout.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:4033-4040` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:5867-5875`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.equal(m.OVERLAY_DISMISS_TIMEOUT_MS, 3000);
  assert.equal(m.OVERLAY_HANDLER_TIMES, 25);
  const target = { origin: "http://127.0.0.1:9", allowedHosts: new Set(["127.0.0.1"]), guard: { isAllowedHost: (h, s) => s.has(h) } };
  // overlayUrlApproved
  for (const ok of ["http://127.0.0.1:9/p?q=1", "about:blank", "data:text/html,x", "blob:http://127.0.0.1:9/abc"]) assert.equal(m.overlayUrlApproved(ok, target), true, ok);
  for (const no of ["http://localhost:9/away", "http://127.0.0.1:10/p", "https://127.0.0.1:9/p", "http://evil.test/", "not a url", "", null, undefined, 7]) assert.equal(m.overlayUrlApproved(no, target), false, String(no));
  // summarizeOverlayWatch copies key by key
  assert.deepEqual(
    m.summarizeOverlayWatch(["tour"], [{ id: "s", reason: "r", extra: 1 }], [{ handler: "tour", step: 2, result: "dismissed", text: "page text" }]),
    { action: "overlay_handlers", registered: ["tour"], skipped: [{ handler: "s", reason: "r" }], firings: [{ handler: "tour", step: 2, result: "dismissed" }] },
  );
  assert.deepEqual(m.summarizeOverlayWatch(null, undefined, "x"), { action: "overlay_handlers", registered: [], skipped: [], firings: [] });
  // a fake page that records what the unit registers and does
  const fresh = () => {
    const st = { reg: [], clicks: [], listeners: {}, url: "http://127.0.0.1:9/p", fail: false, onClick: null };
    const loc = (kind, a, b) => ({ kind, a, b, click: async (o) => { st.clicks.push({ kind, a, b, o }); if (st.fail) throw new Error("boom page text"); if (st.onClick) st.onClick(); } });
    st.page = {
      getByRole: (role, o) => loc("role", role, o), getByText: (t, o) => loc("text", t, o),
      addLocatorHandler: async (l, fn, opts) => { st.reg.push({ l, fn, opts }); },
      on: (ev, fn) => { st.listeners[ev] = fn; }, url: () => st.url, mainFrame: () => "MAIN",
    };
    return st;
  };
  const handlers = [
    { id: "tour", trigger: { role: "dialog", name: "Bem-vindo" }, dismiss: { text: "Fechar tour" }, effect: null },
    { id: "panel", trigger: { text: "Painel dev" }, dismiss: { role: "button", name: "Fechar painel" }, effect: null },
  ];
  assert.equal(await m.registerOverlayHandlers({ getByRole() {}, getByText() {} }, handlers, target), null, "no addLocatorHandler: null, never a silent no-op");
  const A = fresh();
  const w = await m.registerOverlayHandlers(A.page, handlers, target);
  assert.deepEqual(w.registered, ["tour", "panel"]);
  assert.equal(A.reg.length, 2, "one registration per handler");
  assert.deepEqual(A.reg[0].opts, { times: m.OVERLAY_HANDLER_TIMES }, "only times: no noWaitAfter, no other option");
  assert.deepEqual([A.reg[0].l.kind, A.reg[0].l.a, A.reg[0].l.b], ["role", "dialog", { name: "Bem-vindo", exact: true }]);
  assert.deepEqual([A.reg[1].l.kind, A.reg[1].l.a, A.reg[1].l.b], ["text", "Painel dev", { exact: true }]);
  assert.equal(Object.keys(A.listeners).join(), "request", "one request listener for the whole page");
  assert.equal(w.offOriginAt(), null);
  assert.deepEqual(w.firings(), []);
  w.setStep(3);
  await A.reg[0].fn();
  assert.deepEqual(w.firings(), [{ handler: "tour", step: 3, result: "dismissed" }]);
  assert.deepEqual(A.clicks.map((c) => [c.kind, c.a, c.o]), [["text", "Fechar tour", { timeout: m.OVERLAY_DISMISS_TIMEOUT_MS }]], "the dismiss locator is clicked once, not forced, with its own timeout");
  assert.ok(!("force" in A.clicks[0].o));
  const B = fresh();
  const wb = await m.registerOverlayHandlers(B.page, handlers, target);
  B.fail = true; wb.setStep(4);
  await B.reg[1].fn();
  assert.deepEqual(wb.firings(), [{ handler: "panel", step: 4, result: "dismiss_failed" }], "a failed dismissal is recorded and never thrown");
  assert.ok(!JSON.stringify(wb.firings()).includes("page text"), "the error text is never kept");
  // off-origin: by the url after the dismissal
  const C = fresh();
  const wc = await m.registerOverlayHandlers(C.page, handlers, target);
  C.onClick = () => { C.url = "http://localhost:9/away"; };
  wc.setStep(5);
  await C.reg[0].fn();
  assert.equal(wc.offOriginAt(), 5);
  // off-origin: by a navigation request issued during the dismissal (even when it is later aborted)
  const D = fresh();
  const wd = await m.registerOverlayHandlers(D.page, handlers, target);
  const nav = (url, isNav = true, frame = "MAIN") => ({ isNavigationRequest: () => isNav, frame: () => frame, url: () => url });
  D.listeners.request(nav("http://evil.test/"));
  assert.equal(wd.offOriginAt(), null, "a request outside a handler run is not a dismissal");
  D.onClick = () => { D.listeners.request(nav("http://127.0.0.1:9/ok")); D.listeners.request(nav("http://evil.test/x", false)); D.listeners.request(nav("http://evil.test/x", true, "SUB")); };
  wd.setStep(2);
  await D.reg[0].fn();
  assert.equal(wd.offOriginAt(), null, "same-origin, non-navigation and sub-frame requests are not off-origin");
  D.onClick = () => { D.listeners.request(nav("http://evil.test/x")); };
  wd.setStep(6);
  await D.reg[0].fn();
  assert.equal(wd.offOriginAt(), 6);
  wd.setStep(7);
  await D.reg[1].fn();
  assert.equal(wd.offOriginAt(), 6, "the first off-origin step is kept");
  // static: no forced click and no noWaitAfter in the new code
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const at = src.indexOf("export async function registerOverlayHandlers(");
  assert.ok(at > -1);
  const body = src.slice(at, src.indexOf("\n}\n", at));
  assert.ok(!/force\s*:/.test(body) && !body.includes("noWaitAfter"), "no forced click, no noWaitAfter");
  assert.equal(src.split("page.addLocatorHandler(").length - 1, 1, "one registration site");
  assert.ok(src.indexOf("export async function registerOverlayHandlers(") > src.indexOf("export function classifyOverlayHandlers("));
  '
  ```
  Exits non-zero on the current tree (none of the helpers exist) and whenever a handler is registered with an option beyond `times`, the dismissal is forced or unbounded, a failed dismissal throws or keeps the error text, a navigation outside a handler run or a same-origin, non-navigation or sub-frame request marks the case off-origin, the first off-origin step is overwritten, or a page without `addLocatorHandler` is silently accepted.
### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — the run: refuse a malformed declaration, register on the page, block off-origin, record the firings

- **ACTION**: Satisfies AC-A1, AC-A3, AC-A4, AC-A5 and AC-A6. (a) In the per-case function, directly after the `channel_sources` loop (`qa-run.mjs:5287-5296`) and before `const stateBlock = await prepareState(ctx, kase, p);`, add for `driver === 'browser'` only: read the kit config exactly as the effect gate does (`const kitForOverlay = ctxOrNull ? ctxOrNull.loginConfig : readJsonOrNull(join(root, 'PRPs', 'auth', 'login.config.json'));`), then `const overlay = classifyOverlayHandlers(seedConfig && isObj(seedConfig) ? seedConfig.overlay_handlers : undefined, isDedicatedRole(kitForOverlay, role));` and `if (!overlay.ok) return out(blocked(overlay.code, overlay.reason));`, so a malformed declaration ends the case `blocked` `OVERLAY_HANDLER_INVALID` before any seed, session or request (a case on the `http` driver never reads the key). Where the driver is not `browser`, use the empty split (`{ handlers: [], skipped: [] }`). (b) At the driver call (`qa-run.mjs:5342`) pass the split in the plan object after the existing runner-owned keys: `{ ...p, steps, runtime_steps: runtimeSteps, gap_steps: gapSteps, truncate_at: truncateAt, overlay_handlers: overlay.handlers, overlay_skipped: overlay.skipped }` (runner-owned keys come last, so a planner-written `overlay_handlers` key in a plan entry can never reach the driver). (c) In `DRIVERS.browser` (`qa-run.mjs:3996`), right after `page.setDefaultTimeout(10000);` and before `if (watchesRequests) requestLog = observeRequests(page, target);`, add `const overlayHandlers = Array.isArray(plan.overlay_handlers) ? plan.overlay_handlers : []; const overlaySkipped = Array.isArray(plan.overlay_skipped) ? plan.overlay_skipped : []; const overlayWatch = overlayHandlers.length > 0 ? await registerOverlayHandlers(page, overlayHandlers, target) : null; if (overlayHandlers.length > 0 && overlayWatch === null) return blocked('FAILED_PLAYWRIGHT_UNAVAILABLE', 'the installed Playwright cannot register overlay handlers (version 1.44 or newer is needed); nothing was executed');` (the `finally` closes the context and the browser). A case with no handler declared registers nothing and behaves byte-for-byte as before. (d) In the step loop: directly after `ranTo = i;` add `if (overlayWatch !== null && overlayWatch.offOriginAt() !== null) { stoppedAt = i; ranTo = i - 1; break; }` (no step acts after a dismissal left the origin); and directly before `executedTo = i;` (after the failed-assertion stop line) add `if (overlayWatch !== null) overlayWatch.setStep(n);` so a firing carries the one-based position of the action it preceded. (e) After the loop and before the final-capture `try` (`qa-run.mjs:4266`), add: when `overlayWatch !== null && overlayWatch.offOriginAt() !== null`, `const at = overlayWatch.offOriginAt(); failedIdx.push(at - 1); verdict = blocked('FAILED_NON_LOCAL_TARGET', `step ${at}: an overlay dismissal left the guard-approved origin; nothing further was acted on`);` — an assignment, not `settle`, so the hard guard failure replaces an earlier `fail` or `blocked` result of the same case (the guard is a hard failure at every site). (f) Before `const allEvidence` (`qa-run.mjs:4291`): `const overlayEvidence = [];` and, when `overlayWatch !== null && (overlayWatch.firings().length > 0 || overlaySkipped.length > 0)` or `overlayWatch === null && overlaySkipped.length > 0`, write `writeEvidence(ctx, `case-${kase.index}.overlay.json`, { kind: 'json', value: summarizeOverlayWatch(overlayWatch === null ? [] : overlayWatch.registered, overlaySkipped.map((s) => ({ id: s.id, reason: s.reason })), overlayWatch === null ? [] : overlayWatch.firings()) })` inside a `try` and push the returned path; a write failure returns `blocked('EVIDENCE_WRITE_FAILED', 'the overlay evidence could not be written')` unless the case already has a blocked verdict. Then `allEvidence = [...queryEvidence.values(), ...judgeScope.values(), ...overlayEvidence, ...evidence]`. The file holds handler ids, step positions, the closed result words and the fixed skip sentence: never a locator word, page text or an error. Interplay stated, not coded: the handler runs only before a `click` or `fill` actionability check, so an overlay that appears after a `goto` is dismissed before the next interaction (an `expect_*` step uses the runner's own waits and triggers none, and a dismissed overlay never needs one); a dismissal whose trigger stays visible leaves the action to time out and phase 2's `probeActionFailure` reads the hit target, so the case ends `covered` exactly as with no handler; an overlay with no declared handler is never touched and ends `covered`; phase 3's continuation is unchanged (interactions stop after a failed assertion, so no handler fires after one).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:5287-5291` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:4033-4040`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const once = (frag, from = 0) => { const parts = src.slice(from).split(frag); assert.equal(parts.length - 1, 1, `${frag} must appear exactly once, found ${parts.length - 1}`); return from + src.slice(from).indexOf(frag); };
  // per-case precheck: after the channel_sources read, before any state, session or request
  const chan = once("classifyChannelSource(channelSources, s.channel, root)");
  const decl = once("classifyOverlayHandlers(seedConfig && isObj(seedConfig) ? seedConfig.overlay_handlers : undefined");
  const state = once("const stateBlock = await prepareState(");
  assert.ok(chan < decl && decl < state, "order: channel_sources precheck, overlay declaration, state");
  const pass = once("overlay_handlers: overlay.handlers");
  assert.ok(pass > state, "the split reaches the driver call");
  assert.ok(src.slice(decl, decl + 400).includes("blocked(overlay.code, overlay.reason)"), "a malformed declaration is blocked with the classifier code and reason");
  // driver: registration right after the page exists, before the request log and the loop
  const drv = once("DRIVERS.browser = async (ctx, kase, plan, session) => {");
  const page = src.indexOf("const page = await context.newPage();", drv);
  const reg = once("await registerOverlayHandlers(page, overlayHandlers, target)");
  const obs = src.indexOf("if (watchesRequests) requestLog = observeRequests(page, target);", drv);
  const loop = src.indexOf("for (const [i, step] of plan.steps.entries()) {", drv);
  assert.ok(drv < page && page < reg && reg < obs && obs < loop, "order: newPage, registration, request log, loop");
  assert.ok(src.slice(reg, reg + 400).includes("FAILED_PLAYWRIGHT_UNAVAILABLE"), "declared handlers are never silently dropped");
  const stop = src.indexOf("overlayWatch.offOriginAt() !== null) { stoppedAt = i; ranTo = i - 1; break; }", loop);
  const step = once("overlayWatch.setStep(n)");
  const exec = src.indexOf("executedTo = i;", loop);
  assert.ok(loop < stop && stop < step && step < exec, "order in the loop: off-origin stop, setStep, executedTo");
  const post = once("an overlay dismissal left the guard-approved origin; nothing further was acted on");
  const cap = src.indexOf("// Evidence after the last step", loop);
  assert.ok(post > loop && post < cap, "the off-origin block is applied after the loop and before the final capture");
  const evid = once("`case-${kase.index}.overlay.json`");
  const all = src.indexOf("const allEvidence = [", drv);
  assert.ok(cap < evid && evid < all, "the overlay evidence is written before the evidence list is assembled");
  assert.ok(src.slice(all, all + 200).includes("...overlayEvidence"), "the overlay file joins the case evidence");
  // no new launch site and no forced click anywhere in the new wiring
  assert.equal(src.split("chromium.launch(").length - 1, 3, "no new browser launch");
  const wiring = src.slice(drv, all);
  assert.ok(!/force\s*:/.test(wiring), "no forced click");
  '
  ```
  Exits non-zero on the current tree (none of the fragments exist) and whenever the declaration check runs after state, session or request work, a planner key can reach the driver, registration happens before the page exists or after the request log or loop, a declared handler is silently dropped on an old Playwright, the off-origin check is missing from the loop or the post-loop block, the overlay file is not part of the case evidence, a browser launch is added, or a forced click appears. Browser behaviour is checked end to end by Level 3.

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — `ground`: register, replay with step positions, probe once, print fixed lines

- **ACTION**: Satisfies AC-A2 and AC-A4. (a) Change the signature to `export async function replayGroundingPrefix(page, steps, target, watch = null)` and, at the top of each loop iteration (right after `const n = i + 1;`), add `if (watch !== null && typeof watch.setStep === 'function') watch.setStep(n);`. Nothing else in the function changes; callers with three arguments behave exactly as before. (b) In `runGround`, after `ctx` is built (`qa-run.mjs:5951-5963`; leave `seedConfig: null` as it is) and before the `if (role !== null) {` session block, read the declaration: `const groundSeed = readJsonOrNull(join(root, 'PRPs', 'auth', 'qa-seed.json')); const groundOverlay = classifyOverlayHandlers(groundSeed && isObj(groundSeed) ? groundSeed.overlay_handlers : undefined, isDedicatedRole(ctx.loginConfig, role)); if (!groundOverlay.ok) throw new Halt(groundOverlay.code, groundOverlay.reason);`, so a malformed declaration halts `ground` with the same code and sentence before any session or browser (a `Halt` message is printed as is, exit 1, like every other ground refusal). (c) Right after `page.setDefaultTimeout(10000);` (`qa-run.mjs:5996`) and before the `goto`, add `const groundWatch = groundOverlay.handlers.length > 0 ? await registerOverlayHandlers(page, groundOverlay.handlers, target) : null; if (groundOverlay.handlers.length > 0 && groundWatch === null) throw new Halt('FAILED_PLAYWRIGHT_UNAVAILABLE', 'the installed Playwright cannot register overlay handlers (version 1.44 or newer is needed); nothing was written');`. (d) Pass the watch to the replay: `replayGroundingPrefix(page, prefix, target, groundWatch)` (keep the `requireRunIgnore(runDirAbs)` call before it and the `waitForStableSnapshot(` call after it, as `qa-run-contract.mjs:457-467` pins). (e) After the replay block and before `waitForStableSnapshot(`: when `groundWatch !== null`, first `if (groundWatch.offOriginAt() !== null) throw new Halt('FAILED_NON_LOCAL_TARGET', 'an overlay dismissal left the guard-approved origin; nothing was written');`, then `groundWatch.setStep(prefix === null ? 0 : prefix.length);` and one probe `await page.locator('body').hover({ trial: true, timeout: 3000 }).catch(() => {});` (a trial hover performs Playwright's actionability checks without acting, which is what runs the handlers, so a load-time overlay is dismissed before the snapshot even on a plain route that has no action; a failed probe is ignored: the snapshot decides), then the same off-origin check again. (f) Before the `GROUNDED:` line (`qa-run.mjs:6049`), when a watch exists or any handler was skipped, print one line per record to stdout, in this order and only these shapes: `OVERLAY_DISMISSED: <id> step <n> <result>` for each firing (`<n>` is `0` for the plain route before any step; `<result>` is `dismissed` or `dismiss_failed`) and `OVERLAY_HANDLER_SKIPPED: <id>` for each skipped handler. With no handler declared nothing new is printed, so existing output is byte-identical. The snapshot file schema is unchanged and carries no overlay record. Do not edit `parseGroundPrefix`, `groundingPrefixKey` or the snapshot loaders.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:5995-6006` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:5867-5875`
- **VALIDATE**:
  ```
  set -euo pipefail
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
  node --check plugins/relay/scripts/qa-run.mjs
  node --input-type=module -e '
  import fs from "node:fs";
  import assert from "node:assert/strict";
  const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
  const g0 = src.indexOf("async function runGround(argv) {");
  const g1 = src.indexOf("async function runGroundGuarded(");
  assert.ok(g0 > -1 && g1 > g0);
  const body = src.slice(g0, g1);
  const at = (frag) => { const parts = body.split(frag); assert.equal(parts.length - 1, 1, `${frag} must appear exactly once in the ground mode, found ${parts.length - 1}`); return body.indexOf(frag); };
  const decl = at("classifyOverlayHandlers(groundSeed && isObj(groundSeed) ? groundSeed.overlay_handlers : undefined");
  const halt = at("throw new Halt(groundOverlay.code, groundOverlay.reason)");
  const session = at("if (role !== null) {");
  const launch = at("playwright.chromium.launch(");
  const page = at("const page = await context.newPage();");
  const reg = at("await registerOverlayHandlers(page, groundOverlay.handlers, target)");
  const goto = at("const resp = await page.goto(url,");
  const ignore = at("requireRunIgnore(runDirAbs);");
  const replay = at("await replayGroundingPrefix(page, prefix, target, groundWatch)");
  const probe = at("hover({ trial: true, timeout: 3000 })");
  const snap = at("await waitForStableSnapshot(");
  const out = at("OVERLAY_DISMISSED: ");
  const skip = at("OVERLAY_HANDLER_SKIPPED: ");
  const grounded = at("GROUNDED: ");
  assert.ok(decl < halt && halt < session && session < launch, "the declaration is read and refused before any session or browser");
  assert.ok(page < reg && reg < goto && goto < replay && replay < probe && probe < snap, "order: newPage, registration, goto, replay, probe, snapshot");
  assert.ok(ignore < replay, "the run-ignore proof still precedes every interaction");
  assert.ok(snap < out && out < skip && skip < grounded || snap < skip && skip < out && out < grounded, "the fixed lines precede GROUNDED");
  assert.ok(body.includes("an overlay dismissal left the guard-approved origin; nothing was written"), "a dismissal off the origin halts the ground mode");
  assert.ok(!/force\s*:/.test(body), "no forced click");
  const m = await import("./plugins/relay/scripts/qa-run.mjs");
  assert.equal(typeof m.replayGroundingPrefix, "function");
  assert.ok(src.includes("export async function replayGroundingPrefix(page, steps, target, watch = null) {"));
  // the watch is only told the step position, once per step, before the step acts
  const rp = src.indexOf("export async function replayGroundingPrefix(");
  const rb = src.slice(rp, src.indexOf("\n}\n", rp));
  assert.ok(rb.indexOf("watch.setStep(n)") > rb.indexOf("const n = i + 1;") && rb.indexOf("watch.setStep(n)") < rb.indexOf("if (step.action === " + String.fromCharCode(39) + "goto" + String.fromCharCode(39) + ")"), "setStep runs first in each iteration");
  '
  ```
  Exits non-zero on the current tree (no overlay wiring in the ground mode, `replayGroundingPrefix` has three parameters) and whenever the declaration is read after a session or a launch, the registration is not between `newPage()` and the `goto`, the probe is missing or runs after the snapshot, the new lines are printed after `GROUNDED:`, the order pins of the prefix contract are broken, or a forced click appears. Behaviour is checked by Level 3.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --check plugins/relay/scripts/qa-run.mjs
git diff --check
npm run validate
```
`npm run validate` runs the repo's 28 static consistency checks and must keep passing with the count unchanged. The `qa-run-contract` check pins the ground-section call order (`requireRunIgnore(` before `replayGroundingPrefix(` before `waitForStableSnapshot(`), which Task 4 keeps, and `auth-local-guard-sites` pins `// GUARD-SITE`, `checkTarget` and `FAILED_NON_LOCAL_TARGET` in `qa-run.mjs` and forbids `--local-host`; none of them lists `qa-seed.json` keys, the set of blocked codes or the number of launch sites, and this phase edits neither the catalogue nor the command doc, so no doc edit is needed to stay 28/28. If a check does go red, fix the named invariant in the smallest way and record it in the implementation report; do not defer a red validate.

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import assert from "node:assert/strict";
const m = await import("./plugins/relay/scripts/qa-run.mjs");
const src = fs.readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8");
for (const name of ["classifyOverlayHandlers", "overlayUrlApproved", "summarizeOverlayWatch", "registerOverlayHandlers"]) assert.equal(typeof m[name], "function", name);
// the catalogue is untouched: the new code is a runner-written blocked code outside it
assert.equal(m.reasonClassOf("OVERLAY_HANDLER_INVALID"), null);
assert.equal(Object.hasOwn(m.RUNTIME_REASON_CATALOGUE, "OVERLAY_HANDLER_INVALID"), false);
assert.deepEqual(Object.keys(m.RUNTIME_REASON_CATALOGUE).sort(), ["PLAN_ENTRY_INVALID", "STEP_NOT_PERFORMABLE"]);
// the channel_sources reader and the dedicated-role gate are untouched
assert.equal(m.classifyChannelSource({ sms: { kind: "file", path: "x.log" } }, "sms", "/r").ok, true);
assert.equal(m.isDedicatedRole({ roles: { a: { dedicated: true } } }, "a"), true);
assert.equal(m.isDedicatedRole({ roles: { a: { dedicated: 1 } } }, "a"), false);
// phase 2 and phase 3 behaviour is unchanged
assert.equal(m.causeOf({ action: "click", count: 1, attached: true, enabled: true, covered: true }), "covered");
assert.equal(m.continuesAfterFailure({ action: "click", selector: "#s" }), false);
assert.equal(m.continuesAfterFailure({ action: "expect_visible", selector: "#s" }), true);
// a declared overlay that is not dismissed stays covered: no handler, no registration
const none = m.classifyOverlayHandlers(undefined, true);
assert.deepEqual(none.handlers, []);
// one registration site, three launch sites, the guard pins of qa-run.mjs intact
assert.equal(src.split("page.addLocatorHandler(").length - 1, 1);
assert.equal(src.split("chromium.launch(").length - 1, 3);
for (const token of ["auth-local-guard.mjs", "checkTarget", "FAILED_NON_LOCAL_TARGET", "// GUARD-SITE"]) assert.ok(src.includes(token), token);
assert.ok(!src.includes("--local-host"));
// the new evidence names no locator word or page text: the sentence is fixed
assert.equal(m.OVERLAY_WRITE_SKIP_REASON, "a write-effect handler is not registered: the role is not declared dedicated");
// the ground prefix still refuses an effect and still accepts the plain forms
assert.equal(m.parseGroundPrefix(JSON.stringify([{ action: "goto", path: "/" }, { action: "click", role: "button", name: "Ok", effect: "write" }])).ok, false);
assert.equal(m.parseGroundPrefix(JSON.stringify([{ action: "goto", path: "/" }, { action: "click", role: "button", name: "Ok" }])).ok, true);
'
git diff --name-only -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs plugins/relay/commands/relay-qa-run.md plugins/relay/commands/relay-qa-seed.md > "${TMPDIR:-/tmp}/relay-frozen-diff-p6.txt"
if test -s "${TMPDIR:-/tmp}/relay-frozen-diff-p6.txt"; then echo "FAIL: a frozen or Phase 7 file changed"; exit 1; else echo "PASS: frozen files and Phase 7 docs untouched"; fi
```
Note: `relay-qa-run.md` and `relay-qa-seed.md` are checked here because they are Phase 7's; if an earlier phase of this working tree already modified them, compare against the working-tree state captured before this phase started and say so in the implementation report rather than loosening the check.

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
const m = await import("./plugins/relay/scripts/qa-run.mjs");
const { validateResults } = await import("./scripts/validate/checks/qa-run-contract.mjs");
const RUN = "PRPs/reports/f/qa-run/r1";
const RUN2 = "PRPs/reports/f/qa-run/r2";
const RUNG = "PRPs/reports/f/qa-run/g1";
const hits = {};
const total = () => Object.values(hits).reduce((a, b) => a + b, 0);
let port = 0;
const dialog = (label, button, js) => `<div role="dialog" aria-label="${label}" style="position:fixed;inset:0;background:#fffe;z-index:10"><button onclick="${js}this.parentNode.remove()">${button}</button></div>`;
const page = (overlay) => `<!doctype html><html><body><h1>Panel</h1><button onclick="document.body.insertAdjacentHTML(&quot;beforeend&quot;,&quot;<p role=status>Continuado</p>&quot;)">Continuar</button>${overlay}</body></html>`;
const pageFor = (p) => ({
  "/tour": page(dialog("Bem-vindo", "Fechar tour", "")),
  "/undeclared": page(dialog("Painel dev", "Fechar painel", "")),
  "/prefs": page(dialog("Salvar preferências?", "Salvar e fechar", "fetch(&quot;/api/prefs&quot;,{method:&quot;POST&quot;});")),
  "/leave": page(dialog("Saída", "Sair agora", `location.href=&quot;http://localhost:${port}/away&quot;;`)),
  "/away": "<!doctype html><html><body><h1>Away</h1></body></html>",
})[p];
const server = createServer((req, res) => {
  const p = new URL(String(req.url), "http://x").pathname;
  const key = `${req.method} ${p}`;
  hits[key] = (hits[key] ?? 0) + 1;
  if (p === "/api/prefs") { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(pageFor(p) ?? "<!doctype html><html><body><h1>x</h1></body></html>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", () => r(null)));
port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const root = mkdtempSync(join(tmpdir(), "relay-p6-"));
const nm = join(root, "node_modules");
symlinkSync(resolve("node_modules"), nm, "junction");
const go = (args) => new Promise((res, rej) => {
  const c = spawn(process.execPath, [resolve("plugins/relay/scripts/qa-run.mjs"), ...args], { cwd: root, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let out = "";
  c.stdout.on("data", (d) => { out += d; });
  c.stderr.on("data", (d) => { out += d; });
  const t = setTimeout(() => c.kill(), 270000);
  c.on("error", rej);
  c.on("close", (x) => { clearTimeout(t); res({ code: x, out }); });
});
const evidence = (run, re) => {
  const dir = join(root, ...run.split("/"));
  const f = readdirSync(dir, { recursive: true }).map(String).find((x) => re.test(x.split("\\").join("/")));
  if (!f) return null;
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  return j.value ?? j;
};
let skip = false;
try {
  mkdirSync(join(root, ...RUN.split("/")), { recursive: true });
  mkdirSync(join(root, ...RUN2.split("/")), { recursive: true });
  mkdirSync(join(root, ...RUNG.split("/")), { recursive: true });
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  const manual = "1. Open the page, click Continuar and see Continuado";
  const block = (i) => [`### Case ${i}`, `**Title:** Case ${i} title`, "**Risk level:** low", "**Required state:** None", "**Coverage:** none", "**Automated test path:** n/a", "**Manual status:** pending", "**Manual step-by-step:**", manual, ""].join("\n");
  const flow = (path) => [{ action: "goto", path }, { action: "click", role: "button", name: "Continuar" }, { action: "expect_visible", text: "Continuado" }];
  const cases = [
    { role: "admin", steps: flow("/tour") },
    { role: "admin", steps: flow("/undeclared") },
    { role: "admin", steps: flow("/prefs") },
    { role: "viewer", steps: flow("/prefs") },
    { role: "admin", steps: flow("/leave") },
  ];
  writeFileSync(join(root, "PRPs", "reports", "f", "qa-report.md"), `# QA Report\n\n## Test Cases\n\n${cases.map((_, i) => block(i + 1)).join("\n")}\n## Notes\n\nnone\n`);
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { admin: { dedicated: true }, viewer: {} } }));
  for (const role of ["admin", "viewer"]) {
    writeFileSync(join(root, "PRPs", "auth", `login-${role}.mjs`), [
      `import { writeFileSync, mkdirSync } from "node:fs";`,
      `import { join } from "node:path";`,
      `const root = process.argv[process.argv.indexOf("--root") + 1];`,
      `mkdirSync(join(root, "PRPs", "auth", ".sessions"), { recursive: true });`,
      `writeFileSync(join(root, "PRPs", "auth", ".sessions", "${role}.json"), JSON.stringify({ cookies: [{ name: "access-token", value: "tok-p6-fixture", domain: "127.0.0.1", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] }));`,
    ].join("\n"));
  }
  const seedFile = join(root, "PRPs", "auth", "qa-seed.json");
  const handlers = [
    { id: "tour", trigger: { role: "dialog", name: "Bem-vindo" }, dismiss: { role: "button", name: "Fechar tour" } },
    { id: "save-banner", trigger: { role: "dialog", name: "Salvar preferências?" }, dismiss: { role: "button", name: "Salvar e fechar" }, effect: "write" },
    { id: "leave", trigger: { role: "dialog", name: "Saída" }, dismiss: { role: "button", name: "Sair agora" } },
  ];
  writeFileSync(seedFile, JSON.stringify({ overlay_handlers: handlers }));
  const planOf = (cs) => JSON.stringify({ schema_version: 1, cases: cs.map((c, i) => ({ index: i + 1, title: `Case ${i + 1} title`, driver: "browser", role: c.role, state: "none", steps: c.steps })) });
  writeFileSync(join(root, ...RUN.split("/"), "plan.json"), planOf(cases));
  const ran = await go(["run", "--root", root, "--feature", "f", "--run-dir", RUN]);
  await new Promise((r) => setTimeout(r, 700));
  const file = join(root, ...RUN.split("/"), "results.json");
  assert.ok(existsSync(file), `no results.json, runner exit ${ran.code}`);
  const results = JSON.parse(readFileSync(file, "utf8"));
  const c = results.cases;
  const tag = (k) => JSON.stringify([k.outcome, k.reason_code, k.reason]);
  if (c[0].reason_code === "FAILED_BROWSER_UNAVAILABLE") {
    skip = true;
  } else {
    // AC-A1: a declared tour is dismissed before the click, and the firing is recorded by id and step
    assert.equal(c[0].outcome, "pass", tag(c[0]));
    const e1 = evidence(RUN, /case-1\.overlay\.json$/);
    assert.ok(e1, "case 1 wrote its overlay evidence");
    assert.deepEqual(e1.firings, [{ handler: "tour", step: 2, result: "dismissed" }]);
    assert.deepEqual(e1.registered, ["tour", "save-banner", "leave"]);
    assert.deepEqual(e1.skipped, []);
    assert.deepEqual(Object.keys(e1).sort(), ["action", "firings", "registered", "skipped"]);
    assert.ok(!JSON.stringify(e1).includes("Bem-vindo") && !JSON.stringify(e1).includes("Fechar tour"), "no locator word in the evidence");
    // AC-A3: an overlay with no declared handler is never dismissed; the click it blocks reads covered
    assert.equal(c[1].outcome, "blocked", tag(c[1])); assert.equal(c[1].reason_code, "STEP_NOT_PERFORMABLE");
    assert.match(c[1].reason, /another element covered it at the action point/);
    assert.equal(evidence(RUN, /case-2\.overlay\.json$/), null, "nothing fired and nothing was skipped: no overlay file");
    // AC-A4: a write-effect handler on a dedicated role is registered and fires; on a plain role it is not, and the run says why
    assert.equal(c[2].outcome, "pass", tag(c[2]));
    assert.deepEqual(evidence(RUN, /case-3\.overlay\.json$/).firings, [{ handler: "save-banner", step: 2, result: "dismissed" }]);
    assert.equal(hits["POST /api/prefs"], 1, "only the dedicated role persisted the preference");
    assert.equal(c[3].outcome, "blocked", tag(c[3])); assert.equal(c[3].reason_code, "STEP_NOT_PERFORMABLE");
    assert.match(c[3].reason, /another element covered it at the action point/);
    const e4 = evidence(RUN, /case-4\.overlay\.json$/);
    assert.deepEqual(e4.registered, ["tour", "leave"]);
    assert.deepEqual(e4.skipped, [{ handler: "save-banner", reason: m.OVERLAY_WRITE_SKIP_REASON }]);
    assert.deepEqual(e4.firings, []);
    // AC-A5: a dismissal that navigates off the approved origin blocks the case
    assert.equal(c[4].outcome, "blocked", tag(c[4])); assert.equal(c[4].reason_code, "FAILED_NON_LOCAL_TARGET");
    assert.match(c[4].reason, /^step 2: an overlay dismissal left the guard-approved origin/);
    assert.deepEqual(evidence(RUN, /case-5\.overlay\.json$/).firings.map((f) => [f.handler, f.step]), [["leave", 2]]);
    assert.deepEqual(validateResults(results), []);
    // AC-A2: ground, plain route: a load-time overlay is dismissed before the snapshot; an undeclared one is not
    const entriesOf = (re) => { const d = join(root, ...RUNG.split("/"), "grounding"); const f = readdirSync(d).find((x) => re.test(x)); assert.ok(f, `no snapshot ${re}`); return JSON.parse(readFileSync(join(d, f), "utf8")).entries; };
    const g1 = await go(["ground", "--root", root, "--feature", "f", "--run-dir", RUNG, "--route", "/tour"]);
    assert.equal(g1.code, 0, g1.out);
    assert.match(g1.out, /OVERLAY_DISMISSED: tour step 0 dismissed\n/);
    assert.match(g1.out, /OVERLAY_HANDLER_SKIPPED: save-banner\n/);
    assert.ok(g1.out.indexOf("OVERLAY_DISMISSED") < g1.out.indexOf("GROUNDED:"));
    const tourEntries = entriesOf(/tour/);
    assert.ok(tourEntries.some((e) => e.name === "Continuar"), "the page content is grounded");
    assert.ok(!tourEntries.some((e) => e.name === "Fechar tour"), "the declared tour was dismissed before the snapshot");
    const g2 = await go(["ground", "--root", root, "--feature", "f", "--run-dir", RUNG, "--route", "/undeclared"]);
    assert.equal(g2.code, 0, g2.out);
    assert.ok(!g2.out.includes("OVERLAY_DISMISSED"));
    assert.ok(entriesOf(/undeclared/).some((e) => e.name === "Fechar painel"), "an undeclared overlay is left alone");
    // AC-A2: ground --prefix: the click of the replay triggers the handler, recorded at the replay step
    const g3 = await go(["ground", "--root", root, "--feature", "f", "--run-dir", RUNG, "--route", "/tour", "--prefix", JSON.stringify([{ action: "click", role: "button", name: "Continuar" }])]);
    assert.equal(g3.code, 0, g3.out);
    assert.match(g3.out, /OVERLAY_DISMISSED: tour step 1 dismissed\n/);
    // AC-A6: a malformed declaration refuses the case before any page load, and halts ground with the same code
    writeFileSync(seedFile, JSON.stringify({ overlay_handlers: [{ id: "x", trigger: { role: "dialog" }, dismiss: { role: "button", name: "Zxq-secret" } }] }));
    writeFileSync(join(root, ...RUN2.split("/"), "plan.json"), planOf([cases[0]]));
    const before = total();
    const bad = await go(["run", "--root", root, "--feature", "f", "--run-dir", RUN2]);
    await new Promise((r) => setTimeout(r, 700));
    const r2 = JSON.parse(readFileSync(join(root, ...RUN2.split("/"), "results.json"), "utf8")).cases[0];
    assert.equal(r2.outcome, "blocked", tag(r2)); assert.equal(r2.reason_code, "OVERLAY_HANDLER_INVALID");
    assert.match(r2.reason, /^overlay_handlers entry 1: /); assert.ok(!r2.reason.includes("Zxq-secret"));
    assert.equal(total(), before, `the page was never requested, runner exit ${bad.code}`);
    const g4 = await go(["ground", "--root", root, "--feature", "f", "--run-dir", RUNG, "--route", "/tour"]);
    assert.notEqual(g4.code, 0); assert.match(g4.out, /overlay_handlers entry 1: /); assert.ok(!g4.out.includes("Zxq-secret"));
  }
} finally {
  try { unlinkSync(nm); } catch { try { rmdirSync(nm); } catch { } }
  if (!existsSync(nm)) rmSync(root, { recursive: true, force: true });
  server.closeAllConnections?.();
  await new Promise((r) => server.close(() => r(null)));
}
if (skip) console.log("SKIP-BROWSER-UNAVAILABLE: the runner could not launch Chromium here; the real-page overlay fixture is left to the test pair (the pure and source assertions of the tasks did run)");
'
```
Case 1 proves the dismissal and its record; case 2 an undeclared overlay (`covered`, no file); cases 3 and 4 the write rule (the dedicated role persists once, the plain role is skipped and the file says why); case 5 the off-origin block; the three ground runs prove the plain-route probe, the undeclared overlay and the prefix replay step position; the last run proves the named refusal before any request and the matching ground halt. A run that prints `SKIP-BROWSER-UNAVAILABLE` did not exercise the real page; a run that ends silently exercised everything. Four clicks that stay covered cost about 10 seconds each, so the run takes a minute or two. The fixture lives in the OS temp directory, the `node_modules` junction is unlinked before the directory is removed so the repository `node_modules` is never reached, and nothing is written in the repository. The corpus `node --test "scripts/validate/**/*.test.mjs"` is NOT a gate for this phase (see Notes).

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** Given `overlay_handlers` in `PRPs/auth/qa-seed.json` declaring a `trigger` and a `dismiss` locator, when a browser case meets the trigger before a `click` or `fill`, then the runner clicks `dismiss` through `page.addLocatorHandler` (not forced, bounded), the action proceeds, and the case evidence (`case-<n>.overlay.json`) lists each dismissal by handler id, step position and a closed result word, with no locator word, page text or error text.
- **AC-A2 (PRD AC-12):** Given the same declaration, when `ground` runs on a plain route or with `--prefix`, then the handlers are registered on its page, a load-time overlay is dismissed before the snapshot, a replay click triggers its handler at the replay step, and each firing and each skipped handler is printed as one fixed line; with no declaration the output is unchanged.
- **AC-A3 (PRD AC-12):** An overlay with no declared handler is never dismissed, and a click it blocks reports phase 2's cause `covered`.
- **AC-A4 (PRD AC-13):** Given a handler declared `"effect": "write"`, when the case's (or the `ground` run's) role is not declared `dedicated`, then the handler is not registered and the run records why (the case evidence's `skipped` list with the fixed sentence; the `OVERLAY_HANDLER_SKIPPED` line).
- **AC-A5 (PRD AC-13):** A dismissal that navigates off the guard-approved origin ends the case `blocked` `FAILED_NON_LOCAL_TARGET` (and halts `ground` with the same code), and no handler ever uses a forced click.
- **AC-A6 (PRD AC-12):** A malformed `overlay_handlers` declaration (not an array, an unknown key, a bad or repeated id, a locator outside the plain role+name or text forms, an effect other than `write`, more than 10 entries) ends a browser case `blocked` `OVERLAY_HANDLER_INVALID` before any seed, session or request and halts `ground` with the same code, with a fixed sentence that never echoes a declared word.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An overlay handler hides a real defect (a modal that should not appear is silently closed) | M | A product defect read as a pass | Only project-declared triggers; every dismissal recorded by id and step in the case evidence; an undeclared overlay is not dismissed and ends `covered` (Level 3 case 2); the worksheet listing is Phase 8 |
| A write-effect dismissal persists state on a non-dedicated role | L | An unwanted write in a shared account | The handler is not registered for a role not declared `dedicated`, and the run records why (Level 3 cases 3 and 4) |
| A dismissal navigates somewhere the guard does not approve | L | A request to a non-local host | The context route still aborts non-approved hosts; the runtime unit also watches main-frame navigation requests and the URL after the click; the case ends `blocked` `FAILED_NON_LOCAL_TARGET` and the step loop stops acting |
| The handler runtime eats the action's timeout | M | A click times out because the dismissal was slow | The dismissal click has its own 3-second bound (`OVERLAY_DISMISS_TIMEOUT_MS`) inside the 10-second page default; a timeout reads `covered` and the dismissal is recorded `dismiss_failed`; recalibrated at the Phase 8 dogfood |
| An overlay that appears after `goto` and is only read by an `expect_*` step is never dismissed | M | A visible overlay in the judge capture | By design (Playwright runs handlers only before actionability-checked actions); the next `click` or `fill` dismisses it; an assertion-only case is unaffected, and `ground` probes once before the snapshot |
| The trial-hover probe in `ground` does not trigger a handler on some page | L | A load-time overlay stays in the snapshot | The probe is best-effort and errors are ignored; the snapshot is unchanged in that case; Level 3 proves it on a tour-like overlay and Phase 8 reads real pages |
| A trigger that stays visible after the dismissal loops | L | A hung action | `times: 25` bounds the registrations per page and the default wait for the trigger to hide makes the action time out into `covered` instead of looping |
| An existing test pins the `ground` stdout, the `replayGroundingPrefix` arity or the exact precheck order | M | Red corpus until the test pair runs | Expected and named in Notes; the corpus is not this phase's gate; a test contradicting AC-12/13 is a dispute for arbitration, not an Implementer edit |
| Browser behaviour cannot be fully run by the Implementer's validation | M | A driver regression unseen until tests | Per-task pure and source checks gate the structure; Level 3 runs a real page and prints a distinct SKIP line when Chromium cannot launch |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Existing tests that may go stale (for the test pair, `EXISTING_TEST_UPDATED`; the Implementer must not edit any of them):** `scripts/validate/checks/qa-run-grounding-prefix-replay.test.mjs` and the other `qa-run-grounding-prefix-*.test.mjs` files (any assertion that `replayGroundingPrefix` takes exactly three parameters or that `ground` prints only the `GROUNDED:` line when a kit declares handlers: expected to keep passing, because the fourth parameter is optional and nothing new is printed without a declaration); `qa-run-grounding-prefix-contract.test.mjs` (mutates the ground section and expects the order messages: the tokens and order are kept); `qa-run-vocabulary-pins.test.mjs` and `qa-run-local-channel-sources.test.mjs` (source-text or seed-key pins: the `channel_sources` reader is unchanged); any test that spies on the driver's plan object keys (two new runner-owned keys, `overlay_handlers` and `overlay_skipped`). New coverage for AC-12 and AC-13 (the classifier, the runtime unit with a fake page, a real-page fixture with a tour-like and a panel-like overlay, the `ground` lines) belongs to the test pair. The corpus is not a gate for this phase; it is the gate of Phase 7 (AC-17).
- **`npm run validate` stays 28/28 without a doc edit.** `qa-run-contract.mjs` pins the marked doc examples, a fixed token list and the reason-code table, plus the ground-section call order; `auth-local-guard-sites` pins substrings of `qa-run.mjs`. Neither lists `qa-seed.json` keys or requires documentation of every declared key, and this phase adds no launch site, no catalogue entry and no doc text. The `overlay_handlers` example with its `<!-- qa-step-example driver=… -->` marker, the declaration rules, the new `OVERLAY_HANDLER_INVALID` row of the code table and the `relay-qa-seed.md` wording are Phase 7 (AC-15).
- **Decisions stated here.** (1) Malformed `overlay_handlers`: refuse with a named code, not ignore with a warning, the treatment `channel_sources` gets (`CHANNEL_SOURCE_INVALID` is a blocked case; ground uses a `Halt`). The seed has no warning channel, and silently ignoring a declared handler would turn a dismissal the project relies on into a confusing `covered`. The refusal applies to every browser case, since every browser case would register the handlers. (2) Locator forms: plain role+name or text only, exact match, the v3 forms; scoped forms are out of scope (minimum). (3) A write-effect handler is skipped, not refused, for a non-dedicated role: the declaration is valid for the project, and the other roles still need the non-write handlers; the run records why. (4) Handler registration uses only `times` (25); the default wait for the trigger to hide stays, so an overlay the dismissal does not remove fails the action into phase 2's `covered`, and `noWaitAfter` is never set. (5) The role for the write gate is the case's own role (`role` of the per-case function, `role` of the `ground` arguments; an anonymous or missing role is not dedicated), evaluated against the same `login.config.json` read as the effect gate. (6) Interplay with phase 2: a handler runs before Playwright's actionability check, so a dismissed overlay never reaches `isCoveredAtActionPoint`; a handler that fails or whose overlay persists leaves the click to time out, and `probeActionFailure` still reads the hit target. (7) Interplay with phase 3: handlers fire only before `click`/`fill`, which stop after a failed assertion, so no dismissal happens after one; the evidence file is attached to the case whatever the verdict. (8) Interplay with phase 1: a truncated case never acts, so its handlers never fire. (9) `ground` has no case evidence, so its record is the fixed stdout lines; the snapshot files are unchanged.
- Caveats of `page.addLocatorHandler` that shaped the design (Playwright docs, https://playwright.dev/docs/api/class-page#page-add-locator-handler): the handler runs only before or during actions and auto-waiting assertions that need an actionability check (not on a bare wait), its runtime counts against the timeout of the action that triggered it, only one handler runs at a time, it changes the page state mid-test, and predictable overlays are better dismissed explicitly (the reason `ground` probes and why a declared, recorded handler is still preferred to a forced click). The `removeLocatorHandler` semantics and the exact behavior of a trigger that stays visible after the handler were not read in primary docs; the design relies only on the documented default wait and the action timeout.
- Run commands from the worktree root. Prefix git invocations with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false` on this Windows host (each block exports it); write files with LF line endings.
- Research: `research-codebase` surveys of `qa-run.mjs` (seed loading, page creation sites, evidence assembly, the dedicated-role gate, the guard sites, `ground` flags), the `qa-run-contract` and `auth-local-guard-sites` checks and the existing tests, plus `research-web` on `addLocatorHandler`, were dispatched; the quoted code was then read directly from the working tree.

*Generated: 2026-10-25*
*Approved: 2026-10-25*
*Implemented: 2026-10-25*
*Status: IMPLEMENTED*
