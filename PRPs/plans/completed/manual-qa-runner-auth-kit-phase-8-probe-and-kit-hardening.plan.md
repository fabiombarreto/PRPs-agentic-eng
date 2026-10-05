# Feature: Probe and kit hardening (Phase 8 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: change to shared contracts (the login-script template, `login.config.json`, `qa-run.mjs` block codes, the `auth-model.md` shape); secret-adjacent handling (static-token and session artifacts, a kit archive that must never touch a secret file); modification of three standalone commands and the auth-model agent pair; an interactive-command change confined to `/relay-auth-setup`
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the binding scope of the feature; phase 8 stays inside it (per the source PRD's Decision Gate)
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-04-19] Methodology declaration — opt-in gating keys are read from `docs/context/methodology.md`, never inferred (`tdd: false`, `test_frameworks: ["node:test"]` → test-after, test pair active, R-X strict)
  - [2026-09-25] The hybrid `/code-review` pass affects a verdict only under four named conditions; `hybrid-code-review` Phase 5 is `pending`, so the review loop stays untouched (PRD AC-16)
  - [2026-10-05] Phase 8 extended with AC-26..AC-29 and phase 5 closed on an amended signal; [2026-10-04] probe hardening as a new phase 8 (both in the source PRD's Decisions Log)
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — no halt line, archive step or record may print any part of a token, cookie or credential
  - "Writing pipeline artifacts under `.claude/`" — every artifact stays under `PRPs/`
  - "Weakening or deleting tests to make the auto-correction loop turn green" — expected test breaks are routed to the test pair, never edited by the Implementer
  - "Activating the test pair by heuristic" — no gating key is inferred
- Applicable architectural rules:
  - Interactivity boundary — the only interactive change (the DRAFT re-run offer) sits inside the standalone `/relay-auth-setup`
  - Command versus agent separation — commands own mutations and preconditions; the writer/reviewer own judgment
  - Graceful degradation is mandatory when a precondition is absent, except the local-only guard, which is a hard failure by design
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 8: "Probe and kit hardening" — Goal: close the defects the 0.42.0 re-runs found in the kit (NF3 and NF4 weaken exactly the guarantee phase 7 exists to give; PS1 lets a target that authenticates everyone produce a false browser `pass`; the others keep an upgrade from reaching a kit that already exists, or name a failure wrongly) — Success signal: against fixtures that reproduce each `super-ensino` case a generated single-page-app configuration with a browser probe runs with no hand edit, a layout marker visible for a moment with an invalidated session is never saved or reused and is not reported as a wrong account, a script generated from the 0.42.0 template halts `FAILED_KIT_SCRIPT_STALE` against the new template and `--refresh` fixes it while preserving set values, and a wrong marker after a good login halts `FAILED_PROBE_MARKER_ABSENT`; against fixtures that reproduce each `praesto-sum` case a no-expiry static token runs with no hand edit, a wrong token, a refused connection and a failed placement each halt with their own code, `--fresh` replaces a hand-written kit without touching a session file, and a browser case against a target that authenticates everyone is `blocked`, never `pass`.

## Summary

Phase 8 hardens the already-shipped test-auth kit in four ordered groups, each of which leaves `npm run validate` green and can be the stopping point. Group 1 changes the login template's configuration check and halts: an optional HTTP probe when a browser probe is declared (PRD AC-22), `maxAgeMinutes: null` for a never-expiring static token (AC-26), three distinct static-token failure codes (AC-27), `FAILED_PROBE_MARKER_ABSENT` for a probe that fails after a completed login (AC-25) and a presence-is-a-stable-state dwell in the browser probe (AC-23). Group 2 stamps the template with an explicit identity line and makes a generated script halt `FAILED_KIT_SCRIPT_STALE` against a differently stamped installed template (AC-24, script side). Group 3 teaches `qa-run.mjs` three new named `blocked` reasons, a read-only stale pre-flight that also catches the older scripts which carry no stamp and therefore no check of their own, and the browser-case gate for a target that authenticates everyone (AC-29). Group 4 is markdown: `/relay-auth-scripts` (`null` probe, `--refresh`, `maxAgeMinutes: null`), `/relay-auth-setup` (`--fresh` archive, DRAFT re-run offer), the auth-model template/writer/reviewer (marker guidance, the pre-authenticated-target record with `file:line` evidence), `/relay-qa-run`, the reference pages and the changelog. `capture.mjs` and the review loop are not touched.

## User Story

As the operator running relay's manual-QA kit against a local project
I want the login scripts to prove a session honestly, name the exact step that failed, and be refreshable after a plugin upgrade
So that a saved session is never trusted on a probe a single-page app or a dev server can fake, and an existing kit receives the fixes

## Problem Statement

The 0.42.0 re-runs showed that the kit's proof can still be fooled and that its failures are mis-named. In `super-ensino` a browser-probe role still required an HTTP probe path (NF3), a marker rendered from client-side state was visible for about 5.3 seconds with invalidated tokens and so passed the presence check (NF4), scripts are never refreshed on upgrade (NF2), and a probe failure at save time was reported as `FAILED_LOGIN_REJECTED` (NF5). In `praesto-sum` a never-expiring token could only be declared as `TBD` (PS3), a wrong token, a refused connection and a failed placement all collapsed into one code (PS2), `/relay-auth-setup` had no way to replace a kit it did not generate (PS6), and a dev server that injects the credential let a browser case pass with no session at all (PS1).

## Solution Statement

Fix each defect in the file that owns it, in four groups. The template changes keep every shipped invariant (guard, secrecy and write sites in that order, a single `writeFileSync(`, four `storageState({ indexedDB: true })` calls, two `writeSecret(root, CREDENTIALS_REL` calls) and every byte of the five lines the existing mutation tests anchor on; new behaviour arrives as new constants and new branches, never as a reworded old line. Template identity is an explicit stamp line, not a content hash, because every template test runs a deliberately mutated copy of the template and a hash would make each of them halt stale. The runner reads the same stamp as a read-only pre-flight so that scripts generated before this phase, which cannot check themselves, are still reported as a named `blocked` reason. The auth-model record for PS1 reuses the `## Login Flow` one-line convention the browser probe already uses, so the nine-heading template shape is unchanged.

## Metadata

| Key | Value |
|-----|-------|
| Type | ENHANCEMENT |
| Complexity | HIGH |
| Systems Affected | `plugins/relay/resources/auth-login.template.mjs`, `plugins/relay/scripts/qa-run.mjs`, `plugins/relay/commands/relay-auth-scripts.md`, `relay-auth-setup.md`, `relay-qa-run.md`, `plugins/relay/resources/auth-model-template.md`, `plugins/relay/agents/auth-model-writer.md`, `auth-model-reviewer.md`, `documentation/` (two reference pages and the changelog) |
| Dependencies | Phase 7 (complete); an installed Playwright under `plugins/relay/scripts/visual/` for the effect-level VALIDATE commands (the corpus baseline already requires it) |
| Estimated Tasks | 10 tasks in 4 groups |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` rows 249 (table) and 319-349 (Phase 8 details); AC-22..AC-29 at lines 116-133 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 116-133, 319-349, 370-371 | AC-22..AC-29, the Phase 8 scope/deferred/success signal, and the two newest Decisions Log rows |
| P0 | `plugins/relay/resources/auth-login.template.mjs` | 74-97, 141-240, 421-645, 787-952, 958-1189 | Every function the group 1 and 2 edits touch; the guard/secrecy/write sites and the static-token halts |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 53-67, 968-1052, 1058-1104, 1370-1425, 1483-1497 | `PROBE_BLOCK_CODES`, the browser driver, `obtainSession`, the case-routing block and `makeCtx` that groups 3 edits |
| P0 | `plugins/relay/commands/relay-auth-scripts.md` | all | Group 4 edits; its pinned strings (see the test pins below) |
| P0 | `plugins/relay/commands/relay-auth-setup.md` | all | Group 4 edits (P4 collision, new `--fresh` step) |
| P0 | `scripts/validate/checks/auth-scripts-command.test.mjs` | 23-117 | Pinned strings and the `ALLOWED_WRITES` set the `relay-auth-scripts.md` edit must keep green (no `relay-auth-setup`, no `/relay-qa-run`, no `design-spec` token in that file) |
| P0 | `scripts/validate/checks/auth-model-pair.test.mjs` | 116-160, 166-220 | Pinned strings for `relay-auth-setup.md`, the reviewer and the writer: the `SECRET_PATH_TARGET` pin forbids the literal `PRPs/auth/.sessions` or `PRPs/auth/credentials` in that command; the `WRITTEN_SET` pin forbids any new `PRPs/auth/...` token in the "only files written" bullet |
| P0 | `scripts/validate/checks/qa-run-contract.mjs` | 17-25, 94-135 | The contract check on `qa-run.mjs` (`// GUARD-SITE` and `// WRITE-SITE` exactly once, `writeFileSync(` and `renameSync(` exactly once) and on `relay-qa-run.md` (no `relay-auth-setup`, no `design-spec`) |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 220-233 | The final-output paragraph listing the named probe halts that group 4 extends |
| P1 | `plugins/relay/scripts/auth-kit-secrecy.mjs` | 55-69, 102-114 | An existing `PRPs/auth/.gitignore` is never overwritten, so a new ignore rule cannot reach an existing kit; this is why the `--fresh` archive lives under the already-required ignored `.sessions/` directory |
| P1 | `plugins/relay/resources/auth-model-template.md` | 55-70, 111-113 | The `## Login Flow` one-line convention the new records reuse; the "nine second-level headings" rule that must stay true |
| P1 | `plugins/relay/agents/auth-model-writer.md` and `auth-model-reviewer.md` | all | Marker-preference guidance and the record's `file:line` evidence rule; reviewer rubric ids `R-AM1`..`R-AM7` are pinned and must not change |
| P1 | `scripts/validate/checks/auth-reuse-proof.test.mjs` | 204-218, 702, 748, 764-793 | READ ONLY: the five `mutate()` anchor lines and the `FAILED_LOGIN_REJECTED` assertions this phase must not silently invalidate (R-X: the Implementer never edits it) |
| P1 | `documentation/AGENTS.md` | 1-120 and the changelog rules | Binding contract for any edit under `documentation/`; an edit inside an existing page needs only a changelog entry |
| P1 | `documentation/changelog.html` | 31-74 | Format of the `Unreleased` block and a release block |
| P2 | `documentation/reference/commands.html` and `documentation/reference/agents.html` | the `/relay-auth-scripts`, `/relay-auth-setup`, `/relay-qa-run`, `auth-model-writer`, `auth-model-reviewer` entries | The reference pages group 4 updates |

## Patterns to Mirror

### P1 — required-field validation (config check)

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:170-175
function incompleteField(role) {
  const tbd = findTbd(role, `roles.${ROLE}`);
  if (tbd) return tbd;
  /** @type {string[]} */
  let required = ['mechanism', 'probe.path', 'probe.method'];
  if (role.mechanism === 'form') {
```

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:232-239
  for (const f of required) {
    const v = getPath(role, f);
    if (typeof v !== 'string' || v === '') return `roles.${ROLE}.${f}`;
  }
  if (typeof role.maxAgeMinutes !== 'number' || !(role.maxAgeMinutes > 0)) {
    return `roles.${ROLE}.maxAgeMinutes`;
  }
  return null;
```

Task 1 copies this shape: the new exemptions are added as conditions on the existing `required` list and the existing `maxAgeMinutes` test, not as a second validator.

### P2 — reuse gate that reads the probe path

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:603, 611-612
  if (Date.now() - statSync(file).mtimeMs >= role.maxAgeMinutes * 60000) return false;
...
  const url = sameOriginUrl(cfg.baseUrl, role.probe.path);
  if (!url) return false;
```

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:829
  if (Date.now() - statSync(file).mtimeMs >= role.maxAgeMinutes * 60000) return false;
```

Task 1: `role.probe.path` is dereferenced only when the role has no browser probe, and the static-token age test is skipped when `maxAgeMinutes` is `null` (`null * 60000` is `0`, which would make every reuse look expired).

### P3 — static-token proof and its caller

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:803-810
  try {
    const withToken = await status({ [role.staticToken.header]: `${role.staticToken.valuePrefix}${token}` });
    if (withToken < 200 || withToken >= 300) return 'rejected';
    const without = await status(undefined);
    return without >= 200 && without < 300 ? 'unproven' : 'proven';
  } catch {
    return 'rejected';
  }
```

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:1092-1100
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

Task 2 splits the single `'rejected'` return into a status-carrying rejection and a transport failure, and the single `FAILED_LOGIN_REJECTED` branch into the three named halts.

### P4 — placement failure sites

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:854-857, 868, 947-949
  const unreachable = (/** @type {string} */ what) => ({
    state: null,
    halt: `FAILED_TOKEN_LOCATION_UNREACHABLE: ${what}; nothing was saved`,
  });
...
    if (!appUrl) return { state: null, halt: `FAILED_LOGIN_REJECTED: the login for role ${ROLE} yielded no session` };
...
  } catch {
    return { state: null, halt: `FAILED_LOGIN_REJECTED: the login for role ${ROLE} yielded no session` };
```

Task 2: the two `FAILED_LOGIN_REJECTED` returns become `FAILED_TOKEN_PLACEMENT`. `FAILED_TOKEN_LOCATION_UNREACHABLE` (shipped, specific, pinned by tests) is kept for its own two cases.

### P5 — browser probe verdict ladder and the halt table

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:421-425
const PROBE_HALTS = {
  'not-protected': 'FAILED_PROBE_NOT_PROTECTED: the declared probe answered the same with and without the session; nothing was saved or reused',
  'wrong-account': 'FAILED_PROBE_WRONG_ACCOUNT: the session is not the account declared for this role; nothing was saved or reused',
  unloadable: 'FAILED_PROBE_PAGE_UNLOADABLE: the declared browser probe page did not load; nothing was saved or reused',
};
```

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:518-525, 539-548
  const visible = async (loc, ms) => {
    try {
      await loc.waitFor({ state: 'visible', timeout: ms });
      return 'visible';
    } catch (e) {
      return e && /** @type {any} */ (e).name === 'TimeoutError' ? 'timeout' : 'error';
    }
  };
...
    const withPage = await openPage({ storageState: storage });
    if (!(await load(withPage))) return 'unloadable';
    const present = await visible(locate(withPage, bp.marker), BROWSER_PROBE_POSITIVE_MS);
    if (present === 'timeout') return 'expired';
    if (present !== 'visible') return 'unloadable';
    if (bp.roleMarker) {
      const roleSeen = await visible(locate(withPage, bp.roleMarker), BROWSER_PROBE_POSITIVE_MS);
      if (roleSeen === 'timeout') return 'wrong-account';
      if (roleSeen !== 'visible') return 'unloadable';
    }
```

Task 3 mirrors the `visible` helper's shape for a non-blocking `isVisible()` re-check, adds the dwell as a new constant and keeps the five anchor lines (see Notes) byte-identical.

### P6 — save-time mapping of an expired proof

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:1158-1166
  const saveProof = await proveSession(cfg, role, state, token !== null ? { token } : null, pw, guard, target.allowedHosts);
  if (saveProof === 'expired' || saveProof === 'error') {
    err(`FAILED_LOGIN_REJECTED: the login for role ${ROLE} yielded no session`);
    return 1;
  }
  if (saveProof !== 'proven') {
    err(PROBE_HALTS[saveProof]);
    return 1;
  }
```

Task 3: for a role that declares a browser probe, an `expired` save proof becomes `FAILED_PROBE_MARKER_ABSENT`; every other role keeps `FAILED_LOGIN_REJECTED`.

### P7 — guard site then secrecy site (stale check goes between them)

```js
// SOURCE: plugins/relay/resources/auth-login.template.mjs:992-999
  const target = await guard.checkTarget(cfg.baseUrl, { root });
  if (!target.ok) {
    err(`FAILED_NON_LOCAL_TARGET: ${target.reason} (host: ${target.host})`);
    return 1;
  }

  // SECRECY-SITE
  const secrecy = spawnSync(
```

Task 4 inserts the read-only stale check between these two blocks.

### P8 — runner halt-code mapping and session acquisition

```js
// SOURCE: plugins/relay/scripts/qa-run.mjs:58
const PROBE_BLOCK_CODES = ['FAILED_PROBE_NOT_PROTECTED', 'FAILED_PROBE_WRONG_ACCOUNT', 'FAILED_PROBE_PAGE_UNLOADABLE'];
```

```js
// SOURCE: plugins/relay/scripts/qa-run.mjs:1415-1419
    const s = obtainSession(ctx, role);
    if (!s.ok && PROBE_BLOCK_CODES.includes(s.code)) {
      return out(blocked(s.code, `the kit's session probe for role ${role} halted; nothing was saved or reused`));
    }
    if (!s.ok) return out(blocked('SESSION_UNAVAILABLE', `the kit login script for role ${role} did not produce a session (${s.code})`));
```

```js
// SOURCE: plugins/relay/scripts/qa-run.mjs:1066-1071, 1097-1100
  /** @type {{ ok: true, info: SessionInfo } | { ok: false, code: string }} */ let result;
  const script = join(ctx.root, 'PRPs', 'auth', `login-${role}.mjs`);
  if (!existsSync(script)) {
    result = { ok: false, code: 'FAILED_LOGIN_SCRIPT_MISSING' };
  } else {
    const r = spawnSync(process.execPath, [script, '--root', ctx.root, '--plugin-root', PLUGIN_ROOT], {
...
    } else {
      const m = /FAILED_[A-Z_]+/.exec(String(r.stderr ?? ''));
      result = { ok: false, code: m ? m[0] : 'FAILED_LOGIN_UNKNOWN' };
    }
```

Task 5 extends the list, adds a pre-flight beside the `existsSync(script)` check and carries the stamp ids in the result.

### P9 — runner browser context with the guard route

```js
// SOURCE: plugins/relay/scripts/qa-run.mjs:979-985
    context = await browser.newContext(session && session.path ? { storageState: session.path } : {});
    await context.route('**/*', (/** @type {any} */ route) => {
      const u = new URL(route.request().url());
      if (['data:', 'about:', 'blob:'].includes(u.protocol)) return route.continue();
      return target.guard.isAllowedHost(u.hostname, target.allowedHosts) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
```

Task 6 mirrors this for the anonymous check: a fresh context with no storage state, the same guard route, `page.goto`, a visible-wait with a timeout.

### P10 — command argument parsing and unrecognized-argument HALT

```markdown
<!-- SOURCE: plugins/relay/commands/relay-auth-scripts.md:59-72 -->
`$ARGUMENTS` may carry:

- `--role <role>` — optional and repeatable; restricts generation to the named
  roles (kebab-case slugs).

Any other argument HALTs:

> Usage: `/relay-auth-scripts [--role <role>]...`
> Example: `/relay-auth-scripts --role admin`
> Unrecognized argument: `<argument>`. Nothing has been read or written.
```

Tasks 7 and 8 add `--refresh` and `--fresh` to the argument list, the Usage line and the Example line of their commands.

### P11 — collision handling in `/relay-auth-setup`

```markdown
<!-- SOURCE: plugins/relay/commands/relay-auth-setup.md:154-165 -->
### P4 — Collision

Inspect `PRPs/auth/auth-model.md`:

- If it ends with `*Status: APPROVED*`, HALT:

  > FAILED_AUTH_MODEL_ALREADY_APPROVED: `PRPs/auth/auth-model.md` is already
  > APPROVED. To re-author it, hand-edit its trailing `*Status:*` line back to
  > `DRAFT` and re-run `/relay-auth-setup`.

- If it is a DRAFT, skip Phase A and go straight to Phase B.
- If it is absent, run Phase A.
```

Task 8.

### P12 — login-flow one-line convention in the auth-model template

```markdown
<!-- SOURCE: plugins/relay/resources/auth-model-template.md:61-70 -->
## Login Flow

1. <step> — <scriptable | not scriptable>

(one numbered flow per mechanism; mark each scriptable or not; a `static-token`
flow has no login step: state the header or browser location that carries the
token and that no login request exists; a role may also state a browser probe as
one line: the route, the authenticated-only marker as visible text or a selector,
and optionally a role marker, recorded by description, never a credential or
cookie value)
```

Task 9.

### P13 — changelog Unreleased block and release entry

```html
<!-- SOURCE: documentation/changelog.html:31-33, 44-47 -->
      <h2 id="unreleased">Unreleased</h2>

      <p>Nothing yet.</p>
...
      <h3 id="v0-42-0-added">Added</h3>

      <ul>
        <li><strong>Reuse proof for kit sessions</strong> &mdash; a login script now proves every saved or reused
```

Task 10.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/auth-login.template.mjs` | UPDATE | Groups 1 and 2: optional HTTP probe, `maxAgeMinutes: null`, static-token failure codes, dwell, `FAILED_PROBE_MARKER_ABSENT`, template identity stamp and `FAILED_KIT_SCRIPT_STALE` (AC-22..AC-27, AC-24 script side) |
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | Group 3: three new block codes, stale pre-flight, the pre-authenticated-target gate and anonymous check (AC-24 runner side, AC-25 runner side, AC-29) |
| `plugins/relay/commands/relay-auth-scripts.md` | UPDATE | Group 4: `null` probe, `maxAgeMinutes: null`, `authenticatesAnonymous`, `--refresh`, stale report (AC-22, AC-24, AC-26, AC-29) |
| `plugins/relay/commands/relay-auth-setup.md` | UPDATE | Group 4: `--fresh` archive and the DRAFT re-run offer (AC-28) |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | Group 4: name the three new `blocked` reasons in the final-output paragraph (AC-24, AC-25, AC-29) |
| `plugins/relay/resources/auth-model-template.md` | UPDATE | Group 4: marker-preference guidance and the pre-authenticated-target record, inside the existing nine headings (AC-23, AC-29) |
| `plugins/relay/agents/auth-model-writer.md` | UPDATE | Group 4: prefer markers that need a successful API response; cite the injecting code with `file:line` (AC-23, AC-29) |
| `plugins/relay/agents/auth-model-reviewer.md` | UPDATE | Group 4: reject a recorded pre-authenticated target with no `file:line` evidence, inside the existing `R-AM1`..`R-AM7` rows (AC-29) |
| `documentation/reference/commands.html` | UPDATE | Group 4: the three command entries |
| `documentation/reference/agents.html` | UPDATE | Group 4: the two agent entries |
| `documentation/changelog.html` | UPDATE | Group 4: an entry under `Unreleased` (mandatory for any change inside `documentation/`) |
| `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | UPDATE | Plan-writer back-fill of row 8 only (`Status` and `PRP Plan` cells) |

No test file appears in this table or in any task.

## NOT Building (Scope Limits)

- NF1, an in-place amend of an APPROVED auth model — `--fresh` (AC-28) covers starting over.
- NF6, the per-reuse probe cost — AC-23's dwell adds to it, knowingly.
- NF7 (redaction of account identifiers in evidence) and NF8 (a probe dry run before spending a login).
- The standing two-origin (F2) and two-step-form (F3) gaps, and the case-vocabulary gaps that go to the separate case-vocabulary PRD (captured seed values, `qa-seed.json` generator, partial plans, the read-only DB driver).
- Any change to `plugins/relay/agents/code-reviewer.md`, `code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` (PRD AC-16) or `plugins/relay/scripts/visual/capture.mjs`.
- Any edit to `plugins/relay/.claude-plugin/plugin.json` (versioning is a release step, not this phase).
- Any new `npm run validate` check (the suite stays at 28 checks) and any new documentation page (so NAV and the search index are untouched).
- Any new rule in `plugins/relay/resources/auth-kit.gitignore` — an existing kit's `.gitignore` is never overwritten, so a new rule would not reach the kits this phase is for.
- Running against any non-local host, including the alternative local target of AC-29, which stays inside the local-only guard (PRD AC-1).
- Carrying an origin-scoped session (IndexedDB or `localStorage` captured on the primary origin) to an alternative target: the alternative target of AC-29 is confirmed by the anonymous check only, and a role whose session lives in origin-scoped storage must be re-saved for that origin by the operator (recorded in Risks).
- Authoring or editing any test file. The Implementer authors ZERO test files (R-X); all test work routes to the test pair.

## Step-by-Step Tasks

Execution order is the group order. Each group ends with `npm run validate` green and is a coherent stopping point. Line numbers below are as of commit `f4f91a2`; locate code by its content, because earlier edits shift later lines.

### Group 1 — template configuration and halts

### Task 1: UPDATE plugins/relay/resources/auth-login.template.mjs — optional HTTP probe and a never-expiring static token

- **ACTION**: Delivers AC-A1 and AC-A5. In `incompleteField`: (a) compute `browserProbeDeclared = role.browserProbe !== undefined && role.browserProbe !== null` and `probeOptional = browserProbeDeclared && ['form', 'api', 'headed'].includes(role.mechanism)`; when `probeOptional`, build the base required list as `['mechanism']` only and run `findTbd` over a copy of the role whose `probe` key is replaced by `undefined`, so a `null`, absent or `TBD - needs validation` value in `probe.path` or `probe.method` no longer halts `FAILED_LOGIN_CONFIG_INCOMPLETE`; any other role (no browser probe, or `static-token`) keeps `probe.path` and `probe.method` required, unchanged. (b) accept `role.maxAgeMinutes === null` only when `role.mechanism === 'static-token'`; every other role still requires a positive number. In `sessionReusable`, dereference `role.probe.path` only when the role has no browser probe (the `sameOriginUrl` early return at the "probe.path" site is skipped when `role.browserProbe` is set). In `staticTokenReusable`, skip the `statSync(...).mtimeMs >= role.maxAgeMinutes * 60000` age test when `role.maxAgeMinutes === null`, so a null-age token is re-proven on every reuse by the existing `proveStaticToken` call rather than looking expired at once. In `main`, when `role.maxAgeMinutes === null` and the token carries no JWT `exp`, omit the `expires_at` key from the token artifact instead of computing `Date.now() + null * 60000`. Update the header JSDoc schema (`"probe": { "path", "method" } | null`, `"maxAgeMinutes": number | null` with the static-token-only rule) in the same edit. Do not touch the five anchor lines listed in `## Notes`.
- **MIRROR**: P1 (required-field validation), P2 (reuse gate that reads the probe path)
- **VALIDATE**: from the repository root, run the command below. It builds four throwaway git-initialised projects and runs a copy of the real template in each; it exits non-zero on the first violated expectation. On today's tree the first expectation fails (a `null` probe with a browser probe halts `FAILED_LOGIN_CONFIG_INCOMPLETE: roles.qa.probe.path`), so the gate can fail.

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process");
const PR=path.resolve("plugins/relay");
const tpl=fs.readFileSync(path.join(PR,"resources/auth-login.template.mjs"),"utf8");
const fail=(m)=>{console.error("FAIL: "+m);process.exit(1)};
const mk=(cfg)=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),"kit-"));cp.spawnSync("git",["init","-q",d]);const a=path.join(d,"PRPs","auth");fs.mkdirSync(a,{recursive:true});fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify(cfg));fs.writeFileSync(path.join(a,"login-qa.mjs"),tpl.split("__RELAY_ROLE__").join("qa"));return d};
const go=(d,env)=>{const r=cp.spawnSync(process.execPath,[path.join(d,"PRPs","auth","login-qa.mjs"),"--root",d,"--plugin-root",PR],{encoding:"utf8",env:Object.assign({},process.env,env||{}),timeout:90000});return String(r.stderr||"")};
const cfg=(r)=>({baseUrl:"http://127.0.0.1:9",roles:{qa:r}});
const form={mechanism:"form",loginPath:"/login",form:{usernameSelector:"#u",passwordSelector:"#p",submitSelector:"#s"},probe:null,sessionCookie:null,maxAgeMinutes:60,credentials:{usernameEnv:null,passwordEnv:null},userCreation:{command:null},browserProbe:{route:"/me",marker:{kind:"text",value:"Hello"},roleMarker:null}};
let e=go(mk(cfg(form)));
if(e.includes("FAILED_LOGIN_CONFIG_INCOMPLETE"))fail("a null probe with a browser probe halted: "+e);
if(!e.includes("FAILED_CREDENTIALS_UNAVAILABLE"))fail("did not reach the credential step: "+e);
e=go(mk(cfg(Object.assign({},form,{browserProbe:null}))));
if(!e.includes("FAILED_LOGIN_CONFIG_INCOMPLETE: roles.qa.probe.path"))fail("a role without a browser probe must still require probe.path: "+e);
e=go(mk(cfg(Object.assign({},form,{maxAgeMinutes:null}))));
if(!e.includes("FAILED_LOGIN_CONFIG_INCOMPLETE: roles.qa.maxAgeMinutes"))fail("a non-static role must still require a positive maxAgeMinutes: "+e);
const st={mechanism:"static-token",loginPath:null,probe:{path:"/api/me",method:"GET"},sessionCookie:null,maxAgeMinutes:null,credentials:{usernameEnv:null,passwordEnv:null},userCreation:{command:null},staticToken:{tokenEnv:"RELAY_P8_TOKEN",header:"Authorization",valuePrefix:"Bearer ",browser:null},browserProbe:null};
e=go(mk(cfg(st)),{RELAY_P8_TOKEN:"fixture-token"});
if(e.includes("FAILED_LOGIN_CONFIG_INCOMPLETE"))fail("a static-token role with maxAgeMinutes null halted: "+e);
if(e.includes("fixture-token"))fail("the token value was printed");
console.log("PASS: optional HTTP probe and null static-token age behave as specified");
'
```

### Task 2: UPDATE plugins/relay/resources/auth-login.template.mjs — static-token failures name the failing step

- **ACTION**: Delivers AC-A6. Change `proveStaticToken` to return `'proven'`, `'unproven'`, `'transport'` (the request itself threw, or the probe URL is not same-origin) or `{ rejected: <status number> }` (the protected endpoint answered non-2xx with the token); `staticTokenReusable` already tests only `!== 'proven'`, so reuse is unchanged. In `main`'s static-token branch map the results to halts, each printing no part of the token: `'unproven'` keeps `FAILED_TOKEN_UNPROVEN` byte-for-byte; a rejection prints `FAILED_TOKEN_REJECTED: the protected endpoint answered <status> with the token; no session was saved`; `'transport'` prints `FAILED_TOKEN_TRANSPORT: the request to the protected endpoint failed; no session was saved`. In `placeStaticToken` replace the two `FAILED_LOGIN_REJECTED` returns (the `!appUrl` branch and the final `catch`) with `FAILED_TOKEN_PLACEMENT: the token could not be placed at the declared browser location; nothing was saved`. Keep `FAILED_TOKEN_LOCATION_UNREACHABLE`, `FAILED_TOKEN_UNPROVEN`, `FAILED_NON_LOCAL_TARGET`, the `valueField` incomplete halt and `FAILED_INDEXEDDB_UNSUPPORTED` exactly as shipped. Document the three new codes in the header JSDoc. No new `writeFileSync(` and no new `storageState` call.
- **MIRROR**: P3 (static-token proof and its caller), P4 (placement failure sites)
- **VALIDATE**: run the command below from the repository root. It starts an in-process HTTP server and runs the template copies as ASYNC child processes (never `spawnSync` beside the server). On today's tree the first expectation fails (`FAILED_LOGIN_REJECTED` is printed instead of `FAILED_TOKEN_REJECTED`). It needs the Playwright install the corpus already requires.

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process"),http=require("http");
const PR=path.resolve("plugins/relay");
const tpl=fs.readFileSync(path.join(PR,"resources/auth-login.template.mjs"),"utf8");
const fail=(m)=>{console.error("FAIL: "+m);process.exit(1)};
const sh=(a)=>new Promise((ok)=>{const p=cp.spawn(a[0],a.slice(1));p.on("close",ok)});
const mk=async(cfg)=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),"kit-"));await sh(["git","init","-q",d]);const a=path.join(d,"PRPs","auth");fs.mkdirSync(a,{recursive:true});fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify(cfg));fs.writeFileSync(path.join(a,"login-qa.mjs"),tpl.split("__RELAY_ROLE__").join("qa"));return d};
const go=(d)=>new Promise((ok)=>{const p=cp.spawn(process.execPath,[path.join(d,"PRPs","auth","login-qa.mjs"),"--root",d,"--plugin-root",PR],{env:Object.assign({},process.env,{RELAY_P8_TOKEN:"fixture-token"})});let e="";p.stderr.on("data",(c)=>{e+=c});p.on("close",()=>ok(e))});
const role=(browser)=>({mechanism:"static-token",loginPath:null,probe:{path:"/api/me",method:"GET"},sessionCookie:null,maxAgeMinutes:60,credentials:{usernameEnv:null,passwordEnv:null},userCreation:{command:null},staticToken:{tokenEnv:"RELAY_P8_TOKEN",header:"Authorization",valuePrefix:"Bearer ",browser:browser},browserProbe:null});
const mode={v:"reject"};
const srv=http.createServer((q,s)=>{if(mode.v==="reject"){s.statusCode=401;return s.end("no")}s.statusCode=q.headers.authorization==="Bearer fixture-token"?200:401;s.end("x")});
srv.listen(0,"127.0.0.1",async()=>{
  try{
    const base="http://127.0.0.1:"+srv.address().port;
    let e=await go(await mk({baseUrl:base,roles:{qa:role(null)}}));
    if(!e.includes("FAILED_TOKEN_REJECTED")||!e.includes("401"))fail("a rejected token must halt FAILED_TOKEN_REJECTED naming 401: "+e);
    if(e.includes("FAILED_LOGIN_REJECTED")||e.includes("fixture-token"))fail("old code or token value printed: "+e);
    e=await go(await mk({baseUrl:"http://127.0.0.1:9",roles:{qa:role(null)}}));
    if(!e.includes("FAILED_TOKEN_TRANSPORT"))fail("a refused connection must halt FAILED_TOKEN_TRANSPORT: "+e);
    mode.v="protect";
    e=await go(await mk({baseUrl:base,roles:{qa:role({kind:"localStorage",originPath:"https://example.org/x",key:"t"})}}));
    if(!e.includes("FAILED_TOKEN_PLACEMENT"))fail("a placement failure must halt FAILED_TOKEN_PLACEMENT: "+e);
    console.log("PASS: rejected, transport and placement each halt with their own code");
    srv.close();process.exit(0);
  }catch(x){fail(String(x))}
});
'
```

### Task 3: UPDATE plugins/relay/resources/auth-login.template.mjs — presence is a stable state, and a probe failure after a login names the probe

- **ACTION**: Delivers AC-A2 and AC-A4. Add ONE new constant line `const BROWSER_PROBE_DWELL_MS = 5000;` immediately after the existing `BROWSER_PROBE_NEGATIVE_MS` line, with a comment labelled as a judgment: the value comes from the NF4 measurement (`#container` visible at 5.3 s with invalidated tokens, sampled every 500 ms), it is a floor chosen to outlast that single observation rather than a derived bound, and the settle step below adds to it. Do not edit the three existing timing constants. In `browserProbeProof`, session side only, replace the single presence decision with this order: load, `visible(marker, POSITIVE)` (a `timeout` is `'expired'`, recording `{ field: 'marker' }`), the existing `networkidle` settle aid, one non-blocking `locate(...).isVisible()` check, a `setTimeout` wait of `BROWSER_PROBE_DWELL_MS`, then another `isVisible()` check; a marker that is no longer visible is `'expired'` (never `'wrong-account'`), so the caller re-logs in or halts `FAILED_INTERACTIVE_LOGIN_REQUIRED` with no terminal. Only after the marker is stably present, when `bp.roleMarker` is declared: `visible(roleMarker, POSITIVE)` (a `timeout` stays `'wrong-account'`), then a second dwell and an `isVisible()` re-check of BOTH markers, either vanished being `'expired'` with the matching `field`. Never use `waitForFunction`; never block on the re-checks. Add an optional last parameter `detail` (an object the function fills with `{ field: 'marker' | 'roleMarker', existed: boolean }`, where `existed` is `(await locate(...).count()) > 0` read when the marker was found absent) and thread it through `proveSession`. In `main`'s save path, when `role.browserProbe` is set and the save proof is `'expired'`, print `FAILED_PROBE_MARKER_ABSENT: roles.<ROLE>.browserProbe.<field> never became stably visible after the login (<an element matching it existed but was not visible | no element matched it>); nothing was saved` and return 1; every other role keeps `FAILED_LOGIN_REJECTED` unchanged (P6). A reuse-path `'expired'` is unchanged (`reuseDecision` still returns false, so the script re-logs in). The negative (fresh-context) side is unchanged. Document `FAILED_PROBE_MARKER_ABSENT` and the dwell in the header JSDoc.
- **MIRROR**: P5 (browser probe verdict ladder and the halt table), P6 (save-time mapping of an expired proof)
- **VALIDATE**: run the command below from the repository root (about 70 seconds). It serves a page whose marker appears for a cookie and, in one variant, removes itself after 2.5 s. Expectations: (1) a transient marker is NOT reused and the script falls to the credential step; (2) a persistent marker IS reused (control); (3) a static-token role whose probe marker never exists halts `FAILED_PROBE_MARKER_ABSENT` naming "no element matched"; (4) a hidden element halts naming "existed but was not visible". On today's tree (1) fails because the session is reused. Async children only.

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process"),http=require("http");
const PR=path.resolve("plugins/relay");
const tpl=fs.readFileSync(path.join(PR,"resources/auth-login.template.mjs"),"utf8");
const fail=(m)=>{console.error("FAIL: "+m);process.exit(1)};
const sh=(a)=>new Promise((ok)=>{const p=cp.spawn(a[0],a.slice(1));p.on("close",ok)});
const mk=async(cfg,session)=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),"kit-"));await sh(["git","init","-q",d]);const a=path.join(d,"PRPs","auth");fs.mkdirSync(path.join(a,".sessions"),{recursive:true});fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify(cfg));fs.writeFileSync(path.join(a,"login-qa.mjs"),tpl.split("__RELAY_ROLE__").join("qa"));if(session)fs.writeFileSync(path.join(a,".sessions","qa.json"),JSON.stringify({cookies:[{name:"s",value:"1",domain:"127.0.0.1",path:"/",expires:-1,httpOnly:false,secure:false,sameSite:"Lax"}],origins:[]}));return d};
const go=(d)=>new Promise((ok)=>{const p=cp.spawn(process.execPath,[path.join(d,"PRPs","auth","login-qa.mjs"),"--root",d,"--plugin-root",PR],{env:Object.assign({},process.env,{RELAY_P8_TOKEN:"fixture-token"})});let o="",e="";p.stdout.on("data",(c)=>{o+=c});p.stderr.on("data",(c)=>{e+=c});p.on("close",()=>ok({o,e}))});
const mode={v:"transient"};
const srv=http.createServer((q,s)=>{
  if(q.url.startsWith("/api/me")){s.statusCode=q.headers.authorization==="Bearer fixture-token"?200:401;return s.end("x")}
  const has=(q.headers.cookie||"").includes("s=1");
  s.setHeader("content-type","text/html");
  if(mode.v==="hidden")return s.end("<html><body><div id=\"layout\" style=\"display:none\">Hi</div></body></html>");
  if(mode.v==="none"||!has)return s.end("<html><body>anon</body></html>");
  if(mode.v==="transient")return s.end("<html><body><div id=\"layout\">Hello</div><script>setTimeout(function(){var e=document.getElementById(\"layout\");if(e)e.remove()},2500)</script></body></html>");
  return s.end("<html><body><div id=\"layout\">Hello</div></body></html>");
});
const formRole={mechanism:"form",loginPath:"/login",form:{usernameSelector:"#u",passwordSelector:"#p",submitSelector:"#s"},probe:null,sessionCookie:"s",maxAgeMinutes:60,credentials:{usernameEnv:null,passwordEnv:null},userCreation:{command:null},browserProbe:{route:"/app",marker:{kind:"selector",value:"#layout"},roleMarker:null}};
const tokRole={mechanism:"static-token",loginPath:null,probe:{path:"/api/me",method:"GET"},sessionCookie:null,maxAgeMinutes:60,credentials:{usernameEnv:null,passwordEnv:null},userCreation:{command:null},staticToken:{tokenEnv:"RELAY_P8_TOKEN",header:"Authorization",valuePrefix:"Bearer ",browser:{kind:"localStorage",originPath:"/app",key:"t"}},browserProbe:{route:"/app",marker:{kind:"selector",value:"#layout"},roleMarker:null}};
srv.listen(0,"127.0.0.1",async()=>{
  try{
    const base="http://127.0.0.1:"+srv.address().port;
    let r=await go(await mk({baseUrl:base,roles:{qa:formRole}},true));
    if(r.o.includes("SESSION_REUSED"))fail("a marker that vanished inside the dwell was reused");
    if(!r.e.includes("FAILED_CREDENTIALS_UNAVAILABLE"))fail("a vanished marker must fall to a re-login, not a probe halt: "+r.e);
    if(r.e.includes("FAILED_PROBE_WRONG_ACCOUNT"))fail("a vanished marker must never be a wrong-account halt");
    mode.v="stable";
    r=await go(await mk({baseUrl:base,roles:{qa:formRole}},true));
    if(!r.o.includes("SESSION_REUSED"))fail("control: a stably present marker must be reused: "+r.e);
    mode.v="none";
    r=await go(await mk({baseUrl:base,roles:{qa:tokRole}},false));
    if(!r.e.includes("FAILED_PROBE_MARKER_ABSENT")||!r.e.includes("no element matched"))fail("expected FAILED_PROBE_MARKER_ABSENT with no element matched: "+r.e);
    if(r.e.includes("FAILED_LOGIN_REJECTED"))fail("a probe failure after a login must not say FAILED_LOGIN_REJECTED");
    mode.v="hidden";
    r=await go(await mk({baseUrl:base,roles:{qa:tokRole}},false));
    if(!r.e.includes("FAILED_PROBE_MARKER_ABSENT")||!r.e.includes("existed but was not visible"))fail("expected the hidden-element wording: "+r.e);
    console.log("PASS: dwell and FAILED_PROBE_MARKER_ABSENT behave as specified");
    srv.close();process.exit(0);
  }catch(x){fail(String(x))}
});
'
```

Group 1 gate (run after Task 3): `npm run validate` must exit 0.

### Group 2 — template identity and stale halt

### Task 4: UPDATE plugins/relay/resources/auth-login.template.mjs — template identity stamp and FAILED_KIT_SCRIPT_STALE

- **ACTION**: Delivers AC-A3 (script side). Add, on its own line directly above `const ROLE = '__RELAY_ROLE__';`, the stamp `const KIT_TEMPLATE_ID = 'auth-login/1';` with a comment: bump the number in the same edit as any behaviour change to this template; it is an explicit stamp and not a content hash because every template test runs a deliberately mutated copy, which a hash would make halt stale. `/relay-auth-scripts` copies the line verbatim (its one substitution is `__RELAY_ROLE__`, which the stamp does not contain). Add a read-only check in `main`, AFTER the `// GUARD-SITE` block (the `target.ok` return) and BEFORE the `// SECRECY-SITE` marker, so the order stays guard, stale check, secrecy, write: read `join(pluginRoot, 'resources', 'auth-login.template.mjs')` with the already-imported `readFileSync` inside a `try`, take the stamp with the pattern `/^const KIT_TEMPLATE_ID = '([^']+)';$/m`, and compare it with `KIT_TEMPLATE_ID`. If the installed template is unreadable or carries no stamp, SKIP the check and continue (fail open): the check is a version-compatibility signal, not a safety guard, and the guard, the secrecy proof and both proof directions still run; this is also what keeps the fake plugin roots in `auth-login-template.test.mjs` (empty, partial and a full copy) green, because only the full copy has a template and it carries the identical stamp. If the two ids differ, print `FAILED_KIT_SCRIPT_STALE: this script was generated from template <script-id> but the installed template is <installed-id>; nothing was saved or reused; regenerate it with /relay-auth-scripts --refresh` and return 1. The check writes nothing and runs before any ignore rule, session or credential is touched. Do not add the markers `// GUARD-SITE`, `// SECRECY-SITE` or `// WRITE-SITE` anywhere else, and do not add a `writeFileSync(`. Document the stamp and the halt in the header JSDoc, wording the header so that no line begins with `const KIT_TEMPLATE_ID`.
- **MIRROR**: P7 (guard site then secrecy site)
- **VALIDATE**: run the command below from the repository root. It runs a copy of the template stamped differently from the installed one and requires `FAILED_KIT_SCRIPT_STALE` naming both ids with no `.sessions` directory created, then runs an identically stamped copy as a control that must NOT print the halt. On today's tree it fails at once (the template has no stamp line).

