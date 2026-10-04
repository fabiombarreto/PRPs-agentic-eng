# Feature: Reuse proof (Phase 7 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: secret handling and the local-only guard (the login template is the one place a session file is saved and reused); change to a shared contract (the `login.config.json` schema, the `auth-model.md` template, the `qa-run.mjs` blocked reason vocabulary); edits to agent prompts (`auth-model-writer`, `auth-model-reviewer`) pinned by tests; documentation-site change
- Decisions found:
  - [2026-09-25] Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability — the binding scope of the source PRD; Phase 7 is its 2026-10-04 operator-approved addition (Decisions Log row "Reuse proof in both directions, with a browser probe")
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-04-19] Methodology declaration — `tdd: false` and `test_frameworks: ["node:test"]` come from `docs/context/methodology.md`; test-after, R-X strict, the Implementer authors zero test files
  - [2026-09-25] The hybrid `/code-review` pass measurement forbids a second variable in the review loop — `code-reviewer.md`, `code-reviewer-semantic.md` and `relay-implement.md` stay byte-identical (PRD AC-16)
  - Diff-base contract (`docs/context/architecture.md`) — single-argument `git diff <base>` only, never the two-dot form
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — no cookie, token, credential or marker-derived secret is ever interpolated into a message
  - "Writing pipeline artifacts under `.claude/`" — every artifact lands under `PRPs/` or in the repository's own tracked trees
  - "Weakening or deleting tests to make the auto-correction loop turn green" — an existing test whose contract deliberately changes is a test-pair `EXISTING_TEST_UPDATED` item, never an Implementer edit
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from that tree
- Applicable architectural rules:
  - Interactivity boundary — nothing here is invoked by `/relay-execute`; `/relay-auth-scripts` and `/relay-qa-run` stay standalone
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`, so the template and its generator prompt stay there
  - Graceful degradation is mandatory, with the local-only guard as the explicit hard-failure exception
  - Command versus agent separation — a command owns mutations, an agent owns judgment
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 7:
  "Reuse proof" — Goal: make it impossible to save or reuse a session on a probe that cannot tell an authenticated request from an anonymous one — the defect that left AC-12's reuse clause unproven in `super-ensino` — Success signal: against a fixture shaped like `super-ensino` — every route answering 200, the protected API on another origin, an authenticated-only marker in the rendered page — the HTTP probe halts `FAILED_PROBE_NOT_PROTECTED`, the browser probe proves save and reuse in both directions, and a session saved for the wrong account halts `FAILED_PROBE_WRONG_ACCOUNT`.

Row 7 `Depends` is `6` (`complete`), so it is actionable under Step 1.3. Row 5 (Dogfood) is `pending` but depends on `7`, which is not yet `implemented`, so it is not actionable.

## Summary

The kit's login script saves a session and, on every later run, reuses it after one authenticated-only HTTP probe. In the `super-ensino` dogfood that probe answered 200 with and without a session (a Vite dev server serves the SPA shell for every route), so reuse passed by vacuity, and a headed login even saved a superuser's session under role `teacher` unnoticed. This phase makes every save and every reuse prove the session in both directions. For `form`, `api` and `headed` roles the HTTP probe gains a negative control (2xx with the session, non-2xx without) that presents the session exactly as the runner will (cookies plus the token header when a token exists, so a token-only session is never rejected) and halts `FAILED_PROBE_NOT_PROTECTED` when the probe answers the same both ways. Any role, including `static-token`, may also declare a browser probe: a same-origin route plus an authenticated-only marker, checked in a headless browser with the saved state (marker must become visible) and in a fresh context (marker must stay absent for longer than the positive window). A role may add a role marker that, if absent with the session, halts `FAILED_PROBE_WRONG_ACCOUNT`. `/relay-auth-scripts`, the auth-model template, writer and reviewer learn to declare both probes, `qa-run.mjs` surfaces the new halts as named blocked reasons, and a runnable super-ensino-shaped harness proves the three halts and the save/reuse path end to end.

## User Story

As the operator running `/relay-qa-run` against a single-page application
I want every saved or reused session proven to be authenticated, and as the right account
So that a probe that answers 200 for everyone can never again turn a reuse check, or a wrong-account login, into a false proof

## Problem Statement

`/relay-qa-report` writes cases that mostly need a logged-in user in a specific role, and the kit's login scripts exist to supply that session. The `super-ensino` dogfood showed the session proof was vacuous: the probe path answered 200 with and without a session, so AC-12's reuse clause was never actually proven. A browser-driven page can tell the two states apart (the profile greeting rendered only with a session), and nothing in the kit asked it to.

## Solution Statement

Generalize the with-and-without proof that phase 6 shipped for `static-token` (`proveStaticToken`) to every mechanism, and add an optional rendered-page proof for single-page apps. Both are declared in the human-approved auth model and `login.config.json`; the generator never guesses a selector or text, and an undeclared required field stays `TBD - needs validation` and halts by name. The negative direction is the place a false proof can be manufactured, so the browser probe's absence check waits strictly longer than its presence check and a page that fails to load is a halt, not an absence.

## Metadata

| Field | Value |
|-------|-------|
| Type | Feature (prompt, resource template and runner-script change) |
| Complexity | HIGH — security-relevant template, one subtle timing contract, five pinned test files |
| phase_type | feature |
| Systems Affected | `plugins/relay/resources/auth-login.template.mjs`, `plugins/relay/scripts/qa-run.mjs`, `/relay-auth-scripts`, `/relay-qa-run` command text, `auth-model-template.md`, `auth-model-writer`, `auth-model-reviewer`, `documentation/` |
| Dependencies | Phase 6 `complete` (static-token proof, IndexedDB-carrying `storageState`); Playwright >= 1.51 (already gated); installed Chromium |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` rows 222, 264-268; AC-20 line 106; AC-21 line 107; revised AC-12 line 98 |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 98, 106-107, 264-268, 289 | AC-12 revised wording, AC-20, AC-21, Phase 7 details, the decision row |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 1-195, 372-406, 539-594, 710-950 | The file this phase changes: header schema, `incompleteField`, `sessionReusable`, `proveStaticToken`, `staticTokenReusable`, `main`, `writeSecret` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1061-1102, 1405-1416 | `obtainSession` extracts the first `FAILED_*` code; the call site maps every failure to `SESSION_UNAVAILABLE` |
| P0 | `scripts/validate/checks/auth-login-template.test.mjs` | 643-686 (per research-codebase) | Source-order and invariant pins the template edit must keep true |
| P0 | `scripts/validate/checks/auth-static-token-indexeddb.test.mjs` | 565-608, 624-675 (per research-codebase) | Four-`storageState`-call count, prompted-token SOURCE-ORDER test, mutation anchors that must stay exactly once |
| P1 | `plugins/relay/scripts/auth-local-guard.mjs` | the `isAllowedHost` export | The route guard the browser probe must apply |
| P1 | `plugins/relay/commands/relay-auth-scripts.md` | 145-189 | Phase A config derivation the generator must extend |
| P1 | `plugins/relay/resources/auth-model-template.md` | 45-111 | The nine-heading skeleton (no tenth heading allowed) |
| P1 | `plugins/relay/agents/auth-model-reviewer.md` | 85-112 | Rubric is exactly R-AM1..R-AM7; riders, not new rows |
| P1 | `plugins/relay/agents/auth-model-writer.md` | 84-100 | Discovery list; tools fixed at `Read, Write, Edit, Glob, Grep` |
| P1 | `plugins/relay/commands/relay-qa-run.md` | whole file | Read before editing; the contract check pins required and banned tokens |
| P1 | `documentation/AGENTS.md` | whole file | Binding contract for every `documentation/` edit |
| P2 | `scripts/validate/checks/qa-run-contract.mjs` | 22-24, 94-135 | Closed outcome literal, marker counts, banned command tokens |
| P2 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 29-75 | Marker and token enumeration the template must keep satisfying |
| P2 | `documentation/reference/scripts.html` | 207-224 | The `qa-run.mjs` block to extend |

