# Feature: Dogfood corrections (Phase 6 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact change (login template and runner are consumed by the visual track and by every kit project); secret handling (a new token mechanism); shared contract extension (`results.json`, the login config schema); extension of two registered commands
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the binding scope; AC-17/18/19 and Phase 6 are its 2026-10-04 operator-approved extension (PRD Decisions Log row "Dogfood corrections and a revised hypothesis")
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" — `hybrid-code-review` Phase 5 measurement forbids a second variable in the review loop (PRD AC-16)
  - [2026-04-19] Methodology declaration — gating keys are read from `docs/context/methodology.md`, never inferred (`tdd: false`, `test_frameworks: ["node:test"]` => test-after, R-X strict)
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — a static token is a shared secret; it is never printed, never in a report or evidence file
  - "Writing pipeline artifacts under `.claude/`" — nothing is written there
  - "Weakening or deleting tests to make the auto-correction loop turn green" — the Implementer authors zero test files
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from it
- Applicable architectural rules:
  - Interactivity boundary — both touched commands stay standalone and non-interactive past their preconditions
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; the login template stays ONE self-contained file copied with only `__RELAY_ROLE__` substituted
  - Command versus agent separation — `/relay-auth-scripts` owns config generation from an APPROVED model; agents own judgment
  - Local-only guard is a hard failure at every network-touching site (unchanged)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 6: "Dogfood corrections" — Goal: close the three gaps the `praesto-sum` dogfood exposed, before either project is re-run — Success signal: each of AC-17, AC-18 and AC-19 holds against a fixture that reproduces its real-world case, and a `praesto-sum`-shaped report shows its automated-coverage cases resolving from a schema-v1 record while its remaining cases route as before.

## Summary

Three corrections to code that already ships. (1) `/relay-qa-run`'s runner (`plugins/relay/scripts/qa-run.mjs`) resolves a case whose coverage is `automated` from the Test Runner's schema-v1 `record.json` by reading the JUnit artifact the record points at, deciding `pass`/`fail` per cited test file with reason_code `AUTOMATED_EVIDENCE`, and reports those cases separately through a new top-level `record_resolved` count; anything not provable that way routes exactly as before. (2) The kit's login template gains a login-less `static-token` mechanism (declared token source, declared presentation, a with/without-token proof, a named halt when the proof proves nothing), and `/relay-auth-scripts` plus the auth-model template, writer and reviewer name it so the model classifies it from code. (3) Every session-saving `storageState` call carries `{ indexedDB: true }`, with a named halt when the resolved Playwright (below 1.51) cannot capture IndexedDB and the role needs it. `capture.mjs` is not touched; restoration is verified by a Level 3 end-to-end run through the same Playwright call it makes.

## User Story

As the operator running the human validation gate
I want the runner to resolve automated-coverage cases from the Test Runner's own record, and the kit to authenticate a login-less static-token application whose browser keeps its token in IndexedDB
So that a re-run of the dogfood returns driver-executed or record-resolved outcomes instead of 23 `needs-human` entries, and nobody hand-writes a login script outside the approval gate again.

## Problem Statement

The `praesto-sum` dogfood returned 0 automated outcomes on a real 23-case report, and authentication caused none of it. 19 cases had `coverage: automated` with "manual steps" that were to re-run unit tests, and the runner sent all of them to `needs-human`. The project authenticates with ONE shared bearer token and has no login flow, so the kit's template (which knows only `form`, `api`, `headed`) forced a hand-written login script outside the approval gate. Its browser app reads the token from IndexedDB, and the template's three `context.storageState()` calls omit `{ indexedDB: true }`, so a kit session could not authenticate that browser at all.

## Solution Statement

Add a record-resolution step at the top of the runner's per-case routing, add one mechanism branch to the login template that falls through to the template's existing single secret writer, and pass `{ indexedDB: true }` at every save. Each addition is deliberately conservative: a record outside schema v1 is never evidence; a cited file the JUnit artifact does not list is never resolved; a static token the server accepts with and without the header is never saved; an IndexedDB-needing role on an old Playwright never produces a session silently missing its credential.

## Metadata

| Key | Value |
|-----|-------|
| Type | ENHANCEMENT (corrections to shipped phases 3 and 4) |
| Complexity | HIGH — a runner behavior, a login mechanism and a Playwright capability gate, all pinned by existing text-pin tests |
| Systems Affected | `plugins/relay/resources/auth-login.template.mjs`, `plugins/relay/scripts/qa-run.mjs`, `scripts/validate/checks/qa-run-contract.mjs`, `plugins/relay/commands/relay-qa-run.md`, `plugins/relay/commands/relay-auth-scripts.md`, `plugins/relay/resources/auth-model-template.md`, `plugins/relay/agents/auth-model-writer.md`, `plugins/relay/agents/auth-model-reviewer.md`, `plugins/relay/scripts/visual/package.json` (Playwright floor only), `documentation/` |
| Dependencies | Playwright >= 1.51 for IndexedDB capture (the repo root resolves 1.61.1 transitively; NOT declared in the root `package.json`; the plugin's own `scripts/visual/package.json` floor is raised to `^1.51.0` by Task 1); Node >= 18 |
| Estimated Tasks | 8 |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` lines 103-105 (AC-17/18/19), 254-258 (Phase 6) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 72-83, 103-105, 254-258, 279 | AC-17/18/19, the re-based success metrics, the refusal of hand-written records |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 1-45, 136-163, 252-261, 301-327, 357, 376-431, 437-606 | The single file Tasks 1-2 edit: config schema, `incompleteField`, `loadPlaywright`, the three `storageState` save sites, marker order, the single writer |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 131-152, 200-250, 868-878, 883-887, 1148-1190, 1218-1262, 1352-1379 | Case shape (`coverage`, `automated_test_path`), evidence writer, routing entry point, results assembly |
| P0 | `plugins/relay/commands/relay-qa-report.md` | 105-110 | The ONLY statement of the record discovery rule AC-17 must reuse |
| P0 | `plugins/relay/resources/test-output-schema.md` | 24-80, 147-178, 197-224 | Schema v1, the JUnit artifact, the node:test `<testcase file=...>` shape, the record layout |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 40-77 | `validateResults` (accepts unknown top-level keys today) |
| P0 | `scripts/validate/checks/auth-login-template.test.mjs` | 643-664 | The template text pins the edits must keep (read-only for the Implementer) |
| P1 | `plugins/relay/commands/relay-auth-scripts.md` | 143-164 | The only prose rule mapping model evidence to a `mechanism` |
| P1 | `plugins/relay/resources/auth-model-template.md`, `plugins/relay/agents/auth-model-writer.md`, `plugins/relay/agents/auth-model-reviewer.md` | template ~49; writer ~81-94; reviewer R-AM1/R-AM2 | Where "mechanism" is named generically and `static-token` must be added without changing pinned structure |
| P1 | `plugins/relay/commands/relay-qa-run.md` | whole file | Documents the runner; pinned tokens must survive |
| P1 | `documentation/AGENTS.md` | whole file | Binding contract before any `documentation/` edit (Task 8) |
| P1 | `documentation/reference/commands.html`, `documentation/reference/scripts.html`, `documentation/reference/agents.html` | commands 313-347; scripts 207-221; agents 609-625 | The pages Task 8 updates (`#relay-auth-scripts`, `#relay-qa-run`, `#qa-run`, `#auth-model-writer`, `#auth-model-reviewer`) |
| P1 | `plugins/relay/scripts/visual/capture.mjs` | 16-32, 108-141 | Read-only: the manifest shape and the `browser.newContext({ storageState })` restore Level 3a runs through |
| P1 | `plugins/relay/scripts/visual/package.json` | 9-13 | The Playwright floor Task 1 raises |

## Patterns to Mirror

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:148-154
  } else if (role.mechanism === 'api') {
    required = required.concat(['api.path', 'api.method', 'api.usernameField', 'api.passwordField']);
  } else if (role.mechanism === 'headed') {
    required = required.concat(['loginPath']);
  } else {
    return `roles.${ROLE}.mechanism`;
  }
```
Copied by Task 2 (the `static-token` branch of `incompleteField`).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:314-326
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
```
Copied by Task 2 (the with/without-token proof and the static-token reuse probe: same-origin URL, `maxRedirects: 0`, dispose in `finally`).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:379-388
    const context = await browser.newContext();
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return guard.isAllowedHost(u.hostname, allowedHosts) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const loginUrl = sameOriginUrl(cfg.baseUrl, role.loginPath);
    if (!loginUrl) return null;
    await page.goto(loginUrl);
