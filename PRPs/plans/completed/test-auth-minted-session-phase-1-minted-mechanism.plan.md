# Feature: Minted mechanism (Phase 1 of test-auth-minted-session)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact (a shared kit template that every generated login script copies); secret handling (minted cookies, localStorage entries and tokens); shared contract change (the login template's mechanism set, `login.config.json` schema and the `KIT_TEMPLATE_ID` stamp); execution of a project command from a relay-shipped script
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — local-only guard (hard failure), secrecy proof before any secret write, credentials never in the conversation, the human validation gate stays open
  - `PRPs/prds/manual-qa-runner-auth-kit.prd.md` (APPROVED, phases 1-8 complete) — the four login mechanisms, the two-direction browser probe, stale-script detection (AC-24) and the `static-token` placement
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` (APPROVED, shipped in 0.44.0) — the seed trust gate (`status` exactly `confirmed`, written only by the operator) that this phase mirrors
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" — the review loop (`code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md`) and `capture.mjs` stay byte-identical (AC-13)
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - `docs/context/methodology.md`: `tdd: false`, `test_frameworks: ["node:test"]` — test-after, R-X strict: the Implementer authors zero test files
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — minted tokens and cookie values are the dominant risk of this feature; no halt line may contain a value
  - "Writing pipeline artifacts under `.claude/`"
  - "Relying on interactive permission prompts in the autonomous loop" — minting reads no terminal input; the one human act is confirming the command in a tracked file
  - "Activating the test pair by heuristic" / "Flipping any opt-in gating key by heuristic" — a mint command runs only after an explicit operator `confirmed`, never by inference
  - "Weakening or deleting tests to make the loop turn green" and R-X strict — no existing test may be edited by the Implementer
- Applicable architectural rules:
  - Interactivity boundary — no new extension: confirmation is an operator edit of a tracked file, as for seed declarations
  - Command versus agent separation — the kit's script runs the declared command; no agent composes or runs a command
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; the template is copied verbatim into the target project with a single `__RELAY_ROLE__` substitution and carries no npm dependency of its own
  - The local-only guard is a hard failure at every network- or store-touching site
- Result: PROCEED
```

## Source

- `PRPs/prds/test-auth-minted-session.prd.md` — Implementation Phases row 1: "Minted mechanism" — Goal: a role can hold a session no human ever logged into — Success signal: against a fixture app that authenticates from cookies set by a fake mint command, a role mints, proves, saves and reuses with no terminal attached. An unconfirmed block, a non-local store, a bad output shape and a failing command each halt by name and print no value. An expired session re-mints by itself.

## Summary

Adds a fifth mechanism, `minted`, to the test-auth kit's login template `plugins/relay/resources/auth-login.template.mjs`. A role declares a `mint` block (argv `command`, local `store`, operator-set `status`, optional token `header`/`valuePrefix`). When `status` is exactly `confirmed`, the script runs the command under the seed runner's protections (`shell:false`, 120 s timeout, 65536-byte stdout bound, stderr never captured, the local-only guard on every URL-bearing argv element and on the `store`), parses one JSON object under the fixed contract (`cookies`, `localStorage`, `token`, `expires_at`; nothing else), builds a Playwright storage-state directly from it (cookies on the `baseUrl` origin with path `/`, localStorage entries on that origin), writes the token artifact with the declared header and prefix, proves the in-memory session with the existing two-direction probes BEFORE anything is persisted, and saves atomically through the existing `writeSecret`. A saved minted session is reused while unexpired and proven; an expiry (by `expires_at`, by the token's `exp` claim, or by `maxAgeMinutes`) or a failed proof re-mints with no headed fallback and no prompt. `KIT_TEMPLATE_ID` becomes `auth-login/2`, which is what makes a script generated from `auth-login/1` halt `FAILED_KIT_SCRIPT_STALE` against the new plugin. The approach is strictly additive: the existing statements, anchors and invariants that the current template tests pin are left byte-for-byte where possible. Because `tdd: false` with `node:test` declared and R-X strict, the Implementer writes no test file; behavior is validated by a non-test fixture harness (fixture app + fake mint command) kept in the ignored `PRPs/reports/` scratch area, and the test pair authors the permanent suite afterwards.

## User Story

As the operator of relay's human validation gate in a project whose login cannot be scripted
I want a role's session to be issued by a confirmed local project command and placed by the kit
So that the login script produces a proven session with no browser window, no terminal prompt and no typed credential

## Problem Statement

In projects whose login cannot be scripted, the test-auth kit falls back to the `headed` mechanism, so the operator logs in by hand in a visible browser, typing a password, once per role and again whenever a saved session dies. The template's mechanism set is closed at `form`, `api`, `headed`, `static-token`, and `static-token` places a token only into localStorage or IndexedDB, never cookies. Phase 1 delivers the mechanism itself: the part of the feature that lives entirely in the login template.

## Solution Statement

Add `minted` to the template: schema and validation, the trust gate (`FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`), the guarded and bounded spawn (`FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND`), the output contract (`FAILED_MINT_OUTPUT`), direct storage-state construction, proof-before-save through the existing `proveSession`, reuse and re-mint, and the stamp bump. Runner integration (re-mint margin, IndexedDB secret registration, blocked-reason surfacing), kit authoring and the dogfood are Phases 2-4 and are not touched here. The template records each mint's expiry in a value-free sidecar `PRPs/auth/.sessions/<role>.mint.json` so Phase 3's runner can read the remaining lifetime without parsing a token.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (extension of an existing shared template) |
| Complexity | High (secret handling, command execution, shared template with many pinning tests) |
| Systems Affected | `plugins/relay/resources/auth-login.template.mjs`; validation fixtures under `PRPs/reports/test-auth-minted-session/phase-1-fixtures/` |
| Dependencies | Node >= 18; Playwright resolved at run time from `plugins/relay/scripts/visual` (already present; no new dependency) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/test-auth-minted-session.prd.md` lines 235, 244-253 (row 1 and Phase 1 details); AC-1..AC-8, AC-12 (halt half only), AC-13 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-auth-minted-session.prd.md` | 77-125, 195-217, 235, 244-253 | Acceptance criteria AC-1..AC-8 and AC-13, the architecture notes and this phase's scope |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 1-130 | Header schema, imports, stamp, path constants, the timing constants that existing tests anchor on |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 202-278 | `incompleteField`, where the `minted` branch and `mint` validation go |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 688-753 | `proveSession`, `sessionReusable`, `readTokenArtifact`, `reuseDecision`: the reuse and proof seams |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 1069-1355 | `main()` order (guard, stale check, secrecy, reuse, mechanism chain, proof, save) and `writeSecret` |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1248-1264, 1326-1331, 1829-1864 | The trust-gate and bounded-spawn precedent (`classifySeedDeclaration`, `normalizeStore`, `runSeed`) |
| P0 | `scripts/validate/checks/auth-login-template.test.mjs` | 643-686 | `templateFindings`: source invariants every template edit must keep (one `writeFileSync(`, run order, no console output, `maxRedirects: 0` count) |
| P1 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 19-20, 29-40, 104-111 | The template is already a registered guard site; the three markers must stay exactly once and in order |
| P1 | `scripts/validate/checks/auth-local-guard-sites.test.mjs` | 52-54, 84-89 | Why this plan does not append tokens to the template's `GUARD_SITES` entry (it would change the test's baseline template body) |
| P1 | `scripts/validate/checks/auth-login-template.test.mjs` | 187-223 | How a template copy is run against a fixture (project scaffold, async spawn) that the harness mirrors |
| P2 | `docs/context/methodology.md` | 1-10 | `tdd: false`, `test_frameworks: ["node:test"]`: test-after, R-X strict |