## Patterns to Mirror

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:548-572
async function proveStaticToken(cfg, role, token, pw) {
  const url = sameOriginUrl(cfg.baseUrl, role.probe.path);
  if (!url) return 'rejected';
  const status = async (headers) => {
    const ctx = await pw.request.newContext();
    try {
      const res = await ctx.fetch(url, { method: role.probe.method, headers, maxRedirects: 0 });
      return res.status();
    } finally {
      await ctx.dispose();
    }
  };
  try {
    const withToken = await status({ [role.staticToken.header]: `${role.staticToken.valuePrefix}${token}` });
    if (withToken < 200 || withToken >= 300) return 'rejected';
    const without = await status(undefined);
    return without >= 200 && without < 300 ? 'unproven' : 'proven';
  } catch {
    return 'rejected';
  }
}
```
Copied (shape only, never edited) by Task 2 (`httpProbeProof`): a fresh request context per request, `maxRedirects: 0`, rejected / unproven / proven. `proveStaticToken` itself is NOT touched — its source line `return without >= 200 && without < 300 ? 'unproven' : 'proven';` is a mutation anchor that must stay exactly once.

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:455-463
async function loginForm(cfg, role, creds, pw, guard, root, allowedHosts) {
  const browser = await pw.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return guard.isAllowedHost(u.hostname, allowedHosts) ? route.continue() : route.abort();
    });
```
Copied by Task 2 (`browserProbeProof`): the route guard applied to every browser context the probe opens.

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:380-406
async function sessionReusable(root, cfg, role, getPlaywright) {
  const file = join(root, SESSION_REL);
  if (!existsSync(file)) return false;
  ...
  const url = sameOriginUrl(cfg.baseUrl, role.probe.path);
  if (!url) return false;
  const pw = getPlaywright();
  if (!pw) return false;
  const ctx = await pw.request.newContext({ storageState: file });
  try {
    const res = await ctx.fetch(url, { method: role.probe.method, maxRedirects: 0 });
    return res.status() >= 200 && res.status() < 300;
  } catch {
    return false;
  } finally {
    await ctx.dispose();
  }
}
```
Rewired by Task 3: the single authenticated probe becomes the two-direction proof; a failed POSITIVE check keeps returning `false` (re-login), only a failed negative control, wrong account or unloadable page halts.

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:162-183
  } else if (role.mechanism === 'static-token') {
    required = required.concat(['staticToken.header']);
    const st = role.staticToken;
    if (!st || typeof st !== 'object' || typeof st.valuePrefix !== 'string') {
      return `roles.${ROLE}.staticToken.valuePrefix`;
    }
    if (st.browser === undefined) return `roles.${ROLE}.staticToken.browser`;
    if (st.browser !== null) {
      const kind = st.browser.kind;
      if (kind === 'localStorage') {
        required = required.concat(['staticToken.browser.originPath', 'staticToken.browser.key']);
```
Copied by Task 1: name the first missing field by dotted path, never default a declared-but-unfilled field.

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:844-852
    const proof = await proveStaticToken(cfg, role, source.token, pw);
    if (proof === 'unproven') {
      err('FAILED_TOKEN_UNPROVEN: the protected endpoint answered 2xx with and without the token; no session was saved');
      return 1;
    }
    if (proof !== 'proven') {
      err(`FAILED_LOGIN_REJECTED: the login for role ${ROLE} yielded no session`);
      return 1;
    }
```
Copied by Task 3: a named halt line printed with `err(...)`, return 1, static text only.

Token presentation rule (prose reference, not a snippet): the runner's own rule at `plugins/relay/scripts/qa-run.mjs:886-892` (with the artifact read at ~1091-1092) sends `{ [header]: (value_prefix ?? '') + token }` when the token artifact names a `header` (restricted to `[A-Za-z0-9-]+`), and `Authorization: Bearer <token>` otherwise. Task 2's `httpProbeProof` applies exactly that rule; the Implementer opens those lines and copies the rule from the source. No new config field exists or is added.

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1096-1098 and 1413-1414
      const m = /FAILED_[A-Z_]+/.exec(String(r.stderr ?? ''));
      result = { ok: false, code: m ? m[0] : 'FAILED_LOGIN_UNKNOWN' };
...
    const s = obtainSession(ctx, role);
    if (!s.ok) return out(blocked('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`));
```
Mirrored by Task 4: the code is already extracted; only the call site changes, via a closed allowlist so `FAILED_LOGIN_SCRIPT_MISSING` still maps to `SESSION_UNAVAILABLE`.

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:157-165
- For a `static-token` role the `staticToken` block is filled only from the
  model's evidence: `tokenEnv` is an environment-variable NAME taken from
  `## Session and Token Model` (else null), `header` and `valuePrefix` come from
  where the API expects the token, and `browser` comes from the declared storage
  location ... The generated script's own
  halts for this mechanism are `FAILED_TOKEN_UNPROVEN`,
  `FAILED_TOKEN_LOCATION_UNREACHABLE` and `FAILED_INDEXEDDB_UNSUPPORTED`.