```
Copied by Task 2 (the guarded browser context a static-token browser role uses to open the application origin).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:593-604
  writeSecret(root, SESSION_REL, `${JSON.stringify(state, null, 2)}\n`);
  if (token !== null) {
    const exp = jwtExp(token);
    const expiresAt = exp !== null ? new Date(exp * 1000) : new Date(Date.now() + role.maxAgeMinutes * 60000);
    writeSecret(
      root,
      TOKEN_REL,
      `${JSON.stringify({ token, expires_at: expiresAt.toISOString(), obtained_at: new Date().toISOString() }, null, 2)}\n`,
    );
  }
  process.stdout.write(`SESSION_CREATED: ${SESSION_REL}\n`);
  process.stdout.write(`auth_mode: storage-state:${SESSION_REL}\n`);
```
Copied by Task 2 (the static-token branch only sets `state` and `token`; this existing single write site persists them and gains `header`/`value_prefix` fields for a static-token role).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1148-1152
async function executeCase(ctxOrNull, kase, planByIndex, target, makeCtx) {
  const p = planByIndex.get(kase.index);
  if (!p) return { result: needsHuman('NO_PLAN_ENTRY', 'no plan entry covers this case; the manual steps are reproduced verbatim'), driver: null, role: null };
  const driver = isStr(p.driver) ? p.driver : null;
  const role = isStr(p.role) ? p.role : null;
```
Copied by Task 3 (record resolution is inserted at the top of `executeCase`, before `planByIndex.get`; the fall-through is this unchanged path).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:874-878
function writeEvidence(ctx, name, payload) {
  const abs = join(ctx.runDirAbs, 'evidence', name);
  writeRunFile(ctx, abs, payload);
  return `${ctx.runDirRel}/evidence/${name}`;
}
```
Copied by Task 3 (the ONLY way the new evidence file is written; no new `writeFileSync(`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1352-1353
    /** @type {Record<string, number>} */ const counts = { pass: 0, fail: 0, blocked: 0, 'needs-human': 0 };
    for (const e of entries) counts[e.outcome]++;
```
Copied by Task 3 (`counts` stays the four-outcome partition; `record_resolved` is a sibling key computed from the same `entries`).

```
# SOURCE: plugins/relay/commands/relay-qa-report.md:107
Before inferring automated coverage from repo test files, check whether `PRPs/reports/<feature>/record.json` (or, when a Test Runner session produced multiple attempts, the latest `PRPs/reports/<feature>/attempts/<N>/record.json`) exists:
```
Copied by Task 3 (the record discovery rule, implemented once in code; nothing implements it today).

```
# SOURCE: scripts/validate/checks/qa-run-contract.mjs:58-61
  if (cases !== null) {
    const counts = obj.counts && typeof obj.counts === 'object' ? obj.counts : {};
    const sum = OUTCOME_VALUES.reduce((n, k) => n + (Number.isInteger(counts[k]) ? counts[k] : 0), 0);
    if (sum !== cases.length) msgs.push(`cases.length (${cases.length}) does not equal the sum of counts (${sum})`);
```
Copied by Task 4 (the `record_resolved` consistency finding follows the same `msgs.push` shape).

```
# SOURCE: plugins/relay/commands/relay-auth-scripts.md:152-154
- `mechanism` is `headed` when the role is named under `## Non-Automatable Items`
  for SSO or MFA, `api` when `## Login Flow` names a scriptable API login
  endpoint, otherwise `form`.
```
Copied by Task 6 (the `static-token` derivation rule is added beside it).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:883-887
DRIVERS.http = async (ctx, kase, plan, session) => {
  const target = ctx.target;
  /** @type {any} */ const opts = { baseURL: target.origin };
  if (session && session.path) opts.storageState = session.path;
  if (session && session.token) opts.extraHTTPHeaders = { Authorization: `Bearer ${session.token}` };
```
Copied by Task 3 (line 887 only: use the artifact's declared `header` and `value_prefix` when present, else today's `Authorization: Bearer`).

```
# SOURCE: documentation/changelog.html:31-35 (blank lines between elided)
      <h2 id="unreleased">Unreleased</h2>
      <p>Nothing yet.</p>
      <h2 id="v0-40-0">0.40.0 &#8212; 2026-10-02</h2>
```
Copied by Task 8 (the new entry goes under the `Unreleased` heading in place of `Nothing yet.`, using the file's `<h3 id="...-added|changed|fixed">` plus `<ul><li>` structure shown under the 0.40.0 heading at lines 49-117).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/auth-login.template.mjs` | UPDATE | `{ indexedDB: true }` at every save, the Playwright-version gate, the `static-token` mechanism (Tasks 1-2) |
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | Record discovery, schema-v1 validation, test-path extraction, JUnit reading, `AUTOMATED_EVIDENCE` resolution, `record_resolved`, header from a static-token artifact (Task 3) |
| `scripts/validate/checks/qa-run-contract.mjs` | UPDATE | `validateResults` checks `record_resolved` against the `AUTOMATED_EVIDENCE` entries (Task 4) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | Document record resolution and the separate count (Task 5) |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | Derive `static-token` configs from an APPROVED model; list the new halts (Task 6) |
| `plugins/relay/resources/auth-model-template.md` | UPDATE | Name `static-token` in the mechanism and login-flow guidance, within the existing nine sections (Task 7) |
| `plugins/relay/agents/auth-model-writer.md` | UPDATE | Discovery bullet that classifies a login-less shared token from code (Task 7) |
| `plugins/relay/agents/auth-model-reviewer.md` | UPDATE | R-AM1/R-AM2 wording accepts `static-token` evidence and its declared presentation (Task 7) |
| `documentation/changelog.html` | UPDATE | Mandatory changelog entry for any `documentation/` change, under the `Unreleased` heading (Task 8) |
| `plugins/relay/scripts/visual/package.json` | UPDATE | Raise the `playwright` floor from `^1.47.0` to `^1.51.0` so the copy `capture.mjs` imports can restore IndexedDB (Task 1); `capture.mjs` itself stays byte-identical |
| `documentation/reference/commands.html` | UPDATE | Sections `#relay-qa-run` and `#relay-auth-scripts` (and `#relay-auth-setup` if it names mechanisms): record resolution, `record_resolved`, the `static-token` mechanism (Task 8) |
| `documentation/reference/scripts.html` | UPDATE | Section `#qa-run`: record resolution, `AUTOMATED_EVIDENCE`, the separate `record_resolved` count (Task 8) |
| `documentation/reference/agents.html` | UPDATE | Sections `#auth-model-writer` and `#auth-model-reviewer`: `static-token` classification (Task 8) |

No dedicated page exists for `/relay-qa-run` or the auth kit and none is added (`documentation/AGENTS.md` section 2 invariant 7 would then require NAV plus search-index registration); NAV and search index are untouched.

No row targets a test file.

## NOT Building (Scope Limits)

- Any change to `code-reviewer`, `code-reviewer-semantic`, `/relay-implement` or `plugins/relay/scripts/visual/capture.mjs` (PRD AC-16 and the frozen `auth_mode` contract).
- Any leniency for hand-written run records: a record outside schema v1 is refused, as the PRD records deliberately.
- A CLI driver that re-runs a case's tests — AC-17 reads the Test Runner's record instead.
- A fifth outcome value: `AUTOMATED_EVIDENCE` is a reason_code, never an outcome.
- Editing `qa-report.md` or any Manual status; invoking either command from `/relay-execute`.
- Cookie-bearing or multi-location static tokens: one declared HTTP header plus at most one browser location per role. A role needing two browser locations is out of scope.
- A plugin version bump or a release (0.41.0 is a separate step after the phase passes), and any change to `package.json`.
- Re-running the two dogfood projects (Phase 5).

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/resources/auth-login.template.mjs` — IndexedDB in every saved session

- **ACTION**: Delivers AC-A7 and AC-A8. Change each of the three existing session-saving calls (`loginApi` `ctx.storageState()`, `loginForm` and `loginHeaded` `context.storageState()`) to pass `{ indexedDB: true }`, written literally as `storageState({ indexedDB: true })` (Playwright below 1.51 ignores the unknown option, so passing it is harmless when a role does not need it). Add an optional config field `needsIndexedDb` (boolean, default false) to the JSDoc config header. Add a helper `needsIndexedDb(role)` that is true when `role.needsIndexedDb === true` or when `role.mechanism === 'static-token'` and `role.staticToken.browser.kind === 'indexedDB'` (Task 2 supplies that shape). Make `loadPlaywright` remember the `package.json` base that resolved (a module-level `let pwBase = null`), and add `playwrightVersion()` that reads `createRequire(pwBase)('playwright/package.json').version` and `indexedDbSupported()` that is true only when it parses to major > 1 or major 1 with minor >= 51; an unreadable version is unsupported (fail closed). Extend `requirePlaywright` so that, after a non-null Playwright, if `needsIndexedDb(role)` and not `indexedDbSupported()` it writes `FAILED_INDEXEDDB_UNSUPPORTED: the resolved Playwright cannot capture IndexedDB (needs >= 1.51); nothing was saved` through `err(...)` and returns null (callers already `return 1`). The gate runs before any login, so it is not swallowed by the per-function try/catch that maps failures to `FAILED_LOGIN_REJECTED`. Do NOT write the marker comments `// GUARD-SITE`, `// SECRECY-SITE` or `// WRITE-SITE` anywhere new (each must stay exactly once), do not add a second `writeFileSync(`, and keep `maxRedirects: 0` (>= 2 occurrences), `mode: 0o600`, `renameSync(tmp, dest)`, `u.origin === base.origin`, `FAILED_GUARD_UNAVAILABLE` and the run order guard, secrecy, reuse, credentials, write untouched. Version floor of the copy `capture.mjs` uses: the template resolves Playwright from the project root first, but `capture.mjs` imports the plugin's own copy, so also edit `plugins/relay/scripts/visual/package.json` and change `"playwright": "^1.47.0"` to `"playwright": "^1.51.0"` (a plugin asset change, not a `capture.mjs` change; `capture.mjs` stays byte-identical). Otherwise a 1.47-1.50 install would silently drop IndexedDB on restore and AC-A7's "through `capture.mjs`" could fail without a sound.
- **MIRROR**: Patterns to Mirror — `plugins/relay/resources/auth-login.template.mjs:314-326` (lazy `getPlaywright`/`requirePlaywright` usage) and the `incompleteField` snippet for the config-driven branch style.
- **VALIDATE**:
  ```
  set -euo pipefail
  F=plugins/relay/resources/auth-login.template.mjs
  node --check "$F"
  test "$(grep -c 'storageState({ indexedDB: true })' "$F")" -ge 3
  if grep -nE 'storageState\((\)|[^{])' "$F"; then echo "FAIL: a storageState( call without the indexedDB option"; exit 1; fi
  grep -q 'FAILED_INDEXEDDB_UNSUPPORTED' "$F"
  grep -q '"playwright": "\^1\.51\.0"' plugins/relay/scripts/visual/package.json
  test "$(grep -c '// GUARD-SITE' "$F")" -eq 1
  test "$(grep -c '// SECRECY-SITE' "$F")" -eq 1
  test "$(grep -c '// WRITE-SITE' "$F")" -eq 1
  node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs
  ```
  The effect (a saved session restores IndexedDB in a browser context, including through `capture.mjs`) is exercised by Level 3a.

### Task 2: UPDATE `plugins/relay/resources/auth-login.template.mjs` — the `static-token` mechanism

- **ACTION**: Delivers AC-A4 and AC-A5. Document in the JSDoc config header a fourth mechanism `"static-token"` with this role block (every field DECLARED, never guessed): `"staticToken": { "tokenEnv": string | null, "header": string, "valuePrefix": string, "browser": null | { "kind": "localStorage" | "indexedDB", "originPath": string, "key": string, "database": string | null, "store": string | null, "valueField": string | null } }` plus the existing `probe` (the protected endpoint), `maxAgeMinutes`, and optional `needsIndexedDb`. `valuePrefix` may be the empty string; `header` is the HTTP header the API expects (for example `Authorization` with prefix `Bearer `). Extend `incompleteField` with a `static-token` branch (mirroring the `headed` branch) requiring `staticToken.header` and `staticToken.browser` fields by kind: for `localStorage` require `staticToken.browser.originPath` and `staticToken.browser.key`; for `indexedDB` also `staticToken.browser.database` and `staticToken.browser.store`; an unknown `kind` returns `roles.<ROLE>.staticToken.browser.kind`. Token source: a new `resolveStaticToken(root, role)` (a different function name from `resolveCredentials`, so the run-order pin that looks for `resolveCredentials(root, role);` is unaffected) reads the environment variable NAMED by `staticToken.tokenEnv`, else `credentials.json[ROLE].token` from the ignored store; when neither exists and stdin is a terminal it prompts with `readLine(..., false)` (never echoed) and holds the answer in memory only; otherwise it halts `FAILED_CREDENTIALS_UNAVAILABLE`. A prompted token is persisted as `{ token }` through the existing `writeSecret(root, CREDENTIALS_REL, ...)` ONLY AFTER the proof (below) has succeeded, so `FAILED_TOKEN_UNPROVEN`, `FAILED_LOGIN_REJECTED` and `FAILED_TOKEN_LOCATION_UNREACHABLE` leave nothing on disk (`resolveStaticToken` therefore returns the token plus a flag saying it was prompted, and `main` writes the credentials file after the proof and the browser step succeed, immediately before the single session write site). The literal token never appears in a log line, an error message, `process.stdout` or `process.stderr`. In `main`, add `else if (role.mechanism === 'static-token') { ... }` between the `headed` branch and the credentials `else`, so it sends NO login request and skips credential resolution; the branch sets `state` and `token` and FALLS THROUGH to the existing validation and the single existing `writeSecret(root, SESSION_REL` site (the static-token branch must not contain its own write; `sessionCookie` is null for this mechanism, so the existing cookie check is skipped). Proof (a new `proveStaticToken(cfg, role, token, pw)`): same-origin URL via `sameOriginUrl(cfg.baseUrl, role.probe.path)`, `pw.request.newContext()`, request `role.probe.method` twice with `maxRedirects: 0` — once with header `role.staticToken.header` set to `valuePrefix + token`, once with no such header — and dispose in `finally`. Outcomes: 2xx with and non-2xx without is proven; 2xx with and 2xx without halts `FAILED_TOKEN_UNPROVEN: the protected endpoint answered 2xx with and without the token; no session was saved`; non-2xx with the token, a cross-origin probe path, or a request error halts `FAILED_LOGIN_REJECTED` (the existing message). Browser location (only when `staticToken.browser` is non-null): `pw.chromium.launch({ headless: true })`, a context with the same host-guard `context.route` as the form login, open `sameOriginUrl(cfg.baseUrl, browser.originPath)`, run `guard.checkTarget(page.url(), { root })` and refuse a non-local page (nothing saved), then write the token at the declared location through `page.evaluate` with the token passed as an argument. `localStorage`: `localStorage.setItem(key, token)`. `indexedDB`: wait up to 10 seconds for `indexedDB.databases()` to list `database` (the application creates it on load), open it WITHOUT a version, require that `store` exists, and `put(token, key)`; when the store declares a `keyPath`, require `valueField` (else `FAILED_LOGIN_CONFIG_INCOMPLETE: roles.<ROLE>.staticToken.browser.valueField`) and `put({ [keyPath]: key, [valueField]: token })`. If the database or store is absent after the wait, halt `FAILED_TOKEN_LOCATION_UNREACHABLE` naming the declared database and store (never guess a location, never create the database). Then `state = await context.storageState({ indexedDB: true })`. A role with `browser: null` sets `state = { cookies: [], origins: [] }` and makes no `storageState` call. Persist: extend the existing token-artifact object at the existing write site with `header` and `value_prefix` when `role.mechanism === 'static-token'` (expiry stays `jwtExp` else now + `maxAgeMinutes`). Reuse: `main` calls a new `staticTokenReusable(root, cfg, role, getPlaywright)` for a static-token role instead of `sessionReusable` — true only when the session file parses with `cookies` and `origins` arrays, its mtime is younger than `maxAgeMinutes`, the token artifact is readable, and the proof above passes using the token read from that artifact (never printed); `await sessionReusable(` must still appear in `main`, ahead of the first `resolveCredentials(root, role);`. A static-token role whose proof halts writes nothing at all. Preserve every marker, pin and the single writer exactly as in Task 1.
- **MIRROR**: Patterns to Mirror — `auth-login.template.mjs:148-154`, `:314-326`, `:379-388`, `:593-604`.
- **VALIDATE**:
  ```
  set -euo pipefail
  F=plugins/relay/resources/auth-login.template.mjs
  node --check "$F"
  grep -q 'FAILED_TOKEN_UNPROVEN' "$F"
  grep -q 'FAILED_TOKEN_LOCATION_UNREACHABLE' "$F"
  grep -q 'static-token' "$F"
  grep -q 'resolveStaticToken' "$F"
  test "$(grep -c 'writeFileSync(' "$F")" -eq 1
  test "$(grep -c '// GUARD-SITE' "$F")" -eq 1
  test "$(grep -c '// SECRECY-SITE' "$F")" -eq 1
  test "$(grep -c '// WRITE-SITE' "$F")" -eq 1
  # RELAY-FIRST-MATCH-INTENDED: indexOf takes the FIRST occurrence of 'resolveCredentials(root, role);' on purpose; the existing run-order pin is the first call site in main, which must precede the single session write.
  node -e "const t=require('fs').readFileSync('$F','utf8');const i=['guard.checkTarget(cfg.baseUrl',\"'ensure'\",'await sessionReusable(','resolveCredentials(root, role);','writeSecret(root, SESSION_REL'].map(m=>t.indexOf(m));if(i.some(x=>x<0)||i.some((x,k)=>k>0&&x<=i[k-1])){console.error('FAIL: run order '+i.join(','));process.exit(1)}"
  node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs
  ```
  The effect (no login request, with/without proof, a token that reaches IndexedDB and restores) is exercised end to end by Level 3a.

### Task 3: UPDATE `plugins/relay/scripts/qa-run.mjs` — resolve automated-coverage cases from the Test Runner record

- **ACTION**: Delivers AC-A1, AC-A2 and AC-A3. No driver runs for a resolved case; only local files are read (no network, so no guard site is added; do NOT add a `// GUARD-SITE` or `// WRITE-SITE` marker and do NOT add any `writeFileSync(` or `renameSync(`). Add, near the other helpers, these pure/local functions and call them from the top of `executeCase` BEFORE `planByIndex.get(kase.index)`:
  1. **Gate**: only when the case's `coverage`, trimmed, with backticks and asterisks removed and lowercased, equals exactly `automated`. Any other value (`none`, `manual`, `unverified`, `n/a`, null) skips resolution and routes exactly as today.
  2. **Discovery** (`findTestRunnerRecord(root, feature)`): the rule of `relay-qa-report.md:107`, implemented once and NOT altered — that line documents `PRPs/reports/<feature>/record.json` first and, "when a Test Runner session produced multiple attempts, the latest `PRPs/reports/<feature>/attempts/<N>/record.json`". So take the top-level `record.json` if it exists, else the highest-numbered `attempts/<N>/record.json` (numeric `N`, never lexicographic). (`test-output-schema.md` lays out only `attempts/<N>/record.json`; the top-level preference is `/relay-qa-report`'s documented rule and this runner must agree with the report that produced the case list, not invent a different one.) The FIRST candidate that exists is the only one examined; an existing record that fails the next step ends resolution (no fall-through to another record). Absence is not an error: the case routes as before. `feature` is already in scope in `runRun`; pass it to `executeCase` (extend its signature and its single call site).
  3. **Schema v1 gate** (`isSchemaV1Record(rec)`): an object with string `run_id`, integer `attempt` >= 1, string `framework`, `outcome` one of `PASSED`, `FAILED`, `FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED` (`SKIPPED_UPSTREAM_FAILURE` is NOT accepted: that run executed nothing), `counts` with integer `passed`, `failed`, `skipped`, `total` where `total` equals their sum AND `total > 0` (a record whose run executed nothing is refused), an array `failures`, an object `artifacts` with a string `junit_xml` that is an absolute path, and a string `generated_at`. Per the schema's own definition (`test-output-schema.md` line 74), `outcome: PASSED` additionally requires `counts.failed == 0`; a `PASSED` record with failures is inconsistent and refused. A record that is FAILED overall is still valid evidence and may resolve a case whose cited files' testcases all passed — that is correct per-file evidence. Anything else — including a hand-written `outcome: "GREEN"` with no counts, failures or artifacts — is NEVER evidence: do not resolve, do not warn leniently, route as before.
  4. **Cited paths** (`extractTestPaths(field)`): if the field contains backtick spans, the candidates are those spans; otherwise truncate the field at the first ` — `, ` – `, ` - ` or `(` and split on commas, semicolons and whitespace. A candidate counts only when it matches `^[A-Za-z0-9_@.\/\\-]+\.[A-Za-z0-9]{1,5}$`; a span such as `describe("AC-1 …")` after the dash never qualifies (it is not path-like: it contains no `/` outside the quoted prose and the dot-extension shape fails, and it sits in the discarded tail or is a quoted-prose span). Normalize backslashes to `/`, strip a leading `./`, de-duplicate. Zero candidates (including `n/a`, `none`, `-`, TBD) means not resolved. **No silent shrinking of the required set:** a token in the retained part of the field that looks path-like (contains `/` or `\`, or ends in a dot-extension of any length) but fails the qualification regex (for example `login.feature`, an extension longer than 5, or a path containing a space inside a backtick span) makes the whole case NOT resolved; it is never dropped while the remaining paths are resolved. Only text after the truncation point and spans that are plainly prose (containing `(`, `"` or `'`) are discarded.
  5. **JUnit read** (`readJunitTestcases(xmlText)`): no npm dependency. Match every `<testcase` element (self-closing or with a body; attribute values may contain `>` only when quoted, so scan attributes with a quote-aware pattern), reading its `name`, `file` and `classname` attributes and whether its body contains `<failure` or `<error` (failed) or `<skipped` (skipped). Refuse a file larger than 20 MB or unreadable (not resolved). **Artifact freshness:** `statSync` the JUnit file; refuse it (case not resolved) when its mtime is later than the record's own `generated_at` plus a stated slack of 120 seconds (`JUNIT_MTIME_SLACK_MS = 120000`, a named constant) — a later run overwriting a shared path such as `reports/results.xml` must not be credited to the older run — or when `generated_at` does not parse. The artifact's mtime (ISO string) is recorded in the evidence either way (item 7). A testcase belongs to a cited path when its normalized `file` attribute equals the path or ends with `/` + the path; when it has no `file` attribute, its normalized `classname` equals the path or ends with `/` + the path (the Playwright reporter shape). Nothing else matches — a basename-stem guess is never used, because two files may share a stem. **Exactly one distinct file per cited path:** collect the DISTINCT normalized `file`/`classname` values that match a cited path; if there are zero or more than one (for example a bare `a.spec.ts` matching both `e2e/a.spec.ts` and `admin/a.spec.ts`), that cited path is not resolved and the whole case is not resolved — testcases of different files are never merged into one verdict. Older Node versions emit no `file` attribute; those cases are simply not resolved and route as before.
  6. **Decision**: every cited file must have at least one non-skipped matching testcase, otherwise the whole case is not resolved (one unlisted file means not resolved, even if another file failed). When all are listed: any failed testcase in any cited file gives `fail`, else `pass`. Outcome reason_code is `AUTOMATED_EVIDENCE` for both. A skipped-only file counts as unlisted.
  7. **Evidence and reason**: write ONE evidence file through `writeEvidence(ctx, 'case-<index>.record.json', { kind: 'json', value })` (the ctx comes from `makeCtx()`; only `runDirAbs`, `runDirRel` and `table` are used) with `value` = `{ resolved_from: 'test-runner-record', record: <repo-relative path to record.json>, record_run_id, record_attempt, record_generated_at, junit_artifact: <the record's junit_xml path>, junit_artifact_mtime: <ISO string>, files: [{ cited, testcases, failed: [<test names only>] }] }`. Failure messages and stacks are NOT copied (they can carry secrets); `redaction` still applies through `writeRunFile`. The returned `evidence` array is `[<that path>]`. The entry's `reason` names the record path, run id, attempt and `generated_at` and states the count of testcases, so a reader can see whether the run predates the code (for example `resolved from PRPs/reports/<feature>/record.json (run <run_id>, attempt <n>, generated <generated_at>); <k> test case(s) in <m> file(s), none failed`). If the evidence write throws, return `blocked('EVIDENCE_WRITE_FAILED', ...)` — never a pass without evidence. `driver` and `role` are null for a resolved case. A plan entry for the same case is ignored once the case resolves.
  8. **results.json**: add a top-level `record_resolved` integer equal to the number of `entries` whose `reason_code === 'AUTOMATED_EVIDENCE'`, next to `counts` (the four-key partition is unchanged and still sums to the case count, so record-resolved cases are INSIDE `counts.pass`/`counts.fail`). Because of that, the runner's summary line and the driver-executed rate MUST EXCLUDE `AUTOMATED_EVIDENCE` outcomes: compute the driver-executed pass/fail figures as the `counts` values minus the record-resolved cases of that outcome, and print `record-resolved=<n>` on a separate line beside them, never folded into the pass/fail line (the PRD re-based its 60% metric on exactly this distinction; `record_resolved` is reported beside the driver-executed numbers, never added to them).
  9. **HTTP header**: change ONLY line 887 so the driver uses `session.header` and `session.value_prefix` when the token artifact carries them, else today's `Authorization: Bearer <token>`; read `obtainSession` first and thread the two optional fields into the session info beside `token`. Do not touch the `return { outcome: 'pass', reason_code: null, reason: null, evidence };` tail of `DRIVERS.http`, `writeFileSync(tmp, data);`, or any `outcome: '<x>'` literal outside the four allowed values (the contract check scans for them). Update the file's JSDoc header (Drivers paragraph) to mention record resolution.
- **MIRROR**: Patterns to Mirror — `qa-run.mjs:1148-1152`, `:874-878`, `:1352-1353`, `:883-887`, and `plugins/relay/commands/relay-qa-report.md:107`.
- **VALIDATE**:
  ```
  set -euo pipefail
  F=plugins/relay/scripts/qa-run.mjs
  node --check "$F"
  grep -q 'AUTOMATED_EVIDENCE' "$F"
  grep -q 'record_resolved' "$F"
  grep -q 'isSchemaV1Record' "$F"
  test "$(grep -c 'writeFileSync(' "$F")" -eq 1
  test "$(grep -c 'renameSync(' "$F")" -eq 1
  node --test scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run.test.mjs
  ```
  The effect (pass, fail, unresolved and refused-record routing through a real run) is exercised by Level 3b.

### Task 4: UPDATE `scripts/validate/checks/qa-run-contract.mjs` — pin `record_resolved`

- **ACTION**: Delivers AC-A3 (the contract side) and preserves AC-A9 (the closed vocabulary). In `validateResults`, after the counts partition check, add: when `obj.record_resolved` is present it must be an integer >= 0 equal to the number of cases with `reason_code === 'AUTOMATED_EVIDENCE'`, and every such case must have outcome `pass` or `fail` (message: `record_resolved (<n>) does not equal the number of AUTOMATED_EVIDENCE cases (<m>)`, and `cases[<i>] carries AUTOMATED_EVIDENCE with outcome <x>`). Absence of the key stays valid, so older results trees still validate; do not change the closed outcome vocabulary, `OUTCOMES_LITERAL`, or any existing message. Do not edit the test file.
- **MIRROR**: Patterns to Mirror — `scripts/validate/checks/qa-run-contract.mjs:58-61`.
- **VALIDATE**:
  ```
  set -euo pipefail
  F=scripts/validate/checks/qa-run-contract.mjs
  node --check "$F"
  grep -q 'record_resolved' "$F"
  node --input-type=module -e "import { validateResults } from './$F'; const base={started_at:'2026-10-04T10:00:00.123Z',finished_at:'2026-10-04T10:00:01.123Z',human_gate:{status:'open'},counts:{pass:1,fail:0,blocked:0,'needs-human':0},cases:[{outcome:'pass',reason_code:'AUTOMATED_EVIDENCE',started_at:'2026-10-04T10:00:00.123Z',finished_at:'2026-10-04T10:00:00.456Z',evidence:['e']}]}; if(validateResults({...base,record_resolved:1}).length!==0){console.error('FAIL: a consistent record_resolved was rejected');process.exit(1)} if(validateResults({...base,record_resolved:0}).length===0){console.error('FAIL: an inconsistent record_resolved was accepted');process.exit(1)}"
  node --test scripts/validate/checks/qa-run-contract.test.mjs
  ```

### Task 5: UPDATE `plugins/relay/commands/relay-qa-run.md` — document record resolution

- **ACTION**: Delivers AC-A1, AC-A2 and AC-A3 (the command side). Add a short subsection to the command's routing phase stating, in the command's own voice: an `automated`-coverage case is first checked against the Test Runner's schema-v1 record using the discovery rule of `/relay-qa-report`; the outcome comes from the JUnit testcases of each cited test file (all listed, none failed gives `pass`; any failed gives `fail`; any unlisted means not resolved); the reason_code is `AUTOMATED_EVIDENCE`, which is a reason_code and not an outcome; a record outside schema v1 is never evidence and the case routes as before; the evidence names the record's run; the `record_resolved` count is reported separately from driver-executed outcomes — `counts` stays the four-outcome partition and therefore still contains the record-resolved cases, so the runner's summary line and the driver-executed rate exclude `AUTOMATED_EVIDENCE` outcomes and `record_resolved` is reported beside them, never added to them; a record that executed nothing (`SKIPPED_UPSTREAM_FAILURE` or zero tests), a JUnit artifact written after the record, and a cited path matching more than one distinct file are never evidence. Keep the vocabulary line `pass`, `fail`, `blocked`, `needs-human`. The file MUST still contain `HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET` and `qa-run.mjs`, and MUST NOT contain `design-spec`, `relay-auth-setup`, `.claude/PRPs` or `subagent_type`.
- **MIRROR**: Patterns to Mirror — `plugins/relay/commands/relay-qa-report.md:107` (discovery-rule wording) and the command's existing routing-phase prose.
- **VALIDATE**:
  ```
  set -euo pipefail
  F=plugins/relay/commands/relay-qa-run.md
  grep -q 'AUTOMATED_EVIDENCE' "$F"
  grep -q 'record_resolved' "$F"
  grep -q 'HUMAN GATE STILL OPEN' "$F"
  grep -q 'FAILED_NON_LOCAL_TARGET' "$F"
  if git diff --unified=0 1e34a97 -- "$F" | grep -E "^\+[^+]" | grep -E 'design-spec|relay-auth-setup|\.claude/PRPs|subagent_type' | grep -qv "MUST NOT appear"; then
    echo "FAIL: a banned token was introduced outside a quoted prohibition"; exit 1
  else
    echo "PASS: no banned token introduced"
  fi
  node --test scripts/validate/checks/qa-run-contract.test.mjs
  ```

### Task 6: UPDATE `plugins/relay/commands/relay-auth-scripts.md` — generate `static-token` configs

- **ACTION**: Delivers AC-A6 (command side). In Phase A's `mechanism` derivation (the bullet at lines 152-154) add: `static-token` when the APPROVED model's `## Login Flow` or `## Authentication Mechanisms` names a shared static token with no login request. Add a bullet stating that for a `static-token` role the `staticToken` block is filled only from the model's evidence: `tokenEnv` is an environment-variable NAME taken from `## Session and Token Model` (else null), `header` and `valuePrefix` from where the API expects the token, `browser` from the declared storage location (`localStorage`, or `indexedDB` with the declared database, object store and key) and otherwise null; every field the model does not state is the literal `TBD - needs validation`, never a guess. List the three new halts in the command's halt vocabulary only if the command lists script halts (otherwise leave a single sentence naming `FAILED_TOKEN_UNPROVEN`, `FAILED_TOKEN_LOCATION_UNREACHABLE` and `FAILED_INDEXEDDB_UNSUPPORTED` as the generated script's own halts). Do NOT alter precondition P2 (`FAILED_AUTH_MODEL_NOT_APPROVED`), the `**The only files written**` bullet (exactly `credentials.example.json`, `login-<role>.mjs` and `login.config.json`), the sentences `Edit the script template while copying it.` and `Never ask the user a question.`, or the one-substitution sentence. Do not add `/relay-qa-run`, `relay-auth-setup`, `design-spec`, `.claude/PRPs` or `--local-host` anywhere in the file.
- **MIRROR**: Patterns to Mirror — `plugins/relay/commands/relay-auth-scripts.md:152-154`.
- **VALIDATE**:
  ```
  set -euo pipefail
  F=plugins/relay/commands/relay-auth-scripts.md
  grep -q 'static-token' "$F"
  grep -q 'FAILED_AUTH_MODEL_NOT_APPROVED' "$F"
  grep -q 'Edit the script template while copying it.' "$F"
  grep -q 'Never ask the user a question.' "$F"
  if git diff --unified=0 1e34a97 -- "$F" | grep -E "^\+[^+]" | grep -E '/relay-qa-run|relay-auth-setup|design-spec|\.claude/PRPs|--local-host' | grep -qv "MUST NOT appear"; then
    echo "FAIL: a banned token was introduced outside a quoted prohibition"; exit 1
  else
    echo "PASS: no banned token introduced"
  fi
  node --test scripts/validate/checks/auth-scripts-command.test.mjs
  ```

### Task 7: UPDATE the auth-model template, writer and reviewer — name `static-token`

- **ACTION**: Delivers AC-A6 (model side). Edit TEXT inside existing sections only; never add or rename a heading, a rubric id or a tool. In `plugins/relay/resources/auth-model-template.md`, in the `## Authentication Mechanisms` guidance and the `## Login Flow` guidance, name `static-token` as a recognized mechanism (a shared secret presented by the client with no login request) and say the model must record where the client presents it (an HTTP header; for browser use `localStorage` or IndexedDB with the declared database, object store and key) and the token's source as an environment-variable NAME. In `plugins/relay/agents/auth-model-writer.md`, in the discovery protocol, add one bullet instructing the writer to look for a middleware or guard that compares a request header against a single configured secret with no login endpoint, and for client code that reads the token from `localStorage` or IndexedDB, and to record them with `file:line` evidence; the writer still reads no secret files and records variables by name only. In `plugins/relay/agents/auth-model-reviewer.md`, widen R-AM1 and R-AM2 wording so a `static-token` mechanism with its presentation location and evidence satisfies them, and state that a model naming a token VALUE still fails R-AM6. Pinned and therefore unchanged: the template has exactly nine `## ` headings after `## Skeleton`; the reviewer rubric is exactly `- **R-AM1**` through `- **R-AM7**` once each and in order; reviewer tools are exactly `Read, Edit, Write` and contain no `date -u`; writer tools are exactly `Read, Write, Edit, Glob, Grep`.
- **MIRROR**: Patterns to Mirror — `plugins/relay/commands/relay-auth-scripts.md:152-154` (mechanism vocabulary) and each file's own neighbouring bullets for phrasing.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q 'static-token' plugins/relay/resources/auth-model-template.md
  grep -q 'static-token' plugins/relay/agents/auth-model-writer.md
  grep -q 'static-token' plugins/relay/agents/auth-model-reviewer.md
  test "$(grep -c -E '^- \*\*R-AM[1-7]\*\*' plugins/relay/agents/auth-model-reviewer.md)" -eq 7
  node --test scripts/validate/checks/auth-model-pair.test.mjs
  ```

### Task 8: UPDATE `documentation/` — pages and changelog

- **ACTION**: Delivers the documentation obligation of AC-A1 through AC-A8 and keeps AC-A9 (no plugin.json change, no credential value in any documentation page). Read `documentation/AGENTS.md` first (the binding contract: invariants, page template, the three-file registration rule, halt conditions). Update only the prose this phase changes, in exactly these pages (no dedicated page exists for `/relay-qa-run` or the auth kit, so no NAV or search-index change is needed): `documentation/reference/commands.html` (`#relay-qa-run`: record resolution, `AUTOMATED_EVIDENCE`, `record_resolved`; `#relay-auth-scripts`: the `static-token` mechanism, its declared `staticToken` config and the IndexedDB / Playwright >= 1.51 requirement), `documentation/reference/scripts.html` (`#qa-run`: record resolution and the separate `record_resolved` count), and `documentation/reference/agents.html` (`#auth-model-writer`, `#auth-model-reviewer`: classifying a login-less shared token as `static-token`). Add an entry to `documentation/changelog.html` under the `Unreleased` heading (replacing `Nothing yet.`) that mentions `static-token`, `record_resolved` and IndexedDB. Do not change `docs/` (the docs-updater pair owns knowledge-base sync), do not bump `plugins/relay/.claude-plugin/plugin.json`, and do not cut a release. If `documentation/AGENTS.md` makes a page registration (NAV plus search index plus changelog) necessary, follow it; add no new page unless the contract requires one.
- **MIRROR**: Patterns to Mirror — `documentation/changelog.html:31-35` (the `Unreleased` heading and the heading structure of the latest entry) and each page's own neighbouring section markup.
- **VALIDATE**:
  ```
  set -euo pipefail
  grep -q 'static-token' documentation/changelog.html
  grep -q 'record_resolved' documentation/changelog.html
  git diff --name-only 1e34a97 -- documentation | grep -q 'documentation/changelog.html'
  git diff --name-only 1e34a97 -- documentation | grep -q 'documentation/reference/commands.html'
  git diff --name-only 1e34a97 -- documentation | grep -q 'documentation/reference/scripts.html'
  if git diff --name-only 1e34a97 -- plugins/relay/.claude-plugin/plugin.json | grep -q .; then echo "FAIL: plugin.json was changed"; exit 1; fi
  npm run validate
  ```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --check plugins/relay/resources/auth-login.template.mjs
node --check scripts/validate/checks/qa-run-contract.mjs
grep -q 'AUTOMATED_EVIDENCE' plugins/relay/scripts/qa-run.mjs
grep -q 'FAILED_TOKEN_UNPROVEN' plugins/relay/resources/auth-login.template.mjs
if grep -nE 'storageState\((\)|[^{])' plugins/relay/resources/auth-login.template.mjs; then echo "FAIL: a storageState( call without the indexedDB option"; exit 1; fi
```

### Level 2 — CONTENT_INVARIANTS and UNIT_TESTS

Baselines to HOLD once the phase is done: the full corpus 0 fail / 0 skipped and `npm run validate` 28 checks / 0 findings (on the clean tree the corpus is 1304 tests; the test pair adds more). No existing test is expected to break: every pin the research found (the three markers once each and in order, `maxRedirects: 0` twice or more, one `writeFileSync(`, the run order, the nine template headings, `R-AM1`..`R-AM7`, the `DRIVERS.http` tail anchor) is preserved by design. If one does break, that signals an unintended contract change — fix the implementation, never the test. This block deliberately tolerates no failing test, named or otherwise. **Stuck-Implementer rule:** if a test fails because of a DELIBERATE contract change, the Implementer halts, names the test, and hands it to the test pair as `EXISTING_TEST_UPDATED`; it does not weaken the implementation to keep the test green and it does not edit the test (R-X).

```
set -euo pipefail
T=plugins/relay/resources/auth-login.template.mjs
grep -q 'FAILED_INDEXEDDB_UNSUPPORTED' "$T"
grep -q 'FAILED_TOKEN_LOCATION_UNREACHABLE' "$T"
test "$(grep -c 'storageState({ indexedDB: true })' "$T")" -ge 4
test "$(grep -c '// GUARD-SITE' "$T")" -eq 1
test "$(grep -c '// SECRECY-SITE' "$T")" -eq 1
test "$(grep -c '// WRITE-SITE' "$T")" -eq 1
grep -q 'static-token' plugins/relay/commands/relay-auth-scripts.md
grep -q 'static-token' plugins/relay/resources/auth-model-template.md
grep -q 'static-token' plugins/relay/agents/auth-model-writer.md
grep -q 'static-token' plugins/relay/agents/auth-model-reviewer.md
grep -q 'AUTOMATED_EVIDENCE' plugins/relay/commands/relay-qa-run.md
grep -q 'record_resolved' scripts/validate/checks/qa-run-contract.mjs
if [ -n "$(git diff --name-only 1e34a97 -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen review-loop or capture file changed"; exit 1
fi
if git diff --unified=0 1e34a97 -- plugins scripts documentation | grep -E '^\+[^+]' | grep '\.claude/PRPs' | grep -qv 'MUST NOT appear'; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
node --test "scripts/validate/**/*.test.mjs"
npm run validate
```

### Level 3 — INTEGRATION (end to end)

Both blocks build their projects under `os.tmpdir()` inside Node, never `/tmp`. The HTTP fixture in 3a is served from the same process that spawns the template, so every child is started with the ASYNC `spawn` / `execFile` (a sync child would block the event loop and surface as an unreachable target). 3a needs Chromium (`npx playwright install chromium` in `plugins/relay/scripts/visual/` if absent); a missing browser fails the block loudly. Each block fails on the unmodified tree.

**3a — AC-A4, AC-A5, AC-A7: static token, IndexedDB capture and restoration**

```
set -euo pipefail
node --input-type=module -e '
import http from "node:http";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
const execFileP = promisify(execFile);
const PLUGIN = resolve("plugins/relay");
const TOKEN = "tok-e2e-123";
let open = false;
const html = "<!doctype html><p id=s>loading</p><script>const r=indexedDB.open(\"appdb\",1);r.onupgradeneeded=()=>r.result.createObjectStore(\"kv\");r.onsuccess=()=>{const g=r.result.transaction(\"kv\").objectStore(\"kv\").get(\"token\");g.onsuccess=()=>{const a=g.result===\"" + TOKEN + "\";document.getElementById(\"s\").textContent=a?\"authenticated\":\"anonymous\";if(a){const m=document.createElement(\"i\");m.id=\"authed\";document.body.appendChild(m)}}}<\/script>";
const srv = http.createServer((q, s) => {
  if (q.url === "/") { s.statusCode = 200; return s.end("ok"); }
  if (q.url === "/app") { s.setHeader("content-type", "text/html"); return s.end(html); }
  const ok = open || q.headers["x-api-key"] === TOKEN;
  s.statusCode = ok ? 200 : 401;
  s.end("{}");
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + srv.address().port;
const role = { mechanism: "static-token", loginPath: null, form: null, api: null, probe: { path: "/api/me", method: "GET" }, sessionCookie: null, maxAgeMinutes: 60, credentials: { usernameEnv: null, passwordEnv: null }, userCreation: { command: null }, staticToken: { tokenEnv: "QA_E2E_TOKEN", header: "x-api-key", valuePrefix: "", browser: { kind: "indexedDB", originPath: "/app", database: "appdb", store: "kv", key: "token", valueField: null } } };
async function project() {
  const d = mkdtempSync(join(tmpdir(), "relay-e2e-"));
  await execFileP("git", ["init", "-q", d]);
  mkdirSync(join(d, "PRPs", "auth"), { recursive: true });
  const tpl = readFileSync(join(PLUGIN, "resources", "auth-login.template.mjs"), "utf8").replaceAll("__RELAY_ROLE__", "dev");
  writeFileSync(join(d, "PRPs", "auth", "login-dev.mjs"), tpl);
  writeFileSync(join(d, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: base, roles: { dev: role } }));
  return d;
}
function run(d, extra = []) {
  return new Promise((res) => {
    const c = spawn(process.execPath, [join(d, "PRPs", "auth", "login-dev.mjs"), "--plugin-root", PLUGIN, "--root", d, ...extra], { env: { ...process.env, QA_E2E_TOKEN: TOKEN }, stdio: ["ignore", "pipe", "pipe"] });
    let o = "", e = "";
    c.stdout.on("data", (b) => (o += b));
    c.stderr.on("data", (b) => (e += b));
    c.on("close", (code) => res({ code, o, e }));
  });
}
const d1 = await project();
const r1 = await run(d1);
assert.equal(r1.code, 0, r1.e);
assert.match(r1.o, /SESSION_CREATED/);
assert.ok(!(r1.o + r1.e).includes(TOKEN), "the token was printed");
const sess = join(d1, "PRPs", "auth", ".sessions", "dev.json");
const st = JSON.parse(readFileSync(sess, "utf8"));
assert.ok(st.origins.some((o) => Array.isArray(o.indexedDB) && o.indexedDB.length > 0), "no IndexedDB in the saved state");
assert.ok(existsSync(join(d1, "PRPs", "auth", ".sessions", "dev.token.json")), "no token artifact");
const r2 = await run(d1);
assert.match(r2.o, /SESSION_REUSED/);
const pw = createRequire(join(process.cwd(), "package.json"))("playwright");
const b = await pw.chromium.launch();
const ctx = await b.newContext({ storageState: sess });
const p = await ctx.newPage();
await p.goto(base + "/app");
await p.waitForFunction(() => document.getElementById("s").textContent !== "loading");
assert.equal(await p.textContent("#s"), "authenticated");
await b.close();
const vreq = createRequire(join(PLUGIN, "scripts", "visual", "package.json"));
const [maj, min] = vreq("playwright/package.json").version.split(".").map(Number);
assert.ok(maj > 1 || (maj === 1 && min >= 51), "Playwright resolved from plugins/relay/scripts/visual is below 1.51");
const out = mkdtempSync(join(tmpdir(), "relay-cap-"));
const manifest = join(out, "m.json");
writeFileSync(manifest, JSON.stringify([{ node_id: "1:1", route: "/app", preconditions: "none", auth_mode: "storage-state:" + sess, viewport: { width: 400, height: 300 }, diff_threshold: 0.5, ref_png: "none", masks: [], interaction: "wait(#authed)" }]));
const cap = await new Promise((res) => {
  const c = spawn(process.execPath, [join(PLUGIN, "scripts", "visual", "capture.mjs"), manifest, out, base], { stdio: ["ignore", "pipe", "pipe"] });
  let o = "";
  c.stdout.on("data", (x) => (o += x));
  c.stderr.on("data", (x) => (o += x));
  c.on("close", (code) => res({ code, o }));
});
assert.ok(existsSync(join(out, "1-1.png")), "capture.mjs did not capture an authenticated frame (wait for #authed failed): " + cap.o);
open = true;
const d2 = await project();
const r3 = await run(d2);
assert.equal(r3.code, 1);
assert.match(r3.e, /FAILED_TOKEN_UNPROVEN/);
assert.ok(!existsSync(join(d2, "PRPs", "auth", ".sessions", "dev.json")), "a session was saved without a proof");
assert.ok(!(r3.o + r3.e).includes(TOKEN), "the token was printed");
srv.close();
process.exit(0);
'
```

The restoration is proven twice: with `browser.newContext({ storageState })` directly, and by running `plugins/relay/scripts/visual/capture.mjs` itself on a one-frame manifest whose `interaction` is `wait(#authed)` (the fixture page adds `#authed` only when it reads the token from IndexedDB, so an unauthenticated restore fails the wait and no PNG is written). The block also asserts that the Playwright resolved FROM `plugins/relay/scripts/visual` (the copy `capture.mjs` imports) is >= 1.51, not only the repo root's. `capture.mjs` itself is held byte-identical by the Level 2 boundary check. Note: inside this repo that directory resolves Playwright through the repo root `node_modules`; the raised `^1.51.0` floor in `package.json` is what protects an installed plugin.

**3b — AC-A1, AC-A2, AC-A3: record resolution through a real run**

```
set -euo pipefail
node --input-type=module -e '
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const RUN = resolve("plugins/relay/scripts/qa-run.mjs");
const D = "—";
const cb = (n, title, cov, path) => "### " + n + " " + D + " " + title + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** " + cov + "\n- **Automated test path:** " + path + "\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n";
const tc = (d, f, n, fail) => "<testcase name=\"" + n + "\" classname=\"" + f + "\" file=\"" + join(d, "test", f) + "\" time=\"0.1\">" + (fail ? "<failure type=\"AssertionError\" message=\"boom\"/>" : "") + "</testcase>";
function fixture(rec) {
  const d = mkdtempSync(join(tmpdir(), "relay-qa-"));
  const rd = join(d, "PRPs", "reports", "feat");
  mkdirSync(rd, { recursive: true });
  mkdirSync(join(d, "PRPs", "auth"), { recursive: true });
  writeFileSync(join(d, "PRPs", "auth", "login.config.json"), JSON.stringify({ baseUrl: "http://127.0.0.1:9", roles: {} }));
  writeFileSync(join(rd, "junit.xml"), "<?xml version=\"1.0\"?><testsuites>" + tc(d, "a.test.mjs", "t1", false) + tc(d, "a.test.mjs", "t2", false) + tc(d, "b.test.mjs", "t3", true) + "</testsuites>");
  if (rec !== "overwritten") { const t = new Date("2026-10-01T09:59:00Z"); utimesSync(join(rd, "junit.xml"), t, t); }
  const record = rec === "skipped"
    ? { run_id: "r-2", attempt: 1, tier: "unit", framework: "node:test", outcome: "SKIPPED_UPSTREAM_FAILURE", duration_ms: 0, counts: { passed: 0, failed: 0, skipped: 0, total: 0 }, failures: [], artifacts: { junit_xml: join(rd, "junit.xml") }, generated_at: "2026-10-01T10:00:00+00:00" }
    : (rec === "v1" || rec === "overwritten")
    ? { run_id: "r-1", attempt: 1, tier: "unit", framework: "node:test", outcome: "FAILED", duration_ms: 5, counts: { passed: 2, failed: 1, skipped: 0, total: 3 }, failures: [{ suite: "s", test: "t3", file: "test/b.test.mjs", line: null, message: "boom", stack: null, category: null, raw_framework_output_ref: "b#t3" }], artifacts: { junit_xml: join(rd, "junit.xml") }, generated_at: "2026-10-01T10:00:00+00:00" }
    : { outcome: "GREEN", note: "hand written" };
  writeFileSync(join(rd, "record.json"), JSON.stringify(record));
  writeFileSync(join(rd, "qa-report.md"), "# QA Report\n\n" + cb(1, "All green", "automated", "`test/a.test.mjs` " + D + " describe(\"AC-1\")") + cb(2, "One fails", "automated", "`test/b.test.mjs`") + cb(3, "Unlisted", "automated", "`test/c.test.mjs`") + cb(4, "By hand", "manual", "n/a") + cb(5, "Two files", "automated", "`test/a.test.mjs`, `test/b.test.mjs`"));
  return d;
}
function qa(d) {
  const o = execFileSync(process.execPath, [RUN, "init", "--root", d, "--feature", "feat"], { encoding: "utf8" });
  const dir = /RUN_DIR: (.+)/.exec(o)[1].trim();
  execFileSync(process.execPath, [RUN, "run", "--root", d, "--feature", "feat", "--run-dir", dir], { encoding: "utf8" });
  return JSON.parse(readFileSync(join(d, dir, "results.json"), "utf8"));
}
const by = (r) => r.cases.map((c) => c.outcome + ":" + c.reason_code);
const d1 = fixture("v1");
const good = qa(d1);
assert.deepEqual(by(good), ["pass:AUTOMATED_EVIDENCE", "fail:AUTOMATED_EVIDENCE", "needs-human:NO_PLAN_ENTRY", "needs-human:NO_PLAN_ENTRY", "fail:AUTOMATED_EVIDENCE"]);
assert.equal(good.record_resolved, 3);
assert.equal(good.cases.length, 5);
const evp = join(d1, good.cases[0].evidence[0]);
assert.ok(existsSync(evp), "no evidence file");
const ev = JSON.parse(readFileSync(evp, "utf8"));
assert.match(ev.record, /record\.json$/);
assert.match(ev.junit_artifact, /junit\.xml$/);
assert.equal(ev.record_run_id, "r-1");
const refused = qa(fixture("hand"));
assert.deepEqual(by(refused), ["needs-human:NO_PLAN_ENTRY", "needs-human:NO_PLAN_ENTRY", "needs-human:NO_PLAN_ENTRY", "needs-human:NO_PLAN_ENTRY", "needs-human:NO_PLAN_ENTRY"]);
assert.equal(refused.record_resolved, 0);
for (const kind of ["skipped", "overwritten"]) {
  const r = qa(fixture(kind));
  assert.equal(r.record_resolved, 0, kind + " must not resolve any case");
  assert.ok(r.cases.every((c) => c.reason_code !== "AUTOMATED_EVIDENCE"), kind + " produced an AUTOMATED_EVIDENCE outcome");
}
'
```

## Acceptance Criteria

- **AC-A1 (PRD AC-17):** Given a case with coverage `automated`, a schema-v1 record found by `/relay-qa-report`'s discovery rule, and a JUnit artifact listing every cited test file, the outcome is `pass` when no listed testcase failed and `fail` when any did, with reason_code `AUTOMATED_EVIDENCE`, evidence referencing the record and the artifact by path, and no driver executed.
- **AC-A2 (PRD AC-17):** Given no schema-v1 record, a record without a readable JUnit artifact, a cited file the artifact does not list, a hand-written record outside schema v1 (for example `outcome: "GREEN"`), a record whose run executed nothing (`SKIPPED_UPSTREAM_FAILURE` or `counts.total == 0`) or a `PASSED` record with failures, a JUnit artifact modified later than the record's `generated_at` (plus stated slack), a cited path matching zero or more than one distinct file, or a path-like token that fails qualification, the case is NOT resolved from the record and routes exactly as before.
- **AC-A3 (PRD AC-17):** The cited path is extracted from the `Automated test path` field even with trailing prose or several comma-separated paths; every cited file must be listed (any unlisted means not resolved) and any failing listed file makes the case `fail`; the evidence names the record's run id, attempt and `generated_at`; record-resolved cases are counted separately in `results.json` through `record_resolved`, `counts` remains the four-outcome partition, and `qa-run-contract` validates the two together.
- **AC-A4 (PRD AC-18):** Given a role whose mechanism is `static-token`, with the token from a declared environment-variable name or the ignored credential store and a declared presentation, the login script sends no login request, confirms the token against the protected `probe` endpoint (2xx with it, non-2xx without), writes a token artifact for HTTP use and, for a browser role, a storage-state carrying the token at the declared `localStorage` or IndexedDB location, and prints no part of the token.
- **AC-A5 (PRD AC-18):** When the protected endpoint answers 2xx both with and without the token, the script halts `FAILED_TOKEN_UNPROVEN` and writes no session; a declared IndexedDB database or store that does not exist halts `FAILED_TOKEN_LOCATION_UNREACHABLE` rather than being guessed or created.
- **AC-A6 (PRD AC-18):** `/relay-auth-scripts` generates `static-token` configs from an APPROVED auth-model (precondition `FAILED_AUTH_MODEL_NOT_APPROVED` unchanged), and the auth-model template, writer and reviewer name `static-token` so a model can classify it from code.
- **AC-A7 (PRD AC-19):** Every session-saving `storageState` call carries `{ indexedDB: true }`; for an application keeping its credential in IndexedDB the saved state includes that origin's IndexedDB, and a browser context created from the file through the same Playwright call `capture.mjs` makes is authenticated.
- **AC-A8 (PRD AC-19):** When the resolved Playwright is below 1.51 (or its version cannot be read) and the role needs IndexedDB, the script halts `FAILED_INDEXEDDB_UNSUPPORTED` before any login and saves nothing.
- **AC-A9 (PRD AC-4, AC-16, AC-6):** The outcome vocabulary stays exactly `pass`, `fail`, `blocked`, `needs-human`; `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `capture.mjs` are byte-identical to commit 1e34a97; no credential value appears in any tracked file, report or evidence file.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Older Node versions emit no `file` attribute on `<testcase>`, so many node:test records never resolve | M | Medium: AC-17 changes less than hoped on those projects | By design: an unlisted file is never guessed from a basename stem; the case routes as before. The fallback `classname` match covers the Playwright reporter shape. Recorded as a known limit, not worked around |
| A schema-valid record predates the code under review, so a stale `pass` is read as current | M | High: a false `pass` is the failure this feature exists to prevent | The reason and evidence name the record's run id, attempt and `generated_at`; a runner `pass` stays evidence and the human gate stays open (AC-8, unchanged) |
| Editing `auth-login.template.mjs` breaks one of its many text pins | M | Medium | Task validations run the template and guard-site test files; the run-order pin is kept by falling the static branch through to the existing single write site and by a distinct function name |
| `APIRequestContext.storageState` may not accept `indexedDB` on every supported Playwright | L | Low | Passing an unknown option is ignored below 1.51; Level 3a runs against the resolved 1.61.1. The header-only static-token role makes no `storageState` call at all |
| A static token is leaked through an error message, the evidence file or the token artifact | M | High | The token is passed only as a function argument and a request header, never interpolated into an `err(...)` or stdout string; Level 3a asserts it is absent from both streams; evidence files contain test names only |
| An application's IndexedDB layout does not fit the declared `database`/`store`/`key` shape | M | Medium | The location is declared, never guessed; a missing database or store halts `FAILED_TOKEN_LOCATION_UNREACHABLE` naming it, and a keyPath store requires an explicit `valueField` |
| A proof that returns 2xx without the token (an open endpoint) saves a session that proves nothing | L | High | `FAILED_TOKEN_UNPROVEN` halts before any write; Level 3a drives that exact case |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Handoff to the test pair (not Implementer work).** Expected `NEW_TEST_REQUIRED` items, one per AC-A1 to AC-A8: record resolution (pass, fail, hand-written record refused, unlisted file, multi-path with prose, `record_resolved` count) against `qa-run.mjs`; `validateResults` with `record_resolved`; the static-token login (no login request, proof both ways, `FAILED_TOKEN_UNPROVEN`, `FAILED_TOKEN_LOCATION_UNREACHABLE`, token absent from output) and the IndexedDB round trip including restoration in a context created from the saved file; the Playwright-version gate; the generated `static-token` config text and the auth-model template/writer/reviewer wording. No `{ skip }` anywhere: a test that needs Chromium must fail with an actionable message when it is absent, and a fixture that serves HTTP from the test process must start every child with the async `spawn`/`execFile`, never a sync child. Temporary projects use `os.tmpdir()` inside Node (Git Bash's `/tmp` and Node's `/tmp` are different directories on this machine).
- **Test pair must also cover (Level 3b exercises none of these except where noted).** The `classname` fallback match (no `file` attribute); the ambiguous-suffix refusal (a bare cited path matching two distinct files resolves nothing); a non-executing record (`SKIPPED_UPSTREAM_FAILURE` and `counts.total == 0`; 3b covers only the skipped shape) and a `PASSED` record with `counts.failed > 0`; an overwritten JUnit artifact (mtime later than the record's `generated_at` plus slack; 3b covers the clear case only, not the slack boundary); a dropped path-like token (`login.feature`, a path with a space) refusing the whole case; the top-level versus latest-attempt discovery order; and that a credentials file is absent after `FAILED_TOKEN_UNPROVEN` with a prompted token.
- **Existing tests expected to stay green.** Research found no pin this plan has to move. If the Implementer's edit trips `auth-login-template.test.mjs`, `auth-local-guard-sites.test.mjs`, `auth-model-pair.test.mjs`, `auth-scripts-command.test.mjs` or `qa-run-contract.test.mjs`, treat it as an unintended contract change and fix the implementation; a deliberate pin change must go to the test pair as `EXISTING_TEST_UPDATED` by NAMED test, never as a whole-file tolerance in a Level block.
- **Hard boundary.** No task edits `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs`; Level 2 fails if any of the four differs from commit 1e34a97. Diff base for every `git diff` here is the single argument `1e34a97`.
- **Release.** `plugin.json` is not bumped and no release is cut in this plan; the 0.41.0 release (0.40.0 is already installed and the plugin cache is keyed on version) follows once the phase passes.
- **Process deviation recorded by the PRD.** The `praesto-sum` login script was hand-written outside `/relay-auth-scripts` because no mechanism existed; Tasks 2, 6 and 7 close that gap, but the approval gate (AC-9) still protects only when the commands are used.
- **Plan-writer limitation.** This plan was authored without a Bash tool: no command in it, including the two Level 3 scripts, was executed by the author. They were written against the sources read (template, runner, schema) and must be run once by the Implementer, who should fix a defect in the command itself, never weaken the assertion.
- **Unverified claim in research.** Seeding a token into IndexedDB before saving state (the `page.evaluate` against `indexedDB` on the app origin) has no documented recipe in Playwright's own docs; Level 3a is the proof, and restoration is asserted by reading the token back in a page opened from the saved file.

*Generated: 2026-10-04*
*Approved: 2026-10-04*
*Status: IMPLEMENTED*
