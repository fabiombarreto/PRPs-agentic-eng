# Feature: Declared API origins (Phase 5 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: network-touching site (an HTTP step reaching a second origin); secret handling (a header derived from a session cookie is a new leak surface); impact on shared contracts (`qa-run.mjs` plan vocabulary, `login.config.json` declaration schema, `relay-qa-run.md`); cross-cutting artifact (a plan downstream stages consume)
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Plan side only" — `/relay-qa-report` and the reports are untouched; every change lives in the planning instructions, the runner and tracked declarations
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; phases 1-4 are `complete`, this phase runs fifth on the same files
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15)
  - Same PRD, Decisions Log "Partial plans and the outcome vocabulary" — no fifth outcome; new behavior is reason codes only
  - Phase 1 plan (`PRPs/plans/completed/qa-runner-case-vocabulary-phase-1-plan-contract-and-partial-plans.plan.md`) Task 4 and Notes — additional local API origins and their session-derived header are an `api_origins` map in `PRPs/auth/login.config.json`, next to the roles that supply the session (resolves PRD Open Question 3 for this phase)
  - Phase 4 plan Notes (amendment 2026-10-06) — a new sibling module must never be a static import of `qa-run.mjs`; this phase therefore keeps all code inside `qa-run.mjs`
  - `docs/decisions.md` [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; tests are routed through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — the derived header value must reach no evidence file, reason, log line or terminal output
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no existing test is edited by the Implementer; any test this phase disturbs is routed to the test pair (see Notes)
  - "Relying on interactive permission prompts in the autonomous loop" — `/relay-qa-run` stays standalone and is never invoked by `/relay-execute`
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - The local-only guard (parent PRD AC-1) is a hard failure at every network-touching site; each declared origin passes `checkTarget` before any request, and `qa-run.mjs` is already a registered guard site
  - Command versus agent separation — the planning agent selects a declared origin name; the script owns the URL, the header and every request
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - `qa-run-contract` invariants stay true for `qa-run.mjs`: exact four-value `OUTCOMES`, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
  - Interactivity boundary — no new extension; no operator dialogue
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 5: "Declared API origins" — Goal: API cases on a second local origin run with the role's session — Success signal: against a fixture shaped like `super-ensino` (SPA on one port, API on another, JWT in a cookie), an HTTP step on the declared API origin returns 2xx with the derived Bearer; an undeclared origin is still refused, and the token value appears nowhere in the run's output.

## Summary

This phase lets an HTTP step reach a second local origin, such as the `:8000` API behind a `:3000` SPA, with a header derived at run time from the role's saved session. An operator declares each additional origin in an `api_origins` map of `PRPs/auth/login.config.json`: `{ "url", "header", "cookie", "value_prefix"? }`. A flat `request` step names one with an optional `origin` key and a relative `path`. Before anything is seeded, authenticated or requested, `executeCase` classifies the origin (undeclared is refused `FAILED_NON_LOCAL_TARGET`, exactly as an off-origin path is today), passes the declared URL through the local-only guard and resolves the path against that guarded origin. At run time the HTTP driver reads the named cookie from the role's storage-state file, builds the header value, registers it with the redaction table, and sends it as a per-request header; evidence records only the origin name. All code lives inside `qa-run.mjs` (no new sibling module), existing guard lines stay byte-identical, and `relay-qa-run.md` gains a literal `origin` step example and the enforced `api_origins` schema in place of the "reserved for a later phase" sentence.

## User Story

As the operator of relay's human validation gate
I want an HTTP step to call my project's second local API origin with the role's session
So that cases whose API lives on another port (`super-ensino` A-2, S-2) are driver-executed with evidence, with no token ever printed

## Problem Statement

The HTTP driver refuses every request whose origin differs from the single target origin (`resolveStepUrl`), so `super-ensino`'s API cases, which live on `:8000` and need `Authorization: Bearer <JWT>` read from a script-set cookie (finding F2), come back `needs-human`. The only session-to-header derivation in the runner covers static-token roles (`sessionAuthHeaders`); nothing turns a named cookie of the saved storage state into a header, and that header would be applied to every request of the context, which cannot be allowed to cross origins unguarded.

## Solution Statement

Plan side and runner side only. Add an optional `origin` key to the flat `request` step. Add two exported pure functions, `classifyApiOrigin` (ordered refusals over the `api_origins` map) and `deriveApiHeader` (named cookie to header value), plus an exported async `prepareApiStep` that guards the declared URL, resolves the path against it and derives the header for the step. Refuse in `executeCase`, before any side effect, every origin that is undeclared, malformed or not local, and every header-bearing origin used by a case with no role. In `DRIVERS.http`, pass the derived header per request (never at context level), keep it out of evidence, and register it with the redaction table before it is used. An undeclared origin keeps today's reason code, `FAILED_NON_LOCAL_TARGET`; new reason codes (`API_ORIGIN_INVALID`, `API_HEADER_NO_SESSION`, `API_HEADER_SOURCE_MISSING`) are all `blocked` and none is an outcome.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md` |
| Dependencies | Phase 1 (`complete`): `validateStep`/`validateSteps`, `recordSteps`, the `api_origins` schema decision. Phases 2-4 (`complete`) share the same files. |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 230 (row 5), 266-269 (Phase Details), 109-113 (AC-12), 116-122 (AC-15), 123 (AC-16) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 109-113, 266-269 | AC-12 and the Phase 5 scope and success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 801-870 | `stepRules` — the http `request` branch where the optional `origin` key is validated |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 981-997 | `resolveStepUrl` — the single-origin resolver the declared origin reuses with its own guarded target; must stay byte-identical |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1153-1166 | `queryArgvIsLocal` — the `checkTarget` call pattern for a declared URL |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1226-1317 | `sessionAuthHeaders` and `DRIVERS.http` — the context-level header (must not be the vehicle for the derived header), the per-request `fo` object, the evidence write |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1453-1497 | `obtainSession` — the storage-state path (`session.path`) and the redaction registration of every cookie value |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1917-1975 | `executeCase` — the pre-side-effect refusal order; the new loop goes between `makeCtx()` and the Playwright gate |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 159-246 | step examples (marker convention) and the declaration-schema paragraph with the "reserved for a later phase" sentence being replaced |
| P0 | `plugins/relay/scripts/auth-local-guard.mjs` | 108-156 | `checkTarget` / `isAllowedHost` — what the guard accepts and returns (`origin`, `host`, `allowedHosts`) |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 29-31, 162-181 | the doc-example validation: every marked example must pass `validateStep` |
| P1 | `PRPs/plans/completed/qa-runner-case-vocabulary-phase-4-read-only-db-driver.plan.md` | 624-640 | Notes: the lazy-import amendment and the test-pair routing conventions this plan follows |
| P1 | `docs/anti-patterns.md` | 34-39 | secret-leak rule governing evidence and reasons |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:987-997
function resolveStepUrl(path, target) {
  /** @type {URL} */ let u;
  try {
    u = new URL(path, target.origin);
  } catch {
    return null;
  }
  if (u.origin !== target.origin) return null;
  if (!target.guard.isAllowedHost(u.hostname, target.allowedHosts)) return null;
  return u.href;
}
```
Copied by Task 2 (the declared origin is turned into its own `{ guard, origin, allowedHosts }` target and the step path is resolved with this unchanged function; the function itself is NOT edited).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1160-1166
async function queryArgvIsLocal(ctx, argv) {
  for (const a of argv.filter((x) => x.includes('://'))) {
    const g = await ctx.target.guard.checkTarget(a, { root: ctx.root });
    if (!g.ok) return false;
  }
  return true;
}
```
Copied by Task 2 (`resolveApiOrigin` calls `ctx.target.guard.checkTarget(url, { root: ctx.root })` on the declared URL the same way and uses the returned `origin` and `allowedHosts`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1056-1060
export function classifySeedDeclaration(decl, text) {
  const wellFormed = (/** @type {any} */ c) => Array.isArray(c) && c.length > 0 && c.every((a) => isStr(a) && a !== '');
  if (!isObj(decl) || (decl.command !== null && !wellFormed(decl.command))) {
    return { code: 'STATE_UNDECLARED', reason: `the required state is not declared: PRPs/auth/qa-seed.json states[${JSON.stringify(text)}]` };
  }
```
Copied by Task 1 (`classifyApiOrigin` is a pure, ordered-refusal classifier of the same shape: `{ ok: false, code, reason }` or an ok result, reasons naming the declaration and never a value).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1232-1235
function sessionAuthHeaders(session) {
  if (session.header) return { [session.header]: `${session.valuePrefix ?? ''}${session.token}` };
  return { Authorization: `Bearer ${session.token}` };
}
```
Copied by Task 1 (the derived header uses the same `header` / `value_prefix` vocabulary as the token artifact, so a declaration reads like the one a static-token role already writes).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1929-1935
  const querySources = seedConfig && isObj(seedConfig) ? seedConfig.query_sources : undefined;
  for (const [i, s] of p.steps.entries()) {
    if (!isObj(s) || s.action !== 'query') continue;
    const src = /** @type {any} */ (Q).classifyQuerySource(querySources, s.source);
    if (!src.ok) return out(blocked(src.code, `step ${i + 1}: ${src.reason}`));
    if (!(await queryArgvIsLocal(ctx, src.argv))) return out(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: a query source argument names a non-local URL; nothing was executed`));
  }
```
Copied by Task 3 (the origin refusal loop has the same shape and sits in the same pre-side-effect zone, before `prepareState`, `obtainSession` and every driver call; the existing loops are not edited).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1261-1267
      const url = resolveStepUrl(step.path, target);
      if (url === null) return ended(blocked('FAILED_NON_LOCAL_TARGET', `step ${i + 1}: the path leaves the guard-approved origin; nothing was requested`, evidence), i);
      /** @type {any} */ let resp;
      try {
        /** @type {any} */ const fo = { method: step.method, maxRedirects: 0, timeout: 10000, failOnStatusCode: false };
        if (step.body !== undefined) fo.data = step.body;
        resp = await reqCtx.fetch(url, fo);
```
Copied by Task 4 (the origin branch is added above the `url` line; the per-request `fo.headers` is set next to `fo.data`, so the derived header never becomes a context-level header).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:180-185
One literal `query` step, a read-only database check:

<!-- qa-step-example driver=http -->
```json
{ "action": "query", "source": "d1-local", "sql": "SELECT status FROM tasks WHERE id = 7", "expect_rows": 1 }
```
```
Copied by Task 5 (the new `origin` example uses the same marker line and one-object fenced `json` block, which `qa-run-contract` validates against `validateStep`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | optional `origin` key in the http `request` rules; exported `classifyApiOrigin`, `deriveApiHeader`, `prepareApiStep`; pre-side-effect origin refusals in `executeCase`; per-request derived header, redaction registration and origin-name evidence in `DRIVERS.http` |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | literal `origin` step example, the enforced `api_origins` schema replacing the "reserved" sentence, the new refusal codes, one honesty rule |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or the reports themselves; every change is plan-side and runner-side.
- A fifth outcome. New behavior is reason codes: `API_ORIGIN_INVALID`, `API_HEADER_NO_SESSION`, `API_HEADER_SOURCE_MISSING` (all `blocked`); `FAILED_NON_LOCAL_TARGET` is reused for an undeclared or non-local origin, exactly as today.
- A new sibling module or any static import of one. All code lives in `qa-run.mjs`.
- An `origin` key on browser steps. The browser's own requests already pass the hostname-level route guard; only the HTTP driver gains the key.
- Cross-origin `api` login or any change to the auth kit's login mechanisms (PRD "Won't").
- Reading a header source other than a named cookie of the role's saved storage state (no localStorage source, no URI-decoding, no refresh of an expired token).
- Capture from an earlier HTTP step, UI grounding, per-test record resolution — phases 6-7 and a Should-item.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any test file and any further change to `scripts/validate/checks/*` by this phase (R-X strict; no guard site is added because `qa-run.mjs` is already registered, so `GUARD_SITES` is untouched). Phases 1-4 already left those check files modified and uncommitted; this phase adds nothing to them.
- Any `documentation/` edit, a release or version bump. The release is cut after the phase 8 dogfood.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the `origin` step key and the pure origin and header functions

- **ACTION**: Delivers AC-A1 (a declared origin is classified; an undeclared one is refused `FAILED_NON_LOCAL_TARGET`) and the pure half of AC-A2 (the header is built from the role's saved session). In `plugins/relay/scripts/qa-run.mjs`, add code only; do not edit `resolveStepUrl`, `runSeed`, the two existing path-check loops in `executeCase`, or any existing line other than the one http branch named in item 1. Do NOT add any `import` statement of a sibling file (static or top-level); the runner is copied alone into temp plugin dirs by existing tests.
  1. In `stepRules`, inside the `driver === 'http'` branch, directly after the `if (!isStr(s.path)) return bad('path must be a string');` line, add: `if (s.origin !== undefined && !(isStr(s.origin) && API_ORIGIN_NAME.test(s.origin))) return bad('origin must be a declared api_origins name of letters, digits, _ or -');` with `const API_ORIGIN_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;` declared beside `HTTP_ACTIONS`. Every existing message stays byte-for-byte identical; `origin` is not a counted expectation and is not valid on browser steps.
  2. Export `classifyApiOrigin(apiOrigins, name)`, pure, no I/O. `apiOrigins` is the `api_origins` map (any non-object means no origins). Ordered refusals, each `{ ok: false, code, reason }` with a reason that names the origin name only: `FAILED_NON_LOCAL_TARGET` with the reason `the origin <name> is not declared in api_origins; nothing was requested` when `name` is not an own key of an object `apiOrigins` or its entry is not an object (undeclared stays the guard's code, per AC-12); then `API_ORIGIN_INVALID` with the reason `api_origins[<name>] is malformed: <why>` when `url` is not a non-empty string without whitespace, when exactly one of `header` and `cookie` is present, when `header` is not `^[A-Za-z0-9-]{1,64}$` or (lowercased) is one of `host`, `content-length`, `cookie`, `transfer-encoding`, when `cookie` is not `^[A-Za-z0-9._-]{1,128}$`, or when `value_prefix` is present and is not a string of at most 32 characters with no CR or LF. On success return `{ ok: true, name, url, header: <string or null>, cookie: <string or null>, valuePrefix: <string, '' when absent> }`. A reason never contains a cookie value, and `url` is not echoed.
  3. Export `deriveApiHeader(spec, state, host)`, pure. `spec` is a successful `classifyApiOrigin` result with a non-null `header`; `state` is the parsed storage-state object (or anything else); `host` is the guarded origin's hostname. Among `state.cookies` entries whose `name` equals `spec.cookie` and whose `value` is a non-empty string, prefer one whose `domain` (lowercased, one leading `.` removed) equals `host`, else take the first. Return `{ ok: true, name: spec.header, value: spec.valuePrefix + cookie.value, raw: cookie.value }`; when none qualifies (including a `state` that is not an object) return `{ ok: false, code: 'API_HEADER_SOURCE_MISSING', reason: 'the role session has no usable cookie named <cookie>' }`. The reason names the declared cookie name only, never a value.
  4. Do not add a `writeFileSync(` or `renameSync(` call, a second `// GUARD-SITE` marker, or an `outcome:` literal outside the four values. Do not change `OUTCOMES`.
  Delivers AC-A1 and AC-A2 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1056-1060` (ordered-refusal classifier shape) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1232-1235` (the `header` / `value_prefix` vocabulary).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { validateStep, classifyApiOrigin, deriveApiHeader } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const ok = { action: "request", origin: "api", method: "GET", path: "/api/me", expect_status: 200 };
  if (validateStep("http", ok) !== null) fail("a valid origin step was rejected: " + JSON.stringify(validateStep("http", ok)));
  for (const o of ["a b", "", 5, "x".repeat(41), "-lead"]) if (validateStep("http", { ...ok, origin: o }) === null) fail("a malformed origin was accepted: " + JSON.stringify(o));
  if (validateStep("http", { action: "request", method: "GET", path: "/a", expect_status: 200 }) !== null) fail("an existing http step stopped validating");
  const decl = { api: { url: "http://localhost:8000", header: "Authorization", cookie: "access-token", value_prefix: "Bearer " }, plain: { url: "http://localhost:9000" } };
  const c = classifyApiOrigin(decl, "api");
  if (!c.ok || c.header !== "Authorization" || c.cookie !== "access-token" || c.valuePrefix !== "Bearer " || c.url !== "http://localhost:8000") fail("a declared origin was not classified: " + JSON.stringify(c));
  const p = classifyApiOrigin(decl, "plain");
  if (!p.ok || p.header !== null || p.cookie !== null || p.valuePrefix !== "") fail("a header-less origin was not classified: " + JSON.stringify(p));
  for (const [label, d, n] of [["absent name", decl, "nope"], ["null map", null, "api"], ["array map", [], "api"], ["non-object entry", { api: "x" }, "api"], ["inherited key", {}, "constructor"]]) {
    const r = classifyApiOrigin(d, n);
    if (r.ok || r.code !== "FAILED_NON_LOCAL_TARGET") fail("undeclared was not FAILED_NON_LOCAL_TARGET: " + label + " " + JSON.stringify(r));
  }
  const bad = [
    ["header without cookie", { url: "http://localhost:1", header: "Authorization" }],
    ["cookie without header", { url: "http://localhost:1", cookie: "t" }],
    ["forbidden header", { url: "http://localhost:1", header: "Host", cookie: "t" }],
    ["bad header chars", { url: "http://localhost:1", header: "bad header", cookie: "t" }],
    ["bad cookie chars", { url: "http://localhost:1", header: "X-A", cookie: "a b" }],
    ["prefix with newline", { url: "http://localhost:1", header: "X-A", cookie: "t", value_prefix: "B\nX: y" }],
    ["no url", { header: "X-A", cookie: "t" }],
    ["url with space", { url: "http://local host", header: "X-A", cookie: "t" }],
  ];
  for (const [label, d] of bad) {
    const r = classifyApiOrigin({ a: d }, "a");
    if (r.ok || r.code !== "API_ORIGIN_INVALID") fail("a malformed declaration was not API_ORIGIN_INVALID: " + label + " " + JSON.stringify(r));
  }
  const TOK = "tok-abc123-xyz";
  const state = { cookies: [{ name: "other", value: "zzzz1111", domain: "localhost" }, { name: "access-token", value: TOK, domain: "localhost" }] };
  const d = deriveApiHeader(c, state, "localhost");
  if (!d.ok || d.name !== "Authorization" || d.value !== "Bearer " + TOK || d.raw !== TOK) fail("the header was not derived from the named cookie: " + JSON.stringify(d));
  const two = { cookies: [{ name: "access-token", value: "wrong-one-1", domain: "example.test" }, { name: "access-token", value: TOK, domain: ".localhost" }] };
  if (deriveApiHeader(c, two, "localhost").raw !== TOK) fail("the cookie whose domain matches the origin host was not preferred");
  for (const s of [{ cookies: [] }, null, "x", { cookies: [{ name: "access-token", value: "" }] }, { cookies: [{ name: "nope", value: TOK }] }]) {
    const r = deriveApiHeader(c, s, "localhost");
    if (r.ok || r.code !== "API_HEADER_SOURCE_MISSING") fail("a missing cookie was not API_HEADER_SOURCE_MISSING: " + JSON.stringify(s));
    if (r.reason.includes(TOK) || r.reason.includes("Bearer")) fail("a reason carries a value: " + r.reason);
  }
  '
  ```
  Before this task `classifyApiOrigin` is not exported, so the import fails and the block exits non-zero.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — `prepareApiStep`: guard the declared origin, resolve the path, derive the header

- **ACTION**: Delivers AC-A1 (the origin passes the local-only guard; an undeclared or non-local origin is refused `FAILED_NON_LOCAL_TARGET`) AC-A2 (the header is built from the role's saved session at run time) and AC-A3 (it is registered for redaction before use). In `plugins/relay/scripts/qa-run.mjs`, next to `queryArgvIsLocal`, add:
  1. An internal `async function resolveApiOrigin(ctx, step, n)` returning `{ ok: true, spec, url, host }` or `{ ok: false, result }` where `result` is a `blocked(...)` `CaseResult`. In order: `classifyApiOrigin(ctx.loginConfig && isObj(ctx.loginConfig) ? ctx.loginConfig.api_origins : undefined, step.origin)` refused gives `blocked(code, 'step <n>: <reason>')`; then `await ctx.target.guard.checkTarget(spec.url, { root: ctx.root })` not ok gives `blocked('FAILED_NON_LOCAL_TARGET', 'step <n>: the declared origin <name> is not local (<guard reason>); nothing was requested')`; then build `{ guard: ctx.target.guard, origin: g.origin, allowedHosts: g.allowedHosts }` and `resolveStepUrl(step.path, thatTarget)` equal to `null` gives `blocked('FAILED_NON_LOCAL_TARGET', 'step <n>: the path leaves the declared origin; nothing was requested')`. On success `url` is the resolved absolute URL and `host` is `g.host`.
  2. An exported `async function prepareApiStep(ctx, step, n, session)` returning `{ ok: true, url, headers }` (`headers` is `null` when the origin declares no header, else `{ [name]: value }`) or `{ ok: false, result }`. It calls `resolveApiOrigin` (so a direct call is as safe as one through `executeCase`); when `spec.header` is null it returns with `headers: null`; otherwise a `session` that is `null` or has no string `path` gives `blocked('API_HEADER_NO_SESSION', 'step <n>: the origin <name> derives a header from the role session, but this case has no session')`; then it reads the storage-state file (`readJsonOrNull(session.path)`), calls `deriveApiHeader(spec, state, host)`, a refusal gives `blocked(code, 'step <n>: <reason>')`, and on success it calls `addSecretValues(ctx.table, [derived.value, derived.raw])` BEFORE returning the header. No reason, return value other than `headers`, or log line carries the header value.
  3. Do not print anything (no `console.*`, no `process.stdout.write`) in either function, and do not add a `writeFileSync(` or `renameSync(` call.
  Delivers AC-A1, AC-A2, AC-A3 and AC-A4 (no value in any reason) for this phase.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1160-1166` (the `checkTarget` call on a declared URL) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:987-997` (`resolveStepUrl`, reused unchanged against the declared origin's own guarded target).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, writeFileSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { pathToFileURL } from "node:url";
  import { prepareApiStep, buildRedactionTable, redactText } from "./plugins/relay/scripts/qa-run.mjs";
  const fail = (m) => { console.error(m); process.exit(1); };
  const guard = await import(pathToFileURL(resolve("plugins/relay/scripts/auth-local-guard.mjs")).href);
  const root = mkdtempSync(join(tmpdir(), "qa-api-prep-"));
  const TOK = "tok-Zq83kd01-prep";
  const sessionPath = join(root, "admin.json");
  writeFileSync(sessionPath, JSON.stringify({ cookies: [{ name: "access-token", value: TOK, domain: "localhost" }], origins: [] }));
  const mk = (api_origins) => ({
    root,
    table: buildRedactionTable({ root, env: {}, secretValues: [] }),
    target: { guard, origin: "http://localhost:3000", allowedHosts: new Set(["localhost", "127.0.0.1"]) },
    loginConfig: { baseUrl: "http://localhost:3000", roles: { admin: {} }, api_origins },
  });
  const decl = {
    api: { url: "http://localhost:8000", header: "Authorization", cookie: "access-token", value_prefix: "Bearer " },
    plain: { url: "http://localhost:8001" },
    remote: { url: "http://example.com:8000", header: "Authorization", cookie: "access-token" },
    nocookie: { url: "http://localhost:8000", header: "Authorization", cookie: "missing-cookie" },
  };
  const step = (origin, path = "/api/me") => ({ action: "request", origin, method: "GET", path, expect_status: 200 });
  const session = { path: sessionPath, token: null };
  const ctx = mk(decl);
  const good = await prepareApiStep(ctx, step("api"), 1, session);
  if (!good.ok || good.url !== "http://localhost:8000/api/me" || !good.headers || good.headers.Authorization !== "Bearer " + TOK) fail("the declared origin was not prepared: " + JSON.stringify(good));
  if (redactText("Authorization: Bearer " + TOK, ctx.table).includes(TOK)) fail("the derived header value was not registered with the redaction table");
  const plain = await prepareApiStep(mk(decl), step("plain"), 1, null);
  if (!plain.ok || plain.headers !== null || plain.url !== "http://localhost:8001/api/me") fail("a header-less origin needs no session: " + JSON.stringify(plain));
  const expectBlocked = async (label, c, s, sess, code) => {
    const r = await prepareApiStep(c, s, 3, sess);
    if (r.ok || r.result.outcome !== "blocked" || r.result.reason_code !== code) fail(label + " was not blocked " + code + ": " + JSON.stringify(r));
    if (!/^step 3:/.test(r.result.reason) || r.result.reason.includes(TOK)) fail(label + " reason is wrong: " + r.result.reason);
  };
  await expectBlocked("an undeclared origin", mk(decl), step("nope"), session, "FAILED_NON_LOCAL_TARGET");
  await expectBlocked("no api_origins at all", mk(undefined), step("api"), session, "FAILED_NON_LOCAL_TARGET");
  await expectBlocked("a non-local declared origin", mk(decl), step("remote"), session, "FAILED_NON_LOCAL_TARGET");
  await expectBlocked("an absolute path to another origin", mk(decl), step("api", "http://localhost:9999/x"), session, "FAILED_NON_LOCAL_TARGET");
  await expectBlocked("a protocol-relative path", mk(decl), step("api", "//example.com/x"), session, "FAILED_NON_LOCAL_TARGET");
  await expectBlocked("a header origin with no session", mk(decl), step("api"), null, "API_HEADER_NO_SESSION");
  await expectBlocked("a missing cookie", mk(decl), step("nocookie"), session, "API_HEADER_SOURCE_MISSING");
  await expectBlocked("a malformed declaration", mk({ bad: { url: "http://localhost:8000", header: "Authorization" } }), step("bad"), session, "API_ORIGIN_INVALID");
  '
  ```
  Before this task `prepareApiStep` is not exported, so the import fails and the block exits non-zero. The non-local case (`example.com`) is refused by the guard's declared-host list before any DNS lookup.

### Task 3: UPDATE plugins/relay/scripts/qa-run.mjs — refuse origin steps before any side effect

- **ACTION**: Delivers AC-A1 (undeclared, malformed and non-local origins are refused before anything is seeded, authenticated or requested) and AC-A2 (a header-bearing origin needs a role). In `executeCase`, insert a new loop and touch no existing line: place it immediately after the existing line `const ctx = ctxOrNull ?? makeCtx();` and before the `if (ctx.playwright === null)` gate, so the refusals do not depend on Playwright being resolvable. For each step `s` (index `i`) with `isObj(s) && s.action === 'request' && s.origin !== undefined`: `const r = await resolveApiOrigin(ctx, s, i + 1); if (!r.ok) return out(r.result);` then, when `r.spec.header !== null && role === null`, `return out(blocked('API_HEADER_NO_SESSION', 'step <n>: the origin <name> derives a header from the role session, but the plan entry names no role'))`. Leave both existing `resolveStepUrl(s.path, target)` loops, the query loop, the `prepareState` call and every other line byte-identical. A step with an `origin` therefore must carry a relative `path` (the existing base-origin loops still refuse an absolute path to another origin), which the doc states in Task 5.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1929-1935` (the pre-side-effect refusal loop shape and its position before `prepareState`).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { spawn } from "node:child_process";
  import { createServer } from "node:http";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = "plugins/relay/scripts/qa-run.mjs";
  let hits = 0;
  const srv = await new Promise((res) => { const s = createServer((q, r) => { hits++; r.writeHead(200); r.end("x"); }); s.listen(0, "127.0.0.1", () => res(s)); });
  const port = srv.address().port;
  const root = mkdtempSync(join(tmpdir(), "qa-api-pre-"));
  const runRel = "PRPs/reports/f/qa-run/r1";
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(join(root, ...runRel.split("/")), { recursive: true });
  const origin = "http://127.0.0.1:" + port;
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({
    baseUrl: origin, roles: { admin: {} },
    api_origins: {
      remote: { url: "http://example.com:8000" },
      hdr: { url: origin, header: "Authorization", cookie: "access-token", value_prefix: "Bearer " },
      bad: { url: origin, header: "Authorization" },
      ok: { url: origin },
    },
  }));
  const block = (n) => "### " + n + ". Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. Do it\n\n";
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + [1, 2, 3, 4, 5].map(block).join(""));
  const run = (args) => new Promise((res) => { const c = spawn(process.execPath, args, { cwd: root }); let o = "", e = ""; c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => res({ code, o, e })); });
  const parsed = await run([SCRIPT, "parse", "--report", report]);
  if (parsed.code !== 0) fail("parse exited " + parsed.code + ": " + parsed.e);
  const doc = JSON.parse(parsed.o);
  const cases = Array.isArray(doc) ? doc : doc.cases;
  const entry = (i, originName, role, path) => ({ index: cases[i].index, title: cases[i].title, driver: "http", role, state: "none", steps: [{ action: "request", origin: originName, method: "GET", path, expect_status: 200 }] });
  writeFileSync(join(root, ...runRel.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: [
    entry(0, "nope", null, "/api/me"),
    entry(1, "remote", null, "/api/me"),
    entry(2, "hdr", null, "/api/me"),
    entry(3, "bad", "admin", "/api/me"),
    entry(4, "ok", null, "//example.com/x"),
  ] }));
  await run([SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel]);
  const results = JSON.parse(readFileSync(join(root, ...runRel.split("/"), "results.json"), "utf8"));
  const want = ["FAILED_NON_LOCAL_TARGET", "FAILED_NON_LOCAL_TARGET", "API_HEADER_NO_SESSION", "API_ORIGIN_INVALID", "FAILED_NON_LOCAL_TARGET"];
  want.forEach((code, i) => {
    const c = results.cases[i];
    if (c.outcome !== "blocked" || c.reason_code !== code) fail("case " + (i + 1) + " was not blocked " + code + ": " + JSON.stringify([c.outcome, c.reason_code, c.reason]));
  });
  if (hits !== 0) fail("a refused origin step reached the network: " + hits + " request(s)");
  if (existsSync(join(root, "PRPs", "auth", ".sessions"))) fail("a login ran before the origin refusals");
  srv.close();
  process.exit(0);
  '
  ```
  Before this task cases 1-5 are not refused by name (case 1 and 2 fall through to the later gates, cases 3-4 are not refused at all), so the code assertions exit non-zero. All five refusals precede the Playwright, state and session gates, so the block needs neither Playwright nor a login script.

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — the HTTP driver sends the derived header per request and keeps it out of evidence

- **ACTION**: Delivers AC-A2 (an HTTP step on the declared origin is executed with the derived header), AC-A3 (no part of the header value appears in evidence, logs or terminal output) and AC-A4 (no credential in any run artifact). In `DRIVERS.http`, change only what is named here:
  1. Directly above `const url = resolveStepUrl(step.path, target);`, add `const apiStep = isStr(step.origin) ? await prepareApiStep(ctx, step, i + 1, session) : null;` and `if (apiStep !== null && !apiStep.ok) return ended({ ...apiStep.result, evidence }, i);`. Replace the `url` line with `const url = apiStep !== null ? apiStep.url : resolveStepUrl(step.path, target);` (the following `url === null` refusal is kept as is).
  2. Next to `if (step.body !== undefined) fo.data = step.body;`, add `if (apiStep !== null && apiStep.headers !== null) fo.headers = apiStep.headers;`. The derived header is a per-request option ONLY: never add it to `opts.extraHTTPHeaders` or to any context-level option, and never log or record it.
  3. In the evidence `value`, keep the literal `request: { method: step.method, path: step.path }` BYTE-IDENTICAL (an existing test uses it as a once-only mutation anchor) and add the origin name as a SIBLING key after `response`: `...(apiStep !== null ? { origin: step.origin } : {})`. An origin step then records the origin NAME (never a URL header, never the value) and every other step's evidence is byte-identical to today's. Leave `keptHeaders` (the response-header allowlist) and the body handling unchanged; the body is redacted by `writeRunFile` because Task 2 registered the value.
  4. Leave `DRIVERS.browser` and `executeCase`'s `substituteVariables` call unchanged: a substituted `origin` string is still a plain name, and `prepareApiStep` re-validates the origin at run time, so a captured value cannot widen it.
  Delivers AC-A2, AC-A3 and AC-A4.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1261-1267` (the `url` line, the `fo` object and `fo.data`, which the new lines sit beside).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, symlinkSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  import { createServer } from "node:http";
  const fail = (m) => { console.error(m); process.exit(1); };
  const SCRIPT = resolve("plugins/relay/scripts/qa-run.mjs");
  const TOK = "tok-Zq83kd01-apiorigin";
  const seen = { base: [], api: [] };
  const handler = (name) => (req, resp) => {
    seen[name].push({ url: String(req.url).split("?")[0], auth: String(req.headers.authorization ?? "") });
    const good = req.headers.authorization === "Bearer " + TOK;
    resp.writeHead(good ? 200 : 401, { "content-type": "application/json" });
    resp.end(JSON.stringify({ ok: good }));
  };
  const listen = (name) => new Promise((res) => { const s = createServer(handler(name)); s.listen(0, "127.0.0.1", () => res(s)); });
  const base = await listen("base");
  const api = await listen("api");
  const root = mkdtempSync(join(tmpdir(), "qa-api-e2e-"));
  symlinkSync(resolve("node_modules"), join(root, "node_modules"), "junction");
  const runRel = "PRPs/reports/f/qa-run/r1";
  mkdirSync(join(root, "PRPs", "auth"), { recursive: true });
  mkdirSync(join(root, ...runRel.split("/")), { recursive: true });
  writeFileSync(join(root, "PRPs", "auth", "login.config.json"), JSON.stringify({
    baseUrl: "http://127.0.0.1:" + base.address().port,
    roles: { admin: {} },
    api_origins: { api: { url: "http://127.0.0.1:" + api.address().port, header: "Authorization", cookie: "access-token", value_prefix: "Bearer " } },
  }));
  const stub = [
    "import { writeFileSync, mkdirSync } from \"node:fs\";",
    "import { join } from \"node:path\";",
    "const root = process.argv[process.argv.indexOf(\"--root\") + 1];",
    "mkdirSync(join(root, \"PRPs\", \"auth\", \".sessions\"), { recursive: true });",
    "writeFileSync(join(root, \"PRPs\", \"auth\", \".sessions\", \"admin.json\"), JSON.stringify({ cookies: [{ name: \"access-token\", value: \"" + TOK + "\", domain: \"127.0.0.1\", path: \"/\", expires: -1, httpOnly: false, secure: false, sameSite: \"Lax\" }], origins: [] }));",
  ].join("\n");
  writeFileSync(join(root, "PRPs", "auth", "login-admin.mjs"), stub);
  const block = (n) => "### " + n + ". Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** manual\n- **Automated test path:** none\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. Do it\n\n";
  const report = join(root, "PRPs", "reports", "f", "qa-report.md");
  writeFileSync(report, "# QA\n\n## Cases\n\n" + block(1) + block(2));
  const run = (args) => new Promise((res) => { const c = spawn(process.execPath, args, { cwd: root }); let o = "", e = ""; c.stdout.on("data", (d) => { o += d; }); c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => res({ code, o, e })); });
  const parsed = await run([SCRIPT, "parse", "--report", report]);
  if (parsed.code !== 0) fail("parse exited " + parsed.code + ": " + parsed.e);
  const doc = JSON.parse(parsed.o);
  const cases = Array.isArray(doc) ? doc : doc.cases;
  const entry = (i, originName) => ({ index: cases[i].index, title: cases[i].title, driver: "http", role: "admin", state: "none", steps: [{ action: "request", origin: originName, method: "GET", path: "/api/me", expect_status: 200 }] });
  writeFileSync(join(root, ...runRel.split("/"), "plan.json"), JSON.stringify({ schema_version: 1, cases: [entry(0, "api"), entry(1, "nope")] }));
  const done = await run([SCRIPT, "run", "--root", root, "--feature", "f", "--run-dir", runRel]);
  const runDir = join(root, ...runRel.split("/"));
  const results = JSON.parse(readFileSync(join(runDir, "results.json"), "utf8"));
  const [c1, c2] = results.cases;
  if (c1.outcome !== "pass") fail("the declared-origin case did not pass: " + JSON.stringify([c1.outcome, c1.reason_code, c1.reason]));
  if (c2.outcome !== "blocked" || c2.reason_code !== "FAILED_NON_LOCAL_TARGET") fail("the undeclared origin was not refused: " + JSON.stringify([c2.outcome, c2.reason_code]));
  const apiHits = seen.api.filter((h) => h.url === "/api/me");
  if (apiHits.length !== 1 || apiHits[0].auth !== "Bearer " + TOK) fail("the API origin did not receive exactly one request with the derived Bearer: " + JSON.stringify(seen.api.map((h) => h.url)));
  if (seen.base.some((h) => h.url === "/api/me")) fail("the origin step was sent to the base origin");
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk(runDir)) if (readFileSync(f, "latin1").includes(TOK)) fail("the token value leaked into " + f);
  if (done.o.includes(TOK) || done.e.includes(TOK)) fail("the token value reached the terminal");
  base.close(); api.close();
  process.exit(0);
  '
  ```
  Before this task the origin step is sent to the base origin (or refused), so the API server never sees the Bearer and the `pass` assertion exits non-zero. The Chromium browser is not needed: the `http` driver uses Playwright's request context only, and the fixture links the repository `node_modules` the way `qa-run.test.mjs` does for its own fixtures; a missing `playwright` package surfaces as `FAILED_PLAYWRIGHT_UNAVAILABLE` and fails the `pass` assertion by name.

### Task 5: UPDATE plugins/relay/commands/relay-qa-run.md — the `origin` example, the enforced schema and the new refusal codes

- **ACTION**: Delivers AC-A1 (the doc's plan vocabulary names the declared origin) and AC-A5 (the doc and the contract stay consistent). In `plugins/relay/commands/relay-qa-run.md`, keep every other section, the required tokens (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`) and the banned-token rule (`design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`) intact, and do not add any new fenced `json` block other than the marked step example (existing doc tests locate the capturing declaration example by its `states` key, and the phrases `Until seeds` and `not yet read by the runner` must stay absent):
  1. After the existing `query` step example paragraph block, add a literal `origin` example, preceded by the exact marker line `<!-- qa-step-example driver=http -->` and followed by a fenced `json` block with exactly this one object: `{ "action": "request", "origin": "api", "method": "GET", "path": "/api/me", "expect_status": 200 }`. Describe it in prose: an `http` `request` step may carry an optional `origin` naming an `api_origins` entry; the `path` must then be relative (an absolute URL to another origin is refused); without `origin` the step goes to the target origin, unchanged.
  2. Replace the sentence that ends `are reserved for a later phase.` (the one introducing `api_origins`) with the enforced schema, in prose and inline code only: `api_origins` is a map in `PRPs/auth/login.config.json`, next to the roles; each entry is `{ "url": "<local origin>", "header": "<header name>", "cookie": "<cookie name in the role's saved session>", "value_prefix": "<optional, e.g. Bearer >" }`, where `header` and `cookie` go together or are both absent (an origin with neither only reaches a second local origin with the session's cookies). The runner builds the header value at run time from that cookie of the role's saved storage state and sends it only with steps naming that origin; the value is never written to evidence, a reason or the terminal. Every declared origin is checked by the local-only guard; an origin not declared in `api_origins`, or not local, blocks the case `FAILED_NON_LOCAL_TARGET` with nothing requested. List the other refusals, all `blocked` and all before any request: `API_ORIGIN_INVALID` (a malformed declaration), `API_HEADER_NO_SESSION` (a header-bearing origin in a case whose plan entry names no role); at run time `API_HEADER_SOURCE_MISSING` (the role session has no usable cookie of that name). Keep the existing sentence that these files hold declarations only, never captured values or credentials.
  3. Add one honesty rule: plan a case that needs a second local origin only when the origin is already named in `PRPs/auth/login.config.json` `api_origins`; read the names from that file, never invent one and never write a URL, header value or token.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:180-185` (marker line plus one-object fenced `json` block for a literal step example).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { runQaRunContractCheck } from "./scripts/validate/checks/qa-run-contract.mjs";
  const r = runQaRunContractCheck();
  if (!r.ok) { console.error(JSON.stringify(r.findings, null, 2)); process.exit(1); }
  '
  grep -qF '"origin": "api"' plugins/relay/commands/relay-qa-run.md
  grep -q 'API_HEADER_NO_SESSION' plugins/relay/commands/relay-qa-run.md
  grep -q 'API_HEADER_SOURCE_MISSING' plugins/relay/commands/relay-qa-run.md
  grep -q 'API_ORIGIN_INVALID' plugins/relay/commands/relay-qa-run.md
  grep -q 'value_prefix' plugins/relay/commands/relay-qa-run.md
  if grep -q 'reserved for a later phase' plugins/relay/commands/relay-qa-run.md; then echo "FAIL: the api_origins sentence still says reserved"; exit 1; else echo "PASS: api_origins is documented as enforced"; fi
  if grep -qE 'Until seeds|not yet read by the runner' plugins/relay/commands/relay-qa-run.md; then echo "FAIL: a retired stop-gap phrase is back"; exit 1; else echo "PASS: no retired phrase"; fi
  ```
  `runQaRunContractCheck` validates every marked example against the script's own `validateStep`, so it fails if the new `origin` example stops validating. The `grep` lines assert prose this task authors (tokens copied byte-for-byte from the ACTION above) and are acceptable because the deliverable is the doc text.

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
for (const n of ["classifyApiOrigin", "deriveApiHeader", "prepareApiStep"]) if (typeof qa[n] !== "function") fail("missing export: " + n);
if (qa.validateStep("http", { action: "request", method: "GET", path: "/api/x" }) !== null) fail("the flat http step no longer validates");
for (const r of [runQaRunContractCheck(), runAuthLocalGuardSitesCheck()]) if (!r.ok) fail(JSON.stringify(r.findings, null, 2));
'
# The runner keeps its single guard marker and the existing guard mutation anchor, byte-identical.
[ "$(grep -c '// GUARD-SITE' plugins/relay/scripts/qa-run.mjs)" -eq 1 ]
[ "$(grep -cF "if (!a.includes('://')) continue;" plugins/relay/scripts/qa-run.mjs)" -eq 1 ]
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
# phases 1-4 already modified the two check files uncommitted, so a diff against HEAD cannot isolate this phase for them.
if [ -n "$(git diff --name-only HEAD -- plugins/relay/commands/relay-qa-report.md)" ]; then
  echo "FAIL: relay-qa-report.md changed"; exit 1
else
  echo "PASS: relay-qa-report.md untouched"
fi
# The evidence-shape mutation anchor of an existing test stays byte-identical and unique.
[ "$(grep -cF 'request: { method: step.method, path: step.path }' plugins/relay/scripts/qa-run.mjs)" -eq 1 ]
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
# (the change is additive: existing messages, anchors and the evidence shape of non-origin steps are unchanged).
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** Given a project that declares an additional local API origin in `PRPs/auth/login.config.json` `api_origins`, when an HTTP step names that origin, then the declared URL passes the local-only guard before any request, the step path resolves only against that origin, and an origin that is undeclared, or declared but not local, is refused `FAILED_NON_LOCAL_TARGET` before anything is seeded, authenticated or requested, exactly as an off-origin path is refused today.
- **AC-A2 (PRD AC-12):** Given an origin that declares `header` and `cookie`, when an HTTP step names it, then the header value is built at run time from the named cookie of the role's saved session and sent only with that step's request (for example `Authorization: Bearer <cookie value>`); a header-bearing origin in a case with no role is `blocked` `API_HEADER_NO_SESSION`, and a session without the cookie is `blocked` `API_HEADER_SOURCE_MISSING`, both with no request sent.
- **AC-A3 (PRD AC-12):** The header value is registered with the redaction table before it is used, and no part of it appears in evidence files, refusal reasons, results, logs or terminal output; evidence records the origin name only.
- **AC-A4 (PRD AC-16):** No credential, cookie value or header value appears in any tracked file, run artifact or terminal output; `api_origins` holds declarations only (URL, header name, cookie name, optional prefix), never a token or a value.
- **AC-A5 (PRD AC-1):** `relay-qa-run.md` carries a literal, marked `origin` step example that validates against `validateStep`, and documents the enforced `api_origins` schema and the new refusal codes in place of the "reserved" sentence; `npm run validate` still passes.
- **AC-A6 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, the report is never written, and `OUTCOMES` is still exactly the four values.

R8b (PRD AC-N token check) is satisfied here by the `(PRD AC-N)` tokens above; the criteria are phase-scoped slices of PRD AC-12, AC-16, AC-1 and AC-15. Task bodies cite them as: Task 1 delivers AC-A1 and AC-A2; Task 2 delivers AC-A1, AC-A2, AC-A3 and AC-A4; Task 3 delivers AC-A1 and AC-A2; Task 4 delivers AC-A2, AC-A3 and AC-A4; Task 5 delivers AC-A5; AC-A6 is held by the Level 2 frozen-surface check across all tasks.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The derived header value leaks into evidence, a reason, a log or the terminal | M | H | The value is registered with the redaction table in `prepareApiStep` before it is returned; it travels only as a per-request `fo.headers` entry; evidence records the origin name only; Task 4's end-to-end VALIDATE scans the whole run directory and the terminal output for the token |
| A declared origin that is not local is reached | L | H | `checkTarget` on the declared URL (hostname, userinfo, declared-host rules) plus `resolveStepUrl` against that origin's own guarded target; absolute and protocol-relative paths to another origin are refused; Task 2 and Task 3 VALIDATE cover each case and assert zero network hits |
| The base target's static token header (`sessionAuthHeaders`, set at context level) is also sent to the declared origin | M | L | Accepted and bounded: both origins are guarded local origins and the header is the role's own token; the derived header, when declared, overrides a same-named context header per request; recorded for the phase 8 dogfood (`TBD - needs validation` whether `super-ensino` roles carry a token artifact) |
| A new static sibling import breaks the existing tests that copy `qa-run.mjs` alone | M | H | All code stays inside `qa-run.mjs`; Level 2 starts a lone copy of the script and fails if it cannot start |
| The edited `url` line or a neighbouring line is a mutation anchor in an existing test | L | M | Only the one `url` line is edited (the same text also occurs in `DRIVERS.browser`, so it cannot be a once-only anchor); the evidence literal `request: { method: step.method, path: step.path }` (a once-only anchor of the "request bodies are never persisted" test) stays byte-identical, with the origin name added as a sibling key; `resolveStepUrl`, `runSeed`, both path-check loops and the `://` guard line are untouched and Level 2 asserts both anchors occur exactly once; Level 3 runs the whole corpus |
| A doc test pins the replaced "reserved for a later phase" sentence or another doc phrase | L | M | Any failing doc-parsing test is routed to the test pair as `EXISTING_TEST_UPDATED` (Notes), never edited by the Implementer, and excluded by name from Level 3 only if it fails for exactly that reason |
| A cookie value is URL-encoded or the token expires between login and use | M | M | Out of scope (NOT Building): the raw cookie value is used; an expired token yields the API's own 401, which is a `fail` with evidence, never a pass; to be observed in the phase 8 dogfood |
| research grounding gaps: no primary source for Playwright `extraHTTPHeaders` on `APIRequestContext` and no source on trace/report leakage | L | L | The plan uses the documented per-request `headers` option of `APIRequestContext.fetch` (the context-level option is already used by the runner for token roles) and does not rely on traces or HTML reports, which the runner never produces |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Declaration schema decided here (PRD Open Question 3, location fixed by phase 1):** `api_origins` in `PRPs/auth/login.config.json`, entries `{ url, header?, cookie?, value_prefix? }`. `header`/`cookie` reuse the `header`/`value_prefix` vocabulary of the static-token artifact. `login.config.json` is a tracked declaration file; it holds names and URLs only.
- **Guard-site registration:** no new `GUARD_SITES` entry. The only network-touching code added lives in `qa-run.mjs`, which is already a registered guard site (`auth-local-guard.mjs`, `checkTarget`, `FAILED_NON_LOCAL_TARGET`, `// GUARD-SITE`), and `qa-run.mjs` keeps its single `// GUARD-SITE` marker. `GUARD_SITES.length` and `auth-local-guard-sites.test.mjs` are therefore unaffected; if the test pair prefers an extra required token on the `qa-run.mjs` entry, that is a ledger decision, not an Implementer task.
- **Reason codes:** `API_ORIGIN_INVALID`, `API_HEADER_NO_SESSION`, `API_HEADER_SOURCE_MISSING`, all `blocked`; an undeclared or non-local origin reuses `FAILED_NON_LOCAL_TARGET` per PRD AC-12. A plan-shape defect (`origin` not a name) is `PLAN_ENTRY_INVALID`, `needs-human`, like every other step-shape defect.
- **Existing tests this phase is expected to disturb: none.** The change is additive: existing step messages, the evidence shape of non-origin steps and the guard anchors are byte-identical. If a test nevertheless fails (for example a doc test pinning the removed "reserved" wording), list it here as `EXISTING_TEST_UPDATED` work for the test pair, never as an Implementer edit.
- **Recorded for the test pair.** New cases for: `validateStep` with `origin` (valid, malformed, and not valid on browser steps), `classifyApiOrigin` (every refusal and the header-less origin), `deriveApiHeader` (domain preference, missing cookie, no value in a reason), `prepareApiStep` (every refusal and the redaction registration), `executeCase` refusals before the Playwright gate (the Task 3 fixture shape), and the end-to-end shape of Task 4 (SPA-like base origin, API origin on another port, JWT in a cookie, 2xx with the derived Bearer, undeclared origin refused, token absent from every run file and from stdout/stderr). The full corpus must be run with the quoted glob `node --test "scripts/validate/**/*.test.mjs"` after the ledger updates.
- **Where the declaration is read.** `ctx.loginConfig` is `PRPs/auth/login.config.json` parsed once per run; a project with no `api_origins` key simply has no origins, so every `origin` step is refused `FAILED_NON_LOCAL_TARGET`.
- The plan writer has no shell tool in this session: the VALIDATE commands were derived by reading the current working tree (for example `classifyApiOrigin`, `deriveApiHeader` and `prepareApiStep` do not exist, so Tasks 1-2's checks exit non-zero before the work) and were not executed. Tasks 3 and 4 reuse the report-fixture shape and the `parse` output handling of phase 4's Task 2; if the shared parser needs a different heading shape, adjust the fixture, not the assertions. The Level 2 frozen-surface and forbidden-reference checks and Level 3 pass on the unmodified tree by design, as regression guards.
- Release is out of scope: the cut follows the phase 8 dogfood.

*Generated: 2026-10-06*
*Approved: 2026-10-06*
*Implemented: 2026-10-06*
*Status: IMPLEMENTED*