```
Copied by Task 5.

```
# SOURCE: plugins/relay/agents/auth-model-reviewer.md:89-96
- **R-AM1** — Every authentication mechanism is named with spot-verifiable
  `file:line` evidence (verify by `Read`). A `static-token` mechanism satisfies
  this row when it names the header or browser location that presents the token
  (`localStorage`, or IndexedDB with database, object store and key) with
  `file:line` evidence.
- **R-AM2** — A login flow is present for every mechanism, each marked
  scriptable or not scriptable. A `static-token` flow states its declared
  presentation and that no login request exists.
```
Copied by Task 6: a rider inside an existing row, never a new R-AM8 row.

```
# SOURCE: documentation/changelog.html:31-33
      <h2 id="unreleased">Unreleased</h2>

      <p>Nothing yet.</p>
```
Copied by Task 8.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/auth-login.template.mjs` | UPDATE | Header schema, timing constants, `browserProbe` validation, `httpProbeProof` / `browserProbeProof` / `proveSession`, rewired reuse and pre-save paths (Tasks 1-3) |
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | Named blocked reasons for the three new halts (Task 4) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | Document the named blocked reasons without adding a banned token (Task 4) |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | Derive `browserProbe` from the model, list the new halts (Task 5) |
| `plugins/relay/resources/auth-model-template.md` | UPDATE | Parenthetical probe-declaration guidance inside existing sections (Task 6) |
| `plugins/relay/agents/auth-model-writer.md` | UPDATE | Discovery bullet: propose, never guess, an authenticated-only marker (Task 6) |
| `plugins/relay/agents/auth-model-reviewer.md` | UPDATE | Riders on R-AM2 and R-AM6 (Task 6) |
| `PRPs/reports/manual-qa-runner-auth-kit/phase-7/reuse-proof-harness.mjs` | CREATE | Runnable super-ensino-shaped evidence harness that Level 3 executes; not part of the test suite (Task 7) |
| `documentation/reference/scripts.html` | UPDATE | Describe the proof and named blocked reasons in the `qa-run.mjs` block (Task 8) |
| `documentation/changelog.html` | UPDATE | Entry under Unreleased (Task 8) |

## NOT Building (Scope Limits)

- Any change to `plugins/relay/agents/code-reviewer.md`, `code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` (PRD AC-16) or `plugins/relay/scripts/visual/capture.mjs`.
- A `plugin.json` bump or a release — 0.41.0 is cut but not installed, and this phase ships later as its own version.
- A route guard inside `loginHeaded` (finding F5). It has none today; recorded here and in Notes, deliberately not fixed in this phase.
- Cross-origin or Bearer-header probes (the two-origin topology). The browser probe makes reuse provable there through the rendered page; the API origin stays unreachable to the HTTP driver.
- Any test-file edit by the Implementer (R-X strict). Unit and integration coverage comes from the test pair.
- Changing `proveStaticToken`, its `FAILED_TOKEN_UNPROVEN` halt, the `writeSecret` writer, or the count of four `storageState` captures.
- New `/relay-qa-run` outcomes. The outcome vocabulary stays `pass`, `fail`, `blocked`, `needs-human`.
- Touching the pinned "Twenty-two commands" subtitle or the search-index prefix in `documentation/`.
- A new R-AM8 reviewer rubric row or a tenth `auth-model.md` heading.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/resources/auth-login.template.mjs — schema, constants, config validation