```bash
node -e '
const fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process");
const PR=path.resolve("plugins/relay");
const tpl=fs.readFileSync(path.join(PR,"resources/auth-login.template.mjs"),"utf8");
const fail=(m)=>{console.error("FAIL: "+m);process.exit(1)};
const m=/^const KIT_TEMPLATE_ID = \x27([^\x27]+)\x27;$/m.exec(tpl);
if(!m)fail("the template carries no KIT_TEMPLATE_ID stamp line");
const run=(text)=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),"kit-"));cp.spawnSync("git",["init","-q",d]);const a=path.join(d,"PRPs","auth");fs.mkdirSync(a,{recursive:true});fs.writeFileSync(path.join(a,"login.config.json"),JSON.stringify({baseUrl:"http://127.0.0.1:9",roles:{}}));const s=path.join(a,"login-qa.mjs");fs.writeFileSync(s,text);const r=cp.spawnSync(process.execPath,[s,"--root",d,"--plugin-root",PR],{encoding:"utf8",timeout:60000});return {d,status:r.status,err:String(r.stderr||"")}};
const base=tpl.split("__RELAY_ROLE__").join("qa");
const stale=run(base.replace(m[0],m[0].replace(m[1],m[1]+"-stale")));
if(stale.status!==1||!stale.err.includes("FAILED_KIT_SCRIPT_STALE"))fail("a differently stamped script must halt FAILED_KIT_SCRIPT_STALE: "+stale.err);
if(!stale.err.includes(m[1]+"-stale")||!stale.err.includes(m[1]))fail("the halt must name both template identities: "+stale.err);
if(fs.existsSync(path.join(stale.d,"PRPs","auth",".sessions"))||fs.existsSync(path.join(stale.d,"PRPs","auth",".gitignore")))fail("the stale halt wrote something");
const same=run(base);
if(same.err.includes("FAILED_KIT_SCRIPT_STALE"))fail("control: an identically stamped script must not be stale: "+same.err);
console.log("PASS: stale detection halts before any write and a matching stamp is not stale");
'
```