## Patterns to Mirror

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:202-209
function incompleteField(role) {
  // A role that declares a browser probe does not consult the HTTP probe at all
  // (form, api, headed), so probe.path and probe.method are optional for it.
  const probeOptional = hasBrowserProbe(role) && ['form', 'api', 'headed'].includes(role.mechanism);
  const tbd = findTbd(probeOptional ? { ...role, probe: undefined } : role, `roles.${ROLE}`);
  if (tbd) return tbd;
  /** @type {string[]} */
  let required = probeOptional ? ['mechanism'] : ['mechanism', 'probe.path', 'probe.method'];
```
Copied by Task 2 (add `'minted'` to `probeOptional`, add a `minted` branch before the final `else`).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1253-1259
  if (decl.command === null) {
    const gap = isStr(decl.gap) && decl.gap !== '' ? `: ${decl.gap.slice(0, 200)}` : '';
    return { code: 'STATE_COMMAND_MISSING', reason: `no project command is declared for the required state ${JSON.stringify(text)}${gap}` };
  }
  if (decl.status !== 'confirmed') {
    return { code: 'STATE_UNCONFIRMED', reason: `the seed declaration for the required state ${JSON.stringify(text)} is not confirmed; review the entry and set "status": "confirmed" in PRPs/auth/qa-seed.json` };
  }
```
Copied by Task 2 (the order: a missing command is reported before an unconfirmed status; only exactly `confirmed` runs).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1326-1331
export function normalizeStore(store) {
  if (!isStr(store) || store === '' || /\s/.test(store)) return null;
  if (store.includes('://')) return store;
  if (/^[A-Za-z0-9._-]+(:\d+)?$/.test(store)) return `http://${store}`;
  return null;
}
```
Copied by Task 3 (the template cannot import qa-run helpers; it carries a local equivalent).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1845-1854
  const r = captures === null
    ? spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: 'ignore', timeout: 120000 })
    : spawnSync(argv[0], argv.slice(1), { shell: false, cwd: ctx.root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: 65536, timeout: 120000 });
  if (r.error) {
    if (captures !== null && /** @type {any} */ (r.error).code === 'ENOBUFS') {
      return { ok: false, code: 'CAPTURE_MISSING', reason: 'the seed output exceeded the 65536-byte capture bound' };
    }
    return { ok: false, code: 'SEED_FAILED', reason: 'the declared seed command could not be run or timed out' };
  }
  if (r.status !== 0) return { ok: false, code: 'SEED_FAILED', reason: `the declared seed command exited with status ${r.status}` };
```
Copied by Task 3 (spawn options, ENOBUFS handling, status-only failure text; stderr is never captured).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:749-753
function reuseDecision(proof) {
  if (proof === 'proven') return true;
  if (proof === 'expired' || proof === 'error') return false;
  return { halt: PROBE_HALTS[proof] };
}
```
Copied by Task 4 (a minted reuse maps a failed proof to a re-mint; the halting classes stay halts).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:1182-1195
  const reuse = args.force
    ? false
    : role.mechanism === 'static-token'
      ? await staticTokenReusable(root, cfg, role, getPlaywright, guard, target.allowedHosts)
      : await sessionReusable(root, cfg, role, getPlaywright, guard, target.allowedHosts);
  if (typeof reuse === 'object') {
    err(reuse.halt);
    return 1;
  }
  if (reuse) {
    process.stdout.write(`SESSION_REUSED: ${SESSION_REL}\n`);
    process.stdout.write(`auth_mode: storage-state:${SESSION_REL}\n`);
    return 0;
  }
```
Copied by Task 4 (the reuse dispatch gains a `minted` arm and keeps `await sessionReusable(` for the other mechanisms).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:1320-1335
  writeSecret(root, SESSION_REL, `${JSON.stringify(state, null, 2)}\n`);
  if (token !== null) {
    const exp = jwtExp(token);
    /** @type {Record<string, string>} */
    const artifact = { token };
    if (exp !== null || role.maxAgeMinutes !== null) {
      const expiresAt = exp !== null ? new Date(exp * 1000) : new Date(Date.now() + role.maxAgeMinutes * 60000);
      artifact.expires_at = expiresAt.toISOString();
    }
    artifact.obtained_at = new Date().toISOString();
    if (role.mechanism === 'static-token') {
      artifact.header = role.staticToken.header;
      artifact.value_prefix = role.staticToken.valuePrefix;
    }
    writeSecret(root, TOKEN_REL, `${JSON.stringify(artifact, null, 2)}\n`);
  }
```
Copied by Task 4 (the shared save tail gains the minted header/prefix, the minted expiry, the sidecar and the stale-artifact removal).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:1349-1355
function writeSecret(root, rel, content) {
  const dest = join(root, rel);
  mkdirSync(join(dest, '..'), { recursive: true });
  const tmp = `${dest}.tmp`;
  writeFileSync(tmp, content, { encoding: 'utf8', mode: 0o600 });
  renameSync(tmp, dest);
}
```
Copied by Task 4 (every new file the template writes goes through this function; `writeFileSync(` must stay the only occurrence).

```
# SOURCE: scripts/validate/checks/auth-login-template.test.mjs:209-223
function run(proj, extraArgs = [], opts = {}) {
  const args = [proj.script, ...(opts.pluginFlag === false ? [] : ['--plugin-root', proj.pluginRoot]), '--root', proj.root, ...extraArgs];
  return new Promise((done) => {
    const child = spawn(process.execPath, args, {
      cwd: proj.root,
      env: { ...BASE_ENV, ...(opts.env ?? {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => done({ status, stdout, stderr }));
  });
}
```
Copied by Task 1 (the harness runs a template copy as an ASYNC child so the in-process fixture server is never blocked).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/auth-login.template.mjs` | UPDATE | The whole mechanism: header schema, stamp bump to `auth-login/2`, `mint` validation, trust gate, guarded spawn, output contract, placement, proof, reuse and re-mint |
| `PRPs/reports/test-auth-minted-session/phase-1-fixtures/values.mjs` | CREATE | Distinctive fixture secret values shared by the harness and the fake mint command (so the no-leak scan has fixed needles) |
| `PRPs/reports/test-auth-minted-session/phase-1-fixtures/fake-mint.mjs` | CREATE | The fake mint command: a node script printing the contract JSON in selectable modes, counting its runs |
| `PRPs/reports/test-auth-minted-session/phase-1-fixtures/minted-smoke.mjs` | CREATE | The validation harness: a 127.0.0.1 fixture app that authenticates from the minted cookie plus localStorage, and the scenarios that exercise AC-1..AC-8 against a copy of the template. A plain node script with exit-code semantics, not a `node:test` file and not matched by any test glob |

## NOT Building (Scope Limits)

- **The project-side issuing command** for any project (including `super-ensino`): project work, agreed with the operator in Phase 4.
- **Hardening of the existing `userCreation.command` spawn**: a separate recorded defect; that code is left untouched.
- **Any non-local target, store or account**: the local-only guard is permanent and applied to `baseUrl`, URL-bearing argv elements and the `store`.
- **IndexedDB placement for minted roles (Open Question 3, the Could-item): decided OUT of Phase 1.** The output contract of AC-5 is closed ("nothing else"): it has no IndexedDB key, so there is nothing to place, and `super-ensino` does not need it. `needsIndexedDb` and the `static-token` placement code are left unchanged; Phase 3 separately registers IndexedDB values as secrets in the runner.
- **Runner integration** (re-mint margin before expiry, secret registration, named `blocked` reasons): Phase 3. This phase only records the expiry in the sidecar the runner will read.
- **Kit authoring** (auth-model template/writer/reviewer, `/relay-auth-scripts` generating or refreshing the `mint` block, command docs, `documentation/` registration, and the `--refresh` half of AC-12): Phase 2. Only the stale-stamp halt half of AC-12 is delivered here, by the stamp bump.
- **The dogfood** in `super-ensino`: Phase 4.
- **Changes to the code-review loop or `capture.mjs`**: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` stay byte-identical (AC-13).
- **Any edit to an existing `*.test.mjs` file, or any new `*.test.mjs` file**: R-X strict; the test pair owns them.
- **Any edit to `scripts/validate/checks/auth-local-guard-sites.mjs`**: the template is already a registered guard site; this phase adds no new site file and no new marker.
- **Any new entry to the secrecy `ensure` call's `--path` list**: the sidecar lives under the same `.sessions/` directory whose ignore rule the existing paths already prove.

## Step-by-Step Tasks

### Task 1: CREATE the validation fixtures (values.mjs, fake-mint.mjs, minted-smoke.mjs)

- **ACTION**: Infrastructure/scaffolding task: it delivers no acceptance criterion by itself; it creates the fixture app and fake mint command that every later task's VALIDATE runs, and it exercises AC-A1 through AC-A10. Create the directory `PRPs/reports/test-auth-minted-session/phase-1-fixtures/` with three plain node ESM files. They are NOT `node:test` files, are not named `*.test.mjs`, and must not be created anywhere else.
  1. `values.mjs` exports distinctive constants: `COOKIE_NAME = 'sid'`, `COOKIE_VALUE = 'MINT-COOKIE-7f3a91'`, `LS_KEY = 'app_state'`, `LS_VALUE = 'MINT-LS-5c20bd'`, `TOKEN_VALUE = 'MINT-TOKEN-e41d08'`. (The declared store in every scenario is the fixture app's own `127.0.0.1:<port>`.)
  2. `fake-mint.mjs` is run as `node fake-mint.mjs --mode <m> [--count-file <path>] [--ttl <seconds>]`. It appends one line to `--count-file` on every run (so a scenario can assert how many times the command ran), writes nothing to stderr except in mode `exit3`, and prints exactly one JSON object to stdout per mode: `ok` (cookies `{sid: COOKIE_VALUE}`, localStorage `{app_state: LS_VALUE}`, token `TOKEN_VALUE`-carrying JWT whose payload `exp` is now + `--ttl` seconds (default 3600), and `expires_at` the same instant as ISO-8601); `token-only` (only `token`); `ls-only` (only `localStorage`); `unknown-key` (ok plus a key named `extra`); `bad-cookie-type` (cookies whose value is the number 7); `empty-object` (`{}`); `not-json` (the text `not json`); `oversized` (a valid JSON string of more than 70000 bytes); `exit3` (prints nothing to stdout, a line to stderr, exit status 3); `past-expiry` (ok but `expires_at` one hour in the past). For the JWT, build `header.payload.sig` with base64url segments so the template's `jwtExp` reads `exp`, and make the token string contain `TOKEN_VALUE`.
  3. `minted-smoke.mjs` is run as `node minted-smoke.mjs <scenario>`, where `<scenario>` is one of `gate`, `stale-stamp`, `nonlocal`, `command-failure`, `output-shape`, `mint-reuse`, `remint`, `proof-fail`, `browser-probe`, or `all` (runs every scenario in order and exits non-zero at the first failure); `--list` prints the scenario names and exits 0. It starts an in-process HTTP server on `127.0.0.1` port 0 (the fixture app): `GET /` serves a page whose script fetches `/api/session` and renders `<div id="authed">` plus `<span id="who">admin</span>` only when the response is 2xx AND `localStorage.getItem('app_state') === LS_VALUE`; `/api/session` answers 200 iff the request cookie header carries `sid=COOKIE_VALUE` and the server is not in `revoked` state; `/api/me` answers 200 iff the `authorization` header equals `Bearer ` plus the token the fake mint issued (any JWT containing `TOKEN_VALUE`) and the server is not revoked, else 401; `GET /__revoke` and `GET /__restore` flip `revoked`; any request whose path contains `login` increments a `loginRequests` counter and answers 404. For each scenario it builds a throwaway project directory with `git init -q` (using the clean-environment pattern `GIT_CONFIG_GLOBAL` empty file, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CEILING_DIRECTORIES`), writes `PRPs/auth/login.config.json` with `baseUrl` the fixture origin and a role `admin` of `mechanism: 'minted'`, `probe: {path: '/api/me', method: 'GET'}`, `sessionCookie: 'sid'`, `maxAgeMinutes: 60`, `credentials: {usernameEnv: null, passwordEnv: null}`, `userCreation: {command: null}` and `mint: {command: [process.execPath, <fake-mint.mjs absolute path>, '--mode', 'ok', '--count-file', <path>], store: '127.0.0.1:<port>', status: 'confirmed'}`, and copies `plugins/relay/resources/auth-login.template.mjs` into the project with every `__RELAY_ROLE__` replaced by `admin` (resolve the template and plugin root from `import.meta.url`, never from the cwd). It runs the copy as an ASYNC child (`spawn`, `stdio: ['ignore','pipe','pipe']`, so no terminal is attached and no credential is in the environment) with `--plugin-root <absolute plugins/relay> --root <project>`, and asserts exit codes, the printed halt codes and the files on disk. After EVERY scenario it also scans the child's stdout and stderr for each needle in `values.mjs` and for the full minted JWT, failing if any is found. Any failed assertion prints `FAIL: <scenario>: <reason>` to stderr and exits 1; success prints `PASS: <scenario>` and exits 0. The scenario assertions are:
     - `gate`: status `proposed` with a command exits 1 with `FAILED_MINT_UNCONFIRMED` naming the role and `PRPs/auth/login.config.json`, count file absent (nothing ran); status `Confirmed` (wrong case) and status absent likewise; `command: null` with status `confirmed` exits 1 with `FAILED_MINT_COMMAND_MISSING`; control: the same project with status exactly `confirmed` and a command exits 0.
     - `stale-stamp`: a copy whose stamp line is rewritten to `auth-login/1` exits 1 with `FAILED_KIT_SCRIPT_STALE` and the output contains both `auth-login/1` and `auth-login/2`; no `PRPs/auth/.sessions` directory exists.
     - `nonlocal`: `store: 'prod.example.com'`, `store: 'https://evil.example/db'`, a store the guard cannot evaluate (`'not a store'`), a missing `store`, and a command argv element `--url=https://evil.example/x` each exit 1 with `FAILED_NON_LOCAL_TARGET`, with the count file absent; control: the `127.0.0.1:<port>` store and a loopback URL argv element run.
     - `command-failure`: mode `exit3` exits 1 with `FAILED_MINT_COMMAND` naming status 3, whose output does not contain the stderr line the command printed; mode `oversized` exits 1 with `FAILED_MINT_COMMAND` naming the 65536-byte bound; a command that does not exist (`['definitely-not-a-binary-xyz']`) exits 1 with `FAILED_MINT_COMMAND`; in all three no `.sessions/admin.json` exists. (The 120 s timeout is covered by source inspection in Level 2, not by a 120 s wait.)
     - `output-shape`: modes `unknown-key` (names the key `extra`), `bad-cookie-type`, `empty-object`, `not-json`, `past-expiry` each exit 1 with `FAILED_MINT_OUTPUT`, no session files written, and no needle in the output.
     - `mint-reuse`: with the HTTP probe only (no `browserProbe`), a first run exits 0, prints `SESSION_MINTED: PRPs/auth/.sessions/admin.json` and `auth_mode: storage-state:PRPs/auth/.sessions/admin.json`; the count file has 1 line; `loginRequests` is 0; `admin.json` holds a cookie `sid` on domain `127.0.0.1`, path `/`, and an origin entry whose localStorage holds `app_state`; `admin.token.json` holds the token plus `header: 'Authorization'`, `value_prefix: 'Bearer '` and an `expires_at`; `admin.mint.json` exists and its text contains no needle; the `.sessions` directory holds no `.tmp` leftovers; the saved state loaded with Playwright (`createRequire(<absolute plugins/relay/scripts/visual/package.json>)('playwright')`) into a fresh browser context renders `#authed` on the fixture app, while a context with no state does not; a second run exits 0 with `SESSION_REUSED`, and the count file still has 1 line; a `token-only` role configuration (`sessionCookie: null`) mints and saves a token artifact and a state with no cookies; an `ls-only` configuration with a `browserProbe` mints without a token artifact.
     - `remint`: starting from a minted and saved session, (a) rewriting `admin.mint.json` `expires_at` into the past, (b) calling `/__revoke` (server-side invalidation, proof fails) followed by `/__restore` before the re-mint is proven, (c) deleting `admin.json`, and (d) aging `admin.json` past `maxAgeMinutes` with `utimesSync` each end with a new `SESSION_MINTED` and a count file that grew by exactly 1, with exit 0 and no terminal; case (b) calls `/__revoke` immediately before the run and has the fake mint's `--mode ok` command call `/__restore` on the fixture origin (pass the origin to the fake mint as `--restore-url`) so the freshly minted session is valid; an expired JWT case: a token minted with `--ttl 30` is treated as expiring (within the 60 s floor) and re-minted on the next run. In none of them is a visible browser launched or a prompt printed (assert the output holds neither `FAILED_INTERACTIVE_LOGIN_REQUIRED` nor a prompt text).
     - `proof-fail`: when the fixture is `revoked` for the whole run, the mint runs once, the proof fails, and the run exits 1 with `FAILED_LOGIN_REJECTED` (HTTP probe) and no `admin.json`, `admin.token.json` or `admin.mint.json` is written.
     - `browser-probe`: a role with `browserProbe: {route: '/', marker: {kind: 'selector', value: '#authed'}, roleMarker: {kind: 'selector', value: '#who'}}`, no `probe`, and a template copy whose three timing literals are shortened by anchored replacement (each of `const BROWSER_PROBE_POSITIVE_MS = 15000;` to 4000, `const BROWSER_PROBE_SETTLE_MS = 5000;` to 1500 and `const BROWSER_PROBE_DWELL_MS = 5000;` to 1500, each asserted to occur exactly once in the copy, never in the shipped template) mints and prints `SESSION_MINTED`; with a `roleMarker` of `#nobody` it halts `FAILED_PROBE_WRONG_ACCOUNT` and saves nothing.
- **MIRROR**: `scripts/validate/checks/auth-login-template.test.mjs:209-223` (the async-child `run()` shape, the temp git project scaffold, the loopback server) in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; D=PRPs/reports/test-auth-minted-session/phase-1-fixtures; node --check $D/values.mjs; node --check $D/fake-mint.mjs; node --check $D/minted-smoke.mjs; node $D/minted-smoke.mjs --list` (each command's own non-zero status fails the block; `--list` exits 0 only when the harness loads and enumerates its scenarios). Additionally exercise the fake mint directly so the contract is real: `node $D/fake-mint.mjs --mode ok | node -e "const o=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!o.cookies||!o.localStorage||typeof o.token!=='string'||typeof o.expires_at!=='string') process.exit(1)"`.

### Task 2: UPDATE the template: stamp, schema, validation and the trust gate

- **ACTION**: Delivers AC-A2 (only a confirmed command runs) and AC-A10 (the stamp is `auth-login/2`, so an `auth-login/1` script halts `FAILED_KIT_SCRIPT_STALE` naming both identities; the `--refresh` half of PRD AC-12 is Phase 2). Edit `plugins/relay/resources/auth-login.template.mjs` additively, leaving every other statement byte-for-byte:
  1. Replace the stamp line with `const KIT_TEMPLATE_ID = 'auth-login/2';` (same line, still above `const ROLE`, still one occurrence of the `const KIT_TEMPLATE_ID = ` prefix).
  2. In the header docblock: add `"minted"` to the `mechanism` union on the `"mechanism":` line; add a `"mint": null | { "command": string[] | null, "store": string, "status": "proposed" | "confirmed", "header": string (optional, default "Authorization"), "valuePrefix": string (optional, default "Bearer ") }` schema line; and add a paragraph describing the `minted` mechanism: no login happens; the script runs the operator-confirmed `mint.command` (argv, `shell:false`, 120 s timeout, 65536-byte stdout bound, stderr never captured) only when `mint.status` is exactly `confirmed`, after the local-only guard has accepted `baseUrl`, every URL-bearing argument and `mint.store`; the command prints one JSON object with optional keys `cookies` (name to string), `localStorage` (key to string), `token` (string), `expires_at` (ISO-8601 instant), at least one of `cookies`/`localStorage`/`token` non-empty, nothing else; the halts `FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND`, `FAILED_MINT_OUTPUT`; success prints `SESSION_MINTED`; there is never a headed fallback or a prompt. The header text MUST NOT contain the strings `writeFileSync(`, `console.log`, `console.error`, `console.info`, `--local-host`, or any of the three marker comments `// GUARD-SITE`, `// SECRECY-SITE`, `// WRITE-SITE`.
  3. After the `CREDENTIALS_REL` constant add `const MINT_REL = `PRPs/auth/.sessions/${ROLE}.mint.json`;`, `const MINT_TIMEOUT_MS = 120000;`, `const MINT_MAX_STDOUT_BYTES = 65536;` and `const MINT_EXPIRY_FLOOR_MS = 60000;` (the same 60 s floor the existing cookie-expiry reuse rule uses; the runner's larger re-mint margin is Phase 3's Open Question). Do not touch the `BROWSER_PROBE_*` constants.
  4. In `incompleteField`, add `'minted'` to the `probeOptional` mechanism list, and add an `else if (role.mechanism === 'minted')` branch before the final `else`: return `roles.${ROLE}.mint` when `role.mint` is not a non-array object; return `roles.${ROLE}.mint.command` when `role.mint.command` is `undefined`, or is neither `null` nor an array of non-empty strings; return `roles.${ROLE}.mint.header` or `roles.${ROLE}.mint.valuePrefix` when present but not a string. Do NOT validate `mint.store` or `mint.status` here (they are the guard's and the gate's concern, AC-A2 and AC-A3). A role's `maxAgeMinutes` keeps the existing rule (a positive number).
  5. Add a function `mintGate(role)` above `main` returning `null` or a halt line: when `role.mint.command === null` return `FAILED_MINT_COMMAND_MISSING: roles.${ROLE}.mint.command in PRPs/auth/login.config.json declares no command; nothing was run`; otherwise when `role.mint.status !== 'confirmed'` return `FAILED_MINT_UNCONFIRMED: roles.${ROLE}.mint.status in PRPs/auth/login.config.json is not "confirmed"; the command was not run`. (A missing command is reported before an unconfirmed status, as `classifySeedDeclaration` does: there is nothing to confirm.) In `main`, immediately after the `incompleteField` halt and BEFORE the reuse dispatch, when `role.mechanism === 'minted'` call `mintGate(role)` and, if it returns a line, `err(line)` and return 1. The gate applies on every run, including a would-be reuse, so a block the operator flips back to `proposed` halts.
  Do not add any occurrence of `resolveCredentials(root, role);`, `writeFileSync(`, or a second marker comment.
- **MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:202-209` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1253-1259` in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; node --check plugins/relay/resources/auth-login.template.mjs; D=PRPs/reports/test-auth-minted-session/phase-1-fixtures; node $D/minted-smoke.mjs gate; node $D/minted-smoke.mjs stale-stamp` (the `gate` scenario runs the real template copy against the fixture and fails on a wrong halt code, a command that ran, or a leaked value; `stale-stamp` fails unless an `auth-login/1` copy halts naming both identities).

### Task 3: UPDATE the template: the guarded, bounded mint command, its output contract and the minted branch

- **ACTION**: Delivers AC-A3 (minting stays local), AC-A4 (bounded and silent) and AC-A5 (the contract is enforced without leaking). Add five helper functions to `plugins/relay/resources/auth-login.template.mjs`, placed after `placeStaticToken` and before `main`'s JSDoc, with no change to existing code and no new marker comment:
  1. `normalizeMintStore(store)`: the same behavior as `normalizeStore` (`# SOURCE: plugins/relay/scripts/qa-run.mjs:1326-1331`): non-string, empty or whitespace-containing returns `null`; a string containing `://` is returned as is; `host` or `host:port` made of `[A-Za-z0-9._-]` becomes `http://<store>`; anything else is `null`.
  2. `async function guardMint(role, guard, root)` returning `null` or a halt line. For each element `a` of `role.mint.command`, check `a` and the part after its first `=`: any candidate containing `://` goes through `await guard.checkTarget(candidate, { root })` and a not-ok result returns `FAILED_NON_LOCAL_TARGET: a mint command argument names a non-local URL (${r.reason}); the command was not run` (the reason is the guard's own static reason, never the URL). Then `normalizeMintStore(role.mint.store)`: `null` returns `FAILED_NON_LOCAL_TARGET: the mint block names no checkable store; the command was not run` (a store the guard cannot evaluate is refused, never assumed local); a normalized store that fails `guard.checkTarget` returns `FAILED_NON_LOCAL_TARGET: the declared mint store is not local (${r.reason}); the command was not run`. The `baseUrl` is already checked by the existing guard step in `main` and is not re-checked.
  3. `runMintCommand(root, argv)` returning `{ ok: true, text }` or `{ ok: false, halt }`: `spawnSync(argv[0], argv.slice(1), { shell: false, cwd: root, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: MINT_MAX_STDOUT_BYTES, timeout: MINT_TIMEOUT_MS })`; an `r.error` whose `code` is `ENOBUFS` returns `FAILED_MINT_COMMAND: the output exceeded the 65536-byte bound`; any other `r.error` returns `FAILED_MINT_COMMAND: the command could not be run or timed out`; a non-zero `r.status` returns `FAILED_MINT_COMMAND: the command exited with status ${r.status}`. stderr is never captured, echoed or included in any line. Do not pass `env` (the command inherits the environment, as the seed runner's does).
  4. `parseMintOutput(text)` returning `{ ok: true, out: { cookies, localStorage, token, expiresAtMs } }` or `{ ok: false, halt }`, every halt beginning `FAILED_MINT_OUTPUT: ` and naming only a top-level key name or a JS type, never a value: the text must `JSON.parse` to a plain object (otherwise `the output is not one JSON object`); every top-level key must be one of `cookies`, `localStorage`, `token`, `expires_at` (otherwise `the output has an unexpected key "<key>"`); `cookies` and `localStorage`, when present, must be plain objects whose values are all strings (otherwise `"cookies" must map names to strings` and the same for `"localStorage"`; a non-empty key is required); `token`, when present, must be a non-empty string; `expires_at`, when present, must be a string that parses with `Date.parse` to a finite instant that is later than now (otherwise `"expires_at" must be an ISO-8601 instant in the future`); and at least one of `cookies` (non-empty), `localStorage` (non-empty) or `token` must be present (otherwise `the output carries no cookies, localStorage entries or token`). `expiresAtMs` is the parsed instant or `null`.
  5. Add `buildMintedState(cfg, out)` returning a Playwright storage-state object built directly from the parsed output, with no browser: `origin = new URL(cfg.baseUrl).origin`; each cookie becomes `{ name, value, domain: <baseUrl hostname>, path: '/', expires: out.expiresAtMs !== null ? Math.floor(out.expiresAtMs / 1000) : -1, httpOnly: false, secure: <baseUrl protocol is https:>, sameSite: 'Lax' }`; `origins` is `[{ origin, localStorage: [{ name, value }, ...] }]` when there are localStorage entries, else `[]`.
  6. In `main`, declare `let mintExpiresAtMs = null;` beside `let promptedToken`, and add an `else if (role.mechanism === 'minted')` branch to the mechanism chain, placed after the `static-token` branch and before the final `else`: run `guardMint(role, guard, root)` and on a halt `err` it and return 1; `if (!requirePlaywright()) return 1;`; `runMintCommand(root, role.mint.command)` then `parseMintOutput(...)`, each halt printed with `err` and returning 1; then `state = buildMintedState(cfg, parsed.out)`, `token = parsed.out.token`, `mintExpiresAtMs = parsed.out.expiresAtMs`. The branch never calls `readLine`, never launches a headed browser and never reads credentials. It must not contain the text `writeSecret(root, SESSION_REL` or `resolveCredentials(root, role);` (the existing run-order invariant requires their first occurrences to be in that order after the reuse dispatch).
  Keep the file free of `console.*`, a second `writeFileSync(` and `--local-host`. Persisting the minted state, the sidecar and the reuse path are Task 4.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1845-1854` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1326-1331` in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; node --check plugins/relay/resources/auth-login.template.mjs; grep -q "timeout: MINT_TIMEOUT_MS" plugins/relay/resources/auth-login.template.mjs; grep -q "maxBuffer: MINT_MAX_STDOUT_BYTES" plugins/relay/resources/auth-login.template.mjs; D=PRPs/reports/test-auth-minted-session/phase-1-fixtures; for s in nonlocal command-failure output-shape; do node $D/minted-smoke.mjs $s; done` (the three scenarios run the real template copy against the fixture and fake mint command: every refusal, failure and bad shape must halt by name with the run counter and the written files proving nothing ran or was saved, and no fixture value in the output; the two greps are supplementary since the 120 s timeout cannot be waited out).

### Task 4: UPDATE the template: proof, save, reuse and re-mint wiring

- **ACTION**: Delivers AC-A1 (a minted session needs no human input), AC-A6 (values land where the application expects them, saved and loadable), AC-A7 (proof before save or reuse), AC-A8 (expiry and invalidation re-mint automatically) and AC-A9 (the four frozen files stay byte-identical: touch none of them). Edit `plugins/relay/resources/auth-login.template.mjs`:
  1. Add `unlinkSync` to the `node:fs` import list (the only import change).
  2. Add `mintTokenArt(role, token)` returning `{ token, header, value_prefix }` with `header` defaulting to `Authorization` and `value_prefix` defaulting to `Bearer ` (a `role.mint.header` that is a string is used with `role.mint.valuePrefix` when that is a string, else an empty prefix), so the proof presents the token exactly as the runner's `sessionAuthHeaders` will.
  3. Add `async function mintedReusable(root, cfg, role, getPlaywright, guard, allowedHosts)` modeled on `sessionReusable`/`staticTokenReusable`: false when `admin.json` (the `SESSION_REL` file) is absent or lacks `cookies`/`origins` arrays; false when `maxAgeMinutes` has elapsed since the file's mtime; false when the sidecar `MINT_REL` (read with `readJson`, an unreadable one is treated as carrying no expiry) has an `expires_at` that is not later than `Date.now() + MINT_EXPIRY_FLOOR_MS`; false when the token artifact's `expires_at` or its token's `jwtExp` claim is not later than that same floor; false when `role.sessionCookie` is declared and no unexpired such cookie is in the file (the existing rule); otherwise `getPlaywright()` (false when unresolvable), then `reuseDecision(await proveSession(cfg, role, file, readTokenArtifact(root), pw, guard, allowedHosts))`. A failed proof (`expired`/`error`) therefore re-mints; the halting classes (`not-protected`, `wrong-account`, `unloadable`) keep their existing halts.
  4. In `main`, extend the `reuse` ternary with a `role.mechanism === 'minted' ? await mintedReusable(...)` arm; leave the `await sessionReusable(` arm and everything after it as it is.
  5. Edit the shared tail minimally: (a) compute `const hasLocalStorage = state && Array.isArray(state.origins) && state.origins.some((/** @type {any} */ o) => o && Array.isArray(o.localStorage) && o.localStorage.length > 0);` and extend the `!hasCookies && token === null` clause to `!hasCookies && token === null && !hasLocalStorage`; (b) the `saveProof` call passes `role.mechanism === 'minted' && token !== null ? mintTokenArt(role, token) : (token !== null ? { token } : null)`; (c) inside the persistence block, after the existing `static-token` header/prefix assignment add, for a minted role, `artifact.header`/`artifact.value_prefix` from `mintTokenArt` and, when `mintExpiresAtMs !== null`, `artifact.expires_at = new Date(mintExpiresAtMs).toISOString()` (it overrides the jwt/max-age value); (d) for a minted role with `token === null`, remove a stale token artifact from a previous mint with `unlinkSync` inside a `try`/`catch` ignoring a missing file; (e) for a minted role write the sidecar through `writeSecret(root, MINT_REL, ...)` with `{ minted_at: <ISO now>, expires_at: <ISO of mintExpiresAtMs, else the token's jwt exp, else null> }` (no value of any kind); (f) the final status line is `SESSION_MINTED` for a minted role and `SESSION_CREATED` otherwise. Every new file is written with `writeSecret`; do not add a second `writeFileSync(`.
  6. Do not edit `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/scripts/visual/capture.mjs`, `scripts/validate/checks/auth-local-guard-sites.mjs`, any `*.test.mjs`, or the secrecy `ensure` argument list.
- **MIRROR**: `# SOURCE: plugins/relay/resources/auth-login.template.mjs:749-753`, `# SOURCE: plugins/relay/resources/auth-login.template.mjs:1182-1195`, `# SOURCE: plugins/relay/resources/auth-login.template.mjs:1320-1335` and `# SOURCE: plugins/relay/resources/auth-login.template.mjs:1349-1355` in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; node --check plugins/relay/resources/auth-login.template.mjs; D=PRPs/reports/test-auth-minted-session/phase-1-fixtures; for s in mint-reuse remint proof-fail browser-probe nonlocal command-failure output-shape gate stale-stamp; do node $D/minted-smoke.mjs $s; done; if git diff --quiet HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs; then echo "PASS: frozen files byte-identical"; else echo "FAIL: a frozen file changed"; exit 1; fi` (the scenarios run the real template copy against the fixture app and fake mint command; the final block fails if any of the four AC-13 files differs from HEAD).

## Validation Commands

All commands run from the repository root (the worktree root), with the fixture directory `PRPs/reports/test-auth-minted-session/phase-1-fixtures/` created by Task 1.

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
D=PRPs/reports/test-auth-minted-session/phase-1-fixtures
node --check plugins/relay/resources/auth-login.template.mjs
node --check $D/values.mjs
node --check $D/fake-mint.mjs
node --check $D/minted-smoke.mjs
if git diff --quiet HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs; then
  echo "PASS: the four AC-13 files are byte-identical"
else
  echo "FAIL: an AC-13 frozen file changed"; exit 1
fi
if git diff --unified=0 HEAD -- plugins/relay/resources/auth-login.template.mjs | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced"
fi
npm run validate
```

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
T=plugins/relay/resources/auth-login.template.mjs
grep -q "const KIT_TEMPLATE_ID = 'auth-login/2';" $T
grep -q "timeout: MINT_TIMEOUT_MS" $T
grep -q "maxBuffer: MINT_MAX_STDOUT_BYTES" $T
[ "$(grep -c 'writeFileSync(' $T)" = "1" ]
for m in '// GUARD-SITE' '// SECRECY-SITE' '// WRITE-SITE'; do [ "$(grep -c -e "$m" $T)" = "1" ]; done
if grep -nE 'console\.(log|error|info)' $T; then echo "FAIL: console output in the template"; exit 1; else echo "PASS: no console output"; fi
if grep -n -e '--local-host' $T; then echo "FAIL: retired flag in the template"; exit 1; else echo "PASS: no retired flag"; fi
node --test scripts/validate/checks/auth-login-template.test.mjs scripts/validate/checks/auth-probe-hardening.test.mjs scripts/validate/checks/auth-reuse-proof.test.mjs scripts/validate/checks/auth-static-token-indexeddb.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs scripts/validate/checks/qa-run-kit-hardening.test.mjs
```

### Level 3 DRY-RUN END-TO-END

```
set -euo pipefail
D=PRPs/reports/test-auth-minted-session/phase-1-fixtures
node $D/minted-smoke.mjs all
node --test "scripts/validate/**/*.test.mjs"
npm run validate
```

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** A role whose `mechanism` is `minted` and whose `mint` block is confirmed and well formed, run with no terminal attached and no credential in the environment, runs the declared command, places the returned values, proves the session and saves it, printing `SESSION_MINTED` and the session path; it opens no visible browser, reads no terminal input and sends no login request.
- **AC-A2 (PRD AC-2):** A `mint` block whose `status` is anything but exactly `confirmed` halts `FAILED_MINT_UNCONFIRMED` naming the role and `PRPs/auth/login.config.json` and runs nothing; `command: null` halts `FAILED_MINT_COMMAND_MISSING` naming the gap. No relay command or agent writes `confirmed` (nothing in this phase writes the `mint` block).
- **AC-A3 (PRD AC-3):** Before the command runs, the `baseUrl`, every URL-bearing argv element and the declared `store` pass the local-only guard; otherwise the script halts `FAILED_NON_LOCAL_TARGET` and runs nothing. A `store` the guard cannot evaluate is refused, never assumed local.
- **AC-A4 (PRD AC-4):** The command is spawned with `shell: false`, a fixed 120 s timeout and a 65536-byte stdout bound; its stderr is never echoed; a timeout, a non-zero exit or output over the bound halts `FAILED_MINT_COMMAND` naming only the exit status or the condition.
- **AC-A5 (PRD AC-5):** The stdout must be one JSON object with the optional keys `cookies` (name to string), `localStorage` (key to string), `token` (string) and `expires_at` (ISO-8601 instant), at least one of `cookies`, `localStorage` or `token` present and non-empty, and nothing else; any other shape halts `FAILED_MINT_OUTPUT` naming the offending key or type and never a value.
- **AC-A6 (PRD AC-6):** Every cookie is set on the `baseUrl` origin with path `/`, every localStorage entry is written on that origin, and a `token` is written to the token artifact with the role's declared header and prefix (default `Authorization: Bearer`); the saved storage-state loaded into a fresh browser context is authenticated. (The unchanged `capture.mjs` consumes this same storage-state file contract; its end-to-end authenticated render is proven in the Phase 4 dogfood, so this phase asserts the fresh-context render only.)
- **AC-A7 (PRD AC-7):** A placed minted session is proven before it is saved or reused with the role's declared probes exactly as for other mechanisms (browser probe: marker stably present with the session and absent without it, plus the role marker; HTTP probe: 2xx with the session and non-2xx without it); a failed proof right after minting halts with the existing probe codes and saves nothing.
- **AC-A8 (PRD AC-8):** A saved minted session that is unexpired and proven is reused with no command run (`SESSION_REUSED`); one that is expired by `expires_at`, by the token's `exp` claim or by `maxAgeMinutes`, or whose proof fails, is re-minted and saved with no human action; the script never falls back to a headed login or a terminal prompt.
- **AC-A9 (PRD AC-13):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content.
- **AC-A10 (PRD AC-12, halt half only):** The template stamp is `auth-login/2`, so a login script generated from `auth-login/1` halts `FAILED_KIT_SCRIPT_STALE` naming both template identities against this plugin; `/relay-auth-scripts --refresh` regeneration is delivered by Phase 2.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The mint command becomes an authentication backdoor outside the local environment | M | High | The gate runs the command only on exactly `confirmed`; the guard runs on `baseUrl`, URL-bearing argv and the `store` before the spawn; a store that cannot be evaluated is refused; the `nonlocal` scenario proves each refusal leaves the command's run counter at zero |
| A minted value leaks into a halt line, a log or the terminal | M | High | No halt line ever interpolates a parsed value (they name a key, a JS type, an exit status or a bound); stderr is `ignore`d; the harness scans every scenario's stdout and stderr for each fixture secret and the full JWT |
| An edit to the shared template breaks an existing test that anchors on its text or run order (`templateFindings`, the timing literals, the stamp structure, the marker order) | H | High | The change is additive; no existing statement is rewritten except the minimal tail edits named in Task 4; no new marker comment, no second `writeFileSync(`, no `resolveCredentials(root, role);` before the minted branch; Level 2 runs the six template-exercising test files and Level 3 the whole corpus with no exclusion |
| An existing test pins a literal this phase rewrites | M | Medium | Grounding found none: the stamp is read dynamically (`STAMP_LINE`) by the tests that use it, no test contains `auth-login/1`, none enumerates the four mechanisms as a set, and `GUARD_SITES` is not changed. If Level 3 nevertheless fails on a pinned literal, that test goes to the test pair as EXISTING_TEST_UPDATED through the lifecycle ledger; the Implementer must not edit it |
| The single-session rule invalidates a session in use | L | Medium | The script mints only when a saved session is expired or fails its proof; a valid session is reused with no command run (the `mint-reuse` scenario asserts the run counter) |
| `shell:false` cannot run a Windows `.cmd`/`.bat` shim directly | M | Low | The declared `command` is an argv array whose first element is an executable (`node`, `python`, `docker`); a project needing a shim wraps it as `["cmd", "/c", ...]` in its own declaration. Not solved in the template; recorded for Phase 4 |
| The application needs cookie attributes or extra cookies the contract cannot express | M | Medium | Per the PRD, an attribute becomes an additive optional field if the Phase 4 dogfood proves it necessary; Phase 1 sets path `/`, `Lax`, non-HttpOnly (matching the SPA that sets its own cookies from JavaScript) |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task below and no `## Files to Change` row
targets a test file, so this plan's `**VALIDATE**` commands exercise the
change directly rather than invoking the test framework.

- **Fixture files are not tests.** The three files under `PRPs/reports/test-auth-minted-session/phase-1-fixtures/` are plain node scripts with exit-code semantics, are not `node:test` files, match no `*.test.mjs` glob, and live in the ignored `PRPs/reports/` scratch area. They exist so each task's `**VALIDATE**` exercises the real effect (a template copy run against a fixture app and a fake mint command), not merely the presence of text. The test pair's permanent suite (a NEW file for AC-A1..AC-A8, AC-A10) may reuse the fixture design but is authored by the pair.
- **EXISTING_TEST_UPDATED candidates for the test pair (the plan's listing).** Grounding (read of the template, of `auth-login-template.test.mjs`, `auth-local-guard-sites.test.mjs`, `auth-static-token-indexeddb.test.mjs`, `auth-probe-hardening.test.mjs`, `auth-reuse-proof.test.mjs`, `qa-run-kit-hardening.test.mjs`, `auth-kit-commands-hardening.test.mjs`, `auth-scripts-command.test.mjs`) found NO test that pins a literal this phase rewrites: the stamp is read dynamically through `STAMP_LINE` regexes, no test contains the text `auth-login/1`, none enumerates the four mechanisms as a set, and the template's `GUARD_SITES` entry (`auth-local-guard-sites.mjs`) is deliberately unchanged so `auth-local-guard-sites.test.mjs` keeps its baseline template body and its count of ten. The watch-list, in order of risk, is therefore: `auth-probe-hardening.test.mjs` (the stamp-structure pin: exactly one `const KIT_TEMPLATE_ID = ` line above `const ROLE`, and the stale halt between the guard and secrecy markers with no write in that span; the timing-literal anchors), `auth-reuse-proof.test.mjs` and `auth-static-token-indexeddb.test.mjs` (anchored mutation of the template copy, each anchor must occur exactly once), `auth-login-template.test.mjs` (`templateFindings` and the `FAILED_LOGIN_CONFIG_INCOMPLETE` field pins), `auth-local-guard-sites.test.mjs` (only if `GUARD_SITES` were changed, which this plan forbids), `qa-run-kit-hardening.test.mjs` and `qa-run-api-origins.test.mjs` (they copy the template with a chosen stamp). The Level 3 corpus run therefore carries NO `--test-skip-pattern`: excluding exactly the tests the pair will update would exclude none. If an implementation attempt makes one of them fail, the Implementer opens a `TEST_CONTRACT_DISPUTE` (it never edits the test) and the test pair records the change as EXISTING_TEST_UPDATED. `auth-kit-commands-hardening.test.mjs`, `auth-scripts-command.test.mjs` and `auth-model-pair.test.mjs` pin command and model prose that Phase 2 changes, not this phase.
- **Decision: the mint spawn needs no new `GUARD_SITES` entry.** The template is already a registered guard site (`plugins/relay/resources/auth-login.template.mjs` with the three ordered markers), and the new spawn sits in that same file behind the single existing guard step plus the explicit argv and store checks. Appending required tokens to the template's entry would change the baseline body that `auth-local-guard-sites.test.mjs` hard-codes and force a test update for no safety gain; `npm run validate` (28 checks) stays green with the registry unchanged.
- **Decision: gate order.** `FAILED_MINT_COMMAND_MISSING` is reported before `FAILED_MINT_UNCONFIRMED` (a freshly generated `proposed` block with `command: null` reports the missing command first), mirroring `classifySeedDeclaration`; either way nothing runs. The gate also runs before a would-be reuse so an operator who flips a block back to `proposed` is halted.
- **Decision: expiry floor.** The script treats a session whose recorded expiry is within 60 s as expired (the existing cookie rule's floor). The larger re-mint margin that keeps a 5-minute access token alive across a run is Phase 3's Open Question and uses the `expires_at` this phase records in `PRPs/auth/.sessions/<role>.mint.json`.
- **Decision: IndexedDB for minted roles is not built** (see `## NOT Building`).
- **Timeout coverage.** The 120 s command timeout is verified by the Level 2 source checks (`timeout: MINT_TIMEOUT_MS`, `MINT_TIMEOUT_MS = 120000`) rather than a two-minute wait; a pair-authored test may exercise it with an anchored shortened copy.
- **Playwright resolution.** The harness and the template resolve Playwright through `plugins/relay/scripts/visual/package.json` (the template's `loadPlaywright` fallback, which the `node_modules` junction at the worktree root satisfies); no `NODE_PATH` is needed.

*Generated: 2026-10-08*
*Approved: 2026-10-08*
*Implemented: 2026-10-08*
*Status: IMPLEMENTED*