**ACTION**: Delivers AC-A2, AC-A3, AC-A6 (configuration half). Three edits. (1) In the header schema comment add an optional `"browserProbe": null | { "route": string, "marker": { "kind": "text" | "selector", "value": string }, "roleMarker": null | { "kind": "text" | "selector", "value": string } }` (absent is read as null) and state the rule precisely: for `form`, `api` and `headed` a declared `browserProbe` is THE proof for the role (the HTTP `probe` is not consulted at all, since on a single-page app it can be vacuous); `static-token` keeps `FAILED_TOKEN_UNPROVEN` and may additionally declare a `browserProbe`; the new halts are `FAILED_PROBE_NOT_PROTECTED`, `FAILED_PROBE_WRONG_ACCOUNT` and `FAILED_PROBE_PAGE_UNLOADABLE`. Write the comment without the substrings `.storageState(`, `// GUARD-SITE`, `// SECRECY-SITE`, `// WRITE-SITE`, `await sessionReusable(` or `resolveCredentials(root, role);`. (2) After the `CREDENTIALS_REL` constant add, byte-for-byte: `const BROWSER_PROBE_POSITIVE_MS = 15000;`, `const BROWSER_PROBE_SETTLE_MS = 5000;` and `const BROWSER_PROBE_NEGATIVE_MS = BROWSER_PROBE_POSITIVE_MS + BROWSER_PROBE_SETTLE_MS;` with a comment that the absence check must wait at least the full presence window plus a settle margin, never less. (3) In `incompleteField`, before the `for (const f of required)` loop, validate a declared `browserProbe` (undefined or null is fine and adds nothing): it must be an object, else return `roles.<ROLE>.browserProbe`; `route` a non-empty string; `marker.kind` one of `text` or `selector` and `marker.value` a non-empty string; `roleMarker`, when neither undefined nor null, the same shape; and for `static-token` with `staticToken.browser === null` a declared `browserProbe` returns `roles.<ROLE>.browserProbe` (an empty state cannot carry a rendered-page proof). Return the first offending dotted path, as the function does today. Optional fields default to absent, never to `TBD - needs validation`; `findTbd` already halts naming any TBD one.
**MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:162-183`
**VALIDATE**: `set -euo pipefail; node --check plugins/relay/resources/auth-login.template.mjs; grep -q 'const BROWSER_PROBE_POSITIVE_MS = 15000;' plugins/relay/resources/auth-login.template.mjs; grep -q 'const BROWSER_PROBE_SETTLE_MS = 5000;' plugins/relay/resources/auth-login.template.mjs; grep -q 'const BROWSER_PROBE_NEGATIVE_MS = BROWSER_PROBE_POSITIVE_MS + BROWSER_PROBE_SETTLE_MS;' plugins/relay/resources/auth-login.template.mjs; node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-static-token-indexeddb.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs`

### Task 2: UPDATE plugins/relay/resources/auth-login.template.mjs — the two proofs

**ACTION**: Delivers AC-A1, AC-A2, AC-A3, AC-A11. Add three functions plus one small helper, none of which writes a file, calls a storage-state capture, or interpolates a cookie, token, credential or marker value into any string. Helper `tokenHeaders(tokenArt)` returns `undefined` when `tokenArt` is null, else the header object by the runner's own presentation rule (`qa-run.mjs:886-892`, see the prose reference under Patterns to Mirror): `{ [header]: (value_prefix ?? '') + token }` when the artifact names a `header` matching `/^[A-Za-z0-9-]+$/` (a non-matching header makes the caller return `'error'`), else `{ Authorization: 'Bearer ' + token }`. No new config field. (a) `httpProbeProof(cfg, role, storage, tokenArt, pw)` returns `'proven' | 'expired' | 'not-protected' | 'error'`, where `tokenArt` is `null` or `{ token, header?, value_prefix? }`: `sameOriginUrl(cfg.baseUrl, role.probe.path)` null gives `'error'`; the WITH-session side fetches with `pw.request.newContext({ storageState: storage })`, `maxRedirects: 0` and `headers: tokenHeaders(tokenArt)` (the cookies AND the token, exactly what the runner will present), and a non-2xx answer gives `'expired'`; the WITHOUT-session side fetches with a fresh `pw.request.newContext()` (no state) and NO token header, `maxRedirects: 0`, and a 2xx answer gives `'not-protected'`, otherwise `'proven'`; any thrown error gives `'error'`; dispose every context. A valid token-only session (no cookies, a token) is therefore proven by the token header, never rejected for lacking cookies. (b) `browserProbeProof(cfg, role, storage, pw, guard, allowedHosts)` returns `'proven' | 'expired' | 'not-protected' | 'wrong-account' | 'unloadable'`. Resolve the route with `sameOriginUrl(cfg.baseUrl, role.browserProbe.route)` (null gives `'unloadable'`). Launch ONE headless Chromium; open contexts through a local helper that applies the same `context.route('**/*', ...)` guard as `loginForm`; pass `newContext({ storageState: storage })` where `storage` is either the saved file path or the in-memory state object. Build the marker locator as `page.getByText(value).first()` for kind `text` and `page.locator(value).first()` for kind `selector`. POSITIVE direction first: `page.goto(url, { waitUntil: 'load', timeout: BROWSER_PROBE_POSITIVE_MS })`; a thrown navigation error, a null response or a status of 500 or above is `'unloadable'` (a page that fails to load is neither present nor absent). Then `marker.waitFor({ state: 'visible', timeout: BROWSER_PROBE_POSITIVE_MS })`; an error whose `name` is `TimeoutError` returns `'expired'`, any other error `'unloadable'`. If `roleMarker` is declared, wait for it the same way; a `TimeoutError` returns `'wrong-account'` (checked only with the session, only after the authenticated marker is visible). Return early on any non-proven positive result; the negative run is skipped. NEGATIVE direction second, in a FRESH context with no state: same navigation and the same `'unloadable'` rules; then a best-effort settle `await page.waitForLoadState('networkidle', { timeout: BROWSER_PROBE_SETTLE_MS }).catch(() => {})` (networkidle is only a settle aid, never the decision); then `marker.waitFor({ state: 'visible', timeout: BROWSER_PROBE_NEGATIVE_MS })`: resolving means `'not-protected'`; a `TimeoutError` means absent, but conclude `'proven'` only if the page is still open (`!page.isClosed()`) and `guard.isAllowedHost(new URL(page.url()).hostname, allowedHosts)` holds, otherwise `'unloadable'`; any non-timeout error is `'unloadable'`. Never `page.waitForFunction`, never a bare `textContent` read, never an async predicate — and keep both of those words out of any NEW comment or string in the file (the VALIDATE greps added lines for them). Close the browser in `finally`. (c) `proveSession(cfg, role, storage, tokenArt, pw, guard, allowedHosts)`: when `role.mechanism !== 'static-token'`, return `browserProbeProof(...)` if `role.browserProbe` is declared, else `httpProbeProof(cfg, role, storage, tokenArt, pw)`; for `static-token` return `browserProbeProof(...)` when `role.browserProbe` is declared, else `'proven'` (its HTTP proof is `proveStaticToken`, untouched). Add a small `PROBE_HALTS` object mapping `'not-protected'`, `'wrong-account'` and `'unloadable'` to the static halt lines `FAILED_PROBE_NOT_PROTECTED: the declared probe answered the same with and without the session; nothing was saved or reused`, `FAILED_PROBE_WRONG_ACCOUNT: the session is not the account declared for this role; nothing was saved or reused` and `FAILED_PROBE_PAGE_UNLOADABLE: the declared browser probe page did not load; nothing was saved or reused`. Do not edit `proveStaticToken`, `loginForm`, `loginHeaded`, `placeStaticToken` or `writeSecret`.
**MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:548-572` and `# SOURCE: plugins/relay/resources/auth-login.template.mjs:455-463`
**VALIDATE**: `set -euo pipefail; node --check plugins/relay/resources/auth-login.template.mjs; grep -q 'async function browserProbeProof(' plugins/relay/resources/auth-login.template.mjs; grep -q 'async function httpProbeProof(' plugins/relay/resources/auth-login.template.mjs; grep -q 'FAILED_PROBE_PAGE_UNLOADABLE' plugins/relay/resources/auth-login.template.mjs; if git diff --unified=0 23d1774 -- plugins/relay/resources/auth-login.template.mjs | grep -E '^\+[^+]' | grep -E 'waitForFunction|textContent'; then echo "FAIL: forbidden wait or bare textContent read added"; exit 1; else echo "PASS: no waitForFunction or textContent added"; fi; node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-static-token-indexeddb.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs`

### Task 3: UPDATE plugins/relay/resources/auth-login.template.mjs — wire save and reuse

