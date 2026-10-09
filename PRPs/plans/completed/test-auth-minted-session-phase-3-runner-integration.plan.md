# Feature: Runner integration (Phase 3 of test-auth-minted-session)

```
**Decision Gate**
- Active context: none
- Activated criteria: secret handling (minted cookie, localStorage, token and IndexedDB values in a run); shared contract change (the runner's session handling and its named `blocked` reasons); cross-cutting artifact (a runner script and a command doc that downstream stages and the documentation site consume); execution of a kit script that in turn runs a project command
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" - local-only guard (hard failure), secrecy, credentials never in the conversation, the human validation gate stays open
  - `PRPs/prds/manual-qa-runner-auth-kit.prd.md` (APPROVED, phases 1-8 complete) - the runner calls each role's kit login script once per run; probe halts and the stale-script halt are already named `blocked` reasons
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` (APPROVED, shipped in 0.44.0) - the runner's single-write-helper, redact-before-write and seed trust-gate contracts that this phase must not disturb
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" - the review loop (`code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md`) and `capture.mjs` stay byte-identical (AC-13)
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - `docs/context/methodology.md`: `tdd: false`, `test_frameworks: ["node:test"]` - test-after, R-X strict: the Implementer authors zero test files
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" - minted tokens, cookies, localStorage and IndexedDB values must be registered for redaction; no halt reason may carry a value
  - "Writing pipeline artifacts under `.claude/`"
  - "Relying on interactive permission prompts in the autonomous loop" - the runner re-mints non-interactively
  - "Weakening or deleting tests to make the loop turn green" and R-X strict - no existing test may be edited by the Implementer
  - "Activating the test pair by heuristic" / "Flipping any opt-in gating key by heuristic" - the runner never writes `confirmed`; a re-mint still runs only behind the kit script's own `confirmed` gate
- Applicable architectural rules:
  - Interactivity boundary - no new extension
  - Command versus agent separation - the runner only calls the kit's login script; it composes and runs no project command itself
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - The local-only guard is a hard failure at every network- or store-touching site; this phase adds none (see Notes)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/test-auth-minted-session.prd.md` - Implementation Phases row 3: "Runner integration" - Goal: QA runs never meet a dead minted token, and never leak a minted value - Success signal: a fixture run whose minted token expires inside the margin is re-minted before the first case. A scan of the run directory and terminal finds no minted value.

## Summary

Teaches `/relay-qa-run` (`plugins/relay/scripts/qa-run.mjs` and `plugins/relay/commands/relay-qa-run.md`) three things about a `minted` role. First, when the runner obtains the role's session and the expiry the login script recorded in the value-free sidecar `PRPs/auth/.sessions/<role>.mint.json` (fallback: the token artifact's `expires_at`) falls within a fixed margin of the run start, the runner passes the kit script its existing `--force` flag so the script mints a new session (and proves it) before any case uses it. The margin is 240 seconds. The kit template is NOT changed: `--force` already skips every reuse decision, the `confirmed` gate still runs before it, and the 60 s floor inside the template stays as the script's own standalone behavior. Second, the runner registers IndexedDB record keys and values from the saved storage-state as secrets alongside the cookie, localStorage and token values it already registers, so a minted (or `static-token`) IndexedDB value echoed by the application is redacted from every evidence file. Third, a minted role's login halts (`FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND`, `FAILED_MINT_OUTPUT`) become named `blocked` reasons with an actionable, value-free sentence instead of the generic `SESSION_UNAVAILABLE`. The edit to `qa-run.mjs` is strictly additive (new constants and two pure exported helpers, one new spawn argument, one extra secrets loop line, one new `if` block) so no existing test anchor moves. Because `tdd: false` with `node:test` declared and R-X strict, the Implementer writes no test file; behavior is proven by a plain-node fixture harness kept in the ignored `PRPs/reports/` scratch area, and the test pair authors the permanent suite afterwards.

## User Story

As the operator of relay's human validation gate in a project that uses minted sessions
I want `/relay-qa-run` to refresh a short-lived minted session before the run and to redact every minted value it sees
So that no case meets a dead token and no minted value reaches a report, a run file or the terminal

## Problem Statement

The kit's login script reuses a saved minted session while it is more than 60 seconds from expiry. `super-ensino` access tokens live five minutes and cases take tens of seconds each, so a run that starts on a token with, say, 70 seconds left dies mid-run. Separately, `/relay-qa-run` registers cookie, localStorage and token values as secrets but not IndexedDB values (found in PRD grounding), and it reports every minted-login halt as the generic `SESSION_UNAVAILABLE`, hiding which of the five named causes the operator must fix.

## Solution Statement

Add the freshness check, the IndexedDB registration and the named reasons to the runner only. Re-mint is delegated to the kit script through its existing `--force` flag, so the trust gate, the local-only guard, the bounded spawn and the proof-before-save all stay in exactly one place (the template). The runner never runs a project command itself and never writes `confirmed`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature (extension of an existing runner script and its command doc) |
| Complexity | Medium (secret handling; a runner whose source text is pinned by many tests; no template change) |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md`; `docs/api-reference.md`; `documentation/reference/commands.html`, `documentation/reference/scripts.html`, `documentation/changelog.html`; validation fixtures under `PRPs/reports/test-auth-minted-session/phase-3-fixtures/` |
| Dependencies | Phase 1 (`minted` mechanism, `auth-login/2`, the `.mint.json` sidecar, `--force`); Node >= 18; Playwright resolved from `plugins/relay/scripts/visual` (already present; no new dependency) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/test-auth-minted-session.prd.md` lines 237, 265-271; AC-9, AC-10, the Should-item (IndexedDB secrets), AC-13, Open Question 2 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/test-auth-minted-session.prd.md` | 77-125, 195-217, 237, 265-271 | AC-9, AC-10, AC-13, the freshness note and this phase's scope |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 68-79 | `PROBE_BLOCK_CODES` and the stamp constants: where the new constants go |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 579-594 | `addSecretValues`: values shorter than 4 characters are ignored; the registration contract |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1737-1786 | `obtainSession`: the spawn, the secrets collection and the failure-code extraction this phase edits |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2426-2441 | The session-to-`blocked` mapping where the minted halt codes are surfaced |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 154-181, 1280-1290, 1638 | `parseArgs` (`--force`, unknown flag exits 2), `mintedReusable` and its 60 s floor, and the sidecar write that this phase reads (read-only here; the template is NOT edited) |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 418-431 | The Final output surface paragraph that lists the named `blocked` reasons |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 126-150 | Source invariants every qa-run.mjs edit must keep (one `writeFileSync(`, one `renameSync(`, marker counts, `OUTCOMES`, outcome literal vocabulary) |
| P1 | `scripts/validate/checks/qa-run.test.mjs` | 321-346, 867-889 | How a fixture project, the stub login script and a runner run are built; the fixture harness mirrors this |
| P1 | `scripts/validate/checks/auth-static-token-indexeddb.test.mjs` | 65-81, 186 | The shape of an `origins[].indexedDB` entry in a saved storage-state |
| P1 | `PRPs/reports/test-auth-minted-session/phase-1-fixtures/` | `values.mjs`, `fake-mint.mjs`, `minted-smoke.mjs` | The fake mint command (`--ttl`, `--count-file`, modes) and fixture app design that Phase 3's harness reuses |
| P1 | `scripts/validate/checks/auth-local-guard-sites.mjs` | 66-74 | The two qa-run entries of `GUARD_SITES`: confirms no entry needs to change |
| P1 | `documentation/AGENTS.md` | whole file | Binding contract for every `documentation/` edit (changelog entry mandatory) |
| P2 | `docs/context/methodology.md` | 1-10 | `tdd: false`, `test_frameworks: ["node:test"]`: test-after, R-X strict |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:68-75
/** Login-script halts surfaced as their own blocked reasons (a configuration or account problem). */
const PROBE_BLOCK_CODES = [
  'FAILED_PROBE_NOT_PROTECTED',
  'FAILED_PROBE_WRONG_ACCOUNT',
  'FAILED_PROBE_PAGE_UNLOADABLE',
  'FAILED_PROBE_MARKER_ABSENT',
  'FAILED_KIT_SCRIPT_STALE',
];
```
Copied by Task 2 (a sibling constant list for the minted halt codes, placed directly after this block; this block is not edited).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:585-594
export function addSecretValues(table, secretValues) {
  const known = new Set(table.entries.map((e) => e[0]));
  for (const v of secretValues) {
    if (typeof v === 'string' && v.length >= 4 && !known.has(v)) {
      table.entries.push([v, REDACTED]);
      known.add(v);
    }
  }
  table.entries.sort((a, b) => b[0].length - a[0].length);
}
```
Copied by Task 2 (the new IndexedDB collector returns a plain `string[]` handed to this function; it never writes the table itself).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1753-1759
    const r = spawnSync(process.execPath, [script, '--root', ctx.root, '--plugin-root', PLUGIN_ROOT], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      encoding: 'utf8',
      timeout: 120000,
    });