Group 2 gate (run after Task 4): `npm run validate` must exit 0.

### Group 3 — the runner

### Task 5: UPDATE plugins/relay/scripts/qa-run.mjs — named block codes and a read-only stale pre-flight

- **ACTION**: Delivers AC-A3 (runner side) and AC-A4 (runner side). Extend `PROBE_BLOCK_CODES` with `FAILED_PROBE_MARKER_ABSENT` and `FAILED_KIT_SCRIPT_STALE`; keep the three existing entries. Extend the `obtainSession` failure result with an optional `detail` string and use it for the stale reason. Before the `spawnSync` of a role's script, add a pre-flight that reads the script text and the installed template (`join(PLUGIN_ROOT, 'resources', 'auth-login.template.mjs')`) with the already-imported `readFileSync` and compares the stamp lines with the same pattern the template uses. Apply it only to a script that looks template-generated (its text contains the sentence `Login script for one role of the test-auth kit`), so hand-written or stub scripts are not judged: a template-generated script whose stamp differs from the installed template's, or that has no stamp at all, yields `{ ok: false, code: 'FAILED_KIT_SCRIPT_STALE', detail: <script id or "unstamped"> vs <installed id> }` without spawning; an unreadable or unstamped installed template skips the pre-flight (fail open, same reasoning as Task 4). In the routing block, a stale result is blocked with a reason that names both identities and says to run `/relay-auth-scripts --refresh`; the other probe codes keep their existing reason text. `FAILED_PROBE_MARKER_ABSENT` rides the existing `PROBE_BLOCK_CODES` branch. Add no `writeFileSync(` or `renameSync(` and no second `// GUARD-SITE` or `// WRITE-SITE` marker (the `qa-run-contract` check pins them).
- **MIRROR**: P8 (runner halt-code mapping and session acquisition)
- **VALIDATE**: run the command below. It syntax-checks the script, then runs the runner's own pinned suites, which exercise `obtainSession` and the routing block through fixture projects whose scripts are template copies carrying the current stamp; they must stay green. The new reasons themselves are covered by NEW_TEST_REQUIRED outcomes for the test pair (an effect-level fixture needs the canonical `qa-report.md` layout the test pair owns). The two greps are secondary: the codes are deliverable text and are absent from the file today, so each grep fails on today's tree.

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --test scripts/validate/checks/qa-run.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-layout.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs
grep -q "FAILED_PROBE_MARKER_ABSENT" plugins/relay/scripts/qa-run.mjs
grep -q "FAILED_KIT_SCRIPT_STALE" plugins/relay/scripts/qa-run.mjs
```

### Task 6: UPDATE plugins/relay/scripts/qa-run.mjs — a target that authenticates everyone cannot make a browser case pass

- **ACTION**: Delivers AC-A8. The record lives in `PRPs/auth/login.config.json` on the role entry as `authenticatesAnonymous`: `null` or absent (the default), or `{ "evidence": "<file:line>", "alternativeBaseUrl": string | null }`. In the case-routing block, after the step-path guard loop and BEFORE `prepareState` (so nothing is seeded or logged in for a case that will be blocked), when `driver === 'browser'` and `role !== null` and the role's config entry carries an object `authenticatesAnonymous`: (a) `alternativeBaseUrl` null or absent returns `blocked('FAILED_TARGET_PRE_AUTHENTICATED', ...)` naming the role and the recorded evidence; (b) otherwise run the guard on the alternative URL with the same call the primary target uses (`ctx.target.guard.checkTarget(altUrl, { root: ctx.root })`; a refusal returns `blocked('FAILED_NON_LOCAL_TARGET', ...)` with nothing requested) and build the alternative Target the way `guardTarget` builds the primary one; (c) run the anonymous check below; clean means the case runs with a shallow copy of the context whose `target` is the alternative Target (`{ ...ctx, target: alt }`, passed to the driver instead of `ctx`), anything else returns `blocked('FAILED_TARGET_PRE_AUTHENTICATED', ...)`. The anonymous check mirrors P9: a fresh browser context with NO storage state and the same guard route, `page.goto` on the alternative origin plus the role's `browserProbe.route`, the `networkidle` settle aid, then a visible-wait for `browserProbe.marker` of `BROWSER_PROBE_NEGATIVE_MS`-equivalent length (a local `ANONYMOUS_CHECK_MS = 20000` constant): marker visible means the injection is present (not clean); a timeout with the page loaded means clean; a failed load returns `blocked('TARGET_UNREACHABLE', ...)`. A role with no `browserProbe` cannot be confirmed, so it stays `FAILED_TARGET_PRE_AUTHENTICATED`. Cache the check per role in a new `anonChecks` Map added to the run context type and to `makeCtx`. No role or case with `authenticatesAnonymous` absent changes behaviour, and HTTP cases are never gated. Add no `// GUARD-SITE` marker and no write call.
- **MIRROR**: P9 (runner browser context with the guard route), P8 (runner halt-code mapping and session acquisition)
- **VALIDATE**: run the command below. The regression suites cover every existing routing path (no behaviour change for a role without `authenticatesAnonymous`). The new gate itself is covered by NEW_TEST_REQUIRED outcomes (a fixture needs the canonical report layout and a served page); the greps are secondary and fail on today's tree because the code is absent.

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --test scripts/validate/checks/qa-run.test.mjs scripts/validate/checks/qa-run-contract.test.mjs scripts/validate/checks/qa-run-layout.test.mjs scripts/validate/checks/qa-run-record-resolution.test.mjs scripts/validate/checks/auth-local-guard-sites.test.mjs
grep -q "FAILED_TARGET_PRE_AUTHENTICATED" plugins/relay/scripts/qa-run.mjs
grep -q "authenticatesAnonymous" plugins/relay/scripts/qa-run.mjs
npm run validate
```

Group 3 gate: the final line of Task 6 (`npm run validate`) must exit 0.

### Group 4 — markdown, reference pages and changelog

### Task 7: UPDATE plugins/relay/commands/relay-auth-scripts.md — null probe, null age, the pre-authenticated record and `--refresh`

- **ACTION**: Delivers AC-A1, AC-A3, AC-A5 and AC-A8 (generation side). (a) Argument parsing: add `--refresh` to the argument list, the `argument-hint` frontmatter, the Usage line and the Example line, in the P10 shape. (b) Phase A, `browserProbe` bullet: when a browser probe is filled and the model states no protected endpoint on the application's own origin, the HTTP `probe` is written as the JSON value `null`, never `TBD - needs validation`; when neither a probe nor an endpoint is stated it stays `TBD - needs validation` as today. (c) `static-token` bullet: when the model states the token does not expire, write `maxAgeMinutes: null`; any other role still requires a positive `maxAgeMinutes`, and an unstated value stays `TBD - needs validation`. (d) New bullet: when `## Login Flow` records a pre-authenticated target for a role (the one-line convention of Task 9), write the role's `authenticatesAnonymous` as `{ "evidence": "<file:line from the record>", "alternativeBaseUrl": <url or null> }`, evidence being mandatory (a record with no `file:line` is written as `TBD - needs validation`); otherwise `null`. Document the halts `FAILED_PROBE_MARKER_ABSENT`, `FAILED_KIT_SCRIPT_STALE`, `FAILED_TOKEN_REJECTED`, `FAILED_TOKEN_TRANSPORT` and `FAILED_TOKEN_PLACEMENT` beside the existing halt lists. (e) `--refresh`: without it an existing script is skipped and reported, and now the report also says, per skipped script, whether its stamp line differs from the installed template's or is absent (stale). With it, every selected role's script is regenerated from the installed template by the same single `__RELAY_ROLE__` substitution and overwrites the existing file, each replaced script being reported; the configuration gains only the fields a newer template introduces (`browserProbe` and `authenticatesAnonymous`, as `null` unless the model states them) on roles that lack them, and no key that already exists, including a `TBD - needs validation` value, is ever changed. `--refresh` never touches a session, a token, `credentials.json` or `credentials.example.json`. Keep the written-file set exactly `PRPs/auth/login.config.json`, `PRPs/auth/login-<role>.mjs` and `PRPs/auth/credentials.example.json` inside the "only files written" bullet; keep the sentence `replacing every occurrence of `__RELAY_ROLE__` with the slug — no other substitution and no edit` byte-for-byte; amend the "What you do NOT do" overwrite bullet to read `Overwrite an existing role entry, or an existing script without `--refresh`.`. Do not introduce the strings `relay-auth-setup`, `/relay-qa-run`, `design-spec` or `--local-host` anywhere in the file (pinned by `auth-scripts-command.test.mjs`).
- **MIRROR**: P10 (command argument parsing)
- **VALIDATE**: run the command below. The pinned suite is the effect check for the command's contract (precondition order, the written-file set, the single substitution, the banned tokens), and it must stay green; the greps assert authored literals the plan wrote in this ACTION and each is absent from the file today (`--refresh` does not appear in it, nor does `maxAgeMinutes: null`), so each fails on today's tree.