**ACTION**: Delivers AC-A1, AC-A2, AC-A3, AC-A4, AC-A5, AC-A11. (1) `sessionReusable` takes two more parameters `(root, cfg, role, getPlaywright, guard, allowedHosts)` and returns `boolean | { halt: string }`. Keep every static check (file, arrays, mtime, `sessionCookie` expiry). Read the token artifact (`TOKEN_REL`, the file `staticTokenReusable` already reads; open it and mirror that read) when it exists, into `tokenArt` (`{ token, header?, value_prefix? }`, else `null`; the read never prints it). Replace the single probe fetch with `proveSession(cfg, role, file, tokenArt, pw, guard, allowedHosts)`: `'proven'` returns `true`; `'expired'` and `'error'` return `false` (re-login, exactly as a failed positive probe does today); `'not-protected'`, `'wrong-account'` and `'unloadable'` return `{ halt: PROBE_HALTS[...] }` — a configuration or account problem is never a re-login loop. (2) `staticTokenReusable` takes the same two extra parameters and keeps its existing token proof as `const tokenProof = await proveStaticToken(cfg, role, art.token, pw);` followed by `if (tokenProof !== 'proven') return false;`; when `role.browserProbe` is declared it then runs `proveSession` against the saved file with the same mapping. A role with no `browserProbe` must return `true` exactly as today. (3) In `main`, pass `guard` and `target.allowedHosts` to both reuse functions, compute `const reuse = args.force ? false : <mechanism-selected call>`, halt with `err(reuse.halt); return 1;` when `reuse` is an object, and keep the `SESSION_REUSED:` and `auth_mode:` prints for `true`. Keep the first-occurrence order the template test pins: `guard.checkTarget(cfg.baseUrl`, `'ensure'`, `await sessionReusable(`, `resolveCredentials(root, role);`, `writeSecret(root, SESSION_REL`. (4) Between the existing `sessionCookie` check (the block ending `FAILED_LOGIN_REJECTED` after the cookie-name test) and the `if (promptedToken && token !== null)` block, prove the fresh state BEFORE any write: `const saveProof = await proveSession(cfg, role, state, token !== null ? { token } : null, pw, guard, target.allowedHosts);` (the in-memory token, which the `api` path writes without `header`/`value_prefix`, so it is presented as `Authorization: Bearer <token>`) — `'proven'` continues; `'expired'` and `'error'` print the existing `FAILED_LOGIN_REJECTED` line and return 1; the other three print `PROBE_HALTS[...]` and return 1. Nothing is persisted on any halt, including the prompted-token write, which must stay after this block. Do not add a second `writeFileSync(`, do not add a fifth `storageState(` call (the probes only PASS `storageState:` as an option property), do not log, do not follow redirects, and do not duplicate the strings `await proveStaticToken(cfg, role, source.token, pw)`, `if (promptedToken && token !== null) {`, `writeSecret(root, CREDENTIALS_REL` or `merged[ROLE] = { token };`. A token-only `api` session (token, no cookies) must still save and reuse, because the proof presents the token. Fixture check already made: `auth-login-template.test.mjs`'s main fixture probe answers 200 with the `sid` cookie and 401 without (~lines 129-133), and its `other` server (~line 151) serves the cross-origin escape test, not a probe, so neither should break. If any pinned existing test still fails because its fixture probe answers 200 regardless of session, STOP and report that exact test NAME for the test pair as an `EXISTING_TEST_UPDATED` item — never edit a test file.
**MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:380-406` and `# SOURCE: plugins/relay/resources/auth-login.template.mjs:844-852`
**VALIDATE**: `set -euo pipefail; node --check plugins/relay/resources/auth-login.template.mjs; grep -q 'proveSession(cfg, role, state, ' plugins/relay/resources/auth-login.template.mjs; grep -q 'target.allowedHosts);' plugins/relay/resources/auth-login.template.mjs; grep -q 'proveSession(cfg, role, file, tokenArt, pw, guard, allowedHosts)' plugins/relay/resources/auth-login.template.mjs; grep -q 'const tokenProof = await proveStaticToken(cfg, role, art.token, pw);' plugins/relay/resources/auth-login.template.mjs; node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-static-token-indexeddb.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs`

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs and plugins/relay/commands/relay-qa-run.md — named blocked reasons

**ACTION**: Delivers AC-A7. In `qa-run.mjs` add a module constant `const PROBE_BLOCK_CODES = ['FAILED_PROBE_NOT_PROTECTED', 'FAILED_PROBE_WRONG_ACCOUNT', 'FAILED_PROBE_PAGE_UNLOADABLE'];` and change the `!s.ok` line at the `obtainSession` call site so that when `PROBE_BLOCK_CODES.includes(s.code)` the case is `blocked(s.code, ...)` with a reason naming the role and saying the kit's probe halted and nothing was saved (code is the reason_code), and every other failure code still yields `blocked('SESSION_UNAVAILABLE', ...)` byte-identically (the missing-script case must keep that reason and the `FAILED_LOGIN_SCRIPT_MISSING` text). Do not add an `outcome:` literal, a second `writeFileSync(` or `renameSync(`, or touch the guard and write markers. In `relay-qa-run.md`, read the file first, then state in its existing blocked-reasons prose (or the nearest equivalent paragraph) that these three codes appear as named `blocked` reasons and mean a configuration or account problem, not "could not log in". The file must not gain any of the banned tokens the contract check lists (`design-spec`, `relay-auth-setup`, the `.claude` + `PRPs` path, `subagent_type`).
**MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1096-1098 and 1413-1414`
**VALIDATE**: `set -euo pipefail; node --check plugins/relay/scripts/qa-run.mjs; grep -q "const PROBE_BLOCK_CODES = \['FAILED_PROBE_NOT_PROTECTED', 'FAILED_PROBE_WRONG_ACCOUNT', 'FAILED_PROBE_PAGE_UNLOADABLE'\];" plugins/relay/scripts/qa-run.mjs; grep -q 'FAILED_PROBE_NOT_PROTECTED' plugins/relay/commands/relay-qa-run.md; node --test scripts/validate/checks/qa-run.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-layout.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs; npm run validate`

### Task 5: UPDATE plugins/relay/commands/relay-auth-scripts.md — derive the declarations

**ACTION**: Delivers AC-A6. In Phase A's config derivation, after the `static-token` bullet, add a bullet: `browserProbe` is filled only when `## Login Flow` states a browser probe for the role — a same-origin route and an authenticated-only marker (visible text or a selector), optionally a role marker — and is otherwise absent (null). A route stated without a marker, or a marker whose text or selector the model does not give, is written as the literal `TBD - needs validation` so the generated script halts `FAILED_LOGIN_CONFIG_INCOMPLETE` naming the field; never a guessed selector or text. State the rule that a declared browser probe is the role's proof for `form`, `api` and `headed` (the HTTP `probe` is then not consulted), that `static-token` keeps `FAILED_TOKEN_UNPROVEN` and may also declare one, and list the script's new halts `FAILED_PROBE_NOT_PROTECTED`, `FAILED_PROBE_WRONG_ACCOUNT` and `FAILED_PROBE_PAGE_UNLOADABLE`. Keep the literal strings `auth-local-guard.mjs` and `FAILED_NON_LOCAL_TARGET` already in the file, and do not introduce `--local-host`.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-auth-scripts.md:157-165`
**VALIDATE**: `set -euo pipefail; grep -q 'browserProbe' plugins/relay/commands/relay-auth-scripts.md; grep -q 'FAILED_PROBE_WRONG_ACCOUNT' plugins/relay/commands/relay-auth-scripts.md; grep -q 'auth-local-guard.mjs' plugins/relay/commands/relay-auth-scripts.md; if grep -n -e '--local-host' plugins/relay/commands/relay-auth-scripts.md; then echo "FAIL: forbidden --local-host flag"; exit 1; else echo "PASS: no --local-host"; fi; node --test scripts/validate/checks/auth-local-guard-sites.test.mjs`