```
Copied by Task 3 (the only change is the argument array gaining `...(force ? ['--force'] : [])`; the options object is untouched).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1766-1774
        /** @type {string[]} */ const secrets = [];
        for (const c of Array.isArray(state.cookies) ? state.cookies : []) if (c && isStr(c.value)) secrets.push(c.value);
        for (const o of Array.isArray(state.origins) ? state.origins : []) {
          for (const e of Array.isArray(o && o.localStorage) ? o.localStorage : []) if (e && isStr(e.value)) secrets.push(e.value);
        }
        const tok = readJsonOrNull(join(ctx.root, 'PRPs', 'auth', '.sessions', `${role}.token.json`));
        const token = tok && isStr(tok.token) && tok.token !== '' ? tok.token : null;
        if (token !== null) secrets.push(token);
        addSecretValues(ctx.table, secrets);
```
Copied by Task 3 (one line is inserted between the `token` push and `addSecretValues`: `secrets.push(...collectIndexedDbSecrets(state));`; every existing line stays byte-identical).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2432-2440
    const s = obtainSession(ctx, role);
    if (!s.ok && s.code === 'FAILED_KIT_SCRIPT_STALE') {
      return out(blocked(s.code, `the kit login script for role ${role} was generated from a different template than the installed one (${s.detail ?? 'identities unknown'}); nothing was saved or reused; run /relay-auth-scripts --refresh`));
    }
    if (!s.ok && PROBE_BLOCK_CODES.includes(s.code)) {
      return out(blocked(s.code, `the kit's session probe for role ${role} halted; nothing was saved or reused`));
    }
    if (!s.ok) return out(blocked('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`));
    session = s.info;
```
Copied by Task 3 (a new `if` block for minted halts is inserted between the probe block and the generic `SESSION_UNAVAILABLE` line; neither neighbor is edited).

```
# SOURCE: plugins/relay/resources/auth-login.template.mjs:165-166
    } else if (a === '--force') {
      force = true;
```
Copied by Task 3 (the existing flag the runner passes to force a re-mint; any other unknown flag makes the script exit 2, so only `--force` may be added).

```
# SOURCE: scripts/validate/checks/qa-run.test.mjs:872-875
  const login = `import {writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';
const root=process.argv[process.argv.indexOf('--root')+1];
mkdirSync(join(root,'PRPs','auth','.sessions'),{recursive:true});
writeFileSync(join(root,'PRPs','auth','.sessions','admin.json'),${JSON.stringify(JSON.stringify(state))});\n`;
```
Copied by Task 1 (the harness's stub login script is the same shape; it additionally appends `process.argv` to a log file so a scenario can assert whether `--force` was passed).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | Margin constant, minted halt-code list and reasons, two pure helpers, the `--force` argument, IndexedDB secret registration, the named `blocked` mapping |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | Document the pre-run re-mint margin, IndexedDB redaction and the named minted halts in the Final output surface |
| `docs/api-reference.md` | UPDATE | The `/relay-qa-run` row and the `qa-run.mjs` script row name the session halts; add the minted ones |
| `documentation/reference/commands.html` | UPDATE | Mirrors the command row (line naming `SESSION_UNAVAILABLE`), per `documentation/AGENTS.md` |
| `documentation/reference/scripts.html` | UPDATE | Mirrors the script row naming the probe and stale codes |
| `documentation/changelog.html` | UPDATE | Mandatory Unreleased entry for any `documentation/` edit |
| `PRPs/reports/test-auth-minted-session/phase-3-fixtures/runner-smoke.mjs` | CREATE | Validation harness: runner + real template copy + fixture app + fake mint, scenarios for AC-A1..AC-A5. A plain node script, not a `node:test` file |

## NOT Building (Scope Limits)

- **Any edit to `plugins/relay/resources/auth-login.template.mjs`.** The margin mechanism is the existing `--force` flag, so the shared template and every test anchored on its text and run order are untouched. The template's own 60 s floor stays.
- **A new env var or CLI flag on the template.** An unknown flag makes the script exit 2; adding a margin argument would change the template, the phase-1 suite and `templateFindings` for no gain.
- **Re-minting in the middle of a run.** AC-9 is "a run never starts on a token about to expire": the check happens once per role when the session is obtained (the runner already runs each login script once per run). A run longer than the token lifetime is out of this phase.
- **Running a project command from the runner.** The runner never executes `mint.command`; the kit script does, behind its `confirmed` gate and local-only guard.
- **A new `GUARD_SITES` entry.** The runner gains no site that touches a target or store (see Notes).
- **Changes to `ground`'s `SESSION_UNAVAILABLE` halt** (it already names the failing code in parentheses, and `qa-run-ui-grounding.test.mjs:622` pins its text).
- **Kit authoring, the `mint` block generator, and the dogfood** (Phases 2 and 4). **IndexedDB placement for minted roles** (the Could-item, decided out in Phase 1).
- **Changes to the code-review loop or `capture.mjs`**: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` stay byte-identical (AC-13).
- **Any edit to an existing `*.test.mjs` file, or any new `*.test.mjs` file**: R-X strict; the test pair owns them.

## Step-by-Step Tasks

### Task 1: CREATE the validation harness (runner-smoke.mjs)

- **ACTION**: Infrastructure/scaffolding task: it delivers no acceptance criterion by itself; it creates the fixture runner project and scenarios that every later task's VALIDATE runs, and it exercises AC-A1 through AC-A5. Create `PRPs/reports/test-auth-minted-session/phase-3-fixtures/runner-smoke.mjs`, a plain node ESM script (NOT a `node:test` file, not named `*.test.mjs`, nowhere else). It reuses the Phase 1 fixtures by importing `../phase-1-fixtures/values.mjs` (needles and `makeJwt`) and running `../phase-1-fixtures/fake-mint.mjs`, and adds one new needle `IDB_VALUE = 'MINT-IDB-9a4e17'` defined inside the script itself. Run as `node runner-smoke.mjs <scenario>` with scenarios `margin`, `fresh-control`, `registration`, `indexeddb`, `blocked-reasons`, `all` (runs the others in order, exits non-zero at the first failure); `--list` prints the names and exits 0. Each scenario builds a throwaway project (`git init -q` under the clean-environment pattern used by `phase-1-fixtures/minted-smoke.mjs`: empty `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_CEILING_DIRECTORIES`) holding `PRPs/auth/login.config.json`, a `qa-report.md`, the runner plan input and a fixture app on `127.0.0.1` port 0, built the way `scripts/validate/checks/qa-run.test.mjs` builds them (read its `makeFixture`, `runRun` and `pluginCopy` helpers first; the harness runs the REAL `plugins/relay/scripts/qa-run.mjs` from the repository, resolving paths from `import.meta.url`, never from the cwd, with Playwright reachable the way that test's `COPY_ENV` does). The runner is run as an async or sync child with no terminal attached. The fixture app serves `/ok` (200 `{"path":"ok","ok":true}`), `/api/me` (200 iff `authorization` is `Bearer ` plus a JWT carrying `TOKEN_VALUE`), `/echo` (200, a JSON body echoing the request's `cookie` and `authorization` headers), `/leak-idb` (200, a body containing `IDB_VALUE`), and counts any path containing `login`. Scenarios:
  - `margin`: role `admin`, `mechanism: 'minted'`, `probe: {path: '/api/me', method: 'GET'}`, `sessionCookie: 'sid'`, `maxAgeMinutes: 60`, `mint: {command: [process.execPath, <fake-mint.mjs>, '--mode', 'ok', '--ttl', '200', '--count-file', <path>], store: '127.0.0.1:<port>', status: 'confirmed'}`; `PRPs/auth/login-admin.mjs` is the real template copy (every `__RELAY_ROLE__` replaced by `admin`, so it carries the template marker and `auth-login/2` stamp). The harness first runs that login script directly once (count file has 1 line; `.sessions/admin.mint.json` has an `expires_at` about 200 s ahead, which the template's own 60 s floor treats as reusable), then runs the runner on a one-case http plan (`role: 'admin'`, `state: 'role-only'`, a `GET /api/me` expecting 200). Asserts: the case passes, and the count file now has exactly 2 lines (re-minted before the first case), and the run's terminal output contains neither `SESSION_MINTED` nor any needle.
  - `fresh-control`: identical, with `--ttl 3600`: the case passes and the count file still has exactly 1 line (no needless rotation), proving the margin check only fires inside the margin. A second control: a role with `mechanism: 'headed'`-free stub (a non-minted role whose stub login script logs its argv to a file) is called with no `--force`.
  - `registration`: the `margin` project, but the case is `GET /echo` expecting 200: after the run, a recursive scan of the whole run directory (`PRPs/reports/<feature>/qa-run/<runId>/`), `results.json`, and the runner's stdout and stderr finds none of `COOKIE_VALUE`, `LS_VALUE`, `TOKEN_VALUE`, the full minted JWT, and the evidence file exists and contains `[REDACTED]` where the echo was. The token is the one minted DURING the run (forced re-mint), proving AC-9's second sentence.
  - `indexeddb`: a stub login script (the `qa-run.test.mjs:872-875` shape) writes `.sessions/admin.json` whose `origins[0].indexedDB` holds one database with one object store with one record whose `value` is `IDB_VALUE` (use the same entry shape as `auth-static-token-indexeddb.test.mjs:65-81`), plus a record whose value is an object `{ "tok": IDB_VALUE-derived second needle }` to cover object values. The case is `GET /leak-idb` expecting 200: the run directory, `results.json` and terminal contain no `IDB_VALUE`.
  - `blocked-reasons`: for each of the five minted halts, a project whose `admin` role is the real template copy with: `status: 'proposed'` -> `FAILED_MINT_UNCONFIRMED`; `command: null` -> `FAILED_MINT_COMMAND_MISSING`; `store: 'prod.example.com'` -> `FAILED_NON_LOCAL_TARGET`; fake-mint `--mode exit3` -> `FAILED_MINT_COMMAND`; `--mode unknown-key` -> `FAILED_MINT_OUTPUT`. For each the runner exits normally (code 0), the case is `blocked` with `reason_code` equal to that code (not `SESSION_UNAVAILABLE`), the `reason` names role `admin`, contains no needle and no stderr line the command printed, and `validateResults` from `scripts/validate/checks/qa-run-contract.mjs` accepts `results.json`. Control: a NON-minted role whose stub login script halts with `FAILED_MINT_COMMAND` on stderr and exits 1 still yields `SESSION_UNAVAILABLE` (the named reasons apply only to a minted role).
  Every scenario ends with the secrecy scan described above over the run directory and both output streams, failing on any needle. A failed assertion prints `FAIL: <scenario>: <reason>` to stderr and exits 1; success prints `PASS: <scenario>` and exits 0.
- **MIRROR**: `# SOURCE: scripts/validate/checks/qa-run.test.mjs:872-875` in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; D=PRPs/reports/test-auth-minted-session/phase-3-fixtures; node --check $D/runner-smoke.mjs; node $D/runner-smoke.mjs --list | grep -q "^margin$"` (`--list` exits 0 only when the harness loads and enumerates its scenarios; the grep fails when the `margin` scenario name is not listed one per line). On the unmodified tree, `node $D/runner-smoke.mjs margin` must exit non-zero (the count file stays at 1) and `node $D/runner-smoke.mjs indexeddb` must exit non-zero (the IndexedDB needle leaks into the evidence); the Implementer confirms both before editing `qa-run.mjs` so the gates are real.

### Task 2: UPDATE qa-run.mjs: constants and pure helpers (additive only)

- **ACTION**: Delivers the building blocks of AC-A1 (re-mint within the margin), AC-A3 (IndexedDB values registered) and AC-A4 (named reasons). Edit `plugins/relay/scripts/qa-run.mjs` by INSERTING new code only; no existing line is changed, moved or duplicated (many tests anchor on exact lines; see Notes). Insert directly after the `PROBE_BLOCK_CODES` block (after line 75):
  1. `const RUN_REMINT_MARGIN_MS = 240000;` with a doc comment: a minted role whose recorded expiry is at most this far ahead of the run start is re-minted by the kit script before any case uses it (a five-minute access token leaves at least four minutes of runway after a fresh mint, and a token minted earlier with under four minutes left is replaced). It is larger than the template's own 60 s floor on purpose.
  2. `const MINT_BLOCK_CODES = ['FAILED_MINT_UNCONFIRMED', 'FAILED_MINT_COMMAND_MISSING', 'FAILED_NON_LOCAL_TARGET', 'FAILED_MINT_COMMAND', 'FAILED_MINT_OUTPUT'];` (the five halts of the `minted` mechanism).
  Then add three helpers in the "Sessions" section, directly above `staleKitScript`'s doc comment (the `// ---` banner at line 1708-1710 stays above them). The two pure ones are `export function` so the test pair can unit-test them; neither uses `console`, `writeFileSync(` or `renameSync(`:
  3. `export function mintExpiryDue(expiresAt, nowMs, marginMs = RUN_REMINT_MARGIN_MS)`: returns `true` only when `expiresAt` is a string that `Date.parse`s to a finite instant and `parsed - nowMs <= marginMs` (an already-past expiry is due); returns `false` for anything absent, non-string or unparseable (a missing sidecar must not force a re-mint; the script's own expiry rules still apply on its normal path).
  4. `export function collectIndexedDbSecrets(state)`: returns `string[]`. For each `state.origins[]` entry with an `indexedDB` array, for each database, for each object store (accept the Playwright key `stores`, and `objectStores` as a tolerant alias), for each record, collects every string found in `record.key` and `record.value`, walking nested arrays and plain objects recursively; for an object or array `value` it also adds `JSON.stringify(value)` (an application may echo the serialized form). Collects record keys/values only, never database or store names, so ordinary schema words are not redacted. Returns `[]` for any other shape without throwing. Confirm the real record shape against the entry shape used at `scripts/validate/checks/auth-static-token-indexeddb.test.mjs:65-81` before finalizing.
  5. `function mintBlockReason(code, role)`: returns a value-free sentence naming the role, the file `PRPs/auth/login.config.json` where it applies, and the remedy, one per code: unconfirmed -> the operator must review the `mint` block and set `"status": "confirmed"` in `PRPs/auth/login.config.json`, and nothing was run; command missing -> `roles.<role>.mint.command` declares no command, nothing was run; non-local target -> the `baseUrl`, a URL argument or the `mint.store` is not local, nothing was run; command failure -> the declared mint command failed, timed out or exceeded its output bound (the cause is in the kit script's own halt, never a value); output -> the mint command's output did not match the contract (`cookies`, `localStorage`, `token`, `expires_at`). Every sentence ends with `nothing was saved or reused`-style wording consistent with the neighboring reasons. No reason ever interpolates anything except the role name and the code.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:68-75` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:585-594` in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; node --check plugins/relay/scripts/qa-run.mjs; node --input-type=module -e "const m = await import(new URL('file:///' + process.cwd().replace(/\\\\/g, '/') + '/plugins/relay/scripts/qa-run.mjs')); const now = 1000000; if (m.mintExpiryDue(new Date(now + 100000).toISOString(), now) !== true) process.exit(1); if (m.mintExpiryDue(new Date(now + 900000).toISOString(), now) !== false) process.exit(1); if (m.mintExpiryDue(undefined, now) !== false || m.mintExpiryDue('nope', now) !== false) process.exit(1); const st = { origins: [{ origin: 'http://x', indexedDB: [{ name: 'db', version: 1, stores: [{ name: 's', records: [{ key: 'k-secret-1', value: 'v-secret-2' }, { key: 3, value: { a: 'obj-secret-3' } }] }] }] }] }; const got = m.collectIndexedDbSecrets(st); for (const needle of ['v-secret-2', 'obj-secret-3']) if (!got.includes(needle)) process.exit(1); if (got.includes('db') || got.includes('s')) process.exit(1); if (m.collectIndexedDbSecrets({}).length !== 0) process.exit(1);"` (the module-level import has no side effects; the command exits non-zero on the unmodified tree because the two exports do not exist, and on any wrong behavior).

### Task 3: UPDATE qa-run.mjs: force the re-mint, register IndexedDB, name the minted halts

- **ACTION**: Delivers AC-A1 and AC-A2 (a minted role whose expiry falls within the margin is re-minted before the first case, and the token minted during the run is registered), AC-A3 (cookie, localStorage, token AND IndexedDB values registered, so a run scan finds none) and AC-A4 (the five minted halts are named `blocked` reasons). Edit `plugins/relay/scripts/qa-run.mjs`, changing only what is listed; every other statement stays byte-for-byte:
  1. Add a small helper `isMintedRole(ctx, role)` beside the Task 2 helpers: true iff `ctx.loginConfig.roles` is an object that has own property `role` whose value is an object with `mechanism === 'minted'` (use the file's existing `isObj`).
  2. In `obtainSession`, in the `else` branch that spawns the script and BEFORE the `spawnSync` call, add `const minted = isMintedRole(ctx, role);` and `const force = minted && mintExpiryDue(readMintExpiry(ctx.root, role), Date.now());`, where `readMintExpiry(root, role)` (a tiny local helper, uses the existing `readJsonOrNull`) returns the `expires_at` of `PRPs/auth/.sessions/<role>.mint.json` when it is a string, else the `expires_at` of `<role>.token.json` when that is a string, else `null`. Change the spawn argument array to `[script, '--root', ctx.root, '--plugin-root', PLUGIN_ROOT, ...(force ? ['--force'] : [])]`; leave the options object (`shell: false`, the `stdio`, `env`, `encoding`, `timeout: 120000`) untouched. `--force` is the only extra flag ever added (any other makes the script exit 2). The runner never reads, logs or reports the expiry value itself.
  3. After the existing `if (token !== null) secrets.push(token);` line, insert one line `secrets.push(...collectIndexedDbSecrets(state));` so IndexedDB values join the same `addSecretValues(ctx.table, secrets)` call. Because the registration runs after the script (and therefore after any forced re-mint), the token minted during the run is the one registered.
  4. In the session-to-`blocked` mapping near the end of the case runner, insert between the `PROBE_BLOCK_CODES.includes(s.code)` block and the generic `SESSION_UNAVAILABLE` line: `if (!s.ok && MINT_BLOCK_CODES.includes(s.code) && isMintedRole(ctx, role)) { return out(blocked(s.code, mintBlockReason(s.code, role))); }`. Restricting to minted roles keeps every other mechanism's `FAILED_NON_LOCAL_TARGET` and unknown-halt behavior exactly as today (they remain `SESSION_UNAVAILABLE`). Neither neighbor line is edited. The sibling call in `ground` is not changed.
  Do not add `writeFileSync(`, `renameSync(`, a second `// GUARD-SITE` or `// WRITE-SITE` marker, an `outcome: '<x>'` literal outside the closed vocabulary, a new static `import`, or any occurrence of `qa-report.md` on a write line. Do not touch the four AC-13 files, `auth-login.template.mjs`, `auth-local-guard-sites.mjs` or any `*.test.mjs`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1753-1759`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:1766-1774`, `# SOURCE: plugins/relay/scripts/qa-run.mjs:2432-2440` and `# SOURCE: plugins/relay/resources/auth-login.template.mjs:165-166` in `## Patterns to Mirror`.
- **VALIDATE**: `set -euo pipefail; node --check plugins/relay/scripts/qa-run.mjs; D=PRPs/reports/test-auth-minted-session/phase-3-fixtures; for s in margin fresh-control registration indexeddb blocked-reasons; do node $D/runner-smoke.mjs $s; done; npm run validate` (the scenarios run the real runner against the real template copy, the fixture app and the fake mint, and fail on a missing re-mint, a needless re-mint, any leaked needle in the run directory or streams, or a generic `SESSION_UNAVAILABLE` for a minted halt; `npm run validate` includes the repository's `qa-run-contract` check on the runner source).

### Task 4: UPDATE the command doc, the API reference, the documentation site and the changelog

- **ACTION**: Delivers AC-A6 (documentation matches behavior; no acceptance criterion of the PRD is delivered by this task alone beyond AC-9/AC-10's operator-facing description). Read `documentation/AGENTS.md` first and follow it for every `documentation/` file. Edits:
  1. `plugins/relay/commands/relay-qa-run.md`, in the `## Final output surface` paragraph (lines 421-430 today): after the stale-script sentence add that, for a role whose mechanism is `minted`, the login halts `FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND` and `FAILED_MINT_OUTPUT` are named `blocked` reasons (the first two are fixed by the operator editing `PRPs/auth/login.config.json`), while `Every other session failure keeps SESSION_UNAVAILABLE` stays true. Add a short paragraph where the command describes obtaining sessions: for a minted role whose recorded expiry is within 240 seconds of the run start the runner passes the login script `--force`, so the script mints and proves a new session before the first case; the runner never runs the mint command itself; cookie, localStorage, token and IndexedDB session values are registered for redaction. Keep the exact strings the contract check requires (`HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET`, `qa-run.mjs`); add none of `design-spec`, `relay-auth-setup`, `.claude/PRPs`, `subagent_type`.
  2. `docs/api-reference.md`: the `/relay-qa-run` row (line 129) and the `qa-run.mjs` script row (line 219): add the five minted halts to the named `blocked` reasons and the 240-second pre-run re-mint; keep every existing sentence's meaning.
  3. `documentation/reference/commands.html` (the sentence ending "every other session failure keeps `SESSION_UNAVAILABLE`", near line 349) and `documentation/reference/scripts.html` (near line 218): the same facts, in the page's existing vocabulary.
  4. `documentation/changelog.html`: add an entry under the existing `Unreleased` -> `Added` list describing the runner's pre-run minted re-mint, IndexedDB secret registration and the named minted `blocked` reasons, in the same `<li><strong>...</strong>` form as its neighbors. Follow the three-file registration rule only as far as `documentation/AGENTS.md` requires for edits (no new page is added, so NAV and the search index are not touched unless that file says otherwise).
  Do not touch `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs`.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2432-2440` in `## Patterns to Mirror` (the doc states exactly what that block does).
- **VALIDATE**: `set -euo pipefail; for c in FAILED_MINT_UNCONFIRMED FAILED_MINT_COMMAND_MISSING FAILED_MINT_COMMAND FAILED_MINT_OUTPUT; do grep -q "$c" plugins/relay/commands/relay-qa-run.md; grep -q "$c" docs/api-reference.md; grep -q "$c" documentation/reference/commands.html; done; grep -q "FAILED_MINT_OUTPUT" documentation/changelog.html; npm run validate` (each grep exits non-zero on the unmodified tree unless the code already appears in that document; the Implementer first confirms with `grep -c` on the unmodified tree that at least `documentation/reference/commands.html` and `docs/api-reference.md` lack `FAILED_MINT_OUTPUT`, otherwise Phase 2 already added it and the check must be narrowed to the new sentence; `npm run validate` includes the `qa-run-contract` check on the command doc).

### Task 5: Verify the frozen surfaces and the whole static suite

- **ACTION**: Delivers AC-A5 (the four AC-13 files and the template are untouched) and closes AC-A1 through AC-A4 end to end. No file is edited. Run the full harness (`all`), the diff checks against the phase-2 end-state tree `730052ae449fc187402cc7890020fa0ced7ceb6a` (a tree object: use the single-argument `git diff <tree> -- <paths>` form, never `git diff HEAD`) and `npm run validate`. This task is verification only; if any step fails, fix the cause in the task that introduced it, never by weakening a check.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:68-75` in `## Patterns to Mirror` (the new constants sit beside it and must not disturb it).
- **VALIDATE**: `set -euo pipefail; D=PRPs/reports/test-auth-minted-session/phase-3-fixtures; node $D/runner-smoke.mjs all; BASE=730052ae449fc187402cc7890020fa0ced7ceb6a; if git diff --quiet $BASE -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs plugins/relay/resources/auth-login.template.mjs; then echo "PASS: frozen files and template unchanged"; else echo "FAIL: a frozen file or the template changed"; exit 1; fi; npm run validate`

## Validation Commands

All commands run from the repository root (the worktree root), with the fixture directory `PRPs/reports/test-auth-minted-session/phase-3-fixtures/` created by Task 1 and the Phase 1 fixture directory still present.

### Level 1 STATIC_ANALYSIS

```
set -euo pipefail
D=PRPs/reports/test-auth-minted-session/phase-3-fixtures
BASE=730052ae449fc187402cc7890020fa0ced7ceb6a
node --check plugins/relay/scripts/qa-run.mjs
node --check $D/runner-smoke.mjs
if git diff --quiet $BASE -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs; then
  echo "PASS: the four AC-13 files are byte-identical"
else
  echo "FAIL: an AC-13 frozen file changed"; exit 1
fi
if git diff --quiet $BASE -- plugins/relay/resources/auth-login.template.mjs; then
  echo "PASS: the login template is unchanged by this phase"
else
  echo "FAIL: this phase must not edit the template"; exit 1
fi
if git diff --unified=0 $BASE -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md docs/api-reference.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced"
fi
npm run validate
```

### Level 2 CONTENT_INVARIANTS

```
set -euo pipefail
R=plugins/relay/scripts/qa-run.mjs
[ "$(grep -c 'writeFileSync(' $R)" = "1" ]
[ "$(grep -c 'renameSync(' $R)" = "1" ]
for m in '// GUARD-SITE' '// WRITE-SITE'; do [ "$(grep -c -e "$m" $R)" = "1" ]; done
if grep -n -e '--local-host' $R; then echo "FAIL: retired flag in the runner"; exit 1; else echo "PASS: no retired flag"; fi
node --test scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run.test.mjs scripts/validate/checks/qa-run-kit-hardening.test.mjs scripts/validate/checks/qa-run-api-origins.test.mjs scripts/validate/checks/qa-run-ui-grounding.test.mjs scripts/validate/checks/qa-run-seed-declaration.test.mjs scripts/validate/checks/qa-run-query.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs scripts/validate/checks/auth-reuse-proof.test.mjs
```

### Level 3 DRY-RUN END-TO-END

```
set -euo pipefail
D=PRPs/reports/test-auth-minted-session/phase-3-fixtures
node $D/runner-smoke.mjs all
node --test "scripts/validate/**/*.test.mjs"
npm run validate
```

## Acceptance Criteria

- **AC-A1 (PRD AC-9):** Given `/relay-qa-run` with a minted role, when it obtains that role's session for the run, then a session whose recorded expiry falls within the 240-second margin of the run start is re-minted (by the kit script, through `--force`) before any case uses it; a session comfortably outside the margin is reused with no mint.
- **AC-A2 (PRD AC-9):** A token minted during the run is registered for redaction like any other session value.
- **AC-A3 (PRD AC-10, and the PRD's Should-item):** The runner registers minted cookie, localStorage, token and IndexedDB session values as secrets, so a scan of every file under the run directory, `results.json` and the terminal output for those values finds zero hits.
- **AC-A4 (PRD AC-10 and the phase's third scope item):** The minted login halts `FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND` and `FAILED_MINT_OUTPUT` surface as named `blocked` reasons (value-free) for a minted role; every other session failure keeps `SESSION_UNAVAILABLE`.
- **AC-A5 (PRD AC-13):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content.
- **AC-A6 (PRD AC-9, AC-10, operator-facing):** `plugins/relay/commands/relay-qa-run.md`, `docs/api-reference.md` and the documentation site describe the pre-run re-mint, the IndexedDB redaction and the named minted reasons, with an Unreleased changelog entry.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| An edit to `qa-run.mjs` breaks one of the tests that mutate its source by exactly-once anchors | M | High | Grounding found none of the anchors in `obtainSession`, `PROBE_BLOCK_CODES` or the session mapping; every edit is an insertion or the single spawn argument array; Level 2 runs the nine qa-run/guard test files and Level 3 the whole corpus with no exclusion |
| A minted value reaches a halt reason, a run file or the terminal | M | High | `mintBlockReason` interpolates only the role name and the code; the expiry the runner reads is never printed; the harness scans the run directory, `results.json`, stdout and stderr for every needle after every scenario |
| The Playwright IndexedDB record shape differs from the collector's assumption, leaving values unredacted | M | High | Task 2 requires confirming the shape against `auth-static-token-indexeddb.test.mjs:65-81`; the `indexeddb` scenario leaks the needle on a wrong shape and fails; the collector walks `stores` and the `objectStores` alias |
| Redacting over-broad strings corrupts ordinary evidence | L | Low | Only record keys and values are collected (never database or store names); `addSecretValues` already ignores values under 4 characters |
| The forced re-mint rotates a single-session account's tokens each run | M | Medium | Accepted by the PRD (dedicated QA account per role, "mint only on expiry"); the 240 s margin means a token reused from a recent mint (more than 240 s left) is not rotated; the `fresh-control` scenario asserts no mint outside the margin |
| A token lifetime shorter than the margin re-mints on every run | L | Low | One forced attempt per role per run, never a loop; the freshly minted token is then used as is. Recorded in Notes |
| A documentation-pinning test fails on the doc edits | M | Medium | The docs edits are additive prose; if a pinned count or string fails, the Implementer opens a `TEST_CONTRACT_DISPUTE` and the test pair records EXISTING_TEST_UPDATED; the Implementer never edits a test |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-first ordering is not used. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task below and no `## Files to Change` row
targets a test file, so this plan's `**VALIDATE**` commands exercise the
change directly rather than invoking the test framework.

- **Decision: the re-mint margin is 240 seconds.** Open Question 2 asked for a margin given a 5-minute access token and runs of tens of seconds per case. A freshly minted 300 s token has 300 s remaining at the next run start, so it is reused only while more than 240 s are left, which leaves at least four minutes of runway; anything older is replaced before the first case. The template's own 60 s floor is kept as the standalone-script rule and is deliberately smaller: the runner's margin governs the run, the floor governs a direct script invocation.
- **Decision: the mechanism is the existing `--force` flag, not a template change.** The runner reads the sidecar `PRPs/auth/.sessions/<role>.mint.json` (value-free `{minted_at, expires_at}`, written by Phase 1), falls back to the token artifact's `expires_at`, and, when the expiry is within the margin, calls the login script with `--force`. `--force` skips every reuse decision and forces a fresh mint; the `confirmed` gate (which runs before the reuse dispatch), the local-only guard, the bounded spawn and the proof-before-save all still run inside the script. Rejected alternatives: an env var or margin argument read by the template (changes the shared template, the phase-1 suite `auth-minted-session.test.mjs`, `templateFindings` and the stamp-structure pins, and an unknown flag exits 2); the runner deleting the session file (writes a secret path from the runner and bypasses nothing the flag does not). A missing, unreadable or unparseable sidecar never forces a re-mint, so a role with no recorded expiry behaves exactly as today.
- **Decision: one attempt, no loop.** If a token's lifetime is shorter than the margin the runner still forces at most one re-mint per role per run (`ctx.sessions` caches the result), then uses the fresh token.
- **Decision: the new halts are named only for minted roles.** `FAILED_NON_LOCAL_TARGET` is also a runner-level code elsewhere; mapping it for other mechanisms would change `qa-run-kit-hardening.test.mjs` and `auth-reuse-proof.test.mjs` behavior (their `SESSION_UNAVAILABLE` assertions at `qa-run.test.mjs:901`, `qa-run-kit-hardening.test.mjs:388/402/423`, `auth-reuse-proof.test.mjs:692/754`). The `isMintedRole` check keeps those untouched, and the `blocked-reasons` control scenario proves it.
- **Decision: no new `GUARD_SITES` entry.** The runner adds no site that touches a target or a store: it spawns the same login script it already spawns, with one extra flag, and reads local files under `PRPs/auth/.sessions/`. The two existing qa-run entries (`auth-local-guard-sites.mjs:66-74`) stay as they are; `npm run validate` keeps its 28 checks.
- **EXISTING_TEST_UPDATED candidates for the test pair.** Grounding (read of `qa-run.test.mjs`, `qa-run-kit-hardening.test.mjs`, `qa-run-api-origins.test.mjs`, `qa-run-ui-grounding.test.mjs`, `qa-run-layout.test.mjs`, `qa-run-record-resolution.test.mjs`, `qa-run-query.test.mjs`, `qa-run-seed-declaration.test.mjs`, `qa-run-contract.mjs` and `auth-local-guard-sites.mjs`) found NO test that anchors on, searches or counts a literal this phase rewrites. Evidence: every source-text anchor into `qa-run.mjs` is listed (the `mutate()` anchors in `qa-run.test.mjs` at 397, 453, 534, 610, 611, 764, 771, 781, 832, 861, 973, 1034, 1165; in `qa-run-kit-hardening.test.mjs` at 330 and 345; in `qa-run-layout.test.mjs` and `qa-run-record-resolution.test.mjs` the layout and record-resolution lines) and none lies in `obtainSession`, `PROBE_BLOCK_CODES`, the secrets collection or the session mapping; the only counted tokens are `writeFileSync(` and `renameSync(` (each exactly once), the `// GUARD-SITE` and `// WRITE-SITE` markers (once), `OUTCOMES` and the dynamic `import('./qa-query.mjs')`, all preserved; no test asserts the export list or a `--force` string in `qa-run.mjs`; the behavior assertions that name `SESSION_UNAVAILABLE` or `FAILED_KIT_SCRIPT_STALE` concern non-minted roles and are preserved. The Level 3 corpus run therefore carries NO `--test-skip-pattern`: excluding exactly the tests the pair will update would exclude none. The watch-list in order of risk: `qa-run-contract.test.mjs` and the `qa-run-contract` check (the command doc edit), the documentation-site tests that pin counts or strings on `documentation/reference/commands.html`, `scripts.html` or `changelog.html`, `qa-run-kit-hardening.test.mjs` (`pluginCopy` at 245-260 copies the runner), and `qa-run.test.mjs` (`pluginCopy` copies only the guard sibling, so no new static sibling import is added). If an attempt makes one fail, the Implementer opens a `TEST_CONTRACT_DISPUTE`; the pair records EXISTING_TEST_UPDATED. New permanent coverage (a NEW test file for AC-A1..AC-A4, unit tests of `mintExpiryDue` and `collectIndexedDbSecrets`) is the pair's, and may reuse the harness design.
- **Fixture files are not tests.** `runner-smoke.mjs` is a plain node script with exit-code semantics, matches no `*.test.mjs` glob and lives in the ignored `PRPs/reports/` scratch area.
- **Pitfall for the Implementer.** `qa-run.mjs` is a prompt-tested source file: `writeFileSync(` and `renameSync(` must each stay a single occurrence, so do not add any write; the runner only reads the sidecar.

*Generated: 2026-10-08*
*Approved: 2026-10-08*
*Implemented: 2026-10-08*
*Status: IMPLEMENTED*