```bash
set -euo pipefail
node --test scripts/validate/checks/auth-scripts-command.test.mjs
grep -q -- "--refresh" plugins/relay/commands/relay-auth-scripts.md
grep -q "maxAgeMinutes: null" plugins/relay/commands/relay-auth-scripts.md
grep -q "authenticatesAnonymous" plugins/relay/commands/relay-auth-scripts.md
grep -q "FAILED_KIT_SCRIPT_STALE" plugins/relay/commands/relay-auth-scripts.md
```

### Task 8: UPDATE plugins/relay/commands/relay-auth-setup.md — `--fresh` archive and the DRAFT re-run offer

- **ACTION**: Delivers AC-A7. Add `--fresh` to the argument list, the Usage line and the Example line (`/relay-auth-setup --fresh`), with `--base-url` still optional and combinable. Add a precondition `### P5 — Archive on --fresh` after P4 and before `## Phase A`, running only with `--fresh`: capture a UTC stamp with `date -u +%Y%m%dT%H%M%SZ`; the secrecy `ensure` call of P3 has already proven the kit's `.sessions/` directory ignored (its default secret paths include a file inside it), and the archive lives in an `archive/<stamp>/` subdirectory of that same ignored directory because an existing kit's `.gitignore` is never overwritten, so no new ignore rule could reach it and `.sessions/` is the one rule every kit must carry; write that location relative to the kit directory and never spell the literal `PRPs/auth/.sessions` or `PRPs/auth/credentials` anywhere in the file (`auth-model-pair.test.mjs` pins both as `SECRET_PATH_TARGET`). Move (with `mv`, never copy-then-keep) the model, its review log, every `login-*.mjs` script and `login.config.json` into the archive when they exist; it never moves, copies, reads or prints any other file of the kit's ignored directory, any credential file or any session, storage-state or token file, and it archives nothing outside the kit directory. `--fresh` then proceeds as if no model existed (Phase A runs from scratch); on an APPROVED model it is the one exception to the `FAILED_AUTH_MODEL_ALREADY_APPROVED` halt (keep that halt's text byte-for-byte for the no-`--fresh` case), and AC-9 still holds because the new DRAFT needs a fresh explicit approval. Amend P4's DRAFT branch: without `--fresh`, when a DRAFT model exists, offer the user a choice (ask once) between reviewing the existing DRAFT (Phase B as today) and re-running the writer; choosing the re-run first archives the DRAFT model and its review log by the same P5 move, then runs Phase A. A script with no template identity counts as stale under the template-identity rule, so mention that `/relay-auth-scripts --refresh` replaces a hand-written script after the new model is approved. Keep the "only files written" bullet's three `PRPs/auth/...` paths and add no new `PRPs/auth/` token inside it (describe the archive moves in prose there as relocations); keep `This command writes no login script and no credential file.`, the `Never flip` and `Never `Task`-dispatch either role.` sentences and the guard, sources, secrecy, collision, Phase A, Phase B order untouched. Do not mention `/relay-qa-run` or `design-spec`.
- **MIRROR**: P11 (collision handling in `/relay-auth-setup`), P10 (command argument parsing)
- **VALIDATE**: run the command below. The pinned suite (`auth-model-pair.test.mjs`) is the effect check for the command's contract and must stay green, including `ORDER`, `SECRET_PATH_TARGET` and `WRITTEN_SET`. `--fresh` is not in the file today, so the greps fail on today's tree. The negative grep proves no secret path literal was introduced; it uses real exit semantics.