### Task 6: UPDATE auth-model-template.md, auth-model-writer.md and auth-model-reviewer.md — declare the probes in the model

**ACTION**: Delivers AC-A6. Template: inside the existing `## Login Flow` guidance (a parenthetical, no tenth heading) add that a role may state a browser probe as one line — route, authenticated-only marker as visible text or a selector, optional role marker — recorded by description, never a credential or cookie value. Writer: add one discovery bullet — an element or greeting component that renders only when a user is signed in (and, separately, one specific to a role) may be PROPOSED as a candidate with `file:line` evidence, never guessed; an unknown is `TBD - needs validation` with a matching `## Open Questions and Assumptions` row. Keep the tools line exactly `Read, Write, Edit, Glob, Grep`. Reviewer: add riders — in R-AM2, a declared browser probe states its route and marker; in R-AM6, a probe marker or role marker that is a credential-shaped value (a JWT, a password literal, a cookie value) fails the row. Do not add a rubric row: the ids stay exactly R-AM1 through R-AM7, the literal `Re-run R-AM1 through R-AM7` stays, and the reviewer keeps tools `Read, Edit, Write`. The template keeps exactly nine second-level headings and its closing status lines.
**MIRROR**: `# SOURCE: plugins/relay/agents/auth-model-reviewer.md:89-96`
**VALIDATE**: `set -euo pipefail; grep -q 'browser probe' plugins/relay/resources/auth-model-template.md; grep -q 'authenticated-only marker' plugins/relay/agents/auth-model-writer.md; grep -q 'browser probe' plugins/relay/agents/auth-model-reviewer.md; if grep -n 'R-AM8' plugins/relay/agents/auth-model-reviewer.md; then echo "FAIL: a new rubric row was added"; exit 1; else echo "PASS: rubric still R-AM1..R-AM7"; fi; node --test scripts/validate/checks/auth-model-pair.test.mjs`

### Task 7: CREATE PRPs/reports/manual-qa-runner-auth-kit/phase-7/reuse-proof-harness.mjs — the super-ensino-shaped proof

**ACTION**: Delivers AC-A9 and AC-A11 (and exercises AC-A1 through AC-A5 end to end). A runnable ESM evidence script, NOT a test file and not under any test glob; it exits non-zero on any failed assertion. It derives `repoRoot` as four directories above its own folder and `pluginRoot = <repoRoot>/plugins/relay`. It builds a temporary project with `mkdtempSync(join(tmpdir(), 'relay-reuse-proof-'))` (`tmpdir()` called inside Node), runs `git init` there through an ASYNC `execFile`/`spawn` (never a sync child spawn while an in-process server is listening), reads the template, replaces `__RELAY_ROLE__` with `teacher`, and replaces the two literal lines `const BROWSER_PROBE_POSITIVE_MS = 15000;` and `const BROWSER_PROBE_SETTLE_MS = 5000;` with `4000` and `2000` — asserting each replacement matched exactly once — to keep the run short. Fixture: server A on `127.0.0.1:0` answers EVERY GET with HTTP 200 and the same HTML shell (the super-ensino Vite shape); `POST /api/login` answers 200 and sets `qa_session=teacher-<n>; Path=/` (not HttpOnly) and counts logins; the shell's script waits 800 ms, then renders `<h1>Hello, QA Teacher</h1>` and `<p>Teacher area</p>` only when `document.cookie` carries a `qa_session=teacher-` value (both elements carry text, never zero-size); a mode flag makes the shell render the marker unconditionally. Server B, on a second loopback port, is the protected API: 200 only with `Authorization: Bearer`, else 401, with a hit counter that must stay 0 throughout (the probes stay same-origin). Config: role `teacher`, mechanism `api` (`/api/login`, POST, `username`/`password`, `tokenPath` null), `probe` `/perfil` GET, `sessionCookie` `qa_session`, `maxAgeMinutes` 60, credentials taken from the environment variable NAMES `QA_USER` and `QA_PASS` that the harness sets only on the child process. Run the login script with an ASYNC `spawn` of `node PRPs/auth/login-teacher.mjs --root <project> --plugin-root <pluginRoot>` and capture status, stdout and stderr. Scenarios, each asserting the exit status, the named halt in stderr, whether `PRPs/auth/.sessions/teacher.json` exists, and that neither stream contains the password value or a `teacher-` cookie value: (1) no `browserProbe`: status 1, `FAILED_PROBE_NOT_PROTECTED`, no session file; (2) `browserProbe` with route `/perfil` and marker text `Hello, QA Teacher`: status 0, `SESSION_CREATED`; an immediate second run prints `SESSION_REUSED` and the login counter did not move; (3) tamper: overwrite the saved cookie value with `bogus` in the session file, run again: `SESSION_CREATED` and the login counter increased (marker absent with the state means expired, so re-login, not a halt); (4) role marker text `Admin area` with the teacher account: status 1, `FAILED_PROBE_WRONG_ACCOUNT`, no session file; with `Teacher area` it succeeds; (5) mode flag set so the shell renders the marker for everyone: status 1, `FAILED_PROBE_NOT_PROTECTED`, no session file; (6) token-only `api` role `svc` (AC-A11): server A also answers `POST /api/token-login` with JSON carrying a token and NO Set-Cookie, and `GET /api/me` (same origin) answers 200 only with `Authorization: Bearer <that token>` and 401 otherwise; config mechanism `api`, `tokenPath` pointing at the token, `sessionCookie` null (the Implementer opens the template's schema header to match its declared shape), `probe` `/api/me`, no `browserProbe`: status 0 and `SESSION_CREATED`, an immediate second run prints `SESSION_REUSED` and the token-login counter did not move; (7) a mode flag makes `/api/me` answer 200 with or without the token: status 1, `FAILED_PROBE_NOT_PROTECTED`, no session file. Close both servers, remove the temporary directory, print one `PASS:` line, and set a non-zero exit code from a top-level catch.
**MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:455-463`
**VALIDATE**: `set -euo pipefail; node PRPs/reports/manual-qa-runner-auth-kit/phase-7/reuse-proof-harness.mjs`

### Task 8: UPDATE documentation/reference/scripts.html and documentation/changelog.html — the site

**ACTION**: Delivers AC-A10. Read `documentation/AGENTS.md` first (it is the binding contract). In `reference/scripts.html`, inside the `qa-run.mjs` block, add one `<dt>`/`<dd>` pair (`Session proof`) stating that a login script now proves every saved or reused session in both directions, that a declared browser probe is the proof for its role, and that `FAILED_PROBE_NOT_PROTECTED`, `FAILED_PROBE_WRONG_ACCOUNT` and `FAILED_PROBE_PAGE_UNLOADABLE` reach the report as named blocked reasons. In `changelog.html`, replace the `<p>Nothing yet.</p>` paragraph under `<h2 id="unreleased">` with an `<h3 id="unreleased-added">Added</h3>` list entry in the file's existing `<li><strong>...</strong> &mdash; ...</li>` shape; the entry text MUST name `FAILED_PROBE_NOT_PROTECTED` (and may name the other two). Use existing CSS classes only, no emoji, no inline style, no new page, no NAV or search-index change (no page is added), do not touch the "Twenty-two commands" subtitle or the search-index prefix, and do not bump any version.
**MIRROR**: `# SOURCE: documentation/changelog.html:31-33`
**VALIDATE**: `set -euo pipefail; grep -q 'FAILED_PROBE_WRONG_ACCOUNT' documentation/reference/scripts.html; grep -q 'FAILED_PROBE_NOT_PROTECTED' documentation/changelog.html; if grep -q 'Nothing yet' documentation/changelog.html; then echo "FAIL: Unreleased still empty"; exit 1; else echo "PASS: Unreleased populated"; fi; npm run validate`

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/resources/auth-login.template.mjs
node --check plugins/relay/scripts/qa-run.mjs
node --check PRPs/reports/manual-qa-runner-auth-kit/phase-7/reuse-proof-harness.mjs
grep -q 'FAILED_PROBE_NOT_PROTECTED' plugins/relay/resources/auth-login.template.mjs
git diff --quiet 23d1774 -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs plugins/relay/.claude-plugin/plugin.json
if git diff --name-only 23d1774 | grep -E '\.(test|spec)\.'; then
  echo "FAIL: a test file is in the Implementer diff"; exit 1