```bash
set -euo pipefail
node --test scripts/validate/checks/auth-model-pair.test.mjs
grep -q -- "--fresh" plugins/relay/commands/relay-auth-setup.md
grep -q "date -u +%Y%m%dT%H%M%SZ" plugins/relay/commands/relay-auth-setup.md
if grep -nE "PRPs/auth/(credentials|\.sessions)" plugins/relay/commands/relay-auth-setup.md; then
  echo "FAIL: a secret path literal is named in relay-auth-setup.md"; exit 1
else
  echo "PASS: no secret path literal in relay-auth-setup.md"
fi
```

### Task 9: UPDATE the auth-model template, writer and reviewer — marker guidance and the pre-authenticated-target record

- **ACTION**: Delivers AC-A2 (guidance) and AC-A8 (record). In `plugins/relay/resources/auth-model-template.md`, inside the existing `## Login Flow` parenthetical (P12) and without adding a heading (the template's nine-second-level-heading rule stays true): (a) prefer a browser-probe marker that appears only after a successful API response over one drawn from layout rendered from client-side state, because a client-rendered layout can show for seconds with an invalidated session; (b) a role may state, as one line, a pre-authenticated target: `pre-authenticated target: <what the origin does>; injecting code: <file:line>; alternative local target: <url or none>`, recorded by description and never a credential, token or cookie value; the injecting code's `file:line` is mandatory. In `plugins/relay/agents/auth-model-writer.md`: when choosing candidate markers, prefer the server-backed kind and say so in the candidate's description; when the project's code shows a dev server or proxy that supplies a credential to every request, record the pre-authenticated target line with the injecting code's `file:line`, and never invent the evidence (an unknown is `TBD - needs validation` under `## Open Questions and Assumptions`). In `plugins/relay/agents/auth-model-reviewer.md`: extend the existing evidence rows (`R-AM1`/`R-AM6` as their current wording allows) so a recorded pre-authenticated target with no `file:line`, or with a credential-shaped value, fails; do not add, remove or rename a rubric id (the ids `R-AM1` through `R-AM7` are pinned), and keep the tools line, the `subagent` default, the two-condition flip and every other pinned sentence byte-for-byte. Read the writer and reviewer in full before editing and place each addition inside an existing item.
- **MIRROR**: P12 (login-flow one-line convention)
- **VALIDATE**: run the command below. `auth-model-pair.test.mjs` pins the template's nine headings, the reviewer's rubric ids and flip sentences and the writer's tool list and secret list, so it is the effect check; the grep is secondary and the authored literal `pre-authenticated target` is absent from the template today.

```bash
set -euo pipefail
node --test scripts/validate/checks/auth-model-pair.test.mjs
grep -q "pre-authenticated target" plugins/relay/resources/auth-model-template.md
grep -q "pre-authenticated target" plugins/relay/agents/auth-model-writer.md
grep -q "pre-authenticated target" plugins/relay/agents/auth-model-reviewer.md
```

### Task 10: UPDATE plugins/relay/commands/relay-qa-run.md, the two reference pages and the changelog

- **ACTION**: Delivers AC-A3, AC-A4 and AC-A8 (documentation side). In `relay-qa-run.md`'s final-output paragraph (lines 223-227 today) extend the sentence listing the kit's named probe halts with `FAILED_PROBE_MARKER_ABSENT` and `FAILED_KIT_SCRIPT_STALE` (the latter telling the operator to run `/relay-auth-scripts --refresh`), and add one sentence stating that a browser case for a role whose model records a pre-authenticated target is `blocked` with `FAILED_TARGET_PRE_AUTHENTICATED` unless the configuration names an alternative local target that the runner's anonymous check confirms clean; every other session failure keeps `SESSION_UNAVAILABLE`. Keep `HUMAN GATE STILL OPEN`, `FAILED_NON_LOCAL_TARGET` and `qa-run.mjs` and never write `relay-auth-setup`, `design-spec` or `subagent_type` in that file (pinned by `qa-run-contract`). Read `documentation/AGENTS.md` in full first. Update the `/relay-auth-scripts`, `/relay-auth-setup` and `/relay-qa-run` entries in `documentation/reference/commands.html` and the `auth-model-writer` and `auth-model-reviewer` entries in `documentation/reference/agents.html` to match Tasks 1-9 (no emoji, relative paths, existing CSS vocabulary, no new page). Replace `<p>Nothing yet.</p>` under `Unreleased` in `documentation/changelog.html` with an `<h3 id="unreleased-added">Added</h3>` list entry in the P13 format (`&mdash;`, `&rarr;`, `<code>`) naming phase 8 of `PRPs/prds/manual-qa-runner-auth-kit.prd.md`, the eight behaviours and the reference pages updated. These edits sit inside existing pages, so NAV and the search index are not touched.
- **MIRROR**: P13 (changelog Unreleased block and release entry)
- **VALIDATE**: run the command below. `qa-run-contract` pins the command's required and banned tokens and is the effect check for `relay-qa-run.md`; the final line is the whole-suite static gate. The greps are secondary: the three codes are absent from the command and the changelog today (the changelog has no `FAILED_KIT_SCRIPT_STALE`), so each fails on today's tree.

```bash
set -euo pipefail
node --test scripts/validate/checks/qa-run-contract.test.mjs
grep -q "FAILED_PROBE_MARKER_ABSENT" plugins/relay/commands/relay-qa-run.md
grep -q "FAILED_TARGET_PRE_AUTHENTICATED" plugins/relay/commands/relay-qa-run.md
grep -q "FAILED_KIT_SCRIPT_STALE" documentation/changelog.html
grep -q "FAILED_TARGET_PRE_AUTHENTICATED" documentation/reference/commands.html
npm run validate
```

## Validation Commands

Run from the repository root. Level 3 must be green after Group 4; each group's own gate (`npm run validate`) is named in its last task.

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/resources/auth-login.template.mjs
node --check plugins/relay/scripts/qa-run.mjs
node plugins/relay/resources/auth-login.template.mjs --help
npm run validate
```

`npm run validate` is 28 checks today and stays 28 (no check is added). The `--help` run exits 0 without `--plugin-root` by design of `parseArgs`.

### Level 2 — CONTENT_INVARIANTS

```bash
set -euo pipefail
node -e '
const fs=require("fs");
const t=fs.readFileSync("plugins/relay/resources/auth-login.template.mjs","utf8");
const c=(s)=>t.split(s).length-1;
const bad=(m)=>{console.error("FAIL: "+m);process.exit(1)};
const g=t.indexOf("// GUARD-SITE"),s=t.indexOf("// SECRECY-SITE"),w=t.indexOf("// WRITE-SITE");
if(!(g>0&&g<s&&s<w))bad("site order GUARD < SECRECY < WRITE broken");
for(const m of ["// GUARD-SITE","// SECRECY-SITE","// WRITE-SITE"])if(c(m)!==1)bad(m+" must appear exactly once, found "+c(m));
if(c("writeFileSync(")!==1)bad("writeFileSync( must appear exactly once, found "+c("writeFileSync("));
if(c("storageState({ indexedDB: true })")!==4)bad("storageState({ indexedDB: true }) must appear 4 times, found "+c("storageState({ indexedDB: true })"));
if(c("writeSecret(root, CREDENTIALS_REL")!==2)bad("writeSecret(root, CREDENTIALS_REL must appear twice");
for(const a of [
  "const BROWSER_PROBE_POSITIVE_MS = 15000;",
  "const BROWSER_PROBE_SETTLE_MS = 5000;",
  "const BROWSER_PROBE_NEGATIVE_MS = BROWSER_PROBE_POSITIVE_MS + BROWSER_PROBE_SETTLE_MS;",
  "if (!(await load(freshPage))) return \x27unloadable\x27;",
  "return without >= 200 && without < 300 ? \x27not-protected\x27 : \x27proven\x27;",
  "const withSession = await status({ storageState: storage }, headers);"
])if(!t.includes(a))bad("a mutation-test anchor line changed: "+a);
if(!t.includes("const BROWSER_PROBE_DWELL_MS = 5000;"))bad("BROWSER_PROBE_DWELL_MS constant is missing");
if(!/^const KIT_TEMPLATE_ID = \x27[^\x27]+\x27;$/m.test(t))bad("the KIT_TEMPLATE_ID stamp line is missing");
const x=t.lastIndexOf("FAILED_KIT_SCRIPT_STALE");
if(!(x>g&&x<s))bad("the stale check must sit between GUARD-SITE and SECRECY-SITE");
console.log("PASS: template invariants and anchors hold");
'
git diff --quiet HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs plugins/relay/.claude-plugin/plugin.json
if git diff --unified=0 HEAD -- plugins/relay documentation | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced outside a quoted prohibition"; exit 1
else
  echo "PASS: no forbidden path references introduced outside quoted prohibitions"
fi
if git diff --name-only HEAD | grep -E "\.test\.(mjs|js|ts)$"; then
  echo "FAIL: the Implementer diff touches a test file (R-X)"; exit 1
else
  echo "PASS: no test file in the diff"
fi
```

On today's tree the invariant script fails by design at the `BROWSER_PROBE_DWELL_MS` check (absent today); the sites, counts and six anchors it also checks all hold today per the verified facts. The `git diff --quiet HEAD -- <frozen files>` line exits 1 if any frozen file changed (it passes today). `git diff HEAD` is the single-argument base form.

### Level 3 — INTEGRATION (corpus gate with the expected-break allowlist)

```bash
set -euo pipefail
find scripts/validate -name "*.test.mjs" ! -name auth-reuse-proof.test.mjs ! -name auth-static-token-indexeddb.test.mjs -print0 | xargs -0 node --test
```

`xargs` exits non-zero if any `node --test` invocation fails, so any failing test outside the two allowlisted files fails the gate. The two allowlisted files (`auth-reuse-proof.test.mjs`, `auth-static-token-indexeddb.test.mjs`) are excluded here and are expected to contain failing tests until the test pair updates them (see `## Notes`, "Expected test breaks"); the Implementer lists every failing test title from those two files in its completion report so the test pair can route each one. After the test pair's `EXISTING_TEST_UPDATED` and `NEW_TEST_REQUIRED` work, the full corpus must be green: `node --test "scripts/validate/**/*.test.mjs"` (quoted glob) — that command is owned by `/relay-test`, not run by the Implementer.

## Acceptance Criteria

- **AC-A1 (PRD AC-22):** A role of mechanism `form`, `api` or `headed` that declares a browser probe has `probe.path` and `probe.method` optional — absent, `null` or `TBD - needs validation` there does not halt `FAILED_LOGIN_CONFIG_INCOMPLETE`, and no save or reuse decision depends on them; a role without a browser probe, and a `static-token` role, still require both. `/relay-auth-scripts` writes the HTTP probe as `null` when a browser probe is filled and the model states no protected same-origin endpoint.
- **AC-A2 (PRD AC-23):** On the session side the authenticated-only marker, and the role marker when declared, count as present only if visible after the page settles and still visible after a `BROWSER_PROBE_DWELL_MS` dwell, re-checked without blocking; a marker that vanishes within the dwell is an expired session (re-login, or `FAILED_INTERACTIVE_LOGIN_REQUIRED` with no terminal), never `FAILED_PROBE_WRONG_ACCOUNT`; the role marker is checked only once the marker is stably present. The auth-model writer and template prefer markers that need a successful API response.
- **AC-A3 (PRD AC-24):** Each generated script carries `KIT_TEMPLATE_ID`; run against a plugin root whose installed template carries a different stamp it halts `FAILED_KIT_SCRIPT_STALE` naming both identities and saves and reuses nothing, before any write; `/relay-qa-run` reports it (and detects an unstamped template-generated script) as a named `blocked` reason; `/relay-auth-scripts --refresh` regenerates every role's script from the installed template and adds newly introduced configuration fields without changing a set value.
- **AC-A4 (PRD AC-25):** For a role with a browser probe whose login completed, a marker never stably present at save halts `FAILED_PROBE_MARKER_ABSENT`, naming the marker field and whether a matching element existed but was not visible, saving nothing; `/relay-qa-run` reports it as a named `blocked` reason; a role without a browser probe keeps `FAILED_LOGIN_REJECTED` unchanged.
- **AC-A5 (PRD AC-26):** A `static-token` role may declare `maxAgeMinutes: null` (written by `/relay-auth-scripts` when the model says the token does not expire), meaning the token is re-proven on every reuse; every other role still requires a positive `maxAgeMinutes`.
- **AC-A6 (PRD AC-27):** A `static-token` failure halts with `FAILED_TOKEN_REJECTED` naming the HTTP status, `FAILED_TOKEN_TRANSPORT` or `FAILED_TOKEN_PLACEMENT`, never printing any part of the token; `/relay-qa-run` keeps reporting them as `SESSION_UNAVAILABLE`.
- **AC-A7 (PRD AC-28):** `/relay-auth-setup --fresh` moves the existing model, review log, scripts and configuration into a timestamped archive under the kit's ignored `.sessions/` directory, never moves, copies or prints a session or credential file, and runs the writer from scratch; a DRAFT model without `--fresh` produces an offer to re-run the writer; a script with no template identity counts as stale under AC-A3.
- **AC-A8 (PRD AC-29):** For a role whose model records a pre-authenticated target (with the injecting code's `file:line`), `/relay-qa-run` does not run a browser case on that origin: it is `blocked` with `FAILED_TARGET_PRE_AUTHENTICATED` unless `authenticatesAnonymous.alternativeBaseUrl` names a local target the runner's anonymous check confirms clean, in which case that target is used; the alternative stays inside the local-only guard.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The 5 s dwell is a judgment from one observation (marker visible 5.3 s, 500 ms sampling) and may be too short or too long for another application | M | M | It is a named constant, the settle step adds time before the dwell, and the rationale is labelled a judgment in the code comment; revisit after the next dogfood rather than treating 5000 as measured |
| A maintainer changes template behaviour without bumping `KIT_TEMPLATE_ID`, so stale detection never fires | M | M | The ACTION puts a bump instruction beside the stamp; no new validate check is added by scope decision (the suite stays at 28), and the test pair's `NEW_TEST_REQUIRED` work pins the stamp format; recorded here as a standing discipline risk |
| The stale pre-flight and the in-script check fail open when the installed template is unreadable or unstamped | L | L | Deliberate: the check is a compatibility signal, not a safety guard, and the guard, secrecy proof and both proof directions still run; a hard failure would break the fake-plugin-root tests and brick scripts on a layout change |
| The runner's pre-flight judges only scripts containing the template's header sentence, so a hand-written script is never flagged stale by the runner | M | L | `--refresh` and `--fresh` replace hand-written scripts; the runner states what it can read |
| The alternative target's anonymous check confirms the origin but the saved session may be origin-scoped (IndexedDB or `localStorage`) and absent there | M | M | Recorded as out of scope in `## NOT Building`; cookie-based sessions are host-scoped and carry over, and a role with an origin-scoped session must be re-saved for that origin by the operator |
| Group 1 changes error codes that existing fixtures assert, breaking tests the Implementer may not edit (R-X) | H | M | The expected breaks are enumerated in `## Notes` and routed to the test pair as `EXISTING_TEST_UPDATED`; Level 3 tolerates failures only in the two allowlisted files |
| The effect-level VALIDATE commands were written without being run (this agent has no shell) and a fixture detail may be wrong | M | M | The implementer must run each command against the unmodified tree first and confirm the stated failure on today's tree before editing; a command that cannot fail there is a defect to fix, not to skip |
| Adding a dwell makes every browser-probe test slower (about 5 s per session-side proof) | H | L | Not a failure; the test pair adds a `mutate()` entry shortening the dwell constant, as it already does for the timing constants |
| An archive inside the ignored `.sessions/` directory sits beside secrets | L | M | The archive holds only the model, review log, scripts and configuration (no secret by definition), the move never touches any other file in that directory, and the P3 `ensure` call has already proven the directory ignored |

## Notes

- **Template identity is a stamp, not a hash, and why.** Every template test spawns `<project>/PRPs/auth/login-<role>.mjs` — a copy of the template, frequently mutated by `mutate()` — against the real `plugins/relay`. A content-hash identity would make each mutated copy halt `FAILED_KIT_SCRIPT_STALE`, breaking dozens of tests and the mutation-testing method itself. The stamp line survives every mutation the tests apply. Unreadable or unstamped installed templates skip the check (fail open); justification against AC-24's wording ("a plugin root whose login template differs"): an installed template that cannot be read cannot be shown to differ, and the three fake plugin roots in `auth-login-template.test.mjs` (empty, partial, full copy) therefore keep their present outcomes. The check runs after `// GUARD-SITE` and before `// SECRECY-SITE`, writes nothing, and reads one file.
- **Scripts generated before this phase cannot check themselves** (they have no stamp and no stale code). That is why Task 5 adds the runner-side pre-flight and Task 7 reports staleness at generation time; AC-24's "script generated from the 0.42.0 template halts" is realised for old scripts by those two surfaces and for new scripts by the in-script check.
- **Anchor lines kept byte-identical.** The lines `auth-reuse-proof.test.mjs` replaces verbatim must not change: the three timing lines `const BROWSER_PROBE_POSITIVE_MS = 15000;`, `const BROWSER_PROBE_SETTLE_MS = 5000;` and the `BROWSER_PROBE_NEGATIVE_MS` line (its lines 204-218 and 764), plus `if (!(await load(freshPage))) return 'unloadable';` (773), `return without >= 200 && without < 300 ? 'not-protected' : 'proven';` (781) and `const withSession = await status({ storageState: storage }, headers);` (789). The dwell is a NEW line, so no existing anchor changes. Level 2 checks all six strings.
- **FAILED_TOKEN_PLACEMENT versus FAILED_TOKEN_LOCATION_UNREACHABLE (a judgment to review).** AC-27 names `FAILED_TOKEN_PLACEMENT` for "cannot be placed at the declared browser location". The shipped `FAILED_TOKEN_LOCATION_UNREACHABLE` already names the two specific cases where the declared IndexedDB database or store is absent, and tests pin it. This plan keeps that code for those two cases and uses `FAILED_TOKEN_PLACEMENT` for the two paths that today fall into `FAILED_LOGIN_REJECTED` (an off-origin `originPath` and an unexpected failure). If review reads AC-27 as requiring the rename, the tests that assert `FAILED_TOKEN_LOCATION_UNREACHABLE` join the allowlist as `EXISTING_TEST_UPDATED`.
- **Alternative local target (AC-29).** Where it lives: the role's `authenticatesAnonymous.alternativeBaseUrl` in `PRPs/auth/login.config.json`, written by `/relay-auth-scripts` from the model's one-line record. How it is confirmed: the runner opens a fresh browser context with no storage state on that origin at the role's browser-probe route and requires the authenticated-only marker to stay absent for the full 20 s window; visible means the injection is present, a failed load is `TARGET_UNREACHABLE`. It is guarded by `checkTarget` like every other URL (AC-1), so a non-local alternative is `FAILED_NON_LOCAL_TARGET` with nothing requested. A role with no browser probe cannot be confirmed and stays blocked. A role with a browser probe already halts `FAILED_PROBE_NOT_PROTECTED` on such a target without needing the record, as AC-29 states.
- **Expected test breaks — allowlist for the Implementer's corpus gate, routed to the test pair as `EXISTING_TEST_UPDATED`.**
  - `scripts/validate/checks/auth-static-token-indexeddb.test.mjs`, the test near lines 426-430 titled "a token the server rejects halts FAILED_LOGIN_REJECTED": it now halts `FAILED_TOKEN_REJECTED` (AC-27, Task 2).
  - `scripts/validate/checks/auth-reuse-proof.test.mjs`, the assertions near lines 702, 748 and 793 that map a `'rejected'`/expired save proof to `FAILED_LOGIN_REJECTED`, ONLY where the role in the fixture declares a browser probe: they now see `FAILED_PROBE_MARKER_ABSENT` (AC-25, Task 3). Any test in that file or in the static-token file whose fixture depends on a marker disappearing within five seconds, or on a harness timeout that cannot absorb the extra dwell, is also expected to be reported and routed (AC-23, Task 3).
  - A test pair `NEW_TEST_REQUIRED` list, beyond the updates: a mutate-entry shortening `BROWSER_PROBE_DWELL_MS`; the optional HTTP probe and `maxAgeMinutes: null`; the three static-token codes; the transient-marker and `FAILED_PROBE_MARKER_ABSENT` fixtures; the stamp, stale halt, fail-open and the runner pre-flight; the `--refresh` and `--fresh` command text; the pre-authenticated-target gate and anonymous check; the `qa-run` block-code list.
- **Expected to stay green (a failure in any of these is a defect to fix in production code, never an allowlist entry).** `auth-login-template.test.mjs` entire, including the fake plugin roots (lines 305-330, via fail-open), the form/api login rejection assertions (lines 508-551, whose roles carry no browser probe so `FAILED_LOGIN_REJECTED` is unchanged), the `maxAgeMinutes` expiry and probe-redirect tables (lines 611-613) and the config-incomplete table (`auth-reuse-proof.test.mjs` lines 669-674, whose fixtures always carry `probe` and a positive `maxAgeMinutes`); `qa-run.test.mjs`, `qa-run-contract.test.mjs`, `qa-run-layout.test.mjs`, `qa-run-record-resolution.test.mjs`; `auth-kit-secrecy.test.mjs`; `auth-secrecy.test.mjs`; `auth-local-guard-sites.test.mjs` and its check (site order, single write helper, four `storageState` calls and two credential writes all preserved); `auth-local-guard.test.mjs`; `auth-scripts-command.test.mjs`; `auth-model-pair.test.mjs`; `usage-metrics-scaffolding.test.mjs`.
- **Never pass an async predicate to `page.waitForFunction`;** poll with `page.evaluate` or `locator.isVisible()` (the shipped IndexedDB polling loop at the `placeStaticToken` site is the model). **Never use `spawnSync` beside an in-process HTTP server;** the effect-level VALIDATE commands for Tasks 2 and 3 use async `spawn` for exactly that reason.
- **`--fresh` archive location.** `auth-kit-secrecy.mjs` never overwrites an existing `PRPs/auth/.gitignore`, so a new ignore rule (for example `.archive/`) would not reach the very kits `--fresh` exists for, and `auth-secrecy` pins `.sessions/` as the one rule every kit carries. The archive therefore lives in an `archive/<stamp>/` subdirectory of `.sessions/`, described relative to the kit directory so that `auth-model-pair.test.mjs`'s `SECRET_PATH_TARGET` pin (no `PRPs/auth/.sessions` literal in `relay-auth-setup.md`) stays meaningful.
- **Frozen files.** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` (PRD AC-16), `plugins/relay/scripts/visual/capture.mjs` and `plugins/relay/.claude-plugin/plugin.json` are checked byte-identical by Level 2.
- **Commands not executed.** This plan was authored without a shell. Every VALIDATE command and every "fails on today's tree" statement was derived from reading the sources at `f4f91a2` and the caller's verified facts; the Implementer runs each against the unmodified tree first and reports any command that cannot fail there.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file. The Implementer only runs the existing suites
  (Tasks 5-10, Level 3) and exercises each change directly (Tasks 1-4).
- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

*Generated: 2026-10-05*
*Approved: 2026-10-05*
*Status: IMPLEMENTED*