else
  echo "PASS: no test file touched"
fi
if git diff --unified=0 23d1774 -- plugins documentation | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced"
fi
```

### Level 2 — UNIT_TESTS and CONTENT_INVARIANTS

```bash
set -euo pipefail
grep -q 'FAILED_PROBE_WRONG_ACCOUNT' plugins/relay/commands/relay-qa-run.md
node --test "scripts/validate/**/*.test.mjs"
npm run validate
```

Baselines to hold: corpus 1388 tests, 0 fail, 0 skipped; `npm run validate` 28 checks, 0 failing. Both commands rely on their own exit codes (no output scraping). The first line is red on the unmodified tree (the code does not yet appear in `relay-qa-run.md`), so the block also proves this phase happened. A Level block may tolerate only a NAMED failing test (by test NAME, never a whole file) that Task 3 identified as a deliberate-contract casualty and handed to the test pair as `EXISTING_TEST_UPDATED`; never a whole file.

### Level 3 — INTEGRATION (DRY-RUN END-TO-END)

```bash
set -euo pipefail
node PRPs/reports/manual-qa-runner-auth-kit/phase-7/reuse-proof-harness.mjs
node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-static-token-indexeddb.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs scripts/validate/checks/auth-model-pair.test.mjs scripts/validate/checks/qa-run.test.mjs
```

The harness is the super-ensino-shaped run (every route 200, protected API on a second loopback port, an authenticated marker and a role marker rendered by the page script). Allow roughly a minute for it; its shortened windows are part of the harness, not of the shipped template.

## Acceptance Criteria

- **AC-A1 (PRD AC-20):** For a `form`, `api` or `headed` role with no declared browser probe, on save and on every reuse the HTTP probe answers 2xx with the session and non-2xx without it (same `maxRedirects: 0` and same-origin rule); answering 2xx both ways halts `FAILED_PROBE_NOT_PROTECTED` and saves or reuses nothing. On reuse, a non-2xx WITH the session is expiry and re-logs in; a 2xx WITHOUT it halts, never loops.
- **AC-A2 (PRD AC-20):** A role that declares a browser probe is proven in a headless browser: the marker becomes visible with the saved state and stays absent in a fresh context for longer than the presence window (`BROWSER_PROBE_NEGATIVE_MS` is the presence window plus a settle margin); a page that fails to load is `FAILED_PROBE_PAGE_UNLOADABLE`, neither present nor absent; the wait is `locator.waitFor({ state: 'visible' })`, never `waitForFunction` or a bare `textContent` read; the browser probe is the role's proof and the HTTP probe is not consulted for `form`, `api` and `headed`.
- **AC-A3 (PRD AC-21):** A declared role marker is checked only with the session, after the authenticated marker is visible; its absence halts `FAILED_PROBE_WRONG_ACCOUNT` on save and on reuse, and nothing is saved or reused.
- **AC-A4 (PRD AC-20):** A `static-token` role keeps `FAILED_TOKEN_UNPROVEN` unchanged, may additionally declare a browser probe (proven on save and on reuse), and a `static-token` role with no browser probe behaves exactly as before.
- **AC-A5 (PRD AC-12):** A valid session is still reused with no login and no visible browser (the probe's headless browser is not a login), an expired or marker-absent-with-state session still re-logs in, and no cookie, token, credential or marker value is ever printed.
- **AC-A6 (PRD AC-20):** `/relay-auth-scripts`, the auth-model template, writer and reviewer declare both probes without guessing: an undeclared required field is `TBD - needs validation` and the script halts `FAILED_LOGIN_CONFIG_INCOMPLETE` naming it; the reviewer rubric stays exactly R-AM1 through R-AM7.
- **AC-A7 (PRD AC-20):** (AC-20 names `FAILED_PROBE_NOT_PROTECTED` and `FAILED_PROBE_PAGE_UNLOADABLE`; the third code, `FAILED_PROBE_WRONG_ACCOUNT`, is PRD AC-21's halt.) `/relay-qa-run` reports the three new halts as named `blocked` reasons; every other session failure keeps `SESSION_UNAVAILABLE`.
- **AC-A8 (PRD AC-16):** `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `capture.mjs` are byte-identical to commit 23d1774, no `plugin.json` bump exists, and the template keeps `// GUARD-SITE`, `// SECRECY-SITE`, `// WRITE-SITE` exactly once each in that order, one secret writer and exactly four `storageState` captures.
- **AC-A9 (PRD AC-20):** Against a fixture where every route answers 200, the protected API is on a second origin and the page renders an authenticated marker, the HTTP probe halts `FAILED_PROBE_NOT_PROTECTED`, the browser probe proves save and reuse in both directions, and a session for the wrong account halts `FAILED_PROBE_WRONG_ACCOUNT`.
- **AC-A11 (PRD AC-20):** The HTTP proof presents the session exactly as the runner will: the storage-state's cookies plus the token artifact's header (`Authorization: Bearer <token>` when the artifact names none, otherwise the named header with its prefix) when a token exists, on save (the in-memory token) and on every reuse (the token artifact); the without-session side sends neither. A token-only `api` role (token, no cookies) therefore saves and reuses, and a probe that answers 200 without the token halts `FAILED_PROBE_NOT_PROTECTED`. No new config field is introduced.
- **AC-A10 (PRD AC-20):** The documentation site and its changelog describe the proof and the named blocked reasons, following `documentation/AGENTS.md`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The negative check declares absence too early and manufactures a false proof (before the SPA renders or redirects) | M | H | The absence wait is `BROWSER_PROBE_NEGATIVE_MS`, strictly longer than the presence window; a load failure is `unloadable`; the harness proves it against a page that renders after 800 ms and one that renders the marker for everyone |
| An existing test pins a contract this phase deliberately changes (reuse return type; a fixture probe that answers 200 regardless of session) | M | M | Task 3 names the stop rule: report the exact test to the test pair as `EXISTING_TEST_UPDATED`; a failed positive probe on reuse still returns `false` so the six re-login cases in `auth-login-template.test.mjs` keep their meaning |
| A source-order or count pin breaks (`await sessionReusable(` first occurrence, one `writeFileSync(`, four `storageState(` calls, mutation anchors) | M | M | Each task lists the strings it must not duplicate; every task's VALIDATE runs the three pinning test files |
| The HTTP proof's token presentation drifts from the runner's, rejecting a valid token-only session or proving a different request than the runner sends | M | H | `tokenHeaders` copies the runner's rule from `qa-run.mjs:886-892`; no new config field; harness scenarios 6 and 7 prove a token-only `api` role saves, reuses, and halts when the probe ignores the token |
| A marker or credential value leaks into a message | L | H | Halt lines are static text; markers are consumed only by the locator; the harness asserts the password and cookie values never reach stdout or stderr |
| `waitFor` hidden-state or `networkidle` quirks make the negative check hang or pass vacuously | L | M | The decision is the visible wait with a fixed timeout; `networkidle` is best-effort only and caught; the page must still be open and on an allowed host when absence is concluded |
| research-codebase hit its scope cap, so test line ranges are second-hand | M | L | Mandatory Reading marks them `per research-codebase`; the Implementer opens the ranges before editing and VALIDATE runs the real files |
| The headed login still has no route guard (F5) | H | L | Out of scope by instruction; recorded in NOT Building and Notes |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework. (The Task 7
  harness is a runnable evidence script outside every test glob; the
  Task 1-6 VALIDATE blocks also run the existing corpus files as
  regression pins, which they only read.)
- **Test-pair fixture contract (for `/relay-write-test`):** the permanent regression for AC-A1 through AC-A5 and AC-A9 is a new `node:test` file built on the same super-ensino shape as the Task 7 harness, using the repository's established helpers — in-process `createServer` on `127.0.0.1:0` plus a second loopback port for the protected API, the login script run through an async `spawn` (never a sync child spawn beside an in-process server, which blocks the event loop and yields `TARGET_UNREACHABLE`), `os.tmpdir()` called inside Node, markers that carry text (a zero-size element never satisfies a visible wait), and no `{ skip }` (Chromium is installed and the corpus already depends on it). Shorten the windows by mutating the two timing literals with the `mutatedTemplate(anchor, replacement)` pattern already used in `auth-static-token-indexeddb.test.mjs`, never through an environment knob that could weaken the shipped proof. Cover: HTTP negative control halt, a token-only `api` role that saves and reuses (and halts when the probe ignores the token), browser probe save and reuse, role-marker halt, marker-for-everyone halt, tamper-to-expired re-login, an unloadable page, a `static-token` role with a browser probe, the three named blocked reasons in `qa-run.mjs`, and mutation tests for the presence-versus-absence window relation.
- **Design choices worth review:** (1) `FAILED_PROBE_PAGE_UNLOADABLE` is the one halt name this plan adds beyond the PRD's two, because the brief requires that a page that fails to load be a halt rather than an absence. (2) A declared `browserProbe` replaces the HTTP probe for `form`/`api`/`headed` rather than adding to it; `static-token` runs both. (3) A new positive pre-save check now applies to every non-static-token mechanism (AC-20 demands both directions on save); it presents the session as the runner will (cookies plus the token header, `Authorization: Bearer <token>` unless the artifact names a header), so a token-only `api` role is proven and saved, never halted. (4) A positive-side non-2xx (with the session) is treated as `expired`: on save it prints `FAILED_LOGIN_REJECTED`, on reuse it re-logs in and then hits the same line if the fresh login also fails; this is accepted over a more precise halt, because a 4xx with a valid-looking session cannot be told apart from rejected credentials.
- **Finding F5 (recorded, not fixed):** `loginHeaded` has no route guard. Findings F14 (bare `textContent` read) and F17 (wrong account saved under a role) are addressed here by the visible wait and the role marker.
- **Fixture traps carried forward:** none of the traps listed in the test-pair contract above apply to the shipped template, but the harness obeys them too.
- **No Bash in the planning run:** this plan was authored without the ability to execute commands, so no VALIDATE command has been run against the unmodified tree; their fail-before behavior is by construction (each starts from a grep or a file that does not yet exist) and should be re-confirmed by `plan-reviewer` or at implement time.

*Generated: 2026-10-04*
*Approved: 2026-10-04*
*Status: IMPLEMENTED*
